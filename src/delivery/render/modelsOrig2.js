// ---- four of the original garage cars, rebuilt (the owner, 13-Oct: "bring the original models up to an acceptable
// quality"): the Lowrider (and the Super Lowrider, the same builder taken to extremes), the Sportscompact, the Family
// Wagon and the Love Bus. Each after the owner's own older game's 'Pick a car!' pictures: a purple 1960s lowrider
// with gold trim and an arched gold grille; a green sport compact with twin white stripes and a LASER III banner
// across its windscreen; a periwinkle family station wagon on big tyres; a two-tone split-screen camper bus.
// Built as render/models.js' builders are (models.js MODELS hands these on, under the same names): each takes the
// car's entry (cars.js, or a traffic kind's CONFIG.vehicles entry) and returns a group, front facing local +z, with
//   userData.body     the mesh whose material is the paint (so the livery can be swapped: its colour is set from
//                     outside, so the paint is a material of each model's own and carries no texture)
//   userData.animate  (seconds) => void
//   userData.livery   (evil) => void: the parts that differ between Good and Evil beyond the paint (a second colour)
// How they are made: the bodies are side views extruded across the car with their edges rounded off (one bevel step),
// then bent (a warp: tumblehome on the glasshouse, a tuck under the sills, a taper to the nose); every part that never
// moves is merged into one mesh per material (the paint, the glass, the chrome...); the wheels stay meshes of their own
// (a tyre and a hub each: the suspension and the Super kit find them as they find any model's). The few small
// pictures (a wire wheel's spokes, the lowrider's grille, a mesh grille, the sport compact's banner) are canvases made
// once and shared by every model (userData.shared: clearGroup keeps them). State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color, options = {}) => new THREE.MeshLambertMaterial({ color, ...options });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const keep = (thing) => { thing.userData.shared = true; return thing; }; // (made once, shared by every model)
// the materials every model here shares (none of them is ever recoloured)
const GLASS = keep(lambert(0x1d2531, { side: THREE.DoubleSide }));
const CHROME = keep(lambert(0xd9dce1)), GOLD = keep(lambert(0xe2b64a)), TRIM = keep(lambert(0x1b1d21));
// eslint-disable-next-line no-unused-vars -- (for the next cars: WIP)
const TYRE = keep(lambert(0x151515)), STEEL = keep(lambert(0xb9bec6)), PLATE = keep(lambert(0xf1eee2));
const WHITEWALL = keep(lambert(0xf2f0ea)), WELL = keep(lambert(0x0d0e10));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xc0121a)), STOP = keep(basic(0xff3b3b));
const AMBER = keep(basic(0xffa21a)), REVERSE = keep(basic(0xf6f4ee));

