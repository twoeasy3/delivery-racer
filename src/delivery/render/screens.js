// ---- WHICH WAY A WINDOW FACES (the owner, 16-Oct: "Are all front screens tagged properly on all cars?"): the windscreen and the rear
// window of a car, measured from the glass itself, not from where its box sits. Pure (three.js only: no DOM, no renderer), so the model
// editor's pane names (render/modelpatch.js windowPanes), the cracked glass (render/cracks.js) and the audit (scripts/windscreen-audit.mjs)
// read the same numbers.
//
// A pane's FACING: each triangle's normal, turned to face OUT of the cabin (up, where it leans more than about 15 degrees off the vertical;
// else away from the cabin's middle `zRef` along the car), summed by area into four shares: front (+z), rear (-z), side (|x| leads), roof
// (nearly flat). A thin glass box (both its faces) and a one-sided panel wound either way measure alike. Front is +z, left is +x, y up.
//   paneFacing(node, toModel, pane, zRef) -> { area, centre, normal, share: { front, rear, side, roof }, face, box, tris }
//   face: 'front' | 'rear' | 'side' | 'roof' | 'floor' (one share at least FACE_PURE of the area) or 'mixed'
// THE TAG (proposed, read first when a model sets it): `userData.window = 'windscreen' | 'rear'` on a glass mesh that is that window alone,
// or `window: 'windscreen' | 'rear'` on a pane (cabinGlass's `kind: 'screen'` panes are tagged by their name already).
import * as THREE from 'three';

export const FACE_PURE = 0.7; // a pane is one window's when at least this share of its area faces one way
const UP = 0.25;
const VOLUME = 0.08;            // m: a triangle this far off its pane's middle along its normal is a face of a glass VOLUME (a glasshouse box), not of a slab               // a triangle whose normal has |y| above this share is turned to face up; under it, away from the cabin's middle
const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Vector3(), mid = new THREE.Vector3();

