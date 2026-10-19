// ---- three of the original roster's models, rebuilt: the Taxi, the Sportscar and the SUV ------------------------------
// (cars.js `taxi`, `miata`, `suv`; also traffic kinds of the same names, config.js CONFIG.vehicles, so each is built for
// many traffic cars at once: every geometry is made once per size and shared, and every material that is not the paint
// or a livery colour is shared too.) render/models.js hands its MODELS.taxi / .miata / .suv to these builders.
// Each builder takes the car's entry ({ hw, hl, height, color, ... }) and returns a group, front facing local +z, with
//   userData.body     the mesh in the paint (the body and the cabin, one mesh), so the livery can be swapped
//   userData.animate  (seconds) => void
//   userData.livery   (evil) => void: the second colour (the taxi's checker band and sign, the Sportscar's stripes,
//                     the SUV's roof rack), as the idea cars' models do
//   (the Sportscar keeps userData.stripe(hex) as before: a rival courier's own stripe colour)
// The wheels stand where the old models had them (the same radius, the same axles), each tyre a mesh of its own with its
// hub inside it, so the showroom's suspension finds and plants them (render/carsuspension.js).
// How they are built: the body is an extrusion of its side view (wheel arches cut into it), its edges rounded off by a
// short bevel; the cabin another, narrowed toward its roof (tumblehome); the glass thin panels laid a few mm proud of
// the cabin's faces (so the pillars are the paint between them); the small parts boxes and discs merged into one mesh
// per material. Small procedural textures (the taxi's checker band and its roof sign) are made once, shared, and kept
// apart from the paint (their own materials, tinted by the livery). State-free.
import * as THREE from 'three';
import { shapesLive } from './shapeedits.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- shared materials (made once: clearGroup keeps them) ------------------------------------------------------------
const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x161616)), CHROME = keep(lambert(0xd9dce0)), SILVER = keep(lambert(0xb4b8bf));
const TRIM = keep(lambert(0x26282d)), ROOF = keep(lambert(0x34373d));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1f2633, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xc8141c));

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
// a disc facing along the car (a lamp, a bezel, a mirror's head)
const dsc = (r, depth, x, y, z, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).translate(x, y, z);
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
  const out = ux[0] * vx[1] - ux[1] * vx[0] > 0 ? pts : pts.slice().reverse(); // (its normal's x: (b - a) x (c - a))
  return [panel(out), panel(out.map(([x, y, z]) => [-x, y, z]).reverse())];
};

// ---- the body: an extrusion of a side view --------------------------------------------------------------------------
// `outline`: the side view as [z, y] points (in order round it), or ['arc', z, y, r] for a wheel arch cut up into the
// bottom edge (from its rear foot over to its front foot); extruded `w` wide across the car, its edges rounded by
// `bevel` (the outline grows by that much all round, and the sides stand at ±w/2). `taper`: [y0, y1, k] narrows it
// above y0, by k of its width at y1 (a cabin's tumblehome)
const sideShape = (outline) => {
  const shape = new THREE.Shape();
  outline.forEach((p, i) => {
    if (p[0] === 'arc') shape.absarc(p[1], p[2], p[3], Math.PI, 0, true);
    else if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  return shape;
};
const extrudeSide = (outline, w, bevel, taper = null, seg = 5) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: seg,
  });
  geo.rotateY(-Math.PI / 2); // (the outline's x along the car; extruded across it)
  geo.translate(w / 2 - bevel, 0, 0);
  if (taper) narrow(geo, taper);
  return geo;
};
// narrow a geometry above y0 (by k of its width at y1)
const narrow = (geo, [y0, y1, k]) => {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > y0) pos.setX(i, pos.getX(i) * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))));
  }
  geo.computeVertexNormals();
  return geo;
};
const narrowAt = (x, y, [y0, y1, k]) => (y > y0 ? x * (1 - k * Math.min(1.2, (y - y0) / (y1 - y0))) : x);

