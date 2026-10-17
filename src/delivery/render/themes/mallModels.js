// ---- The mall's models (see mall.js): no game state, so the gimmicks page and the cargo page can show them too.
// The theme's three plain obstacles (cartons on a sack truck for a crate, three shopping trolleys nested for a bale, a
// yellow WET FLOOR A-frame for a cone: registered in ../obstacleModels.js, the same box and cost as what they stand in
// for), and the signs: every sign in the mall is drawn in code on a small canvas (nothing downloaded, no real brand: the
// shops' names are invented). Each model faces local +z, its feet on y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

// ---- the nested trolleys (the bale): three supermarket trolleys, each a wire basket (a rim, a floor, a few uprights round
// it: open, no panels) that narrows and lifts its floor to the nose, on a low U-shaped tube base open at the back, a caster
// right under each corner of the base (a small fork over a small wheel, no legs), two tubes up the back to a red handle.
// Nested as real ones are: each one's nose in the open back of the one ahead, its basket a few cm inside and above that one's,
// every wheel on the floor. One trolley faces local +z; the nest runs along local x (noses to +x). The parts merged by
// material over all three: 4 meshes (and the shadow), the materials shared by every nest (kept between levels).
// trolleys(n): { wire, fork, red, black } geometries (the caller owns them); n = 1: one trolley facing +z (the rolling
// trolleys and a junction's train wear it too: ../obstacleModels.js trolley)
export const TROLLEY = { wire: lambert(0xc4c9d0), fork: lambert(0x4a4f57), red: lambert(0xd8262b), black: lambert(0x1a1b1e) };
for (const m of Object.values(TROLLEY)) m.userData.shared = true;
const UP = new THREE.Vector3(0, 1, 0), tv = new THREE.Vector3(), tq = new THREE.Quaternion(), tm = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);
// a straight tube from a to b ([x, y, z]), r its corners' radius, `sides` sides, open ends (each end runs r on, into what it meets)
const tube = (a, b, r, sides = 3) => {
  tv.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = tv.length();
  tq.setFromUnitVectors(UP, tv.normalize());
  tv.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return new THREE.CylinderGeometry(r, r, length + 2 * r, sides, 1, true).applyMatrix4(tm.compose(tv, tq, ONE));
};
const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
export const trolleys = (n = 3) => {
  const parts = { wire: [], fork: [], red: [], black: [] };
  // the basket's corners: B bottom, T top; back (at the handle) and nose; x the half width
  const BB = [0.245, 0.54, -0.42], BN = [0.15, 0.60, 0.40], TB = [0.27, 0.97, -0.45], TN = [0.20, 0.92, 0.50];
  const P = (s, u, v) => { const p = mix(mix(BB, BN, u), mix(TB, TN, u), v); p[0] *= s; return p; }; // (s: the side, u: back to nose, v: floor to rim)
  const RIM = 0.016, WIRE = 0.011, TUBE = 0.015, BASE = 0.17, R = 0.06;
  const one = [];
  for (const s of [-1, 1]) {
    one.push(['wire', tube(P(s, 0, 1), P(s, 1, 1), RIM)]);                                   // the rim (none across the back: the gate)
    for (const v of [0, 0.5]) one.push(['wire', tube(P(s, 0, v), P(s, 1, v), WIRE)]);         // the floor's edge, a wire half way up
    for (const u of [0, 1 / 3, 2 / 3, 1]) one.push(['wire', tube(P(s, u, 0), P(s, u, 1), WIRE)]); // the uprights round the sides
    one.push(['wire', tube([s * 0.26, BASE, -0.40], [s * 0.15, BASE, 0.38], TUBE)]);          // the base's side tubes,
    one.push(['wire', tube([s * 0.26, BASE, -0.40], [s * 0.28, 1.0, -0.46], TUBE)]);          // up the back to the handle,
    one.push(['wire', tube([s * 0.15, BASE, 0.38], P(s, 1, 0), TUBE)]);                       // up the front to the basket's nose
  }
  one.push(['wire', tube(P(-1, 1, 1), P(1, 1, 1), RIM)], ['wire', tube(P(-1, 1, 0.5), P(1, 1, 0.5), WIRE)]); // the nose: its rim, a wire
  for (const u of [0, 1]) one.push(['wire', tube(P(-1, u, 0), P(1, u, 0), WIRE)]);           // the floor's ends,
  for (const w of [1 / 3, 2 / 3]) {
    const floor = (u) => mix(P(-1, u, 0), P(1, u, 0), w);
    one.push(['wire', tube(floor(0), floor(1), WIRE)], ['wire', tube(mix(P(-1, 1, 0), P(1, 1, 0), w), mix(P(-1, 1, 1), P(1, 1, 1), w), WIRE)]); // its wires, the nose's
  }
  one.push(['wire', tube([-0.15, BASE, 0.38], [0.15, BASE, 0.38], TUBE)]);                    // the base's front (open at the back: the next one's base runs in)
  one.push(['red', cyl(0.024, 0.024, 0.62, 6).rotateZ(Math.PI / 2).translate(0, 1.0, -0.465)]); // the handle
  // the casters, right under the base's corners: the wheel (its flat side on the floor) and a little fork over it
  for (const [x, z] of [[-0.26, -0.40], [0.26, -0.40], [-0.15, 0.36], [0.15, 0.36]]) {
    one.push(['black', cyl(R, R, 0.035, 6).rotateZ(Math.PI / 2).translate(x, R * Math.cos(Math.PI / 6), z)]);
    one.push(['fork', tube([x, 0.1, z - 0.015], [x, BASE, z], 0.03, 4)]);
  }
  // the nest: 0.45 m apart, noses to +x, each one's nose in the back of the one ahead (its tubes 4 mm or more clear of that one's)
  for (let k = 0; k < n; k++) {
    tm.makeRotationY(n > 1 ? Math.PI / 2 : 0).setPosition((k - (n - 1) / 2) * 0.45, 0, 0);
    for (const [part, geometry] of one) parts[part].push(k < n - 1 ? geometry.clone().applyMatrix4(tm) : geometry.applyMatrix4(tm));
  }
  const out = {};
  for (const [part, list] of Object.entries(parts)) { out[part] = mergeGeometries(list); list.forEach(g => g.dispose()); }
  return out;
};

