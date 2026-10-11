// ---- the pickups' models (and the TANK RAGE target's) ------------------------------------------
// Shared by the game (render/items.js) and the power-ups page (powerups.js). Plain three.js:
// nothing here touches the game, so a page of its own can show them.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import BOLD from 'three/examples/fonts/helvetiker_bold.typeface.json';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });

export const TURBO_COLOR = 0x29e0ff;
// the colour of each pickup's pad (and its glow in the HUD)
export const PICKUP_COLOR = { turbo: TURBO_COLOR, ghost: 0xf0f0ff, wrench: 0xffa726, passenger: 0xff8fb1, mystery: 0xb36bff, radarDetector: 0xff3b30, siren: 0x2060ff,
  badGas: 0x6b7a2a, heavyMass: 0x9aa0a8, timePlus: 0x2ecc40, timeMinus: 0xe0302a,
  cash5: 0x2fbf4a, cash10: 0xffd21f, cash20: 0xe0302a, armour: 0x8fa3b8, bigSplash: 0x29b6f6, butterfingers: 0xf5d76e };
// a part of a pickup model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
// An inflatable crash-test dummy, sat on the ground with its legs stretched out in front (its seat
// and heels level, at y = 0, facing +z): glossy purple vinyl, puffed up round every part, with
// yellow joints, hands, boots and chest band, purple-and-yellow quartered targets on its head,
// shoulders and knees, a seam ring at its neck, wrists and ankles, and a valve on its back.
// No face. It stands about 1.1 m tall. (The inflatable passenger: the pickup, and the one riding
// on the car's roof: render/cars.js)
export const makeCrashDummy = () => {
  const group = new THREE.Group();
  const vinyl = (color) => new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0x777777 });
  const purple = vinyl(0x7b3fd1), yellow = vinyl(0xffd21f);
  const target = (() => { // a quartered target, purple and yellow
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    for (let q = 0; q < 4; q++) {
      g.fillStyle = q % 2 ? '#5a2aa8' : '#ffd21f';
      g.beginPath();
      g.moveTo(32, 32);
      g.arc(32, 32, 31, q * Math.PI / 2, (q + 1) * Math.PI / 2);
      g.fill();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map, transparent: true });
  })();
  const puff = (material, r, length, x, y, z, rx = 0, rz = 0) => part(group, new THREE.CapsuleGeometry(r, length, 6, 14), material, x, y, z, rx, 0, rz);
  const ball = (material, r, x, y, z) => part(group, new THREE.SphereGeometry(r, 16, 12), material, x, y, z);
  const seam = (r, x, y, z, rx = 0, rz = 0) => part(group, new THREE.TorusGeometry(r, 0.018, 6, 18), yellow, x, y, z, rx, 0, rz);
  const mark = (r, x, y, z, ry) => part(group, new THREE.CircleGeometry(r, 20), target, x, y, z, 0, ry);
  const seat = ball(purple, 0.24, 0, 0.17, -0.02);                                   // the seat, sat on the ground
  seat.scale.set(1.15, 0.72, 1);
  puff(purple, 0.22, 0.26, 0, 0.5, -0.06);                                           // the puffed-up torso...
  puff(yellow, 0.235, 0.01, 0, 0.56, -0.06);                                         // ...its chest band
  seam(0.075, 0, 0.82, -0.06, Math.PI / 2);                                          // neck seam
  const head = ball(purple, 0.19, 0, 0.98, -0.05);                                   // head (no face)
  head.scale.set(1, 1.1, 1);
  part(group, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), yellow, 0, 0.6, -0.31, Math.PI / 2); // the valve, on its back
  for (const side of [-1, 1]) {
    mark(0.08, side * 0.19, 0.99, -0.05, side * Math.PI / 2);                         // targets on the head...
    ball(yellow, 0.1, side * 0.27, 0.7, -0.06);                                       // shoulders...
    mark(0.065, side * 0.372, 0.7, -0.06, side * Math.PI / 2);                        // ...with targets
    puff(purple, 0.075, 0.3, side * 0.33, 0.47, -0.02, 0, side * 0.25);               // arms, down by its sides...
    seam(0.07, side * 0.37, 0.29, -0.01, 0, side * 0.25);                             // ...wrist seams...
    ball(yellow, 0.075, side * 0.39, 0.2, 0.0);                                       // ...hands on the ground
    puff(purple, 0.105, 0.62, side * 0.12, 0.12, 0.4, Math.PI / 2);                   // legs, stretched out...
    ball(yellow, 0.11, side * 0.12, 0.13, 0.42);                                      // ...knees...
    part(group, new THREE.CircleGeometry(0.065, 20), target, side * 0.12, 0.245, 0.42, -Math.PI / 2); // ...with targets, facing up
    seam(0.1, side * 0.12, 0.12, 0.78);                                               // ankle seams...
    puff(yellow, 0.085, 0.12, side * 0.12, 0.2, 0.86);                                // ...and boots, toes up
  }
  return group;
};

