// ---- car ideas' models, the top-up batch C: the Pocket 4x4, the Dodgem and the Ice Resurfacer ----------------------
// Three vehicles drawn as ideas (ideasTopupC.js): a tiny box of an off-roader on big wheels (a Suzuki Jimny SJ410), a
// fairground bumper car (no driver) and a rink's ice resurfacer (a Zamboni Model 500). Built as the approved
// Commuter and Junker are (render/modelsOrig1b.js, modelsOrig3.js; the helpers kept here as copies so the files do not
// import each other): each body an extrusion of its side view (or, the Dodgem's, of its plan) with its edges rounded,
// flat dark glass laid a few mm proud, parts that share a material and never move merged into one mesh, the paint
// shaded darker low down (vertex colours), plain chunky wheels (a dark tyre, a plain hub disc: meshes of their own, so
// the showroom's suspension finds them). Character from small textures DRAWN IN CODE, soft-edged and part
// see-through (mud and grime decals, scuffed rubber, worn paint, a racing number): no image files, no panel lines.
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the paint),
// userData.animate (seconds) => void, userData.livery (evil) => void and (the Dodgem's ring, the Resurfacer's stripe)
// userData.stripe (hex). render/ideaModels.js spreads IDEA_MODELS_TOPUP_C into IDEA_MODELS. State-free.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const keep = (m) => { m.userData.shared = true; return m; };
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const basic = (color) => keep(new THREE.MeshBasicMaterial({ color }));
const TYRE = keep(lambert(0x161616)), HUB = keep(lambert(0xb4b8be)), TRIM = keep(lambert(0x24262a)), CHROME = keep(lambert(0xc8cbd0));
const GLASS = keep(new THREE.MeshLambertMaterial({ color: 0x1c2330, side: THREE.DoubleSide }));
const LAMP = basic(0xfff3c4), TAIL = basic(0xff2a2a), AMBER = basic(0xffa31a), SPARK = basic(0xbfe6ff);

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
const blob = (sx, sy, sz, x, y, z, seg = [12, 7]) => new THREE.SphereGeometry(1, seg[0], seg[1]).scale(sx, sy, sz).translate(x, y, z);
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
// mud (or grime) thrown up off the wheels: a picture of two cells, MUD_CELLS, each a decal's: a band along the sill,
// thick at its foot and thinning upward into flecks, and a spray round a wheel arch (the arch's hole clear). Every
// edge fades out (no hard cut-off): density falls to nothing before the cell's sides and top. colours: [stain, fleck,
// dark fleck, light fleck]
const MUD_W = 128, MUD_H = 64;
const MUD_CELLS = {
  sill: [[0, 0, 72, 64], (fx, fy) => Math.min(1, 1.4 * fy ** 1.8) * (0.6 + 0.4 * Math.sin(fx * 11 + 2) ** 2)],
  // (the arch: its hole a circle of radius 0.38 of the decal's width centred on its bottom edge... see the 4x4's decal)
  arch: [[72, 0, 56, 64], (fx, fy) => {
    const d = Math.hypot((fx - 0.5) / 0.5, (fy - 1) / 0.86);
    const a = Math.PI - Math.atan2(1 - fy, fx - 0.5); // (u 1 is the arch's rear foot, both flanks: a near pi there, 0 at the front foot; thicker behind, thrown off the tread)
    return d < 0.82 ? 0 : Math.exp(-(((d - 0.9) / (0.1 + 0.14 * a / Math.PI)) ** 2)) * (0.3 + 0.35 * a / Math.PI + 0.15 * Math.sin(a * 7) ** 2);
  }],
};
const mudCell = (name, flip = false) => {
  const [x, y, w, h] = MUD_CELLS[name][0], u = [x / MUD_W, (x + w) / MUD_W];
  return [flip ? [u[1], u[0]] : u, [1 - (y + h) / MUD_H, 1 - y / MUD_H]];
};
const mud = (key, [stain, fleck, darkFleck, lightFleck]) => texture('mud-' + key, MUD_W, MUD_H, (ctx) => {
  ctx.clearRect(0, 0, MUD_W, MUD_H);
  const rnd = random(23);
  const dot = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rnd() * 3, 0, Math.PI * 2); ctx.fill(); };
  for (const [[x0, y0, w, h], weight] of Object.values(MUD_CELLS)) {
    const fade = (fx, fy) => Math.min(1, Math.min(fx, 1 - fx, fy) / 0.18);
    const spots = [];
    for (let i = 0; i < w * h / 3; i++) {
      const fx = rnd(), fy = rnd(), k = Math.max(0, Math.min(1, weight(fx, fy))) * fade(fx, fy);
      if (rnd() < k) spots.push([x0 + fx * w, y0 + fy * h, k]);
      else if (rnd() < k * 0.3) spots.push([x0 + fx * w, y0 + fy * h, 0.05]);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = stain;
    for (const [x, y, k] of spots) if (k > 0.25) dot(x, y, 1.5 + k * 4, 1 + k * 2.5);
    for (const [colour, min, size] of [[fleck, 0, 1], [darkFleck, 0.45, 0.7], [lightFleck, 0.2, 0.45]]) {
      ctx.fillStyle = colour;
      for (const [x, y, k] of spots) if (k >= min && rnd() < 0.75) { const s = (0.5 + k * 2.4) * size; dot(x + (rnd() - 0.5) * s, y + (rnd() - 0.5) * s, s * 0.6, s * 0.45); }
    }
    ctx.restore();
  }
});

