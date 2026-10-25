import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

/** Drizzle database plus its native connection ($client) so it can be closed. */
export type Db = LibSQLDatabase<Record<string, never>> & { $client: Client };

/** Opens the SQLite file (or a libsql URL later, e.g. Turso/D1-compatible). */
export async function openDb(url: string): Promise<Db> {
  const client = createClient({ url });
  // WAL = readers don't block the writer; foreign keys are off by default in SQLite.
  await client.execute('PRAGMA journal_mode = WAL');
  await client.execute('PRAGMA foreign_keys = ON');
  await client.execute('PRAGMA busy_timeout = 5000');
  const db = drizzle(client);
  // Several computers save at the same moment (two front desks registering): every transaction takes the write
  // lock when it starts ("immediate") and, if another one holds it, waits and tries again -- never a 500.
  const plain = db.transaction.bind(db);
  (db as { transaction: unknown }).transaction = async (fn: Parameters<typeof plain>[0], config?: Parameters<typeof plain>[1]) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await plain(fn, { behavior: 'immediate', ...config });
      } catch (e) {
        const text = `${(e as { code?: string }).code ?? ''} ${(e as Error).message ?? ''} ${((e as { cause?: Error }).cause?.message) ?? ''}`;
        if (!/SQLITE_BUSY|database is locked/.test(text) || attempt >= 40) throw e;
        await new Promise((r) => setTimeout(r, 15 + 20 * Math.min(attempt, 10) + Math.random() * 20));
      }
    }
  };
  return db;
}

export async function runMigrations(db: Db, migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}
