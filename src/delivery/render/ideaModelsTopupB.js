// ---- car ideas, the top-up batch B: a removals van, a bin lorry and a jeepney -------------------------------------
// Three working vehicles drawn as ideas (ideas.js IDEA_CARS, the entries from src/delivery/ideasTopupB.js):
//   removalsvan  a 1970s Luton van (a Ford Transit Mk1 Luton): a short bonnet and a normal cab under a big square box
//                that rises over the cab's roof and overhangs the windscreen (the Luton), its front edge sloped; a
//                contrast stripe round the box, a roller shutter at the back over a stowed ramp; the box grimy low
//                down and rain-streaked under the stripe
//   refuselorry  a 1990s rear-loading refuse truck (a Dennis Eagle type): a tall, flat-fronted cab-over with a white
//                stripe round it and an amber beacon on its roof, a long body rising to a high rear hopper that hangs
//                out over the tail, its mouth low down and the bin lift's bar sticking out under it; grimy all over
//   jeepney      a Philippine jeepney (a stretched Willys jeep with a roof): a jeep's bonnet and flat wings, a long low
//                box behind with open windows, a flat roof in a bold colour with a rack and a lamp bar, chrome horses
//                on the bonnet, the open door at the back with a step; the sides painted in swooshing stripes
// Built in the manner of render/modelsOrig3.js (the Junker: the benchmark): flat-sided extrusions with chamfered
// edges, boxes and rods, every part that never moves merged with the others of its material (mergeByMaterial, about
// twenty draw calls a car), the paint shaded darker low down (vertex colours), and small canvas textures drawn in code
// (soft-edged: no hard cut-offs) for grime and the jeepney's paint scheme. No panel lines. The wheels are meshes of
// their own (a tyre: a CylinderGeometry on its side, with its hub inside it) so the suspension finds them.
// Each builder takes the idea's entry and returns a group, front facing local +z, with userData.body (the mesh in the
// paint), userData.animate (seconds) => void and userData.livery (evil) => void (the second colours).
// render/ideaModels.js spreads IDEA_MODELS_TOPUP_B into IDEA_MODELS. State-free: the helpers are copies (the model
// files do not import each other).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const shared = (material) => { material.userData.shared = true; return material; };
const GLASS = 0x1f2633;
const LAMP = shared(new THREE.MeshBasicMaterial({ color: 0xfff3c4 })), TAIL = shared(new THREE.MeshBasicMaterial({ color: 0xd8141c }));
const AMBER = shared(new THREE.MeshBasicMaterial({ color: 0xffa31a }));

