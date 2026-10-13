// ---- the showroom's LIVE car: the car picked, in 3D, turning slowly on a little floor, and turned by a drag ----------
// The detail of the showroom (render/showroom.js) shows its car this way (the row of cards keeps its stills:
// render/carstill.js). No WebGL context of its own: it draws with the menu's one renderer (modelviews.js sharedRenderer,
// which the stills and the start screen's car card use too, on a canvas never in the page) and copies the picture into
// a 2D canvas of its own in the detail, as modelviews.js drawViews does. One view at a time: show() puts it in the
// detail's picture element (moved there again each time the detail is drawn), stop() lets go of the model. A frame is
// drawn only while the view is in sight (visible(): the showroom up, not under the car lot, the phone's sheet up) and
// the page is shown; the loop itself ends with stop(), so nothing runs once the showroom is closed.
// Its car: its own model (garage.js makeShowCar: the garage's, an event's, a filler's or an idea's), painted for the
// side picked (paintShowCar: `color` / `evilColor` and the model's own `userData.livery`), animated (`userData.animate`)
// and, a car of a tier not open yet, flat black (the lot's silhouette). With prefers-reduced-motion it does not turn
// by itself and its parts stand still (modelviews.js STILL); a drag still turns it.
// It LANDS when it comes on screen (a new car: the full view opened, or the next / previous car): a 0.05 m drop onto
// the floor and a damped bounce on its springs, the shadow tightening as it lands (render/carbounce.js, about 0.8 s):
// the BODY sinks onto its wheels and rises off them while the wheels stay on the floor (render/carsuspension.js, which
// finds every model's wheels however it was built). Reduced motion, a dark silhouette, or a vehicle with no springs (no
// wheels on the floor, or the model's noBounce: the Monowheel, the hovercraft, the snowcat...): only a fade-in.
// A KEY car (a Bespoke or event car: showroomData.js kindOf 'key') also shows its KEY in a corner of the stage (the
// owner, 12-Oct): the car's own key model (render/keycard.js keyModelInUse), lit as a Bespoke card's (the rainbow rim),
// standing and spinning on its own upright axis, drawn by the same loop and the same shared renderer into a small 2D
// canvas of its own (so it stops with the car: out of sight, hidden, closed). Reduced motion: it stands still, turned a
// little. Its geometry and materials are given back with the car's (drop()).
// A BLACKED-OUT key car (showroomData.js carCard `dark`: a Bespoke car whose key is not to be had, the Hot Dog Car,
// the Snowcat, the Horseshoe; the owner, 13-Oct: "I wanted THIS key to be spinning when the car is blacked out") shows
// its key too, spinning, as a solid black silhouette: every part one flat black unlit material (render/keyspin.js
// SILHOUETTE_KEY, as the "Where to get it" key card's), anything not a mesh hidden, the lights off; its corner element
// names no car ("Locked car's key"). It is drawn at most 30 times a second (the car may be drawn more often), and,
// like every corner key, not while a sheet is over the showroom (keyWhen).
import * as THREE from 'three';
import { bounceOffset, bounceDone } from './carbounce.js';
import { prepareSuspension, applySuspension } from './carsuspension.js';
import { sharedRenderer, lit, stillViews, STILL } from './modelviews.js';
import { makeShowCar, paintShowCar } from './showcar.js';
import { makeKey } from './keyModels.js';
import { keyModelInUse } from './keycard.js';
import { SILHOUETTE_KEY } from './keyspin.js';
import { SILHOUETTE } from './silhouette.js'; // (as the car lot's: render/garage.js)


const LIFT = 0.3, FOV = 30, SPIN = 0.35; // (rad looked down from level; the camera's height of view, deg; rad/s turning by itself)
const KEY_SPIN = 1.1, KEY_REST = 0.55, KEY_LIFT = 0.12, KEY_FOV = 26; // (the corner key: rad/s; its angle standing still; rad looked down; deg)
const DARK_KEY_FPS = 30; // (a blacked-out car's corner key: frames a second at most)

