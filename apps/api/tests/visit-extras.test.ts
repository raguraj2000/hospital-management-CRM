// The doctor's fee for one visit, the patient's long-term conditions, prescription suggestions and the day's report.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json();

/** Standard fee ₹200, CBC ₹300, Paracetamol ₹2 (50 in stock). */
async function world() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk');
  const pharm = await t.as('pharm');
  const lab = await t.as('labtech');
  const east = await t.as('eastdesk');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: cbc } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'CBC', pricePaise: 30000 } }));
  const { id: para } = await json(pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 200 } }));
  const expiry = `${new Date().getFullYear() + 2}-01-01`;
  expect((await pharm(`/api/b/main/medicines/${para}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: expiry, quantity: 50 } })).status).toBe(201);
  return { owner, doc, desk, pharm, lab, east, cbc: cbc as number, para: para as number };
}
type World = Awaited<ReturnType<typeof world>>;

async function visit(w: World, name: string, patient: Record<string, unknown> = {}) {
  const { patient: p } = await json(w.doc('/api/b/main/patients', { method: 'POST', body: { name, ...patient } }));
  const { visit: v } = await json(w.doc(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} }));
  return { id: v.id as number, patientId: p.id as number };
}
const setFee = (caller: Caller, visitId: number, consultationFeePaise: number | null, branch = 'main') =>
  caller(`/api/b/${branch}/visits/${visitId}/consultation-fee`, { method: 'PUT', body: { consultationFeePaise } });
const feeOf = async (caller: Caller, visitId: number) => (await json(caller(`/api/b/main/visits/${visitId}`))).fee;
const checkoutOf = async (caller: Caller, visitId: number) => json(caller(`/api/b/main/visits/${visitId}/checkout`));

describe("the doctor's fee for one visit", () => {
  it('starts at the standard fee; the doctor changes it and the counter charges that', async () => {
    const w = await world();
    const v = await visit(w, 'Ravi Kumar');
    expect(await feeOf(w.doc, v.id)).toEqual({ consultationFeePaise: 20000, standardFeePaise: 20000, locked: false });

    expect((await setFee(w.doc, v.id, 50000)).status).toBe(200);
    expect(await feeOf(w.doc, v.id)).toEqual({ consultationFeePaise: 50000, standardFeePaise: 20000, locked: false });
    expect((await checkoutOf(w.desk, v.id)).bill.consultationFeePaise).toBe(50000);
    await w.doc(`/api/b/main/visits/${v.id}/send`, { method: 'POST', body: { to: 'counter' } }); // the counter's list shows the patient once sent
    expect((await json(w.desk('/api/b/main/checkout-queue'))).queue.find((q: any) => q.visitId === v.id).toBillPaise).toBe(50000);

    const paid = await w.desk(`/api/b/main/visits/${v.id}/checkout`, { method: 'POST', body: { itemIds: [], paymentMode: 'cash', amountPaise: 50000 } });
    expect(paid.status).toBe(201);
    const { bills } = await json(w.desk(`/api/b/main/visits/${v.id}/bills`));
    expect(bills[0]).toMatchObject({ consultationFeePaise: 50000, totalPaise: 50000, status: 'paid' });
  });

  it('a free visit (₹0), and back to the standard fee with null', async () => {
    const w = await world();
    const v = await visit(w, 'Free Patient');
    expect((await setFee(w.doc, v.id, 0)).status).toBe(200);
    expect((await checkoutOf(w.desk, v.id)).bill.consultationFeePaise).toBe(0);
    expect((await setFee(w.doc, v.id, null)).status).toBe(200);
    expect((await feeOf(w.doc, v.id)).consultationFeePaise).toBe(20000);
  });

  it('an unpaid bill follows the change; once a payment is taken the fee is locked', async () => {
    const w = await world();
    const v = await visit(w, 'Billed Patient');
    const { bill } = await json(w.desk(`/api/b/main/visits/${v.id}/bills`, { method: 'POST' }));
    expect(bill.totalPaise).toBe(20000);

    expect((await setFee(w.doc, v.id, 10000)).status).toBe(200);
    expect((await json(w.desk(`/api/b/main/bills/${bill.id}`))).bill).toMatchObject({ consultationFeePaise: 10000, totalPaise: 10000 });

    expect((await w.desk(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 4000, mode: 'cash' } })).status).toBe(201);
    expect((await feeOf(w.doc, v.id)).locked).toBe(true);
    const refused = await setFee(w.doc, v.id, 0);
    expect(refused.status).toBe(409);
    expect((await refused.json()).code).toBe('has_payments');
    expect((await json(w.desk(`/api/b/main/bills/${bill.id}`))).bill.consultationFeePaise).toBe(10000);
  });

  it('needs prescription.write or billing.receive, a sane amount, and a visit of this branch', async () => {
    const w = await world();
    const v = await visit(w, 'Guarded');
    expect((await setFee(w.lab, v.id, 100)).status).toBe(403);
    expect((await setFee(w.doc, v.id, -5)).status).toBe(400);
    expect((await setFee(w.desk, v.id, 30000)).status).toBe(200);
    // Another branch: exactly like a missing visit.
    expect((await setFee(w.owner, v.id, 100, 'east')).status).toBe(404);
    expect((await setFee(w.east, v.id, 100, 'east')).status).toBe(404);
    expect((await feeOf(w.doc, v.id)).consultationFeePaise).toBe(30000);
  });
});

describe("the patient's long-term conditions", () => {
  it('are saved on the patient and shown on the visit and in the OP list', async () => {
    const w = await world();
    const v = await visit(w, 'Lakshmi', { conditions: 'Diabetes, Hypertension (BP)' });
    expect((await json(w.doc(`/api/b/main/patients/${v.patientId}`))).patient.conditions).toBe('Diabetes, Hypertension (BP)');
    expect((await json(w.doc(`/api/b/main/visits/${v.id}`))).patient.conditions).toBe('Diabetes, Hypertension (BP)');
    expect((await json(w.doc('/api/b/main/visits'))).visits[0].patientConditions).toBe('Diabetes, Hypertension (BP)');

    expect((await w.doc(`/api/b/main/patients/${v.patientId}`, { method: 'PATCH', body: { conditions: '' } })).status).toBe(200);
    expect((await json(w.doc(`/api/b/main/visits/${v.id}`))).patient.conditions).toBeNull();
  });
});

describe('prescription suggestions', () => {
  it("are this branch's most-used doses and instructions, for prescribers only", async () => {
    const w = await world();
    const v = await visit(w, 'Rx Patient');
    const add = (dose: string, instructions: string | null) => w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose, days: 1, quantity: 1, instructions } });
    for (const [dose, ins] of [['1-1-1', 'Chew and swallow'], ['1-1-1', 'Chew and swallow'], ['0-0-1', 'At bedtime'], ['SOS', null]] as const) expect((await add(dose, ins)).status).toBe(201);

    const s = await json(w.doc('/api/b/main/prescription/suggestions'));
    expect(s.doses[0]).toBe('1-1-1');
    expect([...s.doses].sort()).toEqual(['0-0-1', '1-1-1', 'SOS']);
    expect(s.instructions).toEqual(['Chew and swallow', 'At bedtime']);
    // The usual line of a medicine: the last one written for it.
    expect(s.usual).toEqual([{ medicineId: w.para, dose: 'SOS', instructions: null, days: 1 }]);

    expect((await w.desk('/api/b/main/prescription/suggestions')).status).toBe(403);
    // Another branch never sees them.
    expect(await json(w.owner('/api/b/east/prescription/suggestions'))).toEqual({ doses: [], instructions: [], usual: [] });
    expect((await w.doc('/api/b/east/prescription/suggestions')).status).toBe(404);
  });
});

describe("the day's report", () => {
  it('adds up visits, what was billed, every receipt and what is still due', async () => {
    const w = await world();
    const a = await visit(w, 'Paid In Full', { phone: '9876543210' });
    const b = await visit(w, 'Part Paid');
    expect((await w.doc(`/api/b/main/visits/${a.id}/lab-orders`, { method: 'POST', body: { testIds: [w.cbc] } })).status).toBe(201);
    const { id: item } = await json(w.doc(`/api/b/main/visits/${a.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 5 } }));
    const { sql } = await import('drizzle-orm');
    await t.db.run(sql`update op_visit set status = 'at_counter' where id = ${a.id}`); // the doctor is done
    // A: consultation 200 + lab 300 + medicines 20, all by UPI. B: 200 billed, 50 paid in cash.
    expect((await w.desk(`/api/b/main/visits/${a.id}/checkout`, { method: 'POST', body: { itemIds: [item], paymentMode: 'upi', amountPaise: 52000 } })).status).toBe(201);
    expect((await w.desk(`/api/b/main/visits/${b.id}/checkout`, { method: 'POST', body: { itemIds: [], paymentMode: 'cash', amountPaise: 5000 } })).status).toBe(201);

    const r = await json(w.owner('/api/b/main/billing/day-report'));
    expect(r.visits).toMatchObject({ total: 2, cancelled: 0, newPatients: 2, byDoctor: [{ doctorName: null, count: 2 }] });
    expect(r.labTests).toBe(1);
    expect(r.billed).toEqual({ consultationPaise: 40000, labPaise: 30000, otherPaise: 0, roundOffPaise: 0, discountPaise: 0, pharmacyPaise: 2000 });
    expect(r.bills).toEqual({ cash: 5000, upi: 50000, card: 0 });
    expect(r.pharmacy).toEqual({ cash: 0, upi: 2000, card: 0 });
    expect(r.totalPaise).toBe(57000);
    expect(r.pendingDayPaise).toBe(15000);
    expect(r.pendingAllPaise).toBe(15000);
    expect(r.receipts.map((x: any) => [x.kind, x.patientName, x.amountPaise, x.mode])).toEqual(
      expect.arrayContaining([
        ['bill', 'Paid In Full', 50000, 'upi'],
        ['pharmacy', 'Paid In Full', 2000, 'upi'],
        ['bill', 'Part Paid', 5000, 'cash'],
      ]),
    );
    expect(r.receipts).toHaveLength(3);

    // The balance is collected later: the 2nd receipt of that bill, and nothing pending.
    const [due] = (await json(w.desk('/api/b/main/bills'))).bills;
    expect(due).toMatchObject({ patientName: 'Part Paid', patientPhone: null, totalPaise: 20000, paidPaise: 5000 });
    expect((await w.desk(`/api/b/main/bills/${due.id}/payments`, { method: 'POST', body: { amountPaise: 15000, mode: 'card' } })).status).toBe(201);
    const after = await json(w.owner('/api/b/main/billing/day-report'));
    expect(after.pendingAllPaise).toBe(0);
    expect(after.receipts.filter((x: any) => x.billId === due.id).map((x: any) => x.no)).toEqual([`${due.billNo}/R1`, `${due.billNo}/R2`]);

    // Another day is empty; another branch never sees this money; a role without billing is refused.
    expect((await json(w.owner('/api/b/main/billing/day-report?date=2020-01-01'))).receipts).toEqual([]);
    const east = await json(w.owner('/api/b/east/billing/day-report'));
    expect(east).toMatchObject({ totalPaise: 0, receipts: [], pendingAllPaise: 0 });
    expect(east.visits.total).toBe(0);
    expect((await w.desk('/api/b/east/billing/day-report')).status).toBe(404);
    expect((await w.lab('/api/b/main/billing/day-report')).status).toBe(403);
    expect((await w.desk('/api/b/main/billing/day-report')).status).toBe(403); // reports need their own permission
  });
});

