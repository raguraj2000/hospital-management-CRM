// SaaS: many customers on one server. Customers are fully separate; you manage them from the platform console.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { periodEnd, planStatus } from '@platform/shared';
import { suspendOverdue } from '../src/lib/plan-billing.js';
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
  it('with two hospitals on the server, no hospital owner can download or restore the backup (it holds both)', async () => {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    const owner1 = await t.as('owner');
    // One hospital: its owner may make a backup.
    expect((await owner1('/api/b/main/backup')).status).toBe(200);
    expect((await admin('/api/platform/customers', { method: 'POST', body: newCustomer })).status).toBe(201);
    const owner2 = await caller(newCustomer.ownerMobile.replace(/\s/g, ''), newCustomer.ownerPassword);
    for (const owner of [owner1, owner2]) {
      const down = await owner('/api/b/main/backup');
      expect(down.status).toBe(403);
      expect((await down.json()).error).toMatch(/more than one hospital/);
      expect((await owner('/api/b/main/restore', { method: 'POST', body: 'x' })).status).toBe(403);
    }
  });

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

describe('limits and modules (super admin panel)', () => {
  async function world() {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    expect((await admin('/api/platform/customers', { method: 'POST', body: newCustomer })).status).toBe(201);
    const { customers } = await json(admin('/api/platform/customers'));
    const first = customers.find((x: any) => x.name === 'Test Hospital');
    const second = customers.find((x: any) => x.name === newCustomer.name);
    const limits = (id: number, body: unknown) => admin(`/api/platform/customers/${id}`, { method: 'PATCH', body });
    return { admin, first, second, limits, owner: await t.as('owner'), doc: await t.as('doc') };
  }

  it('a hospital made before has no limits; a new one starts with one branch', async () => {
    const w = await world();
    expect(w.first).toMatchObject({ maxBranches: null, maxStaff: null, modulesOff: [] });
    expect(w.second).toMatchObject({ maxBranches: 1, maxStaff: null, modulesOff: [] });
  });

  it('only the platform admin sets limits, and bad values are refused', async () => {
    const w = await world();
    expect((await w.owner(`/api/platform/customers/${w.first.id}`, { method: 'PATCH', body: { maxBranches: 50 } })).status).toBe(403);
    expect((await w.limits(w.first.id, { maxBranches: 0 })).status).toBe(400);
    expect((await w.limits(w.first.id, { modulesOff: ['pharmacy'] })).status).toBe(400); // pharmacy can't be switched off
    expect((await w.limits(999999, { maxBranches: 2 })).status).toBe(404);
  });

  it('branch limit: the owner can add a branch only while under it', async () => {
    const w = await world();
    const add = (slug: string) => w.owner('/api/org/branches', { method: 'POST', body: { name: `Branch ${slug}`, slug } });
    expect((await w.limits(w.first.id, { maxBranches: 2 })).status).toBe(200); // it has main + east already
    const refused = await add('north');
    expect(refused.status).toBe(403);
    expect((await refused.json()).code).toBe('limit_branches');
    expect((await json(w.owner('/api/auth/me'))).organization.maxBranches).toBe(2); // the screen shows "contact support"
    expect((await w.limits(w.first.id, { maxBranches: 3 })).status).toBe(200);
    expect((await add('north')).status).toBe(201);
  });

  it('staff limit: no new or re-activated staff account past it; the owner is not counted', async () => {
    const w = await world();
    const roles = (await json(w.owner('/api/org/roles'))).roles as { id: number; key: string }[];
    const roleId = roles.find((r) => r.key === 'front_desk')!.id;
    const addStaff = (n: number) => w.owner('/api/b/main/staff', { method: 'POST', body: { name: `Desk ${n}`, mobile: `98765${String(n).padStart(5, '0')}`, password: 'desk-pass-123', roleId } });
    expect((await w.limits(w.first.id, { maxStaff: 6 })).status).toBe(200); // doc, eastdesk, labtech, pharm, desk, nurse
    const refused = await addStaff(1);
    expect(refused.status).toBe(403);
    expect((await refused.json()).code).toBe('limit_staff');
    expect((await w.limits(w.first.id, { maxStaff: 7 })).status).toBe(200);
    expect((await addStaff(1)).status).toBe(201);
    // At the limit, a deactivated account can't come back.
    const staff = (await json(w.owner('/api/b/main/staff'))).staff as { userId: number; name: string }[];
    const desk = staff.find((x) => x.name === 'desk')!;
    expect((await w.owner(`/api/b/main/staff/${desk.userId}/deactivate`, { method: 'POST' })).status).toBe(200);
    expect((await addStaff(2)).status).toBe(201); // the freed place is taken
    expect((await w.owner(`/api/b/main/staff/${desk.userId}/activate`, { method: 'POST' })).status).toBe(403);
  });

  it('Lab switched off: its pages and routes go for everyone in that hospital, the owner too; the other hospital keeps it', async () => {
    const w = await world();
    expect((await w.doc('/api/b/main/lab/orders')).status).toBe(200);
    expect((await w.limits(w.first.id, { modulesOff: ['lab'] })).status).toBe(200);
    for (const who of [w.doc, w.owner]) {
      expect((await who('/api/b/main/lab/orders')).status).toBe(403);
      const me = await json(who('/api/auth/me'));
      expect(me.organization.modulesOff).toEqual(['lab']);
      expect(me.branches.flatMap((b: any) => b.permissions)).not.toContain('lab.view');
    }
    // The front desk can't start a lab-only visit either (it is allowed by "register patients", not a lab right).
    const desk = await t.as('desk');
    const { patient } = await json(desk('/api/b/main/patients', { method: 'POST', body: { name: 'Lab Off Patient' } }));
    for (const r of [await desk(`/api/b/main/patients/${patient.id}/direct-lab`, { method: 'POST', body: { testIds: [1] } }), await desk('/api/b/main/lab/packages')]) {
      expect(r.status).toBe(403);
      expect((await r.json()).code).toBe('module_off');
    }
    const owner2 = await caller(newCustomer.ownerMobile.replace(/\s/g, ''), newCustomer.ownerPassword);
    expect((await owner2('/api/b/main/lab/orders')).status).toBe(200);
    // Switched on again: back at once.
    expect((await w.limits(w.first.id, { modulesOff: [] })).status).toBe(200);
    expect((await w.doc('/api/b/main/lab/orders')).status).toBe(200);
  });

  it('Courses switched off: every course route refuses with a clear reason', async () => {
    const w = await world();
    expect((await w.doc('/api/b/main/course-templates')).status).toBe(200);
    expect((await w.limits(w.first.id, { modulesOff: ['courses'] })).status).toBe(200);
    for (const url of ['/api/b/main/course-templates', '/api/b/main/treatments/due']) {
      const r = await w.doc(url);
      expect([url, r.status]).toEqual([url, 403]);
      expect((await r.json()).code).toBe('module_off');
    }
    // Other branch routes are not touched by the course guard.
    expect((await w.doc('/api/b/main/visits')).status).toBe(200);
  });
});

