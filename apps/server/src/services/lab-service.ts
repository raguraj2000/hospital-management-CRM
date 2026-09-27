import type Database from 'better-sqlite3';
import { flagLabValue, type LabFlag, type Role } from '@clinic/shared';
import { insertAuditLog } from './audit-service.js';
import { ConflictError, NotFoundError } from '../errors.js';

export interface LabParameterRow {
  id: number;
  lab_test_id: number;
  name: string;
  method: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_low_female: number | null;
  ref_high_female: number | null;
  ref_text: string | null;
  ref_display: string | null;
  options: string | null;
  no_flag: number;
  sort_order: number;
}

interface Actor {
  userId: number;
  role: Role;
}

function fmt(n: number): string {
  return String(Number(n.toFixed(4)));
}

function rangeText(low: number | null, high: number | null): string | null {
  if (low !== null && high !== null) return `${fmt(low)} - ${fmt(high)}`;
  if (low !== null) return `> ${fmt(low)}`;
  if (high !== null) return `< ${fmt(high)}`;
  return null;
}

/**
 * The normal range that applies to this patient, as limits (for flagging)
 * and as the text printed on the report. Female patients get the female
 * limits where the test has them. When the gender isn't recorded and the
 * test has separate female limits, both ranges are shown and only a value
 * outside BOTH is flagged -- never guess a patient's gender.
 */
export function rangeFor(p: LabParameterRow, gender: string | null) {
  const r = limitsFor(p, gender);
  return {
    ...r,
    text: p.ref_display ?? r.text,
    normalText: p.ref_text,
    noFlag: p.no_flag === 1,
  };
}

function limitsFor(p: LabParameterRow, gender: string | null) {
  const hasFemale = p.ref_low_female !== null || p.ref_high_female !== null;
  const female = { low: p.ref_low_female ?? p.ref_low, high: p.ref_high_female ?? p.ref_high };
  const general = { low: p.ref_low, high: p.ref_high };

  if (!hasFemale || gender === 'male' || gender === 'other') {
    return { ...general, text: rangeText(general.low, general.high) ?? p.ref_text };
  }
  if (gender === 'female') {
    return { ...female, text: rangeText(female.low, female.high) ?? p.ref_text };
  }
  const lows = [general.low, female.low].filter((n): n is number => n !== null);
  const highs = [general.high, female.high].filter((n): n is number => n !== null);
  return {
    low: lows.length ? Math.min(...lows) : null,
    high: highs.length ? Math.max(...highs) : null,
    text: `M: ${rangeText(general.low, general.high) ?? '-'}, F: ${rangeText(female.low, female.high) ?? '-'}`,
  };
}

/** The mark for one result, using the shared rule (see @clinic/shared lab.ts). */
export function flagFor(value: string, range: ReturnType<typeof rangeFor>): LabFlag {
  return flagLabValue(value, range);
}

