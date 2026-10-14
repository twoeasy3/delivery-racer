// ---- car ideas' models, batch D (part 2): the Sprint Hatch, the Autobahn Estate, the Fin Land Yacht, the Trophy Truck and
// the Armoured Limo (ideasD.js; part 1 is ideaModelsD.js). The same way as part 1: each body an extrusion of its side view
// with its edges rounded, dark glass laid a few mm proud, parts that share a material merged, paint shaded darker low
// down, plain chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them), and a
// soft-edged mud decal where the car earns it. No panel lines, no people. Each builder takes the idea's entry and returns a
// group (nose to local +z) with userData.body, animate and livery. State-free. Helpers: ideaModelsDkit.js.
import * as THREE from 'three';
import {
  TYRE, HUB, TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, keep, lambert, shared, place, merge, parts, bx, dsc, blob,
  curve, extrudeSide, narrowAt, panel, sideGlass, slopeGlass, shadeBy, low, flare, wheel, mud, mudCell, decal,
} from './ideaModelsDkit.js';

const DARK = keep(lambert(0x1b1c20));

export const IDEA_MODELS_D2 = {
  // ---- the Sprint Hatch (after the Honda CR-X, 1987) ---------------------------------------------------------------
  // Short, low and light: a low nose with slim lamps, a raked windscreen, a roof that falls away in one long line to a
  // chopped (Kammback) tail under a big sloping glass hatch, wide tail lamps, small wheels.
  sprinthatch: (car) => {
    const group = new THREE.Group(), k = 'crx';
    const R = 0.3, TW = 0.2, WX = car.hw - TW / 2, BEV = 0.05, ACROSS = 0.08, BW = 1.62, HALF = BW / 2;
    const NOSE = 1.83, TAILZ = -1.83, AY = 0.4, ARC = 0.42, AF = 1.17, AR = -1.12, BELT = 0.88, ROOF = 1.27;
    const TAPER = [BELT, ROOF, 0.13];
    const WSF = [0.95, BELT - 0.04], WST = [0.2, ROOF - 0.05];
    const outline = [
      [NOSE, AY], [NOSE, 0.62], ...curve([NOSE, 0.62], [NOSE, 0.7], [NOSE - 0.1, 0.75], [NOSE - 0.5, 0.78], 4), [1.1, 0.84],
      WSF, WST, ...curve(WST, [0.12, ROOF], [0.0, ROOF], [-0.15, ROOF], 3), [-1.55, 1.0],
      ...curve([-1.55, 1.0], [-1.7, 0.99], [TAILZ, 0.98], [TAILZ, 0.9], 2),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]), low(0.3, 0.9, [0.6, 0.54, 0.48]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(0.94), 0.94], [zWS(1.2), 1.2], gx(0.94) - 0.1, gx(1.2) - 0.1, BEV + LIFT),
      ...sideGlass([[[0.86, 0.92], [-1.2, 0.92], [-1.2, 1.04], [-0.15, 1.21], [0.24, 1.18]]], HALF, TAPER, LIFT),
      slopeGlass([-0.55, 1.19], [-1.4, 1.03], gx(1.19) - 0.2, gx(1.03) - 0.15, BEV + LIFT),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(0.5, 0.08, 0.04, 0, 0.55, FZ), bx(1.44, 0.12, 0.12, 0, 0.44, FZ + 0.02), bx(1.4, 0.1, 0.1, 0, 0.44, BZ - 0.02),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.4, 0.1, 0.04, s * 0.53, 0.58, FZ + 0.002)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.16, 0.06, 0.04, s * 0.66, 0.47, FZ + 0.002)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.46, 0.15, 0.04, s * 0.5, 0.8, BZ - 0.006)));
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 16); wheel(group, k, R, TW, s * WX, AR, 16); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Autobahn Estate (after the Audi RS2 Avant, 1994) --------------------------------------------------------
  // A long, level-roofed estate with a steeply raked tailgate, three side windows a side, wide dark arch flares, roof
  // rails, a wide dark grille between slim lamps, round spot lamps low in the bumper and twin exhausts at the tail.
  autobahnestate: (car) => {
    const group = new THREE.Group(), k = 'rs2';
    const R = 0.33, TW = 0.24, WX = car.hw - TW / 2, BEV = 0.05, ACROSS = 0.08, BW = 1.74, HALF = BW / 2;
    const NOSE = 2.25, TAILZ = -2.28, AY = 0.44, ARC = 0.46, AF = 1.4, AR = -1.38, BELT = 0.99, ROOF = 1.4;
    const TAPER = [BELT, ROOF, 0.11];
    const WSF = [0.92, BELT - 0.03], WST = [0.34, ROOF - 0.04];
    const outline = [
      [NOSE, AY], [NOSE, 0.68], ...curve([NOSE, 0.68], [NOSE, 0.78], [NOSE - 0.12, 0.84], [NOSE - 0.6, 0.9], 4), [1.2, 0.95],
      WSF, WST, ...curve(WST, [0.26, ROOF], [0.16, ROOF], [0.0, ROOF], 3), [-1.85, ROOF - 0.01],
      ...curve([-1.85, ROOF - 0.01], [-1.95, ROOF - 0.02], [-1.98, ROOF - 0.05], [-2.05, ROOF - 0.12], 3), [-2.2, 1.05],
      ...curve([-2.2, 1.05], [-2.26, 1.03], [TAILZ, 0.98], [TAILZ, 0.9], 2),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]), low(0.35, 1.0, [0.62, 0.56, 0.5]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.04), 1.04], [zWS(1.35), 1.35], gx(1.04) - 0.1, gx(1.35) - 0.1, BEV + LIFT),
      ...sideGlass([
        [[0.84, 1.03], [-0.05, 1.03], [-0.05, 1.33], [0.34, 1.33]],
        [[-0.2, 1.03], [-1.03, 1.03], [-1.03, 1.33], [-0.2, 1.33]],
        [[-1.18, 1.03], [-1.95, 1.03], [-2.06, 1.1], [-1.9, 1.33], [-1.18, 1.33]],
      ], HALF, TAPER, LIFT),
      slopeGlass([-2.0, 1.31], [-2.19, 1.08], gx(1.31) - 0.12, gx(1.08) - 0.1, BEV + LIFT),
    ]);
    // dark: the grille, the bumpers, the arch flares, the roof rails and their feet, the tail pipes
    parts(group, k + 'black', TRIM, () => [
      bx(0.95, 0.22, 0.04, 0, 0.66, FZ), bx(1.62, 0.14, 0.14, 0, 0.5, FZ + 0.02), bx(1.58, 0.14, 0.12, 0, 0.5, BZ - 0.02),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, AY, ARC - BEV - 0.01, ARC - BEV + 0.07, 0.07).translate(s > 0 ? HALF + 0.06 : -HALF + 0.01, 0, 0))),
      ...[-1, 1].map(s => bx(0.04, 0.04, 2.4, s * gx(ROOF + 0.02) * 0.82, ROOF + 0.045, -0.95)),
      ...[-1, 1].map(s => new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8).rotateX(Math.PI / 2).translate(s * 0.5, 0.4, BZ - 0.05)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [
      ...[-1, 1].map(s => bx(0.5, 0.14, 0.04, s * 0.62, 0.74, FZ + 0.002)),
      ...[-1, 1].map(s => dsc(0.09, 0.03, s * 0.33, 0.46, FZ + 0.045, 0, 10)),    // the bumper's round spot lamps
    ]);
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.18, 0.06, 0.04, s * 0.72, 0.6, FZ + 0.002)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.42, 0.16, 0.04, s * 0.56, 0.92, BZ - 0.006)));
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 16); wheel(group, k, R, TW, s * WX, AR, 16); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Fin Land Yacht (after the Cadillac Eldorado Biarritz, 1959) --------------------------------------------
  // Long, low and wide: a flat bonnet, a thin hardtop roof over a wrap-round windscreen and one long side window, a flat
  // boot, and at the tail two tall sharp blade fins each carrying two bullet-shaped lamps. A chrome bumper with two big
  // bullets at the front, four round headlamps over a bar grille, chrome tail bumper.
  finlandyacht: (car) => {
    const group = new THREE.Group(), k = 'fin59';
    const R = 0.36, TW = 0.27, WX = car.hw - TW / 2, BEV = 0.05, ACROSS = 0.08, BW = 1.98, HALF = BW / 2;
    const NOSE = 2.78, TAILZ = -2.82, AY = 0.48, ARC = 0.5, AF = 1.78, AR = -1.72, BELT = 1.0, ROOF = 1.38;
    const TAPER = [BELT, ROOF, 0.14];
    const WSF = [1.12, BELT], WST = [0.5, ROOF - 0.03];
    const outline = [
      [NOSE, AY], [NOSE, 0.82], ...curve([NOSE, 0.82], [NOSE, 0.92], [NOSE - 0.1, 0.97], [NOSE - 0.5, 0.98], 4), [1.25, 1.0],
      WSF, WST, ...curve(WST, [0.4, ROOF], [0.3, ROOF], [0.1, ROOF], 3), [-0.85, ROOF - 0.01],
      ...curve([-0.85, ROOF - 0.01], [-1.1, ROOF - 0.02], [-1.3, 1.25], [-1.62, 1.03], 4), [-2.2, 1.0],
      ...curve([-2.2, 1.0], [-2.7, 1.0], [TAILZ, 1.0], [TAILZ, 0.9], 3),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    // the fins: a blade each side, swept up and back to a sharp tip (side view extruded thin), standing on the rear deck
    const FIN = [[-1.45, 0.98], [-1.9, 1.08], [-2.4, 1.28], [TAILZ + 0.02, 1.58], [TAILZ + 0.02, 0.98]];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      ...[-1, 1].map(s => extrudeSide(FIN, 0.12, 0.015, null, 1, 0.02).translate(s * 0.82, 0, 0)),
    ]), low(0.35, 1.0, [0.64, 0.58, 0.52]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.05), 1.05], [zWS(1.33), 1.33], gx(1.05) - 0.06, gx(1.33) - 0.06, BEV + LIFT),
      ...sideGlass([[[1.04, 1.04], [-1.45, 1.04], [-1.2, 1.2], [-0.85, 1.32], [0.52, 1.33]]], HALF, TAPER, LIFT),
      slopeGlass([-0.9, 1.31], [-1.55, 1.07], gx(1.31) - 0.2, gx(1.07) - 0.16, BEV + LIFT),
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(2.04, 0.2, 0.16, 0, 0.55, FZ + 0.04), bx(2.04, 0.2, 0.16, 0, 0.55, BZ - 0.04),
      bx(1.0, 0.22, 0.05, 0, 0.74, FZ + 0.005),
      ...[-1, 1].map(s => blob(0.1, 0.1, 0.18, s * 0.55, 0.55, FZ + 0.18, [10, 7])),
    ]);
    parts(group, k + 'black', TRIM, () => [bx(0.9, 0.16, 0.04, 0, 0.74, FZ + 0.012)]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(s => [0.66, 0.9].map(x => dsc(0.085, 0.03, s * x, 0.82, FZ + 0.01, 0, 10))));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.14, 0.06, 0.04, s * 0.78, 0.66, FZ + 0.004)));
    // the bullet lamps in the fins' tips: two a side, pointing back
    parts(group, k + 'tail', TAIL, () => [-1, 1].flatMap(s => [1.12, 1.34].map(y => new THREE.SphereGeometry(0.075, 8, 6).scale(1, 1, 0.8).translate(s * 0.82, y, TAILZ + 0.01))));
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 16); wheel(group, k, R, TW, s * WX, AR, 16); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Trophy Truck (after the Ford F-150 Baja trophy truck) ---------------------------------------------------
  // A desert racer: a tall stance on huge tyres, a long flat bonnet with a scoop, a short two-door cab, a short bed
  // with the spare standing in it, wide flared arches, a bash bar, a pair of spot lamps over the screen. Dust thrown up
  // the flanks (a soft-edged decal).
  trophytruck: (car) => {
    const group = new THREE.Group(), k = 'trophy';
    const R = 0.55, TW = 0.4, WX = car.hw - TW / 2, BEV = 0.05, ACROSS = 0.08, BW = 2.0, HALF = BW / 2;
    const NOSE = 2.45, TAILZ = -2.45, AY = 0.8, ARC = 0.5, AF = 1.65, AR = -1.55, HOODY = 1.42, ROOF = 2.0;
    const TAPER = [HOODY, ROOF, 0.1];
    const WSF = [1.05, HOODY + 0.03], WST = [0.45, ROOF - 0.04];
    const BED = 1.46;
    const outline = [
      [NOSE, AY], [NOSE, 1.14], ...curve([NOSE, 1.14], [NOSE, 1.32], [NOSE - 0.06, HOODY], [NOSE - 0.25, HOODY], 3), [1.2, HOODY],
      WSF, WST, ...curve(WST, [0.4, ROOF], [0.3, ROOF], [0.2, ROOF], 3), [-0.4, ROOF],
      ...curve([-0.4, ROOF], [-0.55, ROOF], [-0.6, ROOF - 0.08], [-0.62, ROOF - 0.2], 3), [-0.66, BED + 0.05],
      [-0.7, BED], [TAILZ + 0.1, BED], ...curve([TAILZ + 0.1, BED], [TAILZ, BED], [TAILZ, BED - 0.06], [TAILZ, BED - 0.14], 2),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const FL = (z) => flare(z, AY, ARC - BEV - 0.01, ARC - BEV + 0.1, 0.12);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => FL(z).translate(s > 0 ? HALF + 0.1 : -HALF + 0.02, 0, 0))),
    ]), low(0.8, 1.5, [0.64, 0.58, 0.5]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.55), 1.55], [zWS(1.94), 1.94], gx(1.55) - 0.1, gx(1.94) - 0.1, BEV + LIFT),
      ...sideGlass([[[zWS(1.52) - 0.08, 1.52], [-0.45, 1.52], [-0.45, 1.93], [zWS(1.94) - 0.06, 1.93]]], HALF, TAPER, LIFT),
      panel([[-0.55, 1.55, -0.6 - BEV - LIFT], [0.55, 1.55, -0.6 - BEV - LIFT], [0.5, 1.9, -0.6 - BEV - LIFT], [-0.5, 1.9, -0.6 - BEV - LIFT]].reverse()),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.2, 0.34, 0.04, 0, 1.08, FZ), bx(1.8, 0.14, 0.22, 0, 0.88, FZ + 0.06), bx(1.8, 0.14, 0.14, 0, 0.88, BZ - 0.02),
      bx(0.56, 0.08, 0.56, 0, HOODY + 0.07, 1.7),                       // the bonnet's scoop
      bx(0.04, 0.5, 0.04, -0.8, BED + 0.28, -0.7), bx(0.04, 0.5, 0.04, 0.8, BED + 0.28, -0.7),  // the cage's hoops behind the cab
    ]);
    // the spare, standing in the bed
    place(group, shared(k + 'sparetyre', () => new THREE.CylinderGeometry(0.46, 0.46, 0.3, 16).rotateZ(Math.PI / 2)), TYRE, 0, BED + 0.4, -1.3);
    place(group, shared(k + 'sparehub', () => new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12).rotateZ(Math.PI / 2)), HUB, 0, BED + 0.4, -1.3);
    parts(group, k + 'lamp', LAMP, () => [
      ...[-1, 1].map(s => bx(0.26, 0.14, 0.04, s * 0.72, 1.12, FZ + 0.002)),
      ...[-1, 1].map(s => dsc(0.1, 0.05, s * 0.4, ROOF + 0.12, 0.28, 0, 10)),     // the roof's spot lamps
    ]);
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.16, 0.07, 0.04, s * 0.72, 0.96, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.18, 0.2, 0.04, s * 0.82, 1.2, BZ - 0.006)));
    // dust thrown up the flanks and round the arches
    const dusty = new THREE.MeshLambertMaterial({ map: mud('dust', ['rgba(150,118,76,0.3)', 'rgba(168,136,92,0.8)', 'rgba(110,86,54,0.85)', 'rgba(222,198,150,0.65)']), transparent: true, depthWrite: false });
    const dirt = place(group, shared(k + 'dust', () => merge([-1, 1].flatMap(s => {
      const f = s > 0 ? 'x' : '-x', flip = s < 0, X = s * (HALF + BEV + 0.008);
      return [decal(3.2, 0.7, X, 1.12, -0.1, f, ...mudCell('sill', flip))];
    }))), dusty);
    dirt.renderOrder = 1;
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 18); wheel(group, k, R, TW, s * WX, AR, 18); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Armoured Limo (after the Cadillac One "The Beast", 2009) -----------------------------------------------
  // A vault on wheels: a tall slab-sided body, a high flat roof, small deep-set windows between thick pillars, a high
  // blunt nose with a wide grille between stacked lamps, heavy bumpers, deep arches over big run-flat wheels.
  armouredlimo: (car) => {
    const group = new THREE.Group(), k = 'beast';
    const R = 0.43, TW = 0.3, WX = car.hw - TW / 2, BEV = 0.06, ACROSS = 0.1, BW = 2.0, HALF = BW / 2;
    const NOSE = 3.0, TAILZ = -3.02, AY = 0.55, ARC = 0.56, AF = 2.05, AR = -1.95, ROOF = 1.85, BELT = 1.3;
    const TAPER = [BELT, ROOF, 0.07];
    const WSF = [1.72, BELT + 0.02], WST = [1.15, ROOF - 0.06];
    const outline = [
      [NOSE, AY], [NOSE, 1.12], ...curve([NOSE, 1.12], [NOSE, 1.24], [NOSE - 0.08, 1.3], [NOSE - 0.3, 1.32], 3), [1.8, 1.34],
      WSF, WST, ...curve(WST, [1.1, ROOF], [1.0, ROOF], [0.9, ROOF], 3), [-2.8, ROOF],
      ...curve([-2.8, ROOF], [-2.95, ROOF], [TAILZ, ROOF - 0.05], [TAILZ, ROOF - 0.16], 3),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]), low(0.5, 1.4, [0.66, 0.6, 0.54]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.4), 1.4], [zWS(1.76), 1.76], gx(1.4) - 0.3, gx(1.76) - 0.3, BEV + LIFT),
      ...sideGlass([
        [[1.1, 1.42], [0.25, 1.42], [0.25, 1.7], [1.06, 1.7]],
        [[0.05, 1.42], [-0.9, 1.42], [-0.9, 1.7], [0.05, 1.7]],
        [[-1.1, 1.42], [-2.0, 1.42], [-2.0, 1.7], [-1.1, 1.7]],
        [[-2.2, 1.42], [-2.65, 1.42], [-2.65, 1.7], [-2.2, 1.7]],
      ], HALF, TAPER, LIFT),
      panel([[-0.5, 1.45, BZ + 0.0 - LIFT], [0.5, 1.45, BZ - LIFT], [0.46, 1.7, BZ - LIFT], [-0.46, 1.7, BZ - LIFT]].reverse()),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.1, 0.4, 0.04, 0, 0.92, FZ), bx(1.95, 0.2, 0.2, 0, 0.7, FZ + 0.06), bx(1.95, 0.2, 0.16, 0, 0.7, BZ - 0.04),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, AY, ARC - BEV - 0.01, ARC - BEV + 0.08, 0.08).translate(s > 0 ? HALF + 0.07 : -HALF + 0.01, 0, 0))),
    ]);
    parts(group, k + 'chrome', CHROME, () => [-0.12, 0, 0.12].map(y => bx(0.9, 0.04, 0.03, 0, 0.92 + y, FZ + 0.02)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(s => [0.98, 1.18].map(y => bx(0.26, 0.14, 0.04, s * 0.74, y, FZ + 0.002))));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.2, 0.08, 0.04, s * 0.74, 0.8, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.34, 0.04, s * 0.82, 1.1, BZ - 0.006)));
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 16); wheel(group, k, R, TW, s * WX, AR, 16); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
