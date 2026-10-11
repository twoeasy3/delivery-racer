// ---- The theme park's models: no game state. A Ferris wheel, a carousel, a fairy-tale castle, and a
// rollercoaster built along whatever course it is given, its train running round it. Each returns a group;
// one that moves has userData.animate(t), t in seconds.
import * as THREE from 'three';
import { striped } from './sceneryClock.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 14), CONE = new THREE.ConeGeometry(0.5, 1, 16);
const BALL = new THREE.SphereGeometry(0.5, 12, 8);
// (at night, a theme with "night": the rides' bulbs, which are their own light)
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const BULBS = [0xfff2b0, 0xff6fb1, 0x7fe8ff];
export const PARK_COLOURS = [0xe23b3b, 0xf2c21c, 0x2f7fe0, 0x35a852, 0xf27d1a, 0x9a4fd0, 0xff6fb1, 0x19b8c4];

// a Ferris wheel `r` m in radius, standing across local z (seen whole from along it): two rims, spokes, a gondola
// at the end of each, hung so it stays upright as the wheel turns; an A-frame each side of the hub. lit: bulbs
// round its rims and out along every other spoke
export const makeFerrisWheel = (r = 26, lit = false) => {
  const g = new THREE.Group(), wheel = new THREE.Group();
  const white = lambert(0xf4f4f0), steel = lambert(0x8d97a6), hubMat = lambert(0xe23b3b);
  const hubY = r + 5, N = 16, gondolas = [];
  const RIM = new THREE.TorusGeometry(r, 0.4, 6, 48), INNER = new THREE.TorusGeometry(r * 0.55, 0.22, 6, 36);
  for (const z of [-1.7, 1.7]) {
    part(wheel, RIM, white, 0, 0, z);
    part(wheel, INNER, white, 0, 0, z);
    for (let k = 0; k < N; k++) {
      const a = k / N * Math.PI * 2;
      const spoke = part(wheel, BOX, steel, Math.cos(a) * r / 2, Math.sin(a) * r / 2, z, r, 0.22, 0.22);
      spoke.rotation.z = a;
    }
  }
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r;
    part(wheel, ROD, steel, x, y, 0, 0.3, 3.6, 0.3).rotation.x = Math.PI / 2; // the axle a gondola hangs from
    const car = new THREE.Group(), paint = lambert(PARK_COLOURS[k % PARK_COLOURS.length]);
    part(car, BOX, paint, 0, -2.2, 0, 2.8, 1.5, 2.6);       // the tub
    part(car, BOX, white, 0, -0.5, 0, 3, 0.25, 2.8);        // its roof
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(car, BOX, steel, sx * 1.3, -1.1, sz * 1.2, 0.12, 1.3, 0.12);
    car.position.set(x, y, 0);
    wheel.add(car);
    gondolas.push(car);
  }
  part(wheel, ROD, hubMat, 0, 0, 0, 3.4, 5, 3.4).rotation.x = Math.PI / 2; // the hub
  if (lit) {
    const bulbs = BULBS.map(glow);
    for (const z of [-2.2, 2.2]) {
      for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; part(wheel, BALL, bulbs[k % 3], Math.cos(a) * r, Math.sin(a) * r, z, 0.8, 0.8, 0.8); }
      for (let k = 0; k < N; k += 2) for (let d = r * 0.2; d < r * 0.95; d += r * 0.15) { const a = k / N * Math.PI * 2; part(wheel, BALL, bulbs[0], Math.cos(a) * d, Math.sin(a) * d, z, 0.6, 0.6, 0.6); }
    }
  }
  wheel.position.y = hubY;
  g.add(wheel);
  for (const z of [-3.2, 3.2]) for (const side of [-1, 1]) { // the legs: an A each side
    const reach = r * 0.42, len = Math.hypot(reach, hubY);
    const leg = part(g, BOX, white, side * reach / 2, hubY / 2, z, 0.9, len, 0.9);
    leg.rotation.z = side * Math.atan2(reach, hubY);
  }
  part(g, BOX, lambert(0xd8c9a8), 0, 0.4, 0, r * 1.1, 0.8, 9); // the platform under it
  g.userData.animate = (t) => {
    wheel.rotation.z = t * 0.16;
    for (const car of gondolas) car.rotation.z = -wheel.rotation.z;
  };
  g.userData.animate(0);
  return g;
};