export function createLabOrder(
  db: Database.Database,
  input: { patientId: number; testIds: number[]; referringDoctorId?: number | null; notes?: string | null },
  actor: Actor,
): number {
  return db.transaction(() => {
    const patient = db.prepare('SELECT id FROM patient WHERE id = ? AND deleted_at IS NULL').get(input.patientId);
    if (!patient) throw new NotFoundError('Patient not found');

    const uniqueIds = [...new Set(input.testIds)];
    const tests = uniqueIds.map((id) => {
      const t = db.prepare('SELECT id, name, price_cents FROM lab_test WHERE id = ? AND is_active = 1').get(id) as
        | { id: number; name: string; price_cents: number }
        | undefined;
      if (!t) throw new NotFoundError(`Lab test ${id} not found (or no longer offered)`);
      return t;
    });

    const info = db
      .prepare(
        `INSERT INTO lab_order (patient_id, referring_doctor_id, notes, ordered_by_user_id, ordered_by_role)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.patientId, input.referringDoctorId ?? null, input.notes ?? null, actor.userId, actor.role);
    const orderId = Number(info.lastInsertRowid);
    db.prepare('UPDATE lab_order SET order_number = ? WHERE id = ?').run(`LAB-${String(orderId).padStart(6, '0')}`, orderId);

    const insertItem = db.prepare(
      'INSERT INTO lab_order_item (lab_order_id, lab_test_id, test_name, price_cents) VALUES (?, ?, ?, ?)',
    );
    for (const t of tests) insertItem.run(orderId, t.id, t.name, t.price_cents);

    insertAuditLog(db, {
      entityType: 'lab_order',
      entityId: orderId,
      action: 'create',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { patientId: input.patientId, tests: tests.map((t) => t.name) },
    });
    return orderId;
  })();
}

/**
 * Adds tests to an order that has no results yet (a wrong or missing tick
 * when ordering). Tests already waiting on the order are skipped.
 */
export function addTestsToOrder(db: Database.Database, orderId: number, testIds: number[], actor: Actor): number {
  return db.transaction(() => {
    const order = db.prepare('SELECT id FROM lab_order WHERE id = ?').get(orderId);
    if (!order) throw new NotFoundError('Lab order not found');
    const done = db
      .prepare(`SELECT 1 FROM lab_order_item WHERE lab_order_id = ? AND status = 'completed' LIMIT 1`)
      .get(orderId);
    if (done) throw new ConflictError('Results are already saved on this order. Make a new lab order for more tests.');

    const waiting = new Set(
      (
        db.prepare(`SELECT lab_test_id FROM lab_order_item WHERE lab_order_id = ? AND status = 'pending'`).all(orderId) as {
          lab_test_id: number;
        }[]
      ).map((r) => r.lab_test_id),
    );
    const insert = db.prepare(
      'INSERT INTO lab_order_item (lab_order_id, lab_test_id, test_name, price_cents) VALUES (?, ?, ?, ?)',
    );
    const added: string[] = [];
    for (const id of [...new Set(testIds)]) {
      if (waiting.has(id)) continue;
      const t = db.prepare('SELECT id, name, price_cents FROM lab_test WHERE id = ? AND is_active = 1').get(id) as
        | { id: number; name: string; price_cents: number }
        | undefined;
      if (!t) throw new NotFoundError(`Lab test ${id} not found (or no longer offered)`);
      insert.run(orderId, t.id, t.name, t.price_cents);
      added.push(t.name);
    }
    if (added.length) {
      insertAuditLog(db, {
        entityType: 'lab_order',
        entityId: orderId,
        action: 'tests_added',
        performedByUserId: actor.userId,
        performedByRole: actor.role,
        detail: { tests: added },
      });
    }
    return added.length;
  })();
}

/**
 * Saves every result for one test in one go and marks it completed. After
 * this nothing about those results can change (see the triggers in
 * migration 0016).
 */
export function saveLabResults(
  db: Database.Database,
  itemId: number,
  input: { values: { parameterId: number; value: string }[]; sampleCollectedAt?: string | null },
  actor: Actor,
): void {
  db.transaction(() => {
    const item = db
      .prepare(
        `SELECT i.id, i.status, i.lab_test_id, i.lab_order_id, p.gender
         FROM lab_order_item i
         JOIN lab_order o ON o.id = i.lab_order_id
         JOIN patient p ON p.id = o.patient_id
         WHERE i.id = ?`,
      )
      .get(itemId) as { id: number; status: string; lab_test_id: number; lab_order_id: number; gender: string | null } | undefined;
    if (!item) throw new NotFoundError('Lab test not found');
    if (item.status !== 'pending') throw new ConflictError('Results for this test were already saved and cannot be changed.');

    const params = db
      .prepare('SELECT * FROM lab_test_parameter WHERE lab_test_id = ? AND is_active = 1 ORDER BY sort_order, id')
      .all(item.lab_test_id) as LabParameterRow[];
    const given = new Map(input.values.map((v) => [v.parameterId, v.value.trim()]));
    for (const id of given.keys()) {
      if (!params.some((p) => p.id === id)) throw new ConflictError('A result was sent for a value this test does not measure.');
    }
    const filled = params.filter((p) => (given.get(p.id) ?? '') !== '');
    if (filled.length === 0) throw new ConflictError('Enter at least one result.');

    const insert = db.prepare(
      `INSERT INTO lab_result (lab_order_item_id, parameter_id, parameter_name, method, unit, reference_range, value, flag, sort_order, entered_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of filled) {
      const value = given.get(p.id)!;
      const range = rangeFor(p, item.gender);
      insert.run(itemId, p.id, p.name, p.method, p.unit, range.text, value, flagFor(value, range), p.sort_order, actor.userId);
    }

    db.prepare(
      `UPDATE lab_order_item SET status = 'completed', completed_at = datetime('now', 'localtime'), completed_by_user_id = ? WHERE id = ?`,
    ).run(actor.userId, itemId);
    db.prepare(
      `UPDATE lab_order SET sample_collected_at = COALESCE(sample_collected_at, ?, datetime('now', 'localtime')) WHERE id = ?`,
    ).run(input.sampleCollectedAt ?? null, item.lab_order_id);

    insertAuditLog(db, {
      entityType: 'lab_order_item',
      entityId: itemId,
      action: 'results_saved',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { values: filled.map((p) => ({ name: p.name, value: given.get(p.id) })) },
    });
  })();
}

/**
 * Cancels one test on an order, with a reason. A pending test (ordered by
 * mistake) just stops. A completed test (wrong result) keeps its results
 * visible, crossed out, and a new pending copy is added for re-entry.
 * Returns the id of that replacement, if any.
 */
export function cancelLabItem(db: Database.Database, itemId: number, reason: string, actor: Actor): number | null {
  return db.transaction(() => {
    const item = db.prepare('SELECT * FROM lab_order_item WHERE id = ?').get(itemId) as
      | { id: number; status: string; lab_order_id: number; lab_test_id: number; test_name: string; price_cents: number }
      | undefined;
    if (!item) throw new NotFoundError('Lab test not found');
    if (item.status === 'cancelled') throw new ConflictError('This test is already cancelled.');

    db.prepare(
      `UPDATE lab_order_item SET status = 'cancelled', cancelled_at = datetime('now', 'localtime'), cancelled_by_user_id = ?, cancel_reason = ?
       WHERE id = ?`,
    ).run(actor.userId, reason, itemId);

    let replacementId: number | null = null;
    if (item.status === 'completed') {
      const info = db
        .prepare(
          `INSERT INTO lab_order_item (lab_order_id, lab_test_id, test_name, price_cents, replaces_item_id) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(item.lab_order_id, item.lab_test_id, item.test_name, item.price_cents, itemId);
      replacementId = Number(info.lastInsertRowid);
    }

    insertAuditLog(db, {
      entityType: 'lab_order_item',
      entityId: itemId,
      action: item.status === 'completed' ? 'result_cancelled' : 'cancelled',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { reason, testName: item.test_name, replacementId },
    });
    return replacementId;
  })();
}
