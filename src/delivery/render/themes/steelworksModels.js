// ---- The steelworks' models (see steelworks.js): no game state, so the gimmicks page and the cargo page can show them too.
//   - the theme's plain obstacles (registered in ../obstacleModels.js, each the COST of the kind it stands in for, config.js
//     obstacleKinds, on a bigger box of its own: STEELWORKS_SIZES, collision.js SIZE): a stack of hot ingots for a crate, a steel coil lying on its cradle for a
//     bale (its eye to the player: a hoop on its side), a HOT METAL sign on a weighted foot for a cone, two bundles of rebar
//     on bearers for a barrier
//   - the ingot train of its level crossings (CONFIG.crossing.trains 'ingot', drawn by ../roadside.js): a shunter, two
//     torpedo ladle cars glowing at the mouth, a coil wagon
//   - the building a blast blows out of on a steelworks level (../wreckage.js): a converter shed, its doors glowing
//   - the Steelworks Run's cargo: a crate of horseshoes (Good) and a bar of questionable gold (Evil)
//   - the textures, every one drawn in code on a small canvas (sizes in TEXTURE_BYTES below)
// Each model faces local +z, its feet on y = 0. Glow is unlit colour (MeshBasicMaterial) or additive: no real lights.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (top, bottom, h, n = 14, open = false) => new THREE.CylinderGeometry(top, bottom, h, n, 1, open);
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const put = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const shared = (...materials) => { for (const m of materials) m.userData.shared = true; };
// ---- the palette ----
export const SW = {
  steel: 0x7d858d, dark: 0x3a3e44, darker: 0x26282c, rust: 0x8a4a2a, yellow: 0xf2c21d, black: 0x1b1d22, red: 0xc8321f, blue: 0x2f5f8f,
  hot: 0xff6a1a, whiteHot: 0xffd27a, redHot: 0xe0401a, coil: 0xb9c1c9, concrete: 0xa8a49c, scale: 0x3a2e2a,
};
const STEEL = lambert(SW.steel), DARK = lambert(SW.dark), DARKER = lambert(SW.darker), YELLOW = lambert(SW.yellow), BLACK = lambert(SW.black), RED = lambert(SW.red),
  RUST = lambert(SW.rust), SCALE = lambert(SW.scale), COIL = lambert(SW.coil), TIMBER = lambert(0x8a6238), HOT = glow(SW.hot), WHITEHOT = glow(SW.whiteHot), REDHOT = glow(SW.redHot);
shared(STEEL, DARK, DARKER, YELLOW, BLACK, RED, RUST, SCALE, COIL, TIMBER, HOT, WHITEHOT, REDHOT);

// ---- textures: drawn once each, when first wanted, kept (shared: never freed with a level) ----
const canvasOf = (w, h) => { if (typeof document === 'undefined' || !document.createElement) return null; const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const textures = {};
const texture = (key, w, h, draw) => {
  if (textures[key] !== undefined) return textures[key];
  const canvas = canvasOf(w, h);
  if (!canvas) return (textures[key] = null); // (headless: no canvas, no picture)
  draw(canvas.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.userData.shared = true;
  t.anisotropy = 4;
  return (textures[key] = t);
};
// what each texture costs in memory, at 4 bytes a pixel (reported, and held to a budget: scripts/.steelworks-check.mjs)
export const TEXTURE_BYTES = { coilEnd: 128 * 128 * 4, hotFace: 128 * 128 * 4, cladding: 64 * 128 * 4, sign: 256 * 64 * 4 };
export const TEXTURE_SIDE = 256; // (the biggest side of any of them)
// a coil's end: the wraps of strip, ring after ring, a little darker in the middle
const coilEnd = () => texture('coilEnd', 128, 128, (g) => {
  g.fillStyle = '#c4ccd4'; g.fillRect(0, 0, 128, 128);
  for (let r = 22; r < 64; r += 2.2) { g.strokeStyle = r % 6.6 < 2.2 ? 'rgba(40,50,60,0.45)' : 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(64, 64, r, 0, Math.PI * 2); g.stroke(); }
});
// the HOT METAL sign's face: a yellow diamond, a black border, a flame, HOT under it (transparent corners: alphaTest)
const hotFace = () => texture('hotFace', 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = '#1b1d22'; g.beginPath(); g.moveTo(64, 2); g.lineTo(126, 64); g.lineTo(64, 126); g.lineTo(2, 64); g.closePath(); g.fill();
  g.fillStyle = '#f2c21d'; g.beginPath(); g.moveTo(64, 10); g.lineTo(118, 64); g.lineTo(64, 118); g.lineTo(10, 64); g.closePath(); g.fill();
  g.fillStyle = '#d8261b'; g.beginPath(); g.moveTo(64, 26); g.bezierCurveTo(82, 46, 84, 60, 76, 72); g.bezierCurveTo(74, 62, 70, 58, 66, 56); g.bezierCurveTo(70, 66, 62, 74, 56, 74); g.bezierCurveTo(46, 70, 46, 54, 64, 26); g.fill();
  g.fillStyle = '#1b1d22'; g.font = 'bold 20px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOT', 64, 92);
});
// cladding: vertical ribs of profiled sheet, pale and shaded, 64 x 128; tinted by the vertex colours of whatever wears it
export const claddingTexture = () => {
  const t = texture('cladding', 64, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
    for (let x = 0; x < 64; x += 16) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 0, 4, 128); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 4, 0, 3, 128); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 12, 0, 2, 128); }
    g.fillStyle = 'rgba(80,40,20,0.10)'; for (let k = 0; k < 18; k++) g.fillRect(Math.random() * 64, 100 + Math.random() * 28, 2, 6 + Math.random() * 20); // (rust runs at the foot)
  });
  if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
