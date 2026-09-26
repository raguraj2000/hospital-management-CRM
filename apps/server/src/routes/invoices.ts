import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { insertAuditLog } from '../services/audit-service.js';
import { resolvePatientIds } from '../services/patient-merge-service.js';
import {
  createInvoice,
  getClinicHeader,
  getInvoice,
  getInvoiceDefaults,
  getVisitsForBilling,
  getUnbilledLabItems,
  updateInvoice,
  withoutBilledLines,
} from '../services/invoice-service.js';
import { createInvoiceMerging, unpaidBillsForNewInvoice } from '../services/billing-service.js';
import { addPayment, cancelPayment, getBillStatus, listPayments } from '../services/payment-service.js';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  sourceType: z.enum(['prescription_line', 'lab_order_item']).nullable().optional(),
  sourceId: z.number().int().nullable().optional(),
});

const paymentSchema = z.object({
  amountCents: z.number().int().min(1),
  mode: z.enum(['cash', 'upi', 'card', 'other']),
});

const saveInvoiceSchema = z.object({
  patientId: z.number().int(),
  visitEventIds: z.array(z.number().int()).default([]),
  invoiceDate: z.string().min(1),
  doctorFeeCents: z.number().int().min(0).default(0),
  consultantFeeCents: z.number().int().min(0).default(0),
  otherFeeCents: z.number().int().min(0).default(0),
  otherFeeLabel: z.string().nullable().optional(),
  discountCents: z.number().int().min(0).default(0),
  notes: z.string().nullable().optional(),
  lines: z.array(lineSchema).default([]),
  /** New bill only: unpaid bills (no payment yet) folded into this one. */
  mergeInvoiceIds: z.array(z.number().int()).default([]),
});

