// ---- MODEL PATCHES: a car's model edited as a patch over the model its code builds (the model editor:
// delivery/modeleditor.html, src/delivery/modeleditor.js; the game: render/modelpatchapply.js) ----------------------
// Pure (three.js only: no DOM, no renderer), so the editor, the game and a headless check run the same code.
//
// THE PART LIST (extractParts): the built model's tree, flattened. Every node under the model's root (meshes and
// groups) gets an id, its PATH of child indices from the root ("0", "3.1", ...), and a SIGNATURE (sig: what it is made
// of: its kind, the geometry's type, vertex count and size; never its place, so a part moved in code still matches).
// A part also carries a name (its own .name, else the model's hook that holds it: userData.body, wheels, lamps...,
// else a guessed role: wheel, tyre, hub, window, headlamp, tail lamp, body, bumper, mirror...), its geometry's kind and
// parameters (editable for the plain primitives), its material's colour / emissive / opacity, its local transform,
// its parent and its triangles.
// WINDOWS (the owner, 15-Oct: 'glass' and 'window' are the same thing): a see-through part's role is 'window', whichever word the model
// or a patch used (render/glassnames.js: a name, role, hook or material name with glass / window / windscreen in it, cabinGlass's panes,
// or the guess: a see-through material that does not glow, or the models' dark blue-grey glass). Every window part lists its PANES
// (row.panes, windowPanes below): cabinGlass's own (named, their edges editable), else the separate panels of a hand-built glass mesh
// (named from where they stand: windscreen, rear window, side window L / R, window 2 L..., side windows (a band through the car), roof window).
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
//     ], evil: [ { id, sig, set: { color, emissive, opacity, visible } } ],   // the Evil side's paint over the ops
//     glass: { 'door window': [[z, y], ...], 'quarter window R': [[z, y], ...], windscreen: { foot: [z, y], top: [z, y] } } }
//   shapes: { 's<hash>#<n>': [[u, v], ...] } } (render/shapeedits.js): the OUTLINES of extruded / flat / lathed shapes, read as the car's own model
//   is BUILT (carShapes): an id names one outline (the hash of its points as the code makes them, and which one of those); an id the build never
//   makes is reported and skipped. scripts/bake-shapes.mjs writes them into the car's code.
//   `glass` (a car whose windows cabinGlass builds, render/ideaModelsDkit.js): the WINDOW EDGES, read as the model is BUILT (not an op on
//   a part): a side window's id names both flanks (one polygon, so the car stays symmetric) or one (' L' / ' R'); an id the build never
//   asks for is reported (a warning) and skipped. withGlass() edits the table; the model editor's Glass tool draws it.
// Ids are resolved against the model AS BUILT, before anything is changed (so a delete never shifts another id): by
// path when the sig agrees there, else by the one node anywhere with that sig; else the op is UNMATCHED: reported,
// skipped, never a crash. `base` differing means the code changed since the patch was made (a warning only).
// Colours: a part's material is cloned before it is changed (never a material another car, or a traffic copy, shares);
// `shareMat` clones it once for the model and gives every part of the model sharing it the same copy (one draw call).
// The code's hooks keep working: the wheels, lamps, livery, animate and the suspension hold the same nodes; the paint
// for a side is re-applied after the model's own livery (userData.livery is wrapped), so the patch's colours win.
import * as THREE from 'three';
import { WINDOW_ROLE, isWindowRole, isGlassWord, isWindowNode, glassTable, windowKey, canonicalTable } from './glassnames.js';
import { paneFacing, splitByFacing, cabinMiddle, zRefOf, REVERSE_RAKE } from './screens.js';
import { applyPaneEdits, isNoEdit } from './paneedit.js';

