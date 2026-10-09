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
} from '@platform/shared';
import { AppError, forbidden, notFound, printHeaderOf, requireAnyPermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { labOrder, opBill, opVisit, patient, pharmacySale, prescriptionItem, user } from '../db/schema.js';
import { localToday, settledAtCounter, visitsToCollect, withToken } from '../lib/clinic.js';
import { billOf, consultationFee, createBill, visitFee, labPaymentState, payBill, unbilledLabOrders, updateBill } from './billing.js';
import { dispenseItems, prescriptionLines, saleDetail } from './pharmacy.js';

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
  return { bills, open, unbilled, willCreate: !open && (bills.length === 0 || unbilled.length > 0) };
}

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
      const { bills, open, unbilled, willCreate } = await billState(db, b.id, v.id);
      const editable = !!open || willCreate;
      // A later bill of the same visit carries no consultation fee.
      const fee = open ? open.consultationFeePaise : willCreate && bills.length === 0 ? (await visitFee(db, b.id, v.id)).consultationFeePaise : 0;
      const labLines = editable ? [...(open?.lines ?? []).filter((l) => l.labOrderId != null).map((l) => ({ description: l.description, amountPaise: l.amountPaise, billed: true })), ...unbilled.map((o) => ({ description: o.testName, amountPaise: o.pricePaise, billed: false }))] : [];
      const charges = open ? billCharges(open) : [];
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

    const medicines = b.permissions.includes('pharmacy.sell') ? { items: await prescriptionLines(db, b.id, await localToday(db), pendingOf(v.id)), pharmacyNote: v.pharmacyNote } : null;
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
    const { itemIds, quantities, paymentMode, amountPaise, ...edits } = parsed.data;
    const hasEdits = Object.keys(edits).length > 0;
    if (hasEdits && !canBill) throw forbidden('Your role cannot change or collect the bill');
    if (itemIds.length && !canSell) throw forbidden('Your role cannot dispense medicines');
    if (!canBill && !itemIds.length) throw new AppError(400, 'validation', 'Tick at least one medicine', { itemIds: ['Tick at least one medicine'] });

    const v = await visitHeader(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(400, 'visit_cancelled', 'This visit was cancelled');
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
        bills = await billsOfVisit(tx, b.id, v.id);
      }
      const billDuePaise = bills.reduce((s, x) => s + x.balancePaise, 0);

      // 2. Medicines: the ticked lines are sold, the other pending ones are marked declined.
      const sale = canSell ? await dispenseItems(tx, b.id, u, v, itemIds, paymentMode, today, quantities) : null;
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
      const toBillPaise = canBill ? (v.billCount === 0 ? (v.visitFeePaise ?? fee) : 0) + v.unbilledLabPaise : null;
      const balancePaise = canBill ? v.balancePaise : null;
      const billWaiting = canBill && (v.billCount === 0 || v.unbilledLabCount > 0 || v.balancePaise > 0);
      if (!billWaiting && !medicinesWaiting) continue; // nothing this caller can collect
      const grandTotalPaise = (medicinesPaise ?? 0) + (toBillPaise ?? 0) + (balancePaise ?? 0);
      const summary = [
        medicinesWaiting ? `Medicines waiting ${medicinesWaiting}` : null,
        toBillPaise ? `Consultation + lab due ${formatRupees(toBillPaise)}` : null,
        balancePaise ? `Balance due ${formatRupees(balancePaise)}` : null,
        `Total ${formatRupees(grandTotalPaise)}`,
      ]
        .filter(Boolean)
        .join(' · ');
      const { visitId, opNo, token, visitDate, status, patientId, patientName, patientUhid, doctorName } = v;
      queue.push({ visitId, opNo, token, visitDate, status, patientId, patientName, patientUhid, doctorName, medicinesWaiting, medicinesPaise, toBillPaise, balancePaise, grandTotalPaise, summary });
    }
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
