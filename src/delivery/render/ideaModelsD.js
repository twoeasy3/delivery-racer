// ---- car ideas' models, batch D (part 1): the Wedge Microcar, the Farm Tractor, the Flatbed Truck, the Utility Moke and
// the Half-Track (ideasD.js; part 2 is ideaModelsD2.js). Built as the approved Junker and Commuter are: each body an
// extrusion of its side view with its edges rounded (or, for the open ones, boxes and a plan extrusion), dark glass laid
// a few mm proud, parts that share a material and never move merged into one mesh, paint shaded darker low down (vertex
// colours), plain chunky wheels (a dark tyre and a plain hub disc, meshes of their own so the showroom's suspension finds
// them), and character from small textures drawn in code (mud: soft-edged, part see-through). No panel lines, no people:
// the open cars carry empty seats. Each builder takes the idea's entry and returns a group, front facing local +z, with
// userData.body (the paint), userData.animate and userData.livery. State-free. Helpers: ideaModelsDkit.js.
import * as THREE from 'three';
import {
  TYRE, HUB, TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, keep, lambert, shared, place, merge, parts, bx, dsc, blob,
  curve, extrudeSide, narrowAt, panel, sideGlass, slopeGlass, shadeBy, low, flare, wheel, mud, mudCell, decal, roundRect, extrudePlan,
} from './ideaModelsDkit.js';

const DARK = keep(lambert(0x1b1c20));
const SEAT = keep(lambert(0x3a3f46));
const WOOD = keep(lambert(0x9b7a4a));
const STRAW = keep(lambert(0xd4b24c));
const GREY = keep(lambert(0x565b63));

// a track belt: a stadium ring of length `len`, radius r (centre height 0) and `w` across, its outer face toothed
// (`n` points round, every other one pushed out 6 cm), as the plan in (z, y) extruded across the car, centred on x 0
const belt = (len, r, w, n = 28) => {
  const half = (len - 2 * r) / 2, straight = 2 * half, arc = Math.PI * r, total = 2 * straight + 2 * arc;
  const at = (s, rr) => { // the point s along the loop at radius rr, and its outward normal
    s = ((s % total) + total) % total;
    if (s < straight) return [-half + s, rr, 0, 1];
    if ((s -= straight) < arc) { const t = s / r; return [half + Math.sin(t) * rr, Math.cos(t) * rr, Math.sin(t), Math.cos(t)]; }
    if ((s -= arc) < straight) return [half - s, -rr, 0, -1];
    s -= straight; const t = s / r; return [-half - Math.sin(t) * rr, -Math.cos(t) * rr, -Math.sin(t), -Math.cos(t)];
  };
  const ring = (rr, tooth) => Array.from({ length: n }, (_, i) => {
    const [z, y, nz, ny] = at(i * total / n, rr), o = tooth && i % 2 === 0 ? 0.06 : 0;
    return new THREE.Vector2(z + nz * o, y + ny * o);
  });
  const shape = new THREE.Shape(ring(r, true));
  shape.holes.push(new THREE.Path(ring(r - 0.08, false).reverse()));
  return new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-w / 2, 0, 0);
};

