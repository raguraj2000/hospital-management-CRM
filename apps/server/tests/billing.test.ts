import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createBillingRoutes } from '../src/routes/billing.js';
import { createFollowUpRoutes } from '../src/routes/follow-ups.js';
import { createLabRoutes } from '../src/routes/lab.js';
import { createInvoiceRoutes } from '../src/routes/invoices.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

describe('billing counter: who owes, and one-step Take payment', () => {
  let db: Database.Database;
  let dbPath: string;
  let billing: ReturnType<typeof createBillingRoutes>;
  let invoices: ReturnType<typeof createInvoiceRoutes>;
  let patientId: number;

  function call(app: any, path: string, token: string, method = 'GET', body?: unknown): Promise<Response> {
    return app.request(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function addUser(name: string, role: string, token: string) {
    const roleId = (db.prepare(`SELECT id FROM role WHERE name = ?`).get(role) as any).id;
    const id = db.prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, 'x', ?)`).run(name, token, roleId).lastInsertRowid;
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, id, new Date(Date.now() + 3600_000).toISOString());
  }

  beforeEach(async () => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    billing = createBillingRoutes(db);
    invoices = createInvoiceRoutes(db);
    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    addUser('Dr. A', 'doctor', 'doc');
    addUser('Desk', 'front_desk', 'desk');
    db.prepare(`INSERT OR REPLACE INTO app_setting (key, value) VALUES ('invoice.defaultDoctorFeeCents', '20000')`).run();
    db.prepare(`UPDATE lab_test SET price_cents = 15000 WHERE id = 1`).run();
    patientId = Number(db.prepare(`INSERT INTO patient (customer_code, current_name) VALUES ('PT-0001', 'Ravi')`).run().lastInsertRowid);
    const medicineId = Number(
      db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, minimum_stock, reorder_point) VALUES ('Paracetamol', 'tablet', 200, 0, 0)`).run().lastInsertRowid,
    );
    const visitId = Number(db.prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, '2026-09-25 10:00')`).run(patientId).lastInsertRowid);
    await call(createFollowUpRoutes(db), `/visits/${visitId}/prescription-lines`, 'doc', 'POST', { medicineId, quantityPrescribed: 10 });
    await call(createLabRoutes(db), '/orders', 'doc', 'POST', { patientId, testIds: [1] });
  });

  afterEach(() => cleanupDb(db, dbPath));

  it('lists the patient with everything not billed yet', async () => {
    const { patients } = await (await call(billing, '/pending', 'desk')).json();
    expect(patients).toHaveLength(1);
    // 10 x 2.00 medicine + 150.00 lab test
    expect(patients[0]).toMatchObject({ current_name: 'Ravi', unbilledCount: 2, unbilledCents: 17000, unpaidBills: 0 });
    expect((await call(billing, '/pending', 'doc')).status).toBe(403); // doctors don't take payments
  });

  it('Take payment makes one bill with medicines, lab tests and the doctor fee; paying it clears the list', async () => {
    const res = await call(billing, `/patients/${patientId}/quick-bill`, 'desk', 'POST');
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const bill = await (await call(invoices, `/${id}`, 'desk')).json();
    expect(bill.lines.map((l: any) => l.source_type).sort()).toEqual(['lab_order_item', 'prescription_line']);
    expect(bill.invoice.doctor_fee_cents).toBe(20000);
    expect(bill.bill).toMatchObject({ totalCents: 37000, status: 'not_paid' });

    const dues = await (await call(billing, `/patients/${patientId}`, 'desk')).json();
    expect(dues).toMatchObject({ unbilledCents: 0, unpaidCents: 37000 });
    expect((await call(billing, `/patients/${patientId}/quick-bill`, 'desk', 'POST')).status).toBe(409); // nothing new

    await call(invoices, `/${id}/payments`, 'desk', 'POST', { amountCents: 37000, mode: 'upi' });
    expect((await (await call(billing, '/pending', 'desk')).json()).patients).toHaveLength(0);
  });
});
