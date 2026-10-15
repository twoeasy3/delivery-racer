// ---- the idea cars' top-up, batch A: four classic road cars (ideas: src/delivery/ideasTopupA.js) ---------------------
// The Slant-Back Saloon (after the Ford Anglia 105E), the Glass-Hatch Brake (the Volvo P1800 ES), the Seven Roadster (the
// Lotus Seven) and the Tall Tourer (the Ford Model T). render/ideaModels.js spreads IDEA_MODELS_TOPUP_A into IDEA_MODELS.
// Built as the approved Commuter and Junker are (render/modelsOrig1b.js, modelsOrig3.js; the helpers are copies, so the
// files do not import each other): the bodies are extrusions of a side view with rounded edges, the glass thin flat panels
// laid a few mm proud of them, the small parts merged into one mesh per material, plain chunky wheels (a fat tyre, a plain
// hub disc: meshes of their own, which the showroom's suspension finds), no panel lines, vertex-colour shading low down,
// and a little character drawn in code (soft road dust low on the flanks, 128 x 32; the roadster's racing roundel, 64 x 64).
// Each builder takes the idea's entry and returns a group, front facing local +z, with
//   userData.body     the mesh in the paint (every painted part shares its one material)
//   userData.animate  (seconds) => void (they sit still)
//   userData.livery   (evil) => void: the second colours (the Brake's lower body, the Seven's nose or wings, the Tourer's
//                     brass and hood)
//   userData.stripe   (hex) => void: that second colour in a colour of one's own (the Brake and the Seven)
// No people: the open cars have empty seats. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cabinGlass } from './ideaModelsDkit.js';

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x161616)), SILVER = keep(lambert(0xc4c8ce)), CHROME = keep(lambert(0xd6d9dd)), TRIM = keep(lambert(0x232529));
const BLACK = keep(lambert(0x141518)), ALLOY = keep(lambert(0xa9adb2)), LEATHER = keep(lambert(0x2b211b)), WOOD = keep(lambert(0xc4a676)), PLATE = keep(lambert(0xece6cc));
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
// a band of a side view: a line of [z, y] points and the same line `t` lower, as one outline (a wing, a cycle wing)
const band = (pts, t) => [...pts, ...pts.slice().reverse().map(([z, y]) => [z, y - t])];
// points round an arc about [z, y] of radius r, from angle a0 to a1 (radians; 0 is +z, PI/2 up)
const arcPts = (z, y, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n;
  return [z + r * Math.cos(a), y + r * Math.sin(a)];
});
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

