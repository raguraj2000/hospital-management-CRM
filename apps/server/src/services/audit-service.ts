import type Database from 'better-sqlite3';
import type { Role } from '@clinic/shared';

export interface AuditEntry {
  entityType: string;
  entityId: number;
  action: string;
  performedByUserId: number;
  performedByRole: Role;
  detail?: unknown;
}

// Caller is responsible for wrapping this in the same transaction as the
// action it audits, so the write is atomic with the entity change.
export function insertAuditLog(db: Database.Database, entry: AuditEntry): void {
  db.prepare(
    `INSERT INTO audit_log (entity_type, entity_id, action, performed_by_user_id, performed_by_role, detail_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.entityType,
    entry.entityId,
    entry.action,
    entry.performedByUserId,
    entry.performedByRole,
    entry.detail !== undefined ? JSON.stringify(entry.detail) : null,
  );
}
