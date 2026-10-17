// ---- the metro level's cargo (Metro Run): a Good item and an Evil one, as cargoModels.js's: each a group standing on y = 0,
// facing +z, about a metre tall when calm, with userData.animate(t), and the Evil one userData.setState(0 | 1 | 2). Plain
// three.js: nothing here touches the game. cargoModels.js spreads METRO_CARGO_MODELS into CARGO_MODELS; the ids are cargo.js's.
//   ticketrolls  a box of fresh paper rolls for the ticket machines: an open carton, six rolls standing in it, one on top with
//                a strip of tickets unspooled from it and fluttering, a red tear-off tab
//   rats         a cage of tunnel rats (Evil): three grey rats in a wire cage on a tray. Calm they sniff about; agitated they
//                gnaw the bars and the cage rattles; furious the door has sprung, the cage jumps and one is half out of it
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
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

// ---- a box of ticket rolls: an open carton, six white rolls on end in it (a pale core in each), one more lying on top with a
// strip of orange-edged tickets running off it and fluttering, the carton's flaps open
const makeTicketRolls = () => {
  const group = new THREE.Group(), body = sub(group);
  const card = lambert(0xc8a070), dark = lambert(0x9a7448), paper = lambert(0xf4ecd6), core = lambert(0x8a6a48);
  part(body, box(0.8, 0.04, 0.56), card, 0, 0.02, 0);                                        // the carton: floor...
  for (const x of [-1, 1]) part(body, box(0.04, 0.36, 0.56), dark, x * 0.4, 0.18, 0);        // ...sides...
  for (const z of [-1, 1]) part(body, box(0.8, 0.36, 0.04), card, 0, 0.18, z * 0.28);
  for (const x of [-1, 1]) part(body, box(0.02, 0.2, 0.56), card, x * 0.48, 0.42, 0, 0, 0, x * -0.7); // ...and its flaps, open
  part(body, box(0.5, 0.08, 0.005), lambert(0x1f6fd0), 0, 0.26, 0.283);                     // a blue label on its side
  [[-0.24, -0.12], [0, -0.12], [0.24, -0.12], [-0.24, 0.12], [0, 0.12], [0.24, 0.12]].forEach(([x, z]) => {
    part(body, cyl(0.11, 0.11, 0.3, 16), paper, x, 0.19, z);
    part(body, cyl(0.112, 0.112, 0.05, 16), lambert(0xe8751a), x, 0.27, z);                // (the orange edge printed on a ticket roll)
    part(body, cyl(0.035, 0.035, 0.302, 10), core, x, 0.19, z);
  });
  const top = sub(body, 0, 0.47, 0);                                                        // the roll on top, on its side
  part(top, cyl(0.12, 0.12, 0.3, 16), paper, 0, 0, 0, 0, 0, Math.PI / 2);
  for (const x of [-0.12, 0.12]) part(top, cyl(0.122, 0.122, 0.04, 16), lambert(0xe8751a), x, 0, 0, 0, 0, Math.PI / 2);
  part(top, cyl(0.04, 0.04, 0.302, 10), core, 0, 0, 0, 0, 0, Math.PI / 2);
  const strip = [], N = 7;                                                                  // the tickets running off it
  for (let i = 0; i < N; i++) {
    const t = sub(i ? strip[i - 1] : top, 0, i ? -0.13 : -0.02, i ? 0 : 0.12);
    part(t, box(0.24, 0.13, 0.006), paper, 0, -0.065, 0);
    part(t, box(0.24, 0.02, 0.008), lambert(0xe8751a), 0, -0.12, 0);
    strip.push(t);
  }
  const tab = part(strip[N - 1], box(0.1, 0.05, 0.01), lambert(0xd8262b), 0, -0.15, 0);
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.3) * 0.03;
    top.rotation.x = Math.sin(t * 0.9) * 0.08;
    strip.forEach((s, i) => { s.rotation.x = (i === 0 ? 1.2 : 0.18) + Math.sin(t * 4 + i * 0.8) * (0.12 + i * 0.03); s.rotation.z = Math.sin(t * 2.6 + i) * 0.05; });
    tab.rotation.y = Math.sin(t * 6) * 0.4;
  });
};

