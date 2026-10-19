// ---- the Las Vegas Strip's cargo (Vegas Strip and Vegas by Night): a Good item and an Evil one, as cargoModels.js's: each a group
// standing on y = 0, facing +z, about a metre tall when calm, with userData.animate(t), and the Evil one userData.setState(0 | 1 | 2).
// Plain three.js: nothing here touches the game. cargoModels.js spreads VEGAS_CARGO_MODELS into CARGO_MODELS; the ids are cargo.js's.
//   pokerchips  a box of poker chips for the cashier's cage: an open wooden case lined in green baize, racks of chips in five
//               colours, two dice on top; the stacks wobble and the dice roll a little as the box tilts
//   fakechips   a case of counterfeit chips (Evil): calm an aluminium case snapped shut; agitated it rattles, the lid lifts and
//               chips jump about inside, their paint coming off; furious the lid flies open, chips spray out and a dye pack
//               bursts in a cloud of red
import * as THREE from 'three';

const TRANSITION = 0.5;
const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
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
const CHIPS = [0xd8262b, 0x1f5fd0, 0x2f8a3a, 0x1b1d22, 0xf2efe6];
const chipGeo = cyl(0.075, 0.075, 0.022, 16), edgeGeo = cyl(0.0795, 0.0795, 0.008, 16); // (the edge band 4.5 mm proud of the chip)
// a chip: its colour, a white band round its edge (the edge spots seen from afar)
const chip = (parent, colour, x, y, z) => {
  const g = sub(parent, x, y, z);
  part(g, chipGeo, lambert(colour));
  part(g, edgeGeo, lambert(colour === 0xf2efe6 ? 0x2f5fd0 : 0xf6f3ee));
  return g;
};
const die = (parent, x, y, z) => {
  const g = sub(parent, x, y, z);
  part(g, box(0.12, 0.12, 0.12), lambert(0xd8262b, { transparent: true, opacity: 0.92 }));
  for (const [px, pz] of [[-0.03, -0.03], [0, 0], [0.03, 0.03]]) part(g, cyl(0.011, 0.011, 0.01, 8), lambert(0xffffff), px, 0.0595, pz); // (4.5 mm proud, sunk 5.5)
  return g;
};

// ---- a box of poker chips: a wooden case, its lid stood open behind on hinges, green baize, five racks of chips side by side
const makePokerChips = () => {
  const group = new THREE.Group(), body = sub(group);
  const wood = lambert(0x6b3a1e), baize = lambert(0x1f6b3a), brass = lambert(0xd9a83a);
  part(body, box(0.9, 0.16, 0.6), wood, 0, 0.08, 0);                       // the case
  part(body, box(0.84, 0.02, 0.54), baize, 0, 0.165, 0);
  const lid = sub(body, 0, 0.16, -0.3);
  part(lid, box(0.9, 0.5, 0.05), wood, 0, 0.25, -0.02);
  part(lid, box(0.82, 0.42, 0.01), baize, 0, 0.25, 0.01);
  for (const x of [-0.3, 0.3]) part(body, box(0.08, 0.03, 0.03), brass, x, 0.16, -0.3); // (its hinges)
  lid.rotation.x = -0.35;
  const stacks = [];
  CHIPS.forEach((c, k) => {
    const stack = sub(body, -0.32 + k * 0.16, 0.18, 0.04);
    const n = 9 + (k % 3) * 3;
    for (let i = 0; i < n; i++) chip(stack, c, 0, 0.011 + i * 0.023, 0);
    stacks.push(stack);
  });
  const dice = [die(body, 0.3, 0.24, 0.24), die(body, 0.14, 0.24, 0.25)];
  return idle(group, (t) => {
    body.rotation.z = Math.sin(t * 1.3) * 0.05;
    body.rotation.x = Math.sin(t * 1.0 + 1) * 0.04;
    stacks.forEach((s, k) => { s.rotation.z = Math.sin(t * 3.1 + k) * 0.04; s.rotation.x = Math.sin(t * 2.6 + k * 2) * 0.03; });
    dice.forEach((d, k) => { d.rotation.y = Math.sin(t * 0.9 + k) * 0.4; d.position.x = (k ? 0.14 : 0.3) + Math.sin(t * 1.3 + k) * 0.02; });
  });
};