// a soft round patch: the floor's light and the car's shadow (a canvas gradient, made once each)
const patch = (inner, outer) => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};
let floorMap, shadowMap;
const flat = (map, opacity) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false });

let v = null; // the view: { el, canvas, ctx, car, evil, dark, scene, camera, turn, model, extra: [geometry, material], rxz, height, mid }
let yaw = -0.64, spinBy = 0, held = null, idleAt = 0, raf = 0, last = 0, visible = () => true, keyVisible = () => true;

// let go of the model and its floor (what they put on the graphics card is given back: a geometry or material models
// share is simply sent again when next drawn, as modelviews.js disposeViews says)
const drop = () => {
  if (!v?.scene) return;
  v.scene.traverse((node) => {
    if (node === v.floor || node === v.shadow) return;
    node.geometry?.dispose();
    for (const material of [].concat(node.material || [])) if (material !== SILHOUETTE) { material.map?.dispose(); material.dispose(); }
  });
  for (const thing of v.extra) thing.dispose();
  v.scene = v.model = null;
  dropKey();
};
// the corner key let go: its model given back, its canvas out of the page (kept for next time)
const dropKey = () => {
  if (!v?.key) return;
  v.key.scene.traverse((node) => {
    node.geometry?.dispose();
    for (const material of [].concat(node.material || [])) if (material !== SILHOUETTE_KEY) { material.map?.dispose(); material.dispose(); }
  });
  v.key = null;
  v.keyCanvas?.remove();
};
// the corner key's scene: the key standing on its own upright axis (keyModels.js builds it standing, its face to +z),
// its middle on that axis, the camera stood back far enough for it at any turn. dark: every part flat black, no light
const buildKey = (car, el, dark = false) => {
  const key = makeKey(car, { model: keyModelInUse(car), rarity: 'bespoke' }); // (a key car's key: always Bespoke)
  if (dark) {
    const own = new Set();
    key.traverse((node) => {
      if (!node.material) return;
      for (const m of [].concat(node.material)) own.add(m);
      if (node.isMesh) node.material = SILHOUETTE_KEY;
      else node.visible = false; // (a line, a sprite, points: nothing but the black meshes)
    });
    for (const m of own) if (m !== SILHOUETTE_KEY) { m.map?.dispose(); m.dispose(); }
  }
  key.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(key), mid = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  key.position.set(-mid.x, -mid.y, -mid.z);
  const scene = lit(), spin = new THREE.Group();
  if (dark) scene.traverse((node) => { if (node.isLight) node.visible = false; }); // (unlit anyway: no light on it)
  spin.add(key);
  scene.add(spin);
  const r = Math.hypot(size.x, size.z) / 2, half = size.y / 2;
  const camera = new THREE.PerspectiveCamera(KEY_FOV, 0, 0.1, 100); // (framed on its first frame: frameKey)
  if (!v.keyCanvas) {
    v.keyCanvas = document.createElement('canvas');
    v.keyCanvas.className = 'sr-key-live';
    v.keyCanvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    v.keyCtx = v.keyCanvas.getContext('2d');
  }
  el.append(v.keyCanvas);
  v.key = { el, scene, spin, camera, turn: KEY_REST, r, half, dark, drawnAt: 0, frames: 0 };
};
// the key's camera for a picture of this shape: far enough back for it at any turn (its half width at most r)
const frameKey = (k, aspect) => {
  const vHalf = THREE.MathUtils.degToRad(KEY_FOV / 2), hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const up = k.half * Math.cos(KEY_LIFT) + k.r * Math.sin(KEY_LIFT);
  const far = Math.max(k.r / Math.tan(hHalf), up / Math.tan(vHalf)) * 1.06 + k.r;
  k.camera.aspect = aspect;
  k.camera.position.set(0, far * Math.sin(KEY_LIFT), far * Math.cos(KEY_LIFT));
  k.camera.lookAt(0, 0, 0);
  k.camera.updateProjectionMatrix();
};