const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (parent, material, w, h, l, x, y, z) => place(parent, new THREE.BoxGeometry(w, h, l), material, x, y, z);
// a side view: the polygon `points` ([z, y], or [z, y, r] for a corner rounded through a curve of about r)
const outline = (points) => {
  const shape = new THREE.Shape(), n = points.length;
  points.forEach(([z, y, r = 0], i) => {
    const [az, ay] = points[(i + n - 1) % n], [cz, cy] = points[(i + 1) % n];
    if (!r) { if (i) shape.lineTo(z, y); else shape.moveTo(z, y); return; }
    const la = Math.hypot(az - z, ay - y), lc = Math.hypot(cz - z, cy - y), k = Math.min(r, la / 2, lc / 2);
    const from = [z + (az - z) / la * k, y + (ay - y) / la * k], to = [z + (cz - z) / lc * k, y + (cy - y) / lc * k];
    if (i) shape.lineTo(from[0], from[1]); else shape.moveTo(from[0], from[1]);
    shape.quadraticCurveTo(z, y, to[0], to[1]);
  });
  shape.closePath();
  return shape;
};
// a solid whose side view is `points`, `w` wide across the car, its edges chamfered by `round` (the side view grows by
// `round` all round; its flat sides stand at ±w/2 about x)
const side = (parent, material, w, points, round, x = 0, segments = 4) => {
  const geo = new THREE.ExtrudeGeometry(outline(points), {
    depth: w - 2 * round, curveSegments: segments, bevelEnabled: round > 0, bevelThickness: round, bevelSize: round, bevelSegments: 1,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  return place(parent, geo, material);
};
// a wheel arch in a side view's lower line (at height yb), round a wheel at [zc, yc], radius r: its points from the
// rear foot over the top to the front foot (an outline running forward along its bottom)
const arch = (zc, yc, r, yb, n = 8) => {
  const a0 = Math.asin(Math.max(-1, Math.min(1, (yb - yc) / r))), pts = [];
  for (let i = 0; i <= n; i++) { const a = (Math.PI - a0) - (Math.PI - 2 * a0) * i / n; pts.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]); }
  return pts;
};
// a round thing along the car (a lamp), across it or upright
const rod = (parent, material, r, length, x, y, z, axis = 'z', segments = 12) => {
  const geo = new THREE.CylinderGeometry(r, r, length, segments);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a flat picture: w by h, facing 'x', '-x', '-z' or 'y', showing the part u, v of its texture
const decal = (parent, material, w, h, x, y, z, facing, u = [0, 1], v = [0, 1]) => {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, u[0] + uv.getX(i) * (u[1] - u[0]));
    uv.setY(i, v[0] + uv.getY(i) * (v[1] - v[0]));
  }
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  if (facing === 'y') geo.rotateX(-Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a flat panel through the points (a convex polygon, [x, y, z] in order), and the same on both flanks (pts for +x)
const panel = (pts) => {
  const pos = [];
  for (let i = 1; i + 1 < pts.length; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};
// side windows: each a polygon of [z, y] laid on the flanks at ±x, facing out
const flankGlass = (parent, material, x, windows) => {
  for (const win of windows) {
    const pts = win.map(([z, y]) => [x, y, z]);
    const [a, b, c] = pts, cross = (b[2] - a[2]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[2] - a[2]); // (x of (b-a)x(c-a), z and y swapped)
    const out = cross < 0 ? pts : pts.slice().reverse();
    place(parent, panel(out), material);
    place(parent, panel(out.map(([px, y, z]) => [-px, y, z]).reverse()), material);
  }
};
// glass on a sloping face of a side view (the edge [z0, y0] to [z1, y1], the face grown `lift` out by its chamfer):
// half width `half`, from share t0 to t1 of the edge
const slopeGlass = (parent, material, [z0, y0], [z1, y1], half, lift, t0, t1) => {
  const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy), nz = dy / len, ny = -dz / len; // (the outward normal: forward and up)
  const at = (t, s) => [s * half, y0 + dy * t + ny * lift, z0 + dz * t + nz * lift];
  return place(parent, panel([at(t0, -1), at(t0, 1), at(t1, 1), at(t1, -1)]), material);
};
const wheelGeo = (R, width) => ({
  tyre: new THREE.CylinderGeometry(R, R, width, 16),
  hub: new THREE.CylinderGeometry(R * 0.55, R * 0.55, width + 0.04, 12),
});
const TYRE = shared(lambert(0x161616));
const wheel = (parent, geo, x, y, z, hub) => {
  const parts = [new THREE.Mesh(geo.tyre, TYRE), new THREE.Mesh(geo.hub, hub)];
  for (const mesh of parts) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return parts;
};
// every mesh directly in `parent` but those in `keep`, joined with the others of its material into one mesh
const mergeByMaterial = (parent, keep) => {
  const buckets = new Map();
  for (const mesh of [...parent.children]) {
    if (!mesh.isMesh || keep.has(mesh)) continue;
    mesh.updateMatrix();
    const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    if (!buckets.has(mesh.material)) buckets.set(mesh.material, []);
    buckets.get(mesh.material).push(geo);
    mesh.geometry.dispose();
    parent.remove(mesh);
  }
  const out = new Map();
  for (const [material, geos] of buckets) {
    const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeometries(geos, false) : geos[0], material);
    for (const geo of geos) if (geos.length > 1) geo.dispose();
    parent.add(mesh);
    out.set(material, mesh);
  }
  return out;
};
// the paint shaded darker and greyer toward its foot (a vertex colour, times the paint's), from `low` at y0 to white at y1
const shadeLow = (mesh, y0, y1, low) => {
  const pos = mesh.geometry.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (y1 - y0))), e = t * t * (3 - 2 * t);
    for (let c = 0; c < 3; c++) col[i * 3 + c] = low[c] + (1 - low[c]) * e;
  }
  mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  mesh.material.vertexColors = true;
};

