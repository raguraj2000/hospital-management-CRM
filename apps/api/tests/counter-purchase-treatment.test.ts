// Fewer units at the counter than prescribed, purchase lines as on the vendor's invoice (packs, free, GST),
// and treatments given in the hospital (doses ticked by the nurse).
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prescriptionItem } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json();
const day = (n = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Paracetamol ₹2 with 50 in stock; one patient with a visit today. */
async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk');
  const pharm = await t.as('pharm');
  const nurse = await t.as('nurse');
  const east = await t.as('eastdesk');
  const { id: para } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
  expect((await pharm(`/api/b/main/medicines/${para}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: day(400), quantity: 50 } })).status).toBe(201);
  const { patient } = await json(doc('/api/b/main/patients', { method: 'POST', body: { name: 'Kumar' } }));
  const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  const stock = async () => (await json(pharm('/api/b/main/medicines'))).medicines.find((m: any) => m.id === para).stock as number;
  return { owner, doc, desk, pharm, nurse, east, para: para as number, visitId: visit.id as number, stock };
}

describe('fewer units at the counter than prescribed', () => {
  it('sells and charges what was given; the prescription stays as the doctor wrote it', async () => {
    const w = await world();
    const { id } = await json(w.doc(`/api/b/main/visits/${w.visitId}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 5 } })); // 10 tablets
    // More than prescribed is refused, and nothing changes.
    const more = await w.desk(`/api/b/main/visits/${w.visitId}/checkout`, { method: 'POST', body: { itemIds: [id], quantities: { [id]: 12 }, paymentMode: 'cash', amountPaise: 2400 } });
    expect(more.status).toBe(400);
    expect(await w.stock()).toBe(50);

    // 2 days of the 5: 4 tablets = ₹8.
    const r = await w.desk(`/api/b/main/visits/${w.visitId}/checkout`, { method: 'POST', body: { itemIds: [id], quantities: { [id]: 4 }, paymentMode: 'cash', amountPaise: 800 } });
    expect(r.status).toBe(201);
    expect((await r.json()).sale.totalPaise).toBe(800);
    expect(await w.stock()).toBe(46);
    const [line] = await t.db.select().from(prescriptionItem).where(eq(prescriptionItem.id, id));
    expect(line).toMatchObject({ quantity: 10, status: 'dispensed' });
    const { sales } = await json(w.pharm(`/api/b/main/visits/${w.visitId}/combined-bill`));
    expect(sales[0].lines.map((l: any) => l.quantity)).toEqual([4]);
  });
});

describe("a purchase line as on the vendor's invoice", () => {
  it('turns packs + free packs into units, adds GST to what is owed, and sets the price only when asked', async () => {
    const w = await world();
    const { id: vendorId } = await json(w.pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'City Medicals' } }));
    const { id: syrup } = await json(w.pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Cough syrup', form: 'syrup', pricePaise: 0 } }));
    const res = await w.pharm('/api/b/main/purchases', {
      method: 'POST',
      body: {
        vendorId,
        vendorBillNo: '6262',
        billDate: day(),
        lines: [
          // 20 strips of 10 + 2 free, ₹71.20 a strip + 5% GST, MRP ₹89: the price follows the MRP (₹8.90 a tablet).
          { medicineId: w.para, batchNo: 'ZTAT2502', expiryDate: day(500), quantity: 20, freeQty: 2, packSize: 10, unitCostPaise: 7120, gstPercent: 5, mrpPaise: 8900, sellingPricePaise: 890 },
          // The old way still works: 3 bottles at ₹60, nothing else said. The price is left alone.
          { medicineId: syrup, batchNo: 'S9', expiryDate: day(300), quantity: 3, unitCostPaise: 6000 },
        ],
      },
    });
    expect(res.status).toBe(201);
    const { bill } = await res.json();
    expect(bill.totalPaise).toBe(149520 + 18000);
    expect(bill.lines[0]).toMatchObject({ quantity: 220, amountPaise: 149520, unitCostPaise: 680, packSize: 10, packQty: 20, freeQty: 2, ratePaise: 7120, mrpPaise: 8900, gstPercent: 5 });
    expect(bill.lines[1]).toMatchObject({ quantity: 3, amountPaise: 18000, unitCostPaise: 6000, packSize: 1, packQty: 3, freeQty: 0, ratePaise: 6000, mrpPaise: null, gstPercent: 0 });
    const meds = (await json(w.pharm('/api/b/main/medicines'))).medicines;
    expect(meds.find((m: any) => m.id === w.para)).toMatchObject({ stock: 270, pricePaise: 890 });
    expect(meds.find((m: any) => m.id === syrup)).toMatchObject({ stock: 3, pricePaise: 0 });
    expect((await w.pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: day(), lines: [{ medicineId: w.para, batchNo: 'X', expiryDate: day(90), quantity: 1, unitCostPaise: 100, packSize: 0 }] } })).status).toBe(400);
  });
});

