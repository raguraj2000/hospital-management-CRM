// One checkout per visit: consultation + lab (OP bill) and medicines (pharmacy sale) collected in ONE call.
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLog, billPayment, opBill, opVisit, pharmacySale, prescriptionItem } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json();
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const FRONT_DESK_OLD = ['dashboard.view', 'patient.view', 'patient.create', 'patient.edit', 'billing.receive'];
const PHARMACIST_OLD = ['dashboard.view', 'patient.view', 'pharmacy.sell', 'inventory.view', 'inventory.manage', 'vendor.manage'];

/** Fee ₹200; CBC ₹300, Blood sugar ₹80; Paracetamol ₹2 (5 expiring soon + 20 later), Cough syrup ₹90 (3). */
async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const pharm = await t.as('pharm');
  const desk = await t.as('desk');
  const lab = await t.as('labtech');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
  const { id: sugar } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood sugar', pricePaise: 8000 } }));
  const med = async (name: string, pricePaise: number, batches: [string, number, number][]) => {
    const { id } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name, form: 'tablet', pricePaise } }));
    for (const [batchNo, days, quantity] of batches) expect((await pharm(`/api/b/main/medicines/${id}/batches`, { method: 'POST', body: { batchNo, expiryDate: inDays(days), quantity } })).status).toBe(201);
    return id as number;
  };
  const para = await med('Paracetamol', 200, [['LATE', 300, 20], ['SOON', 30, 5]]);
  const syrup = await med('Cough syrup', 9000, [['S1', 100, 3]]);
  return { owner, doc, pharm, desk, lab, cbc, sugar, para, syrup };
}
type World = Awaited<ReturnType<typeof world>>;

/** A visit today; with 2 lab tests (₹380) and 2 medicines (10 Paracetamol ₹20 + 1 syrup ₹90) unless switched off. */
async function visit(w: World, name: string, opts: { labs?: boolean; rx?: boolean; sent?: boolean } = {}) {
  const { patient } = await json(w.doc('/api/b/main/patients', { method: 'POST', body: { name } }));
  const { visit: v } = await json(w.doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  if (opts.labs !== false) expect((await w.doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [w.cbc, w.sugar] } })).status).toBe(201);
  const items: number[] = [];
  if (opts.rx !== false) {
    items.push((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 5 } }))).id);
    items.push((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.syrup, dose: 'SOS', days: 3, quantity: 1 } }))).id);
  }
  // Sent to the counter by the doctor: only then does a checkout complete the visit.
  if (opts.sent) await setStatus(v.id, 'at_counter');
  return { id: v.id as number, opNo: v.opNo as string, patientId: patient.id as number, items };
}
const checkout = (caller: Caller, visitId: number, body: unknown, branch = 'main') => caller(`/api/b/${branch}/visits/${visitId}/checkout`, { method: 'POST', body });
const statusOf = async (visitId: number) => (await t.db.select({ status: opVisit.status }).from(opVisit).where(eq(opVisit.id, visitId)))[0]!.status as string;
const setStatus = (visitId: number, status: string) => t.db.update(opVisit).set({ status: status as 'waiting' }).where(eq(opVisit.id, visitId));
const batchesOf = async (caller: Caller, id: number) => (await json(caller(`/api/b/main/medicines/${id}/batches`))).batches.map((b: any) => [b.batchNo, b.quantity]);
const queueOf = async (caller: Caller, branch = 'main') => (await json(caller(`/api/b/${branch}/checkout-queue`))).queue as any[];
const toBillOf = async (caller: Caller, branch = 'main') => (await json(caller(`/api/b/${branch}/billing/to-bill`))).visits as any[];
async function setRole(owner: Caller, key: string, permissions: string[]) {
  const { roles } = await json(owner('/api/org/roles'));
  expect((await owner(`/api/org/roles/${roles.find((r: any) => r.key === key).id}/permissions`, { method: 'PUT', body: { permissions } })).status).toBe(200);
}
/** Nothing was written for this visit: no bill, no payment, no sale, stock and prescription untouched. */
async function expectUntouched(w: World, v: { id: number }, status = 'waiting') {
  expect(await t.db.select().from(opBill)).toEqual([]);
  expect(await t.db.select().from(billPayment)).toEqual([]);
  expect(await t.db.select().from(pharmacySale)).toEqual([]);
  expect(await batchesOf(w.pharm, w.para)).toEqual([['SOON', 5], ['LATE', 20]]);
  expect((await t.db.select({ status: prescriptionItem.status }).from(prescriptionItem)).map((i) => i.status)).toEqual(['pending', 'pending']);
  expect(await statusOf(v.id)).toBe(status);
}

