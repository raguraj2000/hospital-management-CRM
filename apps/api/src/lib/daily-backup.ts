// Daily backup, made by the server itself (it runs all day as a Windows service): once a day a complete copy of the
// database goes to the backups folder next to the data folder (C:\HMS\backups), the last BACKUP_KEEP_DAYS days are
// kept. If a pendrive with an "HMS-Backup" folder is plugged in, the day's copy also goes there (only that folder:
// HMS never writes anywhere else on a pendrive). Nothing leaves the computer otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import type { Db } from '@platform/core';

export const BACKUP_KEEP_DAYS = 14;
const NAME = /^daily-(\d{4}-\d{2}-\d{2})\.db$/;

/** India date today, YYYY-MM-DD (the hospital's day). */
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Removable drives that have an HMS-Backup folder (Windows only; elsewhere none). */
function pendriveFolders(): string[] {
  if (process.platform !== 'win32') return [];
  const found: string[] = [];
  for (const letter of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
    const dir = `${letter}:\\HMS-Backup`;
    try {
      if (fs.statSync(dir).isDirectory()) found.push(dir);
    } catch {
      /* no such drive or folder */
    }
  }
  return found;
}

/**
 * Makes today's copy if it is not there yet, then removes copies older than `keepDays`. Returns the file written,
 * or null when today's copy already existed. `extraDirs`: where else to copy it (default: pendrives with HMS-Backup).
 */
export async function dailyBackup(db: Db, dir: string, { keepDays = BACKUP_KEEP_DAYS, today = indiaToday(), extraDirs = pendriveFolders() } = {}): Promise<string | null> {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `daily-${today}.db`);
  let written: string | null = null;
  if (!fs.existsSync(file)) {
    const tmp = `${file}.part`;
    if (fs.existsSync(tmp)) fs.rmSync(tmp);
    // VACUUM INTO: one complete, consistent file even while the hospital is working.
    await db.run(sql`VACUUM INTO ${tmp.replace(/\\/g, '/')}`);
    fs.renameSync(tmp, file);
    written = file;
  }
  for (const extra of extraDirs) {
    const copy = path.join(extra, `daily-${today}.db`);
    try {
      if (!fs.existsSync(copy)) fs.copyFileSync(file, copy);
      prune(extra, keepDays, today);
    } catch (e) {
      console.error(`Daily backup: could not copy to ${extra}:`, (e as Error).message);
    }
  }
  prune(dir, keepDays, today);
  return written;
}

/** Keeps the daily copies of the last `keepDays` days (today included); other files are never touched. */
function prune(dir: string, keepDays: number, today: string) {
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - (keepDays - 1) * 86_400_000).toISOString().slice(0, 10);
  for (const f of fs.readdirSync(dir)) {
    const m = NAME.exec(f);
    if (m && m[1]! < oldest) fs.rmSync(path.join(dir, f));
  }
}

/** On start, then every hour: today's copy is made the first time the server runs that day. */
export function keepDailyBackups(db: Db, dir: string) {
  const run = () =>
    dailyBackup(db, dir)
      .then((f) => f && console.log(`Daily backup written: ${f}`))
      .catch((e) => console.error('Daily backup failed:', e));
  setTimeout(run, 30_000).unref(); // after the start-up work
  setInterval(run, 3_600_000).unref();
}
