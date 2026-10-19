// ---- the medieval castle town's shapes (render/themes/castle.js lays them out), and a BATCH: parts of any shape, each with a
// matrix and a colour, merged into ONE geometry with the colours in its vertices, so a whole stretch of town (walls, towers,
// houses, haystacks, a gatehouse) is one draw call. Flat-shaded Lambert: no textures but the road's cobbles, no lights.
import * as THREE from 'three';

// a shape as merged: no index, position and normal only
const bare = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
};
// a 1 m box standing on y 0, without its floor (never seen): 10 triangles
export const BOX = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed();
  const keep = (a) => { const out = []; for (let i = 0; i < a.count; i++) if (i < 18 || i >= 24) out.push(a.getX(i), a.getY(i), a.getZ(i)); return new THREE.Float32BufferAttribute(out, 3); };
  const b = new THREE.BufferGeometry();
  b.setAttribute('position', keep(g.attributes.position));
  b.setAttribute('normal', keep(g.attributes.normal));
  return b;
})();
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, bare(make())); return cache.get(key); };
// an upright cylinder 1 m across and tall, standing on y 0 (top: its top's share of the radius: a tapering tower)
export const CYL = (n = 10, top = 1) => once('c' + n + ':' + top, () => new THREE.CylinderGeometry(0.5 * top, 0.5, 1, n).translate(0, 0.5, 0));
// a cone 1 m across and tall, standing on y 0, no floor (a tower's roof, a haystack's top, a flame)
export const CONE = (n = 10) => once('k' + n, () => new THREE.ConeGeometry(0.5, 1, n, 1, true).translate(0, 0.5, 0));
// a lump (a tree's crown, a heap): 1 m across, its middle at y 0
export const LUMP = once('lump', () => new THREE.IcosahedronGeometry(0.5, 0));
// a gable roof: a 1 m square foot, its ridge along z 1 m up, no floor
export const PRISM = once('prism', () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5, // (the gable at +z)
    0.5, 0, -0.5, -0.5, 0, -0.5, 0, 1, -0.5, // (the gable at -z)
    -0.5, 0, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5, // (the -x slope)
    0.5, 0, 0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5, // (the +x slope)
  ], 3));
  g.computeVertexNormals();
  return g;
});
// a pennant: a long triangle of cloth flying out along +x from a pole at x 0, its hoist 1 m tall from y 0 to 1; both sides
export const PENNANT = once('pennant', () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.01, 1, 0.42, 0.01, 0, 1, 0.01, 0, 0, -0.01, 0, 1, -0.01, 1, 0.42, -0.01], 3));
  g.computeVertexNormals();
  return g;
});
// a hanging banner 1 m wide and tall, its top at y 0 hanging down to a swallowtail; in the x-y plane facing +z, a little thick
export const BANNER = once('banner', () => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, -1); s.lineTo(0, -0.78); s.lineTo(-0.5, -1); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
});
// a gatehouse's body: a block w wide (across the road, x), h tall, d deep (along it, z), standing on y 0, with an arched way
// through it `open` m wide whose sides rise `spring` m before the round arch: one shape, extruded (its vault inside too)
export const gatehouse = (w, h, d, open, spring) => {
  const s = new THREE.Shape(), r = open / 2;
  s.moveTo(-w / 2, 0); s.lineTo(-r, 0); s.lineTo(-r, spring);
  s.absarc(0, spring, r, Math.PI, 0, true);
  s.lineTo(r, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
  return bare(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -d / 2));
};

