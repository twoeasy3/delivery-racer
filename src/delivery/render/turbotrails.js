// TURBO TRAIL STYLES (CHECKLIST 442, part 2; the owner: "Let's experiment with a few turbo trail effects"). An EXPERIMENT behind the
// address only: `?turbotrail=<name>` (`<name>-lite` for its lite variant, `list` logs the names). No player-facing switch yet; with no
// address (or `classic`) the game draws the turbo as it always did (render/items.js, the cyan and white cubes in the Particles pool).
// Every style: geometry or points only (no texture), its own small fixed pool, one draw call (the twin ribbon's two strands are one
// mesh), hidden when nothing of it is alive; it comes from the car's TAIL at the car's own height (render/cars.js
// playerPointY: up in the air with a jumping car, CHECKLIST 429), it is carried by its PARENT's velocity on the PARENT GAME CLOCK
// (render/gameclock.js: paused nothing moves or comes, half as far at 0.5x), and it grows with the car's actual speed.
// TURBO-TRAILS.md: the looks, the counts, the cost, the open questions.
import * as THREE from 'three';
import { CAR } from '../cars.js';
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { CONFIG } from '../config.js';
import { scene } from './scene.js';
import { carMesh, playerPointY } from './cars.js';
import { parentVelocity } from './gameclock.js';
import { TURBO_COLOR } from './pickupModels.js';
import { RARITIES, rarityOf } from '../showroomData.js';

// name: what it looks like (POOLS: its particles, full / lite)
export const STYLES = {
  flame: 'a short jet of flame from two nozzles: white-hot at the pipe, orange, red, gone (cones)',
  twin: 'two cyan ribbons from the tail corners, flat on the air, bending with every lane change',
  speedlines: 'white streaks rushing back past the body, more and longer the faster it goes (lines)',
  afterimage: 'cyan silhouettes of the car itself left behind it, fading (its own geometry, merged once)',
  embers: 'sparks shed from the tail, falling and bouncing on the road (points)',
  shockwave: 'rings pulsing out of the tail and widening as they fall back (thin tori)',
  rarity: 'one wide ribbon in the colour of the car\'s card rarity (Common grey ... Legendary orange)',
};
export const STYLE_NAMES = Object.keys(STYLES);
const POOLS = { flame: [40, 20], twin: [28, 16], speedlines: [36, 16], afterimage: [4, 2], embers: [64, 28], shockwave: [5, 3], rarity: [30, 18] };

let style = 'classic', liteOn = false;
const read = () => { try { return new URLSearchParams(location.search).get('turbotrail'); } catch { return null; } };
export const turboTrailStyle = () => style;
export const turboTrailLite = () => liteOn;

// ---- a store of particles: x y z vx vy vz life maxLife a b, and an emission serial a slot (so a probe can tell one re-used) ----
const F = 10;
const makeStore = (max) => {
  const d = new Float32Array(max * F), serial = new Uint32Array(max);
  let next = 0, count = 0;
  const S = {
    max, d, serial,
    emit(x, y, z, vx, vy, vz, life, a = 0, b = 0) {
      const i = next, o = i * F; next = (next + 1) % max;
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz; d[o + 6] = life; d[o + 7] = life; d[o + 8] = a; d[o + 9] = b;
      serial[i] = ++count;
      return i;
    },
    // gravity g, floor (y below which it bounces: NaN none)
    update(dt, g = 0) {
      if (!(dt > 0)) return;
      for (let i = 0, o = 0; i < max; i++, o += F) {
        if (d[o + 6] <= 0) continue;
        d[o + 6] -= dt;
        if (g) d[o + 4] -= g * dt;
        d[o] += d[o + 3] * dt; d[o + 1] += d[o + 4] * dt; d[o + 2] += d[o + 5] * dt;
        if (g && d[o + 1] < d[o + 9]) { d[o + 1] = d[o + 9]; d[o + 4] = Math.abs(d[o + 4]) * 0.35; d[o + 3] *= 0.7; d[o + 5] *= 0.7; }
      }
    },
    live() { let n = 0; for (let i = 0; i < max; i++) if (d[i * F + 6] > 0) n++; return n; },
    age(i) { const o = i * F; return 1 - d[o + 6] / d[o + 7]; },
    alive(i) { return d[i * F + 6] > 0; },
    // the live slots oldest first (a ribbon's order)
    ordered(out) { out.length = 0; for (let k = 1; k <= max; k++) { const i = (next - 1 + k + max) % max; if (d[i * F + 6] > 0) out.push(i); } return out; },
    clear() { d.fill(0); next = 0; },
  };
  return S;
};

