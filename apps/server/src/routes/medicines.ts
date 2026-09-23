import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getLowStockMedicines,
  getExpiredBatchesWithStock,
  receiveBatch,
  adjustStock,
  generateBatchCode,
} from '../services/stock-service.js';
import { insertAuditLog } from '../services/audit-service.js';

// No `medicalCode`: the batch code is system-generated (see generateBatchCode)
// and never typed in or edited, on create or update.
const createMedicineSchema = z.object({
  name: z.string().min(1),
  baseUnit: z.string().min(1),
  packSize: z.number().int().positive().default(1),
  conversionFactor: z.number().positive().default(1),
  priceCents: z.number().int().nonnegative(),
  minimumStock: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(0),
  preferredSupplierId: z.number().int().nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
});

const receiveBatchSchema = z.object({
  lotNumber: z.string().min(1),
  expiryDate: z.string().min(1),
  quantityReceived: z.number().int().positive(),
  supplierId: z.number().int().nullable().optional(),
});

const adjustStockSchema = z.object({
  quantityDelta: z.number().int(),
  reasonCode: z.enum(['spoilage', 'breakage', 'stock_take_correction', 'expired_writeoff', 'other']),
  notes: z.string().optional(),
});

export function createMedicineRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  // Plain GET (no `page`) returns every medicine, unpaginated -- callers
  // like the prescription form's medicine picker need the whole list to
  // search/select from client-side, and must not silently start seeing only
  // a page of it. Pass `page` (with optional `pageSize`, default 20) to get
  // the paginated shape the Inventory table uses instead. `q` filters by
  // name or batch code either way.
  app.get('/', requirePermission('inventory.view'), (c) => {
    const q = c.req.query('q')?.trim();
    const pageParam = c.req.query('page');
    const whereClauses = ['m.deleted_at IS NULL'];
    const whereParams: unknown[] = [];
    if (q) {
      whereClauses.push('(m.name LIKE ? OR m.medical_code LIKE ?)');
      whereParams.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = whereClauses.join(' AND ');
    const selectCols = `m.*, mc.name as category_name,
                  COALESCE(SUM(b.quantity_remaining), 0) as total_remaining,
                  MIN(CASE WHEN b.quantity_remaining > 0 THEN b.expiry_date END) as nearest_expiry`;
    const joins = `LEFT JOIN medicine_batch b ON b.medicine_id = m.id AND b.is_active = 1
           LEFT JOIN medicine_category mc ON mc.id = m.category_id`;

    if (!pageParam) {
      const rows = db
        .prepare(
          `SELECT ${selectCols}
           FROM medicine m ${joins}
           WHERE ${whereSql} GROUP BY m.id ORDER BY m.name`,
        )
        .all(...whereParams);
      return c.json({ medicines: rows });
    }

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));
    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM medicine m WHERE ${whereSql}`).get(...whereParams) as {
        count: number;
      }
    ).count;
    const rows = db
      .prepare(
        `SELECT ${selectCols}
         FROM medicine m ${joins}
         WHERE ${whereSql} GROUP BY m.id ORDER BY m.name LIMIT ? OFFSET ?`,
      )
      .all(...whereParams, pageSize, (page - 1) * pageSize);
    return c.json({ medicines: rows, total, page, pageSize });
  });

  app.get('/low-stock', requirePermission('inventory.view'), (c) => {
    return c.json({ lowStock: getLowStockMedicines(db) });
  });

  app.get('/expired', requirePermission('inventory.view'), (c) => {
    return c.json({ expired: getExpiredBatchesWithStock(db) });
  });

  app.post('/', requirePermission('medicine.manage'), async (c) => {
    const parsed = createMedicineSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');
    const batchCode = generateBatchCode(db);

    const info = db
      .prepare(
        `INSERT INTO medicine (name, medical_code, base_unit, pack_size, conversion_factor, price_cents, minimum_stock, reorder_point, preferred_supplier_id, category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.name,
        batchCode,
        body.baseUnit,
        body.packSize,
        body.conversionFactor,
        body.priceCents,
        body.minimumStock,
        body.reorderPoint,
        body.preferredSupplierId ?? null,
        body.categoryId ?? null,
      );

    insertAuditLog(db, {
      entityType: 'medicine',
      entityId: Number(info.lastInsertRowid),
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { ...body, batchCode },
    });

    return c.json({ id: Number(info.lastInsertRowid), batchCode }, 201);
  });

  app.patch('/:id', requirePermission('medicine.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = createMedicineSchema.partial().safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');

    // batch code (medical_code) is system-generated and not in createMedicineSchema
    // any more, so it's never in `body` here -- it can't be edited.
    const columnMap: Record<string, string> = {
      name: 'name',
      baseUnit: 'base_unit',
      packSize: 'pack_size',
      conversionFactor: 'conversion_factor',
      priceCents: 'price_cents',
      minimumStock: 'minimum_stock',
      reorderPoint: 'reorder_point',
      preferredSupplierId: 'preferred_supplier_id',
      categoryId: 'category_id',
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columnMap)) {
      if (key in body) {
        fields.push(`${column} = ?`);
        values.push((body as any)[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

    values.push(id);
    db.prepare(`UPDATE medicine SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values);

    insertAuditLog(db, {
      entityType: 'medicine',
      entityId: id,
      action: 'update',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: body,
    });

    return c.json({ ok: true });
  });

  // Soft delete only, per the no-hard-delete rule -- the row and every batch,
  // dispense and prescription-line history referencing it are kept; it just
  // stops showing up in the inventory list and the medicine picker.
  app.post('/:id/delete', requirePermission('medicine.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    const result = db
      .prepare(`UPDATE medicine SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND deleted_at IS NULL`)
      .run(id);
    if (result.changes === 0) return c.json({ error: 'Medicine not found (or already deleted)' }, 404);

    insertAuditLog(db, {
      entityType: 'medicine',
      entityId: id,
      action: 'delete',
      performedByUserId: user.userId,
      performedByRole: user.role,
    });
    return c.json({ ok: true });
  });

  app.post('/:id/batches', requirePermission('inventory.adjust'), async (c) => {
    const medicineId = Number(c.req.param('id'));
    const parsed = receiveBatchSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');

    try {
      const batchId = receiveBatch(db, {
        medicineId,
        lotNumber: parsed.data.lotNumber,
        expiryDate: parsed.data.expiryDate,
        quantityReceived: parsed.data.quantityReceived,
        supplierId: parsed.data.supplierId,
        performedByUserId: user.userId,
        performedByRole: user.role,
      });
      return c.json({ id: batchId }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.post('/batches/:batchId/adjust', requirePermission('inventory.adjust'), async (c) => {
    const batchId = Number(c.req.param('batchId'));
    const parsed = adjustStockSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');

    try {
      adjustStock(db, {
        medicineBatchId: batchId,
        quantityDelta: parsed.data.quantityDelta,
        reasonCode: parsed.data.reasonCode,
        notes: parsed.data.notes,
        performedByUserId: user.userId,
        performedByRole: user.role,
      });
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  return app;
}
