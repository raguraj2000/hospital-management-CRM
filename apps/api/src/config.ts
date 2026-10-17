import path from 'node:path';
import fs from 'node:fs';

const apiDir = path.resolve(import.meta.dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 4100),
  /** SQLite file. Default: apps/api/data/app.db (gitignored). */
  dbUrl: process.env.DATABASE_URL ?? `file:${path.join(apiDir, 'data', 'app.db').replace(/\\/g, '/')}`,
  /** Overridden on an installed PC, where the server is one bundled file. */
  migrationsFolder: process.env.MIGRATIONS_DIR ?? path.join(apiDir, 'drizzle'),
  /** Built web app, served by this same server in production. */
  webDir: process.env.WEB_DIR ?? path.resolve(apiDir, '..', 'web', 'dist'),
  /**
   * Daily backups: BACKUP_DIR, or on an installed PC (NODE_ENV=production) the "backups" folder next to the data
   * folder (C:\HMS\backups). In development none.
   */
  backupDir:
    process.env.BACKUP_DIR ??
    (process.env.NODE_ENV === 'production' && (process.env.DATABASE_URL ?? '').startsWith('file:')
      ? path.resolve(path.dirname((process.env.DATABASE_URL ?? '').slice('file:'.length)), '..', 'backups')
      : null),
  /** The server's own log (the service writes it there on an installed PC): the owner downloads it for support. */
  logFile:
    process.env.LOG_FILE ??
    (process.env.NODE_ENV === 'production' && (process.env.DATABASE_URL ?? '').startsWith('file:')
      ? path.resolve(path.dirname((process.env.DATABASE_URL ?? '').slice('file:'.length)), '..', 'logs', 'server.log')
      : null),
};

export function ensureDataDir() {
  if (config.dbUrl.startsWith('file:')) {
    fs.mkdirSync(path.dirname(config.dbUrl.slice('file:'.length)), { recursive: true });
  }
}
