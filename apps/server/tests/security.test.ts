import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import argon2 from 'argon2';
import { createAdminRoutes } from '../src/routes/admin.js';
import { createAuthRoutes } from '../src/routes/auth.js';
import { resetLoginLockouts } from '../src/services/auth-service.js';
import { getPermissionsFor, setPermissionsFor } from '../src/services/permission-service.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

describe('account security', () => {
  let db: Database.Database;
  let dbPath: string;
  let admin: ReturnType<typeof createAdminRoutes>;
  let auth: ReturnType<typeof createAuthRoutes>;
  let adminId: number;
  let managerId: number;
  let doctorId: number;

  function addSession(userId: number, token: string) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expiresAt);
  }

  function call(app: typeof admin, path: string, token: string, method = 'POST', body?: unknown) {
    return app.request(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function login(username: string, password: string) {
    return auth.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }

  beforeEach(async () => {
    resetLoginLockouts();
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    admin = createAdminRoutes(db);
    auth = createAuthRoutes(db);

    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    const roleId = (name: string) => (db.prepare(`SELECT id FROM role WHERE name = ?`).get(name) as any).id;
    const hash = await argon2.hash('goodpass123');
    const defaultHash = await argon2.hash('changeme123');
    const add = (name: string, username: string, role: string, h: string) =>
      Number(
        db
          .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, ?, ?)`)
          .run(name, username, h, roleId(role)).lastInsertRowid,
      );
    adminId = add('Boss', 'admin', 'admin', defaultHash);
    managerId = add('Mgr', 'mgr', 'manager', hash);
    doctorId = add('Doc', 'doc', 'doctor', hash);
    addSession(adminId, 'admin-token');
    addSession(managerId, 'mgr-token');
    addSession(doctorId, 'doc-token');

    // The risky setup: the Admin has ticked "Manage staff accounts" for Manager.
    setPermissionsFor(db, 'manager', [...getPermissionsFor(db, 'manager'), 'user.manage']);
  });

  afterEach(() => cleanupDb(db, dbPath));

  it("a manager with user.manage can't reset the Admin's password", async () => {
    const res = await call(admin, `/users/${adminId}/reset-password`, 'mgr-token', 'POST', { newPassword: 'hacked12345' });
    expect(res.status).toBe(403);
    expect((await login('admin', 'hacked12345')).status).toBe(401);
  });

  it("a manager with user.manage can't rename the Admin account", async () => {
    const res = await call(admin, `/users/${adminId}`, 'mgr-token', 'PATCH', { username: 'boss2' });
    expect(res.status).toBe(403);
  });

  it('nobody can deactivate the Admin account, not even the Admin', async () => {
    expect((await call(admin, `/users/${adminId}/deactivate`, 'mgr-token')).status).toBe(400);
    expect((await call(admin, `/users/${adminId}/deactivate`, 'admin-token')).status).toBe(400);
  });

  it('a manager with user.manage can still reset other staff passwords', async () => {
    const res = await call(admin, `/users/${doctorId}/reset-password`, 'mgr-token', 'POST', { newPassword: 'newdocpass1' });
    expect(res.status).toBe(200);
  });

  it('deactivating a staff member ends their open session immediately', async () => {
    expect((await call(admin, '/users', 'doc-token', 'GET')).status).toBe(403); // signed in (403, not 401)
    expect((await call(admin, `/users/${doctorId}/deactivate`, 'admin-token')).status).toBe(200);
    expect((await call(admin, '/users', 'doc-token', 'GET')).status).toBe(401);
  });

  it('a deactivated account is refused even if its session row is somehow still open', async () => {
    db.prepare(`UPDATE user SET is_active = 0 WHERE id = ?`).run(doctorId);
    expect((await call(admin, '/users', 'doc-token', 'GET')).status).toBe(401);
  });

  it("resetting someone's password signs them out", async () => {
    await call(admin, `/users/${doctorId}/reset-password`, 'admin-token', 'POST', { newPassword: 'newdocpass1' });
    expect((await call(admin, '/users', 'doc-token', 'GET')).status).toBe(401);
    // ...but not the admin who did it.
    expect((await call(admin, '/users', 'admin-token', 'GET')).status).toBe(200);
  });

  it('changing your own password signs out your other sessions, not this one', async () => {
    addSession(doctorId, 'doc-token-2');
    const res = await call(auth, '/me', 'doc-token', 'PATCH', { currentPassword: 'goodpass123', newPassword: 'brandnew123' });
    expect(res.status).toBe(200);
    expect((await call(auth, '/me', 'doc-token-2', 'PATCH', { fullName: 'x' })).status).toBe(401);
    expect((await call(auth, '/me', 'doc-token', 'PATCH', { fullName: 'Doc B' })).status).toBe(200);
  });

  it('locks a username after 5 wrong passwords, even for the right password', async () => {
    for (let i = 0; i < 5; i++) expect((await login('doc', 'wrong-pass')).status).toBe(401);
    const locked = await login('doc', 'goodpass123');
    expect(locked.status).toBe(429);
    expect((await locked.json()).error).toMatch(/Too many wrong passwords/);
    // Other accounts are unaffected.
    expect((await login('mgr', 'goodpass123')).status).toBe(200);
  });

  it('a correct password before the limit clears the wrong-password count', async () => {
    for (let i = 0; i < 4; i++) await login('doc', 'wrong-pass');
    expect((await login('doc', 'goodpass123')).status).toBe(200);
    for (let i = 0; i < 4; i++) await login('doc', 'wrong-pass');
    expect((await login('doc', 'goodpass123')).status).toBe(200);
  });

  it('flags the default password so the app forces a change, and refuses it as a new password', async () => {
    const res = await login('admin', 'changeme123');
    expect((await res.json()).mustChangePassword).toBe(true);
    expect((await (await login('mgr', 'goodpass123')).json()).mustChangePassword).toBe(false);

    const again = await call(auth, '/me', 'admin-token', 'PATCH', { currentPassword: 'changeme123', newPassword: 'changeme123' });
    expect(again.status).toBe(400);
  });
});
