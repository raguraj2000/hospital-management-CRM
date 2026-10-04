import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, sql, type AnyColumn } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  branchContext,
  createAuthRoutes,
  createBranchSettingsRoutes,
  createOrgRoutes,
  createStaffRoutes,
  handleError,
  handleNotFound,
  rateLimit,
  requireAuth,
  requirePermission,
  sameOriginWrites,
  securityHeaders,
  type BranchEnv,
  type Db,
} from '@platform/core';
import type { Permission } from '@platform/shared';
import { billPayment, labOrder, medicine, medicineBatch, opVisit, patient, pharmacySale } from './db/schema.js';
import { createPatientRoutes } from './routes/patients.js';
import { createVisitRoutes } from './routes/visits.js';
import { createDoctorRoutes } from './routes/doctors.js';
import { createPharmacyRoutes, medicinesWithStock } from './routes/pharmacy.js';
import { createLabRoutes } from './routes/lab.js';
import { createVendorRoutes } from './routes/vendors.js';
import { createBillingRoutes } from './routes/billing.js';
import { createPlatformRoutes } from './routes/platform.js';

/** Dashboard: a batch is "near expiry" when it expires within this many days. */
const NEAR_EXPIRY_DAYS = 30;
/** Dashboard: how many low-stock / near-expiry rows are listed (the counts cover all of them). */
const DASHBOARD_LIST_SIZE = 5;