// each pickup is a little model of what it does, about 1.5 m across, centred on the origin
export const PICKUP_MODELS = {
  // a turbocharger: a snail-shell compressor housing with its wheel showing, an inlet pipe
  // on the front, the turbine housing behind, and an exhaust flange
  turbo: () => {
    const group = new THREE.Group();
    const steel = lambert(0xb8bcc4), dark = lambert(0x4a4e57), glow = new THREE.MeshBasicMaterial({ color: TURBO_COLOR });
    part(group, new THREE.TorusGeometry(0.42, 0.26, 10, 24), steel, 0, 0, 0.1);          // compressor snail
    part(group, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), glow, 0, 0, 0.3, Math.PI / 2); // the wheel's glowing eye
    for (let i = 0; i < 6; i++) { // compressor blades
      part(group, new THREE.BoxGeometry(0.08, 0.5, 0.06), dark, 0, 0, 0.34, 0, 0, i * Math.PI / 6);
    }
    part(group, new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), steel, 0, 0, 0.6, Math.PI / 2);  // inlet pipe
    part(group, new THREE.CylinderGeometry(0.34, 0.34, 0.5, 14), dark, 0, 0, -0.35, Math.PI / 2); // turbine housing
    part(group, new THREE.BoxGeometry(0.9, 0.16, 0.5), dark, 0, -0.5, -0.3);                       // exhaust flange
    part(group, new THREE.CylinderGeometry(0.18, 0.18, 0.4, 10), steel, 0.5, 0.3, -0.3, 0, 0, Math.PI / 2); // oil line
    return group;
  },
  // a cartoon ghost, solid: one smooth sheet (a domed head flowing down into a flared skirt) whose
  // hem hangs in wavy points, stubby arms raised (boo), big oval eyes and an open mouth. It glows a
  // little of its own, so it still shows at night
  ghost: () => {
    const group = new THREE.Group();
    const sheet = new THREE.MeshLambertMaterial({ color: 0xf4f4ff, emissive: 0x8890c0, emissiveIntensity: 0.3, side: THREE.DoubleSide });
    const ink = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    const profile = [[0, 0.98], [0.26, 0.94], [0.46, 0.82], [0.58, 0.62], [0.62, 0.38], [0.62, 0.1], [0.65, -0.2], [0.69, -0.4], [0.72, -0.56]];
    let cloth = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 70); // (open at the bottom: a sheet)
    // the hem: the skirt's lower part pulled down into seven wavy points
    const at = cloth.attributes.position;
    for (let i = 0; i < at.count; i++) {
      const y = at.getY(i);
      if (y > -0.15) continue;
      const depth = (-0.15 - y) / 0.41, a = Math.atan2(at.getZ(i), at.getX(i));
      at.setY(i, y - depth * 0.2 * (0.5 + 0.5 * Math.cos(a * 7)));
    }
    // (shaded smooth all the way round: the lathe's seam welded shut)
    cloth.deleteAttribute('uv');
    cloth.deleteAttribute('normal');
    cloth = mergeVertices(cloth);
    cloth.computeVertexNormals();
    part(group, cloth, sheet, 0, 0, 0);                                                        // the sheet
    for (const side of [-1, 1]) {
      part(group, new THREE.CapsuleGeometry(0.13, 0.32, 4, 10), sheet, side * 0.72, 0.18, 0.08, 0, 0, side * 0.9); // arms up
      const eye = part(group, new THREE.SphereGeometry(1, 12, 10), ink, side * 0.22, 0.48, 0.55);            // oval eyes
      eye.scale.set(0.1, 0.16, 0.06);
    }
    const mouth = part(group, new THREE.SphereGeometry(1, 12, 10), ink, 0, 0.18, 0.6);                         // an open mouth
    mouth.scale.set(0.12, 0.1, 0.05);
    return group;
  },
  // a combination spanner, flat on to the road (as the stopwatch and the shield are) and leaning: an open jaw at
  // the top, two prongs with a gap between them, set at an angle to the handle as a real one's is; a flat handle
  // tapering down from it; a ring with a hole through it at the bottom. Bright steel, its edges chamfered, with a
  // panel of the pickup's orange let into both faces of the handle. (It was a bar with a disc and a ring on it, all
  // orange, and edge on to the road: 0.2 m wide from behind until its spin brought it round, and its jaw a dark
  // block on a whole disc, not a gap.) As long as it was: 2.04 m, 1.5 times that on the road
  wrench: () => {
    const group = new THREE.Group(), wrench = new THREE.Group();
    // (bright, with a little light of its own, and a dark rim standing out all round it between its two faces: so its
    // outline shows on a pale road as on a dark one, where plain steel was grey on grey)
    const steel = new THREE.MeshPhongMaterial({ color: 0xe6ecf1, emissive: 0x59626b, shininess: 90, specular: 0x999999 }), orange = lambert(PICKUP_COLOR.wrench);
    const rim = new THREE.MeshBasicMaterial({ color: 0x1c2128 }), RIM = 0.05;
    const DEPTH = 0.16, EDGE = 0.03; // (m thick, and the chamfer round every edge, each side of that)
    const solid = (shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: EDGE, bevelSize: EDGE, bevelOffset: -EDGE, bevelSegments: 1, curveSegments: 9 });
      geometry.translate(0, 0, -DEPTH / 2);
      const outline = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelOffset: RIM, bevelSegments: 1, curveSegments: 9 });
      outline.translate(0, 0, -0.03);
      part(wrench, outline, rim, 0, 0, 0);
      return part(wrench, geometry, steel, 0, 0, 0);
    };
    // the head: a disc R across, cut off square at the prongs' tips (TIP from its middle), with a slot GAP wide
    // down into it, round at the bottom; the slot leans TURN from the handle's line
    const HEAD = 0.66, R = 0.4, TIP = 0.3, GAP = 0.36, TURN = Math.PI / 12, way = Math.PI / 2 - TURN, open = Math.acos(TIP / R);
    const ux = Math.cos(way), uy = Math.sin(way), wx = uy, wy = -ux; // (out of the jaw; and across it)
    const head = new THREE.Shape();
    head.absarc(0, HEAD, R, way + open, way - open + Math.PI * 2, false);
    head.lineTo(ux * TIP + wx * GAP / 2, HEAD + uy * TIP + wy * GAP / 2);
    head.absarc(0, HEAD, GAP / 2, way - Math.PI / 2, way - Math.PI * 1.5, true);
    head.lineTo(ux * TIP - wx * GAP / 2, HEAD + uy * TIP - wy * GAP / 2);
    head.closePath();
    solid(head);
    // the ring: RING across, a hole HOLE across through it
    const FOOT = -0.72, RING = 0.3, HOLE = 0.18;
    const ring = new THREE.Shape();
    ring.absarc(0, FOOT, RING, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, FOOT, HOLE, 0, Math.PI * 2, true);
    ring.holes.push(hole);
    solid(ring);
    // the handle between them, wider at the head: its ends inside the head (short of the slot) and the ring (short of the hole)
    const handle = new THREE.Shape(), y0 = FOOT + 0.22, y1 = HEAD - 0.3;
    handle.moveTo(-0.11, y0);
    handle.lineTo(0.11, y0);
    handle.lineTo(0.15, y1);
    handle.lineTo(-0.15, y1);
    handle.closePath();
    solid(handle);
    part(wrench, new THREE.BoxGeometry(0.13, 0.62, DEPTH + EDGE * 2 + 0.03), orange, 0, (FOOT + RING + HEAD - R) / 2, 0); // the panel, proud of both faces
    wrench.rotation.z = -Math.PI / 6;
    group.add(wrench);
    return group;
  },
  // the inflatable passenger: a crash-test dummy, sitting (see makeCrashDummy)
  passenger: () => {
    const group = new THREE.Group(), dummy = makeCrashDummy();
    dummy.position.set(0, -0.5, -0.3); // (centred on the pickup's middle)
    group.add(dummy);
    return group;
  },
};

