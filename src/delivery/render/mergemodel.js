// ---- MERGING A STATIC MODEL'S MESHES (the Car ideas lot: one page of 22 ideas was 955 draw calls and 1,242 geometries, 5-9 ms of JS a
// frame at 1x and 20-35 ms at 4x, for models that stand still): the meshes of a model that share a MATERIAL (the same object) are
// joined into one mesh, their geometries baked into the model's own space. Looks the same: the same materials (so a paint or livery
// that changes a colour on one still changes it everywhere it is shared), the same triangles, the same z.
// What is NEVER joined, so nothing that moves, is painted or flashes can be broken: anything that moves under the model's own
// animate(t) or livery(evil) (found by calling them at several times and comparing every part's place, scale, visibility and
// material), any part a userData names (the body, the wheels), a part with a mirrored (negative) scale, a transparent or
// multi-material mesh, an instanced / skinned / line / point object, a mesh with its own onBeforeRender, and a group of meshes
// whose attributes cannot be joined. The model's top object keeps its own place, scale and userData.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const PROBES = [0, 0.37, 1.1, 2.9, 7.3];
const state = (o) => `${o.position.x},${o.position.y},${o.position.z},${o.quaternion.x},${o.quaternion.y},${o.quaternion.z},${o.quaternion.w},${o.scale.x},${o.scale.y},${o.scale.z},${o.visible}`;

// the parts a model's own functions move, show, hide or re-skin
export const moving = (root) => {
  const all = [];
  root.traverse((o) => { if (o !== root) all.push(o); });
  const mat = (o) => (o.isMesh ? o.material : null);
  const snap = () => all.map(o => [state(o), mat(o), o.isMesh ? o.geometry : null]);
  const base = snap(), dynamic = new Set();
  const compare = () => snap().forEach((s, i) => { if (s[0] !== base[i][0] || s[1] !== base[i][1] || s[2] !== base[i][2]) dynamic.add(all[i]); });
  const animate = root.userData.animate, livery = root.userData.livery;
  try {
    if (animate) for (const t of PROBES) { animate(t, 0.016); compare(); }
    if (livery) for (const evil of [true, false]) { livery(evil); compare(); }
  } catch { return null; } // (a function that cannot be called blind: leave the model alone)
  return dynamic;
};
// every Object3D a userData holds on to (the body, the wheels, a door: however deep), so none of them is joined
const named = (root) => {
  const found = new Set(), seen = new Set();
  const look = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 4 || seen.has(v)) return;
    seen.add(v);
    if (v.isObject3D) { v.traverse(o => found.add(o)); return; } // (and everything under it)
    if (Array.isArray(v)) { for (const x of v) look(x, depth + 1); return; }
    if (v.isMaterial || v.isBufferGeometry || v.isTexture) return;
    for (const k of Object.keys(v)) look(v[k], depth + 1);
  };
  root.traverse((o) => look(o.userData, 0));
  return found;
};

// returns { before, after } counts of meshes, or null if the model was left as it was
export const mergeStatic = (root) => {
  const dynamic = moving(root);
  if (!dynamic) return null;
  const keep = named(root);
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map(); // material -> [{ mesh, matrix }]
  let before = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    before++;
    if (o === root || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.material || o.material.transparent) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || o.onAfterRender !== THREE.Object3D.prototype.onAfterRender) return;
    if (!o.geometry || !o.geometry.attributes.position || o.geometry.morphAttributes?.position) return;
    for (let p = o; p && p !== root; p = p.parent) if (dynamic.has(p) || keep.has(p)) return;
    if (!o.visible) return;
    const matrix = inverse.clone().multiply(o.matrixWorld);
    if (matrix.determinant() <= 0) return; // (mirrored: its faces would turn inside out)
    const key = o.material;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ mesh: o, matrix });
  });
  let merged = 0;
  for (const [material, parts] of groups) {
    if (parts.length < 2) continue;
    // (same renderOrder, culling and layers, or they would not draw as they did)
    const first = parts[0].mesh;
    const same = parts.filter(({ mesh }) => mesh.renderOrder === first.renderOrder && mesh.frustumCulled === first.frustumCulled && mesh.layers.mask === first.layers.mask);
    if (same.length < 2) continue;
    const names = Object.keys(first.geometry.attributes).filter(n => same.every(({ mesh }) => mesh.geometry.attributes[n]));
    if (!names.includes('position') || (material.map && !names.includes('uv'))) continue;
    const indexed = same.every(({ mesh }) => mesh.geometry.index);
    const geos = same.map(({ mesh, matrix }) => {
      let g = mesh.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
      if (!indexed && g.index) g = g.toNonIndexed();
      g.applyMatrix4(matrix);
      return g;
    });
    const joined = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!joined) continue;
    const mesh = new THREE.Mesh(joined, material);
    mesh.renderOrder = first.renderOrder;
    mesh.frustumCulled = first.frustumCulled;
    mesh.layers.mask = first.layers.mask;
    mesh.userData.merged = true;
    root.add(mesh);
    for (const { mesh: old } of same) { old.parent.remove(old); merged++; }
  }
  // (a group left with nothing in it that is not the model's own is not pruned: it costs nothing to draw)
  let after = 0;
  root.traverse((o) => { if (o.isMesh) after++; });
  return { before, after, merged };
};
