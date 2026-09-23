import type Database from 'better-sqlite3';
import type { Role, StockAdjustmentReason } from '@clinic/shared';
import { NotFoundError } from '../errors.js';
import { insertAuditLog } from './audit-service.js';

// Batch code (the medicine-level identifier staff scan/search by, stored in
// the `medical_code` column -- see migration 0008) is system-generated, not
// typed in: "#" + 4 random digits, e.g. "#9876". Retries on collision, and
// widens to 5-6 digits if the 4-digit space is ever exhausted (never, for a
// single clinic's medicine list, but this keeps it correct instead of
// looping forever).
export function generateBatchCode(db: Database.Database): string {
  const exists = db.prepare('SELECT 1 FROM medicine WHERE medical_code = ?');
  for (const digits of [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6]) {
    const max = 10 ** digits;
    const min = 10 ** (digits - 1);
    const code = `#${Math.floor(min + Math.random() * (max - min))}`;
    if (!exists.get(code)) return code;
  }
  throw new Error('Could not generate a unique batch code');
}

export interface LowStockRow {
  id: number;
  name: string;
  minimum_stock: number;
  reorder_point: number;
  total_remaining: number;
}

export function getLowStockMedicines(db: Database.Database): LowStockRow[] {
  return db
    .prepare(
      `SELECT m.id, m.name, m.minimum_stock, m.reorder_point,
              COALESCE(SUM(b.quantity_remaining), 0) AS total_remaining
       FROM medicine m
       LEFT JOIN medicine_batch b ON b.medicine_id = m.id AND b.is_active = 1
       WHERE m.deleted_at IS NULL
       GROUP BY m.id
       HAVING total_remaining <= m.minimum_stock`,
    )
    .all() as LowStockRow[];
}

export interface ExpiredBatchRow {
  id: number;
  medicine_name: string;
  lot_number: string;
  expiry_date: string;
  quantity_remaining: number;
}

export function getExpiredBatchesWithStock(db: Database.Database): ExpiredBatchRow[] {
  return db
    .prepare(
      `SELECT b.id, m.name AS medicine_name, b.lot_number, b.expiry_date, b.quantity_remaining
       FROM medicine_batch b JOIN medicine m ON m.id = b.medicine_id
       WHERE b.is_active = 1 AND b.quantity_remaining > 0 AND b.expiry_date < date('now', 'localtime')`,
    )
    .all() as ExpiredBatchRow[];
}

export interface ReceiveBatchParams {
  medicineId: number;
  lotNumber: string;
  expiryDate: string;
  quantityReceived: number;
  supplierId?: number | null;
  performedByUserId: number;
  performedByRole: Role;
}

export function receiveBatch(db: Database.Database, params: ReceiveBatchParams): number {
  const receive = db.transaction(() => {
    const medicine = db.prepare('SELECT id FROM medicine WHERE id = ?').get(params.medicineId);
    if (!medicine) throw new NotFoundError(`Medicine ${params.medicineId} not found`);

    const info = db
      .prepare(
        `INSERT INTO medicine_batch (medicine_id, lot_number, expiry_date, quantity_received, quantity_remaining, supplier_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.medicineId,
        params.lotNumber,
        params.expiryDate,
        params.quantityReceived,
        params.quantityReceived,
        params.supplierId ?? null,
      );

    insertAuditLog(db, {
      entityType: 'medicine_batch',
      entityId: Number(info.lastInsertRowid),
      action: 'receive',
      performedByUserId: params.performedByUserId,
      performedByRole: params.performedByRole,
      detail: { medicineId: params.medicineId, lotNumber: params.lotNumber, quantity: params.quantityReceived },
    });

    return Number(info.lastInsertRowid);
  });
  return receive.immediate();
}

export interface AdjustStockParams {
  medicineBatchId: number;
  quantityDelta: number; // negative for spoilage/breakage, positive for correction
  reasonCode: StockAdjustmentReason;
  notes?: string;
  performedByUserId: number;
  performedByRole: Role;
}

export function adjustStock(db: Database.Database, params: AdjustStockParams): void {
  const adjust = db.transaction(() => {
    const batch = db
      .prepare('SELECT id, quantity_remaining FROM medicine_batch WHERE id = ?')
      .get(params.medicineBatchId) as { id: number; quantity_remaining: number } | undefined;
    if (!batch) throw new NotFoundError(`Batch ${params.medicineBatchId} not found`);

    db.prepare(
      `UPDATE medicine_batch SET quantity_remaining = quantity_remaining + ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    ).run(params.quantityDelta, params.medicineBatchId);

    db.prepare(
      `INSERT INTO stock_adjustment (medicine_batch_id, quantity_delta, reason_code, notes, performed_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(params.medicineBatchId, params.quantityDelta, params.reasonCode, params.notes ?? null, params.performedByUserId);

    insertAuditLog(db, {
      entityType: 'medicine_batch',
      entityId: params.medicineBatchId,
      action: 'stock_adjustment',
      performedByUserId: params.performedByUserId,
      performedByRole: params.performedByRole,
      detail: { quantityDelta: params.quantityDelta, reasonCode: params.reasonCode },
    });
  });
  adjust.immediate();
}