// armour: a knight's shield, steel with a gold rim, a gold boss in the middle and rivets round it
PICKUP_MODELS.armour = () => {
  const group = new THREE.Group();
  const outline = (scale) => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.55 * scale, 0.6 * scale);
    shape.lineTo(0.55 * scale, 0.6 * scale);
    shape.lineTo(0.55 * scale, 0.05 * scale);
    shape.quadraticCurveTo(0.5 * scale, -0.5 * scale, 0, -0.78 * scale);
    shape.quadraticCurveTo(-0.5 * scale, -0.5 * scale, -0.55 * scale, 0.05 * scale);
    shape.closePath();
    return shape;
  };
  const steel = new THREE.MeshPhongMaterial({ color: PICKUP_COLOR.armour, shininess: 80, specular: 0x888888 });
  const gold = new THREE.MeshPhongMaterial({ color: 0xe6c15a, shininess: 70, specular: 0x666644 });
  const face = new THREE.ExtrudeGeometry(outline(1), { depth: 0.16, bevelEnabled: false });
  face.translate(0, 0, -0.08);
  part(group, face, steel, 0, 0, 0);
  const rim = new THREE.ExtrudeGeometry(outline(1.08), { depth: 0.12, bevelEnabled: false });
  rim.translate(0, 0, -0.1);
  part(group, rim, gold, 0, 0, -0.01);                                                   // the rim, behind
  const boss = part(group, new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 0.02, 0.08, Math.PI / 2); // the boss
  boss.scale.y = 0.6;
  for (const [x, y] of [[-0.4, 0.45], [0.4, 0.45], [-0.4, -0.05], [0.4, -0.05], [0, -0.55]]) {
    part(group, new THREE.SphereGeometry(0.05, 8, 6), gold, x, y, 0.09);                  // rivets
  }
  return group;
};

