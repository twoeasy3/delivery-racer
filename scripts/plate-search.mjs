// The NUMBER PLATE PLACE SEARCH (shared by scripts/plate-anchors.mjs, the table's generator, and scripts/plate-placement-audit.mjs
// --fix): where on a car's back or front a plate can stand. Rays along the car's length (the first surface met from outside) on a grid
// that covers the plate AND a margin round it (the plate's dark edge: so the plate never hangs over a bumper's top or bottom), at every
// height from just off the ground to 60 % of the car, for the plate widths 0.52 (the canonical plate, preferred), 0.46, 0.40, 0.34,
// 0.30 m (4:1). A place is kept only if every ray meets the car's paintwork (not glass, a lamp, a wheel), within REACH of the car's own
// end (a ray that runs under the car to the back of the other bumper does not count: the first generator put four rear plates inside
// the front of the car that way), the hits fit one plane (STRICT, else ROUGH), the plane leans no more than MAX_PITCH (a lid is not a
// place), is square across the car (MAX_YAW), and nothing of the car stands in front of the plate from 20 degrees above (a bumper or
// a step overhanging it). Scored: flat, upright, near the preferred height (the car's own plate's, else 0.5 m), canonical size, out at
// the car's end. Units: car-local metres (x across, y up, the nose at +z); pitch in degrees, the plane's dz/dy (the plate's rotation.x).
import * as THREE from 'three';
import { isWindowNode } from '../src/delivery/render/glassnames.js';

export const SIZES = [0.52, 0.46, 0.40, 0.34, 0.30];
export const STRICT = 0.006, ROUGH = 0.012; // m: the most a hit may stand off the fitted plane
export const MAX_PITCH = 25, MAX_YAW = 1.5, REACH = 0.5, MARGIN = 0.004, OVERHANG = 0.009, GLACIS = 40; // degrees; m from the car's end; m round the plate; m a big plate may overhang its band at top and bottom
const NX = 11, NY = 5;

// a spare wheel's tyre (not one of the four the wheel code knows): a near-black cylinder 0.4 m or more across
export const isTyre = (n) => {
  const g = n.geometry, m = [].concat(n.material)[0];
  if (!g || g.type !== 'CylinderGeometry' || !m?.color) return false;
  const c = m.color, r = Math.max(g.parameters.radiusTop, g.parameters.radiusBottom) * Math.max(n.scale.x, n.scale.y, n.scale.z);
  return r >= 0.2 && Math.max(c.r, c.g, c.b) < 0.12;
};
// the meshes a plate can be measured against: visible, not the cosmetic plate or prop, not see-through; each with its kind
// opts.glassy(material) (render/dents.js), opts.wheels: a Set of wheel meshes
export const makeView = (model, { glassy, wheels = new Set() } = {}) => {
  model.updateMatrixWorld(true);
  const body = model.userData.body, bodyMat = body?.material, meshes = [];
  const skip = (n) => { for (let p = n; p; p = p.parent) { if (p.visible === false || p.userData.platecosmetic || p.userData.propCosmetic) return true; } return false; };
  model.traverse((n) => {
    if (!n.isMesh || !n.geometry || skip(n)) return;
    const m = [].concat(n.material)[0];
    if (!m || m.visible === false || (m.transparent && m.opacity < 0.95)) return;
    const lamp = m.isMeshBasicMaterial || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0.25);
    const glass = isWindowNode(n) || (n !== body && m !== bodyMat && glassy && glassy(m)); // (named or marked a window, either spelling: render/glassnames.js)
    n.userData._plateKind = wheels.has(n) || n.userData.wheelRing || isTyre(n) ? 'wheel' : lamp ? 'lamp' : glass ? 'glass' : 'ok';
    meshes.push(n);
  });
  const box = new THREE.Box3();
  for (const n of meshes) {
    const b = new THREE.Box3().setFromObject(n, true);
    if (b.max.y - b.min.y < 0.005 && b.max.y < 0.1) continue; // (an underglow / shadow plane on the ground)
    box.union(b);
  }
  return { model, meshes, box, inv: new THREE.Matrix4().copy(model.matrixWorld).invert(), ray: new THREE.Raycaster() };
};

// the first surface along the car's length at (x, y) seen from outside the end: { z, kind } or null
export const shoot = (view, end, x, y) => {
  const s = end === 'rear' ? -1 : 1, L = view.box.max.z - view.box.min.z + 5;
  const o = new THREE.Vector3(x, y, s * L).applyMatrix4(view.model.matrixWorld), d = new THREE.Vector3(0, 0, -s).transformDirection(view.model.matrixWorld);
  view.ray.set(o, d); view.ray.far = 2 * L;
  const hit = view.ray.intersectObjects(view.meshes, false)[0];
  if (!hit) return null;
  return { z: hit.point.clone().applyMatrix4(view.inv).z, kind: hit.object.userData._plateKind };
};
// is anything of the car in front of the plate's face point p (model space) seen along dir (pointing out, model space)?
export const blocked = (view, p, dir) => {
  const o = p.clone().addScaledVector(dir, 30).applyMatrix4(view.model.matrixWorld), d = dir.clone().negate().transformDirection(view.model.matrixWorld);
  view.ray.set(o, d); view.ray.far = 30 - 0.002;
  return view.ray.intersectObjects(view.meshes, false).length > 0;
};

