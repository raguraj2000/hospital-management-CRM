import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLog } from '../src/db/schema.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const ravi = { name: 'Ravi Kumar', phone: '98765 43210', email: ' Ravi@Example.com ', gender: 'male', ageYears: 45 };

describe('patients: branch isolation', () => {
  it('each branch only ever sees its own patients', async () => {
    const owner = await t.as('owner');
    const inMain = await (await owner('/api/b/main/patients', { method: 'POST', body: ravi })).json();
    await owner('/api/b/east/patients', { method: 'POST', body: { name: 'Muthu Selvam' } });

    const mainList = await (await owner('/api/b/main/patients')).json();
    const eastList = await (await owner('/api/b/east/patients')).json();
    expect(mainList.patients.map((p: any) => p.name)).toEqual(['Ravi Kumar']);
    expect(eastList.patients.map((p: any) => p.name)).toEqual(['Muthu Selvam']);

    // Main's patient asked for through East: looks exactly like it doesn't exist.
    const cross = await owner(`/api/b/east/patients/${inMain.patient.id}`);
    expect(cross.status).toBe(404);
    expect((await owner(`/api/b/east/patients/${inMain.patient.id}`, { method: 'PATCH', body: { name: 'Hacked' } })).status).toBe(404);
    expect((await owner(`/api/b/east/patients/${inMain.patient.id}`, { method: 'DELETE' })).status).toBe(404);
    const still = await (await owner(`/api/b/main/patients/${inMain.patient.id}`)).json();
    expect(still.patient.name).toBe('Ravi Kumar');
  });

  it('staff cannot open a branch they are not a member of (404, not 403)', async () => {
    const doc = await t.as('doc'); // main only
    const res = await doc('/api/b/east/patients');
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('branch_not_found');
    expect((await doc('/api/b/nowhere/patients')).status).toBe(404);
  });

  it('gives every patient a UHID (AH + 6 digits) that never repeats across branches', async () => {
    const owner = await t.as('owner');
    const a = await (await owner('/api/b/main/patients', { method: 'POST', body: { name: 'A One' } })).json();
    const b = await (await owner('/api/b/main/patients', { method: 'POST', body: { name: 'B Two' } })).json();
    const c = await (await owner('/api/b/east/patients', { method: 'POST', body: { name: 'C Three' } })).json();
    expect([a.patient.uhid, b.patient.uhid, c.patient.uhid]).toEqual(['AH000001', 'AH000002', 'AH000003']);
  });
});

describe('patients: permissions', () => {
  it('lab technician can view but not create, edit or delete', async () => {
    const owner = await t.as('owner');
    const p = await (await owner('/api/b/main/patients', { method: 'POST', body: ravi })).json();
    const lab = await t.as('labtech');
    expect((await lab('/api/b/main/patients')).status).toBe(200);
    expect((await lab('/api/b/main/patients', { method: 'POST', body: ravi })).status).toBe(403);
    expect((await lab(`/api/b/main/patients/${p.patient.id}`, { method: 'PATCH', body: { name: 'X Y' } })).status).toBe(403);
    expect((await lab(`/api/b/main/patients/${p.patient.id}`, { method: 'DELETE' })).status).toBe(403);
  });

  it('a doctor cannot delete patients (only roles with patient.delete)', async () => {
    const doc = await t.as('doc');
    const p = await (await doc('/api/b/main/patients', { method: 'POST', body: ravi })).json();
    expect((await doc(`/api/b/main/patients/${p.patient.id}`, { method: 'DELETE' })).status).toBe(403);
  });
});

describe('patients: data', () => {
  it('cleans input: +91 phone, lowercase email, blanks become empty', async () => {
    const doc = await t.as('doc');
    const res = await doc('/api/b/main/patients', { method: 'POST', body: { ...ravi, address: '   ' } });
    expect(res.status).toBe(201);
    const { patient } = await res.json();
    expect(patient).toMatchObject({ name: 'Ravi Kumar', phone: '+919876543210', email: 'ravi@example.com', address: null, uhid: 'AH000001' });
  });

  it('saves weight and emergency contact (phone cleaned like the main phone)', async () => {
    const doc = await t.as('doc');
    const res = await doc('/api/b/main/patients', {
      method: 'POST',
      body: { name: 'Asha Devi', weightKg: 58.5, emergencyContactName: ' Ramesh (husband) ', emergencyContactPhone: '091234 56789' },
    });
    expect(res.status).toBe(201);
    const { patient } = await res.json();
    expect(patient).toMatchObject({ weightKg: 58.5, emergencyContactName: 'Ramesh (husband)', emergencyContactPhone: '+919123456789' });
    const bad = await doc('/api/b/main/patients', { method: 'POST', body: { name: 'Asha Devi', weightKg: 0, emergencyContactPhone: '555' } });
    expect(Object.keys((await bad.json()).fields).sort()).toEqual(['emergencyContactPhone', 'weightKg']);
  });

  it('rejects bad input with field messages', async () => {
    const doc = await t.as('doc');
    const res = await doc('/api/b/main/patients', { method: 'POST', body: { name: 'R', phone: '12345', email: 'nope' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('validation');
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'name', 'phone']);
  });

  it('searches by name, UHID and phone; % is just a character', async () => {
    const doc = await t.as('doc');
    await doc('/api/b/main/patients', { method: 'POST', body: ravi });
    await doc('/api/b/main/patients', { method: 'POST', body: { name: 'Asha Devi', phone: '9812345678' } });
    const names = async (q: string) => (await (await doc(`/api/b/main/patients?q=${encodeURIComponent(q)}`)).json()).patients.map((p: any) => p.name);
    expect(await names('asha')).toEqual(['Asha Devi']);
    expect(await names('ah000001')).toEqual(['Ravi Kumar']);
    expect(await names('98123')).toEqual(['Asha Devi']);
    expect(await names('%')).toEqual([]);
  });

  it('filters by gender and pages with limit/offset', async () => {
    const doc = await t.as('doc');
    await doc('/api/b/main/patients', { method: 'POST', body: ravi });
    await doc('/api/b/main/patients', { method: 'POST', body: { name: 'Asha Devi', gender: 'female' } });
    await doc('/api/b/main/patients', { method: 'POST', body: { name: 'Meena Raj', gender: 'female' } });
    const female = await (await doc('/api/b/main/patients?gender=female')).json();
    expect(female.total).toBe(2);
    expect(female.patients.map((p: any) => p.name)).toEqual(['Meena Raj', 'Asha Devi']);
    const page2 = await (await doc('/api/b/main/patients?limit=1&offset=1')).json();
    expect(page2.total).toBe(3);
    expect(page2.patients.map((p: any) => p.name)).toEqual(['Asha Devi']);
  });

  it('edit and soft delete are audited; deleted patients disappear from lists', async () => {
    const owner = await t.as('owner');
    const { patient } = await (await owner('/api/b/main/patients', { method: 'POST', body: ravi })).json();
    const edited = await (await owner(`/api/b/main/patients/${patient.id}`, { method: 'PATCH', body: { email: '' } })).json();
    expect(edited.patient.email).toBeNull();
    expect((await owner(`/api/b/main/patients/${patient.id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await (await owner('/api/b/main/patients')).json()).total).toBe(0);
    expect((await owner(`/api/b/main/patients/${patient.id}`)).status).toBe(404);
    const actions = (await t.db.select().from(auditLog)).filter((a) => a.entity === 'patient').map((a) => a.action);
    expect(actions).toEqual(['create', 'update', 'delete']);
  });
});
