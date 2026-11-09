// One checkout per visit: the counter (pharmacy or front desk) sees everything the visit owes --
// consultation + lab (the OP bill, BL-...) and medicines (a pharmacy sale, PH-...) -- takes ONE payment
// and prints ONE bill. The tables and numbering stay those of billing.ts and pharmacy.ts.
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  billCharges,
  checkoutSchema,
  formatRupees,
  type BillPaymentMode,
  type CheckoutBill,
  type CheckoutQueueEntry,
  type CheckoutResult,
  type OpBill,
  type VisitBillPrint,
  type VisitCheckout,
  ROUND_OFF_LINE,
  autoRoundOffPaise,
  DIRECT_BILL_COMPLAINT,
  DIRECT_LAB_COMPLAINT,
} from '@platform/shared';
import { AppError, forbidden, notFound, printHeaderOf, requireAnyPermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { branchMember, labOrder, opBill, opVisit, patient, pharmacySale, prescriptionItem, role, user } from '../db/schema.js';
import { sittingLabel } from './courses.js';
import { localToday, settledAtCounter, visitsToCollect, withToken, assertPatientActive } from '../lib/clinic.js';
import { billOf, consultationFee, createBill, pendingVisitCharges, visitFee, labPaymentState, payBill, unbilledLabOrders, updateBill } from './billing.js';
import { dispenseItems, prescriptionLines, saleDetail } from './pharmacy.js';
import { doctorsOf } from './doctors.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const doctor = alias(user, 'doctor');

/** A visit of this branch with its patient and doctor (not deleted), or 404. */
async function visitHeader(db: Db, branchId: number, visitId: number) {
  if (!Number.isInteger(visitId)) throw notFound('Visit not found');
  const [v] = await db
    .select({
      id: opVisit.id,
      opNo: opVisit.opNo,
      visitDate: opVisit.visitDate,
      status: sql<string>`${opVisit.status}`,
      pharmacyNote: opVisit.pharmacyNote,
      patientId: patient.id,
      patientName: patient.name,
      patientUhid: patient.uhid,
      patientPhone: patient.phone,
      doctorName: doctor.name,
    })
    .from(opVisit)
    .innerJoin(patient, eq(patient.id, opVisit.patientId))
    .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
    .where(and(eq(opVisit.branchId, branchId), eq(opVisit.id, visitId), isNull(opVisit.deletedAt)));
  if (!v) throw notFound('Visit not found');
  return withToken(v);
}

async function billsOfVisit(db: Db | Tx, branchId: number, visitId: number) {
  const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId))).orderBy(asc(opBill.id));
  const bills: OpBill[] = [];
  for (const r of ids) bills.push(await billOf(db, branchId, r.id));
  return bills;
}

/**
 * Where the visit's bill stands, by the rules of billing.ts: `open` = the bill with no payment yet (still editable);
 * `willCreate` = the checkout makes a new bill (the first one, or one for lab tests ordered after the last bill was paid).
 */
async function billState(db: Db | Tx, branchId: number, visitId: number) {
  const bills = await billsOfVisit(db, branchId, visitId);
  const open = bills.find((b) => b.editable) ?? null;
  const unbilled = await unbilledLabOrders(db, branchId, visitId);
  // Extra charges waiting on the visit (none once they are lines of the open bill).
  const waiting = open ? [] : await pendingVisitCharges(db, branchId, visitId);
  return { bills, open, unbilled, waiting, willCreate: !open && (bills.length === 0 || unbilled.length > 0 || waiting.length > 0) };
}

/** Today's patient still waiting, with the doctor or at the lab: the prescription is not finished (only a lab advance is paid). */
const doctorNotDone = (v: { status: string; visitDate: string }, today: string) => v.visitDate === today && (v.status === 'waiting' || v.status === 'with_doctor' || v.status === 'at_lab');
const pendingOf = (visitId: number) => and(eq(prescriptionItem.visitId, visitId), eq(prescriptionItem.status, 'pending'));

