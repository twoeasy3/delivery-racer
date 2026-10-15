// The PROP BOUNDS MEASURER (CHECKLIST 300; the generator scripts/prop-anchors.mjs and the check scripts/.propanchors-check.mjs use it).
// For one car's model (built as the showroom builds it) it RASTERISES THE TOP SURFACE: a grid of CELL metres over the car's footprint,
// each cell keeping the highest triangle over it (its height, its slope, what kind of part it is: body, glass, lamp, wheel, or a tagged
// existing prop, which is hidden first so the free space is measured under it). From the map it finds, per slot, the free flat region
// (connected flat cells of one height band, the largest rectangle inside them, inset by a margin, centred on the car where the slot is
// centred) and fits the CANONICAL SHAPES of render/propanchors.js (PROP_BOUNDS) into it at the largest UNIFORM scale that fits.
//   ROOF  the highest flat band (slope under ROOF_SLOPE) that lies above the glass (a roof is over the glasshouse): the box's footprint
//         and the cylinder's circle fit inside the rectangle; the shape stands on the surface (its base at the surface's height)
//   CARGO the lowest big flat region BEHIND THE CABIN (behind the glass's rearmost cell) and well below the roof: a bed's floor, a deck;
//         the box's footprint fits inside it, its height is free (a load may stand above the bed's walls, up to MAX_SCALE)
//   WING  a rear DECK (flat cells behind the rear glass, in the tail) where one is long enough, else the ROOF'S REAR EDGE (the blade sits
//         on the last cells of the roof and may hang back over the rear glass as far as the tail): the owner, 15-Oct: "rear wings should
//         work on the buses/vans"
// KINDS (render/propanchors.js) say which slots a car may have at all (an open car has no roof, a closed car no cargo...).
import * as THREE from 'three';

export const CELL = 0.04;            // m: the map's cell
export const MARGIN = 0.03;          // m: a shape keeps this far inside its flat region
export const ROOF_SLOPE = 12, DECK_SLOPE = 15, WING_SLOPE = 20; // degrees
export const BAND = 0.05;            // m: cells within this of the region's height count as the same flat
export const ROOF_BAND = 0.08;       // m: a roof may crown this much over its flat part (a rounded roof is still a roof)
const cos = (deg) => Math.cos(deg * Math.PI / 180);
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---- what each mesh is ----
const classify = (model, glassy) => {
  model.updateMatrixWorld(true);
  const body = model.userData.body, bodyMat = body?.material, meshes = [];
  model.traverse((n) => {
    if (!n.isMesh || n.isInstancedMesh || !n.geometry) return;
    for (let p = n; p; p = p.parent) if (p.visible === false) return;
    const m = [].concat(n.material)[0];
    if (!m || (m.transparent && m.opacity < 0.95)) return; // (see-through: not a surface)
    let kind = 'ok';
    if (n.userData.prop) kind = 'prop';
    else if (m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25)) kind = 'lamp';
    else if (n !== body && m !== bodyMat && glassy(m)) kind = 'glass';
    else if (n.geometry.type === 'CylinderGeometry' && n.geometry.parameters.radiusTop >= 0.18 && Math.abs(Math.abs(n.rotation.z) - Math.PI / 2) < 0.02) kind = 'wheel';
    meshes.push({ mesh: n, kind });
  });
  return meshes;
};

