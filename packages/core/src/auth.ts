import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { ALL_PERMISSIONS, changePasswordSchema, loginSchema, isPermission, type MeResponse, type Permission } from '@platform/shared';
import type { Db } from './db/index.js';
import { branch, branchMember, organization, role, rolePermission, session, user } from './db/schema.js';
import { AppError, validationError } from './errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { writeAudit } from './audit.js';

export const SESSION_COOKIE = 'sid';
const SESSION_HOURS = 12; // a working day; staff sign in again tomorrow
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export interface AuthUser {
  id: number;
  organizationId: number;
  mobile: string;
  name: string;
  isOwner: boolean;
  isPlatformAdmin: boolean;
}

export type AuthEnv = { Variables: { user: AuthUser; sessionId: string } };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// A real hash so an unknown mobile takes as long as a wrong password (no account probing by timing).
const DUMMY_HASH = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);

export async function createSession(db: Db, userId: number, userAgent: string | undefined) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();
  await db.insert(session).values({ id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) });
  return { token, expiresAt };
}

function toAuthUser(u: typeof user.$inferSelect): AuthUser {
  return { id: u.id, organizationId: u.organizationId, mobile: u.mobile ?? u.username, name: u.name, isOwner: u.isOwner, isPlatformAdmin: u.isPlatformAdmin };
}

/** The signed-in user for a cookie token, or null (missing, expired, revoked, deactivated). */
export async function userForToken(db: Db, token: string | undefined): Promise<{ user: AuthUser; sessionId: string } | null> {
  if (!token) return null;
  const id = sha256(token);
  const [row] = await db
    .select({ user, sessionId: session.id })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .innerJoin(organization, eq(organization.id, user.organizationId))
    // A suspended customer is signed out at once (organization.isActive).
    .where(and(eq(session.id, id), isNull(session.revokedAt), gt(session.expiresAt, new Date().toISOString()), eq(user.isActive, true), eq(organization.isActive, true)))
    .limit(1);
  if (!row) return null;
  const u = row.user;
  return {
    user: toAuthUser(u),
    sessionId: row.sessionId,
  };
}

function cookieOptions(c: Context) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
  };
}

/** Ends every session of a user (except, optionally, the one making the request). */
export async function revokeUserSessions(db: Db, userId: number, exceptSessionId?: string) {
  const now = new Date().toISOString();
  await db
    .update(session)
    .set({ revokedAt: now })
    .where(and(eq(session.userId, userId), isNull(session.revokedAt), exceptSessionId ? ne(session.id, exceptSessionId) : undefined));
}

/** Organization-level admin screens (branches, roles): the owner only. */
export function requireOwner(): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    if (!c.get('user').isOwner) throw new AppError(403, 'forbidden', 'Only the owner can do this');
    await next();
  };
}

/** Requires a valid session cookie; puts the user on the request. */
export function requireAuth(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const found = await userForToken(db, getCookie(c, SESSION_COOKIE));
    if (!found) throw new AppError(401, 'unauthenticated', 'Please sign in');
    c.set('user', found.user);
    c.set('sessionId', found.sessionId);
    await next();
  };
}

/** Every branch the user may open, with their role and permissions in it. */
export async function branchesFor(db: Db, u: AuthUser): Promise<MeResponse['branches']> {
  if (u.isOwner) {
    const all = await db
      .select({ slug: branch.slug, name: branch.name })
      .from(branch)
      .where(and(eq(branch.organizationId, u.organizationId), eq(branch.isActive, true)))
      .orderBy(branch.id);
    return all.map((b) => ({ ...b, roleName: 'Owner', permissions: [...ALL_PERMISSIONS] }));
  }
  const rows = await db
    .select({ slug: branch.slug, name: branch.name, roleId: role.id, roleName: role.name })
    .from(branchMember)
    .innerJoin(branch, eq(branch.id, branchMember.branchId))
    .innerJoin(role, eq(role.id, branchMember.roleId))
    .where(and(eq(branchMember.userId, u.id), eq(branchMember.isActive, true), eq(branch.isActive, true)))
    .orderBy(branch.id);
  const result: MeResponse['branches'] = [];
  for (const r of rows) {
    result.push({ slug: r.slug, name: r.name, roleName: r.roleName, permissions: await permissionsForRole(db, r.roleId) });
  }
  return result;
}

