// The OP workflow: stock in -> doctor prescribes + orders lab -> pharmacy dispenses (FEFO) -> lab collects.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

async function medicineWithStock(pharm: Caller, name: string, pricePaise: number, batches: { batchNo: string; days: number; quantity: number }[]) {
  const { id } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name, form: 'tablet', strength: '500 mg', pricePaise } }));
  for (const bt of batches) {
    const r = await pharm(`/api/b/main/medicines/${id}/batches`, { method: 'POST', body: { batchNo: bt.batchNo, expiryDate: inDays(bt.days), quantity: bt.quantity } });
    expect(r.status).toBe(201);
  }
  return id as number;
}

async function visitFor(caller: Caller, name: string) {
  const { patient } = await json(caller('/api/b/main/patients', { method: 'POST', body: { name } }));
  const { visit } = await json(caller(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: { complaint: 'Fever' } }));
  return visit as { id: number; opNo: string };
}

describe('inventory', () => {
  it('pharmacist adds medicines and stock; expired batches are refused; stock counts only unexpired', async () => {
    const pharm = await t.as('pharm');
    const id = await medicineWithStock(pharm, 'Paracetamol', 200, [{ batchNo: 'B1', days: 200, quantity: 20 }]);
    expect((await pharm(`/api/b/main/medicines/${id}/batches`, { method: 'POST', body: { batchNo: 'OLD', expiryDate: inDays(-1), quantity: 5 } })).status).toBe(400);
    const { medicines } = await json(pharm('/api/b/main/medicines'));
    expect(medicines[0]).toMatchObject({ name: 'Paracetamol', pricePaise: 200, stock: 20, nextExpiry: inDays(200) });
    expect((await pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'paracetamol', form: 'tablet', strength: '500 MG', pricePaise: 100 } })).status).toBe(409);
    const doc = await t.as('doc');
    expect((await doc('/api/b/main/medicines', { method: 'POST', body: { name: 'X', form: 'tablet', pricePaise: 1 } })).status).toBe(403);
    expect((await doc('/api/b/main/medicines')).status).toBe(200); // doctors can search while prescribing
  });
});

