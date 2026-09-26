import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { performDispense } from './dispense-service.js';
import { coverStatus, recordOverride, type CoverStatus } from './payment-service.js';
import { insertAuditLog } from './audit-service.js';
import { ConflictError, NotFoundError } from '../errors.js';

interface Actor {
  userId: number;
  role: Role;
}

export interface WaitingLine {
  id: number;
  medicine_id: number;
  medicine_name: string;
  quantity_prescribed: number;
  dosage_instructions: string | null;
  duration_days: number | null;
  in_stock: number;
}

// A line is "waiting" until something has been dispensed against it
// (prescriptions from before this system tracked the pharmacy never wait).
const WAITING = `pl.deleted_at IS NULL AND pl.before_pharmacy_tracking = 0
  AND NOT EXISTS (SELECT 1 FROM dispense_log d WHERE d.prescription_line_id = pl.id AND d.voided_at IS NULL)`;

function waitingLines(db: Database.Database, visitId: number): WaitingLine[] {
  return db
    .prepare(
      `SELECT pl.id, pl.medicine_id, m.name AS medicine_name, pl.quantity_prescribed, pl.dosage_instructions, pl.duration_days,
              COALESCE((SELECT SUM(b.quantity_remaining) FROM medicine_batch b
                         WHERE b.medicine_id = m.id AND b.is_active = 1 AND b.expiry_date >= date('now', 'localtime')), 0) AS in_stock
         FROM prescription_line pl JOIN medicine m ON m.id = pl.medicine_id
        WHERE pl.visit_event_id = ? AND ${WAITING}
        ORDER BY pl.id`,
    )
    .all(visitId) as WaitingLine[];
}

/** Paid status of the medicines still waiting on one visit. */
export function visitMedicinesCover(db: Database.Database, visitId: number, lines = waitingLines(db, visitId)): CoverStatus {
  return coverStatus(
    db,
    'prescription_line',
    lines.map((l) => l.id),
    { type: 'visit_medicines', id: visitId },
  );
}

/** Pharmacy queue: every visit with prescribed medicines not given yet, oldest first. */
export function listWaitingPrescriptions(db: Database.Database) {
  const visits = db
    .prepare(
      `SELECT DISTINCT v.id, v.visit_date, v.patient_id, p.current_name, p.customer_code, p.phone_number,
              u.full_name AS doctor_name
         FROM visit_event v
         JOIN prescription_line pl ON pl.visit_event_id = v.id
         JOIN patient p ON p.id = v.patient_id
         LEFT JOIN user u ON u.id = v.attending_doctor_id
        WHERE v.deleted_at IS NULL AND ${WAITING}
        ORDER BY v.visit_date, v.id
        LIMIT 200`,
    )
    .all() as { id: number }[];
  return visits.map((v) => {
    const lines = waitingLines(db, v.id);
    return { ...v, lines, cover: visitMedicinesCover(db, v.id, lines) };
  });
}

/**
 * Gives every waiting medicine on a visit, taking stock earliest-expiry
 * first. Only when the bill covering them is fully paid -- or with an
 * emergency override (reason required; the caller checks permission).
 * All or nothing: if any medicine is short, nothing is given.
 */
export function giveVisitMedicines(
  db: Database.Database,
  visitId: number,
  actor: Actor,
  overrideReason?: string,
): { given: number } {
  const give = db.transaction(() => {
    const visit = db.prepare('SELECT id, patient_id, attending_doctor_id FROM visit_event WHERE id = ? AND deleted_at IS NULL').get(visitId) as
      | { id: number; patient_id: number; attending_doctor_id: number | null }
      | undefined;
    if (!visit) throw new NotFoundError('Prescription not found');
    const lines = waitingLines(db, visitId);
    if (lines.length === 0) throw new ConflictError('Nothing is waiting to be given on this prescription.');

    const cover = visitMedicinesCover(db, visitId, lines);
    if (!cover.paid) {
      if (!overrideReason) {
        throw new ConflictError(
          cover.billed
            ? `Not paid yet: ₹${(cover.balanceCents / 100).toFixed(2)} balance on the bill.`
            : 'These medicines are not on a bill yet. Make the bill and take payment first.',
        );
      }
      recordOverride(db, { type: 'visit_medicines', id: visitId }, overrideReason, actor);
    }

    for (const l of lines) {
      performDispense(db, {
        patientId: visit.patient_id,
        medicineId: l.medicine_id,
        quantity: l.quantity_prescribed,
        visitEventId: visitId,
        prescriptionLineId: l.id,
        prescribingDoctorId: visit.attending_doctor_id,
        staffUserId: actor.userId,
        staffRole: actor.role,
      });
    }
    insertAuditLog(db, {
      entityType: 'visit_event',
      entityId: visitId,
      action: 'medicines_given',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { lines: lines.map((l) => ({ medicine: l.medicine_name, quantity: l.quantity_prescribed })), overrideReason },
    });
    return { given: lines.length };
  });
  return give.immediate();
}