// ---- the batch -------------------------------------------------------------------------------------------------------
const M = new THREE.Matrix4(), L = new THREE.Matrix4(), N = new THREE.Matrix3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color();
const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
export class Batch {
  constructor(rand = () => 0.5) { this.p = []; this.n = []; this.c = []; this.rand = rand; } // (rand: the layout's own seeded dice, for the shades)
  get empty() { return !this.p.length; }
  // a part: geometry g placed by matrix m, in colour (a hex), its shade varied by up to `vary` either way
  add(g, m, color, vary = 0) {
    C.set(color);
    if (vary) C.multiplyScalar(1 + (this.rand() * 2 - 1) * vary);
    N.getNormalMatrix(m);
    const P = g.attributes.position, Nn = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      V.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(m);
      S.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).applyMatrix3(N).normalize();
      this.p.push(V.x, V.y, V.z); this.n.push(S.x, S.y, S.z); this.c.push(C.r, C.g, C.b);
    }
  }
  // a part in a frame (a thing's own matrix): at (x, y, z) in it, scaled, turned (radians about x, y, z in that order)
  part(g, frame, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, vary = 0) {
    E.set(rx, ry, rz); Q.setFromEuler(E);
    L.compose(V.set(x, y, z), Q, S.set(sx, sy, sz));
    this.add(g, M.multiplyMatrices(frame, L), color, vary);
  }
  // a flat four-cornered face (world points a b c d in order round it), turned to face `toward` (a direction)
  quad(a, b, c, d, color, toward) {
    A.subVectors(b, a); B.subVectors(c, a); D.crossVectors(A, B);
    const flip = toward && D.dot(toward) < 0, pts = flip ? [a, d, c, b] : [a, b, c, d];
    D.normalize(); if (flip) D.negate();
    C.set(color);
    for (const k of [0, 1, 2, 0, 2, 3]) { const q = pts[k]; this.p.push(q.x, q.y, q.z); this.n.push(D.x, D.y, D.z); this.c.push(C.r, C.g, C.b); }
  }
  mesh(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, material);
  }
}
// a thing's frame: at (x, y, z), its +z turned toward `turn` (radians about the upright, as atan2(dx, dz))
export const frameAt = (x, y, z, turn = 0) => new THREE.Matrix4().makeRotationY(turn).setPosition(x, y, z);

// ---- the road's cobbles: a canvas texture (128 x 128, 64 KB), a tile of rounded setts in rows, each row shifted half a stone
export const cobbleTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5d564c'; g.fillRect(0, 0, 128, 128); // (the joints)
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = 8, cols = 6, h = 128 / rows, w = 128 / cols;
  for (let r = 0; r < rows; r++) {
    for (let k = -1; k <= cols; k++) {
      const x = k * w + (r % 2 ? w / 2 : 0), y = r * h, t = 0.82 + rnd() * 0.3, warm = rnd() < 0.3;
      const base = warm ? [150, 134, 112] : [138, 134, 126];
      g.fillStyle = `rgb(${base.map(v => Math.round(v * t)).join(',')})`;
      g.beginPath();
      if (g.roundRect) g.roundRect(x + 1.3, y + 1.3, w - 2.6, h - 2.6, 4); else g.rect(x + 1.3, y + 1.3, w - 2.6, h - 2.6);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + 3, y + 2.5, w - 7, 2.5); // (a worn top catching the light)
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

// ---- a timber-framed floor's front: a picture 128 x 128 (64 KB) of one bay, repeated along the house: a post each side, a rail
// top and bottom, two braces, a window with its mullions; the plaster white (the vertex colour tints it), the timber dark
export const timberTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3b2b1f';
  g.fillRect(0, 0, 9, 128); g.fillRect(119, 0, 9, 128); g.fillRect(0, 0, 128, 10); g.fillRect(0, 116, 128, 12);
  g.strokeStyle = '#3b2b1f'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(6, 118); g.lineTo(36, 64); g.moveTo(122, 118); g.lineTo(92, 64); g.stroke();
  g.fillRect(36, 30, 56, 52); // (the window's frame)
  g.fillStyle = '#2a3036'; g.fillRect(41, 35, 46, 42);
  g.fillStyle = '#5a6670'; g.fillRect(43, 37, 19, 18); g.fillRect(66, 37, 19, 18);
  g.fillStyle = '#3b2b1f'; g.fillRect(62, 35, 4, 42); g.fillRect(41, 55, 46, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
