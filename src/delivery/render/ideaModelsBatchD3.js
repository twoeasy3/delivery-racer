// ---- car ideas' models, batch D3: the Half-Track and the Sprint Hatch ---------------------------------------------
// Two vehicles drawn as ideas (ideasBatchD3.js): a civilian utility half-track (wheels at the front, tracks at the back,
// a flat tall bonnet, a closed cab, a canvas-tilted bed; no weapons, no figures; after the M3 / Kegresse type) and a small
// rear-drive sports hatchback (after the Toyota Sprinter Trueno / Corolla Levin three-door hatch, AE86 era).
// Built as the approved Commuter and Junker are (render/modelsOrig1b.js, modelsOrig3.js; helpers kept here as copies so the
// files do not import each other): each body an extrusion of its side view with the edges rounded, flat dark glass laid a
// few mm proud, parts that share a material and never move merged into one mesh, paint shaded darker low down (vertex
// colours), plain chunky wheels (a tyre and a plain hub disc, meshes of their own, found by the showroom suspension).
// No textures (14-Oct, the owner: not everything needs one): flat colours, a plain white disc for the Sprint Hatch's roundel.
// No image files, no panel lines.
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void, userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_D3.
import * as THREE from 'three';
import { cabinGlass, mergeFlat } from './ideaModelsDkit.js'; // (mergeFlat: keeps the glass panes' ranges on the merged geometry, for the model editor)

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xb4b8be)), TRIM = keep(lambert(0x24262a)), CHROME = keep(lambert(0xc8cbd0));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a);

const SHARED = new Map();
const shared = (key, make) => {
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

// a wheel arch's flare: a band round the arch (radii ri to ro, centred at z, y: its feet at y), `t` thick, its outer face
// at x 0 and its inner at -t (move it out to the flank)
const flare = (z, y, ri, ro, t) => {
  const shape = new THREE.Shape();
  shape.moveTo(z + ro, y);
  shape.absarc(z, y, ro, 0, Math.PI, false);
  shape.lineTo(z - ri, y);
  shape.absarc(z, y, ri, Math.PI, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 5 }).rotateY(-Math.PI / 2);
};
// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, width + 0.02, Math.round(seg * 0.75)).rotateZ(Math.PI / 2)), HUB, x, R, z);
};
const BRAKE = basic(0xc4101c);
// flat colours for the Half-Track's tilt and track belts (no textures)
const TILT = keep(new THREE.MeshLambertMaterial({ color: 0xb3a57c, side: THREE.DoubleSide })), BELT = keep(lambert(0x222220)), WHITE = keep(lambert(0xf4f1e8));

