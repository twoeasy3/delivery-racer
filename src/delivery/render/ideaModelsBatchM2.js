// ---- car ideas' models, batch M2: the Stock Car (more to follow on this branch) ---------------------------------------
// Drawn as ideas (ideasBatchM2.js). Built as the approved Junker and the Touring Car are (render/modelsOrig3.js,
// ideaModelsBatchE5.js; the helpers are shared from ideaModelsDkit.js): each body an extrusion of its side view with the
// edges rounded, flat dark glass laid a few mm proud (cabinGlass: from the body's own profile), parts that share a
// material and never move merged into one mesh, paint shaded darker low down (vertex colours), plain chunky wheels (a
// tyre and a plain hub disc, meshes of their own, found by the showroom suspension). No wheel wells cut, no panel lines,
// no textures. Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the
// paint), userData.animate (seconds) => void, userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_M2.
import * as THREE from 'three';
import {
  basic, lambert, keep, TRIM, GLASS, LAMP, TAIL, shared, place, merge, parts, bx, dsc,
  curve, extrudeSide, narrowAt, cabinGlass, shadeBy, low, flare, wheel,
} from './ideaModelsDkit.js';

const WHITE = keep(lambert(0xf2f0ea));
void basic;

export const IDEA_MODELS_BATCH_M2 = {
  // ---- the Stock Car (after a 1990s NASCAR Cup car, Chevrolet Lumina era) --------------------------------------------
  // A long, low, wide saloon on a race stance: a low sloping nose with a black air dam right down on the road, a long
  // bonnet, a fast raked screen, a short roof, a long sloping rear window onto a short deck with a flat spoiler blade
  // across its edge. A bold contrasting band along each flank, a plain white number disc on each door and on the roof
  // (discs only: no digits, no logos). Headlamps are flat pale lenses on the nose, as the real cars' are.
  stockcar: (car) => {
    const group = new THREE.Group();
    const R = 0.34, TW = 0.3, AF = 1.42, AR = -1.4, WX = car.hw - TW / 2;
    const BEV = 0.05, ACROSS = 0.1, BW = 2.0, HALF = BW / 2;
    const NOSE = 2.4, TAILZ = -2.42, AY = 0.2, BELT = 0.86, ROOF = 1.3, DECK = 0.98;
    const k = 'm2sc';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const accent = new THREE.MeshLambertMaterial({ color: 0xf2c01e });
    const TAPER = [BELT, ROOF, 0.17];
    const WSF = [0.78, 0.84], WST = [-0.18, ROOF];
    const RW0 = [-0.82, ROOF], RW1 = [-1.85, DECK];
    const outline = [
      [NOSE, AY], [NOSE, 0.46], ...curve([NOSE, 0.46], [NOSE, 0.6], [NOSE - 0.12, 0.66], [NOSE - 0.4, 0.7], 3),
      WSF, WST,
      ...curve(WST, [-0.26, ROOF + 0.015], [-0.36, ROOF + 0.015], [-0.46, ROOF], 3),
      RW0, RW1,
      [TAILZ + 0.08, DECK], ...curve([TAILZ + 0.08, DECK], [TAILZ, DECK], [TAILZ, DECK - 0.04], [TAILZ, DECK - 0.1], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      // a slim flare band round each wheel (no well cut: it stands on the flank, the tyre half under it)
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, R, R + 0.03, R + 0.1, 0.1).translate(s > 0 ? HALF + 0.08 : -HALF - 0.02, 0, 0))),
    ]), low(0.2, 0.8, [0.62, 0.6, 0.58]))), paint);
    // ALL the glass from the body's own profile (cabinGlass): a door window and a small quarter window a side, the windscreen, the rear window
    const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1), belt: BELT + 0.02, half: HALF, taper: TAPER, grow: BEV,
      inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.006, windows: [[-0.62, 9], [-9, -0.78]] });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
    // the contrasting band along each flank (on the flat part of the flank, below the belt) and over the nose's face
    const gx = HALF + 0.006;
    parts(group, k + 'band', accent, () => [
      ...[-1, 1].map(s => bx(0.012, 0.2, 4.3, s * gx, 0.5, -0.02)),
      bx(1.7, 0.08, 0.012, 0, 0.56, FZ + 0.004),
    ]);
    // the spoiler: one flat blade across the deck's edge, leaning back (tagged: an equipped wing hides it, render/propcosmetic.js)
    const spoiler = parts(group, k + 'spoiler', accent, () => [
      bx(1.78, 0.2, 0.025, 0, DECK + BEV + 0.08, TAILZ + 0.07, -0.55),
      ...[-1, 1].map(s => bx(0.025, 0.16, 0.2, s * 0.89, DECK + BEV + 0.06, TAILZ + 0.12)),
    ]);
    spoiler.userData.prop = 'wing';
    // dark: the air dam and the splitter on the road, the grille slots, the rear valance, the sill skirts, the mirrors
    parts(group, k + 'black', TRIM, () => [
      bx(2.02, 0.14, 0.14, 0, 0.2, FZ + 0.02),
      bx(1.96, 0.03, 0.22, 0, 0.13, FZ + 0.06),
      bx(0.62, 0.08, 0.02, 0, 0.42, FZ + 0.004),
      bx(1.2, 0.06, 0.02, 0, 0.3, FZ + 0.06 + 0.04),
      bx(1.9, 0.12, 0.04, 0, 0.26, BZ - 0.01),
      ...[-1, 1].map(s => bx(0.06, 0.08, 1.9, s * (HALF + 0.02), 0.22, 0)),
      ...[-1, 1].map(s => bx(0.09, 0.06, 0.12, s * (narrowAt(HALF, 0.9, TAPER) + 0.03), 0.9, 0.62)),
      // the dark ring of each number disc (under the white disc)
      ...[-1, 1].map(s => dsc(0.31, 0.012, s * (HALF + 0.008), 0.62, 0.15, Math.PI / 2, 20)),
      new THREE.CylinderGeometry(0.29, 0.29, 0.012, 20).translate(0, ROOF + BEV + 0.004, -0.5),
    ]);
    // the white number discs: on each door, and one on the roof (no digits)
    parts(group, k + 'discs', WHITE, () => [
      ...[-1, 1].map(s => dsc(0.26, 0.012, s * (HALF + 0.013), 0.62, 0.15, Math.PI / 2, 20)),
      new THREE.CylinderGeometry(0.24, 0.24, 0.012, 20).translate(0, ROOF + BEV + 0.012, -0.5),
    ]);
    // the lamps: flat pale headlamp lenses on the nose either side of the grille; a long tail lamp each side (each brakes whole)
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.36, 0.1, 0.02, s * 0.6, 0.42, FZ + 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.42, 0.1, 0.02, s * 0.6, 0.82, BZ - 0.004)));
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    const colour = (hex) => accent.color.setHex(hex);
    group.userData = { body, animate: () => {}, livery: (evil) => colour(evil ? 0xd8262b : 0xf2c01e), stripe: colour };
    return group;
  },
};
