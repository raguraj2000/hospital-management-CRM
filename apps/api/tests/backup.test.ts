// Backup and restore of everything, from Settings (owner / branch admin).
import { afterEach, beforeEach, expect, it } from 'vitest';
import { M, setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (t = await setup()));
afterEach(() => t.cleanup());

const json = async (r: Response | Promise<Response>) => (await r).json();

/** Signs in and returns the session cookie, for requests that are not JSON (the backup file itself). */
async function cookieOf(username: string, password = `${username}-pass-123`) {
  const res = await t.app.request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: M(username), password }) });
  expect(res.status).toBe(200);
  return res.headers.get('set-cookie')!.split(';')[0]!;
}
const restore = (cookie: string, file: Uint8Array | string, branch = 'main') =>
  t.app.request(`/api/b/${branch}/restore`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/octet-stream' }, body: file });

it('the owner downloads a backup and restores it: the data goes back to that moment and everyone signs in again', async () => {
  const owner = await t.as('owner');
  await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Before Backup' } });

  const res = await owner('/api/b/main/backup');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="hms-backup-.*\.db"/);
  const file = new Uint8Array(await res.arrayBuffer());
  expect(new TextDecoder('latin1').decode(file.subarray(0, 15))).toBe('SQLite format 3');

  await owner('/api/b/main/patients', { method: 'POST', body: { name: 'After Backup' } });
  await owner('/api/b/east/patients', { method: 'POST', body: { name: 'East After' } });
  expect((await json(owner('/api/b/main/patients'))).total).toBe(2);

  const cookie = await cookieOf('owner');
  const done = await restore(cookie, file);
  expect(done.status).toBe(200);
  expect((await done.json()).safetyCopy).toMatch(/^before-restore-.*\.db$/);

  // Every session ended with the restore, including the one that did it.
  expect((await owner('/api/b/main/patients')).status).toBe(401);
  const again = await t.as('owner');
  expect((await json(again('/api/b/main/patients'))).patients.map((p: any) => p.name)).toEqual(['Before Backup']);
  expect((await json(again('/api/b/east/patients'))).total).toBe(0);
  // The restored hospital keeps working: new records still get the next number.
  const next = await json(again('/api/b/main/patients', { method: 'POST', body: { name: 'New After Restore' } }));
  expect(next.patient.uhid).toBe('AH000002');
});

it('a file that is not a backup is refused and changes nothing', async () => {
  const owner = await t.as('owner');
  await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Stays' } });
  const cookie = await cookieOf('owner');
  for (const bad of ['just some text', new Uint8Array(4096)]) {
    const res = await restore(cookie, bad);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not an HMS backup/);
  }
  expect((await owner('/api/b/main/patients')).status).toBe(200); // still signed in: nothing was restored
  expect((await json(owner('/api/b/main/patients'))).total).toBe(1);
});

it('only whoever may see everything: staff are refused; with two branches a branch admin is refused, the owner is not', async () => {
  const owner = await t.as('owner');
  const { roles } = await json(owner('/api/b/main/roles'));
  await owner('/api/b/main/staff', { method: 'POST', body: { name: 'Main Admin', mobile: M('madmin'), password: 'madmin-pass-1', roleId: roles.find((r: any) => r.key === 'branch_admin').id } });

  for (const who of ['doc', 'desk', 'pharm', 'labtech']) {
    const staff = await t.as(who);
    expect((await staff('/api/b/main/backup')).status).toBe(403);
    expect((await restore(await cookieOf(who), 'x')).status).toBe(403);
  }
  // This organization has two branches (main, east): the file would hand the branch admin the other branch too.
  const admin = await t.as('madmin', 'madmin-pass-1');
  const refused = await admin('/api/b/main/backup');
  expect(refused.status).toBe(403);
  expect((await refused.json()).error).toMatch(/only the owner/);
  expect((await restore(await cookieOf('madmin', 'madmin-pass-1'), 'x')).status).toBe(403);
  // A branch the user is not a member of looks like it does not exist.
  expect((await admin('/api/b/east/backup')).status).toBe(404);
  expect((await owner('/api/b/east/backup')).status).toBe(200);
});
