// ---- the LEGENDARY cars' look (the owner, 14-Oct: "The reserved colour scheme will be Black with gold trim. Legendary
// cars should have a large gold winner's wreath at the rear quarter of their sides"; then "Draw the wreath with no lines
// nor extra details. It is two colours, maximum ... making it big, wrapping over non-wheel and non-window elements
// only; stylistically rotating it 35 degrees, so it is a motif like Jaguar's on their XJ220"). A Legendary car is a car
// entry of its own (cars.js, `legend: '<base car id>'`) that builds its base car's model; this dresses that model once
// it is built (render/showcar.js makeShowCar, render/items.js playerModel), both sides alike (Good and Evil):
//   the body   a deep black with a slight sheen (a Phong copy of its paint: the car's own colours are LEGEND_BLACK)
//   the trim   the parts LEGEND_TRIM names, by their material's colour (bumpers, grille, sills, hub caps...), in gold
//   the wreath a big gold laurel wreath (one small canvas picture of flat shapes in two golds, drawn here, shared by
//              every car), WRAPPED on each flank at the rear quarter: a grid laid on the body by rays along x, each
//              point a few mm out from the paint it found; a cell is kept only where all its corners found the BODY'S
//              PAINT facing out sideways (never over a tyre, glass, a lamp, trim, nor round onto the roof or a bumper)
//              and where the wreath's ring passes. The picture is turned LEGEND.tilt degrees in the grid's texture
//              coordinates (the mesh itself stays on the body), its open top leaning to the car's front. Parented to
//              what the rays found (so it rides the body), appended last (the model editor's part ids stay the base
//              car's), hidden on a blacked-out car (render/silhouette.js).
// Traffic builds its models elsewhere (render/cars.js) and is never dressed.
import * as THREE from 'three';

export const LEGEND_BLACK = 0x0b0b0e, LEGEND_GOLD = 0xd4a82a;
// the same for every Legendary car: the wreath turned `tilt` degrees about the flank's normal, its open top leaning
// toward the car's front (`lean: 'front'`, rising forward) or its rear ('rear'); `grid` cells a side across the wreath
export const LEGEND = { tilt: 35, lean: 'front', grid: 16 };
// where the wreath goes, by the base car's MODEL: [z, y, size] in metres in the model's own frame (z along the car, its
// front +z; y up from the road; size: the wreath's width and height, the picture's square). Whatever of it does not
// land on the body's side paint is left off, so it may overlap the wheel, the windows and the lamps freely. To add a
// car: put the centre over the rear quarter (behind the rear door, over the rear wheel), make it as big as reads well,
// and look at both sides: enough of the ring must stay on paint to read as a wreath.
export const LEGEND_DECAL = {
  commuter: [-1.15, 0.32, 1.1], // (HUGE, the owner: centred on the rear wheel, a laurel arch over it across most of the rear 30% (z -1.7 to -0.6); carved by the tyre, the waist and the tail's turn)
};
// the trim made gold, by the base car's MODEL: the colours (hex) of the materials it is drawn in
export const LEGEND_TRIM = {
  commuter: [0x232529, 0xc4c8ce], // (the black bumpers, mouth, grille and sill skirt; the silver hub caps)
};
const LIFT = 0.006; // (the wreath's offset out from the paint: past the z-fight check's 4 mm, and polygon offset besides)
const FACING = 0.55; // (a cell is kept where the paint's normal is within about 57 degrees of straight out sideways)

