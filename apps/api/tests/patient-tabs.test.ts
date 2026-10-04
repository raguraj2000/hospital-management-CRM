// The patient page's Bills and Lab tabs: one patient's bills, pharmacy sales and lab orders over all visits.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json();

/** Ravi with two visits (CBC on the first, blood sugar on the second) and Meena with one (CBC). */
async function twoPatients(owner: Caller, doc: Caller) {
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
  const { id: sugar } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood sugar', pricePaise: 8000 } }));
  const newPatient = async (name: string) => (await json(doc('/api/b/main/patients', { method: 'POST', body: { name } }))).patient as { id: number };
  const newVisit = async (patientId: number, testId: number) => {
    const { visit } = await json(doc(`/api/b/main/patients/${patientId}/visits`, { method: 'POST', body: {} }));
    expect((await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } })).status).toBe(201);
    return visit as { id: number; opNo: string; token: number };
  };
  const ravi = await newPatient('Ravi Kumar');
  const meena = await newPatient('Meena S');
  const v1 = await newVisit(ravi.id, cbc);
  const other = await newVisit(meena.id, cbc);
  const v2 = await newVisit(ravi.id, sugar);
  return { ravi, meena, v1, v2, other };
}

/** Takes away a default role's permissions except these (roles are edited by the owner). */
async function setRole(owner: Caller, key: string, permissions: string[]) {
  const { roles } = await json(owner('/api/org/roles'));
  const res = await owner(`/api/org/roles/${roles.find((r: any) => r.key === key).id}/permissions`, { method: 'PUT', body: { permissions } });
  expect(res.status).toBe(200);
}

describe("a patient's lab orders (Lab tab)", () => {
  it('lists this patient over two visits, newest first; paid / released follow the visit', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const lab = await t.as('labtech');
    const { ravi, meena, v1, v2 } = await twoPatients(owner, doc);
    const orders = async () => (await json(lab(`/api/b/main/patients/${ravi.id}/lab-orders`))).orders;
    const flags = async () => (await orders()).map((o: any) => [o.testName, o.paid, o.released, o.printAllowed]);

    // Before any payment.
    const first = await orders();
    expect(first.map((o: any) => [o.testName, o.visitId, o.opNo, o.token, o.status, o.pricePaise])).toEqual([
      ['Blood sugar', v2.id, v2.opNo, v2.token, 'ordered', 8000],
      ['CBC', v1.id, v1.opNo, v1.token, 'ordered', 30000],
    ]);
    expect(first[0]).toMatchObject({ visitDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), createdAt: expect.any(String), completedAt: null });
    expect(await flags()).toEqual([['Blood sugar', false, false, false], ['CBC', false, false, false]]);
    expect((await json(lab(`/api/b/main/patients/${meena.id}/lab-orders`))).orders.map((o: any) => o.testName)).toEqual(['CBC']);

    // Billed but not paid: still not printable. Paid in full: only that visit.
    const { bill } = await json(desk(`/api/b/main/visits/${v1.id}/bills`, { method: 'POST' }));
    expect(await flags()).toEqual([['Blood sugar', false, false, false], ['CBC', false, false, false]]);
    await desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: bill.totalPaise, mode: 'cash' } });
    expect(await flags()).toEqual([['Blood sugar', false, false, false], ['CBC', true, false, true]]);
    // The same answer as the report endpoint.
    expect((await lab(`/api/b/main/visits/${v1.id}/lab-report?print=1`)).status).toBe(200);
    expect((await lab(`/api/b/main/visits/${v2.id}/lab-report?print=1`)).status).toBe(402);

    // Admin release of the second visit: printable though unpaid.
    expect((await owner(`/api/b/main/visits/${v2.id}/lab-release`, { method: 'POST', body: { reason: 'Emergency, pay later' } })).status).toBe(200);
    expect(await flags()).toEqual([['Blood sugar', false, true, true], ['CBC', true, false, true]]);

    // Completed shows its date.
    const report = await json(lab(`/api/b/main/visits/${v2.id}/lab-report`));
    await lab(`/api/b/main/lab/orders/${report.tests[0].orderId}/results`, { method: 'PUT', body: { results: [{ parameterId: report.tests[0].parameters[0].id, value: '98' }], complete: true } });
    expect((await orders())[0]).toMatchObject({ status: 'completed', completedAt: expect.any(String) });

    // A cancelled order stays in the list; the orders of a deleted visit do not (its pages are gone).
    const { id: extra } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Urine routine', pricePaise: 5000 } }));
    await doc(`/api/b/main/visits/${v2.id}/lab-orders`, { method: 'POST', body: { testIds: [extra] } });
    const added = (await orders())[0];
    expect((await doc(`/api/b/main/lab/orders/${added.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    expect((await orders()).map((o: any) => [o.testName, o.status])).toEqual([['Urine routine', 'cancelled'], ['Blood sugar', 'completed'], ['CBC', 'ordered']]);
    expect((await owner(`/api/b/main/visits/${v2.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await orders()).map((o: any) => o.testName)).toEqual(['CBC']);
  });

  it('another branch and a missing patient answer 404; without patient.view it is 403', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const lab = await t.as('labtech');
    const { ravi } = await twoPatients(owner, doc);
    expect((await owner(`/api/b/east/patients/${ravi.id}/lab-orders`)).status).toBe(404);
    expect((await owner('/api/b/main/patients/99999/lab-orders')).status).toBe(404);
    expect((await owner('/api/b/main/patients/abc/lab-orders')).status).toBe(404);
    expect((await lab(`/api/b/main/patients/${ravi.id}/lab-orders`)).status).toBe(200);
    await setRole(owner, 'lab_technician', ['dashboard.view', 'billing.receive']);
    expect((await lab(`/api/b/main/patients/${ravi.id}/lab-orders`)).status).toBe(403);
    // A deleted patient is gone here too.
    await owner(`/api/b/main/patients/${ravi.id}`, { method: 'DELETE' });
    expect((await owner(`/api/b/main/patients/${ravi.id}/lab-orders`)).status).toBe(404);
  });
});

