// Ordinary keys, batch B (KEY-IDEAS.md rows 5 to 8): each registers with registerKey(name, builder) from keyModels.js, built with KEY_KIT.
// Real-world keys and fobs in a restrained look (no fantasy motifs, no maker's mark: the car's initial or a plain shape),
// tinted by the car (its Good livery colour), lit by the rarity's rim, swaying with the kit's idle. Built standing as the
// nine Bespoke keys are: the long axis y (the head up), the face toward +z. Parts sharing a material are merged (merged()).
//   wristband   the waterproof "activity key": a rubber wrist strap of the car's colour curled into an open cuff, a sealed
//               transponder puck set in it (a chrome bezel, a dark face with a padlock), the initial pressed into the strap,
//               a pin buckle and the adjustment holes on the back
//   carfob      the car-shaped fob: a glossy miniature of a saloon seen from above (the key IS the car), the roof and the
//               boot lid its hidden buttons, a tail-lamp strip, lamps, wheels and mirrors, the initial on a bonnet badge
//   cardkey     the credit-card key / key card: a flat rounded card with a narrower tongue (the end that goes in the dash
//               slot), a stripe of the car's colour with the initial, a chip, a strip of three buttons, a lanyard slot and the
//               emergency blade's head out of the top edge
//   displaykey  the display key: a large fob with a rounded-glass colour screen (the car seen from above in its colour, the
//               lock state, the range), a chrome edge, three buttons below it, a loop at the top
import { registerKey, KEY_KIT } from './keyModels.js';

const { THREE, lambert, metal, glow, add, box, disc, slab, band, outline, circle, rimMaterial, rainbow, glyph, paintOf, inkOn, idle, merged, initialOf } = KEY_KIT;

// a padlock: a body and a half-ring shackle (open: the shackle lifted and turned), `s` tall, its front at z
const padlock = (parent, material, x, y, z, s, open = false) => {
  box(parent, material, s * 0.62, s * 0.48, 0.03, x, y - s * 0.18, z);
  const shackle = add(parent, new THREE.TorusGeometry(s * 0.2, s * 0.07, 4, 8, Math.PI), material, x + (open ? s * 0.12 : 0), y + s * 0.04 + (open ? s * 0.1 : 0), z - 0.005);
  shackle.rotation.z = open ? 0.4 : 0;
  return shackle;
};
// a circle as the kit's outline points (a square with its corners rounded right round), for band()
const ring = (r, x = 0, y = 0) => [[-r + x, -r + y], [r + x, -r + y], [r + x, r + y], [-r + x, r + y]];

