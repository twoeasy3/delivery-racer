// WINDOW AUDIT (14-Oct): a read-only REPORT script (not a check, outside every test group, always exits 0). It measures the two
// window faults the owner named for every vehicle in the game and regenerates the per-car table of
// src/delivery/AUDIT-windows-14-Oct.md and the data file src/delivery/windows-audit.json:
//   (1) a window's top / front / rear edges must run PARALLEL to the body's own side profile (roofline, A- and C-pillar rake) at a
//       constant inset (pillar width), not be a free-standing quad / arch / dome;
//   (2) the windscreen's top edge and the side window's top edge must be at the SAME height where they meet at the A-pillar (and the
//       rear glass and the side window at the C-pillar); windscreen side edge + side window front edge form ONE pillar of constant width.
//
//   node scripts/audit-windows.mjs                   the table on stdout (one line per vehicle) and the headline counts
//   node scripts/audit-windows.mjs --write           also (re)write src/delivery/windows-audit.json
//   node scripts/audit-windows.mjs --md              print the markdown per-car table (what the report embeds)
//   node scripts/audit-windows.mjs --png <dir> id..  draw the side view (body silhouette grey, contour used, window outlines,
//                                                    windscreen edge) of the listed vehicle ids into <dir>/<id>.png, for looking
//   node scripts/audit-windows.mjs <id>..            only those vehicle ids (e.g. touringcar; a traffic kind is traffic:<kind>)
//
// How each vehicle is built: exactly as the game builds it (render/showcar.js makeShowCar through a Vite SSR loader with a stubbed
// renderer, scripts/modelpatch-load.mjs; traffic kinds with MODELS[type.model]). Nothing is drawn, nothing is changed.
// Method (details and accuracy in the report):
//   - GLASS meshes are found by material: a lit (not glowing) material that is dark and blue-ish (b - r >= 12, b >= g, no channel
//     above 0x70: the shared GLASS 0x1c2330, the ideas' 0x232a35, 0x2a3340, 0x1d2531 ...), or any transparent untextured lit material, or a
//     near-black tint (<= 0x18 per channel, b - r >= 5: the older cars' 'tint' boxes). Misses are listed in the report.
//   - The glass triangles are split into connected pieces (edge-connected, neighbouring normals within 25 degrees) and each piece is
//     classed by its outward normal: side window (|nx| >= 0.55; left = +x), windscreen (nz >= 0.3), rear glass (nz <= -0.3), roof
//     glass (ny >= 0.9, ignored); a thin glass box counts once (its outer face).
//   - The body's SIDE PROFILE is its silhouette seen along x: every non-glass, non-glowing, non-tyre triangle rasterised on a 1 cm
//     grid in (z, y) (userData.body alone when it covers the glass, else all such parts), thin things (aerials, stalks, under
//     4 cm) removed by an opening. R(z) = its top at z (the roofline); the contour = its outline.
//   - Numbers are in car-local metres / centimetres / degrees. Front is +z, left is +x. Verdict thresholds are the TOL table below.
import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { startModels } from './modelpatch-load.mjs';

// ---- tolerances (cm / degrees): PASS up to `ok`, MARGINAL up to `bad`, FAIL above --------------------------------------------
export const TOL = {
  dy: { ok: 2, bad: 4 },          // windscreen top vs side-window top at the A-pillar (and rear glass vs side window at the C-pillar), cm
  angle: { ok: 1.5, bad: 3 },     // side-window top edge slope vs body roofline slope over the same span, degrees
  inset: { ok: 2, bad: 4 },       // variation (max - min) of the inset along the window's top edge from the roofline, cm
  pillar: { ok: 2, bad: 4 },      // variation of the pillar width (windscreen side edge to side-window front edge), cm
  sym: { ok: 1, bad: 3 },         // left/right difference of the side windows, cm
};

// ---- the vehicles, as scripts/.platetag-check.mjs builds them -----------------------------------------------------------------
export const buildAll = async (load) => {
  const { makeShowCar } = await load('render/showcar.js');
  const C = await load('cars.js');
  const { CONFIG } = await load('config.js');
  const { MODELS } = await load('render/models.js');
  for (const file of ['trafficModels', 'boatModels', 'pursuitModels', 'tankModels']) await load('render/' + file + '.js').catch(() => {});
  const { makeTractorModel } = await load('render/carExtras.js');
  const { IDEA_CARS } = await load('ideas.js');
  const entries = [];
  const add = (group, car, build) => entries.push({ key: group + '|' + car.id, group, id: car.id, name: car.name || car.id, model: car.model || car.id, build });
  for (const car of C.CARS) add('garage', car, () => makeShowCar(car));
  for (const car of C.CARS) { const s = C.superOf(car); if (s) add('super', s, () => makeShowCar(s)); }
  for (const car of C.FILLER_CARS) add('filler', car, () => makeShowCar(car));
  for (const car of C.BESPOKE_CARS) add('bespoke', car, () => makeShowCar(car));
  for (const car of C.EVENT_CARS) add('event', car, () => makeShowCar(car));
  for (const car of C.EARNED_CARS) add(car.legend ? 'legendary' : 'earned', car, () => makeShowCar(car));
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car, () => makeShowCar(car));
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car, () => makeShowCar(car));
  add('level', C.AMPHIBIOUS_TANK, () => makeShowCar(C.AMPHIBIOUS_TANK));
  for (const car of IDEA_CARS) add('idea', car, () => makeShowCar(car));
  for (const [kind, type] of Object.entries(CONFIG.vehicles)) {
    add('traffic', { id: 'traffic:' + kind, name: type.name || kind, model: type.model || kind }, () => {
      if (kind === 'tractor') return makeTractorModel();
      return type.model ? MODELS[type.model]({ ...type, id: kind, color: type.livery ?? 0xc8c8c8, evilColor: type.livery ?? 0x333333 }) : null;
    });
  }
  return { entries, C, IDEA_CARS, makeShowCar };
};

