// ---- the fourth batch of car ideas' models ----------------------------------------------------------
// Ten more vehicles drawn as ideas (ideas.js: IDEA_CARS, the entries after the Scooter and Sidecar): the unusual
// production, retro-future and special-purpose kind, each after a real one and each with a silhouette of its own: a
// jet-age coupe with tail fins and bubble canopies, a 1930s teardrop streamliner with a dorsal fin, a snowcat on four
// pontoon tracks, an amphibious lorry with a boat's prow, an airport pushback tug, a street sweeper with spinning
// brushes, a flatbed under a giant cable drum, a solar racer, a game-drive truck with tiered seats and a tracker's
// chair on the bull bar, and a moon rover on wire wheels. Built as ideaModels.js' are (the same helpers, kept here as
// copies so that the files do not import each other): each builder takes the idea's entry and returns a group, front
// facing local +z, with userData.body (the mesh whose material is the paint, so the livery can be swapped; every part
// in the paint shares that one material), userData.animate (seconds) => void, and sometimes userData.livery
// (evil) => void. ideaModels.js spreads IDEA_MODELS_4 into IDEA_MODELS. State-free: nothing here knows about the game.
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
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), TYRE);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.04, 12), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // axle across the car
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};
// a wheel with a white wall to its tyre
const whitewall = (parent, radius, width, x, y, z, hubMaterial) => {
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, width + 0.02, 16), WHITE);
  wall.rotation.z = Math.PI / 2;
  wall.position.set(x, y, z);
  parent.add(wall);
  return wheel(parent, radius, width, x, y, z, hubMaterial);
};
// a flat panel tipped about the car's width: a windscreen. `pitch` > 0 drops its front edge
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
// a solid whose end view is the polygon `profile` ([x, y] points), `length` long, its middle at z
const hull = (parent, material, profile, length, z = 0) => {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, z - length / 2);
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
// a solid whose side view is the curved THREE.Shape `shape` (x along the car, y up), `w` wide across it with its
// edges rounded off by `round`, its middle at x
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
// a windscreen (or a rear window), as `slab` tips it, made solid: the wedge under the glass filled in
const screen = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = slab(parent, material, w, t, l, x, y, z, pitch);
  const dz = l / 2 * Math.cos(pitch), dy = l / 2 * Math.sin(pitch);
  const front = [z + dz, y - dy], back = [z - dz, y + dy];
  const [high, low] = front[1] > back[1] ? [front, back] : [back, front];
  prism(parent, material, w, [low, high, [high[0], low[1]]], x);
  return mesh;
};
// a round lamp (or anything disc-shaped) facing along the car
const disc = (parent, material, r, depth, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 14), material);
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
// a round bar from the point `a` to the point `b` (each [x, y, z])
const rod = (parent, material, r, a, b) => {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), dir = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
  return mesh;
};
// a cone (or a drum, if the two radii are alike) standing upright
const cone = (parent, material, rTop, rBottom, h, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 16), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a rounded lump (a wing over a wheel, a dome, a bubble): a ball squashed to rx, ry, rz
const BALL = new THREE.SphereGeometry(1, 16, 10);
const blob = (parent, material, rx, ry, rz, x, y, z) => {
  const mesh = new THREE.Mesh(BALL, material);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a mudguard: the top half of a drum lying across the car, its middle at (x, y, z)
const fender = (parent, material, r, width, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14, 1, false, 0, Math.PI), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top],
// its middle at x. A pointed nose, a prow
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a pair of round headlamps (a lamp in a chrome ring) at the front, `k` of the width out from the middle
const headlamps = (parent, w, y, z, r = 0.1, k = 0.34) => {
  for (const side of [-1, 1]) {
    disc(parent, lambert(CHROME), r * 1.25, 0.05, side * w * k, y, z);
    disc(parent, LAMP, r, 0.07, side * w * k, y, z + 0.005);
  }
};
// a pair of red tail lamps at the back
const taillamps = (parent, w, y, z, k = 0.4, size = [0.1, 0.16]) => {
  for (const side of [-1, 1]) box(parent, TAIL, size[0], size[1], 0.04, side * w * k, y, z);
};
// a point `t` (0 to 1) along a quadratic curve from a through b to c (each [z, y]), side on
const bend = (a, b, c, t) => [0, 1].map(i => (1 - t) * (1 - t) * a[i] + 2 * (1 - t) * t * b[i] + t * t * c[i]);
// a beacon (amber by day, flashing when animated): a short drum of a lens on a base
const beacon = (parent, x, y, z, r = 0.09) => {
  box(parent, lambert(TRIM), r * 2.2, 0.05, r * 2.2, x, y, z);
  const lens = new THREE.MeshBasicMaterial({ color: 0xffa31a });
  cone(parent, lens, r * 0.9, r, 0.14, x, y + 0.095, z);
  return lens;
};
const flash = (lens, t, on = 0xffa31a, off = 0x7a4a10) => lens.color.setHex(Math.sin(t * 8) > 0 ? on : off);