// ---- the obstacles --------------------------------------------------------------------------------------------
export const MALL_OBSTACLES = {
  // the set dressing along the halls' sides, as obstacles (the owner: real, colliding): each a bale's, a crate's or a cone's box
  planter: () => { // a square concrete planter with a clipped bush (a bale's box)
    const group = new THREE.Group();
    put(group, box(1.8, 0.9, 1.8), lambert(0x6b6f74), 0, 0.45, 0);
    put(group, box(1.9, 0.08, 1.9), lambert(0x8a8f96), 0, 0.92, 0);
    put(group, new THREE.SphereGeometry(0.95, 10, 7), lambert(0x3f8a3a), 0, 1.5, 0).scale.set(1, 0.7, 1);
    return grounded(group, 1.15);
  },
  palmPot: () => { // a potted palm: a terracotta pot, a trunk, six fronds (a bale's box)
    const group = new THREE.Group();
    put(group, cyl(0.6, 0.45, 0.9, 12), lambert(0xb85a34), 0, 0.45, 0);
    put(group, cyl(0.14, 0.18, 2.6, 8), lambert(0x7a5a3a), 0, 2.2, 0);
    for (let f = 0; f < 6; f++) { const frond = put(group, new THREE.ConeGeometry(0.28, 2.0, 6), lambert(0x4a9a48), 0, 3.5, 0); frond.rotation.set(0.9, f * 1.05, 0); frond.position.set(Math.sin(f * 1.05) * 0.7, 3.4, Math.cos(f * 1.05) * 0.7); }
    return grounded(group, 1.0);
  },
  kiosk: () => { // an info kiosk: a round counter under a round canopy on a post (a bale's box)
    const group = new THREE.Group();
    put(group, cyl(1.0, 1.0, 1.1, 12), lambert(0xf4f1ec), 0, 0.55, 0);
    put(group, cyl(1.05, 1.05, 0.08, 12), lambert(0x2f6f8a), 0, 1.14, 0);
    put(group, cyl(0.12, 0.12, 2.2, 8), lambert(0x8a9096), 0, 2.2, 0);
    put(group, cyl(1.4, 1.4, 0.16, 14), lambert(0x2f6f8a), 0, 3.3, 0);
    put(group, box(0.5, 0.5, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 2.6, 0.13);
    return grounded(group, 1.1);
  },
  bench: () => { // a slatted bench on two cast ends (a crate's box)
    const group = new THREE.Group();
    for (const z of [-0.7, 0.7]) put(group, box(0.5, 0.45, 0.08), lambert(0x4a4f57), 0, 0.22, z);
    for (const x of [-0.18, 0, 0.18]) put(group, box(0.14, 0.05, 1.8), lambert(0x8a6a48), x, 0.47, 0);
    return grounded(group, 0.75);
  },
  playBlock: () => { // a giant play block (a crate's box)
    const group = new THREE.Group(), colours = [0xf04a5e, 0xf2c21d, 0x3ab0e8, 0x5fc04a];
    put(group, box(1.1, 1.1, 1.1), lambert(colours[Math.floor(Math.random() * 4)]), 0, 0.55, 0);
    for (const z of [-0.56, 0.56]) put(group, box(0.6, 0.6, 0.02), lambert(0xfff8e0), 0, 0.55, z);
    return grounded(group, 0.75);
  },
  bin: () => { // a litter bin: a steel drum with a domed lid and a slot (a cone's box)
    const group = new THREE.Group();
    put(group, cyl(0.32, 0.3, 0.9, 12), lambert(0x4a4f57), 0, 0.45, 0);
    put(group, new THREE.SphereGeometry(0.34, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x6f757d), 0, 0.9, 0);
    put(group, box(0.3, 0.1, 0.02), lambert(0x1b1d22), 0, 1.0, 0.3);
    return grounded(group, 0.5);
  },
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
  // the mall's bale: three shopping trolleys nested one in the next, across the road as a bale stands (hw 1.1). See trolleys
  trolleyRow: () => {
    const group = new THREE.Group();
    for (const [part, geometry] of Object.entries(trolleys(3))) put(group, geometry, TROLLEY[part]);
    return grounded(group, 1.15);
  },
  // the mall's cone: a yellow A-frame WET FLOOR sign: two boards leaning together, the words on both, a hinge bar across the top.
  // As tall as a cone's box (1.12 m) and as light
  wetFloorSign: () => {
    const group = new THREE.Group();
    const face = new THREE.MeshBasicMaterial({ map: wetFloorTexture(), side: THREE.DoubleSide });
    face.userData.shared = true;
    // (each board hangs from the hinge and leans out at its foot: an A. Turned about the floor, as it was, the two leaned apart at
    // the top, a V standing on its head with the hinge in the air between them)
    const HINGE = 0.975; // m: the boards' feet (1.02 m down each, leaning 0.3 rad) then just touch the floor
    for (const side of [-1, 1]) {
      const board = new THREE.Group();
      board.position.set(0, HINGE, 0);
      board.rotation.x = -side * 0.3;
      group.add(board);
      put(board, box(0.62, 1.08, 0.04), lambert(0xf2c21d), 0, -0.48, side * 0.03);
      const words = put(board, new THREE.PlaneGeometry(0.5, 0.78), face, 0, -0.48, side * 0.056);
      if (side < 0) words.rotation.y = Math.PI;
    }
    put(group, cyl(0.02, 0.02, 0.66, 6), lambert(0x4a4f57), 0, HINGE + 0.03, 0, 0, 0, Math.PI / 2);   // the hinge
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
