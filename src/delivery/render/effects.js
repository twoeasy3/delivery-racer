import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { FxQueue } from '../physics.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Game } from '../game.js';
import { scene, camera, tmp } from './scene.js';
import { Sound } from './audio.js';
import { CAR } from '../cars.js';
import { Packages } from '../packages.js';
import { makeParticles, classicExplode, classicBurst, rnd, FIRE_COLORS } from './particles.js';
import { createKillFx, chosenKill, KILL_FX } from './killfx.js';
import { createGiantGate, crushedBy } from './giantsound.js';

// ---- particles: smoke, fire and debris as instanced cubes (the machinery: render/particles.js) ---------------------
export const Particles = makeParticles(500, new THREE.MeshBasicMaterial(), scene); // debris, flames, trails
export const Fire = makeParticles(400, new THREE.MeshBasicMaterial({ // explosion fireballs
  transparent: true, opacity: 0.5, depthWrite: false }), scene);
export const Smoke = makeParticles(600, new THREE.MeshBasicMaterial({
  transparent: true, opacity: 0.35, depthWrite: false }), scene);
const CLASSIC = { Particles, Fire, Smoke };
export { rnd, FIRE_COLORS };
// the KILL EFFECTS' pools in the game's scene (render/killfx.js): every explosion not in Classic, and the trails behind the player's packages
export const KillFx = createKillFx(scene);
// how many of something emitted `rate` times a second come out this frame (a whole number, right on average):
// so a wake or an exhaust is as thick at 30, 60 or 120 frames a second
export const perSecond = (rate, dt) => Math.floor(rate * dt + Math.random());

// damaged cars trail smoke from the engine: thicker and darker as health drops, then flames
const emitSmoke = (v, dt) => {
  // a car spinning out from damage pours smoke; one that skidded on ice smokes only as much as its damage
  const health = v.spin > 0 && !v.spinIce ? 0 : v.health / v.maxHealth;
  if (health >= CONFIG.smokeStart) return;
  const amount = 1 - health / CONFIG.smokeStart;
  v.smoke += amount * CONFIG.smokeRate * dt;
  if (v.smoke < 1) return;
  const h = Track.toWorld(v.s + v.dir * v.hl * 0.6, v.lat, tmp);
  const vx = Math.sin(h) * v.vs * 0.3, vz = Math.cos(h) * v.vs * 0.3;
  const grey = Math.round(190 - 160 * amount);
  while (v.smoke >= 1) {
    v.smoke--;
    Smoke.emit(tmp.x + rnd(0.5), tmp.y + v.height * 0.6, tmp.z + rnd(0.5),
      vx + rnd(1), 2 + Math.random() * 2, vz + rnd(1),
      0.8 + amount, 0.4 + amount * 0.7, 2, 0, grey << 16 | grey << 8 | grey);
    if (amount > 0.65 && Math.random() < 0.4) {
      Particles.emit(tmp.x + rnd(0.4), tmp.y + v.height * 0.6, tmp.z + rnd(0.4),
        vx * 2 + rnd(1), 2 + Math.random() * 2, vz * 2 + rnd(1),
        0.35, 0.6, 0.5, 0, 0xff7a1a);
    }
  }
};

