// ---- four of the ORIGINAL garage cars, rebuilt (the owner, 13-Oct: "Let's bring the original models up to an acceptable
// quality"): the Hearse, the Hot Rod, the Minivan and the Pick-Up, after the owner's own older game's "Pick a car!" cards.
// Built as render/models.js' builders are (models.js puts these in MODELS): each takes the car's entry and returns a group,
// front facing local +z, with
//   userData.body     the mesh whose material is the paint (every painted part shares that one material, so the livery,
//                     the traffic's paints and a damaged car's scorch reach all of it)
//   userData.animate  (seconds) => void: poses the model for that moment
//   userData.livery   (evil) => void: the parts that differ between Good and Evil beyond the paint (a second colour)
// Light on the GPU: few curve segments, one geometry per set of like parts where it can be, and every part that never
// moves merged with the others of its material into one mesh (mergeByMaterial), so a car is about twenty draw calls.
// The wheels stay meshes of their own (a tyre: a CylinderGeometry on its side, as render/carsuspension.js finds the
// wheels and render/carExtras.js addSuperKit finds the tyres), each with its hub inside it.
// A few small canvas textures (the Hot Rod's flames, the Hearse's curtains, the Pick-Up's worn bonnet): made once, kept
// and shared by every car that wears them (userData.shared: clearGroup leaves them be), 128 x 64 at most. No image files.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const shared = (material) => { material.userData.shared = true; return material; };
const GLASS = 0x232a35, CHROME = 0xd8d8d8, TRIM = 0x2a2c31;
// the lamps' lenses: made once, shared by every car (they never change colour)
const LAMP = shared(new THREE.MeshBasicMaterial({ color: 0xfff3c4 })), TAIL = shared(new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
const BRAKE = shared(new THREE.MeshBasicMaterial({ color: 0xc4101c })), AMBER = shared(new THREE.MeshBasicMaterial({ color: 0xffa31a }));

const place = (parent, geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (parent, material, w, h, l, x, y, z) => place(parent, new THREE.BoxGeometry(w, h, l), material, x, y, z);
// a flat panel tipped about the car's width: a windscreen. `pitch` > 0 drops its front edge
const slab = (parent, material, w, t, l, x, y, z, pitch) => {
  const mesh = box(parent, material, w, t, l, x, y, z);
  mesh.rotation.x = pitch;
  return mesh;
};
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
// a solid whose side view is `points` (see outline), `w` wide across the car with its edges chamfered by `round`
// (the side view grows by `round` all round: its flat sides are the outline itself), its middle at x
const side = (parent, material, w, points, round, x = 0, segments = 4) => {
  const geo = new THREE.ExtrudeGeometry(outline(points), {
    depth: w - 2 * round, curveSegments: segments, bevelEnabled: round > 0, bevelThickness: round, bevelSize: round, bevelSegments: 1,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(x + w / 2 - round, 0, 0);
  return place(parent, geo, material);
};
// a straight-sided solid whose side view is `points`, `w` wide, its middle at x (a window, a flame)
const prism = (parent, material, w, points, x = 0) => side(parent, material, w, points, 0, x);
// a block that narrows (or grows) along the car: from the cross-section `a` to `b`, each [z, width, bottom, top]
const taper = (parent, material, a, b, x = 0) => {
  const corners = [];
  for (const [z, w, y0, y1] of [a[0] < b[0] ? a : b, a[0] < b[0] ? b : a]) corners.push([-w / 2, y0, z], [w / 2, y0, z], [w / 2, y1, z], [-w / 2, y1, z]);
  const faces = [4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 0, 7, 3, 0, 4, 7];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(faces.flatMap(i => [corners[i][0] + x, corners[i][1], corners[i][2]]), 3));
  geo.computeVertexNormals(); // (no shared corners: each face flat)
  return place(parent, geo, material);
};
// a round thing along the car (a lamp), across it (an axle) or upright (a post)
const rod = (parent, material, r, length, x, y, z, axis = 'z', segments = 12, r2 = r) => {
  const geo = new THREE.CylinderGeometry(r, r2, length, segments);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a flat picture (a decal, a curtained window): w by h, facing 'x' (+x), '-x', 'z', '-z' or 'y' (up)
const decal = (parent, material, w, h, x, y, z, facing, u = [0, 1], v = [0, 1]) => {
  const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { // (a part of the picture: u from u[0] to u[1], v from v[0] to v[1])
    uv.setX(i, u[0] + uv.getX(i) * (u[1] - u[0]));
    uv.setY(i, v[0] + uv.getY(i) * (v[1] - v[0]));
  }
  if (facing === 'x') geo.rotateY(Math.PI / 2);
  if (facing === '-x') geo.rotateY(-Math.PI / 2);
  if (facing === '-z') geo.rotateY(Math.PI);
  if (facing === 'y') geo.rotateX(-Math.PI / 2);
  return place(parent, geo, material, x, y, z);
};
// a wheel as the rest of the roster has them (render/models.js wheel): a fat dark tyre (a cylinder on its side, the mesh
// the suspension and the Super kit look for) and a plain hub disc in it. Meshes of their own, never merged (the
// suspension holds each wheel's parts on the floor)
const wheel = (parent, geo, x, y, z, tyre, hub) => {
  const parts = [new THREE.Mesh(geo.tyre, tyre), new THREE.Mesh(geo.hub, hub)];
  for (const mesh of parts) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }
  return parts;
};
// the geometries of a set of like wheels (radius, tyre width), made once for them all
const wheelGeo = (R, width) => ({
  tyre: new THREE.CylinderGeometry(R, R, width, 16),
  hub: new THREE.CylinderGeometry(R * 0.55, R * 0.55, width + 0.04, 12),
});
// every mesh directly in `parent` but those in `keep`, joined with the others of its material into one mesh (their
// places baked in). Returns the merged mesh of each material (a Map)
const mergeByMaterial = (parent, keep) => {
  const buckets = new Map();
  for (const mesh of [...parent.children]) {
    if (!mesh.isMesh || keep.has(mesh)) continue;
    mesh.updateMatrix();
    const geo = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    const key = mesh.userData.plate ? mesh.userData.plate : mesh.material; // (a number plate is its own mesh per end, tagged userData.plate: render/platecosmetic.js hides it)
    if (!buckets.has(key)) buckets.set(key, { material: mesh.material, plate: mesh.userData.plate, geos: [] });
    buckets.get(key).geos.push(geo);
    mesh.geometry.dispose();
    parent.remove(mesh);
  }
  const out = new Map();
  for (const { material, plate, geos } of buckets.values()) {
    const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeometries(geos, false) : geos[0], material);
    for (const geo of geos) if (geos.length > 1) geo.dispose();
    if (plate) mesh.userData.plate = plate;
    parent.add(mesh);
    if (!plate) out.set(material, mesh);
  }
  return out;
};

// ---- the small canvas textures: drawn once, kept for every car that wears them -------------------------------------
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
// a hearse's side window: dark glass under an arched top, two drapes of pleated cloth gathered back to its sides with
// a scalloped pelmet across the top (cloth: [light, dark] of the pleats). Clear (alpha 0) outside the arch
const curtains = (key, cloth) => texture('curtains-' + key, 64, 32, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const arch = () => { ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, 7); ctx.quadraticCurveTo(0, 0, 8, 0); ctx.lineTo(w - 8, 0); ctx.quadraticCurveTo(w, 0, w, 7); ctx.lineTo(w, h); ctx.closePath(); };
  arch();
  ctx.fillStyle = '#1b2230';
  ctx.fill();
  ctx.save();
  arch();
  ctx.clip();
  const pleats = (x0, x1) => { for (let x = x0; x < x1; x += 2) { ctx.fillStyle = (x / 2) % 2 ? cloth[0] : cloth[1]; ctx.fillRect(x, 0, 2, h); } };
  for (const dir of [1, -1]) { // a drape each side: wide at the top, gathered in at a tie-back, flaring out to the sill
    ctx.save();
    if (dir < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(19, 0); ctx.quadraticCurveTo(9, 9, 8, 17); ctx.quadraticCurveTo(10, 25, 13, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.clip();
    pleats(0, 24);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(160,190,230,0.18)'; // a gleam across the glass between them
  ctx.beginPath(); ctx.moveTo(26, h); ctx.lineTo(36, 4); ctx.lineTo(42, 4); ctx.lineTo(32, h); ctx.fill();
  ctx.fillStyle = cloth[0]; // the pelmet, scalloped
  ctx.fillRect(0, 0, w, 3);
  for (let x = 4; x < w; x += 8) { ctx.beginPath(); ctx.arc(x, 3, 3, 0, Math.PI); ctx.fill(); }
  ctx.restore();
});

// flames for a flank, licking back from the front (u 0) to their tips (u 1): five tongues, each in three colours
// (fire: [outer, middle, core]), clear between them
const flames = (key, fire) => texture('flames-' + key, 128, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  // [top, bottom of its root at the front edge, reach (share of the picture)]: fat roots, each curling up to its tip
  const tongues = [[2, 28, 0.82], [14, 42, 1], [28, 54, 0.7], [40, 64, 0.52]];
  fire.forEach((colour, k) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const [y0, y1, reach] of tongues) {
      const a = y0 + k * 4, b = y1 - k * 4, tip = w * reach * (1 - k * 0.2), ty = Math.max(1, a - 8 + k * 2);
      ctx.moveTo(0, b);
      ctx.bezierCurveTo(tip * 0.35, b + 4, tip * 0.7, b - 4, tip, ty);
      ctx.bezierCurveTo(tip * 0.72, ty + 12, tip * 0.4, a - 4, 0, a);
      ctx.closePath();
    }
    ctx.fill();
  });
});

