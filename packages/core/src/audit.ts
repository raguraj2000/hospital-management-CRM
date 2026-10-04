import { sql } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { auditLog, branchCounter, orgCounter } from './db/schema.js';

export async function writeAudit(
  db: Pick<Db, 'insert'>,
  e: { organizationId: number; branchId?: number | null; userId?: number | null; action: string; entity: string; entityId?: number | string | null; detail?: unknown },
) {
  await db.insert(auditLog).values({
    organizationId: e.organizationId,
    branchId: e.branchId ?? null,
    userId: e.userId ?? null,
    action: e.action,
    entity: e.entity,
    entityId: e.entityId == null ? null : String(e.entityId),
    detail: e.detail === undefined ? null : JSON.stringify(e.detail),
  });
}

/** Next organization-wide running number (never repeats across branches), atomic. */
export async function nextOrgNumber(db: Pick<Db, 'insert'>, organizationId: number, name: string): Promise<number> {
  const [row] = await db
    .insert(orgCounter)
    .values({ organizationId, name, value: 1 })
    .onConflictDoUpdate({ target: [orgCounter.organizationId, orgCounter.name], set: { value: sql`${orgCounter.value} + 1` } })
    .returning({ value: orgCounter.value });
  return row.value;
}

/** Next running number for this branch, e.g. nextNumber(db, 3, 'patient') -> 1, 2, 3 ... (atomic). */
export async function nextNumber(db: Pick<Db, 'insert'>, branchId: number, name: string): Promise<number> {
  const [row] = await db
    .insert(branchCounter)
    .values({ branchId, name, value: 1 })
    .onConflictDoUpdate({ target: [branchCounter.branchId, branchCounter.name], set: { value: sql`${branchCounter.value} + 1` } })
    .returning({ value: branchCounter.value });
  return row.value;
}

/** Prefix for organization-wide IDs: the configured one, else the name's initials ("City Hospital" -> "CH"). */
export function idPrefixFor(org: { name: string; idPrefix: string }): string {
  if (org.idPrefix) return org.idPrefix;
  return (
    org.name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]!.toUpperCase())
      .join('')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4) || 'ID'
  );
}
