// ---- KILL EFFECTS: the look of every explosion, and of the trail the player's thrown package leaves, as a cosmetic (the owner,
// 15-Oct: "experiment with alternative explosion effects. It will go into customisation as a 'Kill effects' equip. It should also
// affect the trace that throwing packages leaves behind"). CHECKLIST 405.
// RENDER-ONLY. The rules never see it: they keep pushing the same FxQueue event ({ type: 'explode', s, lat, vs, big, scale, smoke });
// render/effects.js, the queue's one consumer, asks chosenKill() which look to draw it in. No rules module imports this file (it is in
// render/, which vite.config.js logicFiles never walks), so the choice is not in the replay fingerprint; a replay or a ghost run is
// drawn in the VIEWER's own choice (for the car on screen), never the recorder's.
// THE CHOICE is the loadout slot 'kill' (render/loadoutstore.js: { id }), per car over the All-cars default like every other slot;
// absent, unknown or not owned = 'classic' (today's explosion, drawn by the very same code: render/particles.js classicExplode).
// ?killfx=<id> wears one for the visit (every car), ?killfx=<id>&fxlow=1 forces the cheap 'low' version.
// THE ENGINE: each effect is a small data-driven definition (render/killfxdefs.js KILL_DEFS) over a set of POOLS made here, one
// InstancedMesh each (one draw call while any of it is alive, none when empty), shared geometry and unlit materials (MeshBasicMaterial,
// some additive), tiny canvas textures (64 x 64 at most) drawn in code, a hard cap on live particles per pool (the oldest is reused when
// full), live ones packed at the front (mesh.count = live: the GPU draws only those), no allocation per frame or per spawn. A LOW
// fallback: when explosions come thick and fast (a giant car ploughing traffic) each spawn makes about a third as many particles.
// A system is made for a parent (the game's scene: render/effects.js; the Cosmetics preview's own: render/killpreview.js).
import * as THREE from 'three';
import { unitBox } from './particles.js';
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import * as Store from './loadoutstore.js';
import { KILL_DEFS as SHIPPED, KILL_EXTRA } from './killfxdefs.js';

// ---- the registry: id -> { name, icon, explode, trail, ... } (classic first; its explode/trail are render/particles.js's) ----
// (KILL_DEFS: the shipped ones and the experiment's cut ones; KILL_IDS, the registry and the screen: the shipped only)
const KILL_DEFS = { ...SHIPPED, ...KILL_EXTRA };
export const KILL_FX = KILL_DEFS;
export const KILL_IDS = Object.keys(SHIPPED);
registerCosmetics(KILL_IDS.map(id => ({ slot: 'kill', id, name: KILL_DEFS[id].name, free: true, price: id === 'classic' ? 0 : 500 })));

// ---- the choice ----
const query = () => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(''); } };
const forced = (() => { const v = query().get('killfx'); return v && KILL_DEFS[v] ? v : null; })(); // (?killfx=<id>: the visit's, every car)
export const forceLow = query().get('fxlow') === '1';
export const killFxValid = (id) => typeof id === 'string' && Object.hasOwn(SHIPPED, id); // (a saved choice: a shipped one)
// the effect a car wears: its own, or the default's, or Classic (absent, unknown, or not owned)
export const killChoice = (carId = null) => { const id = Store.get(carId, 'kill').id; return killFxValid(id) ? id : 'classic'; };
export const shownKill = (carId = null) => { if (forced) return forced; const id = killChoice(carId); return id === 'classic' || ownsCosmetic('kill', id) ? id : 'classic'; };
export const setKill = (id, target = null) => (killFxValid(id) ? Store.setSlot(target, 'kill', { id }) : false);
// the game's: asked at every explosion and every frame a package flies, so cached per car and dropped on any loadout change
let cacheCar = undefined, cacheId = 'classic';
Store.onStore(() => { cacheCar = undefined; });
export const chosenKill = (carId) => {
  if (carId !== cacheCar) { cacheCar = carId; cacheId = shownKill(carId); }
  return cacheId;
};
export const forgetKillCache = () => { cacheCar = undefined; };