// the scene for the car: the model on a turntable, a floor under it, and its shadow (turning with it)
const build = () => {
  const model = makeShowCar(v.car);
  paintShowCar(model, v.car, v.evil);
  if (v.dark) model.traverse((part) => { if (part.isMesh) part.material = SILHOUETTE; });
  const scene = lit();
  const turn = new THREE.Group(), body = new THREE.Group(); // (body: what lands and bounces, the model in it)
  body.add(model);
  turn.add(body);
  scene.add(turn);
  const springs = prepareSuspension(model); // (its wheels and its sprung body found, once, as it was built: render/carsuspension.js)
  // its size over the whole of its animation (a part that moves must not go out of the picture)
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (model.userData.animate) for (let t = 0; t < 4; t += 0.25) { model.userData.animate(t); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
  const size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
  model.position.set(-mid.x, -bounds.min.y, -mid.z); // (stood on the floor, its middle over the turntable's)
  const rxz = Math.hypot(size.x, size.z) / 2;
  floorMap ||= patch('rgba(190, 210, 255, 0.55)', 'rgba(190, 210, 255, 0)');
  shadowMap ||= patch('rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0)');
  const floorGeometry = new THREE.PlaneGeometry(1, 1), floorMaterial = flat(floorMap, 0.4), shadowMaterial = flat(shadowMap, 0.75);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(rxz * 2.9, rxz * 2.9, 1);
  floor.position.y = 0.002;
  floor.renderOrder = -2;
  scene.add(floor);
  const shadow = new THREE.Mesh(floorGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(size.x * 1.25, size.z * 1.2, 1);
  shadow.position.y = 0.004;
  shadow.renderOrder = -1;
  turn.add(shadow);
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 0.1, 400);
  Object.assign(v, { scene, turn, body, model, camera, still: springs.how === 'none', floor, shadow, shadowScale: [size.x * 1.25, size.z * 1.2], extra: [floorGeometry, floorMaterial, shadowMaterial], rxz, height: size.y });
};

// the camera stood back far enough for the whole car, whichever way it has turned, in a picture of this shape
const frame = (aspect) => {
  const { camera, rxz, height } = v;
  const vHalf = THREE.MathUtils.degToRad(FOV / 2), hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const across = rxz, up = rxz * Math.sin(LIFT) + height / 2 * Math.cos(LIFT); // (half its width and height seen from there)
  const far = Math.max(across / Math.tan(hHalf), up / Math.tan(vHalf)) * 1.08 + rxz * 0.75; // (and its near end, nearer: a little more)
  camera.aspect = aspect;
  camera.position.set(0, height * 0.45 + far * Math.sin(LIFT), far * Math.cos(LIFT));
  camera.lookAt(0, height * 0.42, 0);
  camera.updateProjectionMatrix();
};

const size = new THREE.Vector2();
const draw = (now) => {
  raf = requestAnimationFrame(draw);
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  if (!v?.scene || document.hidden || !v.el.isConnected || !visible()) return; // (out of sight: nothing drawn)
  const renderer = sharedRenderer();
  if (!renderer || renderer.getContext().isContextLost()) return;
  const r = v.el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  // (its pixels: the screen's, at most twice over, and never more than about a million)
  let ratio = Math.min(window.devicePixelRatio || 1, 2);
  ratio = Math.min(ratio, Math.sqrt(1.1e6 / (r.width * r.height)));
  const w = Math.max(1, Math.round(r.width * ratio)), h = Math.max(1, Math.round(r.height * ratio));
  if (v.canvas.width !== w || v.canvas.height !== h) { v.canvas.width = w; v.canvas.height = h; }
  // turning: by the drag, then flung on a little, then (after a moment) slowly by itself
  const still = stillViews();
  if (!held) {
    if (Math.abs(spinBy) > 0.02) { yaw += spinBy * dt; spinBy *= Math.pow(0.05, dt); }
    else if (!still && !(ShowroomView.hold >= 0) && now - idleAt > 1200) yaw += SPIN * dt; // (held for a picture: not turning either)
  }
  v.turn.rotation.y = yaw;
  // landing: the drop and the bounce (render/carbounce.js), the shadow with it; a silhouette or reduced motion: a fade
  // (its clock moves at most a 30th of a second a frame: a slow first frame, the new model's own hitch on a phone,
  // never swallows the drop; the bounce plays out over the frames actually drawn)
  if (v.landAt === null || v.landAt === undefined) { v.landAt = now; v.landT = 0; } else v.landT += Math.min(dt, 1 / 30);
  const hold = ShowroomView.hold, since = hold >= 0 ? Math.min(hold, v.landT / ShowroomView.slow) : v.landT / ShowroomView.slow;
  const o = bounceOffset(since, still || v.dark || v.still); // (v.still: a vehicle with no springs, e.g. the Monowheel: a fade-in only)
  const t = still ? STILL.t : now / 1000;
  v.model.userData.animate?.(t);
  applySuspension(v.model, v.body, o); // (the body on its springs, the wheels kept on the floor: render/carsuspension.js)
  v.shadow.scale.set(v.shadowScale[0] * o.shadow, v.shadowScale[1] * o.shadow, 1);
  v.shadow.material.opacity = 0.75 * Math.min(1, Math.max(0.4, 1 - 6 * o.y));
  v.landing = !bounceDone(since);
  v.lift = o.y;
  if (v.model.userData.lamps && v.car.ufo) v.model.userData.lamps.rotation.y = t * 4; // (the saucer's ring of lights)
  frame(r.width / r.height);
  renderer.getSize(size);
  if (w > size.x || h > size.y) renderer.setSize(size.x = Math.max(size.x, w), size.y = Math.max(size.y, h), false);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  renderer.render(v.scene, v.camera);
  v.ctx.clearRect(0, 0, w, h);
  v.ctx.globalAlpha = ShowroomView.hold >= 0 ? 1 : o.alpha; // (held for a picture: not faded)
  v.ctx.drawImage(renderer.domElement, 0, size.y - h, w, h, 0, 0, w, h);
  v.ctx.globalAlpha = 1;
  if (v.key) drawKey(renderer, still, dt, ratio, now);
};
// the corner key: turned on (or standing still, reduced motion), drawn into the same renderer and copied into its canvas
const drawKey = (renderer, still, dt, ratio, now) => {
  const k = v.key, cw = k.el.clientWidth, ch = k.el.clientHeight;
  k.turn = still ? KEY_REST : (k.turn + KEY_SPIN * dt) % (Math.PI * 2); // (turned by the clock, drawn or not)
  if (!cw || !ch || !k.el.isConnected || !keyVisible()) return; // (a sheet over it: not drawn)
  if (k.dark && k.drawnAt && now - k.drawnAt < 1000 / DARK_KEY_FPS - 2) return; // (the blacked-out key: at most 30 a second)
  k.drawnAt = now;
  k.frames++;
  const w = Math.max(1, Math.round(cw * ratio)), h = Math.max(1, Math.round(ch * ratio));
  if (v.keyCanvas.width !== w || v.keyCanvas.height !== h) { v.keyCanvas.width = w; v.keyCanvas.height = h; }
  k.spin.rotation.y = k.turn;
  if (k.camera.aspect !== w / h) frameKey(k, w / h);
  if (w > size.x || h > size.y) renderer.setSize(size.x = Math.max(size.x, w), size.y = Math.max(size.y, h), false);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  renderer.render(k.scene, k.camera);
  v.keyCtx.clearRect(0, 0, w, h);
  v.keyCtx.drawImage(renderer.domElement, 0, size.y - h, w, h, 0, 0, w, h);
};

// a drag turns it (a mouse or a finger, in the picture only: the sheet around it still scrolls)
const onDown = (e) => {
  if (e.button > 0) return;
  held = { x: e.clientX, t: performance.now(), id: e.pointerId };
  spinBy = 0;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* (not to be had: the drag still works while over it) */ }
  e.currentTarget.classList.add('turning');
};
const onMove = (e) => {
  if (!held || e.pointerId !== held.id) return;
  const now = performance.now(), dx = e.clientX - held.x, dt = Math.max(1, now - held.t) / 1000;
  const by = dx * 0.012;
  yaw += by;
  spinBy = spinBy * 0.5 + (by / dt) * 0.5;
  held.x = e.clientX;
  held.t = now;
  e.preventDefault();
};
const onUp = (e) => {
  if (!held || e.pointerId !== held.id) return;
  if (performance.now() - held.t > 90) spinBy = 0; // (held still before letting go: no fling)
  spinBy = Math.max(-8, Math.min(8, spinBy));
  held = null;
  idleAt = performance.now();
  e.currentTarget.classList.remove('turning');
};

