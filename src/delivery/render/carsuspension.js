// ---- a car's SUSPENSION for its landing (the showroom's live car): the body moves, the wheels stay on the floor ------
// API: prepareSuspension(model) -> { planted, squash, sprung, wheels, how } (worked out once, kept in
//        model.userData.suspension; call it with the model standing still, as built)
//      applySuspension(model, body, o): o is render/carbounce.js bounceOffset's { y, pitch, roll, wheelY }; `body` is
//        the group the model stands in (nothing else in it moves): it takes the body's motion (y up, pitch, roll) and
//        the parts that are on the floor are held where they were (+ o.wheelY, while the whole car is still falling),
//        so the body sinks onto its wheels and rises off them: the arches close and open round the tyres.
// How the parts are found, whatever way a model was built (no model needs to be written for it):
//   WHEELS (planted): a mesh that touches the floor and is a disc on its side (as high as it is long, thinner across:
//     a tyre, whatever made it: the models' wheel() helpers, a CylinderGeometry of a model's own, a torus), with every
//     mesh inside that disc (hub, spokes, whitewall, tread blocks); a flat decal lying on the floor (an underglow) too.
//     A model may name them instead: userData.planted = [nodes]; [] lands it as one piece (the Monowheel: its carriage
//     hangs from rollers on the hoop's rims, and would part from them or run into them on springs).
//   SQUASHED: anything else that stands on the floor (a hovercraft's skirt, a snowcat's tracks, an awning's poles, a
//     boat's hull, a saucer's feet): kept on the floor at its foot and stretched or squashed upright so its top goes with
//     the body; what is inside it (a track's road wheels) rides at its height. No gap and nothing through the floor.
//   SPRUNG: the rest, which moves with `body`.
// What is moved is the highest node whose meshes are all planted (a wheel's own group, which animate() may spin): its
// matrix is set from its own position, rotation and scale (as animate leaves them) with the body's motion taken back off,
// so a spinning or steering wheel keeps doing so. While the car is at rest every node is left to three.js as usual.
// No allocation per frame; the parts are found once per model.
import * as THREE from 'three';

const NEAR = 0.03;          // m: as near the floor as touching it
const DECAL = 0.02;         // m: as thin as a decal lying on (or just over) the floor, within LOW of it
const LOW = 0.06;
const SMALL = 0.12;         // m: a part on the floor shorter than this is held there whole (a blade, a tread cleat), not squashed

const inv = new THREE.Matrix4(), bInv = new THREE.Matrix4(), A = new THREE.Matrix4(), q = new THREE.Matrix4(), t = new THREE.Matrix4();
const m1 = new THREE.Matrix4(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

// a mesh's box in the model's own frame (its geometry's box, through the meshes and groups above it up to the model)
const boxIn = (mesh, toModel) => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(m1.multiplyMatrices(toModel, mesh.matrixWorld));
};
const inside = (a, b, margin) => a.min.x >= b.min.x - margin.x && a.max.x <= b.max.x + margin.x && a.min.y >= b.min.y - margin.y
  && a.max.y <= b.max.y + margin.y && a.min.z >= b.min.z - margin.z && a.max.z <= b.max.z + margin.z;

