import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { medicineBatch } from '../src/db/schema.js';
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

async function medicine(caller: Caller, branch: string, body: { name: string; strength?: string; pricePaise?: number; reorderLevel?: number }, batches: { batchNo: string; days: number; quantity: number }[] = []) {
  const { id } = await json(caller(`/api/b/${branch}/medicines`, { method: 'POST', body: { form: 'tablet', pricePaise: 200, ...body } }));
  for (const bt of batches) {
    const r = await caller(`/api/b/${branch}/medicines/${id}/batches`, { method: 'POST', body: { batchNo: bt.batchNo, expiryDate: inDays(bt.days), quantity: bt.quantity } });
    expect(r.status).toBe(201);
  }
  return id as number;
}

/** Straight into the table: the API refuses expired batches and a quantity of 0. */
const rawBatch = (branchId: number, medicineId: number, batchNo: string, days: number, quantity: number) =>
  t.db.insert(medicineBatch).values({ branchId, medicineId, batchNo, expiryDate: inDays(days), quantity, receivedQty: quantity || 5 });

const report = (caller: Caller, branch = 'main') => json(caller(`/api/b/${branch}/inventory/report`));
const batchNos = (rows: { batchNo: string }[]) => rows.map((r) => r.batchNo);

describe('inventory report', () => {
  it('an empty branch gives empty lists and zeros', async () => {
    const pharm = await t.as('pharm');
    expect(await report(pharm)).toEqual({
      today: inDays(0),
      expiring: [],
      expired: [],
      lowStock: [],
      summary: { medicines: 0, inStock: 0, outOfStock: 0, lowStock: 0, expiring30: 0, expiring60: 0, expiring90: 0, expired: 0, sellableValuePaise: 0, expiredValuePaise: 0, costValuePaise: 0, costKnownUnits: 0, sellableUnits: 0 },
    });
  });

  it('lists batches expiring from today to day 90, earliest first; counts each window', async () => {
    const pharm = await t.as('pharm');
    await medicine(pharm, 'main', { name: 'Cetirizine', reorderLevel: 0 }, [
      { batchNo: 'D91', days: 91, quantity: 7 }, // one day past the report
      { batchNo: 'D90', days: 90, quantity: 6 }, // last day of the report
      { batchNo: 'D61', days: 61, quantity: 5 },
      { batchNo: 'D60', days: 60, quantity: 4 },
      { batchNo: 'D31', days: 31, quantity: 3 },
      { batchNo: 'D30', days: 30, quantity: 2 },
      { batchNo: 'D0', days: 0, quantity: 1 }, // expires today: still sellable today
    ]);
    const r = await report(pharm);
    expect(batchNos(r.expiring)).toEqual(['D0', 'D30', 'D31', 'D60', 'D61', 'D90']);
    expect(r.expiring.map((b: any) => b.daysLeft)).toEqual([0, 30, 31, 60, 61, 90]);
    expect(r.expired).toEqual([]);
    expect(r.summary).toMatchObject({ expiring30: 2, expiring60: 4, expiring90: 6, expired: 0, sellableUnits: 28, sellableValuePaise: 28 * 200 });
  });

  it('expired stock on the shelf is "expired", never "expiring"; empty batches are in neither', async () => {
    const pharm = await t.as('pharm');
    const dolo = await medicine(pharm, 'main', { name: 'Dolo', strength: '650 mg', pricePaise: 300, reorderLevel: 0 }, [{ batchNo: 'OK5', days: 5, quantity: 20 }]);
    await rawBatch(t.main.id, dolo, 'X10', -10, 3);
    await rawBatch(t.main.id, dolo, 'X1', -1, 7);
    await rawBatch(t.main.id, dolo, 'XEMPTY', -5, 0); // expired, nothing left
    await rawBatch(t.main.id, dolo, 'EMPTY', 10, 0); // sold out
    const r = await report(pharm);
    expect(batchNos(r.expiring)).toEqual(['OK5']);
    expect(r.expired).toEqual([
      { batchId: expect.any(Number), medicineId: dolo, medicineName: 'Dolo', form: 'tablet', strength: '650 mg', batchNo: 'X1', expiryDate: inDays(-1), daysLeft: -1, quantity: 7, valuePaise: 2100, vendorName: null },
      { batchId: expect.any(Number), medicineId: dolo, medicineName: 'Dolo', form: 'tablet', strength: '650 mg', batchNo: 'X10', expiryDate: inDays(-10), daysLeft: -10, quantity: 3, valuePaise: 900, vendorName: null },
    ]);
    expect(r.summary).toMatchObject({ expired: 2, expiredValuePaise: 3000, expiring30: 1, sellableUnits: 20, sellableValuePaise: 6000 });
  });

  it('vendor and cost come from the purchase bill; a manually added batch has neither', async () => {
    const pharm = await t.as('pharm');
    const amox = await medicine(pharm, 'main', { name: 'Amoxicillin', strength: '250 mg', pricePaise: 500, reorderLevel: 0 }, [{ batchNo: 'M40', days: 40, quantity: 10 }]);
    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'Sri Pharma' } }));
    const buy = (lines: { batchNo: string; days: number; quantity: number; unitCostPaise: number }[]) =>
      pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: inDays(0), lines: lines.map(({ days, ...l }) => ({ ...l, medicineId: amox, expiryDate: inDays(days) })) } });
    expect((await buy([{ batchNo: 'P20', days: 20, quantity: 100, unitCostPaise: 300 }, { batchNo: 'P400', days: 400, quantity: 50, unitCostPaise: 200 }])).status).toBe(201);
    await rawBatch(t.main.id, amox, 'OLD', -3, 4); // expired: not sellable, so in no stock value

    const r = await report(pharm);
    expect(r.expiring).toEqual([
      { batchId: expect.any(Number), medicineId: amox, medicineName: 'Amoxicillin', form: 'tablet', strength: '250 mg', batchNo: 'P20', expiryDate: inDays(20), daysLeft: 20, quantity: 100, valuePaise: 50000, vendorName: 'Sri Pharma' },
      { batchId: expect.any(Number), medicineId: amox, medicineName: 'Amoxicillin', form: 'tablet', strength: '250 mg', batchNo: 'M40', expiryDate: inDays(40), daysLeft: 40, quantity: 10, valuePaise: 5000, vendorName: null },
    ]);
    // P400 is past the 90 days but still counts as stock: 160 units, cost known for the 150 bought on the bill.
    expect(r.summary).toMatchObject({ sellableUnits: 160, sellableValuePaise: 80000, costKnownUnits: 150, costValuePaise: 100 * 300 + 50 * 200, expiredValuePaise: 2000 });

    // Selling takes from the earliest expiry (P20): the report follows what is left.
    expect((await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: amox, quantity: 5 }], paymentMode: 'cash' } })).status).toBe(201);
    const after = await report(pharm);
    expect(after.expiring[0]).toMatchObject({ batchNo: 'P20', quantity: 95, valuePaise: 47500 });
    expect(after.summary).toMatchObject({ sellableUnits: 155, sellableValuePaise: 77500, costKnownUnits: 145, costValuePaise: 95 * 300 + 50 * 200 });

    // A cancelled bill takes its stock back out: its batch is in no list and no total.
    const { bill } = await json(buy([{ batchNo: 'WRONG', days: 15, quantity: 30, unitCostPaise: 100 }]));
    expect(batchNos((await report(pharm)).expiring)).toEqual(['WRONG', 'P20', 'M40']);
    expect((await pharm(`/api/b/main/purchases/${bill.id}/cancel`, { method: 'POST', body: { reason: 'Entered twice' } })).status).toBe(200);
    expect(await report(pharm)).toEqual(after);
  });

  it('low stock uses sellable stock only (an expired batch is not stock), lowest first', async () => {
    const pharm = await t.as('pharm');
    const three = await medicine(pharm, 'main', { name: 'Three left', strength: '5 mg' }, [{ batchNo: 'A', days: 300, quantity: 3 }]); // 3 <= 10
    const none = await medicine(pharm, 'main', { name: 'No batches' }); // 0
    await medicine(pharm, 'main', { name: 'Plenty', reorderLevel: 5 }, [{ batchNo: 'B', days: 300, quantity: 50 }]);
    const stale = await medicine(pharm, 'main', { name: 'Only expired', reorderLevel: 5 });
    await rawBatch(t.main.id, stale, 'C', -2, 50); // 50 on the shelf, none sellable
    const level = await medicine(pharm, 'main', { name: 'At the level' }, [{ batchNo: 'D', days: 300, quantity: 10 }]); // 10 <= 10

    const r = await report(pharm);
    expect(r.lowStock).toEqual([
      { id: none, name: 'No batches', form: 'tablet', strength: null, stock: 0, reorderLevel: 10 },
      { id: stale, name: 'Only expired', form: 'tablet', strength: null, stock: 0, reorderLevel: 5 },
      { id: three, name: 'Three left', form: 'tablet', strength: '5 mg', stock: 3, reorderLevel: 10 },
      { id: level, name: 'At the level', form: 'tablet', strength: null, stock: 10, reorderLevel: 10 },
    ]);
    expect(r.summary).toMatchObject({ medicines: 5, inStock: 3, outOfStock: 2, lowStock: 4, expired: 1 });
  });

  it('a deleted medicine appears nowhere', async () => {
    const pharm = await t.as('pharm');
    const gone = await medicine(pharm, 'main', { name: 'Gone' }, [{ batchNo: 'G1', days: 2, quantity: 1 }]);
    await rawBatch(t.main.id, gone, 'G0', -2, 5);
    expect((await report(pharm)).summary).toMatchObject({ medicines: 1, lowStock: 1, expiring30: 1, expired: 1 });
    expect((await pharm(`/api/b/main/medicines/${gone}`, { method: 'DELETE' })).status).toBe(200);
    const r = await report(pharm);
    expect(r).toMatchObject({ expiring: [], expired: [], lowStock: [] });
    expect(r.summary).toMatchObject({ medicines: 0, lowStock: 0, expiring90: 0, expired: 0, sellableUnits: 0, sellableValuePaise: 0, expiredValuePaise: 0 });
  });

  it("another branch's stock never appears; non-members get 404, roles without inventory.view get 403", async () => {
    const owner = await t.as('owner');
    const pharm = await t.as('pharm');
    const eastMed = await medicine(owner, 'east', { name: 'East only' }, [{ batchNo: 'E3', days: 3, quantity: 1 }]);
    await rawBatch(t.east.id, eastMed, 'E0', -3, 2);
    await medicine(pharm, 'main', { name: 'Main only', reorderLevel: 0 }, [{ batchNo: 'M3', days: 3, quantity: 9 }]);

    const main = await report(pharm);
    expect(batchNos(main.expiring)).toEqual(['M3']);
    expect(main).toMatchObject({ expired: [], lowStock: [], summary: { medicines: 1, expiring30: 1, expired: 0, sellableUnits: 9 } });
    const east = await report(owner, 'east');
    expect(batchNos(east.expiring)).toEqual(['E3']);
    expect(batchNos(east.expired)).toEqual(['E0']);
    expect(east.lowStock.map((m: any) => m.name)).toEqual(['East only']);

    expect((await pharm('/api/b/east/inventory/report')).status).toBe(404); // has inventory.view, but only in main
    expect((await (await t.as('desk'))('/api/b/main/inventory/report')).status).toBe(403);
    expect((await (await t.as('labtech'))('/api/b/main/inventory/report')).status).toBe(403);
  });
});
