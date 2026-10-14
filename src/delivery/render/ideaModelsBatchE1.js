// ---- car ideas' models, batch E1: the Cinquecento and the Kei Van ------------------------------------------------------
// Two small cars drawn as ideas (ideasBatchE1.js): a rear-engined 1950s egg of a microcar (after the Fiat 500, 1957: a
// round nose with a pair of lamps and a chrome bumper, a dome of a glasshouse, a sloping tail over the engine) and a tall
// narrow cab-over kei van (after the Suzuki Every: a flat face with a raked screen, a box body to the roof line, a
// near-vertical tailgate). Built as the approved Junker and Commuter are: bodies from extrusions of their side views
// (few bevel segments), dark glass laid a few mm proud, parts that share a material and never move merged into one mesh,
// plain chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them), paint shaded
// darker low down (vertex colours), and no texture at all (flat colours, shape and colour blocking). No image files, no panel lines, no wheel wells. Each builder takes the idea's entry and returns a group, front
// facing local +z, with userData.body, userData.animate and userData.livery. Spread into IDEA_MODELS by ideaModels.js.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, blob, curve, extrudeSide,
  narrowAt, panel, sideGlass, slopeGlass, shadeBy, low, wheel,
} from './ideaModelsDkit.js';

const LIFT = 0.006;
// a body soft and round in plan: the extrusion's vertices welded, its ends past |z| = from pulled in (the width shrinks
// smoothly to 1 - k at |z| = end), smooth normals and
const roundBody = (extruded, from, end, k) => {
  let geo = extruded.index ? extruded.toNonIndexed() : extruded;
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-3);
  const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, (Math.abs(pos.getZ(i)) - from) / (end - from));
    pos.setX(i, pos.getX(i) * (1 - k * t * t));
    uv[i * 2] = (pos.getZ(i) + pos.getX(i)) * 0.6; uv[i * 2 + 1] = pos.getY(i) * 0.6;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
};

const lineZ = (a, b) => (y) => a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); // z along a straight [z, y] line, at height y

export const IDEA_MODELS_BATCH_E1 = {
  // ---- the Cinquecento (after the Fiat 500, 1957) ----------------------------------------------------------------------
  // 3.0 m long and 1.35 wide with wheels: a rounded nose with a low bonnet, two round lamps in chrome rims on its front
  // corners (an amber lens under each), a chrome bumper bar with two over-riders, a raked screen, a domed roof, a sloping
  // rear window over a short engine deck, a rounded tail with small tail lamps and a rear chrome bumper.
  cinquecento: (car) => {
    const group = new THREE.Group();
    const k = 'cinque';
    const R = 0.3, TW = 0.15, HALF = 0.64, WX = car.hw - TW / 2, AF = 0.92, AR = -0.92;
    const BEV = 0.07, NOSE = 1.43, TAILZ = -1.43, ROOF = 1.25, BELT = 0.86;
    const TAPER = [BELT, ROOF, 0.2];
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const WSF = [0.8, 0.88], WST = [0.4, 1.19], RWT = [-0.42, 1.19], RWB = [-0.82, 0.98];
    const outline = [
      [1.38, 0.27], [NOSE, 0.4], [NOSE, 0.56],
      ...curve([NOSE, 0.56], [NOSE, 0.72], [1.3, 0.76], [1.1, 0.8], 4),
      WSF, WST, ...curve(WST, [0.34, 1.23], [0.2, ROOF], [0, ROOF], 4), ...curve([0, ROOF], [-0.2, ROOF], [-0.36, 1.23], RWT, 4),
      RWB, ...curve(RWB, [-1.0, 0.96], [-1.3, 0.92], [TAILZ, 0.72], 4),
      [TAILZ, 0.56], [TAILZ, 0.4], [-1.38, 0.27],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([roundBody(extrudeSide(outline, 2 * HALF, BEV, TAPER, 2, 0.17), 0.95, 1.5, 0.3)]), low(0.3, 0.85, [0.66, 0.6, 0.55]))), paint);
    const gx = (y) => narrowAt(HALF, y, TAPER), zWS = lineZ(WSF, WST), zRW = lineZ(RWT, RWB);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(0.95), 0.95], [zWS(1.14), 1.14], gx(0.95) - 0.13, gx(1.14) - 0.15, BEV + LIFT),
      slopeGlass([zRW(1.14), 1.14], [zRW(1.02), 1.02], gx(1.14) - 0.22, gx(1.02) - 0.17, BEV + 0.02),
      ...sideGlass([
        [[zWS(0.95) - 0.06, 0.95], [0.06, 0.95], [0.06, 1.16], [zWS(1.16) - 0.04, 1.16]],
        [[-0.04, 0.95], [-0.62, 0.95], [-0.52, 1.15], [-0.04, 1.15]],
      ], HALF, TAPER, LIFT),
    ]);
    // chrome: the two bumper bars and over-riders, the lamps' rims
    parts(group, k + 'chrome', CHROME, () => [
      bx(0.78, 0.06, 0.07, 0, 0.38, FZ + 0.0), bx(0.78, 0.06, 0.07, 0, 0.38, BZ - 0.0),
      ...[-1, 1].flatMap(s => [bx(0.05, 0.12, 0.07, s * 0.26, 0.38, FZ + 0.02), bx(0.05, 0.12, 0.07, s * 0.26, 0.38, BZ - 0.02)]),
      ...[-1, 1].map(s => blob(0.118, 0.118, 0.09, s * 0.36, 0.66, 1.4, [12, 8])),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => blob(0.088, 0.088, 0.075, s * 0.36, 0.66, 1.425, [12, 8])));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.1, 0.05, 0.03, s * 0.31, 0.52, FZ + 0.0)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.12, 0.09, 0.06, s * 0.33, 0.62, BZ + 0.012)));
    parts(group, k + 'black', TRIM, () => [
      bx(0.3, 0.1, 0.03, 0, 0.5, FZ - 0.005), // a badge panel on the nose
    ]);
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
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
    const WSF = [1.58, 1.08], WST = [1.12, 1.8];
    const outline = [
      [1.62, 0.33], [NOSE, 0.4], [NOSE, 0.98], ...curve([NOSE, 0.98], [NOSE, 1.04], [1.62, 1.06], WSF, 3),
      WST, ...curve(WST, [1.1, 1.83], [1.06, ROOF], [1.0, ROOF], 3),
      [-1.58, ROOF], ...curve([-1.58, ROOF], [TAILZ, ROOF], [TAILZ, 1.78], [TAILZ, 1.7], 3),
      [TAILZ, 0.5], [-1.62, 0.33],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV, zWS = lineZ(WSF, WST);
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, 2 * HALF, BEV, null, 2, 0.1)]), low(0.3, 1.0, [0.66, 0.6, 0.55]))), paint);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.2), 1.2], [zWS(1.72), 1.72], HALF - 0.1, HALF - 0.1, BEV + LIFT),
      ...sideGlass([
        [[zWS(1.18) - 0.1, 1.18], [0.3, 1.18], [0.3, 1.7], [zWS(1.7) - 0.06, 1.7]],
        [[0.14, 1.18], [-0.95, 1.18], [-0.95, 1.7], [0.14, 1.7]],
      ], HALF, null, LIFT),
      panel([[-0.58, 1.25, BZ - LIFT], [0.58, 1.25, BZ - LIFT], [0.58, 1.7, BZ - LIFT], [-0.58, 1.7, BZ - LIFT]].reverse()),
    ]);
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
