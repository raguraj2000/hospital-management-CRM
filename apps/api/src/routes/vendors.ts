// Vendors, purchase bills (receiving medicines = adding stock) and payments to vendors.
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  cancelSchema,
  purchaseBillSchema,
  purchaseLineTotals,
  vendorInputSchema,
  vendorPaymentSchema,
  type PurchaseBillDetail,
  type PurchaseBillSummary,
  type Vendor,
} from '@platform/shared';
import { AppError, notFound, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { medicine, medicineBatch, purchaseBill, purchaseLine, user, vendor, vendorPayment } from '../db/schema.js';
import { localToday } from '../lib/clinic.js';

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function statusOf(total: number, paid: number, cancelled: boolean): PurchaseBillSummary['status'] {
  if (cancelled) return 'cancelled';
  if (paid <= 0) return total === 0 ? 'paid' : 'unpaid';
  return paid >= total ? 'paid' : 'part_paid';
}

export function createVendorRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  // Pharmacists receive stock (inventory.manage); vendor.manage covers vendors and paying them.
  const canReceive = requireAnyPermission('vendor.manage', 'inventory.manage');
  const manage = requirePermission('vendor.manage');

  /** Paid so far per purchase bill. */
  const paidSub = () =>
    db
      .select({ billId: vendorPayment.billId, paid: sql<number>`sum(${vendorPayment.amountPaise})`.as('paid') })
      .from(vendorPayment)
      .groupBy(vendorPayment.billId)
      .as('paid');

  async function bills(branchId: number, where?: ReturnType<typeof and>): Promise<PurchaseBillSummary[]> {
    const today = await localToday(db);
    const paid = paidSub();
    const rows = await db
      .select({
        id: purchaseBill.id,
        vendorId: purchaseBill.vendorId,
        vendorName: vendor.name,
        vendorBillNo: purchaseBill.vendorBillNo,
        billDate: purchaseBill.billDate,
        dueDate: purchaseBill.dueDate,
        totalPaise: purchaseBill.totalPaise,
        paidPaise: sql<number>`coalesce(${paid.paid}, 0)`,
        cancelledAt: purchaseBill.cancelledAt,
      })
      .from(purchaseBill)
      .innerJoin(vendor, eq(vendor.id, purchaseBill.vendorId))
      .leftJoin(paid, eq(paid.billId, purchaseBill.id))
      .where(and(eq(purchaseBill.branchId, branchId), where))
      .orderBy(desc(purchaseBill.billDate), desc(purchaseBill.id));
    return rows.map(({ cancelledAt, ...r }) => {
      const status = statusOf(r.totalPaise, r.paidPaise, !!cancelledAt);
      return { ...r, status, overdue: (status === 'unpaid' || status === 'part_paid') && r.dueDate < today };
    });
  }

  async function vendorOf(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Vendor not found');
    const [v] = await db.select().from(vendor).where(and(eq(vendor.branchId, branchId), eq(vendor.id, id), isNull(vendor.deletedAt)));
    if (!v) throw notFound('Vendor not found');
    return v;
  }

  async function billDetail(branchId: number, id: number): Promise<PurchaseBillDetail> {
    if (!Number.isInteger(id)) throw notFound('Purchase bill not found');
    const [summary] = await bills(branchId, and(eq(purchaseBill.id, id)));
    if (!summary) throw notFound('Purchase bill not found');
    const [b] = await db.select({ notes: purchaseBill.notes, cancelReason: purchaseBill.cancelReason }).from(purchaseBill).where(eq(purchaseBill.id, id));
    const lines = await db
      .select({
        id: purchaseLine.id,
        medicineName: medicine.name,
        batchNo: medicineBatch.batchNo,
        expiryDate: medicineBatch.expiryDate,
        quantity: purchaseLine.quantity,
        unitCostPaise: purchaseLine.unitCostPaise,
        amountPaise: purchaseLine.amountPaise,
        packSize: purchaseLine.packSize,
        // Lines from before the invoice columns existed: one unit per pack, the unit cost as the rate.
        packQty: sql<number>`coalesce(${purchaseLine.packQty}, ${purchaseLine.quantity})`,
        freeQty: purchaseLine.freeQty,
        ratePaise: sql<number>`coalesce(${purchaseLine.ratePaise}, ${purchaseLine.unitCostPaise})`,
        mrpPaise: purchaseLine.mrpPaise,
        gstPercent: purchaseLine.gstPercent,
        soldQty: sql<number>`${medicineBatch.receivedQty} - ${medicineBatch.quantity}`,
      })
      .from(purchaseLine)
      .innerJoin(medicine, eq(medicine.id, purchaseLine.medicineId))
      .innerJoin(medicineBatch, eq(medicineBatch.id, purchaseLine.batchId))
      .where(eq(purchaseLine.billId, id))
      .orderBy(asc(purchaseLine.id));
    const payments = await db
      .select({ id: vendorPayment.id, amountPaise: vendorPayment.amountPaise, mode: vendorPayment.mode, reference: vendorPayment.reference, paidAt: vendorPayment.paidAt, paidByName: user.name })
      .from(vendorPayment)
      .leftJoin(user, eq(user.id, vendorPayment.paidBy))
      .where(eq(vendorPayment.billId, id))
      .orderBy(asc(vendorPayment.id));
    const canCancel = summary.status !== 'cancelled' && payments.length === 0 && lines.every((l) => l.soldQty === 0);
    return { ...summary, notes: b!.notes, cancelReason: b!.cancelReason, lines, payments, canCancel };
  }

  // ---------------------------------------------------------------- vendors

  app.get('/vendors', canReceive, async (c) => {
    const b = c.get('branch');
    const rows = await db.select().from(vendor).where(and(eq(vendor.branchId, b.id), isNull(vendor.deletedAt))).orderBy(asc(vendor.name));
    const open = await bills(b.id, and(isNull(purchaseBill.cancelledAt)));
    const vendors: Vendor[] = rows.map((v) => {
      const mine = open.filter((x) => x.vendorId === v.id);
      return {
        id: v.id,
        name: v.name,
        phone: v.phone,
        address: v.address,
        gstNo: v.gstNo,
        creditDays: v.creditDays,
        notes: v.notes,
        duePaise: mine.reduce((s, x) => s + Math.max(0, x.totalPaise - x.paidPaise), 0),
        overduePaise: mine.filter((x) => x.overdue).reduce((s, x) => s + (x.totalPaise - x.paidPaise), 0),
      };
    });
    return c.json({ vendors });
  });

  app.post('/vendors', manage, async (c) => {
    const parsed = vendorInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const [row] = await db.insert(vendor).values({ ...parsed.data, branchId: b.id }).returning({ id: vendor.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'vendor', entityId: row.id, detail: parsed.data });
    return c.json({ id: row.id }, 201);
  });

  app.patch('/vendors/:id', manage, async (c) => {
    const parsed = vendorInputSchema.partial().safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await vendorOf(b.id, Number(c.req.param('id')));
    await db.update(vendor).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(vendor.id, v.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'vendor', entityId: v.id, detail: parsed.data });
    return c.json({ ok: true });
  });

  app.delete('/vendors/:id', manage, async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const v = await vendorOf(b.id, Number(c.req.param('id')));
    const open = (await bills(b.id, and(eq(purchaseBill.vendorId, v.id), isNull(purchaseBill.cancelledAt)))).filter((x) => x.status !== 'paid');
    if (open.length) throw new AppError(409, 'has_dues', `${v.name} still has ${open.length} unpaid bill${open.length > 1 ? 's' : ''}. Settle them first.`);
    await db.update(vendor).set({ deletedAt: new Date().toISOString() }).where(eq(vendor.id, v.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'vendor', entityId: v.id });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- purchase bills

  app.get('/purchases', canReceive, async (c) => {
    const b = c.get('branch');
    const vendorId = Number(c.req.query('vendorId'));
    const list = await bills(b.id, Number.isInteger(vendorId) && vendorId > 0 ? and(eq(purchaseBill.vendorId, vendorId)) : undefined);
    const status = c.req.query('status');
    return c.json({ bills: status === 'due' ? list.filter((x) => x.status === 'unpaid' || x.status === 'part_paid') : list });
  });

  app.get('/purchases/:id', canReceive, async (c) => c.json({ bill: await billDetail(c.get('branch').id, Number(c.req.param('id'))) }));

  /** Receive medicines: every line becomes a stock batch. */
  app.post('/purchases', canReceive, async (c) => {
    const parsed = purchaseBillSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const input = parsed.data;
    const v = await vendorOf(b.id, input.vendorId);
    const today = await localToday(db);
    if (input.billDate > today) throw new AppError(400, 'validation', "Bill date can't be in the future", { billDate: ["Bill date can't be in the future"] });
    const medIds = [...new Set(input.lines.map((l) => l.medicineId))];
    const meds = await db.select({ id: medicine.id }).from(medicine).where(and(eq(medicine.branchId, b.id), isNull(medicine.deletedAt), inArray(medicine.id, medIds)));
    if (meds.length !== medIds.length) throw new AppError(400, 'validation', 'Choose medicines from this branch');
    const expired = input.lines.findIndex((l) => l.expiryDate < today);
    if (expired >= 0) throw new AppError(400, 'validation', `Line ${expired + 1} has already expired`, { [`lines.${expired}.expiryDate`]: ['Already expired'] });

    const totalPaise = input.lines.reduce((s, l) => s + purchaseLineTotals(l).amountPaise, 0);
    const id = await db.transaction(async (tx) => {
      const [bill] = await tx
        .insert(purchaseBill)
        .values({ branchId: b.id, vendorId: v.id, vendorBillNo: input.vendorBillNo, billDate: input.billDate, dueDate: addDays(input.billDate, v.creditDays), totalPaise, notes: input.notes, createdBy: u.id })
        .returning({ id: purchaseBill.id });
      for (const l of input.lines) {
        const t = purchaseLineTotals(l);
        const [batch] = await tx
          .insert(medicineBatch)
          .values({ branchId: b.id, medicineId: l.medicineId, batchNo: l.batchNo, expiryDate: l.expiryDate, quantity: t.units, receivedQty: t.units, createdBy: u.id })
          .returning({ id: medicineBatch.id });
        await tx.insert(purchaseLine).values({
          branchId: b.id,
          billId: bill.id,
          medicineId: l.medicineId,
          batchId: batch.id,
          quantity: t.units,
          unitCostPaise: t.unitCostPaise,
          amountPaise: t.amountPaise,
          packSize: l.packSize,
          packQty: l.quantity,
          freeQty: l.freeQty,
          ratePaise: l.unitCostPaise,
          mrpPaise: l.mrpPaise ?? null,
          gstPercent: l.gstPercent,
        });
        // The selling price follows the invoice only where the pharmacist asked for it on this line.
        if (l.sellingPricePaise != null) await tx.update(medicine).set({ pricePaise: l.sellingPricePaise, updatedAt: new Date().toISOString() }).where(eq(medicine.id, l.medicineId));
      }
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'purchase_bill', entityId: bill.id, detail: { vendorId: v.id, vendorBillNo: input.vendorBillNo, totalPaise, lines: input.lines.length } });
      return bill.id;
    });
    return c.json({ bill: await billDetail(b.id, id) }, 201);
  });

  app.post('/purchases/:id/payments', manage, async (c) => {
    const parsed = vendorPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billDetail(b.id, Number(c.req.param('id')));
    if (bill.status === 'cancelled') throw new AppError(409, 'cancelled', 'This bill was cancelled');
    const balance = bill.totalPaise - bill.paidPaise;
    if (parsed.data.amountPaise > balance) {
      throw new AppError(400, 'validation', `Only ₹${(balance / 100).toFixed(2)} is due on this bill`, { amountPaise: [`Only ₹${(balance / 100).toFixed(2)} is due`] });
    }
    await db.insert(vendorPayment).values({ ...parsed.data, branchId: b.id, billId: bill.id, paidBy: u.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'pay', entity: 'purchase_bill', entityId: bill.id, detail: parsed.data });
    return c.json({ bill: await billDetail(b.id, bill.id) }, 201);
  });

  /** A bill entered by mistake: only while none of its stock is sold and nothing is paid. */
  app.post('/purchases/:id/cancel', manage, async (c) => {
    const parsed = cancelSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const bill = await billDetail(b.id, Number(c.req.param('id')));
    if (!bill.canCancel) {
      throw new AppError(409, 'cannot_cancel', bill.status === 'cancelled' ? 'Already cancelled' : 'Some of this stock is already sold or the bill has payments; it can no longer be cancelled');
    }
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      const lines = await tx.select({ batchId: purchaseLine.batchId }).from(purchaseLine).where(eq(purchaseLine.billId, bill.id));
      // Take the stock back out. Guarded: only batches still untouched.
      for (const l of lines) {
        const done = await tx
          .update(medicineBatch)
          .set({ quantity: 0, updatedAt: now })
          .where(and(eq(medicineBatch.id, l.batchId), sql`${medicineBatch.quantity} = ${medicineBatch.receivedQty}`))
          .returning({ id: medicineBatch.id });
        if (!done.length) throw new AppError(409, 'cannot_cancel', 'Some of this stock was just sold; it can no longer be cancelled');
      }
      await tx.update(purchaseBill).set({ cancelledAt: now, cancelledBy: u.id, cancelReason: parsed.data.reason }).where(eq(purchaseBill.id, bill.id));
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'cancel', entity: 'purchase_bill', entityId: bill.id, detail: parsed.data });
    });
    return c.json({ bill: await billDetail(b.id, bill.id) });
  });

  return app;
}
