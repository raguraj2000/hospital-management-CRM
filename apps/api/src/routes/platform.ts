// Platform console (you, hosting many customers): list / create / suspend customers.
// A platform admin manages customers only -- they have no branches, so no patient data.
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { addDaysIso, customerUpdateSchema, newCustomerSchema, ownerChangeSchema, ownerPasswordResetSchema, periodEnd, platformPaymentSchema, type Customer, type OwnerHelp, type PlatformPayment } from '@platform/shared';
import { AppError, hashPassword, notFound, orgLimits, requireAuth, revokeUserSessions, validationError, writeAudit, type AuthEnv, type Db } from '@platform/core';
import { branch, organization, patient, platformPayment, session, user } from '../db/schema.js';
import { seedOrganization } from '../seed.js';

const requirePlatformAdmin = (): MiddlewareHandler<AuthEnv> => async (c, next) => {
  if (!c.get('user').isPlatformAdmin) throw new AppError(403, 'forbidden', 'Platform admins only');
  await next();
};

export function createPlatformRoutes(db: Db) {
  const app = new Hono<AuthEnv>();
  app.use('*', requireAuth(db), requirePlatformAdmin());

  /** Customer = any organization except the platform's own. */
  const customersOnly = () => ne(organization.id, sql`(select ${user.organizationId} from ${user} where ${user.isPlatformAdmin} = 1 limit 1)`);

  app.get('/customers', async (c) => {
    const orgs = await db.select().from(organization).where(customersOnly()).orderBy(organization.id);
    const ids = orgs.map((o) => o.id);
    const count = async (table: typeof branch | typeof user, col: typeof branch.organizationId | typeof user.organizationId) =>
      ids.length ? new Map((await db.select({ id: col, n: sql<number>`count(*)` }).from(table).where(inArray(col, ids)).groupBy(col)).map((r) => [r.id, r.n])) : new Map();
    const branches = await count(branch, branch.organizationId);
    const staff = await count(user, user.organizationId);
    const patients = ids.length
      ? new Map(
          (
            await db
              .select({ id: branch.organizationId, n: sql<number>`count(*)` })
              .from(patient)
              .innerJoin(branch, eq(branch.id, patient.branchId))
              .where(inArray(branch.organizationId, ids))
              .groupBy(branch.organizationId)
          ).map((r) => [r.id, r.n]),
        )
      : new Map();
    const owners = ids.length ? await db.select({ org: user.organizationId, name: user.name, mobile: user.mobile }).from(user).where(and(inArray(user.organizationId, ids), eq(user.isOwner, true))) : [];
    const customers: Customer[] = [];
    for (const o of orgs) {
      const owner = owners.find((x) => x.org === o.id);
      customers.push({
        id: o.id,
        name: o.name,
        idPrefix: o.idPrefix,
        isActive: o.isActive,
        createdAt: o.createdAt,
        branches: branches.get(o.id) ?? 0,
        staff: staff.get(o.id) ?? 0,
        patients: patients.get(o.id) ?? 0,
        ownerName: owner?.name ?? null,
        ownerMobile: owner?.mobile ?? null,
        ...(await orgLimits(db, o.id)),
        planName: o.planName,
        yearlyFeePaise: o.yearlyFeePaise,
        paidUntil: o.paidUntil,
        graceDays: o.graceDays,
      });
    }
    return c.json({ customers });
  });

  app.post('/customers', async (c) => {
    const parsed = newCustomerSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const d = parsed.data;
    const [taken] = await db.select({ id: user.id }).from(user).where(or(eq(user.mobile, d.ownerMobile), eq(user.username, d.ownerMobile)));
    if (taken) throw new AppError(409, 'mobile_taken', 'This mobile number already has an account', { ownerMobile: ['This mobile number already has an account'] });
    const r = await seedOrganization(db, {
      orgName: d.name,
      idPrefix: d.idPrefix,
      branchName: d.branchName,
      branchSlug: d.branchSlug,
      branchPrefix: d.branchSlug.replace(/-/g, '').toUpperCase().slice(0, 6),
      ownerMobile: d.ownerMobile,
      ownerName: d.ownerName,
      ownerPassword: d.ownerPassword,
    });
    // A new hospital starts with one branch; more on request (the platform admin raises it).
    await db.update(organization).set({ maxBranches: 1 }).where(eq(organization.id, r.org.id));
    const me = c.get('user');
    await writeAudit(db, { organizationId: me.organizationId, userId: me.id, action: 'create_customer', entity: 'organization', entityId: r.org.id, detail: { name: d.name, idPrefix: d.idPrefix } });
    return c.json({ id: r.org.id }, 201);
  });

  /** What one hospital may have (branches, staff, modules) and its plan. Takes effect on their next page load. */
  app.patch('/customers/:id', async (c) => {
    const parsed = customerUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const id = Number(c.req.param('id'));
    const [o] = await db.select({ id: organization.id }).from(organization).where(and(eq(organization.id, id), customersOnly()));
    if (!o) throw notFound('Customer not found');
    const { modulesOff, ...limits } = parsed.data;
    await db
      .update(organization)
      .set({ ...limits, ...(modulesOff ? { modulesOff: JSON.stringify([...new Set(modulesOff)]) } : {}), updatedAt: new Date().toISOString() })
      .where(eq(organization.id, id));
    const me = c.get('user');
    await writeAudit(db, { organizationId: me.organizationId, userId: me.id, action: 'update_limits', entity: 'organization', entityId: id, detail: parsed.data });
    return c.json({ ok: true, ...(await orgLimits(db, id)) });
  });

  // ---- Owner help: the owner forgot the password, is locked out, or the hospital has a new owner.
  const customerOf = async (id: number) => {
    const [o] = Number.isInteger(id) ? await db.select({ id: organization.id }).from(organization).where(and(eq(organization.id, id), customersOnly())) : [];
    if (!o) throw notFound('Customer not found');
    return o.id;
  };
  const ownerOf = async (orgId: number) => (await db.select().from(user).where(and(eq(user.organizationId, orgId), eq(user.isOwner, true))).limit(1))[0];

  app.get('/customers/:id/owner', async (c) => {
    const orgId = await customerOf(Number(c.req.param('id')));
    const o = await ownerOf(orgId);
    const [last] = o ? await db.select({ at: sql<string | null>`max(${session.createdAt})` }).from(session).where(eq(session.userId, o.id)) : [];
    const candidates = await db
      .select({ id: user.id, name: user.name, mobile: user.mobile })
      .from(user)
      .where(and(eq(user.organizationId, orgId), eq(user.isActive, true), eq(user.isOwner, false)))
      .orderBy(user.name);
    const help: OwnerHelp = { owner: o ? { id: o.id, name: o.name, mobile: o.mobile, lastSignInAt: last?.at ?? null, lockedUntil: o.lockedUntil } : null, candidates };
    return c.json(help);
  });

  /** A temporary password for the owner: also unlocks the account and signs the owner out everywhere. */
  app.post('/customers/:id/owner/password', async (c) => {
    const parsed = ownerPasswordResetSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const orgId = await customerOf(Number(c.req.param('id')));
    const o = await ownerOf(orgId);
    if (!o) throw notFound('This hospital has no owner');
    await db.update(user).set({ passwordHash: await hashPassword(parsed.data.password), failedLogins: 0, lockedUntil: null, updatedAt: new Date().toISOString() }).where(eq(user.id, o.id));
    await revokeUserSessions(db, o.id);
    const me = c.get('user');
    await writeAudit(db, { organizationId: me.organizationId, userId: me.id, action: 'reset_owner_password', entity: 'user', entityId: o.id, detail: { organizationId: orgId } });
    return c.json({ ok: true });
  });

  /**
   * Another person of the hospital becomes its owner (one owner per hospital). The old owner keeps the account
   * but no longer has the owner's rights; both are signed out so the change shows at once.
   */
  app.put('/customers/:id/owner', async (c) => {
    const parsed = ownerChangeSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const orgId = await customerOf(Number(c.req.param('id')));
    const [next] = await db.select({ id: user.id, isActive: user.isActive, isOwner: user.isOwner }).from(user).where(and(eq(user.id, parsed.data.userId), eq(user.organizationId, orgId)));
    // Someone of another hospital answers like a missing person.
    if (!next) throw notFound('Person not found in this hospital');
    if (next.isOwner) throw new AppError(409, 'already_owner', 'This person is already the owner');
    if (!next.isActive) throw new AppError(409, 'inactive', 'This account is deactivated. Activate it first.');
    const old = await ownerOf(orgId);
    await db.transaction(async (tx) => {
      if (old) await tx.update(user).set({ isOwner: false, updatedAt: new Date().toISOString() }).where(eq(user.id, old.id));
      await tx.update(user).set({ isOwner: true, updatedAt: new Date().toISOString() }).where(eq(user.id, next.id));
      const me = c.get('user');
      await writeAudit(tx, { organizationId: me.organizationId, userId: me.id, action: 'change_owner', entity: 'organization', entityId: orgId, detail: { from: old?.id ?? null, to: next.id } });
    });
    if (old) await revokeUserSessions(db, old.id);
    await revokeUserSessions(db, next.id);
    return c.json({ ok: true });
  });

  /** Payments of one hospital, newest first. */
  app.get('/customers/:id/payments', async (c) => {
    const id = Number(c.req.param('id'));
    const [o] = await db.select({ id: organization.id }).from(organization).where(and(eq(organization.id, id), customersOnly()));
    if (!o) throw notFound('Customer not found');
    const payments: PlatformPayment[] = await db
      .select({ id: platformPayment.id, amountPaise: platformPayment.amountPaise, paidOn: platformPayment.paidOn, periodFrom: platformPayment.periodFrom, periodTo: platformPayment.periodTo, note: platformPayment.note, createdAt: platformPayment.createdAt })
      .from(platformPayment)
      .where(eq(platformPayment.organizationId, id))
      .orderBy(desc(platformPayment.id));
    return c.json({ payments });
  });

  /**
   * "Mark paid": the years paid continue from the end of the last paid period (no day lost or paid twice);
   * when it ended long ago (or never was), from the day of payment. Does not switch a suspended hospital on.
   */
  app.post('/customers/:id/payments', async (c) => {
    const parsed = platformPaymentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const id = Number(c.req.param('id'));
    const [o] = await db.select({ id: organization.id, paidUntil: organization.paidUntil, graceDays: organization.graceDays }).from(organization).where(and(eq(organization.id, id), customersOnly()));
    if (!o) throw notFound('Customer not found');
    const { amountPaise, years, paidOn, note } = parsed.data;
    // Paid within the grace days: continues the period. Paid later: starts again on the day of payment.
    const continues = o.paidUntil != null && addDaysIso(o.paidUntil, o.graceDays + 1) > paidOn;
    const periodFrom = continues ? addDaysIso(o.paidUntil!, 1) : paidOn;
    const periodTo = periodEnd(periodFrom, years * 12);
    const me = c.get('user');
    const payment = await db.transaction(async (tx) => {
      const [p] = await tx.insert(platformPayment).values({ organizationId: id, amountPaise, paidOn, periodFrom, periodTo, note: note || null, createdBy: me.id }).returning({ id: platformPayment.id });
      await tx.update(organization).set({ paidUntil: periodTo, updatedAt: new Date().toISOString() }).where(eq(organization.id, id));
      await writeAudit(tx, { organizationId: me.organizationId, userId: me.id, action: 'record_payment', entity: 'organization', entityId: id, detail: { amountPaise, years, paidOn, periodFrom, periodTo } });
      return p!;
    });
    return c.json({ id: payment.id, periodFrom, periodTo }, 201);
  });

  for (const action of ['suspend', 'activate'] as const) {
    app.post(`/customers/:id/${action}`, async (c) => {
      const id = Number(c.req.param('id'));
      const [o] = await db.select({ id: organization.id }).from(organization).where(and(eq(organization.id, id), customersOnly()));
      if (!o) throw notFound('Customer not found');
      await db.update(organization).set({ isActive: action === 'activate', updatedAt: new Date().toISOString() }).where(eq(organization.id, id));
      if (action === 'suspend') for (const u of await db.select({ id: user.id }).from(user).where(eq(user.organizationId, id))) await revokeUserSessions(db, u.id);
      const me = c.get('user');
      await writeAudit(db, { organizationId: me.organizationId, userId: me.id, action, entity: 'organization', entityId: id });
      return c.json({ ok: true });
    });
  }

  return app;
}
