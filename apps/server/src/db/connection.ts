import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export interface ConnectionOptions {
  filePath: string;
}

function hasAnyBackup(dir: string): boolean {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    if (!fs.existsSync(d)) continue;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) stack.push(path.join(d, entry.name));
      else if (entry.name.endsWith('.db')) return true;
    }
  }
  return false;
}

export function openDatabase({ filePath }: ConnectionOptions): Database.Database {
  const dir = path.dirname(filePath);
  // If the database file is gone but backups exist, the data was deleted or
  // moved -- never silently start over with an empty database (the clinic
  // would keep working on a blank system). Restore a backup instead.
  if (filePath !== ':memory:' && !fs.existsSync(filePath) && hasAnyBackup(path.join(dir, 'backups'))) {
    throw new Error(
      `DATABASE MISSING: ${filePath} does not exist, but backups do. Refusing to create an empty database. ` +
        `Double-click "C:\\Aadhi Hospital\\Restore Backup.bat" to restore the latest backup.`,
    );
  }
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

export function defaultDbPath(): string {
  return process.env.CLINIC_DB_PATH ?? path.join(process.cwd(), 'data', 'clinic.db');
}
