// Ordinary keys, batch A (KEY-IDEAS.md rows 1 to 4): "normal" looking real-world keys, each registered with registerKey(name, builder)
// from keyModels.js and built with its kit (KEY_KIT), so the light, the rarity's rim, the initial, the tint by the car's colour and the
// idle sway match the Bespoke keys. No home yet (no car uses one): ?keys=ordinary (&only=<name>, &card) and ?keymodel=<name> show them.
//   roundhead  the 1950s-70s round-head blade key: a brass key whose round bow wears a moulded plastic cover in the car's colour
//              (a small chrome crest with the initial, the ring hole through both), a brass shoulder and a single-bitted blade
//   wing       the 1930s-50s bakelite wing-head key: a wide moulded head swept out into two wings with deco ribs, a chrome
//              shield crest with the initial, the ring hole in its raised boss, a brass collar and a toothed brass blade
//   flipkey    the 2000s switchblade (flip) key: a black remote with three buttons and a badge, its laser-cut blade folded out
//              on a pivot (the release button on it); a live view folds the blade away now and then and flicks it out again
//   rugged     the 4x4's rubber-boot fob: a fat ribbed rubber shell, a hexagonal plastic face in the car's colour with one big
//              button and the initial, a thick rubber lug with a webbing loop and a steel ring
// Built as the Bespoke keys are: standing (the head up, y), the face toward +z; everything on a face sunk a little into it and
// standing proud of it (no two faces share a plane); the parts that share a material merged at the end (KEY_KIT.merged).
import { registerKey, KEY_KIT } from './keyModels.js';

const { THREE, lambert, metal, glow, add, box, disc, outline, circle, slab, band, rimMaterial, rainbow, glyph, paintOf, inkOn, idle, merged, initialOf } = KEY_KIT;

// an ellipse's outline (rx by ry about (x, y)), as a shape or as a hole
const ellipse = (x, y, rx, ry, path = new THREE.Shape()) => { path.absellipse(x, y, rx, ry, 0, Math.PI * 2, path instanceof THREE.Shape ? false : true); return path; };
// a band round an ellipse, from (rx, ry) + d0 to + d1, `depth` thick about zc
const ellipseBand = (parent, material, x, y, rx, ry, d0, d1, depth, zc = 0, curve = 9) => {
  const shape = ellipse(x, y, rx + d1, ry + d1);
  shape.holes.push(ellipse(x, y, rx + d0, ry + d0, new THREE.Path()));
  return slab(parent, material, shape, depth, 0, zc, curve);
};
// a flat shape from points (no rounding), extruded `depth` about zc
const flat = (parent, material, pts, depth, zc = 0) => slab(parent, material, new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), depth, 0, zc, 1);

