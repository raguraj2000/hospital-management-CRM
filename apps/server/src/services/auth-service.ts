import argon2 from 'argon2';
import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { ConflictError } from '../errors.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// The password seed.ts / "Reset Admin Password.bat" set. Signing in with it
// makes the app send the user straight to "Change password".
export const DEFAULT_PASSWORD = 'changeme123';

// Wrong-password lockout: after MAX_FAILED_LOGINS misses in a row, that
// username is refused for LOCKOUT_MS. Keyed by username (not IP) because
// every computer on the clinic LAN would share one IP range anyway.
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
// TODO(shortcut): kept in memory, so a server restart clears lockouts. Fine for one clinic LAN.
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();

export class LoginLockedError extends Error {
  constructor(public retryAfterMinutes: number) {
    super(`Too many wrong passwords. Try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`);
    this.name = 'LoginLockedError';
  }
}

function checkNotLocked(key: string): void {
  const entry = failedLogins.get(key);
  if (entry && entry.lockedUntil > Date.now()) {
    throw new LoginLockedError(Math.ceil((entry.lockedUntil - Date.now()) / 60_000));
  }
}

function recordFailedLogin(key: string): void {
  const entry = failedLogins.get(key);
  // A lockout that has already run out starts the count again from scratch.
  const lockExpired = entry !== undefined && entry.lockedUntil !== 0 && entry.lockedUntil <= Date.now();
  const count = !entry || lockExpired ? 1 : entry.count + 1;
  failedLogins.set(key, { count, lockedUntil: count >= MAX_FAILED_LOGINS ? Date.now() + LOCKOUT_MS : 0 });
}

/** Test hook: forget all failed-login counts. */
export function resetLoginLockouts(): void {
  failedLogins.clear();
}

/** Ends every session of a user, optionally keeping one (the caller's own). */
export function revokeUserSessions(db: Database.Database, userId: number, exceptToken?: string): void {
  db.prepare(
    `UPDATE session SET revoked_at = datetime('now', 'localtime')
     WHERE user_id = ? AND revoked_at IS NULL AND token != ?`,
  ).run(userId, exceptToken ?? '');
}

export interface SessionUser {
  userId: number;
  username: string;
  fullName: string;
  role: Role;
}

export async function login(
  db: Database.Database,
  username: string,
  password: string,
): Promise<{ token: string; user: SessionUser; mustChangePassword: boolean }> {
  const lockKey = username.trim().toLowerCase();
  checkNotLocked(lockKey);

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.password_hash, u.is_active, r.name as role_name
       FROM user u JOIN role r ON r.id = u.role_id
       WHERE u.username = ?`,
    )
    .get(username) as
    | {
        id: number;
        username: string;
        full_name: string;
        password_hash: string;
        is_active: number;
        role_name: Role;
      }
    | undefined;

  if (!row || !row.is_active) {
    recordFailedLogin(lockKey);
    throw new ConflictError('Invalid credentials');
  }

  const valid = await argon2.verify(row.password_hash, password);
  if (!valid) {
    recordFailedLogin(lockKey);
    throw new ConflictError('Invalid credentials');
  }
  failedLogins.delete(lockKey);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, row.id, expiresAt);

  return {
    token,
    user: { userId: row.id, username: row.username, fullName: row.full_name, role: row.role_name },
    mustChangePassword: password === DEFAULT_PASSWORD,
  };
}

export function logout(db: Database.Database, token: string): void {
  db.prepare(`UPDATE session SET revoked_at = datetime('now', 'localtime') WHERE token = ? AND revoked_at IS NULL`).run(token);
}

export function verifySession(db: Database.Database, token: string): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.is_active, r.name as role_name, s.expires_at, s.revoked_at
       FROM session s
       JOIN user u ON u.id = s.user_id
       JOIN role r ON r.id = u.role_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | {
        id: number;
        username: string;
        full_name: string;
        is_active: number;
        role_name: Role;
        expires_at: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!row) return null;
  if (row.revoked_at) return null;
  // A deactivated account is locked out immediately, not when its session expires.
  if (!row.is_active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return { userId: row.id, username: row.username, fullName: row.full_name, role: row.role_name };
}
