// ---- MODEL PATCHES: a car's model edited as a patch over the model its code builds (the model editor:
// delivery/modeleditor.html, src/delivery/modeleditor.js; the game: render/modelpatchapply.js) ----------------------
// Pure (three.js only: no DOM, no renderer), so the editor, the game and a headless check run the same code.
//
// THE PART LIST (extractParts): the built model's tree, flattened. Every node under the model's root (meshes and
// groups) gets an id, its PATH of child indices from the root ("0", "3.1", ...), and a SIGNATURE (sig: what it is made
// of: its kind, the geometry's type, vertex count and size; never its place, so a part moved in code still matches).
// A part also carries a name (its own .name, else the model's hook that holds it: userData.body, wheels, lamps...,
// else a guessed role: wheel, tyre, hub, glass, headlamp, tail lamp, body, bumper, mirror...), its geometry's kind and
// parameters (editable for the plain primitives), its material's colour / emissive / opacity, its local transform,
// its parent and its triangles.
//
// THE PATCH (JSON):
//   { car: '<car id>', version: 1, base: '<signature of the builder output>', ops: [
//       { id: '3.1', sig: '...', set: { position: [x,y,z], rotation: [x,y,z], scale: [x,y,z], color: '#rrggbb',
//                                       emissive: '#rrggbb', opacity: 0.8, visible: false, params: {...},
//                                       shareMat: true, parent: '<id>' | '' } },
//       { id: '5', sig: '...', delete: true },
//       { add: { id: 'n1', kind: 'BoxGeometry', params: {...}, color, emissive, opacity, parent: '<id>' | '',
//                position, rotation, scale, name, role } },
//       { add: { id: 'm:3.1', from: '3.1', mirror: true } },   // a copy of a part (mirror: across the model's X)
//     ], evil: [ { id, sig, set: { color, emissive, opacity, visible } } ] }   // the Evil side's paint over the ops
// Ids are resolved against the model AS BUILT, before anything is changed (so a delete never shifts another id): by
// path when the sig agrees there, else by the one node anywhere with that sig; else the op is UNMATCHED: reported,
// skipped, never a crash. `base` differing means the code changed since the patch was made (a warning only).
// Colours: a part's material is cloned before it is changed (never a material another car, or a traffic copy, shares);
// `shareMat` clones it once for the model and gives every part of the model sharing it the same copy (one draw call).
// The code's hooks keep working: the wheels, lamps, livery, animate and the suspension hold the same nodes; the paint
// for a side is re-applied after the model's own livery (userData.livery is wrapped), so the patch's colours win.
import * as THREE from 'three';

