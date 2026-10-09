// Bugs found on 8 Oct 2026, each with the test that would have caught it; and the extra charges of a bill.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { labOrder, opVisit } from '../src/db/schema.js';
import { setup } from './helpers.js';

type Caller = Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['as']>>;
let t: Awaited<ReturnType<typeof setup>>;
let owner: Caller, doc: Caller, desk: Caller, pharm: Caller, lab: Caller, eastdesk: Caller;
let cbc: number, para: number;
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const statusOf = async (visitId: number) => (await t.db.select({ status: opVisit.status }).from(opVisit).where(eq(opVisit.id, visitId)))[0]!.status as string;

beforeAll(async () => {
  t = await setup();
  [owner, doc, desk, pharm, lab, eastdesk] = await Promise.all(['owner', 'doc', 'desk', 'pharm', 'labtech', 'eastdesk'].map((n) => t.as(n)));
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  cbc = (await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }))).id;
  para = (await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }))).id;
  await pharm(`/api/b/main/medicines/${para}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: inDays(200), quantity: 100 } });
});
afterAll(() => t.cleanup());

async function visit(name: string, phone?: string) {
  const { patient } = await json(desk('/api/b/main/patients', { method: 'POST', body: { name, phone } }));
  const { visit: v } = await json(desk(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  return { id: v.id as number, patientId: patient.id as number };
}
const pay = (visitId: number, amountPaise: number, extra: object = {}) => desk(`/api/b/main/visits/${visitId}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise, ...extra } });

describe('a fee taken before the doctor', () => {
  it('leaves the patient in the queue; sent to the counter with nothing left, the visit completes', async () => {
    const v = await visit('Prepaid Patient');
    const done = await json(pay(v.id, 20000));
    expect(done).toMatchObject({ bill: { status: 'paid' }, visitStatus: 'waiting' });
    expect(await statusOf(v.id)).toBe('waiting');
    expect((await json(desk('/api/b/main/visits'))).queue.next.visit.id).toBe(v.id); // still the next one to go in

    const sent = await json(doc(`/api/b/main/visits/${v.id}/send`, { method: 'POST', body: { to: 'counter' } }));
    expect(sent.visit.status).toBe('completed'); // nothing to collect or give at the counter
  });

  it('sent to the counter with a bill that is not paid yet, the visit waits at the counter', async () => {
    const v = await visit('Billed Not Paid');
    await desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' });
    expect((await json(doc(`/api/b/main/visits/${v.id}/send`, { method: 'POST', body: { to: 'counter' } }))).visit.status).toBe('at_counter');
    expect((await json(pay(v.id, 20000))).visitStatus).toBe('completed');
  });

  it('sent to the counter with medicines waiting, the visit stays at the counter until they are given', async () => {
    const v = await visit('Prepaid With Medicines');
    await pay(v.id, 20000);
    const { id: item } = await json(doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 2 } }));
    expect((await json(doc(`/api/b/main/visits/${v.id}/send`, { method: 'POST', body: { to: 'counter' } }))).visit.status).toBe('at_counter');
    const owner2 = await json(owner(`/api/b/main/visits/${v.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 800, itemIds: [item] } }));
    expect(owner2.visitStatus).toBe('completed');
  });
});

describe('a visit with no doctor chosen', () => {
  it("is in every doctor's queue; the doctor who calls the patient in becomes their doctor", async () => {
    const v = await visit('No Doctor Chosen');
    const mine = (await json(doc('/api/b/main/visits'))).queue;
    expect(mine.next?.visit.id).toBe(v.id);
    const called = await json(doc('/api/b/main/visits/call-next', { method: 'POST', body: {} }));
    expect(called.visit).toMatchObject({ id: v.id, status: 'with_doctor', doctorName: 'doc' });
    await doc(`/api/b/main/visits/${v.id}/send`, { method: 'POST', body: { to: 'counter' } });
  });
});

describe('patient search', () => {
  it('a digit in a name does not match every phone with that digit; a typed phone number still finds the patient', async () => {
    await visit('Ravi Kumar 2', '9876500001');
    await visit('Meena Devi', '9123456782');
    const names = async (q: string) => (await json(desk(`/api/b/main/patients?q=${encodeURIComponent(q)}`))).patients.map((p: any) => p.name);
    expect(await names('kumar 2')).toEqual(['Ravi Kumar 2']);
    expect(await names('91234 567')).toEqual(['Meena Devi']);
    expect(await names('+91 98765')).toEqual(['Ravi Kumar 2']);
  });
});

describe('a cancelled visit', () => {
  it('leaves the lab queue and the pharmacy queue, and nothing can be dispensed for it', async () => {
    const v = await visit('Cancelled Patient');
    await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } });
    const { id: item } = await json(doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: para, dose: '1-0-1', days: 2 } }));
    const inLab = async () => (await json(lab('/api/b/main/lab/orders'))).orders.some((o: any) => o.visitId === v.id);
    const inPharmacy = async () => (await json(pharm('/api/b/main/pharmacy/queue'))).queue.some((q: any) => q.visitId === v.id);
    expect([await inLab(), await inPharmacy()]).toEqual([true, true]);
    const pendingBefore = (await json(owner('/api/b/main/dashboard'))).labPending;

    expect((await desk(`/api/b/main/visits/${v.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    expect([await inLab(), await inPharmacy()]).toEqual([false, false]);
    expect((await json(owner('/api/b/main/dashboard'))).labPending).toBe(pendingBefore - 1);
    const res = await pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: v.id, itemIds: [item], paymentMode: 'cash' } });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('visit_cancelled');
  });
});

