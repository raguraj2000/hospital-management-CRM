import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { requireAuth } from '../middleware/auth.js';

/**
 * Lightweight staff directory (id, name, role) for populating "who" pickers
 * -- e.g. the prescribing doctor on a follow-up. Deliberately open to any
 * authenticated user (not gated by user.manage, unlike /admin/users, which
 * carries usernames and full account-management actions): staff names and
 * roles aren't sensitive within an internal clinic tool, and a pharmacist or
 * front-desk user needs this list just as much as an admin does.
 */
export function createStaffRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  app.get('/', (c) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.full_name, r.name as role_name
         FROM user u JOIN role r ON r.id = u.role_id
         WHERE u.is_active = 1
         ORDER BY u.full_name`,
      )
      .all();
    return c.json({ staff: rows });
  });

  return app;
}
