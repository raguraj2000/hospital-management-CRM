// Settings screens every product needs: staff per branch, branches and roles (owner).
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ADMIN_ONLY_PERMISSIONS,
  ADMIN_ROLE_KEY,
  branchInputSchema,
  EMPTY_PRINT_HEADER,
  printHeaderSchema,
  type PrintHeader,
  isPermission,
  newStaffSchema,
  ownerDetailsSchema,
  resetPasswordSchema,
  rolePermissionsSchema,
  updateBranchSchema,
  updateStaffSchema,
  type BranchInfo,
  type RoleInfo,
  type StaffMember,
} from '@platform/shared';
import type { Db } from './db/index.js';
import { branch, branchMember, organization, role, rolePermission, user } from './db/schema.js';
import { AppError, notFound, validationError } from './errors.js';
import { hashPassword } from './password.js';
import { meResponse, permissionsForRole, requireOwner, revokeUserSessions, type AuthEnv } from './auth.js';
import { requirePermission, type BranchEnv } from './branch.js';
import { writeAudit } from './audit.js';

async function rolesOf(db: Db, organizationId: number): Promise<RoleInfo[]> {
  const rows = await db.select({ id: role.id, key: role.key, name: role.name }).from(role).where(eq(role.organizationId, organizationId)).orderBy(role.id);
  return Promise.all(rows.map(async (r) => ({ ...r, permissions: await permissionsForRole(db, r.id) })));
}

async function roleInOrg(db: Db, organizationId: number, roleId: number) {
  const [r] = await db.select({ id: role.id }).from(role).where(and(eq(role.id, roleId), eq(role.organizationId, organizationId)));
  if (!r) throw new AppError(400, 'validation', 'Choose a role', { roleId: ['Choose a role'] });
}

// ---------------------------------------------------------------------------
// Staff of ONE branch: mount under /b/:branch (after branchContext).
// ---------------------------------------------------------------------------

