// ---- the MODEL INSPECTOR's model: a car built as it is shown (render/showcar.js makeShowCar: an idea's own model, a
// garage car's, a key car's), painted for a side, and measured (its shapes and triangles, for judging its quality).
// No DOM and no renderer here, so a check can build every idea car's model (scripts/.inspector-check.mjs); the
// overlay itself is render/inspector.js.
import * as THREE from 'three';
import { makeShowCar, paintShowCar } from './showcar.js';
import { CONFIG } from '../config.js';
import { dentLevel, dentModel, scorch } from './dents.js';
import { crackShare, crackModel } from './cracks.js';

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
  model.userData.crackKey = car.id; // (render/cracks.js: the car's own crack pattern)
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

// ---- DAMAGE: the model in each of the game's damage states (the owner, 14-Oct: "add the damaged states into the model
// viewer"). The SAME code the game runs (render/dents.js dentModel and scorch, as render/items.js calls them for the
// player's car): a share of damage 0 .. 1 gives the stage CONFIG.dents.steps says (20, 40, 60, 80 %), the panels are swapped
// for crumpled copies and the paint is scorched by that share. 100 % is the last stage's shapes with the full scorch (the
// car at no health). Nothing here is a copy of the dent code, so a change to the dents shows in the viewer at once.
export const DAMAGE_STATES = [{ label: 'Clean', share: 0 }, ...CONFIG.dents.steps.map(s => ({ label: Math.round(s * 100) + '%', share: s })), { label: '100%', share: 1 }];
// ?damage=<n>: 0 .. 5 is a state (0 clean, 1 to 4 the stages, 5 the wreck at 100 %); a larger number is a percentage of damage (60 = stage 3)
export const damageFromParam = (text) => {
  if (text === null || text === undefined || text === '') return 0;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= DAMAGE_STATES.length - 1) return DAMAGE_STATES[Math.round(n)].share;
  return Math.min(100, n) / 100;
};
// the index in DAMAGE_STATES of a share (the nearest at or below it)
export const damageIndex = (share) => DAMAGE_STATES.reduce((at, s, i) => share >= s.share - 1e-9 ? i : at, 0);
const paintMat = (body) => { const m = body.userData.solidMat || body.material; return Array.isArray(m) ? m[0] : m; };
// the model dented for that share and its body paint scorched (undone for 0). The clean colour is kept on the model, so
// going from one state to another and back never builds up scorch. Call it on a model with no lamp effects in it.
export const damageModel = (model, share) => {
  const body = model.userData.body;
  if (!body || !body.geometry) return 0;
  const level = dentLevel(share), mat = paintMat(body);
  if (level > 0 || model.userData.dentLevel) dentModel(model, body, share); // (clean and never dented: left alone, nothing measured)
  crackModel(model, crackShare(share) === null ? null : share, model.userData.crackKey); // (the glass cracked too, unless ?crack=off: render/cracks.js)
  if (mat?.color) {
    const kept = model.userData.damageClean || (share > 0 ? (model.userData.damageClean = mat.color.clone()) : null);
    if (kept) { mat.color.copy(kept); scorch(mat.color, share); if (share <= 0) model.userData.damageClean = null; }
  }
  return level;
};
// the cost of a model clean and as it stands: triangles, shapes, and the draw calls once merged by material (a crumpled
// panel keeps its paint, so damage adds triangles and no draw call). A part's clean geometry is dentGeos[0].
export const damageCounts = (model) => {
  const now = countModel(model);
  let clean = 0;
  model.traverseVisible((node) => {
    if (!node.isMesh || !node.geometry) return;
    const g = node.userData.dentGeos?.[0] || node.geometry, total = g.index ? g.index.count : g.attributes.position?.count || 0;
    clean += Math.floor(Math.max(0, Math.min(total - Math.max(0, g.drawRange.start), g.drawRange.count)) / 3) * (node.isInstancedMesh ? node.count : 1);
  });
  return { clean: { ...now, triangles: clean }, damaged: now, factor: clean ? now.triangles / clean : 1 };
};
