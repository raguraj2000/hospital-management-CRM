import type Database from 'better-sqlite3';
import {
  ADMIN_ROLE,
  ALL_PERMISSIONS,
  EDITABLE_ROLES,
  PERMISSION_MATRIX,
  type Permission,
  type Role,
} from '@clinic/shared';

/**
 * Effective permissions per role.
 *
 * - admin is hardcoded to every permission and never read from the database,
 *   so no amount of editing in Settings can lock the clinic out.
 * - every other role comes from the role_permission table (seeded in
 *   migration 0013 with exactly the old hardcoded lists).
 *
 * The answer is cached in memory because requirePermission runs on every
 * request; the cache is dropped whenever the table is written.
 */
let cache: Map<Role, Set<Permission>> | null = null;

export function invalidatePermissionCache(): void {
  cache = null;
}

function loadCache(db: Database.Database): Map<Role, Set<Permission>> {
  const map = new Map<Role, Set<Permission>>();
  map.set(ADMIN_ROLE, new Set(ALL_PERMISSIONS));

  let rows: { role_name: string; permission: string }[] = [];
  try {
    rows = db.prepare('SELECT role_name, permission FROM role_permission').all() as typeof rows;
  } catch {
    // Table not there yet (migration pending): fall back to the built-in
    // defaults so the server still answers correctly instead of refusing
    // every request.
    for (const role of EDITABLE_ROLES) map.set(role, new Set(PERMISSION_MATRIX[role]));
    return map;
  }

  for (const role of EDITABLE_ROLES) map.set(role, new Set());
  for (const row of rows) {
    const role = row.role_name as Role;
    if (role === ADMIN_ROLE) continue; // admin is fixed; ignore any stray rows
    if (!map.has(role)) map.set(role, new Set());
    map.get(role)!.add(row.permission as Permission);
  }
  return map;
}

export function getPermissionsFor(db: Database.Database, role: Role): Permission[] {
  if (role === ADMIN_ROLE) return [...ALL_PERMISSIONS];
  if (!cache) cache = loadCache(db);
  return [...(cache.get(role) ?? new Set<Permission>())];
}

export function hasPermission(db: Database.Database, role: Role, permission: Permission): boolean {
  if (role === ADMIN_ROLE) return true;
  if (!cache) cache = loadCache(db);
  return cache.get(role)?.has(permission) ?? false;
}

/** The whole grid, for Settings > Roles & permissions. Admin included, read-only. */
export function getPermissionMatrix(db: Database.Database): Record<string, Permission[]> {
  const result: Record<string, Permission[]> = { [ADMIN_ROLE]: [...ALL_PERMISSIONS] };
  for (const role of EDITABLE_ROLES) result[role] = getPermissionsFor(db, role);
  return result;
}

/** Replaces one editable role's permission set. Admin is rejected by the caller. */
export function setPermissionsFor(db: Database.Database, role: Role, permissions: Permission[]): void {
  const clean = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM role_permission WHERE role_name = ?').run(role);
    const insert = db.prepare('INSERT OR IGNORE INTO role_permission (role_name, permission) VALUES (?, ?)');
    for (const p of clean) insert.run(role, p);
  });
  replace();
  invalidatePermissionCache();
}
