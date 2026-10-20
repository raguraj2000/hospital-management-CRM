import { and, asc, eq, gte, isNull, sql, type AnyColumn } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { CHECKOUT_LOOKBACK_DAYS, opToken } from '@platform/shared';
import { notFound, type Db, AppError } from '@platform/core';
import { billPayment, labOrder, medicine, opBill, opBillLine, opVisit, patient, prescriptionItem, user, visitCharge } from '../db/schema.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Today's date in India (IST = UTC+5:30, whatever time zone the server computer is set to), YYYY-MM-DD. */
export async function localToday(db: Pick<Db, 'get'>): Promise<string> {
  return (await db.get<{ d: string }>(sql`select date('now', '+330 minutes') as d`))!.d;
}

/**
 * The days a report covers (India dates, both ends included): ?from=2026-10-06&to=2026-10-09 for chosen dates,
 * else ?days=1|7|30|365 ending today. At most 366 days.
 */
export async function periodOf(db: Pick<Db, 'get'>, q: { days?: string; from?: string; to?: string }): Promise<{ from: string; to: string; days: number }> {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const today = await localToday(db);
  const real = (d: string | undefined): d is string => !!d && iso.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;
  if (real(q.from) && real(q.to)) {
    const [a, b] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from];
    const span = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;
    const days = Math.min(span, 366);
    const from = days === span ? a : new Date(Date.parse(`${b}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    return { from, to: b, days };
  }
  const days = Math.min(Math.max(Math.floor(Number(q.days) || 1), 1), 366);
  return { from: new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10), to: today, days };
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

/** Refuses (409) when the patient is deactivated: no new visit, medicine, lab test, charge or bill until they are activated again. */
export async function assertPatientActive(db: Db | Tx, branchId: number, patientId: number) {
  const [p] = await db.select({ at: patient.deactivatedAt, reason: patient.deactivatedReason }).from(patient).where(and(eq(patient.branchId, branchId), eq(patient.id, patientId)));
  if (p?.at) throw new AppError(409, 'patient_inactive', `This patient is deactivated${p.reason ? ` (${p.reason})` : ''}. A doctor or the admin must activate the patient first.`);
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
  // An extra charge added after the last bill was paid still has to be billed.
  const [charges] = await db.select({ n }).from(visitCharge).where(and(eq(visitCharge.branchId, branchId), eq(visitCharge.visitId, visitId), isNull(visitCharge.deletedAt), isNull(visitCharge.billId)));
  if (charges!.n) return false;
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
 * Today's patients are listed only once the doctor has sent them to the counter (or the visit is completed with
 * something still owed): while they wait, are with the doctor or at the lab, the counter does not see them yet --
 * except to pay the lab in advance: once a sample is taken, the bill part (fee, lab, charges) can be collected.
 * Their medicines wait until the doctor sends them out (labAdvance: medicines left out).
 * Order: yesterday and today first (day by day), then older days; within a day, sent by the doctor first, then token order.
 */
/**
 * ?q= on a list: every typed word found in the same column (any case, any order): "ravi 02" finds "Ravi Kumar 02",
 * not anyone whose OP number has a 02. Digits alone (3+) also match a phone written with spaces. Undefined when
 * nothing was typed. instr() instead of LIKE, so a typed % or _ is just a character.
 */
export function textSearch(q: string | undefined, cols: AnyColumn[], phone?: AnyColumn) {
  const typed = (q ?? '').trim().toLowerCase();
  const words = typed.split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return undefined;
  const inColumn = cols.map((c) => sql`(${sql.join(words.map((w) => sql`instr(lower(coalesce(${c}, '')), ${w}) > 0`), sql` and `)})`);
  const digits = typed.replace(/[\s+-]/g, '');
  if (phone && /^\d{3,}$/.test(digits)) inColumn.push(sql`instr(replace(coalesce(${phone}, ''), ' ', ''), ${digits}) > 0`);
  return sql`(${sql.join(inColumn, sql` or `)})`;
}

/** A completed visit is final: nothing on it changes any more (a new visit is made instead). Cancelled too. */
export function assertVisitOpen(status: string) {
  if (status === 'cancelled') throw new AppError(409, 'visit_cancelled', 'This visit was cancelled');
  if (status === 'completed') throw new AppError(409, 'visit_completed', 'This visit is completed: it can no longer be changed. Start a new visit for the patient.');
}

export async function visitsToCollect(db: Db, branchId: number, today: string) {
  // With the branch: the tables are indexed by (branch, visit), so each lookup is a seek, not a scan of the table.
  const ofVisit = <T extends { visitId: unknown; branchId: unknown }>(t: T) => sql`${t.branchId} = ${branchId} and ${t.visitId} = ${opVisit.id}`;
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
      patientPhone: patient.phone,
      doctorName: doctor.name,
      complaint: opVisit.complaint,
      visitAt: opVisit.createdAt,
      /** A course sitting's visit: the course's name, when it started and when this sitting was due. */
      courseName: sql<string | null>`(select c.name from course_sitting cs inner join treatment_course c on c.id = cs.course_id where cs.branch_id = ${branchId} and cs.visit_id = "op_visit"."id" limit 1)`,
      courseCreatedAt: sql<string | null>`(select coalesce(c.start_day || 'T00:00:00+05:30', (select min(x.due_at) from course_sitting x where x.course_id = c.id), c.created_at) from course_sitting cs inner join treatment_course c on c.id = cs.course_id where cs.branch_id = ${branchId} and cs.visit_id = "op_visit"."id" limit 1)`,
      sittingDueAt: sql<string | null>`(select cs.due_at from course_sitting cs where cs.branch_id = ${branchId} and cs.visit_id = "op_visit"."id" limit 1)`,
      /** The doctor's own fee for this visit; null = the branch's standard fee. */
      visitFeePaise: opVisit.consultationFeePaise,
      billCount: sql<number>`(select count(*) from ${opBill} where ${ofVisit(opBill)})`,
      /** Bills with no payment yet: the counter can still change them (round off). */
      openBillCount: sql<number>`(select count(*) from ${opBill} where ${ofVisit(opBill)} and not exists (select 1 from ${billPayment} where ${billPayment.billId} = ${opBill.id}))`,
      /** Bills with something to pay and no payment at all yet: fresh, for the counter's "To collect". */
      unpaidBillCount: sql<number>`(select count(*) from ${opBill} where ${ofVisit(opBill)} and ${opBill.totalPaise} > 0 and not exists (select 1 from ${billPayment} where ${billPayment.billId} = ${opBill.id}))`,
      balancePaise: sql<number>`(select coalesce(sum(${balance}), 0) from ${opBill} where ${ofVisit(opBill)})`,
      unbilledLabCount: sql<number>`(select count(*) from ${labOrder} where ${unbilledLab})`,
      unbilledLabPaise: sql<number>`(select coalesce(sum(${labOrder.pricePaise}), 0) from ${labOrder} where ${unbilledLab})`,
      /** Lab tests not on a bill whose sample is already taken: paid in advance while the doctor is not done. */
      sampledLabCount: sql<number>`(select count(*) from ${labOrder} where ${unbilledLab} and ${labOrder.status} in ('sample_collected', 'completed'))`,
      /** Extra charges (dressing, IV...) put on the visit that are on no bill yet. */
      waitingChargePaise: sql<number>`(select coalesce(sum(vc.amount_paise), 0) from visit_charge vc where vc.branch_id = ${branchId} and vc.visit_id = "op_visit"."id" and vc.deleted_at is null and vc.bill_id is null)`,
      waitingChargeCount: sql<number>`(select count(*) from visit_charge vc where vc.branch_id = ${branchId} and vc.visit_id = "op_visit"."id" and vc.deleted_at is null and vc.bill_id is null)`,
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
    // Day by day, oldest first: a visit made just after midnight (token 1 of the new day) follows last night's
    // patients instead of jumping ahead of them. Within a day: sent by the doctor first, then in token order.
    // Yesterday and today first, day by day (last night's patients before today's token 1); older days after them.
    // Within a day: sent by the doctor first, then in number order.
    .orderBy(sql`case when ${opVisit.visitDate} >= date(${today}, '-1 day') then 0 else 1 end`, asc(opVisit.visitDate), sql`case when ${opVisit.status} = 'at_counter' then 0 else 1 end`, asc(opVisit.id));
  const stillWithDoctor = (r: (typeof rows)[number]) => r.visitDate === today && (r.status === 'waiting' || r.status === 'with_doctor' || r.status === 'at_lab');
  return rows
    .map((r) => (stillWithDoctor(r) ? { ...r, labAdvance: r.sampledLabCount > 0, medicinesWaiting: 0, medicinesPaise: 0 } : { ...r, labAdvance: false }))
    // Something fresh to collect: nothing billed yet, a new test or charge, a bill with no payment yet, or medicines.
    // A bill already part paid (and nothing new) is a pending payment: it is in Billing > Pending payments, not here.
    .filter((r) => (!stillWithDoctor(r) || r.labAdvance) && (r.billCount === 0 || r.unbilledLabCount > 0 || r.waitingChargeCount > 0 || r.unpaidBillCount > 0 || r.medicinesWaiting > 0))
    .map(withToken);
}
