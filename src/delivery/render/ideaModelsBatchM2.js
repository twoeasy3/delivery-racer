// ---- car ideas' models, batch M2: the Stock Car, the Mobile Library and the Jingle Truck ---------------------------------------
// Drawn as ideas (ideasBatchM2.js). Built as the approved Junker and the Touring Car are (render/modelsOrig3.js,
// ideaModelsBatchE5.js; the helpers are shared from ideaModelsDkit.js): each body an extrusion of its side view with the
// edges rounded, flat dark glass laid a few mm proud (cabinGlass: from the body's own profile), parts that share a
// material and never move merged into one mesh, paint shaded darker low down (vertex colours), plain chunky wheels (a
// tyre and a plain hub disc, meshes of their own, found by the showroom suspension). No wheel wells cut, no panel lines,
// no textures. Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the
// paint), userData.animate (seconds) => void, userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_M2.
import * as THREE from 'three';
import {
  lambert, keep, TRIM, GLASS, CHROME, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, dsc, blob, decal,
  curve, extrudeSide, narrowAt, cabinGlass, shadeBy, low, flare, wheel, texture,
} from './ideaModelsDkit.js';

const WHITE = keep(lambert(0xf2f0ea));

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

  // ---- the Mobile Library (after a British coachbuilt mobile library on a Leyland Terrier chassis, 1970s) ------------
  // One long square box on a lorry chassis, the cab built into its front: a flat lower face with a dark grille and two round
  // lamps in chrome rims, a big two-pane windscreen leaning back a touch, a rounded dome over it with a blank cream board, a
  // flat roof. Down each flank the shelves sit behind blank paint, with a strip of high windows over them in a cream band
  // under the roof; a door window for the driver. At the back a door with a window and a fold-down step. Single wheels at the
  // front, twin at the back, under flat flare bands. No text, no textures.
  mobilelibrary: (car) => {
    const group = new THREE.Group();
    const R = 0.46, TF = 0.3, TR = 0.44, AF = 2.12, AR = -1.55;
    const BEV = 0.05, ACROSS = 0.1, BW = 2.6, HALF = BW / 2;
    const NOSE = 3.3, TAILZ = -3.3, AY = 0.62, ROOF = 3.0, WSY = 1.48, WTY = 2.34;
    const k = 'm2ml';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const cream = new THREE.MeshLambertMaterial({ color: 0xeee4c8 });
    const rake = 0.12, WSF = [NOSE, WSY], WST = [NOSE - rake * (WTY - WSY + 0.08) / (WTY - WSY), WTY + 0.08];
    const outline = [
      [NOSE, AY], WSF, WST,
      ...curve(WST, [WST[0] - 0.01, 2.72], [NOSE - 0.32, ROOF], [NOSE - 0.62, ROOF], 4),
      [TAILZ + 0.36, ROOF], ...curve([TAILZ + 0.36, ROOF], [TAILZ + 0.08, ROOF], [TAILZ, ROOF - 0.1], [TAILZ, ROOF - 0.34], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV, SX = HALF; // (the front face, the back face, the flank)
    const zAt = (y) => NOSE - rake * (y - WSY) / (WTY - WSY); // (the windscreen's face at height y)
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, null, 1, ACROSS),
      ...[-1, 1].flatMap(s => [[AF, TF], [AR, TR]].map(([z]) => flare(z, AY, R + 0.04, R + 0.13, 0.14).translate(s > 0 ? HALF + 0.12 : -HALF - 0.02, 0, 0))),
    ]), low(0.6, 1.6, [0.66, 0.62, 0.6]))), paint);
    // the cream band under the roof down both flanks (the shelves' high windows sit on it), and the blank board on the dome
    const BAND = [2.32, 2.86], BZ0 = TAILZ + 0.3, BZ1 = NOSE - 1.22;
    parts(group, k + 'cream', cream, () => [
      ...[-1, 1].map(s => bx(0.012, BAND[1] - BAND[0], BZ1 - BZ0, s * (SX + 0.006), (BAND[0] + BAND[1]) / 2, (BZ0 + BZ1) / 2)),
      bx(1.9, 0.3, 0.08, 0, 2.66, NOSE - 0.02, -0.35),
    ]);
    // the glass: one top line for the windscreen and the door windows (WTY, the pillar between them of one width); the high windows in
    // four panes a side; the back door's window
    const doorWin = [[NOSE - 0.14, WSY + 0.08], [NOSE - 0.14 - rake, WTY], [NOSE - 1.02, WTY], [NOSE - 1.02, WSY + 0.08]];
    const high = [0, 1, 2, 3].map(i => { const z1 = BZ1 - 0.08 - i * 1.18, z0 = z1 - 1.06; return [[z1, 2.4], [z1, 2.78], [z0, 2.78], [z0, 2.4]]; });
    const screen = (x0, x1) => {
      const a = [x0, WSY + 0.08], b = [x1, WTY];
      return panelAt([[x0, a[1], zAt(a[1]) + BEV + 0.008], [x1, a[1], zAt(a[1]) + BEV + 0.008], [x1, b[1], zAt(b[1]) + BEV + 0.008], [x0, b[1], zAt(b[1]) + BEV + 0.008]]);
    };
    parts(group, k + 'glass', GLASS, () => [
      ...sidePanes([doorWin, ...high], SX + 0.006, 0.006),
      screen(-HALF + 0.16, -0.04), screen(0.04, HALF - 0.16),
      panelAt([[0.42, 1.38, BZ - 0.008], [-0.42, 1.38, BZ - 0.008], [-0.42, 2.2, BZ - 0.008], [0.42, 2.2, BZ - 0.008]]),
    ]);
    // dark: the front bumper, the grille panel, the windscreen's centre pillar, the rear bumper, the back door's frame, the fold-down
    // step, the mirrors on their arms
    parts(group, k + 'black', TRIM, () => [
      bx(2.62, 0.2, 0.14, 0, 0.66, FZ + 0.04),
      bx(1.0, 0.42, 0.03, 0, 1.08, FZ + 0.004),
      bx(0.07, WTY - WSY, 0.03, 0, (WSY + WTY) / 2 + 0.02, zAt((WSY + WTY) / 2) + BEV + 0.012, -Math.atan(rake / (WTY - WSY))),
      bx(2.62, 0.18, 0.14, 0, 0.66, BZ - 0.04),
      bx(1.0, 1.86, 0.02, 0, 1.53, BZ - 0.002),
      bx(0.9, 0.05, 0.26, 0, 0.5, BZ - 0.13),
      ...[-1, 1].flatMap(s => [bx(0.12, 0.04, 0.04, s * (HALF + 0.06), 2.0, NOSE - 0.18), bx(0.06, 0.36, 0.16, s * (HALF + 0.12), 1.95, NOSE - 0.18)]),
    ]);
    // the back door itself (paint, a few cm proud of the frame: the frame shows round it)
    parts(group, k + 'chrome', CHROME, () => [
      ...[0.98, 1.1, 1.22].map(y => bx(0.92, 0.04, 0.02, 0, y, FZ + 0.02)),
      ...[-1, 1].map(s => dsc(0.15, 0.03, s * 0.86, 1.08, FZ + 0.01, 0, 14)),
      bx(0.04, 0.3, 0.04, 0.36, 1.6, BZ - 0.03),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.12, 0.03, s * 0.86, 1.08, FZ + 0.02, 0, 14)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.16, 0.08, 0.03, s * 1.12, 1.08, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.1, 0.03, s * 0.98, 1.0, BZ - 0.004)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.2, 0.03, s * 0.98, 1.2, BZ - 0.004)));
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', R, TF, s * (car.hw - TF / 2), AF);
      wheel(group, k + 'r', R, TR, s * (car.hw - TR / 2 - 0.02), AR);
    }
    group.userData = { body, animate: () => {}, livery: (evil) => cream.color.setHex(evil ? 0xc9c2b4 : 0xeee4c8) };
    return group;
  },

  // ---- the Jingle Truck (after a Pakistani decorated truck, coachbuilt on a Bedford J-type chassis) ------------------
  // A bonneted lorry dressed up: a narrow bonnet between rounded wings, a tall chrome grille, round lamps; a wide wooden cab
  // and over it a tall ornate headboard (a crown of arches and peaks leaning out over the windscreen, studded with plain
  // mirror discs and hung with tassels); behind it a tall wooden body with every panel painted (ONE small drawn-in-code
  // picture, a framed arch with rosettes, 128 x 128: the car does not read as a jingle truck as flat paint) and a tarpaulin
  // load heaped inside. Along the front bumper and the back, rows of chains each ending in a disc: the jingles. No text.
  jingletruck: (car) => {
    const group = new THREE.Group();
    const R = 0.5, TF = 0.32, TR = 0.5, AF = 2.5, AR = -1.75;
    const BEV = 0.05, k = 'm2jt';
    const NOSE = 3.25, CF = 2.32, CB = 1.02, ROOFC = 2.45, DECK = 1.24, BACK = -3.3, BH = 1.25, TOP = 2.95;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const accent = new THREE.MeshLambertMaterial({ color: 0xc8202e });
    const tassel = new THREE.MeshLambertMaterial({ color: 0x2aa04a });
    const shade = low(0.8, 1.8, [0.66, 0.6, 0.56]);
    // the bonnet (narrow, rounded at its nose) and the cab (wide, a raked windscreen, a flat roof)
    const BON = [[NOSE, 0.85], [NOSE, 1.38], ...curve([NOSE, 1.38], [NOSE, 1.52], [NOSE - 0.1, 1.6], [NOSE - 0.3, 1.6], 3), [CF, 1.64], [CF, 0.85]];
    const WSF = [CF, 1.66], WST = [CF - 0.2, ROOFC], TH = [CB, 2.1];
    const cab = [[CF, 0.85], WSF, WST, [CB, ROOFC], TH, [CB, 0.85]];
    const CW = 2.3, CHALF = CW / 2, CTAPER = [1.7, ROOFC, 0.05];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(BON, 1.36, BEV, null, 1, 0.12),
      extrudeSide(cab, CW, BEV, CTAPER, 1, 0.08),
      // the front wings: a flat arch cap over each front wheel, out at the cab's width, and the step under the door
      ...[-1, 1].flatMap(s => [
        flare(AF, 0.86, R + 0.04, R + 0.2, 0.36).translate(s * (CHALF - 0.02) + (s > 0 ? 0.36 : 0), 0, 0),
        bx(0.36, 0.06, 0.6, s * (CHALF - 0.2), 0.86, (CF + AF - R - 0.2) / 2 - 0.1),
      ]),
      // the body: its floor's edge, the tall side walls, the tail board, the front wall standing up behind the cab
      bx(2.5, 0.14, BACK - CB + 0.1 < 0 ? CB - 0.1 - BACK : 0, 0, DECK - 0.07, (BACK + CB - 0.1) / 2),
      ...[-1, 1].map(s => bx(0.08, TOP - DECK + 0.07, CB - 0.1 - BACK, s * (BH - 0.04), (TOP + DECK - 0.07) / 2, (BACK + CB - 0.1) / 2)),
      bx(2.5, TOP - DECK + 0.07, 0.08, 0, (TOP + DECK - 0.07) / 2, BACK + 0.04),
      bx(2.5, TOP + 0.25 - DECK, 0.08, 0, (TOP + 0.25 + DECK) / 2, CB - 0.14),
    ]), shade)), paint);
    // the glass from the cab's own profile: a door window a side, the windscreen, the back window (behind the body's front wall)
    const ARGS = { from: 1, to: cab.indexOf(TH), half: CHALF, taper: CTAPER, grow: BEV, inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 1.72, sideInset: 0.24 }), screen = cabinGlass(cab, { ...ARGS, belt: 1.68, sideInset: 0.12 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the headboard: a crown of arches and peaks over the cab, leaning out over the windscreen (accent), and a band of paint along the
    // body's top rail and the tail board's top (accent)
    const crownShape = () => {
      const s = new THREE.Shape(), W = CHALF + 0.02;
      s.moveTo(-W, 0); s.lineTo(W, 0); s.lineTo(W, 0.42);
      // from the right end in: two small arched peaks, then the big centre peak, then the two small ones on the left
      const peaks = [[0.85, 0.62, 0.2], [0.45, 0.72, 0.2], [0, 1.02, 0.25], [-0.45, 0.72, 0.2], [-0.85, 0.62, 0.2]];
      let x = W;
      for (const [cx, h, w] of peaks) {
        s.lineTo(cx + w, 0.42 + (x === W ? 0 : 0.02));
        s.quadraticCurveTo(cx + w * 0.4, h * 0.85, cx, h);
        s.quadraticCurveTo(cx - w * 0.4, h * 0.85, cx - w, 0.44);
        x = cx - w;
      }
      s.lineTo(-W, 0.42); s.closePath();
      return s;
    };
    const LEAN = 0.32, CZ = CF - 0.16, CY = ROOFC + BEV - 0.02; // (the crown's foot: over the windscreen's top)
    const crown = (g) => g.rotateX(-LEAN).translate(0, CY, CZ);
    parts(group, k + 'accent', accent, () => [
      crown(new THREE.ExtrudeGeometry(crownShape(), { depth: 0.08, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -0.04)),
      // the crown's struts back to the cab roof
      ...[-1, 1].map(s => bx(0.08, 0.06, 0.62, s * 0.9, ROOFC + BEV + 0.03, (CZ + CB) / 2 + 0.14)),
      ...[-1, 1].map(s => bx(0.06, 0.12, CB - 0.1 - BACK + 0.04, s * (BH + 0.005), TOP - 0.02, (BACK + CB - 0.1) / 2)),
      bx(2.52, 0.12, 0.06, 0, TOP - 0.02, BACK - 0.005),
      bx(2.52, 0.12, 0.06, 0, TOP + 0.23, CB - 0.14),
      // the bumper, a deep painted beam
      bx(2.3, 0.22, 0.16, 0, 0.74, NOSE + 0.1),
      bx(2.46, 0.2, 0.14, 0, 0.9, BACK - 0.12),
    ]);
    // chrome: the grille's bars, the lamps' rims, the crown's mirror discs (plain), and the jingles: chains along the front bumper
    // and under the tail, each ending in a disc
    const cx = (y) => -Math.sin(LEAN) * y; // (the crown's lean: z offset at height y above its foot)
    const jingles = (z, y0, n, w, front) => Array.from({ length: n }, (_, i) => {
      const x = -w / 2 + (w * i) / (n - 1), len = 0.16 + 0.08 * ((i % 2) ? 1 : 0);
      return [new THREE.CylinderGeometry(0.008, 0.008, len, 4, 1, true).translate(x, y0 - len / 2, z),
        dsc(0.035, 0.008, x, y0 - len - 0.03, z + (front ? 0.004 : -0.004), 0, 6)];
    }).flat();
    parts(group, k + 'chrome', CHROME, () => [
      ...[1.0, 1.12, 1.24, 1.36].map(y => bx(0.62, 0.04, 0.03, 0, y, NOSE + BEV + 0.015)),
      ...[-1, 1].map(s => dsc(0.14, 0.03, s * 0.52, 1.18, NOSE + BEV + 0.01, 0, 14)),
      ...[-0.85, -0.45, 0, 0.45, 0.85].map((x, i) => {
        const y = i === 2 ? 0.66 : 0.5;
        return dsc(i === 2 ? 0.13 : 0.08, 0.02, x, 0, 0, 0, 10).translate(0, 0, 0.05).rotateX(-LEAN).translate(0, CY + y * Math.cos(LEAN), CZ + cx(y) + 0.0);
      }),
      ...[-0.85, -0.3, 0.3, 0.85].map(x => dsc(0.06, 0.02, x, 0, 0, 0, 8).translate(0, 0, 0.05).rotateX(-LEAN).translate(0, CY + 0.22 * Math.cos(LEAN), CZ + cx(0.22))),
      ...jingles(NOSE + 0.19, 0.64, 11, 2.1, true),
      ...jingles(BACK - 0.2, 0.8, 7, 2.0, false),
    ]);
    // the tassels: under the crown's ends and on the mirrors (simple cones), green
    const cone = (x, y, z, h = 0.22) => new THREE.ConeGeometry(0.05, h, 6, 1, true).rotateX(Math.PI).translate(x, y - h / 2, z);
    parts(group, k + 'tassel', tassel, () => [
      ...[-1.12, -0.7, 0.7, 1.12].map(x => cone(x, CY + 0.02, CZ + 0.02)),
      ...[-1, 1].map(s => cone(s * (CHALF + 0.26), 1.86, CF - 0.08)),
      ...[-1.15, -0.5, 0.5, 1.15].map(x => cone(x, 0.8, BACK - 0.2, 0.2)),
    ]);
    // dark: the chassis rails under the body, the mirrors on their arms, the mud flaps, the grille's panel
    parts(group, k + 'black', TRIM, () => [
      ...[-1, 1].map(s => bx(0.14, 0.26, BACK - NOSE < 0 ? NOSE - BACK - 0.3 : 0, s * 0.45, 0.98, (NOSE + BACK) / 2 - 0.1)),
      bx(1.2, 0.14, 0.16, 0, R, AF), bx(1.6, 0.16, 0.18, 0, R, AR),
      ...[-1, 1].flatMap(s => [bx(0.3, 0.04, 0.04, s * (CHALF + 0.12), 2.0, CF - 0.08), bx(0.07, 0.36, 0.16, s * (CHALF + 0.26), 2.04, CF - 0.08)]),
      ...[-1, 1].map(s => bx(0.5, 0.5, 0.03, s * 1.02, 0.5, AR - R - 0.14)),
      bx(0.7, 0.5, 0.03, 0, 1.18, NOSE + BEV + 0.001),
    ]);
    // the load: a tarpaulin heaped inside the body (tagged userData.prop = 'cargo': a chosen cargo prop hides it)
    parts(group, k + 'tarp', keep(lambert(0x3f5a6a)), () => [
      blob(1.1, 0.6, 1.0, 0, TOP - 0.25, -0.4, [10, 6]), blob(1.0, 0.55, 1.2, 0, TOP - 0.3, -1.9, [10, 6]),
    ]).userData.prop = 'cargo';
    // the painted panels: one picture (a framed arch with rosettes), three panels a side, two on the tail board, one on each door
    const art = new THREE.MeshLambertMaterial({ map: panelArt(), transparent: true, depthWrite: false });
    const X = BH + 0.006, PW = (CB - 0.1 - BACK - 0.3) / 3, PY = (DECK + TOP) / 2 - 0.02, PH = TOP - DECK - 0.32;
    const decals = place(group, shared(k + 'art', () => merge([
      ...[-1, 1].flatMap(s => [0, 1, 2].map(i => decal(PW - 0.12, PH, s * X, PY, CB - 0.25 - PW / 2 - i * PW, s > 0 ? 'x' : '-x'))),
      ...[-0.6, 0.6].map(x => decal(1.0, PH, x, PY, BACK - 0.006, '-z')),
      ...[-1, 1].map(s => decal(0.66, 0.6, s * (narrowAt(CHALF, 1.3, CTAPER) + 0.006), 1.3, (CF + CB) / 2 - 0.05, s > 0 ? 'x' : '-x')),
    ])), art);
    decals.renderOrder = 1;
    // the lamps: round headlamps either side of the grille, ambers under them; tail lamps and ambers on the rear beam
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.11, 0.03, s * 0.52, 1.18, NOSE + BEV + 0.02, 0, 14)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.07, 0.03, s * 0.52, 0.95, NOSE + BEV + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 1.0, 0.9, BACK - 0.2)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.2, 0.12, 0.03, s * 0.7, 0.9, BACK - 0.2)));
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', R, TF, s * (CHALF - 0.1 - TF / 2 + 0.06), AF);
      wheel(group, k + 'r', R, TR, s * (BH - TR / 2), AR);
    }
    const colour = (hex) => accent.color.setHex(hex);
    group.userData = { body, animate: () => {}, livery: (evil) => { colour(evil ? 0xd8a020 : 0xc8202e); tassel.color.setHex(evil ? 0xc8202e : 0x2aa04a); }, stripe: colour };
    return group;
  },
};

