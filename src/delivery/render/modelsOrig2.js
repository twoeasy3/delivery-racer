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
// then bent where wanted (a warp: the glasshouse's tumblehome); no panel lines (the owner, 13-Oct); every part that never
// moves is merged into one mesh per material (the paint, the glass, the chrome...); the wheels stay meshes of their own
// (a tyre and a hub each: the suspension and the Super kit find them as they find any model's). The few small
// pictures (the lowrider's grille, a mesh grille, the sport compact's banner) are canvases made
// once and shared by every model (userData.shared: clearGroup keeps them). State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color, options = {}) => new THREE.MeshLambertMaterial({ color, ...options });
const basic = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }); // (a lamp may be a flat panel: seen from either side)
const keep = (thing) => { thing.userData.shared = true; return thing; }; // (made once, shared by every model)
// the materials every model here shares (none of them is ever recoloured)
const GLASS = keep(lambert(0x1d2531, { side: THREE.DoubleSide }));
const CHROME = keep(lambert(0xd9dce1)), GOLD = keep(lambert(0xe2b64a)), TRIM = keep(lambert(0x1b1d21));
const TYRE = keep(lambert(0x151515)), STEEL = keep(lambert(0xc4c8ce)), DARKHUB = keep(lambert(0x4a4e56)), PLATE = keep(lambert(0xf1eee2));
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
// the lowrider's grille: upright gold bars on black, inside a gold frame (laid on an arch: see lowrider)
const archGrille = () => picture('archgrille', 64, 64, (g) => {
  g.fillStyle = '#120d06';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f2cf6a';
  for (let x = 4; x < 62; x += 6) g.fillRect(x, 0, 2.5, 64);
  g.fillRect(0, 30, 64, 3); // (one bar across)
});
// a black mesh (a grille, an intake): a fine diamond lattice, tiled
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
const banner = (text, ink, ground) => picture('banner:' + text + ink + ground, 128, 32, (g, w, h) => {
  g.fillStyle = ground;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.font = 'bold italic 21px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1, w * 0.9);
});
const MATS = new Map(); // (the textured materials, one for each picture)
const textured = (key, color, map) => MATS.get(key) || MATS.set(key, keep(new THREE.MeshLambertMaterial({ color, map, side: THREE.DoubleSide }))).get(key);
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
// a square rod `t` thick from point a to point b ([x, y, z]): a trim line, an arch's lip, a mirror's arm
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
// a point on the face along the side view's edge from p to q ([z, y]), t of the way along it, pushed out `out`: [z, y]
const onEdge = (p, q2, out, t) => {
  const dz = q2[0] - p[0], dy = q2[1] - p[1], len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len;
  const s = Math.sign(nz * (p[0] + q2[0]) + 1e-9) || 1;
  return [p[0] + dz * t + s * nz * out, p[1] + dy * t + s * ny * out];
};
// a four-cornered panel on that face from t0 to t1 along it, x0 to x1 across the car (a lamp, a banner)
const edgePanel = (p, q2, out, t0, t1, x0, x1, uvScale = [1, 1]) => {
  const [z0, y0] = onEdge(p, q2, out, t0), [z1, y1] = onEdge(p, q2, out, t1);
  // (wound to face out of the face, whichever way round x0 and x1 are: a one-sided material shows it either side)
  const [n0, n1] = [onEdge(p, q2, 0, 0.5), onEdge(p, q2, 1, 0.5)], ny = n1[1] - n0[1], nz = n1[0] - n0[0];
  const facing = (x1 - x0) * ((y1 - y0) * nz - (z1 - z0) * ny) > 0;
  const corners = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1]];
  const geo = panel(facing ? corners : [corners[1], corners[0], corners[3], corners[2]]);
  const uv = geo.attributes.uv; // (the picture runs from x0 to x1 either way)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (facing ? uv.getX(i) : 1 - uv.getX(i)) * uvScale[0], uv.getY(i) * uvScale[1]);
  return geo;
};
// a window on a glasshouse's flank: the side view polygon `pts` ([z, y]) on the side `sx` (-1, 1), where the flank is
// half(y) out from the middle, pushed out a hair
const flankPane = (pts, sx, half) => panel((sx > 0 ? pts : pts.slice().reverse()).map(([z, y]) => [sx * (half(y) + 0.006), y, z]));

