// ---- the fifth batch of car ideas' models ----------------------------------------------------------
// Two more vehicles drawn as ideas (ideas.js: IDEA_CARS, the entries after the Game-Drive Truck): believable,
// recognisable road cars of the classic kind, each after a real one: a French saloon of the hydropneumatic kind
// (a shark's nose with its lamps behind glass, the back wheels under spats, a tail that narrows, turn signals in
// trumpets at the roof's back corners) and an American hardtop of 1957 (hooded lamps, a grille the width of the
// car, rockets on the bonnet, a ribbed flash down each rear quarter, fins, no pillar between the side windows).
// Built as ideaModels.js' are (the same helpers, kept here as copies so that the files do not import each other):
// each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the mesh
// whose material is the paint, so the livery can be swapped; every part in the paint shares that one material),
// userData.animate (seconds) => void, and userData.livery (evil) => void (each has a roof in a second colour).
// ideaModels.js spreads IDEA_MODELS_5 into IDEA_MODELS. State-free: nothing here knows about the game.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const TYRE = lambert(0x141414), STEEL = lambert(0xc4c8ce), WHITE = lambert(0xf4f2ec);
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), TAIL = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const AMBER = new THREE.MeshBasicMaterial({ color: 0xffa31a });
// (returns [tyre, hub]; the hub is steel unless given a material of its own)
const wheel = (parent, radius, width, x, y, z, hubMaterial = STEEL) => {
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), TYRE);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 14), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};
// a wheel with a white wall to its tyre
const whitewall = (parent, radius, width, x, y, z, hubMaterial) => {
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width + 0.02, 18), WHITE);
  wall.rotation.z = Math.PI / 2;
  wall.position.set(x, y, z);
  parent.add(wall);
  return wheel(parent, radius, width, x, y, z, hubMaterial);
};
// a flat panel tipped about the car's width. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its middle at x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a side view with its corners rounded off: the polygon `points` ([z, y], or [z, y, r] for a corner of its own)
const rounded = (points, r = 0.08) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, own], i) => {
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(own ?? r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(from[0], from[1]); else shape.moveTo(from[0], from[1]);
    shape.quadraticCurveTo(z, y, to[0], to[1]);
  });
  shape.closePath();
  return shape;
};
// a solid whose side view is the curved THREE.Shape `shape`, `w` wide across the car with its edges rounded off by
// `round`, its middle at x
const curved = (parent, material, w, shape, round, x = 0) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w - 2 * round, curveSegments: 12, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 2,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a round lamp (or anything disc-shaped) facing along the car
const disc = (parent, material, r, depth, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 16), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a round bar: `axis` 'x' across the car, 'y' upright, 'z' along it
const tube = (parent, material, r, length, x, y, z, axis = 'y') => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 10), material);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a rounded lump: a ball squashed to rx, ry, rz
const BALL = new THREE.SphereGeometry(1, 16, 10);
const blob = (parent, material, rx, ry, rz, x, y, z) => {
  const mesh = new THREE.Mesh(BALL, material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a wheel arch: the top half of a thin drum lying across the car (a dark half-disc on its flank), its middle at (x, y, z)
const arch = (parent, material, r, width, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 18, 1, false, 0, Math.PI), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top],
// its middle at x. A nose, a tail
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals(); // (no shared corners: each face flat)
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};

