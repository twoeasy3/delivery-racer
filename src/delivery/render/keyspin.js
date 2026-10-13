// ---- the ROTATING KEY: the "Where to get it" key card's key, turning (the owner, 13-Oct: "Rotate its key too, but blacked out")
// The showroom's full view turns its car (render/showroomview.js: slowly by itself, a drag turns it, flung on a little).
// The key card in its "Where to get it" section (render/carsources.js, keycard.js keyPicture) now turns its KEY the same
// way: slowly round its own long axis by itself, a drag (a finger or the mouse, sideways) turns it and flings it on a
// little, and a moment after it is let go it turns by itself again. A BLACKED-OUT car's key (showroomData.js carCard
// `dark`) turns as a solid black silhouette: every part of the model drawn with one flat black material (and the
// picture's own `filter: brightness(0)` still over it), no colour, and nothing in the page naming the car (the canvas has
// no attributes; the model is only ever in the shared renderer).
// THE COST (the tablet flicker, CHECKLIST 212 / 215): no WebGL context of its own (modelviews.js sharedRenderer, the
// renderer the showroom's live car uses, copied into a small 2D canvas in the picture); drawn only while the picture is
// on screen (an IntersectionObserver), the page is shown and `when()` says the showroom's full view is up with no sheet
// over it; at most 30 frames a second, the pixel ratio at most 2; nothing scheduled at all while it is off screen (the
// observer starts it again), a slow look (0.4 s) while it is hidden under something. Its model is given back
// (geometry, materials) when the picture leaves the page or stop() is called (the full view shut, the showroom closed).
// The pre-rendered PNG (src/delivery/keyshots/<car id>.png, keycard.js keyShotOf) stays the picture until the first live
// frame is drawn (the same pose: KEY_POSE, the key at turn 0, so the hand-over does not jump), and comes back when the
// live key is let go; it is all there is with no renderer. Reduced motion: no turning by itself, the PNG stays; a drag
// still turns it (drawn live from then on).
// Debug / stills: ?keyturn=<rad> holds the key at that turn (no spin).
import * as THREE from 'three';
import { sharedRenderer, stillViews, poseView } from './modelviews.js';
import { posedKey, KEY_POSE } from './keycard.js';

export const KEY_SPIN = { speed: 0.8, fps: 30, maxRatio: 2, idle: 1200, drag: 0.012, turns: 16 }; // (rad/s by itself; frames a second at most; device pixels per CSS px at most; ms after a drag before it turns by itself; rad a CSS px; turns measured for its framing)
// the blacked-out key's one material: flat black, unlit (no light can bring out a colour or a shape on it)
export const SILHOUETTE_KEY = new THREE.MeshBasicMaterial({ color: 0x000000 });
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const HOLD = params.has('keyturn') ? Number(params.get('keyturn')) || 0 : null;

// the key's scene: the car's own key at Bespoke in the card's pose (keycard.js posedKey + KEY_POSE, as the PNG is drawn),
// turning about its own long axis (the key inside the tipped group: posedKey's `turn`). dark: every part flat black.
// Framed as the PNG (turn 0), then zoomed out just enough that it stays whole at every turn (measured over KEY_SPIN.turns
// turns), so the hand-over from the PNG shows no jump at the start and nothing is cut off later.
export const keyScene = (car, aspect, { dark = false } = {}) => {
  const wrap = posedKey(car);
  const key = wrap.children[0].children[0];
  const own = [];
  if (dark) wrap.traverse((node) => {
    if (!node.material) return;
    for (const m of [].concat(node.material)) own.push(m);
    if (node.isMesh) node.material = SILHOUETTE_KEY;
    else node.visible = false; // (a line, a sprite, points: nothing but the black meshes)
  });
  for (const m of own) { m.map?.dispose(); m.dispose(); }
  const { scene, camera, offset } = poseView(wrap, KEY_POSE, aspect);
  if (dark) scene.traverse((node) => { if (node.isLight) node.visible = false; }); // (no light: the material is unlit anyway)
  // the zoom that keeps it whole at every turn (the view's offset as drawn)
  camera.setViewOffset(1000, 1000 / aspect, offset.x * 1000, offset.y * 1000 / aspect, 1000, 1000 / aspect);
  const box = new THREE.Box3(), p = new THREE.Vector3();
  let reach = 0;
  for (let i = 0; i < KEY_SPIN.turns; i++) {
    key.rotation.y = (i / KEY_SPIN.turns) * Math.PI * 2;
    scene.updateMatrixWorld(true);
    box.setFromObject(wrap);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      p.set(x, y, z).project(camera);
      reach = Math.max(reach, Math.abs(p.x), Math.abs(p.y));
    }
  }
  key.rotation.y = 0;
  camera.clearViewOffset();
  const zoom = Math.min(1, (KEY_POSE.margin ?? 0.98) / Math.max(reach, 1e-6));
  return { scene, camera, offset, key, zoom, aspect };
};
// a scene let go: what it put on the graphics card given back (the shared black material is kept)
const release = (s) => {
  s?.scene.traverse((node) => {
    node.geometry?.dispose();
    for (const m of [].concat(node.material || [])) if (m !== SILHOUETTE_KEY) { m.map?.dispose(); m.dispose(); }
  });
};