export function createStaffRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  // Guard each route (not app.use('*')): this app is mounted at the branch root,
  // and a '*' middleware would leak onto every other branch route.
  const manage = requirePermission('users.manage');

  const staffColumns = {
    userId: user.id,
    name: user.name,
    mobile: sql<string>`coalesce(${user.mobile}, ${user.username})`,
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    addedAt: branchMember.createdAt,
    isActive: user.isActive,
  };

  /** A staff member of this branch that the caller may change (not themselves, not the owner). */
  async function target(branchId: number, callerId: number, userId: number, opts: { allowInactive?: boolean } = {}) {
    if (!Number.isInteger(userId)) throw notFound('Staff member not found');
    if (userId === callerId) throw new AppError(400, 'self', "You can't change your own access here");
    const [m] = await db
      .select({ memberId: branchMember.id, isOwner: user.isOwner, organizationId: user.organizationId })
      .from(branchMember)
      .innerJoin(user, eq(user.id, branchMember.userId))
      .where(
        and(
          eq(branchMember.branchId, branchId),
          eq(branchMember.userId, userId),
          eq(branchMember.isActive, true),
          opts.allowInactive ? undefined : eq(user.isActive, true),
        ),
      );
    if (!m || m.isOwner) throw notFound('Staff member not found');
    return m;
  }

  /**
   * Account-wide changes (password, name) affect every branch the person works in.
   * Allowed only for the owner, or a caller who manages staff in ALL of those branches --
   * otherwise a branch admin could take over someone's access to another branch.
   */
  async function assertManagesEveryBranchOf(callerId: number, callerIsOwner: boolean, userId: number) {
    if (callerIsOwner) return;
    const theirs = await db
      .select({ branchId: branchMember.branchId })
      .from(branchMember)
      .where(and(eq(branchMember.userId, userId), eq(branchMember.isActive, true)));
    for (const { branchId } of theirs) {
      const [mine] = await db
        .select({ roleId: branchMember.roleId })
        .from(branchMember)
        .where(and(eq(branchMember.userId, callerId), eq(branchMember.branchId, branchId), eq(branchMember.isActive, true)));
      if (!mine || !(await permissionsForRole(db, mine.roleId)).includes('users.manage')) {
        throw new AppError(403, 'other_branch', 'This person also works in another branch. Only the owner can change their account.');
      }
    }
  }

  app.get('/roles', manage, async (c) => c.json({ roles: await rolesOf(db, c.get('user').organizationId) }));

  app.get('/staff', manage, async (c) => {
    const staff: StaffMember[] = await db
      .select(staffColumns)
      .from(branchMember)
      .innerJoin(user, eq(user.id, branchMember.userId))
      .innerJoin(role, eq(role.id, branchMember.roleId))
      .where(and(eq(branchMember.branchId, c.get('branch').id), eq(branchMember.isActive, true)))
      .orderBy(desc(user.isActive), user.name);
    return c.json({ staff });
  });

  app.post('/staff', manage, async (c) => {
    const parsed = newStaffSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const { name, mobile, password, roleId } = parsed.data;
    const me = c.get('user');
    const b = c.get('branch');
    await roleInOrg(db, me.organizationId, roleId);
    // One mobile = one account everywhere (it's the login id).
    const [taken] = await db.select({ id: user.id }).from(user).where(or(eq(user.mobile, mobile), eq(user.username, mobile)));
    if (taken) throw new AppError(409, 'mobile_taken', 'This mobile number already has an account', { mobile: ['This mobile number already has an account'] });

    const passwordHash = await hashPassword(password);
    const created = await db.transaction(async (tx) => {
      const [u] = await tx.insert(user).values({ organizationId: me.organizationId, username: mobile, mobile, name, passwordHash }).returning({ id: user.id });
      await tx.insert(branchMember).values({ branchId: b.id, userId: u.id, roleId });
      await writeAudit(tx, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'create', entity: 'staff', entityId: u.id, detail: { mobile, roleId } });
      return u;
    });
    return c.json({ userId: created.id }, 201);
  });

  app.patch('/staff/:userId', manage, async (c) => {
    const parsed = updateStaffSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const b = c.get('branch');
    const userId = Number(c.req.param('userId'));
    const m = await target(b.id, me.id, userId);
    if (parsed.data.roleId) {
      await roleInOrg(db, me.organizationId, parsed.data.roleId);
      await db.update(branchMember).set({ roleId: parsed.data.roleId, updatedAt: new Date().toISOString() }).where(eq(branchMember.id, m.memberId));
    }
    if (parsed.data.name) await assertManagesEveryBranchOf(me.id, me.isOwner, userId);
    if (parsed.data.name) await db.update(user).set({ name: parsed.data.name, updatedAt: new Date().toISOString() }).where(eq(user.id, userId));
    await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'update', entity: 'staff', entityId: userId, detail: parsed.data });
    return c.json({ ok: true });
  });

  /**
   * Deactivate = the account can't sign in anywhere and is signed out now (records stay).
   * Activate = can sign in again. Account-wide, so the same rule as password reset applies.
   */
  for (const action of ['activate', 'deactivate'] as const) {
    app.post(`/staff/:userId/${action}`, manage, async (c) => {
      const me = c.get('user');
      const b = c.get('branch');
      const userId = Number(c.req.param('userId'));
      await target(b.id, me.id, userId, { allowInactive: true });
      await assertManagesEveryBranchOf(me.id, me.isOwner, userId);
      await db.update(user).set({ isActive: action === 'activate', failedLogins: 0, lockedUntil: null, updatedAt: new Date().toISOString() }).where(eq(user.id, userId));
      if (action === 'deactivate') await revokeUserSessions(db, userId);
      await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action, entity: 'staff', entityId: userId });
      return c.json({ ok: true });
    });
  }

  app.post('/staff/:userId/reset-password', manage, async (c) => {
    const parsed = resetPasswordSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const b = c.get('branch');
    const userId = Number(c.req.param('userId'));
    await target(b.id, me.id, userId);
    await assertManagesEveryBranchOf(me.id, me.isOwner, userId);
    await db
      .update(user)
      .set({ passwordHash: await hashPassword(parsed.data.password), failedLogins: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
      .where(eq(user.id, userId));
    await revokeUserSessions(db, userId); // signed out everywhere; they log in with the new password
    await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'reset_password', entity: 'staff', entityId: userId });
    return c.json({ ok: true });
  });

  /** Remove from THIS branch (the account stays; other branches are untouched). */
  app.delete('/staff/:userId', manage, async (c) => {
    const me = c.get('user');
    const b = c.get('branch');
    const userId = Number(c.req.param('userId'));
    const m = await target(b.id, me.id, userId);
    await db.update(branchMember).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(branchMember.id, m.memberId));
    const [left] = await db
      .select({ n: sql<number>`count(*)` })
      .from(branchMember)
      .where(and(eq(branchMember.userId, userId), eq(branchMember.isActive, true)));
    if (left.n === 0) await revokeUserSessions(db, userId); // no branch left: sign them out now
    await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'remove', entity: 'staff', entityId: userId });
    return c.json({ ok: true });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Organization: branches + roles. Owner only. Mount under /org (after requireAuth).
