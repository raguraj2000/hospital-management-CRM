// Photo-mode regression test (Playwright, software WebGL, ~10 min on 4 cores).
// Runs on the six placeholder panoramas in build/test_pano (python3 tools/make_test_panos.py), never on the real
// renders: it starts its own server on port 8096 that serves that folder as /pano/. Run from the project dir:
//   node tools/test_photo_mode.mjs     -> PASS/FAIL lines, screenshots in renders/web/photo/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const TEST_PANOS = ['entrance', 'hall_south', 'hall_mid', 'hall_living', 'bedroom', 'store2'];
const missing = TEST_PANOS.filter((id) => !existsSync(`build/test_pano/${id}.jpg`));
if (missing.length) { console.log(`missing test panoramas (${missing.join(', ')}): run python3 tools/make_test_panos.py`); process.exit(2); }
const srv = spawn(process.execPath, ['serve.mjs', '8096'], { stdio: 'ignore', env: { ...process.env, PANO_DIR: 'build/test_pano' } });
process.on('exit', () => srv.kill());
process.on('unhandledRejection', (e) => { console.log('UNHANDLED', e); process.exit(2); });
await new Promise((r) => setTimeout(r, 600));
const { chromium } = createRequire(import.meta.url)('playwright');
const out = 'renders/web/photo';
const B = 'http://localhost:8096/index.html';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (c, msg, extra = '') => { console.log(c ? '  PASS' : '  FAIL', msg, extra); if (!c) fails++; };
const logs = [];
async function open(ctxOpts, url, tag) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') logs.push({ tag, text: m.text(), url: m.location().url }); });
  page.on('pageerror', (e) => logs.push({ tag, text: 'PAGEERROR ' + e.message, url: '' }));
  await page.goto(url);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  return page;
}
const st = (page) => page.evaluate(() => { const v = window.__viewer, p = v.pano; return { mode: v.mode, cur: p.current?.id, yaw: p.yaw, pitch: p.pitch, fov: p.fov,
  wyaw: v.look.yaw, feet: [v.feet.z / 0.3048, -v.feet.x / 0.3048, v.feet.y], links: p.current ? p.links(p.current.id) : [], hs: p.hotspots(), loaded: p.loaded,
  hero: p.current ? p.heroLook(p.current.id) : null,
  avail: p.available, busy: p.transitioning, room: document.getElementById('room').textContent, size: document.getElementById('size').textContent,
  spot: document.getElementById('spot').textContent, photoBtn: !document.getElementById('bPhoto').hidden,
  hidden: ['bHQ', 'bEdit', 'bLayers'].map((b) => document.getElementById(b).hidden), help: document.getElementById('help').textContent,
  opts: [...document.querySelectorAll('#goto optgroup[label="Photo spots"] option')].map((o) => o.value) }; });
// same direction (radians, any number of turns apart)
const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;
const atHero = (s) => !!s.hero && near(s.yaw, s.hero.yaw) && near(s.pitch, s.hero.pitch);
const settle = async (page) => { await page.waitForFunction(() => !window.__viewer.pano.transitioning, null, { timeout: 30000 }); await page.waitForTimeout(150); };
const shot = (page, path) => page.screenshot({ path, timeout: 90000 }).catch((e) => console.log('  (screenshot skipped: headless GPU stall)', path));
const D = { viewport: { width: 1280, height: 720 } };
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

