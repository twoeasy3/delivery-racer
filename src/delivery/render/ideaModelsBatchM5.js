// ---- car ideas' models, batch M5 (ideasBatchM5.js) ---------------------------------------------------------------------
//   pacecar    the Pace Car, after the 1982 Chevrolet Camaro Z28 Indy 500 pace car: a long low wedge with a light bar
//   stonecar   the Stone-Age Car, after the Flintstones' car: logs, rock rollers, a hide canopy on sticks, an open driver's bench
//   skiplorry  the Skip Lorry, after a 1980s skip loader: a flat-fronted cab, two lift arms and a steel skip on chains
// Built as the Junker benchmark asks (silhouette first, a shaped front end, plain chunky wheels, colour blocking; vertex
// shading low down) with the ideas kit (ideaModelsDkit.js: side-view extrusions, glass derived from the cabin's own profile).
// NO textures, no panel lines, no scooped wells, no people. Decorative props stand as their own meshes, tagged
// `userData.prop` ('roof' / 'cargo' / 'wing') so a chosen cosmetic can hide them. Each builder takes the idea's entry and
// returns a group, front facing local +z, with userData.body (the paint, one mesh), animate and livery.
// Spread into IDEA_MODELS by ideaModels.js. State-free.
import * as THREE from 'three';
import { cabinGlass, fillet, flankPanel, narrowAt, curve, extrudeSide, parts as glassParts, keep, lambert, basic, TYRE, TRIM, GLASS,
  shared, place, merge, parts, bx, blob, low, shadeBy } from './ideaModelsDkit.js';

const SILVER = keep(lambert(0xc4c8ce));
const LAMP = basic(0xfff3c4), TAIL = basic(0xc0141c), AMBER = basic(0xffa31a), CLEAR = basic(0xeef4ff);

// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, hubR, hubMat, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(hubR, hubR, width + 0.016, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
};
// an arch's dark liner: a half-tube over the axle between the tyres (no seeing through the arch to the other side)
const liner = (r, len, y, z) => new THREE.CylinderGeometry(r, r, len, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, y, z);
// a flank panel (ideaModelsDkit.js flankPanel) turned to face out: its triangles' winding reversed
const flip = (geo) => {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
    p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
    p.setXYZ(i + 2, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
};
const tag = (mesh, slot) => { mesh.userData.prop = slot; return mesh; };

export const IDEA_MODELS_BATCH_M5 = {};

// ---- the Pace Car (after the 1982 Chevrolet Camaro Z28 Indy 500 pace car) ------------------------------------------------
// A long, low, wide wedge: a sharp sloping nose with four square headlamps in a black band and a deep air dam under it, a
// long bonnet with a raised cowl bulge, a steeply raked windscreen, a short roof and a huge glass hatch sweeping down to a
// short tail with a lip spoiler; a full-width black tail panel with red lamps; plain arches over fat tyres on silver hubs.
// The pace car's dress: a bold stripe down each flank and a light bar on the roof (both their own meshes; the bar tagged
// 'roof', the spoiler 'wing'). The stripe's colour is the livery's (Good: red; Evil: gold).
IDEA_MODELS_BATCH_M5.pacecar = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.33, TW = 0.27;
  const k = 'pacecar' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 1.29, BEV = 0.05, BW = 2 * W - 0.08, HALF = BW / 2;
  const NOSE = L - BEV - 0.01, TAILZ = -L + BEV + 0.01, AY = 0.3;
  const ARCH = R + 0.05 + BEV, RA = ARCH - BEV;
  // the body, side on: the air dam, the sloped face of the nose, the long bonnet rising to the cowl, the waist level back to
  // the hatch's foot, the short deck, the upright tail; the straight sill with the two arches
  const WSF = [0.78, 0.9], WB = [-1.9, 0.93];
  const FACE0 = [NOSE, 0.36], FACE1 = [NOSE - 0.08, 0.58];
  const bonnet = curve(FACE1, [1.9, 0.7], [1.3, 0.85], WSF, 5);
  const bodyOutline = [
    [2.0, 0.19], [NOSE - 0.08, 0.2], FACE0, FACE1, ...bonnet, WB,
    [TAILZ + 0.1, 0.94], [TAILZ, 0.88], [TAILZ, 0.36], [TAILZ + 0.1, 0.22], [-1.85, 0.22],
    ['arc', -AX, AY, ARCH], ['arc', AX, AY, ARCH],
  ];
  // the cabin, side on (its foot hidden in the body): the raked screen, the short roof, the long hatch down to the deck;
  // narrowed toward the roof from its foot (tumblehome)
  const CBEV = 0.05, CW = BW - 0.06, CH = CW / 2, ROOFY = 1.22, CY = 0.8;
  const TAPER = [CY, ROOFY, 0.2];
  const CF = [WSF[0] - 0.02, WSF[1]], V1 = [-0.02, ROOFY], V2 = [-0.6, ROOFY - 0.02], TH = [-1.66, 0.92];
  const cabin = [[CF[0] + 0.2, CY], CF, ...fillet(CF, V1, V2, 0.14, 0.18, 3), ...fillet(V1, V2, TH, 0.2, 0.22, 3), TH, [TH[0] - 0.02, CY]];
  const mirrorX = narrowAt(CH, 0.98, TAPER) + 0.04;
  // the cowl bulge on the bonnet: a low rounded wedge rising toward the screen
  const bulge = extrudeSide([[1.85, 0.66], [1.6, 0.76], [0.85, 0.93], [0.7, 0.86], [1.85, 0.6]], 0.62, 0.02, null, 1, 0.06);
  const body = place(group, shared(k + 'body', () => shadeBy(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.16),
    extrudeSide(cabin, CW, CBEV, TAPER, 2, 0.1),
    bulge,
    ...[-1, 1].map(s => blob(0.1, 0.06, 0.07, s * mirrorX, 0.98, 0.6, [8, 5])),   // the mirrors
  ]), low(0.2, 0.7, [0.84, 0.82, 0.82]))), paint);
  // the glass, all from the cabin's own profile: a long door window and a small quarter window a side, the windscreen down
  // to the cowl, the big hatch glass (in past the cabin's rounded corners)
  const FROM = cabin.indexOf(CF), TO = cabin.indexOf(TH), BELT = 0.96;
  const ARGS = { from: FROM, to: TO, half: CH, taper: TAPER, grow: CBEV, sharp: true, cornerDepth: 0.04,
    inset: { aPillar: 0.07, roof: 0.07, cPillar: 0.1 }, lift: CBEV + 0.008, sideLift: 0.008, sideInset: 0.1 };
  const glass = cabinGlass(cabin, { ...ARGS, belt: BELT, windows: [[-0.22, 9], [-9, -0.3]] });
  const screen = cabinGlass(cabin, { ...ARGS, belt: WSF[1] + 0.04 });
  const hatch = cabinGlass(cabin, { ...ARGS, belt: BELT, sideInset: 0.16 }).rear;
  glassParts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, hatch]);
  // the nose: a black band across its sloped face holding the four square headlamps, a slim grille slot in it between them,
  // the air dam's black lip under it; amber parking lamps in the dam
  const slope = Math.atan2(FACE1[0] - FACE0[0], FACE1[1] - FACE0[1]); // (the face leans back by this much)
  const onFace = (y, out) => FACE0[0] + (y - FACE0[1]) * Math.tan(slope) + BEV + out;
  parts(group, k + 'black', TRIM, () => [
    bx(BW - 0.24, 0.17, 0.04, 0, 0.49, onFace(0.49, -0.01), slope),
    // the air dam's lip and the black tail panel, full width across the tail's face
    extrudeSide([[1.95, 0.17], [NOSE - 0.06, 0.17], [NOSE + 0.03, 0.22], [NOSE + 0.03, 0.27], [1.95, 0.27]], BW + 0.02, 0.02, null, 1, 0.1),
    bx(BW - 0.16, 0.26, 0.04, 0, 0.7, TAILZ - BEV + 0.01),
    extrudeSide([[-1.95, 0.2], [TAILZ - 0.02, 0.2], [TAILZ - 0.06, 0.24], [TAILZ - 0.06, 0.4], [-1.95, 0.4]], BW + 0.02, 0.02, null, 1, 0.1),
    // the arches' liners
    ...[AX, -AX].map(z => liner(RA - 0.01, BW - 0.3, AY, z)),
  ]);
  parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(s => [0.62, 0.38].map(x => bx(0.2, 0.11, 0.03, s * x, 0.49, onFace(0.49, 0.012), slope))));
  parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.22, 0.05, 0.02, s * 0.62, 0.225, NOSE + 0.045)));
  // the tail lamps: two wide red lamps a side in the black panel (the inner one the brake lamp's twin), a white reversing lamp
  parts(group, k + 'tail', TAIL, () => [-1, 1].flatMap(s => [bx(0.3, 0.14, 0.02, s * 0.72, 0.71, TAILZ - BEV - 0.006), bx(0.22, 0.14, 0.02, s * 0.43, 0.71, TAILZ - BEV - 0.006)]));
  parts(group, k + 'rev', CLEAR, () => [-1, 1].map(s => bx(0.08, 0.1, 0.02, s * 0.25, 0.71, TAILZ - BEV - 0.006)));
  // the stripe: a bold band (15 cm) down each flank, from the nose's corner along under the waist to the tail (its own mesh,
  // the livery's colour)
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xc8202a });
  // (in order round the outline: along the top rearward, under the bonnet's line by 7 cm; back along the bottom to the nose)
  const top = bonnet.filter(p => p[0] > 0.95 && p[0] < 2.15).map(([z, y]) => [z, y - 0.05]);
  const stripe = [...top, [0.9, 0.84], [-2.22, 0.86], [-2.22, 0.7], [0.9, 0.69], [top[0][0] - 0.1, top[0][1] - 0.1]];
  place(group, shared(k + 'stripe', () => merge(flankPanel(stripe, { half: HALF, lift: 0.004 }).map(flip))), stripeMat);
  // the spoiler: a lip across the deck's rear edge (the wing slot: tagged)
  tag(place(group, shared(k + 'spoiler', () => shadeBy(extrudeSide([[-2.05, 0.92], [TAILZ - 0.04, 0.95], [TAILZ - 0.04, 1.0], [-2.2, 1.0]], BW - 0.1, 0.015, null, 1, 0.04), () => [1, 1, 1])), paint), 'wing');
  // the light bar on the roof: a black bar on two feet, an amber lens at each end and a clear one in the middle (tagged 'roof')
  const BARY = ROOFY + CBEV;
  tag(parts(group, k + 'barbase', TRIM, () => [bx(1.16, 0.07, 0.2, 0, BARY + 0.075, -0.32), ...[-1, 1].map(s => bx(0.06, 0.06, 0.14, s * 0.45, BARY + 0.02, -0.32))]), 'roof');
  tag(parts(group, k + 'baramber', AMBER, () => [-1, 1].map(s => bx(0.3, 0.09, 0.17, s * 0.4, BARY + 0.155, -0.32))), 'roof');
  tag(parts(group, k + 'barclear', CLEAR, () => [bx(0.44, 0.08, 0.16, 0, BARY + 0.15, -0.32)]), 'roof');
  // the wheels: fat tyres under plain arches on silver hubs
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, TW, side * (W - 0.1), z, 0.2, SILVER);
  group.userData = {
    body, animate: () => {},
    livery: (evil) => stripeMat.color.setHex(evil ? 0xc9a03a : 0xc8202a),
    glassVirtual: { chain: glass.virtual, grow: CBEV },
  };
  return group;
};

