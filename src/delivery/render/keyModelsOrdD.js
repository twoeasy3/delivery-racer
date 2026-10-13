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
void lambert; void outline; void band; void inkOn; void plainBlade; void grow;