describe('plans and payments (super admin panel)', () => {
  /** A moment in India time (the job reads the hour and the day of India). */
  const india = (dayIso: string, hour: number) => new Date(`${dayIso}T${String(hour).padStart(2, '0')}:30:00Z`);

  async function world() {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    const { customers } = await json(admin('/api/platform/customers'));
    const first = customers.find((x: any) => x.name === 'Test Hospital');
    return { admin, id: first.id as number, owner: await t.as('owner') };
  }

  it('months end the day before the same date a month later; short months are handled', () => {
    expect(periodEnd('2026-01-15', 1)).toBe('2026-02-14');
    expect(periodEnd('2026-01-31', 1)).toBe('2026-02-27');
    expect(periodEnd('2026-03-01', 12)).toBe('2027-02-28');
    expect(planStatus(null, 7, '2026-05-01').state).toBe('unbilled');
    expect(planStatus('2026-05-10', 7, '2026-05-01')).toEqual({ state: 'paid', daysLeft: 9, suspendOn: '2026-05-18' });
    expect(planStatus('2026-05-05', 7, '2026-05-01').state).toBe('due_soon');
    expect(planStatus('2026-04-30', 7, '2026-05-01').state).toBe('overdue');
  });

  it('mark paid (yearly): the first year starts on the day paid, the next continues where it ended; only the platform admin', async () => {
    const w = await world();
    expect((await w.admin(`/api/platform/customers/${w.id}`, { method: 'PATCH', body: { planName: 'Basic', yearlyFeePaise: 1500000, graceDays: 5 } })).status).toBe(200);
    const pay = (body: object) => w.admin(`/api/platform/customers/${w.id}/payments`, { method: 'POST', body: { amountPaise: 1500000, years: 1, ...body } });
    expect(await json(pay({ paidOn: '2026-05-10' }))).toMatchObject({ periodFrom: '2026-05-10', periodTo: '2027-05-09' });
    expect(await json(pay({ paidOn: '2027-05-01', years: 2, amountPaise: 3000000 }))).toMatchObject({ periodFrom: '2027-05-10', periodTo: '2029-05-09' });
    // Paid after the grace days: starts again on the day of payment.
    expect(await json(pay({ paidOn: '2029-06-01' }))).toMatchObject({ periodFrom: '2029-06-01', periodTo: '2030-05-31' });
    const { payments } = await json(w.admin(`/api/platform/customers/${w.id}/payments`));
    expect(payments.map((p: any) => p.periodTo)).toEqual(['2030-05-31', '2029-05-09', '2027-05-09']);
    const { customers } = await json(w.admin('/api/platform/customers'));
    expect(customers.find((x: any) => x.id === w.id)).toMatchObject({ planName: 'Basic', yearlyFeePaise: 1500000, paidUntil: '2030-05-31', graceDays: 5 });
    // The owner sees the plan for the banner, and can't record a payment.
    expect((await json(w.owner('/api/auth/me'))).organization.plan).toEqual({ paidUntil: '2030-05-31', graceDays: 5 });
    expect((await w.owner(`/api/platform/customers/${w.id}/payments`, { method: 'POST', body: { amountPaise: 1, years: 1, paidOn: '2029-06-01' } })).status).toBe(403);
    // Whole years only, and no zero amount.
    expect((await pay({ paidOn: '2029-06-01', years: 0 })).status).toBe(400);
    expect((await pay({ paidOn: '2029-06-01', months: 6, years: undefined })).status).toBe(400);
    expect((await pay({ paidOn: '2029-06-01', amountPaise: 0 })).status).toBe(400);
  });

  it('not paid: suspended only at night after the grace days, and the owner is signed out and refused', async () => {
    const w = await world();
    expect((await w.admin(`/api/platform/customers/${w.id}`, { method: 'PATCH', body: { paidUntil: '2026-05-31', graceDays: 3 } })).status).toBe(200);
    expect(await suspendOverdue(t.db, india('2026-06-03', 2))).toEqual([]); // still within the grace days
    expect(await suspendOverdue(t.db, india('2026-06-04', 14))).toEqual([]); // over, but in the day: wait for the night
    expect((await w.owner('/api/b/main/patients')).status).toBe(200);
    expect(await suspendOverdue(t.db, india('2026-06-05', 1))).toEqual(['Test Hospital']);
    expect((await w.owner('/api/b/main/patients')).status).toBe(401); // signed out at once
    const again = await login(M('owner'), 'owner-pass-123');
    expect(again.status).toBe(403);
    expect((await again.json()).code).toBe('suspended');
    // A hospital that is not billed is never suspended for payment.
    expect(await suspendOverdue(t.db, india('2026-06-06', 1))).toEqual([]);
  });
});

