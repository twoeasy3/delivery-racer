// ---- two of the original roster's models, rebuilt: the Commuter and the Sportscar --------------------------------------
// (cars.js `commuter` and `miata`; both are traffic kinds too, config.js CONFIG.vehicles, the Commuter the commonest and
// the gimmicks' stand-in car, the Sportscar the rival couriers', so each is built for many cars at once: every geometry
// is made once per size and shared, and every material that is not the paint or a livery colour is shared too.)
// render/models.js hands its MODELS.commuter and .miata to these builders. Each takes the car's entry
// ({ hw, hl, height, color, ... }) and returns a group, front facing local +z, with
//   userData.body     the mesh in the paint (the whole body, one mesh), so the livery can be swapped
//   userData.animate  (seconds) => void
//   (the Sportscar also: userData.livery(evil), its stripes' colour, and userData.stripe(hex), a rival courier's own)
// The wheels stand where the old models had them (the same radius, axles and track), each tyre a mesh of its own with its
// hub inside it, so the showroom's suspension finds and plants them (render/carsuspension.js).
// How they are built (as render/modelsOrig4.js): the body is an extrusion of its side view, its edges rounded off by a
// big bevel (rounder across the car than round the side view); the Commuter's with a straight lower line and no wheel
// arches (the fat tyres simply overlap its lower corners), the Sportscar's with plain arches cut in; the glasshouse
// another, narrowed toward its roof (tumblehome); the glass thin flat panels laid a few mm proud of it; the small parts
// squashed spheres, discs and short extrusions merged into one mesh per material. No panel lines. State-free.
import * as THREE from 'three';
import { shapesLive } from './shapeedits.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- shared materials (made once: clearGroup keeps them) ------------------------------------------------------------
const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x171717)), SILVER = keep(lambert(0xc4c8ce)), TRIM = keep(lambert(0x232529));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xc0141c));

// ---- shared geometry ---------------------------------------------------------------------------------------------
const SHARED = new Map();
const shared = (key, make) => {
  if (shapesLive()) return make(); // (a model built with shape edits, or recorded by the model editor, caches nothing: render/shapeedits.js)
  if (!SHARED.has(key)) { const geo = make(); geo.userData.shared = true; SHARED.set(key, geo); }
  return SHARED.get(key);
};
const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
// (every geometry merged is made non-indexed, with normals and uvs, so that boxes, discs and extrusions merge together)
const plain = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
};
const merge = (geos) => mergeGeometries(geos.map(plain), false);
// one mesh of many parts, its geometry made once per `key`
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);

// ---- parts, made in place ---------------------------------------------------------------------------------------------
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel)
const dsc = (r, depth, x, y, z, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).translate(x, y, z);
// a squashed sphere (half sizes sx, sy, sz), turned (pitch about x, then yaw about y) and placed: an almond lamp, a mirror
const blob = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, seg = [10, 6]) => {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a teardrop (an almond with one round end): a squashed sphere, its front (+z) half drawn to a point, turned and placed
const tear = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0) => {
  const geo = new THREE.SphereGeometry(1, 10, 6), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = 1 - 0.65 * Math.max(0, pos.getZ(i));
    pos.setXYZ(i, pos.getX(i) * t * sx, pos.getY(i) * t * sy, pos.getZ(i) * sz);
  }
  geo.computeVertexNormals();
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a flat panel through the points (a convex polygon, in order: [x, y, z]), fanned from its first point
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
// the same panel on both sides of the car (pts given for the +x side, in either order: each faces outward)
const pair = (pts) => {
  const [a, b, c] = pts, ux = [b[1] - a[1], b[2] - a[2]], vx = [c[1] - a[1], c[2] - a[2]];
  const out = ux[0] * vx[1] - ux[1] * vx[0] > 0 ? pts : pts.slice().reverse();
  return [panel(out), panel(out.map(([x, y, z]) => [-x, y, z]).reverse())];
};

