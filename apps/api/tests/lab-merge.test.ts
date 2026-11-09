// The differential counts become lines of the CBC in a hospital that still has them as two tests.
import { afterEach, beforeEach, expect, it } from 'vitest';
import { unitsPerDay, suggestedQuantity } from '@platform/shared';
import { addRandomBloodSugar, addVisitingDoctorRole, mergeDifferentialIntoCbc } from '../src/lib/lab-merge.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());
const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;
const line = (name: string) => ({ name, method: 'Whole blood', unit: '%', refRange: '1 - 9', type: 'number' });

it('moves the differential lines onto the CBC once, keeps old reports, and leaves other branches alone', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const make = async (branch: string, name: string, lines: string[]) => (await json(owner(`/api/b/${branch}/lab/tests`, { method: 'POST', body: { name, pricePaise: 40000, parameters: lines.map(line) } }))).id as number;
  const cbc = await make('main', 'Complete Blood Count', ['Haemoglobin', 'Platelet Count']);
  const diff = await make('main', 'Differential Counts', ['Neutrophils', 'Lymphocytes']);
  await make('east', 'Differential Counts', ['Neutrophils']); // no CBC there: stays as it is

  // A differential report made before the change.
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Old Report' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await owner(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [diff] } });
  const before = (await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0];
  await lab(`/api/b/main/lab/orders/${before.orderId}/results`, { method: 'PUT', body: { results: before.parameters.map((p: any) => ({ parameterId: p.id, value: '50' })), complete: true } });

  expect(await mergeDifferentialIntoCbc(t.db)).toBe(1);
  expect(await mergeDifferentialIntoCbc(t.db)).toBe(0); // nothing left to do

  const tests = (await json(owner('/api/b/main/lab/tests'))).tests;
  expect(tests.map((x: any) => x.name)).toEqual(['Complete Blood Count']);
  const detail = await json(owner(`/api/b/main/lab/tests/${cbc}`));
  expect((detail.test ?? detail).parameters.map((p: any) => p.name)).toEqual(['Haemoglobin', 'Platelet Count', 'Neutrophils', 'Lymphocytes']);
  // The report made for the old test still prints its two values.
  const after = (await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0];
  expect(after.parameters.map((p: any) => [p.name, p.value])).toEqual([['Neutrophils', '50'], ['Lymphocytes', '50']]);
  expect((await json(owner('/api/b/east/lab/tests'))).tests.map((x: any) => x.name)).toEqual(['Differential Counts']);
});

it('adds Random Blood Sugar to an existing Blood Sugar test once, after the post-meal line', async () => {
  const owner = await t.as('owner');
  const { id } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood Sugar', pricePaise: 10000, parameters: ['Fasting Blood Sugar (FBS)', 'Post Prandial Blood Sugar (PPBS)', 'HbA1c'].map(line) } }));
  expect(await addRandomBloodSugar(t.db)).toBe(1);
  expect(await addRandomBloodSugar(t.db)).toBe(0);
  expect(((await json(owner(`/api/b/main/lab/tests/${id}`))).test).parameters.every((p: any) => p.optional)).toBe(true);
  const detail = await json(owner(`/api/b/main/lab/tests/${id}`));
  expect((detail.test ?? detail).parameters.map((p: any) => p.name)).toEqual(['Fasting Blood Sugar (FBS)', 'Post Prandial Blood Sugar (PPBS)', 'Random Blood Sugar (RBS)', 'HbA1c']);
});

it('quarter, half and three-quarter tablets are counted; a child gender is accepted', async () => {
  expect(unitsPerDay('0.5-0.5-0.5')).toBe(1.5);
  expect(unitsPerDay('0.75-0-0.75')).toBe(1.5);
  expect(suggestedQuantity('0.75-0.75-0.75', 3)).toBe(7); // 6.75 rounded up
  expect(unitsPerDay('SOS')).toBeNull();
  const owner = await t.as('owner');
  const made = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Little One', gender: 'female child' } }));
  expect(made.patient.gender).toBe('female child');
  expect((await json(owner('/api/b/main/patients?gender=female%20child'))).patients.map((p: any) => p.name)).toEqual(['Little One']);
  expect((await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Bad', gender: 'robot' } })).status).toBe(400);
});

it('the lab sends a waiting patient back to the doctor: only from the lab, only this branch, tests stay ordered', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const desk = await t.as('desk');
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Urine Routine', pricePaise: 10000 } }));
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'In A Hurry' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await owner(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } });
  // Not at the lab yet.
  expect((await lab(`/api/b/main/lab/visits/${visit.id}/back-to-doctor`, { method: 'POST' })).status).toBe(409);
  await owner('/api/b/main/visits/call-next', { method: 'POST', body: { visitId: visit.id } });
  await owner(`/api/b/main/visits/${visit.id}/send`, { method: 'POST', body: { to: 'lab' } });
  expect((await json(lab('/api/b/main/lab/orders'))).orders[0].visitStatus).toBe('at_lab');
  expect((await desk(`/api/b/main/lab/visits/${visit.id}/back-to-doctor`, { method: 'POST' })).status).toBe(403);
  expect((await owner(`/api/b/east/lab/visits/${visit.id}/back-to-doctor`, { method: 'POST' })).status).toBe(404);
  expect((await lab(`/api/b/main/lab/visits/${visit.id}/back-to-doctor`, { method: 'POST' })).status).toBe(200);
  expect((await json(owner(`/api/b/main/visits/${visit.id}`))).visit.status).toBe('waiting');
  expect((await json(lab('/api/b/main/lab/orders'))).orders.map((o: any) => [o.testName, o.status, o.visitStatus])).toEqual([['Urine Routine', 'ordered', 'waiting']]);
  // "Sample collected" pressed by mistake can be undone (lab only, this branch only, not twice).
  const orderId = (await json(lab('/api/b/main/lab/orders'))).orders[0].id;
  const set = (who: typeof lab, br: string, status: string) => who(`/api/b/${br}/lab/orders/${orderId}`, { method: 'PATCH', body: { status } });
  expect((await set(lab, 'main', 'sample_collected')).status).toBe(200);
  expect((await set(desk, 'main', 'ordered')).status).toBe(403);
  expect((await set(owner, 'east', 'ordered')).status).toBe(404);
  expect((await set(lab, 'main', 'ordered')).status).toBe(200);
  expect((await set(lab, 'main', 'ordered')).status).toBe(409);
  expect((await json(lab('/api/b/main/lab/orders'))).orders[0]).toMatchObject({ status: 'ordered', visitStatus: 'waiting' });
});