// ---- glass detection ----------------------------------------------------------------------------------------------------------
// 'strong': dark navy / teal / any transparent lit material; 'weak': the older cars' near-black tint (indistinguishable by colour from
// black trim, so a car's weak glass counts only when it has no strong glass at all)
export const glassClass = (mat) => {
  if (!mat || !mat.color) return null;
  if (mat.type === 'MeshBasicMaterial') return null; // (glowing: lamps, the ghost-white 0.9 lenses)
  const h = mat.color.getHex(), r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255;
  if (mat.map) return null; // (a textured decal: road dust, a livery)
  if (mat.transparent && mat.opacity < 0.95) return 'strong';
  if (b - r >= 12 && b >= g && Math.max(r, g, b) <= 0x70) return 'strong';
  if (Math.max(r, g, b) <= 0x18 && b - r >= 5 && b >= g) return 'weak';
  return null;
};
export const isGlassMat = (mat) => glassClass(mat) !== null;
const isTyreMat = (mat) => { if (!mat?.color || mat.type === 'MeshPhongMaterial') return false; const h = mat.color.getHex(), r = h >> 16 & 255, g = h >> 8 & 255, b = h & 255; return Math.max(r, g, b) <= 0x24 && Math.abs(r - b) <= 3; };

// ---- triangles in car space -----------------------------------------------------------------------------------------------------
const collect = (model) => {
  model.updateMatrixWorld(true);
  const glass = [], weak = [], body = [], bodyMesh = [], info = { glassMeshes: 0, instanced: 0, meshes: 0, discs: 0, domes: [] };
  const a = new THREE.Vector3(), tmp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  model.traverseVisible((node) => {
    if (!node.isMesh || !node.geometry?.attributes.position) return;
    if (node.isInstancedMesh) { info.instanced++; return; }
    info.meshes++;
    const mat = [].concat(node.material)[0], g = node.geometry, pos = g.attributes.position, idx = g.index;
    const n = idx ? idx.count : pos.count;
    const bodyMat = model.userData?.body?.material;
    const gclass = glassClass(mat);
    const isGlass = gclass !== null && mat !== bodyMat && !mat.vertexColors && !(bodyMat?.color && mat.color.getHex() === bodyMat.color.getHex()), isBody = !isGlass && mat.type !== 'MeshBasicMaterial' && (mat === bodyMat || !isTyreMat(mat));
    if (isGlass) info.glassMeshes++;
    if (!isGlass && !isBody) return;
    if (isGlass && ['CylinderGeometry', 'CircleGeometry', 'RingGeometry', 'TorusGeometry'].includes(g.type)) { info.discs++; return; } // (wheel rims and lamp lenses in a glass-like colour)
    if (isGlass && ['SphereGeometry', 'LatheGeometry', 'CapsuleGeometry'].includes(g.type)) { // a free-standing dome / bubble: its own class, not panels
      g.computeBoundingBox(); const bb = g.boundingBox.clone().applyMatrix4(node.matrixWorld);
      info.domes.push({ type: g.type, x: [r3(bb.min.x), r3(bb.max.x)], y: [r3(bb.min.y), r3(bb.max.y)], z: [r3(bb.min.z), r3(bb.max.z)] });
      return;
    }
    const out = isGlass ? (gclass === 'weak' ? weak : glass) : body, mine = [];
    for (let i = 0; i + 2 < n; i += 3) {
      const t = [];
      for (let k = 0; k < 3; k++) { const v = idx ? idx.getX(i + k) : i + k; a.fromBufferAttribute(pos, v).applyMatrix4(node.matrixWorld); t.push(a.x, a.y, a.z); }
      out.push(t); if (isBody) mine.push(t);
    }
    if (isBody && node === model.userData?.body) bodyMesh.push(...mine);
  });
  info.rule = glass.length || !weak.length ? 'navy' : 'tint';
  return { glass: glass.length ? glass : weak, body, bodyMesh, info };
};

// ---- glass pieces -------------------------------------------------------------------------------------------------------------
const triNormal = (t) => {
  const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2], vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
  return l < 1e-12 ? null : { n: [nx / l, ny / l, nz / l], area: l / 2 };
};
export const pieces = (tris) => {
  const key = (x, y, z) => Math.round(x * 2000) + ',' + Math.round(y * 2000) + ',' + Math.round(z * 2000);
  const vid = new Map(), ids = (t) => [0, 3, 6].map(o => { const k = key(t[o], t[o + 1], t[o + 2]); if (!vid.has(k)) vid.set(k, vid.size); return vid.get(k); });
  const items = [];
  for (const t of tris) { const nn = triNormal(t); if (nn) items.push({ t, n: nn.n, area: nn.area, v: ids(t) }); }
  const parent = items.map((_, i) => i), find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const edges = new Map();
  items.forEach((it, i) => { for (let e = 0; e < 3; e++) { const p = it.v[e], q = it.v[(e + 1) % 3], k = p < q ? p + '_' + q : q + '_' + p; (edges.get(k) || edges.set(k, []).get(k)).push(i); } });
  for (const list of edges.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const A = items[list[a]], B = items[list[b]];
    if (Math.abs(A.n[0] * B.n[0] + A.n[1] * B.n[1] + A.n[2] * B.n[2]) >= 0.906) parent[find(list[a])] = find(list[b]);
  }
  const groups = new Map();
  items.forEach((it, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(it); });
  const out = [];
  for (const list of groups.values()) {
    let area = 0; const nsum = [0, 0, 0], c = [0, 0, 0], ref = list[0].n;
    for (const it of list) {
      const sg = it.n[0] * ref[0] + it.n[1] * ref[1] + it.n[2] * ref[2] < 0 ? -1 : 1;
      for (let k = 0; k < 3; k++) nsum[k] += sg * it.n[k] * it.area;
      area += it.area;
      for (let k = 0; k < 3; k++) c[k] += it.area * (it.t[k] + it.t[3 + k] + it.t[6 + k]) / 3;
    }
    const nl = Math.hypot(...nsum) || 1, n = nsum.map(v => v / nl), cen = c.map(v => v / area);
    let spread = 0; // area-weighted mean angle of the triangle normals from the piece's mean normal, degrees
    for (const it of list) { const d = Math.abs(it.n[0] * n[0] + it.n[1] * n[1] + it.n[2] * n[2]); spread += it.area * Math.acos(Math.min(1, d)) * 180 / Math.PI; }
    spread /= area;
    const verts = new Map();
    for (const it of list) for (let o = 0; o < 9; o += 3) verts.set(key(it.t[o], it.t[o + 1], it.t[o + 2]), [it.t[o], it.t[o + 1], it.t[o + 2]]); // [x, y, z]
    const V = [...verts.values()];
    let dev = 0; for (const p of V) dev = Math.max(dev, Math.abs((p[0] - cen[0]) * n[0] + (p[1] - cen[1]) * n[1] + (p[2] - cen[2]) * n[2]));
    out.push({ area, n, cen, spread, V, dev, tris: list.length });
  }
  return out;
};

