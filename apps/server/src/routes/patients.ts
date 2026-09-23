import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { insertAuditLog } from '../services/audit-service.js';
import { mergePatients, resolvePatientIds } from '../services/patient-merge-service.js';
import { NotFoundError } from '../errors.js';

const createPatientSchema = z.object({
  currentName: z.string().min(1),
  dob: z.string().nullable().optional(),
  ageYearsAtRegistration: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  gender: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  bloodPressure: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  aadharNumber: z.string().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  isProvisional: z.boolean().optional(),
  confirmDuplicate: z.boolean().optional(), // client re-submits with this after seeing the duplicate warning
});

// Age is computed from DOB at query time (so it's always current, not
// frozen at registration) with age_years_at_registration as a fallback for
// patients registered without a DOB.
const PATIENT_LIST_COLUMNS = `id, customer_code, current_name, dob, blood_group, phone_number, status, created_at,
  CASE WHEN dob IS NOT NULL THEN CAST((julianday('now') - julianday(dob)) / 365.25 AS INTEGER)
       ELSE age_years_at_registration END as age`;

function nextCustomerCode(db: Database.Database): string {
  const row = db.prepare(`SELECT COUNT(*) as c FROM patient`).get() as any;
  return `PT-${String(row.c + 1).padStart(6, '0')}`;
}