// ---- the top-surface map ----
export const topMap = (model, glassy) => {
  const meshes = classify(model, glassy);
  const box = new THREE.Box3();
  for (const { mesh, kind } of meshes) if (kind !== 'prop') box.expandByObject(mesh, true);
  const x0 = Math.floor(box.min.x / CELL) - 1, z0 = Math.floor(box.min.z / CELL) - 1;
  const nx = Math.ceil(box.max.x / CELL) + 1 - x0 + 1, nz = Math.ceil(box.max.z / CELL) + 1 - z0 + 1;
  const y = new Float32Array(nx * nz).fill(-Infinity), ny = new Float32Array(nx * nz), kind = new Uint8Array(nx * nz), who = new Int16Array(nx * nz).fill(-1);
  const KIND = { ok: 1, glass: 2, lamp: 3, wheel: 4, prop: 5 };
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const put = (i, j, h, nyv, k, w) => { const at = i * nz + j; if (h > y[at] + 1e-6) { y[at] = h; ny[at] = nyv; kind[at] = k; who[at] = w; } };
  meshes.forEach(({ mesh, kind: k }, w) => {
    if (k === 'prop') return;
    const g = mesh.geometry, p = g.attributes.position, idx = g.index;
    const count = idx ? idx.count : p.count;
    const vert = (v, i) => v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(mesh.matrixWorld);
    for (let t = 0; t + 2 < count; t += 3) {
      vert(a, t); vert(b, t + 1); vert(c, t + 2);
      e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2);
      const len = n.length();
      if (len < 1e-10) continue;
      n.divideScalar(len);
      if (n.y <= 0.02) { // (a wall or an underside: it still marks the cells its vertices fall in, as a thing that is there)
        for (const v of [a, b, c]) put(Math.round(v.x / CELL) - x0, Math.round(v.z / CELL) - z0, v.y, 0, KIND[k], w);
        continue;
      }
      // the cells inside the triangle's xz shadow
      const i0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x) / CELL) - x0), i1 = Math.min(nx - 1, Math.ceil(Math.max(a.x, b.x, c.x) / CELL) - x0);
      const j0 = Math.max(0, Math.floor(Math.min(a.z, b.z, c.z) / CELL) - z0), j1 = Math.min(nz - 1, Math.ceil(Math.max(a.z, b.z, c.z) / CELL) - z0);
      const det = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
      if (Math.abs(det) < 1e-12) { for (const v of [a, b, c]) put(Math.round(v.x / CELL) - x0, Math.round(v.z / CELL) - z0, v.y, n.y, KIND[k], w); continue; }
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const px = (i + x0) * CELL, pz = (j + z0) * CELL;
        const l1 = ((b.x - px) * (c.z - pz) - (c.x - px) * (b.z - pz)) / det, l2 = ((c.x - px) * (a.z - pz) - (a.x - px) * (c.z - pz)) / det, l3 = 1 - l1 - l2;
        if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
        put(i, j, l1 * a.y + l2 * b.y + l3 * c.y, n.y, KIND[k], w);
      }
      for (const v of [a, b, c]) put(Math.round(v.x / CELL) - x0, Math.round(v.z / CELL) - z0, v.y, n.y, KIND[k], w); // (thin parts: an aerial, a rail)
    }
  });
  const at = (i, j) => i * nz + j;
  const map = { nx, nz, x0, z0, y, ny, kind, who, meshes, box, KIND, at,
    X: (i) => (i + x0) * CELL, Z: (j) => (j + z0) * CELL, I: (x) => Math.round(x / CELL) - x0, J: (z) => Math.round(z / CELL) - z0 };
  // the glass: its top, its rearmost cell (the cabin's back), the rear window's foot
  let glassTop = -Infinity, glassMinZ = Infinity, glassMaxZ = -Infinity, bodyTop = -Infinity, rearGlassFoot = Infinity;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const k = kind[at(i, j)], h = y[at(i, j)];
    if (h === -Infinity) continue;
    if (k === KIND.glass) { glassTop = Math.max(glassTop, h); glassMinZ = Math.min(glassMinZ, map.Z(j)); glassMaxZ = Math.max(glassMaxZ, map.Z(j)); }
    if (k === KIND.ok) bodyTop = Math.max(bodyTop, h);
  }
  // the rear glass's foot: the lowest glass cell in the rearmost 0.3 m of glass (a deck lies at about that height)
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (kind[at(i, j)] === KIND.glass && map.Z(j) < glassMinZ + 0.3) rearGlassFoot = Math.min(rearGlassFoot, y[at(i, j)]);
  Object.assign(map, { glassTop, glassMinZ, glassMaxZ, bodyTop, rearGlassFoot, hasGlass: glassTop > -Infinity });
  return map;
};

