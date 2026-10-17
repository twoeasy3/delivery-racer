// ============================================================================
// THE ORBIT CAMERA: a camera that circles the player's car, for watching a replay. Drawn only: nothing here is read by a rule (render/ is outside the replay fingerprint, vite.config.js), so a
// saved replay stays good. Its numbers live here, not in config.js (which IS in the fingerprint).
//
// When: in a replay being watched (playing or paused), until it finishes. Never in a live run, and not once a run is over
// (the results' "Look around" was taken out, the owner, 17-Oct: "Look Around is not useful"; STAGE-CARD.md). The usual camera stays the default everywhere.
// In a replay that is PLAYING (or paused) a drag on the game view takes hold of the chase camera where it is, with no cut
// (the first frame is the chase frame; its aim then eases onto the car), and the replay goes on, at any speed; a plain tap
// or click, or a wheel or pinch on the chase camera, does nothing. The Orbit button in the run's button row (or O) starts the
// turning-by-itself kind instead.
//
// Control: drag (one finger or the mouse) to swing round and up and down, wheel or two fingers to zoom, all inside
// RADIUS and PITCH below (nothing past 40 m). A drag-started orbit never turns by itself; the button's kind does, until the
// player takes hold, and goes on again after a few seconds of being left alone. A small panel while it is on: "Chase view"
// eases the usual camera back in half a second (a blend of where it is and where it looks, not a cut), and "Ghost" shows the level's best-run ghost beside the car in a replay.
//
// The fade (render/scenefade.js, REPLAY-CAM.md): set dressing between the camera and the car, or round the camera, is dissolved
// (a house, a tree, a lamp post, a wall's run): the nudge below passes over it. The nudge is for what does not fade.
// The nudge: where the camera would be inside scenery (a stand, a wall, a tunnel's roof, a hillside) it is raised
// first, then drawn in along the line to the car, using the scenery test of the race screensaver's cameras
// (racewatch.js firstSolid); where even that leaves it in the car's lap, orbitCamera says so (false) and main.js uses
// the usual camera for that frame.
//
// For a still: ?orbit=<yaw>,<pitch>,<radius> (degrees from dead ahead of the car, degrees up, metres) turns it on in any
// run that has started, held still; add &orbitghost for the replay ghost, &orbitoff to leave it off (a still of its button), &orbitnonudge to see what the nudge saves it from, and
// the page's console says how far the nudge drew it in. (As ?photo, and the same on a left-hand level.)
// ============================================================================
import * as THREE from 'three';
import { Game } from '../game.js';
import { Replay } from '../replay.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { scene, camera, tmp, tmp2, aim } from './scene.js';
import { Photo } from './photo.js';
import { firstSolid, prepareSolids } from './racewatch.js';
import { landAt } from './road.js';
import { WatchGhost, watchGhostAvailable, refreshGhost } from './ghostcar.js';
import { damp } from '../util.js';
import { fadesAway, fadeProbe, prepareFade } from './scenefade.js';
import { freeCameraAllowed } from './tunnelshape.js';

const ORBIT = {
  radius: { min: 15, max: 40, start: 25 }, // m from the car (the owner, 15-Oct: close; nothing past 40)
  pitch: { min: 5, max: 60, start: 20 },   // degrees up over the car
  yawStart: 150,                            // degrees from dead ahead of the car (to its left): 150 is behind it, a little to one side
  spin: 0.22,                               // rad/s it turns by itself
  idle: 4,                                  // s left alone before it turns by itself again
  turn: 0.006, pinch: 1, step: 1.12,        // rad a pixel dragged; a wheel notch or a button's zoom
  aim: 1.1,                                 // m up on the car that it looks at
  fov: 60,
  settle: 0.5,                              // s a drag-started orbit takes to ease its aim from where the chase camera looked onto the car
  blend: 0.5,                               // s the way back to the chase camera takes
  drag: 6,                                  // px a pointer must travel before it is a drag (a tap is not)
  least: 5,                                 // m from the car: nearer than that and the nudge gives up (the usual camera instead)
  margin: 1.2,                              // m kept clear of what the ray meets
  beam: 1.6,                                // m either side of the line to the car that must be clear too
  looks: 0.1,                               // s between looks at the scenery (a ray is not free: the scenery has thousands of instances)
};
const rad = (d) => d * Math.PI / 180;