// ---- (1) the ROUND-HEAD key (the 1950s-70s blade key everyone draws) ----
const roundhead = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const COVER = metal(paint.getHex(), 25), BRASS = metal(0xc9a54e, 70), GROOVE = metal(0x8f7434, 40), CHROME = metal(0xd4d8de, 110);
  const ENAMEL = metal(0x1a1d23, 80), INK = glow(paint.clone().lerp(new THREE.Color(0xffffff), 0.25).getHex());
  // the plastic cover over the round bow: a slightly flattened disc, its ring hole near the top
  const CY = 0.55, RX = 1.0, RY = 0.92, HOLE = [0, CY + 0.56];
  const D = 0.24, B = 0.06, FRONT = D / 2 + B; // (the face at z = 0.18)
  const cover = ellipse(0, CY, RX, RY);
  cover.holes.push(circle(HOLE[0], HOLE[1], 0.17));
  slab(k, COVER, cover, D, B, 0, 11);
  // the brass bow inside it, seen in the ring hole (its edge buried in the plastic)
  const bow = circle(HOLE[0], HOLE[1], 0.27, new THREE.Shape());
  bow.holes.push(circle(HOLE[0], HOLE[1], 0.12));
  slab(k, BRASS, bow, 0.16, 0, 0, 8);
  // a moulded lip round the face (the cover's edge stands up a little), and the rarity's lit rim inside it
  ellipseBand(k, COVER, 0, CY, RX, RY, -0.16, -0.06, 0.08, FRONT);
  for (const s of [1, -1]) rainbow(ellipseBand(k, rimMaterial(rarity), 0, CY, RX, RY, -0.23, -0.17, 0.04, s * (FRONT + 0.005)), 0, CY);
  // the crest: a small chrome-ringed disc of dark enamel, the initial on it in the car's colour
  const EY = CY - 0.2;
  disc(k, CHROME, 0.36, FRONT - 0.03, FRONT + 0.04, 0, EY, 18);
  disc(k, ENAMEL, 0.29, FRONT, FRONT + 0.07, 0, EY, 18);
  glyph(k, INK, initialOf(car), 0.32, FRONT + 0.06, FRONT + 0.1, 0, EY);
  // the back: three short moulded lines (the maker's lettering, unreadable at this size)
  [[0.7, 0.18], [0.5, 0.0], [0.6, -0.18]].forEach(([w, dy]) => box(k, COVER, w, 0.07, 0.05, 0, CY - 0.15 + dy, -FRONT - 0.01));
  // the neck out of the cover and the shoulder (the stop)
  box(k, BRASS, 0.5, 0.36, 0.15, 0, CY - RY - 0.08, 0);
  box(k, BRASS, 0.78, 0.16, 0.17, 0, CY - RY - 0.3, 0);
  // the blade: a straight back, the bitting cut along its lower (right) edge, a rounded tip
  const T = CY - RY - 0.36; // (the blade's top)
  const pts = [[-0.24, T], [0.24, T], [0.24, T - 0.3], [0.31, T - 0.46], [0.2, T - 0.66], [0.33, T - 0.88], [0.18, T - 1.1], [0.3, T - 1.32],
    [0.17, T - 1.52], [0.31, T - 1.74], [0.2, T - 1.94], [0.2, T - 2.3], [0.06, T - 2.52], [-0.12, T - 2.52], [-0.24, T - 2.36]];
  flat(k, BRASS, pts, 0.13);
  // the keyway: a groove down each face, at different heights (front and back are not the same)
  box(k, GROOVE, 0.07, 1.95, 0.035, -0.1, T - 1.15, 0.065);
  box(k, GROOVE, 0.07, 1.8, 0.035, 0.02, T - 1.05, -0.065);
  box(k, GROOVE, 0.05, 1.6, 0.035, -0.15, T - 1.0, -0.065);
  return idle(group, merged(k));
};

