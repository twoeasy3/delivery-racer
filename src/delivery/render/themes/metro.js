// ---- the metro: a metro system the road runs through. An open CUTTING down a ramp (the level's own grades) to a portal; then
// nearly the whole level is ONE LIT TUNNEL (a level's "tunnels", lit by the theme: themes.js `tunnel.lit`; its far end fading to
// the tunnel's own dark: `tunnel.fog`, render/tunnel.js), its zones the metro's parts, each with a ceiling height of its own
// (themes.js `tunnel.heights`, eased from one to the next: render/tunnelshape.js):
//   running      a twin box: the road, then a low plinth and a row of columns, then a train line in its own bore: a TRAIN comes by
//                there (render only), its windows lit, the wheels heard (the bullet train's pass-by sound)
//   station      platforms both sides behind the wall line (the road is the floor between them, a platform's edge its wall): an
//                island platform between the road and the train line, tiled walls, a band in the line's colour, name boards of
//                abstract bars, posters of shapes, empty benches, ticket machines against the wall, hung signs, clocks
//   bore         an arched single bore lined with segments, cable trays, lamps down its crown, kilometre markers
//   interchange  a tall hall with concourses each side behind a low glass barrier: stairs down, ticket gates, columns, big signs
//                in two lines' colours hung over the road
// and the LEVEL CROSSINGS (crossing.js, Canberra's own: lights, booms, the bullet train's carriages across the road) in cross passages, open,
// lit, the line out of sight beyond them (themes.js crossingReach). Then up a ramp and
// out to the DEPOT: sidings with trains stabled on them, lighting masts, a maintenance shed. The theme draws the whole shell
// itself (tunnel.js leaves it: `shell: false`), and a lid of ground over the tunnel so nothing of it shows from the cutting.
// The floor is ONE continuous floor, wall to wall: nothing drawn on it (the owner: zero floor markings). Everything that looks
// like an obstacle and stands where the car can reach is an obstacle (the level's); what is drawn here stands behind the wall
// line (a platform's edge, a barrier, a wall) or high overhead. No people anywhere: empty benches, props, signs, trains.
// All instanced or merged into sheets (a draw call per kind of thing), every texture a small canvas (metroModels.js), the
// layout the same every run.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { Player } from '../../player.js';
import { Game } from '../../game.js';
import { heightOf } from '../tunnelshape.js';
import { everyFrame } from './sceneryClock.js';
import { Sound } from '../audio.js';
import { kit, tileTexture, concreteTexture, liningTexture, floorTexture, tactileTexture, signTexture, clockTexture,
  digitTexture, DIGIT_CELLS, posterTexture, metroTrainCars, CAR_LENGTH } from './metroModels.js';

// the lines' colours, and each zone's: its line, its walls' tile, its floor
const LINE = { red: 0xd8262b, blue: 0x1f6fd0, green: 0x2e9b3d, amber: 0xe8a01a };
const HEX = (c) => '#' + c.toString(16).padStart(6, '0');
const PLATFORM = 5.5;      // m: a side platform's width, behind the wall line
const ISLAND = 8.6;        // m: from the right wall line to the train line's middle in a station (the island platform between)
const RUN_TRACK = 3.0;     // ...and in a running tunnel (a plinth and a row of columns between)
const HALF_BED = 1.9;      // m: the train line's bed each side of its middle (the far wall 0.4 m beyond)
const HALL = 12;           // m: an interchange's concourse each side, behind its barrier
const DEPTH_MARGIN = 0.9;  // m: a cutting's walls stand that much over the ground (a coping, a fence on it)
const CARS = 6;            // a train's cars

