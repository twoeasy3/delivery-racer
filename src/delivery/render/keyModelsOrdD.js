// Ordinary keys, batch D (KEY-IDEAS.md rows 13 to 16): each registers with registerKey(name, builder) from keyModels.js, built
// with KEY_KIT, so the lighting, the rarity's rim, the initial, the car's tint and the idle sway match the Bespoke keys.
// Ordinary keys: real proportions, a restrained look, no maker's marks (the car's initial, or a plain number). No home yet:
// no car uses one; ?keys=ordinary&only=<name> and ?keymodel=<name> show them (render/keycard.js).
//   startfob  (13) a retro round start-button fob: a dark disc in a chrome bezel, a ring of the car's colour round one big
//             red START button (a power mark on it), the initial below, a lug on top with a split ring through it
//   artisan   (14) a wooden fob: a walnut face of tinted strips with darker grain lines, a stitched leather band round its
//             edge, a brass plaque with the initial, three brass buttons, a brass lug and ring; leather on the back
//   lottag    (15) the car lot's key: a plain nickel key (a rubber head cap of the car's colour, the initial on it, a
//             toothed blade) on a split ring, and a manila tag on a string hung from the same ring, a stock number
//             stamped on it and a sticker of the car's colour with its initial
//   keikey    (16) the kei car's key: a slim wafer key, a bright cap of the car's colour (a grip ridge, the initial), a
//             small chrome collar, a short thin blade with a wavy foil track, a tiny split ring
// Built standing as the others are: the long axis y (the head up, the blade down), the face toward +z.
import { registerKey, KEY_KIT } from './keyModels.js';

const { THREE, metal, lambert, glow, add, box, disc, outline, circle, slab, band, rimMaterial, rainbow, glyph, paintOf, inkOn,
  idle, plainBlade, merged, initialOf, grow } = KEY_KIT;

// a split ring: a torus `R` round centred so it passes through (x, y) (a hole), its plane turned `turn` off the key's face
// (PI/2: straight across the key, as the Bespoke keys hang theirs), `up` the direction from the hole to its centre
const splitRing = (parent, material, x, y, R, tube, turn = Math.PI / 2, up = 0, seg = 18) => {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.rotation.z = up;
  const ring = add(g, new THREE.TorusGeometry(R, tube, 5, seg), material, 0, R, 0);
  ring.rotation.y = turn;
  parent.add(g);
  return g;
};

