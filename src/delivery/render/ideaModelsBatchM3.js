// ---- car ideas' models, batch M3 (ideasBatchM3.js; CHECKLIST 517) -----------------------------------------------------
// The Soapbox Racer: a wooden soapbox-derby cart. Built with the shared idea kit (render/ideaModelsDkit.js): flat colours, no
// textures, parts that share a material and never move merged into one mesh, the wood shaded darker low down (vertex colours),
// plain wheels as meshes of their own (the showroom's suspension finds the tyres). No driver is drawn (an open cart).
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void and userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_M3
// into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { keep, lambert, basic, TYRE, CHROME, TRIM, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, dsc, shadeBy, low, curve, extrudeSide, flare, wheel, cabinGlass } from './ideaModelsDkit.js';

const PLANK = keep(lambert(0x8a5e32)), ROPE = keep(lambert(0xd8c89a)), STEEL = keep(lambert(0x6a6e74)), SEAT = keep(lambert(0x3a2a22));
const REFLECT = basic(0xc4101c);

// a rod from a to b ([x, y, z]), radius r
const rod = (a, b, r, seg = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const geo = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  return geo.translate(...A.clone().add(B).multiplyScalar(0.5).toArray());
};
// a solid of a side profile ([z, y] points), from x0 to x1 across the car
const sideSolid = (pts, x0, x1) => {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  return new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 }).rotateY(-Math.PI / 2).translate(x1, 0, 0);
};
// a pram wheel: a thin solid-rubber tyre (a torus: a mesh of its own, the suspension finds it), and in it a thin steel rim,
// eight wire spokes and a small hub (one mesh)
const pramWheel = (parent, key, R, x, z) => {
  place(parent, shared(key + 'tyre', () => new THREE.TorusGeometry(R - 0.022, 0.022, 4, 16).rotateY(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'spokes', () => merge([
    new THREE.TorusGeometry(R - 0.05, 0.01, 3, 16).rotateY(Math.PI / 2),
    ...[0, 1, 2, 3].map(i => bx(0.008, 2 * (R - 0.05), 0.008, 0, 0, 0).rotateX(i * Math.PI / 4)),
    new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8).rotateZ(Math.PI / 2),
  ])), CHROME, x, R, z);
};

// merge keeping vertex colours (the carried cars' one mesh): plain() drops every attribute but position, normal and uv
const plainColour = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};
const merge2 = (geos) => mergeGeometries(geos, false);