// ---- small pictures, drawn once -----------------------------------------------------------------------------
const PICTURES = new Map();
const picture = (key, w, h, draw, setup) => {
  if (PICTURES.has(key)) return PICTURES.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const map = keep(new THREE.CanvasTexture(canvas));
  map.colorSpace = THREE.SRGBColorSpace;
  setup?.(map);
  PICTURES.set(key, map);
  return map;
};
// a wire wheel's face, seen end on (a cylinder's cap maps the middle of the picture to its middle): a rim, a
// lattice of fine spokes crossing over each other and a hub; grey, so the material's colour makes it chrome or gold
const wireFace = () => picture('wire', 64, 64, (g) => {
  g.fillStyle = '#3a3c40';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#f4f4f4';
  g.lineWidth = 1.2;
  for (let i = 0; i < 36; i++) { // (each spoke leaves the hub at a slant, crossing its neighbours)
    const a = i * Math.PI * 2 / 36, b = a + (i % 2 ? 0.5 : -0.5);
    g.beginPath();
    g.moveTo(32 + Math.cos(a) * 7, 32 + Math.sin(a) * 7);
    g.lineTo(32 + Math.cos(b) * 27, 32 + Math.sin(b) * 27);
    g.stroke();
  }
  g.lineWidth = 5;
  g.beginPath(); g.arc(32, 32, 29, 0, Math.PI * 2); g.stroke(); // (the rim)
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(32, 32, 8, 0, Math.PI * 2); g.fill();    // (the hub)
});
// the lowrider's grille: upright gold bars on black, inside a gold frame (laid on an arch: see lowrider)
const archGrille = () => picture('archgrille', 64, 64, (g) => {
  g.fillStyle = '#120d06';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f2cf6a';
  for (let x = 4; x < 62; x += 6) g.fillRect(x, 0, 2.5, 64);
  g.fillRect(0, 30, 64, 3); // (one bar across)
});
// a black mesh (a grille, an intake): a fine diamond lattice, tiled
// eslint-disable-next-line no-unused-vars -- (for the next cars: WIP)
const meshGrille = () => picture('mesh', 32, 32, (g) => {
  g.fillStyle = '#0b0c0e';
  g.fillRect(0, 0, 32, 32);
  g.strokeStyle = '#3c3f46';
  g.lineWidth = 1.5;
  for (let k = -32; k < 64; k += 8) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 32, 32); g.stroke();
    g.beginPath(); g.moveTo(k + 32, 0); g.lineTo(k, 32); g.stroke();
  }
}, (map) => { map.wrapS = map.wrapT = THREE.RepeatWrapping; });
// a strip of lettering: a windscreen banner
// eslint-disable-next-line no-unused-vars -- (for the next cars: WIP)
const banner = (text, ink, ground) => picture('banner:' + text + ink + ground, 128, 32, (g, w, h) => {
  g.fillStyle = ground;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.font = 'bold italic 22px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1, w * 0.9);
});
const MATS = new Map(); // (the textured materials, one for each picture)
const textured = (key, color, map) => MATS.get(key) || MATS.set(key, keep(new THREE.MeshLambertMaterial({ color, map }))).get(key);
// (a flat flame on a flank, seen from either side)
const flameMat = (color) => MATS.get('flame' + color) || MATS.set('flame' + color, keep(lambert(color, { side: THREE.DoubleSide }))).get('flame' + color);

// ---- the parts: geometries made in place, gathered by material and merged ---------------------------------------
// a model's parts list: add(material, geometry) gathers it; into(parent) makes one mesh per material (returned by
// material) and empties the list
const parts = () => {
  const lists = new Map();
  return {
    count: 0,
    add(material, geo) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!lists.has(material)) lists.set(material, []);
      lists.get(material).push(g);
      this.count++;
      return g;
    },
    into(parent) {
      const meshes = new Map();
      for (const [material, geos] of lists) {
        const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
        for (const g of geos) g.dispose();
        parent.add(mesh);
        meshes.set(material, mesh);
      }
      lists.clear();
      return meshes;
    },
  };
};
// a box, turned (pitch about x, then yaw about y, roll about z first) and put in place
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel), `seg` sides
const dsc = (r, depth, x, y, z, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).translate(x, y, z);
// a round bar: along 'x' (across the car), 'y' (upright) or 'z' (along it)
const bar = (r, length, x, y, z, axis = 'z', seg = 8) => {
  const geo = new THREE.CylinderGeometry(r, r, length, seg);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo.translate(x, y, z);
};
// a square rod `t` thick from point a to point b ([x, y, z]): a trim line, a shut line, a pillar's edge
const UP = new THREE.Vector3(0, 0, 1), q = new THREE.Quaternion(), va = new THREE.Vector3(), vb = new THREE.Vector3();
const rod = (a, b, t, t2 = t) => {
  va.set(...a); vb.set(...b);
  const length = va.distanceTo(vb);
  q.setFromUnitVectors(UP, vb.clone().sub(va).normalize());
  return new THREE.BoxGeometry(t, t2, length).applyQuaternion(q).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
};
// rods along a polyline of points
const rods = (points, t) => points.slice(1).map((p, i) => rod(points[i], p, t));
// a flat convex panel through the points ([x, y, z], in order round it): a window, a decal. Its uv: the first
// corner (0, 0) to the third (1, 1), for a four-cornered one
const panel = (points) => {
  const pos = [], uv = [], corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let i = 1; i + 1 < points.length; i++) {
    for (const k of [0, i, i + 1]) { pos.push(...points[k]); uv.push(...(corners[k] || [0, 0])); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
};
// a side view ([z, y] points, or [z, y, r] to round that corner off by about r) as a THREE.Shape
const outline = (points) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, r = 0], i) => {
    if (!r) { if (i) shape.lineTo(z, y); else shape.moveTo(z, y); return; }
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(...from); else shape.moveTo(...from);
    shape.quadraticCurveTo(z, y, ...to);
  });
  shape.closePath();
  return shape;
};
// the points round a wheel arch cut up into a side view's bottom edge (at height `sill`), from its back to its front
const arch = (z, y, r, sill, n = 7) => {
  const b = Math.asin(Math.max(-1, Math.min(1, (sill - y) / r))), pts = [];
  for (let i = 0; i <= n; i++) { const t = Math.PI - b - (Math.PI - 2 * b) * i / n; pts.push([z + Math.cos(t) * r, y + Math.sin(t) * r]); }
  return pts;
};
// a solid: the side view `shape` extruded across the car, `half` each side of the middle, its edges rounded off by
// `round` (which grows the side view by as much), then each point's x scaled by warp(y, z) (1: unchanged)
const extrude = (shape, half, round, warp = null, curve = 4) => {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: half * 2 - round * 2, curveSegments: curve, bevelEnabled: round > 0, bevelThickness: round, bevelSize: round, bevelSegments: 1,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(half - round, 0, 0);
  if (warp) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * warp(pos.getY(i), pos.getZ(i)));
    geo.computeVertexNormals();
  }
  return geo;
};
// a glasshouse's face along the edge of its side view from p to q ([z, y]), pushed out `out` (its rounding, and a
// hair): the corners of a pane on it, `inset` of the edge's length in from each end, and `side` m in from the sides
// (where the face is half(y) wide each way): for a windscreen or a rear window
const pane = (p, q2, out, half, inset, side) => {
  const dz = q2[0] - p[0], dy = q2[1] - p[1], len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len; // (the normal: out of the face)
  const s = Math.sign(nz * (p[0] + q2[0]) + 1e-9) || 1; // (outward is away from the car's middle)
  const at = (t, x) => { const z = p[0] + dz * t + s * nz * out, y = p[1] + dy * t + s * ny * out; return [x * (half(y) - side), y, z]; };
  const [a, b] = [inset, 1 - inset];
  return panel([at(a, -1), at(a, 1), at(b, 1), at(b, -1)]);
};
// a window on a glasshouse's flank: the side view polygon `pts` ([z, y]) on the side `sx` (-1, 1), where the flank is
// half(y) out from the middle, pushed out a hair
const flankPane = (pts, sx, half) => panel((sx > 0 ? pts : pts.slice().reverse()).map(([z, y]) => [sx * (half(y) + 0.006), y, z]));