// ---- tyres thrown out by an exploding vehicle ---------------------------------------
const tyres = [];
{
  const geo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12);
  geo.rotateZ(Math.PI / 2); // axle along x, so spinning about x looks like rolling
  const rubber = new THREE.MeshLambertMaterial({ color: 0x151515 });
  for (let i = 0; i < 24; i++) {
    const mesh = new THREE.Mesh(geo, rubber);
    mesh.visible = false;
    scene.add(mesh);
    tyres.push({ mesh, vx: 0, vy: 0, vz: 0, spin: 0, life: 0 });
  }
}
let nextTyre = 0;
const throwTyres = (x, y, z, vx, vz) => { // y = the height of the road there
  const count = Math.floor(Math.random() * 5); // 0 to 4 of them come off
  for (let i = 0; i < count; i++) {
    const t = tyres[nextTyre];
    nextTyre = (nextTyre + 1) % tyres.length;
    t.mesh.visible = true;
    t.mesh.position.set(x + rnd(1), y + 0.6, z + rnd(1));
    t.floor = y + 0.38;
    t.mesh.rotation.set(0, Math.random() * Math.PI, 0);
    t.vx = vx * 1.5 + rnd(11);
    t.vy = 9 + Math.random() * 10; // (up and away: a good hop, not a drop)
    t.vz = vz * 1.5 + rnd(11);
    t.spin = 6 + Math.random() * 14;
    t.life = 4.5;
  }
};
const updateTyres = (dt) => {
  for (const t of tyres) {
    if (t.life <= 0) continue;
    t.life -= dt;
    if (t.life <= 0) { t.mesh.visible = false; continue; }
    const p = t.mesh.position;
    t.vy -= 22 * dt;
    p.x += t.vx * dt; p.y += t.vy * dt; p.z += t.vz * dt;
    if (p.y < t.floor) { // bounce, losing speed each time
      p.y = t.floor;
      t.vy = t.vy < -2 ? -t.vy * 0.6 : 0; // (a bounce: three or four of them, each lower)
      t.vx *= 0.8; t.vz *= 0.8;
    }
    t.mesh.rotation.x += t.spin * dt;
    t.mesh.scale.setScalar(Math.min(1, t.life * 3)); // shrinks away at the end
  }
};

// an explosion, in the player's KILL EFFECT (render/killfx.js; Classic: the code it always was, render/particles.js classicExplode).
// The rules queued the same event whichever: only the look is chosen here (render-only, not in the replay fingerprint)
const explode = (e, quiet = false) => { // (quiet: no kill effect's extra sound, for a giant's crush: render/giantsound.js)
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.4, vz = Math.cos(h) * e.vs * 0.4;
  if (e.tyres) throwTyres(tmp.x, tmp.y, tmp.z, vx, vz);
  const look = chosenKill(CAR.id);
  if (look === 'classic' || !KillFx.explode(look, tmp.x, tmp.y, tmp.z, vx, vz, e)) classicExplode(CLASSIC, tmp.x, tmp.y, tmp.z, vx, vz, e);
  else if (KILL_FX[look].sound && !quiet) Sound.play(KILL_FX[look].sound.name, KILL_FX[look].sound.volume * near(e));
  // nearby blasts rattle the camera
  const distance = Math.abs(e.s - Player.s);
  if (distance < 60) Game.shake = Math.max(Game.shake, 1 - distance / 80);
};
// the player's own package bursting on a car or the road (an Evil player's flaming one: a 'burst' at the very spot the package was, as
// packages.js queues it): drawn as a small explosion in the kill effect, when there is one (Classic: the burst it always was)
const PACKAGE_HIT = { big: false, scale: 0.45, smoke: 0.3 };
const playerPackageAt = (e) => {
  for (const p of Packages.list) if (!p.active && p.owner === Player && p.s === e.s && p.lat === e.lat) return true;
  return false;
};
const packageHit = (e) => {
  const look = chosenKill(CAR.id);
  if (look === 'classic' || !playerPackageAt(e)) return false;
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.6, vz = Math.cos(h) * e.vs * 0.6;
  return KillFx.explode(look, tmp.x, tmp.y, tmp.z, vx, vz, PACKAGE_HIT);
};
const near = (e) => (e.s === undefined ? 1 : 1 - Math.abs(Track.along(e.s) - Track.along(Player.s)) / 160);

// small fire puff where a package lands (render/particles.js classicBurst: the same code, moved)
const burst = (e) => {
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.6, vz = Math.cos(h) * e.vs * 0.6;
  classicBurst(CLASSIC, tmp.x, tmp.y, tmp.z, vx, vz);
};

// a care package arriving: a puff of bright confetti, no fire (green for a TANK RAGE target)
const GIFT_COLORS = [0xffffff, 0xffe066, 0xff8fb1, 0x7ee081, 0x4fc3f7];
const gift = (e) => {
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.8, vz = Math.cos(h) * e.vs * 0.8;
  for (let i = 0; i < (e.green ? 40 : 14); i++) {
    Particles.emit(tmp.x + rnd(0.4), tmp.y + 1 + Math.random() * (e.green ? 2 : 0.8), tmp.z + rnd(0.4),
      vx + rnd(e.green ? 8 : 4), 2 + Math.random() * 5, vz + rnd(e.green ? 8 : 4),
      0.4 + Math.random() * 0.4, 0.25 + Math.random() * 0.2, 0, 12,
      e.green ? 0x39ff6a : GIFT_COLORS[Math.floor(Math.random() * GIFT_COLORS.length)]);
  }
};

