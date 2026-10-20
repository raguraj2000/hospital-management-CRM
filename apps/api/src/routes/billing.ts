// Patient billing: one OP bill per visit (consultation + lab tests + other - discount),
// part payments, daily collection, and the "lab report only after payment" rule.
import { and, asc, desc, eq, isNull, lte, ne, notInArray, sql, type AnyColumn } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import type { z } from 'zod';
import {
  billingSettingsSchema,
  billChargeSchema,
  billCharges,
  billPaymentSchema,
  billStatus,
  billUpdateSchema,
  labReleaseSchema,
  receiptNo,
  visitFeeSchema,
  type BillLine,
  type ChargePreset,
  type FeeSlot,
  DEFAULT_CHARGE_PRESETS,
  type VisitCharges,
  type BillListRow,
  type Collection,
  type DayReceipt,
  type DayReport,
  type OpBill,
  type PatientBills,
  type VisitFee,
  ROUND_OFF_LINE,
} from '@platform/shared';
import { AppError, nextNumber, notFound, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { billPayment, clinicSetting, labOrder, labRelease, labTest, opBill, opBillLine, opVisit, patient, pharmacySale, user, vendorPayment, visitCharge } from '../db/schema.js';
import { assertVisitOpen, dayStamp, exclusively, localToday, patientOfBranch, textSearch, visitOfBranch, visitsToCollect, withToken, assertPatientActive } from '../lib/clinic.js';
import { periodOf } from '../lib/clinic.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const doctor = alias(user, 'doctor');

export async function consultationFee(db: Db | Tx, branchId: number) {
  const [s] = await db.select({ fee: clinicSetting.consultationFeePaise }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  return s?.fee ?? 0;
}

/**
 * What a visit's consultation costs: the fee on its first bill once billed (the counter may have changed it there),
 * else the doctor's own fee for the visit, else the branch's standard fee.
 */
export async function visitFee(db: Db | Tx, branchId: number, visitId: number): Promise<VisitFee> {
  const standardFeePaise = await consultationFee(db, branchId);
  const [first] = await db.select({ id: opBill.id, fee: opBill.consultationFeePaise }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId))).orderBy(asc(opBill.id)).limit(1);
  if (first) return { consultationFeePaise: first.fee, standardFeePaise, locked: (await paidOf(db, first.id)) > 0 };
  const [v] = await db.select({ fee: opVisit.consultationFeePaise }).from(opVisit).where(and(eq(opVisit.branchId, branchId), eq(opVisit.id, visitId)));
  return { consultationFeePaise: v?.fee ?? standardFeePaise, standardFeePaise, locked: false };
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

/** Extra charges put on a visit (dressing, IV...) that are on no bill yet: the visit's first bill takes them. */
export async function pendingVisitCharges(db: Db | Tx, branchId: number, visitId: number) {
  return db
    .select({ id: visitCharge.id, description: visitCharge.description, amountPaise: visitCharge.amountPaise })
    .from(visitCharge)
    .where(and(eq(visitCharge.branchId, branchId), eq(visitCharge.visitId, visitId), isNull(visitCharge.deletedAt), isNull(visitCharge.billId)))
    .orderBy(asc(visitCharge.id));
}

/** Are the waiting numbers of the side menu switched on for this branch? (On unless switched off in Settings.) */
export async function navCountsOn(db: Db | Tx, branchId: number): Promise<boolean> {
  const [s] = await db.select({ on: clinicSetting.navCounts }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  return s?.on ?? true;
}

/** The branch's ready-made extra charges (Settings). */
/** The fee by time of day (Settings > Branch settings); [] = the standard fee all day. */
export async function feeSlots(db: Db | Tx, branchId: number): Promise<FeeSlot[]> {
  const [s] = await db.select({ json: clinicSetting.feeSlots }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  try {
    return s?.json ? (JSON.parse(s.json) as FeeSlot[]) : [];
  } catch {
    return [];
  }
}

export async function chargePresets(db: Db | Tx, branchId: number): Promise<ChargePreset[]> {
  const [s] = await db.select({ json: clinicSetting.chargePresets }).from(clinicSetting).where(eq(clinicSetting.branchId, branchId));
  try {
    // Never saved: the usual ones. Saved (even as an empty list): exactly what the branch saved.
    return s?.json != null ? (JSON.parse(s.json) as ChargePreset[]) : DEFAULT_CHARGE_PRESETS;
  } catch {
    return DEFAULT_CHARGE_PRESETS;
  }
}

/** Lab orders of a visit that aren't cancelled and aren't on any bill yet. */
export async function unbilledLabOrders(db: Db | Tx, branchId: number, visitId: number) {
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
export async function labPaymentState(db: Db | Tx, branchId: number, visitId: number) {
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

/** One OP bill of this branch with its lines and payments, or 404. */
export async function billOf(db: Db | Tx, branchId: number, id: number): Promise<OpBill> {
  if (!Number.isInteger(id)) throw notFound('Bill not found');
  const [b] = await db
    .select({
      id: opBill.id,
      billNo: opBill.billNo,
      visitId: opBill.visitId,
      opNo: opVisit.opNo,
      billDate: sql<string>`date(${opBill.createdAt}, '+330 minutes')`,
      createdAt: opBill.createdAt,
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

type Who = { id: number; organizationId: number };
const labLines = (branchId: number, billId: number, orders: { id: number; testName: string; pricePaise: number }[]) =>
  orders.map((o) => ({ branchId, billId, labOrderId: o.id, description: o.testName, amountPaise: o.pricePaise }));

/**
 * New bill for a visit: the first bill carries the consultation fee; later bills (for tests
 * ordered after the first bill was paid) carry only those new tests. Returns the bill id.
 */
export async function createBill(tx: Tx, branchId: number, u: Who, v: { id: number; patientId: number }, today: string) {
  const existing = await tx.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, v.id)));
  const unbilled = await unbilledLabOrders(tx, branchId, v.id);
  if (existing.length) {
    for (const e of existing) if ((await paidOf(tx, e.id)) === 0) throw new AppError(409, 'open_bill', 'This visit already has an unpaid bill. Open it instead.');
    if (!unbilled.length && !(await pendingVisitCharges(tx, branchId, v.id)).length) throw new AppError(409, 'nothing_to_bill', 'Everything on this visit is already billed');
  }
  const n = await nextNumber(tx, branchId, `bill:${today}`);
  const [bill] = await tx
    .insert(opBill)
    .values({
      branchId,
      billNo: `BL-${dayStamp(today)}-${String(n).padStart(3, '0')}`,
      visitId: v.id,
      patientId: v.patientId,
      consultationFeePaise: existing.length ? 0 : (await visitFee(tx, branchId, v.id)).consultationFeePaise,
      createdBy: u.id,
    })
    .returning({ id: opBill.id });
  if (unbilled.length) await tx.insert(opBillLine).values(labLines(branchId, bill.id, unbilled));
  // The extra charges put on the visit before it had a bill become lines of this one.
  const pending = await pendingVisitCharges(tx, branchId, v.id);
  if (pending.length) {
    await tx.insert(opBillLine).values(pending.map((p) => ({ branchId, billId: bill.id, labOrderId: null, description: p.description, amountPaise: p.amountPaise })));
    await tx.update(visitCharge).set({ billId: bill.id, updatedAt: new Date().toISOString() }).where(and(eq(visitCharge.branchId, branchId), eq(visitCharge.visitId, v.id), isNull(visitCharge.deletedAt), isNull(visitCharge.billId)));
  }
  await recomputeTotal(tx, bill.id);
  await writeAudit(tx, { organizationId: u.organizationId, branchId, userId: u.id, action: 'create', entity: 'op_bill', entityId: bill.id, detail: { visitId: v.id } });
  return bill.id;
}

/** Change fees/discount; also pulls in lab tests ordered since. Only before the first payment. */
/**
 * A charge for a visit, as POST /visits/:id/charges puts it: on the visit's unpaid bill when it has one (at most
 * 20 there), else waiting on the visit for its next bill. (Used by treatment courses too.)
 */
export async function addChargeToVisit(tx: Tx, branchId: number, u: Who, visitId: number, charge: { description: string; amountPaise: number }) {
  const ids = await tx.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId))).orderBy(asc(opBill.id));
  const bills = await Promise.all(ids.map((r) => billOf(tx, branchId, r.id)));
  const open = bills.find((x) => x.editable);
  if (open) {
    if (billCharges(open).length >= 20) throw new AppError(400, 'validation', 'At most 20 extra charges on a bill');
    await updateBill(tx, branchId, u, open, { charges: [...billCharges(open), charge] });
    return;
  }
  await tx.insert(visitCharge).values({ ...charge, branchId, visitId, createdBy: u.id });
}

export async function updateBill(tx: Tx, branchId: number, u: Who, bill: OpBill, data: z.infer<typeof billUpdateSchema>) {
  if (!bill.editable) throw new AppError(409, 'has_payments', 'This bill has payments and can no longer be changed');
  const unbilled = await unbilledLabOrders(tx, branchId, bill.visitId);
  // A list of charges replaces every extra charge the bill has, also the single "other charges" of older bills.
  const { charges, ...fields } = data;
  const set: typeof fields = charges ? { ...fields, otherChargesPaise: 0, otherChargesLabel: null } : fields;
  const lines: Pick<BillLine, 'amountPaise'>[] = [...bill.lines.filter((l) => !charges || l.labOrderId != null), ...(charges ?? []), ...unbilled.map((o) => ({ amountPaise: o.pricePaise }))];
  const subtotal = (set.consultationFeePaise ?? bill.consultationFeePaise) + (set.otherChargesPaise ?? bill.otherChargesPaise) + lines.reduce((s, l) => s + l.amountPaise, 0);
  if ((set.discountPaise ?? bill.discountPaise) > subtotal) {
    throw new AppError(400, 'validation', 'Discount is more than the bill', { discountPaise: ['Discount is more than the bill'] });
  }
  // An empty body is allowed: it just pulls in newly ordered lab tests.
  if (Object.keys(set).length) await tx.update(opBill).set(set).where(eq(opBill.id, bill.id));
  if (charges) {
    await tx.delete(opBillLine).where(and(eq(opBillLine.billId, bill.id), isNull(opBillLine.labOrderId)));
    if (charges.length) await tx.insert(opBillLine).values(charges.map((c) => ({ branchId, billId: bill.id, labOrderId: null, description: c.description, amountPaise: c.amountPaise })));
  }
  if (unbilled.length) await tx.insert(opBillLine).values(labLines(branchId, bill.id, unbilled));
  await recomputeTotal(tx, bill.id);
  await writeAudit(tx, { organizationId: u.organizationId, branchId, userId: u.id, action: 'update', entity: 'op_bill', entityId: bill.id, detail: data });
}

/** Take a payment on a bill: never more than its balance. */
export async function payBill(db: Db | Tx, branchId: number, u: Who, bill: OpBill, data: z.infer<typeof billPaymentSchema>) {
  if (data.amountPaise > bill.balancePaise) {
    const msg = bill.balancePaise === 0 ? 'This bill is already fully paid' : `Only ₹${(bill.balancePaise / 100).toFixed(2)} is due`;
    throw new AppError(400, 'validation', msg, { amountPaise: [msg] });
  }
  await db.insert(billPayment).values({ ...data, branchId, billId: bill.id, receivedBy: u.id });
  await writeAudit(db, { organizationId: u.organizationId, branchId, userId: u.id, action: 'payment', entity: 'op_bill', entityId: bill.id, detail: data });
}

export function createBillingRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const receive = requirePermission('billing.receive');
  const billOfBranch = (branchId: number, id: number) => billOf(db, branchId, id);

  // ---------------------------------------------------------------- settings

  app.get('/billing/settings', requireAnyPermission('billing.receive', 'settings.manage'), async (c) => c.json({ consultationFeePaise: await consultationFee(db, c.get('branch').id), feeSlots: await feeSlots(db, c.get('branch').id), chargePresets: await chargePresets(db, c.get('branch').id), navCounts: await navCountsOn(db, c.get('branch').id) }));

  app.put('/billing/settings', requirePermission('settings.manage'), async (c) => {
    const parsed = billingSettingsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    // Not sent = the list stays as it is.
    const presets = parsed.data.chargePresets === undefined ? undefined : JSON.stringify(parsed.data.chargePresets);
    const slots = parsed.data.feeSlots === undefined ? undefined : JSON.stringify(parsed.data.feeSlots);
    await db
      .insert(clinicSetting)
      .values({ branchId: b.id, consultationFeePaise: parsed.data.consultationFeePaise, chargePresets: presets, feeSlots: slots, ...(parsed.data.navCounts === undefined ? {} : { navCounts: parsed.data.navCounts }) })
      .onConflictDoUpdate({ target: clinicSetting.branchId, set: { consultationFeePaise: parsed.data.consultationFeePaise, ...(presets === undefined ? {} : { chargePresets: presets }), ...(slots === undefined ? {} : { feeSlots: slots }), ...(parsed.data.navCounts === undefined ? {} : { navCounts: parsed.data.navCounts }), updatedAt: new Date().toISOString() } });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'billing_settings', entityId: b.id, detail: parsed.data });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- bills of a visit

  app.get('/visits/:visitId/bills', requireAnyPermission('billing.receive', 'patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.visitId, v.id))).orderBy(asc(opBill.id));
    const bills = await Promise.all(ids.map((r) => billOfBranch(b.id, r.id)));
    const unbilled = await unbilledLabOrders(db, b.id, v.id);
    return c.json({ bills, unbilledLab: unbilled, labPayment: await labPaymentState(db, b.id, v.id) });
  });

  // ---------------------------------------------------------------- extra charges of a visit (dressing, IV...)
  // The doctor adds them while seeing the patient, the counter while collecting. Before the visit has a bill they
  // wait on the visit; once it has an unpaid bill they are lines of that bill. Added after the bill was paid, they
  // wait again and the counter collects them on a new bill.

  const chargeWriters = requireAnyPermission('prescription.write', 'billing.receive');

  /** The note the pharmacy counter reads for this visit. The doctor (who prescribes) and whoever manages the branch (branch admin, owner) write or correct it; the counter only reads it. */
  app.put('/visits/:visitId/pharmacy-note', requireAnyPermission('prescription.write', 'settings.manage'), async (c) => {
    const body = (await c.req.json().catch(() => null)) as { note?: unknown } | null;
    const note = typeof body?.note === 'string' ? body.note.trim() : null;
    if (note == null || note.length > 500) throw new AppError(400, 'validation', 'The note can be up to 500 letters', { note: ['The note can be up to 500 letters'] });
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    await db.update(opVisit).set({ pharmacyNote: note || null, updatedAt: new Date().toISOString() }).where(and(eq(opVisit.branchId, b.id), eq(opVisit.id, v.id)));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: v.id, detail: { pharmacyNote: note } });
    return c.json({ pharmacyNote: note || null });
  });

  async function chargesOfVisit(branchId: number, visitId: number): Promise<VisitCharges & { open: OpBill | null }> {
    const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, branchId), eq(opBill.visitId, visitId))).orderBy(asc(opBill.id));
    const bills = await Promise.all(ids.map((r) => billOfBranch(branchId, r.id)));
    const open = bills.find((x) => x.editable) ?? null;
    const presets = await chargePresets(db, branchId);
    // A completed visit is final: its charges are shown, not changed.
    const [vs] = await db.select({ status: opVisit.status }).from(opVisit).where(eq(opVisit.id, visitId));
    const locked = vs?.status === 'completed' ? 'This visit is completed: its charges can no longer change.' : null;
    if (open) return { open, presets, locked, charges: billCharges(open).map((x, i) => ({ ...x, key: `b${i}`, pending: false })) };
    return { open, presets, locked, charges: (await pendingVisitCharges(db, branchId, visitId)).map((p) => ({ description: p.description, amountPaise: p.amountPaise, key: `v${p.id}`, pending: true })) };
  }

  /** The ready-made charges alone (course templates pick from them; no visit needed). */
  app.get('/charge-presets', requireAnyPermission('prescription.write', 'billing.receive', 'settings.manage'), async (c) => c.json({ presets: await chargePresets(db, c.get('branch').id) }));

  app.get('/visits/:visitId/charges', requireAnyPermission('prescription.write', 'billing.receive', 'patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const { open: _open, ...result } = await chargesOfVisit(b.id, v.id);
    return c.json(result);
  });

  app.post('/visits/:visitId/charges', chargeWriters, async (c) => {
    const parsed = billChargeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    await assertPatientActive(db, b.id, v.patientId);
    const now = await chargesOfVisit(b.id, v.id);
    if (now.locked) throw new AppError(409, 'has_payments', now.locked);
    if (now.charges.length >= 20) throw new AppError(400, 'validation', 'At most 20 extra charges on a bill');
    if (now.open) {
      const open = now.open;
      await db.transaction((tx) => updateBill(tx, b.id, u, open, { charges: [...billCharges(open), parsed.data] }));
    } else {
      const [row] = await db.insert(visitCharge).values({ ...parsed.data, branchId: b.id, visitId: v.id, createdBy: u.id }).returning({ id: visitCharge.id });
      await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'visit_charge', entityId: row!.id, detail: { visitId: v.id, ...parsed.data } });
    }
    const { open: _open, ...result } = await chargesOfVisit(b.id, v.id);
    return c.json(result, 201);
  });

  /** Change the name or the amount of a charge already on the visit (or on its unpaid bill). */
  app.put('/visits/:visitId/charges/:key', chargeWriters, async (c) => {
    const parsed = billChargeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    const now = await chargesOfVisit(b.id, v.id);
    if (now.locked) throw new AppError(409, 'has_payments', now.locked);
    const key = c.req.param('key');
    const at = now.charges.findIndex((x) => x.key === key);
    if (at < 0) throw notFound('Charge not found');
    if (now.open) {
      const open = now.open;
      await db.transaction((tx) => updateBill(tx, b.id, u, open, { charges: billCharges(open).map((x, i) => (i === at ? parsed.data : x)) }));
    } else {
      const id = Number(key.slice(1));
      await db.update(visitCharge).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(and(eq(visitCharge.branchId, b.id), eq(visitCharge.visitId, v.id), eq(visitCharge.id, id)));
      await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'visit_charge', entityId: id, detail: { visitId: v.id, ...parsed.data } });
    }
    const { open: _open, ...result } = await chargesOfVisit(b.id, v.id);
    return c.json(result);
  });

  app.delete('/visits/:visitId/charges/:key', chargeWriters, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    const now = await chargesOfVisit(b.id, v.id);
    if (now.locked) throw new AppError(409, 'has_payments', now.locked);
    const key = c.req.param('key');
    const at = now.charges.findIndex((x) => x.key === key);
    if (at < 0) throw notFound('Charge not found');
    if (now.open) {
      const open = now.open;
      await db.transaction((tx) => updateBill(tx, b.id, u, open, { charges: billCharges(open).filter((_x, i) => i !== at) }));
    } else {
      const id = Number(key.slice(1));
      await db.update(visitCharge).set({ deletedAt: new Date().toISOString() }).where(and(eq(visitCharge.branchId, b.id), eq(visitCharge.visitId, v.id), eq(visitCharge.id, id)));
      await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'visit_charge', entityId: id, detail: { visitId: v.id } });
    }
    const { open: _open, ...result } = await chargesOfVisit(b.id, v.id);
    return c.json(result);
  });

  /**
   * New bill for a visit: the first bill carries the consultation fee; later bills (for tests
   * ordered after the first bill was paid) carry only those new tests.
   */
  app.post('/visits/:visitId/bills', receive, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(409, 'visit_cancelled', 'This visit was cancelled');
    await assertPatientActive(db, b.id, v.patientId);
    const today = await localToday(db);
    const id = await db.transaction((tx) => createBill(tx, b.id, u, v, today));
    return c.json({ bill: await billOfBranch(b.id, id) }, 201);
  });

  /**
   * The fee for this one visit (null = back to the standard fee). The doctor sets it while seeing the patient;
   * the counter can too. Refused once a payment was taken on the bill that carries the fee.
   */
  app.put('/visits/:visitId/consultation-fee', requireAnyPermission('prescription.write', 'billing.receive'), async (c) => {
    const parsed = visitFeeSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    assertVisitOpen(v.status);
    const fee = parsed.data.consultationFeePaise;
    await db.transaction(async (tx) => {
      const now = await visitFee(tx, b.id, v.id);
      if (now.locked) throw new AppError(409, 'has_payments', 'A payment was already taken on this bill; the fee can no longer be changed');
      await tx.update(opVisit).set({ consultationFeePaise: fee, updatedAt: new Date().toISOString() }).where(eq(opVisit.id, v.id));
      // Already billed (not paid): the bill follows.
      const [first] = await tx.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.visitId, v.id))).orderBy(asc(opBill.id)).limit(1);
      if (first) await updateBill(tx, b.id, u, await billOf(tx, b.id, first.id), { consultationFeePaise: fee ?? now.standardFeePaise });
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'op_visit', entityId: v.id, detail: { consultationFeePaise: fee } });
    });
    return c.json({ fee: await visitFee(db, b.id, v.id) });
  });

  app.get('/bills/:id', requireAnyPermission('billing.receive', 'patient.view'), async (c) => c.json({ bill: await billOfBranch(c.get('branch').id, Number(c.req.param('id'))) }));

  /** Change fees/discount; also pulls in lab tests ordered since. Only before the first payment. */
  app.patch('/bills/:id', receive, async (c) => {
    const parsed = billUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billOfBranch(b.id, Number(c.req.param('id')));
    await db.transaction((tx) => updateBill(tx, b.id, u, bill, parsed.data));
    return c.json({ bill: await billOfBranch(b.id, bill.id) });
  });

  app.post('/bills/:id/payments', receive, async (c) => {
    const parsed = billPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billOfBranch(b.id, Number(c.req.param('id')));
    // The balance is read again inside the transaction: two payments at the same moment can't take more than is due.
    await exclusively(db, async (tx) => payBill(tx, b.id, u, await billOf(tx, b.id, bill.id), parsed.data));
    return c.json({ bill: await billOfBranch(b.id, bill.id) }, 201);
  });

  /**
   * A patient pays what they owe on several bills at once (the balance left from earlier visits): the amount goes
   * to the oldest bill first. Less than the total = the rest stays due on the newer bills.
   */
  app.post('/patients/:id/pay-dues', receive, async (c) => {
    const parsed = billPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const p = await patientOfBranch(db, b.id, Number(c.req.param('id')));
    const paid = await exclusively(db, async (tx) => {
      const ids = await tx.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.patientId, p.id))).orderBy(asc(opBill.id));
      const owing = (await Promise.all(ids.map((r) => billOf(tx, b.id, r.id)))).filter((x) => x.balancePaise > 0);
      const due = owing.reduce((s, x) => s + x.balancePaise, 0);
      if (parsed.data.amountPaise > due) {
        const msg = due === 0 ? 'Nothing is due' : `Only ₹${(due / 100).toFixed(2)} is due`;
        throw new AppError(400, 'validation', msg, { amountPaise: [msg] });
      }
      let left = parsed.data.amountPaise;
      const done: { billNo: string; amountPaise: number }[] = [];
      for (const bill of owing) {
        const pay = Math.min(left, bill.balancePaise);
        if (pay <= 0) break;
        await payBill(tx, b.id, u, bill, { ...parsed.data, amountPaise: pay });
        done.push({ billNo: bill.billNo, amountPaise: pay });
        left -= pay;
      }
      return { bills: done, leftDuePaise: due - parsed.data.amountPaise };
    });
    return c.json(paid, 201);
  });

  // ---------------------------------------------------------------- bills of a patient

  /** Everything this patient was billed over all visits, newest first: OP bills + pharmacy sales. */
  app.get('/patients/:id/bills', requireAnyPermission('billing.receive', 'patient.view'), async (c) => {
    const b = c.get('branch');
    const p = await patientOfBranch(db, b.id, Number(c.req.param('id')));
    const ids = await db.select({ id: opBill.id }).from(opBill).where(and(eq(opBill.branchId, b.id), eq(opBill.patientId, p.id))).orderBy(desc(opBill.id));
    const bills = await Promise.all(ids.map((r) => billOfBranch(b.id, r.id)));
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

  /** Bills (default: with a balance). ?status=all for every bill of a day (?date=). ?status=paid: the fully paid bills of a day (default today). */
  app.get('/bills', receive, async (c) => {
    const b = c.get('branch');
    const status = c.req.query('status') ?? 'due';
    const asked = c.req.query('date');
    // ?q=: a name, phone, UHID, bill or OP no. -- then every day (newest 200), not one day.
    const q = c.req.query('q');
    const found = textSearch(q, [patient.name, patient.uhid, opBill.billNo, opVisit.opNo], patient.phone);
    const date = found ? undefined : status === 'paid' && !(asked && /^\d{4}-\d{2}-\d{2}$/.test(asked)) ? await localToday(db) : asked;
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
        patientPhone: patient.phone,
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
          status === 'due' ? sql`coalesce(${paid.paid}, 0) < ${opBill.totalPaise}` : status === 'paid' ? sql`coalesce(${paid.paid}, 0) >= ${opBill.totalPaise}` : undefined,
          date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? sql`date(${opBill.createdAt}, '+330 minutes') = ${date}` : undefined,
          found,
        ),
      )
      .orderBy(desc(opBill.id))
      .limit(200);
    const bills: BillListRow[] = rows.map((r) => ({ ...withToken(r), status: billStatus(r.totalPaise, r.paidPaise) }));
    return c.json({ bills, date: date ?? null });
  });

  /**
   * Visits with something not billed yet (no bill at all, or new lab tests): today's and earlier days'
   * (see visitsToCollect for the look-back), so an unbilled night visit does not drop off after midnight.
   */
  app.get('/billing/to-bill', receive, async (c) => {
    const b = c.get('branch');
    const today = await localToday(db);
    const visits = (await visitsToCollect(db, b.id, today))
      .filter((v) => v.billCount === 0 || v.unbilledLabCount > 0)
      .map(({ visitId, opNo, token, visitDate, status, patientName, patientUhid, doctorName, billCount, unbilledLabPaise, unbilledLabCount }) => ({ visitId, opNo, token, visitDate, status, patientName, patientUhid, doctorName, hasBill: billCount > 0, unbilledLabPaise, unbilledLabCount }));
    return c.json({ visits, today });
  });

  /** Money received on a day: OP bills + pharmacy, by mode; and paid out to vendors. */
  async function collectionOf(branchId: number, day: string): Promise<Collection> {
    const b = { id: branchId };
    const onDay = (col: AnyColumn) => sql`date(${col}, '+330 minutes') = ${day}`;
    const billRows = await db.select({ mode: billPayment.mode, sum: sql<number>`sum(${billPayment.amountPaise})` }).from(billPayment).where(and(eq(billPayment.branchId, b.id), onDay(billPayment.receivedAt))).groupBy(billPayment.mode);
    const phRows = await db.select({ mode: pharmacySale.paymentMode, sum: sql<number>`sum(${pharmacySale.totalPaise})` }).from(pharmacySale).where(and(eq(pharmacySale.branchId, b.id), onDay(pharmacySale.createdAt))).groupBy(pharmacySale.paymentMode);
    const [vendorOut] = await db.select({ sum: sql<number>`coalesce(sum(${vendorPayment.amountPaise}), 0)` }).from(vendorPayment).where(and(eq(vendorPayment.branchId, b.id), onDay(vendorPayment.paidAt)));
    const byMode = (rows: { mode: string; sum: number }[]) => ({ cash: 0, upi: 0, card: 0, ...Object.fromEntries(rows.map((r) => [r.mode, r.sum])) });
    const bills = byMode(billRows);
    const pharmacy = byMode(phRows);
    const total = [...Object.values(bills), ...Object.values(pharmacy)].reduce((s, x) => s + x, 0);
    return { date: day, bills, pharmacy, totalPaise: total, vendorPaidPaise: vendorOut!.sum };
  }
  const dayOf = async (date: string | undefined) => (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : await localToday(db));

  app.get('/billing/collection', receive, async (c) => c.json(await collectionOf(c.get('branch').id, await dayOf(c.req.query('date')))));

  /**
   * Money over a period (?days=1, 7, 30 or 365, ending today): what was received and how, what it was for
   * (consultation, lab, other charges, medicines through OP visits, medicines sold directly), what is still due,
   * what was spent, and each doctor's patients and amounts.
   * With billing.receive or settings.manage: everything. A doctor without them: only their own line.
   */
  app.get('/reports/period', requireAnyPermission('reports.view', 'prescription.write'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    // The whole report needs reports.view; a doctor without it sees only their own line.
    const all = b.permissions.includes('reports.view');
    const { from, to, days } = await periodOf(db, c.req.query());
    const inRange = (col: string) => sql.raw(`date(${col}, '+330 minutes') between '${from}' and '${to}'`);
    const one = async <T,>(q: ReturnType<typeof sql>) => (await db.all<T>(q))[0]!;

    // Each doctor: visits (not cancelled) in the period, and what was billed and sold on those visits' bills in the period.
    const doctorRows = await db.all<{ doctorUserId: number | null; doctorName: string | null; patients: number; consultationPaise: number; labPaise: number; otherPaise: number; discountPaise: number; medicinesPaise: number }>(sql`
      select v.doctor_user_id as doctorUserId, d.name as doctorName, count(*) as patients,
        coalesce(sum((select sum(ob.consultation_fee_paise) from op_bill ob where ob.branch_id = ${b.id} and ob.visit_id = v.id and ${inRange('ob.created_at')})), 0) as consultationPaise,
        coalesce(sum((select sum(l.amount_paise) from op_bill_line l inner join op_bill ob on ob.id = l.bill_id where ob.branch_id = ${b.id} and ob.visit_id = v.id and l.lab_order_id is not null and ${inRange('ob.created_at')})), 0) as labPaise,
        coalesce(sum((select sum(ob.other_charges_paise) from op_bill ob where ob.branch_id = ${b.id} and ob.visit_id = v.id and ${inRange('ob.created_at')})), 0)
          + coalesce(sum((select sum(l.amount_paise) from op_bill_line l inner join op_bill ob on ob.id = l.bill_id where ob.branch_id = ${b.id} and ob.visit_id = v.id and l.lab_order_id is null and l.description <> ${ROUND_OFF_LINE} and ${inRange('ob.created_at')})), 0) as otherPaise,
        coalesce(sum((select sum(ob.discount_paise) from op_bill ob where ob.branch_id = ${b.id} and ob.visit_id = v.id and ${inRange('ob.created_at')})), 0) as discountPaise,
        coalesce(sum((select sum(ps.total_paise) from pharmacy_sale ps where ps.branch_id = ${b.id} and ps.visit_id = v.id and ${inRange('ps.created_at')})), 0) as medicinesPaise
      from op_visit v left join user d on d.id = v.doctor_user_id
      where v.branch_id = ${b.id} and v.deleted_at is null and v.status <> 'cancelled' and v.visit_date between ${from} and ${to}
      group by v.doctor_user_id order by patients desc`);
    const doctors = doctorRows.filter((d) => all || d.doctorUserId === u.id).map((d) => ({ ...d, totalPaise: d.consultationPaise + d.labPaise + d.otherPaise + d.medicinesPaise - d.discountPaise }));
    if (!all) return c.json({ days, from, to, doctors, own: true });

    const modes = await db.all<{ mode: 'cash' | 'upi' | 'card'; paise: number }>(sql`
      select mode, sum(paise) as paise from (
        select bp.mode as mode, bp.amount_paise as paise from bill_payment bp where bp.branch_id = ${b.id} and ${inRange('bp.created_at')}
        union all select ps.payment_mode, ps.total_paise from pharmacy_sale ps where ps.branch_id = ${b.id} and ${inRange('ps.created_at')}
      ) group by mode`);
    const byMode = { cash: 0, upi: 0, card: 0 } as Record<'cash' | 'upi' | 'card', number>;
    for (const m of modes) byMode[m.mode] = m.paise;
    // Medicines are the medicine lines only; a direct sale's round off is counted with the round off below.
    const got = await one<{ billsPaise: number; pharmacyOpPaise: number; pharmacyDirectPaise: number; pharmacyRoundOffPaise: number }>(sql`select
      (select coalesce(sum(bp.amount_paise), 0) from bill_payment bp where bp.branch_id = ${b.id} and ${inRange('bp.created_at')}) as billsPaise,
      (select coalesce(sum(ps.total_paise - ps.round_off_paise), 0) from pharmacy_sale ps where ps.branch_id = ${b.id} and ps.visit_id is not null and ${inRange('ps.created_at')}) as pharmacyOpPaise,
      (select coalesce(sum(ps.total_paise - ps.round_off_paise), 0) from pharmacy_sale ps where ps.branch_id = ${b.id} and ps.visit_id is null and ${inRange('ps.created_at')}) as pharmacyDirectPaise,
      (select coalesce(sum(ps.round_off_paise), 0) from pharmacy_sale ps where ps.branch_id = ${b.id} and ${inRange('ps.created_at')}) as pharmacyRoundOffPaise`);
    const billed = await one<{ consultationPaise: number; labPaise: number; otherPaise: number; roundOffPaise: number; discountPaise: number; bills: number; duePaise: number }>(sql`select
      coalesce(sum(ob.consultation_fee_paise), 0) as consultationPaise,
      coalesce(sum((select sum(l.amount_paise) from op_bill_line l where l.bill_id = ob.id and l.lab_order_id is not null)), 0) as labPaise,
      coalesce(sum(ob.other_charges_paise), 0) + coalesce(sum((select sum(l.amount_paise) from op_bill_line l where l.bill_id = ob.id and l.lab_order_id is null and l.description <> ${ROUND_OFF_LINE})), 0) as otherPaise,
      coalesce(sum((select sum(l.amount_paise) from op_bill_line l where l.bill_id = ob.id and l.lab_order_id is null and l.description = ${ROUND_OFF_LINE})), 0) as roundOffPaise,
      coalesce(sum(ob.discount_paise), 0) as discountPaise, count(*) as bills,
      coalesce(sum(max(0, ob.total_paise - coalesce((select sum(bp.amount_paise) from bill_payment bp where bp.bill_id = ob.id), 0))), 0) as duePaise
      from op_bill ob where ob.branch_id = ${b.id} and ${inRange('ob.created_at')}`);
    const out = await one<{ expensesPaise: number; vendorPaidPaise: number; visits: number; newPatients: number }>(sql`select
      (select coalesce(sum(e.amount_paise), 0) from expense e where e.branch_id = ${b.id} and e.deleted_at is null and e.expense_date between ${from} and ${to}) as expensesPaise,
      (select coalesce(sum(vp.amount_paise), 0) from vendor_payment vp where vp.branch_id = ${b.id} and ${inRange('vp.created_at')}) as vendorPaidPaise,
      (select count(*) from op_visit v where v.branch_id = ${b.id} and v.deleted_at is null and v.status <> 'cancelled' and v.visit_date between ${from} and ${to}) as visits,
      (select count(*) from patient p where p.branch_id = ${b.id} and p.deleted_at is null and ${inRange('p.created_at')}) as newPatients`);
    // Who got a discount, and how much round off went on those bills (newest first).
    const discounts = await db.all<{ billId: number; billNo: string; at: string; patientName: string; discountPaise: number; roundOffPaise: number; totalPaise: number }>(sql`
      select ob.id as billId, ob.bill_no as billNo, ob.created_at as at, p.name as patientName, ob.discount_paise as discountPaise, ob.total_paise as totalPaise,
        coalesce((select sum(l.amount_paise) from op_bill_line l where l.bill_id = ob.id and l.lab_order_id is null and l.description = ${ROUND_OFF_LINE}), 0) as roundOffPaise
      from op_bill ob inner join patient p on p.id = ob.patient_id
      where ob.branch_id = ${b.id} and ob.discount_paise > 0 and ${inRange('ob.created_at')} order by ob.id desc limit 200`);
    return c.json({
      discounts,
      days, from, to, own: false, doctors,
      received: { ...byMode, totalPaise: byMode.cash + byMode.upi + byMode.card, ...got },
      // Round off of the OP bills and of the direct sales together: all the money that rounding added.
      billed: { ...billed, roundOffPaise: billed.roundOffPaise + got.pharmacyRoundOffPaise }, ...out,
    });
  });

  /** The day's report (?date=, default today): visits, what was billed, every amount received, what is still due. */
  app.get('/billing/day-report', requirePermission('reports.view'), async (c) => {
    const b = c.get('branch');
    const day = await dayOf(c.req.query('date'));
    const onDay = (col: AnyColumn) => sql`date(${col}, '+330 minutes') = ${day}`;
    const n = sql<number>`count(*)`;
    const sum = (col: AnyColumn) => sql<number>`coalesce(sum(${col}), 0)`;

    const visitRows = await db
      .select({ status: opVisit.status, doctorUserId: opVisit.doctorUserId, doctorName: doctor.name, n })
      .from(opVisit)
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(and(eq(opVisit.branchId, b.id), isNull(opVisit.deletedAt), eq(opVisit.visitDate, day)))
      .groupBy(opVisit.status, opVisit.doctorUserId);
    const seen = visitRows.filter((r) => r.status !== 'cancelled');
    // By person, not by name: two doctors with the same name stay two lines.
    const byDoctor = new Map<number | null, { doctorName: string | null; count: number }>();
    for (const r of seen) byDoctor.set(r.doctorUserId, { doctorName: r.doctorName, count: (byDoctor.get(r.doctorUserId)?.count ?? 0) + r.n });
    const count = (rows: { n: number }[]) => rows.reduce((s, r) => s + r.n, 0);
    const [newPatients] = await db.select({ n }).from(patient).where(and(eq(patient.branchId, b.id), isNull(patient.deletedAt), onDay(patient.createdAt)));
    const [labTests] = await db.select({ n }).from(labOrder).where(and(eq(labOrder.branchId, b.id), sql`${labOrder.status} <> 'cancelled'`, onDay(labOrder.createdAt)));

    const billsOfDay = and(eq(opBill.branchId, b.id), onDay(opBill.createdAt));
    const [heads] = await db.select({ consultation: sum(opBill.consultationFeePaise), other: sum(opBill.otherChargesPaise), discount: sum(opBill.discountPaise) }).from(opBill).where(billsOfDay);
    const [lab] = await db.select({ sum: sum(opBillLine.amountPaise) }).from(opBillLine).innerJoin(opBill, eq(opBill.id, opBillLine.billId)).where(and(billsOfDay, sql`${opBillLine.labOrderId} is not null`));
    const [charges] = await db.select({ sum: sum(opBillLine.amountPaise) }).from(opBillLine).innerJoin(opBill, eq(opBill.id, opBillLine.billId)).where(and(billsOfDay, isNull(opBillLine.labOrderId), ne(opBillLine.description, ROUND_OFF_LINE)));
    const [rounded] = await db.select({ sum: sum(opBillLine.amountPaise) }).from(opBillLine).innerJoin(opBill, eq(opBill.id, opBillLine.billId)).where(and(billsOfDay, isNull(opBillLine.labOrderId), eq(opBillLine.description, ROUND_OFF_LINE)));
    // Pharmacy = the medicine lines; a direct sale's round off is counted with the bills' round off.
    const [sold] = await db.select({ sum: sql<number>`coalesce(sum(${pharmacySale.totalPaise} - ${pharmacySale.roundOffPaise}), 0)`, rounded: sum(pharmacySale.roundOffPaise) }).from(pharmacySale).where(and(eq(pharmacySale.branchId, b.id), onDay(pharmacySale.createdAt)));
    const paidOnBill = sql<number>`(select coalesce(sum(${billPayment.amountPaise}), 0) from ${billPayment} where ${billPayment.billId} = ${opBill.id})`;
    const due = sql<number>`coalesce(sum(max(0, ${opBill.totalPaise} - ${paidOnBill})), 0)`;
    const [pendingDay] = await db.select({ due }).from(opBill).where(billsOfDay);
    const [pendingAll] = await db.select({ due }).from(opBill).where(eq(opBill.branchId, b.id));

    const payments = await db
      .select({ paymentId: billPayment.id, billId: opBill.id, billNo: opBill.billNo, at: billPayment.receivedAt, patientName: patient.name, amountPaise: billPayment.amountPaise, mode: billPayment.mode })
      .from(billPayment)
      .innerJoin(opBill, eq(opBill.id, billPayment.billId))
      .innerJoin(patient, eq(patient.id, opBill.patientId))
      .where(and(eq(billPayment.branchId, b.id), onDay(billPayment.receivedAt)));
    const receipts: DayReceipt[] = [];
    for (const p of payments) {
      // The receipt no. counts the bill's payments from its first one, whatever day that was.
      const [nth] = await db.select({ n }).from(billPayment).where(and(eq(billPayment.billId, p.billId), lte(billPayment.id, p.paymentId)));
      receipts.push({ kind: 'bill', no: receiptNo(p.billNo, nth!.n), billId: p.billId, paymentId: p.paymentId, saleId: null, at: p.at, patientName: p.patientName, amountPaise: p.amountPaise, mode: p.mode });
    }
    // Single sales are the pharmacy counter's to see, as everywhere else; the totals above are the day's money.
    if (b.permissions.includes('pharmacy.sell')) {
      const sales = await db
        .select({ saleId: pharmacySale.id, no: pharmacySale.saleNo, at: pharmacySale.createdAt, patientName: patient.name, amountPaise: pharmacySale.totalPaise, mode: pharmacySale.paymentMode })
        .from(pharmacySale)
        .leftJoin(patient, eq(patient.id, pharmacySale.patientId))
        .where(and(eq(pharmacySale.branchId, b.id), onDay(pharmacySale.createdAt)));
      for (const s of sales) receipts.push({ kind: 'pharmacy', billId: null, paymentId: null, ...s });
    }
    receipts.sort((x, y) => x.at.localeCompare(y.at));

    const result: DayReport = {
      ...(await collectionOf(b.id, day)),
      visits: { total: count(seen), completed: count(seen.filter((r) => r.status === 'completed')), cancelled: count(visitRows) - count(seen), newPatients: newPatients!.n, byDoctor: [...byDoctor.values()] },
      labTests: labTests!.n,
      billed: { consultationPaise: heads!.consultation, labPaise: lab!.sum, otherPaise: heads!.other + charges!.sum, roundOffPaise: rounded!.sum + sold!.rounded, discountPaise: heads!.discount, pharmacyPaise: sold!.sum },
      pendingDayPaise: pendingDay!.due,
      pendingAllPaise: pendingAll!.due,
      receipts,
    };
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
