import { and, eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { ALL_PERMISSIONS, type Permission } from '@platform/shared';
import type { Db } from './db/index.js';
import { branch, branchMember, role } from './db/schema.js';
import { AppError, forbidden } from './errors.js';
import { permissionsForRole, type AuthEnv } from './auth.js';

export interface BranchInfo {
  id: number;
  slug: string;
  name: string;
  codePrefix: string;
  roleName: string;
  permissions: Permission[];
}

export type BranchEnv = AuthEnv & { Variables: AuthEnv['Variables'] & { branch: BranchInfo } };

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

    let info: BranchInfo;
    if (u.isOwner) {
      info = { id: b.id, slug: b.slug, name: b.name, codePrefix: b.codePrefix, roleName: 'Owner', permissions: [...ALL_PERMISSIONS] };
    } else {
      const [m] = await db
        .select({ roleId: role.id, roleName: role.name })
        .from(branchMember)
        .innerJoin(role, eq(role.id, branchMember.roleId))
        .where(and(eq(branchMember.branchId, b.id), eq(branchMember.userId, u.id), eq(branchMember.isActive, true)))
        .limit(1);
      if (!m) throw notFound;
      info = { id: b.id, slug: b.slug, name: b.name, codePrefix: b.codePrefix, roleName: m.roleName, permissions: await permissionsForRole(db, m.roleId) };
    }
    c.set('branch', info);
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
