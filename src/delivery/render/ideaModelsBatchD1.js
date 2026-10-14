// ---- car ideas' models, batch D1: the Wedge Microcar and the Farm Tractor (ideasBatchD1.js). Built as the approved Junker
// and Commuter are: each body an extrusion of its side view with its edges rounded, dark glass laid a few mm proud, parts that
// share a material merged, paint shaded darker low down (vertex colours), plain chunky wheels (a tyre and a hub disc, meshes of
// their own so the showroom's suspension finds them), no textures (14-Oct, the owner: not everything needs one). No panel lines, no people.
// Each builder takes the idea's entry and returns a group (nose to local +z) with userData.body, animate and livery. State-free.
// Helpers: ideaModelsDkit.js.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, keep, lambert, shared, place, merge, parts, bx, dsc,
  curve, extrudeSide, cabinGlass, shadeBy, low, flare, wheel,
} from './ideaModelsDkit.js';

const DARK = keep(lambert(0x1b1c20));

export const IDEA_MODELS_BATCH_D1 = {
  // ---- the Wedge Microcar (after the Peel P50, 1962) -------------------------------------------------------------
  // The smallest road car there was: a tall little box with a flat roof, a short sloping nose with ONE headlamp in the
  // middle, a near-upright windscreen, a square tail, two wheels at the front and one under the middle at the back.
  wedgemicro: (car) => {
    const group = new THREE.Group(), k = 'wmicro';
    const R = 0.25, TW = 0.17, BEV = 0.05, ACROSS = 0.07, BW = 1.28, HALF = BW / 2, WX = HALF - 0.04;
    const NOSE = 0.72, TAILZ = -0.72, AY = 0.27, AF = 0.4, BELT = 0.8, ROOF = 1.2;
    const TAPER = [BELT, ROOF, 0.1], TB = [TAILZ, AY], R2 = [TAILZ + 0.03, BELT];
    const WSF = [0.42, BELT], WST = [0.1, ROOF];
    const outline = [
      [NOSE, AY], [NOSE, 0.5], ...curve([NOSE, 0.5], [NOSE, 0.62], [NOSE - 0.1, 0.7], [0.46, 0.76], 4),
      WSF, WST,
      [-0.5, ROOF + 0.05], R2, [TAILZ, BELT - 0.04],
      TB,
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]), low(0.2, 0.7, [0.6, 0.54, 0.48]))), paint);
    // ALL the glass from the body's own side profile (cabinGlass: one inset outline, so the windscreen, the side window and the rear glass agree)
    const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(R2), belt: BELT, half: HALF, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.006 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
    parts(group, k + 'black', TRIM, () => [bx(1.1, 0.08, 0.1, 0, 0.3, FZ + 0.01), bx(1.06, 0.08, 0.08, 0, 0.3, BZ - 0.01)]);
    parts(group, k + 'rim', CHROME, () => [dsc(0.115, 0.03, 0, 0.5, FZ + 0.01, 0, 12)]);
    parts(group, k + 'lamp', LAMP, () => [dsc(0.085, 0.03, 0, 0.5, FZ + 0.022, 0, 12)]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.13, 0.1, 0.03, s * 0.4, 0.52, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.09, 0.06, 0.03, s * 0.47, 0.4, FZ + 0.004)));
    for (const s of [-1, 1]) wheel(group, k, R, TW, s * WX, AF, 14);
    wheel(group, k, R, TW, 0, -0.45, 14);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Farm Tractor (after the Ford 8N, 1947) ------------------------------------------------------------------
  // A slow tank of a farm machine: huge rear wheels under curved mudguards, small close-set front wheels, a long narrow
  // bonnet with a slatted grille, a bare steel seat and a steering wheel on a column, a tall exhaust stack. The paint darker low down.
  farmtractor: (car) => {
    const group = new THREE.Group(), k = 'tractor';
    const RR = 0.74, RW = 0.4, RX = 0.74, RZ = -0.85, RF = 0.38, FW = 0.17, FX = 0.5, FZ = 1.2;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    // bonnet, a tapered block (side view extruded), and the gearbox and rear axle housing under the seat
    const HOOD = [[1.5, 0.62], [1.5, 1.04], ...curve([1.5, 1.04], [1.5, 1.14], [1.44, 1.2], [1.34, 1.2], 3), [0.3, 1.2], [0.3, 0.62]];
    const NZ = 1.5 + 0.04;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(HOOD, 0.6, 0.04, null, 1, 0.06),
      bx(0.56, 0.62, 1.4, 0, 0.88, -0.38),                          // the gearbox, behind the bonnet
      bx(1.3, 0.3, 0.34, 0, 0.78, RZ),                              // the rear axle housing
      bx(0.5, 0.18, 0.22, 0, 0.68, FZ),                              // the front axle's pivot
      ...[-1, 1].map(s => flare(RZ, RR, RR + 0.04, RR + 0.1, 0.5).translate(s * RX + 0.25, 0, 0)), // the mudguards
      bx(0.5, 0.05, 0.5, 0, 1.36, -0.6),                              // the seat's pan
    ]), low(0.4, 1.1, [0.62, 0.56, 0.5]))), paint);
    parts(group, k + 'dark', DARK, () => [
      bx(1.1, 0.1, 0.12, 0, 0.42, FZ),                                // the front axle
      bx(0.4, 0.3, 0.04, 0, 0.9, NZ - 0.015),                          // the grille panel
      bx(0.42, 0.34, 0.06, 0, 1.58, -0.8, -0.2),                      // the seat back
      bx(0.06, 0.4, 0.06, 0, 1.2, -0.6),                              // the seat's post
      new THREE.CylinderGeometry(0.035, 0.04, 0.8, 8).translate(0, 1.6, 0.9),   // the exhaust stack
      new THREE.CylinderGeometry(0.06, 0.04, 0.06, 8).translate(0, 2.02, 0.9),
      bx(1.0, 0.1, 0.1, 0, 0.92, -1.1),                              // the lamp bar on the gearbox's back
      bx(0.4, 0.08, 0.08, 0, 0.7, -1.2),                             // the drawbar
      new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6).rotateX(-0.5).translate(0, 1.42, 0.18),  // the steering column
      new THREE.TorusGeometry(0.17, 0.02, 5, 12).rotateX(-0.5 - Math.PI / 2).translate(0, 1.64, 0.06),
    ]);
    // the grille's slats, in the paint, standing out of the panel
    place(group, shared(k + 'slats', () => merge([-2, -1, 0, 1, 2].map(i => bx(0.035, 0.26, 0.03, i * 0.075, 0.9, NZ + 0.01)))), paint);
    const BZ = -1.1 - 0.05;
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.075, 0.03, s * 0.2, 1.0, NZ + 0.005, 0, 12)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.055, 0.03, s * 0.2, 1.0, NZ + 0.02, 0, 12)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.13, 0.1, 0.03, s * 0.4, 0.92, BZ - 0.002)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.1, 0.06, 0.03, s * 0.2, 0.68, NZ + 0.004)));
    for (const s of [-1, 1]) wheel(group, k + 'r', RR, RW, s * RX, RZ, 20);
    for (const s of [-1, 1]) wheel(group, k + 'f', RF, FW, s * FX, FZ, 14);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

};
