// ---- car ideas' models, batch M1: the Mining Haul Truck (ideasBatchM1.js) ------------------------------------------------------
// An ultra-class rigid mining dump truck (after the Caterpillar 797F), squeezed into the game's 3 m width cap: its length and height
// kept near the real truck's proportions, its width (9.75 m real) folded in, so it reads as a giant beside the road cars. Built as the
// approved Junker and Commuter are: plain shapes, one painted mesh shaded darker low down (vertex colours), flat dark glass a few mm
// proud, parts that share a material and never move merged into one mesh, plain chunky wheels (a tyre and a hub disc, meshes of
// their own so the showroom's suspension finds them). NO textures, no panel lines, no people.
// Each builder takes the idea's entry and returns a group (nose to local +z) with userData.body (the paint), animate and livery.
// Helpers: ideaModelsDkit.js. State-free.
import * as THREE from 'three';
import {
  TYRE, HUB, TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx,
  extrudeSide, shadeBy, low, cabinGlass,
} from './ideaModelsDkit.js';

// a round rod from [x0, y0, z0] to [x1, y1, z1] (a hoist ram, a handrail post)
const rod3 = (r, a, b, seg = 8) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};
// a big wheel: a fat tyre and a hub disc (each its own mesh: the suspension finds the tyre as a disc on its side)
const bigWheel = (parent, key, R, width, x, z, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.56, R * 0.56, width + 0.02, 12).rotateZ(Math.PI / 2)), HUB, x, R, z);
};