it('cancelling the only test of a patient at the lab sends them back to the doctor; the patients list shows who owes', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'X-Ray', pricePaise: 30000 } }));
  const mk = async (name: string) => {
    const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name } }));
    const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
    return { patient, visit };
  };
  const a = await mk('Machine Down');
  await owner(`/api/b/main/visits/${a.visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } });
  await owner('/api/b/main/visits/call-next', { method: 'POST', body: { visitId: a.visit.id } });
  await owner(`/api/b/main/visits/${a.visit.id}/send`, { method: 'POST', body: { to: 'lab' } });
  const order = (await json(lab('/api/b/main/lab/orders'))).orders[0];
  expect((await lab(`/api/b/main/lab/orders/${order.id}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
  expect((await json(owner(`/api/b/main/visits/${a.visit.id}`))).visit.status).toBe('waiting');

  // Dues: one patient pays part of the bill, another pays in full, a third has no bill.
  const part = await mk('Pays Part');
  const full = await mk('Pays Full');
  await mk('No Bill');
  for (const [p, amount] of [[part, 5000], [full, 20000]] as const) {
    const { bill } = await json(owner(`/api/b/main/visits/${p.visit.id}/bills`, { method: 'POST' }));
    await owner(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: amount, mode: 'cash' } });
  }
  const all = (await json(owner('/api/b/main/patients'))).patients;
  expect(Object.fromEntries(all.map((p: any) => [p.name, p.duePaise]))).toMatchObject({ 'Pays Part': 15000, 'Pays Full': 0, 'No Bill': 0, 'Machine Down': 0 });
  const owing = await json(owner('/api/b/main/patients?due=1'));
  expect(owing.total).toBe(1);
  expect(owing.patients.map((p: any) => [p.name, p.duePaise])).toEqual([['Pays Part', 15000]]);
  expect((await json(owner('/api/b/east/patients?due=1'))).total).toBe(0);
});

it('a test is completed only when every required line has a value; optional lines may stay empty', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Sugar', pricePaise: 10000, parameters: [{ ...line('Fasting'), optional: true }, { ...line('Random'), optional: true }, line('Sample quality')] } }));
  const detail = await json(owner(`/api/b/main/lab/tests/${testId}`));
  expect((detail.test ?? detail).parameters.map((p: any) => [p.name, p.optional])).toEqual([['Fasting', true], ['Random', true], ['Sample quality', false]]);
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Sugar Patient' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await owner(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } });
  const rep = (await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0];
  const [fasting, random, quality] = rep.parameters;
  expect(rep.parameters.map((p: any) => p.optional)).toEqual([true, true, false]);
  const put = (results: unknown, complete: boolean) => lab(`/api/b/main/lab/orders/${rep.orderId}/results`, { method: 'PUT', body: { results, complete } });
  // The required line is empty: saving is fine, completing is refused and names it.
  expect((await put([{ parameterId: random.id, value: '110' }], false)).status).toBe(200);
  const refused = await put([{ parameterId: random.id, value: '110' }, { parameterId: quality.id, value: '' }], true);
  expect(refused.status).toBe(400);
  expect((await refused.json()).error).toContain('Sample quality');
  // Filled: completed, with the fasting line still empty.
  expect((await put([{ parameterId: fasting.id, value: '' }, { parameterId: quality.id, value: '5' }], true)).status).toBe(200);
  const done = (await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0];
  expect(done.status).toBe('completed');
  expect(done.parameters.map((p: any) => p.value)).toEqual(['', '110', '5']);
  // Afterwards (a correction, by the owner with a reason): an optional line may be emptied, a required one may not.
  const fix = (results: unknown) => owner(`/api/b/main/lab/orders/${rep.orderId}/results`, { method: 'PUT', body: { results, reason: 'Corrected' } });
  expect((await fix([{ parameterId: random.id, value: '' }])).status).toBe(200);
  expect((await fix([{ parameterId: quality.id, value: '' }])).status).toBe(400);
});