// worn paint (the bonnet and the roof): faded, sun-bleached patches and scratches. Neutral pale and dark marks, part
// see-through, so it suits any paint under it
const wear = () => texture('wear', 64, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 14; i++) { // sun-bleached blotches
    ctx.fillStyle = 'rgba(255,244,220,' + (0.06 + rnd() * 0.08).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 7, 1.5 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) { // scratches, light and dark
    ctx.strokeStyle = i % 3 ? 'rgba(255,240,220,0.28)' : 'rgba(30,18,10,0.3)';
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 4 + rnd() * 10;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
});

// rust eating through paint (the Junker's): a picture of four patches, one in each cell of it (RUST_CELLS), each a
// decal of its own shape. A patch lies where its `weight` says (fx, fy: 0 to 1 across the cell, fy 0 at its top) and
// thins out to nothing before the cell's edges (but its bottom, where `low` is set: the body's own lower edge), in
// smaller and sparser flecks, with a faint orange stain round it and streaks run down from it: no hard edge anywhere
const RUST_W = 256, RUST_H = 128;
const RUST_CELLS = {
  // [x, y, w, h] in px, how it lies, low
  sill: [[0, 0, 160, 56], (fx, fy) => fy ** 1.6 * (0.55 + 0.45 * Math.sin(fx * 9 + 1) ** 2), true],                 // the doors' bottoms
  arch: [[160, 0, 96, 60], (fx, fy) => Math.exp(-(((Math.hypot((fx - 0.5) / 0.44, (fy - 1.07) / 0.7) - 1) / 0.22) ** 2)), true], // round a wheel
  corner: [[0, 60, 40, 60], (fx, fy) => fy ** 1.2 * (0.5 + 0.5 * fx), true],                                         // a bottom corner
  tail: [[44, 64, 120, 40], (fx, fy) => fy ** 1.4 * (0.35 + 0.65 * Math.sin(fx * 5 + 0.6) ** 2), true],             // the tailgate's bottom
};
// the u, v range of a cell, for decal(); `flip` turns it round (the other flank's)
const rustCell = (name, flip = false) => {
  const [x, y, w, h] = RUST_CELLS[name][0], u = [x / RUST_W, (x + w) / RUST_W];
  return [flip ? [u[1], u[0]] : u, [1 - (y + h) / RUST_H, 1 - y / RUST_H]];
};
const rust = () => texture('rust', RUST_W, RUST_H, (ctx, W, H) => {
  ctx.clearRect(0, 0, W, H);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blob = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rnd() * 3, 0, Math.PI * 2); ctx.fill(); };
  for (const [[x0, y0, w, h], weight, low] of Object.values(RUST_CELLS)) {
    const fade = (fx, fy) => Math.min(1, Math.min(fx, 1 - fx, fy, low ? 1 : 1 - fy) / 0.2);
    const spots = [];
    for (let i = 0; i < w * h / 6; i++) {
      const fx = rnd(), fy = rnd(), k = Math.max(0, Math.min(1, weight(fx, fy))) * fade(fx, fy);
      if (rnd() < k) spots.push([x0 + fx * w, y0 + fy * h, k]);
      else if (rnd() < k * 0.35) spots.push([x0 + fx * w, y0 + fy * h, 0]); // (a lone fleck, out at its fringe)
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(122,62,24,0.22)'; // the stain the rust spreads round it
    for (const [x, y, k] of spots) if (k > 0.3) blob(x, y, 2 + k * 5, 1.5 + k * 3.5);
    ctx.strokeStyle = 'rgba(96,46,18,0.28)'; // streaks run down from it
    ctx.lineWidth = 1;
    for (const [x, y, k] of spots) if (k > 0.55 && rnd() < 0.12) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5), y + 3 + rnd() * 8); ctx.stroke(); }
    for (const [colour, min, size] of [['#7a3f1e', 0, 1], ['#9a5a2a', 0.35, 0.55], ['#4e2410', 0.6, 0.45]]) { // rust, flaking, the holes
      ctx.fillStyle = colour;
      for (const [x, y, k] of spots) if (k >= min && rnd() < 0.8) {
        const s = (0.6 + k * 3.2) * size;
        blob(x + (rnd() - 0.5) * s, y + (rnd() - 0.5) * s, s * (0.5 + rnd() * 0.6), s * (0.35 + rnd() * 0.45));
      }
    }
    ctx.fillStyle = 'rgba(230,200,160,0.35)'; // blistered paint at its edge
    for (const [x, y, k] of spots) if (k > 0.1 && k < 0.45 && rnd() < 0.25) blob(x, y - 1, 0.9, 0.7);
    ctx.restore();
  }
});