describe('a medicine given in the hospital', () => {
  const rx = (w: Awaited<ReturnType<typeof world>>, body: Record<string, unknown>) => w.doc(`/api/b/main/visits/${w.visitId}/prescription`, { method: 'POST', body: { medicineId: w.para, ...body } });
  const list = async (caller: Awaited<ReturnType<typeof t.as>>, query = '', branch = 'main') => json(caller(`/api/b/${branch}/treatments${query}`));

  it('becomes one dose per time of day per day; the nurse ticks them', async () => {
    const w = await world();
    const { id } = await json(rx(w, { dose: '1-0-1', days: 3, givenHere: true }));
    await rx(w, { dose: '1-1-1', days: 2 }); // taken at home: no doses

    const today = await list(w.nurse);
    expect(today.doses.map((d: any) => [d.patientName, d.medicineName, d.slot, d.amount, d.dueDate, d.givenAt])).toEqual([
      ['Kumar', 'Paracetamol', 'Morning', '1', day(), null],
      ['Kumar', 'Paracetamol', 'Night', '1', day(), null],
    ]);
    expect((await list(w.nurse, `?date=${day(2)}`)).doses).toHaveLength(2);
    expect((await list(w.nurse, `?date=${day(3)}`)).doses).toHaveLength(0);
    const items = (await json(w.doc(`/api/b/main/visits/${w.visitId}/prescription`))).items;
    expect(items.map((i: any) => [i.givenHere, i.dosesTotal, i.dosesGiven])).toEqual([[true, 6, 0], [false, 0, 0]]);

    const [morning, night] = today.doses;
    const given = await w.nurse(`/api/b/main/treatments/${morning.id}/give`, { method: 'POST', body: { note: 'Left arm' } });
    expect(given.status).toBe(200);
    expect((await given.json()).dose).toMatchObject({ givenByName: 'nurse', note: 'Left arm' });
    expect((await w.nurse(`/api/b/main/treatments/${morning.id}/give`, { method: 'POST', body: {} })).status).toBe(409);
    // Tomorrow's dose cannot be ticked today.
    const tomorrow = (await list(w.nurse, `?date=${day(1)}`)).doses[0];
    expect((await w.nurse(`/api/b/main/treatments/${tomorrow.id}/give`, { method: 'POST', body: {} })).status).toBe(400);
    expect((await json(w.doc(`/api/b/main/visits/${w.visitId}/prescription`))).items[0].dosesGiven).toBe(1);

    // Once a dose was given the medicine cannot be removed; after undoing it, it can, and its doses go with it.
    expect((await w.doc(`/api/b/main/prescription-items/${id}`, { method: 'DELETE' })).status).toBe(409);
    expect((await w.nurse(`/api/b/main/treatments/${morning.id}/undo`, { method: 'POST' })).status).toBe(200);
    expect((await w.nurse(`/api/b/main/treatments/${night.id}/undo`, { method: 'POST' })).status).toBe(409);
    expect((await w.doc(`/api/b/main/prescription-items/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await list(w.nurse)).doses).toEqual([]);
  });

  it('a typed dose is one dose a day; four a day are numbered', async () => {
    const w = await world();
    await rx(w, { dose: 'SOS', days: 2, quantity: 2, givenHere: true });
    await rx(w, { dose: '1-1-1-1', days: 1, givenHere: true });
    expect((await list(w.nurse)).doses.map((d: any) => d.slot)).toEqual(['Dose', 'Dose 1', 'Dose 2', 'Dose 3', 'Dose 4']);
  });

  it('only those who give treatments tick; another branch sees and reaches nothing', async () => {
    const w = await world();
    await rx(w, { dose: '1-0-0', days: 1, givenHere: true });
    const [dose] = (await list(w.nurse)).doses;
    expect((await w.desk('/api/b/main/treatments')).status).toBe(403);
    expect((await w.desk(`/api/b/main/treatments/${dose.id}/give`, { method: 'POST', body: {} })).status).toBe(403);
    expect((await w.doc(`/api/b/main/treatments/${dose.id}/give`, { method: 'POST', body: {} })).status).toBe(200); // the doctor may too
    // The east branch: an empty list, and this dose answers like a missing one.
    expect((await list(w.owner, '', 'east')).doses).toEqual([]);
    expect((await w.owner(`/api/b/east/treatments/${dose.id}/give`, { method: 'POST', body: {} })).status).toBe(404);
    expect((await w.owner(`/api/b/east/treatments/${dose.id}/undo`, { method: 'POST' })).status).toBe(404);
    expect((await w.nurse('/api/b/east/treatments')).status).toBe(404);
  });
});