// ---- small geometry helpers ---------------------------------------------------------------------------------------------------
// convex hull of points [z, y, x] in (z, y); returns { loop, lower, upper } (z ascending for lower / upper)
const hull = (pts) => {
  const P = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (arr) => { const h = []; for (const p of arr) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 1e-7) h.pop(); h.push(p); } return h; };
  const lower = chain(P), upper = chain(P.slice().reverse()).reverse();
  return { lower, upper, loop: [...lower, ...upper.slice().reverse().slice(1, -1)] };
};
const interp = (poly, key, at, val) => { // poly sorted by `key` index ascending: value (index val) at `at`
  if (poly.length === 1) return poly[0][val];
  for (let i = 0; i + 1 < poly.length; i++) {
    const p = poly[i], q = poly[i + 1];
    if (at >= Math.min(p[key], q[key]) - 1e-9 && at <= Math.max(p[key], q[key]) + 1e-9) { const d = q[key] - p[key]; return Math.abs(d) < 1e-9 ? Math.max(p[val], q[val]) : p[val] + (q[val] - p[val]) * (at - p[key]) / d; }
  }
  return null;
};
const fitSlope = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; } return sxx < 1e-9 ? 0 : sxy / sxx; };
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const cm = (m) => Math.round(m * 1000) / 10; // metres -> cm, one decimal
const r1 = (v) => Math.round(v * 10) / 10;

// ---- the side-view mask (the body's side profile) ------------------------------------------------------------------------------
const CELL = 0.01;
const makeMask = (tris, box) => {
  const z0 = box.zmin - 0.1, y0 = box.ymin - 0.05, W = Math.ceil((box.zmax - box.zmin + 0.2) / CELL) + 2, H = Math.ceil((box.ymax - box.ymin + 0.1) / CELL) + 2;
  const m = new Uint8Array(W * H);
  const setc = (z, y) => { const i = Math.round((z - z0) / CELL), j = Math.round((y - y0) / CELL); if (i >= 0 && i < W && j >= 0 && j < H) m[j * W + i] = 1; };
  for (const t of tris) {
    const P = [[t[2], t[1]], [t[5], t[4]], [t[8], t[7]]];
    const jmin = Math.ceil((Math.min(P[0][1], P[1][1], P[2][1]) - y0) / CELL), jmax = Math.floor((Math.max(P[0][1], P[1][1], P[2][1]) - y0) / CELL);
    for (let j = jmin; j <= jmax; j++) {
      const y = y0 + j * CELL; let xa = Infinity, xb = -Infinity;
      for (let e = 0; e < 3; e++) {
        const p = P[e], q = P[(e + 1) % 3];
        if (p[1] === q[1]) { if (Math.abs(y - p[1]) < 1e-9) { xa = Math.min(xa, p[0], q[0]); xb = Math.max(xb, p[0], q[0]); } continue; }
        if (y >= Math.min(p[1], q[1]) && y <= Math.max(p[1], q[1])) { const x = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]); xa = Math.min(xa, x); xb = Math.max(xb, x); }
      }
      if (xa <= xb) for (let i = Math.ceil((xa - z0) / CELL); i <= Math.floor((xb - z0) / CELL); i++) if (i >= 0 && i < W) m[j * W + i] = 1;
    }
    for (let e = 0; e < 3; e++) { const p = P[e], q = P[(e + 1) % 3], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(len / (CELL / 2))); for (let k = 0; k <= n; k++) setc(p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n); }
  }
  // opening with a 5 x 5 square (removes aerials, stalks and anything under 4 cm), separable
  const R = 2, pass = (src, horiz, isMin) => {
    const dst = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let v = isMin ? 1 : 0;
      for (let d = -R; d <= R; d++) { const ii = horiz ? i + d : i, jj = horiz ? j : j + d; const s = ii < 0 || ii >= W || jj < 0 || jj >= H ? 0 : src[jj * W + ii]; if (isMin) { if (!s) { v = 0; break; } } else if (s) { v = 1; break; } }
      dst[j * W + i] = v;
    }
    return dst;
  };
  const opened = pass(pass(pass(pass(m, true, true), false, true), true, false), false, false);
  // exterior flood fill, then the boundary cells that touch it
  const ext = new Uint8Array(W * H), stack = [];
  for (let i = 0; i < W; i++) { stack.push(i, (H - 1) * W + i); } for (let j = 0; j < H; j++) stack.push(j * W, j * W + W - 1);
  while (stack.length) { const c = stack.pop(); if (ext[c] || opened[c]) continue; ext[c] = 1; const i = c % W, j = (c / W) | 0; if (i > 0) stack.push(c - 1); if (i < W - 1) stack.push(c + 1); if (j > 0) stack.push(c - W); if (j < H - 1) stack.push(c + W); }
  const K = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const c = j * W + i; if (!opened[c]) continue; if (i === 0 || j === 0 || i === W - 1 || j === H - 1 || ext[c - 1] || ext[c + 1] || ext[c - W] || ext[c + W]) K.push([z0 + i * CELL, y0 + j * CELL]); }
  const top = new Float32Array(W).fill(NaN);
  for (let i = 0; i < W; i++) for (let j = H - 1; j >= 0; j--) if (opened[j * W + i]) { top[i] = y0 + j * CELL; break; }
  const R_ = (z) => { const f = (z - z0) / CELL, i = Math.round(f); return i >= 0 && i < W ? top[i] : NaN; };
  const inside = (z, y) => { const i = Math.round((z - z0) / CELL), j = Math.round((y - y0) / CELL); return i >= 0 && i < W && j >= 0 && j < H && opened[j * W + i] === 1; };
  const dist = (z, y) => { let d = Infinity; for (const k of K) { const dd = (k[0] - z) ** 2 + (k[1] - y) ** 2; if (dd < d) d = dd; } return Math.sqrt(d); };
  return { W, H, z0, y0, mask: opened, K, R: R_, inside, dist };
};

