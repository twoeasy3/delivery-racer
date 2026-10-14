// ---- the idea cars' batch D4: the Autobahn Estate and the Fin Land Yacht (CHECKLIST item 3xx, to be renumbered) --------
// Entries: src/delivery/ideasBatchD4.js. render/ideaModels.js spreads IDEA_MODELS_BATCH_D4 into IDEA_MODELS; lamps:
// render/carlights-batchD4.js. Built as the Junker, Commuter and the top-up cars are (render/ideaModelsTopupA.js, whose
// helpers are copied below so the files do not import each other): bodies are extrusions of a side view with rounded
// edges, glass as thin flat panels laid a few mm proud, small parts merged into one mesh per material, plain chunky wheels
// (a fat tyre and a plain hub, meshes of their own), no panel lines, vertex-colour shading low down. No textures (14-Oct, the owner: not everything needs one).
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint mesh),
// userData.animate (sits still) and, for the Yacht, userData.livery (evil) (its roof). No people. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x161616)), SILVER = keep(lambert(0xc4c8ce)), CHROME = keep(lambert(0xd6d9dd)), TRIM = keep(lambert(0x232529));
const ALLOY = keep(lambert(0xa9adb2)), PLATE = keep(lambert(0xece6cc));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xff2a2a)), AMBER = keep(basic(0xffa31a));

