import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { ConflictError, InsufficientStockError, NotFoundError } from '../errors.js';
import { insertAuditLog } from './audit-service.js';

export interface DispenseParams {
  patientId: number;
  medicineId: number;
  quantity: number;
  visitEventId: number;
  prescriptionLineId?: number | null;
  prescribingDoctorId?: number | null;
  staffUserId: number;
  staffRole: Role;
}

export interface DispenseAllocation {
  batchId: number;
  quantityTaken: number;
  dispenseLogId: number;
}

interface BatchRow {
  id: number;
  quantity_remaining: number;
  expiry_date: string;
}

// Local calendar date, NOT UTC: toISOString() would lag a calendar day
// behind for any timezone ahead of UTC during its early morning hours
// (e.g. IST, UTC+5:30, between midnight and 5:30am), which could let this
// expiry check under-count a batch as "not yet expired" when locally it
// already is. The server runs on the clinic's own machine, so its local
// timezone is the clinic's.
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Picks which batches to take `quantity` from: nearest expiry first, never an
 * expired batch. Only decides -- the caller decrements the batches and writes
 * its own record (a prescription dispense, or a pharmacy counter sale), so
 * both paths always pick stock the same way. Throws InsufficientStockError if
 * there isn't enough unexpired stock. Must run inside the caller's transaction.
 */
export function allocateFefo(
  db: Database.Database,
  medicineId: number,
  quantity: number,
): { batchId: number; take: number; expiryDate: string }[] {
  const batches = db
    .prepare(
      `SELECT id, quantity_remaining, expiry_date FROM medicine_batch
       WHERE medicine_id = ? AND is_active = 1 AND quantity_remaining > 0
       ORDER BY expiry_date ASC, id ASC`,
    )
    .all(medicineId) as BatchRow[];

  const today = todayIso();
  let remaining = quantity;
  const allocations: { batchId: number; take: number; expiryDate: string }[] = [];
  for (const batch of batches) {
    if (remaining <= 0) break;
    if (batch.expiry_date < today) continue; // never auto-dispense expired stock
    const take = Math.min(batch.quantity_remaining, remaining);
    if (take <= 0) continue;
    allocations.push({ batchId: batch.id, take, expiryDate: batch.expiry_date });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new InsufficientStockError(medicineId, remaining);
  }
  return allocations;
}

/**
 * The FEFO dispense core. Does NOT open its own transaction -- callers must
 * already be inside one (either createDispenseService's own immediate
 * transaction, or a combined transaction like "create this prescription
 * line and dispense it in one atomic step"). Splitting it out this way
 * avoids nested-transaction errors from better-sqlite3, which does not
 * support them.
 */
export function performDispense(db: Database.Database, params: DispenseParams): DispenseAllocation[] {
  const { patientId, medicineId, quantity, visitEventId, prescriptionLineId, prescribingDoctorId, staffUserId, staffRole } =
    params;

  if (quantity <= 0) throw new ConflictError('Quantity must be positive');

  const patient = db.prepare('SELECT id, status FROM patient WHERE id = ?').get(patientId) as
    | { id: number; status: string }
    | undefined;
  if (!patient) throw new NotFoundError(`Patient ${patientId} not found`);
  if (patient.status === 'merged') {
    throw new ConflictError('Cannot dispense to a merged patient record; use the surviving patient id');
  }
  if (patient.status === 'deceased') {
    throw new ConflictError('Cannot dispense to a deceased patient');
  }

  const medicine = db.prepare('SELECT id, price_cents FROM medicine WHERE id = ?').get(medicineId) as
    | { id: number; price_cents: number }
    | undefined;
  if (!medicine) throw new NotFoundError(`Medicine ${medicineId} not found`);

  const visit = db.prepare('SELECT id FROM visit_event WHERE id = ?').get(visitEventId) as { id: number } | undefined;
  if (!visit) throw new NotFoundError(`Visit event ${visitEventId} not found`);

  const allocations = allocateFefo(db, medicineId, quantity);

  const insertDispenseLog = db.prepare(`
    INSERT INTO dispense_log (
      visit_event_id, prescription_line_id, patient_id, medicine_id, medicine_batch_id,
      quantity_dispensed, unit_price_cents, line_total_cents,
      dispensed_by_user_id, dispensed_by_role, prescribing_doctor_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const decrementBatch = db.prepare(
    `UPDATE medicine_batch SET quantity_remaining = quantity_remaining - ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
  );

  const results: DispenseAllocation[] = [];
  for (const { batchId, take } of allocations) {
    decrementBatch.run(take, batchId);
    const lineTotal = take * medicine.price_cents;
    const info = insertDispenseLog.run(
      visitEventId,
      prescriptionLineId ?? null,
      patientId,
      medicineId,
      batchId,
      take,
      medicine.price_cents,
      lineTotal,
      staffUserId,
      staffRole,
      prescribingDoctorId ?? null,
    );
    results.push({ batchId, quantityTaken: take, dispenseLogId: Number(info.lastInsertRowid) });
  }

  insertAuditLog(db, {
    entityType: 'dispense',
    entityId: results[0]?.dispenseLogId ?? 0,
    action: 'dispense',
    performedByUserId: staffUserId,
    performedByRole: staffRole,
    detail: { patientId, medicineId, quantity, allocations: results },
  });

  return results;
}

