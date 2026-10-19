// Z-FIGHTING, found from a model's geometry (no pictures): every visible mesh's triangles are taken into world space, and
// each pair that lies in (nearly) the same plane and overlaps in area is a place where the depth buffer cannot tell which
// surface is in front. A pair is kept only if it could be SEEN: from a point over the overlap, along the face's normal either
// way (never from underneath the car), a ray meets two or more surfaces at about the plane's depth with nothing nearer in
// front (the ray honours each material's sides, so a face turned away or a surface buried inside the body does not count),
// (a pair of the same flat colour is kept but marked `sameColour`: it cannot be seen to flicker, but it is a doubled surface;
// one with a polygon-offset material is marked `offset`: the offset decides it).
// `precise` (CHECKLIST 510; the cars' .zfight-check and the model editor's tab): the ray starts at the middle of the overlap
// itself (without it, at the mean of two triangles' corners, which can lie off the overlap: a fight missed or misjudged), an
// eye inside a closed solid of the model does not count, two overlays that write no depth are left out (drawn in order, never
// fighting), and `sameColour` needs the two lit alike too (one material type, one facing). Without it the detector is as the
// cargo checks were tuned on (.cargo-contain-check, .syrup-check: CARGO-RULES.md): precise finds more there, left to them.
// Used by the model editor's Z-fight tab and by scripts/.zfight-check.mjs.
//   findZFights(model, { gap = 0.004, minArea = 0.0001, precise = false }) -> [{ a, b, aMat, bMat, area, gapMin, gapMax, pairs, sameFacing,
//     normal, at, certain, sameColour, offset, view, sep }] biggest first: the certain (under CERTAIN m apart) before the weak, those
//     that can be seen to flicker before the same-coloured ones.
//   sep: how far b's plane stands in front of a's, along the view direction (view * normal; negative: behind), m.
//   a, b: the meshes (THREE.Mesh); area: m2 of the smaller surface involved; gapMin/gapMax: m between the planes; at: world
//   point (the overlap's middle); normal: the face's; certain: under half a millimetre apart (a 24-bit depth buffer, camera
//   near 0.5, cannot split them at any distance the game draws a car from): the rest only fight on a weak GPU or far away.
// Not caught: fighting that only appears at a far camera, parts the game adds later (damage, kits built in a level, livery
// stripes added by the page), poses other than the one the model is in.
import * as THREE from 'three';

export const CERTAIN = 0.0005; // m
const V = THREE.Vector3;