// ---- the body: an extrusion of a side view --------------------------------------------------------------------------
// A side view is a list of [z, y] points (in order round it). `curve` samples a cubic Bezier into points (its first
// point left out: it is the one before it).
const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true); // (a wheel arch, from its rear foot over to its front)
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
// extruded `w` wide across the car, its edges rounded by `bevel` (the outline grows by that much all round, and the
// sides stand at ±w/2); `taper`: [y0, y1, k] narrows it above y0, by k of its width at y1 (the tumblehome)
// (`across`: the bevel's depth across the car, when it is rounder that way than round the side view)
const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
  });
  geo.rotateY(-Math.PI / 2); // (the outline's x along the car; extruded across it)
  geo.translate(w / 2 - across, 0, 0);
  if (taper) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, narrowAt(pos.getX(i), pos.getY(i), taper));
    geo.computeVertexNormals();
  }
  return geo;
};
const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);
// a side view's height along a chain of its points (the roofline), at z
const heightAt = (chain, z) => {
  for (let i = 0; i + 1 < chain.length; i++) {
    const [z0, y0] = chain[i], [z1, y1] = chain[i + 1];
    if ((z - z0) * (z - z1) <= 0 && z0 !== z1) return y0 + (y1 - y0) * (z - z0) / (z1 - z0);
  }
  return chain[0][1];
};
// a glass panel on a sloping face (the windscreen, the back window): the face's edge (side view) from [z0, y0] to
// [z1, y1], `half` the body's half width (before narrowing), inset `side` from its sides and `ends` (shares) from its
// ends, laid `lift` m out from the face (beyond the bevel)
const slopeGlass = ([z0, y0], [z1, y1], half, taper, inset, ends, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (t, sx) => {
    const z = z0 + dz * t + nz * lift, y = y0 + dy * t + ny * lift;
    return [sx * (narrowAt(half, y, taper) - inset), y, z];
  };
  const [a, b] = ends;
  return panel([at(a, -1), at(a, 1), at(1 - b, 1), at(1 - b, -1)]);
};
// the side windows: each a polygon of [z, y] in the side view, laid on the body's (narrowed) flank, `lift` out
const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [narrowAt(half, y, taper) + lift, y, z])));

// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, hubR, hubMat) => {
  const tyre = place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, 14).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(hubR, hubR, width + 0.016, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
  return tyre;
};

// shade a geometry darker and redder toward its foot (a vertex colour, times the paint's: any paint is shaded alike),
// from `low` at y0 up to white at y1
const shadeLow = (geo, y0, y1, low) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * t;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};

export const ORIG1B_MODELS = {};