// a tarpaulin (the Junker's load), laid once over the whole heap (not repeated): u runs across it from the right hem
// over the ridge (u 0.5) to the left hem, v along it, from its back end (v 0 at the bed, TARP.m at the top of that
// end) to its front. The cloth's colour, sun-faded on top and grimy low down; creases running down the slopes and
// gathered in at the ends; two ropes lashed across it (on TARP.ropes), the cloth pulled into them; two stitched patches;
// a doubled hem with grommets, frayed at its edge. colours: [cloth, crease, rope]
const TARP = { z0: -2.44, z1: -0.46, m: 0.12, ropes: [-1.76, -1.14] };
const tarpV = (z) => TARP.m + (1 - 2 * TARP.m) * (z - TARP.z0) / (TARP.z1 - TARP.z0);
const tarpaulin = (key, [cloth, crease, rope]) => {
  const map = texture('tarp-' + key, 256, 256, (ctx, W, H) => {
    let seed = 5;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const top = TARP.m * H, end = (1 - TARP.m) * H, ropes = TARP.ropes.map(z => tarpV(z) * H);
    ctx.fillStyle = cloth;
    ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, colour) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    // sun-faded along the ridge, grimy towards the hems; blotches of each
    const across = ctx.createLinearGradient(0, 0, W, 0);
    for (const [at, colour] of [[0, 'rgba(20,12,4,0.32)'], [0.16, 'rgba(20,12,4,0)'], [0.42, 'rgba(255,246,225,0)'], [0.5, 'rgba(255,246,225,0.14)'], [0.58, 'rgba(255,246,225,0)'], [0.84, 'rgba(20,12,4,0)'], [1, 'rgba(20,12,4,0.32)']]) across.addColorStop(at, colour);
    ctx.fillStyle = across; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) glow(rnd() * W, rnd() * H, 18 + rnd() * 30, i % 3 ? 'rgba(255,246,225,0.1)' : 'rgba(25,15,5,0.16)');
    // a crease: a dark fold with the light catching its edge beside it
    // a crease: a soft, wide shadow of a fold with a darker core, and the light catching its edge beside it
    const fold = (x0, y0, cx, cy, x1, y1, width = 2) => {
      ctx.lineCap = 'round';
      for (const [dx, colour, lw, alpha] of [[0, crease, width * 2.6, 0.22], [0, crease, width, 0.4], [width * 0.9 + 1, '#fff6e6', width * 0.8, 0.12]]) {
        ctx.strokeStyle = colour; ctx.lineWidth = lw; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(x0 + dx, y0 - dx * 0.5); ctx.quadraticCurveTo(cx + dx, cy - dx * 0.5, x1 + dx, y1 - dx * 0.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    // creases down both slopes, from near the ridge to the hems, sagging between the ropes
    for (const dir of [-1, 1]) for (let i = 0; i < 8; i++) {
      const y = top + 8 + rnd() * (end - top - 16), x0 = W / 2 + dir * (8 + rnd() * 34), x1 = W / 2 + dir * (W / 2 - 6 - rnd() * 30);
      const y1 = y + (rnd() - 0.4) * 26;
      fold(x0, y, (x0 + x1) / 2, (y + y1) / 2 + (rnd() - 0.5) * 20, x1, y1, 2.5 + rnd() * 2);
    }
    // the ends: the cloth gathered down over them, in folds fanning from the top of each end to the bed
    for (const [y0, y1] of [[top, 0], [end, H]]) for (let i = 0; i < 9; i++) {
      const x1 = 10 + (i + rnd() * 0.6) * (W - 20) / 9;
      fold(W / 2 + (rnd() - 0.5) * 40, y0 + (y1 - y0) * 0.1, (W / 2 + x1) / 2, (y0 + y1) / 2, x1, y1, 2 + rnd());
    }
    // two patches, stitched on
    for (const [x, y, w, h, a] of [[40, 0.5 * H, 34, 26, 0.12], [176, 0.24 * H, 26, 20, -0.08]]) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = crease; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(255,246,225,0.1)'; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(240,230,205,0.75)'; ctx.setLineDash([2, 2]); ctx.strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5);
      ctx.setLineDash([]);
      ctx.restore();
    }
    // the ropes, lashed across: the cloth pulled into each (short creases running in to it), its shadow, the rope
    // twisted, and a hook at each hem
    for (const y of ropes) {
      for (let x = 20; x < W - 20; x += 30 + rnd() * 16) for (const s of [-1, 1]) {
        const l = 12 + rnd() * 10;
        fold(x + (rnd() - 0.5) * 12, y + s * l, x + s * 2, y + s * l * 0.4, x + (rnd() - 0.5) * 4, y + s * 4, 2);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, y + 1.5); ctx.lineTo(W, y + 1.5); ctx.stroke();
      ctx.strokeStyle = rope; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 4) { ctx.beginPath(); ctx.moveTo(x, y - 2.5); ctx.lineTo(x + 3, y + 2.5); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,230,0.3)';
      ctx.beginPath(); ctx.moveTo(0, y - 1.2); ctx.lineTo(W, y - 1.2); ctx.stroke();
      ctx.fillStyle = '#2b2d30';
      for (const x of [0, W - 6]) ctx.fillRect(x, y - 4, 6, 8);
    }
    // the hem: doubled (darker), stitched, grommets along it, frayed at its edge; and along the ends, on the bed
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, 9, H); ctx.fillRect(W - 9, 0, 9, H); ctx.fillRect(0, 0, W, 5); ctx.fillRect(0, H - 5, W, 5);
    ctx.strokeStyle = 'rgba(240,230,205,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    for (const x of [10.5, W - 10.5]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.setLineDash([]);
    for (let y = 14; y < H; y += 24) for (const x of [4.5, W - 4.5]) {
      ctx.fillStyle = '#c9c6ba'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d1d1f'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
      fold(x + (x < W / 2 ? 2 : -2), y + 2, x + (x < W / 2 ? 8 : -8), y + 12, x, y + 22, 1); // (the hem sags between them)
    }
    for (let i = 0; i < 70; i++) { // frayed
      const y = rnd() * H, x = rnd() < 0.5 ? rnd() * 3 : W - rnd() * 3;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,246,225,0.4)' : 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, y, 1 + rnd() * 2, 1);
    }
  });
  map.flipY = false; // (canvas row = v * height: the picture's top row is the back end)
  return map;
};

