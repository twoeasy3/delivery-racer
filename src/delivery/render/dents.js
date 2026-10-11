// ---- dents and scorch: a damaged car looks it ---------------------------------------------------
// The player's car (render/items.js) crumples as its health goes: at each share of damage in
// CONFIG.dents.steps its body panels (the body mesh, and every mesh in the same paint) swap to a
// more crumpled copy of their geometry, and its paint darkens toward black by CONFIG.dents.scorch
// at full damage. Traffic (render/cars.js) gets the scorch alone. The crumple is a fixed shove of
// every vertex by a hash of where it is (so the same car always dents the same way, and the
// corners of a box stay together), scaled to the panel's own size. The clean geometry is kept, so
// a new car (full health) is clean again.
import * as THREE from 'three';
import { CONFIG } from '../config.js';

// how crumpled, 0 (clean) .. CONFIG.dents.steps.length, for that share of damage
export const dentLevel = (share) => CONFIG.dents.steps.filter(step => share >= step).length;
// the share of health a vehicle has lost, 0 .. 1
export const damageShare = (v) => v.maxHealth > 0 ? Math.max(0, Math.min(1, 1 - v.health / v.maxHealth)) : 0;
// a fixed pseudo-random in -1 .. 1 from a vertex's position (k: which axis)
const jolt = (x, y, z, k) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + k * 53.3) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
};
const size = new THREE.Vector3();
const crumpled = (geometry, level) => {
  const geo = geometry.clone();
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  geo.boundingBox.getSize(size);
  const amount = CONFIG.dents.amount * level;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    pos.setXYZ(i, x + jolt(x, y, z, 1) * size.x * amount, y + jolt(x, y, z, 2) * size.y * amount, z + jolt(x, y, z, 3) * size.z * amount);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
};
// a mesh crumpled to that level: its geometries, clean and crumpled, are built once and kept on it
export const crumple = (mesh, level) => {
  const geos = mesh.userData.dentGeos || (mesh.userData.dentGeos = [mesh.geometry]);
  if (!geos[level]) geos[level] = crumpled(geos[0], level);
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
  for (const panel of panelsOf(group, body, extra)) crumple(panel, level);
};
// a paint colour scorched toward black for that share of damage (call it after the colour is set)
export const scorch = (color, share) => { if (share > 0) color.multiplyScalar(1 - CONFIG.dents.scorch * Math.min(1, share)); };
