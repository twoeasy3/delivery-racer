// ---- car ideas' models, batch E2: the Boxy Supermini and the Shuttle Minibus -------------------------------------------
// Two road vehicles drawn as ideas (ideasBatchE2.js): a square 1980s three-door supermini (after the Fiat Uno and the first
// Panda: a flat bonnet, an upright windscreen, a flat roof, a near-vertical tail with a big glass hatch and tall tail
// lamps, full-width black bumpers) and a passenger minibus (after the Toyota HiAce: a short snout, a tall box body with a
// row of five side windows, a big rear glass and a roof vent). Built as the approved Junker is: bodies from extrusions of
// their side views (one bevel segment), dark glass laid a few mm proud, parts that share a material and never move merged
// into one mesh, plain chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them),
// paint shaded darker low down (vertex colours); NO textures at all (the owner, 14-Oct: flat colours). No image
// files, no panel lines, no scooped arches. Each builder takes the idea's entry and returns a group, front facing local +z,
// with userData.body, userData.animate and userData.livery. Spread into IDEA_MODELS by ideaModels.js. State-free.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, extrudeSide,
  shadeBy, low, wheel, roundRect, extrudePlan, cabinGlass, glassFromProfile, fillet,
} from './ideaModelsDkit.js';

const paintOf = (car) => {
  const m = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  m.userData.shared = true;
  return m;
};
// a rounded black bumper across the car (plan view), y0 to y0 + h, its middle at z
const bumper = (hx, hz, h, y0, z) => extrudePlan(roundRect(hx, hz, hz * 0.8), h - 0.04, 0.02, y0).translate(0, 0, z);

