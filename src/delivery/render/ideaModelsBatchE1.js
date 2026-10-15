// ---- car ideas' models, batch E1: the Kei Van ------------------------------------------------------
// Two small cars drawn as ideas (ideasBatchE1.js): a rear-engined 1950s egg of a microcar (after the Fiat 500, 1957: a
// round nose with a pair of lamps and a chrome bumper, a dome of a glasshouse, a sloping tail over the engine) and a tall
// narrow cab-over kei van (after the Suzuki Every: a flat face with a raked screen, a box body to the roof line, a
// near-vertical tailgate). Built as the approved Junker and Commuter are: bodies from extrusions of their side views
// (few bevel segments), dark glass laid a few mm proud, parts that share a material and never move merged into one mesh,
// plain chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them), paint shaded
// darker low down (vertex colours), and no texture at all (flat colours, shape and colour blocking). No image files, no panel lines, no wheel wells. Each builder takes the idea's entry and returns a group, front
// facing local +z, with userData.body, userData.animate and userData.livery. Spread into IDEA_MODELS by ideaModels.js.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, curve, extrudeSide,
  shadeBy, low, wheel, cabinGlass,
} from './ideaModelsDkit.js';

const LIFT = 0.006;


export const IDEA_MODELS_BATCH_E1 = {
  // ---- the Kei Van (after the Suzuki Every) --------------------------------------------------------------------------
  // 3.4 m long and 1.56 wide with mirrors, 1.88 tall: a cab-over box. A near-flat face with a black bumper, a dark grille
  // panel between two square lamps (an amber lens under each), a raked screen to a flat roof, door and sliding-door
  // windows, a vertical tailgate with a window, tall tail lamps and a black rear bumper. Mirrors on short arms.
  keivan: (car) => {
    const group = new THREE.Group();
    const k = 'keivan';
    const R = 0.3, TW = 0.16, HALF = 0.72, WX = car.hw - 0.01 - TW / 2, AF = 1.12, AR = -1.31;
    const BEV = 0.05, NOSE = 1.65, TAILZ = -1.65, ROOF = 1.83;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [1.58, 1.08], WST = [1.12, 1.8], TH = [TAILZ, 1.2]; // (TH: a point on the straight tail, the tail glass's foot)
    const outline = [
      [1.62, 0.33], [NOSE, 0.4], [NOSE, 0.98], ...curve([NOSE, 0.98], [NOSE, 1.04], [1.62, 1.06], WSF, 3),
      WST, ...curve(WST, [1.1, 1.83], [1.06, ROOF], [1.0, ROOF], 3),
      [TAILZ, ROOF],
      TH, [TAILZ, 0.5], [-1.62, 0.33],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, 2 * HALF, BEV, null, 2, 0.1)]), low(0.3, 1.0, [0.66, 0.6, 0.55]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, level tops). A van's own proportion: the cab door glass and
    // the long sliding-door window are near equal (door the longer, as the cab is the part you look into); the sliding window ends in a pillar well
    // before the tail, where a steel panel stands (as on the Every); the windscreen's foot is the cowl line (belt 1.11).
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(TH), half: HALF, taper: null, grow: BEV, inset: INS, lift: BEV + LIFT, sideLift: LIFT };
    const glass = cabinGlass(outline, { ...ARGS, belt: 1.18, windows: [[0.3, 9], [-0.95, 0.14]] });
    const screen = cabinGlass(outline, { ...ARGS, belt: WSF[1] + 0.03 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.6, 0.2, 0.1, 0, 0.45, FZ + 0.0), bx(1.6, 0.2, 0.1, 0, 0.45, BZ - 0.0),   // bumpers
      bx(0.6, 0.22, 0.03, 0, 0.82, FZ - 0.0),                                           // the grille panel
      ...[-1, 1].flatMap(s => [bx(0.1, 0.04, 0.04, s * 0.78, 1.3, 1.28), bx(0.04, 0.17, 0.1, s * 0.83, 1.3, 1.28)]), // mirrors
    ]);
    parts(group, k + 'chrome', CHROME, () => [0.76, 0.82, 0.88].map(y => bx(0.54, 0.025, 0.03, 0, y, FZ + 0.012)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.22, 0.16, 0.04, s * 0.52, 0.82, FZ - 0.0)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.2, 0.07, 0.03, s * 0.53, 0.62, FZ - 0.0)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.1, 0.4, 0.04, s * 0.63, 1.1, BZ + 0.0)));
    parts(group, k + 'amber2', AMBER, () => [-1, 1].map(s => bx(0.1, 0.1, 0.04, s * 0.63, 0.78, BZ + 0.0)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
