// The patient journey: waiting -> with_doctor -> (at_lab -> with_doctor)* -> at_counter -> completed.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

type Caller = Awaited<ReturnType<typeof t.as>>;
const json = async (r: Response | Promise<Response>) => (await r).json();
const post = (caller: Caller, url: string, body: unknown = {}) => caller(url, { method: 'POST', body });

/** The owner, the Doctor-role user "doc", and the owner ticked as a second doctor of main. */
async function people() {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  const docId: number = (await json(owner('/api/b/main/doctors'))).doctors[0].userId;
  const ownerId: number = (await json(owner('/api/auth/me'))).user.id;
  expect((await owner('/api/b/main/doctor-settings', { method: 'PUT', body: { doctorUserIds: [ownerId], defaultDoctorUserId: null } })).status).toBe(200);
  return { owner, doc, docId, ownerId };
}

async function visitFor(caller: Caller, branch: string, name: string, doctorUserId: number | null) {
  const { patient } = await json(post(caller, `/api/b/${branch}/patients`, { name }));
  const { visit } = await json(post(caller, `/api/b/${branch}/patients/${patient.id}/visits`, { doctorUserId }));
  return visit as { id: number; token: number; status: string };
}

const callNext = (caller: Caller, body: unknown = {}, branch = 'main') => post(caller, `/api/b/${branch}/visits/call-next`, body);
const send = (caller: Caller, visitId: number, body: unknown, branch = 'main') => post(caller, `/api/b/${branch}/visits/${visitId}/send`, body);
const statusOf = async (caller: Caller, visitId: number, branch = 'main') => (await json(caller(`/api/b/${branch}/visits/${visitId}`))).visit.status;

async function labTest(owner: Caller, name: string, branch = 'main') {
  return (await json(post(owner, `/api/b/${branch}/lab/tests`, { name, pricePaise: 30000 }))).id as number;
}
/** Orders the tests for the visit and returns the order ids. */
async function order(caller: Caller, visitId: number, testIds: number[]) {
  expect((await post(caller, `/api/b/main/visits/${visitId}/lab-orders`, { testIds })).status).toBe(201);
  const { orders } = await json(caller(`/api/b/main/visits/${visitId}/lab-orders`));
  return (orders as { id: number; testId: number }[]).filter((o) => testIds.includes(o.testId)).map((o) => o.id);
}
const complete = async (lab: Caller, orderId: number) => expect((await lab(`/api/b/main/lab/orders/${orderId}/results`, { method: 'PUT', body: { results: [], complete: true } })).status).toBe(200);

