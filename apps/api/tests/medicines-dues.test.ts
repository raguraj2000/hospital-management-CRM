// Medicines on dues (BUSINESS-RULES.md, section 9): a village patient pays what they can at the one final counter;
// what is not paid -- medicines too -- stays a due of that patient. Money is counted only when it is received.
import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { opBill, opBillLine, opVisit, pharmacySale, role, rolePermission } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;

/** Fee ₹200; one visit at the counter with 10 Paracetamol at ₹2 (₹20 of medicines): ₹220 in all. */
async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk'); // front desk: billing.receive + pharmacy.sell
  const pharm = await t.as('pharm'); // pharmacist: pharmacy.sell, no billing.receive
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: para } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
  await owner(`/api/b/main/medicines/${para}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: `${new Date().getFullYear() + 2}-01-01`, quantity: 50 } });
  const { patient } = await json(doc('/api/b/main/patients', { method: 'POST', body: { name: 'Village Patient' } }));
  const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  const rx = await json(doc(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 5 } }));
  await t.db.update(opVisit).set({ status: 'at_counter' }).where(eq(opVisit.id, visit.id));
  return { owner, doc, desk, pharm, para, patientId: patient.id as number, visitId: visit.id as number, itemId: rx.id as number };
}
type World = Awaited<ReturnType<typeof world>>;
const checkout = (w: World, caller: Caller, amountPaise: number) =>
  caller(`/api/b/main/visits/${w.visitId}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise, itemIds: [w.itemId] } });
const collection = async (w: World) => json(w.owner('/api/b/main/billing/collection'));
const dashboardToday = async (w: World) => (await json(w.owner('/api/b/main/dashboard'))).collectionToday;
const due = async (w: World) => ((await json(w.owner('/api/b/main/bills'))).bills as any[]).reduce((s, b) => s + b.totalPaise - b.paidPaise, 0);

describe('medicines on dues', () => {
  it('pays ₹10 of ₹220 (less than the ₹20 of medicines): medicines go on the bill, ₹210 due, only ₹10 received; paid later', async () => {
    const w = await world();
    const res = await checkout(w, w.desk, 1000);
    expect(res.status).toBe(201);
    const r = await res.json();
    expect(r.visitStatus).toBe('completed');
    expect(r.totals.balancePaise).toBe(21000);

    // The sale is on the visit's bill, as one medicines line; stock is given out.
    const [sale] = await t.db.select().from(pharmacySale);
    expect(sale!.billId).not.toBeNull();
    const lines = await t.db.select().from(opBillLine).where(eq(opBillLine.saleId, sale!.id));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ amountPaise: 2000, description: `Medicines (${sale!.saleNo})` });
    const [bill] = await t.db.select().from(opBill).where(eq(opBill.id, sale!.billId!));
    expect(bill!.totalPaise).toBe(22000);

    // Money: ₹10 received (not ₹10 + the ₹20 sale), ₹210 due.
    expect((await collection(w)).totalPaise).toBe(1000);
    expect((await dashboardToday(w)).totalPaise).toBe(1000);
    expect(await due(w)).toBe(21000);

    // A medicines line is not an extra charge: the bill's charges do not show it.
    const billView = await json(w.owner(`/api/b/main/bills/${bill!.id}`));
    expect(billView.bill.lines.find((l: any) => l.saleId === sale!.id)).toBeTruthy();

    // Next visit: the patient pays the old due.
    expect((await w.desk(`/api/b/main/patients/${w.patientId}/pay-dues`, { method: 'POST', body: { amountPaise: 21000, mode: 'upi' } })).status).toBe(201);
    expect(await due(w)).toBe(0);
    expect((await collection(w)).totalPaise).toBe(22000);

    // Period report: received ₹220 once; medicines are medicines (₹20), never "other charges".
    const period = await json(w.owner('/api/b/main/reports/period?days=1'));
    expect(period.received.totalPaise).toBe(22000);
    expect(period.billed.otherPaise).toBe(0);
    expect(period.doctors.reduce((s: number, d: any) => s + d.medicinesPaise, 0)).toBe(2000);
  });

  it('patient left: nothing received, everything (medicines too) is due; editing the charges keeps the medicines line', async () => {
    const w = await world();
    const res = await checkout(w, w.desk, 0);
    expect(res.status).toBe(201);
    expect((await res.json()).visitStatus).toBe('completed');
    expect(await due(w)).toBe(22000);
    expect((await collection(w)).totalPaise).toBe(0);

    // The bill is still unpaid, so its charges can be edited: the medicines line must stay.
    const [sale] = await t.db.select().from(pharmacySale);
    const before = await json(w.owner(`/api/b/main/bills/${sale!.billId}`));
    expect((await w.owner(`/api/b/main/bills/${sale!.billId}`, { method: 'PATCH', body: { charges: [{ description: 'Dressing', amountPaise: 5000 }] } })).status).toBe(200);
    const after = await json(w.owner(`/api/b/main/bills/${sale!.billId}`));
    expect(after.bill.lines.filter((l: any) => l.saleId === sale!.id)).toHaveLength(1);
    expect(after.bill.totalPaise).toBe(before.bill.totalPaise + 5000);
  });

  it('enough for the medicines (₹100 of ₹220): medicines paid in full as a plain sale, ₹120 of the bill due', async () => {
    const w = await world();
    expect((await checkout(w, w.desk, 10000)).status).toBe(201);
    const [sale] = await t.db.select().from(pharmacySale);
    expect(sale!.billId).toBeNull();
    expect(await due(w)).toBe(12000);
    expect((await collection(w)).totalPaise).toBe(10000);
  });

  it('paid in full: the sale stays a plain sale (not on the bill), as before', async () => {
    const w = await world();
    expect((await checkout(w, w.desk, 22000)).status).toBe(201);
    const [sale] = await t.db.select().from(pharmacySale);
    expect(sale!.billId).toBeNull();
    expect(await t.db.select().from(opBillLine).where(eq(opBillLine.saleId, sale!.id))).toEqual([]);
    expect((await collection(w)).totalPaise).toBe(22000);
  });

  it('a role that sells but does not bill cannot leave medicines unpaid; nothing is sold', async () => {
    const w = await world();
    // The default pharmacist also bills (the village pharmacy makes all bills); this hospital took billing away.
    const [ph] = await t.db.select({ id: role.id }).from(role).where(eq(role.key, 'pharmacist'));
    await t.db.delete(rolePermission).where(and(eq(rolePermission.roleId, ph!.id), eq(rolePermission.permission, 'billing.receive')));
    const res = await checkout(w, w.pharm, 1000);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('must be paid in full here');
    expect(await t.db.select().from(pharmacySale)).toEqual([]);
  });

  it('another branch cannot see or pay the bill the medicines went on', async () => {
    const w = await world();
    await checkout(w, w.desk, 0);
    const [sale] = await t.db.select().from(pharmacySale);
    expect((await w.owner(`/api/b/east/bills/${sale!.billId}`)).status).toBe(404);
    expect((await w.owner(`/api/b/east/patients/${w.patientId}/pay-dues`, { method: 'POST', body: { amountPaise: 100, mode: 'cash' } })).status).toBe(404);
  });
});
