// ---- four of the ORIGINAL garage cars, rebuilt (the owner, 13-Oct: "Let's bring the original models up to an acceptable
// quality"): the Hearse, the Hot Rod, the Minivan and the Pick-Up, after the owner's own older game's "Pick a car!" cards.
// Built as render/models.js' builders are (models.js puts these in MODELS): each takes the car's entry and returns a group,
// front facing local +z, with
//   userData.body     the mesh whose material is the paint (every painted part shares that one material, so the livery,
//                     the traffic's paints and a damaged car's scorch reach all of it)
//   userData.animate  (seconds) => void: poses the model for that moment
//   userData.livery   (evil) => void: the parts that differ between Good and Evil beyond the paint (a second colour)
// Light on the GPU: few curve segments, one geometry per set of like parts where it can be, and every part that never
// moves merged with the others of its material into one mesh (mergeByMaterial), so a car is about twenty draw calls.
// The wheels stay meshes of their own (a tyre: a CylinderGeometry on its side, as render/carsuspension.js finds the
// wheels and render/carExtras.js addSuperKit finds the tyres), each with its hub inside it.
// A few small canvas textures (the Hot Rod's flames, the Hearse's curtains, the Pick-Up's worn bonnet): made once, kept
// and shared by every car that wears them (userData.shared: clearGroup leaves them be), 128 x 64 at most. No image files.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const shared = (material) => { material.userData.shared = true; return material; };
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
// the lamps' lenses: made once, shared by every car (they never change colour)
const LAMP = shared(new THREE.MeshBasicMaterial({ color: 0xfff3c4 })), TAIL = shared(new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
const BRAKE = shared(new THREE.MeshBasicMaterial({ color: 0xc4101c })), AMBER = shared(new THREE.MeshBasicMaterial({ color: 0xffa31a }));
const REVERSE = shared(new THREE.MeshBasicMaterial({ color: 0xf2f2ea }));

const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (parent, material, w, h, l, x, y, z) => place(parent, new THREE.BoxGeometry(w, h, l), material, x, y, z);
// a flat panel tipped about the car's width: a windscreen. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
// a side view: the polygon `points` ([z, y], or [z, y, r] for a corner rounded through a curve of about r)
const outline = (points) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, r = 0], i) => {
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    if (!r) { if (i) shape.lineTo(z, y); else shape.moveTo(z, y); return; }
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(from[0], from[1]); else shape.moveTo(from[0], from[1]);
    shape.quadraticCurveTo(z, y, to[0], to[1]);
  });
  shape.closePath();
  return shape;
};
// a solid whose side view is `points` (see outline), `w` wide across the car with its edges chamfered by `round`
// (the side view grows by `round` all round: its flat sides are the outline itself), its middle at x
const side = (parent, material, w, points, round, x = 0, segments = 4) => {
  const geo = new THREE.ExtrudeGeometry(outline(points), {
    depth: w - 2 * round, curveSegments: segments, bevelEnabled: round > 0, bevelThickness: round, bevelSize: round, bevelSegments: 1,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  return place(parent, geo, material);
};
// a straight-sided solid whose side view is `points`, `w` wide, its middle at x (a window, a flame)
const prism = (parent, material, w, points, x = 0) => side(parent, material, w, points, 0, x);
// a round thing along the car (a lamp), across it (an axle) or upright (a post)
const rod = (parent, material, r, length, x, y, z, axis = 'z', segments = 12, r2 = r) => {
  const geo = new THREE.CylinderGeometry(r, r2, length, segments);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a flat picture (a decal, a curtained window): w by h, facing 'x' (+x), '-x', 'z', '-z' or 'y' (up)
const decal = (parent, material, w, h, x, y, z, facing) => {
  const geo = new THREE.PlaneGeometry(w, h);
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  if (facing === 'y') geo.rotateX(-Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a wheel: its tyre (a cylinder on its side, the mesh the suspension and the Super kit look for), the hub inside it and
// a cap on that. The three are meshes of their own, never merged (the suspension holds each wheel's parts on the floor)
const wheel = (parent, geo, x, y, z, tyre, hub, cap) => {
  const parts = [new THREE.Mesh(geo.tyre, tyre), new THREE.Mesh(geo.hub, hub)];
  if (cap) parts.push(new THREE.Mesh(geo.cap, cap));
  for (const mesh of parts) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return parts;
};
// the geometries of a set of four like wheels (radius, tyre width), made once for the four
const wheelGeo = (R, width, hub = 0.58) => ({
  tyre: new THREE.CylinderGeometry(R, R, width, 16),
  hub: new THREE.CylinderGeometry(R * hub, R * hub, width + 0.03, 12),
  cap: new THREE.CylinderGeometry(R * 0.22, R * 0.26, width + 0.07, 8),
});
// every mesh directly in `parent` but those in `keep`, joined with the others of its material into one mesh (their
// places baked in). Returns the merged mesh of each material (a Map)
const mergeByMaterial = (parent, keep) => {
  const buckets = new Map();
  for (const mesh of [...parent.children]) {
    if (!mesh.isMesh || keep.has(mesh)) continue;
    mesh.updateMatrix();
    const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
    buckets.get(mesh.material).push(geo);
    mesh.geometry.dispose();
    parent.remove(mesh);
  }
  const out = new Map();
  for (const [material, geos] of buckets) {
    const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeometries(geos, false) : geos[0], material);
    for (const geo of geos) if (geos.length > 1) geo.dispose();
    parent.add(mesh);
    out.set(material, mesh);
  }
  return out;
};

// ---- the small canvas textures: drawn once, kept for every car that wears them -------------------------------------
const textures = new Map();
const texture = (key, w, h, draw) => {
  if (!textures.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    draw(ctx, w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.userData.shared = true;
    textures.set(key, map);
  }
  return textures.get(key);
};
// a hearse's side window: dark glass under an arched top, two drapes of pleated cloth gathered back to its sides with
// a scalloped pelmet across the top (cloth: [light, dark] of the pleats). Clear (alpha 0) outside the arch
const curtains = (key, cloth) => texture('curtains-' + key, 64, 32, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const arch = () => { ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 7); ctx.quadraticCurveTo(0, 0, 8, 0); ctx.lineTo(w - 8, 0); ctx.quadraticCurveTo(w, 0, w, 7); ctx.lineTo(w, h); ctx.closePath(); };
  arch();
  ctx.fillStyle = '#1b2230';
  ctx.fill();
  ctx.save();
  arch();
  ctx.clip();
  const pleats = (x0, x1) => { for (let x = x0; x < x1; x += 2) { ctx.fillStyle = (x / 2) % 2 ? cloth[0] : cloth[1]; ctx.fillRect(x, 0, 2, h); } };
  for (const dir of [1, -1]) { // a drape each side: wide at the top, gathered in at a tie-back, flaring out to the sill
    ctx.save();
    if (dir < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(19, 0); ctx.quadraticCurveTo(9, 9, 8, 17); ctx.quadraticCurveTo(10, 25, 13, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.clip();
    pleats(0, 24);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(160,190,230,0.18)'; // a gleam across the glass between them
  ctx.beginPath(); ctx.moveTo(26, h); ctx.lineTo(36, 4); ctx.lineTo(42, 4); ctx.lineTo(32, h); ctx.fill();
  ctx.fillStyle = cloth[0]; // the pelmet, scalloped
  ctx.fillRect(0, 0, w, 3);
  for (let x = 4; x < w; x += 8) { ctx.beginPath(); ctx.arc(x, 3, 3, 0, Math.PI); ctx.fill(); }
  ctx.restore();
});

export const ORIG3_MODELS = {
  // The Hearse: a long seventies funeral coach in deep indigo (white for an Evil driver). A long, flat bonnet with
  // a chrome-framed upright grille of vertical bars between four round lamps in chrome bezels; a tall, long coach
  // body behind the front doors with arched, curtained windows, a blind landau quarter with a chrome S-bar, chrome
  // drip rails along the roof and a rear door with its own curtained window; tall tail lamps, chrome bumpers.
  hearse: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.36, WX = w / 2 - 0.12, WZ = L * 0.6, cw = w * 0.9;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const cloth = new THREE.MeshLambertMaterial({ map: curtains('pale', ['#e4dff0', '#b5adc8']), alphaTest: 0.5 });
    const plate = lambert(0xece6cc);
    // the body below the waist: a long slab with its arches cut out round the wheels
    const arch = (zc) => {
      const pts = [], ra = R + 0.1;
      for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; pts.push([zc - ra * Math.cos(a), R + 0.02 + ra * Math.sin(a) * 0.95]); }
      return [[zc - ra, 0.32], ...pts, [zc + ra, 0.32]];
    };
    side(group, paint, w, [[-L + 0.04, 0.32, 0.06], ...arch(-WZ), ...arch(WZ), [L - 0.1, 0.32, 0.06], [L - 0.04, 0.5, 0.06],
      [L - 0.05, 0.9, 0.06], [L - 0.5, 0.95, 0.2], [0.98, 0.97, 0.1], [-L + 0.1, 0.97, 0.06], [-L + 0.04, 0.9, 0.06]], 0.04);
    box(group, dark, w - 0.34, 0.5, L * 1.7, 0, 0.55, 0);                                  // (the dark inside of the arches)
    // the coach: the cabin and its long roof, set in from the body's sides (a shoulder for the chrome waist strip)
    side(group, paint, cw, [[1.02, 0.94], [0.3, 1.56, 0.06], [-2.42, 1.58, 0.14], [-2.7, 1.4, 0.08], [-2.7, 0.94]], 0.05);
    const rise = Math.atan2(0.62, 0.72);
    slab(group, glass, cw - 0.2, 0.02, 0.8, 0, 1.295, 0.7, rise);               // the windscreen
    for (const s of [-1, 1]) {
      const x = s * (cw / 2 + 0.006);
      prism(group, glass, 0.02, [[0.8, 1.06], [0.36, 1.5], [-0.4, 1.5], [-0.4, 1.06]], x);  // the front door's window
      decal(group, cloth, 1.26, 0.44, x + s * 0.004, 1.28, -1.18, s > 0 ? 'x' : '-x');     // the long curtained window
      // the landau bar: an S of chrome on the blind quarter behind it
      for (const [dz, turn] of [[0.11, 0], [-0.11, Math.PI]]) { // (a top half and a bottom half, end to end: a long S)
        const geo = new THREE.TorusGeometry(0.11, 0.016, 4, 8, Math.PI).rotateZ(turn).rotateY(Math.PI / 2);
        place(group, geo, chrome, x + s * 0.012, 1.3, -2.2 + dz);
      }
      box(group, chrome, 0.025, 0.025, 2.72, s * (cw / 2 + 0.012), 1.56, -1.06);          // the drip rail along the roof
      box(group, chrome, 0.03, 0.03, L * 2 - 0.3, s * (w / 2 + 0.008), 0.95, 0);         // the chrome waist strip
      box(group, chrome, 0.03, 0.05, 1.98, s * (w / 2 + 0.008), 0.42, 0);                // the rocker strip, between the arches
      for (const z of [0.98, -0.52]) box(group, trim, 0.012, 0.56, 0.014, s * (w / 2 + 0.003), 0.66, z); // the front door's shut lines
      box(group, chrome, 0.03, 0.035, 0.14, s * (w / 2 + 0.012), 0.86, -0.36);           // its handle
      box(group, chrome, 0.1, 0.03, 0.03, s * (w / 2 + 0.05), 1.0, 0.7);                 // the mirror on its stalk
      box(group, chrome, 0.05, 0.1, 0.12, s * (w / 2 + 0.11), 1.03, 0.7);
      // the front: four round lamps, two to a chrome bezel, an indicator under each pair
      box(group, chrome, 0.46, 0.24, 0.04, s * 0.66, 0.72, L);
      for (const x of [0.55, 0.77]) {
        rod(group, LAMP, 0.085, 0.04, s * x, 0.72, L + 0.02, 'z', 14);
      }
      box(group, AMBER, 0.24, 0.07, 0.04, s * 0.66, 0.53, L - 0.01);
      box(group, chrome, 0.05, 0.14, 0.34, s * (w / 2 + 0.005), 0.4, L - 0.12);           // the bumper's ends, round the corners
      box(group, chrome, 0.05, 0.14, 0.34, s * (w / 2 + 0.005), 0.4, -L + 0.12);
      // the tail: tall lamps at the corners (tail lamp over brake lamp), an indicator and a reversing lamp under them
      box(group, TAIL, 0.14, 0.2, 0.04, s * 0.86, 0.84, -L);
      box(group, BRAKE, 0.14, 0.14, 0.04, s * 0.86, 0.66, -L);
      box(group, AMBER, 0.14, 0.06, 0.04, s * 0.86, 0.555, -L);
      box(group, REVERSE, 0.12, 0.05, 0.03, s * 0.5, 0.49, -L - 0.005);
      rod(group, trim, 0.035, 0.3, s * 0.55, 0.26, -L + 0.1, 'z', 8);                   // twin exhausts
    }
    // the grille: an upright chrome frame with an arched top, dark behind its vertical bars, a mascot on top
    box(group, chrome, 0.5, 0.4, 0.06, 0, 0.66, L);
    place(group, new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), chrome, 0, 0.86, L);
    box(group, dark, 0.4, 0.34, 0.03, 0, 0.67, L + 0.025);
    for (let i = -3; i <= 3; i++) box(group, chrome, 0.022, 0.32, 0.03, i * 0.055, 0.67, L + 0.035);
    rod(group, chrome, 0.03, 0.08, 0, 1.13, L - 0.06, 'y', 6);
    box(group, chrome, w + 0.02, 0.14, 0.14, 0, 0.4, L + 0.02);                            // bumpers
    box(group, chrome, w + 0.02, 0.14, 0.14, 0, 0.4, -L - 0.02);
    box(group, plate, 0.46, 0.13, 0.02, 0, 0.66, -L - 0.005);                              // the number plate
    decal(group, cloth, cw * 0.62, 0.36, 0, 1.18, -2.7 - 0.05 - 0.006, '-z');                // the rear door's curtained window
    box(group, chrome, 0.16, 0.03, 0.03, 0, 0.88, -L - 0.01);                              // its handle
    const keep = new Set();
    const geo = wheelGeo(R, 0.28), tyre = lambert(0x141414), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [WZ, -WZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub, chrome)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => {
        cloth.map = evil ? curtains('dark', ['#6a3290', '#3a1850']) : curtains('pale', ['#e4dff0', '#b5adc8']);
        chrome.color.setHex(evil ? 0x8a919b : CHROME); // (on a white body bright chrome is lost: a darker steel shows its lines)
      },
    };
    group.userData.livery(false);
    return group;
  },
};
