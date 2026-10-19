// ---- car ideas' models, batch D2: the Flatbed Truck and the Utility Moke ---------------------------------------------
// Two vehicles drawn as ideas (ideasBatchD2.js): a light flatbed lorry (after the Bedford TK, 1960: a short bonnet cab on
// a bare planked deck with low side boards, stakes and a lumpy tarped load) and a small open utility car (after the Mini
// Moke, 1964: a flat tub with a flat bonnet, a folding windscreen frame, two bare seats and a rear bed; no doors, no roof,
// NO driver). Built as the approved Junker and Commuter are: bodies from extrusions of their side views (few bevel
// segments), dark glass laid a few mm proud, parts that share a material and never move merged into one mesh, plain
// chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them), paint shaded darker
// low down (vertex colours). No textures (14-Oct, the owner: not everything needs one): flat colours only. No image
// files, no panel lines. Each builder takes the idea's entry and returns a group, front
// facing local +z, with userData.body, userData.animate and userData.livery. Spread into IDEA_MODELS by ideaModels.js. State-free.
import * as THREE from 'three';
import { shapesLive } from './shapeedits.js';
import { cabinGlass, mergeFlat, glassKey } from './ideaModelsDkit.js'; // (mergeFlat: keeps the glass panes' ranges on the merged geometry, for the model editor)

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => keep(new THREE.MeshLambertMaterial({ color }));
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
const TYRE = lambert(0x161616), HUB = lambert(0xb4b8be), TRIM = lambert(0x24262a), CHROME = lambert(0xc8cbd0);
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a);
const WOOD = lambert(0xa5804e), TARP = lambert(0x4f5c3a), CANVAS = lambert(0xb8a77a), CAN = lambert(0x5a6a34), DECK = lambert(0x6b5036);

const SHARED = new Map();
const shared = (key, make) => {
  if (shapesLive()) return make(); // (a model built with shape edits, or recorded by the model editor, caches nothing: render/shapeedits.js)
  key = glassKey(key); // (a build with window edits caches under its own keys: ideaModelsDkit.js withGlassEdits)
  if (!SHARED.has(key)) { const geo = make(); geo.userData.shared = true; SHARED.set(key, geo); }
  return SHARED.get(key);
};
const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const plain = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};
const merge = (geos) => mergeFlat(geos.map(plain));
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
const dsc = (r, depth, x, y, z, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).translate(x, y, z);
const blob = (sx, sy, sz, x, y, z, seg = [10, 6]) => new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz).translate(x, y, z);

// ---- bodies: an extrusion of the side view ([z, y] points; ['arc', z, y, r] a wheel arch from rear foot to front) --------
const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true);
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);
const extrudeSide = (outline, w, bevel, taper = null, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: 1, curveSegments: 5,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2 - across, 0, 0);
  if (taper) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, narrowAt(pos.getX(i), pos.getY(i), taper));
    geo.computeVertexNormals();
  }
  return geo;
};
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
const slopeGlass = ([z0, y0], [z1, y1], hx0, hx1, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (z, y, hx, s) => [s * hx, y + ny * lift, z + nz * lift];
  return panel([at(z0, y0, hx0, -1), at(z0, y0, hx0, 1), at(z1, y1, hx1, 1), at(z1, y1, hx1, -1)]);
};
const shadeBy = (geo, fn) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) col.set(fn(pos.getY(i)), i * 3);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
const low = (y0, y1, c) => (y) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return c.map(v => v + (1 - v) * t); };
const wheel = (parent, key, R, width, x, z, seg = 14) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, width + 0.02, 10).rotateZ(Math.PI / 2)), HUB, x, R, z);
};