// a sign: words on a board, 256 x 64; one texture per sign, kept
export const signTexture = (text, bg = '#1b1d22', fg = '#f2c21d') => texture('sign:' + text + bg + fg, 256, 64, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let f = 36; g.font = `bold ${f}px system-ui, Arial, sans-serif`;
  while (f > 10 && g.measureText(text).width > w - 28) { f -= 2; g.font = `bold ${f}px system-ui, Arial, sans-serif`; }
  g.fillText(text, w / 2, h / 2 + 1);
});

// ---- THE OBSTACLES ----------------------------------------------------------------------------------
// Heavy-industry sized (the owner, 16-Oct: "The obstacles are too small again"): each has a box of its own, bigger than the
// plain kind's (collision.js SIZE: the same numbers as STEELWORKS_SIZES below, checked by scripts/.steelworks-check.mjs) at the
// plain kind's cost. Each is built at that size whatever box it is handed (the car stage hands it the plain kind's), its parts
// baked into ONE mesh per material (made once a kind, shared), with hazard stripes and a glowing edge to read at a glance.
//   hw, hl (half the width across the road and the length along it), height: m
export const STEELWORKS_SIZES = {
  ingotStack: [1.2, 0.9, 1.6],   // a stack of hot billets on a striped skid: 2.4 wide, 1.8 along, 1.6 tall
  steelCoil: [1.1, 0.9, 1.95],   // a 1.8 m coil lying on its side, its eye to the player, on a cradle 2.2 wide
  hotSign: [0.6, 0.6, 2.4],      // a HOT METAL board on a striped bollard on a weighted foot, 1.2 across, 2.4 tall
  rebarBundle: [1.5, 0.7, 1.4],  // two bundles of rebar 3.0 m across on bearers, striped end boards
};
const bakedKinds = {};
// parts ([material, geometry already placed]) merged into one geometry per material, kept; a group of meshes sharing them
const baked = (kind, build) => {
  if (!bakedKinds[kind]) {
    const parts = [], byMat = new Map();
    build((geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
      const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(m);
      parts.push([material, g]);
    });
    for (const [material, g] of parts) { if (!byMat.has(material)) byMat.set(material, []); byMat.get(material).push(g); }
    bakedKinds[kind] = [...byMat].map(([material, list]) => { const g = mergeGeometries(list); g.userData.shared = true; for (const p of list) p.dispose(); return [material, g]; });
  }
  const group = new THREE.Group();
  for (const [material, g] of bakedKinds[kind]) group.add(new THREE.Mesh(g, material));
  return group;
};
const SHADE = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
shared(SHADE);
const shade = (group, w, d) => { const m = put(group, new THREE.PlaneGeometry(w, d), SHADE, 0, 0.03, 0); m.rotation.x = -Math.PI / 2; return group; };
// hazard stripes: n bands across a w x h face (its middle at x, y, z; facing along z), alternately yellow and black
const stripes = (add, w, h, d, x, y, z, n = 6) => { for (let k = 0; k < n; k++) add(box(w / n, h, d), k % 2 ? BLACK : YELLOW, x - w / 2 + (k + 0.5) * w / n, y, z); };
// ...and down the side of a post: bands round it, r its radius
const banded = (add, r, h, y0, x = 0, z = 0, n = 6) => { for (let k = 0; k < n; k++) add(cyl(r, r, h / n, 12), k % 2 ? BLACK : YELLOW, x, y0 + (k + 0.5) * h / n, z); };
const EMBER = glow(0xff5a12), EYE = lambert(0x5a6168, { side: THREE.BackSide }), BAND = lambert(SW.blue, { side: THREE.DoubleSide }), ORANGE = lambert(0xff7a1a), LAMP = glow(0xffa21a);
shared(EMBER, EYE, BAND, ORANGE, LAMP);

