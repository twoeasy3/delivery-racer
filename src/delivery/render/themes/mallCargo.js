// ---- the mall level's cargo (Mall Dash): a Good item and an Evil one, as cargoModels.js's: each a group standing on y = 0,
// facing +z, about a metre tall when calm, with userData.animate(t), and the Evil one userData.setState(0 | 1 | 2). Plain
// three.js: nothing here touches the game. cargoModels.js spreads MALL_CARGO_MODELS into CARGO_MODELS; the ids are cargo.js's.
//   bubbletea    a tray of bubble teas: four tall cups in a cardboard carrier, each a different tea, a fat straw in each, the
//                pearls at the bottom bobbing, the tea sloshing as the tray tilts
//   hamsterball  a pet-shop hamster in its exercise ball (Evil): calm it sits nibbling a seed, the ball still; agitated it runs
//                and the ball spins on the spot, rocking; furious the ball bounces, the hatch flies off and it hangs half out
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
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

// ---- a tray of bubble teas: a cardboard carrier with four cells and a handle, four tall clear cups (milk tea, strawberry,
// matcha, taro), each tapered, with a lip at its rim, a card sleeve, a smooth clear dome lid and a fat straw out of it, the tea
// inside the cup (never through it) with black pearls on the bottom, its top sloshing as the carrier rocks. The parts are named
// for render/cargoRules.js
const CUP = { h: 0.5, r0: 0.11, r1: 0.15 }; // the cup: height, bottom and top radius (outside)
const cupR = (y) => CUP.r0 + (CUP.r1 - CUP.r0) * y / CUP.h;
const makeBubbleTea = () => {
  const group = new THREE.Group(), body = sub(group);
  const card = lambert(0xc8a070), dark = lambert(0x9a7448);
  const carrier = sub(body); carrier.name = 'carrier';
  part(carrier, box(0.84, 0.03, 0.84), card, 0, 0.015, 0).name = 'floor';                    // the carrier: its floor,
  for (const x of [-1, 1]) part(carrier, box(0.04, 0.13, 0.84), dark, x * 0.4, 0.085, 0);     // its walls (set into the floor),
  for (const z of [-1, 1]) part(carrier, box(0.76, 0.13, 0.04), dark, 0, 0.085, z * 0.4);
  part(carrier, box(0.03, 0.11, 0.76), card, 0, 0.075, 0);                                    // the cells' dividers
  for (const z of [-1, 1]) part(carrier, box(0.37, 0.11, 0.03), card, z * 0.2, 0.075, 0);
  part(carrier, box(0.05, 0.6, 0.05), dark, 0, 0.42, 0);                                      // and its handle
  part(carrier, box(0.26, 0.06, 0.07), dark, 0, 0.74, 0);
  const TEAS = [0xc89a5e, 0xf08aa8, 0x8dc26a, 0xb48ad8], SLEEVES = [0x7a4a2a, 0xd8262b, 0x2e7d32, 0x5b3a9a], cups = [];
  const glass = lambert(0xe8f4ff, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const lidM = lambert(0xf8fbff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const white = lambert(0xf4f6f8), pearlM = lambert(0x1a1214);
  const FILL = 0.38, WALL = 0.006; // (the tea's top, and how far it keeps inside the cup's outside)
  [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z], k) => {
    const cup = sub(body, x, 0.03, z); cup.name = 'cup' + k;                                  // (standing on the carrier's floor)
    part(cup, cyl(CUP.r1, CUP.r0, CUP.h, 24, 1, true), glass, 0, CUP.h / 2, 0).name = 'glass' + k; // the clear cup, open at the top,
    part(cup, new THREE.CircleGeometry(CUP.r0, 24), glass, 0, 0.002, 0, -Math.PI / 2, 0, 0);     // its bottom,
    part(cup, new THREE.TorusGeometry(CUP.r1, 0.008, 6, 28), white, 0, CUP.h, 0, Math.PI / 2, 0, 0); // the lip at its rim
    part(cup, cyl(cupR(0.31) + 0.006, cupR(0.17) + 0.006, 0.14, 24, 1, true), lambert(SLEEVES[k], { side: THREE.DoubleSide }), 0, 0.24, 0); // a card sleeve round it
    const cap = Math.asin(CUP.r1 / 0.21);                                                      // the dome lid: a cap of a 0.21 m ball, resting on the lip
    part(cup, new THREE.SphereGeometry(0.21, 24, 6, 0, Math.PI * 2, 0, cap), lidM, 0, CUP.h + 0.008 - 0.21 * Math.cos(cap), 0);
    const teaM = lambert(TEAS[k], { transparent: true, opacity: 0.88 });
    const tea = part(cup, cyl(cupR(FILL - 0.006) - WALL - 0.004, CUP.r0 - WALL - 0.004, FILL - 0.016, 24), teaM, 0, 0.01 + (FILL - 0.016) / 2, 0); // the tea, inside the cup
    tea.name = 'tea' + k;
    const top = part(cup, cyl(cupR(FILL) - WALL - 0.012, cupR(FILL) - WALL - 0.012, 0.024, 24), teaM, 0, FILL - 0.006, 0); // its top, which sloshes
    top.name = 'tea' + k;
    const straw = sub(cup, 0.03, 0.04, 0); straw.name = 'straw' + k;                          // a fat straw, from the bottom out through the lid
    part(straw, cyl(0.024, 0.024, 0.72, 10), lambert(k % 2 ? 0xd8262b : 0x2f86d8), 0, 0.36, 0);
    straw.rotation.z = 0.1 * (k % 2 ? 1 : -1) + 0.05;
    const pearls = [];
    for (let i = 0; i < 7; i++) {                                                              // the pearls, on the bottom
      const a = i * 0.9, rr = i === 6 ? 0 : 0.055;
      const p = part(cup, sphere(0.022, 8, 6), pearlM, Math.cos(a) * rr - (i === 6 ? 0.03 : 0), 0.032, Math.sin(a) * rr);
      p.name = 'pearl' + k;
      pearls.push(p);
    }
    cups.push({ top, straw, pearls, k });
  });
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.4) * 0.05;
    body.rotation.x = Math.sin(t * 1.1 + 1) * 0.04;
    for (const { top, straw, pearls, k } of cups) {
      top.rotation.z = -body.rotation.z * 1.2 + Math.sin(t * 2.8 + k) * 0.03; // (the tea's top keeps level, and sways)
      top.rotation.x = -body.rotation.x * 1.2;
      straw.rotation.x = Math.sin(t * 1.9 + k) * 0.03;
      pearls.forEach((p, i) => { p.position.y = 0.032 + Math.abs(Math.sin(t * 2.2 + i * 1.3 + k)) * 0.04 * (i % 2); });
    }
  });
};

