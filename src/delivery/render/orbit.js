// ============================================================================
// THE ORBIT CAMERA: a camera that circles the player's car, for watching a replay and for looking round once a live run
// is over. Drawn only: nothing here is read by a rule (render/ is outside the replay fingerprint, vite.config.js), so a
// saved replay stays good. Its numbers live here, not in config.js (which IS in the fingerprint).
//
// When: in a replay being watched (playing, paused or held at its end), and once a live run has finished (during the
// delivery at the kerb, and with the results up). Never in a live run's play. It starts only when asked: the Orbit button
// in the run's button row (or O), or "Look around" on the results; the usual camera stays the default everywhere.
//
// Control: drag (one finger or the mouse) to swing round and up and down, wheel or two fingers to zoom, all inside
// RADIUS and PITCH below (nothing past 40 m). It turns slowly by itself until the player takes hold, and goes on again
// after a few seconds of being left alone. A small panel while it is on: "Chase view" (or "Results", where the run is
// over) puts the usual camera back at once, and "Ghost" shows the level's best-run ghost beside the car in a replay.
//
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
import { camera, tmp, tmp2, aim } from './scene.js';
import { firstSolid, prepareSolids } from './racewatch.js';
import { landAt } from './road.js';
import { WatchGhost, watchGhostAvailable, refreshGhost } from './ghostcar.js';
import { damp } from '../util.js';

const ORBIT = {
  radius: { min: 15, max: 40, start: 25 }, // m from the car (the owner, 15-Oct: close; nothing past 40)
  pitch: { min: 5, max: 60, start: 20 },   // degrees up over the car
  yawStart: 150,                            // degrees from dead ahead of the car (to its left): 150 is behind it, a little to one side
  spin: 0.22,                               // rad/s it turns by itself
  idle: 4,                                  // s left alone before it turns by itself again
  turn: 0.006, pinch: 1, step: 1.12,        // rad a pixel dragged; a wheel notch or a button's zoom
  aim: 1.1,                                 // m up on the car that it looks at
  fov: 60,
  least: 5,                                 // m from the car: nearer than that and the nudge gives up (the usual camera instead)
  margin: 1.2,                              // m kept clear of what the ray meets
  beam: 1.6,                                // m either side of the line to the car that must be clear too
  looks: 0.1,                               // s between looks at the scenery (a ray is not free: the scenery has thousands of instances)
};
const rad = (d) => d * Math.PI / 180;

export const Orbit = { on: false, yaw: rad(ORBIT.yawStart), pitch: rad(ORBIT.pitch.start), radius: ORBIT.radius.start, auto: true, still: 0, held: false, nudged: false };
const params = new URLSearchParams(location.search);
const debug = params.get('orbit') !== null; // ?orbit=yaw,pitch,radius: on from the first frame of a run, held still (for stills)

// ---- when it is on offer ----
const offered = () => debug ? Game.state !== 'start' : (!!Replay.playing && Game.state !== 'start') || Game.state === 'finished';
const over = () => Game.state === 'finished'; // (the run is over: the button row is gone, the results are the way back)

const clampRadius = (r) => Math.max(ORBIT.radius.min, Math.min(ORBIT.radius.max, r));
const clampPitch = (p) => Math.max(rad(ORBIT.pitch.min), Math.min(rad(ORBIT.pitch.max), p));

// ---- the buttons ----
const orbitBtn = document.getElementById('orbitBtn');
const panel = document.getElementById('orbitPanel');
const backBtn = document.getElementById('orbitBackBtn');
const ghostBtn = document.getElementById('orbitGhostBtn');
const lookBtn = document.getElementById('lookBtn'); // (on the results: "Look around")