// ---- canvas textures (64 x 64 at most, white: tinted by each particle's colour) ----
const canvas = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const TEX = {};
const tex = (name) => TEX[name] ||= canvas(...TEXTURES[name]);
const TEXTURES = {
  dot: [32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }],
  ring: [64, 64, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 0.45; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.stroke(); }],
  star: [64, 64, (g) => { // a comic burst: twelve uneven points, a black outline
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 13 + (i % 3) * 2 : 29 - (i % 5); g.lineTo(32 + Math.sin(a) * r, 32 - Math.cos(a) * r); }
    g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#000'; g.stroke();
  }],
  bubble: [64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 14, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,0.12)'); r.addColorStop(0.75, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = r; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(22, 20, 7, 4, -0.7, 0, Math.PI * 2); g.fill();
  }],
  candy: [64, 32, (g) => { // a wrapped sweet: the twisted ends and a striped middle
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(2, 4); g.lineTo(20, 16); g.lineTo(2, 28); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(62, 4); g.lineTo(44, 16); g.lineTo(62, 28); g.closePath(); g.fill();
    g.beginPath(); g.arc(32, 16, 14, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(32, 16, 14, 0, Math.PI * 2); g.clip(); g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = -3; i < 4; i++) { g.beginPath(); g.moveTo(32 + i * 9 - 8, 0); g.lineTo(32 + i * 9 - 3, 0); g.lineTo(32 + i * 9 + 8, 32); g.lineTo(32 + i * 9 + 3, 32); g.fill(); }
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(27, 10, 3, 0, Math.PI * 2); g.fill();
  }],
};

// ---- shared geometry and materials (made once, on first use; shared by every system: the game's and the preview's) ----
const GEO = {};
const geo = (name) => GEO[name] ||= (() => { // (marked shared below: scene.js clearGroup keeps them)
  if (name === 'box') return unitBox;
  const g = name === 'quad' ? new THREE.PlaneGeometry(1, 1) : name === 'candyquad' ? new THREE.PlaneGeometry(1, 0.5)
    : name === 'coin' ? new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10, 1).rotateX(Math.PI / 2) : null; // (a coin: its faces along z)
  if (g) { g.userData.shared = true; return g; }
  throw new Error('no geometry ' + name);
})();
const basic = (o) => new THREE.MeshBasicMaterial(o);
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
// mode: 'solid' (turned by its two angles: tumbling, or set once), 'billboard' (faces the camera, turned in the picture by its angle),
// 'streak' (a box stretched along its velocity). max: the hard cap on live particles
export const POOL_TYPES = {
  quad: { geo: 'quad', mat: () => basic({ side: THREE.DoubleSide }), mode: 'solid', max: 420, lenY: true },      // paper: confetti, notes
  cube: { geo: 'box', mat: () => basic(), mode: 'solid', max: 320 },                                  // voxels, sprinkles
  coin: { geo: 'coin', mat: () => basic(), mode: 'solid', max: 160 },                                 // gold coins
  spark: { geo: 'box', mat: () => basic(ADD), mode: 'streak', max: 360 },                             // glowing streaks
  bolt: { geo: 'box', mat: () => basic(ADD), mode: 'solid', max: 160 },                               // lightning segments (set once)
  glow: { geo: 'quad', mat: () => basic({ ...ADD, map: tex('dot') }), mode: 'billboard', max: 320 },  // soft glowing dots
  ring: { geo: 'quad', mat: () => basic({ ...ADD, map: tex('ring') }), mode: 'billboard', max: 24 },  // shock rings
  star: { geo: 'quad', mat: () => basic({ map: tex('star'), alphaTest: 0.5 }), mode: 'billboard', max: 120 }, // comic bursts
  bubble: { geo: 'quad', mat: () => basic({ map: tex('bubble'), transparent: true, depthWrite: false }), mode: 'billboard', max: 200 },
  candy: { geo: 'candyquad', mat: () => basic({ map: tex('candy'), alphaTest: 0.5, side: THREE.DoubleSide }), mode: 'billboard', max: 140 },
  puff: { geo: 'quad', mat: () => basic({ map: tex('dot'), transparent: true, opacity: 0.6, depthWrite: false }), mode: 'billboard', max: 200 }, // soft smoke
};
const MAT = {};
const keep = (thing) => { thing.userData.shared = true; if (thing.map) thing.map.userData.shared = true; return thing; }; // (scene.js clearGroup keeps it)
const mat = (name) => MAT[name] ||= keep(POOL_TYPES[name].mat());
export const triangles = (name) => { const g = geo(POOL_TYPES[name].geo); return (g.index ? g.index.count : g.attributes.position.count) / 3; };

