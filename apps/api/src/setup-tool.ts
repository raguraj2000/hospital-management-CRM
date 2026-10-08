// Command-line tools for an on-site install (one hospital PC, no internet). Bundled to setup.mjs on the pendrive.
//
//   node setup.mjs init <setup-data.json>         first-time setup (OWNER_MOBILE, OWNER_PASSWORD in the environment)
//   node setup.mjs backup <file.db>               a safe copy of the database, even while the server runs
//   node setup.mjs reset-password <mobile> <new>  set a new password for one account
//   tsx src/setup-tool.ts export <branch name> <out.json>   (developer PC) save one branch's setup, no patient data
import fs from 'node:fs';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { loginMobileSchema, printHeaderSchema } from '@platform/shared';
import { hashPassword, openDb, runMigrations } from '@platform/core';
import { branch, clinicSetting, labTest, labTestParameter, medicine, organization, session, user } from './db/schema.js';
import { config, ensureDataDir } from './config.js';
import { seedOrganization } from './seed.js';

/** One hospital's setup: what a new install starts with. Never patients, visits, bills or stock. */
const setupDataSchema = z.object({
  organization: z.object({ name: z.string().min(1), idPrefix: z.string().default('') }),
  branch: z.object({ name: z.string().min(1), slug: z.string().min(1), codePrefix: z.string().min(1), address: z.string().nullable().default(null), phone: z.string().nullable().default(null) }),
  printHeader: printHeaderSchema.nullable().default(null),
  consultationFeePaise: z.number().int().min(0).default(0),
  labTests: z
    .array(
      z.object({
        name: z.string(),
        pricePaise: z.number().int().min(0),
        department: z.string(),
        kind: z.enum(['panel', 'card']),
        sortOrder: z.number().int(),
        parameters: z.array(z.object({ name: z.string(), method: z.string(), unit: z.string(), refRange: z.string(), valueType: z.enum(['number', 'text']), options: z.string().nullable(), noFlag: z.boolean(), sortOrder: z.number().int() })),
      }),
    )
    .default([]),
  medicines: z.array(z.object({ name: z.string(), form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'other']), strength: z.string().nullable(), pricePaise: z.number().int().min(0), reorderLevel: z.number().int().min(0) })).default([]),
});
type SetupData = z.infer<typeof setupDataSchema>;

const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(200);
const fail = (message: string): never => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const [cmd, a1, a2] = process.argv.slice(2);
ensureDataDir();
const db = await openDb(config.dbUrl);
await runMigrations(db, config.migrationsFolder);