export function createInvoiceRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  /** Everything the invoice screen needs to start a new bill: clinic header,
   *  default fees, what is not billed yet, and unpaid bills to fold in.
   *  Anything already on a bill never shows here again. */
  app.get('/draft', requirePermission('invoice.manage'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    if (!patientId) return c.json({ error: 'patientId is required' }, 400);
    const visitIdsParam = c.req.query('visitIds');
    const visitIds = visitIdsParam
      ? visitIdsParam.split(',').map((s) => Number(s.trim())).filter(Boolean)
      : undefined;

    const allVisits = getVisitsForBilling(db, patientId, visitIds);
    const visits = withoutBilledLines(db, allVisits);
    return c.json({
      clinic: getClinicHeader(db),
      defaults: getInvoiceDefaults(db),
      visits,
      // Visits fully on a bill already: where that bill is.
      billedVisits: allVisits
        .filter((v) => v.invoice_id && !visits.some((u) => u.id === v.id))
        .map((v) => ({ visitId: v.id, invoiceId: v.invoice_id })),
      labItems: getUnbilledLabItems(db, patientId),
      unpaidBills: unpaidBillsForNewInvoice(db, patientId),
    });
  });

  app.get('/', requirePermission('invoice.view'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    if (!patientId) return c.json({ error: 'patientId is required' }, 400);
    const allIds = resolvePatientIds(db, patientId);
    const placeholders = allIds.map(() => '?').join(',');
    const invoices = db
      .prepare(
        `SELECT i.id, i.invoice_number, i.invoice_date, i.visit_event_id,
                i.doctor_fee_cents + i.consultant_fee_cents + i.other_fee_cents AS fees_cents,
                i.discount_cents,
                COALESCE((SELECT SUM(line_total_cents) FROM invoice_line WHERE invoice_id = i.id), 0) AS items_cents,
                (SELECT GROUP_CONCAT(visit_event_id) FROM invoice_visit WHERE invoice_id = i.id) AS visit_ids
           FROM invoice i
          WHERE i.patient_id IN (${placeholders}) AND i.deleted_at IS NULL
          ORDER BY i.invoice_date DESC, i.id DESC`,
      )
      .all(...allIds) as any[];

    return c.json({
      invoices: invoices.map((i) => {
        const bill = getBillStatus(db, i.id);
        return {
          ...i,
          visit_ids: i.visit_ids ? String(i.visit_ids).split(',').map(Number) : [],
          total_cents: bill.totalCents,
          paid_cents: bill.paidCents,
          balance_cents: bill.balanceCents,
          payment_status: bill.status,
        };
      }),
    });
  });

  app.get('/:id', requirePermission('invoice.view'), (c) => {
    const id = Number(c.req.param('id'));
    const result = getInvoice(db, id);
    if (!result) return c.json({ error: 'Invoice not found' }, 404);
    return c.json({ ...result, payments: listPayments(db, id), bill: getBillStatus(db, id) });
  });

  app.post('/', requirePermission('invoice.manage'), async (c) => {
    const parsed = saveInvoiceSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid invoice', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const { mergeInvoiceIds, ...rest } = parsed.data;
    const body = { ...rest, otherFeeLabel: rest.otherFeeLabel ?? null, notes: rest.notes ?? null };

    let created: { id: number; invoiceNumber: string };
    try {
      created =
        mergeInvoiceIds.length > 0
          ? createInvoiceMerging(db, body, mergeInvoiceIds, { userId: user.userId, role: user.role })
          : createInvoice(db, body, user.userId);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
    const { id, invoiceNumber } = created;
    insertAuditLog(db, {
      entityType: 'invoice',
      entityId: id,
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { invoiceNumber, patientId: body.patientId, visitEventIds: body.visitEventIds, mergeInvoiceIds },
    });
    return c.json({ id, invoiceNumber }, 201);
  });

  app.patch('/:id', requirePermission('invoice.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = saveInvoiceSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid invoice', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const { mergeInvoiceIds: _ignored, ...rest } = parsed.data;
    const body = { ...rest, otherFeeLabel: rest.otherFeeLabel ?? null, notes: rest.notes ?? null };

    try {
      updateInvoice(db, id, body);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
    insertAuditLog(db, {
      entityType: 'invoice',
      entityId: id,
      action: 'update',
      performedByUserId: user.userId,
      performedByRole: user.role,
    });
    return c.json({ ok: true });
  });

  // Soft delete, like every other delete in the system -- the bill stays in
  // the database (and in the audit log) but stops showing on the patient.
  // --- Payments (a bill can be paid in parts) ------------------------------
  app.post('/:id/payments', requirePermission('payment.receive'), async (c) => {
    const parsed = paymentSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Enter the amount and how it was paid' }, 400);
    const user = c.get('user');
    try {
      const bill = addPayment(db, Number(c.req.param('id')), parsed.data, { userId: user.userId, role: user.role });
      return c.json({ ok: true, bill }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.post('/payments/:paymentId/cancel', requirePermission('payment.receive'), async (c) => {
    const parsed = z.object({ reason: z.string().trim().min(3).max(300) }).safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Write why this payment is cancelled' }, 400);
    const user = c.get('user');
    try {
      cancelPayment(db, Number(c.req.param('paymentId')), parsed.data.reason, { userId: user.userId, role: user.role });
      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  app.post('/:id/delete', requirePermission('invoice.manage'), (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    const hasPayments = db
      .prepare('SELECT 1 FROM invoice_payment WHERE invoice_id = ? AND cancelled_at IS NULL LIMIT 1')
      .get(id);
    if (hasPayments) return c.json({ error: 'This bill has payments. Cancel the payments first, then delete it.' }, 409);
    const result = db
      .prepare(`UPDATE invoice SET deleted_at = datetime('now', 'localtime') WHERE id = ? AND deleted_at IS NULL`)
      .run(id);
    if (result.changes === 0) return c.json({ error: 'Invoice not found (or already deleted)' }, 404);

    insertAuditLog(db, {
      entityType: 'invoice',
      entityId: id,
      action: 'delete',
      performedByUserId: user.userId,
      performedByRole: user.role,
    });
    return c.json({ ok: true });
  });

  return app;
}
