import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  addVendorPayment,
  cancelPurchaseBill,
  cancelVendorPayment,
  createPurchaseBill,
  getPurchaseBill,
  listPurchaseBills,
  listVendors,
  overdueSummary,
  saveVendor,
} from '../services/purchase-service.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date');

const vendorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  creditDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const purchaseSchema = z.object({
  supplierId: z.number().int(),
  vendorBillNumber: z.string().trim().max(60).nullable().optional(),
  billDate: isoDate,
  dueDate: isoDate.nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  lines: z
    .array(
      z.object({
        medicineId: z.number().int(),
        lotNumber: z.string().trim().min(1).max(60),
        expiryDate: isoDate,
        quantity: z.number().int().positive(),
        unitCostCents: z.number().int().min(0),
        newSellingPriceCents: z.number().int().min(0).nullable().optional(),
      }),
    )
    .min(1)
    .max(200),
});

const paymentSchema = z.object({
  amountCents: z.number().int().positive(),
  mode: z.enum(['cash', 'upi', 'cheque', 'bank', 'other']),
  reference: z.string().trim().max(100).nullable().optional(),
});

const reasonSchema = z.object({ reason: z.string().trim().min(3).max(300) });

function fail(c: any, err: any) {
  return c.json({ error: err.message }, err.status ?? 400);
}

// Receiving stock (inventory.adjust: pharmacist, manager) can see vendors and
// enter their bills; adding/editing vendors, paying and cancelling bills is
// supplier.manage (manager, admin).
export function createVendorRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.get('/', requirePermission('inventory.adjust'), (c) => c.json({ vendors: listVendors(db) }));

  app.post('/', requirePermission('supplier.manage'), async (c) => {
    const parsed = vendorSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the vendor name (and check the other fields)' }, 400);
    const user = c.get('user');
    try {
      return c.json({ id: saveVendor(db, null, parsed.data, { userId: user.userId, role: user.role }) }, 201);
    } catch (err) {
      return fail(c, err);
    }
  });

  app.patch('/:id', requirePermission('supplier.manage'), async (c) => {
    const parsed = vendorSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the vendor name (and check the other fields)' }, 400);
    const user = c.get('user');
    try {
      saveVendor(db, Number(c.req.param('id')), parsed.data, { userId: user.userId, role: user.role });
      return c.json({ ok: true });
    } catch (err) {
      return fail(c, err);
    }
  });

  app.get('/summary', requirePermission('supplier.manage'), (c) => c.json(overdueSummary(db)));

  // --- Purchase bills ------------------------------------------------------
  app.get('/purchases', requirePermission('inventory.adjust'), (c) => {
    const supplierId = Number(c.req.query('supplierId')) || undefined;
    const unpaidOnly = c.req.query('unpaid') === '1';
    return c.json({ bills: listPurchaseBills(db, { supplierId, unpaidOnly }) });
  });

  app.post('/purchases', requirePermission('inventory.adjust'), async (c) => {
    const parsed = purchaseSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Check the vendor, date and every line (medicine, batch, expiry, quantity, cost)' }, 400);
    const user = c.get('user');
    try {
      return c.json({ id: createPurchaseBill(db, parsed.data, { userId: user.userId, role: user.role }) }, 201);
    } catch (err) {
      return fail(c, err);
    }
  });

  app.get('/purchases/:id', requirePermission('inventory.adjust'), (c) => {
    const result = getPurchaseBill(db, Number(c.req.param('id')));
    if (!result) return c.json({ error: 'Purchase bill not found' }, 404);
    return c.json(result);
  });

  app.post('/purchases/:id/payments', requirePermission('supplier.manage'), async (c) => {
    const parsed = paymentSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the amount and how it was paid' }, 400);
    const user = c.get('user');
    try {
      return c.json({ ok: true, status: addVendorPayment(db, Number(c.req.param('id')), parsed.data, { userId: user.userId, role: user.role }) }, 201);
    } catch (err) {
      return fail(c, err);
    }
  });

  app.post('/purchases/payments/:paymentId/cancel', requirePermission('supplier.manage'), async (c) => {
    const parsed = reasonSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Write why this payment is cancelled' }, 400);
    const user = c.get('user');
    try {
      cancelVendorPayment(db, Number(c.req.param('paymentId')), parsed.data.reason, { userId: user.userId, role: user.role });
      return c.json({ ok: true });
    } catch (err) {
      return fail(c, err);
    }
  });

  app.post('/purchases/:id/cancel', requirePermission('supplier.manage'), async (c) => {
    const parsed = reasonSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Write why this bill is cancelled' }, 400);
    const user = c.get('user');
    try {
      cancelPurchaseBill(db, Number(c.req.param('id')), parsed.data.reason, { userId: user.userId, role: user.role });
      return c.json({ ok: true });
    } catch (err) {
      return fail(c, err);
    }
  });

  return app;
}