export function createCheckoutRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const counter = requireAnyPermission('billing.receive', 'pharmacy.sell');

  /** Everything the visit owes. Each part only if the caller may act on it (bill: billing.receive, medicines: pharmacy.sell). */
  app.get('/visits/:visitId/checkout', counter, async (c) => {
    const b = c.get('branch');
    const v = await visitHeader(db, b.id, Number(c.req.param('visitId')));

    let bill: CheckoutBill | null = null;
    if (b.permissions.includes('billing.receive')) {
      const { bills, open, unbilled, waiting, willCreate } = await billState(db, b.id, v.id);
      const editable = !!open || willCreate;
      // A later bill of the same visit carries no consultation fee.
      const fee = open ? open.consultationFeePaise : willCreate && bills.length === 0 ? (await visitFee(db, b.id, v.id)).consultationFeePaise : 0;
      const labLines = editable ? [...(open?.lines ?? []).filter((l) => l.labOrderId != null).map((l) => ({ description: l.description, amountPaise: l.amountPaise, billed: true })), ...unbilled.map((o) => ({ description: o.testName, amountPaise: o.pricePaise, billed: false }))] : [];
      // Before the first bill: the extra charges waiting on the visit (the bill takes them when it is made).
      const charges = open ? billCharges(open) : waiting.map((p) => ({ description: p.description, amountPaise: p.amountPaise }));
      const other = charges.reduce((s, x) => s + x.amountPaise, 0);
      const discount = open?.discountPaise ?? 0;
      const earlier = bills.filter((x) => x !== open);
      bill = {
        billId: open?.id ?? null,
        billNo: open?.billNo ?? null,
        editable,
        consultationFeePaise: fee,
        charges,
        discountPaise: discount,
        labLines,
        earlierBills: earlier.filter((x) => x.balancePaise > 0).map((x) => ({ id: x.id, billNo: x.billNo, totalPaise: x.totalPaise, paidPaise: x.paidPaise, balancePaise: x.balancePaise })),
        paidPaise: bills.reduce((s, x) => s + x.paidPaise, 0),
        duePaise: Math.max(0, fee + other + labLines.reduce((s, l) => s + l.amountPaise, 0) - discount) + earlier.reduce((s, x) => s + x.balancePaise, 0),
      };
    }

    // Still with the doctor (paying the lab in advance): the prescription is not finished, nothing is given out yet.
    const beforeCounter = doctorNotDone(v, await localToday(db));
    const medicines = b.permissions.includes('pharmacy.sell') ? { items: beforeCounter ? [] : await prescriptionLines(db, b.id, await localToday(db), pendingOf(v.id)), pharmacyNote: v.pharmacyNote } : null;
    const medicinesPaise = medicines?.items.reduce((s, i) => s + i.quantity * i.pricePaise, 0) ?? 0;
    const billDuePaise = bill?.duePaise ?? 0;
    const result: VisitCheckout = {
      visitId: v.id,
      opNo: v.opNo,
      token: v.token,
      visitDate: v.visitDate,
      status: v.status,
      patientId: v.patientId,
      patientName: v.patientName,
      patientUhid: v.patientUhid,
      doctorName: v.doctorName,
      bill,
      medicines,
      totals: { billDuePaise, medicinesPaise, grandTotalPaise: billDuePaise + medicinesPaise },
    };
    return c.json(result);
  });

  /**
   * One payment for the whole visit, in ONE transaction: bill what is not billed yet (with the fee edits),
   * dispense the ticked medicines (FEFO, all-or-nothing), then take the money -- medicines in full, the rest
   * on the bill (less than the total leaves a balance due on the bill). Any error changes nothing at all.
   * With only pharmacy.sell it is today's dispense; with only billing.receive it is create bill + payment.
   */
  app.post('/visits/:visitId/checkout', counter, async (c) => {
    const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const canBill = b.permissions.includes('billing.receive');
    const canSell = b.permissions.includes('pharmacy.sell');
    const { itemIds, quantities, paymentMode, amountPaise, roundOffPaise, ...edits } = parsed.data;
    const hasEdits = Object.keys(edits).length > 0;
    if (hasEdits && !canBill) throw forbidden('Your role cannot change or collect the bill');
    if (itemIds.length && !canSell) throw forbidden('Your role cannot dispense medicines');
    if (!canBill && !itemIds.length) throw new AppError(400, 'validation', 'Tick at least one medicine', { itemIds: ['Tick at least one medicine'] });

    const v = await visitHeader(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(409, 'visit_cancelled', 'This visit was cancelled');
    if (itemIds.length && doctorNotDone(v, await localToday(db))) throw new AppError(409, 'bad_state', 'The doctor is not done yet: medicines are given after the doctor sends the patient out');
    await assertPatientActive(db, b.id, v.patientId);
    const today = await localToday(db);
    const amountError = (msg: string) => new AppError(400, 'validation', msg, { amountPaise: [msg] });

    const done = await db.transaction(async (tx) => {
      // 1. The bill part: create it, or bring the unpaid bill up to date (new lab tests, fee edits).
      let billId: number | null = null;
      let bills: OpBill[] = [];
      if (canBill) {
        const { open, unbilled, willCreate } = await billState(tx, b.id, v.id);
        if (open) {
          if (hasEdits || unbilled.length) await updateBill(tx, b.id, u, open, edits);
          billId = open.id;
        } else if (willCreate) {
          billId = await createBill(tx, b.id, u, v, today);
          if (hasEdits) await updateBill(tx, b.id, u, await billOf(tx, b.id, billId), edits);
        } else if (hasEdits) {
          throw new AppError(409, 'has_payments', 'This bill has payments and can no longer be changed');
        }
        // Round off: the bill that is still open carries it as one line (replacing an earlier one).
        if (roundOffPaise != null && billId != null) {
          const now = await billOf(tx, b.id, billId);
          const had = billCharges(now).find((x) => x.description === ROUND_OFF_LINE)?.amountPaise ?? 0;
          if (now.editable && had !== roundOffPaise) {
            const rest = billCharges(now).filter((x) => x.description !== ROUND_OFF_LINE);
            await updateBill(tx, b.id, u, now, { charges: roundOffPaise > 0 ? [...rest, { description: ROUND_OFF_LINE, amountPaise: roundOffPaise }] : rest });
          }
        }
        bills = await billsOfVisit(tx, b.id, v.id);
      }
      const billDuePaise = bills.reduce((s, x) => s + x.balancePaise, 0);

      // 2. Medicines: the ticked lines are sold, the other pending ones are marked declined -- not while the
      // doctor is still writing them (a lab advance): they stay pending for the counter later.
      const beforeCounter = doctorNotDone(v, today);
      const sale = canSell && !beforeCounter ? await dispenseItems(tx, b.id, u, v, itemIds, paymentMode, today, quantities) : null;
      const medicinesPaise = sale?.totalPaise ?? 0;

      // 3. The money: medicines in full, the rest on the bill(s), oldest first.
      if (amountPaise < medicinesPaise) throw amountError(`Medicines (${formatRupees(medicinesPaise)}) must be paid in full`);
      if (amountPaise > billDuePaise + medicinesPaise) throw amountError(`Only ${formatRupees(billDuePaise + medicinesPaise)} is due`);
      let left = amountPaise - medicinesPaise;
      const paidBills: CheckoutResult['paidBills'] = [];
      for (const bill of bills) {
        const pay = Math.min(left, bill.balancePaise);
        if (pay <= 0) continue;
        await payBill(tx, b.id, u, bill, { amountPaise: pay, mode: paymentMode });
        paidBills.push({ id: bill.id, billNo: bill.billNo, amountPaise: pay });
        left -= pay;
      }

      // 4. The patient is done once everything is billed and nothing is left to dispense -- but only a patient the
      //    doctor sent to the counter. Money taken earlier (the fee at the front desk, before the doctor) leaves the
      //    patient where they are: still waiting, with the doctor or at the lab.
      let visitStatus = v.status;
      if (v.status === 'at_counter' && (await settledAtCounter(tx, b.id, v.id))) {
        visitStatus = 'completed';
        await tx.update(opVisit).set({ status: 'completed', updatedAt: new Date().toISOString() }).where(eq(opVisit.id, v.id));
        await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: v.id, detail: { status: 'completed', by: 'checkout' } });
      }
      return { billId: billId ?? bills.at(-1)?.id ?? null, paidBills, sale, medicinesPaise, visitStatus };
    });

    const bill = done.billId == null ? null : await billOf(db, b.id, done.billId);
    const lab = await labPaymentState(db, b.id, v.id);
    const [{ completed }] = await db.select({ completed: sql<number>`count(*)` }).from(labOrder).where(and(eq(labOrder.branchId, b.id), eq(labOrder.visitId, v.id), eq(labOrder.status, 'completed')));
    const result: CheckoutResult = {
      bill,
      paidBills: done.paidBills,
      sale: done.sale,
      totals: {
        receivedPaise: amountPaise,
        billPaidPaise: amountPaise - done.medicinesPaise,
        medicinesPaise: done.medicinesPaise,
        balancePaise: canBill ? (await billsOfVisit(db, b.id, v.id)).reduce((s, x) => s + x.balancePaise, 0) : null,
      },
      visitStatus: done.visitStatus,
      labReportReady: lab.printAllowed && completed > 0,
    };
    return c.json(result, 201);
  });

  /**
   * The counter's list: visits with something to collect (see visitsToCollect), each with a one-line summary.
   * A caller with only one of the two permissions gets only the visits and amounts of that part.
   */
  app.get('/checkout-queue', counter, async (c) => {
    const b = c.get('branch');
    const canBill = b.permissions.includes('billing.receive');
    const canSell = b.permissions.includes('pharmacy.sell');
    const today = await localToday(db);
    const fee = canBill ? await consultationFee(db, b.id) : 0;
    const queue: CheckoutQueueEntry[] = [];
    for (const v of await visitsToCollect(db, b.id, today)) {
      const medicinesWaiting = canSell ? v.medicinesWaiting : null;
      const medicinesPaise = canSell ? v.medicinesPaise : null;
      // Not billed yet: the fee, the extra charges waiting on the visit, and the lab tests.
      const toBillPaise = canBill ? (v.billCount === 0 ? (v.visitFeePaise ?? fee) : 0) + v.waitingChargePaise + v.unbilledLabPaise : null;
      const balancePaise = canBill ? v.balancePaise : null;
      // Fresh to collect only (a part-paid bill with nothing new waits in Pending payments).
      const billWaiting = canBill && (v.billCount === 0 || v.unbilledLabCount > 0 || v.waitingChargeCount > 0 || v.unpaidBillCount > 0);
      if (!billWaiting && !medicinesWaiting) continue; // nothing this caller can collect
      // With the round off the counter adds by itself (up to the next ₹5) when the bill can still carry it: the
      // amount on the closed card is the amount the pharmacist says to the patient.
      const beforeRound = (medicinesPaise ?? 0) + (toBillPaise ?? 0) + (balancePaise ?? 0);
      const roundable = canBill && (v.billCount === 0 || v.unbilledLabCount > 0 || v.waitingChargeCount > 0 || v.openBillCount > 0);
      const grandTotalPaise = beforeRound + (roundable ? autoRoundOffPaise(beforeRound) : 0);
      const summary = [
        v.labAdvance ? 'Lab advance: the doctor is not done yet' : null,
        medicinesWaiting ? `Medicines waiting ${medicinesWaiting}` : null,
        toBillPaise ? `Consultation + lab due ${formatRupees(toBillPaise)}` : null,
        balancePaise ? `Balance due ${formatRupees(balancePaise)}` : null,
        `Total ${formatRupees(grandTotalPaise)}`,
      ]
        .filter(Boolean)
        .join(' · ');
      const { visitId, opNo, token, visitDate, status, patientId, patientName, patientUhid, patientPhone, doctorName } = v;
      queue.push({ visitId, opNo, token, visitDate, visitAt: v.visitAt, direct: v.complaint === DIRECT_LAB_COMPLAINT ? 'lab' : v.complaint === DIRECT_BILL_COMPLAINT ? 'bill' : v.courseName ? 'course' : null, courseLabel: v.courseName && v.courseCreatedAt && v.sittingDueAt ? `${v.courseName} course · ${sittingLabel(v.courseCreatedAt, v.sittingDueAt)}` : null, labAdvance: v.labAdvance, status, patientId, patientName, patientUhid, patientPhone, doctorName, medicinesWaiting, medicinesPaise, toBillPaise, balancePaise, grandTotalPaise, summary });
    }
    // Who sent each visit to the counter: a doctor, or someone else (front desk, pharmacist) -- named, never assumed.
    const senders = await sentToCounterBy(db, b.id, queue.filter((e) => e.status === 'at_counter' && !e.direct).map((e) => e.visitId));
    for (const e of queue) e.sentBy = senders.get(e.visitId) ?? null;
    return c.json({ queue, today });
  });

  /**
   * One printed bill for the whole visit: its OP bills and its pharmacy sales, with the branch letterhead.
   * Gated like the data it shows: bills as on the visit page (billing.receive / patient.view), sales with pharmacy.sell.
   */
  app.get('/visits/:visitId/combined-bill', requireAnyPermission('billing.receive', 'patient.view', 'pharmacy.sell'), async (c) => {
    const b = c.get('branch');
    const v = await visitHeader(db, b.id, Number(c.req.param('visitId')));
    const bills = b.permissions.some((p) => p === 'billing.receive' || p === 'patient.view') ? await billsOfVisit(db, b.id, v.id) : null;
    let sales: VisitBillPrint['sales'] = null;
    if (b.permissions.includes('pharmacy.sell')) {
      const ids = await db.select({ id: pharmacySale.id }).from(pharmacySale).where(and(eq(pharmacySale.branchId, b.id), eq(pharmacySale.visitId, v.id))).orderBy(asc(pharmacySale.id));
      sales = [];
      for (const r of ids) sales.push(await saleDetail(db, b.id, r.id));
    }
    const paidByMode: Record<BillPaymentMode, number> = { cash: 0, upi: 0, card: 0 };
    for (const p of (bills ?? []).flatMap((x) => x.payments)) paidByMode[p.mode] += p.amountPaise;
    for (const s of sales ?? []) paidByMode[s.paymentMode] += s.totalPaise; // medicines are always paid in full
    const balancePaise = (bills ?? []).reduce((s, x) => s + x.balancePaise, 0);
    const paidPaise = paidByMode.cash + paidByMode.upi + paidByMode.card;
    const names = [...(bills ?? []).flatMap((x) => x.payments.map((p) => p.receivedByName)), ...(sales ?? []).map((s) => s.soldByName)];
    const result: VisitBillPrint = {
      visit: { id: v.id, opNo: v.opNo, token: v.token, visitDate: v.visitDate, status: v.status, doctorName: v.doctorName },
      patient: { id: v.patientId, name: v.patientName, uhid: v.patientUhid, phone: v.patientPhone },
      bills,
      sales,
      totals: { grandTotalPaise: (bills ?? []).reduce((s, x) => s + x.totalPaise, 0) + (sales ?? []).reduce((s, x) => s + x.totalPaise, 0), paidPaise, balancePaise, paidByMode },
      collectedBy: [...new Set(names.filter((n): n is string => !!n))],
      header: await printHeaderOf(db, b.id),
    };
    return c.json(result);
  });

  return app;
}

