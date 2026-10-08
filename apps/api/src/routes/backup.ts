// Backup and restore of EVERYTHING, from Settings: one file holds the whole database.
// For an on-site install (one hospital on this server). Branch admin or owner only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError, openDb, requirePermission, runMigrations, writeAudit, type BranchEnv, type Db } from '@platform/core';
import { config } from '../config.js';

const SQLITE_MAGIC = 'SQLite format 3';
const sqlPath = (p: string) => p.replace(/\\/g, '/');
/** For file names: the server's local date and time, e.g. 20261007-1244 (the clinic PC's clock, like its other day stamps). */
const stamp = () => {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
};
/** Deletes a temporary database. Windows can hold the file a moment after it is closed: then try once more shortly, and otherwise leave it to the temp folder. */
const removeDb = (file: string, retry = true) => {
  for (const f of [file, `${file}-wal`, `${file}-shm`]) {
    try {
      fs.rmSync(f, { force: true });
    } catch {
      if (retry) setTimeout(() => removeDb(file, false), 5000).unref();
    }
  }
};

export function createBackupRoutes(db: Db) {
  const app = new Hono<BranchEnv>();
  const count = async (query: ReturnType<typeof sql>) => (await db.all<{ n: number }>(query))[0]!.n;

  /** The file holds every hospital and every branch on this server, so it is only for whoever may see all of it. */
  async function assertMayHandleEverything(user: { organizationId: number; isOwner: boolean }) {
    if ((await count(sql`select count(distinct organization_id) as n from branch`)) !== 1) {
      throw new AppError(403, 'forbidden', 'This server holds more than one hospital. Backups are made by whoever hosts it.');
    }
    if (!user.isOwner && (await count(sql`select count(*) as n from branch where organization_id = ${user.organizationId}`)) > 1) {
      throw new AppError(403, 'forbidden', 'The backup holds every branch, so only the owner can make or restore it.');
    }
  }

  /** Download one complete, consistent copy of the database (safe while people are working). */
  app.get('/backup', requirePermission('settings.manage'), async (c) => {
    const u = c.get('user');
    await assertMayHandleEverything(u);
    const tmp = path.join(os.tmpdir(), `hms-backup-${Date.now()}-${process.pid}.db`);
    try {
      await db.run(sql`VACUUM INTO ${sqlPath(tmp)}`);
      const bytes = fs.readFileSync(tmp);
      await writeAudit(db, { organizationId: u.organizationId, branchId: c.get('branch').id, userId: u.id, action: 'export', entity: 'backup', detail: { bytes: bytes.length } });
      return new Response(new Uint8Array(bytes), {
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="hms-backup-${stamp()}.db"`, 'Cache-Control': 'no-store' },
      });
    } finally {
      removeDb(tmp);
    }
  });

  /**
   * Replace everything with the uploaded backup. The current data is first copied to a file next to
   * the database (the answer names it). Everyone is signed out afterwards: the accounts are the backup's.
   */
  app.post('/restore', requirePermission('settings.manage'), async (c) => {
    const u = c.get('user');
    await assertMayHandleEverything(u);
    const bytes = Buffer.from(await c.req.arrayBuffer());
    const notABackup = new AppError(400, 'validation', 'This file is not an HMS backup. Choose a file made with "Download backup".');
    if (bytes.length < 100 || bytes.subarray(0, SQLITE_MAGIC.length).toString('latin1') !== SQLITE_MAGIC) throw notABackup;

    const tmp = path.join(os.tmpdir(), `hms-restore-${Date.now()}-${process.pid}.db`);
    fs.writeFileSync(tmp, bytes);
    try {
      // 1. Check the file and bring it to this version's table layout, without touching the live data.
      const src = await openDb(`file:${sqlPath(tmp)}`);
      try {
        const names = (await src.all<{ name: string }>(sql`select name from sqlite_master where type = 'table'`)).map((r) => r.name);
        if (!names.includes('organization') || !names.includes('__drizzle_migrations')) throw notABackup;
        const theirs = (await src.all<{ n: number }>(sql`select count(*) as n from __drizzle_migrations`))[0]!.n;
        if (theirs > (await count(sql`select count(*) as n from __drizzle_migrations`))) {
          throw new AppError(400, 'validation', 'This backup was made by a newer version of HMS. Update this computer first, then restore.');
        }
        await runMigrations(src, config.migrationsFolder);
        if ((await src.all<{ n: number }>(sql`select count(distinct organization_id) as n from branch`))[0]!.n !== 1) throw notABackup;
      } finally {
        src.$client.close();
      }

      // 2. Keep what is here now, in case the wrong file was chosen.
      let safetyCopy: string | null = null;
      const [live] = await db.all<{ file: string }>(sql`select file from pragma_database_list where name = 'main'`);
      if (live?.file) {
        safetyCopy = path.join(path.dirname(live.file), `before-restore-${stamp()}.db`);
        removeDb(safetyCopy);
        await db.run(sql`VACUUM INTO ${sqlPath(safetyCopy)}`);
      }

      // 3. Swap the contents table by table in one transaction (both files have the same layout now).
      const tables = (await db.all<{ name: string }>(sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not in ('__drizzle_migrations', 'session')`)).map((r) => r.name);
      const script = [
        `ATTACH DATABASE '${sqlPath(tmp).replace(/'/g, "''")}' AS src;`,
        'PRAGMA foreign_keys = OFF;',
        'BEGIN;',
        ...tables.flatMap((t) => [`DELETE FROM main."${t}";`, `INSERT INTO main."${t}" SELECT * FROM src."${t}";`]),
        'DELETE FROM main."session";',
        'COMMIT;',
      ].join('\n');
      try {
        await db.$client.executeMultiple(script);
      } catch (e) {
        await db.$client.executeMultiple('ROLLBACK;').catch(() => undefined);
        throw new AppError(500, 'restore_failed', `The restore failed and nothing was changed. (${e instanceof Error ? e.message : 'unknown error'})`);
      } finally {
        await db.$client.executeMultiple('PRAGMA foreign_keys = ON; DETACH DATABASE src;').catch(() => undefined);
      }

      const [org] = await db.all<{ id: number }>(sql`select id from organization order by id limit 1`);
      // The person who restored may not exist in the restored data, so the log names them in the detail.
      await writeAudit(db, { organizationId: org!.id, action: 'restore', entity: 'backup', detail: { by: u.name, mobile: u.mobile, bytes: bytes.length, safetyCopy: safetyCopy && path.basename(safetyCopy) } });
      return c.json({ ok: true, safetyCopy: safetyCopy && path.basename(safetyCopy) });
    } finally {
      removeDb(tmp);
    }
  });

  return app;
}