// ---- a particle: 28 numbers in a Float32Array ----
const F = 28;
const X = 0, Y = 1, Z = 2, VX = 3, VY = 4, VZ = 5, LIFE = 6, MAXL = 7, SIZE = 8, GROW = 9, GRAV = 10, DRAG = 11, FLOOR = 12,
  AX = 13, AY = 14, SAX = 15, SAY = 16, DELAY = 17, FLUT = 18, PHASE = 19, R = 20, G = 21, B = 22, FD = 23, TOCAM = 24, BOUNCE = 25, SHADE = 26, LEN = 27;
// fade: how it goes. SHRINK: shrinks away at the end (as the classic cubes); DIM: its colour dims to nothing (additive: dark = gone);
// FLICKER: dims, twinkling; POP: swells a little and is gone at once (a bubble); FLASH: snaps in, holds, shrinks fast (a comic burst)
export const FADE = { SHRINK: 0, DIM: 1, FLICKER: 2, POP: 3, FLASH: 4 };
// the one spec object a definition fills for each particle (spec() resets it: nothing is allocated per particle)
const DEFAULTS = Object.freeze({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, size: 1, grow: 0, gravity: 0, drag: 0, floor: -1e9, ax: 0, ay: 0, sax: 0, say: 0, delay: 0, flutter: 0, phase: 0, color: 0xffffff, fade: 0, toCam: 0, bounce: 0, shade: 0, len: 1 });
const q = { ...DEFAULTS };
export const spec = () => Object.assign(q, DEFAULTS);

const color = new THREE.Color(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), quat = new THREE.Quaternion(), turn = new THREE.Quaternion(),
  pos = new THREE.Vector3(), scl = new THREE.Vector3(), mtx = new THREE.Matrix4(), fwd = new THREE.Vector3(), Z_AXIS = new THREE.Vector3(0, 0, 1);

