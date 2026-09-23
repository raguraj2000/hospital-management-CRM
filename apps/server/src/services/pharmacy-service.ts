import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { ConflictError, InsufficientStockError, NotFoundError } from '../errors.js';
import { allocateFefo } from './dispense-service.js';
import { insertAuditLog } from './audit-service.js';

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'other'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface SaleItemInput {
  medicineId: number;
  quantity: number;
}

export interface CreateSaleInput {
  items: SaleItemInput[];
  patientId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  discountCents: number;
  paymentMode: PaymentMode;
  amountReceivedCents?: number | null;
  notes?: string | null;
  soldByUserId: number;
  soldByRole: Role;
}

function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** RCPT-000001, RCPT-000002, ... never reused, even after a cancelled sale. */
function nextReceiptNumber(db: Database.Database): string {
  const row = db.prepare('SELECT receipt_number FROM pharmacy_sale ORDER BY id DESC LIMIT 1').get() as
    | { receipt_number: string }
    | undefined;
  const last = row ? Number(row.receipt_number.replace(/\D/g, '')) : 0;
  return `RCPT-${String(last + 1).padStart(6, '0')}`;
}

/**
 * Sells over the counter: for each item, takes stock nearest-expiry first
 * (same allocateFefo the prescription path uses, so expired stock is never
 * sold), decrements the batches, and records the sale -- all in one
 * immediate transaction. If ANY item is short on stock, nothing is sold and
 * no stock moves.
 */
export function createSale(db: Database.Database, input: CreateSaleInput): { id: number; receiptNumber: string } {
  const items = input.items.filter((i) => i.quantity > 0);
  if (items.length === 0) throw new ConflictError('Add at least one medicine to the sale');

  const run = db.transaction(() => {
    const getMedicine = db.prepare('SELECT id, name, price_cents FROM medicine WHERE id = ? AND deleted_at IS NULL');
    const decrement = db.prepare(
      `UPDATE medicine_batch SET quantity_remaining = quantity_remaining - ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    );

    const lines: {
      medicineId: number;
      batchId: number;
      name: string;
      expiryDate: string;
      quantity: number;
      unitPriceCents: number;
    }[] = [];

    for (const item of items) {
      const med = getMedicine.get(item.medicineId) as { id: number; name: string; price_cents: number } | undefined;
      if (!med) throw new NotFoundError(`Medicine ${item.medicineId} not found`);
      let allocations;
      try {
        allocations = allocateFefo(db, item.medicineId, item.quantity);
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          // Say which medicine and how many can actually be sold (expired
          // stock doesn't count), so the counter can fix the quantity.
          const available = item.quantity - err.shortfall;
          throw new ConflictError(
            `Not enough ${med.name} in stock: ${available} available to sell (unexpired), ${item.quantity} asked for.`,
          );
        }
        throw err;
      }
      for (const a of allocations) {
        decrement.run(a.take, a.batchId);
        lines.push({
          medicineId: med.id,
          batchId: a.batchId,
          name: med.name,
          expiryDate: a.expiryDate,
          quantity: a.take,
          unitPriceCents: med.price_cents,
        });
      }
    }

    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0);
    const discount = Math.min(Math.max(0, input.discountCents), subtotal);
    const total = subtotal - discount;
    const receiptNumber = nextReceiptNumber(db);

    const info = db
      .prepare(
        `INSERT INTO pharmacy_sale (receipt_number, patient_id, customer_name, customer_phone, subtotal_cents,
                                    discount_cents, total_cents, payment_mode, amount_received_cents, notes, sold_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        receiptNumber,
        input.patientId ?? null,
        input.customerName?.trim() || null,
        input.customerPhone?.trim() || null,
        subtotal,
        discount,
        total,
        input.paymentMode,
        input.amountReceivedCents ?? null,
        input.notes?.trim() || null,
        input.soldByUserId,
      );
    const saleId = Number(info.lastInsertRowid);

    const insertLine = db.prepare(
      `INSERT INTO pharmacy_sale_line (sale_id, medicine_id, medicine_batch_id, medicine_name, expiry_date,
                                       quantity, unit_price_cents, line_total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const l of lines) {
      insertLine.run(saleId, l.medicineId, l.batchId, l.name, l.expiryDate, l.quantity, l.unitPriceCents, l.quantity * l.unitPriceCents);
    }

    insertAuditLog(db, {
      entityType: 'pharmacy_sale',
      entityId: saleId,
      action: 'create',
      performedByUserId: input.soldByUserId,
      performedByRole: input.soldByRole,
      detail: { receiptNumber, total, items },
    });
    return { id: saleId, receiptNumber };
  });
  return run.immediate();
}

/** Cancels a sale and puts every unit back into the batch it came from. */
export function voidSale(db: Database.Database, saleId: number, reason: string, userId: number, role: Role): void {
  const run = db.transaction(() => {
    const sale = db.prepare('SELECT id, voided_at FROM pharmacy_sale WHERE id = ?').get(saleId) as
      | { id: number; voided_at: string | null }
      | undefined;
    if (!sale) throw new NotFoundError(`Sale ${saleId} not found`);
    if (sale.voided_at) throw new ConflictError('This sale was already cancelled');

    const lines = db
      .prepare('SELECT medicine_batch_id, quantity FROM pharmacy_sale_line WHERE sale_id = ?')
      .all(saleId) as { medicine_batch_id: number; quantity: number }[];
    const restore = db.prepare(
      `UPDATE medicine_batch SET quantity_remaining = quantity_remaining + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    );
    for (const l of lines) restore.run(l.quantity, l.medicine_batch_id);

    db.prepare(
      `UPDATE pharmacy_sale SET voided_at = datetime('now', 'localtime'), void_reason = ?, voided_by_user_id = ? WHERE id = ?`,
    ).run(reason, userId, saleId);

    insertAuditLog(db, {
      entityType: 'pharmacy_sale',
      entityId: saleId,
      action: 'void',
      performedByUserId: userId,
      performedByRole: role,
      detail: { reason },
    });
  });
  run.immediate();
}

export function getSale(db: Database.Database, saleId: number) {
  const sale = db
    .prepare(
      `SELECT s.*, u.full_name AS sold_by_name, p.current_name AS patient_name, p.customer_code
         FROM pharmacy_sale s
         LEFT JOIN user u ON u.id = s.sold_by_user_id
         LEFT JOIN patient p ON p.id = s.patient_id
        WHERE s.id = ?`,
    )
    .get(saleId);
  if (!sale) return null;
  // Batches of the same medicine are merged on the receipt: the customer
  // bought "10 Paracetamol", not "6 from one batch and 4 from another".
  const lines = db
    .prepare(
      `SELECT medicine_id, medicine_name, unit_price_cents, SUM(quantity) AS quantity,
              SUM(line_total_cents) AS line_total_cents, MIN(expiry_date) AS expiry_date
         FROM pharmacy_sale_line WHERE sale_id = ?
        GROUP BY medicine_id, medicine_name, unit_price_cents
        ORDER BY MIN(id)`,
    )
    .all(saleId);
  return { sale, lines };
}

export interface SaleFilters {
  from?: string;
  to?: string;
  paymentMode?: string;
  q?: string;
  includeVoided?: boolean;
}

export function listSales(db: Database.Database, f: SaleFilters, page: number, pageSize: number) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.from) {
    where.push('date(s.sold_at) >= ?');
    params.push(f.from);
  }
  if (f.to) {
    where.push('date(s.sold_at) <= ?');
    params.push(f.to);
  }
  if (f.paymentMode) {
    where.push('s.payment_mode = ?');
    params.push(f.paymentMode);
  }
  if (f.q) {
    where.push('(s.receipt_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)');
    params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (!f.includeVoided) where.push('s.voided_at IS NULL');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM pharmacy_sale s ${whereSql}`).get(...params) as { c: number }).c;
  const totals = db
    .prepare(`SELECT COALESCE(SUM(s.total_cents), 0) AS sum FROM pharmacy_sale s ${whereSql} ${where.length ? 'AND' : 'WHERE'} s.voided_at IS NULL`)
    .get(...params) as { sum: number };
  const rows = db
    .prepare(
      `SELECT s.id, s.receipt_number, s.sold_at, s.customer_name, s.customer_phone, s.total_cents, s.payment_mode,
              s.voided_at, u.full_name AS sold_by_name,
              (SELECT COUNT(DISTINCT medicine_id) FROM pharmacy_sale_line WHERE sale_id = s.id) AS item_count
         FROM pharmacy_sale s LEFT JOIN user u ON u.id = s.sold_by_user_id
         ${whereSql}
        ORDER BY s.sold_at DESC, s.id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize);
  return { sales: rows, total, totalCents: totals.sum };
}