export const PATCH_VERSION = 1;
// A wedge (or any tapered block): a base `width` x `depth`, a top `topWidth` x `topDepth` (0 = a sharp edge) whose centre is
// `topShift` along the depth (z) from the base's, `height` up. topDepth 0 with topShift = depth / 2 is a ramp rising to a
// vertical face at +z; topWidth < width tapers it in plan. Flat shaded, like a box. Made here so the editor can rebuild it.
export class WedgeGeometry extends THREE.BufferGeometry {
  constructor(width = 0.4, height = 0.3, depth = 0.6, topWidth = 0.4, topDepth = 0, topShift = 0.3) {
    super();
    this.type = 'WedgeGeometry';
    this.parameters = { width, height, depth, topWidth, topDepth, topShift };
    const w = width / 2, h = height / 2, d = depth / 2, tw = topWidth / 2, td = topDepth / 2;
    const B = [[-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d]];                                   // the base, seen from above: back-left, back-right, front-right, front-left
    const T = [[-tw, h, topShift - td], [tw, h, topShift - td], [tw, h, topShift + td], [-tw, h, topShift + td]];
    const quads = [B, [T[0], T[3], T[2], T[1]], [B[3], B[2], T[2], T[3]], [B[1], B[0], T[0], T[1]], [B[0], B[3], T[3], T[0]], [B[2], B[1], T[1], T[2]]];
    const pos = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const tri = (p, q, r) => {
      a.set(...p); b.set(...q); c.set(...r);
      if (ab.subVectors(b, a).cross(ac.subVectors(c, a)).lengthSq() < 1e-12) return; // (a sharp edge: no sliver)
      pos.push(...p, ...q, ...r);
    };
    // the base faces down (wound the other way round), the rest face out
    quads.forEach(([p, q, r, s], i) => {
      if (i === 0) { tri(B[0], B[1], B[2]); tri(B[0], B[2], B[3]); } else { tri(p, q, r); tri(p, r, s); }
    });
    this.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.computeVertexNormals();
    const uv = []; for (let i = 0; i < pos.length / 3; i++) uv.push(0, 0);
    this.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  }
}
// geometry kinds rebuilt from their parameters (their constructors take the parameters in this order)
export const PRIMITIVES = {
  BoxGeometry: ['width', 'height', 'depth', 'widthSegments', 'heightSegments', 'depthSegments'],
  CylinderGeometry: ['radiusTop', 'radiusBottom', 'height', 'radialSegments', 'heightSegments', 'openEnded', 'thetaStart', 'thetaLength'],
  SphereGeometry: ['radius', 'widthSegments', 'heightSegments', 'phiStart', 'phiLength', 'thetaStart', 'thetaLength'],
  ConeGeometry: ['radius', 'height', 'radialSegments', 'heightSegments', 'openEnded', 'thetaStart', 'thetaLength'],
  TorusGeometry: ['radius', 'tube', 'radialSegments', 'tubularSegments', 'arc'],
  PlaneGeometry: ['width', 'height', 'widthSegments', 'heightSegments'],
  CircleGeometry: ['radius', 'segments', 'thetaStart', 'thetaLength'],
  WedgeGeometry: ['width', 'height', 'depth', 'topWidth', 'topDepth', 'topShift'],
};
export const ADDABLE = {
  box: { kind: 'BoxGeometry', params: { width: 0.4, height: 0.3, depth: 0.4, widthSegments: 1, heightSegments: 1, depthSegments: 1 } },
  cylinder: { kind: 'CylinderGeometry', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 0.4, radialSegments: 12, heightSegments: 1, openEnded: false, thetaStart: 0, thetaLength: Math.PI * 2 } },
  sphere: { kind: 'SphereGeometry', params: { radius: 0.2, widthSegments: 12, heightSegments: 8, phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI } },
  wedge: { kind: 'WedgeGeometry', params: { width: 0.4, height: 0.3, depth: 0.6, topWidth: 0.4, topDepth: 0, topShift: 0.3 } },
  cone: { kind: 'ConeGeometry', params: { radius: 0.2, height: 0.4, radialSegments: 12, heightSegments: 1, openEnded: false, thetaStart: 0, thetaLength: Math.PI * 2 } },
};
export const makeGeometry = (kind, params) => {
  const keys = PRIMITIVES[kind];
  const Ctor = kind === 'WedgeGeometry' ? WedgeGeometry : THREE[kind];
  if (!keys || !Ctor) return null;
  return new Ctor(...keys.map(k => params?.[k]));
};

// ---- small helpers ----------------------------------------------------------------------------------------------
const r3 = (v) => Math.round(v * 1000) / 1000;
const hex = (c) => '#' + c.getHexString();
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
export const triangles = (node) => {
  if (!node.isMesh || !node.geometry) return 0;
  const g = node.geometry, total = g.index ? g.index.count : g.attributes.position?.count || 0;
  const start = Math.max(0, g.drawRange.start), count = Math.max(0, Math.min(total - start, g.drawRange.count));
  return Math.floor(count / 3) * (node.isInstancedMesh ? node.count : 1);
};
const firstMat = (node) => [].concat(node.material || [])[0];
// the nodes under the root, in a fixed order (depth first), with their paths
const walk = (root, fn) => {
  const go = (node, path) => node.children.forEach((child, i) => { const p = path ? path + '.' + i : String(i); fn(child, p); go(child, p); });
  go(root, '');
};
const sizeOf = (geo) => { if (!geo.boundingBox) geo.computeBoundingBox(); const s = geo.boundingBox.getSize(new THREE.Vector3()); return [s.x, s.y, s.z].map(v => v.toFixed(2)).join(','); };
export const sigOf = (node) => node.isMesh && node.geometry
  ? 'M:' + node.geometry.type + ':' + (node.geometry.attributes.position?.count || 0) + ':' + sizeOf(node.geometry)
  : (node.isMesh ? 'M' : node.isGroup ? 'G' : node.type) + ':' + node.children.length;