// a crate: a stack of hot billets, five layers laid crosswise on a skid striped yellow and black, the ends of those
// lying along the road glowing (white-hot on top), a glowing seam between the layers, a chalk tag
const ingotStack = () => {
  const [HW, HL, H] = STEELWORKS_SIZES.ingotStack, w = HW * 2 - 0.06, l = HL * 2 - 0.06;
  const g = baked('ingotStack', (add) => {
    const skid = 0.22, n = 5, layer = (H - skid) / n, B = layer - 0.03;
    add(box(w, skid, l), DARKER, 0, skid / 2, 0);
    for (const z of [-1, 1]) stripes(add, w, skid - 0.04, 0.02, 0, skid / 2, z * (l / 2 + 0.01), 8); // (the skid's ends: hazard stripes, both ways)
    for (const x of [-1, 1]) add(box(0.03, 0.05, l - 0.1), EMBER, x * (w / 2 + 0.005), skid + 0.03, 0); // (a glowing line at the foot of the stack, each side)
    for (let k = 0; k < n; k++) {
      const y = skid + layer * (k + 0.5), along = k % 2 === 0, top = k === n - 1;
      const span = along ? w : l, count = Math.max(3, Math.floor(span / (B + 0.05)));
      for (let i = 0; i < count; i++) {
        const c = -span / 2 + B / 2 + i * (span - B) / (count - 1);
        if (along) {
          add(box(B, B, l - 0.06), SCALE, c, y, 0);
          for (const z of [-1, 1]) add(box(B - 0.05, B - 0.05, 0.03), top ? WHITEHOT : HOT, c, y, z * (l / 2 - 0.015)); // (its glowing ends)
        } else {
          add(box(w - 0.06, B, B), SCALE, 0, y, c);
          for (const x of [-1, 1]) add(box(0.03, B - 0.05, B - 0.05), top ? WHITEHOT : HOT, x * (w / 2 - 0.015), y, c);
        }
      }
      if (k) add(box(w - 0.2, 0.03, l - 0.2), REDHOT, 0, skid + layer * k, 0); // (the glow between the layers)
    }
    add(box(0.5, 0.02, 0.36), YELLOW, 0.3, H + 0.01, -0.2);
  });
  return shade(g, w + 0.4, l + 0.4);
};
const coilGeo = {}; // (the coil's and the sign's own materials, made once)
// a bale: a 1.8 m steel coil lying on its side, its eye along the road (a hoop to the player coming up to it), on a yellow
// cradle with striped ends, two blue bands round it, a red tag on its face, a glowing line along the cradle's foot
const steelCoil = () => {
  const [HW, HL] = STEELWORKS_SIZES.steelCoil, R = 0.9, r = R * 0.36, L = HL * 2 - 0.2, cradle = 0.15, y = cradle + R;
  const end = coilEnd(), face = end ? (coilGeo.face ||= Object.assign(lambert(0xffffff, { map: end, side: THREE.DoubleSide }), { userData: { shared: true } })) : COIL;
  const g = baked('steelCoil', (add) => {
    add(cyl(R, R, L, 28, true), COIL, 0, y, 0, Math.PI / 2);
    add(cyl(r, r, L, 16, true), EYE, 0, y, 0, Math.PI / 2);
    const ring = new THREE.RingGeometry(r, R, 28, 1), p = ring.attributes.position, uv = ring.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * R) * 0.98, 0.5 + p.getY(i) / (2 * R) * 0.98); // (the canvas's rings on the coil's)
    for (const z of [-1, 1]) add(ring.clone(), face, 0, y, z * L / 2, 0, z > 0 ? 0 : Math.PI, 0);
    for (const z of [-0.3, 0.3]) add(cyl(R + 0.015, R + 0.015, 0.08, 28, true), BAND, 0, y, z * L, Math.PI / 2);
    // the cradle: a dark bed, two yellow saddles the coil sits in, hazard stripes on its ends
    add(box(HW * 2, cradle, L + 0.1), DARK, 0, cradle / 2, 0);
    for (const x of [-1, 1]) add(box(0.36, 0.55, L), YELLOW, x * (HW - 0.18), cradle + 0.27, 0);
    for (const z of [-1, 1]) stripes(add, HW * 2, cradle - 0.03, 0.02, 0, cradle / 2, z * (L / 2 + 0.06), 8);
    for (const x of [-1, 1]) add(box(0.03, 0.05, L), EMBER, x * (HW + 0.005), 0.05, 0);
    add(box(0.36, 0.26, 0.02), RED, R * 0.55, y + R * 0.25, -L / 2 - 0.01);
  });
  return shade(g, HW * 2 + 0.4, L + 0.4);
};
// a cone: a HOT METAL board (a yellow diamond, a flame, HOT), 1.35 m, on a bollard banded yellow and black, on a weighted
// foot striped the same; an amber lamp glowing on top
const hotSign = () => {
  const [HW, , H] = STEELWORKS_SIZES.hotSign, map = hotFace();
  const plate = map ? (coilGeo.plate ||= Object.assign(lambert(0xffffff, { map, alphaTest: 0.5, side: THREE.DoubleSide }), { userData: { shared: true } })) : YELLOW;
  const g = baked('hotSign', (add) => {
    add(box(HW * 2, 0.22, HW * 2), DARKER, 0, 0.11, 0);
    for (const z of [-1, 1]) stripes(add, HW * 2, 0.16, 0.02, 0, 0.11, z * (HW + 0.01), 6);
    banded(add, 0.13, H - 1.45, 0.22, 0, 0, 6);
    const S = 1.35, cy = H - 0.25 - S * 0.7;
    add(box(S * 0.98, S * 0.98, 0.06), BLACK, 0, cy, 0, 0, 0, Math.PI / 4); // (the board's back plate)
    add(new THREE.PlaneGeometry(S * 1.4, S * 1.4), plate, 0, cy, -0.04, 0, Math.PI, 0); // (to the traffic coming up: local -z)
    add(new THREE.PlaneGeometry(S * 1.4, S * 1.4), plate, 0, cy, 0.04);
    add(cyl(0.14, 0.14, 0.2, 12), LAMP, 0, H - 0.1, 0); // the lamp on top
    add(cyl(0.16, 0.16, 0.05, 12), BLACK, 0, H - 0.22, 0);
  });
  return shade(g, HW * 2 + 0.4, HW * 2 + 0.4);
};
// a barrier: two bundles of rebar 3 m across, one on the other on timber bearers, the bars rust-red, their ends painted
// (orange on the one, yellow on the other), wire ties round each; a striped board at each end and a red flag on it
const rebarBundle = () => {
  const [HW, HL, H] = STEELWORKS_SIZES.rebarBundle, w = HW * 2 - 0.36, l = HL * 2 - 0.1;
  const g = baked('rebarBundle', (add) => {
    const r = 0.05, rows = 4, cols = Math.floor((l - 0.12) / (r * 2.3)), layer = (H - 0.36) / 2, sy = layer / (r * 1.9 * (rows - 1) + 2 * r);
    for (let k = 0; k < 2; k++) {
      const y0 = 0.12 + k * (layer + 0.12);
      for (const x of [-w / 3, 0, w / 3]) add(box(0.16, 0.12, l), TIMBER, x, y0 - 0.06, 0);
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const y = y0 + (r + i * r * 1.9) * sy, z = -l / 2 + 0.08 + j * r * 2.3 + (i % 2) * r;
        add(cyl(r, r, w - 0.08, 6), RUST, 0, y, z, 0, 0, Math.PI / 2);
        for (const x of [-1, 1]) add(cyl(r * 1.08, r * 1.08, 0.06, 6), k ? YELLOW : ORANGE, x * (w / 2 - 0.03), y, z, 0, 0, Math.PI / 2);
      }
      for (const x of [-w / 3, w / 3]) add(box(0.05, layer + 0.04, l + 0.03), BLACK, x + 0.25, y0 + layer / 2, 0); // (the wire ties)
    }
    // a post at each end, a red flag on it; a striped plank across the whole width on them, front and back; glowing feet
    for (const x of [-1, 1]) {
      const bx = x * (HW - 0.08);
      add(box(0.16, H, 0.16), DARKER, bx, H / 2, 0);
      add(box(0.02, 0.32, 0.45), RED, bx, H - 0.16, 0.24);
      add(box(0.2, 0.04, l), EMBER, bx, 0.02, 0);
    }
    for (const z of [-1, 1]) stripes(add, HW * 2, 0.34, 0.05, 0, H * 0.62, z * (l / 2 + 0.05), 10);
  });
  return shade(g, HW * 2 + 0.3, l + 0.4);
};
export const STEELWORKS_OBSTACLES = { ingotStack, steelCoil, hotSign, rebarBundle };

