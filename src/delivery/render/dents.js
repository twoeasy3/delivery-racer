// ---- dents and scorch: a damaged car looks it ---------------------------------------------------
// The player's car (render/items.js) crumples as its health goes, in four hand-made stages: at each share of
// damage in CONFIG.dents.steps the car's parts swap to a copy of their geometry with that stage's damage in it,
// and its paint darkens toward black by CONFIG.dents.scorch at full damage. Traffic (render/cars.js) gets the
// scorch alone. The four stages are DAMAGE below: each a fixed list of dents laid on the car by where they are
// (across, height, length of the whole car, not of a part), so every car is hurt in the same places the same
// way, and parts that meet move together. What moves, and how (the model is sorted once: `prepare`):
//   - PANELS: the body, every mesh in its paint, and any other large part (a roof or cab in a paint of its own,
//     a tarp, a bumper, a stripe, a canopy): each vertex is moved by the dents, and a panel with long edges is
//     first cut finer (once, kept: SUBDIVIDE) so a box-built car bends instead of tilting whole faces.
//   - SMALL PARTS (lamps, grilles, mirrors, badges): moved whole, by the dents at their own centre, so they ride
//     the panel they sit on instead of floating where it was.
//   - LEFT ALONE: glass (by its colour: see glassy), the wheels and what turns with them (render/carsuspension.js
//     finds them), anything see-through, instanced meshes, and the lamp effects' group (render/lampfx.js).
// The dents are held back (shove) so that paint never passes behind the glass (held still near it), never past the
// car's middle (a shove inward stops at LIMIT of the way there), never into a wheel (KEEP), and a dent on a long
// vehicle (a bus, a lorry) reaches no farther than on a big car (REACH, in metres). The table is kept gentle enough
// that the shoves never fold the car through itself (a part lying on a panel would poke through it). The clean
// geometry is kept, so a new car (full health) is clean again: back at level 0 the crumpled copies are thrown away
// (the measure and the finer panels are kept; the game's box car is measured again when it is reshaped).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { prepareSuspension } from './carsuspension.js';