// a geometry's parameters can be edited only if it is as its constructor made it (not translated or rotated after)
const pristine = (geo) => {
  if (!PRIMITIVES[geo.type] || !geo.parameters) return false;
  const fresh = makeGeometry(geo.type, geo.parameters);
  if (!fresh) return false;
  const a = fresh.attributes.position, b = geo.attributes.position;
  let same = a && b && a.count === b.count;
  if (same) { fresh.computeBoundingBox(); if (!geo.boundingBox) geo.computeBoundingBox(); same = fresh.boundingBox.min.distanceTo(geo.boundingBox.min) < 1e-4 && fresh.boundingBox.max.distanceTo(geo.boundingBox.max) < 1e-4; }
  fresh.dispose();
  return !!same;
};

// ---- roles: the model's hooks first, else a guess from the shape, colour and place ----------------------------
const hookNames = (root) => {
  const names = new Map();
  for (const [key, value] of Object.entries(root.userData || {})) {
    if (value && value.isObject3D) names.set(value, key);
    else if (Array.isArray(value)) value.forEach((v, i) => v && v.isObject3D && !names.has(v) && names.set(v, key + '[' + i + ']'));
    else if (value && typeof value === 'object' && !(value instanceof Function)) for (const [k2, v] of Object.entries(value)) if (v && v.isObject3D && !names.has(v)) names.set(v, key + '.' + k2);
  }
  return names;
};
const guessRole = (node, box, carBox) => {
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const cs = carBox.getSize(new THREE.Vector3());
  if (!node.isMesh) return node.children.length ? 'group' : 'empty';
  const mat = firstMat(node) || {};
  const col = mat.color ? mat.color.getHSL({}) : { h: 0, s: 0, l: 0.5 };
  const glow = mat.type === 'MeshBasicMaterial' || (mat.emissive && mat.emissive.getHex() > 0 && (mat.emissiveIntensity ?? 1) > 0);
  const front = c.z > carBox.max.z - cs.z * 0.15, rear = c.z < carBox.min.z + cs.z * 0.15;
  const roundish = /Cylinder|Torus|Circle|Lathe/.test(node.geometry.type);
  const disc = Math.abs(s.y - s.z) < Math.max(s.y, s.z) * 0.25 && s.x < s.y * 0.9;
  if (roundish && disc && box.min.y < carBox.min.y + 0.08) return col.l < 0.2 ? 'tyre' : 'wheel';
  if (roundish && disc && c.y < carBox.min.y + cs.y * 0.45 && s.y < 1.4) return s.x < 0.12 || col.l > 0.35 ? 'hub' : 'wheel';
  if (disc && Math.abs(c.y - (carBox.min.y + s.y / 2)) < 0.1 && s.y > 0.25 && s.y < 1.4) return s.x < 0.12 ? 'hub' : 'wheel';
  if (glow || col.l > 0.8) {
    const red = (col.h < 0.04 || col.h > 0.94) && col.s > 0.5, amber = col.h > 0.04 && col.h < 0.13 && col.s > 0.5;
    if (front && !red) return amber ? 'indicator' : 'headlamp';
    if (rear && (red || amber)) return amber ? 'indicator' : 'tail lamp';
    if (glow) return 'lamp';
  }
  if (mat.transparent && mat.opacity < 0.95) return 'glass';
  if (col.l < 0.32 && col.h > 0.5 && col.h < 0.72 && col.s > 0.18) return 'glass';
  if (s.x > cs.x * 0.75 && s.y < cs.y * 0.25 && (front || rear) && c.y < carBox.min.y + cs.y * 0.45) return 'bumper';
  if (s.x * s.y * s.z > cs.x * cs.y * cs.z * 0.15) return 'body';
  if ((c.x > carBox.max.x - cs.x * 0.12 || c.x < carBox.min.x + cs.x * 0.12) && s.x < 0.25 && s.y < 0.2 && c.z > carBox.min.z + cs.z * 0.45 && c.y > carBox.min.y + cs.y * 0.45) return 'mirror';
  return 'part';
};

