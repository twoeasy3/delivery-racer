// ---- the third batch of car ideas' models ----------------------------------------------------------
// Ten more vehicles drawn as ideas (ideas.js: IDEA_CARS, the ten after the Scooter and Sidecar), each after a real
// one and each an idea no vehicle in the game already has: a monowheel, a bathtub racer, a jet land-speed car, a
// circus cage wagon, a gyro-balanced two-wheeler, a roadable aeroplane with its wings folded, a racing lawn mower,
// a snail-shell camper, a hot-dog car and a swan car. Built as ideaModels.js' are (the same helpers, kept here as
// copies so that the files do not import each other): each builder takes the idea's entry and returns a group,
// front facing local +z, with userData.body (the mesh whose material is the paint, so the livery can be swapped),
// userData.animate (seconds) => void, and sometimes userData.livery (evil) => void. ideaModels.js spreads
// IDEA_MODELS_3 into IDEA_MODELS. State-free: nothing here knows about the game.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const box = (parent, material, w, h, l, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
const TYRE = lambert(0x141414), STEEL = lambert(0xc4c8ce), ALLOY = lambert(0x8a8f96), WHITE = lambert(0xf4f2ec);
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
// a flat panel tipped about the car's width: a windscreen, a fastback. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a solid block whose side view is the polygon `profile` ([z, y] points), `w` wide across the car, its
// middle at x
const prism = (parent, material, w, profile, x = 0) => {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); // (the profile's z along the car; extruded across it)
  geo.translate(x + w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  parent.add(mesh);
  return mesh;
};
// a side view with its corners rounded off: the polygon `points` ([z, y], or [z, y, r] for a corner of its
// own), each corner turned through a curve of about `r`. For `curved`
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
// a solid whose side view is the curved THREE.Shape `shape` (x along the car, y up), `w` wide across it
// with its edges rounded off by `round`, its middle at x
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
  const front = [z + dz, y - dy], back = [z - dz, y + dy]; // (its two edges, side on)
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
// its middle at x. A pointed nose, a snout
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
// a strip of text (a destination blind, a sign), as a material
const lettered = (text, colour, ground, w = 256, h = 64) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colour;
  ctx.font = 'bold ' + Math.round(h * 0.68) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.9);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map });
};
// a bar from the point a to the point b ([x, y, z] each)
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
// a hoop standing across the car (its axle along x): a rim, a tyre, a band of paint round a wheel
const hoop = (parent, material, r, t, x, y, z, thick = 1) => {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 40), material);
  mesh.rotation.y = Math.PI / 2;
  mesh.scale.z = thick; // (the torus's own z: across the car, once turned)
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// a wheel of spokes (a cart's, an old car's): a tyre, a felloe, `n` spokes and a hub, as a group on its axle
const spokedWheel = (parent, R, width, x, y, z, spokes, felloe = spokes, n = 12) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  hoop(g, TYRE, R - 0.035, 0.035, 0, 0, 0, width / 0.07);
  hoop(g, felloe, R - 0.095, 0.03, 0, 0, 0, width / 0.07);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, len = R - 0.12;
    box(g, spokes, width * 0.35, len, 0.035, 0, Math.cos(a) * len / 2, Math.sin(a) * len / 2).rotation.x = a;
  }
  tube(g, spokes, R * 0.17, width + 0.06, 0, 0, 0, 'x');
  return g;
};
const SKIN = lambert(0xe2b38c);
// a figure sat at (x, y, z) facing +z: a body in `coat`, its arms out in front, and a head (userData.head)
const rider = (parent, coat, x, y, z) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  box(g, coat, 0.34, 0.42, 0.22, 0, 0.21, 0);
  for (const s of [-1, 1]) rod(g, coat, 0.045, [s * 0.17, 0.37, 0.02], [s * 0.15, 0.24, 0.27]);
  g.userData.head = blob(g, SKIN, 0.1, 0.12, 0.11, 0, 0.55, 0.01);
  return g;
};
// a tube along `points` (THREE.Vector3s in one upright plane along the car) whose radius is radii[i] at points[i],
// `wide` times as wide across the car as up and down; each ring shaded by shade(i) (its vertex colour)
const sweep = (material, points, radii, wide = 1, shade = () => 1, segments = 18) => {
  const pos = [], col = [], idx = [], across = new THREE.Vector3(1, 0, 0), n = points.length;
  points.forEach((p, i) => {
    const t = points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
    const normal = new THREE.Vector3().crossVectors(t, across).normalize(), c = shade(i);
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * Math.PI * 2;
      const v = p.clone().addScaledVector(normal, Math.cos(a) * radii[i]).addScaledVector(across, Math.sin(a) * radii[i] * wide);
      pos.push(v.x, v.y, v.z);
      col.push(c, c, c);
    }
  });
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < segments; k++) {
    const a = i * segments + k, b = i * segments + (k + 1) % segments, c = a + segments, d = b + segments;
    idx.push(a, b, c, b, d, c);
  }
  for (const ring of [0, n - 1]) { // (each end closed by a fan)
    const centre = pos.length / 3, c = shade(ring), end = points[ring];
    pos.push(end.x, end.y, end.z);
    col.push(c, c, c);
    for (let k = 0; k < segments; k++) {
      const a = ring * segments + k, b = ring * segments + (k + 1) % segments;
      if (ring === 0) idx.push(centre, b, a); else idx.push(centre, a, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
};
// a rectangle with rounded corners, `hx` by `hz` from its middle (for a shape laid flat), drawn onto `path`
const roundRect = (hx, hz, r, path = new THREE.Shape()) => {
  path.moveTo(-hx + r, -hz);
  path.lineTo(hx - r, -hz); path.quadraticCurveTo(hx, -hz, hx, -hz + r);
  path.lineTo(hx, hz - r); path.quadraticCurveTo(hx, hz, hx - r, hz);
  path.lineTo(-hx + r, hz); path.quadraticCurveTo(-hx, hz, -hx, hz - r);
  path.lineTo(-hx, -hz + r); path.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
  return path;
};
// puffs of something (smoke, cut grass) that grow and thin as they drift: made by puffs(), moved by drift()
const puffs = (parent, colour, count, opacity = 0.55) => Array.from({ length: count }, () => {
  const puff = new THREE.Mesh(BALL, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }));
  parent.add(puff);
  return puff;
});
const drift = (list, t, rate, from, along, size, opacity = 0.55) => list.forEach((puff, i) => {
  const p = (t * rate + i / list.length) % 1;
  puff.position.set(from[0] + along[0] * p + Math.sin(i * 2.1 + p * 3) * 0.04, from[1] + along[1] * p, from[2] + along[2] * p);
  puff.scale.setScalar(size[0] + p * size[1]);
  puff.material.opacity = opacity * (1 - p);
});