// how crumpled, 0 (clean) .. CONFIG.dents.steps.length, for that share of damage
export const dentLevel = (share) => CONFIG.dents.steps.filter(step => share >= step).length;
// the share of health a vehicle has lost, 0 .. 1
export const damageShare = (v) => v.maxHealth > 0 ? Math.max(0, Math.min(1, 1 - v.health / v.maxHealth)) : 0;
// The four stages of damage. A dent: `at` is where its centre is on the car ([across -1..1 (left..right), height 0..1
// (road..roof), length -1..1 (tail..nose)]), `r` how far it reaches (the same units, the farther the softer), `push` how
// far it shoves the panel there as a share of the car's [width, height, length] (both capped for a long vehicle: REACH).
// Hurt on one side more than the other on purpose. Stage 1 a crumpled front corner and a dinged tail, 2 a creased bonnet
// and a caved door, 3 a crushed nose and a sagging roof, 4 a wreck.
export const DAMAGE = [
  [ // 1: a knock on the front corner, a ding in the tail and the door
    { at: [-0.85, 0.4, 1], r: 0.45, push: [0.05, -0.025, -0.05] },
    { at: [0.75, 0.4, -1], r: 0.4, push: [-0.035, -0.01, 0.035] },
    { at: [-1, 0.45, -0.15], r: 0.3, push: [0.03, 0, 0] },
  ],
  [ // 2: creased
    { at: [-0.8, 0.4, 1], r: 0.55, push: [0.06, -0.035, -0.07] },
    { at: [0.75, 0.4, -1], r: 0.45, push: [-0.045, -0.015, 0.05] },
    { at: [0.15, 0.65, 0.65], r: 0.35, push: [0, -0.06, -0.015] },
    { at: [-1, 0.45, -0.1], r: 0.4, push: [0.06, -0.01, 0] },
  ],
  [ // 3: crushed
    { at: [-0.4, 0.42, 1], r: 0.75, push: [0.035, -0.05, -0.1] },
    { at: [0.75, 0.4, -1], r: 0.5, push: [-0.05, -0.02, 0.06] },
    { at: [0.15, 0.65, 0.6], r: 0.4, push: [0, -0.08, -0.02] },
    { at: [-1, 0.45, -0.1], r: 0.45, push: [0.07, -0.01, 0] },
    { at: [1, 0.45, 0.15], r: 0.4, push: [-0.06, 0, 0] },
    { at: [0, 1, -0.1], r: 0.5, push: [0, -0.07, 0] },
  ],
  [ // 4: wrecked
    { at: [-0.3, 0.45, 1], r: 0.85, push: [0.04, -0.07, -0.14] },
    { at: [0.15, 0.65, 0.6], r: 0.45, push: [0, -0.1, -0.025] },
    { at: [-1, 0.45, -0.05], r: 0.5, push: [0.08, -0.015, 0] },
    { at: [1, 0.45, 0.2], r: 0.45, push: [-0.07, 0, -0.01] },
    { at: [0, 1, -0.1], r: 0.65, push: [0, -0.11, 0] },
    { at: [-0.3, 1, -0.6], r: 0.4, push: [0.02, -0.06, 0] },
    { at: [0.2, 0.4, -1], r: 0.75, push: [-0.02, -0.03, 0.1] },
  ],
];
// the dents' units, in metres, are the car's half-width, height and half-length, but no more than a big car's: a bus
// is dented at its nose and corners as hard and as wide as a big car, not along half its length
export const REACH = [1.0, 1.6, 2.4];
const LIMIT = 0.45;       // a shove toward the car's middle (or down toward the road) goes at most this share of the way
const NEAR_GLASS = 0.15;  // m: paint this near the glass is held still (fading in from it), so it never goes behind it
const WHEEL_GAP = 0.03;   // m: kept clear round a wheel
const KEEP = 0.6;         // a point moves at most this share of its distance to the nearest glass or wheel
const LIFT = 0.008;        // m: a part lying on a bent panel is lifted this far off it (see crumpled)
const CELL = 0.04;         // m: where a panel and another part lie this near each other (a stripe, a bumper over the paint), both are cut `closer`
const SMALL = 0.35;       // m: a part no bigger than this (its longest side) is moved whole
// a panel's edge is cut in two where the dents bend it: where, at any stage, the dents at its middle differ by more than
// `bend` m from the mean of the dents at its ends (and it is longer than `edge` m); `passes` times at most, not past
// `budget` triangles a mesh. Where nothing bends (or all moves alike) nothing is cut, so few triangles are added. Where a
// panel and another part lie one on the other (a stripe, a pinstripe, a bumper over the paint: within CELL), both are cut
// `closer`, so they bend alike and neither pokes through the other.
const SUBDIVIDE = { edge: 0.06, bend: 0.02, closer: 0.005, passes: 5, budget: 8000 };

// ---- what a part is ----
// (a part's own paint, even while a ghost's material stands in for it: see items.js ghostify)
const paintOf = (mesh) => mesh.userData.solidMat || mesh.material;
const rgb = (mat) => { const hex = mat?.color?.getHex?.(); return hex === undefined ? null : [hex >> 16 & 255, hex >> 8 & 255, hex & 255]; };
// glass, by its colour: the models' dark blue-grey (0x232a35 and its kin) or a pale sky blue, or shiny and bluish
export const glassy = (mat) => {
  const c = rgb(Array.isArray(mat) ? mat[0] : mat);
  if (!c) return false;
  const [r, g, b] = c;
  if (Math.max(r, g, b) <= 80 && b - r >= 12 && b >= g) return true;
  if (b - r >= 30 && b >= g && b >= 140) return true;
  return !!mat.shininess && mat.shininess >= 60 && b > r && b >= g;
};
const seeThrough = (mat) => [].concat(mat).some(m => m && m.transparent && m.opacity < 0.95);