/** Today's counter takings, split by payment mode, for the header cards. */
export function todaySummary(db: Database.Database) {
  const today = localDate();
  const rows = db
    .prepare(
      `SELECT payment_mode, COUNT(*) AS count, COALESCE(SUM(total_cents), 0) AS total_cents
         FROM pharmacy_sale WHERE date(sold_at) = ? AND voided_at IS NULL GROUP BY payment_mode`,
    )
    .all(today) as { payment_mode: string; count: number; total_cents: number }[];
  return {
    date: today,
    count: rows.reduce((s, r) => s + r.count, 0),
    totalCents: rows.reduce((s, r) => s + r.total_cents, 0),
    byMode: rows,
  };
}

/**
 * Batches that still have stock and expire within `days` (already-expired
 * ones included, flagged). Drives the Pharmacy "Expiring soon" tab, the red
 * badge on the menu, and the Home card.
 */
export function expiringBatches(db: Database.Database, days: number) {
  const today = localDate();
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  const limitDate = localDate(limit);
  const rows = db
    .prepare(
      `SELECT b.id AS batch_id, b.lot_number, b.expiry_date, b.quantity_remaining,
              m.id AS medicine_id, m.name AS medicine_name, m.medical_code, m.base_unit,
              mc.name AS category_name
         FROM medicine_batch b
         JOIN medicine m ON m.id = b.medicine_id AND m.deleted_at IS NULL
         LEFT JOIN medicine_category mc ON mc.id = m.category_id
        WHERE b.is_active = 1 AND b.quantity_remaining > 0 AND b.expiry_date <= ?
        ORDER BY b.expiry_date ASC, m.name`,
    )
    .all(limitDate) as any[];
  return rows.map((r) => ({
    ...r,
    expired: r.expiry_date < today,
    days_left: Math.round((new Date(r.expiry_date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86_400_000),
  }));
}