// the triangles of a pane (a run of vertices of the node's geometry; the whole geometry when `pane` is null), in the model's frame:
// fn(a, b, c, i) with three Vector3s (reused: copy what is kept) and the triangle's index
export const paneTriangles = (node, toModel, pane, fn) => {
  const geo = node.geometry, pos = geo?.attributes?.position;
  if (!pos) return;
  const idx = geo.index ? geo.index.array : null, tris = Math.floor((idx ? idx.length : pos.count) / 3);
  const lo = pane ? pane.start : 0, hi = pane ? pane.start + pane.count : pos.count;
  for (let t = 0; t < tris; t++) {
    const i0 = idx ? idx[t * 3] : t * 3;
    if (i0 < lo || i0 >= hi) continue;
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx[t * 3 + k] : t * 3 + k).applyMatrix4(toModel);
    fn(v[0], v[1], v[2], t);
  }
};
// a triangle's normal (into `out`, unit, its area returned) turned out of the cabin: away from the pane's own middle `centre` where the pane is
// a VOLUME (a glasshouse box: the triangle stands more than VOLUME off its middle along its normal; a glass slab a few cm thick is not one), else up where it leans more than about
// 15 degrees off the vertical, else away from the cabin's middle `zRef` along the car
export const outward = (a, b, cc, zRef, out, centre = null) => {
  out.subVectors(b, a).cross(e2.subVectors(cc, a));
  const len = out.length();
  if (len < 1e-12) return 0;
  out.divideScalar(len);
  mid.set((a.x + b.x + cc.x) / 3, (a.y + b.y + cc.y) / 3, (a.z + b.z + cc.z) / 3);
  const off = centre ? (mid.x - centre.x) * out.x + (mid.y - centre.y) * out.y + (mid.z - centre.z) * out.z : 0;
  if (Math.abs(off) > VOLUME) { if (off < 0) out.negate(); }
  else if (Math.abs(out.y) >= UP) { if (out.y < 0) out.negate(); }
  else if (out.x * mid.x + out.z * (mid.z - zRef) < 0) out.negate();
  return len / 2;
};
// which way one triangle faces, from its outward normal ('floor': the underside of a glass volume, hidden in the body)
export const faceOf = (n) => (Math.abs(n.x) >= 0.6 ? 'side' : n.y >= 0.97 ? 'roof' : n.y <= -0.9 ? 'floor' : n.z >= 0 ? 'front' : 'rear');
const boxOf = (node, toModel, pane) => { const box = new THREE.Box3(); paneTriangles(node, toModel, pane, (a, b, cc) => { box.expandByPoint(a); box.expandByPoint(b); box.expandByPoint(cc); }); return box; };
export const paneFacing = (node, toModel, pane, zRef = 0) => {
  const share = { front: 0, rear: 0, side: 0, roof: 0, floor: 0 }, normal = new THREE.Vector3(), centre = new THREE.Vector3(), n = new THREE.Vector3();
  const box = boxOf(node, toModel, pane), middle = pane?.middle ? new THREE.Vector3().fromArray(pane.middle) : box.isEmpty() ? null : box.getCenter(new THREE.Vector3()); // (a run cut from a glass volume keeps the volume's middle: splitByFacing)
  let area = 0, tris = 0;
  paneTriangles(node, toModel, pane, (a, b, cc) => {
    const s = outward(a, b, cc, zRef, n, middle);
    if (!s) return;
    tris++;
    area += s;
    share[faceOf(n)] += s;
    normal.addScaledVector(n, s);
    centre.addScaledVector(c.addVectors(a, b).add(cc).divideScalar(3), s);
  });
  if (area > 0) { for (const k in share) share[k] /= area; centre.divideScalar(area); }
  if (normal.lengthSq() > 0) normal.normalize();
  const top = Object.entries(share).sort((p, q) => q[1] - p[1])[0];
  return { area, centre, normal, share, face: area > 0 && top[1] >= FACE_PURE ? top[0] : area > 0 ? 'mixed' : 'none', box, tris };
};
// a pane that faces several ways (a glasshouse box, a screen and its side windows in one piece) cut into the runs of vertices that each face one
// way (and, a side, one flank): -> [{ start, count, face, side, middle }] or null where it cannot be (a vertex shared by triangles facing two ways, as
// a smooth-shaded indexed shape has, or only one way found). Runs of one face are kept apart where they are not next to each other.
export const splitByFacing = (node, toModel, pane, zRef = 0) => {
  const box = boxOf(node, toModel, pane);
  if (box.isEmpty()) return null;
  const middle = box.getCenter(new THREE.Vector3()), geo = node.geometry, idx = geo.index ? geo.index.array : null;
  const lo = pane ? pane.start : 0, hi = pane ? pane.start + pane.count : geo.attributes.position.count;
  const owner = new Array(hi - lo).fill(null), n = new THREE.Vector3();
  let clash = false;
  paneTriangles(node, toModel, pane, (a, b, cc, t) => {
    if (clash || !outward(a, b, cc, zRef, n, middle)) return;
    const f = faceOf(n), key = f === 'side' ? (n.x > 0 ? 'side+' : 'side-') : f;
    for (let k = 0; k < 3; k++) {
      const i = (idx ? idx[t * 3 + k] : t * 3 + k) - lo;
      if (i < 0 || i >= owner.length) { clash = true; return; }
      if (owner[i] && owner[i] !== key) { clash = true; return; }
      owner[i] = key;
    }
  });
  if (clash) return null;
  const runs = [];
  for (let i = 0; i < owner.length; i++) {
    const k = owner[i] || (runs.length ? runs[runs.length - 1].key : null); // (an unused vertex joins the run before it)
    if (runs.length && runs[runs.length - 1].key === k) runs[runs.length - 1].count++;
    else runs.push({ key: k, start: lo + i, count: 1 });
  }
  if (runs.length < 2 || runs.some(r => !r.key)) return null;
  return runs.map(r => ({ start: r.start, count: r.count, face: r.key.startsWith('side') ? 'side' : r.key, side: r.key === 'side+' ? 1 : r.key === 'side-' ? -1 : 0, middle: middle.toArray() }));
};
// a REVERSE-RAKE rear window (the Slant-Back's, an Ami's: the glass leans forward from the roof's end, so it faces up and FORWARD) is a
// front-facing pane well behind the cabin's middle: its front share read as rear. -> the shares to judge it by
export const REVERSE_RAKE = 0.3; // m behind the cabin's middle
export const screenShares = (f, zRef) => (f.face === 'front' && f.centre.z < zRef - REVERSE_RAKE ? { ...f.share, front: f.share.rear, rear: f.share.front, reverse: true } : f.share);
// the middle of a car's cabin along its length (zRef above): the glass's own middle (area-weighted) when the glass is long enough to have
// one (a cab, a cabin: its rear window lies behind it even on a cab-forward lorry), else the car's
// (`fallback`: what to answer for glass too short to have a middle; the car's middle by default). A window PART long enough has its own: a
// cabinGlass mesh's screens are judged against that cabin, not against a boat's long glass roof behind it (zRefOf)
export const cabinMiddle = (list, carBox, fallback = null) => {
  let a = 0, z = 0, lo = Infinity, hi = -Infinity;
  for (const { node, toModel, pane } of list) paneTriangles(node, toModel, pane, (p, q, r) => {
    const s = e1.subVectors(q, p).cross(e2.subVectors(r, p)).length() / 2;
    const zc = (p.z + q.z + r.z) / 3;
    a += s; z += zc * s; lo = Math.min(lo, zc); hi = Math.max(hi, zc);
  });
  return a > 0 && hi - lo > 0.4 ? z / a : fallback ?? (carBox.min.z + carBox.max.z) / 2;
};
// the cabin's middle for the panes of one window part: its own where it spans enough (a cabin glass, a glasshouse), else the car's glass's
export const zRefOf = (list, node, global) => cabinMiddle(list.filter(e => e.node === node), null, global);
// is a pane HIDDEN from outside (a van's cab window behind its box body, a glasshouse face under the roof)? Rays at five points of it (its middle
// and four toward its corners), each cast from `reach` m out along its normal back to it: hidden where all five meet a part of the model (not glass,
// not see-through) on the way, both along its normal and level along the car (a wing, a roof's overhang or a sign over part of a rear window
// does not hide it) `model`: the root; `skip(node)`: true for what does not block (the windows themselves)
const ray = new THREE.Raycaster(), from = new THREE.Vector3(), dir = new THREE.Vector3();
export const paneHidden = (model, f, skip, reach = 6) => {
  if (f.share?.reverse) return false; // (a reverse-rake rear window faces forward under the roof's overhang, yet shows from behind: the Slant-Back's)
  const blockers = [];
  model.traverseVisible((o) => { if (o.isMesh && !skip(o) && !o.isInstancedMesh) { const m = [].concat(o.material)[0]; if (!(m?.transparent && m.opacity < 0.95)) blockers.push(o); } });
  if (!blockers.length) return false;
  model.updateMatrixWorld(true);
  const toWorld = model.matrixWorld;
  const pts = [f.centre.clone()];
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pts.push(new THREE.Vector3(a ? f.box.max.x : f.box.min.x, b ? f.box.max.y : f.box.min.y, (f.box.min.z + f.box.max.z) / 2).lerp(f.centre, 0.4));
  // all five blocked looking along the pane's normal AND straight along the car (its normal laid level): a body behind a cab window blocks both,
  // a roof's overhang or a sign over a raked window only the one
  const blockedAll = (n) => {
    dir.copy(n).transformDirection(toWorld).negate(); // (cast back toward the pane from outside: a panel between meets the ray on its outer face, which a one-sided material hits)
    for (const p of pts) {
      from.copy(p).addScaledVector(n, reach).applyMatrix4(toWorld);
      ray.set(from, dir); ray.far = reach - 0.03;
      if (!ray.intersectObjects(blockers, false).length) return false;
    }
    return true;
  };
  const level = new THREE.Vector3(f.normal.x, 0, f.normal.z);
  return blockedAll(f.normal) && (level.lengthSq() < 0.04 || blockedAll(level.normalize()));
};
