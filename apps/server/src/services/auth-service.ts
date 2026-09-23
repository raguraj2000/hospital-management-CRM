import argon2 from 'argon2';
import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';
import { ConflictError } from '../errors.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

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
): Promise<{ token: string; user: SessionUser }> {
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

  if (!row || !row.is_active) throw new ConflictError('Invalid credentials');

  const valid = await argon2.verify(row.password_hash, password);
  if (!valid) throw new ConflictError('Invalid credentials');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(`INSERT INTO session (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, row.id, expiresAt);

  return {
    token,
    user: { userId: row.id, username: row.username, fullName: row.full_name, role: row.role_name },
  };
}

export function logout(db: Database.Database, token: string): void {
  db.prepare(`UPDATE session SET revoked_at = datetime('now', 'localtime') WHERE token = ? AND revoked_at IS NULL`).run(token);
}

export function verifySession(db: Database.Database, token: string): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name, r.name as role_name, s.expires_at, s.revoked_at
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
        role_name: Role;
        expires_at: string;
        revoked_at: string | null;
      }
    | undefined;

  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  return { userId: row.id, username: row.username, fullName: row.full_name, role: row.role_name };
}
