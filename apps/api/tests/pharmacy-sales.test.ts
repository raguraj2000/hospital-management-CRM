// Direct (over-the-counter) pharmacy sales and the printable pharmacy bill.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { medicineBatch, pharmacySale, pharmacySaleLine } from '../src/db/schema.js';
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

async function medicine(caller: Caller, branch: string, name: string, pricePaise: number, batches: { batchNo: string; days: number; quantity: number }[]) {
  const { id } = await json(caller(`/api/b/${branch}/medicines`, { method: 'POST', body: { name, form: 'tablet', strength: '500 mg', pricePaise } }));
  for (const bt of batches) {
    const r = await caller(`/api/b/${branch}/medicines/${id}/batches`, { method: 'POST', body: { batchNo: bt.batchNo, expiryDate: inDays(bt.days), quantity: bt.quantity } });
    expect(r.status).toBe(201);
  }
  return id as number;
}
const sell = (caller: Caller, branch: string, body: unknown) => caller(`/api/b/${branch}/pharmacy/sales`, { method: 'POST', body });
const batchesOf = async (caller: Caller, id: number) => (await json(caller(`/api/b/main/medicines/${id}/batches`))).batches.map((b: any) => [b.batchNo, b.quantity]);

describe('direct sale', () => {
  it('walk-in buys two medicines: FEFO across batches, expired batch skipped, in the day list and the collection', async () => {
    const pharm = await t.as('pharm');
    const owner = await t.as('owner');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [
      { batchNo: 'LATE', days: 300, quantity: 20 },
      { batchNo: 'SOON', days: 30, quantity: 5 },
    ]);
    // Already expired (the API refuses these, so straight into the table): the earliest expiry, but never sold.
    await t.db.insert(medicineBatch).values({ branchId: t.main.id, medicineId: para, batchNo: 'OLD', expiryDate: inDays(-1), quantity: 7, receivedQty: 7 });
    const syrup = await medicine(pharm, 'main', 'Cough syrup', 9000, [{ batchNo: 'S1', days: 100, quantity: 3 }]);
    const empty = await medicine(pharm, 'main', 'Empty shelf', 100, []);

    // The counter shows the batch the sale will start from.
    const before = (await json(pharm('/api/b/main/medicines'))).medicines;
    expect(before.find((m: any) => m.id === para)).toMatchObject({ stock: 25, nextExpiry: inDays(30), nextBatchNo: 'SOON' });
    expect(before.find((m: any) => m.id === empty)).toMatchObject({ stock: 0, nextExpiry: null, nextBatchNo: null });

    const res = await sell(pharm, 'main', { items: [{ medicineId: para, quantity: 8 }, { medicineId: syrup, quantity: 2 }], paymentMode: 'cash' });
    expect(res.status).toBe(201);
    const { sale } = await res.json();
    expect(sale).toEqual({ id: expect.any(Number), saleNo: expect.stringMatching(/^PH-\d{6}-001$/), totalPaise: 19600 });

    expect(await batchesOf(pharm, para)).toEqual([['OLD', 7], ['SOON', 0], ['LATE', 17]]); // 5 from the earliest unexpired, then 3 more
    expect(await batchesOf(pharm, syrup)).toEqual([['S1', 1]]);
    expect((await json(pharm('/api/b/main/medicines'))).medicines.find((m: any) => m.id === para)).toMatchObject({ stock: 17, nextBatchNo: 'LATE' });

    // No visit, no patient, no prescription line.
    const [row] = await t.db.select().from(pharmacySale);
    expect(row).toMatchObject({ id: sale.id, visitId: null, patientId: null, totalPaise: 19600, paymentMode: 'cash' });
    const lines = await t.db.select().from(pharmacySaleLine);
    expect(lines.map((l) => [l.prescriptionItemId, l.quantity, l.amountPaise])).toEqual([[null, 5, 1000], [null, 3, 600], [null, 2, 18000]]);

    const day = await json(pharm('/api/b/main/pharmacy/sales'));
    expect(day.totalPaise).toBe(19600);
    expect(day.sales).toHaveLength(1);
    expect(day.sales[0]).toMatchObject({ id: sale.id, saleNo: sale.saleNo, visitId: null, patientName: 'Walk-in' });
    expect(day.sales[0].lines.map((l: any) => [l.batchNo, l.quantity]).sort()).toEqual([['LATE', 3], ['S1', 2], ['SOON', 5]]);

    expect((await json(owner('/api/b/main/dashboard'))).collectionToday).toEqual({ cashPaise: 19600, upiPaise: 0, cardPaise: 0, totalPaise: 19600 });
  });

  it('an attached patient is stored; the print endpoint returns batches, expiry and the branch header', async () => {
    const pharm = await t.as('pharm');
    const owner = await t.as('owner');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [
      { batchNo: 'LATE', days: 300, quantity: 20 },
      { batchNo: 'SOON', days: 30, quantity: 5 },
    ]);
    const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Ravi Kumar' } }));

    const { sale } = await json(sell(pharm, 'main', { items: [{ medicineId: para, quantity: 6 }], paymentMode: 'upi', patientId: patient.id }));
    const [row] = await t.db.select().from(pharmacySale);
    expect(row).toMatchObject({ visitId: null, patientId: patient.id });
    expect((await json(pharm('/api/b/main/pharmacy/sales'))).sales[0]).toMatchObject({ visitId: null, patientName: 'Ravi Kumar' });

    const print = await json(pharm(`/api/b/main/pharmacy/sales/${sale.id}`));
    expect(print.sale).toMatchObject({ id: sale.id, saleNo: sale.saleNo, paymentMode: 'upi', totalPaise: 1200, soldByName: 'pharm', patient: { name: 'Ravi Kumar', uhid: patient.uhid }, visitId: null, opNo: null });
    expect(print.sale.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
    expect(print.sale.lines).toEqual([
      { medicineName: 'Paracetamol', form: 'tablet', strength: '500 mg', batchNo: 'SOON', expiryDate: inDays(30), quantity: 5, unitPricePaise: 200, amountPaise: 1000 },
      { medicineName: 'Paracetamol', form: 'tablet', strength: '500 mg', batchNo: 'LATE', expiryDate: inDays(300), quantity: 1, unitPricePaise: 200, amountPaise: 200 },
    ]);
    expect(print.header).toEqual((await json(pharm('/api/b/main/print-header'))).header);
    expect(print.header.title).toBeTruthy();

    // A walk-in has no patient; a prescription sale prints too, with its OP no.
    const walkIn = await json(sell(pharm, 'main', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash', patientId: null }));
    expect((await json(pharm(`/api/b/main/pharmacy/sales/${walkIn.sale.id}`))).sale).toMatchObject({ patient: null, opNo: null });
    const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
    const item = await json(owner(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 1 } }));
    const dispensed = await json(pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: visit.id, itemIds: [item.id], paymentMode: 'cash' } }));
    expect(dispensed.sale.saleNo).toMatch(/-003$/); // same daily counter as direct sales
    expect((await json(pharm(`/api/b/main/pharmacy/sales/${dispensed.sale.id}`))).sale).toMatchObject({ visitId: visit.id, opNo: visit.opNo, patient: { name: 'Ravi Kumar' } });
  });

  it('short stock on one medicine: nothing is sold and stock is untouched', async () => {
    const pharm = await t.as('pharm');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 20 }]);
    const syrup = await medicine(pharm, 'main', 'Cough syrup', 9000, [{ batchNo: 'S1', days: 100, quantity: 3 }]);
    const res = await sell(pharm, 'main', { items: [{ medicineId: para, quantity: 5 }, { medicineId: syrup, quantity: 4 }], paymentMode: 'cash' });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'out_of_stock', error: expect.stringContaining('Cough syrup (need 4, have 3)') });
    expect(await batchesOf(pharm, para)).toEqual([['B1', 20]]);
    expect(await batchesOf(pharm, syrup)).toEqual([['S1', 3]]);
    expect(await t.db.select().from(pharmacySale)).toEqual([]);
    expect((await json(pharm('/api/b/main/pharmacy/sales'))).sales).toEqual([]);
  });

  it('needs pharmacy.sell', async () => {
    const pharm = await t.as('pharm');
    const doc = await t.as('doc');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 20 }]);
    const { sale } = await json(sell(pharm, 'main', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash' }));
    expect((await sell(doc, 'main', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash' })).status).toBe(403);
    expect((await doc(`/api/b/main/pharmacy/sales/${sale.id}`)).status).toBe(403);
    expect(await batchesOf(pharm, para)).toEqual([['B1', 19]]);
  });

  it("another branch's medicine, patient or sale answers like a missing one", async () => {
    const pharm = await t.as('pharm');
    const owner = await t.as('owner');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 20 }]);
    const eastMed = await medicine(owner, 'east', 'East only', 500, [{ batchNo: 'E1', days: 100, quantity: 20 }]);
    const { patient: eastPatient } = await json(owner('/api/b/east/patients', { method: 'POST', body: { name: 'East Only' } }));

    const med = await sell(pharm, 'main', { items: [{ medicineId: para, quantity: 1 }, { medicineId: eastMed, quantity: 1 }], paymentMode: 'cash' });
    expect(med.status).toBe(404);
    expect((await med.json()).code).toBe((await json(sell(pharm, 'main', { items: [{ medicineId: 999_999, quantity: 1 }], paymentMode: 'cash' }))).code);
    expect((await sell(pharm, 'main', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash', patientId: eastPatient.id })).status).toBe(404);
    expect((await sell(owner, 'east', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash' })).status).toBe(404);
    expect(await batchesOf(pharm, para)).toEqual([['B1', 20]]);
    expect((await json(owner(`/api/b/east/medicines/${eastMed}/batches`))).batches[0].quantity).toBe(20);
    expect(await t.db.select().from(pharmacySale)).toEqual([]);

    // A deleted medicine can't be sold either.
    const gone = await medicine(pharm, 'main', 'Gone', 100, [{ batchNo: 'G1', days: 100, quantity: 5 }]);
    expect((await pharm(`/api/b/main/medicines/${gone}`, { method: 'DELETE' })).status).toBe(200);
    expect((await sell(pharm, 'main', { items: [{ medicineId: gone, quantity: 1 }], paymentMode: 'cash' })).status).toBe(404);

    const { sale } = await json(sell(pharm, 'main', { items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash' }));
    expect((await owner(`/api/b/main/pharmacy/sales/${sale.id}`)).status).toBe(200);
    expect((await owner(`/api/b/east/pharmacy/sales/${sale.id}`)).status).toBe(404);
    expect((await owner('/api/b/main/pharmacy/sales/999999')).status).toBe(404);
    expect((await json(owner('/api/b/east/pharmacy/sales'))).sales).toEqual([]);
  });

  it('invalid input is a 400 with field errors and sells nothing', async () => {
    const pharm = await t.as('pharm');
    const para = await medicine(pharm, 'main', 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 20 }]);
    const bad = async (body: unknown) => {
      const r = await sell(pharm, 'main', body);
      expect(r.status).toBe(400);
      const e = await r.json();
      expect(e.code).toBe('validation');
      return Object.keys(e.fields);
    };
    expect(await bad({ items: [], paymentMode: 'cash' })).toEqual(['items']);
    expect(await bad({ paymentMode: 'cash' })).toEqual(['items']);
    for (const quantity of [0, -1, 1.5, 10_001]) expect(await bad({ items: [{ medicineId: para, quantity }], paymentMode: 'cash' })).toEqual(['items.0.quantity']);
    // The same medicine twice is rejected, not merged.
    expect(await bad({ items: [{ medicineId: para, quantity: 1 }, { medicineId: para, quantity: 2 }], paymentMode: 'cash' })).toEqual(['items.1.medicineId']);
    expect(await bad({ items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cheque' })).toEqual(['paymentMode']);
    expect(await bad({ items: [{ medicineId: para, quantity: 1 }], paymentMode: 'cash', patientId: 'x' })).toEqual(['patientId']);
    expect(await batchesOf(pharm, para)).toEqual([['B1', 20]]);
    expect(await t.db.select().from(pharmacySale)).toEqual([]);
  });
});
