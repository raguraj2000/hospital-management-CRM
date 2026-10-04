// First-time setup of ONE customer: organization + first branch + default roles + owner account.
// For a local install (one hospital). In the cloud, create customers from the platform console.
// Safe to run again: it does nothing if a customer already exists.
//
//   ORG_NAME="City Hospitals" ORG_ID_PREFIX=CH BRANCH_NAME="City Hospital" BRANCH_SLUG=main BRANCH_PREFIX=MAIN \
//   OWNER_MOBILE=98765xxxxx OWNER_PASSWORD=... npm run seed
import { randomBytes } from 'node:crypto';
import { DEFAULT_ROLES, loginMobileSchema } from '@platform/shared';
import { hashPassword, openDb, runMigrations, type Db } from '@platform/core';
import { eq } from 'drizzle-orm';
import { branch, organization, role, rolePermission, user } from './db/schema.js';
import { config, ensureDataDir } from './config.js';

export async function seedOrganization(
  db: Db,
  opts: { orgName: string; idPrefix?: string; branchName: string; branchSlug: string; branchPrefix: string; ownerMobile: string; ownerName: string; ownerPassword: string },
) {
  const mobile = loginMobileSchema.parse(opts.ownerMobile);
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organization).values({ name: opts.orgName, idPrefix: opts.idPrefix ?? '' }).returning();
    const [b] = await tx
      .insert(branch)
      .values({ organizationId: org.id, name: opts.branchName, slug: opts.branchSlug, codePrefix: opts.branchPrefix })
      .returning();
    const roles: Record<string, number> = {};
    for (const r of DEFAULT_ROLES) {
      const [row] = await tx.insert(role).values({ organizationId: org.id, key: r.key, name: r.name }).returning();
      roles[r.key] = row.id;
      if (r.permissions.length) await tx.insert(rolePermission).values(r.permissions.map((permission) => ({ roleId: row.id, permission })));
    }
    const [owner] = await tx
      .insert(user)
      .values({ organizationId: org.id, username: mobile, mobile, name: opts.ownerName, passwordHash: await hashPassword(opts.ownerPassword), isOwner: true })
      .returning();
    return { org, branch: b, roles, owner };
  });
}

/** You, hosting the platform: a login that manages customers and sees no patient data. */
export async function createPlatformAdmin(db: Db, opts: { name: string; mobile: string; password: string }) {
  const mobile = loginMobileSchema.parse(opts.mobile);
  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organization).values({ name: 'Platform', idPrefix: 'PLT' }).returning();
    const [u] = await tx
      .insert(user)
      .values({ organizationId: org.id, username: mobile, mobile, name: opts.name, passwordHash: await hashPassword(opts.password), isPlatformAdmin: true })
      .returning();
    return u;
  });
}

// ---------------------------------------------------------------- command line

if (process.argv[1]?.endsWith('seed.ts')) {
  ensureDataDir();
  const db = await openDb(config.dbUrl);
  await runMigrations(db, config.migrationsFolder);
  const [cmd, a1, a2] = process.argv.slice(2);

  if (cmd === 'set-mobile') {
    // npm run seed -- set-mobile <current username> <mobile>   (give an old account a mobile login)
    const mobile = loginMobileSchema.parse(a2 ?? '');
    const done = await db.update(user).set({ mobile }).where(eq(user.username, (a1 ?? '').toLowerCase())).returning({ name: user.name });
    console.log(done.length ? `${done[0].name} now signs in with ${mobile}` : `No account with username "${a1}"`);
  } else if (cmd === 'platform-admin') {
    // npm run seed -- platform-admin <mobile> <password>
    const u = await createPlatformAdmin(db, { name: 'Platform admin', mobile: a1 ?? '', password: a2 || randomBytes(9).toString('base64url') });
    console.log(`Platform admin created: ${u.mobile}${a2 ? '' : ' (password was generated -- run again with one)'}`);
  } else {
    const existing = await db.select().from(organization).limit(1);
    if (existing.length) {
      console.log(`Already set up (organization "${existing[0].name}"). Nothing to do.`);
    } else {
      if (!process.env.OWNER_MOBILE) throw new Error('Set OWNER_MOBILE (the owner signs in with it).');
      const password = process.env.OWNER_PASSWORD || randomBytes(9).toString('base64url');
      const r = await seedOrganization(db, {
        orgName: process.env.ORG_NAME ?? 'HMS',
        idPrefix: process.env.ORG_ID_PREFIX ?? 'HMS',
        branchName: process.env.BRANCH_NAME ?? 'HMS',
        branchSlug: process.env.BRANCH_SLUG ?? 'main',
        branchPrefix: process.env.BRANCH_PREFIX ?? 'MAIN',
        ownerMobile: process.env.OWNER_MOBILE,
        ownerName: process.env.OWNER_NAME ?? 'Owner',
        ownerPassword: password,
      });
      console.log(`Created "${r.org.name}" with branch "${r.branch.name}" (/${r.branch.slug}).`);
      console.log(`Owner login: ${r.owner.mobile} / ${password}${process.env.OWNER_PASSWORD ? '' : '   <- generated, write it down'}`);
    }
  }
}