for (const [name, opts] of [['desktop', D], ['mobile', M]]) {
  console.log(`== ${name}: default start`);
  let page = await open(opts, `${B}?still=4`, name);
  let s = await st(page);
  ok(s.mode === 'photo' && s.cur === 'entrance', 'default start is Photo at entrance', JSON.stringify([s.mode, s.cur]));
  ok(atHero(s), "default start faces the entrance's opening view (plan look)", JSON.stringify([s.yaw, s.pitch, s.hero]));
  ok(s.photoBtn && s.hidden.every(Boolean), 'Photo button shown; HQ/Edit/Layers hidden');
  ok(s.avail.length === 6 && s.opts.length === 6, 'only the 6 existing panos are offered', s.opts.join(','));
  ok(s.room === 'Entrance Space', 'HUD room from the pano', `${s.room} | ${s.size} | ${s.spot}`);
  await shot(page, `${out}/${name}_default_entrance.png`);
  await page.context().close();

  console.log(`== ${name}: hall_mid looking north (hall_living must be toward N)`);
  page = await open(opts, `${B}?pano=hall_mid&heading=0&pitch=-42&still=4`, name);
  s = await st(page);
  const hl = s.hs.find((h) => h.id === 'hall_living');
  ok(s.cur === 'hall_mid' && hl?.screen && Math.abs(hl.screen.x - opts.viewport.width / 2) < 3, 'hall_living ring is on the screen centre line when looking north', JSON.stringify(hl));
  ok(s.links.includes('hall_south') && !s.hs.find((h) => h.id === 'hall_south').screen, 'hall_south (south) is behind the camera');
  await shot(page, `${out}/${name}_hall_mid_north.png`);
  await page.context().close();
  page = await open(opts, `${B}?pano=hall_mid&heading=90&pitch=0&still=4`, name);
  await shot(page, `${out}/${name}_hall_mid_east.png`);
  await page.context().close();

  console.log(`== ${name}: bedroom (no hotspot for store2 through the walls)`);
  page = await open(opts, `${B}?pano=bedroom&heading=291&pitch=-10&still=4`, name);
  s = await st(page);
  ok(s.cur === 'bedroom' && !s.links.includes('store2') && s.links.join() === 'hall_south', 'bedroom links', s.links.join(','));
  ok(s.room === 'Master Bedroom' && s.size.includes("15' x 11'9"), 'HUD', `${s.room} | ${s.size}`);
  await shot(page, `${out}/${name}_bedroom_toward_store2.png`);
  await page.context().close();

  console.log(`== ${name}: stepping, look, zoom (live loop)`);
  page = await open(opts, `${B}?pano=hall_south&heading=0&pitch=-22&hq=0`, name);
  s = await st(page);
  const yaw0 = s.yaw;
  const hm = s.hs.find((h) => h.id === 'hall_mid');
  ok(!!hm?.screen, 'hall_mid ring visible from hall_south', JSON.stringify(hm));
  await shot(page, `${out}/${name}_hall_south_before_step.png`);
  if (name === 'mobile') await page.touchscreen.tap(hm.screen.x, hm.screen.y); else await page.mouse.click(hm.screen.x, hm.screen.y);
  await page.waitForTimeout(170);
  await shot(page, `${out}/${name}_step_midfade.png`);
  await settle(page);
  s = await st(page);
  ok(s.cur === 'hall_mid' && Math.abs(s.yaw - yaw0) < 1e-6, 'tap on the ring steps to hall_mid, heading kept', `${s.cur} yaw ${s.yaw}`);
  ok(Math.abs(s.feet[0] - 19) < 0.01 && Math.abs(s.feet[1] - 17) < 0.01, 'walker follows the pano point', s.feet.map((x) => x.toFixed(2)).join(','));
  await shot(page, `${out}/${name}_after_step_hall_mid.png`);
  await page.keyboard.press('ArrowUp'); await settle(page);
  s = await st(page);
  ok(s.cur === 'hall_living', 'ArrowUp steps to the hotspot nearest the view centre', s.cur);
  await page.keyboard.press('KeyS'); await settle(page);
  s = await st(page);
  ok(s.cur === 'hall_mid', 'S steps back', s.cur);
  // label click
  await page.evaluate(() => { window.__viewer.pano.pitch = -0.9; }); await page.waitForTimeout(200);
  // drag: 1:1
  const k = await page.evaluate(() => 2 * Math.tan(window.__viewer.pano.camera.fov * Math.PI / 360) / innerHeight);
  const cx = opts.viewport.width / 2, cy = opts.viewport.height / 2;
  const before = await st(page);
  if (name === 'desktop') {
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 10, { steps: 4 }); await page.mouse.move(cx + 120, cy + 20, { steps: 4 }); await page.mouse.up();
  } else {
    const cdp = await page.context().newCDPSession(page);
    const tp = (x, y, id = 0) => ({ x, y, id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(cx, cy)] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tp(cx + 15 * i, cy + 2.5 * i)] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await page.waitForTimeout(150);
  s = await st(page);
  ok(Math.abs((s.yaw - before.yaw) - 120 * k) < 1e-3 && Math.abs((s.pitch - before.pitch) - 20 * k) < 1e-3, 'drag is 1:1 (120 px, 20 px)', `dyaw ${(s.yaw - before.yaw).toFixed(4)} expected ${(120 * k).toFixed(4)}`);
  ok(s.cur === 'hall_mid', 'a drag is not a tap');
  if (name === 'desktop') {
    await page.mouse.wheel(0, -400); await page.waitForTimeout(100);
    const z = await st(page); ok(z.fov < before.fov, 'wheel zooms in', `${before.fov} -> ${z.fov.toFixed(1)}`);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 100); await page.waitForTimeout(100);
    ok((await st(page)).fov === 95, 'zoom out clamps at 95');
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, -100); await page.waitForTimeout(100);
    ok((await st(page)).fov === 35, 'zoom in clamps at 35');
    await shot(page, `${out}/${name}_zoomed_in.png`);
    await page.evaluate(() => { window.__viewer.pano.fov = 65; });
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
    ok((await st(page)).yaw > s.yaw, 'ArrowLeft rotates');
  } else {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 40, y: cy, id: 0 }, { x: cx + 40, y: cy, id: 1 }] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 40 - 10 * i, y: cy, id: 0 }, { x: cx + 40 + 10 * i, y: cy, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
    const z = await st(page);
    ok(Math.abs(z.fov - before.fov * 80 / 200) < 1 || z.fov === 35, 'pinch out zooms in', `${before.fov} -> ${z.fov.toFixed(1)}`);
    ok(Math.abs(z.yaw - s.yaw) < 0.02, 'pinch does not spin the view', `${(z.yaw - s.yaw).toFixed(4)}`);
    await page.evaluate(() => { window.__viewer.pano.fov = 60; });
  }

  console.log(`== ${name}: Photo -> Walk -> Photo`);
  await page.evaluate(() => { const p = window.__viewer.pano; p.yaw = 0.6; p.pitch = -0.2; }); await page.waitForTimeout(150);
  await page.click('#bWalk'); await page.waitForTimeout(name === 'mobile' ? 2500 : 2500);
  s = await st(page);
  ok(s.mode === 'walk' && Math.abs(s.wyaw - 0.6) < 1e-6 && Math.abs(s.feet[0] - 19) < 0.05 && Math.abs(s.feet[1] - 17) < 0.05,
    'Walk: walker stands at hall_mid with the same heading', JSON.stringify([s.mode, s.wyaw, s.feet]));
  ok(s.hidden.every((h) => !h), 'HQ/Edit/Layers back in Walk');
  await shot(page, `${out}/${name}_walk_from_photo.png`);
  await page.click('#bPhoto'); await settle(page); await page.waitForTimeout(300);
  s = await st(page);
  ok(s.mode === 'photo' && s.cur === 'hall_mid' && Math.abs(s.yaw - 0.6) < 1e-6 && Math.abs(s.pitch + 0.2) < 1e-6, 'Photo again: same pano, same look', JSON.stringify([s.mode, s.cur, s.yaw, s.pitch]));
    await shot(page, `${out}/${name}_photo_again.png`);

  console.log(`== ${name}: minimap, Go to, memory`);
  const box = await page.locator('#map').boundingBox();
  const mp = (u, v) => [box.x + (26 + u * (400 - 52) / 43.5) / 400 * box.width, box.y + (26 + v * (400 - 52) / 43.5) / 400 * box.height];
  const [mxx, myy] = mp(18, 33);   // inside store 2, not exactly on its dot
  if (name === 'mobile') await page.touchscreen.tap(mxx, myy); else await page.mouse.click(mxx, myy);
  await settle(page);
  s = await st(page);
  ok(s.mode === 'photo' && s.cur === 'store2', 'minimap tap goes to the nearest pano (store2), stays in Photo', `${s.mode} ${s.cur}`);
  ok(atHero(s), "a minimap jump turns to that spot's opening view (store2: east, down the aisle)", JSON.stringify([s.yaw, s.pitch, s.hero]));
  ok(s.links.length === 0, 'store2 has no available neighbour (foot_path file is missing)', s.links.join(','));
  await shot(page, `${out}/${name}_store2_via_minimap.png`);
  await page.selectOption('#goto', 'p:entrance'); await page.waitForTimeout(170);
  await shot(page, `${out}/${name}_jump_midfade.png`);
  await settle(page);
  s = await st(page);
  ok(s.cur === 'entrance' && s.mode === 'photo', 'Go to > Photo spots > Entrance', s.cur);
  ok(atHero(s), "a Go-to jump turns to that spot's opening view", JSON.stringify([s.yaw, s.pitch, s.hero]));
  ok(s.loaded.length <= 6, 'at most 6 panoramas kept', s.loaded.join(','));
  const tex = await page.evaluate(() => window.__viewer.pano.loaded.length);
  await page.selectOption('#goto', 'r:kitchen'); await page.waitForTimeout(2500);
  s = await st(page);
  ok(s.mode === 'walk' && s.room === 'Kitchen', 'Go to a room from Photo -> Walk in that room', `${s.mode} ${s.room}`);
  await page.click('#bPhoto'); await settle(page);
  s = await st(page);
  ok(s.cur === 'hall_south', 'Photo from the kitchen -> nearest pano in sight (hall_south 11 ft, not bedroom 10 ft through the wall)', s.cur);
  await page.keyboard.press('KeyO'); await page.waitForTimeout(2500);
  s = await st(page);
  ok(s.mode === 'walk', 'O leaves Photo', s.mode);
  await page.context().close();
}