// ---- the wreath: a picture drawn once ------------------------------------------------------------------------------
// 128 x 128 RGBA (64 KB of texture memory, about 85 KB with its mipmaps): flat shapes in two golds, nothing else (no
// outlines, veins, shading or bow): two branches of leaf pairs round an open ring, the outer leaves gold, the inner a
// deeper gold. The leaves lie between RING[0] and RING[1] of the picture's size from its centre (the grid keeps only
// the cells that reach that band).
export const WREATH_SIZE = 128;
const RING = [0.17, 0.5], GAP = 0.3; // (and nothing within GAP radians either side of straight up: the ring's open top)
let wreath = null;
export const wreathTexture = () => {
  if (wreath) return wreath;
  if (typeof document === 'undefined' || !document.createElement) return null;
  const S = WREATH_SIZE, canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = S / 2, R = S * 0.34;
  ctx.clearRect(0, 0, S, S);
  // a leaf: a pointed oval L long and 2W wide from (x, y), pointing at angle a
  const leaf = (x, y, a, L, W, colour) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.45, -W * 1.5, L, 0);
    ctx.quadraticCurveTo(L * 0.45, W * 1.5, 0, 0);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.restore();
  };
  const GOLD = '#e2b33a', DEEP = '#a8791a';
  // one branch, from the foot round one side to near the top (s -1: the left, through angle pi; 1: its mirror)
  const pt = (s, a) => [c - s * R * Math.cos(a), c + R * Math.sin(a)];
  for (const s of [-1, 1]) {
    const a0 = Math.PI / 2 + 0.16, a1 = Math.PI * 1.5 - 0.5, n = 8, k = s < 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = a0 + (a1 - a0) * t, [x, y] = pt(s, a), [x2, y2] = pt(s, a + 0.01);
      const along = Math.atan2(y2 - y, x2 - x), L = S * (0.24 - 0.08 * t), W = L * 0.36;
      leaf(x, y, along + k * 0.5, L * 0.88, W * 0.92, DEEP); // (inside the ring)
      leaf(x, y, along - k * 0.6, L, W, GOLD);               // (outside it)
    }
    const [tx, ty] = pt(s, a1), [tx2, ty2] = pt(s, a1 + 0.01);
    leaf(tx, ty, Math.atan2(ty2 - ty, tx2 - tx), S * 0.12, S * 0.12 * 0.3, GOLD);
  }
  wreath = new THREE.CanvasTexture(canvas);
  wreath.colorSpace = THREE.SRGBColorSpace;
  wreath.anisotropy = 4;
  wreath.userData.shared = true;
  return wreath;
};