// ---- regions ----
// the connected components (4-neighbour) of the cells `ok(i, j)` accepts, each as a list of [i, j]
const components = (map, ok) => {
  const seen = new Uint8Array(map.nx * map.nz), out = [];
  for (let i = 0; i < map.nx; i++) for (let j = 0; j < map.nz; j++) {
    if (seen[map.at(i, j)] || !ok(i, j)) continue;
    const comp = [], stack = [[i, j]];
    seen[map.at(i, j)] = 1;
    while (stack.length) {
      const [a, b] = stack.pop();
      comp.push([a, b]);
      for (const [c, d] of [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]) {
        if (c < 0 || d < 0 || c >= map.nx || d >= map.nz || seen[map.at(c, d)] || !ok(c, d)) continue;
        seen[map.at(c, d)] = 1; stack.push([c, d]);
      }
    }
    out.push(comp);
  }
  return out.sort((p, q) => q.length - p.length);
};
// the largest rectangle of cells inside a component (the histogram way); `symmetric` keeps it centred on x = 0; returns
// { i0, i1, j0, j1, w, d } in cells (inclusive), or null
const largestRect = (map, comp, symmetric) => {
  const inside = new Uint8Array(map.nx * map.nz);
  for (const [i, j] of comp) inside[map.at(i, j)] = 1;
  const heights = new Int32Array(map.nz);
  let best = null;
  const consider = (i0, i1, j0, j1) => {
    if (symmetric) { // (clip to the part that mirrors about the car's centre line)
      const xa = map.X(i0) - CELL / 2, xb = map.X(i1) + CELL / 2, m = Math.min(-xa, xb);
      if (m <= 0) return;
      i0 = Math.max(i0, map.I(-m + CELL / 2)); i1 = Math.min(i1, map.I(m - CELL / 2));
      if (i1 < i0) return;
    }
    const area = (i1 - i0 + 1) * (j1 - j0 + 1);
    if (!best || area > best.area) best = { i0, i1, j0, j1, area, w: (i1 - i0 + 1) * CELL, d: (j1 - j0 + 1) * CELL };
  };
  for (let i = 0; i < map.nx; i++) {
    for (let j = 0; j < map.nz; j++) heights[j] = inside[map.at(i, j)] ? heights[j] + 1 : 0;
    const stack = [];
    for (let j = 0; j <= map.nz; j++) {
      const h = j < map.nz ? heights[j] : 0;
      let start = j;
      while (stack.length && stack[stack.length - 1][1] > h) {
        const [s, hh] = stack.pop();
        consider(i - hh + 1, i, s, j - 1);
        start = s;
      }
      stack.push([start, h]);
    }
  }
  return best;
};
const rectCells = (rect) => { const out = []; for (let i = rect.i0; i <= rect.i1; i++) for (let j = rect.j0; j <= rect.j1; j++) out.push([i, j]); return out; };
const meanY = (map, cells) => cells.reduce((s, [i, j]) => s + map.y[map.at(i, j)], 0) / cells.length;
const mainMesh = (map, cells) => {
  const counts = new Map();
  for (const [i, j] of cells) { const w = map.who[map.at(i, j)]; counts.set(w, (counts.get(w) || 0) + 1); }
  const w = [...counts].sort((p, q) => q[1] - p[1])[0]?.[0];
  return w >= 0 ? (map.meshes[w].mesh.name || map.meshes[w].mesh.geometry.type) : null;
};

// ---- the fit of the canonical shapes ----
// the largest uniform scale at which a box [W, H, D] fits a free space { w, d, h? }, and which dimension limited it
const fitBox = (B, free, min, max) => {
  const by = { w: free.w / B[0], d: free.d / B[2], h: free.h != null ? free.h / B[1] : Infinity };
  let lim = 'w', s = by.w;
  for (const k of ['d', 'h']) if (by[k] < s) { s = by[k]; lim = k; }
  if (s > max) { s = max; lim = 'max'; }
  return s >= min ? { s: Math.floor(s * 100) / 100, lim } : null;
};
const fitCyl = (C, free, min, max) => {
  const by = C.axis === 'y' ? { w: free.w / (2 * C.radius), d: free.d / (2 * C.radius), h: free.h != null ? free.h / C.height : Infinity }
    : { w: free.w / C.height, d: free.d / (2 * C.radius), h: free.h != null ? free.h / (2 * C.radius) : Infinity };
  let lim = 'w', s = by.w;
  for (const k of ['d', 'h']) if (by[k] < s) { s = by[k]; lim = k; }
  if (s > max) { s = max; lim = 'max'; }
  return s >= min ? { s: Math.floor(s * 100) / 100, lim } : null;
};

// ---- the slots ----
const NO_ROOF = { open: 'an open car: no roof', canopy: 'a canopy or bubble roof: nothing flat to stand on', craft: 'a craft, not a car', tank: 'a tank', micro: 'a microcar: too small', bike: 'a bike' };
const NO_WING = { canopy: 'a canopy roof with no deck or edge', craft: 'a craft', tank: 'a tank', micro: 'a microcar', bike: 'a bike' };
const CARGO_KINDS = new Set(['pickup', 'flatbed', 'halftrack', 'open', 'truck', 'special']);

