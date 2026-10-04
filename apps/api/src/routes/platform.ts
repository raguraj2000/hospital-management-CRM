// Platform console (you, hosting many customers): list / create / suspend customers.
// A platform admin manages customers only -- they have no branches, so no patient data.
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { newCustomerSchema, type Customer } from '@platform/shared';
import { AppError, notFound, requireAuth, revokeUserSessions, validationError, writeAudit, type AuthEnv, type Db } from '@platform/core';
import { branch, organization, patient, user } from '../db/schema.js';
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
    const customers: Customer[] = orgs.map((o) => {
      const owner = owners.find((x) => x.org === o.id);
      return {
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
      };
    });
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
    const me = c.get('user');
    await writeAudit(db, { organizationId: me.organizationId, userId: me.id, action: 'create_customer', entity: 'organization', entityId: r.org.id, detail: { name: d.name, idPrefix: d.idPrefix } });
    return c.json({ id: r.org.id }, 201);
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
