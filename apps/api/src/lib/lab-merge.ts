// One-time tidy-up, run at every start (it does nothing once done): the differential counts used to be a
// lab test of their own; they are now lines of the Complete Blood Count.
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { writeAudit, type Db } from '@platform/core';
import { branch, labTest, labTestParameter } from '../db/schema.js';

const CBC = 'complete blood count';
const BLOOD_SUGAR = 'blood sugar';
const RBS = 'Random Blood Sugar (RBS)';
const SUGAR_DONE = 'sugar_lines_optional';
const DIFFERENTIAL = 'differential counts';

/**
 * In every branch that still has both tests under their standard names: the differential lines are copied onto
 * the CBC (after its own lines) and the differential test is removed from the list. The old test's own lines are
 * left alone, so reports already made for it still print. Returns the number of branches changed.
 */
export async function mergeDifferentialIntoCbc(db: Db): Promise<number> {
  const live = (name: string) => and(isNull(labTest.deletedAt), eq(sql`lower(trim(${labTest.name}))`, name));
  const olds = await db.select({ id: labTest.id, branchId: labTest.branchId, organizationId: branch.organizationId }).from(labTest).innerJoin(branch, eq(branch.id, labTest.branchId)).where(live(DIFFERENTIAL));
  let changed = 0;
  for (const old of olds) {
    const [cbc] = await db.select({ id: labTest.id }).from(labTest).where(and(eq(labTest.branchId, old.branchId), live(CBC))).orderBy(asc(labTest.id)).limit(1);
    if (!cbc) continue; // a hospital with only the differential test keeps it
    const linesOf = (testId: number) =>
      db.select().from(labTestParameter).where(and(eq(labTestParameter.branchId, old.branchId), eq(labTestParameter.testId, testId), isNull(labTestParameter.deletedAt))).orderBy(asc(labTestParameter.sortOrder), asc(labTestParameter.id));
    const have = await linesOf(cbc.id);
    const names = new Set(have.map((p) => p.name.trim().toLowerCase()));
    const add = (await linesOf(old.id)).filter((p) => !names.has(p.name.trim().toLowerCase()));
    const after = have.reduce((m, p) => Math.max(m, p.sortOrder), -1);
    await db.transaction(async (tx) => {
      if (add.length) await tx.insert(labTestParameter).values(add.map(({ id: _id, ...p }, i) => ({ ...p, testId: cbc.id, sortOrder: after + 1 + i })));
      await tx.update(labTest).set({ deletedAt: new Date().toISOString() }).where(eq(labTest.id, old.id));
      await writeAudit(tx, { organizationId: old.organizationId, branchId: old.branchId, action: 'update', entity: 'lab_test', entityId: cbc.id, detail: { mergedFrom: old.id, linesAdded: add.map((p) => p.name) } });
    });
    changed++;
  }
  return changed;
}

/**
 * Every branch's "Blood Sugar" test, once: a Random Blood Sugar line is added if it has none, and all its lines
 * become optional (only one or two sugar readings are done on a visit). A note in the history log marks the test
 * as done, so a later choice of the hospital (a line set back to required) is not undone at the next start.
 * Returns the number of tests changed.
 */
export async function addRandomBloodSugar(db: Db): Promise<number> {
  const tests = await db
    .select({ id: labTest.id, branchId: labTest.branchId, organizationId: branch.organizationId })
    .from(labTest)
    .innerJoin(branch, eq(branch.id, labTest.branchId))
    .where(and(isNull(labTest.deletedAt), eq(sql`lower(trim(${labTest.name}))`, BLOOD_SUGAR)));
  let changed = 0;
  for (const t of tests) {
    const [done] = await db.all<{ id: number }>(sql`select id from audit_log where entity = 'lab_test' and entity_id = ${String(t.id)} and action = ${SUGAR_DONE} limit 1`);
    if (done) continue;
    const lines = await db.select().from(labTestParameter).where(and(eq(labTestParameter.branchId, t.branchId), eq(labTestParameter.testId, t.id), isNull(labTestParameter.deletedAt))).orderBy(asc(labTestParameter.sortOrder), asc(labTestParameter.id));
    if (!lines.length) continue;
    await db.transaction(async (tx) => {
      if (!lines.some((p) => /random/i.test(p.name))) {
        const like = lines.find((p) => /post|ppbs/i.test(p.name)) ?? lines[0]!;
        const { id: _id, ...copy } = like;
        // After the post-meal line: the lines behind it move down one.
        for (const p of lines.filter((x) => x.sortOrder > like.sortOrder)) await tx.update(labTestParameter).set({ sortOrder: p.sortOrder + 1 }).where(eq(labTestParameter.id, p.id));
        await tx.insert(labTestParameter).values({ ...copy, name: RBS, refRange: '70 - 140', sortOrder: like.sortOrder + 1 });
      }
      await tx.update(labTestParameter).set({ optional: true }).where(and(eq(labTestParameter.branchId, t.branchId), eq(labTestParameter.testId, t.id)));
      await writeAudit(tx, { organizationId: t.organizationId, branchId: t.branchId, action: SUGAR_DONE, entity: 'lab_test', entityId: t.id, detail: { randomBloodSugar: true, linesOptional: true } });
    });
    changed++;
  }
  return changed;
}