// ---- (13) the START FOB: a retro round fob with one big red start button ----
const startfob = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x17191e, 50), CHROME = metal(0xd4d8de, 110), RING = metal(paint.getHex(), 80), RED = metal(0xd3221d, 90);
  const DARKRED = metal(0x7d1410, 60), WHITE = glow(0xf3f5f8), INK = metal(0xc9ced6, 90);
  const R = 1.05, D = 0.46, FRONT = D / 2; // (the faces at z = +-0.23; no bevel: the chrome bezel is the edge)
  // the disc, and a lug up out of its top with a hole for the ring (one outline: a circle with a tab)
  const body = new THREE.Shape();
  const a0 = Math.asin(0.26 / R); // (where the lug's sides meet the circle)
  body.absarc(0, 0, R, Math.PI / 2 + a0, Math.PI / 2 - a0 + Math.PI * 2, false);
  body.lineTo(0.26, R + 0.22);
  body.quadraticCurveTo(0.26, R + 0.48, 0, R + 0.48);
  body.quadraticCurveTo(-0.26, R + 0.48, -0.26, R + 0.22);
  body.closePath();
  const HOLE = [0, R + 0.24];
  body.holes.push(circle(HOLE[0], HOLE[1], 0.11));
  slab(k, BODY, body, D, 0, 0, 7);
  // the chrome bezel round the disc's middle (its inner edge in the body)
  const ringShape = (r0, r1) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, Math.PI * 2, false); s.holes.push(circle(0, 0, r0)); return s; };
  slab(k, CHROME, ringShape(R - 0.05, R + 0.06), 0.5, 0, 0, 14); // (a little thicker than the body: it covers its edge)
  // the rarity's lit rim on the face, just inside the edge
  rainbow(slab(k, rimMaterial(rarity), ringShape(R - 0.12, R - 0.06), 0.05, 0, FRONT + 0.005, 14));
  // the face: a ring of the car's colour round the button, chrome inside it, the button standing proud
  disc(k, RING, 0.66, FRONT - 0.03, FRONT + 0.03, 0, 0.08, 16);
  disc(k, CHROME, 0.54, FRONT - 0.03, FRONT + 0.06, 0, 0.08, 16);
  disc(k, DARKRED, 0.48, FRONT, FRONT + 0.1, 0, 0.08, 16);
  const dome = new THREE.SphereGeometry(0.46, 16, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.rotateX(Math.PI / 2);
  add(k, dome, RED, 0, 0.08, FRONT + 0.09).scale.set(1, 1, 0.32);
  // the power mark on the button: an open circle and a bar (standing on the dome's flattened crown)
  const z = FRONT + 0.09 + 0.46 * 0.32;
  const arc = add(k, new THREE.TorusGeometry(0.17, 0.035, 4, 12, Math.PI * 1.55), WHITE, 0, 0.06, z - 0.01);
  arc.rotation.z = Math.PI / 2 + Math.PI * 0.225;
  box(k, WHITE, 0.07, 0.22, 0.05, 0, 0.19, z - 0.005);
  // the initial below the button, and two small dots either side (lock, unlock: printed, not buttons)
  glyph(k, INK, initialOf(car), 0.27, FRONT - 0.01, FRONT + 0.03, 0, -0.755);
  for (const x of [-0.72, 0.72]) disc(k, INK, 0.05, FRONT - 0.01, FRONT + 0.025, x, -0.42, 8);
  // the lug's chrome grommets, front and back, and the split ring through it
  for (const s of [1, -1]) add(k, new THREE.TorusGeometry(0.14, 0.03, 4, 10), CHROME, HOLE[0], HOLE[1], s * FRONT);
  splitRing(k, CHROME, HOLE[0], HOLE[1] - 0.11 + 0.045, 0.5, 0.045, Math.PI / 2, 0, 14);
  // the back: a plain raised disc (the battery cover) with a coin slot
  disc(k, metal(0x24272e, 30), 0.62, -FRONT - 0.03, -FRONT + 0.02, 0, 0, 16);
  box(k, CHROME, 0.34, 0.06, 0.04, 0, -0.45, -FRONT - 0.03);
  return idle(group, merged(k));
};

registerKey('startfob', startfob);

