// Photo mode: path-traced 360° panoramas (equirectangular JPEGs in viewer/pano/) shown from fixed standing
// points, with floor-ring hotspots to step from point to point.  Everything panorama-related lives here;
// main.js only switches modes, feeds the line-of-sight test and draws the minimap.
//
// ---------------------------------------------------------------------------------------------------------
// EQUIRECT CONVENTION (flip it here, in one place)
//
// Intended contract for viewer/pano/<id>.jpg (2:1, upright camera at the pano's eye point):
//   * the horizontal CENTRE of the image looks NORTH (three.js -z)
//   * moving RIGHT in the image turns toward EAST (three.js +x), i.e. clockwise seen from above
//   * the left and right edges are SOUTH, the top row is straight up
//
// PANO_YAW_OFFSET_DEG  compass bearing (degrees clockwise from north, seen from above) that the horizontal
//                      centre of the image looks at.  0 = north, 90 = east, 180 = south, -90 = west.
// PANO_FLIP_X          false: moving right in the image turns clockwise (N -> E -> S -> W), as above.
//                      true:  the image is mirrored left-right about its centre (right turns toward WEST).
//
// One pano can override either in plan.json (plan.py PANO_OVERRIDES): { "yaw_offset_deg": 90, "flip_x": true }.
// ---------------------------------------------------------------------------------------------------------
import * as THREE from 'three';

export const PANO_YAW_OFFSET_DEG = 0;
export const PANO_FLIP_X = false;

const FT = 0.3048;
const REACH_FT = 22;          // hotspots are offered up to this distance (plan feet) ...
const SIDE_FT = 1.25;         // ... when a straight path is clear on the centre line or this far to either side
const FADE_MS = 350;
const FOV_MIN = 35, FOV_MAX = 95, FOV_V_MAX = 112;
const PITCH_MAX = 1.35;       // same limit as walk mode, so the look state carries over unchanged
const MAX_GPU = 6;            // panoramas kept on the GPU: the current one + its nearest neighbours
const RADIUS = 50;            // sphere radius (m); only has to sit between the camera's near and far planes

/**
 * createPano(opts) -> controller.  Nothing is drawn or listened to until enter() is called.
 *
 * opts
 *   renderer    THREE.WebGLRenderer (shared with walk mode)
 *   canvas      the canvas that receives pointer / wheel input
 *   plan        plan.json; uses plan.panos = [{ id, label, eye: [u, v, z] ft, file, room, yaw_offset_deg?, flip_x? }]
 *   toWorld     (u, v, z) feet -> THREE.Vector3 (three.js metres)
 *   sightClear  (a, b) -> true when the straight segment between two world points hits no wall / door / glass
 *   floorY      (world point) -> floor height (m) under that point, or null          [optional, default 0]
 *   onChange    (spot) called whenever the current pano changes                      [optional]
 *   onLost      (id) called when a pano that probed fine then fails to load (dropped) [optional]
 *   maxSize     cap for the texture width in px (default: GPU limit, 4096 on phones) [optional]
 *
 * controller
 *   ready            Promise<string[]>   resolves with the ids whose image file exists (probed once at startup)
 *   spots            all panos: { id, label, room, u, v, eye, floor, available }
 *   available        ids that can be shown right now (getter)
 *   active           true between enter() and exit()
 *   current          the spot being shown, or null
 *   yaw, pitch, fov  look state (radians, radians, degrees); yaw/pitch use walk mode's convention (yaw 0 = north)
 *   enter(id, look)  Promise<bool>  show pano `id` without a fade; look = { yaw, pitch } carried over from walk mode
 *   exit()           stop drawing / listening; returns { id, feet, yaw, pitch } for putting the walker there
 *   goto(id)         Promise<bool>  cross-fade to another pano, heading preserved
 *   step(sign)       go to the hotspot nearest the view centre (+1) or directly behind (-1)
 *   nearest(u, v)    id of the closest available pano to a plan point (in sight of it if possible), or null
 *   links(id)        ids reachable from `id` (within REACH_FT and line of sight clear), nearest first
 *   update(dt)       per-frame: keys, fade, hotspot labels
 *   render()         draw the panorama (plain renderer.render of a private scene: no tone mapping, no post)
 *   resize()         call after the window size changes
 *   drawMap(g, mx, my)  draw the pano dots on the minimap (mx(u), my(v) give canvas pixels)
 */