// ---- what a frame gives every style: the tail, the parent's velocity and its speed ----
const V = { x: 0, y: 0, z: 0 }, T = new THREE.Vector3(), Fw = new THREE.Vector3(), Ac = new THREE.Vector3(), P = new THREE.Vector3();
const frameInfo = () => {
  parentVelocity(Player, V, Player.s - Player.hl);
  Track.toWorld(Player.s - Player.hl, Player.lat, T);
  const roadY = T.y;
  T.y = playerPointY(roadY, Player.hl, 0.5);
  const h = Track.toWorld(Player.s, Player.lat, P);
  const sp = Math.hypot(V.x, V.z);
  if (sp > 0.5) Fw.set(V.x / sp, 0, V.z / sp); else Fw.set(Math.sin(h), 0, Math.cos(h));
  Track.toWorld(Player.s - Player.hl, Player.lat + 1, Ac); Ac.sub(P.set(T.x, roadY, T.z)).setY(0).normalize(); // (+lat across)
  return { roadY, k: Math.min(1.3, Math.max(0, Player.speed) / 35) };
};
// a point on the tail `across` m to the +lat side, at the tail's height
const tailAt = (across, out) => out.set(T.x + Ac.x * across, T.y, T.z + Ac.z * across);
const rnd = (r) => (Math.random() - 0.5) * 2 * r;
const additive = (opts = {}) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: false, ...opts });
const col = new THREE.Color(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), SC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), ZZ = new THREE.Vector3(0, 0, 1);
const order = [];

// ---- the styles: each { store(s), mesh, emit(dt, info), draw(), gravity } ----
const makeFlame = (max) => {
  const S = makeStore(max);
  const cone = new THREE.ConeGeometry(0.2, 1, 6, 1, true).translate(0, 0.5, 0); // (its base at the nozzle, the tip out along +y)
  const mesh = new THREE.InstancedMesh(cone, additive(), max);
  const hot = [new THREE.Color(0xffffff), new THREE.Color(0xffe27a), new THREE.Color(0xff8a1f), new THREE.Color(0xd8270c)];
  let acc = 0, nozzle = 0;
  return {
    stores: [S], mesh,
    emit(dt, { k }) {
      for (acc += dt * 90 * (0.5 + k); acc >= 1; acc--) {
        nozzle = 1 - nozzle;
        tailAt(nozzle ? 0.35 * Player.hw : -0.35 * Player.hw, P);
        S.emit(P.x + rnd(0.05), P.y + rnd(0.04), P.z + rnd(0.05), V.x * 0.8 - Fw.x * (2 + 5 * k), V.y * 0.8, V.z * 0.8 - Fw.z * (2 + 5 * k), 0.13 + 0.05 * k, 0.6 + 1.3 * k);
      }
    },
    draw() {
      let n = 0;
      Q.setFromUnitVectors(UP, SC.set(-Fw.x, 0, -Fw.z));
      for (let i = 0; i < S.max; i++) {
        if (!S.alive(i)) continue;
        const o = i * F, t = S.age(i), len = S.d[o + 8] * (1 - 0.6 * t), w = 1 - 0.5 * t;
        M4.compose(P.set(S.d[o], S.d[o + 1], S.d[o + 2]), Q, SC.set(w, len, w));
        mesh.setMatrixAt(n, M4);
        const c = t * 3, j = Math.min(2, Math.floor(c));
        col.copy(hot[j]).lerp(hot[j + 1], c - j).multiplyScalar(1 - t * t);
        mesh.setColorAt(n++, col);
      }
      mesh.count = n;
    },
  };
};

