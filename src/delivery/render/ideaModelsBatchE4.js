// ---- car ideas' models, batch E4: the Sport Truck and the Pixel EV (ideasBatchE4.js; CHECKLIST item 273, to be renumbered) ----
// Two road cars drawn as ideas: a lowered fast pickup (after the Ford F-150 Lightning, 2000s: a deep front air dam, a bulged
// bonnet, a raked cab, a SHORT flareside bed and a low stance) and a retro-futurist electric crossover (after the Hyundai
// Ioniq 5, 2020s: a clean wedge-ish hatch with PIXEL lamps, clusters of little square lamps at nose and tail).
// Built as the approved Junker and Commuter are: bodies are extrusions of the side view (one bevel segment), dark glass laid a
// few mm proud, small parts merged into one mesh per material, plain chunky wheels (a tyre and a hub disc, meshes of their own
// so the showroom's suspension finds them), paint shaded darker low down (vertex colours). No panel lines, no textures, no
// people. Each builder takes the idea's entry and returns a group (nose to local +z) with userData.body (the paint mesh),
// userData.animate (sits still) and userData.livery (evil): the Pixel EV's accent trim goes from grey to orange. State-free.
// Helpers: ideaModelsDkit.js.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, curve, extrudeSide,
  shadeBy, low, flare, wheel, cabinGlass, glassFromProfile, cabinChain, flankPanel, insideChain, A_PILLAR,
} from './ideaModelsDkit.js';

// a block of square lamps ("pixels") on a flat face: `rows` are strings, '.' empty; column 0 is the INNER one; `s` the square,
// `gap` between squares; the cluster's inner edge at x = xi (mirrored by `side`), its top row centred at y; the face at z,
// squares laid facing `dir` (+1 front, -1 rear). Returns [lampGeos, amberGeos, tailGeos] by the letters L, A, T.
const pixels = (rows, side, xi, yTop, z, dir, s, gap) => {
  const out = { L: [], A: [], T: [] };
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (!out[ch]) return;
    const geo = new THREE.PlaneGeometry(s, s);
    if (dir < 0) geo.rotateY(Math.PI);
    out[ch].push(geo.translate(side * (xi + s / 2 + c * (s + gap)), yTop - s / 2 - r * (s + gap), z));
  }));
  return out;
};

