// The history log keeps the last AUDIT_KEEP_DAYS days. It rolls: as a new day is written, the day that has
// become too old is removed (checked when the server starts and then every hour).
import { sql } from 'drizzle-orm';
import type { Db } from '@platform/core';

export const AUDIT_KEEP_DAYS = 30;

/**
 * Entries that are never removed: they mark a one-time step as done (see lib/lab-merge.ts). Without them the step
 * would run again at the next start.
 */
// 'amend' = a completed lab report corrected afterwards: who, when and why stays for good (medical record).
export const AUDIT_MARKERS = ['amend', 'sugar_lines_optional', 'role_added_visiting_doctor', 'permission_added_reports_view', 'permission_added_lab_correct', 'random_blood_sugar_test', 'hba1c_test'];

/** Removes history older than AUDIT_KEEP_DAYS days. Returns how many entries went. */
export async function purgeOldAudit(db: Db, keepDays = AUDIT_KEEP_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 86_400_000).toISOString();
  const markers = sql.join(AUDIT_MARKERS.map((m) => sql`${m}`), sql`, `);
  const [{ n }] = await db.all<{ n: number }>(sql`select count(*) as n from audit_log where created_at < ${cutoff} and action not in (${markers})`);
  if (n) await db.run(sql`delete from audit_log where created_at < ${cutoff} and action not in (${markers})`);
  return n;
}

/** Purge now, then every hour for as long as the server runs. */
export function keepAuditTrimmed(db: Db) {
  const run = () =>
    // Sign-ins that ended over a week ago are of no use to anyone: they go too.
    db
      .run(sql`delete from session where expires_at < ${new Date(Date.now() - 7 * 86_400_000).toISOString()}`)
      .then(() => purgeOldAudit(db))
      .then((n) => n && console.log(`History log: ${n} entr${n === 1 ? 'y' : 'ies'} older than ${AUDIT_KEEP_DAYS} days removed.`))
      .catch((e) => console.error('History log clean-up failed:', e));
  void run();
  setInterval(run, 3_600_000).unref();
}