/**
 * FEFO dispense: pulls from the batch with the nearest expiry that still has
 * stock, decrements it, and writes one dispense_log row per batch touched.
 * Runs as a single immediate transaction (see plan §2) — clients only reach
 * SQLite through this API, so there is exactly one writer process; the write
 * lock protects against the backup process and any stray second connection,
 * not a genuine multi-client write race.
 */
export function createDispenseService(db: Database.Database) {
  const dispense = db.transaction((params: DispenseParams): DispenseAllocation[] => performDispense(db, params));

  return {
    dispense: (params: DispenseParams) => dispense.immediate(params),
  };
}

export interface VoidDispenseParams {
  dispenseLogId: number;
  reason: string;
  staffUserId: number;
  staffRole: Role;
}

/**
 * The void core -- does NOT open its own transaction, same reasoning as
 * performDispense: callers that need to void as one step of a larger atomic
 * change (e.g. "void this line's dispenses and re-dispense a new quantity")
 * must already be inside their own transaction.
 */
export function performVoidDispense(db: Database.Database, params: VoidDispenseParams): void {
  const { dispenseLogId, reason, staffUserId, staffRole } = params;
  const log = db
    .prepare('SELECT * FROM dispense_log WHERE id = ?')
    .get(dispenseLogId) as
    | {
        id: number;
        medicine_batch_id: number;
        quantity_dispensed: number;
        voided_at: string | null;
      }
    | undefined;
  if (!log) throw new NotFoundError(`Dispense log ${dispenseLogId} not found`);
  if (log.voided_at) throw new ConflictError('Dispense already voided');

  db.prepare(`UPDATE dispense_log SET voided_at = datetime('now', 'localtime'), void_reason = ? WHERE id = ?`).run(
    reason,
    dispenseLogId,
  );

  db.prepare(
    `UPDATE medicine_batch SET quantity_remaining = quantity_remaining + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
  ).run(log.quantity_dispensed, log.medicine_batch_id);

  db.prepare(
    `INSERT INTO stock_adjustment (medicine_batch_id, quantity_delta, reason_code, notes, performed_by_user_id)
     VALUES (?, ?, 'other', ?, ?)`,
  ).run(log.medicine_batch_id, log.quantity_dispensed, `Void of dispense_log ${dispenseLogId}: ${reason}`, staffUserId);

  insertAuditLog(db, {
    entityType: 'dispense',
    entityId: dispenseLogId,
    action: 'void',
    performedByUserId: staffUserId,
    performedByRole: staffRole,
    detail: { reason },
  });
}

/**
 * Voids a dispense: marks the original dispense_log row (never edited
 * otherwise) and reverses the stock via a stock_adjustment on the same
 * batch, inside its own immediate transaction.
 */
export function createVoidDispenseService(db: Database.Database) {
  const voidDispense = db.transaction((params: VoidDispenseParams) => performVoidDispense(db, params));

  return {
    voidDispense: (params: VoidDispenseParams) => voidDispense.immediate(params),
  };
}
