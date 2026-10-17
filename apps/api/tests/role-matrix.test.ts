// Every branch route against every role: a role without the permission is refused (403) before anything is read
// or written; a role with it gets past the gate (any answer but 403); nobody signed in gets 401; a branch the
// user does not work in answers 404. The rule column is what the route declares (requirePermission / Any).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

// Any of these permissions; 'a&b' = both; '@owner' = the owner only (a whole-hospital action, like the backup).
type Rule = string[];
const X = 999999; // ids that do not exist: the gate answers before the lookup
const ROUTES: [method: string, path: string, rule: Rule][] = [
  ['GET', '/patients', ['patient.view']],
  ['GET', `/patients/${X}`, ['patient.view']],
  ['POST', '/patients', ['patient.create']],
  ['PATCH', `/patients/${X}`, ['patient.edit']],
  ['DELETE', `/patients/${X}`, ['patient.delete']],
  ['POST', `/patients/${X}/deactivate`, ['prescription.write', 'settings.manage']],
  ['POST', `/patients/${X}/visits`, ['patient.create']],
  ['GET', `/patients/${X}/visits`, ['patient.view']],
  ['GET', `/patients/${X}/bills`, ['billing.receive', 'patient.view']],
  ['GET', `/patients/${X}/courses`, ['patient.view']],
  ['GET', `/patients/${X}/lab-orders`, ['patient.view']],
  ['GET', `/patients/${X}/last-purchase`, ['pharmacy.sell']],
  ['POST', `/patients/${X}/direct-bill`, ['billing.receive']],
  ['POST', `/patients/${X}/direct-lab`, ['lab.view', 'patient.create']],
  ['POST', `/patients/${X}/pay-dues`, ['billing.receive']],
  ['GET', '/visits', ['patient.view']],
  ['GET', `/visits/${X}`, ['patient.view']],
  ['PATCH', `/visits/${X}`, ['patient.edit']],
  ['DELETE', `/visits/${X}`, ['patient.delete']],
  ['POST', `/visits/${X}/send`, ['patient.edit']],
  ['GET', `/visits/${X}/prescription`, ['patient.view']],
  ['POST', `/visits/${X}/prescription`, ['prescription.write']],
  ['PATCH', `/prescription-items/${X}`, ['prescription.write']],
  ['DELETE', `/prescription-items/${X}`, ['prescription.write']],
  ['POST', `/visits/${X}/prescription-notes`, ['prescription.write']],
  ['GET', '/prescription/suggestions', ['prescription.write']],
  ['GET', `/visits/${X}/charges`, ['prescription.write', 'billing.receive', 'patient.view']],
  ['POST', `/visits/${X}/charges`, ['prescription.write', 'billing.receive']],
  ['PUT', `/visits/${X}/consultation-fee`, ['prescription.write', 'billing.receive']],
  ['GET', '/charge-presets', ['prescription.write', 'billing.receive', 'settings.manage']],
  ['GET', `/visits/${X}/lab-orders`, ['patient.view']],
  ['POST', `/visits/${X}/lab-orders`, ['lab.order']],
  ['GET', `/visits/${X}/lab-report`, ['lab.view', 'lab.order']],
  ['GET', '/lab/orders', ['lab.view']],
  ['PUT', `/lab/orders/${X}/results`, ['lab.view']],
  ['POST', `/lab/visits/${X}/back-to-doctor`, ['lab.view']],
  ['GET', '/lab/tests', ['lab.view', 'lab.order']],
  ['POST', '/lab/tests', ['settings.manage']],
  ['GET', '/lab/report', ['reports.view']],
  ['POST', `/visits/${X}/lab-release`, ['settings.manage']],
  ['GET', '/checkout-queue', ['billing.receive', 'pharmacy.sell']],
  ['GET', `/visits/${X}/checkout`, ['billing.receive', 'pharmacy.sell']],
  ['POST', `/visits/${X}/checkout`, ['billing.receive', 'pharmacy.sell']],
  ['GET', '/bills', ['billing.receive']],
  ['POST', `/bills/${X}/payments`, ['billing.receive']],
  ['GET', '/billing/day-report', ['reports.view']],
  ['GET', '/billing/settings', ['billing.receive', 'settings.manage']],
  ['PUT', '/billing/settings', ['settings.manage']],
  ['GET', '/reports/period', ['reports.view', 'prescription.write']],
  ['GET', '/medicines', ['inventory.view', 'prescription.write', 'pharmacy.sell']],
  ['POST', '/medicines', ['inventory.manage']],
  ['PATCH', `/medicines/${X}`, ['inventory.manage']],
  ['GET', `/medicines/${X}/batches`, ['inventory.view']],
  ['POST', `/medicines/${X}/batches`, ['inventory.manage']],
  ['GET', '/inventory/report', ['inventory.view']],
  ['GET', '/pharmacy/queue', ['pharmacy.sell']],
  ['GET', '/pharmacy/sales', ['pharmacy.sell&reports.view']],
  ['POST', '/pharmacy/sales', ['pharmacy.sell']],
  ['GET', '/vendors', ['vendor.manage', 'inventory.manage']],
  ['POST', '/vendors', ['vendor.manage']],
  ['GET', '/purchases', ['vendor.manage', 'inventory.manage']],
  ['GET', '/purchases/profit', ['vendor.manage']],
  ['GET', '/expenses', ['vendor.manage']],
  ['GET', '/treatments', ['treatment.give', 'prescription.write']],
  ['POST', `/treatments/${X}/give`, ['treatment.give']],
  ['GET', '/treatments/due', ['treatment.give', 'patient.create', 'prescription.write', 'lab.view']],
  ['POST', `/course-items/${X}/given`, ['treatment.give']],
  ['POST', `/course-sittings/${X}/start`, ['treatment.give', 'patient.create', 'lab.view']],
  ['POST', `/visits/${X}/courses`, ['prescription.write', 'settings.manage']],
  ['GET', '/course-templates', ['prescription.write', 'settings.manage']],
  ['GET', '/bookmarks', ['prescription.write', 'settings.manage']],
  ['GET', '/dashboard', ['dashboard.view']],
  ['GET', '/audit', ['audit.view']],
  ['GET', '/logs', ['audit.view']],
  ['GET', '/backup', ['@owner']],
  ['GET', '/doctor-settings', ['settings.manage']],
  ['GET', '/staff', ['users.manage']],
  ['POST', '/staff', ['users.manage']],
  ['GET', '/roles', ['users.manage']],
];

