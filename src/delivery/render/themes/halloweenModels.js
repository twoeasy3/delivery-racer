// ---- Halloween's models: no game state. The pieces the haunted-hollow scenery is built from (halloween.js), the
// theme's own plain obstacles (a crate of pumpkins, a candle lantern, a hay bale in a bedsheet: registered in
// obstacleModels.js) and the pumpkin the Good player delivers (registered in cargoModels.js). No humans anywhere:
// the ghosts are sheets with two holes in them, the lanterns are pumpkins, the rest is wood, iron and stone.
// Everything here is cheap on purpose: a merged geometry per thing, instanced by the scenery, canvas textures
// no bigger than 128 x 64 (the iron bars), 64 x 64 (a cobweb, a soft glow).
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
const UP = new THREE.Vector3(0, 1, 0);

// ---- geometry kit -------------------------------------------------------------------------------------------
// several geometries merged into one (positions and normals only; the parts may be indexed or not)
export const merge = (geometries) => {
  const pos = [], nor = [];
  for (const source of geometries) {
    const g = source.index ? source.toNonIndexed() : source;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
};
// a tapered rod from one point to another (r0 at a, r1 at b), open at both ends
export const limb = (a, b, r0, r1, seg = 4) => {
  const va = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(va), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(va.x, va.y, va.z);
  return g;
};
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
// a gable roof a metre wide, a metre long, a metre high: its ridge along z, its eaves at y = 0
export const PRISM = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0); shape.lineTo(0.5, 0); shape.lineTo(0, 1); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();

// ---- the trees: bare, twisted, a few boughs and a fork or two. Two shapes, about 7 m tall --------------------
const tree = (twist) => {
  const m = twist; // (+1 / -1: which way it leans)
  const trunk = [[0, 0, 0], [0.3 * m, 1.5, 0.1], [-0.2 * m, 3.0, 0.2], [0.25 * m, 4.4, -0.1], [0, 5.5, 0.05]], radii = [0.42, 0.32, 0.24, 0.16, 0.07];
  const parts = [];
  for (let k = 0; k < 4; k++) parts.push(limb(trunk[k], trunk[k + 1], radii[k], radii[k + 1], 4));
  const bough = (from, tip, r) => parts.push(limb(from, tip, r, 0.02, 3));
  bough(trunk[1], [2.4 * m, 3.4, -0.6], 0.14);
  bough(trunk[2], [-2.5 * m, 5.2, 0.9], 0.15);
  bough(trunk[3], [2.5 * m, 6.7, 0.7], 0.12);
  bough(trunk[4], [-1.2 * m, 7.7, 0.1], 0.09);
  bough(trunk[4], [1.3 * m, 7.9, -0.9], 0.08);
  parts.push(limb([-1.5 * m, 4.0, 0.6], [-2.3 * m, 3.7, -0.3], 0.06, 0.02, 3));
  return merge(parts);
};
export const TREES = [tree(1), tree(-1)];

// ---- a pumpkin: ribbed, squat. `ribs` bulges round it; the carved face is cut-outs that glow (projected onto the
// pumpkin so they sit on it) -------------------------------------------------------------------------------------
export const pumpkinGeo = (w = 12, h = 8, ribs = 6) => {
  const g = new THREE.SphereGeometry(0.5, w, h), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), k = 1 + 0.07 * Math.cos(Math.atan2(z, x) * ribs);
    p.setXYZ(i, x * k, p.getY(i) * 0.82, z * k);
  }
  g.computeVertexNormals();
  return g;
};
export const PUMPKIN = pumpkinGeo(6, 4, 3);         // (the field's: 36 triangles)
// the carved face of a pumpkin 1 m across, facing +z: two triangle eyes, a triangle nose, a jagged grin
export const faceGeo = (() => {
  const shapes = [];
  const poly = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); shapes.push(s); };
  poly([[-0.25, 0.1], [-0.1, 0.1], [-0.17, 0.24]]);
  poly([[0.1, 0.1], [0.25, 0.1], [0.17, 0.24]]);
  poly([[-0.04, 0.02], [0.04, 0.02], [0, 0.1]]);
  poly([[-0.3, -0.07], [-0.2, -0.04], [-0.14, -0.14], [-0.07, -0.05], [0, -0.14], [0.07, -0.05], [0.14, -0.14], [0.2, -0.04], [0.3, -0.07], [0.2, -0.22], [0, -0.26], [-0.2, -0.22]]);
  const g = new THREE.ShapeGeometry(shapes), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { // (onto the ellipsoid, a hair proud of the ribs)
    const x = p.getX(i), y = p.getY(i), inside = Math.max(0.0004, 0.25 - x * x - (y / 0.82) * (y / 0.82));
    p.setZ(i, Math.sqrt(inside) * 1.09);
  }
  return g;
})();
export const STEM = new THREE.CylinderGeometry(0.05, 0.08, 0.18, 4, 1, true).translate(0, 0.43, 0);

