import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { NotFoundError, ConflictError } from '../errors.js';
import { insertAuditLog } from './audit-service.js';

interface PatientRow {
  id: number;
  status: string;
  merged_into_id: number | null;
}

/**
 * Resolves a patient id to every patient_id folded into that identity via
 * merges (the patient itself plus any patients merged into it, transitively).
 *
 * Every patient-scoped query (charges, dispense history, follow-ups) MUST
 * filter through this rather than a bare patient_id — merges never rewrite
 * historical FK rows (see plan §1, patient merge semantics), so a bare
 * patient_id filter silently returns partial history for a merged patient.
 */
export function resolvePatientIds(db: Database.Database, patientId: number): number[] {
  const root = db
    .prepare('SELECT id, status, merged_into_id FROM patient WHERE id = ?')
    .get(patientId) as PatientRow | undefined;
  if (!root) throw new NotFoundError(`Patient ${patientId} not found`);

  // Walk up to the surviving identity if this id was itself merged away.
  let surviving = root;
  const seen = new Set<number>([root.id]);
  while (surviving.merged_into_id !== null) {
    if (seen.has(surviving.merged_into_id)) break; // defensive: cycle guard
    const next = db
      .prepare('SELECT id, status, merged_into_id FROM patient WHERE id = ?')
      .get(surviving.merged_into_id) as PatientRow | undefined;
    if (!next) break;
    seen.add(next.id);
    surviving = next;
  }

  // Now collect every patient merged (transitively) into the surviving id.
  const ids = new Set<number>([surviving.id]);
  const queue = [surviving.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = db
      .prepare('SELECT id FROM patient WHERE merged_into_id = ?')
      .all(current) as { id: number }[];
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return Array.from(ids);
}

export function mergePatients(
  db: Database.Database,
  params: {
    survivingPatientId: number;
    mergedPatientId: number;
    performedByUserId: number;
    performedByRole: Role;
    notes?: string;
  },
): void {
  const merge = db.transaction(() => {
    const { survivingPatientId, mergedPatientId, performedByUserId, performedByRole, notes } = params;
    if (survivingPatientId === mergedPatientId) {
      throw new ConflictError('Cannot merge a patient into itself');
    }
    const surviving = db.prepare('SELECT id, status FROM patient WHERE id = ?').get(survivingPatientId) as
      | PatientRow
      | undefined;
    const merged = db.prepare('SELECT id, status FROM patient WHERE id = ?').get(mergedPatientId) as
      | PatientRow
      | undefined;
    if (!surviving) throw new NotFoundError(`Patient ${survivingPatientId} not found`);
    if (!merged) throw new NotFoundError(`Patient ${mergedPatientId} not found`);
    if (merged.status === 'merged') throw new ConflictError('Patient is already merged');

    db.prepare(
      `UPDATE patient SET status = 'merged', merged_into_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    ).run(survivingPatientId, mergedPatientId);

    db.prepare(
      `INSERT INTO patient_merge_log (surviving_patient_id, merged_patient_id, merged_by_user_id, notes)
       VALUES (?, ?, ?, ?)`,
    ).run(survivingPatientId, mergedPatientId, performedByUserId, notes ?? null);

    insertAuditLog(db, {
      entityType: 'patient',
      entityId: mergedPatientId,
      action: 'merge',
      performedByUserId,
      performedByRole,
      detail: { survivingPatientId, mergedPatientId },
    });
  });
  merge();
}
