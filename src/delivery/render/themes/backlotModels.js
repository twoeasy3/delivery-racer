// ---- The film studio backlot's models: no game state, so the gimmicks page can show them too. What a film crew
// leaves beside a street it is shooting on (a camera crane, lamps on stands, directors' chairs, a clapperboard, a
// wind machine), the studio's water tower and its gate, a golf cart, painted backdrops on scaffolding, and a prop
// or two (a flying saucer, a rocket). Each faces local +z unless it says otherwise.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 12), CONE = new THREE.ConeGeometry(0.5, 1, 12), BALL = new THREE.SphereGeometry(0.5, 14, 10);
const WHEEL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).rotateZ(Math.PI / 2), POLE = new THREE.CylinderGeometry(0.5, 0.5, 1, 8).rotateX(Math.PI / 2);
// a rod from one point to another (a brace, a leg, a jib)
const beam = (parent, material, x0, y0, z0, x1, y1, z1, t = 0.12, geometry = BOX) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.lookAt(x1, y1, z1);
  mesh.scale.set(t, t, Math.hypot(x1 - x0, y1 - y0, z1 - z0));
  parent.add(mesh);
  return mesh;
};

// a board with words painted on it, `w` by `h` m, facing local +z (its back is blank: stand it against something)
export const makeBoard = (text, w, h, bg = '#f4ecd8', fg = '#2a1c12', font = 'bold 44px Georgia, serif') => {
  const canvas = document.createElement('canvas');
  canvas.height = 64;
  canvas.width = Math.max(64, Math.min(1024, Math.round(64 * w / h)));
  const c = canvas.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = fg;
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const wide = c.measureText(text).width, room = canvas.width - 14;
  c.save();
  c.translate(canvas.width / 2, 34);
  if (wide > room) c.scale(room / wide, 1);
  c.fillText(text, 0, 0);
  c.restore();
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
};

// a camera crane: a dolly on four wheels, a column, a long jib up over the road with the camera at its end and
// the weights at the other (the jib runs out along local +z)
export const makeCameraCrane = () => {
  const g = new THREE.Group();
  const steel = lambert(0x2c2f36), yellow = lambert(0xe2b21c), black = lambert(0x141518), glass = glow(0x6fd0ff);
  part(g, BOX, yellow, 0, 0.75, 0, 2.2, 0.5, 3.2);
  for (const x of [-1.15, 1.15]) for (const z of [-1.1, 1.1]) part(g, WHEEL, black, x, 0.45, z, 0.4, 0.9, 0.9);
  part(g, ROD, steel, 0, 2.3, 0, 0.5, 2.8, 0.5);
  const jib = new THREE.Group();
  part(jib, BOX, yellow, 0, 0, 3.2, 0.34, 0.4, 10.4);
  part(jib, BOX, steel, 0, 0.75, 3.2, 0.1, 0.1, 10.2);
  for (let k = 0; k < 6; k++) beam(jib, steel, 0, 0.2, -1.6 + k * 1.9, 0, 0.75, -0.65 + k * 1.9, 0.08);
  part(jib, BOX, black, 0, -0.5, -2.2, 1.1, 1.2, 0.9);                     // the weights
  part(jib, BOX, steel, 0, -0.7, 8.4, 0.16, 1.1, 0.16);                    // the camera's hanger
  part(jib, BOX, black, 0, -1.5, 8.5, 0.6, 0.7, 1.3);                      // the camera
  part(jib, ROD, black, 0, -1.5, 9.4, 0.5, 0.6, 0.5).rotation.x = Math.PI / 2;
  part(jib, ROD, glass, 0, -1.5, 9.72, 0.4, 0.05, 0.4).rotation.x = Math.PI / 2;
  part(jib, BOX, black, 0, -1.02, 8.2, 0.5, 0.36, 0.7);                    // its magazine
  jib.position.set(0, 3.7, 0);
  jib.rotation.x = -0.42;
  g.add(jib);
  g.userData.jib = jib;
  return g;
};