export const IDEA_MODELS_BATCH_M1 = {
  // ---- the Mining Haul Truck (after the Caterpillar 797F) ----------------------------------------------------------------------
  // Two axles of giant tyres (singles in front, duals behind) under a full-width upper deck; on the deck the operator's cab on the
  // left, the engine's cowl in the middle, a handrail across the front; a diagonal stairway climbing across the dark radiator grille;
  // a bumper block with square lamps each side of it. Behind, the huge dump body: a deep tray (empty, its floor sweeping up into a
  // tail lip, ribs down its sides), its front wall rising into the canopy that shields the cab. Chrome hoist rams between the axles,
  // tail lamps on the frame's end under the body's overhang.
  haultruck: (car) => {
    const group = new THREE.Group(), k = 'haul';
    const R = 0.88, FW = 0.56, RW = 0.5, AF = 1.9, AR = -1.2, HALF = 1.5;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const DECK = 1.95, DECKT = 2.07, CANOPY = 3.36, FRONT = 2.86;
    // the cab: on the deck's left (+x), its windscreen raked a little, a flat roof under the canopy
    const CX = 0.94, CHALF = 0.5, CAB_TAPER = [2.5, 3.12, 0.03];
    const WSF = [2.62, 2.44], WST = [2.48, 3.12], CBT = [1.3, 3.12], CBB = [1.3, 2.5];
    const cab = [[1.3, DECKT - 0.02], [2.62, DECKT - 0.02], WSF, WST, CBT, CBB];
    const cabGeo = extrudeSide(cab, CHALF * 2, 0.03, CAB_TAPER, 1, 0.03).translate(CX, 0, 0);
    // the dump body's side walls (a profile along the car), the floor in two slopes, the front wall up to the canopy
    const wall = [[0.9, 1.8], [-1.9, 1.76], [-2.96, 2.16], [-2.96, 2.6], [-2.3, 3.16], [0.9, CANOPY]];
    const floor = (z0, y0, z1, y1) => {
      const len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z0 - z1);
      return bx(2.8, 0.1, len, 0, (y0 + y1) / 2, (z0 + z1) / 2, a);
    };
    const painted = merge([
      // the dump body
      ...[-1, 1].map(s => extrudeSide(wall, 0.12, 0.02, null, 1, 0.02).translate(s * (HALF - 0.08), 0, 0)),
      floor(0.86, 1.88, -1.9, 1.86), floor(-1.9, 1.86, -2.94, 2.24),
      bx(2.98, CANOPY - 1.8, 0.16, 0, (CANOPY + 1.8) / 2, 0.86),                             // the front wall
      bx(3.0, 0.14, 2.14, 0, CANOPY + 0.07, 1.86),                                          // the canopy over the cab
      ...[-1, 1].flatMap(s => [0.1, -0.85, -1.8].map(z => bx(0.06, 1.0, 0.2, s * (HALF - 0.03), 2.38, z))), // ribs down the sides
      // the deck and what stands on it
      bx(3.0, DECKT - DECK, 2.0, 0, (DECK + DECKT) / 2, 1.96),                               // the deck
      cabGeo,
      bx(0.86, 0.46, 1.7, -0.12, DECKT + 0.23, 1.85),                                       // the engine's cowl
      bx(1.82, 1.0, 0.3, 0, 1.45, FRONT - 0.15),                                            // the bumper block under the deck
      // the handrail across the deck's front and down its right side (posts and a top rail)
      ...[-1.44, -0.9, -0.36].map(x => rod3(0.022, [x, DECKT, 2.92], [x, DECKT + 0.55, 2.92], 5)),
      rod3(0.025, [-1.46, DECKT + 0.55, 2.92], [-0.3, DECKT + 0.55, 2.92], 5),
      rod3(0.025, [-1.46, DECKT + 0.55, 2.92], [-1.46, DECKT + 0.55, 1.1], 5),
      rod3(0.022, [-1.46, DECKT, 1.1], [-1.46, DECKT + 0.55, 1.1], 5),
      // the stairway: two stringers climbing across the grille from the lower right to the deck, its treads between
      ...[0, 0.26].map(dz => rod3(0.03, [-0.8, 0.8, FRONT + 0.06 + dz], [0.36, DECK, FRONT + 0.06 + dz], 6)),
      ...[0.2, 0.45, 0.7].map(t => bx(0.22, 0.04, 0.3, -0.8 + t * 1.16, 0.8 + t * (DECK - 0.8) + 0.02, FRONT + 0.19)),
    ]);
    const body = place(group, shared(k + 'paint', () => shadeBy(painted, (y) => {
      const c = low(0.4, 1.9, [0.62, 0.58, 0.5])(y);
      return c;
    })), paint);
    // the cab's glass, from its own side profile (cabinGlass: one inset outline, level tops), moved out to the cab's place
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.08 };
    const ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(CBB), half: CHALF, taper: CAB_TAPER, grow: 0.03, inset: INS, lift: 0.036, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 2.45, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear].map(g => g.translate(CX, 0, 0)));
    // dark: the frame, the axle housing, the grille, the air cleaners on the deck, the mirrors, the mudflaps behind the front tyres
    parts(group, k + 'dark', TRIM, () => [
      ...[-1, 1].map(s => bx(0.18, 0.5, 5.2, s * 0.36, 1.0, 0.05)),                         // the frame rails
      bx(1.0, 0.36, 0.3, 0, 1.0, -2.5),                                                     // the frame's rear crossmember
      bx(1.5, 0.4, 0.5, 0, R, AR),                                                          // the rear axle's housing
      bx(1.6, 0.3, 0.4, 0, R, AF),                                                          // the front axle's beam
      bx(0.86, 0.72, 0.04, 0, 1.47, FRONT + 0.005),                                         // the grille
      ...[-1.18, -0.92].map(x => new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10).translate(x, DECKT + 0.21, 2.5)), // air cleaners
      bx(0.05, 0.22, 0.14, 1.47, 2.62, 2.7), bx(0.05, 0.22, 0.14, -1.47, 2.62, 2.85),        // mirrors
      rod3(0.015, [1.42, 2.62, 2.62], [1.47, 2.62, 2.7], 4), rod3(0.015, [-1.42, 2.62, 2.85], [-1.47, 2.62, 2.85], 4),
    ]);
    // the grille's bars, and the hoist rams (chrome) between the axles
    parts(group, k + 'chrome', CHROME, () => [
      ...[1.22, 1.42, 1.62].map(y => bx(0.8, 0.04, 0.03, 0, y, FRONT + 0.02)),
      ...[-1, 1].map(s => rod3(0.07, [s * 0.5, 1.0, 0.6], [s * 0.5, 1.8, 0.1], 8)),
    ]);
    // the lamps: square headlamps on the bumper block either side of the grille, ambers under them; tail lamps and ambers on the
    // frame's rear crossmember (the tail lamp brakes whole)
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.3, 0.16, 0.03, s * 0.66, 1.7, FRONT + 0.012)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.2, 0.08, 0.03, s * 0.66, 1.42, FRONT + 0.012)),
      ...[-1, 1].map(s => bx(0.12, 0.1, 0.03, s * 0.42, 1.0, -2.665)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.12, 0.03, s * 0.22, 1.0, -2.665)));
    // the wheels: singles in front, duals behind (the outer tyre's face at the width cap)
    for (const s of [-1, 1]) {
      bigWheel(group, k + 'f', R, FW, s * (HALF - 0.012 - FW / 2), AF);
      bigWheel(group, k + 'r', R, RW, s * (HALF - 0.012 - RW / 2), AR);
      bigWheel(group, k + 'r', R, RW, s * (HALF - RW * 1.5 - 0.03), AR);
    }
    for (const part of group.children) part.position.z -= 0.1; // (the whole truck 10 cm back: its stairway's front and its tail lip even about the hitbox)
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Bulldozer (after the Caterpillar D9) --------------------------------------------------------------------------------
  // A crawler dozer: two chunky track blocks (no wheels: the track's outline is the high-drive triangle, its sprocket raised at the
  // back, a steel roller frame along its foot, hub discs on the idler and the sprocket), a long engine hood with a dark grille, an
  // exhaust stack and a pre-cleaner on it, a square cab glazed all round under a flat roof with an amber beacon, the fuel tank
  // behind it and a single-shank ripper off the back. In front, the big curved blade on push arms outside the tracks, two chrome
  // lift rams from the hood. It has no springs to show (no wheels on the floor): the showroom does not bounce it (as the Snowcat).
  bulldozer: (car) => {
    const group = new THREE.Group(), k = 'dozer';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const rubber = new THREE.MeshLambertMaterial({ color: 0x2a2a2c }), steel = new THREE.MeshLambertMaterial({ color: 0x6c7076 });
    for (const m of [rubber, steel]) m.userData.shared = true;
    const beacon = new THREE.MeshBasicMaterial({ color: 0xffa31a });
    const TX = 1.04, TWID = 0.6, BODYY = 1.0, HOODF = 1.5, CABR = -1.3, CABF = 0.12, ROOF = 2.8;
    // the tracks: the high-drive outline (ground run, front idler, top run, the sprocket raised at the back), extruded TWID wide
    const TRACK = [[-1.2, 0.0], [1.3, 0.0], [1.6, 0.28], [1.6, 0.42], [1.42, 0.7], [-0.45, 0.86], [-0.88, 1.5], [-1.12, 1.66],
      [-1.42, 1.6], [-1.6, 1.3], [-1.6, 0.4]];
    parts(group, k + 'track', rubber, () => [-1, 1].map(s => extrudeSide(TRACK, TWID, 0.03, null, 1, 0.03).translate(s * TX, 0.03, 0)));
    // steel: the roller frame along each track's foot (on its outer face), the idler's and the sprocket's hubs, the blade's cutting edge
    const OUT = TX + TWID / 2;
    parts(group, k + 'steel', steel, () => [
      ...[-1, 1].flatMap(s => [
        bx(0.04, 0.32, 2.5, s * (OUT + 0.01), 0.36, 0.0),
        new THREE.CylinderGeometry(0.26, 0.26, 0.05, 12).rotateZ(Math.PI / 2).translate(s * (OUT + 0.015), 0.36, 1.32),
        new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12).rotateZ(Math.PI / 2).translate(s * (OUT + 0.015), 1.22, -1.18),
      ]),
      bx(3.0, 0.08, 0.12, 0, 0.06, 2.3),
    ]);
    // the paint: the hood, the cab's shell, the fenders over the tracks, the fuel tank, the roof, the blade
    const hood = [[CABF, BODYY - 0.3], [HOODF, BODYY - 0.3], [HOODF, 1.82], [HOODF - 0.1, 1.94], [CABF, 2.0]];
    const WSF = [CABF, 1.9], WST = [CABF - 0.06, ROOF], CBB = [CABR, 1.9];
    const cab = [[CABR, BODYY], [CABF, BODYY], WSF, WST, [CABR, ROOF], CBB];
    const BLADE = [[2.36, 0.08], [2.24, 0.32], [2.17, 0.62], [2.2, 0.96], [2.3, 1.22], [2.38, 1.3], [2.02, 1.3], [1.94, 0.2]];
    const painted = merge([
      extrudeSide(hood, 1.2, 0.04, null, 1, 0.04),
      extrudeSide(cab, 1.4, 0.03, null, 1, 0.03),
      ...[-1, 1].map(s => bx(0.66, 0.08, 1.7, s * TX, 0.95, 0.5)),                         // the fenders over the tracks' top runs
      bx(1.3, 0.75, 0.42, 0, BODYY + 0.36, CABR - 0.23),                                    // the fuel tank behind the cab
      bx(1.56, 0.08, 1.56, 0, ROOF + 0.04, (CABR + CABF) / 2),                              // the cab's roof, overhanging a little
      extrudeSide(BLADE, 3.0, 0.03, null, 1, 0.03),                                         // the blade, its face curved
    ]);
    const body = place(group, shared(k + 'paint', () => shadeBy(painted, low(0.1, 1.6, [0.62, 0.58, 0.5]))), paint);
    // the cab's glass: glazed all round from its own profile (cabinGlass), one big side window a side, the screen and the back glass
    const ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(CBB), half: 0.7, grow: 0.03, inset: { aPillar: 0.08, roof: 0.06, cPillar: 0.08 }, lift: 0.036, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 1.95, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
    // dark: the main frame between the tracks, the grille, the exhaust and pre-cleaner, the push arms, the ripper
    const beam = (w, t, [z0, y0], [z1, y1], x = 0) => {
      const len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z0 - z1);
      return bx(w, t, len, x, (y0 + y1) / 2, (z0 + z1) / 2, a);
    };
    parts(group, k + 'dark', TRIM, () => [
      bx(1.44, 0.6, 3.1, 0, 0.62, 0.0),                                                     // the main frame (no void under the body)
      bx(0.96, 0.62, 0.03, 0, 1.3, HOODF + 0.045),                                          // the grille
      new THREE.CylinderGeometry(0.07, 0.08, 0.62, 10).translate(-0.3, 2.22, 1.05),         // the exhaust stack
      new THREE.CylinderGeometry(0.13, 0.13, 0.3, 10).translate(0.3, 2.07, 1.15),           // the pre-cleaner
      ...[-1, 1].map(s => beam(0.12, 0.16, [2.0, 0.5], [0.0, 0.42], s * (OUT + 0.07))),     // the push arms, outside the tracks
      ...[-1, 1].map(s => beam(0.12, 0.14, [-1.5, 0.95], [-2.2, 1.0], s * 0.4)),            // the ripper's frame,
      bx(0.94, 0.2, 0.2, 0, 1.0, -2.2),                                                     // its beam across
      beam(0.14, 0.18, [-2.22, 1.05], [-2.4, 0.22]),                                        // and the shank, down and back to its tip
      bx(0.12, 0.14, 0.24, 0, 0.16, -2.48, -0.5),
    ]);
    // chrome: the blade's lift rams (hood to blade) and the ripper's rams
    parts(group, k + 'chrome', CHROME, () => [
      ...[-1, 1].map(s => rod3(0.055, [s * 0.5, 1.7, 1.42], [s * 0.5, 1.1, 2.0])),
      ...[-1, 1].map(s => rod3(0.045, [s * 0.4, 1.5, -1.5], [s * 0.4, 1.12, -2.12])),
    ]);
    // the lamps: two square lamps on the hood's front over the grille, two tail lamps on the fuel tank's back (each brakes whole)
    const TANKB = CABR - 0.44;
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.18, 0.12, 0.03, s * 0.38, 1.76, HOODF + 0.055)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 0.5, 1.6, TANKB - 0.006)));
    // the beacon on the cab's roof (a roof item: hidden when a roof prop is chosen, render/propcosmetic.js), its base dark
    const flasher = new THREE.Group();
    flasher.userData.prop = 'roof';
    place(flasher, shared(k + 'beaconbase', () => new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10)), TRIM, -0.45, ROOF + 0.105, -0.9);
    place(flasher, shared(k + 'beacon', () => new THREE.CylinderGeometry(0.075, 0.085, 0.13, 10)), beacon, -0.45, ROOF + 0.195, -0.9);
    group.add(flasher);
    for (const part of group.children) part.position.z += 0.06; // (blade front and ripper tip even about the hitbox)
    group.userData = {
      body, noBounce: true,
      animate: (t) => beacon.color.setHex(Math.sin(t * 8) > 0 ? 0xffa31a : 0x7a4a10),
      livery: () => {},
    };
    return group;
  },

  // ---- the Gritter (a UK council road gritter) ---------------------------------------------------------------------------------
  // A two-axle cab-over lorry carrying a salt-spreader body: a deep V hopper with a grid over its top, the conveyor's chute at its
  // foot behind and the spinner disc under it (it spins), an amber light bar on the cab's roof and two amber beacons on the hopper's
  // back corners (they flash), a red and yellow chevron board across the tail (the batch's one texture, 128 x 32: the chevrons do not
  // read as boxes), number plates front and back. A dark grille and bumper, square headlamps in the bumper's corners.
  gritter: (car) => {
    const group = new THREE.Group(), k = 'grit';
    const R = 0.5, FTW = 0.32, RTW = 0.42, AF = 2.25, AR = -1.35, HALF = 1.24;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const beacons = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0xffa31a }));
    const FRONT = 3.22, TAILZ = -2.62, ROOF = 3.0, TAPER = [2.0, ROOF, 0.05];
    const WSF = [FRONT - 0.02, 1.86], WST = [FRONT - 0.2, 2.86], CBB = [1.88, 1.9];
    const cab = [[1.88, 0.9], [FRONT, 0.9], [FRONT, 1.76], WSF, WST, [FRONT - 0.32, ROOF], [1.88, ROOF], CBB];
    // the hopper: a V section along the body, its top rim at 3.0
    const vee = () => {
      const s = new THREE.Shape([[-0.5, 1.22], [0.5, 1.22], [1.2, 2.05], [1.2, 2.98], [-1.2, 2.98], [-1.2, 2.05]].map(([x, y]) => new THREE.Vector2(x, y)));
      return new THREE.ExtrudeGeometry(s, { depth: 4.0, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 1 }).translate(0, 0, TAILZ - 0.06 + 0.03);
    };
    const painted = merge([
      extrudeSide(cab, HALF * 2, 0.05, TAPER, 1, 0.07),
      vee(),
      ...[0.45, -0.25, -0.95, -1.65].map(z => bx(2.4, 0.08, 0.12, 0, 3.08, z)),            // bars across its top, over the grid
      ...[-1, 1].map(s => bx(0.1, 0.14, 4.06, s * 1.2, 3.06, TAILZ + 1.99)),                // the rim along each side
      ...[TAILZ - 0.03, TAILZ + 4.0].map(z => bx(2.5, 0.14, 0.1, 0, 3.06, z)),               // and across its ends
    ]);
    const body = place(group, shared(k + 'paint', () => shadeBy(painted, low(0.6, 2.2, [0.62, 0.58, 0.5]))), paint);
    // the grid over the hopper's top (dark, a little under the rim) and the cab's glass
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 };
    const ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(CBB), half: HALF, taper: TAPER, grow: 0.05, inset: INS, lift: 0.056, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 1.95, sideInset: 0.55, windows: [[2.08, 9]] }), screen = cabinGlass(cab, { ...ARGS, belt: WSF[1] + 0.04, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front]);
    const FZ = FRONT + 0.05;
    parts(group, k + 'dark', TRIM, () => [
      bx(2.32, 0.04, 3.96, 0, 3.03, TAILZ + 1.99),                                          // the grid over the top (dark), under the bars
      ...[-1, 1].map(s => bx(0.16, 0.3, 5.6, s * 0.5, 0.9, -0.0)),                          // the chassis rails
      bx(1.3, 0.12, 4.1, 0, 1.16, TAILZ + 2.0),                                             // the hopper's subframe
      bx(2.5, 0.3, 0.2, 0, 0.72, FZ + 0.06),                                                // the bumper
      bx(1.4, 0.5, 0.03, 0, 1.24, FZ),                                                      // the grille
      bx(0.5, 0.42, 0.3, 0, 1.0, TAILZ - 0.14),                                             // the chute at the hopper's foot
      new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8).translate(0, 0.78, TAILZ - 0.22),     // the spinner's shaft
      ...[-1, 1].map(s => bx(0.5, 0.06, 0.8, s * (HALF - 0.25), 1.06, AR)),                // the mudguards over the rear wheels
      ...[-1, 1].flatMap(s => [bx(0.05, 0.42, 0.18, s * 1.33, 2.2, FRONT - 0.15), rod3(0.015, [s * 1.2, 2.3, FRONT - 0.15], [s * 1.31, 2.3, FRONT - 0.15], 4)]), // mirrors
      bx(2.36, 0.5, 0.08, 0, 1.06, TAILZ - 0.06),                                           // the rear board's backing
      bx(1.5, 0.06, 0.3, 0, ROOF + 0.07, FRONT - 0.7),                                      // the light bar's base
    ]);
    // the spinner disc with its vanes (spins), under the chute
    const spinner = place(group, shared(k + 'spinner', () => merge([
      new THREE.CylinderGeometry(0.3, 0.3, 0.03, 14),
      ...[0, 1, 2, 3].map(i => bx(0.04, 0.06, 0.56, 0, 0.04, 0, 0, i * Math.PI / 4)),
    ])), steelMat(), 0, 0.6, TAILZ - 0.22);
    // the chevron board across the tail (a small texture drawn in code), the plates
    const chevrons = new THREE.MeshLambertMaterial({ map: chevronMap() });
    place(group, shared(k + 'chevrons', () => new THREE.PlaneGeometry(1.74, 0.36).rotateY(Math.PI)), chevrons, 0, 1.06, TAILZ - 0.106);
    const plateF = keepMat(0xe8e6dc), plateR = keepMat(0xf2c81e);
    parts(group, k + 'plateF', plateF, () => [bx(0.52, 0.13, 0.02, 0, 0.72, FZ + 0.17)]).userData.plate = 'front';
    parts(group, k + 'plateR', plateR, () => [bx(0.52, 0.13, 0.02, 0, 1.5, TAILZ - 0.072)]).userData.plate = 'rear';
    // the lamps: square headlamps in the bumper's corners with ambers outboard; tail lamps on the rear board's ends (each brakes
    // whole) with ambers inboard
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.26, 0.14, 0.03, s * 0.8, 0.74, FZ + 0.172)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.14, 0.03, s * 1.08, 0.74, FZ + 0.172)),
      ...[-1, 1].map(s => bx(0.14, 0.1, 0.03, s * 1.04, 0.92, TAILZ - 0.115)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.14, 0.03, s * 1.04, 1.17, TAILZ - 0.115)));
    // the beacons: two on the cab roof's light bar (a roof item: hidden when a roof prop is chosen) and two on the hopper's back corners
    const bar = new THREE.Group();
    bar.userData.prop = 'roof';
    for (const s of [-1, 1]) place(bar, shared(k + 'beacon', () => new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10)), beacons[s > 0 ? 0 : 1], s * 0.6, ROOF + 0.17, FRONT - 0.7);
    group.add(bar);
    for (const s of [-1, 1]) place(group, shared(k + 'beacon', () => new THREE.CylinderGeometry(0.08, 0.09, 0.14, 10)), beacons[s > 0 ? 1 : 0], s * 1.08, 3.13, TAILZ + 0.1);
    for (const s of [-1, 1]) {
      bigWheel(group, k + 'f', R, FTW, s * (HALF - FTW / 2 + 0.02), AF);
      bigWheel(group, k + 'r', R, RTW, s * (HALF - RTW / 2 + 0.02), AR);
    }
    for (const part of group.children) part.position.z -= 0.16; // (bumper front and chevron board even about the hitbox)
    group.userData = {
      body,
      animate: (t) => {
        spinner.rotation.y = t * 9;
        const on = Math.sin(t * 8) > 0;
        beacons[0].color.setHex(on ? 0xffa31a : 0x7a4a10);
        beacons[1].color.setHex(on ? 0x7a4a10 : 0xffa31a);
      },
      livery: () => {},
    };
    return group;
  },
};

