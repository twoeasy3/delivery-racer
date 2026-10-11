// ---- the cargo, drawn: in a corner of the HUD during a run, and set down at the kerb at the end ----
// What a level carries is cargo.js's; the models are cargoModels.js's; the ending's clock is delivery.js's.
//
// The corner: a round window under the TANK RAGE corner (cargohud.css places it), the item turning in
// it. It is drawn by the game's own renderer, into the patch of the canvas that window covers (a second
// little scene, with a scissor), straight after the road: no third WebGL context (a phone has few to
// spare: see scene.js) and no second canvas to keep in step. Where the window is, and whether it is
// there at all (not in photo mode, a cine shot or a screensaver), is the stylesheet's business: this
// draws wherever the element is. On an Evil run the item's state follows the clock (cargo.js), with a
// tick and a flash round the window as it changes.
//
// The kerb (Delivery.active, then Delivery.delivered): the same model, moved into the world: out of
// the car, down beside it, and a moment of its own. The camera comes round from the chase view to the
// kerb, ahead of the car, looking back at the two of them.
import * as THREE from 'three';
import '../cargohud.css';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { Delivery } from '../delivery.js';
import { cargoFor, cargoState, CARGO_STATES } from '../cargo.js';
import { renderer, scene, camera, tmp, tmp2, aim, Cinematic } from './scene.js';
import { Photo } from './photo.js';
import { Fly } from './fly.js';
import { Sound } from './audio.js';
import { carMesh } from './cars.js';
import { Particles, Smoke, rnd } from './effects.js';
import { makeCargoModel } from './cargoModels.js';
import { cornerFrames, addCornerLights, placeCornerCamera } from './cargoview.js';

const C = CONFIG.consignment, E = C.ending;
const params = new URLSearchParams(location.search);
// the ending can be shown: logic may run it (not for a cine shot, which is a still of the road)
Delivery.staged = params.get('cine') === null;
// for pictures of it: ?cargostate=2 shows an Evil item in that state whatever the clock says, and
// ?deliver=2.5 stops the delivery at the kerb that many seconds in
const forced = params.get('cargostate') === null ? null : Math.max(0, Math.min(2, Number(params.get('cargostate')) || 0));
const stopAt = params.get('deliver') === null ? null : Number(params.get('deliver')) || 0;

// ---- the models: one of each, made when first carried, and how each is framed in the corner ----
const models = new Map();
const modelFor = (id) => {
  if (models.has(id)) return models.get(id);
  const model = makeCargoModel(id);
  // framed on what it takes up in each state (played through a few seconds), so a calm one is not lost
  // in the room a furious one needs (cargoview.js: the menu's level card frames its item the same way)
  model.userData.frames = cornerFrames(model);
  models.set(id, model);
  return model;
};

// ---- the corner ---------------------------------------------------------------------------------
const box = document.getElementById('cargoCorner'), label = document.getElementById('cargoLabel');
const cornerScene = new THREE.Scene();
addCornerLights(cornerScene);
const turntable = new THREE.Group();
cornerScene.add(turntable);
const cornerCamera = new THREE.PerspectiveCamera(C.corner.fov, 1, 0.1, 60);
// the window's glass: a dark disc behind the item, drawn first
const glassScene = new THREE.Scene(), glassCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
glassScene.add(new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x0a0e14, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false })));
glassCamera.position.z = 1;
const view = new THREE.Vector4(), size = new THREE.Vector2();
let shown = null, shownState = -1, frame = { mid: 0.5, radius: 0.7 }, pulse = 0;

// the run's item (null: none on this level), and its state by the clock
const carried = () => cargoFor(LEVEL, Player.evil);
const stateNow = () => !Player.evil ? 0 : forced ?? cargoState(Game.remaining, Game.allowed);

