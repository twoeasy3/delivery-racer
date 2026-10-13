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
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top]
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals(); // (no shared corners: each face flat)
  return place(parent, geo, material);
};
// a round thing along the car (a lamp), across it (an axle) or upright (a post)
const rod = (parent, material, r, length, x, y, z, axis = 'z', segments = 12, r2 = r) => {
  const geo = new THREE.CylinderGeometry(r, r2, length, segments);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a flat picture (a decal, a curtained window): w by h, facing 'x' (+x), '-x', 'z', '-z' or 'y' (up)
const decal = (parent, material, w, h, x, y, z, facing, u = [0, 1]) => {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, u[0] + uv.getX(i) * (u[1] - u[0])); // (a part of the picture: u from u[0] to u[1])
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  if (facing === 'y') geo.rotateX(-Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a wheel as the rest of the roster has them (render/models.js wheel): a fat dark tyre (a cylinder on its side, the mesh
// the suspension and the Super kit look for) and a plain hub disc in it. Meshes of their own, never merged (the
// suspension holds each wheel's parts on the floor)
const wheel = (parent, geo, x, y, z, tyre, hub) => {
  const parts = [new THREE.Mesh(geo.tyre, tyre), new THREE.Mesh(geo.hub, hub)];
  for (const mesh of parts) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return parts;
};
// the geometries of a set of like wheels (radius, tyre width), made once for them all
const wheelGeo = (R, width) => ({
  tyre: new THREE.CylinderGeometry(R, R, width, 16),
  hub: new THREE.CylinderGeometry(R * 0.55, R * 0.55, width + 0.04, 12),
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

// flames for a flank, licking back from the front (u 0) to their tips (u 1): five tongues, each in three colours
// (fire: [outer, middle, core]), clear between them
const flames = (key, fire) => texture('flames-' + key, 128, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  // [top, bottom of its root at the front edge, reach (share of the picture)]: fat roots, each curling up to its tip
  const tongues = [[2, 28, 0.82], [14, 42, 1], [28, 54, 0.7], [40, 64, 0.52]];
  fire.forEach((colour, k) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const [y0, y1, reach] of tongues) {
      const a = y0 + k * 4, b = y1 - k * 4, tip = w * reach * (1 - k * 0.2), ty = Math.max(1, a - 8 + k * 2);
      ctx.moveTo(0, b);
      ctx.bezierCurveTo(tip * 0.35, b + 4, tip * 0.7, b - 4, tip, ty);
      ctx.bezierCurveTo(tip * 0.72, ty + 12, tip * 0.4, a - 4, 0, a);
      ctx.closePath();
    }
    ctx.fill();
  });
});

// a worn bonnet: faded, sun-bleached patches, scratches, and the ghost of a peeled-off decal (a pair of stripes and a
// ring). Neutral pale and dark marks, part see-through, so it suits any paint under it
const wear = () => texture('wear', 64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 14; i++) { // sun-bleached blotches
    ctx.fillStyle = 'rgba(255,244,220,' + (0.06 + rnd() * 0.08).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 7, 1.5 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,240,215,0.16)'; // the ghost of the decal: two stripes down it, a ring between
  ctx.lineWidth = 4;
  for (const x of [22, 42]) { ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, 26); ctx.moveTo(x, 40); ctx.lineTo(x, 62); ctx.stroke(); }
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(32, 33, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) { // scratches, light and dark
    ctx.strokeStyle = i % 3 ? 'rgba(255,240,220,0.28)' : 'rgba(30,18,10,0.3)';
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 4 + rnd() * 10;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
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
    const keep = new Set();
    const geo = wheelGeo(R, 0.28), tyre = lambert(0x141414), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [WZ, -WZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
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

  // The Hot Rod: a chopped thirties five-window coupe on its frame with no wings (a highboy), purple with flames. A tall
  // chrome grille shell up front with its bars, a long narrow bonnet with louvres, flames licking back along it from the
  // grille, big lamps in chrome buckets on posts, a beam axle and its spring out in the open; a small cab with a
  // chopped, blue-tinted windscreen; fat tyres at the back and skinny ones at the front. The whole body shakes on its
  // springs as the engine idles. (Also the earned Hell Rod's model, in flames of its own colours.)
  hotrod: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const L = car.hl, RR = 0.5, RF = 0.34, bw = 1.16;
    const paint = lambert(car.color), glass = lambert(0x2c4470), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const plate = lambert(0xf2d21f);
    const hell = car.id === 'hellrod';
    const palette = (evil) => hell ? (evil ? ['good', ['#d8261c', '#ff8a1a', '#ffd23f']] : ['soot', ['#120604', '#5a0d0a', '#c81e1e']])
      : evil ? ['evil', ['#5a0a0a', '#c81e1e', '#ff6a1a']] : ['good', ['#d8261c', '#ff8a1a', '#ffd23f']];
    const fire = new THREE.MeshLambertMaterial({ alphaTest: 0.5 });
    // the body: a tub from the cowl back, its tail rounded down over the rear axle
    side(shell, paint, bw, [[-1.92, 0.52, 0.04], [0.48, 0.52], [0.48, 0.9], [-0.8, 0.9], [-1.6, 0.89, 0.26], [-1.92, 0.76, 0.12]], 0.04);
    taper(shell, paint, [0.46, bw - 0.04, 0.52, 0.92], [0.66, 0.74, 0.56, 0.95]);              // the cowl, narrowing to the bonnet
    side(shell, paint, 0.72, [[0.62, 0.56], [1.62, 0.56], [1.62, 0.92, 0.05], [0.62, 0.95]], 0.04); // the long, narrow bonnet
    // the cab, chopped: a low roof over a short windscreen
    side(shell, paint, 1.06, [[0.42, 0.88], [0.4, 1.12, 0.03], [-0.5, 1.15, 0.12], [-0.8, 1.0, 0.12], [-0.82, 0.88]], 0.05);
    box(shell, glass, 0.88, 0.17, 0.02, 0, 1.03, 0.46);                                          // the windscreen,
    box(shell, chrome, 0.94, 0.025, 0.03, 0, 1.125, 0.465);                                       // its chrome top,
    slab(shell, glass, 0.5, 0.02, 0.16, 0, 1.12, -0.77, -0.75);                                    // and a little rear window
    // the grille shell: chrome, tall and upright, dark behind its bars, a mascot on top
    prism(shell, chrome, 0.62, [[1.6, 0.44], [1.78, 0.44], [1.78, 1.0, 0.06], [1.6, 1.04, 0.04]]);
    box(shell, dark, 0.48, 0.48, 0.02, 0, 0.73, 1.785);
    for (let i = -4; i <= 4; i++) box(shell, chrome, 0.018, 0.46, 0.02, i * 0.05, 0.73, 1.795);
    rod(shell, chrome, 0.025, 0.08, 0, 1.08, 1.7, 'y', 6);
    for (const s of [-1, 1]) {
      const x = s * (bw / 2 + 0.006);
      prism(shell, glass, 0.02, [[0.3, 0.95], [0.3, 1.09], [-0.3, 1.11], [-0.3, 0.95]], x);          // the door's window
      prism(shell, glass, 0.02, [[-0.4, 0.95], [-0.4, 1.1], [-0.56, 1.08], [-0.68, 0.95]], x);       // and the quarter window
      box(shell, chrome, 0.12, 0.025, 0.025, s * (bw / 2 + 0.05), 0.95, 0.36);                     // a mirror on its stalk
      box(shell, chrome, 0.03, 0.07, 0.09, s * (bw / 2 + 0.11), 0.98, 0.36);
      // the bonnet's flank: flames from the grille back, louvres over their tips, headers out under them
      decal(shell, fire, 1.0, 0.34, s * 0.366, 0.75, 1.12, s > 0 ? 'x' : '-x', s > 0 ? [0, 0.66] : [0.66, 0]);
      decal(shell, fire, 0.62, 0.32, x + s * 0.002, 0.72, 0.13, s > 0 ? 'x' : '-x', s > 0 ? [0.68, 1] : [1, 0.68]);
      for (let i = 0; i < 6; i++) box(shell, dark, 0.012, 0.016, 0.16, s * 0.367, 0.9 - (i % 2) * 0.035, 0.62 + 0.14 + Math.floor(i / 2) * 0.2);
      for (let i = 0; i < 3; i++) rod(shell, chrome, 0.025, 0.2, s * 0.4, 0.5, 0.82 + i * 0.16, 'x', 6);
      rod(shell, chrome, 0.045, 1.4, s * 0.52, 0.44, 0.18, 'z', 8);                                // the side pipes, under the doors
      // lamps in chrome buckets on posts by the grille, an indicator on each post
      rod(shell, chrome, 0.02, 0.4, s * 0.48, 0.7, 1.62, 'y', 6);
      rod(shell, chrome, 0.12, 0.16, s * 0.48, 0.92, 1.64, 'z', 12, 0.07);
      rod(shell, LAMP, 0.1, 0.02, s * 0.48, 0.92, 1.72, 'z', 12);
      rod(shell, AMBER, 0.035, 0.05, s * 0.48, 0.66, 1.65, 'z', 8);
      // the tail: round tail lamps over brake lamps on the back panel, an indicator and a reversing lamp
      rod(shell, TAIL, 0.055, 0.04, s * 0.42, 0.66, -1.96, 'z', 10);
      rod(shell, BRAKE, 0.045, 0.04, s * 0.29, 0.66, -1.96, 'z', 10);
      box(shell, AMBER, 0.08, 0.035, 0.03, s * 0.42, 0.575, -1.965);
      box(shell, REVERSE, 0.07, 0.035, 0.03, s * 0.29, 0.575, -1.965);
      box(shell, trim, 0.1, 0.1, 3.5, s * 0.36, 0.44, -0.12);                                      // the frame rails
    }
    box(shell, trim, 0.82, 0.06, 0.06, 0, 0.6, 1.62);                                              // the lamps' cross bar
    box(shell, chrome, 0.56, 0.05, 0.05, 0, 0.42, 2.0);                                            // a nerf bar in front,
    for (const s of [-1, 1]) box(shell, chrome, 0.04, 0.04, 0.24, s * 0.26, 0.42, 1.88);
    box(shell, chrome, 0.9, 0.06, 0.06, 0, 0.44, -2.02);                                           // and one behind
    for (const s of [-1, 1]) box(shell, chrome, 0.04, 0.04, 0.16, s * 0.4, 0.44, -1.94);
    box(shell, plate, 0.3, 0.12, 0.02, 0, 0.64, -1.965);                                           // the number plate
    // the front axle out in the open: a dropped beam and the spring across over it
    box(shell, trim, 1.36, 0.07, 0.07, 0, RF + 0.02, L * 0.66);
    box(shell, chrome, 0.9, 0.04, 0.09, 0, 0.5, L * 0.66);
    const keep = new Set();
    const rear = wheelGeo(RR, 0.42), front = wheelGeo(RF, 0.2), tyre = lambert(0x141414);
    for (const s of [-1, 1]) {
      for (const part of wheel(group, rear, s * 0.82, RR, -L * 0.6, tyre, chrome)) keep.add(part);   // fat ones at the back,
      for (const part of wheel(group, front, s * 0.756, RF, L * 0.66, tyre, chrome)) keep.add(part); // skinny ones in front
    }
    const merged = mergeByMaterial(shell, keep);
    group.userData = {
      body: merged.get(paint),
      animate: (t) => { // (a lumpy idle: the body shakes on its springs)
        shell.rotation.z = Math.sin(t * 31) * 0.005;
        shell.position.y = Math.abs(Math.sin(t * 15.5)) * 0.008;
      },
      livery: (evil) => { const [key, colours] = palette(evil); fire.map = flames(key, colours); fire.needsUpdate = true; },
    };
    group.userData.livery(false);
    return group;
  },

  // The Minivan: a nineties people carrier (a one-box van after the Astro): a tall wedge of a body with a short, sloping
  // nose and a big raked windscreen, three rows of side windows (a front door, a sliding door, a rear
  // quarter), a chrome-framed black grille between rectangular lamps, wraparound indicators, a pale bumper and valance,
  // tall tail lamps up the rear corners, a high brake lamp, a rear window, silver hubs. Its bumpers turn
  // charcoal for an Evil driver.
  minivan: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.38, WX = w / 2 - 0.14, WZ = L * 0.6;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const bumper = lambert(0xd6d0c0), plate = lambert(0xece6cc);
    const arch = (zc) => {
      const pts = [], ra = R + 0.1;
      for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; pts.push([zc - ra * Math.cos(a), R + 0.02 + ra * Math.sin(a) * 0.95]); }
      return [[zc - ra, 0.34], ...pts, [zc + ra, 0.34]];
    };
    // the one box of a body: the nose sloping up to the windscreen, the windscreen up to the roof, the roof back to the tail
    side(group, paint, w, [[-L + 0.06, 0.34, 0.06], ...arch(-WZ), ...arch(WZ), [L - 0.06, 0.34, 0.04], [L - 0.06, 0.84, 0.1],
      [1.55, 1.14, 0.12], [0.72, 1.9, 0.14], [-L + 0.2, 1.93, 0.14], [-L + 0.06, 1.84, 0.08]], 0.06);
    box(group, dark, w - 0.4, 0.5, L * 1.7, 0, 0.58, 0);                                    // (the dark inside of the arches)
    const rise = Math.atan2(0.76, 0.83);
    slab(group, glass, w - 0.26, 0.02, 1.0, 0, 1.52 + 0.05, 1.135 + 0.048, rise);           // the big raked windscreen
    for (const s of [-1, 1]) {
      const x = s * (w / 2 + 0.006), X = s * (w / 2 + 0.003);
      prism(group, glass, 0.02, [[1.38, 1.24], [0.8, 1.8], [0.26, 1.8], [0.26, 1.24]], x);         // the front door's window,
      prism(group, glass, 0.02, [[0.12, 1.24], [0.12, 1.8], [-0.94, 1.8], [-0.94, 1.24]], x);      // the sliding door's,
      prism(group, glass, 0.02, [[-1.1, 1.24], [-1.1, 1.8], [-2.12, 1.8], [-2.2, 1.24]], x);       // and the rear quarter's
      for (const z of [0.19, -1.02]) box(group, trim, 0.012, 0.56, 0.16, X + s * 0.004, 1.52, z); // the pillars between, blacked out
      box(group, trim, 0.12, 0.03, 0.05, s * (w / 2 + 0.05), 1.28, 1.3);                      // the mirror on its arm
      box(group, trim, 0.05, 0.16, 0.2, s * (w / 2 + 0.11), 1.3, 1.3);
      // the front: a rectangular lamp each side in a chrome bezel, an indicator round the corner
      box(group, chrome, 0.44, 0.24, 0.03, s * 0.66, 0.72, L);
      box(group, LAMP, 0.38, 0.18, 0.03, s * 0.66, 0.72, L + 0.012);
      box(group, AMBER, 0.16, 0.18, 0.03, s * 0.96, 0.72, L - 0.005);
      box(group, AMBER, 0.03, 0.18, 0.14, s * (w / 2 + 0.002), 0.72, L - 0.1);
      // the tail: tall lamps up the corners (tail lamp, brake lamp, indicator, reversing lamp)
      box(group, TAIL, 0.16, 0.22, 0.03, s * 0.9, 1.12, -L);
      box(group, BRAKE, 0.16, 0.18, 0.03, s * 0.9, 0.92, -L);
      box(group, AMBER, 0.16, 0.1, 0.03, s * 0.9, 0.78, -L);
      box(group, REVERSE, 0.16, 0.08, 0.03, s * 0.9, 0.69, -L);
      box(group, bumper, 0.05, 0.22, 0.4, s * (w / 2 + 0.01), 0.42, L - 0.18);               // the bumpers' ends, round the corners
      box(group, bumper, 0.05, 0.22, 0.4, s * (w / 2 + 0.01), 0.42, -L + 0.18);
    }
    // the grille: chrome-framed, black, three chrome bars across
    box(group, chrome, 0.78, 0.28, 0.03, 0, 0.72, L);
    box(group, dark, 0.7, 0.2, 0.03, 0, 0.72, L + 0.01);
    for (const y of [0.66, 0.72, 0.78]) box(group, chrome, 0.68, 0.018, 0.02, 0, y, L + 0.025);
    box(group, bumper, w + 0.02, 0.24, 0.16, 0, 0.42, L + 0.02);                             // the pale bumper,
    box(group, trim, w * 0.5, 0.06, 0.03, 0, 0.38, L + 0.1);                                 // its slot of an intake,
    box(group, plate, 0.44, 0.12, 0.02, 0, 0.47, L + 0.105);                                 // and the plate on it
    box(group, bumper, w + 0.02, 0.24, 0.16, 0, 0.42, -L - 0.02);                            // the rear bumper,
    box(group, plate, 0.44, 0.13, 0.02, 0, 0.72, -L - 0.005);                                // the plate over it,
    box(group, glass, w - 0.42, 0.56, 0.02, 0, 1.48, -L - 0.005);                            // its window,
    box(group, BRAKE, 0.36, 0.05, 0.03, 0, 1.82, -L - 0.005);                                // and a brake lamp over it
    rod(group, trim, 0.035, 0.3, 0.6, 0.28, -L + 0.06, 'z', 8);                              // the exhaust
    const keep = new Set();
    const geo = wheelGeo(R, 0.28), tyre = lambert(0x141414), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [WZ, -WZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => bumper.color.setHex(evil ? 0x2e3036 : 0xd6d0c0),
    };
    group.userData.livery(false);
    return group;
  },

  // The Pick-Up: a lifted seventies square-body pickup, orange, worked hard. A big dark bull bar across its nose, a
  // wide grille between square lamps, a worn bonnet (sun-bleached, scratched, the ghost of a decal); a square cab with a
  // sports bar of spot lamps over its roof; an open bed with wheel tubs, a tailgate and tall tail lamps; black flares
  // over chunky tyres, and the lift showing beneath: the frame, the axles and long shocks.
  pickup: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.48, WX = w / 2 - 0.05, FZ = L * 0.62, RZ = -L * 0.6, ucw = w * 0.92;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const bar = lambert(0x1d2238), flare = lambert(0x1c1e22), plate = lambert(0xece6cc);
    const worn = new THREE.MeshLambertMaterial({ map: wear(), transparent: true, depthWrite: false });
    const arch = (zc) => [[zc + 0.62, 0.95], [zc + 0.5, 1.14], [zc - 0.5, 1.14], [zc - 0.62, 0.95]];
    // the front end and the cab's doors, below the waist, its front arches squared off
    side(group, paint, w, [[2.5, 0.95, 0.04], [2.52, 1.5, 0.05], [0.4, 1.5], [-0.6, 1.5], [-0.6, 0.95], ...arch(FZ).reverse()], 0.05);
    // the cab above it, a little narrower
    side(group, paint, ucw, [[0.84, 1.46], [0.44, 1.98, 0.05], [-0.5, 2.0, 0.06], [-0.58, 1.46]], 0.05);
    const rise = Math.atan2(0.52, 0.4);
    slab(group, glass, ucw - 0.16, 0.02, 0.54, 0, 1.722 + 0.04, 0.64 + 0.04, rise);          // the windscreen
    box(group, glass, ucw - 0.4, 0.3, 0.02, 0, 1.76, -0.636);                                 // the back window
    decal(group, worn, w - 0.22, 1.56, 0, 1.556, 1.66, 'y');                                  // the worn bonnet
    // the bed: its sides (arches cut), the headboard, floor, wheel tubs and tailgate
    for (const s of [-1, 1]) side(group, paint, 0.1, [[-0.66, 0.95], [-0.66, 1.56, 0.03], [-2.55, 1.56, 0.03], [-2.55, 0.95], ...arch(RZ)], 0.02, s * (w / 2 - 0.05));
    box(group, paint, w - 0.2, 0.56, 0.08, 0, 1.25, -0.7);
    box(group, trim, w - 0.2, 0.04, 1.82, 0, 1.15, -1.62);
    for (const s of [-1, 1]) box(group, paint, 0.32, 0.26, 1.04, s * (w / 2 - 0.26), 1.28, RZ);
    box(group, paint, w - 0.2, 0.56, 0.08, 0, 1.25, -2.51);
    for (const s of [-1, 1]) {
      const x = s * (ucw / 2 + 0.006), X = s * (w / 2 + 0.003);
      prism(group, glass, 0.02, [[0.68, 1.56], [0.38, 1.92], [-0.18, 1.92], [-0.18, 1.56]], x);  // the door's window
      box(group, chrome, 0.14, 0.03, 0.03, s * (ucw / 2 + 0.07), 1.58, 0.66);                 // a big square mirror on its arm
      box(group, chrome, 0.04, 0.26, 0.16, s * (ucw / 2 + 0.15), 1.66, 0.66);
      box(group, AMBER, 0.012, 0.07, 0.14, X, 1.38, 2.3);                                     // side markers
      box(group, TAIL, 0.012, 0.07, 0.14, s * (w / 2 + 0.003), 1.4, -2.38);
      // the front: square lamps in chrome bezels, an indicator under each
      box(group, chrome, 0.32, 0.26, 0.03, s * 0.74, 1.28, 2.58);
      box(group, LAMP, 0.24, 0.2, 0.03, s * 0.74, 1.28, 2.593);
      box(group, AMBER, 0.28, 0.08, 0.03, s * 0.74, 1.08, 2.58);
      // the tail: tall lamps on the bed's corners (tail, brake, reversing) and an indicator
      box(group, TAIL, 0.1, 0.16, 0.03, s * 0.98, 1.44, -2.56);
      box(group, BRAKE, 0.1, 0.12, 0.03, s * 0.98, 1.29, -2.56);
      box(group, AMBER, 0.1, 0.07, 0.03, s * 0.98, 1.195, -2.56);
      box(group, REVERSE, 0.1, 0.07, 0.03, s * 0.98, 1.115, -2.56);
      // black flares over the wheels
      for (const z of [FZ, RZ]) place(group, new THREE.CylinderGeometry(R + 0.14, R + 0.14, 0.24, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), flare, s * (w / 2 + 0.06), R, z);
      // the lift: long shocks at each wheel, the frame rails
      for (const z of [FZ, RZ]) box(group, trim, 0.07, 0.56, 0.07, s * 0.62, 0.74, z - 0.18);
      box(group, trim, 0.1, 0.14, 4.6, s * 0.48, 0.86, 0);
      // the sports bar over the bed, just behind the cab
      rod(group, bar, 0.04, 0.62, s * 0.86, 1.86, -0.82, 'y', 8);
      for (const x of [0.22, 0.58]) {
        rod(group, bar, 0.09, 0.1, s * x, 2.2, -0.8, 'z', 10);
        rod(group, LAMP, 0.075, 0.02, s * x, 2.2, -0.745, 'z', 10);
      }
    }
    box(group, bar, 1.82, 0.08, 0.08, 0, 2.15, -0.82);
    // the grille: chrome framed, dark, a bar across it
    box(group, chrome, 0.98, 0.32, 0.03, 0, 1.26, 2.58);
    box(group, dark, 0.92, 0.26, 0.03, 0, 1.26, 2.59);
    box(group, chrome, 0.9, 0.03, 0.02, 0, 1.26, 2.605);
    // the bull bar: a heavy bumper with uprights and a hoop over the grille
    box(group, bar, w + 0.12, 0.28, 0.22, 0, 0.98, 2.66);
    for (const x of [-0.42, 0.42]) box(group, bar, 0.08, 0.62, 0.08, x, 1.34, 2.72);
    box(group, bar, 0.92, 0.08, 0.08, 0, 1.62, 2.72);
    for (const s of [-1, 1]) box(group, bar, 0.08, 0.08, 0.22, s * 0.42, 1.62, 2.64);
    box(group, plate, 0.4, 0.12, 0.02, 0, 0.98, 2.775);
    box(group, chrome, w + 0.06, 0.18, 0.18, 0, 0.98, -2.62);                                 // a step bumper behind
    box(group, plate, 0.4, 0.14, 0.02, 0, 0.98, -2.715);
    for (const z of [FZ, RZ]) rod(group, trim, 0.07, 1.7, 0, R, z, 'x', 8);                   // the axles
    rod(group, trim, 0.045, 0.6, 0.66, 0.8, -2.3, 'z', 8);                                    // the exhaust
    const keep = new Set();
    const geo = wheelGeo(R, 0.42), tyre = lambert(0x141414), hub = lambert(0xb8bcc2);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => bar.color.setHex(evil ? 0x17181b : 0x1d2238),
    };
    group.userData.livery(false);
    return group;
  },
};
