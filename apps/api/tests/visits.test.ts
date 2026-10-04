import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { idPrefixFor } from '@platform/core';
import { opToken } from '@platform/shared';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function patientIn(caller: Awaited<ReturnType<typeof t.as>>, branch: string, name: string) {
  return (await (await caller(`/api/b/${branch}/patients`, { method: 'POST', body: { name } })).json()).patient;
}

describe('OP visits', () => {
  it('numbers visits OP-YYMMDD-NNN per branch per day', async () => {
    const owner = await t.as('owner');
    const a = await patientIn(owner, 'main', 'Ravi Kumar');
    const b = await patientIn(owner, 'east', 'Muthu Selvam');
    const v1 = (await (await owner(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: { complaint: 'Fever' } })).json()).visit;
    const v2 = (await (await owner(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: {} })).json()).visit;
    const v3 = (await (await owner(`/api/b/east/patients/${b.id}/visits`, { method: 'POST', body: {} })).json()).visit;
    const stamp = today().slice(2).replace(/-/g, '');
    expect([v1.opNo, v2.opNo, v3.opNo]).toEqual([`OP-${stamp}-001`, `OP-${stamp}-002`, `OP-${stamp}-001`]);
    expect(v1).toMatchObject({ status: 'waiting', complaint: 'Fever', visitDate: today() });
  });

  it('gives each visit a token: the running number of the day in its own branch', async () => {
    const owner = await t.as('owner');
    const a = await patientIn(owner, 'main', 'Ravi Kumar');
    const a2 = await patientIn(owner, 'main', 'Lakshmi Devi');
    const b = await patientIn(owner, 'east', 'Muthu Selvam');
    const start = async (branch: string, id: number) => (await (await owner(`/api/b/${branch}/patients/${id}/visits`, { method: 'POST', body: {} })).json()).visit;
    const v1 = await start('main', a.id);
    const e1 = await start('east', b.id); // another branch in between does not use up a main token
    const v2 = await start('main', a2.id);
    const e2 = await start('east', b.id);
    expect([v1.token, v2.token, e1.token, e2.token]).toEqual([1, 2, 1, 2]);

    // Completing the first visit does not move it: the list stays in token order.
    await owner(`/api/b/main/visits/${v1.id}`, { method: 'PATCH', body: { status: 'completed' } });
    const list = await (await owner('/api/b/main/visits')).json();
    expect(list.visits.map((v: any) => [v.token, v.patientName, v.status])).toEqual([
      [1, 'Ravi Kumar', 'completed'],
      [2, 'Lakshmi Devi', 'waiting'],
    ]);

    // Detail, the patient's visits, and the billing rows carry the same token.
    expect((await (await owner(`/api/b/main/visits/${v2.id}`)).json()).visit.token).toBe(2);
    expect((await (await owner(`/api/b/main/patients/${a2.id}/visits`)).json()).visits.map((v: any) => v.token)).toEqual([2]);
    const toBill = await (await owner('/api/b/main/billing/to-bill')).json();
    expect(toBill.visits.map((v: any) => v.token)).toEqual([1, 2]);
    const { bill } = await (await owner(`/api/b/main/visits/${v2.id}/bills`, { method: 'POST' })).json();
    expect(bill.token).toBe(2);
    expect((await (await owner('/api/b/main/bills?status=all')).json()).bills.map((x: any) => x.token)).toEqual([2]);
  });

  it('opToken reads the token from an OP no. and gives null for anything else', () => {
    expect([opToken('OP-261003-009'), opToken('OP-261003-1000'), opToken('OP-OLD-7'), opToken('')]).toEqual([9, 1000, null, null]);
  });

  it("lists today's visits with patient names, only for this branch", async () => {
    const owner = await t.as('owner');
    const a = await patientIn(owner, 'main', 'Ravi Kumar');
    const b = await patientIn(owner, 'east', 'Muthu Selvam');
    await owner(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: {} });
    await owner(`/api/b/east/patients/${b.id}/visits`, { method: 'POST', body: {} });
    const main = await (await owner('/api/b/main/visits')).json();
    expect(main.date).toBe(today());
    expect(main.visits.map((v: any) => [v.patientName, v.patientUhid])).toEqual([['Ravi Kumar', 'AH000001']]);
    const dash = await (await owner('/api/b/main/dashboard')).json();
    expect(dash).toMatchObject({ opVisitsToday: 1, opWaiting: 1 });
  });

  it("another branch's patient or visit answers 404", async () => {
    const owner = await t.as('owner');
    const a = await patientIn(owner, 'main', 'Ravi Kumar');
    const v = (await (await owner(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: {} })).json()).visit;
    expect((await owner(`/api/b/east/patients/${a.id}/visits`, { method: 'POST', body: {} })).status).toBe(404);
    expect((await owner(`/api/b/east/patients/${a.id}/visits`)).status).toBe(404);
    expect((await owner(`/api/b/east/visits/${v.id}`, { method: 'PATCH', body: { status: 'completed' } })).status).toBe(404);
    expect((await owner(`/api/b/east/visits/${v.id}`, { method: 'DELETE' })).status).toBe(404);
  });

  it('complete, then soft delete; permissions follow the patient ones', async () => {
    const owner = await t.as('owner');
    const doc = await t.as('doc');
    const lab = await t.as('labtech');
    const a = await patientIn(owner, 'main', 'Ravi Kumar');
    const v = (await (await doc(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: {} })).json()).visit;
    expect((await lab(`/api/b/main/patients/${a.id}/visits`, { method: 'POST', body: {} })).status).toBe(403);
    const done = await (await doc(`/api/b/main/visits/${v.id}`, { method: 'PATCH', body: { status: 'completed', notes: 'Reviewed' } })).json();
    expect(done.visit).toMatchObject({ status: 'completed', notes: 'Reviewed' });
    expect((await doc(`/api/b/main/visits/${v.id}`, { method: 'DELETE' })).status).toBe(403); // doctors can't delete
    expect((await owner(`/api/b/main/visits/${v.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await (await owner(`/api/b/main/patients/${a.id}/visits`)).json()).visits).toEqual([]);
  });
});

it('ID prefix falls back to the organization initials', () => {
  expect(idPrefixFor({ name: 'City Hospital', idPrefix: '' })).toBe('CH');
  expect(idPrefixFor({ name: 'City Hospital', idPrefix: 'XYZ' })).toBe('XYZ');
});

describe('doctor and vitals', () => {
  it('lists only doctors of this branch; a visit takes a doctor + vitals; weight updates the patient', async () => {
    const owner = await t.as('owner');
    const { doctors } = await (await owner('/api/b/main/doctors')).json();
    expect(doctors.map((d: any) => d.name)).toEqual(['doc']);
    expect((await (await owner('/api/b/east/doctors')).json()).doctors).toEqual([]);

    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const res = await owner(`/api/b/main/patients/${p.id}/visits`, {
      method: 'POST',
      body: { doctorUserId: doctors[0].userId, bpSystolic: 130, bpDiastolic: 85, pulse: 78, temperatureF: 99.4, spo2: 97, weightKg: 71.2 },
    });
    expect(res.status).toBe(201);
    const { visit } = await res.json();
    expect(visit).toMatchObject({ doctorName: 'doc', bpSystolic: 130, bpDiastolic: 85, pulse: 78, temperatureF: 99.4, spo2: 97, weightKg: 71.2 });
    const after = (await (await owner(`/api/b/main/patients/${p.id}`)).json()).patient;
    expect(after.weightKg).toBe(71.2);

    const list = await (await owner(`/api/b/main/visits?doctor=${doctors[0].userId}`)).json();
    expect(list.visits.map((v: any) => v.doctorName)).toEqual(['doc']);
  });

  it('refuses a doctor from outside the branch and out-of-range vitals', async () => {
    const owner = await t.as('owner');
    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const ownerId = (await (await owner('/api/auth/me')).json()).user.id;
    const notDoctor = await owner(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: { doctorUserId: ownerId } });
    expect(notDoctor.status).toBe(400);
    expect((await notDoctor.json()).fields.doctorUserId).toBeTruthy();
    const bad = await owner(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: { bpSystolic: 400, spo2: 120, temperatureF: 50 } });
    expect(Object.keys((await bad.json()).fields).sort()).toEqual(['bpSystolic', 'spo2', 'temperatureF']);
  });

  it('vitals can be added later by editing the visit', async () => {
    const owner = await t.as('owner');
    const p = await patientIn(owner, 'main', 'Ravi Kumar');
    const { visit } = await (await owner(`/api/b/main/patients/${p.id}/visits`, { method: 'POST', body: {} })).json();
    const edited = await (await owner(`/api/b/main/visits/${visit.id}`, { method: 'PATCH', body: { pulse: 88, notes: 'Pulse retaken' } })).json();
    expect(edited.visit).toMatchObject({ pulse: 88, notes: 'Pulse retaken', status: 'waiting' });
  });
});
