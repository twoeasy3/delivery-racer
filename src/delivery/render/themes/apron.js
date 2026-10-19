// ---- THE AIRPORT APRON: the road is a service road across a busy apron on a clear day (not the 'airport' theme's perimeter
// road and its disaster: nothing burns, nothing flies). On the right, the contact stands: airliners parked nose-in to the
// terminal's glass, a jet bridge to each one's door, the baggage being loaded (belt loaders, tractors and their trains of
// covered carts, a fuel bowser under a wing, a pushback tug at a nose, cones at the wingtips); in the middle of the level a
// cargo apron in place of the terminal (a shed, freighters, trains of containers). On the left, the taxiway (its yellow
// centre line, double edge lines, blue edge markers), the remote stands beyond it (each aircraft with its stair trucks and
// an apron bus), hangars beyond those and the control tower. Floodlight masts both sides, parked trains of carts along
// the road's edges in painted bays, the red equipment line, the stands' yellow lead-in lines and stop bars. No figures,
// no text, no lights (the beacons only glow).
// COST: every model is a template (apronModels.js) baked into ONE merged mesh of vertex colours per 900 m of road (and one
// for what glows), so what is out of sight is not drawn and a stretch of apron is one or two draw calls; the ground (concrete
// and the taxiway's asphalt) one mesh with one 64 x 64 canvas texture of slab joints, the paint one mesh. Seeded from the
// level's id: laid out the same every time. Drawn only: nothing here is read by the rules.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import * as M from './apronModels.js';
import { everyFrame } from './sceneryClock.js';
import { buildStrip } from '../road.js';

const TERMINAL = 84;          // m off the right-hand pavement: the terminal's glass
const RED_LINE = 12.5;        // ...the red equipment restraint line (nothing parks beyond it toward a stand's tail)
const TAIL_R = 14;            // ...where a contact stand's aircraft's tail reaches
const TAXI = [26, 60, 43];    // m off the left-hand pavement: the taxiway's asphalt, from and to, and its centre line
const TAIL_L = 66;            // ...where a remote stand's aircraft's tail reaches
const HANGARS = 175;          // ...the hangars' middles
const CHUNK = 300;            // m of road a merged mesh holds (out of sight, behind or beyond the camera's 700 m, a whole mesh is skipped)
const DETAIL = 200, SEEN = 180; // m of road a mesh of small things holds, and how near the camera it is drawn
const LIVERIES = [0x1f4f99, 0xc8392e, 0x16807a, 0xe07a1f, 0x3b7a3a, 0x5a3f8f, 0x2a2d33, 0x2f8fd0, 0xd9a520];
const CARGO = [0x8a5a2a, 0x3d4a5a, 0xb0302a];
const PAINT = [0xf2c21d, 0xe2b93b, 0xd8d0b8];
// the record of the last level built, for the checks and stills: meshes, points, triangles, how many things of each kind
export const APRON_BUILT = { meshes: 0, verts: 0, tris: 0, counts: {} };

