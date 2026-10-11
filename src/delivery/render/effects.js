import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { FxQueue } from '../physics.js';
import { Player } from '../player.js';
import { Collision } from '../collision.js';
import { Game } from '../game.js';
import { scene, tmp } from './scene.js';
import { unitBox } from './cars.js';
import { Sound } from './audio.js';

// ---- particles: smoke, fire and debris as instanced cubes ---------------------
const makeParticles = (MAX, material) => {
  const FIELDS = 12; // x y z vx vy vz life maxLife size grow gravity floor
  const data = new Float32Array(MAX * FIELDS);
  const mesh = new THREE.InstancedMesh(unitBox, material, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  for (let i = 0; i < MAX; i++) mesh.setColorAt(i, color);
  const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array;
  M.fill(0); // zero scale = hidden
  scene.add(mesh);
  let next = 0;

  // floor = the height of the road where it was emitted: falling particles land on it
  const emit = (x, y, z, vx, vy, vz, life, size, grow, gravity, hex, floor = 0) => {
    const i = next, o = i * FIELDS;
    next = (next + 1) % MAX;
    data[o] = x; data[o + 1] = y; data[o + 2] = z;
    data[o + 3] = vx; data[o + 4] = vy; data[o + 5] = vz;
    data[o + 6] = life; data[o + 7] = life;
    data[o + 8] = size; data[o + 9] = grow; data[o + 10] = gravity; data[o + 11] = floor;
    color.setHex(hex);
    C[i * 3] = color.r; C[i * 3 + 1] = color.g; C[i * 3 + 2] = color.b;
    mesh.instanceColor.needsUpdate = true;
  };

  const update = (dt) => {
    for (let i = 0; i < MAX; i++) {
      const o = i * FIELDS, m = i * 16;
      if (data[o + 6] <= 0) continue;
      data[o + 6] -= dt;
      if (data[o + 6] <= 0) { M[m] = M[m + 5] = M[m + 10] = 0; continue; }
      data[o + 4] -= data[o + 10] * dt;
      data[o] += data[o + 3] * dt;
      data[o + 1] += data[o + 4] * dt;
      data[o + 2] += data[o + 5] * dt;
      if (data[o + 1] < data[o + 11] + 0.1) { // debris lands and skids
        data[o + 1] = data[o + 11] + 0.1; data[o + 4] = 0;
        data[o + 3] *= 0.9; data[o + 5] *= 0.9;
      }
      const t = 1 - data[o + 6] / data[o + 7];
      const scale = data[o + 8] * (1 + data[o + 9] * t) * Math.min(1, (1 - t) * 3);
      M[m] = M[m + 5] = M[m + 10] = scale;
      M[m + 12] = data[o]; M[m + 13] = data[o + 1]; M[m + 14] = data[o + 2]; M[m + 15] = 1;
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return { emit, update };
};
export const Particles = makeParticles(500, new THREE.MeshBasicMaterial()); // debris, flames, trails
export const Fire = makeParticles(400, new THREE.MeshBasicMaterial({ // explosion fireballs
  transparent: true, opacity: 0.5, depthWrite: false }));
export const Smoke = makeParticles(600, new THREE.MeshBasicMaterial({
  transparent: true, opacity: 0.35, depthWrite: false }));

export const rnd = (range) => (Math.random() - 0.5) * 2 * range;

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

export const FIRE_COLORS = [0xffffff, 0xffd23f, 0xff8c1a, 0xff3b1a];
const explode = (e) => {
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.4, vz = Math.cos(h) * e.vs * 0.4;
  if (e.tyres) throwTyres(tmp.x, tmp.y, tmp.z, vx, vz);
  // (scale: a bigger blast, the tank's shell; smoke: how much smoke, if not the usual)
  const k = (e.big ? 1.5 : 1) * (e.scale || 1);
  const ks = (e.big ? 1.5 : 1) * (e.smoke ?? 1);
  for (let i = 0; i < 35 * k; i++) { // fireball
    Fire.emit(tmp.x + rnd(1), tmp.y + 0.5 + Math.random() * 1.2, tmp.z + rnd(1),
      vx + rnd(6), 2 + Math.random() * 8, vz + rnd(6),
      0.4 + Math.random() * 0.6, (0.5 + Math.random() * 0.7) * k, 1.2, 8,
      FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
  }
  for (let i = 0; i < 7 * ks; i++) { // smoke column
    const grey = 20 + Math.floor(Math.random() * 50);
    Smoke.emit(tmp.x + rnd(2), tmp.y + 1 + Math.random() * 2, tmp.z + rnd(2),
      vx * 0.5 + rnd(3), 3 + Math.random() * 6, vz * 0.5 + rnd(3),
      1.2 + Math.random() * 1.3, (0.8 + Math.random() * 0.8) * ks, 1.5, 0,
      grey << 16 | grey << 8 | grey);
  }
  // glowing debris (no dark bits: the only dark things flying out are the tyres, which stand out for it)
  for (let i = 0; i < 7 * k; i++) {
    Particles.emit(tmp.x + rnd(1), tmp.y + 0.8, tmp.z + rnd(1),
      vx * 1.5 + rnd(10), 5 + Math.random() * 9, vz * 1.5 + rnd(10),
      1.5 + Math.random(), 0.25 + Math.random() * 0.5, 0, 25, 0xff8c1a, tmp.y);
  }
  // nearby blasts rattle the camera
  const distance = Math.abs(e.s - Player.s);
  if (distance < 60) Game.shake = Math.max(Game.shake, 1 - distance / 80);
};

// small fire puff where a package lands
const burst = (e) => {
  const h = Track.toWorld(e.s, e.lat, tmp);
  const vx = Math.sin(h) * e.vs * 0.6, vz = Math.cos(h) * e.vs * 0.6;
  for (let i = 0; i < 18; i++) {
    Particles.emit(tmp.x + rnd(0.5), tmp.y + 0.8 + Math.random(), tmp.z + rnd(0.5),
      vx + rnd(5), 1 + Math.random() * 6, vz + rnd(5),
      0.3 + Math.random() * 0.4, 0.5 + Math.random() * 0.6, 1, 6,
      FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
  }
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

// plays the effects the game logic queued this frame, then advances every particle and tyre
export const updateEffects = (dt) => {
  for (const e of FxQueue) {
    // (a sound from a spot on the road, and every visual effect, is quieter the further away it is)
    const near = e.s === undefined ? 1 : 1 - Math.abs(Track.along(e.s) - Track.along(Player.s)) / 160;
    if (e.type === 'sound') { Sound.play(e.name, e.volume * near); continue; }
    (e.type === 'burst' ? burst : e.type === 'gift' ? gift : explode)(e);
    // each visual effect has a sound of its own, unless it names another
    Sound.play(e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near);
  }
  FxQueue.length = 0;
  Particles.update(dt);
  updateTyres(dt);
  Smoke.update(dt);
  Fire.update(dt);
};