// a ribbon (one strand or two): nodes at the tail, carried at half the car's velocity; drawn flat, tapering, fading (additive)
const makeRibbon = (max, strands, width, colour) => {
  const stores = strands.map(() => makeStore(max));
  const verts = strands.length * (max + 1) * 2;
  const pos = new Float32Array(verts * 3), rgb = new Float32Array(verts * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
  const index = [];
  for (let s = 0; s < strands.length; s++) for (let i = 0; i < max; i++) { const a = (s * (max + 1) + i) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(index);
  const mesh = new THREE.Mesh(g, additive({ vertexColors: true, side: THREE.DoubleSide }));
  const c0 = new THREE.Color(), H = new THREE.Vector3(), Q1 = new THREE.Vector3(), Q2 = new THREE.Vector3();
  let acc = 0, k = 0;
  return {
    stores, mesh,
    emit(dt, info) {
      k = info.k;
      for (acc += dt * 60; acc >= 1; acc--) {
        strands.forEach((across, s) => { tailAt(across * Player.hw, P); stores[s].emit(P.x, P.y, P.z, V.x * 0.5, V.y * 0.5, V.z * 0.5, 0.45); });
      }
    },
    draw(live) {
      c0.setHex(typeof colour === 'function' ? colour() : colour);
      const w0 = width * (0.6 + 0.5 * k);
      stores.forEach((S, s) => {
        S.ordered(order);
        const base = s * (max + 1);
        // the nodes oldest first, then the head on the car's tail (while the turbo runs)
        const n = order.length + (live && order.length ? 1 : 0);
        for (let j = 0; j < n; j++) {
          const head = j === order.length;
          if (head) tailAt(strands[s] * Player.hw, H); else { const o = order[j] * F; H.set(S.d[o], S.d[o + 1], S.d[o + 2]); }
          const t = head ? 0 : S.age(order[j]);
          // across the strand, flat: the horizontal normal of its run here
          if (j > 0) Q1.set(S.d[order[j - 1] * F], 0, S.d[order[j - 1] * F + 2]); else Q1.set(H.x - Fw.x, 0, H.z - Fw.z);
          Q2.set(H.x - Q1.x, 0, H.z - Q1.z);
          if (Q2.lengthSq() < 1e-8) Q2.set(Fw.x, 0, Fw.z);
          Q2.normalize();
          const w = w0 * (1 - t) * 0.5, v = (base + j) * 2, f = (1 - t) * (1 - t);
          pos[v * 3] = H.x - Q2.z * w; pos[v * 3 + 1] = H.y; pos[v * 3 + 2] = H.z + Q2.x * w;
          pos[v * 3 + 3] = H.x + Q2.z * w; pos[v * 3 + 4] = H.y; pos[v * 3 + 5] = H.z - Q2.x * w;
          for (const u of [v, v + 1]) { rgb[u * 3] = c0.r * f; rgb[u * 3 + 1] = c0.g * f; rgb[u * 3 + 2] = c0.b * f; }
        }
        // the strand's unused slots: collapsed onto its last pair, black (nothing, added)
        const last = (base + Math.max(0, n - 1)) * 2 * 3;
        for (let j = Math.max(1, n); j <= max; j++) {
          const v = (base + j) * 2 * 3;
          for (let q = 0; q < 6; q++) { pos[v + q] = pos[last + (q % 3)]; rgb[v + q] = 0; }
        }
      });
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    },
  };
};

const makeSpeedlines = (max) => {
  const S = makeStore(max);
  const pos = new Float32Array(max * 6), rgb = new Float32Array(max * 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  let acc = 0, k = 0;
  return {
    stores: [S], mesh,
    emit(dt, info) {
      k = info.k;
      for (acc += dt * 80 * k; acc >= 1; acc--) {
        const side = Math.random() < 0.5 ? -1 : 1, off = side * (Player.hw + 0.25 + Math.random() * 0.8);
        Track.toWorld(Player.s - Player.hl + Math.random() * Player.hl * 2.2, Player.lat + off, P);
        const y = playerPointY(info.roadY, Player.hl, 0.2 + Math.random() * (Player.height || 1.4));
        S.emit(P.x, y, P.z, V.x * 0.15, V.y * 0.15, V.z * 0.15, 0.22 + 0.1 * Math.random(), 1.2 + 4 * k);
      }
    },
    draw() {
      let n = 0;
      for (let i = 0; i < S.max; i++) {
        if (!S.alive(i)) continue;
        const o = i * F, t = S.age(i), len = S.d[o + 8] * (1 - 0.5 * t), f = Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.1)) * 0.8, v = n * 6;
        pos[v] = S.d[o]; pos[v + 1] = S.d[o + 1]; pos[v + 2] = S.d[o + 2];
        pos[v + 3] = S.d[o] - Fw.x * len; pos[v + 4] = S.d[o + 1]; pos[v + 5] = S.d[o + 2] - Fw.z * len;
        rgb[v] = rgb[v + 1] = rgb[v + 2] = f; rgb[v + 3] = rgb[v + 4] = rgb[v + 5] = 0;
        n++;
      }
      g.setDrawRange(0, n * 2);
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    },
  };
};

// the car's own shape, merged once (positions only) for the afterimages: rebuilt when the car changes
const mergedCar = () => {
  carMesh.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(carMesh.matrixWorld).invert(), parts = [], m = new THREE.Matrix4(), v = new THREE.Vector3();
  let total = 0;
  carMesh.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes?.position || o.userData.blackout === 'hide') return;
    for (let p = o; p && p !== carMesh; p = p.parent) if (!p.visible) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (mat?.transparent && mat.opacity < 0.5) return;
    parts.push(o); total += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
  });
  const pos = new Float32Array(Math.min(total, 60000) * 3);
  let w = 0;
  for (const o of parts) {
    m.multiplyMatrices(inv, o.matrixWorld);
    const P0 = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P0.count;
    for (let j = 0; j < n && w < pos.length; j++) { v.fromBufferAttribute(P0, I ? I.getX(j) : j).applyMatrix4(m); pos[w++] = v.x; pos[w++] = v.y; pos[w++] = v.z; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, w), 3));
  return g;
};
const makeAfterimage = (max) => {
  const S = makeStore(max), snaps = new Float32Array(max * 16);
  const mesh = new THREE.InstancedMesh(new THREE.BufferGeometry(), additive({ side: THREE.DoubleSide }), max);
  let acc = 0, builtFor = null;
  const base = new THREE.Color(TURBO_COLOR);
  return {
    stores: [S], mesh,
    emit(dt) {
      const id = CAR.id + ':' + carMesh.children.length;
      if (builtFor !== id) { mesh.geometry.dispose(); mesh.geometry = mergedCar(); builtFor = id; }
      for (acc += dt / 0.06; acc >= 1; acc--) {
        carMesh.updateMatrixWorld(true);
        const i = S.emit(carMesh.position.x, carMesh.position.y, carMesh.position.z, V.x * 0.6, V.y * 0.6, V.z * 0.6, 0.24);
        carMesh.matrixWorld.toArray(snaps, i * 16);
      }
    },
    draw() {
      let n = 0;
      for (let i = 0; i < S.max; i++) {
        if (!S.alive(i)) continue;
        const o = i * F, t = S.age(i);
        M4.fromArray(snaps, i * 16);
        M4.elements[12] = S.d[o]; M4.elements[13] = S.d[o + 1]; M4.elements[14] = S.d[o + 2];
        mesh.setMatrixAt(n, M4);
        mesh.setColorAt(n++, col.copy(base).multiplyScalar(0.55 * (1 - t)));
      }
      mesh.count = n;
    },
  };
};

