import type { Permission, Role } from '@clinic/shared';

export interface SessionUser {
  userId: number;
  username: string;
  fullName: string;
  role: Role;
}

const TOKEN_KEY = 'clinic.sessionToken';
const PERMISSIONS_KEY = 'clinic.sessionPermissions';
const USER_KEY = 'clinic.sessionUser';
const MUST_CHANGE_PASSWORD_KEY = 'clinic.mustChangePassword';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token: string, user: SessionUser, permissions?: Permission[]): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (permissions) localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  else localStorage.removeItem(PERMISSIONS_KEY);
}

/** Permissions this staff member has, as the server reported them at login.
 *  Null means 'unknown' -- callers fall back to the built-in defaults. */
export function getSessionPermissions(): Permission[] | null {
  const raw = localStorage.getItem(PERMISSIONS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Permission[]; } catch { return null; }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

/** True while the signed-in user still has the default password; the app keeps them on Preferences until they change it. */
export function getMustChangePassword(): boolean {
  return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === '1';
}

export function setMustChangePassword(value: boolean): void {
  if (value) localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, '1');
  else localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

/** Replaces the stored permission list (e.g. after an update added new ones). Returns true if it changed. */
export function refreshSessionPermissions(permissions: Permission[]): boolean {
  const next = JSON.stringify([...permissions].sort());
  const current = localStorage.getItem(PERMISSIONS_KEY);
  const currentSorted = current ? JSON.stringify([...(JSON.parse(current) as Permission[])].sort()) : null;
  if (next === currentSorted) return false;
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  return true;
}

/** Patches the locally stored user (e.g. after a self-service name change) without a fresh login. */
export function patchSessionUser(patch: Partial<SessionUser>): void {
  const current = getSessionUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }));
}
