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
  return drizzle(client);
}

export async function runMigrations(db: Db, migrationsFolder: string) {
  await migrate(db, { migrationsFolder });
}
