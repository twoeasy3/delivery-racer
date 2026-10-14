// ---- car ideas' models, batch D5: the Trophy Truck and the Armoured Limo ---------------------------------------------
// Two vehicles drawn as ideas (ideasBatchD5.js): a Baja desert-racing "trophy truck" (a long-travel race truck: a low
// fibreglass body between huge fenders over tall tyres, shock stubs standing up out of the bonnet and the tail, a roll
// cage over a small cab, a roof light bar, a spare on the tail) and an armoured limousine (a long black-tie saloon
// with thick slab sides, small deep windows, steel bumpers and sills, and big run-flat wheels). No figures, no weapons.
// Built as the approved Junker is (render/modelsOrig3.js; helpers kept here as copies, as ideaModelsTopupC.js does):
// each body an extrusion of its side view with its edges rounded, flat dark glass laid a few mm proud, parts that share
// a material and never move merged into one mesh, paint shaded darker low down (vertex colours), plain chunky wheels (a
// dark tyre, a plain hub disc: meshes of their own, so the showroom's suspension finds them). Character from one small
// texture DRAWN IN CODE, soft-edged (road dust along the sills and fenders; a race number): no image files, no panel
// lines. Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_D5 into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xb4b8be)), TRIM = keep(lambert(0x24262a)), CHROME = keep(lambert(0xc8cbd0));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a);

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
const plain = (geo) => {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  return g;
};
const merge = (geos) => mergeGeometries(geos.map(plain), false);
const parts = (parent, key, material, make) => place(parent, shared(key, () => merge(make())), material);

const bx = (w, h, l, x, y, z, pitch = 0, yaw = 0, roll = 0) => {
  const geo = new THREE.BoxGeometry(w, h, l);
  if (roll) geo.rotateZ(roll);
  if (pitch) geo.rotateX(pitch);
  if (yaw) geo.rotateY(yaw);
  return geo.translate(x, y, z);
};
// a disc facing along the car (a lamp, a bezel), turned `yaw` about the upright
const dsc = (r, depth, x, y, z, yaw = 0, seg = 12) => new THREE.CylinderGeometry(r, r, depth, seg).rotateX(Math.PI / 2).rotateY(yaw).translate(x, y, z);
// a flat picture w by h facing 'x', '-x', 'z' or '-z', its uv a part of the texture (u, v ranges)
const decal = (w, h, x, y, z, facing, u = [0, 1], v = [0, 1]) => {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { uv.setX(i, u[0] + uv.getX(i) * (u[1] - u[0])); uv.setY(i, v[0] + uv.getY(i) * (v[1] - v[0])); }
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  return geo.translate(x, y, z);
};

// ---- a body: an extrusion of its side view ([z, y] points; ['arc', z, y, r] a wheel arch from its rear foot over to its
// front), `w` wide across the car, its outline grown by `bevel` all round and rounded `across` deep over the sides
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
const extrudeSide = (outline, w, bevel, taper = null, segs = 2, across = bevel) => {
  const geo = new THREE.ExtrudeGeometry(sideShape(outline), {
    depth: w - 2 * across, bevelEnabled: true, bevelThickness: across, bevelSize: bevel, bevelSegments: segs, curveSegments: 6,
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
// a flat convex panel through the points ([x, y, z], in order), and the same panel on both sides of the car
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
const pair = (pts) => {
  const [a, b, c] = pts, ux = [b[1] - a[1], b[2] - a[2]], vx = [c[1] - a[1], c[2] - a[2]];
  const out = ux[0] * vx[1] - ux[1] * vx[0] > 0 ? pts : pts.slice().reverse();
  return [panel(out), panel(out.map(([x, y, z]) => [-x, y, z]).reverse())];
};
// side windows: each a polygon of [z, y] laid on the (narrowed) flank of half width `half`, `lift` out from it
const sideGlass = (windows, half, taper, lift) => windows.flatMap(win => pair(win.map(([z, y]) => [(taper ? narrowAt(half, y, taper) : half) + lift, y, z])));
// a glass panel across the car on a face sloping from [z0, y0] to [z1, y1], `hx` its half width, laid `lift` out from it
const slopeGlass = ([z0, y0], [z1, y1], hx0, hx1, lift) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
  const [nz, ny] = dz < 0 ? [dy / len, -dz / len] : [-dy / len, dz / len];
  const at = (z, y, hx, s) => [s * hx, y + ny * lift, z + nz * lift];
  return panel([at(z0, y0, hx0, -1), at(z0, y0, hx0, 1), at(z1, y1, hx1, 1), at(z1, y1, hx1, -1)]);
};
// shade a geometry by height: `fn(y)` gives the multiplier (a vertex colour times the paint's)
const shadeBy = (geo, fn) => {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) col.set(fn(pos.getY(i), pos.getZ(i), pos.getX(i)), i * 3);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
};
const low = (y0, y1, c) => (y) => { const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); return c.map(v => v + (1 - v) * t); };