// a carousel: a round deck under a striped canopy, horses going up and down on brass poles as it turns
const [CANOPY_A, CANOPY_B] = striped(new THREE.ConeGeometry(0.5, 1, 16), 16);
export const makeCarousel = (lit = false) => {
  const g = new THREE.Group(), turn = new THREE.Group();
  const red = lambert(0xd8262b), cream = lambert(0xfff3d6), gold = lambert(0xf2c21c), deck = lambert(0x8a5a8f);
  part(g, ROD, deck, 0, 0.35, 0, 15, 0.7, 15);
  part(g, ROD, cream, 0, 3.6, 0, 2.4, 6.4, 2.4);
  part(g, CANOPY_A, red, 0, 8.6, 0, 16.4, 3.6, 16.4);
  part(g, CANOPY_B, cream, 0, 8.6, 0, 16.4, 3.6, 16.4);
  part(g, ROD, gold, 0, 6.6, 0, 16.2, 0.7, 16.2);          // the valance round its edge
  part(g, BALL, gold, 0, 10.8, 0, 1.3, 1.3, 1.3);
  if (lit) { // bulbs round the valance and up the centre drum
    const bulbs = BULBS.map(glow);
    for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; part(g, BALL, bulbs[k % 3], Math.cos(a) * 8.25, 6.6, Math.sin(a) * 8.25, 0.55, 0.55, 0.55); }
    for (let k = 0; k < 8; k++) for (const y of [2, 3.6, 5.2]) { const a = k / 8 * Math.PI * 2; part(g, BALL, bulbs[0], Math.cos(a) * 1.25, y, Math.sin(a) * 1.25, 0.4, 0.4, 0.4); }
  }
  const horses = [];
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2, horse = new THREE.Group(), coat = lambert([0xffffff, 0x8a5a2b, 0x2a2a2a, 0xf2e0c0][k % 4]);
    part(horse, BOX, coat, 0, 0, 0, 0.6, 0.8, 1.9);          // its body,
    part(horse, BOX, coat, 0, 0.75, 0.9, 0.45, 0.9, 0.5).rotation.x = 0.5; // neck and head,
    part(horse, BOX, coat, 0, 1.15, 1.35, 0.4, 0.4, 0.8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(horse, BOX, coat, sx * 0.2, -0.75, sz * 0.7, 0.16, 0.8, 0.16);
    part(horse, BOX, lambert(PARK_COLOURS[k % PARK_COLOURS.length]), 0, 0.45, -0.1, 0.66, 0.14, 0.8); // and its saddle
    const pole = part(turn, ROD, gold, Math.cos(a) * 5.8, 3.6, Math.sin(a) * 5.8, 0.12, 6, 0.12);
    horse.position.set(pole.position.x, 2, pole.position.z);
    horse.rotation.y = -a;                                    // (nose round the ring)
    turn.add(horse);
    horses.push(horse);
  }
  g.add(turn);
  g.userData.animate = (t) => {
    turn.rotation.y = t * 0.5;
    horses.forEach((horse, k) => { horse.position.y = 2 + Math.sin(t * 2.2 + k * 1.9) * 0.55; });
  };
  return g;
};