// big splash: an upgraded package, with green arrows rising either side of it. For a good player, an
// enlarged gift parcel in brown paper and tape; for an evil one, an enlarged paper lunch bag on fire.
// userData.livery(evil) shows the one for the player's side.
const upArrow = (material) => {
  const shape = new THREE.Shape();
  for (const [x, y] of [[-0.07, -0.3], [0.07, -0.3], [0.07, 0.05], [0.17, 0.05], [0, 0.3], [-0.17, 0.05], [-0.07, 0.05]]) {
    if (x === -0.07 && y === -0.3) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  geometry.translate(0, 0, -0.05);
  return new THREE.Mesh(geometry, material);
};
PICKUP_MODELS.bigSplash = () => {
  const group = new THREE.Group(), good = new THREE.Group(), evil = new THREE.Group();
  group.add(good, evil);
  // the gift: a big brown-paper parcel, taped both ways round
  const paper = new THREE.MeshPhongMaterial({ color: 0xc8955a, shininess: 20 }), tape = lambert(0x8a5f34);
  part(good, new THREE.BoxGeometry(0.85, 0.7, 0.85), paper, 0, 0, 0);
  part(good, new THREE.BoxGeometry(0.88, 0.72, 0.14), tape, 0, 0, 0);
  part(good, new THREE.BoxGeometry(0.14, 0.72, 0.88), tape, 0, 0, 0);
  // the lunch bag: tall brown paper, its top folded over and charred black, and the whole of
  // it ablaze: tongues of fire climbing its sides and roaring off its top, flickering
  const bag = lambert(0xa47a4c), char = lambert(0x2a1d14);
  part(evil, new THREE.BoxGeometry(0.6, 0.78, 0.42), bag, 0, -0.05, 0);
  part(evil, new THREE.BoxGeometry(0.6, 0.16, 0.3), bag, 0, 0.38, -0.04, -0.45);         // the folded top
  part(evil, new THREE.BoxGeometry(0.62, 0.12, 0.44), char, 0, 0.29, 0);                // charred round the top...
  part(evil, new THREE.BoxGeometry(0.62, 0.08, 0.44), lambert(0x5a3d22), 0, 0.2, 0);     // ...browning below it
  // a tongue of fire: a soft teardrop. Each flame is three, one inside another: deep red outside,
  // orange, then a yellow core, each drawn over the last, so the fire has a hot heart
  const tongue = new THREE.LatheGeometry([[0, 0], [0.09, 0.04], [0.13, 0.14], [0.12, 0.3], [0.08, 0.48], [0.035, 0.64], [0, 0.74]]
    .map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const layers = [[0xff3d00, 0.9, 1], [0xff8c00, 0.92, 0.72], [0xffd000, 1, 0.45]].map(([color, opacity, size], i) => ({
    material: new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), size, order: i + 1 }));
  const flames = [];
  const fire = (size, x, y, z, lean = 0, turn = 0) => {
    for (const layer of layers) {
      const mesh = part(evil, tongue, layer.material, x + Math.sin(turn) * 0.02 * layer.order, y, z + Math.cos(turn) * 0.02 * layer.order,
        Math.cos(turn) * lean, 0, -Math.sin(turn) * lean);
      mesh.renderOrder = layer.order;
      flames.push({ mesh, size: size * layer.size, phase: flames.length * 0.9 });
    }
  };
  // roaring off the top...
  for (const [x, z, size] of [[0, 0, 1.35], [-0.17, 0.07, 1.0], [0.18, 0.05, 1.05], [0.05, -0.1, 0.9], [-0.1, -0.08, 0.8]]) fire(size, x, 0.36, z);
  // ...and climbing up its edges and sides from halfway down, leaning out a little
  for (const [x, z, y, size] of [[0.3, 0.21, -0.1, 0.85], [-0.3, 0.21, 0.0, 0.8], [0.3, -0.21, 0.02, 0.75], [-0.3, -0.21, -0.12, 0.85],
    [0, 0.22, 0.05, 0.7], [0.31, 0, 0.12, 0.65], [-0.31, 0, 0.1, 0.65]]) {
    fire(size, x, y, z, 0.22, Math.atan2(x, z));
  }
  group.userData.animate = (t) => { // the flames flicker, each in its own time
    for (const f of flames) {
      const flick = Math.sin(t * 11 + f.phase) * 0.12 + Math.sin(t * 17.3 + f.phase * 2.1) * 0.08;
      f.mesh.scale.set(f.size * (1 - flick * 0.4), f.size * (1 + flick), f.size * (1 - flick * 0.4));
    }
  };
  // the arrows: rising either side
  const green = new THREE.MeshPhongMaterial({ color: 0x3ddc68, emissive: 0x0f4a22, shininess: 60 });
  for (const [x, y] of [[-0.68, 0.1], [0.68, 0.25]]) {
    const arrow = upArrow(green);
    arrow.position.set(x, y, 0);
    group.add(arrow);
  }
  group.userData.livery = (isEvil) => {
    good.visible = !isEvil;
    evil.visible = isEvil;
  };
  group.userData.livery(false);
  return group;
};

// butterfingers: a block of butter, half unwrapped from its foil
PICKUP_MODELS.butterfingers = () => {
  const group = new THREE.Group();
  const butter = new THREE.MeshPhongMaterial({ color: PICKUP_COLOR.butterfingers, shininess: 50, specular: 0x555544 });
  const foil = new THREE.MeshPhongMaterial({ color: 0xd8dde3, shininess: 90, specular: 0xaaaaaa });
  part(group, new THREE.BoxGeometry(1.1, 0.42, 0.46), butter, 0, 0, 0);                    // the butter
  part(group, new THREE.BoxGeometry(0.56, 0.46, 0.5), foil, -0.3, 0, 0);                   // its foil, half off...
  part(group, new THREE.BoxGeometry(0.3, 0.02, 0.5), foil, 0.12, 0.25, 0, 0, 0, -0.35);    // ...peeled back
  group.scale.setScalar(1.3);
  return group;
};

// the cash pickups: a dollar sign, flat-faced and extruded (no bevel), green for $5, yellow for $10,
// red for $20. (Marked as writing, so on a left-hand level it is mirrored back the right way round)
const DOLLAR = (() => {
  const geometry = new TextGeometry('$', { font: new Font(BOLD), size: 1.1, height: 0.26, curveSegments: 10, bevelEnabled: false });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2); // (centred)
  return geometry;
})();
const cash = (type) => () => {
  const group = new THREE.Group();
  const material = new THREE.MeshPhongMaterial({ color: PICKUP_COLOR[type], shininess: 60, specular: 0x444444 });
  part(group, DOLLAR, material, 0, 0, 0).userData.text = true;
  return group;
};
for (const type of ['cash5', 'cash10', 'cash20']) PICKUP_MODELS[type] = cash(type);