it('side-menu counts and the purchase profit report: right numbers, own branch only, hidden from roles without the page', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const pharm = await t.as('pharm');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Paracetamol', form: 'tablet', pricePaise: 300 } }));
  const vendor = await json(owner('/api/b/main/vendors', { method: 'POST', body: { name: 'City Pharma' } }));
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  // 10 strips of 10 at Rs 20 a strip = 100 tablets for Rs 200; they sell at Rs 3 each.
  expect((await owner('/api/b/main/purchases', { method: 'POST', body: { vendorId: vendor.id, vendorBillNo: 'INV-1', billDate: day, lines: [{ medicineId: med, batchNo: 'B1', expiryDate: '2030-01-01', quantity: 10, packSize: 10, unitCostPaise: 2000 }] } })).status).toBe(201);
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Ravi' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  expect((await json(owner('/api/b/main/nav-counts'))).counts).toMatchObject({ visits: 1, billing: 0, pharmacy: 0, lab: 0, treatments: 0 });
  const item = await json(owner(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 5 } }));
  await owner('/api/b/main/visits/call-next', { method: 'POST', body: { visitId: visit.id } });
  await owner(`/api/b/main/visits/${visit.id}/send`, { method: 'POST', body: { to: 'counter' } });
  expect((await json(owner('/api/b/main/nav-counts'))).counts).toMatchObject({ visits: 0, billing: 1, pharmacy: 1 });
  expect((await json(lab('/api/b/main/nav-counts'))).counts).toEqual({ visits: 0, lab: 0 });
  expect((await json(owner('/api/b/east/nav-counts'))).counts).toMatchObject({ visits: 0, billing: 0, pharmacy: 0 });

  // 10 tablets sold: profit so far = 10 x (3 - 2) = Rs 10; if all 100 sell = 300 - 200 = Rs 100.
  expect((await pharm('/api/b/main/pharmacy/dispense', { method: 'POST', body: { visitId: visit.id, itemIds: [item.id], paymentMode: 'cash' } })).status).toBe(201);
  const report = await json(owner('/api/b/main/purchases/profit'));
  expect(report.lines).toHaveLength(1);
  expect(report.lines[0]).toMatchObject({ vendorName: 'City Pharma', medicineName: 'Paracetamol', received: 100, soldUnits: 10, costPaise: 20000, sellValuePaise: 30000, profitIfAllSoldPaise: 10000, profitSoFarPaise: 1000 });
  expect(report.totals).toEqual({ costPaise: 20000, sellValuePaise: 30000, profitIfAllSoldPaise: 10000, profitSoFarPaise: 1000 });
  expect((await json(owner('/api/b/east/purchases/profit'))).lines).toEqual([]);
  expect((await lab('/api/b/main/purchases/profit')).status).toBe(403);
  expect((await json(owner('/api/b/main/purchases/profit?from=2020-01-01&to=2020-01-31'))).lines).toEqual([]);
});

it('a deactivated patient: seen by all, nothing new can be made, only the doctor or the admin switches it; the side-menu numbers can be switched off', async () => {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const desk = await t.as('desk');
  const lab = await t.as('labtech');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'X-Ray', pricePaise: 30000 } }));
  const { patient } = await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Twice Registered' } }));
  expect(patient.deactivatedAt).toBeNull();
  const { visit } = await json(desk(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));

  // Who may, and the reason is needed.
  const off = (c: typeof owner, body: unknown) => c(`/api/b/main/patients/${patient.id}/deactivate`, { method: 'POST', body });
  expect((await off(desk, { reason: 'duplicate' })).status).toBe(403);
  expect((await off(lab, { reason: 'duplicate' })).status).toBe(403);
  expect((await off(doc, { reason: '' })).status).toBe(400);
  expect((await owner(`/api/b/east/patients/${patient.id}/deactivate`, { method: 'POST', body: { reason: 'duplicate' } })).status).toBe(404);
  const done = await off(doc, { reason: 'Registered twice' });
  expect(done.status).toBe(200);
  expect((await done.json()).patient).toMatchObject({ deactivatedReason: 'Registered twice' });
  expect((await off(doc, { reason: 'again' })).status).toBe(409);

  // Everyone still sees the patient, marked.
  expect((await json(lab(`/api/b/main/patients/${patient.id}`))).patient.deactivatedAt).toBeTruthy();
  expect((await json(desk('/api/b/main/patients'))).patients[0]).toMatchObject({ name: 'Twice Registered', deactivatedReason: 'Registered twice' });
  // Nothing new: visit, lab test, medicine, charge, bill, checkout.
  const refused = async (r: Response | Promise<Response>) => { const res = await r; expect(res.status).toBe(409); expect((await res.json()).code).toBe('patient_inactive'); };
  await refused(desk(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await refused(doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } }));
  await refused(doc(`/api/b/main/visits/${visit.id}/charges`, { method: 'POST', body: { description: 'Dressing', amountPaise: 100 } }));
  await refused(owner(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' }));
  await refused(owner(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 0, itemIds: [] } }));

  // Activate: the front desk cannot, the doctor can; then everything works again.
  expect((await desk(`/api/b/main/patients/${patient.id}/activate`, { method: 'POST' })).status).toBe(403);
  expect((await doc(`/api/b/main/patients/${patient.id}/activate`, { method: 'POST' })).status).toBe(200);
  expect((await doc(`/api/b/main/patients/${patient.id}/activate`, { method: 'POST' })).status).toBe(409);
  expect((await desk(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} })).status).toBe(201);

  // The side-menu numbers: on by default, off for the whole branch, the other branch not touched.
  expect(await json(owner('/api/b/main/nav-counts'))).toMatchObject({ enabled: true, counts: { visits: 2 } });
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000, navCounts: false } });
  expect(await json(owner('/api/b/main/nav-counts'))).toEqual({ enabled: false, counts: {} });
  expect((await json(owner('/api/b/east/nav-counts'))).enabled).toBe(true);
  expect((await json(owner('/api/b/main/billing/settings'))).navCounts).toBe(false);
});

