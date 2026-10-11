// ---- little scenes for cards: a model turning on its stand, each in a small canvas of its own ------------
// The reference pages (gimmickspage.js, poweruppage.js, cargopage.js) and the menu's "what's on this road" card
// (render/levelcard3d.js) all show a card's model the same way: a scene of its own per card, and ONE renderer
// for all of them, on a canvas that is NOT in the page. Each card's .view element gets a small 2D canvas of
// its own; each frame, every view on screen is rendered and that picture copied into its canvas. The
// pictures are then part of the page: they scroll with it, and are clipped as it is. (One canvas laid over
// the page and drawn into patch by patch trailed the cards when scrolling: the page moves at once, the
// canvas's picture a frame later.) No game state here, and nothing of a level is built.
import * as THREE from 'three';
import { PICKUP_MODELS, makeTargetModel } from './pickupModels.js';

// prefers-reduced-motion (asked of the browser as each frame is drawn, so a change of the setting is followed):
// every view stands still. drawViews holds the clock at `t` and moves nothing on, so no model turns, hops or
// flashes (a light bar shows steady, in the one colour it has at that moment); a model that would have been
// turning is stood at `angle` rad, not nose on; and each picture is drawn again only every `every` s, or when
// its size changes. Here once, for the pages, the road card and the start screen's car card alike
export const STILL = { t: 2.4, angle: 0.6, every: 0.5 };
let asked, query;
export const stillViews = () => {
  if (asked !== window.matchMedia) { asked = window.matchMedia; query = asked ? asked.call(window, '(prefers-reduced-motion: reduce)') : null; }
  return !!query?.matches;
};
// an empty scene, lit as every card's is
export const lit = () => {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  return scene;
};

// A model on a turntable, framed whatever its size: { model, tick?(t, dt), spin = true, lift?, angle? } (what a
// gimmick card's build() returns; lift: how far down it is looked on, rad; angle: how far round the turntable
// starts, rad; close: how much nearer than a full frame the
// camera stands, for a small patch). The camera is put back far enough for the
// whole of it over the whole of its animation: it is played through a few seconds and measured all the way,
// so nothing that hops, drops or tumbles goes out of the picture.
// That framing is by the picture's height. fitWidth: the picture may be narrow (the start screen's car card:
// taller than wide on a desktop, 64 x 44 on a phone), and the model long, so the camera's view is opened out
// until the model's whole length is in it whichever way it has turned (drawViews does it, by the view's
// `reach`: the tangent of the half angle the model takes up)
export const standView = ({ model, tick, spin = true, lift = 0.42, angle = 0, fitWidth = false }, close = 1) => {
  const scene = lit();
  const turn = new THREE.Group(); // (the turntable: the model turns on it, and animates on its own)
  turn.rotation.y = angle;
  turn.add(model);
  scene.add(turn);
  const bounds = new THREE.Box3().setFromObject(model);
  if (tick) {
    for (let t = 0; t < 8; t += 0.1) { tick(t, 0.1); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
  }
  const size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
  turn.position.set(-mid.x, -bounds.min.y, -mid.z);
  const camera = new THREE.PerspectiveCamera(32, 1.6, 0.1, 400);
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius, far = radius / Math.sin(THREE.MathUtils.degToRad(16)) * 0.92 / close;
  camera.position.set(0, size.y * 0.5 + far * Math.sin(lift), far * Math.cos(lift));
  camera.lookAt(0, size.y * 0.5, 0);
  const phase = Math.random() * 6;
  return { scene, camera, reach: fitWidth ? Math.tan(Math.asin(Math.min(0.95, radius / far))) : 0, step(t, dt) {
    if (spin) turn.rotation.y += dt * 0.5;
    tick?.(t + phase, dt);
  }, stand(to) { if (spin && !angle) turn.rotation.y = to; } }; // (standing still: see STILL. One given an angle of its own keeps it)
};

// A pickup turning and bobbing over its pad (its type, the pad's colour, the look for the side picked); 'target'
// is the TANK RAGE target, whose ring turns and glow pulses
export const pickupView = (type, color, evil = false) => {
  const scene = lit();
  const target = type === 'target';
  const model = target ? makeTargetModel() : PICKUP_MODELS[type]();
  model.userData.livery?.(evil);
  model.scale.setScalar(target ? 0.42 : 1.15);
  scene.add(model);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 2.4), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.4, depthWrite: false }));
  pad.position.y = -1.25;
  scene.add(pad);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.4, 6.2);
  camera.lookAt(0, -0.25, 0);
  const phase = Math.random() * 6;
  return { scene, camera, step(t, dt) {
    if (target) { // the ring turns, the glow pulses
      model.userData.ring.rotation.y += dt * 3;
      model.userData.glow.scale.setScalar(1 + Math.sin(t * 5.5 + phase) * 0.15);
      model.position.y = 0.15;
    } else {
      model.rotation.y += dt * 1.6;
      model.position.y = Math.sin(t * 2 + phase) * 0.12;
    }
    model.userData.animate?.(t + phase); // (a model that moves: the big splash's flames)
    const { red, blue } = model.userData; // (the siren's light bar flashes)
    if (red && blue) { const on = Math.floor(t * 6) % 2 === 0; red.visible = on; blue.visible = !on; }
  }, stand(to) { if (!target) model.rotation.y = to; } };
};