// a glass panel on a sloping face of the cabin: the face's edge (side view) from [z0, y0] (its foot) to [z1, y1] (its
// top), `half` the cabin's half width (before narrowing), inset `side` from its sides and `end` (a share) from its ends,
// laid `lift` m out from the face (beyond the bevel)
const slopeGlass = ([z0, y0], [z1, y1], half, taper, inset, ends, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len]; // (the face's outward normal: up, and away from the cabin)
  const at = (t, sx) => {
    const z = z0 + dz * t + nz * lift, y = y0 + dy * t + ny * lift;
    return [sx * (narrowAt(half, y, taper) - inset), y, z];
  };
  const [a, b] = ends;
  return panel([at(a, -1), at(a, 1), at(1 - b, 1), at(1 - b, -1)]);
};

// the side windows: each a polygon of [z, y] in the side view, laid on the cabin's (narrowed) flank, `lift` out
const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [narrowAt(half, y, taper) + lift, y, z])));

// a wheel, chunky as the rest of the roster's (render/models.js wheel): a fat dark tyre and a plain light hub, each a mesh
// of its own (the tyre a disc on its side, the hub inside it: the suspension finds and plants both)
const wheel = (parent, key, R, width, x, z, hubMat) => {
  const tyre = place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, 16).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.55, R * 0.55, width + 0.04, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
  return tyre;
};

// ---- the soft body (the approved Commuter's way, render/modelsOrig1b.js: copied, not imported) -----------------------
// `curve` samples a cubic Bezier through side-view points into points (its first left out: it is the one before it)
const curve = (a, b, c, d, n) => new THREE.CubicBezierCurve(...[a, b, c, d].map(([z, y]) => new THREE.Vector2(z, y)))
  .getPoints(n).slice(1).map(v => [v.x, v.y]);
// an extrusion of a side view with a big, round bevel (`bevel` round the side view, `across` across the car, `segs`
// steps), so the whole body is one softly rounded shape; `taper` as extrudeSide's
const extrudeSoft = (outline, w, bevel, taper = null, segs = 3, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(w / 2 - across, 0, 0);
  if (taper) narrow(geo, taper);
  return geo;
};
// a squashed sphere (half sizes sx, sy, sz), turned and placed: a lamp, a mirror
const blob = (sx, sy, sz, x, y, z, pitch = 0, yaw = 0, seg = [10, 6]) => {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// shade a geometry darker toward its foot (a vertex colour, times the paint's), from `low` at y0 up to white at y1
const shadeLow = (geo, y0, y1, low) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0)));
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * t;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};