it('other expenses, the visiting doctor role, and the stricter rules for a deactivated patient', async () => {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const lab = await t.as('labtech');
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // ---- expenses: a listed vendor, a new shop that joins the list, own branch only
  const listed = await json(owner('/api/b/main/vendors', { method: 'POST', body: { name: 'City Pharma' } }));
  const eastVendor = await json(owner('/api/b/east/vendors', { method: 'POST', body: { name: 'East Shop' } }));
  const add = (body: unknown, c = owner, branch = 'main') => c(`/api/b/${branch}/expenses`, { method: 'POST', body });
  expect((await add({ expenseDate: day, description: 'Keyboard', vendorId: listed.id, amountPaise: 85000, mode: 'upi' })).status).toBe(201);
  const chair = await json(add({ expenseDate: day, description: 'Office chair', vendorName: 'Raja Furniture', addVendor: true, amountPaise: 320000, mode: 'cash' }));
  expect(chair.expense).toMatchObject({ description: 'Office chair', vendorName: 'Raja Furniture', amountPaise: 320000 });
  expect((await json(owner('/api/b/main/vendors'))).vendors.map((v: any) => v.name).sort()).toEqual(['City Pharma', 'Raja Furniture']);
  expect((await add({ expenseDate: day, description: 'Tea', vendorName: 'Corner shop', amountPaise: 5000, mode: 'cash' })).status).toBe(201); // not added to the list
  expect((await add({ expenseDate: day, description: 'X', vendorId: eastVendor.id, amountPaise: 100, mode: 'cash' })).status).toBe(400);
  expect((await add({ expenseDate: day, description: '', amountPaise: 100, mode: 'cash' })).status).toBe(400);
  expect((await add({ expenseDate: day, description: 'Keyboard', amountPaise: 100, mode: 'cash' }, lab)).status).toBe(403);
  const list = await json(owner('/api/b/main/expenses'));
  expect(list.expenses.map((e: any) => [e.description, e.vendorName])).toEqual([['Tea', 'Corner shop'], ['Office chair', 'Raja Furniture'], ['Keyboard', 'City Pharma']]);
  expect(list.totalPaise).toBe(410000);
  expect((await json(owner('/api/b/east/expenses'))).expenses).toEqual([]);
  expect((await owner(`/api/b/east/expenses/${chair.expense.id}`, { method: 'DELETE' })).status).toBe(404);
  expect((await owner(`/api/b/main/expenses/${chair.expense.id}`, { method: 'DELETE' })).status).toBe(200);
  expect((await json(owner('/api/b/main/expenses'))).totalPaise).toBe(90000);

  // ---- the visiting doctor: a role of every new hospital, a doctor of the branch, no money or stock pages
  const roles = (await json(owner('/api/b/main/roles'))).roles;
  const visiting = roles.find((r: any) => r.key === 'visiting_doctor');
  expect(visiting.name).toBe('Visiting doctor');
  expect([...visiting.permissions].sort()).toEqual(['dashboard.view', 'lab.order', 'lab.view', 'patient.edit', 'patient.view', 'prescription.write']);
  await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Dr. Visiting', mobile: '9000012345', password: 'staff-pass-123', roleId: visiting.id } });
  expect((await json(owner('/api/b/main/doctors'))).doctors.map((d: any) => d.name)).toContain('Dr. Visiting');
  expect(await addVisitingDoctorRole(t.db)).toBe(0); // already there: nothing added, and marked as done
  expect(await addVisitingDoctorRole(t.db)).toBe(0);

  // ---- a patient who owes money is not deactivated; a deactivated patient is not edited
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Owes Money' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  const { bill } = await json(owner(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' }));
  await owner(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 5000, mode: 'cash' } });
  const blocked = await doc(`/api/b/main/patients/${patient.id}/deactivate`, { method: 'POST', body: { reason: 'Moved away' } });
  expect(blocked.status).toBe(409);
  expect(await blocked.json()).toMatchObject({ code: 'has_dues', error: expect.stringContaining('150.00') });
  await owner(`/api/b/main/bills/${bill.id}/payments`, { method: 'POST', body: { amountPaise: 15000, mode: 'cash' } });
  expect((await doc(`/api/b/main/patients/${patient.id}/deactivate`, { method: 'POST', body: { reason: 'Moved away' } })).status).toBe(200);
  const edit = await owner(`/api/b/main/patients/${patient.id}`, { method: 'PATCH', body: { name: 'New Name' } });
  expect(edit.status).toBe(409);
  expect((await edit.json()).code).toBe('patient_inactive');
  await doc(`/api/b/main/patients/${patient.id}/activate`, { method: 'POST' });
  expect((await owner(`/api/b/main/patients/${patient.id}`, { method: 'PATCH', body: { name: 'New Name' } })).status).toBe(200);
});

it('the period report: what came in and what for, per doctor; a doctor sees only their own line; prescribing is held to the stock', async () => {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const pharm = await t.as('pharm');
  const lab = await t.as('labtech');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: med } = await json(owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Dolo', form: 'tablet', pricePaise: 300 } }));
  await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'B1', expiryDate: '2030-01-01', quantity: 20 } });
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'X-Ray', pricePaise: 30000 } }));
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Ravi', heightCm: 172, weightKg: 70 } }));
  expect(patient).toMatchObject({ heightCm: 172, weightKg: 70 });
  const me = (await json(doc('/api/auth/me'))).user;
  const { visit } = await json(doc(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: { heightCm: 173, doctorUserId: me.id } }));
  expect(visit.heightCm).toBe(173);
  expect((await json(owner(`/api/b/main/patients/${patient.id}`))).patient.heightCm).toBe(173); // the newest measurement is the patient's

  // More than the 20 in stock is refused; 10 is fine.
  const tooMany = await doc(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-1-1', days: 10 } });
  expect(tooMany.status).toBe(409);
  expect((await tooMany.json()).code).toBe('not_enough_stock');
  const item = await json(doc(`/api/b/main/visits/${visit.id}/prescription`, { method: 'POST', body: { medicineId: med, dose: '1-0-1', days: 5 } }));
  expect((await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'PATCH', body: { dose: '1-1-1', days: 10 } })).status).toBe(409);

  await doc(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } });
  await doc(`/api/b/main/visits/${visit.id}/charges`, { method: 'POST', body: { description: 'Dressing', amountPaise: 15000 } });
  await doc('/api/b/main/visits/call-next', { method: 'POST', body: { visitId: visit.id } });
  await owner(`/api/b/main/visits/${visit.id}/send`, { method: 'POST', body: { to: 'counter' } });
  // 200 fee + 300 lab + 150 dressing + 30 medicines = 680; the patient pays 500 (medicines in full, 470 on the bill).
  expect((await owner(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 50000, itemIds: [item.id], consultationFeePaise: 20000, discountPaise: 0 } })).status).toBe(201);
  // A direct sale at the pharmacy, and an expense.
  expect((await pharm('/api/b/main/pharmacy/sales', { method: 'POST', body: { paymentMode: 'upi', items: [{ medicineId: med, quantity: 2 }] } })).status).toBe(201);
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  await owner('/api/b/main/expenses', { method: 'POST', body: { expenseDate: day, description: 'Keyboard', amountPaise: 85000, mode: 'cash' } });

  const report = await json(owner('/api/b/main/reports/period?days=7'));
  expect(report).toMatchObject({ days: 7, own: false, visits: 1, newPatients: 1, expensesPaise: 85000 });
  expect(report.received).toMatchObject({ cash: 50000, upi: 600, card: 0, totalPaise: 50600, billsPaise: 47000, pharmacyOpPaise: 3000, pharmacyDirectPaise: 600 });
  expect(report.billed).toMatchObject({ consultationPaise: 20000, labPaise: 30000, otherPaise: 15000, discountPaise: 0, duePaise: 18000 });
  expect(report.doctors).toHaveLength(1);
  expect(report.doctors[0]).toMatchObject({ patients: 1, consultationPaise: 20000, labPaise: 30000, otherPaise: 15000, medicinesPaise: 3000, totalPaise: 68000 });

  // The doctor alone: their own line, nothing of the hospital's totals. The lab: not at all. The other branch: empty.
  const mine = await json(doc('/api/b/main/reports/period?days=1'));
  expect(mine.own).toBe(true);
  expect(mine.received).toBeUndefined();
  expect(mine.doctors.map((d: any) => d.patients)).toEqual([1]);
  expect((await lab('/api/b/main/reports/period')).status).toBe(403);
  const east = await json(owner('/api/b/east/reports/period?days=30'));
  expect(east.doctors).toEqual([]);
  expect(east.received.totalPaise).toBe(0);
  // Pharmacy sales over a period.
  expect((await json(owner('/api/b/main/pharmacy/sales?days=7'))).sales).toHaveLength(2);
  expect((await pharm('/api/b/main/pharmacy/sales?days=7')).status).toBe(403); // reports need their own permission
});

