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

const { THREE, lambert, metal, glow, add, box, disc, outline, circle, slab, band, rimMaterial, rainbow, glyph, paintOf, inkOn, idle, merged, initialOf } = KEY_KIT;

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

// ---- (11) the STEALTH-WEDGE fob: a faceted, angular wedge (a folded-paper fighter's look), a hexagonal ring hole ----
const poly = (points, path = new THREE.Shape()) => { points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath(); return path; };
const hexagon = (cx, cy, r, turn = 0) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos(turn + i * Math.PI / 3), cy + r * Math.sin(turn + i * Math.PI / 3)]);
// a flat-shaded material (each facet its own tone)
const faceted = (color, shininess = 60) => new THREE.MeshPhongMaterial({ color, specular: 0xffffff, shininess, flatShading: true });
// a ridge on the face: a long low diamond whose two long sides rise to a crease (h high) from y0 to y1, w wide at its
// waist (yw); its base at z = 0 (placed by `z`)
const ridge = (parent, material, y0, y1, yw, w, h, inset, z) => {
  const B = [[0, y0, 0], [w / 2, yw, 0], [0, y1, 0], [-w / 2, yw, 0]], R0 = [0, y0 + inset, h], R1 = [0, y1 - inset, h];
  const tris = [[B[0], B[1], R0], [B[1], R1, R0], [B[1], B[2], R1], [B[0], R0, B[3]], [B[3], R0, R1], [B[3], R1, B[2]]];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(2), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(tris.length * 6).fill(0), 2));
  geo.computeVertexNormals();
  return add(parent, geo, material, 0, 0, z);
};
const wedgefob = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = faceted(0x3b4049, 90), CREASE = faceted(paint.getHex(), 100), BUTTON = faceted(0x5d636d, 50), CHROME = faceted(0xd4d8de, 110);
  const RING = metal(0xc9ced5, 110), INK = metal(0x16181d, 60), WHITE = glow(0xe8ecf2);
  // the wedge: an arrowhead, its nose down; the face (a flat table) the outline itself, its edges cut back in one broad
  // chamfer each side (the outline grown 0.2 at the middle), so every side is a facet of its own
  const P = [[0, -1.75], [0.55, -0.9], [0.8, 0.55], [0.62, 1.25], [0.2, 1.55], [-0.2, 1.55], [-0.62, 1.25], [-0.8, 0.55], [-0.55, -0.9]];
  const HOLE = [0, 0.98];
  const shape = poly(P);
  shape.holes.push(poly(hexagon(HOLE[0], HOLE[1], 0.4, Math.PI / 6).reverse(), new THREE.Path())); // (a hexagon, a point up: countersunk by the chamfer)
  const D = 0.1, BT = 0.16, FRONT = D / 2 + BT; // (the face at z = 0.21)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: 0.2, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -D / 2);
  add(k, geo, BODY);
  // the rarity's lit rim, inset on the face
  rainbow(band(k, rimMaterial(rarity), P, 0.02, -0.13, -0.08, 0.04, FRONT + 0.005, 1), 0, 0);
  // the hole's chrome hexagon round its edge, half sunk in each face
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.43, 0.04, 4, 6), CHROME, HOLE[0], HOLE[1], z).rotation.z = Math.PI / 6;
  // the crease: a ridge of the car's colour down the face to the nose, front and back
  for (const s of [1, -1]) ridge(k, CREASE, -1.5, -0.12, -0.8, 0.3, 0.09, 0.18, s * (FRONT - 0.005)).rotation.y = s > 0 ? 0 : Math.PI;
  // the badge: a chrome hexagon below the hole, the initial on it
  const BY = 0.2;
  const badge = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 6);
  badge.rotateX(Math.PI / 2);
  add(k, badge, CHROME, 0, BY, FRONT + 0.01);
  glyph(k, INK, initialOf(car), 0.22, FRONT + 0.035, FRONT + 0.06, 0, BY);
  // two triangular buttons either side of the crease: lock (pointing up), unlock (down), a white tick on each
  for (const [x, turn] of [[-0.36, Math.PI / 2], [0.36, -Math.PI / 2]]) {
    const b = new THREE.CylinderGeometry(0.17, 0.17, 0.08, 3);
    b.rotateX(Math.PI / 2);
    b.rotateZ(turn);
    add(k, b, BUTTON, x, -0.4, FRONT + 0.01);
    box(k, WHITE, 0.1, 0.03, 0.02, x, -0.4, FRONT + 0.055);
  }
  // the back: a chrome hexagon (the battery's cover)
  add(k, badge.clone(), CHROME, 0, BY, -FRONT - 0.01);
  // the ring: a hexagon of steel through the hole and round the top edge (across the key)
  const R = 0.56, ring = add(k, new THREE.TorusGeometry(R, 0.05, 4, 6), RING, HOLE[0], HOLE[1] + R * Math.cos(Math.PI / 6), 0);
  ring.rotation.set(0, Math.PI / 2, 0);
  return idle(group, merged(k));
};

