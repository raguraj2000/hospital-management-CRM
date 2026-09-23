import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createDispenseService, createVoidDispenseService } from '../services/dispense-service.js';

const dispenseSchema = z.object({
  patientId: z.number().int(),
  medicineId: z.number().int(),
  quantity: z.number().int().positive(),
  visitEventId: z.number().int(),
  prescriptionLineId: z.number().int().nullable().optional(),
  prescribingDoctorId: z.number().int().nullable().optional(),
});

const voidSchema = z.object({ reason: z.string().min(1) });

export function createDispenseRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.post('/', requirePermission('dispense.create'), async (c) => {
    const parsed = dispenseSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const { dispense } = createDispenseService(db);

    try {
      const allocations = dispense({
        ...parsed.data,
        staffUserId: user.userId,
        staffRole: user.role,
      });
      return c.json({ allocations }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.get('/today-summary', requirePermission('inventory.view'), (c) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(line_total_cents), 0) as total_cents
         FROM dispense_log
         WHERE date(dispensed_at) = date('now', 'localtime') AND voided_at IS NULL`,
      )
      .get() as { count: number; total_cents: number };
    return c.json({ count: row.count, totalCents: row.total_cents });
  });

  app.post('/:id/void', requirePermission('dispense.void'), async (c) => {
    const dispenseLogId = Number(c.req.param('id'));
    const parsed = voidSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const { voidDispense } = createVoidDispenseService(db);

    try {
      voidDispense({ dispenseLogId, reason: parsed.data.reason, staffUserId: user.userId, staffRole: user.role });
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  return app;
}
