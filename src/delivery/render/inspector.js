// ---- the MODEL INSPECTOR: one car's 3D model, full screen, to look round and judge (the owner, 13-Oct: "let me inspect
// an idea car model from the garage so I can see its quality ... In-game and rotate it around") ----------------------
// Opened from the garage (render/garage.js: the "Inspect" button beside the car's buttons, on the Car ideas tab and on
// Crazey Jim's lot alike) over everything, on a plain studio backdrop. A drag (one finger or the mouse) turns the camera
// round the car (an orbit, flung on a little as it lets go, never below the floor); a pinch or the wheel brings it
// nearer or further (within limits); a double tap or double click puts it back. Until the first touch it turns slowly
// by itself (not with prefers-reduced-motion). Buttons: Front, Rear, Left, Right, Top and 3/4 (the camera glides
// there), Good / Evil (the car's `color` / `evilColor` and its own livery: userData.livery), the previous / next car of
// the list it was opened on (the ideas lot: every idea; the car lot: its cars as parked), and Back (also Escape and the
// browser's / phone's back: nav.js). A line says what the car is and what its model is made of: shapes (meshes) and
// triangles, counted from the model, and the draw calls the picture took.
// DRAWING: no WebGL context of its own. It draws with the menu's one renderer (modelviews.js sharedRenderer, the
// showroom's live car's too) on its canvas that is never in the page, and copies the picture into a 2D canvas of its own
// (as showroomview.js does), at the screen's pixels at most twice over and never more than about 3 million. A frame is
// drawn only when something moved (a drag, a glide, the slow turn, a new size); the loop runs only while it is open, and
// the renderer's canvas is given back its size when it closes. While it is up the garage's lot is not drawn at all
// (Garage.render asks Inspector.isOpen) and <html> has `sheet-up` (lite.css: what is under it stops animating; set here,
// not in lite.js, which is in the replays' rules fingerprint: vite.config.js logicFiles).
//   ?garage&tab=ideas&inspect=<idea id>[&evil][&view=front|rear|left|right|top|34]   opens it on that idea (main.js)
//   ?garage&inspect=<car id>                                                          a car of Crazey Jim's lot
import * as THREE from 'three';
import '../inspector.css';
import { Nav } from '../nav.js';
import { sharedRenderer, stillViews, STILL } from './modelviews.js';
import { buildInspectModel, paintInspectModel, countModel, sizeWords } from './inspectmodel.js';

const FOV = 30, LIFT = 0.32, AUTO = 0.28; // (deg the camera sees up and down; rad it looks down from at rest; rad/s turning by itself)
const PITCH = [0, 1.5], ZOOM = [0.42, 2.4], MAX_PIXELS = 3e6;
const ORDER = ['front', 'rear', 'left', 'right', 'top', '34']; // (the buttons' order: an object's keys put '34' first)
// the views (yaw: rad the camera is round from the car's front, toward its left; pitch: rad above level). The cars face +z
export const VIEWS = {
  front: { name: 'Front', yaw: 0, pitch: 0.12 },
  rear: { name: 'Rear', yaw: Math.PI, pitch: 0.12 },
  left: { name: 'Left', yaw: Math.PI / 2, pitch: 0.06 },
  right: { name: 'Right', yaw: -Math.PI / 2, pitch: 0.06 },
  top: { name: 'Top', yaw: 0, pitch: PITCH[1] },
  34: { name: '3/4', yaw: 0.75, pitch: LIFT },
};
const REST = VIEWS[34];

// ---- the studio: lights, a floor that fades into the backdrop, the car's soft shadow under it -----------------
const canvasTexture = (draw, size = 256) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
let floorMap, shadowMap, softMap;
const maps = () => {
  floorMap ||= canvasTexture((g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)'); grad.addColorStop(0.55, 'rgba(255,255,255,0.28)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
  });
  // (a rounded box, blurred: the car's own footprint, darker under it. Drawn off the canvas and its shadow cast onto it,
  // which every browser blurs: ctx.filter is not everywhere)
  shadowMap ||= canvasTexture((g, s) => {
    const inset = s * 0.2, r = s * 0.12;
    g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = s * 0.07; g.shadowOffsetX = s * 4;
    g.beginPath(); g.roundRect(inset - s * 4, inset, s - inset * 2, s - inset * 2, r); g.fill();
  });
  softMap ||= canvasTexture((g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
  });
};
const flat = (map, opacity, order) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = order;
  return m;
};
const studio = () => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7280, 1.35));
  const key = new THREE.DirectionalLight(0xfff4e2, 2.1); // (the key: high, front left)
  key.position.set(6, 9, 7);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.75); // (the fill: low, the other side)
  fill.position.set(-8, 3, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0); // (the rim: from behind, for the outline)
  rim.position.set(-2, 6, -9);
  scene.add(key, fill, rim);
  maps();
  const floor = flat(floorMap, 1, -3), soft = flat(softMap, 0.35, -2), shadow = flat(shadowMap, 0.6, -1);
  floor.position.y = 0.001; soft.position.y = 0.002; shadow.position.y = 0.003;
  scene.add(floor, soft, shadow);
  return { scene, floor, soft, shadow };
};