export const Orbit = { on: false, mode: 'button', yaw: rad(ORBIT.yawStart), pitch: rad(ORBIT.pitch.start), radius: ORBIT.radius.start, auto: true, still: 0, held: false, nudged: false,
  blending: 0, settle: 1, lookOff: null, fovFrom: 0 }; // (blending: s into the way back; settle: how far the aim has eased onto the car, 0 to 1)
const params = new URLSearchParams(location.search);
const trace = params.get('orbitdemo') !== null || params.get('orbittrace') !== null; // (the console says the pose at the start of a drag and on its first frame)
let traceFirst = false;
const debug = params.get('orbit') !== null; // ?orbit=yaw,pitch,radius: on from the first frame of a run, held still (for stills)

// ---- when it is on offer ----
// (never on an enclosed level, the mall's or the metro's: tunnelshape.js freeCameraAllowed; the replay keeps the chase camera)
const offered = () => freeCameraAllowed() && (debug ? Game.state !== 'start' : !!Replay.playing && Game.state === 'playing');

const clampRadius = (r) => Math.max(ORBIT.radius.min, Math.min(ORBIT.radius.max, r));
const clampPitch = (p) => Math.max(rad(ORBIT.pitch.min), Math.min(rad(ORBIT.pitch.max), p));

// ---- the buttons ----
const orbitBtn = document.getElementById('orbitBtn');
const panel = document.getElementById('orbitPanel');
const backBtn = document.getElementById('orbitBackBtn');
const ghostBtn = document.getElementById('orbitGhostBtn');

let setReach = () => {}; // (set below, with the camera)
const classes = () => {
  document.body.classList.toggle('orbiting', (Orbit.on && Orbit.mode === 'button') || Orbit.blending > 0 && Orbit.mode === 'button');
  document.body.classList.toggle('orbit-drag', Orbit.on && Orbit.mode === 'drag'); // (the HUD stays: the replay's clock is still worth seeing)
};
const blendable = () => !!Replay.playing && Game.state === 'playing' && !debug; // (a replay going on: the way back is a blend, not a cut)
const stopNow = () => { // (at once: a new run, the menu, or where the way back is not to be seen)
  Object.assign(Orbit, { on: false, blending: 0, auto: true, still: 0, lookOff: null, settle: 1, nudged: false, held: false });
  setReach(-1);
  classes();
};
export const setOrbit = (on, mode = 'button') => {
  if (on && !offered()) on = false;
  if (on === Orbit.on && !Orbit.blending) return;
  if (!on && Orbit.on && blendable()) { // (the way back: eased in over ORBIT.blend)
    Orbit.on = false;
    Orbit.blending = 1e-6;
    classes();
    return;
  }
  Orbit.on = on;
  Orbit.blending = 0;
  Orbit.mode = mode;
  Orbit.auto = mode === 'button';
  Orbit.still = 0;
  Orbit.lookOff = null;
  Orbit.settle = 1;
  setReach(-1);
  if (!on) { Orbit.nudged = false; Orbit.held = false; }
  classes();
};
orbitBtn?.addEventListener('click', () => setOrbit(!Orbit.on));
backBtn?.addEventListener('click', () => setOrbit(false));
ghostBtn?.addEventListener('click', () => {
  if (!watchGhostAvailable()) return;
  WatchGhost.on = !WatchGhost.on;
  refreshGhost();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyO' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && (offered() || Orbit.on)) setOrbit(!Orbit.on);
});

