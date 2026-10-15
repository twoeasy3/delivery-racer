// ---- the alpine pass (theme 'alpine', scenery 'alpinepass': the snow theme's older 'alpine' is road.js's). A high road in early
// summer, climbing out of a valley village in switchbacks to a col under the snow. The land is road.js's terrain, worked on here:
// lifted into mountains away from the road (sculpt, below: never within 45 m of it), a basin dug for a frozen lake under a glacier,
// and painted by height and slope: meadows low down, alpine grass and scree higher, rock where it is steep, snow on the heights.
// Along the road: a gravel verge, red-and-white snow poles, a steel rail on the valley side, stone retaining walls on the hill side,
// snow banks higher up and plough-cut walls of snow at the col; all of it built as continuous ribbons along the road's curve (no
// steps on a bend). The village of timber chalets round a church spire, chalets and hay barns in the meadows, pine forest up to
// the treeline, rock outcrops, a chair lift over the road (its empty chairs going round), a gondola high over the high valley
// (its cabins going over), the avalanche gallery (the level's tunnel, lit: a concrete roof on columns, open to the valley, the
// hill banked over it), a refuge hut and a snowplough at the col, hiking signposts; a ring of glaciered peaks and cloud banks
// round whoever is looking, and a cold bright sky (or the dusk's, alpineDusk: warm light, pink snow, lit windows).
// COST: what stands still is merged by 500 m of road into ONE mesh of vertex colours (boxes, roofs, ribbons, rocks), the pines
// into one instanced mesh by 1,000 m, the sky, the ring of peaks and clouds, the lake, the chairs and the cabins one mesh each:
// about a dozen draw calls in sight; one canvas texture (the signs), 256 x 256. Laid out from a seed of the level's own: the
// same every run. Drawn only: nothing here is read by the rules. (The models: alpineModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { everyFrame } from './sceneryClock.js';
import { chairGeometry, cabinGeometry } from './alpineModels.js';

export const ALPINE_TEXTURE_SIZE = 256; // (the signs' one canvas: scripts/.alpine-check.mjs holds it to its budget)
const CHUNK = 1000, PINE_CHUNK = 2000; // m of road to a merged mesh, and to a mesh of pines
const KEEP = 45;                       // m from any road's middle inside which the land is never touched
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- the road's samples in a grid of squares: the nearest stretch of road to a world point, its s and its height there
export const roadIndex = () => {
  const SQ = 32, cells = new Map(), xs = [], ys = [], zs = [], ss = [], p = {};
  for (let s = Track.start; s <= Track.end; s += 3) {
    Track.toWorld(s, (Track.lo(s) + Track.hi(s)) / 2, p);
    const k = Math.floor(p.x / SQ) * 100003 + Math.floor(p.z / SQ);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(xs.length);
    xs.push(p.x); ys.push(p.y); zs.push(p.z); ss.push(s);
  }
  // { d: m to the nearest sample (the pavement's middle), s, y } of the nearest, looked for within `reach` m (Infinity beyond)
  const near = (x, z, reach = 120) => {
    let best = Infinity, bi = -1;
    const n = Math.ceil(reach / SQ), cx = Math.floor(x / SQ), cz = Math.floor(z / SQ);
    for (let i = cx - n; i <= cx + n; i++) for (let j = cz - n; j <= cz + n; j++) {
      const list = cells.get(i * 100003 + j);
      if (list) for (const k of list) { const d = (x - xs[k]) ** 2 + (z - zs[k]) ** 2; if (d < best) { best = d; bi = k; } }
    }
    return bi < 0 ? { d: Infinity, s: 0, y: 0 } : { d: Math.sqrt(best), s: ss[bi], y: ys[bi] };
  };
  // a coarse field of the same over a box of the world (16 m squares, the road looked at every 12 m): far(x, z), m to the road's
  // middle, a few metres out at worst; near a road the exact one is used
  const field = (x0, z0, x1, z1) => {
    const C = 16, nx = Math.ceil((x1 - x0) / C) + 2, nz = Math.ceil((z1 - z0) / C) + 2, F = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * C, z = z0 + j * C;
      let best = Infinity;
      for (let k = 0; k < xs.length; k += 4) { const d = (x - xs[k]) ** 2 + (z - zs[k]) ** 2; if (d < best) best = d; }
      F[j * nx + i] = Math.sqrt(best);
    }
    return (x, z) => {
      const u = Math.max(0, Math.min(nx - 1.001, (x - x0) / C)), v = Math.max(0, Math.min(nz - 1.001, (z - z0) / C)), i = Math.floor(u), j = Math.floor(v), fx = u - i, fz = v - j;
      const d = F[j * nx + i] * (1 - fx) * (1 - fz) + F[j * nx + i + 1] * fx * (1 - fz) + F[(j + 1) * nx + i] * (1 - fx) * fz + F[(j + 1) * nx + i + 1] * fx * fz;
      return d < 70 ? near(x, z, 80).d : d;
    };
  };
  return { near, field };
};

// ---- the mountains: how much the land is lifted at (x, z), d m from the nearest road's middle (nothing within KEEP m), and a
// glacier's own rise (glacier: { x, z, dx, dz } the lake's middle and the way up the glacier from it). Shared with the check
const ridge = (x, z, f, a, b, ph) => { const v = 1 - Math.abs(Math.sin((x * a + z * b) * f + ph) * Math.cos((x * b - z * a) * f * 0.7 + ph * 1.7)); return v * v; };
export const lift = (x, z, d, glacier = null) => {
  if (d < KEEP) return 0;
  const massif = 0.55 + 0.45 * Math.sin(x * 0.0041 + 1.3) * Math.cos(z * 0.0036 - 0.4);
  const r = ridge(x, z, 0.0062, 0.8, 0.6, 0.3) + 0.55 * ridge(x, z, 0.013, -0.5, 0.86, 1.1) + 0.3 * ridge(x, z, 0.029, 0.96, -0.28, 2.2) + 0.16 * ridge(x, z, 0.06, 0.2, 0.98, 0.7);
  let up = (60 + 240 * massif * (r / 2.01)) * smooth(KEEP, 300, d);
  if (glacier) {
    const ux = x - glacier.x, uz = z - glacier.z, along = ux * glacier.dx + uz * glacier.dz, across = Math.abs(-ux * glacier.dz + uz * glacier.dx);
    if (along > 60) up += smooth(60, 420, along) * 180 * smooth(260, 120, across); // (the glacier's valley, rising from the lake to the snowfield)
  }
  return up;
};

