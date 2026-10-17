import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, sql, type AnyColumn } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
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
import { billPayment, labOrder, medicine, medicineBatch, opBill, opVisit, patient, pharmacySale, treatmentDose } from './db/schema.js';
import { visitsToCollect } from './lib/clinic.js';
import { AUDIT_KEEP_DAYS } from './lib/audit-retention.js';
import { createPatientRoutes } from './routes/patients.js';
import { createTreatmentRoutes } from './routes/treatments.js';
import { createBookmarkRoutes } from './routes/bookmarks.js';
import { createVisitRoutes } from './routes/visits.js';
import { createDoctorRoutes } from './routes/doctors.js';
import { createPharmacyRoutes, medicinesWithStock } from './routes/pharmacy.js';
import { createLabRoutes } from './routes/lab.js';
import { createVendorRoutes } from './routes/vendors.js';
import { createBillingRoutes, navCountsOn } from './routes/billing.js';
import { createCheckoutRoutes } from './routes/checkout.js';
import { createBackupRoutes } from './routes/backup.js';
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
  // Nothing sent to the API is larger than a few MB (a logo is at most 300 KB), except a database being restored.
  const limitBody = bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => c.json({ error: 'That is too large to send', code: 'too_large' }, 413) });
  app.use('/api/*', (c, next) => (c.req.path.endsWith('/restore') ? next() : limitBody(c, next)));

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
    // Days are counted in India time (IST), whatever time zone the server computer is set to.
    const localDay = sql<string>`date(${patient.createdAt}, '+330 minutes')`;
    const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(patient).where(base);
    const rows = await db
      .select({ day: localDay, count: sql<number>`count(*)` })
      .from(patient)
      .where(and(base, gte(localDay, sql`date('now', '+330 minutes', '-13 days')`)))
      .groupBy(localDay);
    const byDay = new Map(rows.map((r) => [r.day, r.count]));
    const { today } = (await db.get<{ today: string }>(sql`select date('now', '+330 minutes') as today`))!;
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
      const onToday = (col: AnyColumn) => sql`date(${col}, '+330 minutes') = ${today}`;
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

    // Bills not fully paid yet, whatever their date (same bills as Billing > Pending payments).
    let pendingDues: { totalPaise: number; count: number } | null = null;
    if (can('billing.receive')) {
      const r = await db.get<{ n: number; paise: number | null }>(
        sql`select count(*) as n, sum(t.due) as paise from (select ${opBill.totalPaise} - coalesce((select sum(${billPayment.amountPaise}) from ${billPayment} where ${billPayment.billId} = ${opBill.id}), 0) as due from ${opBill} where ${opBill.branchId} = ${branchId}) t where t.due > 0`,
      );
      pendingDues = { totalPaise: r?.paise ?? 0, count: r?.n ?? 0 };
    }

    // Lab orders not finished yet (same as the lab queue).
    let labPending: number | null = null;
    if (can('lab.view')) {
      const [r] = await db
        .select({ n: sql<number>`count(*)` })
        .from(labOrder)
        .innerJoin(opVisit, eq(opVisit.id, labOrder.visitId))
        .where(and(eq(labOrder.branchId, branchId), inArray(labOrder.status, ['ordered', 'sample_collected']), isNull(opVisit.deletedAt), sql`${opVisit.status} <> 'cancelled'`));
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
      // Everyone who came today, wherever they are now (with the doctor, at the lab, at the counter...): all but cancelled.
      opVisitsToday: Object.entries(opToday).reduce((sum, [status, count]) => (status === 'cancelled' ? sum : sum + count), 0),
      opWaiting: opToday.waiting ?? 0,
      last14Days,
      recent,
      collectionToday,
      pendingDues,
      labPending,
      stock,
    });
  });
  /**
   * The numbers next to the side menu: what is waiting on each page right now. Each one only for a role that may
   * open that page (else it is left out).
   */
  b.get('/nav-counts', async (c) => {
    const branchId = c.get('branch').id;
    const can = (p: Permission) => c.get('branch').permissions.includes(p);
    const { today } = (await db.get<{ today: string }>(sql`select date('now', '+330 minutes') as today`))!;
    const n = sql<number>`count(*)`;
    const counts: Record<string, number> = {};
    // Switched off in Settings: nothing is counted, and the screens stop asking.
    if (!(await navCountsOn(db, branchId))) return c.json({ enabled: false, counts });
    if (can('patient.view')) {
      // Today's patients still waiting, with the doctor or at the lab.
      const [r] = await db.select({ n }).from(opVisit).where(and(eq(opVisit.branchId, branchId), isNull(opVisit.deletedAt), eq(opVisit.visitDate, today), inArray(opVisit.status, ['waiting', 'with_doctor', 'at_lab'])));
      counts.visits = r!.n;
    }
    if (can('billing.receive') || can('pharmacy.sell')) {
      const rows = await visitsToCollect(db, branchId, today);
      if (can('billing.receive')) counts.billing = rows.filter((v) => v.billCount === 0 || v.unbilledLabCount > 0 || v.waitingChargeCount > 0 || v.balancePaise > 0 || (can('pharmacy.sell') && v.medicinesWaiting > 0)).length;
      if (can('pharmacy.sell')) counts.pharmacy = rows.filter((v) => v.medicinesWaiting > 0).length;
    }
    if (can('lab.view')) {
      const [r] = await db
        .select({ n })
        .from(labOrder)
        .innerJoin(opVisit, eq(opVisit.id, labOrder.visitId))
        .where(and(eq(labOrder.branchId, branchId), inArray(labOrder.status, ['ordered', 'sample_collected']), isNull(opVisit.deletedAt), sql`${opVisit.status} <> 'cancelled'`));
      counts.lab = r!.n;
    }
    if (can('treatment.give')) {
      const [r] = await db.select({ n }).from(treatmentDose).where(and(eq(treatmentDose.branchId, branchId), eq(treatmentDose.dueDate, today), isNull(treatmentDose.givenAt)));
      counts.treatments = r!.n;
    }
    return c.json({ enabled: true, counts });
  });
  /**
   * The history log of this branch (and of the hospital as a whole), newest first: ?days=1|7|30, ?q= text,
   * ?userId=, ?entity=, paged. Only with audit.view (the owner). Entries older than AUDIT_KEEP_DAYS are gone.
   */
  b.get('/audit', requirePermission('audit.view'), async (c) => {
    const br = c.get('branch');
    const u = c.get('user');
    const days = Math.min(Math.max(Math.floor(Number(c.req.query('days')) || 7), 1), AUDIT_KEEP_DAYS);
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 200);
    const offset = Math.max(Number(c.req.query('offset')) || 0, 0);
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    const userId = Number(c.req.query('userId'));
    const entity = (c.req.query('entity') ?? '').trim();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    // This branch's entries, and the hospital-wide ones (no branch) of the same hospital. Never another hospital's.
    const mine = sql`a.organization_id = ${u.organizationId} and (a.branch_id = ${br.id} or a.branch_id is null) and a.created_at >= ${since}`;
    const where = sql`${mine}${Number.isInteger(userId) && userId > 0 ? sql` and a.user_id = ${userId}` : sql``}${entity ? sql` and a.entity = ${entity}` : sql``}${
      q ? sql` and (instr(lower(coalesce(a.detail, '')), ${q}) > 0 or instr(lower(a.action), ${q}) > 0 or instr(lower(a.entity), ${q}) > 0 or instr(lower(coalesce(a.entity_id, '')), ${q}) > 0 or instr(lower(coalesce(us.name, '')), ${q}) > 0 or instr(lower(coalesce(pt.name, '')), ${q}) > 0 or instr(coalesce(pt.phone, ''), ${q}) > 0 or instr(lower(coalesce(pt.code, '')), ${q}) > 0)` : sql``
    }`;
    // The patient an entry is about, found from what the entry points at (always inside this branch).
    const patientOf = sql`(case a.entity
      when 'patient' then cast(a.entity_id as integer)
      when 'op_visit' then (select x.patient_id from op_visit x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'prescription' then (select x.patient_id from op_visit x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'lab_report' then (select x.patient_id from op_visit x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'op_bill' then (select x.patient_id from op_bill x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'pharmacy_sale' then (select x.patient_id from pharmacy_sale x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'lab_order' then (select x.patient_id from lab_order x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'treatment_dose' then (select x.patient_id from treatment_dose x where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'prescription_item' then (select v.patient_id from prescription_item x inner join op_visit v on v.id = x.visit_id where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'visit_charge' then (select v.patient_id from visit_charge x inner join op_visit v on v.id = x.visit_id where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
      when 'visit_instruction' then (select v.patient_id from visit_instruction x inner join op_visit v on v.id = x.visit_id where x.branch_id = ${br.id} and x.id = cast(a.entity_id as integer))
    end)`;
    const plain = sql`from audit_log a left join user us on us.id = a.user_id`;
    const from = sql`${plain} left join patient pt on a.branch_id = ${br.id} and pt.branch_id = ${br.id} and pt.id = ${patientOf}`;
    const rows = await db.all<{ id: number; at: string; userName: string | null; roleName: string | null; action: string; entity: string; entityId: string | null; detail: string | null; patientName: string | null; patientPhone: string | null; patientUhid: string | null }>(sql`
      select a.id as id, a.created_at as at, us.name as userName,
        case when us.is_owner = 1 then 'Owner' else (select r.name from branch_member m inner join role r on r.id = m.role_id where m.user_id = a.user_id and m.branch_id = ${br.id} limit 1) end as roleName,
        a.action as action, a.entity as entity, a.entity_id as entityId, a.detail as detail,
        pt.name as patientName, pt.phone as patientPhone, pt.code as patientUhid
      ${from} where ${where} order by a.id desc limit ${limit} offset ${offset}`);
    const [{ total }] = await db.all<{ total: number }>(sql`select count(*) as total ${q ? from : plain} where ${where}`);
    const people = await db.all<{ id: number; name: string }>(sql`select distinct us.id as id, us.name as name ${plain} where ${mine} and us.id is not null order by us.name`);
    const entities = (await db.all<{ entity: string }>(sql`select distinct a.entity as entity ${plain} where ${mine} order by a.entity`)).map((x) => x.entity);
    const parse = (d: string | null) => {
      if (d == null) return null;
      try {
        return JSON.parse(d) as unknown;
      } catch {
        return d;
      }
    };
    return c.json({ entries: rows.map((r) => ({ ...r, detail: parse(r.detail) })), total, keepDays: AUDIT_KEEP_DAYS, people, entities });
  });
  b.route('/', createStaffRoutes(db));
  b.route('/', createBranchSettingsRoutes(db));
  b.route('/', createVisitRoutes(db));
  b.route('/', createDoctorRoutes(db));
  b.route('/', createPharmacyRoutes(db));
  b.route('/', createLabRoutes(db));
  b.route('/', createVendorRoutes(db));
  b.route('/', createBillingRoutes(db));
  b.route('/', createCheckoutRoutes(db));
  b.route('/', createTreatmentRoutes(db));
  b.route('/', createBookmarkRoutes(db));
  b.route('/', createBackupRoutes(db));
  b.route('/patients', createPatientRoutes(db));

  api.route('/b/:branch', b);
  app.route('/api', api);
  return app;
}