// a flat convex panel through [x, y, z] points (in order), and side panes ([z, y] polygons) on both flanks at x = ±half
function panelAt(pts) {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
function sidePanes(polys, half) {
  return polys.flatMap(p => [panelAt(p.map(([z, y]) => [half, y, z])), panelAt(p.map(([z, y]) => [-half, y, z]).reverse())]);
}
// the Jingle Truck's painted panel (128 x 128, drawn once): a framed panel, a pointed arch in it with a rosette at its heart, small
// rosettes in its corners and a row of diamonds along its foot, in the trade's bright colours; no text
function panelArt() {
  return texture('m2-jingle-panel', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const rr = (x, y, ww, hh, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, ww, hh, r); ctx.fill(); };
    rr(2, 2, w - 4, h - 4, 10, '#1f6fb8');
    rr(9, 9, w - 18, h - 18, 7, '#f6d23a');
    rr(14, 14, w - 28, h - 28, 5, '#e8eef2');
    // the pointed arch
    ctx.fillStyle = '#c8202e';
    ctx.beginPath(); ctx.moveTo(26, 104); ctx.lineTo(26, 58); ctx.quadraticCurveTo(28, 30, 64, 20); ctx.quadraticCurveTo(100, 30, 102, 58); ctx.lineTo(102, 104); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2aa04a';
    ctx.beginPath(); ctx.moveTo(34, 104); ctx.lineTo(34, 60); ctx.quadraticCurveTo(36, 38, 64, 30); ctx.quadraticCurveTo(92, 38, 94, 60); ctx.lineTo(94, 104); ctx.closePath(); ctx.fill();
    const rosette = (x, y, r, petal, heart) => {
      ctx.fillStyle = petal;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.22, a, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = heart; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill();
    };
    rosette(64, 66, 24, '#f6d23a', '#c8202e');
    rosette(64, 66, 10, '#e8eef2', '#1f6fb8');
    for (const [x, y] of [[24, 24], [104, 24]]) rosette(x, y, 12, '#c8202e', '#1f6fb8');
    ctx.fillStyle = '#1f6fb8';
    for (let i = 0; i < 6; i++) { const x = 30 + i * 13.6; ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x + 6, 102); ctx.lineTo(x + 12, 108); ctx.lineTo(x + 6, 114); ctx.closePath(); ctx.fill(); }
  });
}