export const findZFights = (model, { gap: GAP = 0.004, minArea = 0.0001, precise = false } = {}) => {
  model.updateMatrixWorld(true);
  const tris = [];
  model.traverseVisible((node) => {
    if (!node.isMesh || node.isInstancedMesh || !node.geometry) return;
    const g = node.geometry, pos = g.attributes.position;
    if (!pos) return;
    const idx = g.index, total = idx ? idx.count : pos.count;
    const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
    const mats = [].concat(node.material);
    const mat = (i) => { const grp = g.groups.find(x => i >= x.start && i < x.start + x.count); return mats[grp ? grp.materialIndex : 0] || mats[0]; };
    for (let i = start; i + 2 < start + count; i += 3) {
      const p = [0, 1, 2].map(k => new V().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(node.matrixWorld));
      const n = new V().subVectors(p[1], p[0]).cross(new V().subVectors(p[2], p[0]));
      const area = n.length() / 2;
      if (area < 1e-7) continue;
      n.normalize();
      tris.push({ node, p, n, d: n.dot(p[0]), area, m: mat(i),
        lo: new V(Math.min(p[0].x, p[1].x, p[2].x), Math.min(p[0].y, p[1].y, p[2].y), Math.min(p[0].z, p[1].z, p[2].z)),
        hi: new V(Math.max(p[0].x, p[1].x, p[2].x), Math.max(p[0].y, p[1].y, p[2].y), Math.max(p[0].z, p[1].z, p[2].z)) });
    }
  });
  tris.sort((a, b) => a.lo.x - b.lo.x);

  // the area two coplanar triangles share: project onto the first's plane, clip one convex polygon by the other
  const overlapArea = (A, B) => {
    const ax = new V().subVectors(A.p[1], A.p[0]).normalize(), ay = new V().crossVectors(A.n, ax);
    const to2 = (q) => [q.clone().sub(A.p[0]).dot(ax), q.clone().sub(A.p[0]).dot(ay)];
    let poly = B.p.map(to2), clip = A.p.map(to2);
    const sA = (clip[1][0] - clip[0][0]) * (clip[2][1] - clip[0][1]) - (clip[1][1] - clip[0][1]) * (clip[2][0] - clip[0][0]);
    if (sA < 0) clip = clip.reverse();
    for (let e = 0; e < 3 && poly.length; e++) {
      const c0 = clip[e], c1 = clip[(e + 1) % 3], out = [];
      const side = (q) => (c1[0] - c0[0]) * (q[1] - c0[1]) - (c1[1] - c0[1]) * (q[0] - c0[0]);
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
        if (sa >= 0) out.push(a);
        if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      poly = out;
    }
    let s = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], k = a[0] * b[1] - b[0] * a[1]; s += k; cx += (a[0] + b[0]) * k; cy += (a[1] + b[1]) * k; }
    if (Math.abs(s) > 1e-12) mid.copy(A.p[0]).addScaledVector(ax, cx / (3 * s)).addScaledVector(ay, cy / (3 * s)); // (the overlap's own middle)
    return Math.abs(s) / 2;
  };
  const mid = new V();
  const colourOf = (m) => (m && m.color ? m.color.getHex() : -1);
  const dist = (q, T) => Math.abs(T.n.dot(q) - T.d);

  const groups = new Map();
  for (let i = 0; i < tris.length; i++) {
    const A = tris[i];
    for (let j = i + 1; j < tris.length; j++) {
      const B = tris[j];
      if (B.lo.x > A.hi.x + GAP) break;
      if (B.lo.y > A.hi.y + GAP || B.hi.y < A.lo.y - GAP || B.lo.z > A.hi.z + GAP || B.hi.z < A.lo.z - GAP || B.hi.x < A.lo.x - GAP) continue;
      const dot = A.n.dot(B.n);
      if (Math.abs(dot) < 0.98) continue;                                            // (not parallel enough to lie together)
      if (precise && A.m?.depthWrite === false && B.m?.depthWrite === false) continue;          // (two overlays that write no depth: drawn in order, never fighting)
      if (A.node === B.node && A.p.some(q => B.p.some(r => q.distanceToSquared(r) < 1e-10))) continue; // (neighbours in one surface)
      const gap = Math.max(...B.p.map(q => dist(q, A)), ...A.p.map(q => dist(q, B)));
      if (gap > GAP) continue;
      const same = colourOf(A.m) === colourOf(B.m) && !A.m?.map && !B.m?.map && A.m?.opacity === B.m?.opacity // (the same flat colour,
        && (!precise || (A.m?.type === B.m?.type && (A.m?.type === 'MeshBasicMaterial' || dot > 0.9995)));                    //  lit alike, vertex shading by height alike: the flicker cannot be seen)
      const area = overlapArea(A, B);
      if (area < 1e-6) continue;
      const key = Math.min(A.node.id, B.node.id) + '|' + Math.max(A.node.id, B.node.id) + '|' + (dot > 0 ? 's' : 'o') + (same ? 'c' : '');
      const g = groups.get(key) || { a: A.node, b: B.node, aMat: A.m, bMat: B.m, offset: !!(A.m?.polygonOffset || B.m?.polygonOffset), area: 0, gapMin: Infinity, gapMax: 0, pairs: 0, at: null, sameFacing: dot > 0, sameColour: same, normal: A.n.clone(), setA: new Set(), setB: new Set(), best: 0, sample: null };
      g.area += area; g.pairs++; g.gapMin = Math.min(g.gapMin, gap); g.gapMax = Math.max(g.gapMax, gap);
      g.setA.add(i); g.setB.add(j);
      if (area > g.best) { g.best = area; g.sample = { A, B, mid: mid.clone() }; }
      groups.set(key, g);
    }
  }

  const rc = new THREE.Raycaster();
  // is a point inside a closed solid (a box, a closed cylinder...)? Then an eye there is inside the car's body, where a camera
  // never is: along every axis ray from it, that one mesh shows more backs than fronts (its material drawn both sides for the test)
  const meshes = [];
  model.traverseVisible((n) => { if (n.isMesh && !n.isInstancedMesh && n.geometry?.attributes.position) meshes.push(n); });
  const AXES = [new V(1, 0, 0), new V(-1, 0, 0), new V(0, 1, 0), new V(0, -1, 0), new V(0, 0, 1), new V(0, 0, -1)];
  const box3 = new THREE.Box3(), nrm = new THREE.Matrix3();
  const insideSolid = (eye) => meshes.some((m) => {
    const mats = [].concat(m.material);
    if (mats.some(x => !x)) return false;
    if (!box3.setFromObject(m).containsPoint(eye)) return false;
    const sides = mats.map(x => x.side);
    mats.forEach(x => { x.side = THREE.DoubleSide; });
    try {
      nrm.getNormalMatrix(m.matrixWorld);
      return AXES.every((d) => {                       // (the winding along the ray: more of its backs met than fronts, so inside one
        rc.set(eye, d); rc.near = 0; rc.far = Infinity; //  of its solids at least; a merged mesh's overlapping blocks count right too)
        const out = []; m.raycast(rc, out);
        let wind = 0;
        for (const h of out) if (h.face) wind += h.face.normal.clone().applyMatrix3(nrm).dot(d) > 0 ? 1 : -1;
        return wind > 0;
      });
    } finally { mats.forEach((x, k) => { x.side = sides[k]; }); }
  });
  const middle = (g) => { const { A, B } = g.sample; return new V().addVectors(A.p[0], A.p[1]).add(A.p[2]).add(B.p[0]).add(B.p[1]).add(B.p[2]).multiplyScalar(1 / 6); };
  const seen = (g) => {
    const { A, B } = g.sample, c = precise ? g.sample.mid : middle(g); // (precise: the middle of the largest overlap, a point both surfaces cover)
    for (const sign of [1, -1]) {
      const view = A.n.clone().multiplyScalar(sign);
      if (view.y < -0.35) continue;                                  // (seen from underneath: the camera is never there)
      if (precise && insideSolid(c.clone().addScaledVector(view, 0.5))) continue; // (from inside the body: the camera is never there either)
      rc.set(c.clone().addScaledVector(view, 0.5), view.clone().negate()); rc.near = 0; rc.far = 1;
      const hits = rc.intersectObject(model, true).filter(h => h.object.visible);
      if (!hits.length || hits[0].distance < 0.5 - GAP - 0.002) continue; // (something else is in front)
      const here = hits.filter(h => Math.abs(h.distance - 0.5) <= GAP + 0.002);
      if (new Set(here.map(h => h.object.id + ':' + h.faceIndex)).size >= 2) { g.view = sign; g.sep = view.dot(B.p[0].clone().sub(A.p[0])); return true; }
    }
    return false;
  };
  const sum = (set) => { let t = 0; for (const k of set) t += tris[k].area; return t; };
  const out = [];
  for (const g of groups.values()) {
    g.area = Math.min(g.area, sum(g.setA), sum(g.setB)); // (the area itself, not once per triangle pair that covers it)
    if (g.area < minArea || !seen(g)) continue;
    out.push(g);
  }
  // the overlap's middle: the middle of the largest triangle pair's shared area
  for (const g of out) {
    g.at = precise ? g.sample.mid.clone() : middle(g);
    g.certain = g.gapMin < CERTAIN;
    delete g.setA; delete g.setB; delete g.best;
  }
  return out.sort((x, y) => (x.sameColour ? 1 : 0) - (y.sameColour ? 1 : 0) || (x.certain ? 0 : 1) - (y.certain ? 0 : 1) || y.area - x.area);
};