registerKey('wedgefob', wedgefob);

// ---- (12) the LEAPER: a sporting classic's key whose bow is a big cat pouncing up off the key's moulded head ----
// The cat is an original, plain outline (drawn here facing +x, level, then turned up 50 degrees): a big cat's head with
// one ear, its forelegs reaching ahead, its hind legs pushing off, a long tail; not any maker's emblem. A ring hole is
// drilled through its body and a split ring hangs there round its back
const CAT = [[1.6, 0.28], [1.55, 0.15], [1.38, 0.06], [1.15, 0.02], [1.72, -0.14], [1.82, -0.2], [1.75, -0.3], [1.05, -0.3], [0.85, -0.32],
  [0.2, -0.3], [-0.45, -0.28], [-0.6, -0.35], [-1.2, -0.55], [-1.6, -0.6], [-1.68, -0.5], [-1.25, -0.38], [-1.05, -0.1],
  [-1.35, 0.1], [-1.6, 0.35], [-1.62, 0.52], [-1.5, 0.5], [-1.3, 0.28], [-1.0, 0.2], [-0.5, 0.32], [0.3, 0.28], [0.85, 0.38],
  [1.02, 0.45], [1.08, 0.55], [1.1, 0.72], [1.2, 0.62], [1.28, 0.74], [1.36, 0.6], [1.5, 0.45], [1.6, 0.35]];
const leaper = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const CHROME = metal(0xd4d8de, 110), HEAD = metal(paint.getHex(), 50), INK = metal(inkOn(paint), 90), NICKEL = metal(0xc7cbd1, 90);
  const GROOVE = metal(0x8a9098, 50), RING = metal(0xd9dde2, 110), EYE = lambert(0x16181d);
  // the cat: turned up by A, scaled by S, moved by (DX, DY) so its hind feet stand on the head
  const A = 0.22, S = 0.8, DX = 0.32, DY = 0.2, c = Math.cos(A), sn = Math.sin(A);
  const place = ([x, y]) => [DX + S * (x * c - y * sn), DY + S * (x * sn + y * c)];
  const cat = poly(CAT.map(place));
  const HOLE = place([0.15, 0.0]);
  cat.holes.push(circle(HOLE[0], HOLE[1], 0.1));
  slab(k, CHROME, cat, 0.16, 0.03, 0, 6);
  // its eye, a dark fleck either side
  const eye = place([1.4, 0.38]);
  for (const s of [1, -1]) box(k, EYE, 0.07, 0.05, 0.02, eye[0], eye[1], s * 0.11).rotation.z = A;
  // the head of the key (moulded, the car's colour): a rounded block the cat's hind feet are set into, the initial on it
  const feet = Math.min(...CAT.map(place).map(([, y]) => y)), TOP = feet + 0.1, BOT = TOP - 0.6;
  const HP = [[-0.95, BOT], [0.95, BOT], [0.95, TOP], [-0.95, TOP]];
  const D = 0.3, B = 0.05, FRONT = D / 2 + B; // (its face at z = 0.2)
  slab(k, HEAD, outline(HP, 0.16), D, B, 0, 3);
  rainbow(band(k, rimMaterial(rarity), HP, 0.16, -0.12, -0.07, 0.04, FRONT + 0.005, 3), 0, (TOP + BOT) / 2);
  for (const s of [1, -1]) glyph(k, INK, initialOf(car), 0.3, FRONT - 0.01, FRONT + 0.035, 0, (TOP + BOT) / 2).rotation.y = s > 0 ? 0 : Math.PI;
  // the split ring: through the hole and round the cat's back (its plane across the cat's body)
  const back = [-sn, c], R = 0.34;
  const ring = add(k, new THREE.TorusGeometry(R, 0.04, 5, 16), RING, HOLE[0] + back[0] * R, HOLE[1] + back[1] * R, 0);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(c, sn, 0));
  // the blade: a straight back, teeth along its right edge, a rounded tip; a groove down each face
  const Y = BOT + 0.05;
  const pts = [[-0.2, Y], [-0.2, Y - 1.95], [-0.05, Y - 2.15], [0.2, Y - 2.0], [0.2, Y - 1.85], [0.33, Y - 1.7], [0.2, Y - 1.55], [0.32, Y - 1.4],
    [0.2, Y - 1.22], [0.34, Y - 1.05], [0.2, Y - 0.88], [0.3, Y - 0.72], [0.2, Y - 0.55], [0.2, Y]];
  slab(k, NICKEL, poly(pts), 0.12, 0, 0, 1);
  for (const s of [1, -1]) box(k, GROOVE, 0.08, 1.5, 0.035, -0.07, Y - 1.1, s * 0.065);
  return idle(group, merged(k));
};

registerKey('leaper', leaper);