// ---- tiny textures, made once ---------------------------------------------------------------------------------------
const TEX = new Map();
const canvasTexture = (key, w, h, draw) => {
  if (!TEX.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    draw(canvas.getContext('2d'));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    TEX.set(key, tex);
  }
  return TEX.get(key);
};
// two rows of checks, white and black (tinted by its material's colour): one texture repeated along the band
const checkerTexture = () => {
  const tex = canvasTexture('checks', 16, 16, (g) => {
    for (let i = 0; i < 2; i++) for (let row = 0; row < 2; row++) {
      g.fillStyle = (i + row) % 2 ? '#111111' : '#ffffff';
      g.fillRect(i * 8, row * 8, 8, 8);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
};
// the roof sign's face: TAXI, dark on a lit panel; the bottom quarter plain (the sign's ends and top are mapped there)
const signTexture = () => canvasTexture('taxisign', 128, 64, (g) => {
  g.fillStyle = '#fff4c0';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#16161a';
  g.fillRect(4, 4, 120, 3);
  g.fillRect(4, 41, 120, 3);
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TAXI', 64, 25);
});

export const ORIG4_MODELS = {};

// ---- the Taxi ---------------------------------------------------------------------------------------------------------
// A Checker Marathon cab: a long, upright four-door saloon with big round wheel arches and a flat bonnet and boot; a tall
// glasshouse with an upright windscreen, a thick C pillar with a small quarter window; quad round headlamps in chrome
// bezels either side of a wide chrome multi-bar grille; big chrome bumpers with overriders, front and back; a checker
// band down each flank (black and white, or black and yellow for Evil); a lit TAXI sign on the roof; chrome round
// mirrors, plain chrome hubs; a tall red tail lamp up each rear corner (the game lays its brake lamps and indicators
// over the tail: render/cars.js). No panel lines, handles or small clusters: the surfaces are left clean (the owner).
ORIG4_MODELS.taxi = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.38; // (as before: the wheels at ±0.3 of the length, radius 0.38)
  const k = 'taxi' + [W, L].join(',');
  const paint = lambert(car.color);
  const checker = new THREE.MeshLambertMaterial({ map: checkerTexture() });
  const sign = new THREE.MeshBasicMaterial({ map: signTexture() });
  const AX = 0.3 * 2 * L; // (the axles, ±1.53 for the cab)
  const BW = W * 2 + 0.06, BEV = 0.05; // (the body's width, sides at ±1.03)
  const SX = BW / 2; // (its flanks)
  const ARCH = R + 0.18, AY = R - 0.02; // (the arches: radius, centre height)
  const NOSE = L - 0.07, TAILZ = -L + 0.07; // (the outline's ends, before the bevel)
  const BELT = 1.0; // (the top of the body under the glasshouse, before the bevel)
  // the body, side on: a flat bonnet and boot, the nose and tail nearly upright, two big round arches
  const bodyOutline = [
    [NOSE - 0.06, 0.34], [NOSE, 0.44], [NOSE + 0.01, 0.86], [NOSE - 0.04, 0.95], [NOSE - 0.16, 0.985],
    [AX - 0.3, BELT], [-AX - 0.25, BELT], [TAILZ + 0.14, 0.975], [TAILZ + 0.02, 0.94], [TAILZ, 0.86], [TAILZ + 0.01, 0.44], [TAILZ + 0.06, 0.34],
    [-AX - ARCH - 0.02, 0.32], ['arc', -AX, AY, ARCH], [AX - ARCH, 0.31], ['arc', AX, AY, ARCH], [AX + ARCH + 0.02, 0.32],
  ];
  // the glasshouse, side on: an upright windscreen, a flat roof, a back window as steep
  const CW = BW - 0.16, CBEV = 0.04, TAPER = [1.05, 1.56, 0.1]; // (its width, bevel, and how it narrows to the roof)
  const WS = [[AX - 0.38, BELT + 0.02], [AX - 0.88, 1.5]], BL = [[-AX - 0.25, BELT + 0.02], [-AX + 0.15, 1.5]];
  const cabinOutline = [WS[0], WS[1], [WS[1][0] - 0.1, 1.53], [BL[1][0] + 0.1, 1.53], BL[1], BL[0]];
  // the wings, crowned over the bonnet and the boot (their outer sides just inside the flanks, their feet in the body
  // over the arches: only their crowns show)
  const WW = 0.44, wingX = SX - 0.01 - WW / 2;
  const frontWing = [[NOSE - 0.03, 0.95], [NOSE - 0.06, 1.0], [NOSE - 0.24, 1.035], [AX - 0.36, 1.04], [AX - 0.5, 0.99], [AX - 0.5, 0.95]];
  const rearWing = [[TAILZ + 0.03, 0.95], [TAILZ + 0.07, 0.99], [TAILZ + 0.24, 1.02], [-AX - 0.2, 1.03], [-AX - 0.1, 0.99], [-AX - 0.1, 0.95]];
  const wing = (outline, x) => extrudeSide(outline, WW, BEV).translate(x, 0, 0);
  const body = place(group, shared(k + 'body', () => merge([
    extrudeSide(bodyOutline, BW, BEV),
    extrudeSide(cabinOutline, CW, CBEV, TAPER),
    ...[-1, 1].flatMap(side => [wing(frontWing, side * wingX), wing(rearWing, side * wingX)]),
  ])), paint);
  // the glass: windscreen, back window, and three windows a side (front door, rear door, quarter)
  const CH = CW / 2, LIFT = CBEV + 0.006;
  const top = 1.53 + CBEV, foot = BELT + 0.05 + 0.06;
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass(WS[0], WS[1], CH, TAPER, 0.09, [0.12, 0.06], LIFT),
    slopeGlass(BL[0], BL[1], CH, TAPER, 0.1, [0.12, 0.08], LIFT),
    ...sideGlass([
      [[WS[0][0] - 0.2, foot], [0.12, foot], [0.12, top - 0.07], [WS[1][0] - 0.12, top - 0.07]],                 // front door
      [[0.0, foot], [-0.84, foot], [-0.84, top - 0.07], [0.0, top - 0.07]],                                        // rear door
      [[-0.96, foot], [-1.32, foot], [-1.22, top - 0.09], [-0.96, top - 0.09]],              // quarter
    ], CH, TAPER, 0.006),
  ]);
  // chrome: the bumpers (with their wrap-round ends and overriders), the grille's frame and bars, the lamp bezels, the
  // mirrors
  const FZ = NOSE + BEV, RZ = TAILZ - BEV; // (the nose's and the tail's faces)
  parts(group, k + 'chrome', CHROME, () => {
    const g = [];
    for (const [z, s] of [[FZ + 0.07, 1], [RZ - 0.07, -1]]) {
      g.push(bx(BW - 0.1, 0.17, 0.13, 0, 0.42, z));                                                  // the bumper's bar
      for (const side of [-1, 1]) {
        g.push(bx(0.13, 0.17, 0.3, side * (SX - 0.06), 0.42, z - s * 0.1, 0, side * s * 0.35));    // its wrap-round end
        g.push(bx(0.09, 0.3, 0.1, side * 0.42, 0.47, z + s * 0.05));                                // an overrider
      }
    }
    g.push(bx(0.98, 0.04, 0.05, 0, 0.885, FZ + 0.012), bx(0.98, 0.04, 0.05, 0, 0.56, FZ + 0.012));   // the grille's frame
    g.push(bx(0.04, 0.37, 0.05, -0.47, 0.722, FZ + 0.012), bx(0.04, 0.37, 0.05, 0.47, 0.722, FZ + 0.012));
    for (let i = 0; i < 5; i++) g.push(bx(0.9, 0.022, 0.04, 0, 0.61 + i * 0.056, FZ + 0.012));      // its bars
    for (const side of [-1, 1]) {
      for (const x of [0.62, 0.84]) g.push(dsc(0.105, 0.04, side * x, 0.77, FZ + 0.01, 14));       // the lamps' bezels
      g.push(dsc(0.06, 0.035, side * (SX + 0.03), BELT + 0.09, AX - 0.62, 10));                     // a round mirror, on the wing
    }
    return g;
  });
  // the dark parts: behind the grille, the mirrors' glass, the sign's foot
  parts(group, k + 'dark', TRIM, () => {
    const g = [bx(0.9, 0.3, 0.03, 0, 0.722, FZ - 0.003)];                                          // behind the grille
    for (const side of [-1, 1]) {
      g.push(dsc(0.047, 0.01, side * (SX + 0.03), BELT + 0.09, AX - 0.64, 10));                     // its glass
    }
    return g;
  });
  parts(group, k + 'signfoot', TRIM, () => [bx(0.56, 0.05, 0.2, 0, top + 0.02, -0.2)]).userData.prop = 'roof'; // the sign's foot (a roof prop with the sign)
  // the roof sign: one box, its faces mapped to the sign's picture (TAXI) and its ends and top to the plain strip
  const signGeo = shared('taxisign', () => {
    const geo = new THREE.BoxGeometry(0.66, 0.2, 0.24);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4);
      if (face < 4) uv.setXY(i, 0.5, 0.06);
      else uv.setXY(i, 0.04 + uv.getX(i) * 0.92, 0.3 + uv.getY(i) * 0.66);
    }
    return geo;
  });
  place(group, signGeo, sign, 0, top + 0.145, -0.2).userData.prop = 'roof'; // (the roof sign: hidden when a roof prop is chosen)
  // the checker band, down each flank under the belt (the texture repeated along it)
  const bandGeo = shared(k + 'band', () => {
    const len = 2 * L - 0.5, geos = pair([[SX + 0.0045, 0.8, -len / 2], [SX + 0.0045, 0.8, len / 2], [SX + 0.0045, 0.92, len / 2], [SX + 0.0045, 0.92, -len / 2]]); // (4.5 mm off the flank)
    const g = merge(geos), uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getZ(i) + len / 2) / 0.12 / 2, pos.getY(i) > 0.86 ? 1 : 0);
    return g;
  });
  place(group, bandGeo, checker);
  // the lamps: quad round headlamps; at the back a tail lamp up each corner
  parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(side => [0.62, 0.84].map(x => dsc(0.082, 0.04, side * x, 0.77, FZ + 0.02, 14))));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(side => bx(0.26, 0.3, 0.03, side * 0.8, 0.8, RZ - 0.01)));
  // the wheels: black tyres on plain chrome hubs
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, 0.26, side * (W - 0.07), z, CHROME);
  group.userData = {
    body,
    animate: () => {},
    livery: (evil) => {
      checker.color.setHex(evil ? 0xffc81a : 0xffffff); // (black and white, or black and yellow)
      sign.color.setHex(evil ? 0xffb070 : 0xffffff);
    },
  };
  return group;
};

