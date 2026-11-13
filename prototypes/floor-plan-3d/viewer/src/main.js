// First Floor v5 — walkable Three.js viewer.
// Plan coords (feet): u = south of the north outer face, v = west of the east outer face.
// three.js: x = -v*FT, z = u*FT, y = up (metres).  North = -z, East = +x.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const FT = 0.3048;
const EYE = 1.6;          // eye height (m)
const RADIUS = 0.22;      // body radius (m)
const STEP = 0.45;        // max step-up (m)
const LM_RANGE = 3.0;     // lightmaps store sRGB(irradiance / LM_RANGE)  (see build_blender.py)
const STORE_KEY = 'firstfloor3d-v1';
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = (id) => document.getElementById(id);

const toWorld = (u, v, z = 0) => new THREE.Vector3(-v * FT, z * FT, u * FT);
const toPlan = (p) => ({ u: p.z / FT, v: -p.x / FT });

async function main() {
  const plan = await (await fetch('plan.json')).json();

  // ------------------------------------------------------------- renderer ---
  const canvas = $('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfd6db, 60, 160);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(coarse ? 70 : 65, innerWidth / innerHeight, 0.05, 400);
  camera.rotation.order = 'YXZ';

  // ------------------------------------------------------------- lights ----
  const hemi = new THREE.HemisphereLight(0xfff1e0, 0x9a8a78, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  // afternoon sun from the west-south-west (road side), same as the Blender stills
  const c0 = toWorld(21.75, 21.75, 0);
  sun.position.set(c0.x - 22, 24, c0.z + 8);
  sun.target.position.copy(c0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // one soft ceiling light per room (range kept inside the room so light does not leak through walls)
  const roomLights = [];
  for (const r of plan.rooms) {
    if (r.kind === 'stair') continue;
    const [u0, u1, v0, v1] = r.rect;
    const pts = [];
    const lu = u1 - u0, lv = v1 - v0;
    if (r.id === 'main_hall') pts.push([11, 17], [19, 17], [28, 17]);
    else if (r.id.startsWith('store') && r.id.length === 6) pts.push([(u0 + u1) / 2, 26], [(u0 + u1) / 2, 33]);
    else if (r.id === 'west_path') pts.push([8, 40.6], [24, 40.6]);
    else pts.push([(u0 + u1) / 2, (v0 + v1) / 2]);
    const reach = Math.max(Math.min(lu, lv) * 0.5 + 2.5, 5.5) * FT * (pts.length > 1 ? 1.25 : 1.15);
    for (const [u, v] of pts) {
      const L = new THREE.PointLight(0xffe2c0, r.kind === 'open' ? 0 : 5.5, reach, 1.2);
      L.position.copy(toWorld(u, v, plan.heights.ceiling - 0.8));
      scene.add(L);
      roomLights.push(L);
    }
  }

  // ------------------------------------------------------------- model -----
  const colliders = [], floors = [], hideInOverview = [], meshes = [];
  const loader = new GLTFLoader();
  // Hosts that will not serve .glb get the same bytes as base64 text (<meta name="model" content="model.glb.b64.txt">).
  const modelUrl = document.querySelector('meta[name="model"]')?.content || 'model.glb';
  let gltf;
  if (modelUrl.endsWith('.b64.txt')) {
    $('prog').firstChild.style.width = '30%';
    const b64 = (await (await fetch(modelUrl)).text()).trim();
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    $('prog').firstChild.style.width = '80%';
    gltf = await loader.parseAsync(bin.buffer, '');
  } else {
    gltf = await loader.loadAsync(modelUrl, (e) => {
      if (e.total) $('prog').firstChild.style.width = `${(100 * e.loaded) / e.total}%`;
    });
  }
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  // baked global illumination: one atlas per group, sampled through the 2nd UV set
  const lmTex = {};
  await Promise.all(['WALL', 'FLOOR', 'CEIL'].map(async (g) => {
    try {
      const t = await new THREE.TextureLoader().loadAsync(`lm_${g}.jpg`);
      t.flipY = false; t.channel = 1; t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
      lmTex[g] = t;
    } catch { /* no bake available: fall back to realtime lighting */ }
  }));
  const baked = Object.keys(lmTex).length > 0;
  const items = new Map();       // id -> { id, node, label, layer, home: {pos, rotY}, meshes: [] }
  const shellMats = new Set();   // materials faded by the X-ray toggle
  const itemOf = (o) => { for (let p = o; p; p = p.parent) if (p.name?.startsWith('ITEM__')) return p; return null; };
  gltf.scene.traverse((o) => {
    if (o.name?.startsWith('ITEM__') && !o.isMesh) {
      const id = o.name.slice(6);
      items.set(id, { id, node: o, label: o.userData.label || id, layer: o.userData.layer || 'furniture',
        home: { pos: o.position.clone(), rotY: o.rotation.y }, meshes: [] });
    }
  });
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const cat = (o.name || '').split('__')[0];
    const mname = o.material?.name || '';
    const it = itemOf(o);
    if (it) items.get(it.name.slice(6))?.meshes.push(o);
    meshes.push(o);
    o.castShadow = !['FLOOR', 'SITE', 'LIGHT', 'DECO', 'GLASS', 'MEP', 'ELEC', 'FCEIL'].includes(cat);
    o.receiveShadow = cat !== 'LIGHT' && cat !== 'GLASS';
    let m = o.material;
    for (const k of ['map', 'normalMap']) if (m[k]) m[k].anisotropy = maxAniso;
    if (o.userData.lm && lmTex[o.userData.lm]) {
      // shell surfaces: albedo x baked light (unlit), so the soft bounce light and downlight scallops come from Cycles
      m = o.material = new THREE.MeshBasicMaterial({ name: mname, map: m.map, color: m.color,
        lightMap: lmTex[o.userData.lm], lightMapIntensity: LM_RANGE * Math.PI });
    }
    if (mname.startsWith('glass')) {
      m = o.material = new THREE.MeshStandardMaterial({
        color: mname === 'glass' ? 0xcfe3ea : 0xe8eef0, roughness: mname === 'glass' ? 0.05 : 0.4, metalness: 0,
        transparent: true, opacity: mname === 'glass' ? 0.16 : 0.65, depthWrite: false, envMapIntensity: 1.2,
      });
      o.castShadow = false;
    }
    if (mname === 'mirror') { m.metalness = 1; m.roughness = 0.02; m.envMapIntensity = 1.5; }
    if (cat === 'LIGHT') { m.emissiveIntensity = mname === 'cove' ? 2.2 : 2.6; }
    if (['WALL', 'FURN', 'DOOR', 'GLASS'].includes(cat)) colliders.push(o);
    if (['FLOOR', 'SITE'].includes(cat)) floors.push(o);
    if (['CEIL', 'UPPER'].includes(cat) && !it) hideInOverview.push(o);
    if (['WALL', 'CEIL', 'FCEIL', 'DOOR'].includes(cat) || (cat === 'FLOOR' && !it)) shellMats.add(m);
    o.userData.cat = cat;
  });
  // soft contact shadow under each piece of furniture (it moves with the piece)
  const blob = blobTexture();
  for (const it of items.values()) {
    if (it.layer !== 'furniture') continue;
    const box = new THREE.Box3().setFromObject(it.node);
    const sz = box.getSize(new THREE.Vector3());
    if (box.min.y > 0.25 || box.min.y < -0.2 || sz.y < 0.12) continue;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(sz.x + 0.3, sz.z + 0.3),
      new THREE.MeshBasicMaterial({ map: blob, transparent: true, opacity: 0.55, depthWrite: false, color: 0x000000,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    q.rotation.x = -Math.PI / 2;
    q.position.y = 0.012 - (box.min.y - 0.01);
    q.position.y = 0.012;
    q.renderOrder = 1;
    q.userData.cat = 'SHADOW';
    it.node.add(q);
  }
  scene.add(gltf.scene);
  for (const o of [...colliders, ...floors]) o.geometry.computeBoundsTree();
  $('loading').style.display = 'none';

  // ------------------------------------------------------------- post ------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.1, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let hq = params.has('hq') ? params.get('hq') !== '0' : !coarse;
  const setHQ = (on) => {
    hq = on;
    $('bHQ').setAttribute('aria-pressed', String(on));
    renderer.shadowMap.enabled = on;
    sun.castShadow = on;
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  };
  setHQ(hq);

  // ------------------------------------------------------------- state -----
  const feet = new THREE.Vector3();
  let yaw = 0, pitch = 0, mode = 'walk', vy = 0;
  const orbit = new OrbitControls(camera, canvas);
  orbit.enabled = false;
  orbit.enableDamping = true;
  orbit.maxPolarAngle = Math.PI * 0.47;
  orbit.minDistance = 4;
  orbit.maxDistance = 45;

  function lookFrom(eye, look) {
    const d = new THREE.Vector3().subVectors(look, eye);
    yaw = Math.atan2(-d.x, -d.z);
    pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.5;
  }
  function gotoView(name) {
    const vw = plan.views[name];
    if (!vw) return;
    if (vw.hide || name === 'aerial') { setMode('overview', vw); return; }
    const eye = toWorld(...vw.eye), look = toWorld(...vw.look);
    feet.set(eye.x, eye.y - EYE, eye.z);
    snapToFloor(true);
    lookFrom(eye, look);
    setMode('walk');
  }
  function gotoRoom(id) {
    const r = plan.rooms.find((x) => x.id === id);
    if (!r) return;
    const [u0, u1, v0, v1] = r.rect;
    feet.copy(toWorld((u0 + u1) / 2, (v0 + v1) / 2, 0));
    snapToFloor(true);
    // face along the room's long side
    yaw = (u1 - u0) > (v1 - v0) ? 0 : -Math.PI / 2;
    pitch = -0.05;
    setMode('walk');
  }

  function setMode(m, vw) {
    mode = m;
    $('bWalk').setAttribute('aria-pressed', String(m === 'walk'));
    $('bOver').setAttribute('aria-pressed', String(m === 'overview'));
    for (const o of hideInOverview) o.visible = m === 'walk';
    for (const it of items.values()) if (it.layer === 'false_ceiling') it.node.visible = m === 'walk' && layerOn.false_ceiling && !(edits[it.id] || {}).hidden;
    refreshColliders();
    orbit.enabled = m === 'overview';
    $('cross').style.display = m === 'walk' ? 'block' : 'none';
    $('labels').style.display = m === 'overview' ? 'block' : 'none';
    if (m === 'overview') {
      if (document.pointerLockElement) document.exitPointerLock();
      orbit.target.copy(toWorld(21.75, 21.75, 0));
      const eye = vw ? toWorld(...vw.eye) : (innerWidth < innerHeight ? toWorld(68, 62, 70) : toWorld(52, 50, 40));
      camera.position.copy(eye);
      camera.lookAt(orbit.target);
      orbit.update();
    }
    setHelp();
  }

  // ------------------------------------------------------------- physics ---
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  const down = new THREE.Vector3(0, -1, 0);
  function floorAt(p, from = 0.7) {
    ray.set(new THREE.Vector3(p.x, p.y + from, p.z), down);
    ray.far = 30;
    const h = ray.intersectObjects(floors, false)[0];
    return h ? h.point.y : null;
  }
  function snapToFloor(force) {
    const y = floorAt(feet, force ? 3.5 : STEP + 0.05);
    if (y !== null) feet.y = y;
  }
  let activeColliders = colliders;
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  function refreshColliders() { activeColliders = colliders.filter(shown); }
  function blocked(from, dir, dist) {
    for (const h of [0.35, 1.0, 1.5]) {
      ray.set(new THREE.Vector3(from.x, from.y + h, from.z), dir);
      ray.far = dist + RADIUS;
      if (ray.intersectObjects(activeColliders, false).length) return true;
    }
    return false;
  }
  function tryMove(delta) {
    const dist = delta.length();
    if (dist < 1e-5) return;
    const dir = delta.clone().normalize();
    if (!blocked(feet, dir, dist)) { feet.add(delta); return; }
    for (const axis of [new THREE.Vector3(Math.sign(delta.x), 0, 0), new THREE.Vector3(0, 0, Math.sign(delta.z))]) {
      const comp = Math.abs(axis.x ? delta.x : delta.z);
      if (comp > 1e-5 && !blocked(feet, axis, comp)) { feet.addScaledVector(axis, comp); return; }
    }
  }

  // ------------------------------------------------------------- input -----
  const keys = new Set();
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT') return;
    keys.add(e.code);
    if (e.code === 'KeyO') setMode(mode === 'walk' ? 'overview' : 'walk');
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  let drag = null;          // mouse/touch look
  let joy = null;           // touch joystick {id, x0, y0, dx, dy}
  const joyEl = $('joy');
  canvas.addEventListener('click', () => {
    if (mode === 'walk' && !editMode && !coarse && !document.pointerLockElement && canvas.requestPointerLock) {
      try { canvas.requestPointerLock(); } catch { /* not allowed */ }
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (mode === 'walk' && document.pointerLockElement === canvas) {
      yaw -= e.movementX * 0.0023;
      pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0023, -1.35, 1.35);
    }
  });
  let tap = null;
  canvas.addEventListener('pointerdown', (e) => {
    tap = { x: e.clientX, y: e.clientY };
    if (mode !== 'walk' || document.pointerLockElement || tc.dragging || tc.axis) return;
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && !joy) {
      joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
      Object.assign(joyEl.style, { display: 'block', left: `${e.clientX}px`, top: `${e.clientY}px` });
    } else if (!drag) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (joy && e.pointerId === joy.id) {
      const dx = e.clientX - joy.x0, dy = e.clientY - joy.y0;
      const l = Math.min(1, Math.hypot(dx, dy) / 50);
      const a = Math.atan2(dy, dx);
      joy.dx = Math.cos(a) * l; joy.dy = Math.sin(a) * l;
      joyEl.firstChild.style.transform = `translate(${joy.dx * 32}px, ${joy.dy * 32}px)`;
    } else if (drag && e.pointerId === drag.id) {
      const s = e.pointerType === 'touch' ? 0.005 : 0.004;
      yaw += (e.clientX - drag.x) * s;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * s, -1.35, 1.35);
      drag.x = e.clientX; drag.y = e.clientY;
    }
  });
  const endPtr = (e) => {
    if (editMode && tap && e.type === 'pointerup' && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 6 && !tc.dragging) pick(e);
    tap = null;
    if (joy && e.pointerId === joy.id) { joy = null; joyEl.style.display = 'none'; joyEl.firstChild.style.transform = ''; }
    if (drag && e.pointerId === drag.id) drag = null;
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);

  // double-click / double-tap on a floor in overview -> walk there
  canvas.addEventListener('dblclick', (e) => {
    if (mode !== 'overview') return;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = 500;
    const h = ray.intersectObjects(floors, false)[0];
    if (h) { feet.copy(h.point); setMode('walk'); }
  });

  // ------------------------------------------------------------- layers + editing ---
  const LAYERS = [['furniture', 'Furniture'], ['false_ceiling', 'False ceiling'], ['water', 'Water lines'],
    ['electrical', 'Electric lines'], ['xray', 'X-ray walls']];
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } })();
  const layerOn = Object.assign({ furniture: true, false_ceiling: true, water: false, electrical: false, xray: false }, saved.layers);
  const edits = saved.edits || {};      // id -> { dx, dz, r, hidden }
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ layers: layerOn, edits })); } catch { /* private mode */ } };
  let editMode = false, selected = null;
  const tc = new TransformControls(camera, canvas);
  tc.setMode('translate'); tc.showY = false; tc.setSize(0.9);
  scene.add(tc.getHelper());
  const selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xe0a458);
  selBox.visible = false;
  scene.add(selBox);
  tc.addEventListener('dragging-changed', (e) => {
    orbit.enabled = mode === 'overview' && !e.value;
    if (!e.value && selected) { recordEdit(selected); refreshColliders(); }
  });

  function applyState() {
    for (const it of items.values()) {
      const e = edits[it.id] || {};
      it.node.position.set(it.home.pos.x + (e.dx || 0), it.home.pos.y, it.home.pos.z + (e.dz || 0));
      it.node.rotation.y = it.home.rotY + (e.r || 0);
      it.node.visible = !!layerOn[it.layer] && !e.hidden;
    }
    for (const m of shellMats) {
      m.transparent = layerOn.xray; m.opacity = layerOn.xray ? 0.22 : 1; m.depthWrite = !layerOn.xray; m.needsUpdate = true;
    }
    for (const [k] of LAYERS) { const c = $('ly_' + k); if (c) c.checked = !!layerOn[k]; }
    $('nRemoved').textContent = Object.values(edits).filter((e) => e.hidden).length;
    refreshColliders();
  }
  function recordEdit(it) {
    const e = edits[it.id] || (edits[it.id] = {});
    e.dx = it.node.position.x - it.home.pos.x; e.dz = it.node.position.z - it.home.pos.z; e.r = it.node.rotation.y - it.home.rotY;
    persist();
  }
  function select(it) {
    selected = it;
    if (it) { tc.attach(it.node); selBox.setFromObject(it.node); selBox.visible = true; $('selName').textContent = it.label; }
    else { tc.detach(); selBox.visible = false; $('selName').textContent = 'Tap an object to select it'; }
    for (const b of ['bRot', 'bDel', 'bHome']) $(b).disabled = !it;
  }
  function pick(e) {
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = 200;
    const pool = [];
    for (const it of items.values()) if (it.node.visible) pool.push(...it.meshes);
    const blockers = layerOn.xray ? [] : meshes.filter((m) => !itemOf(m) && shown(m) && ['WALL', 'CEIL', 'DOOR'].includes(m.userData.cat));
    const h = ray.intersectObjects([...pool, ...blockers], false)[0];
    const node = h && itemOf(h.object);
    select(node ? items.get(node.name.slice(6)) : null);
  }
  function setEdit(on) {
    editMode = on;
    $('bEdit').setAttribute('aria-pressed', String(on));
    $('editp').hidden = !on;
    if (on && document.pointerLockElement) document.exitPointerLock();
    if (!on) select(null);
    setHelp();
  }
  $('bEdit').onclick = () => setEdit(!editMode);
  $('bLayers').onclick = () => { $('layers').hidden = !$('layers').hidden; $('bLayers').setAttribute('aria-pressed', String(!$('layers').hidden)); };
  $('layerList').innerHTML = LAYERS.map(([k, l]) => `<label><input type="checkbox" id="ly_${k}"> ${l}</label>`).join('');
  for (const [k] of LAYERS) {
    $('ly_' + k).onchange = (ev) => {
      layerOn[k] = ev.target.checked;
      if ((k === 'water' || k === 'electrical') && ev.target.checked) layerOn.xray = true;   // concealed services: see through the walls
      if (selected && !layerOn[selected.layer]) select(null);
      applyState(); persist();
    };
  }
  $('bRot').onclick = () => { if (selected) { selected.node.rotation.y += Math.PI / 2; recordEdit(selected); refreshColliders(); } };
  $('bDel').onclick = () => { if (selected) { (edits[selected.id] || (edits[selected.id] = {})).hidden = true; select(null); applyState(); persist(); } };
  $('bHome').onclick = () => { if (selected) { delete edits[selected.id]; applyState(); persist(); selBox.setFromObject(selected.node); } };
  $('bRestore').onclick = () => { for (const k of Object.keys(edits)) delete edits[k]; select(null); applyState(); persist(); };
  $('bCopy').onclick = async () => {
    const txt = JSON.stringify({ layers: layerOn, edits }, null, 1);
    try { await navigator.clipboard.writeText(txt); $('bCopy').textContent = 'Copied'; } catch { $('bCopy').textContent = 'Copy failed'; }
    setTimeout(() => { $('bCopy').textContent = 'Copy layout'; }, 1500);
  };

  // ------------------------------------------------------------- UI --------
  $('bWalk').onclick = () => setMode('walk');
  $('bOver').onclick = () => setMode('overview');
  $('bHQ').onclick = () => setHQ(!hq);
  const sel = $('goto');
  sel.innerHTML = '<option value="">Go to…</option>' +
    Object.entries(plan.views).map(([k, v]) => `<option value="v:${k}">${v.label}</option>`).join('') +
    '<optgroup label="Rooms">' + plan.rooms.filter((r) => r.kind !== 'stair')
      .map((r) => `<option value="r:${r.id}">${r.label}${r.size ? ` (${r.size})` : ''}</option>`).join('') + '</optgroup>';
  sel.onchange = () => {
    const [t, id] = sel.value.split(':');
    if (t === 'v') gotoView(id); else if (t === 'r') gotoRoom(id);
    sel.value = '';
    sel.blur();
  };
  function setHelp() {
    $('help').textContent = editMode
      ? 'Edit: tap an object to select it · drag the arrows to move · Rotate / Remove in the panel · changes are saved on this device'
      : mode === 'walk'
      ? (coarse ? 'Left thumb: move · right side: look · tap the map to jump'
        : 'Click to look with the mouse · WASD / arrows to walk · Shift to run · Esc to free the mouse · O = overview')
      : 'Drag to orbit · scroll / pinch to zoom · double-click a floor or a label to walk there';
  }

  // room labels (overview)
  const labelEls = plan.rooms.filter((r) => !['open_space', 'walk_path', 'up_stair', 'down_stair', 'kitchen_out'].includes(r.id)).map((r) => {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.innerHTML = `${r.label}${r.size ? `<small>${r.size}</small>` : ''}`;
    el.onclick = () => gotoRoom(r.id);
    $('labels').appendChild(el);
    const [u0, u1, v0, v1] = r.rect;
    return { el, p: toWorld((u0 + u1) / 2, (v0 + v1) / 2, 1.0) };
  });

  // ------------------------------------------------------------- minimap ---
  const map = $('map'), mctx = map.getContext('2d');
  const MS = map.width, PAD = 26, SC = (MS - 2 * PAD) / 43.5;   // east up, north left (like the PDF)
  const mx = (u) => PAD + u * SC, my = (v) => PAD + v * SC;
  const base = document.createElement('canvas');
  base.width = base.height = MS;
  drawBase(base.getContext('2d'));
  function drawBase(g) {
    const col = { room: '#e9e4da', open: '#cfd3cf', stair: '#b9bfc3' };
    const tint = { master_bedroom: '#f3d9c4', kitchen: '#d8ead9', main_hall: '#e2dcef', master_bath: '#d5e5ec',
      storeroom_bath: '#d5e5ec', common_bath: '#d5e5ec', store_room: '#e8e8e2' };
    g.fillStyle = 'rgba(0,0,0,0)';
    g.clearRect(0, 0, MS, MS);
    for (const r of plan.rooms) {
      const [u0, u1, v0, v1] = r.rect;
      g.fillStyle = tint[r.id] || col[r.kind];
      g.fillRect(mx(u0), my(v0), (u1 - u0) * SC, (v1 - v0) * SC);
    }
    for (const w of plan.walls) {
      const [u0, u1, v0, v1] = w.rect;
      g.fillStyle = w.kind === 'parapet' ? '#8d959b' : '#2c3237';
      g.fillRect(mx(u0), my(v0), (u1 - u0) * SC, (v1 - v0) * SC);
      const alongU = (u1 - u0) >= (v1 - v0);
      for (const o of w.openings) {
        g.fillStyle = o[0] === 'door' ? '#e9e4da' : o[0] === 'shutter' ? '#e0a458' : '#8fd0ff';
        if (alongU) g.fillRect(mx(o[1]), my(v0), (o[2] - o[1]) * SC, (v1 - v0) * SC);
        else g.fillRect(mx(u0), my(o[1]), (u1 - u0) * SC, (o[2] - o[1]) * SC);
      }
    }
    g.fillStyle = '#eef1f3';
    g.font = '600 20px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('E', MS / 2, 12); g.fillText('W', MS / 2, MS - 11);
    g.fillText('N', 11, MS / 2); g.fillText('S', MS - 11, MS / 2);
  }
  function drawMap() {
    mctx.clearRect(0, 0, MS, MS);
    mctx.drawImage(base, 0, 0);
    const pp = toPlan(mode === 'walk' ? feet : camera.position);
    const x = mx(pp.u), y = my(pp.v);
    // forward in plan: three forward (-sin yaw, -cos yaw) in x,z -> (du = fz, dv = -fx)
    const fx = -Math.sin(mode === 'walk' ? yaw : orbitYaw()), fz = -Math.cos(mode === 'walk' ? yaw : orbitYaw());
    const a = Math.atan2(-fx, fz);
    mctx.save();
    mctx.translate(x, y);
    mctx.rotate(a);
    mctx.fillStyle = 'rgba(224,164,88,0.35)';
    mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, 46, -0.55, 0.55); mctx.closePath(); mctx.fill();
    mctx.fillStyle = '#e0a458'; mctx.strokeStyle = '#1a1208'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(0, 0, 8, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
    mctx.restore();
  }
  const orbitYaw = () => Math.atan2(camera.position.x - orbit.target.x, camera.position.z - orbit.target.z) + Math.PI;
  map.addEventListener('pointerdown', (e) => {
    const r = map.getBoundingClientRect();
    const u = ((e.clientX - r.left) / r.width * MS - PAD) / SC;
    const v = ((e.clientY - r.top) / r.height * MS - PAD) / SC;
    if (u < 0 || v < 0 || u > 43.5 || v > 43.5) return;
    feet.copy(toWorld(u, v, 2));
    snapToFloor(true);
    setMode('walk');
  });

  // ------------------------------------------------------------- HUD -------
  function roomAt(u, v) {
    let best = null;
    for (const r of plan.rooms) {
      const [u0, u1, v0, v1] = r.rect;
      if (u >= u0 && u <= u1 && v >= v0 && v <= v1) {
        const a = (u1 - u0) * (v1 - v0);
        if (!best || a < best.a) best = { r, a };
      }
    }
    return best?.r;
  }
  let lastRoom = '';
  function updateHud() {
    if (mode === 'overview') {
      if (lastRoom !== '#') { $('room').textContent = 'Overview'; $('size').textContent = 'Inside sizes in feet'; lastRoom = '#'; }
      return;
    }
    const p = toPlan(feet);
    const r = roomAt(p.u, p.v);
    const id = r ? r.id : (feet.y < -1 ? 'ground' : 'outside');
    if (id === lastRoom) return;
    lastRoom = id;
    $('room').textContent = r ? r.label : (id === 'ground' ? 'Ground level (road side)' : 'Outside');
    $('size').textContent = r?.size ? `${r.size} inside` : '';
  }

  // ------------------------------------------------------------- loop ------
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (mode === 'walk') {
      let f = 0, s = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD')) s += 1;
      if (keys.has('KeyA')) s -= 1;
      if (keys.has('ArrowLeft')) yaw += 1.8 * dt;
      if (keys.has('ArrowRight')) yaw -= 1.8 * dt;
      if (joy) { f -= joy.dy; s += joy.dx; }
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.2 : 1.5) * dt;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      tmp.set(-sin * f + cos * s, 0, -cos * f - sin * s);
      if (tmp.lengthSq() > 1) tmp.normalize();
      tryMove(tmp.multiplyScalar(speed));
      // gravity / stairs
      const fy = floorAt(feet, STEP + 0.05);
      if (fy !== null && fy >= feet.y - 0.05) { feet.y += (fy - feet.y) * Math.min(1, dt * 14); vy = 0; }
      else { vy -= 9.8 * dt; feet.y = Math.max(fy ?? -50, feet.y + vy * dt); if (fy !== null && feet.y <= fy) vy = 0; }
      camera.position.set(feet.x, feet.y + EYE, feet.z);
      camera.rotation.set(pitch, yaw, 0);
    } else {
      orbit.update();
      const w = new THREE.Vector3();
      for (const l of labelEls) {
        w.copy(l.p).project(camera);
        const vis = w.z < 1;
        l.el.style.display = vis ? 'block' : 'none';
        if (vis) l.el.style.transform = `translate(-50%,-50%) translate(${(w.x * 0.5 + 0.5) * innerWidth}px, ${(-w.y * 0.5 + 0.5) * innerHeight}px)`;
        l.el.style.left = '0'; l.el.style.top = '0';
      }
    }
    if (selected) selBox.update();
    if (hq) composer.render(); else renderer.render(scene, camera);
    drawMap();
    updateHud();
    window.__frames = (window.__frames || 0) + 1;
    // ?still=N renders N frames then stops (used by the screenshot script on software GL)
    if (!(params.has('still') && window.__frames >= Number(params.get('still') || 4))) requestAnimationFrame(tick);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth, innerHeight);
  });

  applyState();
  select(null);
  if (params.get('layers')) { for (const k of params.get('layers').split(',')) layerOn[k] = true; if (layerOn.water || layerOn.electrical) layerOn.xray = true; applyState(); }
  window.__viewer = { gotoView, gotoRoom, setMode, setHQ, setEdit, select, items, feet, plan };
  if (params.get('mode') === 'overview') setMode('overview');
  else gotoView(params.get('view') || plan.spawn);
  if (params.get('room')) gotoRoom(params.get('room'));
  setHelp();
  tick();
  window.__ready = true;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  // rounded-rectangle falloff: opaque in the middle, fading to the edges
  const img = g.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const dx = Math.max(0, Math.abs(x - 63.5) / 63.5 - 0.62) / 0.38, dy = Math.max(0, Math.abs(y - 63.5) / 63.5 - 0.62) / 0.38;
    const a = Math.max(0, 1 - Math.hypot(dx, dy));
    img.data.set([255, 255, 255, 255 * a * a], (y * 128 + x) * 4);
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5f8fc9'); gr.addColorStop(0.55, '#a9c3dc'); gr.addColorStop(0.75, '#e4ddd0'); gr.addColorStop(1, '#cfc3ae');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

main().catch((e) => {
  console.error(e);
  document.querySelector('#loading .box').textContent = `Could not load the model: ${e.message}`;
});
