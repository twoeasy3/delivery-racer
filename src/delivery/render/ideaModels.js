// ---- the car ideas' models -----------------------------------------------------------------------
// Thirty vehicles drawn as ideas (ideas.js: IDEA_CARS; four have since become garage cars, cars.js), each after a real one, for the garage's "Car ideas"
// lot (render/ideaslot.js). Built as the garage's own models are (render/models.js): each builder takes the
// idea's entry and returns a group, front facing local +z, with
//   userData.body     the mesh whose material is the paint (so the livery can be swapped)
//   userData.animate  (seconds) => void: poses the model for that moment
//   userData.livery   optional, (evil) => void: the parts that differ between Good and Evil beyond the paint
// State-free: nothing here knows about the game. To make an idea a real car, move its builder to MODELS.
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

export const IDEA_MODELS = {
  // A bubble car (a BMW Isetta): an egg on wheels. The whole front is its one door, hinged at the side, the
  // windscreen in it; a glass bubble over a bench seat; lamps in pods on its flanks; the two back wheels close
  // together under the pinched tail. It sits still
  bubble: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.25;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    // (an egg: a ball squashed, pinched in towards the tail, and its front pressed nearly flat)
    const egg = (material, rx, ry, rz, y, z, pinch) => {
      const geo = new THREE.SphereGeometry(1, 28, 18), at = geo.attributes.position;
      for (let i = 0; i < at.count; i++) {
        const along = at.getZ(i);
        at.setX(i, at.getX(i) * (1 - pinch * Math.max(0, -along)));
        if (along > 0.55) at.setZ(i, 0.55 + (along - 0.55) * 0.25);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material);
      mesh.scale.set(rx, ry, rz);
      mesh.position.set(0, y, z);
      group.add(mesh);
      return mesh;
    };
    const body = egg(paint, w / 2, 0.46, L * 1.203, 0.6, L * 0.203, 0.4);               // the shell
    egg(glass, w * 0.45, 0.44, L, 0.88, L * 0.2, 0.3);                                  // the bubble of glass in it
    egg(paint, w * 0.34, 0.5, L * 0.74, 0.86, L * 0.1, 0.3);                            // its roof, showing through the top
    blob(group, paint, w * 0.462, 0.452, 0.05, 0, 0.88, -L * 0.02);                     // and a hoop of a pillar round the glass
    // the front door: a panel across the whole nose, a dark gap round it, the windscreen in the bubble above it
    box(group, trim, w * 0.66, 0.5, 0.05, 0, 0.6, L - 0.035);
    box(group, paint, w * 0.6, 0.44, 0.06, 0, 0.6, L - 0.02);
    box(group, chrome, 0.05, 0.14, 0.05, -w * 0.24, 0.66, L + 0.02);                    // the door's handle
    for (const y of [0.46, 0.74]) box(group, chrome, 0.04, 0.07, 0.05, w * 0.32, y, L - 0.02); // and its hinges
    for (const side of [-1, 1]) {
      box(group, chrome, w * 0.22, 0.06, 0.07, side * w * 0.2, 0.3, L * 0.9);           // a bumper bar each side
      blob(group, paint, 0.12, 0.12, 0.2, side * w * 0.44, 0.78, L * 0.5);              // the lamp pods on its flanks
      disc(group, LAMP, 0.085, 0.05, side * w * 0.44, 0.78, L * 0.5 + 0.18);
      disc(group, chrome, 0.1, 0.03, side * w * 0.44, 0.78, L * 0.5 + 0.165);
      fender(group, paint, R + 0.07, 0.17, side * (w / 2 - 0.1), R, L * 0.42);          // the front wheels' arches
      wheel(group, R, 0.13, side * (w / 2 - 0.1), R, L * 0.42);
      wheel(group, R, 0.13, side * 0.26, R, -L * 0.62);                                 // the back pair, close together
      disc(group, TAIL, 0.045, 0.06, side * 0.1, 0.62, -L * 0.93);
    }
    tube(group, trim, 0.05, 0.4, 0, R, -L * 0.62, 'x');                                 // their short axle
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A three-wheeler (a Reliant Robin): one wheel under a narrow wedge of a nose, a tall glassy cabin behind
  // it on two back wheels, frog-eyed lamps on the bonnet. It rocks from side to side, as if it might go over
  threewheeler: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.27;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = curved(shell, paint, w, rounded([[-L * 0.98, 0.36], [L * 0.3, 0.36], [L * 0.3, 0.84], [-L * 0.94, 0.86], [-L * 0.98, 0.7]], 0.06), 0.04);
    taper(shell, paint, [L * 0.28, w, 0.32, 0.88], [L, w * 0.46, 0.54, 0.68]);           // the nose, narrowing to its tip
    box(shell, trim, w * 0.3, 0.06, 0.03, 0, 0.61, L + 0.01);                            // a slot of a grille
    prism(shell, glass, w * 0.88, [[L * 0.3, 0.86], [L * 0.06, 1.3], [-L * 0.7, 1.3], [-L * 0.95, 0.88]]); // the cabin
    box(shell, paint, w * 0.9, 0.07, L * 0.8, 0, 1.335, -L * 0.33);                      // its roof
    for (const side of [-1, 1]) {
      box(shell, paint, 0.07, 0.44, 0.1, side * w * 0.44, 1.08, -L * 0.22);              // the door pillars
      disc(shell, LAMP, 0.095, 0.2, side * w * 0.26, 0.74, L * 0.66);                    // frog-eyed lamps on the bonnet
      disc(shell, chrome, 0.115, 0.16, side * w * 0.26, 0.74, L * 0.655);
      box(shell, TAIL, 0.1, 0.16, 0.04, side * w * 0.4, 0.7, -L - 0.02);
      box(shell, trim, 0.09, 0.07, 0.1, side * (w / 2 + 0.04), 0.94, L * 0.3);           // mirrors
      wheel(group, R, 0.17, side * (w / 2 - 0.06), R, -L * 0.6);
    }
    wheel(group, R + 0.01, 0.2, 0, R + 0.01, L * 0.7);                                   // the one front wheel
    box(shell, trim, w * 0.5, 0.06, 0.07, 0, 0.53, L + 0.02);                            // bumpers
    box(shell, trim, w + 0.04, 0.09, 0.08, 0, 0.42, -L - 0.03);
    box(shell, lambert(0xf2d21f), w * 0.3, 0.09, 0.02, 0, 0.56, -L - 0.03);              // a yellow number plate
    group.userData = { body, animate: (t) => { shell.rotation.z = Math.sin(t * 1.1) * 0.05; } };
    return group;
  },

  // A tin snail (a Citroen 2CV): one arch of a roofline from the windscreen to the back bumper, a canvas roof
  // rolled over it, a narrow hump of a bonnet between flowing wings, lamps on stalks, skinny wheels (the back
  // pair half hidden). It sways on its soft springs
  tinsnail: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), canvas = lambert(0x4a4d52);
    const cabin = new THREE.Shape();                                                      // the cabin, side on:
    cabin.moveTo(L * 0.3, 0.42);
    cabin.lineTo(L * 0.3, 0.95);
    cabin.lineTo(L * 0.16, 1.48);                                                         // the upright windscreen
    cabin.quadraticCurveTo(-L * 0.2, 1.6, -L * 0.5, 1.4);                                 // the arch of the roof
    cabin.quadraticCurveTo(-L * 0.95, 1.08, -L * 0.96, 0.62);                             // and on down the tail
    cabin.lineTo(-L * 0.96, 0.42);
    const body = curved(shell, paint, w * 0.94, cabin, 0.04);
    const hood = new THREE.Shape();                                                       // the canvas roof, rolled over it
    hood.moveTo(L * 0.13, 1.54);
    hood.quadraticCurveTo(-L * 0.2, 1.67, -L * 0.5, 1.47);
    hood.quadraticCurveTo(-L * 0.8, 1.26, -L * 0.9, 0.96);
    hood.lineTo(-L * 0.8, 0.96);
    hood.quadraticCurveTo(-L * 0.74, 1.2, -L * 0.5, 1.36);
    hood.quadraticCurveTo(-L * 0.2, 1.56, L * 0.13, 1.44);
    curved(shell, canvas, w * 0.74, hood, 0.02);
    for (let i = 0; i < 4; i++) box(shell, trim, w * 0.76, 0.03, 0.04, 0, 1.61 - i * i * 0.022, L * (0.02 - i * 0.15)); // its ribs
    const windscreen = box(shell, glass, w * 0.8, 0.42, 0.03, 0, 1.22, L * 0.23 + 0.06);
    windscreen.rotation.x = -0.25;
    curved(shell, paint, w * 0.56, rounded([[L * 0.28, 0.45], [L * 0.28, 0.98], [L * 0.62, 0.95], [L * 0.97, 0.66], [L * 0.97, 0.45]], 0.1), 0.04); // the hump of a bonnet
    for (let i = -2; i <= 2; i++) box(shell, trim, 0.02, 0.02, L * 0.3, i * w * 0.09, 1.01, L * 0.46); // its ribs
    box(shell, chrome, w * 0.42, 0.24, 0.04, 0, 0.6, L * 0.97 + 0.04);                    // the grille,
    for (const y of [0.52, 0.6, 0.68]) box(shell, trim, w * 0.38, 0.04, 0.05, 0, y, L * 0.97 + 0.045); // its slats
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.13);
      fender(shell, paint, 0.43, 0.28, x, R, L * 0.64);                                   // the front wings,
      box(shell, paint, 0.28, 0.1, L * 0.3, x, 0.42, L * 0.36);                           // flowing back to the doors
      disc(shell, LAMP, 0.1, 0.06, side * w * 0.33, 0.93, L * 0.66);                      // lamps on stalks
      disc(shell, chrome, 0.12, 0.16, side * w * 0.33, 0.93, L * 0.6);
      box(shell, chrome, 0.03, 0.2, 0.03, side * w * 0.33, 0.8, L * 0.58);
      box(shell, glass, 0.02, 0.36, L * 0.3, side * (w * 0.47 + 0.005), 1.2, -L * 0.03);  // the side windows
      box(shell, glass, 0.02, 0.3, L * 0.24, side * (w * 0.47 + 0.005), 1.17, -L * 0.37);
      box(shell, TAIL, 0.08, 0.1, 0.04, side * w * 0.36, 0.72, -L * 0.96 - 0.05);
      wheel(group, R, 0.12, side * (w / 2 - 0.08), R, L * 0.64);                          // skinny wheels,
      wheel(group, R, 0.12, side * (w / 2 - 0.14), R, -L * 0.62);                         // the back pair tucked under the body
    }
    box(shell, chrome, w * 0.9, 0.06, 0.06, 0, 0.4, L + 0.02);                            // thin bumpers
    box(shell, chrome, w * 0.9, 0.06, 0.06, 0, 0.4, -L - 0.02);
    group.userData = {
      body,
      animate: (t) => { shell.rotation.z = Math.sin(t * 1.6) * 0.03; shell.rotation.x = Math.sin(t * 2.3) * 0.01; },
    };
    return group;
  },

  // A people's bug (a Volkswagen Beetle): a dome of a roof running down into a sloping tail with the engine's
  // vents in it, four separate round wings, lamps in the front pair, running boards between. It sits still
  bug: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.31;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const shell = new THREE.Shape();                                                      // the body, side on:
    shell.moveTo(L * 0.9, 0.36);
    shell.quadraticCurveTo(L * 1.0, 0.44, L * 0.94, 0.6);                                 // the nose
    shell.quadraticCurveTo(L * 0.74, 0.86, L * 0.36, 0.96);                               // the rounded front lid
    shell.bezierCurveTo(L * 0.26, 1.3, L * 0.12, 1.45, -L * 0.12, 1.45);                  // the windscreen, into the dome
    shell.bezierCurveTo(-L * 0.5, 1.45, -L * 0.72, 1.05, -L * 0.96, 0.62);                // and the long slope of the tail
    shell.lineTo(-L * 0.96, 0.36);
    const body = curved(group, paint, w * 0.74, shell, 0.05);
    curved(group, glass, w * 0.74 + 0.02, rounded([[L * 0.25, 1.0], [L * 0.12, 1.29], [-L * 0.22, 1.34], [-L * 0.48, 1.14], [-L * 0.48, 1.0]], 0.1), 0.01); // the side windows
    box(group, paint, w * 0.74 + 0.03, 0.34, 0.07, 0, 1.16, -L * 0.07);                   // the door pillar
    const windscreen = box(group, glass, w * 0.58, 0.3, 0.03, 0, 1.17, L * 0.277 + 0.05);
    windscreen.rotation.x = -0.8;
    slab(group, glass, w * 0.44, 0.03, 0.3, 0, 1.325, -L * 0.52, -0.44);                  // the small rear window
    for (let i = 0; i < 4; i++) slab(group, trim, w * 0.36, 0.02, 0.05, 0, 1.14 - i * 0.055, -L * (0.67 + i * 0.037), -0.63); // the engine's vents
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.2);
      blob(group, paint, 0.24, 0.32, 0.58, x, 0.5, L * 0.58);                             // the front wings,
      blob(group, paint, 0.26, 0.36, 0.62, side * (w / 2 - 0.21), 0.53, -L * 0.58);       // and the bigger back ones
      disc(group, LAMP, 0.125, 0.14, x, 0.7, L * 0.58 + 0.42).rotation.x = Math.PI / 2 - 0.3; // lamps in the front wings, looking up a little
      disc(group, chrome, 0.15, 0.1, x, 0.7, L * 0.58 + 0.41).rotation.x = Math.PI / 2 - 0.3;
      disc(group, TAIL, 0.06, 0.06, side * (w / 2 - 0.21), 0.66, -L * 0.58 - 0.5);
      box(group, trim, 0.18, 0.05, L * 0.52, side * (w / 2 - 0.12), 0.33, 0);             // the running boards
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, L * 0.6, lambert(CHROME));
      wheel(group, R, 0.2, side * (w / 2 - 0.1), R, -L * 0.58, lambert(CHROME));
      box(group, chrome, 0.06, 0.16, 0.07, side * w * 0.22, 0.43, L + 0.04);              // the bumpers' overriders
    }
    box(group, chrome, w * 0.92, 0.07, 0.07, 0, 0.4, L + 0.02);                           // chrome bumpers
    box(group, chrome, w * 0.92, 0.07, 0.07, 0, 0.4, -L - 0.0);
    box(group, chrome, 0.04, 0.03, 0.14, 0, 0.9, L * 0.72);                               // the front lid's handle
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A two-stroke saloon (a Trabant 601): a small, boxy two-door in a pale pastel with an ivory roof, round
  // lamps, a thick rear pillar and little fins on its tail. Its exhaust puffs blue smoke
  twostroke: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.28;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), ivory = lambert(0xefe8d2);
    const body = curved(group, paint, w, rounded([[-L * 0.98, 0.34], [L * 0.98, 0.34], [L * 0.98, 0.7], [L * 0.4, 0.78], [-L * 0.98, 0.8]], 0.06), 0.04);
    prism(group, glass, w * 0.86, [[L * 0.4, 0.8], [L * 0.2, 1.34], [-L * 0.42, 1.34], [-L * 0.62, 0.82]]); // the glasshouse
    box(group, ivory, w * 0.9, 0.07, L * 0.66, 0, 1.375, -L * 0.11);                      // the roof, in ivory
    for (const side of [-1, 1]) {
      prism(group, paint, 0.2, [[-L * 0.26, 1.345], [-L * 0.425, 1.345], [-L * 0.63, 0.82], [-L * 0.42, 0.82]], side * (w * 0.44 - 0.1)); // the thick rear pillars
      prism(group, paint, 0.1, [[-L * 0.4, 0.82], [-L * 1.02, 0.97], [-L * 1.02, 0.8]], side * (w / 2 - 0.05)); // the little fins
      box(group, TAIL, 0.1, 0.2, 0.04, side * (w / 2 - 0.06), 0.84, -L * 1.02 - 0.01);
      box(group, paint, 0.07, 0.5, 0.09, side * w * 0.43, 1.08, -L * 0.02);               // the door pillars
      disc(group, LAMP, 0.11, 0.08, side * w * 0.35, 0.6, L + 0.01);                      // round lamps
      disc(group, chrome, 0.135, 0.05, side * w * 0.35, 0.6, L);
      box(group, AMBER, 0.1, 0.05, 0.04, side * w * 0.35, 0.44, L + 0.02);
      wheel(group, R, 0.17, side * (w / 2 - 0.05), R, L * 0.62);
      wheel(group, R, 0.17, side * (w / 2 - 0.05), R, -L * 0.6);
    }
    box(group, trim, w * 0.42, 0.13, 0.04, 0, 0.58, L + 0.02);                            // a plain slot of a grille,
    box(group, chrome, w * 0.44, 0.025, 0.05, 0, 0.58, L + 0.025);                        // a bar across it
    box(group, chrome, w + 0.02, 0.06, 0.07, 0, 0.36, L + 0.03);                          // thin bumpers
    box(group, chrome, w + 0.02, 0.06, 0.07, 0, 0.36, -L - 0.03);
    // the exhaust's smoke: three puffs, each growing and thinning as it drifts back
    tube(group, trim, 0.035, 0.2, -w * 0.3, 0.27, -L - 0.02, 'z');
    const puffs = [0, 1, 2].map(() => {
      const puff = new THREE.Mesh(BALL, new THREE.MeshBasicMaterial({ color: 0x9fb2d6, transparent: true, opacity: 0.5, depthWrite: false }));
      group.add(puff);
      return puff;
    });
    group.userData = {
      body,
      animate: (t) => puffs.forEach((puff, i) => {
        const p = (t * 0.55 + i / 3) % 1;
        puff.position.set(-w * 0.3 + Math.sin(i * 2.1 + p * 3) * 0.06, 0.3 + p * 0.5, -L - 0.15 - p * 0.9);
        puff.scale.setScalar(0.08 + p * 0.22);
        puff.material.opacity = 0.55 * (1 - p);
      }),
    };
    group.userData.animate(0);
    return group;
  },

  // A brick of an estate (a Volvo 240): square everything. A long flat bonnet, an upright grille with a
  // slash across it between square lamps, a long flat roof running to an upright tailgate, tall tail lamps,
  // big black bumpers and roof rails. It sits still
  brickestate: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.5, L * 1.98, 0, 0.6, 0);
    box(group, paint, w * 0.97, 0.06, L * 0.64, 0, 0.87, L * 0.66);                       // the flat bonnet
    box(group, glass, w * 0.9, 0.5, L * 1.3, 0, 1.1, -L * 0.33);                          // the long glasshouse
    box(group, paint, w * 0.92, 0.07, L * 1.32, 0, 1.385, -L * 0.33);                     // and the long flat roof
    screen(group, glass, w * 0.88, 0.05, 0.6, 0, 1.1, L * 0.36, 0.62);                    // the windscreen
    box(group, paint, w * 0.92, 0.2, 0.06, 0, 0.95, -L * 0.98);                           // the tailgate, under its window
    for (const side of [-1, 1]) {
      for (const z of [0.3, 0.02, -0.36, -0.95]) box(group, paint, 0.08, 0.5, 0.1, side * w * 0.45, 1.1, L * z); // pillars
      box(group, trim, 0.05, 0.05, L * 1.1, side * w * 0.4, 1.45, -L * 0.33);             // roof rails
      box(group, trim, 0.02, 0.07, L * 1.8, side * (w / 2 + 0.01), 0.6, 0);               // rubbing strips
      for (const x of [0.3, 0.42]) box(group, LAMP, w * 0.11, 0.15, 0.04, side * w * x, 0.7, L + 0.0); // square lamps, two a side
      box(group, AMBER, w * 0.05, 0.15, 0.1, side * w * 0.485, 0.7, L - 0.04);
      box(group, TAIL, 0.14, 0.44, 0.05, side * w * 0.43, 0.74, -L + 0.01);               // tall tail lamps
      box(group, trim, 0.1, 0.1, 0.12, side * (w / 2 + 0.05), 0.95, L * 0.3);             // mirrors
      wheel(group, R, 0.22, side * (w / 2 - 0.04), R, L * 0.62);
      wheel(group, R, 0.22, side * (w / 2 - 0.04), R, -L * 0.58);
    }
    box(group, chrome, w * 0.5, 0.28, 0.03, 0, 0.7, L - 0.005);                           // the grille's frame,
    box(group, trim, w * 0.46, 0.24, 0.04, 0, 0.7, L);                                    // the grille,
    box(group, chrome, w * 0.5, 0.025, 0.03, 0, 0.7, L + 0.015).rotation.z = 0.5;         // and the slash across it
    box(group, trim, w + 0.1, 0.2, 0.26, 0, 0.44, L + 0.02);                              // big black bumpers
    box(group, trim, w + 0.1, 0.2, 0.26, 0, 0.44, -L - 0.02);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A woody wagon (a 1949 Ford): a rounded bonnet with a chrome spinner in its grille, a long wagon body
  // framed and panelled in timber, a split windscreen, whitewall tyres, and a surfboard on the roof. It sits still
  woody: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const maple = lambert(0xd9a85c), mahogany = lambert(0x7a4a24);
    const body = curved(group, paint, w, rounded([[-L * 0.98, 0.38], [L * 0.97, 0.38], [L * 0.97, 0.84], [L * 0.3, 0.9], [-L * 0.98, 0.9]], 0.12), 0.05);
    curved(group, paint, w * 0.7, rounded([[L * 0.26, 0.8], [L * 0.26, 1.03], [L * 0.86, 0.99], [L * 0.99, 0.74]], 0.1), 0.05); // the bonnet's hump
    box(group, glass, w * 0.88, 0.48, L * 1.2, 0, 1.19, -L * 0.38);                       // the wagon's glasshouse
    curved(group, paint, w * 0.92, rounded([[-L * 0.99, 1.42], [L * 0.24, 1.42], [L * 0.2, 1.5], [-L * 0.97, 1.5]], 0.03), 0.04); // its roof
    screen(group, glass, w * 0.84, 0.05, 0.6, 0, 1.18, L * 0.27, 0.62);                   // the windscreen,
    slab(group, paint, 0.06, 0.06, 0.62, 0, 1.19, L * 0.27 + 0.01, 0.62);                 // split down the middle
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, maple, 0.04, 0.5, L * 1.18, x, 0.66, -L * 0.39);                         // the timber: a maple frame,
      for (const z of [0.0, -0.39, -0.78]) box(group, mahogany, 0.05, 0.36, L * 0.32, x + side * 0.003, 0.66, L * z); // mahogany panels in it
      for (const z of [0.2, -0.19, -0.58, -0.96]) box(group, maple, 0.08, 0.5, 0.11, side * w * 0.445, 1.19, L * z); // and maple pillars
      box(group, maple, 0.05, 0.07, L * 1.2, side * w * 0.45, 1.4, -L * 0.38);
      disc(group, LAMP, 0.12, 0.08, side * w * 0.38, 0.72, L + 0.02);                     // round lamps
      disc(group, chrome, 0.145, 0.05, side * w * 0.38, 0.72, L + 0.01);
      disc(group, TAIL, 0.07, 0.06, side * w * 0.42, 0.7, -L - 0.03);
      whitewall(group, R, 0.24, side * (w / 2 - 0.03), R, L * 0.6, lambert(CHROME));
      whitewall(group, R, 0.24, side * (w / 2 - 0.03), R, -L * 0.6, lambert(CHROME));
    }
    box(group, maple, w * 0.9, 0.5, 0.04, 0, 0.68, -L - 0.035);                           // the timber tailgate
    box(group, mahogany, w * 0.78, 0.36, 0.05, 0, 0.68, -L - 0.04);
    box(group, trim, w * 0.74, 0.2, 0.04, 0, 0.56, L + 0.03);                             // the grille's mouth,
    box(group, chrome, w * 0.8, 0.06, 0.07, 0, 0.56, L + 0.05);                           // the bar across it,
    disc(group, chrome, 0.11, 0.2, 0, 0.56, L + 0.07);                                    // and the spinner in its middle
    box(group, chrome, w + 0.1, 0.13, 0.14, 0, 0.4, L + 0.12);                            // chrome bumpers
    box(group, chrome, w + 0.1, 0.13, 0.14, 0, 0.4, -L - 0.12);
    for (const z of [-0.1, -0.66]) box(group, chrome, w * 0.86, 0.04, 0.06, 0, 1.56, L * z); // the roof bars,
    blob(group, lambert(0xf3e6c0), 0.3, 0.045, L * 0.56, w * 0.14, 1.62, -L * 0.36);      // and the surfboard on them,
    box(group, lambert(0xd8402f), 0.07, 0.02, L * 0.9, w * 0.14, 1.66, -L * 0.36);        // a stripe down it
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A stately saloon (a Rolls-Royce Silver Shadow): upright and formal, a tall chrome temple of a grille
  // standing above the bonnet with a mascot on it, twin round lamps each side, chrome bumpers with
  // overriders, and two shades of paint: the flanks in the livery, everything above the waist in a second
  // colour (silver on a Good one, black on an Evil one). It sits still
  stately: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), upper = lambert(0xc9ccd1), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.52, L * 1.98, 0, 0.62, 0);
    box(group, upper, w * 0.94, 0.07, L * 0.66, 0, 0.915, L * 0.64);                      // the long bonnet,
    box(group, upper, w * 0.94, 0.07, L * 0.44, 0, 0.915, -L * 0.76);                     // and the boot
    box(group, glass, w * 0.86, 0.5, L * 0.86, 0, 1.17, -L * 0.1);                        // the glasshouse
    box(group, upper, w * 0.88, 0.08, L * 0.86, 0, 1.46, -L * 0.1);                       // its roof
    screen(group, glass, w * 0.84, 0.05, 0.58, 0, 1.16, L * 0.36, 0.55);                  // the windscreen
    screen(group, glass, w * 0.82, 0.05, 0.56, 0, 1.16, -L * 0.56, -0.6);                 // the rear window
    for (const side of [-1, 1]) {
      for (const z of [0.3, -0.1]) box(group, upper, 0.08, 0.5, 0.1, side * w * 0.43, 1.17, L * z); // pillars,
      box(group, upper, 0.08, 0.5, L * 0.16, side * w * 0.43, 1.17, -L * 0.46);           // a broad one at the back
      box(group, chrome, 0.02, 0.035, L * 1.9, side * (w / 2 + 0.01), 0.86, 0);           // a chrome line along the waist,
      box(group, chrome, 0.02, 0.05, L * 1.1, side * (w / 2 + 0.01), 0.4, 0);             // and one along the sill
      box(group, chrome, w * 0.3, 0.2, 0.03, side * w * 0.33, 0.72, L - 0.005);           // the lamps' chrome panel,
      for (const x of [0.26, 0.4]) disc(group, LAMP, 0.085, 0.06, side * w * x, 0.72, L + 0.01); // twin round lamps
      box(group, TAIL, 0.12, 0.3, 0.04, side * w * 0.42, 0.7, -L + 0.0);
      for (const z of [1, -1]) box(group, chrome, 0.08, 0.22, 0.1, side * w * 0.2, 0.47, z * (L + 0.1)); // overriders
      box(group, chrome, 0.1, 0.07, 0.1, side * (w / 2 + 0.05), 0.98, L * 0.32);          // mirrors
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, L * 0.62, lambert(CHROME));
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, -L * 0.6, lambert(CHROME));
    }
    box(group, chrome, w * 0.3, 0.54, 0.12, 0, 0.77, L + 0.0);                            // the grille: tall, upright,
    for (let i = -3; i <= 3; i++) box(group, trim, 0.015, 0.44, 0.02, i * w * 0.036, 0.76, L + 0.06); // its slats,
    box(group, chrome, w * 0.33, 0.05, 0.16, 0, 1.06, L + 0.0);                           // a pediment on top,
    box(group, chrome, 0.04, 0.13, 0.04, 0, 1.15, L + 0.03);                              // and the mascot on that,
    box(group, chrome, 0.16, 0.03, 0.03, 0, 1.19, L + 0.0);                               // her wings out
    box(group, chrome, w + 0.1, 0.12, 0.14, 0, 0.44, L + 0.05);                           // chrome bumpers
    box(group, chrome, w + 0.1, 0.12, 0.14, 0, 0.44, -L - 0.05);
    group.userData = { body, animate: () => {}, livery: (evil) => upper.color.setHex(evil ? 0x16161a : 0xc9ccd1) };
    return group;
  },

  // A stretch limo (a Lincoln Town Car, stretched): as long as two cars, a row of dark windows down each
  // side with a blank panel behind the driver, an upright chrome grille between square lamps, a red bar
  // across the tail, whitewall tyres, and a boomerang of an aerial on the boot. It sits still
  limo: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36;
    const paint = lambert(car.color), tint = lambert(0x0d0f14), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.5, L * 1.99, 0, 0.6, 0);
    box(group, paint, w * 0.95, 0.06, L * 0.36, 0, 0.87, L * 0.8);                        // the bonnet,
    box(group, paint, w * 0.95, 0.06, L * 0.24, 0, 0.87, -L * 0.86);                      // and the boot
    box(group, tint, w * 0.88, 0.46, L * 1.32, 0, 1.1, -L * 0.06);                        // the long glasshouse, blacked out
    box(group, paint, w * 0.9, 0.08, L * 1.3, 0, 1.37, -L * 0.06);                        // its roof
    screen(group, tint, w * 0.86, 0.05, 0.56, 0, 1.09, L * 0.62, 0.55);                   // the windscreen
    screen(group, tint, w * 0.84, 0.05, 0.5, 0, 1.09, -L * 0.74, -0.6);                   // the rear window
    for (const side of [-1, 1]) {
      const x = side * w * 0.44;
      for (const z of [0.57, 0.36, -0.06, -0.28, -0.5]) box(group, paint, 0.06, 0.46, 0.1, x, 1.1, L * z); // a pillar between each window,
      box(group, paint, 0.06, 0.46, L * 0.18, x, 1.1, L * 0.22);                          // the blank panel behind the driver,
      box(group, LAMP, 0.03, 0.14, 0.08, x + side * 0.03, 1.12, L * 0.22);                // a coach lamp on it,
      box(group, paint, 0.06, 0.46, L * 0.12, x, 1.1, -L * 0.67);                         // and a broad pillar at the back
      box(group, chrome, 0.02, 0.05, L * 1.94, side * (w / 2 + 0.01), 0.62, 0);           // chrome strips
      box(group, chrome, 0.02, 0.04, L * 1.4, side * (w / 2 + 0.01), 0.37, 0);
      for (const k of [0.27, 0.41]) box(group, LAMP, w * 0.12, 0.11, 0.04, side * w * k, 0.7, L + 0.0); // square lamps, two a side
      whitewall(group, R, 0.26, side * (w / 2 - 0.04), R, L * 0.76, lambert(CHROME));
      whitewall(group, R, 0.26, side * (w / 2 - 0.04), R, -L * 0.72, lambert(CHROME));
      box(group, chrome, 0.26, 0.025, 0.05, side * 0.11, 1.03, -L * 0.86).rotation.y = side * 0.5; // the boomerang aerial's arms,
    }
    box(group, chrome, 0.03, 0.14, 0.03, 0, 0.96, -L * 0.86);                             // on its post
    box(group, chrome, w * 0.34, 0.3, 0.06, 0, 0.7, L + 0.0);                             // the upright grille,
    for (let i = -4; i <= 4; i++) box(group, trim, 0.012, 0.24, 0.02, i * w * 0.034, 0.7, L + 0.03); // its bars
    box(group, TAIL, w * 0.92, 0.12, 0.04, 0, 0.72, -L + 0.0);                            // a red bar across the tail
    box(group, chrome, w + 0.12, 0.16, 0.16, 0, 0.42, L + 0.04);                          // chrome bumpers
    box(group, chrome, w + 0.12, 0.16, 0.16, 0, 0.42, -L - 0.04);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A milk float (a Smith's or a Wales & Edwards electric): a flat-fronted cab with a big windscreen, and behind
  // it an open deck under a roof on posts, stacked with crates of bottles, on tiny wheels. The crates rattle
  milkfloat: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.22, deck = 0.64;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    box(group, trim, w * 0.8, 0.14, L * 1.9, 0, 0.36, 0);                                 // the chassis, and its batteries
    box(group, trim, w * 0.98, 0.2, L * 0.6, 0, 0.3, -L * 0.05);
    const body = box(group, paint, w, 0.22, L * 2, 0, deck - 0.11, 0);                    // the deck's skirt
    const cabZ = L * 0.74, cabL = L * 0.52;
    box(group, paint, w, 0.5, cabL, 0, deck + 0.25, cabZ);                                // the cab, flat-fronted,
    box(group, glass, w * 0.94, 0.68, cabL - 0.06, 0, deck + 0.84, cabZ);                 // glass all round above the waist
    box(group, WHITE, w * 0.92, 0.1, 0.03, 0, deck + 0.3, L + 0.005);                     // a white band across its front
    box(group, WHITE, w * 1.04, 0.09, L * 2.04, 0, deck + 1.225, 0);                      // the roof, over cab and deck alike
    box(group, paint, w * 0.8, 0.16, 0.06, 0, deck + 1.35, L * 0.94);                     // a headboard on it
    for (const side of [-1, 1]) {
      for (const z of [L - 0.04, cabZ - cabL / 2 + 0.04]) box(group, paint, 0.08, 0.7, 0.08, side * w * 0.46, deck + 0.84, z); // the cab's posts
      for (const z of [-L + 0.05, -L * 0.24]) box(group, WHITE, 0.06, 1.2, 0.06, side * w * 0.47, deck + 0.6, z); // the roof's posts
      disc(group, LAMP, 0.09, 0.06, side * w * 0.3, deck + 0.12, L + 0.02);
      box(group, TAIL, 0.1, 0.1, 0.04, side * w * 0.4, deck - 0.1, -L - 0.01);
      wheel(group, R, 0.16, side * (w / 2 - 0.08), R, L * 0.6);                           // tiny wheels
      wheel(group, R, 0.16, side * (w / 2 - 0.08), R, -L * 0.55);
    }
    box(group, chrome, w * 0.9, 0.07, 0.06, 0, deck - 0.16, L + 0.03);                    // a bumper bar
    // the crates: six stacks, two abreast, each crate with its bottles' tops showing
    const crate = new THREE.BoxGeometry(w * 0.4, 0.24, 0.6), tops = new THREE.BoxGeometry(w * 0.33, 0.07, 0.5);
    const colours = [lambert(0xc0392b), lambert(0x2e6bb3), lambert(0x7d8790)], silver = lambert(0xe9edf2);
    const stacks = [];
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
      const stack = new THREE.Group();
      stack.position.set(side * w * 0.22, deck, -L * 0.72 + i * 0.68);
      group.add(stack);
      stacks.push(stack);
      const high = 2 + (i + (side > 0 ? 1 : 0)) % 2;
      for (let k = 0; k < high; k++) {
        const one = new THREE.Mesh(crate, colours[(i + k + (side > 0 ? 1 : 0)) % 3]);
        one.position.y = 0.13 + k * 0.3;
        const caps = new THREE.Mesh(tops, silver);
        caps.position.y = 0.26 + k * 0.3;
        stack.add(one, caps);
      }
    }
    group.userData = {
      body,
      animate: (t) => stacks.forEach((stack, i) => {
        stack.position.y = deck + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.012;
        stack.rotation.z = Math.sin(t * 13 + i * 2.3) * 0.012;
      }),
    };
    return group;
  },

  // A pony car (a 1965 Ford Mustang fastback): a long bonnet behind a forward-leaning nose, the cabin set well
  // back, a fastback roof running down to a short deck with vents in its pillars, a scoop in each flank, three
  // upright tail lamps a side, and twin white stripes. It sits still
  pony: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = curved(group, paint, w, rounded([[-L * 0.97, 0.38], [L * 0.94, 0.38], [L * 0.97, 0.8], [L * 0.14, 0.83], [-L * 0.74, 0.86], [-L * 0.97, 0.84]], 0.04), 0.04);
    prism(group, glass, w * 0.8, [[L * 0.16, 0.86], [-L * 0.04, 1.24], [-L * 0.3, 1.26], [-L * 0.5, 0.88]]); // the side glass
    prism(group, paint, w * 0.82, [[-L * 0.02, 1.26], [-L * 0.3, 1.29], [-L * 0.92, 0.89], [-L * 0.5, 0.89], [-L * 0.33, 1.2], [-L * 0.05, 1.2]]); // the roof and the fastback
    slab(group, glass, w * 0.62, 0.03, L * 0.36, 0, 1.115, -L * 0.57, -Math.atan2(0.4, L * 0.62)); // its rear window
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) box(group, trim, 0.02, 0.05, 0.13, side * (w * 0.41 + 0.005), 1.05 - i * 0.055, -L * (0.47 + i * 0.07)); // vents in the pillar
      box(group, WHITE, 0.14, 0.02, L * 0.8, side * 0.13, 0.875, L * 0.54);              // twin stripes down the bonnet,
      box(group, WHITE, 0.14, 0.02, L * 0.3, side * 0.13, 1.295, -L * 0.165);            // and over the roof
      box(group, WHITE, 0.02, 0.07, L * 1.16, side * (w / 2 + 0.012), 0.46, 0);          // a stripe along each sill
      box(group, trim, 0.03, 0.14, 0.3, side * (w / 2 + 0.01), 0.68, -L * 0.4);          // the scoop in the flank
      disc(group, LAMP, 0.115, 0.08, side * w * 0.39, 0.63, L * 0.985);                  // round lamps at the grille's ends
      disc(group, chrome, 0.14, 0.05, side * w * 0.39, 0.63, L * 0.98);
      for (let i = 0; i < 3; i++) box(group, TAIL, 0.06, 0.18, 0.04, side * (w * 0.2 + i * 0.09), 0.7, -L * 0.97 - 0.04); // three tail lamps
      box(group, chrome, 0.09, 0.07, 0.1, side * (w / 2 + 0.04), 0.94, L * 0.14);        // mirrors
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, L * 0.62, lambert(CHROME));
      wheel(group, R, 0.24, side * (w / 2 - 0.04), R, -L * 0.6, lambert(CHROME));
    }
    box(group, trim, w * 0.6, 0.22, 0.05, 0, 0.63, L * 0.99);                             // the grille's mouth,
    box(group, chrome, 0.26, 0.14, 0.03, 0, 0.63, L + 0.01);                              // the corral in it,
    box(group, trim, 0.2, 0.09, 0.04, 0, 0.63, L + 0.015);                                // and the pony in that
    box(group, chrome, 0.12, 0.05, 0.05, 0, 0.63, L + 0.02);
    box(group, chrome, w + 0.04, 0.08, 0.1, 0, 0.44, L * 0.97);                           // slim chrome bumpers
    box(group, chrome, w + 0.04, 0.08, 0.1, 0, 0.46, -L * 0.99);
    disc(group, chrome, 0.07, 0.05, 0, 0.72, -L * 0.97 - 0.04);                           // the filler cap
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A split-window coupe (a 1963 Corvette Sting Ray): a nose and a tail both drawn to a point, a peak over
  // each wheel, lamps that pop up out of the nose, a boat-tail fastback with a spine down the middle of its
  // rear window, side pipes, four round tail lamps. Its lamps go down and come up again
  splitwindow: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.33;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = curved(group, paint, w, rounded([[-L * 0.76, 0.34], [L * 0.74, 0.34], [L * 0.74, 0.78], [L * 0.1, 0.8], [-L * 0.76, 0.8]], 0.03), 0.04);
    taper(group, paint, [L * 0.66, w, 0.3, 0.82], [L, w * 0.8, 0.5, 0.56]);               // the nose, drawn out to a blade,
    taper(group, paint, [-L * 0.74, w, 0.3, 0.84], [-L, w * 0.74, 0.5, 0.62]);            // and the tail to another
    box(group, paint, 0.07, 0.04, L * 0.66, 0, 0.855, L * 0.42);                          // the crease down the bonnet,
    for (const side of [-1, 1]) box(group, trim, 0.2, 0.02, 0.22, side * 0.24, 0.85, L * 0.44); // and its two vents
    prism(group, glass, w * 0.74, [[L * 0.12, 0.84], [-L * 0.08, 1.2], [-L * 0.3, 1.22], [-L * 0.34, 0.84]]); // the side glass
    box(group, paint, w * 0.76, 0.05, L * 0.24, 0, 1.225, -L * 0.19);                     // the roof,
    taper(group, paint, [-L * 0.3, w * 0.76, 0.84, 1.25], [-L * 0.93, w * 0.34, 0.74, 0.78]); // running back into the boat tail
    const fall = Math.atan2(0.47, L * 0.63);
    for (const side of [-1, 1]) slab(group, glass, 0.25, 0.02, 0.5, side * 0.17, 1.12, -L * 0.46, -fall); // the rear window, in two,
    slab(group, paint, 0.07, 0.04, L * 0.64, 0, 1.025, -L * 0.61, -fall);                 // the spine between them
    // the lamps: a pod each side of the nose, which goes down flush and comes up again
    const pods = [-1, 1].map((side) => {
      const pod = new THREE.Group();
      pod.position.set(side * w * 0.27, 0.7, L * 0.83);
      group.add(pod);
      box(pod, paint, 0.3, 0.12, 0.2, 0, 0, 0);
      for (const x of [-0.07, 0.07]) disc(pod, LAMP, 0.045, 0.03, x, 0, 0.1);
      return pod;
    });
    for (const side of [-1, 1]) {
      for (const z of [0.5, -0.54]) fender(group, paint, 0.58, 0.3, side * (w / 2 - 0.15), R, L * z); // a peak over each wheel
      tube(group, chrome, 0.05, L * 0.8, side * (w / 2 + 0.03), 0.3, -L * 0.02, 'z');     // side pipes
      for (const x of [0.2, 0.42]) disc(group, TAIL, 0.055, 0.05, side * x, 0.57, -L - 0.01); // four round tail lamps
      box(group, chrome, w * 0.3, 0.04, 0.05, side * w * 0.22, 0.47, L + 0.0);            // the bumper's blades
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, L * 0.5, lambert(CHROME));
      wheel(group, R, 0.24, side * (w / 2 - 0.05), R, -L * 0.54, lambert(CHROME));
    }
    group.userData = {
      body,
      animate: (t) => { // (up for most of the time; down and back every ten seconds or so)
        const up = Math.max(0, Math.min(1, Math.sin(t * 0.6) * 4 + 3));
        for (const pod of pods) pod.position.y = 0.58 + up * 0.11;
      },
    };
    group.userData.animate(0);
    return group;
  },

  // A snake of a roadster (an AC Cobra 427): an open two-seater, low and round, an oval mouth in its nose, fat
  // wings swelling over fat tyres (fattest at the back), a low windscreen, a roll hoop behind the driver, side
  // pipes, and twin stripes nose to tail (white on a Good one, gold on an Evil one). It sits still
  snake: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), stripe = lambert(0xf4f2ec), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), leather = lambert(0x3a2a20);
    const body = curved(group, paint, w * 0.76, rounded([[-L * 0.94, 0.32], [L * 0.9, 0.32], [L * 0.97, 0.5], [L * 0.78, 0.68], [L * 0.1, 0.74], [-L * 0.7, 0.74], [-L * 0.96, 0.58]], 0.12), 0.05);
    for (const side of [-1, 1]) {
      blob(group, paint, 0.27, 0.3, 0.58, side * (w / 2 - 0.27), 0.5, L * 0.58);          // the front wings,
      blob(group, paint, 0.34, 0.36, 0.62, side * (w / 2 - 0.32), 0.53, -L * 0.56);       // and the fat back ones
      disc(group, LAMP, 0.1, 0.1, side * (w / 2 - 0.27), 0.64, L * 0.58 + 0.46);          // lamps in the wings' noses
      disc(group, chrome, 0.12, 0.07, side * (w / 2 - 0.27), 0.64, L * 0.58 + 0.45);
      box(group, stripe, 0.16, 0.02, L * 0.8, side * 0.13, 0.8, -L * 0.3);                // the twin stripes: along the top,
      slab(group, stripe, 0.16, 0.02, L * 0.7, side * 0.13, 0.775, L * 0.44, Math.atan2(0.06, L * 0.68)); // down the bonnet,
      slab(group, stripe, 0.16, 0.02, 0.5, side * 0.13, 0.735, -L * 0.83, -0.5);          // and over the tail
      box(group, leather, 0.3, 0.24, 0.3, side * 0.22, 0.84, -L * 0.33);                  // two seats
      tube(group, chrome, 0.06, L * 0.7, side * (w / 2 - 0.12), 0.25, -L * 0.02, 'z');    // side pipes
      box(group, trim, 0.03, 0.12, 0.2, side * (w * 0.38 + 0.015), 0.56, L * 0.2);        // a vent behind each front wheel
      disc(group, TAIL, 0.05, 0.05, side * w * 0.3, 0.6, -L * 0.96);
      wheel(group, 0.31, 0.24, side * (w / 2 - 0.13), 0.31, L * 0.58, ALLOY);
      wheel(group, 0.34, 0.32, side * (w / 2 - 0.17), 0.34, -L * 0.56, ALLOY);            // fatter tyres at the back
    }
    box(group, trim, w * 0.6, 0.03, L * 0.4, 0, 0.8, -L * 0.2);                           // the open cockpit
    const mouth = disc(group, trim, 0.15, 0.08, 0, 0.5, L * 0.955);                       // the oval mouth
    mouth.scale.x = 2;
    const windscreen = box(group, glass, w * 0.6, 0.26, 0.03, 0, 0.93, L * 0.04);         // a low windscreen,
    windscreen.rotation.x = -0.5;
    box(group, chrome, w * 0.63, 0.035, 0.05, 0, 1.05, L * 0.04 - 0.06);                  // its chrome frame
    for (const side of [-1, 1]) box(group, chrome, 0.035, 0.28, 0.04, side * w * 0.31, 0.93, L * 0.04).rotation.x = -0.5;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 6, 14, Math.PI), chrome); // the roll hoop, behind the driver
    hoop.position.set(0.22, 0.86, -L * 0.44);
    group.add(hoop);
    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 12), trim);
    steering.position.set(0.22, 0.92, -L * 0.14);
    steering.rotation.x = -0.4;
    group.add(steering);
    group.userData = { body, animate: () => {}, livery: (evil) => stripe.color.setHex(evil ? 0xd4a531 : 0xf4f2ec) };
    return group;
  },

  // A rear-engined coupe (a classic Porsche 911): round lamps at the tips of wings that stand above a low
  // bonnet, a teardrop of a roof running down to the tail, wide hips, a whale tail with a rubber lip on the
  // engine's lid, and one red band across the back. It sits still
  rearengine: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.32;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const shell = new THREE.Shape();                                                      // the body, side on:
    shell.moveTo(-L * 0.96, 0.38);
    shell.lineTo(L * 0.9, 0.38);
    shell.quadraticCurveTo(L * 0.99, 0.4, L * 0.98, 0.52);                                // the chin,
    shell.quadraticCurveTo(L * 0.95, 0.62, L * 0.8, 0.66);                                // the nose,
    shell.lineTo(L * 0.32, 0.8);                                                          // the low bonnet,
    shell.lineTo(L * 0.08, 1.24);                                                         // the windscreen,
    shell.quadraticCurveTo(-L * 0.1, 1.32, -L * 0.3, 1.22);                               // the roof,
    shell.bezierCurveTo(-L * 0.6, 1.08, -L * 0.8, 0.9, -L * 0.97, 0.66);                  // and the teardrop of a tail
    const body = curved(group, paint, w * 0.84, shell, 0.04);
    curved(group, glass, w * 0.84 + 0.02, rounded([[L * 0.26, 0.86], [L * 0.09, 1.19], [-L * 0.22, 1.19], [-L * 0.58, 0.9], [-L * 0.5, 0.86]], 0.06), 0.01); // the side windows
    const windscreen = box(group, glass, w * 0.68, 0.56, 0.03, 0, 1.03, L * 0.2 + 0.06);
    windscreen.rotation.x = -0.85;
    slab(group, glass, w * 0.56, 0.03, 0.5, 0, 1.165, -L * 0.5, -0.4);                    // the rear window
    curved(group, paint, w, rounded([[-L * 0.3, 0.38], [L * 0.3, 0.38], [L * 0.3, 0.84], [-L * 0.3, 0.86]], 0.04), 0.04); // the doors
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.17);
      curved(group, paint, 0.34, rounded([[L * 0.2, 0.4], [L * 0.94, 0.4], [L * 0.99, 0.58], [L * 0.9, 0.76], [L * 0.3, 0.86], [L * 0.2, 0.8]], 0.08), 0.06, x); // the front wings, above the bonnet
      disc(group, LAMP, 0.115, 0.1, x, 0.67, L * 0.95).rotation.x = Math.PI / 2 - 0.3;    // a round lamp at each one's tip
      disc(group, chrome, 0.14, 0.07, x, 0.67, L * 0.94).rotation.x = Math.PI / 2 - 0.3;
      box(group, AMBER, 0.2, 0.05, 0.04, x, 0.48, L * 0.985);
      curved(group, paint, 0.42, rounded([[-L * 0.97, 0.4], [-L * 0.25, 0.4], [-L * 0.25, 0.86], [-L * 0.7, 0.88], [-L * 0.97, 0.68]], 0.1), 0.07, side * (w / 2 - 0.19)); // the wide hips
      wheel(group, R, 0.22, side * (w / 2 - 0.06), R, L * 0.62, ALLOY);
      wheel(group, R + 0.01, 0.28, side * (w / 2 - 0.08), R + 0.01, -L * 0.62, ALLOY);
      for (const z of [L * 0.62, -L * 0.62]) tube(group, chrome, R * 0.3, z > 0 ? 0.27 : 0.33, side * (w / 2 - 0.07), R, z, 'x'); // (the alloys' bright centres)
      box(group, trim, 0.09, 0.06, 0.1, side * (w / 2 + 0.03), 0.94, L * 0.26);           // mirrors
    }
    prism(group, paint, w * 0.6, [[-L * 0.56, 1.05], [-L * 0.96, 1.05], [-L * 0.96, 0.7], [-L * 0.56, 0.98]]); // the whale tail: its foot,
    box(group, paint, w * 0.9, 0.05, 0.54, 0, 1.07, -L * 0.76);                           // the tail itself,
    box(group, trim, w * 0.92, 0.07, 0.08, 0, 1.085, -L * 0.76 - 0.29);                   // and its rubber lip,
    for (const side of [-1, 1]) box(group, trim, 0.04, 0.07, 0.56, side * w * 0.455, 1.085, -L * 0.76 - 0.03); // round its sides too
    box(group, TAIL, w * 0.9, 0.09, 0.04, 0, 0.66, -L * 0.97 - 0.05);                     // one red band across the back
    box(group, trim, w + 0.02, 0.1, 0.1, 0, 0.44, L * 0.97);                              // black bumpers
    box(group, trim, w + 0.02, 0.1, 0.1, 0, 0.46, -L * 0.98);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A wedge of a supercar (a Lamborghini Countach): one flat wedge from a nose on the road to a roof barely
  // a metre up, air boxes on its shoulders, a huge wing across the tail, enormous back tyres under black
  // flares, and doors that go straight up. They open and shut
  wedge: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const B = w * 0.94; // (the body, inside its wheel-arch flares)
    const body = prism(group, paint, B, [[-L, 0.34], [L * 0.98, 0.34], [L, 0.44], [L * 0.3, 0.72], [L * 0.02, 1.03], [-L * 0.26, 1.05], [-L * 0.34, 0.9], [-L, 0.86]]);
    slab(group, glass, B * 0.8, 0.02, 0.62, 0, 0.89, L * 0.16, Math.atan2(0.31, L * 0.28)); // the windscreen, nearly flat
    prism(group, glass, B + 0.02, [[L * 0.26, 0.77], [L * 0.03, 1.0], [-L * 0.24, 1.01], [-L * 0.3, 0.9], [-L * 0.3, 0.77]]); // the side windows
    for (let i = 0; i < 4; i++) box(group, trim, B * 0.5, 0.02, 0.1, 0, 0.9 - i * 0.005, -L * (0.46 + i * 0.1)); // the engine deck's louvres
    box(group, trim, B * 0.94, 0.26, 0.04, 0, 0.68, -L - 0.01);                           // the tail panel
    box(group, trim, w * 0.96, 0.06, 0.26, 0, 0.31, L - 0.08);                            // a chin spoiler
    box(group, paint, w * 0.98, 0.05, 0.44, 0, 1.27, -L * 0.84);                          // the huge wing,
    const doors = [];
    for (const side of [-1, 1]) {
      box(group, paint, 0.05, 0.2, 0.5, side * w * 0.47, 1.19, -L * 0.84);                // its end plates,
      box(group, paint, 0.07, 0.36, 0.16, side * w * 0.3, 1.07, -L * 0.82).rotation.x = 0.3; // and its struts
      box(group, paint, 0.3, 0.16, L * 0.3, side * B * 0.34, 0.98, -L * 0.48);            // an air box on each shoulder,
      box(group, trim, 0.26, 0.12, 0.03, side * B * 0.34, 0.98, -L * 0.33 + 0.01);        // its mouth open to the front
      box(group, LAMP, w * 0.2, 0.04, 0.04, side * w * 0.3, 0.42, L * 0.99);              // slits of lamps in the nose
      box(group, TAIL, B * 0.26, 0.14, 0.05, side * B * 0.3, 0.7, -L - 0.02);
      for (const x of [0.06, 0.16]) disc(group, chrome, 0.04, 0.1, side * x, 0.42, -L - 0.02); // four pipes
      box(group, trim, 0.1, 0.1, 1.0, side * (w / 2 - 0.05), 0.72, L * 0.6);              // black flares over the wheels,
      box(group, trim, 0.12, 0.12, 1.12, side * (w / 2 - 0.06), 0.82, -L * 0.6);
      wheel(group, 0.31, 0.28, side * (w / 2 - 0.15), 0.31, L * 0.6, ALLOY);
      wheel(group, 0.36, 0.42, side * (w / 2 - 0.22), 0.36, -L * 0.6, ALLOY);             // and enormous back tyres
      // the door: hinged at its front, it swings straight up
      box(group, trim, 0.02, 0.34, L * 0.46, side * (B / 2 + 0.005), 0.6, -L * 0.03);     // (the way in, behind it)
      const door = new THREE.Group();
      door.position.set(side * (B / 2 + 0.02), 0.5, L * 0.22);
      group.add(door);
      box(door, paint, 0.03, 0.36, L * 0.5, 0, 0.1, -L * 0.25);
      prism(door, glass, 0.03, [[L * 0.04, 0.27], [-L * 0.19, 0.5], [-L * 0.46, 0.51], [-L * 0.5, 0.27]]);
      prism(door, trim, 0.035, [[-L * 0.1, 0.22], [-L * 0.46, 0.25], [-L * 0.46, 0.05]]); // (the duct let into it)
      doors.push(door);
    }
    group.userData = {
      body,
      animate: (t) => { // (shut for a while, then up, held, and down again)
        const open = Math.max(0, Math.min(1, Math.sin(t * 0.7) * 1.6 + 0.2)), ease = open * open * (3 - 2 * open);
        for (const door of doors) door.rotation.x = ease * 0.95;
      },
    };
    return group;
  },

  // A stainless gullwing (a DeLorean DMC-12): bare brushed steel over a dark lower band, a flat nose with
  // four square lamps, a black strip along each side, louvres over the engine, a grid of tail lamps, and
  // doors hinged in the roof that open like wings. They open and shut
  gullwing: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), grey = lambert(0x3d4046);
    const body = prism(group, paint, w, [[-L, 0.38], [L, 0.38], [L, 0.62], [L * 0.3, 0.8], [-L * 0.82, 0.84], [-L, 0.8]]);
    box(group, grey, w + 0.02, 0.16, L * 1.98, 0, 0.42, 0);                               // the dark lower band,
    box(group, grey, w * 0.98, 0.2, 0.06, 0, 0.5, L + 0.01);                              // and the nose's panel
    box(group, grey, w * 0.98, 0.24, 0.06, 0, 0.66, -L - 0.01);                           // and the tail's
    prism(group, trim, w * 0.84, [[L * 0.3, 0.8], [L * 0.04, 1.1], [-L * 0.3, 1.12], [-L * 0.44, 0.84]]); // the cabin, inside
    box(group, paint, 0.36, 0.05, L * 0.36, 0, 1.125, -L * 0.13);                         // the spine of the roof, between the doors
    slab(group, glass, w * 0.8, 0.03, 0.64, 0, 0.965, L * 0.17, Math.atan2(0.3, L * 0.26)); // the windscreen
    prism(group, paint, w * 0.88, [[-L * 0.3, 1.13], [-L * 0.82, 0.86], [-L * 0.82, 0.84], [-L * 0.3, 0.84]]); // the engine's cover,
    const fall = Math.atan2(0.27, L * 0.52);
    for (let i = 0; i < 5; i++) slab(group, trim, w * 0.62, 0.03, 0.12, 0, 1.11 - i * 0.052, -L * (0.36 + i * 0.1), -fall); // louvred
    const doors = [];
    for (const side of [-1, 1]) {
      box(group, trim, 0.02, 0.05, L * 1.92, side * (w / 2 + 0.01), 0.66, 0);             // the black strip along the side
      for (const x of [0.27, 0.4]) box(group, LAMP, w * 0.11, 0.09, 0.03, side * w * x, 0.52, L + 0.04); // four square lamps
      box(group, AMBER, 0.13, 0.15, 0.04, side * w * 0.42, 0.67, -L - 0.04);              // the grid of tail lamps
      box(group, TAIL, 0.26, 0.15, 0.04, side * w * 0.31, 0.67, -L - 0.04);
      box(group, LAMP, 0.1, 0.15, 0.04, side * w * 0.2, 0.67, -L - 0.04);
      wheel(group, 0.31, 0.24, side * (w / 2 - 0.06), 0.31, L * 0.62, ALLOY);
      wheel(group, 0.35, 0.28, side * (w / 2 - 0.07), 0.35, -L * 0.6, ALLOY);
      // the door: hinged along the roof's spine, it lifts like a wing
      box(group, trim, 0.02, 0.32, L * 0.56, side * (w / 2 + 0.004), 0.66, -L * 0.08);    // (the way in, behind it)
      const door = new THREE.Group();
      door.position.set(side * 0.18, 1.13, 0);
      group.add(door);
      box(door, paint, w * 0.25, 0.05, L * 0.36, side * w * 0.125, 0, -L * 0.13);         // its piece of the roof,
      const pane = box(door, glass, 0.03, 0.4, L * 0.56, side * (w * 0.375 - 0.18 + 0.01), -0.145, -L * 0.08); // its window, leaning in,
      pane.rotation.z = side * 0.73;
      box(door, paint, 0.03, 0.4, L * 0.62, side * (w / 2 + 0.015 - 0.18), -0.49, -L * 0.08); // and its panel
      box(door, trim, 0.035, 0.05, L * 0.62, side * (w / 2 + 0.017 - 0.18), -0.47, -L * 0.08);
      doors.push([door, side]);
    }
    group.userData = {
      body,
      garageOnly: true, // (its doors move in the garage and on the car card only: the road draws it with them shut: render/cars.js)
      animate: (t) => {
        const open = Math.max(0, Math.min(1, Math.sin(t * 0.6) * 1.6 + 0.3)), ease = open * open * (3 - 2 * open);
        for (const [door, side] of doors) door.rotation.z = side * ease * 1.15;
      },
    };
    return group;
  },

  // A centre-seat hypercar (a McLaren F1): low, with the cabin pushed forward under a bubble of glass you can
  // see into: the driver in the middle, a seat set back at each shoulder. An air scoop on the roof feeds the
  // engine behind, a spine running back from it; four round tail lamps. It sits still
  centreseat: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), trim = lambert(TRIM), chrome = lambert(CHROME);
    const canopy = new THREE.MeshLambertMaterial({ color: 0x3a4658, transparent: true, opacity: 0.55, depthWrite: false });
    const body = curved(group, paint, w, rounded([[-L * 0.97, 0.36], [L * 0.9, 0.36], [L * 0.98, 0.46], [L * 0.9, 0.56], [L * 0.4, 0.68], [-L * 0.2, 0.8], [-L * 0.92, 0.8], [-L * 0.97, 0.6]], 0.08), 0.05);
    box(group, trim, w * 0.5, 0.03, L * 0.56, 0, 0.82, L * 0.08).rotation.x = 0.1;        // the cabin's floor
    box(group, lambert(0xa3261e), 0.3, 0.34, 0.16, 0, 0.94, -L * 0.04);                   // the driver's seat, in the middle,
    for (const side of [-1, 1]) box(group, lambert(0x6b6258), 0.24, 0.3, 0.16, side * 0.31, 0.92, -L * 0.14); // a passenger's each side, set back
    blob(group, WHITE, 0.11, 0.12, 0.12, 0, 1.04, L * 0.02);                              // the driver's helmet
    blob(group, canopy, w * 0.33, 0.44, L * 0.44, 0, 0.74, L * 0.1).renderOrder = 2;      // the bubble of glass over them
    box(group, paint, 0.24, 0.1, 0.5, 0, 1.17, -L * 0.1);                                 // the roof's air scoop,
    box(group, trim, 0.19, 0.07, 0.03, 0, 1.17, -L * 0.1 + 0.25);                         // its mouth,
    prism(group, paint, 0.22, [[-L * 0.1, 1.2], [-L * 0.2, 1.2], [-L * 0.92, 0.88], [-L * 0.92, 0.84], [-L * 0.1, 0.84]]); // and the spine behind it
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) box(group, trim, w * 0.2, 0.02, 0.08, side * w * 0.2, 0.86, -L * (0.5 + i * 0.12)); // the engine's vents
    for (const side of [-1, 1]) {
      blob(group, paint, 0.27, 0.2, 0.62, side * (w / 2 - 0.27), 0.52, L * 0.56);         // a hump over each front wheel,
      blob(group, paint, 0.31, 0.27, 0.72, side * (w / 2 - 0.3), 0.62, -L * 0.55);        // and a haunch over each back one
      for (const x of [0.27, 0.37]) disc(group, LAMP, 0.065, 0.08, side * w * x, 0.6, L * 0.8).rotation.x = Math.PI / 2 - 0.6; // twin lamps
      box(group, trim, 0.03, 0.16, 0.42, side * (w / 2 + 0.005), 0.6, -L * 0.2);          // an intake in each flank
      for (const x of [0.2, 0.32]) disc(group, TAIL, 0.06, 0.05, side * w * x, 0.68, -L * 0.97 - 0.06); // four round tail lamps
      for (const x of [0.05, 0.14]) disc(group, chrome, 0.035, 0.08, side * x, 0.5, -L * 0.97 - 0.06); // four pipes in the middle
      box(group, paint, 0.14, 0.07, 0.1, side * w * 0.36, 0.98, L * 0.3);                 // mirrors, out on stalks
      wheel(group, 0.32, 0.24, side * (w / 2 - 0.07), 0.32, L * 0.6, ALLOY);
      wheel(group, 0.34, 0.3, side * (w / 2 - 0.09), 0.34, -L * 0.6, ALLOY);
    }
    box(group, trim, w * 0.84, 0.22, 0.04, 0, 0.66, -L * 0.97 - 0.04);                    // the tail's black mesh
    box(group, trim, w * 0.9, 0.05, 0.2, 0, 0.33, L * 0.95);                              // a splitter
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A panda coupe (a Toyota Sprinter Trueno AE86): a boxy little hatchback in two tones, the livery over
  // black, with lamps that pop up out of the bonnet, black bumpers, a lip on its tail and dark eight-spoke
  // wheels. Its lamps wink
  pandacoupe: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.3;
    const paint = lambert(car.color), glass = lambert(GLASS), black = lambert(0x18181b), gun = lambert(0x55585e);
    const body = curved(group, paint, w, rounded([[-L * 0.97, 0.5], [L * 0.97, 0.5], [L * 0.97, 0.74], [L * 0.3, 0.8], [-L * 0.97, 0.82]], 0.03), 0.03);
    box(group, black, w + 0.03, 0.2, L * 1.96, 0, 0.42, 0);                               // black below the waist: the panda's other half
    box(group, black, w + 0.06, 0.16, 0.14, 0, 0.46, L + 0.0);                            // black bumpers
    box(group, black, w + 0.06, 0.16, 0.14, 0, 0.46, -L - 0.0);
    prism(group, glass, w * 0.86, [[L * 0.3, 0.83], [L * 0.08, 1.27], [-L * 0.32, 1.29], [-L * 0.8, 0.87]]); // the glasshouse, a hatch at its back
    box(group, paint, w * 0.88, 0.06, L * 0.42, 0, 1.3, -L * 0.12);                       // the roof
    box(group, black, w * 0.92, 0.05, 0.12, 0, 0.9, -L * 0.93);                           // a lip on the tail
    box(group, black, w * 0.56, 0.07, 0.03, 0, 0.66, L * 0.97 + 0.03);                    // a slot of a grille
    box(group, black, w * 0.5, 0.14, 0.03, 0, 0.7, -L * 0.97 - 0.03);                     // the tail's black panel
    const pods = [];
    for (const side of [-1, 1]) {
      prism(group, paint, 0.14, [[-L * 0.2, 1.3], [-L * 0.33, 1.3], [-L * 0.81, 0.86], [-L * 0.56, 0.86]], side * (w * 0.43 - 0.07)); // the hatch's pillars
      box(group, paint, 0.07, 0.44, 0.09, side * w * 0.43, 1.06, -L * 0.06);              // the door pillars
      const pod = new THREE.Group();                                                      // a lamp that pops up
      pod.position.set(side * w * 0.33, 0.8, L * 0.84);
      group.add(pod);
      box(pod, paint, 0.32, 0.14, 0.2, 0, 0, 0);
      box(pod, black, 0.28, 0.1, 0.02, 0, 0, 0.1);
      box(pod, LAMP, 0.22, 0.07, 0.02, 0, 0, 0.11);
      pods.push(pod);
      box(group, AMBER, w * 0.16, 0.05, 0.04, side * w * 0.34, 0.67, L * 0.97 + 0.03);    // the corner lamps under them
      box(group, TAIL, w * 0.22, 0.13, 0.04, side * w * 0.36, 0.7, -L * 0.97 - 0.03);
      box(group, black, 0.09, 0.07, 0.1, side * (w / 2 + 0.04), 0.92, L * 0.28);          // mirrors
      wheel(group, R, 0.2, side * (w / 2 - 0.04), R, L * 0.62, gun);
      wheel(group, R, 0.2, side * (w / 2 - 0.04), R, -L * 0.6, gun);
    }
    for (let i = 0; i < 5; i++) box(group, black, 0.02, 0.05 + (i % 2) * 0.04, 0.05, -(w / 2 + 0.035), 0.66, L * 0.12 - i * 0.09); // the shop's name on the driver's door
    group.userData = {
      body,
      animate: (t) => { // (up for most of the time; a wink now and then)
        const up = Math.max(0, Math.min(1, Math.sin(t * 0.8) * 4 + 3.2));
        for (const pod of pods) pod.position.y = 0.77 + up * 0.11;
      },
    };
    group.userData.animate(0);
    return group;
  },

  // A midnight coupe (a Nissan Skyline GT-R R34): square shoulders, a deep front bumper that is mostly
  // intake, a flat bonnet, boxy flares over the wheels, four round tail lamps, and a wing as tall as its
  // roof on two uprights. It sits still
  midnight: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM);
    const body = box(group, paint, w, 0.5, L * 1.94, 0, 0.63, 0);
    box(group, paint, w * 0.96, 0.05, L * 0.68, 0, 0.895, L * 0.62);                      // the flat bonnet,
    box(group, paint, w * 0.4, 0.03, L * 0.5, 0, 0.93, L * 0.56);                         // its bulge,
    box(group, paint, w * 0.96, 0.07, L * 0.36, 0, 0.905, -L * 0.79);                     // and the boot
    prism(group, glass, w * 0.84, [[L * 0.3, 0.88], [L * 0.06, 1.31], [-L * 0.36, 1.33], [-L * 0.66, 0.9]]); // the glasshouse
    box(group, paint, w * 0.86, 0.06, L * 0.44, 0, 1.34, -L * 0.15);                      // the roof
    box(group, paint, w + 0.04, 0.3, 0.2, 0, 0.48, L - 0.04);                             // the deep front bumper,
    box(group, trim, w * 0.46, 0.18, 0.04, 0, 0.46, L + 0.06);                            // mostly intake,
    box(group, trim, w * 0.38, 0.06, 0.04, 0, 0.78, L - 0.0);                             // a slot of a grille above it
    box(group, trim, w * 0.98, 0.04, 0.16, 0, 0.32, L + 0.02);                            // and a splitter under it
    box(group, paint, w + 0.04, 0.26, 0.16, 0, 0.5, -L + 0.04);                           // the back bumper
    box(group, trim, w * 0.92, 0.2, 0.03, 0, 0.76, -L * 0.97 - 0.01);                     // the tail's panel
    box(group, paint, w * 0.92, 0.05, 0.3, 0, 1.36, -L * 0.86);                           // the wing, as tall as the roof,
    box(group, paint, w * 0.8, 0.03, 0.2, 0, 1.12, -L * 0.86);                            // a second blade under it,
    for (const side of [-1, 1]) {
      box(group, paint, 0.05, 0.44, 0.22, side * w * 0.34, 1.15, -L * 0.86);              // on two uprights,
      box(group, paint, 0.04, 0.12, 0.34, side * w * 0.46, 1.33, -L * 0.86);              // with end plates
      prism(group, paint, 0.14, [[-L * 0.24, 1.34], [-L * 0.37, 1.34], [-L * 0.67, 0.9], [-L * 0.46, 0.9]], side * (w * 0.42 - 0.07)); // the rear pillars
      box(group, paint, 0.07, 0.44, 0.09, side * w * 0.42, 1.1, -L * 0.04);               // the door pillars
      box(group, LAMP, w * 0.2, 0.11, 0.05, side * w * 0.35, 0.78, L - 0.01);             // angular lamps
      box(group, trim, w * 0.15, 0.12, 0.04, side * w * 0.38, 0.44, L + 0.06);            // the bumper's side intakes
      disc(group, TAIL, 0.1, 0.05, side * w * 0.36, 0.76, -L * 0.97 - 0.03);              // four round tail lamps:
      disc(group, TAIL, 0.075, 0.05, side * w * 0.2, 0.76, -L * 0.97 - 0.03);             // the outer pair the bigger
      for (const z of [0.62, -0.6]) box(group, paint, 0.09, 0.14, 0.95, side * (w / 2 + 0.01), 0.74, L * z); // boxy flares
      box(group, trim, 0.06, 0.1, L * 0.9, side * (w / 2 + 0.01), 0.39, 0);               // side skirts
      box(group, paint, 0.1, 0.08, 0.1, side * (w / 2 + 0.05), 0.98, L * 0.27);           // mirrors
      wheel(group, R, 0.26, side * (w / 2 - 0.03), R, L * 0.62, ALLOY);
      wheel(group, R, 0.26, side * (w / 2 - 0.03), R, -L * 0.6, ALLOY);
    }
    disc(group, chrome, 0.07, 0.12, -w * 0.3, 0.38, -L - 0.03);                           // one big pipe
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A rally wedge (a Lancia Stratos): hardly longer than it is wide, a wedge of a nose, a windscreen that
  // wraps round like a visor, a spoiler on the roof's back edge and a duck tail, fat wings, yellow wheels, a
  // bank of four spot lamps on the nose, and a green and a red band across it. It sits still
  rallywedge: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl;
    const paint = lambert(car.color), trim = lambert(TRIM), green = lambert(0x1f8a4c), red = lambert(0xd0202a), gold = lambert(0xe6c15a);
    const visor = new THREE.MeshLambertMaterial({ color: GLASS, side: THREE.DoubleSide });
    const B = w * 0.86;
    const body = prism(group, paint, B, [[-L, 0.36], [L * 0.96, 0.36], [L, 0.42], [L * 0.34, 0.72], [-L * 0.36, 0.9], [-L * 0.84, 0.88], [-L, 1.0], [-L, 0.4]]);
    prism(group, trim, B * 0.7, [[L * 0.3, 0.74], [L * 0.08, 1.04], [-L * 0.3, 1.06], [-L * 0.36, 0.86]]); // the cabin, inside
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(B * 0.34, B * 0.5, 0.4, 18, 1, true, -1.35, 2.7), visor); // the visor: one curve of glass
    glass.position.set(0, 0.9, L * 0.33 - B * 0.42);
    glass.rotation.x = -0.3;
    group.add(glass);
    box(group, paint, B * 0.68, 0.06, L * 0.4, 0, 1.08, -L * 0.14);                       // the roof,
    box(group, paint, B * 0.74, 0.34, 0.12, 0, 0.94, -L * 0.34);                          // the bulkhead behind the seats,
    box(group, paint, B * 0.8, 0.04, 0.18, 0, 1.17, -L * 0.37);                           // and the spoiler over its back edge
    for (const side of [-1, 1]) box(group, paint, 0.04, 0.1, 0.14, side * B * 0.36, 1.12, -L * 0.37);
    for (let i = 0; i < 4; i++) box(group, trim, B * 0.56, 0.02, 0.09, 0, 0.905, -L * (0.46 + i * 0.09)); // the engine cover's slats
    const rise = Math.atan2(0.3, L * 0.66);
    slab(group, green, B * 0.98, 0.02, 0.16, 0, 0.62, L * 0.6, rise);                     // a green and a red band across the nose,
    slab(group, red, B * 0.98, 0.02, 0.1, 0, 0.67, L * 0.48, rise);
    box(group, trim, B * 0.9, 0.22, 0.04, 0, 0.66, -L - 0.01);                            // the tail's panel
    for (const side of [-1, 1]) {
      box(group, green, 0.02, 0.1, L * 0.5, side * (B / 2 + 0.008), 0.62, -L * 0.02);     // and along the doors
      box(group, red, 0.02, 0.07, L * 0.5, side * (B / 2 + 0.008), 0.52, -L * 0.02);
      blob(group, paint, 0.26, 0.25, 0.52, side * (w / 2 - 0.25), 0.5, L * 0.52);         // the front wings,
      blob(group, paint, 0.33, 0.36, 0.62, side * (w / 2 - 0.3), 0.58, -L * 0.56);        // and the fat back ones
      for (const x of [0.13, 0.4]) {                                                      // four spot lamps in a row on the nose
        disc(group, LAMP, 0.1, 0.05, side * x, 0.7, L * 0.7);
        disc(group, trim, 0.12, 0.14, side * x, 0.7, L * 0.7 - 0.07);
      }
      box(group, LAMP, 0.2, 0.04, 0.04, side * B * 0.32, 0.45, L * 0.97);
      for (const x of [0.2, 0.34]) disc(group, TAIL, 0.06, 0.05, side * B * x, 0.68, -L - 0.03);
      wheel(group, 0.3, 0.24, side * (w / 2 - 0.12), 0.3, L * 0.54, gold);
      wheel(group, 0.33, 0.34, side * (w / 2 - 0.17), 0.33, -L * 0.56, gold);
    }
    box(group, trim, w * 0.66, 0.05, 0.05, 0, 0.6, L * 0.7 - 0.06);                       // the lamps' bar
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A safari wagon (a Land Rover Defender 110): flat panels and square corners, a raised bonnet between flat
  // wings with the spare wheel lying on it, an upright windscreen, a white roof with little windows along its
  // edge, a rack on top with a ladder up the back to it, and a snorkel up the windscreen pillar. It sits still
  safari: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.4;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), plate = lambert(0x9a9fa6), cream = lambert(0xe8e2cf);
    box(group, trim, w * 0.7, 0.16, L * 1.8, 0, 0.5, 0);                                  // the chassis
    const body = box(group, paint, w, 0.6, L * 1.96, 0, 0.86, 0);
    box(group, paint, w * 0.56, 0.1, L * 0.52, 0, 1.2, L * 0.7);                          // the raised bonnet,
    tube(group, TYRE, 0.36, 0.2, 0, 1.35, L * 0.68);                                      // the spare wheel lying on it
    tube(group, cream, 0.19, 0.22, 0, 1.35, L * 0.68);
    for (const side of [-1, 1]) box(group, plate, w * 0.18, 0.02, L * 0.46, side * w * 0.4, 1.17, L * 0.72); // chequer plate on the wings
    box(group, glass, w * 0.92, 0.55, L * 1.38, 0, 1.43, -L * 0.28);                      // the cabin's glass, upright all round
    box(group, paint, 0.06, 0.55, 0.04, 0, 1.43, L * 0.41 + 0.01);                        // (the windscreen in two)
    box(group, WHITE, w * 0.96, 0.1, L * 1.42, 0, 1.755, -L * 0.28);                      // the white roof
    box(group, trim, w * 0.9, 0.04, L * 1.2, 0, 1.84, -L * 0.3);                          // the roof rack: its floor,
    for (const z of [0.3, -0.9]) box(group, trim, w * 0.9, 0.12, 0.04, 0, 1.9, L * z);    // its ends,
    box(group, lambert(0x4d5a3a), 0.5, 0.2, 0.7, w * 0.16, 1.96, -L * 0.05);              // a kit bag on it,
    box(group, lambert(0x8a6a45), 0.6, 0.16, 0.5, -w * 0.12, 1.94, -L * 0.6);             // and a crate
    for (const side of [-1, 1]) {
      box(group, trim, 0.04, 0.12, L * 1.2, side * w * 0.45, 1.9, -L * 0.3);              // and its sides
      for (const z of [0.4, 0.12, -0.2, -0.56, -0.95]) box(group, paint, 0.08, 0.55, 0.1, side * w * 0.46, 1.43, L * z); // pillars
      box(group, paint, 0.06, 0.55, L * 0.28, side * w * 0.46, 1.43, -L * 0.76);          // the back's blank sides,
      box(group, glass, 0.03, 0.08, 0.5, side * (w * 0.48 + 0.005), 1.76, -L * 0.52);     // and the little windows in the roof's edge
      disc(group, LAMP, 0.11, 0.06, side * w * 0.36, 0.95, L * 0.98 + 0.02);              // round lamps,
      disc(group, AMBER, 0.05, 0.06, side * w * 0.36, 0.75, L * 0.98 + 0.02);
      disc(group, TAIL, 0.06, 0.05, side * w * 0.42, 0.9, -L * 0.98 - 0.02);
      for (const z of [0.62, -0.58]) box(group, trim, 0.08, 0.09, 1.05, side * (w / 2 + 0.02), 0.9, L * z); // arch flares
      box(group, trim, 0.1, 0.14, 0.1, side * (w / 2 + 0.06), 1.3, L * 0.4);              // mirrors
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, L * 0.62, cream);
      wheel(group, R, 0.26, side * (w / 2 - 0.05), R, -L * 0.58, cream);
      box(group, trim, 0.03, 1.3, 0.03, w * 0.22 + side * 0.17, 1.25, -L * 0.98 - 0.05);  // the ladder up the back
    }
    for (let i = 0; i < 5; i++) box(group, trim, 0.34, 0.03, 0.03, w * 0.22, 0.75 + i * 0.26, -L * 0.98 - 0.05);
    box(group, trim, w * 0.5, 0.36, 0.04, 0, 0.92, L * 0.98 + 0.01);                      // the grille's black panel
    box(group, trim, w + 0.04, 0.14, 0.16, 0, 0.6, L + 0.02);                             // plain bumpers
    box(group, trim, w + 0.04, 0.14, 0.12, 0, 0.6, -L - 0.0);
    box(group, trim, 0.09, 0.09, 0.44, -(w / 2 + 0.03), 1.12, L * 0.6);                   // the snorkel: along the wing,
    box(group, trim, 0.09, 0.86, 0.09, -(w / 2 + 0.03), 1.52, L * 0.42);                  // up the pillar,
    box(group, trim, 0.13, 0.13, 0.18, -(w / 2 + 0.03), 1.98, L * 0.42 + 0.03);           // to its head above the roof
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A wide truck (an AM General Hummer H1): very wide and squat, its wheels right out at the corners, a flat
  // bonnet with vents, a grille of upright slots with the lamps set in it, a flat windscreen in two, amber
  // lamps along the roof's front edge and two long aerials. It sits still
  widetruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.46;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), dark = lambert(0x3a3d42);
    box(group, trim, w * 0.5, 0.2, L * 1.8, 0, 0.62, 0);                                  // the chassis, high off the road
    const body = box(group, paint, w, 0.55, L * 1.96, 0, 0.98, 0);
    box(group, paint, w * 0.94, 0.06, L * 0.56, 0, 1.28, L * 0.69);                       // the flat bonnet,
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) box(group, trim, w * 0.2, 0.02, 0.05, side * w * 0.2, 1.315, L * (0.6 + i * 0.05)); // its vents
    box(group, glass, w * 0.84, 0.48, L * 1.1, 0, 1.5, -L * 0.3);                         // the cabin
    box(group, paint, w * 0.86, 0.08, L * 1.12, 0, 1.78, -L * 0.3);                       // its roof
    box(group, paint, 0.07, 0.48, 0.04, 0, 1.5, L * 0.25 + 0.01);                         // (the flat windscreen in two)
    for (let i = -2; i <= 2; i++) box(group, AMBER, 0.09, 0.05, 0.06, i * w * 0.14, 1.845, L * 0.2); // amber lamps along the roof
    for (let i = -3; i <= 3; i++) box(group, trim, 0.08, 0.3, 0.04, i * w * 0.062, 1.0, L * 0.98 + 0.01); // the grille's seven slots
    for (const side of [-1, 1]) {
      for (const z of [0.24, -0.06, -0.4, -0.84]) box(group, paint, 0.09, 0.48, 0.1, side * w * 0.42, 1.5, L * z); // pillars
      disc(group, LAMP, 0.1, 0.06, side * w * 0.32, 1.0, L * 0.98 + 0.02);                // the lamps, in the grille's panel
      box(group, AMBER, 0.12, 0.07, 0.04, side * w * 0.43, 1.0, L * 0.98 + 0.01);
      box(group, TAIL, 0.12, 0.14, 0.04, side * w * 0.44, 1.0, -L * 0.98 - 0.01);
      box(group, trim, 0.06, 0.2, 0.3, side * w * 0.3, 0.82, L + 0.12);                   // the towing hooks' brackets
      for (const z of [0.66, -0.64]) box(group, trim, 0.1, 0.1, 1.2, side * (w / 2 - 0.02), 1.0, L * z); // the arches' black lips
      box(group, trim, 0.12, 0.2, 0.1, side * (w / 2 + 0.08), 1.45, L * 0.26);            // big mirrors
      tube(group, trim, 0.014, 1.3, side * w * 0.4, 2.4, -L * 0.82);                      // two long aerials
      wheel(group, R, 0.36, side * (w / 2 - 0.16), R, L * 0.66, dark);                    // the wheels, out at the corners
      wheel(group, R, 0.36, side * (w / 2 - 0.16), R, -L * 0.64, dark);
    }
    box(group, trim, w + 0.02, 0.18, 0.2, 0, 0.78, L + 0.04);                             // bumpers
    box(group, trim, w + 0.02, 0.18, 0.16, 0, 0.78, -L - 0.02);
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A polygon truck (a Tesla Cybertruck): one peaked triangle of flat steel from the nose to the tail, the
  // glass a dark band under the peak, the bed's cover running down the back slope, black angular arches, and
  // a bar of light across each end. It sits still
  polytruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.46;
    const paint = lambert(car.color), glass = lambert(0x14181f), trim = lambert(TRIM), slats = lambert(0x7d8288), gun = lambert(0x4a4d52);
    const body = prism(group, paint, w, [[-L, 0.52], [L * 0.9, 0.52], [L, 0.62], [L, 0.98], [L * 0.08, 1.8], [-L, 1.24]]);
    prism(group, glass, w + 0.02, [[L * 0.5, 1.27], [L * 0.1, 1.63], [-L * 0.28, 1.48], [-L * 0.28, 1.22], [L * 0.4, 1.2]]); // the side glass
    const up = Math.atan2(0.82, L * 0.92), down = Math.atan2(0.56, L * 1.08);
    slab(group, glass, w * 0.86, 0.02, 1.22, 0, 1.59, L * 0.335, up);                     // the windscreen, all one slope with the bonnet,
    slab(group, glass, w * 0.8, 0.02, 0.92, 0, 1.72, -L * 0.11, -down);                   // the glass roof,
    slab(group, slats, w * 0.84, 0.02, L * 0.66, 0, 1.445, -L * 0.635, -down);            // and the bed's cover, down to the tail
    for (let i = 0; i < 6; i++) slab(group, trim, w * 0.84, 0.025, 0.03, 0, 1.6 - i * 0.056 - 0.02, -L * (0.33 + i * 0.108), -down);
    box(group, LAMP, w * 0.96, 0.035, 0.04, 0, 0.965, L + 0.005);                         // a bar of light across the nose,
    box(group, TAIL, w * 0.96, 0.04, 0.04, 0, 1.2, -L - 0.005);                           // and one across the tail
    box(group, trim, w * 1.0, 0.16, 0.1, 0, 0.6, L - 0.02);                               // black bumpers
    box(group, trim, w * 1.0, 0.16, 0.1, 0, 0.6, -L + 0.02);
    box(group, trim, w + 0.02, 0.1, L * 1.1, 0, 0.57, 0);                                 // and sills
    for (const side of [-1, 1]) {
      for (const z of [L * 0.64, -L * 0.62]) {
        prism(group, trim, 0.1, [[z - 0.8, 0.52], [z - 0.56, 1.04], [z + 0.56, 1.04], [z + 0.8, 0.52]], side * (w / 2 - 0.035)); // the angular arches
        wheel(group, R, 0.32, side * (w / 2 - 0.13), R, z, gun);
      }
      box(group, trim, 0.14, 0.1, 0.12, side * (w / 2 + 0.07), 1.3, L * 0.44);            // mirrors
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A monster truck (Bigfoot, a Ford F-250): a pickup's body hoisted over tyres taller than a car, the axles,
  // springs and a forest of shock absorbers in plain view under it, a bar of lamps behind the cab and two flags
  // flying from the bed. It rocks on its springs
  monster: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const L = car.hl, R = 0.85, tread = 0.74, track = car.hw - tread / 2;
    const bw = 2.0, bl = L * 1.72, base = 1.78; // (the pickup itself, and how high it rides)
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), yellow = lambert(0xf2d21f), red = lambert(0xd8262b);
    const body = box(shell, paint, bw, 0.6, bl, 0, base + 0.3, 0);
    box(shell, paint, bw * 0.96, 0.08, bl * 0.3, 0, base + 0.64, bl * 0.34);              // the bonnet
    box(shell, glass, bw * 0.9, 0.5, bl * 0.24, 0, base + 0.85, bl * 0.06);               // the cab
    box(shell, paint, bw * 0.92, 0.08, bl * 0.25, 0, base + 1.14, bl * 0.06);             // its roof
    screen(shell, glass, bw * 0.88, 0.05, 0.6, 0, base + 0.86, bl * 0.2, 0.55);           // the windscreen
    box(shell, trim, bw * 0.9, 0.04, bl * 0.42, 0, base + 0.5, -bl * 0.28);               // the bed,
    box(shell, paint, bw, 0.3, 0.08, 0, base + 0.75, -bl / 2 + 0.04);                     // its tailgate,
    box(shell, chrome, bw * 0.86, 0.07, 0.07, 0, base + 1.3, -bl * 0.09);                 // and the bar of lamps behind the cab
    for (const x of [-0.6, -0.2, 0.2, 0.6]) disc(shell, LAMP, 0.11, 0.1, x, base + 1.43, -bl * 0.09);
    box(shell, chrome, bw * 0.74, 0.3, 0.05, 0, base + 0.34, bl / 2 + 0.01);              // the chrome grille
    box(shell, trim, bw * 0.44, 0.2, 0.06, 0, base + 0.34, bl / 2 + 0.015);
    box(shell, chrome, bw + 0.1, 0.16, 0.2, 0, base + 0.02, bl / 2 + 0.08);               // chrome bumpers
    box(shell, chrome, bw + 0.1, 0.16, 0.2, 0, base + 0.02, -bl / 2 - 0.08);
    box(shell, trim, bw * 0.5, 0.24, bl * 0.86, 0, base - 0.12, 0);                       // the frame under it
    const flags = [];
    for (const side of [-1, 1]) {
      box(shell, paint, 0.08, 0.3, bl * 0.42, side * (bw / 2 - 0.04), base + 0.75, -bl * 0.28); // the bed's sides
      box(shell, chrome, 0.07, 0.75, 0.07, side * bw * 0.4, base + 0.95, -bl * 0.09);     // the lamp bar's legs
      box(shell, LAMP, 0.26, 0.16, 0.05, side * bw * 0.38, base + 0.36, bl / 2 + 0.03);   // square lamps
      box(shell, TAIL, 0.12, 0.3, 0.05, side * bw * 0.44, base + 0.36, -bl / 2 - 0.01);
      box(shell, yellow, 0.02, 0.12, bl * 0.84, side * (bw / 2 + 0.01), base + 0.34, 0);  // a yellow flash down the side,
      box(shell, WHITE, 0.02, 0.05, bl * 0.84, side * (bw / 2 + 0.01), base + 0.2, 0);    // a white line under it
      tube(shell, chrome, 0.02, 1.0, side * bw * 0.42, base + 1.1, -bl * 0.46);           // a flag pole,
      const flag = new THREE.Group();
      flag.position.set(side * bw * 0.42, base + 1.42, -bl * 0.46);
      shell.add(flag);
      box(flag, side > 0 ? red : yellow, 0.02, 0.3, 0.5, 0, 0, -0.26);                    // and its flag
      flags.push(flag);
    }
    for (const z of [L * 0.6, -L * 0.6]) {
      tube(group, trim, 0.13, track * 2, 0, R, z, 'x');                                   // an axle,
      blob(group, trim, 0.34, 0.3, 0.3, 0, R, z);                                         // its differential,
      for (const side of [-1, 1]) {
        wheel(group, R, tread, side * track, R, z, chrome);                               // the tyres, taller than a car,
        box(group, lambert(0x8a8f96), 0.1, 0.07, 1.3, side * 0.6, R + 0.2, z);            // leaf springs,
        for (const dz of [-0.26, 0.26]) {                                                 // and a pair of shock absorbers a wheel
          const shock = tube(group, dz < 0 ? red : yellow, 0.055, 0.8, side * 0.7, R + 0.5, z + dz);
          shock.rotation.z = side * 0.3;
        }
        const arm = box(group, trim, 0.08, 0.08, 1.5, side * 0.34, R + 0.3, z * 0.56);    // a link from the axle to the frame
        arm.rotation.x = (z > 0 ? 1 : -1) * 0.42;
      }
    }
    group.userData = {
      body,
      animate: (t) => {
        shell.rotation.z = Math.sin(t * 1.4) * 0.035;
        shell.rotation.x = Math.sin(t * 1.9) * 0.018;
        shell.position.y = Math.sin(t * 2.8) * 0.03;
        flags.forEach((flag, i) => { flag.rotation.y = Math.sin(t * 6 + i * 2) * 0.35; });
      },
    };
    return group;
  },

  // A corrugated van (a Citroen H Van): a tall, square shed of a body ribbed all the way round, a flat
  // windscreen in two, and a short snout sloping down in front of it between round wings with a lamp on
  // each. It sits still
  corrugated: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.34;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const rib = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }); // (a rib's shadow, whatever the paint)
    const body = box(group, paint, w, 1.75, L * 1.52, 0, 1.375, -L * 0.24);
    box(group, paint, w * 0.94, 0.08, L * 1.5, 0, 2.28, -L * 0.24);                       // the roof's crown
    for (let i = 0; i < 10; i++) {                                                        // the ribs, all the way round
      for (const side of [-1, 1]) box(group, rib, 0.02, 0.045, L * 1.52, side * (w / 2 + 0.006), 0.64 + i * 0.165, -L * 0.24);
      box(group, rib, w, 0.045, 0.02, 0, 0.64 + i * 0.165, -L - 0.006);
    }
    box(group, glass, w * 0.86, 0.6, 0.04, 0, 1.8, L * 0.52 + 0.01);                      // the flat windscreen,
    box(group, paint, 0.06, 0.6, 0.05, 0, 1.8, L * 0.52 + 0.015);                         // in two
    taper(group, paint, [L * 0.5, w * 0.92, 0.5, 1.42], [L, w * 0.62, 0.5, 0.98]);        // the snout
    for (let i = 0; i < 5; i++) slab(group, rib, w * (0.84 - i * 0.05), 0.02, 0.04, 0, 1.36 - i * 0.085, L * (0.56 + i * 0.09), 0.72);
    box(group, trim, w * 0.42, 0.3, 0.04, 0, 0.74, L + 0.005);                            // its grille,
    for (const side of [-1, 1]) box(group, chrome, 0.22, 0.03, 0.03, side * 0.09, 0.78, L + 0.03).rotation.z = side * 0.5; // the two chevrons on it
    for (const side of [-1, 1]) {
      box(group, glass, 0.03, 0.5, L * 0.3, side * (w / 2 + 0.012), 1.78, L * 0.33);      // the cab's side windows
      box(group, trim, 0.025, 1.5, 0.03, side * (w / 2 + 0.012), 1.3, L * 0.12);          // the door's edge
      fender(group, paint, 0.47, 0.3, side * (w / 2 - 0.15), R, L * 0.72);                // round wings,
      blob(group, paint, 0.14, 0.14, 0.2, side * w * 0.39, 0.92, L * 0.78);               // a lamp on each
      disc(group, LAMP, 0.11, 0.05, side * w * 0.39, 0.92, L * 0.78 + 0.18);
      box(group, TAIL, 0.1, 0.16, 0.04, side * w * 0.42, 0.8, -L - 0.02);
      wheel(group, R, 0.22, side * (w / 2 - 0.08), R, L * 0.72);
      wheel(group, R, 0.22, side * (w / 2 - 0.1), R, -L * 0.5);
    }
    box(group, WHITE, w * 0.92, 0.09, 0.08, 0, 0.46, L + 0.04);                           // a white bumper
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A food truck (a Grumman Olson step van): a tall aluminium box with a sloping glass nose, a serving hatch
  // open in its kerb side under a striped awning, a counter under that and a menu board beside it, a roundel
  // on the other side, and a vent spinning on the roof
  foodtruck: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42, top = 2.7;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), red = lambert(0xd8402f), inside = lambert(0x15171c);
    const body = box(group, paint, w, top - 0.6, L * 1.62, 0, (top + 0.6) / 2, -L * 0.19);
    prism(group, paint, w, [[L * 0.6, 0.6], [L, 0.6], [L, 1.5], [L * 0.8, top], [L * 0.6, top]]); // the nose,
    slab(group, glass, w * 0.88, 0.03, 1.12, 0, 2.1, L * 0.9 + 0.03, Math.atan2(top - 1.5, L * 0.2)); // one great slope of windscreen
    box(group, WHITE, w + 0.02, 0.14, L * 1.98, 0, 0.92, 0);                              // a white band along its skirt
    box(group, trim, w * 0.5, 0.3, 0.04, 0, 1.15, L + 0.005);                             // the grille
    box(group, chrome, w + 0.04, 0.16, 0.14, 0, 0.62, L + 0.05);                          // bumpers
    box(group, chrome, w + 0.04, 0.12, 0.3, 0, 0.6, -L - 0.12);                           // (the back one a step)
    const K = -(w / 2 + 0.01), hatchZ = -L * 0.22, hatchL = L * 0.74; // (the kerb side, and the hatch in it)
    box(group, inside, 0.04, 0.9, hatchL, K, 1.95, hatchZ);                               // the serving hatch, open,
    box(group, lambert(0x8a8f96), 0.34, 0.05, hatchL + 0.1, K - 0.15, 1.48, hatchZ);      // the counter under it,
    box(group, lambert(0xf2d21f), 0.2, 0.2, 0.16, K - 0.16, 1.6, hatchZ + 0.5);           // (a few things on the counter)
    box(group, red, 0.1, 0.24, 0.1, K - 0.18, 1.62, hatchZ - 0.3);
    const awning = new THREE.Group();                                                     // and the striped awning over it
    awning.position.set(K, 2.46, hatchZ);
    awning.rotation.z = 0.32;
    group.add(awning);
    for (let i = 0; i < 8; i++) box(awning, i % 2 ? WHITE : red, 0.95, 0.04, hatchL / 8 + 0.002, -0.47, 0, (i - 3.5) * hatchL / 8);
    for (const z of [-1, 1]) box(group, chrome, 0.03, 0.03, 0.95, K - 0.44, 2.0, hatchZ + z * (hatchL / 2 - 0.03)).rotation.set(0, Math.PI / 2, -0.75); // its stays
    box(group, lambert(0x8a6a45), 0.04, 0.84, 0.64, K, 1.9, -L * 0.8);                    // the menu board: its frame,
    box(group, inside, 0.05, 0.74, 0.54, K - 0.002, 1.9, -L * 0.8);                       // its slate,
    for (let i = 0; i < 5; i++) box(group, WHITE, 0.055, 0.03, 0.2 + (i * 7 % 3) * 0.1, K - 0.003, 2.16 - i * 0.13, -L * 0.8 + 0.05); // and what is chalked on it
    tube(group, WHITE, 0.62, 0.03, w / 2 + 0.01, 1.85, -L * 0.2, 'x');                    // a roundel on the other side
    tube(group, red, 0.46, 0.04, w / 2 + 0.012, 1.85, -L * 0.2, 'x');
    tube(group, lambert(0xf2d21f), 0.2, 0.05, w / 2 + 0.014, 1.85, -L * 0.2, 'x');
    box(group, lambert(0x8a8f96), 0.6, 0.18, 0.6, -w * 0.12, top + 0.09, -L * 0.62);      // a hatch on the roof,
    tube(group, lambert(0x8a8f96), 0.14, 0.2, w * 0.14, top + 0.1, -L * 0.1);             // and the vent's stalk
    const vent = new THREE.Group();                                                       // (its head spins)
    vent.position.set(w * 0.14, top + 0.28, -L * 0.1);
    group.add(vent);
    tube(vent, chrome, 0.2, 0.16, 0, 0, 0);
    for (let i = 0; i < 6; i++) box(vent, trim, 0.03, 0.17, 0.44, 0, 0, 0).rotation.y = i * Math.PI / 6;
    for (const side of [-1, 1]) {
      box(group, glass, 0.03, 0.8, L * 0.2, side * (w / 2 + 0.012), 2.0, L * 0.69);       // the cab's side windows
      disc(group, LAMP, 0.12, 0.06, side * w * 0.36, 1.15, L + 0.02);
      box(group, TAIL, 0.12, 0.24, 0.04, side * w * 0.42, 1.2, -L - 0.01);
      box(group, trim, 0.1, 0.3, 0.1, side * (w / 2 + 0.1), 2.0, L * 0.84);               // mirrors
      wheel(group, R, 0.3, side * (w / 2 - 0.08), R, L * 0.66, WHITE);
      wheel(group, R, 0.36, side * (w / 2 - 0.1), R, -L * 0.56, WHITE);
    }
    group.userData = { body, animate: (t) => { vent.rotation.y = t * 4; } };
    return group;
  },

  // A motorhome (a 1970s Winnebago Brave): a slab-sided box with a brow jutting out over a big windscreen,
  // a stripe down each side with a W flying from it (orange on a Good one, gold on an Evil one), an air
  // conditioner on the roof, an awning rolled up along the kerb side and the spare on the back. It sits still
  motorhome: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.42;
    const paint = lambert(car.color), stripe = lambert(0xd9722a), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const body = box(group, paint, w, 2.05, L * 1.86, 0, 1.575, -L * 0.07);
    box(group, paint, w, 0.8, L * 0.14, 0, 0.95, L * 0.93);                               // the nose, under the windscreen
    prism(group, glass, w * 0.92, [[L * 0.86, 1.35], [L * 0.995, 1.35], [L * 0.9, 2.3], [L * 0.86, 2.3]]); // the big windscreen,
    box(group, paint, 0.07, 0.96, 0.06, 0, 1.82, L * 0.95).rotation.x = -0.3;             // in two,
    box(group, paint, w, 0.3, L * 0.2, 0, 2.45, L * 0.92);                                // and the brow jutting out over it
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, stripe, 0.02, 0.22, L * 1.96, x, 1.22, 0);                               // the stripe,
      for (let i = 0; i < 4; i++) box(group, stripe, 0.022, 0.12, 0.62, x, 1.62, L * 0.44 - i * 0.36).rotation.x = (i % 2 ? 1 : -1) * 0.95; // and the W flying from it
      for (const z of [0.62, -0.02, -0.56]) box(group, glass, 0.03, 0.52, L * (z > 0.5 ? 0.24 : 0.36), x, 2.0, L * z); // windows
      for (const k of [0.3, 0.41]) disc(group, LAMP, 0.1, 0.06, side * w * k, 0.98, L + 0.01); // twin round lamps
      box(group, TAIL, 0.14, 0.3, 0.04, side * w * 0.42, 1.0, -L - 0.01);
      box(group, trim, 0.1, 0.34, 0.1, side * (w / 2 + 0.12), 1.9, L * 0.9);              // mirrors
      wheel(group, R, 0.3, side * (w / 2 - 0.08), R, L * 0.62);
      wheel(group, R, 0.36, side * (w / 2 - 0.1), R, -L * 0.5);
      box(group, trim, 0.03, 1.5, 0.03, -w * 0.28 + side * 0.17, 1.9, -L - 0.04);         // a ladder up the back
    }
    for (let i = 0; i < 6; i++) box(group, trim, 0.34, 0.03, 0.03, -w * 0.28, 1.25 + i * 0.26, -L - 0.04);
    box(group, trim, 0.025, 1.5, 0.6, -(w / 2 + 0.012), 1.5, L * 0.3);                    // the door, on the kerb side
    box(group, paint, 0.03, 1.44, 0.54, -(w / 2 + 0.014), 1.5, L * 0.3);
    box(group, glass, 0.035, 0.4, 0.3, -(w / 2 + 0.015), 1.95, L * 0.3);
    tube(group, WHITE, 0.09, L * 1.2, -(w / 2 + 0.08), 2.5, -L * 0.2, 'z');               // the awning, rolled up
    box(group, trim, w * 0.42, 0.22, 0.04, 0, 0.98, L + 0.005);                           // the grille
    box(group, chrome, w + 0.04, 0.16, 0.14, 0, 0.6, L + 0.04);                           // bumpers
    box(group, chrome, w + 0.04, 0.16, 0.14, 0, 0.6, -L - 0.04);
    box(group, WHITE, 0.95, 0.26, 1.15, 0, 2.73, -L * 0.1);                               // the air conditioner on the roof,
    box(group, trim, 0.7, 0.05, 0.3, 0, 2.87, -L * 0.1 + 0.3);
    box(group, WHITE, 0.4, 0.1, 0.4, w * 0.2, 2.65, -L * 0.62);                           // and a vent
    disc(group, TYRE, 0.4, 0.2, w * 0.14, 1.3, -L - 0.1);                                 // the spare, on the back,
    disc(group, WHITE, 0.3, 0.22, w * 0.14, 1.3, -L - 0.1);                               // under its cover
    group.userData = { body, animate: () => {}, livery: (evil) => stripe.color.setHex(evil ? 0xd4a531 : 0xd9722a) };
    return group;
  },

  // A school bus (a Blue Bird conventional): yellow, its bonnet out in front between black wings, three black
  // rails down each side under a long row of windows, SCHOOL BUS over the windscreen between red and amber
  // lamps, and a stop sign on the driver's side that swings out, the red lamps flashing while it is out
  schoolbus: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), red = lambert(0xc8161d);
    const flashers = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0xff2a2a }));  // (the red lamps: a side each)
    const sign = lettered('SCHOOL BUS', '#111111', '#f2b410', 256, 48);
    const body = box(group, paint, w, 2.0, L * 1.66, 0, 1.8, -L * 0.17);
    box(group, paint, w * 0.9, 0.2, L * 1.62, 0, 2.88, -L * 0.17);                        // the roof's crown
    taper(group, paint, [L * 0.66, w * 0.8, 0.8, 1.75], [L, w * 0.64, 0.86, 1.5]);        // the bonnet, out in front
    box(group, trim, w * 0.42, 0.5, 0.05, 0, 1.16, L + 0.005);                            // its grille
    for (const y of [1.0, 1.16, 1.32]) box(group, chrome, w * 0.4, 0.04, 0.06, 0, y, L + 0.01);
    box(group, trim, w + 0.04, 0.22, 0.2, 0, 0.76, L + 0.06);                             // black bumpers
    box(group, trim, w + 0.04, 0.22, 0.2, 0, 0.9, -L - 0.06);
    box(group, glass, w * 0.88, 0.75, 0.05, 0, 2.18, L * 0.66 + 0.01);                    // the windscreen,
    box(group, paint, 0.06, 0.75, 0.06, 0, 2.18, L * 0.66 + 0.015);                       // in two
    for (const z of [L * 0.66 + 0.03, -L - 0.03]) {
      box(group, sign, w * 0.44, 0.22, 0.04, 0, 2.68, z).rotation.y = z < 0 ? Math.PI : 0; // SCHOOL BUS, front and back,
      for (const side of [-1, 1]) {
        disc(group, flashers[side > 0 ? 0 : 1], 0.1, 0.06, side * w * 0.41, 2.68, z);     // between red lamps
        disc(group, AMBER, 0.1, 0.06, side * w * 0.31, 2.68, z);                          // and amber ones
      }
    }
    box(group, glass, w * 0.5, 0.6, 0.04, 0, 2.15, -L - 0.01);                            // the back door's window,
    box(group, trim, w * 0.44, 1.7, 0.03, 0, 1.75, -L - 0.005);                           // and the door
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, glass, 0.03, 0.6, L * 1.44, x, 2.25, -L * 0.22);                         // the long row of windows,
      for (let i = 0; i <= 12; i++) box(group, paint, 0.04, 0.6, 0.09, x + side * 0.004, 2.25, -L * 0.94 + i * L * 0.12); // a post between each
      for (const y of [1.05, 1.45, 1.84]) box(group, trim, 0.03, 0.07, L * 1.64, x, y, -L * 0.17); // three black rails
      fender(group, trim, 0.64, 0.36, side * (w / 2 - 0.2), R, L * 0.82);                 // black wings
      disc(group, LAMP, 0.12, 0.06, side * w * 0.26, 1.24, L + 0.02);
      box(group, AMBER, 0.14, 0.08, 0.04, side * w * 0.26, 1.02, L + 0.02);
      box(group, TAIL, 0.14, 0.3, 0.04, side * w * 0.4, 1.3, -L - 0.01);
      box(group, trim, 0.04, 0.5, 0.04, side * w * 0.44, 1.9, L * 0.8);                   // mirrors, out on stalks over the wings
      box(group, trim, 0.14, 0.3, 0.05, side * w * 0.44, 2.2, L * 0.8);
      wheel(group, R, 0.34, side * (w / 2 - 0.1), R, L * 0.82, lambert(0x2a2c31));
      wheel(group, R, 0.5, side * (w / 2 - 0.18), R, -L * 0.52, lambert(0x2a2c31));
    }
    box(group, glass, 0.035, 1.3, 0.8, -(w / 2 + 0.014), 1.75, L * 0.5);                  // the door, on the kerb side
    const arm = new THREE.Group();                                                        // the stop sign: flat to the side, it swings out
    arm.position.set(w / 2 + 0.03, 1.55, L * 0.42);
    group.add(arm);
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 8), red);
    board.rotation.z = Math.PI / 2;
    board.rotation.x = Math.PI / 8;
    board.position.set(0.03, 0, -0.42);
    arm.add(board);
    box(arm, lettered('STOP', '#ffffff', '#c8161d', 128, 48), 0.05, 0.18, 0.46, 0.03, 0, -0.42);
    box(arm, trim, 0.03, 0.06, 0.1, 0.02, 0, -0.04);
    group.userData = {
      body,
      animate: (t) => { // (the arm out for a few seconds, the red lamps taking turns; then folded away)
        const out = Math.max(0, Math.min(1, Math.sin(t * 0.5) * 2.5 + 0.4)), ease = out * out * (3 - 2 * out);
        arm.rotation.y = -ease * Math.PI / 2;
        const turn = Math.sin(t * 9) > 0;
        flashers[0].color.setHex(out > 0.5 && !turn ? 0x5a1414 : 0xff2a2a);
        flashers[1].color.setHex(out > 0.5 && turn ? 0x5a1414 : 0xff2a2a);
      },
    };
    return group;
  },

  // A double decker (an AEC Routemaster): two decks of windows with a cream band between them, a half cab
  // for the driver beside the engine's bonnet, the radiator between them, a destination blind over the cab,
  // and at the back corner an open platform to hop on by, with its pole. It sits still
  doubledecker: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME), cream = lambert(0xf1e9cf), wood = lambert(0x4a3526);
    const body = box(group, paint, w, 1.75, L * 1.44, 0, 1.325, 0);                       // the lower deck
    box(group, paint, w, 2.05, L * 1.96, 0, 3.225, -L * 0.02);                            // the upper deck, over cab and platform alike
    box(group, paint, w * 0.92, 0.13, L * 1.9, 0, 4.31, -L * 0.02);                       // the roof's crown
    box(group, cream, w + 0.02, 0.16, L * 1.97, 0, 2.3, -L * 0.02);                       // the cream band between the decks
    // the front: the half cab on the driver's side, the bonnet beside it, the radiator between
    box(group, paint, w * 0.48, 0.75, L * 0.26, -w * 0.26, 0.825, L * 0.85);              // the cab, below its windows,
    box(group, glass, w * 0.46, 1.0, L * 0.25, -w * 0.26, 1.7, L * 0.85);                 // and its glass
    box(group, paint, 0.07, 1.0, 0.07, -w * 0.035, 1.7, L * 0.975);                       // (its corner post)
    box(group, paint, w * 0.52, 0.95, L * 0.27, w * 0.24, 0.93, L * 0.855);               // the bonnet,
    box(group, trim, w * 0.3, 0.62, 0.05, w * 0.1, 1.0, L * 0.99 + 0.005);                // the radiator,
    box(group, chrome, w * 0.32, 0.05, 0.06, w * 0.1, 1.33, L * 0.99 + 0.005);            // its chrome top,
    box(group, chrome, 0.1, 0.1, 0.06, w * 0.1, 1.1, L * 0.99 + 0.02);                    // and its badge
    box(group, lettered('24  CITY CENTRE', '#f2d21f', '#111111', 256, 56), w * 0.56, 0.34, 0.05, 0, 2.66, L * 0.96 + 0.01); // the destination blind
    box(group, glass, w * 0.9, 0.66, 0.04, 0, 3.5, L * 0.96 + 0.005);                     // the upper deck's front windows,
    box(group, paint, 0.07, 0.66, 0.05, 0, 3.5, L * 0.96 + 0.01);
    box(group, glass, w * 0.7, 0.6, 0.04, 0, 3.5, -L - 0.005);                            // and its back one
    // the back: the stairs' corner closed in on the driver's side, the platform open on the other
    box(group, paint, w * 0.5, 1.75, L * 0.28, -w * 0.25, 1.325, -L * 0.86);
    box(group, lambert(0x6a6f76), w, 0.16, L * 0.28, 0, 0.53, -L * 0.86);                 // the platform's floor,
    box(group, wood, w * 0.5, 1.6, 0.05, w * 0.25, 1.4, -L * 0.72 - 0.03);                // the bulkhead behind it,
    tube(group, chrome, 0.035, 1.6, w * 0.42, 1.4, -L * 0.8);                             // and its pole
    box(group, glass, w * 0.36, 0.6, 0.04, -w * 0.25, 1.7, -L - 0.005);
    const advert = lettered('CAR IDEAS', '#c8102e', '#f4f2ec', 512, 80);
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, glass, 0.03, 0.66, L * 1.84, x, 3.5, -L * 0.02);                         // the upper deck's windows,
      for (let i = 0; i <= 6; i++) box(group, paint, 0.04, 0.66, 0.1, x + side * 0.004, 3.5, -L * 0.93 + i * L * 0.305);
      const from = side > 0 ? -0.7 : -0.96, to = 0.7;                                     // the lower deck's (not across the platform)
      box(group, glass, 0.03, 0.7, L * (to - from), x, 1.72, L * (from + to) / 2);
      for (let i = 0; i <= 4; i++) box(group, paint, 0.04, 0.7, 0.1, x + side * 0.004, 1.72, L * (from + (to - from) * i / 4));
      box(group, advert, 0.03, 0.4, L * 1.1, x, 2.72, -L * 0.06).rotation.y = side > 0 ? 0 : Math.PI; // an advertisement along the side
      disc(group, LAMP, 0.12, 0.06, side * w * 0.39, 0.86, L * 0.99 + 0.02);
      box(group, TAIL, 0.1, 0.2, 0.04, side * w * 0.44, 1.0, -L - 0.01);
      fender(group, trim, 0.62, 0.3, side * (w / 2 - 0.15), R, L * 0.7);                  // black mudguards over the front wheels
      wheel(group, R, 0.3, side * (w / 2 - 0.08), R, L * 0.7, paint);
      wheel(group, R, 0.44, side * (w / 2 - 0.14), R, -L * 0.42, paint);
    }
    group.userData = { body, animate: () => {} };
    return group;
  },

  // A fire engine (an American LaFrance pumper): red, a flat-fronted cab under a white roof with a bar of
  // lights on it, a silver pump panel of gauges and outlets behind the cab, two hose reels above that, a bed
  // of folded hose at the back with a ladder racked over it, a bell on the bumper. Its lights flash
  fireengine: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.5;
    const paint = lambert(car.color), glass = lambert(GLASS), trim = lambert(TRIM), chrome = lambert(CHROME);
    const silver = lambert(0xb9bec4), gold = lambert(0xd4a531), hose = lambert(0xcbb37a), blue = lambert(0x2e6bb3), redCap = lambert(0xd8262b);
    const beacons = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    const body = box(group, paint, w, 1.2, L * 1.56, 0, 1.2, -L * 0.22);                  // the body
    box(group, paint, w, 1.3, L * 0.44, 0, 1.25, L * 0.78);                               // the cab, flat-fronted,
    box(group, glass, w * 0.94, 0.66, L * 0.42, 0, 2.23, L * 0.78);                       // glass all round,
    box(group, WHITE, w * 0.96, 0.1, L * 0.44, 0, 2.61, L * 0.78);                        // under a white roof
    box(group, paint, 0.08, 0.66, 0.06, 0, 2.23, L * 0.99);
    box(group, trim, w * 0.7, 0.07, 0.3, 0, 2.69, L * 0.8);                               // the bar of lights on it:
    for (const side of [-1, 1]) box(group, beacons[side > 0 ? 0 : 1], w * 0.26, 0.16, 0.26, side * w * 0.2, 2.8, L * 0.8); // red, a side each,
    box(group, LAMP, w * 0.1, 0.14, 0.24, 0, 2.79, L * 0.8);                              // white between them
    box(group, chrome, w * 0.36, 0.4, 0.05, 0, 1.2, L + 0.005);                           // the chrome grille,
    for (let i = -3; i <= 3; i++) box(group, trim, 0.02, 0.32, 0.03, i * w * 0.045, 1.2, L + 0.03);
    box(group, chrome, w + 0.08, 0.22, 0.34, 0, 0.72, L + 0.12);                          // a great chrome bumper,
    blob(group, chrome, 0.16, 0.18, 0.16, -w * 0.28, 0.98, L + 0.16);                     // and the bell on it
    box(group, trim, w * 0.84, 0.1, L * 0.7, 0, 1.85, -L * 0.56);                         // the hose bed, at the back,
    box(group, hose, w * 0.76, 0.2, L * 0.66, 0, 1.98, -L * 0.56);                        // the hose folded in it
    for (let i = 0; i < 7; i++) box(group, trim, w * 0.76, 0.21, 0.03, 0, 1.98, -L * (0.26 + i * 0.1));
    box(group, silver, w, 0.08, 0.34, 0, 0.64, -L - 0.12);                                // the back step
    for (const side of [-1, 1]) {
      const x = side * (w / 2 + 0.012);
      box(group, glass, 0.03, 0.6, L * 0.3, x, 2.2, L * 0.78);
      box(group, gold, 0.03, 0.07, L * 1.96, x, 0.95, 0);                                 // a gold line down the side
      box(group, silver, 0.04, 0.95, L * 0.26, x, 1.3, L * 0.4);                          // the pump panel:
      for (let i = 0; i < 3; i++) tube(group, WHITE, 0.08, 0.03, x + side * 0.02, 1.6, L * (0.32 + i * 0.08), 'x'); // its gauges,
      tube(group, chrome, 0.14, 0.16, x + side * 0.06, 1.14, L * 0.4, 'x');               // its big intake,
      tube(group, redCap, 0.09, 0.14, x + side * 0.05, 1.2, L * 0.32, 'x');               // and its outlets
      tube(group, blue, 0.09, 0.14, x + side * 0.05, 1.2, L * 0.48, 'x');
      for (const z of [0.08, -0.62]) box(group, silver, 0.035, 0.66, L * 0.26, x, 1.38, L * z); // the lockers' shutters
      tube(group, hose, 0.3, 0.46, side * w * 0.23, 2.12, L * 0.38, 'x');                 // a hose reel each side, above the pump,
      for (const k of [-1, 1]) tube(group, redCap, 0.37, 0.04, side * w * 0.23 + k * 0.25, 2.12, L * 0.38, 'x');
      for (const k of [0.3, 0.41]) disc(group, LAMP, 0.1, 0.06, side * w * k, 1.25, L + 0.02); // twin round lamps
      box(group, TAIL, 0.14, 0.3, 0.04, side * w * 0.42, 1.3, -L - 0.01);
      box(group, trim, 0.1, 0.36, 0.1, side * (w / 2 + 0.12), 2.1, L * 0.96);             // mirrors
      wheel(group, R, 0.34, side * (w / 2 - 0.1), R, L * 0.66, chrome);
      wheel(group, R, 0.5, side * (w / 2 - 0.18), R, -L * 0.52, chrome);
      box(group, silver, 0.06, 0.08, L * 1.3, w * 0.24 + side * 0.22, 2.42, -L * 0.3);    // the ladder, racked over the hose
    }
    for (let i = 0; i < 12; i++) box(group, silver, 0.44, 0.04, 0.05, w * 0.24, 2.42, -L * 0.92 + i * L * 0.112);
    for (const z of [0.2, -0.84]) box(group, trim, 0.06, 0.6, 0.06, w * 0.24, 2.1, L * z); // its posts
    group.userData = {
      body,
      animate: (t) => {
        const turn = Math.sin(t * 9) > 0;
        beacons[0].color.setHex(turn ? 0xff2a2a : 0x5a1414);
        beacons[1].color.setHex(turn ? 0x5a1414 : 0xff2a2a);
      },
    };
    return group;
  },
};

// An idea's model, as it stands in the lot and as it is driven: built at the vehicle's real size, and (one too
// wide for a lane: ideas.js `real`, `scale`) scaled down to the size it is driven at. Always with an animate
// (the game calls it every frame). Null: no model of that name
export const makeIdeaModel = (car) => {
  const build = IDEA_MODELS[car.model];
  if (!build) return null;
  const mesh = build(car.real ? { ...car, ...car.real } : car);
  if (car.scale) mesh.scale.setScalar(car.scale);
  mesh.userData.animate = mesh.userData.animate || (() => {});
  return mesh;
};
