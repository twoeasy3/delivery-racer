// ---- FLANK DECALS: a FEASIBILITY PROTOTYPE (CHECKLIST 414, src/delivery/DECAL-FEASIBILITY.md; the owner, 15-Oct: "Choose 6 very
// different cars to do a feasibility check on tagging their side profiles for a decal cosmetic"). OFF unless the address asks:
//   ?decaltest=1 (or =decal)   every dressed car with a zone row wears the TEST decal: a race-number roundel and a stripe
//   ?decaltest=zones           the found ZONES drawn instead, as tinted see-through patches (door blue, quarter green, fender orange,
//                              flank purple); =both: zones and decal; =curve: the decal, its roundel on the most curved zone
//   &decallift=<mm>            the decal's offset out from the paint (default 4 mm)       &decalnum=<1..99>  the roundel's number
// Nothing changes for a player: with no ?decaltest the dressing below returns at once. RENDER-ONLY: nothing here is in the replay
// fingerprint (no rules module imports it), nothing is saved.
//
// THE SHARED CORE (also used by the zone search, scripts/decal-zones-lib.mjs, so the game and the search judge a flank alike):
//   flankView(model)        the model's meshes, each classed: 'paint' (the body, or any part in the body's paint material), 'glass',
//                           'wheel', 'lamp', 'graphic' (a see-through picture of the car's own: rust, chequers, envelopes), 'trim'
//                           (anything else: bumpers, chrome, wood, rubber, handles, plates)
//   flankHit(view, s, y, z) what a ray along -s x (from outside the car on side s: +1 right, -1 left) meets first at (y, z) in the
//                           model's frame: { kind, point, normal, facing }; paint that faces less than FACING outward is 'curve'
//   wrapRect(view, s, rect, piece, out)  a decal piece laid on the flank over rect { z0, z1, y0, y1 }: a lattice of points found on the
//                           paint by rays, each LIFT out along its normal, as FEW as keep the lattice within CHORD of the surface (a flat
//                           van door is one quad; the Bug's dome is cut finer). Texture coordinates from the piece's atlas cell; `read`
//                           pieces (a number) read left to right from the side they are on, `forward` pieces run nose-ward on both sides.
// THE TEST DECAL: one 256 x 256 canvas (256 KB, ~341 KB with mipmaps) drawn here in flat shapes (a white disc, a black ring and a
// number; a near-black band between two white pinstripes, so it reads on any paint), shared by every car; ONE mesh per car (both flanks, both pieces) in ONE shared material:
// one draw call a car. Parented to the body's parent (it rides the suspension); the dents bend it as a panel (it is a large non-paint
// part: render/dents.js crumples it with the paint, and `forgetDents` makes a model measured before it was added measure again);
// hidden on a blacked-out car (`userData.blackout: 'hide'`, render/silhouette.js).
import * as THREE from 'three';
import { isWindowNode } from './glassnames.js';
import { glassy, forgetDents } from './dents.js';
import { prepareSuspension } from './carsuspension.js';
import { DECAL_ZONES } from './decalzonestable.js';
import { atRest as restPose } from './restpose.js'; // (measured against the model as built, then riding with its part: CHECKLIST 458)

const param = (name) => (typeof location !== 'undefined' && new RegExp('[?&]' + name + '=([\\w.-]+)').exec(location.search)?.[1]) || null;
export const DECAL_TEST = { mode: param('decaltest'), lift: param('decallift'), num: param('decalnum') };
export const FLANK = {
  FACING: 0.7,   // the paint's normal within about 45 degrees of straight out sideways (as the Legendary wreath)
  LIFT: 0.004,   // m: the decal's offset out from the paint (polygon offset besides)
  CHORD: 0.002,  // m: the most the decal's lattice may stand off the surface between its points (so it never sinks under the LIFT)
  FINE: 0.04,    // m: the spacing of the rays that measure a piece's surface before it is simplified
};