// ---- the canvas textures: drawn once, kept for every car that wears them ------------------------------------------
const textures = new Map();
const texture = (key, w, h, draw) => {
  if (!textures.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    draw(ctx, w, h);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.userData.shared = true;
    textures.set(key, map);
  }
  return textures.get(key);
};
const random = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// GRIME (256 x 128, see-through): two strips, each a decal of its own. `low` (the top half): road dirt thrown up
// along a body's foot, thick at the bottom edge and thinning upward into sparse specks; `streak` (the bottom half):
// rain streaks run down from a ledge, each fading to nothing. Both thin out before the strip's ends: no hard edge
const GRIME = { low: [0, 0, 256, 64], streak: [0, 64, 256, 64] };
const grimeCell = (name, flip = false) => {
  const [x, y, w, h] = GRIME[name], u = [x / 256, (x + w) / 256];
  return [flip ? [u[1], u[0]] : u, [1 - (y + h) / 128, 1 - y / 128]];
};
const grime = () => texture('grime', 256, 128, (ctx) => {
  ctx.clearRect(0, 0, 256, 128);
  const rnd = random(23), ends = (fx) => Math.min(1, Math.min(fx, 1 - fx) / 0.12);
  const blob = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rnd() * 3, 0, Math.PI * 2); ctx.fill(); };
  // the road dirt: soft, see-through smudges, then specks and splashes
  for (let i = 0; i < 2600; i++) {
    const fx = rnd(), fy = rnd(), k = fy ** 1.8 * ends(fx) * (0.7 + 0.3 * Math.sin(fx * 23) ** 2);
    if (rnd() > k) continue;
    ctx.fillStyle = 'rgba(64,52,38,' + (0.035 + 0.055 * k).toFixed(3) + ')';
    blob(fx * 256, fy * 64, 3 + rnd() * 6 * k, 1.5 + rnd() * 3);
  }
  for (let i = 0; i < 500; i++) {
    const fx = rnd(), fy = rnd(), k = fy ** 1.2 * ends(fx);
    if (rnd() > k) continue;
    ctx.fillStyle = rnd() < 0.7 ? 'rgba(52,42,30,0.45)' : 'rgba(110,92,70,0.4)';
    blob(fx * 256, fy * 64, 0.6 + rnd() * 1.2, 0.5 + rnd() * 0.9);
  }
  // the rain streaks: thin runs from the top edge (and a few from lower down), fading as they go
  for (let i = 0; i < 55; i++) {
    const fx = rnd(), x = fx * 256, top = 64 + (rnd() < 0.8 ? rnd() * 3 : rnd() * 20), len = 12 + rnd() * 44, a = (0.06 + rnd() * 0.12) * ends(fx);
    const g = ctx.createLinearGradient(0, top, 0, Math.min(128, top + len));
    g.addColorStop(0, 'rgba(58,50,40,' + a.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(58,50,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, 0.8 + rnd() * 2.2, Math.min(128 - top, len));
  }
  ctx.fillStyle = 'rgba(58,50,40,0.05)'; // (a faint shadow of dirt under the ledge itself)
  for (let i = 0; i < 160; i++) { const fx = rnd(); blob(fx * 256, 64 + rnd() * 6, 2 + rnd() * 5 * ends(fx), 1 + rnd() * 2); }
});
// a grime decal over a flank or a face (see grime): `mat` is the see-through material made from it
const grimeMat = () => new THREE.MeshLambertMaterial({ map: grime(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });

// THE JEEPNEY'S PAINT (256 x 128, see-through), one per side's colours [a, b, c]: the top half for the flanks, two
// swooshing stripes that swell toward the front (the left of the picture) and taper to points at both ends, a thin
// pale pinstripe along each and a row of small stars between; the bottom half for the bonnet, a chevron of the same
// stripes pointing forward (the picture's foot). Nothing reaches the picture's edge
const scheme = (key, [a, b, c]) => texture('jeepney-' + key, 256, 128, (ctx) => {
  ctx.clearRect(0, 0, 256, 128);
  const swoosh = (y0, y1, thick, colour, wave) => { // a stripe from x 8 to 248, its middle from y0 (front) to y1 (back)
    const top = [], bottom = [];
    for (let i = 0; i <= 24; i++) {
      const f = i / 24, x = 8 + f * 240, mid = y0 + (y1 - y0) * f + Math.sin(f * Math.PI * 2 + wave) * 2.5;
      const t = thick * Math.sin(Math.PI * Math.min(1, f * 1.15)) ** 0.45 * (1.25 - 0.5 * f); // (fat at the front, a point at each end)
      top.push([x, mid - t / 2]); bottom.push([x, mid + t / 2]);
    }
    ctx.beginPath();
    [...top, ...bottom.reverse()].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,235,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  swoosh(20, 17, 22, a, 0);
  swoosh(46, 43, 17, b, 1.2);
  // small four-point stars between the stripes, getting smaller toward the back
  ctx.fillStyle = c;
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 30, y = 33 + Math.sin(i) * 1.5, s = 4.4 - i * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.3, y - s * 0.3); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.3, y + s * 0.3);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.3, y + s * 0.3); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.3, y - s * 0.3);
    ctx.closePath(); ctx.fill();
  }
  // the bonnet: three nested chevrons pointing to the front (the bottom), their arms tapering out toward the back
  for (const [colour, off, w] of [[a, 0, 9], [b, 16, 7], [c, 30, 5]]) {
    ctx.beginPath();
    ctx.moveTo(128, 120 - off);
    ctx.lineTo(128 - 100 + off * 1.6, 72 + off * 0.2); ctx.lineTo(128 - 100 + off * 1.6 + w * 0.6, 72 + off * 0.2);
    ctx.lineTo(128, 120 - off - w); ctx.lineTo(128 + 100 - off * 1.6 - w * 0.6, 72 + off * 0.2); ctx.lineTo(128 + 100 - off * 1.6, 72 + off * 0.2);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  }
});

