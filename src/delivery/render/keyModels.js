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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const KEY_MODELS = ['fob', 'classic', 'smart', 'fin', 'wheel', 'solar', 'lunar', 'snowboot', 'bun'];
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
const slab = (parent, material, shape, depth, bevel = 0, zc = 0, curve = 10) => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: curve, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2 });
  geo.translate(0, 0, zc - depth / 2);
  return add(parent, geo, material);
};
// a band round an outline: from d0 to d1 off it (d0 < d1), `depth` thick about zc
const band = (parent, material, points, r, d0, d1, depth, zc = 0, curve = 10) => {
  const shape = outline(points, r, d1);
  shape.holes.push(outline(points, r, d0, new THREE.Path()));
  return slab(parent, material, shape, depth, 0, zc, curve);
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

// ---- the six KEYS OF THEIR OWN (the owner, 13-Oct: "a unique car key model per key car ... still look like a car key,
// and evocative of the car it belongs to"). Each is a key at a glance (a blade, or a fob with buttons, a ring or a loop)
// with its car in its shape: its silhouette its own at card size. Lighter than the first three: few curve segments, and
// the parts that share a material merged into one mesh at the end (merged()), so each is some 15 to 20 meshes.
// A plain blade down from y0 to y1 (its tip pointed), w wide, d thick, a groove sunk along each face
const plainBlade = (parent, material, cut, y0, y1, w = 0.42, d = 0.13) => {
  const h = w / 2, pts = [[-h, y0], [h, y0], [h, y1 + w * 0.7], [0, y1], [-h, y1 + w * 0.7]];
  slab(parent, material, new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), d, 0, 0, 1);
  const len = (y0 - y1) * 0.62;
  for (const s of [1, -1]) box(parent, cut, w * 0.2, len, 0.035, -w * 0.12, y0 - (y0 - y1) * 0.48, s * d / 2);
};
// the parts that share a material merged into one mesh (their transforms baked in; the rainbow rim, with its colours,
// left as it is)
const merged = (root) => {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert(), byMaterial = new Map();
  root.traverse((node) => {
    if (!node.isMesh || node.material.vertexColors) return;
    if (!byMaterial.has(node.material)) byMaterial.set(node.material, []);
    byMaterial.get(node.material).push(node);
  });
  for (const [material, meshes] of byMaterial) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((mesh) => {
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.clearGroups();
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
      return geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    });
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    root.add(new THREE.Mesh(mergeGeometries(geos), material));
    for (const geo of geos) geo.dispose();
  }
  // (the groups left empty)
  const empty = [];
  root.traverse((node) => { if (node !== root && !node.isMesh && !node.children.length) empty.push(node); });
  for (const node of empty) node.removeFromParent();
  return root;
};

// ---- (d) the FIN (the Rocket Fin Coupe): a jet-age key whose bow is a swept tail fin in the car's colour, edged in
// chrome, a porthole with the initial, a chrome speed strake along its leading edge, the ring hole near its tip, and a
// rocket's flared nozzle as the stop the blade comes out of
const fin = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const FIN = metal(paint.getHex(), 80), CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80), CUT = metal(0x7d848d, 60);
  const PORT = metal(0x101318, 120), INK = glow(paint.clone().lerp(new THREE.Color(0xffffff), 0.3).getHex());
  // the fin: its trailing edge upright, its leading edge swept back up to the tip
  const P = [[-0.95, -1.0], [0.9, -1.0], [0.9, 0.25], [0.6, 1.9, 0.12], [-0.95, -0.1]];
  const D = 0.3, B = 0.08, FRONT = D / 2 + B; // (the face at z = 0.23)
  const HOLE = [0.45, 1.05];
  const shape = outline(P, 0.2);
  shape.holes.push(circle(HOLE[0], HOLE[1], 0.11));
  slab(k, FIN, shape, D, B, 0, 4);
  band(k, CHROME, P, 0.2, -0.1, 0.12, 0.22, 0, 4);
  rainbow(band(k, rimMaterial(rarity), P, 0.2, -0.19, -0.13, 0.06, FRONT + 0.005, 4), 0, 0.3);
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.15, 0.035, 6, 14), CHROME, HOLE[0], HOLE[1], z);
  // the porthole: a chrome ring, a dark window, the initial lit in the car's colour (both faces have the ring)
  const EY = -0.22;
  for (const s of [1, -1]) add(k, new THREE.TorusGeometry(0.4, 0.06, 6, 20), CHROME, 0, EY, s * FRONT);
  disc(k, PORT, 0.4, -FRONT - 0.02, FRONT + 0.02, 0, EY, 16);
  glyph(k, INK, initialOf(car), 0.4, FRONT + 0.015, FRONT + 0.045, 0, EY);
  // the speed strake, parallel to the leading edge
  const lead = Math.atan2(2.0, 1.55);
  const strake = box(k, CHROME, 0.62, 0.07, 0.04, 0.15, 0.65, FRONT + 0.01);
  strake.rotation.z = lead;
  // the nozzle (narrow at the fin, flared at the end) and the blade out of it
  const nozzle = new THREE.CylinderGeometry(0.2, 0.34, 0.42, 14, 1, true);
  add(k, nozzle, CHROME, 0, -1.17, 0);
  disc(k, PORT, 0.31, -0.02, 0.02, 0, -1.34, 14).rotation.x = Math.PI / 2; // (its throat, inside the flare)
  plainBlade(k, BLADE, CUT, -1.2, -3.8, 0.4);
  return idle(group, merged(k));
};

