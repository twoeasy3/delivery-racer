// ---- car ideas' models, batch E5: the Touring Car and the Hill-Climb Special ---------------------------------------
// Two racing road cars drawn as ideas (ideasBatchE5.js): a BTCC / Group A-style racing saloon (after the BMW M3 E30, 1987:
// a boxy three-box saloon, flat flares over the wheels, a front splitter, a boot-lid wing on posts, a racing roundel on each
// door) and a Pikes Peak-style hill-climb hatch (after the Peugeot 205 T16 Pikes Peak car, 1987: a short wedge hatch with a flat
// engine deck behind the cabin, a deep splitter with end fins, and a very large two-element wing on tall end plates).
// Built as the approved Junker and the Sprint Hatch are (render/modelsOrig3.js, ideaModelsBatchD3.js; the helpers are shared
// from ideaModelsDkit.js): each body an extrusion of its side view with the edges rounded, flat dark glass laid a few mm
// proud, parts that share a material and never move merged into one mesh, paint shaded darker low down (vertex colours),
// plain chunky wheels (a tyre and a plain hub disc, meshes of their own, found by the showroom suspension). No wheel wells are
// cut: flat flare bands stand on the flank round each wheel. One 128 x 128 roundel texture each, drawn in code. No panel lines.
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void, userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_E5.
import * as THREE from 'three';
import {
  basic, TRIM, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, decal,
  curve, extrudeSide, narrowAt, sideGlass, slopeGlass, shadeBy, low, flare, wheel, texture, random,
} from './ideaModelsDkit.js';

const BRAKE = basic(0xc4101c);

// a racing number on a round plate with a dark ring, a little worn (128 x 128); the plate and the ink are the caller's
const roundel = (key, n, plate, ink) => texture('e5-roundel-' + key, 128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#16161a';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = plate;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = 'bold 84px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, w / 2, h / 2 + 5);
  const rnd = random(11);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(18 + rnd() * 92, 18 + rnd() * 92, 1.5 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
});