// A REFUSE LORRY'S CHEVRONS (128 x 64): red and yellow stripes in an upturned V, as on the back of a bin lorry, on a
// plate with rounded corners, a little worn (pale scuffs) and grimy toward its foot. See-through outside the plate
const chevrons = () => texture('chevrons', 128, 64, (ctx) => {
  ctx.clearRect(0, 0, 128, 64);
  const rnd = random(31);
  const plate = () => { ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(122, 2); ctx.quadraticCurveTo(126, 2, 126, 6); ctx.lineTo(126, 58); ctx.quadraticCurveTo(126, 62, 122, 62); ctx.lineTo(6, 62); ctx.quadraticCurveTo(2, 62, 2, 58); ctx.lineTo(2, 6); ctx.quadraticCurveTo(2, 2, 6, 2); ctx.closePath(); };
  ctx.save();
  plate();
  ctx.clip();
  ctx.fillStyle = '#f2c81a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#d4202a';
  for (let i = -5; i < 4; i++) { // (each stripe an upturned V, its point up the middle, its arms down and out to the sides)
    const d = i * 24;
    ctx.beginPath(); ctx.moveTo(64, d); ctx.lineTo(150, d + 86); ctx.lineTo(150, d + 98); ctx.lineTo(64, d + 12); ctx.lineTo(-22, d + 98); ctx.lineTo(-22, d + 86); ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 160; i++) { // scuffs, and grime toward the foot
    const y = rnd() * 64, k = (y / 64) ** 2;
    ctx.fillStyle = rnd() < 0.5 - k * 0.3 ? 'rgba(255,250,235,0.25)' : 'rgba(50,40,30,' + (0.08 + k * 0.25).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(rnd() * 128, y, 1 + rnd() * 3, 0.6 + rnd() * 1.5, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
});

export const IDEA_MODELS_TOPUP_B = {
  // The Removals Van (a 1970s Ford Transit Mk1 Luton): a short bonnet and a normal cab, its wheel arches crisp cut-outs;
  // over the cab the big square box, its front (the Luton) out over the windscreen with a sloped lower face; a band
  // round the box in the second colour; at the back a plain shutter over a stowed ramp. The box is grimy along its foot
  // and rain-streaked under the band. Rectangular headlamps in a dark grille, a chrome bumper with amber corners, tall
  // tail lamps up the box's back corners, amber repeaters on its flanks near the back
  removalsvan: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const R = 0.4, WX = car.hw - 0.15, FZ = 2.2, RZ = -1.35;
    const paint = lambert(car.color), glass = lambert(GLASS), dark = lambert(0x1c1e22), chrome = lambert(0xc9ccd0);
    const band = lambert(0x2f67b1), shutter = lambert(0xb4b9c0), steel = lambert(0x8a9097);
    // the cab: a blunt nose, a short bonnet, the windscreen raked a little, its roof under the Luton; an arch over the
    // front wheel
    const CW = 1.96, CR = 0.06;
    const WSF = [2.42, 1.16], WST = [2.14, 2.0];
    side(shell, paint, CW, [[1.0, 0.5], ...arch(FZ, 0.5, 0.48, 0.5), [2.86, 0.5], [2.88, 1.02], [2.82, 1.12, 0.08], WSF, WST, [1.0, 2.0]], CR, 0, 3);
    // the box: from behind the cab to the tail, over the cab's roof and on out over the windscreen (the Luton), its
    // lower front face sloped up to the front edge
    const BW = car.hw * 2, BR = 0.05, TOP = car.height - BR, TAILZ = -car.hl + 0.07;
    side(shell, paint, BW, [[TAILZ, 1.02], [1.25, 1.02], [1.25, 2.14], [1.72, 2.14], [2.15, 2.56], [2.15, TOP], [TAILZ, TOP]], BR, 0, 3);
    // the band round the box, a few mm proud of it all round
    side(shell, band, BW + 0.016, [[TAILZ - 0.008, 2.56], [2.158, 2.56], [2.158, 2.76], [TAILZ - 0.008, 2.76]], BR);
    // under the box: the chassis, and the cab's floor behind the front wheels; the bumpers; the stowed ramp
    box(shell, dark, 1.4, 0.42, 3.6, 0, 0.8, -0.7);
    box(shell, chrome, 1.98, 0.14, 0.14, 0, 0.52, 2.93);
    box(shell, dark, 2.0, 0.28, 0.34, 0, 0.84, TAILZ - BR + 0.18); // (the rear bumper: a deep block under the box's tail)
    box(shell, steel, 1.1, 0.05, 0.3, 0, 0.73, TAILZ - BR + 0.13); // (the ramp, stowed: its end out under the bumper)
    // the back: the shutter, a plain block of brushed grey, its handle bar at the foot
    box(shell, shutter, 1.84, 1.42, 0.02, 0, 1.79, TAILZ - BR - 0.006);
    box(shell, steel, 0.5, 0.05, 0.04, 0, 1.18, TAILZ - BR - 0.02);
    // the glass: the windscreen, the cab's side windows (their front edge following the screen)
    const LIFT = CR + 0.006, sz = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    slopeGlass(shell, glass, WSF, WST, CW / 2 - 0.1, LIFT, 0.1, 0.94);
    flankGlass(shell, glass, CW / 2 + 0.006, [[[1.34, 1.24], [sz(1.24) - 0.1, 1.24], [sz(1.92) - 0.1, 1.92], [1.34, 1.92]]]);
    // the face: a dark grille across the nose, a rectangular headlamp at each end of it; the mirrors on short arms
    box(shell, dark, 1.34, 0.36, 0.04, 0, 0.84, 2.945);
    for (const s of [-1, 1]) {
      box(shell, LAMP, 0.28, 0.18, 0.03, s * 0.5, 0.84, 2.97);
      box(shell, AMBER, 0.14, 0.08, 0.03, s * 0.84, 0.52, 3.0);            // (the front indicators, in the bumper's corners)
      box(shell, dark, 0.14, 0.03, 0.03, s * 1.03, 1.56, 2.3);             // the mirror's arm
      box(shell, dark, 0.05, 0.24, 0.13, s * 1.12, 1.56, 2.3);             // the mirror
      // the back: tall tail lamps up the box's lower corners, amber in the bumper's corners and on the flanks
      box(shell, TAIL, 0.14, 0.44, 0.03, s * 0.92, 1.3, TAILZ - BR - 0.008);
      box(shell, AMBER, 0.16, 0.08, 0.03, s * 0.84, 0.84, TAILZ - BR + 0.005);
      box(shell, AMBER, 0.03, 0.08, 0.18, s * (car.hw + 0.006), 1.22, TAILZ + 0.32);
    }
    // grime: road dirt along the box's foot and the cab's, rain streaks run down from under the band, both flanks alike
    const dirty = grimeMat();
    for (const s of [-1, 1]) {
      const f = s > 0 ? 'x' : '-x', flip = s < 0;
      decal(shell, dirty, 4.1, 0.5, s * (car.hw + 0.004), 1.32, (TAILZ + 1.25) / 2, f, ...grimeCell('low', flip));
      decal(shell, dirty, 4.1, 0.6, s * (car.hw + 0.004), 2.22, (TAILZ + 1.25) / 2, f, ...grimeCell('streak', flip));
      decal(shell, dirty, 0.62, 0.3, s * (CW / 2 + 0.004), 0.68, 1.48, f, ...grimeCell('low', flip));
    }
    decal(shell, dirty, 1.6, 0.34, 0, 1.25, TAILZ - BR - 0.022, '-z', ...grimeCell('low'));
    // the wheels: fat tyres on plain silver hubs
    const keep = new Set(), geo = wheelGeo(R, 0.3), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) for (const part of wheel(group, geo, s * WX, R, z, hub)) keep.add(part);
    const merged = mergeByMaterial(shell, keep);
    const body = merged.get(paint);
    shadeLow(body, 0.45, 1.7, [0.74, 0.71, 0.68]);
    merged.get(dirty).renderOrder = 1;
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => {
        band.color.setHex(evil ? 0xc99a2e : 0x2f67b1);
        shutter.color.setHex(evil ? 0x6f776f : 0xb4b9c0);
      },
      stripe: (hex) => band.color.setHex(hex),
    };
    group.userData.livery(false);
    return group;
  },

  // The Bin Lorry (a 1990s rear-loading refuse truck, Dennis Eagle type): a tall cab-over with a flat, upright face
  // (a big windscreen, a dark band with the square headlamps, a deep bumper), a white stripe round it and an amber
  // beacon on its roof; behind it the long body, rising toward the back, and the high rear hopper hanging out over
  // the tail: its dark mouth low down and the bin lift's bar sticking out under that. Two axles at the back. Grimy:
  // road dirt along every foot, streaks down the body's flanks and the hopper's back
  refuselorry: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const R = 0.5, WX = car.hw - 0.18, FZ = 2.55, RZ = [-1.2, -2.25];
    const paint = lambert(car.color), glass = lambert(GLASS), dark = lambert(0x1c1e22), steel = lambert(0x8d939b);
    const stripe = lambert(0xf2f2ee), beacon = new THREE.MeshBasicMaterial({ color: 0xffa31a });
    // the cab: its face nearly upright, leaning back a touch above the bumper; an arch over the front wheel
    const CW = car.hw * 2, CR = 0.08, NOSE = 3.48;
    const WSF = [NOSE + 0.02, 1.38], WST = [NOSE - 0.1, 2.6];
    side(shell, paint, CW, [[1.7, 0.56], ...arch(FZ, 0.56, 0.6, 0.56), [NOSE, 0.56], WSF, [WST[0], WST[1], 0.14], [1.7, WST[1]]], CR, 0, 3);
    // the white stripe round the cab, under the windows
    side(shell, stripe, CW + 0.016, [[1.72, 1.1], [NOSE + 0.018, 1.1], [NOSE + 0.028, 1.3], [1.72, 1.3]], CR);
    // the body: rising from behind the cab to the back; the hopper over the tail, a little wider, its back leaning out
    // at the foot (the mouth) and up over the top
    const BW = CW - 0.06, BR = 0.06, BTOP = car.height - 0.06;
    side(shell, paint, BW, [[-2.85, 1.08], [1.86, 1.08], [1.86, 2.68, 0.12], [-2.85, BTOP - 0.24]], BR, 0, 3);
    const HB = [[-3.44, 0.92], [-3.5, 1.52]]; // (the hopper's lower back face: the mouth's)
    const HT = [-3.26, 2.46]; // (the top of the hopper's sloping back)
    side(shell, paint, CW + 0.04, [[-2.66, 0.92], HB[0], HB[1], [HT[0], HT[1], 0.1], [-2.98, BTOP, 0.08], [-2.66, BTOP, 0.05]], BR, 0, 3);
    const faceZ = (y) => HB[0][0] + (HB[1][0] - HB[0][0]) * (y - HB[0][1]) / (HB[1][1] - HB[0][1]) - BR; // (the mouth's face, chamfer and all)
    // under it all: the chassis and the deep front bumper
    box(shell, dark, 1.5, 0.44, 4.9, 0, 0.84, -0.4);
    box(shell, dark, CW - 0.04, 0.32, 0.12, 0, 0.62, NOSE + 0.06);
    // the hopper's mouth: dark, across the back low down; the bin lift under it: two arms and the bar across, out at the tail
    const tilt = Math.atan2(HB[1][0] - HB[0][0], HB[1][1] - HB[0][1]);
    box(shell, dark, 1.64, 0.44, 0.06, 0, 1.24, faceZ(1.24) - 0.012).rotation.x = -tilt;
    for (const s of [-1, 1]) box(shell, steel, 0.1, 0.5, 0.1, s * 0.72, 0.84, faceZ(0.92) - 0.02);
    box(shell, steel, 1.66, 0.12, 0.14, 0, 0.66, faceZ(0.92) - 0.05);
    // the glass: the big windscreen, the cab's side windows (a deep door window under a short one)
    const LIFT = CR + 0.006, sz = (y) => WSF[0] + (WST[0] - WSF[0]) * (y - WSF[1]) / (WST[1] - WSF[1]);
    slopeGlass(shell, glass, WSF, WST, CW / 2 - 0.1, LIFT, 0.12, 0.9);
    flankGlass(shell, glass, CW / 2 + 0.006, [[[2.08, 1.42], [sz(1.42) - 0.08, 1.42], [sz(2.42) - 0.08, 2.42], [2.08, 2.42]]]);
    // the face: a dark band across it, a square headlamp at each end of it, amber at the corners; the mirrors on arms
    box(shell, dark, 1.3, 0.24, 0.04, 0, 0.92, NOSE + CR + 0.012);
    for (const s of [-1, 1]) {
      box(shell, LAMP, 0.24, 0.22, 0.04, s * 0.82, 0.92, NOSE + CR + 0.016);
      box(shell, AMBER, 0.08, 0.16, 0.04, s * 1.03, 0.92, NOSE + CR + 0.016);
      box(shell, dark, 0.22, 0.04, 0.04, s * 1.22, 2.26, 3.2);              // the mirror's arm
      box(shell, dark, 0.06, 0.44, 0.2, s * 1.33, 2.06, 3.2);               // the mirror
      // the back: tall tail lamps up the hopper's lower corners, amber under them
      box(shell, TAIL, 0.14, 0.38, 0.05, s * 1.0, 1.28, faceZ(1.28) - 0.012);
      box(shell, AMBER, 0.14, 0.1, 0.05, s * 1.0, 1.0, faceZ(1.0) - 0.012);
    }
    // the beacon: an amber dome on a dark foot on the cab's roof
    box(shell, dark, 0.3, 0.06, 0.3, 0, WST[1] + CR + 0.02, 2.5);
    rod(shell, beacon, 0.13, 0.22, 0, WST[1] + CR + 0.15, 2.5, 'y', 10);
    // the hopper's back: red and yellow chevrons (a drawn picture, worn), laid on its sloping face
    const signs = new THREE.MeshLambertMaterial({ map: chevrons(), transparent: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    {
      const dz = HT[0] - HB[1][0], dy = HT[1] - HB[1][1], len = Math.hypot(dz, dy), nz = -dy / len, ny = -dz / len * -1;
      const plate = decal(shell, signs, 1.9, len - 0.16, 0, (HB[1][1] + HT[1]) / 2 + ny * (BR + 0.004), (HB[1][0] + HT[0]) / 2 + nz * (BR + 0.004), '-z');
      plate.rotation.x = Math.atan2(dz, dy);
    }
    // grime: road dirt along the feet of the body, the cab and the hopper; streaks down the body and the hopper's back
    const dirty = grimeMat();
    for (const s of [-1, 1]) {
      const f = s > 0 ? 'x' : '-x', flip = s < 0;
      decal(shell, dirty, 4.6, 0.62, s * (BW / 2 + 0.004), 1.42, -0.5, f, ...grimeCell('low', flip));
      decal(shell, dirty, 4.6, 0.9, s * (BW / 2 + 0.004), 2.32, -0.5, f, ...grimeCell('streak', flip));
      decal(shell, dirty, 0.8, 0.5, s * (CW / 2 + 0.004), 1.38, -3.08, f, ...grimeCell('low', flip));
      decal(shell, dirty, 0.4, 0.34, s * (CW / 2 + 0.004), 0.78, 1.82, f, ...grimeCell('low', flip));
    }
    decal(shell, dirty, 2.3, 0.4, 0, 0.78, NOSE + CR + 0.004, 'z', ...grimeCell('low'));
    // the wheels: big fat tyres on plain grey hubs
    const keep = new Set(), geo = wheelGeo(R, 0.36), hub = lambert(0xb6bac0);
    for (const s of [-1, 1]) for (const z of [FZ, ...RZ]) for (const part of wheel(group, geo, s * WX, R, z, hub)) keep.add(part);
    const merged = mergeByMaterial(shell, keep);
    const body = merged.get(paint);
    shadeLow(body, 0.5, 1.9, [0.7, 0.68, 0.64]);
    merged.get(dirty).renderOrder = 1;
    group.userData = {
      body,
      // the beacon turns: a bright flash twice a turn, dim between
      animate: (t) => { const k = Math.abs(Math.sin(t * 5)) ** 6; beacon.color.setRGB(1, 0.42 + 0.3 * k, 0.05 + 0.15 * k); },
      livery: (evil) => stripe.color.setHex(evil ? 0x1d1d20 : 0xf2f2ee),
      stripe: (hex) => stripe.color.setHex(hex),
    };
    group.userData.livery(false);
    return group;
  },

  // The Jeepney (a Philippine jeepney, a stretched Willys jeep): a jeep's narrow bonnet between flat wings, round
  // headlamps in chrome pods on the wings, an upright grille and a deep chrome bumper; chrome horses on the bonnet;
  // a long low box behind, open windows down both sides, a flat roof in a bold second colour over it all with a rack
  // and a lamp bar across its front; at the back the open doorway with a step. Swooshing stripes and stars painted
  // down its flanks and a chevron on the bonnet (a drawn picture)
  jeepney: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const R = 0.38, WX = car.hw - 0.16, FZ = 2.2, RZ = -1.7;
    const paint = lambert(car.color), glass = lambert(0x16191f), dark = lambert(0x121418), chrome = lambert(0xdfe2e6);
    const roof = lambert(0xd8262b), art = new THREE.MeshLambertMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    // the box: from the tail to just behind the bonnet, its foot cut round the back wheel; a flat face at the front for
    // the windscreen, over the bonnet
    const BW = car.hw * 2 - 0.06, BR = 0.05, TAILZ = -car.hl + 0.1, FACE = 1.6, BTOP = 1.96;
    side(shell, paint, BW, [[TAILZ, 0.56], ...arch(RZ, R, 0.52, 0.56), [FACE, 0.56], [FACE, BTOP], [TAILZ, BTOP]], BR, 0, 3);
    // the bonnet, narrow and flat-topped; the flat wings either side over the front wheels, curled down at the front
    side(shell, paint, 1.26, [[FACE - 0.1, 0.72], [2.84, 0.72], [2.86, 1.14, 0.05], [2.78, 1.22], [FACE - 0.1, 1.22]], 0.05);
    for (const s of [-1, 1]) side(shell, paint, 0.36, [[FACE - 0.05, 0.9], [2.66, 0.9], [2.86, 0.78, 0.06], [2.9, 0.94, 0.04], [2.78, 0.99], [FACE - 0.05, 0.99]], 0.03, s * (car.hw - 0.2));
    // the roof: a flat slab over everything, out a little over the windscreen
    const RZ0 = TAILZ - BR - 0.01, RZ1 = FACE + BR + 0.15;
    box(shell, roof, BW + 0.08, 0.1, RZ1 - RZ0, 0, BTOP + BR, (RZ0 + RZ1) / 2);
    // the rack on it: two rails along it and four across, on short posts; the lamp bar across the front of it
    // (the rack and the lamp bar are the roof's own ornaments: built in `rack`, merged apart from the body, tagged 'roof' so a chosen roof prop hides them)
    const rack = new THREE.Group(), rackY = BTOP + 0.2;
    for (const s of [-1, 1]) {
      box(rack, chrome, 0.04, 0.04, 3.6, s * 0.86, rackY, -1.1);
      for (const z of [0.6, -2.8]) box(rack, chrome, 0.04, 0.12, 0.04, s * 0.86, rackY - 0.08, z);
    }
    for (const z of [0.5, -0.5, -1.6, -2.7]) box(rack, chrome, 1.72, 0.03, 0.03, 0, rackY + 0.02, z);
    box(rack, chrome, 1.5, 0.08, 0.06, 0, BTOP + 0.17, FACE + 0.1);
    for (const s of [-1, 1]) box(rack, chrome, 0.04, 0.1, 0.04, s * 0.7, BTOP + 0.1, FACE + 0.1);
    for (let i = -2; i <= 2; i++) rod(rack, LAMP, 0.045, 0.03, i * 0.3, BTOP + 0.17, FACE + 0.14, 'z', 8);
    const rackMeshes = [...mergeByMaterial(rack, new Set()).values()];
    for (const m of rackMeshes) { m.userData.prop = 'roof'; shell.add(m); }
    // the glass: the windscreen in the box's face; the open windows down the sides (dark, between pillars of paint)
    box(shell, glass, BW - 0.24, 0.56, 0.02, 0, 1.56, FACE + BR + 0.006);
    const wins = [];
    for (let i = 0; i < 5; i++) { const z1 = 1.3 - i * 0.84, z0 = z1 - 0.68; wins.push([[z0, 1.36], [z1, 1.36], [z1, 1.82], [z0, 1.82]]); }
    flankGlass(shell, glass, BW / 2 + 0.005, wins);
    // a chrome strip along each flank under the windows, from the face to the tail
    for (const s of [-1, 1]) box(shell, chrome, 0.02, 0.04, -TAILZ + FACE + 0.06, s * (BW / 2 + 0.006), 1.36, (TAILZ + FACE) / 2);
    // the back: the open doorway (dark), chrome grab rails either side of it and the step under it
    box(shell, dark, 0.72, 1.18, 0.02, 0, 1.16, TAILZ - BR - 0.006);
    for (const s of [-1, 1]) rod(shell, chrome, 0.02, 1.0, s * 0.46, 1.2, TAILZ - BR - 0.04, 'y', 8);
    for (const s of [-1, 1]) box(shell, chrome, 0.04, 0.04, 0.05, s * 0.46, 1.2, TAILZ - BR - 0.02);
    box(shell, chrome, 0.9, 0.06, 0.24, 0, 0.53, TAILZ - BR - 0.06);
    // the face: an upright grille of dark slots in chrome, a deep chrome bumper, the round headlamps in chrome pods on
    // the wings with the amber indicators under them; chrome mirrors on stalks
    box(shell, chrome, 0.9, 0.38, 0.03, 0, 0.94, 2.925);
    for (let i = -3; i <= 3; i++) box(shell, dark, 0.07, 0.3, 0.02, i * 0.115, 0.94, 2.935);
    box(shell, chrome, 1.92, 0.16, 0.12, 0, 0.56, 2.93);
    for (const s of [-1, 1]) {
      const x = s * (car.hw - 0.2);
      rod(shell, chrome, 0.115, 0.14, x, 1.1, 2.62, 'z', 12);
      rod(shell, LAMP, 0.09, 0.02, x, 1.1, 2.695, 'z', 12);
      box(shell, AMBER, 0.12, 0.06, 0.03, x, 0.94, 2.935);
      box(shell, chrome, 0.03, 0.3, 0.03, s * (BW / 2 + 0.03), 1.5, FACE - 0.05);
      box(shell, chrome, 0.06, 0.14, 0.1, s * (BW / 2 + 0.06), 1.68, FACE - 0.05);
      // the back: small tail lamps at the corners, amber beside them
      box(shell, TAIL, 0.12, 0.16, 0.03, s * 0.84, 0.84, TAILZ - BR - 0.008);
      box(shell, AMBER, 0.12, 0.08, 0.03, s * 0.84, 0.68, TAILZ - BR - 0.008);
    }
    // the horses: two chrome ponies rearing on the bonnet's front, facing forward
    for (const s of [-1, 1]) {
      const x = s * 0.24, y = 1.27, z = 2.52;
      box(shell, chrome, 0.07, 0.04, 0.12, x, y - 0.0, z);                   // the plinth
      const horse = new THREE.Group();
      horse.position.set(x, y + 0.02, z);
      horse.rotation.x = -0.3;                                              // (rearing)
      box(horse, chrome, 0.06, 0.08, 0.2, 0, 0.1, 0);                        // the barrel
      box(horse, chrome, 0.05, 0.13, 0.06, 0, 0.19, 0.09).rotation.x = 0.5;  // the neck
      box(horse, chrome, 0.05, 0.05, 0.1, 0, 0.25, 0.14);                    // the head
      box(horse, chrome, 0.05, 0.1, 0.04, 0, 0.03, -0.08);                   // the hind legs
      box(horse, chrome, 0.05, 0.08, 0.04, 0, 0.04, 0.12).rotation.x = -0.8; // the forelegs
      box(horse, chrome, 0.02, 0.1, 0.03, 0, 0.1, -0.12).rotation.x = 0.6;   // the tail
      horse.updateMatrix();
      for (const mesh of mergeByMaterial(horse, new Set()).values()) { mesh.geometry.applyMatrix4(horse.matrix); shell.add(mesh); }
    }
    // the paint: the swooshes down both flanks (between the arch's top and the windows), the chevron on the bonnet
    for (const s of [-1, 1]) decal(shell, art, 4.3, 0.52, s * (BW / 2 + 0.004), 1.1, (TAILZ + FACE) / 2, s > 0 ? 'x' : '-x', s > 0 ? [0, 1] : [1, 0], [0.5, 1]);
    decal(shell, art, 1.0, 1.0, 0, 1.272, 2.18, 'y', [0, 1], [0, 0.5]);
    // the wheels: fat tyres on plain chrome hubs
    const keep = new Set(rackMeshes), geo = wheelGeo(R, 0.28), hub = lambert(0xd0d3d8);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) for (const part of wheel(group, geo, s * WX, R, z, hub)) keep.add(part);
    const merged = mergeByMaterial(shell, keep);
    const body = merged.get(paint);
    shadeLow(body, 0.45, 1.2, [0.72, 0.7, 0.68]);
    merged.get(art).renderOrder = 1;
    group.userData = {
      body,
      animate: () => {},
      livery: (evil) => {
        art.map = evil ? scheme('evil', ['#e8731c', '#6a3a8a', '#f2d8a0']) : scheme('good', ['#d8262b', '#2a55b8', '#ffffff']);
        art.needsUpdate = true;
        roof.color.setHex(evil ? 0xe8731c : 0xd8262b);
      },
    };
    group.userData.livery(false);
    return group;
  },
};