export const IDEA_MODELS_BATCH_E2 = {
  // ---- the Boxy Supermini (after the Fiat Uno, 1983) -----------------------------------------------------------------
  // Flat bonnet, upright windscreen, flat roof, a near-vertical tail under a big glass hatch; rectangular headlamps either
  // side of a slim grille, black bumpers, black window surrounds, tall tail lamps (red over amber) in the rear corners.
  supermini: (car) => {
    const group = new THREE.Group();
    const k = 'supermini';
    const R = 0.35, TW = 0.22, WX = car.hw - TW / 2, AF = 1.1, AR = -1.1;
    const BEV = 0.04, BW = 1.5, HALF = BW / 2, NOSE = 1.7, TAILZ = -1.7, FLOOR = 0.27, COWL = 0.95, ROOF = 1.44;
    const TAPER = [0.9, ROOF, 0.08];
    const WSF = [0.92, COWL], WST = [0.4913, ROOF]; // (the windscreen's line runs on up to the roof: one corner there)
    const RH = [TAILZ, ROOF], TH = [TAILZ, 1.0]; // the roof's rear edge: a square corner onto the near-vertical tail (the glass hatch is on the tail; TH is a point on the straight tail where the tail glass's foot is)
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.62], [NOSE - 0.03, 0.82], [1.4, 0.9], WSF, WST,
      RH, TH, [TAILZ, FLOOR],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = paintOf(car);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1)]), low(0.3, 0.8, [0.7, 0.64, 0.58]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, level tops, windows with the body's corners); the door glass is
    // the longer, the quarter window behind the B-pillar ends in a C-pillar before the tail glass. The windscreen's foot is the cowl (belt 0.98).
    const GBELT = 1.02, WIN = [[-0.42, 9], [-1.45, -0.58]], INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 };
    const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(TH), belt: GBELT, half: HALF, taper: TAPER, grow: BEV,
      inset: INS, lift: BEV + 0.006, sideLift: 0.006, windows: WIN });
    const screen = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(TH), belt: COWL + 0.03, half: HALF, taper: TAPER, grow: BEV,
      inset: INS, lift: BEV + 0.006, sideLift: 0.006 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // black window surrounds: the same outline 4.5 cm bigger, a hair behind the glass (a trim frame)
    const SUR = 0.045, surrounds = () => WIN.flatMap(([zr, zf]) => glassFromProfile(outline, { from: outline.indexOf(WSF), to: outline.indexOf(TH), belt: GBELT - SUR, inset: { aPillar: 0.003, roof: 0.003, cPillar: 0.003, belt: 0 },
      zRear: zr === -Infinity || zr <= -9 ? -9 : zr - SUR, zFront: zf >= 9 ? 9 : zf + SUR, half: HALF, taper: TAPER, lift: 0.0024 }));
    parts(group, k + 'black', TRIM, () => [
      ...surrounds(),
      bumper(0.78, 0.07, 0.2, 0.28, NOSE - 0.02), bumper(0.78, 0.07, 0.2, 0.28, TAILZ + 0.02),
      bx(0.7, 0.17, 0.03, 0, 0.72, FZ),
      ...[-1, 1].flatMap(s => [bx(0.12, 0.03, 0.03, s * 0.76, 1.0, 0.64), bx(0.05, 0.14, 0.17, s * 0.79, 1.04, 0.62)]),
      bx(0.9, 0.1, 0.12, 0, 0.33, AF), bx(0.9, 0.1, 0.12, 0, 0.33, AR),
      ...[-1, 1].map(s => bx(0.2, 0.46, 0.025, s * 0.58, 0.74, BZ - 0.004)),
    ]);
    parts(group, k + 'chrome', CHROME, () => [0.7, 0.74].map(y => bx(0.7, 0.025, 0.03, 0, y, FZ + 0.012)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.33, 0.2, 0.04, s * 0.5, 0.7, FZ - 0.01)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.15, 0.07, 0.03, s * 0.64, 0.56, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.11, 0.03, s * 0.58, 0.57, BZ - 0.014)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.27, 0.03, s * 0.58, 0.83, BZ - 0.014)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Shuttle Minibus (after the Toyota HiAce, 1989) ------------------------------------------------------------
  // A tall box on a short snout: a vertical nose with a black grille panel and big rectangular headlamps, a steep
  // windscreen, a flat roof with one vent, a cab door window and four passenger windows a side, a big rear glass, tall tail
  // lamps in the rear corners and black bumpers.
  minibus: (car) => {
    const group = new THREE.Group();
    const k = 'minibus';
    const R = 0.38, TW = 0.25, WX = 1.12 - TW / 2, AF = 1.55, AR = -1.5;
    const BEV = 0.05, BW = 2.06, HALF = BW / 2, NOSE = 2.42, TAILZ = -2.42, FLOOR = 0.32, ROOF = 2.16;
    const TAPER = [1.3, ROOF, 0.05];
    const WSF = [1.74, 1.12], TH = [TAILZ, 1.38]; // (TH: a point on the straight tail, the tail glass's foot)
    // ROUNDED BODY, SHARP WINDOWS, tuned (the owner, 15-Oct): the roof's two corners are rounded about twice as much as the original (the windscreen's top:
    // 13 cm on the A-pillar and 23 on the roof, the tail's: 22 on the roof and 26 on the tail; now TUNE.rf / TUNE.rr, tangent lengths in m)
    const TUNE = { rf: [0.25, 0.25], rr: [0.25, 0.25] };
    const V1 = [WSF[0] + (1.42 - WSF[0]) * (ROOF - WSF[1]) / (2.04 - WSF[1]), ROOF], V2 = [TAILZ, ROOF]; // (the virtual corners: the A-pillar's line and the roof's, the roof's and the tail's)
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.98], [NOSE - 0.06, 1.08], [1.95, 1.1], WSF,
      ...fillet(WSF, V1, [0, ROOF], TUNE.rf[0], TUNE.rf[1], 5),
      ...fillet([0, ROOF], V2, TH, TUNE.rr[0], TUNE.rr[1], 5),
      TH, [TAILZ, FLOOR],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = paintOf(car);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1)]), low(0.35, 1.0, [0.72, 0.67, 0.6]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, level tops, the windows inset 5 cm from the roof). A bus's own
    // proportion: the cab door glass is the longest, then four equal passenger windows (the HiAce's row), each between 12 cm pillars; the last one
    // runs to the tail's C-pillar; the windscreen's foot is the cowl (second call, belt 1.15), the tail glass keeps its width (sideInset 0.3).
    // The BODY keeps its rounded roof corners; the windows are sharp (`sharp: true`: built from the roundings' virtual corners, the two top corners of
    // each window pulled in along their pillar until they sit 5 cm inside the rounded silhouette).
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(TH), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, sharp: true, levelTops: true, belt: 1.42, sideInset: 0.3, windows: [[0.66, 9], [-0.12, 0.52], [-0.88, -0.24], [-1.64, -1.0], [-9, -1.76]] });
    const screen = cabinGlass(outline, { ...ARGS, sharp: true, levelTops: true, belt: 1.15, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    parts(group, k + 'black', TRIM, () => [
      bumper(1.05, 0.08, 0.24, 0.34, NOSE - 0.01), bumper(1.05, 0.08, 0.24, 0.34, TAILZ + 0.01),
      bx(1.1, 0.28, 0.03, 0, 0.82, FZ),
      ...[-1, 1].flatMap(s => [bx(0.24, 0.03, 0.03, s * 1.06, 1.52, 1.55), bx(0.07, 0.34, 0.18, s * 1.17, 1.52, 1.55)]),
      bx(1.4, 0.12, 0.14, 0, 0.38, AF), bx(1.4, 0.12, 0.14, 0, 0.38, AR),
      bx(0.62, 0.06, 0.56, 0, ROOF + BEV + 0.03, -0.7),
    ]);
    parts(group, k + 'chrome', CHROME, () => [0.76, 0.84, 0.92].map(y => bx(1.08, 0.03, 0.03, 0, y, FZ + 0.014)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.36, 0.22, 0.04, s * 0.82, 0.82, FZ - 0.01)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.2, 0.07, 0.03, s * 0.86, 0.64, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 0.94, 0.76, BZ - 0.014)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.34, 0.03, s * 0.94, 1.1, BZ - 0.014)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {}, glassVirtual: { chain: glass.virtual, grow: BEV } }; // (the rounded body's virtual corners, for scripts/.glass-contour-check.mjs)
    return group;
  },
};
