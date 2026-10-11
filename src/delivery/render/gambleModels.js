// ---- Gimmick Road 3's models (the road gambles: ../gambles.js), with no game state: render/gambles.js sets them
// down in a level, and the Gimmicks page (../gimmicks.js) shows them on its cards ----
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// words on a board (a canvas texture): one or two lines
export const makeBoard = (text, bg, fg, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * h / w);
  const c = canvas.getContext('2d'), lines = String(text).split('\n');
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = fg;
  c.lineWidth = 10;
  c.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  c.fillStyle = fg;
  c.font = 'bold ' + Math.round(canvas.height * (lines.length > 1 ? 0.36 : 0.55)) + 'px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, k) => c.fillText(line, canvas.width / 2, canvas.height * (k + 0.5) / lines.length + 2, canvas.width - 44)); // (a long line is squeezed to fit the board)
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
};
// a board on a post, facing the traffic coming up to it (the model's -z)
export const makeSign = (text, bg = '#ffd23f', fg = '#111', w = 5.4, h = 1.8, post = 4) => {
  const g = new THREE.Group();
  add(g, box(0.2, post, 0.2), lambert(0x8a9096), 0, post / 2, 0);
  const sign = makeBoard(text, bg, fg, w, h);
  sign.position.set(0, post + h / 2 - 0.3, -0.12);
  sign.rotation.y = Math.PI;
  g.add(sign);
  return g;
};

// a height bar: a striped beam `clearance` m off the ground from x = `from` to x = `to` (m, the model's x), hung
// from a gantry on a post at each end, with its limit on a roundel in the middle (facing the model's -z)
export const makeHeightBar = (from, to, clearance = 2) => {
  const g = new THREE.Group(), steel = lambert(0x6d737b), w = to - from, mid = (from + to) / 2, top = clearance + 1.5;
  for (const x of [from - 0.3, to + 0.3]) add(g, box(0.4, top, 0.4), steel, x, top / 2, 0);
  add(g, box(w + 1, 0.3, 0.4), steel, mid, top, 0);
  const n = Math.max(4, Math.round(w / 1.2));
  for (let k = 0; k < n; k++) add(g, box(w / n, 0.42, 0.3), glow(k % 2 ? 0x16181c : 0xffd23f), from + (k + 0.5) * w / n, clearance + 0.21, 0); // (the bar itself, its underside at the limit)
  for (let x = from + 0.4; x < to; x += Math.max(1.5, (w - 0.8) / 4)) add(g, box(0.06, top - clearance - 0.4, 0.06), steel, x, (top + clearance + 0.4) / 2, 0); // (hangers)
  const plate = makeBoard(clearance.toFixed(1) + ' m', '#fff', '#c1121f', 2.2, 1.3);
  plate.position.set(mid, top + 0.85, -0.25);
  plate.rotation.y = Math.PI;
  g.add(plate);
  return g;
};

// a speed cushion: a low flat-topped hump `width` m across and `long` m along the road, a white arrow on its ramp
export const makeCushion = (width = 2.3, long = 3) => {
  const g = new THREE.Group(), brick = lambert(0xb5482f);
  add(g, box(width, 0.09, long), brick, 0, 0.045, 0);
  add(g, box(width - 0.5, 0.07, long - 0.9), lambert(0xc65a3c), 0, 0.125, 0);
  for (const x of [-0.5, 0.5]) add(g, box(0.28, 0.02, 0.8), glow(0xf4f4f4), x * (width - 1), 0.1, -long / 2 + 0.45);
  return g;
};

// a tall dark conifer, `height` m: what shades the road
export const makeShadeTree = (height = 13) => {
  const g = new THREE.Group(), green = lambert(0x1f3d2b);
  add(g, new THREE.CylinderGeometry(0.3, 0.4, height * 0.25, 6), lambert(0x4a3524), 0, height * 0.125, 0);
  for (const [r, y, h] of [[2.6, 0.38, 0.5], [2.0, 0.62, 0.42], [1.3, 0.84, 0.32]]) add(g, new THREE.ConeGeometry(r, height * h, 7), green, 0, height * y, 0);
  return g;
};

// a depth post: a white post banded every quarter metre, red up to `depth` m (the water's level), `height` m tall
export const makeDepthPost = (depth = 0.5, height = 2) => {
  const g = new THREE.Group();
  for (let y = 0; y < height; y += 0.25) add(g, box(0.28, 0.25, 0.28), glow(y + 0.125 < depth ? 0xd8262b : Math.round(y / 0.25) % 2 ? 0xf4f4f4 : 0x1b1d21), 0, y + 0.125, 0);
  add(g, box(0.5, 0.08, 0.5), glow(0x2f9bd8), 0, depth, 0); // (a collar at the water's level)
  return g;
};

