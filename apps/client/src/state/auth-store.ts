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
}

/** Patches the locally stored user (e.g. after a self-service name change) without a fresh login. */
export function patchSessionUser(patch: Partial<SessionUser>): void {
  const current = getSessionUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }));
}