// ---- geometry helpers -----------------------------------------------------------------------------------------------
const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const plain = (geo) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  return g;
};
const merge = (geos) => mergeGeometries(geos.map(plain), false);
// parts collected by material, then one mesh for each (`bag.add(material, ...geometries)`, `bag.done(group)`)
const makeBag = () => {
  const bags = new Map();
  return {
    add: (material, ...geos) => { if (!bags.has(material)) bags.set(material, []); bags.get(material).push(...geos); },
    done: (parent, after = {}) => {
      const out = new Map();
      for (const [material, geos] of bags) {
        const geo = merge(geos);
        after[material.uuid]?.(geo);
        out.set(material, place(parent, geo, material));
      }
      return out;
    },
  };
};
const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel), or a round bar along `axis`
const dsc = (r, depth, x, y, z, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).translate(x, y, z);
const rod = (r, length, x, y, z, axis = 'z', seg = 10) => {
  const geo = new THREE.CylinderGeometry(r, r, length, seg);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return geo.translate(x, y, z);
};
// a round bar from a to b ([x, y, z] each)
const strut = (a, b, r, seg = 6) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return geo.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};
// a squashed sphere, turned (roll about z, pitch about x, yaw about y) and placed
const blob = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, roll = 0, seg = [10, 6]) => {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a flat convex polygon through the points [x, y, z], fanned from its first
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
const pair = (pts) => [panel(pts), panel(pts.map(([x, y, z]) => [-x, y, z]).reverse())];

// ---- the body: an extrusion of a side view ([z, y] points; ['arc', z, y, r] a wheel arch from its rear foot to its front)
const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true);
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);
// extruded `w` wide across the car, its edges rounded by `bevel` round the side view and `across` across the car;
// `taper` [y0, y1, k] narrows it above y0 (the tumblehome)
const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel, shape = null) => {
  const geo = new THREE.ExtrudeGeometry(shape || sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: bevel > 0, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2 - across, 0, 0);
  if (taper) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, narrowAt(pos.getX(i), pos.getY(i), taper));
    geo.computeVertexNormals();
  }
  return geo;
};
const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
// a glass panel on a sloping face from [z0, y0] to [z1, y1] (side view), `half` the half width before narrowing, inset
// `inset` from the sides and `ends` (shares) from its ends, laid `lift` out along the face's normal on the side `out`
// ([nz, ny]) points to
const slopeGlass = ([z0, y0], [z1, y1], half, taper, inset, ends, lift, out) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  let nz = -dy / len, ny = dz / len;
  if (nz * out[0] + ny * out[1] < 0) { nz = -nz; ny = -ny; }
  const at = (t, sx) => {
    const z = z0 + dz * t + nz * lift, y = y0 + dy * t + ny * lift;
    return [sx * (narrowAt(half, y, taper) - inset), y, z];
  };
  const [a, b] = ends;
  return panel([at(a, -1), at(a, 1), at(1 - b, 1), at(1 - b, -1)]);
};
// side windows: polygons of [z, y] laid on the (narrowed) flank, `lift` out
const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [narrowAt(half, y, taper) + lift, y, z])));
// a band of a side view: a line of [z, y] points and the same line `t` lower, as one outline (the Yacht's roof cap)
const band = (pts, t) => [...pts, ...pts.slice().reverse().map(([z, y]) => [z, y - t])];
// shade a geometry darker toward its foot (vertex colours: times the paint, any paint alike), `low` at y0 to white at y1
const shadeLow = (geo, y0, y1, low) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * t;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const GEOS = new Map();
const cached = (key, make) => { if (!GEOS.has(key)) { const g = make(); g.userData.shared = true; GEOS.set(key, g); } return GEOS.get(key); };
const wheel = (parent, R, width, x, z, hubMat = SILVER, hubK = 0.55) => {
  place(parent, cached('tyre' + [R, width], () => new THREE.CylinderGeometry(R, R, width, 14).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, cached('hub' + [R, width, hubK], () => new THREE.CylinderGeometry(R * hubK, R * hubK, width + 0.016, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
};

export const IDEA_MODELS_BATCH_D4 = {};

// Each car is drawn at a base width (the W in its builder) and widened to the idea's hw by scaling the whole model across
// the car (no extra geometry): body, glass, lamps and wheels (the tyres a little wider) all follow, so the wheels stay planted.
const widen = (group, k) => {
  group.scale.x = k;
  const outer = new THREE.Group();
  outer.add(group);
  outer.userData = group.userData;
  return outer;
};

// ---- the Autobahn Estate (after the Audi RS6 Avant, fast German-style performance estate) ----------------------------------
// Low, wide and long: a flat roof carried straight back over the load bay to a near-upright tailgate with a small spoiler lip;
// a wide black single-frame grille between slim swept headlamps, a deep splitter and
// side intakes; roof rails; a slim tail lamp bar either side and twin oval exhausts under a dark diffuser.
IDEA_MODELS_BATCH_D4.autobahnestate = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const W = 0.92, L = car.hl, R = 0.39, AF = 1.45, AR = -1.38;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const BEV = 0.08, BW = 2 * W - 0.08, NOSE = L - BEV, TAILZ = -L + BEV, AY = 0.3;
  const bodyOutline = [
    [NOSE - 0.04, AY], ...curve([NOSE - 0.04, AY], [NOSE + 0.01, 0.5], [NOSE + 0.01, 0.7], [NOSE - 0.08, 0.8], 4),
    ...curve([NOSE - 0.08, 0.8], [1.6, 0.86], [1.2, 0.93], [0.85, 0.97], 3),
    [-1.0, 1.0], ...curve([-1.0, 1.0], [-1.9, 1.0], [TAILZ + 0.02, 1.0], [TAILZ, 0.9], 3),
    [TAILZ, 0.46], [TAILZ + 0.05, AY],
  ];
  // the glasshouse: raked windscreen, flat roof, a steep tailgate leaning in toward the top
  const CBEV = 0.07, CW = BW - 0.1, TOP = car.height - CBEV, CY = 0.97, TAPER = [0.98, TOP, 0.2];
  const WS = [[0.88, CY], [0.28, TOP - 0.03]], TG = [[-2.27, CY], [-2.1, TOP - 0.06]];
  const roof = [WS[1], ...curve(WS[1], [0, TOP + 0.01], [-1.2, TOP + 0.01], [-2.0, TOP - 0.02], 5)];
  const cabinOutline = [WS[0], ...roof, TG[1], TG[0]];
  const body = shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.16),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.12),
    // the spoiler lip on the tailgate's top edge
    bx(CW * 0.78, 0.045, 0.2, 0, TOP + 0.05, -2.08, -0.12),
  ]), 0.25, 0.8, [0.72, 0.7, 0.68]);
  const bodyMesh = place(group, body, paint);
  // glass: windscreen, tailgate glass, two door windows and a quarter window a side
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = 1.04, top = 1.27;
  const aEdge = (y) => zAt(WS, y) - 0.1, cEdge = (y) => zAt(TG, y) + 0.1;
  bag.add(GLASS,
    slopeGlass([zAt(WS, foot), foot], WS[1], CH, TAPER, CBEV + 0.03, [0, 0.05], LIFT, [1, 1]),
    slopeGlass([zAt(TG, foot), foot], TG[1], CH, TAPER, CBEV + 0.04, [0, 0.07], LIFT, [-1, 0.3]),
    ...sideGlass([
      [[aEdge(foot), foot], [0.12, foot], [0.12, top], [aEdge(top), top]],
      [[0.02, foot], [-0.8, foot], [-0.8, top], [0.02, top]],
      [[-0.9, foot], [cEdge(foot), foot], [cEdge(top), top], [-0.9, top]],
    ], CH, TAPER, 0.006));
  // roof rails, mirrors
  for (const s of [-1, 1]) {
    bag.add(TRIM, rod(0.022, 1.9, s * 0.5, car.height + 0.004, -0.95, 'z', 8), bx(0.12, 0.07, 0.15, s * 0.84, 1.04, 0.7), strut([s * 0.78, 1.0, 0.76], [s * 0.86, 1.04, 0.72], 0.02, 5));
    // the face: slim swept headlamps, side intakes with an amber lamp, the exhausts and tail lamps behind
    bag.add(TRIM, bx(0.4, 0.13, 0.05, s * 0.55, 0.66, L - 0.045), bx(0.3, 0.12, 0.04, s * 0.58, 0.4, L - 0.04));
    bag.add(LAMP, bx(0.34, 0.075, 0.03, s * 0.55, 0.665, L - 0.027));
    bag.add(AMBER, bx(0.2, 0.03, 0.03, s * 0.58, 0.4, L - 0.025));
    bag.add(TAIL, bx(0.44, 0.11, 0.03, s * 0.55, 0.8, -L - 0.004));
    bag.add(CHROME, new THREE.CylinderGeometry(0.045, 0.045, 0.1, 10).rotateX(Math.PI / 2).scale(1.7, 1, 1).translate(s * 0.55, 0.38, -L - 0.04));
  }
  bag.add(TRIM, bx(0.6, 0.17, 0.05, 0, 0.55, L - 0.03), bx(BW - 0.3, 0.07, 0.14, 0, 0.36, L - 0.09),
    bx(BW - 0.12, 0.18, 0.07, 0, 0.4, -L + 0.03), bx(BW - 0.3, 0.04, 0.2, 0, 0.3, -L + 0.0), bx(BW - 0.1, 0.1, 2.5, 0, 0.27, 0.0));
  bag.add(CHROME, bx(0.4, 0.025, 0.05, 0, 0.55, L - 0.02));
  bag.add(PLATE, bx(0.4, 0.1, 0.02, 0, 0.68, -L - 0.002));
  bag.add(TAIL, bx(0.26, 0.04, 0.03, 0, 0.78, -L - 0.004));
  bag.done(group).get(PLATE).userData.plate = 'rear';
  for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, R, 0.28, s * (W - 0.15), z, ALLOY, 0.68);
  group.userData = { body: bodyMesh, animate: () => {} };
  return widen(group, car.hw / W);
};