// ---- THE INGOT TRAIN (a level crossing's train on a steelworks level: CONFIG.crossing.trains 'ingot') ----
// each piece faces local +z, its length along z; the hit boxes are the crossing's, whatever is drawn
const bogie = (g, z, w = 2.4) => {
  put(g, box(w * 0.9, 0.5, 2.4), DARKER, 0, 0.55, z);
  for (const dz of [-0.75, 0.75]) for (const x of [-1, 1]) put(g, cyl(0.45, 0.45, 0.16, 12), DARK, x * w * 0.42, 0.45, z + dz, 0, 0, Math.PI / 2);
};
// a shunter: a squat diesel, its hood yellow with black chevrons at the ends, a cab at one end, a beacon on top
export const makeShunter = () => {
  const g = new THREE.Group();
  put(g, box(2.7, 0.5, 10), DARKER, 0, 1.15, 0);
  bogie(g, -3, 2.6); bogie(g, 3, 2.6);
  put(g, box(2.2, 2.0, 6.0), YELLOW, 0, 2.4, 1.6);
  put(g, box(2.7, 2.8, 2.6), YELLOW, 0, 2.8, -2.9);
  put(g, box(2.76, 0.7, 2.2), lambert(0x1a2230), 0, 3.5, -2.9); // the cab's windows
  put(g, box(2.9, 0.18, 2.9), DARK, 0, 4.3, -2.9);
  for (const z of [-4.95, 4.95]) for (let k = 0; k < 5; k++) put(g, box(0.4, 0.5, 0.04), k % 2 ? BLACK : YELLOW, -1.0 + k * 0.5, 1.15, z + Math.sign(z) * 0.02);
  put(g, cyl(0.16, 0.16, 0.25, 8), glow(0xffa21a), 0, 4.55, -2.9);
  put(g, cyl(0.2, 0.25, 0.8, 8), DARK, 0, 3.8, 3.2);
  for (const z of [-5.05, 5.05]) put(g, box(0.5, 0.3, 0.1), glow(0xfff2c0), 0, 2.0, z);
  return g;
};
// a torpedo ladle car: the cigar-shaped ladle on two pairs of bogies, banded, its mouth on top glowing white-hot, a haze over it
export const makeTorpedo = () => {
  const g = new THREE.Group(), L = 13;
  put(g, box(2.4, 0.5, L - 1), DARKER, 0, 1.0, 0);
  for (const z of [-L / 2 + 2, -L / 2 + 4.6, L / 2 - 4.6, L / 2 - 2]) bogie(g, z, 2.5);
  put(g, cyl(1.55, 1.55, L * 0.55, 18), lambert(0x4a4440), 0, 3.0, 0, Math.PI / 2);
  for (const z of [-1, 1]) put(g, cyl(0.6, 1.55, L * 0.22, 18), lambert(0x4a4440), 0, 3.0, z * (L * 0.275 + L * 0.11), z > 0 ? Math.PI / 2 : -Math.PI / 2);
  for (const z of [-2.2, 0, 2.2]) put(g, cyl(1.6, 1.6, 0.18, 18), RUST, 0, 3.0, z, Math.PI / 2);
  put(g, box(1.3, 0.3, 1.3), DARK, 0, 4.6, 0);
  put(g, box(1.0, 0.06, 1.0), WHITEHOT, 0, 4.78, 0);
  put(g, sphere(1.4, 10, 6), glow(SW.hot, { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 5.2, 0);
  return g;
};
// a coil wagon: a flat wagon, three coils in their cradles along it, a sheeted hood folded back
export const makeCoilWagon = () => {
  const g = new THREE.Group(), L = 10;
  put(g, box(2.6, 0.5, L), lambert(0x6a2a22), 0, 1.15, 0);
  bogie(g, -L / 2 + 2); bogie(g, L / 2 - 2);
  for (const z of [-3, 0, 3]) {
    put(g, box(2.2, 0.3, 1.9), YELLOW, 0, 1.55, z);
    put(g, cyl(1.0, 1.0, 1.5, 18), COIL, 0, 2.6, z);
    put(g, cyl(0.38, 0.38, 1.52, 12), DARK, 0, 2.6, z);
  }
  put(g, box(2.7, 1.6, 1.4), lambert(SW.blue), 0, 2.2, -L / 2 + 0.7);
  return g;
};
// ---- the building a blast goes off in, on a steelworks level: a converter shed, clad in rusty grey, its tall doors to the
// road glowing, a stack on the roof (16 m across, 14 tall, 26 along, as wreckage.js's office block)
export const makeConverterShed = () => {
  const g = new THREE.Group();
  put(g, box(16, 14, 26), lambert(0x6f6a66), 0, 7, 0);
  put(g, box(16.4, 0.8, 26.4), DARK, 0, 14.4, 0);
  for (const z of [-8, 0, 8]) put(g, box(0.4, 14, 0.6), DARKER, 8.05, 7, z); // (the frame on its road side: +x faces the road on the right)
  for (const z of [-8, 0, 8]) put(g, box(0.4, 14, 0.6), DARKER, -8.05, 7, z);
  for (const x of [-1, 1]) for (const z of [-4, 4]) put(g, box(0.2, 7, 5), glow(0xff8a2a), x * 8.08, 3.5, z); // the doors, glowing
  put(g, cyl(1.4, 1.6, 12, 12), DARK, 0, 20, -6);
  put(g, cyl(1.42, 1.42, 1.2, 12), RED, 0, 25, -6);
  return g;
};

// ---- THE CARGO (Steelworks Run) ----
const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's
const idle = (group, pose) => { group.userData.animate = pose; pose(0); return group; };
const stated = (group, pose) => {
  const w = [1, 0, 0];
  let target = 0, last = null;
  group.userData.state = 0;
  group.userData.setState = (state, snap = false) => {
    target = Math.max(0, Math.min(2, Math.round(state) || 0));
    group.userData.state = target;
    if (snap) for (let i = 0; i < 3; i++) w[i] = i === target ? 1 : 0;
  };
  group.userData.animate = (t) => {
    const dt = last === null ? 0 : Math.min(0.1, Math.abs(t - last));
    last = t;
    for (let i = 0; i < 3; i++) w[i] += Math.max(-dt / TRANSITION, Math.min(dt / TRANSITION, (i === target ? 1 : 0) - w[i]));
    pose(t, w[1], w[2], dt);
  };
  group.userData.animate(0);
  return group;
};
// a horseshoe: FLAT (the owner, 17-Oct): an iron plate 16 mm thick cut to a U, a round toe, two straight branches to the heels,
// four nail holes along each branch (real holes: the dark wall of each shows), a small calkin under each heel. Drawn in the x-y
// plane, toe at +y, heels at -y, its hoof side at -z; the faces in the first material, the edges and the holes' walls in the second
const SHOE = { ro: 0.12, ri: 0.078, leg: 0.08, t: 0.018 }; // (a big draught horse's, so it reads at a glance)
const shoeGeo = () => {
  const { ro, ri, leg, t } = SHOE, rm = (ro + ri) / 2, shape = new THREE.Shape();
  shape.moveTo(ro, -leg); shape.lineTo(ro, 0); shape.absarc(0, 0, ro, 0, Math.PI, false); shape.lineTo(-ro, -leg);
  shape.lineTo(-ri, -leg); shape.lineTo(-ri, 0); shape.absarc(0, 0, ri, Math.PI, 0, true); shape.lineTo(ri, -leg); shape.lineTo(ro, -leg);
  for (const sx of [-1, 1]) {
    const at = [[Math.cos(0.2) * rm, Math.sin(0.2) * rm], [Math.cos(0.62) * rm, Math.sin(0.62) * rm], [rm, -0.014], [rm, -0.05]];
    for (const [x, y] of at) shape.holes.push(new THREE.Path().absarc(sx * x, y, 0.0055, 0, Math.PI * 2, true));
  }
  return new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -t / 2);
};
const calkinGeo = () => new THREE.BoxGeometry(0.036, 0.014, 0.008);
// a crate of horseshoes: a slatted wooden crate packed with straw, new shoes lying flat on it in two piles, two more stood on
// their heels against the back, a lucky one (gilt) nailed to the front, points up, swinging a little on its nail. Named for
// render/cargoRules.js
const makeHorseshoes = () => {
  const group = new THREE.Group(), body = sub(group), wood = lambert(0xb48a52), dark = lambert(0x7a5a32);
  const crate = sub(body); crate.name = 'crate';
  put(crate, box(0.9, 0.06, 0.7), dark, 0, 0.03, 0);
  for (const y of [0.14, 0.32, 0.5]) {
    for (const z of [-1, 1]) put(crate, box(0.86, 0.12, 0.03), wood, 0, y, z * 0.34);          // (front and back: their ends inside the sides and posts)
    for (const x of [-1, 1]) put(crate, box(0.03, 0.108, 0.68), wood, x * 0.44, y, 0);        // (the sides: 6 mm lower and shorter, so no two faces are one)
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(crate, box(0.05, 0.6, 0.05), dark, x * 0.415, 0.3, z * 0.315); // (the posts inside, 15 mm off every slat face)
  const straw = put(crate, box(0.83, 0.41, 0.63), lambert(0xd9c27a), 0, 0.255, 0);          // straw, packed to 0.46
  straw.name = 'straw';
  const iron = [lambert(0x5d6268), lambert(0x2a2c30)], gilt = [lambert(0xd8b04a), lambert(0x8a6a22)];
  const G = shoeGeo(), C = calkinGeo();
  const shoe = (parent, mats, name) => {
    const g = sub(parent); g.name = name;
    put(g, G, mats);
    for (const sx of [-1, 1]) put(g, C, mats[1], sx * (SHOE.ro + SHOE.ri) / 2, -SHOE.leg + 0.009, -SHOE.t / 2 - 0.001); // (sunk 3 mm into the plate, 5 mm proud)
    return g;
  };
  // lying flat in two piles on the straw
  const TOP = 0.46, LIFT = SHOE.t + 0.001; // (the bottom one hoof side down, its calkins pressed into the straw; those on it hoof side up, plate on plate, 1 mm apart)
  const flat = [[-0.2, 0.08, 0.3, 0], [-0.14, 0.12, 1.4, 1], [0.18, 0.1, -0.5, 0], [0.24, 0.06, 0.9, 1]];
  const shoes = flat.map(([x, z, yaw, level], k) => {
    const g = shoe(crate, iron, 'shoe' + k);
    g.position.set(x, TOP + 0.003 + SHOE.t / 2 + level * LIFT, z);
    g.rotation.set(level ? Math.PI / 2 : -Math.PI / 2, yaw, 0, 'YXZ');
    return g;
  });
  // stood on their heels on the straw, leaning back on the back slats (placed by their own bounds: touching both, 1 mm off)
  [-0.2, 0.15].forEach((x, k) => {
    const g = shoe(crate, iron, 'stood' + k);
    g.rotation.set(-0.2, 0.12 * (k ? 1 : -1), 0, 'YXZ');
    group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g, true); // (the crate stands untransformed while it is built)
    g.position.set(x, TOP + 0.001 - b.min.y, -0.325 + 0.001 - b.min.z);
    shoes.push(g);
  });
  // the lucky one (gilt), nailed to the front's middle slat through the last hole of each branch, points up (the luck kept
  // in), its calkins 2.5 mm off the slat, the plate 7.5 mm
  const lucky = sub(crate, 0, 0.31, 0.355 + 0.0075 + SHOE.t / 2); lucky.name = 'lucky';
  shoe(lucky, gilt, '').rotation.z = Math.PI; // (unnamed: its parts are the lucky one's)
  const nailM = lambert(0x3a3a3a), rm = (SHOE.ro + SHOE.ri) / 2;
  for (const sx of [-1, 1]) {
    const nail = sub(lucky, sx * rm, 0.05, 0); nail.name = 'nail'; // (named apart: it goes into the slat)
    put(nail, cyl(0.009, 0.009, 0.006, 8), nailM, 0, 0, SHOE.t / 2 + 0.001, Math.PI / 2, 0, 0); // (its head, 2 mm into the shoe)
    put(nail, cyl(0.003, 0.003, 0.04, 6), nailM, 0, 0, -0.012, Math.PI / 2, 0, 0);              // (its shank, through the hole into the slat)
  }
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.6) * 0.035;
  });
};
// a bar of questionable gold (Evil): a fat bar, gold leaf over something duller, on a velvet cushion. Calm: it gleams, a
// glint crossing it. Agitated: it shivers and flakes of leaf drift off it, grey showing at its edges. Furious: it bucks on the
// cushion, strips of leaf peeling back off a rusty steel bar, flakes flying
const makeGoldBar = () => {
  const group = new THREE.Group(), all = sub(group);
  all.scale.setScalar(1.45); // (about a metre across, as the other items are)
  put(all, box(0.86, 0.14, 0.56), lambert(0x7a1a2a), 0, 0.07, 0);                      // the cushion
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(all, sphere(0.04, 6, 4), lambert(0xe8c24a), x * 0.4, 0.15, z * 0.25);
  const bar = sub(all, 0, 0.32, 0);
  put(bar, box(0.62, 0.3, 0.3), lambert(0x6b5a4c));                                        // what it really is: rusty steel
  const leaf = lambert(0xf2c43a, { emissive: 0x3a2a00 });
  const skin = put(bar, box(0.64, 0.32, 0.32), leaf);                                       // the gold leaf over it
  const top = put(bar, box(0.5, 0.06, 0.22), lambert(0xffd65a, { emissive: 0x4a3600 }), 0, 0.18, 0);
  const strips = [-0.2, 0, 0.2].map((x, k) => { const p = sub(bar, x, 0.165, -0.16); put(p, box(0.16, 0.012, 0.32), leaf, 0, 0, 0.16); p.userData.k = k; return p; });
  const glint = put(bar, box(0.04, 0.33, 0.33), glow(0xffffff, { transparent: true, opacity: 0.7 }), 0, 0, 0); // (5 mm over the leaf, clear of the strips' faces)
  const flakes = [];
  for (let k = 0; k < 10; k++) flakes.push(put(all, box(0.05, 0.004, 0.05), leaf, 0, -1, 0));
  return stated(group, (t, up, rage) => {
    const shake = up * Math.sin(t * 31) * 0.01 + rage * Math.sin(t * 17) * 0.03;
    bar.position.set(shake, 0.32 + rage * Math.abs(Math.sin(t * 7)) * 0.12, 0);
    bar.rotation.z = rage * Math.sin(t * 9) * 0.18;
    glint.position.x = -0.28 + ((t * 0.35) % 1) * 0.56; // (it turns back 2 cm short of the bar's ends, never level with them)
    glint.visible = rage < 0.5;
    // the leaf: whole, then thin at the edges (the skin shrinks to show the core's corners), then peeling off in strips
    skin.scale.set(1 - up * 0.04 - rage * 0.06, 1 - up * 0.04 - rage * 0.06, 1 - up * 0.04 - rage * 0.06);
    skin.visible = rage < 0.85;
    top.visible = rage < 0.6;
    strips.forEach((p) => { p.visible = rage > 0.05; p.rotation.x = -rage * (1.2 + Math.sin(t * 6 + p.userData.k * 2) * 0.5); });
    flakes.forEach((f, k) => {
      const live = up + rage, u = ((t * (0.5 + rage)) + k / flakes.length) % 1;
      f.visible = live > 0.2;
      f.position.set(Math.sin(k * 2.4) * (0.2 + u * 0.5 * (1 + rage)), 0.5 + u * (0.4 + rage * 0.5) - u * u * 0.6, Math.cos(k * 1.7) * (0.15 + u * 0.4));
      f.rotation.set(t * 4 + k, t * 3, k);
    });
  });
};
export const STEELWORKS_CARGO_MODELS = { horseshoes: makeHorseshoes, goldbar: makeGoldBar };