// after the road has been drawn (main.js): the item in its window
export const drawCargoCorner = (dt, now) => {
  const cargo = Game.state === 'playing' && !Game.screensaver && !Photo.on && !Cinematic.on && !Fly.on ? carried() : null;
  if (!box) return;
  box.classList.toggle('on', !!cargo);
  if (!cargo) { shown = null; return; }
  const model = modelFor(cargo.id), state = stateNow();
  if (shown !== cargo) { // a new run's item: in its window, as it starts out
    shown = cargo;
    shownState = -1;
    turntable.clear();
    turntable.add(model);
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.setScalar(1);
    model.userData.setState?.(state, true);
    frame = { ...model.userData.frames[state] };
  }
  if (state !== shownState) {
    if (shownState >= 0) { // it has turned: a tick, and a flash round the window
      model.userData.setState?.(state);
      Sound.play('tick', 0.9);
      pulse = C.corner.pulse;
      box.classList.remove('pulse');
      void box.offsetWidth; // (so the animation starts again)
      box.classList.add('pulse');
    }
    shownState = state;
    box.dataset.state = Player.evil ? CARGO_STATES[state] : 'good';
    label.textContent = cargo.states ? cargo.states[state] : cargo.name;
  }
  if (pulse > 0 && (pulse -= dt) <= 0) box.classList.remove('pulse');
  const r = box.getBoundingClientRect();
  if (!r.width || !r.height) return; // (hidden by the stylesheet: photo mode, a cine shot, a screensaver)
  if (!Game.paused) turntable.rotation.y += dt * C.corner.spin;
  model.userData.animate(now / 1000);
  // the camera eases to the room its present state needs
  const want = model.userData.frames[state], k = Math.min(1, dt * 4);
  frame.mid += (want.mid - frame.mid) * k;
  frame.radius += (want.radius - frame.radius) * k;
  placeCornerCamera(cornerCamera, frame);
  // drawn over that patch of the frame: the glass, then (in front of everything) the item
  renderer.getSize(size);
  renderer.getViewport(view);
  const bottom = window.innerHeight - r.bottom, auto = renderer.autoClear;
  renderer.autoClear = false;
  renderer.setScissorTest(true);
  renderer.setScissor(r.left, bottom, r.width, r.height);
  renderer.setViewport(r.left, bottom, r.width, r.height);
  renderer.render(glassScene, glassCamera);
  renderer.clearDepth();
  renderer.render(cornerScene, cornerCamera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, size.x, size.y);
  renderer.autoClear = auto;
};

// ---- the kerb -----------------------------------------------------------------------------------
// (a lamp over the spot, for a night level: always in the scene, so no shader is rebuilt when it comes on)
const lamp = new THREE.PointLight(0xfff1d6, 0, 16, 1.2);
scene.add(lamp);
const hint = document.getElementById('deliveryHint');
const at = new THREE.Vector3(), carAt = new THREE.Vector3(), eye = new THREE.Vector3();
const smooth = (u) => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
const mix = (a, b, k) => a + (b - a) * k;
let kerbModel = null, startFov = 0, wasOn = false, dusted = false;

