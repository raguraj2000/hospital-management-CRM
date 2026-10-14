import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { openDb, runMigrations } from '@platform/core';
import { createApp } from './app.js';
import { config, ensureDataDir } from './config.js';
import { keepAuditTrimmed } from './lib/audit-retention.js';
import { addHba1cTest, addRandomBloodSugar, addRandomBloodSugarTest, addReportsPermission, addVisitingDoctorRole, mergeDifferentialIntoCbc } from './lib/lab-merge.js';

ensureDataDir();
const db = await openDb(config.dbUrl);
await runMigrations(db, config.migrationsFolder);
if (await addVisitingDoctorRole(db)) console.log('Roles: "Visiting doctor" added.');
if (await addReportsPermission(db)) console.log('Roles: Branch admin may see the reports.');
const merged = await mergeDifferentialIntoCbc(db);
if (await addRandomBloodSugar(db)) console.log('Lab tests: Random Blood Sugar added to the Blood Sugar test.');
if (await addRandomBloodSugarTest(db)) console.log('Lab tests: "Random Blood Sugar" added as a test of its own.');
if (await addHba1cTest(db)) console.log('Lab tests: "HbA1c" added as a test of its own.');
if (merged) console.log(`Lab tests: differential counts moved into the Complete Blood Count (${merged} branch${merged > 1 ? 'es' : ''}).`);

keepAuditTrimmed(db);

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