export const IDEA_MODELS_D = {
  // ---- the Flatbed Truck (after the Ford F-600 flatbed, 1970s) ----------------------------------------------------
  // A long-nosed cab-and-bonnet truck with nothing behind the cab but a bare timber deck on black chassis rails, low
  // side boards on stakes, a tailboard, and a lumpy load of straw bales. Square grille between round lamps, chrome
  // bumper, big single wheels. The paint is darker low down.
  flatbed: (car) => {
    const group = new THREE.Group(), k = 'flatbed';
    const R = 0.52, TW = 0.3, WX = car.hw - TW / 2, AF = 2.05, AR = -1.55, BEV = 0.05, ACROSS = 0.07;
    const NOSE = 2.78, AY = 0.6, ARC = 0.62;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const HOOD = [
      [NOSE, AY], [NOSE, 1.2], ...curve([NOSE, 1.2], [NOSE, 1.38], [NOSE - 0.08, 1.46], [NOSE - 0.28, 1.48], 3), [1.4, 1.5], [1.4, AY],
      ['arc', AF, AY, ARC],
    ];
    const CAB = [
      [1.38, AY], [1.38, 1.5], [1.32, 1.5], [1.2, 2.24], ...curve([1.2, 2.24], [1.18, 2.34], [1.1, 2.36], [1.0, 2.36], 3),
      [0.3, 2.36], [0.2, 2.28], [0.2, AY],
    ];
    const FZ = NOSE + BEV, BZ = -2.8 - 0.05;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(HOOD, 1.7, BEV, null, 1, ACROSS),
      extrudeSide(CAB, 1.8, BEV, null, 1, ACROSS),
    ]), low(0.5, 1.4, [0.62, 0.56, 0.5]))), paint);
    // the cab's glass
    const LIFT = 0.006;
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([1.3, 1.62], [1.215, 2.2], 0.78, 0.78, BEV + LIFT),
      ...sideGlass([[[1.26, 1.6], [0.32, 1.6], [0.32, 2.2], [1.2, 2.2]]], 0.9, null, LIFT),
      panel([[-0.55, 1.72, 0.2 - BEV - LIFT], [0.55, 1.72, 0.2 - BEV - LIFT], [0.55, 2.2, 0.2 - BEV - LIFT], [-0.55, 2.2, 0.2 - BEV - LIFT]].reverse()),
    ]);
    // black: the grille, the chassis rails and axles, the tail beam, the stakes' feet
    parts(group, k + 'dark', TRIM, () => [
      bx(1.0, 0.48, 0.04, 0, 1.0, FZ),
      bx(0.16, 0.22, 5.2, 0.42, 0.78, -0.2), bx(0.16, 0.22, 5.2, -0.42, 0.78, -0.2),
      bx(1.7, 0.12, 0.12, 0, R, AF), bx(1.7, 0.12, 0.12, 0, R, AR),
      bx(1.8, 0.2, 0.1, 0, 0.98, -2.82),
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(2.0, 0.17, 0.16, 0, 0.55, FZ + 0.05),
      ...[-1, 1].map(s => dsc(0.15, 0.03, s * 0.7, 1.05, FZ - 0.01, 0, 12)),
      ...[-0.1, 0.05, 0.2].map(y => bx(0.9, 0.03, 0.03, 0, 0.96 + y - 0.05, FZ + 0.025)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.115, 0.03, s * 0.7, 1.05, FZ + 0.005, 0, 12)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.14, 0.07, 0.03, s * 0.7, 0.84, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.2, 0.15, 0.03, s * 0.72, 0.98, BZ + 0.036)));
    // the deck, its boards and stakes, the tailboard
    parts(group, k + 'wood', WOOD, () => [
      bx(1.8, 0.12, 2.9, 0, 1.12, -1.4),
      ...[-1, 1].map(s => bx(0.06, 0.34, 2.9, s * 0.87, 1.35, -1.4)),
      bx(1.8, 0.5, 0.06, 0, 1.43, 0.02), bx(1.8, 0.3, 0.06, 0, 1.33, -2.8),
      ...[-0.3, -1.0, -1.7, -2.4].flatMap(z => [-1, 1].map(s => bx(0.1, 0.56, 0.1, s * 0.9, 1.4, z))),
    ]);
    // the load: straw bales, a little crooked
    parts(group, k + 'straw', STRAW, () => [
      bx(0.8, 0.5, 0.55, -0.42, 1.49, -0.6, 0, 0.04), bx(0.8, 0.5, 0.55, 0.42, 1.49, -0.62, 0, -0.03),
      bx(0.8, 0.5, 0.55, -0.4, 1.49, -1.25, 0, -0.05), bx(0.8, 0.5, 0.55, 0.43, 1.49, -1.28, 0, 0.06),
      bx(0.8, 0.5, 0.55, 0.05, 1.99, -0.9, 0, 0.14), bx(0.8, 0.5, 0.55, -0.35, 1.99, -1.55, 0, -0.1),
    ]);
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 16); wheel(group, k, R, TW, s * WX, AR, 16); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Utility Moke (after the Mini Moke, 1964) -----------------------------------------------------------------
  // A flat tray of a car: a flat bonnet, a low open cockpit with side boards, two bucket seats and a bench (empty), a
  // little upright windscreen on a dark frame, round lamps in the nose, exposed wheels under shallow arches.
  moke: (car) => {
    const group = new THREE.Group(), k = 'moke';
    const R = 0.26, TW = 0.17, WX = car.hw - TW / 2, AF = 0.98, AR = -0.98, BW = 1.2, HALF = BW / 2, BEV = 0.04, ACROSS = 0.06;
    const NOSE = 1.45, TAILZ = -1.45, AY = 0.34, ARC = 0.3, FLOOR = 0.66, HOODY = 0.8;
    const outline = [
      [NOSE, AY], [NOSE, 0.72], ...curve([NOSE, 0.72], [NOSE, 0.78], [NOSE - 0.03, HOODY], [NOSE - 0.1, HOODY], 2), [0.8, HOODY], [0.74, FLOOR],
      [-1.1, FLOOR], [-1.16, 0.78], [-1.4, 0.78], ...curve([-1.4, 0.78], [-1.44, 0.78], [TAILZ, 0.76], [TAILZ, 0.7], 2),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, null, 1, ACROSS),
      ...[-1, 1].map(s => bx(0.06, 0.3, 1.95, s * (HALF - 0.03), 0.8, -0.2)),   // the side boards
    ]), low(0.3, 0.8, [0.6, 0.54, 0.48]))), paint);
    parts(group, k + 'seats', SEAT, () => [
      ...[-1, 1].flatMap(s => [bx(0.42, 0.12, 0.44, s * 0.27, 0.78, -0.1), bx(0.42, 0.5, 0.09, s * 0.27, 1.04, -0.36, -0.15)]),
      bx(1.0, 0.1, 0.38, 0, 0.76, -0.88),
    ]);
    parts(group, k + 'dark', TRIM, () => [
      bx(0.5, 0.26, 0.03, 0, 0.58, FZ),
      bx(1.28, 0.08, 0.1, 0, 0.4, FZ + 0.03), bx(1.28, 0.08, 0.1, 0, 0.4, BZ - 0.03),
      // the windscreen's frame: two posts and a rail
      ...[-1, 1].map(s => bx(0.04, 0.58, 0.04, s * 0.54, 1.1, 0.7, -0.2)),
      bx(1.1, 0.04, 0.04, 0, 1.39, 0.64), bx(1.1, 0.04, 0.05, 0, 0.83, 0.78),
      // the steering column and wheel
      new THREE.CylinderGeometry(0.022, 0.022, 0.4, 6).rotateX(-0.9).translate(0.27, 0.93, 0.5),
      new THREE.TorusGeometry(0.15, 0.02, 5, 12).rotateX(-0.9 - Math.PI / 2).translate(0.27, 1.07, 0.35),
    ]);
    const LIFT = 0.008;
    parts(group, k + 'glass', GLASS, () => [slopeGlass([0.77, 0.86], [0.65, 1.37], 0.52, 0.52, LIFT)]);
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.125, 0.03, s * 0.4, 0.58, FZ + 0.01, 0, 12)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.095, 0.03, s * 0.4, 0.58, FZ + 0.022, 0, 12)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.1, 0.06, 0.03, s * 0.5, 0.45, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.12, 0.1, 0.03, s * 0.46, 0.6, BZ - 0.006)));
    for (const s of [-1, 1]) { wheel(group, k, R, TW, s * WX, AF, 14); wheel(group, k, R, TW, s * WX, AR, 14); }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Half-Track (after the M3 half-track, 1941) ---------------------------------------------------------------
  // Wheels at the front, tracks at the back: a slab-sided open armoured tub (empty benches) behind a flat-topped
  // bonnet with an armoured radiator and a front roller, a low windscreen, two wheels under fenders, and a toothed track
  // belt either side of the tail over its road wheels. Worn paint (a soft multiply), mud low on the flanks.
  halftrack: (car) => {
    const group = new THREE.Group(), k = 'halftrack';
    const R = 0.5, TW = 0.32, WX = car.hw - TW / 2, AF = 2.1, BEV = 0.05;
    const NOSE = 2.95, FZ = NOSE + BEV, TUBF = 1.5, TUBB = -2.9, TY = 0.62;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const HOOD = [[NOSE, 0.62], [NOSE, 1.16], ...curve([NOSE, 1.16], [NOSE, 1.38], [NOSE - 0.06, 1.44], [NOSE - 0.2, 1.46], 3), [1.45, 1.5], [1.45, 0.62]];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(HOOD, 1.5, BEV, null, 1, 0.07),
      (() => { // the open tub: a plan ring (walls 10 cm) standing 1 m
        const half = (TUBF - TUBB) / 2, outer = roundRect(0.95, half, 0.15), hole = roundRect(0.85, half - 0.1, 0.1, new THREE.Path());
        outer.holes.push(hole);
        return extrudePlan(outer, 0.95, 0.05, TY, 1).translate(0, 0, (TUBF + TUBB) / 2);
      })(),
      ...[-1, 1].map(s => flare(AF, R, R + 0.06, R + 0.12, 0.44).translate(s * WX + 0.22, 0, 0)),
      bx(1.7, 0.08, 4.2, 0, 0.78, (TUBF + TUBB) / 2),                                  // the tub's floor
    ]), low(0.4, 1.3, [0.64, 0.58, 0.5]))), paint);
    parts(group, k + 'dark', TRIM, () => [
      bx(0.56, 0.5, 0.04, 0, 0.98, FZ),                                                // the armoured radiator
      bx(1.5, 0.24, 5.2, 0, 0.5, -0.3),                                                 // the hull's belly
      ...[-0.15, 0, 0.15].map(y => bx(0.62, 0.04, 0.06, 0, 0.98 + y, FZ + 0.02)),
      new THREE.CylinderGeometry(0.17, 0.17, 1.8, 10).rotateZ(Math.PI / 2).translate(0, 0.62, FZ + 0.2),   // the front roller
      ...[-1, 1].map(s => bx(0.1, 0.12, 0.3, s * 0.66, 0.66, FZ + 0.05)),
      // the benches inside the tub, the driver's seat
      ...[-1, 1].map(s => bx(0.3, 0.1, 2.2, s * 0.6, 1.08, -1.2)), bx(0.5, 0.1, 0.5, 0, 1.08, 0.95), bx(0.5, 0.4, 0.08, 0, 1.3, 0.7),
      // the windscreen's frame
      ...[-1, 1].map(s => bx(0.05, 0.42, 0.05, s * 0.72, 1.84, 1.38)), bx(1.5, 0.05, 0.05, 0, 2.04, 1.35),
    ]);
    const LIFT = 0.008;
    parts(group, k + 'glass', GLASS, () => [slopeGlass([1.4, 1.66], [1.34, 2.02], 0.7, 0.7, LIFT)]);
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.125, 0.03, s * 0.55, 1.0, FZ + 0.005, 0, 12)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.095, 0.03, s * 0.55, 1.0, FZ + 0.018, 0, 12)));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.12, 0.06, 0.03, s * 0.55, 0.82, FZ + 0.004)));
    const BZ = TUBB - 0.1;
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.1, 0.03, s * 0.74, 1.1, BZ - 0.006)));
    // the tracks: toothed belts over road wheels
    const TZ = -1.55, TX = car.hw - 0.2;
    parts(group, k + 'belt', TYRE, () => [-1, 1].map(s => belt(3.0, 0.38, 0.4).translate(s * TX, 0.44, TZ)));
    for (const s of [-1, 1]) for (const z of [-0.43, -0.99, -1.55, -2.11, -2.67]) {
      place(group, shared(k + 'rw', () => new THREE.CylinderGeometry(0.25, 0.25, 0.34, 12).rotateZ(Math.PI / 2)), GREY, s * TX, 0.44, z);
    }
    // worn paint and mud low on the flanks
    const muddy = new THREE.MeshLambertMaterial({ map: mud('track', ['rgba(88,76,52,0.34)', 'rgba(100,88,60,0.85)', 'rgba(58,50,34,0.9)', 'rgba(176,160,120,0.6)']), transparent: true, depthWrite: false });
    const dirt = place(group, shared(k + 'mud', () => merge([-1, 1].map(s =>
      decal(3.4, 0.5, s * (0.95 + BEV + 0.006), 0.95, -0.7, s > 0 ? 'x' : '-x', ...mudCell('sill', s < 0))))), muddy);
    dirt.renderOrder = 1;
    for (const s of [-1, 1]) wheel(group, k, R, TW, s * WX, AF, 16);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
