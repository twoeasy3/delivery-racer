// ---- car ideas' models, batch M4: the Log Truck, the Fuel Tanker and the Combine Harvester (ideasBatchM4.js) -----------
// Three working vehicles drawn as ideas: a North American bonneted logging truck on three axles with a bolstered load of
// round logs (after a Western Star 4900), a European cab-over rigid fuel tanker (after a Volvo FM tanker: a smooth oval
// tank, plain hazard diamonds, no text) and a combine harvester (after a Claas Lexion: a wide header with its reel, a
// glass driver's cab, the grain tank and the folded unloading auger; the header held to the ideas' 3 m width cap).
// Built as the approved Junker and Commuter are: bodies from extrusions of their side views (few bevel segments), dark
// glass from the body's own profile (cabinGlass), parts that share a material and never move merged into one mesh, plain
// chunky wheels (a tyre and a hub disc, meshes of their own so the showroom's suspension finds them), paint shaded darker
// low down (vertex colours). NO textures on any of the three (the owner, 14-Oct: default to none): the logs' end grain is
// vertex shading. No image files, no panel lines, no people (closed cabs, dark glass).
// Each builder takes the idea's entry and returns a group (nose to local +z) with userData.body (the paint), animate and
// livery (the tanker's tank, the combine's reel: their second colour). Helpers: ideaModelsDkit.js. State-free.
import * as THREE from 'three';
import {
  TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, lambert, shared, place, merge, parts, bx, curve,
  extrudeSide, shadeBy, low, wheel, cabinGlass, random, roundRect,
} from './ideaModelsDkit.js';

// a round rod from [x0, y0, z0] to [x1, y1, z1] (a pipe, an auger tube)
const rod3 = (r, a, b, seg = 8, open = false) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const geo = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, open);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};