// a lamp on a stand: three legs, a pole, a big square lamp with barn doors, lit (the lamp looks along local +z)
export const makeLightStand = (height = 4.6) => {
  const g = new THREE.Group();
  const steel = lambert(0x2c2f36), black = lambert(0x141518);
  for (let k = 0; k < 3; k++) beam(g, steel, 0, 1.3, 0, Math.sin(k * 2.094) * 1.1, 0, Math.cos(k * 2.094) * 1.1, 0.09);
  part(g, ROD, steel, 0, height / 2, 0, 0.12, height, 0.12);
  const head = new THREE.Group();
  part(head, BOX, black, 0, 0, 0, 1.5, 1.5, 0.8);
  part(head, BOX, glow(0xfff6d8), 0, 0, 0.42, 1.3, 1.3, 0.04);
  for (const [x, y, sx, sy] of [[-0.95, 0, 0.5, 1.5], [0.95, 0, 0.5, 1.5], [0, 0.95, 1.5, 0.5], [0, -0.95, 1.5, 0.5]]) {
    const door = part(head, BOX, black, x, y, 0.55, sx, sy, 0.04);
    door.rotation.set(y ? -Math.sign(y) * 0.7 : 0, x ? Math.sign(x) * 0.7 : 0, 0);
  }
  head.position.y = height + 0.5;
  head.rotation.x = 0.3;
  g.add(head);
  return g;
};

// a director's chair: crossed legs, a canvas seat and back
export const makeDirectorChair = (color = 0xc0392b) => {
  const g = new THREE.Group();
  const wood = lambert(0xb98a55), canvas = lambert(color);
  for (const z of [-0.42, 0.42]) {
    beam(g, wood, -0.42, 0, z, 0.42, 0.95, z, 0.07);
    beam(g, wood, 0.42, 0, z, -0.42, 0.95, z, 0.07);
  }
  for (const x of [-0.45, 0.45]) {
    part(g, BOX, wood, x, 1.3, -0.42, 0.07, 0.8, 0.07);
    part(g, BOX, wood, x, 1.25, 0, 0.09, 0.07, 0.95);
  }
  part(g, BOX, canvas, 0, 0.95, 0, 0.92, 0.05, 0.86);
  part(g, BOX, canvas, 0, 1.52, -0.42, 0.92, 0.36, 0.05);
  return g;
};

// a clapperboard, as a prop taller than a van: the slate, and the striped stick up at an angle
export const makeClapper = () => {
  const g = new THREE.Group();
  const black = lambert(0x18191c), white = lambert(0xf4f4f0);
  part(g, BOX, black, 0, 1.6, 0, 3.6, 2.8, 0.18);
  for (const y of [1.1, 1.8]) part(g, BOX, white, 0, y, 0.1, 3.3, 0.04, 0.02);
  for (const x of [-0.6, 0.7]) part(g, BOX, white, x, 1.45, 0.1, 0.04, 0.7, 0.02);
  const stick = new THREE.Group();
  for (const s of [stick, g]) {
    const y = s === g ? 3.22 : 0.2;
    part(s, BOX, black, s === g ? 0 : 1.8, y, 0, 3.6, 0.4, 0.2);
    for (let k = 0; k < 5; k++) part(s, BOX, white, (s === g ? -1.44 : 0.36) + k * 0.72, y, 0.11, 0.3, 0.4, 0.02).rotation.z = 0.5;
  }
  stick.position.set(-1.8, 3.42, 0);
  stick.rotation.z = 0.42;
  g.add(stick);
  return g;
};