// a wheel: a fat tyre and a plain hub disc, each a mesh of its own (the tyre a disc on its side: the suspension finds it)
const wheel = (parent, key, R, width, x, z, seg = 16) => {
  place(parent, shared(key + 'tyre', () => new THREE.CylinderGeometry(R, R, width, seg).rotateZ(Math.PI / 2)), TYRE, x, R, z);
  place(parent, shared(key + 'hub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, width + 0.02, Math.round(seg * 0.75)).rotateZ(Math.PI / 2)), HUB, x, R, z);
};

// ---- the small canvas textures: drawn once, shared ------------------------------------------------------------------
const textures = new Map();
const texture = (key, w, h, draw, repeat = false) => {
  if (!textures.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    if (repeat) map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.userData.shared = true;
    textures.set(key, map);
  }
  return textures.get(key);
};
const random = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// road dust thrown up along the lower body and the fenders: a soft-edged decal (density thickest at the foot, thinning
// upward into flecks, every edge fading to nothing). colours: [stain, fleck, dark fleck]
const dust = (key, [stain, fleck, darkFleck]) => texture('dust-' + key, 128, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const rnd = random(61);
  const dot = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rnd() * 3, 0, Math.PI * 2); ctx.fill(); };
  for (let i = 0; i < w * h / 2.2; i++) {
    const fx = rnd(), fy = rnd(); // fy 1 is the foot
    const k = Math.min(1, 1.5 * fy ** 1.9) * (0.65 + 0.35 * Math.sin(fx * 13 + 1) ** 2) * Math.min(1, Math.min(fx, 1 - fx) / 0.16);
    if (rnd() > k) continue;
    const x = fx * w, y = fy * h;
    ctx.fillStyle = stain; if (k > 0.3) dot(x, y, 1.5 + k * 3.5, 1 + k * 2.2);
    ctx.fillStyle = rnd() < 0.4 ? darkFleck : fleck; dot(x, y, 0.5 + k * 1.3, 0.4 + k * 0.9);
  }
});
// a race number in a white roundel, a little worn
const roundel = (n) => texture('roundel-' + n, 64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 29, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold ' + (n.length > 1 ? 34 : 42) + 'px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, w / 2, h / 2 + 2);
  const rnd = random(5);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = 'rgba(244,241,232,0.55)';
    ctx.beginPath(); ctx.ellipse(10 + rnd() * 44, 10 + rnd() * 44, 0.8 + rnd() * 1.6, 0.6 + rnd(), rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
});
// a tube (roll-cage bar, shock body) from point a to point b, open-ended
const tube = (a, b, r, seg = 8) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
  const geo = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  return geo.translate(m.x, m.y, m.z);
};
// a half-shell fender over a wheel: a half cylinder (axis across the car) of radius r, `w` wide, centred at x, y, z
const fender = (x, y, z, r, w) => new THREE.CylinderGeometry(r, r, w, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.88, 1.2).translate(x, y, z); // (flattened and lengthened, a wing over the wheel, not a barrel)
const SHOCK = keep(lambert(0xffcf1a)), STEEL = keep(lambert(0x5a5e66));

