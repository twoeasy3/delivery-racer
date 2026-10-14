// ---- the LEGENDARY cars' look (the owner, 14-Oct: "The reserved colour scheme will be Black with gold trim. Legendary
// cars should have a large gold winner's wreath at the rear quarter of their sides"). A Legendary car is a car entry of
// its own (cars.js, `legend: '<base car id>'`) that builds its base car's model; this dresses that model once it is
// built (render/showcar.js makeShowCar, render/items.js playerModel), both sides alike (Good and Evil):
//   the body   a deep black with a slight sheen (a Phong copy of its paint: the car's own colours are LEGEND_BLACK)
//   the trim   the parts LEGEND_TRIM names, by their material's colour (bumpers, grille, sills, hub caps...), in gold
//   the wreath a gold laurel wreath (one canvas picture, drawn here, shared by every car) on both flanks at the rear
//              quarter: a flat quad found on the body by a ray along x at the car's LEGEND_DECAL anchor, a few mm out
//              from it, parented to what it was found on (so it rides the body), appended last (the model editor's part
//              ids stay the base car's). Left off silently where the spot is not flat paint.
// Traffic builds its models elsewhere (render/cars.js) and is never dressed.
import * as THREE from 'three';

export const LEGEND_BLACK = 0x0b0b0e, LEGEND_GOLD = 0xd4a82a;
// where the wreath goes, by the base car's MODEL: [z, y, size] in metres in the model's own frame (z along the car, its
// front +z; y up from the road; size: the wreath's width and height). The spot must be flat paint size x size round it.
// To add a car: measure its flank (a ray along -x over a grid of [z, y]: where it hits the body at one x with its normal
// along x), put the wreath's centre behind the rear door / over the rear wheel, clear of glass, tyres and lamps, and
// look at it from both sides.
export const LEGEND_DECAL = {
  commuter: [-0.56, 0.575, 0.42], // (the flat flank: y 0.38 to 0.77 at x 0.85; the rear tyre's front edge at z -0.92 at that height)
};
// the trim made gold, by the base car's MODEL: the colours (hex) of the materials it is drawn in
export const LEGEND_TRIM = {
  commuter: [0x232529, 0xc4c8ce], // (the black bumpers, mouth, grille and sill skirt; the silver hub caps)
};
const LIFT = 0.006; // (the wreath's offset out from the paint: past the z-fight check's 4 mm, and polygon offset besides)

