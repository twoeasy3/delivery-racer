// ---- a car idea's model: the Paddle-Wheel Amphibian (ideasPaddleDuck.js) -----------------------------------------------
// A tour boat on six road wheels: a sightseeing amphibian of the kind built on a wartime six-wheeled duck lorry (a boat's
// hull, a flat front deck, a glazed cab at the front and an open-sided passenger well under a flat canopy roof), crossed
// with a river steamer: a red paddle wheel turning at the stern and a steamer funnel standing on the engine deck behind
// the canopy. Its face is a duck's: a flat bill out of the bow, two eyes on the front deck. Empty benches (no people).
// Built as the approved Junker and the top-up batch C are (render/ideaModelsTopupC.js; the shared kit render/ideaModelsDkit.js):
// the hull an extrusion of its side view (a narrow keel between the wheels, the hull flaring out over them at the chine,
// so the wheels sit under the hull's flare: no scooped wells), the cab drawn in the same side view, so its glass is
// cabinGlass's (one inset outline: the windscreen and the side windows share one top line, a 14 cm A-pillar), parts that
// share a material and never move merged into one mesh, the paint darker low down (vertex colours), plain chunky wheels
// (a dark tyre and a plain hub disc: meshes of their own, so the suspension and the wheel cosmetics find all six).
// ONE small texture drawn in code: a soft waterline stain along the hull (128 x 32), no image files, no panel lines.
// The paddle wheel is a group of its own turning slowly about its axle (userData.animate: drawing only). Props
// (render/propcosmetic.js): the funnel is tagged `userData.prop = 'wing'` (it stands where a wing on the canopy's rear edge
// goes; see CHECKLIST). The builder takes the idea's entry and returns a group, the bow at local +z, with userData.body (the
// paint), userData.animate (seconds) => void, userData.livery (evil) => void and userData.stripe (hex: the canopy and the
// gunwale band). render/ideaModels.js spreads IDEA_MODELS_PADDLE_DUCK into IDEA_MODELS. State-free.
import * as THREE from 'three';
import {
  keep, lambert, TRIM, CHROME, GLASS, LAMP, TAIL, AMBER, shared, place, merge, parts, bx, blob, extrudeSide,
  shadeBy, decal, texture, random, wheel, cabinGlass,
} from './ideaModelsDkit.js';

const WHITE = keep(lambert(0xf6f4ee)), SEAT = keep(lambert(0x2e8a7e)), BILL = keep(lambert(0xf08a1c));

// the waterline: a band of river stain along the hull's foot, thick at the bottom edge and thinning upward into soft
// streaks, every edge faded out (no hard cut-off at its ends or its top)
const waterline = () => texture('paddleduck-waterline', 128, 32, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const rnd = random(19);
  for (let x = 0; x < w; x++) {
    const ends = Math.min(1, Math.min(x, w - 1 - x) / 14);
    const top = h * (0.46 + 0.1 * Math.sin(x * 0.13) + 0.05 * Math.sin(x * 0.41 + 1));
    for (let y = 0; y < h; y++) {
      const k = y < top ? 0 : Math.min(1, (y - top) / (h - top) * 1.6) * ends;
      if (k <= 0) continue;
      ctx.fillStyle = 'rgba(74,86,58,' + (0.34 * k).toFixed(3) + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) { // drips running up from the line (water dried on the paint)
    const x = 10 + rnd() * (w - 20), l = 3 + rnd() * 9;
    ctx.strokeStyle = 'rgba(70,82,56,' + (0.1 + rnd() * 0.12).toFixed(2) + ')';
    ctx.lineWidth = 0.8 + rnd();
    ctx.beginPath(); ctx.moveTo(x, h * 0.62); ctx.lineTo(x + (rnd() - 0.5) * 2, h * 0.62 - l); ctx.stroke();
  }
});

