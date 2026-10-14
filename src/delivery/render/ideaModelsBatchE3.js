// ---- car ideas' models, batch E3: the Crane Lorry and the Moor Rover (ideasBatchE3.js) --------------------------------------
// Two vehicles drawn as ideas: a slow, wide flatbed lorry with a hydraulic crane folded down behind the cab (a cab-over
// cab, a bare steel deck with low drop sides, a pedestal crane with its boom folded back on itself, tucked-up stabiliser
// legs, concrete blocks for a load; no figures, nothing armed) and an early two-door tall 4x4 estate (after the first
// Range Rover, 1970: a boxy two-door body, a high waistline, a flat bonnet, a low wide glasshouse, rectangular lamps in
// the grille, black bumpers, a split tailgate shown by colour blocking).
// Built as the approved Junker and Commuter are: bodies from extrusions of their side views (one bevel segment), dark glass
// laid a few mm proud, parts that share a material and never move merged into one mesh, plain chunky wheels (a tyre and a hub
// disc, meshes of their own so the showroom's suspension finds them), paint shaded darker low down (vertex colours), character
// from flat colours and colour blocking only: NO textures on either car (the owner, 14-Oct: default to none). No image files, no
// panel lines, no people.
// Each builder takes the idea's entry and returns a group (nose to local +z) with userData.body (the paint: every painted
// part of the lorry shares that one mesh), animate and livery. Helpers: ideaModelsDkit.js. State-free.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, lambert, shared, place, merge, parts, bx,
  curve, extrudeSide, narrowAt, panel, sideGlass, slopeGlass, shadeBy, low, wheel,
} from './ideaModelsDkit.js';

// a round rod from [z0, y0] to [z1, y1] in the middle of the car (a hydraulic ram, a rope), `x` across
const rod = (r, [z0, y0], [z1, y1], x = 0, seg = 8) => {
  const dz = z1 - z0, dy = y1 - y0;
  return new THREE.CylinderGeometry(r, r, Math.hypot(dz, dy), seg).rotateX(Math.atan2(dz, dy)).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};
// a box along a line from [z0, y0] to [z1, y1] (a crane boom), w across, t thick
const beam = (w, t, [z0, y0], [z1, y1]) => {
  const len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z0 - z1);
  return bx(w, t, len, 0, (y0 + y1) / 2, (z0 + z1) / 2, a);
};

