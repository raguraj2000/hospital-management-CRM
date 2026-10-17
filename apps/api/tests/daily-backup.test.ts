// The server's own daily backup: one complete copy a day, the last 14 days kept, a copy on a pendrive's HMS-Backup folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { dailyBackup } from '../src/lib/daily-backup.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
let dir: string;
beforeEach(async () => {
  t = await setup();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hms-backup-'));
});
afterEach(() => {
  t.cleanup();
  // Windows may still hold the copy open for a moment: leave the temp folder then.
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* left in the temp folder */
  }
});

it('makes one copy a day that opens with all the data, keeps 14 days, copies to the pendrive folder', async () => {
  const owner = await t.as('owner');
  await owner('/api/b/main/patients', { method: 'POST', body: { name: 'Backed Up Patient' } });
  const local = path.join(dir, 'backups');
  const pendrive = path.join(dir, 'HMS-Backup');
  fs.mkdirSync(pendrive);
  // Old copies from earlier days, and a file that is not ours (never touched).
  fs.mkdirSync(local);
  for (const d of ['2026-09-01', '2026-10-01', '2026-10-10']) fs.writeFileSync(path.join(local, `daily-${d}.db`), 'old');
  fs.writeFileSync(path.join(local, 'before-update-x.db'), 'keep');

  const written = await dailyBackup(t.db, local, { today: '2026-10-15', extraDirs: [pendrive] });
  expect(written).toBe(path.join(local, 'daily-2026-10-15.db'));
  expect(await dailyBackup(t.db, local, { today: '2026-10-15', extraDirs: [pendrive] })).toBeNull(); // once a day
  expect(fs.readdirSync(local).sort()).toEqual(['before-update-x.db', 'daily-2026-10-10.db', 'daily-2026-10-15.db']);
  expect(fs.readdirSync(pendrive)).toEqual(['daily-2026-10-15.db']);

  // The copy is a working database with the patient in it (a restore drill).
  const copy = createClient({ url: `file:${path.join(local, 'daily-2026-10-15.db').split(path.sep).join('/')}` });
  const rows = await copy.execute("select name from patient where name = 'Backed Up Patient'");
  expect(rows.rows).toHaveLength(1);
  copy.close();
});

it('the database itself refuses impossible values (negative stock, zero payment, unknown status)', async () => {
  const { sql } = await import('drizzle-orm');
  const owner = await t.as('owner');
  const { id: med } = await (await owner('/api/b/main/medicines', { method: 'POST', body: { name: 'Check Med', form: 'tablet', pricePaise: 100 } })).json();
  await owner(`/api/b/main/medicines/${med}/batches`, { method: 'POST', body: { batchNo: 'K1', expiryDate: `${new Date().getFullYear() + 2}-01-01`, quantity: 5 } });
  // The database's own message is the cause of the query error.
  const refused = async (q: Promise<unknown>, why: RegExp) => {
    const e = (await q.then(() => null, (x: unknown) => x)) as { message?: string; cause?: { message?: string } } | null;
    expect(e, 'should have been refused').not.toBeNull();
    expect(`${e?.cause?.message ?? ''} ${e?.message ?? ''}`).toMatch(why);
  };
  await refused(t.db.run(sql`update medicine_batch set quantity = -1 where medicine_id = ${med}`), /Stock cannot go below zero/);
  await refused(t.db.run(sql`update medicine set price_paise = -5 where id = ${med}`), /cannot be negative/);
  await refused(t.db.run(sql`insert into op_visit (branch_id, patient_id, op_no, visit_date, status) values (1, 1, 'X-1', '2026-01-01', 'lost')`), /Unknown visit status/);
  // Normal work is untouched.
  expect((await owner('/api/b/main/medicines')).status).toBe(200);
});

it('"has anything changed?": the number moves after a change in that branch only, not after reading', async () => {
  const owner = await t.as('owner');
  const desk = await t.as('desk');
  const version = async (br: string) => (await (await owner(`/api/b/${br}/changes`)).json()).version as string;
  const main0 = await version('main');
  const east0 = await version('east');
  await owner('/api/b/main/patients');
  expect(await version('main')).toBe(main0); // reading changes nothing
  await desk('/api/b/main/patients', { method: 'POST', body: { name: 'Change Watch' } });
  expect(await version('main')).not.toBe(main0);
  expect(await version('east')).toBe(east0); // another branch's screens do not reload
  await owner('/api/b/main/patients', { method: 'POST', body: {} }); // refused (400): not a change
  const after = await version('main');
  expect(await version('main')).toBe(after);
});

it('error log: the owner downloads it, others cannot; browser crash reports need a signed-in user', async () => {
  const owner = await t.as('owner');
  const doc = await t.as('doc');
  expect((await owner('/api/b/main/logs')).status).toBe(200);
  expect((await doc('/api/b/main/logs')).status).toBe(403);
  expect((await owner('/api/client-error', { method: 'POST', body: { message: 'test crash', url: '/main' } })).status).toBe(200);
  expect((await t.app.request('/api/client-error', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })).status).toBe(401);
});

it('"Skip the 5-second Undo": the owner has it; other roles (branch admin too) only when ticked', async () => {
  const owner = await t.as('owner');
  const me = await (await owner('/api/auth/me')).json();
  expect(me.branches[0].permissions).toContain('undo.skip');
  expect(me.branches[0].permissions).toContain('settings.manage'); // still everything else
  const roles = (await (await owner('/api/b/main/roles')).json()).roles;
  expect(roles.find((r: any) => r.key === 'branch_admin').permissions).not.toContain('undo.skip');
  const doctorRole = roles.find((r: any) => r.key === 'doctor');
  const put = await owner(`/api/org/roles/${doctorRole.id}/permissions`, { method: 'PUT', body: { permissions: [...doctorRole.permissions, 'undo.skip'] } });
  expect(put.status).toBe(200);
  const doc = await t.as('doc');
  expect((await (await doc('/api/auth/me')).json()).branches[0].permissions).toContain('undo.skip');
});
