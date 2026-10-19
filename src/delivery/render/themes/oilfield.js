// ---- THE OIL FIELD (CHECKLIST 343 / 522): a flat, dusty oil patch under a white-hot haze, the road straight through it. Beside
// the road: a PIPELINE of three pipes on low H-frames, changing sides at ROAD CROSSINGS (over the road on a truss bridge, or
// under it, the trench patched across the asphalt, marker posts each side); NODDING DONKEYS (pumpjacks) on their gravel pads
// near and far, each nodding at its own slow pace on the game's clock; TANK BATTERIES (storage tanks in an earth berm, a
// catwalk over their roofs, a separator, a heater-treater) each with a FLARE STACK burning; DRILLING RIGS (a lattice derrick
// on its substructure, the doghouse, mud tanks, a pipe rack); a PUMP STATION (its shed, the pumps under a canopy, the
// manifold and its valve wheels, vent stacks, a fence); a power line of wooden poles; hazard-striped barriers where anything
// stands near the road; the land pale caliche with sand drifts, creosote and dry grass. The sky a dome of heat haze, the
// air shimmering low down; a painted band of the field going on for ever all round the horizon.
// No people, no words, no lights: the flames are unlit colour.
// COST: everything that stands still in a stretch of CHUNK m is ONE vertex-coloured, flat-shaded mesh (render/themes/
// oilfieldModels.js batch); the striped barriers of a stretch one more (their texture); the donkeys' moving parts one
// instanced mesh a stretch, moved by its vertex shader; the flames one instanced mesh; the sky and the horizon one each.
// Laid out the same every run (a seed of the level's own).
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { GameClock } from '../gameclock.js';
import { everyFrame } from './sceneryClock.js';
import { SHAPES, batch, donkeyFrame, donkeyMoving, donkeyMaterial, flameGeometry, flameMaterial, stripeTexture, horizonTexture, skyMaterial } from './oilfieldModels.js';

const CHUNK = 800;                                 // m of road in one mesh
const CROSSING = { first: 560, every: 780 };       // the pipeline crosses the road at 560 m, 1340...: over, under, over...
const BATTERY = { first: 330, every: 620 };        // a tank battery (and its flare) at 330 m, 950...
const RIG = { first: 1180, every: 1500 };          // a drilling rig at 1180 m, 2680...
const STATION = { first: 2050, every: 2600 };      // a pump station at 2050 m...
const PIPE_D = 6;                                  // m off the road's edge, the pipeline's middle
const PIPES = [[-0.75, 0.3, 0x8e9499], [0, 0.22, 0xd2ae48], [0.7, 0.17, 0x7a5c44]]; // [across, radius, colour], nearest the road first
const SPAN_Y = 15;                                 // m up, the pipes over the road (the chase camera rides at 11; the truss's foot at 14.2)
const PAINT = [0x2f5a3a, 0x26292d, 0x9a2d22, 0x2f4f7a, 0x8c8f84, 0xc8a23a]; // a donkey's paint
const TANKS = [0xe9e2d0, 0xc9b48a, 0x7e5a3e, 0x5d6b4c, 0x3a3c3f];
const EARTH = 0xb39a70, CALICHE = 0xd6cbb0, STEEL = 0x5a6067, GALV = 0x9da3a8, CONCRETE = 0xb8b2a6, DERRICK = 0xc6562e, SUB = 0x3d566e;
// what the last build put out (scripts and stills): its meshes and their triangles
export const OILFIELD_BUILT = { meshes: [] };