let t: Awaited<ReturnType<typeof setup>>;
const people: Record<string, { call: (path: string, init?: { method?: string; body?: unknown }) => Response | Promise<Response>; perms: string[] }> = {};
beforeAll(async () => {
  t = await setup();
  const owner = await t.as('owner');
  const roles = (await (await owner('/api/b/main/roles')).json()).roles as { id: number; key: string }[];
  // The two roles the helpers do not sign in: a branch admin and a visiting doctor of main.
  for (const [key, mobile] of [['branch_admin', '9811100001'], ['visiting_doctor', '9811100002']] as const) {
    expect((await owner('/api/b/main/staff', { method: 'POST', body: { name: key, mobile, password: 'role-pass-123', roleId: roles.find((r) => r.key === key)!.id } })).status).toBe(201);
  }
  const login = async (mobile: string, password: string) => {
    const r = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile, password }) });
    const cookie = r.headers.get('set-cookie')!.split(';')[0]!;
    return (path: string, init: { method?: string; body?: unknown } = {}) =>
      t.app.request(path, { method: init.method ?? 'GET', headers: { cookie, 'content-type': 'application/json', origin: 'http://localhost' }, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
  };
  const signed: Record<string, Awaited<ReturnType<typeof login>>> = {
    owner,
    branch_admin: await login('9811100001', 'role-pass-123'),
    visiting_doctor: await login('9811100002', 'role-pass-123'),
    doctor: await t.as('doc'),
    front_desk: await t.as('desk'),
    pharmacist: await t.as('pharm'),
    lab_technician: await t.as('labtech'),
    nurse: await t.as('nurse'),
  };
  for (const [role, call] of Object.entries(signed)) {
    const me = await (await call('/api/auth/me')).json();
    people[role] = { call, perms: me.branches.find((b: { slug: string }) => b.slug === 'main').permissions };
  }
});
afterAll(() => t?.cleanup());

describe('every route, every role', () => {
  it.each(['owner', 'branch_admin', 'doctor', 'visiting_doctor', 'front_desk', 'pharmacist', 'lab_technician', 'nurse'])('%s: allowed exactly where the role has the permission', async (role) => {
    const p = people[role]!;
    const wrong: string[] = [];
    for (const [method, path, rule] of ROUTES) {
      const allowed = rule.some((x) => (x === '@owner' ? role === 'owner' : x.split('&').every((y) => p.perms.includes(y))));
      const res = await p.call(`/api/b/main${path}`, { method, body: method === 'GET' || method === 'DELETE' ? undefined : {} });
      if (res.status >= 500) wrong.push(`${method} ${path}: server error ${res.status}`);
      else if (allowed && res.status === 403) wrong.push(`${method} ${path}: refused but the role has ${rule.join(' / ')}`);
      else if (!allowed && res.status !== 403) wrong.push(`${method} ${path}: let through (${res.status}) without ${rule.join(' / ')}`);
    }
    expect(wrong).toEqual([]);
  });

  it('nobody signed in: 401 on every branch route; another branch: 404 for staff of main only', async () => {
    const out: string[] = [];
    for (const [method, path] of ROUTES) {
      const res = await t.app.request(`/api/b/main${path}`, { method, headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: method === 'GET' || method === 'DELETE' ? undefined : '{}' });
      if (res.status !== 401) out.push(`${method} ${path}: ${res.status} without signing in`);
    }
    for (const role of ['branch_admin', 'doctor', 'front_desk', 'pharmacist', 'lab_technician', 'nurse']) {
      for (const [method, path] of ROUTES) {
        const res = await people[role]!.call(`/api/b/east${path}`, { method, body: method === 'GET' || method === 'DELETE' ? undefined : {} });
        if (res.status !== 404) out.push(`${role} ${method} east${path}: ${res.status}`);
      }
    }
    expect(out).toEqual([]);
  });

  it('errors never leak a stack trace or SQL', async () => {
    const owner = people.owner!;
    const leaks: string[] = [];
    for (const [method, path] of ROUTES) {
      const res = await owner.call(`/api/b/main${path}`, { method, body: method === 'GET' || method === 'DELETE' ? undefined : { junk: 'x'.repeat(50) } });
      if (res.status < 400) continue;
      const text = await res.text();
      if (/at .*\.(ts|js):\d+|SQLITE|select |insert into|stack/i.test(text)) leaks.push(`${method} ${path}: ${text.slice(0, 120)}`);
      else {
        const j = JSON.parse(text);
        if (typeof j.error !== 'string' || typeof j.code !== 'string') leaks.push(`${method} ${path}: not { error, code }: ${text.slice(0, 80)}`);
      }
    }
    expect(leaks).toEqual([]);
  });
});