// ---- shared bits for the stone and the wood ------------------------------------------------------------------------------
// a lumpy rock: an icosahedron, each corner pushed in or out by up to `rough` (the same amount for a corner wherever it is
// repeated, so the faces stay closed), scaled to half sizes sx, sy, sz and placed
const rock = (seed, sx, sy, sz, x, y, z, rough = 0.18, detail = 1) => {
  const geo = new THREE.IcosahedronGeometry(1, detail), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const h = Math.sin(px * 12.9898 + py * 78.233 + pz * 37.719 + seed * 4.1) * 43758.5453;
    const f = 1 + rough * (2 * (h - Math.floor(h)) - 1);
    pos.setXYZ(i, px * f * sx, py * f * sy, pz * f * sz);
  }
  geo.computeVertexNormals();
  return geo.translate(x, y, z);
};
// a log: a cylinder `r` round from point a to point b ([x, y, z]), 7-sided (a hewn look)
const log = (r, a, b, seg = 7, caps = true) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(r, r * 0.94, len, seg, 1, !caps);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};
// a log's cut end: a pale disc on the log's axis, facing out of it
const logEnd = (r, at, dir, seg = 7) => {
  const geo = new THREE.CylinderGeometry(r, r, 0.012, seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()));
  return geo.translate(...at);
};
const STONE = keep(new THREE.MeshLambertMaterial({ color: 0x9a9384, flatShading: true }));
const STONE2 = keep(new THREE.MeshLambertMaterial({ color: 0xb3a994, flatShading: true }));
const CUT = keep(lambert(0xdcb98c)), SPOT = keep(new THREE.MeshLambertMaterial({ color: 0x4a2e1a, side: THREE.DoubleSide }));