// ---- the part list ---------------------------------------------------------------------------------------------
// -> { parts: [...JSON-friendly rows], nodes: Map id -> Object3D, base }
export const extractParts = (root) => {
  root.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const hooks = hookNames(root);
  const boxes = new Map(), m = new THREE.Matrix4();
  const carBox = new THREE.Box3();
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry || node === root) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const b = node.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(toModel, node.matrixWorld));
    boxes.set(node, b);
    if (node.visible) carBox.union(b);
  });
  const groupBox = (node) => { const b = new THREE.Box3(); node.traverse(n => boxes.has(n) && b.union(boxes.get(n))); return b; };
  const parts = [], nodes = new Map(), ids = new Map();
  walk(root, (node, path) => {
    const box = boxes.get(node) || groupBox(node);
    const hook = hooks.get(node);
    const role = node.userData.patchRole || (hook ? hook.replace(/\[\d+\]$/, '') : guessRole(node, box, carBox.isEmpty() ? box : carBox));
    const mat = node.isMesh ? firstMat(node) : null;
    const geo = node.isMesh ? node.geometry : null;
    const row = {
      id: node.userData.patchId || node.userData.patchPath || path, path, sig: node.userData.patchSig || sigOf(node), type: node.isMesh ? 'mesh' : node.isGroup ? 'group' : node.type.toLowerCase(),
      name: node.name || hook || '', role, hook: hook || null,
      kind: geo ? geo.type : null,
      params: geo?.parameters && PRIMITIVES[geo.type] ? { ...geo.parameters } : null,
      editable: !!(geo && pristine(geo)),
      verts: geo?.attributes.position?.count || 0, tris: triangles(node),
      color: mat?.color ? hex(mat.color) : null, emissive: mat?.emissive ? hex(mat.emissive) : null,
      opacity: mat ? mat.opacity : null, transparent: mat ? !!mat.transparent : null, material: mat?.type || null,
      position: node.position.toArray().map(r3), rotation: [node.rotation.x, node.rotation.y, node.rotation.z].map(r3), scale: node.scale.toArray().map(r3),
      visible: node.visible, parent: path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : '',
      children: node.children.length, added: !!node.userData.patchId,
      box: box.isEmpty() ? null : [...box.min.toArray(), ...box.max.toArray()].map(r3),
    };
    row.parent = node.parent === root ? '' : ids.get(node.parent) ?? row.parent; // (by the ids the patch uses)
    ids.set(node, row.id);
    parts.push(row);
    nodes.set(row.id, node);
  });
  return { parts, nodes, base: modelSignature(root) };
};
// the builder output's signature (what the patch was made against)
export const modelSignature = (root) => {
  const sigs = [];
  walk(root, (node, path) => { if (!node.userData.patchId) sigs.push(path + '=' + sigOf(node)); });
  return fnv(sigs.join('|'));
};
// what the model costs to draw: shapes (visible meshes), triangles, materials (the draw calls once merged by material)
export const modelStats = (root) => {
  let meshes = 0, tris = 0;
  const mats = new Set();
  root.traverseVisible((node) => { if (!node.isMesh || !node.geometry) return; meshes++; tris += triangles(node); for (const mm of [].concat(node.material || [])) mats.add(mm); });
  return { meshes, triangles: tris, materials: mats.size };
};
// the budget in CAR-AGENT-PROMPT.md
export const BUDGET = { shapes: [40, 55], triangles: [1800, 3000], hard: 4000 };

