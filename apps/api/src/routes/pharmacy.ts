// Inventory (medicines + stock batches), prescriptions, and the pharmacy counter.
import { and, asc, desc, eq, gt, gte, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { Hono } from 'hono';
import {
  batchInputSchema,
  directSaleSchema,
  dispenseSchema,
  medicineInputSchema,
  prescriptionItemSchema,
  type PrescriptionSuggestions,
  suggestedQuantity,
  type CheckoutMedicine,
  type Medicine,
  type PaymentMode,
  type PharmacyQueueEntry,
  type PharmacySale,
  type PharmacySaleDetail,
  type StockReport,
  type StockReportBatch,
} from '@platform/shared';
import { AppError, nextNumber, notFound, printHeaderOf, requireAnyPermission, requirePermission, validationError, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { medicine, medicineBatch, opVisit, patient, pharmacySale, pharmacySaleLine, prescriptionItem, purchaseBill, purchaseLine, treatmentDose, user, vendor } from '../db/schema.js';
import { assertNoDoseGiven, createDoses } from './treatments.js';
import { dayStamp, localToday, visitOfBranch } from '../lib/clinic.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const doctor = alias(user, 'doctor');
const nextBatch = alias(medicineBatch, 'nb');

/** Stock report: batches expiring within this many days are listed as "expiring". */
const EXPIRY_REPORT_DAYS = 90;
/** Whole days from one YYYY-MM-DD to another (negative if `to` is earlier). */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Medicines of this branch with their sellable stock, nearest expiry and the batch it is in. (The dashboard uses it too.) */
export async function medicinesWithStock(db: Db, branchId: number, today: string, extra?: ReturnType<typeof and>): Promise<Medicine[]> {
  return db
    .select({
      id: medicine.id,
      name: medicine.name,
      form: medicine.form,
      strength: medicine.strength,
      pricePaise: medicine.pricePaise,
      reorderLevel: medicine.reorderLevel,
      stock: sql<number>`coalesce(sum(case when ${medicineBatch.expiryDate} >= ${today} and ${medicineBatch.quantity} > 0 then ${medicineBatch.quantity} end), 0)`,
      nextExpiry: sql<string | null>`min(case when ${medicineBatch.expiryDate} >= ${today} and ${medicineBatch.quantity} > 0 then ${medicineBatch.expiryDate} end)`,
      // Same order as the sale itself (FEFO): earliest expiry, then oldest batch.
      nextBatchNo: sql<string | null>`(select ${nextBatch.batchNo} from ${medicineBatch} nb where ${nextBatch.branchId} = ${branchId} and ${nextBatch.medicineId} = ${medicine.id} and ${nextBatch.expiryDate} >= ${today} and ${nextBatch.quantity} > 0 order by ${nextBatch.expiryDate}, ${nextBatch.id} limit 1)`,
    })
    .from(medicine)
    .leftJoin(medicineBatch, eq(medicineBatch.medicineId, medicine.id))
    .where(and(eq(medicine.branchId, branchId), isNull(medicine.deletedAt), extra))
    .groupBy(medicine.id)
    .orderBy(asc(medicine.name));
}

/** Stock that can be sold today: unexpired batches with units left. */
const sellable = (today: string) => and(gte(medicineBatch.expiryDate, today), gt(medicineBatch.quantity, 0));

/** Plan each line first (FEFO: earliest expiry first). Lines short of sellable stock are named in `short`. */
async function planFefo<T extends { medicineId: number; quantity: number; name: string }>(tx: Tx, branchId: number, today: string, items: T[]) {
  const plan: { item: T; takes: { batchId: number; qty: number }[] }[] = [];
  const short: string[] = [];
  for (const item of items) {
    const batches = await tx
      .select({ id: medicineBatch.id, quantity: medicineBatch.quantity })
      .from(medicineBatch)
      .where(and(eq(medicineBatch.branchId, branchId), eq(medicineBatch.medicineId, item.medicineId), sellable(today)))
      .orderBy(asc(medicineBatch.expiryDate), asc(medicineBatch.id));
    let need = item.quantity;
    const takes: { batchId: number; qty: number }[] = [];
    for (const bt of batches) {
      if (need === 0) break;
      const qty = Math.min(need, bt.quantity);
      takes.push({ batchId: bt.id, qty });
      need -= qty;
    }
    if (need > 0) short.push(`${item.name} (need ${item.quantity}, have ${item.quantity - need})`);
    plan.push({ item, takes });
  }
  return { plan, short };
}

/** Take the planned units out of their batches and write one sale line per batch. */
async function sellTakes(tx: Tx, branchId: number, saleId: number, item: { medicineId: number; name: string; pricePaise: number }, takes: { batchId: number; qty: number }[], prescriptionItemId: number | null) {
  for (const t of takes) {
    // Guarded decrement: never below zero even if two counters race.
    const done = await tx
      .update(medicineBatch)
      .set({ quantity: sql`${medicineBatch.quantity} - ${t.qty}`, updatedAt: new Date().toISOString() })
      .where(and(eq(medicineBatch.id, t.batchId), gte(medicineBatch.quantity, t.qty)))
      .returning({ id: medicineBatch.id });
    if (!done.length) throw new AppError(409, 'out_of_stock', `Stock of ${item.name} just changed. Try again.`);
    await tx.insert(pharmacySaleLine).values({
      branchId,
      saleId,
      prescriptionItemId,
      medicineId: item.medicineId,
      batchId: t.batchId,
      quantity: t.qty,
      unitPricePaise: item.pricePaise,
      amountPaise: t.qty * item.pricePaise,
    });
  }
}

/** Prescription lines of some visits, with medicine price and today's sellable stock. */
export async function prescriptionLines(db: Db | Tx, branchId: number, today: string, where: ReturnType<typeof and>): Promise<CheckoutMedicine[]> {
  const nextBatchOf = (col: 'batch_no' | 'expiry_date') =>
    sql<string | null>`(select ${sql.raw(col)} from ${medicineBatch} nb where ${nextBatch.branchId} = ${branchId} and ${nextBatch.medicineId} = ${prescriptionItem.medicineId} and ${nextBatch.expiryDate} >= ${today} and ${nextBatch.quantity} > 0 order by ${nextBatch.expiryDate}, ${nextBatch.id} limit 1)`;
  const stock = db
    .select({ medicineId: medicineBatch.medicineId, stock: sql<number>`sum(${medicineBatch.quantity})`.as('stock') })
    .from(medicineBatch)
    .where(and(eq(medicineBatch.branchId, branchId), sellable(today)))
    .groupBy(medicineBatch.medicineId)
    .as('stock');
  const rows = await db
    .select({
      id: prescriptionItem.id,
      visitId: prescriptionItem.visitId,
      medicineId: prescriptionItem.medicineId,
      medicineName: medicine.name,
      form: medicine.form,
      strength: medicine.strength,
      dose: prescriptionItem.dose,
      days: prescriptionItem.days,
      quantity: prescriptionItem.quantity,
      instructions: prescriptionItem.instructions,
      status: prescriptionItem.status,
      pricePaise: medicine.pricePaise,
      givenHere: prescriptionItem.givenHere,
      dosesTotal: sql<number>`(select count(*) from ${treatmentDose} where ${treatmentDose.prescriptionItemId} = ${prescriptionItem.id})`,
      dosesGiven: sql<number>`(select count(*) from ${treatmentDose} where ${treatmentDose.prescriptionItemId} = ${prescriptionItem.id} and ${treatmentDose.givenAt} is not null)`,
      stock: sql<number>`coalesce(${stock.stock}, 0)`,
      // The batch the sale takes from first (FEFO), as on the medicine list.
      nextBatchNo: nextBatchOf('batch_no'),
      nextExpiry: nextBatchOf('expiry_date'),
    })
    .from(prescriptionItem)
    .innerJoin(medicine, eq(medicine.id, prescriptionItem.medicineId))
    .leftJoin(stock, eq(stock.medicineId, prescriptionItem.medicineId))
    .where(and(eq(prescriptionItem.branchId, branchId), isNull(prescriptionItem.deletedAt), where))
    .orderBy(asc(prescriptionItem.id));
  return rows;
}

/**
 * Sell the ticked prescription lines of a visit, taking stock from the earliest-expiring batches first (FEFO).
 * Unticked pending lines are marked "declined" (patient didn't buy them).
 * All-or-nothing: if any ticked line is short of stock, it throws and nothing is sold.
 * Returns the sale, or null when no line was ticked (only the checkout allows that).
 */
export async function dispenseItems(
  tx: Tx,
  branchId: number,
  u: { id: number; organizationId: number },
  v: { id: number; patientId: number },
  itemIds: number[],
  paymentMode: PaymentMode,
  today: string,
  /** Line id -> units to give, when the patient takes fewer than prescribed. The prescription itself stays as the doctor wrote it. */
  quantities: Record<string, number> = {},
) {
  const pending = await tx
    .select({ id: prescriptionItem.id, medicineId: prescriptionItem.medicineId, quantity: prescriptionItem.quantity, name: medicine.name, pricePaise: medicine.pricePaise })
    .from(prescriptionItem)
    .innerJoin(medicine, eq(medicine.id, prescriptionItem.medicineId))
    .where(and(eq(prescriptionItem.branchId, branchId), eq(prescriptionItem.visitId, v.id), eq(prescriptionItem.status, 'pending'), isNull(prescriptionItem.deletedAt)));
  const ticked = pending.filter((p) => itemIds.includes(p.id));
  if (ticked.length !== new Set(itemIds).size) throw new AppError(409, 'not_pending', 'Some medicines were already dispensed or removed. Refresh and try again.');
  const fewer: Record<number, { prescribed: number; given: number }> = {};
  const chosen = ticked.map((p) => {
    const given = quantities[p.id] ?? p.quantity;
    if (given > p.quantity) throw new AppError(400, 'validation', `${p.name}: the doctor prescribed ${p.quantity}. Giving more needs the doctor to change the prescription.`, { quantities: [`${p.name}: at most ${p.quantity}`] });
    if (given < p.quantity) fewer[p.id] = { prescribed: p.quantity, given };
    return { ...p, quantity: given };
  });

  // Plan every line first (FEFO); refuse the whole sale if anything is short.
  const { plan, short } = await planFefo(tx, branchId, today, chosen);
  if (short.length) throw new AppError(409, 'out_of_stock', `Not enough stock: ${short.join(', ')}. Untick it or add stock first.`);

  const declined = pending.filter((p) => !itemIds.includes(p.id)).map((p) => p.id);
  if (declined.length) await tx.update(prescriptionItem).set({ status: 'declined', updatedAt: new Date().toISOString() }).where(inArray(prescriptionItem.id, declined));
  if (!chosen.length) {
    // Nothing bought: the lines are only marked "declined", there is no sale.
    if (declined.length) await writeAudit(tx, { organizationId: u.organizationId, branchId, userId: u.id, action: 'decline', entity: 'prescription', entityId: v.id, detail: { visitId: v.id, declined } });
    return null;
  }
  const n = await nextNumber(tx, branchId, `sale:${today}`);
  const saleNo = `PH-${dayStamp(today)}-${String(n).padStart(3, '0')}`;
  const totalPaise = chosen.reduce((s, i) => s + i.quantity * i.pricePaise, 0);
  const [s] = await tx
    .insert(pharmacySale)
    .values({ branchId, saleNo, visitId: v.id, patientId: v.patientId, totalPaise, paymentMode, createdBy: u.id })
    .returning({ id: pharmacySale.id });

  for (const { item, takes } of plan) {
    await sellTakes(tx, branchId, s.id, item, takes, item.id);
    await tx.update(prescriptionItem).set({ status: 'dispensed', updatedAt: new Date().toISOString() }).where(eq(prescriptionItem.id, item.id));
  }
  await writeAudit(tx, { organizationId: u.organizationId, branchId, userId: u.id, action: 'dispense', entity: 'pharmacy_sale', entityId: s.id, detail: { saleNo, visitId: v.id, itemIds, declined, fewer, totalPaise, paymentMode } });
  return { id: s.id, saleNo, totalPaise };
}

/** One sale of this branch with the batches it was taken from (as printed), or 404. */
export async function saleDetail(db: Db, branchId: number, id: number): Promise<PharmacySaleDetail> {
  if (!Number.isInteger(id)) throw notFound('Sale not found');
  const [s] = await db
    .select({
      id: pharmacySale.id,
      saleNo: pharmacySale.saleNo,
      createdAt: pharmacySale.createdAt,
      paymentMode: pharmacySale.paymentMode,
      totalPaise: pharmacySale.totalPaise,
      soldByName: user.name,
      patientName: patient.name,
      patientUhid: patient.uhid,
      visitId: pharmacySale.visitId,
      opNo: opVisit.opNo,
    })
    .from(pharmacySale)
    .leftJoin(patient, eq(patient.id, pharmacySale.patientId))
    .leftJoin(opVisit, eq(opVisit.id, pharmacySale.visitId))
    .leftJoin(user, eq(user.id, pharmacySale.createdBy))
    .where(and(eq(pharmacySale.branchId, branchId), eq(pharmacySale.id, id)));
  if (!s) throw notFound('Sale not found');
  const lines = await db
    .select({
      medicineName: medicine.name,
      form: medicine.form,
      strength: medicine.strength,
      batchNo: medicineBatch.batchNo,
      expiryDate: medicineBatch.expiryDate,
      quantity: pharmacySaleLine.quantity,
      unitPricePaise: pharmacySaleLine.unitPricePaise,
      amountPaise: pharmacySaleLine.amountPaise,
    })
    .from(pharmacySaleLine)
    .innerJoin(medicine, eq(medicine.id, pharmacySaleLine.medicineId))
    .innerJoin(medicineBatch, eq(medicineBatch.id, pharmacySaleLine.batchId))
    .where(and(eq(pharmacySaleLine.branchId, branchId), eq(pharmacySaleLine.saleId, s.id)))
    .orderBy(asc(pharmacySaleLine.id));
  const { patientName, patientUhid, ...rest } = s;
  const sale: PharmacySaleDetail = { ...rest, patient: patientName != null && patientUhid != null ? { name: patientName, uhid: patientUhid } : null, lines };
  return sale;
}

export function createPharmacyRoutes(db: Db) {
  const app = new Hono<BranchEnv>();

  // ---------------------------------------------------------------- helpers

  async function medicineOfBranch(branchId: number, id: number) {
    if (!Number.isInteger(id)) throw notFound('Medicine not found');
    const [m] = await db
      .select({ id: medicine.id, name: medicine.name })
      .from(medicine)
      .where(and(eq(medicine.branchId, branchId), eq(medicine.id, id), isNull(medicine.deletedAt)));
    if (!m) throw notFound('Medicine not found');
    return m;
  }

  // ---------------------------------------------------------------- medicines & stock

  // Doctors search this while prescribing, so prescription.write may read it too.
  app.get('/medicines', requireAnyPermission('inventory.view', 'prescription.write', 'pharmacy.sell'), async (c) => {
    const b = c.get('branch');
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    const today = await localToday(db);
    const medicines = await medicinesWithStock(db, b.id, today, q ? and(sql`instr(lower(${medicine.name}), ${q}) > 0`) : undefined);
    return c.json({ medicines, today });
  });

  app.post('/medicines', requirePermission('inventory.manage'), async (c) => {
    const parsed = medicineInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const [dup] = await db
      .select({ id: medicine.id })
      .from(medicine)
      .where(
        and(
          eq(medicine.branchId, b.id),
          isNull(medicine.deletedAt),
          sql`lower(${medicine.name}) = ${parsed.data.name.toLowerCase()}`,
          sql`coalesce(lower(${medicine.strength}), '') = ${(parsed.data.strength ?? '').toLowerCase()}`,
        ),
      );
    if (dup) throw new AppError(409, 'duplicate', 'This medicine is already in the list', { name: ['This medicine is already in the list'] });
    const [row] = await db.insert(medicine).values({ ...parsed.data, branchId: b.id }).returning({ id: medicine.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'medicine', entityId: row.id, detail: parsed.data });
    return c.json({ id: row.id }, 201);
  });

  app.patch('/medicines/:id', requirePermission('inventory.manage'), async (c) => {
    const parsed = medicineInputSchema.partial().safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const m = await medicineOfBranch(b.id, Number(c.req.param('id')));
    await db.update(medicine).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(medicine.id, m.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'update', entity: 'medicine', entityId: m.id, detail: parsed.data });
    return c.json({ ok: true });
  });

  app.delete('/medicines/:id', requirePermission('inventory.manage'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const m = await medicineOfBranch(b.id, Number(c.req.param('id')));
    await db.update(medicine).set({ deletedAt: new Date().toISOString() }).where(eq(medicine.id, m.id));
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'medicine', entityId: m.id });
    return c.json({ ok: true });
  });

  app.get('/medicines/:id/batches', requirePermission('inventory.view'), async (c) => {
    const b = c.get('branch');
    const m = await medicineOfBranch(b.id, Number(c.req.param('id')));
    const batches = await db
      .select({ id: medicineBatch.id, batchNo: medicineBatch.batchNo, expiryDate: medicineBatch.expiryDate, quantity: medicineBatch.quantity, receivedQty: medicineBatch.receivedQty, createdAt: medicineBatch.createdAt })
      .from(medicineBatch)
      .where(and(eq(medicineBatch.branchId, b.id), eq(medicineBatch.medicineId, m.id)))
      .orderBy(asc(medicineBatch.expiryDate), asc(medicineBatch.id));
    return c.json({ batches, today: await localToday(db) });
  });

  /** Add stock (a new batch). */
  app.post('/medicines/:id/batches', requirePermission('inventory.manage'), async (c) => {
    const parsed = batchInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const m = await medicineOfBranch(b.id, Number(c.req.param('id')));
    if (parsed.data.expiryDate < (await localToday(db))) {
      throw new AppError(400, 'validation', 'This batch has already expired', { expiryDate: ['This batch has already expired'] });
    }
    const [row] = await db
      .insert(medicineBatch)
      .values({ ...parsed.data, branchId: b.id, medicineId: m.id, receivedQty: parsed.data.quantity, createdBy: u.id })
      .returning({ id: medicineBatch.id });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'stock_in', entity: 'medicine', entityId: m.id, detail: parsed.data });
    return c.json({ id: row.id }, 201);
  });

  /** Expiry and stock report: what is expiring, what has expired on the shelf, what to reorder, and what the stock is worth. */
  app.get('/inventory/report', requirePermission('inventory.view'), async (c) => {
    const b = c.get('branch');
    const today = await localToday(db);
    const medicines = await medicinesWithStock(db, b.id, today);
    // Every batch with units left, earliest expiry first. Cost and vendor exist only for batches that came in on a purchase bill.
    const batches = await db
      .select({
        batchId: medicineBatch.id,
        medicineId: medicine.id,
        medicineName: medicine.name,
        form: medicine.form,
        strength: medicine.strength,
        batchNo: medicineBatch.batchNo,
        expiryDate: medicineBatch.expiryDate,
        quantity: medicineBatch.quantity,
        pricePaise: medicine.pricePaise,
        unitCostPaise: purchaseLine.unitCostPaise,
        vendorName: vendor.name,
      })
      .from(medicineBatch)
      .innerJoin(medicine, eq(medicine.id, medicineBatch.medicineId))
      .leftJoin(purchaseLine, and(eq(purchaseLine.batchId, medicineBatch.id), eq(purchaseLine.branchId, b.id)))
      // A cancelled bill gives no vendor (in the join, so the batch itself still shows).
      .leftJoin(purchaseBill, and(eq(purchaseBill.id, purchaseLine.billId), isNull(purchaseBill.cancelledAt)))
      .leftJoin(vendor, eq(vendor.id, purchaseBill.vendorId))
      .where(and(eq(medicineBatch.branchId, b.id), eq(medicine.branchId, b.id), isNull(medicine.deletedAt), gt(medicineBatch.quantity, 0)))
      .orderBy(asc(medicineBatch.expiryDate), asc(medicineBatch.id));

    const expiring: StockReportBatch[] = [];
    const expired: StockReportBatch[] = [];
    const summary: StockReport['summary'] = {
      medicines: medicines.length,
      inStock: medicines.filter((m) => m.stock > 0).length,
      outOfStock: medicines.filter((m) => m.stock === 0).length,
      lowStock: 0,
      expiring30: 0,
      expiring60: 0,
      expiring90: 0,
      expired: 0,
      sellableValuePaise: 0,
      expiredValuePaise: 0,
      costValuePaise: 0,
      costKnownUnits: 0,
      sellableUnits: 0,
    };
    for (const { pricePaise, unitCostPaise, ...bt } of batches) {
      const row: StockReportBatch = { ...bt, daysLeft: daysBetween(today, bt.expiryDate), valuePaise: bt.quantity * pricePaise };
      if (row.daysLeft < 0) {
        expired.unshift(row); // most recently expired first
        summary.expired++;
        summary.expiredValuePaise += row.valuePaise;
        continue;
      }
      summary.sellableUnits += bt.quantity;
      summary.sellableValuePaise += row.valuePaise;
      if (unitCostPaise != null) {
        summary.costKnownUnits += bt.quantity;
        summary.costValuePaise += bt.quantity * unitCostPaise;
      }
      if (row.daysLeft > EXPIRY_REPORT_DAYS) continue;
      expiring.push(row);
      summary.expiring90++;
      if (row.daysLeft <= 60) summary.expiring60++;
      if (row.daysLeft <= 30) summary.expiring30++;
    }
    const lowStock = medicines
      .filter((m) => m.stock <= m.reorderLevel)
      .sort((x, y) => x.stock - y.stock)
      .map((m) => ({ id: m.id, name: m.name, form: m.form, strength: m.strength, stock: m.stock, reorderLevel: m.reorderLevel }));
    summary.lowStock = lowStock.length;
    const report: StockReport = { today, expiring, expired, lowStock, summary };
    return c.json(report);
  });

  // ---------------------------------------------------------------- prescriptions

  /** The doses and instructions this branch writes most: one-click choices when prescribing. */
  app.get('/prescription/suggestions', requirePermission('prescription.write'), async (c) => {
    const b = c.get('branch');
    const top = async (col: typeof prescriptionItem.dose | typeof prescriptionItem.instructions) =>
      (
        await db
          .select({ value: col })
          .from(prescriptionItem)
          .where(and(eq(prescriptionItem.branchId, b.id), isNull(prescriptionItem.deletedAt), sql`${col} is not null and ${col} <> ''`))
          .groupBy(col)
          .orderBy(sql`count(*) desc`, col)
          .limit(8)
      ).map((r) => r.value as string);
    const result: PrescriptionSuggestions = { doses: await top(prescriptionItem.dose), instructions: await top(prescriptionItem.instructions) };
    return c.json(result);
  });

  app.get('/visits/:visitId/prescription', requirePermission('patient.view'), async (c) => {
    const b = c.get('branch');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    const items = await prescriptionLines(db, b.id, await localToday(db), and(eq(prescriptionItem.visitId, v.id)));
    return c.json({ items });
  });

  app.post('/visits/:visitId/prescription', requirePermission('prescription.write'), async (c) => {
    const parsed = prescriptionItemSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const v = await visitOfBranch(db, b.id, Number(c.req.param('visitId')));
    if (v.status === 'cancelled') throw new AppError(400, 'visit_cancelled', 'This visit was cancelled');
    await medicineOfBranch(b.id, parsed.data.medicineId);
    // Quantity: what the doctor typed, else dose x days (1-0-1 for 5 days = 10).
    const quantity = parsed.data.quantity ?? suggestedQuantity(parsed.data.dose, parsed.data.days);
    if (!quantity) throw new AppError(400, 'validation', 'Enter the quantity for this dose', { quantity: ['Enter the quantity for this dose'] });
    const today = await localToday(db);
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(prescriptionItem)
        .values({ ...parsed.data, quantity, branchId: b.id, visitId: v.id, createdBy: u.id })
        .returning({ id: prescriptionItem.id });
      // Given in the hospital: one dose per time of day per day, from today, for the nurse to tick.
      if (parsed.data.givenHere) await createDoses(tx, b.id, { id: created.id, visitId: v.id, patientId: v.patientId, dose: parsed.data.dose, days: parsed.data.days }, today);
      return created;
    });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'create', entity: 'prescription_item', entityId: row.id, detail: { visitId: v.id, ...parsed.data, quantity } });
    return c.json({ id: row.id, quantity }, 201);
  });

  /** Only lines not yet dispensed can be removed. */
  app.delete('/prescription-items/:id', requirePermission('prescription.write'), async (c) => {
    const b = c.get('branch');
    const u = c.get('user');
    const id = Number(c.req.param('id'));
    const [item] = await db
      .select({ id: prescriptionItem.id, status: prescriptionItem.status })
      .from(prescriptionItem)
      .where(and(eq(prescriptionItem.branchId, b.id), eq(prescriptionItem.id, id), isNull(prescriptionItem.deletedAt)));
    if (!item) throw notFound('Prescription line not found');
    if (item.status === 'dispensed') throw new AppError(409, 'dispensed', 'Already dispensed — it can no longer be removed');
    await db.transaction(async (tx) => {
      await assertNoDoseGiven(tx, id);
      await tx.update(prescriptionItem).set({ deletedAt: new Date().toISOString() }).where(eq(prescriptionItem.id, id));
    });
    await writeAudit(db, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'delete', entity: 'prescription_item', entityId: id });
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------- pharmacy counter

  /** Visits with medicines waiting to be dispensed, oldest first. */
  app.get('/pharmacy/queue', requirePermission('pharmacy.sell'), async (c) => {
    const b = c.get('branch');
    const today = await localToday(db);
    const visits = await db
      .selectDistinct({
        visitId: opVisit.id,
        opNo: opVisit.opNo,
        visitDate: opVisit.visitDate,
        patientId: patient.id,
        patientName: patient.name,
        patientUhid: patient.uhid,
        doctorName: doctor.name,
        pharmacyNote: opVisit.pharmacyNote,
      })
      .from(prescriptionItem)
      .innerJoin(opVisit, eq(opVisit.id, prescriptionItem.visitId))
      .innerJoin(patient, eq(patient.id, opVisit.patientId))
      .leftJoin(doctor, eq(doctor.id, opVisit.doctorUserId))
      .where(and(eq(prescriptionItem.branchId, b.id), eq(prescriptionItem.status, 'pending'), isNull(prescriptionItem.deletedAt), isNull(opVisit.deletedAt)))
      .orderBy(asc(opVisit.id));
    if (!visits.length) return c.json({ queue: [] });
    const items = await prescriptionLines(db, b.id, today, and(eq(prescriptionItem.status, 'pending'), inArray(prescriptionItem.visitId, visits.map((v) => v.visitId))));
    const queue: PharmacyQueueEntry[] = visits.map((v) => ({ ...v, items: items.filter((i) => i.visitId === v.visitId) }));
    return c.json({ queue });
  });

  /**
   * One click: sell the ticked lines, taking stock from the earliest-expiring batches first (FEFO).
   * Unticked lines of the same visit are marked "declined" (patient didn't buy them).
   * All-or-nothing: if any ticked line is short of stock, nothing is sold.
   */
  app.post('/pharmacy/dispense', requirePermission('pharmacy.sell'), async (c) => {
    const parsed = dispenseSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const { itemIds, paymentMode, quantities } = parsed.data;
    const v = await visitOfBranch(db, b.id, parsed.data.visitId);
    const today = await localToday(db);

    const sale = await db.transaction((tx) => dispenseItems(tx, b.id, u, v, itemIds, paymentMode, today, quantities));
    return c.json({ sale }, 201);
  });

  /**
   * Direct (over-the-counter) sale: no prescription, the customer is optional (walk-in).
   * Same FEFO stock rules as dispense. All-or-nothing: if any medicine is short of stock, nothing is sold.
   */
  app.post('/pharmacy/sales', requirePermission('pharmacy.sell'), async (c) => {
    const parsed = directSaleSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const b = c.get('branch');
    const u = c.get('user');
    const { items, paymentMode } = parsed.data;
    const patientId = parsed.data.patientId ?? null;
    if (patientId != null) {
      const [p] = await db.select({ id: patient.id }).from(patient).where(and(eq(patient.branchId, b.id), eq(patient.id, patientId), isNull(patient.deletedAt)));
      if (!p) throw notFound('Patient not found');
    }
    const today = await localToday(db);

    const sale = await db.transaction(async (tx) => {
      const meds = await tx
        .select({ medicineId: medicine.id, name: medicine.name, pricePaise: medicine.pricePaise })
        .from(medicine)
        .where(and(eq(medicine.branchId, b.id), isNull(medicine.deletedAt), inArray(medicine.id, items.map((i) => i.medicineId))));
      // Another branch's (or a deleted) medicine answers like a missing one.
      if (meds.length !== items.length) throw notFound('Medicine not found');
      const chosen = items.map((i) => ({ ...meds.find((m) => m.medicineId === i.medicineId)!, quantity: i.quantity }));

      const { plan, short } = await planFefo(tx, b.id, today, chosen);
      if (short.length) throw new AppError(409, 'out_of_stock', `Not enough stock: ${short.join(', ')}. Reduce the quantity or add stock first.`);

      const n = await nextNumber(tx, b.id, `sale:${today}`);
      const saleNo = `PH-${dayStamp(today)}-${String(n).padStart(3, '0')}`;
      const totalPaise = chosen.reduce((s, i) => s + i.quantity * i.pricePaise, 0);
      const [s] = await tx
        .insert(pharmacySale)
        .values({ branchId: b.id, saleNo, visitId: null, patientId, totalPaise, paymentMode, createdBy: u.id })
        .returning({ id: pharmacySale.id });
      for (const { item, takes } of plan) await sellTakes(tx, b.id, s.id, item, takes, null);
      await writeAudit(tx, { organizationId: u.organizationId, branchId: b.id, userId: u.id, action: 'sell', entity: 'pharmacy_sale', entityId: s.id, detail: { saleNo, patientId, items, totalPaise, paymentMode } });
      return { id: s.id, saleNo, totalPaise };
    });
    return c.json({ sale }, 201);
  });

  /** One sale with its batches, for the printed pharmacy bill (direct and prescription sales alike). */
  app.get('/pharmacy/sales/:id', requirePermission('pharmacy.sell'), async (c) => {
    const b = c.get('branch');
    const sale = await saleDetail(db, b.id, Number(c.req.param('id')));
    return c.json({ sale, header: await printHeaderOf(db, b.id) });
  });

  /** Sales of a day (default today) with their lines. */
  app.get('/pharmacy/sales', requirePermission('pharmacy.sell'), async (c) => {
    const b = c.get('branch');
    const date = c.req.query('date');
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : await localToday(db);
    const sales = await db
      .select({ id: pharmacySale.id, saleNo: pharmacySale.saleNo, visitId: pharmacySale.visitId, patientName: patient.name, totalPaise: pharmacySale.totalPaise, paymentMode: pharmacySale.paymentMode, createdAt: pharmacySale.createdAt })
      .from(pharmacySale)
      .leftJoin(patient, eq(patient.id, pharmacySale.patientId))
      .where(and(eq(pharmacySale.branchId, b.id), sql`date(${pharmacySale.createdAt}, 'localtime') = ${day}`))
      .orderBy(desc(pharmacySale.id));
    const lines = sales.length
      ? await db
          .select({ saleId: pharmacySaleLine.saleId, medicineName: medicine.name, batchNo: medicineBatch.batchNo, quantity: pharmacySaleLine.quantity, unitPricePaise: pharmacySaleLine.unitPricePaise, amountPaise: pharmacySaleLine.amountPaise })
          .from(pharmacySaleLine)
          .innerJoin(medicine, eq(medicine.id, pharmacySaleLine.medicineId))
          .innerJoin(medicineBatch, eq(medicineBatch.id, pharmacySaleLine.batchId))
          .where(inArray(pharmacySaleLine.saleId, sales.map((s) => s.id)))
      : [];
    const result: PharmacySale[] = sales.map((s) => ({
      ...s,
      patientName: s.patientName ?? 'Walk-in', // a direct sale with no patient attached
      lines: lines.filter((l) => l.saleId === s.id).map(({ saleId: _saleId, ...l }) => l),
    }));
    return c.json({ date: day, sales: result, totalPaise: result.reduce((t, s) => t + s.totalPaise, 0) });
  });

  return app;
}