// ---- the Stone-Age Car (after the Flintstones' car, the 1960 cartoon) ---------------------------------------------------
// A frame of two long logs, one down each side, riding on two rollers of solid rock (the logs carry the rollers' log axles);
// a cross log across each end; a rough stone floor between the rollers, a stone dash with a wooden steering wheel on a stick,
// two stone benches with log backs (the driver's at the front: no one drawn, no feet), four crooked poles holding a sagging
// hide canopy with dark spots. Open sides. Its lamps: pale glow-stones set in the front logs' cut ends, red ones in the back
// ones'. The paint is the wood's (Good a warm log brown, Evil a dark one); the hide's colour is the livery's.
IDEA_MODELS_BATCH_M5.stonecar = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl;
  const k = 'stonecar' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true, flatShading: true });
  const R = 0.42, RW = 1.56, FZ = 1.22, BZ = -1.16;   // (the rollers: radius, width, the front and back axles)
  const FX = W - 0.12, FR = 0.13, FY = R;              // (the frame logs: across, thick, high: on the axles' line)
  const FRONT = L - 0.04, BACK = -L + 0.04;
  // the rollers: rough rock drums, each a mesh of its own (the suspension finds them), on log axles
  for (const z of [FZ, BZ]) place(group, shared(k + 'roller', () => new THREE.CylinderGeometry(R, R, RW, 11, 1).rotateZ(Math.PI / 2)), STONE, 0, R, z);
  // the wood: the frame logs, the cross logs at each end, the axles, the poles, the benches' backs, the steering stick
  const XY = FY + FR + 0.08, RAILY = 0.86, PY = 1.74, poles = [[FX - 0.02, 0.62], [-FX + 0.02, 0.62], [FX - 0.02, -0.98], [-FX + 0.02, -0.98]];
  const body = place(group, shared(k + 'wood', () => shadeBy(merge([
    ...[-1, 1].map(s => log(FR, [s * FX, FY, FRONT], [s * FX, FY, BACK])),
    // the upper side rails: a log down each side of the seats, from the dash to behind the back bench, through the poles
    ...[-1, 1].map(s => log(0.075, [s * (FX - 0.02), RAILY, 0.86], [s * (FX - 0.02), RAILY, -1.2])),
    // (the cross logs lie on top of the frame logs, near their ends)
    log(0.09, [-FX - 0.07, XY, FRONT - 0.12], [FX + 0.07, XY, FRONT - 0.12]),
    log(0.09, [-FX - 0.07, XY, BACK + 0.12], [FX + 0.07, XY, BACK + 0.12]),
    ...[FZ, BZ].map(z => log(0.07, [-FX - 0.05, R, z], [FX + 0.05, R, z])),
    ...poles.map(([x, z], i) => log(0.045, [x, FY + 0.05, z], [x + (i % 2 ? 0.03 : -0.03), PY + 0.02, z + (i < 2 ? -0.04 : 0.04)], 6)),
    // the benches' backs: a log across behind each bench, on two stubs
    ...[0.02, -0.82].flatMap(z => [log(0.07, [-FX + 0.06, 0.98, z], [FX - 0.06, 0.98, z]),
      ...[-1, 1].map(s => log(0.045, [s * (FX - 0.25), 0.5, z], [s * (FX - 0.25), 0.98, z], 6))]),
    log(0.03, [0.42, 1.0, 0.82], [0.42, 1.12, 0.6], 6),   // the steering stick (the driver sits on the car's left)
  ]), low(0.25, 1.0, [0.72, 0.68, 0.66]))), paint);
  // the logs' cut ends (pale), and the steering wheel: a wooden ring on the stick
  parts(group, k + 'cut', CUT, () => [
    ...[-1, 1].flatMap(s => [logEnd(FR, [s * FX, FY, FRONT + 0.002], [0, 0, 1]), logEnd(FR, [s * FX, FY, BACK - 0.002], [0, 0, -1]),
      logEnd(0.07, [s * (FX + 0.052), R, FZ], [s, 0, 0]), logEnd(0.07, [s * (FX + 0.052), R, BZ], [s, 0, 0])]),
    ...[-1, 1].flatMap(s => [logEnd(0.09, [s * (FX + 0.072), XY, FRONT - 0.12], [s, 0, 0]), logEnd(0.09, [s * (FX + 0.072), XY, BACK + 0.12], [s, 0, 0])]),
    new THREE.TorusGeometry(0.15, 0.025, 5, 10).rotateX(-0.75).translate(0.42, 1.14, 0.58),
  ]);
  // the stone: the floor slab between the rollers, the dash before the driver, the two benches
  parts(group, k + 'floor', STONE, () => [rock(1, FX - 0.1, 0.12, 0.66, 0, 0.5, -0.2, 0.1)]);
  // the dash: a big rough boulder over the front roller, sloping up toward the driver (the car's stone bonnet)
  parts(group, k + 'dash', STONE, () => [rock(2, FX - 0.02, 0.26, 0.4, 0, 0.86, 1.0, 0.16)]);
  parts(group, k + 'seats', STONE2, () => [
    rock(3, FX - 0.16, 0.11, 0.22, 0, 0.66, 0.28, 0.12),
    rock(4, FX - 0.16, 0.11, 0.22, 0, 0.66, -0.54, 0.12),
  ]);
  // the canopy: a hide sagging between the poles' tops, double-sided; a few dark spots on it
  const hide = new THREE.MeshLambertMaterial({ color: 0xd9b26a, side: THREE.DoubleSide });
  const CX = FX + 0.12, CZ0 = 0.82, CZ1 = -1.2, sag = (x, z) => PY + 0.05 - 0.07 * (1 - (x / CX) ** 2) * (1 - ((z - (CZ0 + CZ1) / 2) / ((CZ0 - CZ1) / 2)) ** 2);
  const sheet = () => {
    const geo = new THREE.PlaneGeometry(2 * CX, CZ0 - CZ1, 6, 6).rotateX(-Math.PI / 2).translate(0, 0, (CZ0 + CZ1) / 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), edge = Math.abs(Math.abs(x) - CX) < 1e-6 || Math.abs(z - CZ0) < 1e-6 || Math.abs(z - CZ1) < 1e-6;
      p.setY(i, sag(x, z) - (edge ? 0.03 : 0));
    }
    geo.computeVertexNormals();
    return geo;
  };
  // (and a ragged flap hanging 10 to 14 cm all round its edge, so the canopy reads from the side as well as from above)
  const flap = () => {
    const pos = [], ring = [[-CX, CZ0], [CX, CZ0], [CX, CZ1], [-CX, CZ1]], top = PY + 0.02;
    ring.forEach((a, e) => {
      const b = ring[(e + 1) % 4], n = 6;
      for (let i = 0; i < n; i++) {
        const p = [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n], q = [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n];
        const dp = 0.1 + 0.04 * ((i + e) % 2), dq = 0.1 + 0.04 * ((i + 1 + e) % 2);
        pos.push(p[0], top, p[1], q[0], top, q[1], q[0], top - dq, q[1], p[0], top, p[1], q[0], top - dq, q[1], p[0], top - dp, p[1]);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  };
  place(group, shared(k + 'hide', () => merge([sheet(), flap()])), hide);
  const spot = (x, z, a, b) => { // (a spot on the hide: a little oval following its sag, 1.2 cm above it)
    const geo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2).scale(a, 1, b), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, sag(x + p.getX(i), z + p.getZ(i)) + 0.012);
    return geo.translate(x, 0, z);
  };
  parts(group, k + 'spots', SPOT, () => [spot(0.5, 0.4, 0.14, 0.1), spot(-0.3, 0.1, 0.11, 0.15), spot(0.15, -0.5, 0.16, 0.1), spot(-0.6, -0.8, 0.12, 0.09), spot(0.65, -0.95, 0.09, 0.12), spot(-0.55, 0.6, 0.1, 0.08)]);
  // the lamps: glow-stones set in the front logs' cut ends; red stones in the back ones' (the frame logs run past the cross logs)
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.07, 0.07, 0.035, s * FX, FY, FRONT + 0.008, [8, 6])));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => blob(0.065, 0.065, 0.03, s * FX, FY, BACK - 0.008, [8, 6])));
  group.userData = { body, animate: () => {}, livery: (evil) => hide.color.setHex(evil ? 0x7a2e2a : 0xd9b26a) };
  return group;
};