export const IDEA_MODELS_BATCH_E4 = {
  // ---- the Sport Truck (after the Ford F-150 Lightning, 2000s) -------------------------------------------------------
  // A pickup squatted on small wheels: a deep black air dam under a smooth nose, a dark grille with a chrome bar, wide
  // rectangular headlamps with amber under them, a bonnet bulge with a dark scoop, a steeply raked cab with a low roof, a
  // SHORT bed with flared rear wings, tall tail lamps on the bed corners, a body-colour rear bumper with two chrome pipes.
  sporttruck: (car) => {
    const group = new THREE.Group(), k = 'sporttruck';
    const R = 0.42, TW = 0.3, WX = car.hw - TW / 2, AF = 1.62, AR = -1.55;
    const BEV = 0.05, BW = 2.2, HALF = BW / 2, NOSE = 2.6, TAILZ = -2.55, CBK = -0.95, BELT = 1.12, ROOF = 1.72, FLOOR = 0.3;
    const TAPER = [BELT, ROOF, 0.12];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [0.9, BELT], WST = [0.243, ROOF], TH = [CBK, 1.15]; // (TH: a point on the straight cab back, the rear glass's foot)
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.96], ...curve([NOSE, 0.96], [NOSE, 1.02], [NOSE - 0.04, 1.04], [NOSE - 0.14, 1.04], 3),
      [1.9, 1.07], WSF, WST,
      [CBK, ROOF], TH, [CBK, FLOOR],
    ];
    const FZ = NOSE + BEV;
    const wall = (s) => extrudeSide([[TAILZ, FLOOR + 0.04], [TAILZ, BELT], [CBK, BELT], [CBK, FLOOR + 0.04]], 0.1, 0.02, null, 1, 0.02).translate(s * (HALF - 0.05), 0, 0);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, 0.07),
      ...[-1, 1].map(wall),
      bx(0.7, 0.07, 0.8, 0, 1.1, 1.45),                                                 // the bonnet bulge
      ...[-1, 1].flatMap(s => [bx(0.16, 0.42, 1.0, s * 1.14, 0.83, AF), bx(0.16, 0.5, 1.0, s * 1.14, 0.87, AR)]), // flared wings, front and rear
      bx(2.04, 0.62, 0.1, 0, 0.81, TAILZ + 0.1),                                         // the tailgate
      bx(2.2, 0.2, 0.14, 0, 0.4, TAILZ + 0.02),                                          // the rear bumper
      bx(2.0, 0.3, 0.05, 0, 0.5, -0.9),                                                  // under the bed floor, behind the cab
    ]), low(0.45, 1.2, [0.66, 0.6, 0.55]))), paint);
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): the one door window follows the raked A-pillar,
    // the roof and the cab-back chamfer; the rear cab glass keeps a pickup's width (sideInset 0.3), the windscreen its own (0.1). A pickup's cab
    // has one door glass a side (no quarter window), so there is no front-to-rear proportion to set.
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), to: outline.indexOf(TH), belt: BELT + 0.03, half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, sideInset: 0.3 }), screen = cabinGlass(outline, { ...ARGS, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.76, 0.2, 0.15, 0, 0.3, FZ - 0.02),                       // the air dam, standing out and down
      bx(1.3, 0.14, 0.03, 0, 0.52, FZ),                             // the lower intake
      bx(1.05, 0.18, 0.03, 0, 0.9, FZ),                             // the grille's dark panel
      bx(0.5, 0.04, 0.02, 0, 1.1, 2.4 + 0.02),                      // the scoop's dark mouth
      bx(1.98, 0.04, 1.48, 0, 0.78, -1.69),                          // the bed liner
      ...[-1, 1].flatMap(s => [bx(0.1, 0.03, 0.04, s * 1.09, 1.28, 0.78), bx(0.07, 0.14, 0.1, s * 1.15, 1.28, 0.78)]), // mirrors
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(1.05, 0.04, 0.03, 0, 0.9, FZ + 0.012),
      ...[-1, 1].map(s => new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8).rotateX(Math.PI / 2).translate(s * 0.46, 0.3, TAILZ - 0.1)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.42, 0.17, 0.05, s * 0.78, 0.87, FZ + 0.006)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.3, 0.06, 0.05, s * 0.78, 0.72, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.18, 0.26, 0.06, s * 1.03, 0.96, TAILZ - 0.01)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Pixel EV (after the Hyundai Ioniq 5, 2020s) ---------------------------------------------------------------
  // A clean boxy electric hatch with a wedge to it: a short smooth nose with no grille, a bonnet that runs up into a steeply
  // raked windscreen, a long flat roof falling to a sloping hatch and a vertical tail. Its lamps are
  // PIXELS: a block of square white lamps (amber along the bottom row) in a dark housing at each front corner, and a stack of
  // square red lamps (amber foot) in a dark housing at each tail corner. Trim round the arches and along the sills is
  // grey in Good and orange in Evil (userData.livery).
  pixelev: (car) => {
    const group = new THREE.Group(), k = 'pixelev';
    const R = 0.4, TW = 0.26, WX = car.hw - TW / 2, AF = 1.45, AR = -1.45;
    const BEV = 0.05, BW = 2.02, HALF = BW / 2, NOSE = 2.35, TAILZ = -2.35, FLOOR = 0.3, BELT = 1.08, ROOF = 1.6;
    const TAPER = [BELT, ROOF, 0.12];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const ACC = { good: 0x3d4147, evil: 0xe8821e }, trim = new THREE.MeshLambertMaterial({ color: ACC.good }), bladeMat = new THREE.MeshLambertMaterial({ color: ACC.good, side: THREE.DoubleSide });
    const WSF = [1.05, 1.12], WST = [0.4, 1.55], RGT = [-1.74, 1.44], RGB = [-2.22, 1.1];
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.95], ...curve([NOSE, 0.95], [NOSE, 1.0], [NOSE - 0.04, 1.03], [NOSE - 0.18, 1.05], 3),
      WSF, WST, ...curve(WST, [0.36, ROOF], [0.3, ROOF], [0.2, ROOF], 3),
      [-1.4, ROOF - 0.03], ...curve([-1.4, ROOF - 0.03], [-1.58, ROOF - 0.05], [-1.66, 1.5], RGT, 3),
      RGB, [TAILZ, 1.06], [TAILZ, FLOOR],
    ];
    const FZ = NOSE + BEV, RZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, 0.07),
    ]), low(0.4, 1.1, [0.7, 0.66, 0.62]))), paint);
    // THE GLASS (the owner, 15-Oct): the car's own two side windows, a door window and one long rear window, sharp on the rounded body (cabinGlass sharp mode
    // for the windscreen and the hatch glass; the side windows from the same virtual corners with their own rear edge). THE INVERTED REAR EDGE, made a
    // design feature: the original's rear window ended in an edge that leans BACK at the top (from the belt at z -1.45 up and back to -1.66: 42 degrees from
    // the vertical, the opposite of the hatch slope behind it). It is kept as ONE crisp straight edge at RAKE degrees, the window a clean 4-edge polygon,
    // and a contrasting blade (the car's accent: grey, orange in Evil) follows exactly the same line behind it, 5 mm clear of the glass.
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, FROM = outline.findIndex(p => p[0] === WSF[0] && p[1] === WSF[1]), TO = outline.indexOf(RGB), GBELT = 1.18;
    const ARGS = { from: FROM, to: TO, half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006, sideInset: 0.1, sharp: true, cornerDepth: 0.05 };
    const glass = cabinGlass(outline, { ...ARGS, belt: GBELT }), screen = cabinGlass(outline, { ...ARGS, belt: WSF[1] + 0.03 });
    const RAKE = { top: -1.5, angle: 38 * Math.PI / 180 }; // (the rear window's back edge: starts on the roof line at z top, runs down and FORWARD at angle from the vertical)
    const [vA, vR] = [glass.virtual[1], glass.virtual[2]], roofY = vA[1] + (vR[1] - vA[1]) * (RAKE.top - vA[0]) / (vR[0] - vA[0]);
    const wChain = [glass.virtual[0], vA, [RAKE.top, roofY], [RAKE.top + (roofY - 1.0) * Math.tan(RAKE.angle), 1.0]];
    const wIns = { aPillar: Math.max(0, Math.max(0.07, A_PILLAR) - BEV), roof: Math.max(0, 0.05 - BEV), cPillar: 0, belt: 0.025 }, real = cabinChain(outline, FROM, TO, GBELT);
    const windows = [[-0.10, 9], [-9, -0.24]].flatMap(([zr, zf]) => glassFromProfile(wChain, { from: 0, to: 3, belt: GBELT, inset: wIns, zRear: zr, zFront: zf, half: HALF, taper: TAPER, lift: 0.006, real, margin: 0.003 }));
    parts(group, k + 'glass', GLASS, () => [...windows, screen.front, glass.rear]);
    // the blade: the rear window's back edge's line, 14 cm wide, from the belt to the window's top
    const bb = windows[2].boundingBox ?? (windows[2].computeBoundingBox(), windows[2].boundingBox), yb = bb.min.y, yt = bb.max.y;
    const edgeZ = (y) => RAKE.top + (roofY - y) * Math.tan(RAKE.angle) - 0.005 / Math.cos(RAKE.angle); // (the window's edge, 5 mm clear)
    let ybt = yt; while (insideChain(real, [edgeZ(ybt) - 0.14, ybt]) < 0.003 && ybt > yb + 0.1) ybt -= 0.002; // (its top rear corner inside the rounded roof)
    const blade = flankPanel([[edgeZ(yb) - 0.14, yb], [edgeZ(ybt) - 0.14, ybt], [edgeZ(ybt), ybt], [edgeZ(yb), yb]], { half: HALF, taper: TAPER, lift: 0.006 });
    parts(group, k + 'black', TRIM, () => [
      bx(1.1, 0.14, 0.03, 0, 0.45, FZ),                             // the lower intake
      bx(0.5, 0.1, 0.03, 0, 0.7, FZ),                               // a closed panel in the nose
      bx(1.45, 0.1, 0.03, 0, 0.45, RZ),                              // the rear bumper's dark insert
      // the lamp housings: a dark block for each pixel cluster
      ...[-1, 1].map(s => bx(0.46, 0.36, 0.04, s * 0.66, 0.76, FZ)),
      ...[-1, 1].map(s => bx(0.28, 0.5, 0.04, s * 0.77, 0.82, RZ)),
      ...[-1, 1].flatMap(s => [bx(0.1, 0.03, 0.04, s * 1.01, 1.12, 0.62), bx(0.07, 0.13, 0.1, s * 1.065, 1.12, 0.62)]), // mirrors
    ]);
    // trim: a sill between the wheels, a skid plate at each end and a ring round each wheel (grey / orange)
    const ring = () => flare(0, 0, R + 0.05, R + 0.14, 0.05);
    parts(group, k + 'blade', bladeMat, () => blade); // (its own two-sided material: a flat panel; it follows the livery below)
    parts(group, k + 'trim', trim, () => [
      ...[-1, 1].map(s => bx(0.07, 0.12, 2.1, s * (HALF + 0.005), 0.4, 0)),
      bx(1.45, 0.08, 0.06, 0, 0.34, FZ - 0.01), bx(1.45, 0.08, 0.06, 0, 0.34, RZ + 0.01),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => ring().rotateY(s < 0 ? Math.PI : 0).translate(s * (HALF + 0.035), R, z))),
    ]);
    // the pixels: the front block (4 x 3, an outer corner out, amber along the bottom) and the tail stack (2 x 4, amber foot)
    const front = [-1, 1].map(s => pixels(['LLL.', 'LLLL', 'LLAA'], s, 0.46, 0.915, FZ + 0.025, 1, 0.085, 0.025));
    const tail = [-1, 1].map(s => pixels(['TT', 'TT', 'TT', 'TA'], s, 0.68, 1.035, RZ - 0.025, -1, 0.085, 0.025));
    parts(group, k + 'pxlamp', LAMP, () => front.flatMap(f => f.L));
    parts(group, k + 'pxamber', AMBER, () => [...front.flatMap(f => f.A), ...tail.flatMap(f => f.A)]);
    parts(group, k + 'pxtail', TAIL, () => tail.flatMap(f => f.T));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: (evil) => { trim.color.setHex(evil ? ACC.evil : ACC.good); bladeMat.color.setHex(evil ? ACC.evil : ACC.good); }, glassVirtual: { chain: glass.virtual, grow: BEV, freeEdge: true } }; // (freeEdge: the rear window's back edge is a deliberate free-standing line, not the contour: scripts/.glass-contour-check.mjs)
    return group;
  },
};
