// ---- dents and scorch: a damaged car looks it ---------------------------------------------------
// The player's car (render/items.js) crumples as its health goes, in four hand-made stages: at each share of
// damage in CONFIG.dents.steps its body panels (the body mesh, and every mesh in the same paint) swap to a copy
// of their geometry with that stage's damage in it, and its paint darkens toward black by CONFIG.dents.scorch at
// full damage. Traffic (render/cars.js) gets the scorch alone. The four stages are DAMAGE below: each a fixed
// list of dents laid on the car by where they are (across, height, length of the whole car, not of a panel), so
// every car is hurt in the same places the same way, and the panels of one car agree where they meet. The clean
// geometry is kept, so a new car (full health) is clean again.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// how crumpled, 0 (clean) .. CONFIG.dents.steps.length, for that share of damage
export const dentLevel = (share) => CONFIG.dents.steps.filter(step => share >= step).length;
// the share of health a vehicle has lost, 0 .. 1
export const damageShare = (v) => v.maxHealth > 0 ? Math.max(0, Math.min(1, 1 - v.health / v.maxHealth)) : 0;
// The four stages of damage. A dent: `at` is where its centre is on the car ([across -1..1 (left..right), height 0..1
// (road..roof), length -1..1 (tail..nose)]), `r` how far it reaches (the same units, the farther the softer), `push` how
// far it shoves the panel there as a share of the car's [width, height, length]. Hurt on one side more than the other on
// purpose. Stage 1 a scuffed corner, 2 a creased bonnet and a dented door, 3 a crushed nose and a caved roof, 4 a wreck.
export const DAMAGE = [
  [ // 1: scuffed
    { at: [-0.8, 0.4, 1], r: 0.55, push: [0.05, -0.02, -0.06] },
    { at: [0.7, 0.4, -1], r: 0.5, push: [-0.03, 0, 0.04] },
  ],
  [ // 2: creased
    { at: [-0.8, 0.4, 1], r: 0.6, push: [0.08, -0.03, -0.09] },
    { at: [0.7, 0.4, -1], r: 0.5, push: [-0.05, 0, 0.06] },
    { at: [0.1, 0.6, 0.7], r: 0.5, push: [0, -0.06, -0.05] },
    { at: [-1, 0.5, 0], r: 0.45, push: [0.07, 0, 0] },
  ],
  [ // 3: crushed
    { at: [0, 0.4, 1], r: 0.7, push: [0, -0.04, -0.14] },
    { at: [-0.8, 0.4, 1], r: 0.6, push: [0.1, -0.04, -0.12] },
    { at: [0.7, 0.4, -1], r: 0.55, push: [-0.05, 0, 0.07] },
    { at: [0.1, 0.6, 0.7], r: 0.5, push: [0, -0.07, -0.06] },
    { at: [1, 0.5, 0.1], r: 0.5, push: [-0.1, 0, 0] },
    { at: [-1, 0.5, 0], r: 0.45, push: [0.08, 0, 0] },
    { at: [0, 1, -0.1], r: 0.5, push: [0, -0.1, 0] },
  ],
  [ // 4: wrecked
    { at: [0, 0.5, 1], r: 0.9, push: [0, -0.08, -0.22] },
    { at: [-0.8, 0.4, 1], r: 0.7, push: [0.16, -0.05, -0.18] },
    { at: [0.9, 0.5, 0.6], r: 0.6, push: [-0.12, -0.04, -0.06] },
    { at: [-1, 0.5, 0], r: 0.55, push: [0.12, -0.02, 0.02] },
    { at: [1, 0.5, 0.1], r: 0.55, push: [-0.13, 0, -0.02] },
    { at: [0, 1, -0.1], r: 0.8, push: [0, -0.16, 0] },
    { at: [-0.3, 1, -0.6], r: 0.5, push: [0.04, -0.1, 0] },
    { at: [0, 0.4, -1], r: 0.8, push: [0, -0.03, 0.14] },
    { at: [-0.8, 0.5, -1], r: 0.5, push: [0.1, 0, 0.1] },
  ],
];
const rel = new THREE.Matrix4(), relInv = new THREE.Matrix4(), v = new THREE.Vector3(), tmp = new THREE.Box3();
// where a model's panels sit as one car: their box in the model's own space, and each panel's way into it
const frameOf = (group, panels) => group.userData.dentFrame || (group.userData.dentFrame = (() => {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), box = new THREE.Box3();
  for (const m of panels) {
    m.geometry.computeBoundingBox();
    tmp.copy(m.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
    box.union(tmp);
  }
  return { box, inv };
})());
const crumpled = (mesh, geometry, level, frame) => {
  const geo = geometry.clone(), pos = geo.attributes.position, { box, inv } = frame;
  rel.multiplyMatrices(inv, mesh.matrixWorld); relInv.copy(rel).invert();
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const hw = Math.max(1e-6, (box.max.x - box.min.x) / 2), hl = Math.max(1e-6, (box.max.z - box.min.z) / 2), h = Math.max(1e-6, box.max.y - box.min.y);
  const dents = DAMAGE[Math.min(level, DAMAGE.length) - 1];
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(rel);
    const u = (v.x - cx) / hw, w = (v.y - box.min.y) / h, l = (v.z - cz) / hl;
    let dx = 0, dy = 0, dz = 0;
    for (const d of dents) {
      const dist = Math.hypot(u - d.at[0], w - d.at[1], l - d.at[2]) / d.r;
      if (dist >= 1) continue;
      const f = (1 - dist) * (1 - dist) * (3 - 2 * (1 - dist)); // (smooth: full at the centre, none at the edge)
      dx += d.push[0] * f * hw * 2; dy += d.push[1] * f * h; dz += d.push[2] * f * hl * 2;
    }
    v.set(v.x + dx, v.y + dy, v.z + dz).applyMatrix4(relInv);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
};
// a mesh crumpled to that level: its geometries, clean and crumpled, are built once and kept on it
export const crumple = (mesh, level, frame) => {
  const geos = mesh.userData.dentGeos || (mesh.userData.dentGeos = [mesh.geometry]);
  if (!geos[level]) geos[level] = crumpled(mesh, geos[0], level, frame);
  if (mesh.geometry !== geos[level]) mesh.geometry = geos[level];
};
// (a part's own paint, even while a ghost's material stands in for it: see items.js ghostify)
const paintOf = (mesh) => mesh.userData.solidMat || mesh.material;
// the panels of a model that crumple: its body, every mesh in the body's paint, and `extra`
const panelsOf = (group, body, extra) => group.userData.dentPanels || (group.userData.dentPanels = (() => {
  const list = [...extra];
  group.traverse((m) => { if (m.isMesh && (m === body || paintOf(m) === paintOf(body)) && !list.includes(m)) list.push(m); });
  return list;
})());
// a model dented for that share of damage (0 .. 1)
export const dentModel = (group, body, share, extra = []) => {
  const level = dentLevel(share);
  if (level === 0 && !group.userData.dentPanels) return; // (never dented: nothing to put back)
  const panels = panelsOf(group, body, extra), frame = frameOf(group, panels);
  for (const panel of panels) crumple(panel, level, frame);
};
// a paint colour scorched toward black for that share of damage (call it after the colour is set)
export const scorch = (color, share) => { if (share > 0) color.multiplyScalar(1 - CONFIG.dents.scorch * Math.min(1, share)); };
