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
  updateInvoice,
} from '../services/invoice-service.js';

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
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
});

export function createInvoiceRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  /** Everything the invoice screen needs to start a new bill: clinic header,
   *  default fees, and the patient's visits with what was dispensed. */
  app.get('/draft', requirePermission('invoice.manage'), (c) => {
    const patientId = Number(c.req.query('patientId'));
    if (!patientId) return c.json({ error: 'patientId is required' }, 400);
    const visitIdsParam = c.req.query('visitIds');
    const visitIds = visitIdsParam
      ? visitIdsParam.split(',').map((s) => Number(s.trim())).filter(Boolean)
      : undefined;

    return c.json({
      clinic: getClinicHeader(db),
      defaults: getInvoiceDefaults(db),
      visits: getVisitsForBilling(db, patientId, visitIds),
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
                COALESCE((SELECT SUM(line_total_cents) FROM invoice_line WHERE invoice_id = i.id), 0) AS items_cents
           FROM invoice i
          WHERE i.patient_id IN (${placeholders}) AND i.deleted_at IS NULL
          ORDER BY i.invoice_date DESC, i.id DESC`,
      )
      .all(...allIds) as any[];

    return c.json({
      invoices: invoices.map((i) => ({
        ...i,
        total_cents: Math.max(0, i.items_cents + i.fees_cents - i.discount_cents),
      })),
    });
  });

  app.get('/:id', requirePermission('invoice.view'), (c) => {
    const result = getInvoice(db, Number(c.req.param('id')));
    if (!result) return c.json({ error: 'Invoice not found' }, 404);
    return c.json(result);
  });

  app.post('/', requirePermission('invoice.manage'), async (c) => {
    const parsed = saveInvoiceSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid invoice', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const body = { ...parsed.data, otherFeeLabel: parsed.data.otherFeeLabel ?? null, notes: parsed.data.notes ?? null };

    const { id, invoiceNumber } = createInvoice(db, body, user.userId);
    insertAuditLog(db, {
      entityType: 'invoice',
      entityId: id,
      action: 'create',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { invoiceNumber, patientId: body.patientId, visitEventIds: body.visitEventIds },
    });
    return c.json({ id, invoiceNumber }, 201);
  });

  app.patch('/:id', requirePermission('invoice.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = saveInvoiceSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid invoice', details: parsed.error.flatten() }, 400);
    const user = c.get('user');
    const body = { ...parsed.data, otherFeeLabel: parsed.data.otherFeeLabel ?? null, notes: parsed.data.notes ?? null };

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
  app.post('/:id/delete', requirePermission('invoice.manage'), (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
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