// ---- the Commuter -----------------------------------------------------------------------------------------------------
// The starter car: a bubbly little five-door city hatchback (a Nissan Micra of the 2000s). Tall and short, one round
// body: a short blunt nose and a high, bulbous bonnet sweeping up into a big raked windscreen, a tall glasshouse under a
// roof that curves down to an upright hatch; fat wheel arches over small wheels with plain silver hub caps; big almond
// headlamps up on the front wings' corners, a small oval grille between them, tall tail lamps up the rear corners;
// black bumpers and sills under it all (a wide dark mouth with two round fog lamps); round mirrors in the paint. The
// paint shades to a deeper red-orange low down (vertex colours).
ORIG1B_MODELS.commuter = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.3; // (as before: radius 0.3, the axles at ±0.31 of the length)
  const k = 'commuter' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 0.62 * L, BEV = 0.12, BW = 2 * W; // (the body a little narrower than the track: the tyres stand proud)
  const NOSE = L - BEV - 0.05, TAILZ = -L + BEV + 0.12, BELT = 0.72, SILL = 0.36;
  // the body, side on: one plain shape with a straight lower line (no wheel arches: the wheels overlap its corners);
  // the nose's blunt face rounding over into a short, high bonnet, the waist rising to the back, a short round tail
  const WSF = [1.2, BELT + 0.02], BR = BELT + 0.08;              // (the windscreen's foot; the waist at the back)
  const bodyOutline = [
    [NOSE - 0.05, SILL], ...curve([NOSE - 0.05, SILL], [NOSE + 0.03, 0.56], [NOSE - 0.06, BELT - 0.02], WSF, 7),
    [TAILZ + 0.14, BR], ...curve([TAILZ + 0.14, BR], [TAILZ + 0.01, BR - 0.02], [TAILZ - 0.01, BR - 0.12], [TAILZ, 0.6], 3),
    ...curve([TAILZ, 0.6], [TAILZ, 0.46], [TAILZ + 0.01, SILL + 0.02], [TAILZ + 0.08, SILL], 2),
  ];
  // the glasshouse, side on: a big raked windscreen, a tall arched roof, an upright hatch
  const CBEV = 0.1, CW = BW - 0.08, TOP = car.height - CBEV, CY = BELT - 0.2;
  const TAPER = [CY - CBEV, TOP, 0.18];
  const WS = [[WSF[0] + 0.12, CY], [0.18, TOP - 0.06]];         // the windscreen, foot to top (its foot in the body)
  const HATCH = [[-1.42, TOP - 0.1], [TAILZ + 0.02, CY]];        // the hatch's glass, top to foot
  const roof = [WS[1], ...curve(WS[1], [-0.15, TOP + 0.06], [-1.05, TOP + 0.05], HATCH[0], 8)];
  const cabinOutline = [WS[0], ...roof, HATCH[1]];
  const mirrorX = narrowAt(CW / 2, 0.9, TAPER) + 0.06;
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 3, 0.2),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 3, 0.14),
    ...[-1, 1].map(s => blob(0.1, 0.065, 0.06, s * mirrorX, 0.9, 0.8, 0, s * 0.3, [8, 5])),   // the mirrors
  ]), 0.2, 0.75, [0.82, 0.6, 0.58])), paint);
  // the glass: the windscreen, the hatch's window, three windows a side (front door, rear door, the quarter)
  const LIFT = CBEV + 0.006, CH = CW / 2;
  const foot = (z) => heightAt([WSF, [TAILZ + 0.14, BR]], z) + 0.06;  // (the windows' sills, on the waist)
  const top = (z) => heightAt(roof, z) - 0.04;
  const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
  const aEdge = (y) => zAt(WS, y) - 0.1, cEdge = (y) => zAt(HATCH, y) + 0.1;
  const window = (z0, z1, front = null, back = null) => {
    const f0 = foot(z0), f1 = foot(z1), t0 = top(z0), t1 = top(z1);
    return [[front ? front(f0) : z0, f0], [back ? back(f1) : z1, f1], [back ? back(t1 - 0.02) : z1, back ? t1 - 0.02 : t1],
      ...[0.66, 0.33].map(t => z1 + (z0 - z1) * t).map(z => [z, top(z)]).filter(([z]) => !front || z < front(t0)),
      [front ? front(top(front(t0))) : z0, front ? top(front(t0)) : t0]];
  };
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass([zAt(WS, foot(WSF[0]) - 0.04), foot(WSF[0]) - 0.04], WS[1], CH, TAPER, CBEV + 0.03, [0.02, 0.04], LIFT),
    slopeGlass([zAt(HATCH, BR + 0.06), BR + 0.06], HATCH[0], CH, TAPER, CBEV + 0.06, [0.02, 0.06], LIFT),
    ...sideGlass([
      window(aEdge(foot(1.0)), -0.16, aEdge),
      window(-0.26, -0.98),
      window(-1.08, cEdge(foot(-1.3)), null, cEdge),
    ], CH, TAPER, 0.006),
  ]);
  // the lamps: big teardrops on the nose's corners, sweeping back and up into the wings; tall tail lamps up the rear
  // corners
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => tear(0.16, 0.11, 0.3, s * 0.56, 0.63, NOSE - 0.02, 0.55, -s * 0.75)));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => blob(0.08, 0.16, 0.06, s * 0.64, 0.66, TAILZ - BEV + 0.03)));
  // black: the bumpers (level with the sill, round the corners), the skirt under the body, the mouth under the nose,
  // the little oval grille over it
  const FZ = NOSE + 0.09; // (the front bumper's face)
  parts(group, k + 'black', TRIM, () => [
    extrudeSide([[AX - 0.1, 0.16], [NOSE - 0.02, 0.16], [NOSE + 0.04, 0.24], [NOSE + 0.04, 0.42], [AX - 0.1, 0.42]], BW + 0.02, 0.05, null, 2, 0.18),
    extrudeSide([[-AX + 0.1, 0.16], [TAILZ + 0.02, 0.16], [TAILZ - 0.04, 0.24], [TAILZ - 0.04, 0.44], [-AX + 0.1, 0.44]], BW + 0.02, 0.05, null, 2, 0.18),
    bx(BW - 0.06, 0.12, 2 * AX, 0, 0.27, 0),
    blob(0.34, 0.08, 0.05, 0, 0.33, FZ - 0.02, 0, 0, [12, 6]),
    blob(0.16, 0.045, 0.04, 0, 0.58, NOSE + 0.1, 0.4, 0, [10, 5]),
  ]);
  parts(group, k + 'fog', LAMP, () => [-1, 1].map(s => dsc(0.045, 0.03, s * 0.55, 0.32, FZ + 0.005, 10)));
  // the wheels: small fat tyres, plain silver hub caps
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, 0.26, side * (W - 0.04), z, 0.19, SILVER);
  group.userData = { body, animate: () => {} };
  return group;
};