// ---- the overlay -------------------------------------------------------------------------------------------
const el = (tag, cls, ...kids) => { const n = document.createElement(tag); if (cls) n.className = cls; n.append(...kids); return n; };
const button = (cls, text, title) => { const b = el('button', cls, text); b.type = 'button'; if (title) { b.title = title; b.setAttribute('aria-label', title); } return b; };
let root = null, ui = null;
const mountUi = () => {
  if (root) return;
  const stage = el('canvas', 'ins-stage');
  const back = button('ins-back', '‹ Back', 'Back (Escape)');
  const title = el('div', 'ins-title', el('b'), el('small'));
  const good = button('', 'Good'), evil = button('', 'Evil');
  good.dataset.side = 'good'; evil.dataset.side = 'evil';
  const side = el('span', 'ins-side', good, evil);
  side.setAttribute('role', 'group'); side.setAttribute('aria-label', 'Livery');
  const prev = button('ins-arrow ins-prev', '‹', 'Previous car'), next = button('ins-arrow ins-next', '›', 'Next car');
  const views = el('div', 'ins-views', ...ORDER.map((id) => { const v = VIEWS[id]; const b = button('', v.name, v.name + ' view'); b.dataset.view = id; return b; }));
  const stats = el('div', 'ins-stats'), hint = el('div', 'ins-hint', window.matchMedia?.('(pointer: coarse)').matches
    ? 'Drag to turn  ·  pinch to zoom  ·  double-tap to reset' : 'Drag to turn  ·  wheel to zoom  ·  double-click to reset');
  // (the model editor on this car, in a tab of its own: delivery/modeleditor.html; its address is made as it is opened)
  const edit = el('a', 'ins-edit', 'Edit model');
  edit.target = '_blank'; edit.rel = 'noopener'; edit.title = 'Edit this model, part by part (the model editor)'; edit.href = 'modeleditor.html';
  edit.addEventListener('click', () => { edit.href = 'modeleditor.html?car=' + encodeURIComponent(car?.id || '') + (evil ? '&evil' : ''); });
  const top = el('div', 'ins-top', back, title, edit, side), bottom = el('div', 'ins-bottom', views, stats, hint);
  root = el('div', 'overlay inspector hidden', stage, top, prev, next, bottom);
  root.id = 'inspector';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Model inspector');
  document.body.append(root);
  ui = { stage, ctx: stage.getContext('2d'), top, bottom, back, title, good, evil, prev, next, views, stats, hint };
  back.addEventListener('click', () => Inspector.close());
  good.addEventListener('click', () => Inspector.side(false));
  evil.addEventListener('click', () => Inspector.side(true));
  prev.addEventListener('click', () => Inspector.step(-1));
  next.addEventListener('click', () => Inspector.step(1));
  views.addEventListener('click', (e) => { const id = e.target.closest?.('button')?.dataset.view; if (id) Inspector.view(id); });
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('lostpointercapture', onUp);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKey, true);
};

// ---- the state ------------------------------------------------------------------------------------------------
let open = false, raf = 0, last = 0, dirty = true, touched = false;
let list = [], at = 0, car = null, evil = false, onClose = null, kind = '';
let v = null; // { studio, model, height, radius, counts, calls }
// the camera: where it is (cur) and where it is going (aim); vel: the fling after a drag (rad/s)
const cur = { yaw: REST.yaw, pitch: REST.pitch, zoom: 1 }, aim = { ...cur }, vel = { yaw: 0, pitch: 0 };
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 500);
const clampAim = () => {
  aim.pitch = Math.max(PITCH[0], Math.min(PITCH[1], aim.pitch));
  aim.zoom = Math.max(ZOOM[0], Math.min(ZOOM[1], aim.zoom));
};