// ---- (e) the WHEEL (the Monowheel): the bow is a wheel, a rubber tyre round a rim of the car's colour on six chrome
// spokes, the initial on its hub; the split ring through the tyre at the top, a double-bit blade (teeth both sides) below
const wheel = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const TYRE = lambert(0x24262b), RIMP = metal(paint.getHex(), 70), CHROME = metal(0xd4d8de, 110), NICKEL = metal(0xc7cbd1, 90);
  const GROOVE = metal(0x8a9098, 50), ENAMEL = metal(0xf2efe6, 60), INK = metal(inkOn(new THREE.Color(0xf2efe6)), 90);
  const C = 0.25; // (the wheel's middle)
  add(k, new THREE.TorusGeometry(1.0, 0.17, 8, 28), TYRE, 0, C, 0);
  // tread blocks round the tyre's crown
  for (let i = 0; i < 16; i++) {
    const a = (i + 0.5) / 16 * Math.PI * 2;
    if (Math.abs(Math.cos(a)) > 0.97 && Math.sin(a) < 0) continue; // (none where the neck meets it)
    const t = box(k, TYRE, 0.13, 0.08, 0.26, Math.cos(a) * 1.15, C + Math.sin(a) * 1.15, 0);
    t.rotation.z = a;
  }
  const ring = new THREE.Shape(); ring.absarc(0, 0, 0.87, 0, Math.PI * 2, false);
  ring.holes.push(circle(0, 0, 0.71));
  slab(k, RIMP, ring, 0.16, 0, 0, 14).position.y = C;
  const lit = new THREE.Shape(); lit.absarc(0, 0, 0.8, 0, Math.PI * 2, false);
  lit.holes.push(circle(0, 0, 0.74));
  rainbow(slab(k, rimMaterial(rarity), lit, 0.04, 0, 0.09, 14), 0, 0).position.y = C;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2; // (none upright: the ring passes there)
    const spoke = box(k, CHROME, 0.46, 0.08, 0.08, Math.cos(a) * 0.52, C + Math.sin(a) * 0.52, 0);
    spoke.rotation.z = a;
  }
  disc(k, CHROME, 0.36, -0.1, 0.1, 0, C, 16);
  disc(k, ENAMEL, 0.29, 0.08, 0.13, 0, C, 16);
  glyph(k, INK, initialOf(car), 0.3, 0.12, 0.16, 0, C);
  // the neck down from the tyre, and the blade with teeth on both edges
  box(k, CHROME, 0.62, 0.22, 0.3, 0, C - 1.2, 0);
  const pts = [[-0.22, -0.98], [0.22, -0.98], [0.22, -1.4], [0.34, -1.55], [0.22, -1.7], [0.33, -1.9], [0.22, -2.1], [0.36, -2.3],
    [0.22, -2.5], [0.22, -2.95], [0, -3.25], [-0.22, -2.95], [-0.22, -2.7], [-0.35, -2.5], [-0.22, -2.3], [-0.32, -2.1], [-0.22, -1.9],
    [-0.36, -1.7], [-0.22, -1.5]];
  slab(k, NICKEL, new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), 0.12, 0, 0, 1);
  for (const s of [1, -1]) box(k, GROOVE, 0.07, 1.7, 0.035, 0, -2.0, s * 0.065);
  // the split ring round the tyre's top (in the plane across the key)
  const split = add(k, new THREE.TorusGeometry(0.34, 0.045, 6, 20), CHROME, 0, C + 1.0, 0);
  split.rotation.y = Math.PI / 2;
  return idle(group, merged(k));
};