// one rotating key at a time (the full view shows one car, so one key card)
let k = null; // { el, car, dark, canvas, ctx, s, turn, spinBy, held, idleAt, live, stash, seen, raf, timer, last, zoomT }
let visible = () => true;
const size = new THREE.Vector2();

// a frame (at most KEY_SPIN.fps a second): turned on by itself or by the drag's fling, rendered, copied into the canvas.
// Nothing more is scheduled once there is nothing to move (reduced motion or ?keyturn, not held, no fling): a drag starts it
const tick = (now = performance.now()) => {
  if (!k) return;
  k.raf = 0; k.timer = 0;
  if (!k.el.isConnected) { KeySpin.stop(); return; }
  if (!k.seen) return; // (off screen: nothing scheduled; the observer starts it again)
  if (document.hidden || !visible()) { k.timer = setTimeout(tick, 400); k.last = 0; return; } // (hidden under something: a slow look)
  const auto = HOLD === null && !stillViews();
  const throttled = k.last && now - k.last < 1000 / KEY_SPIN.fps - 2;
  if (!throttled) {
    const dt = k.last ? Math.min(0.1, (now - k.last) / 1000) : 0;
    k.last = now;
    if (!k.held) {
      if (Math.abs(k.spinBy) > 0.02) { k.turn += k.spinBy * dt; k.spinBy *= Math.pow(0.05, dt); k.moved = true; }
      else if (auto && now - k.idleAt > KEY_SPIN.idle) { k.turn += KEY_SPIN.speed * dt; k.moved = true; }
    }
    if (HOLD !== null && !k.dragged) k.moved = HOLD !== 0;
    if (k.moved || k.live) draw(); // (reduced motion, never touched: the PNG stays, nothing drawn)
  }
  if (throttled || k.held || Math.abs(k.spinBy) > 0.02 || auto) k.raf = requestAnimationFrame(tick);
};
const draw = () => {
  const renderer = sharedRenderer();
  if (!renderer || renderer.getContext().isContextLost()) return;
  const cw = k.el.clientWidth, ch = k.el.clientHeight;
  if (!cw || !ch) return;
  const ratio = Math.min(window.devicePixelRatio || 1, KEY_SPIN.maxRatio);
  const w = Math.max(1, Math.round(cw * ratio)), h = Math.max(1, Math.round(ch * ratio));
  if (!k.s || Math.abs(k.s.aspect - cw / ch) > 1e-3) {
    release(k.s);
    try { k.s = keyScene(k.car, cw / ch, { dark: k.dark }); } catch (error) { console.warn('No rotating key: ' + (error?.message || error)); k.s = null; return; }
  }
  if (!k.canvas) {
    k.canvas = document.createElement('canvas');
    k.canvas.className = 'key-spin';
    k.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    k.ctx = k.canvas.getContext('2d');
  }
  if (k.live && k.stash && k.el.style.backgroundImage !== 'none') { k.stash = k.el.style.backgroundImage; k.el.style.backgroundImage = 'none'; } // (a PNG arrived late)
  if (k.live && k.drawn === k.turn && k.canvas.width === w && k.canvas.height === h) return; // (nothing changed)
  if (k.canvas.width !== w || k.canvas.height !== h) { k.canvas.width = w; k.canvas.height = h; }
  k.drawn = k.turn;
  // (zoomed out from the PNG's framing to the one whole at every turn over the first half turn, so the hand-over is seamless)
  const { scene, camera, offset, key } = k.s;
  key.rotation.y = k.turn;
  k.zoomT += Math.abs(k.turn - (k.lastTurn ?? k.turn));
  const z = 1 + (k.s.zoom - 1) * Math.min(1, k.zoomT / 1.2);
  k.lastTurn = k.turn;
  camera.zoom = z;
  camera.updateProjectionMatrix();
  camera.setViewOffset(w, h, offset.x * w, offset.y * h, w, h);
  renderer.getSize(size);
  if (w > size.x || h > size.y) renderer.setSize(Math.max(size.x, w), Math.max(size.y, h), false);
  renderer.getSize(size);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  renderer.render(scene, camera);
  k.ctx.clearRect(0, 0, w, h);
  k.ctx.drawImage(renderer.domElement, 0, size.y - h, w, h, 0, 0, w, h);
  if (!k.canvas.isConnected) k.el.append(k.canvas);
  // the PNG under it hidden (kept to put back: a blacked-out car's arrives late, through its blob: address)
  const bg = k.el.style.backgroundImage;
  if (bg && bg !== 'none') { k.stash = bg; k.el.style.backgroundImage = 'none'; }
  k.live = true;
  k.frames = (k.frames || 0) + 1;
};
const go = () => { if (k && !k.raf && !k.timer) k.raf = requestAnimationFrame(tick); };
const near = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  for (const e of entries) if (k && e.target === k.el) { k.seen = e.isIntersecting; if (k.seen) go(); }
}) : null;