// ---- applying a patch ------------------------------------------------------------------------------------------
const resolver = (root) => {
  const byPath = new Map(), bySig = new Map();
  walk(root, (node, path) => {
    byPath.set(path, node);
    const sig = sigOf(node);
    bySig.set(sig, bySig.has(sig) ? null : node); // (null: more than one: not a unique match)
  });
  return (id, sig) => {
    const at = byPath.get(id);
    if (at && (!sig || sigOf(at) === sig)) return at;
    if (sig && bySig.get(sig)) return bySig.get(sig);
    return null;
  };
};
const colors = new Map();
const color = (c) => { if (!colors.has(c)) { if (colors.size > 500) colors.clear(); colors.set(c, new THREE.Color(c)); } return colors.get(c); };
// a material of this part's own (cloned once) or the model's own copy shared by every part using the same one
const ownMaterial = (node, ctx, share) => {
  const mats = [].concat(node.material || []);
  if (!mats.length) return [];
  let made = false;
  const out = mats.map((mat) => {
    const orig = mat.userData.patchOrig || mat;
    if (share) {
      if (!ctx.shared.has(orig)) { made = true; const copy = orig.clone(); copy.userData = { ...orig.userData, patchOrig: orig, shared: false }; ctx.shared.set(orig, copy); }
      return ctx.shared.get(orig);
    }
    if (mat.userData.patchOwner === node) return mat;
    const copy = mat.clone(); copy.userData = { ...mat.userData, patchOrig: orig, patchOwner: node, shared: false };
    return copy;
  });
  if (share && made) { // (every part of the model using the original gets the copy too)
    ctx.root.traverse((n) => {
      if (!n.isMesh || n === node) return;
      const ms = [].concat(n.material || []);
      if (ms.some(mm => out.some(o => o.userData.patchOrig === mm))) n.material = Array.isArray(n.material) ? ms.map(mm => out.find(o => o.userData.patchOrig === mm) || mm) : out.find(o => o.userData.patchOrig === n.material);
    });
  }
  node.material = Array.isArray(node.material) ? out : out[0];
  return out;
};
const PAINT_KEYS = ['color', 'emissive', 'opacity'];
const paint = (node, set, ctx) => {
  if (!node.isMesh || !PAINT_KEYS.some(k => set[k] !== undefined)) return;
  for (const mat of ownMaterial(node, ctx, !!set.shareMat)) {
    if (set.color !== undefined && mat.color) mat.color.set(color(set.color));
    if (set.emissive !== undefined && mat.emissive) mat.emissive.set(color(set.emissive));
    if (set.opacity !== undefined) { mat.opacity = +set.opacity; mat.transparent = mat.opacity < 1 || !!mat.userData.patchOrig?.transparent; }
  }
};
const transform = (node, set) => {
  if (set.position) node.position.fromArray(set.position);
  if (set.rotation) node.rotation.set(set.rotation[0], set.rotation[1], set.rotation[2]);
  if (set.scale) node.scale.fromArray(set.scale);
  if (set.visible !== undefined) node.visible = !!set.visible;
  if (set.name !== undefined) node.name = String(set.name);
  if (set.role) node.userData.patchRole = String(set.role);
};
const reshape = (node, set, warn, id) => {
  if (!set.params || !node.isMesh) return;
  const geo = node.geometry;
  if (!PRIMITIVES[geo.type] || !geo.parameters) return warn(id + ': its geometry has no parameters to set (' + geo.type + ')');
  if (!node.userData.patchGeo && !pristine(geo)) return warn(id + ': its geometry was moved in code, so its sizes cannot be set (move or scale the part instead)');
  const fresh = makeGeometry(geo.type, { ...geo.parameters, ...set.params });
  if (!fresh) return;
  if (node.userData.patchGeo) geo.dispose(); // (only a geometry the patch made: the code's may be shared)
  node.geometry = fresh;
  node.userData.patchGeo = true;
};
// the matrix that mirrors a node across the model's X (x -> -x), in its parent's frame
const mirrorInto = (copy, source, root) => {
  root.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const P = new THREE.Matrix4().multiplyMatrices(toModel, source.parent.matrixWorld);
  const L = source.matrix.clone();
  const S = new THREE.Matrix4().makeScale(-1, 1, 1);
  const out = new THREE.Matrix4().copy(P).invert().multiply(S).multiply(P).multiply(L);
  out.decompose(copy.position, copy.quaternion, copy.scale);
};
const addPart = (spec, ctx, warn) => {
  let node;
  if (spec.from !== undefined) {
    const src = ctx.find(spec.from, spec.fromSig);
    if (!src) { warn('add ' + spec.id + ': its source ' + spec.from + ' is not in the model'); return null; }
    node = src.clone(true);
    node.traverse((n) => { n.userData = { ...n.userData }; delete n.userData.patchId; delete n.userData.patchPath; delete n.userData.patchSig; });
    walk(node, (n, sub) => { n.userData.patchId = spec.id + '/' + sub; });
    (spec.parent !== undefined ? ctx.find(spec.parent) || ctx.root : src.parent).add(node);
    if (spec.mirror) mirrorInto(node, src, ctx.root);
  } else {
    const geo = makeGeometry(spec.kind, { ...ADDABLE[Object.keys(ADDABLE).find(k => ADDABLE[k].kind === spec.kind)]?.params, ...spec.params });
    if (!geo) { warn('add ' + spec.id + ': cannot make a ' + spec.kind); return null; }
    const mat = new THREE.MeshLambertMaterial({ color: color(spec.color ?? '#9aa3b2') });
    node = new THREE.Mesh(geo, mat);
    node.userData.patchGeo = true;
    const parent = spec.parent ? ctx.find(spec.parent) : ctx.root;
    if (!parent) { warn('add ' + spec.id + ': its parent ' + spec.parent + ' is not in the model'); return null; }
    parent.add(node);
  }
  node.userData.patchId = spec.id;
  if (spec.name) node.name = spec.name;
  if (spec.role) node.userData.patchRole = spec.role;
  transform(node, spec);
  paint(node, spec, ctx);
  return node;
};