// ---- (5) the WRISTBAND: an open cuff of rubber strap, a transponder puck in its front, no blade ----
const wristband = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  // the rubber a little darker than the paint (a matte strap), the initial pressed in a shade darker again
  const STRAP = lambert(paint.clone().multiplyScalar(0.82).getHex()), PRESS = lambert(paint.clone().multiplyScalar(0.5).getHex());
  const CHROME = metal(0xd4d8de, 110), FACE = metal(0x14171c, 120), MARK = metal(0xdfe3e8, 100), HOLE = lambert(0x1a1c20);
  // the strap's middle line in its side view (u: toward the face, +z; v: up): a straight front, a half-round curl at each
  // end going back, a short straight behind; the strap T thick round it, W wide (along x)
  const L = 1.12, R = 0.46, B = 0.62, T = 0.15, W = 0.84;
  const mid = [];
  const curl = (cv, from, to) => { for (let i = 0; i <= 8; i++) { const a = from + (to - from) * i / 8; mid.push([-R + R * Math.cos(a), cv + R * Math.sin(a)]); } };
  mid.push([-2 * R, L - B]);
  curl(L, Math.PI, 0);
  for (let i = 1; i < 3; i++) mid.push([0, L - 2 * L * i / 3]);
  curl(-L, 0, -Math.PI);
  mid.push([-2 * R, -L + B]);
  // its two edges, off the middle line by T/2 along the line's normal
  const side = (s) => mid.map(([u, v], i) => {
    const [pu, pv] = mid[Math.max(0, i - 1)], [nu, nv] = mid[Math.min(mid.length - 1, i + 1)];
    const du = nu - pu, dv = nv - pv, l = Math.hypot(du, dv);
    return new THREE.Vector2(u + s * dv / l * T / 2, v - s * du / l * T / 2);
  });
  const strap = new THREE.Shape([...side(1), ...side(-1).reverse()]);
  const geo = new THREE.ExtrudeGeometry(strap, { depth: W - 0.06, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 1 });
  geo.translate(0, 0, -(W - 0.06) / 2);
  geo.rotateY(-Math.PI / 2); // (u to z, the width along x)
  const ZC = R; // (the cuff centred on z = 0: its front's outer face at z = R + T/2)
  add(k, geo, STRAP, 0, 0, ZC);
  const FRONT = ZC + T / 2 + 0.025, BACK = ZC - 2 * R - T / 2 - 0.025; // (the front strap's face, the back straights' outer face: the bevel stands 0.025 off the outline)
  // the puck: a chrome bezel through the strap, a dark sealed face, the rarity's rim round it, a padlock on it
  const PY = 0.2, PR = 0.5;
  disc(k, CHROME, PR, FRONT - 0.12, FRONT + 0.16, 0, PY, 20);
  disc(k, FACE, PR - 0.08, FRONT + 0.1, FRONT + 0.2, 0, PY, 20);
  rainbow(band(k, rimMaterial(rarity), ring(PR - 0.13, 0, PY), PR - 0.13, 0, 0.04, 0.03, FRONT + 0.2, 5), 0, PY);
  padlock(k, MARK, 0, PY + 0.02, FRONT + 0.21, 0.44);
  // (the puck's back, through the strap, flush with the inside of the cuff)
  disc(k, FACE, PR - 0.12, FRONT - T - 0.03, FRONT - 0.1, 0, PY, 14);
  // the initial pressed into the strap below the puck (standing just proud: the moulding)
  glyph(k, PRESS, initialOf(car), 0.4, FRONT - 0.02, FRONT + 0.03, 0, -0.7);
  // a keeper loop round the front strap, above the puck
  const keeper = band(k, PRESS, [[-W / 2, -T / 2], [W / 2, -T / 2], [W / 2, T / 2], [-W / 2, T / 2]], 0.05, 0.02, 0.065, 0.14, 0, 2);
  keeper.rotation.x = Math.PI / 2;
  keeper.position.set(0, 0.96, ZC);
  // the pin buckle on the upper back end: a chrome frame round the strap's end, its pin across
  const buckle = band(k, CHROME, [[-W / 2, -T / 2], [W / 2, -T / 2], [W / 2, T / 2], [-W / 2, T / 2]], 0.04, 0.03, 0.09, 0.12, 0, 2);
  buckle.rotation.x = Math.PI / 2;
  buckle.position.set(0, L - B + 0.05, ZC - 2 * R);
  box(k, CHROME, 0.05, 0.3, 0.05, 0, L - B - 0.08, BACK - 0.02);
  // the adjustment holes on the lower back strap, and its rounded tail
  for (const y of [-L + 0.12, -L + 0.3, -L + 0.48]) disc(k, HOLE, 0.065, BACK - 0.012, BACK + 0.04, 0, y, 8);
  return idle(group, merged(k));
};
registerKey('wristband', wristband);

