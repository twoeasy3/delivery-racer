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

registerKey('roundhead', roundhead);
