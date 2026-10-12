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
// the floor and a damped bounce on its springs, the shadow tightening as it lands (render/carbounce.js, about 0.8 s;
// the whole body moves, as most models have no separate wheels). Reduced motion, or a dark silhouette: only a fade-in.
import * as THREE from 'three';
import { bounceOffset, bounceDone } from './carbounce.js';
import { sharedRenderer, lit, stillViews, STILL } from './modelviews.js';
import { makeShowCar, paintShowCar } from './garage.js';

const SILHOUETTE = new THREE.MeshBasicMaterial({ color: 0x07080b }); // (as the car lot's: render/garage.js)
const LIFT = 0.3, FOV = 30, SPIN = 0.35; // (rad looked down from level; the camera's height of view, deg; rad/s turning by itself)

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
let yaw = -0.64, spinBy = 0, held = null, idleAt = 0, raf = 0, last = 0, visible = () => true;

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
  Object.assign(v, { scene, turn, body, model, camera, floor, shadow, shadowScale: [size.x * 1.25, size.z * 1.2], extra: [floorGeometry, floorMaterial, shadowMaterial], rxz, height: size.y });
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
    else if (!still && now - idleAt > 1200) yaw += SPIN * dt;
  }
  v.turn.rotation.y = yaw;
  // landing: the drop and the bounce (render/carbounce.js), the shadow with it; a silhouette or reduced motion: a fade
  // (its clock moves at most a 30th of a second a frame: a slow first frame, the new model's own hitch on a phone,
  // never swallows the drop; the bounce plays out over the frames actually drawn)
  if (v.landAt === null || v.landAt === undefined) { v.landAt = now; v.landT = 0; } else v.landT += Math.min(dt, 1 / 30);
  const since = v.landT / ShowroomView.slow, o = bounceOffset(since, still || v.dark);
  v.body.position.y = o.y;
  v.body.rotation.set(o.pitch, 0, o.roll);
  v.shadow.scale.set(v.shadowScale[0] * o.shadow, v.shadowScale[1] * o.shadow, 1);
  v.shadow.material.opacity = 0.75 * Math.min(1, Math.max(0.4, 1 - 6 * o.y));
  v.landing = !bounceDone(since);
  v.lift = o.y;
  const t = still ? STILL.t : now / 1000;
  v.model.userData.animate?.(t);
  if (v.model.userData.lamps && v.car.ufo) v.model.userData.lamps.rotation.y = t * 4; // (the saucer's ring of lights)
  frame(r.width / r.height);
  renderer.getSize(size);
  if (w > size.x || h > size.y) renderer.setSize(size.x = Math.max(size.x, w), size.y = Math.max(size.y, h), false);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.clear();
  renderer.render(v.scene, v.camera);
  v.ctx.clearRect(0, 0, w, h);
  v.ctx.globalAlpha = o.alpha;
  v.ctx.drawImage(renderer.domElement, 0, size.y - h, w, h, 0, 0, w, h);
  v.ctx.globalAlpha = 1;
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
  show(el, car, { evil = false, dark = false } = {}) {
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
  // whether the view is in sight now (render/showroom.js says)
  when(fn) { visible = fn; },
  // done: the loop ended and the model let go (the 2D canvas is kept for next time)
  stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    held = null;
    drop();
    if (v) { v.car = null; v.canvas?.remove(); v.el = null; }
  },
  // for a check or a picture: what is shown
  get state() { return v?.scene ? { car: v.car.id, evil: v.evil, dark: v.dark, yaw, running: !!raf, landing: !!v.landing, lift: v.lift || 0, since: v.landAt == null ? null : v.landT / this.slow, pitch: v.body.rotation.x } : null; },
};