// ---- the model, measured once ----
const normalToCar = new THREE.Matrix3(), n = new THREE.Vector3();
const rel = new THREE.Matrix4(), relInv = new THREE.Matrix4(), v = new THREE.Vector3(), w = new THREE.Vector3(), d = new THREE.Vector3();
const boxOf = (mesh, inv) => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, mesh.matrixWorld));
};
// the meshes of a model that belong to it (not a model riding in it, as the game's box car carries the player's own
// models, the saucer and the tanks; not the lamp effects' group)
const meshesOf = (group) => {
  const list = [], fx = group.userData.lamps?.lamps;
  const walk = (node) => {
    if (node !== group && (node === fx || node.userData.body || node.userData.animate)) return;
    if (node.isMesh && node.geometry?.attributes?.position && !node.isInstancedMesh) list.push(node);
    for (const child of node.children) walk(child);
  };
  walk(group);
  return list;
};
// the game's box car (render/cars.js makeCarMesh: userData.trim): its parts are named
const boxCarParts = (group) => {
  const { body, cabin, roof, lights = [], bumpers = [], wheels = [] } = group.userData;
  return { meshes: [body, cabin, roof, ...lights, ...bumpers].filter(Boolean), wheels: new Set(wheels), glass: new Set([cabin]) };
};
// the cells (CELL m a side, in the car's frame) a mesh's surface passes through, sampled over each triangle
const cellOf = (i, j, k) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); // (a number: within 20 m of the car's middle)
const cellKey = (x, y, z) => cellOf(Math.floor(x / CELL), Math.floor(y / CELL), Math.floor(z / CELL));
const cellsOf = (mesh, inv, cells) => {
  const pos = mesh.geometry.attributes.position, index = mesh.geometry.index, n = index ? index.count : pos.count;
  rel.multiplyMatrices(inv, mesh.matrixWorld);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t + 2 < n; t += 3) {
    a.fromBufferAttribute(pos, index ? index.getX(t) : t).applyMatrix4(rel);
    b.fromBufferAttribute(pos, index ? index.getX(t + 1) : t + 1).applyMatrix4(rel);
    c.fromBufferAttribute(pos, index ? index.getX(t + 2) : t + 2).applyMatrix4(rel);
    const ku = Math.min(64, Math.ceil(a.distanceTo(b) / CELL)), kw = Math.min(64, Math.ceil(a.distanceTo(c) / CELL));
    for (let i = 0; i <= ku; i++) for (let j = 0; j <= kw; j++) {
      const u = ku ? i / ku : 0, w = kw ? j / kw : 0, s = 1 - u - w;
      if (s < -1e-9) continue;
      cells.add(cellKey(a.x * s + b.x * u + c.x * w, a.y * s + b.y * u + c.y * w, a.z * s + b.z * u + c.z * w));
    }
  }
};
const nearCells = (cells, x, y, z) => {
  if (!cells.size) return false;
  const i = Math.floor(x / CELL), j = Math.floor(y / CELL), k = Math.floor(z / CELL);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if (cells.has(cellOf(i + a, j + b, k + c))) return true;
  return false;
};
const measure = (group, body, extra) => {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  let meshes, wheels, glass;
  if (group.userData.trim) ({ meshes, wheels, glass } = boxCarParts(group));
  else {
    meshes = meshesOf(group);
    wheels = new Set();
    try { for (const m of prepareSuspension(group).planted) wheels.add(m); } catch { /* (no wheels found: none held back) */ }
    glass = new Set(meshes.filter(m => m !== body && paintOf(m) !== paintOf(body) && !paintOf(m).userData.wheelHub && glassy(paintOf(m)))); // (a hub in the wheel colour, render/wheelcosmetic.js, is never glass, whatever its blue)
  }
  for (const m of extra) if (!meshes.includes(m)) meshes.push(m);
  const box = new THREE.Box3(), glassBoxes = [], wheelBoxes = [], parts = [];
  for (const m of meshes) {
    if (wheels.has(m)) continue;
    const b = boxOf(m, inv);
    if (b.isEmpty()) continue;
    box.union(b);
    if (glass.has(m)) { glassBoxes.push(b); continue; }
    const paint = m === body || paintOf(m) === paintOf(body) || extra.includes(m);
    if (!paint && seeThrough(paintOf(m))) continue;
    const size = b.getSize(v);
    parts.push({ mesh: m, paint, rigid: !paint && Math.max(size.x, size.y, size.z) <= SMALL, centre: b.getCenter(new THREE.Vector3()) });
  }
  for (const m of wheels) if (m.geometry) wheelBoxes.push(boxOf(m, inv).expandByScalar(WHEEL_GAP));
  const paintCells = new Set(), trimCells = new Set();
  for (const part of parts) if (!part.rigid) cellsOf(part.mesh, inv, part.paint ? paintCells : trimCells);
  const hw = Math.max(1e-6, (box.max.x - box.min.x) / 2), hl = Math.max(1e-6, (box.max.z - box.min.z) / 2), h = Math.max(1e-6, box.max.y - box.min.y);
  return { group, inv, box, parts, glassBoxes, wheelBoxes, paintCells, trimCells, hw, hl, h, cx: (box.min.x + box.max.x) / 2, cz: (box.min.z + box.max.z) / 2, y0: box.min.y,
    reach: [Math.min(hw, REACH[0]), Math.min(h, REACH[1]), Math.min(hl, REACH[2])] };
};