// a ribbon laid along a chain of a side view's top points ([z, y], from front to back), lifted `d` out from them (the
// bevel and a few mm, mitred at each point), from x0 to x1 either side of the centre line: a racing stripe
const ribbon = (chain, d, x0, x1) => {
  const n = (a, b) => { const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy); return [dy / len, -dz / len]; };
  const out = chain.map((p, i) => {
    const na = i > 0 ? n(chain[i - 1], p) : null, nb = i + 1 < chain.length ? n(p, chain[i + 1]) : null;
    const [mz, my] = na && nb ? [na[0] + nb[0], na[1] + nb[1]] : na || nb, len = Math.hypot(mz, my), m = [mz / len, my / len];
    const s = d / Math.max(0.5, m[0] * (na || nb)[0] + m[1] * (na || nb)[1]);
    return [p[0] + m[0] * s, p[1] + m[1] * s];
  });
  const g = [];
  for (let i = 0; i + 1 < out.length; i++) {
    const [a, b] = [out[i], out[i + 1]];
    for (const side of [-1, 1]) {
      const quad = [[side * x0, a[1], a[0]], [side * x1, a[1], a[0]], [side * x1, b[1], b[0]], [side * x0, b[1], b[0]]];
      g.push(panel(side > 0 ? quad : quad.reverse()));
    }
  }
  return g;
};

