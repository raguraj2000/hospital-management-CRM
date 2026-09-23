import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { openDatabase, defaultDbPath } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

export function runMigrations(db: Database.Database, migrationsDir = MIGRATIONS_DIR): string[] {
  ensureMigrationsTable(db);
  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map((r: any) => r.filename),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const applyOne = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    });
    applyOne();
    newlyApplied.push(file);
  }
  return newlyApplied;
}

// Run directly: `tsx src/db/migrate.ts`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const db = openDatabase({ filePath: defaultDbPath() });
  const applied = runMigrations(db);
  if (applied.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log('Applied migrations:', applied.join(', '));
  }
  db.close();
}