/** The whole API, without starting a server (tests call app.request directly). */
export function createApp(db: Db) {
  const app = new Hono();
  app.onError(handleError);
  app.notFound(handleNotFound);
  app.use('*', securityHeaders());
  app.use('/api/*', sameOriginWrites());

  const api = new Hono();
  api.get('/health', (c) => c.json({ ok: true }));
  api.use('/auth/login', rateLimit(20, 60_000));
  api.route('/auth', createAuthRoutes(db));

  // Owner-only organization settings (branches, roles).
  const org = new Hono();
  org.use('*', requireAuth(db));
  org.route('/', createOrgRoutes(db));
  api.route('/org', org);
  // You (hosting many customers): the platform console.
  api.route('/platform', createPlatformRoutes(db));

  // Everything inside a branch: signed in + member of that branch.
  const b = new Hono<BranchEnv>();
  b.use('*', requireAuth(db), branchContext(db));

  b.get('/dashboard', requirePermission('dashboard.view'), async (c) => {
    const branchId = c.get('branch').id;
    const base = and(eq(patient.branchId, branchId), isNull(patient.deletedAt));
    // Days are counted in the server's local time (the clinic PC's timezone), not UTC.
    const localDay = sql<string>`date(${patient.createdAt}, 'localtime')`;
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(patient).where(base);
    const rows = await db
      .select({ day: localDay, count: sql<number>`count(*)` })
      .from(patient)
      .where(and(base, gte(localDay, sql`date('now', 'localtime', '-13 days')`)))
      .groupBy(localDay);
    const byDay = new Map(rows.map((r) => [r.day, r.count]));
    const { today } = (await db.get<{ today: string }>(sql`select date('now', 'localtime') as today`))!;
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (13 - i));
      const day = d.toISOString().slice(0, 10);
      return { day, count: byDay.get(day) ?? 0 };
    });
    const recent = await db
      .select({ id: patient.id, uhid: patient.uhid, name: patient.name, phone: patient.phone, gender: patient.gender, createdAt: patient.createdAt })
      .from(patient)
      .where(base)
      .orderBy(desc(patient.id))
      .limit(5);
    const visitsToday = await db
      .select({ status: opVisit.status, count: sql<number>`count(*)` })
      .from(opVisit)
      .where(and(eq(opVisit.branchId, branchId), isNull(opVisit.deletedAt), eq(opVisit.visitDate, today)))
      .groupBy(opVisit.status);
    const opToday = Object.fromEntries(visitsToday.map((v) => [v.status, v.count])) as Record<string, number>;

    // Owner's daily view. Everyone has dashboard.view, so each part needs its own permission (else null).
    const can = (p: Permission) => c.get('branch').permissions.includes(p);

    // Money received today: OP bill payments + pharmacy sales, by mode. (Vendor payments are money out.)
    let collectionToday: { cashPaise: number; upiPaise: number; cardPaise: number; totalPaise: number } | null = null;
    if (can('billing.receive')) {
      const onToday = (col: AnyColumn) => sql`date(${col}, 'localtime') = ${today}`;
      const billRows = await db
        .select({ mode: billPayment.mode, sum: sql<number>`sum(${billPayment.amountPaise})` })
        .from(billPayment)
        .where(and(eq(billPayment.branchId, branchId), onToday(billPayment.receivedAt)))
        .groupBy(billPayment.mode);
      const saleRows = await db
        .select({ mode: pharmacySale.paymentMode, sum: sql<number>`sum(${pharmacySale.totalPaise})` })
        .from(pharmacySale)
        .where(and(eq(pharmacySale.branchId, branchId), onToday(pharmacySale.createdAt)))
        .groupBy(pharmacySale.paymentMode);
      const m = { cash: 0, upi: 0, card: 0 };
      for (const r of [...billRows, ...saleRows]) m[r.mode] += r.sum;
      collectionToday = { cashPaise: m.cash, upiPaise: m.upi, cardPaise: m.card, totalPaise: m.cash + m.upi + m.card };
    }

    // Lab orders not finished yet (same as the lab queue).
    let labPending: number | null = null;
    if (can('lab.view')) {
      const [r] = await db
        .select({ n: sql<number>`count(*)` })
        .from(labOrder)
        .where(and(eq(labOrder.branchId, branchId), inArray(labOrder.status, ['ordered', 'sample_collected'])));
      labPending = r!.n;
    }

    let stock = null;
    if (can('inventory.view')) {
      const low = (await medicinesWithStock(db, branchId, today)).filter((m) => m.stock <= m.reorderLevel).sort((a, b) => a.stock - b.stock);
      // Batches with units left that expire within the next NEAR_EXPIRY_DAYS (already expired ones don't count).
      const expiring = and(
        eq(medicineBatch.branchId, branchId),
        eq(medicine.branchId, branchId),
        isNull(medicine.deletedAt),
        gt(medicineBatch.quantity, 0),
        gte(medicineBatch.expiryDate, today),
        lte(medicineBatch.expiryDate, sql`date(${today}, ${`+${NEAR_EXPIRY_DAYS} days`})`),
      );
      const [{ nearExpiryCount }] = await db
        .select({ nearExpiryCount: sql<number>`count(*)` })
        .from(medicineBatch)
        .innerJoin(medicine, eq(medicine.id, medicineBatch.medicineId))
        .where(expiring);
      const nearExpiry = await db
        .select({ medicineId: medicine.id, name: medicine.name, strength: medicine.strength, batchNo: medicineBatch.batchNo, expiryDate: medicineBatch.expiryDate, quantity: medicineBatch.quantity })
        .from(medicineBatch)
        .innerJoin(medicine, eq(medicine.id, medicineBatch.medicineId))
        .where(expiring)
        .orderBy(asc(medicineBatch.expiryDate), asc(medicineBatch.id))
        .limit(DASHBOARD_LIST_SIZE);
      stock = {
        lowStockCount: low.length,
        lowStock: low.slice(0, DASHBOARD_LIST_SIZE).map((m) => ({ id: m.id, name: m.name, strength: m.strength, stock: m.stock, reorderLevel: m.reorderLevel })),
        nearExpiryCount,
        nearExpiry,
      };
    }

    return c.json({
      patients: total,
      newPatientsToday: byDay.get(today) ?? 0,
      opVisitsToday: (opToday.waiting ?? 0) + (opToday.completed ?? 0),
      opWaiting: opToday.waiting ?? 0,
      last14Days,
      recent,
      collectionToday,
      labPending,
      stock,
    });
  });
  b.route('/', createStaffRoutes(db));
  b.route('/', createBranchSettingsRoutes(db));
  b.route('/', createVisitRoutes(db));
  b.route('/', createDoctorRoutes(db));
  b.route('/', createPharmacyRoutes(db));
  b.route('/', createLabRoutes(db));
  b.route('/', createVendorRoutes(db));
  b.route('/', createBillingRoutes(db));
  b.route('/patients', createPatientRoutes(db));

  api.route('/b/:branch', b);
  app.route('/api', api);
  return app;
}
