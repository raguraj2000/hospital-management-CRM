// Hospitals that did not pay: suspended at night, once their grace days are over (super admin panel, Plans & payments).
// Never during the day: a hospital is not locked out in the middle of an OP session. Marking paid does not
// switch a hospital back on by itself; the platform admin presses Activate.
import { and, eq, isNotNull } from 'drizzle-orm';
import { revokeUserSessions, writeAudit, type Db } from '@platform/core';
import { addDaysIso } from '@platform/shared';
import { organization, user } from '../db/schema.js';

const indiaNow = () => new Date(Date.now() + 330 * 60_000);

/** Suspends every active hospital whose paid period plus grace days is over. Only between 00:00 and 06:00 India time. */
export async function suspendOverdue(db: Db, now = indiaNow()): Promise<string[]> {
  if (now.getUTCHours() >= 6) return [];
  const today = now.toISOString().slice(0, 10);
  const billed = await db
    .select({ id: organization.id, name: organization.name, paidUntil: organization.paidUntil, graceDays: organization.graceDays })
    .from(organization)
    .where(and(eq(organization.isActive, true), isNotNull(organization.paidUntil)));
  const due = billed.filter((o) => addDaysIso(o.paidUntil!, o.graceDays + 1) <= today);
  for (const o of due) {
    await db.update(organization).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(organization.id, o.id));
    for (const u of await db.select({ id: user.id }).from(user).where(eq(user.organizationId, o.id))) await revokeUserSessions(db, u.id);
    await writeAudit(db, { organizationId: o.id, action: 'suspend_unpaid', entity: 'organization', entityId: o.id, detail: { paidUntil: o.paidUntil, graceDays: o.graceDays } });
  }
  return due.map((o) => o.name);
}

/** On start, then every hour (the same rhythm as the daily backup). */
export function keepPlansChecked(db: Db) {
  const run = () =>
    suspendOverdue(db)
      .then((names) => names.length && console.log(`Suspended for payment: ${names.join(', ')}`))
      .catch((e) => console.error('Plan check failed:', e));
  setTimeout(run, 45_000).unref();
  setInterval(run, 3_600_000).unref();
}
