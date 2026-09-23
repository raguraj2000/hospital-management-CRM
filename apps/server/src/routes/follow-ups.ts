import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { resolvePatientIds } from '../services/patient-merge-service.js';
import { performDispense, performVoidDispense } from '../services/dispense-service.js';
import { insertAuditLog } from '../services/audit-service.js';

const createFollowUpSchema = z.object({
  patientId: z.number().int(),
  startDate: z.string().min(1),
  plannedEndDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  // Who is credited as the prescriber -- lets front-desk/nursing staff enter
  // a follow-up on behalf of the doctor who actually saw the patient,
  // instead of always crediting whoever is logged in. Defaults to the
  // logged-in user if not given.
  prescribingDoctorId: z.number().int().nullable().optional(),
});

const createVisitSchema = z.object({
  patientId: z.number().int(),
  followUpId: z.number().int().nullable().optional(),
  visitDate: z.string().min(1),
  attendingDoctorId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const createPrescriptionLineSchema = z.object({
  medicineId: z.number().int(),
  quantityPrescribed: z.number().int().positive(),
  dosageInstructions: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
});

const updatePrescriptionLineSchema = z.object({
  dosageInstructions: z.string().nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
});

const updateQuantitySchema = z.object({ quantity: z.number().int().positive() });

/** Voids every still-active dispense recorded against a prescription line. Caller must already be inside a transaction. */
function voidActiveDispensesForLine(
  db: Database.Database,
  lineId: number,
  reason: string,
  staffUserId: number,
  staffRole: string,
) {
  const activeDispenses = db
    .prepare('SELECT id FROM dispense_log WHERE prescription_line_id = ? AND voided_at IS NULL')
    .all(lineId) as { id: number }[];
  for (const d of activeDispenses) {
    performVoidDispense(db, { dispenseLogId: d.id, reason, staffUserId, staffRole: staffRole as any });
  }
}

export function createFollowUpRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  // Read-back for a patient's follow-ups/visits/prescriptions (resolved
  // across merged identities), most recent first. Adding a medicine to a
  // follow-up (below) dispenses it immediately via FEFO -- prescribing and
  // dispensing are the same action here, not two separate steps.
  app.get('/', requirePermission('patient.view'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    if (!patientId) return c.json({ error: 'patientId is required' }, 400);
    const allIds = resolvePatientIds(db, patientId);
    const placeholders = allIds.map(() => '?').join(',');

    const visits = db
      .prepare(
        `SELECT v.id, v.visit_date, v.follow_up_id, v.attending_doctor_id, v.notes,
                u.full_name as attending_doctor_name,
                f.start_date as follow_up_start_date, f.planned_end_date as follow_up_planned_end_date,
                f.notes as follow_up_notes
         FROM visit_event v
         LEFT JOIN follow_up f ON f.id = v.follow_up_id
         LEFT JOIN user u ON u.id = v.attending_doctor_id
         WHERE v.patient_id IN (${placeholders}) AND v.deleted_at IS NULL
         ORDER BY v.visit_date DESC, v.id DESC`,
      )
      .all(...allIds) as Record<string, unknown>[];

    const lineStmt = db.prepare(
      `SELECT pl.id, pl.medicine_id, m.name as medicine_name, pl.quantity_prescribed, pl.dosage_instructions, pl.duration_days
       FROM prescription_line pl JOIN medicine m ON m.id = pl.medicine_id
       WHERE pl.visit_event_id = ? AND pl.deleted_at IS NULL`,
    );

    const results = visits.map((v) => ({ ...v, prescriptionLines: lineStmt.all(v.id as number) }));
    return c.json({ visits: results });
  });

  app.post('/', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const parsed = createFollowUpSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const body = parsed.data;

    const info = db
      .prepare(
        `INSERT INTO follow_up (patient_id, prescribing_doctor_id, start_date, planned_end_date, notes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        body.patientId,
        body.prescribingDoctorId ?? user.userId,
        body.startDate,
        body.plannedEndDate ?? null,
        body.notes ?? null,
      );

    return c.json({ id: Number(info.lastInsertRowid) }, 201);
  });

  // Ad-hoc/walk-in visits pass followUpId: null.
  app.post('/visits', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const parsed = createVisitSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const info = db
      .prepare(`INSERT INTO visit_event (follow_up_id, patient_id, visit_date, attending_doctor_id, notes) VALUES (?, ?, ?, ?, ?)`)
      .run(body.followUpId ?? null, body.patientId, body.visitDate, body.attendingDoctorId ?? null, body.notes ?? null);

    return c.json({ id: Number(info.lastInsertRowid) }, 201);
  });

  // Fix or add the notes on a visit after it was recorded.
  app.patch('/visits/:visitId/notes', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const visitId = Number(c.req.param('visitId'));
    const parsed = z.object({ notes: z.string().nullable() }).safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');

    const result = db
      .prepare(`UPDATE visit_event SET notes = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(parsed.data.notes?.trim() || null, visitId);
    if (result.changes === 0) return c.json({ error: 'Visit not found' }, 404);

    insertAuditLog(db, {
      entityType: 'visit_event',
      entityId: visitId,
      action: 'update',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { notes: parsed.data.notes },
    });
    return c.json({ ok: true });
  });

  // Adding a medicine to a follow-up both records the instruction AND
  // dispenses it via FEFO in the same atomic step (see plan discussion:
  // this clinic wants prescribing to immediately deduct stock, not a
  // separate pharmacist step). Gated by patient.editMedicalInstructions
  // (Doctor/Admin), not dispense.create -- the permission for "add a
  // prescription" now covers the stock effect that comes with it. If stock
  // is insufficient, NEITHER the prescription line nor any dispense is
  // created (the whole request rolls back), so there's never an
  // instruction on record that silently wasn't actually given.
  app.post('/visits/:visitId/prescription-lines', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const visitId = Number(c.req.param('visitId'));
    const parsed = createPrescriptionLineSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');

    const visit = db.prepare('SELECT id, patient_id FROM visit_event WHERE id = ?').get(visitId) as
      | { id: number; patient_id: number }
      | undefined;
    if (!visit) return c.json({ error: `Visit ${visitId} not found` }, 404);

    const createAndDispense = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO prescription_line (visit_event_id, medicine_id, quantity_prescribed, dosage_instructions, duration_days)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(visitId, body.medicineId, body.quantityPrescribed, body.dosageInstructions ?? null, body.durationDays ?? null);
      const prescriptionLineId = Number(info.lastInsertRowid);

      const allocations = performDispense(db, {
        patientId: visit.patient_id,
        medicineId: body.medicineId,
        quantity: body.quantityPrescribed,
        visitEventId: visitId,
        prescriptionLineId,
        staffUserId: user.userId,
        staffRole: user.role,
      });

      return { prescriptionLineId, allocations };
    });

    try {
      const result = createAndDispense.immediate();
      return c.json({ id: result.prescriptionLineId, allocations: result.allocations }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.patch(
    '/visits/:visitId/prescription-lines/:lineId',
    requirePermission('patient.editMedicalInstructions'),
    async (c) => {
      const lineId = Number(c.req.param('lineId'));
      const parsed = updatePrescriptionLineSchema.safeParse(await c.req.json());
      if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
      const body = parsed.data;

      // Quantity is intentionally not editable here: it's tied 1:1 to stock
      // already dispensed against specific batches. Correcting a quantity
      // means voiding the dispense (POST /dispense/:id/void) and adding a
      // fresh prescription line, not silently drifting the two apart.
      const fields: string[] = [];
      const values: unknown[] = [];
      if ('dosageInstructions' in body) {
        fields.push('dosage_instructions = ?');
        values.push(body.dosageInstructions ?? null);
      }
      if ('durationDays' in body) {
        fields.push('duration_days = ?');
        values.push(body.durationDays ?? null);
      }
      if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

      values.push(lineId);
      const result = db
        .prepare(`UPDATE prescription_line SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`)
        .run(...values);
      if (result.changes === 0) return c.json({ error: 'Prescription line not found' }, 404);

      return c.json({ ok: true });
    },
  );

  // Corrects a prescription line's quantity by voiding whatever was already
  // dispensed against it and re-dispensing the new amount via FEFO, in one
  // atomic step -- keeps quantity_prescribed and actual stock movement in
  // lockstep instead of leaving the caller to do void-then-re-add by hand.
  // Rolls back entirely (nothing voided, nothing re-dispensed) if the new
  // quantity can't be covered by current stock.
  app.patch(
    '/visits/:visitId/prescription-lines/:lineId/quantity',
    requirePermission('patient.editMedicalInstructions'),
    async (c) => {
      const lineId = Number(c.req.param('lineId'));
      const parsed = updateQuantitySchema.safeParse(await c.req.json());
      if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
      const user = c.get('user');

      const line = db
        .prepare(
          `SELECT pl.id, pl.visit_event_id, pl.medicine_id, v.patient_id
           FROM prescription_line pl JOIN visit_event v ON v.id = pl.visit_event_id
           WHERE pl.id = ? AND pl.deleted_at IS NULL`,
        )
        .get(lineId) as { id: number; visit_event_id: number; medicine_id: number; patient_id: number } | undefined;
      if (!line) return c.json({ error: 'Prescription line not found' }, 404);

      const changeQuantity = db.transaction(() => {
        voidActiveDispensesForLine(db, lineId, 'Quantity corrected', user.userId, user.role);
        const allocations = performDispense(db, {
          patientId: line.patient_id,
          medicineId: line.medicine_id,
          quantity: parsed.data.quantity,
          visitEventId: line.visit_event_id,
          prescriptionLineId: lineId,
          staffUserId: user.userId,
          staffRole: user.role,
        });
        db.prepare(`UPDATE prescription_line SET quantity_prescribed = ? WHERE id = ?`).run(parsed.data.quantity, lineId);
        return allocations;
      });

      try {
        const allocations = changeQuantity.immediate();
        return c.json({ ok: true, allocations });
      } catch (err: any) {
        return c.json({ error: err.message }, err.status ?? 400);
      }
    },
  );

  // Removes a single medicine from a visit: voids whatever was dispensed
  // against it (reversing the stock) and soft-deletes the line. The visit
  // itself and its other prescription lines are untouched.
  app.post(
    '/visits/:visitId/prescription-lines/:lineId/delete',
    requirePermission('patient.editMedicalInstructions'),
    async (c) => {
      const lineId = Number(c.req.param('lineId'));
      const user = c.get('user');

      const line = db.prepare('SELECT id FROM prescription_line WHERE id = ? AND deleted_at IS NULL').get(lineId) as
        | { id: number }
        | undefined;
      if (!line) return c.json({ error: 'Prescription line not found' }, 404);

      const doDelete = db.transaction(() => {
        voidActiveDispensesForLine(db, lineId, 'Prescription line deleted', user.userId, user.role);
        db.prepare(`UPDATE prescription_line SET deleted_at = datetime('now', 'localtime') WHERE id = ?`).run(lineId);
        insertAuditLog(db, {
          entityType: 'prescription_line',
          entityId: lineId,
          action: 'delete',
          performedByUserId: user.userId,
          performedByRole: user.role,
        });
      });

      try {
        doDelete.immediate();
        return c.json({ ok: true });
      } catch (err: any) {
        return c.json({ error: err.message }, err.status ?? 400);
      }
    },
  );

  // Removes a whole visit (and everything prescribed in it): voids every
  // still-active dispense from the visit, soft-deletes its prescription
  // lines, then the visit itself. Used to delete a mistaken follow-up/visit
  // entry entirely, not just one medicine within it.
  app.post('/visits/:visitId/delete', requirePermission('patient.editMedicalInstructions'), async (c) => {
    const visitId = Number(c.req.param('visitId'));
    const user = c.get('user');

    const visit = db.prepare('SELECT id FROM visit_event WHERE id = ? AND deleted_at IS NULL').get(visitId) as
      | { id: number }
      | undefined;
    if (!visit) return c.json({ error: 'Visit not found' }, 404);

    const doDelete = db.transaction(() => {
      const activeDispenses = db
        .prepare('SELECT id FROM dispense_log WHERE visit_event_id = ? AND voided_at IS NULL')
        .all(visitId) as { id: number }[];
      for (const d of activeDispenses) {
        performVoidDispense(db, {
          dispenseLogId: d.id,
          reason: 'Visit deleted',
          staffUserId: user.userId,
          staffRole: user.role,
        });
      }
      db.prepare(`UPDATE prescription_line SET deleted_at = datetime('now', 'localtime')
        WHERE visit_event_id = ? AND deleted_at IS NULL`).run(visitId);
      db.prepare(`UPDATE visit_event SET deleted_at = datetime('now', 'localtime') WHERE id = ?`).run(visitId);
      insertAuditLog(db, {
        entityType: 'visit_event',
        entityId: visitId,
        action: 'delete',
        performedByUserId: user.userId,
        performedByRole: user.role,
      });
    });

    try {
      doDelete.immediate();
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  // Charge per day for a patient (resolved across merged identities).
  app.get('/charges/by-day', requirePermission('patient.view'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    const date = c.req.query('date');
    if (!patientId || !date) return c.json({ error: 'patientId and date are required' }, 400);

    const allIds = resolvePatientIds(db, patientId);
    const placeholders = allIds.map(() => '?').join(',');
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(d.line_total_cents), 0) as total_cents
         FROM dispense_log d JOIN visit_event v ON v.id = d.visit_event_id
         WHERE d.patient_id IN (${placeholders}) AND date(v.visit_date) = ? AND d.voided_at IS NULL`,
      )
      .get(...allIds, date) as any;

    return c.json({ date, totalCents: row.total_cents });
  });

  // Charge for the whole follow-up window, summed across all its visit events.
  app.get('/:followUpId/charge', requirePermission('patient.view'), (c) => {
    const followUpId = Number(c.req.param('followUpId'));
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(d.line_total_cents), 0) as total_cents
         FROM dispense_log d JOIN visit_event v ON v.id = d.visit_event_id
         WHERE v.follow_up_id = ? AND d.voided_at IS NULL`,
      )
      .get(followUpId) as any;

    return c.json({ followUpId, totalCents: row.total_cents });
  });

  return app;
}