// ---- the shared core ------------------------------------------------------------------------------------------------
const overlay = (m) => !!m && !!m.map && m.transparent && m.depthWrite === false;
const isTyre = (n) => {
  const g = n.geometry, m = [].concat(n.material)[0];
  if (!g || g.type !== 'CylinderGeometry' || !m?.color) return false;
  const c = m.color, r = Math.max(g.parameters.radiusTop, g.parameters.radiusBottom) * Math.max(n.scale.x, n.scale.y, n.scale.z);
  return r >= 0.2 && Math.max(c.r, c.g, c.b) < 0.12;
};
export const flankView = (model) => {
  model.updateMatrixWorld(true);
  const body = model.userData.body, paint = body && [].concat(body.userData.solidMat || body.material)[0];
  let wheels = new Set();
  try { wheels = new Set(prepareSuspension(model).planted); } catch { /* (no wheels found) */ }
  const hubs = model.userData.wheelHubs || {};
  for (const k of ['tyres', 'hubs', 'parts', 'rings']) for (const n of hubs[k] || []) wheels.add(n);
  const hidden = (n) => { for (let p = n; p; p = p.parent) if (p.visible === false || p.userData.flankDecal) return true; return false; };
  const meshes = [], kinds = new Map(), box = new THREE.Box3(), inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse((n) => {
    if (!n.isMesh || !n.geometry || hidden(n)) return;
    const m = [].concat(n.userData.solidMat || n.material)[0];
    if (!m || m.visible === false) return;
    let kind;
    if (wheels.has(n) || n.userData.wheelRing || isTyre(n)) kind = 'wheel';
    else if (overlay(m)) kind = 'graphic';
    else if (m.transparent && m.opacity < 0.95) return; // (see-through: looked through)
    else if (n === body || m === paint) kind = 'paint';
    else if (isWindowNode(n) || glassy(m)) kind = 'glass';
    else if (m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25)) kind = 'lamp';
    else kind = 'trim';
    kinds.set(n, kind);
    meshes.push(n);
    const b = new THREE.Box3().setFromObject(n, true).applyMatrix4(inv);
    if (!(b.max.y - b.min.y < 0.005 && b.max.y < 0.1)) box.union(b); // (not an underglow plane on the road)
  });
  return { model, body, meshes, kinds, box, inv, ray: new THREE.Raycaster(), paintMeshes: meshes.filter(n => kinds.get(n) === 'paint') };
};
const FROM = new THREE.Vector3(), DIR = new THREE.Vector3(), NM = new THREE.Matrix3();
// THE RAY CASTER. Every ray runs along the model's x, so a ray is a point in the (z, y) side view: the model's triangles are put once
// (per view) in a 2D grid over that view, and a ray tests the few triangles of its own cell, instead of every triangle of every mesh
// with three's Raycaster (0.4 ms a ray on the Hot Dog's 7,600 triangles: a decal took 3 s on a low-end device, CHECKLIST 525). The answer is
// three's own: the nearest front-facing triangle (a mesh's material side honoured: FrontSide culls a back face, BackSide a front one),
// its face normal carried to the model's frame as before. A mesh three would raycast in a special way (a skinned or instanced mesh, one
// with a raycast of its own) still goes through the Raycaster.
const CELL = 0.03; // m: the grid's cell, in z and y
const buildGrid = (view) => {
  const { inv } = view, tri = [], odd = [];
  const T = new THREE.Matrix4(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const n of view.meshes) {
    const g = n.geometry, pos = g.attributes.position;
    if (!pos || n.isSkinnedMesh || n.isInstancedMesh || n.raycast !== THREE.Mesh.prototype.raycast || g.morphAttributes?.position) { odd.push(n); continue; }
    T.multiplyMatrices(inv, n.matrixWorld);
    const flip = T.determinant() < 0 ? -1 : 1, kind = view.kinds.get(n), paint = kind === 'paint' ? 1 : 0;
    const mats = [].concat(n.material), idx = g.index, total = idx ? idx.count : pos.count;
    const ranges = [];
    if (Array.isArray(n.material)) { for (const gr of g.groups) { const m = mats[gr.materialIndex]; if (m) ranges.push([Math.max(gr.start, g.drawRange.start), Math.min(gr.start + gr.count, g.drawRange.start + g.drawRange.count, total), m.side]); } }
    else ranges.push([g.drawRange.start, Math.min(g.drawRange.start + g.drawRange.count, total), mats[0]?.side ?? THREE.FrontSide]);
    for (const [from, to, side] of ranges) for (let i = from; i + 3 <= to; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(T);
      e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]);
      const nx = e1.y * e2.z - e1.z * e2.y, ny = e1.z * e2.x - e1.x * e2.z, nz = e1.x * e2.y - e1.y * e2.x, len = Math.hypot(nx, ny, nz);
      if (!(len > 0) || Math.abs(nx) < 1e-12 * len) continue; // (a degenerate triangle, or edge-on to the rays)
      tri.push({ n, kind, paint, side, flip, a: v[0].clone(), b: v[1].clone(), c: v[2].clone(), nx: flip * nx / len, ny: flip * ny / len, nz: flip * nz / len });
    }
  }
  let zmin = Infinity, zmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const t of tri) for (const p of [t.a, t.b, t.c]) { zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); }
  if (!tri.length) return { tri, odd, cells: null };
  const gz = Math.max(1, Math.ceil((zmax - zmin) / CELL) + 1), gy = Math.max(1, Math.ceil((ymax - ymin) / CELL) + 1);
  const lists = new Array(gz * gy);
  tri.forEach((t, id) => {
    const lo = (a, b, c) => Math.min(a, b, c), hi = (a, b, c) => Math.max(a, b, c);
    const i0 = Math.max(0, Math.floor((lo(t.a.z, t.b.z, t.c.z) - zmin) / CELL)), i1 = Math.min(gz - 1, Math.floor((hi(t.a.z, t.b.z, t.c.z) - zmin) / CELL));
    const j0 = Math.max(0, Math.floor((lo(t.a.y, t.b.y, t.c.y) - ymin) / CELL)), j1 = Math.min(gy - 1, Math.floor((hi(t.a.y, t.b.y, t.c.y) - ymin) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (lists[j * gz + i] ||= []).push(id);
  });
  return { tri, odd, lists, zmin, ymin, gz, gy };
};
// the first thing a ray along -s x meets at (y, z) in the model's frame: { t, kind, point, normal, object } or null
const castGrid = (G, s, y, z, paintOnly) => {
  if (!G.lists) return null;
  const i = Math.floor((z - G.zmin) / CELL), j = Math.floor((y - G.ymin) / CELL);
  if (i < 0 || j < 0 || i >= G.gz || j >= G.gy) return null;
  const list = G.lists[j * G.gz + i];
  if (!list) return null;
  let best = null, bestX = -Infinity;
  const EPS = 1e-9;
  for (const id of list) {
    const t = G.tri[id];
    if (paintOnly && !t.paint) continue;
    const front = s * t.nx > 0; // (the normal points out of the side the ray comes from: the face is turned to it)
    if (t.side === THREE.FrontSide ? !front : t.side === THREE.BackSide ? front : false) continue;
    // the point in the triangle's (z, y) shadow: barycentrics by edge functions (the shadow's edges count)
    const { a, b, c } = t, d = (b.y - c.y) * (a.z - c.z) + (c.z - b.z) * (a.y - c.y);
    if (d === 0) continue;
    const w0 = ((b.y - c.y) * (z - c.z) + (c.z - b.z) * (y - c.y)) / d, w1 = ((c.y - a.y) * (z - c.z) + (a.z - c.z) * (y - c.y)) / d, w2 = 1 - w0 - w1;
    if (w0 < -EPS || w1 < -EPS || w2 < -EPS) continue;
    const x = w0 * a.x + w1 * b.x + w2 * c.x, sx = s * x;
    if (sx > bestX) { bestX = sx; best = t; best.hx = x; }
  }
  return best && { t: best, x: best.hx };
};
// what a ray along -s x meets first at (y, z) in the model's frame; `paintOnly`: the paint alone (what lies under a window or a wheel)
export const flankHit = (view, s, y, z, paintOnly = false) => {
  const G = view.grid || (view.grid = buildGrid(view));
  const g = castGrid(G, s, y, z, paintOnly);
  let point = null, normal = null, kind = null, object = null, hx = -Infinity;
  if (g) { point = new THREE.Vector3(g.x, y, z); normal = new THREE.Vector3(g.t.nx, g.t.ny, g.t.nz); kind = view.kinds.get(g.t.n); object = g.t.n; hx = s * g.x; }
  if (G.odd.length) { // (the few meshes three casts itself, nearer than the grid's hit or not)
    const { model, inv, ray } = view, reach = Math.max(Math.abs(view.box.min.x), Math.abs(view.box.max.x)) + 2;
    FROM.set(s * reach, y, z).applyMatrix4(model.matrixWorld);
    DIR.set(-s, 0, 0).transformDirection(model.matrixWorld);
    ray.set(FROM, DIR); ray.far = reach * 2;
    const hit = ray.intersectObjects(paintOnly ? G.odd.filter(n => view.kinds.get(n) === 'paint') : G.odd, false)[0];
    if (hit && hit.face) {
      const p = hit.point.clone().applyMatrix4(inv);
      if (s * p.x > hx) {
        point = p; normal = hit.face.normal.clone().applyMatrix3(NM.getNormalMatrix(hit.object.matrixWorld)).transformDirection(inv).normalize();
        kind = view.kinds.get(hit.object); object = hit.object;
      }
    }
  }
  if (!point) return { kind: 'air' };
  const facing = normal.x * s;
  if (kind === 'paint' && facing < FLANK.FACING) kind = 'curve';
  return { kind, point, normal, facing, object };
};

// ---- a piece wrapped on a flank -------------------------------------------------------------------------------------
const pow2 = (v, cap) => { let n = 1; while (n < v && n < cap) n *= 2; return n; };
// rect { z0, z1, y0, y1 } (model frame), piece { cell: [u0, v0, u1, v1] (the atlas), map: 'read' | 'forward', tint?: [r, g, b] };
// out { pos, nor, uv, col } (model frame); returns { quads, rays, fine: [nz, ny], used: [cz, cy] }
export const wrapRect = (view, s, rect, piece, out, lift = FLANK.LIFT) => {
  const { z0, z1, y0, y1 } = rect, w = z1 - z0, h = y1 - y0;
  const nz = pow2(w / FLANK.FINE, 64), ny = pow2(h / FLANK.FINE, 16);
  const fine = [];
  let rays = 0, holes = 0;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nz; i++) {
    const z = z0 + w * i / nz, y = y0 + h * j / ny, first = flankHit(view, s, y, z); rays++;
    const p = first.kind === 'paint' ? first : (rays++, flankHit(view, s, y, z, true)); // (under a part that covers the paint: the paint, hidden there)
    if (first.kind !== 'paint') holes++;
    fine.push(p.point ? { p: p.point, n: p.normal, shown: first.kind === 'paint' } : null);
  }
  const F = (i, j) => fine[j * (nz + 1) + i];
  // a point whose ray met nothing at all (a band flush with a body's top or end: the edge ray grazes past) takes the nearest hit point of
  // its column (else of its row), moved to its own y and z and HIDDEN, so the piece keeps its alpha edge instead of being thrown away whole (CHECKLIST 508: the Kei
  // Roadster, the Milk Float, the Monster Truck)
  if (piece.adaptive) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nz; i++) {
    if (fine[j * (nz + 1) + i]) continue;
    let near = null;
    for (let d = 1; d <= Math.max(nz, ny) && !near; d++) for (const [a, b] of [[i, j - d], [i, j + d], [i - d, j], [i + d, j]]) if (!near && a >= 0 && a <= nz && b >= 0 && b <= ny && fine[b * (nz + 1) + a]?.n) near = fine[b * (nz + 1) + a];
    if (near) fine[j * (nz + 1) + i] = { p: near.p.clone().setY(y0 + h * j / ny).setZ(z0 + w * i / nz), n: near.n, shown: false }; // (at its own y, z, on the neighbour's x)
  }
  if (fine.some(p => !p)) return { quads: 0, rays, holes, fine: [nz, ny], used: [0, 0] };
  // the coarsest lattice (a power of two each way, a subset of the fine one) whose bilinear faces stay within CHORD of every fine point;
  // where any point is hidden (the rect runs over something), the fine lattice itself, so the alpha edge is as sharp as it can be
  let best = [nz, ny];
  if (!holes) {
    search: for (let cz = 1; cz <= nz; cz *= 2) for (let cy = 1; cy <= ny; cy *= 2) {
      const sz = nz / cz, sy = ny / cy;
      let ok = true;
      for (let j = 0; j <= ny && ok; j++) for (let i = 0; i <= nz && ok; i++) {
        const ci = Math.min(cz - 1, Math.floor(i / sz)), cj = Math.min(cy - 1, Math.floor(j / sy)), a = i / sz - ci, b = j / sy - cj;
        const p00 = F(ci * sz, cj * sy).p, p10 = F((ci + 1) * sz, cj * sy).p, p01 = F(ci * sz, (cj + 1) * sy).p, p11 = F((ci + 1) * sz, (cj + 1) * sy).p;
        const x = (p00.x * (1 - a) + p10.x * a) * (1 - b) + (p01.x * (1 - a) + p11.x * a) * b;
        if (Math.abs(x - F(i, j).p.x) > FLANK.CHORD) ok = false;
      }
      if (ok) { best = [cz, cy]; break search; }
    }
  }
  let cols = Array.from({ length: best[0] + 1 }, (_, k) => k * nz / best[0]), rows = Array.from({ length: best[1] + 1 }, (_, k) => k * ny / best[1]);
  // piece.adaptive (the decal cosmetic, render/decalcosmetic.js): a RECTILINEAR lattice instead, any fine column or row kept or dropped
  // (no T-joints, so no cracks): a line is dropped where every fine point between its neighbours stays within CHORD of the faces and
  // shows or hides as it did (the vertex alpha, interpolated, on the same side of the alpha test's 0.5). A flank curved only near a seam
  // keeps its few columns there instead of the whole power-of-two lattice.
  if (piece.adaptive) {
    const fits = (cs, rs, i0, i1, j0, j1) => {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const ci = Math.max(0, cs.findIndex(c => c >= i) - 1), cj = Math.max(0, rs.findIndex(r => r >= j) - 1);
        const ia = cs[ci], ib = cs[ci + 1], ja = rs[cj], jb = rs[cj + 1], a = (i - ia) / (ib - ia), b = (j - ja) / (jb - ja);
        const q00 = F(ia, ja), q10 = F(ib, ja), q01 = F(ia, jb), q11 = F(ib, jb), mix = (f) => (f(q00) * (1 - a) + f(q10) * a) * (1 - b) + (f(q01) * (1 - a) + f(q11) * a) * b;
        if (Math.abs(mix(q => q.p.x) - F(i, j).p.x) > FLANK.CHORD) return false;
        if ((mix(q => (q.shown ? 1 : 0)) >= 0.5) !== F(i, j).shown) return false;
      }
      return true;
    };
    cols = Array.from({ length: nz + 1 }, (_, k) => k); rows = Array.from({ length: ny + 1 }, (_, k) => k);
    for (let k = 1; k < cols.length - 1;) { const t = cols.filter((_, x) => x !== k); if (fits(t, rows, cols[k - 1], cols[k + 1], 0, ny)) cols = t; else k++; }
    for (let k = 1; k < rows.length - 1;) { const t = rows.filter((_, x) => x !== k); if (fits(cols, t, 0, nz, rows[k - 1], rows[k + 1])) rows = t; else k++; }
  }
  const [u0, v0, u1, v1] = piece.cell, tint = piece.tint || [1, 1, 1];
  const uvOf = (i, j) => {
    const fz = i / nz, fy = j / ny;
    const fu = piece.map === 'read' ? (s > 0 ? 1 - fz : fz) : fz; // (seen from side s the screen's right is -s z: a number reads; a forward piece runs to the nose)
    return [u0 + (u1 - u0) * fu, v0 + (v1 - v0) * fy];
  };
  const tris = s > 0 ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]];
  let quads = 0;
  for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i + 1 < cols.length; i++) {
    const q = [[cols[i], rows[j]], [cols[i + 1], rows[j]], [cols[i + 1], rows[j + 1]], [cols[i], rows[j + 1]]];
    if (!q.some(([a, b]) => F(a, b).shown)) continue;
    quads++;
    for (const t of tris) for (const k of t) {
      const [a, b] = q[k], f = F(a, b);
      out.pos.push(f.p.clone().addScaledVector(f.n, f.shown ? lift : -lift));
      out.nor.push(f.n.clone());
      out.uv.push(...uvOf(a, b));
      out.col.push(...tint, f.shown ? 1 : 0);
    }
  }
  return { quads, rays, holes, fine: [nz, ny], used: [cols.length - 1, rows.length - 1] };
};
// the pieces' lists as one mesh, parented where the body is (positions taken from the model's frame into the parent's)
export const meshOf = (model, out, material, name) => {
  if (!out.pos.length) return null;
  const parent = model.userData.body?.parent || model;
  model.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(model.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(toLocal);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos.flatMap(p => p.applyMatrix4(toLocal).toArray()), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor.flatMap(v => v.applyMatrix3(nm).normalize().toArray()), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 4));
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.userData.flankDecal = true;
  mesh.userData.patchRole = 'decal';
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
};

