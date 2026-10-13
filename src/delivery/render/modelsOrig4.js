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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- shared materials (made once: clearGroup keeps them) ------------------------------------------------------------
const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const TYRE = keep(lambert(0x161616)), CHROME = keep(lambert(0xd9dce0));
const TRIM = keep(lambert(0x26282d)), PLATE = keep(lambert(0xf2f0e6));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1f2633, side: THREE.DoubleSide }));
const LAMP = keep(basic(0xfff3c4)), TAIL = keep(basic(0xb5121b)), STOP = keep(basic(0xff3030)), AMBER = keep(basic(0xffa31a));
const REVERSE = keep(basic(0xf4f4f0));

// ---- shared geometry ---------------------------------------------------------------------------------------------
const SHARED = new Map();
const shared = (key, make) => {
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

// a wheel: tyre, hub and its centre, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, hubR, hubMat, capMat) => {
  const tyre = place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, 16).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(hubR, hubR, width + 0.012, 12).rotateZ(Math.PI / 2)), hubMat, x, R, z);
  place(parent, shared(key + 'cap', () => new THREE.CylinderGeometry(hubR * 0.36, hubR * 0.36, width + 0.03, 8).rotateZ(Math.PI / 2)), capMat, x, R, z);
  return tyre;
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
// bezels either side of a wide chrome multi-bar grille, amber parking lamps under them; big chrome bumpers with
// overriders, front and back; a checker band down each flank (black and white, or black and yellow for Evil); a lit
// TAXI sign on the roof; chrome round mirrors, door handles, little hub caps. Tail lamps up the rear corners: the tail
// lamp over the brake lamp over an amber indicator, a reversing lamp, the plate between them.
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
  // chrome: the bumpers (with their wrap-round ends and overriders), the grille's frame and bars, the lamp bezels,
  // window trim along the belt, door handles, the mirrors
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
      g.push(bx(0.012, 0.025, 2.2, side * (SX + 0.004), BELT + 0.05, -0.35));                     // trim along the belt
      for (const z of [0.18, -0.78]) g.push(bx(0.03, 0.03, 0.14, side * (SX + 0.012), 0.92, z));  // door handles
      g.push(bx(0.1, 0.025, 0.04, side * (SX + 0.04), BELT + 0.1, AX - 0.62, 0, 0, side * 0.5));    // a mirror's arm...
      g.push(dsc(0.06, 0.035, side * (SX + 0.085), BELT + 0.15, AX - 0.62, 10));                    // ...and its round head
    }
    return g;
  });
  // the dark parts: behind the grille, the wheel wells, shut lines, the mirrors' glass, the sign's base, wipers
  parts(group, k + 'dark', TRIM, () => {
    const g = [bx(0.9, 0.3, 0.03, 0, 0.722, FZ - 0.003)];                                          // behind the grille
    for (const z of [AX, -AX]) g.push(bx(BW - 0.5, 0.5, ARCH * 2 - 0.06, 0, 0.62, z));             // the wells, inboard
    for (const side of [-1, 1]) {
      for (const z of [0.07, -0.93]) g.push(bx(0.008, 0.6, 0.012, side * (SX + 0.001), 0.69, z)); // the doors' rear edges
      g.push(bx(0.008, 0.52, 0.012, side * (SX + 0.001), 0.73, AX - ARCH - 0.04));                 // the front door's front edge
      g.push(bx(0.008, 0.012, 2.0, side * (SX + 0.001), 0.36, -0.42));                              // the sills
      g.push(dsc(0.047, 0.01, side * (SX + 0.085), BELT + 0.15, AX - 0.64, 10));                    // mirror glass
      g.push(bx(0.4, 0.015, 0.02, side * 0.25, 1.06, AX - 0.4, 0, 0.1 * side));                    // the wipers
    }
    g.push(bx(BW - 0.3, 0.008, 0.012, 0, BELT + BEV + 0.001, AX - 0.26));                          // the bonnet's shut line
    g.push(bx(BW - 0.4, 0.008, 0.012, 0, BELT + BEV - 0.02, TAILZ + 0.7));                        // the boot's
    g.push(bx(0.56, 0.05, 0.2, 0, top + 0.02, -0.2));                                               // the sign's foot
    return g;
  });
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
  place(group, signGeo, sign, 0, top + 0.145, -0.2);
  // the checker band, down each flank under the belt (the texture repeated along it)
  const bandGeo = shared(k + 'band', () => {
    const len = 2 * L - 0.5, geos = pair([[SX + 0.003, 0.8, -len / 2], [SX + 0.003, 0.8, len / 2], [SX + 0.003, 0.92, len / 2], [SX + 0.003, 0.92, -len / 2]]);
    const g = merge(geos), uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getZ(i) + len / 2) / 0.12 / 2, pos.getY(i) > 0.86 ? 1 : 0);
    return g;
  });
  place(group, bandGeo, checker);
  // the lamps: quad round headlamps, amber parking lamps under them; at the back the tail lamps up the corners
  parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(side => [0.62, 0.84].map(x => dsc(0.082, 0.04, side * x, 0.77, FZ + 0.02, 14))));
  parts(group, k + 'amber', AMBER, () => [-1, 1].flatMap(side => [
    bx(0.24, 0.06, 0.03, side * 0.73, 0.6, FZ + 0.01),
    bx(0.2, 0.07, 0.03, side * 0.8, 0.6, RZ - 0.01),
  ]));
  parts(group, k + 'tail', TAIL, () => [-1, 1].map(side => bx(0.26, 0.14, 0.03, side * 0.8, 0.88, RZ - 0.01)));
  parts(group, k + 'stop', STOP, () => [-1, 1].map(side => bx(0.26, 0.12, 0.03, side * 0.8, 0.74, RZ - 0.01)));
  parts(group, k + 'rev', REVERSE, () => [-1, 1].map(side => bx(0.12, 0.06, 0.03, side * 0.46, 0.62, RZ - 0.01)));
  // the plates, front (on the bumper) and back (between the lamps)
  parts(group, k + 'plate', PLATE, () => [bx(0.42, 0.12, 0.02, 0, 0.44, FZ + 0.145), bx(0.42, 0.14, 0.02, 0, 0.7, RZ - 0.01)]);
  // the wheels: black tyres, chrome hub caps with dark centres
  for (const side of [-1, 1]) for (const z of [AX, -AX]) wheel(group, k, R, 0.26, side * (W - 0.07), z, 0.24, CHROME, TRIM);
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
