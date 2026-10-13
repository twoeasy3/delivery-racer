// ---- the MODEL INSPECTOR's model: a car built as it is shown (render/showcar.js makeShowCar: an idea's own model, a
// garage car's, a key car's), painted for a side, and measured (its shapes and triangles, for judging its quality).
// No DOM and no renderer here, so a check can build every idea car's model (scripts/.inspector-check.mjs); the
// overlay itself is render/inspector.js.
import * as THREE from 'three';
import { makeShowCar, paintShowCar } from './showcar.js';

// (an idea with no model yet stands as a plain block of its size, as in the ideas lot: render/ideaslot.js)
const block = (car) => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(car.hw * 2, Math.max(0.3, car.height - 0.3), car.hl * 2), new THREE.MeshLambertMaterial({ color: car.color }));
  body.position.y = (car.height + 0.3) / 2;
  group.add(body);
  group.userData = { body, animate: () => {}, block: true };
  return group;
};

// the car's model, out of any scene (makeCarMesh puts a garage car's in the game's scene first), painted for the side
export const buildInspectModel = (car, evil = false) => {
  let model;
  try { model = makeShowCar(car); } catch { model = null; }
  if (!model) model = block(car);
  model.parent?.remove(model);
  paintInspectModel(model, car, evil);
  return model;
};
export const paintInspectModel = (model, car, evil) => {
  if (model.userData.block) { model.userData.body.material.color.setHex(evil ? car.evilColor ?? car.color : car.color); return; }
  paintShowCar(model, car, evil);
};

// what it is made of: its meshes (shapes), their triangles (an instanced mesh's times its copies; a geometry's draw range
// and index honoured) and the materials among them. Hidden parts are left out (a livery's other side, a lamp off)
export const countModel = (model) => {
  let meshes = 0, triangles = 0;
  const materials = new Set();
  model.traverseVisible((node) => {
    if (!node.isMesh || !node.geometry) return;
    const g = node.geometry, total = g.index ? g.index.count : g.attributes.position?.count || 0;
    const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
    const copies = node.isInstancedMesh ? node.count : 1;
    meshes++;
    triangles += Math.floor(count / 3) * copies;
    for (const m of [].concat(node.material || [])) materials.add(m);
  });
  return { meshes, triangles, materials: materials.size };
};

// its size in words (as the ideas lot says it: render/ideaslot.js), the real one for a car driven smaller than it is
const metres = (v) => (Math.round(v * 10) / 10).toFixed(1);
export const sizeWords = (car) => {
  const s = car.real || car;
  return metres(s.hl * 2) + ' × ' + metres(s.hw * 2) + ' × ' + metres(s.height) + ' m';
};