// the model let go: what it put on the graphics card given back (shared geometries and materials are sent again when next drawn)
const drop = () => {
  if (!v) return;
  v.studio.scene.remove(v.model);
  v.model.traverse((node) => {
    node.geometry?.dispose();
    for (const m of [].concat(node.material || [])) { m.map?.dispose(); m.dispose(); }
  });
  v = null;
};
const build = () => {
  const s = v?.studio || studio();
  drop();
  const model = buildInspectModel(car, evil);
  model.userData.animate?.(STILL.t); // (posed once: the inspector looks at a model, it does not play it)
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  model.position.set(-mid.x, -box.min.y, -mid.z); // (stood on the floor, its middle over the turntable's)
  s.scene.add(model);
  const footprint = Math.max(size.x, size.z);
  s.floor.scale.set(footprint * 3.2, footprint * 3.2, 1);
  s.soft.scale.set(size.x * 1.9, size.z * 1.5, 1);
  s.shadow.scale.set(size.x / 0.6 * 1.04, size.z / 0.6 * 1.02, 1); // (the box in the shadow's texture is 60% of it)
  v = { studio: s, model, height: size.y, radius: Math.hypot(size.x, size.y, size.z) / 2, counts: countModel(model), calls: 0 };
  dirty = true;
};
const say = () => {
  const n = list.length;
  ui.title.firstChild.textContent = car.name;
  ui.title.lastChild.textContent = (kind === 'ideas' ? 'Car idea ' : 'Car ') + (at + 1) + ' / ' + n;
  ui.prev.disabled = ui.next.disabled = n < 2;
  for (const b of [ui.good, ui.evil]) { const on = (b === ui.evil) === evil; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  const c = v.counts;
  const parts = [car.basedOn ? 'Based on ' + car.basedOn : null, sizeWords(car) + (car.real ? ' (real size)' : ''),
    c.meshes.toLocaleString('en') + ' shapes', c.triangles.toLocaleString('en') + ' triangles', v.calls ? v.calls + ' draw calls' : null,
    v.model.userData.block ? 'no model yet: a block' : null].filter(Boolean);
  ui.stats.textContent = parts.join('  ·  ');
};

// ---- drawing ------------------------------------------------------------------------------------------------------
const rsize = new THREE.Vector2();
let kept = null; // (the renderer's canvas size before it was opened: given back on close)
const draw = (now) => {
  raf = requestAnimationFrame(draw);
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  if (!v || document.hidden) return;
  const renderer = sharedRenderer();
  if (!renderer || renderer.getContext().isContextLost()) return;
  // moving: the slow turn until the first touch, the fling, the glide to where it is aimed
  if (!touched && !stillViews()) { aim.yaw += AUTO * dt; }
  if (!held.size && (Math.abs(vel.yaw) > 0.01 || Math.abs(vel.pitch) > 0.01)) {
    aim.yaw += vel.yaw * dt; aim.pitch += vel.pitch * dt;
    const k = Math.pow(0.04, dt); vel.yaw *= k; vel.pitch *= k;
    clampAim();
  } else if (!held.size) vel.yaw = vel.pitch = 0;
  const ease = stillViews() ? 1 : 1 - Math.exp(-dt * 12);
  let moving = false;
  for (const k of ['yaw', 'pitch', 'zoom']) {
    const d = aim[k] - cur[k];
    if (Math.abs(d) > 1e-4) { cur[k] += d * ease; moving = true; } else cur[k] = aim[k];
  }
  // its size on the screen, in device pixels (at most twice the screen's, and about 3 million in all)
  const r = ui.stage.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (r.width * r.height)));
  const w = Math.max(1, Math.round(r.width * ratio)), h = Math.max(1, Math.round(r.height * ratio));
  if (ui.stage.width !== w || ui.stage.height !== h) { ui.stage.width = w; ui.stage.height = h; dirty = true; }
  if (!moving && !dirty) return; // (nothing moved: the picture stands)
  dirty = false;
  // the camera: far enough back for the whole car at any turn (in the picture's width and its height), times the zoom
  // (framed to the band between the bar on top and the buttons under it, not the whole screen: on a short screen the car
  // never sits under them. The picture is still drawn to the whole screen, the view offset so the band's middle is the car's)
  const top = Math.max(0, ui.top.getBoundingClientRect().bottom - r.top + 4), foot = Math.min(r.height, ui.bottom.getBoundingClientRect().top - r.top - 4);
  const band = foot - top > r.height * 0.4 ? { top, height: foot - top } : { top: 0, height: r.height };
  const aspect = r.width / band.height, vHalf = THREE.MathUtils.degToRad(FOV / 2), hHalf = Math.atan(Math.tan(vHalf) * aspect);
  // (across, the near end of a long car looks bigger: room to spare; up and down, a low car never fills its sphere: less)
  const fit = Math.max(v.radius / Math.sin(hHalf) * 1.08, v.radius / Math.sin(vHalf) * 0.9), d = fit * cur.zoom;
  const target = new THREE.Vector3(0, v.height * 0.42, 0), cp = Math.cos(cur.pitch);
  camera.aspect = aspect;
  camera.setViewOffset(r.width, band.height, 0, -band.top, r.width, r.height);
  camera.near = Math.max(0.02, d - v.radius * 3) * 0.25;
  camera.far = d + v.radius * 8 + 50;
  camera.position.set(Math.sin(cur.yaw) * cp * d, target.y + Math.sin(cur.pitch) * d, Math.cos(cur.yaw) * cp * d);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  renderer.getSize(rsize);
  if (w > rsize.x || h > rsize.y) renderer.setSize(Math.max(rsize.x, w), Math.max(rsize.y, h), false);
  renderer.getSize(rsize);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  renderer.render(v.studio.scene, camera);
  const calls = renderer.info.render.calls;
  ui.ctx.clearRect(0, 0, w, h);
  ui.ctx.drawImage(renderer.domElement, 0, rsize.y - h, w, h, 0, 0, w, h);
  if (calls !== v.calls) { v.calls = calls; say(); }
};

