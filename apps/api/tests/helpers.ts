import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, runMigrations, hashPassword, type Db } from '@platform/core';
import { branch, branchMember, user } from '../src/db/schema.js';
import { createApp } from '../src/app.js';
import { seedOrganization } from '../src/seed.js';

/** A fixed test mobile number for a test user name, e.g. M('doc') -> '+919xxxxxxxxx'. */
export function M(name: string): string {
  let x = 7;
  for (const ch of name.toLowerCase()) x = (x * 31 + ch.charCodeAt(0)) % 1_000_000_000;
  return `+919${String(x).padStart(9, '0')}`;
}

/** Fresh database in a temp file: one organization, branches "main" and "east", and staff. */
export async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'platform-test-'));
  const db: Db = await openDb(`file:${path.join(dir, 'test.db').replace(/\\/g, '/')}`);
  await runMigrations(db, path.resolve(import.meta.dirname, '..', 'drizzle'));

  const s = await seedOrganization(db, {
    orgName: 'Test Hospital',
    idPrefix: 'AH',
    branchName: 'Main branch',
    branchSlug: 'main',
    branchPrefix: 'MAIN',
    ownerMobile: M('owner'),
    ownerName: 'Owner',
    ownerPassword: 'owner-pass-123',
  });
  const [east] = await db.insert(branch).values({ organizationId: s.org.id, name: 'East branch', slug: 'east', codePrefix: 'EAST' }).returning();

  async function addStaff(username: string, memberships: { branchId: number; roleKey: string }[]) {
    const [u] = await db
      .insert(user)
      .values({ organizationId: s.org.id, username: M(username), mobile: M(username), name: username, passwordHash: await hashPassword(`${username}-pass-123`) })
      .returning();
    for (const m of memberships) await db.insert(branchMember).values({ branchId: m.branchId, userId: u.id, roleId: s.roles[m.roleKey] });
    return u;
  }
  await addStaff('doc', [{ branchId: s.branch.id, roleKey: 'doctor' }]); // main only
  await addStaff('eastdesk', [{ branchId: east.id, roleKey: 'front_desk' }]); // east only
  await addStaff('labtech', [{ branchId: s.branch.id, roleKey: 'lab_technician' }]); // main, view only
  await addStaff('pharm', [{ branchId: s.branch.id, roleKey: 'pharmacist' }]); // main
  await addStaff('desk', [{ branchId: s.branch.id, roleKey: 'front_desk' }]); // main

  const app = createApp(db);

  /** Signs in and returns a fetch-like caller that carries the session cookie. */
  async function as(username: string, password = `${username}-pass-123`) {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: M(username), password }),
    });
    if (res.status !== 200) throw new Error(`login ${username} failed: ${res.status}`);
    const cookie = res.headers.get('set-cookie')!.split(';')[0];
    return (url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
      app.request(url, {
        method: init.method ?? 'GET',
        headers: { Cookie: cookie, 'Content-Type': 'application/json', ...init.headers },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
  }

  return { db, app, as, org: s.org, main: s.branch, east, cleanup: () => {
      db.$client.close(); // release the native connection before deleting files / before the worker exits
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* Windows keeps the db file open until the process exits; the OS temp folder clears it. */
      }
    } };
}