// a fairy-tale castle for the skyline, some 110 m to the tip of its tallest spire at scale 1: pale walls, a keep,
// round towers under blue cones, pennants; it faces local +z. lit: its windows and its gate lit from inside
export const makeCastle = (scale = 1, lit = false) => {
  const g = new THREE.Group();
  const wall = lambert(0xf7e9ef), pale = lambert(0xffffff), roof = lambert(0x3d6fd6), pink = lambert(0xf2a7c6), dark = lit ? glow(0xffd76a) : lambert(0x5b4a66), flag = lambert(0xe23b3b), gold = lambert(0xf2c21c);
  const tower = (x, z, r, h, cap = roof) => {
    part(g, ROD, wall, x, h / 2, z, r * 2, h, r * 2);
    part(g, ROD, pale, x, h + 1, z, r * 2.3, 2, r * 2.3);           // a collar under the roof
    part(g, CONE, cap, x, h + 2 + r * 1.6, z, r * 2.5, r * 3.2, r * 2.5);
    part(g, BOX, dark, x, h + 2 + r * 3.2 + 2.5, z, 0.25, 5, 0.25); // a pole,
    part(g, BOX, flag, x + 1.6, h + 2 + r * 3.2 + 4, z, 3, 1.6, 0.15); // and its pennant
    for (let y = h * 0.45; y < h - 4; y += 12) part(g, BOX, dark, x, y, z + r * 0.97, r * 0.35, 3.2, 0.4); // windows up it
  };
  part(g, BOX, wall, 0, 9, 0, 78, 18, 46);                        // the curtain wall,
  for (let x = -37; x <= 37; x += 6.2) part(g, BOX, pale, x, 19.4, 22.4, 3.2, 2.8, 1.6); // its battlements,
  part(g, BOX, dark, 0, 6, 23.1, 9, 12, 0.6);                      // and its gate
  part(g, ROD, dark, 0, 12, 23.1, 9, 0.6, 9).rotation.x = Math.PI / 2;
  part(g, BOX, wall, 0, 26, -4, 44, 34, 30);                       // the keep
  part(g, BOX, pink, 0, 44, -4, 46, 2.4, 32);
  part(g, BOX, wall, 0, 52, -6, 24, 18, 20);
  for (const sx of [-1, 1]) {
    tower(sx * 39, 23, 6, 30);
    tower(sx * 39, -23, 6, 34);
    tower(sx * 22, 11, 5, 52, pink);
    tower(sx * 13, -14, 4.5, 70);
  }
  tower(0, -6, 7, 84);
  part(g, BALL, gold, 0, 84 + 2 + 22.4 + 5.6, -6, 2, 2, 2);
  g.scale.setScalar(scale);
  return g;
};