export const ShowroomView = {
  // the car in this element (the detail's picture), on a side, dark or not. False: no renderer (no WebGL to be had) or
  // no model for the car; the showroom then shows its still instead
  // keyEl: where the car's KEY spins (a key car's corner of the stage), or none
  show(el, car, { evil = false, dark = false, keyEl = null } = {}) {
    if (!sharedRenderer()) return false;
    v ||= { canvas: null, ctx: null, extra: [] };
    if (!v.canvas) {
      v.canvas = document.createElement('canvas');
      v.canvas.className = 'sr-live';
      v.canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
      v.ctx = v.canvas.getContext('2d');
    }
    const fresh = v.car !== car || v.dark !== dark || !v.scene;
    if (v.el !== el) {
      v.el = el;
      el.append(v.canvas);
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    }
    if (fresh) {
      drop();
      Object.assign(v, { car, evil, dark, landAt: null, landing: true, lift: 0 }); // (landAt: its first frame drawn)
      try { build(); } catch (error) { console.warn('No model for the showroom: ' + (error?.message || error)); drop(); v.car = null; return false; }
      if (!held) { yaw = -0.64; spinBy = 0; idleAt = performance.now(); } // (a new car: from the cards' pose, then turning)
    } else if (v.evil !== evil) this.side(evil);
    // the corner key (a new car's built afresh with it; the same car's moved into the new corner: the detail is drawn anew)
    if (!keyEl) dropKey();
    else if (!v.key || fresh) { dropKey(); try { buildKey(car, keyEl, dark); } catch (error) { console.warn('No key for the showroom: ' + (error?.message || error)); dropKey(); } }
    else if (v.key.el !== keyEl) { v.key.el = keyEl; keyEl.append(v.keyCanvas); }
    if (!raf) { last = 0; raf = requestAnimationFrame(draw); }
    return true;
  },
  // the side's livery on the car shown (a dark one stays dark)
  side(evil) {
    if (!v?.model) return;
    v.evil = !!evil;
    if (!v.dark) paintShowCar(v.model, v.car, v.evil);
  },
  slow: 1, // (a check's slow motion of the landing: 10 = ten times slower; 1 always in play)
  hold: -1, // (a picture's: the landing stopped that many seconds in, e.g. 0.16 the body down on its springs; ?bounce=0.16)
  // whether the view is in sight now (render/showroom.js says)
  when(fn) { visible = fn; },
  // whether the corner key may be drawn now (no sheet over the showroom: render/showroom.js says)
  keyWhen(fn) { keyVisible = fn; },
  // done: the loop ended and the model let go (the 2D canvas is kept for next time)
  stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    held = null;
    drop();
    if (v) { v.car = null; v.canvas?.remove(); v.el = null; }
  },
  // for a check or a picture: what is shown
  get state() { return v?.scene ? { car: v.car.id, evil: v.evil, dark: v.dark, yaw, running: !!raf, landing: !!v.landing, lift: v.lift || 0, key: v.key ? { turn: v.key.turn, dark: v.key.dark, frames: v.key.frames } : null, since: v.landAt == null ? null : v.landT / this.slow, pitch: v.body.rotation.x } : null; },
};
