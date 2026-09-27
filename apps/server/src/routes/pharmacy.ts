import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getClinicHeader } from '../services/invoice-service.js';
import {
  PAYMENT_MODES,
  createSale,
  expiringBatches,
  getSale,
  listSales,
  todaySummary,
  voidSale,
} from '../services/pharmacy-service.js';
import { giveVisitMedicines, listWaitingPrescriptions } from '../services/give-medicines-service.js';

const createSaleSchema = z.object({
  items: z.array(z.object({ medicineId: z.number().int(), quantity: z.number().int().positive() })).min(1),
  patientId: z.number().int().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  discountCents: z.number().int().min(0).default(0),
  paymentMode: z.enum(PAYMENT_MODES).default('cash'),
  amountReceivedCents: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Selling reuses the existing "Dispense medicine" permission and cancelling
// reuses "Cancel a dispense", so Settings > Roles & permissions already
// controls who can work the pharmacy counter.
export function createPharmacyRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.get('/summary', requirePermission('inventory.view'), (c) => {
    const days = 30;
    const expiring = expiringBatches(db, days);
    return c.json({
      today: todaySummary(db),
      expiringCount: expiring.filter((e) => !e.expired).length,
      expiredCount: expiring.filter((e) => e.expired).length,
      days,
    });
  });

  app.get('/expiring', requirePermission('inventory.view'), (c) => {
    const days = Math.min(365, Math.max(1, Number(c.req.query('days')) || 30));
    return c.json({ days, batches: expiringBatches(db, days) });
  });

  app.get('/sales', requirePermission('dispense.create'), (c) => {
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));
    return c.json({
      ...listSales(
        db,
        {
          from: c.req.query('from') || undefined,
          to: c.req.query('to') || undefined,
          paymentMode: c.req.query('paymentMode') || undefined,
          q: c.req.query('q')?.trim() || undefined,
          includeVoided: c.req.query('includeVoided') === '1',
        },
        page,
        pageSize,
      ),
      page,
      pageSize,
    });
  });

  app.get('/sales/:id', requirePermission('dispense.create'), (c) => {
    const result = getSale(db, Number(c.req.param('id')));
    if (!result) return c.json({ error: 'Sale not found' }, 404);
    return c.json({ ...result, clinic: getClinicHeader(db) });
  });

  app.post('/sales', requirePermission('dispense.create'), async (c) => {
    const parsed = createSaleSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid sale', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    try {
      const result = createSale(db, { ...parsed.data, soldByUserId: user.userId, soldByRole: user.role });
      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.post('/sales/:id/void', requirePermission('dispense.void'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { reason?: string };
    const user = c.get('user');
    try {
      voidSale(db, Number(c.req.param('id')), body.reason?.trim() || 'Cancelled at counter', user.userId, user.role);
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  // --- Doctor's prescriptions waiting to be given ------------------------
  app.get('/prescriptions', requirePermission('dispense.create'), (c) => c.json({ visits: listWaitingPrescriptions(db) }));

  // Gives the medicines once the bill is fully paid. With { overrideReason },
  // an Admin/Doctor (payment.override) can give them before payment.
  app.post('/visits/:visitId/give', requirePermission('dispense.create'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { overrideReason?: unknown };
    const reason = typeof body.overrideReason === 'string' ? body.overrideReason.trim() : '';
    if (body.overrideReason !== undefined) {
      if (!c.get('permissions').includes('payment.override')) {
        return c.json({ error: 'Only an Admin or Doctor can give medicines before payment' }, 403);
      }
      if (reason.length < 3) return c.json({ error: 'Write why the medicines are given before payment' }, 400);
    }
    const user = c.get('user');
    try {
      const result = giveVisitMedicines(db, Number(c.req.param('visitId')), { userId: user.userId, role: user.role }, reason || undefined);
      return c.json({ ok: true, ...result });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  return app;
}
