// New patient (weight + emergency contact) -> UHID -> OP visit -> OP list -> complete -> delete with "Delete".
// usage: node e2e/op-flow.mjs <outDir> <password>
import { chromium } from 'playwright-core';
const [out, password] = process.argv.slice(2);
const base = 'http://localhost:5173';
const log = (...a) => console.log('•', ...a);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
const L = (t) => page.getByLabel(t, { exact: true });

await page.goto(`${base}/login`);
await L('Username').fill('owner');
await L('Password').fill(password);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/main$/);

// 1. register with weight + emergency contact
await page.goto(`${base}/main/patients?add=1`);
await L('Full name').fill('Kavitha Raman');
await L('Mobile number').fill('9840012345');
await L('Weight (kg)').fill('58.5');
await L('Contact name').fill('Raman (husband)');
await L('Contact phone').fill('98400 54321');
await page.screenshot({ path: `${out}/add-form.png` });
await page.getByRole('button', { name: 'Save patient' }).click();
await page.waitForURL(/\/patients\/\d+$/);
await page.getByRole('heading', { name: 'Kavitha Raman' }).waitFor();
const uhid = await page.locator('main .font-mono').first().innerText();
log('UHID shown:', uhid);
await page.getByText('58.5 kg').waitFor();
log('weight row: yes');
await page.getByText('Raman (husband)').waitFor();
await page.getByText('+91 98400 54321').waitFor();
log('emergency contact: name + phone shown');
await page.screenshot({ path: `${out}/patient-overview.png`, fullPage: true });

// 2. start OP visit
await page.getByRole('button', { name: 'New OP visit' }).first().click();
await L('Complaint / reason for visit').fill('Fever for 3 days');
await page.getByRole('button', { name: 'Start OP visit' }).click();
await page.getByText(/^OP-\d{6}-\d{3}$/).first().waitFor();
const opNo = await page.getByText(/^OP-\d{6}-\d{3}$/).first().innerText();
log('OP number:', opNo);
await page.screenshot({ path: `${out}/patient-visits.png` });

// 3. OP list + complete
await page.goto(`${base}/main/visits?show=all`); // the Queue tab hides a visit once it is completed
await page.getByText(opNo, { exact: true }).waitFor();
await page.screenshot({ path: `${out}/op-list.png` });
await page.getByRole('row', { name: new RegExp(opNo) }).getByRole('button', { name: /More actions/ }).click();
await page.getByRole('menuitem', { name: 'Mark completed' }).click();
await page.getByRole('row', { name: new RegExp(opNo) }).getByText('Completed').waitFor();
log('visit completed in OP list');

// 4. delete needs exactly "Delete"
await page.getByRole('row', { name: new RegExp(opNo) }).getByRole('button', { name: /More actions/ }).click();
await page.getByRole('menuitem', { name: 'Delete visit' }).click();
const del = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true });
await page.getByLabel(/Type/).fill('delete');
log('lowercase "delete" -> button disabled:', await del.isDisabled());
await page.getByLabel(/Type/).fill('Delete');
log('"Delete" -> button enabled:', await del.isEnabled());
await page.screenshot({ path: `${out}/confirm-delete.png` });
await del.click();
await page.getByText(opNo, { exact: true }).waitFor({ state: 'detached' });
log('visit deleted; gone from list');

await page.goto(`${base}/main`); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/dashboard.png` });
await browser.close();
log('done');
