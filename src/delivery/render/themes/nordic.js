// ---- the Nordic fjord (theme 'nordic', scenery 'nordic'). A coast road in summer along a Norwegian fjord: the deep blue water on
// the right, a wall of rock and spruce climbing straight up on the left to snow on the tops, the far wall across the water as steep,
// waterfalls down both. The land is road.js's terrain, worked on here: on the left lifted into the fjord wall (a bench of meadow
// left level where the farms are), on the right cut down into the water, a rocky shore under the road and the far wall rising out
// of the water a few hundred metres off; over each tunnel a spur of the mountain runs down to the water, and the road goes into it
// through a rock cutting. Painted by height and slope: meadow, spruce forest, bare rock, scree, snow.
// Along the road: a steel rail on the water side, white marker posts with a black band, tall orange snow poles. Red and white timber
// cabins with turf or slate roofs on the benches, red boathouses on stilts at the water's edge, a ferry quay near the end (an apron,
// a linkspan on its gantry, a car ferry moored at it), a double-ended ferry crossing and recrossing the fjord, a suspension bridge
// high over the road and the water beyond the end. In the long tunnels (raw blasted rock, sodium lamps: themes.js tunnel, with
// render/tunneldress.js's rock texture) a cable tray down one wall, green emergency cabinets, and half way through the first, the
// cavern of an underground roundabout: side-tunnel mouths in both walls, blue light washed up them and a ring of it on the ceiling.
// No people, no text. COST: what stands still merged by CHUNK m of road into ONE mesh of vertex colours (and one more for what
// glows), the spruce instanced by PINE_CHUNK m, the sky, the ring of peaks, the water and the ferry under way one mesh each: about
// a dozen draw calls in sight; no textures. Laid out from a seed of the level's own: the same every run. Drawn only: nothing here
// is read by the rules. (The models: nordicModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { heightOf } from '../tunnelshape.js';
import { ferryParts } from './nordicModels.js';

const CHUNK = 1000, PINE_CHUNK = 2000; // m of road to a merged mesh, and to a mesh of spruce
const WATER = 1;                       // the side the fjord is on (the right); the wall is on the other
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ridge = (x, z, f, a, b, ph) => { const v = 1 - Math.abs(Math.sin((x * a + z * b) * f + ph) * Math.cos((x * b - z * a) * f * 0.7 + ph * 1.7)); return v * v; };
// how high a wall stands at (x, z) (m over the water at its top): a massif of ridges, 150 to 380 m
const wallTop = (x, z) => {
  const massif = 0.55 + 0.45 * Math.sin(x * 0.0037 + 0.9) * Math.cos(z * 0.0041 - 0.3);
  const r = ridge(x, z, 0.0058, 0.8, 0.6, 0.3) + 0.55 * ridge(x, z, 0.012, -0.5, 0.86, 1.1) + 0.3 * ridge(x, z, 0.027, 0.96, -0.28, 2.2);
  return 150 + 230 * massif * (r / 1.85);
};

// ---- the road's samples in a grid of squares: the nearest to a world point, its s, its height, and which side of it the point is
const roadIndex = () => {
  const SQ = 32, cells = new Map(), xs = [], ys = [], zs = [], ss = [], rx = [], rz = [], p = {}, q = {};
  for (let s = Track.start; s <= Track.end; s += 3) {
    const mid = (Track.lo(s) + Track.hi(s)) / 2;
    Track.toWorld(s, mid, p); Track.toWorld(s, mid + 1, q); // (the right, the way +lat runs)
    const k = Math.floor(p.x / SQ) * 100003 + Math.floor(p.z / SQ);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(xs.length);
    xs.push(p.x); ys.push(p.y); zs.push(p.z); ss.push(s); rx.push(q.x - p.x); rz.push(q.z - p.z);
  }
  const out = { d: 0, s: 0, y: 0, lat: 0 };
  const near = (x, z, reach = 80) => {
    let best = Infinity, bi = -1;
    const n = Math.ceil(reach / SQ), cx = Math.floor(x / SQ), cz = Math.floor(z / SQ);
    for (let i = cx - n; i <= cx + n; i++) for (let j = cz - n; j <= cz + n; j++) {
      const list = cells.get(i * 100003 + j);
      if (list) for (const k of list) { const d = (x - xs[k]) ** 2 + (z - zs[k]) ** 2; if (d < best) { best = d; bi = k; } }
    }
    if (bi < 0) { out.d = Infinity; return out; }
    out.d = Math.sqrt(best); out.s = ss[bi]; out.y = ys[bi]; out.lat = (x - xs[bi]) * rx[bi] + (z - zs[bi]) * rz[bi];
    return out;
  };
  // a coarse field of the same over a box of the world (16 m squares), for the land far off: { d, s, y, lat } at (x, z), a few m
  // out at worst there; near a road (70 m) the exact one
  const field = (x0, z0, x1, z1) => {
    const C = 16, nx = Math.ceil((x1 - x0) / C) + 2, nz = Math.ceil((z1 - z0) / C) + 2, F = new Float32Array(nx * nz * 4);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * C, z = z0 + j * C;
      let best = Infinity, bi = 0;
      for (let k = 0; k < xs.length; k += 3) { const d = (x - xs[k]) ** 2 + (z - zs[k]) ** 2; if (d < best) { best = d; bi = k; } }
      const o = (j * nx + i) * 4;
      F[o] = Math.sqrt(best); F[o + 1] = ss[bi]; F[o + 2] = ys[bi]; F[o + 3] = (x - xs[bi]) * rx[bi] + (z - zs[bi]) * rz[bi];
    }
    return (x, z) => {
      const u = Math.max(0, Math.min(nx - 1.001, (x - x0) / C)), v = Math.max(0, Math.min(nz - 1.001, (z - z0) / C)), i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j;
      const at = (k) => F[(j * nx + i) * 4 + k] * (1 - fx) * (1 - fz) + F[(j * nx + i + 1) * 4 + k] * fx * (1 - fz) + F[((j + 1) * nx + i) * 4 + k] * (1 - fx) * fz + F[((j + 1) * nx + i + 1) * 4 + k] * fx * fz;
      if (at(0) < 70) return near(x, z, 80);
      out.d = at(0); out.s = at(1); out.y = at(2); out.lat = at(3);
      return out;
    };
  };
  return { near, field, low: Math.min(...ys) };
};