// the mystery pickup: a big, rounded 3D question mark in glossy purple, a tube bent into its hook
// and stem, round at both ends, over a ball for its dot. (All one group marked as writing, so on a
// left-hand level it is mirrored back the right way round: see render/items.js, readable)
PICKUP_MODELS.mystery = () => {
  const group = new THREE.Group(), glyph = new THREE.Group();
  const purple = new THREE.MeshPhongMaterial({ color: PICKUP_COLOR.mystery, emissive: 0x2a1040, shininess: 80, specular: 0x666666 });
  const r = 0.12;
  const hook = new THREE.CatmullRomCurve3([[-0.36, 0.52], [-0.3, 0.78], [-0.06, 0.93], [0.24, 0.87], [0.38, 0.64], [0.3, 0.42],
    [0.08, 0.27], [0, 0.08], [0, -0.06]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  part(glyph, new THREE.TubeGeometry(hook, 64, r, 14), purple, 0, 0, 0);
  for (const end of [hook.getPoint(0), hook.getPoint(1)]) part(glyph, new THREE.SphereGeometry(r, 14, 10), purple, end.x, end.y, 0); // (rounded ends)
  part(glyph, new THREE.SphereGeometry(0.15, 16, 12), purple, 0, -0.36, 0);                     // the dot
  glyph.position.y = -0.27; // (centred on the pickup's middle)
  glyph.userData.text = true;
  group.add(glyph);
  return group;
};

// a radar detector: a black dash-top box with a red LED readout, three lights and an aerial
PICKUP_MODELS.radarDetector = () => {
  const group = new THREE.Group();
  const glow = (color) => new THREE.MeshBasicMaterial({ color });
  part(group, new THREE.BoxGeometry(1.0, 0.32, 0.7), lambert(0x1b1d22), 0, 0, 0);           // the unit
  part(group, new THREE.BoxGeometry(0.5, 0.06, 0.32), lambert(0x3a3a40), 0, -0.19, 0);      // its mount
  part(group, new THREE.BoxGeometry(0.56, 0.12, 0.02), glow(0xff2a2a), -0.1, 0.03, 0.36);   // LED readout
  [0x39ff6a, 0xffd23f, 0xff3b30].forEach((color, i) => {                                       // lights
    part(group, new THREE.BoxGeometry(0.06, 0.06, 0.02), glow(color), 0.26 + i * 0.08, 0.03, 0.36);
  });
  part(group, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), lambert(0x8d9096), 0.4, 0.4, -0.25); // aerial
  return group;
};

// a police light bar: red one end, blue the other (userData.red / blue, for flashing)
PICKUP_MODELS.siren = () => {
  const group = new THREE.Group();
  part(group, new THREE.BoxGeometry(1.3, 0.12, 0.34), lambert(0x2a2c31), 0, -0.1, 0);       // the bar
  const red = part(group, new THREE.BoxGeometry(0.55, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2020 }), -0.32, 0.06, 0);
  const blue = part(group, new THREE.BoxGeometry(0.55, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x2060ff }), 0.32, 0.06, 0);
  group.userData = { red, blue };
  return group;
};

