// ---- car ideas' models, batch D5: the Trophy Truck and the Armoured Limo ---------------------------------------------
// Two vehicles drawn as ideas (ideasBatchD5.js): a Baja desert-racing "trophy truck" (a long-travel race truck: a low
// fibreglass body between huge fenders over tall tyres, shock stubs standing up out of the bonnet and the tail, a roll
// cage over a small cab, a roof light bar, a spare on the tail) and an armoured limousine (a long black-tie saloon
// with thick slab sides, small deep windows, steel bumpers and sills, and big run-flat wheels). No figures, no weapons.
// Built as the approved Junker is (render/modelsOrig3.js; helpers kept here as copies, as ideaModelsTopupC.js does):
// each body an extrusion of its side view with its edges rounded, flat dark glass laid a few mm proud, parts that share
// a material and never move merged into one mesh, paint shaded darker low down (vertex colours), plain chunky wheels (a
// dark tyre, a plain hub disc: meshes of their own, so the showroom's suspension finds them). No textures (14-Oct, the
// owner: not everything needs one): flat colours, and a plain white disc for the Trophy Truck's roundel. No panel lines. Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_D5 into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { shapesLive } from './shapeedits.js';
import { cabinGlass, mergeFlat, glassKey } from './ideaModelsDkit.js'; // (mergeFlat: keeps the glass panes' ranges on the merged geometry, for the model editor)

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xb4b8be)), TRIM = keep(lambert(0x24262a)), CHROME = keep(lambert(0xc8cbd0));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a);

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
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};
const merge = (geos) => mergeFlat(geos.map(plain));
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);

const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel), turned `yaw` about the upright
const dsc = (r, depth, x, y, z, yaw = 0, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).rotateY(yaw).translate(x, y, z);
// ---- a body: an extrusion of its side view ([z, y] points; ['arc', z, y, r] a wheel arch from its rear foot over to its
// front), `w` wide across the car, its outline grown by `bevel` all round and rounded `across` deep over the sides
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
const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
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
// shade a geometry by height: `fn(y)` gives the multiplier (a vertex colour times the paint's)
const shadeBy = (geo, fn) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) col.set(fn(pos.getY(i), pos.getZ(i), pos.getX(i)), i * 3);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
const low = (y0, y1, c) => (y) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return c.map(v => v + (1 - v) * t); };

// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, width + 0.02, Math.round(seg * 0.75)).rotateZ(Math.PI / 2)), HUB, x, R, z);
};

// a tube (roll-cage bar, shock body) from point a to point b, open-ended
const tube = (a, b, r, seg = 8) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
  const geo = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  return geo.translate(m.x, m.y, m.z);
};
// a half-shell fender over a wheel: a half cylinder (axis across the car) of radius r, `w` wide, centred at x, y, z
const fender = (x, y, z, r, w) => new THREE.CylinderGeometry(r, r, w, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.88, 1.2).translate(x, y, z); // (flattened and lengthened, a wing over the wheel, not a barrel)
const SHOCK = keep(lambert(0xffcf1a)), STEEL = keep(lambert(0x5a5e66)), WHITE = keep(lambert(0xf4f1e8));