// the drag: sideways turns it (a vertical move scrolls the words box: touch-action pan-y); flung on a little as it lets go
const onDown = (e) => {
  if (!k || e.button > 0) return;
  k.held = { x: e.clientX, t: performance.now(), id: e.pointerId };
  k.spinBy = 0; k.dragged = true;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* (the drag still works while over it) */ }
  e.currentTarget.classList.add('turning');
  e.stopPropagation(); // (not a swipe to the next car)
  go();
};
const onMove = (e) => {
  if (!k?.held || e.pointerId !== k.held.id) return;
  const now = performance.now(), dx = e.clientX - k.held.x, dt = Math.max(1, now - k.held.t) / 1000;
  const by = dx * KEY_SPIN.drag;
  k.turn += by; k.moved = true;
  k.spinBy = k.spinBy * 0.5 + (by / dt) * 0.5;
  k.held.x = e.clientX; k.held.t = now;
  e.preventDefault();
};
const onUp = (e) => {
  if (!k?.held || e.pointerId !== k.held.id) return;
  if (performance.now() - k.held.t > 90) k.spinBy = 0; // (held still before letting go: no fling)
  k.spinBy = Math.max(-8, Math.min(8, k.spinBy));
  k.held = null;
  k.idleAt = performance.now();
  e.currentTarget.classList.remove('turning');
};
const EVENTS = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp]];

export const KeySpin = {
  // the key card's picture (keycard.js keyPicture's element) turns its key from now on. dark: a blacked-out car's (black)
  start(el, car, { dark = false } = {}) {
    if (!el || !car) return false;
    if (k?.el === el) return true;
    this.stop();
    k = { el, car, dark: !!dark, canvas: null, ctx: null, s: null, turn: HOLD ?? 0, spinBy: 0, held: null, idleAt: performance.now(), live: false, moved: false, stash: null, seen: !near, raf: 0, timer: 0, last: 0, zoomT: HOLD === null ? 0 : 99 };
    el.classList.add('cs-keyspin');
    el.style.touchAction = 'pan-y';
    el.title = 'Drag to turn it';
    for (const [type, fn] of EVENTS) el.addEventListener(type, fn);
    if (near) near.observe(el); else go();
    return true;
  },
  // let go: the loop ended, the model given back, the PNG back in the picture
  stop() {
    if (!k) return;
    cancelAnimationFrame(k.raf); clearTimeout(k.timer);
    near?.unobserve(k.el);
    for (const [type, fn] of EVENTS) k.el.removeEventListener(type, fn);
    k.canvas?.remove();
    if (k.stash) k.el.style.backgroundImage = k.stash;
    release(k.s);
    k = null;
  },
  // whether it may be drawn now (render/showroom.js: the full view up, nothing over it)
  when(fn) { visible = fn; },
  // for a check or a still
  get state() { return k ? { turn: k.turn, live: k.live, frames: k.frames || 0, seen: k.seen, dark: k.dark, running: !!(k.raf || k.timer), zoom: k.s?.zoom ?? null } : null; },
};