// ---- (14) the ARTISAN fob: a walnut face, a stitched leather edge, brass ----
const artisan = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const WOOD = lambert(0x6e4325), WOOD2 = lambert(0x80512d), WOOD3 = lambert(0x5b361d), GRAIN = lambert(0x3f2412);
  const LEATHER = lambert(0x4a2a18), STITCH = lambert(paint.clone().lerp(new THREE.Color(0xe6d3a8), 0.35).getHex()), BRASS = metal(0xc9a24a, 80), DARK = metal(0x2a1a10, 40);
  const W = 0.75, H = 1.25, CR = 0.34;
  const P = [[-W, -H], [W, -H], [W, H], [-W, H]];
  const D = 0.44, FRONT = D / 2; // (the wood's face at z = 0.22)
  // the core (its face the wood's middle tone), and the leather band round its edge, standing proud of both faces
  slab(k, WOOD, outline(P, CR), D, 0, 0, 5);
  const LIP = 0.05; // (how far the leather stands out of the faces)
  band(k, LEATHER, P, CR, -0.09, 0.07, D + 2 * LIP, 0, 5);
  // the wood: planks of three tints across the face (each to the rounded window's edge), a few darker grain lines
  const IN = W - 0.09, ir = CR - 0.09, n = 8, pw = 2 * IN / n;
  const yMax = (x) => { const dx = Math.abs(x) - (IN - ir); return dx <= 0 ? H - 0.09 : H - 0.09 - ir + Math.sqrt(Math.max(0, ir * ir - dx * dx)); };
  const tints = [WOOD2, null, WOOD3, WOOD2, null, WOOD3, null, WOOD2];
  for (let i = 0; i < n; i++) {
    const x0 = -IN + i * pw, x1 = x0 + pw, cx = (x0 + x1) / 2, h = Math.min(yMax(x0), yMax(x1)) - 0.005;
    if (tints[i]) box(k, tints[i], pw, 2 * h, 0.03, cx, 0, FRONT + 0.0);
    // the grain: a thin darker line along every other plank, a little askew
    if (i % 2) box(k, GRAIN, 0.014, 2 * h - 0.08, 0.03, x0 + pw * 0.4, 0, FRONT + 0.008).rotation.z = i % 4 === 1 ? 0.012 : -0.01;
  }
  // the rarity's lit rim on the wood, just inside the leather
  rainbow(band(k, rimMaterial(rarity), P, CR, -0.15, -0.1, 0.03, FRONT + 0.02, 4));
  // the stitching (thread of the car's colour, faded) all round the leather band's face: dashes along its middle
  const seam = outline(P, CR, -0.01).getSpacedPoints(26);
  for (let i = 0; i < 26; i++) {
    const [a, b] = [seam[i], seam[i + 1]];
    box(k, STITCH, 0.085, 0.026, 0.03, (a.x + b.x) / 2, (a.y + b.y) / 2, FRONT + LIP).rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
  }
  // the brass plaque with the initial (dark, inlaid), and three brass buttons on a dark strip
  const PL = [[-0.42, -0.3], [0.42, -0.3], [0.42, 0.3], [-0.42, 0.3]].map(([x, y]) => [x, y + 0.42]);
  slab(k, BRASS, outline(PL, 0.12), 0.06, 0, FRONT + 0.02, 2);
  glyph(k, DARK, initialOf(car), 0.36, FRONT + 0.04, FRONT + 0.07, 0, 0.42);
  box(k, DARK, 1.0, 0.36, 0.06, 0, -0.62, FRONT + 0.005);
  for (const x of [-0.32, 0, 0.32]) {
    disc(k, BRASS, 0.12, FRONT, FRONT + 0.08, x, -0.62, 10);
    disc(k, DARK, 0.05, FRONT + 0.07, FRONT + 0.095, x, -0.62, 6);
  }
  // the brass lug out of the top, a brass ring through it
  const lug = outline([[-0.24, H - 0.2], [0.24, H - 0.2], [0.24, H + 0.36, 0.22], [-0.24, H + 0.36, 0.22]], 0.05);
  const HOLE = [0, H + 0.16];
  lug.holes.push(circle(HOLE[0], HOLE[1], 0.1));
  slab(k, BRASS, lug, 0.26, 0, 0, 4);
  splitRing(k, BRASS, HOLE[0], HOLE[1] - 0.1 + 0.045, 0.48, 0.045, Math.PI / 2, 0, 14);
  // the back: the leather wraps it (one panel, inside the band's lip)
  slab(k, LEATHER, outline(grow(P, -0.07), CR - 0.07), 0.04, 0, -FRONT - 0.01, 4);
  return idle(group, merged(k));
};

registerKey('artisan', artisan);

