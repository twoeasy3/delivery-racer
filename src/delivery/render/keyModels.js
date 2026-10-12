// ---- CAR KEYS: three 3D keys for the Bespoke KEY cards (the owner, 12-Oct, after Asphalt 9's CAR KEY card) ----------
// "The agent needs to make a car key model and render it as part of the blueprint. Try 3 models please." Three keys in
// the game's blocky low-poly style (boxes, extruded outlines with a small bevel, Lambert paint, a little Phong for the
// metal), each a builder (car, { rarity }) => THREE.Group:
//   fob      a modern remote fob with a flip-out blade: a dark body in a chrome bezel, an emblem plate in the car's
//            colour with its initial, lock and unlock buttons, a key ring hole, a silvery laser-cut blade out of the end
//   classic  a classic metal key: a big round brass bow with an enamel plate (the car's colour, its initial), a ring
//            hole, a toothed nickel blade with a groove, and a stitched leather tag on a split ring
//   smart    a keyless smart key: a slim glossy elongated-hexagon pebble with a band of the car's colour round its
//            edge, a glowing initial in a dark glass window, a row of three buttons, an emergency key cap and a loop
// The key is TINTED by the car (car.color: the Good livery) and lit by the card's RARITY: a rim of light round its face
// in the rarity's colour (Bespoke: the rainbow). The emblem is the car's initial (a 5x5 block letter), never a maker's
// logo. Built standing: the long axis is y (the head up, the blade down), the face toward +z, the thickness along z.
// No two faces share a plane: everything on a face is sunk a little into it and stands proud of it.
// userData.animate(t) turns the key gently (an idle sway, for a live view); the cards' stills never call it (they wrap
// the key in a group of their own pose: render/keycard.js). No game state here (a headless check builds them).
import * as THREE from 'three';

export const KEY_MODELS = ['fob', 'classic', 'smart'];
// the one the cards use (?keymodel=fob|classic|smart picks another for a visit: render/keycard.js)
export const KEY_MODEL = 'fob';

const RIM = { common: 0xa3acb7, uncommon: 0x3fd06f, epic: 0xb45cff, legendary: 0xffbe2e, bespoke: 'rainbow' };

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const metal = (color, shininess = 90) => new THREE.MeshPhongMaterial({ color, specular: 0xffffff, shininess });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const add = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (parent, material, w, h, d, x, y, z) => add(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
// a disc facing +z (its axis along z), from z0 to z1
const disc = (parent, material, r, z0, z1, x, y, segments = 20) => {
  [z0, z1] = [Math.min(z0, z1), Math.max(z0, z1)];
  const geo = new THREE.CylinderGeometry(r, r, z1 - z0, segments);
  geo.rotateX(Math.PI / 2);
  return add(parent, geo, material, x, y, (z0 + z1) / 2);
};

// ---- outlines: a CONVEX polygon ([x, y] points, anticlockwise) with its corners rounded by `r` (or a corner's own
// [x, y, r]); grown by d (d < 0: shrunk) along its edges' normals, the corners' rounding grown with it, so a bezel or a
// rim is an even band round the shape
const grow = (points, d) => points.map(([x, y, own], i) => {
  const n = points.length, [ax, ay] = points[(i + n - 1) % n], [bx, by] = points[(i + 1) % n];
  const e1 = [x - ax, y - ay], e2 = [bx - x, by - y];
  const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
  const n1 = [e1[1] / l1, -e1[0] / l1], n2 = [e2[1] / l2, -e2[0] / l2]; // (outward, for an anticlockwise polygon)
  const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
  return [x + (n1[0] + n2[0]) * k, y + (n1[1] + n2[1]) * k, own];
});
const outline = (points, r, d = 0, path = new THREE.Shape()) => {
  const pts = d ? grow(points, d) : points, n = pts.length;
  pts.forEach(([x, y, own], i) => {
    const [ax, ay] = pts[(i + n - 1) % n], [cx, cy] = pts[(i + 1) % n];
    const la = Math.hypot(ax - x, ay - y), lc = Math.hypot(cx - x, cy - y);
    const k = Math.max(0.005, Math.min((own ?? r) + d, la / 2 - 0.001, lc / 2 - 0.001));
    const from = [x + (ax - x) / la * k, y + (ay - y) / la * k], to = [x + (cx - x) / lc * k, y + (cy - y) / lc * k];
    if (i) path.lineTo(from[0], from[1]); else path.moveTo(from[0], from[1]);
    path.quadraticCurveTo(x, y, to[0], to[1]);
  });
  path.closePath();
  return path;
};
const circle = (x, y, r, path = new THREE.Path()) => { path.absarc(x, y, r, 0, Math.PI * 2, true); return path; };
// a shape extruded along z, `depth` thick (plus `bevel` each side), centred on z = zc
const slab = (parent, material, shape, depth, bevel = 0, zc = 0) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 10, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2 });
  geo.translate(0, 0, zc - depth / 2);
  return add(parent, geo, material);
};
// a band round an outline: from d0 to d1 off it (d0 < d1), `depth` thick about zc
const band = (parent, material, points, r, d0, d1, depth, zc = 0) => {
  const shape = outline(points, r, d1);
  shape.holes.push(outline(points, r, d0, new THREE.Path()));
  return slab(parent, material, shape, depth, 0, zc);
};
// the rarity's lit rim: its colour, or the rainbow round the shape (Bespoke): a colour per vertex by its angle
const rimMaterial = (rarity) => {
  const c = RIM[rarity] ?? RIM.bespoke;
  return c === 'rainbow' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : glow(c);
};
const rainbow = (mesh, cx = 0, cy = 0) => {
  if (!mesh.material.vertexColors) return mesh;
  const pos = mesh.geometry.attributes.position, colours = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i) + mesh.position.y - cy, pos.getX(i) + mesh.position.x - cx);
    c.setHSL(((a / (Math.PI * 2)) + 1) % 1, 0.95, 0.6);
    colours.set([c.r, c.g, c.b], i * 3);
  }
  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return mesh;
};