export function createPatientRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  // Default browse list, most recently registered first -- distinct from
  // /search, which requires a query. Optional ?date=YYYY-MM-DD filters to
  // patients registered on that day. Without `page`, behaves exactly as
  // before (LIMIT 200, no `total`) so existing callers are unaffected; pass
  // `page` (and optional `pageSize`, default 20) for the paginated shape.
  app.get('/', requirePermission('patient.view'), (c) => {
    const date = c.req.query('date');
    const whereSql = date ? 'deleted_at IS NULL AND date(created_at) = ?' : 'deleted_at IS NULL';
    const whereParams = date ? [date] : [];

    const pageParam = c.req.query('page');
    if (!pageParam) {
      const rows = db
        .prepare(
          `SELECT ${PATIENT_LIST_COLUMNS} FROM patient
           WHERE ${whereSql} ORDER BY created_at DESC LIMIT 200`,
        )
        .all(...whereParams);
      return c.json({ results: rows });
    }

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));
    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM patient WHERE ${whereSql}`).get(...whereParams) as {
        count: number;
      }
    ).count;
    const rows = db
      .prepare(
        `SELECT ${PATIENT_LIST_COLUMNS} FROM patient
         WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...whereParams, pageSize, (page - 1) * pageSize);
    return c.json({ results: rows, total, page, pageSize });
  });

  app.get('/search', requirePermission('patient.view'), (c) => {
    const query = c.req.query('q') ?? '';
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 50));
    const total = (
      db
        .prepare(
          `SELECT COUNT(*) as count FROM patient
           WHERE deleted_at IS NULL AND (customer_code LIKE ? OR current_name LIKE ? OR phone_number LIKE ?)`,
        )
        .get(`%${query}%`, `%${query}%`, `%${query}%`) as { count: number }
    ).count;
    const rows = db
      .prepare(
        `SELECT ${PATIENT_LIST_COLUMNS} FROM patient
         WHERE deleted_at IS NULL AND (customer_code LIKE ? OR current_name LIKE ? OR phone_number LIKE ?)
         ORDER BY current_name LIMIT ? OFFSET ?`,
      )
      .all(`%${query}%`, `%${query}%`, `%${query}%`, pageSize, (page - 1) * pageSize);
    return c.json({ results: rows, total, page, pageSize });
  });

  app.get('/summary', requirePermission('patient.view'), (c) => {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM patient WHERE status = 'active' AND deleted_at IS NULL`)
      .get() as { count: number };
    return c.json({ activeCount: row.count });
  });

  app.post('/', requirePermission('patient.create'), async (c) => {
    const parsed = createPatientSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');

    if (!body.confirmDuplicate) {
      const dup = db
        .prepare(`SELECT id, customer_code FROM patient WHERE current_name = ? AND dob IS ? AND deleted_at IS NULL`)
        .get(body.currentName, body.dob ?? null);
      if (dup) {
        return c.json({ warning: 'duplicate_name_dob', existingPatient: dup }, 409);
      }
    }

    const customerCode = nextCustomerCode(db);
    const info = db
      .prepare(
        `INSERT INTO patient (customer_code, current_name, dob, age_years_at_registration, weight_kg, gender,
           blood_group, blood_pressure, address, phone_number, aadhar_number, emergency_contact_name, emergency_contact_phone, is_provisional)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        customerCode,
        body.currentName,
        body.dob ?? null,
        body.ageYearsAtRegistration ?? null,
        body.weightKg ?? null,
        body.gender ?? null,
        body.bloodGroup ?? null,
        body.bloodPressure ?? null,
        body.address ?? null,
        body.phoneNumber ?? null,
        body.aadharNumber ?? null,
        body.emergencyContactName ?? null,
        body.emergencyContactPhone ?? null,
        body.isProvisional ? 1 : 0,
      );

    const patientId = Number(info.lastInsertRowid);
    insertAuditLog(db, {
      entityType: 'patient',
      entityId: patientId,
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: body,
    });

    return c.json({ id: patientId, customerCode }, 201);
  });

  app.get('/:id', requirePermission('patient.view'), (c) => {
    const id = Number(c.req.param('id'));
    const patient = db.prepare('SELECT * FROM patient WHERE id = ?').get(id);
    if (!patient) return c.json({ error: 'Not found' }, 404);

    const allergies = db
      .prepare('SELECT * FROM patient_allergy WHERE patient_id = ? AND deleted_at IS NULL')
      .all(id);
    const conditions = db
      .prepare('SELECT * FROM patient_chronic_condition WHERE patient_id = ? AND deleted_at IS NULL')
      .all(id);
    const nameHistory = db
      .prepare('SELECT * FROM patient_name_history WHERE patient_id = ? ORDER BY changed_at')
      .all(id);

    return c.json({ patient, allergies, conditions, nameHistory });
  });

  app.get('/:id/history', requirePermission('patient.view'), (c) => {
    const id = Number(c.req.param('id'));
    try {
      const allIds = resolvePatientIds(db, id);
      const placeholders = allIds.map(() => '?').join(',');
      const dispenses = db
        .prepare(
          `SELECT d.*, m.name as medicine_name FROM dispense_log d
           JOIN medicine m ON m.id = d.medicine_id
           WHERE d.patient_id IN (${placeholders})
           ORDER BY d.dispensed_at DESC`,
        )
        .all(...allIds);
      return c.json({ resolvedPatientIds: allIds, dispenses });
    } catch (err) {
      if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
      throw err;
    }
  });

  app.patch('/:id', requirePermission('patient.edit'), async (c) => {
    const id = Number(c.req.param('id'));
    const body = (await c.req.json()) as Record<string, unknown>;
    const user = c.get('user');

    const existing = db.prepare('SELECT current_name FROM patient WHERE id = ?').get(id) as
      | { current_name: string }
      | undefined;
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const update = db.transaction(() => {
      if (typeof body.currentName === 'string' && body.currentName !== existing.current_name) {
        db.prepare(
          `INSERT INTO patient_name_history (patient_id, previous_name, changed_by_user_id, reason)
           VALUES (?, ?, ?, ?)`,
        ).run(id, existing.current_name, user.userId, 'name_change');
      }

      const fields: string[] = [];
      const values: unknown[] = [];
      const columnMap: Record<string, string> = {
        currentName: 'current_name',
        dob: 'dob',
        weightKg: 'weight_kg',
        gender: 'gender',
        bloodGroup: 'blood_group',
        bloodPressure: 'blood_pressure',
        address: 'address',
        phoneNumber: 'phone_number',
        aadharNumber: 'aadhar_number',
        emergencyContactName: 'emergency_contact_name',
        emergencyContactPhone: 'emergency_contact_phone',
      };
      for (const [key, column] of Object.entries(columnMap)) {
        if (key in body) {
          fields.push(`${column} = ?`);
          values.push(body[key]);
        }
      }
      if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE patient SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
          ...values,
        );
      }

      insertAuditLog(db, {
        entityType: 'patient',
        entityId: id,
        action: 'update',
        performedByUserId: user.userId,
        performedByRole: user.role,
        detail: body,
      });
    });
    update();

    return c.json({ ok: true });
  });

  app.post('/:id/status', requirePermission('patient.changeStatus'), async (c) => {
    const id = Number(c.req.param('id'));
    const body = (await c.req.json()) as { status: string };
    const user = c.get('user');
    if (!['active', 'inactive', 'deceased'].includes(body.status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const changeStatus = db.transaction(() => {
      db.prepare(
        `UPDATE patient SET status = ?, deceased_at = CASE WHEN ? = 'deceased' THEN datetime('now', 'localtime') ELSE deceased_at END,
         updated_at = datetime('now', 'localtime') WHERE id = ?`,
      ).run(body.status, body.status, id);
      insertAuditLog(db, {
        entityType: 'patient',
        entityId: id,
        action: 'status_change',
        performedByUserId: user.userId,
        performedByRole: user.role,
        detail: { newStatus: body.status },
      });
    });
    changeStatus();

    return c.json({ ok: true });
  });

  // Soft delete only, per the no-hard-delete rule -- the row and every
  // record referencing it (dispenses, prescriptions, audit log) stays for
  // audit purposes; it just stops showing up in lists/search.
  app.post('/:id/delete', requirePermission('patient.merge'), async (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    const result = db
      .prepare(`UPDATE patient SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND deleted_at IS NULL`)
      .run(id);
    if (result.changes === 0) return c.json({ error: 'Patient not found (or already deleted)' }, 404);

    insertAuditLog(db, {
      entityType: 'patient',
      entityId: id,
      action: 'delete',
      performedByUserId: user.userId,
      performedByRole: user.role,
    });
    return c.json({ ok: true });
  });

  app.post('/merge', requirePermission('patient.merge'), async (c) => {
    const body = (await c.req.json()) as { survivingPatientId: number; mergedPatientId: number; notes?: string };
    const user = c.get('user');
    try {
      mergePatients(db, {
        survivingPatientId: body.survivingPatientId,
        mergedPatientId: body.mergedPatientId,
        performedByUserId: user.userId,
        performedByRole: user.role,
        notes: body.notes,
      });
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  // --- Allergies & chronic conditions: add / edit / delete ---------------
  // Same URLs and body shapes as before for "add"; edit and (soft) delete
  // are new. Every change is audit-logged -- these are clinical records.
  const allergySchema = z.object({ allergen: z.string().trim().min(1), severity: z.string().trim().nullable().optional() });
  const conditionSchema = z.object({ conditionName: z.string().trim().min(1) });

  function audit(c: any, entityType: string, entityId: number, action: string, detail?: unknown) {
    const user = c.get('user');
    insertAuditLog(db, { entityType, entityId, action, performedByUserId: user.userId, performedByRole: user.role, detail });
  }

  app.post('/:id/allergies', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = allergySchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the allergy' }, 400);
    const info = db
      .prepare('INSERT INTO patient_allergy (patient_id, allergen, severity) VALUES (?, ?, ?)')
      .run(id, parsed.data.allergen, parsed.data.severity || null);
    audit(c, 'patient_allergy', Number(info.lastInsertRowid), 'create', { patientId: id, ...parsed.data });
    return c.json({ ok: true, id: Number(info.lastInsertRowid) }, 201);
  });

  app.patch('/:id/allergies/:allergyId', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const allergyId = Number(c.req.param('allergyId'));
    const parsed = allergySchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the allergy' }, 400);
    const result = db
      .prepare('UPDATE patient_allergy SET allergen = ?, severity = ? WHERE id = ? AND patient_id = ? AND deleted_at IS NULL')
      .run(parsed.data.allergen, parsed.data.severity || null, allergyId, Number(c.req.param('id')));
    if (result.changes === 0) return c.json({ error: 'Allergy not found' }, 404);
    audit(c, 'patient_allergy', allergyId, 'update', parsed.data);
    return c.json({ ok: true });
  });

  app.post('/:id/allergies/:allergyId/delete', requirePermission('patient.editMedicalInstructions'), (c) => {
    const allergyId = Number(c.req.param('allergyId'));
    const result = db
      .prepare(`UPDATE patient_allergy SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND patient_id = ? AND deleted_at IS NULL`)
      .run(allergyId, Number(c.req.param('id')));
    if (result.changes === 0) return c.json({ error: 'Allergy not found (or already deleted)' }, 404);
    audit(c, 'patient_allergy', allergyId, 'delete');
    return c.json({ ok: true });
  });

  app.post('/:id/conditions', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = conditionSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the condition' }, 400);
    const info = db
      .prepare('INSERT INTO patient_chronic_condition (patient_id, condition_name) VALUES (?, ?)')
      .run(id, parsed.data.conditionName);
    audit(c, 'patient_chronic_condition', Number(info.lastInsertRowid), 'create', { patientId: id, ...parsed.data });
    return c.json({ ok: true, id: Number(info.lastInsertRowid) }, 201);
  });

  app.patch('/:id/conditions/:conditionId', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const conditionId = Number(c.req.param('conditionId'));
    const parsed = conditionSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the condition' }, 400);
    const result = db
      .prepare('UPDATE patient_chronic_condition SET condition_name = ? WHERE id = ? AND patient_id = ? AND deleted_at IS NULL')
      .run(parsed.data.conditionName, conditionId, Number(c.req.param('id')));
    if (result.changes === 0) return c.json({ error: 'Condition not found' }, 404);
    audit(c, 'patient_chronic_condition', conditionId, 'update', parsed.data);
    return c.json({ ok: true });
  });

  app.post('/:id/conditions/:conditionId/delete', requirePermission('patient.editMedicalInstructions'), (c) => {
    const conditionId = Number(c.req.param('conditionId'));
    const result = db
      .prepare(
        `UPDATE patient_chronic_condition SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND patient_id = ? AND deleted_at IS NULL`,
      )
      .run(conditionId, Number(c.req.param('id')));
    if (result.changes === 0) return c.json({ error: 'Condition not found (or already deleted)' }, 404);
    audit(c, 'patient_chronic_condition', conditionId, 'delete');
    return c.json({ ok: true });
  });

  return app;
}