// ---- (2) the WING-HEAD key (a 1930s-50s bakelite head): wide moulded wings either side of a raised boss ----
const wing = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  // bakelite: the car's colour deepened toward a moulded brown, glossy
  const BAKE = metal(paint.clone().lerp(new THREE.Color(0x2e1a10), 0.6).getHex(), 60);
  const BRASS = metal(0xc9a54e, 70), GROOVE = metal(0x8f7434, 40), CHROME = metal(0xd4d8de, 110);
  const ENAMEL = metal(paint.getHex(), 70), INK = lambert(inkOn(paint));
  // the head: a boss in the middle (the ring hole through it, the crest below), the wings swept out either side to
  // blunt points, their lower edges rising toward the tips (a gull's wing)
  const P = [[-0.36, -0.2, 0.08], [0.36, -0.2, 0.08], [1.5, 0.3, 0.14], [1.36, 0.76, 0.16], [0.44, 0.92, 0.1],
    [0.28, 1.2, 0.18], [-0.28, 1.2, 0.18], [-0.44, 0.92, 0.1], [-1.36, 0.76, 0.16], [-1.5, 0.3, 0.14]];
  const HOLE = [0, 0.93];
  const D = 0.28, B = 0.05, FRONT = D / 2 + B; // (the face at z = 0.19)
  const head = outline(P, 0.15);
  head.holes.push(circle(HOLE[0], HOLE[1], 0.13));
  slab(k, BAKE, head, D, B, 0, 2);
  // a chrome eyelet in the hole, front and back
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.16, 0.035, 4, 10), CHROME, HOLE[0], HOLE[1], z);
  // the rarity's lit rim round each face, inset from the edge
  for (const s of [1, -1]) rainbow(band(k, rimMaterial(rarity), P, 0.15, -0.14, -0.09, 0.04, s * (FRONT + 0.005), 2), 0, 0.45);
  // the deco speed lines along each wing's face: two thin chrome inlays (the back is plain)
  for (const sx of [1, -1]) for (const y of [0.3, 0.5]) box(k, CHROME, 0.55, 0.055, 0.05, sx * 0.87, y, FRONT + 0.01).rotation.z = sx * 0.12;
  // the crest: a small chrome shield, an enamel inset of the car's colour, the initial on it
  const SH = [[0, -0.12, 0.04], [0.28, 0.06, 0.06], [0.28, 0.5, 0.05], [-0.28, 0.5, 0.05], [-0.28, 0.06, 0.06]];
  slab(k, CHROME, outline(SH, 0.05), 0.08, 0, FRONT + 0.01, 2);
  slab(k, ENAMEL, outline(SH, 0.05, -0.06), 0.08, 0, FRONT + 0.03, 2);
  glyph(k, INK, initialOf(car), 0.28, FRONT + 0.06, FRONT + 0.1, 0, 0.24);
  // the back: a small chrome rivet where the crest's pin comes through
  disc(k, CHROME, 0.08, -FRONT - 0.04, -FRONT + 0.02, 0, 0.24, 8);
  // the brass collar out of the head, the shoulder, and the blade (bitted along its right edge, a groove each face)
  box(k, BRASS, 0.56, 0.3, 0.22, 0, -0.3, 0);
  box(k, BRASS, 0.74, 0.14, 0.18, 0, -0.5, 0);
  const T = -0.55;
  const pts = [[-0.22, T], [0.22, T], [0.22, T - 0.35], [0.32, T - 0.5], [0.22, T - 0.66], [0.3, T - 0.84], [0.19, T - 1.02], [0.32, T - 1.2],
    [0.2, T - 1.4], [0.29, T - 1.6], [0.2, T - 1.78], [0.2, T - 2.15], [0.0, T - 2.4], [-0.22, T - 2.2]];
  flat(k, BRASS, pts, 0.13);
  box(k, GROOVE, 0.07, 1.75, 0.035, -0.08, T - 1.05, 0.065);
  box(k, GROOVE, 0.07, 1.6, 0.035, 0.03, T - 0.95, -0.065);
  return idle(group, merged(k));
};