export const IDEA_MODELS_4 = {
  // A rocket-fin coupe (a Lincoln Futura, the 1955 dream car): long and low, the nose drawn out to two cones with
  // the lamps in their tips, twin bubble canopies side by side under a chrome spine, tail fins rising from behind
  // the cabin to the tips of the tail, a jet nozzle between them, a chrome spear down the flank and skirts over the
  // back wheels. It sits still
  rocketfin: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = curved(group, paint, w * 0.9, rounded([[-L * 0.98, 0.36], [L * 0.86, 0.36], [L * 0.86, 0.74], [L * 0.3, 0.8], [-L * 0.98, 0.8]], 0.08), 0.05);
    box(group, chrome, 0.07, 0.42, L * 0.9, 0, 0.84, -L * 0.03);                          // the spine between the canopies
    for (const side of [-1, 1]) {
      blob(group, glass, w * 0.24, 0.42, L * 0.44, side * w * 0.21, 0.8, -L * 0.03);       // the twin bubbles
      blob(group, paint, 0.2, 0.19, L * 0.17, side * w * 0.33, 0.6, L * 0.84);             // the nose cones,
      disc(group, chrome, 0.12, 0.04, side * w * 0.33, 0.6, L * 1.0 - 0.02);               // a lamp in each tip
      disc(group, LAMP, 0.08, 0.06, side * w * 0.33, 0.6, L * 1.0);
      prism(group, paint, 0.08, [[-L * 0.3, 0.79], [-L * 0.985, 0.79], [-L * 0.985, 1.32], [-L * 0.5, 0.95]], side * (w * 0.45 - 0.06)); // the tail fins
      box(group, TAIL, 0.06, 0.24, 0.05, side * (w * 0.45 - 0.06), 1.02, -L * 0.985 - 0.02); // tail lamps up the fins
      box(group, chrome, 0.02, 0.04, L * 1.7, side * (w * 0.45 + 0.01), 0.6, -L * 0.05);   // the chrome spear
      box(group, paint, 0.1, 0.3, 0.86, side * (w * 0.45 - 0.01), 0.5, -L * 0.6);          // skirts over the back wheels
      whitewall(group, R, 0.2, side * (w / 2 - 0.1), R, L * 0.6, chrome);
      whitewall(group, R, 0.2, side * (w / 2 - 0.1), R, -L * 0.6, chrome);
      box(group, chrome, 0.08, 0.14, 0.08, side * w * 0.14, 0.44, L * 0.9);               // bumper overriders
    }
    box(group, trim, w * 0.3, 0.14, 0.06, 0, 0.56, L * 0.86 + 0.02);                      // a slot of an intake between the cones,
    for (let i = -2; i <= 2; i++) box(group, chrome, 0.012, 0.12, 0.03, i * w * 0.055, 0.56, L * 0.86 + 0.05); // barred
    box(group, chrome, w * 0.86, 0.07, 0.07, 0, 0.42, L * 0.88);                          // bumpers
    box(group, chrome, w * 0.9, 0.07, 0.07, 0, 0.42, -L * 0.99);
    disc(group, chrome, 0.17, 0.1, 0, 0.6, -L * 0.985 - 0.04);                            // the jet nozzle in the tail,
    disc(group, trim, 0.12, 0.06, 0, 0.6, -L * 0.985 - 0.1);                              // dark inside
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A teardrop streamliner (a Tatra 87): a rounded nose with three headlamps across it, a glasshouse that runs
  // straight back into a long teardrop of a tail, a dorsal fin standing along that tail, louvres for the engine
  // behind, spats over the back wheels, and wings standing clear of the front ones. It sits still
  teardrop: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.32;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const nose = [L * 0.3, 0.95], roof = [-L * 0.4, 1.4], tip = [-L * 0.98, 0.6], bulge = [-L * 0.75, 1.15]; // (side on: the bonnet's end, the roof's end, the tail's tip)
    const shell = new THREE.Shape();
    shell.moveTo(L * 0.95, 0.36);
    shell.quadraticCurveTo(L * 1.0, 0.5, L * 0.9, 0.72);                                   // the rounded nose
    shell.quadraticCurveTo(L * 0.6, 0.9, nose[0], nose[1]);                                // up the bonnet
    shell.lineTo(L * 0.12, 1.42);                                                          // the windscreen
    shell.quadraticCurveTo(-L * 0.15, 1.52, roof[0], roof[1]);                             // the roof
    shell.quadraticCurveTo(bulge[0], bulge[1], tip[0], tip[1]);                            // and the long teardrop tail
    shell.lineTo(tip[0], 0.36);
    const body = curved(group, paint, w * 0.92, shell, 0.06);
    curved(group, glass, w * 0.94, rounded([[L * 0.27, 0.98], [L * 0.1, 1.38], [-L * 0.4, 1.38], [-L * 0.58, 1.08], [-L * 0.58, 0.98]], 0.05), 0.01); // the side glass
    screen(group, glass, w * 0.62, 0.03, 0.5, 0, 1.19 + 0.034, L * 0.21 + 0.03 + 0.036, 0.81);  // the windscreen (stood off the body's surface, which it was inside),
    slab(group, paint, 0.05, 0.05, 0.52, 0, 1.19 + 0.034, L * 0.21 + 0.035 + 0.036, 0.81);                 // split down the middle
    prism(group, paint, 0.06, [[roof[0] + 0.02, roof[1] + 0.02], [-L * 0.6, 1.4], [-L * 0.985, 0.92], [-L * 0.985, 0.62]]); // the dorsal fin
    for (let i = 0; i < 4; i++) {                                                          // louvres across the tail, each side of the fin
      const [z, y] = bend(roof, bulge, tip, 0.5 + i * 0.1);
      for (const side of [-1, 1]) slab(group, trim, w * 0.26, 0.025, 0.08, side * w * 0.18, y + 0.015, z, -0.6);
    }
    for (const side of [-1, 1]) {
      for (const z of [0.18, -0.12]) box(group, paint, 0.08, 0.42, 0.09, side * w * 0.45, 1.17, L * z); // pillars
      box(group, paint, 0.1, 0.36, 0.9, side * (w * 0.46 + 0.03), 0.54, -L * 0.6);        // spats over the back wheels
      fender(group, paint, 0.42, 0.26, side * (w / 2 - 0.12), R, L * 0.62);               // the front wings
      box(group, paint, 0.26, 0.12, L * 0.28, side * (w / 2 - 0.12), 0.42, L * 0.35);     // running back to the doors
      disc(group, chrome, 0.12, 0.05, side * w * 0.3, 0.72, L * 0.92);                    // the outer headlamps
      disc(group, LAMP, 0.09, 0.08, side * w * 0.3, 0.72, L * 0.93);
      box(group, TAIL, 0.08, 0.1, 0.04, side * w * 0.3, 0.6, tip[0] - 0.02);
      wheel(group, R, 0.16, side * (w / 2 - 0.1), R, L * 0.62, chrome);
      wheel(group, R, 0.16, side * (w / 2 - 0.1), R, -L * 0.6, chrome);
    }
    disc(group, chrome, 0.13, 0.05, 0, 0.74, L * 0.96);                                   // the middle headlamp, in the nose
    disc(group, LAMP, 0.1, 0.08, 0, 0.74, L * 0.97);
    box(group, chrome, w * 0.9, 0.06, 0.07, 0, 0.4, L * 0.98);                            // thin bumpers
    box(group, chrome, w * 0.86, 0.06, 0.07, 0, 0.4, tip[0] - 0.02);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A snowcat (a Tucker Sno-Cat): a tall cab with glass all round over a stubby bonnet, a body behind it, the whole
  // thing carried on four pontoons of rubber track with steel cleats, each on its own outrigger, an exhaust stack
  // and a spotlight on the roof. Its beacon flashes
  snocat: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), rubber = lambert(0x1c1c1e), steel = lambert(0x9aa0a8);
    box(group, trim, w * 0.5, 0.34, L * 1.5, 0, 0.72, 0);                                 // the chassis
    const body = box(group, paint, w * 0.78, 0.44, L * 1.56, 0, 1.1, -L * 0.02);          // the body: a long box,
    box(group, paint, w * 0.72, 0.36, L * 0.4, 0, 1.5, L * 0.56);                         // a stubby bonnet,
    box(group, glass, w * 0.76, 0.72, L * 0.9, 0, 1.68, -L * 0.1);                        // and a cab of glass all round
    box(group, paint, w * 0.8, 0.08, L * 0.96, 0, 2.08, -L * 0.1);                        // under a flat roof
    box(group, paint, w * 0.6, 0.3, L * 0.36, 0, 1.47, -L * 0.72);                        // the engine box behind the cab
    for (const z of [0.34, 0.0, -0.54]) for (const side of [-1, 1]) box(group, paint, 0.08, 0.72, 0.1, side * w * 0.37, 1.68, L * z); // pillars
    for (const side of [-1, 1]) {
      disc(group, chrome, 0.11, 0.04, side * w * 0.24, 1.5, L * 0.76 + 0.01);             // lamps in the bonnet
      disc(group, LAMP, 0.085, 0.06, side * w * 0.24, 1.5, L * 0.76 + 0.02);
      box(group, TAIL, 0.1, 0.12, 0.04, side * w * 0.3, 1.1, -L * 0.8 - 0.02);
      box(group, trim, 0.1, 0.1, 0.12, side * (w * 0.38 + 0.06), 1.7, L * 0.3);           // mirrors
      box(group, trim, 0.2, 0.04, 0.4, side * (w * 0.39 + 0.1), 0.84, L * 0.25);          // steps up to the doors
      // the four pontoons: a loop of rubber track, cleats across the top and bottom, a wheel at each end
      for (const zc of [L * 0.5, -L * 0.5]) {
        const x = side * (w / 2 - 0.22), half = 0.95;
        curved(group, rubber, 0.42, rounded([[zc - half, 0.1], [zc + half, 0.1], [zc + half + 0.12, 0.32], [zc + half, 0.56], [zc - half, 0.56], [zc - half - 0.12, 0.32]], 0.12), 0.02, x);
        for (let i = -4; i <= 4; i++) for (const y of [0.09, 0.57]) box(group, steel, 0.46, 0.025, 0.06, x, y, zc + i * 0.21);
        for (const dz of [-half, half]) disc(group, steel, 0.17, 0.46, x, 0.33, zc + dz).rotation.set(0, 0, Math.PI / 2); // the end wheels, seen through the track's sides
        tube(group, steel, 0.06, 0.3, x, 0.33, zc, 'x');                                   // (the axle stub, seen between)
        box(group, trim, 0.36, 0.1, 0.16, side * (w * 0.25 + 0.18), 0.62, zc);             // the outrigger to the chassis
        box(group, trim, 0.12, 0.3, 0.12, x, 0.62, zc);                                    // and the post down to the pontoon
      }
    }
    // (the pontoons' tracks sit at z = ±L/2 each, so the pairs are rounded first: see above)
    box(group, trim, w * 0.5, 0.12, 0.04, 0, 1.34, L * 0.76 + 0.01);                      // a grille slot
    box(group, chrome, w * 0.7, 0.08, 0.08, 0, 1.0, L * 0.8);                             // a bumper bar
    tube(group, trim, 0.05, 0.6, w * 0.3, 2.35, -L * 0.55, 'y').userData.prop = 'roof';   // the exhaust stack (a roof item: hidden when a roof prop is chosen)
    box(group, trim, 0.12, 0.06, 0.12, w * 0.3, 2.66, -L * 0.55).userData.prop = 'roof';   // its rain cap
    box(group, trim, 0.14, 0.1, 0.14, -w * 0.22, 2.17, L * 0.24).userData.prop = 'roof';   // the spotlight on the roof,
    disc(group, LAMP, 0.07, 0.06, -w * 0.22, 2.17, L * 0.24 + 0.09).userData.prop = 'roof';
    const lens = beacon(group, 0, 2.12, -L * 0.3);
    group.userData = { body, animate: (t) => flash(lens, t) };
    return group;
  },

  // A duck lorry (a DUKW): a boat's hull with a pointed prow and a flat stern sat on six lorry wheels, an open
  // cab with a windscreen and a bench, an open cargo well behind with canvas bows arched over it, a propeller
  // cowl and a rudder at the stern, and a life ring on the side. Open on purpose. It sits still
  duckwagon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0x8a9096), tan = lambert(0xb59a6a);
    const deck = 1.0, well = -L * 0.2, wellL = L * 1.1;
    // the hull: a narrow boat section between the wheels, flaring out to the deck's full width above them
    const body = hull(group, paint, [[-w * 0.28, 0.3], [w * 0.28, 0.3], [w * 0.3, 0.84], [w * 0.5, 0.84], [w * 0.5, deck], [-w * 0.5, deck], [-w * 0.5, 0.84], [-w * 0.3, 0.84]], L * 1.66, -L * 0.1);
    taper(group, paint, [L * 0.71, w, 0.42, deck], [L * 1.0, w * 0.26, 0.86, deck - 0.02]); // the prow
    box(group, trim, w * 0.92, 0.04, L * 0.32, 0, deck + 0.01, L * 0.6);                   // the open cab's floor,
    box(group, paint, w * 0.96, 0.3, L * 0.14, 0, deck + 0.16, L * 0.82);                  // a scuttle in front of it,
    box(group, trim, w * 0.8, 0.14, 0.06, 0, deck + 0.3, L * 0.78);                        // the dashboard,
    slab(group, glass, w * 0.84, 0.03, 0.6, 0, deck + 0.64, L * 0.72, -0.25);              // a windscreen leaning back
    box(group, tan, w * 0.8, 0.14, 0.4, 0, deck + 0.22, L * 0.5);                          // the bench,
    box(group, tan, w * 0.8, 0.4, 0.08, 0, deck + 0.45, L * 0.42);                         // and its back
    disc(group, trim, 0.16, 0.03, -w * 0.22, deck + 0.52, L * 0.68).rotation.x = Math.PI / 2 - 0.6; // the wheel
    box(group, trim, w * 0.84, 0.06, wellL, 0, deck + 0.03, well);                         // the well's floor (dark: it is open)
    for (const side of [-1, 1]) {
      box(group, paint, 0.1, 0.34, wellL + 0.1, side * (w / 2 - 0.05), deck + 0.17, well); // the well's side walls
      box(group, tan, 0.3, 0.06, wellL - 0.3, side * (w * 0.33), deck + 0.2, well);        // benches down each side inside
      for (let i = 0; i < 4; i++) {                                                        // the canvas bows: hoops on posts
        const z = well + (i - 1.5) * wellL * 0.26;
        tube(group, steel, 0.025, 0.6, side * (w * 0.46), deck + 0.6, z, 'y');
      }
      box(group, TAIL, 0.1, 0.1, 0.04, side * w * 0.36, deck - 0.2, -L * 0.93 - 0.02);
      disc(group, LAMP, 0.08, 0.05, side * w * 0.3, 0.84, L * 0.96);                      // lamps in the prow
      for (const z of [L * 0.62, -L * 0.32, -L * 0.66]) {                                 // six wheels under the deck's flare
        wheel(group, R, 0.32, side * (w / 2 - 0.2), R, z);
        fender(group, paint, 0.5, 0.36, side * (w / 2 - 0.2), R, z);
      }
    }
    for (let i = 0; i < 4; i++) tube(group, steel, 0.025, w * 0.92, 0, deck + 0.9, well + (i - 1.5) * wellL * 0.26, 'x'); // the hoops across
    box(group, paint, w * 0.96, 0.3, 0.1, 0, deck + 0.15, -L * 0.93 + 0.04);              // the stern's transom wall,
    box(group, paint, w * 0.96, 0.3, 0.1, 0, deck + 0.15, well + wellL / 2 + 0.05);       // and the bulkhead behind the cab
    disc(group, trim, 0.2, 0.1, w * 0.1, 0.55, -L * 0.93 - 0.06);                         // the propeller's cowl,
    box(group, steel, 0.06, 0.36, 0.08, -w * 0.12, 0.6, -L * 0.93 - 0.08);                // and the rudder beside it
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 18), WHITE);        // a life ring on the side
    ring.rotation.y = Math.PI / 2;
    ring.position.set(-w / 2 - 0.05, deck + 0.17, well - 0.2);
    group.add(ring);
    for (const k of [0, 1, 2, 3]) {                                                         // its red quarters
      const q = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.052, 8, 18, Math.PI / 4), lambert(0xd8262b));
      q.rotation.y = Math.PI / 2; q.rotation.x = k * Math.PI / 2 + Math.PI / 8;
      q.position.copy(ring.position);
      group.add(q);
    }
    box(group, trim, w * 0.7, 0.1, 0.08, 0, 0.5, L * 1.0 - 0.1);                           // a bumper under the prow
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A pushback tug (a Douglas Tugmaster): a low, wide slab of a deck on four fat wheels, nearly all counterweight,
  // a small glass cab perched at the back under a beacon, a tow bar hanging off the nose with a coupling and a
  // castor under it, and black-and-yellow chevrons across the nose. Its beacon flashes
  pushbacktug: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42, top = 1.06;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0x9aa0a8), yellow = lambert(0xf2c418);
    box(group, trim, w * 0.5, 0.5, L * 1.6, 0, 0.56, -L * 0.1);                           // the chassis between the wheels
    const body = box(group, paint, w, 0.2, L * 1.62, 0, top - 0.1, -L * 0.09);            // the deck: a slab over everything
    box(group, paint, w * 0.94, 0.56, L * 0.22, 0, 0.58, L * 0.6);                        // the counterweight nose below it
    for (let i = -3; i <= 3; i++) box(group, i % 2 ? yellow : trim, w * 0.13, 0.4, 0.03, i * w * 0.13, 0.58, L * 0.71 + 0.01).rotation.z = 0.45; // chevrons across it
    box(group, trim, w * 0.94, 0.08, 0.04, 0, 0.84, L * 0.71 + 0.03);                     // a black band above them
    // the cab, perched at the back
    box(group, paint, w * 0.64, 0.22, L * 0.52, 0, top + 0.11, -L * 0.58);
    box(group, glass, w * 0.62, 0.7, L * 0.5, 0, top + 0.57, -L * 0.58);
    box(group, paint, w * 0.68, 0.08, L * 0.56, 0, top + 0.96, -L * 0.58);
    for (const side of [-1, 1]) {
      for (const z of [-0.34, -0.82]) box(group, paint, 0.08, 0.7, 0.1, side * w * 0.3, top + 0.57, L * z); // the cab's pillars
      box(group, trim, 0.1, 0.1, 0.12, side * (w * 0.32 + 0.06), top + 0.6, -L * 0.4);   // mirrors
      box(group, LAMP, 0.16, 0.1, 0.04, side * w * 0.38, 0.92, L * 0.9 + 0.02);           // lamps on the nose
      box(group, TAIL, 0.14, 0.1, 0.04, side * w * 0.4, 0.92, -L * 0.9 - 0.02);
      box(group, trim, 0.06, 0.12, 0.06, side * w * 0.22, top + 0.14, -L * 0.9);          // the rear hitch's pins
      wheel(group, R, 0.42, side * (w / 2 - 0.25), R, L * 0.42, steel);                   // fat wheels under the slab
      wheel(group, R, 0.42, side * (w / 2 - 0.25), R, -L * 0.5, steel);
    }
    box(group, trim, w * 0.9, 0.12, L * 0.1, 0, 0.36, L * 0.9);                           // a bumper lip under the nose
    tube(group, steel, 0.05, L * 0.3, 0, 0.5, L * 0.86, 'z');                             // the tow bar, off the nose
    box(group, steel, 0.3, 0.14, 0.14, 0, 0.5, L * 0.99);                                 // its coupling head
    box(group, steel, 0.12, 0.3, 0.06, 0, 0.34, L * 0.9);                                 // and the castor's leg,
    wheel(group, 0.12, 0.1, 0, 0.12, L * 0.9);                                             // its little wheel
    box(group, trim, 0.06, 0.4, 0.06, w * 0.2, top + 1.2, -L * 0.72);                     // a mast for the beacon
    const lens = beacon(group, w * 0.2, top + 1.4, -L * 0.72);
    group.userData = { body, animate: (t) => flash(lens, t) };
    return group;
  },

  // A street sweeper (a Johnston compact): a stubby cab-forward cab with glass right round, a round-shouldered
  // hopper behind it with a water tank, two brushes on arms out in front under the cab, a suction hose, a beacon
  // and a flue. Its brushes spin
  roadsweeper: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), steel = lambert(0x9aa0a8), bristle = lambert(0x6b4f2a);
    box(group, trim, w * 0.6, 0.3, L * 1.7, 0, 0.5, 0);                                   // the chassis
    // the cab, forward: a base, glass right round, a white roof
    const body = box(group, paint, w * 0.96, 0.48, L * 0.72, 0, 0.88, L * 0.54);
    box(group, glass, w * 0.94, 0.78, L * 0.7, 0, 1.5, L * 0.54);
    box(group, WHITE, w * 0.98, 0.08, L * 0.76, 0, 1.92, L * 0.54);
    for (const side of [-1, 1]) {
      for (const z of [0.86, 0.54, 0.22]) box(group, paint, 0.08, 0.78, 0.1, side * w * 0.45, 1.5, L * z); // pillars
      box(group, trim, 0.1, 0.1, 0.12, side * (w / 2 + 0.06), 1.5, L * 0.72);             // mirrors
      box(group, LAMP, 0.18, 0.12, 0.04, side * w * 0.34, 0.9, L * 0.9 + 0.02);           // lamps
      box(group, AMBER, 0.08, 0.12, 0.04, side * w * 0.46, 0.9, L * 0.9 + 0.02);
      box(group, TAIL, 0.1, 0.16, 0.04, side * w * 0.38, 0.9, -L * 0.98 - 0.02);
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, L * 0.5);
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, -L * 0.52);
    }
    box(group, trim, w * 0.6, 0.12, 0.04, 0, 0.72, L * 0.9 + 0.02);                       // the grille
    box(group, trim, w, 0.14, 0.12, 0, 0.56, L * 0.92);                                   // bumpers
    box(group, trim, w, 0.14, 0.12, 0, 0.56, -L * 0.96);
    // the hopper behind the cab: a box with rounded shoulders, a tank on each side under it
    box(group, paint, w * 0.9, 0.9, L * 0.78, 0, 1.25, -L * 0.52);
    tube(group, paint, w * 0.2, L * 0.78, -w * 0.25, 1.7, -L * 0.52, 'z');
    tube(group, paint, w * 0.2, L * 0.78, w * 0.25, 1.7, -L * 0.52, 'z');
    box(group, paint, w * 0.5, 0.4, L * 0.78, 0, 1.7, -L * 0.52);                         // (the flat between the shoulders)
    box(group, steel, w * 0.94, 0.12, L * 0.3, 0, 1.68, -L * 0.52);                       // a band round the middle
    tube(group, trim, 0.06, 0.5, 0, 2.08, -L * 0.3, 'y');                                  // a flue from the top,
    box(group, trim, w * 0.46, 0.2, 0.08, 0, 1.4, -L * 0.98 - 0.02);                       // the rear door's handle bar
    tube(group, steel, 0.2, 0.9, 0, 0.98, -L * 0.14, 'x');                                 // the water tank, a drum across
    rod(group, trim, 0.07, [-w * 0.3, 0.9, L * 0.16], [-w * 0.42, 0.25, L * 0.72]);        // the suction hose, down to the kerb brush
    // the brushes: a disc of bristles on an arm each, out in front, spinning
    const brushes = [];
    for (const side of [-1, 1]) {
      const brush = new THREE.Group();
      brush.position.set(side * (w / 2 + 0.08), 0.12, L * 0.78);
      group.add(brush);
      cone(brush, trim, 0.14, 0.14, 0.1, 0, 0.06, 0);
      for (let i = 0; i < 16; i++) {                                                        // the bristles, radiating
        const a = i * Math.PI / 8;
        box(brush, bristle, 0.05, 0.05, 0.3, Math.sin(a) * 0.17, 0, Math.cos(a) * 0.17).rotation.y = a;
      }
      brushes.push(brush);
      rod(group, steel, 0.03, [side * w * 0.3, 0.62, L * 0.6], [side * (w / 2 + 0.08), 0.22, L * 0.78]); // its arm
    }
    const lens = beacon(group, w * 0.3, 1.97, L * 0.4);
    group.userData = { body, animate: (t) => { brushes.forEach((b, i) => { b.rotation.y = (i ? -1 : 1) * t * 6; }); flash(lens, t); } };
    return group;
  },

  // A cable drum lorry (a Scania flatbed with a cable drum): a cab-over cab with a deep windscreen, a long flatbed
  // behind it with a headboard, and on the bed a giant wooden drum wound with black cable, its axle through two
  // A-frames and chocks under its rims. It sits still
  cabledrum: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.45, bed = 1.06;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), steel = lambert(0x9aa0a8);
    const wood = lambert(0xb98a4a), cable = lambert(0x1b1b1d), plank = lambert(0x8a6a3a);
    box(group, trim, w * 0.6, 0.3, L * 1.9, 0, 0.7, 0);                                   // the chassis
    // the cab: over the front wheels, a base, a deep windscreen and side glass, a roof, a sun visor
    const body = box(group, paint, w * 0.96, 0.5, L * 0.3, 0, 1.2, L * 0.84);
    box(group, glass, w * 0.94, 0.76, L * 0.28, 0, 1.83, L * 0.84);
    box(group, paint, w * 0.98, 0.08, L * 0.32, 0, 2.25, L * 0.84);
    box(group, paint, w * 0.98, 0.1, 0.2, 0, 2.16, L * 0.98 + 0.06);                      // the visor
    for (const side of [-1, 1]) {
      for (const z of [0.98, 0.7]) box(group, paint, 0.1, 0.76, 0.1, side * w * 0.45, 1.83, L * z); // pillars
      box(group, trim, 0.08, 0.3, 0.1, side * (w / 2 + 0.1), 1.9, L * 0.9);               // mirrors on arms
      box(group, trim, 0.04, 0.04, 0.2, side * (w / 2 + 0.04), 1.9, L * 0.9);
      box(group, LAMP, 0.22, 0.12, 0.04, side * w * 0.34, 1.1, L * 0.99 + 0.02);          // lamps
      box(group, TAIL, 0.1, 0.18, 0.04, side * w * 0.42, 0.9, -L * 0.99 - 0.02);
      fender(group, paint, 0.52, 0.4, side * (w / 2 - 0.2), R, L * 0.7);                  // wings over the front wheels
      wheel(group, R, 0.34, side * (w / 2 - 0.2), R, L * 0.7, chrome);
      wheel(group, R, 0.34, side * (w / 2 - 0.2), R, -L * 0.42);                          // two back axles
      wheel(group, R, 0.34, side * (w / 2 - 0.2), R, -L * 0.7);
      box(group, paint, 0.04, 0.2, L * 1.44, side * (w / 2 - 0.02), bed + 0.1, -L * 0.26); // the bed's drop sides
      // the drum's A-frames and chocks
      box(group, steel, 0.1, 1.2, 0.1, side * 0.74, bed + 0.6, -L * 0.2);
      prism(group, trim, 0.3, [[-L * 0.2 - 0.9, bed], [-L * 0.2 - 0.3, bed], [-L * 0.2 - 0.5, bed + 0.3]], side * 0.5);
      prism(group, trim, 0.3, [[-L * 0.2 + 0.3, bed], [-L * 0.2 + 0.9, bed], [-L * 0.2 + 0.5, bed + 0.3]], side * 0.5);
    }
    for (let i = -2; i <= 2; i++) box(group, trim, 0.4, 0.08, 0.03, i * w * 0.17, 1.02, L * 0.99 + 0.02); // grille slots
    box(group, trim, w, 0.2, 0.16, 0, 0.78, L * 0.98);                                    // bumpers
    box(group, trim, w * 0.9, 0.12, 0.12, 0, 0.78, -L * 0.98);
    box(group, plank, w, 0.14, L * 1.46, 0, bed - 0.07, -L * 0.26);                       // the bed: planked
    for (let i = -3; i <= 3; i++) box(group, trim, 0.03, 0.01, L * 1.46, i * w * 0.14, bed + 0.003, -L * 0.26); // the gaps between planks
    box(group, paint, w * 0.96, 0.7, 0.06, 0, bed + 0.35, L * 0.47);                      // the headboard
    for (const x of [-0.3, 0, 0.3]) box(group, trim, 0.04, 0.7, 0.02, x * w, bed + 0.35, L * 0.47 + 0.04); // its bars
    // the drum: two wooden flanges, a core wound in black cable, the axle through
    const DR = 1.15, dz = -L * 0.2, dy = bed + DR;
    for (const side of [-1, 1]) {
      tube(group, wood, DR, 0.12, side * 0.64, dy, dz, 'x');
      for (let i = 0; i < 4; i++) box(group, plank, 0.03, 0.14, DR * 1.9, side * 0.71, dy, dz).rotation.x = i * Math.PI / 4; // the flange's boards
    }
    tube(group, cable, DR * 0.84, 1.16, 0, dy, dz, 'x');
    for (let i = -2; i <= 2; i++) tube(group, lambert(0x2c2c30), DR * 0.86, 0.1, i * 0.23, dy, dz, 'x'); // the turns of cable, ridged
    tube(group, steel, 0.08, 1.8, 0, dy, dz, 'x');                                        // the axle
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A solar racer (a World Solar Challenge car): a wide, flat wafer of a body covered in a grid of dark solar
  // cells, a bubble of a canopy over the driver on one side, four narrow wheels in bumps of fairings, and nothing
  // else at all. It sits still
  solarracer: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.26;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), cells = lambert(0x1a2a5a), grid = lambert(0x9fb0d0);
    const body = prism(group, paint, w * 0.96, [[L * 1.0, 0.32], [L * 0.72, 0.2], [-L * 0.8, 0.21], [-L * 1.0, 0.3], [-L * 0.8, 0.46], [L * 0.6, 0.46], [L * 0.92, 0.42]]);
    box(group, cells, w * 0.88, 0.03, L * 1.46, 0, 0.47, -L * 0.1);                        // the panel of cells
    for (let i = -4; i <= 4; i++) box(group, grid, 0.012, 0.014, L * 1.46, i * w * 0.1, 0.49, -L * 0.1); // its grid lines,
    for (let i = -6; i <= 6; i++) box(group, grid, w * 0.88, 0.014, 0.012, 0, 0.49, -L * 0.1 + i * L * 0.11);
    blob(group, glass, 0.3, 0.3, 0.6, -w * 0.16, 0.48, L * 0.1);                           // the canopy, to one side
    box(group, trim, w * 0.3, 0.04, 0.03, 0, 0.3, L * 1.0 - 0.01);                        // a slot of a nose intake
    box(group, TAIL, w * 0.5, 0.03, 0.03, 0, 0.3, -L * 1.0 - 0.005);                       // a strip of a tail lamp
    for (const side of [-1, 1]) {
      box(group, WHITE, 0.01, 0.1, 0.3, side * (w * 0.48 + 0.002), 0.33, L * 0.3);          // a number panel on the flank
      box(group, trim, 0.012, 0.07, 0.03, side * (w * 0.48 + 0.004), 0.33, L * 0.3 + 0.04);
      box(group, trim, 0.012, 0.07, 0.03, side * (w * 0.48 + 0.004), 0.33, L * 0.3 - 0.04);
      for (const z of [L * 0.55, -L * 0.55]) {
        fender(group, paint, 0.3, 0.22, side * w * 0.3, R, z);                             // the fairing: a bump over the wheel
        wheel(group, R, 0.1, side * w * 0.3, R, z);
      }
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A game-drive truck (a Land Cruiser 79 game viewer): a bonneted cab with no doors and no roof, three rows of
  // bench seats rising towards the tail under a canvas canopy on posts, a tracker's chair out on the bull bar, a
  // spare on the tail, a snorkel up the windscreen pillar and jerry cans on the side. Open on purpose. It sits still
  gameviewer: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.38, tub = 1.3;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), tan = lambert(0xb59a6a), canvas = lambert(0x6b6a48), olive = lambert(0x4b5a2a);
    box(group, trim, w * 0.6, 0.3, L * 1.9, 0, 0.5, 0);                                   // the chassis
    const body = box(group, paint, w * 0.96, 0.52, L * 1.4, 0, 1.04, -L * 0.25);          // the tub
    box(group, paint, w * 0.9, 0.42, L * 0.5, 0, 0.99, L * 0.72);                         // the bonnet
    box(group, paint, w * 0.96, 0.3, L * 0.12, 0, 1.45, L * 0.42);                        // the scuttle
    box(group, trim, w * 0.8, 0.1, 0.3, 0, 1.4, L * 0.32);                                // the dashboard
    slab(group, glass, w * 0.84, 0.04, 0.5, 0, 1.86, L * 0.38, -1.42);                     // the windscreen, nearly upright
    for (const side of [-1, 1]) {
      box(group, paint, 0.06, 0.52, 0.06, side * w * 0.44, 1.86, L * 0.38);               // its frame
      box(group, trim, 0.08, 0.08, 0.1, side * (w / 2 + 0.05), 1.7, L * 0.38);            // mirrors
      fender(group, paint, 0.45, 0.3, side * (w / 2 - 0.12), R, L * 0.62);                // wings
      wheel(group, R, 0.24, side * (w / 2 - 0.12), R, L * 0.62);
      wheel(group, R, 0.24, side * (w / 2 - 0.12), R, -L * 0.55);
      disc(group, chrome, 0.12, 0.04, side * w * 0.3, 1.0, L * 0.97 + 0.01);              // lamps
      disc(group, LAMP, 0.09, 0.06, side * w * 0.3, 1.0, L * 0.97 + 0.02);
      box(group, TAIL, 0.1, 0.14, 0.04, side * w * 0.42, 1.0, -L * 0.95 - 0.02);
      for (const z of [L * 0.4, -L * 0.92]) tube(group, trim, 0.03, 1.1, side * w * 0.45, tub + 0.5, z, 'y'); // the canopy's posts
      box(group, olive, 0.1, 0.4, 0.3, side * (w / 2 + 0.05), 1.1, -L * 0.1);              // jerry cans on the sides
      box(group, trim, 0.12, 0.04, 0.34, side * (w / 2 + 0.05), 1.31, -L * 0.1);
    }
    box(group, trim, w * 0.5, 0.14, 0.04, 0, 1.02, L * 0.97 + 0.01);                       // the grille
    for (let i = -2; i <= 2; i++) box(group, chrome, 0.015, 0.12, 0.03, i * 0.08, 1.02, L * 0.97 + 0.03);
    box(group, trim, w * 0.9, 0.12, 0.12, 0, 0.62, L * 0.96);                             // the bumper,
    for (const x of [-0.5, 0.5]) tube(group, trim, 0.035, 0.6, x * w * 0.66, 0.9, L * 0.99, 'y'); // and the bull bar's uprights
    tube(group, trim, 0.035, w * 0.7, 0, 1.2, L * 0.99, 'x');
    // the tracker's chair, out on the bull bar
    box(group, trim, 0.44, 0.08, 0.36, -w * 0.22, 0.92, L * 0.98);
    box(group, tan, 0.4, 0.06, 0.34, -w * 0.22, 0.99, L * 0.98);
    box(group, tan, 0.4, 0.36, 0.06, -w * 0.22, 1.2, L * 0.98 - 0.17);
    box(group, trim, 0.4, 0.03, 0.14, -w * 0.22, 0.66, L * 0.98 + 0.1);                    // its footrest
    // three rows of benches, each higher than the one before, and the driver's bench
    box(group, tan, w * 0.8, 0.12, 0.44, 0, tub + 0.1, L * 0.14);
    box(group, tan, w * 0.8, 0.36, 0.06, 0, tub + 0.3, L * 0.14 - 0.22);
    for (let i = 0; i < 3; i++) {
      const z = -L * (0.2 + i * 0.3), h = 0.2 + i * 0.2;
      box(group, paint, w * 0.84, h, 0.5, 0, tub - 0.02 + h / 2, z);                       // the riser
      box(group, tan, w * 0.84, 0.12, 0.5, 0, tub + h + 0.04, z);                           // the seat
      box(group, tan, w * 0.84, 0.42, 0.06, 0, tub + h + 0.3, z - 0.25);                   // its back
    }
    box(group, canvas, w * 1.02, 0.06, L * 1.4, 0, tub + 1.06, -L * 0.26);                 // the canopy
    tube(group, trim, 0.045, 1.0, w * 0.46, 1.6, L * 0.44, 'y');                           // the snorkel up the pillar,
    box(group, trim, 0.14, 0.16, 0.16, w * 0.46, 2.14, L * 0.44);                          // its head
    disc(group, TYRE, R, 0.22, w * 0.18, 1.1, -L * 0.95 - 0.12);                            // the spare on the tail
    disc(group, STEEL, R * 0.55, 0.26, w * 0.18, 1.1, -L * 0.95 - 0.12);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A moon rover (the Apollo Lunar Roving Vehicle): an open frame of a chassis with two bucket seats, a console
  // with a T-handle between them, wire-mesh wheels under wide fenders, a dish antenna on a mast, a TV camera on
  // another and the gold-foil boxes of its gear on the tail. Open on purpose. Its dish turns to and fro
  moonrover: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.4;
    const paint = lambert(car.color), trim = lambert(TRIM), steel = lambert(0xb9bec4), mesh = lambert(0x8e9298), gold = lambert(0xd9a21c), seat = lambert(0xd8d2c0);
    const body = box(group, paint, w * 0.62, 0.05, L * 1.3, 0, 0.5, L * 0.05);            // the floor
    for (const side of [-1, 1]) {
      tube(group, steel, 0.035, L * 1.9, side * w * 0.33, 0.53, 0, 'z');                   // the chassis rails
      for (const z of [L * 0.62, -L * 0.62]) {
        // a wire-mesh wheel: a grey mesh tyre with a darker ring inside and a bright hub
        const [tyre] = wheel(group, R, 0.22, side * (w / 2 - 0.14), R, z, gold);
        tyre.material = mesh;
        tube(group, trim, R * 0.78, 0.26, side * (w / 2 - 0.14), R, z, 'x');
        box(group, paint, 0.3, 0.03, 0.8, side * (w / 2 - 0.14), R + 0.48, z);            // a flat fender over it
        box(group, paint, 0.3, 0.2, 0.03, side * (w / 2 - 0.14), R + 0.39, z - 0.4);       // with a flap behind
        rod(group, steel, 0.025, [side * w * 0.33, 0.53, z], [side * (w / 2 - 0.14), R, z]); // its suspension arm
      }
      // a bucket seat: a pan, a back of webbing, on a frame
      box(group, seat, 0.44, 0.06, 0.46, side * 0.3, 0.72, -L * 0.05);
      box(group, seat, 0.44, 0.5, 0.05, side * 0.3, 0.98, -L * 0.05 - 0.24);
      for (const dz of [-0.2, 0.2]) tube(group, steel, 0.02, 0.2, side * 0.3, 0.62, -L * 0.05 + dz, 'y');
      box(group, gold, 0.28, 0.3, 0.32, side * 0.3, 0.68, -L * 0.7).userData.prop = 'cargo';   // the gear on the tail (a load: hidden when a cargo prop is chosen)
    }
    for (const z of [L * 0.85, -L * 0.85, 0]) tube(group, steel, 0.035, w * 0.66, 0, 0.53, z, 'x'); // the cross members
    box(group, trim, 0.24, 0.3, 0.24, 0, 0.7, L * 0.25);                                   // the console between the seats,
    tube(group, steel, 0.015, 0.2, 0, 0.95, L * 0.25, 'y');                                // its T-handle
    box(group, trim, 0.12, 0.03, 0.03, 0, 1.05, L * 0.25);
    box(group, seat, w * 0.6, 0.16, 0.08, 0, 0.62, L * 0.62);                              // the footrests' panel
    tube(group, steel, 0.025, 0.9, 0, 1.05, L * 0.7, 'y');                                 // the antenna's mast,
    const dish = cone(group, WHITE, 0.4, 0.06, 0.12, 0, 1.56, L * 0.7);                     // the dish on it
    tube(group, steel, 0.01, 0.3, 0, 1.68, L * 0.7, 'y');                                  // its feed
    tube(group, steel, 0.02, 0.5, -w * 0.3, 0.85, L * 0.8, 'y');                           // the camera's mast,
    box(group, WHITE, 0.12, 0.12, 0.22, -w * 0.3, 1.12, L * 0.8);                           // the camera
    box(group, trim, 0.06, 0.06, 0.03, -w * 0.3, 1.12, L * 0.8 + 0.12);
    group.userData = { body, animate: (t) => { dish.rotation.z = Math.sin(t * 0.6) * 0.25; dish.rotation.x = Math.cos(t * 0.4) * 0.2; } };
    return group;
  },
};
