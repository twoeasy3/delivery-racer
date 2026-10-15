// ---- The mall's models (see mall.js): no game state, so the gimmicks page and the cargo page can show them too.
// The theme's three plain obstacles (cartons on a sack truck for a crate, three shopping trolleys nested for a bale, a
// yellow WET FLOOR A-frame for a cone: registered in ../obstacleModels.js, the same box and cost as what they stand in
// for), and the signs: every sign in the mall is drawn in code on a small canvas (nothing downloaded, no real brand: the
// shops' names are invented). Each model faces local +z, its feet on y = 0.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (top, bottom, h, n = 12) => new THREE.CylinderGeometry(top, bottom, h, n);
const put = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
// (the dark patch under an obstacle, as obstacleModels.js has it: a pale floor shows a shadow well)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};

// ---- signs: words on a canvas, w x h pixels (256 x 64 for a shop's facia, 128 x 128 for a square sign), the background
// `bg`, the letters `fg`, in a bold face; `glyph` draws a simple mark before the words (a cup, a hanger...) in the letters'
// colour. One texture per sign TYPE, shared by every shop of that type (marked shared: kept across levels)
export const signTexture = (text, bg, fg, w = 256, h = 64, glyph = null, font = null) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.strokeStyle = fg;
  g.lineWidth = Math.max(2, h / 24);
  let x0 = w / 2;
  if (glyph) { g.save(); g.translate(h * 0.55, h / 2); g.scale(h / 64, h / 64); glyph(g); g.restore(); x0 = w / 2 + h * 0.45; }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = font || Math.floor(h * 0.56);
  g.font = `bold ${size}px system-ui, Arial, sans-serif`;
  // (shrink to fit)
  let f = size;
  while (f > 8 && g.measureText(text).width > w - (glyph ? h * 1.1 : 12)) { f -= 2; g.font = `bold ${f}px system-ui, Arial, sans-serif`; }
  g.fillText(text, x0, h / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.userData.shared = true;
  texture.anisotropy = 4;
  return texture;
};
// the marks before the names (drawn in a 64 x 64 box centred on 0, 0: lines and fills in the letters' colour)
export const GLYPHS = {
  hanger: (g) => { g.beginPath(); g.moveTo(-22, 12); g.lineTo(0, -6); g.lineTo(22, 12); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, -14, 6, 0, Math.PI * 1.5); g.stroke(); },
  shoe: (g) => { g.beginPath(); g.moveTo(-22, 10); g.lineTo(-16, -10); g.lineTo(-4, -10); g.lineTo(6, 4); g.lineTo(24, 8); g.lineTo(24, 14); g.lineTo(-22, 14); g.closePath(); g.fill(); },
  cup: (g) => { g.beginPath(); g.moveTo(-16, -12); g.lineTo(-12, 14); g.lineTo(12, 14); g.lineTo(16, -12); g.closePath(); g.fill(); g.beginPath(); g.arc(18, 0, 7, -Math.PI / 2, Math.PI / 2); g.stroke(); },
  book: (g) => { g.fillRect(-20, -14, 18, 28); g.fillRect(2, -14, 18, 28); g.clearRect(-2, -14, 4, 28); },
  phone: (g) => { g.fillRect(-10, -18, 20, 36); g.clearRect(-7, -14, 14, 24); },
  gem: (g) => { g.beginPath(); g.moveTo(-18, -4); g.lineTo(-8, -16); g.lineTo(8, -16); g.lineTo(18, -4); g.lineTo(0, 18); g.closePath(); g.fill(); },
  bow: (g) => { g.beginPath(); g.ellipse(-10, 0, 10, 7, 0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(10, 0, 10, 7, -0.5, 0, Math.PI * 2); g.fill(); g.fillRect(-3, -3, 6, 6); },
  joystick: (g) => { g.fillRect(-20, 2, 40, 14); g.fillRect(-3, -16, 6, 20); g.beginPath(); g.arc(0, -18, 7, 0, Math.PI * 2); g.fill(); },
  cone: (g) => { g.beginPath(); g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(0, 18); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -10, 10, 0, Math.PI * 2); g.fill(); },
  slice: (g) => { g.beginPath(); g.moveTo(-18, -14); g.lineTo(18, -14); g.lineTo(0, 18); g.closePath(); g.fill(); },
  flower: (g) => { for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; g.beginPath(); g.arc(Math.cos(a) * 10, Math.sin(a) * 10 - 2, 6, 0, Math.PI * 2); g.fill(); } g.fillRect(-2, 6, 4, 14); },
  scissors: (g) => { g.beginPath(); g.arc(-10, 10, 6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(10, 10, 6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(-6, 6); g.lineTo(12, -16); g.moveTo(6, 6); g.lineTo(-12, -16); g.stroke(); },
  bowl: (g) => { g.beginPath(); g.arc(0, -2, 18, 0, Math.PI); g.fill(); g.fillRect(-10, -20, 3, 20); g.fillRect(4, -20, 3, 20); },
  burger: (g) => { g.beginPath(); g.arc(0, -4, 18, Math.PI, 0); g.fill(); g.fillRect(-18, 0, 36, 5); g.fillRect(-18, 8, 36, 8); },
  bear: (g) => { g.beginPath(); g.arc(0, 2, 14, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(-11, -10, 6, 0, Math.PI * 2); g.arc(11, -10, 6, 0, Math.PI * 2); g.fill(); },
  bubble: (g) => { g.beginPath(); g.moveTo(-12, -12); g.lineTo(-9, 16); g.lineTo(9, 16); g.lineTo(12, -12); g.closePath(); g.stroke(); for (const [x, y] of [[-5, 10], [2, 11], [-1, 5]]) { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.moveTo(2, -12); g.lineTo(10, -22); g.stroke(); },
};

// ---- the obstacles --------------------------------------------------------------------------------------------
export const MALL_OBSTACLES = {
  // the mall's crate: four cardboard cartons stacked on a two-wheeled sack truck, tape down each one, a red FRAGILE band
  // round the top one, the truck's handle up behind them. Stands in a lane as a crate does (hw 0.6, 1.1 m tall)
  boxStack: () => {
    const group = new THREE.Group(), steel = lambert(0x4a4f57), card = [0xc89a62, 0xb98a55, 0xd1a46c];
    put(group, box(0.95, 0.04, 0.7), steel, 0, 0.12, 0.05);                                  // the toe plate
    for (const x of [-0.34, 0.34]) put(group, box(0.05, 1.3, 0.05), steel, x, 0.75, -0.3);   // the uprights
    put(group, box(0.74, 0.05, 0.05), steel, 0, 1.38, -0.3);                                 // the handle
    for (const x of [-0.42, 0.42]) put(group, cyl(0.13, 0.13, 0.08, 12), lambert(0x1a1b1e), x, 0.13, -0.28, 0, 0, Math.PI / 2); // the wheels
    const sizes = [[0.9, 0.34, 0.62], [0.8, 0.3, 0.56], [0.7, 0.28, 0.5]];
    let y = 0.14;
    sizes.forEach(([w, h, d], i) => {
      put(group, box(w, h, d), lambert(card[i % 3]), (i % 2 ? -1 : 1) * 0.02, y + h / 2, 0.04, 0, (i - 1) * 0.08, 0);
      put(group, box(0.08, h + 0.01, d + 0.01), lambert(0xe8dcc0), (i % 2 ? -1 : 1) * 0.02, y + h / 2, 0.04, 0, (i - 1) * 0.08, 0); // the tape
      y += h;
    });
    put(group, box(0.72, 0.09, 0.52), lambert(0xd8262b), 0, y - 0.1, 0.04);                   // the FRAGILE band
    return grounded(group, 0.7);
  },
  // the mall's bale: three shopping trolleys nested one in the next, across the road as a bale stands (hw 1.1): wire baskets
  // (grey frames and panels), red handles, four black wheels each. The nest runs along local x
  trolleyRow: () => {
    const group = new THREE.Group(), wire = lambert(0xc4c9d0), frame = lambert(0x5f656d), red = lambert(0xd8262b), black = lambert(0x1a1b1e);
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Group();
      t.position.x = -0.62 + k * 0.62;
      t.rotation.y = Math.PI / 2; // (each trolley's nose along the row)
      group.add(t);
      // the basket: a tray that widens to the top, open at the top; panels thin, frame bars along the rims
      const W = 0.56, L = 0.9, H = 0.5, Y = 0.5;
      put(t, box(W, 0.03, L), wire, 0, Y, 0);                                                 // the floor of it
      put(t, box(0.03, H, L), wire, -W / 2, Y + H / 2, 0, 0, 0, 0.12);
      put(t, box(0.03, H, L), wire, W / 2, Y + H / 2, 0, 0, 0, -0.12);
      put(t, box(W + 0.1, H, 0.03), wire, 0, Y + H / 2, L / 2, -0.25, 0, 0);                  // the nose, raked
      put(t, box(W + 0.1, H, 0.03), wire, 0, Y + H / 2, -L / 2, 0.1, 0, 0);                   // the back (a flap)
      put(t, box(W + 0.16, 0.04, L + 0.1), frame, 0, Y + H, 0);                               // the rim
      for (const x of [-1, 1]) put(t, box(0.03, Y, 0.03), frame, x * (W / 2 - 0.02), Y / 2, -L / 2 + 0.05); // the back legs
      for (const x of [-1, 1]) put(t, box(0.03, Y + 0.15, 0.03), frame, x * (W / 2 - 0.02), (Y + 0.15) / 2, L / 2 - 0.06, -0.2, 0, 0);
      put(t, box(0.03, 0.4, 0.03), frame, -W / 2, Y + H + 0.2, -L / 2);                       // the handle's stems
      put(t, box(0.03, 0.4, 0.03), frame, W / 2, Y + H + 0.2, -L / 2);
      put(t, cyl(0.03, 0.03, W + 0.1, 8), red, 0, Y + H + 0.4, -L / 2, 0, 0, Math.PI / 2);   // the handle
      for (const x of [-1, 1]) for (const z of [-1, 1]) put(t, cyl(0.055, 0.055, 0.04, 10), black, x * (W / 2 - 0.05), 0.055, z * (L / 2 - 0.1), 0, 0, Math.PI / 2); // the wheels
    }
    return grounded(group, 1.15);
  },
  // the mall's cone: a yellow A-frame WET FLOOR sign: two boards leaning together, the words on both, a hinge bar across the top.
  // As tall as a cone's box (1.12 m) and as light
  wetFloorSign: () => {
    const group = new THREE.Group();
    const face = new THREE.MeshBasicMaterial({ map: wetFloorTexture(), side: THREE.DoubleSide });
    face.userData.shared = true;
    for (const side of [-1, 1]) {
      const board = new THREE.Group();
      board.position.set(0, 0, 0);
      board.rotation.x = side * 0.3;
      group.add(board);
      put(board, box(0.62, 1.08, 0.04), lambert(0xf2c21d), 0, 0.56, side * 0.03);
      const words = put(board, new THREE.PlaneGeometry(0.5, 0.78), face, 0, 0.56, side * 0.056);
      if (side < 0) words.rotation.y = Math.PI;
    }
    put(group, cyl(0.02, 0.02, 0.66, 6), lambert(0x4a4f57), 0, 1.04, 0, 0, 0, Math.PI / 2);   // the hinge
    return grounded(group, 0.5);
  },
};
// the words on the A-frame (128 x 128, drawn once, when first wanted: no canvas while the checks load this headless)
let wetFloor = null;
const wetFloorTexture = () => {
  if (wetFloor) return wetFloor;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f2c21d';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#1a1b1e';
  g.beginPath(); g.moveTo(64, 10); g.lineTo(104, 66); g.lineTo(24, 66); g.closePath(); g.fill();
  g.fillStyle = '#f2c21d';
  g.font = 'bold 40px system-ui, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 64, 46);
  g.fillStyle = '#1a1b1e';
  g.font = 'bold 26px system-ui, Arial, sans-serif';
  g.fillText('WET', 64, 86);
  g.fillText('FLOOR', 64, 110);
  wetFloor = new THREE.CanvasTexture(canvas);
  wetFloor.userData.shared = true;
  return wetFloor;
};

// ---- a box open on its +z face (a shop's interior seen through its front, a trolley bay): the five other faces
export const openBoxGeometry = (w, h, d) => {
  const geo = new THREE.BoxGeometry(w, h, d), idx = Array.from(geo.index.array);
  geo.setIndex(idx.slice(0, 24).concat(idx.slice(30)));
  return geo;
};