// ---- (6) the CAR-SHAPED fob: the car itself in miniature, seen from above (its nose up), glossy in its colour ----
const carfob = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(paint.getHex(), 100), GLASS = metal(0x0d1015, 140), CHROME = metal(0xd4d8de, 110), GAP = lambert(0x1c1f25);
  const TYRE = lambert(0x1a1b1f), TAIL = glow(0xd8322a), HEAD = glow(0xf4f1e2), UNDER = metal(0x23262c, 30), INK = metal(inkOn(paint), 90);
  // the body's footprint: a rounded nose (top), the flanks straight, a squarer tail
  const P = [[-0.6, -1.6, 0.26], [0.6, -1.6, 0.26], [0.7, -1.12, 0.2], [0.7, 1.0, 0.3], [0.52, 1.6, 0.34], [-0.52, 1.6, 0.34], [-0.7, 1.0, 0.3], [-0.7, -1.12, 0.2]];
  const D = 0.34, B = 0.08, TOP = D / 2 + B; // (the deck at z = 0.25; the flanks stand 0.064 off the outline)
  slab(k, BODY, outline(P, 0.25), D, B, 0, 3);
  rainbow(band(k, rimMaterial(rarity), P, 0.25, -0.07, -0.025, 0.03, TOP + 0.005, 3), 0, 0);
  // the glasshouse: a domed slab of dark glass (the windscreen ahead of the roof, the rear window behind it, the side
  // glass on its bevel), and the roof on it in the car's colour: the lock button, as the real one's
  const G = [[-0.54, -0.98], [0.54, -0.98], [0.6, -0.25], [0.56, 0.52], [-0.56, 0.52], [-0.6, -0.25]];
  slab(k, GLASS, outline(G, 0.22), 0.16, 0.07, TOP + 0.06, 4); // (z 0.16 to 0.45)
  slab(k, BODY, outline([[-0.43, -0.58], [0.43, -0.58], [0.45, -0.2], [0.43, 0.22], [-0.43, 0.22], [-0.45, -0.2]], 0.14), 0.04, 0, TOP + 0.21, 4); // (z 0.44 to 0.48)
  // the boot lid's shut line (the boot button) and the bonnet's, sunk into the deck
  box(k, GAP, 1.0, 0.03, 0.04, 0, -1.22, TOP);
  box(k, GAP, 0.86, 0.03, 0.04, 0, 0.78, TOP);
  // the badge on the bonnet: a chrome ring, the initial in ink on a disc of the paint
  disc(k, CHROME, 0.2, TOP - 0.02, TOP + 0.03, 0, 1.12, 10);
  disc(k, BODY, 0.15, TOP - 0.02, TOP + 0.045, 0, 1.12, 10);
  glyph(k, INK, initialOf(car), 0.17, TOP + 0.035, TOP + 0.06, 0, 1.12);
  // the lamps: a red strip across the tail's deck and down its end, two pale headlamps at the nose's corners
  box(k, TAIL, 1.0, 0.07, 0.03, 0, -1.4, TOP);
  box(k, TAIL, 1.0, 0.04, 0.16, 0, -1.665, 0.08);
  for (const s of [1, -1]) {
    const lamp = box(k, HEAD, 0.26, 0.07, 0.03, s * 0.3, 1.36, TOP);
    lamp.rotation.z = s * 0.35;
  }
  // the wheels, just showing past the flanks, and the door mirrors
  for (const s of [1, -1]) for (const y of [0.92, -0.95]) box(k, TYRE, 0.12, 0.5, 0.3, s * 0.75, y, -0.07);
  for (const s of [1, -1]) box(k, BODY, 0.2, 0.09, 0.08, s * 0.76, 0.42, 0.16);
  // the underside: a dark panel, a battery hatch's slot
  box(k, UNDER, 1.0, 2.6, 0.04, 0, -0.05, -TOP);
  box(k, GAP, 0.36, 0.05, 0.03, 0, -1.0, -TOP - 0.02);
  return idle(group, merged(k));
};
registerKey('carfob', carfob);

