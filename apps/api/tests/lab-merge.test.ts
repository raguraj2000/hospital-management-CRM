// The differential counts become lines of the CBC in a hospital that still has them as two tests.
import { afterEach, beforeEach, expect, it } from 'vitest';
import { unitsPerDay, suggestedQuantity } from '@platform/shared';
import { addRandomBloodSugar, mergeDifferentialIntoCbc } from '../src/lib/lab-merge.js';
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
  // Afterwards: an optional line may be emptied, a required one may not.
  expect((await put([{ parameterId: random.id, value: '' }], false)).status).toBe(200);
  expect((await put([{ parameterId: quality.id, value: '' }], false)).status).toBe(400);
});
