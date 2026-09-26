import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { insertAuditLog } from './audit-service.js';
import { receiveBatch, adjustStock } from './stock-service.js';
import { ConflictError, NotFoundError } from '../errors.js';

interface Actor {
  userId: number;
  role: Role;
}

export type VendorPayMode = 'cash' | 'upi' | 'cheque' | 'bank' | 'other';
export type VendorBillStatus = 'paid' | 'part_paid' | 'pending' | 'cancelled';

export interface VendorInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  creditDays?: number;
  notes?: string | null;
  isActive?: boolean;
}

export interface PurchaseLineInput {
  medicineId: number;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unitCostCents: number;
  /** Optional: also change the medicine's selling price (MRP) to this. */
  newSellingPriceCents?: number | null;
}

export interface PurchaseInput {
  supplierId: number;
  vendorBillNumber?: string | null;
  billDate: string;
  dueDate?: string | null;
  notes?: string | null;
  lines: PurchaseLineInput[];
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Paid so far, balance, and Paid / Part paid / Pending (+ overdue) for one purchase bill. */
export function purchaseBillStatus(db: Database.Database, billId: number) {
  const bill = db.prepare('SELECT total_cents, due_date, cancelled_at FROM purchase_bill WHERE id = ?').get(billId) as
    | { total_cents: number; due_date: string | null; cancelled_at: string | null }
    | undefined;
  if (!bill) throw new NotFoundError('Purchase bill not found');
  const paidCents = (
    db
      .prepare('SELECT COALESCE(SUM(amount_cents), 0) s FROM supplier_payment WHERE purchase_bill_id = ? AND cancelled_at IS NULL')
      .get(billId) as { s: number }
  ).s;
  const balanceCents = bill.cancelled_at ? 0 : Math.max(0, bill.total_cents - paidCents);
  const status: VendorBillStatus = bill.cancelled_at
    ? 'cancelled'
    : balanceCents === 0
      ? 'paid'
      : paidCents > 0
        ? 'part_paid'
        : 'pending';
  const overdue = balanceCents > 0 && bill.due_date !== null && bill.due_date < localToday();
  return { totalCents: bill.total_cents, paidCents, balanceCents, status, overdue };
}

export function listVendors(db: Database.Database) {
  const vendors = db
    .prepare('SELECT * FROM supplier WHERE deleted_at IS NULL ORDER BY is_active DESC, name COLLATE NOCASE')
    .all() as { id: number }[];
  const bills = db.prepare('SELECT id FROM purchase_bill WHERE supplier_id = ? AND cancelled_at IS NULL');
  return vendors.map((v) => {
    let pendingCents = 0;
    let overdueCents = 0;
    let billCount = 0;
    for (const b of bills.all(v.id) as { id: number }[]) {
      const s = purchaseBillStatus(db, b.id);
      billCount += 1;
      pendingCents += s.balanceCents;
      if (s.overdue) overdueCents += s.balanceCents;
    }
    return { ...v, bill_count: billCount, pending_cents: pendingCents, overdue_cents: overdueCents };
  });
}

export function saveVendor(db: Database.Database, id: number | null, input: VendorInput, actor: Actor): number {
  return db.transaction(() => {
    const dup = db
      .prepare('SELECT id FROM supplier WHERE name = ? COLLATE NOCASE AND deleted_at IS NULL AND id IS NOT ?')
      .get(input.name, id);
    if (dup) throw new ConflictError(`A vendor named "${input.name}" already exists.`);
    const values = [
      input.name,
      input.phone ?? null,
      input.address ?? null,
      input.creditDays ?? 0,
      input.notes ?? null,
      input.isActive === false ? 0 : 1,
    ];
    let vendorId = id;
    if (id === null) {
      vendorId = Number(
        db
          .prepare(
            `INSERT INTO supplier (name, phone, address, credit_days, notes, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
          )
          .run(...values).lastInsertRowid,
      );
    } else {
      const r = db
        .prepare('UPDATE supplier SET name = ?, phone = ?, address = ?, credit_days = ?, notes = ?, is_active = ? WHERE id = ? AND deleted_at IS NULL')
        .run(...values, id);
      if (r.changes === 0) throw new NotFoundError('Vendor not found');
    }
    insertAuditLog(db, {
      entityType: 'supplier',
      entityId: vendorId!,
      action: id === null ? 'create' : 'update',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: input,
    });
    return vendorId!;
  })();
}

/**
 * Enters a vendor's bill: every line becomes a new stock batch (tagged with
 * the vendor), the bill total is what's owed, and the due date defaults to
 * the bill date + the vendor's credit days. All or nothing.
 */
export function createPurchaseBill(db: Database.Database, input: PurchaseInput, actor: Actor): number {
  return db.transaction(() => {
    const vendor = db.prepare('SELECT id, credit_days FROM supplier WHERE id = ? AND deleted_at IS NULL').get(input.supplierId) as
      | { id: number; credit_days: number }
      | undefined;
    if (!vendor) throw new NotFoundError('Vendor not found');
    const total = input.lines.reduce((s, l) => s + l.quantity * l.unitCostCents, 0);
    const dueDate = input.dueDate || (vendor.credit_days > 0 ? addDays(input.billDate, vendor.credit_days) : input.billDate);

    const billId = Number(
      db
        .prepare(
          `INSERT INTO purchase_bill (supplier_id, vendor_bill_number, bill_date, due_date, total_cents, notes, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(input.supplierId, input.vendorBillNumber ?? null, input.billDate, dueDate, total, input.notes ?? null, actor.userId)
        .lastInsertRowid,
    );
    const insertLine = db.prepare(
      `INSERT INTO purchase_line (purchase_bill_id, medicine_id, medicine_batch_id, quantity, unit_cost_cents, line_total_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const l of input.lines) {
      const med = db.prepare('SELECT id FROM medicine WHERE id = ? AND deleted_at IS NULL').get(l.medicineId);
      if (!med) throw new NotFoundError(`Medicine ${l.medicineId} not found`);
      const batchId = receiveBatch(db, {
        medicineId: l.medicineId,
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate,
        quantityReceived: l.quantity,
        supplierId: input.supplierId,
        performedByUserId: actor.userId,
        performedByRole: actor.role,
      });
      insertLine.run(billId, l.medicineId, batchId, l.quantity, l.unitCostCents, l.quantity * l.unitCostCents);
      if (l.newSellingPriceCents != null) {
        db.prepare(`UPDATE medicine SET price_cents = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
          l.newSellingPriceCents,
          l.medicineId,
        );
      }
    }
    insertAuditLog(db, {
      entityType: 'purchase_bill',
      entityId: billId,
      action: 'create',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { supplierId: input.supplierId, vendorBillNumber: input.vendorBillNumber, totalCents: total, lines: input.lines.length },
    });
    return billId;
  })();
}

export function listPurchaseBills(db: Database.Database, filter: { supplierId?: number; unpaidOnly?: boolean }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.supplierId) {
    where.push('b.supplier_id = ?');
    params.push(filter.supplierId);
  }
  const rows = db
    .prepare(
      `SELECT b.*, s.name AS vendor_name, (SELECT COUNT(*) FROM purchase_line l WHERE l.purchase_bill_id = b.id) AS line_count
         FROM purchase_bill b JOIN supplier s ON s.id = b.supplier_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY b.bill_date DESC, b.id DESC LIMIT 300`,
    )
    .all(...params) as { id: number }[];
  const withStatus = rows.map((r) => ({ ...r, ...purchaseBillStatus(db, r.id) }));
  return filter.unpaidOnly ? withStatus.filter((b) => b.balanceCents > 0) : withStatus;
}

export function getPurchaseBill(db: Database.Database, billId: number) {
  const bill = db
    .prepare(
      `SELECT b.*, s.name AS vendor_name, s.phone AS vendor_phone, u.full_name AS created_by_name, x.full_name AS cancelled_by_name
         FROM purchase_bill b JOIN supplier s ON s.id = b.supplier_id
         LEFT JOIN user u ON u.id = b.created_by_user_id
         LEFT JOIN user x ON x.id = b.cancelled_by_user_id
        WHERE b.id = ?`,
    )
    .get(billId);
  if (!bill) return null;
  const lines = db
    .prepare(
      `SELECT l.*, m.name AS medicine_name, m.base_unit, bt.lot_number, bt.expiry_date, bt.quantity_remaining
         FROM purchase_line l JOIN medicine m ON m.id = l.medicine_id JOIN medicine_batch bt ON bt.id = l.medicine_batch_id
        WHERE l.purchase_bill_id = ? ORDER BY l.id`,
    )
    .all(billId);
  const payments = db
    .prepare(
      `SELECT p.*, u.full_name AS paid_by_name, x.full_name AS cancelled_by_name
         FROM supplier_payment p LEFT JOIN user u ON u.id = p.paid_by_user_id LEFT JOIN user x ON x.id = p.cancelled_by_user_id
        WHERE p.purchase_bill_id = ? ORDER BY p.id`,
    )
    .all(billId);
  return { bill, lines, payments, status: purchaseBillStatus(db, billId) };
}

export function addVendorPayment(
  db: Database.Database,
  billId: number,
  input: { amountCents: number; mode: VendorPayMode; reference?: string | null },
  actor: Actor,
) {
  return db.transaction(() => {
    const status = purchaseBillStatus(db, billId);
    if (status.status === 'cancelled') throw new ConflictError('This purchase bill is cancelled.');
    if (status.balanceCents === 0) throw new ConflictError('This bill is already fully paid.');
    if (input.amountCents > status.balanceCents) {
      throw new ConflictError(`That is more than the balance (₹${(status.balanceCents / 100).toFixed(2)}).`);
    }
    const id = Number(
      db
        .prepare('INSERT INTO supplier_payment (purchase_bill_id, amount_cents, mode, reference, paid_by_user_id) VALUES (?, ?, ?, ?, ?)')
        .run(billId, input.amountCents, input.mode, input.reference ?? null, actor.userId).lastInsertRowid,
    );
    insertAuditLog(db, {
      entityType: 'supplier_payment',
      entityId: id,
      action: 'paid',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { billId, ...input },
    });
    return purchaseBillStatus(db, billId);
  })();
}

export function cancelVendorPayment(db: Database.Database, paymentId: number, reason: string, actor: Actor): void {
  db.transaction(() => {
    const p = db.prepare('SELECT purchase_bill_id, cancelled_at FROM supplier_payment WHERE id = ?').get(paymentId) as
      | { purchase_bill_id: number; cancelled_at: string | null }
      | undefined;
    if (!p) throw new NotFoundError('Payment not found');
    if (p.cancelled_at) throw new ConflictError('This payment is already cancelled.');
    db.prepare(
      `UPDATE supplier_payment SET cancelled_at = datetime('now', 'localtime'), cancelled_by_user_id = ?, cancel_reason = ? WHERE id = ?`,
    ).run(actor.userId, reason, paymentId);
    insertAuditLog(db, {
      entityType: 'supplier_payment',
      entityId: paymentId,
      action: 'cancelled',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { billId: p.purchase_bill_id, reason },
    });
  })();
}

/**
 * Cancels a bill entered by mistake: its stock is taken back off the
 * shelf. Only while none of that stock has been used and nothing is paid.
 */
export function cancelPurchaseBill(db: Database.Database, billId: number, reason: string, actor: Actor): void {
  db.transaction(() => {
    const status = purchaseBillStatus(db, billId);
    if (status.status === 'cancelled') throw new ConflictError('This purchase bill is already cancelled.');
    if (status.paidCents > 0) throw new ConflictError('Payments were made on this bill. Cancel the payments first.');
    const lines = db
      .prepare(
        `SELECT l.medicine_batch_id, b.quantity_received, b.quantity_remaining
           FROM purchase_line l JOIN medicine_batch b ON b.id = l.medicine_batch_id WHERE l.purchase_bill_id = ?`,
      )
      .all(billId) as { medicine_batch_id: number; quantity_received: number; quantity_remaining: number }[];
    if (lines.some((l) => l.quantity_remaining !== l.quantity_received)) {
      throw new ConflictError('Some of this stock has already been sold or given, so the bill can no longer be cancelled.');
    }
    for (const l of lines) {
      adjustStock(db, {
        medicineBatchId: l.medicine_batch_id,
        quantityDelta: -l.quantity_remaining,
        reasonCode: 'other',
        notes: `Purchase bill cancelled: ${reason}`,
        performedByUserId: actor.userId,
        performedByRole: actor.role,
      });
      db.prepare(`UPDATE medicine_batch SET is_active = 0 WHERE id = ?`).run(l.medicine_batch_id);
    }
    db.prepare(
      `UPDATE purchase_bill SET cancelled_at = datetime('now', 'localtime'), cancelled_by_user_id = ?, cancel_reason = ? WHERE id = ?`,
    ).run(actor.userId, reason, billId);
    insertAuditLog(db, {
      entityType: 'purchase_bill',
      entityId: billId,
      action: 'cancelled',
      performedByUserId: actor.userId,
      performedByRole: actor.role,
      detail: { reason },
    });
  })();
}

/** For the Home page: unpaid vendor bills past their due date. */
export function overdueSummary(db: Database.Database) {
  const bills = listPurchaseBills(db, { unpaidOnly: true }).filter((b) => b.overdue);
  return { overdueBills: bills.length, overdueCents: bills.reduce((s, b) => s + b.balanceCents, 0) };
}
