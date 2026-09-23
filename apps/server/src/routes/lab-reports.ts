import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { resolvePatientIds } from '../services/patient-merge-service.js';
import { insertAuditLog } from '../services/audit-service.js';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB -- plenty for a scanned report/photo, keeps the DB sane

export function createLabReportRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  // Metadata only (no file bytes) -- resolved across merged identities like
  // every other patient-scoped query, most recent first.
  app.get('/', requirePermission('patient.view'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    if (!patientId) return c.json({ error: 'patientId is required' }, 400);
    const allIds = resolvePatientIds(db, patientId);
    const placeholders = allIds.map(() => '?').join(',');

    const reports = db
      .prepare(
        `SELECT lr.id, lr.title, lr.report_datetime, lr.notes, lr.file_name, lr.file_mime_type,
                u.full_name as uploaded_by_name
         FROM lab_report lr JOIN user u ON u.id = lr.uploaded_by_user_id
         WHERE lr.patient_id IN (${placeholders}) AND lr.deleted_at IS NULL
         ORDER BY lr.report_datetime DESC, lr.id DESC`,
      )
      .all(...allIds);

    return c.json({ reports });
  });

  app.post('/', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const user = c.get('user');
    const form = await c.req.formData();

    const patientId = Number(form.get('patientId'));
    const title = form.get('title');
    const reportDatetime = form.get('reportDatetime');
    const notes = form.get('notes');
    const file = form.get('file');

    if (!patientId || typeof title !== 'string' || !title.trim() || typeof reportDatetime !== 'string' || !reportDatetime) {
      return c.json({ error: 'patientId, title, and reportDatetime are required' }, 400);
    }

    let fileName: string | null = null;
    let fileMimeType: string | null = null;
    let fileData: Buffer | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return c.json({ error: `File is too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB)` }, 400);
      }
      fileName = file.name;
      fileMimeType = file.type || 'application/octet-stream';
      fileData = Buffer.from(await file.arrayBuffer());
    }

    const info = db
      .prepare(
        `INSERT INTO lab_report (patient_id, title, report_datetime, notes, file_name, file_mime_type, file_data, uploaded_by_user_id, uploaded_by_role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        patientId,
        title.trim(),
        reportDatetime,
        typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        fileName,
        fileMimeType,
        fileData,
        user.userId,
        user.role,
      );

    const id = Number(info.lastInsertRowid);
    insertAuditLog(db, {
      entityType: 'lab_report',
      entityId: id,
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { patientId, title: title.trim(), hasFile: !!fileData },
    });

    return c.json({ id }, 201);
  });

  app.get('/:id', requirePermission('patient.view'), (c) => {
    const id = Number(c.req.param('id'));
    const report = db
      .prepare(
        `SELECT id, patient_id, title, report_datetime, notes, file_name, file_mime_type
         FROM lab_report WHERE id = ? AND deleted_at IS NULL`,
      )
      .get(id);
    if (!report) return c.json({ error: 'Report not found' }, 404);
    return c.json({ report });
  });

  // Edit title/date/notes; optionally replace the attached file ("file") or
  // remove it ("removeFile" = "1"). Leaving both out keeps the current file.
  app.post('/:id/update', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    const form = await c.req.formData();

    const title = form.get('title');
    const reportDatetime = form.get('reportDatetime');
    const notes = form.get('notes');
    const file = form.get('file');
    const removeFile = form.get('removeFile') === '1';

    if (typeof title !== 'string' || !title.trim() || typeof reportDatetime !== 'string' || !reportDatetime) {
      return c.json({ error: 'title and reportDatetime are required' }, 400);
    }

    const existing = db.prepare('SELECT id FROM lab_report WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!existing) return c.json({ error: 'Report not found (or deleted)' }, 404);

    const cleanNotes = typeof notes === 'string' && notes.trim() ? notes.trim() : null;
    let fileChange: 'kept' | 'replaced' | 'removed' = 'kept';

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return c.json({ error: `File is too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB)` }, 400);
      }
      db.prepare(
        `UPDATE lab_report SET title = ?, report_datetime = ?, notes = ?, file_name = ?, file_mime_type = ?, file_data = ?
         WHERE id = ?`,
      ).run(title.trim(), reportDatetime, cleanNotes, file.name, file.type || 'application/octet-stream',
        Buffer.from(await file.arrayBuffer()), id);
      fileChange = 'replaced';
    } else if (removeFile) {
      db.prepare(
        `UPDATE lab_report SET title = ?, report_datetime = ?, notes = ?, file_name = NULL, file_mime_type = NULL, file_data = NULL
         WHERE id = ?`,
      ).run(title.trim(), reportDatetime, cleanNotes, id);
      fileChange = 'removed';
    } else {
      db.prepare('UPDATE lab_report SET title = ?, report_datetime = ?, notes = ? WHERE id = ?').run(
        title.trim(), reportDatetime, cleanNotes, id);
    }

    insertAuditLog(db, {
      entityType: 'lab_report',
      entityId: id,
      action: 'update',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { title: title.trim(), reportDatetime, file: fileChange },
    });
    return c.json({ ok: true });
  });

  app.get('/:id/file', requirePermission('patient.view'), (c) => {
    const id = Number(c.req.param('id'));
    const row = db
      .prepare('SELECT file_name, file_mime_type, file_data FROM lab_report WHERE id = ? AND deleted_at IS NULL')
      .get(id) as { file_name: string | null; file_mime_type: string | null; file_data: Buffer | null } | undefined;

    if (!row || !row.file_data) return c.json({ error: 'No file attached to this report' }, 404);

    return new Response(new Uint8Array(row.file_data), {
      headers: {
        'Content-Type': row.file_mime_type ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${(row.file_name ?? 'report').replace(/"/g, '')}"`,
      },
    });
  });

  app.post('/:id/delete', requirePermission('patient.editMedicalInstructions'), (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    const result = db
      .prepare(`UPDATE lab_report SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND deleted_at IS NULL`)
      .run(id);
    if (result.changes === 0) return c.json({ error: 'Report not found (or already deleted)' }, 404);

    insertAuditLog(db, {
      entityType: 'lab_report',
      entityId: id,
      action: 'delete',
      performedByUserId: user.userId,
      performedByRole: user.role,
    });
    return c.json({ ok: true });
  });

  return app;
}
