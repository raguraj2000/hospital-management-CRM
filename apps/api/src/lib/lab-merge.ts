// One-time tidy-up, run at every start (it does nothing once done): the differential counts used to be a
// lab test of their own; they are now lines of the Complete Blood Count.
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { writeAudit, type Db } from '@platform/core';
import { DEFAULT_ROLES } from '@platform/shared';
import { branch, labTest, labTestParameter, organization, role, rolePermission } from '../db/schema.js';

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

/**
 * Hospitals set up before the "Visiting doctor" role existed get it once (a note in the history log marks it, so a
 * hospital that removes the role later does not get it back at the next start). Returns how many got it.
 */
/**
 * Every branch that has a "Blood Sugar" test gets, once, a test of its own for a single random reading:
 * "Random Blood Sugar", one required line, at the Blood Sugar test's price (the hospital sets its own price in
 * Lab > Tests & prices). A note in the history log marks the branch, so a test the hospital deletes stays deleted.
 * Returns the number of tests added.
 */
export const addRandomBloodSugarTest = (db: Db) => addSugarTestOfItsOwn(db, 'Random Blood Sugar', RBS, /random/i, 'random_blood_sugar_test', '70 - 140');
/** The same for HbA1c: a test of its own, from the HbA1c line of the Blood Sugar test. Only where that line exists. */
export const addHba1cTest = (db: Db) => addSugarTestOfItsOwn(db, 'HbA1c', null, /hba1c|glycosylated|glycated/i, 'hba1c_test', null);

async function addSugarTestOfItsOwn(db: Db, NAME: string, lineName: string | null, find: RegExp, marker: string, fallbackRange: string | null): Promise<number> {
  const sugars = await db
    .select({ test: labTest, organizationId: branch.organizationId })
    .from(labTest)
    .innerJoin(branch, eq(branch.id, labTest.branchId))
    .where(and(isNull(labTest.deletedAt), eq(sql`lower(trim(${labTest.name}))`, BLOOD_SUGAR)));
  let added = 0;
  for (const { test: sugar, organizationId } of sugars) {
    const [done] = await db.all<{ id: number }>(sql`select id from audit_log where branch_id = ${sugar.branchId} and entity = 'lab_test' and action = ${marker} limit 1`);
    if (done) continue;
    const [has] = await db.select({ id: labTest.id }).from(labTest).where(and(eq(labTest.branchId, sugar.branchId), isNull(labTest.deletedAt), eq(sql`lower(trim(${labTest.name}))`, NAME.toLowerCase())));
    const lines = await db.select().from(labTestParameter).where(and(eq(labTestParameter.branchId, sugar.branchId), eq(labTestParameter.testId, sugar.id), isNull(labTestParameter.deletedAt))).orderBy(asc(labTestParameter.sortOrder));
    // Random sugar is made from any sugar line when the test has no random line; HbA1c only from its own line.
    const like = lines.find((p) => find.test(p.name)) ?? (fallbackRange ? lines[0] : undefined);
    await db.transaction(async (tx) => {
      if (!has && like) {
        const { id: _t, name: _n, ...test } = sugar;
        const [row] = await tx.insert(labTest).values({ ...test, name: NAME, sortOrder: sugar.sortOrder + 1 }).returning({ id: labTest.id });
        const { id: _p, ...line } = like;
        await tx.insert(labTestParameter).values({ ...line, testId: row!.id, name: lineName ?? like.name, refRange: find.test(like.name) ? like.refRange : (fallbackRange ?? like.refRange), optional: false, sortOrder: 0 });
      }
      await writeAudit(tx, { organizationId, branchId: sugar.branchId, action: marker, entity: 'lab_test', detail: { added: !has && !!like } });
    });
    if (!has && like) added++;
  }
  return added;
}

/**
 * Hospitals set up before the reports permission existed: their Branch admin role gets it once (a note in the
 * history log marks it, so an owner who unticks it later keeps it unticked). Returns how many roles got it.
 */
export async function addReportsPermission(db: Db): Promise<number> {
  const orgs = await db.select({ id: organization.id }).from(organization);
  let added = 0;
  for (const org of orgs) {
    const [done] = await db.all<{ id: number }>(sql`select id from audit_log where organization_id = ${org.id} and entity = 'role' and action = 'permission_added_reports_view' limit 1`);
    if (done) continue;
    const [admin] = await db.select({ id: role.id }).from(role).where(and(eq(role.organizationId, org.id), eq(role.key, 'branch_admin')));
    const [has] = admin ? await db.select({ roleId: rolePermission.roleId }).from(rolePermission).where(and(eq(rolePermission.roleId, admin.id), eq(rolePermission.permission, 'reports.view'))) : [];
    await db.transaction(async (tx) => {
      if (admin && !has) await tx.insert(rolePermission).values({ roleId: admin.id, permission: 'reports.view' });
      await writeAudit(tx, { organizationId: org.id, action: 'permission_added_reports_view', entity: 'role', detail: { added: !!admin && !has } });
    });
    if (admin && !has) added++;
  }
  return added;
}

export async function addVisitingDoctorRole(db: Db): Promise<number> {
  const wanted = DEFAULT_ROLES.find((r) => r.key === 'visiting_doctor')!;
  const orgs = await db.select({ id: organization.id }).from(organization);
  let added = 0;
  for (const org of orgs) {
    const [done] = await db.all<{ id: number }>(sql`select id from audit_log where organization_id = ${org.id} and entity = 'role' and action = 'role_added_visiting_doctor' limit 1`);
    if (done) continue;
    const [has] = await db.select({ id: role.id }).from(role).where(and(eq(role.organizationId, org.id), eq(role.key, wanted.key)));
    await db.transaction(async (tx) => {
      if (!has) {
        const [row] = await tx.insert(role).values({ organizationId: org.id, key: wanted.key, name: wanted.name }).returning({ id: role.id });
        await tx.insert(rolePermission).values(wanted.permissions.map((permission) => ({ roleId: row!.id, permission })));
      }
      await writeAudit(tx, { organizationId: org.id, action: 'role_added_visiting_doctor', entity: 'role', detail: { added: !has } });
    });
    if (!has) added++;
  }
  return added;
}