export const IDEA_MODELS_3 = {
  // A monowheel (the Dynasphere of 1932): the rider sits inside one great wheel, a lattice hoop with a broad
  // tread round it, on a little carriage of seat, engine and handlebars that hangs from rollers running round
  // the inside of its rims. The hoop rolls; the carriage stays upright inside it
  monowheel: (car) => {
    const group = new THREE.Group(), hoopGroup = new THREE.Group();
    const C = 1.0, Rt = 0.93; // (the wheel's middle, and its tread's radius)
    const paint = lambert(car.color), trim = lambert(TRIM), chrome = lambert(CHROME), leather = lambert(0x6b4128), jacket = lambert(0x5a4632);
    hoopGroup.position.set(0, C, 0);
    group.add(hoopGroup);
    // the great wheel: a broad band of tyre, steel inside it, blocks of tread round it, a rim of paint each side
    const band = new THREE.Mesh(new THREE.CylinderGeometry(Rt, Rt, 0.42, 56, 1, true), TYRE);
    band.rotation.z = Math.PI / 2;
    const inside = new THREE.Mesh(new THREE.CylinderGeometry(Rt - 0.025, Rt - 0.025, 0.41, 56, 1, true), new THREE.MeshLambertMaterial({ color: 0x9aa0a8, side: THREE.BackSide }));
    inside.rotation.z = Math.PI / 2;
    hoopGroup.add(band, inside);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      box(hoopGroup, TYRE, 0.4, 0.05, 0.12, 0, Math.cos(a) * (Rt + 0.02), Math.sin(a) * (Rt + 0.02)).rotation.x = a;
    }
    for (const side of [-1, 1]) hoop(hoopGroup, paint, Rt - 0.03, 0.045, side * 0.225, 0, 0);
    for (let i = 0; i < 18; i++) { // (the lattice: braces criss-crossing the inside of the band)
      const a = (i / 18) * Math.PI * 2, b = a + 0.32, r = Rt - 0.07;
      rod(hoopGroup, paint, 0.018, [-0.17, Math.cos(a) * r, Math.sin(a) * r], [0.17, Math.cos(b) * r, Math.sin(b) * r]);
    }
    // the carriage inside it: a pan, the engine under the seat, the seat, the handlebars and the rider
    const body = curved(group, paint, 0.5, rounded([[-0.5, 0.48], [0.5, 0.48], [0.56, 0.72], [0.36, 0.84], [-0.36, 0.84], [-0.56, 0.7]], 0.08), 0.05);
    box(group, ALLOY, 0.3, 0.2, 0.34, 0, 0.98, -0.3);                                    // the engine's block,
    for (let i = 0; i < 4; i++) box(group, ALLOY, 0.36, 0.02, 0.3, 0, 1.1 + i * 0.045, -0.3); // its cooling fins
    tube(group, chrome, 0.03, 0.4, 0.14, 0.92, -0.5, 'z');                               // and its exhaust
    box(group, leather, 0.38, 0.08, 0.34, 0, 0.92, 0.02);                                // the seat,
    box(group, leather, 0.36, 0.3, 0.06, 0, 1.14, -0.15).rotation.x = -0.2;              // its back
    rod(group, chrome, 0.025, [0, 0.86, 0.38], [0, 1.2, 0.32]);                          // the steering column,
    tube(group, chrome, 0.022, 0.5, 0, 1.2, 0.32, 'x');                                  // the bars,
    for (const side of [-1, 1]) tube(group, trim, 0.032, 0.1, side * 0.22, 1.2, 0.32, 'x'); // their grips
    const driver = rider(group, jacket, 0, 0.96, 0.02);
    blob(driver, paint, 0.12, 0.09, 0.13, 0, 0.62, 0.0);                                 // a leather helmet in the paint,
    box(driver, chrome, 0.2, 0.05, 0.04, 0, 0.56, 0.11);                                 // goggles
    disc(group, chrome, 0.1, 0.05, 0, 0.78, 0.6);                                        // a lamp on the carriage's nose,
    disc(group, LAMP, 0.08, 0.05, 0, 0.78, 0.615);
    box(group, TAIL, 0.14, 0.06, 0.04, 0, 0.72, -0.6);                                   // and one on its tail
    // the rollers it hangs from, on struts: two each side, near the top of the wheel's rims
    for (const side of [-1, 1]) for (const z of [-0.14, 0.14]) {
      const y = C + Math.sqrt(0.83 * 0.83 - z * z);
      tube(group, chrome, 0.05, 0.04, side * 0.24, y, z, 'x');
      rod(group, trim, 0.018, [side * 0.24, y, z], [side * 0.22, 0.86, z * 2.4]);
    }
    group.userData = {
      body, planted: [], // (no springs: the carriage hangs from rollers on the hoop's rims, so it lands as one piece: render/carsuspension.js)
      animate: (t) => { hoopGroup.rotation.x = t * 1.6; driver.position.y = 0.96 + Math.abs(Math.sin(t * 3.2)) * 0.012; },
    };
    return group;
  },

  // A bathtub racer (Ed China's motorised bath): a roll-top bath on clawed brass feet, full to the brim, on a
  // low chassis with four little wheels. Its driver sits in the suds in a shower cap with the wheel on a column
  // up through the water; taps at the front, a shower over the back, a towel over the side and a duck afloat
  bathtub: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.22;
    const paint = lambert(car.color), enamel = lambert(0xf6f4ee), brass = lambert(0xd3a84a), chrome = lambert(CHROME), trim = lambert(TRIM);
    const water = lambert(0x8fd3ea), foam = lambert(0xffffff), duck = lambert(0xf6cf1c);
    // the chassis: a frame, a deck of planks on it, bumpers, lamps, wheels in chrome mudguards
    box(group, trim, w * 0.6, 0.1, L * 1.8, 0, 0.32, 0);
    box(group, lambert(0x9a6a3c), w * 0.62, 0.06, L * 1.62, 0, 0.405, 0);
    for (const side of [-1, 1]) {
      for (const z of [L * 0.68, -L * 0.68]) {
        wheel(group, R, 0.15, side * (w / 2 - 0.09), R, z, chrome);
        fender(group, chrome, R + 0.05, 0.19, side * (w / 2 - 0.09), R + 0.02, z);
        tube(group, trim, 0.03, w / 2 - 0.25, side * (w / 4 + 0.05), R, z, 'x');      // (the axle's ends, out to them)
      }
      disc(group, chrome, 0.1, 0.1, side * w * 0.3, 0.5, L * 0.93);                    // round lamps on the chassis' nose,
      disc(group, LAMP, 0.08, 0.1, side * w * 0.3, 0.5, L * 0.935);
      disc(group, TAIL, 0.06, 0.06, side * w * 0.3, 0.4, -L * 0.93);
    }
    box(group, chrome, w * 0.7, 0.07, 0.07, 0, 0.32, L * 0.92);                          // bumper bars
    box(group, chrome, w * 0.7, 0.07, 0.07, 0, 0.32, -L * 0.92);
    box(group, lambert(0xf2d21f), 0.3, 0.1, 0.02, 0, 0.32, -L * 0.92 - 0.045);          // a number plate
    // the bath: a roll-top tub (painted outside), on four clawed feet, with its enamel lip round the water
    const body = curved(group, paint, 1.3, rounded([[-1.1, 0.66], [1.1, 0.66], [1.3, 1.03], [-1.3, 1.03]], 0.3), 0.12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      blob(group, brass, 0.09, 0.07, 0.11, sx * 0.44, 0.52, sz * 0.92);                // the feet,
      blob(group, brass, 0.06, 0.04, 0.08, sx * 0.47, 0.465, sz * 1.0);                // their claws
    }
    const lipShape = roundRect(0.68, 1.47, 0.32);
    lipShape.holes.push(roundRect(0.53, 1.31, 0.26, new THREE.Path()));
    const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 8 });
    lipGeo.rotateX(-Math.PI / 2);
    lipGeo.translate(0, 1.15, 0);
    group.add(new THREE.Mesh(lipGeo, enamel));
    box(group, water, 1.12, 0.2, 2.66, 0, 1.09, 0);                                      // the water, up to the lip
    for (const [x, z, s] of [[0.3, 0.6, 1], [-0.32, 0.9, 0.8], [0.12, -0.2, 0.7], [-0.25, -0.1, 1.1], [0.35, -0.95, 0.8], [-0.1, 0.35, 0.6]]) blob(group, foam, 0.16 * s, 0.05, 0.13 * s, x, 1.2, z); // suds
    // the taps at the front: two pillars with their crossheads (hot and cold) and the spout between
    for (const side of [-1, 1]) {
      tube(group, brass, 0.035, 0.16, side * 0.13, 1.33, 1.38);
      box(group, brass, 0.14, 0.025, 0.025, side * 0.13, 1.42, 1.38);
      box(group, brass, 0.025, 0.025, 0.14, side * 0.13, 1.42, 1.38);
      disc(group, side < 0 ? lambert(0xd8402f) : lambert(0x2f6fd8), 0.03, 0.02, side * 0.13, 1.44, 1.38).rotation.x = 0;
    }
    rod(group, brass, 0.03, [0, 1.27, 1.39], [0, 1.4, 1.36]);
    rod(group, brass, 0.028, [0, 1.4, 1.36], [0, 1.37, 1.2]);
    // the shower: a riser up the back corner, an arm over the bath and a rose on it
    rod(group, chrome, 0.025, [-0.6, 0.44, -1.45], [-0.6, 1.62, -1.45]);
    rod(group, chrome, 0.022, [-0.6, 1.62, -1.45], [-0.36, 1.62, -1.2]);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.06, 16), chrome);
    rose.position.set(-0.34, 1.57, -1.18);
    group.add(rose);
    // the towel over the side: striped, folded over the lip
    const towel = lambert(0xf3efe6), band = lambert(0x2a8aa0);
    box(group, towel, 0.03, 0.4, 0.5, 0.72, 1.06, 0.1);
    box(group, towel, 0.16, 0.035, 0.5, 0.66, 1.275, 0.1);
    for (const y of [0.96, 1.04]) box(group, band, 0.035, 0.04, 0.5, 0.72, y, 0.1);
    // the driver in the suds: bare shoulders, a shower cap, and the wheel on its column up through the water
    const bather = new THREE.Group();
    group.add(bather);
    box(bather, SKIN, 0.4, 0.24, 0.24, 0, 1.24, -0.62);
    blob(bather, SKIN, 0.11, 0.13, 0.12, 0, 1.5, -0.6);
    blob(bather, lambert(0xf4a6c4), 0.135, 0.08, 0.14, 0, 1.6, -0.62);                  // a shower cap,
    for (const side of [-1, 1]) rod(bather, SKIN, 0.045, [side * 0.18, 1.3, -0.58], [side * 0.12, 1.38, -0.32]); // arms to the wheel
    rod(group, chrome, 0.025, [0, 1.15, -0.05], [0, 1.37, -0.27]);
    hoop(group, trim, 0.13, 0.018, 0, 1.4, -0.29).rotation.set(-0.7, 0, 0);
    // and the duck
    const toy = new THREE.Group();
    group.add(toy);
    blob(toy, duck, 0.09, 0.07, 0.12, 0, 0, 0);
    blob(toy, duck, 0.055, 0.055, 0.055, 0, 0.08, 0.07);
    box(toy, lambert(0xf0801c), 0.04, 0.02, 0.05, 0, 0.075, 0.13);
    group.userData = {
      body,
      animate: (t) => {
        toy.position.set(0.3, 1.22 + Math.sin(t * 2.2) * 0.012, -0.95 + Math.sin(t * 0.5) * 0.05);
        toy.rotation.z = Math.sin(t * 1.7) * 0.15;
        bather.rotation.y = Math.sin(t * 0.4) * 0.05;
      },
    };
    group.userData.animate(0);
    return group;
  },

  // A jet land-speed car (ThrustSSC): a needle of a fuselage with the cockpit's bubble on its back, a jet engine
  // as big as a car slung either side of it, a tall swept fin with a tailplane across it and a roundel on it,
  // the rear wheels close together under the tail, and a parachute's pack at the very end. Its jets glow
  jetcar: (car) => {
    const group = new THREE.Group();
    const L = car.hl, R = 0.27;
    const paint = lambert(car.color), accent = lambert(0xf07c1c), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = curved(group, paint, 0.62, rounded([[L * 0.97, 0.66, 0.03], [L * 0.6, 0.5], [L * 0.2, 0.42], [-L * 0.92, 0.44], [-L * 0.97, 0.62], [-L * 0.9, 0.95], [-L * 0.2, 0.98], [L * 0.2, 1.0], [L * 0.6, 0.82]], 0.12), 0.12);
    tube(group, chrome, 0.015, 0.5, 0, 0.66, L * 0.97 + 0.3, 'z');                     // the pitot probe at its point
    blob(group, glass, 0.21, 0.17, 0.55, 0, 1.1, L * 0.14);                              // the cockpit's bubble,
    box(group, paint, 0.44, 0.03, 0.05, 0, 1.24, L * 0.14).rotation.x = 0;               // and its frame across it
    box(group, accent, 0.66, 0.08, L * 1.2, 0, 0.62, -L * 0.18);                         // a stripe down each side
    // the engines: a nacelle each side on a pylon, an intake with its fan in front and a nozzle glowing behind
    const glows = [];
    for (const side of [-1, 1]) {
      const x = side * 0.68, y = 0.7, z0 = L * 0.06, len = 3.0;
      tube(group, paint, 0.3, len, x, y, z0, 'z');
      tube(group, accent, 0.305, 0.2, x, y, z0 + len / 2 - 0.35, 'z');                   // a band of the second colour round it
      hoop(group, chrome, 0.27, 0.04, x, y, z0 + len / 2).rotation.set(0, 0, 0);        // the intake's lip,
      disc(group, trim, 0.26, 0.04, x, y, z0 + len / 2 - 0.02);                          // its throat,
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 12), chrome);
      spinner.rotation.x = Math.PI / 2;
      spinner.position.set(x, y, z0 + len / 2 + 0.05);
      group.add(spinner);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.36, 16), ALLOY);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.set(x, y, z0 - len / 2 - 0.16);
      group.add(nozzle);
      disc(group, new THREE.MeshBasicMaterial({ color: 0xff8a2a }), 0.2, 0.02, x, y, z0 - len / 2 - 0.34);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.7, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.45, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(x, y, z0 - len / 2 - 0.7);
      group.add(glow);
      glows.push(glow);
      box(group, paint, 0.16, 0.18, 1.6, side * 0.36, 0.74, z0);                        // the pylon
      wheel(group, R, 0.14, x, R, L * 0.32);                                              // a front wheel under each,
      box(group, trim, 0.06, 0.12, 0.3, x, 0.42, L * 0.32);                               // on its leg
      wheel(group, R, 0.13, side * 0.37, R, -L * 0.82);                                   // the back pair under the tail,
      fender(group, paint, R + 0.05, 0.16, side * 0.37, R + 0.02, -L * 0.82);            // faired over
      disc(group, LAMP, 0.05, 0.04, side * 0.2, 0.64, L * 0.63);                          // little lamps on the nose
    }
    // the fin, swept, with a roundel on it and the tailplane through it; the parachute's pack at the tail
    const fin = prism(group, paint, 0.08, [[-L * 0.6, 0.95], [-L * 0.95, 0.95], [-L * 0.99, 1.68], [-L * 0.84, 1.68]]);
    fin.userData.fin = true;
    tube(group, WHITE, 0.17, 0.1, 0, 1.3, -L * 0.85, 'x');
    tube(group, accent, 0.1, 0.11, 0, 1.3, -L * 0.85, 'x');
    slab(group, paint, 1.3, 0.05, 0.42, 0, 1.25, -L * 0.9, 0);
    tube(group, lambert(0xb8262b), 0.11, 0.3, 0, 0.72, -L * 0.98, 'z');
    box(group, TAIL, 0.2, 0.06, 0.03, 0, 0.88, -L * 1.0);
    group.userData = {
      body,
      animate: (t) => glows.forEach((glow, i) => { glow.scale.set(1, 0.85 + Math.abs(Math.sin(t * 23 + i * 2)) * 0.3, 1); }),
      livery: (evil) => accent.color.setHex(evil ? 0xd8dce2 : 0xf07c1c),
    };
    return group;
  },

  // A circus cage wagon (a Ringling Bros. wagon of the 1900s): a tall box on sunburst wheels, gilded all over, its
  // sides all bars with a lion pacing behind them, a board along the top, flags at its corners, and up front the
  // driver's box with the ringmaster in his top hat at the wheel
  circuswagon: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), gold = lambert(0xe2b33c), cream = lambert(0xf1e3c0), trim = lambert(TRIM), straw = lambert(0xd9c27a), red = lambert(0xa3202a);
    const zf = L * 0.45, zb = -L * 0.82, mid = (zf + zb) / 2, len = zf - zb, half = 0.9;
    // under it: the perch and the bolsters the axles hang from
    box(group, trim, 0.3, 0.16, L * 1.7, 0, 0.62, -L * 0.1);
    for (const z of [L * 0.62, -L * 0.6]) box(group, trim, w * 0.84, 0.14, 0.24, 0, 0.62, z);
    // the cage: floor, ends, roof, the posts at its corners, the rails top and bottom and the bars between
    const body = box(group, paint, half * 2, 0.22, len, 0, 0.95, mid);
    for (const z of [zf - 0.06, zb + 0.06]) box(group, paint, half * 2, 1.4, 0.12, 0, 1.76, z);
    box(group, paint, half * 2 + 0.16, 0.12, len + 0.2, 0, 2.52, mid);                  // the roof, overhanging,
    box(group, gold, half * 2 + 0.06, 0.06, len + 0.06, 0, 2.43, mid);                  // a gilt cornice under it
    box(group, straw, half * 2 - 0.1, 0.03, len - 0.3, 0, 1.075, mid);                  // straw on the floor
    for (const side of [-1, 1]) {
      const x = side * half;
      for (const z of [zf - 0.06, zb + 0.06]) {
        box(group, paint, 0.16, 1.4, 0.16, x, 1.76, z);                                   // the corner posts,
        blob(group, gold, 0.07, 0.07, 0.07, x * 1.04, 2.5, z);                            // gilt knobs on them,
        rod(group, gold, 0.015, [x * 1.04, 2.55, z], [x * 1.04, 2.98, z]);                // and flags on poles over them
        prism(group, side * z > 0 ? red : cream, 0.02, [[z, 2.96], [z, 2.8], [z - Math.sign(z) * 0.32, 2.88]], x * 1.04);
      }
      box(group, paint, 0.06, 0.2, len - 0.2, x, 1.16, mid);                               // the bottom rail,
      for (let i = 0; i < 5; i++) tube(group, gold, 0.06, 0.08, x + side * 0.03, 1.16, zb + 0.4 + i * (len - 0.8) / 4, 'x'); // gilt bosses on it
      box(group, paint, 0.06, 0.3, len - 0.2, x, 2.27, mid);                               // the top rail,
      box(group, lettered('CIRCUS', '#a3202a', '#f1e3c0', 512, 96), 0.02, 0.22, len * 0.6, x + side * 0.035, 2.27, mid); // its board,
      for (let i = 0, n = 15; i < n; i++) tube(group, gold, 0.024, 0.86, x, 1.69, zb + 0.24 + i * (len - 0.48) / (n - 1)); // the bars
      for (const z of [zb + 0.5, zf - 0.5]) { // gilt scrolls up the corners, outside the bars
        blob(group, gold, 0.035, 0.18, 0.08, x + side * 0.05, 1.45, z);
        blob(group, gold, 0.035, 0.08, 0.18, x + side * 0.05, 2.03, z + Math.sign(mid - z) * 0.08);
      }
    }
    // the back: a gilt sunburst on its wall, the tail lamps, a step
    disc(group, gold, 0.5, 0.03, 0, 1.76, zb - 0.015);
    disc(group, paint, 0.38, 0.04, 0, 1.76, zb - 0.02);
    for (let i = 0; i < 12; i++) { // (its rays)
      const a = i * Math.PI / 6;
      box(group, gold, 0.035, 0.22, 0.02, Math.sin(a) * 0.24, 1.76 + Math.cos(a) * 0.24, zb - 0.045).rotation.z = -a;
    }
    disc(group, gold, 0.1, 0.06, 0, 1.76, zb - 0.04);
    for (const side of [-1, 1]) disc(group, TAIL, 0.06, 0.05, side * 0.72, 1.2, zb - 0.02);
    box(group, gold, 0.6, 0.04, 0.24, 0, 0.7, zb - 0.14);
    // the lion, pacing his cage
    const lion = new THREE.Group(), tawny = lambert(0xd39a4a), mane = lambert(0x9a4f22);
    group.add(lion);
    blob(lion, tawny, 0.2, 0.19, 0.4, 0, 0.42, 0);
    blob(lion, mane, 0.26, 0.27, 0.2, 0, 0.6, 0.34);
    blob(lion, tawny, 0.14, 0.14, 0.15, 0, 0.62, 0.48);
    blob(lion, lambert(0xf0dcb4), 0.08, 0.06, 0.07, 0, 0.56, 0.6);
    disc(lion, trim, 0.025, 0.02, 0, 0.6, 0.67);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) box(lion, tawny, 0.08, 0.32, 0.09, sx * 0.11, 0.18, sz * 0.26);
      blob(lion, trim, 0.02, 0.02, 0.015, sx * 0.06, 0.67, 0.6);
    }
    rod(lion, tawny, 0.025, [0, 0.45, -0.38], [0, 0.6, -0.72]);
    blob(lion, mane, 0.05, 0.07, 0.05, 0, 0.62, -0.74);
    // the driver's box at the front: a seat on a box, a footboard, a dashboard with lamps, the ringmaster at the wheel
    box(group, paint, 1.5, 0.5, 0.6, 0, 1.4, zf + 0.3);
    box(group, red, 1.3, 0.1, 0.5, 0, 1.7, zf + 0.3);
    box(group, red, 1.3, 0.42, 0.08, 0, 1.96, zf + 0.04);
    box(group, paint, 1.4, 0.08, 0.6, 0, 1.0, zf + 0.85);
    box(group, paint, 1.4, 0.56, 0.06, 0, 1.28, zf + 1.16);
    box(group, gold, 1.44, 0.05, 0.08, 0, 1.56, zf + 1.16);
    box(group, gold, 1.54, 0.05, 0.64, 0, 1.15, zf + 0.3);
    for (const side of [-1, 1]) {
      box(group, gold, 0.14, 0.2, 0.14, side * 0.62, 1.7, zf + 1.16);                     // coach lamps on the dash,
      disc(group, LAMP, 0.05, 0.02, side * 0.62, 1.7, zf + 1.235);
      box(group, gold, 0.18, 0.04, 0.18, side * 0.62, 1.82, zf + 1.16);
    }
    const master = rider(group, red, 0.32, 1.75, zf + 0.32);
    tube(master, lambert(0x22222a), 0.08, 0.22, 0, 0.78, 0.01);                          // the top hat,
    tube(master, lambert(0x22222a), 0.15, 0.02, 0, 0.67, 0.01);                          // its brim
    box(master, lambert(0xf4f2ec), 0.18, 0.12, 0.02, 0, 0.32, 0.115);                    // and his shirt front
    rod(group, trim, 0.025, [0.32, 1.3, zf + 1.1], [0.32, 2.0, zf + 0.82]);
    hoop(group, trim, 0.13, 0.016, 0.32, 2.02, zf + 0.79).rotation.set(-0.8, 0, 0);
    // the wheels: sunbursts, the back pair taller
    for (const side of [-1, 1]) {
      spokedWheel(group, 0.55, 0.12, side * (w / 2 - 0.06), 0.55, L * 0.62, gold, paint, 16);
      spokedWheel(group, 0.68, 0.12, side * (w / 2 - 0.06), 0.68, -L * 0.6, gold, paint, 18);
    }
    group.userData = {
      body,
      animate: (t) => {
        const v = Math.cos(t * 0.5);
        lion.position.set(0, 1.08, mid + Math.sin(t * 0.5) * (len / 2 - 0.85));
        lion.rotation.y = Math.PI / 2 * (1 - Math.max(-1, Math.min(1, v * 5)));
      },
    };
    group.userData.animate(0);
    return group;
  },

  // A gyro car (the Lit Motors C-1): a closed two-seat capsule on two wheels, one behind the other, kept upright
  // by gyroscopes in its floor. A wrap-round screen, a light bar across its nose and tail, a dark sill, mirrors on
  // stalks. It sways a little as it balances
  gyrocar: (car) => {
    const group = new THREE.Group(), lean = new THREE.Group();
    group.add(lean);
    const w = car.hw * 2, L = car.hl, R = 0.31;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), keel = lambert(0x34373d), accent = lambert(0xf07c1c);
    // the capsule, sat high over its two wheels, and a narrow dark keel under it between them
    const shell = rounded([[L * 0.9, 0.68], [L * 0.99, 0.86], [L * 0.62, 1.16], [L * 0.05, 1.5], [-L * 0.45, 1.48], [-L * 0.9, 1.1], [-L * 0.93, 0.68]], 0.3);
    const body = curved(lean, paint, w * 0.94, shell, 0.13);
    curved(lean, keel, 0.4, rounded([[L * 0.42, 0.34], [L * 0.42, 0.7], [-L * 0.42, 0.7], [-L * 0.42, 0.34]], 0.1), 0.05);
    // the glass: side windows, and the screen wrapped round the front
    curved(lean, glass, w * 0.94 + 0.02, rounded([[L * 0.52, 1.06], [L * 0.05, 1.37], [-L * 0.4, 1.34], [-L * 0.66, 1.08]], 0.12), 0.02);
    slab(lean, glass, w * 0.72, 0.03, 0.7, 0, 1.46, 0.54, 0.39);
    box(lean, paint, w * 0.94 + 0.03, 0.3, 0.07, 0, 1.2, -L * 0.12);                    // the door pillar
    for (const side of [-1, 1]) {
      box(lean, accent, 0.02, 0.07, L * 1.5, side * (w * 0.47 + 0.008), 0.8, -L * 0.04); // a stripe along each side,
      box(lean, trim, 0.02, 0.4, 0.02, side * (w * 0.47 + 0.01), 0.92, L * 0.48);       // the door's shut line
      rod(lean, trim, 0.015, [side * w * 0.42, 1.12, L * 0.55], [side * (w * 0.5 + 0.08), 1.18, L * 0.5]); // mirrors on stalks
      box(lean, paint, 0.05, 0.08, 0.12, side * (w * 0.5 + 0.1), 1.19, L * 0.5);
    }
    for (const z of [L * 0.66, -L * 0.64]) { // the two wheels, one behind the other, each under a spat in the paint
      wheel(lean, R, 0.2, 0, R, z, ALLOY);
      fender(lean, paint, R + 0.08, 0.3, 0, R + 0.02, z);
    }
    box(lean, LAMP, w * 0.62, 0.05, 0.04, 0, 0.94, L * 0.97 + 0.04);                    // a light bar across the nose,
    disc(lean, LAMP, 0.07, 0.04, 0, 0.78, L + 0.06);
    disc(lean, chrome, 0.09, 0.03, 0, 0.78, L + 0.05);
    box(lean, TAIL, w * 0.66, 0.05, 0.04, 0, 1.0, -L * 0.92 - 0.06);                     // and one across the tail
    box(lean, lambert(0xf2d21f), 0.24, 0.08, 0.02, 0, 0.78, -L * 0.93 - 0.1);            // its number plate
    group.userData = {
      body,
      animate: (t) => { lean.rotation.z = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 2.3) * 0.01; },
      livery: (evil) => accent.color.setHex(evil ? 0xd8dce2 : 0xf07c1c),
    };
    return group;
  },

  // A flying car (the Terrafugia Transition): a two-seat aeroplane that drives home with its wings folded up
  // against its sides. A car's nose and lamps, a bubble of a cabin, the propeller at the back between two booms
  // with a fin on each and a tailplane across them, the wings standing up with their numbers on and their
  // lights at the top. Its propeller idles round
  flyingcar: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.29;
    const paint = lambert(car.color), wing = lambert(0xeef0f2), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const bw = 1.2; // (the body's width)
    const body = curved(group, paint, bw, rounded([[L * 0.97, 0.36], [L * 0.99, 0.68], [L * 0.62, 0.84], [L * 0.32, 1.4], [-L * 0.1, 1.44], [-L * 0.48, 1.08], [-L * 0.62, 0.86], [-L * 0.62, 0.36]], 0.14), 0.1);
    taper(group, paint, [-L * 0.6, bw * 0.8, 0.5, 1.12], [-L * 0.82, 0.3, 0.86, 1.04]);   // the tail cone, to the propeller
    curved(group, glass, bw + 0.02, rounded([[L * 0.3, 0.92], [L * 0.2, 1.3], [-L * 0.08, 1.34], [-L * 0.4, 0.98]], 0.1), 0.01); // the side glass,
    slab(group, glass, bw * 0.8, 0.03, 0.66, 0, 1.18, L * 0.44, 0.95);                    // the windscreen
    box(group, paint, bw + 0.03, 0.4, 0.07, 0, 1.13, -L * 0.03);                           // and the pillar between
    box(group, wing, bw + 0.02, 0.07, L * 1.1, 0, 0.84, L * 0.05);                         // a cheat line down each side
    // the nose: lamps, a grille, a bumper, and the front wheels in their wings
    for (const side of [-1, 1]) {
      blob(group, chrome, 0.135, 0.08, 0.05, side * bw * 0.32, 0.66, L * 0.99 + 0.04);
      blob(group, LAMP, 0.11, 0.06, 0.05, side * bw * 0.32, 0.66, L * 0.99 + 0.05);
      box(group, AMBER, 0.1, 0.04, 0.03, side * bw * 0.32, 0.53, L * 0.99 + 0.07);
      fender(group, paint, R + 0.08, 0.24, side * (bw / 2 + 0.07), R, L * 0.68);
      wheel(group, R, 0.2, side * (bw / 2 + 0.07), R, L * 0.68);
    }
    box(group, trim, bw * 0.36, 0.08, 0.04, 0, 0.5, L * 0.99 + 0.08);
    box(group, trim, bw * 0.9, 0.08, 0.08, 0, 0.36, L * 0.99 + 0.06);
    // the wings: a stub out each side, hinged, and the outer half standing up beside the cabin
    for (const side of [-1, 1]) {
      const x = side * 0.88;
      box(group, wing, 0.34, 0.08, 1.0, side * 0.75, 1.0, -L * 0.3);                     // the stub,
      tube(group, chrome, 0.04, 1.0, x, 1.05, -L * 0.3, 'z');                             // the hinge,
      const zw = -L * 0.3;
      curved(group, wing, 0.07, rounded([[zw + 0.5, 1.06], [zw + 0.34, 2.0], [zw - 0.36, 2.0], [zw - 0.5, 1.06]], 0.08), 0.02, x); // the wing, folded up, tapering to its tip
      curved(group, paint, 0.09, rounded([[zw + 0.395, 1.8], [zw + 0.355, 2.012], [zw - 0.372, 2.012], [zw - 0.41, 1.8]], 0.06), 0.02, x); // its tip in the paint,
      box(group, trim, 0.08, 0.66, 0.03, x, 1.36, zw - 0.42).rotation.x = 0.13;          // the aileron's hinge line,
      box(group, lettered('G-ROAD', '#1c2a44', '#eef0f2', 256, 64), 0.01, 0.18, 0.66, x + side * 0.04, 1.5, zw); // the registration
      box(group, side < 0 ? TAIL : new THREE.MeshBasicMaterial({ color: 0x2fe05a }), 0.1, 0.06, 0.1, x, 2.04, zw + 0.3); // its light
      // the main wheels under it, on a leg
      wheel(group, R, 0.18, side * 0.8, R, -L * 0.42);
      rod(group, trim, 0.03, [side * 0.8, R, -L * 0.42], [side * 0.7, 0.98, -L * 0.36]);
      // the booms back to the tail, a fin on each and a tail lamp
      tube(group, paint, 0.06, 2.0, side * 0.72, 1.05, -L * 0.62, 'z');
      prism(group, paint, 0.06, [[-L * 0.8, 1.05], [-L * 0.97, 1.05], [-L * 0.99, 1.78], [-L * 0.9, 1.78]], side * 0.72);
      box(group, TAIL, 0.07, 0.07, 0.03, side * 0.72, 1.05, -L * 0.97);
    }
    box(group, wing, 1.6, 0.05, 0.32, 0, 1.75, -L * 0.93);                               // the tailplane across them
    // the propeller: a spinner and two blades, behind the tail cone
    const prop = new THREE.Group();
    prop.position.set(0, 0.95, -L * 0.85);
    group.add(prop);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 12), chrome);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -0.08;
    prop.add(spinner);
    for (const side of [-1, 1]) box(prop, trim, 0.09, 0.5, 0.03, 0, side * 0.27, 0).rotation.y = side * 0.25;
    group.userData = { body, animate: (t) => { prop.rotation.z = t * 5; } };
    return group;
  },

  // A mower racer (a ride-on mower, raced): a short bonnet with a grille and two little lamps, a wide cutting deck
  // slung under it, a high-backed seat over fat turf tyres, a number on each flank and the driver in a helmet.
  // Cut grass sprays out of the chute
  mower: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), trim = lambert(TRIM), chrome = lambert(CHROME), seat = lambert(0x3a3d44), overalls = lambert(0xf0f0ea);
    curved(group, paint, w * 0.96, rounded([[L * 0.45, 0.1], [L * 0.45, 0.22], [-L * 0.2, 0.22], [-L * 0.2, 0.1]], 0.05), 0.04); // the cutting deck
    box(group, trim, 0.2, 0.08, L * 1.7, 0, 0.3, 0);                                     // the frame
    const body = curved(group, paint, 0.56, rounded([[L * 0.98, 0.32], [L * 0.98, 0.6], [L * 0.75, 0.74], [L * 0.2, 0.78], [L * 0.2, 0.32]], 0.08), 0.05); // the bonnet
    box(group, trim, 0.38, 0.22, 0.02, 0, 0.5, L * 0.98 + 0.055);                        // its grille,
    for (const y of [0.43, 0.5, 0.57]) box(group, chrome, 0.34, 0.02, 0.02, 0, y, L * 0.98 + 0.065);
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.045, 0.03, side * 0.17, 0.66, L * 0.95 + 0.05);                 // two little lamps above it
      tube(group, WHITE, 0.12, 0.6, 0, 0.55, L * 0.6, 'x');                               // the number's roundels
      wheel(group, 0.17, 0.12, side * 0.42, 0.17, L * 0.78);                              // little front wheels on their axle,
      wheel(group, 0.3, 0.22, side * (w / 2 - 0.11), 0.3, -L * 0.62, lambert(0xf2d21f));  // fat turf tyres behind,
      for (let i = 0; i < 16; i++) { // (their tread)
        const a = i / 16 * Math.PI * 2;
        box(group, TYRE, 0.2, 0.03, 0.06, side * (w / 2 - 0.11), 0.3 + Math.cos(a) * 0.31, -L * 0.62 + Math.sin(a) * 0.31).rotation.x = a;
      }
      fender(group, paint, 0.38, 0.27, side * (w / 2 - 0.11), 0.3, -L * 0.62);           // and the guards over them
    }
    tube(group, trim, 0.035, 0.74, 0, 0.17, L * 0.78, 'x');
    box(group, trim, 0.1, 0.16, 0.1, 0, 0.26, L * 0.78);
    const number = lettered('7', '#1c1c20', '#ffffff', 64, 64);
    for (const side of [-1, 1]) box(group, number, 0.01, 0.15, 0.15, side * 0.305, 0.55, L * 0.6);
    curved(group, paint, 0.6, rounded([[L * 0.2, 0.3], [L * 0.2, 0.56], [-L * 0.95, 0.6], [-L * 0.95, 0.3]], 0.06), 0.04); // the seat's pan
    box(group, seat, 0.46, 0.1, 0.42, 0, 0.69, -L * 0.42);                               // the seat,
    box(group, seat, 0.46, 0.5, 0.1, 0, 0.98, -L * 0.66).rotation.x = -0.12;             // its high back
    tube(group, chrome, 0.035, 0.42, 0.22, 0.95, L * 0.25);                              // the exhaust stack
    rod(group, chrome, 0.022, [0, 0.78, L * 0.22], [0, 0.98, L * 0.02]);                 // the steering column
    hoop(group, trim, 0.13, 0.018, 0, 1.0, L * 0.0).rotation.set(-0.9, 0, 0);
    box(group, paint, 0.16, 0.12, 0.24, w * 0.5, 0.2, L * 0.15);                          // the chute
    const driver = rider(group, overalls, 0, 0.74, -L * 0.4);
    blob(driver, paint, 0.13, 0.13, 0.14, 0, 0.58, 0.01);                                // a helmet in the paint,
    box(driver, lambert(GLASS),0.2, 0.07, 0.04, 0, 0.56, 0.13);                                // its visor
    const grass = puffs(group, 0x7cc243, 6, 0.8);
    group.userData = {
      body,
      animate: (t) => drift(grass, t, 1.3, [w * 0.55, 0.2, L * 0.15], [0.9, 0.25, -0.3], [0.04, 0.12], 0.8),
    };
    group.userData.animate(0);
    return group;
  },

  // A snail camper (an art car, the kind Burning Man is full of): the snail's foot is the chassis, its head is the
  // cab with the windscreen in it and lamps on the ends of its eye stalks, and its shell, coiled on its back, is
  // the camper: banded, a porthole each side and a stovepipe out of the top that smokes
  snailcamper: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.3;
    const skin = lambert(0xa79f78), spots = lambert(0x928a66), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const shellPaint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    // the foot, its head the cab, its tail drawn out
    curved(group, skin, w * 0.8, rounded([[L * 0.98, 0.32], [L * 0.98, 1.1], [L * 0.86, 1.5], [L * 0.62, 1.58], [L * 0.44, 1.3], [L * 0.3, 0.86], [-L * 0.6, 0.8], [-L * 1.0, 0.42], [-L * 1.0, 0.32]], 0.22), 0.14);
    blob(group, glass, w * 0.31, 0.22, 0.2, 0, 1.22, L * 0.95);                          // the windscreen across its face
    for (const side of [-1, 1]) {
      box(group, lambert(0xd8cfa6), 0.02, 0.1, L * 1.5, side * (w * 0.4 + 0.005), 0.4, -L * 0.05); // the pale fringe of its foot,
      for (const [z, y, s] of [[0.9, 0.7, 1.2], [-0.4, 0.64, 1.4], [-1.5, 0.56, 1]]) {
        blob(group, spots, 0.02, 0.07 * s, 0.11 * s, side * (w * 0.4 + 0.003), y, z);     // the spots on its skin,
      }
      blob(group, glass, 0.06, 0.2, 0.26, side * w * 0.4, 1.16, L * 0.72);              // side windows,
      rod(group, skin, 0.05, [side * 0.26, 1.6, L * 0.74], [side * 0.42, 2.15, L * 0.86]); // the eye stalks,
      blob(group, skin, 0.1, 0.1, 0.1, side * 0.42, 2.17, L * 0.86);
      disc(group, LAMP, 0.065, 0.04, side * 0.42, 2.17, L * 0.86 + 0.09);                // with lamps for eyes,
      rod(group, skin, 0.04, [side * 0.4, 0.75, L * 0.95], [side * 0.5, 0.8, L * 1.03]); // and the little feelers below,
      disc(group, AMBER, 0.045, 0.03, side * 0.5, 0.8, L * 1.03 + 0.04);
      disc(group, TAIL, 0.06, 0.04, side * 0.22, 0.52, -L * 1.0 - 0.13);
      for (const z of [L * 0.62, -L * 0.6]) wheel(group, R, 0.2, side * (w / 2 - 0.12), R, z);
    }
    box(group, chrome, w * 0.5, 0.06, 0.06, 0, 0.5, L * 0.98 + 0.13);                   // a smile of a bumper
    box(group, lambert(0xf2d21f), 0.26, 0.08, 0.02, 0, 0.4, -L * 1.0 - 0.13);           // the number plate
    // the shell: a logarithmic spiral of a tube, banded, wound up from where it sits on the foot
    const cz = -0.4, cy = 1.4, k = 0.115, wide = 2.1, steps = 300, turns = 5 * Math.PI, points = [], radii = [], at = (th) => 1.04 * Math.exp(-k * th);
    for (let i = 0; i <= steps; i++) {
      const th = i / steps * turns, a = 0.6 - th, r = at(th);
      points.push(new THREE.Vector3(0, cy - r * Math.cos(a), cz + r * Math.sin(a)));
      radii.push(r * 0.3 + 0.012);
    }
    const body = sweep(shellPaint, points, radii, wide, (i) => (Math.sin(i / steps * turns * 7) > 0.15 ? 1 : 0.8), 20);
    group.add(body);
    // a porthole each side of its outer whorl, and the stovepipe on top
    const port = (th) => { const a = 0.6 - th, r = at(th); return [cy - r * Math.cos(a), cz + r * Math.sin(a), (r * 0.3 + 0.012) * wide]; };
    const [py, pz, px] = port(2.2);
    for (const side of [-1, 1]) {
      blob(group, chrome, 0.035, 0.17, 0.17, side * (px + 0.005), py, pz);
      blob(group, glass, 0.04, 0.13, 0.13, side * (px + 0.015), py, pz);
    }
    const [sy, sz] = port(3.74);
    tube(group, trim, 0.06, 0.5, 0.0, sy + 0.32, sz);
    cone(group, trim, 0.02, 0.11, 0.1, 0, sy + 0.6, sz);
    const smoke = puffs(group, 0xbfc4c9, 3, 0.5);
    group.userData = {
      body,
      animate: (t) => drift(smoke, t, 0.4, [0, sy + 0.62, sz], [0, 0.7, -0.6], [0.06, 0.2]),
      livery: (evil) => skin.color.setHex(evil ? 0x75805e : 0xa79f78),
    };
    group.userData.animate(0);
    return group;
  },

  // A hot-dog car (the Oscar Mayer Wienermobile): a sausage as long as a van, lying in a bun, with a wrap-round
  // screen in its nose, round windows down its sides and a squiggle of mustard (relish on an Evil one) along its
  // top. Lamps in the bun's ends. The paint is the bun's
  hotdog: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), sausage = lambert(0xb9472e), mustard = lambert(0xf2c21b), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    let body = null;
    for (const side of [-1, 1]) { // the bun, a half each side
      const half = curved(group, paint, 0.58, rounded([[-L * 0.72, 0.62], [L * 0.72, 0.62], [L * 0.72, 1.22], [-L * 0.72, 1.22]], 0.5), 0.2, side * 0.67);
      body = body || half;
      for (const z of [L * 0.6, -L * 0.6]) fender(group, trim, R + 0.08, 0.62, side * 0.67, R, z); // the wheels' arches in it
    }
    box(group, trim, 0.9, 0.3, L * 1.5, 0, 0.55, 0);                                    // the chassis between
    const dog = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 4.9, 10, 24), sausage);  // the sausage
    dog.rotation.x = Math.PI / 2;
    dog.scale.set(0.95, 1, 1);
    dog.position.set(0, 1.45, 0);
    group.add(dog);
    blob(group, chrome, 0.62, 0.27, 0.34, 0, 1.72, 2.86);                                // the screen low round its nose, rimmed
    blob(group, glass, 0.64, 0.22, 0.34, 0, 1.73, 2.88);
    for (const side of [-1, 1]) {
      for (const z of [0.9, -0.9]) {                                                    // long windows down its sides, rimmed
        blob(group, chrome, 0.05, 0.2, 0.52, side * 0.705, 1.62, z);
        blob(group, glass, 0.06, 0.15, 0.46, side * 0.705, 1.62, z);
      }
      box(group, trim, 0.02, 0.62, 0.02, side * 0.965, 0.92, 0.2);                       // a door in the bun, its shut lines,
      box(group, trim, 0.02, 0.62, 0.02, side * 0.965, 0.92, 0.9);
      box(group, chrome, 0.04, 0.04, 0.16, side * 0.975, 0.95, 0.75);                    // its handle
    }
    for (let i = 0; i < 14; i++) { // the squiggle along its top
      const xa = i % 2 ? 0.22 : -0.22, xb = -xa, za = -2.3 + i * 0.34, ya = 1.45 + 0.78 * Math.sqrt(1 - (xa / 0.74) ** 2);
      rod(group, mustard, 0.045, [xa, ya, za], [xb, ya, za + 0.34]);
    }
    for (const side of [-1, 1]) {
      disc(group, LAMP, 0.11, 0.06, side * 0.67, 0.92, L * 0.72 + 0.17);                  // lamps in the bun's ends
      disc(group, chrome, 0.13, 0.05, side * 0.67, 0.92, L * 0.72 + 0.16);
      disc(group, TAIL, 0.1, 0.06, side * 0.67, 0.92, -L * 0.72 - 0.17);
      for (const z of [L * 0.6, -L * 0.6]) wheel(group, R, 0.26, side * (w / 2 - 0.13), R, z, chrome);
    }
    box(group, lambert(0xf2d21f), 0.36, 0.12, 0.02, 0, 0.62, -L * 0.72 + 0.05 - 0.2);
    group.userData = { body, animate: () => {}, livery: (evil) => mustard.color.setHex(evil ? 0x6f9a2f : 0xf2c21b) };
    return group;
  },

  // A swan car (the Brooke Swan Car of 1910): an open tourer whose body is a swan, its neck rising over the bonnet to
  // a head with a beak and eyes that light up, its wings folded along the sides of the seats, its tail swept up
  // behind; brass lamps, a horn, wooden wheels with black wings, and a chauffeur at the wheel
  swancar: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42;
    const paint = lambert(car.color), shade = lambert(0xd9d5ca), beak = lambert(0xf08a1c), leather = lambert(0x9a5a2e);
    const brass = lambert(0xd3a84a), trim = lambert(TRIM), wood = lambert(0xb07a44);
    box(group, trim, w * 0.6, 0.14, L * 1.7, 0, 0.5, 0);                                // the chassis
    // the body: the breast at the front, the seats' well amidships, the tail rising behind
    const body = curved(group, paint, w * 0.72, rounded([[L * 0.82, 0.55], [L * 0.94, 0.9], [L * 0.76, 1.28], [L * 0.48, 1.08], [-L * 0.55, 1.0], [-L * 0.86, 1.2], [-L * 0.98, 1.66], [-L * 0.92, 0.55]], 0.18), 0.12);
    // the neck (an S), its head, beak, the knob over the beak and the eyes, lit
    const neck = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.1, L * 0.8), new THREE.Vector3(0, 1.5, L * 0.72), new THREE.Vector3(0, 1.85, L * 0.76), new THREE.Vector3(0, 2.06, L * 0.84),
    ]), 20, 0.1, 10), paint);
    group.add(neck);
    blob(group, paint, 0.3, 0.3, 0.34, 0, 1.12, L * 0.78);                               // (where it grows out of the breast)
    blob(group, paint, 0.11, 0.12, 0.18, 0, 2.08, L * 0.87);                             // the head,
    const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.065, 0.24, 10), beak);
    bill.rotation.x = Math.PI / 2;
    bill.position.set(0, 2.04, L * 0.87 + 0.26);
    group.add(bill);
    blob(group, trim, 0.04, 0.05, 0.05, 0, 2.1, L * 0.87 + 0.15);
    for (const side of [-1, 1]) blob(group, LAMP, 0.025, 0.025, 0.025, side * 0.095, 2.12, L * 0.87 + 0.06);
    // the wings folded along the sides, in layers of feathers, and the tail's feathers
    for (const side of [-1, 1]) {
      const x = side * 0.56;
      blob(group, paint, 0.14, 0.24, L * 0.5, x, 1.12, -L * 0.18).rotation.x = 0.1;
      blob(group, shade, 0.12, 0.13, L * 0.36, x + side * 0.04, 1.08, -L * 0.45).rotation.x = 0.16;
      blob(group, paint, 0.1, 0.1, L * 0.24, x + side * 0.07, 1.06, -L * 0.62).rotation.x = 0.22;
      blob(group, shade, 0.05, 0.12, 0.22, side * 0.2, 1.72, -L * 0.94).rotation.x = -0.5;
    }
    blob(group, shade, 0.05, 0.14, 0.24, 0, 1.78, -L * 0.96).rotation.x = -0.5;
    for (const side of [-1, 1]) { // carved down each flank: a gilt line at the waist and a row of feathers under it
      box(group, brass, 0.02, 0.03, L * 1.3, side * 0.652, 0.9, -L * 0.08);
      for (let i = 0; i < 7; i++) blob(group, shade, 0.02, 0.09, 0.2, side * 0.648, 0.72, L * (0.42 - i * 0.18)).rotation.x = 0.35;
    }
    // the seats: two rows, in leather
    for (const [z, h] of [[L * 0.1, 0.36], [-L * 0.36, 0.42]]) {
      box(group, leather, w * 0.5, 0.12, 0.42, 0, 1.18, z);
      box(group, leather, w * 0.52, h, 0.1, 0, 1.18 + h / 2, z - 0.24).rotation.x = -0.1;
    }
    // brass lamps either side of the breast, a horn along the side, and the chauffeur at the wheel
    for (const side of [-1, 1]) {
      tube(group, brass, 0.1, 0.18, side * 0.55, 1.02, L * 0.84, 'z');
      disc(group, LAMP, 0.075, 0.02, side * 0.55, 1.02, L * 0.84 + 0.1);
      rod(group, brass, 0.02, [side * 0.55, 0.92, L * 0.84], [side * 0.5, 0.62, L * 0.8]);
      disc(group, TAIL, 0.05, 0.04, side * 0.3, 0.72, -L * 0.95 - 0.12);
    }
    rod(group, brass, 0.025, [0.68, 1.1, L * 0.1], [0.68, 1.12, L * 0.55]);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 12, 1, true), brass);
    bell.rotation.x = -Math.PI / 2;
    bell.position.set(0.68, 1.12, L * 0.6);
    group.add(bell);
    const chauffeur = rider(group, lambert(0x2a3a5a), 0.3, 1.24, L * 0.1);
    tube(chauffeur, lambert(0x2a3a5a), 0.115, 0.07, 0, 0.66, 0.01);                   // his cap,
    box(chauffeur, trim, 0.16, 0.015, 0.08, 0, 0.635, 0.12);                           // its peak
    rod(group, trim, 0.02, [0.3, 1.0, L * 0.38], [0.3, 1.55, L * 0.26]);
    hoop(group, trim, 0.14, 0.016, 0.3, 1.56, L * 0.25).rotation.set(-0.9, 0, 0);
    // the wheels, wooden, under black wings, running boards between
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.08);
      for (const z of [L * 0.62, -L * 0.6]) {
        spokedWheel(group, R, 0.11, x, R, z, wood, wood, 12);
        fender(group, trim, R + 0.07, 0.17, x, R + 0.03, z);
      }
      box(group, trim, 0.2, 0.04, L * 0.5, side * (w / 2 - 0.1), 0.46, 0);
    }
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { shade.color.setHex(evil ? 0x332f45 : 0xd9d5ca); beak.color.setHex(evil ? 0xc0182a : 0xf08a1c); },
    };
    return group;
  },
};