const makeEmbers = (max) => {
  const S = makeStore(max);
  const pos = new Float32Array(max * 3), rgb = new Float32Array(max * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3).setUsage(THREE.DynamicDrawUsage));
  const mesh = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const a = new THREE.Color(0xfff2a8), b = new THREE.Color(0xff6a10), c = new THREE.Color(0x9a1500);
  let acc = 0;
  return {
    stores: [S], mesh, gravity: 9,
    emit(dt, { k, roadY }) {
      for (acc += dt * 70 * (0.4 + k); acc >= 1; acc--) {
        tailAt(rnd(Player.hw * 0.6), P);
        S.emit(P.x, P.y, P.z, V.x * 0.6 + rnd(2.2), V.y * 0.6 + 1 + Math.random() * 2.5, V.z * 0.6 + rnd(2.2), 0.45 + Math.random() * 0.35, 0, roadY + 0.03);
      }
    },
    draw() {
      let n = 0;
      for (let i = 0; i < S.max; i++) {
        if (!S.alive(i)) continue;
        const o = i * F, t = S.age(i);
        pos[n * 3] = S.d[o]; pos[n * 3 + 1] = S.d[o + 1]; pos[n * 3 + 2] = S.d[o + 2];
        if (t < 0.4) col.copy(a).lerp(b, t / 0.4); else col.copy(b).lerp(c, (t - 0.4) / 0.6);
        col.multiplyScalar(1 - t * t);
        rgb[n * 3] = col.r; rgb[n * 3 + 1] = col.g; rgb[n * 3 + 2] = col.b;
        n++;
      }
      g.setDrawRange(0, n);
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    },
  };
};

const makeShockwave = (max) => {
  const S = makeStore(max);
  const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.045, 3, 28), additive({ side: THREE.DoubleSide }), max);
  const base = new THREE.Color(TURBO_COLOR);
  let acc = 0.99;
  return {
    stores: [S], mesh,
    emit(dt, { k }) {
      for (acc += dt / (0.32 / (0.6 + k)); acc >= 1; acc--) { tailAt(0, P); S.emit(P.x, P.y, P.z, V.x * 0.35, V.y * 0.35, V.z * 0.35, 0.42, 0.35 + 0.3 * k, 1.2 + 1.4 * k); }
    },
    draw() {
      let n = 0;
      Q.setFromUnitVectors(ZZ, SC.set(Fw.x, 0, Fw.z));
      for (let i = 0; i < S.max; i++) {
        if (!S.alive(i)) continue;
        const o = i * F, t = S.age(i), r = S.d[o + 8] + S.d[o + 9] * Math.sqrt(t);
        M4.compose(P.set(S.d[o], S.d[o + 1], S.d[o + 2]), Q, SC.set(r, r * 0.8, r));
        mesh.setMatrixAt(n, M4);
        mesh.setColorAt(n++, col.copy(base).lerp(new THREE.Color(0xffffff), 0.4 * (1 - t)).multiplyScalar((1 - t) * 0.9));
      }
      mesh.count = n;
    },
  };
};