describe('notes and instructions between the medicines', () => {
  it('written by the doctor after a medicine, moved, read by the pharmacy; other branch and other visits refused', async () => {
    const w = await world();
    const v = await visit(w, 'Notes Patient');
    const other = await visit(w, 'Other Patient');
    const { id: item } = await json(w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 3 } }));
    const { id: otherItem } = await json(w.doc(`/api/b/main/visits/${other.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 3 } }));
    const add = (who: typeof w.doc, body: unknown, br = 'main') => who(`/api/b/${br}/visits/${v.id}/prescription-notes`, { method: 'POST', body });
    expect((await add(w.desk, { kind: 'note', text: 'x' })).status).toBe(403); // only who prescribes
    expect((await add(w.owner, { kind: 'note', text: 'x' }, 'east')).status).toBe(404);
    expect((await add(w.doc, { kind: 'note', text: 'x', afterItemId: otherItem })).status).toBe(400); // another visit's medicine
    expect((await add(w.doc, { kind: 'note', text: '' })).status).toBe(400);
    const { id: note } = await json(add(w.doc, { kind: 'note', text: 'Stop if the fever goes', afterItemId: item }));
    expect((await add(w.doc, { kind: 'instruction', text: 'Check BP tomorrow', afterItemId: null })).status).toBe(201);
    // The pharmacy reads them with the prescription.
    const rx = await json(w.pharm(`/api/b/main/visits/${v.id}/prescription`));
    expect(rx.notes.map((n: any) => [n.kind, n.text, n.afterItemId])).toEqual([['note', 'Stop if the fever goes', item], ['instruction', 'Check BP tomorrow', null]]);
    // Moved to the top, changed, then removed; another branch cannot touch it.
    expect((await w.owner(`/api/b/east/prescription-notes/${note}`, { method: 'PATCH', body: { text: 'y' } })).status).toBe(404);
    expect((await w.doc(`/api/b/main/prescription-notes/${note}`, { method: 'PATCH', body: { afterItemId: null, text: 'Stop if no fever' } })).status).toBe(200);
    expect((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`))).notes[0]).toMatchObject({ text: 'Stop if no fever', afterItemId: null });
    expect((await w.doc(`/api/b/main/prescription-notes/${note}`, { method: 'DELETE' })).status).toBe(200);
    expect((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`))).notes).toHaveLength(1);
    expect((await w.owner(`/api/b/east/visits/${v.id}/prescription`)).status).toBe(404);
  });
});

describe('a drug\'s usual prescription', () => {
  it('is saved on the drug and comes back with the drug list (changed or cleared later)', async () => {
    const w = await world();
    const { id } = await json(w.pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Amoxicillin', form: 'capsule', strength: '500 mg', pricePaise: 800, defaultDose: '1-1-1', defaultInstructions: 'After food', defaultDays: 5 } }));
    const m = (await json(w.doc('/api/b/main/medicines'))).medicines.find((x: any) => x.id === id);
    expect(m).toMatchObject({ defaultDose: '1-1-1', defaultInstructions: 'After food', defaultDays: 5 });
    expect((await w.pharm(`/api/b/main/medicines/${id}`, { method: 'PATCH', body: { name: 'Amoxicillin', form: 'capsule', pricePaise: 800, defaultDose: '', defaultInstructions: '', defaultDays: null } })).status).toBe(200);
    expect((await json(w.doc('/api/b/main/medicines'))).medicines.find((x: any) => x.id === id)).toMatchObject({ defaultDose: null, defaultInstructions: null, defaultDays: null });
    expect((await w.pharm('/api/b/main/medicines', { method: 'POST', body: { name: 'Bad Days', form: 'tablet', pricePaise: 100, defaultDays: 0 } })).status).toBe(400);
  });
});

describe('drag into another order', () => {
  it('medicines of a prescription and the lab tests list; every id once; other branch and other roles refused', async () => {
    const w = await world();
    const v = await visit(w, 'Order Patient');
    const add = async () => (await json(w.doc(`/api/b/main/visits/${v.id}/prescription`, { method: 'POST', body: { medicineId: w.para, dose: '1-0-1', days: 1, quantity: 1 } }))).id as number;
    const [a, b, c] = [await add(), await add(), await add()];
    const order = (ids: number[], who = w.doc, br = 'main') => who(`/api/b/${br}/visits/${v.id}/prescription/order`, { method: 'PUT', body: { ids } });
    expect((await order([c, a])).status).toBe(400); // every one, once
    expect((await order([c, a, b], w.desk)).status).toBe(403);
    expect((await order([c, a, b], w.owner, 'east')).status).toBe(404);
    expect((await order([c, a, b])).status).toBe(200);
    const d = await add(); // a new one goes after the placed ones
    expect((await json(w.doc(`/api/b/main/visits/${v.id}/prescription`))).items.map((i: any) => i.id)).toEqual([c, a, b, d]);

    const t1 = (await json(w.owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Alpha test', pricePaise: 100 } }))).id;
    const t2 = (await json(w.owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Beta test', pricePaise: 100 } }))).id;
    const all = (await json(w.owner('/api/b/main/lab/tests'))).tests.map((x: any) => x.id);
    const wanted = [t2, t1, ...all.filter((id: number) => id !== t1 && id !== t2)];
    expect((await w.doc('/api/b/main/lab/tests/order', { method: 'PUT', body: { ids: wanted } })).status).toBe(403);
    expect((await w.owner('/api/b/main/lab/tests/order', { method: 'PUT', body: { ids: [t2, 999999] } })).status).toBe(400);
    expect((await w.owner('/api/b/main/lab/tests/order', { method: 'PUT', body: { ids: wanted } })).status).toBe(200);
    expect((await json(w.owner('/api/b/main/lab/tests'))).tests.map((x: any) => x.id)).toEqual(wanted);
  });
});