// ---- the emblem: the car's initial as a 5x5 block letter (a row's run of blocks one box), else a diamond ----
const GLYPHS = {
  A: ['.###.', '#...#', '#####', '#...#', '#...#'], B: ['####.', '#...#', '####.', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '.####'], D: ['####.', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#####'], F: ['#####', '#....', '####.', '#....', '#....'],
  G: ['.####', '#....', '#..##', '#...#', '.###.'], H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '#####'], J: ['..###', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '####.', '#....', '#....'],
  Q: ['.###.', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  S: ['.####', '#....', '.###.', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'], Z: ['#####', '...#.', '..#..', '.#...', '#####'],
  '*': ['..#..', '.###.', '#####', '.###.', '..#..'],
};
export const initialOf = (car) => {
  const ch = String(car?.name || car?.id || '').toUpperCase().match(/[A-Z]/);
  return ch ? ch[0] : '*';
};
// the letter, `size` across, its blocks from z0 to z1, centred on (x, y)
const glyph = (parent, material, ch, size, z0, z1, x = 0, y = 0) => {
  const rows = GLYPHS[ch] || GLYPHS['*'], px = size / 5, g = new THREE.Group();
  rows.forEach((row, j) => {
    for (const m of row.matchAll(/#+/g)) {
      const w = m[0].length * px;
      box(g, material, w, px, z1 - z0, -size / 2 + m.index * px + w / 2, size / 2 - j * px - px / 2, (z0 + z1) / 2);
    }
  });
  g.position.set(x, y, 0);
  parent.add(g);
  return g;
};
// a paint's colour, and an ink that reads on it (dark on a light paint, near-white on a dark one)
const paintOf = (car) => new THREE.Color(car?.color ?? 0xc9d2dc);
const inkOn = (colour) => (colour.r * 0.3 + colour.g * 0.59 + colour.b * 0.11 > 0.5 ? 0x16181d : 0xf2f4f7);

// a gentle idle sway for a live view (t: seconds), from rest at t = 0
const idle = (group, inner) => {
  group.add(inner);
  group.userData.animate = (t) => {
    inner.rotation.y = Math.sin(t * 0.7) * 0.32;
    inner.rotation.z = Math.sin(t * 0.43) * 0.05;
    inner.position.y = Math.sin(t * 1.1) * 0.05;
  };
  return group;
};

// ---- (a) the FOB: a modern remote fob with a flip-out blade ----
const fob = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x1b1e24, 40), CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80), CUT = metal(0x7d848d, 60);
  const RUBBER = lambert(0x3a3e46), PLATE = metal(paint.getHex(), 70), INK = metal(inkOn(paint), 90), WHITE = glow(0xe8ecf2);
  // the body: a rounded slab, wider rounding at the top; a ring hole near the top
  const P = [[-0.95, -1.6, 0.45], [0.95, -1.6, 0.45], [0.95, 1.6, 0.8], [-0.95, 1.6, 0.8]];
  const shape = outline(P, 0.5);
  shape.holes.push(circle(0, 1.12, 0.17));
  const D = 0.5, B = 0.1, FRONT = D / 2 + B; // (the face at z = 0.35)
  slab(k, BODY, shape, D, B);
  // the chrome bezel round its middle (its inner edge buried in the body, its outer edge standing out of it)
  band(k, CHROME, P, 0.5, -0.12, 0.17, 0.24);
  // the rarity's lit rim on the face, inset from the edge
  rainbow(band(k, rimMaterial(rarity), P, 0.5, -0.19, -0.12, 0.06, FRONT + 0.005));
  // the ring hole's chrome grommets, front and back
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.22, 0.05, 8, 20), CHROME, 0, 1.12, z);
  // the emblem plate (the car's colour) in a chrome ring, the initial on it
  const EY = 0.3;
  disc(k, PLATE, 0.42, FRONT - 0.03, FRONT + 0.05, 0, EY);
  band(k, CHROME, [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [x * 0.44, y * 0.44 + EY]), 0.44, -0.04, 0.05, 0.14, FRONT + 0.04);
  glyph(k, INK, initialOf(car), 0.44, FRONT + 0.04, FRONT + 0.1, 0, EY);
  // two buttons: lock (a closed padlock) and unlock (an open one)
  [[-0.38, false], [0.38, true]].forEach(([x, open]) => {
    const y = -0.62;
    disc(k, RUBBER, 0.28, FRONT - 0.03, FRONT + 0.07, x, y);
    box(k, WHITE, 0.2, 0.15, 0.04, x, y - 0.05, FRONT + 0.08);
    const shackle = add(k, new THREE.TorusGeometry(0.065, 0.02, 6, 12, Math.PI), WHITE, x + (open ? 0.05 : 0), y + 0.02 + (open ? 0.04 : 0), FRONT + 0.08);
    shackle.rotation.z = open ? 0.35 : 0;
  });
  // the back: a small battery hatch (a shallow raised panel) and a slot
  box(k, metal(0x24282f, 30), 1.1, 0.9, 0.06, 0, -0.45, -FRONT - 0.02);
  box(k, CUT, 0.36, 0.05, 0.04, 0, -0.8, -FRONT - 0.05);
  // the blade's collar out of the bottom end, and the blade: a laser-cut track down both faces, a tapered tip
  box(k, CHROME, 0.62, 0.3, 0.3, 0, -1.68, 0);
  const blade = new THREE.Shape([[-0.21, -1.3], [0.21, -1.3], [0.21, -3.45], [0.04, -3.7], [-0.21, -3.55]].map(([x, y]) => new THREE.Vector2(x, y)));
  slab(k, BLADE, blade, 0.14);
  for (const s of [1, -1]) {
    // the track: a zigzag of short bars, each sunk into the blade and standing 0.02 proud of it
    const ys = [-1.9, -2.2, -2.5, -2.8, -3.1, -3.35], xs = [-0.04, 0.06, -0.06, 0.05, -0.05, 0.02];
    for (let i = 0; i < ys.length - 1; i++) {
      const dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i], len = Math.hypot(dx, dy) + 0.06;
      const bar = box(k, CUT, 0.07, len, 0.04, (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2, s * 0.08);
      bar.rotation.z = Math.atan2(-dx, dy);
    }
  }
  return idle(group, k);
};