// ---- (f) the SOLAR key (the Solar Racer): a thin wafer of a fob, its face tiled with dark solar cells, the driver's
// bubble on one side and the initial on a round badge on the other, a ring hole at the top, a flip blade below
const solar = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(paint.getHex(), 70), CELL = metal(0x0e1f4f, 130), CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80);
  const CUT = metal(0x7d848d, 60), GLASS = metal(0x16222e, 150), BADGE = metal(0xf2f4f7, 60), INK = metal(paint.getHex(), 90);
  const P = [[-1.05, -1.0], [1.05, -1.0], [1.05, 0.85], [0.6, 1.35], [-0.6, 1.35], [-1.05, 0.85]];
  const D = 0.16, B = 0.04, FRONT = D / 2 + B; // (the face at z = 0.12)
  const HOLE = [0, 1.02];
  const shape = outline(P, 0.22);
  shape.holes.push(circle(HOLE[0], HOLE[1], 0.09));
  slab(k, BODY, shape, D, B, 0, 4);
  rainbow(band(k, rimMaterial(rarity), P, 0.22, -0.17, -0.11, 0.05, FRONT + 0.005, 4), 0, 0.15);
  for (const z of [FRONT, -FRONT]) add(k, new THREE.TorusGeometry(0.12, 0.03, 6, 14), CHROME, HOLE[0], HOLE[1], z);
  // the cells: a 5 x 5 grid, less the corners the top's chamfers cut, the ring hole's, the bubble's and the badge's
  const xs = [-0.68, -0.34, 0, 0.34, 0.68], ys = [-0.62, -0.28, 0.06, 0.4, 0.74];
  xs.forEach((x, i) => ys.forEach((y, j) => {
    if (j === 4 && i !== 1 && i !== 3) return;
    if ((i === 3 || i === 4 || i === 0 || i === 1) && (j === 2 || j === 3)) return;
    box(k, CELL, 0.3, 0.3, 0.03, x, y, FRONT + 0.005);
  }));
  // the bubble (a dome, flattened) and the badge
  const dome = new THREE.SphereGeometry(0.33, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.rotateX(Math.PI / 2);
  add(k, dome, GLASS, 0.51, 0.23, FRONT - 0.01).scale.set(1, 1.05, 0.85);
  add(k, new THREE.TorusGeometry(0.3, 0.04, 6, 18), CHROME, -0.51, 0.23, FRONT + 0.01);
  disc(k, BADGE, 0.3, FRONT - 0.01, FRONT + 0.03, -0.51, 0.23, 18);
  glyph(k, INK, initialOf(car), 0.3, FRONT + 0.02, FRONT + 0.06, -0.51, 0.23);
  // the back: a plain panel; the blade's collar and the blade
  box(k, metal(0xe8ecf2, 40), 1.4, 1.3, 0.03, 0, 0.0, -FRONT - 0.005);
  box(k, CHROME, 0.56, 0.26, 0.22, 0, -1.1, 0);
  plainBlade(k, BLADE, CUT, -1.15, -3.45, 0.4, 0.12);
  return idle(group, merged(k));
};