// ---------------------------------------------------------------------------

export function createOrgRoutes(db: Db) {
  const app = new Hono<AuthEnv>();
  app.use('*', requireOwner());

  app.get('/branches', async (c) => {
    const orgId = c.get('user').organizationId;
    const rows = await db.select().from(branch).where(eq(branch.organizationId, orgId)).orderBy(branch.id);
    const counts = await db
      .select({ branchId: branchMember.branchId, n: sql<number>`count(*)` })
      .from(branchMember)
      .innerJoin(user, eq(user.id, branchMember.userId))
      .where(and(eq(branchMember.isActive, true), eq(user.isActive, true), rows.length ? inArray(branchMember.branchId, rows.map((r) => r.id)) : sql`0`))
      .groupBy(branchMember.branchId);
    const byBranch = new Map(counts.map((r) => [r.branchId, r.n]));
    const branches: BranchInfo[] = rows.map((b) => ({ id: b.id, slug: b.slug, name: b.name, address: b.address, phone: b.phone, isActive: b.isActive, staffCount: byBranch.get(b.id) ?? 0 }));
    return c.json({ branches });
  });

  app.post('/branches', async (c) => {
    const parsed = branchInputSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const [taken] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, me.organizationId), eq(branch.slug, parsed.data.slug)));
    if (taken) throw new AppError(409, 'slug_taken', 'Another branch uses that address', { slug: ['Another branch uses that address'] });
    const [b] = await db
      .insert(branch)
      .values({ ...parsed.data, organizationId: me.organizationId, codePrefix: parsed.data.slug.replace(/-/g, '').toUpperCase().slice(0, 6) })
      .returning({ id: branch.id, slug: branch.slug });
    await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'create', entity: 'branch', entityId: b.id, detail: parsed.data });
    return c.json({ branch: b }, 201);
  });

  app.patch('/branches/:id', async (c) => {
    const parsed = updateBranchSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const id = Number(c.req.param('id'));
    const [b] = await db
      .update(branch)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(and(eq(branch.id, id), eq(branch.organizationId, me.organizationId)))
      .returning({ id: branch.id });
    if (!b) throw notFound('Branch not found');
    await writeAudit(db, { organizationId: me.organizationId, branchId: id, userId: me.id, action: 'update', entity: 'branch', entityId: id, detail: parsed.data });
    return c.json({ ok: true });
  });

  app.get('/roles', async (c) => c.json({ roles: await rolesOf(db, c.get('user').organizationId) }));

  /** Replace a role's permissions (the tick boxes in Settings → Roles). */
  app.put('/roles/:id/permissions', async (c) => {
    const parsed = rolePermissionsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const id = Number(c.req.param('id'));
    const [r] = await db.select({ id: role.id, key: role.key }).from(role).where(and(eq(role.id, id), eq(role.organizationId, me.organizationId)));
    if (!r) throw notFound('Role not found');
    // Managing staff and roles stays with the Branch admin role (and the owner) -- never other roles.
    const adminOnly: readonly string[] = ADMIN_ONLY_PERMISSIONS;
    const permissions = [...new Set(parsed.data.permissions.filter(isPermission))].filter((p) => r.key === ADMIN_ROLE_KEY || !adminOnly.includes(p));
    await db.transaction(async (tx) => {
      await tx.delete(rolePermission).where(eq(rolePermission.roleId, id));
      if (permissions.length) await tx.insert(rolePermission).values(permissions.map((permission) => ({ roleId: id, permission })));
      await writeAudit(tx, { organizationId: me.organizationId, userId: me.id, action: 'update_permissions', entity: 'role', entityId: id, detail: { permissions } });
    });
    return c.json({ ok: true, permissions });
  });

  /** The owner's own name and login mobile, and the organization's name (Settings → Owner). */
  app.patch('/owner', async (c) => {
    const parsed = ownerDetailsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const { name, mobile, organizationName } = parsed.data;
    const me = c.get('user');
    // One mobile = one account everywhere (it's the login id).
    const [taken] = await db.select({ id: user.id }).from(user).where(and(ne(user.id, me.id), or(eq(user.mobile, mobile), eq(user.username, mobile))));
    if (taken) throw new AppError(400, 'validation', 'This mobile number already has an account', { mobile: ['This mobile number already has an account'] });

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      // username follows the mobile (as on every new account), so the old number is free to use again.
      await tx.update(user).set({ name, mobile, username: mobile, updatedAt: now }).where(eq(user.id, me.id));
      await tx.update(organization).set({ name: organizationName, updatedAt: now }).where(eq(organization.id, me.organizationId));
      await writeAudit(tx, { organizationId: me.organizationId, userId: me.id, action: 'update', entity: 'owner', entityId: me.id, detail: parsed.data });
    });
    // Sessions are keyed by user id, so this one keeps working with the new mobile.
    return c.json(await meResponse(db, { ...me, name, mobile }));
  });

  return app;
}