// a whole carved pumpkin as a group (body, glowing face, stem) at a scale
const jackOLantern = (scale = 1, bodyColor = 0xe8650f) => {
  const g = new THREE.Group(), body = put(g, pumpkinGeo(18, 12, 9), lambert(bodyColor, { emissive: 0x3a1204 }));
  const face = put(g, faceGeo, glow(0xffd84a));
  put(g, STEM, lambert(0x3f5a1e));
  g.scale.setScalar(scale);
  g.userData.face = face;
  g.userData.body = body;
  return g;
};

// ---- bats: a body and two wings that beat by scaling in y (a negative scale turns the tips down), 1.3 m across ----
export const BAT = (() => {
  const pos = [], tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (const s of [-1, 1]) {
    const rootF = [0, 0, 0.14], rootB = [0, 0, -0.16], lead = [s * 0.4, 0.14, 0.2], tip = [s * 0.68, 0.34, -0.02], scallop = [s * 0.4, 0.05, -0.3], scallop2 = [s * 0.2, 0, -0.2];
    if (s > 0) { tri(rootF, lead, tip); tri(rootF, tip, scallop); tri(rootF, scallop, scallop2); tri(rootF, scallop2, rootB); } else { tri(rootF, tip, lead); tri(rootF, scallop, tip); tri(rootF, scallop2, scallop); tri(rootF, rootB, scallop2); }
  }
  const wings = new THREE.BufferGeometry();
  wings.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wings.computeVertexNormals();
  return merge([wings, box(0.14, 0.12, 0.32, 0, 0.02, 0), box(0.1, 0.1, 0.1, 0, 0.06, 0.2), new THREE.ConeGeometry(0.03, 0.1, 3).translate(-0.04, 0.16, 0.2), new THREE.ConeGeometry(0.03, 0.1, 3).translate(0.04, 0.16, 0.2)]);
})();

// ---- canvas textures (drawn once, small) -------------------------------------------------------------------------
export const canvasTexture = (w, h, draw, repeat = false) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) tex.wrapS = THREE.RepeatWrapping;
  return tex;
};
// a soft round glow, white in the middle to nothing at the edge (64 x 64): lamp pools, ground mist
export const glowTexture = () => canvasTexture(64, 64, (c) => {
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
});
// the harvest moon: a pale gold disc with a few darker seas (64 x 64, on a sprite: a disc seen off to one side of the view stays round)
export const moonTexture = () => canvasTexture(64, 64, (c) => {
  c.clearRect(0, 0, 64, 64);
  const g = c.createRadialGradient(28, 26, 4, 32, 32, 30);
  g.addColorStop(0, '#fff2c0'); g.addColorStop(1, '#ffc870');
  c.fillStyle = g; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(200,130,60,0.28)';
  for (const [x, y, r] of [[22, 24, 7], [38, 36, 9], [26, 42, 5], [42, 20, 4]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
});
// iron railings, one bay: bars with spear heads and two rails (128 x 64; repeated along a ribbon)
export const railingTexture = () => canvasTexture(128, 64, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#1b1b22';
  c.fillRect(0, 22, w, 5); c.fillRect(0, h - 10, w, 5);
  for (let x = 6; x < w; x += 16) {
    c.fillRect(x - 2, 10, 4, h - 10);
    c.beginPath(); c.moveTo(x - 4, 12); c.lineTo(x, 0); c.lineTo(x + 4, 12); c.closePath(); c.fill();
  }
}, true);
// a wooden fence, one bay: a post at each end of it and two rails (128 x 64; repeated along a ribbon)
export const fenceTexture = () => canvasTexture(128, 64, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#4a3626';
  c.fillRect(0, 12, w, 7); c.fillRect(0, 36, w, 7);
  c.fillStyle = '#3d2c1e';
  c.fillRect(0, 4, 9, h - 4); c.fillRect(w - 9, 4, 9, h - 4);
}, true);
// a lit window: amber, a dark cross over it (32 x 32); tinted and flickered by its material's colour
export const windowTexture = () => canvasTexture(32, 32, (c) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 32, 32);
  c.fillStyle = '#2a1a0c'; c.fillRect(0, 0, 32, 3); c.fillRect(0, 29, 32, 3); c.fillRect(0, 0, 3, 32); c.fillRect(29, 0, 3, 32); c.fillRect(14, 0, 4, 32); c.fillRect(0, 14, 32, 4);
});
// a cobweb across a corner: spokes from a corner and sagging threads between (64 x 64)
export const cobwebTexture = () => canvasTexture(64, 64, (c) => {
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(235,235,245,0.95)'; c.lineWidth = 1.4;
  const spokes = 6;
  for (let i = 0; i <= spokes; i++) { const a = (i / spokes) * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); c.stroke(); }
  for (let r = 12; r < 62; r += 12) {
    c.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI / 2, rr = r - (i % 1 === 0 ? 0 : 0), x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) c.moveTo(x, y); else c.quadraticCurveTo(Math.cos(a - Math.PI / 4 / spokes * 2) * rr * 0.86, Math.sin(a - Math.PI / 4 / spokes * 2) * rr * 0.86, x, y);
    }
    c.stroke();
  }
});

