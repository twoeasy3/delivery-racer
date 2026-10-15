// ---- The steelworks' models (see steelworks.js): no game state, so the gimmicks page and the cargo page can show them too.
//   - the theme's plain obstacles (registered in ../obstacleModels.js, each the box and cost of the kind it stands in for:
//     collision.js SIZE, config.js obstacleKinds): a stack of hot ingots for a crate, a steel coil lying on its cradle for a
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
// (the dark patch under an obstacle: it sits on the road, not over it)
const grounded = (group, w, d) => {
  const shade = put(group, new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};

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
// a crate: a stack of hot billets, four layers laid crosswise on two skids, the ends of those lying along the road glowing
// (towards the player), the gaps between the layers glowing faintly; a yellow chalk tag on the top
const ingotStack = (o) => {
  const g = new THREE.Group(), w = o.hw * 2 - 0.04, l = o.hl * 2 - 0.04, H = o.height, B = 0.24, n = 4, layer = (H - 0.12) / n;
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) put(g, box(0.16, 0.12, l), DARKER, x, 0.06, 0);
  for (let k = 0; k < n; k++) {
    const y = 0.12 + layer * (k + 0.5), along = k % 2 === 1, count = 3, span = along ? w : l;
    for (let i = 0; i < count; i++) {
      const c = -span / 2 + B / 2 + 0.02 + i * (span - B - 0.04) / (count - 1);
      if (along) {
        put(g, box(B, layer - 0.02, l - 0.08), SCALE, c, y, 0);
        for (const z of [-1, 1]) put(g, box(B - 0.03, layer - 0.06, 0.03), k === n - 1 ? WHITEHOT : HOT, c, y, z * (l / 2 - 0.04 + 0.012)); // (its glowing ends, just proud of the scale)
      } else put(g, box(w - 0.08, layer - 0.02, B), SCALE, 0, y, c);
    }
    put(g, box(w - 0.3, 0.02, l - 0.3), REDHOT, 0, 0.12 + layer * k + 0.005, 0); // (the glow between the layers)
  }
  put(g, box(0.3, 0.02, 0.22), YELLOW, 0.1, H + 0.005, -0.1);
  return grounded(g, w + 0.3, l + 0.3);
};
// a bale: a steel coil lying on its side, its eye along the road (a hoop to the player coming up to it), on a yellow cradle,
// two blue bands round it, a red tag on its face
const coilGeo = {};
const steelCoil = (o) => {
  const g = new THREE.Group(), R = Math.min(o.height / 2 - 0.08, o.hw * 0.7), r = R * 0.38, L = Math.min(o.hl * 2 - 0.3, 1.7), y = R + 0.12;
  const end = coilEnd(), face = end ? lambert(0xffffff, { map: end, side: THREE.DoubleSide }) : COIL;
  const k = R.toFixed(3) + ':' + L.toFixed(3);
  coilGeo[k] ||= { shell: cyl(R, R, L, 24, true), eye: cyl(r, r, L, 16, true), ring: new THREE.RingGeometry(r, R, 24, 1) };
  const G = coilGeo[k];
  put(g, G.shell, COIL, 0, y, 0, Math.PI / 2);
  put(g, G.eye, lambert(0x5a6168, { side: THREE.BackSide }), 0, y, 0, Math.PI / 2);
  // the ring's own uvs are planar over [-R, R]: remapped so the canvas's rings sit on the coil's
  if (!G.ring.userData.mapped) { const p = G.ring.attributes.position, uv = G.ring.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * R) * 0.98, 0.5 + p.getY(i) / (2 * R) * 0.98); G.ring.userData.mapped = true; }
  for (const z of [-1, 1]) put(g, G.ring, face, 0, y, z * L / 2, 0, z > 0 ? 0 : Math.PI);
  for (const z of [-0.45, 0.45]) put(g, cyl(R + 0.012, R + 0.012, 0.05, 24, true), lambert(SW.blue, { side: THREE.DoubleSide }), 0, y, z * L, Math.PI / 2);
  for (const x of [-1, 1]) put(g, box(0.3, 0.32, L * 0.9), YELLOW, x * R * 0.72, 0.16, 0); // (the cradle's two rails)
  put(g, box(R * 1.7, 0.08, L * 0.9), DARK, 0, 0.04, 0);
  put(g, box(0.26, 0.18, 0.02), RED, R * 0.55, y + R * 0.2, -L / 2 - 0.006);
  return grounded(g, R * 2.4, L + 0.3);
};
// a cone: a HOT METAL sign, a yellow diamond on a post, on a heavy steel foot striped yellow and black
const hotSign = (o) => {
  const g = new THREE.Group(), r = (o.hw || 0.42) * 0.9, H = o.height || 1.12, map = hotFace();
  put(g, cyl(r, r, 0.16, 14), BLACK, 0, 0.08, 0);
  put(g, cyl(r * 0.92, r, 0.1, 14), YELLOW, 0, 0.21, 0);
  put(g, cyl(0.035, 0.035, H - 0.55, 8), STEEL, 0, 0.26 + (H - 0.55) / 2, 0);
  const plate = map ? lambert(0xffffff, { map, alphaTest: 0.5, side: THREE.DoubleSide }) : YELLOW;
  put(g, new THREE.PlaneGeometry(0.66, 0.66), plate, 0, H - 0.3, -0.04, 0, Math.PI, 0); // (towards the traffic coming up: local -z)
  put(g, new THREE.PlaneGeometry(0.66, 0.66), plate, 0, H - 0.3, 0.04);
  put(g, box(0.05, 0.6, 0.05), DARK, 0, H - 0.3, 0, 0, 0, Math.PI / 4); // (the frame behind it)
  return grounded(g, r * 2.4, r * 2.4);
};
// a barrier: two bundles of rebar lying across the lane, one on the other on timber bearers, the bars rust-red, their ends
// painted (orange on the one, yellow on the other), wire ties round each
const rebarGeo = {};
const rebarBundle = (o) => {
  const g = new THREE.Group(), w = o.hw * 2 - 0.1, l = o.hl * 2 - 0.1, H = Math.min(1.15, o.height);
  const key = w.toFixed(2) + ':' + l.toFixed(2);
  if (!rebarGeo[key]) {
    const bars = [], ends = [], r = 0.045, rows = 4, cols = Math.floor((l - 0.1) / (r * 2.3));
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const y = r + i * r * 1.9, z = -l / 2 + 0.08 + j * r * 2.3 + (i % 2) * r;
      bars.push(cyl(r, r, w - 0.08, 6).rotateZ(Math.PI / 2).translate(0, y, z));
      for (const x of [-1, 1]) ends.push(cyl(r * 1.05, r * 1.05, 0.05, 6).rotateZ(Math.PI / 2).translate(x * (w / 2 - 0.035), y, z));
    }
    rebarGeo[key] = { bars: mergeGeometries(bars), ends: mergeGeometries(ends), h: r * 1.9 * (rows - 1) + 2 * r };
  }
  const G = rebarGeo[key], layer = (H - 0.24) / 2, s = layer / G.h;
  for (let k = 0; k < 2; k++) {
    const y0 = 0.12 + k * (layer + 0.12);
    for (const x of [-w / 3, 0, w / 3]) put(g, box(0.14, 0.12, l), TIMBER, x, y0 - 0.06, 0);
    const bundle = sub(g, 0, y0, 0);
    bundle.scale.set(1, s, 1);
    put(bundle, G.bars, RUST);
    put(bundle, G.ends, k ? YELLOW : lambert(0xff7a1a));
    for (const x of [-w / 3, w / 3]) put(g, box(0.04, layer + 0.02, l + 0.02), BLACK, x + 0.2, y0 + layer / 2, 0); // (the wire ties)
  }
  return grounded(g, w + 0.2, l + 0.3);
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
// a horseshoe: a U of steel, as a torus three quarters round, its two heels
const shoeGeo = () => new THREE.TorusGeometry(0.12, 0.024, 6, 14, Math.PI * 1.4).rotateZ(-Math.PI * 0.2);
// a crate of horseshoes: a slatted wooden crate full to the brim with new shoes, more hung on its rim, a lucky one nailed to
// the front (points up), the shoes jingling as it rides
const makeHorseshoes = () => {
  const group = new THREE.Group(), body = sub(group), wood = lambert(0xb48a52), dark = lambert(0x7a5a32), shoe = lambert(0x9aa2aa), lucky = lambert(0xd8b04a);
  put(body, box(0.9, 0.06, 0.7), dark, 0, 0.03, 0);
  for (const y of [0.14, 0.32, 0.5]) { for (const z of [-1, 1]) put(body, box(0.9, 0.12, 0.03), wood, 0, y, z * 0.34); for (const x of [-1, 1]) put(body, box(0.03, 0.12, 0.7), wood, x * 0.44, y, 0); }
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(body, box(0.06, 0.6, 0.06), dark, x * 0.42, 0.3, z * 0.32);
  const G = shoeGeo(), shoes = [];
  for (let k = 0; k < 9; k++) { const m = put(body, G, shoe, -0.3 + (k % 3) * 0.3, 0.56 + Math.floor(k / 3) * 0.04, -0.2 + Math.floor(k / 3) * 0.2, -Math.PI / 2 + (k % 2 ? 0.15 : -0.1), k * 0.7, 0); shoes.push(m); }
  const hung = [-0.3, 0, 0.3].map((x, k) => put(body, G, shoe, x, 0.55, 0.36, 0, 0, k % 2 ? Math.PI : 0));
  const charm = put(body, G, lucky, 0, 0.32, 0.37, 0, 0, Math.PI); // (points up: the luck kept in)
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.6) * 0.035;
    hung.forEach((m, k) => { m.rotation.x = Math.sin(t * 5 + k * 1.7) * 0.25; });
    shoes.forEach((m, k) => { m.position.y = 0.56 + Math.floor(k / 3) * 0.04 + Math.abs(Math.sin(t * 7 + k)) * 0.012; });
    charm.rotation.y = Math.sin(t * 2.2) * 0.15;
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
  const glint = put(bar, box(0.04, 0.34, 0.34), glow(0xffffff, { transparent: true, opacity: 0.7 }), 0, 0, 0);
  const flakes = [];
  for (let k = 0; k < 10; k++) flakes.push(put(all, box(0.05, 0.004, 0.05), leaf, 0, -1, 0));
  return stated(group, (t, up, rage) => {
    const shake = up * Math.sin(t * 31) * 0.01 + rage * Math.sin(t * 17) * 0.03;
    bar.position.set(shake, 0.32 + rage * Math.abs(Math.sin(t * 7)) * 0.12, 0);
    bar.rotation.z = rage * Math.sin(t * 9) * 0.18;
    glint.position.x = -0.34 + ((t * 0.35) % 1) * 0.68;
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