export const prepareSuspension = (model) => {
  if (model.userData.suspension) return model.userData.suspension;
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const meshes = [];
  model.traverse((node) => { if (node.isMesh && node.geometry) meshes.push({ node, box: boxIn(node, toModel) }); });
  const all = new THREE.Box3();
  for (const m of meshes) all.union(m.box);
  const ground = all.min.y, near = (m) => m.box.min.y - ground < NEAR;
  const planted = new Set(), wheels = [], squash = [];
  // the model's own word, if it has one (every mesh under the nodes it names)
  const named = model.userData.planted;
  if (named) for (const node of named) { node.traverse((part) => { if (part.isMesh) planted.add(part); }); wheels.push(new THREE.Box3().setFromObject(node).applyMatrix4(toModel)); }
  else {
    for (const m of meshes) {
      const size = m.box.getSize(v1), across = Math.min(size.x, size.z), along = Math.max(size.x, size.z);
      if (size.y < DECAL && m.box.min.y - ground < LOW) { planted.add(m.node); continue; } // (a decal on the floor: an underglow)
      if (!near(m)) continue;
      const disc = !m.node.geometry.type.startsWith('Box') && size.y > 0.1 && Math.abs(along - size.y) < 0.15 * size.y && across < 0.85 * size.y;
      if (disc) { planted.add(m.node); wheels.push(m.box); }
    }
    // what is inside a tyre: its hub, spokes, whitewall, tread (within its width, a little proud, and within its round:
    // the corner of its box farthest from the axle no farther out than the tread)
    for (const m of meshes) {
      if (planted.has(m.node)) continue;
      for (const w of wheels) {
        const r = (w.max.y - w.min.y) / 2, cy = (w.min.y + w.max.y) / 2, alongX = w.max.x - w.min.x > w.max.z - w.min.z;
        const c = alongX ? (w.min.x + w.max.x) / 2 : (w.min.z + w.max.z) / 2, lo = alongX ? m.box.min.x : m.box.min.z, hi = alongX ? m.box.max.x : m.box.max.z;
        const dy = Math.max(Math.abs(m.box.min.y - cy), Math.abs(m.box.max.y - cy)), dc = Math.max(Math.abs(lo - c), Math.abs(hi - c));
        const round = Math.abs((m.box.min.y + m.box.max.y) / 2 - cy) < 0.1 * r && Math.abs((lo + hi) / 2 - c) < 0.1 * r; // (on the axle: a ring, a hub)
        const far = round ? Math.max(dy, dc) : Math.hypot(dy, dc);
        if (far <= r * 1.04 + 0.01 && inside(m.box, w, v2.set(0.06 + 0.1 * r, 0.03, 0.06 + 0.1 * r))) { planted.add(m.node); break; }
      }
    }
  }
  // the rest on the floor: held there whole if small, else squashed upright; what is inside one rides with it
  const feet = [];
  for (const m of meshes) {
    if (named || planted.has(m.node) || !near(m)) continue;
    if (m.box.max.y - ground < SMALL) planted.add(m.node);
    else feet.push(m);
  }
  const squashed = new Set(feet.map(m => m.node));
  for (const f of feet) squash.push({ node: f.node, top: f.box.max.y, mid: null, stretch: true });
  for (const m of meshes) {
    if (planted.has(m.node) || squashed.has(m.node)) continue;
    const f = feet.find(f => inside(m.box, f.box, v2.set(0.02, 0.02, 0.02)));
    if (f) { squashed.add(m.node); squash.push({ node: m.node, top: f.box.max.y, mid: (m.box.min.y + m.box.max.y) / 2, stretch: false }); }
  }
  // the nodes to move: the highest whose meshes are all planted
  const allPlanted = (node) => { let ok = true; node.traverse((part) => { if (part.isMesh && !planted.has(part)) ok = false; }); return ok; };
  const nodes = new Set();
  for (const mesh of planted) {
    let node = mesh;
    while (node.parent && node.parent !== model && allPlanted(node.parent)) node = node.parent;
    nodes.add(node);
  }
  for (const node of nodes) for (let up = node.parent; up && up !== model; up = up.parent) if (nodes.has(up)) nodes.delete(node); // (one inside another: the outer one)
  const sprungMeshes = meshes.filter(m => !planted.has(m.node) && !squashed.has(m.node)), sprung = sprungMeshes.map(m => m.node);
  const clearance = Math.min(...sprungMeshes.map(m => m.box.min.y)) - ground; // (how far its body is off the floor)
  const how = named ? (named.length ? 'named' : 'rigid') : wheels.length ? (feet.length ? 'wheels+squash' : 'wheels') : feet.length ? 'squash' : 'rigid';
  return (model.userData.suspension = {
    planted: [...nodes], squash, sprung, wheels: wheels.length, plantedMeshes: [...planted], how,
    ground, clearance, height: all.max.y - ground, half: (all.max.z - all.min.z) / 2, active: false, y: 0, pitch: 0, // (y, pitch: the body's, as last applied)
  });
};

