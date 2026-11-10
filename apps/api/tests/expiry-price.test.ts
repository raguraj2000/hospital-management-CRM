// Safety rules for giving medicines (found live: a batch was sold on its expiry day for a 3-day course, at ₹0).
// 1. A batch is never given on its expiry day, and must still be in date after the last dose of the course.
// 2. A medicine is never sold at ₹0.
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { medicine as medicineTable, medicineBatch, prescriptionItem } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A medicine; batches go straight into the table (the API refuses ones expiring today, on purpose). */
async function medicine(caller: Caller, name: string, batches: [batchNo: string, expiresInDays: number, quantity: number][], pricePaise = 200) {
  const { id } = await json(caller('/api/b/main/medicines', { method: 'POST', body: { name, form: 'tablet', pricePaise } }));
  for (const [batchNo, days, quantity] of batches) await t.db.insert(medicineBatch).values({ branchId: t.main.id, medicineId: id, batchNo, expiryDate: inDays(days), quantity, receivedQty: quantity });
  return id as number;
}
const left = async (medicineId: number) =>
  Object.fromEntries((await t.db.select().from(medicineBatch).where(eq(medicineBatch.medicineId, medicineId))).map((b) => [b.batchNo, b.quantity]));

/** A visit today with one prescription line. */
async function prescribe(doc: Caller, medicineId: number, days: number, quantity: number) {
  const { patient } = await json(doc('/api/b/main/patients', { method: 'POST', body: { name: 'Asai Thambi' } }));
  const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  const line = await json(doc(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId, dose: '1-0-1', days, quantity } }));
  return { visitId: visit.id as number, itemId: line.id as number };
}
const dispense = (caller: Caller, visitId: number, itemIds: number[]) => caller('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId, itemIds, paymentMode: 'cash' } });
const sell = (caller: Caller, medicineId: number, quantity: number) => caller('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId, quantity }], paymentMode: 'cash' } });

describe('expiry: never on its expiry day, and in date for the whole course', () => {
  it('counter sale: a batch expiring today is out; the next one is sold; only today-stock is "not in date"', async () => {
    const pharm = await t.as('pharm');
    const med = await medicine(pharm, 'Albendazole', [['TODAY', 0, 5], ['TMRW', 1, 5]]);
    expect((await json(pharm('/api/b/main/medicines'))).medicines.find((m: any) => m.id === med)).toMatchObject({ stock: 5, nextBatchNo: 'TMRW', nextExpiry: inDays(1) });

    expect((await sell(pharm, med, 2)).status).toBe(201);
    expect(await left(med)).toEqual({ TODAY: 5, TMRW: 3 });

    const r = await sell(pharm, med, 4);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toContain('Albendazole (need 4, only 3 in date after today)');
    expect(await left(med)).toEqual({ TODAY: 5, TMRW: 3 });
  });

  it('3-day course: a batch expiring on day 3 is skipped; the screen shows the batch the sale really takes', async () => {
    const doc = await t.as('doc');
    const pharm = await t.as('pharm');
    // EDGE expires on the day of the last dose (today+2); LONG lasts past it (today+3).
    const med = await medicine(pharm, 'Albendazole', [['EDGE', 2, 10], ['LONG', 3, 10]]);
    const { visitId, itemId } = await prescribe(doc, med, 3, 6);

    const shown = (await json(pharm(`/api/b/main/visits/${visitId}/prescription`))).items.find((i: any) => i.id === itemId);
    expect(shown).toMatchObject({ stock: 10, nextBatchNo: 'LONG', nextExpiry: inDays(3) });

    expect((await dispense(pharm, visitId, [itemId])).status).toBe(201);
    expect(await left(med)).toEqual({ EDGE: 10, LONG: 4 });
  });

  it('3-day course with only stock that runs out mid-course: refused, with the real reason, nothing sold', async () => {
    const doc = await t.as('doc');
    const pharm = await t.as('pharm');
    const med = await medicine(pharm, 'Albendazole', [['EDGE', 2, 10]]);
    const { visitId, itemId } = await prescribe(doc, med, 3, 6);

    expect((await json(pharm(`/api/b/main/visits/${visitId}/prescription`))).items.find((i: any) => i.id === itemId)).toMatchObject({ stock: 0, nextBatchNo: null });
    const r = await dispense(pharm, visitId, [itemId]);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toContain('Albendazole (need 6, only 0 in date for the whole 3-day course)');
    expect(await left(med)).toEqual({ EDGE: 10 });
    expect((await t.db.select({ s: prescriptionItem.status }).from(prescriptionItem).where(eq(prescriptionItem.id, itemId)))[0]!.s).toBe('pending');
  });

  it('stock in: a batch or purchase line expiring today is refused; tomorrow is fine', async () => {
    const pharm = await t.as('pharm');
    const med = await medicine(pharm, 'Albendazole', []);
    const addBatch = (days: number) => pharm(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: `B${days}`, expiryDate: inDays(days), quantity: 5 } });
    expect((await addBatch(0)).status).toBe(400);
    expect((await addBatch(1)).status).toBe(201);

    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'City Medicals' } }));
    const purchase = (days: number) =>
      pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: inDays(0), lines: [{ medicineId: med, batchNo: `P${days}`, expiryDate: inDays(days), quantity: 5, unitCostPaise: 100 }] } });
    expect((await purchase(0)).status).toBe(400);
    expect((await purchase(1)).status).toBe(201);
  });

  it('stock report: a batch on its expiry day is "expired", not "expiring"', async () => {
    const pharm = await t.as('pharm');
    await medicine(pharm, 'Albendazole', [['TODAY', 0, 1], ['TMRW', 1, 2]]);
    const r = await json(pharm('/api/b/main/inventory/report'));
    expect(r.expired.map((b: any) => b.batchNo)).toEqual(['TODAY']);
    expect(r.expiring.map((b: any) => b.batchNo)).toEqual(['TMRW']);
  });

  it('prepaid course: the medicine given on day one must last until its last sitting', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const med = await medicine(owner, 'Ceftriaxone 1g', [['C1', 400, 10]], 5000);
    const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Course Patient' } }));
    const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
    const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    const sittings = [
      { dueAt: at(0.01), kind: 'nurse', items: [{ kind: 'medicine', medicineId: med, quantity: 1 }] },
      { dueAt: at(10), kind: 'nurse', items: [{ kind: 'medicine', medicineId: med, quantity: 1 }] },
    ];
    expect((await doc(`/api/b/main/visits/${visit.id}/courses`, { method: 'POST', body: { name: 'Antibiotic', payMode: 'day_one', sittings } })).status).toBe(201);
    const [line] = await t.db.select().from(prescriptionItem).where(eq(prescriptionItem.visitId, visit.id));
    // Today .. day 10 counted both ends (11), or 12 when the 10th day's sitting falls after midnight India time.
    expect(line).toMatchObject({ medicineId: med, quantity: 2 });
    expect(line!.days).toBeGreaterThanOrEqual(11);
    expect(line!.days).toBeLessThanOrEqual(12);
  });
});

