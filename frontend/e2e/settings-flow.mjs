// Owner adds a branch admin -> branch admin adds a doctor -> doctor signs in (no Settings) ->
// visit with doctor + vitals -> OP list doctor filter -> owner adds a branch -> doctor changes password.
// usage: node e2e/settings-flow.mjs <outDir> <ownerPassword>
import { chromium } from 'playwright-core';
const [out, ownerPassword] = process.argv.slice(2);
const base = 'http://localhost:5173';
const log = (...a) => console.log('•', ...a);
const run = Date.now().toString(36).slice(-5); // unique usernames per run
const browser = await chromium.launch({ channel: 'msedge' });

async function signIn(username, password) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  await page.goto(`${base}/login`);
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/main(\/|$)/);
  return page;
}
const L = (page, t) => page.getByLabel(t, { exact: true });

// 1. owner adds a branch admin
const owner = await signIn('owner', ownerPassword);
await owner.goto(`${base}/main/settings`);
await owner.getByRole('button', { name: 'Add staff' }).click();
await L(owner, 'Full name').fill('Selvi Admin');
await L(owner, 'Username').fill(`selvi${run}`);
await L(owner, 'Role').selectOption({ label: 'Branch admin' });
await L(owner, 'Temporary password').fill('selvi-pass-1');
await owner.getByRole('dialog').getByRole('button', { name: 'Add staff' }).click();
await owner.getByRole('cell', { name: /Selvi Admin/ }).first().waitFor();
log('owner added branch admin', `selvi${run}`);

// 2. branch admin adds a doctor
const admin = await signIn(`selvi${run}`, 'selvi-pass-1');
await admin.goto(`${base}/main/settings`);
log('branch admin tabs:', (await admin.getByRole('tab').allInnerTexts()).join(', '));
await admin.getByRole('button', { name: 'Add staff' }).click();
await L(admin, 'Full name').fill(`Dr. Meena ${run}`);
await L(admin, 'Username').fill(`meena${run}`);
await L(admin, 'Role').selectOption({ label: 'Doctor' });
await L(admin, 'Temporary password').fill('meena-pass-1');
await admin.screenshot({ path: `${out}/add-staff.png` });
await admin.getByRole('dialog').getByRole('button', { name: 'Add staff' }).click();
await admin.getByRole('cell', { name: new RegExp(`Dr. Meena ${run}`) }).first().waitFor();
await admin.waitForTimeout(400);
await admin.screenshot({ path: `${out}/staff-list.png` });
log('branch admin added doctor', `meena${run}`);

// 3. doctor signs in: no Settings in the menu
const doc = await signIn(`meena${run}`, 'meena-pass-1');
await doc.getByRole('link', { name: 'OP visits' }).waitFor();
log('doctor sees Settings link:', (await doc.getByRole('link', { name: 'Settings' }).count()) > 0);
await doc.goto(`${base}/main/settings`);
await doc.getByText('No access').waitFor();
log('doctor opening /settings -> No access');

// 4. visit with doctor + vitals (branch admin, on a patient)
await admin.goto(`${base}/main/patients`);
await admin.locator('tbody tr').first().click();
await admin.getByRole('button', { name: 'New OP visit' }).first().click();
await L(admin, 'Doctor').selectOption({ label: `Dr. Meena ${run}` });
await L(admin, 'Complaint / reason for visit').fill('Headache and fever');
await L(admin, 'BP upper (mmHg)').fill('132');
await L(admin, 'BP lower (mmHg)').fill('86');
await L(admin, 'Pulse (/min)').fill('84');
await L(admin, 'Temp (°F)').fill('100.2');
await L(admin, 'SpO₂ (%)').fill('97');
await admin.screenshot({ path: `${out}/visit-form.png` });
await admin.getByRole('button', { name: 'Start OP visit' }).click();
await admin.getByText('BP 132/86 · Pulse 84 · 100.2°F · SpO₂ 97%').first().waitFor();
log('visit shows vitals: BP 132/86 · Pulse 84 · 100.2°F · SpO₂ 97%');

// 5. OP list filtered by doctor
await admin.goto(`${base}/main/visits`);
await L(admin, 'Doctor').selectOption({ label: `Dr. Meena ${run}` });
await admin.waitForTimeout(600);
const rows = await admin.locator('tbody tr').count();
log(`OP list filtered to Dr. Meena ${run}:`, rows, 'row(s)');
await admin.screenshot({ path: `${out}/op-list-doctor.png` });

// 6. owner adds a branch; switcher shows it; roles grid
await owner.goto(`${base}/main/settings`);
await owner.getByRole('tab', { name: 'Branches' }).click();
await owner.getByRole('button', { name: 'Add branch' }).click();
await L(owner, 'Branch name').fill(`West ${run}`);
await owner.getByRole('dialog').getByRole('button', { name: 'Add branch' }).click();
await owner.getByRole('cell', { name: new RegExp(`West ${run}`) }).waitFor();
await owner.screenshot({ path: `${out}/branches.png` });
await owner.getByRole('button', { name: /Aadhi Hospital/ }).first().click();
log('branch switcher has new branch:', (await owner.getByRole('menuitem', { name: new RegExp(`West ${run}`) }).count()) === 1);
await owner.keyboard.press('Escape');
await owner.getByRole('tab', { name: 'Roles' }).click();
await owner.getByRole('checkbox').first().waitFor();
await owner.screenshot({ path: `${out}/roles.png` });

// 7. doctor changes own password
await doc.goto(`${base}/main`);
await doc.getByRole('button', { name: new RegExp(`Dr. Meena ${run}`) }).click();
await doc.getByRole('menuitem', { name: 'Change password' }).click();
await L(doc, 'Current password').fill('meena-pass-1');
await L(doc, 'New password').fill('meena-new-pass');
await doc.getByRole('dialog').getByRole('button', { name: 'Change password' }).click();
await doc.getByText('Password changed').waitFor();
const again = await signIn(`meena${run}`, 'meena-new-pass');
log('doctor signs in with new password:', again.url().includes('/main'));

await browser.close();
log('done');
