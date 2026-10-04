import { and, eq, isNull, sql } from 'drizzle-orm';
import { opToken } from '@platform/shared';
import { notFound, type Db } from '@platform/core';
import { opVisit, patient } from '../db/schema.js';

/** Today's date on the server (the clinic PC's local time), YYYY-MM-DD. */
export async function localToday(db: Pick<Db, 'get'>): Promise<string> {
  return (await db.get<{ d: string }>(sql`select date('now', 'localtime') as d`))!.d;
}

/** "2026-10-02" -> "261002", used in OP / sale numbers. */
export const dayStamp = (day: string) => day.slice(2).replace(/-/g, '');

/** Adds the queue token to anything that carries an OP no. (the rule itself is opToken in shared). */
export const withToken = <T extends { opNo: string }>(v: T) => ({ ...v, token: opToken(v.opNo) });

/** An OP visit of this branch (not deleted), or 404. */
export async function visitOfBranch(db: Db, branchId: number, visitId: number) {
  if (!Number.isInteger(visitId)) throw notFound('Visit not found');
  const [v] = await db
    .select({ id: opVisit.id, patientId: opVisit.patientId, opNo: opVisit.opNo, status: opVisit.status })
    .from(opVisit)
    .where(and(eq(opVisit.branchId, branchId), eq(opVisit.id, visitId), isNull(opVisit.deletedAt)))
    .limit(1);
  if (!v) throw notFound('Visit not found');
  return v;
}

/** A patient of this branch (not deleted), or 404. */
export async function patientOfBranch(db: Db, branchId: number, patientId: number) {
  if (!Number.isInteger(patientId)) throw notFound('Patient not found');
  const [p] = await db
    .select({ id: patient.id })
    .from(patient)
    .where(and(eq(patient.branchId, branchId), eq(patient.id, patientId), isNull(patient.deletedAt)))
    .limit(1);
  if (!p) throw notFound('Patient not found');
  return p;
}