export function createPano({ renderer, canvas, plan, toWorld, sightClear, floorY, onChange, onLost, maxSize }) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const texLimit = Math.min(renderer.capabilities.maxTextureSize, maxSize || (coarse ? 4096 : 8192));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const spots = (plan.panos || []).map((p) => {
    const eye = toWorld(...p.eye);
    return { id: p.id, label: p.label, room: p.room, file: p.file, u: p.eye[0], v: p.eye[1], eye,
      floor: new THREE.Vector3(eye.x, 0, eye.z), available: false,
      yawOffset: p.yaw_offset_deg ?? PANO_YAW_OFFSET_DEG, flipX: p.flip_x ?? PANO_FLIP_X };
  });
  const byId = new Map(spots.map((s) => [s.id, s]));

  // ------------------------------------------------------------ scene -----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 200);
  camera.rotation.order = 'YXZ';
  const geo = equirectSphere(RADIUS, 128, 64);
  const makeBall = (order) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false,
      depthTest: false, depthWrite: false, transparent: true, fog: false }));
    m.renderOrder = order; m.visible = false; m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  let ball = makeBall(0), ballNext = makeBall(1);   // the incoming panorama fades in on top of the current one
  function dress(mesh, spot, tex) {
    // Base geometry: image centre -> north, right -> east.  Mirror first (scale), then turn to the offset bearing.
    mesh.scale.x = spot.flipX ? -1 : 1;
    mesh.rotation.y = -THREE.MathUtils.degToRad(spot.yawOffset);
    mesh.material.map = tex;
    mesh.material.needsUpdate = true;
    mesh.visible = true;
  }

  // ------------------------------------------------------------ files -----
  // Which images exist?  HEAD first (cheap); hosts that refuse HEAD get a real image load instead.
  async function probe(s) {
    try {
      const r = await fetch(s.file, { method: 'HEAD', cache: 'no-cache' });
      if (r.status === 405 || r.status === 501) return await loadImage(s.file).then(() => true, () => false);
      const type = r.headers.get('content-type') || 'image/';
      return r.ok && type.startsWith('image/');      // a 200 text/html answer is a host's "not found" page
    } catch { return false; }
  }
  const ready = Promise.all(spots.map(async (s) => { s.available = await probe(s); }))
    .then(() => spots.filter((s) => s.available).map((s) => s.id));

  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error(`cannot load ${url}`));
      img.src = url;
    });
  }
  const cache = new Map();      // id -> Promise<THREE.Texture>  (settled entries own a GPU texture)
  function texture(s) {
    if (!cache.has(s.id)) {
      cache.set(s.id, (async () => {
        let img = await loadImage(s.file);
        if (img.decode) await img.decode().catch(() => {});
        if (img.naturalWidth > texLimit || img.naturalHeight > texLimit) {
          // phones often stop at 4096: shrink 8K renders on a canvas instead of letting the upload fail
          const k = texLimit / Math.max(img.naturalWidth, img.naturalHeight);
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          const g = c.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(img, 0, 0, c.width, c.height);
          img = c;
        }
        const t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;          // display-referred JPEG; the material is not tone-mapped
        t.wrapS = THREE.RepeatWrapping;               // no seam where the left and right edges meet (south)
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.anisotropy = maxAniso;
        t.needsUpdate = true;
        renderer.initTexture(t);                      // upload now, so the step itself does not hitch
        return t;
      })());
      cache.get(s.id).catch(() => { cache.delete(s.id); s.available = false; rebuildHotspots(); onLost?.(s.id); });
    }
    return cache.get(s.id);
  }
  // Keep the current pano and its nearest neighbours on the GPU, drop the rest, then load what is missing.
  let preloadRun = 0;
  async function preload() {
    const run = ++preloadRun;
    if (!current) return;
    const keep = [current.id, ...links(current.id)].slice(0, MAX_GPU);
    for (const [id, p] of cache) {
      if (!keep.includes(id)) { cache.delete(id); p.then((t) => t.dispose(), () => {}); }
    }
    for (const id of keep) {
      if (run !== preloadRun || !active) return;
      await texture(byId.get(id)).catch(() => {});
    }
  }

  // ------------------------------------------------------------ links -----
  const linkCache = new Map();
  function reachable(a, b) {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (!linkCache.has(key)) {
      let ok = false;
      const d = Math.hypot(a.u - b.u, a.v - b.v);
      if (d <= REACH_FT) {
        // Clear on the straight line between the two eye points, or on a parallel line a step to either side
        // (pano points are not always lined up exactly with a door opening).
        const n = new THREE.Vector3(b.eye.z - a.eye.z, 0, a.eye.x - b.eye.x).normalize().multiplyScalar(SIDE_FT * FT);
        for (const k of [0, 1, -1]) {
          const pa = a.eye.clone().addScaledVector(n, k), pb = b.eye.clone().addScaledVector(n, k);
          if (k && !(sightClear(a.eye, pa) && sightClear(b.eye, pb))) continue;   // side-step must stay in the room
          if (sightClear(pa, pb)) { ok = true; break; }
        }
      }
      linkCache.set(key, ok);
    }
    return linkCache.get(key);
  }
  function links(id) {
    const a = byId.get(id);
    if (!a) return [];
    return spots.filter((b) => b !== a && b.available && reachable(a, b))
      .sort((p, q) => Math.hypot(p.u - a.u, p.v - a.v) - Math.hypot(q.u - a.u, q.v - a.v)).map((b) => b.id);
  }
  // Closest available pano to a plan point, preferring one that can be seen from there (eye height), so the
  // kitchen does not jump to the bedroom's photo through the wall when the hall's is only a little further away.
  function nearest(u, v) {
    const from = toWorld(u, v, plan.panos?.[0]?.eye[2] ?? 5.2);
    let best = null, bd = Infinity;
    for (const s of spots) {
      if (!s.available) continue;
      const d = Math.hypot(s.u - u, s.v - v) + (sightClear(from, s.eye) ? 0 : 1000);
      if (d < bd) { best = s; bd = d; }
    }
    return best ? best.id : null;
  }

  // ------------------------------------------------------------ hotspots --
  const ringTex = ringTexture();
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const labels = document.createElement('div');
  labels.id = 'hotspots';
  labels.hidden = true;
  document.body.appendChild(labels);
  let hotspots = [];            // { spot, mesh, el }
  let hover = null;
  function rebuildHotspots() {
    for (const h of hotspots) { scene.remove(h.mesh); h.mesh.material.dispose(); h.el.remove(); }
    hotspots = []; hover = null;
    if (!current) return;
    for (const id of links(current.id)) {
      const spot = byId.get(id);
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTex, transparent: true,
        depthTest: false, depthWrite: false, toneMapped: false, opacity: 0.9 }));
      // a ring lying on the photographed floor; a little larger when far away so it stays tappable
      const d = spot.floor.distanceTo(current.floor);
      mesh.scale.setScalar(0.62 * THREE.MathUtils.clamp(d / 3.2, 1, 1.9));
      mesh.position.copy(spot.floor);
      mesh.renderOrder = 2;
      scene.add(mesh);
      const el = document.createElement('button');
      el.className = 'hs';
      el.textContent = spot.label;
      el.onclick = () => goto(spot.id);
      labels.appendChild(el);
      hotspots.push({ spot, mesh, el });
    }
  }
  const w = new THREE.Vector3();
  function project(p) {
    w.copy(p).project(camera);
    return w.z < 1 && Math.abs(w.x) < 1.1 && Math.abs(w.y) < 1.1
      ? { x: (w.x * 0.5 + 0.5) * innerWidth, y: (-w.y * 0.5 + 0.5) * innerHeight } : null;
  }
  function hotspotAt(x, y) {
    let best = null, bd = Infinity;
    for (const h of hotspots) {
      const c = project(h.mesh.position);
      if (!c) continue;
      const edge = project(w.copy(h.mesh.position).addScaledVector(right(), h.mesh.scale.x / 2).clone());
      const r = Math.max(30, edge ? Math.hypot(edge.x - c.x, edge.y - c.y) : 0);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < r && d < bd) { best = h; bd = d; }
    }
    return best;
  }
  const right = () => new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  function placeLabels() {
    const placed = [];          // label boxes already shown; hotspots come nearest first, so the nearer label wins
    for (const h of hotspots) {
      const c = fade ? null : project(h.mesh.position);
      const wHalf = (h.el.offsetWidth || 100) / 2 + 4, top = c && c.y - 14 - 26;
      const clash = c && placed.some((b) => Math.abs(b.x - c.x) < b.w + wHalf && Math.abs(b.top - top) < 26);
      if (c && !clash) placed.push({ x: c.x, w: wHalf, top });
      h.el.style.display = c && !clash ? 'block' : 'none';     // the ring itself stays visible and tappable
      if (c) h.el.style.transform = `translate(-50%, -100%) translate(${c.x.toFixed(1)}px, ${(c.y - 14).toFixed(1)}px)`;
      h.mesh.visible = !fade;
      h.mesh.material.opacity = h === hover ? 1 : 0.85;
      h.mesh.material.color.set(h === hover ? 0xffd9a0 : 0xffffff);
      h.el.classList.toggle('on', h === hover);
    }
  }
  // sign +1: the hotspot nearest the view centre; -1: the one most directly behind
  function step(sign = 1) {
    let best = null, ba = 1.05;   // must be within 60° of that direction
    for (const h of hotspots) {
      const dx = h.spot.eye.x - current.eye.x, dz = h.spot.eye.z - current.eye.z;
      const a = Math.abs(wrap(Math.atan2(-dx * sign, -dz * sign) - state.yaw));
      if (a < ba) { best = h; ba = a; }
    }
    return best ? goto(best.spot.id) : Promise.resolve(false);
  }

  // ------------------------------------------------------------ state -----
  const state = { yaw: 0, pitch: 0, fov: 65 };
  let active = false, current = null, fade = null, busy = false;

  function applyCamera() {
    const aspect = innerWidth / innerHeight;
    // `fov` is the angle across the SHORTER side of the screen, so portrait phones still see the room
    const t = Math.tan(THREE.MathUtils.degToRad(state.fov) / 2);
    const v = aspect >= 1 ? state.fov : THREE.MathUtils.radToDeg(2 * Math.atan(t / aspect));
    camera.fov = Math.min(v, FOV_V_MAX);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.rotation.set(state.pitch, state.yaw, 0);
    if (current) camera.position.copy(current.eye);
    camera.updateMatrixWorld();
  }
  const zoom = (f) => { state.fov = THREE.MathUtils.clamp(state.fov * f, FOV_MIN, FOV_MAX); };
  const radPerPx = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / innerHeight;   // 1:1 drag at the centre

  function setCurrent(spot) {
    current = spot;
    const fy = floorY ? floorY(spot.eye) : null;
    spot.floor.y = fy ?? 0;
    for (const m of [ball, ballNext]) m.position.copy(spot.eye);
    rebuildHotspots();
    applyCamera();
    onChange?.(spot);
    preload();
  }

  async function enter(id, look) {
    const spot = byId.get(id);
    if (!spot?.available) return false;
    if (look) { state.yaw = look.yaw; state.pitch = THREE.MathUtils.clamp(look.pitch, -PITCH_MAX, PITCH_MAX); }
    active = true;
    labels.hidden = false;
    let tex;
    try { tex = await texture(spot); } catch { if (!current) { active = false; labels.hidden = true; } return false; }
    if (!active) return false;
    fade = null; ballNext.visible = false;
    dress(ball, spot, tex);
    ball.material.opacity = 1;
    setCurrent(spot);
    return true;
  }
  function exit() {
    active = false; fade = null; hover = null;
    labels.hidden = true;
    ptrs.clear(); keys.clear();
    canvas.style.cursor = '';
    return current ? { id: current.id, feet: current.floor.clone(), yaw: state.yaw, pitch: state.pitch } : null;
  }
  async function goto(id) {
    const spot = byId.get(id);
    if (!active || busy || fade || !spot?.available || spot === current) return false;
    busy = true;
    const el = hotspots.find((h) => h.spot === spot)?.el;
    el?.classList.add('busy');
    let tex = null;
    try { tex = await texture(spot); } catch { /* file vanished: texture() already marked it unavailable */ }
    busy = false;
    el?.classList.remove('busy');
    if (!tex || !active) return false;
    dress(ballNext, spot, tex);
    ballNext.material.opacity = 0;
    fade = { t0: performance.now() };
    setCurrent(spot);
    return true;
  }

  // ------------------------------------------------------------ input -----
  const ptrs = new Map();       // pointerId -> { x, y }
  const keys = new Set();
  let tap = null, pinch = null;
  const spread = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    tap = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    pinch = ptrs.size === 2 ? { d: spread(), fov: state.fov } : null;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!active) return;
    const p = ptrs.get(e.pointerId);
    if (!p) {                                         // mouse hover
      hover = hotspotAt(e.clientX, e.clientY);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
      return;
    }
    if (ptrs.size === 1) {
      const k = radPerPx();                           // the point under the finger stays under the finger
      state.yaw = wrap(state.yaw + (e.clientX - p.x) * k);
      state.pitch = THREE.MathUtils.clamp(state.pitch + (e.clientY - p.y) * k, -PITCH_MAX, PITCH_MAX);
    }
    p.x = e.clientX; p.y = e.clientY;
    if (pinch && ptrs.size === 2) { state.fov = pinch.fov; zoom(pinch.d / Math.max(spread(), 1)); }
  });
  const up = (e) => {
    if (!ptrs.delete(e.pointerId)) return;
    pinch = null;
    if (active && tap && e.type === 'pointerup' && performance.now() - tap.t < 600
      && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8) {
      const h = hotspotAt(e.clientX, e.clientY);
      if (h) goto(h.spot.id);
    }
    tap = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    if (!active) return;
    e.preventDefault();
    zoom(Math.exp(THREE.MathUtils.clamp(e.deltaY, -200, 200) * 0.0012));
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (!active || e.target.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') step(1);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') step(-1);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); ptrs.clear(); });

  // ------------------------------------------------------------ frame -----
  function update(dt) {
    if (!active) return;
    const turn = 1.6 * dt * (state.fov / 65);
    if (keys.has('ArrowLeft')) state.yaw = wrap(state.yaw + turn);
    if (keys.has('ArrowRight')) state.yaw = wrap(state.yaw - turn);
    if (keys.has('Equal') || keys.has('NumpadAdd')) zoom(Math.exp(-1.2 * dt));
    if (keys.has('Minus') || keys.has('NumpadSubtract')) zoom(Math.exp(1.2 * dt));
    if (fade) {
      const k = Math.min(1, (performance.now() - fade.t0) / FADE_MS);
      ballNext.material.opacity = k * k * (3 - 2 * k);
      if (k >= 1) {
        fade = null;
        [ball, ballNext] = [ballNext, ball];
        ball.renderOrder = 0; ballNext.renderOrder = 1;
        ballNext.visible = false; ballNext.material.map = null;
      }
    }
    applyCamera();
    placeLabels();
  }
  function render() {
    if (!active) return;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  function drawMap(g, mx, my) {
    for (const s of spots) {
      const cur = active && s === current;
      g.beginPath();
      g.arc(mx(s.u), my(s.v), s.available ? 6 : 4, 0, Math.PI * 2);
      if (s.available) {
        g.fillStyle = cur ? '#e0a458' : '#2f7fd6'; g.fill();
        g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke();
      } else {
        g.lineWidth = 1.5; g.strokeStyle = 'rgba(40,48,54,0.55)'; g.stroke();
      }
    }
  }

  return {
    ready, spots, scene, camera,
    get available() { return spots.filter((s) => s.available).map((s) => s.id); },
    get active() { return active; },
    get current() { return current; },
    get yaw() { return state.yaw; }, set yaw(v) { state.yaw = wrap(v); },
    get pitch() { return state.pitch; }, set pitch(v) { state.pitch = THREE.MathUtils.clamp(v, -PITCH_MAX, PITCH_MAX); },
    get fov() { return state.fov; }, set fov(v) { state.fov = THREE.MathUtils.clamp(v, FOV_MIN, FOV_MAX); },
    get transitioning() { return busy || !!fade; },
    get loaded() { return [...cache.keys()]; },
    enter, exit, goto, step, nearest, links, update, render, resize: applyCamera, drawMap,
    hotspots: () => hotspots.map((h) => ({ id: h.spot.id, screen: project(h.mesh.position) })),
  };
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Inside-out sphere with explicit equirect UVs.  With no offset and no flip: u = 0.5 -> north (-z),
// u = 0.75 -> east (+x), u = 0 and 1 -> south (+z); v = 1 (top row of the image) -> straight up.
function equirectSphere(radius, wSeg, hSeg) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= hSeg; j++) {
    const lat = (j / hSeg - 0.5) * Math.PI;
    for (let i = 0; i <= wSeg; i++) {
      const az = (i / wSeg - 0.5) * 2 * Math.PI;     // bearing clockwise from north
      pos.push(radius * Math.sin(az) * Math.cos(lat), radius * Math.sin(lat), -radius * Math.cos(az) * Math.cos(lat));
      uv.push(i / wSeg, j / hSeg);
    }
  }
  for (let j = 0; j < hSeg; j++) for (let i = 0; i < wSeg; i++) {
    const a = j * (wSeg + 1) + i, b = a + 1, c = a + wSeg + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const ring = (r, width, style) => { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.lineWidth = width; g.strokeStyle = style; g.stroke(); };
  ring(96, 34, 'rgba(0,0,0,0.28)');                  // soft dark edge so it reads on light floors
  ring(96, 22, 'rgba(255,255,255,0.96)');
  g.beginPath(); g.arc(128, 128, 82, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
  g.beginPath(); g.arc(128, 128, 20, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
