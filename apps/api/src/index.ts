import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { openDb, runMigrations } from '@platform/core';
import { createApp } from './app.js';
import { config, ensureDataDir } from './config.js';

ensureDataDir();
const db = await openDb(config.dbUrl);
await runMigrations(db, config.migrationsFolder);

const app = createApp(db);

// Production: the same server hands out the built web app (one port, works offline on the LAN).
if (fs.existsSync(path.join(config.webDir, 'index.html'))) {
  const root = path.relative(process.cwd(), config.webDir).replace(/\\/g, '/');
  app.use('/assets/*', serveStatic({ root }));
  app.use('*', serveStatic({ root }));
  // Any other page address -> the app (React Router takes it from there).
  app.get('*', serveStatic({ root, path: 'index.html' }));
}

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});

// Stop cleanly (Ctrl+C / service stop): close the database so nothing is left half-written.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    db.$client.close();
    process.exit(0);
  });
}