// a wind machine: a big caged fan on a wheeled stand (it blows along local +z); its blades turn
export const makeWindMachine = () => {
  const g = new THREE.Group();
  const steel = lambert(0x5a5f67), black = lambert(0x1c1d21), orange = lambert(0xe2681c);
  part(g, BOX, orange, 0, 0.6, 0, 2.6, 0.5, 2.2);
  for (const x of [-1.3, 1.3]) for (const z of [-0.8, 0.8]) part(g, WHEEL, black, x, 0.4, z, 0.3, 0.8, 0.8);
  for (const x of [-1.1, 1.1]) part(g, BOX, steel, x, 2.4, 0, 0.16, 3.2, 0.16);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.12, 6, 28), steel);
  ring.position.set(0, 3.1, 0.3);
  g.add(ring);
  const back = ring.clone();
  back.position.z = -0.5;
  g.add(back);
  for (let k = 0; k < 8; k++) beam(g, steel, Math.cos(k * 0.785) * 2, 3.1 + Math.sin(k * 0.785) * 2, 0.3, Math.cos(k * 0.785) * 2, 3.1 + Math.sin(k * 0.785) * 2, -0.5, 0.07);
  for (const a of [0, 0.785, 1.571, 2.356]) beam(g, steel, Math.cos(a) * 2, 3.1 + Math.sin(a) * 2, 0.34, -Math.cos(a) * 2, 3.1 - Math.sin(a) * 2, 0.34, 0.05);
  const fan = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const blade = part(fan, BOX, black, Math.cos(k * 1.571) * 0.95, Math.sin(k * 1.571) * 0.95, 0, 1.7, 0.5, 0.06);
    blade.rotation.z = k * 1.571;
    blade.rotation.x = 0.35;
  }
  const hub = part(fan, ROD, orange, 0, 0, 0, 0.6, 0.5, 0.6);
  hub.rotation.x = Math.PI / 2;
  fan.position.set(0, 3.1, -0.1);
  g.add(fan);
  part(g, BOX, black, 0, 3.1, -0.9, 0.9, 0.9, 1);
  hub.onBeforeRender = () => { fan.rotation.z = performance.now() * 0.009; }; // (turned as it is drawn: scenery has no frame call of its own)
  return g;
};

// a golf cart, the way everyone gets about a studio lot
export const makeGolfCart = (color = 0xf4f1e8) => {
  const g = new THREE.Group();
  const body = lambert(color), black = lambert(0x1c1d21), seat = lambert(0x8a5a36);
  part(g, BOX, body, 0, 0.7, 0, 1.4, 0.5, 2.8);
  part(g, BOX, body, 0, 1.05, 1.1, 1.3, 0.4, 0.6);
  part(g, BOX, seat, 0, 1.1, -0.3, 1.25, 0.25, 0.7);
  part(g, BOX, seat, 0, 1.55, -0.7, 1.25, 0.7, 0.14);
  for (const x of [-0.62, 0.62]) {
    part(g, BOX, black, x, 1.7, 0.85, 0.06, 1.3, 0.06);
    part(g, BOX, black, x, 1.7, -0.95, 0.06, 1.3, 0.06);
    for (const z of [-0.95, 0.95]) part(g, WHEEL, black, x * 1.15, 0.38, z, 0.28, 0.76, 0.76);
  }
  part(g, BOX, body, 0, 2.4, -0.05, 1.5, 0.1, 2.3);
  return g;
};

// the studio's water tower, the lot's landmark: a tank on four braced legs, a cone of a roof, a ladder.
// wood: the Western town's, a wooden tank on a timber frame, half the size
export const makeWaterTower = (wood = false) => {
  const g = new THREE.Group();
  const frame = lambert(wood ? 0x6b4a2c : 0x8f959c), tank = lambert(wood ? 0x9a6b42 : 0xe8e4d8), roof = lambert(wood ? 0x5a3a22 : 0xb5352c), band = lambert(wood ? 0x3a2a1c : 0xb5352c);
  const H = wood ? 9 : 24, R = wood ? 2.6 : 5.5, T = wood ? 4.2 : 9, spread = wood ? 2.6 : 6;
  for (const x of [-1, 1]) for (const z of [-1, 1]) beam(g, frame, x * spread, 0, z * spread, x * R * 0.6, H, z * R * 0.6, wood ? 0.35 : 0.5);
  for (let k = 0; k < (wood ? 2 : 4); k++) {
    const y0 = k * H / (wood ? 2 : 4), y1 = (k + 1) * H / (wood ? 2 : 4), f = (y) => spread + (R * 0.6 - spread) * y / H;
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      beam(g, frame, ax * f(y0), y0, az * f(y0), bx * f(y1), y1, bz * f(y1), wood ? 0.16 : 0.22);
      beam(g, frame, ax * f(y1), y1, az * f(y1), bx * f(y1), y1, bz * f(y1), wood ? 0.16 : 0.22);
    }
  }
  part(g, BOX, frame, 0, H + 0.2, 0, R * 1.5, 0.4, R * 1.5);
  part(g, ROD, tank, 0, H + 0.4 + T / 2, 0, R * 2, T, R * 2);
  for (const y of wood ? [0.25, 0.5, 0.75] : [0.12, 0.88]) part(g, ROD, band, 0, H + 0.4 + T * y, 0, R * 2.06, wood ? 0.14 : 0.5, R * 2.06);
  part(g, CONE, roof, 0, H + 0.4 + T + R * 0.4, 0, R * 2.3, R * 0.8, R * 2.3);
  if (!wood) part(g, BALL, roof, 0, H + 0.4 + T + R * 0.85, 0, 0.9, 0.9, 0.9);
  part(g, BOX, frame, 0, H / 2, spread * 0.82, 0.5, H, 0.08).rotation.x = -Math.atan2(spread - R * 0.6, H);
  return g;
};