// ---- (b) the CLASSIC: a big round brass bow, a toothed nickel blade, a leather tag on a split ring ----
const classic = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BRASS = metal(0xc9a24a, 70), NICKEL = metal(0xc7cbd1, 90), GROOVE = metal(0x8a9098, 50), RING = metal(0xd9dde2, 110);
  const ENAMEL = metal(paint.getHex(), 60), INK = metal(inkOn(paint), 90);
  const LEATHER = lambert(0x6b3f22), STITCH = lambert(0xe2c98f);
  // the bow: a disc with a neck down to the blade, a ring hole at the top
  const BOW = 0.13; // (its faces at z = +-0.13)
  const bow = new THREE.Shape();
  bow.absarc(0, 0, 1, -Math.PI / 2 + 0.42, -Math.PI / 2 - 0.42 + Math.PI * 2, false);
  bow.lineTo(-0.3, -1.12); bow.lineTo(0.3, -1.12);
  bow.closePath();
  bow.holes.push(circle(0, 0.64, 0.19));
  slab(k, BRASS, bow, 0.16, 0.05);
  // the enamel plate (the car's colour) with the initial, ringed by the rarity's light, on both faces
  for (const s of [1, -1]) {
    disc(k, ENAMEL, 0.44, s * (BOW - 0.03), s * (BOW + 0.05), 0, -0.12);
    const rim = band(k, rimMaterial(rarity), [[-0.44, -0.56], [0.44, -0.56], [0.44, 0.32], [-0.44, 0.32]], 0.44, 0.02, 0.09, 0.1, s * (BOW + 0.02));
    rainbow(rim, 0, -0.12);
  }
  glyph(k, INK, initialOf(car), 0.46, BOW + 0.04, BOW + 0.1, 0, -0.12);
  // the stop (shoulder) between the bow and the blade
  box(k, BRASS, 0.78, 0.16, 0.3, 0, -1.16, 0);
  // the blade: a straight back, teeth cut along its right edge, a rounded tip
  const pts = [[-0.22, -1.1], [-0.22, -3.0], [-0.05, -3.22], [0.22, -3.05], [0.22, -2.9], [0.37, -2.75], [0.22, -2.58], [0.35, -2.42], [0.22, -2.24],
    [0.38, -2.05], [0.22, -1.86], [0.33, -1.68], [0.22, -1.5], [0.22, -1.1]];
  slab(k, NICKEL, new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), 0.12);
  for (const s of [1, -1]) box(k, GROOVE, 0.08, 1.7, 0.035, -0.07, -2.08, s * 0.065);
  // the split ring through the bow's hole (in the plane across the key), and the leather tag hung on it
  const R = 0.46, ringY = 0.64 + R;
  const ring = add(k, new THREE.TorusGeometry(R, 0.045, 8, 28), RING, 0, ringY, 0);
  ring.rotation.y = Math.PI / 2;
  const tag = new THREE.Group();
  tag.position.set(0, ringY + R, 0); // (the ring's top, through the tag's eyelet)
  tag.rotation.z = 0.75;
  const TP = [[-0.42, -0.2, 0.42], [0.42, -0.2, 0.42], [0.36, 1.55, 0.2], [-0.36, 1.55, 0.2]];
  const tagShape = outline(TP, 0.3);
  tagShape.holes.push(circle(0, 0, 0.13));
  slab(tag, LEATHER, tagShape, 0.1, 0.03);
  for (const s of [1, -1]) {
    add(tag, new THREE.TorusGeometry(0.16, 0.04, 6, 16), RING, 0, 0, s * 0.08); // (the eyelet)
    // stitching: dashes along the tag's edge, standing just proud of the leather
    const inner = grow(TP, -0.13);
    inner.forEach(([x0, y0], i) => {
      const [x1, y1] = inner[(i + 1) % inner.length], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 0.14));
      for (let j = 0; j < n; j++) { // (clear of the rounded corners)
        const t = 0.15 + 0.7 * (j + 0.5) / n, dash = box(tag, STITCH, 0.065, 0.025, 0.03, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, s * 0.075);
        dash.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      }
    });
  }
  // the tag's badge: the car's colour, a diamond on it
  disc(tag, ENAMEL, 0.24, 0.05, 0.1, 0, 0.82);
  glyph(tag, INK, '*', 0.26, 0.09, 0.13, 0, 0.82);
  k.add(tag);
  return idle(group, k);
};