export const IDEA_MODELS_BATCH_M3 = {
  // ---- the Soapbox Racer (a soapbox-derby cart, 1930s on) --------------------------------------------------------------
  // A long plank on two wooden axle beams, four pram wheels on steel axles; on the plank a box body of boards: a closed
  // nose deck sloping down to a blunt prow, an open cockpit behind it (a floor, two side boards, a padded seat and a raked
  // seat-back board), a short closed tail. The front beam pivots on a bolt under the nose; a rope runs from each of its ends
  // back outside the nose to a wooden handle in the cockpit. A friction-brake lever stands by the right side board. A bicycle
  // lamp clamped on the nose, two red bicycle lamps on the tail. The paint (varnish) on the box, the plank and beams bare wood.
  soapbox: (car) => {
    const group = new THREE.Group();
    const k = 'soapbox';
    const R = 0.2, WX = 0.505, FZ = 0.78, RZ = -0.78;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const HW = 0.28, FLOOR = 0.31, NOSE = 1.06, COCK = 0.12, BACK = -0.74, TAILZ = -0.98, SIDE = 0.56;
    // the box: the nose deck (a solid, narrowing toward the prow), the cockpit's side boards and floor, the tail block
    const nose = sideSolid([[COCK, FLOOR], [NOSE, FLOOR], [NOSE, 0.44], [COCK, 0.62]], -HW, HW);
    { const pos = nose.attributes.position; for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - 0.32 * Math.max(0, pos.getZ(i) - COCK) / (NOSE - COCK))); nose.computeVertexNormals(); }
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      nose,
      ...[-1, 1].map(s => sideSolid([[BACK, FLOOR], [COCK, FLOOR], [COCK, 0.62], [BACK + 0.05, SIDE], [BACK, SIDE]], s * HW - 0.012, s * HW + 0.012)),
      bx(2 * HW, 0.02, COCK - BACK, 0, FLOOR + 0.01, (COCK + BACK) / 2),
      sideSolid([[TAILZ, FLOOR], [BACK, FLOOR], [BACK, SIDE], [TAILZ, 0.5]], -HW, HW),
    ]), low(0.28, 0.62, [0.7, 0.66, 0.6]))), paint);
    // bare wood: the plank, the axle beams, the seat back and the brake lever, the handle
    parts(group, k + 'plank', PLANK, () => [
      bx(0.46, 0.05, 2.04, 0, 0.285, 0.02),
      bx(2 * WX - 0.1, 0.07, 0.09, 0, 0.225, FZ), bx(2 * WX - 0.1, 0.07, 0.09, 0, 0.225, RZ),
      bx(0.5, 0.36, 0.025, 0, FLOOR + 0.2, BACK + 0.06, -0.28),
      bx(0.03, 0.34, 0.04, -(HW + 0.03), 0.52, -0.2, 0.25),
      new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6).rotateZ(Math.PI / 2).translate(0, 0.56, 0.0),
    ]);
    // the seat's pad on the floor, the kingpin bolt's head and the axles (steel)
    parts(group, k + 'seat', SEAT, () => [bx(0.46, 0.06, 0.34, 0, FLOOR + 0.05, BACK + 0.24)]);
    parts(group, k + 'steel', STEEL, () => [
      new THREE.CylinderGeometry(0.012, 0.012, 2 * WX, 6).rotateZ(Math.PI / 2).translate(0, R, FZ),
      new THREE.CylinderGeometry(0.012, 0.012, 2 * WX, 6).rotateZ(Math.PI / 2).translate(0, R, RZ),
      new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).translate(0, 0.2, FZ),
      bx(0.06, 0.03, 0.08, 0, 0.47, NOSE - 0.12),                 // the lamp's clamp on the nose deck
    ]);
    // the steering rope: from each end of the front beam, back outside the nose, over the side boards to the handle's ends
    parts(group, k + 'rope', ROPE, () => [-1, 1].flatMap(s => [
      rod([s * (WX - 0.08), 0.24, FZ], [s * (HW + 0.03), 0.6, COCK + 0.02], 0.009),
      rod([s * (HW + 0.03), 0.6, COCK + 0.02], [s * 0.18, 0.56, 0.0], 0.009),
    ]));
    // the lamps: a bicycle lamp on the nose (a dark body, its lens facing ahead); two red bicycle lamps on the tail's face
    parts(group, k + 'lampbody', TRIM, () => [new THREE.CylinderGeometry(0.045, 0.045, 0.09, 10).rotateX(Math.PI / 2).translate(0, 0.53, NOSE - 0.1)]);
    parts(group, k + 'lamp', LAMP, () => [dsc(0.036, 0.01, 0, 0.53, NOSE - 0.051, 0, 10)]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.05, 0.07, 0.02, s * 0.18, 0.42, TAILZ - 0.01)));
    parts(group, k + 'reflector', REFLECT, () => [dsc(0.03, 0.01, 0, 0.36, TAILZ - 0.004, 0, 10)]);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) pramWheel(group, k, R, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Backhoe Loader (after the JCB 3CX, 1980s on) ------------------------------------------------------------
  // A digger for the road: big rear wheels and small front ones, a long sloping bonnet over the front axle, a tall square cab
  // over the rear wheels with glass all round (pillars of the cab's own colour), a flat roof with an amber beacon. Loader arms
  // from towers in front of the cab run forward over the front wheels to a wide bucket carried just off the road. At the back,
  // the digging arm folded for the road: the boom stands up behind the cab, the dipper hangs behind it down to a small bucket
  // curled in, two stabiliser legs folded up at the corners. Chrome rams on the boom. Mudguards over all four wheels, a stack
  // pipe up beside the bonnet. Square headlamps in the grille, tail lamps with ambers on the backs of the rear mudguards.
  backhoe: (car) => {
    const group = new THREE.Group();
    const k = 'backhoe';
    const RR = 0.72, RTW = 0.46, FR = 0.52, FTW = 0.36, RZ = -0.75, FZ = 1.45, RX = 0.95, FX = 0.9;
    const BEV = 0.04, BW = 1.36, HALF = BW / 2, FACE = 2.15, BACKZ = -1.55, CAB = [0.32, -1.22], FLOOR = 1.45, ROOF = 2.9, CW = 1.9;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const steel = keep(lambert(0x34363a));
    // the body: the bonnet (sloping down to the grille) and the chassis under the cab, flat-sided between the wheels
    const outline = [[FACE, 0.55], [FACE, 1.46], ...curve([FACE, 1.46], [FACE, 1.58], [FACE - 0.06, 1.62], [FACE - 0.18, 1.63], 3),
      [CAB[0] + 0.02, 1.8], [CAB[0] + 0.02, FLOOR], [BACKZ, FLOOR], [BACKZ, 0.55]];
    const cab = [[CAB[0], FLOOR], [CAB[0] - 0.02, ROOF - 0.1], [CAB[0] - 0.12, ROOF], [CAB[1] + 0.08, ROOF], [CAB[1], ROOF - 0.1], [CAB[1], FLOOR]];
    const shade = low(0.5, 1.6, [0.66, 0.62, 0.56]);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, null, 1),
      extrudeSide(cab, CW, BEV, null, 1),
      bx(CW + 0.1, 0.08, CAB[0] - CAB[1] + 0.2, 0, ROOF + BEV + 0.04, (CAB[0] + CAB[1]) / 2),           // the roof, overhanging
      ...[-1, 1].map(s => bx(0.2, 0.75, 0.24, s * (HALF + 0.1), 1.83, CAB[0] + 0.14)),                 // the loader arms' towers
      // the loader arms: from the towers forward over the front wheels and down to the bucket
      ...[-1, 1].map(s => {
        const top = [[CAB[0] + 0.02, 2.22], [1.9, 1.56], [2.47, 1.02]], bot = top.slice().reverse().map(([z, y]) => [z, y - 0.2]);
        const shape = new THREE.Shape([...top, ...bot].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(s * (HALF + 0.16) + 0.06, 0, 0);
      }),
      new THREE.CylinderGeometry(0.07, 0.07, 2 * (HALF + 0.16), 8).rotateZ(Math.PI / 2).translate(0, 1.14, 2.3),  // their cross tube
      // the mudguards over the wheels: flat caps round the tyres' tops
      ...[-1, 1].flatMap(s => [
        flare(RZ, RR, RR + 0.03, RR + 0.08, RTW + 0.04).translate(s * (RX + RTW / 2 + 0.02) + (s > 0 ? 0 : RTW + 0.04), 0, 0),
        flare(FZ, FR, FR + 0.03, FR + 0.07, FTW + 0.04).translate(s * (FX + FTW / 2 + 0.02) + (s > 0 ? 0 : FTW + 0.04), 0, 0),
      ]),
      // the bucket on the front: a back plate, a floor out to the cutting edge, and a cheek each end
      (() => {
        const shape = new THREE.Shape([[2.4, 1.04], [2.4, 0.32], [2.5, 0.22], [2.85, 0.24], [2.85, 0.36], [2.53, 0.31], [2.47, 0.37], [2.47, 1.04]].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 2 * car.hw - 0.06, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(car.hw - 0.03, 0, 0);
      })(),
      ...[-1, 1].map(s => {
        const shape = new THREE.Shape([[2.4, 1.04], [2.4, 0.32], [2.85, 0.24], [2.85, 0.4], [2.56, 0.8]].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(s * (car.hw - 0.03) + (s > 0 ? 0.03 : 0), 0, 0);
      }),
      // the digging arm folded for the road: the boom up behind the cab, the dipper down behind it, the small bucket curled in
      (() => {
        const front = [[-1.62, 1.3], ...curve([-1.62, 1.3], [-1.9, 2.0], [-1.95, 2.6], [-1.9, 3.0], 4)];
        const back = [[-1.92, 1.3], ...curve([-1.92, 1.3], [-2.2, 2.0], [-2.26, 2.6], [-2.16, 3.06], 4)];
        const shape = new THREE.Shape([...front, ...back.reverse()].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: false, curveSegments: 1 }).rotateY(-Math.PI / 2).translate(0.13, 0, 0);
      })(),
      (() => {
        const shape = new THREE.Shape([[-2.08, 3.0], [-2.3, 3.08], [-2.66, 1.12], [-2.46, 1.08]].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.1, 0, 0);
      })(),
      bx(0.3, 0.2, 0.12, 0, 3.0, -2.06, -0.5),                                                         // the knuckle at the boom's top
    ]), shade)), paint);
    // dark steel: the swing frame and the rear beam, the stabiliser legs and their feet, the small bucket, the grille, the bumper
    parts(group, k + 'steel', steel, () => [
      bx(0.7, 1.0, 0.4, 0, 1.1, BACKZ - 0.2),
      bx(2 * car.hw - 0.2, 0.26, 0.36, 0, 1.3, BACKZ - 0.18),
      ...[-1, 1].flatMap(s => [bx(0.16, 0.95, 0.18, s * (car.hw - 0.2), 0.95, BACKZ - 0.22), bx(0.34, 0.05, 0.36, s * (car.hw - 0.2), 0.47, BACKZ - 0.22)]),
      (() => {
        const shape = new THREE.Shape([[-2.42, 1.16], [-2.85, 1.2], [-2.8, 0.8], [-2.55, 0.74]].map(([z, y]) => new THREE.Vector2(z, y)));
        return new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.3, 0, 0);
      })(),
      bx(0.78, 0.4, 0.03, 0, 1.22, FACE + BEV + 0.012),
      bx(BW + 0.04, 0.16, 0.1, 0, 0.62, FACE + BEV + 0.03),
      ...[-1, 1].map(s => bx(0.05, 0.14, 0.14, s * (CW / 2 + 0.08), 2.5, CAB[0] + 0.02)),               // the mirrors on the cab's front posts
    ]);
    // chrome: the boom ram and the dipper ram, the stack pipe (dark at its top)
    // (each laid against its arm: the boom ram from the swing frame's top up the boom's front, the bucket ram down the dipper's back)
    parts(group, k + 'chrome', CHROME, () => [
      rod([0, 1.5, -1.62], [0, 2.62, -1.95], 0.06, 8),
      rod([0, 2.95, -2.365], [0, 1.45, -2.64], 0.05, 8),
    ]);
    parts(group, k + 'stack', TRIM, () => [new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8).translate(0.42, 1.95, 1.2)]);
    // ALL the glass from the cab's own side profile (cabinGlass): a door window and a rear quarter a side, the screen, the back glass
    const INS = { aPillar: 0.09, roof: 0.08, cPillar: 0.09 };
    const ARGS = { from: 0, to: cab.length - 1, half: CW / 2, grow: BEV, inset: INS, lift: BEV + 0.008, sideLift: 0.008 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 1.72, sideInset: 0.12, windows: [[-0.5, 1], [-2, -0.6]] });
    const screen = cabinGlass(cab, { ...ARGS, belt: 1.62, sideInset: 0.12 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the lamps: square headlamps either side of the grille, ambers under them; tail lamps and ambers on the rear beam's back face,
    // between the swing frame and the stabiliser legs
    const FL = FACE + BEV + 0.016, BL = BACKZ - 0.36 - 0.01;
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.18, 0.14, 0.03, s * 0.55, 1.32, FL)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 0.56, 1.3, BL)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.06, 0.03, s * 0.55, 1.16, FL)),
      ...[-1, 1].map(s => bx(0.1, 0.12, 0.03, s * 0.74, 1.3, BL)),
    ]);
    // the beacon on the roof (a prop: a chosen roof cosmetic hides it)
    const beacon = parts(group, k + 'beacon', AMBER, () => [new THREE.CylinderGeometry(0.08, 0.1, 0.16, 10).translate(0.5, ROOF + BEV + 0.16, -0.9)]);
    beacon.userData.prop = 'roof';
    for (const s of [-1, 1]) {
      wheel(group, k + 'r', RR, RTW, s * RX, RZ);
      wheel(group, k + 'f', FR, FTW, s * FX, FZ);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Car Transporter (a rigid two-deck car transporter lorry, 1990s) ------------------------------------------------
  // A flat-fronted cab-over cab with a big windscreen and a dark grille, and behind it two long steel decks, one over the other on
  // upright posts, each carrying two plain cars nose to tail (one load mesh in four colours, a prop: a chosen cargo cosmetic
  // hides it). A front axle under the cab and a tandem at the back, a light bar with the tail lamps across the rear.
  cartransporter: (car) => {
    const group = new THREE.Group();
    const k = 'cartrans';
    const R = 0.5, TW = 0.3, WX = car.hw - TW / 2, FZ = 4.45, RZ = [-2.4, -3.6];
    const BEV = 0.06, CW = 2.32, HALF = CW / 2, NOSE = 5.2, CABZ = 3.5, ROOF = 2.95, BELT = 1.85, AY = 0.55;
    const LOWER = 1.08, UPPER = 2.38, DECKF = 3.32, DECKR = -5.27, DW = 2.3;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const steel = keep(lambert(0x5c6066));
    // the cab: its face near upright, the screen leaning back a little, a flat roof; an arch over the front wheel
    const WSF = [NOSE + 0.01, BELT - 0.05], WST = [NOSE - 0.08, ROOF - 0.12];
    const cab = [[NOSE, AY], WSF, WST, [NOSE - 0.2, ROOF], [CABZ + 0.1, ROOF], [CABZ, ROOF - 0.1], [CABZ, AY], ['arc', FZ, AY, R + 0.1]];
    const body = place(group, shared(k + 'body', () => shadeBy(extrudeSide(cab, CW, BEV, null, 1, 0.08), low(0.5, 1.6, [0.62, 0.6, 0.6]))), paint);
    const ARGS = { half: CW / 2, grow: BEV, inset: { aPillar: 0.1, roof: 0.1, cPillar: 0.12 }, lift: BEV + 0.008, sideLift: 0.008, from: 1, to: 6 };
    const glass = cabinGlass(cab, { ...ARGS, belt: BELT, sideInset: 0.14, windows: [[4.35, 9]] });
    const screen = cabinGlass(cab, { ...ARGS, belt: BELT - 0.05, sideInset: 0.14 });
    const rear = cabinGlass(cab, { ...ARGS, belt: 2.0, sideInset: 0.6 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, rear.rear]);
    // the chassis and the decks (steel): two frame rails, the lower deck on them, the posts, the upper deck and the rails along
    // both decks' sides, the light bar and under-run bar at the back
    const posts = [DECKF - 0.05, -0.85, DECKR + 0.05];
    parts(group, k + 'steel', steel, () => [
      bx(DW, 0.06, DECKF - DECKR, 0, LOWER - 0.03, (DECKF + DECKR) / 2),
      bx(DW, 0.06, DECKF - DECKR, 0, UPPER - 0.03, (DECKF + DECKR) / 2),
      ...[-1, 1].flatMap(s => [
        bx(0.08, 0.12, DECKF - DECKR, s * (DW / 2 - 0.04), LOWER + 0.02, (DECKF + DECKR) / 2),
        bx(0.08, 0.12, DECKF - DECKR, s * (DW / 2 - 0.04), UPPER + 0.02, (DECKF + DECKR) / 2),
        ...posts.map(z => bx(0.1, UPPER - LOWER, 0.1, s * (DW / 2 - 0.05), (UPPER + LOWER) / 2, z)),
      ]),
    ]);
    parts(group, k + 'black', TRIM, () => [
      ...[-1, 1].map(s => bx(0.16, 0.3, CABZ - DECKR - 0.1, s * 0.45, 0.85, (CABZ + DECKR) / 2)),   // the frame rails, under the deck
      bx(CW - 0.1, 0.5, 0.03, 0, 1.15, NOSE + BEV + 0.012),                                          // the grille
      bx(CW + 0.04, 0.26, 0.14, 0, 0.6, NOSE + BEV + 0.04),                                          // the bumper
      bx(DW, 0.22, 0.1, 0, 0.78, DECKR - 0.05),                                                       // the light bar
      bx(DW - 0.3, 0.1, 0.08, 0, 0.5, DECKR - 0.04),                                                  // the under-run bar
      ...[-1, 1].flatMap(s => [bx(0.06, 0.07, 0.3, s * (HALF + 0.03), 2.3, NOSE - 0.25), bx(0.06, 0.4, 0.14, s * (HALF + 0.08), 2.15, NOSE - 0.35)]), // the mirrors on their arms
      ...[-1, 1].map(s => bx(0.06, 0.4, 0.06, s * 0.45, 0.78, DECKR + 0.05)),                         // the light bar's hangers
    ]);
    // the load: four plain cars, nose forward, two on each deck (one mesh of vertex colours: paint, dark glass, black wheels)
    const load = place(group, shared(k + 'load', () => {
      const one = (colour, x, y, z) => {
        const tint = (geo, c) => shadeBy(geo, () => new THREE.Color(c).toArray());
        const bodyG = sideSolid([[1.85, 0.24], [1.88, 0.6], [1.2, 0.72], [0.5, 1.12], [-1.15, 1.12], [-1.85, 0.76], [-1.88, 0.24]], -0.78, 0.78);
        const glassG = sideSolid([[1.2, 0.74], [0.52, 1.1], [-1.15, 1.1], [-1.87, 0.77]], -0.79, 0.79);
        const wheelsG = [-1, 1].flatMap(sx => [1.25, -1.25].map(wz => new THREE.CylinderGeometry(0.28, 0.28, 0.16, 8).rotateZ(Math.PI / 2).translate(sx * 0.7, 0.28, wz)));
        return [tint(bodyG, colour), tint(glassG, 0x1c2330), ...wheelsG.map(g => tint(g, 0x161616))].map(g => plainColour(g).translate(x, y, z));
      };
      return merge2([...one(0xc8202a, 0, LOWER, 1.4), ...one(0xe8e8e4, 0, LOWER, -3.0), ...one(0x8a9aa8, 0, UPPER, 1.25), ...one(0x2a6a3a, 0, UPPER, -3.1)]);
    }), new THREE.MeshLambertMaterial({ vertexColors: true }));
    load.userData.prop = 'cargo';
    // the lamps: square headlamps in the bumper's ends, ambers beside them; tail lamps and ambers on the light bar
    const FL = NOSE + BEV + 0.11 + 0.012, BL = DECKR - 0.1 - 0.012;
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.26, 0.14, 0.03, s * 0.78, 0.6, FL)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.22, 0.14, 0.03, s * 0.78, 0.78, BL)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.12, 0.12, 0.03, s * 1.03, 0.6, FL)),
      ...[-1, 1].map(s => bx(0.12, 0.14, 0.03, s * 1.02, 0.78, BL)),
    ]);
    for (const s of [-1, 1]) for (const z of [FZ, ...RZ]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
