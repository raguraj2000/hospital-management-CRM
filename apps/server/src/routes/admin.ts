import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import argon2 from 'argon2';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { ADMIN_ROLE, EDITABLE_ROLES, type Permission } from '@clinic/shared';
import { getPermissionMatrix, setPermissionsFor } from '../services/permission-service.js';
import { insertAuditLog } from '../services/audit-service.js';
import { revokeUserSessions } from '../services/auth-service.js';
import { getClinicHeader, PRINT_HEADER_KEYS } from '../services/invoice-service.js';
import {
  runBackupNow,
  getBackupSettings,
  saveBackupSettings,
  getBackupSummary,
  ALLOWED_INTERVALS,
  ALLOWED_KEEP_DAILY_DAYS,
} from '../services/backup-service.js';

const roleEnum = z.enum(['admin', 'manager', 'doctor', 'pharmacist', 'front_desk', 'lab_technician']);

const createUserSchema = z.object({
  fullName: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(8),
  roleName: roleEnum,
});

const updateRoleSchema = z.object({ roleName: roleEnum });

const rolePermissionsSchema = z.object({
  roleName: roleEnum,
  permissions: z.array(z.string()).max(100),
});

const backupSettingsSchema = z.object({
  auto: z.boolean(),
  intervalMinutes: z.number().refine((n) => ALLOWED_INTERVALS.includes(n), 'Unsupported interval'),
  keepDailyDays: z.number().refine((n) => ALLOWED_KEEP_DAILY_DAYS.includes(n), 'Unsupported retention'),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
});

const resetPasswordSchema = z.object({ newPassword: z.string().min(8) });

// Letterhead text: every key optional, blank allowed (e.g. no phone).
const printHeaderSchema = z.object(
  Object.fromEntries(PRINT_HEADER_KEYS.map((k) => [k, z.string().trim().max(120)])) as Record<
    (typeof PRINT_HEADER_KEYS)[number],
    z.ZodString
  >,
).partial();

// The English name used on app screens' bills ("Aadhi Hospital").
const clinicNameSchema = z.string().trim().min(1).max(80).optional();