// bad gas: a cheap army-green jerry can, a little askew and patched with rust, with three
// handles across the top, the stamped X on each side and a spout
PICKUP_MODELS.badGas = () => {
  const group = new THREE.Group();
  const olive = lambert(0x4b5320), darker = lambert(0x363d17), rust = lambert(0x7a4a22);
  const body = part(group, new THREE.BoxGeometry(0.8, 1.05, 0.42), olive, 0, -0.05, 0, 0, 0, 0.04); // the can
  for (const z of [0.215, -0.215]) for (const turn of [0.85, -0.85]) {                     // the stamped X, each side
    part(body, new THREE.BoxGeometry(0.95, 0.07, 0.02), darker, 0, 0, z, 0, 0, turn);
  }
  part(body, new THREE.BoxGeometry(0.22, 0.16, 0.03), rust, 0.2, -0.3, 0.22);               // rust patches
  part(body, new THREE.BoxGeometry(0.12, 0.2, 0.03), rust, -0.26, 0.28, -0.22);
  for (const x of [-0.2, 0, 0.2]) {                                                         // the three handles...
    part(body, new THREE.BoxGeometry(0.06, 0.16, 0.08), darker, x, 0.6, 0);
  }
  part(body, new THREE.BoxGeometry(0.5, 0.06, 0.1), darker, 0, 0.69, 0);                    // ...joined across the top
  part(body, new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8), darker, 0.3, 0.6, 0, 0, 0, -0.5); // spout
  part(body, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), rust, 0.37, 0.72, 0, 0, 0, -0.5);    // its cap
  return group;
};