export const IDEA_MODELS_BATCH_E5 = {
  // ---- the Touring Car (after the BMW M3 E30 Group A, 1987) ---------------------------------------------------------
  // A road saloon gone racing: the plain boxy three-box shape (long flat bonnet, upright cabin with a door window and a rear
  // door window each side, a short boot), flat flare bands standing out round the wheels, a deep splitter, a black skirt along
  // each sill, and a wing on two posts on the boot lid with flat end plates. A racing roundel on each door.
  touringcar: (car) => {
    const group = new THREE.Group();
    const R = 0.33, TW = 0.28, AF = 1.25, AR = -1.2, WX = car.hw - TW / 2;
    const BEV = 0.05, ACROSS = 0.09, BW = 1.9, HALF = BW / 2;
    const NOSE = 2.1, TAILZ = -2.1, AY = 0.3, BELT = 0.92, ROOF = 1.3, DECK = 0.98;
    const k = 'tc';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.14];
    const WSF = [0.8, BELT], WST = [0.1, ROOF];
    const RW0 = [-0.95, ROOF], RW1 = [-1.55, DECK];
    const outline = [
      [NOSE, AY], [NOSE, 0.58], ...curve([NOSE, 0.58], [NOSE, 0.68], [NOSE - 0.08, 0.72], [NOSE - 0.3, 0.74], 3),
      WSF, WST,
      ...curve(WST, [0.04, ROOF + 0.01], [-0.02, ROOF + 0.01], [-0.12, ROOF], 3),
      RW0, RW1,
      [TAILZ + 0.08, DECK], ...curve([TAILZ + 0.08, DECK], [TAILZ, DECK], [TAILZ, DECK - 0.04], [TAILZ, DECK - 0.1], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      // a flat flare band round each wheel (no well cut: it stands on the flank, the tyre outside it)
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, R, R + 0.03, R + 0.13, 0.12).translate(s > 0 ? HALF + 0.1 : -HALF - 0.02, 0, 0))),
    ]), low(0.28, 0.85, [0.62, 0.58, 0.56]))), paint);
    const LIFT = 0.004, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    const zRW = (y) => RW0[0] + (RW1[0] - RW0[0]) * (ROOF - y) / (ROOF - DECK);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(0.97), 0.97], [zWS(1.17), 1.17], gx(0.97) - 0.1, gx(1.17) - 0.1, BEV + LIFT),
      slopeGlass([zRW(1.15), 1.15], [zRW(1.03), 1.03], gx(1.15) - 0.12, gx(1.03) - 0.12, BEV + 0.003),
      ...sideGlass([
        [[zWS(0.94) - 0.05, 0.94], [-0.1, 0.94], [-0.1, 1.2], [zWS(1.2) - 0.04, 1.2]],
        [[-0.26, 0.94], [-1.18, 0.94], [-1.18, 1.07], [-0.98, 1.2], [-0.26, 1.2]],
      ], HALF, TAPER, LIFT),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.1, 0.1, 0.03, 0, 0.5, FZ - 0.005),            // the grille
      bx(1.94, 0.1, 0.12, 0, 0.37, FZ + 0.02),           // the front bumper
      ...[-1, 1].map(s => bx(0.4, 0.17, 0.03, s * 0.68, 0.5, FZ - 0.02)), // the lamps' dark bezels
      bx(2.06, 0.04, 0.34, 0, 0.29, FZ + 0.05),           // the front splitter, standing out ahead of the nose
      ...[-1, 1].map(s => bx(0.04, 0.12, 0.34, s * 1.0, 0.34, FZ + 0.05)), // a small end fin on each end of it
      bx(1.94, 0.12, 0.12, 0, 0.42, BZ - 0.01),          // the rear bumper
      bx(0.5, 0.16, 0.03, 0, 0.8, BZ),                   // the dark panel between the tail lamps
      ...[-1, 1].map(s => bx(0.07, 0.1, 1.7, s * (HALF + 0.004), 0.34, 0.0)), // the sill skirts
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.14, s * (gx(0.93) + 0.02), 0.92, 0.5)), // the mirrors, on the door tops by the screen's foot
    ]);
    // the wing: a main plane on two posts, flat end plates at its ends, its trailing edge a little raised
    parts(group, k + 'wing', TRIM, () => [
      bx(1.86, 0.04, 0.36, 0, 1.5, -1.95, 0.14),
      ...[-1, 1].map(s => bx(0.03, 0.3, 0.5, s * 0.94, 1.47, -1.95)),
      ...[-1, 1].map(s => bx(0.07, 0.53, 0.11, s * 0.35, 1.235, -1.92)),
    ]);
    // lamps: wide rectangular headlamps either side of the grille, amber under their outer ends; a tail lamp each side with a brake lamp inboard
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.34, 0.12, 0.04, s * 0.68, 0.5, FZ - 0.005)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.4, 0.13, 0.04, s * 0.66, 0.8, BZ + 0.005)));
    parts(group, k + 'brake', BRAKE, () => [-1, 1].map(s => bx(0.14, 0.11, 0.04, s * 0.32, 0.8, BZ - 0.002)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.05, 0.04, s * 0.8, 0.4, FZ - 0.005)),
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.04, s * 0.84, 0.68, BZ + 0.005)),
    ]);
    // a racing roundel on each door
    const num = new THREE.MeshLambertMaterial({ map: roundel('tc', '3', '#f4f1e8', '#1a1a1a'), transparent: true, depthWrite: false });
    const X = HALF + 0.006;
    const marks = place(group, shared(k + 'marks', () => merge([
      decal(0.58, 0.58, X, 0.68, 0.25, 'x'), decal(0.58, 0.58, -X, 0.68, 0.25, '-x'),
    ])), num);
    marks.renderOrder = 1;
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Hill-Climb Special (after the Peugeot 205 T16 Pikes Peak, 1987) -------------------------------------------
  // A short wedge hatch: a long rising nose with a big dark intake and a bonnet vent, a short raked screen, a small cabin with
  // one door window each side and a roof scoop, then a flat engine deck with two intakes and a black scoop behind each door.
  // A deep splitter with end fins, a rear lip, and a VERY large two-element wing on tall end plates, high over the tail.
  // Wide flat flares round big wide wheels. A racing roundel on each door.
  hillclimb: (car) => {
    const group = new THREE.Group();
    const R = 0.34, TW = 0.34, AF = 1.2, AR = -1.12, WX = car.hw - TW / 2;
    const BEV = 0.05, ACROSS = 0.09, BW = 1.86, HALF = BW / 2;
    const NOSE = 1.9, TAILZ = -1.85, AY = 0.3, BELT = 0.94, ROOF = 1.22, DECK = 1.04;
    const k = 'hc';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.16];
    const WSF = [0.62, 0.9], WST = [0.05, ROOF];
    const RW0 = [-0.4, ROOF], RW1 = [-0.85, DECK];
    const outline = [
      [NOSE, AY], [NOSE, 0.56], ...curve([NOSE, 0.56], [NOSE, 0.62], [NOSE - 0.04, 0.64], [NOSE - 0.12, 0.66], 3),
      WSF, WST,
      ...curve(WST, [0.0, ROOF + 0.01], [-0.05, ROOF + 0.01], [-0.12, ROOF], 3),
      RW0, RW1,
      [TAILZ + 0.08, DECK], ...curve([TAILZ + 0.08, DECK], [TAILZ, DECK], [TAILZ, DECK - 0.04], [TAILZ, DECK - 0.1], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      // wide flat flare bands round each wheel (no well cut)
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, R, R + 0.03, R + 0.15, 0.14).translate(s > 0 ? HALF + 0.12 : -HALF - 0.02, 0, 0))),
    ]), low(0.28, 0.85, [0.62, 0.58, 0.56]))), paint);
    const LIFT = 0.004, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    const zRW = (y) => RW0[0] + (RW1[0] - RW0[0]) * (ROOF - y) / (ROOF - DECK);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(0.98), 0.98], [zWS(1.16), 1.16], gx(0.98) - 0.1, gx(1.16) - 0.1, BEV + LIFT),
      slopeGlass([zRW(1.15), 1.15], [zRW(1.07), 1.07], gx(1.15) - 0.12, gx(1.07) - 0.12, BEV + LIFT),
      ...sideGlass([
        [[zWS(0.97) - 0.05, 0.97], [-0.66, 0.97], [-0.5, 1.12], [-0.3, 1.16], [zWS(1.16) - 0.04, 1.16]],
      ], HALF, TAPER, LIFT),
    ]);
    // the bonnet vent lies on the bonnet's slope (front down, 0.237 rad)
    const SLOPE = Math.atan2(0.9 - 0.66, 1.78 - WSF[0]);
    parts(group, k + 'black', TRIM, () => [
      bx(1.4, 0.17, 0.03, 0, 0.45, FZ - 0.005),          // the big nose intake
      bx(2.0, 0.04, 0.5, 0, 0.29, FZ + 0.05),           // the deep front splitter
      ...[-1, 1].map(s => bx(0.04, 0.16, 0.5, s * 1.02, 0.36, FZ + 0.05)), // an end fin on each end of it
      ...[-1, 1].map(s => bx(0.4, 0.17, 0.03, s * 0.73, 0.5, FZ - 0.02)), // the lamps' dark bezels
      bx(0.6, 0.02, 0.4, 0, 0.83, 1.2, SLOPE),   // the bonnet vent
      bx(0.32, 0.12, 0.34, 0, 1.3, -0.05),               // the roof scoop
      ...[-1, 1].map(s => bx(0.1, 0.28, 0.5, s * HALF, 0.72, -0.95)), // the scoop behind each door
      bx(0.5, 0.02, 0.7, -0.35, DECK + BEV, -1.25), // an engine deck intake
      bx(0.5, 0.02, 0.7, 0.35, DECK + BEV, -1.25),  // the other
      bx(1.86, 0.12, 0.12, 0, 0.42, BZ - 0.01),           // the rear bumper
      bx(1.4, 0.05, 0.22, 0, 0.3, BZ - 0.05),            // the rear lip
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.14, s * (gx(0.96) + 0.02), 0.96, 0.38)), // the mirrors
    ]);
    // the wing: a deep main plane and a steeper flap above and behind it, on two tall posts, between very tall end plates
    parts(group, k + 'wing', TRIM, () => [
      bx(2.0, 0.05, 0.56, 0, 1.45, -1.95, 0.16),
      bx(2.0, 0.04, 0.3, 0, 1.64, -2.12, 0.5),
      ...[-1, 1].map(s => bx(0.04, 0.72, 0.95, s * 1.0, 1.52, -1.99)),
      ...[-1, 1].map(s => bx(0.08, 0.55, 0.12, s * 0.5, 1.2, -1.9)),
    ]);
    // lamps: wide rectangular headlamps in the nose either side of the intake, amber under them; slim tail lamps with brake lamps inboard
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.34, 0.12, 0.04, s * 0.73, 0.5, FZ - 0.005)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.44, 0.1, 0.04, s * 0.64, 0.82, BZ + 0.005)));
    parts(group, k + 'brake', BRAKE, () => [-1, 1].map(s => bx(0.16, 0.1, 0.04, s * 0.27, 0.82, BZ - 0.002)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.05, 0.04, s * 0.8, 0.4, FZ - 0.005)),
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.04, s * 0.8, 0.66, BZ + 0.005)),
    ]);
    const num = new THREE.MeshLambertMaterial({ map: roundel('hc', '7', '#f2c230', '#1a1a1a'), transparent: true, depthWrite: false });
    const X = HALF + 0.006;
    const marks = place(group, shared(k + 'marks', () => merge([
      decal(0.58, 0.58, X, 0.66, 0.15, 'x'), decal(0.58, 0.58, -X, 0.66, 0.15, '-x'),
    ])), num);
    marks.renderOrder = 1;
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