// smoke from every damaged vehicle; call before the syncs that add particles of their own
// a car in a gravel trap (see Track.gravelAt) throws stones up behind its wheels, and a haze of dust
const emitGravel = (v, dt) => {
  const speed = Math.abs(v.vs ?? v.speed ?? 0), G = CONFIG.gravel;
  if (speed < G.sprayFrom || Math.random() > dt * 60 * Math.min(1, speed / 20)) return;
  const h = Track.toWorld(v.s - v.dir * v.hl * 0.7, v.lat, tmp), fx = Math.sin(h) * v.dir, fz = Math.cos(h) * v.dir;
  for (let n = 0; n < 2; n++) {
    Particles.emit(tmp.x + rnd(v.hw), tmp.y + 0.15, tmp.z + rnd(v.hw), -fx * speed * 0.25 + rnd(3), 2 + Math.random() * 4, -fz * speed * 0.25 + rnd(3),
      0.5 + Math.random() * 0.4, 0.09 + Math.random() * 0.1, 0.4, 20, Math.random() < 0.5 ? 0xd9c48f : 0xa8946a, tmp.y);
  }
  if (Math.random() < 0.5) Smoke.emit(tmp.x + rnd(0.6), tmp.y + 0.4, tmp.z + rnd(0.6), rnd(1), 1 + Math.random(), rnd(1), 0.8, 0.6 + Math.random() * 0.5, 1.5, 0, 0xcdbb92);
};
export const emitVehicleSmoke = (dt) => {
  for (const v of Collision.bodies) if (v.active && !v.junction) { emitSmoke(v, dt); if (v.inGravel) emitGravel(v, dt); }
};

// ?fxboom (a still of the kill effect in a run, render-only, the rules untouched): every 1.2 s of drawing, the nearest obstacle 15 to 60 m
// ahead is drawn exploding where it stands (only drawn: it stays in the road), or, with none, the road 25 m ahead
const FX_BOOM = (() => { try { return new URLSearchParams(location.search).has('fxboom'); } catch { return false; } })();
let boomWait = 0.3;
const fxBoom = (dt) => {
  if ((boomWait -= dt) > 0 || !Player.active) return;
  boomWait = 1.2;
  let at = null;
  for (const o of Collision.obstacles) if (!o.gone && o.s - Player.s > 15 && o.s - Player.s < 60 && (!at || o.s < at.s)) at = o;
  explode({ type: 'explode', s: at ? at.s : Player.s + 25, lat: at ? at.lat : Player.lat, vs: 0, big: false });
};

// plays the effects the game logic queued this frame, then advances every particle and tyre
// (the GIANT's crushes and footsteps: one crunch at a time, a stomp for a step, not a crash WAV for each: render/giantsound.js, CHECKLIST 386)
const giantGate = createGiantGate();
export const updateEffects = (dt) => {
  giantGate.begin(dt, Player.giant);
  for (const e of FxQueue) {
    // (a sound from a spot on the road, and every visual effect, is quieter the further away it is)
    const near = e.s === undefined ? 1 : 1 - Math.abs(Track.along(e.s) - Track.along(Player.s)) / 160;
    if (e.type === 'sound') { const play = giantGate.sound(e.name, e.volume * near); if (play) Sound.play(play[0], play[1]); continue; }
    if (giantGate.on && crushedBy(e, Player)) { const drawn = giantGate.crushed(e, near); if (drawn) explode(drawn, true); continue; } // (its sound: one crunch, below)
    if (e.type === 'burst') { if (!packageHit(e)) burst(e); } else (e.type === 'gift' ? gift : explode)(e);
    // each visual effect has a sound of its own, unless it names another
    Sound.play(e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near);
  }
  for (const [name, volume] of giantGate.end()) Sound.play(name, volume);
  FxQueue.length = 0;
  if (FX_BOOM) fxBoom(dt);
  Particles.update(dt);
  updateTyres(dt);
  Smoke.update(dt);
  Fire.update(dt);
  KillFx.update(dt, camera);
};