// ---- a cage of tunnel rats (Evil): a wire cage (a tray, bars round it, a top), its door at the front, three grey rats with
// pink tails. Calm: they sniff about, noses twitching. Agitated: two gnaw the bars, the cage rattles. Furious: the door has
// sprung open and swings, the cage hops, one rat is half out of the door and the others run round
const makeRats = () => {
  const group = new THREE.Group(), all = sub(group);
  const wire = lambert(0x9aa0a8), tray = lambert(0x4a4f57), fur = lambert(0x8c8c90), pale = lambert(0xc8c4c0), pink = lambert(0xe8a0a8), bead = lambert(0x111111);
  part(all, box(0.86, 0.08, 0.56), tray, 0, 0.04, 0);
  const W = 0.8, D = 0.5, H = 0.55;
  for (let x = -W / 2; x <= W / 2 + 0.001; x += W / 10) for (const z of [-D / 2, D / 2]) if (!(z > 0 && Math.abs(x) < 0.14)) part(all, cyl(0.008, 0.008, H, 4), wire, x, 0.08 + H / 2, z);
  for (let z = -D / 2; z <= D / 2 + 0.001; z += D / 6) for (const x of [-W / 2, W / 2]) part(all, cyl(0.008, 0.008, H, 4), wire, x, 0.08 + H / 2, z);
  part(all, box(W + 0.02, 0.02, D + 0.02), wire, 0, 0.08 + H, 0);                          // the top
  for (const y of [0.25, 0.45]) {
    part(all, box(W, 0.012, 0.012), wire, 0, y, -D / 2);
    for (const s of [-1, 1]) part(all, box(W / 2 - 0.14, 0.012, 0.012), wire, s * (W / 2 + 0.14) / 2, y, D / 2); // (the front's rails stop at the doorway: the door carries its own)
  }
  part(all, box(0.08, 0.04, 0.5), wire, 0, 0.08 + H + 0.03, 0);                             // its handle
  const door = sub(all, -0.14, 0.08, D / 2);                                                 // the door, hinged on its left
  for (let x = 0.02; x < 0.28; x += 0.045) part(door, cyl(0.008, 0.008, H * 0.8, 4), wire, x, H * 0.4, 0);
  part(door, box(0.28, 0.012, 0.012), wire, 0.14, H * 0.8, 0);
  for (const y of [0.25, 0.45]) part(door, box(0.28, 0.012, 0.012), wire, 0.14, y - 0.08, 0); // (its rails, level with the cage's)
  const rat = (x, z, turn) => {
    const r = sub(all, x, 0.08, z);
    r.rotation.y = turn;
    const b = part(r, sphere(0.09, 12, 8), fur, 0, 0.08, 0); b.scale.set(0.9, 0.8, 1.5);
    const head = sub(r, 0, 0.1, 0.13);
    part(head, new THREE.ConeGeometry(0.06, 0.14, 10), fur, 0, 0, 0.05, Math.PI / 2, 0, 0);
    part(head, sphere(0.015, 6, 5), pink, 0, 0, 0.12);
    for (const s of [-1, 1]) { part(head, sphere(0.03, 8, 6), pink, s * 0.045, 0.045, -0.01).scale.set(1, 1, 0.4); part(head, sphere(0.012, 6, 5), bead, s * 0.03, 0.02, 0.04); }
    const tail = part(r, cyl(0.008, 0.015, 0.26, 6), pink, 0, 0.04, -0.24, Math.PI / 2 - 0.15, 0, 0);
    part(r, sphere(0.05, 8, 6), pale, 0, 0.04, 0.05).scale.set(1, 0.6, 1.4);
    return { r, head, tail, x, z, turn };
  };
  const rats = [rat(-0.22, -0.05, 0.4), rat(0.18, 0.06, -2.3), rat(0.02, -0.1, 1.6)];
  return stated(group, (t, up, rage) => {
    all.position.y = rage * Math.abs(Math.sin(t * 7)) * 0.08;
    all.rotation.z = up * Math.sin(t * 23) * 0.025 + rage * Math.sin(t * 13) * 0.06;
    door.rotation.y = -(Math.min(1, rage * 2) * 1.5 + rage * Math.sin(t * 5) * 0.15); // (swings OUT, to the front, and is wide open (1.35 rad at least) before the bold one reaches it; hinged on the doorway's left, so the turn is negative)
    rats.forEach(({ r, head, tail, x, z, turn }, i) => {
      head.rotation.x = Math.sin(t * (12 + i * 3)) * 0.1;
      head.rotation.y = Math.sin(t * 1.5 + i) * 0.4 * (1 - up - rage);
      tail.rotation.z = Math.sin(t * 3 + i) * 0.3 + (up + rage) * Math.sin(t * 15 + i) * 0.3;
      if (i === 0) { // (the bold one: to the door, then half out of it)
        const go = rage * rage; // (it holds back until the door is wide open, then goes out through the doorway's middle, clear of the door and the frame)
        r.position.set(x + up * 0.1 + go * 0.26, 0.08, z + up * 0.2 + go * 0.42);
        r.rotation.y = turn * (1 - up - rage) + (up + rage) * 0.1;
        r.rotation.x = -rage * 0.3;
      } else { // (the others gnaw, then run round)
        const a = t * 4 + i * 3;
        r.position.set(x * (1 - rage) + rage * Math.cos(a) * 0.2, 0.08, z * (1 - rage) + rage * Math.sin(a) * 0.12);
        r.rotation.y = turn * (1 - rage) + rage * Math.atan2(-Math.sin(a) * 0.2, Math.cos(a) * 0.12); // (nose along the way it runs: the path's velocity)
        head.position.z = 0.13 + up * Math.abs(Math.sin(t * 20 + i)) * 0.03;
      }
    });
  });
};

export const METRO_CARGO_MODELS = { ticketrolls: makeTicketRolls, rats: makeRats };