// ---- a growable store of points, normals (bytes), colours (bytes) and indices: one merged mesh's worth ----
const grow = (a, n) => { if (n <= a.length) return a; const b = new a.constructor(Math.max(n, a.length * 2)); b.set(a); return b; };
const store = () => ({ pos: new Float32Array(3 * 8192), col: new Uint8Array(3 * 8192), idx: new Uint32Array(3 * 8192), nv: 0, ni: 0 });
// a template's glowing and plain parts apart, made once a template
const halves = new WeakMap();
const split = (t) => {
  if (halves.has(t)) return halves.get(t);
  const out = {};
  for (const glow of [false, true]) {
    const keep = t.names.map(n => n.startsWith('!') === glow), map = new Int32Array(t.verts).fill(-1), pos = [], key = [], index = [];
    for (let i = 0; i < t.index.length; i += 3) {
      if (!keep[t.key[t.index[i]]]) continue;
      for (let j = 0; j < 3; j++) {
        const v = t.index[i + j];
        if (map[v] < 0) { map[v] = key.length; key.push(t.key[v]); pos.push(t.pos[v * 3], t.pos[v * 3 + 1], t.pos[v * 3 + 2]); }
        index.push(map[v]);
      }
    }
    out[glow ? 'glow' : 'lit'] = key.length ? { pos: new Float32Array(pos), key: new Uint8Array(key), index: new Uint32Array(index), names: t.names, verts: key.length } : null;
  }
  halves.set(t, out);
  return out;
};
const v3 = new THREE.Vector3();
// a template into a store, through a matrix, in a palette (by part name; COLOURS for the rest)
const bakeInto = (S, t, m, palette) => {
  const colours = t.names.map(name => M.colourBytes(palette?.[name] ?? M.COLOURS[name] ?? 0x888888));
  const base = S.nv;
  S.pos = grow(S.pos, (S.nv + t.verts) * 3); S.col = grow(S.col, (S.nv + t.verts) * 3); S.idx = grow(S.idx, S.ni + t.index.length);
  for (let i = 0; i < t.verts; i++) {
    const o = (base + i) * 3;
    v3.fromArray(t.pos, i * 3).applyMatrix4(m);
    S.pos[o] = v3.x; S.pos[o + 1] = v3.y; S.pos[o + 2] = v3.z;
    const c = colours[t.key[i]];
    S.col[o] = c[0]; S.col[o + 1] = c[1]; S.col[o + 2] = c[2];
  }
  for (let j = 0; j < t.index.length; j++) S.idx[S.ni + j] = t.index[j] + base;
  S.nv += t.verts; S.ni += t.index.length;
};
const meshOf = (S, material) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(S.pos.slice(0, S.nv * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(S.col.slice(0, S.nv * 3), 3, true));
  g.setIndex(new THREE.BufferAttribute(S.nv < 65536 ? new Uint16Array(S.idx.subarray(0, S.ni)) : S.idx.slice(0, S.ni), 1));
  g.computeBoundingSphere();
  return new THREE.Mesh(g, material);
};

