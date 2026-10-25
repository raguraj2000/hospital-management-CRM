// Full OP day in the browser: stock in -> lab test price -> patient -> OP visit -> prescription +
// lab order -> pharmacy dispense (one click) -> lab sample collected. Screenshots of each screen.
// usage: node e2e/op-workflow.mjs <outDir> <ownerPassword>   (servers must be running)
import { chromium } from 'playwright-core';
const [out, password] = process.argv.slice(2);
const base = 'http://localhost:5173';
const log = (...a) => console.log('•', ...a);
const run = Date.now().toString(36).slice(-4);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
const L = (t) => page.getByLabel(t, { exact: true });
const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

await page.goto(`${base}/login`);
await L('Username').fill('owner');
await L('Password').fill(password);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/main$/);
log('tab title:', await page.title());

// 1. Inventory: medicine + stock
const med = `Paracetamol ${run}`;
await page.goto(`${base}/main/inventory`);
await page.getByRole('button', { name: 'Add medicine' }).first().click();
await L('Medicine name').fill(med);
await L('Strength').fill('500 mg');
await L('Selling price per unit (₹)').fill('2');
await page.getByRole('dialog').getByRole('button', { name: 'Add medicine' }).click();
await page.getByRole('row', { name: new RegExp(med) }).getByRole('button', { name: 'Add stock' }).click();
await L('Batch no.').fill(`B${run}`);
await L('Expiry date').fill(inDays(400));
await L('Quantity (tab)').fill('100');
await page.getByRole('dialog').getByRole('button', { name: 'Add stock' }).click();
await page.getByRole('row', { name: new RegExp(med) }).getByText('100 tab').waitFor();
await page.screenshot({ path: `${out}/1-inventory.png` });
log('inventory: added', med, 'with 100 tab');

// 2. Lab test price
const test = `CBC ${run}`;
await page.goto(`${base}/main/lab`);
await page.getByRole('tab', { name: 'Tests & prices' }).click();
await page.getByRole('button', { name: 'Add test' }).click();
await L('Test name').fill(test);
await L('Price (₹)').fill('300');
await page.getByRole('dialog').getByRole('button', { name: 'Add test' }).click();
await page.getByRole('cell', { name: test }).waitFor();
log('lab: added test', test);

// 3. Patient + OP visit -> consultation screen
await page.goto(`${base}/main/patients?add=1`);
await L('Full name').fill(`Fever Patient ${run}`);
await page.getByRole('button', { name: 'Save patient' }).click();
await page.waitForURL(/\/patients\/\d+$/);
await page.getByRole('button', { name: 'New OP visit' }).first().click();
await L('Complaint / reason for visit').fill('Fever for 3 days');
await L('Temp (°F)').fill('101.4');
await page.getByRole('button', { name: 'Start OP visit' }).click();
await page.waitForURL(/\/visits\/\d+$/);
log('OP visit opened:', page.url());

// 4. Prescription: 1-0-1 x 5 days -> 10 tabs; order the test
await page.getByLabel('Search medicine').fill(run);
await page.getByLabel('Medicine', { exact: true }).selectOption({ index: 1 });
await page.getByRole('button', { name: 'Add to prescription' }).click();
await page.getByRole('cell', { name: new RegExp(med) }).waitFor();
log('prescription line added (auto qty):', await page.getByRole('row', { name: new RegExp(med) }).locator('td').nth(2).innerText());
await page.getByRole('checkbox', { name: new RegExp(test) }).check();
await page.getByRole('button', { name: /Order 1 test/ }).click();
await page.getByText('Ordered', { exact: true }).waitFor();
await page.screenshot({ path: `${out}/2-consultation.png`, fullPage: true });

// 5. Pharmacy: one click
await page.goto(`${base}/main/pharmacy`);
const card = page.locator('div', { has: page.getByRole('link', { name: `Fever Patient ${run}` }) }).last();
await page.getByRole('button', { name: /Dispense ₹20/ }).first().waitFor();
await page.screenshot({ path: `${out}/3-pharmacy.png` });
await page.getByRole('button', { name: /Dispense ₹20/ }).first().click();
await page.getByText(/Dispensed · PH-/).waitFor();
log('pharmacy dispensed ₹20 in one click');
await page.getByRole('tab', { name: /Today's sales/ }).click();
await page.screenshot({ path: `${out}/4-sales.png` });
void card;

// 6. Inventory dropped by 10
await page.goto(`${base}/main/inventory`);
log('stock after sale:', await page.getByRole('row', { name: new RegExp(med) }).locator('td').nth(2).innerText());

// 7. Lab queue
await page.goto(`${base}/main/lab`);
await page.getByRole('row', { name: new RegExp(`Fever Patient ${run}`) }).getByRole('button', { name: 'Sample collected' }).click();
await page.getByRole('row', { name: new RegExp(`Fever Patient ${run}`) }).getByText('Sample collected').waitFor();
await page.screenshot({ path: `${out}/5-lab.png` });
log('lab: sample collected');

await browser.close();
log('done');