// ---- a lofted body (the wagon's): smooth, soft-cornered cross-sections along the car ---------------------------------
// linear interpolation through keys [z, ...values] (sorted by z, either way) at z
const along = (keys, z) => {
  const k = keys[0][0] < keys[keys.length - 1][0] ? keys : keys.slice().reverse();
  if (z <= k[0][0]) return k[0].slice(1);
  for (let i = 1; i < k.length; i++) {
    const [z1, ...b] = k[i], [z0, ...a] = k[i - 1];
    if (z <= z1) { const t = (z - z0) / (z1 - z0); return a.map((v, j) => v + (b[j] - v) * t); }
  }
  return k[k.length - 1].slice(1);
};
// a point round a rounded-box cross-section (a superellipse, `p` from 2 round to higher squarer), angle a from the
// right-hand side (+x) going up over the top: half width W, middle height yc, half height hh
const round2 = (W, yc, hh, p, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [W * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)];
};
// a smooth solid through rings: ring(z) gives the ring's points ([x, y], the same count every time, in order round it),
// at each of the stations (z, sorted); both ends closed. Its normals are smooth (shared corners)
const lofted = (stations, ring) => {
  const pos = [], idx = [];
  const rings = stations.map((z) => ring(z));
  const n = rings[0].length;
  rings.forEach((pts, r) => { for (const [x, y] of pts) pos.push(x, y, stations[r]); });
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i, b = r * n + (i + 1) % n, c = (r + 1) * n + i, d = (r + 1) * n + (i + 1) % n;
      idx.push(a, b, d, a, d, c);
    }
  }
  for (const [r, flip] of [[0, false], [rings.length - 1, true]]) { // (the ends: a fan to the ring's middle)
    const mid = pos.length / 3, pts = rings[r];
    pos.push(pts.reduce((t, p) => t + p[0], 0) / n, pts.reduce((t, p) => t + p[1], 0) / n, stations[r]);
    for (let i = 0; i < n; i++) idx.push(...(flip ? [mid, r * n + (i + 1) % n, r * n + i] : [mid, r * n + i, r * n + (i + 1) % n]));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};
