// Screenshots of the web viewer for comparison with the Blender stills.
// node shots.mjs [outDir] [view,view,...]   (needs `npm run build:viewer` and a model.glb)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'renders/web';
const views = (process.argv[3] || 'entrance,hall,living,bedroom,kitchen,store_room,store1,master_bath,foot_path,street,overview').split(',');
const mobile = process.env.MOBILE === '1';
mkdirSync(out, { recursive: true });
const srv = spawn(process.execPath, ['serve.mjs', '8091'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
for (const v of views) {
  const q = v === 'overview' ? 'mode=overview' : `view=${v}`;
  await page.goto(`http://localhost:8091/index.html?${q}&hq=${process.env.HQ ?? '1'}&still=4`);
  await page.waitForFunction(() => window.__ready && window.__frames >= 4, null, { timeout: 180000 });
  await page.waitForTimeout(500);
  await page.screenshot({ timeout: 120000, path: `${out}/${v}${mobile ? '_mobile' : ''}.png` });
  console.log('shot', v);
}
await browser.close();
srv.kill();