// ---- a pet-shop hamster ball (Evil): a clear ball on a cardboard ring, a golden hamster inside with a seed in its paws, a
// round yellow hatch over the hole in its top. Calm: still, nibbling on the ball's floor. Agitated: it runs on the floor, the
// ball spins on the spot and rocks. Furious: the ball bounces and spins fast, the hatch pops off and tumbles above it, the
// hamster stands up under the hole with its head out of it. The parts are named for render/cargoRules.js
const R = 0.42, HOLE = 0.145; // the ball's radius, and its hole's (the hatch covers it)
const makeHamsterBall = () => {
  const group = new THREE.Group(), all = sub(group);
  part(all, cyl(0.36, 0.4, 0.08, 16), lambert(0xc8a070), 0, 0.04, 0);                       // the cardboard ring it sits on
  const ball = sub(all, 0, 0.5, 0);    // (it rocks)
  ball.name = 'ball';
  const spinner = sub(ball);           // (and spins about its upright axis inside the rocking, so the hole keeps its place)
  const top = Math.asin(HOLE / R);     // (the shell is open over the top: a real hole for the hatch and the head)
  const shell = part(spinner, new THREE.SphereGeometry(R, 22, 14, 0, Math.PI * 2, top, Math.PI - top), lambert(0xd8f0ff, { transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  shell.name = 'shell';
  // the ball's lines, so the spin shows: the equator and two great circles tilted 50 degrees, clear of the hole
  const rings = sub(spinner); rings.name = 'rings';
  const ringM = lambert(0x7fb8d8);
  part(rings, new THREE.TorusGeometry(R + 0.006, 0.006, 5, 32), ringM, 0, 0, 0, Math.PI / 2, 0, 0); // (painted on the outside)
  for (const s of [-1, 1]) part(rings, new THREE.TorusGeometry(R + 0.006, 0.006, 5, 32), ringM, 0, 0, 0, Math.PI / 2 + s * 0.87, 0, 0).rotation.order = 'XYZ';
  const rim = part(ball, new THREE.TorusGeometry(HOLE, 0.012, 6, 20), lambert(0xd8a810), 0, Math.sqrt(R * R - HOLE * HOLE), 0, Math.PI / 2, 0, 0); // (the hole's yellow collar)
  rim.name = 'rim';
  const hatch = part(ball, cyl(HOLE + 0.012, HOLE + 0.012, 0.03, 18), lambert(0xf2c21d), 0, Math.sqrt(R * R - HOLE * HOLE) + 0.03, 0); // (sits on the collar)
  hatch.name = 'hatch';
  const vents = [0, 1, 2, 3].map(k => { // (air holes round the hatch, each a dark stud set in the shell, along its normal)
    const n = new THREE.Vector3(Math.cos(k * 1.57 + 0.78) * 0.5, 0.86, Math.sin(k * 1.57 + 0.78) * 0.5).normalize();
    const v = part(spinner, cyl(0.022, 0.022, 0.012, 8), lambert(0x1a1b1e), n.x * R, n.y * R, n.z * R);
    v.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    return v;
  });
  // the hamster: a golden egg of a body, a paler belly, two round ears, black bead eyes, a pink nose, little paws, a stub tail
  const perch = sub(all, 0, 0.5, 0); // (at the ball's middle, NOT in the ball: the ball spins round it; it rocks with the ball only when furious)
  const ham = sub(perch, 0, -0.2, 0);
  ham.name = 'hamster';
  const fur = lambert(0xe0a048), pale = lambert(0xf4e2c0), bead = lambert(0x111111);
  const bodyM = part(ham, sphere(0.2, 14, 10), fur, 0, 0.14, 0);
  bodyM.scale.set(0.95, 0.85, 1.15);
  part(ham, sphere(0.15, 12, 8), pale, 0, 0.09, 0.06).scale.set(0.9, 0.7, 1);
  const head = sub(ham, 0, 0.26, 0.17);
  part(head, sphere(0.13, 12, 9), fur);
  const ears = [-1, 1].map(x => [part(head, sphere(0.045, 8, 6), fur, x * 0.09, 0.1, -0.02), part(head, sphere(0.03, 8, 6), lambert(0xf0b0b0), x * 0.09, 0.1, -0.01), x]);
  for (const x of [-1, 1]) part(head, sphere(0.022, 6, 5), bead, x * 0.055, 0.03, 0.11);
  part(head, sphere(0.025, 6, 5), lambert(0xf08aa8), 0, -0.02, 0.13);
  const seed = part(head, sphere(0.03, 6, 5), lambert(0x6b4a2a), 0, -0.07, 0.12);
  seed.scale.set(0.7, 1, 1.4);
  const paws = [-1, 1].map(x => part(ham, sphere(0.035, 6, 5), pale, x * 0.07, 0.12, 0.2));
  const feet = [-1, 1].map(x => { const f = part(ham, sphere(0.045, 6, 5), pale, x * 0.09, 0.0, 0.05); f.name = 'foot'; return f; });
  part(ham, sphere(0.03, 6, 5), pale, 0, 0.1, -0.21);                                       // the tail
  let spun = 0;
  const FLOOR = 0.5 - R + 0.066; // (the hamster's origin when it stands on the ball's floor: its feet on the shell)
  return stated(group, (t, up, rage, dt) => {
    // the ball: still, then spinning on the spot and rocking, then bouncing and spinning fast
    spun += (up * 2.2 + rage * 9) * dt;
    spinner.rotation.y = spun;
    ball.rotation.z = up * Math.sin(t * 7) * 0.12 + rage * Math.sin(t * 11) * 0.25;
    ball.position.y = 0.5 + rage * Math.abs(Math.sin(t * 6)) * 0.35;
    all.position.x = rage * jitter(t, 2) * 0.04;
    shell.material.opacity = 0.28 + rage * 0.1;
    // the hamster stands on the ball's floor; furious: it stands up under the hole (pitched up, a little smaller) with its head
    // out of it (the hole is where the top of the ball is, rocked with it)
    perch.position.y = ball.position.y;
    perch.rotation.z = ball.rotation.z * Math.min(1, rage * 2.5); // (furious: under the hole, wherever the rocking puts it)
    const run = up + rage;
    const rear = Math.min(1, rage * 1.6), climb = rage * rage * rage; // (it rears up and shrinks first, then climbs into the hole)
    const pitch = -0.66 * rear, sc = 1 - 0.28 * rear, cp = Math.cos(pitch), sp = Math.sin(pitch), neck = 0.26 + 0.1 * rear; // (it stretches its neck up through the collar)
    head.position.y = neck;
    ham.scale.setScalar(sc);
    ham.rotation.set(pitch, Math.sin(t * 2) * 0.3 * (1 - run) + climb * Math.sin(t * 9) * 0.2, 0, 'YXZ'); // (looking about once it is up)
    ham.position.set(0, (FLOOR - 0.5) * (1 - climb) + climb * (R + 0.03 - sc * (neck * cp - 0.17 * sp)), -sc * (neck * sp + 0.17 * cp) * rear); // (its head over the hole as soon as it rears) // (its head's middle in the hole)
    head.rotation.x = -0.2 + Math.sin(t * 9) * 0.06 * (1 - run) + run * Math.sin(t * 14) * 0.15; // nibbling, then looking about
    head.rotation.y = Math.sin(t * 1.3) * 0.25 * (1 - run);
    seed.visible = rage < 0.5;
    for (const [ear, inner, x] of ears) { ear.position.x = inner.position.x = x * (0.09 - 0.035 * rage); ear.position.z = -0.02; inner.position.z = ear.position.z + 0.01; } // (furious: its ears flat back, to squeeze through)
    paws.forEach((p, i) => { p.position.y = 0.12 + up * Math.abs(Math.sin(t * 16 + i * Math.PI)) * 0.06; p.position.z = 0.2 + up * Math.sin(t * 16 + i * Math.PI) * 0.05 - rage * 0.03; }); // (running; furious: held to its chest)
    feet.forEach((f, i) => { const z = 0.05 + up * Math.sin(t * 16 + i * Math.PI) * 0.07; f.position.z = z; f.position.y = (1 - rage) * (Math.sqrt(R * R - 0.0081 - 0.0025) - Math.sqrt(R * R - 0.0081 - z * z)); }); // (a stride, the foot on the ball's curved floor)
    // the hatch: on, rattling, then off and tumbling above the ball, off to the side of the head
    hatch.position.set(rage * 0.32, Math.sqrt(R * R - HOLE * HOLE) + 0.03 + up * Math.abs(Math.sin(t * 13)) * 0.02 + rage * (0.5 + Math.abs(Math.sin(t * 5)) * 0.2), rage * -0.12);
    hatch.rotation.set(rage * t * 6, 0, rage * (0.6 + Math.sin(t * 3) * 0.2));
    for (const [k, v] of vents.entries()) v.scale.setScalar(1 + rage * (1 + Math.sin(t * 8 + k)) * 0.15);
  });
};

export const MALL_CARGO_MODELS = { bubbletea: makeBubbleTea, hamsterball: makeHamsterBall };