export async function permissionsForRole(db: Db, roleId: number): Promise<Permission[]> {
  const rows = await db.select({ p: rolePermission.permission }).from(rolePermission).where(eq(rolePermission.roleId, roleId));
  return rows.map((r) => r.p).filter(isPermission);
}

export async function meResponse(db: Db, u: AuthUser): Promise<MeResponse> {
  const [org] = await db.select({ id: organization.id, name: organization.name }).from(organization).where(eq(organization.id, u.organizationId));
  return {
    user: { id: u.id, name: u.name, mobile: u.mobile, isOwner: u.isOwner, isPlatformAdmin: u.isPlatformAdmin },
    organization: org,
    branches: await branchesFor(db, u),
  };
}

/** /auth/login, /auth/logout, /auth/me */
export function createAuthRoutes(db: Db) {
  const app = new Hono<AuthEnv>();

  app.post('/login', async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const { mobile, password } = parsed.data;

    const [u] = await db.select().from(user).where(eq(user.mobile, mobile)).limit(1);
    const invalid = new AppError(401, 'invalid_credentials', 'Wrong mobile number or password');
    if (!u || !u.isActive) {
      await verifyPassword(password, DUMMY_HASH);
      throw invalid;
    }
    if (u.lockedUntil && u.lockedUntil > new Date().toISOString()) {
      throw new AppError(429, 'locked', `Too many wrong passwords. Try again after ${LOCK_MINUTES} minutes.`);
    }
    if (!(await verifyPassword(password, u.passwordHash))) {
      const failed = u.failedLogins + 1;
      const lock = failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await db.update(user).set({ failedLogins: lock ? 0 : failed, lockedUntil: lock }).where(eq(user.id, u.id));
      throw invalid;
    }
    await db.update(user).set({ failedLogins: 0, lockedUntil: null }).where(eq(user.id, u.id));
    const [org] = await db.select({ isActive: organization.isActive }).from(organization).where(eq(organization.id, u.organizationId));
    if (!org?.isActive) throw new AppError(403, 'suspended', 'This account is suspended. Please contact support.');

    const { token } = await createSession(db, u.id, c.req.header('User-Agent'));
    setCookie(c, SESSION_COOKIE, token, { ...cookieOptions(c), maxAge: SESSION_HOURS * 3600 });
    const authUser = toAuthUser(u);
    await writeAudit(db, { organizationId: u.organizationId, userId: u.id, action: 'login', entity: 'user', entityId: u.id });
    return c.json(await meResponse(db, authUser));
  });

  app.post('/logout', requireAuth(db), async (c) => {
    await db.update(session).set({ revokedAt: new Date().toISOString() }).where(eq(session.id, c.get('sessionId')));
    deleteCookie(c, SESSION_COOKIE, cookieOptions(c));
    return c.json({ ok: true });
  });

  app.get('/me', requireAuth(db), async (c) => c.json(await meResponse(db, c.get('user'))));

  // Change my own password. Signs this account out everywhere else.
  app.post('/password', requireAuth(db), async (c) => {
    const parsed = changePasswordSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const u = c.get('user');
    const [row] = await db.select({ passwordHash: user.passwordHash }).from(user).where(eq(user.id, u.id));
    if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
      throw new AppError(400, 'validation', 'Current password is wrong', { currentPassword: ['Current password is wrong'] });
    }
    await db.update(user).set({ passwordHash: await hashPassword(parsed.data.newPassword), updatedAt: new Date().toISOString() }).where(eq(user.id, u.id));
    await revokeUserSessions(db, u.id, c.get('sessionId'));
    await writeAudit(db, { organizationId: u.organizationId, userId: u.id, action: 'change_password', entity: 'user', entityId: u.id });
    return c.json({ ok: true });
  });

  return app;
}