if (cmd === 'init') {
  const existing = await db.select({ name: organization.name }).from(organization).limit(1);
  if (existing.length) {
    console.log(`Already set up ("${existing[0].name}"). Nothing changed.`);
  } else {
    const data: SetupData = a1 && fs.existsSync(a1) ? setupDataSchema.parse(JSON.parse(fs.readFileSync(a1, 'utf8'))) : setupDataSchema.parse({ organization: { name: process.env.ORG_NAME ?? 'HMS' }, branch: { name: process.env.ORG_NAME ?? 'HMS', slug: 'main', codePrefix: 'MAIN' } });
    const mobile = loginMobileSchema.safeParse(process.env.OWNER_MOBILE ?? '');
    if (!mobile.success) fail('Enter a 10-digit mobile number for the owner.');
    const password = passwordSchema.safeParse(process.env.OWNER_PASSWORD ?? '');
    if (!password.success) fail('The password must be at least 8 characters.');
    const r = await seedOrganization(db, {
      orgName: process.env.ORG_NAME || data.organization.name,
      idPrefix: data.organization.idPrefix,
      branchName: data.branch.name,
      branchSlug: data.branch.slug,
      branchPrefix: data.branch.codePrefix,
      ownerMobile: process.env.OWNER_MOBILE!,
      ownerName: process.env.OWNER_NAME || 'Owner',
      ownerPassword: password.data!,
    });
    const branchId = r.branch.id;
    await db.transaction(async (tx) => {
      await tx.update(branch).set({ address: data.branch.address, phone: data.branch.phone, printHeader: data.printHeader ? JSON.stringify(data.printHeader) : null }).where(eq(branch.id, branchId));
      await tx.insert(clinicSetting).values({ branchId, consultationFeePaise: data.consultationFeePaise });
      for (const t of data.labTests) {
        const { parameters, ...test } = t;
        const [row] = await tx.insert(labTest).values({ ...test, branchId }).returning({ id: labTest.id });
        if (parameters.length) await tx.insert(labTestParameter).values(parameters.map((p) => ({ ...p, branchId, testId: row.id })));
      }
      for (const m of data.medicines) await tx.insert(medicine).values({ ...m, branchId });
    });
    console.log(`Created "${r.org.name}" with branch "${r.branch.name}". Owner signs in with ${r.owner.mobile}.`);
    console.log(`Loaded ${data.labTests.length} lab tests and ${data.medicines.length} medicines${data.printHeader ? ', and the print header' : ''}.`);
  }
} else if (cmd === 'backup') {
  if (!a1) fail('Usage: backup <file.db>');
  if (fs.existsSync(a1!)) fs.rmSync(a1!);
  // VACUUM INTO writes one complete, consistent file even while the server is using the database.
  await db.run(sql`VACUUM INTO ${a1!.replace(/\\/g, '/')}`);
  console.log(`Backup written: ${a1} (${Math.round(fs.statSync(a1!).size / 1024)} KB)`);
} else if (cmd === 'reset-password') {
  const mobile = loginMobileSchema.safeParse(a1 ?? '');
  if (!mobile.success) fail('Enter the 10-digit mobile number of the account.');
  const password = passwordSchema.safeParse(a2 ?? '');
  if (!password.success) fail('The new password must be at least 8 characters.');
  const done = await db
    .update(user)
    .set({ passwordHash: await hashPassword(password.data!), failedLogins: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
    .where(eq(user.mobile, mobile.data!))
    .returning({ id: user.id, name: user.name });
  if (!done.length) fail(`No account signs in with ${mobile.data}.`);
  await db.update(session).set({ revokedAt: new Date().toISOString() }).where(eq(session.userId, done[0].id)); // sign out everywhere
  console.log(`New password set for ${done[0].name}.`);
} else if (cmd === 'export') {
  if (!a1 || !a2) fail('Usage: export <branch name> <out.json>');
  const found = await db.select().from(branch).where(eq(branch.name, a1!));
  if (found.length !== 1) fail(`Expected exactly one branch named "${a1}", found ${found.length}.`);
  const b = found[0];
  const [org] = await db.select().from(organization).where(eq(organization.id, b.organizationId));
  const [fee] = await db.select().from(clinicSetting).where(eq(clinicSetting.branchId, b.id));
  const tests = await db.select().from(labTest).where(and(eq(labTest.branchId, b.id), isNull(labTest.deletedAt))).orderBy(asc(labTest.sortOrder), asc(labTest.id));
  const params = await db.select().from(labTestParameter).where(and(eq(labTestParameter.branchId, b.id), isNull(labTestParameter.deletedAt))).orderBy(asc(labTestParameter.sortOrder), asc(labTestParameter.id));
  const meds = await db.select().from(medicine).where(and(eq(medicine.branchId, b.id), isNull(medicine.deletedAt))).orderBy(asc(medicine.name));
  const data: SetupData = setupDataSchema.parse({
    organization: { name: org.name, idPrefix: org.idPrefix },
    branch: { name: b.name, slug: b.slug, codePrefix: b.codePrefix, address: b.address, phone: b.phone },
    printHeader: b.printHeader ? JSON.parse(b.printHeader) : null,
    consultationFeePaise: fee?.consultationFeePaise ?? 0,
    labTests: tests.map((t) => ({
      name: t.name,
      pricePaise: t.pricePaise,
      department: t.department,
      kind: t.kind,
      sortOrder: t.sortOrder,
      parameters: params.filter((p) => p.testId === t.id).map((p) => ({ name: p.name, method: p.method, unit: p.unit, refRange: p.refRange, valueType: p.valueType, options: p.options, noFlag: p.noFlag, sortOrder: p.sortOrder })),
    })),
    medicines: meds.map((m) => ({ name: m.name, form: m.form, strength: m.strength, pricePaise: m.pricePaise, reorderLevel: m.reorderLevel })),
  });
  fs.writeFileSync(a2!, JSON.stringify(data, null, 1));
  console.log(`Setup of "${b.name}" written to ${a2}: ${data.labTests.length} lab tests, ${data.medicines.length} medicines, print header ${data.printHeader ? 'yes' : 'no'}. No patients, visits, bills or stock.`);
} else {
  fail('Commands: init <setup-data.json> | backup <file.db> | reset-password <mobile> <new password> | export <branch name> <out.json>');
}
db.$client.close();