describe('deleting', () => {
  it('a visit or a patient with a bill is refused; without one it is allowed', async () => {
    const billed = await visit('Billed Patient');
    await pay(billed.id, 20000);
    const a = await owner(`/api/b/main/visits/${billed.id}`, { method: 'DELETE' });
    expect([a.status, (await a.json()).code]).toEqual([409, 'has_bills']);
    const b = await owner(`/api/b/main/patients/${billed.patientId}`, { method: 'DELETE' });
    expect([b.status, (await b.json()).code]).toEqual([409, 'has_bills']);

    const plain = await visit('Plain Patient');
    expect((await owner(`/api/b/main/visits/${plain.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await owner(`/api/b/main/patients/${plain.patientId}`, { method: 'DELETE' })).status).toBe(200);
  });
});

describe('extra charges on a bill', () => {
  it('several charges are kept, replaced as a whole, printed on the checkout and counted as "other" in the day report', async () => {
    const v = await visit('Charges Patient');
    await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } });
    const { bill } = await json(desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }));
    const before = (await json(desk('/api/b/main/billing/day-report'))).billed;

    const two = await json(desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { charges: [{ description: 'Dressing', amountPaise: 5000 }, { description: 'Injection', amountPaise: 2500 }] } }));
    expect(two.bill.totalPaise).toBe(20000 + 30000 + 7500);
    expect(two.bill.lines.map((l: any) => [l.description, l.amountPaise, l.labOrderId != null])).toEqual([['CBC', 30000, true], ['Dressing', 5000, false], ['Injection', 2500, false]]);
    const co = await json(desk(`/api/b/main/visits/${v.id}/checkout`));
    expect(co.bill).toMatchObject({ charges: [{ description: 'Dressing', amountPaise: 5000 }, { description: 'Injection', amountPaise: 2500 }], labLines: [{ description: 'CBC', amountPaise: 30000, billed: true }], duePaise: 57500 });
    const after = (await json(desk('/api/b/main/billing/day-report'))).billed;
    expect([after.labPaise - before.labPaise, after.otherPaise - before.otherPaise]).toEqual([0, 7500]);

    // The list replaces what was there; the lab test stays.
    const one = await json(desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { charges: [{ description: 'ECG', amountPaise: 15000 }] } }));
    expect(one.bill.lines.map((l: any) => l.description)).toEqual(['CBC', 'ECG']);
    expect(one.bill.totalPaise).toBe(65000);
    // Through the checkout too, with the payment.
    const done = await json(pay(v.id, 50000, { charges: [] }));
    expect(done.bill).toMatchObject({ totalPaise: 50000, status: 'paid' });
    expect(done.bill.lines.map((l: any) => l.description)).toEqual(['CBC']);
  });

  it('a charge needs a name; the single "other charges" of an older bill becomes the first charge; another branch gets 404', async () => {
    const v = await visit('Old Style Patient');
    const { bill } = await json(desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }));
    expect((await desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { charges: [{ description: ' ', amountPaise: 100 }] } })).status).toBe(400);
    await desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { otherChargesPaise: 4000, otherChargesLabel: 'Dressing' } });
    expect((await json(desk(`/api/b/main/visits/${v.id}/checkout`))).bill.charges).toEqual([{ description: 'Dressing', amountPaise: 4000 }]);
    const saved = await json(desk(`/api/b/main/bills/${bill.id}`, { method: 'PATCH', body: { charges: [{ description: 'Dressing', amountPaise: 4000 }, { description: 'Nebulisation', amountPaise: 6000 }] } }));
    expect(saved.bill).toMatchObject({ otherChargesPaise: 0, otherChargesLabel: null, totalPaise: 30000 });
    expect((await eastdesk(`/api/b/east/bills/${bill.id}`, { method: 'PATCH', body: { charges: [] } })).status).toBe(404);
  });
});

describe('prescribing', () => {
  it('a medicine with no stock cannot be prescribed; once stock is added it can', async () => {
    const { id: empty } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Out Of Stock Tablet', form: 'tablet', pricePaise: 500 } }));
    const v = await visit('Prescription Patient');
    const add = () => doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: empty, dose: '1-0-1', days: 2 } });
    const refused = await add();
    expect([refused.status, (await refused.json()).code]).toEqual([409, 'out_of_stock']);
    await pharm(`/api/b/main/medicines/${empty}/batches`, { method: 'POST', body: { batchNo: 'N1', expiryDate: inDays(100), quantity: 10 } });
    expect((await add()).status).toBe(201);
  });
});

describe('last purchase', () => {
  it("returns the patient's most recent sale by medicine, for this branch's pharmacy only", async () => {
    const p = (await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Regular Customer', phone: '9000012345' } }))).patient;
    expect((await json(pharm(`/api/b/main/patients/${p.id}/last-purchase`))).purchase).toBeNull();
    await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: para, quantity: 4 }], paymentMode: 'cash', patientId: p.id } });
    const second = await json(pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { items: [{ medicineId: para, quantity: 30 }], paymentMode: 'upi', patientId: p.id } }));
    const { purchase } = await json(pharm(`/api/b/main/patients/${p.id}/last-purchase`));
    expect(purchase).toMatchObject({ saleId: second.sale.id, saleNo: second.sale.saleNo, items: [{ medicineId: para, medicineName: 'Paracetamol', quantity: 30, available: true }] });
    expect((await doc(`/api/b/main/patients/${p.id}/last-purchase`)).status).toBe(403); // not the pharmacy counter
    expect((await owner(`/api/b/east/patients/${p.id}/last-purchase`)).status).toBe(404); // another branch: like a missing patient
  });
});

describe('completed payments', () => {
  it("lists the day's fully paid bills only, for this branch only", async () => {
    const paid = await visit('Paid In Full');
    await pay(paid.id, 20000);
    const part = await visit('Part Paid');
    await pay(part.id, 5000);
    const list = await json(desk('/api/b/main/bills?status=paid'));
    expect(list.date).toBe(new Date().toLocaleDateString('en-CA'));
    const names = list.bills.map((b: any) => b.patientName);
    expect(names).toContain('Paid In Full');
    expect(names).not.toContain('Part Paid');
    expect(list.bills.every((b: any) => b.status === 'paid' && b.paidPaise >= b.totalPaise)).toBe(true);
    expect((await json(desk('/api/b/main/bills?status=paid&date=2020-01-01'))).bills).toEqual([]);
    expect((await json(eastdesk('/api/b/east/bills?status=paid'))).bills).toEqual([]);
    expect((await doc('/api/b/main/bills?status=paid')).status).toBe(403);
  });
});

describe('payments', () => {
  it('two payments at the same moment never take more than is due', async () => {
    const v = await visit('Double Click');
    const { bill } = await json(desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }));
    const both = await Promise.all([1, 2].map(() => desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 20000, mode: 'cash' } })));
    expect(both.map((r) => r.status).sort()).toEqual([201, 400]); // the second one is told the bill is already paid
    expect((await json(desk(`/api/b/main/bills/${bill.id}`))).bill.paidPaise).toBe(20000);
  });
});

describe('lab results', () => {
  it('a correction after completion keeps when the test was completed', async () => {
    const v = await visit('Lab Patient');
    await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [cbc] } });
    const report = await json(lab(`/api/b/main/visits/${v.id}/lab-report`));
    const order = report.tests[0];
    const put = (value: string) => lab(`/api/b/main/lab/orders/${order.orderId}/results`, { method: 'PUT', body: { results: [{ parameterId: order.parameters[0].id, value }], complete: true } });
    expect((await put('NEGATIVE')).status).toBe(200);
    await t.db.update(labOrder).set({ completedAt: '2026-01-01T00:00:00.000Z' }).where(eq(labOrder.id, order.orderId));
    expect((await put('POSITIVE')).status).toBe(200);
    expect((await put('')).status).toBe(400); // a final report is not emptied
    const again = (await json(lab(`/api/b/main/visits/${v.id}/lab-report`))).tests[0];
    expect([again.status, again.completedAt, again.parameters[0].value]).toEqual(['completed', '2026-01-01T00:00:00.000Z', 'POSITIVE']);
  });
});

describe('a lab test with its own result lines', () => {
  it('is added as a group, edited as a whole by an admin only, and another branch gets 404', async () => {
    const lines = [
      { name: 'Neutrophils', method: 'Microscopy', unit: '%', refRange: '40 - 75' },
      { name: 'Basophils', method: 'Microscopy', unit: '%', refRange: '0 - 1' },
      { name: 'Remarks', method: '', unit: '', refRange: '' },
    ];
    const made = await owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Differential Count', pricePaise: 15000, department: 'DEPARTMENT OF HEMATOLOGY', parameters: lines } });
    expect(made.status).toBe(201);
    const { id } = await made.json();
    const first = (await json(owner(`/api/b/main/lab/tests/${id}`))).test;
    expect(first).toMatchObject({ name: 'Differential Count', pricePaise: 15000, department: 'DEPARTMENT OF HEMATOLOGY' });
    expect(first.parameters.map((p: any) => [p.name, p.method, p.unit, p.refRange])).toEqual(lines.map((l) => [l.name, l.method, l.unit, l.refRange]));

    // On the results screen: a line with a range is a number (flagged), a line without is free text with no quick picks.
    const v = await visit('Group Test Patient');
    await doc(`/api/b/main/visits/${v.id}/lab-orders`, { method: 'POST', body: { testIds: [id] } });
    const report = (await json(lab(`/api/b/main/visits/${v.id}/lab-report`))).tests[0];
    expect(report.parameters.map((p: any) => [p.name, p.type, p.options])).toEqual([['Neutrophils', 'number', []], ['Basophils', 'number', []], ['Remarks', 'text', []]]);

    // Edit: rename one line, drop one, add one, change the price.
    const [n, b] = first.parameters;
    const edited = await owner(`/api/b/main/lab/tests/${id}`, { method: 'PATCH', body: { pricePaise: 18000, parameters: [{ ...b, refRange: '0 - 2' }, { ...n, name: 'Neutrophils (Polymorphs)' }, { name: 'Eosinophils', method: 'Microscopy', unit: '%', refRange: '1 - 6' }] } });
    expect(edited.status).toBe(200);
    const second = (await json(owner(`/api/b/main/lab/tests/${id}`))).test;
    expect(second.pricePaise).toBe(18000);
    expect(second.parameters.map((p: any) => [p.id === b.id || p.id === n.id, p.name, p.refRange])).toEqual([[true, 'Basophils', '0 - 2'], [true, 'Neutrophils (Polymorphs)', '40 - 75'], [false, 'Eosinophils', '1 - 6']]);
    expect((await json(owner('/api/b/main/lab/tests'))).tests.find((t: any) => t.id === id).parameterCount).toBe(3);

    // Only whoever manages settings; never another branch; never a line of another test.
    expect((await lab(`/api/b/main/lab/tests/${id}`)).status).toBe(403);
    expect((await lab(`/api/b/main/lab/tests/${id}`, { method: 'PATCH', body: { pricePaise: 1 } })).status).toBe(403);
    expect((await owner(`/api/b/east/lab/tests/${id}`)).status).toBe(404);
    expect((await owner(`/api/b/east/lab/tests/${id}`, { method: 'PATCH', body: { pricePaise: 1 } })).status).toBe(404);
    const other = (await json(owner(`/api/b/main/lab/tests/${cbc}`))).test.parameters[0];
    expect((await owner(`/api/b/main/lab/tests/${id}`, { method: 'PATCH', body: { parameters: [{ ...other }] } })).status).toBe(400);
    expect((await owner(`/api/b/main/lab/tests/${id}`, { method: 'PATCH', body: { parameters: [] } })).status).toBe(400);
  });
});

describe('restore', () => {
  it("keeps its safety copy next to the database that is open, not in the developer's data folder", async () => {
    const dataDir = path.resolve(import.meta.dirname, '..', 'data');
    const before = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.startsWith('before-restore-')).length : 0;
    const backup = Buffer.from(await (await owner('/api/b/main/backup')).arrayBuffer());
    // East branch exists in this test hospital, so only the owner may restore; that is who is calling.
    const res = await t.app.request('/api/b/main/restore', { method: 'POST', headers: { Cookie: (await ownerCookie()), 'Content-Type': 'application/octet-stream' }, body: backup });
    expect(res.status).toBe(200);
    const after = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.startsWith('before-restore-')).length : 0;
    expect(after).toBe(before);
  });
});

async function ownerCookie() {
  const { M } = await import('./helpers.js');
  const res = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M('owner'), password: 'owner-pass-123' }) });
  return res.headers.get('set-cookie')!.split(';')[0]!;
}
