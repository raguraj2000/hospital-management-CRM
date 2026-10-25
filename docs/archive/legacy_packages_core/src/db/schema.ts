// Platform core tables -- the same for every product (clinic, school, ...).
// Product tables live in the app and carry a branch_id like `branchColumns`.
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const timestamps = {
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
};

export const organization = sqliteTable('organization', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  /** Prefix for organization-wide IDs, e.g. "AH" -> patient UHID AH000001. */
  idPrefix: text('id_prefix').notNull().default(''),
  /** Suspended customers can't sign in (platform admin switch). */
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  // ---- set by the platform admin (super admin panel); null = no limit / not used
  planName: text('plan_name'),
  yearlyFeePaise: integer('yearly_fee_paise').notNull().default(0),
  /** Paid up to and including this day (YYYY-MM-DD); null = not billed. */
  paidUntil: text('paid_until'),
  /** Days after paidUntil before the hospital is suspended (at midnight). */
  graceDays: integer('grace_days').notNull().default(7),
  maxBranches: integer('max_branches'),
  maxStaff: integer('max_staff'),
  /** JSON list of switched-off module keys (see MODULES in @platform/shared). */
  modulesOff: text('modules_off'),
  /** The owner allowed read-only support access until this moment (ISO). */
  supportUntil: text('support_until'),
  /** Offboarding: the hospital's data is deleted on this day (YYYY-MM-DD); null = not leaving. */
  deleteOn: text('delete_on'),
  ...timestamps,
});

/** Payments a hospital made to the platform (super admin panel). */
export const platformPayment = sqliteTable('platform_payment', {
  id: integer('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organization.id),
  amountPaise: integer('amount_paise').notNull(),
  paidOn: text('paid_on').notNull(),
  /** The months this payment covers (YYYY-MM-DD). */
  periodFrom: text('period_from').notNull(),
  periodTo: text('period_to').notNull(),
  note: text('note'),
  createdBy: integer('created_by').references(() => user.id),
  createdAt: timestamps.createdAt,
});

/** Organization-wide running numbers (IDs that must never repeat across branches, e.g. UHID). */
export const orgCounter = sqliteTable(
  'org_counter',
  {
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organization.id),
    name: text('name').notNull(),
    value: integer('value').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.name] })],
);

export const branch = sqliteTable(
  'branch',
  {
    id: integer('id').primaryKey(),
    organizationId: integer('organization_id').notNull().references(() => organization.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Prefix for numbers in this branch, e.g. MAIN -> MAIN-0001. */
    codePrefix: text('code_prefix').notNull(),
    address: text('address'),
    phone: text('phone'),
    /** JSON: logo, title, address, doctors, signatures -- see printHeaderSchema. */
    printHeader: text('print_header'),
    /** Network lock: allowed IPv4 networks, one per line ("192.168.1.0/24"); null = off. */
    allowedNetworks: text('allowed_networks'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_branch_slug').on(t.organizationId, t.slug)],
);

export const user = sqliteTable(
  'user',
  {
    id: integer('id').primaryKey(),
    organizationId: integer('organization_id').notNull().references(() => organization.id),
    /** Internal id; new accounts use their mobile here too. */
    username: text('username').notNull(),
    /** Login id: +91XXXXXXXXXX, unique across all customers. */
    mobile: text('mobile'),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    /** Owner: every branch, every permission. */
    isOwner: integer('is_owner', { mode: 'boolean' }).notNull().default(false),
    /** You, hosting the platform: manages customers, sees no patient data. */
    isPlatformAdmin: integer('is_platform_admin', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: text('locked_until'),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_user_username').on(t.username), uniqueIndex('ux_user_mobile').on(t.mobile)],
);

/** Roles are per organization: "Doctor" means the same in every branch. */
export const role = sqliteTable(
  'role',
  {
    id: integer('id').primaryKey(),
    organizationId: integer('organization_id').notNull().references(() => organization.id),
    key: text('key').notNull(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_role_key').on(t.organizationId, t.key)],
);

export const rolePermission = sqliteTable(
  'role_permission',
  {
    roleId: integer('role_id').notNull().references(() => role.id),
    permission: text('permission').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

/**
 * A role's permissions in ONE branch, set by the owner (Settings > Permissions). A branch with no rows for a role
 * uses the role's own list (role_permission). NO_PERMISSIONS is the one row of a set left empty on purpose.
 */
export const branchRolePermission = sqliteTable(
  'branch_role_permission',
  {
    branchId: integer('branch_id').notNull().references(() => branch.id),
    roleId: integer('role_id').notNull().references(() => role.id),
    permission: text('permission').notNull(),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.roleId, t.permission] })],
);
/** Stored for a branch's role with every box unticked (so it does not fall back to the role's own list). */
export const NO_PERMISSIONS = '-';

/** A user works in a branch with one role there. */
export const branchMember = sqliteTable(
  'branch_member',
  {
    id: integer('id').primaryKey(),
    branchId: integer('branch_id').notNull().references(() => branch.id),
    userId: integer('user_id').notNull().references(() => user.id),
    roleId: integer('role_id').notNull().references(() => role.id),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('ux_branch_member').on(t.branchId, t.userId)],
);

export const session = sqliteTable(
  'session',
  {
    /** sha256 of the cookie token -- the token itself is never stored. */
    id: text('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => user.id),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [index('ix_session_user').on(t.userId)],
);

/** Per-branch running numbers (patient codes, invoice numbers, ...). */
export const branchCounter = sqliteTable(
  'branch_counter',
  {
    branchId: integer('branch_id').notNull().references(() => branch.id),
    name: text('name').notNull(),
    value: integer('value').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.name] })],
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey(),
    organizationId: integer('organization_id').notNull().references(() => organization.id),
    branchId: integer('branch_id').references(() => branch.id),
    userId: integer('user_id').references(() => user.id),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    detail: text('detail'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => [index('ix_audit_branch').on(t.branchId, t.createdAt)],
);

/** Columns every branch-scoped product table must have. */
export const branchColumns = {
  branchId: integer('branch_id')
    .notNull()
    .references(() => branch.id),
};