// ---- (c) the SMART key: a slim glossy pebble, keyless ----
const smart = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x15171c, 120), BAND = metal(paint.getHex(), 80), GLASS = metal(0x07080b, 140), CHROME = metal(0xd4d8de, 110);
  const BUTTON = metal(0x2c3038, 60), WHITE = glow(0xe8ecf2);
  const lit = new THREE.Color(RIM[rarity] === 'rainbow' || RIM[rarity] === undefined ? 0xffffff : RIM[rarity]);
  // an elongated hexagon, its corners well rounded
  const P = [[0, -1.55, 0.4], [0.9, -0.8], [0.9, 0.8], [0, 1.55, 0.4], [-0.9, 0.8], [-0.9, -0.8]];
  const D = 0.3, B = 0.12, FRONT = D / 2 + B; // (the face at z = 0.27)
  slab(k, BODY, outline(P, 0.32), D, B);
  // the car's colour as a band round its edge
  band(k, BAND, P, 0.32, -0.12, 0.13, 0.16);
  // the rarity's lit rim round the face
  rainbow(band(k, rimMaterial(rarity), P, 0.32, -0.2, -0.13, 0.05, FRONT + 0.005));
  // the emblem: a dark glass window, the initial glowing in it
  disc(k, GLASS, 0.42, FRONT - 0.03, FRONT + 0.04, 0, 0.42, 6);
  glyph(k, glow(lit.lerp(new THREE.Color(0xffffff), 0.35).getHex()), initialOf(car), 0.42, FRONT + 0.035, FRONT + 0.06, 0, 0.42);
  // a row of three buttons (lock, unlock, boot), each with a white mark
  [-0.42, 0, 0.42].forEach((x, i) => {
    const y = -0.48;
    box(k, BUTTON, 0.3, 0.42, 0.1, x, y, FRONT + 0.02);
    if (i === 0) box(k, WHITE, 0.14, 0.04, 0.03, x, y, FRONT + 0.08);
    else if (i === 1) { box(k, WHITE, 0.14, 0.04, 0.03, x, y, FRONT + 0.08); box(k, WHITE, 0.04, 0.14, 0.04, x, y, FRONT + 0.08); } // (the cross's bars not level with each other)
    else box(k, WHITE, 0.16, 0.06, 0.03, x, y - 0.06, FRONT + 0.08);
  });
  // the emergency key's chrome cap at the top, and a loop for a lanyard through it
  box(k, CHROME, 0.5, 0.26, 0.3, 0, 1.5, 0);
  const loop = add(k, new THREE.TorusGeometry(0.2, 0.05, 8, 18), CHROME, 0, 1.78, 0);
  loop.rotation.y = Math.PI / 2;
  // the back: a raised oval of the car's colour
  disc(k, BAND, 0.5, -FRONT - 0.04, -FRONT + 0.03, 0, 0, 24).scale.set(1, 1.6, 1);
  return idle(group, k);
};

export const KEY_BUILDERS = { fob, classic, smart };
// a key for a car: the model named (else KEY_MODEL), tinted by the car, lit by the rarity
export const makeKey = (car, { model = KEY_MODEL, rarity = 'bespoke' } = {}) => {
  const group = (KEY_BUILDERS[model] || KEY_BUILDERS[KEY_MODEL])(car, { rarity });
  group.userData.keyModel = KEY_BUILDERS[model] ? model : KEY_MODEL;
  return group;
};