it('the history log keeps 30 days and rolls; only the owner reads it, and only their own branch', async () => {
  const { purgeOldAudit } = await import('../src/lib/audit-retention.js');
  const { sql } = await import('drizzle-orm');
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const logged = (await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Logged Patient', phone: '9812345670' } }))).patient;
  const loggedVisit = (await json(owner(`/api/b/main/patients/${logged.id}/visits`, { method: 'POST', body: { complaint: 'Fever' } }))).visit;
  await owner('/api/b/east/patients', { method: 'POST', body: { name: 'East Patient' } });
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const org = (await t.db.all<{ id: number }>(sql`select id from organization limit 1`))[0]!.id;
  // Entries 29, 31 and 400 days old, and a marker that is old too.
  for (const [age, action] of [[29, 'old_29'], [31, 'old_31'], [400, 'old_400'], [400, 'sugar_lines_optional']] as const)
    await t.db.run(sql`insert into audit_log (organization_id, branch_id, action, entity, created_at) values (${org}, ${t.main.id}, ${action}, 'test', ${daysAgo(age)})`);
  expect(await purgeOldAudit(t.db)).toBe(2);
  expect(await purgeOldAudit(t.db)).toBe(0);
  const left = (await t.db.all<{ action: string }>(sql`select action from audit_log where entity = 'test' order by action`)).map((r) => r.action);
  expect(left).toEqual(['old_29', 'sugar_lines_optional']);

  const log = await json(owner('/api/b/main/audit?days=30'));
  expect(log.keepDays).toBe(30);
  expect(log.entries.some((e: any) => e.entity === 'patient' && e.action === 'create' && e.detail.name === 'Logged Patient' && e.userName && e.roleName === 'Owner')).toBe(true);
  expect(log.entries.some((e: any) => e.detail?.name === 'East Patient')).toBe(false);
  // Each entry about a patient says who: name and phone, also for the visit; found by phone too. Never another branch's.
  const aboutVisit = log.entries.find((e: any) => e.entity === 'op_visit' && e.entityId === String(loggedVisit.id));
  expect(aboutVisit).toMatchObject({ patientName: 'Logged Patient', patientPhone: '+919812345670' });
  expect((await json(owner('/api/b/main/audit?days=30&q=9812345670'))).total).toBe(2);
  expect((await json(owner('/api/b/east/audit?days=30'))).entries.some((e: any) => e.patientName === 'Logged Patient')).toBe(false);
  expect((await json(owner('/api/b/main/audit?days=30&q=logged%20patient'))).total).toBe(2);
  expect((await json(owner('/api/b/main/audit?days=30&entity=patient'))).entries.every((e: any) => e.entity === 'patient')).toBe(true);
  expect((await json(owner('/api/b/main/audit?days=1'))).entries.some((e: any) => e.action === 'old_29')).toBe(false);
  expect((await doc('/api/b/main/audit')).status).toBe(403);
});

it('a request far larger than anything the app sends is refused before it is read', async () => {
  const owner = await t.as('owner');
  const big = await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Big', address: 'x'.repeat(6 * 1024 * 1024) } });
  expect(big.status).toBe(413);
  expect((await big.json()).code).toBe('too_large');
  expect((await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Normal' } })).status).toBe(201);
});

it('the reports permission: the branch admin role gets it once; a role without it sees no money report', async () => {
  const { addReportsPermission } = await import('../src/lib/lab-merge.js');
  const { sql } = await import('drizzle-orm');
  await t.db.run(sql`delete from role_permission where permission = 'reports.view'`);
  expect(await addReportsPermission(t.db)).toBe(1);
  expect(await addReportsPermission(t.db)).toBe(0); // marked as done: an owner who unticks it keeps it unticked
  const desk = await t.as('desk');
  expect((await desk('/api/b/main/reports/period')).status).toBe(403);
  expect((await desk('/api/b/main/billing/day-report')).status).toBe(403);
  const doc = await t.as('doc');
  expect((await json(doc('/api/b/main/reports/period'))).own).toBe(true); // a doctor: only their own line
  const full = await json((await t.as('owner'))('/api/b/main/reports/period'));
  expect(full.own).toBe(false);
  expect(Array.isArray(full.discounts)).toBe(true);
});

it('Random Blood Sugar becomes a test of its own, once; a required line can be unticked for one result', async () => {
  const { addRandomBloodSugarTest } = await import('../src/lib/lab-merge.js');
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const line = (name: string) => ({ name, method: 'GOD-POD', unit: 'mg/dl', refRange: '70 - 110' });
  await owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood Sugar', pricePaise: 8000, parameters: [line('Fasting Blood Sugar'), line('Post Prandial Blood Sugar')] } });
  expect(await addRandomBloodSugarTest(t.db)).toBe(1);
  expect(await addRandomBloodSugarTest(t.db)).toBe(0);
  const tests = (await json(owner('/api/b/main/lab/tests'))).tests;
  const rbs = tests.find((x: any) => x.name === 'Random Blood Sugar');
  expect(rbs).toMatchObject({ pricePaise: 8000 });
  expect((await json(owner('/api/b/east/lab/tests'))).tests.some((x: any) => x.name === 'Random Blood Sugar')).toBe(false);

  // Two required lines, only one done: refused, unless the lab unticks "Required" on the other for this result.
  const sugar = tests.find((x: any) => x.name === 'Blood Sugar');
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'One Reading' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await owner(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [sugar.id] } });
  const report = await json(lab(`/api/b/main/visits/${visit.id}/lab-report`));
  const [fasting, post] = report.tests[0].parameters;
  const put = (who: typeof lab, br: string, body: unknown) => who(`/api/b/${br}/lab/orders/${report.tests[0].orderId}/results`, { method: 'PUT', body });
  const results = [{ parameterId: fasting.id, value: '95' }, { parameterId: post.id, value: '' }];
  const refused = await put(lab, 'main', { complete: true, results });
  expect(refused.status).toBe(400);
  expect((await refused.json()).code).toBe('missing_results');
  expect((await put(owner, 'east', { complete: true, results, notRequired: [post.id] })).status).toBe(404);
  // "Untick all": every line may be unticked, but a report with no value at all is refused.
  const none = [{ parameterId: fasting.id, value: '' }, { parameterId: post.id, value: '' }];
  const blank = await put(lab, 'main', { complete: true, results: none, notRequired: [fasting.id, post.id] });
  expect(blank.status).toBe(400);
  expect((await blank.json()).code).toBe('missing_results');
  expect((await put(owner, 'east', { complete: true, results: none, notRequired: [fasting.id, post.id] })).status).toBe(404);
  expect((await put(lab, 'main', { complete: true, results, notRequired: [post.id] })).status).toBe(200);
  expect((await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0]).toMatchObject({ status: 'completed' });
});

it('a direct lab test: a visit with no doctor and no consultation fee, straight to the counter; HbA1c gets a test of its own', async () => {
  const { addHba1cTest } = await import('../src/lib/lab-merge.js');
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const doc = await t.as('doc');
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 20000 } });
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Thyroid Profile', pricePaise: 45000 } }));
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Walk In' } }));
  const direct = (who: typeof lab, br: string, body: unknown) => who(`/api/b/${br}/patients/${patient.id}/direct-lab`, { method: 'POST', body });
  expect((await direct(await t.as('pharm'), 'main', { testIds: [testId] })).status).toBe(403); // neither the lab nor the front desk
  expect((await direct(owner, 'east', { testIds: [testId] })).status).toBe(404); // another branch's patient
  expect((await direct(lab, 'main', { testIds: [] })).status).toBe(400);
  const made = await direct(lab, 'main', { testIds: [testId] });
  expect(made.status).toBe(201);
  const { visit } = await made.json();
  expect(visit).toMatchObject({ status: 'at_counter', doctorUserId: null, complaint: 'Lab test only' });
  expect((await json(lab('/api/b/main/lab/orders'))).orders.some((o: any) => o.visitId === visit.id && o.testName === 'Thyroid Profile')).toBe(true);
  // The counter collects the lab charges only: no consultation fee.
  const paid = await json(owner(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 45000, itemIds: [] } }));
  expect(paid.bill).toMatchObject({ consultationFeePaise: 0, totalPaise: 45000 });
  expect(paid.visitStatus).toBe('completed');

  // HbA1c: taken from the Blood Sugar test's line, once; nothing where the Blood Sugar test has no such line.
  const line = (name: string) => ({ name, method: 'HPLC', unit: '%', refRange: '4 - 5.6' });
  const sugar = (await json(owner('/api/b/main/lab/tests'))).tests.find((x: any) => x.name === 'Blood Sugar');
  if (sugar) await owner(`/api/b/main/lab/tests/${sugar.id}`, { method: 'DELETE' });
  await owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'Blood Sugar', pricePaise: 7500, parameters: [line('Fasting Blood Sugar'), line('HbA1c')] } });
  expect(await addHba1cTest(t.db)).toBe(1);
  expect(await addHba1cTest(t.db)).toBe(0);
  expect((await json(owner('/api/b/main/lab/tests'))).tests.filter((x: any) => x.name === 'HbA1c')).toHaveLength(1);
});