// ---- the Fin Land Yacht (after the 1959 Cadillac Sedan de Ville) ------------------------------------------------------------
// Enormous: a long, flat, wide body with a high wide nose carrying a chrome bumper with two bullets, a broad grille and four
// round headlamps; the cabin a thin roof on slim pillars with a wraparound windscreen and back window (the roof in a second
// colour); and the tail rising into two giant blade fins, each ending in a pair of red bullet lamps over a chrome bumper.
// Whitewall tyres, chrome hubcaps.
IDEA_MODELS_BATCH_D4.finlandyacht = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const W = 1.0, L = car.hl, R = 0.36, AF = 1.75, AR = -1.6;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const ROOF = { good: 0xf2efe6, evil: 0x7a1020 }, roofMat = new THREE.MeshLambertMaterial({ color: ROOF.good });
  const BEV = 0.08, BW = 2 * W - 0.08, NOSE = L - BEV, TAILZ = -L + BEV, AY = 0.3;
  const bodyOutline = [
    [NOSE - 0.04, AY], ...curve([NOSE - 0.04, AY], [NOSE + 0.01, 0.55], [NOSE + 0.01, 0.82], [NOSE - 0.05, 0.92], 4),
    ...curve([NOSE - 0.05, 0.92], [2.0, 0.95], [1.6, 0.97], [1.1, 0.97], 3),
    [-1.2, 1.0], ...curve([-1.2, 1.0], [-2.4, 1.02], [TAILZ + 0.04, 1.02], [TAILZ, 0.92], 3),
    [TAILZ, 0.5], [TAILZ + 0.05, AY],
  ];
  const CBEV = 0.07, CW = BW - 0.36, TOP = car.height - CBEV, CY = 0.98, TAPER = [0.98, TOP, 0.14];
  const WS = [[1.0, CY], [0.4, TOP - 0.03]], BL = [[-1.15, CY], [-1.45, TOP - 0.06]];
  const roof = [WS[1], ...curve(WS[1], [0, TOP + 0.01], [-0.9, TOP + 0.01], [-1.35, TOP - 0.01], 5)];
  const cabinOutline = [WS[0], ...roof, [-1.4, TOP - 0.04], BL[1], BL[0]];
  // the fins: a blade a side along the rear wing, rising to a sharp tip at the tail
  const fin = extrudeSide([[-1.3, 0.94], [-2.0, 1.04], [-2.78, 1.46], [-2.84, 0.94]], 0.12, 0.02, null, 1);
  const body = shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 2, 0.16),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.12),
    ...[-1, 1].map(s => fin.clone().translate(s * (BW / 2 - 0.12), 0, 0)),
  ]), 0.25, 0.8, [0.72, 0.7, 0.68]);
  const bodyMesh = place(group, body, paint);
  // the roof in its second colour: a cap on the flat of the roof
  const capPts = [[0.34, TOP + 0.03], ...curve([0.34, TOP + 0.03], [0, TOP + 0.075], [-0.8, TOP + 0.075], [-1.25, TOP + 0.055], 5)];
  place(group, merge([extrudeSide(band(capPts, 0.1), CW - 0.3, 0.02, TAPER, 1)]), roofMat);
  // glass: wraparound windscreen and back window, three side windows a side
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = 1.06, top = 1.3;
  const aEdge = (y) => zAt(WS, y) - 0.1, cEdge = (y) => zAt(BL, y) + 0.1;
  bag.add(GLASS,
    slopeGlass([zAt(WS, foot), foot], WS[1], CH, TAPER, CBEV + 0.03, [0, 0.06], LIFT, [1, 1]),
    slopeGlass([zAt(BL, foot), foot], BL[1], CH, TAPER, CBEV + 0.04, [0, 0.08], LIFT, [-1, -1]),
    ...sideGlass([
      [[aEdge(foot), foot], [0.06, foot], [0.06, top], [aEdge(top), top]],
      [[-0.04, foot], [-0.62, foot], [-0.62, top], [-0.04, top]],
      [[-0.72, foot], [cEdge(foot), foot], [cEdge(top), top], [-0.72, top]],
    ], CH, TAPER, 0.006));
  for (const s of [-1, 1]) {
    // four round headlamps (two a side) in chrome rings, the grille between, the bumper's bullets
    for (const x of [0.84, 0.6]) {
      bag.add(CHROME, dsc(0.105, 0.03, s * x, 0.75, L - 0.005, 14));
      bag.add(LAMP, dsc(0.08, 0.03, s * x, 0.75, L + 0.006, 14));
    }
    bag.add(CHROME, blob(0.07, 0.07, 0.14, s * 0.4, 0.5, L + 0.01, 0, 0, 0, [8, 6]), bx(0.4, 0.2, 0.12, s * 0.72, 0.5, L - 0.01), bx(0.3, 0.2, 0.14, s * 0.88, 0.5, L - 0.2, 0, s * 0.8));
    bag.add(AMBER, bx(0.2, 0.05, 0.03, s * 0.7, 0.4, L + 0.054));
    // the tail: two red bullet lamps stacked at each fin's trailing edge, chrome rear bumper ends
    bag.add(TAIL, dsc(0.055, 0.07, s * (BW / 2 - 0.12), 1.2, -2.835, 10), dsc(0.055, 0.07, s * (BW / 2 - 0.12), 1.08, -2.835, 10));
    bag.add(CHROME, bx(0.4, 0.2, 0.12, s * 0.72, 0.5, -L + 0.01), bx(0.3, 0.2, 0.14, s * 0.88, 0.5, -L + 0.2, 0, -s * 0.8));
    bag.add(TAIL, bx(0.26, 0.1, 0.03, s * 0.55, 0.82, -L - 0.004));
  }
  bag.add(CHROME, bx(0.8, 0.12, 0.12, 0, 0.5, L - 0.01), bx(0.8, 0.12, 0.12, 0, 0.5, -L + 0.01), bx(1.14, 0.03, 0.05, 0, 0.84, L + 0.004));
  bag.add(TRIM, bx(0.72, 0.22, 0.05, 0, 0.74, L - 0.015), bx(BW - 0.2, 0.06, AF - AR - 0.9, 0, 0.3, (AF + AR) / 2));
  bag.add(PLATE, bx(0.4, 0.1, 0.02, 0, 0.7, -L - 0.002));
  bag.done(group).get(PLATE).userData.plate = 'rear';
  // wheels: whitewall tyres and big chrome caps
  for (const s of [-1, 1]) for (const z of [AF, AR]) {
    wheel(group, R, 0.28, s * (W - 0.15), z, CHROME, 0.3);
    place(group, cached('white' + R, () => new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.288, 14).rotateZ(Math.PI / 2)), PLATE, s * (W - 0.15), R, z);
    place(group, cached('cap' + R, () => new THREE.CylinderGeometry(R * 0.5, R * 0.5, 0.31, 12).rotateZ(Math.PI / 2)), CHROME, s * (W - 0.15), R, z);
  }
  const colour = (hex) => roofMat.color.setHex(hex);
  group.userData = { body: bodyMesh, animate: () => {}, livery: (evil) => colour(evil ? ROOF.evil : ROOF.good), stripe: colour };
  group.userData.livery(false);
  return widen(group, car.hw / W);
};
