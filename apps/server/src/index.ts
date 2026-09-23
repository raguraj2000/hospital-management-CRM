// argon2 is loaded first only for a stable native-module load order. NOTE:
// the "Assertion failed: (env) != nullptr" crash once blamed on load order
// is actually a Node 24.19+ bug in how better-sqlite3 was COMPILED -- see
// scripts/check-native-gc.cjs for the real cause and the guard against it.
import 'argon2';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
import { scheduleBackups } from './services/backup-service.js';

const db = openDatabase({ filePath: defaultDbPath() });
runMigrations(db);

const app = new Hono();

// Desktop clients hit this API from a different origin than the API itself
// (the Tauri webview serves the UI from tauri://localhost / http://tauri.localhost,
// not http://<main-computer>:3001) -- without CORS enabled here, the browser
// engine inside the app silently blocks every request and it looks
// indistinguishable from the server being unreachable. Wide-open origin is
// fine here: this is a closed LAN tool with bearer-token auth, not cookies,
// so there's no cross-site credential leakage to defend against.
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

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

scheduleBackups(db);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Clinic server listening on http://0.0.0.0:${info.port}`);
});
