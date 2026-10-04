import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json();
const day = (n = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function medicine(pharm: Caller, name: string) {
  return (await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name, form: 'tablet', pricePaise: 300 } }))).id as number;
}

describe('vendors & purchase bills', () => {
  it('a purchase bill adds stock, sets the due date from credit days, takes part payments', async () => {
    const pharm = await t.as('pharm');
    const para = await medicine(pharm, 'Paracetamol');
    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'Sri Pharma', gstNo: '33abcde1234f1z5', creditDays: 30 } }));
    const res = await pharm('/api/b/main/purchases', {
      method: 'POST',
      body: { vendorId, vendorBillNo: 'SP-778', billDate: day(), lines: [{ medicineId: para, batchNo: 'PX1', expiryDate: day(400), quantity: 100, unitCostPaise: 150 }] },
    });
    expect(res.status).toBe(201);
    const { bill } = await res.json();
    expect(bill).toMatchObject({ totalPaise: 15000, paidPaise: 0, status: 'unpaid', dueDate: day(30), overdue: false });

    const meds = (await json(pharm('/api/b/main/medicines'))).medicines;
    expect(meds[0].stock).toBe(100);

    const v = (await json(pharm('/api/b/main/vendors'))).vendors[0];
    expect(v).toMatchObject({ name: 'Sri Pharma', gstNo: '33ABCDE1234F1Z5', duePaise: 15000 });

    expect((await pharm(`/api/b/main/purchases/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 20000, mode: 'cash' } })).status).toBe(400); // more than due
    const after = (await json(pharm(`/api/b/main/purchases/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 5000, mode: 'upi', reference: 'UTR123' } }))).bill;
    expect(after).toMatchObject({ paidPaise: 5000, status: 'part_paid', canCancel: false });
    expect((await pharm(`/api/b/main/vendors/${vendorId}`, { method: 'DELETE' })).status).toBe(409); // dues left
  });

  it('cancel only while unused and unpaid; cancelling removes the stock', async () => {
    const pharm = await t.as('pharm');
    const para = await medicine(pharm, 'Paracetamol');
    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'Sri Pharma' } }));
    const { bill } = await json(pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: day(), lines: [{ medicineId: para, batchNo: 'PX1', expiryDate: day(400), quantity: 50, unitCostPaise: 100 }] } }));
    expect(bill.canCancel).toBe(true);
    expect((await pharm(`/api/b/main/purchases/${bill.id}/cancel`, { method: 'POST', body: { reason: 'x' } })).status).toBe(400); // reason too short
    const cancelled = (await json(pharm(`/api/b/main/purchases/${bill.id}/cancel`, { method: 'POST', body: { reason: 'Entered twice' } }))).bill;
    expect(cancelled.status).toBe('cancelled');
    expect((await json(pharm('/api/b/main/medicines'))).medicines[0].stock).toBe(0);
    expect((await pharm(`/api/b/main/purchases/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 100, mode: 'cash' } })).status).toBe(409);
  });

  it('refuses expired lines, future dates, other branches; front desk has no access', async () => {
    const pharm = await t.as('pharm');
    const owner = await t.as('owner');
    const desk = await t.as('desk');
    const para = await medicine(pharm, 'Paracetamol');
    const { id: vendorId } = await json(pharm('/api/b/main/vendors', { method: 'POST', body: { name: 'Sri Pharma' } }));
    const line = { medicineId: para, batchNo: 'PX1', expiryDate: day(400), quantity: 5, unitCostPaise: 100 };
    expect((await pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: day(), lines: [{ ...line, expiryDate: day(-1) }] } })).status).toBe(400);
    expect((await pharm('/api/b/main/purchases', { method: 'POST', body: { vendorId, billDate: day(2), lines: [line] } })).status).toBe(400);
    expect((await owner('/api/b/east/purchases', { method: 'POST', body: { vendorId, billDate: day(), lines: [line] } })).status).toBe(404);
    expect((await json(owner('/api/b/east/vendors'))).vendors).toEqual([]);
    expect((await desk('/api/b/main/vendors')).status).toBe(403);
  });
});

describe('patient billing', () => {
  async function visitWithLab(owner: Caller, doc: Caller) {
    await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
    const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
    const { id: sugar } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood sugar', pricePaise: 8000 } }));
    const { patient } = await json(doc('/api/b/main/patients', { method: 'POST', body: { name: 'Ravi Kumar' } }));
    const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
    await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } });
    return { visit, cbc, sugar };
  }

  it('bill = consultation + lab - discount; part payments; locked after first payment', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const { visit } = await visitWithLab(owner, doc);

    const todo = (await json(desk('/api/b/main/billing/to-bill'))).visits;
    expect(todo.map((v: any) => [v.opNo, v.hasBill, v.unbilledLabPaise])).toEqual([[visit.opNo, false, 30000]]);

    const { bill } = await json(desk(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' }));
    expect(bill).toMatchObject({ consultationFeePaise: 20000, totalPaise: 50000, status: 'unpaid', editable: true });
    expect(bill.billNo).toMatch(/^BL-\d{6}-001$/);
    expect(bill.lines.map((l: any) => [l.description, l.amountPaise])).toEqual([['CBC', 30000]]);
    expect((await desk(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' })).status).toBe(409); // already has an open bill

    expect((await desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { discountPaise: 60000 } })).status).toBe(400);
    const discounted = (await json(desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { discountPaise: 5000, otherChargesPaise: 1000, otherChargesLabel: 'Dressing' } }))).bill;
    expect(discounted.totalPaise).toBe(46000);

    const part = (await json(desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 40000, mode: 'cash' } }))).bill;
    expect(part).toMatchObject({ paidPaise: 40000, balancePaise: 6000, status: 'part_paid', editable: false });
    expect((await desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { discountPaise: 0 } })).status).toBe(409);
    expect((await desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 7000, mode: 'upi' } })).status).toBe(400);
    const full = (await json(desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 6000, mode: 'upi' } }))).bill;
    expect(full.status).toBe('paid');

    const col = await json(desk('/api/b/main/billing/collection'));
    expect(col.bills).toEqual({ cash: 40000, upi: 6000, card: 0 });
    expect(col.totalPaise).toBe(46000);
    expect((await json(desk('/api/b/main/bills'))).bills).toEqual([]); // nothing due
  });

  it('lab report prints only after payment (or admin release); cancelling a billed test', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const lab = await t.as('labtech');
    const { visit, sugar } = await visitWithLab(owner, doc);

    const unpaid = await lab(`/api/b/main/visits/${visit.id}/lab-report?print=1`);
    expect(unpaid.status).toBe(402);
    expect((await unpaid.json()).code).toBe('unpaid');
    expect((await lab(`/api/b/main/visits/${visit.id}/lab-report`)).status).toBe(200); // results entry still works

    const { bill } = await json(desk(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' }));
    // Doctor adds a test before payment: the bill picks it up on the next change.
    await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [sugar] } });
    const synced = (await json(desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: {} }))).bill;
    expect(synced.totalPaise).toBe(58000);
    // Cancel the sugar test while unpaid: it leaves the bill.
    const sugarOrder = synced.lines.find((l: any) => l.description === 'Blood sugar').labOrderId;
    expect((await doc(`/api/b/main/lab/orders/${sugarOrder}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    expect((await json(desk(`/api/b/main/bills/${bill.id}`))).bill.totalPaise).toBe(50000);

    await desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 50000, mode: 'card' } });
    expect((await lab(`/api/b/main/visits/${visit.id}/lab-report?print=1`)).status).toBe(200);
    const cbcOrder = (await json(desk(`/api/b/main/bills/${bill.id}`))).bill.lines[0].labOrderId;
    expect((await doc(`/api/b/main/lab/orders/${cbcOrder}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(409); // paid

    // A test ordered after payment needs a new bill (no consultation fee on it).
    await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [sugar] } });
    expect((await lab(`/api/b/main/visits/${visit.id}/lab-report?print=1`)).status).toBe(402);
    const second = (await json(desk(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' }))).bill;
    expect(second).toMatchObject({ consultationFeePaise: 0, totalPaise: 8000 });

    // Admin release with a reason; doctors can't release.
    expect((await doc(`/api/b/main/visits/${visit.id}/lab-release`, { method: 'POST', body: { reason: 'Emergency' } })).status).toBe(403);
    expect((await owner(`/api/b/main/visits/${visit.id}/lab-release`, { method: 'POST', body: { reason: 'Emergency, pay later' } })).status).toBe(200);
    expect((await lab(`/api/b/main/visits/${visit.id}/lab-report?print=1`)).status).toBe(200);
  });

  it('billing is per branch and needs billing permission', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const { visit } = await visitWithLab(owner, doc);
    expect((await owner(`/api/b/east/visits/${visit.id}/bills`, { method: 'POST' })).status).toBe(404);
    expect((await doc(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' })).status).toBe(403);
    expect((await doc('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 1 } })).status).toBe(403);
  });
});