// a region's free rectangle: the largest rect in the biggest component that meets the size, inset by MARGIN, as { w, d, x, z, y, cells, rect }
const region = (map, ok, minW, minD, symmetric) => {
  for (const comp of components(map, ok).slice(0, 6)) {
    const rect = largestRect(map, comp, symmetric);
    if (!rect) continue;
    const w = rect.w - 2 * MARGIN, d = rect.d - 2 * MARGIN;
    if (w < minW || d < minD) continue;
    const cells = rectCells(rect);
    return { w, d, x: symmetric ? 0 : (map.X(rect.i0) + map.X(rect.i1)) / 2, z: (map.Z(rect.j0) + map.Z(rect.j1)) / 2, zRear: map.Z(rect.j0) - CELL / 2 + MARGIN, zFront: map.Z(rect.j1) + CELL / 2 - MARGIN, y: meanY(map, cells), cells, rect, from: mainMesh(map, cells) };
  }
  return null;
};
const isFlat = (map, i, j, slopeDeg) => map.kind[map.at(i, j)] === map.KIND.ok && map.ny[map.at(i, j)] >= cos(slopeDeg);

export const measureRoof = (map, kind, B, limits) => {
  if (NO_ROOF[kind]) return { no: NO_ROOF[kind] };
  const floor = map.hasGlass ? map.glassTop - 0.06 : map.bodyTop - 0.5;
  // the highest flat band: the top of the flat cells above the glass, then the cells within BAND of it
  let top = -Infinity;
  for (let i = 0; i < map.nx; i++) for (let j = 0; j < map.nz; j++) if (isFlat(map, i, j, ROOF_SLOPE) && map.y[map.at(i, j)] >= floor) top = Math.max(top, map.y[map.at(i, j)]);
  if (top === -Infinity) return { no: 'no flat roof (nothing flat above the glass)' };
  // (several bands down from the top, the biggest flat wins: a crowned roof's flat is a little under its peak)
  let best = null;
  for (const band of [top, top - ROOF_BAND / 2, top - ROOF_BAND, top - 1.5 * ROOF_BAND]) {
    const r = region(map, (i, j) => isFlat(map, i, j, ROOF_SLOPE) && map.y[map.at(i, j)] >= floor && Math.abs(map.y[map.at(i, j)] - band) <= ROOF_BAND, 0.3, 0.25, true);
    if (r && (!best || r.w * r.d > best.w * best.d * 1.15)) best = r;
  }
  if (!best) return { no: 'the flat part of the roof is too small (under 0.3 x 0.25 m)' };
  const box = fitBox(B.box, { w: best.w, d: best.d }, limits.min, limits.max), cyl = fitCyl(B.cylinder, { w: best.w, d: best.d }, limits.min, limits.max);
  if (!box || !cyl) return { no: 'the flat roof is too small for the smallest prop (' + r3(best.w) + ' x ' + r3(best.d) + ' m)' };
  return { box: [box.s, 0, r3(best.y + B.box[1] * box.s / 2), r3(best.z)], cyl: [cyl.s, 0, r3(best.y + B.cylinder.height * cyl.s / 2), r3(best.z)], from: 'roof', lim: box.lim, free: [r3(best.w), r3(best.d)], region: best };
};

export const measureCargo = (map, kind, B, limits, roof) => {
  if (!CARGO_KINDS.has(kind)) return { no: 'a closed body: no load deck' };
  const cabRear = map.hasGlass ? map.glassMinZ - 0.04 : map.box.max.z - (map.box.max.z - map.box.min.z) * 0.45;
  const roofY = roof && !roof.no ? roof.region.y : map.bodyTop;
  const ok = (i, j) => isFlat(map, i, j, DECK_SLOPE) && map.Z(j) < cabRear && map.y[map.at(i, j)] > 0.2 && map.y[map.at(i, j)] < roofY - 0.25;
  // the lowest big flat behind the cabin: components by size, the one whose height band holds the most cells
  const comps = components(map, ok);
  if (!comps.length) return { no: 'nothing flat behind the cabin' };
  let best = null;
  for (const comp of comps.slice(0, 5)) {
    const ys = comp.map(([i, j]) => map.y[map.at(i, j)]).sort((p, q) => p - q), floorY = ys[Math.floor(ys.length * 0.3)];
    const r = region(map, (i, j) => ok(i, j) && Math.abs(map.y[map.at(i, j)] - floorY) <= BAND && comp.some(() => true), 0.3, 0.3, true);
    if (r && (!best || r.w * r.d > best.w * best.d)) best = r;
  }
  if (!best) return { no: 'the deck behind the cabin is too small (under 0.3 x 0.3 m)' };
  const h = Math.max(0.5, roofY - best.y + 0.1);
  const box = fitBox(B.box, { w: best.w, d: best.d, h }, limits.min, limits.max), cyl = fitCyl(B.cylinder, { w: best.w, d: best.d, h }, limits.min, limits.max);
  if (!box || !cyl) return { no: 'the deck is too small for the smallest load (' + r3(best.w) + ' x ' + r3(best.d) + ' m)' };
  return { box: [box.s, 0, r3(best.y + B.box[1] * box.s / 2), r3(best.z)], cyl: [cyl.s, 0, r3(best.y + B.cylinder.height * cyl.s / 2), r3(best.z)], from: 'deck', lim: box.lim, free: [r3(best.w), r3(best.d)], region: best };
};

