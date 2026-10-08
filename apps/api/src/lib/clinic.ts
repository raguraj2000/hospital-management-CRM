import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { CHECKOUT_LOOKBACK_DAYS, opToken } from '@platform/shared';
import { notFound, type Db } from '@platform/core';
import { billPayment, labOrder, medicine, opBill, opBillLine, opVisit, patient, prescriptionItem, user } from '../db/schema.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

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

const doctor = alias(user, 'doctor');

/**
 * A write that reads a balance and then takes money: it holds the database's write lock from the start, so two of
 * them never work from the same balance. When another write is in the way it waits a moment and tries again.
 */
export async function exclusively<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(fn, { behavior: 'immediate' });
    } catch (e) {
      const busy = /SQLITE_BUSY|database is locked/.test(`${(e as { code?: string }).code ?? ''} ${(e as Error).message ?? ''}`);
      if (!busy || attempt >= 20) throw e;
      await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
    }
  }
}

/**
 * Nothing is left for the counter to do on this visit: it has a bill, every lab test is on a bill and no
 * medicine is waiting. (A balance due is tracked on the bill, not by keeping the visit open.)
 */
export async function settledAtCounter(db: Db | Tx, branchId: number, visitId: number): Promise<boolean> {
  const n = sql<number>`count(*)`;
  const [bills] = await db.select({ n }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId)));
  if (!bills!.n) return false;
  const [labs] = await db
    .select({ n })
    .from(labOrder)
    .where(and(eq(labOrder.branchId, branchId), eq(labOrder.visitId, visitId), sql`${labOrder.status} <> 'cancelled'`, sql`${labOrder.id} not in (select ${opBillLine.labOrderId} from ${opBillLine} where ${opBillLine.labOrderId} is not null)`));
  if (labs!.n) return false;
  const [rx] = await db.select({ n }).from(prescriptionItem).where(and(eq(prescriptionItem.branchId, branchId), eq(prescriptionItem.visitId, visitId), eq(prescriptionItem.status, 'pending'), isNull(prescriptionItem.deletedAt)));
  return !rx!.n;
}

/** What the visit's bills still owe, in paise. */
export async function balanceDueOf(db: Db | Tx, branchId: number, visitId: number): Promise<number> {
  const paid = sql`(select coalesce(sum(${billPayment.amountPaise}), 0) from ${billPayment} where ${billPayment.billId} = ${opBill.id})`;
  const [r] = await db.select({ due: sql<number>`coalesce(sum(max(0, ${opBill.totalPaise} - ${paid})), 0)` }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId)));
  return r!.due;
}

/**
 * Visits with something still to collect at the counter -- the ONE definition behind Billing's "Visits to bill"
 * and the checkout queue: a visit (not cancelled, not deleted) that has no bill yet, or lab tests not on a bill,
 * or a bill with a balance due, or prescription lines still pending.
 * Earlier days stay listed until settled, but only CHECKOUT_LOOKBACK_DAYS back.
 * Order: sent to the counter by the doctor first (token order), then today's other visits, then older ones oldest first.
 */
export async function visitsToCollect(db: Db, branchId: number, today: string) {
  const ofVisit = <T extends { visitId: unknown }>(t: T) => sql`${t.visitId} = ${opVisit.id}`;
  const unbilledLab = sql`${ofVisit(labOrder)} and ${labOrder.status} <> 'cancelled' and ${labOrder.id} not in (select ${opBillLine.labOrderId} from ${opBillLine} where ${opBillLine.labOrderId} is not null)`;
  const pendingRx = sql`${ofVisit(prescriptionItem)} and ${prescriptionItem.status} = 'pending' and ${prescriptionItem.deletedAt} is null`;
  const balance = sql`max(0, ${opBill.totalPaise} - (select coalesce(sum(${billPayment.amountPaise}), 0) from ${billPayment} where ${billPayment.billId} = ${opBill.id}))`;
  const rows = await db
    .select({
      visitId: opVisit.id,
      opNo: opVisit.opNo,
      visitDate: opVisit.visitDate,
      status: sql<string>`${opVisit.status}`, // as stored: the list of statuses is not ours to know
      patientId: patient.id,
      patientName: patient.name,
      patientUhid: patient.uhid,
      doctorName: doctor.name,
      /** The doctor's own fee for this visit; null = the branch's standard fee. */
      visitFeePaise: opVisit.consultationFeePaise,
      billCount: sql<number>`(select count(*) from ${opBill} where ${ofVisit(opBill)})`,
      balancePaise: sql<number>`(select coalesce(sum(${balance}), 0) from ${opBill} where ${ofVisit(opBill)})`,
      unbilledLabCount: sql<number>`(select count(*) from ${labOrder} where ${unbilledLab})`,
      unbilledLabPaise: sql<number>`(select coalesce(sum(${labOrder.pricePaise}), 0) from ${labOrder} where ${unbilledLab})`,
      medicinesWaiting: sql<number>`(select count(*) from ${prescriptionItem} where ${pendingRx})`,
      medicinesPaise: sql<number>`(select coalesce(sum(${prescriptionItem.quantity} * ${medicine.pricePaise}), 0) from ${prescriptionItem} inner join ${medicine} on ${medicine.id} = ${prescriptionItem.medicineId} where ${pendingRx})`,
    })
    .from(opVisit)
    .innerJoin(patient, eq(patient.id, opVisit.patientId))
    .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
    .where(
      and(
        eq(opVisit.branchId, branchId),
        isNull(opVisit.deletedAt),
        sql`${opVisit.status} <> 'cancelled'`,
        gte(opVisit.visitDate, sql`date(${today}, ${`-${CHECKOUT_LOOKBACK_DAYS} days`})`),
      ),
    )
    .orderBy(sql`case when ${opVisit.status} = 'at_counter' then 0 when ${opVisit.visitDate} = ${today} then 1 else 2 end`, asc(opVisit.visitDate), asc(opVisit.id));
  return rows.filter((r) => r.billCount === 0 || r.unbilledLabCount > 0 || r.balancePaise > 0 || r.medicinesWaiting > 0).map(withToken);
}