describe('checkout: one payment for the whole visit', () => {
  it.each(['pharm', 'desk'])('%s (default role) collects consultation + 2 lab tests + medicines with ONE call', async (who) => {
    const w = await world();
    const me = await t.as(who);
    const v = await visit(w, 'Ravi Kumar', { sent: true });
    await w.doc(`/api/b/main/visits/${v.id}`, { method: 'PATCH', body: { pharmacyNote: 'Give the generic brand' } });

    // The counter sees the whole amount before taking it.
    const before = await json(me(`/api/b/main/visits/${v.id}/checkout`));
    expect(before).toMatchObject({ visitId: v.id, opNo: v.opNo, patientName: 'Ravi Kumar', totals: { billDuePaise: 58000, medicinesPaise: 11000, grandTotalPaise: 69000 } });
    expect(before.bill).toMatchObject({ billId: null, editable: true, consultationFeePaise: 20000, discountPaise: 0, paidPaise: 0, duePaise: 58000, earlierBills: [] });
    expect(before.bill.labLines).toEqual([{ description: 'CBC', amountPaise: 30000, billed: false }, { description: 'Blood sugar', amountPaise: 8000, billed: false }]);
    expect(before.medicines.pharmacyNote).toBe('Give the generic brand');
    expect(before.medicines.items.map((i: any) => [i.medicineName, i.quantity, i.pricePaise, i.stock, i.nextBatchNo, i.nextExpiry])).toEqual([
      ['Paracetamol', 10, 200, 25, 'SOON', inDays(30)],
      ['Cough syrup', 1, 9000, 3, 'S1', inDays(100)],
    ]);
    expect((await queueOf(me)).map((q) => [q.visitId, q.medicinesWaiting, q.medicinesPaise, q.toBillPaise, q.balancePaise, q.grandTotalPaise, q.summary])).toEqual([
      [v.id, 2, 11000, 58000, 0, 69000, 'Medicines waiting 2 · Consultation + lab due ₹580 · Total ₹690'],
    ]);

    const res = await checkout(me, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 });
    expect(res.status).toBe(201);
    const done = await res.json();
    expect(done.bill).toMatchObject({ billNo: expect.stringMatching(/^BL-\d{6}-001$/), consultationFeePaise: 20000, totalPaise: 58000, paidPaise: 58000, balancePaise: 0, status: 'paid' });
    expect(done.bill.payments).toMatchObject([{ amountPaise: 58000, mode: 'cash', receivedByName: who }]);
    expect(done.paidBills).toEqual([{ id: done.bill.id, billNo: done.bill.billNo, amountPaise: 58000 }]);
    expect(done.sale).toEqual({ id: expect.any(Number), saleNo: expect.stringMatching(/^PH-\d{6}-001$/), totalPaise: 11000 });
    expect(done.totals).toEqual({ receivedPaise: 69000, billPaidPaise: 58000, medicinesPaise: 11000, balancePaise: 0 });
    expect(done.visitStatus).toBe('completed');
    expect(await statusOf(v.id)).toBe('completed');

    // Stock went out earliest expiry first; the sale is a normal pharmacy sale of the visit.
    expect(await batchesOf(w.pharm, w.para)).toEqual([['SOON', 0], ['LATE', 15]]);
    expect(await batchesOf(w.pharm, w.syrup)).toEqual([['S1', 2]]);
    expect((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`))).items.map((i: any) => i.status)).toEqual(['dispensed', 'dispensed']);
    expect((await t.db.select().from(pharmacySale))[0]).toMatchObject({ visitId: v.id, patientId: v.patientId, totalPaise: 11000, paymentMode: 'cash' });

    // Paid in full: the lab report prints; the day's collection has both parts; nothing is left to collect.
    expect((await w.lab(`/api/b/main/visits/${v.id}/lab-report?print=1`)).status).toBe(200);
    expect((await json(w.owner('/api/b/main/dashboard'))).collectionToday).toEqual({ cashPaise: 69000, upiPaise: 0, cardPaise: 0, totalPaise: 69000 });
    expect(await json(me('/api/b/main/billing/collection'))).toMatchObject({ bills: { cash: 58000 }, pharmacy: { cash: 11000 }, totalPaise: 69000 });
    expect(await queueOf(me)).toEqual([]);
    expect(await toBillOf(me)).toEqual([]);
    expect((await json(me('/api/b/main/pharmacy/queue'))).queue).toEqual([]);

    // Audit entries are those of the underlying actions.
    const audit = (await t.db.select().from(auditLog)).filter((a) => ['op_bill', 'pharmacy_sale', 'op_visit'].includes(a.entity)).map((a) => `${a.entity}:${a.action}`);
    expect(audit).toEqual(expect.arrayContaining(['op_bill:create', 'pharmacy_sale:dispense', 'op_bill:payment', 'op_visit:update']));
  });

  it('consultation only: no lab, no medicines', async () => {
    const w = await world();
    const v = await visit(w, 'Asha Devi', { labs: false, rx: false, sent: true });
    expect((await json(w.desk(`/api/b/main/visits/${v.id}/checkout`))).totals).toEqual({ billDuePaise: 20000, medicinesPaise: 0, grandTotalPaise: 20000 });
    const done = await json(checkout(w.desk, v.id, { paymentMode: 'upi', amountPaise: 20000 }));
    expect(done).toMatchObject({ bill: { totalPaise: 20000, status: 'paid', lines: [] }, sale: null, visitStatus: 'completed', totals: { receivedPaise: 20000, medicinesPaise: 0, balancePaise: 0 } });
    expect(await t.db.select().from(pharmacySale)).toEqual([]);
    expect(await queueOf(w.desk)).toEqual([]);
  });

  it('medicines only, when the bill is already paid', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar', { labs: false, rx: false, sent: true });
    const { bill } = await json(w.desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }));
    await w.desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 20000, mode: 'cash' } });
    expect(await queueOf(w.pharm)).toEqual([]); // settled so far
    const item = await json(w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 5 } }));

    expect((await queueOf(w.pharm)).map((q) => [q.visitId, q.medicinesWaiting, q.toBillPaise, q.balancePaise, q.grandTotalPaise])).toEqual([[v.id, 1, 0, 0, 2000]]);
    const before = await json(w.pharm(`/api/b/main/visits/${v.id}/checkout`));
    expect(before.bill).toMatchObject({ editable: false, duePaise: 0, paidPaise: 20000, labLines: [] });
    expect(before.totals).toEqual({ billDuePaise: 0, medicinesPaise: 2000, grandTotalPaise: 2000 });

    // The paid bill cannot be edited through the checkout either.
    expect((await checkout(w.pharm, v.id, { itemIds: [item.id], paymentMode: 'cash', amountPaise: 2000, discountPaise: 100 })).status).toBe(409);
    const done = await json(checkout(w.pharm, v.id, { itemIds: [item.id], paymentMode: 'card', amountPaise: 2000 }));
    expect(done).toMatchObject({ sale: { totalPaise: 2000 }, paidBills: [], bill: { id: bill.id, paidPaise: 20000, status: 'paid' }, visitStatus: 'completed' });
    expect(await t.db.select().from(opBill)).toHaveLength(1);
    expect(await t.db.select().from(billPayment)).toHaveLength(1);
  });

  it('the fee can be reduced; a 100% discount makes a zero bill that counts as paid, with no money taken', async () => {
    const w = await world();
    const reduced = await visit(w, 'Ravi Kumar', { rx: false });
    const a = await json(checkout(w.pharm, reduced.id, { consultationFeePaise: 5000, otherChargesPaise: 1000, otherChargesLabel: 'Dressing', paymentMode: 'cash', amountPaise: 44000 }));
    expect(a.bill).toMatchObject({ consultationFeePaise: 5000, otherChargesPaise: 1000, otherChargesLabel: 'Dressing', totalPaise: 44000, status: 'paid' });

    const free = await visit(w, 'Meena', { rx: false, sent: true });
    // More than the bill is a field error and creates nothing.
    const over = await checkout(w.pharm, free.id, { discountPaise: 58001, paymentMode: 'cash', amountPaise: 0 });
    expect(over.status).toBe(400);
    expect((await over.json()).fields).toHaveProperty('discountPaise');
    expect(await t.db.select().from(opBill)).toHaveLength(1);

    const b = await json(checkout(w.pharm, free.id, { discountPaise: 58000, paymentMode: 'cash', amountPaise: 0 }));
    expect(b).toMatchObject({ bill: { discountPaise: 58000, totalPaise: 0, paidPaise: 0, status: 'paid', payments: [] }, paidBills: [], visitStatus: 'completed', totals: { receivedPaise: 0, balancePaise: 0 } });
    expect(await t.db.select().from(billPayment)).toHaveLength(1); // only the first visit's
    expect((await w.lab(`/api/b/main/visits/${free.id}/lab-report?print=1`)).status).toBe(200);
    expect(await queueOf(w.pharm)).toEqual([]);
    // The fee may also go to zero on its own.
    const zeroFee = await visit(w, 'Kavi', { labs: false, rx: false });
    expect((await json(checkout(w.desk, zeroFee.id, { consultationFeePaise: 0, paymentMode: 'cash', amountPaise: 0 }))).bill).toMatchObject({ consultationFeePaise: 0, totalPaise: 0, status: 'paid' });
  });

  it('pay later: medicines are paid in full, the rest stays as balance due; a wrong amount changes nothing', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar', { sent: true });
    for (const amountPaise of [10999, 69001]) {
      const res = await checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: 'validation', fields: { amountPaise: [expect.any(String)] } });
      await expectUntouched(w, v, 'at_counter');
    }

    const done = await json(checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'upi', amountPaise: 30000 }));
    expect(done.sale.totalPaise).toBe(11000);
    expect(done.bill).toMatchObject({ totalPaise: 58000, paidPaise: 19000, balancePaise: 39000, status: 'part_paid' });
    expect(done.totals).toEqual({ receivedPaise: 30000, billPaidPaise: 19000, medicinesPaise: 11000, balancePaise: 39000 });
    expect(done.visitStatus).toBe('completed'); // the balance is tracked on the bill, not by keeping the visit open
    expect(done.labReportReady).toBe(false);
    expect((await w.lab(`/api/b/main/visits/${v.id}/lab-report?print=1`)).status).toBe(402); // until paid, or released by an admin
    expect((await json(w.owner('/api/b/main/dashboard'))).collectionToday).toMatchObject({ upiPaise: 30000, totalPaise: 30000 });

    // It stays on the counter's list until settled; the part-paid bill can no longer be edited.
    expect((await queueOf(w.desk)).map((q) => [q.visitId, q.status, q.medicinesWaiting, q.toBillPaise, q.balancePaise, q.summary])).toEqual([[v.id, 'completed', 0, 0, 39000, 'Balance due ₹390 · Total ₹390']]);
    expect(await toBillOf(w.desk)).toEqual([]); // billed; the balance is under "Bills with balance due"
    expect((await checkout(w.desk, v.id, { discountPaise: 39000, paymentMode: 'cash', amountPaise: 0 })).status).toBe(409);
    expect((await checkout(w.desk, v.id, { paymentMode: 'cash', amountPaise: 39001 })).status).toBe(400);
    const rest = await json(checkout(w.desk, v.id, { paymentMode: 'cash', amountPaise: 39000 }));
    expect(rest).toMatchObject({ bill: { status: 'paid', balancePaise: 0 }, sale: null, totals: { balancePaise: 0 } });
    expect(await queueOf(w.desk)).toEqual([]);
    expect((await w.lab(`/api/b/main/visits/${v.id}/lab-report?print=1`)).status).toBe(200);
  });

  it('a lab test ordered after the bill was paid goes on a new bill, collected with the old balance', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar', { labs: false, rx: false });
    await checkout(w.desk, v.id, { paymentMode: 'cash', amountPaise: 5000 }); // ₹150 of the fee stays due
    await w.doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [w.sugar] } });
    const before = await json(w.desk(`/api/b/main/visits/${v.id}/checkout`));
    expect(before.bill).toMatchObject({ billId: null, editable: true, consultationFeePaise: 0, duePaise: 23000, earlierBills: [{ balancePaise: 15000 }] });
    expect((await toBillOf(w.desk)).map((x) => [x.visitId, x.hasBill, x.unbilledLabCount, x.unbilledLabPaise])).toEqual([[v.id, true, 1, 8000]]);
    const done = await json(checkout(w.desk, v.id, { paymentMode: 'cash', amountPaise: 23000 }));
    expect(done.paidBills.map((p: any) => p.amountPaise)).toEqual([15000, 8000]); // oldest bill first
    expect(done.bill).toMatchObject({ consultationFeePaise: 0, totalPaise: 8000, status: 'paid' });
    expect(done.totals.balancePaise).toBe(0);
  });

  it('short stock on one ticked medicine changes nothing at all', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar');
    await t.db.update(prescriptionItem).set({ quantity: 30 }).where(eq(prescriptionItem.id, v.items[0]!)); // 25 in stock
    const res = await checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 58000 + 6000 + 9000 });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'out_of_stock', error: expect.stringContaining('Paracetamol (need 30, have 25)') });
    await expectUntouched(w, v);
    expect((await queueOf(w.pharm)).map((q) => q.visitId)).toEqual([v.id]);
  });

  it('unticked medicines become declined', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar', { labs: false, sent: true });
    const done = await json(checkout(w.desk, v.id, { itemIds: [v.items[0]], paymentMode: 'cash', amountPaise: 22000 }));
    expect(done).toMatchObject({ sale: { totalPaise: 2000 }, visitStatus: 'completed' });
    expect((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`))).items.map((i: any) => [i.medicineName, i.status])).toEqual([['Paracetamol', 'dispensed'], ['Cough syrup', 'declined']]);
    expect(await batchesOf(w.pharm, w.syrup)).toEqual([['S1', 3]]);
    // A line that is no longer pending cannot be sold again.
    expect((await checkout(w.desk, v.id, { itemIds: [v.items[0]], paymentMode: 'cash', amountPaise: 2000 })).status).toBe(409);
  });
});