export const measureWing = (map, kind, B, limits, roof) => {
  if (NO_WING[kind]) return { no: NO_WING[kind] };
  const tailZ = map.box.min.z, length = map.box.max.z - map.box.min.z;
  const bodyW = map.box.max.x - map.box.min.x;
  // 1. a rear deck: flat cells behind the rear glass's foot, in the tail, under the roof line
  if (map.hasGlass) {
    // (at about the rear glass's foot: a boot lid, not a pickup's bed floor far below the cab's back window)
    const ok = (i, j) => isFlat(map, i, j, WING_SLOPE) && map.Z(j) < map.glassMinZ - 0.02 && map.Z(j) < tailZ + length * 0.4 && map.y[map.at(i, j)] > Math.max(0.3, map.rearGlassFoot - 0.2) && map.y[map.at(i, j)] < map.glassTop - 0.08;
    const deck = region(map, ok, 0.7, 0.22, true);
    if (deck) {
      const w = Math.min(deck.w, bodyW * 0.95), d = deck.d;
      const box = fitBox(B.box, { w, d }, limits.min, limits.max), cyl = fitCyl(B.cylinder, { w, d }, limits.min, limits.max);
      if (box && cyl) {
        const zb = deck.zRear + B.box[2] * box.s / 2, zc = deck.zRear + B.cylinder.radius * cyl.s; // (at the deck's rear)
        return { box: [box.s, 0, r3(deck.y + B.box[1] * box.s / 2), r3(zb)], cyl: [cyl.s, 0, r3(deck.y + B.cylinder.radius * cyl.s), r3(zc)], from: 'deck', lim: box.lim, free: [r3(w), r3(d)], region: deck };
      }
    }
  }
  if (kind === 'open') return { no: 'an open car with no rear deck' };
  // 2. the roof's rear edge: the blade stands on the roof's last cells and may hang back as far as the tail
  if (!roof || roof.no) return { no: 'no rear deck and no flat roof edge' };
  // (the blade may hang back over a SLOPING rear window or a fastback: the cells behind the roof's edge that stay within 0.55 m of the
  // roof's height, at the car's centre line; never over a bed or a cab's drop)
  const r = roof.region;
  let over = 0;
  for (let j = r.rect.j0 - 1; j >= 0 && map.y[map.at(map.I(0), j)] >= r.y - 0.55; j--) over += CELL;
  const overhang = Math.min(Math.max(0, r.zRear - tailZ), over);
  const w = Math.min(r.w, bodyW * 0.95), d = r.d + overhang;
  const box = fitBox(B.box, { w, d }, limits.min, limits.max), cyl = fitCyl(B.cylinder, { w, d }, limits.min, limits.max);
  if (!box || !cyl) return { no: 'the roof edge is too narrow for a wing (' + r3(w) + ' m)' };
  // the box's rear face at the tail, or the box on the roof's rear edge when the roof is deeper than its overhang allows
  const zb = Math.max(r.zRear - overhang, r.zRear - B.box[2] * box.s * 0.6) + B.box[2] * box.s / 2;
  const zc = Math.max(r.zRear - overhang, r.zRear - B.cylinder.radius * cyl.s) + B.cylinder.radius * cyl.s;
  return { box: [box.s, 0, r3(r.y + B.box[1] * box.s / 2), r3(zb)], cyl: [cyl.s, 0, r3(r.y + B.cylinder.radius * cyl.s), r3(zc)], from: 'roof-edge', lim: box.lim, free: [r3(w), r3(d)], region: r };
};

// one car: { roof, cargo, wing } as the table holds them (plus `free` and `region` for the generator's own eyes)
export const measureCar = (model, car, P, glassy) => {
  const map = topMap(model, glassy);
  const kind = P.kindOf(car);
  const lim = (slot) => ({ min: P.MIN_SCALE[slot], max: P.MAX_SCALE[slot] });
  const roof = measureRoof(map, kind, P.PROP_BOUNDS.roof, lim('roof'));
  const cargo = measureCargo(map, kind, P.PROP_BOUNDS.cargo, lim('cargo'), roof);
  const wing = measureWing(map, kind, P.PROP_BOUNDS.wing, lim('wing'), roof);
  return { kind, roof, cargo, wing, map };
};