// ---- the shared materials --------------------------------------------------------------------------------------------
let decalMat = null;
const wreathMaterial = () => {
  if (decalMat) return decalMat;
  const map = wreathTexture();
  if (!map) return null;
  // lit as the body is (Lambert, not Basic), with a little of its own light from the same picture so the gold still
  // reads on a flank turned from the sun; see-through outside the leaves and where the paint does not show (the vertices' alpha), never writing depth; pulled toward the camera
  decalMat = new THREE.MeshLambertMaterial({ map, emissive: 0x4a3c1c, emissiveMap: map, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.5,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  decalMat.userData.shared = true;
  decalMat.userData.blackout = 'hide'; // (render/silhouette.js: not drawn on a blacked-out car)
  return decalMat;
};
const GOLD = new Map(); // the gold version of each trim material (kept: the base car's shared materials stay shared)
const goldFor = (m) => {
  if (!GOLD.has(m)) {
    const g = new THREE.MeshPhongMaterial({ color: LEGEND_GOLD, emissive: 0x1c1404, specular: 0x9a8040, shininess: 45, side: m.side, vertexColors: !!m.vertexColors });
    g.userData.shared = true;
    GOLD.set(m, g);
  }
  return GOLD.get(m);
};

// ---- the wreaths, wrapped on the flanks ------------------------------------------------------------------------------
const RAY = new THREE.Raycaster(), FROM = new THREE.Vector3(), DIR = new THREE.Vector3(), M3 = new THREE.Matrix3();
// what a ray along -s x (from outside the car on its side s) meets first at (y, z), in world space (`only`: that mesh alone)
const flankAt = (model, s, y, z, only = null) => {
  FROM.set(s * 20, y, z).applyMatrix4(model.matrixWorld);
  DIR.set(-s, 0, 0).transformDirection(model.matrixWorld);
  RAY.set(FROM, DIR);
  const hit = RAY.intersectObject(only || model, true).find(h => h.object.visible && !h.object.userData.legend);
  if (!hit || !hit.face) return null;
  const normal = hit.face.normal.clone().applyMatrix3(M3.getNormalMatrix(hit.object.matrixWorld)).normalize();
  return { point: hit.point.clone(), normal, object: hit.object };
};
// one flank's wreath: a (grid+1)^2 lattice over the wreath's square, each point laid on the body's paint as a ray along
// x finds it (the body alone: under a tyre or a window too). A point is SHOWN where that paint is the first thing the
// ray meets and faces out sideways; each point carries that as its alpha (1 or 0), so the wreath ends along a clean
// line between a shown point and a hidden one (alpha test at a half) rather than in steps of whole cells. A cell is
// built only where one of its corners is shown, and the wreath's ring passes it. The texture coordinates are turned by
// the tilt (in the picture as seen from that side, so the top leans to the car's front on both flanks)
const wrapFlank = (model, s, [z0, y0, size], material) => {
  const body = model.userData.body, n = LEGEND.grid, across = new THREE.Vector3(1, 0, 0).transformDirection(model.matrixWorld);
  const phi = s * (LEGEND.lean === 'rear' ? -1 : 1) * LEGEND.tilt * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const pts = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const dz = (i / n - 0.5) * size, dy = (j / n - 0.5) * size;
      const paint = flankAt(model, s, y0 + dy, z0 + dz, body), first = paint && flankAt(model, s, y0 + dy, z0 + dz);
      const facing = !!paint && paint.normal.dot(across) * s;
      const shown = !!first && first.object === body && facing > FACING;
      // (seen from side s, the screen's right is -s z; the picture turned phi anticlockwise there)
      const sx = -s * dz / size, sy = dy / size;
      const u = sx * cos + sy * sin, v = -sx * sin + sy * cos;
      pts.push({ paint: facing > 0.2 ? paint : null, shown, r: Math.hypot(sx, sy), u, v, uv: [0.5 + u, 0.5 + v] });
    }
  }
  const at = (i, j) => pts[j * (n + 1) + i];
  const pos = [], nor = [], uvs = [], alpha = [];
  let parent = null;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      if (!q.every(p => p.paint) || !q.some(p => p.shown)) continue;
      const rs = q.map(p => p.r), near = Math.min(...rs), far = Math.max(...rs);
      if (far < RING[0] || near > RING[1] + 1 / n) continue; // (the ring's band does not pass this cell)
      if (q.every(p => p.v > 0 && Math.abs(Math.atan2(p.u, p.v)) < GAP)) continue; // (all in the open top)
      if (q.some(p => Math.abs(p.paint.point.clone().sub(q[0].paint.point).dot(across)) > size / n)) continue; // (a step in the surface: an edge)
      parent ||= body.parent || model;
      // two triangles, wound to face out of side s
      const tris = s > 0 ? [[0, 2, 1], [0, 3, 2]] : [[0, 1, 2], [0, 2, 3]];
      for (const k of tris.filter(t => t.some(k => q[k].shown)).flat()) { // (a triangle with nothing shown is left out)
        const p = q[k];
        pos.push(p.paint.point.clone().addScaledVector(p.paint.normal, p.shown ? LIFT : -LIFT)); // (a hidden point tucked under the paint: no face left lying close beside a part that covers it there)
        nor.push(p.paint.normal);
        uvs.push(...p.uv);
        alpha.push(1, 1, 1, p.shown ? 1 : 0);
      }
    }
  }
  if (!pos.length) return null;
  parent.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(parent.matrixWorld).invert(), nm = new THREE.Matrix3().getNormalMatrix(toLocal);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap(p => p.applyMatrix4(toLocal).toArray()), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor.flatMap(v => v.clone().applyMatrix3(nm).normalize().toArray()), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(alpha, 4)); // (white, its alpha whether the paint shows there)
  const decal = new THREE.Mesh(geo, material);
  decal.name = 'legend wreath ' + (s > 0 ? 'right' : 'left');
  decal.userData.patchRole = 'decal';
  decal.userData.legend = true;
  decal.renderOrder = 1;
  parent.add(decal);
  return decal;
};
export const addLegendDecal = (model, car) => {
  const spot = LEGEND_DECAL[car.model];
  const material = spot && wreathMaterial();
  if (!material || !model.userData.body) return 0;
  model.updateMatrixWorld(true);
  return [1, -1].filter(s => wrapFlank(model, s, spot, material)).length;
};

// ---- the whole look: the trim gold, the body a deep gloss black, the wreaths ------------------------------------------
export const addLegend = (model, car) => {
  if (!model || model.userData.legend) return model;
  model.userData.legend = true;
  const trim = new Set(LEGEND_TRIM[car.model] || []);
  model.traverse((m) => {
    if (!m.isMesh || m === model.userData.body || Array.isArray(m.material) || !m.material.color) return;
    if (trim.has(m.material.color.getHex())) m.material = goldFor(m.material);
  });
  const body = model.userData.body;
  if (body?.material?.isMeshLambertMaterial) { // (a slight sheen: Phong, its colour still the car's, so paint, scorch and ghost work as before)
    const old = body.material;
    body.material = new THREE.MeshPhongMaterial({ color: old.color.getHex(), vertexColors: old.vertexColors, side: old.side, specular: 0x24242a, shininess: 40 });
  }
  addLegendDecal(model, car);
  return model;
};