// ---- the analysis of one vehicle ----------------------------------------------------------------------------------------------------
export const analyse = (model) => {
  const { glass, body, bodyMesh, info } = collect(model);
  const res = { glassRule: info.rule, glassMeshes: info.glassMeshes, glassTris: glass.length, instanced: info.instanced, domes: info.domes, parts: { side: 0, front: 0, rear: 0, roof: 0, other: 0 } };
  if (!glass.length && !info.domes.length) return { ...res, status: 'noglass' };
  if (!glass.length) return { ...res, status: 'dome' };
  const ext = (p, k) => { const v = p.V.map(q => q[k]); return Math.max(...v) - Math.min(...v); };
  // (drop slivers and lamp lenses: a window piece is at least 12 cm long and 6 cm high, a screen at least 20 cm across)
  const raw = pieces(glass);
  // a smoothly curved solid of glass (a rounded extruded canopy, a bubble): one piece whose normals fan out; not panels
  const canopies = raw.filter(p => p.spread > 20 && p.area > 0.15).map(p => ({ top: r3(Math.max(...p.V.map(v => v[1]))), bot: r3(Math.min(...p.V.map(v => v[1]))), z: [r3(Math.min(...p.V.map(v => v[2]))), r3(Math.max(...p.V.map(v => v[2])))], halfW: r3(Math.max(...p.V.map(v => Math.abs(v[0])))), spreadDeg: r1(p.spread) }));
  res.canopies = canopies;
  const all = raw.filter(p => !(p.spread > 20 && p.area > 0.15)).filter(p => p.area >= 0.012 && (Math.abs(p.n[0]) >= 0.55 ? ext(p, 2) >= 0.12 && ext(p, 1) >= 0.06 : ext(p, 0) >= 0.2 && ext(p, 1) >= 0.03));
  // orient and class
  const sidePcs = all.filter(p => Math.abs(p.n[0]) >= 0.55 && Math.abs(p.n[0]) > Math.abs(p.n[2]));
  const zc = sidePcs.length ? sidePcs.reduce((s, p) => s + p.cen[2] * p.area, 0) / sidePcs.reduce((s, p) => s + p.area, 0) : (Math.min(...glass.flatMap(t => [t[2], t[5], t[8]])) + Math.max(...glass.flatMap(t => [t[2], t[5], t[8]]))) / 2;
  const cls = [];
  for (const p of all) {
    const q = { ...p, n: p.n.slice() };
    if (Math.abs(q.n[0]) >= 0.55 && Math.abs(q.n[0]) > Math.abs(q.n[2])) { // a side window: outward = away from the centre line
      if (Math.abs(q.cen[0]) < 0.12) { q.kind = 'other'; } else { if (q.n[0] * q.cen[0] < 0) q.n = q.n.map(v => -v); q.kind = 'side'; q.side = q.cen[0] > 0 ? 'L' : 'R'; }
    } else if (Math.abs(q.n[1]) >= 0.9) { q.kind = 'roof'; if (q.n[1] < 0) q.n = q.n.map(v => -v); }
    else if (Math.abs(q.n[2]) >= 0.3) { // windscreen (front) or rear glass: outward = away from the cabin centre along z
      if (q.n[2] * (q.cen[2] - zc) < 0) q.n = q.n.map(v => -v);
      q.kind = q.n[2] > 0 ? 'front' : 'rear';
    } else q.kind = 'other';
    cls.push(q);
  }
  // a thin glass box is two faces: keep the outer one
  const bbx = (p, i) => { const v = p.V.map(q => q[i]); return [Math.min(...v), Math.max(...v)]; };
  const overlapFrac = (p, o, axes) => axes.reduce((f, i) => { const A = bbx(p, i), B = bbx(o, i), ov = Math.min(A[1], B[1]) - Math.max(A[0], B[0]), sm = Math.max(1e-6, Math.min(A[1] - A[0], B[1] - B[0])); return f * Math.max(0, Math.min(1, ov / sm)); }, 1);
  const outAlong = (q) => q.cen[0] * q.n[0] + q.cen[1] * q.n[1] + q.cen[2] * q.n[2];
  const keep = [];
  for (const p of cls) {
    const axes = p.kind === 'side' ? [2, 1] : [0, 1];
    const twin = cls.find(o => o !== p && o.kind === p.kind && (p.kind === 'side' ? o.side === p.side : true) && o.n[0] * p.n[0] + o.n[1] * p.n[1] + o.n[2] * p.n[2] > 0.9
      && Math.abs((o.cen[0] - p.cen[0]) * p.n[0] + (o.cen[1] - p.cen[1]) * p.n[1] + (o.cen[2] - p.cen[2]) * p.n[2]) < 0.09 && overlapFrac(p, o, axes) > 0.5);
    if (twin && (outAlong(twin) > outAlong(p) + 1e-6 || (Math.abs(outAlong(twin) - outAlong(p)) <= 1e-6 && cls.indexOf(twin) < cls.indexOf(p)))) continue; // (a thin glass box: its outer face only)
    keep.push(p);
  }
  for (const p of keep) res.parts[p.kind]++;
  // the screens: the outermost glass facing the front (rear): a glasshouse block's own end face behind a raked slab is hidden, not the screen
  const outermost = (list, dir) => { const c = list.filter(p => p.area >= 0.1); if (!c.length) return list.filter(p => p.area >= 0.05); const zf = Math.max(...c.map(p => p.cen[2] * dir)); return c.filter(p => p.cen[2] * dir >= zf - 0.12); };
  let front = keep.filter(p => p.kind === 'front' && p.area >= 0.05), rear = keep.filter(p => p.kind === 'rear' && p.area >= 0.05);
  // (a thin glass slab's own edge faces are side-class pieces lying inside its side profile: not windows)
  const bb = (p, i) => { const v = p.V.map(q => q[i]); return [Math.min(...v), Math.max(...v)]; };
  const slabEdge = (p) => keep.some(q => (q.kind === 'front' || q.kind === 'rear') && q.area > 2 * p.area && bb(p, 2)[0] >= bb(q, 2)[0] - 0.05 && bb(p, 2)[1] <= bb(q, 2)[1] + 0.05 && bb(p, 1)[0] >= bb(q, 1)[0] - 0.05 && bb(p, 1)[1] <= bb(q, 1)[1] + 0.05);
  let sides = { L: keep.filter(p => p.kind === 'side' && p.side === 'L' && p.area >= 0.03 && !slabEdge(p)), R: keep.filter(p => p.kind === 'side' && p.side === 'R' && p.area >= 0.03 && !slabEdge(p)) };

  // ---- the body's side profile (silhouette) ----
  const gz = glass.flatMap(t => [t[2], t[5], t[8]]), gy = glass.flatMap(t => [t[1], t[4], t[7]]);
  const bz = body.flatMap(t => [t[2], t[5], t[8]]), by = body.flatMap(t => [t[1], t[4], t[7]]);
  const box = { zmin: Math.min(...bz, ...gz), zmax: Math.max(...bz, ...gz), ymin: Math.min(...by, ...gy), ymax: Math.max(...by, ...gy) };
  const polyOf = (p) => hull(p.V.map(v => [v[2], v[1], v[0]]));
  const mkParts = makeMask(body, box), mkBody = bodyMesh.length ? makeMask(bodyMesh, box) : null;
  let mk = mkParts, contour = 'parts'; // (the filters below use all parts; the contour for the numbers is chosen after them)
  // (a lamp lens, a grille slat or a badge in glass colour is not a window: a window's top is within 1 m of the roofline, a screen's within 1.2 m; the greenhouse band below does the rest)
  const nearRoof = (z, y, d) => { const r = mk.R(z); return !Number.isNaN(r) && y >= r - d; };
  const polyTop = (p) => Math.max(...p.V.map(v => v[1]));
  sides = { L: sides.L.filter(p => nearRoof(p.cen[2], polyTop(p), 1.0)), R: sides.R.filter(p => nearRoof(p.cen[2], polyTop(p), 1.0)) };
  front = front.filter(p => nearRoof(p.cen[2], polyTop(p), 1.2)); rear = rear.filter(p => nearRoof(p.cen[2], polyTop(p), 1.2));
  // the greenhouse: the largest side window anchors a height band; other windows must share it (not a lamp lens, a grille or a badge)
  const allSide = [...sides.L, ...sides.R];
  if (allSide.length) {
    const anchor = allSide.reduce((a, b) => (b.area > a.area ? b : a)), aLo = Math.min(...anchor.V.map(v => v[1])), aHi = polyTop(anchor);
    const inBand = (p) => { const lo = Math.min(...p.V.map(v => v[1])), hi = polyTop(p); return Math.min(hi, aHi) - Math.max(lo, aLo) >= 0.5 * (hi - lo); };
    sides = { L: sides.L.filter(inBand), R: sides.R.filter(inBand) };
    const kept = [...sides.L, ...sides.R], zlo = Math.min(...kept.map(p => Math.min(...p.V.map(v => v[2])))), zhi = Math.max(...kept.map(p => Math.max(...p.V.map(v => v[2]))));
    const nearCabin = (p) => { const lo = Math.min(...p.V.map(v => v[1])), hi = polyTop(p); return p.cen[2] >= zlo - 1.5 && p.cen[2] <= zhi + 1.5 && hi >= aLo && lo <= aHi + 0.4; };
    front = front.filter(nearCabin); rear = rear.filter(nearCabin);
  }
  front = outermost(front, 1); rear = outermost(rear, -1);
  // the contour for the numbers: the body mesh's own side profile when it holds the glass, else every body part
  const nearM = (m, z, y) => m.inside(z, y) || m.dist(z, y) <= 0.03;
  const floating = (p) => p.V.every(v => !mkParts.inside(v[2], v[1]) && mkParts.dist(v[2], v[1]) > 0.15); // a glass piece 15 cm or more clear of every body part
  const floaters = [front, rear, sides.L, sides.R].flat().filter(floating);
  res.floating = floaters.map(p => ({ area: r3(p.area), z: r3(p.cen[2]), y: r3(p.cen[1]) }));
  front = front.filter(p => !floaters.includes(p)); rear = rear.filter(p => !floaters.includes(p)); sides = { L: sides.L.filter(p => !floaters.includes(p)), R: sides.R.filter(p => !floaters.includes(p)) };
  const gv = [...front, ...rear, ...sides.L, ...sides.R].flatMap(p => p.V.map(v => [v[2], v[1]]));
  const covered = (m) => (gv.length ? gv.filter(([z, y]) => nearM(m, z, y)).length / gv.length : 1);
  if (mkBody && covered(mkBody) >= 0.8) { mk = mkBody; contour = 'body'; } else { mk = mkParts; contour = covered(mkParts) >= 0.8 ? 'parts' : 'parts(glass outside)'; }
  res.contour = contour; res.glassOutsidePct = Math.round(100 * (1 - covered(mk)));
  for (const c of canopies) { let mx = -Infinity; for (let z = c.z[0]; z <= c.z[1]; z += 0.02) { const r = mk.R(z); if (!Number.isNaN(r)) mx = Math.max(mx, r); } c.aboveBodyCm = mx === -Infinity ? null : cm(c.top - mx); }

  // ---- windscreen / rear glass ----
  const edgeOf = (pcs, s) => { // the outermost side edge of the glass on side s: [{y, z, x}] sorted by y
    const V = pcs.flatMap(p => p.V).filter(v => v[0] * s > 0); if (!V.length) return null;
    const mx = Math.max(...V.map(v => v[0] * s)), E = V.filter(v => v[0] * s >= 0.55 * mx).map(v => ({ y: v[1], z: v[2], x: v[0] })).sort((a, b) => a.y - b.y);
    const out = []; for (const e of E) { if (out.length && Math.abs(out[out.length - 1].y - e.y) < 0.003) { if (e.x * s > out[out.length - 1].x * s) out[out.length - 1] = e; } else out.push(e); }
    return out;
  };
  const glassInfo = (pcs) => {
    if (!pcs.length) return null;
    const V = pcs.flatMap(p => p.V), top = Math.max(...V.map(v => v[1])), bot = Math.min(...V.map(v => v[1]));
    const topZ = V.filter(v => v[1] >= top - 0.01).reduce((s, v, _, a) => s + v[2] / a.length, 0), botZ = V.filter(v => v[1] <= bot + 0.01).reduce((s, v, _, a) => s + v[2] / a.length, 0);
    const spread = pcs.reduce((s, p) => s + p.spread * p.area, 0) / pcs.reduce((s, p) => s + p.area, 0);
    return { top, bot, topZ, botZ, halfW: Math.max(...V.map(v => Math.abs(v[0]))), curved: spread > 8 || pcs.some(p => p.dev > 0.03), n: pcs.length, rakeDeg: Math.atan2(topZ - botZ, top - bot) * 180 / Math.PI };
  };
  const ws = glassInfo(front), rg = glassInfo(rear);
  res.ws = ws && { top: r3(ws.top), topZ: r3(ws.topZ), bot: r3(ws.bot), halfW: r3(ws.halfW), rakeDeg: r1(ws.rakeDeg), panels: ws.n, curved: ws.curved };
  res.rg = rg && { top: r3(rg.top), topZ: r3(rg.topZ), bot: r3(rg.bot), halfW: r3(rg.halfW), rakeDeg: r1(rg.rakeDeg), panels: rg.n, curved: rg.curved };

  // ---- each side window ----
  const winOut = { L: [], R: [] };
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1;
    for (const p of sides[side]) {
      const h = polyOf(p), loop = h.loop;
      const ys = loop.map(v => v[1]), ymin = Math.min(...ys), ymax = Math.max(...ys), ymid = (ymin + ymax) / 2;
      const upperHalf = loop.filter(v => v[1] >= ymid), lowerHalf = loop.filter(v => v[1] < ymid + 1e-9);
      const TF = upperHalf.reduce((a, b) => (b[0] > a[0] ? b : a)), TR = upperHalf.reduce((a, b) => (b[0] < a[0] ? b : a));
      const BF = (lowerHalf.length ? lowerHalf : loop).reduce((a, b) => (b[0] > a[0] ? b : a)), BR = (lowerHalf.length ? lowerHalf : loop).reduce((a, b) => (b[0] < a[0] ? b : a));
      const path = (A, B, dir) => { // the way round the loop from A to B on the front (dir 1) or rear (-1) side, as a polyline of [z, y, x]
        const i = loop.indexOf(A), j = loop.indexOf(B), n = loop.length, fwd = [], bwd = [];
        for (let k = i; ; k = (k + 1) % n) { fwd.push(loop[k]); if (k === j) break; }
        for (let k = i; ; k = (k - 1 + n) % n) { bwd.push(loop[k]); if (k === j) break; }
        const mz = (a) => a.reduce((t, v) => t + v[0], 0) / a.length;
        return A === B ? [A] : ((mz(fwd) - mz(bwd)) * dir >= 0 ? fwd : bwd);
      };
      const frontEdge = path(BF, TF, 1).sort((a, b) => a[1] - b[1]), rearEdge = path(BR, TR, -1).sort((a, b) => a[1] - b[1]);
      // top edge vs the roofline, over TR..TF
      const span = TF[0] - TR[0], N = 40, gaps = [], wy = [], ry = [], zz = [], dists = [];
      for (let i = 0; i <= N && span > 0.05; i++) {
        const z = TR[0] + span * i / N, y = interp(h.upper, 0, z, 1), r = mk.R(z);
        if (y == null || Number.isNaN(r)) continue;
        zz.push(z); wy.push(y); ry.push(r); gaps.push(r - y);
        if (i >= 1 && i <= N - 1) dists.push(mk.dist(z, y) * (mk.inside(z, y) ? 1 : -1));
      }
      const topAngle = zz.length > 3 ? Math.abs(Math.atan(fitSlope(zz, wy)) - Math.atan(fitSlope(zz, ry))) * 180 / Math.PI : null;
      // pillar insets: distance of the front / rear edge (above the bonnet / boot line) to the body contour
      const edgeDist = (E, zRef, dirSign) => {
        const yLine = mk.R(zRef + dirSign * 0.35), out = [];
        if (!E.length || Number.isNaN(yLine)) return out;
        const top = E[E.length - 1], bot = E[0];
        for (let i = 0; i <= 12; i++) {
          const y = bot[1] + (top[1] - bot[1]) * i / 12; if (y < yLine + 0.03 || y > top[1] - 0.005) continue;
          const z = interp(E, 1, y, 0); if (z == null) continue;
          out.push(mk.dist(z, y) * (mk.inside(z, y) ? 1 : -1));
        }
        return out;
      };
      const dF = edgeDist(frontEdge, TF[0], 1), dR = edgeDist(rearEdge, TR[0], -1);
      const kinds = loop.length <= 3 ? 'tri' : loop.length === 4 ? 'quad' : 'poly' + loop.length;
      winOut[side].push({
        zc: (TF[0] + TR[0]) / 2, TF: [r3(TF[0]), r3(TF[1]), r3(TF[2])], TR: [r3(TR[0]), r3(TR[1]), r3(TR[2])], BF: [r3(BF[0]), r3(BF[1])], BR: [r3(BR[0]), r3(BR[1])],
        ymin: r3(ymin), ymax: r3(ymax), verts: loop.length, shape: kinds, curved: p.spread > 8 || p.dev > 0.03 || loop.length > 10, spreadDeg: r1(p.spread),
        topAngle: topAngle == null ? null : r1(topAngle), insetRange: gaps.length ? cm(Math.max(...gaps) - Math.min(...gaps)) : null,
        insetMin: gaps.length ? cm(Math.min(...gaps)) : null, insetMax: gaps.length ? cm(Math.max(...gaps)) : null,
        distRange: dists.length ? r1(cm(Math.max(...dists) - Math.min(...dists))) : null, distMedian: dists.length ? cm(median(dists)) : null,
        frontDist: dF.length ? { n: dF.length, range: cm(Math.max(...dF) - Math.min(...dF)), median: cm(median(dF)) } : null,
        rearDist: dR.length ? { n: dR.length, range: cm(Math.max(...dR) - Math.min(...dR)), median: cm(median(dR)) } : null,
        _frontEdge: frontEdge, _rearEdge: rearEdge, _h: h,
      });
    }
    winOut[side].sort((a, b) => a.zc - b.zc);
  }
  // ---- the meetings: windscreen / A-pillar, rear glass / C-pillar, and the pillar widths ----
  const pillar = (win, edgeKey, g, gEdge, s) => {
    if (!win || !g || !gEdge) return null;
    const E = win[edgeKey]; if (E.length < 1) return null;
    const lo = Math.max(E[0][1], gEdge[0].y), hi = Math.min(E[E.length - 1][1], gEdge[gEdge.length - 1].y);
    if (hi - lo < 0.04) return { n: 0 };
    const w = [];
    for (let i = 0; i <= 10; i++) {
      const y = lo + (hi - lo) * i / 10, z1 = interp(E, 1, y, 0), x1 = interp(E, 1, y, 2), ge = gEdge.map(e => [e.z, e.y, e.x]), z2 = interp(ge, 1, y, 0), x2 = interp(ge, 1, y, 2);
      if ([z1, x1, z2, x2].some(v => v == null)) continue;
      w.push({ y, w: Math.hypot(x1 - x2, z1 - z2), dz: z2 - z1 });
    }
    const angWin = Math.atan2(E[E.length - 1][0] - E[0][0], E[E.length - 1][1] - E[0][1]) * 180 / Math.PI, angG = Math.atan2(gEdge[gEdge.length - 1].z - gEdge[0].z, gEdge[gEdge.length - 1].y - gEdge[0].y) * 180 / Math.PI;
    return { n: w.length, wTop: cm(w[w.length - 1].w), wBot: cm(w[0].w), wMin: cm(Math.min(...w.map(v => v.w))), wMax: cm(Math.max(...w.map(v => v.w))), range: cm(Math.max(...w.map(v => v.w)) - Math.min(...w.map(v => v.w))), angleDiff: r1(Math.abs(angWin - angG)), meanDz: cm(w.reduce((t, v) => t + v.dz, 0) / w.length) };
  };
  const sidesOut = {};
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1, wins = winOut[side];
    if (!wins.length) { sidesOut[side] = { n: 0 }; continue; }
    const fw = wins[wins.length - 1], rw = wins[0];
    const wsE = ws ? edgeOf(front, s) : null, rgE = rg ? edgeOf(rear, s) : null;
    const A = ws ? { dY: cm(ws.top - fw.TF[1]), dZ: cm(ws.topZ - fw.TF[0]), sideTopY: fw.TF[1], pillar: pillar(fw, '_frontEdge', ws, wsE, s) } : null;
    const Cc = rg ? { dY: cm(rg.top - rw.TR[1]), dZ: cm(rg.topZ - rw.TR[0]), sideTopY: rw.TR[1], pillar: pillar(rw, '_rearEdge', rg, rgE, s) } : null;
    const strip = (w) => { const o = { ...w }; delete o._frontEdge; delete o._rearEdge; delete o._h; return o; };
    sidesOut[side] = { n: wins.length, A, C: Cc, front: strip(fw), rear: strip(rw) };
  }
  res.sides = sidesOut;
  res.windows = {}; for (const side of ['L', 'R']) res.windows[side] = winOut[side].map(w => { const o = { ...w }; delete o._frontEdge; delete o._rearEdge; delete o._h; return o; });
  res._debug = { mk, mkParts, mkBody, gv, winOut, ws, rg, front, rear, keep, sides };
  return res;
};
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---- verdicts -----------------------------------------------------------------------------------------------------------------
const grade = (v, t) => (v == null ? null : v <= t.ok ? 'pass' : v <= t.bad ? 'marginal' : 'fail');
const worse = (...gs) => { const g = gs.filter(Boolean); return g.includes('fail') ? 'fail' : g.includes('marginal') ? 'marginal' : g.length ? 'pass' : null; };
const maxAbs = (...v) => { const a = v.filter(x => x != null).map(Math.abs); return a.length ? Math.max(...a) : null; };
export const summarise = (res) => {
  if (res.status === 'noglass') return res;
  if (res.status === 'dome') return { ...res, summary: { shape: 'dome', fault1: 'fail', fault2: null, dome: true } };
  const hasCanopy = !!(res.canopies?.length || res.domes?.length);
  if (!res.windows.L.length && !res.windows.R.length) return { ...res, summary: { shape: hasCanopy ? 'canopy' : 'screen-only', fault1: hasCanopy ? 'fail' : null, fault2: null, canopy: hasCanopy, noWindscreen: !res.ws, noRearGlass: !res.rg, nSideWindows: 0 } };
  const S = res.sides, both = ['L', 'R'].map(k => S[k]).filter(x => x.n);
  const side = (k) => S[k];
  const dyA = maxAbs(...both.map(x => x.A?.dY)), dyC = maxAbs(...both.map(x => x.C?.dY));
  const signedA = both.length && both[0].A ? r1(both.reduce((t, x) => t + (x.A?.dY ?? 0), 0) / both.length) : null;
  const signedC = both.length && both[0].C ? r1(both.reduce((t, x) => t + (x.C?.dY ?? 0), 0) / both.length) : null;
  const wins = [...res.windows.L, ...res.windows.R];
  const angles = wins.map(w => w.topAngle).filter(v => v != null), insets = wins.map(w => w.insetRange).filter(v => v != null);
  const topAngle = angles.length ? Math.max(...angles) : null, topInset = insets.length ? Math.max(...insets) : null;
  const pw = both.flatMap(x => [x.A?.pillar, x.C?.pillar]).filter(p => p && p.n);
  const pillarRange = pw.length ? Math.max(...pw.map(p => p.range)) : null;
  const pillarAngle = pw.length ? Math.max(...pw.map(p => p.angleDiff)) : null;
  // left / right symmetry: the front and rear window corners and the top edge
  let sym = null;
  if (S.L.n && S.R.n) {
    const a = S.L, b = S.R;
    const diffs = [Math.abs(a.front.TF[1] - b.front.TF[1]), Math.abs(a.rear.TR[1] - b.rear.TR[1]), Math.abs(a.front.TF[0] - b.front.TF[0]), Math.abs(a.rear.TR[0] - b.rear.TR[0]), Math.abs(a.front.ymin - b.front.ymin)];
    sym = cm(Math.max(...diffs)); if (a.n !== b.n) sym = Math.max(sym, 99);
  } else if (S.L.n !== S.R.n) sym = 99;
  const curved = wins.some(w => w.curved) || !!res.ws?.curved || !!res.rg?.curved;
  const shape = !wins.length ? 'none' : hasCanopy ? 'canopy+panels' : curved ? 'curved' : [...new Set(wins.map(w => w.shape))].join('/');
  const g2 = worse(grade(dyA, TOL.dy), grade(dyC, TOL.dy));
  // fault 1: the edges follow the contour at a constant inset: top-edge slope, top inset variation, pillar width constancy / parallelism
  const g1parts = [grade(topAngle, TOL.angle), grade(topInset, TOL.inset), grade(pillarRange, TOL.pillar)];
  if (curved || hasCanopy) g1parts.push('fail');
  const g1 = worse(...g1parts);
  const noScreen = !res.ws, noRear = !res.rg;
  return {
    ...res, summary: {
      windscreenHigherCm: signedA, rearGlassHigherCm: signedC, dyA: dyA == null ? null : r1(dyA), dyC: dyC == null ? null : r1(dyC),
      topAngleDeg: topAngle, topInsetRangeCm: topInset, pillarRangeCm: pillarRange == null ? null : r1(pillarRange), pillarAngleDeg: pillarAngle,
      symCm: sym, shape, fault2: g2, fault1: g1, noWindscreen: noScreen, noRearGlass: noRear, nSideWindows: wins.length,
    },
  };
};