export const ORIG3_MODELS = {
  // The Hearse: a long seventies funeral coach in deep indigo (white for an Evil driver). A long, flat bonnet with
  // a chrome-framed upright grille of vertical bars between four round lamps in chrome bezels; a tall, long coach
  // body behind the front doors with arched, curtained windows, a blind landau quarter with a chrome S-bar, chrome
  // drip rails along the roof and a rear door with its own curtained window; tall tail lamps, chrome bumpers.
  hearse: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.36, WX = w / 2 - 0.04, WZ = L * 0.6, cw = w * 0.9;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), dark = lambert(0x121418);
    const cloth = new THREE.MeshLambertMaterial({ map: curtains('pale', ['#e4dff0', '#b5adc8']), alphaTest: 0.5 });
    const plate = lambert(0xece6cc);
    // the body below the waist: one long slab, the wheels standing at its corners
    side(group, paint, w, [[-L + 0.04, 0.32, 0.06], [L - 0.1, 0.32, 0.06], [L - 0.04, 0.5, 0.06],
      [L - 0.05, 0.9, 0.06], [L - 0.5, 0.95, 0.2], [0.98, 0.97, 0.1], [-L + 0.1, 0.97, 0.06], [-L + 0.04, 0.9, 0.06]], 0.04);
    // the coach: the cabin and its long roof, set in from the body's sides (a shoulder for the chrome waist strip)
    side(group, paint, cw, [[1.02, 0.94], [0.3, 1.56, 0.06], [-2.42, 1.58, 0.14], [-2.7, 1.4, 0.08], [-2.7, 0.94]], 0.05);
    const rise = Math.atan2(0.62, 0.72);
    slab(group, glass, cw - 0.2, 0.02, 0.8, 0, 1.295, 0.7, rise);               // the windscreen
    for (const s of [-1, 1]) {
      const x = s * (cw / 2 + 0.006);
      prism(group, glass, 0.02, [[0.8, 1.06], [0.36, 1.5], [-0.4, 1.5], [-0.4, 1.06]], x);  // the front door's window
      decal(group, cloth, 1.26, 0.44, x + s * 0.004, 1.28, -1.18, s > 0 ? 'x' : '-x');     // the long curtained window
      // the landau bar: an S of chrome on the blind quarter behind it
      for (const [dz, turn] of [[0.11, 0], [-0.11, Math.PI]]) { // (a top half and a bottom half, end to end: a long S)
        const geo = new THREE.TorusGeometry(0.11, 0.016, 4, 8, Math.PI).rotateZ(turn).rotateY(Math.PI / 2);
        place(group, geo, chrome, x + s * 0.012, 1.3, -2.2 + dz);
      }
      box(group, chrome, 0.025, 0.025, 2.72, s * (cw / 2 + 0.012), 1.56, -1.06);          // the drip rail along the roof
      box(group, chrome, 0.03, 0.03, L * 2 - 0.3, s * (w / 2 + 0.008), 0.95, 0);         // the chrome waist strip
      box(group, chrome, 0.1, 0.03, 0.03, s * (w / 2 + 0.05), 1.0, 0.7);                 // the mirror on its stalk
      box(group, chrome, 0.05, 0.1, 0.12, s * (w / 2 + 0.11), 1.03, 0.7);
      // the front: four round lamps, two to a chrome bezel, an indicator under each pair
      box(group, chrome, 0.46, 0.24, 0.04, s * 0.66, 0.72, L);
      for (const x of [0.55, 0.77]) {
        rod(group, LAMP, 0.085, 0.04, s * x, 0.72, L + 0.02, 'z', 14);
      }
      box(group, AMBER, 0.24, 0.07, 0.04, s * 0.66, 0.53, L - 0.01);
      // the tail: tall lamps at the corners (tail lamp over brake lamp)
      box(group, TAIL, 0.14, 0.2, 0.04, s * 0.86, 0.84, -L);
      box(group, BRAKE, 0.14, 0.14, 0.04, s * 0.86, 0.66, -L);
    }
    // the grille: an upright chrome frame with an arched top, dark behind its vertical bars, a mascot on top
    box(group, chrome, 0.5, 0.4, 0.06, 0, 0.66, L);
    place(group, new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), chrome, 0, 0.86, L);
    box(group, dark, 0.4, 0.34, 0.03, 0, 0.67, L + 0.025);
    for (let i = -3; i <= 3; i++) box(group, chrome, 0.022, 0.32, 0.03, i * 0.055, 0.67, L + 0.035);
    rod(group, chrome, 0.03, 0.08, 0, 1.13, L - 0.06, 'y', 6);
    box(group, chrome, w + 0.02, 0.14, 0.14, 0, 0.4, L + 0.02);                            // bumpers
    box(group, chrome, w + 0.02, 0.14, 0.14, 0, 0.4, -L - 0.02);
    box(group, plate, 0.46, 0.13, 0.02, 0, 0.66, -L - 0.005).userData.plate = 'rear';       // the number plate
    decal(group, cloth, cw * 0.62, 0.36, 0, 1.18, -2.7 - 0.05 - 0.006, '-z');                // the rear door's curtained window
    const keep = new Set();
    const geo = wheelGeo(R, 0.28), tyre = lambert(0x141414), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [WZ, -WZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => {
        cloth.map = evil ? curtains('dark', ['#6a3290', '#3a1850']) : curtains('pale', ['#e4dff0', '#b5adc8']);
        chrome.color.setHex(evil ? 0x8a919b : CHROME); // (on a white body bright chrome is lost: a darker steel shows its lines)
      },
    };
    group.userData.livery(false);
    return group;
  },

  // The Hot Rod: a chopped thirties five-window coupe on its frame with no wings (a highboy), purple with flames. A tall
  // chrome grille shell up front with its bars, a long narrow bonnet with louvres, flames licking back along it from the
  // grille, big lamps in chrome buckets on posts, a beam axle and its spring out in the open; a small cab with a
  // chopped, blue-tinted windscreen; fat tyres at the back and skinny ones at the front. The whole body shakes on its
  // springs as the engine idles. (Also the earned Hell Rod's model, in flames of its own colours.)
  hotrod: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const L = car.hl, RR = 0.5, RF = 0.34, bw = 1.16;
    const paint = lambert(car.color), glass = lambert(0x2c4470), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const plate = lambert(0xf2d21f);
    const hell = car.id === 'hellrod';
    const palette = (evil) => hell ? (evil ? ['good', ['#d8261c', '#ff8a1a', '#ffd23f']] : ['soot', ['#120604', '#5a0d0a', '#c81e1e']])
      : evil ? ['evil', ['#5a0a0a', '#c81e1e', '#ff6a1a']] : ['good', ['#d8261c', '#ff8a1a', '#ffd23f']];
    const fire = new THREE.MeshLambertMaterial({ alphaTest: 0.5 });
    // the body: a tub from the cowl back, its tail rounded down over the rear axle
    side(shell, paint, bw, [[-1.92, 0.52, 0.04], [0.48, 0.52], [0.48, 0.9], [-0.8, 0.9], [-1.6, 0.89, 0.26], [-1.92, 0.76, 0.12]], 0.04);
    taper(shell, paint, [0.46, bw - 0.04, 0.52, 0.92], [0.66, 0.74, 0.56, 0.95]);              // the cowl, narrowing to the bonnet
    side(shell, paint, 0.72, [[0.62, 0.56], [1.62, 0.56], [1.62, 0.92, 0.05], [0.62, 0.95]], 0.04); // the long, narrow bonnet
    // the cab, chopped: a low roof over a short windscreen
    side(shell, paint, 1.06, [[0.42, 0.88], [0.4, 1.12, 0.03], [-0.5, 1.15, 0.12], [-0.8, 1.0, 0.12], [-0.82, 0.88]], 0.05);
    box(shell, glass, 0.88, 0.17, 0.02, 0, 1.03, 0.46);                                          // the windscreen,
    box(shell, chrome, 0.94, 0.025, 0.03, 0, 1.125, 0.465);                                       // its chrome top,
    slab(shell, glass, 0.5, 0.02, 0.16, 0, 1.12, -0.77, -0.75);                                    // and a little rear window
    // the grille shell: chrome, tall and upright, dark behind its bars, a mascot on top
    prism(shell, chrome, 0.62, [[1.6, 0.44], [1.78, 0.44], [1.78, 1.0, 0.06], [1.6, 1.04, 0.04]]);
    box(shell, dark, 0.48, 0.48, 0.02, 0, 0.73, 1.785);
    for (let i = -4; i <= 4; i++) box(shell, chrome, 0.018, 0.46, 0.02, i * 0.05, 0.73, 1.795);
    rod(shell, chrome, 0.025, 0.08, 0, 1.08, 1.7, 'y', 6);
    for (const s of [-1, 1]) {
      const x = s * (bw / 2 + 0.006);
      prism(shell, glass, 0.02, [[0.3, 0.95], [0.3, 1.09], [-0.3, 1.11], [-0.3, 0.95]], x);          // the door's window
      prism(shell, glass, 0.02, [[-0.4, 0.95], [-0.4, 1.1], [-0.56, 1.08], [-0.68, 0.95]], x);       // and the quarter window
      box(shell, chrome, 0.12, 0.025, 0.025, s * (bw / 2 + 0.05), 0.95, 0.36);                     // a mirror on its stalk
      box(shell, chrome, 0.03, 0.07, 0.09, s * (bw / 2 + 0.11), 0.98, 0.36);
      // the bonnet's flank: flames from the grille back, louvres over their tips
      decal(shell, fire, 1.0, 0.34, s * 0.366, 0.75, 1.12, s > 0 ? 'x' : '-x', s > 0 ? [0, 0.66] : [0.66, 0]);
      decal(shell, fire, 0.62, 0.32, x + s * 0.002, 0.72, 0.13, s > 0 ? 'x' : '-x', s > 0 ? [0.68, 1] : [1, 0.68]);
      for (let i = 0; i < 6; i++) box(shell, dark, 0.012, 0.016, 0.16, s * 0.367, 0.9 - (i % 2) * 0.035, 0.62 + 0.14 + Math.floor(i / 2) * 0.2);
      rod(shell, chrome, 0.045, 1.4, s * 0.52, 0.44, 0.18, 'z', 8);                                // the side pipes, under the doors
      // lamps in chrome buckets on posts by the grille, an indicator on each post
      rod(shell, chrome, 0.02, 0.4, s * 0.48, 0.7, 1.62, 'y', 6);
      rod(shell, chrome, 0.12, 0.16, s * 0.48, 0.92, 1.64, 'z', 12, 0.07);
      rod(shell, LAMP, 0.1, 0.02, s * 0.48, 0.92, 1.72, 'z', 12);
      rod(shell, AMBER, 0.035, 0.05, s * 0.48, 0.66, 1.65, 'z', 8);
      // the tail: round tail lamps beside brake lamps on the back panel
      rod(shell, TAIL, 0.055, 0.04, s * 0.42, 0.66, -1.96, 'z', 10);
      rod(shell, BRAKE, 0.045, 0.04, s * 0.29, 0.66, -1.96, 'z', 10);
      box(shell, trim, 0.1, 0.1, 3.5, s * 0.36, 0.44, -0.12);                                      // the frame rails
    }
    box(shell, trim, 0.82, 0.06, 0.06, 0, 0.6, 1.62);                                              // the lamps' cross bar
    box(shell, chrome, 0.56, 0.05, 0.05, 0, 0.42, 2.0);                                            // a nerf bar in front,
    for (const s of [-1, 1]) box(shell, chrome, 0.04, 0.04, 0.24, s * 0.26, 0.42, 1.88);
    box(shell, chrome, 0.9, 0.06, 0.06, 0, 0.44, -2.02);                                           // and one behind
    for (const s of [-1, 1]) box(shell, chrome, 0.04, 0.04, 0.16, s * 0.4, 0.44, -1.94);
    box(shell, plate, 0.3, 0.12, 0.02, 0, 0.64, -1.965).userData.plate = 'rear';                    // the number plate
    // the front axle out in the open: a dropped beam and the spring across over it
    box(shell, trim, 1.36, 0.07, 0.07, 0, RF + 0.02, L * 0.66);
    box(shell, chrome, 0.9, 0.04, 0.09, 0, 0.5, L * 0.66);
    const keep = new Set();
    const rear = wheelGeo(RR, 0.42), front = wheelGeo(RF, 0.2), tyre = lambert(0x141414);
    for (const s of [-1, 1]) {
      for (const part of wheel(group, rear, s * 0.82, RR, -L * 0.6, tyre, chrome)) keep.add(part);   // fat ones at the back,
      for (const part of wheel(group, front, s * 0.756, RF, L * 0.66, tyre, chrome)) keep.add(part); // skinny ones in front
    }
    const merged = mergeByMaterial(shell, keep);
    group.userData = {
      body: merged.get(paint),
      animate: (t) => { // (a lumpy idle: the body shakes on its springs)
        shell.rotation.z = Math.sin(t * 31) * 0.005;
        shell.position.y = Math.abs(Math.sin(t * 15.5)) * 0.008;
      },
      livery: (evil) => { const [key, colours] = palette(evil); fire.map = flames(key, colours); fire.needsUpdate = true; },
    };
    group.userData.livery(false);
    return group;
  },

  // The Minivan: a nineties people carrier (a one-box van after the Astro): a tall wedge of a body with a short, sloping
  // nose and a big raked windscreen, three rows of side windows (a front door, a sliding door, a rear
  // quarter), a chrome-framed black grille between rectangular lamps, wraparound indicators, a pale bumper and valance,
  // tall tail lamps up the rear corners, a high brake lamp, a rear window, silver hubs. Its bumpers turn
  // charcoal for an Evil driver.
  minivan: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.38, WX = w / 2 - 0.04, WZ = L * 0.6;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const bumper = lambert(0xd6d0c0), plate = lambert(0xece6cc);
    // the one box of a body: the nose sloping up to the windscreen, the windscreen up to the roof, the roof back to the tail
    side(group, paint, w, [[-L + 0.06, 0.34, 0.06], [L - 0.06, 0.34, 0.04], [L - 0.06, 0.84, 0.1],
      [1.55, 1.14, 0.12], [0.72, 1.9, 0.14], [-L + 0.2, 1.93, 0.14], [-L + 0.06, 1.84, 0.08]], 0.06);
    const rise = Math.atan2(0.76, 0.83);
    slab(group, glass, w - 0.26, 0.02, 1.0, 0, 1.52 + 0.05, 1.135 + 0.048, rise);           // the big raked windscreen
    for (const s of [-1, 1]) {
      const x = s * (w / 2 + 0.006), X = s * (w / 2 + 0.003);
      prism(group, glass, 0.02, [[1.38, 1.24], [0.8, 1.8], [0.26, 1.8], [0.26, 1.24]], x);         // the front door's window,
      prism(group, glass, 0.02, [[0.12, 1.24], [0.12, 1.8], [-0.94, 1.8], [-0.94, 1.24]], x);      // the sliding door's,
      prism(group, glass, 0.02, [[-1.1, 1.24], [-1.1, 1.8], [-2.12, 1.8], [-2.2, 1.24]], x);       // and the rear quarter's
      for (const z of [0.19, -1.02]) box(group, trim, 0.012, 0.56, 0.16, X + s * 0.004, 1.52, z); // the pillars between, blacked out
      box(group, trim, 0.12, 0.03, 0.05, s * (w / 2 + 0.05), 1.28, 1.3);                      // the mirror on its arm
      box(group, trim, 0.05, 0.16, 0.2, s * (w / 2 + 0.11), 1.3, 1.3);
      // the front: a rectangular lamp each side in a chrome bezel, an indicator outboard
      box(group, chrome, 0.44, 0.24, 0.03, s * 0.66, 0.72, L);
      box(group, LAMP, 0.38, 0.18, 0.03, s * 0.66, 0.72, L + 0.012);
      box(group, AMBER, 0.16, 0.18, 0.03, s * 0.96, 0.72, L - 0.005);
      // the tail: tall lamps up the corners (tail lamp over brake lamp)
      box(group, TAIL, 0.16, 0.22, 0.03, s * 0.9, 1.12, -L);
      box(group, BRAKE, 0.16, 0.18, 0.03, s * 0.9, 0.92, -L);
    }
    // the grille: chrome-framed, black, three chrome bars across
    box(group, chrome, 0.78, 0.28, 0.03, 0, 0.72, L);
    box(group, dark, 0.7, 0.2, 0.03, 0, 0.72, L + 0.01);
    for (const y of [0.66, 0.72, 0.78]) box(group, chrome, 0.68, 0.018, 0.02, 0, y, L + 0.025);
    box(group, bumper, w + 0.02, 0.24, 0.16, 0, 0.42, L + 0.02);                             // the pale bumper,
    box(group, trim, w * 0.5, 0.06, 0.03, 0, 0.38, L + 0.1);                                 // its slot of an intake,
    box(group, plate, 0.44, 0.12, 0.02, 0, 0.47, L + 0.105).userData.plate = 'front';          // and the plate on it
    box(group, bumper, w + 0.02, 0.24, 0.16, 0, 0.42, -L - 0.02);                            // the rear bumper,
    box(group, plate, 0.44, 0.13, 0.02, 0, 0.72, -L - 0.005).userData.plate = 'rear';         // the plate over it,
    box(group, glass, w - 0.42, 0.56, 0.02, 0, 1.48, -L - 0.005);                            // its window,
    box(group, BRAKE, 0.36, 0.05, 0.03, 0, 1.82, -L - 0.005);                                // and a brake lamp over it
    const keep = new Set();
    const geo = wheelGeo(R, 0.28), tyre = lambert(0x141414), hub = lambert(0xc4c8ce);
    for (const s of [-1, 1]) for (const z of [WZ, -WZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => bumper.color.setHex(evil ? 0x2e3036 : 0xd6d0c0),
    };
    group.userData.livery(false);
    return group;
  },

  // The Pick-Up: a lifted seventies square-body pickup, orange, worked hard. A big dark bull bar across its nose, a
  // wide grille between square lamps, a worn bonnet and roof (sun-bleached, scratched); a square cab with a
  // sports bar of spot lamps over its roof; an open bed with wheel tubs, a tailgate and tall tail lamps;
  // chunky tyres, and the lift showing beneath: the frame, the axles and long shocks.
  pickup: (car) => {
    const group = new THREE.Group();
    const L = car.hl, w = car.hw * 2, R = 0.48, WX = w / 2 - 0.05, FZ = L * 0.62, RZ = -L * 0.6, ucw = w * 0.92;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(CHROME), trim = lambert(TRIM), dark = lambert(0x121418);
    const bar = lambert(0x1d2238), plate = lambert(0xece6cc);
    const worn = new THREE.MeshLambertMaterial({ map: wear(), transparent: true, depthWrite: false });
    // the front end and the cab's doors, below the waist
    side(group, paint, w, [[2.5, 0.95, 0.04], [2.52, 1.5, 0.05], [0.4, 1.5], [-0.6, 1.5], [-0.6, 0.95]], 0.05);
    // the cab above it, a little narrower
    side(group, paint, ucw, [[0.84, 1.46], [0.44, 1.98, 0.05], [-0.5, 2.0, 0.06], [-0.58, 1.46]], 0.05);
    const rise = Math.atan2(0.52, 0.4);
    slab(group, glass, ucw - 0.16, 0.02, 0.54, 0, 1.722 + 0.04, 0.64 + 0.04, rise);          // the windscreen
    box(group, glass, ucw - 0.4, 0.3, 0.02, 0, 1.76, -0.636);                                 // the back window
    decal(group, worn, w - 0.22, 1.56, 0, 1.556, 1.66, 'y');                                  // the worn bonnet,
    decal(group, worn, ucw - 0.16, 0.8, 0, 2.054, -0.03, 'y', [0.2, 0.8]);                    // and roof
    // the bed: its sides, the headboard, floor, wheel tubs and tailgate
    for (const s of [-1, 1]) side(group, paint, 0.1, [[-0.66, 0.95], [-0.66, 1.56, 0.03], [-2.55, 1.56, 0.03], [-2.55, 0.95]], 0.02, s * (w / 2 - 0.05));
    box(group, paint, w - 0.2, 0.56, 0.08, 0, 1.25, -0.7);
    box(group, trim, w - 0.2, 0.04, 1.82, 0, 1.15, -1.62);
    for (const s of [-1, 1]) box(group, paint, 0.32, 0.26, 1.04, s * (w / 2 - 0.26), 1.28, RZ);
    box(group, paint, w - 0.2, 0.56, 0.08, 0, 1.25, -2.51);
    for (const s of [-1, 1]) {
      const x = s * (ucw / 2 + 0.006);
      prism(group, glass, 0.02, [[0.68, 1.56], [0.38, 1.92], [-0.18, 1.92], [-0.18, 1.56]], x);  // the door's window
      box(group, chrome, 0.14, 0.03, 0.03, s * (ucw / 2 + 0.07), 1.58, 0.66);                 // a big square mirror on its arm
      box(group, chrome, 0.04, 0.26, 0.16, s * (ucw / 2 + 0.15), 1.66, 0.66);
      // the front: square lamps in chrome bezels, an indicator under each
      box(group, chrome, 0.32, 0.26, 0.03, s * 0.74, 1.28, 2.58);
      box(group, LAMP, 0.24, 0.2, 0.03, s * 0.74, 1.28, 2.593);
      box(group, AMBER, 0.28, 0.08, 0.03, s * 0.74, 1.08, 2.58);
      // the tail: tall lamps on the bed's corners (tail lamp over brake lamp)
      box(group, TAIL, 0.1, 0.16, 0.03, s * 0.98, 1.44, -2.56);
      box(group, BRAKE, 0.1, 0.12, 0.03, s * 0.98, 1.29, -2.56);
      // the lift: long shocks at each wheel, the frame rails
      for (const z of [FZ, RZ]) box(group, trim, 0.07, 0.56, 0.07, s * 0.62, 0.74, z - 0.18);
      box(group, trim, 0.1, 0.14, 4.6, s * 0.48, 0.86, 0);
      // the sports bar over the bed, just behind the cab
      rod(group, bar, 0.04, 0.62, s * 0.86, 1.86, -0.82, 'y', 8);
      for (const x of [0.22, 0.58]) {
        rod(group, bar, 0.09, 0.1, s * x, 2.2, -0.8, 'z', 10);
        rod(group, LAMP, 0.075, 0.02, s * x, 2.2, -0.745, 'z', 10);
      }
    }
    box(group, bar, 1.82, 0.08, 0.08, 0, 2.15, -0.82);
    // the grille: chrome framed, dark, a bar across it
    box(group, chrome, 0.98, 0.32, 0.03, 0, 1.26, 2.58);
    box(group, dark, 0.92, 0.26, 0.03, 0, 1.26, 2.59);
    box(group, chrome, 0.9, 0.03, 0.02, 0, 1.26, 2.605);
    // the bull bar: a heavy bumper with uprights and a hoop over the grille
    box(group, bar, w + 0.12, 0.28, 0.22, 0, 0.98, 2.66);
    for (const x of [-0.42, 0.42]) box(group, bar, 0.08, 0.62, 0.08, x, 1.34, 2.72);
    box(group, bar, 0.92, 0.08, 0.08, 0, 1.62, 2.72);
    for (const s of [-1, 1]) box(group, bar, 0.08, 0.08, 0.22, s * 0.42, 1.62, 2.64);
    box(group, plate, 0.4, 0.12, 0.02, 0, 0.98, 2.775).userData.plate = 'front';
    box(group, chrome, w + 0.06, 0.18, 0.18, 0, 0.98, -2.62);                                 // a step bumper behind
    box(group, plate, 0.4, 0.14, 0.02, 0, 0.98, -2.715).userData.plate = 'rear';
    for (const z of [FZ, RZ]) rod(group, trim, 0.07, 1.7, 0, R, z, 'x', 8);                   // the axles
    const keep = new Set();
    const geo = wheelGeo(R, 0.42), tyre = lambert(0x141414), hub = lambert(0xb8bcc2);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(group, keep);
    group.userData = {
      body: merged.get(paint),
      animate: () => {},
      livery: (evil) => bar.color.setHex(evil ? 0x17181b : 0x1d2238),
    };
    group.userData.livery(false);
    return group;
  },

  // The Junker: a battered seventies pickup, stubby and boxy, with a lumpy load under a tarpaulin. Flat slab sides, the
  // wheels at their corners; a flat, wide face: two round lamps stacked at each corner in chrome rims, an upright chrome
  // grille of bars between them, a low bumper; a short bonnet; a square cab with a flat, overhanging roof in a darker
  // shade and big dark glass; in the short bed one long tent of a tarpaulin, peaked like a ridge and higher than the cab,
  // lashed with green rope. Rust eats the paint. It shudders as it idles.
  junker: (car) => {
    const group = new THREE.Group(), shell = new THREE.Group();
    group.add(shell);
    const L = car.hl, R = 0.42, WX = 0.95, FZ = L * 0.62, RZ = -L * 0.6;
    const paint = lambert(car.color), glass = lambert(GLASS), chrome = lambert(0xc4c7cb), dark = lambert(0x121418);
    const roof = lambert(0x4f5532), bumper = lambert(0x7d8794), plate = lambert(0xece6cc);
    const cover = new THREE.MeshLambertMaterial({ vertexColors: true });
    // the body: one flat-sided slab from the nose (its face leaning back at the bottom) to the tailgate, low in front
    // where the bonnet and the wings sit on it, the bed's sides level behind the cab; the wheels stand at its corners
    side(shell, paint, car.hw * 2, [[2.32, 0.46], [2.38, 0.92], [1.1, 0.92], [1.1, 1.18], [-2.45, 1.18, 0.03], [-2.45, 0.46]], 0.04, 0, 3);
    // the front: the wings, raised a little over the bonnet's edges and rounded down at the front; between them the
    // bonnet, crowned (higher down its middle), its front edge hanging over the grille
    for (const s of [-1, 1]) side(shell, paint, 0.38, [[1.1, 0.9], [2.3, 0.9], [2.34, 1.02, 0.08], [2.16, 1.2, 0.16], [1.1, 1.21]], 0.06, s * 0.81, 3);
    const crown = new THREE.ExtrudeGeometry(outline([[-0.64, 0.92], [0.64, 0.92], [0.64, 1.1, 0.08], [0, 1.22, 0.6], [-0.64, 1.1, 0.08]]),
      { depth: 1.36, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1 });
    place(shell, crown.translate(0, 0, 1.12), roof);                                            // (in the darker shade)
    // the cab: square, close behind the bonnet, its windscreen raked, a flat roof overhanging it in a darker shade
    side(shell, paint, 1.9, [[1.12, 1.14], [0.78, 1.74], [-0.38, 1.74], [-0.38, 1.14]], 0.03);
    box(shell, roof, 1.98, 0.05, 1.3, 0, 1.79, 0.19);
    const rake = Math.atan2(0.6, 0.34);
    slab(shell, glass, 1.66, 0.02, 0.62, 0, 1.44 + 0.03 * Math.cos(rake), 0.95 + 0.03 * Math.sin(rake), rake); // big dark glass:
    for (const s of [-1, 1]) prism(shell, glass, 0.02, [[0.98, 1.24], [0.76, 1.64], [-0.28, 1.64], [-0.28, 1.24]], s * 0.956);
    box(shell, glass, 1.3, 0.3, 0.02, 0, 1.45, -0.42);
    // the face: a chrome-framed grille of upright bars, a shield raked forward a little, its top up under the bonnet's
    // edge; round pods either side standing out from it, two lamps stacked in each; a bumper bar wrapping the corners
    const grille = new THREE.Group();
    grille.position.set(0, 0.82, 2.42);
    grille.rotation.x = 0.1;
    box(grille, chrome, 0.98, 0.6, 0.04, 0, 0, 0);
    box(grille, dark, 0.86, 0.5, 0.04, 0, 0, 0.01);
    for (let i = -4; i <= 4; i++) box(grille, chrome, 0.035, 0.48, 0.03, i * 0.09, 0, 0.03);
    grille.updateMatrix();
    for (const mesh of mergeByMaterial(grille, new Set()).values()) { mesh.geometry.applyMatrix4(grille.matrix); shell.add(mesh); } // (into the shell, to be merged with its like)
    const pod = new THREE.ExtrudeGeometry(outline([[-0.17, 0.58, 0.16], [0.17, 0.58, 0.16], [0.17, 1.14, 0.16], [-0.17, 1.14, 0.16]]),
      { depth: 0.24, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 1 });
    pod.translate(0, 0, 2.26);
    box(shell, bumper, 1.5, 0.16, 0.16, 0, 0.44, 2.56);
    for (const s of [-1, 1]) {
      place(shell, s > 0 ? pod : pod.clone(), paint, s * 0.8);
      box(shell, bumper, 0.44, 0.16, 0.16, s * 0.88, 0.44, 2.42).rotation.y = s * 0.7;      // (the bumper's ends, round the corners)
    }
    box(shell, bumper, 2.0, 0.16, 0.16, 0, 0.44, -2.52);
    for (const s of [-1, 1]) {
      for (const y of [1.0, 0.74]) {
        rod(shell, chrome, 0.11, 0.04, s * 0.8, y, 2.56, 'z', 10);
        rod(shell, LAMP, 0.085, 0.04, s * 0.8, y, 2.57, 'z', 10);
      }
      box(shell, AMBER, 0.14, 0.05, 0.03, s * 0.5, 0.58, 2.42);                                // indicators
      box(shell, dark, 0.05, 0.16, 0.12, s * 1.0, 1.4, 1.0);                                   // mirrors
      // the tail: tall lamps at the corners (tail lamp over brake lamp)
      box(shell, TAIL, 0.14, 0.14, 0.03, s * 0.84, 1.02, -2.495);
      box(shell, BRAKE, 0.14, 0.12, 0.03, s * 0.84, 0.89, -2.495);
    }
    box(shell, plate, 0.34, 0.13, 0.02, 0, 0.8, -2.495).userData.plate = 'rear';
    // rust, eating the paint: along the bottoms of the doors, round both wheels, the back corners and the tailgate's
    // bottom; each patch fades out in flecks before its decal's edge (see rust), and both flanks match (mirrored)
    const rusty = new THREE.MeshLambertMaterial({ map: rust(), transparent: true, depthWrite: false });
    for (const s of [-1, 1]) {
      const X = s * 1.006, f = s > 0 ? 'x' : '-x', flip = s < 0;
      decal(shell, rusty, 1.45, 0.5, X, 0.715, 0.32, f, ...rustCell('sill', flip));
      for (const z of [FZ, RZ]) decal(shell, rusty, 1.1, 0.68, X, 0.805, z, f, ...rustCell('arch', flip !== (z < 0)));
      decal(shell, rusty, 0.3, 0.45, X, 0.69, -2.28, f, ...rustCell('corner', flip));
    }
    decal(shell, rusty, 0.75, 0.25, -0.45, 0.66, -2.496, '-z', ...rustCell('tail'));             // (the tailgate's face: the
    decal(shell, rusty, 0.45, 0.15, 0.55, 0.6, -2.496,  '-z', ...rustCell('tail', true));        // body's bevel puts it at -2.49)
    // the load: one long tent of a tarpaulin, peaked, higher than the cab, wider than the bed, soft at its ends; lumps
    // of the load bulge it, the two ropes pull it in where they cross, it sags between, darker in its hollows and low
    // down (vertex colours), its creases smooth (not faceted). One picture laid over it all (tarpaulin: u across from
    // hem to hem, v along it), so nothing repeats
    const heap = outline([[-1.06, 1.17], [1.06, 1.17, 0.06], [0.58, 1.66, 0.2], [0.04, 2.04, 0.3], [-0.6, 1.64, 0.2]]);
    const ridge = new THREE.ExtrudeGeometry(heap, { depth: 1.86, steps: 6, curveSegments: 3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 1 });
    ridge.translate(0, 0, -2.38);
    // the arc over the top, from the right hem over the ridge to the left hem, its length so far at each point
    const arc = heap.extractPoints(3).shape.slice(1).concat(heap.extractPoints(3).shape[0]), run = [0];
    for (let i = 1; i < arc.length; i++) run.push(run[i - 1] + arc[i].distanceTo(arc[i - 1]));
    const across = (x, y) => { // (the share of the arc to the point on it nearest x, y)
      let best = Infinity, at = 0;
      for (let i = 1; i < arc.length; i++) {
        const a = arc[i - 1], dx = arc[i].x - a.x, dy = arc[i].y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
        const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y);
        if (d < best) { best = d; at = run[i - 1] + t * (run[i] - run[i - 1]); }
      }
      return at / run[run.length - 1];
    };
    const lumps = [[0.62, 1.68, -2.02, 0.09, 0.3], [-0.58, 1.72, -1.45, 0.1, 0.32], [0.12, 2.0, -0.84, 0.07, 0.26], [0.3, 1.86, -1.45, -0.07, 0.28], [-0.4, 1.8, -2.1, -0.05, 0.26]];
    const pos = ridge.attributes.position, n = pos.count, uv = ridge.attributes.uv, shade = new Float32Array(n * 3);
    const caps = ridge.groups[0].count; // (the end caps come first, then the sides)
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const u = across(x, y), up = Math.max(0, Math.min(1, (y - 1.17) / 0.87));
      uv.setXY(i, u, i < caps ? (z < -1.45 ? TARP.m * up : 1 - TARP.m * up) : tarpV(z));
      // the lumps under it and the ropes' pull (by place, so the caps and the sides still meet), the most up top
      let bump = 0;
      for (const [lx, ly, lz, a, r] of lumps) bump += a * Math.exp(-((x - lx) ** 2 + (y - ly) ** 2 + (z - lz) ** 2) / (r * r));
      const pull = TARP.ropes.reduce((p, rz) => p - 0.045 * Math.exp(-(((z - rz) / 0.05) ** 2)), 0);
      const lift = (bump + pull) * Math.max(0, Math.min(1, (y - 1.17) / 0.35)), d = Math.hypot(x, y - 1.25) || 1;
      // (a pillow: lower and narrower towards each end)
      const t = (z + 1.45) / 0.99, f = 1 - 0.32 * t ** 4;
      pos.setXYZ(i, (x + lift * x / d) * (1 - 0.06 * t ** 4), 1.17 + (y + lift * (y - 1.25) / d - 1.17) * f, z);
      const c = Math.max(0.5, Math.min(1, 0.97 - 0.3 * (1 - Math.min(1, up / 0.5)) ** 2 + 2.2 * Math.min(0, bump) + pull * 2.5));
      shade.set([c, c, c], i * 3);
    }
    ridge.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
    ridge.computeVertexNormals();
    { // smooth the sides' normals (the caps stay flat; the hidden underside is left out)
      const nrm = ridge.attributes.normal, sum = new Map(), key = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
      for (let i = caps; i < n; i++) if (nrm.getY(i) > -0.7) {
        const k = key(i), v = sum.get(k) || new THREE.Vector3();
        sum.set(k, v.add(new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i))));
      }
      for (let i = caps; i < n; i++) if (nrm.getY(i) > -0.7) { const v = sum.get(key(i)).clone().normalize(); nrm.setXYZ(i, v.x, v.y, v.z); }
    }
    const keep = new Set();
    const geo = wheelGeo(R, 0.3), tyre = lambert(0x141414), hub = lambert(0xa8acb2);
    for (const s of [-1, 1]) for (const z of [FZ, RZ]) for (const part of wheel(group, geo, s * WX, R, z, tyre, hub)) keep.add(part);
    const merged = mergeByMaterial(shell, keep);
    place(shell, ridge, cover).userData.prop = 'cargo'; // (tagged: a chosen cargo prop hides the tarp load) (after the merge, a mesh of its own: merging would drop its colours)
    merged.get(rusty).renderOrder = 1; // (after the body even when the game makes the body see-through-able for a ghost)
    group.userData = {
      body: merged.get(paint),
      livery: (evil) => {
        cover.map = tarpaulin(evil ? 'evil' : 'good', evil ? ['#c98a3e', '#9a6228', '#2f6a24'] : ['#8a55c0', '#63399a', '#2f6a24']);
        cover.needsUpdate = true;
        roof.color.setHex(evil ? 0x4a4845 : 0x4f5532);
      },
      // a Legendary Junker's load cover (render/legenddecal.js): the same cloth drawn in golds, on both sides
      legendTouch: () => { cover.map = tarpaulin('gold', ['#c99a2e', '#8e6a18', '#5a4210']); cover.needsUpdate = true; },
      animate: (t) => { // a rough idle: the body shudders on its springs
        shell.position.y = Math.sin(t * 31) * 0.012;
        shell.rotation.z = Math.sin(t * 23) * 0.008;
      },
    };
    group.userData.livery(false);
    return group;
  },
};