export const IDEA_MODELS_BATCH_D2 = {
  // ---- the Flatbed Truck (after the Bedford TK, 1960) ----------------------------------------------------------------
  // A short bonnet cab with a flat grille (chrome bars on a dark panel), round lamps in chrome rims either side, a black
  // bumper, a near-upright windscreen and a box roof; behind it a bare planked deck on chassis rails, a headboard, low
  // side boards held by stakes, and a lumpy load: two wooden crates and a tarpaulin mound. Big chunky wheels.
  flatbed: (car) => {
    const group = new THREE.Group();
    const k = 'flatbed';
    const R = 0.48, TW = 0.3, WX = car.hw - TW / 2, AF = 1.35, AR = -1.35, AY = R;
    const BEV = 0.05, BW = 1.64, HALF = BW / 2, NOSE = 2.0, CB = 0.05, ROOF = 2.2, BELT = 1.34;
    const TAPER = [1.25, ROOF, 0.08];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [1.45, BELT], WST = [0.954, ROOF], TH = [CB, 1.88]; // (TH: a point on the straight cab back, the back window's foot)
    const outline = [
      [NOSE, AY], [NOSE, 1.2], [NOSE - 0.05, BELT],
      WSF, WST,
      [CB, ROOF], TH, [CB, AY],
    ];
    const FZ = NOSE + BEV; // (the cab's front face)
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 0.07)]), low(0.5, 1.2, [0.64, 0.58, 0.5]))), paint);
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): one door window a side (a truck cab has no
    // quarter window), the windscreen with its foot at the bonnet's end (second call), and the back window above the headboard, narrower than the cab
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(TH), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, belt: 1.52, sideInset: 0.22 }), screen = cabinGlass(outline, { ...ARGS, belt: BELT + 0.03, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // black: the grille panel behind its bars, the bumpers, chassis rails and axles, the mirrors' arms and heads
    parts(group, k + 'black', TRIM, () => [
      bx(0.9, 0.5, 0.03, 0, 0.9, FZ),
      bx(1.98, 0.2, 0.12, 0, 0.42, FZ + 0.04),
      bx(2.0, 0.28, 0.12, 0, 0.88, -2.4),
      ...[-1, 1].map(s => bx(0.12, 0.3, 4.3, s * 0.42, 0.88, -0.2)),
      bx(1.2, 0.12, 0.14, 0, AY, AR), bx(1.2, 0.12, 0.14, 0, AY, AF),
      ...[-1, 1].flatMap(s => [bx(0.16, 0.03, 0.03, s * 0.97, 1.7, 1.1), bx(0.05, 0.32, 0.16, s * 1.04, 1.7, 1.1)]),
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      ...[0.75, 0.9, 1.05].map(y => bx(0.86, 0.045, 0.03, 0, y, FZ + 0.025)),
      ...[-1, 1].map(s => dsc(0.17, 0.03, s * 0.64, 1.0, FZ + 0.01, 14)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.13, 0.03, s * 0.64, 1.0, FZ + 0.02, 14)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.16, 0.07, 0.03, s * 0.64, 0.74, FZ + 0.005)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.2, 0.12, 0.03, s * 0.8, 1.04, -2.37)).concat([-1, 1].map(s => bx(0.2, 0.06, 0.03, s * 0.8, 0.8, -2.47))));
    // the deck: boards on top (a flat wood colour), its edge below, the headboard, side boards, tail board, stakes
    place(group, shared(k + 'deck', () => merge([bx(1.86, 0.12, 2.4, 0, 1.04, -1.15)])), DECK);
    const planked = new THREE.MeshLambertMaterial({ color: 0x96744a });
    planked.userData.shared = true;
    place(group, shared(k + 'planks', () => new THREE.PlaneGeometry(1.8, 2.34).rotateX(-Math.PI / 2)), planked, 0, 1.105, -1.15);
    parts(group, k + 'wood', WOOD, () => [
      bx(1.851, 0.78, 0.09, 0, 1.43, -0.04),                                            // (head and tail boards 4.5 mm in from the deck's sides)
      ...[-1, 1].map(s => bx(0.05, 0.3, 2.34, s * 0.905, 1.27, -1.15)),
      bx(1.851, 0.3, 0.05, 0, 1.27, -2.35),
      ...[-1, 1].flatMap(s => [-0.4, -1.2, -2.3].map(z => bx(0.07, 0.56, 0.08, s * 0.945, 1.38, z))),
    ]);
    // the load: two crates and the tarpaulin mound (tagged userData.prop = 'cargo': a chosen cargo prop hides them, render/propcosmetic.js)
    parts(group, k + 'crates', WOOD, () => [bx(0.8, 0.5, 0.7, -0.15, 1.35, -0.5), bx(0.6, 0.4, 0.58, 0.1, 1.8, -0.5, 0, 0.18)]).userData.prop = 'cargo';
    parts(group, k + 'tarp', TARP, () => [blob(0.74, 0.4, 0.8, 0.02, 1.3, -1.55), blob(0.5, 0.3, 0.5, -0.3, 1.34, -0.95), blob(0.4, 0.3, 0.45, 0.4, 1.34, -1.05)]).userData.prop = 'cargo';
    // fuel tank under the deck (one side) and the wheels
    parts(group, k + 'tank', lambert(0x6a6e74), () => [new THREE.CylinderGeometry(0.2, 0.2, 0.9, 10).rotateX(Math.PI / 2).translate(0.6, 0.75, -0.2)]);
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Utility Moke (after the Mini Moke, 1964) ------------------------------------------------------------------
  // A tiny flat open slab on chunky wheels, drawn in two tones: body paint with cream wing caps, seats and rear bench.
  // A flat bonnet with a dark slatted grille on a vertical face and two round lamps standing proud on top of it, low
  // straight sides (no wheel wells: the wheels stand against them under flat cream caps), a thin upright windscreen
  // frame, a bench seat (no driver; a steering wheel), a rear bed with a crate, a jerrycan and a canvas roll, and a flat
  // tailgate with the spare wheel on it. Paint darker low down.
  moke: (car) => {
    const group = new THREE.Group();
    const k = 'moke';
    const R = 0.3, TW = 0.22, WX = car.hw - TW / 2, AF = 0.95, AR = -0.95;
    const BEV = 0.05, HALF = 0.62, NOSE = 1.5, TAILZ = -1.5, CZ = 0.45, SIDE = 0.76, FLOOR = 0.3;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const FZ = NOSE + BEV, BZ = TAILZ - 0.03;
    const bonnet = [
      [NOSE, FLOOR], [NOSE, 0.72], ...curve([NOSE, 0.72], [NOSE, 0.79], [NOSE - 0.03, 0.82], [NOSE - 0.1, 0.82], 3),
      [CZ, 0.82], [CZ, FLOOR],
    ];
    const sideOutline = [[CZ, FLOOR], [CZ, SIDE], [TAILZ, SIDE], [TAILZ, FLOOR]];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(bonnet, 2 * HALF, BEV, null, 0.05),
      ...[-1, 1].map(s => extrudeSide(sideOutline, 0.08, 0.02, null, 0.02).translate(s * (HALF - 0.04), 0, 0)),
      bx(2 * HALF, 0.46, 0.07, 0, 0.55, TAILZ + 0.035),
    ]), low(0.3, 0.8, [0.66, 0.6, 0.52]))), paint);
    // cream: a flat cap over each wheel, the bench seat, the rear bench's cushion
    const cream = lambert(0xe9e2cc);
    parts(group, k + 'cream', cream, () => [
      ...[-1, 1].flatMap(s => [AF, AR].map(z => bx(0.28, 0.05, 0.74, s * (car.hw - 0.14), 0.67, z))),
      bx(1.02, 0.13, 0.5, 0, 0.43, -0.05), bx(1.02, 0.42, 0.1, 0, 0.68, -0.36, -0.15),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(2 * HALF - 0.08, 0.06, 1.95, 0, 0.3, -0.5),              // the floor of the tub
      bx(0.64, 0.32, 0.03, 0, 0.55, FZ),                           // the grille's dark face
      bx(0.96, 0.05, 0.06, 0, 0.88, 0.38), bx(0.96, 0.05, 0.05, 0, 1.34, 0.3), // the windscreen frame: foot, top
      ...[-1, 1].map(s => bx(0.04, 0.48, 0.04, s * 0.48, 1.1, 0.34, -0.15)),    // and the two upright posts
      new THREE.TorusGeometry(0.14, 0.02, 5, 12).rotateX(-1.1).translate(0.3, 0.88, 0.2), // the steering wheel
      new THREE.CylinderGeometry(0.02, 0.02, 0.26, 6).rotateX(-0.9).translate(0.3, 0.77, 0.3),
    ]);
    parts(group, k + 'glass', GLASS, () => [slopeGlass([0.36, 0.92], [0.31, 1.31], 0.45, 0.45, 0.006)]);
    parts(group, k + 'chrome', CHROME, () => [
      ...[0.47, 0.54, 0.61, 0.68].map(y => bx(0.58, 0.035, 0.03, 0, y, FZ + 0.02)), // the grille's slats
      bx(1.34, 0.07, 0.08, 0, 0.33, FZ + 0.03),                                       // front bumper
      bx(1.34, 0.07, 0.08, 0, 0.33, BZ - 0.03),                                       // rear bumper
      ...[-1, 1].map(s => dsc(0.125, 0.06, s * 0.46, 0.99, 1.27, 14)),                 // the lamps' rims, on top of the bonnet
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.1, 0.1, 0.11, s * 0.46, 0.99, 1.3, [12, 7])));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.03, s * 0.46, 0.43, FZ + 0.005)),
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.03, s * 0.5, 0.46, BZ - 0.006)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.12, 0.12, 0.03, s * 0.5, 0.6, BZ - 0.006)));
    // the rear bed's load: a crate, a jerrycan, a canvas roll across the tailgate end
    // (tagged userData.prop = 'cargo': a chosen cargo prop hides the load, render/propcosmetic.js)
    parts(group, k + 'crate', WOOD, () => [bx(0.5, 0.36, 0.5, -0.25, 0.51, -0.95), bx(0.32, 0.22, 0.32, 0.3, 0.44, -0.8, 0, 0.35)]).userData.prop = 'cargo';
    parts(group, k + 'can', CAN, () => [bx(0.2, 0.34, 0.12, 0.42, 0.5, -1.2)]).userData.prop = 'cargo';
    parts(group, k + 'roll', CANVAS, () => [new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8).rotateZ(Math.PI / 2).translate(0, 0.43, -1.36)]).userData.prop = 'cargo';
    // the spare wheel on the tailgate
    place(group, shared(k + 'sparetyre', () => new THREE.CylinderGeometry(0.27, 0.27, 0.13, 14).rotateX(Math.PI / 2)), TYRE, 0, 0.6, BZ - 0.06);
    place(group, shared(k + 'sparehub', () => new THREE.CylinderGeometry(0.14, 0.14, 0.15, 10).rotateX(Math.PI / 2)), HUB, 0, 0.6, BZ - 0.06);
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 14);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