// a painted backdrop on scaffolding, `w` m wide and `h` high, its painted face to local +z and its poles and
// braces behind. kind: 'sky' (blue, with clouds), 'sunset', 'mesa' (red rock under a pale sky), 'stars' (space,
// and a ringed planet), 'city' (a skyline at dusk) or 'green' (a green screen)
const paint = (kind) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext('2d'), W = 256, H = 128;
  const wash = (stops) => { const g = c.createLinearGradient(0, 0, 0, H); stops.forEach(([at, colour]) => g.addColorStop(at, colour)); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  const cloud = (x, y, r, colour) => { c.fillStyle = colour; for (const [dx, dy, k] of [[0, 0, 1], [-1.1, 0.25, 0.7], [1.1, 0.2, 0.75], [0.45, -0.45, 0.7], [-0.5, -0.35, 0.6]]) { c.beginPath(); c.ellipse(x + dx * r, y + dy * r, r * k * 1.3, r * k * 0.7, 0, 0, 7); c.fill(); } };
  if (kind === 'green') { c.fillStyle = '#27c24a'; c.fillRect(0, 0, W, H); for (const [x, y] of [[40, 30], [128, 30], [216, 30], [40, 98], [128, 98], [216, 98]]) { c.fillStyle = '#f4f4f0'; c.fillRect(x - 5, y - 1, 10, 2); c.fillRect(x - 1, y - 5, 2, 10); } }
  else if (kind === 'sunset') { wash([[0, '#3a2a6a'], [0.45, '#d8527a'], [0.75, '#f6a04a'], [1, '#ffe08a']]); c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(128, 112, 24, 0, 7); c.fill(); cloud(60, 60, 16, 'rgba(120,50,110,0.8)'); cloud(200, 44, 20, 'rgba(120,50,110,0.8)'); }
  else if (kind === 'mesa') {
    wash([[0, '#8ec4e8'], [0.6, '#f2dcb0'], [1, '#f2c890']]);
    for (const [x, w, h, colour] of [[10, 70, 50, '#c26a3a'], [100, 34, 66, '#a8512c'], [150, 90, 44, '#c26a3a'], [60, 26, 34, '#b05c30'], [228, 28, 58, '#a8512c']]) { c.fillStyle = colour; c.fillRect(x, H - 22 - h, w, h + 4); c.fillStyle = 'rgba(70,30,20,0.25)'; c.fillRect(x + w * 0.7, H - 22 - h, w * 0.3, h + 4); }
    c.fillStyle = '#d9a86a'; c.fillRect(0, H - 22, W, 22);
  } else if (kind === 'stars') {
    c.fillStyle = '#080a1c'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff'; for (let k = 0; k < 90; k++) c.fillRect((k * 97) % W, (k * 53 + (k % 7) * 11) % H, 1 + (k % 5 === 0), 1 + (k % 5 === 0));
    c.fillStyle = '#e8a04a'; c.beginPath(); c.arc(176, 60, 30, 0, 7); c.fill();
    c.strokeStyle = '#f4d8a0'; c.lineWidth = 4; c.beginPath(); c.ellipse(176, 60, 54, 12, -0.3, 0, 7); c.stroke();
  } else if (kind === 'city') {
    wash([[0, '#2a3a7a'], [0.7, '#e88a6a'], [1, '#f6c88a']]);
    for (let k = 0; k < 16; k++) { const x = k * 16, h = 30 + ((k * 37) % 60); c.fillStyle = '#1c1c2c'; c.fillRect(x, H - h, 14, h); c.fillStyle = '#ffe9a8'; for (let y = H - h + 5; y < H - 4; y += 8) for (let q = 2; q < 12; q += 5) if ((k + y + q) % 3) c.fillRect(x + q, y, 2, 3); }
  } else { wash([[0, '#3f8fe0'], [0.7, '#a8d4f6'], [1, '#e6f2fb']]); cloud(52, 44, 18, '#ffffff'); cloud(150, 70, 24, '#ffffff'); cloud(214, 30, 14, '#ffffff'); cloud(100, 100, 12, 'rgba(255,255,255,0.85)'); }
  return new THREE.CanvasTexture(canvas);
};
const painted = {};
export const makeBackdrop = (w = 60, h = 28, kind = 'sky') => {
  const g = new THREE.Group();
  const pole = lambert(0x8f959c), ply = lambert(0xb98a55);
  const lift = 2.5; // (the painting stands this far off the ground, on its scaffold)
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: painted[kind] || (painted[kind] = paint(kind)) }));
  face.position.set(0, lift + h / 2, 0.16);
  g.add(face);
  part(g, BOX, ply, 0, lift + h / 2, 0, w, h, 0.3);
  // the scaffold behind: standards, three rows deep, ledgers along it at every lift, braces down to the ground
  const bays = Math.max(2, Math.round(w / 7)), lifts = Math.max(2, Math.round((h + lift) / 6));
  for (let k = 0; k <= bays; k++) {
    const x = -w / 2 + k * w / bays;
    for (const z of [-0.5, -3.2, -6]) part(g, ROD, pole, x, (h + lift) * (z < -5 ? 0.3 : z < -3 ? 0.62 : 0.5), z, 0.22, (h + lift) * (z < -5 ? 0.6 : z < -3 ? 1.24 : 1) , 0.22);
    beam(g, pole, x, h + lift - 1, -0.5, x, 0, -11, 0.2, POLE);
    for (let j = 1; j <= lifts; j++) beam(g, pole, x, j * (h + lift) / lifts * 0.6, -0.5, x, j * (h + lift) / lifts * 0.6, -6, 0.16);
  }
  for (let j = 0; j <= lifts; j++) for (const z of [-0.5, -3.2]) part(g, BOX, pole, 0, Math.max(0.3, j * (h + lift) / lifts - 0.2), z, w, 0.18, 0.18);
  return g;
};