// what the buttons say and show, every frame (cheap: only what changed is written)
const shown = new Map();
const put = (el, key, value, write) => { if (el && shown.get(key) !== value) { shown.set(key, value); write(el, value); } };
let lastStep = 0;
const follow = () => {
  const can = offered();
  if (!can && (Orbit.on || Orbit.blending)) stopNow();
  if (Game.step < lastStep && !debug && (Orbit.on || Orbit.blending)) stopNow(); // (a new run, or a replay watched again: the usual camera to begin with)
  lastStep = Game.step;
  if (Game.state === 'start' || (!Replay.playing && Game.state === 'playing' && !debug)) { WatchGhost.on = false; } // (a new run, or the menu: the ghost back to off)
  if (can) prepareSolids(); // (the scenery boxed as the orbit comes on offer, not on its first frame; a no-op once it is)
  if (can && !debug) prepareFade(); // (and the scenery fade's index: render/scenefade.js)
  // the button: in the row while a replay plays, and not while orbiting (the panel has the way back)
  put(orbitBtn, 'btn', can && !Orbit.on, (el, v) => { el.style.display = v ? '' : 'none'; });

  put(panel, 'panel', Orbit.on, (el, v) => { el.style.display = v ? '' : 'none'; });
  const ghostHere = watchGhostAvailable() && Game.state === 'playing';
  put(ghostBtn, 'ghost', ghostHere ? (WatchGhost.on ? 'Ghost: on' : 'Ghost: off') : '', (el, v) => { el.style.display = v ? '' : 'none'; el.textContent = v; });
  requestAnimationFrame(follow);
};
requestAnimationFrame(follow);

// ---- the chase camera as it was drawn last frame (what a drag takes hold of) ----
const flipX = () => (scene.scale.x < 0 ? -1 : 1);
const note = { ok: false, cam: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 60, at: new THREE.Vector3(), heading: 0 };
// called by main.js after the camera is placed, each frame the orbit is not (a replay going on)
export const orbitNote = () => {
  if (Orbit.on || Orbit.blending || !Replay.playing || Game.state !== 'playing') { note.ok = false; return; }
  note.heading = Track.toWorld(Player.s, Player.lat, tmp2);
  note.at.set(tmp2.x, tmp2.y + Player.air + ORBIT.aim, tmp2.z);
  note.cam.set(camera.position.x * flipX(), camera.position.y, camera.position.z);
  note.quat.copy(camera.quaternion);
  note.fov = camera.fov;
  note.ok = true;
};
// a pose in the car's own terms: [m ahead, m to its side, m up, the way it looks: ahead, side, up, fov]
const rel = (cam, quat, fov, at, heading) => {
  const d = new THREE.Vector3(0, 0, -1).applyQuaternion(quat), o = cam.clone().sub(at), f = flipX();
  d.x *= f;
  const s = Math.sin(heading), c = Math.cos(heading);
  const local = (v) => [v.x * s + v.z * c, v.x * c - v.z * s, v.y];
  return [...local(o), ...local(d), fov].map(n => Math.round(n * 1000) / 1000);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// a drag has begun in a replay: the orbit starts from the chase camera's own place, so the first frame is the chase frame
const enterDrag = () => {
  Orbit.on = true;
  Orbit.mode = 'drag';
  Orbit.auto = false;
  Orbit.held = false;
  Orbit.blending = 0;
  setReach(-1);
  if (note.ok) {
    const d = note.cam.clone().sub(note.at), flat = Math.hypot(d.x, d.z);
    Orbit.radius = clampRadius(d.length());
    Orbit.pitch = clampPitch(Math.atan2(d.y, flat));
    Orbit.yaw = wrap(Math.atan2(d.x, d.z) - note.heading);
    // where the chase camera looked, as a point at the car's distance along its view, in the car's terms (it follows the car round)
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(note.quat);
    look.x *= flipX();
    const o = note.cam.clone().addScaledVector(look, d.length()).sub(note.at), s = Math.sin(note.heading), c = Math.cos(note.heading);
    Orbit.lookOff = { f: o.x * s + o.z * c, l: o.x * c - o.z * s, y: o.y };
    Orbit.settle = 0;
    Orbit.fovFrom = note.fov;
    if (trace) console.warn('ORBIT-ENTER chase ' + JSON.stringify(rel(note.cam, note.quat, note.fov, note.at, note.heading)) + ' yaw ' + (Orbit.yaw * 180 / Math.PI).toFixed(1) + ' pitch ' + (Orbit.pitch * 180 / Math.PI).toFixed(1) + ' radius ' + Orbit.radius.toFixed(2) + ' (unclamped ' + d.length().toFixed(2) + ') step ' + Game.step + ' time ' + Game.time.toFixed(2));
  } else { Orbit.lookOff = null; Orbit.settle = 1; }
  classes();
  traceFirst = trace;
};

// ---- taking hold: drag to swing round, wheel or two fingers to zoom ----
const canvas = document.getElementById('game');
const touches = new Map(); // (pointer id -> where it is, and where it began)
let pinch = 0;
const grab = () => { Orbit.auto = false; Orbit.still = 0; };
// a drag may take hold of the chase camera: in a replay going on (or paused), not in photo mode, not while the way back is under way
const dragEnters = () => !Orbit.on && !Orbit.blending && freeCameraAllowed() && !!Replay.playing && Game.state === 'playing' && !Photo.on && !debug;
canvas.addEventListener('pointerdown', (e) => {
  if (!Orbit.on && !dragEnters()) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  pinch = touches.size === 2 ? gap() : 0;
  if (Orbit.on) grab();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* (a synthetic pointer: no capture) */ }
});
const gap = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener('pointermove', (e) => {
  const was = touches.get(e.pointerId);
  if (!was) return;
  if (!Orbit.on) { // (not yet a drag: a pointer that has travelled a few pixels, alone, is one; two fingers on the chase camera are nothing)
    if (touches.size !== 1 || !dragEnters() || Math.hypot(e.clientX - was.x0, e.clientY - was.y0) < ORBIT.drag) return;
    enterDrag();
    was.x = e.clientX; was.y = e.clientY; // (the first frame is the chase frame: what was dragged to get here does not turn it)
  }
  grab();
  if (touches.size === 1) {
    Orbit.yaw -= (e.clientX - was.x) * ORBIT.turn;
    Orbit.pitch = clampPitch(Orbit.pitch + (e.clientY - was.y) * ORBIT.turn);
  }
  touches.set(e.pointerId, { ...was, x: e.clientX, y: e.clientY });
  if (touches.size === 2) { // (two fingers: the pinch zooms)
    const now = gap();
    if (pinch > 0 && now > 0) Orbit.radius = clampRadius(Orbit.radius * (pinch / now) ** ORBIT.pinch);
    pinch = now;
  }
});
const release = (e) => { touches.delete(e.pointerId); pinch = touches.size === 2 ? gap() : 0; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', (e) => {
  if (!Orbit.on) return; // (a wheel on the chase camera is nothing)
  grab();
  Orbit.radius = clampRadius(Orbit.radius * (e.deltaY > 0 ? ORBIT.step : 1 / ORBIT.step));
  e.preventDefault();
}, { passive: false });