export const PATCH_VERSION = 1;
// A side view extruded across the car, as the car models draw their bodies: `points` is the outline seen from the left,
// [[z, y], ...] (z along the car, y up; at least three), `width` across the car (centred on x = 0), `round` the rounding of
// its edges (grows the outline by that much all round). The editor's "Extrude" part: its points are edited as a list.
export class SideExtrudeGeometry extends THREE.ExtrudeGeometry {
  constructor(width = 0.5, round = 0.03, points = [[-0.5, 0], [0.5, 0], [0.5, 0.25], [0.15, 0.4], [-0.3, 0.4], [-0.5, 0.25]]) {
    const pts = (points || []).filter(q => Array.isArray(q) && q.length >= 2 && isFinite(q[0]) && isFinite(q[1]));
    const shape = new THREE.Shape((pts.length >= 3 ? pts : [[-0.5, 0], [0.5, 0], [0, 0.4]]).map(([z, y]) => new THREE.Vector2(z, y)));
    const r = Math.max(0, Math.min(round, width / 2 - 0.001));
    super(shape, { depth: Math.max(0.002, width - 2 * r), curveSegments: 8, bevelEnabled: r > 0, bevelThickness: r, bevelSize: r, bevelSegments: 1 });
    this.rotateY(-Math.PI / 2);
    this.translate(width / 2 - r, 0, 0);
    this.type = 'SideExtrudeGeometry';
    this.parameters = { width, round, points: pts.map(q => [q[0], q[1]]) };
  }
}
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
  SideExtrudeGeometry: ['width', 'round', 'points'],
  WedgeGeometry: ['width', 'height', 'depth', 'topWidth', 'topDepth', 'topShift'],
};
export const ADDABLE = {
  box: { kind: 'BoxGeometry', params: { width: 0.4, height: 0.3, depth: 0.4, widthSegments: 1, heightSegments: 1, depthSegments: 1 } },
  cylinder: { kind: 'CylinderGeometry', params: { radiusTop: 0.15, radiusBottom: 0.15, height: 0.4, radialSegments: 12, heightSegments: 1, openEnded: false, thetaStart: 0, thetaLength: Math.PI * 2 } },
  sphere: { kind: 'SphereGeometry', params: { radius: 0.2, widthSegments: 12, heightSegments: 8, phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI } },
  extrude: { kind: 'SideExtrudeGeometry', params: { width: 0.5, round: 0.03, points: [[-0.5, 0], [0.5, 0], [0.5, 0.25], [0.15, 0.4], [-0.3, 0.4], [-0.5, 0.25]] } },
  wedge: { kind: 'WedgeGeometry', params: { width: 0.4, height: 0.3, depth: 0.6, topWidth: 0.4, topDepth: 0, topShift: 0.3 } },
  cone: { kind: 'ConeGeometry', params: { radius: 0.2, height: 0.4, radialSegments: 12, heightSegments: 1, openEnded: false, thetaStart: 0, thetaLength: Math.PI * 2 } },
};
export const makeGeometry = (kind, params) => {
  const keys = PRIMITIVES[kind];
  const Ctor = kind === 'WedgeGeometry' ? WedgeGeometry : kind === 'SideExtrudeGeometry' ? SideExtrudeGeometry : THREE[kind];
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
  const go = (node, path) => node.children.forEach((child, i) => { if (child.userData.crackOverlay) return; const p = path ? path + '.' + i : String(i); fn(child, p); go(child, p); }); // (the cracked glass, render/cracks.js: appended last, never a part)
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
const guessRole = (node, box, carBox, paint = null) => {
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const cs = carBox.getSize(new THREE.Vector3());
  if (!node.isMesh) return node.children.length ? 'group' : 'empty';
  if (isWindowNode(node)) return WINDOW_ROLE; // (named or marked a window, in either spelling, or cabinGlass's panes)
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
  if (mat.transparent && mat.opacity < 0.95) return WINDOW_ROLE;
  if (col.l < 0.32 && col.h > 0.5 && col.h < 0.72 && col.s > 0.18 && !(paint && mat.color && (mat === paint || mat.color.equals(paint.color)))) return WINDOW_ROLE; // (by colour: never the body's own paint, as render/dents.js)
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
  const parts = [], nodes = new Map(), ids = new Map(), panes = new Map(); // (panes: a window part's id -> its panes)
  walk(root, (node, path) => {
    const box = boxes.get(node) || groupBox(node);
    const hook = hooks.get(node);
    const role = node.userData.patchRole || (hook ? hook.replace(/\[\d+\]$/, '') : guessRole(node, box, carBox.isEmpty() ? box : carBox, firstMat(root.userData.body?.isMesh ? root.userData.body : {})));
    const mat = node.isMesh ? firstMat(node) : null;
    const geo = node.isMesh ? node.geometry : null;
    const row = {
      id: node.userData.patchId || node.userData.patchPath || path, path, sig: node.userData.patchSig || sigOf(node), type: node.isMesh ? 'mesh' : node.isGroup ? 'group' : node.type.toLowerCase(),
      name: node.name || hook || '', role, hook: hook || null,
      kind: geo ? geo.type : null,
      params: geo?.parameters && PRIMITIVES[geo.type] ? JSON.parse(JSON.stringify(geo.parameters)) : null,
      editable: !!(geo && pristine(geo)),
      verts: geo?.attributes.position?.count || 0, tris: triangles(node),
      color: mat?.color ? hex(mat.color) : null, emissive: mat?.emissive ? hex(mat.emissive) : null,
      opacity: mat ? mat.opacity : null, transparent: mat ? !!mat.transparent : null, material: mat?.type || null,
      position: node.position.toArray().map(r3), rotation: [node.rotation.x, node.rotation.y, node.rotation.z].map(r3), scale: node.scale.toArray().map(r3),
      visible: node.visible, parent: path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : '',
      children: node.children.length, added: !!node.userData.patchId,
      panes: null, window: false, // (a window part: its panes' names, below)
      box: box.isEmpty() ? null : [...box.min.toArray(), ...box.max.toArray()].map(r3),
    };
    row.parent = node.parent === root ? '' : ids.get(node.parent) ?? row.parent; // (by the ids the patch uses)
    if (geo && (isWindowRole(role) || isGlassWord(row.name) || isWindowNode(node))) { // (a window, whichever word says so)
      row.window = true;
      const ps = windowPanes(node, root, carBox.isEmpty() ? box : carBox);
      panes.set(row.id, ps);
      row.panes = ps.map(q => q.name);
    }
    ids.set(node, row.id);
    parts.push(row);
    nodes.set(row.id, node);
  });
  faceHandPanes(panes, nodes, root, carBox);
  nameHandPanes(panes);
  for (const row of parts) if (panes.has(row.id)) row.panes = panes.get(row.id).map(q => q.name);
  return { parts, nodes, base: modelSignature(root), panes };
};
// a window part's row: the editor's test (cabinGlass glass, a hand-built window, a part a patch named or gave the role 'glass' or 'window')
export const isWindowPart = (row) => !!row && (row.window || isWindowRole(row.role) || isGlassWord(row.name) || isGlassWord(row.hook));

// ---- a window part's PANES -------------------------------------------------------------------------------------------------------
// cabinGlass's (geometry.userData.panes: named, each with its edges, render/ideaModelsDkit.js), else the hand-built glass's separate panels:
// the triangles joined by shared corners (to 0.1 mm), each a run of vertices { name, kind: 'hand', side, start, count } (side +1 the car's
// left (+x), -1 its right, 0 across). A mesh whose panels are not runs of vertices (an indexed geometry shared out of order) is one pane.
// Named from where they stand by nameHandPanes, once every window part of the model is known.
export const windowPanes = (node, root, carBox) => {
  const geo = node.geometry;
  if (geo?.userData?.panes) return geo.userData.panes;
  const pos = geo?.attributes?.position;
  if (!pos || !pos.count) return [];
  root.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(node.matrixWorld);
  const idx = geo.index ? geo.index.array : null, tris = Math.floor((idx ? idx.length : pos.count) / 3);
  // weld by position, join the corners of each triangle (union-find)
  const weld = new Map(), up = new Int32Array(pos.count), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4); up[i] = weld.has(k) ? weld.get(k) : i; if (!weld.has(k)) weld.set(k, i); }
  const top = (i) => { while (up[i] !== i) { up[i] = up[up[i]]; i = up[i]; } return i; };
  const at = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
  for (let t = 0; t < tris; t++) { const a = top(at(t, 0)), b = top(at(t, 1)), c = top(at(t, 2)); up[b] = a; up[top(c)] = a; }
  const groups = new Map();
  for (let t = 0; t < tris; t++) { const r = top(at(t, 0)); if (!groups.has(r)) groups.set(r, { lo: Infinity, hi: -1, verts: new Set() }); const g = groups.get(r); for (let k = 0; k < 3; k++) { const i = at(t, k); g.verts.add(i); g.lo = Math.min(g.lo, i); g.hi = Math.max(g.hi, i); } }
  let list = [...groups.values()].sort((a, b) => a.lo - b.lo);
  const runs = list.every((g, i) => g.hi - g.lo + 1 === g.verts.size && (!i || g.lo > list[i - 1].hi)); // (each panel its own run of vertices)
  if (!runs || list.length > 40) list = [{ lo: 0, hi: pos.count - 1, verts: null }];
  const cz = (carBox.min.z + carBox.max.z) / 2;
  return list.map((g) => {
    const b = new THREE.Box3(), n = new THREE.Vector3(), p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let i = g.lo; i <= g.hi; i++) b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(toModel));
    for (let t = 0; t < tris; t++) { if (at(t, 0) < g.lo || at(t, 0) > g.hi) continue; for (let k = 0; k < 3; k++) p[k].fromBufferAttribute(pos, at(t, k)).applyMatrix4(toModel); const c = e1.subVectors(p[1], p[0]).cross(e2.subVectors(p[2], p[0])); n.x += Math.abs(c.x); n.y += Math.abs(c.y); n.z += Math.abs(c.z); }
    const side = b.min.x > 0.01 ? 1 : b.max.x < -0.01 ? -1 : 0, c = b.getCenter(new THREE.Vector3());
    const sz = b.getSize(new THREE.Vector3()), band = !side && sz.z > sz.x && sz.x > (carBox.max.x - carBox.min.x) * 0.8; // (a block through the car showing on both flanks: a bus's window band)
    const face = side ? 'side' : band ? 'band' : n.y > 2.5 * Math.max(n.z, n.x) ? 'roof' : c.z >= cz ? 'front' : 'rear'; // (a raked screen is a screen: roof only under about 20 degrees)
    return { name: '', kind: 'hand', side, face, z: c.z, start: g.lo, count: g.hi - g.lo + 1 };
  });
};
// WHICH WAY EACH HAND-BUILT PANE FACES (the owner, 16-Oct: "Are all front screens tagged properly on all cars?"; scripts/windscreen-audit.mjs):
// measured from its own triangles (render/screens.js paneFacing: each one's normal turned out of the cabin, the cabin's middle the glass's own), not
// from where its box stands: so a screen behind the car's middle (a cab-forward lorry's, a mid-engined car's) is still the windscreen, a rear
// window ahead of it still the rear window, half of a split screen (all on one flank) a screen and not a side window, and a steeply raked one
// a screen (a roof window is within about 14 degrees of flat). A pane that faces several ways (a glasshouse box: its screen, rear window, flanks
// and top in one; a screen wrapped into its side windows) is cut into the runs of vertices that each face one way where its vertices allow
// (splitByFacing), so the windscreen of a box-built car is a pane of its own. What cannot be cut keeps one pane, named by its biggest share.
// A model's own tag wins: `userData.window` ('windscreen' / 'rear') on a glass mesh that is that one window.
const faceHandPanes = (panes, nodes, root, carBox) => {
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), all = [];
  for (const [id, list] of panes) {
    const node = nodes.get(id);
    if (!node?.geometry) continue;
    const toModel = new THREE.Matrix4().multiplyMatrices(inv, node.matrixWorld);
    for (const q of list) all.push({ node, toModel, pane: q.kind === 'hand' ? q : { start: q.start, count: q.count }, hand: q.kind === 'hand', list });
  }
  if (!all.some(e => e.hand)) return;
  const zCar = cabinMiddle(all, carBox), zOf = new Map();
  for (const e of all) {
    if (!e.hand) continue;
    if (!zOf.has(e.node)) zOf.set(e.node, zRefOf(all, e.node, zCar));
    const zRef = zOf.get(e.node);
    const q = e.pane, tag = e.node.userData.window;
    const f = paneFacing(e.node, e.toModel, q, zRef);
    let face = f.face;
    if (face === 'mixed') {
      const runs = splitByFacing(e.node, e.toModel, q, zRef);
      if (runs && runs.length <= 16) { // (more than 16: a rounded shape, a sphere's facets, not a box: left whole) // (the pane replaced by its runs, in place in the part's list)
        const at = e.list.indexOf(q);
        e.list.splice(at, 1, ...runs.map((r) => {
          const g = paneFacing(e.node, e.toModel, r, zRef), flank = g.box.min.x > 0.01 ? 1 : g.box.max.x < -0.01 ? -1 : 0;
          if (r.face === 'front' && g.centre.z < zRef - REVERSE_RAKE) r.face = 'rear';
          return { name: '', kind: 'hand', side: r.face === 'side' ? r.side : r.face === 'front' || r.face === 'rear' ? flank : 0, face: r.face, z: g.centre.z, area: g.area, start: r.start, count: r.count, middle: r.middle };
        }));
        continue;
      }
      const sh = f.share, big = ['front', 'rear', 'side'].sort((a, b) => sh[b] - sh[a])[0];
      face = big === 'side' ? (q.side ? 'side' : 'band') : big;
    } else if (face === 'side' && !q.side) face = 'band'; // (a block through the car showing on both flanks: a bus's window band)
    else if (face === 'front' && f.centre.z < zRef - REVERSE_RAKE) face = 'rear'; // (a reverse-rake rear window: render/screens.js screenShares)
    if (tag === 'windscreen' || tag === 'front') face = 'front';
    else if (tag === 'rear' || tag === 'rear window') face = 'rear';
    q.face = face;
    q.z = f.centre.z;
    q.area = f.area;
    if (face === 'front' || face === 'rear') q.side = f.box.min.x > 0.01 ? 1 : f.box.max.x < -0.01 ? -1 : 0; // (half of a split screen keeps its flank)
  }
};
// the hand-built panes' names, over the whole model (so the two flanks number alike and a pane's twin across the car has its name)
const nameHandPanes = (panes) => {
  const hand = [...panes.values()].flat().filter(q => q.kind === 'hand');
  const used = new Map(), named = (base) => { const n = (used.get(base) || 0) + 1; used.set(base, n); return n === 1 ? base : base + ' ' + n; };
  for (const s of [1, -1]) {
    const flank = hand.filter(q => q.face === 'side' && q.side === s).sort((a, b) => b.z - a.z); // (from the front)
    flank.forEach((q, i) => { q.name = (flank.length === 1 ? 'side window' : 'window ' + (i + 1)) + (s > 0 ? ' L' : ' R'); });
  }
  const base = (q) => (q.face === 'front' ? 'windscreen' : q.face === 'rear' ? 'rear window' : q.face === 'band' ? 'side windows' : q.face === 'floor' ? 'window underside' : 'roof window');
  // (a split screen's halves, each on one flank: 'windscreen L' / 'windscreen R', numbered alike on both flanks)
  for (const s of [1, -1]) {
    const counts = new Map();
    for (const q of hand.filter(x => x.face !== 'side' && x.side === s && (x.face === 'front' || x.face === 'rear')).sort((a, b) => (b.area ?? 0) - (a.area ?? 0) || b.z - a.z)) {
      const n = (counts.get(base(q)) || 0) + 1; counts.set(base(q), n);
      q.name = base(q) + (n > 1 ? ' ' + n : '') + (s > 0 ? ' L' : ' R');
    }
  }
  // (the biggest of each kind takes the plain name: 'windscreen' is the car's windscreen, 'windscreen 2' a smaller one: a second deck's, a box's
  // face hidden behind it)
  for (const q of hand.filter(x => x.face !== 'side' && !((x.face === 'front' || x.face === 'rear') && x.side)).sort((a, b) => (b.area ?? 0) - (a.area ?? 0) || b.z - a.z)) q.name = named(base(q));
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
  // (a model built with shape or window edits has parts whose geometry is not the code's own: at its path, a part of the same kind still answers)
  const rebuilt = !!(root.userData.shapeEdits || root.userData.glassEdits), kind = (sig) => String(sig).split(':').slice(0, 2).join(':');
  walk(root, (node, path) => {
    byPath.set(path, node);
    const sig = sigOf(node);
    bySig.set(sig, bySig.has(sig) ? null : node); // (null: more than one: not a unique match)
  });
  return (id, sig) => {
    const at = byPath.get(id);
    if (at && (!sig || sigOf(at) === sig || (rebuilt && kind(sigOf(at)) === kind(sig)))) return at;
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
  // (a model built with shape or window edits is not the code's own build: there is no base to compare it with)
  if (patch.base && patch.base !== base && !root.userData.shapeEdits && !root.userData.glassEdits) { out.stale = true; warn('the model\'s code changed since this patch was made (base ' + patch.base + ', now ' + base + ')'); }
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
  // ONE PANE moved, turned or sized on its own (render/paneedit.js: the `panes` table), after the ops, on the part's own geometry
  if (patch.panes && typeof patch.panes === 'object') applyPaneEdits(root, patch.panes, ctx.find, out);
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
  // the glass edits: read as the model was built (render/ideaModels.js makeIdeaModel, userData.glassEdits); an id no window answers to is stale
  if (glassTable(patch)) { // (the table called `glass` or `windows`, its ids in any spelling: render/glassnames.js)
    const g = root.userData.glassEdits;
    if (!g) warn('glass edits: this model is not built with cabinGlass, so its window edges cannot be set');
    else for (const id of g.unused) { out.unmatched.push('glass:' + id); warn('glass edits: no window called "' + id + '" (' + (g.used.length ? 'the windows are ' + g.used.join(', ') : 'none used') + ')'); }
  }
  // the shape edits: read as the model was built (render/shapeedits.js carShapes, userData.shapeEdits)
  if (patch.shapes && typeof patch.shapes === 'object' && Object.keys(patch.shapes).length && root.userData.shapeEdits) {
    for (const id of root.userData.shapeEdits.unused) { out.unmatched.push('shape:' + id); warn('shape edits: no outline "' + id + '" in this build'); }
  }
  root.userData.patched = { car: patch.car, ops: patch.ops.length, unmatched: out.unmatched.length };
  return out;
};

// ---- MIRROR: which parts stand across the car from each other --------------------------------------------------
// symmetryOf(root) -> Map id -> { partner: id | null, self: bool }: a part's PARTNER is the other part whose set of vertices (in model space,
// to the millimetre, with its colour) is its own mirrored across x; a part is SELF-symmetric when its mirror is itself (a body, a merged pair of lamps).
// By the vertex sets, so it finds the pairs however the code made them (two meshes, a mirrored geometry, a turned copy). A group counts the
// meshes under it. An asymmetric part has neither.
export const symmetryOf = (root, { tol = 0.001 } = {}) => {
  root.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  const q = (x) => (x < 0 ? -Math.round(-x / tol) : Math.round(x / tol)); // (rounded away from zero the same both sides of 0)
  const meshKeys = new Map(); // mesh -> [plain keys, mirrored keys] (unsorted)
  root.traverse((n) => {
    if (!n.isMesh || !n.geometry || n === root) return;
    m.multiplyMatrices(toModel, n.matrixWorld);
    const pos = n.geometry.attributes.position, plain = [], flip = [];
    const colour = [].concat(n.material || [])[0]?.color?.getHexString() || '';
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); const y = q(v.y), z = q(v.z), x = q(v.x); plain.push(x + ',' + y + ',' + z + ';' + colour); flip.push(-x + ',' + y + ',' + z + ';' + colour); }
    meshKeys.set(n, [plain, flip]);
  });
  const ids = new Map(); walk(root, (node, path) => ids.set(node, node.userData.patchId || node.userData.patchPath || path));
  const rows = [];
  walk(root, (node) => {
    const plain = [], flip = [];
    node.traverse((n) => { const k = meshKeys.get(n); if (k) { plain.push(...k[0]); flip.push(...k[1]); } });
    if (!plain.length) return;
    // (the SET of vertices: a mirrored box has the same corners, but its triangles' diagonals use them a different number of times)
    rows.push({ node, id: ids.get(node), plain: fnv([...new Set(plain)].sort().join('|')), flip: fnv([...new Set(flip)].sort().join('|')), count: plain.length });
  });
  const byPlain = new Map();
  for (const r of rows) { if (!byPlain.has(r.plain)) byPlain.set(r.plain, []); byPlain.get(r.plain).push(r); }
  const related = (a, b) => { for (let p = a; p; p = p.parent) if (p === b) return true; for (let p = b; p; p = p.parent) if (p === a) return true; return false; };
  const out = new Map();
  for (const r of rows) {
    const self = r.plain === r.flip;
    const partner = self ? null : (byPlain.get(r.flip) || []).find(o => o !== r && !related(o.node, r.node)) || null;
    out.set(r.id, { partner: partner ? partner.id : null, self });
  }
  return out;
};
// the partner's place when `node` is edited: the same change, mirrored across the car. `was` are the rows (position, rotation, scale) the two
// parts had before the edit (extractParts); `set` is the edit to `node` (position / rotation / scale, any of them). -> { position, rotation, scale }
// for the partner: its old world matrix carried by the mirror image of the part's own change (so a partner the code placed by turning, not
// mirroring, keeps its own way of standing).
export const mirroredTransform = (root, node, was, partner, partnerWas, set) => {
  root.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = (row, over) => new THREE.Matrix4().compose(new THREE.Vector3().fromArray(over?.position || row.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(over?.rotation || row.rotation))), new THREE.Vector3().fromArray(over?.scale || row.scale));
  const Pa = new THREE.Matrix4().multiplyMatrices(toModel, node.parent.matrixWorld), Pb = new THREE.Matrix4().multiplyMatrices(toModel, partner.parent.matrixWorld);
  const Wa0 = Pa.clone().multiply(local(was)), Wa1 = Pa.clone().multiply(local(was, set)), Wb0 = Pb.clone().multiply(local(partnerWas));
  const M = new THREE.Matrix4().makeScale(-1, 1, 1);
  const delta = Wa1.clone().multiply(Wa0.clone().invert()); // (the change, in model space)
  const Wb1 = M.clone().multiply(delta).multiply(M).multiply(Wb0);
  const Lb = Pb.clone().invert().multiply(Wb1);
  const p = new THREE.Vector3(), qt = new THREE.Quaternion(), sc = new THREE.Vector3();
  Lb.decompose(p, qt, sc);
  const e = new THREE.Euler().setFromQuaternion(qt);
  const out = {};
  if (set.position) out.position = p.toArray().map(r3);
  if (set.rotation) out.rotation = [e.x, e.y, e.z].map(r3);
  if (set.scale) out.scale = sc.toArray().map(r3);
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
  const add = { id: nextId(p, 'n'), kind: spec.kind, params: JSON.parse(JSON.stringify(spec.params)), color: at.color || '#9aa3b2', parent: at.parent || '', position: at.position || [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], name: what, role: 'part' };
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
// the glass edits table: `edges` for the window `id` (a side window's [z, y] polygon, or a screen's { foot, top }); null takes it out.
// Any spelling of the id ('door glass', 'door window') is the same window: every spelling of it goes, and the edit is kept under the
// canonical one (render/glassnames.js windowKey); a table called `windows` is folded into `glass`.
export const withGlass = (patch, id, edges) => {
  const p = clonePatch(patch);
  p.glass = { ...(glassTable(p) || {}) };
  delete p.windows;
  const key = windowKey(id);
  for (const k of Object.keys(p.glass)) if (windowKey(k) === key) delete p.glass[k];
  if (edges != null) p.glass[key] = JSON.parse(JSON.stringify(edges));
  if (!Object.keys(p.glass).length) delete p.glass;
  return p;
};
// one window pane's edit (render/paneedit.js): `edit` { move, turn, size, contour? } for the pane `pane` ({ name, start, count }: as built, paneAsBuilt) of `part`; null (or
// an edit that does nothing) takes it out
export const withPane = (patch, part, pane, edit) => {
  const p = clonePatch(patch), key = part.id + '#' + pane.name;
  p.panes = { ...(p.panes || {}) };
  if (!edit || isNoEdit(edit)) delete p.panes[key];
  else p.panes[key] = { id: part.id, sig: part.sig, pane: pane.name, start: pane.start, count: pane.count, move: edit.move || [0, 0, 0], turn: edit.turn || [0, 0, 0], size: edit.size || [1, 1], ...(edit.contour?.length ? { v: 2, contour: edit.contour } : {}) }; // (v 2: a contour, render/paneedit.js; an entry without one reads as before)
  if (!Object.keys(p.panes).length) delete p.panes;
  return p;
};
// the patch without ops that do nothing (an empty set)
export const tidyPatch = (patch) => {
  const p = clonePatch(patch);
  p.ops = p.ops.filter(op => op.add || op.delete || (op.set && Object.keys(op.set).length));
  p.evil = (p.evil || []).filter(op => op.set && Object.keys(op.set).length);
  const g = glassTable(p); // (one table, called `glass`, every id spelt the canonical way: the same windows, render/glassnames.js)
  delete p.windows;
  if (g) p.glass = canonicalTable(g); else delete p.glass;
  if (p.shapes && (typeof p.shapes !== 'object' || !Object.keys(p.shapes).length)) delete p.shapes;
  if (p.panes && (typeof p.panes !== 'object' || !Object.keys(p.panes).length)) delete p.panes;
  return p;
};
