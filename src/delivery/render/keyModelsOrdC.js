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