// least squares z = a + b * dy + c * x
export const fitPlane = (rows) => {
  let n = rows.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
  for (const [x, dy, z] of rows) { sx += x; sy += dy; sxx += x * x; syy += dy * dy; sxy += x * dy; sz += z; sxz += x * z; syz += dy * z; }
  const M = [[n, sy, sx], [sy, syy, sxy], [sx, sxy, sxx]], R = [sz, syz, sxz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) < 1e-12) return null;
  const col = (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? R[i] : v))));
  const a = col(0) / D, b = col(1) / D, c = col(2) / D;
  let dev = 0;
  for (const [x, dy, z] of rows) dev = Math.max(dev, Math.abs(z - (a + b * dy + c * x)));
  return { a, b, c, dev };
};

// one candidate: a plate w wide centred at height y on `end`: { y, z, w, pitch, dev } or null
export const tryPlace = (view, end, w, y, { tol = STRICT, reach = REACH, marginY = MARGIN, maxPitch = MAX_PITCH } = {}) => {
  const s = end === 'rear' ? -1 : 1, h = w / 4, endZ = s < 0 ? view.box.min.z : view.box.max.z;
  const rows = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = -(w / 2 + MARGIN) + (w + 2 * MARGIN) * i / (NX - 1), dy = -(h / 2 + marginY) + (h + 2 * marginY) * j / (NY - 1);
    const hit = shoot(view, end, x, y + dy);
    if (!hit || hit.kind !== 'ok' || (endZ - hit.z) * s > reach) return null;
    rows.push([x, dy, hit.z]);
  }
  const f = fitPlane(rows);
  if (!f || f.dev > tol) return null;
  const pitch = Math.atan(f.b) * 180 / Math.PI, yaw = Math.atan(f.c) * 180 / Math.PI;
  if (Math.abs(pitch) > maxPitch || Math.abs(yaw) > MAX_YAW) return null;
  // nothing in front of the face, straight on and from 20 degrees above (the chase camera's side)
  const th = f.b, N = new THREE.Vector3(0, -s * th, s).normalize(); // (the plate's outward normal: the plane z = a + b*dy leans by b)
  const up = N.clone().multiplyScalar(Math.cos(Math.PI / 9)).add(new THREE.Vector3(0, Math.sin(Math.PI / 9), 0)).normalize();
  let cover = 0;
  for (const [fx, fy] of [[-0.45, -0.4], [0.45, -0.4], [0, 0], [-0.45, 0.4], [0.45, 0.4], [0, -0.45]]) {
    const p = new THREE.Vector3(fx * w, y + fy * h, f.a + f.b * fy * h + f.c * fx * w).addScaledVector(N, 0.005);
    if (blocked(view, p, N)) return null;
    if (blocked(view, p, up)) cover++;
  }
  return { y, z: f.a, w, pitch, dev: f.dev, cover: cover / 6, inside: (endZ - f.a) * s };
};

// the best places at one end, best first (at most `keep`): [{ y, z, w, pitch, dev, cover, inside, rough, score }]
// opts.preferY: the height to aim for (the car's own plate's); opts.sizes: the widths to try
export const searchPlace = (view, end, { preferY = null, sizes = SIZES, keep = 8, step = 0.01 } = {}) => {
  const H = view.box.max.y - view.box.min.y, lo = view.box.min.y;
  const aim = preferY ?? Math.max(lo + 0.45, Math.min(0.55, lo + 0.45 * H));
  const out = [];
  for (const [tol, rough, maxPitch] of [[STRICT, false, MAX_PITCH], [ROUGH, true, MAX_PITCH], [STRICT, true, GLACIS]]) {
    for (const w of sizes) {
      const h = w / 4;
      // the plate's own height on a flat band with a margin round it; and, for the two big sizes, a plate up to OVERHANG taller than
      // its band at top and bottom (a canonical plate on a bumper bar a little lower than it: better than a toy-sized plate)
      for (const marginY of w >= 0.46 ? [MARGIN, -OVERHANG] : [MARGIN]) {
        for (let y = lo + 0.12 + h / 2; y <= lo + 0.6 * H; y += step) {
          const c = tryPlace(view, end, w, y, { tol, marginY, maxPitch });
          if (!c) continue;
          c.rough = rough; c.overhang = marginY < 0;
          c.score = c.dev * 150 + Math.abs(c.pitch) / 15 + Math.abs(y - aim) * 1.2 + (0.52 - w) * 8 + Math.max(0, c.inside - 0.1) * 2 + c.cover * 2 + (rough ? 1 : 0) + (c.overhang ? 0.5 : 0);
          out.push(c);
        }
      }
    }
    if (out.some(c => c.w >= 0.4)) break; // (a strict place of a fair size: the rough pass is not needed; nothing at all: a steep front (an armoured car's glacis) up to GLACIS degrees, last)
  }
  out.sort((a, b) => a.score - b.score);
  // keep places that differ (not the same spot one centimetre higher)
  const kept = [];
  for (const c of out) { if (kept.length >= keep) break; if (!kept.some(k => k.w === c.w && Math.abs(k.y - c.y) < 0.02)) kept.push(c); }
  return kept;
};
