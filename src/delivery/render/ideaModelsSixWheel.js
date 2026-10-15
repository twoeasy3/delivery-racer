// ---- the Six-Wheel Supercar's model (a Legendary key car, cars.js BESPOKE_CARS; the owner, 15-Oct: the wheel key's new car) --------
// After the Covini C6W (2004; the Panther 6 of 1977 before it): a low mid-engined wedge coupe that steers on FOUR small front wheels
// on two axles and is pushed by two big ones at the back. Built as the approved Junker and the batch E5 cars are (the helpers shared
// from ideaModelsDkit.js): the body an extrusion of its side view with rounded edges, its glass from that same profile (cabinGlass:
// one inset outline, the screen and the side window level at the A-pillar), parts that share a material and never move merged into
// one mesh, the paint shaded darker low down (vertex colours). No texture. No wheel wells are cut: a flat flare band stands on the
// flank over each wheel, ONE band over the two front wheels (a twin arch: the six wheels are the car). Plain chunky wheels, each a
// tyre disc and a separate plain hub (found by the showroom suspension and dressed by the wheel cosmetics). No panel lines.
// The builder takes the car's entry and returns a group, front facing local +z, with userData.body, animate and livery.
import * as THREE from 'three';
import { basic, TRIM, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, dsc, curve, extrudeSide, narrowAt, cabinGlass, shadeBy, low, flare, wheel } from './ideaModelsDkit.js';

const BRAKE = basic(0xc4101c);
// one flare band over two wheels side by side (centres z1 > z2, axle height y): the union of two arch bands, radii ri to ro, `t` thick,
// its outer face at x 0 and its inner at -t (as Dkit's flare)
const twinFlare = (z1, z2, y, ri, ro, t) => {
  const d = (z1 - z2) / 2, ho = Math.sqrt(ro * ro - d * d), hi = Math.sqrt(Math.max(1e-4, ri * ri - d * d));
  const b = Math.atan2(ho, d), bi = Math.atan2(hi, d);
  const shape = new THREE.Shape();
  shape.moveTo(z1 + ro, y);
  shape.absarc(z1, y, ro, 0, Math.PI - b, false);
  shape.absarc(z2, y, ro, b, Math.PI, false);
  shape.lineTo(z2 - ri, y);
  shape.absarc(z2, y, ri, Math.PI, bi, true);
  shape.absarc(z1, y, ri, Math.PI - bi, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 6 }).rotateY(-Math.PI / 2);
};