// ---- a wheel: a tyre and a hub, meshes of their own (the suspension plants them; the Super kit measures them) ----
const GEOS = new Map();
const geoOnce = (key, make) => GEOS.get(key) || GEOS.set(key, keep(make())).get(key);
const wheel = (parent, R, width, x, y, z, hubMaterial, hubR = R * 0.62, hubGeo = null) => {
  const tyre = new THREE.Mesh(geoOnce('tyre' + [R, width], () => new THREE.CylinderGeometry(R, R, width, 16, 1)), TYRE);
  const hub = new THREE.Mesh(hubGeo || geoOnce('hub' + [hubR, width], () => new THREE.CylinderGeometry(hubR, hubR, width + 0.03, 14, 1)), hubMaterial);
  for (const mesh of [tyre, hub]) {
    mesh.rotation.z = Math.PI / 2; // (axle across the car)
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return [tyre, hub];
};

// ---- the builders -------------------------------------------------------------------------------------------
export const ORIG2_MODELS = {
  // A long, low 1960s hardtop on hydraulics (a '64 Impala, more or less): slab sides with a gold line along the belt
  // and round the roof, a chrome spear down each flank, an arched gold grille between two pairs of round lamps, a
  // long flat boot with three round tail lamps a side, chrome bumpers, chrome wire wheels. The front end rises and
  // falls in a smooth, endless bob, pivoting about the rear axle; the front wheels hang on their suspension and lift
  // only part of the way with the nose, so as it rises they droop below the body.
  // The Super Lowrider (model 'superlowrider') is the same car taken to extremes: flames licking back along its
  // flanks, gold wire wheels on whitewalls, a chrome continental kit on the tail, a hood ornament, and neon glowing
  // underneath, cycling through the colours; and it hops far higher, rocking side to side as it goes
  lowrider: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36, extreme = car.model === 'superlowrider';
    const half = w / 2, rearZ = -L * 0.6, frontZ = L * 0.64;
    // everything that rises with the front end hangs off this, whose origin is the rear axle; `shell` puts the parts,
    // made where they stand on the floor, back where they belong in it
    const chassis = new THREE.Group();
    chassis.position.set(0, R, rearZ);
    group.add(chassis);
    const shell = new THREE.Group();
    shell.position.set(0, -R, -rearZ);
    chassis.add(shell);
    const paint = lambert(car.color), P = parts();
    const trimMetal = extreme ? GOLD : CHROME; // (the Super's brightwork is gold)

    // the body: slab sides from the sill (0.21) to the belt (0.85), the bonnet and the long boot flat at the belt,
    // the arches cut up into it; tucked in a little under the sills and drawn in a touch at its ends
    const sill = 0.26, belt = 0.8, round = 0.05; // (drawn: the rounding grows it 5 cm all round)
    const bodyPts = [[-L + 0.05, sill, 0.06], ...arch(rearZ, R + 0.02, 0.44, sill), ...arch(frontZ, R + 0.02, 0.44, sill),
      [L - 0.05, sill, 0.06], [L - 0.05, belt - 0.03, 0.1], [L - 0.3, belt], [-L + 0.3, belt], [-L + 0.05, belt - 0.03, 0.1]];
    const body = new THREE.Mesh(extrude(outline(bodyPts), half, round), paint); // (slab sided, as they were)
    shell.add(body);
    const top = belt + round; // (0.85: the belt, the bonnet and the boot lid)
    // dark wheel wells inside the arches
    for (const z of [rearZ, frontZ]) P.add(WELL, bx(w - 0.5, 0.48, 0.84, 0, 0.5, z));
    // the glasshouse: a low hardtop, its windscreen and rear window raked, the sides leaning in (tumblehome)
    const gBase = top - 0.01, gTop = 1.08, gRound = 0.03, gHalf = half - 0.08, gHalfTop = half - 0.2;
    const lean = (y) => 1 - (1 - gHalfTop / gHalf) * Math.max(0, (y - gBase) / (gTop - gBase));
    const houseHalf = (y) => gHalf * lean(y);
    const ws = [L * 0.38, gBase], wsTop = [L * 0.14, gTop], rwTop = [-L * 0.34, gTop], rw = [-L * 0.54, gBase];
    P.add(paint, extrude(outline([ws, wsTop, rwTop, rw]), gHalf, gRound, (y) => lean(y)));
    P.add(GLASS, pane(ws, wsTop, gRound + 0.006, houseHalf, 0.05, 0.1));      // the windscreen,
    P.add(GLASS, pane(rwTop, rw, gRound + 0.006, houseHalf, 0.06, 0.16));     // the rear window,
    const aLine = (y, d) => ws[0] + (wsTop[0] - ws[0]) * (y - gBase) / (gTop - gBase) - d; // (the A pillar's line, d m back)
    const cLine = (y, d) => rw[0] + (rwTop[0] - rw[0]) * (y - gBase) / (gTop - gBase) + d; // (the C pillar's)
    const lo = gBase + 0.035, hi = gTop - 0.035, bPost = -L * 0.06;
    for (const sx of [-1, 1]) {
      P.add(GLASS, flankPane([[aLine(lo, 0.16), lo], [aLine(hi, 0.16), hi], [bPost + 0.04, hi], [bPost + 0.04, lo]], sx, houseHalf)); // the side windows
      P.add(GLASS, flankPane([[bPost - 0.04, lo], [bPost - 0.04, hi], [cLine(hi, 0.2), hi], [cLine(lo, 0.2), lo]], sx, houseHalf));
      // the gold: a line along the belt, round the roof and down the pillars
      const gx = (y) => sx * houseHalf(y);
      P.add(GOLD, rod([sx * half, top - 0.05, L - 0.12], [sx * half, top - 0.05, -L + 0.12], 0.022));
      for (const g of rods([[gx(gBase), gBase + 0.01, ws[0]], [gx(gTop), gTop, wsTop[0]], [gx(gTop), gTop, rwTop[0]], [gx(gBase), gBase + 0.01, rw[0]]], 0.022)) P.add(GOLD, g);
      // a chrome spear down the flank, and the sill's chrome
      P.add(CHROME, rod([sx * half, 0.58, L - 0.25], [sx * half, 0.58, -L + 0.35], 0.03));
      P.add(CHROME, rod([sx * half, 0.3, frontZ - 0.5], [sx * half, 0.3, rearZ + 0.5], 0.03));
      // the door: its shut lines and its handle
      for (const z of [L * 0.36, -L * 0.14]) P.add(TRIM, rod([sx * half, top - 0.07, z], [sx * half, 0.33, z - 0.02], 0.014));
      P.add(CHROME, bx(0.03, 0.03, 0.16, sx * (half + 0.005), 0.7, -L * 0.07));
      // a chrome mirror on the door, on a short stalk
      P.add(CHROME, bx(0.06, 0.08, 0.06, sx * (half - 0.02), top + 0.02, L * 0.33));
      P.add(CHROME, bar(0.05, 0.14, sx * (half + 0.01), top + 0.08, L * 0.33, 'z', 8));
      // the nose: a pair of round lamps each side in chrome bezels, an indicator under them
      for (const x of [0.5, 0.78]) {
        P.add(trimMetal, dsc(0.11, 0.04, sx * x, 0.6, L + 0.01, 12));
        P.add(LAMP, dsc(0.088, 0.04, sx * x, 0.6, L + 0.025, 12));
      }
      P.add(AMBER, bx(0.16, 0.05, 0.03, sx * 0.64, 0.43, L + 0.01));
      // the tail: three round lamps a side (the inner one the brake lamp), in chrome bezels on a chrome bar
      for (const [x, lamp] of [[0.4, STOP], [0.6, TAIL], [0.8, TAIL]]) {
        P.add(CHROME, dsc(0.1, 0.04, sx * x, 0.6, -L - 0.01, 12));
        P.add(lamp, dsc(0.08, 0.04, sx * x, 0.6, -L - 0.025, 12));
      }
      P.add(REVERSE, bx(0.12, 0.05, 0.03, sx * 0.4, 0.3, -L - 0.075)); // reversing lamps in the bumper
      P.add(AMBER, bx(0.1, 0.05, 0.03, sx * 0.8, 0.3, -L - 0.075));     // and the indicators
      for (const e of [1, -1]) P.add(CHROME, bx(0.05, 0.11, 0.34, sx * (half + 0.0), 0.3, e * (L - 0.1))); // (the bumpers' ends, wrapped round the corners)
    }
    P.add(CHROME, bx(w * 0.86, 0.025, 0.02, 0, 0.6, -L - 0.005));                 // a chrome bar across the tail, between the lamps
    // the arched grille, gold, between the lamps (its picture: upright bars), and its gold frame
    const gw = 0.25, gb = 0.4, gt = 0.78; // (its half width, its foot and the top of its arch)
    const grille = outline([[-gw, gb], [gw, gb], [gw, gt - 0.14], [gw * 0.6, gt, 0.14], [-gw * 0.6, gt, 0.14], [-gw, gt - 0.14]]);
    const gGeo = new THREE.ExtrudeGeometry(grille, { depth: 0.04, curveSegments: 4, bevelEnabled: false });
    { // (its picture spread over the arch: the shape's x and y to 0..1)
      const uv = gGeo.attributes.uv, pos = gGeo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + gw) / (2 * gw), (pos.getY(i) - gb) / (gt - gb));
    }
    P.add(textured('archgrille', extreme ? 0xffe9a8 : 0xffffff, archGrille()), gGeo.translate(0, 0, L - 0.015));
    const f = gw + 0.012, ft = gt + 0.012;
    for (const g of rods([[-f, gb - 0.01, L + 0.03], [-f, ft - 0.15, L + 0.03], [-gw * 0.55, ft, L + 0.03], [gw * 0.55, ft, L + 0.03], [f, ft - 0.15, L + 0.03], [f, gb - 0.01, L + 0.03], [-f, gb - 0.01, L + 0.03]], 0.03)) P.add(GOLD, g);
    // chrome bumpers right across, a number plate on the back, an exhaust under it
    for (const e of [1, -1]) P.add(CHROME, bx(w + 0.04, 0.12, 0.13, 0, 0.3, e * (L + 0.02)));
    P.add(PLATE, bx(0.42, 0.13, 0.02, 0, 0.45, -L - 0.005));
    P.add(CHROME, bar(0.04, 0.3, 0.55, 0.2, -L + 0.02, 'z', 8));
    // the bonnet's centre crease and the boot lid's shut line
    P.add(paint, bx(0.06, 0.03, L * 0.6, 0, top + 0.005, L * 0.66));
    P.add(TRIM, bx(w * 0.7, 0.012, 0.012, 0, top + 0.002, -L + 0.25));

    // the front wheels hang on their own (not part of the chassis: see animate); the rear ones stay planted
    const frontAxle = new THREE.Group();
    frontAxle.position.set(0, R, frontZ);
    group.add(frontAxle);
    const wire = textured(extreme ? 'wire-gold' : 'wire-chrome', extreme ? 0xf0c860 : 0xe8ebef, wireFace());
    const hubGeo = geoOnce('wirehub', () => mergeGeometries([new THREE.CylinderGeometry(0.25, 0.25, 0.27, 14), // (the wire face, and
      new THREE.CylinderGeometry(0.05, 0.07, 0.36, 6)]));                                                       // the spinner's knock-off)
    for (const sx of [-1, 1]) {
      for (const [parent, y, z] of [[frontAxle, 0, 0], [group, R, rearZ]]) {
        const x = sx * (half - 0.06);
        wheel(parent, R, 0.25, x, y, z, wire, 0.25, hubGeo);
        if (extreme) { // whitewalls
          const wall = new THREE.Mesh(geoOnce('whitewall', () => new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.26, 16)), WHITEWALL);
          wall.rotation.z = Math.PI / 2;
          wall.position.set(x, y, z);
          parent.add(wall);
        }
      }
    }
    let glow = null;
    if (extreme) {
      P.add(GOLD, bx(0.035, 0.08, 0.16, 0, top + 0.04, L - 0.2));                    // the hood ornament
      for (const sx of [-1, 1]) {                                                   // flames, licking back from the nose
        for (const [colour, scale, out] of [[0xff7a1a, 1, 0.008], [0xffd23f, 0.7, 0.016]]) {
          const flame = new THREE.Shape(), pts = [[0.96, 0.2], [0.96, 0.6], [0.6, 0.72], [0.48, 0.52], [0.2, 0.68], [0.08, 0.44],
            [-0.2, 0.6], [-0.4, 0.34], [0.2, 0.24]].map(([z, y]) => [L * (z * scale + 0.96 * (1 - scale)), 0.45 + (y - 0.4) * 0.6 * scale]);
          pts.forEach(([z, y], i) => (i ? flame.lineTo(z, y) : flame.moveTo(z, y)));
          const geo = new THREE.ShapeGeometry(flame).rotateY(-Math.PI / 2).translate(sx * (half + out), 0, 0); // (its x along the car)
          P.add(flameMat(colour), geo);
        }
      }
      // the continental kit: the spare in its chrome cover, standing on a ledge off the bumper
      P.add(CHROME, bx(0.7, 0.05, 0.3, 0, 0.36, -L - 0.2));
      P.add(TYRE, dsc(0.3, 0.16, 0, 0.66, -L - 0.2, 16));
      P.add(CHROME, dsc(0.23, 0.18, 0, 0.66, -L - 0.2, 14));
      const fade = picture('pool', 64, 64, (g) => {                                // (a soft pool of light: bright in the
        const pool = g.createRadialGradient(32, 32, 4, 32, 32, 32);                 // middle, fading out to nothing)
        pool.addColorStop(0, 'rgba(255,255,255,1)');
        pool.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = pool;
        g.fillRect(0, 0, 64, 64);
      });
      glow = new THREE.MeshBasicMaterial({ color: 0x00e5ff, map: fade, transparent: true, depthWrite: false }); // the neon underneath,
      const neon = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.45, L * 2.2), glow);                          // lighting the road
      neon.rotation.x = -Math.PI / 2;
      neon.position.set(0, 0.02, 0);
      group.add(neon);
    }
    P.into(shell);
    group.userData = {
      body,
      parts: P.count,
      animate: (t) => {
        const tilt = (extreme ? 0.5 : 0.27) * (1 - Math.cos(t * 4)) / 2; // 0 (level) .. 0.27 rad (0.5 hopped up), and back, smoothly
        chassis.rotation.x = -tilt; // (negative pitch lifts the nose)
        if (extreme) {
          chassis.rotation.z = Math.sin(t * 2) * 0.12;                   // rocking side to side,
          glow.color.setHSL((t * 0.15) % 1, 1, 0.55);                    // the neon cycling round
        }
        frontAxle.position.y = R + Math.sin(tilt) * (frontZ - rearZ) * 0.3; // (the front wheels rise only a third as far as the nose does)
      },
    };
    return group;
  },
};