describe('call next', () => {
  it('takes tokens in order per doctor; one patient inside per doctor, and two doctors can each have one', async () => {
    const { owner, doc, docId, ownerId } = await people();
    const desk = await t.as('desk');
    const v1 = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    const o1 = await visitFor(owner, 'main', 'Owner Patient', ownerId); // token 2, the other doctor's
    const v2 = await visitFor(owner, 'main', 'Lakshmi Devi', docId);
    const v3 = await visitFor(owner, 'main', 'Muthu Selvam', docId);

    // The doctor's own queue by default: token 1, nobody was inside.
    const first = await json(callNext(doc));
    expect(first).toMatchObject({ visit: { id: v1.id, token: 1, status: 'with_doctor', patientName: 'Ravi Kumar' }, previous: null, reason: 'next_token' });

    // Done with token 1; the next call skips the other doctor's token 2.
    expect((await send(doc, v1.id, { to: 'counter' })).status).toBe(200);
    expect(await json(callNext(doc))).toMatchObject({ visit: { id: v2.id, token: 3 }, previous: null, reason: 'next_token' });

    // Called again without finishing: the one inside goes back to waiting, never two inside.
    expect(await json(callNext(doc))).toMatchObject({ visit: { id: v3.id }, previous: { id: v2.id, status: 'waiting' }, reason: 'next_token' });

    // The second doctor has their own slot.
    expect(await json(callNext(owner))).toMatchObject({ visit: { id: o1.id, status: 'with_doctor' }, previous: null });
    const inside = (await json(owner('/api/b/main/visits'))).visits.filter((v: any) => v.status === 'with_doctor').map((v: any) => v.id);
    expect(inside).toEqual([o1.id, v3.id]);

    // The front desk (not a doctor) calls for a doctor by id...
    expect(await json(callNext(desk, { doctorUserId: docId }))).toMatchObject({ visit: { id: v2.id }, previous: { id: v3.id } });
    // ...or for everyone: the lowest waiting token of the branch.
    expect(await json(callNext(desk))).toMatchObject({ visit: { id: v3.id }, previous: { id: v2.id } });
    expect((await callNext(desk, { doctorUserId: 999_999 })).status).toBe(400); // not a doctor here
    expect(await statusOf(owner, o1.id)).toBe('with_doctor'); // the other doctor's patient was never touched
  });

  it('a patient back from the lab with results ready goes in before the next token', async () => {
    const { owner, doc, docId } = await people();
    const lab = await t.as('labtech');
    const cbc = await labTest(owner, 'CBC');
    const v1 = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    const v2 = await visitFor(owner, 'main', 'Lakshmi Devi', docId);
    const v3 = await visitFor(owner, 'main', 'Muthu Selvam', docId);

    await callNext(doc);
    const [orderId] = await order(doc, v1.id, [cbc]);
    // To the lab, and the next patient comes in with the same click.
    const sent = await json(send(doc, v1.id, { to: 'lab', callNext: true }));
    expect(sent).toMatchObject({ visit: { id: v1.id, status: 'at_lab', labReady: false }, next: { visit: { id: v2.id, status: 'with_doctor' }, reason: 'next_token' } });

    // Result not ready yet: the queue still says token 3 is next.
    let { queue } = await json(doc('/api/b/main/visits'));
    expect(queue).toMatchObject({ doctorUserId: docId, withDoctor: [{ id: v2.id }], next: { visit: { id: v3.id }, reason: 'next_token' }, labReady: [] });

    await complete(lab, orderId!);
    ({ queue } = await json(doc('/api/b/main/visits')));
    expect(queue).toMatchObject({ withDoctor: [{ id: v2.id }], next: { visit: { id: v1.id, labReady: true }, reason: 'lab_ready' }, labReady: [{ id: v1.id }] });

    // Token 2 goes to the counter; token 1 (back from the lab) is called before token 3.
    expect(await json(send(doc, v2.id, { to: 'counter', callNext: true }))).toMatchObject({
      visit: { id: v2.id, status: 'at_counter' },
      next: { visit: { id: v1.id, status: 'with_doctor' }, reason: 'lab_ready' },
    });
    expect(await json(send(doc, v1.id, { to: 'counter', callNext: true }))).toMatchObject({ next: { visit: { id: v3.id }, reason: 'next_token' } });

    // Nobody left: sending still works (next is null), a bare call-next says so.
    const last = await send(doc, v3.id, { to: 'counter', callNext: true });
    expect(last.status).toBe(200);
    expect(await last.json()).toMatchObject({ visit: { status: 'at_counter' }, next: null });
    const nobody = await callNext(doc);
    expect(nobody.status).toBe(409);
    expect(await nobody.json()).toMatchObject({ code: 'nobody_waiting', error: expect.stringMatching(/Nobody is waiting/) });
    // Viewing another day has no queue.
    expect((await json(doc('/api/b/main/visits?date=2020-01-01'))).queue).toBeNull();
  });

  it('a chosen visit is called in; completed, cancelled, missing or another branch are refused', async () => {
    const { owner, doc, docId } = await people();
    const v1 = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    const v2 = await visitFor(owner, 'main', 'Lakshmi Devi', docId);
    const v3 = await visitFor(owner, 'main', 'Muthu Selvam', null); // no doctor: its own slot
    const e1 = await visitFor(owner, 'east', 'East Only', null);

    expect(await json(callNext(doc, { visitId: v2.id }))).toMatchObject({ visit: { id: v2.id, status: 'with_doctor' }, previous: null, reason: 'chosen' });
    expect(await json(callNext(doc, { visitId: v3.id }))).toMatchObject({ visit: { id: v3.id, status: 'with_doctor' }, previous: null }); // unassigned slot
    expect(await statusOf(doc, v2.id)).toBe('with_doctor');
    expect(await json(callNext(doc, { visitId: v1.id }))).toMatchObject({ visit: { id: v1.id }, previous: { id: v2.id, status: 'waiting' } });

    await owner(`/api/b/main/visits/${v2.id}`, { method: 'PATCH', body: { status: 'completed' } });
    await owner(`/api/b/main/visits/${v3.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    expect((await callNext(doc, { visitId: v2.id })).status).toBe(409);
    expect((await callNext(doc, { visitId: v3.id })).status).toBe(409);
    expect((await send(doc, v2.id, { to: 'counter' })).status).toBe(409);

    // Another branch's visit answers exactly like a missing one.
    expect((await callNext(owner, { visitId: e1.id })).status).toBe(404);
    expect((await callNext(owner, { visitId: 999_999 })).status).toBe(404);
    expect((await send(owner, e1.id, { to: 'counter' })).status).toBe(404);
    expect(await statusOf(owner, e1.id, 'east')).toBe('waiting');
  });

  it("branches are separate: another branch's waiting patient is never called or shown", async () => {
    const { owner, doc } = await people();
    const e1 = await visitFor(owner, 'east', 'East Only', null);
    expect((await callNext(owner)).status).toBe(409); // main has nobody, east's patient does not count
    expect((await json(owner('/api/b/main/visits'))).queue).toMatchObject({ withDoctor: [], next: null, labReady: [] });
    expect((await callNext(doc, {}, 'east')).status).toBe(404); // doc is not a member of east

    const m1 = await visitFor(owner, 'main', 'Ravi Kumar', null);
    expect(await json(callNext(owner, {}, 'east'))).toMatchObject({ visit: { id: e1.id }, previous: null });
    // Both have no doctor, but the slot is per branch: calling in main does not push east's patient out.
    expect(await json(callNext(owner, { doctorUserId: null }))).toMatchObject({ visit: { id: m1.id }, previous: null });
    expect(await statusOf(owner, e1.id, 'east')).toBe('with_doctor');
    expect((await json(owner('/api/b/east/visits'))).queue.withDoctor.map((v: any) => v.id)).toEqual([e1.id]);
  });

  it('needs the permission to change a visit', async () => {
    const { owner, docId } = await people();
    const v = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    for (const who of ['labtech', 'pharm']) {
      const caller = await t.as(who); // patient.view only
      expect((await callNext(caller)).status).toBe(403);
      expect((await callNext(caller, { visitId: v.id })).status).toBe(403);
      expect((await send(caller, v.id, { to: 'counter' })).status).toBe(403);
    }
    expect(await statusOf(owner, v.id)).toBe('waiting');
  });
});

describe('send and status rules', () => {
  it('to the lab needs a test that is not finished; back to waiting does not call the same patient again', async () => {
    const { owner, doc, docId } = await people();
    const lab = await t.as('labtech');
    const cbc = await labTest(owner, 'CBC');
    const v1 = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    await callNext(doc);

    const none = await send(doc, v1.id, { to: 'lab' });
    expect(none.status).toBe(400);
    expect((await none.json()).error).toBe('Order a test first');
    expect((await send(doc, v1.id, { to: 'pharmacy' })).status).toBe(400); // not a place

    const [orderId] = await order(doc, v1.id, [cbc]);
    expect(await json(send(doc, v1.id, { to: 'lab' }))).toMatchObject({ visit: { status: 'at_lab' }, next: null });
    await complete(lab, orderId!);
    expect((await send(doc, v1.id, { to: 'lab' })).status).toBe(400); // every test is done: nothing to wait for

    // Not finished: back to waiting. They are the only one waiting, so nobody is called in.
    await callNext(doc, { visitId: v1.id });
    expect(await json(send(doc, v1.id, { to: 'waiting', callNext: true }))).toMatchObject({ visit: { id: v1.id, status: 'waiting' }, next: null });
  });

  it('editing a visit sets only waiting / completed / cancelled, and refuses nonsense', async () => {
    const { owner, doc, docId, ownerId } = await people();
    const v = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    const patch = (body: unknown) => owner(`/api/b/main/visits/${v.id}`, { method: 'PATCH', body });
    for (const status of ['with_doctor', 'at_lab', 'at_counter', 'nonsense']) expect((await patch({ status })).status).toBe(400);
    expect(await statusOf(owner, v.id)).toBe('waiting');

    // The checkout's last step: at the counter -> completed.
    await callNext(doc);
    await send(doc, v.id, { to: 'counter' });
    expect((await patch({ status: 'completed' })).status).toBe(200);
    expect((await patch({ status: 'cancelled' })).status).toBe(409);
    expect((await patch({ status: 'waiting' })).status).toBe(200);
    expect((await patch({ status: 'cancelled' })).status).toBe(200);
    expect((await patch({ status: 'completed' })).status).toBe(409);
    expect((await patch({ status: 'waiting' })).status).toBe(200);

    // Handed to another doctor while inside: waits for the new doctor, so that doctor never has two inside.
    await callNext(doc);
    expect((await json(patch({ doctorUserId: ownerId }))).visit).toMatchObject({ doctorUserId: ownerId, status: 'waiting' });
  });
});

describe('what the OP list shows', () => {
  it('lab summary and labReady follow ordered -> sample collected -> completed, ignoring cancelled; medicines are counted', async () => {
    const { owner, doc, docId } = await people();
    const lab = await t.as('labtech');
    const tests = [await labTest(owner, 'CBC'), await labTest(owner, 'Blood sugar'), await labTest(owner, 'Urine routine')];
    const v = await visitFor(owner, 'main', 'Ravi Kumar', docId);
    const other = await visitFor(owner, 'main', 'Lakshmi Devi', docId);
    const both = async () => {
      const row = (await json(doc('/api/b/main/visits'))).visits.find((x: any) => x.id === v.id);
      const { visit } = await json(doc(`/api/b/main/visits/${v.id}`));
      expect({ lab: visit.lab, labReady: visit.labReady, medicineCount: visit.medicineCount }).toEqual({ lab: row.lab, labReady: row.labReady, medicineCount: row.medicineCount });
      return { lab: row.lab, labReady: row.labReady, medicineCount: row.medicineCount };
    };
    expect(await both()).toEqual({ lab: { ordered: 0, sampleCollected: 0, completed: 0 }, labReady: false, medicineCount: 0 });

    const [a, b, c] = await order(doc, v.id, tests);
    expect((await doc(`/api/b/main/lab/orders/${c}`, { method: 'PATCH', body: { status: 'cancelled' } })).status).toBe(200);
    expect(await both()).toMatchObject({ lab: { ordered: 2, sampleCollected: 0, completed: 0 }, labReady: false });

    expect((await lab(`/api/b/main/lab/orders/${a}`, { method: 'PATCH', body: { status: 'sample_collected' } })).status).toBe(200);
    expect(await both()).toMatchObject({ lab: { ordered: 1, sampleCollected: 1, completed: 0 }, labReady: false });
    await complete(lab, a!);
    expect(await both()).toMatchObject({ lab: { ordered: 1, sampleCollected: 0, completed: 1 }, labReady: false });
    await complete(lab, b!);
    expect(await both()).toMatchObject({ lab: { ordered: 0, sampleCollected: 0, completed: 2 }, labReady: true });

    const { id: med } = await json(post(owner, '/api/b/main/medicines', { name: 'Paracetamol', form: 'tablet', pricePaise: 200 }));
    const item = await json(post(doc, `/api/b/main/visits/${v.id}/prescription`, { medicineId: med, dose: '1-0-1', days: 2 }));
    await post(doc, `/api/b/main/visits/${v.id}/prescription`, { medicineId: med, dose: '1-1-1', days: 1 });
    expect((await both()).medicineCount).toBe(2);
    expect((await doc(`/api/b/main/prescription-items/${item.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await both()).medicineCount).toBe(1);

    // The other visit of the same list has nothing of this.
    const untouched = (await json(doc('/api/b/main/visits'))).visits.find((x: any) => x.id === other.id);
    expect(untouched).toMatchObject({ lab: { ordered: 0, sampleCollected: 0, completed: 0 }, labReady: false, medicineCount: 0 });
    // The patient's own visits carry the same numbers.
    const mine = (await json(doc(`/api/b/main/visits/${v.id}`))).visit.patientId;
    expect((await json(doc(`/api/b/main/patients/${mine}/visits`))).visits[0]).toMatchObject({ labReady: true, medicineCount: 1 });
  });

  it('dashboard: OP visits today counts everyone but cancelled; waiting counts only waiting', async () => {
    const { owner, doc, docId, ownerId } = await people();
    const cbc = await labTest(owner, 'CBC');
    // One visit in each status, in this order (the second one is the other doctor's).
    const made = [];
    for (const n of ['Waiting', 'Inside', 'At lab', 'At counter', 'Completed', 'Cancelled']) made.push(await visitFor(owner, 'main', `${n} Patient`, n === 'Inside' ? ownerId : docId));
    const [, inside, atLab, atCounter, completed, cancelled] = made;
    await order(doc, atLab!.id, [cbc]);
    expect((await send(doc, atLab!.id, { to: 'lab' })).status).toBe(200);
    expect((await send(doc, atCounter!.id, { to: 'counter' })).status).toBe(200);
    expect((await callNext(owner, { visitId: inside!.id })).status).toBe(200);
    await owner(`/api/b/main/visits/${completed!.id}`, { method: 'PATCH', body: { status: 'completed' } });
    await owner(`/api/b/main/visits/${cancelled!.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    await visitFor(owner, 'east', 'East Only', null);

    const statuses = (await json(owner('/api/b/main/visits'))).visits.map((v: any) => v.status);
    expect(statuses).toEqual(['waiting', 'with_doctor', 'at_lab', 'at_counter', 'completed', 'cancelled']);
    expect(await json(owner('/api/b/main/dashboard'))).toMatchObject({ opVisitsToday: 5, opWaiting: 1 });
    expect(await json(owner('/api/b/east/dashboard'))).toMatchObject({ opVisitsToday: 1, opWaiting: 1 });
  });
});
