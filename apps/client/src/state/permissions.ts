import { roleHasPermission, type Permission } from '@clinic/shared';
import { getSessionUser, getSessionPermissions } from './auth-store.js';

/**
 * Whether the signed-in staff member may do something.
 *
 * Uses the permission list the server sent at login (which comes from the
 * editable role_permission table), falling back to the built-in defaults for
 * sessions from before this existed. This is UX only -- the server checks
 * again on every request.
 */
export function useHasPermission(permission: Permission): boolean {
  const user = getSessionUser();
  if (!user) return false;
  const granted = getSessionPermissions();
  if (granted) return granted.includes(permission);
  return roleHasPermission(user.role, permission);
}
