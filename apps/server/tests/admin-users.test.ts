import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createAdminRoutes } from '../src/routes/admin.js';
import { createTempDbPath, setupTestDb, cleanupDb } from './helpers.js';

// There is exactly one Admin account, forever: the seeded default. Nobody
// can create another one, promote anyone else to it, or demote it away.
describe('admin account is singular and its role is fixed', () => {
  let db: Database.Database;
  let dbPath: string;
  let admin: ReturnType<typeof createAdminRoutes>;
  let token: string;

  beforeEach(() => {
    dbPath = createTempDbPath();
    db = setupTestDb(dbPath);
    admin = createAdminRoutes(db);

    db.prepare(`INSERT INTO role (name) VALUES ('admin'), ('manager'), ('doctor'), ('pharmacist'), ('front_desk')`).run();
    const adminRoleId = (db.prepare(`SELECT id FROM role WHERE name = 'admin'`).get() as any).id;
    const user = db
      .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Boss', 'admin', 'x', ?)`)
      .run(adminRoleId);
    token = 'test-token';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, user.lastInsertRowid, expiresAt);
  });

  afterEach(() => cleanupDb(db, dbPath));

  function auth() {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  it('refuses to create a second admin account', async () => {
    const res = await admin.request('/users', {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ fullName: 'Second Admin', username: 'admin2', password: 'testpass123', roleName: 'admin' }),
    });
    expect(res.status).toBe(400);
    const count = (db.prepare(`SELECT COUNT(*) c FROM user`).get() as any).c;
    expect(count).toBe(1);
  });

  it('still creates staff with a real role normally', async () => {
    const res = await admin.request('/users', {
      method: 'POST',
      headers: auth(),
      body: JSON.stringify({ fullName: 'Doc A', username: 'doca', password: 'testpass123', roleName: 'doctor' }),
    });
    expect(res.status).toBe(201);
  });

  it("refuses to change the admin account's role", async () => {
    const adminId = (db.prepare(`SELECT id FROM user WHERE username = 'admin'`).get() as any).id;
    const res = await admin.request(`/users/${adminId}/role`, {
      method: 'PATCH',
      headers: auth(),
      body: JSON.stringify({ roleName: 'manager' }),
    });
    expect(res.status).toBe(400);
    const roleName = db
      .prepare(`SELECT r.name FROM user u JOIN role r ON r.id = u.role_id WHERE u.id = ?`)
      .get(adminId) as any;
    expect(roleName.name).toBe('admin');
  });

  it('refuses to promote another staff member to admin', async () => {
    const doctorRoleId = (db.prepare(`SELECT id FROM role WHERE name = 'doctor'`).get() as any).id;
    const staff = db
      .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Doc B', 'docb', 'x', ?)`)
      .run(doctorRoleId);

    const res = await admin.request(`/users/${staff.lastInsertRowid}/role`, {
      method: 'PATCH',
      headers: auth(),
      body: JSON.stringify({ roleName: 'admin' }),
    });
    expect(res.status).toBe(400);
    const roleName = db
      .prepare(`SELECT r.name FROM user u JOIN role r ON r.id = u.role_id WHERE u.id = ?`)
      .get(staff.lastInsertRowid) as any;
    expect(roleName.name).toBe('doctor');
  });

  it('still allows changing a non-admin staff member between real roles', async () => {
    const doctorRoleId = (db.prepare(`SELECT id FROM role WHERE name = 'doctor'`).get() as any).id;
    const staff = db
      .prepare(`INSERT INTO user (full_name, username, password_hash, role_id) VALUES ('Doc C', 'docc', 'x', ?)`)
      .run(doctorRoleId);

    const res = await admin.request(`/users/${staff.lastInsertRowid}/role`, {
      method: 'PATCH',
      headers: auth(),
      body: JSON.stringify({ roleName: 'manager' }),
    });
    expect(res.status).toBe(200);
    const roleName = db
      .prepare(`SELECT r.name FROM user u JOIN role r ON r.id = u.role_id WHERE u.id = ?`)
      .get(staff.lastInsertRowid) as any;
    expect(roleName.name).toBe('manager');
  });
});