// ---- the dents at a point of the car (its own frame, metres): the shove, held back as the top says ----
const smooth = (t) => t * t * (3 - 2 * t);
export const shove = (frame, dents, p, out) => {
  const { cx, cz, y0, hw, hl, h, reach: [sx, sy, sz] } = frame;
  const u = (p.x - cx) / hw, wy = (p.y - y0) / h, l = (p.z - cz) / hl;
  let dx = 0, dy = 0, dz = 0;
  for (const dent of dents) {
    const dist = Math.hypot((u - dent.at[0]) * hw / sx, (wy - dent.at[1]) * h / sy, (l - dent.at[2]) * hl / sz) / dent.r;
    if (dist >= 1) continue;
    const f = smooth(1 - dist);
    dx += dent.push[0] * f * sx * 2; dy += dent.push[1] * f * sy; dz += dent.push[2] * f * sz * 2;
  }
  if (!dx && !dy && !dz) return out.set(0, 0, 0);
  // never past the middle of the car, nor down through the road
  const ox = p.x - cx, oz = p.z - cz, oy = p.y - y0;
  if (dx * ox < 0) dx = Math.sign(dx) * Math.min(Math.abs(dx), LIMIT * Math.abs(ox));
  if (dz * oz < 0) dz = Math.sign(dz) * Math.min(Math.abs(dz), LIMIT * Math.abs(oz));
  if (dy < 0) dy = -Math.min(-dy, LIMIT * Math.max(0, oy));
  // held still by the glass (and kept from reaching it), kept from reaching a wheel: each as a smooth fade, so no tear opens
  let glass = Infinity, wheel = Infinity;
  for (const b of frame.glassBoxes) glass = Math.min(glass, b.distanceToPoint(p));
  for (const b of frame.wheelBoxes) wheel = Math.min(wheel, b.distanceToPoint(p));
  const hold = glass >= NEAR_GLASS ? 1 : smooth(glass / NEAR_GLASS);
  out.set(dx * hold, dy * hold, dz * hold);
  const far = out.length(), room = KEEP * Math.min(glass, wheel);
  if (far > room) out.multiplyScalar(room / far);
  return out;
};