// ---- (15) the LOT TAG key: a plain key and a manila tag on one split ring (the second-hand car lot's) ----
// a number stamped in 3x5 block digits (a row's run of blocks one box), `h` tall, from z0 to z1, centred on (x, y)
const DIGITS = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'] };
const stamp = (parent, material, text, h, z0, z1, x = 0, y = 0) => {
  const px = h / 5, gap = px, w = text.length * 3 * px + (text.length - 1) * gap;
  [...text].forEach((d, n) => DIGITS[d].forEach((row, j) => {
    for (const m of row.matchAll(/#+/g)) {
      const bw = m[0].length * px;
      box(parent, material, bw, px, z1 - z0, x - w / 2 + n * (3 * px + gap) + m.index * px + bw / 2, y + h / 2 - j * px - px / 2, (z0 + z1) / 2);
    }
  }));
};
// the lot's stock number for a car: two digits from its id (the same car, the same number)
const stockOf = (car) => String(10 + [...String(car?.id || car?.name || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) % 90);

const lottag = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const CAP = metal(paint.getHex(), 25), INK = metal(inkOn(paint), 60), NICKEL = metal(0xc7cbd1, 90), GROOVE = metal(0x8a9098, 50);
  const RING = metal(0xd9dde2, 110), MANILA = lambert(0xe2c98a), CARD = lambert(0xcdb173), STAMP = lambert(0x2b2f3a);
  const STRING = lambert(0xf1ece0), STICKER = metal(paint.getHex(), 40);
  // the split ring: across the key but turned a third of the way to face us, so its loop shows from the front
  const C = [0, 1.55], R = 0.55, TURN = -1.05;
  add(k, new THREE.TorusGeometry(R, 0.045, 5, 16), RING, C[0], C[1], 0).rotation.y = TURN;
  const onRing = (phi) => [C[0] + R * Math.cos(phi) * Math.cos(TURN), C[1] + R * Math.sin(phi), -R * Math.cos(phi) * Math.sin(TURN)];
  // the KEY, hung by its hole from the ring's bottom (the wire through the hole's middle), swung a little right
  const key = new THREE.Group();
  key.position.set(C[0], C[1] - R, 0);
  key.rotation.z = 0.36;
  const HEAD = [[-0.52, -0.82, 0.12], [0.52, -0.82, 0.12], [0.6, -0.1], [0.3, 0.32, 0.22], [-0.3, 0.32, 0.22], [-0.6, -0.1]];
  const head = outline(HEAD, 0.2);
  head.holes.push(circle(0, 0, 0.17));
  const HD = 0.3, HF = HD / 2; // (the cap's faces at z = +-0.15)
  slab(key, CAP, head, HD, 0, 0, 4);
  rainbow(band(key, rimMaterial(rarity), HEAD, 0.2, -0.1, -0.05, 0.03, HF + 0.01, 4), 0, -0.25);
  glyph(key, INK, initialOf(car), 0.34, HF - 0.01, HF + 0.03, 0, -0.42);
  // the metal under the cap: its shoulder, and the blade with its teeth along the right edge and a groove each side
  box(key, NICKEL, 0.72, 0.14, 0.2, 0, -0.86, 0);
  const pts = [[-0.2, -0.8], [-0.2, -2.6], [-0.04, -2.8], [0.2, -2.66], [0.2, -2.52], [0.33, -2.38], [0.2, -2.24], [0.31, -2.08], [0.2, -1.92],
    [0.34, -1.76], [0.2, -1.6], [0.3, -1.44], [0.2, -1.28], [0.2, -0.8]];
  slab(key, NICKEL, new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), 0.11, 0, 0, 1);
  for (const s of [1, -1]) box(key, GROOVE, 0.07, 1.5, 0.03, -0.07, -1.82, s * 0.06);
  k.add(key);
  // the TAG on its string from the ring's lower left (behind the key's plane), swung out to the left
  const S = onRing(Math.PI * 1.11), SWING = 0.62, LEN = 0.8;
  const E = [S[0] - Math.sin(SWING) * LEN, S[1] - Math.cos(SWING) * LEN, S[2]];
  const string = new THREE.CylinderGeometry(0.018, 0.018, LEN + 0.04, 4);
  add(k, string, STRING, (S[0] + E[0]) / 2, (S[1] + E[1]) / 2, S[2]).rotation.z = -SWING;
  const tag = new THREE.Group();
  tag.position.set(...E);
  tag.rotation.z = -SWING; // (its top toward the ring)
  // a shipping tag: its top corners clipped, an eyelet near the top (the string's loop through it, up to the ring)
  const TAG = [[-0.46, -1.62], [0.46, -1.62], [0.46, -0.32], [0.2, -0.04], [-0.2, -0.04], [-0.46, -0.32]];
  const EY = -0.2, TD = 0.03;
  const tagShape = new THREE.Shape(TAG.map(([x, y]) => new THREE.Vector2(x, y)));
  tagShape.holes.push(circle(0, EY, 0.06));
  slab(tag, MANILA, tagShape, TD, 0, 0, 3);
  for (const s of [1, -1]) {
    const washer = new THREE.Shape(); washer.absarc(0, EY, 0.13, 0, Math.PI * 2, false); washer.holes.push(circle(0, EY, 0.06));
    slab(tag, CARD, washer, 0.012, 0, s * (TD / 2 + 0.004), 4);
  }
  add(tag, new THREE.TorusGeometry(0.09, 0.018, 4, 8), STRING, 0, EY + 0.06 + 0.02, 0).rotation.y = Math.PI / 2;
  add(tag, new THREE.CylinderGeometry(0.018, 0.018, -EY, 4), STRING, 0, EY / 2 + 0.06, 0); // (up from the loop to the string)
  // the stock number stamped on it, a ruled line, and a sticker of the car's colour with its initial; both faces numbered
  for (const s of [1, -1]) {
    const g = new THREE.Group(); // (built on the front face; turned round for the back, so it reads from there)
    stamp(g, STAMP, stockOf(car), 0.36, TD / 2 - 0.005, TD / 2 + 0.008, 0, -0.62);
    g.rotation.y = s < 0 ? Math.PI : 0;
    tag.add(g);
    box(tag, STAMP, 0.7, 0.025, 0.013, 0, -0.92, s * (TD / 2 + 0.0015));
  }
  disc(tag, STICKER, 0.2, TD / 2 - 0.005, TD / 2 + 0.012, 0, -1.28, 14);
  glyph(tag, INK, initialOf(car), 0.2, TD / 2 + 0.005, TD / 2 + 0.022, 0, -1.28);
  k.add(tag);
  return idle(group, merged(k));
};

