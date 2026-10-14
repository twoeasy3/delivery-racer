// ---- car ideas' models, batch D3: the Half-Track and the Sprint Hatch ---------------------------------------------
// Two vehicles drawn as ideas (ideasBatchD3.js): a civilian utility half-track (wheels at the front, tracks at the back,
// a flat tall bonnet, a closed cab, a canvas-tilted bed; no weapons, no figures; after the M3 / Kegresse type) and a small
// rear-drive sports hatchback (after the Toyota Sprinter Trueno / Corolla Levin three-door hatch, AE86 era).
// Built as the approved Commuter and Junker are (render/modelsOrig1b.js, modelsOrig3.js; helpers kept here as copies so the
// files do not import each other): each body an extrusion of its side view with the edges rounded, flat dark glass laid a
// few mm proud, parts that share a material and never move merged into one mesh, paint shaded darker low down (vertex
// colours), plain chunky wheels (a tyre and a plain hub disc, meshes of their own, found by the showroom suspension).
// Textures drawn in code, soft-edged: a canvas tilt (Half-Track), a track chain, a racing roundel (Sprint Hatch).
// No image files, no panel lines.
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void, userData.livery (evil) => void. render/ideaModels.js spreads IDEA_MODELS_BATCH_D3.
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

// a wheel arch's flare: a band round the arch (radii ri to ro, centred at z, y: its feet at y), `t` thick, its outer face
// at x 0 and its inner at -t (move it out to the flank)
const flare = (z, y, ri, ro, t) => {
  const shape = new THREE.Shape();
  shape.moveTo(z + ro, y);
  shape.absarc(z, y, ro, 0, Math.PI, false);
  shape.lineTo(z - ri, y);
  shape.absarc(z, y, ri, Math.PI, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 5 }).rotateY(-Math.PI / 2);
};
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