// ---- a panel cut finer: every edge the dents bend (cut(a, b), from the two ends' places in the car's frame) is halved,
// `passes` times at most; an edge is cut or not by its own two ends alone, so the faces either side of it agree and no
// crack opens. Indexed out (its vertices shared as they were); its groups kept. Built once per mesh and kept
// (userData.dentFine). With no `cut`, every edge longer than `edge` m is cut.
export const subdivide = (geometry, toCar, cut = null, { edge, passes, budget } = SUBDIVIDE) => {
  if (Object.keys(geometry.morphAttributes || {}).length) return geometry;
  const names = Object.keys(geometry.attributes), sizes = names.map(n => geometry.attributes[n].itemSize);
  const data = names.map(n => Array.from(geometry.attributes[n].array));
  const P = geometry.attributes.position, count = P.count;
  const car = []; // (each vertex in the car's frame, to measure edges)
  for (let i = 0; i < count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(toCar); car.push(v.x, v.y, v.z); }
  let index = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: count }, (_, i) => i);
  let groups = geometry.groups.length ? geometry.groups.map(g => ({ ...g })) : [{ start: 0, count: index.length, materialIndex: 0 }];
  const edge2 = edge * edge;
  let changed = false;
  for (let pass = 0; pass < passes && index.length / 3 < budget; pass++) {
    const mids = new Map(), out = [], outGroups = [];
    const decided = new Map();
    const long = (a, b) => {
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let yes = decided.get(key);
      if (yes === undefined) decided.set(key, yes = (car[a * 3] - car[b * 3]) ** 2 + (car[a * 3 + 1] - car[b * 3 + 1]) ** 2 + (car[a * 3 + 2] - car[b * 3 + 2]) ** 2 > edge2 && (!cut || cut(car, a, b)));
      return yes;
    };
    const mid = (a, b) => {
      const key = a < b ? a + ',' + b : b + ',' + a;
      let m = mids.get(key);
      if (m === undefined) {
        m = car.length / 3;
        for (let k = 0; k < names.length; k++) for (let c = 0; c < sizes[k]; c++) data[k].push((data[k][a * sizes[k] + c] + data[k][b * sizes[k] + c]) / 2);
        for (let c = 0; c < 3; c++) car.push((car[a * 3 + c] + car[b * 3 + c]) / 2);
        mids.set(key, m);
      }
      return m;
    };
    for (const g of groups) {
      const start = out.length, end = Math.min(index.length, g.start + g.count);
      for (let t = g.start; t + 2 < end; t += 3) {
        const tri = [index[t], index[t + 1], index[t + 2]], e = [0, 1, 2].map(i => long(tri[i], tri[(i + 1) % 3]));
        const n = e.filter(Boolean).length;
        if (n === 0) { out.push(...tri); continue; }
        const r = n === 1 ? e.indexOf(true) : n === 2 ? (e.indexOf(false) + 1) % 3 : 0;
        const [a, b, c] = [tri[r], tri[(r + 1) % 3], tri[(r + 2) % 3]];
        if (n === 1) { const m = mid(a, b); out.push(a, m, c, m, b, c); } else if (n === 2) {
          const mab = mid(a, b), mbc = mid(b, c); out.push(mab, b, mbc, a, mab, mbc, a, mbc, c);
        } else { const mab = mid(a, b), mbc = mid(b, c), mca = mid(c, a); out.push(a, mab, mca, mab, b, mbc, mca, mbc, c, mab, mbc, mca); }
      }
      outGroups.push({ start, count: out.length - start, materialIndex: g.materialIndex });
    }
    if (!mids.size) break;
    changed = true; index = out; groups = outGroups;
  }
  if (!changed) return geometry;
  const fine = new THREE.BufferGeometry();
  names.forEach((n, k) => {
    const a = geometry.attributes[n];
    fine.setAttribute(n, new THREE.BufferAttribute(new a.array.constructor(data[k]), a.itemSize, a.normalized));
  });
  fine.setIndex(index);
  if (geometry.groups.length) for (const g of groups) fine.addGroup(g.start, g.count, g.materialIndex);
  return fine;
};