// ---- the obstacles ---------------------------------------------------------------------------------------------
const shadow = (group, r) => {
  const s = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  s.rotation.x = -Math.PI / 2;
  return group;
};
// a pool of warm light on the road (additive, on the ground under a thing that glows)
const pool = (group, r, color, opacity = 0.5) => {
  const m = put(group, new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0, 0.04, 0);
  m.rotation.x = -Math.PI / 2;
  return m;
};
export const HALLOWEEN_OBSTACLES = {
  // a crate (1.2 x 1.2 x 1.1 m): a slatted wooden crate heaped with pumpkins, the top one carved and lit, facing the traffic
  pumpkinCrate: () => {
    const g = new THREE.Group(), wood = lambert(0x6a4326), dark = lambert(0x3d2514);
    for (const y of [0.17, 0.4, 0.63]) put(g, new THREE.BoxGeometry(1.14, 0.17, 1.14), wood, 0, y, 0);                // the slats
    for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) put(g, new THREE.BoxGeometry(0.1, 0.78, 0.1), dark, x, 0.4, z);
    const top = jackOLantern(0.98);
    top.position.set(0, 1.04, 0.02);
    g.add(top);
    for (const [x, z, s] of [[-0.3, -0.2, 0.7], [0.32, -0.25, 0.64]]) { const p = put(g, pumpkinGeo(10, 7, 6), lambert(0xd9570c, { emissive: 0x2a0e03 }), x, 0.92 + s * 0.2, z); p.scale.setScalar(s); }
    pool(g, 1.3, 0xff8a2a, 0.4);
    return shadow(g, 0.95);
  },
  // a cone (the small light kind): an iron candle lantern, the flame lit and a pool of candlelight round it
  candleLantern: () => {
    const g = new THREE.Group(), iron = lambert(0x1c1c22);
    put(g, new THREE.CylinderGeometry(0.3, 0.34, 0.1, 8), iron, 0, 0.05, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; put(g, new THREE.BoxGeometry(0.06, 0.62, 0.06), iron, Math.cos(a) * 0.24, 0.4, Math.sin(a) * 0.24); }
    put(g, new THREE.CylinderGeometry(0.235, 0.235, 0.58, 8, 1, true), glow(0xffd870, { transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }), 0, 0.4, 0);
    put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6), glow(0xfff4d0), 0, 0.23, 0);                                   // the candle
    const flame = put(g, new THREE.ConeGeometry(0.11, 0.3, 6), glow(0xffb020), 0, 0.5, 0);
    put(g, new THREE.ConeGeometry(0.34, 0.2, 8), iron, 0, 0.8, 0);                                                          // the cap
    put(g, new THREE.TorusGeometry(0.09, 0.02, 5, 10), iron, 0, 0.98, 0).rotation.x = Math.PI / 2;                          // the ring
    pool(g, 1.1, 0xffa83a, 0.5);
    g.userData.flame = flame;
    return shadow(g, 0.5);
  },
  // a bale (2.2 x 2.2 x 1.5 m): a hay bale in a bedsheet: the straw showing below the scalloped hem, two holes for eyes and a round mouth
  hayGhost: () => {
    const g = new THREE.Group(), straw = lambert(0xc9a44a);
    put(g, new THREE.CylinderGeometry(0.98, 0.98, 0.62, 16), straw, 0, 0.31, 0);
    for (const y of [0.16, 0.46]) put(g, new THREE.CylinderGeometry(1.0, 1.0, 0.06, 16), lambert(0x7a5a26), 0, y, 0);
    const profile = [[1.1, 0.5], [1.06, 0.8], [0.95, 1.1], [0.72, 1.36], [0.4, 1.5], [0.1, 1.54], [0, 1.54]].map(([r, y]) => new THREE.Vector2(r, y));
    const sheet = new THREE.LatheGeometry(profile, 24), p = sheet.attributes.position;
    for (let i = 0; i < p.count; i++) { // (the hem scalloped: lower and wider at eight points round it)
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
      if (y < 0.7) { const k = Math.cos(Math.atan2(z, x) * 8); p.setY(i, y - 0.1 + 0.12 * k); }
    }
    sheet.computeVertexNormals();
    put(g, sheet, lambert(0xf1f0f6, { emissive: 0x2a2a3c, side: THREE.DoubleSide }));
    const ink = glow(0x0e0e14);
    for (const x of [-0.27, 0.27]) { const eye = put(g, new THREE.SphereGeometry(0.16, 8, 6), ink, x, 1.1, 0.86); eye.scale.set(0.8, 1.35, 0.4); }
    const mouth = put(g, new THREE.SphereGeometry(0.17, 8, 6), ink, 0, 0.78, 1.0); mouth.scale.set(0.9, 1.2, 0.4);
    return shadow(g, 1.15);
  },
};

