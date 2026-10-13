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
