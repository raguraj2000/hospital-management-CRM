// HMS on Cloudflare: one Worker serves the web app (from Cloudflare's cache) and sends /api/* to the hospital's
// Durable Object, which runs the SAME Hono app as the PC server on its own SQLite database.
// TODO(shortcut): step 2a — one hospital ("main"); the login directory for many hospitals comes in step 2c.
import { DurableObject } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import type { Db } from '@platform/core';
import { createApp } from '../../api/src/app.js';
import { auditLog, clinicSetting, organization } from '../../api/src/db/schema.js';
import { seedOrganization } from '../../api/src/seed.js';
import { addHba1cTest, addLabCorrectPermission, addRandomBloodSugar, addRandomBloodSugarTest, addReportsPermission, addVisitingDoctorRole, mergeDifferentialIntoCbc } from '../../api/src/lib/lab-merge.js';
import migrations from './migrations.gen.js';

interface Env {
  HOSPITAL: DurableObjectNamespace<Hospital>;
  ASSETS: Fetcher;
  /** Local only (.dev.vars): turns on the /api/__check/* routes. Never set online. */
  DEV_SEED?: string;
  /**
   * First-time setup of an EMPTY hospital (secrets: `wrangler secret put`, then deleted): the hospital name and
   * the owner's login. Ignored once the hospital has data.
   */
  SETUP_ORG_NAME?: string;
  /** Patient IDs start with it ("AH" -> AH000001). */
  SETUP_ID_PREFIX?: string;
  SETUP_OWNER_NAME?: string;
  SETUP_OWNER_MOBILE?: string;
  SETUP_OWNER_PASSWORD?: string;
}

export class Hospital extends DurableObject<Env> {
  private app: ReturnType<typeof createApp>;
  /** The very database object the app uses (with the Durable Object transaction in place). */
  private db: Db;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const db = drizzle(ctx.storage);
    // The Durable Object's async transaction is what makes "all or nothing" hold for HMS's async code (Drizzle's
    // own transaction would not undo the writes here). Every db.transaction(...) of the app goes through it.
    const asDb = db as unknown as Db;
    this.db = asDb;
    ctx.blockConcurrencyWhile(async () => {
      migrate(db, migrations); // Drizzle's synchronous migrator: before the transaction is replaced below
      (db as { transaction: unknown }).transaction = (fn: (tx: Db) => Promise<unknown>) => ctx.storage.transaction(() => fn(asDb));
      // The same one-time data upgrades the PC server runs at start.
      await addVisitingDoctorRole(asDb);
      await addReportsPermission(asDb);
      await addLabCorrectPermission(asDb);
      await mergeDifferentialIntoCbc(asDb);
      await addRandomBloodSugar(asDb);
      await addRandomBloodSugarTest(asDb);
      await addHba1cTest(asDb);
      if (env.SETUP_OWNER_MOBILE && env.SETUP_OWNER_PASSWORD && !(await asDb.select({ id: organization.id }).from(organization).limit(1)).length) {
        const r = await seedOrganization(asDb, {
          orgName: env.SETUP_ORG_NAME ?? 'HMS',
          idPrefix: env.SETUP_ID_PREFIX ?? 'HMS',
          branchName: env.SETUP_ORG_NAME ?? 'HMS',
          branchSlug: 'main',
          branchPrefix: 'MAIN',
          ownerMobile: env.SETUP_OWNER_MOBILE,
          ownerName: env.SETUP_OWNER_NAME ?? 'Owner',
          ownerPassword: env.SETUP_OWNER_PASSWORD,
        });
        if (!(await asDb.select().from(clinicSetting).where(eq(clinicSetting.branchId, r.branch.id))).length) await asDb.insert(clinicSetting).values({ branchId: r.branch.id });
      }
    });
    this.app = createApp(asDb);
  }

  fetch(request: Request) {
    // Local checks only (DEV_SEED, never set online): does "all or nothing" hold for HMS's own transaction call?
    if (this.env.DEV_SEED === '1' && new URL(request.url).pathname === '/api/__check/rollback') return this.checkRollback();
    return this.app.fetch(request);
  }

  private async checkRollback() {
    const db = this.db;
    const mark = `rollback-check-${Date.now()}`;
    const failed = await db.transaction(async (tx) => {
      await tx.insert(auditLog).values({ organizationId: 1, action: 'check', entity: mark });
      throw new Error('planned failure after a write');
    }).then(() => false, () => true);
    const left = await db.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.entity, mark));
    return Response.json({ failed, rowsLeft: left.length, rolledBack: failed && left.length === 0 });
  }
}

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return env.HOSPITAL.get(env.HOSPITAL.idFromName('main')).fetch(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