// ---- the Skip Lorry (after a 1980s Leyland Roadrunner skip loader) -------------------------------------------------------
// A tall flat-fronted day cab over the front wheels (a big upright windscreen, a black grille band, square headlamps and
// amber indicators in a deep bumper, mirrors out on arms, an amber beacon on the roof: tagged 'roof'), an exhaust stack
// behind it; the chassis rails running back to the stabiliser legs and the light bar; twin rear wheels under flat guards;
// the two lift arms pivoted at the very back, raised forward over the skip and joined by a cross beam at their tips, each
// pushed by a ram; four chains from the beam's ends down to the skip's lugs; the steel skip (sloped ends) heaped with
// rubble and a few planks. The paint is the cab's and the skip's.
// (a beam: a box `w` across and `d` deep standing from point a to point b ([x, y, z]))
const beam = (w, d, a, b) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const geo = new THREE.BoxGeometry(w, len, d);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};
const ARMS = keep(lambert(0x3a3d42)), RUBBLE = keep(new THREE.MeshLambertMaterial({ color: 0x6f665c, flatShading: true }));
const PLANK = keep(lambert(0x9a7448)), CHAIN = keep(lambert(0x2b2b2e));
IDEA_MODELS_BATCH_M5.skiplorry = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl;
  const k = 'skiplorry' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const R = 0.5, FA = 2.15, RA = -1.55, BEV = 0.04, BW = 2 * W - 0.06, HALF = BW / 2;
  const FACE = L - 0.12, BACKZ = 1.52, FOOT = 0.62;
  // the cab, side on: the upright face, the windscreen raked a little up to the roof, the back; its foot cut round the front wheel
  const SF = [FACE, 1.62], ST = [FACE - 0.14, 2.86], RB = [BACKZ, 2.86], BF = [BACKZ, FOOT];
  const cab = [[FACE, FOOT], SF, ST, RB, BF, ['arc', FA, FOOT, R + 0.07]];
  // the skip, side on: sloped ends, and a lip round its top a little wider than it
  const SK = { y0: 1.02, y1: 1.98, zf0: 0.55, zf1: 1.18, zr0: -2.05, zr1: -2.68, half: 0.95 };
  const skip = [[SK.zr0, SK.y0], [SK.zf0, SK.y0], [SK.zf1, SK.y1], [SK.zr1, SK.y1]];
  const lip = [[SK.zr1 - 0.02, SK.y1 - 0.08], [SK.zf1 + 0.02, SK.y1 - 0.08], [SK.zf1 + 0.06, SK.y1 + 0.06], [SK.zr1 - 0.06, SK.y1 + 0.06]];
  const body = place(group, shared(k + 'body', () => shadeBy(merge([
    extrudeSide(cab, BW, BEV, null, 1, 0.08),
    extrudeSide(skip, 2 * SK.half, 0.02, null, 1, 0.03),
    extrudeSide(lip, 2 * SK.half + 0.06, 0.015, null, 1, 0.03),
  ]), low(0.6, 1.6, [0.8, 0.78, 0.76]))), paint);
  // the glass, all from the cab's own profile: the windscreen, a door window a side, a small window in the cab's back
  const FROM = cab.indexOf(SF), TO = cab.indexOf(BF), BELT = 1.66;
  const ARGS = { from: FROM, to: TO, half: HALF, grow: BEV, inset: { aPillar: 0.1, roof: 0.065, cPillar: 0.12, belt: 0.03 },
    lift: BEV + 0.008, sideLift: 0.008, sideInset: 0.14, frontSideInset: 0.14 };
  const glass = cabinGlass(cab, { ...ARGS, belt: BELT, windows: [[1.95, 9]] });
  const back = cabinGlass(cab, { ...ARGS, belt: BELT, sideInset: 0.62 }).rear; // (a small window in the cab's back, over the skip)
  glassParts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, back]);
  // black: the grille band across the face, the deep bumper, the mirrors on their arms; the chassis rails; the rear guards
  const FZ = FACE + BEV;
  parts(group, k + 'black', TRIM, () => [
    bx(BW - 0.3, 0.5, 0.03, 0, 1.2, FZ + 0.005),
    bx(BW + 0.02, 0.36, 0.16, 0, 0.62, FZ + 0.04),
    ...[-1, 1].flatMap(s => [bx(0.08, 0.5, 0.16, s * (HALF + 0.17), 2.25, FACE - 0.2), beam(0.04, 0.04, [s * (HALF - 0.02), 2.35, FACE - 0.16], [s * (HALF + 0.14), 2.35, FACE - 0.2])]),
    ...[-1, 1].map(s => bx(0.2, 0.26, 6.1, s * 0.45, 0.88, -0.15)),
    ...[-1, 1].flatMap(s => [bx(0.58, 0.04, 1.24, s * (W - 0.27), 1.13, RA), bx(0.58, 0.32, 0.04, s * (W - 0.27), 0.98, RA - 0.62)]),
    bx(2 * W - 0.1, 0.2, 0.22, 0, 0.9, -3.0), // the rear cross member, under the arms' pivots
    bx(2 * W - 0.1, 0.16, 0.2, 0, 0.9, -2.25), // the cross member under the rams' feet
    bx(2 * W - 0.3, 0.1, 0.1, 0, 1.06, RA), // the bar the rear guards stand on
    ...[-1, 1].map(s => bx(0.14, 0.62, 0.12, s * 0.7, 0.62, -3.12)), // the stabiliser legs (up)
    bx(2 * W - 0.14, 0.16, 0.08, 0, 0.48, -3.22), // the light bar across their feet
  ]);
  // the exhaust stack behind the cab, and the fuel tank under it (silver)
  parts(group, k + 'silver', SILVER, () => [
    new THREE.CylinderGeometry(0.055, 0.055, 1.5, 8).translate(-1.0, 2.35, 1.43), // (against the cab's back)
    bx(0.4, 0.42, 0.85, 0.74, 0.8, 0.95), // (hung on the rail)
  ]);
  // the lift arms: a box beam each side from its pivot at the back up to the tip over the skip, a ram under each, the cross
  // beam between the tips; the chains from the beam's ends to the skip's four lugs
  const AX = W - 0.15, P = [-3.0, 1.0], T = [-0.75, 2.95], at = (f) => [P[0] + (T[0] - P[0]) * f, P[1] + (T[1] - P[1]) * f];
  const ram0 = [-2.25, 0.98], ram1 = at(0.42);
  parts(group, k + 'arms', ARMS, () => [
    ...[-1, 1].flatMap(s => [
      beam(0.14, 0.22, [s * AX, P[1], P[0]], [s * AX, T[1], T[0]]),
      bx(0.2, 0.34, 0.34, s * AX, P[1], P[0]), // the pivot bracket
      log(0.075, [s * AX, ram0[1], ram0[0]], [s * AX, (ram0[1] + ram1[1]) / 2, (ram0[0] + ram1[0]) / 2], 8), // the ram's barrel
      bx(0.2, 0.12, 0.3, s * AX, ram0[1] - 0.04, ram0[0]), // its foot on the chassis
    ]),
    log(0.07, [-AX - 0.08, T[1], T[0]], [AX + 0.08, T[1], T[0]], 8),
  ]);
  parts(group, k + 'rod', SILVER, () => [-1, 1].map(s => log(0.042, [s * AX, (ram0[1] + ram1[1]) / 2, (ram0[0] + ram1[0]) / 2], [s * AX, ram1[1], ram1[0]], 8)));
  const LUGY = 1.84, lugs = [[SK.zf0 + (SK.zf1 - SK.zf0) * (LUGY - SK.y0) / (SK.y1 - SK.y0) - 0.12, LUGY], [SK.zr0 + (SK.zr1 - SK.zr0) * (LUGY - SK.y0) / (SK.y1 - SK.y0) + 0.12, LUGY]];
  parts(group, k + 'chain', CHAIN, () => [
    ...[-1, 1].flatMap(s => lugs.map(([z, y]) => log(0.02, [s * (AX - 0.05), T[1] - 0.04, T[0]], [s * (SK.half + 0.05), y, z], 4, false))),
    ...[-1, 1].flatMap(s => lugs.map(([z, y]) => new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8).rotateZ(Math.PI / 2).translate(s * (SK.half + 0.04), y, z))), // the lugs
  ]);
  // the load: a heap of rubble in the skip, a few planks sticking out of it (tagged 'cargo': a chosen load can stand in its place)
  tag(parts(group, k + 'rubble', RUBBLE, () => [rock(7, 0.84, 0.36, 1.5, 0, SK.y1 + 0.1, -0.75, 0.2), rock(8, 0.3, 0.18, 0.35, 0.4, SK.y1 + 0.24, -0.2, 0.25, 0)]), 'cargo');
  tag(parts(group, k + 'planks', PLANK, () => [bx(0.12, 0.04, 1.3, -0.35, SK.y1 + 0.32, -1.0, 0.25, 0.3), bx(0.1, 0.04, 0.9, 0.3, SK.y1 + 0.24, -1.6, -0.3, -0.2)]), 'cargo');
  // the lamps: square headlamps and amber indicators in the bumper; red tail lamps and amber indicators in the light bar
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.26, 0.18, 0.02, s * 0.78, 0.64, FZ + 0.12)));
  parts(group, k + 'amber', AMBER, () => [...[-1, 1].map(s => bx(0.16, 0.12, 0.02, s * 1.06, 0.64, FZ + 0.12)), ...[-1, 1].map(s => bx(0.14, 0.11, 0.02, s * 1.08, 0.48, -3.265))]);
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.24, 0.11, 0.02, s * 0.86, 0.48, -3.265)));
  // the beacon on the cab roof (a roof prop: tagged)
  tag(parts(group, k + 'beacon', AMBER, () => [new THREE.CylinderGeometry(0.09, 0.1, 0.16, 10).translate(0, 2.98, 2.3)]), 'roof');
  tag(parts(group, k + 'beaconfoot', TRIM, () => [bx(0.26, 0.04, 0.26, 0, 2.91, 2.3)]), 'roof');
  // the wheels: single fronts in the cab's arches, wide twins at the back
  for (const s of [-1, 1]) {
    wheel(group, k + 'f', R, 0.3, s * (W - 0.16), FA, 0.24, SILVER);
    wheel(group, k + 'r', R, 0.52, s * (W - 0.27), RA, 0.24, SILVER);
  }
  group.userData = { body, animate: () => {}, livery: () => {} };
  return group;
};