// ---- a rollercoaster along a closed course: `points`, THREE.Vector3 in the world, in the order it is ridden
// (the first where it is level, in its station). Two rails on a spine, ties between them, white posts down to the
// ground wherever `stands(x, z)` says one may stand (not on a road) and the track is the right way up, and a train
// of cars round it, quick in the dips and slow over the tops.
//   ground(x, z): the height of the ground there;  loop: [from, to], the points (by index) of a loop, which has
//   no posts of its own;  trains: how many;  colour: of the rails
export const makeCoaster = (points, { ground = () => 0, stands = () => true, loop = null, trains = 1, colour = 0xe23b3b, cars = 6 } = {}) => {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const N = Math.max(120, Math.round(curve.getLength() / 1.5));
  const P = [], T = [], U = [], S = [];
  const frames = curve.computeFrenetFrames(N, true);
  // (the frames are carried round the course without twisting, so a loop turns the train over and brings it
  // back; turned as one so that it is upright in the station)
  const n0 = frames.normals[0], b0 = frames.binormals[0], up = new THREE.Vector3(0, 1, 0);
  const roll = Math.atan2(up.dot(b0), up.dot(n0)), q = new THREE.Quaternion();
  for (let i = 0; i <= N; i++) {
    P.push(curve.getPoint(i / N));
    T.push(frames.tangents[i]);
    q.setFromAxisAngle(frames.tangents[i], roll);
    U.push(frames.normals[i].clone().applyQuaternion(q));
    S.push(new THREE.Vector3().crossVectors(U[i], T[i]).normalize());
  }
  // a rail: a tube swept round the course, `across` m to one side of it and `above` m over it
  const sweep = (across, above, r, sides = 5) => {
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      for (let k = 0; k < sides; k++) {
        const a = k / sides * Math.PI * 2, c = Math.cos(a) * r + across, s = Math.sin(a) * r + above;
        pos.push(P[i].x + S[i].x * c + U[i].x * s, P[i].y + S[i].y * c + U[i].y * s, P[i].z + S[i].z * c + U[i].z * s);
      }
      if (i) for (let k = 0; k < sides; k++) {
        const a = (i - 1) * sides + k, b = (i - 1) * sides + (k + 1) % sides;
        idx.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  const paint = lambert(colour, { side: THREE.DoubleSide }), white = lambert(0xf4f4f0, { side: THREE.DoubleSide });
  for (const side of [-1, 1]) g.add(new THREE.Mesh(sweep(side * 0.75, 0, 0.16), paint));
  g.add(new THREE.Mesh(sweep(0, -0.75, 0.34, 6), white));
  // ties: a V from each rail down to the spine, every other step
  const m = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), at = new THREE.Vector3();
  const ties = new THREE.InstancedMesh(BOX, white, Math.floor(N / 2) * 2);
  let n = 0;
  for (let i = 0; i < N - 1; i += 2) {
    for (const side of [-1, 1]) {
      x.copy(S[i]).multiplyScalar(side * 0.75).addScaledVector(U[i], 0.75);     // from the spine up to a rail
      const len = x.length();
      y.crossVectors(T[i], x).normalize();
      at.copy(P[i]).addScaledVector(S[i], side * 0.375).addScaledVector(U[i], -0.375);
      m.makeBasis(x.clone().normalize().multiplyScalar(len), y.multiplyScalar(0.12), T[i].clone().multiplyScalar(0.14)).setPosition(at);
      ties.setMatrixAt(n++, m);
    }
  }
  ties.count = n;
  g.add(ties);
  // posts: every 9 m or so where the track is upright and something may stand under it
  const inLoop = (i) => loop && i / N * points.length >= loop[0] - 0.5 && i / N * points.length <= loop[1] + 0.5;
  const posts = [];
  for (let i = 0; i < N; i += 6) {
    if (U[i].y < 0.75 || Math.abs(T[i].y) > 0.75 || inLoop(i) || !stands(P[i].x, P[i].z)) continue;
    const foot = ground(P[i].x, P[i].z), top = P[i].y - 0.9;
    if (top - foot > 0.8) posts.push([P[i].x, foot, P[i].z, top - foot]);
  }
  const legs = new THREE.InstancedMesh(ROD, lambert(0xf4f4f0), posts.length * 2);
  posts.forEach(([px, foot, pz, h], i) => {
    m.makeScale(0.5, h, 0.5).setPosition(px, foot + h / 2, pz);
    legs.setMatrixAt(i * 2, m);
    m.makeScale(1.6, 0.5, 1.6).setPosition(px, foot + 0.25, pz);      // its footing
    legs.setMatrixAt(i * 2 + 1, m);
  });
  g.add(legs);
  // the train: where it is at any moment, from how fast it goes at each height (the higher, the slower)
  let top = -Infinity;
  for (const p of P) top = Math.max(top, p.y);
  const dist = [0], time = [0];
  for (let i = 1; i <= N; i++) {
    const d = P[i].distanceTo(P[i - 1]), v = Math.max(6, Math.min(30, Math.sqrt(19.6 * (top + 1.5 - (P[i].y + P[i - 1].y) / 2))));
    dist.push(dist[i - 1] + d);
    time.push(time[i - 1] + d / v);
  }
  const lap = time[N], length = dist[N];
  const find = (table, value) => { // the step a value falls in, and how far through it
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (table[mid] <= value) lo = mid; else hi = mid; }
    return lo + (value - table[lo]) / Math.max(1e-6, table[lo + 1] - table[lo]);
  };
  const fleet = [];
  for (let k = 0; k < trains; k++) {
    const train = [];
    for (let c = 0; c < cars; c++) {
      const car = new THREE.Group(), body = lambert(PARK_COLOURS[(k * 3 + (c ? 1 : 0)) % PARK_COLOURS.length]);
      part(car, BOX, body, 0, 0.55, 0, 1.9, 0.9, 2.5);
      part(car, BOX, body, 0, 1.05, 1.1, 1.9, 0.5, 0.3);
      for (const sx of [-0.45, 0.45]) { part(car, BALL, lambert(0xf2c9a0), sx, 1.45, -0.2, 0.55, 0.6, 0.55); part(car, BOX, lambert(PARK_COLOURS[(c + (sx > 0 ? 2 : 5)) % PARK_COLOURS.length]), sx, 1.0, -0.2, 0.6, 0.5, 0.5); }
      car.matrixAutoUpdate = false;
      g.add(car);
      train.push(car);
    }
    fleet.push(train);
  }
  g.userData.animate = (t) => {
    fleet.forEach((train, k) => {
      const h = find(time, (t + k * lap / trains) % lap), h0 = Math.min(N - 1, Math.floor(h)), head = dist[h0] + (h - h0) * (dist[h0 + 1] - dist[h0]);
      train.forEach((car, c) => {
        const f = find(dist, ((head - c * 2.8) % length + length) % length), i = Math.min(N - 1, Math.floor(f)), u = f - i;
        at.lerpVectors(P[i], P[i + 1], u);
        m.makeBasis(S[i], U[i], T[i]).setPosition(at);
        car.matrix.copy(m);
        car.matrixWorldNeedsUpdate = true;
      });
    });
  };
  g.userData.animate(0);
  g.userData.lap = lap;
  return g;
};
