// Throwaway prototype: one Worker, one Durable Object (its own SQLite) per hospital, the REAL HMS schema.
// Questions it answers: does the schema run, does an all-or-nothing sale undo itself on error, can two counters at
// once push stock below zero, and does the password check fit the free plan's CPU.
// TODO(shortcut): prototype only — no auth, no validation, hard-coded seed. Never deploy as is.
import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { drizzle, type DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';
import { migrate } from 'drizzle-orm/durable-sqlite/migrator';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import migrations from '../drizzle/migrations';
import { branch, medicine, medicineBatch, organization } from '../../../apps/api/src/db/schema';

type Env = { HOSPITAL: DurableObjectNamespace<Hospital> };
type Item = { medicineId: number; quantity: number };
class Short extends Error {}

export class Hospital extends DurableObject<Env> {
  private db: DrizzleSqliteDODatabase;
  private app = new Hono();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.db = drizzle(ctx.storage);
    // Every request waits until this hospital's database is on the latest migration.
    ctx.blockConcurrencyWhile(async () => {
      migrate(this.db, migrations);
    });
    const db = this.db;

    this.app.post('/seed', async (c) => {
      const { stock } = await c.req.json<{ stock: number }>();
      const [org] = db.insert(organization).values({ name: 'Proto Hospital' }).returning().all();
      const [b] = db.insert(branch).values({ organizationId: org!.id, slug: 'main', name: 'Main', codePrefix: 'MAIN' }).returning().all();
      const meds = db
        .insert(medicine)
        .values([
          { branchId: b!.id, name: 'Paracetamol', form: 'tablet', pricePaise: 200 },
          { branchId: b!.id, name: 'Cough syrup', form: 'syrup', pricePaise: 9000 },
        ])
        .returning()
        .all();
      for (const m of meds) {
        // Two batches each, FEFO takes the earlier expiry first.
        db.insert(medicineBatch).values([
          { branchId: b!.id, medicineId: m.id, batchNo: 'SOON', expiryDate: '2027-01-01', quantity: Math.floor(stock / 2), receivedQty: Math.floor(stock / 2) },
          { branchId: b!.id, medicineId: m.id, batchNo: 'LATE', expiryDate: '2028-01-01', quantity: stock - Math.floor(stock / 2), receivedQty: stock - Math.floor(stock / 2) },
        ]).run();
      }
      return c.json({ medicines: meds.map((m) => ({ id: m.id, name: m.name })) });
    });

    this.app.get('/stock', (c) => {
      const rows = db.select({ medicineId: medicineBatch.medicineId, left: sql<number>`sum(${medicineBatch.quantity})` }).from(medicineBatch).groupBy(medicineBatch.medicineId).all();
      return c.json({ stock: rows });
    });

    /** FEFO: take from the earliest-expiring batches; throws Short when there is not enough. Written as HMS writes it. */
    const takeAsync = async (tx: typeof db, item: Item) => {
      const batches = await tx.select().from(medicineBatch).where(and(eq(medicineBatch.medicineId, item.medicineId), gt(medicineBatch.quantity, 0))).orderBy(asc(medicineBatch.expiryDate));
      let need = item.quantity;
      for (const bt of batches) {
        if (need === 0) break;
        const take = Math.min(need, bt.quantity);
        await tx.update(medicineBatch).set({ quantity: bt.quantity - take }).where(eq(medicineBatch.id, bt.id));
        need -= take;
      }
      if (need > 0) throw new Short(`Not enough stock of medicine ${item.medicineId}`);
    };
    /** The same, with the synchronous calls a Durable Object offers. */
    const takeSync = (tx: typeof db, item: Item) => {
      const batches = tx.select().from(medicineBatch).where(and(eq(medicineBatch.medicineId, item.medicineId), gt(medicineBatch.quantity, 0))).orderBy(asc(medicineBatch.expiryDate)).all();
      let need = item.quantity;
      for (const bt of batches) {
        if (need === 0) break;
        const take = Math.min(need, bt.quantity);
        tx.update(medicineBatch).set({ quantity: bt.quantity - take }).where(eq(medicineBatch.id, bt.id)).run();
        need -= take;
      }
      if (need > 0) throw new Short(`Not enough stock of medicine ${item.medicineId}`);
    };

    // A: today's HMS style — db.transaction(async tx => { await ... }).
    this.app.post('/sale-async', async (c) => {
      const { items } = await c.req.json<{ items: Item[] }>();
      try {
        await db.transaction(async (tx) => {
          for (const it of items) await takeAsync(tx, it);
        });
        return c.json({ ok: true }, 201);
      } catch (e) {
        if (e instanceof Short) return c.json({ error: e.message, code: 'out_of_stock' }, 409);
        throw e;
      }
    });

    // B: the Durable Object's own transactionSync — all or nothing, by the platform.
    this.app.post('/sale-sync', async (c) => {
      const { items } = await c.req.json<{ items: Item[] }>();
      try {
        this.ctx.storage.transactionSync(() => {
          for (const it of items) takeSync(db, it);
        });
        return c.json({ ok: true }, 201);
      } catch (e) {
        if (e instanceof Short) return c.json({ error: e.message, code: 'out_of_stock' }, 409);
        throw e;
      }
    });
  }

  fetch(request: Request) {
    return this.app.fetch(request);
  }
}

// The Worker: /h/:hospital/... goes to that hospital's Durable Object (its own database).
const worker = new Hono<{ Bindings: Env }>();
worker.all('/h/:hospital/*', (c) => {
  const stub = c.env.HOSPITAL.get(c.env.HOSPITAL.idFromName(c.req.param('hospital')));
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/^\/h\/[^/]+/, '');
  return stub.fetch(new Request(url, c.req.raw));
});

// Password check with HMS's real scrypt settings (N=16384, r=8, p=1, 64 bytes): does it run, and how much CPU?
worker.post('/scrypt', (c) => {
  const salt = randomBytes(16);
  const key = scryptSync('hospital-password-123', salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const again = scryptSync('hospital-password-123', salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return c.json({ ok: timingSafeEqual(key, again) });
});

export default worker;
