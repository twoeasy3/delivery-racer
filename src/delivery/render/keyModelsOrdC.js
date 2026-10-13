// Ordinary keys, batch C (KEY-IDEAS.md rows 9 to 12): each registers with registerKey(name, builder) from keyModels.js, built with KEY_KIT
// so the light, the rarity's rim, the initial, the tint by the car's colour and the idle sway match the Bespoke keys. Ordinary keys: real
// proportions, a restrained look, no maker's marks (the car's initial, or a plain shape). Built standing as the others are: the long axis y
// (the head up), the face toward +z. No home yet (KEY-IDEAS.md): no car uses one; ?keys=ordinary&only=<name> and ?keymodel=<name> show them.
//   crystal    a grand tourer's glass ignition key: a polished glass oval in a steel frame, the car's initial on a coloured disc
//              set in the middle of the glass, a steel loop on top, a push-in steel tab below (no blade)
//   carbonfob  a supercar's carbon-fibre fob: a woven black twill shell (a small data texture), one accent strip in the car's
//              colour down its face, a vivid red start button, lock and unlock, a chrome loop
//   wedgefob   a stealth-wedge fob: a faceted, angular gunmetal wedge (chamfered edges, flat-shaded facets), a crease in the car's
//              colour down its spine, a hexagonal ring hole with a hexagonal ring through it, two buttons
//   leaper     a sporting classic's key: a pouncing big cat (an original outline, no maker's emblem) in chrome as the bow,
//              springing from a moulded head in the car's colour with its initial, a toothed blade below
import { registerKey, KEY_KIT } from './keyModels.js';

const { THREE, lambert, metal, glow, add, box, disc, outline, circle, slab, band, rimMaterial, rainbow, glyph, paintOf, inkOn, idle, plainBlade, merged, initialOf } = KEY_KIT;

// an ellipse (rx, ry about cx, cy) as a shape, or as a hole of one
const ellipse = (rx, ry, cx = 0, cy = 0, path = new THREE.Shape()) => { path.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false); return path; };
// an elliptical band, d0 to d1 off the ellipse (rx, ry), `depth` thick about zc
const ovalBand = (parent, material, rx, ry, cy, d0, d1, depth, zc = 0, curve = 11) => {
  const shape = ellipse(rx + d1, ry + d1, 0, cy);
  shape.holes.push(ellipse(rx + d0, ry + d0, 0, cy, new THREE.Path()));
  return slab(parent, material, shape, depth, 0, zc, curve);
};

