import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';

let dir: string;

// The service keeps "last backup" state at module level -- load a fresh copy per test.
async function loadService() {
  vi.resetModules();
  return import('../src/services/backup-service.js');
}

function files(sub = '') {
  const d = path.join(dir, 'backups', sub);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.db')).sort() : [];
}

function freshDb() {
  const db = openDatabase({ filePath: path.join(dir, 'clinic.db') });
  runMigrations(db);
  return db;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-backup-'));
  process.env.CLINIC_BACKUP_DIR = path.join(dir, 'backups');
});

afterEach(() => {
  delete process.env.CLINIC_BACKUP_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('scheduled backups', () => {
  it('makes frequent, daily and monthly backups, and skips when nothing changed', async () => {
    const svc = await loadService();
    const db = freshDb();
    const t0 = new Date(2026, 8, 22, 10, 0, 0);

    await svc.runScheduledBackups(db, t0);
    expect(files()).toHaveLength(1);
    expect(files('daily')).toEqual(['clinic-2026-09-22.db']);
    expect(files('monthly')).toEqual(['clinic-2026-09.db']);

    // 40 minutes later, no writes -> no new frequent backup
    await svc.runScheduledBackups(db, new Date(t0.getTime() + 40 * 60_000));
    expect(files()).toHaveLength(1);

    // a write, then the next tick after the interval -> one more
    db.prepare("INSERT INTO app_setting (key, value) VALUES ('x', '1')").run();
    await svc.runScheduledBackups(db, new Date(t0.getTime() + 41 * 60_000));
    expect(files()).toHaveLength(2);
    db.close();
  });

  it('does not write a new frequent backup on restart when a recent one exists', async () => {
    const db = freshDb();
    const svc1 = await loadService();
    await svc1.runScheduledBackups(db); // first run of "process 1"
    expect(files()).toHaveLength(1);
    const svc2 = await loadService(); // "restart": fresh module state
    await svc2.runScheduledBackups(db);
    expect(files()).toHaveLength(1);
    db.close();
  });

  it('does nothing when automatic backups are turned off', async () => {
    const svc = await loadService();
    const db = freshDb();
    svc.saveBackupSettings(db, { auto: false, intervalMinutes: 30, keepDailyDays: 60 });
    await svc.runScheduledBackups(db, new Date(2026, 8, 22, 10, 0, 0));
    expect(files()).toHaveLength(0);
    expect(files('daily')).toHaveLength(0);
    db.close();
  });

  it('prunes daily backups older than the setting but keeps monthly and manual ones', async () => {
    const svc = await loadService();
    const db = freshDb();
    svc.saveBackupSettings(db, { auto: true, intervalMinutes: 30, keepDailyDays: 30 });
    fs.mkdirSync(path.join(dir, 'backups', 'daily'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'backups', 'monthly'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'backups', 'daily', 'clinic-2026-07-01.db'), 'old');
    fs.writeFileSync(path.join(dir, 'backups', 'daily', 'clinic-2026-09-01.db'), 'recent');
    fs.writeFileSync(path.join(dir, 'backups', 'monthly', 'clinic-2026-07.db'), 'month');
    await svc.runBackupNow(db);

    await svc.runScheduledBackups(db, new Date(2026, 8, 22, 10, 0, 0));
    expect(files('daily')).toEqual(['clinic-2026-09-01.db', 'clinic-2026-09-22.db']);
    expect(files('monthly')).toEqual(['clinic-2026-07.db', 'clinic-2026-09.db']);
    expect(files('manual')).toHaveLength(1);
    db.close();
  });
});

describe('missing database guard', () => {
  it('refuses to create an empty database when backups exist', () => {
    fs.mkdirSync(path.join(dir, 'backups', 'daily'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'backups', 'daily', 'clinic-2026-09-21.db'), 'x');
    expect(() => openDatabase({ filePath: path.join(dir, 'clinic.db') })).toThrow(/DATABASE MISSING/);
    expect(fs.existsSync(path.join(dir, 'clinic.db'))).toBe(false);
  });

  it('creates a new database on a fresh install (no backups)', () => {
    const db = openDatabase({ filePath: path.join(dir, 'clinic.db') });
    db.close();
    expect(fs.existsSync(path.join(dir, 'clinic.db'))).toBe(true);
  });
});