describe('price: a medicine is never sold at ₹0', () => {
  it('a new or edited medicine needs a price above ₹0, also from a purchase line', async () => {
    const pharm = await t.as('pharm');
    expect((await pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Free pill', form: 'tablet', pricePaise: 0 } })).status).toBe(400);
    const med = await medicine(pharm, 'Albendazole', [], 200);
    expect((await pharm(`/api/b/main/medicines/${med}`, { method: 'PATCH', body: { pricePaise: 0 } })).status).toBe(400);
    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'City Medicals' } }));
    const r = await pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: inDays(0), lines: [{ medicineId: med, batchNo: 'P1', expiryDate: inDays(200), quantity: 5, unitCostPaise: 100, sellingPricePaise: 0 }] } });
    expect(r.status).toBe(400);
  });

  it('a ₹0 medicine already in the database is refused at the counter and at dispense; nothing is taken', async () => {
    const doc = await t.as('doc');
    const pharm = await t.as('pharm');
    const med = await medicine(pharm, 'Albendazole', [['LONG', 300, 10]]);
    await t.db.run(sql`update ${medicineTable} set price_paise = 0 where id = ${med}`);

    const r = await sell(pharm, med, 1);
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ code: 'no_price', error: 'Albendazole has no price. Set its price in Inventory first.' });

    const { visitId, itemId } = await prescribe(doc, med, 3, 6);
    const d = await dispense(pharm, visitId, [itemId]);
    expect(d.status).toBe(409);
    expect((await d.json()).code).toBe('no_price');
    expect(await left(med)).toEqual({ LONG: 10 });
  });
});
