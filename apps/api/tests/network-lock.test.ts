// Network lock: a branch's pages only from the hospital's network. The owner and the branch admin are never locked;
// another role only with "Work from outside the hospital network" ticked.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ipAllowed, parseNetworks, suggestNetwork } from '@platform/shared';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeAll(async () => (t = await setup()));
afterAll(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json() as Promise<any>;

/** Signs in, then calls from a given address (as the server's socket would see it). */
async function from(username: string, password = `${username}-pass-123`) {
  const res = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M(username), password }) });
  expect(res.status).toBe(200);
  const cookie = res.headers.get('set-cookie')!.split(';')[0]!;
  return (ip: string | null, url: string, init: { method?: string; body?: unknown } = {}) =>
    t.app.request(
      url,
      { method: init.method ?? 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: init.body === undefined ? undefined : JSON.stringify(init.body) },
      ip ? { incoming: { socket: { remoteAddress: ip } } } : {},
    );
}

const HOSPITAL = '192.168.1.50';
const HOME = '49.37.200.10';

describe('the address rules', () => {
  it('ranges, single addresses, the hospital PC itself and IPv4 on a dual-stack socket', () => {
    expect(ipAllowed('192.168.1.200', ['192.168.1.0/24'])).toBe(true);
    expect(ipAllowed('192.168.2.1', ['192.168.1.0/24'])).toBe(false);
    expect(ipAllowed('10.0.0.5', ['10.0.0.5'])).toBe(true);
    expect(ipAllowed('10.0.0.6', ['10.0.0.5'])).toBe(false);
    expect(ipAllowed('::ffff:192.168.1.7', ['192.168.1.0/24'])).toBe(true);
    expect(ipAllowed('127.0.0.1', ['192.168.1.0/24'])).toBe(true);
    expect(ipAllowed('::1', ['192.168.1.0/24'])).toBe(true);
    expect(ipAllowed(null, ['192.168.1.0/24'])).toBe(false);
    expect(ipAllowed('fe80::1', ['192.168.1.0/24'])).toBe(false);
    expect(parseNetworks('192.168.1.0/24, 10.0.0.5\n300.1.1.1 1.2.3.4/33 abc').bad).toEqual(['300.1.1.1', '1.2.3.4/33', 'abc']);
    expect(suggestNetwork('::ffff:192.168.1.33')).toBe('192.168.1.0/24');
    expect(suggestNetwork('127.0.0.1')).toBeNull();
  });
});

describe('a branch with the network lock on', () => {
  let owner: Awaited<ReturnType<typeof from>>, desk: Awaited<ReturnType<typeof from>>, eastdesk: Awaited<ReturnType<typeof from>>, admin: Awaited<ReturnType<typeof from>>;
  let deskRoleId: number;
  beforeAll(async () => {
    [owner, desk, eastdesk] = await Promise.all([from('owner'), from('desk'), from('eastdesk')]);
    const roles = (await json(owner(HOSPITAL, '/api/org/roles'))).roles as { id: number; key: string }[];
    deskRoleId = roles.find((r) => r.key === 'front_desk')!.id;
    const adminRole = roles.find((r) => r.key === 'branch_admin')!.id;
    const made = await owner(HOSPITAL, '/api/b/main/staff', { method: 'POST', body: { name: 'Branch Admin', mobile: M('badmin'), password: 'badmin-pass-123', roleId: adminRole } });
    expect(made.status).toBe(201);
    admin = await from('badmin');
  });

  it('off by default: staff work from anywhere', async () => {
    expect((await desk(HOME, '/api/b/main/patients')).status).toBe(200);
  });

  it('the owner turns it on with the hospital network; a wrong network is refused with a reason', async () => {
    const bad = await owner(HOSPITAL, `/api/org/branches/${t.main.id}`, { method: 'PATCH', body: { allowedNetworks: '192.168.1.0/24\n300.1.1.1' } });
    expect(bad.status).toBe(400);
    expect((await owner(HOSPITAL, `/api/org/branches/${t.main.id}`, { method: 'PATCH', body: { allowedNetworks: ' 192.168.1.0/24 ,  ' } })).status).toBe(200);
    const branches = (await json(owner(HOSPITAL, '/api/org/branches'))).branches as { id: number; allowedNetworks: string | null }[];
    expect(branches.find((b) => b.id === t.main.id)!.allowedNetworks).toBe('192.168.1.0/24');
  });

  it('staff on the hospital network work; from home they are stopped on every page, with a clear reason', async () => {
    expect((await desk(HOSPITAL, '/api/b/main/patients')).status).toBe(200);
    expect((await desk('::ffff:192.168.1.9', '/api/b/main/patients')).status).toBe(200);
    expect((await desk('127.0.0.1', '/api/b/main/patients')).status).toBe(200);
    for (const url of ['/api/b/main/patients', '/api/b/main/visits', '/api/b/main/nav-counts']) {
      const r = await desk(HOME, url);
      expect([url, r.status]).toEqual([url, 403]);
      expect((await r.json()).code).toBe('outside_network');
    }
    // A write is stopped too, and nothing is written.
    const w = await desk(HOME, '/api/b/main/patients', { method: 'POST', body: { name: 'From Home' } });
    expect(w.status).toBe(403);
    expect((await json(desk(HOSPITAL, '/api/b/main/patients?q=From%20Home'))).patients).toHaveLength(0);
    // No address known: locked, not let through.
    expect((await desk(null, '/api/b/main/patients')).status).toBe(403);
  });

  it('the owner and the branch admin are never locked', async () => {
    expect((await owner(HOME, '/api/b/main/patients')).status).toBe(200);
    expect((await admin(HOME, '/api/b/main/patients')).status).toBe(200);
  });

  it('"Work from outside the hospital network" ticked for a role in this branch lets it through', async () => {
    const perms = (await json(owner(HOSPITAL, `/api/org/branches/${t.main.id}/roles`))).roles.find((r: any) => r.id === deskRoleId).permissions as string[];
    expect((await owner(HOSPITAL, `/api/org/branches/${t.main.id}/roles/${deskRoleId}/permissions`, { method: 'PUT', body: { permissions: [...perms, 'access.anywhere'] } })).status).toBe(200);
    expect((await desk(HOME, '/api/b/main/patients')).status).toBe(200);
    // Taken away again: locked again at once.
    expect((await owner(HOSPITAL, `/api/org/branches/${t.main.id}/roles/${deskRoleId}/permissions`, { method: 'PUT', body: { permissions: perms } })).status).toBe(200);
    expect((await desk(HOME, '/api/b/main/patients')).status).toBe(403);
  });

  it('the lock is per branch: east is still open from anywhere', async () => {
    expect((await eastdesk(HOME, '/api/b/east/patients')).status).toBe(200);
  });

  it('the owner sees their own network as the suggestion', async () => {
    expect(await json(owner('::ffff:192.168.1.33', '/api/org/my-network'))).toEqual({ ip: '192.168.1.33', suggestion: '192.168.1.0/24' });
  });

  it('a branch admin cannot change the lock (owner only)', async () => {
    expect((await admin(HOSPITAL, `/api/org/branches/${t.main.id}`, { method: 'PATCH', body: { allowedNetworks: null } })).status).toBe(403);
  });

  it('switched off (empty): everyone works from anywhere again', async () => {
    expect((await owner(HOSPITAL, `/api/org/branches/${t.main.id}`, { method: 'PATCH', body: { allowedNetworks: '' } })).status).toBe(200);
    expect((await desk(HOME, '/api/b/main/patients')).status).toBe(200);
  });
});
