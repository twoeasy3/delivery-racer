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
// The starter car, redrawn from the owner's photographs of a 2000s Nissan Micra (K12) and the old card picture: a
// bubble. One round body, tall and short: a steep stubby bonnet dropping to a blunt round nose, a big raked windscreen
// into a DOMED roof (its crown over the front seats) that falls away to an upright hatch; a low waist that rises toward
// the back under deep windows; flush rectangular headlamps in dark bezels on the nose's face either side of the grille
// (the owner's pick of three drafts, 15-Oct); a small two-slot grille; body-colour bumpers (as the photographs) over a chunky
// black skirt ring that runs right round the car's foot, 3 cm proud, with the mouth and two round fog lamps in its
// front face; tall oval tail lamps in silver rings up the rear corners, a clear lens low in each; round mirrors in the
// paint; plain silver hub caps on small fat tyres that overlap the body's lower corners (no wheel arches: the owner,
// 15-Oct, "the tyres clipping through a rigid body is good enough"). The paint shades a little deeper and redder low
// down (vertex colours). Each tail lamp is a silver RING standing out of the body with a domed lens on top, so its
// outline is the ring's own smooth rim and never a jagged cut into the body's facets; the headlamps sit on the nose's
// flat face for the same reason; every pane of glass stands clear of the body's bevels (its own crisp edge).
ORIG1B_MODELS.commuter = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.3; // (as before: radius 0.3, the axles at ±0.62 of the half length)
  const k = 'commuterA' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const AX = 0.62 * L, BEV = 0.14, BW = 2 * W; // (the body's flanks at the hitbox; the tyres stand proud of its rounded foot)
  const NOSE = L - BEV - 0.02, TAILZ = -L + BEV + 0.04, FLOOR = 0.22;
  // the body, side on: a straight lower line (the bumpers are the body's own ends), the front bumper's face rounding
  // up and over into the steep short bonnet, the waist rising to the back, the tail upright with a soft shoulder
  // (the outline grows by BEV all round: the waist's surface is BEV above these points)
  const WSF = [0.98, 0.76], WAIST_R = [TAILZ + 0.12, 0.86];      // (the windscreen's foot; the waist at the back)
  const bodyOutline = [
    [NOSE - 0.02, FLOOR], [NOSE + 0.02, 0.34], ...curve([NOSE + 0.02, 0.34], [NOSE + 0.04, 0.48], [NOSE - 0.02, 0.58], [NOSE - 0.16, 0.63], 4),
    ...curve([NOSE - 0.16, 0.63], [1.5, 0.66], [1.25, 0.72], WSF, 5),
    WAIST_R, ...curve(WAIST_R, [TAILZ - 0.02, 0.84], [TAILZ - 0.04, 0.66], [TAILZ - 0.03, 0.46], 3),
    [TAILZ + 0.01, 0.3], [TAILZ + 0.04, FLOOR],
  ];
  // the glasshouse, side on: a big raked windscreen, a domed roof crowned over the front seats, an upright hatch
  const CBEV = 0.11, CW = BW - 0.06, TOP = car.height - CBEV, CY = WSF[1] - 0.1;
  const TAPER = [CY - CBEV, TOP, 0.2];
  const WS = [[WSF[0] + 0.1, CY], [0.22, TOP - 0.03]];          // the windscreen, foot to top (its foot in the body)
  const HATCH = [[-1.42, TOP - 0.12], [TAILZ + 0.02, 0.8]];      // the hatch's glass, top to foot (its foot in the body)
  const roof = [WS[1], ...curve(WS[1], [-0.1, TOP + 0.07], [-0.9, TOP + 0.04], HATCH[0], 8)];
  const cabinOutline = [WS[0], ...roof, HATCH[1]];
  const mirrorX = narrowAt(CW / 2, 0.9, TAPER) + 0.07;
  const body = place(group, shared(k + 'body', () => shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 3, 0.24),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 3, 0.16),
    ...[-1, 1].map(s => blob(0.1, 0.07, 0.06, s * mirrorX, 0.9, 0.78, 0, s * 0.3, [8, 5])),   // the mirrors
  ]), 0.2, 0.7, [0.84, 0.64, 0.6])), paint);
  // the glass: the windscreen, the hatch's window, three windows a side (front door, rear door, the quarter), their
  // sills just above the body's rounded shoulder on the rising waist and their tops under the roof's dome
  const LIFT = CBEV + 0.006, CH = CW / 2;
  const foot = (z) => heightAt([WSF, WAIST_R], z) + BEV + 0.03;
  const top = (z) => heightAt(roof, z) - 0.06; // (well under the roof's shoulder: seen from above, its edge never overlaps the glass)
  const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
  const aEdge = (y) => zAt(WS, y) - 0.1, cEdge = (y) => zAt(HATCH, y) + 0.1;
  // (a side window: its sill on the waist, its top under the roof at an even distance, its front and back edges along
  // the pillars; the top sampled only between the pillars' tops, so it never runs off the roof's curve)
  const window = (z0, z1, front = null, back = null) => {
    const f0 = foot(z0), f1 = foot(z1);
    const zTF = front ? front(top(z0)) : z0, zTB = back ? back(top(z1)) : z1;
    return [[front ? front(f0) : z0, f0], [back ? back(f1) : z1, f1], [zTB, top(zTB) - (back ? 0.02 : 0)],
      ...[0.2, 0.4, 0.6, 0.8].map(s => zTB + (zTF - zTB) * s).map(z => [z, top(z)]), [zTF, top(zTF)]]; // (in order round it, back to front: a fan of a zigzag is ragged)
  };
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass([zAt(WS, foot(WSF[0])), foot(WSF[0])], WS[1], CH, TAPER, CBEV + 0.07, [0.02, 0.09], LIFT),
    slopeGlass([zAt(HATCH, 1.03), 1.03], HATCH[0], CH, TAPER, CBEV + 0.09, [0.02, 0.1], LIFT),
    ...sideGlass([
      window(aEdge(foot(0.9)), -0.14, aEdge),
      window(-0.24, -0.96),
      window(-1.06, cEdge(foot(-1.3)), null, cEdge),
    ], CH, TAPER, 0.016),
  ]);
  // the lamps: each a silver BEZEL, a short elliptical ring standing out of the body along its surface's normal, with a
  // domed lens on top. The headlamps bug-eye almonds on the nose's corners, long axis from low at the front up and back
  // along the wing; the tail lamps tall ovals up the rear corners, a clear lens low in each
  const ring = (rx, ry, depth, out, x, y, z, pitch, yaw, seg = 20) => {
    const geo = new THREE.CylinderGeometry(1, 1, depth, seg, 1, false).scale(rx, 1, ry).rotateX(Math.PI / 2).translate(0, 0, out - depth / 2);
    if (pitch) geo.rotateX(pitch);
    if (yaw) geo.rotateY(yaw);
    return geo.translate(x, y, z);
  };
  const dome = (rx, ry, h, out, x, y, z, pitch, yaw) => {
    const geo = new THREE.SphereGeometry(1, 20, 3, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(rx, ry, h).translate(0, 0, out);
    if (pitch) geo.rotateX(pitch);
    if (yaw) geo.rotateY(yaw);
    return geo.translate(x, y, z);
  };
  // the headlamps (the owner, 15-Oct, picked from three drafts): flush RECTANGULAR lamps on the nose's near-vertical
  // face either side of the grille, each a flat cream lens standing a hair proud of a dark bezel block set into the
  // nose (the face is flat under them, so nothing of the body cuts through, and from the side they are a thin edge).
  // The tail lamps tall ovals in silver rings up the rear corners, a clear lens low in each
  const NF = NOSE + 0.18, NP = -0.25; // (the nose face under the lamps, and its lean back)
  const rbox = (w, h, d, out, x, y, z, pitch) => new THREE.BoxGeometry(w, h, d).translate(0, 0, out - d / 2).rotateX(pitch).translate(x, y, z);
  const TL = [0.58, 0.66, TAILZ - BEV + 0.03]; // (the tail lamp's place, on the tail's flat panel; its ring's axis straight back)
  parts(group, k + 'bezel', SILVER, () => [-1, 1].map(s => ring(0.1, 0.18, 0.16, 0.035, s * TL[0], TL[1], TL[2], Math.PI, 0)));
  parts(group, k + 'lamp', LAMP, () => [
    ...[-1, 1].map(s => rbox(0.27, 0.1, 0.02, 0.03, s * 0.44, 0.49, NF, NP)),                 // the headlamp lenses
    ...[-1, 1].map(s => dsc(0.03, 0.02, s * TL[0], TL[1] - 0.075, TL[2] - 0.063, 12)),        // the clear lenses
  ]);
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => dome(0.085, 0.16, 0.035, 0.035, s * TL[0], TL[1], TL[2], Math.PI, 0)));
  // black: the skirt ring round the car's foot (3 cm proud of the flanks and both bumpers), the mouth and the two
  // grille slots on the nose, the hatch's handle strip
  const FZ = NOSE + 0.19, RZ = TAILZ - 0.19; // (the skirt's front and rear faces)
  parts(group, k + 'black', TRIM, () => [
    // (the skirt band: its corners rounded in plan as the body's are, its top and bottom edges rounded over)
    extrudeSide([[FZ - 0.05, 0.17], [FZ - 0.05, 0.29], [RZ + 0.05, 0.29], [RZ + 0.05, 0.17]], BW + 0.06, 0.05, null, 2, 0.2),
    ...[-1, 1].map(s => rbox(0.3, 0.13, 0.14, 0.015, s * 0.44, 0.49, NF, NP)),                  // the headlamp bezels
    bx(0.5, 0.07, 0.06, 0, 0.38, FZ - 0.01),                                                   // the mouth
    ...[-1, 1].map(s => blob(0.1, 0.03, 0.03, s * 0.15, 0.55, NOSE + 0.14, 0.45, 0, [8, 4])),     // the grille slots
    bx(0.4, 0.03, 0.03, 0, 0.9, TAILZ - BEV + 0.01),                                           // the hatch's handle strip
  ]);
  parts(group, k + 'fog', LAMP, () => [-1, 1].map(s => dsc(0.045, 0.03, s * 0.56, 0.23, FZ + 0.005, 10)));
  // the wheels: small fat tyres, plain silver hub caps, their outer faces just proud of the skirt
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, 0.26, side * (W - 0.06), z, 0.19, SILVER);
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
    ...ribbon(front, BEV + 0.0045, X0, X1),                                           // (4.5 mm off the paint)
    ...ribbon(roof, CBEV + 0.0045, X0, X1),
    ...ribbon([...deck, ...tail], BEV + 0.0045, X0, X1),
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
