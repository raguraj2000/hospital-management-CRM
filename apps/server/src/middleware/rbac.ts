import type { MiddlewareHandler } from 'hono';
import { roleHasPermission, type Permission } from '@clinic/shared';

// Authoritative RBAC enforcement point — every mutating/sensitive route goes
// through this. The client's copy is UX-only.
//
// The permission list is put on the context by requireAuth, which runs first
// on every router; it comes from the editable role_permission table (admin
// always has everything). roleHasPermission is only the fallback for the
// impossible case of this running without requireAuth.
export function requirePermission(permission: Permission): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthenticated' }, 401);
    const granted = c.get('permissions');
    const allowed = granted ? granted.includes(permission) : roleHasPermission(user.role, permission);
    if (!allowed) {
      return c.json({ error: `Role '${user.role}' lacks permission '${permission}'` }, 403);
    }
    await next();
  };
}
