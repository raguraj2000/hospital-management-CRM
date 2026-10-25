import { and, eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { ADMIN_ROLE_KEY, ipAllowed, MODULES, OWNER_PERMISSIONS, parseNetworks, withoutModules, type ModuleKey, type Permission } from '@platform/shared';
import type { Db } from './db/index.js';
import { branch, branchMember, role } from './db/schema.js';
import { AppError, forbidden } from './errors.js';
import { orgLimits, permissionsForRole, type AuthEnv } from './auth.js';

export interface BranchInfo {
  id: number;
  slug: string;
  name: string;
  codePrefix: string;
  roleName: string;
  permissions: Permission[];
  /** Switched off for this hospital by the platform admin. */
  modulesOff: ModuleKey[];
}

export type BranchEnv = AuthEnv & { Variables: AuthEnv['Variables'] & { branch: BranchInfo } };

/** The caller's address as the server's socket sees it (never a header: those can be typed by anyone). */
export function clientIp(c: { env: unknown }): string | null {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress ?? null;
}

/**
 * THE branch gate. Mount on `/b/:branch/*` after requireAuth. It finds the
 * branch inside the user's own organization and checks membership. A branch
 * the user can't open looks exactly like one that doesn't exist (404).
 */
export function branchContext(db: Db): MiddlewareHandler<BranchEnv> {
  return async (c, next) => {
    const u = c.get('user');
    const slug = c.req.param('branch');
    const notFound = new AppError(404, 'branch_not_found', 'Branch not found');
    if (!slug) throw notFound;

    const [b] = await db
      .select()
      .from(branch)
      .where(and(eq(branch.organizationId, u.organizationId), eq(branch.slug, slug), eq(branch.isActive, true)))
      .limit(1);
    if (!b) throw notFound;

    const { modulesOff } = await orgLimits(db, u.organizationId);
    let info: BranchInfo;
    if (u.isOwner) {
      info = { id: b.id, slug: b.slug, name: b.name, codePrefix: b.codePrefix, roleName: 'Owner', permissions: withoutModules(OWNER_PERMISSIONS, modulesOff), modulesOff };
    } else {
      const [m] = await db
        .select({ roleId: role.id, roleName: role.name, roleKey: role.key })
        .from(branchMember)
        .innerJoin(role, eq(role.id, branchMember.roleId))
        .where(and(eq(branchMember.branchId, b.id), eq(branchMember.userId, u.id), eq(branchMember.isActive, true)))
        .limit(1);
      if (!m) throw notFound;
      info = { id: b.id, slug: b.slug, name: b.name, codePrefix: b.codePrefix, roleName: m.roleName, permissions: withoutModules(await permissionsForRole(db, m.roleId, b.id), modulesOff), modulesOff };
      // Network lock, on every request: only from the hospital's network, unless the role may work from anywhere.
      // The owner and the branch admin never are locked out (they can always switch the lock off).
      const networks = parseNetworks(b.allowedNetworks).list;
      if (networks.length && m.roleKey !== ADMIN_ROLE_KEY && !info.permissions.includes('access.anywhere') && !ipAllowed(clientIp(c), networks)) {
        throw new AppError(403, 'outside_network', `${b.name} can only be used on the hospital's network. Ask the owner if you need to work from outside.`);
      }
    }
    c.set('branch', info);
    await next();
  };
}

/** Route guard for a module that has no permissions of its own: refused when this hospital has it switched off. */
export function requireModule(key: ModuleKey): MiddlewareHandler<BranchEnv> {
  const label = MODULES.find((m) => m.key === key)?.label ?? key;
  return async (c, next) => {
    if (c.get('branch').modulesOff.includes(key)) throw new AppError(403, 'module_off', `${label} is not switched on for this hospital. Please contact support.`);
    await next();
  };
}

/** Route guard: the user's role in THIS branch must include the permission. */
export function requirePermission(permission: Permission): MiddlewareHandler<BranchEnv> {
  return async (c, next) => {
    if (!c.get('branch').permissions.includes(permission)) throw forbidden();
    await next();
  };
}

/** Route guard: at least one of these permissions in THIS branch. */
export function requireAnyPermission(...permissions: Permission[]): MiddlewareHandler<BranchEnv> {
  return async (c, next) => {
    const mine = c.get('branch').permissions;
    if (!permissions.some((p) => mine.includes(p))) throw forbidden();
    await next();
  };
}