// a racing number in a white roundel, a little worn (64 x 64)
const roundel = (n) => texture('d3-roundel-' + n, 64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 29, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 42px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, w / 2, h / 2 + 2);
  const rnd = random(5);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = 'rgba(244,241,232,0.55)';
    ctx.beginPath(); ctx.ellipse(10 + rnd() * 44, 10 + rnd() * 44, 0.8 + rnd() * 1.6, 0.6 + rnd(), rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
});
const BRAKE = basic(0xc4101c);
// canvas (a tarpaulin), 128 x 128, to repeat: a khaki ground with a faint weave and soft darker mottling and creases (no hard
// edges, no lines that fake a join)
const canvas = () => texture('d3-canvas', 128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#b3a57c';
  ctx.fillRect(0, 0, w, h);
  const rnd = random(19);
  for (let y = 0; y < h; y += 4) { ctx.fillStyle = 'rgba(80,70,45,0.07)'; ctx.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 4) { ctx.fillStyle = 'rgba(80,70,45,0.06)'; ctx.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 16; i++) {
    const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 22, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.6;
    g.addColorStop(0, dark ? 'rgba(70,60,38,0.22)' : 'rgba(235,225,190,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}, true);
// a track chain, 64 x 16, along u: two cleats a repeat, dark rubber with lighter raised blocks, soft-edged
const chainTex = () => texture('d3-chain', 64, 16, (ctx, w, h) => {
  ctx.fillStyle = '#222220';
  ctx.fillRect(0, 0, w, h);
  for (const x0 of [3, 35]) {
    const g = ctx.createLinearGradient(x0, 0, x0 + 24, 0);
    g.addColorStop(0, 'rgba(96,94,86,0)'); g.addColorStop(0.2, 'rgba(96,94,86,0.9)'); g.addColorStop(0.8, 'rgba(96,94,86,0.9)'); g.addColorStop(1, 'rgba(96,94,86,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, 0, 24, h);
  }
}, true);

export const IDEA_MODELS_BATCH_D3 = {
  // ---- the Sprint Hatch (after the Honda CR-X, 1984) ---------------------------------------------------------------
  // Short, light and wedge-shaped: a low sloping nose with slim lamps, a raked windscreen, a short roof and one long glass
  // hatch that slopes down to a chopped (Kamm) tail with a small lip spoiler. A plain body with a flat underside: the wide
  // chunky wheels stand out against its sides (a drift stance), no wheel wells cut. Black bumpers, a wide tail lamp band, a
  // racing roundel on each door.
  sprinthatch: (car) => {
    const group = new THREE.Group();
    const R = 0.31, TW = 0.24, AF = 1.12, AR = -1.0, WX = car.hw - TW / 2;
    const BEV = 0.05, ACROSS = 0.09, BW = 1.5, HALF = BW / 2;
    const NOSE = 1.86, TAILZ = -1.84, AY = 0.3, BELT = 0.9, ROOF = 1.26;
    const k = 'sh';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.14];
    const WSF = [0.66, 0.82], WST = [-0.06, ROOF];
    const outline = [
      [NOSE, AY], [NOSE, 0.52], ...curve([NOSE, 0.52], [NOSE, 0.6], [NOSE - 0.1, 0.64], [NOSE - 0.3, 0.68], 3),
      WSF, WST,
      ...curve(WST, [-0.12, ROOF + 0.01], [-0.18, ROOF + 0.01], [-0.28, ROOF], 3),
      [-0.62, ROOF], ...curve([-0.62, ROOF], [-1.0, ROOF - 0.1], [-1.4, 1.02], [-1.72, 0.97], 5),
      [TAILZ + 0.06, 0.95], ...curve([TAILZ + 0.06, 0.95], [TAILZ, 0.95], [TAILZ, 0.9], [TAILZ, 0.82], 3),
      [TAILZ, AY],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      bx(1.0, 0.04, 0.18, 0, 0.99, BZ + 0.03, -0.2), // the lip spoiler on the tail's top
      // a flat flare band round each wheel (no well cut: it stands on the flank, the tyre outside it)
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, R, R + 0.03, R + 0.1, 0.06).translate(s > 0 ? HALF + 0.06 : -HALF + 0.0, 0, 0))),
    ]), low(0.28, 0.85, [0.6, 0.56, 0.54]))), paint);
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(0.94), 0.94], [zWS(1.23), 1.23], gx(0.94) - 0.1, gx(1.23) - 0.1, BEV + LIFT),
      slopeGlass([-0.72, 1.2], [-1.6, 1.0], gx(1.2) - 0.1, gx(1.0) - 0.1, BEV + LIFT),
      ...sideGlass([
        [[zWS(0.94) - 0.06, 0.94], [-0.34, 0.94], [-0.34, 1.23], [zWS(1.23) - 0.04, 1.23]],
        [[-0.5, 0.94], [-1.0, 0.94], [-1.0, 1.07], [-0.72, 1.21], [-0.5, 1.21]],
      ], HALF, TAPER, LIFT),
    ]);
    parts(group, k + 'black', TRIM, () => [
      bx(0.9, 0.09, 0.03, 0, 0.47, FZ - 0.005),          // the slim grille
      bx(1.54, 0.1, 0.12, 0, 0.36, FZ + 0.02),           // the front bumper
      ...[-1, 1].map(s => bx(0.36, 0.14, 0.03, s * 0.53, 0.5, FZ - 0.02)), // the lamps' dark bezels
      bx(1.2, 0.05, 0.2, 0, 0.28, FZ + 0.06),            // the air dam's lip
      bx(1.1, 0.05, 0.16, 0, 0.3, BZ - 0.04),            // the rear diffuser lip
      bx(1.56, 0.1, 0.1, 0, 0.44, BZ - 0.01),            // the rear bumper
      ...[-1, 1].map(s => bx(0.1, 0.07, 0.14, s * (gx(0.93) + 0.02), 0.92, 0.42)), // the mirrors, on the door tops by the screen's foot
    ]);
    // lamps: slim square headlamps either side of the grille, amber under their outer ends; a tail lamp band each side
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.3, 0.1, 0.04, s * 0.53, 0.5, FZ - 0.005)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.4, 0.13, 0.04, s * 0.5, 0.74, BZ + 0.005)));
    parts(group, k + 'brake', BRAKE, () => [-1, 1].map(s => bx(0.15, 0.09, 0.04, s * 0.27, 0.74, BZ)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.15, 0.05, 0.04, s * 0.62, 0.42, FZ - 0.005)),
      ...[-1, 1].map(s => bx(0.12, 0.05, 0.04, s * 0.65, 0.6, BZ + 0.005)),
    ]);
    // a racing roundel on each door
    const num = new THREE.MeshLambertMaterial({ map: roundel('8'), transparent: true, depthWrite: false });
    const X = HALF + 0.006;
    const marks = place(group, shared(k + 'marks', () => merge([
      decal(0.3, 0.3, X, 0.62, 0.0, 'x'), decal(0.3, 0.3, -X, 0.62, 0.0, '-x'),
    ])), num);
    marks.renderOrder = 1;
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },

  // ---- the Half-Track (a civilian utility half-track, after the Kegresse / M3 type; no weapons, no figures) -----------
  // A tall flat bonnet on a grille face with round lamps, a front roller on a bumper bar, a closed upright cab and a bed
  // under a canvas tilt. Big chunky wheels at the front, standing against the body's sides with a flat flare band over each
  // (no well cut); a track at each side at the back (a chain belt on a steel plate, with a drive sprocket, three road wheels
  // and an idler) under the high bed. The canvas is a drawn picture, soft-edged mottling and weave.
  halftrack: (car) => {
    const group = new THREE.Group();
    const R = 0.52, TW = 0.3, AF = 2.2, HALF = 0.9, BW = HALF * 2, WX = 0.86;
    const BEV = 0.06, ACROSS = 0.1;
    const NOSE = 3.14, TAILZ = -2.96, BOT = 0.62, BED = 1.0, DECK = 1.62, ROOF = 2.15, HOOD = 1.5;
    const k = 'ht';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [DECK, ROOF, 0.06];
    const WSF = [1.28, HOOD], WST = [1.0, 2.1];
    const outline = [
      [NOSE, BOT], [NOSE, 1.34], ...curve([NOSE, 1.34], [NOSE, 1.46], [NOSE - 0.04, HOOD], [NOSE - 0.2, HOOD], 3),
      WSF, WST, ...curve(WST, [0.98, ROOF], [0.95, ROOF], [0.86, ROOF], 3),
      [-0.2, ROOF], ...curve([-0.2, ROOF], [-0.3, ROOF], [-0.3, ROOF - 0.05], [-0.3, ROOF - 0.15], 2),
      [-0.3, DECK], [TAILZ + 0.08, DECK], ...curve([TAILZ + 0.08, DECK], [TAILZ, DECK], [TAILZ, DECK - 0.04], [TAILZ, DECK - 0.12], 2),
      [TAILZ, BED], [-0.3, BED], [-0.3, BOT],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV;
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 1, ACROSS),
      // the grille's slots, upright bars in the paint standing in the dark grille panel
      ...[-2, -1, 0, 1, 2].map(i => bx(0.06, 0.5, 0.04, i * 0.16, 1.0, FZ + 0.012)),
      // a flat flare band over each front wheel (it stands on the flank; the tyre comes through its hole)
      ...[-1, 1].map(s => flare(AF, R, R + 0.03, R + 0.13, 0.08).translate(s > 0 ? HALF + 0.07 : -HALF + 0.01, 0, 0)),
    ]), low(0.5, 1.5, [0.62, 0.58, 0.5]))), paint);
    // the canvas tilt over the bed: a half-round tunnel along it, the canvas picture on it
    const canvasMap = canvas();
    canvasMap.repeat.set(3, 3); // (the tilt's picture is laid at world scale: three repeats a metre keeps the weave fine)
    const canvasMat = new THREE.MeshLambertMaterial({ map: canvasMap, side: THREE.DoubleSide });
    place(group, shared(k + 'tilt', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.85, DECK - 0.05); shape.lineTo(0.85, DECK - 0.05); shape.lineTo(0.85, DECK + 0.02);
      shape.absellipse(0, DECK + 0.02, 0.85, 0.8, 0, Math.PI, false);
      shape.lineTo(-0.85, DECK - 0.05);
      const geo = plain(new THREE.ExtrudeGeometry(shape, { depth: 2.5, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, TAILZ + 0.02));
      return geo;
    }), canvasMat);
    // the glass: the windscreen and a side window each side
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.62), 1.62], [zWS(2.04), 2.04], gx(1.62) - 0.12, gx(2.04) - 0.12, BEV + LIFT),
      ...sideGlass([
        [[zWS(1.68) - 0.06, 1.68], [-0.2, 1.68], [-0.2, 2.06], [zWS(2.06) - 0.04, 2.06]],
      ], HALF, TAPER, LIFT),
    ]);
    // dark parts: the grille panel, the bumper bar and the roller's brackets, the underbody (so there is no void under
    // the bonnet, cab or bed)
    parts(group, k + 'black', TRIM, () => [
      bx(0.96, 0.62, 0.03, 0, 1.0, FZ),
      bx(1.96, 0.16, 0.16, 0, 0.76, FZ + 0.06),
      ...[-1, 1].map(s => bx(0.1, 0.1, 0.26, s * 0.78, 0.77, FZ + 0.16)),
      bx(1.4, 0.34, 3.2, 0, 0.45, 1.5),
      bx(1.1, 0.56, 2.4, 0, 0.72, -1.7),
    ]);
    // the roller: a steel drum across the front on the brackets
    place(group, shared(k + 'roller', () => new THREE.CylinderGeometry(0.13, 0.13, 1.7, 10).rotateZ(Math.PI / 2)), CHROME, 0, 0.77, FZ + 0.2);
    // lamps: round headlamps in chrome rims either side of the grille, ambers under them; tail lamps and ambers on the bed
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.18, 0.03, s * 0.68, 1.22, FZ + 0.01, 0, 14)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.14, 0.03, s * 0.68, 1.22, FZ + 0.02, 0, 14)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.16, 0.03, s * 0.76, 1.32, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.16, 0.07, 0.03, s * 0.72, 0.98, FZ + 0.012)),
      ...[-1, 1].map(s => bx(0.16, 0.07, 0.03, s * 0.76, 1.15, BZ - 0.006)),
    ]);
    // the front wheels: tall and chunky, against the body's sides
    for (const s of [-1, 1]) wheel(group, k, R, TW, s * WX, AF);
    // the tracks, a belt on a plate, with their wheels
    const ZA = -2.3, ZB = -0.97, TR = 0.42, TI = 0.33, TX = 0.78, BELTW = 0.36;
    const stad = (r, path) => {
      path.moveTo(ZA, TR - r); path.lineTo(ZB, TR - r);
      path.absarc(ZB, TR, r, -Math.PI / 2, Math.PI / 2, false);
      path.lineTo(ZA, TR + r);
      path.absarc(ZA, TR, r, Math.PI / 2, Math.PI * 1.5, false);
      return path;
    };
    const L = ZB - ZA, C = 2 * L + 2 * Math.PI * TR;
    const beltU = (z, y) => {
      let t;
      if (z > ZB) t = L + (Math.PI / 2 - Math.atan2(y - TR, z - ZB)) * TR;
      else if (z < ZA) { let a = Math.atan2(y - TR, z - ZA); if (a < 0) a += 2 * Math.PI; t = 2 * L + Math.PI * TR + (1.5 * Math.PI - a) * TR; }
      else t = y > TR ? z - ZA : L + Math.PI * TR + (ZB - z);
      return (((t % C) + C) % C) / 0.32;
    };
    const chain = shared(k + 'belt', () => {
      const shape = stad(TR, new THREE.Shape());
      shape.holes.push(stad(TI, new THREE.Path()));
      const geo = plain(new THREE.ExtrudeGeometry(shape, { depth: BELTW, bevelEnabled: false, curveSegments: 10 }).rotateY(-Math.PI / 2).translate(BELTW / 2, 0, 0));
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, beltU(pos.getZ(i), pos.getY(i)), 0.5);
      return geo;
    });
    const plate = shared(k + 'plate', () => plain(new THREE.ExtrudeGeometry(stad(TI + 0.01, new THREE.Shape()), { depth: BELTW - 0.06, bevelEnabled: false, curveSegments: 8 }).rotateY(-Math.PI / 2).translate((BELTW - 0.06) / 2, 0, 0)));
    const beltMat = new THREE.MeshLambertMaterial({ map: chainTex() });
    const roadWheel = shared(k + 'road', () => new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10).rotateZ(Math.PI / 2));
    const bigWheel = shared(k + 'sprocket', () => new THREE.CylinderGeometry(0.27, 0.27, 0.06, 12).rotateZ(Math.PI / 2));
    for (const s of [-1, 1]) {
      place(group, chain, beltMat, s * TX, 0, 0);
      place(group, plate, TRIM, s * TX, 0, 0);
      const xo = s * (TX + BELTW / 2 + 0.01);
      place(group, bigWheel, HUB, xo, TR, ZB);
      place(group, bigWheel, HUB, xo, TR, ZA);
      for (const z of [-1.3, -1.63, -1.96]) place(group, roadWheel, HUB, xo, 0.2, z);
    }
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
};