it('create bill without the doctor: a visit with fee 0 at the counter; the counter list goes day by day, oldest first', async () => {
  const { sql } = await import('drizzle-orm');
  const owner = await t.as('owner');
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Dressing Only' } }));
  const direct = (who: typeof owner, br: string) => who(`/api/b/${br}/patients/${patient.id}/direct-bill`, { method: 'POST' });
  expect((await direct(await t.as('labtech'), 'main')).status).toBe(403);
  expect((await direct(owner, 'east')).status).toBe(404);
  const { visit } = await json(direct(owner, 'main'));
  expect(visit).toMatchObject({ status: 'at_counter', doctorUserId: null, complaint: 'Bill only' });
  // With a doctor chosen, the visit is counted under that doctor; someone who is not a doctor here is refused.
  const doctorId = (await json(owner('/api/b/main/doctors'))).doctors[0].userId;
  const withDoctor = await json(owner(`/api/b/main/patients/${patient.id}/direct-bill`, { method: 'POST', body: { doctorUserId: doctorId } }));
  expect(withDoctor.visit.doctorUserId).toBe(doctorId);
  expect((await owner(`/api/b/main/patients/${patient.id}/direct-bill`, { method: 'POST', body: { doctorUserId: 999999 } })).status).toBeGreaterThanOrEqual(400);
  await owner(`/api/b/main/visits/${withDoctor.visit.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
  await owner(`/api/b/main/visits/${visit.id}/charges`, { method: 'POST', body: { description: 'Dressing', amountPaise: 15000 } });
  // Last night's patient (made before midnight) stays ahead of today's token 1.
  const { patient: late } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Late Night' } }));
  const { visit: old } = await json(owner(`/api/b/main/patients/${late.id}/visits`, { method: 'POST', body: {} }));
  await t.db.run(sql`update op_visit set visit_date = date(visit_date, '-1 day') where id = ${old.id}`);
  const queue = (await json(owner('/api/b/main/checkout-queue'))).queue.map((e: any) => e.visitId);
  expect(queue.indexOf(old.id)).toBeGreaterThanOrEqual(0);
  expect(queue.indexOf(old.id)).toBeLessThan(queue.indexOf(visit.id));
  const paid = await json(owner(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 15000, itemIds: [] } }));
  expect(paid.bill).toMatchObject({ consultationFeePaise: 0, totalPaise: 15000 });
  expect(paid.visitStatus).toBe('completed');
});

it('typing the first result marks the sample collected by itself', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const { id: testId } = await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name: 'ESR', pricePaise: 10000 } }));
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Auto Sample' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  await owner(`/api/b/main/visits/${visit.id}/lab-orders`, { method: 'POST', body: { testIds: [testId] } });
  const report = await json(lab(`/api/b/main/visits/${visit.id}/lab-report`));
  const test = report.tests[0];
  const put = (results: unknown) => lab(`/api/b/main/lab/orders/${test.orderId}/results`, { method: 'PUT', body: { results } });
  expect((await put(test.parameters.map((p: any) => ({ parameterId: p.id, value: '' })))).status).toBe(200);
  expect((await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0].status).toBe('ordered'); // nothing typed yet
  expect((await put([{ parameterId: test.parameters[0].id, value: '12' }])).status).toBe(200);
  expect((await json(lab(`/api/b/main/visits/${visit.id}/lab-report`))).tests[0]).toMatchObject({ status: 'sample_collected', sampleCollectedAt: expect.any(String) });
  expect((await owner(`/api/b/east/lab/orders/${test.orderId}/results`, { method: 'PUT', body: { results: [] } })).status).toBe(404);
});

it('fee by time of day; lab-only and bill-only visits take no token; a patient pays all dues at once, oldest bill first', async () => {
  const owner = await t.as('owner');
  const desk = await t.as('desk');
  // A slot that covers now (whatever the hour): the new visit takes its fee.
  const ist = new Date(Date.now() + 330 * 60_000);
  const hh = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
  const slot = { from: hh(ist.getUTCHours()), to: hh(ist.getUTCHours() + 1), feePaise: 20000 };
  expect((await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 10000, feeSlots: [slot] } })).status).toBe(200);
  expect((await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 10000, feeSlots: [{ from: '25:00', to: '06:00', feePaise: 1 }] } })).status).toBe(400);
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Night Owl' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  const feeOf = async (id: number) => (await json(owner(`/api/b/main/visits/${id}`))).fee.consultationFeePaise;
  expect(await feeOf(visit.id)).toBe(20000);
  expect((await json(owner('/api/b/east/billing/settings'))).feeSlots).toEqual([]);
  await owner('/api/b/main/billing/settings', { method: 'PUT', body: { consultationFeePaise: 10000, feeSlots: [] } });
  const day = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));
  expect(await feeOf(day.visit.id)).toBe(10000); // the standard fee

  const { visit: billOnly } = await json(owner(`/api/b/main/patients/${patient.id}/direct-bill`, { method: 'POST', body: {} }));
  expect(billOnly.opNo).toMatch(/^CHG-\d{6}-\d{3}$/);
  expect(billOnly.token ?? null).toBeNull();

  // Two bills paid in part: one payment settles the oldest first.
  for (const v of [visit, day.visit]) await owner(`/api/b/main/visits/${v.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 0, itemIds: [] } });
  const before = (await json(owner(`/api/b/main/patients/${patient.id}/bills`))).summary.balancePaise;
  expect(before).toBe(30000);
  expect((await owner(`/api/b/main/patients/${patient.id}/pay-dues`, { method: 'POST', body: { amountPaise: 40000, mode: 'cash' } })).status).toBe(400);
  expect((await owner(`/api/b/east/patients/${patient.id}/pay-dues`, { method: 'POST', body: { amountPaise: 100, mode: 'cash' } })).status).toBe(404);
  expect((await (await t.as('labtech'))(`/api/b/main/patients/${patient.id}/pay-dues`, { method: 'POST', body: { amountPaise: 100, mode: 'cash' } })).status).toBe(403);
  const paid = await json(desk(`/api/b/main/patients/${patient.id}/pay-dues`, { method: 'POST', body: { amountPaise: 25000, mode: 'upi' } }));
  expect(paid.bills.map((b: any) => b.amountPaise)).toEqual([20000, 5000]);
  expect(paid.leftDuePaise).toBe(5000);
});

