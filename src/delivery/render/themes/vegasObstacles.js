// ---- The Las Vegas Strip's own plain obstacles (the vegas theme, themes.js: registered in ../obstacleModels.js). Each is the
// kind it stands in for in another shape, its box and its cost (config.js obstacleKinds, collision.js SIZE): a slot machine for a
// crate, a bellhop's luggage cart piled with cases for a bale, a giant red die for a cone, a velvet rope on brass posts across
// the lane for a barrier. Tall enough and bright on the dark road, a dark patch under each, so it reads from the chase camera.
// Each faces local +z (its face to the player at -z), its feet on y = 0. No game state. Kept out of vegasModels.js (the
// scenery's, loaded with the theme) because the game's obstacle models are in the first download.
// The slot machine's reels are a canvas drawn here, 128 x 64 (32 KB), once.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const put = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
// (a model's parts merged, one mesh to a material: a die's 21 pips are one draw, not 21. Parts are the group's own meshes, and those
// of a group in it, each put where it stands)
const bake = (group) => {
  group.updateMatrixWorld(true);
  const by = new Map();
  group.traverse((o) => { if (o.isMesh && o.parent) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); } });
  const out = new THREE.Group(), inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), m = new THREE.Matrix4();
  for (const [material, meshes] of by) {
    const parts = meshes.map((mesh) => {
      const g = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone());
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      return g.applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld));
    });
    out.add(new THREE.Mesh(parts.length > 1 ? mergeGeometries(parts) : parts[0], material));
  }
  return out;
};
const grounded = (parts, w, d) => { // (its parts merged, and the dark patch under it)
  const group = bake(parts);
  const shade = put(group, new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};
const RED = lambert(0xc81d2a), DARKRED = lambert(0x7a1018), GOLD = lambert(0xe8b84a), BRASS = lambert(0xd9a83a), BLACK = lambert(0x1b1d22),
  CHROME = lambert(0xc8ccd2), VELVET = lambert(0xa3101f), CARPET = lambert(0x8a1424), LAMP = glow(0xffd23f), PIP = lambert(0xffffff);
const RUNNER = lambert(0x8a1424, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const CASES = [0x2a4f8a, 0x7a3b1e, 0xe0c28a, 0x2f6b4a, 0xd8262b].map(c => lambert(c));
for (const m of [RED, DARKRED, GOLD, BRASS, BLACK, CHROME, VELVET, CARPET, LAMP, PIP, ...CASES, RUNNER]) m.userData.shared = true;

// the reels' glass: three reels, a cherry pair, a bar and a seven, a pay line across (made once)
export const REEL_SIZE = [128, 64]; // (scripts/.vegas-check.mjs holds it to its budget)
let reels = null;
const reelFace = () => {
  if (reels) return reels;
  if (typeof document === 'undefined' || !document.createElement) return (reels = lambert(0xf2f2f2));
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = REEL_SIZE;
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1d22'; c.fillRect(0, 0, 128, 64);
  for (let k = 0; k < 3; k++) { c.fillStyle = '#fbf7ec'; c.fillRect(6 + k * 40, 6, 36, 52); }
  c.fillStyle = '#d8262b'; c.beginPath(); c.arc(17, 40, 7, 0, Math.PI * 2); c.arc(30, 42, 7, 0, Math.PI * 2); c.fill();   // cherries
  c.strokeStyle = '#2f7a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(17, 33); c.quadraticCurveTo(24, 16, 32, 18); c.moveTo(30, 35); c.lineTo(31, 19); c.stroke();
  c.fillStyle = '#1b1d22'; c.fillRect(52, 25, 28, 14); c.fillStyle = '#fbf7ec'; c.fillRect(56, 29, 20, 6);                // a bar
  c.fillStyle = '#d8262b'; c.font = 'bold 40px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', 104, 34); // a seven
  c.fillStyle = 'rgba(216,38,43,0.8)'; c.fillRect(2, 31, 124, 2); // (the pay line)
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.shared = true;
  reels = new THREE.MeshBasicMaterial({ map: texture });
  reels.userData.shared = true;
  return reels;
};

export const VEGAS_OBSTACLES = {
  // a crate: a slot machine on its stand: a red cabinet, its reels lit, a gold trim, a lit topper, the arm at its side
  slotMachine: (o = {}) => {
    const g = new THREE.Group(), w = Math.min(1.05, (o.hw ?? 0.6) * 1.75), d = Math.min(0.9, (o.hl ?? 0.6) * 1.5);
    put(g, box(w, 0.32, d), BLACK, 0, 0.16, 0);                       // the stand
    put(g, box(w, 0.62, d * 0.9), RED, 0, 0.63, 0.02);                // the cabinet
    put(g, box(w * 0.92, 0.1, d * 0.5), GOLD, 0, 0.6, -d * 0.4);      // the button deck, out at the front
    for (const x of [-0.25, 0, 0.25]) put(g, box(0.16, 0.05, 0.12), LAMP, x * w, 0.67, -d * 0.48);
    put(g, box(w, 0.06, d * 0.92), GOLD, 0, 0.97, 0.02);              // a gold band
    put(g, box(w * 0.98, 0.34, d * 0.8), RED, 0, 1.17, 0.06);         // the head, its glass to the front
    put(g, new THREE.PlaneGeometry(w * 0.82, w * 0.41), reelFace(), 0, 1.17, 0.06 - d * 0.4 - 0.005, 0, Math.PI, 0);
    put(g, cyl(w * 0.34, w * 0.4, 0.14, 16), GOLD, 0, 1.4, 0.06);     // the topper's base and its lamp
    put(g, new THREE.SphereGeometry(w * 0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), LAMP, 0, 1.46, 0.06);
    put(g, box(0.08, 0.1, 0.2), CHROME, -w / 2 - 0.04, 0.8, 0.05);   // the arm, on its right (local -x)
    put(g, cyl(0.035, 0.035, 0.55, 8), CHROME, -w / 2 - 0.09, 1.05, 0.05);
    put(g, new THREE.SphereGeometry(0.09, 10, 8), RED, -w / 2 - 0.09, 1.34, 0.05);
    return grounded(g, w + 0.4, d + 0.4);
  },
  // a bale: a bellhop's luggage cart: a red-carpeted deck on castors, brass uprights and an arched rail over, cases piled on it
  luggageCart: (o = {}) => {
    const g = new THREE.Group(), w = Math.min(2.0, (o.hw ?? 1.1) * 1.8), l = Math.min(1.5, (o.hl ?? 1.1) * 1.35);
    put(g, box(w, 0.12, l), CARPET, 0, 0.28, 0);
    put(g, box(w + 0.06, 0.06, l + 0.06), BRASS, 0, 0.2, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) put(g, cyl(0.1, 0.1, 0.08, 10), BLACK, x * (w / 2 - 0.12), 0.1, z * (l / 2 - 0.12), 0, 0, Math.PI / 2);
    for (const x of [-1, 1]) put(g, cyl(0.04, 0.04, 1.05, 8), BRASS, x * (w / 2 - 0.05), 0.8, 0); // the uprights
    const arch = new THREE.TorusGeometry(w / 2 - 0.05, 0.04, 6, 20, Math.PI);
    put(g, arch, BRASS, 0, 1.32, 0).scale.set(1, 0.24, 1);           // the arched rail over (a low half ring on the uprights)
    put(g, box(w - 0.1, 0.04, 0.04), BRASS, 0, 0.62, -l / 2 + 0.02);    // a rail along the front
    const cases = [[0, 0.95, 0.42, 0.62, -0.42, 0.55, 0.05], [1, 0.8, 0.36, 0.56, 0.45, 0.52, 0.0], [2, 0.7, 0.3, 0.5, -0.2, 0.89, 0.05],
      [3, 0.55, 0.3, 0.45, 0.4, 0.85, -0.05], [4, 0.45, 0.42, 0.34, 0.05, 1.21, 0.0]];
    for (const [c, cw, ch, cd, x, y, z] of cases) {
      put(g, box(cw, ch, cd), CASES[c], x * w / 2, y, z);
      put(g, box(0.18, 0.04, 0.05), BLACK, x * w / 2, y + ch / 2 + 0.02, z); // (its handle)
    }
    return grounded(g, w + 0.4, l + 0.4);
  },
  // a cone: a giant red die, as tall as a cone, sat a little askew; white pips on every face, six on top
  casinoDie: (o = {}) => {
    const g = new THREE.Group(), s = Math.min(0.9, (o.hw ?? 0.42) * 2.05), die = new THREE.Group();
    put(die, box(s, s, s), RED);
    const r = s * 0.075, off = s * 0.27, F = s / 2 + 0.006;
    const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] };
    const face = (n, place) => { for (const [a, b] of PIPS[n]) place(put(die, cyl(r, r, 0.012, 12), PIP), a * off, b * off); };
    face(6, (m, a, b) => m.position.set(a, F, b));                                               // the top
    face(1, (m, a, b) => { m.position.set(a, -F, b); });                                          // the bottom
    face(5, (m, a, b) => { m.position.set(a, b, -F); m.rotation.x = Math.PI / 2; });              // to the player
    face(2, (m, a, b) => { m.position.set(a, b, F); m.rotation.x = Math.PI / 2; });
    face(3, (m, a, b) => { m.position.set(F, a, b); m.rotation.z = Math.PI / 2; });
    face(4, (m, a, b) => { m.position.set(-F, a, b); m.rotation.z = Math.PI / 2; });
    die.position.y = s / 2;
    die.rotation.y = 0.35;
    g.add(die);
    return grounded(g, s * 1.5, s * 1.5);
  },
  // a barrier: a velvet rope across the lane: three brass posts on heavy round feet, a ball on each, two swags of red rope
  // between them, a strip of red carpet under, a little gold-framed board on the middle post
  velvetRope: (o = {}) => {
    const g = new THREE.Group(), w = Math.min(2.3, (o.hw ?? 1.2) * 1.9), h = Math.min(1.1, (o.height ?? 1.2) * 0.92);
    put(g, new THREE.PlaneGeometry(w + 0.5, 0.9), RUNNER, 0, 0.025, 0, -Math.PI / 2);
    for (const x of [-w / 2, 0, w / 2]) {
      put(g, cyl(0.26, 0.3, 0.1, 18), BRASS, x, 0.05, 0);
      put(g, cyl(0.05, 0.06, h, 10), BRASS, x, h / 2, 0);
      put(g, new THREE.SphereGeometry(0.1, 12, 8), BRASS, x, h + 0.06, 0);
    }
    for (const side of [-1, 1]) { // a swag: a rope hung between two posts' tops
      const a = new THREE.Vector3(side * w / 2, h - 0.08, 0), b = new THREE.Vector3(0, h - 0.08, 0), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.32, 0));
      put(g, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, 0.055, 7), VELVET);
    }
    put(g, box(0.62, 0.42, 0.04), GOLD, 0, h * 0.62, -0.08);
    put(g, box(0.54, 0.34, 0.05), DARKRED, 0, h * 0.62, -0.09);
    return grounded(g, w + 0.6, 1.0);
  },
};