export const nordic = ({ theme, offRoads, beside, inJunction, levelGroup: group }) => {
  // (everything added here is marked as the theme's own, so its cost can be told from the road's and the land's)
  const levelGroup = { children: group.children, add: (...things) => { for (const o of things) o.userData.nordic = true; return group.add(...things); } };
  let seed = 11;
  for (const ch of (LEVEL.id || 'nordic') + ':nordic') seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rand() * (b - a);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const p = {}, q = {};
  const S0 = Track.start, S1 = Track.end;
  const roads = roadIndex();
  const W2 = (Track.hi(0) - Track.lo(0)) / 2; // (half the pavement: the index measures from its middle)
  const tunnels = LEVEL.tunnels || [];
  const inTunnel = (s, pad = 0) => tunnels.some(t => s > t.from - pad && s < t.to + pad);
  const roadY = (s) => { Track.toWorld(s, 0, q); return q.y; };
  const stats = { meshes: 0, triangles: 0, instances: 0, solids: [], chunks: [] };
  nordicStats.last = stats;
  const WL = roads.low - 3.2; // the fjord's level: a little under the road's lowest
  const SNOW = WL + 250;
  const solid = (kind, s, x, z, r, y0, y1) => stats.solids.push({ kind, s, x, z, r, y0, y1 });

  // ---- where the road runs: the BENCHES (level meadow on the wall's side, for the farms: the start, a hamlet half way, the quay at
  // the end), each eased in and out over 60 m; a tunnel's SPUR (the mountain down to the water round it), over 90 m out of each end
  const quay = Track.length > 1500 ? S1 - 150 : null;
  const BENCHES = [[S0, 330], [Track.length * 0.52, Track.length * 0.52 + 300], [S1 - 420, S1 + 50]].filter(([a, b]) => !tunnels.some(t => a < t.to + 60 && b > t.from - 60) && !(LEVEL.rockfall || []).some(r => a < r.to + 60 && b > r.from - 60));
  const bench = (s) => Math.max(0, ...BENCHES.map(([a, b]) => smooth(a - 60, a, s) * smooth(b + 60, b, s)));
  const spur = (s) => Math.max(0, ...tunnels.map(t => smooth(t.from - 90, t.from - 10, s) * smooth(t.to + 90, t.to + 10, s)));
  const tunnelH = (s) => { const t = tunnels.find(t => s >= t.from - 100 && s <= t.to + 100); return t ? heightOf(t)(Math.max(t.from, Math.min(t.to, s))) : 8.5; };
  // the far wall's foot across the water, m off the pavement's edge
  const farAt = (s) => 230 + 45 * Math.sin(s * 0.0029 + 0.4) + 25 * Math.sin(s * 0.0093);

  // ---- THE LAND: road.js's terrain, read, lifted on the wall's side, cut into the water on the fjord's, and painted
  const terrain = group.children.find(m => m.isMesh && m.userData.terrain);
  let land = null;
  const forestAt = (x, z) => 0.55 + 0.3 * Math.sin(x * 0.017 + 0.7) * Math.cos(z * 0.021 - 1.1) + 0.2 * Math.sin(x * 0.047 - z * 0.043);
  // the height the land is given at a point, e m off the pavement's edge on `side`, s along the road, roadY there
  const shape = (x, z, e, side, s, ry, base) => {
    const b = bench(s), sp = spur(s), H = tunnelH(s) + 8;
    const top = wallTop(x, z);
    if (side !== WATER) {
      const start = 6 + 44 * b, run = 70 + 40 * b;
      let y = ry - 0.3 + 1.2 * b * Math.sin(x * 0.07) * Math.sin(z * 0.06) * smooth(10, 30, e) + (WL + top - ry) * smooth(start, start + run, e);
      if (sp > 0) y = Math.max(y, ry + H * sp * smooth(5, 13, e));
      return y;
    }
    const start = 6 + 8 * b, far = farAt(s);
    let y = ry - 0.3 + (WL - 5 - (ry - 0.3)) * smooth(start, start + 12, e) - 9 * smooth(start + 12, start + 60, e); // the shore, then the deep
    y = Math.max(y, WL + top * 0.9 * smooth(far, far + 120, e) - 14 * (1 - smooth(far - 30, far + 20, e)));            // the far wall
    if (sp > 0) { // the spur: the mountain round the tunnel, down to the water further off
      const spurY = ry + H * smooth(5, 13, e) + (WL + top * 0.75 - ry - H) * smooth(14, 160, e);
      y = y + (Math.max(y, spurY) - y) * sp;
    }
    return Math.max(y, base - 400); // (never NaN)
  };
  const paint = { D: null };
  if (terrain) {
    const P = terrain.geometry.attributes.position, arr = P.array, N = P.count;
    const X0 = arr[0], Z0 = arr[2], G = arr[3] - arr[0];
    let cols = 1;
    while (cols < N && arr[cols * 3 + 2] === Z0) cols++;
    const rows = Math.floor(N / cols);
    const far = roads.field(X0, Z0, arr[(N - 1) * 3], arr[(N - 1) * 3 + 2]);
    const E = new Float32Array(N), SIDE = new Int8Array(N);
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], z = arr[i * 3 + 2], r = far(x, z), e = r.d - W2;
      E[i] = e; SIDE[i] = r.lat >= 0 ? 1 : -1;
      if (e < 6) continue; // (the flat strip beside the pavement is road.js's, untouched)
      arr[i * 3 + 1] = shape(x, z, e, SIDE[i], r.s, r.y, arr[i * 3 + 1]);
    }
    const corner = (r, c) => arr[(Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c))) * 3 + 1];
    land = (x, z) => {
      const u = (x - X0) / G, v = (z - Z0) / G, c = Math.floor(u), r = Math.floor(v), fx = u - c, fz = v - r;
      const a = corner(r, c), b = corner(r, c + 1), d = corner(r + 1, c), e = corner(r + 1, c + 1);
      return fx + fz <= 1 ? a + (b - a) * fx + (d - a) * fz : e + (d - e) * (1 - fx) + (b - e) * (1 - fz);
    };
    P.needsUpdate = true;
    terrain.geometry.computeVertexNormals();
    terrain.geometry.computeBoundingSphere();
    const nor = terrain.geometry.attributes.normal, col = terrain.geometry.attributes.color;
    const C = new THREE.Color();
    const MEADOW = [new THREE.Color(0x5f8f3e), new THREE.Color(0x6f9c46), new THREE.Color(0x7fa64e)], FOREST = new THREE.Color(0x2f4a2c), FOREST2 = new THREE.Color(0x3a5632),
      ROCK = new THREE.Color(0x6c6e70), DARKROCK = new THREE.Color(0x55585b), SCREE = new THREE.Color(0x8d8b85), SNOWC = new THREE.Color(0xf3f6f9), SHORE = new THREE.Color(0x5e5a52),
      WEED = new THREE.Color(0x4a4a2e), HEATH = new THREE.Color(0x76704a);
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2], ny = nor.getY(i), h = y - WL;
      const n1 = Math.sin(x * 0.11) * Math.cos(z * 0.13), n2 = Math.sin(x * 0.031 + z * 0.027);
      C.copy(MEADOW[(n1 > 0.3 ? 2 : n1 < -0.3 ? 0 : 1)]);
      const f = forestAt(x, z);
      if (E[i] > 12 && h < 190) C.lerp(f > 0.5 ? FOREST : FOREST2, smooth(0.25, 0.55, f) * smooth(190, 150, h) * (0.5 + 0.5 * smooth(30, 60, h + 40 * (1 - bench(0)))));
      if (h > 150) C.lerp(HEATH, smooth(150, 210, h) * 0.8);
      const steep = smooth(0.8, 0.6, ny);
      if (steep > 0) C.lerp(n1 > 0 ? ROCK : DARKROCK, steep);
      if (ny > 0.6 && ny < 0.78 && h > 120) C.lerp(SCREE, 0.3 * (1 - steep));
      const snow = smooth(SNOW - 20 + 18 * n2, SNOW + 15 + 18 * n2, y) * (0.35 + 0.65 * smooth(0.55, 0.8, ny));
      if (snow > 0) C.lerp(SNOWC, snow).multiplyScalar(1 + 0.2 * snow);
      if (h < 3.5 && h > -6) C.lerp(h > 1.2 ? SHORE : WEED, 0.85); // (the rocky shore, the weed under the water's edge)
      col.setXYZ(i, C.r, C.g, C.b);
    }
    col.needsUpdate = true;
  }
  const ground = (x, z, fallback) => land ? land(x, z) : fallback;

  // ---- MERGING: what stands still, by CHUNK m of road, into one geometry of vertex colours (and what glows, into another)
  const chunks = new Map(), glows = new Map();
  const chunkOf = (map, s) => { const k = Math.floor(s / CHUNK); let c = map.get(k); if (!c) map.set(k, c = { pos: [], nor: [], col: [], idx: [], k }); return c; };
  const tpl = (geometry, flat = true) => {
    let g = geometry;
    if (flat) { g = g.index ? g.toNonIndexed() : g.clone(); g.computeVertexNormals(); }
    const pos = g.attributes.position.array, nor = g.attributes.normal.array, n = pos.length / 3;
    return { pos, nor, n, idx: g.index ? Array.from(g.index.array) : Array.from({ length: n }, (_, i) => i) };
  };
  const BOX = tpl(new THREE.BoxGeometry(1, 1, 1), false);
  const PRISM = tpl((() => { // a gable: 1 across, 1 tall, 1 long, its ridge along z, its foot on y = 0
    const g = new THREE.BufferGeometry(), a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0, 1, -0.5], d = [-0.5, 0, 0.5], e = [0.5, 0, 0.5], f = [0, 1, 0.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...c, ...b, ...d, ...e, ...f, ...a, ...d, ...c, ...c, ...d, ...f, ...b, ...c, ...e, ...c, ...f, ...e], 3));
    return g;
  })());
  const CYL = tpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, false), false);
  const ROCKS = [0, 1, 2].map((k) => {
    const g = new THREE.IcosahedronGeometry(0.5, 0), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { const j = 0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453 % 1); a.setXYZ(i, a.getX(i) * j, a.getY(i) * j, a.getZ(i) * j); }
    return tpl(g);
  });
  const whiten = (c) => (c.r > 0.72 && c.g > 0.76 && c.b > 0.8 ? c.multiplyScalar(1.2) : c);
  const M = new THREE.Matrix4(), NM = new THREE.Matrix3(), Q = new THREE.Quaternion(), EU = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), CL = new THREE.Color();
  const BASE = new THREE.Matrix4(), LOCAL = new THREE.Matrix4();
  const emit = (c, T, m, color) => {
    const base = c.pos.length / 3, e = m.elements;
    NM.getNormalMatrix(m);
    const ne = NM.elements;
    whiten(CL.set(color));
    for (let i = 0; i < T.n; i++) {
      const x = T.pos[i * 3], y = T.pos[i * 3 + 1], z = T.pos[i * 3 + 2];
      c.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const a = T.nor[i * 3], b = T.nor[i * 3 + 1], d = T.nor[i * 3 + 2];
      let nx = ne[0] * a + ne[3] * b + ne[6] * d, ny = ne[1] * a + ne[4] * b + ne[7] * d, nz = ne[2] * a + ne[5] * b + ne[8] * d;
      const l = Math.hypot(nx, ny, nz) || 1;
      c.nor.push(nx / l, ny / l, nz / l);
      c.col.push(CL.r, CL.g, CL.b);
    }
    for (const k of T.idx) c.idx.push(base + k);
  };
  const part = (s, T, color, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, map = chunks) => {
    M.compose(V.set(x, y, z), Q.setFromEuler(EU.set(rx, ry, rz, 'YXZ')), SC.set(sx, sy, sz));
    emit(chunkOf(map, s), T, M, color);
  };
  // a model of parts set at world (x, y, z) facing ry: parts [T, lx, ly, lz, sx, sy, sz, colour, ry?, rx?, rz?, glow?]
  const model = (s, x, y, z, ry, parts) => {
    BASE.compose(V.set(x, y, z), Q.setFromEuler(EU.set(0, ry, 0)), SC.set(1, 1, 1));
    for (const [T, lx, ly, lz, sx, sy, sz, color, pry = 0, prx = 0, prz = 0, lit = false] of parts) {
      LOCAL.compose(V.set(lx, ly, lz), Q.setFromEuler(EU.set(prx, pry, prz, 'YXZ')), SC.set(sx, sy, sz));
      M.multiplyMatrices(BASE, LOCAL);
      emit(chunkOf(lit ? glows : chunks, s), T, M, color);
    }
  };
  // ---- RIBBONS: a cross-section swept along the road from s0 to s1 on a side (profile [[d, y], ...]: d m beyond the pavement's
  // edge, negative over the road; y m over the road; either may be a function of s), the open air on its left as it is walked
  const OUT = {}, A = {}, B = {};
  const ribbon = (s0, s1, side, profile, colours, step = 2, on = () => true, map = chunks) => {
    const val = (v, s) => typeof v === 'function' ? v(s) : v;
    for (let e = 0; e < profile.length - 1; e++) {
      let c = null, last = -1, prevChunk = null;
      for (let s = s0; ; s = Math.min(s1, s + (Math.abs(Track.bend(s)) > 0.008 || Math.abs(Track.bend(s + step * 3)) > 0.008 ? step : step * 3))) {
        const k = Math.floor(s / CHUNK);
        if (!on(s)) { last = -1; if (s >= s1) break; continue; }
        if (prevChunk !== k && last >= 0) { // (carry the strip over into the next chunk: its last row again, there)
          const cc = chunkOf(map, s), from = c, n = from.pos.length / 3 - 2;
          for (let j = 0; j < 2; j++) { cc.pos.push(from.pos[(n + j) * 3], from.pos[(n + j) * 3 + 1], from.pos[(n + j) * 3 + 2]); cc.nor.push(from.nor[(n + j) * 3], from.nor[(n + j) * 3 + 1], from.nor[(n + j) * 3 + 2]); cc.col.push(from.col[(n + j) * 3], from.col[(n + j) * 3 + 1], from.col[(n + j) * 3 + 2]); }
          last = cc.pos.length / 3 - 2;
        }
        c = chunkOf(map, s); prevChunk = k;
        const [d1, y1] = profile[e], [d2, y2] = profile[e + 1];
        const da = val(d1, s), ya = val(y1, s), db = val(d2, s), yb = val(y2, s);
        Track.toWorld(s, beside(side, s, da), A); Track.toWorld(s, beside(side, s, db), B);
        Track.toWorld(s, beside(side, s, da + 1), OUT);
        let ox = OUT.x - A.x, oz = OUT.z - A.z; const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
        const ed = db - da, ey = yb - ya, el = Math.hypot(ed, ey) || 1, nd = -ey / el, nu = ed / el;
        const nx = nd * ox, ny = nu, nz = nd * oz;
        whiten(CL.set(typeof colours === 'function' ? colours(e, s) : colours[Math.min(e, colours.length - 1)]));
        const n = c.pos.length / 3;
        c.pos.push(A.x, A.y + ya, A.z, B.x, B.y + yb, B.z);
        c.nor.push(nx, ny, nz, nx, ny, nz);
        c.col.push(CL.r, CL.g, CL.b, CL.r, CL.g, CL.b);
        if (last >= 0) {
          const a = last, b = last + 1, a2 = n, b2 = n + 1, PP = c.pos;
          const ux = PP[a2 * 3] - PP[a * 3], uy = PP[a2 * 3 + 1] - PP[a * 3 + 1], uz = PP[a2 * 3 + 2] - PP[a * 3 + 2];
          const vx = PP[b * 3] - PP[a * 3], vy = PP[b * 3 + 1] - PP[a * 3 + 1], vz = PP[b * 3 + 2] - PP[a * 3 + 2];
          const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
          if (gx * nx + gy * ny + gz * nz >= 0) c.idx.push(a, a2, b, b, a2, b2); else c.idx.push(a, b, a2, b, b2, a2);
        }
        last = n;
        if (s >= s1) break;
      }
    }
  };

  // ---- what keeps clear of what: the level's targets, the rockfall's slope, the tunnels' mouths; and every stretch of road
  const keeps = [];
  const sideOf = (x) => x === 'left' ? -1 : x === 'right' ? 1 : 0;
  for (const t of LEVEL.targets || []) keeps.push([t.s - 8, t.s + 8, sideOf(t.side), 'props']);
  for (const r of LEVEL.rockfall || []) keeps.push([r.from - 12, r.to + 12, sideOf(r.side), 'all']);
  for (const t of tunnels) keeps.push([t.from - 14, t.to + 14, 0, 'all']);
  const kept = (s, side, what = 'props') => keeps.some(([a, b, sd, w]) => s > a && s < b && (!sd || sd === side) && (w === 'all' || what === 'props'));
  const taken = [];
  const free = (x, z, r) => !taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < r + tr);
  const claim = (x, z, r) => taken.push([x, z, r]);
  const spotClear = (x, z, r) => roads.near(x, z, r + 40).d > W2 + r + 0.6 && offRoads(x, z, r);
  // a spot d m off the pavement at s on a side, clear for something r m round, on land no steeper than `rise` m over its width:
  // sets p (p.land, p.heading: facing the road)
  const site = (s, side, d, r, rise = 2.5) => {
    Track.toWorld(s, beside(side, s, d), p);
    if (inJunction(s) || inTunnel(s, 40) || !spotClear(p.x, p.z, r) || !free(p.x, p.z, r)) return null;
    let lo = Infinity, hi = -Infinity;
    for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) { const y = ground(p.x + a * 0.7, p.z + b * 0.7, p.y - 0.3); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (hi - lo > rise) return null;
    p.land = lo; p.top = hi;
    const x = p.x, z = p.z;
    Track.toWorld(s, beside(side, s, 0), q);
    p.heading = Math.atan2(q.x - x, q.z - z);
    return true;
  };

  // ---- THE SKY: a dome from the haze at the horizon to a deep clear blue overhead, the sun; round whoever is looking. And a ring of
  // snow-capped peaks round them, far off, the haze in it
  {
    const HORIZON = new THREE.Color(theme.sky), MID = new THREE.Color(0x9cc4e4), TOP = new THREE.Color(0x3a76bc);
    const geo = new THREE.SphereGeometry(640, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), col = [], pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = Math.max(0, pos.getY(i) / 640), c = new THREE.Color();
      if (u < 0.2) c.copy(HORIZON).lerp(MID, u / 0.2); else c.copy(MID).lerp(TOP, Math.min(1, (u - 0.2) / 0.7));
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    const SUN = new THREE.Vector3(-0.5, 0.5, -0.6).normalize().multiplyScalar(600);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(14, 20), new THREE.MeshBasicMaterial({ color: 0xfffbea, fog: false, depthWrite: false }));
    const R = 600, NS = 160, ring = [], rcol = [], ridx = [];
    const peak = (a) => { let h = 0; for (const [f, amp, ph] of [[3, 60, 0.9], [7, 50, 1.3], [13, 28, 0.2], [31, 9, 2.1]]) h += amp * Math.abs(Math.sin(a * f / 2 + ph)); return 110 + h * 0.9; };
    const haze = new THREE.Color(theme.sky), rock = new THREE.Color(0x66727e), snow = new THREE.Color(0xf2f6fb), C = new THREE.Color();
    const LAYERS = [-140, 0.3, 0.6, 0.78, 0.9, 1];
    for (let i = 0; i <= NS; i++) {
      const a = i / NS * Math.PI * 2, top = peak(a), sx = Math.sin(a), cz = Math.cos(a);
      for (let l = 0; l < LAYERS.length; l++) {
        const y = l === 0 ? LAYERS[0] : WL - 40 + (top + 40) * LAYERS[l], rr = R - (l === LAYERS.length - 1 ? 10 : 0) - Math.sin(a * 9 + l) * 6;
        ring.push(sx * rr, y, cz * rr);
        const line = WL + 120 + 25 * Math.sin(a * 5 + 0.7) + 12 * Math.sin(a * 13), snowy = y > line;
        C.copy(snowy ? snow : rock);
        if (snowy && (l === 3 || l === 4) && Math.sin(a * 37 + l) > 0.5) C.lerp(rock, 0.55);
        C.lerp(haze, l === 0 ? 0.8 : 0.5 - l * 0.04);
        rcol.push(C.r, C.g, C.b);
      }
    }
    const NL = LAYERS.length;
    for (let i = 0; i < NS; i++) for (let l = 0; l < NL - 1; l++) { const a = i * NL + l, b = a + NL; ridx.push(a, a + 1, b, b, a + 1, b + 1); }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
    rg.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3));
    rg.setIndex(ridx);
    const peaks = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    // THE WATER: a disc round whoever is looking, at the fjord's level (under the land wherever that stands above it), darker far out
    const wg = new THREE.CircleGeometry(1500, 40, 0, Math.PI * 2).rotateX(-Math.PI / 2), wp = wg.attributes.position, wc = [];
    const NEAR = new THREE.Color(0x24607e), FAR = new THREE.Color(0x173f5c);
    for (let i = 0; i < wp.count; i++) { C.copy(NEAR).lerp(FAR, Math.min(1, Math.hypot(wp.getX(i), wp.getZ(i)) / 900)); wc.push(C.r, C.g, C.b); }
    wg.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
    const water = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ vertexColors: true }));
    water.userData.flat = true;
    for (const thing of [dome, disc, peaks, water]) { thing.frustumCulled = false; levelGroup.add(thing); }
    dome.renderOrder = -3; disc.renderOrder = -2.9; peaks.renderOrder = -2.8;
    dome.onBeforeRender = (renderer, scene, camera) => {
      const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x;
      dome.position.set(x, camera.position.y - 4, camera.position.z);
      disc.position.set(x + SUN.x, camera.position.y + SUN.y, camera.position.z + SUN.z);
      disc.lookAt(x, camera.position.y, camera.position.z);
      peaks.position.set(x, 0, camera.position.z);
      water.position.set(x, WL, camera.position.z);
      for (const o of [dome, disc, peaks, water]) o.updateMatrixWorld();
    };
    stats.meshes += 4; stats.triangles += geo.index.count / 3 + 20 + ridx.length / 3 + 40;
    stats.water = WL;
  }

  // ---- THE ROAD'S OWN ---------------------------------------------------------------------------------------------------------
  const RAIL = 0xb6bcc2, STEELPOST = 0x6a7076;
  const open = (s, pad = 6) => !inTunnel(s, pad) && s > S0 && s < S1;
  // a steel rail on posts along the water's side (not on the benches' shore, nor at the quay)
  const railOn = (s) => open(s, 2) && bench(s) < 0.5 && !(quay && s > quay - 40 && s < quay + 40);
  ribbon(S0, S1, WATER, [[0.55, 0.45], [0.55, 0.82], [0.68, 0.82], [0.68, 0.45], [0.55, 0.45]], [RAIL, 0xd0d4d8, 0x8f969c, 0x6f767c], 2, railOn);
  for (let s = Math.ceil(S0 / 4) * 4; s < S1; s += 4) {
    if (!railOn(s)) continue;
    Track.toWorld(s, beside(WATER, s, 0.72), p);
    part(s, BOX, STEELPOST, p.x, p.y + 0.38, p.z, 0.12, 0.85, 0.12, Track.toWorld(s, 0, q));
  }
  // marker posts both sides every 25 m (white, a black band, a reflector), tall orange snow poles every 50 m on the wall's side
  for (let s = S0 + 10; s < S1 - 2; s += 25) {
    if (!open(s, 4)) continue;
    const h = Track.toWorld(s, 0, q);
    for (const side of [-1, 1]) {
      if (kept(s, side)) continue;
      Track.toWorld(s, beside(side, s, side === WATER && railOn(s) ? 1.1 : 0.9), p);
      part(s, BOX, 0xf4f4f0, p.x, p.y + 0.55, p.z, 0.12, 1.1, 0.12, h);
      part(s, BOX, 0x1e1e1e, p.x, p.y + 0.86, p.z, 0.125, 0.22, 0.125, h);
      part(s, BOX, side === WATER ? 0xf2f2f2 : 0xf2a01c, p.x, p.y + 0.86, p.z, 0.13, 0.08, 0.13, h, 0, 0, glows); // (the reflector)
      if (side !== WATER && Math.round(s / 25) % 2 === 0) {
        Track.toWorld(s, beside(side, s, 1.6), p);
        part(s, BOX, 0xf07a12, p.x, p.y + 1.6, p.z, 0.07, 3.2, 0.07, h);
        part(s, BOX, 0x1e1e1e, p.x, p.y + 3.0, p.z, 0.075, 0.2, 0.075, h);
      }
    }
  }

  // ---- THE TUNNELS: the mountain over each (a ribbon banked over the roof from the cutting on one side to the other, its ends a rock
  // face round the portal), and inside a cable tray, emergency cabinets, and in the first the underground roundabout's cavern
  const ROCKC = [0x6a6c6e, 0x5f6264, 0x76736d, 0x55585b];
  tunnels.forEach((t, ti) => {
    const H = heightOf(t), span = (s) => Track.hi(s) - Track.lo(s);
    const top = (k) => (s) => H(s) + k;
    // (from the water's side's land at 14 m, over the roof, to the wall's side's at 14 m)
    const edgeY = (side, d) => (s) => { Track.toWorld(s, beside(side, s, d), q); return Math.max(H(s) + 5, ground(q.x, q.z, q.y + H(s)) - q.y - 0.6); };
    ribbon(t.from, t.to, WATER, [[14, edgeY(WATER, 14)], [6, top(5.2)], [0.3, top(3.4)], [(s) => -span(s) / 2, top(4.2)], [(s) => -span(s) - 0.3, top(3.4)], [(s) => -span(s) - 6, top(5.2)], [(s) => -span(s) - 14, edgeY(-WATER, 14)]],
      (e, s) => ROCKC[(e + Math.floor(s / 37)) % 4], 3);
    // the rock face round each portal: a fan from the ribbon's cross-section down to the road's level either side of the opening
    for (const [end, out] of [[t.from, -1], [t.to, 1]]) {
      const s = end + out * 0.7, h = H(end), c = chunkOf(chunks, s), base = c.pos.length / 3;
      const ring = [];
      const lats = [[WATER, 16], [WATER, 14], [WATER, 6], [WATER, 0.3], [WATER, -span(s) / 2], [WATER, -span(s) - 0.3], [WATER, -span(s) - 6], [WATER, -span(s) - 14], [WATER, -span(s) - 16]];
      const ys = [0, edgeY(WATER, 14)(s), h + 5.2, h + 3.4, h + 4.2, h + 3.4, h + 5.2, edgeY(-WATER, 14)(s), 0];
      lats.forEach(([sd, d], k) => { Track.toWorld(s, beside(sd, s, d), A); ring.push([A.x, A.y + (k === 0 || k === lats.length - 1 ? ys[k] + Math.max(0, ground(A.x, A.z, A.y) - A.y) : ys[k]), A.z]); });
      // (the face's lower edge: the portal's top at h + 9, the land at the sides)
      const n = Track.toWorld(s, 0, q), fx = Math.sin(n) * out, fz = Math.cos(n) * out;
      CL.set(0x606365);
      Track.toWorld(s, (Track.lo(s) + Track.hi(s)) / 2, B);
      const mid = [B.x, B.y + h + 8.6, B.z];
      for (const v of [mid, ...ring]) { c.pos.push(...v); c.nor.push(fx, 0, fz); c.col.push(CL.r, CL.g, CL.b); }
      for (let k = 0; k < ring.length - 1; k++) { const a = base, b = base + 1 + k, d = base + 2 + k; if (out > 0) c.idx.push(a, b, d); else c.idx.push(a, d, b); }
    }
    // the cable tray down the wall's side, at 5.6 m; a green emergency cabinet every 125 m, sides in turn; a lamp over each
    const wallAt = (side, s, d) => side < 0 ? Track.lo(s) - 0.3 + d : Track.hi(s) + 0.3 - d;
    for (let s = t.from + 2; s < t.to - 2; s += 6) {
      const h = Track.toWorld(s, wallAt(-WATER, s, 0.2), p);
      part(s, BOX, 0x3a3d42, p.x, p.y + 5.6, p.z, 0.3, 0.12, 6.05, h);
    }
    for (let s = t.from + 60, k = 0; s < t.to - 30; s += 125, k++) {
      const side = k % 2 ? 1 : -1, h = Track.toWorld(s, wallAt(side, s, 0.12), p);
      part(s, BOX, 0x1f8a4a, p.x, p.y + 1.3, p.z, 0.2, 1.8, 1.2, h);
      part(s, BOX, 0x7fe0a0, p.x, p.y + 2.45, p.z, 0.22, 0.25, 0.6, h, 0, 0, glows);
    }
    // the cavern of the underground roundabout, half way through the first tunnel (if it is long enough): the side tunnels' mouths
    // in both walls (dark, their arches outlined), blue light washed up the walls and a ring of it on the ceiling
    if (ti === 0 && t.to - t.from > 240) {
      const c0 = (t.from + t.to) / 2;
      for (const side of [-1, 1]) {
        const h = Track.toWorld(c0, wallAt(side, c0, 0.06), p);
        part(c0, BOX, 0x07090c, p.x, p.y + 3.2, p.z, 0.04, 6.4, 11, h);                      // the mouth
        Track.toWorld(c0, wallAt(side, c0, 0.08), p);
        part(c0, BOX, 0x3aa8ff, p.x, p.y + 6.55, p.z, 0.06, 0.18, 11.4, h, 0, 0, glows);     // its outline, lit
        for (const ds of [-5.7, 5.7]) { Track.toWorld(c0 + ds, wallAt(side, c0 + ds, 0.08), p); part(c0, BOX, 0x3aa8ff, p.x, p.y + 3.3, p.z, 0.06, 6.5, 0.18, h, 0, 0, glows); }
      }
      for (let s = c0 - 32; s <= c0 + 32; s += 4) {
        if (Math.abs(s - c0) < 7) continue;
        for (const side of [-1, 1]) { const h = Track.toWorld(s, wallAt(side, s, 0.05), p); part(s, BOX, 0x1d5fb0, p.x, p.y + 2.6, p.z, 0.04, 4.6, 3.2, h, 0, 0, glows); }
      }
      const hh = H(c0), mid = (Track.lo(c0) + Track.hi(c0)) / 2, rr = Math.min(span(c0) / 2 - 0.6, 6);
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2, s = c0 + Math.cos(a) * rr, lat = mid + Math.sin(a) * rr, h = Track.toWorld(s, lat, p);
        part(c0, BOX, 0x6ac8ff, p.x, p.y + hh - 0.08, p.z, 0.3, 0.1, rr * 0.3, h + a, 0, 0, glows);
      }
      stats.cavern = c0;
    }
  });

  // ---- BUILDINGS: a timber cabin (Falu red or white or ochre, white corner boards and window frames, a turf or a slate roof), and a
  // boathouse (red, its gable to the water, on stilts at the water's edge)
  const WALLS = [0x9b2d20, 0x9b2d20, 0x8e2a1f, 0xeeeae0, 0xd9a441], ROOFS = [0x5d7a3a, 0x4f6e34, 0x2a2c30, 0x3a3c40];
  const cabin = (s, x, y, z, ry, w, dep, two) => {
    const wall = pick(WALLS), trim = wall === 0xeeeae0 ? 0x3a3c40 : 0xf4f2ec, roofC = pick(ROOFS), turf = roofC === 0x5d7a3a || roofC === 0x4f6e34;
    const h = two ? 5.2 : 2.9, pitch = 0.5, rise = (w / 2 + 0.5) * Math.tan(pitch), run = (w / 2 + 0.5) / Math.cos(pitch);
    const parts = [
      [BOX, 0, -0.6 + 0.5, 0, w + 0.4, 1.2, dep + 0.4, 0x5a5a56],                 // the stone footing
      [BOX, 0, 0.9 + h / 2, 0, w, h, dep, wall],
      [PRISM, 0, 0.9 + h, 0, w - 0.06, rise * 0.94, dep - 0.06, wall],
      [BOX, -(w / 4 + 0.25), 0.9 + h + rise / 2, 0, run, turf ? 0.42 : 0.2, dep + 0.9, roofC, 0, 0, pitch],
      [BOX, w / 4 + 0.25, 0.9 + h + rise / 2, 0, run, turf ? 0.42 : 0.2, dep + 0.9, roofC, 0, 0, -pitch],
      [BOX, w * 0.25, 0.9 + h + rise * 0.7, -dep * 0.15, 0.6, rise + 0.8, 0.6, 0x7a776f], // the chimney
    ];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([BOX, sx * (w / 2 + 0.02), 0.9 + h / 2, sz * (dep / 2 + 0.02), 0.16, h, 0.16, trim]); // corner boards
    const floors = two ? 2 : 1;
    for (let f = 0; f < floors; f++) {
      const wy = 0.9 + 1.5 + f * 2.5;
      for (const wx of [-w * 0.25, w * 0.25]) {
        parts.push([BOX, wx, wy, dep / 2 + 0.03, 0.9, 1.0, 0.08, 0x23303c], [BOX, wx, wy, dep / 2 + 0.05, 1.08, 0.12, 0.1, trim], [BOX, wx, wy - 0.56, dep / 2 + 0.05, 1.08, 0.12, 0.1, trim], [BOX, wx, wy + 0.56, dep / 2 + 0.05, 1.08, 0.12, 0.1, trim]);
      }
      for (const sd of [-1, 1]) parts.push([BOX, sd * (w / 2 + 0.03), wy, 0, 0.08, 1.0, 0.9, 0x23303c], [BOX, sd * (w / 2 + 0.05), wy, 0, 0.1, 1.15, 1.08, trim]);
    }
    parts.push([BOX, 0, 0.9 + 1.05, -dep / 2 - 0.03, 1.0, 2.1, 0.08, trim === 0xf4f2ec ? 0x2a4a6a : 0x6a2a20]); // the door, at the back
    model(s, x, y, z, ry, parts);
    solid('cabin', s, x, z, Math.hypot(w, dep) / 2 + 0.5, y - 0.6, y + 0.9 + h + rise);
  };
  const boathouse = (s, x, y, z, ry, w, dep) => { // (y: the deck's height; the stilts go down to under the water)
    const RED = 0x9b2d20, h = 3, pitch = 0.6, rise = (w / 2 + 0.4) * Math.tan(pitch), run = (w / 2 + 0.4) / Math.cos(pitch), legs = y - (WL - 2);
    const parts = [[BOX, 0, 0.1, 0, w + 0.6, 0.2, dep + 0.6, 0x6b5a45], [BOX, 0, 0.2 + h / 2, 0, w, h, dep, RED], [PRISM, 0, 0.2 + h, 0, w - 0.06, rise * 0.94, dep - 0.06, RED],
      [BOX, -(w / 4 + 0.2), 0.2 + h + rise / 2, 0, run, 0.2, dep + 0.8, 0x2a2c30, 0, 0, pitch], [BOX, w / 4 + 0.2, 0.2 + h + rise / 2, 0, run, 0.2, dep + 0.8, 0x2a2c30, 0, 0, -pitch],
      [BOX, 0, 0.2 + h * 0.45, dep / 2 + 0.03, w * 0.6, h * 0.8, 0.08, 0x5a1a14], [BOX, 0, 0.2 + h * 0.86, dep / 2 + 0.05, w * 0.64, 0.14, 0.1, 0xf4f2ec]];
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) parts.push([BOX, sx * w * 0.42, -legs / 2, sz * dep * 0.42, 0.3, legs, 0.3, 0x4a3a2a]);
    model(s, x, y, z, ry, parts);
    solid('boathouse', s, x, z, Math.hypot(w, dep) / 2 + 0.5, WL - 2, y + h + rise);
  };
  // the cabins on the benches: along both sides of the road, near and back from it, the wall's side mostly
  for (const [a, b] of BENCHES) {
    for (let s = Math.max(S0 + 25, a + 10); s < Math.min(S1 - 10, b - 10); s += range(26, 44)) {
      const side = rand() < 0.75 ? -WATER : WATER;
      if (kept(s, side)) continue;
      const w = range(6.5, 9), dep = range(5.5, 7.5), r = Math.hypot(w, dep) / 2 + 1;
      const d = side === WATER ? range(2.5, 4) + r : range(6, 34) + r;
      if (site(s, side, d, r) === null) continue;
      claim(p.x, p.z, r + 1.5);
      cabin(s, p.x, p.land, p.z, p.heading + (rand() - 0.5) * 0.5 + (rand() < 0.3 ? Math.PI / 2 : 0), w, dep, rand() < 0.35);
    }
  }
  // the boathouses at the water's edge, now and then where the shore is open (their gable to the water)
  for (let s = S0 + 60; s < S1 - 40; s += range(150, 260)) {
    if (!open(s, 30) || kept(s, WATER, 'all') || (quay && Math.abs(s - quay) < 70)) continue;
    // (out from the road to where the land meets the water)
    let d = 6;
    for (; d < 40; d += 1.5) { Track.toWorld(s, beside(WATER, s, d), p); if (ground(p.x, p.z, p.y) < WL + 0.4) break; }
    if (d >= 40) continue;
    const w = range(4.5, 6), dep = range(6.5, 8.5);
    Track.toWorld(s, beside(WATER, s, d - 1), p);
    if (!spotClear(p.x, p.z, 4) || !free(p.x, p.z, 5)) continue;
    claim(p.x, p.z, 5);
    Track.toWorld(s, beside(WATER, s, 0), q);
    boathouse(s, p.x, WL + 1.2, p.z, Math.atan2(p.x - q.x, p.z - q.z), w, dep);
  }

  // ---- THE FERRY QUAY near the end, on the water's side: a concrete apron off the road, bollards on its edge, the linkspan out over
  // the water on its steel gantry, the car ferry moored at it, bow on
  if (quay) {
    const L = 46, hq = Track.toWorld(quay, 0, q), ry = roadY(quay);
    const outAt = (d) => { Track.toWorld(quay, beside(WATER, quay, d), p); return { x: p.x, z: p.z }; };
    const fx = Math.sin(hq), fz = Math.cos(hq); // (along the road)
    const o0 = outAt(1.2), o1 = outAt(26), ox = (o1.x - o0.x) / 24.8, oz = (o1.z - o0.z) / 24.8; // (out to the water, a metre)
    const cx = (o0.x + o1.x) / 2, cz = (o0.z + o1.z) / 2;
    part(quay, BOX, 0xa9a69e, cx, ry - 0.03 - 3, cz, 24.8, 6, L, hq);                  // the apron, its top just under the road's
    part(quay, BOX, 0x8f8c85, cx + ox * 12.4, (ry + WL) / 2 - 1, cz + oz * 12.4, 0.6, ry - WL + 2, L, hq); // its face to the water
    for (const k of [-0.42, -0.14, 0.14, 0.42]) part(quay, CYL, 0x2a2c30, o1.x - ox * 0.6 + fx * k * L, ry + 0.3, o1.z - oz * 0.6 + fz * k * L, 0.45, 0.6, 0.45);
    // the linkspan: a ramp from the apron's edge 18 m out, its far end on the gantry at the water; the gantry's two towers and beam
    const lx = o1.x + ox * 9, lz = o1.z + oz * 9, turn = hq + Math.PI / 2, slope = Math.atan2(ry - (WL + 2.4), 18);
    part(quay, BOX, 0x5f666e, lx, (ry + WL + 2.4) / 2 - 0.3, lz, 9, 0.6, 18.4, turn, -slope * (WATER > 0 ? -1 : 1));
    for (const sd of [-1, 1]) {
      part(quay, BOX, 0xe0b020, lx + fx * sd * 4.6, (ry + WL + 2.4) / 2 + 0.2, lz + fz * sd * 4.6, 0.25, 0.9, 18.4, turn, -slope * (WATER > 0 ? -1 : 1));
      const tx = o1.x + ox * 17.5 + fx * sd * 6, tz = o1.z + oz * 17.5 + fz * sd * 6;
      part(quay, BOX, 0x5f666e, tx, WL + 6, tz, 1.4, 16, 1.4, turn);
    }
    part(quay, BOX, 0x5f666e, o1.x + ox * 17.5, WL + 13.4, o1.z + oz * 17.5, 13.4, 1.2, 1.6, turn + Math.PI / 2);
    // the ferry: its bow to the linkspan, out into the fjord
    const F = ferryParts(BOX), fl = 31 + 18.5;
    model(quay, o1.x + ox * fl, WL, o1.z + oz * fl, Math.atan2(ox, oz), F);
    solid('quay', quay, cx, cz, 26, WL, ry);
    solid('ferry', quay, o1.x + ox * fl, o1.z + oz * fl, 32, WL - 2, WL + 12);
    stats.quay = quay;
  }
  // ---- THE FERRY UNDER WAY: double-ended, crossing and recrossing the fjord on a line a little ahead of half way (it never turns)
  {
    const s = Track.length * 0.45, h = Track.toWorld(s, 0, q);
    Track.toWorld(s, beside(WATER, s, 45), p); const a = { x: p.x, z: p.z };
    Track.toWorld(s + 120, beside(WATER, s + 120, farAt(s) - 20), p); const b = { x: p.x, z: p.z };
    const c = { pos: [], nor: [], col: [], idx: [] };
    BASE.identity();
    for (const [T, lx, ly, lz, sx, sy, sz, color, pry = 0, prx = 0] of ferryParts(BOX)) {
      M.compose(V.set(lx, ly, lz), Q.setFromEuler(EU.set(prx, pry, 0, 'YXZ')), SC.set(sx, sy, sz));
      emit(c, T, M, color);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
    geo.setIndex(c.idx);
    const ferry = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ferry.matrixAutoUpdate = false;
    const run = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z), SPEED = 6, WAIT = 25;
    const cycle = 2 * (run / SPEED + WAIT);
    const place = (t) => {
      const u = ((t + 7) % cycle) / cycle * 2, f = u < 1 ? Math.min(1, Math.max(0, (u * cycle / 2 - WAIT) / (run / SPEED))) : 1 - Math.min(1, Math.max(0, ((u - 1) * cycle / 2 - WAIT) / (run / SPEED)));
      const e = f * f * (3 - 2 * f);
      ferry.position.set(a.x + (b.x - a.x) * e, WL, a.z + (b.z - a.z) * e);
      ferry.rotation.set(0, yaw, 0);
      ferry.updateMatrix();
    };
    place(0);
    levelGroup.add(ferry);
    everyFrame(levelGroup, place);
    stats.meshes++; stats.triangles += c.idx.length / 3;
    void h;
  }

  // ---- THE BRIDGE: a suspension bridge high over the road and the water beyond the end of the level, from the wall's side into the far
  // wall: two towers, the deck, the main cables sagging between, hangers
  {
    const s = S1 + 140, hb = Track.toWorld(Math.min(s, S1), 0, q), deckY = WL + 46;
    const at = (e) => { Track.toWorld(S1, beside(WATER, S1, e), p); const dx = Math.sin(hb) * (s - S1), dz = Math.cos(hb) * (s - S1); return { x: p.x + dx, z: p.z + dz, y: ground(p.x + dx, p.z + dz, WL - 10) }; };
    // (its ends: where the land comes up to the deck, each way)
    let e0 = -10; while (e0 > -220 && at(e0).y < deckY - 1) e0 -= 6;
    let e1 = 60; while (e1 < 420 && at(e1).y < deckY - 1) e1 += 6;
    const t0 = 20, t1 = Math.max(t0 + 120, e1 - 30), TOWER = 70;
    const turn = hb + Math.PI / 2;
    const A0 = at(e0), A1 = at(e1), len = Math.hypot(A1.x - A0.x, A1.z - A0.z);
    part(S1, BOX, 0x9a9ea2, (A0.x + A1.x) / 2, deckY, (A0.z + A1.z) / 2, 3, 1.6, len, Math.atan2(A1.x - A0.x, A1.z - A0.z));
    for (const e of [t0, t1]) {
      const T = at(e);
      for (const sd of [-1, 1]) part(S1, BOX, 0xb8b4aa, T.x + Math.sin(hb) * sd * 7, (WL + TOWER + deckY) / 2 - 10, T.z + Math.cos(hb) * sd * 7, 2.4, TOWER + 20, 2.4, turn);
      part(S1, BOX, 0xb8b4aa, T.x, WL + TOWER + 8, T.z, 2, 2, 16, turn + Math.PI / 2); part(S1, BOX, 0xb8b4aa, T.x, deckY - 2, T.z, 1.6, 2, 16, turn + Math.PI / 2);
    }
    for (const sd of [-1, 1]) { // the main cables, in pieces, and the hangers down to the deck
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const e = e0 + (e1 - e0) * k / 24, T = at(e);
        const y = e < t0 ? deckY + (WL + TOWER + 9 - deckY) * smooth(e0, t0, e) : e > t1 ? deckY + (WL + TOWER + 9 - deckY) * smooth(e1, t1, e) : deckY + 3 + (WL + TOWER + 6 - deckY) * (((e - t0) / (t1 - t0) - 0.5) * 2) ** 2;
        pts.push([T.x + Math.sin(hb) * sd * 7, y, T.z + Math.cos(hb) * sd * 7]);
      }
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay, az] = pts[k], [bx, by, bz] = pts[k + 1], l = Math.hypot(bx - ax, by - ay, bz - az);
        part(S1, BOX, 0x40464c, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, 0.5, 0.5, l, Math.atan2(bx - ax, bz - az), -Math.atan2(by - ay, Math.hypot(bx - ax, bz - az)));
        if (pts[k][1] > deckY + 2) part(S1, BOX, 0x40464c, ax, (ay + deckY) / 2, az, 0.12, ay - deckY, 0.12);
      }
    }
    stats.bridge = { s, e0, e1, deckY };
  }

  // ---- WATERFALLS: white falls down the wall (three) and the far wall (two), each a ribbon laid over the land from its lip down to
  // the foot, a pool of foam at the bottom
  const fall = (s, side, dTop, dFoot, width) => {
    const c = chunkOf(chunks, s), pts = [];
    for (let d = dTop; d >= dFoot; d -= 4) { Track.toWorld(s, beside(side, s, d), p); pts.push([p.x, Math.max(WL + 0.2, ground(p.x, p.z, p.y)) + 0.7, p.z]); }
    if (pts.length < 3) return;
    const h0 = Track.toWorld(s, 0, q), ax = Math.cos(h0) * width / 2, az = -Math.sin(h0) * width / 2;
    const n0 = Track.toWorld(s, beside(side, s, 0), A), ox = (A.x - pts[0][0]), oz = (A.z - pts[0][2]), ol = Math.hypot(ox, oz) || 1;
    void n0;
    pts.forEach(([x, y, z], k) => {
      const w = 0.6 + 0.4 * Math.sin(k * 0.7), base = c.pos.length / 3, tone = k % 3 === 0 ? 0xdfeef6 : 0xf6fbff;
      whiten(CL.set(tone));
      c.pos.push(x - ax * w, y, z - az * w, x + ax * w, y, z + az * w);
      c.nor.push(ox / ol, 0.3, oz / ol, ox / ol, 0.3, oz / ol);
      c.col.push(CL.r, CL.g, CL.b, CL.r, CL.g, CL.b);
      if (k) c.idx.push(base - 2, base, base - 1, base - 1, base, base + 1, base - 2, base - 1, base, base - 1, base + 1, base); // (both faces)
    });
    const [fx, fy, fz] = pts[pts.length - 1];
    part(s, ROCKS[0], 0xf2f8fb, fx, fy - 0.6, fz, width * 2.2, 1.2, width * 1.6, rand() * 6);
    solid('waterfall', s, fx, fz, width, fy, pts[0][1]);
  };
  for (const f of [0.14, 0.4, 0.8]) {
    const s = S0 + (S1 - S0) * f + range(-30, 30);
    if (kept(s, -WATER, 'all') || inTunnel(s, 60)) continue;
    fall(s, -WATER, range(150, 200), 18 + 44 * bench(s), range(3, 5));
  }
  for (const f of [0.3, 0.66]) { const s = S0 + (S1 - S0) * f; fall(s, WATER, farAt(s) + 150, farAt(s) - 10, range(5, 8)); }

  // ---- SPRUCE AND ROCKS over the land: spruce where the forest is thick and the slope will hold them, rock on the steep (outcrops near
  // the road, slabs over the rockfall's slope); a jittered grid over the land on both sides
  const spruceGeo = (() => {
    const c = { pos: [], nor: [], col: [], idx: [] };
    M.makeTranslation(0, 0.8, 0); emit(c, tpl(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 4, 1, true), false), M, 0x4a3424);
    for (const [r, y, h] of [[1.5, 1.0, 3.0], [1.15, 2.6, 2.6], [0.8, 4.0, 2.2], [0.45, 5.3, 1.6]]) { M.makeTranslation(0, y + h / 2, 0); emit(c, tpl(new THREE.ConeGeometry(r, h, 6, 1, true), false), M, 0x2a4428); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
    g.setIndex(c.idx);
    return g;
  })();
  const pines = new Map();
  const spruce = (s, x, y, z, h) => {
    const k = Math.floor(s / PINE_CHUNK);
    if (!pines.has(k)) pines.set(k, []);
    pines.get(k).push([x, y - 0.25, z, h / 6.1, rand() * 6.28, 0.78 + rand() * 0.38]);
  };
  {
    const STEP = 9, done = new Set();
    for (let s = S0 - 40; s < S1 + 40; s += STEP) {
      for (const side of [-1, 1]) {
        const reach = side === WATER ? farAt(s) + 110 : 190;
        for (let d = 6; d < reach; d += STEP * (d > 90 ? 1.4 : 1)) {
          const jx = range(-3.5, 3.5), jd = range(-3, 3);
          Track.toWorld(s + jx, beside(side, s + jx, d + jd), p);
          const key = Math.floor(p.x / STEP) * 100003 + Math.floor(p.z / STEP);
          if (done.has(key)) continue;
          done.add(key);
          const r = roads.near(p.x, p.z, 40), gap = r.d - W2;
          if (gap < 6 || !offRoads(p.x, p.z, 2) || !free(p.x, p.z, 2)) continue;
          if (kept(r.s, side) && gap < 10) continue;
          if (inTunnel(r.s, 20) && gap < 16) continue;
          const y = ground(p.x, p.z, p.y - 0.3);
          if (y < WL + 1.5) continue; // (in the water)
          const gx = ground(p.x + 2, p.z, y) - ground(p.x - 2, p.z, y), gz = ground(p.x, p.z + 2, y) - ground(p.x, p.z - 2, y), lean = Math.hypot(gx, gz) / 4;
          if (lean > 1.0) { // rock
            if (gap < 60 && rand() < 0.18) { const sz = range(2, 5); part(r.s, pick(ROCKS), pick([0x6f7072, 0x66696b, 0x7a7872]), p.x, y - sz * 0.3, p.z, sz * range(1, 1.8), sz * range(0.6, 1), sz, rand() * 6.28, range(-0.3, 0.3)); }
            continue;
          }
          const f = forestAt(p.x, p.z), h = y - WL;
          if (h < 185 && f > 0.42 && rand() < 0.3 + (f - 0.42) * 1.5 && gap > 7) { spruce(r.s, p.x, y, p.z, range(8, 15) * (h > 140 ? 0.6 : 1)); continue; }
          if (rand() < 0.03 && gap > 7) { const sz = range(0.8, 2); part(r.s, pick(ROCKS), 0x7a7872, p.x, y + sz * 0.2, p.z, sz * 1.3, sz * 0.8, sz, rand() * 6.28); }
        }
      }
    }
    // the rock face over each rockfall: slabs and blocks banked up the slope it comes down
    for (const rf of LEVEL.rockfall || []) {
      const side = sideOf(rf.side) || -WATER;
      for (let s = rf.from - 10; s < rf.to + 10; s += 4.5) {
        for (let d = 8; d < (rf.out ?? 14) + 12; d += range(3, 5)) {
          if (rand() < 0.45) continue;
          Track.toWorld(s, beside(side, s, d), p);
          const y = ground(p.x, p.z, p.y), sz = range(2.2, 4.5) * (d > 12 ? 1.3 : 1);
          if (y < p.y + 1 && d < 12) continue;
          part(s, pick(ROCKS), pick([0x6f7072, 0x66696b, 0x7d7a74]), p.x, y - sz * 0.25, p.z, sz * 1.4, sz * 0.9, sz, rand() * 6.28, range(-0.4, 0.4), range(-0.3, 0.3));
        }
      }
    }
  }

  // ---- OUT: the merged chunks, one mesh each (and their glow); the spruce, one instanced mesh a chunk
  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  for (const [map, mat] of [[chunks, solidMat], [glows, glowMat]]) {
    for (const c of map.values()) {
      if (!c.idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
      geo.setIndex(c.idx);
      geo.computeBoundingSphere();
      levelGroup.add(new THREE.Mesh(geo, mat));
      stats.meshes++; stats.triangles += c.idx.length / 3;
      stats.chunks.push({ from: c.k * CHUNK, to: (c.k + 1) * CHUNK, triangles: c.idx.length / 3, glow: map === glows });
    }
  }
  if (pines.size) {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), D = new THREE.Object3D(), tint = new THREE.Color();
    for (const [k, list] of pines) {
      const mesh = new THREE.InstancedMesh(spruceGeo, mat, list.length);
      list.forEach(([x, y, z, sc, turn, t], i) => {
        D.position.set(x, y, z); D.rotation.set(0, turn, 0); D.scale.set(sc, sc * range(0.95, 1.2), sc); D.updateMatrix();
        mesh.setMatrixAt(i, D.matrix);
        mesh.setColorAt(i, tint.setRGB(t * 0.95, t, t * 0.92));
      });
      mesh.computeBoundingSphere();
      levelGroup.add(mesh);
      stats.meshes++; stats.instances += list.length; stats.triangles += spruceGeo.index.count / 3 * list.length;
      stats.chunks.push({ from: k * PINE_CHUNK, to: (k + 1) * PINE_CHUNK, triangles: spruceGeo.index.count / 3 * list.length, pines: list.length });
    }
  }
};
export const nordicStats = { last: null }; // (the last build's numbers and footprints: for a look in the console)