// ---- (9) the CRYSTAL key: a glass oval in a polished steel frame, no blade, a push-in tab ----
const crystal = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const STEEL = metal(0xb9c0c8, 120), LIP = metal(0x2a2e35, 60), PAINT = metal(paint.getHex(), 90), INK = metal(inkOn(paint), 90);
  const SLOT = metal(0x4a5059, 50), GLINT = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  // the glass: pale, see-through, very shiny; drawn after the rest (its own depth not written, so the disc inside shows)
  const GLASS = new THREE.MeshPhongMaterial({ color: 0x8fcbe4, specular: 0xffffff, shininess: 140, transparent: true, opacity: 0.42, depthWrite: false });
  const RX = 0.78, RY = 1.18, CY = 0.1; // (the glass oval's inner edge)
  // the steel frame: a band round the oval, 0.5 thick
  ovalBand(k, STEEL, RX, RY, CY, -0.03, 0.13, 0.5);
  // a dark lip where the glass meets the steel (so the oval's edge reads on a light ground as on a dark one)
  ovalBand(k, LIP, RX, RY, CY, -0.06, -0.02, 0.46);
  // the glass: an oval set in the frame, its faces cut in a broad bevel (a facet ring that catches the light; the faces at
  // z = +-0.24, under the steel's)
  slab(k, GLASS, ellipse(RX - 0.12, RY - 0.12, 0, CY), 0.28, 0.1, 0, 11);
  // two glints across the glass's face (thin, white, a little proud of it)
  for (const [x, y, len] of [[-0.42, 0.62, 0.42], [-0.27, 0.75, 0.24]]) box(k, GLINT, 0.045, len, 0.01, x, y, 0.245).rotation.z = 0.6;
  // inside the glass, at its middle: a disc of the car's colour with the initial on both faces
  const EY = CY + 0.05;
  disc(k, PAINT, 0.32, -0.035, 0.035, 0, EY, 18);
  glyph(k, INK, initialOf(car), 0.3, 0.03, 0.07, 0, EY);
  glyph(k, INK, initialOf(car), 0.3, 0.03, 0.07, 0, EY).rotation.y = Math.PI; // (the back's, reading the right way round)
  // the rarity's lit rim on the glass's face, just inside the lip (front and back)
  for (const s of [1, -1]) rainbow(ovalBand(k, rimMaterial(rarity), RX, RY, CY, -0.13, -0.08, 0.03, s * 0.225, 9), 0, CY);
  // the loop on top: a steel lug out of the frame, a ring through it (across the key)
  box(k, STEEL, 0.36, 0.3, 0.3, 0, CY + RY + 0.18, 0);
  const loop = add(k, new THREE.TorusGeometry(0.24, 0.055, 6, 14), STEEL, 0, CY + RY + 0.5, 0);
  loop.rotation.y = Math.PI / 2;
  // the push-in tab below (it goes into the dash's slot; there is no blade): a steel collar out of the frame, a short flat
  // tongue tapering to a rounded end, a slot sunk down each face and a notch each side where the dash's latch holds it
  box(k, STEEL, 0.6, 0.24, 0.34, 0, CY - RY - 0.14, 0);
  const TOP = CY - RY - 0.1;
  const TP = [[0, -2.45, 0.12], [0.2, -2.25, 0.08], [0.2, TOP], [-0.2, TOP], [-0.2, -2.25, 0.08]];
  slab(k, STEEL, outline(TP, 0.05), 0.14, 0, 0, 3);
  for (const s of [1, -1]) {
    box(k, SLOT, 0.08, 0.95, 0.02, 0, -1.72, s * 0.075);
    box(k, SLOT, 0.06, 0.14, 0.16, s * 0.19, -1.55, 0);
  }
  return idle(group, merged(k));
};

registerKey('crystal', crystal);

