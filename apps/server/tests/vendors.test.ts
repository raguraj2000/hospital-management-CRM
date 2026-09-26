import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createVendorRoutes } from '../src/routes/vendors.js';
import { createLabRoutes } from '../src/routes/lab.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

describe('vendors: purchase bills, stock in, paying vendors', () => {
  let db: Database.Database;
  let dbPath: string;
  let vendors: ReturnType<typeof createVendorRoutes>;
  let paraId: number;
  let syrupId: number;

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

  const stock = (medicineId: number) =>
    (db.prepare('SELECT COALESCE(SUM(quantity_remaining), 0) s FROM medicine_batch WHERE medicine_id = ? AND is_active = 1').get(medicineId) as any).s;

  function daysFromToday(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function newVendor(creditDays = 30): Promise<number> {
    const res = await call(vendors, '/', 'mgr', 'POST', { name: 'Sri Pharma Distributors', phone: '9876543210', creditDays });
    return (await res.json()).id;
  }

  async function newBill(vendorId: number, billDate = daysFromToday(0)): Promise<number> {
    const res = await call(vendors, '/purchases', 'pharm', 'POST', {
      supplierId: vendorId,
      vendorBillNumber: 'SPD/1234',
      billDate,
      lines: [
        { medicineId: paraId, lotNumber: 'P-01', expiryDate: '2028-01-31', quantity: 100, unitCostCents: 150, newSellingPriceCents: 250 },
        { medicineId: syrupId, lotNumber: 'S-09', expiryDate: '2027-06-30', quantity: 20, unitCostCents: 4000 },
      ],
    });
    expect(res.status).toBe(201);
    return (await res.json()).id;
  }

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    vendors = createVendorRoutes(db);
    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    addUser('Mgr', 'manager', 'mgr');
    addUser('Pharm', 'pharmacist', 'pharm');
    addUser('Desk', 'front_desk', 'desk');
    const addMed = (name: string, price: number) =>
      Number(db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, minimum_stock, reorder_point) VALUES (?, 'tablet', ?, 0, 0)`).run(name, price).lastInsertRowid);
    paraId = addMed('Paracetamol', 200);
    syrupId = addMed('Cough Syrup', 6000);
  });

  afterEach(() => cleanupDb(db, dbPath));

  it('manager adds vendors; pharmacist can see them but not add; front desk sees nothing', async () => {
    await newVendor();
    expect((await call(vendors, '/', 'pharm', 'POST', { name: 'X' })).status).toBe(403);
    expect((await (await call(vendors, '/', 'pharm')).json()).vendors).toHaveLength(1);
    expect((await call(vendors, '/', 'desk')).status).toBe(403);
    expect((await call(vendors, '/', 'mgr', 'POST', { name: 'sri pharma distributors' })).status).toBe(409); // duplicate
  });

  it('one vendor bill adds every line to stock, sets the due date from credit days, and can update the selling price', async () => {
    const vendorId = await newVendor(30);
    const billId = await newBill(vendorId);
    expect(stock(paraId)).toBe(100);
    expect(stock(syrupId)).toBe(20);
    expect((db.prepare('SELECT supplier_id FROM medicine_batch WHERE medicine_id = ?').get(paraId) as any).supplier_id).toBe(vendorId);
    expect((db.prepare('SELECT price_cents FROM medicine WHERE id = ?').get(paraId) as any).price_cents).toBe(250);
    expect((db.prepare('SELECT price_cents FROM medicine WHERE id = ?').get(syrupId) as any).price_cents).toBe(6000); // not asked

    const detail = await (await call(vendors, `/purchases/${billId}`, 'pharm')).json();
    expect(detail.bill).toMatchObject({ vendor_bill_number: 'SPD/1234', total_cents: 95000, due_date: daysFromToday(30) });
    expect(detail.status).toMatchObject({ status: 'pending', balanceCents: 95000, overdue: false });
  });

  it('vendor payments: part paid -> paid; never more than the balance; pharmacist cannot pay', async () => {
    const billId = await newBill(await newVendor());
    expect((await call(vendors, `/purchases/${billId}/payments`, 'pharm', 'POST', { amountCents: 100, mode: 'cash' })).status).toBe(403);
    await call(vendors, `/purchases/${billId}/payments`, 'mgr', 'POST', { amountCents: 50000, mode: 'cheque', reference: 'CHQ 000123' });
    let s = (await (await call(vendors, `/purchases/${billId}`, 'mgr')).json()).status;
    expect(s).toMatchObject({ status: 'part_paid', balanceCents: 45000 });
    expect((await call(vendors, `/purchases/${billId}/payments`, 'mgr', 'POST', { amountCents: 50000, mode: 'upi' })).status).toBe(409);
    await call(vendors, `/purchases/${billId}/payments`, 'mgr', 'POST', { amountCents: 45000, mode: 'bank' });
    s = (await (await call(vendors, `/purchases/${billId}`, 'mgr')).json()).status;
    expect(s.status).toBe('paid');
    const list = (await (await call(vendors, '/', 'mgr')).json()).vendors;
    expect(list[0].pending_cents).toBe(0);
  });

  it('an unpaid bill past its due date shows as overdue', async () => {
    const vendorId = await newVendor(10);
    await newBill(vendorId, daysFromToday(-20)); // due 10 days ago
    const summary = await (await call(vendors, '/summary', 'mgr')).json();
    expect(summary).toMatchObject({ overdueBills: 1, overdueCents: 95000 });
    expect((await (await call(vendors, '/', 'mgr')).json()).vendors[0].overdue_cents).toBe(95000);
  });

  it('a mistaken bill is cancelled only if nothing is paid and none of its stock was used', async () => {
    const vendorId = await newVendor();
    const billId = await newBill(vendorId);
    await call(vendors, `/purchases/${billId}/payments`, 'mgr', 'POST', { amountCents: 1000, mode: 'cash' });
    expect((await call(vendors, `/purchases/${billId}/cancel`, 'mgr', 'POST', { reason: 'Wrong vendor' })).status).toBe(409);
    const payment = (await (await call(vendors, `/purchases/${billId}`, 'mgr')).json()).payments[0];
    await call(vendors, `/purchases/payments/${payment.id}/cancel`, 'mgr', 'POST', { reason: 'Entered twice' });
    expect((await call(vendors, `/purchases/${billId}/cancel`, 'mgr', 'POST', { reason: 'Wrong vendor' })).status).toBe(200);
    expect(stock(paraId)).toBe(0);
    expect(stock(syrupId)).toBe(0);

    const second = await newBill(vendorId);
    db.prepare('UPDATE medicine_batch SET quantity_remaining = quantity_remaining - 1 WHERE is_active = 1 AND medicine_id = ?').run(paraId);
    const res = await call(vendors, `/purchases/${second}/cancel`, 'mgr', 'POST', { reason: 'Wrong' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already been sold or given/);
  });
});

describe('lab report: new page per test and bill number', () => {
  it('saves "start on a new page" for a test', async () => {
    const dbPath = createTempDbPath();
    const db = setupTestDb(dbPath);
    const lab = createLabRoutes(db);
    db.prepare(`INSERT INTO role (name) VALUES ('manager')`).run();
    const roleId = (db.prepare(`SELECT id FROM role WHERE name = 'manager'`).get() as any).id;
    const uid = db.prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('M', 'm', 'x', ?)`).run(roleId).lastInsertRowid;
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES ('m', ?, ?)`).run(uid, new Date(Date.now() + 3600_000).toISOString());
    const test = (await (await lab.request('/tests', { headers: { Authorization: 'Bearer m' } })).json()).tests.find(
      (t: any) => t.name === 'Urine Routine Analysis',
    );
    const res = await lab.request(`/tests/${test.id}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer m', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: test.name,
        department: test.department,
        priceCents: 5000,
        printNewPage: true,
        parameters: test.parameters.map((p: any) => ({ id: p.id, name: p.name })),
      }),
    });
    expect(res.status).toBe(200);
    expect((db.prepare('SELECT print_new_page FROM lab_test WHERE id = ?').get(test.id) as any).print_new_page).toBe(1);
    cleanupDb(db, dbPath);
  });
});
