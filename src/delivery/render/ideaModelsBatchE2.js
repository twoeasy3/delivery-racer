// ---- car ideas' models, batch E2: the Boxy Supermini and the Shuttle Minibus -------------------------------------------
// Two road vehicles drawn as ideas (ideasBatchE2.js): a square 1980s three-door supermini (after the Fiat Uno and the first
// Panda: a flat bonnet, an upright windscreen, a flat roof, a near-vertical tail with a big glass hatch and tall tail
// lamps, full-width black bumpers) and a passenger minibus (after the Toyota HiAce: a short snout, a tall box body with a
// row of five side windows, a big rear glass and a roof vent). Built as the approved Junker is: bodies from extrusions of
// their side views (one bevel segment), dark glass laid a few mm proud, parts that share a material and never move merged
// into one mesh, plain chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them),
// paint shaded darker low down (vertex colours) and a sun-worn paint picture (64 x 64, drawn in code, soft-edged). No image
// files, no panel lines, no scooped arches. Each builder takes the idea's entry and returns a group, front facing local +z,
// with userData.body, userData.animate and userData.livery. Spread into IDEA_MODELS by ideaModels.js. State-free.
import * as THREE from 'three';
import {
  lambert, TYRE, TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, dsc, curve, extrudeSide, panel, sideGlass,
  slopeGlass, shadeBy, low, wheel, texture, random, roundRect, extrudePlan, narrowAt,
} from './ideaModelsDkit.js';

// paint worn by sun and knocks, to repeat over the body: a white ground with soft darker rubs and a few fine scratches (a
// multiply over the paint); no hard edges anywhere
const worn = (seed) => texture('e2worn' + seed, 64, 64, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rnd = random(seed);
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w, y = rnd() * h, r = 5 + rnd() * 11, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(95,75,60,0.12)'); g.addColorStop(1, 'rgba(95,75,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 6; i++) {
    const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 8, a = rnd() * Math.PI;
    ctx.strokeStyle = 'rgba(60,50,45,0.22)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}, true);
const paintOf = (car, seed) => {
  const m = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true, map: worn(seed) });
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
    const WSF = [0.92, COWL], WST = [0.5, 1.43];
    const RH = [-1.64, ROOF], RL = [-1.7, 1.3]; // the roof's rear edge and the tail (the glass hatch is on the near-vertical tail)
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.62], [NOSE - 0.03, 0.82], [1.4, 0.9], WSF, WST,
      ...curve(WST, [0.46, 1.47], [0.38, ROOF], [0.26, ROOF], 3),
      RH, RL, [TAILZ, FLOOR],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = paintOf(car, 5);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1)]), low(0.3, 0.8, [0.7, 0.64, 0.58]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    const sides = [
      [[zWS(1.02) - 0.05, 1.02], [-0.04, 1.02], [-0.04, 1.34], [zWS(1.34) - 0.04, 1.34]],
      [[-0.16, 1.02], [-1.22, 1.02], [-1.08, 1.34], [-0.16, 1.34]],
    ];
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.0), 1.0], [zWS(1.36), 1.36], gx(1.0) - 0.1, gx(1.36) - 0.1, BEV + LIFT),
      panel([[-0.58, 1.04, BZ - LIFT], [0.58, 1.04, BZ - LIFT], [0.55, 1.36, BZ - LIFT], [-0.55, 1.36, BZ - LIFT]].reverse()),
      ...sideGlass(sides, HALF, TAPER, LIFT),
    ]);
    // black: window surrounds (a little bigger than the glass, a hair behind it), bumpers, grille panel, mirrors, axles
    const grow = (win) => { const cz = win.reduce((s, p) => s + p[0], 0) / win.length, cy = win.reduce((s, p) => s + p[1], 0) / win.length; return win.map(([z, y]) => [z + Math.sign(z - cz) * 0.045, y + Math.sign(y - cy) * 0.045]); };
    parts(group, k + 'black', TRIM, () => [
      ...sideGlass(sides.map(grow), HALF, TAPER, LIFT * 0.4),
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
    const R = 0.38, TW = 0.25, WX = car.hw - TW / 2, AF = 1.55, AR = -1.5;
    const BEV = 0.05, BW = 1.94, HALF = BW / 2, NOSE = 2.42, TAILZ = -2.42, FLOOR = 0.32, ROOF = 2.16;
    const TAPER = [1.3, ROOF, 0.05];
    const WSF = [1.74, 1.12], WST = [1.42, 2.04];
    const outline = [
      [NOSE, FLOOR], [NOSE, 0.98], [NOSE - 0.06, 1.08], [1.95, 1.1], WSF, WST,
      ...curve(WST, [1.38, 2.12], [1.32, ROOF], [1.15, ROOF], 3),
      [-2.2, ROOF], ...curve([-2.2, ROOF], [-2.36, ROOF], [-2.42, 2.05], [-2.42, 1.9], 3),
      [TAILZ, FLOOR],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = paintOf(car, 9);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1)]), low(0.35, 1.0, [0.62, 0.57, 0.5]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    const Y0 = 1.36, Y1 = 1.94;
    const sides = [
      [[zWS(Y0) - 0.05, Y0], [0.66, Y0], [0.66, Y1], [zWS(Y1) - 0.05, Y1]],
      ...[[0.52, -0.12], [-0.24, -0.88], [-1.0, -1.64], [-1.76, -2.28]].map(([a, b]) => [[a, Y0], [b, Y0], [b, Y1], [a, Y1]]),
    ];
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.2), 1.2], [zWS(1.98), 1.98], gx(1.2) - 0.1, gx(1.98) - 0.1, BEV + LIFT),
      ...sideGlass(sides, HALF, TAPER, LIFT),
      panel([[-0.66, 1.4, BZ - LIFT], [0.66, 1.4, BZ - LIFT], [0.66, 1.92, BZ - LIFT], [-0.66, 1.92, BZ - LIFT]].reverse()),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bumper(0.99, 0.08, 0.24, 0.34, NOSE - 0.01), bumper(0.99, 0.08, 0.24, 0.34, TAILZ + 0.01),
      bx(1.05, 0.28, 0.03, 0, 0.82, FZ),
      ...[-1, 1].flatMap(s => [bx(0.2, 0.03, 0.03, s * 1.0, 1.52, 1.55), bx(0.07, 0.34, 0.18, s * 1.08, 1.52, 1.55)]),
      bx(1.3, 0.12, 0.14, 0, 0.38, AF), bx(1.3, 0.12, 0.14, 0, 0.38, AR),
      bx(0.62, 0.06, 0.56, 0, ROOF + BEV + 0.03, -0.7),
    ]);
    parts(group, k + 'chrome', CHROME, () => [0.76, 0.84, 0.92].map(y => bx(1.0, 0.03, 0.03, 0, y, FZ + 0.014)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.36, 0.22, 0.04, s * 0.76, 0.82, FZ - 0.01)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.2, 0.07, 0.03, s * 0.8, 0.64, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 0.88, 0.76, BZ - 0.014)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.34, 0.03, s * 0.88, 1.1, BZ - 0.014)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