const rarityColour = () => { try { return parseInt((RARITIES[rarityOf(CAR)] || RARITIES.common).colour.slice(1), 16); } catch { return TURBO_COLOR; } };
const MAKERS = {
  flame: (n) => makeFlame(n),
  twin: (n) => makeRibbon(n, liteOn ? [0] : [-0.7, 0.7], 0.26, TURBO_COLOR), // (lite: one strand down the middle)
  speedlines: (n) => makeSpeedlines(n),
  afterimage: (n) => makeAfterimage(n),
  embers: (n) => makeEmbers(n),
  shockwave: (n) => makeShockwave(n),
  rarity: (n) => makeRibbon(n, [0], 0.5, rarityColour),
};

let fx = null;
export const setTurboTrail = (name) => {
  if (fx) { scene.remove(fx.mesh); fx.mesh.geometry.dispose(); fx.mesh.material.dispose(); fx = null; }
  liteOn = /-lite$/.test(name || '');
  const id = (name || 'classic').replace(/-lite$/, '');
  style = STYLES[id] ? id : 'classic';
  if (style === 'classic') return style;
  fx = MAKERS[style](POOLS[style][liteOn ? 1 : 0]);
  fx.mesh.frustumCulled = false;
  fx.mesh.visible = false;
  fx.mesh.renderOrder = 2;
  scene.add(fx.mesh);
  return style;
};
{
  const asked = read();
  if (asked === 'list') console.log('?turbotrail=<name> (or <name>-lite): classic (the default), ' + STYLE_NAMES.join(', '));
  else if (asked) setTurboTrail(asked);
}
Game.onLoad.push(() => { if (fx) for (const S of fx.stores) S.clear(); });

// how many of the style's particles (ribbon nodes, cones, rings...) are alive
export const liveCount = () => (fx ? fx.stores.reduce((n, S) => n + S.live(), 0) : 0);
export const pools = () => ({});
export const drawn = () => !!fx?.mesh.visible;
// (for a check: the heights of the newest few emitted, the head of the trail)
export const headHeights = () => { const ys = []; if (fx) for (const S of fx.stores) { S.ordered(order); ys.push(...order.slice(-3).map(i => S.d[i * F + 1])); } return ys; };
// (for a check: everything the style draws from, as one string; the same paused)
export const state = () => (fx ? fx.stores.map(S => Array.from(S.d).join(',')).join('|') + '|' + (fx.mesh.geometry.attributes.position?.array.slice(0, 3000).join(',') || '') : '');
// (for a check: the median distance a live particle moved while `run` ran)
export const advanceProbe = (run) => {
  const before = fx.stores.map(S => ({ d: Float32Array.from(S.d), serial: Uint32Array.from(S.serial) }));
  run();
  const moved = [];
  fx.stores.forEach((S, s) => { for (let i = 0; i < S.max; i++) { const o = i * F; if (S.alive(i) && before[s].d[o + 6] > 0 && before[s].serial[i] === S.serial[i]) moved.push(Math.hypot(S.d[o] - before[s].d[o], S.d[o + 1] - before[s].d[o + 1], S.d[o + 2] - before[s].d[o + 2])); } });
  moved.sort((a, b) => a - b);
  return moved.length ? moved[moved.length >> 1] : NaN;
};

// main.js's frame, after the car is placed: dt is the GAME time of the frame (render/gameclock.js)
export const syncTurboTrail = (dt, on = Player.active && Player.turbo > 0 && (Player.turbo > CONFIG.powerUpWarning || Math.floor(Player.turbo * 8) % 2 === 0) && !Game.screensaver) => {
  if (!fx) return;
  const any = on || liveCount() > 0;
  if (!any) { fx.mesh.visible = false; return; }
  const info = frameInfo();
  fx.stores.forEach(S => S.update(dt, fx.gravity || 0));
  if (on && dt > 0) fx.emit(dt, info);
  fx.draw(on);
  fx.mesh.visible = on || liveCount() > 0;
};