// apply a patch to a freshly built model, in place. -> { unmatched: [ids], warnings: [...], stale, applied }
// Never throws on a bad op: it is skipped and reported.
export const applyPatch = (root, patch, { evil = false } = {}) => {
  const out = { unmatched: [], warnings: [], stale: false, applied: 0 };
  walk(root, (node, path) => { if (node.userData.patchPath === undefined) { node.userData.patchPath = path; node.userData.patchSig = sigOf(node); } });
  if (!patch || !Array.isArray(patch.ops)) return out;
  const warn = (w) => out.warnings.push(w);
  const base = modelSignature(root);
  if (patch.base && patch.base !== base) { out.stale = true; warn('the model\'s code changed since this patch was made (base ' + patch.base + ', now ' + base + ')'); }
  const find0 = resolver(root);
  const added = new Map();
  const inAdded = (id) => { // ('n1/0.2': a part inside an added copy)
    const at = id.indexOf('/');
    if (at < 0) return null;
    let node = added.get(id.slice(0, at));
    for (const i of id.slice(at + 1).split('.')) node = node?.children[+i];
    return node || null;
  };
  const ctx = { root, shared: new Map(), find: (id, sig) => (id === '' ? root : added.get(id) || inAdded(String(id)) || find0(id, sig)) };
  // resolve every id first, against the model as built
  const targets = patch.ops.map(op => (op && op.id !== undefined ? ctx.find(op.id, op.sig) : null));
  const paints = []; // (the colour sets, re-applied after the model's livery)
  patch.ops.forEach((op, i) => {
    try {
      if (!op || typeof op !== 'object') return;
      if (op.add) { const node = addPart(op.add, ctx, warn); if (node) { added.set(op.add.id, node); out.applied++; paints.push([op.add.id, null, op.add]); } return; }
      const node = targets[i] || added.get(op.id);
      if (!node) { out.unmatched.push(op.id); return; }
      if (op.delete) { node.removeFromParent(); out.applied++; return; }
      const set = op.set || {};
      if (set.parent !== undefined) { const p = ctx.find(set.parent); if (p && p !== node) p.add(node); else warn(op.id + ': parent ' + set.parent + ' not found'); }
      transform(node, set);
      reshape(node, set, warn, op.id);
      paint(node, set, ctx);
      paints.push([op.id, op.sig, set]);
      out.applied++;
    } catch (e) { warn('op ' + i + ' failed: ' + e.message); }
  });
  // a mirror copy is worked out last, from its part as the ops left it (so it follows the part's edits)
  for (const op of patch.ops) {
    if (!op?.add?.mirror) continue;
    const copy = added.get(op.add.id), src = ctx.find(op.add.from, op.add.fromSig);
    if (copy && src) { try { mirrorInto(copy, src, root); } catch (e) { warn('mirror ' + op.add.id + ': ' + e.message); } }
  }
  // the side's paint: the ops' colours, then the Evil side's over them; re-applied after the model's own livery
  const evilOps = (Array.isArray(patch.evil) ? patch.evil : []).map(op => [op, ctx.find(op.id, op.sig)]);
  for (const [op, node] of evilOps) if (!node) out.unmatched.push('evil:' + op.id);
  const repaint = (isEvil) => {
    for (const [id, sig, set] of paints) { const node = ctx.find(id, sig); if (node) paint(node, set, ctx); }
    for (const [op, node] of evilOps) {
      if (!node || !op.set) continue;
      if (isEvil) { paint(node, op.set, ctx); if (op.set.visible !== undefined) node.visible = !!op.set.visible; }
      else if (op.set.visible !== undefined) { const base0 = paints.find(([pid]) => pid === op.id)?.[2]; node.visible = base0?.visible ?? true; }
    }
  };
  if (paints.length || evilOps.length) {
    const own = root.userData.livery;
    root.userData.livery = (isEvil) => { own?.(isEvil); repaint(!!isEvil); };
    root.userData.patchPaint = repaint;
    repaint(evil);
  }
  root.userData.patched = { car: patch.car, ops: patch.ops.length, unmatched: out.unmatched.length };
  return out;
};