// The one renderer, on a canvas of its own that is never put in the page (see-through round the model). It is
// sized in device pixels, and only ever grows: to the biggest view it has drawn.
// null if no renderer can be had (a phone that will give no more WebGL contexts, a browser with none): it
// never throws, and drawViews then draws nothing: the cards keep their names and words, with empty pictures
export const viewRenderer = () => {
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), alpha: true, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(2, 2, false);
    renderer.setClearColor(0x000000, 0);
    renderer.setScissorTest(true);
    return renderer;
  } catch (error) {
    console.warn('No renderer for the models: ' + (error?.message || error));
    return null;
  }
};
// The start screen's one renderer (the car card's model and the road card's tiles share it, so the menu takes
// one WebGL context however many of them are showing): made when first asked for, and kept. null if none can be had
let shared;
export const sharedRenderer = () => shared === undefined ? (shared = viewRenderer()) : shared;
// Views done with: what their scenes put on the graphics card is given back (a renderer that is kept would
// hold it for good). Anything of theirs still in use elsewhere, a geometry or material models share, is
// simply sent again when next drawn.
export const disposeViews = (views) => {
  for (const v of views) v.scene.traverse((node) => {
    node.geometry?.dispose();
    for (const material of [].concat(node.material || [])) { material.map?.dispose(); material.dispose(); }
  });
};
// a view's own canvas, filling its element (made the first time the view is drawn)
const canvasOf = (v) => {
  if (!v.canvas) {
    v.canvas = document.createElement('canvas');
    v.canvas.style.cssText = 'display:block;width:100%;height:100%;border-radius:inherit;pointer-events:none';
    v.ctx = v.canvas.getContext('2d');
    v.el.append(v.canvas);
  }
  return v.canvas;
};
// A frame: every view ({ el, scene, camera, step }) whose element is on screen (and within `within`'s box, if
// one is given: a scrolling box the views are in) is moved on, rendered, and copied into its own canvas.
// One out of sight is neither drawn nor moved. Returns false, having drawn nothing, if there is no renderer
// (see viewRenderer) or its context has been lost; true otherwise.
// With prefers-reduced-motion nothing is moved on at all, and a picture is only drawn now and then: see STILL.
const size = new THREE.Vector2();
export const drawViews = (renderer, views, t, dt, within = null) => {
  if (!renderer || renderer.getContext().isContextLost()) return false;
  const still = stillViews(), clock = performance.now() / 1000;
  if (still) { t = STILL.t; dt = 0; }
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const box = within ? within.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  renderer.getSize(size);
  for (const v of views) {
    const r = v.el.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right || r.width === 0 || r.height === 0) continue;
    const w = Math.max(1, Math.round(r.width * ratio)), h = Math.max(1, Math.round(r.height * ratio));
    const canvas = canvasOf(v), resized = canvas.width !== w || canvas.height !== h;
    if (still) { // (standing still: its picture is kept until it is due again)
      if (!resized && v.stillAt !== undefined && clock - v.stillAt < STILL.every) continue;
      if (v.stillAt === undefined) v.stand?.(STILL.angle);
      v.stillAt = clock;
    } else v.stillAt = undefined;
    if (resized) { canvas.width = w; canvas.height = h; }
    if (w > size.x || h > size.y) renderer.setSize(size.x = Math.max(size.x, w), size.y = Math.max(size.y, h), false);
    // (the bottom left corner of the renderer's canvas, the view's size)
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.clear();
    v.camera.aspect = r.width / r.height;
    // (a view that fits its model's length to the picture's width: zoomed out, never in, until it does)
    if (v.reach) v.camera.zoom = Math.min(1, Math.tan(THREE.MathUtils.degToRad(v.camera.fov / 2)) * v.camera.aspect / v.reach);
    v.camera.updateProjectionMatrix();
    v.step(t, dt);
    renderer.render(v.scene, v.camera);
    v.ctx.clearRect(0, 0, w, h);
    v.ctx.drawImage(renderer.domElement, 0, size.y - h, w, h, 0, 0, w, h);
  }
  return true;
};