it('lab: packages at one price, paid tag in the queue, referred by, report by period, earlier results', async () => {
  const owner = await t.as('owner');
  const lab = await t.as('labtech');
  const doc = await t.as('doc');
  const mk = async (name: string, pricePaise: number) => (await json(owner('/api/b/main/lab/tests', { method: 'POST', body: { name, pricePaise, parameters: [{ name: `${name} value`, method: '', unit: '', refRange: '1 - 10' }] } }))).id as number;
  const a = await mk('Pkg Test A', 30000);
  const bTest = await mk('Pkg Test B', 10000);
  // Packages: only Settings may make them; another branch never sees them.
  expect((await doc('/api/b/main/lab/packages', { method: 'POST', body: { name: 'Fever profile', pricePaise: 32000, testIds: [a, bTest] } })).status).toBe(403);
  const { id: pkg } = await json(owner('/api/b/main/lab/packages', { method: 'POST', body: { name: 'Fever profile', pricePaise: 32000, testIds: [a, bTest] } }));
  expect((await json(doc('/api/b/main/lab/packages'))).packages).toEqual([{ id: pkg, name: 'Fever profile', pricePaise: 32000, testIds: [a, bTest], testsPaise: 40000 }]);
  expect((await json(owner('/api/b/east/lab/packages'))).packages).toEqual([]);
  expect((await owner(`/api/b/east/lab/packages/${pkg}`, { method: 'DELETE' })).status).toBe(404);

  // Ordered as a package: the tests share its price (3:1), adding up to ₹320. Not paid yet in the queue.
  const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Package Patient' } }));
  const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/direct-lab`, { method: 'POST', body: { packageIds: [pkg], referredBy: 'Dr. Outside' } }));
  const queue = (await json(lab('/api/b/main/lab/orders'))).orders.filter((o: any) => o.visitId === visit.id);
  expect(queue.map((o: any) => o.pricePaise).sort((x: number, y: number) => x - y)).toEqual([8000, 24000]);
  expect(queue.every((o: any) => o.paid === false)).toBe(true);
  await owner(`/api/b/main/visits/${visit.id}/checkout`, { method: 'POST', body: { paymentMode: 'cash', amountPaise: 32000, itemIds: [] } });
  expect((await json(lab('/api/b/main/lab/orders'))).orders.filter((o: any) => o.visitId === visit.id).every((o: any) => o.paid)).toBe(true);
  const report = await json(lab(`/api/b/main/visits/${visit.id}/lab-report`));
  expect(report.visit.referredBy).toBe('Dr. Outside');

  // Complete A twice on two visits: the second visit sees the first one's value as history.
  const complete = async (v: number) => {
    const r = await json(lab(`/api/b/main/visits/${v}/lab-report`));
    const tA = r.tests.find((x: any) => x.testId === a);
    await lab(`/api/b/main/lab/orders/${tA.orderId}/results`, { method: 'PUT', body: { complete: true, results: [{ parameterId: tA.parameters[0].id, value: '7' }] } });
  };
  await complete(visit.id);
  const { visit: second } = await json(owner(`/api/b/main/patients/${patient.id}/direct-lab`, { method: 'POST', body: { testIds: [a] } }));
  const history = (await json(lab(`/api/b/main/visits/${second.id}/lab-history`))).history;
  expect(Object.values(history).flat().map((h: any) => h.value)).toEqual(['7']);
  expect((await owner(`/api/b/east/visits/${second.id}/lab-history`)).status).toBe(404);

  // The lab report by period: reports permission only.
  const r = await json(owner('/api/b/main/lab/report?days=1'));
  expect(r.tests.find((x: any) => x.testId === a)).toMatchObject({ count: 1, amountPaise: 24000 });
  expect((await lab('/api/b/main/lab/report')).status).toBe(403);
});

it('reports take chosen dates (?from=&to=), both ends included, in either order, at most 366 days', async () => {
  const owner = await t.as('owner');
  const r = await json(owner('/api/b/main/reports/period?from=2026-01-10&to=2026-01-13'));
  expect(r).toMatchObject({ from: '2026-01-10', to: '2026-01-13', days: 4 });
  expect(await json(owner('/api/b/main/reports/period?from=2026-01-13&to=2026-01-10'))).toMatchObject({ from: '2026-01-10', to: '2026-01-13' });
  expect((await json(owner('/api/b/main/reports/period?from=2020-01-01&to=2026-01-01'))).days).toBe(366);
  expect(await json(owner('/api/b/main/lab/report?from=2026-01-10&to=2026-01-13'))).toMatchObject({ from: '2026-01-10', to: '2026-01-13', tests: [] });
  expect(await json(owner('/api/b/main/pharmacy/sales?from=2026-01-10&to=2026-01-13'))).toMatchObject({ from: '2026-01-10', to: '2026-01-13', sales: [] });
  expect((await json(owner('/api/b/main/reports/period?from=bad&to=2026-01-13'))).days).toBe(1); // not a date: today
});

it('"Correct completed lab results": the branch admin role gets it once; the lab technician only when ticked', async () => {
  const { addLabCorrectPermission } = await import('../src/lib/lab-merge.js');
  const { sql } = await import('drizzle-orm');
  await t.db.run(sql`delete from role_permission where permission = 'lab.correct'`);
  expect(await addLabCorrectPermission(t.db)).toBe(1);
  expect(await addLabCorrectPermission(t.db)).toBe(0); // marked as done: an owner who unticks it keeps it unticked
  const owner = await t.as('owner');
  const roles = (await json(owner('/api/b/main/roles'))).roles;
  expect(roles.find((r: any) => r.key === 'branch_admin').permissions).toContain('lab.correct');
  expect(roles.find((r: any) => r.key === 'lab_technician')?.permissions ?? []).not.toContain('lab.correct');
});