export const IDEA_MODELS_5 = {
  // A goddess of a saloon (a Citroën DS, the twin-lamp kind of 1968 on): long and low, a shark's nose with two
  // lamps each side behind glass, the inner pair turning with the road; a slim glasshouse under a roof in a second
  // colour, with a trumpet at each of its back corners holding a turn signal; the back wheels hidden under spats,
  // narrower set than the front; a tail that narrows to small lamps and a slim bumper. Its inner lamps look
  // round the corners
  goddess: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.33, S = w * 0.96 / 2; // (S: the flank, half the body's width)
    const paint = lambert(car.color), roofPaint = lambert(0xece6d6), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = curved(group, paint, w * 0.96, rounded([[-L * 0.86 + 0.06, 0.4], [L * 0.82 - 0.06, 0.4], [L * 0.82 - 0.06, 0.66], [L * 0.26, 0.84], [-L * 0.6, 0.86], [-L * 0.86 + 0.06, 0.74]], 0.06), 0.06); // (the bevel adds its 6 cm all round)
    taper(group, paint, [L * 0.82, w * 0.95, 0.34, 0.72], [L, w * 0.8, 0.4, 0.6]);    // the shark's nose,
    taper(group, paint, [-L * 0.84, w * 0.94, 0.36, 0.8], [-L, w * 0.6, 0.5, 0.74]);    // and the narrowing tail
    // the glasshouse: the windscreen, the side windows and the long rear window, one piece of glass
    prism(group, glass, w * 0.8, [[L * 0.3, 0.84], [L * 0.27, 0.9], [L * 0.04, 1.38], [-L * 0.48, 1.4], [-L * 0.72, 0.9], [-L * 0.72, 0.84]]);
    curved(group, roofPaint, w * 0.82, rounded([[L * 0.06 - 0.03, 1.405], [-L * 0.5 + 0.03, 1.405], [-L * 0.5 + 0.03, 1.415], [L * 0.06 - 0.03, 1.415]], 0.01), 0.03); // the roof
    const gx = w * 0.4; // (the glass's side)
    for (const side of [-1, 1]) {
      const x = side * gx;
      prism(group, paint, 0.05, [[L * 0.3, 0.86], [L * 0.255, 0.86], [L * 0.025, 1.385], [L * 0.07, 1.385]], x - side * 0.015); // slim pillars: the windscreen's,
      box(group, paint, 0.05, 0.52, 0.09, x - side * 0.015, 1.13, -L * 0.14);              // the middle one,
      prism(group, paint, 0.05, [[-L * 0.42, 1.385], [-L * 0.5, 1.385], [-L * 0.69, 0.86], [-L * 0.61, 0.86]], x - side * 0.015); // and the back one
      // a trumpet at the roof's back corner, with the turn signal in its mouth
      const trumpet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.2, 14), roofPaint);
      trumpet.rotation.x = Math.PI / 2; // (narrow end forward)
      trumpet.position.set(side * w * 0.37, 1.4, -L * 0.52);
      group.add(trumpet);
      disc(group, TAIL, 0.048, 0.03, side * w * 0.37, 1.4, -L * 0.52 - 0.105);
      // the lamps: two each side of the nose behind glass, in a dark, chrome-rimmed well
      box(group, chrome, 0.42, 0.15, 0.03, side * w * 0.28, 0.53, L);
      box(group, trim, 0.38, 0.12, 0.04, side * w * 0.28, 0.53, L + 0.01);
      disc(group, LAMP, 0.055, 0.03, side * w * 0.33, 0.53, L + 0.035);                    // the outer lamp,
      // the wheels: the front ones in open arches, the back ones (set narrower) under the spats
      wheel(group, R, 0.2, side * (S + 0.02 - 0.1), R, L * 0.6, chrome);
      arch(group, trim, R + 0.07, 0.012, side * (S + 0.004), 0.345, L * 0.6);
      wheel(group, R, 0.2, side * (S - 0.2), R, -L * 0.7, chrome);
      box(group, chrome, 0.012, 0.025, 0.7, side * (S + 0.004), 0.43, -L * 0.7);          // the spat's chrome lip
      box(group, chrome, 0.012, 0.02, L * 1.16, side * (S + 0.004), 0.66, -L * 0.16);      // a chrome line along the flank
      box(group, chrome, 0.05, 0.025, 0.12, side * (S + 0.012), 0.76, -L * 0.1);           // the door handles
      box(group, chrome, 0.05, 0.025, 0.12, side * (S + 0.012), 0.77, L * 0.2);
      box(group, chrome, 0.07, 0.06, 0.09, side * (S - 0.03), 0.87, L * 0.3);               // mirrors
      box(group, TAIL, 0.15, 0.11, 0.04, side * w * 0.21, 0.665, -L - 0.01);                // the tail lamps,
      box(group, AMBER, 0.07, 0.11, 0.04, side * (w * 0.21 + 0.115), 0.665, -L - 0.01);     // the indicators beside them
      box(group, trim, 0.06, 0.13, 0.08, side * w * 0.2, 0.43, L + 0.03);                   // the bumper's rubber guards
      box(group, trim, 0.05, 0.11, 0.06, side * w * 0.17, 0.53, -L - 0.03);
      box(group, trim, 0.3, 0.05, 0.06, side * w * 0.22, 0.39, L - 0.04);                   // the air intakes under the nose
    }
    // the inner lamps, which turn with the steering
    const swivel = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * w * 0.23, 0.53, L + 0.035);
      group.add(pivot);
      disc(pivot, LAMP, 0.055, 0.03, 0, 0, 0);
      return pivot;
    });
    box(group, chrome, w * 0.84, 0.05, 0.06, 0, 0.42, L + 0.02);                           // the slim front bumper,
    box(group, chrome, w * 0.58, 0.05, 0.06, 0, 0.53, -L - 0.02);                          // the back one,
    box(group, WHITE, 0.32, 0.09, 0.02, 0, 0.62, -L - 0.01);                               // the plate above it
    for (const side of [-1, 1]) slab(group, chrome, 0.1, 0.02, 0.02, side * 0.04, 0.71, -L - 0.012, 0).rotation.z = side * 0.5; // the chevrons on the boot
    for (const side of [-1, 1]) slab(group, chrome, 0.1, 0.02, 0.02, side * 0.04, 0.68, -L - 0.012, 0).rotation.z = side * 0.5;
    tube(group, trim, 0.03, 0.3, -w * 0.25, 0.36, -L * 0.9, 'z');                          // the exhaust
    group.userData = {
      body,
      animate: (t) => { const turn = Math.sin(t * 0.5) * 0.35; for (const pivot of swivel) pivot.rotation.y = turn; },
      livery: (evil) => roofPaint.color.setHex(evil ? 0x4a2a3e : 0xece6d6),
    };
    return group;
  },

  // A fifties hardtop (a 1957 Chevrolet Bel Air two-door hardtop): long, wide and flat-topped, a grille the width
  // of the car with a bar across it, round lamps under chrome hoods, two rockets on the bonnet, a heavy bumper
  // with bullets in it; a wraparound windscreen, a roof in a second colour and no pillar between the side
  // windows; a chrome spear down each flank that opens into a ribbed silver flash over the back wheel; fins with
  // the tail lamps in their chrome feet, whitewalls and full hubcaps. It sits still
  hardtop: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36, S = w * 0.97 / 2;
    const paint = lambert(car.color), roofPaint = lambert(0xf1ead2), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const silver = lambert(0xb9bdc2), rib = lambert(0x8d9298), gold = lambert(0xd4a531);
    const body = curved(group, paint, w * 0.97, rounded([[-L + 0.04, 0.42], [L - 0.04, 0.42], [L - 0.04, 0.8], [L * 0.9, 0.82], [L * 0.3, 0.86], [-L * 0.62, 0.86], [-L + 0.04, 0.84]], 0.04), 0.04); // (the bevel adds its 4 cm all round)
    prism(group, glass, w * 0.86, [[L * 0.31, 0.86], [L * 0.28, 0.9], [L * 0.07, 1.42], [-L * 0.42, 1.44], [-L * 0.62, 0.9], [-L * 0.62, 0.86]]); // the glasshouse
    curved(group, roofPaint, w * 0.88, rounded([[L * 0.09 - 0.05, 1.46], [-L * 0.45 + 0.05, 1.46], [-L * 0.45 + 0.05, 1.47, 0.005], [L * 0.09 - 0.05, 1.47, 0.005]], 0.005), 0.05); // the roof
    const gx = w * 0.43;
    for (const side of [-1, 1]) {
      const x = side * gx;
      prism(group, chrome, 0.04, [[L * 0.3, 0.88], [L * 0.26, 0.88], [L * 0.05, 1.425], [L * 0.09, 1.425]], x - side * 0.01); // the windscreen's chrome pillars,
      prism(group, roofPaint, 0.05, [[-L * 0.3, 1.425], [-L * 0.45, 1.425], [-L * 0.6, 0.88], [-L * 0.46, 0.88]], x); // the broad back pillars, in the roof's colour,
      box(group, chrome, 0.025, 0.5, 0.02, x, 1.15, -L * 0.1);                               // and only a chrome edge between the side windows
      // the lamps: round, under chrome hoods at the wings' tips
      disc(group, chrome, 0.125, 0.03, side * w * 0.4, 0.72, L + 0.005);
      disc(group, LAMP, 0.1, 0.04, side * w * 0.4, 0.72, L + 0.02);
      blob(group, paint, 0.15, 0.06, 0.16, side * w * 0.4, 0.84, L - 0.06);              // and their hoods
      blob(group, chrome, 0.035, 0.04, 0.2, side * w * 0.2, 0.895, L * 0.72);               // the rockets on the bonnet
      blob(group, chrome, 0.07, 0.07, 0.1, side * w * 0.3, 0.5, L + 0.1);                   // the bullets in the bumper
      disc(group, AMBER, 0.04, 0.03, side * w * 0.4, 0.42, L + 0.135);                      // the parking lamps under the bumper's face
      box(group, chrome, 0.06, 0.12, 0.3, side * (S + 0.03), 0.42, L - 0.06);              // the bumpers' wrapped ends
      box(group, chrome, 0.06, 0.14, 0.3, side * (S + 0.03), 0.44, -L + 0.06);
      // the wheels: whitewalls with full hubcaps, in arches
      for (const z of [L * 0.52, -L * 0.65]) {
        whitewall(group, R, 0.22, side * (S + 0.018 - 0.11), R, z, chrome);
        arch(group, trim, R + (z > 0 ? 0.07 : 0.03), 0.008, side * (S - 0.002), 0.385, z); // (the back one lower, under the flash)
      }
      // the flank: a chrome spear from the front wing to the door, opening into a ribbed silver flash to the fin
      const fx = side * (S + 0.006);
      box(group, chrome, 0.012, 0.025, L * 0.92, fx, 0.745, L * 0.38);
      prism(group, silver, 0.01, [[-L * 0.08, 0.745], [-L * 0.98, 0.845], [-L * 0.98, 0.795]], fx);
      const top = Math.atan2(0.1, L * 0.9), under = Math.atan2(0.05, L * 0.9);
      slab(group, chrome, 0.02, 0.02, L * 0.91, fx, 0.795, -L * 0.53, top);
      slab(group, chrome, 0.02, 0.02, L * 0.91, fx, 0.77, -L * 0.53, under);
      for (const f of [0.25, 0.5, 0.75]) { const s = 0.05 + 0.05 * f; slab(group, rib, 0.016, 0.01, L * 0.81, fx, 0.745 + s * 0.55, -L * 0.575, Math.atan2(s, L * 0.9)); } // its ribs
      box(group, chrome, 0.05, 0.025, 0.14, side * (S + 0.012), 0.82, -L * 0.05);           // the door handle
      // the fins, with the tail lamps in their chrome feet
      prism(group, paint, 0.1, [[-L * 0.3, 0.86], [-L - 0.02, 0.86], [-L - 0.02, 1.03], [-L * 0.96, 1.04], [-L * 0.36, 0.92]], side * (S - 0.055));
      slab(group, chrome, 0.03, 0.02, L * 0.6, side * (S - 0.055), 0.983, -L * 0.66, Math.atan2(0.12, L * 0.6));
      box(group, chrome, 0.14, 0.2, 0.05, side * (S - 0.07), 0.86, -L - 0.02);
      disc(group, TAIL, 0.055, 0.03, side * (S - 0.07), 0.86, -L - 0.05);
      disc(group, LAMP, 0.04, 0.03, side * w * 0.2, 0.44, -L - 0.125);                      // the reversing lamps in the bumper,
      disc(group, trim, 0.04, 0.03, side * w * 0.33, 0.44, -L - 0.125);                     // and the pipes out through it
      box(group, TAIL, 0.1, 0.05, 0.03, side * w * 0.33, 0.7, -L - 0.01);                   // a second pair of tail lamps under the boot
    }
    box(group, trim, 1.0, 0.2, 0.04, 0, 0.56, L + 0.01);                                   // the grille,
    box(group, chrome, w * 0.92, 0.04, 0.03, 0, 0.62, L + 0.035);                          // the bar across it,
    box(group, gold, 0.12, 0.06, 0.02, 0, 0.62, L + 0.055);                                // its badge
    box(group, chrome, w * 0.98, 0.12, 0.14, 0, 0.42, L + 0.06);                           // the heavy bumper,
    box(group, chrome, w * 0.98, 0.14, 0.14, 0, 0.44, -L - 0.05);                          // the back one,
    box(group, WHITE, 0.32, 0.16, 0.02, 0, 0.58, -L - 0.01);                               // the plate over it
    for (const side of [-1, 1]) slab(group, gold, 0.14, 0.025, 0.02, side * 0.055, 0.78, -L - 0.012, 0).rotation.z = -side * 0.5; // the V on the boot
    box(group, chrome, 0.1, 0.06, 0.04, S + 0.03, 0.97, L * 0.3);           // one mirror, on the driver's door
    tube(group, chrome, 0.01, 0.14, S - 0.004, 0.9, L * 0.3, 'y');
    group.userData = { body, animate: () => {}, livery: (evil) => roofPaint.color.setHex(evil ? 0x18181b : 0xf1ead2) };
    return group;
  },
};