// ---- the pumpkin the Good player delivers: a big carved one on a bed of straw, its face lit from within and
// flickering, the stem curling, a vine trailing. Stands on y = 0, ~1 m tall, facing +z (userData.animate(t)) ----------
export const makePumpkinCargo = () => {
  const group = new THREE.Group(), straw = lambert(0xc9a44a);
  put(group, new THREE.CylinderGeometry(0.5, 0.56, 0.1, 12), straw, 0, 0.05, 0);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const s = put(group, new THREE.BoxGeometry(0.05, 0.04, 0.34), straw, Math.cos(a) * 0.55, 0.09, Math.sin(a) * 0.55); s.rotation.y = -a + 0.4; }
  const pump = new THREE.Group();
  pump.position.set(0, 0.52, 0);
  group.add(pump);
  const body = put(pump, pumpkinGeo(24, 16, 10), lambert(0xe8650f, { emissive: 0x4a1606 }));
  body.scale.setScalar(1.55);
  const face = put(pump, faceGeo, glow(0xffd84a));
  face.scale.setScalar(1.55);
  const lid = put(pump, new THREE.CylinderGeometry(0.06, 0.1, 0.22, 6), lambert(0x4a6a22), 0.02, 0.46, 0);
  put(pump, new THREE.TorusGeometry(0.1, 0.025, 5, 12, Math.PI * 1.4), lambert(0x5a8a2a), 0.09, 0.5, 0.0).rotation.set(0.4, 0, 0.3);
  const vine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.3, 0.12, 0.6], [0.55, 0.1, 0.8], [0.8, 0.12, 0.7], [0.95, 0.1, 0.45]].map(p => new THREE.Vector3(...p))), 10, 0.02, 5);
  put(group, vine, lambert(0x4a7a24));
  for (const [x, z] of [[0.6, 0.78], [0.85, 0.62]]) { const leaf = put(group, new THREE.SphereGeometry(0.1, 6, 4), lambert(0x4d8a2a), x, 0.14, z); leaf.scale.set(1, 0.18, 0.8); }
  group.userData.animate = (t) => {
    const f = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1) + 0.12 * Math.sin(t * 23);   // the candle inside
    face.material.color.setRGB(1, 0.78 + 0.18 * f, 0.2 + 0.2 * f);
    body.material.emissive.setRGB(0.3 + 0.2 * f, 0.09 + 0.07 * f, 0.02);
    pump.rotation.y = Math.sin(t * 0.7) * 0.25;
    lid.rotation.z = Math.sin(t * 1.3) * 0.04;
    pump.position.y = 0.52 + Math.sin(t * 1.9) * 0.012;
  };
  group.userData.animate(0);
  return group;
};
