// Patient billing: one OP bill per visit (consultation + lab tests + other - discount),
// part payments, daily collection, and the "lab report only after payment" rule.
import { and, asc, desc, eq, inArray, isNull, notInArray, sql, type AnyColumn } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  billingSettingsSchema,
  billPaymentSchema,
  billStatus,
  billUpdateSchema,
  labReleaseSchema,
  type BillListRow,
  type Collection,
  type OpBill,
  type PatientBills,
} from '@platform/shared';
import { AppError, nextNumber, notFound, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { billPayment, clinicSetting, labOrder, labRelease, labTest, opBill, opBillLine, opVisit, patient, pharmacySale, user, vendorPayment } from '../db/schema.js';
import { dayStamp, localToday, patientOfBranch, visitOfBranch, withToken } from '../lib/clinic.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const doctor = alias(user, 'doctor');

async function consultationFee(db: Db | Tx, branchId: number) {
  const [s] = await db.select({ fee: clinicSetting.consultationFeePaise }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  return s?.fee ?? 0;
}

async function paidOf(db: Db | Tx, billId: number) {
  const [r] = await db.select({ paid: sql<number>`coalesce(sum(${billPayment.amountPaise}), 0)` }).from(billPayment).where(eq(billPayment.billId, billId));
  return r!.paid;
}

/** total = consultation + other + lab lines - discount (never below 0). Stored on the bill. */
async function recomputeTotal(db: Db | Tx, billId: number) {
  const [b] = await db.select().from(opBill).where(eq(opBill.id, billId));
  const [l] = await db.select({ sum: sql<number>`coalesce(sum(${opBillLine.amountPaise}), 0)` }).from(opBillLine).where(eq(opBillLine.billId, billId));
  const total = Math.max(0, b!.consultationFeePaise + b!.otherChargesPaise + l!.sum - b!.discountPaise);
  await db.update(opBill).set({ totalPaise: total, updatedAt: new Date().toISOString() }).where(eq(opBill.id, billId));
  return total;
}

/** Lab orders of a visit that aren't cancelled and aren't on any bill yet. */
async function unbilledLabOrders(db: Db | Tx, branchId: number, visitId: number) {
  const billed = db.select({ id: opBillLine.labOrderId }).from(opBillLine).where(sql`${opBillLine.labOrderId} is not null`);
  return db
    .select({ id: labOrder.id, testName: labTest.name, pricePaise: labOrder.pricePaise })
    .from(labOrder)
    .innerJoin(labTest, eq(labTest.id, labOrder.testId))
    .where(and(eq(labOrder.branchId, branchId), eq(labOrder.visitId, visitId), sql`${labOrder.status} <> 'cancelled'`, notInArray(labOrder.id, billed)))
    .orderBy(asc(labOrder.id));
}

/**
 * Can this visit's lab report be printed? Yes when every (non-cancelled) lab test is on a
 * fully paid bill, or an admin released it.
 */
export async function labPaymentState(db: Db, branchId: number, visitId: number) {
  const [released] = await db.select({ id: labRelease.id, reason: labRelease.reason }).from(labRelease).where(and(eq(labRelease.branchId, branchId), eq(labRelease.visitId, visitId))).limit(1);
  const unbilled = await unbilledLabOrders(db, branchId, visitId);
  const billIds = (
    await db
      .selectDistinct({ id: opBillLine.billId })
      .from(opBillLine)
      .innerJoin(labOrder, eq(labOrder.id, opBillLine.labOrderId))
      .where(and(eq(opBillLine.branchId, branchId), eq(labOrder.visitId, visitId)))
  ).map((r) => r.id);
  let duePaise = unbilled.reduce((s, o) => s + o.pricePaise, 0);
  for (const id of billIds) {
    const [b] = await db.select({ total: opBill.totalPaise }).from(opBill).where(eq(opBill.id, id));
    duePaise += Math.max(0, b!.total - (await paidOf(db, id)));
  }
  return { paid: duePaise === 0, released: !!released, releaseReason: released?.reason ?? null, duePaise, printAllowed: duePaise === 0 || !!released };
}

/** When a lab test is cancelled: drop it from its bill if that bill has no payments yet. */
export async function onLabOrderCancel(db: Db | Tx, orderId: number) {
  const [line] = await db.select({ id: opBillLine.id, billId: opBillLine.billId }).from(opBillLine).where(eq(opBillLine.labOrderId, orderId));
  if (!line) return;
  if ((await paidOf(db, line.billId)) > 0) throw new AppError(409, 'billed', 'This test is on a bill that has payments; it can no longer be cancelled');
  await db.delete(opBillLine).where(eq(opBillLine.id, line.id));
  await recomputeTotal(db, line.billId);
}

export function createBillingRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const receive = requirePermission('billing.receive');

  async function billOf(branchId: number, id: number): Promise<OpBill> {
    if (!Number.isInteger(id)) throw notFound('Bill not found');
    const [b] = await db
      .select({
        id: opBill.id,
        billNo: opBill.billNo,
        visitId: opBill.visitId,
        opNo: opVisit.opNo,
        billDate: sql<string>`date(${opBill.createdAt}, 'localtime')`,
        patientId: patient.id,
        patientName: patient.name,
        patientUhid: patient.uhid,
        patientPhone: patient.phone,
        doctorName: doctor.name,
        consultationFeePaise: opBill.consultationFeePaise,
        otherChargesPaise: opBill.otherChargesPaise,
        otherChargesLabel: opBill.otherChargesLabel,
        discountPaise: opBill.discountPaise,
        totalPaise: opBill.totalPaise,
      })
      .from(opBill)
      .innerJoin(opVisit, eq(opVisit.id, opBill.visitId))
      .innerJoin(patient, eq(patient.id, opBill.patientId))
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(and(eq(opBill.branchId, branchId), eq(opBill.id, id)));
    if (!b) throw notFound('Bill not found');
    const lines = await db.select({ id: opBillLine.id, description: opBillLine.description, amountPaise: opBillLine.amountPaise, labOrderId: opBillLine.labOrderId }).from(opBillLine).where(eq(opBillLine.billId, id)).orderBy(asc(opBillLine.id));
    const payments = await db
      .select({ id: billPayment.id, amountPaise: billPayment.amountPaise, mode: billPayment.mode, receivedAt: billPayment.receivedAt, receivedByName: user.name })
      .from(billPayment)
      .leftJoin(user, eq(user.id, billPayment.receivedBy))
      .where(eq(billPayment.billId, id))
      .orderBy(asc(billPayment.id));
    const paidPaise = payments.reduce((s, p) => s + p.amountPaise, 0);
    return { ...withToken(b), lines, payments, paidPaise, balancePaise: Math.max(0, b.totalPaise - paidPaise), status: billStatus(b.totalPaise, paidPaise), editable: payments.length === 0 };
  }

  // ---------------------------------------------------------------- settings

  app.get('/billing/settings', requireAnyPermission('billing.receive', 'settings.manage'), async (c) => c.json({ consultationFeePaise: await consultationFee(db, c.get('branch').id) }));

  app.put('/billing/settings', requirePermission('settings.manage'), async (c) => {
    const parsed = billingSettingsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    await db
      .insert(clinicSetting)
      .values({ branchId: b.id, consultationFeePaise: parsed.data.consultationFeePaise })
      .onConflictDoUpdate({ target: clinicSetting.branchId, set: { consultationFeePaise: parsed.data.consultationFeePaise, updatedAt: new Date().toISOString() } });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'billing_settings', entityId: b.id, detail: parsed.data });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- bills of a visit

  app.get('/visits/:visitId/bills', requireAnyPermission('billing.receive', 'patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.visitId, v.id))).orderBy(asc(opBill.id));
    const bills = await Promise.all(ids.map((r) => billOf(b.id, r.id)));
    const unbilled = await unbilledLabOrders(db, b.id, v.id);
    return c.json({ bills, unbilledLab: unbilled, labPayment: await labPaymentState(db, b.id, v.id) });
  });

  /**
   * New bill for a visit: the first bill carries the consultation fee; later bills (for tests
   * ordered after the first bill was paid) carry only those new tests.
   */
  app.post('/visits/:visitId/bills', receive, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(400, 'visit_cancelled', 'This visit was cancelled');
    const existing = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.visitId, v.id)));
    const unbilled = await unbilledLabOrders(db, b.id, v.id);
    if (existing.length) {
      for (const e of existing) if ((await paidOf(db, e.id)) === 0) throw new AppError(409, 'open_bill', 'This visit already has an unpaid bill. Open it instead.');
      if (!unbilled.length) throw new AppError(409, 'nothing_to_bill', 'Everything on this visit is already billed');
    }
    const today = await localToday(db);
    const id = await db.transaction(async (tx) => {
      const n = await nextNumber(tx, b.id, `bill:${today}`);
      const [bill] = await tx
        .insert(opBill)
        .values({
          branchId: b.id,
          billNo: `BL-${dayStamp(today)}-${String(n).padStart(3, '0')}`,
          visitId: v.id,
          patientId: v.patientId,
          consultationFeePaise: existing.length ? 0 : await consultationFee(tx, b.id),
          createdBy: u.id,
        })
        .returning({ id: opBill.id });
      if (unbilled.length) await tx.insert(opBillLine).values(unbilled.map((o) => ({ branchId: b.id, billId: bill.id, labOrderId: o.id, description: o.testName, amountPaise: o.pricePaise })));
      await recomputeTotal(tx, bill.id);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'op_bill', entityId: bill.id, detail: { visitId: v.id } });
      return bill.id;
    });
    return c.json({ bill: await billOf(b.id, id) }, 201);
  });

  app.get('/bills/:id', requireAnyPermission('billing.receive', 'patient.view'), async (c) => c.json({ bill: await billOf(c.get('branch').id, Number(c.req.param('id'))) }));

  /** Change fees/discount; also pulls in lab tests ordered since. Only before the first payment. */
  app.patch('/bills/:id', receive, async (c) => {
    const parsed = billUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billOf(b.id, Number(c.req.param('id')));
    if (!bill.editable) throw new AppError(409, 'has_payments', 'This bill has payments and can no longer be changed');
    const subtotal =
      (parsed.data.consultationFeePaise ?? bill.consultationFeePaise) + (parsed.data.otherChargesPaise ?? bill.otherChargesPaise) + bill.lines.reduce((s, l) => s + l.amountPaise, 0);
    if ((parsed.data.discountPaise ?? bill.discountPaise) > subtotal) {
      throw new AppError(400, 'validation', 'Discount is more than the bill', { discountPaise: ['Discount is more than the bill'] });
    }
    await db.transaction(async (tx) => {
      // An empty body is allowed: it just pulls in newly ordered lab tests.
      if (Object.keys(parsed.data).length) await tx.update(opBill).set(parsed.data).where(eq(opBill.id, bill.id));
      const unbilled = await unbilledLabOrders(tx, b.id, bill.visitId);
      if (unbilled.length) await tx.insert(opBillLine).values(unbilled.map((o) => ({ branchId: b.id, billId: bill.id, labOrderId: o.id, description: o.testName, amountPaise: o.pricePaise })));
      await recomputeTotal(tx, bill.id);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_bill', entityId: bill.id, detail: parsed.data });
    });
    return c.json({ bill: await billOf(b.id, bill.id) });
  });

  app.post('/bills/:id/payments', receive, async (c) => {
    const parsed = billPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billOf(b.id, Number(c.req.param('id')));
    if (parsed.data.amountPaise > bill.balancePaise) {
      const msg = bill.balancePaise === 0 ? 'This bill is already fully paid' : `Only ₹${(bill.balancePaise / 100).toFixed(2)} is due`;
      throw new AppError(400, 'validation', msg, { amountPaise: [msg] });
    }
    await db.insert(billPayment).values({ ...parsed.data, branchId: b.id, billId: bill.id, receivedBy: u.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'payment', entity: 'op_bill', entityId: bill.id, detail: parsed.data });
    return c.json({ bill: await billOf(b.id, bill.id) }, 201);
  });

  // ---------------------------------------------------------------- bills of a patient

  /** Everything this patient was billed over all visits, newest first: OP bills + pharmacy sales. */
  app.get('/patients/:id/bills', requireAnyPermission('billing.receive', 'patient.view'), async (c) => {
    const b = c.get('branch');
    const p = await patientOfBranch(db, b.id, Number(c.req.param('id')));
    const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.patientId, p.id))).orderBy(desc(opBill.id));
    const bills = await Promise.all(ids.map((r) => billOf(b.id, r.id)));
    // OP bills are what a visit's bills already show to these roles. Pharmacy sales are only for the pharmacy counter, as everywhere else.
    const seesPharmacy = b.permissions.includes('pharmacy.sell');
    const pharmacy = seesPharmacy
      ? (
          await db
            .select({ id: pharmacySale.id, saleNo: pharmacySale.saleNo, createdAt: pharmacySale.createdAt, totalPaise: pharmacySale.totalPaise, paymentMode: pharmacySale.paymentMode, visitId: pharmacySale.visitId, opNo: opVisit.opNo })
            .from(pharmacySale)
            .leftJoin(opVisit, eq(opVisit.id, pharmacySale.visitId))
            .where(and(eq(pharmacySale.branchId, b.id), eq(pharmacySale.patientId, p.id)))
            .orderBy(desc(pharmacySale.id))
        ).map((s) => ({ ...s, direct: s.visitId == null }))
      : null;
    const sum = (f: (x: OpBill) => number) => bills.reduce((s, x) => s + f(x), 0);
    const result: PatientBills = {
      bills,
      pharmacy,
      summary: {
        billedPaise: sum((x) => x.totalPaise),
        paidPaise: sum((x) => x.paidPaise),
        balancePaise: sum((x) => x.balancePaise),
        pharmacyPaise: pharmacy ? pharmacy.reduce((s, x) => s + x.totalPaise, 0) : null,
      },
    };
    return c.json(result);
  });

  // ---------------------------------------------------------------- lists

  /** Bills (default: with a balance). ?status=all for every bill of a day (?date=). */
  app.get('/bills', receive, async (c) => {
    const b = c.get('branch');
    const status = c.req.query('status') ?? 'due';
    const date = c.req.query('date');
    const paid = db
      .select({ billId: billPayment.billId, paid: sql<number>`sum(${billPayment.amountPaise})`.as('paid') })
      .from(billPayment)
      .groupBy(billPayment.billId)
      .as('paid');
    const rows = await db
      .select({
        id: opBill.id,
        billNo: opBill.billNo,
        visitId: opBill.visitId,
        opNo: opVisit.opNo,
        patientName: patient.name,
        patientUhid: patient.uhid,
        totalPaise: opBill.totalPaise,
        paidPaise: sql<number>`coalesce(${paid.paid}, 0)`,
        createdAt: opBill.createdAt,
      })
      .from(opBill)
      .innerJoin(opVisit, eq(opVisit.id, opBill.visitId))
      .innerJoin(patient, eq(patient.id, opBill.patientId))
      .leftJoin(paid, eq(paid.billId, opBill.id))
      .where(
        and(
          eq(opBill.branchId, b.id),
          status === 'due' ? sql`coalesce(${paid.paid}, 0) < ${opBill.totalPaise}` : undefined,
          date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? sql`date(${opBill.createdAt}, 'localtime') = ${date}` : undefined,
        ),
      )
      .orderBy(desc(opBill.id))
      .limit(200);
    const bills: BillListRow[] = rows.map((r) => ({ ...withToken(r), status: billStatus(r.totalPaise, r.paidPaise) }));
    return c.json({ bills });
  });

  /** Today's visits with something not billed yet (no bill at all, or new lab tests). */
  app.get('/billing/to-bill', receive, async (c) => {
    const b = c.get('branch');
    const today = await localToday(db);
    const visits = await db
      .select({ visitId: opVisit.id, opNo: opVisit.opNo, status: opVisit.status, patientName: patient.name, patientUhid: patient.uhid, doctorName: doctor.name })
      .from(opVisit)
      .innerJoin(patient, eq(patient.id, opVisit.patientId))
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(and(eq(opVisit.branchId, b.id), isNull(opVisit.deletedAt), eq(opVisit.visitDate, today), sql`${opVisit.status} <> 'cancelled'`))
      .orderBy(asc(opVisit.id));
    const billed = new Set(
      visits.length
        ? (await db.selectDistinct({ visitId: opBill.visitId }).from(opBill).where(and(eq(opBill.branchId, b.id), inArray(opBill.visitId, visits.map((v) => v.visitId))))).map((r) => r.visitId)
        : [],
    );
    const result = [];
    for (const v of visits) {
      const lab = await unbilledLabOrders(db, b.id, v.visitId);
      if (!billed.has(v.visitId) || lab.length) result.push({ ...withToken(v), hasBill: billed.has(v.visitId), unbilledLabPaise: lab.reduce((s, o) => s + o.pricePaise, 0), unbilledLabCount: lab.length });
    }
    return c.json({ visits: result });
  });

  /** Money received on a day: OP bills + pharmacy, by mode; and paid out to vendors. */
  app.get('/billing/collection', receive, async (c) => {
    const b = c.get('branch');
    const date = c.req.query('date');
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : await localToday(db);
    const onDay = (col: AnyColumn) => sql`date(${col}, 'localtime') = ${day}`;
    const billRows = await db.select({ mode: billPayment.mode, sum: sql<number>`sum(${billPayment.amountPaise})` }).from(billPayment).where(and(eq(billPayment.branchId, b.id), onDay(billPayment.receivedAt))).groupBy(billPayment.mode);
    const phRows = await db.select({ mode: pharmacySale.paymentMode, sum: sql<number>`sum(${pharmacySale.totalPaise})` }).from(pharmacySale).where(and(eq(pharmacySale.branchId, b.id), onDay(pharmacySale.createdAt))).groupBy(pharmacySale.paymentMode);
    const [vendorOut] = await db.select({ sum: sql<number>`coalesce(sum(${vendorPayment.amountPaise}), 0)` }).from(vendorPayment).where(and(eq(vendorPayment.branchId, b.id), onDay(vendorPayment.paidAt)));
    const byMode = (rows: { mode: string; sum: number }[]) => ({ cash: 0, upi: 0, card: 0, ...Object.fromEntries(rows.map((r) => [r.mode, r.sum])) });
    const bills = byMode(billRows);
    const pharmacy = byMode(phRows);
    const total = [...Object.values(bills), ...Object.values(pharmacy)].reduce((s, x) => s + x, 0);
    const result: Collection = { date: day, bills, pharmacy, totalPaise: total, vendorPaidPaise: vendorOut!.sum };
    return c.json(result);
  });

  // ---------------------------------------------------------------- lab report release

  /** Owner/branch admin: allow printing the lab report before payment (reason is logged). */
  app.post('/visits/:visitId/lab-release', requirePermission('settings.manage'), async (c) => {
    const parsed = labReleaseSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    await db.insert(labRelease).values({ branchId: b.id, visitId: v.id, reason: parsed.data.reason, releasedBy: u.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'release', entity: 'lab_report', entityId: v.id, detail: parsed.data });
    return c.json({ ok: true });
  });

  return app;
}