// a ribbon laid along an extrusion's top (a racing stripe): `path` the outline's points ([z, y], in the outline's order,
// the outside on their left as the taxi's and the Sportscar's go: up the nose, back over the top), lifted `d` out from
// them (the bevel and a few mm), from x0 to x1 across the car, both sides of the centre line
const ribbon = (path, d, x0, x1) => {
  const n = (a, b) => { const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy); return [dy / len, -dz / len]; };
  const out = path.map((p, i) => {
    const na = i > 0 ? n(path[i - 1], p) : null, nb = i + 1 < path.length ? n(p, path[i + 1]) : null;
    const [mz, my] = na && nb ? [na[0] + nb[0], na[1] + nb[1]] : na || nb, len = Math.hypot(mz, my), m = [mz / len, my / len];
    const s = d / Math.max(0.5, m[0] * (na || nb)[0] + m[1] * (na || nb)[1]); // (mitred: each edge lifted by d)
    return [p[0] + m[0] * s, p[1] + m[1] * s];
  });
  const g = [];
  for (let i = 0; i + 1 < out.length; i++) {
    const [a, b] = [out[i], out[i + 1]];
    for (const side of [-1, 1]) g.push(panel([[side * x0, a[1], a[0]], [side * x1, a[1], a[0]], [side * x1, b[1], b[0]], [side * x0, b[1], b[0]]]));
  }
  return g;
};