// ---- (g) the LUNAR key (the Moon Rover): a chamfered square fob in lunar grey with a gold-foil face (the car's colour),
// the initial and a T-handle between two buttons on it, the rover's dish on a mast at one top corner and a little
// wheel hung on a split ring at the other, a stubby blade below
const lunar = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(0x8d929a, 60), FOIL = metal(paint.getHex(), 120), CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80);
  const CUT = metal(0x7d848d, 60), DARK = metal(0x2a2d33, 50), DISH = metal(0xeceae2, 60), INK = metal(inkOn(paint), 90);
  const P = [[-0.7, -1.1], [0.7, -1.1], [0.95, -0.85], [0.95, 0.85], [0.7, 1.1], [-0.7, 1.1], [-0.95, 0.85], [-0.95, -0.85]];
  const D = 0.36, B = 0.06, FRONT = D / 2 + B; // (the face at z = 0.24)
  slab(k, BODY, outline(P, 0.08), D, B, 0, 2);
  rainbow(band(k, rimMaterial(rarity), P, 0.08, -0.16, -0.1, 0.05, FRONT + 0.005, 2), 0, 0);
  slab(k, FOIL, outline(P, 0.06, -0.22), 0.06, 0, FRONT + 0.01, 2);
  glyph(k, INK, initialOf(car), 0.5, FRONT + 0.035, FRONT + 0.08, 0, 0.32);
  // the T-handle (the rover is steered by one) between the two buttons
  box(k, CHROME, 0.08, 0.36, 0.06, 0, -0.58, FRONT + 0.05);
  box(k, CHROME, 0.34, 0.08, 0.06, 0, -0.38, FRONT + 0.05);
  for (const x of [-0.5, 0.5]) disc(k, DARK, 0.15, FRONT, FRONT + 0.08, x, -0.48, 12);
  // the dish on its mast
  const mx = 0.45;
  add(k, new THREE.CylinderGeometry(0.045, 0.045, 0.62, 6), CHROME, mx, 1.38, 0);
  add(k, new THREE.CylinderGeometry(0.44, 0.05, 0.16, 14), DISH, mx, 1.74, 0);
  // the eye, the split ring through it and the wheel hung on the ring
  const ex = -0.5;
  add(k, new THREE.TorusGeometry(0.12, 0.04, 6, 12), CHROME, ex, 1.2, 0);
  const split = add(k, new THREE.TorusGeometry(0.26, 0.035, 6, 16), CHROME, ex, 1.46, 0);
  split.rotation.y = Math.PI / 2;
  add(k, new THREE.TorusGeometry(0.3, 0.075, 6, 16), DARK, ex, 1.85, 0);
  for (let i = 0; i < 8; i++) { // (the wire wheel's chevrons, round its tread)
    const a = (i + 0.5) / 8 * Math.PI * 2;
    if (Math.abs(a - Math.PI * 1.5) < 0.5) continue; // (not where the ring passes)
    const c = box(k, FOIL, 0.07, 0.05, 0.17, ex + Math.cos(a) * 0.37, 1.85 + Math.sin(a) * 0.37, 0);
    c.rotation.z = a;
  }
  disc(k, FOIL, 0.08, -0.05, 0.05, ex, 1.85, 8);
  for (const a of [0, Math.PI]) { // (two spokes, clear of the ring)
    const s = box(k, CHROME, 0.18, 0.04, 0.04, ex + Math.cos(a) * 0.15, 1.85, 0);
    s.rotation.z = a;
  }
  // the back: a raised panel; the blade
  box(k, DARK, 1.1, 1.1, 0.04, 0, 0, -FRONT - 0.01);
  box(k, CHROME, 0.5, 0.22, 0.26, 0, -1.2, 0);
  plainBlade(k, BLADE, CUT, -1.25, -3.05, 0.4);
  return idle(group, merged(k));
};

// ---- (h) the SNOWBOOT key (the Snowcat): a chunky fob of the car's colour in an ice-blue rubber boot whose sides are
// cleated like a track, a dark window with the initial and a snowflake, two big rubber buttons, a heavy ring on top
const snowboot = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BODY = metal(paint.getHex(), 50), BOOT = lambert(0x9fd8ec), CLEAT = lambert(0x2c3038), GLASS = metal(0x0a0c10, 130);
  const CHROME = metal(0xd4d8de, 110), ICE = glow(0xc8f2ff), WHITE = glow(0xf2f6fa);
  const P = [[-0.9, -1.2], [0.9, -1.2], [0.9, 1.2], [-0.9, 1.2]];
  const D = 0.5, B = 0.08, FRONT = D / 2 + B; // (the face at z = 0.33)
  slab(k, BODY, outline(P, 0.32), D, B, 0, 3);
  band(k, BOOT, P, 0.32, -0.14, 0.2, 0.74, 0, 3);
  rainbow(band(k, rimMaterial(rarity), P, 0.32, -0.25, -0.19, 0.05, FRONT + 0.005, 3), 0, 0);
  // the track's cleats down each side, and across the bottom
  for (const s of [1, -1]) for (let i = 0; i < 7; i++) box(k, CLEAT, 0.1, 0.13, 0.82, s * 1.13, -0.96 + i * 0.32, 0);
  for (const x of [-0.45, 0, 0.45]) box(k, CLEAT, 0.16, 0.1, 0.82, x, -1.43, 0);
  // the window: the initial and a snowflake
  box(k, GLASS, 1.12, 0.72, 0.08, 0, 0.42, FRONT);
  glyph(k, ICE, initialOf(car), 0.42, FRONT + 0.035, FRONT + 0.06, -0.24, 0.42);
  for (let i = 0; i < 3; i++) box(k, WHITE, 0.04, 0.46, 0.025, 0.27, 0.42, FRONT + 0.045).rotation.z = i * Math.PI / 3;
  // two big rubber buttons (the boot's rubber), a mark on each
  for (const [x, open] of [[-0.38, false], [0.38, true]]) {
    disc(k, BOOT, 0.26, FRONT - 0.03, FRONT + 0.08, x, -0.52, 14);
    box(k, WHITE, 0.18, 0.05, 0.03, x, -0.52, FRONT + 0.085);
    if (open) box(k, WHITE, 0.05, 0.18, 0.035, x, -0.52, FRONT + 0.085);
  }
  // the lug on top and a heavy ring through it
  box(k, BOOT, 0.56, 0.34, 0.42, 0, 1.5, 0);
  const ring = add(k, new THREE.TorusGeometry(0.36, 0.07, 6, 18), CHROME, 0, 1.86, 0);
  ring.rotation.y = Math.PI / 2;
  // the back: a raised panel of the boot's rubber with ridges (a track's pattern)
  for (let i = 0; i < 5; i++) box(k, BOOT, 1.2, 0.12, 0.05, 0, -0.8 + i * 0.4, -FRONT - 0.01);
  return idle(group, merged(k));
};