// ---- small textures drawn in code (made once, shared) -----------------------------------------------------------------
const TEXTURES = new Map();
const texture = (key, w, h, draw) => {
  if (!TEXTURES.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.userData.shared = true;
    TEXTURES.set(key, map);
  }
  return TEXTURES.get(key);
};
// road dust thrown up along a sill: soft brown flecks and smears, thickest at the foot, thinning to nothing up the flank
// and toward both ends (no hard edge anywhere: every mark's strength fades with its distance from the edges). 128 x 32
const dust = () => texture('topupA-dust', 128, 32, (ctx, W, H) => {
  ctx.clearRect(0, 0, W, H);
  let seed = 23;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 520; i++) {
    const fx = rnd(), fy = rnd() ** 0.6; // (more of them low down)
    const k = Math.min(1, Math.min(fx, 1 - fx) / 0.22) * fy ** 2.2 * Math.min(1, (1.04 - fy) / 0.12 + 0.5);
    if (rnd() > k) continue;
    ctx.fillStyle = `rgba(${96 + rnd() * 40 | 0},${74 + rnd() * 26 | 0},${50 + rnd() * 16 | 0},${(0.12 + 0.3 * k).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(fx * W, fy * H, 1 + rnd() * 3 * k + 0.5, 0.6 + rnd() * 1.6 * k, (rnd() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
});
// a racing roundel: a white disc with a black 7, its rim softened. 64 x 64
const roundel = () => texture('topupA-roundel', 64, 64, (ctx, W, H) => {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 24, W / 2, H / 2, 31);
  g.addColorStop(0, 'rgba(246,244,236,1)');
  g.addColorStop(0.7, 'rgba(246,244,236,0.95)');
  g.addColorStop(1, 'rgba(246,244,236,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#16161a';
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('7', W / 2 + 1, H / 2 + 3);
});
// a flat picture on a flank (facing +x or -x), w by h, its middle at z, y; `flip` mirrors it (the other flank's)
const flankDecal = (w, h, x, y, z, flip = false) => {
  const geo = new THREE.PlaneGeometry(w, h);
  if (flip) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
  geo.rotateY(x > 0 ? Math.PI / 2 : -Math.PI / 2);
  return geo.translate(x, y, z);
};
const decalMat = (map, opacity = 1) => new THREE.MeshLambertMaterial({ map, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

export const IDEA_MODELS_TOPUP_A = {};

// ---- the Slant-Back Saloon (Ford Anglia 105E, 1959) --------------------------------------------------------------------
// A small two-door saloon: a low bonnet with the headlamps set under hooded brows (slanting down to the outside, which
// gives it its look), a wide chrome grille between them; a normal raked windscreen, a flat roof running back past the
// rear window, and that window leaning BACKWARDS (its foot ahead of its top) so the roof overhangs a short boot; small
// blade fins along the rear wings, a tall tail lamp at each fin's end. Chrome bumpers, silver hubs, road dust low down.
IDEA_MODELS_TOPUP_A.slantback = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const W = car.hw, L = car.hl, R = 0.29, AF = 1.32, AR = -1.2;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const BEV = 0.08, BW = 2 * W - 0.08, NOSE = L - BEV, TAILZ = -L + BEV, AY = R, ARCH = R + 0.05 + BEV;
  const bodyOutline = [
    [NOSE - 0.04, AY], ...curve([NOSE - 0.04, AY], [NOSE + 0.01, 0.46], [NOSE + 0.01, 0.7], [NOSE - 0.1, 0.8], 4),
    ...curve([NOSE - 0.1, 0.8], [1.5, 0.84], [1.1, 0.86], [0.8, 0.87], 3),
    [-1.8, 0.9], ...curve([-1.8, 0.9], [TAILZ + 0.03, 0.9], [TAILZ, 0.84], [TAILZ, 0.72], 3),
    [TAILZ, 0.42], [TAILZ + 0.05, AY],
    ['arc', AR, AY, ARCH], ['arc', AF, AY, ARCH],
  ];
  // the glasshouse: raked windscreen, flat roof, a lip, the back window leaning the wrong way down to the boot
  const CBEV = 0.05, CW = BW - 0.1, TOP = car.height - CBEV, CY = 0.75, TAPER = [0.86, TOP, 0.17];
  const WS = [[0.92, CY], [0.36, TOP]], BL = [[-0.6, CY], [-1.0, TOP]];
  const roof = [WS[1], BL[1]]; // (a flat roof: two corners, the windscreen's top and the back window's)
  const cabinOutline = [WS[0], ...roof, BL[0]];
  const body = shadeLow(merge([
    extrudeSide(bodyOutline, BW, BEV, null, 3, 0.16),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.12),
    // the brows over the headlamps, slanting down to the outside; the blade fins along the rear wings
    ...[-1, 1].map(s => blob(0.15, 0.05, 0.14, s * 0.58, 0.79, NOSE - 0.04, 0.25, 0, -s * 0.2, [10, 5])),
    ...[-1, 1].map(s => extrudeSide([[-1.2, 0.84], [-2.04, 0.84], [-2.05, 1.07], [-1.92, 1.07]], 0.07, 0.02, null, 1).translate(s * (BW / 2 - 0.07), 0, 0)),
  ]), 0.2, 0.7, [0.74, 0.7, 0.68]);
  const bodyMesh = place(group, body, paint);
  // ALL the glass from the cabin's own side profile (cabinGlass: one inset outline, so the screens and the side windows share one top line at
  // the pillars; the owner, 14-Oct): a door window and a quarter window each side with the B-pillar between
  const CH = CW / 2, LIFT = CBEV + 0.006, BELT = 0.99;
  const glass = cabinGlass(cabinOutline, { from: 0, to: cabinOutline.length - 1, belt: BELT, half: CH, taper: TAPER, grow: CBEV,
    inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: LIFT, sideLift: 0.006, windows: [[-0.2, 9], [-9, -0.3]] });
  // (the back window leans BACKWARDS, so its outward normal is the opposite of a forward-leaning screen's, which cabinGlass assumes: the same
  // call with the lifts negated stands that screen proud of the body on the outside; only its rear glass is used)
  const rear = cabinGlass(cabinOutline, { from: 0, to: cabinOutline.length - 1, belt: BELT, half: CH, taper: TAPER, grow: CBEV,
    inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: -LIFT, sideLift: 0.006 }).rear;
  bag.add(GLASS, ...glass.sides, glass.front, rear);
  // the face: round lamps under the brows in chrome rings, a wide grille between them, chrome bumpers round the corners
  for (const s of [-1, 1]) {
    bag.add(CHROME, dsc(0.105, 0.03, s * 0.58, 0.66, L - 0.005, 14));
    bag.add(LAMP, dsc(0.085, 0.03, s * 0.58, 0.66, L + 0.006, 14));
    bag.add(AMBER, dsc(0.04, 0.03, s * 0.6, 0.45, L - 0.01, 10));
    bag.add(CHROME, bx(0.34, 0.1, 0.1, s * 0.74, 0.33, L - 0.08, 0, s * 0.55), bx(0.34, 0.1, 0.1, s * 0.74, 0.36, -L + 0.08, 0, -s * 0.55));
    // the tail: a tall lamp at the end of each fin (the left one brakes), an amber one under it
    bag.add(TAIL, bx(0.075, 0.26, 0.03, s * (BW / 2 - 0.07), 0.92, -L - 0.005));
    bag.add(AMBER, dsc(0.035, 0.03, s * (BW / 2 - 0.07), 0.66, -L - 0.0, 10));
  }
  bag.add(CHROME, blob(0.4, 0.1, 0.04, 0, 0.55, L - 0.02, 0, 0, 0, [14, 6]), bx(1.3, 0.1, 0.1, 0, 0.33, L + 0.02), bx(1.3, 0.1, 0.1, 0, 0.36, -L - 0.02));
  bag.add(PLATE, bx(0.36, 0.12, 0.02, 0, 0.62, -L - 0.002));
  bag.add(TRIM, blob(0.36, 0.075, 0.04, 0, 0.55, L - 0.005, 0, 0, 0, [14, 6]), bx(BW - 0.1, 0.1, AF - AR - 0.9, 0, 0.27, (AF + AR) / 2));
  // road dust along the sills, between the wheels
  const dusty = decalMat(dust(), 0.8);
  bag.add(dusty, ...[-1, 1].map(s => flankDecal(1.2, 0.24, s * (BW / 2 + 0.006), 0.43, (AF + AR) / 2, s < 0)));
  const meshes = bag.done(group);
  meshes.get(dusty).renderOrder = 1;
  meshes.get(PLATE).userData.plate = 'rear';
  for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, R, 0.24, s * (W - 0.12), z, SILVER, 0.6);
  group.userData = { body: bodyMesh, animate: () => {} };
  return group;
};

// ---- the Glass-Hatch Brake (Volvo P1800 ES, 1972) ----------------------------------------------------------------------
// A long, low sports coupe made into a shooting brake: a long bonnet over a low, wide grille with a round lamp at each end,
// the cabin set back, a flat roof carried straight on into a long glass hatch that lies almost flat down to a tiny lip
// at the tail, the side glass running all the way back to meet it. The body is two-tone, broken along the shoulder:
// the lower body in a deeper second colour (a step proud of the upper, all round), the paint above it. Split chrome
// bumpers, small tail lamps either side of the hatch.
IDEA_MODELS_TOPUP_A.glassbrake = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const W = car.hw, L = car.hl, R = 0.31, AF = 1.32, AR = -1.2;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const LOWER = { good: 0x7a3b2e, evil: 0x111a14 }, lower = new THREE.MeshLambertMaterial({ color: LOWER.good, vertexColors: true });
  const BEV = 0.07, BW = 2 * W - 0.06, NOSE = L - BEV, TAILZ = -L + BEV, AY = R, ARCH = R + 0.05 + BEV;
  // the break, front to back: up from the nose along the flank, then dipping down ahead of the rear wheel (the shoulder's
  // famous kink); the lower body under it, a step proud all round, the paint over it
  const brk = [[NOSE + 0.01, 0.5], ...curve([NOSE + 0.01, 0.5], [1.2, 0.52], [0.6, 0.6], [0.1, 0.61], 3), [-0.15, 0.61],
    ...curve([-0.15, 0.61], [-0.35, 0.61], [-0.37, 0.5], [-0.55, 0.5], 2), [TAILZ - 0.01, 0.5]];
  const lowerOutline = [[NOSE - 0.02, AY], [NOSE + 0.01, 0.42], ...brk, [TAILZ - 0.01, 0.42], [TAILZ + 0.03, AY],
    ['arc', AR, AY, ARCH], ['arc', AF, AY, ARCH]];
  const upperOutline = [[NOSE, 0.53], ...curve([NOSE, 0.53], [NOSE + 0.02, 0.68], [NOSE - 0.05, 0.74], [NOSE - 0.3, 0.77], 3),
    ...curve([NOSE - 0.3, 0.77], [1.2, 0.8], [0.8, 0.84], [0.45, 0.86], 3), [TAILZ + 0.3, 0.86],
    ...curve([TAILZ + 0.3, 0.86], [TAILZ + 0.05, 0.84], [TAILZ, 0.8], [TAILZ, 0.72], 2),
    ...brk.slice(1).reverse().map(([z, y]) => [Math.max(TAILZ, z), y + 0.03])];
  const CBEV = 0.05, CW = BW - 0.16, TOP = car.height - CBEV, CY = 0.72, TAPER = [0.86, TOP, 0.14];
  const WS = [[0.62, CY], [-0.06, TOP - 0.01]], HM = [-1.68, 1.05], HF = [TAILZ + 0.05, 0.86];
  const HT = [-1.0, WS[1][1] + (HM[1] - WS[1][1]) * (-1.0 - WS[1][0]) / (HM[0] - WS[1][0])]; // (where the hatch glass begins: ON the straight line of the roof, so the body has no corner there)
  const roof = [WS[1]];
  const cabinOutline = [WS[0], ...roof, HM, HF, [TAILZ + 0.05, CY]];
  const body = place(group, shadeLow(merge([
    extrudeSide(upperOutline, BW, BEV, null, 2, 0.16),
    extrudeSide(cabinOutline, CW, CBEV, TAPER, 2, 0.12),
  ]), 0.55, 1.0, [0.86, 0.84, 0.82]), paint);
  place(group, shadeLow(merge([extrudeSide(lowerOutline, BW + 0.024, BEV, null, 2, 0.16)]), 0.2, 0.6, [0.8, 0.78, 0.76]), lower);
  // the glass: ALL of it from the cabin's own side profile (cabinGlass: one inset outline, so the windscreen, the side glass and the tail glass share
  // one top line at the pillars), inset from the body's silhouette (grown CBEV); the glass 6 mm proud of the body. The side glass runs from the A-pillar
  // back along the roof and the flat hatch, down to the tail; a B-pillar splits it into the door window and the long rear quarter window. The one
  // thing cabinGlass does not make is the flat hatch panel itself (the near-flat roof of glass from the roof's end to the tail's bend), laid below
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = 0.97;
  const glass = cabinGlass(cabinOutline, { from: 0, to: cabinOutline.indexOf(HF), belt: foot, half: CH, taper: TAPER, grow: CBEV,
    inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: LIFT, sideLift: 0.006, windows: [[-0.64, 9], [-9, -0.74]] });
  // the rear is the car's gimmick, ONE full-glass panel from the roof's end down over the bend to the tail: the original two slopeGlass pieces, kept
  // (the owner, 14-Oct: the glass fix had split it with cabinGlass's rear glass and a body band, so that panel is as it was; glass.rear is not used)
  // the windscreen comes from a second cabinGlass call with the belt down at the bonnet (0.87): the side windows' belt (0.97) left the screen's foot
  // floating 11 cm above the bonnet with a strip of body under it; the screen's top is the same line (the A-pillar corner), only the foot is lower
  const screen = cabinGlass(cabinOutline, { from: 0, to: cabinOutline.indexOf(HF), belt: 0.87, half: CH, taper: TAPER, grow: CBEV,
    inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: LIFT, sideLift: 0.006, windows: [[-0.64, 9], [-9, -0.74]] });
  bag.add(GLASS, ...glass.sides, screen.front,
    slopeGlass(HT, HM, CH, TAPER, CBEV + 0.03, [0.02, 0], LIFT, [-0.2, 1]),
    slopeGlass(HM, HF, CH, TAPER, CBEV + 0.03, [-0.08, 0.12], LIFT - 0.002, [-1, 0.6]));
  // the face: a low wide grille, a round lamp in a chrome ring at each end, split bumpers, amber lamps in their corners
  for (const s of [-1, 1]) {
    bag.add(CHROME, dsc(0.1, 0.03, s * 0.62, 0.62, L - 0.012, 14), bx(0.52, 0.07, 0.08, s * 0.5, 0.41, L + 0.03), bx(0.26, 0.07, 0.08, s * 0.8, 0.41, L - 0.06, 0, s * 0.7));
    bag.add(LAMP, dsc(0.08, 0.03, s * 0.62, 0.62, L - 0.001, 14));
    bag.add(AMBER, bx(0.08, 0.045, 0.03, s * 0.8, 0.49, L - 0.005), bx(0.1, 0.05, 0.03, s * 0.7, 0.5, -L - 0.006));
    bag.add(CHROME, bx(0.3, 0.07, 0.08, s * 0.76, 0.42, -L + 0.06, 0, -s * 0.6));
    bag.add(TAIL, bx(0.12, 0.14, 0.03, s * 0.66, 0.75, -L + 0.002));
  }
  bag.add(CHROME, blob(0.44, 0.1, 0.04, 0, 0.47, L - 0.01, 0, 0, 0, [14, 6]), bx(1.3, 0.07, 0.08, 0, 0.42, -L - 0.02));
  bag.add(TRIM, blob(0.4, 0.075, 0.04, 0, 0.47, L + 0.004, 0, 0, 0, [14, 6]), bx(BW - 0.12, 0.1, 2 * AF - 1.0, 0, 0.27, 0.05));
  const dusty = decalMat(dust(), 0.7);
  bag.add(dusty, ...[-1, 1].map(s => flankDecal(1.0, 0.2, s * (BW / 2 + 0.018), 0.42, (AF + AR) / 2, s < 0)));
  bag.done(group).get(dusty).renderOrder = 1;
  for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, R, 0.25, s * (W - 0.12), z, SILVER, 0.6);
  const colour = (hex) => lower.color.setHex(hex);
  group.userData = { body, animate: () => {}, livery: (evil) => colour(evil ? LOWER.evil : LOWER.good), stripe: colour };
  group.userData.livery(false);
  return group;
};

// ---- the Seven Roadster (Lotus Seven, 1957) ----------------------------------------------------------------------------
// Barely a car: a narrow, low open tub, its bonnet long and tapering to a round nose cone; the front wheels bare out on
// wishbones, each under a thin cycle wing on a stay (connected: the stay runs down to the wheel's upright, the wishbones
// in to the body); the rear wheels under clamshell wings bolted to the tub's sides; a big side exhaust along one flank;
// a tiny aero screen, two empty seats in a dark cockpit, an alloy fuel tank lying on the short tail. A roundel on each
// flank. Two colours: Good green with a yellow nose cone, Evil black with red wings (userData.livery).
IDEA_MODELS_TOPUP_A.sevenroadster = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const R = 0.28, AF = 1.12, AR = -0.92, FX = 0.62, RX = 0.6;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const accent = new THREE.MeshLambertMaterial({ color: 0xf0c020 });
  const BEV = 0.04, BW = 0.9;
  // the tub and bonnet: one extrusion, then narrowed toward the nose
  const tubOutline = [[1.46, 0.17], ...curve([1.46, 0.17], [1.5, 0.3], [1.5, 0.5], [1.4, 0.54], 2), [0.5, 0.6], [-1.12, 0.6],
    ...curve([-1.12, 0.6], [-1.38, 0.59], [-1.5, 0.5], [-1.52, 0.32], 2), [-1.48, 0.17]];
  const tub = extrudeSide(tubOutline, BW, BEV, null, 2, 0.08);
  const narrow = (z) => 1 - 0.38 * Math.min(1, Math.max(0, (z - 0.4) / 1.1));
  { const pos = tub.attributes.position; for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * narrow(pos.getZ(i))); tub.computeVertexNormals(); }
  const body = place(group, shadeLow(merge([tub]), 0.12, 0.5, [0.72, 0.72, 0.72]), paint);
  // the nose cone (in the accent, Good), its dark mouth
  const nose = place(group, blob(0.29, 0.2, 0.3, 0, 0.36, 1.47, 0, 0, 0, [12, 6]), accent);
  bag.add(TRIM, blob(0.15, 0.1, 0.06, 0, 0.35, 1.72, 0, 0, 0, [10, 6]));
  // the wings: a clamshell over each rear wheel, its inner side in the tub; a thin cycle wing over each front wheel
  const rearWing = extrudeSide(band(arcPts(AR, R, R + 0.13, Math.PI, 0, 8), 0.08), 0.32, 0.03, null, 1);
  const frontWing = extrudeSide(band(arcPts(AF, R, R + 0.075, Math.PI * 0.86, Math.PI * 0.12, 6), 0.035), 0.22, 0, null, 1);
  const wings = place(group, shadeLow(merge([
    ...[-1, 1].map(s => rearWing.clone().translate(s * (RX - 0.01), 0, 0)),
    ...[-1, 1].map(s => frontWing.clone().translate(s * FX, 0, 0)),
  ]), 0.2, 0.6, [0.8, 0.8, 0.8]), paint);
  // the front suspension (dark): a stay from each cycle wing down to the wheel's upright, wishbones in to the body
  const bw = (z) => BW / 2 * narrow(z) - 0.02;
  for (const s of [-1, 1]) {
    const ux = s * (FX - 0.12);
    bag.add(TRIM,
      strut([ux, R + 0.32, AF - 0.04], [ux, R - 0.1, AF], 0.018),
      strut([s * bw(AF - 0.18), 0.2, AF - 0.18], [ux, 0.2, AF], 0.016), strut([s * bw(AF + 0.18), 0.2, AF + 0.18], [ux, 0.2, AF], 0.016),
      strut([s * bw(AF), 0.4, AF - 0.05], [ux, 0.38, AF], 0.016),
      rod(0.03, 0.06, s * 0.36, 0.58, 1.26, 'x', 8),
      strut([s * bw(1.26), 0.5, 1.26], [s * 0.43, 0.66, 1.26], 0.015));
    // the headlamps on short stalks beside the bonnet, just over the cycle wings
    bag.add(CHROME, rod(0.085, 0.12, s * 0.43, 0.7, 1.26, 'z', 10));
    bag.add(LAMP, dsc(0.07, 0.02, s * 0.43, 0.7, 1.325, 10));
    bag.add(AMBER, blob(0.035, 0.03, 0.03, s * 0.2, 0.3, 1.66));
    bag.add(TAIL, dsc(0.045, 0.03, s * 0.3, 0.44, -1.545, 10));
  }
  // the side exhaust (right flank): two pipes out of the bonnet's side into a long silencer along the tub
  bag.add(ALLOY, rod(0.06, 1.0, -0.505, 0.25, 0.05, 'z', 10),
    strut([-bw(0.95) + 0.03, 0.4, 0.95], [-0.505, 0.25, 0.55], 0.03), strut([-bw(0.8) + 0.03, 0.4, 0.8], [-0.505, 0.26, 0.5], 0.03),
    // the fuel tank, lying across the tail, and its cap
    rod(0.12, 0.62, 0, 0.7, -1.28, 'x', 10));
  bag.add(CHROME, rod(0.035, 0.04, 0.2, 0.83, -1.28, 'y', 8));
  // the cockpit: a dark well, two empty seats, a wheel, a tiny aero screen in a chrome frame
  const rimY = 0.6 + BEV;
  bag.add(BLACK, bx(BW - 0.16, 0.012, 1.4, 0, rimY + 0.004, -0.42));
  bag.add(LEATHER, bx(0.32, 0.2, 0.08, 0.17, rimY + 0.06, -0.98, -0.35), bx(0.32, 0.2, 0.08, -0.17, rimY + 0.06, -0.98, -0.35));
  bag.add(TRIM, new THREE.TorusGeometry(0.12, 0.016, 4, 12).rotateX(-0.4).translate(0.17, rimY + 0.15, 0.05));
  bag.add(GLASS, bx(0.6, 0.2, 0.01, 0, rimY + 0.11, 0.36, -0.35));
  bag.add(CHROME, rod(0.012, 0.62, 0, rimY + 0.2, 0.33, 'x', 6));
  // the roundels on the flanks
  const decal = decalMat(roundel());
  bag.add(decal, ...[-1, 1].map(s => flankDecal(0.25, 0.25, s * (BW / 2 + 0.004), 0.45, -0.32)));
  bag.done(group).get(decal).renderOrder = 1;
  for (const s of [-1, 1]) {
    wheel(group, R, 0.19, s * FX, AF, SILVER, 0.55);
    wheel(group, R, 0.24, s * RX, AR, SILVER, 0.55);
  }
  const colours = { good: 0xf0c020, evil: 0xc8161d };
  group.userData = {
    body, animate: () => {},
    livery: (evil) => { // Good: the nose in the accent, the wings in the paint; Evil: the other way round
      accent.color.setHex(evil ? colours.evil : colours.good);
      nose.material = evil ? paint : accent;
      wings.material = evil ? accent : paint;
    },
    stripe: (hex) => accent.color.setHex(hex),
  };
  group.userData.livery(false);
  return group;
};

// ---- the Tall Tourer (Ford Model T, 1908-27) ---------------------------------------------------------------------------
// Tall, narrow and upright: a boxy bonnet behind a tall brass radiator, a flat upright windscreen in a brass frame, an
// open box body with two bench seats (empty), the hood folded down in a bundle at the back; thin black wings over the
// wheels sweeping down into running boards; round brass lamps over the front wings, small side lamps on the scuttle,
// one red lamp low on the tail. A dusty lower body. Brass in Good, darkened in Evil (userData.livery).
IDEA_MODELS_TOPUP_A.talltourer = (car) => {
  const group = new THREE.Group(), bag = makeBag();
  const R = 0.4, AF = 1.25, AR = -1.05, WX = 0.68;
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
  const brass = new THREE.MeshLambertMaterial({ color: 0xc8a24a }), canvas = new THREE.MeshLambertMaterial({ color: 0xb8a67a, vertexColors: true });
  // the body: an open box from the scuttle to a short rounded tail, and the bonnet ahead of it
  const BW = 1.12;
  const tubOutline = [[0.85, 0.5], [0.87, 1.14], [0.7, 1.3], [-1.22, 1.3], ...curve([-1.22, 1.3], [-1.5, 1.3], [-1.56, 1.1], [-1.56, 0.9], 2),
    [-1.56, 0.6], [-1.48, 0.5]];
  const body = place(group, shadeLow(merge([
    extrudeSide(tubOutline, BW, 0.04, null, 2, 0.08),
    extrudeSide([[1.62, 0.7], [1.62, 1.1], [0.85, 1.14], [0.85, 0.7]], 0.64, 0.02, null, 2, 0.08),
  ]), 0.5, 1.1, [0.72, 0.68, 0.64]), paint);
  // the wings (black): a thin band over each wheel, the front ones drooping to the front, running boards between
  const fw = band([[0.62, 0.52], ...arcPts(AF, R, R + 0.12, Math.PI * 0.9, Math.PI * 0.18, 8), [1.7, 0.64]], 0.035);
  const rw = band([[-1.62, 0.66], ...arcPts(AR, R, R + 0.12, Math.PI * 0.86, Math.PI * 0.12, 8), [-0.5, 0.52]], 0.035);
  for (const s of [-1, 1]) {
    bag.add(BLACK,
      extrudeSide(fw, 0.26, 0, null, 1).translate(s * WX, 0, 0),
      extrudeSide(rw, 0.26, 0, null, 1).translate(s * WX, 0, 0),
      bx(0.26, 0.035, 1.2, s * WX, 0.505, 0.06),
      // the headlamps' stalks, down to the front wings
      rod(0.02, 0.2, s * 0.6, 0.8, 1.66, 'y', 6),
      // the side lamps' housings on the scuttle
      rod(0.055, 0.1, s * 0.6, 1.18, 0.78, 'z', 10));
    bag.add(brass, rod(0.11, 0.16, s * 0.6, 0.99, 1.66, 'z', 12));
    bag.add(LAMP, dsc(0.09, 0.02, s * 0.6, 0.99, 1.745, 12));
    bag.add(AMBER, dsc(0.04, 0.02, s * 0.6, 1.18, 0.835, 10));
    // the splash apron from the bonnet's side out to the wing
    bag.add(BLACK, bx(0.26, 0.02, 0.8, s * 0.44, 0.62, 1.22));
    // the windscreen's posts
    bag.add(brass, rod(0.018, 0.66, s * 0.52, 1.6, 0.74, 'y', 6));
    // the folded hood's bows, from the bundle down to the body's sides
    bag.add(BLACK, strut([s * 0.5, 1.46, -1.28], [s * 0.53, 1.31, -0.86], 0.015));
  }
  // the chassis rails under the bonnet and the front crossmember the wings' tips meet; the front axle
  bag.add(BLACK, bx(0.1, 0.12, 3.2, 0.36, 0.52, 0.1), bx(0.1, 0.12, 3.2, -0.36, 0.52, 0.1), bx(1.42, 0.06, 0.08, 0, 0.57, 1.72),
    rod(0.03, 2 * WX - 0.2, 0, R, AF, 'x', 6));
  // the radiator: a tall brass shell, a dark core, a cap; the windscreen's frame and glass; the tail lamp
  bag.add(brass,
    extrudeSide([[1.6, 0.6], [1.74, 0.6], [1.74, 1.24], [1.6, 1.24]], 0.62, 0.02, null, 1, 0.03),
    rod(0.04, 0.08, 0, 1.3, 1.67, 'y', 8),
    rod(0.018, 1.06, 0, 1.92, 0.74, 'x', 6), rod(0.018, 1.06, 0, 1.31, 0.74, 'x', 6));
  bag.add(TRIM, bx(0.5, 0.52, 0.02, 0, 0.92, 1.763));
  bag.add(GLASS, bx(1.02, 0.58, 0.012, 0, 1.615, 0.74));
  bag.add(BLACK, bx(0.15, 0.15, 0.08, 0.42, 0.72, -1.62));
  bag.add(TAIL, dsc(0.055, 0.02, 0.42, 0.72, -1.665, 10));
  // the open top: a dark well, two bench seats' backs, the steering wheel on its column
  bag.add(BLACK, bx(BW - 0.16, 0.01, 1.95, 0, 1.35, -0.33));
  bag.add(LEATHER, bx(0.98, 0.3, 0.14, 0, 1.45, -0.15, -0.15), bx(0.98, 0.3, 0.14, 0, 1.46, -1.06, -0.15));
  bag.add(BLACK, new THREE.TorusGeometry(0.17, 0.02, 4, 14).rotateX(-0.7).translate(0.27, 1.5, 0.38), strut([0.27, 1.5, 0.38], [0.27, 1.3, 0.66], 0.018));
  // the folded hood: a bundle of canvas lying across the back, bunched in folds (vertex lumps, darker in the creases)
  const hood = new THREE.CylinderGeometry(0.15, 0.15, 1.06, 12, 6).rotateZ(Math.PI / 2);
  { const pos = hood.attributes.position, shade = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(y, z);
      const fold = 0.025 * Math.sin(x * 14 + Math.sin(a * 3)) + 0.012 * Math.sin(a * 4);
      const end = 1 - 0.3 * (Math.abs(x) / 0.53) ** 4, k = (1 + fold / 0.15) * end;
      pos.setXYZ(i, x, y * k * 0.8, z * k);
      const c = 0.78 + 0.22 * (0.5 + fold / 0.05) * (0.7 + 0.3 * Math.max(0, y / 0.15));
      shade.set([c, c, c], i * 3);
    }
    hood.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3)); hood.computeVertexNormals(); }
  place(group, hood.translate(0, 1.46, -1.28), canvas);
  // dust low on the body's flanks
  const dusty = decalMat(dust(), 0.9);
  bag.add(dusty, ...[-1, 1].map(s => flankDecal(2.2, 0.34, s * (BW / 2 + 0.004), 0.68, -0.33, s < 0)));
  bag.done(group).get(dusty).renderOrder = 1;
  for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, R, 0.17, s * WX, z, WOOD, 0.62);
  group.userData = {
    body, animate: () => {},
    livery: (evil) => { brass.color.setHex(evil ? 0x8c7a46 : 0xc8a24a); canvas.color.setHex(evil ? 0x3a3631 : 0xb8a67a); },
  };
  group.userData.livery(false);
  return group;
};