if (debug) {
  const [yaw, pitch, radius] = params.get('orbit').split(',').map(Number);
  if (Number.isFinite(yaw)) Orbit.yaw = rad(yaw);
  if (Number.isFinite(pitch)) Orbit.pitch = clampPitch(rad(pitch));
  if (Number.isFinite(radius)) Orbit.radius = clampRadius(radius);
  Orbit.auto = false;
  Orbit.held = true; // (a still: it does not turn by itself)
  if (params.get('orbitghost') !== null) WatchGhost.on = true;
  const start = () => { if (Game.state === 'start') requestAnimationFrame(start); else if (params.get('orbitoff') === null && offered()) { Orbit.on = true; Orbit.mode = 'button'; Orbit.auto = false; classes(); } };
  requestAnimationFrame(start);
}

// ---- the camera ----
// the nearest solid thing on the line from the car to `to`, and on two more a little to either side of it (a thin post or a
// truss beside the line would still be in the picture)
const side = new THREE.Vector3(), edge = new THREE.Vector3();
// (the land of a theme with terrain is not in firstSolid: its height at points along the line is landAt's)
const underLand = (to) => {
  if (!landAt) return Infinity;
  const d = Math.hypot(to.x - at.x, to.y - at.y, to.z - at.z);
  for (let k = 1; k <= 12; k++) {
    const u = k / 12, x = at.x + (to.x - at.x) * u, z = at.z + (to.z - at.z) * u;
    if (at.y + (to.y - at.y) * u < landAt(x, z) + 0.8) return d * (k - 1) / 12;
  }
  return Infinity;
};
// (set dressing that render/scenefade.js dissolves is passed over: the camera keeps its place and the prop fades, REPLAY-CAM.md)
// (what cannot fade is still the nudge's, so the fade never leaves a pose worse than without it: a camera inside a prop's box is
// drawn out of it rather than looking through its dissolve, see fadeProbe; and a line to the car's sills too, for a long low block
// that does not fade and would hide the body under the middle's line)
const low = new THREE.Vector3();
const look = (to) => {
  fadeProbe(to);
  let hit = Math.min(firstSolid(at, to, fadesAway), underLand(to));
  side.set(to.z - at.z, 0, at.x - to.x).normalize().multiplyScalar(ORBIT.beam);
  for (const k of [1, -1]) { edge.copy(to).addScaledVector(side, k); hit = Math.min(hit, firstSolid(at, edge, fadesAway), underLand(edge)); }
  low.copy(at); low.y -= ORBIT.aim - 0.25;
  hit = Math.min(hit, firstSolid(low, to, fadesAway));
  return hit;
};
const want = new THREE.Vector3(), at = new THREE.Vector3(), probe = new THREE.Vector3();
let reach = -1, sinceLook = 1, lookedAt = '', frames = 0, lookMs = 0, lookMax = 0, lookN = 0, lookSum = 0;
const noNudge = params.get('orbitnonudge') !== null;
setReach = (v) => { reach = v; sinceLook = 1; };
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const posO = new THREE.Vector3(), posC = new THREE.Vector3(), quatO = new THREE.Quaternion(), quatC = new THREE.Quaternion(), aimAt = new THREE.Vector3();
const fixed = params.get('orbitblend') !== null ? Number(params.get('orbitblend')) : null; // (a still of the way back, held part way: ?orbitblend=0.5)
// every frame the orbit is on, or on its way back (main.js), once the car is placed. `usual` places the usual camera; false: the
// usual camera is wanted this frame (and nothing has been done for it)
export const orbitCamera = (dt, usual) => {
  if (!Orbit.on && !Orbit.blending) return false;
  if (Orbit.mode === 'button' && !Orbit.held && !Orbit.auto) { // (left alone for a while: it goes on turning)
    Orbit.still += dt;
    if (Orbit.still > ORBIT.idle) Orbit.auto = true;
  }
  if (Orbit.auto && !Orbit.held) Orbit.yaw += ORBIT.spin * dt;
  const heading = Track.toWorld(Player.s, Player.lat, tmp2); // (tmp2 is where the car is)
  at.set(tmp2.x, tmp2.y + Player.air + ORBIT.aim, tmp2.z);
  // where it wants to be: Orbit.radius from the car, round from dead ahead of it, up over it; and if that is inside something, raised, then drawn in
  const place = (yaw, pitch, r, out) => {
    const a = heading + yaw, flat = Math.cos(pitch) * r;
    return out.set(at.x + Math.sin(a) * flat, at.y + Math.sin(pitch) * r, at.z + Math.cos(a) * flat);
  };
  let pitch = Orbit.pitch;
  // (a look at the scenery only every so often, or when the camera has moved on: what it found is kept between looks)
  sinceLook += dt;
  const key = Orbit.radius.toFixed(0) + ':' + Orbit.yaw.toFixed(1) + ':' + Orbit.pitch.toFixed(2);
  if (sinceLook >= ORBIT.looks || key !== lookedAt) {
    sinceLook = 0;
    lookedAt = key;
    const t0 = performance.now();
    let found = Infinity, use = pitch;
    for (const raise of [0, 0.3, 0.6]) { // (as it is, then raised a little, then a little more)
      const p = Math.min(rad(ORBIT.pitch.max), pitch + raise);
      place(Orbit.yaw, p, Orbit.radius, probe);
      const hit = look(probe);
      if (hit === Infinity || hit > Orbit.radius - 0.3) { found = Infinity; use = p; break; }
      if (hit > found || found === Infinity) { found = hit; use = p; }
    }
    lookMs = performance.now() - t0;
    if (lookN++) { lookMax = Math.max(lookMax, lookMs); lookSum += lookMs; }
    Orbit.nudged = found !== Infinity;
    Orbit.useP = use;
    Orbit.freeR = found === Infinity ? Orbit.radius : Math.max(0, found - ORBIT.margin);
  }
  if (noNudge) { Orbit.useP = Orbit.pitch; Orbit.freeR = Orbit.radius; Orbit.nudged = false; }
  pitch = Orbit.useP ?? pitch;
  const goal = Math.min(Orbit.radius, Orbit.freeR ?? Orbit.radius);
  reach = reach < 0 ? goal : reach + (goal - reach) * (goal < reach ? 1 : damp(3, dt)); // (in at once, out gently)
  const r = reach;
  if (debug && ++frames === 8) console.warn('ORBIT radius ' + Orbit.radius.toFixed(1) + ' reach ' + r.toFixed(1) + ' pitch ' + (pitch * 180 / Math.PI).toFixed(0) + ' nudged ' + Orbit.nudged + ' looks ' + lookN + ' ms avg ' + (lookSum / Math.max(1, lookN - 1)).toFixed(1) + ' max ' + lookMax.toFixed(1));
  if (r < ORBIT.least) { Orbit.blending = 0; classes(); return false; } // (cannot be made clear: the usual camera for now)
  place(Orbit.yaw, pitch, r, want);
  // (a drag-started orbit: its aim and its field of view ease from where the chase camera was looking onto the car)
  let k = 1;
  if (Orbit.settle < 1) { k = smooth(Orbit.settle); Orbit.settle = Math.min(1, Orbit.settle + dt / ORBIT.settle); } // (the first frame is the chase frame: it begins to ease after it)
  aimAt.copy(at);
  if (Orbit.lookOff && k < 1) {
    const s = Math.sin(heading), c = Math.cos(heading), o = Orbit.lookOff;
    aimAt.x += (o.f * s + o.l * c) * (1 - k); aimAt.z += (o.f * c - o.l * s) * (1 - k); aimAt.y += o.y * (1 - k);
  }
  camera.position.copy(want);
  aim(tmp.copy(aimAt)); // (aim turns the picture round on a left-hand level, where the scene is drawn mirrored)
  camera.fov = Orbit.lookOff && k < 1 ? Orbit.fovFrom + (ORBIT.fov - Orbit.fovFrom) * k : ORBIT.fov;
  camera.updateProjectionMatrix();
  if (traceFirst) {
    traceFirst = false;
    camera.updateMatrixWorld();
    console.warn('ORBIT-FIRST orbit ' + JSON.stringify(rel(camera.position.clone().setX(camera.position.x * flipX()), camera.quaternion, camera.fov, at, heading)) + ' step ' + Game.step + ' time ' + Game.time.toFixed(2));
  }
  if (Orbit.blending > 0) { // the way back: the orbit's pose and the chase camera's, blended
    posO.copy(camera.position); quatO.copy(camera.quaternion); const fovO = camera.fov;
    usual();
    posC.copy(camera.position); quatC.copy(camera.quaternion); const fovC = camera.fov;
    Orbit.blending += dt;
    const b = fixed ?? smooth(Orbit.blending / ORBIT.blend);
    camera.position.lerpVectors(posO, posC, b);
    camera.quaternion.slerpQuaternions(quatO, quatC, b);
    camera.fov = fovO + (fovC - fovO) * b;
    camera.updateProjectionMatrix();
    if (trace) { camera.updateMatrixWorld(); console.warn('ORBIT-BLEND b ' + b.toFixed(3) + ' orbit ' + JSON.stringify(rel(posO.clone().setX(posO.x * flipX()), quatO, fovO, at, heading)) + ' chase ' + JSON.stringify(rel(posC.clone().setX(posC.x * flipX()), quatC, fovC, at, heading)) + ' shown ' + JSON.stringify(rel(camera.position.clone().setX(camera.position.x * flipX()), camera.quaternion, camera.fov, at, heading))); }
    if (fixed === null && Orbit.blending >= ORBIT.blend) { Orbit.blending = 0; Orbit.lookOff = null; Orbit.settle = 1; setReach(-1); classes(); }
  }
  return true;
};

// the test harness (render/orbitdemo.js): only on ?orbitdemo=<phase>
if (params.get('orbitdemo')) import('./orbitdemo.js').then(m => m.run(params.get('orbitdemo'), params, Orbit));