// ---- the wreath: a picture drawn once ------------------------------------------------------------------------------
// 256 x 256 RGBA (256 KB of texture memory, 341 KB with its mipmaps): two laurel branches rising from a bow at the foot,
// round both sides, open at the top; each leaf gold with a pale highlight and a dark edge (it must read on black)
export const WREATH_SIZE = 256;
let wreath = null;
export const wreathTexture = () => {
  if (wreath) return wreath;
  if (typeof document === 'undefined' || !document.createElement) return null;
  const S = WREATH_SIZE, canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = S / 2, R = S * 0.37;
  ctx.clearRect(0, 0, S, S);
  ctx.lineJoin = ctx.lineCap = 'round';
  // a leaf: a pointed oval L long and 2W wide from the stem at (x, y), pointing at angle a
  const leaf = (x, y, a, L, W) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.45, -W * 1.5, L, 0);
    ctx.quadraticCurveTo(L * 0.45, W * 1.5, 0, 0);
    const g = ctx.createLinearGradient(0, -W, 0, W);
    g.addColorStop(0, '#fff2b0');
    g.addColorStop(0.35, '#e9c04a');
    g.addColorStop(0.75, '#c1911f');
    g.addColorStop(1, '#8a6312');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#5c400a';
    ctx.stroke();
    ctx.beginPath(); // (the midrib)
    ctx.moveTo(L * 0.08, 0);
    ctx.lineTo(L * 0.8, 0);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 244, 190, 0.8)';
    ctx.stroke();
    ctx.restore();
  };
  // one branch: from near the foot round to near the top, on the side `s` (-1 left, 1 right)
  const branch = (s) => {
    const a0 = Math.PI / 2 + 0.3, a1 = Math.PI * 1.5 - 0.42, n = 9;
    const pt = (a) => [c - s * R * Math.cos(a), c + R * Math.sin(a)]; // (s -1: round the left, through angle pi; 1: its mirror)
    // the stem
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const [x, y] = pt(a0 + (a1 - a0) * i / 24); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#7a5810';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d9ad3a';
    ctx.stroke();
    // the leaves: a pair at each step (one outside the ring, one inside), smaller toward the tip, then one at the tip
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = a0 + (a1 - a0) * t, [x, y] = pt(a), [x2, y2] = pt(a + 0.01);
      const along = Math.atan2(y2 - y, x2 - x), L = S * (0.17 - 0.06 * t), W = L * 0.3, k = s < 0 ? 1 : -1;
      leaf(x, y, along - k * 0.62, L, W);
      leaf(x, y, along + k * 0.5, L * 0.86, W * 0.9);
    }
    const [tx, ty] = pt(a1), [tx2, ty2] = pt(a1 + 0.01);
    leaf(tx, ty, Math.atan2(ty2 - ty, tx2 - tx), S * 0.085, S * 0.085 * 0.25);
  };
  branch(-1);
  branch(1);
  // the bow at the foot: two loops and two tails, gold with the same dark edge
  const gold = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#fff0a8'); g.addColorStop(0.5, '#d9ab30'); g.addColorStop(1, '#8a6312'); return g; };
  const by = c + R * 0.98;
  const shape = (draw, g) => { ctx.beginPath(); draw(); ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#5c400a'; ctx.stroke(); };
  for (const s of [-1, 1]) {
    shape(() => { ctx.moveTo(c, by); ctx.lineTo(c + s * 16, by + 30); ctx.lineTo(c + s * 22, by + 24); ctx.lineTo(c + s * 27, by + 34); ctx.lineTo(c + s * 7, by + 4); }, gold(c, by, c + s * 25, by + 32));
    shape(() => { ctx.moveTo(c, by); ctx.bezierCurveTo(c + s * 10, by - 16, c + s * 30, by - 12, c + s * 24, by); ctx.bezierCurveTo(c + s * 20, by + 9, c + s * 8, by + 6, c, by); }, gold(c, by - 14, c + s * 10, by + 8));
  }
  shape(() => { ctx.ellipse(c, by, 6, 5.5, 0, 0, Math.PI * 2); }, gold(c - 5, by - 5, c + 5, by + 5));
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
  // lit as the body is (Lambert, not Basic); see-through outside the wreath, never writing depth (and so a blackout
  // makes it black by its own picture: render/silhouette.js); pulled toward the camera so the paint never shows through
  // (a little of its own light besides, from the same picture, so the gold still reads on a flank turned from the sun)
  decalMat = new THREE.MeshLambertMaterial({ map, emissive: 0x4a3c1c, emissiveMap: map, transparent: true, depthWrite: false, alphaTest: 0.02,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  decalMat.userData.shared = true;
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
const GEOS = new Map();
const quad = (size) => {
  if (!GEOS.has(size)) { const g = new THREE.PlaneGeometry(size, size); g.userData.shared = true; GEOS.set(size, g); }
  return GEOS.get(size);
};

// ---- the wreaths on the flanks ---------------------------------------------------------------------------------------
const RAY = new THREE.Raycaster(), FROM = new THREE.Vector3(), DIR = new THREE.Vector3(), N = new THREE.Vector3(), M3 = new THREE.Matrix3();
// what a ray along -s x (from outside the car on its side s) meets first at (y, z): { point, normal (world), object }
const flankAt = (model, s, y, z) => {
  FROM.set(s * 20, y, z).applyMatrix4(model.matrixWorld);
  DIR.set(-s, 0, 0).transformDirection(model.matrixWorld);
  RAY.set(FROM, DIR);
  const hit = RAY.intersectObject(model, true).find(h => h.object.visible && !h.object.userData.legend);
  if (!hit || !hit.face) return null;
  N.copy(hit.face.normal).applyMatrix3(M3.getNormalMatrix(hit.object.matrixWorld)).normalize();
  return { point: hit.point.clone(), normal: N.clone(), object: hit.object };
};
export const addLegendDecal = (model, car) => {
  const spot = LEGEND_DECAL[car.model];
  const material = spot && wreathMaterial();
  if (!material || !model.userData.body) return 0;
  const [z, y, size] = spot, body = model.userData.body;
  model.updateMatrixWorld(true);
  const across = new THREE.Vector3(1, 0, 0).transformDirection(model.matrixWorld);
  let made = 0;
  for (const s of [1, -1]) {
    const mid = flankAt(model, s, y, z);
    if (!mid || mid.object !== body || mid.normal.dot(across) * s < 0.95) continue; // (not the paint, or not facing out)
    // flat enough? the paint at the wreath's four sides within 1.5 cm of its middle (in x)
    const r = size * 0.4, flat = [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dz, dy]) => {
      const h = flankAt(model, s, y + dy, z + dz);
      return h && h.object === body && Math.abs(h.point.clone().sub(mid.point).dot(across)) < 0.015;
    });
    if (!flat) continue;
    const decal = new THREE.Mesh(quad(size), material);
    const parent = mid.object.parent || model;
    parent.add(decal);
    parent.updateMatrixWorld(true);
    decal.position.copy(parent.worldToLocal(mid.point.clone().addScaledVector(mid.normal, LIFT)));
    decal.up.set(0, 1, 0);
    decal.lookAt(mid.point.clone().addScaledVector(mid.normal, 1)); // (its face, +z, out along the paint's normal, the picture's top up; three's lookAt allows for the parent)
    decal.name = 'legend wreath ' + (s > 0 ? 'right' : 'left');
    decal.userData.patchRole = 'decal';
    decal.userData.legend = true;
    decal.renderOrder = 1;
    made++;
  }
  return made;
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