export const IDEA_MODELS_BATCH_D5 = {
  // ---- the Trophy Truck (a Baja desert racing truck) -----------------------------------------------------------------
  // A low fibreglass body, a long flat nose that rises to a short steep screen, a small cab under a roll cage with a
  // roof light bar, and a sloping tail deck with the spare standing on it. Huge half-shell fenders over tall tyres (the
  // tyres wider than the body), yellow shock stubs standing up out of the bonnet and the deck, an open dark nose with
  // two lamps. A race number in a roundel on each door, road dust along the sills and fenders.
  trophytruck: (car) => {
    const group = new THREE.Group();
    const R = 0.56, TW = 0.38, AF = 1.55, AR = -1.45, WX = 0.96;
    const BEV = 0.05, ACROSS = 0.08, BW = 1.42, HALF = BW / 2;
    const NOSE = 2.7, TAILZ = -2.7;
    const k = 'tt';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true, side: THREE.DoubleSide });
    const TAPER = [1.1, 1.82, 0.18];
    const WSF = [0.95, 1.18], WST = [0.25, 1.78];
    const outline = [
      [NOSE, 0.55], [NOSE, 0.9], [2.45, 1.0], [0.95, 1.18], WST, [-0.55, 1.82], [-1.0, 1.55], [-1.5, 1.24], [-2.55, 1.1], [TAILZ, 1.0], [TAILZ, 0.55],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      ...[-1, 1].flatMap(s => [AF, AR].map(z => fender(s * WX, R, z, R + 0.12, 0.5))),
    ]), low(0.45, 1.1, [0.6, 0.53, 0.45]))), paint);
    // glass: the raked screen, a small window a side, the rear window
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.28), 1.28], [zWS(1.72), 1.72], gx(1.28) - 0.1, gx(1.72) - 0.1, BEV + LIFT),
      ...sideGlass([[[0.69, 1.3], [-1.29, 1.3], [-0.69, 1.66], [0.27, 1.66]]], HALF, TAPER, LIFT),
      slopeGlass([-0.913, 1.6], [-1.243, 1.4], gx(1.6) - 0.14, gx(1.4) - 0.12, BEV + LIFT),
    ]);
    // the roll cage (dark steel tube, 8-sided) and its roof light bar
    parts(group, k + 'cage', TRIM, () => [
      ...[-1, 1].flatMap(s => [
        tube([s * 0.52, 1.89, 0.2], [s * 0.6, 1.2, 1.0], 0.035),   // A-pillar bar, down to the cowl
        tube([s * 0.52, 1.89, 0.2], [s * 0.52, 1.89, -0.6], 0.035), // roof side bar
        tube([s * 0.52, 1.89, -0.6], [s * 0.5, 1.24, -1.5], 0.035), // rear stay down to the deck
        tube([s * 0.75, 1.27, 0.75], [s * 0.75, 1.27, -0.95], 0.03), // door bar along the flank
      ]),
      tube([-0.52, 1.89, 0.2], [0.52, 1.89, 0.2], 0.035), tube([-0.52, 1.89, -0.6], [0.52, 1.89, -0.6], 0.035),
      bx(0.96, 0.08, 0.1, 0, 1.97, 0.24),
    ]);
    parts(group, k + 'barlamp', LAMP, () => [-1.5, -0.5, 0.5, 1.5].map(i => dsc(0.05, 0.03, i * 0.2, 1.97, 0.3, 0, 10)));
    // the nose: an open dark grille mouth and two lamps, a steel skid bar, the tail panel's skid
    parts(group, k + 'black', TRIM, () => [
      bx(0.86, 0.2, 0.04, 0, 0.74, FZ), bx(1.2, 0.1, 0.16, 0, 0.5, FZ + 0.02), bx(1.1, 0.1, 0.14, 0, 0.5, BZ - 0.02),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.1, 0.03, s * 0.52, 0.8, FZ + 0.01, 0, 14)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.24, 0.1, 0.03, s * 0.5, 0.88, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.03, s * 0.28, 0.62, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.24, 0.07, 0.03, s * 0.5, 0.72, BZ - 0.006)),
    ]);
    // shock stubs standing out of the bonnet and the tail deck (a dark body with a bright yellow spring round it)
    parts(group, k + 'shockrod', STEEL, () => [-1, 1].flatMap(s => [
      tube([s * 0.6, 1.0, AF], [s * 0.54, 1.56, AF], 0.04, 8),
      tube([s * 0.6, 1.0, AR], [s * 0.54, 1.58, AR], 0.04, 8),
    ]));
    parts(group, k + 'shockspring', SHOCK, () => [-1, 1].flatMap(s => [
      tube([s * 0.578, 1.1, AF], [s * 0.553, 1.4, AF], 0.085, 8),
      tube([s * 0.573, 1.2, AR], [s * 0.55, 1.44, AR], 0.085, 8),
    ]));
    // the spare on the tail deck, standing: a tyre and a hub, partly sunk in the deck
    place(group, shared(k + 'spare', () => new THREE.CylinderGeometry(0.44, 0.44, 0.3, 14).rotateX(Math.PI / 2)), TYRE, 0, 1.56, -1.38);
    place(group, shared(k + 'sparehub', () => new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10).rotateX(Math.PI / 2)), HUB, 0, 1.56, -1.38);
    // race numbers on the doors, dust low on both flanks (mirrored), kept clear of the body's faces by a few mm
    const X = HALF + 0.008;
    const numbered = new THREE.MeshLambertMaterial({ map: roundel('14'), transparent: true, depthWrite: false });
    place(group, shared(k + 'num', () => merge([-1, 1].map(s => decal(0.42, 0.42, s * X, 0.9, 0.0, s > 0 ? 'x' : '-x')))), numbered).renderOrder = 1;
    const dirty = new THREE.MeshLambertMaterial({ map: dust('sand', ['rgba(150,112,64,0.34)', 'rgba(170,130,78,0.85)', 'rgba(104,74,42,0.9)']), transparent: true, depthWrite: false });
    place(group, shared(k + 'dust', () => merge([-1, 1].map(s => decal(4.0, 0.46, s * (X + 0.002), 0.72, 0.0, s > 0 ? 'x' : '-x')))), dirty).renderOrder = 1;
    // the wheels: tall and wide
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Armoured Limo (a presidential-style armoured limousine) ---------------------------------------------------
  // A long black-tie saloon built like a vault: thick slab flanks, a raised flat roof, small deep windows (four a
  // side) between broad pillars, a tall upright chrome grille beside stacked lamps, steel bumpers and sills, and big
  // run-flat wheels with plain hubs standing out of the slab sides (no wheel wells cut). Polished paint, darker low down, road grime on the lower flanks.
  armouredlimo: (car) => {
    const group = new THREE.Group();
    const R = 0.46, TW = 0.34, AF = 1.95, AR = -1.75, WX = car.hw - TW / 2;
    const BEV = 0.06, ACROSS = 0.1, BW = car.hw * 2 - 0.14, HALF = BW / 2; // (a plain slab body; the tyres sit against its sides and stand out of them)
    const NOSE = 3.0, TAILZ = -3.0, AY = 0.3, GAP = 0.5;
    const k = 'al';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [1.12, 1.7, 0.12];
    const WSF = [1.6, 1.12], WST = [1.0, 1.66];
    const outline = [
      [NOSE, AY], [NOSE, 0.82], ...curve([NOSE, 0.82], [NOSE, 0.96], [NOSE - 0.04, 1.02], [NOSE - 0.2, 1.06], 3),
      [1.8, 1.1], WSF, WST, [-2.3, 1.7], [-2.65, 1.3], [-2.9, 1.22],
      [TAILZ, 1.2], [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS)]),
      low(0.3, 1.0, [0.6, 0.6, 0.64]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.24), 1.24], [zWS(1.6), 1.6], gx(1.24) - 0.18, gx(1.6) - 0.18, BEV + LIFT),
      ...sideGlass([
        [[1.1, 1.3], [0.4, 1.3], [0.4, 1.58], [1.0, 1.58]],
        [[0.2, 1.3], [-0.55, 1.3], [-0.55, 1.58], [0.2, 1.58]],
        [[-0.75, 1.3], [-1.5, 1.3], [-1.5, 1.58], [-0.75, 1.58]],
        [[-1.7, 1.3], [-2.1, 1.3], [-2.1, 1.58], [-1.7, 1.58]],
      ], HALF, TAPER, LIFT),
      slopeGlass([-2.3875, 1.6], [-2.5975, 1.36], gx(1.6) - 0.3, gx(1.36) - 0.3, BEV + LIFT),
    ]);
    // steel: bumpers (deep) and sills between the arches; chrome: the grille's frame and bars
    parts(group, k + 'steel', STEEL, () => [
      bx(BW + 0.1, 0.24, 0.2, 0, 0.44, FZ + 0.03), bx(BW + 0.1, 0.24, 0.2, 0, 0.44, BZ - 0.03),
      ...[-1, 1].map(s => bx(0.1, 0.16, AF - AR - 2 * GAP + 0.2, s * HALF, 0.4, (AF + AR) / 2)),
    ]);
    parts(group, k + 'black', TRIM, () => [bx(0.9, 0.38, 0.03, 0, 0.7, FZ)]);
    parts(group, k + 'chrome', CHROME, () => [
      bx(0.96, 0.05, 0.05, 0, 0.9, FZ + 0.01), bx(0.96, 0.05, 0.05, 0, 0.5, FZ + 0.01),
      ...[-1, 1].map(s => bx(0.05, 0.4, 0.05, s * 0.46, 0.7, FZ + 0.01)),
      ...[-3, -2, -1, 0, 1, 2, 3].map(i => bx(0.03, 0.34, 0.03, i * 0.12, 0.7, FZ + 0.02)),
    ]);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].flatMap(s => [0.88, 0.7].map(y => dsc(0.09, 0.03, s * 0.74, y, FZ + 0.005, 0, 14))));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.14, 0.36, 0.03, s * 0.8, 0.85, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.12, 0.08, 0.03, s * 0.74, 0.54, FZ + 0.004)),
      ...[-1, 1].map(s => bx(0.14, 0.08, 0.03, s * 0.8, 0.6, BZ - 0.006)),
    ]);
    // road grime low on both flanks
    const X = HALF + 0.008;
    const grimy = new THREE.MeshLambertMaterial({ map: dust('grime', ['rgba(60,56,52,0.3)', 'rgba(80,74,68,0.8)', 'rgba(30,28,26,0.9)']), transparent: true, depthWrite: false });
    place(group, shared(k + 'grime', () => merge([-1, 1].map(s => decal(5.6, 0.4, s * X, 0.55, 0.0, s > 0 ? 'x' : '-x')))), grimy).renderOrder = 1;
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