// a 1000 lb weight: a squat iron block, narrower at the top, with a ring to lift it by and
// 1000 LB cast into its front
PICKUP_MODELS.heavyMass = () => {
  const group = new THREE.Group();
  const iron = lambert(0x3c3f45);
  // (a four-sided cylinder turned an eighth is a square block; flat normals keep its faces flat)
  const block = new THREE.CylinderGeometry(0.5, 0.78, 0.95, 4, 1).toNonIndexed();
  block.computeVertexNormals();
  part(group, block, iron, 0, -0.15, 0, 0, Math.PI / 4);
  part(group, new THREE.TorusGeometry(0.22, 0.07, 8, 16), iron, 0, 0.47, 0);               // the ring
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c9ccd2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 44px sans-serif';
  g.fillText('1000', 64, 22);
  g.font = 'bold 22px sans-serif';
  g.fillText('LB', 64, 52);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  // on the front face, half way up it, leaning back with it
  const lean = Math.atan((0.78 - 0.5) * Math.SQRT1_2 / 0.95);
  part(group, new THREE.PlaneGeometry(0.62, 0.5), new THREE.MeshBasicMaterial({ map, transparent: true }),
    0, -0.15, (0.5 + 0.78) / 2 * Math.SQRT1_2 + 0.01, -lean).userData.text = true;
  return group;
};

// a stopwatch: a thick chrome case with its crown and button on top, and the same white face
// on both sides with a huge sign across it: a green + (time plus) or a red - (time minus)
const stopwatch = (plus) => () => {
  const group = new THREE.Group();
  const chrome = lambert(0xc4c8cf);
  const sign = new THREE.MeshBasicMaterial({ color: plus ? 0x2ecc40 : 0xe0302a });
  part(group, new THREE.CylinderGeometry(0.62, 0.62, 0.34, 28), chrome, 0, 0, 0, Math.PI / 2); // the case
  part(group, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), chrome, 0, 0.7, 0);                // crown stem
  part(group, new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), chrome, 0, 0.8, 0);               // crown
  part(group, new THREE.BoxGeometry(0.1, 0.14, 0.12), chrome, 0.4, 0.52, 0, 0, 0, -0.65);        // button
  const face = new THREE.MeshLambertMaterial({ color: 0xf6f6f2 });
  for (const side of [1, -1]) {
    const z = side * 0.172;
    part(group, new THREE.CircleGeometry(0.52, 28), face, 0, 0, z, 0, side > 0 ? 0 : Math.PI);  // the face
    part(group, new THREE.BoxGeometry(0.72, 0.18, 0.03), sign, 0, 0, z + side * 0.012);          // the sign's bar...
    if (plus) part(group, new THREE.BoxGeometry(0.18, 0.72, 0.03), sign, 0, 0, z + side * 0.012); // ...crossed
  }
  return group;
};
PICKUP_MODELS.timePlus = stopwatch(true);
PICKUP_MODELS.timeMinus = stopwatch(false);

