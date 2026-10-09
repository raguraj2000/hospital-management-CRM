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

async function visitFor(caller: Caller, branch: string, name: string) {
  const { patient } = await json(caller(`/api/b/${branch}/patients`, { method: 'POST', body: { name } }));
  const { visit } = await json(caller(`/api/b/${branch}/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  return visit as { id: number; opNo: string };
}

async function medicine(caller: Caller, branch: string, body: { name: string; strength?: string; pricePaise?: number; reorderLevel?: number }, batches: { batchNo: string; days: number; quantity: number }[] = []) {
  const { id } = await json(caller(`/api/b/${branch}/medicines`, { method: 'POST', body: { form: 'tablet', pricePaise: 200, ...body } }));
  for (const bt of batches) {
    const r = await caller(`/api/b/${branch}/medicines/${id}/batches`, { method: 'POST', body: { batchNo: bt.batchNo, expiryDate: inDays(bt.days), quantity: bt.quantity } });
    expect(r.status).toBe(201);
  }
  return id as number;
}

/** One bill payment and one pharmacy sale (4 tablets at 200 paise) in a branch, all by the owner. */
async function takeMoney(owner: Caller, branch: string, payments: { amountPaise: number; mode: string }[], saleMode: string) {
  await owner(`/api/b/${branch}/billing/settings`, { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const v = await visitFor(owner, branch, 'Ravi Kumar');
  const { bill } = await json(owner(`/api/b/${branch}/visits/${v.id}/bills`, { method: 'POST' }));
  for (const p of payments) expect((await owner(`/api/b/${branch}/bills/${bill.id}/payments`, { method: 'POST', body: p })).status).toBe(201);
  const med = await medicine(owner, branch, { name: 'Paracetamol', reorderLevel: 0 }, [{ batchNo: 'B1', days: 200, quantity: 50 }]);
  const item = await json(owner(`/api/b/${branch}/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 2 } }));
  const sold = await owner(`/api/b/${branch}/pharmacy/dispense`, { method: 'POST', body: { visitId: v.id, itemIds: [item.id], paymentMode: saleMode } });
  expect(sold.status).toBe(201);
}

it('dashboard counts only this branch: totals, today, 14-day series, recent 5', async () => {
  const owner = await t.as('owner');
  for (const name of ['A One', 'B Two', 'C Three']) await owner('/api/b/main/patients', { method: 'POST', body: { name } });
  await owner('/api/b/east/patients', { method: 'POST', body: { name: 'East Only' } });

  const d = await (await owner('/api/b/main/dashboard')).json();
  expect(d.patients).toBe(3);
  expect(d.newPatientsToday).toBe(3);
  expect(d.last14Days).toHaveLength(14);
  expect(d.last14Days.at(-1).count).toBe(3); // today is the last bar
  expect(d.last14Days.reduce((s: number, x: { count: number }) => s + x.count, 0)).toBe(3);
  expect(d.recent.map((p: { name: string }) => p.name)).toEqual(['C Three', 'B Two', 'A One']);

  const lab = await t.as('labtech');
  expect((await lab('/api/b/east/dashboard')).status).toBe(404); // not a member of east
});

