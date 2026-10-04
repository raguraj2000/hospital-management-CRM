// SaaS: many customers on one server. Customers are fully separate; you manage them from the platform console.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPlatformAdmin } from '../src/seed.js';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json();
const login = (mobile: string, password: string) =>
  t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, password }) });

async function caller(mobile: string, password: string) {
  const res = await login(mobile, password);
  if (res.status !== 200) throw new Error(`login ${mobile}: ${res.status}`);
  const cookie = res.headers.get('set-cookie')!.split(';')[0];
  return (url: string, init: { method?: string; body?: unknown } = {}) =>
    t.app.request(url, { method: init.method ?? 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}

const newCustomer = {
  name: 'Sri Clinic',
  idPrefix: 'SC',
  branchName: 'Main clinic',
  branchSlug: 'main', // same slug as the first customer's branch, on purpose
  ownerName: 'Dr. Ravi',
  ownerMobile: '91234 56789',
  ownerPassword: 'sri-owner-pass',
};

describe('platform console', () => {
  it('platform admin creates a customer whose owner signs in with their mobile', async () => {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    const me = await json(admin('/api/auth/me'));
    expect(me.user.isPlatformAdmin).toBe(true);
    expect(me.branches).toEqual([]); // no patient data for the platform admin

    expect((await admin('/api/platform/customers', { method: 'POST', body: newCustomer })).status).toBe(201);
    expect((await admin('/api/platform/customers', { method: 'POST', body: { ...newCustomer, name: 'Dup' } })).status).toBe(409); // mobile taken
    const { customers } = await json(admin('/api/platform/customers'));
    expect(customers.map((c: any) => [c.name, c.idPrefix, c.branches, c.ownerMobile])).toEqual([
      ['Test Hospital', 'AH', 2, M('owner')],
      ['Sri Clinic', 'SC', 1, '+919123456789'],
    ]);

    const sriOwner = await caller('+91 91234 56789', 'sri-owner-pass');
    const sriMe = await json(sriOwner('/api/auth/me'));
    expect(sriMe.organization.name).toBe('Sri Clinic');
    expect(sriMe.branches.map((b: any) => b.slug)).toEqual(['main']);
  });

  it('only the platform admin can use the console', async () => {
    const owner = await t.as('owner');
    expect((await owner('/api/platform/customers')).status).toBe(403);
    expect((await t.app.request('/api/platform/customers')).status).toBe(401);
  });

  it('suspend signs the customer out and blocks login; activate restores it', async () => {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    const doc = await t.as('doc');
    const { customers } = await json(admin('/api/platform/customers'));
    const hospital = customers.find((c: any) => c.name === 'Test Hospital');

    expect((await admin(`/api/platform/customers/${hospital.id}/suspend`, { method: 'POST' })).status).toBe(200);
    expect((await doc('/api/b/main/patients')).status).toBe(401);
    const blocked = await login(M('doc'), 'doc-pass-123');
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).code).toBe('suspended');

    await admin(`/api/platform/customers/${hospital.id}/activate`, { method: 'POST' });
    expect((await login(M('doc'), 'doc-pass-123')).status).toBe(200);
  });
});

describe('customers are fully separate', () => {
  it("another customer's owner can't reach the first customer's data, even with the same branch slug", async () => {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    await admin('/api/platform/customers', { method: 'POST', body: newCustomer });

    const owner = await t.as('owner'); // Test Hospital
    const { patient } = await json(owner('/api/b/main/patients', { method: 'POST', body: { name: 'Ravi Kumar' } }));
    const { visit } = await json(owner(`/api/b/main/patients/${patient.id}/visits`, { method: 'POST', body: {} }));

    const sri = await caller('9123456789', 'sri-owner-pass');
    // Same slug "main", but it's Sri Clinic's own branch: empty, and the hospital's ids are "not found".
    expect((await json(sri('/api/b/main/patients'))).patients).toEqual([]);
    expect((await sri(`/api/b/main/patients/${patient.id}`)).status).toBe(404);
    expect((await sri(`/api/b/main/visits/${visit.id}`)).status).toBe(404);
    expect((await sri(`/api/b/main/visits/${visit.id}/bills`, { method: 'POST' })).status).toBe(404);
    expect((await sri('/api/b/east/patients')).status).toBe(404); // the hospital's other branch
    expect((await json(sri('/api/b/main/staff'))).staff).toEqual([]); // only this customer's staff (the owner isn't a branch member)
    const branches = (await json(sri('/api/org/branches'))).branches.map((b: any) => b.name);
    expect(branches).toEqual(['Main clinic']);

    // New patient numbers use the customer's own prefix and sequence.
    const p2 = await json(sri('/api/b/main/patients', { method: 'POST', body: { name: 'Meena' } }));
    expect(p2.patient.uhid).toBe('SC000001');
  });
});