export const IDEA_MODELS_SIXWHEEL = {
  sixwheeler: (car) => {
    const group = new THREE.Group();
    const k = 'sw6';
    const RF = 0.27, TF = 0.22, ZF1 = 1.5, ZF2 = 0.92;   // the four small front wheels, on two steered axles
    const RR = 0.35, TR = 0.34, ZR = -1.33;              // the two big driven rear wheels
    const BEV = 0.05, ACROSS = 0.09, BW = 1.9, HALF = BW / 2;
    const NOSE = 2.04, TAILZ = -2.02, AY = 0.2, BELT = 0.8, ROOF = 1.1, DECK = 0.86;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.17];
    const WSF = [0.6, BELT], WST = [-0.08, ROOF];
    const RW0 = [-0.6, ROOF], RW1 = [-1.08, DECK];
    // the side view: a low blunt nose, a long bonnet rising over the front wheels to a raked screen, a short flat roof, a steep
    // rear pillar down to a flat engine deck, a cut-off tail
    const outline = [
      [NOSE, AY], [NOSE, 0.4], ...curve([NOSE, 0.4], [NOSE, 0.5], [NOSE - 0.08, 0.54], [NOSE - 0.3, 0.57], 3),
      WSF, WST,
      ...curve(WST, [-0.14, ROOF + 0.01], [-0.2, ROOF + 0.01], [-0.26, ROOF], 2),
      RW0, RW1,
      [TAILZ + 0.12, DECK + 0.02], ...curve([TAILZ + 0.12, DECK + 0.02], [TAILZ + 0.02, DECK + 0.02], [TAILZ, DECK - 0.02], [TAILZ, DECK - 0.08], 2),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      // the flare bands: one twin band over the two front wheels, one over each rear wheel (no well cut: they stand on the flank)
      ...[-1, 1].flatMap(s => [
        twinFlare(ZF1, ZF2, RF, RF + 0.025, RF + 0.11, 0.12).translate(s > 0 ? HALF + 0.08 : -HALF + 0.04, 0, 0), // (outer face at +-(HALF + 0.08))
        flare(ZR, RR, RR + 0.03, RR + 0.12, 0.14).translate(s > 0 ? HALF + 0.1 : -HALF + 0.04, 0, 0),           // (outer face at +-(HALF + 0.1))
      ]),
    ]), low(0.25, 0.75, [0.6, 0.58, 0.56]))), paint);
    const gx = (y) => narrowAt(HALF, y, TAPER);
    // ALL the glass from the body's own side profile: one door window each side (the cabin is short: no B-pillar), the screen's top
    // level with the window's at the A-pillar, a small upright rear glass on the steep pillar behind the seats
    const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1), belt: BELT, half: HALF, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.008 }); // (8 mm off the flank: clear of the z-fight check's 4 mm)
    parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
    // the dark parts: a low mouth in the nose in two halves (the plate's place between them), a thin chin, the side intakes in front of the rear
    // wheels, a skirt along each sill between the arches, louvres on the engine deck, the black tail panel and a diffuser, the mirrors
    parts(group, k + 'black', TRIM, () => [
      ...[-1, 1].map(s => bx(0.36, 0.09, 0.03, s * 0.45, 0.38, FZ - 0.008)), // the mouth, split: the plate's room between its halves
      bx(1.8, 0.04, 0.1, 0, 0.17, FZ - 0.02),                            // the chin
      ...[-1, 1].map(s => bx(0.06, 0.2, 0.4, s * (HALF + 0.005), 0.6, -0.6)), // a side intake ahead of each rear wheel
      ...[-1, 1].map(s => bx(0.06, 0.1, 0.94, s * (HALF - 0.01), 0.26, 0.03)),   // the sill skirts, between the arches
      ...[0, 1, 2, 3].map(i => bx(1.0, 0.025, 0.07, 0, DECK + BEV + 0.012, -1.22 - i * 0.14)), // the engine deck's louvres
      bx(1.72, 0.3, 0.03, 0, 0.66, BZ + 0.004),                          // the black tail panel the lamps sit in
      bx(1.5, 0.08, 0.2, 0, 0.21, BZ + 0.06),                            // the diffuser
      ...[-1, 1].map(s => bx(0.12, 0.07, 0.15, s * (gx(0.84) + 0.03), 0.86, 0.42)), // the mirrors, on the door tops by the screen's foot
    ]);
    // the wing: a flat plane on two posts at the tail, with end plates (tagged: an equipped wing hides it, render/propcosmetic.js)
    parts(group, k + 'wing', TRIM, () => [
      bx(1.8, 0.04, 0.34, 0, 1.18, -1.86, 0.1),
      ...[-1, 1].map(s => bx(0.03, 0.2, 0.42, s * 0.9, 1.15, -1.87)),
      ...[-1, 1].map(s => bx(0.07, 0.3, 0.1, s * 0.42, 1.02, -1.82)),
    ]).userData.prop = 'wing';
    // lamps: a slim headlamp in each top corner of the nose with an amber lens outboard; round tail lamps, two a side, in the black panel
    // (the outer one a tail lamp, the inner one the brake lamp), an amber indicator under each pair
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.36, 0.08, 0.03, s * 0.55, 0.48, FZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.1, 0.08, 0.03, s * 0.8, 0.48, FZ - 0.008)),
      ...[-1, 1].map(s => bx(0.18, 0.04, 0.02, s * 0.62, 0.55, BZ - 0.006)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => dsc(0.085, 0.03, s * 0.72, 0.68, BZ - 0.006, 0, 12)));
    parts(group, k + 'brake', BRAKE, () => [-1, 1].map(s => dsc(0.085, 0.03, s * 0.5, 0.68, BZ - 0.006, 0, 12)));
    for (const s of [-1, 1]) {
      for (const z of [ZF1, ZF2]) wheel(group, k + 'f', RF, TF, s * (car.hw - TF / 2), z);
      wheel(group, k + 'r', RR, TR, s * (car.hw - TR / 2), ZR);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