// the gritter's materials and its one texture (shared, made once)
let STEEL = null, CHEVRONS = null;
const PLATES = new Map();
const steelMat = () => { if (!STEEL) { STEEL = new THREE.MeshLambertMaterial({ color: 0x8a9096 }); STEEL.userData.shared = true; } return STEEL; };
const keepMat = (hex) => {
  if (!PLATES.has(hex)) { const m = new THREE.MeshLambertMaterial({ color: hex }); m.userData.shared = true; PLATES.set(hex, m); }
  return PLATES.get(hex);
};
// red and fluorescent yellow chevrons pointing up (a UK lorry's rear marking), 128 x 32
const chevronMap = () => {
  if (CHEVRONS) return CHEVRONS;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const g = canvas.getContext('2d');
  g.fillStyle = '#e6f01e'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#d0201c';
  // (stripes leaning in from both ends, meeting at the middle: chevrons pointing up, mirrored)
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
    const x = 64 + side * (i * 16 + 4), dx = side * 10;
    g.beginPath(); g.moveTo(x + dx, 32); g.lineTo(x + dx + side * 8, 32); g.lineTo(x + side * 8, 0); g.lineTo(x, 0); g.closePath(); g.fill();
  }
  CHEVRONS = new THREE.CanvasTexture(canvas);
  CHEVRONS.colorSpace = THREE.SRGBColorSpace;
  CHEVRONS.userData.shared = true;
  return CHEVRONS;
};