registerKey('lottag', lottag);

// ---- (16) the KEI key: a tiny slim wafer key with a bright cap ----
const keikey = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  // the cap: the car's colour, made bright (saturated, mid-light) however dull the paint
  const hsl = {}; paintOf(car).getHSL(hsl);
  const bright = new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.8), Math.min(0.62, Math.max(0.48, hsl.l)));
  const CAP = metal(bright.getHex(), 60), RIDGE = metal(bright.clone().multiplyScalar(0.6).getHex(), 60), INK = glow(inkOn(bright));
  const CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80), CUT = metal(0x7d848d, 60);
  // a small rounded cap, wider at the top, slim (its faces at z = +-0.11)
  const P = [[-0.42, -0.55, 0.14], [0.42, -0.55, 0.14], [0.56, 0.4], [0.36, 0.78, 0.3], [-0.36, 0.78, 0.3], [-0.56, 0.4]];
  const D = 0.16, B = 0.03, FRONT = D / 2 + B;
  const HOLE = [0, 0.5];
  const cap = outline(P, 0.32);
  cap.holes.push(circle(HOLE[0], HOLE[1], 0.1));
  slab(k, CAP, cap, D, B, 0, 4);
  rainbow(band(k, rimMaterial(rarity), P, 0.32, -0.1, -0.05, 0.03, FRONT + 0.005, 4), 0, 0.1);
  // the initial, and three grip ridges across the cap's waist (both faces)
  glyph(k, INK, initialOf(car), 0.3, FRONT - 0.01, FRONT + 0.02, 0, 0.06);
  for (const s of [1, -1]) for (const y of [-0.24, -0.33, -0.42]) box(k, RIDGE, 0.6, 0.04, 0.04, 0, y, s * (FRONT - 0.005));
  // a tiny split ring through the hole
  splitRing(k, CHROME, HOLE[0], HOLE[1] - 0.1 + 0.035, 0.3, 0.035, Math.PI / 2, 0, 12);
  // the chrome collar, and the short thin blade: a wavy foil track cut down each face, a pointed tip
  box(k, CHROME, 0.44, 0.16, 0.14, 0, -0.6, 0);
  const W = 0.3, T = 0.07, Y0 = -0.62, Y1 = -2.25;
  const blade = [[-W / 2, Y0], [W / 2, Y0], [W / 2, Y1 + 0.2], [0, Y1], [-W / 2, Y1 + 0.12]];
  slab(k, BLADE, new THREE.Shape(blade.map(([x, y]) => new THREE.Vector2(x, y))), T, 0, 0, 1);
  const ys = [-0.8, -1.05, -1.3, -1.55, -1.8, -2.02], xs = [0.0, 0.06, -0.06, 0.06, -0.05, 0.02];
  for (const s of [1, -1]) for (let i = 0; i < ys.length - 1; i++) {
    const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i], len = Math.hypot(dx, dy) + 0.05;
    box(k, CUT, 0.06, len, 0.03, (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2, s * (T / 2)).rotation.z = Math.atan2(-dx, dy);
  }
  return idle(group, merged(k));
};

registerKey('keikey', keikey);
void lambert; void outline; void band; void inkOn; void plainBlade; void grow;