// ---- (3) the FLIP key (the 2000s switchblade key): a remote whose blade folds out of it on a pivot ----
const flipkey = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x1a1c21, 45), CHROME = metal(0xd4d8de, 110), RUBBER = lambert(0x34373e), WHITE = glow(0xe8ecf2);
  const BLADE = metal(0xc3c8cf, 80), CUT = metal(0x7d848d, 60), BADGE = metal(paint.getHex(), 70), INK = lambert(inkOn(paint));
  // the body: wider at the button end (up), narrowing toward the pivot (down); the ring hole in its top corner
  const P = [[-0.55, -1.3, 0.34], [0.55, -1.3, 0.34], [0.68, 0.95, 0.5], [-0.68, 0.95, 0.5]];
  const HOLE = [-0.25, 0.7];
  const D = 0.36, B = 0.07, FRONT = D / 2 + B; // (the face at z = 0.25)
  const shape = outline(P, 0.4);
  shape.holes.push(circle(HOLE[0], HOLE[1], 0.11));
  slab(k, BODY, shape, D, B, 0, 4);
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.14, 0.035, 4, 10), CHROME, HOLE[0], HOLE[1], z);
  rainbow(band(k, rimMaterial(rarity), P, 0.4, -0.15, -0.1, 0.04, FRONT + 0.005, 4), 0, -0.2);
  // the badge (the car's colour, the initial) in a chrome ring, and a chrome strip under it across the face
  const EY = 0.5, EX = 0.22;
  disc(k, CHROME, 0.27, FRONT - 0.03, FRONT + 0.03, EX, EY, 16);
  disc(k, BADGE, 0.22, FRONT - 0.02, FRONT + 0.05, EX, EY, 16);
  glyph(k, INK, initialOf(car), 0.26, FRONT + 0.04, FRONT + 0.08, EX, EY);
  box(k, CHROME, 0.86, 0.06, 0.04, 0, 0.13, FRONT);
  // three buttons down the face: lock, unlock, boot, each a rubber pad with a white mark
  [[-0.2, 'lock'], [-0.56, 'unlock'], [-0.9, 'boot']].forEach(([y, what]) => {
    const x = -0.12;
    box(k, RUBBER, 0.5, 0.28, 0.08, x, y, FRONT + 0.005);
    const z = FRONT + 0.045;
    if (what === 'boot') { box(k, WHITE, 0.24, 0.07, 0.02, x, y - 0.04, z); box(k, WHITE, 0.13, 0.06, 0.02, x - 0.03, y + 0.03, z); return; }
    const open = what === 'unlock';
    box(k, WHITE, 0.14, 0.1, 0.02, x, y - 0.04, z);
    add(k, new THREE.TorusGeometry(0.045, 0.014, 3, 8, Math.PI), WHITE, x + (open ? 0.04 : 0), y + 0.01 + (open ? 0.03 : 0), z).rotation.z = open ? 0.4 : 0;
  });
  // the back: the battery cover (a shallow raised panel) and its slot
  box(k, metal(0x24272d, 35), 0.92, 1.3, 0.05, 0, -0.1, -FRONT - 0.01);
  box(k, CUT, 0.3, 0.05, 0.04, 0, -0.65, -FRONT - 0.04);
  // the pivot, off to one side near the bottom: the chrome release button on the face (a plain cap behind)
  const PV = [0.2, -1.12];
  disc(k, CHROME, 0.15, FRONT - 0.03, FRONT + 0.06, PV[0], PV[1], 14);
  disc(k, RUBBER, 0.1, FRONT + 0.03, FRONT + 0.08, PV[0], PV[1], 10);
  disc(k, CHROME, 0.14, -FRONT - 0.04, -FRONT + 0.03, PV[0], PV[1], 12);
  merged(k);
  // the blade on its carrier, built about the pivot so it can fold (up into the body, which hides it: the real slot)
  const fold = new THREE.Group();
  fold.position.set(PV[0], PV[1], 0);
  box(fold, CHROME, 0.34, 0.5, 0.22, 0, -0.2, 0);
  const W = 0.36, Y0 = -0.36, Y1 = -1.98; // (the blade's root and tip, from the pivot)
  flat(fold, BLADE, [[-W / 2, Y0], [W / 2, Y0], [W / 2, Y1 + 0.2], [0.03, Y1], [-W / 2, Y1 + 0.12]], 0.13);
  // the laser-cut track down both faces: a zigzag of short bars, each sunk into the blade and standing proud of it
  const ys = [-0.72, -1.0, -1.28, -1.55, -1.76], xs = [-0.04, 0.06, -0.06, 0.05, -0.02];
  for (const sz of [1, -1]) for (let i = 0; i < ys.length - 1; i++) {
    const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
    box(fold, CUT, 0.07, Math.hypot(dx, dy) + 0.06, 0.035, (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2, sz * 0.065).rotation.z = Math.atan2(-dx, dy);
  }
  merged(fold);
  k.add(fold);
  idle(group, k);
  // a live view: the sway, and every 8 s the blade folds away into the body and flicks out again (open at rest: t = 0)
  const sway = group.userData.animate;
  group.userData.animate = (t) => {
    sway(t);
    const c = ((t % 8) + 8) % 8, ease = (u) => u * u * (3 - 2 * u);
    const shut = c < 4.6 ? 0 : c < 5.4 ? ease((c - 4.6) / 0.8) : c < 6.8 ? 1 : c < 7 ? 1 - ease((c - 6.8) / 0.2) : 0;
    fold.rotation.z = shut * Math.PI;
  };
  return group;
};

