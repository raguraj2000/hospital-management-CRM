import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { createQuickBill, patientDues, pendingPatients } from '../services/billing-service.js';

// The billing counter: who still has to pay, and one-step "Take payment".
export function createBillingRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.get('/pending', requirePermission('payment.receive'), (c) => c.json({ patients: pendingPatients(db) }));

  app.get('/patients/:patientId', requirePermission('payment.receive'), (c) =>
    c.json(patientDues(db, Number(c.req.param('patientId')))),
  );

  // Makes one bill with everything not billed yet; the app then opens it at the payment box.
  app.post('/patients/:patientId/quick-bill', requirePermission('invoice.manage'), (c) => {
    const user = c.get('user');
    try {
      return c.json(createQuickBill(db, Number(c.req.param('patientId')), { userId: user.userId, role: user.role }), 201);
    } catch (err: any) {
      return c.json({ error: err.message }, err.status ?? 400);
    }
  });

  return app;
}