// ---- (i) the BUN key (the Hot Dog Car): a sausage in a bun of the car's colour, mustard zigzagged along its top, a
// loop at one end; at the other a ketchup-red badge with the initial in mustard, and the blade out of it
const bun = (car, { rarity = 'bespoke' } = {}) => {
  const group = new THREE.Group(), k = new THREE.Group();
  const paint = paintOf(car);
  const BUN = lambert(paint.getHex()), SAUSAGE = metal(0xb4432a, 30), MUSTARD = lambert(0xf3c51b), KETCHUP = metal(0xc2241c, 50);
  const CHROME = metal(0xd4d8de, 110), BLADE = metal(0xc3c8cf, 80), CUT = metal(0x7d848d, 60);
  const C = 0.15;
  add(k, new THREE.CapsuleGeometry(0.34, 2.5, 4, 12), SAUSAGE, 0, C, 0.1);
  for (const s of [1, -1]) add(k, new THREE.CapsuleGeometry(0.36, 1.9, 4, 12), BUN, s * 0.4, C, -0.08).scale.set(1, 1, 0.9);
  // the mustard: a zigzag along the sausage's crown
  const zig = [];
  for (let i = 0; i <= 9; i++) zig.push([i % 2 ? 0.13 : -0.13, C - 1.05 + i * 0.25]);
  for (let i = 0; i < zig.length - 1; i++) {
    const [x0, y0] = zig[i], [x1, y1] = zig[i + 1];
    const seg = box(k, MUSTARD, 0.07, Math.hypot(x1 - x0, y1 - y0) + 0.06, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, 0.43);
    seg.rotation.z = Math.atan2(-(x1 - x0), y1 - y0);
  }
  // the loop at the top
  box(k, CHROME, 0.3, 0.2, 0.3, 0, C + 1.62, 0.1);
  const loop = add(k, new THREE.TorusGeometry(0.2, 0.05, 6, 16), CHROME, 0, C + 1.88, 0.1);
  loop.rotation.y = Math.PI / 2;
  // the badge at the bottom: chrome-edged, ketchup red, the initial in mustard, the rarity's rim round it
  const BP = [[-0.48, -0.36], [0.48, -0.36], [0.48, 0.36], [-0.48, 0.36]].map(([x, y]) => [x, y - 1.72]);
  slab(k, KETCHUP, outline(BP, 0.16), 0.26, 0.04, 0, 3);
  band(k, CHROME, BP, 0.16, -0.06, 0.08, 0.2, 0, 3);
  rainbow(band(k, rimMaterial(rarity), BP, 0.16, -0.12, -0.07, 0.04, 0.17 + 0.005, 3), 0, -1.72);
  glyph(k, MUSTARD, initialOf(car), 0.4, 0.15, 0.2, 0, -1.72);
  plainBlade(k, BLADE, CUT, -1.95, -3.75, 0.4);
  return idle(group, merged(k));
};

export const KEY_BUILDERS = { fob, classic, smart, fin, wheel, solar, lunar, snowboot, bun };
// a key for a car: the model named (else KEY_MODEL), tinted by the car, lit by the rarity
export const makeKey = (car, { model = KEY_MODEL, rarity = 'bespoke' } = {}) => {
  const group = (KEY_BUILDERS[model] || KEY_BUILDERS[KEY_MODEL])(car, { rarity });
  group.userData.keyModel = KEY_BUILDERS[model] ? model : KEY_MODEL;
  return group;
};
