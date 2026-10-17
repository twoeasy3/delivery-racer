// ---- THE GHOST'S MODEL (render/ghostcar.js; CHECKLIST 445): the best run's car as its own model, the one the player's car
// shows in play (render/items.js playerModel: the model, its Super kit, its model patch; the Tank's tank, the Saucer's saucer
// at its hover height; a car with no model of its own the shaped box car, as in play), in Good or Evil as recorded, and
// with NOTHING of the player's loadout: no wheel set, plate, props, decal, underglow, no Super glow, no Legendary wreath
// (one pale material shows no paint anyway). Built once per car and side, then flattened into ONE mesh: every visible
// triangle of the model, positions only, in the model's frame (a mirrored part's and a two-sided part's faces turned to
// show as they did), drawn in the ghost's one see-through material. So a ghost is one draw call, culled off screen by
// its bounding sphere like any mesh, and the model it was made from is dropped, never drawn (its geometry and materials
// are the model builders' and their caches': nothing of them reaches the GPU). No animation: the car as built, at rest.
// Render-only: nothing here is read by the run (outside the replay fingerprint, scripts/logic-hash.mjs NOT_RULES: render/).
import * as THREE from 'three';
import { MODELS } from './models.js';
import { makeIdeaModel } from './ideaModels.js';
import { makeUfo, addSuperKit } from './carExtras.js';
import { patchModel, shapeEditsFor } from './modelpatchapply.js';
import { carShapes } from './shapeedits.js';
import { makeCarMesh, shapeCarMesh, makeTankMesh } from './cars.js';

export const GHOST_MAT = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.38, depthWrite: false });
GHOST_MAT.userData.shared = true;
const UFO_HOVER = 1.0; // m: the Saucer's height over the road in play (render/items.js, less its bob)

// the car's model as play shows it, and what it is: 'idea' | 'model' | 'tank' | 'ufo' | 'box' (a car with no model of its own)
export const ghostSource = (car, evil = false) => {
  let model, source;
  if (car.idea) { model = carShapes(shapeEditsFor(car), () => makeIdeaModel(car)); source = 'idea'; }
  else if (car.tank) { model = makeTankMesh(car.color); source = 'tank'; }
  else if (car.ufo) { model = new THREE.Group(); const ufo = makeUfo(); ufo.position.y = UFO_HOVER; model.add(ufo); source = 'ufo'; }
  else if (car.model && MODELS[car.model]) { model = carShapes(shapeEditsFor(car), () => MODELS[car.model](car)); source = 'model'; }
  if (!model) { // (as in play: the box car, shaped to the car's size)
    model = makeCarMesh(0xffffff);
    shapeCarMesh(model, car);
    source = 'box';
  }
  if (source === 'model' || source === 'idea') {
    if (car.super || car.superKit) addSuperKit(model, car);
    patchModel(model, car); // (as render/items.js playerModel patches it)
    if (!car.legend) model.userData.livery?.(evil); // (a part shown on one side only; a Legendary car has one scheme)
  }
  model.removeFromParent(); // (makeCarMesh puts its box car in the game's scene)
  return { model, source };
};

// a part that is not the car: a Super car's own underglow, a worn one, a flank decal (none are added here; a model may carry one)
const skipPart = (o) => o.userData.ownUnderglow || o.userData.underglow || o.userData.flankDecal;
const m = new THREE.Matrix4(), im = new THREE.Matrix4(), inv = new THREE.Matrix4(), v = new THREE.Vector3();
// every visible triangle of a model, in its own frame, as one geometry (positions and an index only)
export const flattenModel = (root) => {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const pos = [], idx = [];
  root.traverseVisible((o) => {
    if (!o.isMesh || skipPart(o)) return;
    const mats = [].concat(o.material).filter(mt => mt && mt.visible !== false && mt.opacity > 0);
    const g = o.geometry, p = g?.attributes?.position;
    if (!mats.length || !p) return;
    const double = mats.some(mt => mt.side === THREE.DoubleSide), back = !double && mats.every(mt => mt.side === THREE.BackSide);
    const n = g.index ? g.index.count : p.count;
    for (let k = 0; k < (o.isInstancedMesh ? o.count : 1); k++) {
      m.multiplyMatrices(inv, o.matrixWorld);
      if (o.isInstancedMesh) m.multiply(o.getMatrixAt(k, im));
      const flip = (m.determinant() < 0) !== back, base = pos.length / 3;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); }
      for (let i = 0; i + 2 < n; i += 3) {
        const a = base + (g.index ? g.index.getX(i) : i), b = base + (g.index ? g.index.getX(i + 1) : i + 1), c = base + (g.index ? g.index.getX(i + 2) : i + 2);
        if (flip) idx.push(a, c, b); else idx.push(a, b, c);
        if (double) { if (flip) idx.push(a, b, c); else idx.push(a, c, b); } // (a two-sided part: its back faces too)
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

// the ghost's mesh, one for the game: given the car (and side) to show, rebuilt only when they change, the last one's geometry disposed
export const GhostModel = { mesh: null, car: null, evil: false, source: '' };
export const ghostMeshFor = (car, evil = false, parent = null) => {
  const G = GhostModel;
  if (!G.mesh) {
    G.mesh = new THREE.Mesh(new THREE.BufferGeometry(), GHOST_MAT);
    G.mesh.rotation.order = 'YXZ'; // (turned to the heading first, then pitched with the slope: as the player's car)
    G.mesh.castShadow = G.mesh.receiveShadow = false;
    G.mesh.renderOrder = 10; // (after the scene's solid things and the player's car)
    G.mesh.visible = false;
    parent?.add(G.mesh);
  }
  if (G.car !== car || G.evil !== !!evil) {
    const { model, source } = ghostSource(car, !!evil);
    G.mesh.geometry.dispose();
    G.mesh.geometry = flattenModel(model);
    G.car = car; G.evil = !!evil; G.source = source;
  }
  return G.mesh;
};