describe('owner help (super admin panel)', () => {
  async function world() {
    await createPlatformAdmin(t.db, { name: 'You', mobile: '9000000001', password: 'platform-pass-1' });
    const admin = await caller('9000000001', 'platform-pass-1');
    const { customers } = await json(admin('/api/platform/customers'));
    const id = customers.find((x: any) => x.name === 'Test Hospital').id as number;
    return { admin, id, owner: await t.as('owner') };
  }

  it("shows the owner, their last sign-in and who could become owner; only the platform admin", async () => {
    const w = await world();
    const help = await json(w.admin(`/api/platform/customers/${w.id}/owner`));
    expect(help.owner).toMatchObject({ name: 'Owner', mobile: M('owner'), lockedUntil: null });
    expect(help.owner.lastSignInAt).toBeTruthy(); // the owner signed in above
    expect(help.candidates.map((x: any) => x.name)).toContain('doc');
    expect(help.candidates.map((x: any) => x.name)).not.toContain('Owner');
    expect((await w.owner(`/api/platform/customers/${w.id}/owner`)).status).toBe(403);
    expect((await w.admin('/api/platform/customers/999999/owner')).status).toBe(404);
  });

  it('reset password: the old one stops working, the new one works, the lock is lifted, the owner is signed out', async () => {
    const w = await world();
    // Locked out by wrong passwords first.
    for (let i = 0; i < 6; i++) await login(M('owner'), 'wrong-password');
    expect((await login(M('owner'), 'owner-pass-123')).status).toBe(429);
    expect((await w.admin(`/api/platform/customers/${w.id}/owner/password`, { method: 'POST', body: { password: 'short' } })).status).toBe(400);
    expect((await w.admin(`/api/platform/customers/${w.id}/owner/password`, { method: 'POST', body: { password: 'temporary-pass-9' } })).status).toBe(200);
    expect((await w.owner('/api/auth/me')).status).toBe(401); // signed out everywhere
    expect((await login(M('owner'), 'owner-pass-123')).status).toBe(401);
    expect((await login(M('owner'), 'temporary-pass-9')).status).toBe(200);
  });

  it('change owner: the new owner gets every branch, the old one loses the owner rights; never someone of another hospital', async () => {
    const w = await world();
    const help = await json(w.admin(`/api/platform/customers/${w.id}/owner`));
    const doc = help.candidates.find((x: any) => x.name === 'doc');
    expect((await w.admin(`/api/platform/customers/${w.id}/owner`, { method: 'PUT', body: { userId: help.owner.id } })).status).toBe(409); // already owner
    // A person of another hospital answers like a missing one.
    expect((await w.admin('/api/platform/customers', { method: 'POST', body: newCustomer })).status).toBe(201);
    const others = await json(w.admin('/api/platform/customers'));
    const second = others.customers.find((x: any) => x.name === newCustomer.name);
    const secondOwner = (await json(w.admin(`/api/platform/customers/${second.id}/owner`))).owner;
    expect((await w.admin(`/api/platform/customers/${w.id}/owner`, { method: 'PUT', body: { userId: secondOwner.id } })).status).toBe(404);

    expect((await w.admin(`/api/platform/customers/${w.id}/owner`, { method: 'PUT', body: { userId: doc.id } })).status).toBe(200);
    expect((await w.owner('/api/auth/me')).status).toBe(401); // the old owner is signed out
    const newOwner = await t.as('doc');
    const me = await json(newOwner('/api/auth/me'));
    expect(me.user.isOwner).toBe(true);
    expect(me.branches.map((b: any) => b.slug).sort()).toEqual(['east', 'main']);
    const oldOwner = await t.as('owner');
    expect((await json(oldOwner('/api/auth/me'))).user.isOwner).toBe(false);
    expect((await json(w.admin(`/api/platform/customers/${w.id}/owner`))).owner.name).toBe('doc');
  });
});