// does any stage of the dents bend the edge a..b (the car's frame: `car` holds x, y, z of each vertex)? Each vertex's
// shoves are worked out once and kept (by its number) for the rest of the cutting
const bends = (frame, part) => {
  const other = part.paint ? frame.trimCells : frame.paintCells;
  const kept = [], at = new THREE.Vector3(), s = new THREE.Vector3();
  const shoves = (x, y, z) => DAMAGE.flatMap(dents => shove(frame, dents, at.set(x, y, z), s).toArray());
  const of = (car, i) => kept[i] || (kept[i] = shoves(car[i * 3], car[i * 3 + 1], car[i * 3 + 2]));
  return (car, a, b) => {
    const mx = (car[a * 3] + car[b * 3]) / 2, my = (car[a * 3 + 1] + car[b * 3 + 1]) / 2, mz = (car[a * 3 + 2] + car[b * 3 + 2]) / 2;
    const A = of(car, a), B = of(car, b), M = shoves(mx, my, mz);
    const tol = nearCells(other, mx, my, mz) ? SUBDIVIDE.closer : SUBDIVIDE.bend;
    for (let k = 0; k < M.length; k += 3) if (Math.hypot(M[k] - (A[k] + B[k]) / 2, M[k + 1] - (A[k + 1] + B[k + 1]) / 2, M[k + 2] - (A[k + 2] + B[k + 2]) / 2) > tol) return true;
    return false;
  };
};
// ---- a part crumpled to a level ----
const crumpled = (part, level, frame) => {
  const { mesh } = part;
  // (the part's way into the car's frame as it is now: the car has moved since it was measured)
  frame.group.updateMatrixWorld(true);
  rel.copy(frame.group.matrixWorld).invert().multiply(mesh.matrixWorld); relInv.copy(rel).invert();
  const base = part.rigid ? mesh.userData.dentGeos[0] : mesh.userData.dentFine;
  const dents = DAMAGE[Math.min(level, DAMAGE.length) - 1];
  if (part.rigid) { // (moved whole, by the dents at its centre: a copy only if it moves at all)
    shove(frame, dents, part.centre, d);
    if (d.lengthSq() < 1e-8) return base;
    w.copy(part.centre).add(d).applyMatrix4(relInv);
    v.copy(part.centre).applyMatrix4(relInv);
    const geo = base.clone();
    geo.translate(w.x - v.x, w.y - v.y, w.z - v.z);
    return geo;
  }
  const geo = base.clone(), pos = geo.attributes.position, normal = !part.paint && base.attributes.normal;
  if (normal) normalToCar.getNormalMatrix(rel);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(rel);
    shove(frame, dents, v, d);
    // (a part lying on a panel, where both are bent, is lifted off it a little along its own faces: the two are cut finer
    // there, but not so fine that a stripe a millimetre over the paint could not sink into it)
    if (normal && nearCells(frame.paintCells, v.x, v.y, v.z)) d.addScaledVector(n.fromBufferAttribute(normal, i).applyMatrix3(normalToCar).normalize(), LIFT * Math.min(1, d.length() / 0.02));
    v.add(d).applyMatrix4(relInv);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
};
// a part crumpled to that level: its geometries, clean and crumpled, are built once and kept on it
export const crumple = (part, level, frame) => {
  const mesh = part.mesh, geos = mesh.userData.dentGeos || (mesh.userData.dentGeos = [mesh.geometry]);
  if (!geos[level]) geos[level] = crumpled(part, level, frame);
  if (mesh.geometry !== geos[level]) mesh.geometry = geos[level];
};
// back to clean: each part's clean geometry back, its crumpled copies thrown away (built again on the next dent: a few ms);
// with `all`, its finer copy and the model's measure too
const restore = (group, all) => {
  for (const { mesh } of group.userData.dentFrame.parts) {
    const geos = mesh.userData.dentGeos;
    if (!geos) continue;
    mesh.geometry = geos[0];
    for (const geo of new Set(geos.slice(1))) if (geo && geo !== geos[0] && geo !== mesh.userData.dentFine) geo.dispose();
    geos.length = 1;
    if (all) {
      if (mesh.userData.dentFine && mesh.userData.dentFine !== geos[0]) mesh.userData.dentFine.dispose();
      mesh.userData.dentGeos = mesh.userData.dentFine = undefined;
    }
  }
  if (all) group.userData.dentFrame = undefined;
  group.userData.dentLevel = 0;
};
// the model measured and its panels cut finer, once (the slow part, 50 to 300 ms: see `ready` below); measured again if the
// game's box car has been reshaped for another car since
const prepare = (group, body, extra) => {
  const sig = group.userData.trim ? body.scale.toArray().join() + ',' + body.position.y : '';
  let frame = group.userData.dentFrame;
  if (frame && frame.sig !== sig) { restore(group, true); frame = null; }
  if (frame) return frame;
  frame = group.userData.dentFrame = measure(group, body, extra);
  frame.sig = sig;
  frame.group.updateMatrixWorld(true);
  for (const part of frame.parts) {
    const mesh = part.mesh;
    mesh.userData.dentGeos = [mesh.geometry];
    if (!part.rigid) mesh.userData.dentFine = subdivide(mesh.geometry, rel.copy(group.matrixWorld).invert().multiply(mesh.matrixWorld), bends(frame, part));
  }
  return frame;
};
// a model dented for that share of damage (0 .. 1); `extra`: more meshes to crumple as panels. An undamaged model is
// measured and cut soon after it is first seen (`ready`: on a timer, off the frame that shows it), not at the first knock
export const dentModel = (group, body, share, extra = []) => {
  const level = dentLevel(share);
  if (level === 0) {
    if (group.userData.dentLevel) restore(group, false);
    if (!group.userData.dentFrame && !group.userData.dentSoon && typeof setTimeout === 'function') {
      group.userData.dentSoon = true;
      setTimeout(() => { group.userData.dentSoon = false; prepare(group, body, extra); }, 0);
    }
    return;
  }
  const frame = prepare(group, body, extra);
  for (const part of frame.parts) crumple(part, level, frame);
  group.userData.dentLevel = level;
};
// a paint colour scorched toward black for that share of damage (call it after the colour is set)
export const scorch = (color, share) => { if (share > 0) color.multiplyScalar(1 - CONFIG.dents.scorch * Math.min(1, share)); };
