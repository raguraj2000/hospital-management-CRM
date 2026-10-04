import path from 'node:path';
import fs from 'node:fs';

const apiDir = path.resolve(import.meta.dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4100),
  /** SQLite file. Default: apps/api/data/app.db (gitignored). */
  dbUrl: process.env.DATABASE_URL ?? `file:${path.join(apiDir, 'data', 'app.db').replace(/\\/g, '/')}`,
  migrationsFolder: path.join(apiDir, 'drizzle'),
  /** Built web app, served by this same server in production. */
  webDir: process.env.WEB_DIR ?? path.resolve(apiDir, '..', 'web', 'dist'),
};

export function ensureDataDir() {
  if (config.dbUrl.startsWith('file:')) {
    fs.mkdirSync(path.dirname(config.dbUrl.slice('file:'.length)), { recursive: true });
  }
}