// where the camera ends up, in the road's own terms: ahead of the car and beyond the cargo
const cameraSpot = (out) => {
  Track.toWorld(Delivery.to.s + E.camera.ahead, Delivery.spot.lat + E.camera.out, out);
  out.y += E.camera.up;
  return out;
};
// every frame, before the camera (main.js): the cargo in the world, while there is a delivery to show
export const syncCargo = (dt, now) => {
  if (stopAt !== null && Game.state === 'finished' && Delivery.cargo && (Delivery.delivered || (Delivery.active && Delivery.t >= stopAt))) { // (?deliver: held at that moment, or put back to it)
    Delivery.active = true;
    Delivery.delivered = false;
    Delivery.t = stopAt;
    Delivery.landed = stopAt >= E.park + E.unload;
    Delivery.update(0);
    Game.paused = true;
  }
  if (forced !== null && Player.evil) Delivery.state = forced;
  const on = Game.state === 'finished' && Delivery.on && !!Delivery.cargo;
  document.body.classList.toggle('delivering', Game.state === 'finished' && Delivery.active);
  if (!on) {
    if (wasOn) { // put away
      wasOn = false;
      if (kerbModel) scene.remove(kerbModel);
      kerbModel = null;
      lamp.intensity = 0;
      carMesh.rotation.z = 0;
    }
    return;
  }
  if (!wasOn) {
    wasOn = true;
    dusted = false;
    startFov = camera.fov;
    kerbModel = modelFor(Delivery.cargo.id);
    kerbModel.userData.setState?.(Delivery.state, true);
    scene.add(kerbModel);
    shown = null; // (the corner takes it back, afresh, on the next run)
    if (hint) hint.textContent = (Player.evil ? 'Delivering: ' : 'Delivered: ') + Delivery.cargo.name + '   |   any key or tap to skip';
  }
  const t = now / 1000, fury = Delivery.state === 2 ? 1 : 0, uneasy = Delivery.state === 1 ? 1 : 0;
  // from the car (its middle, up at the roof) over to its spot on the kerbside
  Track.toWorld(Player.s, Player.lat, carAt);
  Track.toWorld(Delivery.spot.s, Delivery.spot.lat, at);
  const out = Delivery.delivered ? 1 : Delivery.phase === 'park' ? 0 : Delivery.phase === 'unload' ? Delivery.u : 1;
  const k = smooth(out);
  kerbModel.visible = out > 0;
  kerbModel.position.set(mix(carAt.x, at.x, k), mix(carAt.y + 1.1, at.y, k) + Math.sin(Math.PI * out) * 1.5, mix(carAt.z, at.z, k));
  let scale = E.scale * mix(0.25, 1, k), squash = 1;
  // set down: a puff of dust, a squash, and then its moment
  const since = Delivery.delivered ? 99 : Delivery.phase === 'moment' ? Delivery.u * E.moment : Delivery.phase === 'beat' ? E.moment + Delivery.u * E.beat : -1;
  if (since >= 0) {
    if (!dusted && since < 0.5) {
      dusted = true;
      for (let n = 0; n < 8; n++) Smoke.emit(at.x + rnd(0.5), at.y + 0.1, at.z + rnd(0.5), rnd(3), 0.3 + Math.random() * 0.5, rnd(3), 0.45, 0.16, 1.5, 0, 0xd8d2c4);
    }
    squash = 1 - Math.exp(-since * 9) * Math.cos(since * 22) * 0.28;
    const act = Math.min(1, since / 0.25);
    if (!Player.evil) { // Good: a couple of pleased little hops
      kerbModel.position.y += Math.abs(Math.sin(Math.min(since, E.moment) * Math.PI * 2 / E.moment * 1.5)) * 0.28 * (since < E.moment ? 1 : 0);
    } else if (fury) { // furious: it will not stay put: round and round its spot, leaping, swelling, throwing sparks
      const a = since * 5.5, r = 0.75 * act;
      kerbModel.position.x += Math.sin(a) * r;
      kerbModel.position.z += Math.cos(a) * r;
      kerbModel.position.y += Math.abs(Math.sin(since * 8)) * 0.55 * act;
      scale *= 1 + 0.18 * Math.abs(Math.sin(since * 6.5)) * act;
      if (Math.random() < dt * 30) Particles.emit(kerbModel.position.x + rnd(0.5), kerbModel.position.y + 0.8, kerbModel.position.z + rnd(0.5), rnd(4), 2 + Math.random() * 4, rnd(4), 0.5, 0.22, 0, 12, Math.random() < 0.5 ? 0xff3b1a : 0xffd23f, at.y);
      // ...and the car shrinks from it
      carMesh.rotation.z = Math.sin(t * 31) * 0.035 * act;
      carMesh.position.y += Math.abs(Math.sin(t * 19)) * 0.06 * act;
    } else if (uneasy) { // agitated: edging about, a hop now and then
      kerbModel.position.x += Math.sin(since * 3.1) * 0.22 * act;
      kerbModel.position.y += Math.max(0, Math.sin(since * 6.3)) * 0.18 * act;
    }
  }
  kerbModel.scale.set(scale / Math.sqrt(squash), scale * squash, scale / Math.sqrt(squash));
  // it faces the camera
  cameraSpot(eye);
  kerbModel.rotation.set(0, Math.atan2(eye.x - at.x, eye.z - at.z) + (fury && since >= 0 ? Math.sin(since * 7) * 0.5 : 0), 0);
  kerbModel.userData.animate(t);
  lamp.position.set(at.x, at.y + 3.2, at.z);
  lamp.intensity = 28 * smooth(Delivery.delivered ? 1 : Delivery.t / E.park);
};
// the camera, in place of the chase camera while there is a delivery to show: `pan` of the way round
// from where the chase camera sits to the kerb
export const deliveryOn = () => Game.state === 'finished' && Delivery.on && !!Delivery.cargo;
export const deliveryCamera = () => {
  const cam = E.camera, p = Delivery.delivered ? 1 : smooth((Delivery.t - E.pan.from) / (E.pan.to - E.pan.from));
  const midLat = (Delivery.to.lat + Delivery.spot.lat) / 2;
  Track.toWorld(Player.s + mix(-CONFIG.camBack, Delivery.to.s + cam.ahead - Player.s, p), mix(Player.lat, Delivery.spot.lat + cam.out, p), tmp);
  camera.position.set(tmp.x, tmp.y + mix(CONFIG.camHeight, cam.up, p), tmp.z);
  Track.toWorld(Player.s + mix(CONFIG.camLookAhead, Delivery.to.s - Player.s - 0.5, p), mix(Player.lat, midLat, p), tmp2);
  tmp2.y += mix(1, 0.95, p);
  aim(tmp2);
  camera.fov = mix(startFov || CONFIG.camFov, camera.aspect < 1 ? cam.fovPortrait : cam.fov, p);
  camera.updateProjectionMatrix();
};

// any key, tap or click skips it (taken before anything else sees it: Enter would start the level again,
// and a tap would press whatever is under it)
const skip = (e) => {
  if (!Delivery.active || e.repeat) return;
  if (Delivery.skip()) { e.stopImmediatePropagation(); e.preventDefault(); }
};
window.addEventListener('keydown', skip, true);
window.addEventListener('pointerdown', skip, true);
