// argon2 is loaded first only for a stable native-module load order. NOTE:
// the "Assertion failed: (env) != nullptr" crash once blamed on load order
// is actually a Node 24.19+ bug in how better-sqlite3 was COMPILED -- see
// scripts/check-native-gc.cjs for the real cause and the guard against it.
import 'argon2';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import os from 'node:os';
import { openDatabase, defaultDbPath } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { createAuthRoutes } from './routes/auth.js';
import { createPatientRoutes } from './routes/patients.js';
import { createMedicineRoutes } from './routes/medicines.js';
import { createMedicineCategoryRoutes } from './routes/medicine-categories.js';
import { createDispenseRoutes } from './routes/dispense.js';
import { createFollowUpRoutes } from './routes/follow-ups.js';
import { createAdminRoutes } from './routes/admin.js';
import { createStaffRoutes } from './routes/staff.js';
import { createLabReportRoutes } from './routes/lab-reports.js';
import { createInvoiceRoutes } from './routes/invoices.js';
import { createPharmacyRoutes } from './routes/pharmacy.js';
import { createLabRoutes } from './routes/lab.js';
import { createVendorRoutes } from './routes/vendors.js';
import { createBillingRoutes } from './routes/billing.js';
import { scheduleBackups } from './services/backup-service.js';
import { handleUncaughtError } from './errors.js';
import { isAllowedOrigin, mountWebApp, resolveWebDir } from './web.js';
import { requireAuth } from './middleware/auth.js';

const db = openDatabase({ filePath: defaultDbPath() });
runMigrations(db);

const app = new Hono();
app.onError(handleUncaughtError);

// The desktop app (Tauri) calls this API from its own origin
// (tauri://localhost / http://tauri.localhost), and development runs on
// localhost -- only those may call it from another origin. The website this
// server hands out is same-origin and needs no CORS at all. (Was '*'.)
app.use(
  '*',
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Standard protective headers (no framing, no MIME sniffing, no referrer).
// HSTS is off: this runs on plain http inside the hospital network.
app.use('*', secureHeaders({ strictTransportSecurity: false, crossOriginResourcePolicy: false }));

// The app itself as a website (http://<main-computer>:3001 in any browser).
mountWebApp(app, resolveWebDir());

app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

// This computer's addresses on the hospital network, for "open in any browser".
app.get('/server-info', requireAuth(db), (c) => {
  const port = Number(process.env.PORT ?? 3001);
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((a): a is os.NetworkInterfaceInfo => Boolean(a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')))
    .map((a) => `http://${a.address}:${port}`);
  return c.json({ addresses });
});

app.route('/auth', createAuthRoutes(db));
app.route('/patients', createPatientRoutes(db));
app.route('/medicines', createMedicineRoutes(db));
app.route('/medicine-categories', createMedicineCategoryRoutes(db));
app.route('/dispense', createDispenseRoutes(db));
app.route('/follow-ups', createFollowUpRoutes(db));
app.route('/admin', createAdminRoutes(db));
app.route('/staff', createStaffRoutes(db));
app.route('/lab-reports', createLabReportRoutes(db));
app.route('/invoices', createInvoiceRoutes(db));
app.route('/pharmacy', createPharmacyRoutes(db));
app.route('/lab', createLabRoutes(db));
app.route('/vendors', createVendorRoutes(db));
app.route('/billing', createBillingRoutes(db));

scheduleBackups(db);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Clinic server listening on http://0.0.0.0:${info.port}`);
});