export const IDEA_MODELS_PADDLE_DUCK = {
  // ---- the Paddle-Wheel Amphibian (a duck-tour amphibian, after the DUKW conversions, with a stern paddle wheel) ----
  paddleduck: (car) => {
    const group = new THREE.Group();
    const k = 'pduck';
    const BEV = 0.05, ACROSS = 0.1, BW = 2.6, HALF = BW / 2;
    const R = 0.46, TW = 0.32, WX = 1.1, AF = 2.75, AR1 = -1.05, AR2 = -2.35;
    const CHINE = 1.0, GUN = 1.52, DECK = GUN + BEV, ROOF = 2.95, STERN = -3.3;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const stripe = new THREE.MeshLambertMaterial({ color: 0x24508a });
    const wheelRed = new THREE.MeshLambertMaterial({ color: 0xd8262b });
    const pupil = new THREE.MeshLambertMaterial({ color: 0x16181c });
    // ---- the hull and the cab, ONE side view (nose first, over the top, the chine back to the bow): the bow's face
    // leaning forward a little, the front deck rising gently to the cowl, the raked windscreen, the cab's flat roof, its
    // back straight down to the gunwale, the gunwale level to the upright transom, the chine level under it all
    const TAPER = [2.0, ROOF, 0.05];
    const BOW0 = [4.42, CHINE], BOW1 = [4.55, 1.5], WSF = [3.02, 1.95], WST = [2.72, ROOF], RB = [1.5, ROOF], CB = [1.5, GUN];
    const outline = [BOW0, BOW1, [3.2, 1.6], WSF, WST, RB, CB, [STERN, GUN], [STERN, CHINE]];
    // the keel: narrower than the track, under the hull between the wheels, its prow and its stern raked
    const KEEL = [[3.7, 0.45], [4.36, CHINE], [STERN + 0.05, CHINE], [-2.85, 0.45]];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      extrudeSide(KEEL, 1.72, BEV, null, 1, 0.08),
      bx(2.0, 0.36, 0.66, 0, GUN + BEV + 0.17, -2.9),                  // the engine housing on the deck behind the canopy (the funnel's foot)
    ]), (y) => { const t = Math.min(1, Math.max(0, (y - 0.4) / 1.3)); return [0.6 + 0.4 * t, 0.58 + 0.42 * t, 0.52 + 0.48 * t]; })), paint);
    // ALL the cab's glass from the body's own side profile (cabinGlass: one inset outline, level tops, the chunky A-pillar): one side
    // window a side from the A-pillar to the cab's back, the windscreen (its foot on the cowl: a second call with the belt there), and
    // the back window looking into the passenger well
    const INS = { aPillar: 0.07, roof: 0.05, cPillar: 0.09 };
    const ARGS = { from: outline.indexOf(WSF), to: outline.indexOf(CB), half: HALF, taper: TAPER, grow: BEV, inset: INS, lift: BEV + 0.006, sideLift: 0.006 };
    const glass = cabinGlass(outline, { ...ARGS, belt: 2.08 });
    const screen = cabinGlass(outline, { ...ARGS, belt: WSF[1] + 0.02, sideInset: 0.13 });
    parts(group, k + 'glass', GLASS, () => [...glass.sides, screen.front, glass.rear]);
    // the gunwale band (a few mm proud of each flank, its inner face in the paint) and the canopy roof: ONE flat roof the
    // whole length of the cab and the passenger well, laid on the cab's roof (its underside a centimetre into it) with a
    // short visor over the windscreen, and on posts over the open well
    const CANOPY = [WST[0] + 0.15, -2.62], CY0 = ROOF + BEV - 0.01, CT = 0.12;
    parts(group, k + 'stripe', stripe, () => [
      ...[-1, 1].map(s => bx(0.014, 0.1, 4.38 - STERN - 0.08, s * (HALF + 0.003), 1.42, (4.38 + STERN + 0.04) / 2)),
      bx(2.64, CT, CANOPY[0] - CANOPY[1], 0, CY0 + CT / 2, (CANOPY[0] + CANOPY[1]) / 2),
    ]);
    // the canopy's posts and a grab rail along each open side (bright metal)
    const POSTS = [0.3, -1.0, -2.45];
    parts(group, k + 'posts', CHROME, () => [-1, 1].flatMap(s => [
      ...POSTS.map(z => new THREE.CylinderGeometry(0.035, 0.035, CY0 + 0.01 - DECK + 0.02, 8).translate(s * 1.2, (CY0 + 0.01 + DECK - 0.02) / 2, z)),
      new THREE.CylinderGeometry(0.022, 0.022, CB[0] - BEV - POSTS[2] + 0.02, 6).rotateX(Math.PI / 2).translate(s * 1.2, 2.12, (CB[0] - BEV + POSTS[2]) / 2),
    ]));
    // the benches: five rows of two either side of an aisle, empty (no people), sat a centimetre into the deck
    const ROWS = [0.95, 0.15, -0.65, -1.45, -2.15];
    parts(group, k + 'seats', SEAT, () => ROWS.flatMap(z => [-1, 1].flatMap(s => [
      bx(0.95, 0.37, 0.42, s * 0.62, DECK + 0.175, z),
      bx(0.95, 0.44, 0.07, s * 0.62, DECK + 0.35 + 0.22, z - 0.2),
    ])));
    // the paddle wheel's two arms from the transom to its axle, and its axle across (dark)
    const PZ = -4.1, PY = 1.02, PR = 0.66, PX = 0.86;
    parts(group, k + 'dark', TRIM, () => [
      ...[-1, 1].map(s => bx(0.08, 0.14, 0.82, s * 0.94, PY, (STERN - BEV + 0.03 + PZ - 0.04) / 2)),
      new THREE.CylinderGeometry(0.06, 0.06, 2.0, 10).rotateZ(Math.PI / 2).translate(0, PY, PZ),
    ]);
    // the face: a flat bill out of the bow (the bow's face leans forward: everything on it tipped to match), two eyes
    // half sunk in the front deck, looking ahead
    const LEAN = Math.atan2(BOW1[0] - BOW0[0], BOW1[1] - BOW0[1]);
    const bowZ = (y) => BOW0[0] + (BOW1[0] - BOW0[0]) * (y - CHINE) / (BOW1[1] - CHINE) + BEV / Math.cos(LEAN); // (the bow face's silhouette at height y)
    const onBow = (geo, x, y, out = 0) => geo.rotateX(LEAN).translate(x, y, bowZ(y) + out);
    parts(group, k + 'bill', BILL, () => [blob(0.44, 0.075, 0.3, 0, 1.36, bowZ(1.36) + 0.02, [14, 6])]);
    const EYE = 0.16, eyes = [-1, 1].map(s => [s * 0.52, 1.56, 3.98]);
    // (white: the eyes, and the canopy's valance, a band hanging under its open sides and its back edge, just inside its edge)
    parts(group, k + 'white', WHITE, () => [
      ...eyes.map(([x, y, z]) => blob(EYE, EYE, EYE, x, y, z, [12, 7])),
      ...[-1, 1].map(s => bx(0.02, 0.105, CB[0] - BEV - CANOPY[1] - 0.04, s * 1.3, CY0 - 0.0475, (CB[0] - BEV + CANOPY[1] + 0.04) / 2)),
      bx(2.62, 0.105, 0.02, 0, CY0 - 0.0475, CANOPY[1] + 0.03),
    ]);
    const look = (s) => new THREE.Vector3(s * 0.28, 0.32, 0.9).normalize().multiplyScalar(EYE * 0.93);
    place(group, shared(k + 'pupils', () => merge(eyes.map(([x, y, z], i) => { const d = look(i ? 1 : -1); return blob(0.065, 0.065, 0.065, x + d.x, y + d.y, z + d.z, [8, 5]); }))), pupil);
    // the lamps: round headlamps in the bow's face either side of the bill, ambers outboard of them; tail lamps on the
    // transom's corners outboard of the paddle wheel's arms, ambers under them
    const lens = (r) => new THREE.CylinderGeometry(r, r, 0.04, 14).rotateX(Math.PI / 2);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => onBow(lens(0.11), s * 0.78, 1.2, 0.004)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.12, 0.03, s * 1.1, 1.36, STERN - BEV - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => onBow(new THREE.BoxGeometry(0.14, 0.07, 0.03), s * 1.08, 1.2, 0.002)),
      ...[-1, 1].map(s => bx(0.14, 0.07, 0.03, s * 1.1, 1.2, STERN - BEV - 0.006)),
    ]);
    // the waterline: a soft stain along the hull's flanks just over the chine, and across the transom
    const stained = new THREE.MeshLambertMaterial({ map: waterline(), transparent: true, depthWrite: false });
    const water = place(group, shared(k + 'water', () => merge([
      ...[-1, 1].map(s => decal(4.3 - STERN - 0.1, 0.24, s * (HALF + 0.006), CHINE + 0.13, (4.3 + STERN + 0.1) / 2, s > 0 ? 'x' : '-x', s > 0 ? [0, 1] : [1, 0])),
      decal(2.3, 0.24, 0, CHINE + 0.13, STERN - BEV - 0.004, '-z'),
    ])), stained);
    water.renderOrder = 1;
    // six wheels: one axle under the front deck, two close together under the stern
    for (const s of [-1, 1]) for (const z of [AF, AR1, AR2]) wheel(group, k, R, TW, s * WX, z);
    // the steamer funnel on the engine housing: a tapering stack, a band near its top and a flared lip (its own meshes,
    // tagged as a wing-slot prop: hidden when a wing is fitted on the canopy's rear edge)
    const FZ = -2.9, FY0 = DECK + 0.33, FH = 1.85;
    const funnel = place(group, shared(k + 'funnel', () => merge([
      new THREE.CylinderGeometry(0.17, 0.21, FH, 12).translate(0, FY0 + FH / 2, FZ),
      new THREE.CylinderGeometry(0.235, 0.18, 0.08, 12).translate(0, FY0 + FH + 0.03, FZ),
    ])), TRIM);
    const band = place(group, shared(k + 'band', () => new THREE.CylinderGeometry(0.183, 0.188, 0.2, 12, 1, true).translate(0, FY0 + FH - 0.36, FZ)), wheelRed);
    funnel.userData.prop = 'wing';
    band.userData.prop = 'wing';
    // the paddle wheel: two rims, four spokes across each, eight paddles between the rims, turning about its axle
    const paddle = new THREE.Group();
    paddle.position.set(0, PY, PZ);
    group.add(paddle);
    place(paddle, shared(k + 'paddle', () => merge([
      ...[-1, 1].flatMap(s => [
        new THREE.TorusGeometry(PR - 0.03, 0.035, 4, 20).rotateY(Math.PI / 2).translate(s * PX, 0, 0),
        ...[0, 1, 2, 3].map(i => new THREE.BoxGeometry(0.04, 2 * (PR - 0.04), 0.05).rotateX(i * Math.PI / 4).translate(s * PX, 0, 0)),
      ]),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => new THREE.BoxGeometry(2 * PX - 0.02, 0.3, 0.04).translate(0, PR - 0.17, 0).rotateX(i * Math.PI / 4 + Math.PI / 8)),
    ])), wheelRed);
    const colour = (hex) => stripe.color.setHex(hex);
    group.userData = {
      body,
      // (drawing only: the wheel turns slowly, its bottom paddles pushing back)
      animate: (t) => { paddle.rotation.x = t * 0.9; },
      livery: (evil) => {
        colour(evil ? 0x8a6a12 : 0x24508a);
        wheelRed.color.setHex(evil ? 0x7a1414 : 0xd8262b);
        pupil.color.setHex(evil ? 0xc0141c : 0x16181c);
      },
      stripe: colour,
    };
    return group;
  },
};