// ---- a case of counterfeit chips (Evil): a ribbed aluminium case; a dye pack clipped inside the lid
const makeFakeChips = () => {
  const group = new THREE.Group(), all = sub(group);
  const alu = lambert(0xc4c8cc), dark = lambert(0x3a3d42);
  part(all, box(0.86, 0.22, 0.56), alu, 0, 0.11, 0);                        // the case's tray
  for (const x of [-0.3, -0.1, 0.1, 0.3]) part(all, box(0.02, 0.2, 0.57), lambert(0xa8acb0), x, 0.11, 0); // (its ribs)
  part(all, box(0.88, 0.03, 0.58), dark, 0, 0.225, 0);                      // the seal
  const lid = sub(all, 0, 0.24, -0.28);
  part(lid, box(0.86, 0.12, 0.56), alu, 0, 0.06, 0.28);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) part(lid, box(0.02, 0.1, 0.57), lambert(0xa8acb0), x, 0.06, 0.28);
  part(lid, box(0.22, 0.04, 0.06), dark, 0, 0.13, 0.28);                    // the handle
  const pack = part(lid, box(0.16, 0.05, 0.1), lambert(0x8a1a1a), 0.18, -0.01, 0.3); // the dye pack in the lid
  for (const x of [-0.3, 0.3]) part(all, box(0.06, 0.05, 0.03), dark, x, 0.2, 0.29); // the latches
  // the chips inside (seen when the lid lifts), and those that fly out
  const inside = [], flying = [];
  for (let i = 0; i < 18; i++) inside.push(chip(all, CHIPS[i % 5], -0.33 + (i % 6) * 0.13, 0.2, -0.16 + Math.floor(i / 6) * 0.15));
  for (let i = 0; i < 12; i++) { const c = chip(all, CHIPS[(i * 3) % 5], 0, 0.3, 0); c.visible = false; flying.push(c); }
  // the dye: a cloud of red puffs that swells out of the case when it bursts
  const cloud = sub(all, 0, 0.4, 0);
  const puffs = [];
  for (let i = 0; i < 9; i++) puffs.push(part(cloud, new THREE.SphereGeometry(0.16, 10, 7), lambert(0xe0202a, { transparent: true, opacity: 0.55, depthWrite: false }), Math.cos(i * 2.4) * 0.22, (i % 3) * 0.12, Math.sin(i * 2.4) * 0.18));
  return stated(group, (t, up, rage) => {
    all.position.x = (up * 0.015 + rage * 0.03) * jitter(t, 1);
    all.rotation.z = up * jitter(t, 3) * 0.05 + rage * Math.sin(t * 9) * 0.06;
    all.position.y = up * Math.abs(jitter(t, 4)) * 0.03 + rage * Math.abs(Math.sin(t * 8)) * 0.05;
    lid.rotation.x = -(up * (0.15 + 0.12 * Math.abs(Math.sin(t * 14))) + rage * 1.9);
    inside.forEach((c, i) => { c.position.y = 0.2 + (up + rage) * Math.abs(Math.sin(t * 11 + i * 1.7)) * 0.06; c.rotation.x = (up + rage) * Math.sin(t * 7 + i) * 0.6; });
    flying.forEach((c, i) => {
      c.visible = rage > 0.3;
      const u = (t * 1.1 + i / flying.length) % 1, a = i * 2.39;
      c.position.set(Math.cos(a) * u * 0.7, 0.3 + Math.sin(u * Math.PI) * 0.75, Math.sin(a) * u * 0.6);
      c.rotation.set(t * 8 + i, t * 5, 0);
    });
    pack.material.color.setHex(rage > 0.5 && Math.sin(t * 20) > 0 ? 0xff3030 : 0x8a1a1a);
    cloud.visible = rage > 0.05;
    puffs.forEach((pf, i) => { const k = rage * (0.8 + 0.4 * Math.sin(t * 2 + i)); pf.scale.setScalar(Math.max(0.01, k * (1 + (t * 0.6 + i * 0.13) % 1))); pf.position.y = (i % 3) * 0.12 + rage * ((t * 0.4 + i * 0.11) % 1) * 0.5; });
  });
};

export const VEGAS_CARGO_MODELS = { pokerchips: makePokerChips, fakechips: makeFakeChips };