// props: a flying saucer on a stand (its dome lit), and a rocket standing on its fins
export const makeSaucer = () => {
  const g = new THREE.Group();
  const hull = lambert(0xb9c2cc), dark = lambert(0x5a5f67);
  for (let k = 0; k < 3; k++) beam(g, dark, Math.sin(k * 2.094) * 3, 0, Math.cos(k * 2.094) * 3, Math.sin(k * 2.094) * 1.5, 4.2, Math.cos(k * 2.094) * 1.5, 0.25);
  part(g, BALL, hull, 0, 5, 0, 13, 2.4, 13);
  part(g, ROD, dark, 0, 4.5, 0, 6, 1.2, 6);
  part(g, BALL, glow(0x9ff0c0), 0, 6, 0, 5, 3.6, 5);
  for (let k = 0; k < 10; k++) part(g, BALL, glow(k % 2 ? 0xff5a4a : 0xffe12b), Math.sin(k * 0.628) * 5.6, 4.9, Math.cos(k * 0.628) * 5.6, 0.7, 0.5, 0.7);
  return g;
};
export const makeRocket = () => {
  const g = new THREE.Group();
  const white = lambert(0xf4f4f0), red = lambert(0xd22a2a), dark = lambert(0x2c2f36);
  part(g, ROD, white, 0, 12, 0, 5, 16, 5);
  part(g, CONE, red, 0, 23.5, 0, 5, 7, 5);
  part(g, ROD, red, 0, 14, 0, 5.1, 1.2, 5.1);
  part(g, BALL, glow(0x6fd0ff), 0, 17, 2.3, 1.6, 1.6, 0.8);
  for (let k = 0; k < 4; k++) { const fin = part(g, BOX, red, Math.sin(k * 1.571) * 3.4, 4, Math.cos(k * 1.571) * 3.4, 0.4, 8, 3.4); fin.rotation.y = k * 1.571; }
  part(g, CONE, dark, 0, 3, 0, 3.4, 3, 3.4);
  return g;
};