export const metro = ({ levelGroup }) => {
  let seed = 41 + (LEVEL.id || '').length * 97;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {}, dummy = new THREE.Object3D(), colour = new THREE.Color();
  const tunnels = LEVEL.tunnels || [];
  const zones = (LEVEL.zones || []).slice().sort((a, b) => a.from - b.from);
  const zoneAt = (s) => zones.find(z => s >= z.from && s < z.to) || zones[zones.length - 1] || null;
  const kindAt = (s) => zoneAt(s)?.scenery || 'running';
  const tunnelAt = (s) => tunnels.find(t => s >= t.from && s <= t.to) || null;
  const curves = []; // the road's curve by segment: [from, to, curve]
  { let at = 0; for (const seg of LEVEL.segments || []) { curves.push([at, at + seg.length, seg.curve || 0]); at += seg.length; } }
  const bent = (s) => Math.abs((curves.find(c => s >= c[0] && s < c[1]) || [0, 0, 0])[2]) > 0.002;
  const L = (s) => Track.lo(s) - 0.3, R = (s) => Track.hi(s) + 0.3; // (the wall lines: just outside the lanes, as every tunnel's)
  const roadY = (s) => { Track.toWorld(s, 0, q); return q.y; };
  const hOf = new Map(tunnels.map(t => [t, heightOf(t)]));
  const hAt = (s) => { const t = tunnelAt(s); return t ? hOf.get(t)(Math.max(t.from, Math.min(t.to, s))) : 8.5; };
  const LINE_OF = { running: LINE.red, station: LINE.red, bore: LINE.amber, interchange: LINE.blue, approach: LINE.red, exit: LINE.green, depot: LINE.green };
  const lineAt = (s) => { const z = zoneAt(s); if (!z) return LINE.red; const k = zones.filter(x => x.scenery === z.scenery).indexOf(z); return z.scenery === 'station' && k % 2 ? LINE.green : z.scenery === 'running' && k % 2 ? LINE.green : LINE_OF[z.scenery] ?? LINE.red; };

  // ---- the train line: where it runs (the spans of running tunnels and stations side by side), and its middle's offset from the
  // right wall line: ISLAND in a station, RUN_TRACK in a running tunnel, eased over the 60 m of running tunnel next to a station
  const spans = [];
  for (const t of tunnels) {
    let cur = null;
    for (const z of zones) {
      const a = Math.max(z.from, t.from), b = Math.min(z.to, t.to);
      if (b <= a) continue;
      if (z.scenery === 'running' || z.scenery === 'station') { if (cur && Math.abs(cur.to - a) < 0.5) cur.to = b; else spans.push(cur = { from: a, to: b }); } else cur = null;
    }
  }
  const spanAt = (s) => spans.find(sp => s >= sp.from && s <= sp.to) || null;
  const stationEnds = zones.filter(z => z.scenery === 'station').flatMap(z => [z.from, z.to]);
  const smooth = (u) => u * u * (3 - 2 * u);
  const offAt = (s) => {
    if (kindAt(s) === 'station') return ISLAND;
    let d = Infinity;
    for (const e of stationEnds) { const sp = spanAt(e); if (sp && s >= sp.from && s <= sp.to) d = Math.min(d, Math.abs(s - e)); }
    return d >= 60 ? RUN_TRACK : RUN_TRACK + (ISLAND - RUN_TRACK) * smooth(1 - d / 60);
  };
  const TC = (s) => R(s) + offAt(s);           // the train line's middle
  const FAR = (s) => TC(s) + HALF_BED + 0.4;   // the far wall beyond it

  // ---- points and frames
  const pt = (s, lat, y) => { Track.toWorld(s, lat, p); return [p.x, p.y + y, p.z]; };
  // the steps along a stretch: every `base` m on the straight (a flat wall needs no more), 6 m where a height or the train line's
  // offset eases (by a zone's ends), 1.5 m in a bend (a 40 m bend's chord strays 7 mm: no kinks even close up), and at each segment's end and each of `breaks`
  const segEnds = curves.map(c => c[1]), zoneEnds = zones.map(z => z.from);
  const easing = (s) => zoneEnds.some(e => Math.abs(s - e) < 64);
  const steps = (from, to, base = 12, breaks = []) => {
    const out = [from];
    for (let s = from; s < to;) {
      const next = Math.min(to, s + base), d = bent(s) || bent(next) || bent((s + next) / 2) ? Math.min(1.5, base) : easing(s) || easing(next) ? Math.min(6, base) : base;
      s = Math.min(to, s + d);
      out.push(s);
    }
    for (const b of [...breaks, ...segEnds]) if (b > from && b < to) out.push(b);
    return [...new Set(out)].sort((a, b) => a - b);
  };
  // (what is built is kept in CELL m squares of the world, a mesh each, so the renderer leaves out what is out of view)
  const CELL = 400, cellOf = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);

  // ---- sheets: coloured quads in one geometry each (vertex colours; a texture's uv where it has one)
  const sheets = [];
  const sheet = (material) => {
    const S = { parts: new Map(), material };
    S.quad = (a, b, c, d, col) => {
      const k = cellOf(a[0], a[2]);
      if (!S.parts.has(k)) S.parts.set(k, { pos: [], col: [], uv: [], idx: [], n: 0 });
      const P = S.parts.get(k);
      colour.set(col);
      for (const v of [a, b, c, d]) { P.pos.push(v[0], v[1], v[2]); P.col.push(colour.r, colour.g, colour.b); P.uv.push(v[3] || 0, v[4] || 0); }
      P.idx.push(P.n, P.n + 1, P.n + 2, P.n, P.n + 2, P.n + 3);
      P.n += 4;
    };
    // a ribbon from `from` to `to`: its two edges A(s) and B(s), each [lat, y over the road]; uv: { u: m along a repeat, v: m across
    // one, v0 } (or none); col a colour or a function of s; skip(s): leave that step out (a mouth)
    S.ribbon = (from, to, A, B, col, uv = null, opts = {}) => {
      const ss = steps(from, to, opts.step ?? 12, opts.breaks || []);
      for (let i = 0; i + 1 < ss.length; i++) {
        const s0 = ss[i], s1 = ss[i + 1];
        if (opts.skip && opts.skip((s0 + s1) / 2)) continue;
        const a0 = A(s0), a1 = A(s1), b0 = B(s0), b1 = B(s1);
        const v0 = uv ? (uv.v0 || 0) : 0, vb0 = uv ? v0 + Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) / uv.v : 0, vb1 = uv ? v0 + Math.hypot(b1[0] - a1[0], b1[1] - a1[1]) / uv.v : 0;
        const u0 = uv ? s0 / uv.u : 0, u1 = uv ? s1 / uv.u : 0;
        const c = typeof col === 'function' ? col((s0 + s1) / 2) : col;
        S.quad([...pt(s0, a0[0], a0[1]), u0, v0], [...pt(s1, a1[0], a1[1]), u1, v0], [...pt(s1, b1[0], b1[1]), u1, vb1], [...pt(s0, b0[0], b0[1]), u0, vb0], c);
      }
    };
    S.flush = () => {
      for (const P of S.parts.values()) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(P.uv, 2));
        geo.setIndex(P.idx);
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        levelGroup.add(new THREE.Mesh(geo, S.material));
      }
    };
    sheets.push(S);
    return S;
  };
  const basic = (extra) => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, ...extra });
  const floorS = sheet(new THREE.MeshLambertMaterial({ map: floorTexture(), vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const tileS = sheet(basic({ map: tileTexture() }));
  const concS = sheet(basic({ map: concreteTexture() }));
  const liningS = sheet(basic({ map: liningTexture() }));
  const plainS = sheet(basic());
  const onS = sheet(basic({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); // (laid on another surface: a lip, a lit strip, a band)
  const tactS = sheet(basic({ map: tactileTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const digitS = sheet(new THREE.MeshBasicMaterial({ map: digitTexture(), side: THREE.DoubleSide }));
  const glassS = sheet(new THREE.MeshBasicMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  const groundS = sheet(new THREE.MeshLambertMaterial({ color: 0x7a7d72, side: THREE.DoubleSide })); // (the lid over the tunnel and the ground up top: the theme's ground)

  // ---- batches: one InstancedMesh per kind of thing, a colour each
  const batches = [];
  const batch = (geometry, material) => {
    const b = { geometry, material, items: [] };
    batches.push(b);
    b.at = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, col = 0xffffff, rx = 0) => { b.items.push([x, y, z, rx, ry, sx, sy, sz, col]); };
    b.on = (s, lat, y, turn = 0, sx = 1, sy = 1, sz = 1, col = 0xffffff, rx = 0) => { const h = Track.toWorld(s, lat, p); b.at(p.x, p.y + y, p.z, h + turn, sx, sy, sz, col, rx); };
    return b;
  };
  const CUBE = new THREE.BoxGeometry(1, 1, 1), TUBE = new THREE.CylinderGeometry(0.5, 0.5, 1, 6), PLANE = new THREE.PlaneGeometry(1, 1), BALL = new THREE.SphereGeometry(0.5, 10, 7);
  const lambert = (color = 0xffffff) => new THREE.MeshLambertMaterial({ color });
  const glowM = (color = 0xffffff) => new THREE.MeshBasicMaterial({ color });
  const cubes = batch(CUBE, lambert()), tubes = batch(TUBE, lambert()), lamps = batch(CUBE, glowM()), lampBalls = batch(BALL, glowM());
  const signBatches = new Map();
  const signB = (texture) => { if (!signBatches.has(texture)) signBatches.set(texture, batch(PLANE, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }))); return signBatches.get(texture); };
  // furniture: one geometry (vertex colours) instanced: an empty platform bench, a ticket machine (its screen lit apart), a gate line
  const vlambert = () => new THREE.MeshLambertMaterial({ vertexColors: true }), vbasic = () => new THREE.MeshBasicMaterial({ vertexColors: true });
  const furniture = (build) => { const K = kit(); build(K); const g = K.geometries(); return { solid: g.solid && batch(g.solid, vlambert()), lit: g.lit && batch(g.lit, vbasic()) }; };
  const benchF = furniture((K) => { // a perforated steel bench, four seats on one beam, two legs (no one on it)
    for (const x of [-0.9, 0.9]) { K.box(0.08, 0.42, 0.5, 0x3a3d42, x, 0.21, 0); }
    K.box(2.2, 0.06, 0.12, 0x3a3d42, 0, 0.42, -0.05);
    for (let k = 0; k < 4; k++) { K.box(0.5, 0.04, 0.42, 0x9aa0a8, -0.81 + k * 0.54, 0.47, 0); K.box(0.5, 0.42, 0.04, 0x9aa0a8, -0.81 + k * 0.54, 0.7, -0.2, -0.12); }
  });
  const machineF = furniture((K) => { // a ticket machine: a cabinet in the line's grey, a screen lit, a slot and a tray
    K.box(1.0, 1.9, 0.6, 0x5a6068, 0, 0.95, 0); K.box(1.04, 0.2, 0.64, 0x2a2d33, 0, 1.95, 0);
    K.box(0.7, 0.05, 0.1, 0x1b1d22, 0, 0.9, 0.31); K.box(0.5, 0.12, 0.08, 0x1b1d22, 0, 0.35, 0.31);
    K.glowBox(0.66, 0.46, 0.04, 0x7fd0ff, 0, 1.4, 0.31); K.glowBox(0.9, 0.12, 0.04, 0xffffff, 0, 1.95, 0.33);
  });
  const vendingF = furniture((K) => { // a vending machine: a tall red cabinet, its front lit with rows of shelves
    K.box(1.1, 2.0, 0.8, 0xc8302b, 0, 1.0, 0); K.box(0.2, 1.4, 0.04, 0x2a2d33, 0.42, 1.2, 0.41);
    K.glowBox(0.72, 1.4, 0.04, 0xfff4dc, -0.12, 1.2, 0.41);
    for (let k = 0; k < 5; k++) K.box(0.72, 0.03, 0.06, 0x8a5a3a, -0.12, 0.6 + k * 0.28, 0.42);
  });
  const gateF = furniture((K) => { // a line of ticket gates across a concourse (behind the wall line): five cabinets, paddles shut
    for (let k = 0; k < 5; k++) { K.box(0.3, 1.0, 1.2, 0xc9ced4, -2.4 + k * 1.2, 0.5, 0); K.box(0.32, 0.12, 1.22, 0x1f6fd0, -2.4 + k * 1.2, 0.86, 0); if (k < 4) { K.box(0.24, 0.5, 0.05, 0xd8262b, -2.07 + k * 1.2, 0.65, 0); K.box(0.24, 0.5, 0.05, 0xd8262b, -1.73 + k * 1.2, 0.65, 0); } K.glowBox(0.14, 0.02, 0.14, k % 2 ? 0xff3030 : 0x39d353, -2.4 + k * 1.2, 1.02, 0.35); }
  });

  const facing = (side) => side * Math.PI / 2; // (a thing on that side turned to face the road: its +z towards it)
  // ---- the parts --------------------------------------------------------------------------------------------------
  const C = { conc: 0xd6d6d0, concDark: 0x9a9b96, dado: 0x5d6660, ceiling: 0xb4b5b0, bed: 0x3a3c40, slab: 0x6a6c6e, rail: 0xc0c4cc, edge: 0x3a3c40,
    lip: 0xf4f4f0, tile: 0xf2ecdc, hallTile: 0xe9edf2, platform: 0xd8d4ca, floor: 0xc9cac6, white: 0xffffff, warm: 0xfff2d0 };
  // the train line's bed between lat a(s) and the far wall: the bed, a concrete slab under the rails, the two rails and the
  // conductor rail (yellow capped), at road level
  const trackBed = (from, to, a) => {
    plainS.ribbon(from, to, (s) => [a(s), 0.01], (s) => [FAR(s), 0.01], C.bed);
    plainS.ribbon(from, to, (s) => [TC(s) - 1.1, 0.1], (s) => [TC(s) + 1.1, 0.1], C.slab);
    for (const off of [-1.1, 1.1]) plainS.ribbon(from, to, (s) => [TC(s) + off, 0.01], (s) => [TC(s) + off, 0.1], 0x55575a);
    for (const off of [-0.72, 0.72]) {
      plainS.ribbon(from, to, (s) => [TC(s) + off - 0.04, 0.18], (s) => [TC(s) + off + 0.04, 0.18], C.rail);
      plainS.ribbon(from, to, (s) => [TC(s) + off - 0.04, 0.1], (s) => [TC(s) + off - 0.04, 0.18], 0x4a4d52);
    }
    plainS.ribbon(from, to, (s) => [TC(s) + 1.45, 0.3], (s) => [TC(s) + 1.6, 0.3], 0xe8c23a);
    plainS.ribbon(from, to, (s) => [TC(s) + 1.45, 0.1], (s) => [TC(s) + 1.45, 0.3], 0x4a4d52);
  };
  // the road's floor, wall line to wall line, inside the tunnel: one continuous polished floor, nothing on it
  const roadFloor = (from, to, col = C.floor) => floorS.ribbon(from, to, (s) => [L(s), 0.024], (s) => [R(s), 0.024], col, { u: 4, v: 4 });
  // rows of lit panels over the road, every `every` m
  const roadLamps = (from, to, every = 8, col = C.white) => { for (let s = from + every / 2; s < to; s += every) for (const d of [-1.7, 1.7]) lamps.on(s, (L(s) + R(s)) / 2 + d, hAt(s) - 0.09, 0, 0.35, 0.12, 1.8, col); };
  // cable trays on a wall (side -1 left at L, +1 right at R or `at`): two trays, the cables in them, at 3.4 and 3.9 m
  const trays = (from, to, side, at = side < 0 ? L : R, opts = {}) => {
    for (let q = from + 3; q < to; q += 6) if (!opts.skip?.(q)) cubes.on(q, at(q) - side * 0.2, 3.34, 0, 0.42, 0.06, 0.06, 0x4a4f57); // (its brackets)
    for (const y of [3.4, 3.9]) {
      plainS.ribbon(from, to, (s) => [at(s), y], (s) => [at(s) - side * 0.38, y], 0x6f737a, null, opts);
      plainS.ribbon(from, to, (s) => [at(s) - side * 0.38, y], (s) => [at(s) - side * 0.38, y + 0.1], 0x8a8f96, null, opts);
      onS.ribbon(from, to, (s) => [at(s) - side * 0.06, y + 0.02], (s) => [at(s) - side * 0.3, y + 0.02], y < 3.6 ? 0x1b1d22 : 0xc8501a, null, opts);
    }
  };
  // a PIPE along a wall: ONE swept tube following the wall's line (8 sides, its rings sharing their vertices so it shades smooth;
  // a ring every 3 m in a bend, 12 on the straight: steps()), in pieces of about 300 m (so what is out of view is left out); a
  // clamp to the wall every 3 m (small, instanced). Nothing stepped: no chords, no ends overlapping
  const pipeMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const pipe = (from, to, side, y, col, at = side < 0 ? L : R, opts = {}) => {
    const r = 0.14, d = 0.32, SIDES = 8, ss = steps(from, to, 12, opts.breaks || []);
    colour.set(col);
    for (let start = 0; start < ss.length - 1;) {
      const end = Math.min(ss.length - 1, start + 60), pos = [], nor = [], cols = [], idx = [];
      for (let i = start; i <= end; i++) {
        const s0 = ss[i], c = pt(s0, at(s0) - side * d, y), o = pt(s0, at(s0) - side * d + 1, y); // (the lateral: across the road)
        const ux = o[0] - c[0], uz = o[2] - c[2], ul = Math.hypot(ux, uz) || 1;
        for (let k = 0; k < SIDES; k++) {
          const a = k / SIDES * Math.PI * 2, nx = Math.cos(a) * ux / ul, ny = Math.sin(a), nz = Math.cos(a) * uz / ul;
          pos.push(c[0] + nx * r, c[1] + ny * r, c[2] + nz * r); nor.push(nx, ny, nz); cols.push(colour.r, colour.g, colour.b);
        }
        if (i > start) for (let k = 0; k < SIDES; k++) { const a0 = (i - start - 1) * SIDES, a1 = a0 + SIDES, k1 = (k + 1) % SIDES; idx.push(a0 + k, a1 + k, a1 + k1, a0 + k, a1 + k1, a0 + k1); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      levelGroup.add(new THREE.Mesh(geo, pipeMaterial));
      start = end;
    }
    for (let q = from + 1.5; q < to; q += 3) if (!opts.skip?.(q)) cubes.on(q, at(q) - side * d / 2, y, 0, d, 0.08, 0.12, 0x4a4f57);
    for (const q of [from, to]) cubes.on(q, at(q) - side * (d + 0.02) / 2, y, 0, d + 0.18, 0.32, 0.32, col); // (each end turned into the wall: no open end)
  };
  // kilometre markers on a wall: a white plate, the distance on it in the digits' cells ("1.2"), every 100 m
  const kmMarkers = (from, to, side, y = 1.9, at = side < 0 ? L : R) => {
    for (let s = Math.ceil(from / 100) * 100; s < to; s += 100) {
      if (s - from < 8 || to - s < 8 || mouths.some(m => Math.abs(s - m.s) < 8)) continue;
      const text = (s / 1000).toFixed(1), W = 0.24, H = 0.36, n = text.length, lat = at(s) - side * 0.05;
      cubes.on(s, at(s) - side * 0.02, y, 0, 0.04, H + 0.12, n * W + 0.14, 0xf4f4f2);
      for (let i = 0; i < n; i++) {
        const cell = text[i] === '.' ? 10 : Number(text[i]), u0 = cell / DIGIT_CELLS, u1 = (cell + 1) / DIGIT_CELLS;
        const d0 = (i - n / 2) * W * -side, d1 = (i + 1 - n / 2) * W * -side; // (read left to right from the road)
        const a = pt(s + d0, lat, y - H / 2), b = pt(s + d1, lat, y - H / 2), c = pt(s + d1, lat, y + H / 2), d = pt(s + d0, lat, y + H / 2);
        digitS.quad([...a, u0, 0], [...b, u1, 0], [...c, u1, 1], [...d, u0, 1], 0xffffff);
      }
    }
  };
  // a sign hung over a place at (s, lat), its face across the road (both ways), y its middle: the board, the rods up to the ceiling
  const hungSign = (s, lat, y, texture, w = 3.2, hgt = 0.8) => {
    cubes.on(s, lat, y, 0, w + 0.12, hgt + 0.12, 0.12, 0x1b1d22);
    signB(texture).on(s - 0.07, lat, y, Math.PI, w, hgt, 1);
    signB(texture).on(s + 0.07, lat, y, 0, w, hgt, 1);
    const top = hAt(s) - (y + hgt / 2);
    for (const d of [-w / 3, w / 3]) cubes.on(s, lat + d, y + hgt / 2 + top / 2, 0, 0.05, top, 0.05, 0x4a4f57);
  };
  // a clock hung over a place: a dark drum, a face each way along the road
  const clock = (s, lat, y) => {
    tubes.on(s, lat, y, 0, 0.9, 0.24, 0.9, 0x1b1d22, Math.PI / 2);
    signB(clockTexture()).on(s - 0.13, lat, y, Math.PI, 0.82, 0.82, 1);
    signB(clockTexture()).on(s + 0.13, lat, y, 0, 0.82, 0.82, 1);
    cubes.on(s, lat, y + 0.45 + (hAt(s) - y - 0.45) / 2, 0, 0.06, hAt(s) - y - 0.45, 0.06, 0x4a4f57);
  };
  // a tiled wall at lat at(s) from y0 to the ceiling, facing the road from `side`: a dark dado, the tiles, the line's band, and on it
  // name boards and posters every so often (on a platform: y0 1.0)
  const tiledWall = (from, to, side, at, y0, tint, opts = {}) => {
    plainS.ribbon(from, to, (s) => [at(s), y0], (s) => [at(s), y0 + 0.5], 0x4a4f57);
    tileS.ribbon(from, to, (s) => [at(s), y0 + 0.5], (s) => [at(s), hAt(s)], tint, { u: 1.2, v: 1.2 }, { skip: opts.skip, breaks: opts.breaks });
    onS.ribbon(from, to, (s) => [at(s) - side * 0.02, y0 + 2.3], (s) => [at(s) - side * 0.02, y0 + 2.75], (s) => opts.line ?? lineAt(s), null, { skip: opts.skip, breaks: opts.breaks });
    if (opts.boards === false) return;
    for (let s = from + 14, k = 0; s < to - 10; s += 15, k++) {
      if (opts.skip?.(s) || opts.skip?.(s - 2) || opts.skip?.(s + 2)) continue;
      const turn = facing(side), lat = at(s) - side * 0.085;
      if (k % 2 === 0) { // a name board: the line's band, white bars
        cubes.on(s, at(s) - side * 0.03, y0 + 2.52, turn, 4.2, 0.95, 0.05, 0x1b1d22);
        signB(signTexture('name', HEX(opts.line ?? lineAt(s)))).on(s, lat, y0 + 2.52, turn, 4.0, 1.0, 1);
      } else { // a poster in its frame
        cubes.on(s, at(s) - side * 0.03, y0 + 1.7, turn, 1.5, 2.1, 0.05, 0x2a2d33);
        signB(posterTexture(Math.floor(rand() * 5))).on(s, lat, y0 + 1.7, turn, 1.3, 1.9, 1);
      }
    }
  };
  // a platform from lat a(s) to b(s) (a < b) at 1.0 m: its top, its edges' faces down to the floor, on each edge `edges` (-1 the
  // a side, +1 the b side) a white lip and the yellow tactile strip
  const PH = 1.0;
  const platform = (from, to, a, b, edges) => {
    floorS.ribbon(from, to, (s) => [a(s), PH], (s) => [b(s), PH], C.platform, { u: 4, v: 4 });
    plainS.ribbon(from, to, (s) => [a(s), 0], (s) => [a(s), PH], C.edge);
    plainS.ribbon(from, to, (s) => [b(s), 0], (s) => [b(s), PH], C.edge);
    for (const e of edges) {
      const edge = e < 0 ? a : b, inward = -e;
      onS.ribbon(from, to, (s) => [edge(s), PH + 0.004], (s) => [edge(s) + inward * 0.3, PH + 0.004], C.lip);
      tactS.ribbon(from, to, (s) => [edge(s) + inward * 0.35, PH + 0.006], (s) => [edge(s) + inward * 0.95, PH + 0.006], 0xffffff, { u: 0.6, v: 0.6 });
    }
    for (const [s, d] of [[from, 0.04], [to, -0.04]]) plainS.quad(pt(s + d, a(s), 0), pt(s + d, b(s), 0), pt(s + d, b(s), PH), pt(s + d, a(s), PH), C.edge); // (its ends, a little in from the end walls: never in their plane)
  };
  // a lit strip along a ceiling at lat(s)
  const litStrip = (from, to, lat, col = C.white, w = 0.3) => onS.ribbon(from, to, (s) => [lat(s) - w / 2, hAt(s) - 0.04], (s) => [lat(s) + w / 2, hAt(s) - 0.04], col);

  // ---- RUNNING TUNNEL: the twin box
  const running = (from, to) => {
    roadFloor(from, to);
    // the left wall: a dark dado, the concrete over it; trays, a pipe, lamps on it, the kilometre markers
    plainS.ribbon(from, to, (s) => [L(s), 0], (s) => [L(s), 1.2], C.dado);
    concS.ribbon(from, to, (s) => [L(s), 1.2], (s) => [L(s), hAt(s)], C.conc, { u: 4, v: 4 });
    onS.ribbon(from, to, (s) => [L(s) + 0.02, 1.2], (s) => [L(s) + 0.02, 1.32], (s) => lineAt(s));
    trays(from, to, -1);
    pipe(from, to, -1, 4.7, 0x2f7a5a);
    for (let s = from + 6; s < to - 3; s += 15) lamps.on(s, L(s) + 0.07, 2.7, 0, 0.12, 0.22, 1.0, C.warm);
    kmMarkers(from, to, -1);
    // the plinth and the columns between the road and the train line
    plainS.ribbon(from, to, (s) => [R(s), 0], (s) => [R(s), 1.1], C.concDark);
    plainS.ribbon(from, to, (s) => [R(s), 1.1], (s) => [R(s) + 0.5, 1.1], 0xb8b9b4);
    plainS.ribbon(from, to, (s) => [R(s) + 0.5, 0], (s) => [R(s) + 0.5, 1.1], 0x7a7c78);
    for (let s = from + 3; s < to - 1; s += 6) { cubes.on(s, R(s) + 0.25, 1.1 + (hAt(s) - 1.1) / 2, 0, 0.5, hAt(s) - 1.1, 0.5, 0xc4c4be); cubes.on(s, R(s) + 0.25, 2.2, 0, 0.52, 0.3, 0.52, lineAt(s)); }
    // the train line: its bed, its far wall, the signals and the lamps of its bore
    plainS.ribbon(from, to, (s) => [R(s) + 0.5, 0.01], (s) => [TC(s) - HALF_BED, 0.01], 0x4a4c50);
    trackBed(from, to, (s) => TC(s) - HALF_BED);
    concS.ribbon(from, to, (s) => [FAR(s), 0], (s) => [FAR(s), hAt(s)], C.concDark, { u: 4, v: 4 });
    for (let s = from + 9; s < to - 3; s += 12) lamps.on(s, FAR(s) - 0.07, 3.4, 0, 0.12, 0.18, 0.8, 0xd8e4ff);
    for (let s = from + 60; s < to - 20; s += 140) signal(s);
    trays(from, to, 1, FAR);
    // the ceiling over all of it (concrete), the lamps over the road
    concS.ribbon(from, to, (s) => [L(s), hAt(s)], (s) => [FAR(s), hAt(s)], C.ceiling, { u: 4, v: 4 });
    roadLamps(from, to);
  };
  // a signal by the train line: a post, a dark head with a lamp lit (red or green) facing the way the trains come
  const signal = (s) => {
    const lat = TC(s) + 1.95;
    cubes.on(s, lat, 1.6, 0, 0.14, 3.2, 0.14, 0x2a2d33);
    cubes.on(s, lat, 3.3, 0, 0.36, 0.8, 0.3, 0x1b1d22);
    lampBalls.on(s - 0.16, lat, 3.5, 0, 0.2, 0.2, 0.12, rand() < 0.5 ? 0xff2a1a : 0x39e36a);
    lampBalls.on(s - 0.16, lat, 3.12, 0, 0.2, 0.2, 0.12, 0x2a2d33);
  };

  // ---- STATION: platforms each side behind the wall line, the train line beyond the island platform
  const station = (from, to) => {
    roadFloor(from, to);
    const left = (s) => L(s) - PLATFORM, islandEnd = (s) => TC(s) - HALF_BED;
    platform(from, to, left, L, [1]);
    platform(from, to, R, islandEnd, [-1, 1]);
    trackBed(from, to, islandEnd);
    tiledWall(from, to, -1, left, PH, C.tile);
    tiledWall(from, to, 1, FAR, 0, C.tile);
    plainS.ribbon(from, to, (s) => [left(s), hAt(s)], (s) => [FAR(s), hAt(s)], 0xe6e4de);
    for (const lat of [(s) => left(s) + 2.4, (s) => (L(s) + R(s)) / 2 - 1.6, (s) => (L(s) + R(s)) / 2 + 1.6, (s) => (R(s) + islandEnd(s)) / 2, (s) => TC(s)]) litStrip(from + 3, to - 3, lat);
    // on the side platform: benches, bins, machines against the wall, hung signs and clocks
    for (let s = from + 12, k = 0; s < to - 8; s += 18, k++) {
      benchF.solid.on(s, left(s) + 2.6, PH, facing(-1));
      if (k % 2) tubes.on(s + 6, left(s) + 1.6, PH + 0.45, 0, 0.55, 0.9, 0.55, 0x4a4f57);
      if (k % 3 === 1) { const m = k % 2 ? vendingF : machineF; m.solid.on(s - 5, left(s) + 0.45, PH, facing(-1)); m.lit?.on(s - 5, left(s) + 0.45, PH, facing(-1)); }
    }
    for (let s = from + 24, k = 0; s < to - 16; s += 36, k++) {
      hungSign(s, L(s) - 2.6, PH + 3.1, signTexture(k % 2 ? 'exit' : 'train', HEX(lineAt(s))));
      clock(s + 18, L(s) - 2.6, PH + 3.4);
    }
    // on the island: columns down its middle, benches between them, signs
    for (let s = from + 6, k = 0; s < to - 3; s += 12, k++) {
      const mid = (R(s) + islandEnd(s)) / 2;
      cubes.on(s, mid, PH + (hAt(s) - PH) / 2, 0, 0.7, hAt(s) - PH, 0.7, C.tile);
      cubes.on(s, mid, PH + 2.5, 0, 0.74, 0.45, 0.74, lineAt(s));
      if (k % 2) benchF.solid.on(s + 6, mid, PH, facing(1));
      if (k % 3 === 2) hungSign(s + 6, mid, PH + 3.1, signTexture('arrow', HEX(lineAt(s))));
    }
  };

  // ---- BORE: an arched single bore, segment lined: walls up to the springline, the vault over the road
  const SPRING = 2.9;   // m from the springline up to the crown
  const N_ARCH = 10;
  const archPoint = (s, k) => { // the k-th point of the vault (0: the left springline, N_ARCH: the right), [lat, y]
    const a = Math.PI * (1 - k / N_ARCH), mid = (L(s) + R(s)) / 2, half = (R(s) - L(s)) / 2, h = hAt(s);
    return [mid + half * Math.cos(a), h - SPRING + SPRING * Math.sin(a)];
  };
  const archTop = (s, lat) => { const mid = (L(s) + R(s)) / 2, half = (R(s) - L(s)) / 2, u = Math.min(1, Math.abs(lat - mid) / half); return hAt(s) - SPRING + SPRING * Math.sqrt(1 - u * u); };
  // the cross passages: where a level crossing's line (crossing.js, Canberra's) or a tunnel junction's side tunnel crosses the road
  const mouths = [...(LEVEL.crossings || []).filter(c => c.road !== 'side'), ...(LEVEL.tunnelJunctions || [])].map(j => ({ s: Track.place(j) }));
  const MOUTH = 5;      // m each side of a junction's middle: its mouth
  const inMouth = (s) => mouths.some(m => Math.abs(s - m.s) < MOUTH);
  const mouthBreaks = mouths.flatMap(m => [m.s - MOUTH, m.s + MOUTH]);
  const bore = (from, to) => {
    roadFloor(from, to);
    const shade = (k) => colour.set(0xc8c9c4).multiplyScalar(0.78 + 0.22 * Math.sin(Math.PI * k / N_ARCH)).getHex();
    for (const [side, edge] of [[-1, L], [1, R]]) {
      plainS.ribbon(from, to, (s) => [edge(s), 0], (s) => [edge(s), 1.0], C.dado, null, { skip: inMouth, breaks: mouthBreaks });
      liningS.ribbon(from, to, (s) => [edge(s), 1.0], (s) => [edge(s), hAt(s) - SPRING], 0xbfc0bb, { u: 1.5, v: 3 }, { skip: inMouth, breaks: mouthBreaks });
      trays(from, to, side, edge, { skip: inMouth, breaks: mouthBreaks });
      for (let s = from + (side < 0 ? 5 : 14); s < to - 3; s += 18) if (!inMouth(s)) lamps.on(s, edge(s) - side * 0.07, 2.5, 0, 0.12, 0.22, 1.0, C.warm);
      for (let s = from + 25; s < to - 10; s += 50) if (!inMouth(s) && !inMouth(s + 2)) plainS.quad(pt(s - 0.7, edge(s) - side * 0.02, 0.1), pt(s + 0.7, edge(s) - side * 0.02, 0.1), pt(s + 0.7, edge(s) - side * 0.02, 2.2), pt(s - 0.7, edge(s) - side * 0.02, 2.2), 0x2a2c30); // (refuge niches, dark)
    }
    let v0 = 0;
    for (let k = 0; k < N_ARCH; k++) {
      const len = Math.hypot(archPoint(from, k + 1)[0] - archPoint(from, k)[0], archPoint(from, k + 1)[1] - archPoint(from, k)[1]);
      liningS.ribbon(from, to, (s) => archPoint(s, k), (s) => archPoint(s, k + 1), shade(k + 0.5), { u: 1.5, v: 3, v0 });
      v0 += len / 3;
    }
    for (let s = from + 4; s < to - 2; s += 9) lamps.on(s, (L(s) + R(s)) / 2, hAt(s) - 0.12, 0, 0.4, 0.14, 1.4, C.white);
    kmMarkers(from, to, -1);
    { // (the pipe on the right, in runs between the junctions' mouths: it turns into the wall short of each)
      let a = from;
      for (const m of mouths.filter(m => m.s > from && m.s < to).sort((x, y) => x.s - y.s)) { pipe(a, m.s - MOUTH - 0.3, 1, 4.4, 0x3a5a8a); a = m.s + MOUTH + 0.3; }
      pipe(a, to, 1, 4.4, 0x3a5a8a);
    }
  };

  // ---- INTERCHANGE: a tall hall, a concourse each side behind a low barrier on the wall line
  const interchange = (from, to) => {
    roadFloor(from, to);
    for (const [side, edge] of [[-1, L], [1, R]]) {
      const back = (s) => edge(s) + side * HALL, gap = (s) => mouths.some(m => Math.abs(s - m.s) < MOUTH);
      const opts = { skip: gap, breaks: mouthBreaks };
      // the barrier: a plinth, glass over it, a rail on top (open at a junction's mouth: the cross passage comes through)
      plainS.ribbon(from, to, (s) => [edge(s), 0], (s) => [edge(s), 0.9], 0x8a8c88, null, opts);
      plainS.ribbon(from, to, (s) => [edge(s), 0.9], (s) => [edge(s) + side * 0.25, 0.9], 0xb8b9b4, null, opts);
      glassS.ribbon(from, to, (s) => [edge(s) + side * 0.12, 0.9], (s) => [edge(s) + side * 0.12, 1.8], 0xffffff, null, opts);
      plainS.ribbon(from, to, (s) => [edge(s) + side * 0.12, 1.8], (s) => [edge(s) + side * 0.12, 1.88], 0x6f757d, null, opts);
      for (let s = from + 2; s < to; s += 3) if (!gap(s)) cubes.on(s, edge(s) + side * 0.12, 1.35, 0, 0.06, 0.9, 0.06, 0x6f757d);
      // the concourse: its floor, its back wall (tiled, the stairs down in it), columns, ticket gates and machines
      floorS.ribbon(from, to, (s) => [edge(s), 0.024], (s) => [back(s), 0.024], C.platform, { u: 4, v: 4 });
      tiledWall(from, to, side, back, 0, C.hallTile, { skip: (s) => gap(s), breaks: mouthBreaks, line: side < 0 ? LINE.blue : LINE.green });
      for (let s = from + 6; s < to - 3; s += 12) {
        const lat = edge(s) + side * HALL * 0.45;
        tubes.on(s, lat, hAt(s) / 2, 0, 0.8, hAt(s), 0.8, 0xdfe3e8);
        tubes.on(s, lat, 3.0, 0, 0.84, 0.5, 0.84, side < 0 ? LINE.blue : LINE.green);
      }
      for (let s = from + 30, k = 0; s < to - 30; s += 48, k++) {
        if (mouths.some(m => Math.abs(s - m.s) < 20)) continue;
        // stairs down: a dark opening in the back wall, a frame round it, a sign over it
        const lat = back(s) - side * 0.03, turn = facing(side);
        plainS.quad(pt(s - 2, lat, 0), pt(s + 2, lat, 0), pt(s + 2, lat, 2.8), pt(s - 2, lat, 2.8), 0x101216);
        cubes.on(s, back(s) - side * 0.05, 2.95, turn, 4.4, 0.3, 0.1, side < 0 ? LINE.blue : LINE.green);
        signB(signTexture('stairs', HEX(side < 0 ? LINE.blue : LINE.green))).on(s, back(s) - side * 0.12, 3.6, turn, 3.2, 0.8, 1);
        // a line of gates across the concourse between the road and the stairs, and machines along the wall
        gateF.solid.on(s + 14, edge(s + 14) + side * HALL * 0.72, 0, 0);
        gateF.lit.on(s + 14, edge(s + 14) + side * HALL * 0.72, 0, 0);
        for (const d of [-12, -10.6]) { machineF.solid.on(s + d, back(s + d) - side * 0.45, 0, facing(side)); machineF.lit.on(s + d, back(s + d) - side * 0.45, 0, facing(side)); }
      }
    }
    plainS.ribbon(from, to, (s) => [L(s) - HALL, hAt(s)], (s) => [R(s) + HALL, hAt(s)], 0xdfe2e6);
    for (const lat of [(s) => L(s) - HALL * 0.75, (s) => L(s) - HALL * 0.3, (s) => (L(s) + R(s)) / 2, (s) => R(s) + HALL * 0.3, (s) => R(s) + HALL * 0.75]) litStrip(from + 3, to - 3, lat, C.white, 0.5);
    // the big signs over the road, high (over the chase camera), in the two lines' colours
    for (let s = from + 40, k = 0; s < to - 30; s += 70, k++) {
      if (mouths.some(m => Math.abs(s - m.s) < 15)) continue;
      hungSign(s, (L(s) + R(s)) / 2 - 2.2, hAt(s) - 3.0, signTexture(k % 2 ? 'arrow' : 'train', HEX(LINE.blue)), 4.0, 1.0);
      hungSign(s, (L(s) + R(s)) / 2 + 2.2, hAt(s) - 3.0, signTexture(k % 2 ? 'exit' : 'arrow', HEX(LINE.green)), 4.0, 1.0);
    }
    for (let s = from + 75; s < to - 40; s += 150) clock(s, L(s) - HALL * 0.45, 5.0);
  };

  // ---- a CROSS PASSAGE (a level crossing's line, or a junction's side tunnel): beyond each mouth a short tunnel, open and lit, its far
  // end dark (the line goes on); the line itself, its ballast, sleepers and rails, is the crossing's own (render/roadside.js). `edge(s)` the wall it opens from, `height` its roof
  const passage = (m, side, edge, height, LEN = 26) => {
    const W = MOUTH, s = m.s, o = pt(s, edge(s), 0);
    Track.toWorld(s, edge(s) + side, p); const out = [p.x - o[0], p.z - o[2]], ol = Math.hypot(out[0], out[1]); out[0] /= ol; out[1] /= ol;
    Track.toWorld(s + 1, edge(s), p); const al = [p.x - o[0], p.z - o[2]], aal = Math.hypot(al[0], al[1]); al[0] /= aal; al[1] /= aal;
    const at = (t, u, y) => [o[0] + out[0] * t + al[0] * u, o[1] + y, o[2] + out[1] * t + al[1] * u];
    for (let t = 0; t < LEN; t += 4) {
      const t1 = Math.min(LEN, t + 4);
      floorS.quad([...at(t, -W, 0.024), 0, t / 4], [...at(t1, -W, 0.024), 0, t1 / 4], [...at(t1, W, 0.024), 2.5, t1 / 4], [...at(t, W, 0.024), 2.5, t / 4], C.floor);
      plainS.quad(at(t, -W, height), at(t1, -W, height), at(t1, W, height), at(t, W, height), 0xb4b5b0);
      for (const u of [-W, W]) {
        plainS.quad(at(t, u, 0), at(t1, u, 0), at(t1, u, 1.0), at(t, u, 1.0), C.dado);
        concS.quad([...at(t, u, 1.0), t / 4, 0], [...at(t1, u, 1.0), t1 / 4, 0], [...at(t1, u, height), t1 / 4, 1], [...at(t, u, height), t / 4, 1], C.conc);
      }
    }
    for (let t = 3; t < LEN; t += 7) { const [x, y, z] = at(t, 0, height - 0.08); lamps.at(x, y, z, Math.atan2(out[0], out[1]), 0.35, 0.12, 1.6, C.white); }
    plainS.quad(at(LEN, -W, 0), at(LEN, W, 0), at(LEN, W, height), at(LEN, -W, height), 0x0c0e12); // (its far end: dark)
  };

  // ---- the faces where one part meets the next: across the wider one's outline, the narrower one's opening left open; where
  // the train line ends, a dark mouth over its bed (the line goes on in a bore of its own)
  const outline = (kind, s) => {
    if (kind === 'running') return { lo: L(s), hi: FAR(s), h: hAt(s), train: [R(s) + 0.5, FAR(s)] };
    if (kind === 'station') return { lo: L(s) - PLATFORM, hi: FAR(s), h: hAt(s), train: [TC(s) - HALF_BED, FAR(s)] };
    if (kind === 'interchange') return { lo: L(s) - HALL, hi: R(s) + HALL, h: hAt(s) };
    return { lo: L(s), hi: R(s), h: hAt(s), arch: true }; // (a bore)
  };
  const face = (s, A, B, col, outsideTop = null) => {
    const lo = Math.min(A.lo, B.lo), hi = Math.max(A.hi, B.hi), H = outsideTop ?? Math.max(A.h, B.h);
    const oLo = Math.max(A.lo, B.lo), oHi = Math.min(A.hi, B.hi), arch = A.arch || B.arch, oH = Math.min(A.h, B.h);
    const top = (lat) => arch ? archTop(s, lat) : oH;
    const lats = [lo, oLo, oHi, hi];
    if (arch) for (let k = 1; k < 16; k++) lats.push(oLo + (oHi - oLo) * k / 16);
    const sorted = [...new Set(lats)].sort((a, b) => a - b);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (b - a < 0.01) continue;
      const inside = a >= oLo - 0.001 && b <= oHi + 0.001;
      const ya = inside ? top(a) : 0, yb = inside ? top(b) : 0;
      if (Math.max(ya, yb) >= H - 0.01) continue;
      plainS.quad(pt(s, a, ya), pt(s, b, yb), pt(s, b, H), pt(s, a, H), col);
    }
    for (const [X, Y, dir] of [[A, B, -1], [B, A, 1]]) { // (a train line that ends here: its dark mouth, on its own side of the face)
      if (!X.train || Y.train) continue;
      plainS.quad(pt(s + dir * 0.06, X.train[0], 0), pt(s + dir * 0.06, X.train[1], 0), pt(s + dir * 0.06, X.train[1], 4.6), pt(s + dir * 0.06, X.train[0], 4.6), 0x06070a);
    }
  };

  // ---- the CUTTING down to a portal (and up from the other): retaining walls up to the ground and a little over it, a coping, a
  // fence on top; at the portal a headwall with the road's opening and the train line's dark mouth, a sign over it
  const GROUND = roadY(0); // (the ground's height in the world: the road's at the start, before it goes down; Track puts the lowest road at 0)
  const groundOver = (s) => GROUND - roadY(s); // (m from the road up to the ground, at s)
  const cutting = (from, to) => {
    for (const [side, edge] of [[-1, (s) => L(s)], [1, (s) => R(s)]]) {
      const topY = (s) => Math.max(1.0, groundOver(s) + DEPTH_MARGIN);
      concS.ribbon(from, to, (s) => [edge(s), 0], (s) => [edge(s), topY(s)], 0xc9c8c0, { u: 4, v: 4 });
      plainS.ribbon(from, to, (s) => [edge(s), topY(s)], (s) => [edge(s) + side * 0.5, topY(s)], 0xe4e3dc);
      plainS.ribbon(from, to, (s) => [edge(s) + side * 0.5, topY(s)], (s) => [edge(s) + side * 0.5, groundOver(s) - 0.05], 0xb4b3ac);
      for (let s = from + 1; s < to; s += 2.5) cubes.on(s, edge(s) + side * 0.3, topY(s) + 0.9, 0, 0.06, 1.8, 0.06, 0x3a5a3a); // the fence's pales
      for (const y of [0.4, 1.6]) plainS.ribbon(from, to, (s) => [edge(s) + side * 0.3, topY(s) + y], (s) => [edge(s) + side * 0.3, topY(s) + y + 0.06], 0x3a5a3a);
      for (let s = from + 15; s < to; s += 30) { tubes.on(s, edge(s) + side * 3, groundOver(s) + 4, 0, 0.16, 8, 0.16, 0x4a4f57); lamps.on(s, edge(s) + side * 2.3, groundOver(s) + 7.9, 0, 0.5, 0.18, 1.2, C.warm); }
      // the ground up there, and what stands on it: trees, then low buildings with lit windows
      groundS.ribbon(from, to, (s) => [edge(s) + side * 0.5, groundOver(s) - 0.02], (s) => [edge(s) + side * 60, groundOver(s) - 0.02], 0xffffff, null, { step: 8 });
      for (let s = from + 6; s < to; s += 11) { const d = 6 + rand() * 10, h = 4 + rand() * 3; tubes.on(s, edge(s) + side * d, groundOver(s) + h / 2, 0, 0.3, h, 0.3, 0x5a4632); cubes.on(s, edge(s) + side * d, groundOver(s) + h + 1.0, rand(), 3.0, 3.2, 3.0, 0x3f6a36); }
      for (let s = from + 20; s < to; s += 34) {
        const d = 24 + rand() * 12, w = 14 + rand() * 8, h = 8 + rand() * 14, g = groundOver(s);
        cubes.on(s, edge(s) + side * (d + w / 2), g + h / 2, 0, w, h, 16, [0xb8a890, 0x9a8f86, 0xc8bca8, 0x8a8f96][Math.floor(rand() * 4)]);
        for (let y = 3; y < h - 1; y += 3.2) lamps.on(s, edge(s) + side * d - side * 0.05, g + y, Math.PI / 2, 12, 1.0, 0.06, rand() < 0.4 ? C.warm : 0x55606c);
      }
    }
  };
  const portal = (s, outward, inside) => { // the headwall across the cutting at s, its face towards `outward` (-1: the cutting is before s)
    const A = outline(inside, s), top = groundOver(s) + DEPTH_MARGIN;
    face(s, { lo: L(s) - 8, hi: A.hi + 8, h: top }, { lo: L(s), hi: R(s), h: A.h }, 0xbdbcb4, top); // (the road's opening; the train line's...)
    if (A.train) for (const d of [-0.08, 0.08]) plainS.quad(pt(s + d, A.train[0], 0), pt(s + d, A.train[1], 0), pt(s + d, A.train[1], 4.6), pt(s + d, A.train[0], 4.6), 0x06070a); // (...a dark mouth, both faces)
    plainS.ribbon(Math.min(s, s + outward * 1.2), Math.max(s, s + outward * 1.2), (q) => [L(q) - 8, groundOver(q) + DEPTH_MARGIN], (q) => [outline(inside, q).hi + 8, groundOver(q) + DEPTH_MARGIN], 0xe4e3dc); // (the coping along its top)
    signB(signTexture('train', HEX(LINE.red))).on(s + outward * 0.1, (L(s) + R(s)) / 2, Math.min(top - 1.2, A.h + 1.2), outward < 0 ? Math.PI : 0, 6, 1.5, 1);
  };

  // ---- the DEPOT: sidings each side with trains stabled on them, a fence along the road, lighting masts, a maintenance shed
  const stabled = [];
  const depot = (from, to) => {
    for (const side of [-1, 1]) {
      const edge = (s) => side < 0 ? Track.laneLo(s) : Track.laneHi(s);
      plainS.ribbon(from, to, (s) => [edge(s) + side * 3.6, 0.02], (s) => [edge(s) + side * 30, 0.02], 0x6a6258, null, { step: 8 }); // the ballast
      for (let s = from + 1; s < to; s += 3) cubes.on(s, edge(s) + side * 4.4, 0.8, 0, 0.08, 1.6, 0.08, 0x4a5a4a);
      for (const y of [0.3, 1.45]) plainS.ribbon(from, to, (s) => [edge(s) + side * 4.4, y], (s) => [edge(s) + side * 4.4, y + 0.08], 0x4a5a4a);
      for (const d of [8, 13.5]) {
        for (const r of [-0.72, 0.72]) plainS.ribbon(from, to, (s) => [edge(s) + side * d + r - 0.04, 0.2], (s) => [edge(s) + side * d + r + 0.04, 0.2], C.rail);
        plainS.ribbon(from, to, (s) => [edge(s) + side * d - 1.1, 0.1], (s) => [edge(s) + side * d + 1.1, 0.1], 0x7a7470);
        if (d < 10) for (let s = from + 30 + rand() * 20; s + CARS * CAR_LENGTH < to - 15; s += 5 * CAR_LENGTH + 30 + rand() * 40) stabled.push({ s, lat: (q) => edge(q) + side * d, n: 5, line: d < 10 ? LINE.red : LINE.green });
      }
      for (let s = from + 25; s < to; s += 50) { tubes.on(s, edge(s) + side * 18, 8, 0, 0.35, 16, 0.35, 0x6f757d); lamps.on(s, edge(s) + side * 18 - side * 0.6, 16, 0, 1.6, 0.3, 0.8, C.warm); }
    }
    // the shed: a long building beyond the sidings on the left, its doors open and lit inside
    const sm = (from + to) / 2, edge = (s) => Track.laneLo(s);
    for (let s = sm - 90; s < sm + 90; s += 30) {
      cubes.on(s, edge(s) - 45, 7, 0, 26, 14, 30.2, 0xa8aca8);
      cubes.on(s, edge(s) - 45, 14.6, 0, 26.4, 1.2, 30.4, 0x6a7078);
      lamps.on(s, edge(s) - 31.95, 3.5, Math.PI / 2, 8, 7, 0.06, 0xffe8b0);
    }
  };

  // ---- the LID: ground over the tunnel, at the ground's height (nothing of the tunnel shows from the cutting or the depot)
  const lid = (t) => groundS.ribbon(t.from + 0.5, t.to - 0.5, (s) => [L(s) - 48, groundOver(s) - 0.02], (s) => [R(s) + 48, groundOver(s) - 0.02], 0xffffff, null, { step: 8 });

  // ---- lay it out (an error here is said, not swallowed: road.js redraws a level when its theme's file arrives)
  try {
    for (const t of tunnels) {
      for (const z of zones) {
        const from = Math.max(z.from, t.from), to = Math.min(z.to, t.to);
        if (to <= from) continue;
        if (z.scenery === 'station') station(from, to);
        else if (z.scenery === 'bore') bore(from, to);
        else if (z.scenery === 'interchange') interchange(from, to);
        else running(from, to);
      }
      // the faces between the parts
      for (let i = 0; i + 1 < zones.length; i++) {
        const s = zones[i].to;
        if (s <= t.from + 1 || s >= t.to - 1) continue;
        const a = zones[i].scenery, b = zones[i + 1].scenery;
        if (a === b || (a === 'running' && b === 'station') || (a === 'station' && b === 'running')) {
          if (a !== b) face(s, outline(a, s), outline(b, s), 0xcfd0ca); // (only the side platform's end: the rest is open)
          continue;
        }
        face(s, outline(a, s), outline(b, s), a === 'bore' || b === 'bore' ? 0xb8b9b4 : 0xd8d9d4);
      }
      // the junctions' cross passages
      for (const m of mouths) {
        if (m.s < t.from || m.s > t.to) continue;
        const kind = kindAt(m.s);
        for (const side of [-1, 1]) {
          if (kind === 'interchange') passage(m, side, (s) => (side < 0 ? L(s) : R(s)) + side * HALL, 7, 26);
          else passage(m, side, side < 0 ? L : R, hAt(m.s) - SPRING, 37); // (the line in it drawn out to 40 m: themes.js crossingReach)
        }
        if (kind === 'interchange') for (const side of [-1, 1]) { // (the back wall over the passage's roof)
          const back = (s) => (side < 0 ? L(s) : R(s)) + side * HALL, edge = side < 0 ? L : R;
          tileS.ribbon(m.s - MOUTH, m.s + MOUTH, (s) => [back(s), 7], (s) => [back(s), hAt(s)], C.hallTile, { u: 1.2, v: 1.2 });
          // a frame over the mouth on the wall line, in the line's colour
          for (const d of [-MOUTH - 0.15, MOUTH + 0.15]) cubes.on(m.s + d, edge(m.s + d) + side * 0.12, 2.95, 0, 0.3, 5.9, 0.3, 0x3a3d42);
          plainS.ribbon(m.s - MOUTH - 0.3, m.s + MOUTH + 0.3, (s) => [edge(s) + side * 0.12, 5.6], (s) => [edge(s) + side * 0.12, 6.2], side < 0 ? LINE.blue : LINE.green);
          plainS.ribbon(m.s - MOUTH - 0.3, m.s + MOUTH + 0.3, (s) => [edge(s) - side * 0.1, 5.55], (s) => [edge(s) + side * 0.34, 5.55], 0x3a3d42);
        }
      }
      lid(t);
      // the cuttings and the portals at the ends
      const first = zones.find(z => z.to > t.from && z.from < t.to), last = [...zones].reverse().find(z => z.to > t.from && z.from < t.to);
      cutting(Track.start, t.from);
      portal(t.from, -1, first?.scenery || 'running');
      const exitEnd = zones.find(z => z.scenery === 'depot')?.from ?? Track.end;
      cutting(t.to, exitEnd);
      portal(t.to, 1, last?.scenery || 'running');
    }
    const yard = zones.find(z => z.scenery === 'depot');
    if (yard) depot(yard.from, Track.end);
  } catch (e) { console.error('metro scenery:', e); }

  // ---- flush the batches and the sheets
  dummy.rotation.order = 'YXZ';
  for (const b of batches) {
    const cells = new Map();
    for (const it of b.items) { const k = cellOf(it[0], it[2]); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(it); }
    for (const items of cells.values()) {
      const mesh = new THREE.InstancedMesh(b.geometry, b.material, items.length);
      items.forEach(([x, y, z, rx, ry, sx, sy, sz, col], i) => {
        dummy.position.set(x, y, z);
        dummy.rotation.set(rx, ry, 0);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, colour.set(col));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere(); // (left out when its square is out of view)
      levelGroup.add(mesh);
    }
  }
  dummy.rotation.order = 'XYZ';
  for (const S of sheets) S.flush();

  // ---- the TRAINS: the CANBERRA TRAIN's carriages (render/trainModel.js makeCarriage, its white and blue shell, cut down to 12 m a
  // car as a level crossing's train is: metroModels.js metroTrainCars), instanced: its front car, its middle ones, its back one
  // (each a solid and a lit geometry: two draw calls a kind); the moving train's windows lit, the depot's stabled cars' dark
  const kindsOf = (cars) => ({ front: cars.front, mid: cars.mid, back: cars.back });
  const trainMeshes = (cars, counts) => {
    const m = {};
    for (const [kind, g] of Object.entries(kindsOf(cars))) {
      if (!counts[kind]) continue;
      m[kind] = [];
      for (const [geo, material] of [[g.solid, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })], [g.lit, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })]]) {
        if (!geo) continue;
        const mesh = new THREE.InstancedMesh(geo, material, counts[kind]);
        mesh.frustumCulled = false;
        levelGroup.add(mesh);
        m[kind].push(mesh);
      }
    }
    return m;
  };
  const setCar = (meshes, i, s, lat, dir) => {
    const a = pt(s - 4, lat(s - 4), 0), b = pt(s + 4, lat(s + 4), 0), mid = pt(s, lat(s), 0);
    dummy.position.set(mid[0], mid[1], mid[2]);
    dummy.rotation.set(0, Math.atan2(b[0] - a[0], b[2] - a[2]) + (dir < 0 ? Math.PI : 0), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    for (const mesh of meshes) mesh.setMatrixAt(i, dummy.matrix);
  };
  const hide = (meshes, i) => { dummy.position.set(0, -500, 0); dummy.scale.set(0.001, 0.001, 0.001); dummy.updateMatrix(); for (const mesh of meshes) mesh.setMatrixAt(i, dummy.matrix); };
  const touch = (m) => { for (const list of Object.values(m)) for (const mesh of list) mesh.instanceMatrix.needsUpdate = true; };
  if (stabled.length) {
    const n = stabled.reduce((k, t) => k + t.n, 0), m = trainMeshes(metroTrainCars(null), { mid: n });
    let i = 0;
    for (const t of stabled) for (let k = 0; k < t.n; k++) setCar(m.mid, i++, t.s + (k + 0.5) * CAR_LENGTH, t.lat, 1);
    touch(m);
    for (const mesh of m.mid) { mesh.computeBoundingSphere(); mesh.frustumCulled = true; } // (standing still: left out when the depot is out of view)
  }
  if (spans.length) {
    const m = trainMeshes(metroTrainCars(0xffe9b8), { front: 1, mid: CARS - 2, back: 1 }), lat = TC;
    const T = { on: false, head: 0, dir: 1, v: 0, span: null, wait: 0.6, n: 0, heard: false, last: 0 };
    const slot = (i) => i === 0 ? [m.front, 0] : i === CARS - 1 ? [m.back, 0] : [m.mid, i - 1];
    const place = () => {
      for (let i = 0; i < CARS; i++) {
        const s = T.head - T.dir * (i + 0.5) * CAR_LENGTH, [meshes, k] = slot(i);
        if (!T.on || s < T.span.from - CAR_LENGTH / 2 || s > T.span.to + CAR_LENGTH / 2) { hide(meshes, k); continue; }
        setCar(meshes, k, s, lat, T.dir);
      }
      touch(m);
    };
    place();
    // (it runs on the run's own clock, Game.time: still while the game is paused, and caught up in steps after a jump: ?ff=)
    const step = (dt) => {
      const here = Player.s, span = spanAt(here);
      if (!T.on) {
        T.wait -= dt;
        if (span && T.wait <= 0 && span.to - here > 60) { // a train: by turns one overtaking from behind, then one coming the other way
          T.on = true; T.span = span; T.heard = false;
          if (T.n++ % 2 === 0) { T.dir = 1; T.head = Math.max(span.from, here - 20); T.v = 0; } else { T.dir = -1; T.head = Math.min(span.to + CARS * CAR_LENGTH, here + 320); T.v = 20; if (dt < 0.3) Sound.play('trainHorn', 0.2); } // (the Canberra train's own sounds: its horn coming, its rush going by)
        }
        return;
      }
      if (T.dir > 0) T.v = Math.max(16, (Player.speed || 0) + 12);
      T.head += T.dir * T.v * dt;
      const tail = T.head - T.dir * CARS * CAR_LENGTH;
      if (!T.heard && Math.abs(T.head - here) < 12) { T.heard = true; if (dt < 0.3) Sound.play('trainPass', 0.4); }
      if ((T.dir > 0 && tail > T.span.to + 2) || (T.dir < 0 && tail < T.span.from - 2) || (Math.abs(tail - here) > 420 && Math.abs(T.head - here) > 420)) {
        T.on = false; T.wait = 3 + rand() * 3;
      }
    };
    everyFrame(levelGroup, () => {
      const now = Game.time || 0;
      if (now < T.last) Object.assign(T, { on: false, wait: 0.6, n: 0 }); // (the run started again)
      let dt = now < T.last ? 0 : Math.min(10, now - T.last);
      T.last = now;
      while (dt > 1e-6) { const d = Math.min(0.25, dt); step(d); dt -= d; }
      place();
    });
  }
};