describe("owner's daily view", () => {
  it("collection = bill payments + pharmacy sales by mode; another branch's money is not counted", async () => {
    const owner = await t.as('owner');
    expect((await json(owner('/api/b/main/dashboard'))).collectionToday).toEqual({ cashPaise: 0, upiPaise: 0, cardPaise: 0, totalPaise: 0 });

    await takeMoney(owner, 'main', [{ amountPaise: 15000, mode: 'cash' }, { amountPaise: 5000, mode: 'upi' }], 'card');
    const before = (await json(owner('/api/b/main/dashboard'))).collectionToday;
    expect(before).toEqual({ cashPaise: 15000, upiPaise: 5000, cardPaise: 800, totalPaise: 20800 });

    await takeMoney(owner, 'east', [{ amountPaise: 20000, mode: 'cash' }], 'cash');
    expect((await json(owner('/api/b/main/dashboard'))).collectionToday).toEqual(before);
    expect((await json(owner('/api/b/east/dashboard'))).collectionToday).toEqual({ cashPaise: 20800, upiPaise: 0, cardPaise: 0, totalPaise: 20800 });
  });

  it('low stock and near expiry list the right medicines of this branch only', async () => {
    const owner = await t.as('owner');
    const pharm = await t.as('pharm');
    const amox = await medicine(pharm, 'main', { name: 'Amoxicillin', strength: '250 mg' }, [{ batchNo: 'A1', days: 300, quantity: 3 }]); // 3 <= 10: low
    const bruf = await medicine(pharm, 'main', { name: 'Brufen' }); // no batches = 0: low
    const cetz = await medicine(pharm, 'main', { name: 'Cetirizine', reorderLevel: 5 }, [
      { batchNo: 'C31', days: 31, quantity: 50 }, // one day past the window
      { batchNo: 'C30', days: 30, quantity: 50 }, // last day of the window
    ]);
    const dolo = await medicine(pharm, 'main', { name: 'Dolo', strength: '650 mg', reorderLevel: 0 }, [{ batchNo: 'D5', days: 5, quantity: 20 }]);
    // Already expired (the API refuses these, so straight into the table): neither stock nor "near expiry".
    await t.db.insert(medicineBatch).values({ branchId: t.main.id, medicineId: dolo, batchNo: 'DOLD', expiryDate: inDays(-1), quantity: 7, receivedQty: 7 });
    // A deleted medicine is in neither list.
    const gone = await medicine(pharm, 'main', { name: 'Gone' }, [{ batchNo: 'G1', days: 2, quantity: 1 }]);
    expect((await pharm(`/api/b/main/medicines/${gone}`, { method: 'DELETE' })).status).toBe(200);
    // Low and expiring soon, but in the other branch.
    await medicine(owner, 'east', { name: 'East only' }, [{ batchNo: 'E1', days: 3, quantity: 1 }]);

    const { stock } = await json(owner('/api/b/main/dashboard'));
    expect(stock).toEqual({
      lowStockCount: 2,
      lowStock: [
        { id: bruf, name: 'Brufen', strength: null, stock: 0, reorderLevel: 10 },
        { id: amox, name: 'Amoxicillin', strength: '250 mg', stock: 3, reorderLevel: 10 },
      ],
      nearExpiryCount: 2,
      nearExpiry: [
        { medicineId: dolo, name: 'Dolo', strength: '650 mg', batchNo: 'D5', expiryDate: inDays(5), quantity: 20 },
        { medicineId: cetz, name: 'Cetirizine', strength: null, batchNo: 'C30', expiryDate: inDays(30), quantity: 50 },
      ],
    });
    const east = (await json(owner('/api/b/east/dashboard'))).stock;
    expect(east.lowStock.map((m: any) => m.name)).toEqual(['East only']);
    expect(east.nearExpiry.map((b: any) => b.batchNo)).toEqual(['E1']);
  });

  it('lists at most 5 rows; the counts cover everything', async () => {
    const pharm = await t.as('pharm');
    for (let i = 1; i <= 6; i++) await medicine(pharm, 'main', { name: `Medicine ${i}` }, [{ batchNo: `B${i}`, days: i, quantity: i }]);
    const { stock } = await json(pharm('/api/b/main/dashboard'));
    expect(stock.lowStockCount).toBe(6);
    expect(stock.lowStock.map((m: any) => m.stock)).toEqual([1, 2, 3, 4, 5]); // lowest stock first
    expect(stock.nearExpiryCount).toBe(6);
    expect(stock.nearExpiry.map((b: any) => b.expiryDate)).toEqual([1, 2, 3, 4, 5].map(inDays)); // earliest expiry first
  });

  it('labPending counts only unfinished lab orders of this branch', async () => {
    const owner = await t.as('owner');
    const lab = await t.as('labtech');
    const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const v = await visitFor(owner, 'main', 'Ravi Kumar');
    for (let i = 0; i < 4; i++) expect((await owner(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } })).status).toBe(201);
    expect((await json(lab('/api/b/main/dashboard'))).labPending).toBe(4);

    // One stays "ordered", one is collected, one completed, one cancelled.
    const { orders } = await json(lab('/api/b/main/lab/orders'));
    expect((await lab(`/api/b/main/lab/orders/${orders[1].id}`, { method: 'PATCH', body: { status: 'sample_collected' } })).status).toBe(200);
    expect((await lab(`/api/b/main/lab/orders/${orders[2].id}/results`, { method: 'PUT', body: { results: [], complete: true } })).status).toBe(200);
    expect((await owner(`/api/b/main/lab/orders/${orders[3].id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    expect((await json(lab('/api/b/main/dashboard'))).labPending).toBe(2);

    const { id: eastTest } = await json(owner('/api/b/east/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const ev = await visitFor(owner, 'east', 'East Only');
    expect((await owner(`/api/b/east/visits/${ev.id}/lab-orders`, { method: 'POST', body: { testIds: [eastTest] } })).status).toBe(201);
    expect((await json(lab('/api/b/main/dashboard'))).labPending).toBe(2);
    expect((await json(owner('/api/b/east/dashboard'))).labPending).toBe(1);
  });

  it('each part needs its own permission, else it is null', async () => {
    const owner = await t.as('owner');
    await takeMoney(owner, 'main', [{ amountPaise: 20000, mode: 'cash' }], 'upi'); // so nothing is null for lack of data
    // The default Front desk and Pharmacist roles hold both billing.receive and pharmacy.sell; narrow them to one part each.
    const { roles } = await json(owner('/api/org/roles'));
    const setRole = (key: string, permissions: string[]) => owner(`/api/org/roles/${roles.find((r: any) => r.key === key).id}/permissions`, { method: 'PUT', body: { permissions } });
    await setRole('front_desk', ['dashboard.view', 'billing.receive']);
    await setRole('pharmacist', ['dashboard.view', 'inventory.view']);

    const lab = await json((await t.as('labtech'))('/api/b/main/dashboard')); // lab.view only
    expect(lab).toMatchObject({ patients: 1, collectionToday: null, stock: null, labPending: 0 });

    const desk = await json((await t.as('desk'))('/api/b/main/dashboard')); // billing.receive only
    expect(desk).toMatchObject({ labPending: null, stock: null, collectionToday: { cashPaise: 20000, upiPaise: 800, cardPaise: 0, totalPaise: 20800 } });

    const pharm = await json((await t.as('pharm'))('/api/b/main/dashboard')); // inventory.view only
    expect(pharm).toMatchObject({ collectionToday: null, labPending: null, stock: { lowStockCount: 0, nearExpiryCount: 0 } });
  });
});