// the concrete's slab joints: a 64 x 64 canvas (16 KB), one slab of 7.5 m, a darker joint along two of its edges
let slabMap = null;
const slabTexture = () => {
  if (slabMap || typeof document === 'undefined' || !document.createElement) return slabMap;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rnd() * 0.04})`; g.fillRect(rnd() * 64, rnd() * 64, 1 + rnd() * 3, 1 + rnd() * 3); }
  g.fillStyle = 'rgba(60,60,60,0.35)'; g.fillRect(0, 0, 64, 1.5); g.fillRect(0, 0, 1.5, 64);
  slabMap = new THREE.CanvasTexture(c);
  slabMap.wrapS = slabMap.wrapT = THREE.RepeatWrapping;
  slabMap.colorSpace = THREE.SRGBColorSpace;
  slabMap.userData.shared = true; // (made once, kept between levels)
  return slabMap;
};
export const APRON_TEXTURE_BYTES = 64 * 64 * 4;

export const apron = ({ add, sideStrip, beside, inJunction, offRoads, levelGroup }) => {
  let seed = 3;
  for (const ch of (LEVEL.id || 'apron') + ':apron') seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const START = Track.start, END = Track.end, LENGTH = END - START;
  const p = {}, q = {};
  const counts = {};
  const count = (what) => { counts[what] = (counts[what] || 0) + 1; };

  // ---- where nothing of ours stands: what the level has across or beside the road, the start, the drop ----
  const within = (list, s, pad, a = 'from', b = 'to') => (list || []).some(x => !x.road && x[a] !== undefined && s >= x[a] - pad && s <= x[b] + pad);
  const covered = (s, pad = 0) => within(LEVEL.tunnels, s, pad) || within(LEVEL.bridges, s, pad);
  const busy = (s, pad = 0) => covered(s, pad) || inJunction(s) || within(LEVEL.crossings, s, pad + 16, 's', 's') || within(LEVEL.drawbridges, s, pad + 24, 's', 's') ||
    within(LEVEL.machinery, s, pad + 12, 's', 's') || within(LEVEL.lowBridges, s, pad + 10, 's', 's');
  const targetNear = (s, side, pad) => (LEVEL.targets || []).some(t => !t.road && (t.side === 'left' ? -1 : 1) === side && Math.abs(t.s - s) < pad);
  const roadside = (s, side, pad = 0) => !busy(s, pad) && !targetNear(s, side, pad + 14) && s > START + 30 + pad && s < END - 60 - pad; // (near the road: clear of the start and the drop)

  // ---- the merged meshes, a store each per CHUNK m of road, plain and glowing ----
  const chunks = new Map();
  const chunkAt = (s) => { const k = Math.max(0, Math.floor((s - START) / CHUNK)); if (!chunks.has(k)) chunks.set(k, { lit: store(), glow: store() }); return chunks.get(k); };
  // (detail: the small things, ground equipment and cones, in meshes of their own a DETAIL m, drawn only within SEEN m of the camera)
  const details = new Map();
  const detailAt = (s) => { const k = Math.floor((s - START) / DETAIL); if (!details.has(k)) details.set(k, { lit: store(), glow: store() }); return details.get(k); };
  const bake = (t, m, s, palette, detail = false) => { const parts = split(t), C = detail ? detailAt(s) : chunkAt(s); if (parts.lit) bakeInto(C.lit, parts.lit, m, palette); if (parts.glow) bakeInto(C.glow, parts.glow, m, palette); };
  // the matrix of a thing at (s, lat), y up, turned `turn` from the road's heading (0: along the road; -PI/2: facing out to the
  // right, PI/2 out to the left), scaled
  const at = (s, lat, y = 0, turn = 0, sx = 1, sy = 1, sz = 1) => { const h = Track.toWorld(s, lat, p); return M.mat4(p.x, p.y + y, p.z, 0, h + turn, 0, sx, sy, sz); };
  const out = (side) => -side * Math.PI / 2;
  // a model in another's frame: (x, z) in that one's metres, turned `turn` more
  const inFrame = (frame, x, z, turn = 0, y = 0) => frame.clone().multiply(M.mat4(x, y, z, 0, turn, 0));
  const clearAt = (m, margin) => { v3.setFromMatrixPosition(m); return offRoads(v3.x, v3.z, margin); };
  // a box (or tube) standing at (s, lat): w across, h high (its foot y0 up), l along, a colour
  const block = (s, lat, y0, w, h, l, colour, turn = 0, tube = false) => bake(tube ? M.unitTube() : M.unitBox(), at(s, lat, y0 + h / 2, turn, w, h, l), s, { c: colour });
  // a box from one point to another (each [s, lat, y]): w across, h high: a jet bridge's tunnel, a stair
  const beam = (a, b, w, h, colour, s) => {
    Track.toWorld(a[0], a[1], p); Track.toWorld(b[0], b[1], q);
    const dx = q.x - p.x, dz = q.z - p.z, dy = (q.y + b[2]) - (p.y + a[2]), run = Math.hypot(dx, dz);
    bake(M.unitBox(), M.mat4((p.x + q.x) / 2, (p.y + a[2] + q.y + b[2]) / 2, (p.z + q.z) / 2, -Math.atan2(dy, run), Math.atan2(dx, dz), 0, w, h, Math.hypot(run, dy), 'YXZ'), s, { c: colour });
  };

  // ---- the paint: one mesh of coloured quads lying on the concrete (yellow lead-in and taxiway lines, the red line, white bays) ----
  const paint = { pos: [], col: [], idx: [] };
  // a painted line along points [[s, lat], ...], w wide
  const line = (points, w, colour) => {
    const c = M.colourBytes(colour), world = points.map(([s, lat]) => { Track.toWorld(s, lat, p); return [p.x, p.y + 0.025, p.z]; });
    for (let i = 0; i < world.length; i++) {
      const a = world[Math.max(0, i - 1)], b = world[Math.min(world.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], n = Math.hypot(dx, dz) || 1;
      const ox = -dz / n * w / 2, oz = dx / n * w / 2, base = paint.pos.length / 3;
      paint.pos.push(world[i][0] + ox, world[i][1], world[i][2] + oz, world[i][0] - ox, world[i][1], world[i][2] - oz);
      paint.col.push(...c, ...c);
      if (i) paint.idx.push(base - 2, base - 1, base, base - 1, base + 1, base);
    }
  };
  // a line along the road d m off its edge, from a to b (a point every 8 m: on the level's gentlest bends that is 2 cm off the curve)
  const along = (side, a, b, d, w, colour) => { const pts = []; for (let s = a; s < b; s += 8) pts.push([s, beside(side, s, d)]); pts.push([b, beside(side, b, d)]); line(pts, w, colour); };
  // a line across, out from the road at s, from d0 to d1 off its edge
  const across = (side, s, d0, d1, w, colour) => line([[s, beside(side, s, d0)], [s, beside(side, s, d1)]], w, colour);
  // a bay's outline (white), d0 to d1 off the edge, s0 to s1 along
  const bay = (side, s0, s1, d0, d1) => { along(side, s0, s1, d0, 0.15, 0xe8e8e4); along(side, s0, s1, d1, 0.15, 0xe8e8e4); across(side, s0, d0, d1, 0.15, 0xe8e8e4); across(side, s1, d0, d1, 0.15, 0xe8e8e4); };

  // ---- the ground: concrete both sides (and the taxiway's asphalt on the left), one mesh, the slab joints in world squares ----
  const ground = [];
  const surface = (side, d0, d1, colour) => {
    // (sideStrip keeps clear of any other road, in rows 2 m apart; with none, a plain strip in rows 8 m apart does)
    const g = (Track.exits.length || Track.junctions.length ? sideStrip : buildStrip)(START, END, (s) => beside(side, s, d0), (s) => beside(side, s, d1), 0, 8);
    const n = g.attributes.position.count, uv = new Float32Array(n * 2), col = new Float32Array(n * 3), c = new THREE.Color(colour);
    for (let i = 0; i < n; i++) { uv[i * 2] = g.attributes.position.getX(i) / 7.5; uv[i * 2 + 1] = g.attributes.position.getZ(i) / 7.5; col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    ground.push(g);
  };
  surface(1, 0, TERMINAL + 40, 0xb3b4b0);
  surface(-1, 0, TAXI[0], 0xb3b4b0);
  surface(-1, TAXI[0], TAXI[1], 0x6c6f72);
  surface(-1, TAXI[1], TAIL_L + 95, 0xadafab);
  surface(-1, TAIL_L + 95, HANGARS + 50, 0xa4a6a2); // (the hangars' own apron, a shade darker)

  // ---- the zones along the right: the terminal, the cargo apron in the middle, the terminal again ----
  const cargoFrom = START + LENGTH * 0.42, cargoTo = START + LENGTH * 0.6;
  const inCargo = (s) => s > cargoFrom && s < cargoTo;
  const towerAt = START + LENGTH * 0.52;

  // ---- an aircraft on a stand and what attends it. side: which side of the road; d: m off the edge its tail reaches; wide:
  // a twin-aisle (the same airliner half as big again); freighter: no windows, no bridge
  const SPAN = M.AIRLINER.span;
  const stand = (s, side, d, wide, freighter, remote) => {
    const k = wide ? 1.55 : 1, lat = beside(side, s, d - M.AIRLINER.tail * k), frame = at(s, lat, 0, out(side));
    if (!clearAt(frame, 26 * k)) return false;
    const livery = freighter ? pick(CARGO) : pick(LIVERIES);
    bake(M.airliner(), M.mat4().multiplyMatrices(frame, M.mat4(0, 0, 0, 0, 0, 0, k, k, k)), s, { tail: livery, cheat: freighter ? livery : rand() < 0.5 ? livery : 0xc9ced3, engine: rand() < 0.5 ? livery : M.COLOURS.engine, window: freighter ? M.COLOURS.white : M.COLOURS.window });
    count(wide ? 'wide-body' : 'airliner');
    const nose = d + (M.AIRLINER.nose - M.AIRLINER.tail) * k; // (m off the edge, the nose's tip)
    // the lead-in line and its stop bar (in under the fuselage), from the taxiway's centre on a remote stand
    if (remote) { const R = d - TAXI[2], pts = []; for (let f = 0; f <= 1.0001; f += 1 / 12) pts.push([s - R + R * Math.sin(f * Math.PI / 2), beside(side, s, TAXI[2] + R - R * Math.cos(f * Math.PI / 2))]); line(pts, 0.25, PAINT[0]); }
    line([[s, beside(side, s, remote ? d : 4)], [s, beside(side, s, nose + 1.5)]], 0.25, PAINT[0]);
    line([[s - 2.2, beside(side, s, nose - 0.5)], [s + 2.2, beside(side, s, nose - 0.5)]], 0.5, PAINT[0]);
    // what attends it (in its own frame: x across it (+x its left), z nose-ward, metres; the fuselage's skin 2 m out at scale 1)
    const F = (x, z, turn = 0) => inFrame(frame, x, z, turn);
    const skin = 2.0 * k, belt = rand();
    if (belt < 0.6) { bake(M.beltLoader(), F(-(skin + 3.9), -6.5 * k, Math.PI / 2), s, { body: pick([0xf2c21d, 0xe8eaeb, 0x2f5f8a]) }, true); count('belt loader'); }
    if (belt < 0.2) { bake(M.beltLoader(), F(-(skin + 3.9), 7.5 * k, Math.PI / 2), s, { body: 0xf2c21d }, true); count('belt loader'); }
    if (rand() < 0.6) { // a train of carts (or containers, beside a wide-body) along the fuselage, its tractor nose-ward
      const uld = wide || freighter, n = 2 + Math.floor(rand() * 2), x = -(skin + 7.5), paint = { body: pick([0xf2c21d, 0xe2702a, 0xe8eaeb]) };
      bake(M.tractor(), F(x, -2 * k + 1.5), s, paint, true);
      for (let j = 0; j < n; j++) bake(uld ? M.uldDolly() : M.dolly(), F(x, -2 * k - 1.6 - j * (uld ? 2.6 : 3.8) - (uld ? 0.4 : 0.6)), s, { roof: pick([0x3d6a9a, 0x4a5058, 0x2f6a4a]), curtain: pick([0x3d6a9a, 0x7a2e2e, 0x4a5058]) }, true);
      count('train');
    }
    if (rand() < 0.3) { bake(M.bowser(), F(skin + 9.5 * k, 2.5 * k), s, undefined, true); count('fuel bowser'); }
    if (rand() < (remote ? 0.15 : 0.45)) { bake(M.pushback(), F(0, (M.AIRLINER.nose + 4) * k, Math.PI), s, { body: pick([0xf2c21d, 0xe8eaeb]) }, true); count('pushback'); }
    if (remote && !wide) { // stair trucks at the front and back doors, an apron bus by the front ones
      bake(M.stairTruck(), F(skin + 3.35, 12.0, -Math.PI / 2), s, { body: 0xe8eaeb, cab: 0xf0f0ee }, true); count('stair truck');
      if (rand() < 0.4) { bake(M.stairTruck(), F(skin + 3.35, -11.5, -Math.PI / 2), s, { body: 0xe8eaeb }, true); count('stair truck'); }
      if (rand() < 0.75) { bake(M.apronBus(), F(skin + 12, 9, rand() < 0.5 ? 0 : Math.PI), s, undefined, true); count('apron bus'); }
    }
    for (const [x, z] of [[SPAN * k + 0.8, -5.5 * k], [-SPAN * k - 0.8, -5.5 * k], [0, (M.AIRLINER.nose + 1.5) * k], [5.7 * k, 6.5 * k], [-5.7 * k, 6.5 * k]]) if (rand() < 0.4) bake(M.apronCone(), F(x, z), s, undefined, true);
    return true;
  };

  // ---- the contact stands along the right: one aircraft after another, their wingtips 10 m apart ----
  const contact = []; // [s, nose d, wide]: for the jet bridges (the door's d from the tail's)
  for (let edge = START + 28; edge < END - 60;) { // (edge: where the last one's wingtip was, and its gap)
    const freighter = inCargo(edge + 20), wide = freighter ? rand() < 0.8 : rand() < 0.28, k = wide ? 1.55 : 1, half = SPAN * k, s = edge + half;
    if (busy(s, half + 4) || s > END - 30) { edge += 20; continue; }
    if (stand(s, 1, TAIL_R, wide, freighter, false) && !freighter) contact.push([s, TAIL_R + (M.AIRLINER.nose - M.AIRLINER.tail) * k, wide]);
    edge = s + half + 10 + rand() * 6;
  }
  // ---- the red equipment line, and floodlight masts every 105 m each side ----
  along(1, START + 10, END - 10, RED_LINE, 0.3, 0xc8392e);
  const masts = []; // (the right-hand ones stand in the parking bays' row: the bays keep clear of them)
  for (let s = START + 60; s < END - 40; s += 105) {
    for (const side of [-1, 1]) {
      const sm = s + (side > 0 ? 0 : 52), d = side > 0 ? 7.5 : 15;
      if (busy(sm, 6) || targetNear(sm, side, 10)) continue;
      const m = at(sm, beside(side, sm, d), 0, out(side));
      if (clearAt(m, 3)) { bake(M.mast(), m, sm); count('mast'); if (side > 0) masts.push(sm); }
    }
  }

  // ---- the terminal: long, low, glass all along its front under a deep roof, in pieces that follow the road; a jet bridge to
  // each contact stand's front door. In the middle, the cargo apron's shed instead: grey cladding, a blue band, roller doors
  const PIECE = 24;
  for (let s = START; s < END; s += PIECE) {
    const mid = s + PIECE / 2, cargo = inCargo(mid), back = cargo ? 34 : 30, hi = cargo ? 15 : 16;
    if (covered(mid, 20)) continue;
    const lat = beside(1, mid, TERMINAL + back / 2), mz = at(mid, lat, 0);
    if (!clearAt(mz, back / 2 + 4)) continue;
    if (cargo) {
      block(mid, lat, 0, back, hi, PIECE + 0.05, 0x9aa3ab);
      block(mid, beside(1, mid, TERMINAL + 0.2), 11.5, 0.5, 1.6, PIECE + 0.05, 0x2f5f8a);
      block(mid, beside(1, mid, TERMINAL - 0.1), 0, 0.3, 7.5, PIECE - 3.5, 0x6d767f);
      block(mid, lat, hi, back + 1, 0.6, PIECE + 0.05, 0x5d646c);
    } else {
      block(mid, beside(1, mid, TERMINAL + 2 + (back - 2) / 2), 0, back - 2, hi - 0.5, PIECE + 0.05, 0xd9dcdd);
      block(mid, beside(1, mid, TERMINAL + 1), 0, 2, hi - 1.5, PIECE + 0.05, 0x6d93ab);                     // the glass
      for (let j = 0; j < 4; j++) block(s + j * 6 + 3, beside(1, s + j * 6 + 3, TERMINAL - 0.08), 0, 0.2, hi - 1.5, 0.2, 0xe4e6e7); // its mullions
      block(mid, beside(1, mid, TERMINAL + back / 2 - 3), hi - 0.4, back + 8, 0.8, PIECE + 0.05, 0x8f969c);  // the roof, out over the glass
      block(mid, beside(1, mid, TERMINAL - 7), hi - 0.9, 0.3, 1.4, PIECE + 0.05, mid > cargoTo ? 0x8a3a35 : 0x2f5f8a); // its fascia
      if (Math.floor((s - START) / PIECE) % 4 === 2) block(mid, beside(1, mid, TERMINAL + 18), hi + 0.4, 8, 2.4, 6, 0xb5bcc2); // plant on the roof
    }
    count(cargo ? 'shed' : 'terminal');
  }
  for (const [s, , wide] of contact) { // a jet bridge: a rotunda by the glass, a tunnel on a wheeled leg to a cab at the front door
    const k = wide ? 1.55 : 1, skin = 2.0 * k, cab = s - skin - 2.0, dDoor = TAIL_R + (12.5 - M.AIRLINER.tail) * k, y = wide ? 4.6 : 3.1, rs = s - 12, rd = TERMINAL - 3.5;
    if (!clearAt(at(rs, beside(1, rs, rd)), 4)) continue;
    block(rs, beside(1, rs, rd), 0, 1.2, y, 1.2, 0xa9aeb3, 0, true);
    block(rs, beside(1, rs, rd), y, 4.6, 3.0, 4.6, 0xb9bec2, 0, true);
    const a = [rs, beside(1, rs, rd - 1.6)], b = [cab - 0.6, beside(1, cab - 0.6, dDoor + 1.2)];
    beam([...a, y + 1.5], [...b, y + 1.4], 2.6, 2.7, 0xc2c6ca, s);
    beam([...a, y + 1.25], [...b, y + 1.15], 2.66, 0.5, 0x5c646c, s);                                   // (its band of windows)
    block(cab, beside(1, cab, dDoor), y, 3.2, 3.0, 3.6, 0xb9bec2);                                      // the cab
    block(s - skin - 0.05, beside(1, s, dDoor), y + 0.2, 2.4, 2.5, 0.3, 0x2c2f34);                     // its canopy against the skin
    block(cab - 3, beside(1, cab - 3, dDoor + 4), 0, 0.5, y, 0.5, 0x8e959c);                            // the leg
    block(cab - 3, beside(1, cab - 3, dDoor + 4), 0, 2.4, 0.9, 1.0, 0x2c2f34);                          // its wheels
    count('jet bridge');
  }

  // ---- the left: the taxiway's lines and edge markers, the remote stands beyond it ----
  along(-1, START, END, TAXI[2], 0.35, PAINT[0]);
  for (const d of [TAXI[0] + 0.9, TAXI[0] + 1.35, TAXI[1] - 1.35, TAXI[1] - 0.9]) along(-1, START, END, d, 0.15, PAINT[1]);
  for (let s = START + 20; s < END; s += 60) for (const d of [TAXI[0] - 0.6, TAXI[1] + 0.6]) block(s, beside(-1, s, d), 0, 0.3, 0.45, 0.3, 0x3a6cff, 0, true);
  for (let edge = START + 50; edge < END - 60;) {
    const wide = rand() < 0.22, k = wide ? 1.55 : 1, half = SPAN * k, s = edge + half;
    if (busy(s, half + 4) || Math.abs(s - towerAt) < 20 || s > END - 30) { edge += 25; continue; }
    stand(s, -1, TAIL_L, wide, false, true);
    edge = s + half + 14 + rand() * 20;
  }
  // ---- beyond them: hangars facing the apron, and the control tower ----
  for (let s = START + 60; s < END + 40; s += 92 + rand() * 30) {
    if (Math.abs(s - towerAt) < 70) continue;
    const m = at(s, beside(-1, s, HANGARS), 0, out(1));
    if (!clearAt(m, 50)) continue;
    bake(M.hangar(), m, s, { stripe2: pick([0x2f5f8a, 0xc8392e, 0x3b7a3a, 0x2a2d33]), door: pick([0xb5bcc2, 0xc9cdd0]), wall: pick([0xc8cdd1, 0xd6d2c8]) });
    count('hangar');
  }
  { const m = at(towerAt, beside(-1, towerAt, HANGARS - 10), 0, out(1)); if (clearAt(m, 12)) { bake(M.controlTower(), m, towerAt); count('tower'); } }

  // ---- along the road's edges, both sides: trains of carts, containers, a bus or a tractor parked in their painted bays ----
  for (let s = START + 50; s < END - 60; s += 38 + rand() * 40) {
    const side = rand() < 0.5 ? -1 : 1, len = 9 + Math.floor(rand() * 3) * 4;
    if (!roadside(s, side, len / 2) || !roadside(s + len, side, 0) || (side > 0 && masts.some(x => x > s - 4 && x < s + len + 4))) continue;
    if (!clearAt(at(s + len / 2, beside(side, s + len / 2, 7)), 6)) continue;
    bay(side, s - 1, s + len + 1, 3, 11);
    const r = rand(), lane = (d) => beside(side, s, d), dir = side > 0 ? 0 : Math.PI; // (nose the way the traffic goes that side)
    const nose = side > 0 ? s + len : s, step = side > 0 ? -1 : 1;
    if (r < 0.55) {
      const uld = rand() < 0.35, n = Math.min(4, Math.floor((len - 3) / (uld ? 2.6 : 3.8)));
      bake(M.tractor(), at(nose + step * 1.4, lane(5.5), 0, dir), s, { body: pick([0xf2c21d, 0xe2702a, 0xe8eaeb]) }, true);
      for (let j = 0; j < n; j++) { const at2 = nose + step * (3.0 + (uld ? 1.4 : 1.9) + j * (uld ? 2.6 : 3.8)); bake(uld ? M.uldDolly() : M.dolly(), at(at2, beside(side, at2, 5.5), 0, dir), s, { roof: pick([0x3d6a9a, 0x4a5058]), curtain: pick([0x3d6a9a, 0x7a2e2e]) }, true); }
      count('parked train');
    } else if (r < 0.7 && len >= 13) { bake(M.apronBus(), at(s + len / 2, lane(7), 0, dir), s, undefined, true); count('parked bus'); }
    else if (r < 0.82 && len >= 9) { bake(M.bowser(), at(s + len / 2, lane(7), 0, dir), s, undefined, true); count('parked bowser'); }
    else { for (let j = 0; j < 2; j++) bake(M.tractor(), at(s + 2 + j * 3.2, lane(5 + j * 0.2), 0, dir + 0.15), s, { body: pick([0xf2c21d, 0xe8eaeb]) }, true); count('parked tractors'); }
    s += len;
  }

  // ---- all of it into the level: the ground, the paint, and the merged meshes a chunk ----
  const groundMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, map: slabTexture(), side: THREE.DoubleSide });
  add(mergeGeometries(ground), groundMat);
  ground.forEach(g => g.dispose());
  if (paint.idx.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(paint.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(paint.col), 3, true));
    g.setIndex(paint.idx);
    add(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  }
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true }), glow = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  let meshes = 0, verts = 0, tris = 0;
  const near = [];
  for (const [list, small] of [[chunks, false], [details, true]]) {
    for (const C of list.values()) {
      for (const [S, material] of [[C.lit, lit], [C.glow, glow]]) {
        if (!S.nv) continue;
        const mesh = levelGroup.add(meshOf(S, material)).children.at(-1);
        if (small) near.push(mesh);
        meshes++; verts += S.nv; tris += S.ni / 3;
      }
    }
  }
  // the small things drawn only near the camera (a tractor 400 m off is a few pixels; the aircraft stay)
  if (near.length) everyFrame(levelGroup, (t, x, y, z) => { for (const m of near) { const c = m.geometry.boundingSphere.center; m.visible = (c.x - x) ** 2 + (c.z - z) ** 2 < (SEEN + m.geometry.boundingSphere.radius * 0.5) ** 2; } });
  Object.assign(APRON_BUILT, { meshes, verts, tris, counts, paint: paint.idx.length / 3 });
};