// ---- the test decal's picture: a 256 x 256 atlas of flat shapes, drawn once ---------------------------------------------
// the roundel in the square cell ROUNDEL (a white disc, a black ring, the number in black), the stripe in the band STRIPE (a solid band
// with a pinstripe above and below: the same all along, so it may be stretched to any length)
export const ATLAS = 256, ROUNDEL = [0, 0.25, 0.75, 1], STRIPE = [0, 0, 1, 0.2];
let atlas = null;
export const testTexture = (num = DECAL_TEST.num || '7') => {
  if (atlas) return atlas;
  if (typeof document === 'undefined' || !document.createElement) return null;
  const S = ATLAS, canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, S, S);
  // (canvas y runs down; texture v runs up with flipY: the cell [u0, v0, u1, v1] is canvas x u*S, y (1 - v)*S)
  const R = 0.75 * S / 2, cx = R, cy = R;
  ctx.fillStyle = '#111317'; ctx.beginPath(); ctx.arc(cx, cy, R - 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111317'; ctx.font = 'bold ' + Math.round(R * (String(num).length > 1 ? 1.05 : 1.3)) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(num).slice(0, 2), cx, cy + R * 0.06);
  const y0 = (1 - STRIPE[3]) * S, hgt = (STRIPE[3] - STRIPE[1]) * S;
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, y0 + hgt * 0.0, S, hgt * 0.14);
  ctx.fillStyle = '#16181c'; ctx.fillRect(0, y0 + hgt * 0.24, S, hgt * 0.52);
  ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, y0 + hgt * 0.86, S, hgt * 0.14);
  atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  atlas.userData.shared = true;
  return atlas;
};
let decalMat = null, zoneMat = null;
const testMaterial = () => {
  if (decalMat) return decalMat;
  const map = testTexture();
  if (!map) return null;
  // lit as the body is; see-through outside its shapes and where the paint does not show (the vertices' alpha), writing no depth
  decalMat = new THREE.MeshLambertMaterial({ map, emissive: 0x3a3a3a, emissiveMap: map, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.5,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  decalMat.userData.shared = true;
  decalMat.userData.blackout = 'hide';
  return decalMat;
};
const zoneMaterial = () => {
  if (zoneMat) return zoneMat;
  zoneMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  zoneMat.userData.shared = true;
  zoneMat.userData.blackout = 'hide';
  return zoneMat;
};
export const ZONE_TINTS = { door: [0.15, 0.45, 1], quarter: [0.1, 0.8, 0.3], fender: [1, 0.55, 0.1], flank: [0.6, 0.25, 0.9], bed: [1, 0.9, 0.1] };

// ---- the zone table and the test decal's layout ----------------------------------------------------------------------
// a model's zones on side 'L' or 'R': [{ id, z0, z1, y0, y1, flat, curve }] (DECAL_ZONES rows: [id, z0, z1, y0, y1, flat mm, curve deg];
// R: 'L' means the left's zones mirrored)
export const zonesFor = (key, side) => {
  const e = DECAL_ZONES[key];
  if (!e) return [];
  const rows = side === 'R' && e.R === 'L' ? e.L : e[side] || [];
  return rows.map(([id, z0, z1, y0, y1, flat, curve]) => ({ id, z0, z1, y0, y1, flat, curve }));
};
// MIRROR PAIRING: the zones both flanks share (each left zone cut to each right zone it overlaps, kept where it still takes a 0.3 x 0.15 m
// patch), so one livery reads the same on both sides of a car whose flanks differ (a bus's doors on one side only); the left's own
// zones where they share none
export const pairedZones = (key) => {
  const L = zonesFor(key, 'L'), e = DECAL_ZONES[key];
  if (!e || e.R === 'L') return L;
  const out = [];
  for (const a of L) for (const b of zonesFor(key, 'R')) {
    const z = { id: a.id, z0: Math.max(a.z0, b.z0), z1: Math.min(a.z1, b.z1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1), flat: Math.max(a.flat, b.flat), curve: Math.max(a.curve, b.curve) };
    if (z.z1 - z.z0 >= 0.3 && z.y1 - z.y0 >= 0.15) out.push(z);
  }
  return out.length ? out : L;
};
// the TEST decal on one side: the roundel as big as the roomiest zone takes (at most 0.55 m), the stripe along the longest zone, through
// the roundel's middle when they share a zone, else along that zone's middle
export const testLayout = (zones, { curved = false } = {}) => {
  if (!zones.length) return [];
  const side = (z) => Math.min(z.z1 - z.z0, z.y1 - z.y0);
  const roomy = zones.filter(z => side(z) >= 0.25); // (curved: the roundel on the most curved zone that takes one 0.25 m or more: ?decaltest=curve)
  const rz = curved && roomy.length ? roomy.reduce((a, b) => (b.curve > a.curve ? b : a)) : zones.reduce((a, b) => (side(b) > side(a) ? b : a)), d = Math.min(0.55, side(rz) * 0.92);
  const zc = (rz.z0 + rz.z1) / 2, yc = (rz.y0 + rz.y1) / 2;
  const sz = zones.filter(z => z.y1 - z.y0 >= 0.1).reduce((a, b) => (b.z1 - b.z0 > a.z1 - a.z0 ? b : a), rz);
  const sh = Math.min(0.16, (sz.y1 - sz.y0) * 0.5), sy = sz === rz ? yc : (sz.y0 + sz.y1) / 2, inset = 0.03;
  return [
    { what: 'stripe', rect: { z0: sz.z0 + inset, z1: sz.z1 - inset, y0: sy - sh / 2, y1: sy + sh / 2 }, piece: { cell: STRIPE, map: 'forward' } },
    { what: 'roundel', rect: { z0: zc - d / 2, z1: zc + d / 2, y0: yc - d / 2, y1: yc + d / 2 }, piece: { cell: ROUNDEL, map: 'read' } },
  ];
};
const modelKey = (car) => car?.model || car?.id;
// build the test decal (or the zones' patches) on a model; returns { mesh, stats } (stats: triangles, rays, ms, per piece)
export const buildFlankDecal = (model, key, { mode = 'decal', lift = FLANK.LIFT, curved = false } = {}) => {
  if (!DECAL_ZONES[key] || !model?.userData?.body) return null;
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const view = flankView(model), out = { pos: [], nor: [], uv: [], col: [] }, pieces = [];
  for (const [s, side] of [[-1, 'L'], [1, 'R']]) {
    const zones = mode === 'zones' ? zonesFor(key, side) : pairedZones(key); // (the zones as found; the decal on the pair both sides share)
    if (mode === 'zones') for (const z of zones) pieces.push({ side, what: 'zone:' + z.id, ...wrapRect(view, s, z, { cell: [0, 0, 0, 0], map: 'forward', tint: ZONE_TINTS[z.id] || [1, 0, 1] }, out, lift) });
    else for (const p of testLayout(zones, { curved })) pieces.push({ side, what: p.what, ...wrapRect(view, s, p.rect, p.piece, out, lift) });
  }
  const material = mode === 'zones' ? zoneMaterial() : testMaterial();
  const mesh = material && meshOf(model, out, material, mode === 'zones' ? 'decal zones' : 'flank decal');
  const ms = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
  return { mesh, stats: { triangles: out.pos.length / 3, vertices: out.pos.length, rays: pieces.reduce((a, p) => a + p.rays, 0), ms, pieces } };
};
// the dressing (render/showcar.js dressCosmetics): nothing at all unless ?decaltest= asks
export const dressFlankDecal = (model, car) => restPose(model, () => dressFlankDecalNow(model, car)); // (at rest: a model that animates is measured as built, then the cosmetic rides with its part: render/restpose.js)
const dressFlankDecalNow = (model, car) => {
  if (!DECAL_TEST.mode || !model?.userData || model.userData.flankDecalDone) return model;
  model.userData.flankDecalDone = true;
  const lift = DECAL_TEST.lift ? Math.max(0, Math.min(20, Number(DECAL_TEST.lift))) / 1000 : FLANK.LIFT;
  const modes = DECAL_TEST.mode === 'both' ? ['zones', 'decal'] : [DECAL_TEST.mode === 'zones' ? 'zones' : 'decal'];
  for (const mode of modes) {
    const r = buildFlankDecal(model, modelKey(car), { mode, lift, curved: DECAL_TEST.mode === 'curve' });
    if (r?.mesh) model.userData['flankDecal_' + mode] = r.stats;
  }
  forgetDents(model); // (a model measured before: measured again with the decal on, so it bends with the paint)
  return model;
};