// ---- (7) the CARD key: a flat rounded card (the 1990s hatch's, and today's NFC card), its tongue down (the end that
// goes into the dash slot) ----
const cardkey = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x1d2026, 70), STRIPE = metal(paint.getHex(), 70), INK = metal(inkOn(paint), 90), RUBBER = lambert(0x34383f);
  const BUTTON = metal(0x4a4f58, 50), WHITE = metal(0xe8ecf2, 80), GOLD = metal(0xd2ab4e, 100), CHROME = metal(0xd4d8de, 110), BACK = metal(0x2a2e35, 30);
  // the card: its shoulders step in to a narrower tongue at the bottom (a keyway-like notch each side)
  const P = [[-0.74, -1.72, 0.12], [0.74, -1.72, 0.12], [0.74, -1.28, 0.04], [1.06, -1.12, 0.06], [1.06, 1.7, 0.24], [-1.06, 1.7, 0.24], [-1.06, -1.12, 0.06], [-0.74, -1.28, 0.04]];
  const D = 0.22, B = 0.04, FRONT = D / 2 + B; // (the face at z = 0.15)
  const shape = outline(P, 0.1);
  shape.holes.push(outline([[-0.86, 1.36], [-0.44, 1.36], [-0.44, 1.52], [-0.86, 1.52]], 0.08, 0, new THREE.Path())); // (the lanyard slot)
  slab(k, BODY, shape, D, B, 0, 3);
  // the rarity's rim round the face's broad part
  const F = [[-0.96, -1.02], [0.96, -1.02], [0.96, 1.6], [-0.96, 1.6]];
  rainbow(band(k, rimMaterial(rarity), F, 0.18, -0.045, 0, 0.03, FRONT + 0.003, 3), 0, 0.3);
  // the stripe of the car's colour, the initial on it
  slab(k, STRIPE, outline([[-0.86, 0.6], [0.86, 0.6], [0.86, 1.18], [-0.86, 1.18]], 0.08), 0.04, 0, FRONT + 0.005, 2);
  glyph(k, INK, initialOf(car), 0.36, FRONT + 0.015, FRONT + 0.04, -0.52, 0.89);
  // the chip: a gold pad with its contacts' lines
  box(k, GOLD, 0.42, 0.34, 0.03, -0.48, 0.12, FRONT);
  for (const [w, h, x, y] of [[0.42, 0.025, -0.48, 0.12], [0.025, 0.34, -0.48, 0.12], [0.12, 0.025, -0.38, 0.03]]) box(k, BODY, w, h, 0.03, x, y, FRONT + 0.008);
  // the button strip: a rubber pad, three buttons (lock, unlock, the boot), a white mark on each
  slab(k, RUBBER, outline([[-0.88, -0.86], [0.88, -0.86], [0.88, -0.32], [-0.88, -0.32]], 0.12), 0.05, 0, FRONT + 0.01, 2);
  [-0.56, 0, 0.56].forEach((x, i) => {
    const y = -0.59;
    box(k, BUTTON, 0.46, 0.4, 0.06, x, y, FRONT + 0.04);
    if (i < 2) padlock(k, WHITE, x, y + 0.02, FRONT + 0.075, 0.26, i === 1);
    else { // (the boot: an open lid over a sill, an arrow up)
      box(k, WHITE, 0.26, 0.045, 0.03, x, y - 0.1, FRONT + 0.075);
      box(k, WHITE, 0.045, 0.16, 0.03, x, y - 0.01, FRONT + 0.075);
      for (const s of [1, -1]) box(k, WHITE, 0.045, 0.12, 0.03, x + s * 0.035, y + 0.06, FRONT + 0.077).rotation.z = s * 0.75;
    }
  });
  // the emergency blade's chrome head out of the top edge, its grip ridged
  box(k, CHROME, 0.4, 0.24, 0.16, 0.56, 1.76, 0);
  box(k, BODY, 0.3, 0.03, 0.17, 0.56, 1.8, 0);
  // the back: a raised panel, a small slot for the blade's release
  slab(k, BACK, outline([[-0.9, -0.95], [0.9, -0.95], [0.9, 1.25], [-0.9, 1.25]], 0.14), 0.04, 0, -FRONT - 0.005, 2);
  box(k, CHROME, 0.3, 0.06, 0.03, 0.56, 1.4, -FRONT - 0.02);
  return idle(group, merged(k));
};
registerKey('cardkey', cardkey);