export function createAdminRoutes(db: Database.Database): Hono {
  const app = new Hono();
  app.use('*', requireAuth(db));

  function isAdminAccount(userId: number): boolean {
    const row = db
      .prepare(`SELECT r.name AS role_name FROM user u JOIN role r ON r.id = u.role_id WHERE u.id = ?`)
      .get(userId) as { role_name: string } | undefined;
    return row?.role_name === ADMIN_ROLE;
  }

  // "Manage staff accounts" can be ticked for other roles in Settings; that
  // must never let them take over the Admin account (edit it, reset its
  // password). Only the Admin may change the Admin account.
  const ADMIN_ONLY = "Only the Admin can change the Admin account.";

  // Without `page`, behaves exactly as before (LIMIT 200, no `total`);
  // pass `page` (and optional `pageSize`, default 20) for pagination.
  app.get('/audit-log', requirePermission('auditLog.view'), (c) => {
    const entityType = c.req.query('entityType');
    const entityId = c.req.query('entityId');
    const filtered = Boolean(entityType && entityId);
    const whereSql = filtered ? 'WHERE entity_type = ? AND entity_id = ?' : '';
    const whereParams = filtered ? [entityType, Number(entityId)] : [];

    const pageParam = c.req.query('page');
    if (!pageParam) {
      const rows = db
        .prepare(`SELECT * FROM audit_log ${whereSql} ORDER BY performed_at DESC LIMIT 200`)
        .all(...whereParams);
      return c.json({ entries: rows });
    }

    const page = Math.max(1, Number(pageParam) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 20));
    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM audit_log ${whereSql}`).get(...whereParams) as { count: number }
    ).count;
    const rows = db
      .prepare(`SELECT * FROM audit_log ${whereSql} ORDER BY performed_at DESC LIMIT ? OFFSET ?`)
      .all(...whereParams, pageSize, (page - 1) * pageSize);
    return c.json({ entries: rows, total, page, pageSize });
  });

  app.get('/users', requirePermission('user.manage'), (c) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.full_name, u.username, u.is_active, r.name as role_name
         FROM user u JOIN role r ON r.id = u.role_id ORDER BY u.full_name`,
      )
      .all();
    return c.json({ users: rows });
  });

  app.patch('/users/:id', requirePermission('user.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    if (isAdminAccount(id) && c.get('user').role !== ADMIN_ROLE) return c.json({ error: ADMIN_ONLY }, 403);
    const parsed = updateUserSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    if (body.username) {
      const taken = db.prepare('SELECT id FROM user WHERE username = ? AND id != ?').get(body.username, id);
      if (taken) return c.json({ error: `Username "${body.username}" is already in use` }, 409);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.fullName) {
      fields.push('full_name = ?');
      values.push(body.fullName);
    }
    if (body.username) {
      fields.push('username = ?');
      values.push(body.username);
    }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400);

    values.push(id);
    db.prepare(`UPDATE user SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
      ...values,
    );
    return c.json({ ok: true });
  });

  // Admin-initiated reset -- doesn't require the staff member's current
  // password (they may not be present, or may have forgotten it), unlike
  // the self-service change at PATCH /auth/me. Lets a deactivated-elsewhere
  // or new-computer staff member get a fresh temporary password from an
  // admin so they can sign in there.
  app.post('/users/:id/reset-password', requirePermission('user.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = resetPasswordSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    const user = db.prepare('SELECT id FROM user WHERE id = ?').get(id);
    if (!user) return c.json({ error: 'Not found' }, 404);
    if (isAdminAccount(id) && c.get('user').role !== ADMIN_ROLE) return c.json({ error: ADMIN_ONLY }, 403);

    const passwordHash = await argon2.hash(parsed.data.newPassword);
    db.prepare(`UPDATE user SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(
      passwordHash,
      id,
    );
    // Old password is gone, so are the sessions opened with it (except the caller's own).
    const callerToken = (c.req.header('Authorization') ?? '').slice('Bearer '.length);
    revokeUserSessions(db, id, callerToken);
    return c.json({ ok: true });
  });

  app.post('/users', requirePermission('user.manage'), async (c) => {
    const parsed = createUserSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    // Only the one seeded Admin account may ever exist -- never create another.
    if (body.roleName === 'admin') {
      return c.json({ error: 'Only one Admin account is allowed. Give new staff the Manager, Doctor, Pharmacist or Front desk role.' }, 400);
    }

    const role = db.prepare('SELECT id FROM role WHERE name = ?').get(body.roleName) as { id: number } | undefined;
    if (!role) return c.json({ error: 'Unknown role' }, 400);

    const passwordHash = await argon2.hash(body.password);
    const info = db
      .prepare('INSERT INTO user (full_name, username, password_hash, role_id) VALUES (?, ?, ?, ?)')
      .run(body.fullName, body.username, passwordHash, role.id);

    return c.json({ id: Number(info.lastInsertRowid) }, 201);
  });

  app.post('/users/:id/deactivate', requirePermission('user.manage'), (c) => {
    const id = Number(c.req.param('id'));
    // Deactivating the only Admin would lock everyone out of Settings.
    if (isAdminAccount(id)) return c.json({ error: "The Admin account can't be deactivated." }, 400);
    db.prepare(`UPDATE user SET is_active = 0, deactivated_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
    revokeUserSessions(db, id);
    return c.json({ ok: true });
  });

  app.post('/users/:id/reactivate', requirePermission('user.manage'), (c) => {
    const id = Number(c.req.param('id'));
    db.prepare(`UPDATE user SET is_active = 1, deactivated_at = NULL WHERE id = ?`).run(id);
    return c.json({ ok: true });
  });

  app.patch('/users/:id/role', requirePermission('user.manage'), async (c) => {
    const id = Number(c.req.param('id'));
    const parsed = updateRoleSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

    // The Admin account's role is fixed for life (never demoted), and no one
    // else can ever be promoted to Admin -- there is exactly one, forever.
    const current = db
      .prepare(`SELECT r.name AS role_name FROM user u JOIN role r ON r.id = u.role_id WHERE u.id = ?`)
      .get(id) as { role_name: string } | undefined;
    if (current?.role_name === 'admin') {
      return c.json({ error: "The Admin account's role is fixed and can't be changed." }, 400);
    }
    if (parsed.data.roleName === 'admin') {
      return c.json({ error: 'Only one Admin account is allowed; no one else can be made Admin.' }, 400);
    }

    const role = db.prepare('SELECT id FROM role WHERE name = ?').get(parsed.data.roleName) as
      | { id: number }
      | undefined;
    if (!role) return c.json({ error: 'Unknown role' }, 400);

    db.prepare(`UPDATE user SET role_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(role.id, id);
    return c.json({ ok: true });
  });

  app.post('/backup', requirePermission('backup.configure'), async (c) => {
    const result = await runBackupNow(db);
    return c.json(result);
  });

  // --- Roles & permissions ---------------------------------------------
  // Admin is returned for display but can never be written: it always has
  // every permission (see permission-service), so the clinic can't lock
  // itself out.
  app.get('/role-permissions', requirePermission('user.manage'), (c) =>
    c.json({ matrix: getPermissionMatrix(db), adminRole: ADMIN_ROLE, editableRoles: EDITABLE_ROLES }),
  );

  app.post('/role-permissions', requirePermission('user.manage'), async (c) => {
    const parsed = rolePermissionsSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
    const { roleName, permissions } = parsed.data;
    if (roleName === ADMIN_ROLE) {
      return c.json({ error: "The Admin role always has every permission and can't be changed." }, 400);
    }
    const user = c.get('user');
    // setPermissionsFor drops anything not in ALL_PERMISSIONS, so unknown
    // strings from an older/newer client are ignored rather than stored.
    setPermissionsFor(db, roleName, permissions as Permission[]);
    insertAuditLog(db, {
      entityType: 'role_permission',
      entityId: 0,
      action: 'update',
      performedByUserId: user.userId,
      performedByRole: user.role,
      detail: { roleName, permissions },
    });
    return c.json({ matrix: getPermissionMatrix(db) });
  });

  // --- Print letterhead (Settings > Print header) -------------------------
  app.get('/print-header', requirePermission('backup.configure'), (c) => {
    const values = Object.fromEntries(
      PRINT_HEADER_KEYS.map((k) => {
        const row = db.prepare('SELECT value FROM app_setting WHERE key = ?').get(k) as { value: string } | undefined;
        return [k, row?.value ?? ''];
      }),
    );
    return c.json({ values, clinicName: getClinicHeader(db).name });
  });

  app.post('/print-header', requirePermission('backup.configure'), async (c) => {
    const body = (await c.req.json()) as { values?: unknown; clinicName?: unknown };
    const values = printHeaderSchema.safeParse(body.values ?? {});
    const clinicName = clinicNameSchema.safeParse(body.clinicName ?? undefined);
    if (!values.success || !clinicName.success) return c.json({ error: 'Check the header fields (max 120 characters each)' }, 400);
    const user = c.get('user');
    const upsert = db.prepare(
      `INSERT INTO app_setting (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')`,
    );
    db.transaction(() => {
      for (const [k, v] of Object.entries(values.data)) upsert.run(k, v ?? '');
      if (clinicName.data) upsert.run('clinic.name', clinicName.data);
      insertAuditLog(db, {
        entityType: 'app_setting',
        entityId: 0,
        action: 'print_header_update',
        performedByUserId: user.userId,
        performedByRole: user.role,
        detail: { ...values.data, clinicName: clinicName.data },
      });
    })();
    return c.json({ ok: true });
  });

  app.get('/backup-settings', requirePermission('backup.configure'), (c) =>
    c.json({ settings: getBackupSettings(db), summary: getBackupSummary() }),
  );

  app.post('/backup-settings', requirePermission('backup.configure'), async (c) => {
    const parsed = backupSettingsSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: 'Invalid backup settings', details: parsed.error.flatten() }, 400);
    saveBackupSettings(db, parsed.data);
    return c.json({ settings: getBackupSettings(db) });
  });

  return app;
}
