// Screen smoke test: the main flow of each role in a real browser, on a throwaway database.
//   npm run e2e            (builds the web app first; needs Microsoft Edge or Chrome installed)
//   5. doctor prescribes on screen and sends; 6. pharmacist direct sale; 7. nurse gives a dose; 8. Permissions page per role
// Starts its own server on port 4399 with an empty database, sets up staff, a medicine and a lab test, then:
//   1. front desk: Ctrl+K -> register a patient -> start an OP visit
//   2. counter: the doctor's charges arrive; Collect (5-second Undo) -> the bill prints
//   3. lab: enter a result and complete it
//   4. every role: every page of its side menu opens with no crash, no server error, no sideways overflow
// Exit code 1 when anything fails. Nothing is kept: the database is deleted at the end.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..', '..');
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('playwright-core');
const PORT = 4399;
// E2E_BASE=<url>: test a server that is already running (e.g. the Cloudflare version under `wrangler dev`),
// set up with the same owner (9000000000 / e2e-password, "E2E Clinic"). Otherwise a fresh local server is started.
const external = process.env.E2E_BASE;
const base = external ?? `http://localhost:${PORT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hms-e2e-'));
const dbUrl = `file:${path.join(tmp, 'e2e.db').split(path.sep).join('/')}`;
const env = { ...process.env, PORT: String(PORT), DATABASE_URL: dbUrl, WEB_DIR: path.join(root, 'apps', 'web', 'dist'), OWNER_MOBILE: '9000000000', OWNER_PASSWORD: 'e2e-password', ORG_NAME: 'E2E Clinic', NODE_ENV: 'test' };
const failures = [];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};
const step = async (name, fn) => {
  console.log(name);
  try {
    await fn();
  } catch (e) {
    fail(`${name}: ${String(e.message).split('\n')[0]}`);
  }
};

if (!fs.existsSync(path.join(env.WEB_DIR, 'index.html'))) {
  console.error('Build the web app first: npm run build');
  process.exit(1);
}
const tsx = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
if (!external) execFileSync(tsx, ['src/setup-tool.ts', 'init'], { cwd: path.join(root, 'apps', 'api'), env, stdio: 'ignore', shell: process.platform === 'win32' });
const server = external ? null : spawn(tsx, ['src/index.ts'], { cwd: path.join(root, 'apps', 'api'), env, stdio: 'ignore', shell: process.platform === 'win32' });
for (let i = 0; i < 60; i++) {
  if (await fetch(`${base}/login`).then((r) => r.ok).catch(() => false)) break;
  await new Promise((r) => setTimeout(r, 500));
}

let browser;
try {
  // ---- set-up through the API (what a hospital does once)
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobile: '9000000000', password: 'e2e-password' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const call = async (method, p, body) => {
    const r = await fetch(`${base}/api/b/main${p}`, { method, headers: { cookie, 'content-type': 'application/json', origin: base }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status >= 400) throw new Error(`${method} ${p}: ${r.status} ${j.error ?? ''}`);
    return j;
  };
  const roles = (await call('GET', '/roles')).roles;
  const staff = { doctor: '9000000002', front_desk: '9000000003', pharmacist: '9000000004', lab_technician: '9000000005', nurse: '9000000006', branch_admin: '9000000007' };
  for (const [key, mobile] of Object.entries(staff)) await call('POST', '/staff', { name: `E2E ${key}`, mobile, password: 'staff-pass-123', roleId: roles.find((r) => r.key === key).id });
  await call('PUT', '/billing/settings', { consultationFeePaise: 15000 });
  const med = await call('POST', '/medicines', { name: 'Paracetamol', form: 'tablet', strength: '500 mg', pricePaise: 200 });
  await call('POST', `/medicines/${med.id}/batches`, { batchNo: 'E1', expiryDate: `${new Date().getFullYear() + 2}-01-01`, quantity: 100 });
  const test = await call('POST', '/lab/tests', { name: 'Haemoglobin test', pricePaise: 10000, parameters: [{ name: 'Haemoglobin', method: 'Analyser', unit: 'g/dl', refRange: '12 - 15' }] });

  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : 'chrome' });
  const open = async (mobile, password = 'staff-pass-123', viewport = { width: 1366, height: 800 }) => {
    const page = await (await browser.newContext({ viewport })).newPage();
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(`crash: ${e.message}`));
    page.on('response', (r) => r.url().includes('/api/') && r.status() >= 500 && page.errors.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`));
    await page.addInitScript(() => (window.print = () => {}));
    await page.goto(`${base}/login`);
    await page.getByLabel(/mobile/i).fill(mobile);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/main/);
    return page;
  };

  let visitId;
  await step('1. Front desk registers a patient and starts an OP visit (Ctrl+K)', async () => {
    const desk = await open(staff.front_desk);
    await desk.waitForLoadState('networkidle'); // the shortcut works once the app has loaded
    await desk.keyboard.press('Control+KeyK');
    await desk.getByRole('button', { name: /Register new patient/ }).click();
    await desk.getByLabel(/Full name/).fill('E2E Patient');
    await desk.getByLabel(/Mobile/).first().fill('9876500555');
    await desk.getByRole('button', { name: /Save & continue/ }).click();
    await desk.waitForTimeout(6500); // the 5-second Undo
    await desk.getByRole('button', { name: /^(Start OP visit|Save visit|Add to the list)/ }).first().click();
    await desk.waitForTimeout(6500);
    const visits = (await call('GET', '/visits')).visits.filter((v) => v.patientName === 'E2E Patient');
    if (visits.length !== 1) throw new Error(`expected 1 visit, found ${visits.length}`);
    visitId = visits[0].id;
    ok(`visit ${visits[0].opNo}, token ${visits[0].token}`);
    if (desk.errors.length) fail(desk.errors.join(' · '));
  });

  await step('2. Counter collects and the bill prints', async () => {
    await call('POST', '/visits/call-next', { visitId });
    await call('POST', `/visits/${visitId}/prescription`, { medicineId: med.id, dose: '1-0-1', days: 3 });
    await call('POST', `/visits/${visitId}/charges`, { description: 'Dressing', amountPaise: 5000 });
    await call('POST', `/visits/${visitId}/send`, { to: 'counter' });
    const counter = await open(staff.front_desk);
    await counter.goto(`${base}/main/billing`);
    await counter.getByRole('button', { name: /^Collect ₹/ }).first().click();
    await counter.locator('form button[type=submit]').click();
    await counter.waitForURL(/\/bill\/print/, { timeout: 15000 });
    const bills = (await call('GET', `/visits/${visitId}/bills`)).bills;
    if (!bills.length || bills[0].status !== 'paid') throw new Error('the bill is not paid');
    ok(`paid ${bills[0].billNo}: ₹${bills[0].totalPaise / 100}, print page opened`);
    if (counter.errors.length) fail(counter.errors.join(' · '));
  });

  await step('3. Lab enters a result and completes it', async () => {
    // The paid visit is completed (final): the test is on a new visit of the same patient.
    const patientId = (await call('GET', `/visits/${visitId}`)).visit.patientId;
    const labVisit = (await call('POST', `/patients/${patientId}/visits`, { complaint: 'Lab check' })).visit.id;
    await call('POST', `/visits/${labVisit}/lab-orders`, { testIds: [test.id] });
    const lab = await open(staff.lab_technician);
    await lab.goto(`${base}/main/lab/visits/${labVisit}`);
    await lab.getByLabel('Haemoglobin', { exact: true }).fill('13.2');
    await lab.getByRole('button', { name: /Save & complete/ }).first().click();
    await lab.getByRole('dialog').getByRole('button').last().click().catch(() => {});
    await lab.waitForTimeout(6500);
    const order = (await call('GET', `/visits/${labVisit}/lab-orders`)).orders[0];
    if (order.status !== 'completed') throw new Error(`lab order is ${order.status}`);
    ok('result saved and completed');
    if (lab.errors.length) fail(lab.errors.join(' · '));
  });

  await step('5. Doctor prescribes on screen and sends the patient to the pharmacy', async () => {
    const pid = (await call('POST', '/patients', { name: 'E2E Doctor Patient', phone: '9876500556' })).patient.id;
    const vid = (await call('POST', `/patients/${pid}/visits`, { complaint: 'Fever' })).visit.id;
    await call('POST', '/visits/call-next', { visitId: vid });
    const doc = await open(staff.doctor);
    await doc.goto(`${base}/main/visits/${vid}`);
    await doc.waitForLoadState('networkidle');
    await doc.getByLabel('Medicine').click();
    await doc.keyboard.type('Paracetamol');
    await doc.waitForTimeout(300);
    await doc.keyboard.press('Enter');
    await doc.getByRole('button', { name: /Add to prescription/ }).click();
    await doc.waitForTimeout(800);
    for (let i = 0; i < 4; i++) {
      if (await doc.getByRole('button', { name: /Create prescription & send to pharmacy/ }).isVisible().catch(() => false)) break;
      await doc.getByRole('button', { name: /^Next/ }).click();
    }
    await doc.getByRole('button', { name: /Create prescription & send to pharmacy/ }).click();
    await doc.waitForTimeout(6500); // the 5-second Undo
    const v = (await call('GET', `/visits/${vid}`)).visit;
    if (v.status !== 'at_counter') throw new Error(`visit is ${v.status}`);
    const items = (await call('GET', `/visits/${vid}/prescription`)).items;
    if (items.length !== 1 || items[0].days !== 3) throw new Error(`prescription: ${JSON.stringify(items.map((i) => [i.medicineName, i.days]))}`);
    ok('1 medicine (3 days by default), sent to the counter');
    if (doc.errors.length) fail(doc.errors.join(' · '));
  });

  await step('6. Pharmacist sells over the counter (direct sale)', async () => {
    const ph = await open(staff.pharmacist);
    await ph.goto(`${base}/main/pharmacy?tab=direct`);
    await ph.getByLabel('Search medicine to add').fill('Paracetamol');
    await ph.keyboard.press('Enter');
    await ph.waitForTimeout(300);
    const before = (await call('GET', '/medicines')).medicines.find((m) => m.id === med.id).stock;
    await ph.locator('button[data-shortcut="alt+s"]').click();
    await ph.waitForTimeout(6500);
    const after = (await call('GET', '/medicines')).medicines.find((m) => m.id === med.id).stock;
    if (!(after < before)) throw new Error(`stock ${before} -> ${after}`);
    ok(`sold, stock ${before} -> ${after}`);
    if (ph.errors.length) fail(ph.errors.join(' · '));
  });

  await step('7. Nurse gives a dose given here in the hospital', async () => {
    const pid = (await call('POST', '/patients', { name: 'E2E Nurse Patient' })).patient.id;
    const vid = (await call('POST', `/patients/${pid}/visits`, { complaint: 'Drip' })).visit.id;
    await call('POST', `/visits/${vid}/prescription`, { medicineId: med.id, dose: '1-0-0', days: 1, givenHere: true });
    const nurse = await open(staff.nurse);
    await nurse.goto(`${base}/main/treatments?tab=doses`);
    await nurse.waitForLoadState('networkidle');
    await nurse.getByRole('button', { name: /^Given$/ }).first().click();
    const dlg = nurse.getByRole('dialog');
    await dlg.getByRole('button').last().click();
    await nurse.waitForTimeout(6500);
    const doses = (await call('GET', '/treatments')).doses.filter((d) => d.patientName === 'E2E Nurse Patient');
    if (!doses.length || !doses.every((d) => d.givenAt)) throw new Error('the dose is not marked given');
    ok('dose marked given');
    if (nurse.errors.length) fail(nurse.errors.join(' · '));
  });

  await step('8. Owner and branch admin see the Permissions page; others do not', async () => {
    for (const [who, mobile, password, visible] of [['owner', '9000000000', 'e2e-password', true], ['branch_admin', staff.branch_admin, undefined, true], ['front_desk', staff.front_desk, undefined, false]]) {
      const page = await open(mobile, password);
      await page.goto(`${base}/main/settings`);
      await page.waitForLoadState('networkidle');
      const seen = await page.getByRole('tab', { name: /Permissions/ }).count();
      if (!!seen !== visible) throw new Error(`${who}: Permissions tab ${seen ? 'shown' : 'hidden'}`);
      if (page.errors.length) fail(`${who}: ${page.errors.join(' · ')}`);
      await page.context().close();
    }
    ok('owner and branch admin yes, front desk no');
  });

  await step('9. Every page of every role opens cleanly (laptop and phone)', async () => {
    const people = { owner: ['9000000000', 'e2e-password'], ...Object.fromEntries(Object.entries(staff).map(([k, m]) => [k, [m]])) };
    for (const [role, [mobile, password]] of Object.entries(people)) {
      for (const viewport of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
        const page = await open(mobile, password, viewport);
        const paths = viewport.width > 800 ? await page.locator('aside nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))) : (people[role].paths ?? []);
        if (viewport.width > 800) people[role].paths = paths;
        for (const p of paths) {
          page.errors.length = 0;
          await page.goto(base + p);
          await page.waitForLoadState('networkidle');
          const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (over > 4) fail(`${role} ${viewport.width}px ${p}: ${over}px wider than the screen`);
          if (page.errors.length) fail(`${role} ${viewport.width}px ${p}: ${page.errors.join(' · ')}`);
        }
        await page.context().close();
      }
      ok(`${role}: ${people[role].paths.length} pages`);
    }
  });
} finally {
  await browser?.close();
  if (server && process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  } else server?.kill();
  await new Promise((r) => setTimeout(r, 500));
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* Windows may still hold the file: left in the temp folder */
  }
}
console.log(failures.length ? `\nFAILED: ${failures.length} problem${failures.length > 1 ? 's' : ''}` : '\nALL GOOD');
process.exit(failures.length ? 1 : 0);