// a car transporter with its ramps down: its deck a slope `run` m long (the model's +z) up to a lip `top` m high,
// `half` m either side of its middle; its cab stands on beyond the lip, under it
export const makeTransporter = (run = 15, top = 4.15, half = 1.5) => {
  const g = new THREE.Group(), steel = lambert(0xc23b22), dark = lambert(0x2b2f38), plate = lambert(0x8a9096), a = Math.atan(top / run), L = Math.hypot(run, top);
  for (const x of [-1, 1]) { // (two tracks to drive up, a rail outside each, the first few metres of them the ramps let down)
    const track = add(g, box(0.95, 0.12, L), plate, x * (half - 0.55), top / 2, run / 2);
    track.rotation.x = -a;
    const rail = add(g, box(0.14, 0.3, L), steel, x * (half + 0.02), top / 2 + 0.12, run / 2);
    rail.rotation.x = -a;
    for (let z = 4.5; z < run; z += 3.4) add(g, box(0.16, z * top / run, 0.16), steel, x * (half - 0.05), z * top / run / 2, z); // (posts)
  }
  for (let z = 1; z < run; z += 1.5) { const rung = add(g, box(2 * half - 0.9, 0.08, 0.2), dark, 0, z * top / run - 0.05, z); rung.rotation.x = -a; }
  add(g, box(2 * half - 0.2, 0.3, run - 4.5), dark, 0, 1.05, 4.5 + (run - 4.5) / 2); // (the trailer's bed, under the deck)
  for (const z of [5.4, 6.7, run - 2.2]) for (const x of [-1, 1]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.36, 12).rotateZ(Math.PI / 2), dark, x * (half - 0.25), 0.5, z);
  for (const [x, z] of [[-1, 0.3], [1, 0.3]]) add(g, box(0.5, 0.05, 0.5), glow(0xffd23f), x * (half - 0.55), 0.04, z); // (the feet of the ramps, marked)
  // the cab, beyond the lip and lower than it
  add(g, box(2 * half - 0.3, 2.3, 2.5), steel, 0, 1.75, run + 1.35);
  add(g, box(2 * half - 0.5, 0.9, 0.1), lambert(0x9fd3ff), 0, 2.2, run + 2.62);
  for (const x of [-1, 1]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.36, 12).rotateZ(Math.PI / 2), dark, x * (half - 0.25), 0.5, run + 1.6);
  for (const x of [-1, 1]) add(g, box(0.3, 0.2, 0.08), glow(0xff8a1a), x * (half - 0.3), top + 0.05, run - 0.1); // (lamps on the lip)
  return g;
};

// a windsock on its pole: `sock`, hinged at the top, reaches out along its local +x (see syncGambles)
const POLE = lambert(0xd9dde2), RING = lambert(0x30343a), SOCK = [lambert(0xff6a1a, { side: THREE.DoubleSide }), lambert(0xf4f4f4, { side: THREE.DoubleSide })];
export const makeWindsock = (height = 7.5, length = 4.2) => {
  const g = new THREE.Group(), turn = new THREE.Group(), sock = new THREE.Group();
  add(g, box(0.16, height, 0.16), POLE, 0, height / 2, 0);
  turn.position.y = height;
  add(turn, new THREE.TorusGeometry(0.62, 0.06, 6, 14).rotateY(Math.PI / 2), RING);
  for (let k = 0; k < 5; k++) { // (five bands, orange and white, narrowing to the tail)
    const r0 = 0.6 - k * 0.07, r1 = 0.6 - (k + 1) * 0.07, piece = length / 5;
    add(sock, new THREE.CylinderGeometry(r1, r0, piece, 10, 1, true).rotateZ(-Math.PI / 2), SOCK[k % 2], piece * (k + 0.5), 0, 0);
  }
  turn.add(sock);
  g.add(turn);
  g.userData.turn = turn;
  g.userData.sock = sock;
  // how it hangs: `level` 0 (limp) .. 1 (straight out), blowing to the side `dir` (1: the model's -x), at time t
  g.userData.set = (level, dir, t) => {
    turn.rotation.y = dir > 0 ? Math.PI : 0;
    sock.rotation.z = -(1 - level) * 1.25 + Math.sin(t * 9) * 0.04 * level;
    sock.rotation.y = Math.sin(t * 6.3) * 0.08 * level;
  };
  return g;
};