// ---- the Sportscar --------------------------------------------------------------------------------------------------
// A small, low two-seat sports coupe: a wedge of a nose over a front spoiler, the bonnet rising to a raised scoop, a
// steeply raked windscreen under a short roof and a fastback down to a ducktail; twin racing stripes from the spoiler's
// lip over the nose, the bonnet, the roof and the boot (white on red for Good, black on yellow for Evil; userData.stripe
// for a rival courier's own colour); faired-in headlamps at the nose's corners, a dark intake; fat
// tyres on plain silver hubs; a tail lamp across each of the tail's corners over a dark diffuser.
ORIG4_MODELS.miata = (car) => {
  const group = new THREE.Group();
  const W = car.hw, L = car.hl, R = 0.32; // (as before: radius 0.32, the axles at +0.32 and -0.31 of the length)
  const k = 'miata' + [W, L].join(',');
  const paint = lambert(car.color), stripe = new THREE.MeshLambertMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide });
  const AF = 0.64 * L, AR = -0.62 * L; // (the axles: 1.248 and -1.209 for the car)
  const BW = W * 2 + 0.14, BEV = 0.04, SX = BW / 2; // (the flanks at ±0.92: the fat tyres under them)
  const ARCH = R + 0.08, AY = R - 0.02;
  const NOSE = L - 0.06, TAILZ = -L + 0.06;
  // the nose, up its face and back over the bonnet to the windscreen's foot (the stripes follow it)
  const front = [[NOSE, 0.3], [NOSE - 0.01, 0.4], [NOSE - 0.09, 0.5], [NOSE - 0.27, 0.58], [AF, 0.72], [AF - 0.65, 0.78]];
  const deck = [[-L * 0.69, 0.78], [TAILZ + 0.15, 0.8], [TAILZ + 0.02, 0.82]]; // (the boot, up to the ducktail's lip)
  const bodyOutline = [
    [NOSE - 0.07, 0.2], ...front, ...deck, [TAILZ - 0.01, 0.74], [TAILZ, 0.36], [TAILZ + 0.05, 0.2],
    [AR - ARCH - 0.02, 0.17], ['arc', AR, AY, ARCH], [AF - ARCH, 0.16], ['arc', AF, AY, ARCH], [AF + ARCH + 0.02, 0.18],
  ];
  // the cabin: the windscreen's foot to the roof, the fastback down to the boot
  const CW = BW - 0.3, CBEV = 0.035, TAPER = [0.8, 1.06, 0.16];
  const WS = [front[5], [-0.1, 1.03]], BL = [deck[0], [-0.7, 1.03]];
  const roof = [WS[1], [-0.2, 1.05], [-0.6, 1.05], BL[1]];
  const cabinOutline = [[WS[0][0], WS[0][1] - 0.03], ...roof, [BL[0][0], BL[0][1] - 0.03]];
  // the bonnet's scoop (its outline, side on: a blunt front, then down onto the bonnet)
  const scoop = [[1.1, 0.7], [1.1, 0.84], [0.72, 0.86], [0.62, 0.79], [0.62, 0.7]];
  const body = place(group, shared(k + 'body', () => merge([
    extrudeSide(bodyOutline, BW, BEV),
    extrudeSide(cabinOutline, CW, CBEV, TAPER),
    extrudeSide(scoop, 0.36, 0.02),
    bx(BW - 0.12, 0.05, 0.2, 0, 0.14, NOSE - 0.02),                                               // the front spoiler's lip
  ])), paint);
  // the stripes: two, from the spoiler's lip up the nose, over the bonnet, the roof and the boot
  const X0 = 0.075, X1 = 0.27;
  place(group, shared(k + 'stripes', () => merge([
    ...ribbon(front, BEV + 0.004, X0, X1),
    ...ribbon(scoop.slice(1, 4), 0.024, X0, Math.min(X1, 0.16)),                                   // (over the scoop too)
    ...ribbon(roof, CBEV + 0.004, X0, X1),
    ...ribbon(deck, BEV + 0.004, X0, X1),
    ...pair([[X0, 0.12, NOSE + 0.085], [X1, 0.12, NOSE + 0.085], [X1, 0.17, NOSE + 0.085], [X0, 0.17, NOSE + 0.085]]).map(g => g),
    ...[-1, 1].map(side => panel([[side * X0, 0.168, NOSE + 0.084], [side * X1, 0.168, NOSE + 0.084], [side * X1, 0.168, NOSE - 0.12], [side * X0, 0.168, NOSE - 0.12]])),
  ])), stripe);
  // the glass: windscreen, the fastback's window, and one long window a side
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = WS[0][1] + CBEV + 0.04, top = 1.0;
  parts(group, k + 'glass', GLASS, () => [
    slopeGlass([WS[0][0], WS[0][1] - 0.03], WS[1], CH, TAPER, 0.07, [0.1, 0.05], LIFT),
    slopeGlass([BL[0][0], BL[0][1] - 0.03], BL[1], CH, TAPER, 0.09, [0.12, 0.06], LIFT),
    ...sideGlass([[[0.29, foot], [-1.0, foot], [-0.7, top], [-0.12, top]]], CH, TAPER, 0.006),
  ]);
  // the dark parts: the intake, the lamps' surrounds, the scoop's mouth, the mirrors, the diffuser
  const FZ = NOSE + BEV, RZ = TAILZ - BEV;
  const lampPitch = Math.atan2(0.08, 0.18); // (the nose's slope where the lamps sit: on it, beyond the bevel)
  const LZ = NOSE - 0.18 + Math.sin(lampPitch) * BEV, LY = 0.54 + Math.cos(lampPitch) * BEV;
  parts(group, k + 'dark', TRIM, () => {
    const g = [bx(0.8, 0.07, 0.03, 0, 0.3, FZ - 0.004), bx(0.3, 0.05, 0.03, 0, 0.795, 1.115)];
    for (const side of [-1, 1]) {
      g.push(bx(0.3, 0.012, 0.17, side * 0.62, LY, LZ, lampPitch));                                 // the lamps' surrounds
      g.push(bx(0.1, 0.03, 0.06, side * (SX - 0.03), 0.84, 0.4));                                   // a mirror's foot...
      g.push(bx(0.08, 0.07, 0.11, side * (SX + 0.03), 0.875, 0.4));                                 // ...and its head
    }
    g.push(bx(BW - 0.3, 0.08, 0.06, 0, 0.21, RZ + 0.025));                                          // the diffuser
    return g;
  });
  parts(group, k + 'lamp', LAMP, () => [-1, 1].map(side => bx(0.26, 0.012, 0.13, side * 0.62, LY + 0.007, LZ + 0.003, lampPitch)));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(side => bx(0.34, 0.14, 0.02, side * 0.6, 0.61, RZ - 0.004)));
  // the wheels: fat tyres on plain silver hubs
  for (const side of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, 0.26, side * (W - 0.06), z, SILVER);
  const colour = (hex) => stripe.color.setHex(hex);
  group.userData = {
    body,
    animate: () => {},
    livery: (evil) => colour(evil ? 0x151515 : 0xf4f4f4),
    stripe: colour, // (a scheme of its own: see Traffic, a rival courier)
  };
  return group;
};

