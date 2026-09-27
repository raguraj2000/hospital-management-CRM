import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createFollowUpRoutes } from '../src/routes/follow-ups.js';
import { createInvoiceRoutes } from '../src/routes/invoices.js';
import { createPharmacyRoutes } from '../src/routes/pharmacy.js';
import { createLabRoutes } from '../src/routes/lab.js';
import { createTempDbPath, setupTestDb, cleanupDb, addBatch } from './helpers.js';

describe('payments: bill per visit, part payments, paid before giving', () => {
  let db: Database.Database;
  let dbPath: string;
  let followUps: ReturnType<typeof createFollowUpRoutes>;
  let invoices: ReturnType<typeof createInvoiceRoutes>;
  let pharmacy: ReturnType<typeof createPharmacyRoutes>;
  let lab: ReturnType<typeof createLabRoutes>;
  let patientId: number;
  let medicineId: number;
  let visitId: number;

  function call(app: any, path: string, token: string, method = 'GET', body?: unknown): Promise<Response> {
    return app.request(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function addUser(name: string, role: string, token: string): number {
    const roleId = (db.prepare(`SELECT id FROM role WHERE name = ?`).get(role) as any).id;
    const id = Number(
      db.prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, 'x', ?)`).run(name, token, roleId)
        .lastInsertRowid,
    );
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, id, expiresAt);
    return id;
  }

  function stock(): number {
    return (db.prepare('SELECT SUM(quantity_remaining) s FROM medicine_batch WHERE medicine_id = ?').get(medicineId) as any).s;
  }

  beforeEach(async () => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    followUps = createFollowUpRoutes(db);
    invoices = createInvoiceRoutes(db);
    pharmacy = createPharmacyRoutes(db);
    lab = createLabRoutes(db);
    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    addUser('Dr. A', 'doctor', 'doc');
    addUser('Pharm', 'pharmacist', 'pharm');
    addUser('Desk', 'front_desk', 'desk');
    addUser('Tech', 'lab_technician', 'tech');
    patientId = Number(db.prepare(`INSERT INTO patient (customer_code, current_name) VALUES ('PT-0001', 'Ravi')`).run().lastInsertRowid);
    medicineId = Number(
      db.prepare(`INSERT INTO medicine (name, base_unit, price_cents, minimum_stock, reorder_point) VALUES ('Paracetamol', 'tablet', 200, 0, 0)`)
        .run().lastInsertRowid,
    );
    addBatch(db, medicineId, { lotNumber: 'B1', expiryDate: '2030-01-01', quantity: 50 });
    visitId = Number(
      db.prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, datetime('now', 'localtime'))`).run(patientId).lastInsertRowid,
    );
    const res = await call(followUps, `/visits/${visitId}/prescription-lines`, 'doc', 'POST', { medicineId, quantityPrescribed: 10 });
    expect(res.status).toBe(201);
  });

  afterEach(() => cleanupDb(db, dbPath));

  async function makeBill(extraLines: unknown[] = []): Promise<number> {
    const draft = await (await call(invoices, `/draft?patientId=${patientId}&visitIds=${visitId}`, 'desk')).json();
    const lines = [...draft.visits[0].lines, ...extraLines];
    const res = await call(invoices, '/', 'desk', 'POST', {
      patientId,
      visitEventIds: [visitId],
      invoiceDate: '2026-09-25',
      doctorFeeCents: 10000,
      lines,
    });
    return (await res.json()).id;
  }

  it('prescribed medicine is waiting at the pharmacy and cannot be given before it is billed and paid', async () => {
    const queue = await (await call(pharmacy, '/prescriptions', 'pharm')).json();
    expect(queue.visits).toHaveLength(1);
    expect(queue.visits[0].lines[0]).toMatchObject({ medicine_name: 'Paracetamol', quantity_prescribed: 10, in_stock: 50 });
    expect(queue.visits[0].cover).toMatchObject({ billed: false, paid: false });

    const notBilled = await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {});
    expect(notBilled.status).toBe(409);
    expect((await notBilled.json()).error).toMatch(/not on a bill/);
    expect(stock()).toBe(50);
  });

  it("the draft bill prices waiting medicines at today's price and links them", async () => {
    const draft = await (await call(invoices, `/draft?patientId=${patientId}&visitIds=${visitId}`, 'desk')).json();
    expect(draft.visits[0].lines[0]).toMatchObject({
      description: 'Paracetamol',
      quantity: 10,
      unitPriceCents: 200,
      lineTotalCents: 2000,
      sourceType: 'prescription_line',
    });
  });

  it('part payments: Not paid -> Part paid -> Paid, then the pharmacist can give', async () => {
    const billId = await makeBill(); // 2000 medicine + 10000 doctor fee = 12000
    let bill = (await (await call(invoices, `/${billId}`, 'desk')).json()).bill;
    expect(bill).toMatchObject({ totalCents: 12000, paidCents: 0, balanceCents: 12000, status: 'not_paid' });

    expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {})).status).toBe(409);

    await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 5000, mode: 'cash' });
    bill = (await (await call(invoices, `/${billId}`, 'desk')).json()).bill;
    expect(bill).toMatchObject({ paidCents: 5000, balanceCents: 7000, status: 'part_paid' });
    expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {})).status).toBe(409); // part paid: not yet

    const tooMuch = await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 9000, mode: 'upi' });
    expect(tooMuch.status).toBe(409);
    await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 7000, mode: 'upi' });
    bill = (await (await call(invoices, `/${billId}`, 'desk')).json()).bill;
    expect(bill.status).toBe('paid');

    const give = await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {});
    expect(give.status).toBe(200);
    expect(stock()).toBe(40);
    expect((await (await call(pharmacy, '/prescriptions', 'pharm')).json()).visits).toHaveLength(0);
    expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {})).status).toBe(409); // nothing left
  });

  it('a payment taken by mistake is cancelled with a reason; a bill with payments cannot be deleted', async () => {
    const billId = await makeBill();
    await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 12000, mode: 'card' });
    const payments = (await (await call(invoices, `/${billId}`, 'desk')).json()).payments;
    expect((await call(invoices, `/${billId}/delete`, 'desk', 'POST')).status).toBe(409);
    expect((await call(invoices, `/payments/${payments[0].id}/cancel`, 'desk', 'POST', { reason: '' })).status).toBe(400);
    expect((await call(invoices, `/payments/${payments[0].id}/cancel`, 'desk', 'POST', { reason: 'Wrong patient' })).status).toBe(200);
    const after = await (await call(invoices, `/${billId}`, 'desk')).json();
    expect(after.bill.status).toBe('not_paid');
    expect(after.payments[0]).toMatchObject({ cancel_reason: 'Wrong patient' });
    expect((await call(invoices, `/${billId}/delete`, 'desk', 'POST')).status).toBe(200);
  });

  it('only a doctor/admin can give before payment, and must say why', async () => {
    expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', { overrideReason: 'Emergency' })).status).toBe(403);
    // A doctor who also works the pharmacy counter.
    db.prepare(`INSERT INTO role_permission (role_name, permission) VALUES ('doctor', 'dispense.create')`).run();
    const { invalidatePermissionCache } = await import('../src/services/permission-service.js');
    invalidatePermissionCache();
    expect((await call(pharmacy, `/visits/${visitId}/give`, 'doc', 'POST', { overrideReason: '' })).status).toBe(400);
    const res = await call(pharmacy, `/visits/${visitId}/give`, 'doc', 'POST', { overrideReason: 'Emergency, will pay tomorrow' });
    expect(res.status).toBe(200);
    expect(stock()).toBe(40);
    const o = db.prepare('SELECT * FROM payment_override').get() as any;
    expect(o).toMatchObject({ target_type: 'visit_medicines', target_id: visitId, reason: 'Emergency, will pay tomorrow' });
  });

  it('lab report is locked until its tests are on a paid bill (or released by a doctor)', async () => {
    const orderId = (await (await call(lab, '/orders', 'doc', 'POST', { patientId, testIds: [2] })).json()).id; // Differential Counts
    const item = db.prepare('SELECT id FROM lab_order_item WHERE lab_order_id = ?').get(orderId) as any;
    const param = (db.prepare('SELECT id FROM lab_test_parameter WHERE lab_test_id = 2 LIMIT 1').get() as any).id;
    await call(lab, `/items/${item.id}/results`, 'tech', 'POST', { values: [{ parameterId: param, value: '50' }] });

    let report = await (await call(lab, `/orders/${orderId}/report`, 'doc')).json();
    expect(report.payment).toMatchObject({ billed: false, paid: false });

    const draft = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
    expect(draft.labItems).toHaveLength(1);
    const billId = await makeBill(draft.labItems);
    report = await (await call(lab, `/orders/${orderId}/report`, 'doc')).json();
    expect(report.payment).toMatchObject({ billed: true, paid: false });
    expect((await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json()).labItems).toHaveLength(0); // billed once only

    await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 12000, mode: 'cash' });
    report = await (await call(lab, `/orders/${orderId}/report`, 'doc')).json();
    expect(report.payment.paid).toBe(true);
  });

  it('a doctor can release a lab report before payment with a reason; the lab tech cannot', async () => {
    const orderId = (await (await call(lab, '/orders', 'doc', 'POST', { patientId, testIds: [2] })).json()).id;
    expect((await call(lab, `/orders/${orderId}/release`, 'tech', 'POST', { reason: 'Urgent' })).status).toBe(403);
    expect((await call(lab, `/orders/${orderId}/release`, 'doc', 'POST', { reason: 'Urgent referral' })).status).toBe(200);
    const report = await (await call(lab, `/orders/${orderId}/report`, 'doc')).json();
    expect(report.payment.override).toMatchObject({ reason: 'Urgent referral', by: 'Dr. A' });
  });

  it('prescriptions from before this update never enter the pharmacy queue or a new bill', async () => {
    const oldVisit = Number(
      db.prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, '2026-09-15 10:00')`).run(patientId).lastInsertRowid,
    );
    db.prepare(
      `INSERT INTO prescription_line (visit_event_id, medicine_id, quantity_prescribed, before_pharmacy_tracking) VALUES (?, ?, 3, 1)`,
    ).run(oldVisit, medicineId);
    const queue = await (await call(pharmacy, '/prescriptions', 'pharm')).json();
    expect(queue.visits.map((v: any) => v.id)).toEqual([visitId]);
    const draft = await (await call(invoices, `/draft?patientId=${patientId}&visitIds=${oldVisit}`, 'desk')).json();
    expect(draft.visits[0].lines).toEqual([]);
  });

  it('doctor can change a prescription until it is paid; after payment it is locked', async () => {
    const line = (db.prepare('SELECT id FROM prescription_line WHERE visit_event_id = ?').get(visitId) as any).id;
    const base = `/visits/${visitId}/prescription-lines/${line}`;
    // Before payment: dosage and quantity can change.
    expect((await call(followUps, base, 'doc', 'PATCH', { dosageInstructions: '1-0-1' })).status).toBe(200);
    expect((await call(followUps, `${base}/quantity`, 'doc', 'PATCH', { quantity: 12 })).status).toBe(200);
    expect((db.prepare('SELECT quantity_prescribed q FROM prescription_line WHERE id = ?').get(line) as any).q).toBe(12);

    const billId = await makeBill();
    // Billed but nothing paid yet: still editable.
    expect((await call(followUps, base, 'doc', 'PATCH', { dosageInstructions: '1-1-1' })).status).toBe(200);
    await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 1000, mode: 'cash' });

    // Any payment locks it: no edit, no quantity change, no delete, no deleting the visit.
    const locked = await call(followUps, base, 'doc', 'PATCH', { dosageInstructions: '0-0-1' });
    expect(locked.status).toBe(409);
    expect((await locked.json()).error).toMatch(/Write a new prescription/);
    expect((await call(followUps, `${base}/quantity`, 'doc', 'PATCH', { quantity: 5 })).status).toBe(409);
    expect((await call(followUps, `${base}/delete`, 'doc', 'POST')).status).toBe(409);
    expect((await call(followUps, `/visits/${visitId}/delete`, 'doc', 'POST')).status).toBe(409);
    const listed = await (await call(followUps, `/?patientId=${patientId}`, 'doc')).json();
    expect(listed.visits[0].prescriptionLines[0].locked).toBe(1);
  });

  it('a medicine already given (emergency, unpaid) is locked too', async () => {
    db.prepare(`INSERT INTO role_permission (role_name, permission) VALUES ('doctor', 'dispense.create')`).run();
    const { invalidatePermissionCache } = await import('../src/services/permission-service.js');
    invalidatePermissionCache();
    await call(pharmacy, `/visits/${visitId}/give`, 'doc', 'POST', { overrideReason: 'Emergency' });
    const line = (db.prepare('SELECT id FROM prescription_line WHERE visit_event_id = ?').get(visitId) as any).id;
    expect((await call(followUps, `/visits/${visitId}/prescription-lines/${line}/delete`, 'doc', 'POST')).status).toBe(409);
    expect(stock()).toBe(40); // not put back on the shelf
  });
  it('a fee changed after the bill was made: paying the full new total makes it Paid', async () => {
    const billId = await makeBill(); // 2000 medicine + 10000 doctor fee
    const saved = await (await call(invoices, `/${billId}`, 'desk')).json();
    const lines = saved.lines.map((l: any) => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceCents: l.unit_price_cents,
      sourceType: l.source_type,
      sourceId: l.source_id,
    }));
    const patch = await call(invoices, `/${billId}`, 'desk', 'PATCH', {
      patientId,
      visitEventIds: [visitId],
      invoiceDate: '2026-09-25',
      doctorFeeCents: 15000,
      lines,
    });
    expect(patch.status).toBe(200);
    const pay = await call(invoices, `/${billId}/payments`, 'desk', 'POST', { amountCents: 17000, mode: 'cash' });
    expect(pay.status).toBe(201);
    expect((await pay.json()).bill).toMatchObject({ totalCents: 17000, balanceCents: 0, status: 'paid' });
    expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {})).status).toBe(200);
  });

  it('a medicine can be on one bill only, and a billed visit leaves the new-bill draft', async () => {
    const billId = await makeBill();
    const draft = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
    expect(draft.visits).toHaveLength(0);
    expect(draft.billedVisits).toEqual([{ visitId, invoiceId: billId }]);

    const line = (db.prepare('SELECT id FROM prescription_line WHERE visit_event_id = ?').get(visitId) as any).id;
    const dup = await call(invoices, '/', 'desk', 'POST', {
      patientId,
      visitEventIds: [visitId],
      invoiceDate: '2026-09-25',
      lines: [{ description: 'Paracetamol', quantity: 10, unitPriceCents: 200, sourceType: 'prescription_line', sourceId: line }],
    });
    expect(dup.status).toBe(409);
    expect((await dup.json()).error).toMatch(/already on bill INV-/);
  });

  describe('Create invoice combines unpaid bills into one', () => {
    let secondVisit: number;
    beforeEach(async () => {
      secondVisit = Number(
        db.prepare(`INSERT INTO visit_event (patient_id, visit_date) VALUES (?, datetime('now', 'localtime'))`).run(patientId).lastInsertRowid,
      );
      await call(followUps, `/visits/${secondVisit}/prescription-lines`, 'doc', 'POST', { medicineId, quantityPrescribed: 5 });
    });

    async function combine(oldBillId: number) {
      const draft = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
      const old = draft.unpaidBills.mergeable.find((b: any) => b.id === oldBillId);
      return call(invoices, '/', 'desk', 'POST', {
        patientId,
        visitEventIds: draft.visits.map((v: any) => v.id),
        invoiceDate: '2026-09-26',
        doctorFeeCents: (old?.doctorFeeCents ?? 0) + 5000,
        lines: [...(old?.lines ?? []), ...draft.visits.flatMap((v: any) => v.lines)],
        mergeInvoiceIds: [oldBillId],
      });
    }

    it('an unpaid bill with no payment is folded in; paying the one bill unlocks both visits', async () => {
      const oldBillId = await makeBill(); // visit 1: 2000 + 10000 fee
      const draft = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
      expect(draft.visits.map((v: any) => v.id)).toEqual([secondVisit]);
      expect(draft.unpaidBills.mergeable).toHaveLength(1);
      expect(draft.unpaidBills.mergeable[0]).toMatchObject({ id: oldBillId, totalCents: 12000, doctorFeeCents: 10000, visitIds: [visitId] });
      expect(draft.unpaidBills.mergeable[0].lines[0]).toMatchObject({ sourceType: 'prescription_line', unitPriceCents: 200 });

      const res = await combine(oldBillId);
      expect(res.status).toBe(201);
      const { id } = await res.json();
      expect((db.prepare('SELECT deleted_at FROM invoice WHERE id = ?').get(oldBillId) as any).deleted_at).not.toBeNull();
      expect(db.prepare(`SELECT 1 FROM audit_log WHERE entity_type = 'invoice' AND entity_id = ? AND action = 'merge'`).get(oldBillId)).toBeTruthy();

      const bill = await (await call(invoices, `/${id}`, 'desk')).json();
      expect(bill.visitIds.sort()).toEqual([visitId, secondVisit].sort());
      expect(bill.bill.totalCents).toBe(2000 + 1000 + 15000);
      const list = (await (await call(invoices, `?patientId=${patientId}`, 'desk')).json()).invoices;
      expect(list.map((i: any) => i.id)).toEqual([id]);

      await call(invoices, `/${id}/payments`, 'desk', 'POST', { amountCents: 18000, mode: 'cash' });
      expect((await call(pharmacy, `/visits/${visitId}/give`, 'pharm', 'POST', {})).status).toBe(200);
      expect((await call(pharmacy, `/visits/${secondVisit}/give`, 'pharm', 'POST', {})).status).toBe(200);
      // Everything is paid: nothing shows in Create invoice any more.
      const after = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
      expect(after.visits).toHaveLength(0);
      expect(after.unpaidBills).toEqual({ mergeable: [], partPaid: [] });
    });

    it('a part-paid bill is not folded in', async () => {
      const oldBillId = await makeBill();
      await call(invoices, `/${oldBillId}/payments`, 'desk', 'POST', { amountCents: 1000, mode: 'cash' });
      const draft = await (await call(invoices, `/draft?patientId=${patientId}`, 'desk')).json();
      expect(draft.unpaidBills.mergeable).toHaveLength(0);
      expect(draft.unpaidBills.partPaid).toEqual([{ id: oldBillId, invoiceNumber: expect.any(String), invoiceDate: '2026-09-25', balanceCents: 11000 }]);

      const res = await combine(oldBillId);
      expect(res.status).toBe(409);
      expect((db.prepare('SELECT deleted_at FROM invoice WHERE id = ?').get(oldBillId) as any).deleted_at).toBeNull();
      expect((db.prepare('SELECT COUNT(*) c FROM invoice').get() as any).c).toBe(1);
    });

    it("another patient's bill cannot be folded in", async () => {
      const otherPatient = Number(db.prepare(`INSERT INTO patient (customer_code, current_name) VALUES ('PT-0002', 'Mala')`).run().lastInsertRowid);
      const other = await call(invoices, '/', 'desk', 'POST', {
        patientId: otherPatient,
        invoiceDate: '2026-09-25',
        lines: [{ description: 'Dressing', quantity: 1, unitPriceCents: 500 }],
      });
      const otherId = (await other.json()).id;
      const res = await call(invoices, '/', 'desk', 'POST', {
        patientId,
        invoiceDate: '2026-09-26',
        lines: [],
        mergeInvoiceIds: [otherId],
      });
      expect(res.status).toBe(404);
      expect((db.prepare('SELECT deleted_at FROM invoice WHERE id = ?').get(otherId) as any).deleted_at).toBeNull();
    });
  });
});