// SETTLE (the Cosmetics preview's system only, render/killpreview.js; the game's is made without it and is exactly as before): a
// particle that falls to a floor is not let die in the air but lands, lies there `rest` seconds (paper and coins laid flat), then
// fades as usual; a coin lies flat on the floor (its floor is its half thickness over the ground). { ground, rest }
const LAYS_FLAT = { quad: true, coin: true };
const makePool = (parent, name, settle = null) => {
  const type = POOL_TYPES[name], max = type.max, mode = type.mode;
  const data = new Float32Array(max * F);
  const rested = settle ? new Float32Array(max) : null, flat = settle && LAYS_FLAT[name];
  const mesh = new THREE.InstancedMesh(geo(type.geo), mat(name), max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.visible = false;
  mesh.name = 'killfx-' + name;
  mesh.userData.shared = true; // (its geometry and material are shared: a scene being let go must not dispose them)
  parent.add(mesh);
  const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array;
  let live = 0, reuse = 0, spawned = 0;
  const add = (s) => {
    let i;
    if (live < max) i = live++;
    else { i = reuse; reuse = (reuse + 1) % max; } // (full: the next oldest-ish slot is taken over; the cap holds)
    const o = i * F;
    data[o + X] = s.x; data[o + Y] = s.y; data[o + Z] = s.z; data[o + VX] = s.vx; data[o + VY] = s.vy; data[o + VZ] = s.vz;
    data[o + LIFE] = s.life; data[o + MAXL] = s.life; data[o + SIZE] = s.size; data[o + GROW] = s.grow; data[o + GRAV] = s.gravity;
    data[o + DRAG] = s.drag; data[o + FLOOR] = s.floor; data[o + AX] = s.ax; data[o + AY] = s.ay; data[o + SAX] = s.sax; data[o + SAY] = s.say;
    data[o + DELAY] = s.delay; data[o + FLUT] = s.flutter; data[o + PHASE] = s.phase; data[o + FD] = s.fade; data[o + TOCAM] = s.toCam;
    data[o + BOUNCE] = s.bounce; data[o + SHADE] = s.shade; data[o + LEN] = s.len;
    if (rested) { rested[i] = 0; if (name === 'coin' && s.floor > -1e8) data[o + FLOOR] = Math.min(s.floor, settle.ground + 0.06 * s.size + 0.005); }
    color.setHex(s.color);
    data[o + R] = color.r; data[o + G] = color.g; data[o + B] = color.b;
    spawned++;
  };
  const update = (dt, camera) => {
    if (!live) { if (mesh.visible) { mesh.visible = false; mesh.count = 0; } return; }
    if (mode === 'billboard' && camera) { quat.copy(camera.quaternion); fwd.set(0, 0, 1).applyQuaternion(quat); } // (fwd: toward the camera)
    const skid = Math.pow(0.9, dt * 60);
    for (let i = 0; i < live; i++) {
      const o = i * F;
      if (data[o + DELAY] > 0) { // (not out yet: drawn at no size)
        data[o + DELAY] -= dt;
        mtx.makeScale(0, 0, 0); mtx.toArray(M, i * 16);
        C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 0;
        continue;
      }
      data[o + LIFE] -= dt;
      if (data[o + LIFE] <= 0) { // dead: the last live one moves into its place
        live--;
        if (i < live) { data.copyWithin(o, live * F, live * F + F); if (rested) rested[i] = rested[live]; i--; }
        continue;
      }
      // motion
      data[o + VY] -= data[o + GRAV] * dt;
      const drag = data[o + DRAG];
      if (drag > 0) { const f = 1 / (1 + drag * dt); data[o + VX] *= f; data[o + VY] *= f; data[o + VZ] *= f; }
      data[o + X] += data[o + VX] * dt;
      data[o + Y] += data[o + VY] * dt;
      data[o + Z] += data[o + VZ] * dt;
      const age = data[o + MAXL] - data[o + LIFE];
      const flut = data[o + FLUT];
      if (flut) { const ph = data[o + PHASE] + age * 6; data[o + X] += Math.cos(ph) * flut * dt; data[o + Z] += Math.sin(ph * 1.3) * flut * dt; }
      if (data[o + Y] < data[o + FLOOR]) { // landed: a bounce if it is bouncy and falling fast, else it skids and settles
        data[o + Y] = data[o + FLOOR];
        const b = data[o + BOUNCE];
        data[o + VY] = b > 0 && data[o + VY] < -2 ? -data[o + VY] * b : 0;
        data[o + VX] *= skid; data[o + VZ] *= skid;
        data[o + SAX] *= skid; data[o + SAY] *= skid;
        data[o + FLUT] = 0;
      }
      data[o + AX] += data[o + SAX] * dt;
      data[o + AY] += data[o + SAY] * dt;
      if (rested && data[o + FLOOR] > -1e8 && data[o + GRAV] > 0) { // (settle: kept until it has landed and lain there)
        if (data[o + Y] <= data[o + FLOOR] && data[o + VY] === 0) {
          rested[i] += dt;
          if (flat) { const a = data[o + AX], goal = Math.round((a - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2; data[o + AX] = a + (goal - a) * Math.min(1, dt * 14); data[o + SAX] = 0;
            if (name === 'coin') { const y = data[o + AY], face = Math.round(y / Math.PI) * Math.PI; data[o + AY] = y + (face - y) * Math.min(1, dt * 14); data[o + SAY] = 0; } } // (a coin face up: lit, not edge-dark)
        }
        if (rested[i] < settle.rest) data[o + LIFE] = Math.max(data[o + LIFE], data[o + MAXL] * 0.34);
      }
      // size and colour over its life
      const t = 1 - data[o + LIFE] / data[o + MAXL], fade = data[o + FD];
      let s = data[o + SIZE] * (1 + data[o + GROW] * t), dim = 1;
      if (fade === 0) s *= Math.min(1, (1 - t) * 3);
      else if (fade === 1) dim = 1 - t;
      else if (fade === 2) dim = (1 - t) * (0.3 + 0.7 * Math.random());
      else if (fade === 3) s *= Math.min(1, age / 0.08) * (1 + 0.25 * t);
      else s *= Math.min(1, age / 0.05) * Math.min(1, (1 - t) * 4);
      if (data[o + SHADE]) dim *= 0.45 + 0.55 * Math.abs(Math.cos(data[o + AY])); // (a coin: bright face on, dark edge on)
      C[i * 3] = data[o + R] * dim; C[i * 3 + 1] = data[o + G] * dim; C[i * 3 + 2] = data[o + B] * dim;
      // the matrix
      pos.set(data[o + X], data[o + Y], data[o + Z]);
      const len = data[o + LEN];
      if (mode === 'billboard') {
        turn.setFromAxisAngle(Z_AXIS, data[o + AX]);
        const tc = data[o + TOCAM];
        if (tc) pos.addScaledVector(fwd, tc);
        mtx.compose(pos, turn.premultiply(quat), scl.set(s, s * len, s)); // (the camera's turn, then its own in the picture)
      } else {
        if (mode === 'streak') {
          const vx = data[o + VX], vy = data[o + VY], vz = data[o + VZ], sp = Math.hypot(vx, vy, vz);
          if (sp > 0.05) { data[o + AY] = Math.atan2(vx, vz); data[o + AX] = -Math.asin(Math.max(-1, Math.min(1, vy / sp))); }
          scl.set(s, s, s * len * Math.max(1, sp * 0.12));
        } else if (type.lenY) scl.set(s, s * len, s); // (a flat quad: long the way it is tall)
        else scl.set(s, s, s * len);
        euler.set(data[o + AX], data[o + AY], 0, 'YXZ');
        turn.setFromEuler(euler);
        mtx.compose(pos, turn, scl);
      }
      mtx.toArray(M, i * 16);
    }
    mesh.count = live;
    mesh.visible = live > 0;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  };
  const clear = () => { live = 0; mesh.count = 0; mesh.visible = false; };
  return { add, update, clear, mesh, max, get live() { return live; }, get spawned() { return spawned; } };
};

// ---- a SYSTEM: the pools of one scene, made as an effect first needs them ----
// (settle: { ground, rest } for the Cosmetics preview only: see makePool; the game's system has none)
export const createKillFx = (parent, { settle = null } = {}) => {
  const pools = {};
  const pool = (name) => pools[name] ||= makePool(parent, name, settle);
  let load = 0; // (explosions lately: decays by half every 0.35 s; over LOW_AT the spawns are the low version)
  const LOW_AT = 5;
  const S = {
    low: false,
    spec,
    add: (name) => pool(name).add(q),
    // how many: n, or about a third as many in the low version (at least one)
    n: (n) => (S.low ? Math.max(1, Math.round(n * 0.35)) : Math.round(n)),
  };
  return {
    pools,
    // an explosion of the effect `id` at x, y, z (y: the road's height there), carrying vx, vz; e: the event ({ big, scale, smoke })
    explode(id, x, y, z, vx, vz, e) {
      const def = KILL_DEFS[id];
      if (!def || !def.explode) return false;
      load += 1;
      S.low = forceLow || load > LOW_AT;
      const k = (e.big ? 1.5 : 1) * (e.scale || 1), ks = (e.big ? 1.5 : 1) * (e.smoke ?? 1);
      def.explode(S, x, y, z, vx, vz, k, ks, e);
      return true;
    },
    // the trail behind a flying package (x, y, z: the package in the air; floor: the road under it)
    trail(id, x, y, z, floor) {
      const def = KILL_DEFS[id];
      if (!def || !def.trail) return false;
      def.trail(S, x, y, z, floor);
      return true;
    },
    update(dt, camera) {
      load *= Math.pow(0.5, dt / 0.35);
      for (const name in pools) pools[name].update(dt, camera);
    },
    clear() { for (const name in pools) pools[name].clear(); load = 0; },
    get load() { return load; },
    live() { let n = 0; for (const name in pools) n += pools[name].live; return n; },
    // what is drawn now: draw calls (pools with any alive), particles, triangles
    stats() {
      let calls = 0, live = 0, tris = 0;
      for (const name in pools) { const p = pools[name]; if (p.live) { calls++; live += p.live; tris += p.live * triangles(name); } }
      return { calls, live, tris };
    },
  };
};