// ---------------------------------------------------------------------------
// Print header of ONE branch (logo, name, address, doctors, signatures).
// Read by any member (reports print it); changed with settings.manage.
// ---------------------------------------------------------------------------

export async function printHeaderOf(db: Db, branchId: number): Promise<PrintHeader> {
  const [b] = await db.select({ name: branch.name, address: branch.address, phone: branch.phone, printHeader: branch.printHeader }).from(branch).where(eq(branch.id, branchId));
  if (!b) throw notFound('Branch not found');
  if (b.printHeader) {
    const parsed = printHeaderSchema.safeParse(JSON.parse(b.printHeader));
    if (parsed.success) return parsed.data;
  }
  // Not set up yet: start from the branch's own name and contact details.
  return { ...EMPTY_PRINT_HEADER, title: b.name, address: b.address ?? '', phone: b.phone ?? '' };
}

export function createBranchSettingsRoutes(db: Db) {
  const app = new Hono<BranchEnv>();

  app.get('/print-header', async (c) => c.json({ header: await printHeaderOf(db, c.get('branch').id) }));

  app.put('/print-header', requirePermission('settings.manage'), async (c) => {
    const parsed = printHeaderSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw validationError(parsed.error);
    const me = c.get('user');
    const b = c.get('branch');
    await db.update(branch).set({ printHeader: JSON.stringify(parsed.data), updatedAt: new Date().toISOString() }).where(eq(branch.id, b.id));
    const { logo: _l, leftSignImage: _a, rightSignImage: _b, ...detail } = parsed.data; // keep images out of the audit log
    await writeAudit(db, { organizationId: me.organizationId, branchId: b.id, userId: me.id, action: 'update', entity: 'print_header', entityId: b.id, detail });
    return c.json({ header: parsed.data });
  });

  return app;
}