describe('prescription -> pharmacy', () => {
  it('quantity = dose x days; pharmacy sees the total; partial dispense takes earliest expiry first', async () => {
    const pharm = await t.as('pharm');
    const doc = await t.as('doc');
    const para = await medicineWithStock(pharm, 'Paracetamol', 200, [
      { batchNo: 'LATE', days: 300, quantity: 20 },
      { batchNo: 'SOON', days: 30, quantity: 5 },
    ]);
    const syrup = await medicineWithStock(pharm, 'Cough syrup', 9000, [{ batchNo: 'S1', days: 100, quantity: 3 }]);
    const v = await visitFor(doc, 'Ravi Kumar');

    const a = await json(doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 5, instructions: 'After food' } }));
    expect(a.quantity).toBe(10);
    expect((await doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: syrup, dose: 'SOS', days: 3 } })).status).toBe(400); // free-text dose needs a quantity
    await doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: syrup, dose: 'SOS', days: 3, quantity: 1 } });

    const desk = await t.as('desk');
    expect((await desk(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-1-1', days: 1 } })).status).toBe(403);

    const { queue } = await json(pharm('/api/b/main/pharmacy/queue'));
    expect(queue).toHaveLength(1);
    expect(queue[0].items.map((i: any) => [i.medicineName, i.quantity, i.pricePaise, i.stock])).toEqual([
      ['Paracetamol', 10, 200, 25],
      ['Cough syrup', 1, 9000, 3],
    ]);

    // Patient buys only the tablets, pays by UPI.
    const res = await pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [queue[0].items[0].id], paymentMode: 'upi' } });
    expect(res.status).toBe(201);
    const { sale } = await res.json();
    expect(sale.totalPaise).toBe(2000);
    expect(sale.saleNo).toMatch(/^PH-\d{6}-001$/);

    const batches = (await json(pharm(`/api/b/main/medicines/${para}/batches`))).batches.map((b: any) => [b.batchNo, b.quantity]);
    expect(batches).toEqual([['SOON', 0], ['LATE', 15]]); // 5 from the earliest expiry, then 5 more

    const items = (await json(doc(`/api/b/main/visits/${v.id}/prescription`))).items.map((i: any) => [i.medicineName, i.status]);
    expect(items).toEqual([['Paracetamol', 'dispensed'], ['Cough syrup', 'declined']]);
    expect((await json(pharm('/api/b/main/pharmacy/queue'))).queue).toEqual([]);

    // Can't sell the same line twice; dispensed lines can't be deleted.
    expect((await pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [queue[0].items[0].id], paymentMode: 'cash' } })).status).toBe(409);
    expect((await doc(`/api/b/main/prescription-items/${queue[0].items[0].id}`, { method: 'DELETE' })).status).toBe(409);

    const day = await json(pharm('/api/b/main/pharmacy/sales'));
    expect(day.totalPaise).toBe(2000);
    expect(day.sales[0].lines.map((l: any) => [l.batchNo, l.quantity])).toEqual([['SOON', 5], ['LATE', 5]]);
  });

  it('not enough stock: nothing is sold and stock is untouched', async () => {
    const pharm = await t.as('pharm');
    const doc = await t.as('doc');
    const para = await medicineWithStock(pharm, 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 4 }]);
    const v = await visitFor(doc, 'Asha Devi');
    await doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-1-1', days: 3 } }); // 9 needed
    const { queue } = await json(pharm('/api/b/main/pharmacy/queue'));
    const res = await pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [queue[0].items[0].id], paymentMode: 'cash' } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain('Paracetamol (need 9, have 4)');
    expect((await json(pharm(`/api/b/main/medicines/${para}/batches`))).batches[0].quantity).toBe(4);
    expect((await json(pharm('/api/b/main/pharmacy/queue'))).queue).toHaveLength(1);
  });

  it("another branch can't see or dispense this branch's prescriptions", async () => {
    const pharm = await t.as('pharm');
    const doc = await t.as('doc');
    const owner = await t.as('owner');
    const para = await medicineWithStock(pharm, 'Paracetamol', 200, [{ batchNo: 'B1', days: 100, quantity: 20 }]);
    const v = await visitFor(doc, 'Ravi Kumar');
    await doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 2 } });
    const { queue } = await json(pharm('/api/b/main/pharmacy/queue'));
    expect((await json(owner('/api/b/east/medicines'))).medicines).toEqual([]);
    expect((await json(owner('/api/b/east/pharmacy/queue'))).queue).toEqual([]);
    expect((await owner('/api/b/east/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [queue[0].items[0].id], paymentMode: 'cash' } })).status).toBe(404);
    expect((await owner(`/api/b/east/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 2 } })).status).toBe(404);
  });
});

describe('lab', () => {
  it('admin adds tests; doctor orders; lab collects the sample; front desk cannot order', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const lab = await t.as('labtech');
    const desk = await t.as('desk');
    const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const { id: sugar } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood sugar (fasting)', pricePaise: 8000 } }));
    expect((await doc('/api/b/main/lab/tests', { method: 'POST', body: { name: 'X ray', pricePaise: 1 } })).status).toBe(403);

    const v = await visitFor(doc, 'Ravi Kumar');
    expect((await desk(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } })).status).toBe(403);
    expect((await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc, sugar] } })).status).toBe(201);

    const { orders } = await json(lab('/api/b/main/lab/orders'));
    expect(orders.map((o: any) => [o.testName, o.status, o.opNo, o.patientName])).toEqual([
      ['CBC', 'ordered', v.opNo, 'Ravi Kumar'],
      ['Blood sugar (fasting)', 'ordered', v.opNo, 'Ravi Kumar'],
    ]);
    expect((await lab(`/api/b/main/lab/orders/${orders[0].id}`, { method: 'PATCH', body: { status: 'sample_collected' } })).status).toBe(200);
    expect((await doc(`/api/b/main/lab/orders/${orders[0].id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(409); // already collected
    expect((await doc(`/api/b/main/lab/orders/${orders[1].id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    const after = (await json(doc(`/api/b/main/visits/${v.id}/lab-orders`))).orders.map((o: any) => o.status);
    expect(after).toEqual(['sample_collected', 'cancelled']);
    expect((await json(owner('/api/b/east/lab/orders'))).orders).toEqual([]);
  });
});

describe('roles', () => {
  it('"Manage staff" can only be given to the Branch admin role', async () => {
    const owner = await t.as('owner');
    const { roles } = await json(owner('/api/org/roles'));
    const doctor = roles.find((r: any) => r.key === 'doctor');
    const admin = roles.find((r: any) => r.key === 'branch_admin');
    const r1 = await json(owner(`/api/org/roles/${doctor.id}/permissions`, { method: 'PUT', body: { permissions: [...doctor.permissions, 'users.manage', 'settings.manage'] } }));
    expect(r1.permissions).not.toContain('users.manage');
    expect(r1.permissions).not.toContain('settings.manage');
    const r2 = await json(owner(`/api/org/roles/${admin.id}/permissions`, { method: 'PUT', body: { permissions: admin.permissions } }));
    expect(r2.permissions).toContain('users.manage');
  });
});