// ---- png (for looking) ----------------------------------------------------------------------------------------------------------
const png = (W, H, rgb) => {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const raw = Buffer.alloc((W * 3 + 1) * H); for (let j = 0; j < H; j++) { raw[j * (W * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + j * W * 3, W * 3).copy(raw, j * (W * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
export const drawPng = (res, file, scale = 3) => {
  const { mk, winOut } = res._debug; // 1 cell = `scale` px
  const w = mk.W * scale, h = mk.H * scale, rgb = new Uint8Array(w * h * 3).fill(250);
  const px = (i, j, c) => { if (i >= 0 && i < w && j >= 0 && j < h) { const o = ((h - 1 - j) * w + i) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2]; } };
  for (let j = 0; j < mk.H; j++) for (let i = 0; i < mk.W; i++) if (mk.mask[j * mk.W + i]) for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) px(i * scale + a, j * scale + b, [215, 215, 220]);
  for (const k of mk.K) px(Math.round((k[0] - mk.z0) / CELL) * scale + 1, Math.round((k[1] - mk.y0) / CELL) * scale + 1, [230, 80, 160]); // the contour (pink)
  const line = (a, b, c) => { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / CELL * scale)); for (let k = 0; k <= n; k++) px(Math.round(((a[0] + (b[0] - a[0]) * k / n) - mk.z0) / CELL * scale) + 1, Math.round(((a[1] + (b[1] - a[1]) * k / n) - mk.y0) / CELL * scale) + 1, c); };
  for (const side of ['L', 'R']) for (const wn of winOut[side]) { const L = wn._h.loop; for (let i = 0; i < L.length; i++) line([L[i][0], L[i][1]], [L[(i + 1) % L.length][0], L[(i + 1) % L.length][1]], side === 'L' ? [110, 40, 200] : [40, 150, 90]); }
  for (const [pcs, col] of [[res._debug.front, [230, 120, 0]], [res._debug.rear, [0, 140, 200]]]) for (const p of pcs) { const L = hull(p.V.map(v => [v[2], v[1], v[0]])).loop; for (let i = 0; i < L.length; i++) line([L[i][0], L[i][1]], [L[(i + 1) % L.length][0], L[(i + 1) % L.length][1]], col); }
  writeFileSync(file, png(w, h, rgb));
};

// ---- main -------------------------------------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const pngDir = flag('--png') ? args[args.indexOf('--png') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && !(pngDir && args[i - 1] === '--png'));
const ORIGIN = (e) => (e.group === 'traffic' ? 'traffic' : e.group === 'idea' && TODAY.has(e.id) ? 'built today' : 'older');
const TODAY = new Set(['wedgemicro', 'farmtractor', 'flatbed', 'moke', 'halftrack', 'sprinthatch', 'autobahnestate', 'finlandyacht', 'trophytruck', 'armouredlimo',
  'keivan', 'supermini', 'minibus', 'cranelorry', 'moorrover', 'sporttruck', 'pixelev', 'touringcar', 'hillclimb']); // (the D1-D5 and E1-E5 batches' idea ids)
export const run = async () => {
  const { load, close, ROOT } = await startModels();
  const results = [];
  try {
    const { entries, IDEA_CARS, C, makeShowCar } = await buildAll(load);
    const makeBase = (car) => makeShowCar(car);
    if (pngDir) mkdirSync(pngDir, { recursive: true });
    for (const e of entries) {
      if (only.length && !only.includes(e.id) && !only.includes(e.model)) continue;
      let model = null, err = null;
      try { model = e.build(); } catch (x) { err = x.message; }
      if (!model) { results.push({ key: e.key, group: e.group, id: e.id, name: e.name, model: e.model, origin: ORIGIN(e), status: err ? 'error: ' + err : 'nomodel' }); continue; }
      model.parent?.remove(model);
      if (e.group === 'super') { // (the body kit's wing, scoops and skirts are not the body's profile: hide what the base car does not have)
        const base = C.CARS.find(c => c.id === e.id.replace(/^super-/, ''));
        if (base) { const b = makeBase(base); model.children.slice(b.children.length).forEach(c => { c.visible = false; }); }
      }
      let r; try { r = summarise(analyse(model)); } catch (x) { r = { status: 'error: ' + x.stack.split('\n').slice(0, 2).join(' ') }; }
      if (pngDir && r._debug) drawPng(r, pngDir + '/' + e.id.replace(/[^\w-]/g, '_') + '.png');
      delete r._debug;
      results.push({ key: e.key, group: e.group, id: e.id, name: e.name, model: e.model, origin: ORIGIN(e), ...r });
    }
    return { results, ROOT, IDEA_CARS };
  } finally { await close(); }
};
if (import.meta.url === 'file://' + process.argv[1]) {
  const { results, ROOT } = await run();
  if (flag('--write')) { writeFileSync(ROOT + '/src/delivery/windows-audit.json', '{"tolerances":' + JSON.stringify(TOL) + ',"vehicles":[\n' + results.map(r => JSON.stringify(r)).join(',\n') + '\n]}\n'); console.log('wrote src/delivery/windows-audit.json (' + results.length + ' vehicles)'); }
  if (flag('--md')) {
    const v = (x) => (x == null ? '-' : x);
    console.log('| id | name | group | origin | ws-vs-side top (cm) | top-edge angle (deg) | inset var (cm) | pillar var (cm) | shape | fault 1 | fault 2 |\n|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of results) { const m = r.summary; if (!m) { console.log('| ' + r.id + ' | ' + r.name + ' | ' + r.group + ' | ' + r.origin + ' | | | | | ' + (r.status || '') + ' | excluded | excluded |'); continue; } console.log('| ' + [r.id, r.name, r.group, r.origin, m.dyA == null && m.dyC == null ? '-' : v(m.windscreenHigherCm) + ' / ' + v(m.rearGlassHigherCm), v(m.topAngleDeg), v(m.topInsetRangeCm), v(m.pillarRangeCm), m.shape, m.fault1 || 'n/a', m.fault2 || 'n/a'].join(' | ') + ' |'); }
    process.exit(0);
  }
  const f = (v) => (v == null ? '  -  ' : String(v).padStart(5));
  for (const r of results) {
    if (!r.summary) { console.log(r.key.padEnd(34), (r.status || '').slice(0, 60)); continue; }
    const s = r.summary;
    console.log(r.key.padEnd(34), 'dyA', f(s.windscreenHigherCm), 'dyC', f(s.rearGlassHigherCm), 'ang', f(s.topAngleDeg), 'inset', f(s.topInsetRangeCm), 'pillar', f(s.pillarRangeCm), 'sym', f(s.symCm), s.shape.padEnd(8), 'F1', (s.fault1 || '-').padEnd(8), 'F2', s.fault2 || '-');
  }
  const c = { pass: 0, marginal: 0, fail: 0 };
  console.log(results.length + ' vehicles; with glass ' + results.filter(r => r.summary).length + '; no glass ' + results.filter(r => r.status === 'noglass').length);
  process.exit(0);
}