describe("a patient's bills (Bills tab)", () => {
  it('OP bills over two visits and pharmacy sales with and without a visit; none of another patient', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const desk = await t.as('desk');
    const pharm = await t.as('pharm');
    const lab = await t.as('labtech');
    const { ravi, meena, v1, v2, other } = await twoPatients(owner, doc);

    const empty = await json(pharm(`/api/b/main/patients/${ravi.id}/bills`));
    expect(empty).toEqual({ bills: [], pharmacy: [], summary: { billedPaise: 0, paidPaise: 0, balancePaise: 0, pharmacyPaise: 0 } });

    const b1 = (await json(desk(`/api/b/main/visits/${v1.id}/bills`, { method: 'POST' }))).bill; // 20000 + 30000
    await json(desk(`/api/b/main/visits/${other.id}/bills`, { method: 'POST' })); // Meena's
    const b2 = (await json(desk(`/api/b/main/visits/${v2.id}/bills`, { method: 'POST' }))).bill; // 20000 + 8000
    await desk(`/api/b/main/bills/${b1.id}/payments`, { method: 'POST', body: { amountPaise: 40000, mode: 'cash' } });

    // Pharmacy: one sale from Ravi's prescription, one direct sale to Ravi, one to Meena, one walk-in.
    const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
    const expiry = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10);
    expect((await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: expiry, quantity: 50 } })).status).toBe(201);
    const item = await json(doc(`/api/b/main/visits/${v1.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 2 } }));
    const fromVisit = (await json(pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v1.id, itemIds: [item.id], paymentMode: 'upi' } }))).sale;
    const direct = (await json(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 3 }], paymentMode: 'cash', patientId: ravi.id } }))).sale;
    await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 1 }], paymentMode: 'cash', patientId: meena.id } });
    await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: med, quantity: 1 }], paymentMode: 'cash' } });

    const got = await json(pharm(`/api/b/main/patients/${ravi.id}/bills`));
    expect(got.bills.map((b: any) => [b.billNo, b.visitId, b.opNo, b.token, b.totalPaise, b.paidPaise, b.balancePaise, b.status])).toEqual([
      [b2.billNo, v2.id, v2.opNo, v2.token, 28000, 0, 28000, 'unpaid'],
      [b1.billNo, v1.id, v1.opNo, v1.token, 50000, 40000, 10000, 'part_paid'],
    ]);
    expect(got.bills[0].billDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(got.pharmacy).toEqual([
      { id: direct.id, saleNo: direct.saleNo, createdAt: expect.any(String), totalPaise: 600, paymentMode: 'cash', visitId: null, opNo: null, direct: true },
      { id: fromVisit.id, saleNo: fromVisit.saleNo, createdAt: expect.any(String), totalPaise: 800, paymentMode: 'upi', visitId: v1.id, opNo: v1.opNo, direct: false },
    ]);
    expect(got.summary).toEqual({ billedPaise: 78000, paidPaise: 40000, balancePaise: 38000, pharmacyPaise: 1400 });

    // Meena has only her own.
    const hers = await json(pharm(`/api/b/main/patients/${meena.id}/bills`));
    expect(hers.bills.map((b: any) => b.visitId)).toEqual([other.id]);
    expect(hers.pharmacy.map((s: any) => s.totalPaise)).toEqual([200]);

    // Money by role: OP bills as on the visit page (anyone with patient.view); pharmacy sales only with pharmacy.sell.
    expect(await json(owner(`/api/b/main/patients/${ravi.id}/bills`))).toEqual(got);
    for (const caller of [desk, lab, doc]) {
      const seen = await json(caller(`/api/b/main/patients/${ravi.id}/bills`));
      expect(seen.bills).toEqual(got.bills);
      expect(seen.bills).toEqual([...(await json(caller(`/api/b/main/visits/${v2.id}/bills`))).bills, ...(await json(caller(`/api/b/main/visits/${v1.id}/bills`))).bills]);
      expect(seen.pharmacy).toBeNull();
      expect(seen.summary).toEqual({ billedPaise: 78000, paidPaise: 40000, balancePaise: 38000, pharmacyPaise: null });
    }
  });

  it('another branch and a missing patient answer 404; without either permission it is 403', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const lab = await t.as('labtech');
    const { ravi } = await twoPatients(owner, doc);
    expect((await owner(`/api/b/east/patients/${ravi.id}/bills`)).status).toBe(404);
    expect((await owner('/api/b/main/patients/99999/bills')).status).toBe(404);
    expect((await lab(`/api/b/main/patients/${ravi.id}/bills`)).status).toBe(200);
    await setRole(owner, 'lab_technician', ['dashboard.view', 'lab.view']);
    expect((await lab(`/api/b/main/patients/${ravi.id}/bills`)).status).toBe(403);
    await setRole(owner, 'lab_technician', ['dashboard.view', 'billing.receive']); // billing alone is enough, as for a visit's bills
    expect((await lab(`/api/b/main/patients/${ravi.id}/bills`)).status).toBe(200);
    await owner(`/api/b/main/patients/${ravi.id}`, { method: 'DELETE' });
    expect((await owner(`/api/b/main/patients/${ravi.id}/bills`)).status).toBe(404);
  });
});