// the body's motion taken back off a node (and, for one standing on the floor, its squash): its matrix, from its own
// position / rotation / scale, premultiplied by A^-1 * B^-1 * T(wheelY) * [S] * A (A: its parent in the body's frame;
// B: the body's own motion; S: the squash about the floor)
const hold = (node, wheelY, ground, k) => {
  node.updateMatrix();
  A.multiplyMatrices(inv, node.parent.matrixWorld);          // A: the node's parent, in the body's frame
  q.copy(bInv).multiply(t.makeTranslation(0, wheelY, 0));    // B^-1 * T(wheelY)
  if (k !== 1) q.multiply(t.makeTranslation(0, ground, 0)).multiply(t.makeScale(1, k, 1)).multiply(t.makeTranslation(0, -ground, 0));
  q.multiply(A).premultiply(t.copy(A).invert());             // A^-1 * ... * A
  node.matrix.premultiply(q);
  node.matrixAutoUpdate = false;
  node.matrixWorldNeedsUpdate = true;
};

export const applySuspension = (model, body, o) => {
  const s = prepareSuspension(model);
  // a long car pitches less (its ends move no more than a 3 m car's), and its body never goes down onto the floor: the
  // travel down is eased off short of it (a bump stop) where the body hangs low
  const pitch = o.pitch * Math.min(1, 1.6 / s.half);
  let y = o.y;
  if (y < 0 && s.how !== 'rigid') { const room = Math.max(0.004, s.clearance - 0.01 - Math.abs(pitch) * s.half); y = -room * Math.tanh(-y / room); }
  body.position.y = s.y = y;
  body.rotation.set(s.pitch = pitch, 0, o.roll);
  body.scale.y = 1;
  if (s.how === 'rigid') body.rotation.set(s.pitch = 0, 0, 0); // (nothing to pitch on)
  if (s.how === 'rigid' && y < 0) { // (nothing to bounce on: squashed a touch upright onto the floor instead of into it)
    const ground = v1.set(0, s.ground, 0).applyMatrix4(model.matrix).y, k = 1 + o.y / s.height;
    body.scale.y = k;
    body.position.y = ground * (1 - k);
    s.y = o.y;
  }
  const still = !o.y && !o.pitch && !o.roll && !o.wheelY;
  if (still) {
    if (s.active) { for (const node of s.planted) node.matrixAutoUpdate = true; for (const part of s.squash) part.node.matrixAutoUpdate = true; s.active = false; }
    return;
  }
  s.active = true;
  for (const node of s.planted) node.updateMatrix();
  for (const part of s.squash) part.node.updateMatrix();
  body.updateMatrix();
  body.updateMatrixWorld(true);
  inv.copy(body.matrixWorld).invert();
  bInv.copy(body.matrix).invert();
  const ground = v1.set(0, s.ground, 0).applyMatrix4(model.matrix).y; // (the floor, in the body's frame)
  for (const node of s.planted) hold(node, o.wheelY || 0, ground, 1);
  for (const part of s.squash) {
    // how far the body has moved at that height (its middle), and so how much the part stretches (or a passenger in it moves)
    const top = v2.set(0, part.top, 0).applyMatrix4(model.matrix).y, h = top - ground;
    const moved = y - (o.wheelY || 0), k = h > 0.05 ? Math.max(0.5, (h + moved) / h) : 1;
    if (part.stretch) hold(part.node, o.wheelY || 0, ground, k);
    else {
      const mid = v2.set(0, part.mid, 0).applyMatrix4(model.matrix).y;
      hold(part.node, (o.wheelY || 0) + (mid - ground) * (k - 1), ground, 1);
    }
  }
};