let setReach = () => {}; // (set below, with the camera)
export const setOrbit = (on) => {
  if (on && !offered()) on = false;
  if (on === Orbit.on) return;
  Orbit.on = on;
  Orbit.auto = true;
  Orbit.still = 0;
  setReach(-1);
  document.body.classList.toggle('orbiting', on);
  if (!on) { Orbit.nudged = false; Orbit.held = false; }
};
orbitBtn?.addEventListener('click', () => setOrbit(!Orbit.on));
lookBtn?.addEventListener('click', () => setOrbit(true));
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
let was = '';
let lastStep = 0;
const follow = () => {
  const can = offered();
  if (!can && Orbit.on) setOrbit(false);
  if (Game.step < lastStep && !debug) setOrbit(false); // (a new run, or a replay watched again: the usual camera to begin with)
  lastStep = Game.step;
  if (Game.state === 'start' || (!Replay.playing && Game.state === 'playing' && !debug)) { WatchGhost.on = false; } // (a new run, or the menu: the ghost back to off)
  if (can) prepareSolids(); // (the scenery boxed as the orbit comes on offer, not on its first frame; a no-op once it is)
  const mode = !can ? '' : over() ? 'over' : 'replay';
  if (mode !== was) { was = mode; document.body.classList.toggle('after-run', mode === 'over'); }
  // the button: in the row while a replay plays (and, once a run is over, the same row with only it in: body.after-run, style.css), and not while orbiting (the panel has the way back)
  put(orbitBtn, 'btn', can && !Orbit.on, (el, v) => { el.style.display = v ? '' : 'none'; });

  put(lookBtn, 'look', can && over(), (el, v) => { el.style.display = v ? '' : 'none'; });
  put(panel, 'panel', Orbit.on, (el, v) => { el.style.display = v ? '' : 'none'; });
  put(backBtn, 'back', over() ? 'Results' : 'Chase view', (el, v) => { el.textContent = v; });
  const ghostHere = watchGhostAvailable() && Game.state === 'playing';
  put(ghostBtn, 'ghost', ghostHere ? (WatchGhost.on ? 'Ghost: on' : 'Ghost: off') : '', (el, v) => { el.style.display = v ? '' : 'none'; el.textContent = v; });
  requestAnimationFrame(follow);
};
requestAnimationFrame(follow);

// ---- taking hold: drag to swing round, wheel or two fingers to zoom ----
const canvas = document.getElementById('game');
const touches = new Map(); // (pointer id -> where it is)
let pinch = 0;
const grab = () => { Orbit.auto = false; Orbit.still = 0; };
canvas.addEventListener('pointerdown', (e) => {
  if (!Orbit.on) return;
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  pinch = touches.size === 2 ? gap() : 0;
  grab();
  try { canvas.setPointerCapture(e.pointerId); } catch { /* (a synthetic pointer: no capture) */ }
});
const gap = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener('pointermove', (e) => {
  const was = touches.get(e.pointerId);
  if (!Orbit.on || !was) return;
  grab();
  if (touches.size === 1) {
    Orbit.yaw -= (e.clientX - was.x) * ORBIT.turn;
    Orbit.pitch = clampPitch(Orbit.pitch + (e.clientY - was.y) * ORBIT.turn);
  }
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
  if (!Orbit.on) return;
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
  const start = () => { if (Game.state === 'start') requestAnimationFrame(start); else if (params.get('orbitoff') === null) { Orbit.on = true; Orbit.auto = false; document.body.classList.add('orbiting'); } };
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
const look = (to) => {
  let hit = Math.min(firstSolid(at, to), underLand(to));
  side.set(to.z - at.z, 0, at.x - to.x).normalize().multiplyScalar(ORBIT.beam);
  for (const k of [1, -1]) { edge.copy(to).addScaledVector(side, k); hit = Math.min(hit, firstSolid(at, edge), underLand(edge)); }
  return hit;
};
const want = new THREE.Vector3(), at = new THREE.Vector3(), probe = new THREE.Vector3();
let reach = -1, sinceLook = 1, lookedAt = '', frames = 0, lookMs = 0, lookMax = 0, lookN = 0, lookSum = 0;
const noNudge = params.get('orbitnonudge') !== null;
setReach = (v) => { reach = v; sinceLook = 1; };
// every frame the orbit is on (main.js), once the car is placed. false: use the usual camera this frame
export const orbitCamera = (dt) => {
  if (!Orbit.on) return false;
  if (!Orbit.held && !Orbit.auto) { // (left alone for a while: it goes on turning)
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
  if (r < ORBIT.least) return false; // (cannot be made clear: the usual camera for now)
  place(Orbit.yaw, pitch, r, want);
  camera.position.copy(want);
  aim(tmp.copy(at)); // (aim turns the picture round on a left-hand level, where the scene is drawn mirrored)
  camera.fov = ORBIT.fov;
  camera.updateProjectionMatrix();
  return true;
};