console.log('== no panoramas at all -> no Photo button, walk start as before');
{
  const ctx = await browser.newContext(D); const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/pano/*', (r) => r.fulfill({ status: 404, body: 'not found' }));
  await page.goto(`${B}?still=4&hq=0`);
  await page.waitForFunction(() => window.__ready && window.__frames >= 4, null, { timeout: 240000 });
  const s = await st(page);
  ok(s.mode === 'walk' && !s.photoBtn && s.opts.length === 0 && errs.length === 0, 'walk mode, Photo hidden, no page errors', JSON.stringify([s.mode, s.photoBtn, errs]));
  await shot(page, `${out}/desktop_no_panos.png`);
  await ctx.close();
}
console.log('== broken image (exists but does not decode) is dropped quietly');
{
  const ctx = await browser.newContext(D); const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route('**/pano/hall_south.jpg', (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: 'garbage' }));
  await page.goto(`${B}?pano=entrance&heading=0&pitch=-20`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await page.waitForFunction(() => !window.__viewer.pano.available.includes('hall_south'), null, { timeout: 60000 }).catch(() => {});
  const s = await st(page);
  ok(!s.opts.includes('p:hall_south'), 'and removed from Go to', s.opts.join(','));
  ok(s.cur === 'entrance' && !s.avail.includes('hall_south') && !s.links.includes('hall_south') && errs.length === 0, 'hall_south removed after its load failed', JSON.stringify([s.links, errs]));
  await ctx.close();
}
console.log('== texture size cap (?panomax=1024) and host that answers HEAD with 405');
{
  const ctx = await browser.newContext(D); const page = await ctx.newPage();
  await page.route('**/pano/*', (r) => (r.request().method() === 'HEAD' ? r.fulfill({ status: 405 }) : r.continue()));
  await page.goto(`${B}?pano=hall_living&heading=180&pitch=-30&panomax=1024&still=4`);
  await page.waitForFunction(() => window.__ready && window.__frames >= 4, null, { timeout: 240000 });
  const s = await st(page);
  const w = await page.evaluate(() => { const p = window.__viewer.pano; return p.scene.children.find((c) => c.visible && c.material.map?.image?.width).material.map.image.width; });
  ok(w === 1024 && s.avail.length === 6, 'texture drawn through a 1024 px canvas; probing falls back to image loads', `${w} ${s.avail.length}`);
  await shot(page, `${out}/desktop_hall_living_south_1024.png`);
  await ctx.close();
}
console.log('== console');
const net = logs.filter((l) => /status of 404/.test(l.text) && /\/pano\//.test(l.url));
const other = logs.filter((l) => !net.includes(l));
console.log(`  network 404 lines for missing pano files: ${net.length} (${[...new Set(net.map((l) => l.url.split('/').pop()))].join(', ')})`);
ok(other.length === 0, 'no other console errors / page errors', JSON.stringify(other.slice(0, 5)));
await browser.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
