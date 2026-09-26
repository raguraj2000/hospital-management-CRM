import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { insertAuditLog } from './audit-service.js';
import { ConflictError, NotFoundError } from '../errors.js';

export type PaymentStatus = 'paid' | 'part_paid' | 'not_paid';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';

interface Actor {
  userId: number;
  role: Role;
}

export interface BillStatus {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: PaymentStatus;
  /** Made before payment tracking existed: treated as paid. */
  paidBeforeTracking: boolean;
}

/** Total, paid so far, balance and Paid / Part paid / Not paid for one bill. */
export function getBillStatus(db: Database.Database, invoiceId: number): BillStatus {
  const inv = db
    .prepare(
      `SELECT doctor_fee_cents + consultant_fee_cents + other_fee_cents AS fees, discount_cents, paid_before_tracking,
              COALESCE((SELECT SUM(line_total_cents) FROM invoice_line WHERE invoice_id = invoice.id), 0) AS items
         FROM invoice WHERE id = ?`,
    )
    .get(invoiceId) as { fees: number; discount_cents: number; paid_before_tracking: number; items: number } | undefined;
  if (!inv) throw new NotFoundError('Bill not found');
  const totalCents = Math.max(0, inv.items + inv.fees - inv.discount_cents);
  const paidCents = (
    db
      .prepare('SELECT COALESCE(SUM(amount_cents), 0) AS s FROM invoice_payment WHERE invoice_id = ? AND cancelled_at IS NULL')
      .get(invoiceId) as { s: number }
  ).s;
  const paidBeforeTracking = inv.paid_before_tracking === 1;
  const balanceCents = paidBeforeTracking ? 0 : Math.max(0, totalCents - paidCents);
  const status: PaymentStatus =
    paidBeforeTracking || balanceCents === 0 ? 'paid' : paidCents > 0 ? 'part_paid' : 'not_paid';
  return { totalCents, paidCents, balanceCents, status, paidBeforeTracking };
}

export function listPayments(db: Database.Database, invoiceId: number) {
  return db
    .prepare(
      `SELECT p.*, u.full_name AS received_by_name, x.full_name AS cancelled_by_name
         FROM invoice_payment p
         LEFT JOIN user u ON u.id = p.received_by_user_id
         LEFT JOIN user x ON x.id = p.cancelled_by_user_id
        WHERE p.invoice_id = ? ORDER BY p.id`,
    )
    .all(invoiceId);
}

export function addPayment(
  db: Database.Database,
  invoiceId: number,
  input: { amountCents: number; mode: PaymentMode },
  actor: Actor,
): BillStatus {
  return db.transaction(() => {
    if (!db.prepare('SELECT id FROM invoice WHERE id = ? AND deleted_at IS NULL').get(invoiceId)) {
      throw new NotFoundError('Bill not found');
    }
    const before = getBillStatus(db, invoiceId);
    if (before.balanceCents === 0) throw new ConflictError('This bill is already fully paid.');
    if (input.amountCents > before.balanceCents) {
      throw new ConflictError(`That is more than the balance (₹${(before.balanceCents / 100).toFixed(2)}).`);
    }
    const info = db
      .prepare('INSERT INTO invoice_payment (invoice_id, amount_cents, mode, received_by_user_id) VALUES (?, ?, ?, ?)')
      .run(invoiceId, input.amountCents, input.mode, actor.userId);
    insertAuditLog(db, {
      entityType: 'invoice_payment',
      entityId: Number(info.lastInsertRowid),
      action: 'received',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { invoiceId, ...input },
    });
    return getBillStatus(db, invoiceId);
  })();
}

export function cancelPayment(db: Database.Database, paymentId: number, reason: string, actor: Actor): void {
  db.transaction(() => {
    const p = db.prepare('SELECT invoice_id, cancelled_at FROM invoice_payment WHERE id = ?').get(paymentId) as
      | { invoice_id: number; cancelled_at: string | null }
      | undefined;
    if (!p) throw new NotFoundError('Payment not found');
    if (p.cancelled_at) throw new ConflictError('This payment is already cancelled.');
    db.prepare(
      `UPDATE invoice_payment SET cancelled_at = datetime('now', 'localtime'), cancelled_by_user_id = ?, cancel_reason = ? WHERE id = ?`,
    ).run(actor.userId, reason, paymentId);
    insertAuditLog(db, {
      entityType: 'invoice_payment',
      entityId: paymentId,
      action: 'cancelled',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { invoiceId: p.invoice_id, reason },
    });
  })();
}

export interface CoverStatus {
  /** Every item is on a bill. */
  billed: boolean;
  /** Every item is on a fully paid bill. */
  paid: boolean;
  /** Balance still owed on the bills involved (0 if paid). */
  balanceCents: number;
  invoiceIds: number[];
  override: { reason: string; by: string | null; at: string } | null;
}

/** Whether the given prescription lines / lab tests are on bills, and whether those bills are fully paid. */
export function coverStatus(
  db: Database.Database,
  sourceType: 'prescription_line' | 'lab_order_item',
  sourceIds: number[],
  overrideTarget: { type: 'visit_medicines' | 'lab_order'; id: number },
): CoverStatus {
  const invoiceIds = new Set<number>();
  let billed = sourceIds.length > 0;
  const find = db.prepare(
    `SELECT DISTINCT l.invoice_id FROM invoice_line l JOIN invoice i ON i.id = l.invoice_id AND i.deleted_at IS NULL
      WHERE l.source_type = ? AND l.source_id = ?`,
  );
  for (const id of sourceIds) {
    const rows = find.all(sourceType, id) as { invoice_id: number }[];
    if (rows.length === 0) billed = false;
    rows.forEach((r) => invoiceIds.add(r.invoice_id));
  }
  const statuses = [...invoiceIds].map((id) => getBillStatus(db, id));
  const balanceCents = statuses.reduce((s, b) => s + b.balanceCents, 0);
  const override = db
    .prepare(
      `SELECT o.reason, u.full_name AS by_name, o.created_at FROM payment_override o LEFT JOIN user u ON u.id = o.overridden_by_user_id
        WHERE o.target_type = ? AND o.target_id = ? ORDER BY o.id DESC LIMIT 1`,
    )
    .get(overrideTarget.type, overrideTarget.id) as { reason: string; by_name: string | null; created_at: string } | undefined;
  return {
    billed,
    paid: billed && balanceCents === 0,
    balanceCents,
    invoiceIds: [...invoiceIds],
    override: override ? { reason: override.reason, by: override.by_name, at: override.created_at } : null,
  };
}

export function recordOverride(
  db: Database.Database,
  target: { type: 'visit_medicines' | 'lab_order'; id: number },
  reason: string,
  actor: Actor,
): void {
  db.prepare(
    `INSERT INTO payment_override (target_type, target_id, reason, overridden_by_user_id, overridden_by_role) VALUES (?, ?, ?, ?, ?)`,
  ).run(target.type, target.id, reason, actor.userId, actor.role);
  insertAuditLog(db, {
    entityType: 'payment_override',
    entityId: target.id,
    action: target.type,
    performedByUserId: actor.userId,
    performedByRole: actor.role,
    detail: { reason },
  });
}