// ---- the Sportscar ----------------------------------------------------------------------------------------------------
// (render/modelsOrig4.js's Sportscar, improved: rounder and simpler.) A small, low, rounded two-seat sports coupe: a
// round nose over a front lip spoiler, a long rounded bonnet with a raised scoop, fat haunches over the rear wheels, a
// short round cabin with a raked windscreen and a fastback down to a ducktail; twin racing stripes from the lip over the
// nose, the scoop, the roof, the deck and down the tail (white on red for Good, black on yellow for Evil;
// userData.stripe for a rival courier's own colour); slim teardrop lamps at the nose's corners, a dark oval intake,
// round mirrors in the paint; fat tyres on plain silver hubs; a tail lamp across each of the tail's corners.
ORIG1B_MODELS.miata = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.32; // (as before: radius 0.32, the axles at +0.32 and -0.31 of the length)
  const k = 'miata' + [W, L].join(',');
  const paint = lambert(car.color), stripe = new THREE.MeshLambertMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide });
  const AF = 0.64 * L, AR = -0.62 * L; // (the axles: 1.248 and -1.209 for the car)
  const BEV = 0.08, BW = W * 2 + 0.1; // (the flanks at ±0.9: the fat tyres just proud of them)
  const ARCH = R + 0.04 + BEV, AY = R - 0.02; // (the arches' tops under the bonnet's and the deck's outline)
  const NOSE = L - BEV, TAILZ = -L + BEV;
  // the nose, up its round face and back over the bonnet to the windscreen's foot (the stripes follow it)
  const WSF = [0.6, 0.78];
  const front = [[NOSE - 0.02, 0.34], ...curve([NOSE - 0.02, 0.34], [NOSE + 0.03, 0.52], [NOSE - 0.06, 0.66], [NOSE - 0.32, 0.72], 4),
    ...curve([NOSE - 0.32, 0.72], [1.2, 0.78], [0.9, 0.79], WSF, 3)];
  const deck = [[-1.15, 0.78], ...curve([-1.15, 0.78], [-1.5, 0.79], [TAILZ + 0.12, 0.8], [TAILZ + 0.01, 0.83], 2)]; // (to the ducktail's lip)
  const tail = curve([TAILZ + 0.01, 0.83], [TAILZ - 0.02, 0.62], [TAILZ, 0.42], [TAILZ + 0.03, 0.34], 3);
  const bodyOutline = [
    [NOSE - 0.08, AY], ...front, ...deck, ...tail, [TAILZ + 0.06, AY], // (one straight lower line, at the arches' feet)
    ['arc', AR, AY, ARCH], ['arc', AF, AY, ARCH],
  ];
  // the haunches: a crown over each rear wheel (their outer sides just inside the flanks, their feet in the body and
  // their arches a hair wider than the body's: only the crown shows)
  const HW = 0.42, hx = BW / 2 - HW / 2 - 0.012; // (their outer sides just inside the flanks)
  const rearHaunch = [[0.0, 0.3], [0.0, 0.62], ...curve([0.0, 0.62], [-0.5, 0.86], [-1.6, 0.88], [TAILZ + 0.05, 0.74], 4), [TAILZ + 0.05, 0.3],
    ['arc', AR, AY, ARCH + 0.015]];
  // the cabin: the windscreen's foot to a short round roof, the fastback down to the deck
  const CBEV = 0.08, CW = BW - 0.34, TOP = car.height - CBEV + 0.02, CY = 0.62;
  const TAPER = [CY - CBEV, TOP, 0.2];
  const WS = [[WSF[0] + 0.1, CY], [-0.04, TOP - 0.03]], BL = [[-0.58, TOP - 0.03], [-1.25, CY]];
  const roof = [WS[1], ...curve(WS[1], [-0.22, TOP + 0.03], [-0.44, TOP + 0.03], BL[0], 4)];
  const cabinOutline = [WS[0], ...roof, BL[1]];
  // the bonnet's scoop (its outline, side on: a blunt front, then down onto the bonnet)
  const scoop = [[1.18, 0.7], [1.18, 0.9], [1.1, 0.93], [0.86, 0.93], [0.7, 0.84], [0.7, 0.7]];
  const mirrorX = narrowAt(CW / 2, 0.86, TAPER) + 0.05;
  const body = place(group, shared(k + 'body', () => merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.18),
    ...[-1, 1].map(sd => extrudeSide(rearHaunch, HW, 0.1, null, 2).translate(sd * hx, 0, 0)),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.14),
    extrudeSide(scoop, 0.3, 0.035, null, 2),
    extrudeSide([[NOSE - 0.25, 0.12], [NOSE + 0.1, 0.12], [NOSE + 0.12, 0.15], [NOSE + 0.02, 0.22], [NOSE - 0.25, 0.22]], BW - 0.14, 0.02, null, 1, 0.05), // the front lip
    ...[-1, 1].map(sd => blob(0.08, 0.06, 0.08, sd * mirrorX, 0.87, 0.36, 0, 0, [8, 5])),             // the mirrors
  ])), paint);
  // the stripes: two, from the lip up the nose, over the bonnet and the scoop, the roof, the deck and down the tail
  const X0 = 0.17, X1 = 0.4; // (either side of the scoop)
  place(group, shared(k + 'stripes', () => merge([
    ...ribbon(front, BEV + 0.004, X0, X1),
    ...ribbon(roof, CBEV + 0.004, X0, X1),
    ...ribbon([...deck, ...tail], BEV + 0.004, X0, X1),
    ...ribbon([[NOSE + 0.12, 0.15], [NOSE + 0.02, 0.22], [NOSE - 0.25, 0.22]], 0.024, X0, X1),
  ])), stripe);
  // the glass: windscreen, the fastback's window, and one long window a side
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = 0.86, top = (z) => heightAt(roof, z) - 0.03;
  const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass([zAt(WS, 0.84), 0.84], WS[1], CH, TAPER, CBEV + 0.03, [0.02, 0.05], LIFT),
    slopeGlass([zAt(BL, 0.88), 0.88], BL[0], CH, TAPER, CBEV + 0.05, [0.02, 0.06], LIFT),
    ...sideGlass([[[zAt(WS, foot) - 0.1, foot], [zAt(BL, foot) + 0.14, foot], [zAt(BL, top(-0.62)) + 0.1, top(-0.62)],
      [-0.35, top(-0.35)], [zAt(WS, top(-0.12)) - 0.08, top(-0.12)]]], CH, TAPER, 0.006),
  ]);
  // the dark parts: the intake, the scoop's mouth, a diffuser under the tail
  parts(group, k + 'dark', TRIM, () => [
    blob(0.36, 0.06, 0.05, 0, 0.32, NOSE + 0.07, 0, 0, [12, 6]),
    bx(0.24, 0.12, 0.03, 0, 0.82, 1.21), // (the scoop's mouth, just proud of its face)
    bx(BW - 0.4, 0.08, 0.08, 0, 0.26, TAILZ - 0.06),
  ]);
  // the lamps: slim teardrops at the nose's corners, sweeping back into the wings; a tail lamp across each corner
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(sd => tear(0.09, 0.06, 0.24, sd * 0.62, 0.6, NOSE - 0.02, 0.5, -sd * 1.0)));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(sd => blob(0.2, 0.06, 0.05, sd * 0.58, 0.62, TAILZ - BEV + 0.02, 0, 0, [10, 5])));
  // the wheels: fat tyres on plain silver hubs
  for (const side of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, 0.3, side * (W - 0.04), z, R * 0.55, SILVER);
  const colour = (hex) => stripe.color.setHex(hex);
  group.userData = {
    body,
    animate: () => {},
    livery: (evil) => colour(evil ? 0x151515 : 0xf4f4f4),
    stripe: colour, // (a scheme of its own: see Traffic, a rival courier)
  };
  return group;
};