export const IDEA_MODELS_BATCH_D5 = {
  // ---- the Trophy Truck (a Baja desert racing truck) -----------------------------------------------------------------
  // A low fibreglass body, a long flat nose that rises to a short steep screen, a small cab under a roll cage with a
  // roof light bar, and a sloping tail deck with the spare standing on it. Huge half-shell fenders over tall tyres (the
  // tyres wider than the body), yellow shock stubs standing up out of the bonnet and the deck, an open dark nose with
  // two lamps. A white roundel disc on each door.
  trophytruck: (car) => {
    const group = new THREE.Group();
    const R = 0.56, TW = 0.38, AF = 1.55, AR = -1.45, WX = 0.96;
    const BEV = 0.05, ACROSS = 0.08, BW = 1.42, HALF = BW / 2;
    const NOSE = 2.7, TAILZ = -2.7;
    const k = 'tt';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true, side: THREE.DoubleSide });
    const TAPER = [1.1, 1.82, 0.18];
    const WSF = [0.95, 1.18], WST = [0.25, 1.78], RWF = [-1.24, 1.4]; // (RWF: a point on the rear slope, the rear window's foot)
    const outline = [
      [NOSE, 0.55], [NOSE, 0.9], [2.45, 1.0], WSF, WST, [-0.55, 1.82], [-1.0, 1.55], RWF, [-1.5, 1.24], [-2.55, 1.1], [TAILZ, 1.0], [TAILZ, 0.55],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => fender(s * WX, R, z, R + 0.12, 0.5))),
    ]), low(0.45, 1.1, [0.6, 0.53, 0.45]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, level tops): the one side window a side follows the raked
    // A-pillar, the roof and the rear slope; the raked screen's foot is the bonnet's end (second call, belt 1.21) and the rear window is the top
    // of the slope above the spare (its foot at 1.4, as before). One window a side: the cab is a bubble under the roll cage.
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.indexOf(WSF), to: outline.indexOf(RWF), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, belt: 1.3, sideInset: 0.14 }), screen = cabinGlass(outline, { ...ARGS, belt: WSF[1] + 0.03, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the roll cage (dark steel tube, 8-sided) and its roof light bar
    parts(group, k + 'cage', TRIM, () => [
      ...[-1, 1].flatMap(s => [
        tube([s * 0.52, 1.89, 0.2], [s * 0.6, 1.2, 1.0], 0.035),   // A-pillar bar, down to the cowl
        tube([s * 0.52, 1.89, 0.2], [s * 0.52, 1.89, -0.6], 0.035), // roof side bar
        tube([s * 0.52, 1.89, -0.6], [s * 0.5, 1.24, -1.5], 0.035), // rear stay down to the deck
        tube([s * 0.75, 1.27, 0.75], [s * 0.75, 1.27, -0.95], 0.03), // door bar along the flank
      ]),
      tube([-0.52, 1.89, 0.2], [0.52, 1.89, 0.2], 0.035), tube([-0.52, 1.89, -0.6], [0.52, 1.89, -0.6], 0.035),
    ]);
    // the roof light bar and its lamps: an ornament, tagged userData.prop = 'roof' (a chosen roof prop hides it, render/propcosmetic.js)
    parts(group, k + 'bar', TRIM, () => [bx(0.96, 0.08, 0.1, 0, 1.97, 0.24)]).userData.prop = 'roof';
    parts(group, k + 'barlamp', LAMP, () => [-1.5, -0.5, 0.5, 1.5].map(i => dsc(0.05, 0.03, i * 0.2, 1.97, 0.3, 0, 10))).userData.prop = 'roof';
    // the nose: an open dark grille mouth and two lamps, a steel skid bar, the tail panel's skid
    parts(group, k + 'black', TRIM, () => [
      bx(0.86, 0.2, 0.04, 0, 0.74, FZ), bx(1.2, 0.1, 0.16, 0, 0.5, FZ + 0.02), bx(1.1, 0.1, 0.14, 0, 0.5, BZ - 0.02),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.1, 0.03, s * 0.52, 0.8, FZ + 0.01, 0, 14)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.24, 0.1, 0.03, s * 0.5, 0.88, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.03, s * 0.28, 0.62, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.24, 0.07, 0.03, s * 0.5, 0.72, BZ - 0.006)),
    ]);
    // shock stubs standing out of the bonnet and the tail deck (a dark body with a bright yellow spring round it)
    parts(group, k + 'shockrod', STEEL, () => [-1, 1].flatMap(s => [
      tube([s * 0.6, 1.0, AF], [s * 0.54, 1.56, AF], 0.04, 8),
      tube([s * 0.6, 1.0, AR], [s * 0.54, 1.58, AR], 0.04, 8),
    ]));
    parts(group, k + 'shockspring', SHOCK, () => [-1, 1].flatMap(s => [
      tube([s * 0.578, 1.1, AF], [s * 0.553, 1.4, AF], 0.085, 8),
      tube([s * 0.573, 1.2, AR], [s * 0.55, 1.44, AR], 0.085, 8),
    ]));
    // the spare on the tail deck, standing: a tyre and a hub, partly sunk in the deck
    // (tagged userData.prop = 'cargo': the spare is a load on the deck, a chosen cargo prop hides it, render/propcosmetic.js)
    place(group, shared(k + 'spare', () => new THREE.CylinderGeometry(0.44, 0.44, 0.3, 14).rotateX(Math.PI / 2)), TYRE, 0, 1.56, -1.38).userData.prop = 'cargo';
    place(group, shared(k + 'sparehub', () => new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10).rotateX(Math.PI / 2)), HUB, 0, 1.56, -1.38).userData.prop = 'cargo';
    // a flat white roundel disc on each door (a race number's place; flat colour, no texture)
    const X = HALF + 0.008;
    parts(group, k + 'roundel', WHITE, () => [-1, 1].map(s => new THREE.CircleGeometry(0.21, 16).rotateY(s * Math.PI / 2).translate(s * X, 0.9, 0.0)));
    // the wheels: tall and wide
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Armoured Limo (a presidential-style armoured limousine) ---------------------------------------------------
  // A long black-tie saloon built like a vault: thick slab flanks, a raised flat roof, small deep windows (four a
  // side) between broad pillars, a tall upright chrome grille beside stacked lamps, steel bumpers and sills, and big
  // run-flat wheels with plain hubs standing out of the slab sides (no wheel wells cut). Polished paint, darker low down.
  armouredlimo: (car) => {
    const group = new THREE.Group();
    const F = car.hw / 1.02; // (x positions below were measured at hw 1.02: scaled out with the width)
    const R = 0.46, TW = 0.4, AF = 1.95, AR = -1.75, WX = car.hw - TW / 2;
    const BEV = 0.06, ACROSS = 0.1, BW = car.hw * 2 - 0.14, HALF = BW / 2; // (a plain slab body; the tyres sit against its sides and stand out of them)
    const NOSE = 3.0, TAILZ = -3.0, AY = 0.3, GAP = 0.5;
    const k = 'al';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [1.12, 1.7, 0.12];
    const WSF = [1.6, 1.12], WST = [1.0, 1.66], RW = [-2.65, 1.3];
    const outline = [
      [NOSE, AY], [NOSE, 0.82], ...curve([NOSE, 0.82], [NOSE, 0.96], [NOSE - 0.04, 1.02], [NOSE - 0.2, 1.06], 3),
      [1.8, 1.1], WSF, WST, [-2.3, 1.7], RW, [-2.9, 1.22],
      [TAILZ, 1.2], [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]),
      low(0.3, 1.0, [0.6, 0.6, 0.64]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, so the windscreen, the four windows and the back glass share
    // one top line). The armoured look is kept as a FIXED, larger inset (20 cm at the A-pillar, 15 cm under the roof, 28 cm at the C-pillar: the
    // vault's thick pillars and deep sills), not a free-standing set of small quads: the windows still follow the roof's slope and the pillars'.
    // Four windows a side with 20 cm pillars; the last stops 20 cm short of the back glass (a broad C-pillar). The windscreen's foot is the
    // bonnet's end (second call, belt 1.15); the back glass is narrower than the cab (sideInset 0.3).
    const ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(RW), half: HALF, taper: TAPER, grow: BEV, inset: { aPillar: 0.2, roof: 0.15, cPillar: 0.28 }, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, belt: 1.3, sideInset: 0.3, windows: [[0.4, 9], [-0.55, 0.2], [-1.5, -0.75], [-2.1, -1.7]] });
    const screen = cabinGlass(outline, { ...ARGS, belt: 1.15, sideInset: 0.18 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // steel: bumpers (deep) and sills between the arches; chrome: the grille's frame and bars
    parts(group, k + 'steel', STEEL, () => [
      bx(BW + 0.1, 0.24, 0.2, 0, 0.44, FZ + 0.03), bx(BW + 0.1, 0.24, 0.2, 0, 0.44, BZ - 0.03),
      ...[-1, 1].map(s => bx(0.1, 0.16, AF - AR - 2 * GAP + 0.2, s * HALF, 0.4, (AF + AR) / 2)),
    ]);
    parts(group, k + 'black', TRIM, () => [bx(0.9 * F, 0.38, 0.03, 0, 0.7, FZ)]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(0.96 * F, 0.05, 0.05, 0, 0.9, FZ + 0.01), bx(0.96 * F, 0.05, 0.05, 0, 0.5, FZ + 0.01),
      ...[-1, 1].map(s => bx(0.05, 0.4, 0.05, s * 0.46 * F, 0.7, FZ + 0.01)),
      ...[-3, -2, -1, 0, 1, 2, 3].map(i => bx(0.03, 0.34, 0.03, i * 0.12 * F, 0.7, FZ + 0.02)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(s => [0.88, 0.7].map(y => dsc(0.09, 0.03, s * 0.74 * F, y, FZ + 0.005, 0, 14))));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.18, 0.36, 0.03, s * 0.8 * F, 0.85, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.12, 0.08, 0.03, s * 0.74 * F, 0.54, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.18, 0.08, 0.03, s * 0.8 * F, 0.6, BZ - 0.006)),
    ]);
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