// TANK RAGE target: a glowing green ring and bull's-eye on a post (userData.ring and .glow spin
// and pulse); the group's origin is the ring's centre.
// look (how it stands: see CONFIG.target and Targets): height, m the ring's middle is above the ground; style:
// 'post' (the post runs down to the ground), 'wall' (a short stalk down to a foot on a wall's top, `base` m above
// the ground) or 'gantry' (hung from an arm, from a mast standing at (out.x, out.z) from the ring, in the
// group's own axes); beam: a beam of light standing over it. With no look: the post, as it always was
export const makeTargetModel = (look, out) => {
  if (look && (look.style !== 'post' || look.beam || look.height !== 2.7)) return makeStyledTarget(look, out);
  const group = new THREE.Group();
  const green = new THREE.MeshBasicMaterial({ color: 0x39ff6a });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 8, 24), green);
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), green);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x39ff6a, transparent: true, opacity: 0.22, depthWrite: false }));
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), lambert(0x2b2f38));
  post.position.y = -1.6;
  group.add(ring, bull, glow, post);
  group.userData = { ring, glow };
  return group;
};
const makeStyledTarget = (look, out = { x: 0, z: 0 }) => {
  const group = new THREE.Group();
  const green = new THREE.MeshBasicMaterial({ color: 0x39ff6a }), steel = lambert(0x2b2f38);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 8, 24), green);
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), green);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x39ff6a, transparent: true, opacity: 0.22, depthWrite: false }));
  group.add(ring, bull, glow);
  const bar = (w, h, l, x, y, z, ry = 0) => part(group, new THREE.BoxGeometry(w, h, l), steel, x, y, z, 0, ry);
  const H = look.height;
  if (look.style === 'gantry') {
    // the mast, from the ground to over the ring; the arm from its top to over the ring; the hanger down to it
    const top = 2.1, reach = Math.hypot(out.x, out.z), turn = Math.atan2(out.x, out.z);
    bar(0.26, H + top, 0.26, out.x, (top - H) / 2, out.z);
    bar(0.6, 0.12, 0.6, out.x, -H + 0.06, out.z);
    bar(0.16, 0.16, reach + 0.3, out.x / 2, top - 0.1, out.z / 2, turn);
    bar(0.1, top - 1.5, 0.1, 0, (top + 1.5) / 2, 0);
  } else {
    const foot = look.style === 'wall' ? Math.min(H - 1.5, look.base || 0) : 0; // (m above the ground it stands)
    bar(0.2, H - 0.5 - foot, 0.2, 0, -(H + 0.5 + foot) / 2 + foot, 0);
    if (look.style === 'wall') bar(0.7, 0.1, 0.7, 0, -H + foot + 0.05, 0); // (its foot, on the wall's top)
  }
  if (look.beam) {
    // a beam of light standing over it: pale green, see-through, fading out up into the sky (two shafts, a bright
    // thin one in a wide faint one), and a lamp on the ring's top that it comes from
    const shaft = (r, h, opacity) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, h, 10, 1, true), new THREE.MeshBasicMaterial({
        color: 0x7dffa0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      mesh.position.y = 1.6 + h / 2;
      group.add(mesh);
      return mesh;
    };
    shaft(0.28, 26, 0.5);
    group.userData.beam = shaft(0.7, 34, 0.16);
    part(group, new THREE.SphereGeometry(0.3, 10, 8), green, 0, 1.62, 0);
  }
  group.userData.ring = ring;
  group.userData.glow = glow;
  return group;
};