describe('checkout: permissions', () => {
  it('only pharmacy.sell: it is the dispense of today; the bill part is refused and hidden', async () => {
    const w = await world();
    await setRole(w.owner, 'pharmacist', PHARMACIST_OLD);
    const v = await visit(w, 'Ravi Kumar');

    const seen = await json(w.pharm(`/api/b/main/visits/${v.id}/checkout`));
    expect(seen.bill).toBeNull();
    expect(seen.medicines.items).toHaveLength(2);
    expect(seen.totals).toEqual({ billDuePaise: 0, medicinesPaise: 11000, grandTotalPaise: 11000 });
    expect((await queueOf(w.pharm)).map((q) => [q.visitId, q.medicinesWaiting, q.toBillPaise, q.balancePaise, q.grandTotalPaise])).toEqual([[v.id, 2, null, null, 11000]]);
    expect((await w.pharm('/api/b/main/billing/to-bill')).status).toBe(403);

    for (const edit of [{ consultationFeePaise: 0 }, { discountPaise: 100 }, { otherChargesPaise: 1 }, { otherChargesLabel: 'x' }]) {
      expect((await checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 11000, ...edit })).status).toBe(403);
    }
    expect((await checkout(w.pharm, v.id, { itemIds: [], paymentMode: 'cash', amountPaise: 0 })).status).toBe(400); // nothing it may do
    expect((await checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 })).status).toBe(400); // cannot take the bill's money
    await expectUntouched(w, v);

    const done = await json(checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 11000 }));
    expect(done).toMatchObject({ bill: null, paidBills: [], sale: { totalPaise: 11000 }, totals: { balancePaise: null }, visitStatus: 'waiting' }); // not billed yet: front desk still has to
    expect(await t.db.select().from(opBill)).toEqual([]);
    expect(await queueOf(w.pharm)).toEqual([]);
    expect((await queueOf(w.desk)).map((q) => [q.visitId, q.toBillPaise])).toEqual([[v.id, 58000]]);
    // The printed bill shows this caller the medicines only... and the bills as on the visit page (patient.view).
    expect((await json(w.pharm(`/api/b/main/visits/${v.id}/combined-bill`))).sales).toHaveLength(1);
  });

  it('only billing.receive: it is create bill + payment of today; it cannot dispense and sees no medicines', async () => {
    const w = await world();
    await setRole(w.owner, 'front_desk', FRONT_DESK_OLD);
    const v = await visit(w, 'Ravi Kumar');

    const seen = await json(w.desk(`/api/b/main/visits/${v.id}/checkout`));
    expect(seen.medicines).toBeNull();
    expect(seen.totals).toEqual({ billDuePaise: 58000, medicinesPaise: 0, grandTotalPaise: 58000 });
    expect((await queueOf(w.desk)).map((q) => [q.medicinesWaiting, q.medicinesPaise, q.toBillPaise, q.grandTotalPaise])).toEqual([[null, null, 58000, 58000]]);

    expect((await checkout(w.desk, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 })).status).toBe(403);
    await expectUntouched(w, v);
    const done = await json(checkout(w.desk, v.id, { itemIds: [], paymentMode: 'cash', amountPaise: 58000 }));
    expect(done).toMatchObject({ bill: { totalPaise: 58000, status: 'paid' }, sale: null, visitStatus: 'waiting' }); // medicines still to be given
    expect((await t.db.select({ status: prescriptionItem.status }).from(prescriptionItem)).map((i) => i.status)).toEqual(['pending', 'pending']); // not declined
    expect(await queueOf(w.desk)).toEqual([]);
    expect((await queueOf(w.pharm)).map((q) => [q.visitId, q.medicinesWaiting])).toEqual([[v.id, 2]]);
    const print = await json(w.desk(`/api/b/main/visits/${v.id}/combined-bill`));
    expect(print.sales).toBeNull();
    expect(print.bills).toHaveLength(1);
  });

  it('neither permission: every checkout route is 403 (the combined bill follows patient.view)', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar');
    expect((await w.doc(`/api/b/main/visits/${v.id}/checkout`)).status).toBe(403);
    expect((await checkout(w.doc, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 })).status).toBe(403);
    expect((await w.doc('/api/b/main/checkout-queue')).status).toBe(403);
    await setRole(w.owner, 'lab_technician', ['dashboard.view', 'lab.view']);
    expect((await w.lab(`/api/b/main/visits/${v.id}/combined-bill`)).status).toBe(403);
    await expectUntouched(w, v);
  });
});