export const alpinepass = ({ theme, offRoads, beside, inJunction, levelGroup: group }) => {
  // (everything added here is marked as the theme's own, so its cost can be told from the road's and the land's)
  const levelGroup = { children: group.children, add: (...things) => { for (const o of things) o.userData.alpine = true; return group.add(...things); } };
  // (laid out the same every time: a seed of the level's own)
  let seed = 7;
  for (const ch of (LEVEL.id || 'alpine') + ':alpine') seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rand() * (b - a);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const dusk = !!theme.dusk;
  const p = {}, q = {};
  const S0 = Track.start, S1 = Track.end;
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  const roads = roadIndex();
  const tunnels = LEVEL.tunnels || [];
  const inTunnel = (s, pad = 0) => tunnels.some(t => s > t.from - pad && s < t.to + pad);
  const roadY = (s) => { Track.toWorld(s, 0, q); return q.y; };
  const stats = { meshes: 0, triangles: 0, instances: 0, textureSide: ALPINE_TEXTURE_SIZE, solids: [], ribbons: [], chunks: [] };
  alpineStats.last = stats;

  // ---- which side of the road climbs: the side a switchback's next leg is on (the next hairpin's turn), where the level has one
  // ahead; the land's own say where it is drawn
  const hairpins = [];
  { let at = 0; for (const seg of LEVEL.segments || []) { if (Math.abs((seg.curve || 0) * seg.length) > 2.5) hairpins.push([at, at + seg.length, Math.sign(seg.curve)]); at += seg.length; } }
  const inHairpin = (s, pad = 0) => hairpins.some(([a, b]) => s > a - pad && s < b + pad);

  // ---- THE LAND: road.js's terrain mesh, read (land), lifted into mountains (lift), a lake's basin dug, and painted
  const terrain = levelGroup.children.find(m => m.isMesh && m.userData.terrain);
  let land = null;
  // the lake: in the high valley, on whichever side has the most room
  let lake = null;
  {
    let best = null;
    for (let s = 1980; s <= 2260 && s < Track.length - 100; s += 20) {
      for (const side of [-1, 1]) {
        Track.toWorld(s, beside(side, s, 95), p);
        const room = roads.near(p.x, p.z, 200).d;
        if (!best || room > best.room) best = { s, side, room, x: p.x, z: p.z };
      }
    }
    if (best && best.room > 80 && !hairpins.some(([a]) => a > 1900 && a < best.s)) {
      Track.toWorld(best.s, 0, q);
      Track.toWorld(best.s, beside(best.side, best.s, 95), p);
      const ux = p.x - q.x, uz = p.z - q.z, n = Math.hypot(ux, uz) || 1;
      lake = { s: best.s, side: best.side, x: p.x, z: p.z, dx: ux / n, dz: uz / n, rx: 62, rz: 38, level: q.y - 2.2 };
    }
  }
  const glacier = lake ? { x: lake.x, z: lake.z, dx: lake.dx, dz: lake.dz } : null;
  const inLake = (x, z, grow = 1) => {
    if (!lake) return false;
    const ux = x - lake.x, uz = z - lake.z, a = ux * lake.dx + uz * lake.dz, b = -ux * lake.dz + uz * lake.dx;
    return (b / (lake.rx * grow)) ** 2 + (a / (lake.rz * grow)) ** 2 < 1;
  };
  const SNOWLINE = 152; // (early summer: snow in patches round the col, and on the peaks)
  const snowAt = (x, z) => SNOWLINE + 16 * Math.sin(x * 0.021 + z * 0.013) + 12 * Math.sin(x * 0.057 - z * 0.041);
  const forestAt = (x, z) => 0.5 + 0.3 * Math.sin(x * 0.019 + 0.7) * Math.cos(z * 0.023 - 1.1) + 0.2 * Math.sin(x * 0.051 - z * 0.047);
  if (terrain) {
    const P = terrain.geometry.attributes.position, arr = P.array, N = P.count;
    const X0 = arr[0], Z0 = arr[2], G = arr[3] - arr[0];
    let cols = 1;
    while (cols < N && arr[cols * 3 + 2] === Z0) cols++;
    const rows = Math.floor(N / cols);
    // lifted into mountains, and the lake's basin dug (its floor under the ice, its shore easing up)
    const D = new Float32Array(N), far = roads.field(X0, Z0, arr[(N - 1) * 3], arr[(N - 1) * 3 + 2]);
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], z = arr[i * 3 + 2], d = far(x, z);
      D[i] = d;
      arr[i * 3 + 1] += lift(x, z, d, glacier);
    }
    const corner = (r, c) => arr[(Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c))) * 3 + 1];
    land = (x, z) => {
      const u = (x - X0) / G, v = (z - Z0) / G, c = Math.floor(u), r = Math.floor(v), fx = u - c, fz = v - r;
      const a = corner(r, c), b = corner(r, c + 1), d = corner(r + 1, c), e = corner(r + 1, c + 1);
      return fx + fz <= 1 ? a + (b - a) * fx + (d - a) * fz : e + (d - e) * (1 - fx) + (b - e) * (1 - fz);
    };
    if (lake) { // (the lake lies a little under the lowest point of the land round it, and the basin is dug under it: flat under the ice,
      // its shore rising 25 m for each lake's width out, so the ice is never above the land at its edge)
      let rim = Infinity;
      for (let k = 0; k < 40; k++) {
        const a = k / 40 * Math.PI * 2, lx = Math.cos(a) * lake.rx * 1.15, lz = Math.sin(a) * lake.rz * 1.15;
        rim = Math.min(rim, land(lake.x + lx * -lake.dz + lz * lake.dx, lake.z + lx * lake.dx + lz * lake.dz));
      }
      lake.level = Math.min(lake.level, rim - 0.7);
      const floor = lake.level - 1.5;
      for (let i = 0; i < N; i++) {
        const x = arr[i * 3], z = arr[i * 3 + 2];
        if (!inLake(x, z, 2.2)) continue;
        const rho = Math.sqrt(((x - lake.x) * -lake.dz + (z - lake.z) * lake.dx) ** 2 / lake.rx ** 2 + ((x - lake.x) * lake.dx + (z - lake.z) * lake.dz) ** 2 / lake.rz ** 2);
        arr[i * 3 + 1] = Math.min(arr[i * 3 + 1], floor + Math.max(0, rho - 1.02) * 25);
      }
    }
    P.needsUpdate = true;
    terrain.geometry.computeVertexNormals();
    terrain.geometry.computeBoundingSphere();
    // painted: by height (meadow, alpine grass, snow over the snowline), by slope (rock, and scree at its foot), forest floor where the
    // pines stand thick, the glacier's ice, and gravel beside the road
    const nor = terrain.geometry.attributes.normal, col = terrain.geometry.attributes.color;
    const C = new THREE.Color(), K = new THREE.Color();
    const MEADOW = [new THREE.Color(0x6f9c46), new THREE.Color(0x86a84f), new THREE.Color(0x9cae58)], ALP = new THREE.Color(0x9a9a62), ROCK = new THREE.Color(0x7d7973),
      DARKROCK = new THREE.Color(0x5f5c59), SCREE = new THREE.Color(0xa49e93), SNOW = new THREE.Color(dusk ? 0xf6dfe0 : 0xf3f6f9), FOREST = new THREE.Color(0x46633a),
      ICE = new THREE.Color(dusk ? 0xe6d6e8 : 0xd6ecf6), CREVASSE = new THREE.Color(0x8fb3c8), GRAVEL = new THREE.Color(0x9b968b);
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2], ny = nor.getY(i), d = D[i];
      const n1 = Math.sin(x * 0.11) * Math.cos(z * 0.13), n2 = Math.sin(x * 0.031 + z * 0.027);
      C.copy(MEADOW[(n1 > 0.3 ? 2 : n1 < -0.3 ? 0 : 1)]).lerp(MEADOW[0], 0.3 + 0.3 * n2);
      if (y > 88) C.lerp(ALP, smooth(88, 120, y));
      if (y < 100 && forestAt(x, z) > 0.62 && d > 16) C.lerp(FOREST, 0.75);
      const steep = smooth(0.86, 0.66, ny);
      if (steep > 0) C.lerp(n1 > 0 ? ROCK : DARKROCK, steep);
      if (ny > 0.66 && ny < 0.8 && y > 70) C.lerp(SCREE, 0.35 * (1 - steep));
      const snow = smooth(snowAt(x, z) - 6, snowAt(x, z) + 10, y) * (0.25 + 0.75 * smooth(0.62, 0.86, ny)); // (it lies on the gentle ground, not on the rock)
      if (snow > 0) C.lerp(SNOW, snow).multiplyScalar(1 + 0.22 * snow); // (snow a little over white: it is bright even in shade)
      if (glacier) {
        const ux = x - glacier.x, uz = z - glacier.z, along = ux * glacier.dx + uz * glacier.dz, across = Math.abs(-ux * glacier.dz + uz * glacier.dx);
        if (along > 40 && across < 150 + along * 0.25) {
          K.copy(ICE).lerp(CREVASSE, Math.max(0, Math.sin(along * 0.12 + across * 0.02)) ** 6 * 0.7);
          C.lerp(K, smooth(150 + along * 0.25, 90 + along * 0.15, across) * smooth(40, 90, along));
        }
      }
      if (d < half(0) + 9) C.lerp(GRAVEL, smooth(half(0) + 9, half(0) + 2, d) * 0.6);
      col.setXYZ(i, C.r, C.g, C.b);
    }
    col.needsUpdate = true;
  }
  const ground = (x, z, fallback) => land ? land(x, z) : fallback;

  // ---- MERGING: what stands still, by CHUNK m of road, into one geometry of vertex colours
  const chunks = new Map(), glows = new Map();
  const chunkOf = (map, s) => { const k = Math.floor(s / CHUNK); let c = map.get(k); if (!c) map.set(k, c = { pos: [], nor: [], col: [], idx: [], k }); return c; };
  const tpl = (geometry, flat = true) => {
    let g = geometry;
    if (flat) { g = g.index ? g.toNonIndexed() : g.clone(); g.computeVertexNormals(); }
    const pos = g.attributes.position.array, nor = g.attributes.normal.array, n = pos.length / 3;
    return { pos, nor, n, idx: g.index ? Array.from(g.index.array) : Array.from({ length: n }, (_, i) => i), col: g.attributes.color ? g.attributes.color.array : null };
  };
  const BOX = tpl(new THREE.BoxGeometry(1, 1, 1), false);
  const PRISM = tpl((() => { // a gable: 1 across, 1 tall, 1 long, its ridge along z, its foot on y = 0
    const g = new THREE.BufferGeometry(), a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0, 1, -0.5], d = [-0.5, 0, 0.5], e = [0.5, 0, 0.5], f = [0, 1, 0.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...c, ...b, ...d, ...e, ...f, ...a, ...d, ...c, ...c, ...d, ...f, ...b, ...c, ...e, ...c, ...f, ...e], 3));
    return g;
  })());
  const CYL = tpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 7, 1, true), false);
  const SPIRE = tpl(new THREE.ConeGeometry(0.5, 1, 4, 1, true).rotateY(Math.PI / 4));
  const ROCKS = [0, 1, 2, 3].map((k) => { // (rocks: a lumpy icosahedron each, flat shaded)
    const g = new THREE.IcosahedronGeometry(0.5, 0), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) { const j = 0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453 % 1); a.setXYZ(i, a.getX(i) * j, a.getY(i) * j, a.getZ(i) * j); }
    return tpl(g);
  });
  // (snow: a colour near white is made a little over white, so it is bright even in shade; Lambert takes vertex colours over 1)
  const whiten = (c) => (c.r > 0.72 && c.g > 0.76 && c.b > 0.8 ? c.multiplyScalar(1.22) : c);
  const M = new THREE.Matrix4(), NM = new THREE.Matrix3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), SC = new THREE.Vector3(), CL = new THREE.Color();
  const BASE = new THREE.Matrix4(), LOCAL = new THREE.Matrix4();
  const emit = (c, T, m, color) => {
    const base = c.pos.length / 3, e = m.elements;
    NM.getNormalMatrix(m);
    const ne = NM.elements;
    if (color !== null) whiten(CL.set(color));
    for (let i = 0; i < T.n; i++) {
      const x = T.pos[i * 3], y = T.pos[i * 3 + 1], z = T.pos[i * 3 + 2];
      c.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const a = T.nor[i * 3], b = T.nor[i * 3 + 1], d = T.nor[i * 3 + 2];
      let nx = ne[0] * a + ne[3] * b + ne[6] * d, ny = ne[1] * a + ne[4] * b + ne[7] * d, nz = ne[2] * a + ne[5] * b + ne[8] * d;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      c.nor.push(nx, ny, nz);
      if (color === null && T.col) c.col.push(T.col[i * 3], T.col[i * 3 + 1], T.col[i * 3 + 2]); else c.col.push(CL.r, CL.g, CL.b);
    }
    for (const k of T.idx) c.idx.push(base + k);
  };
  // a part standing in the world: its middle at (x, y, z), turned ry (and tipped rx, rolled rz), scaled
  const part = (s, T, color, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0, map = chunks) => {
    M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz, 'YXZ')), SC.set(sx, sy, sz));
    emit(chunkOf(map, s), T, M, color);
  };
  // a model of parts set at world (x, y, z) facing ry: parts [T, lx, ly, lz, sx, sy, sz, colour, ry?, rx?, rz?, glow?]
  const model = (s, x, y, z, ry, parts) => {
    BASE.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, ry, 0)), SC.set(1, 1, 1));
    for (const [T, lx, ly, lz, sx, sy, sz, color, pry = 0, prx = 0, prz = 0, lit = false] of parts) {
      LOCAL.compose(V.set(lx, ly, lz), Q.setFromEuler(E.set(prx, pry, prz, 'YXZ')), SC.set(sx, sy, sz));
      M.multiplyMatrices(BASE, LOCAL);
      emit(chunkOf(lit && dusk ? glows : chunks, s), T, M, lit && dusk ? 0xffd9a0 : color);
    }
  };
  const solid = (kind, s, x, z, r, y0, y1) => stats.solids.push({ kind, s, x, z, r, y0, y1 });

  // ---- RIBBONS: a cross-section swept along the road from s0 to s1 on a side: profile [[d, y], ...] (d m beyond the pavement's edge,
  // y m over the road; either may be a function of s), walked with the open air on its left (from the road's side up its face, over
  // its top, down its back). Each edge of it a strip of its own, so its corners are crisp; on(s) false leaves a gap
  const OUT = {}, A = {}, B = {};
  const ribbon = (kind, s0, s1, side, profile, colours, step = 2, on = () => true) => {
    const val = (v, s) => typeof v === 'function' ? v(s) : v;
    let maxY = 0, minD = Infinity, maxD = -Infinity;
    for (let e = 0; e < profile.length - 1; e++) {
      let c = null, last = -1, prevChunk = null;
      for (let s = s0; ; s = Math.min(s1, s + (Math.abs(Track.bend(s)) > 0.008 || Math.abs(Track.bend(s + step * 3)) > 0.008 ? step : step * 3))) { // (finer round a bend)
        const k = Math.floor(s / CHUNK);
        if (!on(s)) { last = -1; if (s >= s1) break; continue; }
        if (prevChunk !== k && last >= 0) { // (carry the strip over into the next chunk: its last row again, there)
          const cc = chunkOf(chunks, s), from = c, n = from.pos.length / 3 - 2;
          for (let j = 0; j < 2; j++) { cc.pos.push(from.pos[(n + j) * 3], from.pos[(n + j) * 3 + 1], from.pos[(n + j) * 3 + 2]); cc.nor.push(from.nor[(n + j) * 3], from.nor[(n + j) * 3 + 1], from.nor[(n + j) * 3 + 2]); cc.col.push(from.col[(n + j) * 3], from.col[(n + j) * 3 + 1], from.col[(n + j) * 3 + 2]); }
          last = cc.pos.length / 3 - 2;
        }
        c = chunkOf(chunks, s); prevChunk = k;
        const [d1, y1] = profile[e], [d2, y2] = profile[e + 1];
        const da = val(d1, s), ya = val(y1, s), db = val(d2, s), yb = val(y2, s);
        Track.toWorld(s, beside(side, s, da), A); Track.toWorld(s, beside(side, s, db), B);
        Track.toWorld(s, beside(side, s, da + 1), OUT);
        let ox = OUT.x - A.x, oz = OUT.z - A.z; const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
        // (the open air is on the profile's left: its normal is the edge turned a quarter, (-dy, dd), in (out, up))
        const ed = db - da, ey = yb - ya, el = Math.hypot(ed, ey) || 1, nd = -ey / el, nu = ed / el;
        const nx = nd * ox, ny = nu, nz = nd * oz;
        const col = typeof colours === 'function' ? colours(e, s) : colours[Math.min(e, colours.length - 1)];
        whiten(CL.set(col));
        const n = c.pos.length / 3;
        c.pos.push(A.x, A.y + ya, A.z, B.x, B.y + yb, B.z);
        c.nor.push(nx, ny, nz, nx, ny, nz);
        c.col.push(CL.r, CL.g, CL.b, CL.r, CL.g, CL.b);
        if (last >= 0) {
          // (wound to face the way its normal points)
          const a = last, b = last + 1, a2 = n, b2 = n + 1;
          const P = c.pos, ux = P[a2 * 3] - P[a * 3], uy = P[a2 * 3 + 1] - P[a * 3 + 1], uz = P[a2 * 3 + 2] - P[a * 3 + 2];
          const vx = P[b * 3] - P[a * 3], vy = P[b * 3 + 1] - P[a * 3 + 1], vz = P[b * 3 + 2] - P[a * 3 + 2];
          const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
          if (gx * nx + gy * ny + gz * nz >= 0) c.idx.push(a, a2, b, b, a2, b2); else c.idx.push(a, b, a2, b, b2, a2);
        }
        last = n;
        maxY = Math.max(maxY, ya, yb); minD = Math.min(minD, da, db); maxD = Math.max(maxD, da, db);
        if (s >= s1) break;
      }
    }
    stats.ribbons.push({ kind, s0, s1, side, minD, maxD, maxY });
  };

  // ---- what keeps clear of what: the level's things beside the road (its targets, the shade's trees, the rockfall's slope, the
  // gallery), and every stretch of road (a spot is clear when it is r m off the pavement of every stretch, and off every other road)
  const keeps = [];
  const sideOf = (x) => x === 'left' ? -1 : x === 'right' ? 1 : 0;
  for (const t of LEVEL.targets || []) keeps.push([t.s - 8, t.s + 8, sideOf(t.side), 'props']);
  for (const z of LEVEL.shade || []) keeps.push([z.from - 6, z.to + 6, sideOf(z.side), 'props']);
  for (const r of LEVEL.rockfall || []) keeps.push([r.from - 10, r.to + 10, sideOf(r.side), 'all']);
  for (const t of tunnels) keeps.push([t.from - 12, t.to + 12, 0, 'all']);
  const kept = (s, side, what = 'props') => keeps.some(([a, b, sd, w]) => s > a && s < b && (!sd || sd === side) && (w === 'all' || what === 'props'));
  const W2 = (Track.hi(0) - Track.lo(0)) / 2; // (half the pavement: roadIndex measures from its middle)
  const spotClear = (x, z, r) => roads.near(x, z, r + 40).d > W2 + r + 0.6 && offRoads(x, z, r) && !inLake(x, z, 1.25);
  // a spot d m off the pavement at s on a side, clear for something r m round: sets p (and p.land, p.heading: facing the road)
  const site = (s, side, d, r, flatOnly = true) => {
    const h = Track.toWorld(s, beside(side, s, d), p);
    if (inJunction(s) || inTunnel(s, 30) || !spotClear(p.x, p.z, r)) return null;
    p.land = ground(p.x, p.z, p.y - 0.3);
    if (flatOnly && land) { // (not on a slope: the land under its corners within a metre and a half)
      let lo = Infinity, hi = -Infinity;
      for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) { const y = ground(p.x + a * 0.7, p.z + b * 0.7, p.land); lo = Math.min(lo, y); hi = Math.max(hi, y); }
      if (hi - lo > 2.5) return null;
      p.land = lo;
    }
    const x = p.x, z = p.z;
    Track.toWorld(s, beside(side, s, 0), q);
    p.heading = Math.atan2(q.x - x, q.z - z); // (its front, local +z, to the road)
    return h;
  };
  const taken = [];
  const free = (x, z, r) => !taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < r + tr);
  const claim = (x, z, r) => taken.push([x, z, r]);
  const upMemo = new Map();
  const uphill = (s) => { const k = Math.round(s); if (!upMemo.has(k)) upMemo.set(k, uphillAt(k)); return upMemo.get(k); };
  const uphillAt = (s) => {
    if (land) {
      const lft = (Track.toWorld(s, beside(-1, s, 14), p), ground(p.x, p.z, p.y)), rgt = (Track.toWorld(s, beside(1, s, 14), p), ground(p.x, p.z, p.y)), y = roadY(s);
      if (Math.max(lft, rgt) > y + 2.5) return lft > rgt ? -1 : 1;
      return 0;
    }
    const next = hairpins.find(([a]) => a > s);
    return next && !(s < hairpins[0][0] - 40) && next[0] - s < 260 ? next[2] : 0;
  };

  // ---- THE SKY: a dome from the haze at the horizon (the theme's sky, which the fog is) to a deep cold blue overhead, the sun; round
  // whoever is looking, never any nearer. And a ring of peaks round them, glaciers on them, cloud banks lying in the valleys
  {
    const HORIZON = new THREE.Color(theme.sky), MID = new THREE.Color(dusk ? 0xe8a888 : 0x9fc6ea), TOP = new THREE.Color(dusk ? 0x46508a : 0x3f7fc8);
    const geo = new THREE.SphereGeometry(640, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), col = [], pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = Math.max(0, pos.getY(i) / 640), c = new THREE.Color();
      if (u < 0.2) c.copy(HORIZON).lerp(MID, u / 0.2); else c.copy(MID).lerp(TOP, Math.min(1, (u - 0.2) / 0.7));
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    const SUN = new THREE.Vector3(-0.62, dusk ? 0.09 : 0.42, -0.55).normalize().multiplyScalar(600);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(dusk ? 24 : 14, 20), new THREE.MeshBasicMaterial({ color: dusk ? 0xffd08a : 0xfffbea, fog: false, depthWrite: false }));
    // the ring of peaks: an outline round the horizon, rock below the snow, glaciers in the high corries, aerial blue in it
    const R = 600, NS = 180, ring = [], rcol = [], ridx = [];
    const peak = (a) => { let h = 0; for (const [f, amp, ph] of [[3, 70, 0.3], [7, 55, 1.9], [13, 30, 0.7], [29, 10, 2.5]]) h += amp * Math.abs(Math.sin(a * f / 2 + ph)); return 70 + h * 0.85; };
    const haze = new THREE.Color(theme.sky), rock = new THREE.Color(dusk ? 0x6a5a6a : 0x6f7c8c), snow = new THREE.Color(dusk ? 0xffc8b8 : 0xf2f6fb), ice = new THREE.Color(dusk ? 0xe8c0c8 : 0xcfe4f2), C = new THREE.Color();
    const LAYERS = [-120, 0.25, 0.55, 0.72, 0.86, 1];
    for (let i = 0; i <= NS; i++) {
      const a = i / NS * Math.PI * 2, top = peak(a), sx = Math.sin(a), cz = Math.cos(a);
      for (let l = 0; l < LAYERS.length; l++) {
        const y = l === 0 ? LAYERS[0] : -40 + (top + 40) * LAYERS[l], rr = R - (l === LAYERS.length - 1 ? 12 : 0) - Math.sin(a * 9 + l) * 6;
        ring.push(sx * rr, y, cz * rr);
        // (snow over a line that wanders along the ring, a glacier's blue in the high corries now and then; rock under it)
        const line = 110 + 30 * Math.sin(a * 5 + 0.7) + 14 * Math.sin(a * 13), snowy = y > line;
        C.copy(snowy ? (l === 3 && Math.sin(a * 7 + 1.3) > 0.55 ? ice : snow) : rock);
        if (snowy && (l === 3 || l === 4) && Math.sin(a * 37 + l) > 0.55) C.lerp(rock, 0.55); // (ribs of rock through the snow)
        C.lerp(haze, l === 0 ? 0.8 : 0.48 - l * 0.04);
        rcol.push(C.r, C.g, C.b);
      }
    }
    const NL = LAYERS.length;
    for (let i = 0; i < NS; i++) for (let l = 0; l < NL - 1; l++) { const a = i * NL + l, b = a + NL; ridx.push(a, a + 1, b, b, a + 1, b + 1); }
    // cloud banks: soft white heaps lying low in the ring, the camera's height or under it (from the col they are below)
    const cloud = new THREE.IcosahedronGeometry(1, 1), cp = cloud.attributes.position;
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3 + rand() * 0.4, r = 545 + rand() * 30, y = 10 + rand() * 45;
      for (let j = 0; j < 7; j++) {
        const s = 18 + rand() * 22, ox = (rand() - 0.5) * 150, oz = (rand() - 0.5) * 20, base = ring.length / 3;
        for (let i = 0; i < cp.count; i++) {
          const lx = cp.getX(i) * s * 2.2, ly = cp.getY(i) * s * 0.32, lz = cp.getZ(i) * s * 0.8;
          const px = Math.sin(a) * r + Math.cos(a) * (lx + ox) + Math.sin(a) * (lz + oz), pz = Math.cos(a) * r - Math.sin(a) * (lx + ox) + Math.cos(a) * (lz + oz);
          ring.push(px, y + ly + j * 1.2, pz);
          C.set(dusk ? 0xffd6c0 : 0xf8fbff).lerp(haze, 0.25).lerp(new THREE.Color(dusk ? 0x9a7a90 : 0xc4ccd6), Math.max(0, -cp.getY(i)) * 0.6);
          rcol.push(C.r, C.g, C.b);
        }
        const ci = cloud.index ? cloud.index.array : Array.from({ length: cp.count }, (_, i) => i);
        for (const t of ci) ridx.push(base + t);
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3));
    rg.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3));
    rg.setIndex(ridx);
    const peaks = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    for (const thing of [dome, disc, peaks]) { thing.frustumCulled = false; levelGroup.add(thing); }
    dome.renderOrder = -3; disc.renderOrder = -2.9; peaks.renderOrder = -2.8;
    dome.onBeforeRender = (renderer, scene, camera) => {
      const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x;
      dome.position.set(x, camera.position.y - 4, camera.position.z);
      disc.position.set(x + SUN.x, camera.position.y + SUN.y, camera.position.z + SUN.z);
      disc.lookAt(x, camera.position.y, camera.position.z);
      peaks.position.set(x, 0, camera.position.z); // (the peaks stand on the world's floor, round the camera)
      for (const o of [dome, disc, peaks]) o.updateMatrixWorld();
    };
    stats.meshes += 3; stats.triangles += geo.index.count / 3 + 20 + ridx.length / 3;
  }

  // ---- THE LAKE: frozen, in its basin under the glacier: white ice with clear dark-blue patches swept bare, a rim of snow
  if (lake) {
    const g = new THREE.CircleGeometry(1, 48), pa = g.attributes.position, col = [], C = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      const u = pa.getX(i), v = pa.getY(i), r = Math.hypot(u, v);
      C.set(0xcfe3ef).lerp(new THREE.Color(0x6f9cba), Math.max(0, Math.sin(u * 7 + 1) * Math.cos(v * 5)) * 0.6 * (1 - r)).lerp(new THREE.Color(0xf4f8fb), smooth(0.82, 1, r));
      col.push(C.r, C.g, C.b);
      // (to the world: across the lake rx, along it rz, round its middle)
      const lx = u * lake.rx, lz = v * lake.rz;
      pa.setXYZ(i, lake.x + lx * -lake.dz + lz * lake.dx, lake.level, lake.z + lx * lake.dx + lz * lake.dz);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const ice = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    ice.userData.flat = true;
    levelGroup.add(ice);
    stats.meshes++; stats.triangles += 48;
    stats.solids.push({ kind: 'lake', s: lake.s, x: lake.x, z: lake.z, r: Math.max(lake.rx, lake.rz), y0: lake.level - 2, y1: lake.level });
  }

  // ---- THE ROAD'S OWN, as ribbons along it ------------------------------------------------------------------------------------
  const GRAVEL = 0x9b968b, SNOWC = 0xf2f5f8, SNOWSHADE = 0xd8e4ee, STONE = 0x8d877c, STONE2 = 0x7b766d, RAIL = 0xb6bcc2, CONCRETE = 0xbdb8ae;
  const VILLAGE = [S0, 300], MEADOW = [300, 720], COL = 3150;
  const zoneAt = (s) => s < VILLAGE[1] ? 'village' : s < MEADOW[1] ? 'meadow' : s < 2200 ? 'forest' : s < COL ? 'high' : 'col';
  const hut = Track.length > 3300 ? Math.min(Track.length - 90, 3420) : null;
  const wallsAt = (s) => s > COL && !inTunnel(s, 8) && !(hut && s > hut - 40 && s < hut + 45);
  // the hill side: a stone retaining wall, as tall as the hillside behind it is high (eased along the road), a coping along its top
  const wallH = new Map();
  const retain = (s) => {
    const k = Math.round(s / 2);
    if (wallH.has(k)) return wallH.get(k);
    let h = 0;
    if (land && !inTunnel(s, 10)) {
      const side = uphill(s);
      if (side) { let sum = 0; for (let o = -6; o <= 6; o += 3) { Track.toWorld(s + o, beside(side, s + o, 7), p); sum += ground(p.x, p.z, p.y) - p.y; } h = Math.max(0, Math.min(4.2, sum / 5 + 0.6)); }
    }
    wallH.set(k, h);
    return h;
  };
  // what stands along the edge on a side: the gallery's, a wall of snow (the col), a retaining wall (the hill side, where it is high),
  // a rail (the valley side, or both on level ground below the snow), a snow bank (up high), or nothing (the village, the meadows)
  const edgeMemo = new Map();
  const edge = (s, side) => {
    const k = Math.round(s / 2) * 2 + side * 0.5;
    if (edgeMemo.has(k)) return edgeMemo.get(k);
    let e = null;
    if (inTunnel(s, 6)) e = 'gallery';
    else if (wallsAt(s)) e = 'snowwall';
    else if (s > MEADOW[1] - 30 && uphill(s) === side && retain(s) > 0.9 && !kept(s, side, 'all')) e = 'wall';
    else if (s > MEADOW[1] - 20 && (uphill(s) === -side || (uphill(s) === 0 && s < 2200))) e = 'rail';
    else if (s > 2200) e = 'bank';
    edgeMemo.set(k, e);
    return e;
  };
  // the verge: gravel a metre and a half wide, a little below the road's edge (snowy up high)
  for (const side of [-1, 1]) {
    ribbon('verge', S0, S1, side, [[0, 0.02], [1.7, -0.22]], (e, s) => s > 2200 ? SNOWC : s > 1500 ? 0xa8a49a : GRAVEL, 3, (s) => !inTunnel(s, 0));
  }
  // the valley side: a steel rail on posts, from where the road leaves the meadows (and round the outside of every hairpin)
  const railOn = (side) => (s) => edge(s, side) === 'rail';
  for (const side of [-1, 1]) {
    ribbon('rail', S0, S1, side, [[0.55, 0.45], [0.55, 0.82], [0.68, 0.82], [0.68, 0.45], [0.55, 0.45]], [RAIL, 0xd0d4d8, 0x8f969c, 0x6f767c], 2, railOn(side));
    for (let s = Math.ceil(S0 / 4) * 4; s < S1; s += 4) {
      if (!railOn(side)(s)) continue;
      Track.toWorld(s, beside(side, s, 0.72), p);
      part(s, BOX, 0x50565e, p.x, p.y + 0.38, p.z, 0.12, 0.85, 0.12, Track.toWorld(s, 0, q));
    }
  }
  for (const side of [-1, 1]) {
    const on = (s) => edge(s, side) === 'wall';
    ribbon('retaining', S0, S1, side, [[0.6, -0.4], [0.6, (s) => retain(s) * 0.5], [0.6, retain], [1.5, retain], [1.5, (s) => retain(s) - 0.8]],
      [STONE, STONE2, 0xa39d92, 0x8a847a], 2, on);
  }
  // snow banks thrown up by the plough, higher up: a rounded heap 2.8 m wide along both sides, its height wandering
  const bankH = (s) => 0.7 + 0.35 * Math.sin(s * 0.043) + 0.2 * Math.sin(s * 0.17);
  for (const side of [-1, 1]) {
    ribbon('bank', S0, S1, side, [[0.25, -0.1], [0.45, (s) => bankH(s) * 0.55], [0.95, (s) => bankH(s) * 0.92], [1.7, bankH], [2.4, (s) => bankH(s) * 0.6], [3.0, -0.15]],
      [SNOWSHADE, SNOWC, SNOWC, SNOWC, 0xe6edf3], 2, (s) => edge(s, side) === 'bank');
  }
  // at the col, walls of snow cut square by the blower: a sheer face banded where the winter's layers show, a rounded top
  const cutH = (s) => 2.4 + 0.9 * Math.sin(s * 0.021 + 1) + 0.5 * Math.sin(s * 0.093) + smooth(COL, COL + 60, s) * 0.6;
  for (const side of [-1, 1]) {
    const wob = (k) => (s) => 0.42 + 0.14 * Math.sin(s * 0.37 + k * 1.9 + side) * Math.sin(s * 0.11 + k); // (the blower's cut is not quite straight)
    ribbon('snowwall', S0, S1, side, [[0.4, -0.1], [wob(0), (s) => cutH(s) * 0.3], [wob(1), (s) => cutH(s) * 0.34], [wob(2), (s) => cutH(s) * 0.62], [wob(3), (s) => cutH(s) * 0.66], [wob(4), (s) => cutH(s) - 0.1],
      [0.3, (s) => cutH(s) + 0.25], [1.2, (s) => cutH(s) + 0.5], [2.6, (s) => cutH(s) + 0.3], [4.5, -0.2]],
      [0xeaf1f7, 0xa9bccc, 0xf2f6fa, 0xb4c6d4, 0xf6f9fb, 0xffffff, SNOWC, SNOWC, 0xe6edf3], 2, (s) => wallsAt(s) && s > COL - 2);
  }
  // snow poles, red and white, every 25 m along both sides from the meadows up (on the top of a wall of snow, at the col)
  for (let s = MEADOW[0] + 12; s < S1 - 2; s += 25) {
    if (inTunnel(s, 4)) continue;
    for (const side of [-1, 1]) {
      if (kept(s, side)) continue;
      const e = edge(s, side), wall = e === 'snowwall' ? cutH(s) + 0.2 : e === 'wall' ? retain(s) : 0, d = e === 'snowwall' ? 1.1 : e === 'bank' ? 1.3 : e === 'wall' ? 1.05 : 1.05;
      Track.toWorld(s, beside(side, s, d), p);
      const y = p.y + wall, h = 2.4, turn = Track.toWorld(s, 0, q);
      part(s, BOX, 0xf4f4f0, p.x, y + h / 2 - 0.3, p.z, 0.09, h, 0.09, turn);
      for (const f of [0.45, 0.8]) part(s, BOX, 0xd8262b, p.x, y + h * f - 0.3, p.z, 0.105, h * 0.17, 0.105, turn);
    }
  }
  // chevron boards round the outside of each hairpin: white on red, pointing round it (the signs' texture: a canvas, below)
  const signs = [];
  for (const [a, b, turn] of hairpins) {
    const side = -turn; // (a right turn's outside is its left)
    for (let s = a + 6; s < b - 4; s += (b - a - 10) / 4) {
      if (inTunnel(s, 10)) continue;
      Track.toWorld(s, beside(side, s, 1.6), p);
      const h = Track.toWorld(s, 0, q);
      part(s, BOX, 0x50565e, p.x, p.y + 0.6, p.z, 0.1, 1.2, 0.1, h);
      signs.push(['chevron', p.x, p.y + 1.45, p.z, h + Math.PI, 1.1, 0.8, turn < 0]);
    }
  }

  // ---- THE PINES: dark green tiers on a short trunk; up high a dusting of snow on each. One geometry each, instanced by PINE_CHUNK m
  const pineGeo = (snowy) => {
    const parts = [[new THREE.CylinderGeometry(0.12, 0.18, 1.6, 4, 1, true), 0x4a3424, 0, 0.8, 0]];
    for (const [r, y, h] of [[1.7, 1.2, 3.2], [1.3, 2.7, 2.6], [0.85, 4.0, 2.2]]) {
      parts.push([new THREE.ConeGeometry(r, h, 6, 1, true), 0x2c4a2e, 0, y + h / 2, 0]);
      if (snowy) parts.push([new THREE.ConeGeometry(r * 0.62, h * 0.42, 6, 1, true), 0xeef3f6, 0, y + h * 0.82, 0]);
    }
    const geo = mergeLocal(parts);
    return geo;
  };
  // (a cone's tip is a ring of points all in one place: its triangles there have no area, and are left out)
  const noSlivers = (g) => {
    const T = tpl(g, false), keep = [];
    for (let i = 0; i < T.idx.length; i += 3) {
      const [a, b, c] = [T.idx[i], T.idx[i + 1], T.idx[i + 2]].map(k => [T.pos[k * 3], T.pos[k * 3 + 1], T.pos[k * 3 + 2]]);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-6) keep.push(T.idx[i], T.idx[i + 1], T.idx[i + 2]);
    }
    T.idx = keep;
    return T;
  };
  const mergeLocal = (parts) => {
    const c = { pos: [], nor: [], col: [], idx: [] };
    for (const [g, color, x, y, z] of parts) { M.makeTranslation(x, y, z); emit(c, noSlivers(g), M, color); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
    geo.setIndex(c.idx);
    return geo;
  };
  const pines = new Map(); // chunk -> { snowy: [[x, y, z, scale, turn, tint]], green: [...] }
  const pine = (s, x, y, z, h, snowy) => {
    const k = Math.floor(s / PINE_CHUNK);
    if (!pines.has(k)) pines.set(k, { snowy: [], green: [] });
    pines.get(k)[snowy ? 'snowy' : 'green'].push([x, y - 0.2, z, h / 6.2, rand() * 6.28, 0.8 + rand() * 0.35]);
  };

  // ---- BUILDINGS: a chalet (a stone or rendered ground floor, a timber upper floor or two, a balcony on its gable, shuttered
  // windows with flower boxes, a shallow-pitched roof with deep eaves, under snow higher up), its gable end to the road
  const TIMBER = [0x6b4426, 0x7a4e2a, 0x5a3a22, 0x8a5a32], RENDER = [0xefe9dc, 0xe6dfcf, 0xd9d2c2], ROOFS = [0x4f4c4a, 0x5a4a3e, 0x3f3d3c, 0x6a4a34], SHUTTERS = [0x2f6a3a, 0xa8302a, 0x2f4f7a, 0x2f6a3a];
  const chalet = (s, x, y, z, ry, w, dep, floors, snowy, big = false) => {
    const stone = rand() < 0.5, base = stone ? pick([0x9a948a, 0xa8a196]) : pick(RENDER), wood = pick(TIMBER), roofC = pick(ROOFS), shut = pick(SHUTTERS);
    const gH = 2.9, uH = floors * 2.7, wallH = gH + uH, pitch = 0.62, rise = (w / 2 + 0.9) * Math.tan(pitch), run = (w / 2 + 0.9) / Math.cos(pitch);
    const parts = [
      [BOX, 0, -1 + gH / 2 + 0.5, 0, w, gH + 1, dep, base],                      // the ground floor, sunk a metre into the land
      [BOX, 0, gH + uH / 2, 0, w - 0.06, uH, dep - 0.06, wood],                   // the timber floors
      [PRISM, 0, wallH, 0, w - 0.08, rise * 0.92, dep - 0.08, wood],               // the gables
      [BOX, -(w / 4 + 0.45) * 1.0, wallH + rise / 2, 0, run, 0.24, dep + 1.8, roofC, 0, 0, pitch],
      [BOX, (w / 4 + 0.45) * 1.0, wallH + rise / 2, 0, run, 0.24, dep + 1.8, roofC, 0, 0, -pitch],
    ];
    if (snowy) for (const sd of [-1, 1]) parts.push([BOX, sd * (w / 4 + 0.45), wallH + rise / 2 + 0.19, 0, run * 0.96, 0.16, dep + 1.7, SNOWC, 0, 0, -sd * pitch]);
    parts.push([BOX, w * 0.28, wallH + rise * 0.6, -dep * 0.2, 0.7, rise + 1.2, 0.7, 0x8a847a]); // the chimney
    // the balcony across the gable end (local +z, the front), at the first timber floor: a deck and a rail of boards
    parts.push([BOX, 0, gH + 0.1, dep / 2 + 0.6, w * 0.8, 0.14, 1.2, wood], [BOX, 0, gH + 0.65, dep / 2 + 1.15, w * 0.8, 0.9, 0.08, 0x8a5a32]);
    parts.push([BOX, 0, gH + 1.15, dep / 2 + 1.18, w * 0.8, 0.22, 0.14, 0xc8302a]); // its flower box
    for (let f = 0; f < floors + 1; f++) {
      const wy = f === 0 ? 1.5 : gH + 1.3 + (f - 1) * 2.7, cols = 2;
      for (let c = 0; c < cols; c++) {
        const wx = (c - (cols - 1) / 2) * (w / (cols + 0.6));
        parts.push([BOX, wx, wy, dep / 2 + 0.03, 0.8, 1.05, 0.08, 0x2b3440, 0, 0, 0, true], [BOX, wx, wy, dep / 2 + 0.06, 0.9, 0.1, 0.1, 0xf2efe6]);
        for (const sd of [-1, 1]) parts.push([BOX, wx + sd * 0.64, wy, dep / 2 + 0.07, 0.36, 1.05, 0.08, shut]);
        if (f === 0) parts.push([BOX, wx, wy - 0.65, dep / 2 + 0.2, 0.9, 0.22, 0.28, 0xd8362e]);
      }
      if (f > 0) for (const sd of [-1, 1]) parts.push([BOX, sd * (w / 2 + 0.03), wy, 0, 0.08, 1.0, 0.8, 0x2b3440, 0, 0, 0, true]);
    }
    parts.push([BOX, -w * 0.25, 1.05, dep / 2 + 0.05, 1.0, 2.1, 0.08, 0x4a2e1c]); // the door
    if (big) parts.push([BOX, 0, wallH - 0.6, dep / 2 + 0.08, w * 0.5, 0.5, 0.06, 0xf2e6c8]); // a painted board over the door
    model(s, x, y, z, ry, parts);
    solid('chalet', s, x, z, Math.hypot(w, dep + 2) / 2, y - 1, wallH + rise + y);
  };
  const barn = (s, x, y, z, ry, w, dep, snowy) => {
    const wood = pick([0x5a3a22, 0x4a3020, 0x6b4426]), roofC = pick([0x5a5652, 0x6b5a48]), h = 3.4, pitch = 0.5, rise = (w / 2 + 0.6) * Math.tan(pitch), run = (w / 2 + 0.6) / Math.cos(pitch);
    const parts = [[BOX, 0, h / 2 - 0.4, 0, w, h + 0.8, dep, wood], [PRISM, 0, h, 0, w - 0.06, rise * 0.92, dep - 0.06, wood],
      [BOX, -(w / 4 + 0.3), h + rise / 2, 0, run, 0.2, dep + 1, roofC, 0, 0, pitch], [BOX, w / 4 + 0.3, h + rise / 2, 0, run, 0.2, dep + 1, roofC, 0, 0, -pitch],
      [BOX, 0, 1.3, dep / 2 + 0.04, w * 0.45, 2.6, 0.08, 0x3a2416]];
    if (snowy) for (const sd of [-1, 1]) parts.push([BOX, sd * (w / 4 + 0.3), h + rise / 2 + 0.16, 0, run * 0.95, 0.14, dep + 0.9, SNOWC, 0, 0, -sd * pitch]);
    model(s, x, y, z, ry, parts);
    solid('barn', s, x, z, Math.hypot(w, dep) / 2, y - 0.8, y + h + rise);
  };
  // a chalet or a barn beside the road, d m off it (if there is room), facing the road
  const building = (s, side, d, kind, snowy) => {
    const w = kind === 'barn' ? range(6, 8) : range(8.5, 11.5), dep = kind === 'barn' ? range(7, 9) : range(9, 12), r = Math.hypot(w, dep + 2.4) / 2;
    if (kept(s, side) || site(s, side, d + r, r) === null || !free(p.x, p.z, r + 1)) return false;
    claim(p.x, p.z, r + 1);
    const turn = p.heading + (rand() - 0.5) * 0.3;
    if (kind === 'barn') barn(s, p.x, p.land, p.z, turn, w, dep, snowy); else chalet(s, p.x, p.land, p.z, turn, w, dep, rand() < 0.4 ? 2 : 1, snowy, kind === 'big');
    return true;
  };

  // ---- THE VILLAGE, at the foot of the pass: chalets close along both sides, the church with its spire beside the road, a fountain,
  // a hiking signpost; the start is in it
  const church = (s, side, d) => {
    if (site(s, side, d, 15, false) === null) return;
    const x = p.x, z = p.z, y = p.land, ry = p.heading;
    claim(x, z, 17);
    const WALL = 0xf2eee4, SLATE = 0x4a4c50, nave = [10, 9, 20];
    const parts = [
      [BOX, 0, nave[1] / 2 - 0.5, 0, nave[0], nave[1] + 1, nave[2], WALL],
      [PRISM, 0, nave[1], 0, nave[0] - 0.05, 4.6, nave[2] - 0.05, WALL],
      [BOX, -(nave[0] / 4 + 0.35), nave[1] + 2.3, 0, Math.hypot(nave[0] / 2 + 0.7, 4.9), 0.26, nave[2] + 1, SLATE, 0, 0, Math.atan2(4.9, nave[0] / 2 + 0.7)],
      [BOX, nave[0] / 4 + 0.35, nave[1] + 2.3, 0, Math.hypot(nave[0] / 2 + 0.7, 4.9), 0.26, nave[2] + 1, SLATE, 0, 0, -Math.atan2(4.9, nave[0] / 2 + 0.7)],
      [BOX, 0, 9.5, nave[2] / 2 + 2.6, 5, 20, 5, WALL],                   // the tower, at the front
      [BOX, 0, 19.7, nave[2] / 2 + 2.6, 5.3, 0.4, 5.3, 0xd8d2c4],          // its cornice
      [SPIRE, 0, 26.4, nave[2] / 2 + 2.6, 7.3, 13, 7.3, dusk ? 0x5d6f60 : 0x4f7a66], // the spire, copper gone green
      [BOX, 0, 33.6, nave[2] / 2 + 2.6, 0.12, 1.6, 0.12, 0xc8a040], [BOX, 0, 33.9, nave[2] / 2 + 2.6, 0.8, 0.12, 0.12, 0xc8a040], // the cross on top
      [BOX, 0, 2.2, nave[2] / 2 + 5.12, 1.6, 3.4, 0.1, 0x4a2e1c],        // the door
    ];
    for (const [fx, fz, fr] of [[0, nave[2] / 2 + 5.12, 0], [2.52, nave[2] / 2 + 2.6, Math.PI / 2], [-2.52, nave[2] / 2 + 2.6, -Math.PI / 2]]) {
      parts.push([BOX, fx, 16.5, fz, 1.9, 1.9, 0.08, 0x2a2a2a, fr], [BOX, fx + Math.sin(fr) * 0.03, 16.5, fz + Math.cos(fr) * 0.03, 1.5, 1.5, 0.08, 0xe8c45a, fr]); // the clock faces
      parts.push([BOX, fx, 12.6, fz, 1.0, 2.2, 0.1, 0x2a2e36, fr]); // the belfry's openings
    }
    for (let k = -2; k <= 2; k++) for (const sd of [-1, 1]) parts.push([BOX, sd * (nave[0] / 2 + 0.03), 5.5, k * 3.6, 0.08, 3.4, 1.2, 0x8fb0c8, 0, 0, 0, true]);
    model(s, x, y, z, ry, parts);
    solid('church', s, x, z, 13, y - 0.5, y + 34);
  };
  const signpost = (s, side, d) => { // a hiking signpost: a grey pole, yellow arrow boards pointing up the valley and back
    if (kept(s, side) || site(s, side, d, 1, false) === null) return;
    const h = p.heading;
    model(s, p.x, p.land, p.z, h, [[BOX, 0, 1.5, 0, 0.12, 3, 0.12, 0x6f747a], [BOX, 0.55, 2.6, 0, 1.1, 0.32, 0.05, 0xf2c21c], [BOX, -0.5, 2.15, 0, 1.0, 0.32, 0.05, 0xf2c21c], [BOX, 0.5, 1.7, 0, 1.0, 0.32, 0.05, 0xf2c21c], [BOX, 0, 3.05, 0, 0.3, 0.2, 0.3, 0xf4f4f0]]);
    solid('sign', s, p.x, p.z, 0.6, p.land, p.land + 3);
  };
  {
    church(150, -1, 18);
    for (let s = VILLAGE[0] + 30; s < VILLAGE[1]; s += range(19, 26)) {
      for (const side of [-1, 1]) {
        if (rand() < 0.15) continue;
        building(s + range(-3, 3), side, range(2.5, 5), rand() < 0.2 ? 'big' : 'chalet', false);
        if (rand() < 0.45) building(s + range(-6, 6), side, range(20, 30), 'chalet', false);
      }
    }
    signpost(62, 1, 1.6); signpost(280, -1, 1.6);
    // the fountain: a stone trough with its post, by the church
    if (site(110, -1, 3.2, 1.5, false) !== null) { model(110, p.x, p.land, p.z, p.heading, [[BOX, 0, 0.45, 0, 2.6, 0.9, 1.2, 0x9a948a], [BOX, 0, 0.88, 0, 2.3, 0.06, 0.9, 0x6f9cba], [BOX, 0, 1.2, -0.4, 0.3, 1.6, 0.3, 0x8a847a]]); solid('fountain', 110, p.x, p.z, 1.5, p.land, p.land + 2); }
  }
  // ---- THE MEADOWS AND THE HIGHER ROAD: chalets, hay barns, a few on the high road, now and then
  for (let s = MEADOW[0] + 10; s < 3000; s += range(60, 110)) {
    const z = zoneAt(s), side = rand() < 0.5 ? -1 : 1;
    if (inHairpin(s, 30)) continue;
    if (z === 'meadow') building(s, side, range(6, 32), rand() < 0.45 ? 'barn' : 'chalet', false);
    else if (z === 'forest' && rand() < 0.35) building(s, side, range(8, 26), rand() < 0.6 ? 'barn' : 'chalet', false);
    else if (z === 'high' && rand() < 0.3) building(s, side, range(8, 26), 'barn', true);
  }
  // ---- THE COL: the refuge hut beside the road at the top, its sign, the snowplough parked in its bay, a signpost
  if (hut) {
    const side = 1;
    if (site(hut, side, 11, 9.5, false) !== null) {
      const x = p.x, z = p.z, y = p.land, ry = p.heading;
      claim(x, z, 11);
      chalet(hut, x, y, z, ry, 13, 11, 2, true, true);
      // the snowplough: an orange cab and body on big wheels, its blade on the front, parked beside the hut, side on to the road
      if (site(hut + 30, side, 6.5, 4, false) !== null) {
        const ORANGE = 0xf07a12, DARK = 0x222428;
        const parts = [[BOX, 0, 1.6, 0.6, 2.5, 1.6, 5.2, ORANGE], [BOX, 0, 2.7, 2.3, 2.4, 1.5, 1.8, ORANGE], [BOX, 0, 2.9, 3.22, 2.2, 0.9, 0.05, 0x2b3440],
          [BOX, 0, 3.55, 2.3, 1.2, 0.25, 0.5, 0xffb020], [BOX, 0, 0.95, 4.35, 3.4, 1.3, 0.25, 0x9aa0a6, 0.3], [BOX, 0, 2.6, -1.2, 2.3, 0.9, 1.6, 0xd8d8d0]];
        for (const [wx, wz] of [[-1.25, 2.4], [1.25, 2.4], [-1.25, -1.2], [1.25, -1.2]]) parts.push([CYL, wx, 0.6, wz, 1.2, 0.5, 1.2, DARK, 0, 0, Math.PI / 2]);
        model(hut + 30, p.x, p.land, p.z, p.heading + Math.PI / 2, parts);
        solid('plough', hut + 30, p.x, p.z, 3.4, p.land, p.land + 3.7);
      }
      signs.push(['summit', ...(() => { Track.toWorld(hut - 18, beside(side, hut - 18, 3.2), q); return [q.x, q.y + 2.4, q.z]; })(), Track.toWorld(hut - 18, 0, p) + Math.PI, 4.2, 1.6, false]);
      Track.toWorld(hut - 18, beside(side, hut - 18, 3.2), q);
      const h0 = Track.toWorld(hut - 18, 0, p);
      for (const o of [-1.8, 1.8]) part(hut - 18, BOX, 0x5a3c24, q.x + Math.cos(h0) * o, q.y + 1.2, q.z - Math.sin(h0) * o, 0.18, 2.4, 0.18, h0);
      solid('board', hut - 18, q.x, q.z, 2.2, q.y, q.y + 3.2);
    }
    signpost(hut + 60, -1, 1.4);
  }
  signs.push(['village', ...(() => { Track.toWorld(24, beside(1, 24, 1.8), q); return [q.x, q.y + 2.1, q.z]; })(), Track.toWorld(24, 0, p) + Math.PI, 2.6, 0.9, false]);
  { Track.toWorld(24, beside(1, 24, 1.8), q); part(24, BOX, 0x6f747a, q.x, q.y + 1.0, q.z, 0.1, 2.0, 0.1); }

  // ---- THE AVALANCHE GALLERY (the level's tunnel): on the hill side a concrete back wall with its pilasters, on the valley side
  // columns on a low wall, a roof slab over the whole road and the hillside banked over it, a portal frame at each end
  for (const t of tunnels) {
    const hill = uphill((t.from + t.to) / 2) || 1, valley = -hill, H = 8.5;
    const span = (s) => Track.hi(s) - Track.lo(s);
    // (the roof: across from beyond the columns on the valley side to over the back wall: d from the hill side's edge, negative over the road)
    ribbon('gallery', t.from, t.to, hill, [[1.6, H], [(s) => -span(s) - 1.6, H], [(s) => -span(s) - 1.6, H + 0.8]], [0x9d9a93, 0xa8a49b], 2);
    // (the hillside banked over it: up from its valley edge to over the back wall, then down to meet the land behind it, wherever that is)
    const back = (s, d) => { Track.toWorld(s, beside(hill, s, d), q); return ground(q.x, q.z, q.y + H) - q.y; };
    ribbon('gallery', t.from, t.to, hill, [[(s) => -span(s) - 1.6, H + 0.8], [(s) => -span(s) - 1.6, H + 1.3], [(s) => -span(s) * 0.4, H + 2.4], [1.6, (s) => Math.max(H + 1.2, Math.min(H + 4.5, back(s, 4) + 0.5))], [7, (s) => back(s, 7) - 0.6]],
      [0xbdb8ae, 0x8a8a7a, 0x7d8a5a, 0x7d7973], 2);
    ribbon('gallery', t.from, t.to, hill, [[0.45, -0.2], [0.45, H], [1.6, H]], [CONCRETE, 0xa8a49b], 2);
    ribbon('gallery', t.from, t.to, valley, [[0.4, -0.2], [0.4, 0.95], [1.2, 0.95], [1.2, -0.5]], [CONCRETE, 0xd0ccc4, 0xa8a49b], 2);
    for (let s = t.from + 3; s < t.to - 1; s += 6) {
      const h = Track.toWorld(s, beside(valley, s, 0.8), p);
      part(s, BOX, CONCRETE, p.x, p.y + H / 2, p.z, 0.8, H, 0.9, h);
      solid('column', s, p.x, p.z, 0.6, p.y, p.y + H);
      Track.toWorld(s, beside(hill, s, 0.3), q);
      part(s, BOX, 0xb0aca3, q.x, q.y + H / 2, q.z, 0.5, H, 0.8, h); // a pilaster on the back wall
    }
    for (const end of [t.from, t.to]) { // the portal: a deep beam across the opening, a wing wall up the hillside
      const h = Track.toWorld(end, (Track.lo(end) + Track.hi(end)) / 2, p), w = span(end) + 3.6;
      Track.toWorld(end, beside(hill, end, -span(end) / 2), p);
      part(end, BOX, 0xc7c3b9, p.x, p.y + H + 1.0, p.z, w, 2.0, 1.2, h);
      Track.toWorld(end, beside(hill, end, 4.5), q);
      part(end, BOX, 0xc7c3b9, q.x, q.y + H / 2 + 1.5, q.z, 7, H + 3, 1.0, h);
      solid('portal', end, q.x, q.z, 3.6, q.y, q.y + H + 3);
    }
    stats.gallery = { from: t.from, to: t.to, hill, roof: H };
  }

  // ---- THE CHAIR LIFT over the meadow road, and THE GONDOLA high over the high valley. Each a line of pylons across the road (none
  // within KEEP_LIFT m of any stretch of it), its cable sagging a little between, the chairs (empty) and the cabins going round
  const lines = [];
  const liftLine = (s, angle, back, ahead, every, height, overRoad, kind) => {
    const h = Track.toWorld(s, 0, p), cx = p.x, cz = p.z, cy = p.y, dirx = Math.sin(h + angle), dirz = Math.cos(h + angle);
    const pylons = [];
    for (let u = -back; u <= ahead + 0.1; u += every) {
      const x = cx + dirx * u, z = cz + dirz * u, r = roads.near(x, z, 60);
      if (r.d < half(0) + 6) continue; // (none on or by the road: the span goes over it)
      const y = ground(x, z, r.d < 200 ? r.y : cy), top = y + height + (r.d < 40 ? Math.max(0, overRoad - height - (y - r.y)) : 0);
      pylons.push({ u, x, y, z, top });
    }
    if (pylons.length < 2) return;
    const turn = Math.atan2(dirx, dirz), STEEL = kind === 'gondola' ? 0x9aa0a6 : 0x6f7a86;
    for (const py of pylons) {
      const hgt = py.top - py.y;
      if (kind === 'gondola') {
        for (const [ox, oz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) part(s, BOX, STEEL, py.x + ox * Math.cos(turn) + oz * Math.sin(turn), py.y + hgt / 2, py.z - ox * Math.sin(turn) + oz * Math.cos(turn), 0.45, hgt, 0.45, turn, -oz * 0.035, ox * 0.035);
        for (let k = 1; k < 6; k++) part(s, BOX, STEEL, py.x, py.y + hgt * k / 6, py.z, 3.4 - k * 0.25, 0.25, 3.4 - k * 0.25, turn);
        part(s, BOX, STEEL, py.x, py.top, py.z, 9, 0.8, 1.6, turn + Math.PI / 2);
      } else {
        part(s, CYL, STEEL, py.x, py.y + hgt / 2, py.z, 0.6, hgt, 0.6, turn);
        part(s, BOX, STEEL, py.x, py.top, py.z, 5.6, 0.4, 0.5, turn + Math.PI / 2);
        for (const sd of [-2.5, 2.5]) part(s, BOX, 0x3a3e44, py.x + Math.cos(turn) * sd, py.top - 0.25, py.z - Math.sin(turn) * sd, 0.3, 0.3, 2.6, turn);
      }
      solid(kind + '-pylon', s, py.x, py.z, kind === 'gondola' ? 2.6 : 0.6, py.y, py.top);
    }
    // the cables: two runs (up and down), each pylon to the next with a sag, as thin boxes; and the stations at the ends
    const GAP = kind === 'gondola' ? 4.5 : 2.5, path = [[], []];
    for (let i = 0; i < pylons.length - 1; i++) {
      const a = pylons[i], b = pylons[i + 1], n = 6;
      for (let k = 0; k <= n; k++) {
        if (k === n && i < pylons.length - 2) continue;
        const f = k / n, x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f, y = a.top + (b.top - a.top) * f - 4 * f * (1 - f) * (b.u - a.u) * 0.012;
        for (const w of [0, 1]) path[w].push([x + Math.cos(turn) * (w ? GAP : -GAP), y - 0.3, z - Math.sin(turn) * (w ? GAP : -GAP)]);
      }
    }
    for (const run of path) {
      for (let i = 0; i < run.length - 1; i++) {
        const [ax, ay, az] = run[i], [bx, by, bz] = run[i + 1], len = Math.hypot(bx - ax, by - ay, bz - az);
        part(s, BOX, 0x2b2e33, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, 0.07, 0.07, len, Math.atan2(bx - ax, bz - az), -Math.atan2(by - ay, Math.hypot(bx - ax, bz - az)));
      }
    }
    for (const py of [pylons[0], pylons[pylons.length - 1]]) { // (a station: a shed round the bull wheel)
      part(s, BOX, kind === 'gondola' ? 0xd8d4cc : 0x8a5a32, py.x, py.top - 2, py.z, 2 * GAP + 4, 4, 8, turn);
      part(s, BOX, 0x4f4c4a, py.x, py.top + 0.2, py.z, 2 * GAP + 5, 0.4, 9, turn);
    }
    lines.push({ kind, path, turn, closed: [...path[0], ...[...path[1]].reverse()] });
  };
  liftLine(560, 1.15, 230, 260, 46, 11, 17.5, 'chair');
  if (Track.length > 2300) liftLine(2150, -1.25, 420, 420, 105, 26, 34, 'gondola');
  // what goes round them, moved every frame: the chairs (one instanced mesh) and the cabins (another)
  const movers = [];
  for (const ln of lines) {
    const loop = ln.closed, cum = [0];
    for (let i = 1; i < loop.length; i++) cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1], loop[i][2] - loop[i - 1][2]));
    const total = cum[cum.length - 1] + Math.hypot(loop[0][0] - loop[loop.length - 1][0], loop[0][2] - loop[loop.length - 1][2]);
    const gapAlong = ln.kind === 'gondola' ? 70 : 14, count = Math.max(2, Math.floor(total / gapAlong));
    const mesh = new THREE.InstancedMesh(ln.kind === 'gondola' ? cabinGeometry() : chairGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), count);
    mesh.frustumCulled = false;
    levelGroup.add(mesh);
    stats.meshes++; stats.instances += count; stats.triangles += mesh.geometry.index ? mesh.geometry.index.count / 3 * count : mesh.geometry.attributes.position.count / 3 * count;
    const speed = ln.kind === 'gondola' ? 5 : 2.4, D = new THREE.Object3D();
    const at = (u) => {
      u = ((u % total) + total) % total;
      let i = 0;
      while (i < cum.length - 1 && cum[i + 1] < u) i++;
      const a = loop[i], b = loop[(i + 1) % loop.length], f = Math.min(1, (u - cum[i]) / ((cum[i + 1] ?? total) - cum[i] || 1));
      D.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
      D.rotation.set(0, Math.atan2(b[0] - a[0], b[2] - a[2]), 0);
      D.updateMatrix();
    };
    const place = (t) => { for (let k = 0; k < count; k++) { at(t * speed + k * total / count); mesh.setMatrixAt(k, D.matrix); } mesh.instanceMatrix.needsUpdate = true; };
    place(0);
    movers.push(place);
  }
  if (movers.length) everyFrame(levelGroup, (t) => movers.forEach(place => place(t)));

  // ---- ROCKS AND PINES over the land: rock where it is steep (outcrops, slabs over the rockfall's slope), boulders in the meadows,
  // pines up to the treeline where the forest is thick, a few dwarf ones above. A jittered grid over the land near the road
  {
    const STEP = 8.5, REACH = 170, done = new Set();
    for (let s = S0; s < S1; s += STEP) {
      for (const side of [-1, 1]) {
        for (let d = 7; d < REACH; d += STEP) {
          const jx = range(-3.5, 3.5), jd = range(-3, 3);
          Track.toWorld(s + jx, beside(side, s + jx, d + jd), p);
          const key = Math.floor(p.x / STEP) * 100003 + Math.floor(p.z / STEP);
          if (done.has(key)) continue;
          done.add(key);
          const r = roads.near(p.x, p.z, 40), gap = r.d - half(r.s);
          if (gap < 5.5 || !offRoads(p.x, p.z, 2) || inLake(p.x, p.z, 1.2) || !free(p.x, p.z, 2)) continue;
          if (kept(r.s, side) && gap < 9) continue;
          if (inTunnel(r.s, 20) && gap < 14) continue;
          const y = ground(p.x, p.z, p.y - 0.3);
          // the land's lean here
          const gx = ground(p.x + 2, p.z, y) - ground(p.x - 2, p.z, y), gz = ground(p.x, p.z + 2, y) - ground(p.x, p.z - 2, y), lean = Math.hypot(gx, gz) / 4;
          const zone = zoneAt(r.s), village = zone === 'village' && gap < 40;
          if (lean > 0.75 && gap > 7) { // rock: an outcrop (near the road only: further off, the land's own colour is rock enough)
            if (gap < 70 && rand() < 0.22) { const sz = range(2, 5.5); part(r.s, pick(ROCKS), pick([0x857f78, 0x7d7973, 0x8f8a83]), p.x, y - sz * 0.3, p.z, sz * range(1, 1.8), sz * range(0.6, 1), sz, rand() * 6.28, range(-0.3, 0.3)); if (gap < 24) solid('rock', r.s, p.x, p.z, sz * 0.7, y, y + sz); }
            continue;
          }
          if (village) continue;
          const forest = forestAt(p.x, p.z), treeline = y < 108 + 6 * Math.sin(p.x * 0.03), byLake = lake && side === lake.side && Math.abs(r.s - lake.s) < 130;
          if (treeline && !byLake && forest > 0.52 && rand() < 0.25 + (forest - 0.52) * 1.6 && gap > 7.5) { pine(r.s, p.x, y, p.z, range(8, 15), y > snowAt(p.x, p.z) - 30); continue; }
          if (!treeline && !byLake && y < 140 && rand() < 0.06 && gap > 8) { pine(r.s, p.x, y, p.z, range(4, 7), y > snowAt(p.x, p.z) - 30); continue; }
          if (rand() < (zone === 'meadow' ? 0.02 : 0.035) && gap > 6) { const sz = range(0.8, 2.2); part(r.s, pick(ROCKS), pick([0x8a857e, 0x9a958c, 0x7d7973]), p.x, y + sz * 0.2, p.z, sz * 1.3, sz * 0.8, sz, rand() * 6.28); }
        }
      }
    }
    // the rock face over each rockfall: slabs and blocks banked up the slope it comes down, on its side
    for (const rf of LEVEL.rockfall || []) {
      const side = sideOf(rf.side) || 1;
      for (let s = rf.from - 10; s < rf.to + 10; s += 4.5) {
        for (let d = 7; d < (rf.out ?? 14) + 10; d += range(3, 5)) {
          if (rand() < 0.45) continue;
          Track.toWorld(s, beside(side, s, d), p);
          const y = ground(p.x, p.z, p.y), sz = range(2.2, 4.5) * (d > 12 ? 1.3 : 1);
          if (y < p.y + 0.8 && d < 12) continue; // (only on the slope: never a block down on the road's level ground)
          part(s, pick(ROCKS), pick([0x8a857e, 0x7d7973, 0x96918a]), p.x, y - sz * 0.25, p.z, sz * 1.4, sz * 0.9, sz, rand() * 6.28, range(-0.4, 0.4), range(-0.3, 0.3));
        }
      }
    }
  }
  // the cows grazing in the meadows (not the herd that crosses the road: these stay in the grass), far enough off to be scenery
  {
    const cowParts = (spots) => [[BOX, 0, 1.15, 0, 0.9, 0.85, 2.0, 0xf4f1ea], [BOX, 0, 1.25, 1.15, 0.5, 0.55, 0.65, 0xf4f1ea], [BOX, 0, 1.0, 1.5, 0.42, 0.32, 0.3, 0xe8b8a8],
      ...spots.map(([x, y, z]) => [BOX, x, y, z, 0.92, 0.5, 0.6, 0x3a2a20]), ...[[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]].map(([x, z]) => [BOX, x, 0.4, z, 0.16, 0.8, 0.16, 0xd8d2c4]),
      [BOX, 0, 0.75, 0.75, 0.16, 0.18, 0.16, 0xc8a040]];
    for (let k = 0; k < 14; k++) {
      const s = range(MEADOW[0], MEADOW[1] + 200), side = rand() < 0.5 ? -1 : 1;
      if (site(s, side, range(16, 60), 2) === null || !free(p.x, p.z, 2)) continue;
      claim(p.x, p.z, 2);
      model(s, p.x, p.land, p.z, rand() * 6.28, cowParts([[0, 1.3, range(-0.5, 0.5)], [0, 1.2, range(-0.6, 0.6)]]));
    }
  }

  // ---- THE SIGNS: one canvas, cut four ways: a chevron, the village's name, the summit's board, the gallery's name
  let signMat;
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = ALPINE_TEXTURE_SIZE;
    const ctx = cv.getContext('2d'), W = ALPINE_TEXTURE_SIZE;
    ctx.fillStyle = '#d8262b'; ctx.fillRect(0, 0, W / 2, W / 2); // [0] the chevron, white on red
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(30, 18); ctx.lineTo(78, 64); ctx.lineTo(30, 110); ctx.lineTo(52, 110); ctx.lineTo(100, 64); ctx.lineTo(52, 18); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(W / 2, 0, W / 2, W / 2); // [1] the village: black on white, a red border
    ctx.strokeStyle = '#d8262b'; ctx.lineWidth = 8; ctx.strokeRect(W / 2 + 6, 26, W / 2 - 12, 76);
    ctx.fillStyle = '#111111'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ALPWIL', W * 0.75, 64, W / 2 - 24);
    ctx.fillStyle = '#5b3a22'; ctx.fillRect(0, W / 2, W, W / 2); // [2] the summit: cream on brown, the full width
    ctx.strokeStyle = '#f4ead2'; ctx.lineWidth = 6; ctx.strokeRect(8, W / 2 + 8, W - 16, W / 2 - 16);
    ctx.fillStyle = '#f4ead2'; ctx.font = 'bold 34px sans-serif'; ctx.fillText('COL DU GRAND', W / 2, W * 0.66, W - 30);
    ctx.font = 'bold 30px sans-serif'; ctx.fillText('ROCHER  2471 m', W / 2, W * 0.84, W - 30);
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace;
    signMat = new THREE.MeshLambertMaterial({ map });
  } catch { signMat = new THREE.MeshLambertMaterial({ color: 0xd8262b }); } // (no canvas to draw on: a headless check)
  if (signs.length) {
    const UV = { chevron: [0, 0.5, 0.5, 1], village: [0.5, 0.5, 1, 1], summit: [0, 0, 1, 0.5] };
    const pos = [], uv = [], idx = [], nor = [];
    for (const [kind, x, y, z, ry, w, h, flip] of signs) {
      const [u0, v0, u1, v1] = UV[kind], c = Math.cos(ry), sn = Math.sin(ry), n = pos.length / 3;
      for (const [lx, ly, u, v] of [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u1, v0], [w / 2, h / 2, u1, v1], [-w / 2, h / 2, u0, v1]]) {
        pos.push(x + lx * c, y + ly, z - lx * sn);
        uv.push(flip ? u0 + u1 - u : u, v);
        nor.push(sn, 0, c);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const board = new THREE.Mesh(g, signMat);
    levelGroup.add(board);
    stats.meshes++; stats.triangles += signs.length * 2;
  }

  // ---- OUT: the merged chunks, one mesh each; the pines, one instanced mesh a kind a chunk
  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
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
      stats.chunks.push({ from: c.k * CHUNK, to: (c.k + 1) * CHUNK, triangles: c.idx.length / 3, vertices: c.pos.length / 3 });
    }
  }
  if (pines.size) {
    const geos = { green: pineGeo(false), snowy: pineGeo(true) }, mat = new THREE.MeshLambertMaterial({ vertexColors: true }), D = new THREE.Object3D(), tint = new THREE.Color();
    for (const [k, kinds] of pines) {
      for (const kind of ['green', 'snowy']) {
        const list = kinds[kind];
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(geos[kind], mat, list.length);
        list.forEach(([x, y, z, sc, turn, t], i) => {
          D.position.set(x, y, z); D.rotation.set(0, turn, 0); D.scale.set(sc, sc * range(0.9, 1.15), sc); D.updateMatrix();
          mesh.setMatrixAt(i, D.matrix);
          mesh.setColorAt(i, tint.setRGB(t * 0.95, t, t * 0.9));
        });
        mesh.computeBoundingSphere();
        levelGroup.add(mesh);
        stats.meshes++; stats.instances += list.length; stats.triangles += geos[kind].index.count / 3 * list.length;
        stats.chunks.push({ from: k * PINE_CHUNK, to: (k + 1) * PINE_CHUNK, triangles: geos[kind].index.count / 3 * list.length, pines: list.length });
      }
    }
  }
};
export const alpineStats = { last: null }; // (the last build's numbers and footprints: scripts/.alpine-check.mjs)