// ---- the SUV --------------------------------------------------------------------------------------------------------
// A boxy 4x4 of the eighties and nineties (a Jeep Cherokee), as the approved Commuter is built: one tall, square body
// with softly rounded edges and a straight lower line (no arches: the fat tyres stand proud of its corners), a flat
// bonnet up to an upright windscreen, a tall glasshouse with three windows a side under a long flat roof, a near-
// upright tailgate; a ribbed roof panel (one dark charcoal panel, its ribs along it, on either side); a chrome grille block with five dark slots between two plain rectangular lamps; black bumpers
// and a black skirt; tall tail lamps up the rear corners and a spare wheel on the tailgate (the owner); round mirrors in the paint; chunky tyres on silver hubs. The
// paint shades deeper low down. It rocks a little on its soft springs (everything but the wheels).
ORIG4_MODELS.suv = (car) => {
  const group = new THREE.Group();
  const shell = new THREE.Group(); // (what rocks on the springs: everything but the wheels)
  group.add(shell);
  const W = car.hw, L = car.hl, R = 0.42; // (as before: radius 0.42, the axles at ±0.3 of the length)
  const k = 'suv' + [W, L].join(',');
  const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true }), roofPanel = ROOF;
  const AX = 0.6 * L, BW = 2 * W, BEV = 0.1;
  const NOSE = L - BEV - 0.03, TAILZ = -L + BEV + 0.04, BELT = 1.08, SILL = 0.5;
  const WSF = [1.0, BELT + 0.02];
  const bodyOutline = [
    [NOSE - 0.04, SILL], [NOSE, SILL + 0.06], [NOSE + 0.01, 0.94], ...curve([NOSE + 0.01, 0.94], [NOSE + 0.01, BELT - 0.04], [NOSE - 0.04, BELT], [NOSE - 0.2, BELT], 3),
    WSF, [TAILZ + 0.08, BELT + 0.02], ...curve([TAILZ + 0.08, BELT + 0.02], [TAILZ, BELT + 0.02], [TAILZ, BELT - 0.02], [TAILZ, BELT - 0.1], 2),
    [TAILZ, SILL + 0.06], [TAILZ + 0.04, SILL],
  ];
  const CBEV = 0.08, CW = BW - 0.06, TOP = car.height - CBEV - 0.05, CY = BELT - 0.12;
  const TAPER = [CY - CBEV, TOP, 0.07];
  const WS = [[WSF[0] + 0.1, CY], [0.42, TOP - 0.05]], BACK = [[TAILZ + 0.1, TOP - 0.05], [TAILZ + 0.04, CY]];
  const roof = [WS[1], ...curve(WS[1], [0.36, TOP], [0.2, TOP], [0.05, TOP], 2), [TAILZ + 0.22, TOP], ...curve([TAILZ + 0.22, TOP], [TAILZ + 0.14, TOP], [TAILZ + 0.11, TOP - 0.02], BACK[0], 2)];
  const cabinOutline = [WS[0], ...roof, BACK[1]];
  const mirrorX = W - 0.04; // (the mirrors sit on the body's shoulder, half in the cabin's side at the A pillar's foot)
  const body = place(shell, shared(k + 'body', () => shadeLow(merge([
    extrudeSoft(bodyOutline, BW, BEV, null, 3, 0.14),
    extrudeSoft(cabinOutline, CW, CBEV, TAPER, 3, 0.1),
    ...[-1, 1].map(s => blob(0.07, 0.09, 0.11, s * mirrorX, BELT + 0.17, WSF[0] - 0.12, 0, 0, [8, 5])),   // the mirrors
  ]), 0.4, 1.05, [0.7, 0.72, 0.8])), paint);
  // the glass: windscreen, the tailgate's window, three windows a side (front door, rear door, the load bay)
  const CH = CW / 2, LIFT = CBEV + 0.006, foot = BELT + BEV + 0.08, top = TOP - 0.06;
  const zAt = ([[z0, y0], [z1, y1]], y) => z0 + (z1 - z0) * (y - y0) / (y1 - y0);
  parts(shell, k + 'glass', GLASS, () => [
    slopeGlass([zAt(WS, foot - 0.04), foot - 0.04], WS[1], CH, TAPER, CBEV + 0.04, [0.02, 0.06], LIFT),
    slopeGlass([zAt(BACK, foot), foot], BACK[0], CH, TAPER, CBEV + 0.08, [0.02, 0.08], LIFT),
    ...sideGlass([
      [[zAt(WS, foot) - 0.12, foot], [0.02, foot], [0.02, top], [zAt(WS, top) - 0.12, top]],
      [[-0.08, foot], [-0.96, foot], [-0.96, top], [-0.08, top]],
      [[-1.06, foot], [zAt(BACK, foot) + 0.16, foot], [zAt(BACK, top) + 0.16, top], [-1.06, top]],
    ], CH, TAPER, 0.006),
  ]);
  // the ribbed roof panel: one flat dark panel on the roof, its ribs along it
  const RY = TOP + CBEV, RZ0 = 0.22, RZ1 = TAILZ + 0.3;
  parts(shell, k + 'roof', roofPanel, () => [
    bx(1.24, 0.02, RZ0 - RZ1, 0, RY + 0.002, (RZ0 + RZ1) / 2),
    ...[-0.48, -0.24, 0, 0.24, 0.48].map(x => bx(0.07, 0.035, RZ0 - RZ1 - 0.06, x, RY + 0.02, (RZ0 + RZ1) / 2)),
  ]).userData.prop = 'roof'; // (the ribbed roof rack panel: a roof prop)
  // the face: a chrome grille block with five dark slots, two plain rectangular lamps
  const FZ = NOSE + BEV + 0.01;
  parts(shell, k + 'chrome', CHROME, () => [bx(0.9, 0.34, 0.04, 0, 0.84, FZ)]);
  parts(shell, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.3, 0.18, 0.04, s * 0.72, 0.86, FZ)));
  // black: the slots, the bumpers, the skirt
  parts(shell, k + 'black', TRIM, () => [
    ...[0, 1, 2, 3, 4].map(i => bx(0.76, 0.03, 0.04, 0, 0.72 + i * 0.06, FZ + 0.006)),
    extrudeSoft([[NOSE - 0.3, 0.34], [NOSE + 0.06, 0.34], [NOSE + 0.12, 0.4], [NOSE + 0.12, 0.62], [NOSE - 0.3, 0.62]], BW + 0.06, 0.04, null, 2, 0.12),
    extrudeSoft([[TAILZ + 0.3, 0.34], [TAILZ - 0.06, 0.34], [TAILZ - 0.12, 0.4], [TAILZ - 0.12, 0.62], [TAILZ + 0.3, 0.62]], BW + 0.06, 0.04, null, 2, 0.12),
    bx(BW - 0.06, 0.16, 2 * (NOSE - 0.3), 0, 0.44, 0),
  ]);
  parts(shell, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.36, 0.04, s * 0.78, 0.92, TAILZ - BEV - 0.005)));
  // the spare wheel on the tailgate, as big as the road wheels (upright, on a short bracket; it rocks with the body)
  const SZ = TAILZ - BEV - 0.08 - 0.16, SY = 0.9;
  place(shell, shared(k + 'spare', () => new THREE.CylinderGeometry(R, R, 0.32, 16).rotateX(Math.PI / 2)), TYRE, 0, SY, SZ);
  place(shell, shared(k + 'sparehub', () => new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.36, 12).rotateX(Math.PI / 2)), SILVER, 0, SY, SZ);
  place(shell, shared(k + 'bracket', () => new THREE.BoxGeometry(0.24, 0.24, 0.12)), TRIM, 0, SY, TAILZ - BEV - 0.04);
  // the wheels: chunky tyres on silver hubs
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, 0.32, side * (W - 0.08), z, SILVER);
  group.userData = {
    body,
    lampFrame: shell, // (the body the lamps ride on: render/carlights.js frame)
    animate: (t) => {
      shell.rotation.z = Math.sin(t * 1.7) * 0.012;
      shell.position.y = Math.sin(t * 3.4) * 0.012;
    },
  };
  return group;
};