describe('checkout: nothing owed may disappear', () => {
  /** A visit on another day, straight into the table (the API only registers today's). */
  async function visitOn(w: World, name: string, daysAgo: number, seq: number) {
    const { patient } = await json(w.doc('/api/b/main/patients', { method: 'POST', body: { name } }));
    const [v] = await t.db.insert(opVisit).values({ branchId: t.main.id, patientId: patient.id, opNo: `OP-OLD${daysAgo}-${String(seq).padStart(3, '0')}`, visitDate: inDays(-daysAgo) }).returning();
    return v!;
  }

  it('earlier days stay listed until settled, up to the look-back; sent-by-doctor visits come first', async () => {
    const w = await world();
    const tooOld = await visitOn(w, 'Too Old', 31, 1);
    const edge = await visitOn(w, 'Edge', 30, 1);
    const yesterday = await visitOn(w, 'Yesterday', 1, 1);
    const paidYesterday = await visitOn(w, 'Settled', 1, 2);
    const today1 = await visit(w, 'Today One', { labs: false, rx: false });
    const today2 = await visit(w, 'Today Two', { labs: false });
    const atCounterOld = await visitOn(w, 'Sent Yesterday', 1, 3);
    const today3 = await visit(w, 'Today Three', { labs: false, rx: false });
    await setStatus(atCounterOld.id, 'at_counter');
    await setStatus(today3.id, 'at_counter');
    expect((await checkout(w.desk, paidYesterday.id, { paymentMode: 'cash', amountPaise: 20000 })).status).toBe(201);

    const expected = [atCounterOld.id, today3.id, today1.id, today2.id, edge.id, yesterday.id]; // sent by the doctor, then today, then older oldest first
    const queue = await queueOf(w.pharm);
    expect(queue.map((q) => q.visitId)).toEqual(expected);
    expect(queue.map((q) => q.status)).toEqual(['at_counter', 'at_counter', 'waiting', 'waiting', 'waiting', 'waiting']);
    expect(queue.find((q) => q.visitId === yesterday.id)).toMatchObject({ visitDate: inDays(-1), toBillPaise: 20000, medicinesWaiting: 0, summary: 'Consultation + lab due ₹200 · Total ₹200' });
    expect(queue.map((q) => q.visitId)).not.toContain(tooOld.id);
    expect(queue.map((q) => q.visitId)).not.toContain(paidYesterday.id);

    const toBill = await toBillOf(w.desk);
    expect(toBill.map((x) => x.visitId)).toEqual(expected);
    expect(toBill.find((x) => x.visitId === yesterday.id)).toMatchObject({ visitDate: inDays(-1), opNo: yesterday.opNo, hasBill: false, unbilledLabPaise: 0, unbilledLabCount: 0, patientName: 'Yesterday', status: 'waiting' });

    // Yesterday's visit is collected like any other, and then leaves both lists.
    await setStatus(yesterday.id, 'at_counter');
    expect((await json(checkout(w.pharm, yesterday.id, { paymentMode: 'cash', amountPaise: 20000 }))).visitStatus).toBe('completed');
    expect((await queueOf(w.pharm)).map((q) => q.visitId)).not.toContain(yesterday.id);
    expect((await toBillOf(w.desk)).map((x) => x.visitId)).not.toContain(yesterday.id);
  });

  it('a cancelled visit is refused and never listed; a deleted one is gone', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar');
    await setStatus(v.id, 'cancelled');
    const res = await checkout(w.pharm, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('visit_cancelled');
    await expectUntouched(w, v, 'cancelled');
    expect(await queueOf(w.pharm)).toEqual([]);
    expect(await toBillOf(w.desk)).toEqual([]);

    const gone = await visit(w, 'Gone');
    expect((await w.owner(`/api/b/main/visits/${gone.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await w.pharm(`/api/b/main/visits/${gone.id}/checkout`)).status).toBe(404);
    expect((await checkout(w.pharm, gone.id, { itemIds: gone.items, paymentMode: 'cash', amountPaise: 69000 })).status).toBe(404);
    expect(await queueOf(w.pharm)).toEqual([]);
  });

  it("another branch's visit is 404 on every new route and never in its lists", async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar');
    expect((await w.owner(`/api/b/east/visits/${v.id}/checkout`)).status).toBe(404);
    expect((await checkout(w.owner, v.id, { itemIds: v.items, paymentMode: 'cash', amountPaise: 69000 }, 'east')).status).toBe(404);
    expect((await w.owner(`/api/b/east/visits/${v.id}/combined-bill`)).status).toBe(404);
    expect((await w.owner('/api/b/main/visits/999999/checkout')).status).toBe(404);
    expect((await w.owner('/api/b/main/visits/abc/combined-bill')).status).toBe(404);
    expect(await queueOf(w.owner, 'east')).toEqual([]);
    expect(await toBillOf(w.owner, 'east')).toEqual([]);
    expect((await w.pharm(`/api/b/east/visits/${v.id}/checkout`)).status).toBe(404); // not a member of east: the branch itself answers like a missing one
    await expectUntouched(w, v);
    expect((await queueOf(w.owner)).map((q) => q.visitId)).toEqual([v.id]);
  });
});

describe('combined bill (one print for the visit)', () => {
  it('returns the OP bill and the pharmacy sale with batches, totals by mode, who collected and the letterhead', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar', { sent: true });
    const done = await json(checkout(w.pharm, v.id, { itemIds: v.items, discountPaise: 8000, paymentMode: 'upi', amountPaise: 41000 }));
    const print = await json(w.desk(`/api/b/main/visits/${v.id}/combined-bill`));
    expect(print.visit).toMatchObject({ id: v.id, opNo: v.opNo, token: 1, visitDate: inDays(0), status: 'completed', doctorName: null });
    expect(print.patient).toMatchObject({ name: 'Ravi Kumar', uhid: expect.any(String) });
    expect(print.bills).toHaveLength(1);
    expect(print.bills[0]).toMatchObject({ billNo: done.bill.billNo, consultationFeePaise: 20000, discountPaise: 8000, totalPaise: 50000, paidPaise: 30000, balancePaise: 20000 });
    expect(print.bills[0].lines.map((l: any) => [l.description, l.amountPaise])).toEqual([['CBC', 30000], ['Blood sugar', 8000]]);
    expect(print.sales).toHaveLength(1);
    expect(print.sales[0]).toMatchObject({ saleNo: done.sale.saleNo, totalPaise: 11000, paymentMode: 'upi' });
    expect(print.sales[0].lines.map((l: any) => [l.medicineName, l.batchNo, l.expiryDate, l.quantity, l.unitPricePaise, l.amountPaise])).toEqual([
      ['Paracetamol', 'SOON', inDays(30), 5, 200, 1000],
      ['Paracetamol', 'LATE', inDays(300), 5, 200, 1000],
      ['Cough syrup', 'S1', inDays(100), 1, 9000, 9000],
    ]);
    expect(print.totals).toEqual({ grandTotalPaise: 61000, paidPaise: 41000, balancePaise: 20000, paidByMode: { cash: 0, upi: 41000, card: 0 } });
    expect(print.collectedBy).toEqual(['pharm']);
    expect(print.header).toEqual((await json(w.desk('/api/b/main/print-header'))).header);

    // Without pharmacy.sell the medicines part is not shown (as on the patient's Bills tab).
    const forLab = await json(w.lab(`/api/b/main/visits/${v.id}/combined-bill`));
    expect(forLab.sales).toBeNull();
    expect(forLab.totals).toMatchObject({ grandTotalPaise: 50000, paidPaise: 30000, balancePaise: 20000 });
  });
});