export const IDEA_MODELS_BATCH_E3 = {
  // ---- the Crane Lorry --------------------------------------------------------------------------------------------------
  // A cab-over lorry on three axles (one at the front, a pair at the back), a flat grille with chrome bars and square lamps,
  // a roof beacon, and behind the cab a pedestal crane: a slewing column, a boom raised to the rear and a second boom folded
  // back along it, a ram and a hook on its rope, two stabiliser legs drawn up under the deck. Then a short bed with drop
  // sides and two stacks of concrete blocks, and a red and white hazard strip on the tail board.
  cranelorry: (car) => {
    const group = new THREE.Group(), k = 'crane';
    const R = 0.5, TW = 0.34, WX = car.hw - TW / 2, AF = 2.3, AR1 = -1.0, AR2 = -2.1;
    const BEV = 0.05, HALF = 1.25, FRONT = 3.2, TAIL_Z = -2.9, DECKY = 1.2;
    const TAPER = [2.0, 2.72, 0.05];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [3.17, 1.75], WST = [2.93, 2.62];
    const cab = [
      [1.2, 1.0], [FRONT, 1.0], [FRONT, WSF[1]], WSF, WST, ...curve(WST, [2.9, 2.7], [2.88, 2.72], [2.8, 2.72], 3),
      [1.32, 2.72], [1.2, 2.62],
    ];
    const FZ = FRONT + BEV, BZ = 1.2 - BEV;
    // the crane (its pieces in the paint too): pivot P0 on the turntable, boom 1 up and back to the knuckle K, boom 2 folded
    // forward along it
    const P0 = [0.5, 2.1], K = [-1.5, 2.72], K2 = [-1.5, 2.86], T = [-0.1, 2.66];
    const painted = merge([
      extrudeSide(cab, 2 * HALF, BEV, TAPER, 1, 0.07),
      new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12).translate(0, 1.7, 0.55),               // the slewing column
      bx(0.62, 0.4, 0.7, 0, 2.05, 0.5),                                                   // the turntable
      beam(0.3, 0.3, P0, K), beam(0.22, 0.22, T, K2),                                      // boom 1, boom 2 folded back on it
      bx(0.36, 0.5, 0.36, 0, 2.78, -1.5),                                                  // the knuckle
      ...[-1, 1].flatMap(s => [bx(0.16, 0.85, 0.16, s * 1.2, 0.72, 0.55)]),               // stabiliser legs, drawn up
      bx(2.54, 0.4, 0.07, 0, 1.48, TAIL_Z + 0.035), bx(2.54, 0.4, 0.07, 0, 1.48, -0.15),   // tail board, the board across the bed's front
      ...[-1, 1].map(s => bx(0.07, 0.4, 2.75, s * 1.265, 1.48, -1.525)),                   // the drop sides
    ]);
    const body = place(group, shared(k + 'paint', () => shadeBy(painted, low(1.0, 1.4, [0.7, 0.64, 0.56]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.86), 1.86], [zWS(2.54), 2.54], gx(1.86) - 0.1, gx(2.54) - 0.1, BEV + LIFT),
      ...sideGlass([[[zWS(1.86) - 0.12, 1.86], [1.6, 1.86], [1.6, 2.54], [zWS(2.54) - 0.1, 2.54]]], HALF, TAPER, LIFT),
      panel([[-0.6, 2.0, BZ - LIFT], [0.6, 2.0, BZ - LIFT], [0.58, 2.5, BZ - LIFT], [-0.58, 2.5, BZ - LIFT]]),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(2.1, 0.5, 0.34, 0, 0.78, 3.07),                                                   // the cab's lower front over the axle
      bx(2.6, 0.22, 0.18, 0, 0.74, 3.3),                                                  // front bumper
      bx(1.1, 0.46, 0.03, 0, 1.38, FZ),                                                    // the dark grille panel behind its bars
      ...[-1, 1].map(s => bx(0.14, 0.28, 4.1, s * 0.6, 0.95, -0.8)),                      // chassis rails
      bx(2.6, 0.34, 0.1, 0, 0.95, -2.95),                                                  // rear crossmember
      bx(2.6, 0.14, 4.1, 0, DECKY - 0.07, -0.85),                                           // the steel deck
      bx(1.1, 0.12, 1.0, 0, 1.32, 0.55),                                                   // the crane's base plate
      ...[AF, AR1, AR2].map(z => bx(2.2, 0.14, 0.16, 0, R, z)),                            // axles
      ...[-1, 1].flatMap(s => [bx(0.4, 0.07, 0.4, s * 1.2, 0.37, 0.55), bx(0.3, 0.1, 2.3, s * 1.3, 1.03, -1.55), bx(0.05, 0.46, 0.18, s * 1.37, 2.2, 3.02), bx(0.14, 0.04, 0.05, s * 1.3, 2.05, 3.02)]), // pads, mudguards over the rear wheels, mirrors
      bx(0.2, 0.2, 0.12, 0, 1.92, -0.1),                                                   // the hook block
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      ...[1.22, 1.38, 1.54].map(y => bx(1.1, 0.05, 0.03, 0, y, FZ + 0.02)),
      ...[-1, 1].map(s => bx(0.3, 0.24, 0.03, s * 1.0, 1.27, FZ + 0.005)),                 // the lamps' bezels
      rod(0.06, [0.28, 1.75], [-0.55, 2.3]), rod(0.05, [-1.05, 2.7], [-1.35, 2.9], 0.0), // the boom's rams
      rod(0.016, [-0.1, 2.0], [-0.1, 2.56], 0, 5),                                         // the hook's rope
      new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8).translate(1.1, 2.15, 1.08),           // the exhaust stack
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.24, 0.18, 0.03, s * 1.0, 1.27, FZ + 0.02)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.24, 0.07, 0.03, s * 1.0, 1.1, FZ + 0.005)),
      ...[-1, 1].map(s => bx(0.22, 0.07, 0.03, s * 1.1, 0.85, -3.005)),
    ]);
    parts(group, k + 'beacon', AMBER, () => [new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10).translate(0, 2.8, 2.4)]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.22, 0.14, 0.03, s * 1.1, 1.02, -3.005)));
    // the load: two stacks of concrete blocks on pallets
    parts(group, k + 'blocks', lambert(0x9a9a92), () => [
      bx(1.1, 0.55, 1.1, -0.62, 1.62, -0.85), bx(1.1, 0.55, 1.1, 0.62, 1.62, -0.85), bx(1.1, 0.55, 1.1, 0, 1.62, -2.1), bx(0.9, 0.4, 0.9, 0, 2.1, -2.1),
    ]);
    parts(group, k + 'pallet', lambert(0x6b5036), () => [bx(2.4, 0.07, 1.15, 0, 1.31, -0.85), bx(1.15, 0.07, 1.15, 0, 1.31, -2.1)]);
    // the hazard strip on the tail board: flat red and white blocks (no texture)
    parts(group, k + 'stripr', lambert(0xc4261c), () => [-4, -2, 0, 2, 4].map(i => bx(0.2, 0.26, 0.02, i * 0.2 - 0.0, 1.48, TAIL_Z - 0.01)));
    parts(group, k + 'stripw', lambert(0xe9e6dc), () => [-3, -1, 1, 3].map(i => bx(0.2, 0.26, 0.02, i * 0.2, 1.48, TAIL_Z - 0.01)));
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', R, TW, s * WX, AF, 14);
      wheel(group, k + 'r', R, TW, s * WX, AR1, 14);
      wheel(group, k + 'r', R, TW, s * WX, AR2, 14);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Moor Rover (after the first Range Rover, 1970) -----------------------------------------------------------------
  // A tall boxy two-door estate: a flat bonnet over a black grille with a rectangular lamp each end, a high waistline, a low
  // wide glasshouse (a long door window, a quarter window behind it, a big rear window) under a flat roof, black bumpers,
  // plain wheels standing against the flanks. The split tailgate is colour blocking, not a line: the
  // lower half is a darker block, the upper half the glass above plain paint.
  moorrover: (car) => {
    const group = new THREE.Group(), k = 'moor';
    const R = 0.42, TW = 0.28, WX = car.hw - TW / 2, AF = 1.27, AR = -1.27;
    const BEV = 0.05, BW = 1.88, HALF = BW / 2, NOSE = 2.15, TAILZ = -2.15, ROOF = 1.76;
    const TAPER = [1.2, ROOF, 0.08];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [0.8, 1.2], WST = [0.55, 1.72];
    const outline = [
      [NOSE, 0.4], [NOSE, 0.97], [NOSE - 0.05, 1.05], [0.9, 1.13], WSF, WST, [0.42, ROOF], [-2.05, ROOF], [TAILZ, ROOF - 0.07], [TAILZ, 0.4],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 2, 0.07)]), low(0.4, 0.95, [0.62, 0.57, 0.5]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.28), 1.28], [zWS(1.66), 1.66], gx(1.28) - 0.08, gx(1.66) - 0.08, BEV + LIFT),
      ...sideGlass([
        [[zWS(1.28) - 0.07, 1.28], [-0.3, 1.28], [-0.3, 1.66], [zWS(1.66) - 0.06, 1.66]],   // the door
        [[-0.54, 1.28], [-1.8, 1.28], [-1.8, 1.66], [-0.54, 1.66]],                          // the quarter window
      ], HALF, TAPER, LIFT),
      panel([[-0.72, 1.26, BZ - LIFT], [0.72, 1.26, BZ - LIFT], [0.68, 1.66, BZ - LIFT], [-0.68, 1.66, BZ - LIFT]]),
    ]);
    // the lower tailgate: a darker block (black at a quarter strength, so it follows either paint)
    const shade = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
    shade.userData.shared = true;
    place(group, shared(k + 'gate', () => merge([bx(1.58, 0.56, 0.02, 0, 0.8, BZ - 0.012)])), shade).renderOrder = 1;
    parts(group, k + 'black', TRIM, () => [
      bx(2.02, 0.2, 0.13, 0, 0.46, FZ + 0.04), bx(2.02, 0.2, 0.13, 0, 0.46, BZ - 0.04),      // bumpers
      bx(0.88, 0.34, 0.03, 0, 0.74, FZ),                                                    // the grille's dark face
      ...[-1, 1].flatMap(s => [bx(0.1, 0.03, 0.04, s * 0.99, 1.22, 0.72), bx(0.05, 0.2, 0.12, s * 1.03, 1.22, 0.72)]), // mirrors
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(0.96, 0.4, 0.02, 0, 0.74, FZ - 0.005),                                            // the grille's frame (its face stands proud of it)
      ...[-1, 1].map(s => bx(0.3, 0.2, 0.03, s * 0.72, 0.78, FZ + 0.005)),                 // the lamps' bezels
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.25, 0.15, 0.03, s * 0.72, 0.78, FZ + 0.02)));
    const plateMat = lambert(0xe8e4d0); // (one mesh a plate: render/platecosmetic.js hides each end by userData.plate)
    parts(group, k + 'plateF', plateMat, () => [bx(0.46, 0.12, 0.02, 0, 0.46, FZ + 0.11)]).userData.plate = 'front';
    parts(group, k + 'plateR', plateMat, () => [bx(0.46, 0.12, 0.02, 0, 0.46, BZ - 0.11)]).userData.plate = 'rear';
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.2, 0.07, 0.03, s * 0.72, 0.6, FZ + 0.006)),
      ...[-1, 1].map(s => bx(0.1, 0.12, 0.03, s * 0.84, 0.66, BZ - 0.006)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.1, 0.26, 0.03, s * 0.84, 0.92, BZ - 0.006)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