// ---- (4) the RUGGED fob (a utility 4x4's): a fat rubber boot, a hexagonal plastic face, one big button ----
const rugged = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const RUBBER = lambert(0x2b2e33), PLATE = metal(paint.getHex(), 40), BUTTON = lambert(0x1d1f23), WHITE = glow(0xe8ecf2);
  const STEEL = metal(0xb9bec6, 90), STRAP = lambert(0x3e4536), INK = lambert(inkOn(paint)), LED = glow(0xff5a3c);
  // the boot: a fat rounded block of rubber
  const P = [[-0.85, -1.15], [0.85, -1.15], [0.85, 1.0], [-0.85, 1.0]];
  const D = 0.6, B = 0.1, FRONT = D / 2 + B; // (the face at z = 0.4)
  slab(k, RUBBER, outline(P, 0.42), D, B, 0, 4);
  rainbow(band(k, rimMaterial(rarity), P, 0.42, -0.14, -0.08, 0.04, FRONT + 0.005, 4), 0, -0.07);
  // grip ribs across both sides
  for (const sx of [1, -1]) for (let i = 0; i < 6; i++) box(k, RUBBER, 0.14, 0.1, 0.56, sx * 0.9, -0.66 + i * 0.25, 0);
  // the hexagonal plastic face (the car's colour), sunk into the rubber and standing proud of it
  const HY = -0.06, hex = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3; hex.push([Math.cos(a) * 0.68, HY + Math.sin(a) * 0.68]); }
  // (anticlockwise from the top)
  slab(k, PLATE, outline(hex, 0.1), 0.1, 0, FRONT + 0.02, 2);
  // the initial in its top, a small red LED beside it
  glyph(k, INK, initialOf(car), 0.24, FRONT + 0.06, FRONT + 0.1, -0.06, HY + 0.38);
  box(k, LED, 0.07, 0.07, 0.04, 0.2, HY + 0.38, FRONT + 0.075);
  // the one big button: a fat rubber dome, a padlock mark on it
  const BY = HY - 0.16;
  disc(k, BUTTON, 0.36, FRONT, FRONT + 0.16, 0, BY, 16);
  box(k, WHITE, 0.2, 0.15, 0.03, 0, BY - 0.04, FRONT + 0.165);
  add(k, new THREE.TorusGeometry(0.065, 0.02, 3, 8, Math.PI), WHITE, 0, BY + 0.035, FRONT + 0.165);
  // the back: four screws and a raised grip panel
  for (const [x, y] of [[-0.5, -0.78], [0.5, -0.78], [-0.5, 0.62], [0.5, 0.62]]) disc(k, STEEL, 0.08, -FRONT - 0.03, -FRONT + 0.02, x, y, 8);
  for (let i = 0; i < 4; i++) box(k, RUBBER, 0.8, 0.12, 0.06, 0, -0.45 + i * 0.3, -FRONT - 0.02);
  // the lug on top, a steel ring through it (across the key) and a webbing loop hung on the ring
  const LY = 1.2;
  const lug = outline([[-0.34, 0.95], [0.34, 0.95], [0.3, LY + 0.24], [-0.3, LY + 0.24]], 0.14);
  lug.holes.push(circle(0, LY, 0.11));
  slab(k, RUBBER, lug, 0.38, 0, 0, 3);
  const R = 0.3, top = LY + 2 * R;
  add(k, new THREE.TorusGeometry(R, 0.055, 6, 16), STEEL, 0, LY + R, 0).rotation.y = Math.PI / 2;
  // (the webbing: a flat loop in the face's plane, its bottom bight through the ring's top)
  band(k, STRAP, [[-0.26, top - 0.04], [0.26, top - 0.04], [0.26, top + 1.0], [-0.26, top + 1.0]], 0.24, 0, 0.11, 0.07, 0, 4);
  // a stitched bar tack where the webbing's two ends are sewn together
  box(k, metal(0x8f9688, 30), 0.62, 0.12, 0.1, 0, top + 0.72, 0);
  return idle(group, merged(k));
};

registerKey('roundhead', roundhead);
registerKey('wing', wing);
registerKey('flipkey', flipkey);
registerKey('rugged', rugged);
