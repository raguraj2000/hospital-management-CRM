import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { defaultDbPath } from '../db/connection.js';

// Backup folders (all under data/backups):
//   ./            automatic, every N minutes -- kept for 1 day
//   daily/        one per day               -- kept `keepDailyDays` days (0 = forever)
//   monthly/      one per month             -- kept forever
//   manual/       "Back up now" button      -- kept forever
// Automatic backups are skipped when nothing changed since the last one, so
// nights and holidays don't pile up identical copies.

export interface BackupSettings {
  auto: boolean;
  intervalMinutes: number;
  keepDailyDays: number; // 0 = forever
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = { auto: true, intervalMinutes: 30, keepDailyDays: 60 };
export const ALLOWED_INTERVALS = [30, 60, 120, 240];
export const ALLOWED_KEEP_DAILY_DAYS = [30, 60, 90, 365, 0];

const FREQUENT_KEEP_MS = 24 * 60 * 60 * 1000;

function backupDir(): string {
  return process.env.CLINIC_BACKUP_DIR ?? path.join(path.dirname(defaultDbPath()), 'backups');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localStamp(d = new Date()): string {
  return `${localDate(d)}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function getBackupSettings(db: Database.Database): BackupSettings {
  const settings = { ...DEFAULT_BACKUP_SETTINGS };
  try {
    const rows = db.prepare("SELECT key, value FROM app_setting WHERE key LIKE 'backup.%'").all() as {
      key: string;
      value: string;
    }[];
    for (const r of rows) {
      if (r.key === 'backup.auto') settings.auto = r.value === '1';
      if (r.key === 'backup.intervalMinutes' && ALLOWED_INTERVALS.includes(Number(r.value))) settings.intervalMinutes = Number(r.value);
      if (r.key === 'backup.keepDailyDays' && ALLOWED_KEEP_DAILY_DAYS.includes(Number(r.value))) settings.keepDailyDays = Number(r.value);
    }
  } catch {
    // app_setting table not there yet (migration pending) -- defaults are fine.
  }
  return settings;
}

export function saveBackupSettings(db: Database.Database, s: BackupSettings): void {
  const upsert = db.prepare(
    `INSERT INTO app_setting (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')`,
  );
  db.transaction(() => {
    upsert.run('backup.auto', s.auto ? '1' : '0');
    upsert.run('backup.intervalMinutes', String(s.intervalMinutes));
    upsert.run('backup.keepDailyDays', String(s.keepDailyDays));
  })();
}

async function backupTo(db: Database.Database, destination: string): Promise<void> {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await db.backup(destination);
}

function listDb(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.startsWith('clinic-') && f.endsWith('.db')).sort();
}

/** Manual "Back up now": always runs, goes to backups/manual, never auto-deleted. */
export async function runBackupNow(db: Database.Database): Promise<{ file: string; prunedCount: number }> {
  const destination = path.join(backupDir(), 'manual', `clinic-${localStamp()}.db`);
  await backupTo(db, destination);
  return { file: destination, prunedCount: 0 };
}

// This server is the only writer, so SQLite's per-connection change counter
// tells us whether anything was written since the last automatic backup.
function changeCounter(db: Database.Database): number {
  return (db.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
}

let lastAutoAt: number | null = null; // null: read from disk on the first tick
let lastAutoChanges = -1; // -1: nothing backed up by this process yet
let lastDailyChanges = -1;

// Newest frequent backup on disk, so a restart (or a crash-restart loop)
// doesn't write a fresh copy every time the server starts.
function newestFrequentBackupAt(dir: string): number {
  let newest = 0;
  for (const f of listDb(dir)) newest = Math.max(newest, fs.statSync(path.join(dir, f)).mtimeMs);
  return newest;
}

/** One scheduler tick: runs the automatic backups that are due, then prunes. */
export async function runScheduledBackups(db: Database.Database, now = new Date()): Promise<void> {
  const settings = getBackupSettings(db);
  if (!settings.auto) return;
  const dir = backupDir();
  const changes = changeCounter(db);
  if (lastAutoAt === null) lastAutoAt = newestFrequentBackupAt(dir);

  // Frequent backup: when the interval has passed AND something changed.
  if (now.getTime() - lastAutoAt >= settings.intervalMinutes * 60_000 && changes !== lastAutoChanges) {
    await backupTo(db, path.join(dir, `clinic-${localStamp(now)}.db`));
    lastAutoAt = now.getTime();
    lastAutoChanges = changes;
  }

  // Daily backup: today's is missing AND (first run since start OR data changed since the last daily).
  const daily = path.join(dir, 'daily', `clinic-${localDate(now)}.db`);
  if (!fs.existsSync(daily) && (lastDailyChanges === -1 || changes !== lastDailyChanges)) {
    await backupTo(db, daily);
    lastDailyChanges = changes;
  }

  // Monthly backup: first daily of the month, kept forever.
  const month = localDate(now).slice(0, 7);
  const monthly = path.join(dir, 'monthly', `clinic-${month}.db`);
  if (!fs.existsSync(monthly) && fs.existsSync(daily)) {
    fs.mkdirSync(path.dirname(monthly), { recursive: true });
    fs.copyFileSync(daily, monthly);
  }

  pruneBackups(settings, now);
}

function pruneBackups(settings: BackupSettings, now: Date): void {
  const dir = backupDir();
  for (const f of listDb(dir)) {
    const full = path.join(dir, f);
    if (now.getTime() - fs.statSync(full).mtimeMs > FREQUENT_KEEP_MS) fs.rmSync(full);
  }
  if (settings.keepDailyDays > 0) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - settings.keepDailyDays);
    const cutoffName = `clinic-${localDate(cutoff)}.db`;
    const dailyDir = path.join(dir, 'daily');
    for (const f of listDb(dailyDir)) {
      if (f < cutoffName) fs.rmSync(path.join(dailyDir, f));
    }
  }
}

export interface BackupSummary {
  lastBackupAt: string | null;
  fileCount: number;
  totalMB: number;
  folder: string;
}

export function getBackupSummary(): BackupSummary {
  const dir = backupDir();
  let latest = 0;
  let count = 0;
  let bytes = 0;
  for (const sub of ['', 'daily', 'monthly', 'manual']) {
    const d = path.join(dir, sub);
    for (const f of listDb(d)) {
      const st = fs.statSync(path.join(d, f));
      count++;
      bytes += st.size;
      latest = Math.max(latest, st.mtimeMs);
    }
  }
  return {
    lastBackupAt: latest ? new Date(latest).toISOString() : null,
    fileCount: count,
    totalMB: Math.round((bytes / (1024 * 1024)) * 10) / 10,
    folder: dir,
  };
}

// Wait this long after startup before the first backup check, so the backup
// copy doesn't compete with every clinic computer reconnecting at once right
// after a restart. (This is load-smoothing only. The server crash it was once
// thought to fix was a Node 24.19+ native-module bug; see
// scripts/check-native-gc.cjs.)
const FIRST_TICK_DELAY_MS = 15_000;

/** Checks once a minute what's due; call once at server startup. */
export function scheduleBackups(db: Database.Database): void {
  const tick = () => runScheduledBackups(db).catch((err) => console.error('Scheduled backup failed:', err));
  setTimeout(tick, FIRST_TICK_DELAY_MS);
  setInterval(tick, 60_000);
}