// ---- the pointer: one drags round, two pinch; a double tap resets --------------------------------------------------
const held = new Map(); // pointerId -> { x, y, sx, sy }
let pinch = null, lastTap = null, moved = 0, stamp = 0;
const spread = () => { const [a, b] = [...held.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
const firstTouch = () => { if (!touched) { touched = true; ui.hint.classList.add('gone'); } };
const onDown = (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  firstTouch();
  for (const b of ui.views.children) b.classList.remove('on');
  held.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { ui.stage.setPointerCapture(e.pointerId); } catch { /* (a drag still works while over it) */ }
  vel.yaw = vel.pitch = 0;
  aim.yaw = cur.yaw; aim.pitch = cur.pitch; // (taken hold of where it is: a glide or fling stops)
  if (held.size === 1) { moved = 0; stamp = performance.now(); }
  if (held.size === 2) { pinch = { spread: spread(), zoom: aim.zoom }; moved = 99; } // (a pinch is no tap)
  e.preventDefault();
};
const onMove = (e) => {
  const p = held.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pinch && held.size >= 2) {
    aim.zoom = pinch.zoom * pinch.spread / spread();
    clampAim();
    cur.zoom = aim.zoom;
    dirty = true;
    return;
  }
  moved += Math.abs(dx) + Math.abs(dy);
  const r = ui.stage.getBoundingClientRect(), per = 5.2 / Math.max(320, Math.min(r.width, r.height * 1.6)); // (rad a pixel: a screen's width turns it about once round)
  const now = performance.now(), dt = Math.max(0.008, (now - stamp) / 1000);
  stamp = now;
  const by = { yaw: -dx * per, pitch: dy * per * 0.8 };
  aim.yaw += by.yaw; aim.pitch += by.pitch;
  clampAim();
  cur.yaw = aim.yaw; cur.pitch = aim.pitch; // (under the finger: no lag)
  vel.yaw = vel.yaw * 0.4 + by.yaw / dt * 0.6;
  vel.pitch = vel.pitch * 0.4 + by.pitch / dt * 0.6;
  dirty = true;
};
const onUp = (e) => {
  if (!held.has(e.pointerId)) return;
  held.delete(e.pointerId);
  if (held.size < 2) pinch = null;
  if (held.size === 1) { moved = 99; stamp = performance.now(); vel.yaw = vel.pitch = 0; } // (one finger of a pinch lifted: it turns on from here, never a tap)
  if (held.size) return;
  const now = performance.now();
  if (now - stamp > 90) vel.yaw = vel.pitch = 0; // (held still before letting go: no fling)
  vel.yaw = Math.max(-9, Math.min(9, vel.yaw)); vel.pitch = Math.max(-4, Math.min(4, vel.pitch));
  if (e.type === 'pointerup' && moved < 8) { // a tap: two close together put it back
    if (lastTap && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) { lastTap = null; Inspector.reset(); return; }
    lastTap = { t: now, x: e.clientX, y: e.clientY };
  } else lastTap = null;
};
const onWheel = (e) => {
  e.preventDefault();
  firstTouch();
  const by = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
  aim.zoom *= Math.exp(Math.max(-200, Math.min(200, by)) * 0.0015);
  clampAim();
};
const onKey = (e) => {
  if (!open) return;
  if (document.querySelector('.menu-dialog')) return; // (a dialog over it takes its own keys)
  const keys = { Escape: () => Inspector.close(), ArrowLeft: () => Inspector.step(-1), ArrowRight: () => Inspector.step(1), KeyE: () => Inspector.side(!evil), KeyR: () => Inspector.reset() };
  const fn = keys[e.code] || keys[e.key];
  if (!fn) return;
  e.preventDefault();
  e.stopPropagation(); // (the lot under it scrolls on the arrows; the showroom and the menu take Escape)
  fn();
};

export const Inspector = {
  get isOpen() { return open; },
  // open on `car`, one of `list` (its previous / next go along it); evil: the side to paint it; kind: 'ideas' or 'cars'
  // (what the line under the name calls them); done(car): told the car on show as it closes
  open(which, { list: cars = [which], evil: side = false, kind: k = 'cars', done = null } = {}) {
    mountUi();
    list = cars.includes(which) ? cars : [which, ...cars];
    at = list.indexOf(which);
    car = which; evil = !!side; kind = k; onClose = done;
    touched = false;
    ui.hint.classList.remove('gone');
    Object.assign(cur, { yaw: REST.yaw, pitch: REST.pitch, zoom: 1 }); Object.assign(aim, cur); vel.yaw = vel.pitch = 0;
    held.clear(); pinch = null; lastTap = null;
    build();
    say();
    if (!open) {
      open = true;
      root.classList.remove('hidden');
      document.documentElement.classList.add('inspecting', 'sheet-up'); // (sheet-up: lite.css pauses what is under it)
      document.body.classList.add('inspecting');
      Nav.enter('inspect', () => this.close());
      const r = sharedRenderer();
      if (r) { r.getSize(rsize); kept = rsize.clone(); }
      last = 0;
      raf = requestAnimationFrame(draw);
    }
    return true;
  },
  close() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    raf = 0;
    Nav.leave('inspect');
    root.classList.add('hidden');
    document.documentElement.classList.remove('inspecting');
    if (!document.querySelector('.pack-contents, .pack-reveal:not(.hidden)')) document.documentElement.classList.remove('sheet-up'); // (as lite.js sheetUp would have it)
    document.body.classList.remove('inspecting');
    held.clear(); pinch = null;
    const shown = car;
    drop();
    // (the shared renderer's canvas back to the size it had: the menu's views grow it again as they need)
    const r = sharedRenderer();
    if (r && kept && !r.getContext().isContextLost()) r.setSize(kept.x, kept.y, false);
    kept = null;
    ui.ctx.clearRect(0, 0, ui.stage.width, ui.stage.height);
    ui.stage.width = ui.stage.height = 1; // (its picture let go too)
    const done = onClose;
    onClose = null;
    done?.(shown);
  },
  // the previous / next car of the list (round from the last to the first)
  step(by) {
    if (!open || list.length < 2) return;
    at = (at + by + list.length) % list.length;
    car = list[at];
    build();
    say();
  },
  side(isEvil) {
    if (!open) return;
    evil = !!isEvil;
    paintInspectModel(v.model, car, evil);
    dirty = true;
    say();
  },
  // a preset view: the camera glides there (the shorter way round), the zoom back to the whole car
  view(id) {
    const p = VIEWS[id];
    if (!open || !p) return;
    firstTouch();
    vel.yaw = vel.pitch = 0;
    const turn = Math.PI * 2;
    aim.yaw = p.yaw + Math.round((cur.yaw - p.yaw) / turn) * turn;
    aim.pitch = p.pitch;
    aim.zoom = 1;
    clampAim();
    for (const b of ui.views.children) b.classList.toggle('on', b.dataset.view === id);
  },
  reset() { this.view('34'); },
  // for a check or a picture: what is shown
  get state() {
    return open && v ? { car: car.id, at, of: list.length, evil, yaw: cur.yaw, pitch: cur.pitch, zoom: cur.zoom, aim: { ...aim }, touched,
      meshes: v.counts.meshes, triangles: v.counts.triangles, calls: v.calls, running: !!raf, block: !!v.model.userData.block } : { open: false, running: !!raf };
  },
};