export const IDEA_MODELS_BATCH_D3 = {
  // ---- the Sprint Hatch (after the Honda CR-X, 1984) ---------------------------------------------------------------
  // Short, light and wedge-shaped: a low sloping nose with slim lamps, a raked windscreen, a short roof and one long glass
  // hatch that slopes down to a chopped (Kamm) tail with a small lip spoiler. A plain body with a flat underside: the wide
  // chunky wheels stand out against its sides (a drift stance), no wheel wells cut. Black bumpers, a wide tail lamp band, a
  // racing roundel on each door.
  sprinthatch: (car) => {
    const group = new THREE.Group();
    const R = 0.31, TW = 0.24, AF = 1.12, AR = -1.0, WX = car.hw - TW / 2;
    const BEV = 0.05, ACROSS = 0.09, BW = 1.68, HALF = BW / 2;
    const NOSE = 1.86, TAILZ = -1.84, AY = 0.3, BELT = 0.9, ROOF = 1.26, GBELT = 0.94;
    const k = 'sh';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.14];
    const WSF = [0.66, 0.82], WST = [-0.06, ROOF], RT = [TAILZ + 0.06, 0.95];
    const outline = [
      [NOSE, AY], [NOSE, 0.52], ...curve([NOSE, 0.52], [NOSE, 0.6], [NOSE - 0.1, 0.64], [NOSE - 0.3, 0.68], 3),
      WSF, WST,
      [-0.62, ROOF], ...curve([-0.62, ROOF], [-1.0, ROOF - 0.1], [-1.4, 1.02], [-1.72, 0.97], 5),
      RT, ...curve(RT, [TAILZ, 0.95], [TAILZ, 0.9], [TAILZ, 0.82], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      bx(1.15, 0.04, 0.18, 0, 0.99, BZ + 0.03, -0.2), // the lip spoiler on the tail's top
      // a flat flare band round each wheel (no well cut: it stands on the flank, the tyre outside it)
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, R, R + 0.03, R + 0.1, 0.06).translate(s > 0 ? HALF + 0.06 : -HALF + 0.0, 0, 0))),
    ]), low(0.28, 0.85, [0.6, 0.56, 0.54]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass); the door glass is the long one, the quarter window behind the B-pillar the short one
    const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RT), belt: GBELT, half: HALF, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.006, windows: [[-0.46, 9], [-1.25, -0.62]] });
    // the windscreen from a second call with the belt down at the bonnet (0.85; the bonnet ends at 0.82): the side windows' belt (0.94) left
    // its foot 12 cm above the bonnet; its top is the same line (the A-pillar corner), only the foot is lower
    const screen = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RT), belt: 0.85, half: HALF, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.006 });
    const gx = (y) => narrowAt(HALF, y, TAPER);
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.0, 0.09, 0.03, 0, 0.47, FZ - 0.005),          // the slim grille
      bx(1.72, 0.1, 0.12, 0, 0.36, FZ + 0.02),           // the front bumper
      ...[-1, 1].map(s => bx(0.36, 0.14, 0.03, s * 0.6, 0.5, FZ - 0.02)), // the lamps' dark bezels
      bx(1.35, 0.05, 0.2, 0, 0.28, FZ + 0.06),            // the air dam's lip
      bx(1.25, 0.05, 0.16, 0, 0.3, BZ - 0.04),            // the rear diffuser lip
      bx(1.74, 0.1, 0.1, 0, 0.44, BZ - 0.01),            // the rear bumper
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.14, s * (gx(0.93) + 0.02), 0.92, 0.42)), // the mirrors, on the door tops by the screen's foot
    ]);
    // lamps: slim square headlamps either side of the grille, amber under their outer ends; a tail lamp band each side
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.3, 0.1, 0.04, s * 0.6, 0.5, FZ - 0.005)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.4, 0.13, 0.04, s * 0.56, 0.74, BZ + 0.005)));
    parts(group, k + 'brake', BRAKE, () => [-1, 1].map(s => bx(0.15, 0.09, 0.04, s * 0.3, 0.74, BZ)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.15, 0.05, 0.04, s * 0.7, 0.42, FZ - 0.005)),
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.04, s * 0.73, 0.6, BZ + 0.005)),
    ]);
    // a flat white disc on each door, a racing roundel with no number (flat colour, no texture)
    const X = HALF + 0.006;
    parts(group, k + 'roundel', WHITE, () => [
      new THREE.CircleGeometry(0.29, 16).rotateY(Math.PI / 2).translate(X, 0.6, 0.0),
      new THREE.CircleGeometry(0.29, 16).rotateY(-Math.PI / 2).translate(-X, 0.6, 0.0),
    ]);
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Half-Track (a civilian utility half-track, after the Kegresse / M3 type; no weapons, no figures) -----------
  // A tall flat bonnet on a grille face with round lamps, a front roller on a bumper bar, a closed upright cab and a bed
  // under a canvas tilt. Big chunky wheels at the front, standing against the body's sides with a flat flare band over each
  // (no well cut); a track at each side at the back (a chain belt on a steel plate, with a drive sprocket, three road wheels
  // and an idler) under the high bed. The tilt and the belts are flat colours.
  halftrack: (car) => {
    const group = new THREE.Group();
    const R = 0.52, TW = 0.3, AF = 2.05, HALF = 1.18, BW = HALF * 2, WX = car.hw - TW / 2;
    const BEV = 0.06, ACROSS = 0.1;
    const NOSE = 2.9, TAILZ = -2.6, BOT = 0.62, BED = 1.0, DECK = 1.62, ROOF = 2.15, HOOD = 1.5;
    const k = 'ht';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [DECK, ROOF, 0.06];
    const WSF = [1.28, HOOD], WST = [0.977, ROOF], CB = [-0.3, 1.64]; // (CB: a point on the straight cab back, below the window's belt)
    const outline = [
      [NOSE, BOT], [NOSE, 1.34], ...curve([NOSE, 1.34], [NOSE, 1.46], [NOSE - 0.04, HOOD], [NOSE - 0.2, HOOD], 3),
      WSF, WST,
      [-0.3, ROOF], CB,
      [-0.3, DECK], [TAILZ + 0.08, DECK], ...curve([TAILZ + 0.08, DECK], [TAILZ, DECK], [TAILZ, DECK - 0.04], [TAILZ, DECK - 0.12], 2),
      [TAILZ, BED], [-0.3, BED], [-0.3, BOT],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      // the grille's slots, upright bars in the paint standing in the dark grille panel
      ...[-2, -1, 0, 1, 2].map(i => bx(0.08, 0.5, 0.04, i * 0.21, 1.0, FZ + 0.012)),
      // a flat flare band over each front wheel (it stands on the flank; the tyre comes through its hole)
      ...[-1, 1].map(s => flare(AF, R, R + 0.03, R + 0.13, 0.08).translate(s > 0 ? HALF + 0.07 : -HALF + 0.01, 0, 0)),
    ]), low(0.5, 1.5, [0.62, 0.58, 0.5]))), paint);
    // the canvas tilt over the bed: a half-round tunnel along it, flat khaki
    place(group, shared(k + 'tilt', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-1.1, DECK - 0.05); shape.lineTo(1.1, DECK - 0.05); shape.lineTo(1.1, DECK + 0.02);
      shape.absellipse(0, DECK + 0.02, 1.1, 0.8, 0, Math.PI, false);
      shape.lineTo(-1.1, DECK - 0.05);
      const geo = plain(new THREE.ExtrudeGeometry(shape, { depth: 2.3, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, TAILZ + 0.02));
      return geo;
    }), TILT);
    // the glass: the windscreen and a side window each side
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): the windscreen and one side window a side (the cab
    // has no rear window: the tilt stands behind it); the windscreen's foot is the bonnet (second call, belt 1.53)
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(CB), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006, sideInset: 0.12 };
    const glass = cabinGlass(outline, { ...ARGS, belt: 1.68 }), screen = cabinGlass(outline, { ...ARGS, belt: HOOD + 0.03 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front]);
    // dark parts: the grille panel, the bumper bar and the roller's brackets, the underbody (so there is no void under
    // the bonnet, cab or bed)
    parts(group, k + 'black', TRIM, () => [
      bx(1.3, 0.62, 0.03, 0, 1.0, FZ),
      bx(2.55, 0.16, 0.16, 0, 0.76, FZ + 0.06),
      ...[-1, 1].map(s => bx(0.1, 0.1, 0.26, s * 1.0, 0.77, FZ + 0.16)),
      bx(1.8, 0.34, 3.0, 0, 0.45, 1.4),
      bx(1.5, 0.56, 2.1, 0, 0.72, -1.55),
    ]);
    // the roller: a steel drum across the front on the brackets
    place(group, shared(k + 'roller', () => new THREE.CylinderGeometry(0.13, 0.13, 2.3, 10).rotateZ(Math.PI / 2)), CHROME, 0, 0.77, FZ + 0.2);
    // lamps: round headlamps in chrome rims either side of the grille, ambers under them; tail lamps and ambers on the bed
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.18, 0.03, s * 0.9, 1.22, FZ + 0.01, 0, 14)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.14, 0.03, s * 0.9, 1.22, FZ + 0.02, 0, 14)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.16, 0.03, s * 1.0, 1.32, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.16, 0.07, 0.03, s * 0.95, 0.98, FZ + 0.012)),
      ...[-1, 1].map(s => bx(0.16, 0.07, 0.03, s * 1.0, 1.15, BZ - 0.006)),
    ]);
    // the front wheels: tall and chunky, against the body's sides
    for (const s of [-1, 1]) wheel(group, k, R, TW, s * WX, AF);
    // the tracks, a belt on a plate, with their wheels
    const ZA = -2.0, ZB = -0.97, TR = 0.42, TI = 0.33, TX = 0.98, BELTW = 0.4;
    const stad = (r, path) => {
      path.moveTo(ZA, TR - r); path.lineTo(ZB, TR - r);
      path.absarc(ZB, TR, r, -Math.PI / 2, Math.PI / 2, false);
      path.lineTo(ZA, TR + r);
      path.absarc(ZA, TR, r, Math.PI / 2, Math.PI * 1.5, false);
      return path;
    };
    const chain = shared(k + 'belt', () => {
      const shape = stad(TR, new THREE.Shape());
      shape.holes.push(stad(TI, new THREE.Path()));
      const geo = plain(new THREE.ExtrudeGeometry(shape, { depth: BELTW, bevelEnabled: false, curveSegments: 10 }).rotateY(-Math.PI / 2).translate(BELTW / 2, 0, 0));
      return geo;
    });
    const plate = shared(k + 'plate', () => plain(new THREE.ExtrudeGeometry(stad(TI + 0.01, new THREE.Shape()), { depth: BELTW - 0.06, bevelEnabled: false, curveSegments: 8 }).rotateY(-Math.PI / 2).translate((BELTW - 0.06) / 2, 0, 0)));
    const roadWheel = shared(k + 'road', () => new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10).rotateZ(Math.PI / 2));
    const bigWheel = shared(k + 'sprocket', () => new THREE.CylinderGeometry(0.27, 0.27, 0.06, 12).rotateZ(Math.PI / 2));
    for (const s of [-1, 1]) {
      place(group, chain, BELT, s * TX, 0, 0);
      place(group, plate, TRIM, s * TX, 0, 0);
      const xo = s * (TX + BELTW / 2 + 0.01);
      place(group, bigWheel, HUB, xo, TR, ZB);
      place(group, bigWheel, HUB, xo, TR, ZA);
      for (const z of [-1.2, -1.5, -1.8]) place(group, roadWheel, HUB, xo + s * 0.015, 0.2, z);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
