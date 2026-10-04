// Drives the real app in Edge: login form -> add patients via the dialog -> screenshots.
// usage: node e2e/screens.mjs <outDir> <password>
import { chromium } from 'playwright-core';
const [out, password] = process.argv.slice(2);
const base = 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'msedge' });
const log = (...a) => console.log('•', ...a);

async function session(viewport, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE ERROR:', m.text()));
  await page.goto(`${base}/login`);
  await page.getByLabel('Username', { exact: true }).fill('owner');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/main$/);
  return { ctx, page };
}

const { ctx, page } = await session({ width: 1440, height: 900 });
log('logged in via form ->', page.url());

// wrong password shows an error (separate context)
{
  const c = await browser.newContext(); const p = await c.newPage();
  await p.goto(`${base}/login`);
  await p.getByLabel('Username', { exact: true }).fill('owner'); await p.getByLabel('Password', { exact: true }).fill('wrong');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.getByRole('alert').waitFor();
  log('wrong password ->', await p.getByRole('alert').innerText());
  await p.setViewportSize({ width: 1440, height: 900 }); await p.screenshot({ path: `${out}/login-desktop.png` });
  await c.close();
}

const people = [
  { name: 'Ravi Kumar', phone: '9876543210', email: 'ravi@example.com', gender: 'male', age: '45', blood: 'B+' },
  { name: 'Asha Devi', phone: '9812345678', gender: 'female', age: '32', blood: 'O+' },
  { name: 'Lakshmi Narayanan', phone: '9900112233', email: 'lakshmi@example.com', gender: 'female', age: '51', blood: 'A-' },
  { name: 'Muthu Selvam', gender: 'male', age: '67' },
];
const existing = await (await page.request.get(`${base}/api/b/main/patients`)).json();
{
  const have = new Set(existing.patients.map((x) => x.name));
  for (const p of people.filter((x) => !have.has(x.name))) {
    await page.goto(`${base}/main/patients?add=1`);
    await page.getByLabel('Full name', { exact: true }).fill(p.name);
    if (p.phone) await page.getByLabel('Mobile number', { exact: true }).fill(p.phone);
    if (p.email) await page.getByLabel('Email', { exact: true }).fill(p.email);
    await page.getByLabel('Age', { exact: true }).fill(p.age);
    await page.getByLabel('Gender', { exact: true }).selectOption(p.gender);
    if (p.blood) await page.getByLabel('Blood group', { exact: true }).selectOption(p.blood);
    await page.getByRole('button', { name: 'Save patient' }).click();
    await page.waitForURL(/\/patients\/\d+$/);
  }
  log('added', people.length, 'patients through the dialog');
}

// validation shows inline errors
await page.goto(`${base}/main/patients?add=1`);
await page.getByLabel('Full name', { exact: true }).fill('R');
await page.getByLabel('Mobile number', { exact: true }).fill('123');
await page.getByRole('button', { name: 'Save patient' }).click();
await page.getByText('Enter a 10-digit mobile number').waitFor();
log('inline validation shown');
await page.screenshot({ path: `${out}/add-dialog-desktop.png` });

await page.goto(`${base}/main`); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/dashboard-desktop.png` });
await page.goto(`${base}/main/patients`); await page.locator('text=Ravi Kumar >> visible=true').first().waitFor();
await page.screenshot({ path: `${out}/patients-desktop.png` });
await page.getByRole('tab', { name: 'Female' }).click(); await page.waitForTimeout(500);
log('female filter rows:', await page.locator('tbody tr').count());
await page.goto(`${base}/main/patients`); await page.getByRole('link', { name: 'Ravi Kumar' }).first().click();
await page.getByRole('heading', { name: 'Ravi Kumar' }).waitFor();
await page.screenshot({ path: `${out}/patient-desktop.png` });

// user menu + dark theme
await page.getByRole('button', { name: /Owner/ }).last().click();
await page.getByRole('menuitem', { name: 'Dark' }).click();
await page.goto(`${base}/main`); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/dashboard-dark.png` });
await page.evaluate(() => localStorage.setItem('theme', JSON.stringify({ state: { theme: 'light' }, version: 0 })));
await ctx.close();

// phone (real 390px width)
const m = await session({ width: 390, height: 844 });
await m.page.waitForTimeout(800);
await m.page.screenshot({ path: `${out}/dashboard-phone.png`, fullPage: true });
await m.page.goto(`${base}/main/patients`); await m.page.locator('text=Ravi Kumar >> visible=true').first().waitFor();
await m.page.screenshot({ path: `${out}/patients-phone.png` });
await m.page.locator('text=Ravi Kumar >> visible=true').first().click(); await m.page.getByRole('heading', { name: 'Ravi Kumar' }).waitFor();
await m.page.screenshot({ path: `${out}/patient-phone.png`, fullPage: true });
await browser.close();
log('done');