// ---- (10) the CARBON-FIBRE fob: a woven black shell, one accent strip, a vivid start button ----
// the weave: a 2/2 twill of 4 x 4 tows, each tow shaded across its width (a fibre bundle's sheen), as a small data texture
// (no canvas: the headless check builds the keys too); made once, shared. The extrusions' UVs are their x, y (and z on the
// sides), so `repeat` sets the weave's size in key units: a tow some 0.18 across
let twill = null;
const twillTexture = () => {
  if (twill) return twill;
  const N = 32, T = 8, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = Math.floor(x / T), j = Math.floor(y / T), across = (i + j) % 4 < 2; // (the tow runs across, or up)
    const u = ((across ? y : x) % T + 0.5) / T, along = ((across ? x : y) % T + 0.5) / T;
    const v = Math.round(22 + 34 * Math.sin(u * Math.PI) + 8 * Math.sin(along * Math.PI * 2) * (across ? 1 : -1));
    data.set([v, v, Math.round(v * 1.08), 255], (y * N + x) * 4);
  }
  twill = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  twill.wrapS = twill.wrapT = THREE.RepeatWrapping;
  twill.magFilter = THREE.LinearFilter;
  twill.minFilter = THREE.LinearMipmapLinearFilter;
  twill.generateMipmaps = true;
  twill.colorSpace = THREE.SRGBColorSpace;
  twill.repeat.set(1.4, 1.4);
  twill.needsUpdate = true;
  return twill;
};
const carbonfob = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const CARBON = new THREE.MeshPhongMaterial({ color: 0xffffff, map: twillTexture(), specular: 0x9aa4b0, shininess: 70 });
  const SEAM = metal(0x30343b, 80), ACCENT = metal(paint.getHex(), 100), CHROME = metal(0xd4d8de, 110), ALU = metal(0xc6ccd3, 60);
  const INK = metal(0x16181d, 60), RUBBER = metal(0x50555e, 50), WHITE = glow(0xe8ecf2), START = glow(0xff3b2e), WELL = metal(0x0d0f12, 120);
  // the shell: a slim pebble, wider at the top, tapering to the bottom
  const P = [[-0.58, -1.55], [0.58, -1.55], [0.86, -0.6], [0.86, 0.95], [0.5, 1.45], [-0.5, 1.45], [-0.86, 0.95], [-0.86, -0.6]];
  const D = 0.34, B = 0.08, FRONT = D / 2 + B; // (the face at z = 0.25)
  const HOLE = [0, 1.12];
  const shape = outline(P, 0.3);
  shape.holes.push(circle(HOLE[0], HOLE[1], 0.1));
  slab(k, CARBON, shape, D, B, 0, 3);
  // the seam between the shell's halves: a thin gunmetal band round its middle
  band(k, SEAM, P, 0.3, -0.06, 0.1, 0.1, 0, 2);
  // the rarity's lit rim on the face
  rainbow(band(k, rimMaterial(rarity), P, 0.3, -0.15, -0.1, 0.05, FRONT + 0.005, 2), 0, 0);
  // the hole's chrome sleeve, through the shell and a little proud of both faces
  add(k, new THREE.CylinderGeometry(0.125, 0.125, 2 * FRONT + 0.03, 10, 1, true), CHROME, HOLE[0], HOLE[1], 0).rotation.x = Math.PI / 2;
  // the accent: one strip of the car's colour down the face, from under the ring hole to the bottom (under the badge, the
  // button, and between the two below)
  box(k, ACCENT, 0.16, 2.32, 0.04, 0, -0.26, FRONT + 0.002);
  // the badge: a small round of brushed aluminium, the initial in black
  disc(k, ALU, 0.22, FRONT - 0.02, FRONT + 0.05, 0, 0.72, 14);
  glyph(k, INK, initialOf(car), 0.24, FRONT + 0.04, FRONT + 0.07, 0, 0.72);
  // the start button: a chrome ring, a dark glossy well, the power sign lit red
  const SY = 0.02;
  disc(k, CHROME, 0.38, FRONT - 0.02, FRONT + 0.06, 0, SY, 16);
  disc(k, WELL, 0.31, FRONT, FRONT + 0.08, 0, SY, 16);
  const arc = add(k, new THREE.TorusGeometry(0.15, 0.032, 3, 10, Math.PI * 1.55), START, 0, SY, FRONT + 0.085);
  arc.rotation.z = Math.PI / 2 + Math.PI * 0.225; // (its gap at the top)
  box(k, START, 0.06, 0.2, 0.03, 0, SY + 0.1, FRONT + 0.085);
  // lock and unlock, either side of the strip
  for (const [x, open] of [[-0.42, false], [0.42, true]]) {
    disc(k, RUBBER, 0.2, FRONT - 0.02, FRONT + 0.05, x, -0.85, 10);
    box(k, WHITE, 0.14, 0.04, 0.02, x, -0.85, FRONT + 0.055);
    if (open) box(k, WHITE, 0.04, 0.14, 0.025, x, -0.85, FRONT + 0.055);
  }
  // the ring through the hole, round the top edge (across the key)
  const R = 0.36;
  const ring = add(k, new THREE.TorusGeometry(R, 0.045, 5, 14), CHROME, HOLE[0], HOLE[1] + R, 0);
  ring.rotation.y = Math.PI / 2;
  // the back: the strip again, a small aluminium plate (the battery's cover)
  box(k, ACCENT, 0.16, 2.32, 0.04, 0, -0.26, -FRONT - 0.002);
  box(k, ALU, 0.62, 0.36, 0.05, 0, -0.85, -FRONT - 0.01);
  return idle(group, merged(k));
};

registerKey('carbonfob', carbonfob);