// ---- editing a patch (the editor's verbs; each returns a NEW patch, so undo is a list of them) ------------------
export const emptyPatch = (car, base) => ({ car, version: PATCH_VERSION, base, ops: [], evil: [] });
const clonePatch = (p) => JSON.parse(JSON.stringify(p));
// merge values into the op for this id (or the add that made it)
export const withSet = (patch, part, values, { evil = false } = {}) => {
  const p = clonePatch(patch);
  const list = evil ? (p.evil ||= []) : p.ops;
  if (!evil) {
    const add = p.ops.find(op => op.add && op.add.id === part.id);
    if (add) { Object.assign(add.add, values); if (values.params) add.add.params = { ...add.add.params, ...values.params }; return p; }
  }
  let op = list.find(o => !o.add && o.id === part.id && !o.delete);
  if (!op) { op = { id: part.id, sig: part.sig, set: {} }; list.push(op); }
  if (values.params) values = { ...values, params: { ...(op.set.params || {}), ...values.params } };
  Object.assign(op.set, values);
  return p;
};
export const withDelete = (patch, part) => {
  const p = clonePatch(patch);
  const i = p.ops.findIndex(op => op.add && op.add.id === part.id);
  if (i >= 0) { // (an added part: the add goes, with what else was said of it and its mirror copies)
    p.ops = p.ops.filter((op, j) => j !== i && op.id !== part.id && !(op.add && op.add.from === part.id));
    return p;
  }
  p.ops = p.ops.filter(op => op.id !== part.id || op.add);
  p.ops.push({ id: part.id, sig: part.sig, delete: true });
  return p;
};
const nextId = (p, prefix) => { let n = 1; const used = new Set(p.ops.filter(o => o.add).map(o => o.add.id)); while (used.has(prefix + n)) n++; return prefix + n; };
export const withAdd = (patch, what, at = {}) => {
  const p = clonePatch(patch);
  const spec = ADDABLE[what];
  const add = { id: nextId(p, 'n'), kind: spec.kind, params: { ...spec.params }, color: at.color || '#9aa3b2', parent: at.parent || '', position: at.position || [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], name: what, role: 'part' };
  p.ops.push({ add });
  return { patch: p, id: add.id };
};
export const withDuplicate = (patch, part) => {
  const p = clonePatch(patch);
  const id = nextId(p, 'c');
  const pos = [...part.position]; pos[0] += 0.1; pos[1] += 0.05;
  p.ops.push({ add: { id, from: part.id, fromSig: part.added ? undefined : part.sig, position: pos, rotation: part.rotation, scale: part.scale, name: (part.name || part.role) + ' copy' } });
  return { patch: p, id };
};
// M: the part's mirror copy across the model's X (made once; it follows the part, as it is worked out when applied)
export const withMirror = (patch, part) => {
  const p = clonePatch(patch);
  const id = 'm:' + part.id;
  if (!p.ops.some(op => op.add && op.add.id === id)) p.ops.push({ add: { id, from: part.id, fromSig: part.added ? undefined : part.sig, mirror: true, name: (part.name || part.role) + ' (mirror)' } });
  return { patch: p, id };
};
// the patch without ops that do nothing (an empty set)
export const tidyPatch = (patch) => {
  const p = clonePatch(patch);
  p.ops = p.ops.filter(op => op.add || op.delete || (op.set && Object.keys(op.set).length));
  p.evil = (p.evil || []).filter(op => op.set && Object.keys(op.set).length);
  return p;
};
