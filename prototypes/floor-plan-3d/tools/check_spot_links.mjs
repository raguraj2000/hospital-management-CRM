// Photo-spot graph check: prints which spots link to which (as if every panorama existed) and fails when the
// spots split into groups that hotspots cannot cross. Run it after moving or adding a spot in plan.py, before
// rendering the panorama (needs `python3 plan.py` and `npm run build:viewer`; ~1 min with software WebGL):
//   node tools/check_spot_links.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');

const srv = spawn(process.execPath, ['serve.mjs', '8095'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let code = 1;
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto('http://localhost:8095/index.html?mode=walk&still=0');
  await page.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  const g = await page.evaluate(() => {
    const p = window.__viewer.pano;
    p.spots.forEach((s) => { s.available = true; });       // geometry only: links() skips spots without a photo
    return Object.fromEntries(p.spots.map((s) => [s.id, p.links(s.id)]));
  });
  for (const [id, to] of Object.entries(g)) console.log(id.padEnd(12), '->', to.join(', ') || '(none)');
  const seen = new Set(), groups = [];
  for (const id of Object.keys(g)) {
    if (seen.has(id)) continue;
    const group = [], stack = [id];
    seen.add(id);
    while (stack.length) {
      const x = stack.pop();
      group.push(x);
      for (const y of g[x]) if (!seen.has(y)) { seen.add(y); stack.push(y); }
    }
    groups.push(group);
  }
  code = groups.length === 1 ? 0 : 1;
  console.log(code ? `FAIL: ${groups.length} separate groups: ${groups.map((x) => `[${x.join(' ')}]`).join(' ')}`
    : `PASS: all ${seen.size} spots are reachable from each other`);
} finally {
  await browser.close();
  srv.kill();
}
process.exit(code);