export const oilfield = ({ theme, add, flat, sideStrip, offRoads, beside, inJunction, levelGroup }) => {
  let seed = 5;
  for (const ch of (LEVEL.id || 'oil') + ':oil') seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {}, dummy = new THREE.Object3D(), A = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion();
  dummy.rotation.order = 'YXZ';
  OILFIELD_BUILT.meshes = [];
  const START = Track.start, END = Track.end;
  const open = (s) => s > START + 4 && s < END - 4 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  // is there room at (s, side, d) for a thing r m round (clear of every road, and of the main road's other stretches)?
  const room = (s, side, d, r) => { if (!open(s)) return false; Track.toWorld(s, beside(side, s, d), p); return offRoads(p.x, p.z, r) && Track.mainDistance(p.x, p.z) > half(s) + d - 3; };
  // the ground's height at (s, lat), less the road's there: the oil field is flat (a theme with no terrain), so nothing
  const ground = () => 0;
  // the places taken (a battery, a rig, a station, the pipeline): nothing else stands in one
  const taken = [];
  const take = (a, b, side, d0, d1) => taken.push({ a, b, side, d0, d1 });
  const free = (s, side, d, r) => !taken.some(t => t.side === side && s + r > t.a && s - r < t.b && d + r > t.d0 && d - r < t.d1);

  // ---- the stretches: each its batch (all that stands still), its stripes (the barriers' sheets), its donkeys
  const chunks = new Map();
  const chunk = (s) => {
    const k = Math.max(0, Math.floor((s - START) / CHUNK));
    if (!chunks.has(k)) chunks.set(k, { b: batch(rand), stripes: { pos: [], uv: [], idx: [], n: 0 }, donkeys: [], from: s, to: s });
    const C = chunks.get(k);
    C.from = Math.min(C.from, s); C.to = Math.max(C.to, s);
    return C;
  };
  // a shape at (s, lat), y m up from the road's level, turned `turn` off the road's heading, tipped rx (about its across) and
  // rz (about its along), w across, h high, l along, in a colour
  const put = (shape, s, lat, y, w, h, l, col, turn = 0, rx = 0, rz = 0) => {
    const heading = Track.toWorld(s, lat, p);
    dummy.position.set(p.x, p.y + y, p.z);
    dummy.rotation.set(rx, heading + turn, rz);
    dummy.scale.set(w, h, l);
    dummy.updateMatrix();
    chunk(s).b.add(typeof shape === 'string' ? SHAPES[shape] : shape, col, dummy.matrix);
  };
  // a beam or a tube from one point to another, each (s, lat, y): w thick (a tube: its diameter)
  const link = (shape, s0, lat0, y0, s1, lat1, y1, w, col) => {
    Track.toWorld(s0, lat0, p); A.set(p.x, p.y + y0, p.z);
    Track.toWorld(s1, lat1, q); B.set(q.x, q.y + y1, q.z);
    const len = A.distanceTo(B);
    if (len < 0.01) return;
    dummy.position.copy(A).add(B).multiplyScalar(0.5);
    dummy.quaternion.copy(quat.setFromUnitVectors(up, B.sub(A).normalize()));
    dummy.scale.set(w, len, w);
    dummy.updateMatrix();
    chunk((s0 + s1) / 2).b.add(SHAPES[shape], col, dummy.matrix);
    dummy.rotation.set(0, 0, 0); // (put sets its own rotation; the quaternion's turn is not left on it)
  };
  const W = (s, lat, y) => { Track.toWorld(s, lat, p); return [p.x, p.y + y, p.z]; };
  // the pieces something built along the road is made of: 8 m on a straight, 2.5 m in a bend (it follows the curve)
  const hd = {};
  const bends = (s, len) => { const h0 = Track.toWorld(s, 0, hd), h1 = Track.toWorld(s + len, 0, hd); return Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) > 0.01; };
  const steps = (a, b, fn) => { for (let s = a; s < b - 0.01;) { const s1 = Math.min(b, s + (bends(s, 8) ? 2.5 : 8)); fn(s, s1); s = s1; } };
  // a pipe along the road, r m round, its middle y m up at lat(s): six sides
  const pipeAlong = (a, b, lat, y, r, col) => steps(a, b, (s0, s1) => {
    const at = (s, k) => { const t = k / 6 * Math.PI * 2; return W(s, lat(s) + Math.cos(t) * r, y + Math.sin(t) * r); };
    for (let k = 0; k < 6; k++) chunk(s0).b.quad(at(s0, k), at(s0, k + 1), at(s1, k + 1), at(s1, k), col);
  });
  // a hazard-striped barrier along the road from a to b at lat(s): 0.9 m high, 0.35 thick, the stripes running along it
  const barrier = (a, b, lat) => {
    const face = (s0, s1, l0, l1, y0, y1, u0, u1, vy) => {
      const S = chunk(s0).stripes;
      for (const [s, l, y, u, vv] of [[s0, l0, y0, u0, 0], [s0, l0, y1, u0, vy], [s1, l1, y1, u1, vy], [s1, l1, y0, u1, 0]]) { S.pos.push(...W(s, l, y)); S.uv.push(u, vv); }
      S.idx.push(S.n, S.n + 1, S.n + 2, S.n, S.n + 2, S.n + 3);
      S.n += 4;
    };
    steps(a, b, (s0, s1) => {
      const l0 = lat(s0), l1 = lat(s1), u0 = s0 / 1.2, u1 = s1 / 1.2;
      face(s0, s1, l0 - 0.17, l1 - 0.17, 0, 0.9, u0, u1, 0.75);
      face(s0, s1, l0 + 0.17, l1 + 0.17, 0, 0.9, u0, u1, 0.75);
      face(s0, s1, l0 - 0.17, l1 - 0.17, 0.9, 0.9, u0, u1, 0); // (its top: the corners as one: a flat yellow-black run)
      chunk(s0).b.quad(W(s0, l0 - 0.17, 0.9), W(s0, l0 + 0.17, 0.9), W(s1, l1 + 0.17, 0.9), W(s1, l1 - 0.17, 0.9), 0x2a2a2c);
    });
    for (const s of [a, b]) { const l = lat(s); chunk(s).b.quad(W(s, l - 0.17, 0), W(s, l - 0.17, 0.9), W(s, l + 0.17, 0.9), W(s, l + 0.17, 0), 0x2a2a2c); }
  };
  // a bollard: a short post in yellow and black bands
  const bollard = (s, lat, h = 1.2) => { for (let k = 0; k < 4; k++) put('tube', s, lat, (k + 0.5) * h / 4, 0.22, h / 4, 0.22, k % 2 ? 0x1c1c1e : 0xf2c21d); };

  // ---- the road's edge: a gravel shoulder each side, and a white post with an amber eye every 50 m
  const shoulder = [];
  for (const side of [-1, 1]) shoulder.push(sideStrip(START, END, (s) => beside(side, s, 0), (s) => beside(side, s, 2.4), 0.012, 4));
  const shoulderGeo = mergeStrips(shoulder);
  if (shoulderGeo) {
    const mat = flat(0xb7a27a);
    mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1;
    add(shoulderGeo, mat);
  }
  for (let s = START + 25; s < END - 10; s += 50) {
    if (!open(s)) continue;
    for (const side of [-1, 1]) { const l = beside(side, s, 1.3); put('cube', s, l, 0.55, 0.12, 1.1, 0.12, 0xf2f0e8); put('cube', s, l, 0.95, 0.13, 0.16, 0.13, 0xff9a1a, 0, 0, 0); }
  }

  // ---- THE PIPELINE: three pipes on H-frames PIPE_D m off the road on one side; at each crossing it goes over or under the
  // road to the other side (each pipe turning in its turn, the one nearest the road first, so that none crosses another)
  const crossings = [];
  for (let s = CROSSING.first, k = 0; s < END - 60; s += CROSSING.every, k++) if (open(s - 20) && open(s) && open(s + 20)) crossings.push({ s, over: k % 2 === 0 });
  // (each run: its pipes' distances off the road, by pipe; across a crossing they mirror: dist' = 2 PIPE_D - dist)
  const runs = [];
  let side = 1, from = START + 2, dist = PIPES.map(([o]) => PIPE_D + o);
  for (const c of crossings) {
    c.turns = dist.map(d => c.s + (d - PIPE_D) * 1.2); // (where each pipe turns to cross: the one nearest the road first)
    c.before = dist; c.side = side;
    runs.push({ a: from, b: c.s, side, dist, into: runs.length ? crossings[runs.length - 1] : null, outOf: c });
    side = -side; from = c.s; dist = dist.map(d => 2 * PIPE_D - d);
  }
  runs.push({ a: from, b: END - 2, side, dist, into: crossings.length ? crossings[crossings.length - 1] : null, outOf: null });
  for (const r of runs) {
    take(r.a - 4, r.b + 4, r.side, PIPE_D - 3, PIPE_D + 3);
    PIPES.forEach(([, rad, col], k) => pipeAlong(r.into ? r.into.turns[k] : r.a, r.outOf ? r.outOf.turns[k] : r.b, (s) => beside(r.side, s, r.dist[k]), 0.9, rad, col));
    // the H-frames under it every 7 m, and a valve on a stand now and then
    for (let s = r.a + 4, n = 0; s < r.b - 4; s += 7, n++) {
      if (!open(s)) continue;
      const l0 = beside(r.side, s, PIPE_D - 1.25), l1 = beside(r.side, s, PIPE_D + 1.25), lm = beside(r.side, s, PIPE_D);
      put('cube', s, l0, 0.25, 0.14, 0.5, 0.14, STEEL); put('cube', s, l1, 0.25, 0.14, 0.5, 0.14, STEEL);
      put('cube', s, lm, 0.5, Math.abs(l1 - l0) + 0.14, 0.15, 0.2, STEEL);
      if (n % 23 === 11) { put('cube', s, lm, 1.5, 2.2, 0.08, 0.08, GALV); put('disc', s + 0.6, lm, 1.6, 0.7, 0.05, 0.7, 0xc8321f); put('cube', s + 0.3, lm, 1.25, 0.08, 0.7, 0.08, GALV); }
    }
  }
  // the crossings
  const patches = [];
  for (const c of crossings) {
    const A0 = c.side, B0 = -A0;
    PIPES.forEach(([, rad, col], k) => {
      const s = c.turns[k], lA = beside(A0, s, c.before[k]), lB = beside(B0, s, 2 * PIPE_D - c.before[k]), y = SPAN_Y + k * 0.25;
      if (c.over) {
        link('tube', s, lA, 0.9, s, lA, y, rad * 2, col);
        link('tube', s, lA, y, s, lB, y, rad * 2, col);
        link('tube', s, lB, y, s, lB, 0.9, rad * 2, col);
      } else {
        const eA = beside(A0, s, 2.6), eB = beside(B0, s, 2.6);
        link('tube', s, lA, 0.9, s, eA, 0.9, rad * 2, col);
        link('tube', s, eA, 0.9, s, beside(A0, s, 1.2), -0.9, rad * 2, col);
        link('tube', s, beside(B0, s, 1.2), -0.9, s, eB, 0.9, rad * 2, col);
        link('tube', s, eB, 0.9, s, lB, 0.9, rad * 2, col);
      }
    });
    for (const sd of [A0, B0]) {
      take(c.s - 12, c.s + 12, sd, 0, PIPE_D + 4);
      barrier(c.s - 14, c.s - 3.2, (s) => beside(sd, s, 0.8));
      barrier(c.s + 3.2, c.s + 14, (s) => beside(sd, s, 0.8));
      if (c.over) { // a tower each side: four legs, girts, the truss's ends on it
        for (const ds of [-1.8, 1.8]) for (const dd of [-1.3, 1.3]) put('cube', c.s + ds, beside(sd, c.s, PIPE_D + dd), (SPAN_Y + 1.6) / 2, 0.3, SPAN_Y + 1.6, 0.3, GALV);
        for (let y = 3; y < SPAN_Y; y += 4) for (const ds of [-1.8, 1.8]) put('cube', c.s + ds, beside(sd, c.s, PIPE_D), y, 2.9, 0.16, 0.16, GALV);
        put('cube', c.s, beside(sd, c.s, PIPE_D), 0.3, 5, 0.6, 5, CONCRETE);
      } else { // the anchor block where it goes under, a marker post each side of it
        put('cube', c.s, beside(sd, c.s, 2.9), 0.45, 1.4, 0.9, 3.4, CONCRETE);
        bollard(c.s - 2.4, beside(sd, c.s - 2.4, 1.6), 1.5); bollard(c.s + 2.4, beside(sd, c.s + 2.4, 1.6), 1.5);
      }
    }
    if (c.over) { // the truss across: top and bottom chords each face, diagonals between
      const l0 = beside(A0, c.s, PIPE_D + 1.3), l1 = beside(B0, c.s, PIPE_D + 1.3), n = Math.max(4, Math.round(Math.abs(l1 - l0) / 3));
      for (const ds of [-1.8, 1.8]) {
        for (const y of [SPAN_Y - 0.65, SPAN_Y + 1.5]) link('cube', c.s + ds, l0, y, c.s + ds, l1, y, 0.22, GALV);
        for (let i = 0; i < n; i++) { const a = l0 + (l1 - l0) * i / n, b = l0 + (l1 - l0) * (i + 1) / n; link('cube', c.s + ds, i % 2 ? a : b, SPAN_Y - 0.65, c.s + ds, i % 2 ? b : a, SPAN_Y + 1.5, 0.14, GALV); }
      }
      for (let i = 0; i <= n; i++) { const l = l0 + (l1 - l0) * i / n; link('cube', c.s - 1.8, l, SPAN_Y - 0.65, c.s + 1.8, l, SPAN_Y - 0.65, 0.14, GALV); }
    } else patches.push(sideStrip(c.s - 1.6, c.s + 1.6, (s) => Track.lo(s), (s) => Track.hi(s), 0.016, 1)); // (the trench filled in, across the road)
  }
  const patchGeo = mergeStrips(patches);
  if (patchGeo) {
    const mat = flat(0x2c2b2a);
    mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
    add(patchGeo, mat);
  }

  // ---- TANK BATTERIES: four or five tanks in a row inside an earth berm, a catwalk over their roofs and a stair up, a
  // separator on its saddles, a heater-treater, and the FLARE stack beside it all
  const flares = [];
  for (let s0 = BATTERY.first, n = 0; s0 < END - 80; s0 += BATTERY.every, n++) {
    const sd = n % 2 ? -1 : 1, d = 22 + rand() * 14, count = 4 + (n % 2), r = 3.4 + rand() * 0.8, h = 6.5 + rand() * 2, len = count * (r * 2 + 1.4) + 10;
    let ok = true;
    for (let e = -len / 2; e <= len / 2 + 30; e += 8) ok = ok && room(s0 + e, sd, d + 10, 16) && free(s0 + e, sd, d + 10, 12);
    if (!ok) continue;
    take(s0 - len / 2 - 4, s0 + len / 2 + 34, sd, d - 6, d + 30);
    const mid = d + 9, colour = TANKS[n % TANKS.length], g0 = ground(s0, beside(sd, s0, mid));
    put('cube', s0, beside(sd, s0, mid), g0, 22, 0.12, len + 4, CALICHE, 0, 0, 0);
    for (const e of [-1, 1]) put('cube', s0 + e * (len / 2 + 1), beside(sd, s0, mid), g0 + 0.5, 22, 1.0, 1.4, EARTH);
    for (const e of [-1, 1]) put('cube', s0, beside(sd, s0, mid + e * 10.5), g0 + 0.5, 1.4, 1.0, len + 3.4, EARTH);
    for (let i = 0; i < count; i++) {
      const s = s0 - len / 2 + 5 + r + i * (r * 2 + 1.4), l = beside(sd, s, mid + 2);
      put('tank', s, l, g0 + h / 2, r * 2, h, r * 2, i === count - 1 && n % 3 === 0 ? 0x2f2f31 : colour);
      put('cone', s, l, g0 + h + 0.35, r * 2 + 0.1, 0.7, r * 2 + 0.1, colour);
      put('cube', s, l, g0 + h * 0.5, 0.08, h * 0.95, 0.5, 0x3a3c3f, Math.PI / 2, 0, 0); // (a ladder down its side)
    }
    const cs = s0 - len / 2 + 5 + r, ce = s0 - len / 2 + 5 + r + (count - 1) * (r * 2 + 1.4), cl = beside(sd, s0, mid + 2);
    link('cube', cs, cl, h + 0.85, ce, cl, h + 0.85, 0.9, GALV); // the catwalk
    for (const e of [-0.45, 0.45]) link('cube', cs, beside(sd, s0, mid + 2 + e), h + 1.85, ce, beside(sd, s0, mid + 2 + e), h + 1.85, 0.06, 0xf2c21d);
    link('cube', cs - r - 4.5, beside(sd, s0, mid + 2), g0 + 0.2, cs - r - 0.4, beside(sd, s0, mid + 2), h + 0.85, 0.9, GALV); // the stair up to it
    // the separator (a vessel on its side, on saddles) and the heater-treater, between the tanks and the road
    const vs = s0 - 4, vl = beside(sd, vs, d - 2);
    put('tube', vs, vl, g0 + 1.4, 1.7, 6.5, 1.7, 0xd8d2c4, 0, Math.PI / 2, 0);
    for (const e of [-2, 2]) put('cube', vs + e, vl, g0 + 0.4, 1.2, 0.8, 0.4, CONCRETE);
    put('tube', vs + 9, beside(sd, vs + 9, d - 2), g0 + 3.2, 2.4, 6.4, 2.4, 0xd8d2c4);
    put('tube', vs + 9, beside(sd, vs + 9, d - 2), g0 + 7.4, 0.4, 2.2, 0.4, STEEL);
    link('tube', vs + 3, vl, g0 + 1.4, vs + 9, beside(sd, vs + 9, d - 2), g0 + 1.4, 0.2, GALV);
    // the flare: a knock-out drum at its foot, the stack, three guys, the flame on top
    const fs = s0 + len / 2 + 14, fl = beside(sd, fs, d + 12), fh = 22 + rand() * 6, fg = ground(fs, fl);
    put('tube', fs, fl, fg + 1.2, 2.2, 2.4, 2.2, 0x9a9488);
    put('tube', fs, fl, fg + fh / 2, 0.6, fh, 0.6, 0x8a8f94);
    put('tube', fs, fl, fg + fh, 0.9, 0.5, 0.9, 0x2a2a2c);
    for (const a of [0, 2.1, 4.2]) link('cube', fs, fl, fg + fh * 0.8, fs + Math.cos(a) * 9, fl + Math.sin(a) * 9, fg, 0.04, 0x5a5a5a);
    link('tube', fs, fl, fg + 0.4, vs + 9, beside(sd, vs + 9, d - 2), g0 + 0.4, 0.25, GALV); // its line from the treater
    Track.toWorld(fs, fl, p);
    flares.push([p.x, p.y + fg + fh + 0.2, p.z, 1.6 + rand() * 0.8]);
  }

  // ---- DRILLING RIGS: the substructure on four legs, the derrick (four legs tapering to the crown, girts, braces), the
  // doghouse on the floor, the ramp, mud tanks, a pipe rack with its pipes, generator sets
  const rig = (s0, sd, d, tall = 40, bare = false) => {
    const l = beside(sd, s0, d), g0 = ground(s0, l), F = bare ? 0.3 : 7.5; // (the drill floor's height)
    const at = (ds, dd) => [s0 + ds, beside(sd, s0, d + dd)];
    if (!bare) {
      put('cube', s0, l, g0, 34, 0.12, 40, CALICHE);
      for (const ds of [-5, 5]) for (const dd of [-5, 5]) { const [s, ll] = at(ds, dd); put('cube', s, ll, g0 + F / 2, 1.1, F, 1.1, SUB); }
      put('cube', s0, l, g0 + F, 12, 0.7, 12, SUB);
      for (const ds of [-5, 5]) { const [s1, l1] = at(ds, -5), [s2, l2] = at(ds, 5); link('cube', s1, l1, g0 + 0.5, s2, l2, g0 + F - 0.5, 0.25, SUB); link('cube', s1, l1, g0 + F - 0.5, s2, l2, g0 + 0.5, 0.25, SUB); }
      { const [s, ll] = at(-3.5, 6.6); put('cube', s, ll, g0 + F + 1.7, 3, 3, 6.5, 0xb83228); }            // the doghouse
      { const [s1, l1] = at(0, -6.5), [s2, l2] = at(0, -20); link('cube', s1, l1, g0 + F, s2, l2, g0 + 0.4, 1.4, STEEL); } // the ramp (the V-door's)
      for (let i = 0; i < 3; i++) { const [s, ll] = at(-8 + i * 0.1, 11 + i * 3.2); put('cube', s + 4, ll, g0 + 1.3, 2.8, 2.6, 12, i % 2 ? 0x8a8f94 : 0x6f7a84); } // mud tanks
      for (const dd of [-17, -12]) { const [s, ll] = at(-9, dd); put('cube', s, ll, g0 + 0.5, 1.0, 1.0, 9, STEEL); }  // the pipe rack's sleepers...
      for (let i = 0; i < 10; i++) { const [s, ll] = at(-14.5 + (i % 5) * 0.32 + (i > 4 ? 0.16 : 0), -14.5); put('tube', s + 5.5, ll, g0 + 1.15 + (i > 4 ? 0.28 : 0), 0.3, 11, 0.3, 0x6b4a3a, Math.PI / 2, 0, 0); } // ...and its drill pipe (lying along)
      for (const ds of [9, 13]) { const [s, ll] = at(ds, 9); put('cube', s, ll, g0 + 1.4, 3, 2.8, 2.6, 0xd8d2c4); put('tube', s, ll, g0 + 3.2, 0.3, 1.2, 0.3, 0x2a2a2c); } // generator sets
    }
    // the derrick: legs from the floor's corners up to the crown
    const B0 = bare ? 3.6 : 4.4, T = 1.1, top = F + tall, corner = (u, v, y) => { const f = (y - F) / tall, w = B0 + (T - B0) * f; return at(u * w, v * w).concat([g0 + y]); };
    for (const u of [-1, 1]) for (const v of [-1, 1]) { const [s1, l1, y1] = corner(u, v, F), [s2, l2, y2] = corner(u, v, top); link('cube', s1, l1, y1, s2, l2, y2, bare ? 0.3 : 0.4, DERRICK); }
    const girts = bare ? 5 : 8;
    for (let i = 1; i <= girts; i++) {
      const y0 = F + tall * (i - 1) / girts, y1 = F + tall * i / girts;
      for (const [u0, v0, u1, v1] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
        const a = corner(u0, v0, y1), b = corner(u1, v1, y1);
        link('cube', a[0], a[1], a[2], b[0], b[1], b[2], 0.2, DERRICK);
        if (!bare) { const c = corner(u0, v0, y0), e = corner(u1, v1, y0); link('cube', c[0], c[1], c[2], b[0], b[1], b[2], 0.14, DERRICK); link('cube', e[0], e[1], e[2], a[0], a[1], a[2], 0.14, DERRICK); }
      }
    }
    put('cube', s0, l, g0 + top + 0.8, 3.2, 1.6, 3.2, bare ? DERRICK : 0xe8e2d4);            // the crown block
    if (!bare) { put('cube', s0, l, g0 + top - 6, 1.6, 2.2, 1.0, 0xf2c21d); link('cube', s0, l, g0 + top - 5, s0, l, g0 + top, 0.05, 0x2a2a2c); } // the travelling block on its line
  };
  for (let s0 = RIG.first, n = 0; s0 < END - 80; s0 += RIG.every, n++) {
    const sd = n % 2 ? 1 : -1, d = 34 + rand() * 10;
    let ok = true;
    for (let e = -22; e <= 22; e += 8) ok = ok && room(s0 + e, sd, d, 24) && free(s0 + e, sd, d, 18);
    if (!ok) continue;
    take(s0 - 24, s0 + 24, sd, d - 24, d + 24);
    rig(s0, sd, d);
    barrier(s0 - 30, s0 + 30, (s) => beside(sd, s, 0.8)); // (the rig site's frontage)
  }
  // ...and old derricks far off, bare masts out in the field
  for (let s0 = START + 260, n = 0; s0 < END; s0 += 520 + rand() * 300, n++) {
    const sd = n % 2 ? -1 : 1, d = 140 + rand() * 160;
    if (room(s0, sd, d, 20) && free(s0, sd, d, 12)) { take(s0 - 12, s0 + 12, sd, d - 12, d + 12); rig(s0, sd, d, 26 + rand() * 10, true); }
  }

  // ---- THE PUMP STATION: its shed, the pumps under a canopy, the manifold with its valve wheels, a pig launcher, vent stacks,
  // a control cabin, a fence round it all; the barrier along its frontage
  for (let s0 = STATION.first, n = 0; s0 < END - 120; s0 += STATION.every, n++) {
    const run = runs.find(r => s0 > r.a + 40 && s0 < r.b - 40);
    if (!run) continue;
    const sd = run.side, d0 = PIPE_D + 6, d1 = d0 + 38, L = 70;
    let ok = true;
    for (let e = -L / 2; e <= L / 2; e += 10) ok = ok && room(s0 + e, sd, (d0 + d1) / 2, 22) && free(s0 + e, sd, (d0 + d1) / 2, 18);
    if (!ok) continue;
    take(s0 - L / 2 - 4, s0 + L / 2 + 4, sd, d0 - 2, d1 + 2);
    const mid = (d0 + d1) / 2, at = (ds, d) => [s0 + ds, beside(sd, s0 + ds, d)], g0 = ground(s0, beside(sd, s0, mid));
    { const [s, l] = at(0, mid); put('cube', s, l, g0, d1 - d0, 0.12, L, CALICHE); }
    // the shed: walls, a pitched roof, the doors
    { const [s, l] = at(12, d0 + 26); put('cube', s, l, g0 + 3.5, 12, 7, 22, 0xd8d2c4);
      for (const e of [-1, 1]) put('cube', s, beside(sd, s, d0 + 26 + e * 3.1), g0 + 7.6, 6.6, 0.25, 23, 0x8f9aa2, 0, 0, e * sd * 0.33);
      put('cube', s - 11.06, l, g0 + 2.2, 4, 4.4, 0.12, 0x6c7378); put('cube', s - 11.06, beside(sd, s, d0 + 22), g0 + 1.1, 1.0, 2.2, 0.12, 0x3a4a5a); }
    // the pumps: three in a row under a canopy, each a casing, a motor, a skid; a header pipe along them, risers, valve wheels
    for (let i = 0; i < 3; i++) {
      const [s, l] = at(-22 + i * 6, d0 + 9);
      put('cube', s, l, g0 + 0.25, 2.2, 0.5, 4.6, STEEL);
      put('tube', s, l, g0 + 1.2, 1.4, 2.2, 1.4, 0x2f6aa0, 0, Math.PI / 2, 0);
      put('cube', s, l, g0 + 1.15, 1.2, 1.3, 1.6, 0x3a3f45, 0, 0, 0);
      link('tube', s, l, g0 + 1.2, s, beside(sd, s, d0 + 4), g0 + 1.2, 0.4, GALV);
      put('tube', s, beside(sd, s, d0 + 5.5), g0 + 2.0, 0.12, 1.4, 0.12, GALV);
      put('disc', s, beside(sd, s, d0 + 5.5), g0 + 2.75, 0.9, 0.06, 0.9, 0xc8321f);
    }
    { const [s1, l1] = at(-27, d0 + 4), [s2, l2] = at(-6, d0 + 4); link('tube', s1, l1, g0 + 1.2, s2, l2, g0 + 1.2, 0.7, 0x8e9499); }
    for (const ds of [-25, -9]) for (const dd of [6.5, 11.5]) { const [s, l] = at(ds, d0 + dd); put('cube', s, l, g0 + 2.5, 0.25, 5, 0.25, GALV); }
    { const [s, l] = at(-17, d0 + 9); put('cube', s, l, g0 + 5.1, 6.4, 0.2, 18.6, 0x9aa4ac); }
    // the station's pipes: down from the pipeline into the header, a pig launcher at an angle, vent stacks
    { const [s, l] = at(-27, d0 + 4); link('tube', s, beside(sd, s, PIPE_D), 0.9, s, l, g0 + 1.2, 0.5, 0x8e9499); }
    { const [s1, l1] = at(-4, d0 + 3), [s2, l2] = at(4, d0 + 3); link('tube', s1, l1, g0 + 1.0, s2, l2, g0 + 2.2, 0.9, 0xd2ae48); put('disc', s2 + 0.4, l2, g0 + 2.3, 1.0, 0.08, 1.0, 0x2a2a2c, 0, 0, Math.PI / 2); }
    for (const ds of [-3, 1.5]) { const [s, l] = at(ds, d0 + 14); put('tube', s, l, g0 + 6, 0.35, 12, 0.35, GALV); put('tube', s, l, g0 + 12.2, 0.5, 0.4, 0.5, 0x2a2a2c); }
    { const [s, l] = at(26, d0 + 8); put('cube', s, l, g0 + 1.4, 3, 2.8, 6, 0xe9e2d0); put('cube', s, l, g0 + 2.9, 3.3, 0.2, 6.4, 0x8f9aa2); }
    // the fence: posts every 3 m and two rails, round the compound (a gate gap at the front)
    const fence = (sa, la, sb, lb) => { link('cube', sa, la, g0 + 2.1, sb, lb, g0 + 2.1, 0.06, GALV); link('cube', sa, la, g0 + 1.0, sb, lb, g0 + 1.0, 0.05, GALV); const n = Math.max(1, Math.round(Math.hypot(sb - sa, lb - la) / 3)); for (let i = 0; i <= n; i++) put('tube', sa + (sb - sa) * i / n, la + (lb - la) * i / n, g0 + 1.1, 0.08, 2.2, 0.08, GALV); };
    const [fa, la0] = at(-L / 2, d0 - 1), [fb, lb0] = at(L / 2, d0 - 1), [, la1] = at(-L / 2, d1), [, lb1] = at(L / 2, d1);
    fence(fa, la0, s0 - 6, beside(sd, s0 - 6, d0 - 1)); fence(s0 + 6, beside(sd, s0 + 6, d0 - 1), fb, lb0);
    fence(fa, la1, fb, lb1); fence(fa, la0, fa, la1); fence(fb, lb0, fb, lb1);
    barrier(s0 - L / 2, s0 - 8, (s) => beside(sd, s, 0.8)); barrier(s0 + 8, s0 + L / 2, (s) => beside(sd, s, 0.8));
    for (const ds of [-6, 6]) bollard(s0 + ds, beside(sd, s0 + ds, 4), 1.2);
  }

  // ---- THE NODDING DONKEYS: on gravel pads, near the road and out across the field, each turned its own way; a flowline
  // from the near ones to the pipeline, and an electrical box beside each
  const frame = donkeyFrame();
  const donkey = (s, sd, d, size, turn) => {
    const l = beside(sd, s, d), g0 = ground(s, l), heading = Track.toWorld(s, l, p), paint = PAINT[Math.floor(rand() * PAINT.length)];
    put('cube', s, l, g0, 7 * size + 4, 0.12, 11 * size + 4, CALICHE, turn);
    dummy.position.set(p.x, p.y + g0 + 0.06, p.z); dummy.rotation.set(0, heading + turn, 0); dummy.scale.setScalar(size); dummy.updateMatrix();
    const C = chunk(s);
    C.b.add(frame, paint, dummy.matrix, 0.06);
    C.donkeys.push([dummy.matrix.clone(), paint]);
    put('cube', s + Math.cos(turn) * 4 * size, beside(sd, s, d + 3.5 * size), g0 + 0.7, 0.8, 1.3, 0.5, 0x9da3a8, turn);
  };
  for (let s = START + 40; s < END - 20; s += 34 + rand() * 40) {
    const sd = rand() < 0.5 ? -1 : 1, d = 15 + Math.pow(rand(), 1.6) * 150, size = 0.8 + rand() * 0.45, turn = (rand() - 0.5) * 1.2 + (rand() < 0.5 ? 0 : Math.PI / 2);
    if (!room(s, sd, d, 9) || !free(s, sd, d, 9)) continue;
    take(s - 8, s + 8, sd, d - 8, d + 8);
    donkey(s, sd, d, size, turn);
    const run = runs.find(r => s > r.a + 6 && s < r.b - 6);
    if (run && run.side === sd && d < 70) link('tube', s, beside(sd, s, d - 3), 0.15, s, beside(sd, s, PIPE_D + 1.4), 0.15, 0.14, 0x6f6a60); // (its flowline over to the pipeline)
  }

  // ---- the power line: wooden poles 12 m off on the left, a crossarm, three wires to the next
  let last = null;
  for (let s = START + 10; s < END; s += 55) {
    const l = beside(-1, s, 12);
    if (!room(s, -1, 12, 1) || !free(s, -1, 12, 1.5)) { last = null; continue; }
    put('tube', s, l, 5, 0.3, 10, 0.3, 0x6b5238);
    put('cube', s, l, 9.4, 2.6, 0.16, 0.16, 0x5a4530, Math.PI / 2);
    for (const e of [-1.1, 0, 1.1]) { put('cube', s, l + e, 9.62, 0.1, 0.28, 0.1, 0x4a5a3a); if (last) link('cube', last[0], last[1] + e, 9.72, s, l + e, 9.72, 0.035, 0x2a2a2c); }
    last = [s, l];
  }

  // ---- the land: sand drifts, caliche patches, creosote bushes, dry grass, stones, thick near the road and thinning out
  for (let s0 = START + 6; s0 < END - 6; s0 += 9) {
    for (const sd of [-1, 1]) {
      const s = s0 + rand() * 7, roll = rand(), d = 3.2 + rand() * rand() * 110;
      if (!room(s, sd, d, 3) || !free(s, sd, d, 2.5)) continue;
      const l = beside(sd, s, d), g0 = ground(s, l);
      if (roll < 0.3) { for (let k = 0; k < 2; k++) { const r = 0.6 + rand() * 0.9; put('ball', s + (rand() - 0.5) * 3, l + (rand() - 0.5) * 3, g0 + r * 0.3, r * 1.5, r * 0.9, r * 1.4, k ? 0x77733f : 0x6a6838, rand() * 3); } }
      else if (roll < 0.5) { for (let k = 0; k < 3; k++) { const h = 0.5 + rand() * 0.6; put('tuft', s + (rand() - 0.5) * 2, l + (rand() - 0.5) * 2, g0 + h / 2 - 0.05, 0.7, h, 0.7, 0xc9b478); } }
      else if (roll < 0.78) { // a drift of sand, or a pale patch of caliche: a big flat thing, so its middle well off the road
        const w = 4 + rand() * 8, long = w * (1.2 + rand() * 0.6), dd = Math.max(d, long / 2 + 2.5), ll = beside(sd, s, dd);
        if (!room(s, sd, dd, long / 2) || !free(s, sd, dd, long / 2)) continue;
        if (roll < 0.66) put('ball', s, ll, g0 - 0.1, w, 0.7 + rand() * 0.6, long, 0xdcc79a, rand() * 3);
        else put('disc', s, ll, g0 - 0.02, w, 0.06, long, CALICHE, rand() * 3);
      }
      else if (roll < 0.9) { const r = 0.4 + rand() * rand() * 1.6; put('rock', s, l, g0 + r * 0.2, r, r * 0.6, r * 1.1, rand() < 0.5 ? 0xa58e6c : 0x8f7a5e, rand() * 3); }
    }
  }

  // ---- the meshes: each stretch's batch and stripes, its donkeys' moving parts
  const solid = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const striped = new THREE.MeshLambertMaterial({ map: stripeTexture(), flatShading: true, side: THREE.DoubleSide });
  const moving = donkeyMaterial(), movingGeo = donkeyMoving(), paintC = new THREE.Color();
  for (const C of chunks.values()) {
    const geo = C.b.geometry();
    if (geo) { levelGroup.add(new THREE.Mesh(geo, solid)); OILFIELD_BUILT.meshes.push({ kind: 'still', from: C.from, to: C.to, tris: C.b.count }); }
    if (C.stripes.n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(C.stripes.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(C.stripes.uv, 2));
      g.setIndex(C.stripes.idx);
      g.computeBoundingSphere();
      levelGroup.add(new THREE.Mesh(g, striped));
      OILFIELD_BUILT.meshes.push({ kind: 'stripes', from: C.from, to: C.to, tris: C.stripes.idx.length / 3 });
    }
    if (C.donkeys.length) {
      const mesh = new THREE.InstancedMesh(movingGeo, moving, C.donkeys.length);
      C.donkeys.forEach(([m, paint], i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, paintC.set(paint)); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      levelGroup.add(mesh);
      OILFIELD_BUILT.meshes.push({ kind: 'donkeys', from: C.from, to: C.to, tris: movingGeo.index.count / 3 * C.donkeys.length, instances: C.donkeys.length });
    }
  }
  // the flames
  let flameMesh = null;
  if (flares.length) {
    flameMesh = new THREE.InstancedMesh(flameGeometry(), flameMaterial(), flares.length);
    flares.forEach(([x, y, z, size], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, i * 1.3, 0); dummy.scale.set(size * 2.4, size * 5, size * 2.4); dummy.updateMatrix(); flameMesh.setMatrixAt(i, dummy.matrix); });
    flameMesh.frustumCulled = false;
    flameMesh.userData.flat = true;
    levelGroup.add(flameMesh);
    OILFIELD_BUILT.meshes.push({ kind: 'flames', tris: flameMesh.geometry.index.count / 3 * flares.length, instances: flares.length });
  }

  // ---- the sky: the dome of haze round whoever is looking, and the field painted round the horizon; both gone in a fog bank
  const R = 560, clear = (scene) => Math.min(1, Math.max(0, (scene.fog ? scene.fog.far - 120 : 400) / 380));
  const sky = skyMaterial(theme.sky, 0x9db8cc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12), sky);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R - 30, R - 30, 64, 48, 1, true),
    new THREE.MeshBasicMaterial({ map: horizonTexture(theme.sky, 0x5a5048), transparent: true, depthWrite: false, fog: false, side: THREE.BackSide }));
  ring.material.map.repeat.set(3, 1);
  Track.toWorld(START, 0, p);
  const g0 = p.y; // (the land's height, as near as matters: the level's start)
  for (const [thing, order] of [[dome, -5], [ring, -4]]) {
    thing.frustumCulled = false;
    thing.renderOrder = order;
    thing.onBeforeRender = (renderer, scene, camera) => {
      const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x;
      thing.position.set(x, thing === ring ? g0 + 32 - 1.5 : camera.position.y, camera.position.z);
      thing.updateMatrixWorld();
      if (thing === ring) ring.material.opacity = clear(scene); else sky.uniforms.clear.value = clear(scene);
    };
    levelGroup.add(thing);
  }
  OILFIELD_BUILT.meshes.push({ kind: 'sky', tris: dome.geometry.index.count / 3 }, { kind: 'horizon', tris: 96 });

  // ---- what moves: on the game's clock (still while paused)
  everyFrame(levelGroup, () => {
    const t = GameClock.time;
    moving.userData.uniforms.uTime.value = t;
    if (flameMesh) flameMesh.material.userData.uniforms.uTime.value = t;
    sky.uniforms.uTime.value = t;
  });
};

// strips (render/road.js sideStrip: position and index only) merged into one geometry
function mergeStrips(list) {
  const pos = [], idx = [];
  let n = 0;
  for (const g of list) {
    if (!g || !g.index || !g.attributes.position.count) continue;
    const P = g.attributes.position.array, I = g.index.array;
    for (let i = 0; i < P.length; i++) pos.push(P[i]);
    for (let i = 0; i < I.length; i++) idx.push(I[i] + n);
    n += g.attributes.position.count;
    g.dispose();
  }
  if (!n) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}
