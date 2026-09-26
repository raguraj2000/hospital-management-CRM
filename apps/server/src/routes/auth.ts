import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import argon2 from 'argon2';
import { z } from 'zod';
import { login, logout, revokeUserSessions, LoginLockedError, DEFAULT_PASSWORD } from '../services/auth-service.js';
import { getPermissionsFor } from '../services/permission-service.js';
import { requireAuth } from '../middleware/auth.js';

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

const updateMeSchema = z.object({
  fullName: z.string().min(1).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export function createAuthRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.post('/login', async (c) => {
    const body = loginSchema.safeParse(await c.req.json());
    if (!body.success) return c.json({ error: 'Invalid request body' }, 400);

    try {
      const { token, user, mustChangePassword } = await login(db, body.data.username, body.data.password);
      // The app hides/shows controls from this list, so a permission change in
      // Settings takes effect for a staff member the next time they sign in.
      return c.json({ token, user, permissions: getPermissionsFor(db, user.role), mustChangePassword });
    } catch (err) {
      if (err instanceof LoginLockedError) return c.json({ error: err.message }, 429);
      return c.json({ error: 'Invalid credentials' }, 401);
    }
  });

  app.post('/logout', requireAuth(db), async (c) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const token = authHeader.slice('Bearer '.length);
    logout(db, token);
    return c.json({ ok: true });
  });

  // The signed-in user and what they may do RIGHT NOW. The app re-reads this
  // on start and when the window regains focus, so permissions added by an
  // update (or changed in Roles & permissions) show without signing out.
  app.get('/me', requireAuth(db), (c) => {
    const user = c.get('user');
    return c.json({ user, permissions: c.get('permissions') });
  });

  // Self-service: any signed-in user can change their own display name or
  // password -- no user.manage permission needed since it's their own
  // record. Distinct from PATCH /admin/users/:id, which lets an admin edit
  // *other* staff and requires that permission.
  app.patch('/me', requireAuth(db), async (c) => {
    const parsed = updateMeSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;
    const user = c.get('user');

    if (body.newPassword) {
      if (!body.currentPassword) return c.json({ error: 'Current password is required to set a new one' }, 400);
      const row = db.prepare('SELECT password_hash FROM user WHERE id = ?').get(user.userId) as
        | { password_hash: string }
        | undefined;
      if (!row || !(await argon2.verify(row.password_hash, body.currentPassword))) {
        return c.json({ error: 'Current password is incorrect' }, 401);
      }
      if (body.newPassword === DEFAULT_PASSWORD) {
        return c.json({ error: 'Choose a password other than the default one' }, 400);
      }
      const newHash = await argon2.hash(body.newPassword);
      db.prepare(`UPDATE user SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
        newHash,
        user.userId,
      );
      // Sign out this account everywhere else (e.g. a computer someone left logged in).
      const currentToken = (c.req.header('Authorization') ?? '').slice('Bearer '.length);
      revokeUserSessions(db, user.userId, currentToken);
    }

    if (body.fullName) {
      db.prepare(`UPDATE user SET full_name = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
        body.fullName,
        user.userId,
      );
    }

    const updated = db.prepare('SELECT full_name, username FROM user WHERE id = ?').get(user.userId) as {
      full_name: string;
      username: string;
    };
    return c.json({ fullName: updated.full_name, username: updated.username });
  });

  return app;
}