export const IDEA_MODELS_BATCH_M4 = {
  // ---- the Log Truck (after a Western Star 4900 logging truck) ------------------------------------------------------
  // A long square bonnet with a tall chrome grille between two separate front wings (rectangular lamps in their faces),
  // a chrome bumper, a day cab with a flat screen, chrome fuel tanks under the doors and twin chrome stacks behind the
  // cab; a headache rack, then three bunks with upright stakes cradling twelve round logs (bark sides, pale end grain:
  // vertex shading, no texture) that run to the very tail; a tandem of dual wheels under flat mudguards.
  logtruck: (car) => {
    const group = new THREE.Group(), k = 'logt';
    const R = 0.52, TWF = 0.32, TWR = 0.5, AF = 3.35, AR1 = -1.75, AR2 = -3.05;
    const BEV = 0.05, HALF = 1.15, BH = 0.78; // (cab half width, bonnet half width)
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    // the cab: a day cab, the screen near upright, a flat roof; TH a point on its straight back (the back window's foot)
    const WSF = [2.42, 2.2], WST = [2.2, 3.1], TH = [0.75, 2.3];
    const cab = [[0.75, 0.95], [2.42, 0.95], WSF, WST, [0.75, 3.14], TH];
    const TAPER = [2.2, 3.14, 0.05];
    // the bonnet: long and square, a touch lower at the nose
    const NOSE = 4.72;
    const bonnet = [[2.35, 0.95], [NOSE, 0.95], [NOSE, 1.9], ...curve([NOSE, 1.9], [NOSE, 2.0], [NOSE - 0.04, 2.04], [NOSE - 0.12, 2.05], 2), [2.35, 2.14]];
    // a front wing: over the front wheel, sloping down to the nose (its arch a plain arc)
    const wing = [[4.78, 0.72], [4.78, 1.06], ...curve([4.78, 1.06], [4.74, 1.3], [4.45, 1.42], [4.05, 1.42], 3), [2.75, 1.42], [2.55, 1.24], [2.55, 0.72], ['arc', AF, 0.72, 0.6]];
    const WINGX = 0.97, WINGW = 0.5;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(cab, 2 * HALF, BEV, TAPER, 1, 0.07),
      extrudeSide(bonnet, 2 * BH, BEV, null, 1, 0.06),
      ...[-1, 1].map(s => extrudeSide(wing, WINGW, 0.04, null, 1, 0.05).translate(s * WINGX, 0, 0)),
    ]), low(0.7, 1.7, [0.66, 0.62, 0.56]))), paint);
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): one door window a side, the screen
    // (its foot at the cowl over the bonnet: second call) and the small window in the cab's back
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(TH), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 2.25, sideInset: 0.5, windows: [[1.15, 9]] }), screen = cabinGlass(cab, { ...ARGS, belt: WSF[1] + 0.05, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the bunks (and their stakes) and the logs: where they are
    const BUNKS = [-0.4, -2.3, -4.2], BUNKY = 1.29, STAKEX = 1.19;
    parts(group, k + 'black', TRIM, () => [
      ...[-1, 1].map(s => bx(0.14, 0.22, 9.4, s * 0.5, 0.96, 0.0)),                       // chassis rails
      ...[AF, AR1, AR2].map(z => bx(2.0, 0.14, 0.16, 0, R, z)),                            // axles
      bx(1.04, 0.8, 0.02, 0, 1.45, NOSE + BEV + 0.06),                                     // the grille's dark mesh
      bx(2.3, 0.16, 0.16, 0, 1.12, 0.45),                                                  // the headache rack: its foot on the rails,
      ...[-1, 1].map(s => bx(0.12, 2.3, 0.12, s * 1.05, 2.2, 0.45)),                       // its posts,
      ...[1.75, 2.55, 3.32].map(y => bx(2.22, 0.09, 0.08, 0, y, 0.45)),                     // its bars
      ...[-0.6, -0.2, 0.2, 0.6].map(x => bx(0.05, 2.1, 0.05, x, 2.3, 0.45)),
      ...BUNKS.flatMap(z => [bx(2.5, 0.22, 0.25, 0, BUNKY - 0.11, z), ...[-1, 1].map(s => bx(0.12, 1.5, 0.12, s * STAKEX, BUNKY + 0.75, z))]), // bunks, stakes
      bx(2.4, 0.26, 0.12, 0, 0.92, -4.62),                                                 // the rear crossmember (the lamps' bar)
      ...[-1, 1].flatMap(s => [
        bx(0.73, 0.05, 2.5, s * 0.915, 1.12, -2.4),                                        // the flat mudguards over the tandem
        bx(0.5, 0.5, 0.02, s * 1.0, 0.86, -3.64),                                          // mudflaps under their rear edge
        bx(0.24, 0.04, 0.04, s * 1.27, 2.3, 2.3), bx(0.06, 0.55, 0.2, s * 1.42, 2.35, 2.3),  // the mirrors on their arms
        bx(0.36, 0.08, 0.3, s * 0.95, 0.4, 1.55),                                          // the step under each fuel tank
      ]),
    ]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(1.2, 0.95, 0.06, 0, 1.45, NOSE + BEV + 0.02),                                     // the grille surround
      ...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(i => bx(0.03, 0.8, 0.02, i * 0.115, 1.45, NOSE + BEV + 0.075)), // its upright bars
      bx(2.5, 0.3, 0.2, 0, 0.62, 4.88),                                                    // the bumper
      ...[-1, 1].flatMap(s => [
        bx(0.32, 0.22, 0.02, s * WINGX, 0.9, 4.832),                                       // the lamps' bezels
        new THREE.CylinderGeometry(0.28, 0.28, 1.1, 12).rotateX(Math.PI / 2).translate(s * 0.95, 0.72, 1.55), // the fuel tanks
        new THREE.CylinderGeometry(0.075, 0.075, 2.9, 10).translate(s * 1.0, 2.45, 0.66),  // the stacks
      ]),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.26, 0.16, 0.03, s * WINGX, 0.9, 4.838)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.2, 0.09, 0.03, s * 1.05, 0.62, 4.985)),                      // indicators in the bumper's ends
      ...[-0.6, -0.3, 0, 0.3, 0.6].map(x => bx(0.1, 0.06, 0.06, x, 3.17, 2.05)),             // the cab's clearance lamps
      ...[-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 0.72, 0.92, -4.69)),                       // rear indicators
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.22, 0.12, 0.03, s * 1.0, 0.92, -4.69)));
    // the logs: three rows (5, 4, 3) laid in the bunks, each a little different in girth and length (the load: tagged
    // userData.prop = 'cargo', so a chosen cargo prop hides it; the bunks and stakes are the truck's)
    const rnd = random(61), LOGS = [];
    const R0 = 0.228, DX = 0.455, DY = 0.455 * Math.sqrt(3) / 2;
    [[5, 0], [4, 1], [3, 2]].forEach(([n, row]) => {
      for (let i = 0; i < n; i++) {
        const r = R0 * (0.9 + rnd() * 0.12), front = 0.25 + rnd() * 0.12, back = -4.84 - rnd() * 0.12;
        LOGS.push({ x: (i - (n - 1) / 2) * DX, y: BUNKY + R0 + row * DY + (r - R0), r, front, back });
      }
    });
    const bark = place(group, shared(k + 'bark', () => shadeBy(merge(LOGS.map(l => new THREE.CylinderGeometry(l.r, l.r, l.front - l.back, 10, 1, true)
      .rotateX(Math.PI / 2).translate(l.x, l.y, (l.front + l.back) / 2))), (y, z, x) => {
      const l = LOGS.reduce((a, b) => (Math.hypot(x - b.x, y - b.y) < Math.hypot(x - a.x, y - a.y) ? b : a));
      const c = 0.8 + 0.25 * ((LOGS.indexOf(l) * 7) % 5) / 4;
      return [c, c * 0.97, c * 0.93];
    })), new THREE.MeshLambertMaterial({ color: 0x5c4532, vertexColors: true }));
    const ends = place(group, shared(k + 'grain', () => shadeBy(merge(LOGS.flatMap(l => [
      new THREE.CircleGeometry(l.r, 10).translate(l.x, l.y, l.front),
      new THREE.CircleGeometry(l.r, 10).rotateY(Math.PI).translate(l.x, l.y, l.back),
    ])), (y, z, x) => { // (the end grain: pale at the heart, darker toward the bark)
      const l = LOGS.reduce((a, b) => (Math.hypot(x - b.x, y - b.y) < Math.hypot(x - a.x, y - a.y) ? b : a));
      const t = Math.min(1, Math.hypot(x - l.x, y - l.y) / l.r);
      return [1 - 0.38 * t, 0.98 - 0.42 * t, 0.94 - 0.46 * t];
    })), new THREE.MeshLambertMaterial({ color: 0xe0bd84, vertexColors: true }));
    bark.userData.prop = 'cargo';
    ends.userData.prop = 'cargo';
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', R, TWF, s * (1.12 - TWF / 2 + 0.03), AF, 16);
      wheel(group, k + 'r', R, TWR, s * (1.25 - TWR / 2), AR1, 14);
      wheel(group, k + 'r', R, TWR, s * (1.25 - TWR / 2), AR2, 14);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Fuel Tanker (after a Volvo FM rigid fuel tanker) -------------------------------------------------------------
  // A cab-over cab on a three-axle chassis (one axle under the cab, a tandem of duals behind): a flat front with wide
  // headlamps in its lower corners, a dark grille panel under the screen, a sun visor, mirrors on arms, a dark bumper with
  // an orange plate (no text). Behind it a smooth oval tank with dished ends on three saddles, a walkway and a low rail
  // along its top with three manhole lids, plain hazard diamonds (no text) on its flanks and its back, aluminium lockers
  // under its flanks, the lamps on a bar under its back. The tank is a second colour (polished silver; dark gunmetal for
  // Evil: userData.livery).
  fueltanker: (car) => {
    const group = new THREE.Group(), k = 'tank';
    const R = 0.5, TWF = 0.32, TWR = 0.5, AF = 3.55, AR1 = -2.0, AR2 = -3.3;
    const BEV = 0.05, HALF = 1.22, FRONT = 4.48;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const tankMat = new THREE.MeshLambertMaterial({ color: 0xc9ced4, vertexColors: true });
    const WSF = [4.44, 1.92], WST = [4.24, 2.95], TH = [2.65, 2.3];
    const cab = [[2.65, 0.75], ['arc', AF, 0.75, 0.58], [FRONT, 0.75], [FRONT, 1.35], WSF, WST,
      ...curve(WST, [4.2, 3.05], [4.12, 3.1], [3.98, 3.1], 2), [2.65, 3.1], TH];
    const TAPER = [2.2, 3.1, 0.06];
    const body = place(group, shared(k + 'body', () => shadeBy(extrudeSide(cab, 2 * HALF, BEV, TAPER, 1, 0.08), low(0.7, 1.6, [0.72, 0.7, 0.68]))), paint);
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): the door window (its foot low, as on a
    // cab-over), the big screen (second call) and the small window in the cab's back, over the tank's front end
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(TH), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: 2.0, sideInset: 0.55, windows: [[3.35, 9]] }), screen = cabinGlass(cab, { ...ARGS, belt: WSF[1] + 0.04, sideInset: 0.1 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the tank: an oval section (flat-sided where the diamonds sit) extruded along the car, its ends dished by the bevel
    const TA = 1.08, TB = 0.8, TR = 0.64, TBV = 0.12, CY = 1.12 + TB + TBV, Z0 = -4.05, Z1 = 2.35;
    const tankTop = CY + TB + TBV;
    const tank = place(group, shared(k + 'tank', () => shadeBy(new THREE.ExtrudeGeometry(roundRect(TA, TB, TR), {
      depth: Z1 - Z0, bevelEnabled: true, bevelThickness: 0.22, bevelSize: TBV, bevelSegments: 3, curveSegments: 5,
    }).translate(0, CY, Z0), (y) => { // (a pale band along its shoulder, a little darker underneath)
      const c = 0.78 + 0.22 * Math.exp(-(((y - (CY + 0.62)) / 0.22) ** 2)) - 0.12 * Math.max(0, (CY - 0.3 - y) / 0.6);
      return [c, c, c * 1.02];
    })), tankMat);
    const FZ = FRONT + BEV;
    parts(group, k + 'black', TRIM, () => [
      ...[-1, 1].map(s => bx(0.14, 0.22, 8.8, s * 0.5, 0.95, 0.2)),                        // chassis rails
      ...[AF, AR1, AR2].map(z => bx(2.0, 0.14, 0.16, 0, R, z)),                            // axles
      bx(2.46, 0.3, 0.22, 0, 0.62, FRONT + 0.07),                                          // the bumper
      bx(1.3, 0.42, 0.03, 0, 1.6, FZ - 0.005),                                             // the grille panel
      ...[-1, 1].map(s => bx(0.5, 0.24, 0.03, s * 0.8, 1.12, FZ - 0.005)),                  // the headlamps' dark surrounds
      bx(2.1, 0.05, 0.32, 0, 3.02, 4.3, -0.2),                                              // the sun visor
      ...[1.6, -1.0, -3.4].map(z => bx(1.0, 0.12, 0.3, 0, 1.1, z)),                         // the tank's saddles
      bx(0.5, 0.06, 5.6, 0, tankTop + 0.01, -0.85),                                         // the walkway
      ...[0.9, -0.85, -2.6].map(z => new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12).translate(0, tankTop + 0.08, z)), // manhole lids
      bx(2.4, 0.26, 0.1, 0, 0.96, -4.15), bx(2.3, 0.18, 0.12, 0, 0.6, -4.2),               // the lamp bar, the under-run bar
      ...[-1, 1].map(s => bx(0.08, 0.4, 0.08, s * 0.5, 0.75, -4.2)),                        // (its hangers from the rails)
      ...[-1, 1].flatMap(s => [
        bx(0.73, 0.05, 2.6, s * 0.915, 1.08, -2.65),                                       // the flat mudguards over the tandem
        bx(0.5, 0.5, 0.02, s * 1.0, 0.82, -3.94),                                          // mudflaps under their rear edge
        bx(0.18, 0.04, 0.04, s * 1.3, 2.3, 4.25), bx(0.06, 0.5, 0.18, s * 1.37, 2.3, 4.25),  // the mirrors on their arms
      ]),
    ]);
    // aluminium: the lockers under the tank's flanks, the grille's bars, the rail along the walkway
    parts(group, k + 'alu', CHROME, () => [
      ...[-1, 1].map(s => bx(0.6, 0.52, 3.6, s * 0.85, 0.82, 0.6)),
      ...[1.5, 1.68].map(y => bx(1.2, 0.05, 0.02, 0, y, FZ + 0.015)),
      ...[-1, 1].flatMap(s => [bx(0.04, 0.04, 5.4, s * 0.3, tankTop + 0.2, -0.85), ...[1.7, 0, -1.7, -3.4].map(z => bx(0.04, 0.2, 0.04, s * 0.3, tankTop + 0.1, z))]),
    ]);
    // the hazard diamonds (plain: no text) on the flanks' flat band and the back, in white rims; the orange plates (front and back)
    const DX = TA + TBV;
    parts(group, k + 'white', lambert(0xf2f0ea), () => [
      ...[-1, 1].map(s => bx(0.008, 0.36, 0.36, s * (DX + 0.004), CY, -3.2, Math.PI / 4)),
      bx(0.36, 0.36, 0.008, 0, CY, Z0 - 0.22 - 0.004, 0, 0, Math.PI / 4),
    ]);
    parts(group, k + 'diamond', lambert(0xc4261c), () => [
      ...[-1, 1].map(s => bx(0.012, 0.29, 0.29, s * (DX + 0.008), CY, -3.2, Math.PI / 4)),
      bx(0.29, 0.29, 0.012, 0, CY, Z0 - 0.22 - 0.008, 0, 0, Math.PI / 4),
    ]);
    parts(group, k + 'plate', lambert(0xe8731c), () => [bx(0.4, 0.2, 0.02, 0, 0.62, FRONT + 0.185), bx(0.4, 0.2, 0.02, 0, 0.96, -4.205)]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.42, 0.16, 0.03, s * 0.8, 1.12, FZ + 0.005)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.12, 0.16, 0.03, s * 1.1, 1.12, FZ + 0.005)),
      ...[-1, 1].map(s => bx(0.16, 0.14, 0.03, s * 0.62, 0.96, -4.205)),
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.3, 0.14, 0.03, s * 0.95, 0.96, -4.205)));
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', R, TWF, s * (HALF - TWF / 2 + 0.02), AF, 16);
      wheel(group, k + 'r', R, TWR, s * (1.25 - TWR / 2), AR1, 14);
      wheel(group, k + 'r', R, TWR, s * (1.25 - TWR / 2), AR2, 14);
    }
    for (const part of group.children) part.position.z -= 0.2; // (built 20 cm forward of centre: set back so the model sits in its hitbox, -4.48 to 4.5)
    const colour = (hex) => tankMat.color.setHex(hex);
    group.userData = { body, tank, animate: () => {}, livery: (evil) => colour(evil ? 0x4a4f57 : 0xc9ced4), stripe: colour };
    return group;
  },
  // ---- the Combine Harvester (after a Claas Lexion) -----------------------------------------------------------------
  // A wide header out in front (a trough with pointed dividers at its ends, an auger inside it, the reel over it: six bats
  // on spiders, a second colour, on two arms), the feeder house rising from it to a glass cab perched on a deck over the
  // big front drive wheels (its screen leaning out, a white roof with work lamps and a beacon, a ladder down the left
  // front), the machine's tall body behind with the grain tank on top, the unloading auger folded along its left flank,
  // a radiator housing and a stack at the back, the straw chopper under the tail, small steering wheels behind. The
  // header is held to the ideas' 3 m width cap (a real one is 6 to 12 m).
  combine: (car) => {
    const group = new THREE.Group(), k = 'comb';
    const RF = 0.85, TWF = 0.6, RR = 0.52, TWR = 0.36, AF = 0.9, AR = -2.9;
    const BEV = 0.05, HW = 1.5;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const reelMat = new THREE.MeshLambertMaterial({ color: 0xe8c21c });
    // the header: a trough (its floor and back wall, in side view an L) the cap's width, with pointed end plates
    const header = [[2.75, 0.25], [3.98, 0.2], [4.02, 0.28], [2.95, 0.46], [2.95, 1.28], [2.75, 1.32]];
    const divider = [[2.75, 0.2], [4.04, 0.2], [3.62, 0.98], [2.75, 1.36]];
    // the feeder house, rising from the header's back to the body
    const feeder = [[1.85, 0.95], [2.8, 0.42], [2.8, 1.22], [1.85, 1.9]];
    // the body: a narrow lower part between the drive wheels, the wide upper part over them, its tail sloping
    const lower = [[-3.6, 0.75], [1.9, 0.75], [1.9, 2.0], [-3.6, 2.0]];
    const upper = [[-3.95, 1.95], [1.05, 1.95], [1.05, 3.2], [-3.55, 3.2], [-3.95, 2.75]];
    const tankTop = [[-2.5, 3.1], [0.9, 3.1], [0.9, 3.48], [0.76, 3.6], [-2.36, 3.6], [-2.5, 3.48]];
    // the cab: on its deck at the front, the screen leaning OUT at the top (to see the header), a flat roof
    const DECK = 2.16, WSF = [2.5, DECK + 0.02], WST = [2.66, 3.42], TH = [1.0, 2.6];
    const cab = [[1.0, DECK], WSF, WST, [2.58, 3.56], [1.0, 3.58], TH];
    const CHALF = 0.8;
    // the unloading auger, folded forward along the left flank from its pivot at the back
    const AUG0 = [1.32, 2.6, -3.4], AUG1 = [1.32, 3.25, 0.7], SPOUT = [1.32, 2.98, 0.95];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(header, 2 * HW - 0.2, 0.04, null, 1, 0.05),
      ...[-1, 1].map(s => extrudeSide(divider, 0.1, 0.02, null, 1, 0.02).translate(s * (HW - 0.05), 0, 0)),
      extrudeSide(feeder, 1.2, BEV, null, 1, 0.06),
      extrudeSide(lower, 1.6, BEV, null, 1, 0.06),
      extrudeSide(upper, 2.5, BEV, null, 1, 0.08),
      extrudeSide(tankTop, 2.3, BEV, null, 1, 0.06),
      extrudeSide(cab, 2 * CHALF, BEV, null, 1, 0.06),
      rod3(0.15, AUG0, AUG1, 10), rod3(0.13, AUG1, SPOUT, 10),
      rod3(0.18, [1.3, 2.0, -3.4], AUG0, 10),                                            // the auger's upright housing at the back
    ]), low(0.6, 2.4, [0.66, 0.64, 0.6]))), paint);
    // ALL the glass from the cab's own side profile (cabinGlass: one inset outline, level tops): the side windows down to the deck and the leaning
    // screen; the cab's back is against the body (no back window)
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, ARGS = { from: cab.indexOf(WSF), to: cab.indexOf(TH), half: CHALF, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(cab, { ...ARGS, belt: DECK + 0.12, sideInset: 0.2, windows: [[1.12, 9]] }), screen = cabinGlass(cab, { ...ARGS, belt: DECK + 0.1, sideInset: 0.08 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front]);
    const LZ = 2.58; // (the lamps' housings' front face)
    parts(group, k + 'black', TRIM, () => [
      bx(2.5, 0.12, 1.75, 0, DECK - 0.06, 1.75),                                            // the cab's deck, over the drive wheels
      ...[-1, 1].map(s => bx(0.4, 0.2, 0.16, s * 1.04, DECK + 0.1, LZ - 0.08)),             // the road lamps' housings on it
      bx(2.0, 0.16, 0.2, 0, 0.85, AF), bx(2.0, 0.14, 0.16, 0, RR, AR),                       // the axles
      ...[-1, 1].map(s => bx(0.18, 0.5, 0.18, s * 0.75, 0.6, AR)),                           // (the steering axle's hangers)
      bx(1.6, 0.5, 0.4, 0, 1.15, -3.75),                                                     // the straw chopper under the tail
      bx(2.0, 0.34, 0.8, 0, 3.36, -3.05),                                                    // the radiator housing
      new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14).rotateZ(Math.PI / 2).translate(-1.29, 2.55, -2.95), // the rotary screen, right flank
      ...[1.02, 1.22].map(x => bx(0.04, 1.9, 0.04, -x, 1.18, 2.2)),                           // the ladder: its rails,
      ...[0.5, 0.85, 1.2, 1.55, 1.9].map(y => bx(0.22, 0.03, 0.05, -1.12, y, 2.2)),           // its rungs
      ...[-1, 1].map(s => bx(0.08, 0.06, 0.95, s * 1.38, 1.15, 3.2)),                         // the reel's arms, from the back wall
    ]);
    parts(group, k + 'steel', CHROME, () => [
      new THREE.CylinderGeometry(0.2, 0.2, 2.76, 10).rotateZ(Math.PI / 2).translate(0, 0.66, 3.2), // the auger in the trough
      new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8).translate(0.7, 3.6, -2.9),                  // the stack
    ]);
    parts(group, k + 'roof', lambert(0xeeeeea), () => [bx(1.78, 0.1, 1.72, 0, 3.66, 1.82)]);    // the cab's white roof
    // the reel: six bats round a tube, on three spiders (its second colour: userData.livery)
    const RZ = 3.55, RY = 1.18, RRD = 0.42;
    parts(group, k + 'reel', reelMat, () => [
      new THREE.CylinderGeometry(0.07, 0.07, 2.84, 8).rotateZ(Math.PI / 2).translate(0, RY, RZ),
      ...[0, 1, 2, 3, 4, 5].flatMap(i => {
        const a = i * Math.PI / 3 + 0.3, z = RZ + RRD * Math.cos(a), y = RY + RRD * Math.sin(a);
        return [bx(2.8, 0.06, 0.06, 0, y, z), ...[-1.3, 0, 1.3].map(x => bx(0.04, 0.04, RRD, x, RY + RRD / 2 * Math.sin(a), RZ + RRD / 2 * Math.cos(a), -a + Math.PI / 2))];
      }),
    ]);
    parts(group, k + 'lamp', LAMP, () => [
      ...[-1, 1].map(s => bx(0.2, 0.12, 0.03, s * 0.97, DECK + 0.1, LZ + 0.006)),            // the road headlamps
      ...[-0.6, -0.2, 0.2, 0.6].map(x => bx(0.14, 0.07, 0.04, x, 3.66, 2.69)),              // work lamps along the roof's front
    ]);
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.09, 0.12, 0.03, s * 1.18, DECK + 0.1, LZ + 0.006)),
      ...[-1, 1].map(s => bx(0.14, 0.14, 0.03, s * 0.65, 2.25, -4.006)),
      new THREE.CylinderGeometry(0.1, 0.1, 0.14, 10).translate(0, 3.78, 1.4),                 // the beacon
    ]);
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.22, 0.14, 0.03, s * 0.95, 2.25, -4.006)));
    for (const s of [-1, 1]) {
      wheel(group, k + 'f', RF, TWF, s * (HW - 0.05 - TWF / 2), AF, 18);
      wheel(group, k + 'r', RR, TWR, s * 1.0, AR, 14);
    }
    const colour = (hex) => reelMat.color.setHex(hex);
    group.userData = { body, animate: () => {}, livery: (evil) => colour(evil ? 0x2a2b30 : 0xe8c21c), stripe: colour };
    return group;
  },
};