// a patch of a surface S(u, v) => [x, y, z] over the grid us by vs, pushed out along its normal by `out`
// (which way is out: away from the point `inside`): a window laid on a curved glasshouse
// us, vs: the grid's lines, which should take in the surface's own (a loft's stations and ring angles), so that the
// patch's flat cells never dip under the loft's
const grid = (a, b, own) => [a, ...own.filter(t => (t - a) * (t - b) < 0).sort((x, y) => (x - y) * Math.sign(b - a)), b];
const patch = (S, us, vs, out, inside) => {
  const pos = [], idx = [], e = 1e-3, nu = us.length - 1, nv = vs.length - 1;
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const u = us[i], v = vs[j];
      const p = new THREE.Vector3(...S(u, v)), du = new THREE.Vector3(...S(u + e, v)).sub(p), dv = new THREE.Vector3(...S(u, v + e)).sub(p);
      const nrm = du.cross(dv).normalize();
      if (nrm.dot(p.clone().sub(inside)) < 0) nrm.negate();
      pos.push(...p.addScaledVector(nrm, out).toArray());
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j; idx.push(a, a + nv + 1, a + 1, a + 1, a + nv + 1, a + nv + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
};

// ---- a wheel: a tyre and a hub, meshes of their own (the suspension plants them; the Super kit measures them) ----
const GEOS = new Map();
const geoOnce = (key, make) => GEOS.get(key) || GEOS.set(key, keep(make())).get(key);
const wheel = (parent, R, width, x, y, z, hubMaterial, hubR = R * 0.55) => {
  const tyre = new THREE.Mesh(geoOnce('tyre' + [R, width], () => new THREE.CylinderGeometry(R, R, width, 16, 1)), TYRE);
  const hub = new THREE.Mesh(geoOnce('hub' + [hubR, width], () => new THREE.CylinderGeometry(hubR, hubR, width + 0.04, 12, 1)), hubMaterial);
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
  // and round the roof, an arched gold grille between two pairs of round lamps, a
  // long flat boot with three round tail lamps a side, chrome bumpers, plain chunky wheels on chrome hubs. The front end rises and
  // falls in a smooth, endless bob, pivoting about the rear axle; the front wheels hang on their suspension and lift
  // only part of the way with the nose, so as it rises they droop below the body.
  // The Super Lowrider (model 'superlowrider') is the same car taken to extremes: flames licking back along its
  // flanks, gold hubs on whitewalls, a chrome continental kit on the tail, a hood ornament, and neon glowing
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
    // the arches cut up into it; slab sided
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

    // the front wheels hang on their own (not part of the chassis: see animate); the rear ones stay planted
    const frontAxle = new THREE.Group();
    frontAxle.position.set(0, R, frontZ);
    group.add(frontAxle);
    for (const sx of [-1, 1]) {
      for (const [parent, y, z] of [[frontAxle, 0, 0], [group, R, rearZ]]) {
        const x = sx * (half - 0.06);
        wheel(parent, R, 0.26, x, y, z, extreme ? GOLD : CHROME); // (plain chunky wheels: a chrome hub, the Super's gold)
        if (extreme) { // whitewalls
          const wall = new THREE.Mesh(geoOnce('whitewall', () => new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.275, 16)), WHITEWALL);
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

  // A small 1990s sport compact coupe (a Plymouth Laser, more or less): a low wedge of a nose with slim headlamps at
  // its corners over a black mesh grille and two black intakes, a cab-forward glasshouse leaning in hard, a fastback
  // hatch to a spoiler, black arch lips and side skirts, twin racing stripes over the bonnet, the roof and the tail
  // (white on a Good one, the Good one's green on an Evil one), a LASER III banner across the top of the windscreen,
  // a full-width tail lamp bar, plain wheels on dark hubs. It sits still
  sport: (car) => {
    const group = new THREE.Group();
    const w = car.hw * 2, L = car.hl, R = 0.36, half = w / 2;
    const frontZ = L * 0.6, rearZ = -L * 0.62;
    const paint = lambert(car.color), stripe = lambert(0xf4f4f0), P = parts();
    // the body, side on: a low nose rising over the front wheels to the scuttle, the belt running back level to a
    // short tail; the arches cut up into it
    const sill = 0.27, round = 0.04;
    const nose = [[L - 0.02, sill + 0.03, 0.05], [L, 0.5, 0.06], [L - 0.16, 0.66, 0.1]], scuttle = [L * 0.27, 0.78];
    const bodyPts = [[-L + 0.04, sill + 0.03, 0.05], ...arch(rearZ, R + 0.02, 0.41, sill), ...arch(frontZ, R + 0.02, 0.41, sill), ...nose,
      [frontZ, 0.76], scuttle, [-L * 0.65, 0.83], [-L + 0.06, 0.83, 0.06], [-L + 0.02, 0.62, 0.04]];
    const body = new THREE.Mesh(extrude(outline(bodyPts), half, round), paint);
    group.add(body);
    for (const z of [rearZ, frontZ]) P.add(WELL, bx(w - 0.66, 0.46, 0.8, 0, 0.5, z));    // dark wheel wells
    // the bonnet's top, for what lies on it: the side view's line from the nose back to the scuttle (pushed out by the rounding)
    const bonnet = [[L - 0.16, 0.66], [frontZ, 0.76], scuttle];
    const bonnetY = (z) => {
      for (let i = 1; i < bonnet.length; i++) {
        const [z0, y0] = bonnet[i - 1], [z1, y1] = bonnet[i];
        if (z <= z0 && z >= z1) return y0 + (y1 - y0) * (z - z0) / (z1 - z0) + round;
      }
      return bonnet[bonnet.length - 1][1] + round;
    };
    // the glasshouse: cab forward, the windscreen steeply raked, a fastback hatch, the sides leaning in hard
    const gBase = 0.8, gTop = 1.09, gRound = 0.03, gHalf = half - 0.06, gHalfTop = half - 0.26;
    const lean = (y) => 1 - (1 - gHalfTop / gHalf) * Math.max(0, (y - gBase) / (gTop - gBase));
    const houseHalf = (y) => gHalf * lean(y);
    const ws = [scuttle[0] - 0.02, gBase], wsTop = [-L * 0.06, gTop], rwTop = [-L * 0.33, gTop], rw = [-L * 0.84, gBase];
    P.add(paint, extrude(outline([ws, wsTop, rwTop, rw]), gHalf, gRound, (y) => lean(y)));
    P.add(GLASS, pane(ws, wsTop, gRound + 0.006, houseHalf, 0.04, 0.09));      // the windscreen,
    P.add(GLASS, pane(rwTop, rw, gRound + 0.006, houseHalf, 0.05, 0.12));     // the hatch's glass
    // the banner across the top of the windscreen (lettering, read from in front: its first corner on the car's left)
    const bt = (y) => houseHalf(y) - 0.1, by0 = ws[1] + (wsTop[1] - ws[1]) * 0.74, by1 = ws[1] + (wsTop[1] - ws[1]) * 0.95;
    { const geo = edgePanel(ws, wsTop, gRound + 0.01, 0.74, 0.95, -bt(by0), bt(by0)); // (a trapezoid: narrower at its top)
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > (by0 + by1) / 2) pos.setX(i, Math.sign(pos.getX(i)) * bt(by1));
      P.add(textured('laser', 0xffffff, banner('LASER III', '#f4f4f4', '#141a2c')), geo); }
    const aLine = (y, d) => ws[0] + (wsTop[0] - ws[0]) * (y - gBase) / (gTop - gBase) - d;
    const cLine = (y, d) => rw[0] + (rwTop[0] - rw[0]) * (y - gBase) / (gTop - gBase) + d;
    const lo = gBase + 0.03, hi = gTop - 0.03, bPost = -L * 0.3;
    // the stripes: two each side of the middle, laid on the bonnet, the roof and the tail
    const stripes = (x0, x1, pts) => { // (a ribbon over the points [z, y], a hair above them)
      for (let i = 1; i < pts.length; i++) {
        const [za, ya] = pts[i - 1], [zb, yb] = pts[i];
        P.add(stripe, panel([[x0, ya + 0.006, za], [x1, ya + 0.006, za], [x1, yb + 0.006, zb], [x0, yb + 0.006, zb]]));
      }
    };
    const bonnetLine = [L - 0.3, frontZ + 0.2, frontZ, frontZ - 0.25, scuttle[0] + 0.02].map(z => [z, bonnetY(z)]);
    for (const sx of [-1, 1]) {
      const x0 = sx * 0.035, x1 = sx * 0.21, [a, b] = sx > 0 ? [x0, x1] : [x1, x0];
      stripes(a, b, [onEdge(nose[1], nose[2], round + 0.004, 0.1), onEdge(nose[1], nose[2], round + 0.004, 0.9), ...bonnetLine]); // (down the nose too)
      stripes(a, b, [[wsTop[0] - 0.03, gTop + gRound], [rwTop[0] + 0.03, gTop + gRound]]);
      stripes(a, b, [[rw[0] - 0.05, 0.83 + round], [-L + 0.26, 0.83 + round]]);
      P.add(GLASS, flankPane([[aLine(lo, 0.1), lo], [aLine(hi, 0.1), hi], [bPost + 0.03, hi], [bPost + 0.03, lo]], sx, houseHalf)); // the door glass,
      P.add(GLASS, flankPane([[bPost - 0.04, lo], [bPost - 0.04, hi], [cLine(hi, 0.12), hi], [cLine(lo, 0.12), lo]], sx, houseHalf)); // the quarter glass
      P.add(TRIM, rod([sx * (houseHalf(lo) + 0.004), lo, bPost], [sx * (houseHalf(hi) + 0.004), hi, bPost], 0.07, 0.03)); // (the B pillar, black)
      // black lips round the arches, and black skirts between them
      for (const z of [frontZ, rearZ]) for (const g of rods(arch(z, R + 0.02, 0.39, sill + 0.02, 6).map(([az, ay]) => [sx * (half - 0.004), ay, az]), 0.04)) P.add(TRIM, g);
      P.add(TRIM, bx(0.05, 0.12, frontZ - rearZ - 0.9, sx * (half + 0.005), 0.3, (frontZ + rearZ) / 2));
      // a mirror on the door at the windscreen's foot (the flanks are left clean: the owner, 13-Oct, no panel lines)
      P.add(paint, bx(0.07, 0.07, 0.13, sx * (houseHalf(gBase) + 0.05), gBase + 0.05, ws[0] - 0.12));
      P.add(TRIM, bx(0.04, 0.04, 0.04, sx * (houseHalf(gBase) + 0.02), gBase + 0.02, ws[0] - 0.1));
      // the nose: a slim headlamp on each corner of its slope, an indicator under it, an intake low down
      P.add(LAMP, edgePanel(nose[1], nose[2], round + 0.006, 0.3, 0.72, sx * 0.42, sx * 0.76));
      P.add(TRIM, edgePanel(nose[1], nose[2], round + 0.003, 0.22, 0.8, sx * 0.38, sx * 0.79));
      P.add(AMBER, bx(0.18, 0.04, 0.02, sx * 0.58, 0.43, L + round + 0.005));
      P.add(textured('mesh', 0xffffff, meshGrille()), panel([[sx * 0.44, 0.29, L + round + 0.007], [sx * 0.72, 0.29, L + round + 0.007], [sx * 0.72, 0.38, L + round + 0.007], [sx * 0.44, 0.38, L + round + 0.007]]));
      // the tail: the lamp bar's ends, the brake lamps, the reversing lamps and indicators in the black panel
      P.add(STOP, bx(0.26, 0.09, 0.02, sx * (half - 0.2), 0.68, -L - round - 0.004));
      P.add(AMBER, bx(0.09, 0.09, 0.02, sx * (half - 0.03), 0.68, -L - round - 0.002));
      P.add(REVERSE, bx(0.1, 0.05, 0.02, sx * 0.24, 0.42, -L - round - 0.004));
      // the spoiler's posts on the tail
      P.add(TRIM, bx(0.05, 0.07, 0.1, sx * 0.5, 0.83 + round + 0.03, -L + 0.12));
      // plain chunky wheels with dark hubs
      wheel(group, R, 0.3, sx * (half - 0.04), R, frontZ, DARKHUB);
      wheel(group, R, 0.32, sx * (half - 0.04), R, rearZ, DARKHUB);
    }
    P.add(TAIL, bx(w - 0.62, 0.07, 0.02, 0, 0.68, -L - round - 0.004));                 // the lamp bar across the tail
    P.add(TRIM, bx(w - 0.12, 0.16, 0.02, 0, 0.67, -L - round + 0.002));                 // on a black panel
    P.add(paint, bx(w - 0.26, 0.04, 0.2, 0, 0.83 + round + 0.08, -L + 0.12));           // the spoiler
    P.add(PLATE, bx(0.4, 0.12, 0.02, 0, 0.5, -L - round - 0.004));                     // the number plate
    P.add(TRIM, bx(w - 0.1, 0.1, 0.06, 0, 0.32, -L - round + 0.01));                    // the rear valance,
    P.add(CHROME, bar(0.045, 0.24, -0.5, 0.3, -L - round, 'z', 8));                     // and the exhaust through it
    P.add(textured('mesh', 0xffffff, meshGrille()), panel([[0.34, 0.31, L + round + 0.007], [-0.34, 0.31, L + round + 0.007], [-0.34, 0.48, L + round + 0.007], [0.34, 0.48, L + round + 0.007]]));
    P.add(TRIM, bx(w - 0.16, 0.05, 0.16, 0, 0.27, L - 0.02));                           // the air dam's lip
    P.into(group);
    const livery = (evil) => stripe.color.setHex(evil ? 0x39ff14 : 0xf4f4f0);
    livery(false);
    group.userData = { body, parts: P.count, animate: () => {}, livery, stripe: (hex) => stripe.color.setHex(hex) };
    return group;
  },

  // A family estate of the late 1970s, soft and round all over (the owner, 13-Oct: "more rounded", not a box like the
  // SUV): a lofted body whose cross-sections are rounded boxes, drawn in to a round nose and a round tail seen from
  // above as from the side, the wings swelling over the big wheels; a low glasshouse lofted the same way, its long
  // roof curving down to a sloped hatch, glazed all round (windscreen, three panes a side, the hatch) with the paint
  // left between for pillars; round headlamps, a small black grille, round-ended chrome bumpers, tail lamps on the
  // tail's corners, big black tyres on plain silver hubs. It sits still
  wagon: (car) => {
    const group = new THREE.Group();
    const L = car.hl, R = 0.46, half = car.hw;
    const frontZ = L * 0.6, rearZ = -L * 0.6;
    const paint = lambert(car.color), P = parts();
    // the body: [z, half width, foot, top] along it, rounded off at both ends (in plan and side alike); over each wheel
    // its foot rises round the arch and its top swells into a wing
    const BODY = [[-L - 0.04, 0.7, 0.58, 0.96], [-L + 0.04, 0.9, 0.5, 1.06], [-L + 0.18, 1.0, 0.46, 1.12], [-L + 0.5, 1.04, 0.44, 1.14],
      [L * 0.38, 1.04, 0.44, 1.14], [L - 0.5, 1.03, 0.44, 1.08], [L - 0.18, 0.98, 0.46, 1.02], [L - 0.04, 0.88, 0.5, 0.94], [L + 0.02, 0.68, 0.56, 0.84]];
    const section = (z) => {
      let [W, foot, top] = along(BODY, z);
      for (const za of [frontZ, rearZ]) {
        const dz = Math.abs(z - za);
        if (dz < 0.56) foot = Math.max(foot, R + 0.02 + Math.sqrt(0.56 * 0.56 - dz * dz));
        if (dz < 0.66) top = Math.max(top, R + 0.02 + Math.sqrt(0.66 * 0.66 - dz * dz));
      }
      return [W, foot, top];
    };
    const stations = new Set(BODY.map(k => k[0]));
    for (const za of [frontZ, rearZ]) for (const d of [0, 0.26, 0.44, 0.54, 0.62, 0.76]) { stations.add(za + d); stations.add(za - d); }
    const zs = [...stations].filter(z => z >= -L - 0.04 && z <= L + 0.02).sort((a, b) => a - b);
    const N = 18, ring = (z) => {
      const [W, foot, top] = section(z), pts = [];
      for (let i = 0; i < N; i++) pts.push(round2(W, (foot + top) / 2, (top - foot) / 2, 3.2, i * Math.PI * 2 / N));
      return pts;
    };
    const body = new THREE.Mesh(lofted(zs, ring), paint);
    group.add(body);
    for (const z of [rearZ, frontZ]) P.add(WELL, bx(2 * half - 0.8, 0.42, 0.72, 0, 0.82, z));  // dark wheel wells
    for (const dir of [1, -1]) P.add(paint, bx(1.5, 0.34, 0.3, 0, 0.66, dir * (L * 0.6 + 0.43)));       // (the valances, closing the body under the nose and the tail)
    // the glasshouse: [z, half width, height] on a foot at 1.1, rounded boxes too, from the windscreen's foot back to the hatch
    const gFoot = 1.1, GH = [[-L + 0.02, 0.8, 0.14], [-L + 0.08, 0.84, 0.3], [-L + 0.22, 0.88, 0.46], [-L + 0.5, 0.92, 0.57],
      [0.0, 0.93, 0.6], [L * 0.14, 0.94, 0.57], [L * 0.26, 0.96, 0.32], [L * 0.4, 0.98, 0.02]];
    const gp = 4, G = (z, a) => { const [W, H] = along(GH, z), [x, y] = round2(W, gFoot, H, gp, a); return [x, y, z]; };
    const gz = GH.map(k => k[0]), gTip = gz[gz.length - 1];
    for (let z = gz[0] + 0.6; z < gTip - 0.6; z += 0.5) gz.push(z);
    gz.sort((a, b) => a - b);
    const GN = 10, gRing = (z) => {                                     // (the top half of a rounded box, its foot straight across)
      const pts = [];
      for (let i = 0; i <= GN; i++) { const [x, y] = G(z, i * Math.PI / GN); pts.push([x, y]); }
      return pts;
    };
    P.add(paint, lofted(gz, gRing));
    // the glass: patches of the glasshouse's own surface, a hair out; the paint between them is the pillars and the roof
    const inside = new THREE.Vector3(0, gFoot, 0), up = (f) => Math.asin(Math.pow(f, gp / 2)); // (the angle at that share of its height)
    const angles = [...Array(GN + 1).keys()].map(i => i * Math.PI / GN), U = (a, b) => grid(a, b, gz), V = (a, b) => grid(a, b, angles);
    P.add(GLASS, patch(G, U(L * 0.36, L * 0.15), V(up(0.2), Math.PI - up(0.2)), 0.01, inside));          // the windscreen,
    P.add(GLASS, patch(G, U(-L + 0.08, -L + 0.4), V(up(0.25), Math.PI - up(0.25)), 0.01, inside));       // the hatch's glass
    for (const [z0, z1] of [[L * 0.12, -L * 0.17], [-L * 0.22, -L * 0.5], [-L * 0.55, -L * 0.82]]) {     // three panes a side
      P.add(GLASS, patch(G, U(z0, z1), V(up(0.14), up(0.8)), 0.01, inside));
      P.add(GLASS, patch(G, U(z0, z1), V(Math.PI - up(0.8), Math.PI - up(0.14)), 0.01, inside));
    }
    // where the body's surface is, end on, at (x, y): the front (dir 1) or the back (dir -1)
    const endAt = (x, y, dir) => {
      for (let z = dir * (L + 0.02); Math.abs(z) > L * 0.5; z -= dir * 0.005) {
        const [W, foot, top] = section(z), yc = (foot + top) / 2, hh = (top - foot) / 2;
        if (Math.pow(Math.abs(x / W), 3.2 / 2) + Math.pow(Math.abs((y - yc) / hh), 3.2 / 2) <= 1) return z;
      }
      return dir * L * 0.5;
    };
    for (const sx of [-1, 1]) {
      // a round headlamp in a chrome ring each side, set into the round nose; an indicator under it
      const lz = endAt(sx * 0.62, 0.8, 1);
      P.add(CHROME, dsc(0.16, 0.08, sx * 0.62, 0.8, lz, 14));
      P.add(LAMP, dsc(0.13, 0.08, sx * 0.62, 0.8, lz + 0.012, 14));
      P.add(AMBER, dsc(0.05, 0.06, sx * 0.62, 0.62, endAt(sx * 0.62, 0.62, 1) + 0.005, 8));
      // a tail lamp on each corner of the tail, its top the brake lamp
      const tz = endAt(sx * 0.66, 0.86, -1);
      P.add(TAIL, bx(0.26, 0.16, 0.08, sx * 0.66, 0.84, tz - 0.01));
      P.add(STOP, bx(0.26, 0.08, 0.08, sx * 0.66, 0.96, endAt(sx * 0.66, 0.96, -1) - 0.01));
      // a small black mirror at the windscreen's foot
      P.add(TRIM, bx(0.12, 0.1, 0.14, sx * 1.0, 1.18, L * 0.3));
      // big black tyres on plain silver hubs
      for (const z of [frontZ, rearZ]) wheel(group, R, 0.34, sx * (half - 0.04), R, z, STEEL);
    }
    // a small black grille between the lamps, and the black lower grille under it; round-ended chrome bumpers
    P.add(TRIM, bx(0.6, 0.16, 0.1, 0, 0.82, endAt(0, 0.82, 1) - 0.02));
    P.add(CHROME, bx(0.56, 0.03, 0.1, 0, 0.82, endAt(0, 0.82, 1) - 0.01));
    P.add(textured('mesh', 0xffffff, meshGrille()), panel([[0.36, 0.6, endAt(0.36, 0.6, 1) + 0.01], [-0.36, 0.6, endAt(0.36, 0.6, 1) + 0.01], [-0.36, 0.7, endAt(0.36, 0.7, 1) + 0.01], [0.36, 0.7, endAt(0.36, 0.7, 1) + 0.01]]));
    for (const dir of [1, -1]) {
      const z = endAt(0.5, 0.52, dir) + dir * 0.03;
      P.add(CHROME, bar(0.08, 1.7, 0, 0.52, z, 'x', 10));
      for (const sx of [-1, 1]) P.add(CHROME, new THREE.SphereGeometry(0.08, 10, 6).translate(sx * 0.85, 0.52, z));
    }
    P.add(PLATE, bx(0.4, 0.12, 0.04, 0, 0.72, endAt(0, 0.72, -1) - 0.01));
    P.into(group);
    group.userData = { body, parts: P.count, animate: () => {} };
    return group;
  },

  // A split-screen camper bus (a 1960s VW Type 2, more or less), kept bold and simple (the owner, 13-Oct: "too
  // detailed"): a rounded box, two-tone, the body colour below and white above (a dark grey on an Evil one:
  // userData.livery), the white dipping in a big V down the flat nose; a big split windscreen, a row of big side
  // windows, two round headlamps, a big spare wheel carried high in the middle of the nose, plain chrome bumpers,
  // a tail lamp each side, plain wheels on silver hubs. It sways gently as it goes
  lovebus: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const w = car.hw * 2, L = car.hl, R = 0.4, half = w / 2;
    const frontZ = L * 0.64, rearZ = -L * 0.64;
    const paint = lambert(car.color), upper = lambert(0xf6f3ea), P = parts();
    // the body: the lower half in the paint, the upper in white, meeting edge to edge at the join (each rounded off
    // the same, so neither shows through the other); the nose flat and upright below, the windscreen leaning back
    const sill = 0.36, join = 1.2, round = 0.08, roof = 1.98, nz = L - 0.07, face = nz + round; // (face: the nose's front)
    const lowerPts = [[-nz, sill, 0.1], ...arch(rearZ, R + 0.02, 0.5, sill), ...arch(frontZ, R + 0.02, 0.5, sill), [nz - 0.02, sill, 0.1], [nz, join], [-nz, join]];
    const body = new THREE.Mesh(extrude(outline(lowerPts), half, round), paint);
    shell.add(body);
    const A = [nz, join], B = [nz - 0.14, roof, 0.3], C = [-nz + 0.08, roof, 0.3], D = [-nz, join];
    P.add(upper, extrude(outline([A, B, C, D]), half, round));
    for (const z of [rearZ, frontZ]) P.add(WELL, bx(w - 0.66, 0.5, 0.9, 0, 0.62, z));      // dark wheel wells
    const flat = () => half;                                                               // (the flanks are upright)
    // the big split windscreen, the rear window, and the side windows: the cab door's and three along the flank
    const lo = 1.32, hi = 1.78;
    for (const sx of [-1, 1]) {
      P.add(GLASS, edgePanel(A, B, round + 0.006, 0.15, 0.66, sx * 0.07, sx * 0.86));
      P.add(GLASS, flankPane([[nz - 0.2, lo], [nz - 0.28, hi], [L * 0.64, hi], [L * 0.64, lo]], sx, flat));
      for (let i = 0; i < 3; i++) {
        const z0 = L * 0.56 - i * L * 0.42, z1 = z0 - L * 0.36;
        P.add(GLASS, flankPane([[z0, lo], [z0, hi], [z1, hi], [z1, lo]], sx, flat));
      }
      // a round headlamp in a chrome ring each side of the nose; a tail lamp each side at the back (its top the brake lamp)
      P.add(CHROME, dsc(0.18, 0.05, sx * 0.7, 0.95, face + 0.012, 14));
      P.add(LAMP, dsc(0.145, 0.05, sx * 0.7, 0.95, face + 0.028, 14));
      P.add(TAIL, bx(0.16, 0.2, 0.03, sx * 0.74, 0.92, -face - 0.01));
      P.add(STOP, bx(0.16, 0.1, 0.03, sx * 0.74, 1.07, -face - 0.01));
      // plain wheels on silver hubs (the owner, 13-Oct: no detailed wheels)
      for (const z of [frontZ, rearZ]) wheel(group, R, 0.3, sx * (half - 0.04), R, z, STEEL);
    }
    // the big V on the nose, in the white
    const v = new THREE.Shape([[-0.95, join], [0, 0.55], [0.95, join], [0.5, join], [0, 0.86], [-0.5, join]].map(([x, y]) => new THREE.Vector2(x, y)));
    P.add(upper, new THREE.ExtrudeGeometry(v, { depth: 0.012, bevelEnabled: false }).translate(0, 0, face - 0.004));
    // the spare wheel, as big as the road wheels' nearly, carried high in the middle of the nose, its back against it
    const spareY = 0.92;
    P.add(TYRE, dsc(0.34, 0.2, 0, spareY, face + 0.1, 16));
    P.add(STEEL, dsc(0.19, 0.22, 0, spareY, face + 0.1, 12));
    // the rear window
    P.add(GLASS, edgePanel(D, [C[0] - 0.05, roof - 0.25], round + 0.006, 0.28, 0.82, 0.55, -0.55));
    // plain chrome bumpers
    for (const e of [1, -1]) P.add(CHROME, bx(w + 0.04, 0.14, 0.12, 0, 0.42, e * (L + 0.02)));
    P.into(shell);
    const livery = (evil) => upper.color.setHex(evil ? 0x505056 : 0xf6f3ea);
    livery(false);
    group.userData = {
      body,
      parts: P.count,
      livery,
      animate: (t) => { // a slow, easy sway
        shell.rotation.z = Math.sin(t * 2.2) * 0.025;
        shell.position.y = Math.sin(t * 4.4) * 0.015;
      },
    };
    return group;
  },
};