// rubber scuffed by a thousand knocks (the Dodgem's ring), to repeat over it: a white ground (the ring's colour shows
// through as it is) with soft grey scrapes and black skid streaks, every mark soft-edged
const scuffs = () => texture('scuffs', 64, 64, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rnd = random(31);
  for (let i = 0; i < 10; i++) { // grey bruises, soft
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 9, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(70,70,70,0.22)'); g.addColorStop(1, 'rgba(70,70,70,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) { // skid streaks, mostly along (u)
    const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 16, a = (rnd() - 0.5) * 0.5;
    ctx.strokeStyle = 'rgba(20,20,20,' + (0.12 + rnd() * 0.22).toFixed(2) + ')'; ctx.lineWidth = 0.8 + rnd() * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}, true);
// fairground paint worn by hands and knocks, to repeat over the body: a white ground with soft darker rubs and fine
// scratches (a multiply over the paint)
const rubbed = () => texture('rubbed', 64, 64, (ctx, w, h) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rnd = random(47);
  for (let i = 0; i < 7; i++) {
    const x = rnd() * w, y = rnd() * h, r = 5 + rnd() * 10, g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(90,70,60,0.2)'); g.addColorStop(1, 'rgba(90,70,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 9; i++) {
    const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 8, a = rnd() * Math.PI;
    ctx.strokeStyle = 'rgba(60,50,45,0.28)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
}, true);
// a racing number in a white roundel (clear round it), a little worn
const roundel = (n) => texture('roundel-' + n, 64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 29, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold ' + (n.length > 1 ? 34 : 42) + 'px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(n, w / 2, h / 2 + 2);
  const rnd = random(5);
  for (let i = 0; i < 14; i++) { // worn: pale flecks out of it
    ctx.fillStyle = 'rgba(244,241,232,0.55)';
    ctx.beginPath(); ctx.ellipse(10 + rnd() * 44, 10 + rnd() * 44, 0.8 + rnd() * 1.6, 0.6 + rnd(), rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
});
// a rounded rectangle in plan (x across, the shape's y along the car), half sizes a, b, corner radius r
const roundRect = (a, b, r, path = new THREE.Shape()) => {
  path.moveTo(-a + r, -b);
  path.lineTo(a - r, -b); path.absarc(a - r, -b + r, r, -Math.PI / 2, 0, false);
  path.lineTo(a, b - r); path.absarc(a - r, b - r, r, 0, Math.PI / 2, false);
  path.lineTo(-a + r, b); path.absarc(-a + r, b - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-a, -b + r); path.absarc(-a + r, -b + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
};
// a solid of a plan shape, from y0 up, `depth` tall plus its rounded edges (`bevel`) above and below
const extrudePlan = (shape, depth, bevel, y0, segs = 2) => new THREE.ExtrudeGeometry(shape, {
  depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 3,
}).rotateX(-Math.PI / 2).translate(0, y0 + bevel, 0);

export const IDEA_MODELS_TOPUP_C = {
  // ---- the Pocket 4x4 (after the Suzuki Jimny SJ410, 1981) ----------------------------------------------------------
  // A little box on big wheels: a short flat bonnet, a near-upright windscreen, a flat roof, a short upright tail with
  // the spare wheel on its door (the road wheels' size). A flat face: a dark grille of upright slots in the paint
  // between two round lamps in chrome rims, indicators under them, a black bumper bar; shallow arches over tall chunky
  // tyres, black bumpers front and back. Mud thrown up along the sills and round the arches (a soft-edged decal), the
  // paint dusty and darker low down.
  pocket4x4: (car) => {
    const group = new THREE.Group();
    const R = 0.36, TW = 0.26, AF = 0.98, AR = -0.9, WX = car.hw - TW / 2;
    const BEV = 0.06, ACROSS = 0.1, BW = 1.36, HALF = BW / 2;
    const NOSE = 1.5, TAILZ = -1.36, AY = 0.46, ARC = 0.44, BELT = 1.04, ROOF = 1.64;
    const k = 'p4x4';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const TAPER = [BELT, ROOF, 0.07];
    // the windscreen's foot and top (side view), nearly upright
    const WSF = [0.64, BELT - 0.02], WST = [0.52, ROOF - 0.06];
    const outline = [
      [NOSE, AY], [NOSE, 0.92], ...curve([NOSE, 0.92], [NOSE, 0.97], [NOSE - 0.02, BELT - 0.04], [NOSE - 0.08, BELT - 0.03], 3),
      WSF, WST, ...curve(WST, [0.5, ROOF - 0.02], [0.47, ROOF], [0.42, ROOF], 3),
      [TAILZ + 0.08, ROOF], ...curve([TAILZ + 0.08, ROOF], [TAILZ + 0.02, ROOF], [TAILZ, ROOF - 0.02], [TAILZ, ROOF - 0.08], 3),
      [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC],
    ];
    const FZ = NOSE + BEV, BZ = TAILZ - BEV; // (the face and the tail's face)
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(outline, BW, BEV, TAPER, 2, ACROSS),
      // the grille's slots: upright bars in the paint, standing in the dark grille panel
      ...[-2, -1, 0, 1, 2].map(i => bx(0.05, 0.26, 0.04, i * 0.11, 0.8, FZ + 0.012)),
    ]), low(0.38, 0.9, [0.62, 0.56, 0.48]))), paint);
    // the glass: the windscreen, two windows a side, the back door's window over the spare wheel
    const LIFT = 0.006, gx = (y) => narrowAt(HALF, y, TAPER);
    const zWS = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zWS(1.1), 1.1], [zWS(1.54), 1.54], gx(1.1) - 0.13, gx(1.54) - 0.13, BEV + LIFT),
      ...sideGlass([
        [[zWS(1.12) - 0.12, 1.12], [-0.2, 1.12], [-0.2, 1.55], [zWS(1.55) - 0.1, 1.55]],
        [[-0.32, 1.12], [-1.24, 1.12], [-1.24, 1.55], [-0.32, 1.55]],
      ], HALF, TAPER, LIFT),
      panel([[-0.46, 1.38, BZ - LIFT], [0.46, 1.38, BZ - LIFT], [0.44, 1.56, BZ - LIFT], [-0.44, 1.56, BZ - LIFT]].reverse()),
    ]);
    // the face: the grille panel, the bumpers, the mirrors (dark)
    parts(group, k + 'black', TRIM, () => [
      bx(0.6, 0.3, 0.03, 0, 0.8, FZ),
      bx(1.48, 0.14, 0.16, 0, 0.5, FZ + 0.03), bx(1.44, 0.14, 0.14, 0, 0.5, BZ - 0.02),
      ...[-1, 1].map(s => bx(0.05, 0.11, 0.12, s * (HALF + 0.045), 1.12, 0.56)),
      // flares round the arches, a band standing out from the flank
      ...[-1, 1].flatMap(s => [AF, AR].map(z => flare(z, AY, ARC - BEV - 0.01, ARC - BEV + 0.08, 0.08).translate(s > 0 ? HALF + 0.07 : -HALF + 0.01, 0, 0))),
    ]);
    // the lamps: round headlamps in chrome rims either side of the grille, indicators under them; small square tail
    // lamps beside the spare wheel, ambers under them
    parts(group, k + 'rim', CHROME, () => [-1, 1].map(s => dsc(0.125, 0.03, s * 0.46, 0.8, FZ + 0.01, 0, 14)));
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.1, 0.03, s * 0.46, 0.8, FZ + 0.02, 0, 14)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.12, 0.12, 0.03, s * 0.52, 1.0, BZ - 0.006)));
    parts(group, k + 'amber', AMBER, () => [
      ...[-1, 1].map(s => bx(0.14, 0.05, 0.03, s * 0.46, 0.63, FZ + 0.002)),
      ...[-1, 1].map(s => bx(0.12, 0.06, 0.03, s * 0.52, 0.86, BZ - 0.006)),
    ]);
    // mud along the sills and round the arches (both flanks, mirrored), and low on the tail
    const muddy = new THREE.MeshLambertMaterial({ map: mud('earth', ['rgba(92,66,38,0.32)', 'rgba(104,76,44,0.85)', 'rgba(62,44,26,0.9)', 'rgba(170,140,100,0.6)']), transparent: true, depthWrite: false });
    const X = HALF + 0.006, AW = (ARC - BEV + 0.08) * 2 / 0.82, AH = AW / 1.72; // (the arch decal's size: its clear hole the arch's)
    const dirt = place(group, shared(k + 'mud', () => merge([-1, 1].flatMap(s => {
      const f = s > 0 ? 'x' : '-x', flip = s < 0;
      return [
        decal(AF - AR - 2 * (ARC - BEV) + 0.1, 0.42, s * X, 0.61, (AF + AR) / 2, f, ...mudCell('sill', flip)),
        ...[AF, AR].map(z => decal(AW, AH, s * (X + 0.004), AY + AH / 2, z, f, ...mudCell('arch', flip))), // (out past the sill's)
      ];
    }).concat([decal(1.1, 0.34, 0, 0.6, BZ - 0.006, '-z', ...mudCell('sill'))]))), muddy);
    dirt.renderOrder = 1;
    // the wheels: tall and chunky; the spare on the back door, the same size
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    place(group, shared(k + 'sparetyre', () => new THREE.CylinderGeometry(R, R, 0.2, 16).rotateX(Math.PI / 2)), TYRE, 0, 0.98, BZ - 0.09);
    place(group, shared(k + 'sparehub', () => new THREE.CylinderGeometry(R * 0.52, R * 0.52, 0.22, 12).rotateX(Math.PI / 2)), HUB, 0, 0.98, BZ - 0.09);
    group.userData = { body, animate: () => {}, livery: () => {} };
    return group;
  },
  // ---- the Dodgem (a fairground bumper car) ------------------------------------------------------------------------
  // A round, low tub with a fat rubber ring all the way round it (a contrast colour, scuffed), a rounded cowl over the
  // front with a number in a roundel on it, an open seat (no driver) under a high rounded back, a steering wheel, and a
  // tall pole rising from behind the seat to a contact shoe with a pale blue spark at its top. Tiny wheels hide under
  // the ring. The paint is worn (a soft multiply), darker low down.
  dodgem: (car) => {
    const group = new THREE.Group();
    const k = 'dodgem';
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true, map: rubbed() });
    const ring = new THREE.MeshLambertMaterial({ color: 0xf0c020, map: scuffs() });
    const number = new THREE.MeshLambertMaterial({ map: roundel('7'), transparent: true, depthWrite: false });
    // the hood's cowl (an ellipsoid: half sizes, centre) and the seat's back
    const HOOD = [0.46, 0.2, 0.38, 0, 0.52, 0.42], BACK = [0.6, 0.46, 0.3, 0, 0.52, -0.6];
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudePlan(roundRect(0.52, 0.86, 0.38), 0.3, 0.08, 0.12),       // the tub: plan 1.2 by 1.88 (its rounded edges in)
      blob(...HOOD, [12, 7]),
      blob(...BACK, [12, 7]),
    ]), low(0.12, 0.7, [0.6, 0.5, 0.5]))), paint);
    // the ring: round the tub's foot, standing 15 cm out from it, a fat rounded section
    place(group, shared(k + 'ring', () => {
      const outer = roundRect(0.7, 1.04, 0.5);
      outer.holes.push(roundRect(0.5, 0.84, 0.36, new THREE.Path()));
      return extrudePlan(outer, 0.12, 0.05, 0.1);
    }), ring);
    // the number, in a roundel on the cowl's top (a small grid laid onto the cowl's ellipsoid, a few mm out; the cowl is centred on x 0)
    const [hx, hy, hz, , cy, cz] = HOOD;
    const tag = place(group, shared(k + 'tag', () => {
      const geo = new THREE.PlaneGeometry(0.27, 0.27, 4, 4).rotateX(-Math.PI / 2), pos = geo.attributes.position, Z = 0.12;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i) + Z;
        pos.setXYZ(i, x, cy + hy * Math.sqrt(Math.max(0, 1 - (x / hx) ** 2 - (z / hz) ** 2)) + 0.006, cz + z);
      }
      geo.computeVertexNormals();
      return geo;
    }), number);
    tag.renderOrder = 1;
    // dark: the seat's cushion and pad, the floor's mat, the steering wheel on its column, the pole's sleeve and shoe
    const POLE = [0, 0.98, -0.66], TILT = 0.08, TOPY = POLE[1] + Math.cos(TILT), TOPZ = POLE[2] - Math.sin(TILT);
    parts(group, k + 'dark', TRIM, () => [
      bx(0.66, 0.1, 0.36, 0, 0.64, -0.2),
      bx(0.58, 0.3, 0.06, 0, 0.84, -0.41, -0.22),
      bx(0.84, 0.02, 0.5, 0, 0.592, 0.06),
      new THREE.TorusGeometry(0.12, 0.024, 4, 12).rotateX(-0.5).translate(0, 0.9, 0.16),
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6).rotateX(-0.5).translate(0, 0.78, 0.24),
      new THREE.CylinderGeometry(0.06, 0.07, 0.16, 10).translate(...POLE),
      bx(0.06, 0.04, 0.24, 0, TOPY + 0.01, TOPZ),
    ]);
    // the pole (steel), and the spark at its shoe
    parts(group, k + 'pole', CHROME, () => [new THREE.CylinderGeometry(0.034, 0.034, 1.0, 8).translate(0, 0.5, 0).rotateX(-TILT).translate(...POLE)]);
    parts(group, k + 'spark', SPARK, () => [new THREE.OctahedronGeometry(0.06, 0).scale(1, 0.7, 1).translate(0, TOPY + 0.07, TOPZ)]);
    // the lamps: two small round headlamps in the nose, two small tail lamps in the back, ambers on the nose's sides
    // (the tub's wall: its corners round, radius 0.46 about (±0.14, ±0.48))
    const wall = (x) => 0.48 + Math.sqrt(0.46 ** 2 - (Math.abs(x) - 0.14) ** 2), yaw = (x) => Math.sign(x) * Math.asin((Math.abs(x) - 0.14) / 0.46);
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => dsc(0.05, 0.03, s * 0.28, 0.44, wall(0.28) - 0.005, s * yaw(0.28), 12)));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.1, 0.06, 0.03, s * 0.28, 0.44, -(wall(0.28) - 0.005), 0, -s * yaw(0.28))));
    parts(group, k + 'amber', AMBER, () => [-1, 1].map(s => bx(0.06, 0.04, 0.03, s * 0.5 - s * 0.006, 0.44, wall(0.5) - 0.01, 0, s * yaw(0.5))));
    // the wheels: tiny, under the ring
    for (const s of [-1, 1]) for (const z of [0.6, -0.6]) wheel(group, k, 0.12, 0.1, s * 0.44, z, 10); // (10 sides: they are hardly seen)
    const colour = (hex) => ring.color.setHex(hex);
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => { colour(evil ? 0x9ccf2a : 0xf0c020); number.map = roundel(evil ? '13' : '7'); number.needsUpdate = true; },
      stripe: colour,
    };
    return group;
  },
  // ---- the Ice Resurfacer (after the Zamboni Model 500) -------------------------------------------------------------
  // A wide, low body on chunky wheels under shallow arches; a tall square cab perched high at its front with big glass
  // all round (square headlamps under the windscreen, amber marker lamps at its top corners); behind it the big snow
  // tank, rounded over its top and its ends, nearly as tall as the cab; a squared-off back with the wide dark
  // conditioner bar across it. A stripe (blue for Good, orange for Evil: userData.stripe) along the body and the tank.
  // Rink slush and grime low on the flanks and round the arches (a soft-edged decal); the tank's top catches the light
  // (a pale band in its shading), the body darker low down.
  iceresurfacer: (car) => {
    const group = new THREE.Group();
    const k = 'ice';
    const R = 0.34, TW = 0.26, AF = 1.5, AR = -1.5, WX = car.hw - TW / 2;
    const BEV = 0.06, ACROSS = 0.12, BW = 2.08, HALF = BW / 2, NOSE = 2.28, TAILZ = -2.22, AY = 0.3, ARC = 0.46, DECK = 0.96;
    const paint = new THREE.MeshLambertMaterial({ color: car.color, vertexColors: true });
    const stripe = new THREE.MeshLambertMaterial({ color: 0x2a6fb8 });
    // the cab: its foot on the deck, its front leaning out a touch, the windscreen raked back, a flat roof
    const CW = 1.56, CTAPER = [1.4, 2.34, 0.04], CF = [[1.98, 0.9], [2.04, 1.5], [1.94, 2.28]];
    const cab = [[0.84, 0.9], ...CF, ...curve(CF[2], [1.92, 2.32], [1.88, 2.34], [1.8, 2.34], 2), [0.92, 2.34], [0.84, 2.26]];
    // the snow tank: rounded over its top and its ends, and (a deep bevel across) over its sides
    // (its outline drawn 0.25 in: the deep bevel grows it back out, rounding every edge of it)
    const TBW = 1.98, TANK = [[1.05, 1.0], [1.05, 1.62], ...curve([1.05, 1.62], [1.05, 1.8], [0.9, 1.87], [0.7, 1.87], 3),
      [-1.2, 1.85], ...curve([-1.2, 1.85], [-1.7, 1.84], [-1.89, 1.7], [-1.89, 1.3], 4), [-1.89, 1.0]];
    const lower = [[NOSE, AY], [NOSE, 0.7], ...curve([NOSE, 0.7], [NOSE, 0.86], [NOSE - 0.06, DECK - 0.02], [NOSE - 0.2, DECK], 3),
      [TAILZ + 0.06, DECK], [TAILZ, DECK - 0.05], [TAILZ, AY], ['arc', AR, AY, ARC], ['arc', AF, AY, ARC]];
    const shade = (y, z) => {
      if (z < 0.86 && y > 1.0) { // the tank: a pale band across its shoulder, a little duller below it
        const c = 0.82 + 0.18 * Math.exp(-(((y - 2.02) / 0.14) ** 2));
        return [c, c, c * 1.0];
      }
      const t = Math.min(1, Math.max(0, (y - 0.24) / 0.7));
      return [0.62 + 0.38 * t, 0.62 + 0.38 * t, 0.66 + 0.34 * t];
    };
    const body = place(group, shared(k + 'body', () => shadeBy(merge([
      extrudeSide(lower, BW, BEV, null, 2, ACROSS),
      extrudeSide(cab, CW, BEV, CTAPER, 2, 0.08),
      extrudeSide(TANK, TBW, 0.25, null, 3, 0.3),
    ]), shade)), paint);
    // the stripe: along the body's flanks and the tank's, laid a few mm proud
    parts(group, k + 'stripe', stripe, () => [-1, 1].flatMap(s => [
      bx(0.012, 0.14, 4.3, s * (HALF + 0.022), 0.86, -0.05),
      bx(0.012, 0.18, 2.7, s * (TBW / 2 + 0.011), 1.32, -0.42),
    ]));
    // the glass: a big windscreen, a big window each side, a strip of back window over the tank
    const LIFT = 0.006, cx = (y) => narrowAt(CW / 2, y, CTAPER);
    const zF = (y) => (y < 1.5 ? CF[0][0] + (CF[1][0] - CF[0][0]) * (y - 0.9) / 0.6 : CF[1][0] + (CF[2][0] - CF[1][0]) * (y - 1.5) / 0.78);
    parts(group, k + 'glass', GLASS, () => [
      slopeGlass([zF(1.56), 1.56], [zF(2.22), 2.22], cx(1.56) - 0.12, cx(2.22) - 0.12, BEV + LIFT),
      ...sideGlass([[[zF(1.3) - 0.12, 1.3], [1.1, 1.3], [1.1, 2.22], [zF(2.22) - 0.1, 2.22]]], CW / 2, CTAPER, LIFT),
      panel([[0.6, 2.16, 0.78 - LIFT], [-0.6, 2.16, 0.78 - LIFT], [-0.6, 2.26, 0.78 - LIFT], [0.6, 2.26, 0.78 - LIFT]]),
    ]);
    // dark: the conditioner bar across the back and its blade, the headlamps' surrounds
    const BZ = TAILZ - BEV, HZ = zF(1.2) + BEV;
    parts(group, k + 'dark', TRIM, () => [
      bx(2.2, 0.3, 0.24, 0, 0.36, -2.28),
      bx(2.08, 0.1, 0.05, 0, 0.17, -2.32),
      bx(1.9, 0.12, 0.12, 0, 0.4, NOSE + BEV + 0.03),                       // the front's rubber bumper
      ...[-1, 1].map(s => bx(0.3, 0.22, 0.03, s * 0.46, 1.2, HZ, Math.atan2(0.06, 0.6))),
    ]);
    // the lamps: square headlamps on the cab's front, tail lamps on the back over the bar, ambers on the cab's corners
    parts(group, k + 'lamp', LAMP, () => [-1, 1].map(s => bx(0.22, 0.14, 0.03, s * 0.46, 1.2, HZ + 0.012, Math.atan2(0.06, 0.6))));
    parts(group, k + 'tail', TAIL, () => [-1, 1].map(s => bx(0.16, 0.16, 0.03, s * 0.8, 0.64, BZ - 0.006)));
    const RX = cx(2.2) - 0.04;
    parts(group, k + 'amber', AMBER, () => [-1, 1].flatMap(s => [
      bx(0.1, 0.07, 0.06, s * RX, 2.22, zF(2.22) + BEV - 0.02),
      bx(0.1, 0.07, 0.06, s * RX, 2.22, 0.84 - BEV - 0.02 + 0.02),
    ]));
    // slush and grime thrown up along the flanks and round the arches
    const grimy = new THREE.MeshLambertMaterial({ map: mud('slush', ['rgba(96,104,112,0.28)', 'rgba(110,116,122,0.8)', 'rgba(64,66,70,0.85)', 'rgba(230,240,248,0.75)']), transparent: true, depthWrite: false });
    const X = HALF + 0.006, AW = (ARC - BEV) * 2 / 0.82, AH = AW / 1.72;
    const grime = place(group, shared(k + 'grime', () => merge([-1, 1].flatMap(s => {
      const f = s > 0 ? 'x' : '-x', flip = s < 0;
      return [
        decal(AF - AR - 2 * (ARC - BEV) + 0.1, 0.4, s * X, 0.44, 0, f, ...mudCell('sill', flip)),
        decal(0.36, 0.4, s * X, 0.44, (TAILZ + AR - ARC) / 2, f, ...mudCell('sill', flip)),
        ...[AF, AR].map(z => decal(AW, AH, s * (X + 0.004), AY + AH / 2, z, f, ...mudCell('arch', flip))), // (out past the sill's)
      ];
    }))), grimy);
    grime.renderOrder = 1;
    for (const s of [-1, 1]) for (const z of [AF, AR]) wheel(group, k, R, TW, s * WX, z);
    const colour = (hex) => stripe.color.setHex(hex);
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => colour(evil ? 0xe8731c : 0x2a6fb8),
      stripe: colour,
    };
    return group;
  },
};