/**
 * The person who last sent each of these visits to the counter (from the history log, kept 30 days), and whether
 * they are a doctor of the branch. A visit not found there (older, or put there another way) is left out.
 */
async function sentToCounterBy(db: Db, branchId: number, visitIds: number[]): Promise<Map<number, NonNullable<CheckoutQueueEntry['sentBy']>>> {
  const out = new Map<number, NonNullable<CheckoutQueueEntry['sentBy']>>();
  if (!visitIds.length) return out;
  const ids = sql.join(visitIds.map((id) => sql`${String(id)}`), sql`, `);
  const rows = await db.all<{ visitId: string; userId: number | null }>(sql`
    select entity_id as visitId, user_id as userId, max(id) as last from audit_log
    where branch_id = ${branchId} and entity = 'op_visit' and action = 'update' and entity_id in (${ids})
      and json_extract(detail, '$.status') = 'at_counter'
    group by entity_id`);
  const doctors = new Set((await doctorsOf(db, branchId)).map((d) => d.userId));
  for (const r of rows) {
    if (r.userId == null) continue;
    const [u] = await db
      .select({ name: user.name, isOwner: user.isOwner, roleName: role.name })
      .from(user)
      .leftJoin(branchMember, and(eq(branchMember.userId, user.id), eq(branchMember.branchId, branchId)))
      .leftJoin(role, eq(role.id, branchMember.roleId))
      .where(eq(user.id, r.userId));
    if (u) out.set(Number(r.visitId), { name: u.name, doctor: doctors.has(r.userId), role: u.roleName ?? (u.isOwner ? 'Owner' : null) });
  }
  return out;
}
