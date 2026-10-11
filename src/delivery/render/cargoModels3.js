// ---- the malicious deliveries (eleven more Evil cargo models) and six more Good ones ----------
// As cargoModelsEvil2.js's twenty (cargoModels.js spreads these into CARGO_MODELS): each a group
// standing on y = 0, facing +z, about a metre tall when calm, with userData.animate(t), and for an Evil
// one userData.setState(0 | 1 | 2). Plain three.js: nothing here touches the game. The ids are cargo.js's.
// The Evil ones are deliveries that are bad news for whoever gets them: people and paperwork, seen only
// in part (hands out of a crate, a hat on a sack, a megaphone out of a box), never a whole person. Calm is
// a plain container with one tell; agitated is hands and props coming out; furious is the container
// overwhelmed. Paper, tickets, stickers, notes and glitter are their particles, as sparks and bees are
// for the others. Each is told apart at thumbnail size in each state: its outline changes.
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const haze = (color, opacity = 0.5) => glow(color, { transparent: true, opacity, depthWrite: false });
const sheetMat = (color = 0xfbf7ea) => lambert(color, { side: THREE.DoubleSide });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, n = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, n, arc);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const plane = (w, h) => new THREE.PlaneGeometry(w, h);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const FLAT = Math.PI / 2;
// a part of a model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const sub = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
// shown `k` of the way (0: gone, as near as a scale can be)
const show = (object, k) => object.scale.setScalar(Math.max(0.001, k));
// a material's colour, somewhere between two
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a chain of joints, each `step` up (or down) the last: a sleeve, a hose
const chain = (parent, n, step, make) => {
  const joints = [];
  let p = parent;
  for (let j = 0; j < n; j++) { const joint = sub(p, 0, j ? step : 0, 0); make(joint, j); joints.push(joint); p = joint; }
  return joints;
};
// things that go round and round a cycle (sheets of paper, puffs of glitter): fn(mesh, 0 .. 1, k)
const cycle = (list, t, rate, fn) => list.forEach((m, k) => fn(m, (((t * rate + k / list.length) % 1) + 1) % 1, k));
// a word on a label (SEIZED, AUDIT, SURPRISE), as a material: plain `ground` where there is no canvas
// to draw on (headless checks), and a word is only a tell: each label reads by its colour and shape too
const lettered = (text, colour, ground, w = 256, h = 96) => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + ground.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#' + colour.toString(16).padStart(6, '0');
    ctx.font = 'bold ' + Math.round(h * 0.62) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + h * 0.04, w * 0.9);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return onFace(new THREE.MeshBasicMaterial({ map }));
  } catch { return onFace(glow(ground)); }
};
// an Evil item: pose(t, agitated, furious, dt), the two weights 0 .. 1 easing as its state changes
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
// a Good item: it only idles
const idle = (group, pose) => {
  group.userData.animate = pose;
  pose(0);
  return group;
};

// ---- the shared pieces of the malicious ones ----------------------------------------------------
const SLEEVE = lambert(0x2b2f3a), CUFF = lambert(0xf4f1e8), SKIN = lambert(0xf0b48a), CARD = lambert(0xc8955a), CARD_FLAP = lambert(0xd9a66a), PLANK = lambert(0xb07e45);
// a cuffed arm out of a hole, along its root's +z: a dark sleeve, a white cuff, a hand; `prop` hangs
// from the hand (a briefcase, a clipboard, a stamp). Wave the root
const arm = (parent, len = 0.3) => {
  const root = sub(parent);
  part(root, cyl(0.045, 0.052, len, 8), SLEEVE, 0, 0, len / 2, FLAT);
  part(root, cyl(0.056, 0.056, 0.05, 8), CUFF, 0, 0, len + 0.02, FLAT);
  const hand = sub(root, 0, 0, len + 0.1);
  part(hand, sphere(0.06, 8, 6), SKIN).scale.set(0.8, 1, 1.25);
  const prop = sub(hand, 0, -0.03, 0.03);
  return { root, hand, prop };
};
// a briefcase hanging from a hand: a leather box with a handle; its lid (hinged at the back) can open
const briefcase = (parent, colour = 0x6b3f22) => {
  const g = sub(parent, 0, -0.14, 0);
  const leather = lambert(colour), brass = lambert(0xd4a94a);
  part(g, box(0.26, 0.17, 0.07), leather, 0, 0, 0);
  part(g, torus(0.045, 0.012, 10, Math.PI), brass, 0, 0.09, 0);
  for (const x of [-0.08, 0.08]) part(g, box(0.03, 0.02, 0.075), brass, x, 0.07, 0);
  const lid = sub(g, 0, 0.085, -0.035);
  part(lid, box(0.26, 0.015, 0.07), leather, 0, 0.0075, 0.035);
  return { case: g, lid };
};
// a slatted wooden crate, w wide, h tall, d deep, standing on y = 0: a body with planks across its sides
const crate = (parent, w, h, d, body = CARD) => {
  const g = sub(parent);
  part(g, box(w, h, d), body, 0, h / 2, 0);
  const rows = Math.max(2, Math.round(h / 0.22));
  for (let r = 0; r < rows; r++) {
    const y = h * (r + 0.5) / rows;
    part(g, box(w + 0.02, h / rows * 0.55, d + 0.02), PLANK, 0, y, 0);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) part(g, box(0.05, h, 0.05), PLANK, x * (w / 2 - 0.01), h / 2, z * (d / 2 - 0.01));
  return g;
};
// a hole in a crate's side: a dark patch, so an arm comes out of somewhere
const hole = (parent, r = 0.075) => part(parent, new THREE.CircleGeometry(r, 10), onFace(glow(0x14100c)));
// the shade inside an open container: a near-black face across its opening (never a lid colour), so it
// reads as open from any distance, whatever stands proud of it
const SHADE = glow(0x0a0806);
// an OPEN-TOPPED box, w wide, h tall, d deep, standing on y = 0: four walls, no top face, the black shade of
// its inside just below the rim, and its four flaps folded down the outside. Nothing in it may pass through
// a wall: the inside is w - 2 * thick by d - 2 * thick
const openBox = (parent, w, h, d, mat = CARD, thick = 0.02, flaps = true) => {
  const g = sub(parent);
  for (const s of [-1, 1]) {
    part(g, box(w, h, thick), mat, 0, h / 2, s * (d - thick) / 2);
    part(g, box(thick, h, d - thick * 2), mat, s * (w - thick) / 2, h / 2, 0);
  }
  part(g, plane(w - thick * 2, d - thick * 2), SHADE, 0, h - 0.012, 0, -FLAT);
  const flapMat = mat === CARD ? CARD_FLAP : mat; // (a shade lighter, so a flap reads against the wall it hangs on)
  if (flaps) for (const s of [-1, 1]) {
    part(g, box(w, d / 2 - 0.01, 0.012), flapMat, 0, h - d / 4 + 0.005, s * (d / 2 + 0.008));
    part(g, box(0.012, w / 2 - 0.01, d), flapMat, s * (w / 2 + 0.008), h - w / 4 + 0.005, 0);
  }
  return g;
};
// a flat triangle (an envelope's flap, a pennant): its three corners in its own plane, facing +z
const triangle = (ax, ay, bx, by, cx, cy) => new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(ax, ay), new THREE.Vector2(bx, by), new THREE.Vector2(cx, cy)]));
// a flat thing laid on a face, lifted off it so the two never fight for the pixel
const onFace = (material) => { material.polygonOffset = true; material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1; return material; };
// a musical note (a quaver): a head, a stem and a flag
const quaver = (parent, material, s = 1) => {
  const n = sub(parent);
  part(n, sphere(0.028 * s, 7, 5), material).scale.set(1.2, 0.8, 1);
  part(n, box(0.012 * s, 0.11 * s, 0.012 * s), material, 0.03 * s, 0.05 * s, 0);
  part(n, box(0.05 * s, 0.012 * s, 0.012 * s), material, 0.05 * s, 0.1 * s, 0, 0, 0, -0.5);
  return n;
};
// n sheets of paper, to fly: flat, white, tumbling
const sheets = (parent, n, material = sheetMat()) => Array.from({ length: n }, () => part(parent, plane(0.13, 0.17), material));
// paper flying up and out of a point: sheet k at u of its way, out to `reach`, up to `rise`, tumbling
const flutter = (sheet, u, k, t, reach, rise, weight) => {
  const a = k * 2.4 + Math.floor(t * 0.7 + k / 7) * 1.1;
  sheet.position.set(Math.sin(a) * reach * (0.2 + u), rise * (0.2 + u * 1.4 - u * u * 0.6) + Math.sin(t * 5 + k) * 0.03, Math.cos(a) * reach * (0.2 + u));
  sheet.rotation.set(t * 3 + k, t * 2.2 + k * 2, Math.sin(t * 4 + k) * 0.8);
  show(sheet, weight * (1 - u * 0.5));
};

// ---- C41 a crate of lawyers: a nailed-shut crate, one arm out of each of its four sides (never more),
// a briefcase in each hand: waving / flailing, the briefcases banging on the planks, a few sheets getting
// out / flailing wildly, the briefcases flung open, a blizzard of paper. The lid stays nailed on throughout
const makeLawyers = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.62, H = 0.62;
  for (const x of [-0.22, 0.22]) part(all, box(0.1, 0.06, W + 0.04), PLANK, x, 0.03, 0);
  const body = crate(all, W, H, W);
  body.position.y = 0.06;
  const lid = sub(all, 0, H + 0.06, 0);
  part(lid, box(W + 0.06, 0.05, W + 0.06), PLANK, 0, 0.025, 0);
  for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [0.26, 0.26], [-0.26, 0.26], [0, 0]]) part(lid, cyl(0.014, 0.014, 0.01, 6), lambert(0x6a6a72), x, 0.054, z); // (the nails)
  const arms = [0, 1, 2, 3].map(k => {
    const side = sub(all, 0, 0.06 + H * 0.55, 0);
    side.rotation.y = k * FLAT;
    hole(side, 0.08).position.set(0, 0, W / 2 + 0.012);
    const a = arm(side, 0.3);
    a.root.position.set(0, 0, W / 2 - 0.02);
    const bc = briefcase(a.prop, k % 2 ? 0x3a2a3c : 0x6b3f22);
    return { ...a, ...bc, k };
  });
  const paper = sheets(all, 18);
  return stated(group, (t, flail, rage) => {
    const calm = clamp01(1 - flail - rage), up = clamp01(flail + rage);
    arms.forEach((a, k) => {
      const w = 1 + flail * 3 + rage * 5, s = k * 1.7;
      a.root.rotation.set(
        -0.3 + Math.sin(t * 1.3 * w + s) * (0.25 + flail * 0.5 + rage * 0.8),
        Math.sin(t * 1.7 * w + s * 2) * (0.3 + flail * 0.55 + rage * 0.8),
        0);
      a.hand.rotation.z = Math.sin(t * 2 * w + s) * (0.3 + up * 0.6);
      a.case.rotation.x = Math.sin(t * 2.3 * w + s) * (0.15 + flail * 0.6 + rage * 0.9);
      a.lid.rotation.x = -rage * (0.9 + Math.abs(Math.sin(t * 9 + s)) * 0.8);
    });
    lid.position.y = H + 0.06 + rage * Math.max(0, Math.sin(t * 9)) * 0.012; // (the nails hold: it only rattles)
    cycle(paper, t, mix(0.35, 0.9, rage), (s, u, k) => flutter(s, u, k, t, 0.55 + rage * 0.3, 0.55 + rage * 0.6, up * (k < 6 ? 1 : rage)));
    all.position.set(flail * jitter(t, 1) * 0.015 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 10)) * 0.05, 0);
    all.rotation.z = flail * Math.sin(t * 12) * 0.02 + rage * Math.sin(t * 13) * 0.06 + calm * 0;
  });
};

// ---- C48 a chain letter: one envelope with a wax seal, standing on its stand / it has become five,
// fanned out and shuffling / dozens orbiting in a swarm, every one sprouting another
const makeChainletter = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const paper = lambert(0xf6efd8), flapMat = onFace(lambert(0xe8dfc2)), wax = glow(0xb8101e), fold = onFace(glow(0xc9bf9e)), ink = onFace(glow(0x5a5a6a)), stampMat = onFace(glow(0x3a7ad0));
  part(all, box(0.5, 0.05, 0.3), lambert(0x4a3525), 0, 0.025, 0);
  // an envelope, its back to +z: the flap is the triangle hanging from the top edge, its point down at the
  // middle under the wax seal, and the two folds run up from the bottom corners to meet beneath it; its
  // front (-z) carries the address lines and a stamp
  const envelope = (parent, w = 0.42, h = 0.28) => {
    const e = sub(parent);
    part(e, box(w, h, 0.02), paper);
    const slope = Math.atan2(h * 0.55, w / 2), run = Math.hypot(w / 2, h * 0.55);
    for (const d of [-1, 1]) part(e, box(run, 0.008, 0.002), fold, d * w / 4, -h * 0.225, 0.0105, 0, 0, -d * slope);
    part(e, triangle(-w / 2, h / 2, w / 2, h / 2, 0, -h * 0.1), flapMat, 0, 0, 0.0115);
    part(e, cyl(0.035, 0.035, 0.012, 10), wax, 0, -h * 0.08, 0.014, FLAT);
    for (let k = 0; k < 3; k++) part(e, box(w * (k ? 0.36 : 0.28), 0.012, 0.002), ink, -w * 0.05, h * 0.05 - k * 0.055, -0.011, 0, Math.PI);
    part(e, box(w * 0.16, h * 0.28, 0.002), stampMat, w * 0.32, h * 0.26, -0.011, 0, Math.PI);
    return e;
  };
  const one = envelope(all);
  one.position.set(0, 0.2, 0);
  one.rotation.x = -0.25;
  const fan = [1, 2, 3, 4].map(() => { const e = envelope(all); e.rotation.x = -0.25; return e; });
  const swarm = Array.from({ length: 14 }, (_, k) => { const e = envelope(all, 0.3, 0.2); e.userData.k = k; return e; });
  return stated(group, (t, shuffle, swarmed) => {
    const up = clamp01(shuffle + swarmed);
    one.rotation.set(-0.25 + Math.sin(t * 1.2) * 0.04 * (1 - up), Math.sin(t * 0.9) * 0.05, 0);
    one.position.y = 0.2 + swarmed * 0.3;
    fan.forEach((e, k) => {
      const d = k < 2 ? -(k + 1) : k - 1, lift = Math.sin(t * 6 + k * 1.7);
      show(e, shuffle + swarmed * 0.9);
      e.position.set(d * (0.17 + shuffle * 0.02 * lift + swarmed * 0.15), 0.2 + Math.abs(lift) * 0.03 * shuffle + swarmed * (0.3 + Math.sin(t * 2 + k) * 0.2), (k % 2 ? 0.03 : -0.03) + swarmed * d * 0.1);
      e.rotation.set(-0.25, d * 0.3 + swarmed * Math.sin(t * 2.5 + k) * 0.6, d * 0.08);
    });
    swarm.forEach((e) => {
      const k = e.userData.k, a = t * (0.8 + (k % 3) * 0.2) * (k % 2 ? 1 : -1) + k * 0.45, r = 0.3 + (k % 4) * 0.08;
      e.position.set(Math.sin(a) * r, 0.25 + ((k * 0.618) % 1) * 0.75 + Math.sin(t * 3 + k) * 0.05, Math.cos(a) * r);
      e.rotation.set(Math.sin(t * 2 + k) * 0.4, a + FLAT, Math.sin(t * 1.5 + k) * 0.3);
      const born = ((t * 0.5 + k / 14) % 1); // (each sprouts another: it swells from nothing, again and again)
      show(e, swarmed * (0.5 + Math.min(1, born * 3) * 0.5));
    });
    all.rotation.y = swarmed * Math.sin(t * 0.7) * 0.1;
  });
};

// ---- C49 a glitter bomb: a cheerful gift tube with a bow / shaking, puffs of glitter at its seams /
// the lid blown off, glitter erupting like a fountain and piling up round the tube
const makeGlitter = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const tubeMat = lambert(0xff6fa8), stripe = lambert(0xfff1b8), ribbon = lambert(0x3fc1ff);
  const tube = sub(all);
  // (the tube is open at the top: a black shade across it just below the rim, and the glitter heaped
  // above it once the lid is off; shut, the lid sits over the rim)
  part(tube, new THREE.CylinderGeometry(0.16, 0.16, 0.6, 18, 1, true), lambert(0xff6fa8, { side: THREE.DoubleSide }), 0, 0.3, 0);
  part(tube, new THREE.CircleGeometry(0.159, 18), SHADE, 0, 0.56, 0, -FLAT);
  part(tube, new THREE.CircleGeometry(0.16, 18), tubeMat, 0, 0.0, 0, FLAT);
  for (let k = 0; k < 4; k++) part(tube, cyl(0.163, 0.163, 0.05, 18), stripe, 0, 0.1 + k * 0.14, 0);
  part(tube, box(0.05, 0.55, 0.33), ribbon, 0, 0.275, 0);
  part(tube, box(0.33, 0.55, 0.05), ribbon, 0, 0.275, 0);
  const sparkle = [0xffd23f, 0xff5fa0, 0x5fe0ff, 0xc7ff5f];
  const heap = sub(tube, 0, 0.56, 0);
  part(heap, sphere(0.15, 14, 8), glow(0xffd23f)).scale.y = 0.4;
  for (let k = 0; k < 10; k++) part(heap, new THREE.OctahedronGeometry(0.025), glow(sparkle[k % 4]), Math.sin(k * 2.4) * 0.1, 0.03 + (k % 3) * 0.015, Math.cos(k * 2.4) * 0.1);
  const lid = sub(all, 0, 0.6, 0);
  part(lid, cyl(0.175, 0.175, 0.08, 18), tubeMat, 0, 0.04, 0);
  for (const d of [-1, 1]) part(lid, torus(0.07, 0.025, 12), ribbon, d * 0.07, 0.13, 0, 0, 0, d * 0.35).scale.set(1.2, 1, 0.5);
  part(lid, sphere(0.035, 8, 6), ribbon, 0, 0.11, 0);
  const spark = (n, r) => Array.from({ length: n }, (_, k) => part(all, new THREE.OctahedronGeometry(r), glow(sparkle[k % 4])));
  const puffs = spark(14, 0.022), fountain = spark(36, 0.026);
  const pile = part(all, cyl(0.001, 0.34, 0.06, 18), glow(0xffd23f), 0, 0.03, 0);
  const piled = Array.from({ length: 16 }, (_, k) => part(all, new THREE.OctahedronGeometry(0.03), glow(sparkle[k % 4]), Math.sin(k * 2.4) * (0.2 + (k % 3) * 0.07), 0.04, Math.cos(k * 2.4) * (0.2 + (k % 3) * 0.07)));
  return stated(group, (t, shake, burst) => {
    const up = clamp01(shake + burst);
    all.rotation.z = Math.sin(t * 1.1) * 0.04 * (1 - up) + shake * jitter(t, 1) * 0.08 + burst * jitter(t, 2) * 0.05;
    all.position.x = shake * jitter(t, 3) * 0.02;
    tube.scale.set(1 + shake * Math.abs(Math.sin(t * 15)) * 0.06 + burst * 0.08, 1, 1 + shake * Math.abs(Math.sin(t * 15)) * 0.06 + burst * 0.08);
    lid.position.set(burst * 0.3, 0.6 + shake * Math.abs(Math.sin(t * 17)) * 0.03 + burst * (0.9 + Math.sin(t * 6) * 0.08), burst * 0.15);
    lid.rotation.set(burst * 0.6, burst * t * 2, burst * (2.3 + Math.sin(t * 5) * 0.3));
    cycle(puffs, t, 1.2, (p, u, k) => {
      const a = k * 1.9 + Math.floor(t * 1.2 + k / 14) * 0.7, y = k % 2 ? 0.6 : 0.11 + (k % 4) * 0.14;
      p.position.set(Math.sin(a) * (0.17 + u * 0.25), y + u * 0.15 - u * u * 0.3 + 0.06, Math.cos(a) * (0.17 + u * 0.25));
      p.rotation.set(t * 5, t * 3 + k, 0);
      show(p, shake * (1.2 - u) * (0.6 + Math.abs(Math.sin(t * 9 + k))));
    });
    cycle(fountain, t, 0.9, (p, u, k) => {
      const a = k * 2.4 + Math.floor(t * 0.9 + k / 36) * 1.3, r = 0.1 + u * (0.3 + (k % 5) * 0.1);
      p.position.set(Math.sin(a) * r, 0.62 + u * 1.9 - u * u * 1.9, Math.cos(a) * r);
      p.rotation.set(t * 6 + k, t * 4, k);
      show(p, burst * (1.3 - u * 0.6));
    });
    show(pile, burst);
    show(heap, burst);
    heap.rotation.y = t * 0.5;
    pile.position.y = 0.03 * burst;
    piled.forEach((p, k) => { show(p, burst); p.rotation.y = t * 2 + k; });
  });
};

// ---- C50 the recorder class: an open school crate (3B) with six recorders standing in it, fanned out,
// sheet music behind them and a music stand beside it, a note or two drifting up / the recorders bobbing,
// sour notes wobbling off them / all six shrieking: red jagged notes, the recorders leaping and shivering,
// the crate hopping about the floor
const makeRecorders = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const cream = lambert(0xf5efdc), tipMat = lambert(0xfafaf6), holeMat = onFace(glow(0x2a2018)), black = lambert(0x1e1e24), paper = sheetMat(0xfbf7ea), staff = onFace(glow(0x3a3a48));
  const W = 0.5, H = 0.3, D = 0.36;
  const crateBox = openBox(all, W, H, D, PLANK, 0.02, false);
  part(crateBox, box(W + 0.02, 0.025, D + 0.02), lambert(0x8a6234), 0, H - 0.02, 0); // (a darker rim band, just under the top)
  part(crateBox, plane(0.16, 0.1), lettered('3B', 0xffffff, 0x1f5fd0, 128, 80), 0.1, 0.15, D / 2 + 0.016);
  // the recorders: cream, a dark windway at the top, finger holes down the front, standing in the crate
  const recorders = [0, 1, 2, 3, 4, 5].map(k => {
    const r = sub(crateBox, -0.1 + k * 0.04, 0.05, (k % 2 ? 0.08 : -0.08));
    r.userData.lean = (k - 2.5) * 0.08;
    r.userData.tilt = (k % 2 ? -0.1 : 0.1);
    r.rotation.set(r.userData.tilt, 0, r.userData.lean);
    part(r, cyl(0.02, 0.026, 0.5, 8), cream, 0, 0.25, 0);
    part(r, cyl(0.024, 0.02, 0.05, 8), tipMat, 0, 0.525, 0);
    part(r, box(0.016, 0.012, 0.004), holeMat, 0, 0.48, 0.022);
    for (let n = 0; n < 5; n++) part(r, new THREE.CircleGeometry(0.007, 6), holeMat, 0, 0.14 + n * 0.06, 0.0225 - n * 0.0006);
    return r;
  });
  // sheet music standing at the back of the crate
  const music = [-0.12, 0.08].map((x, k) => {
    const s = sub(crateBox, x, 0.14, -0.12 + k * 0.03);
    s.rotation.set(-0.12, k ? -0.15 : 0.1, 0);
    part(s, plane(0.22, 0.3), paper, 0, 0.15, 0);
    for (let n = 0; n < 6; n++) part(s, box(0.18, 0.004, 0.001), staff, 0, 0.06 + n * 0.035, 0.001);
    return s;
  });
  // the music stand beside the crate: a tripod, a rod, a tilted desk with a sheet on it
  const stand = sub(all, 0.42, 0, 0.02);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; part(stand, cyl(0.006, 0.006, 0.26, 6), black, Math.sin(a) * 0.07, 0.11, Math.cos(a) * 0.07, Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55); }
  part(stand, cyl(0.008, 0.008, 0.5, 6), black, 0, 0.45, 0);
  const desk = sub(stand, 0, 0.7, 0);
  desk.rotation.x = -0.35;
  part(desk, box(0.26, 0.2, 0.01), black, 0, 0.08, 0);
  part(desk, box(0.26, 0.02, 0.03), black, 0, -0.01, 0.01);
  part(desk, plane(0.2, 0.17), paper, 0, 0.09, 0.0075);
  for (let n = 0; n < 5; n++) part(desk, box(0.16, 0.004, 0.001), staff, 0, 0.03 + n * 0.03, 0.009);
  // the notes: dark quavers drifting up / wobbling / red and jagged
  const noteMat = glow(0x3a3a48);
  const notes = Array.from({ length: 8 }, (_, k) => { const n = quaver(all, noteMat); n.userData.k = k; return n; });
  const jagged = Array.from({ length: 6 }, (_, k) => {
    const j = sub(all);
    for (let s = 0; s < 4; s++) part(j, box(0.012, 0.06, 0.012), glow(0xff2a2a), s * 0.03 - 0.045, 0, 0, 0, 0, s % 2 ? 0.7 : -0.7);
    j.userData.k = k;
    return j;
  });
  return stated(group, (t, sour, shriek) => {
    const up = clamp01(sour + shriek);
    tint(noteMat, 0x3a3a48, 0xff2a2a, up);
    all.position.set(shriek * Math.sin(t * 2.2) * 0.1 + shriek * jitter(t, 1) * 0.02, shriek * Math.abs(Math.sin(t * 22)) * 0.02, 0);
    all.rotation.z = sour * jitter(t, 2) * 0.03 + shriek * jitter(t, 3) * 0.08;
    recorders.forEach((r, k) => {
      r.rotation.z = r.userData.lean + Math.sin(t * (1.2 + up * 6) + k) * (0.03 + sour * 0.08 + shriek * 0.1) + shriek * jitter(t, k) * 0.05;
      r.rotation.x = r.userData.tilt + Math.sin(t * (1 + up * 5) + k * 2) * (0.02 + up * 0.06);
      r.position.y = 0.05 + Math.abs(Math.sin(t * (1 + up * 8) + k * 1.3)) * (sour * 0.04 + shriek * 0.1);
    });
    music.forEach((s, k) => { s.rotation.x = -0.12 + Math.sin(t * (2 + up * 5) + k) * (0.02 + up * 0.08); });
    desk.rotation.z = shriek * jitter(t, 4) * 0.08;
    stand.rotation.z = shriek * Math.sin(t * 9) * 0.05;
    cycle(notes, t, mix(0.3, 0.8, up), (n, u, k) => {
      const x = -0.1 + (k % 6) * 0.04;
      n.position.set(x + Math.sin(t * 3 + k) * 0.06 * (1 + sour), 0.6 + u * 0.6, Math.sin(k) * 0.08);
      n.rotation.z = sour * Math.sin(t * 7 + k) * 0.5 + shriek * jitter(t, k) * 0.6;
      show(n, (k < 2 ? 1 : up) * (1 - u) * (1 - shriek * 0.5));
    });
    cycle(jagged, t, 1.1, (j, u, k) => {
      j.position.set(-0.1 + k * 0.04 + Math.sin(t * 9 + k) * 0.05, 0.62 + u * 0.7, 0);
      j.rotation.z = jitter(t, k) * 0.6;
      show(j, shriek * (1.2 - u) * (1.2 + jitter(t, k + 3) * 0.5));
    });
  });
};

// ---- C54 a subpoena: one long scroll, rolled and sealed, on a cushion / unrolling by itself, the
// sheet growing / coiled round the crate like a snake, the seal for a head, rearing, still unrolling
const makeSubpoena = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const paper = lambert(0xf3ead2), paperSheet = sheetMat(0xf3ead2), ribbon = lambert(0xb8101e), waxMat = glow(0xb8101e);
  const crateW = 0.5;
  crate(all, crateW, 0.42, crateW);
  const cushion = part(all, box(0.36, 0.08, 0.22), lambert(0x5a2a7a), 0, 0.46, 0);
  const scroll = sub(all, 0, 0.56, 0);
  const roll = part(scroll, cyl(0.065, 0.065, 0.46, 12), paper, 0, 0, 0, 0, 0, FLAT);
  for (const x of [-0.24, 0.24]) part(scroll, cyl(0.03, 0.03, 0.04, 8), lambert(0xd8c7a0), x, 0, 0, 0, 0, FLAT);
  part(scroll, cyl(0.068, 0.068, 0.05, 12), ribbon, 0, 0, 0, 0, 0, FLAT);
  part(scroll, cyl(0.045, 0.045, 0.02, 10), waxMat, 0, 0, 0.07, FLAT); // (its seal)
  // unrolling: a sheet hanging from the scroll down the crate's front and across the ground
  const sheet = sub(scroll, 0, -0.04, crateW / 2 + 0.015); // (down the crate's front)
  part(sheet, plane(0.42, 0.26), paperSheet, 0, 0.02, -0.13, -FLAT); // (the stretch from the scroll to the edge)
  const drop = part(sheet, plane(0.42, 0.5), paperSheet, 0, -0.25, 0);
  const run = part(sheet, plane(0.42, 0.36), paperSheet, 0, -0.5, 0.18, -FLAT);
  for (let k = 0; k < 6; k++) part(drop, box(0.26, 0.012, 0.001), glow(0x6a6a7a), 0, 0.18 - k * 0.06, 0.002);
  // the snake: the paper coiled round the crate, a head of wax rearing off the top
  const snake = sub(all);
  const N = 22, coils = Array.from({ length: N }, (_, k) => {
    const a = k * 0.5, r = crateW * 0.72 + 0.03;
    const seg = part(snake, box(0.2, 0.012, 0.18), paperSheet, Math.sin(a) * r, 0.06 + k * 0.036, Math.cos(a) * r, 0.12, a, 0.1);
    return seg;
  });
  const head = sub(snake, Math.sin(N * 0.5) * (crateW * 0.72 + 0.03), 0.06 + N * 0.036, Math.cos(N * 0.5) * (crateW * 0.72 + 0.03));
  const neck = sub(head);
  part(neck, box(0.2, 0.012, 0.24), paperSheet, 0, 0.08, 0, -1.1);
  const face = sub(neck, 0, 0.18, 0.08);
  part(face, cyl(0.05, 0.05, 0.03, 12), waxMat, 0, 0, 0, 0.6);
  for (const x of [-0.022, 0.022]) part(face, sphere(0.011, 6, 5), glow(0x1a1010), x, 0.015, 0.022);
  const tongue = part(face, box(0.008, 0.003, 0.08), glow(0xff5a7a), 0, -0.02, 0.06, 0.3);
  const loose = sheets(all, 8, paperSheet);
  return stated(group, (t, unroll, coiled) => {
    const calm = clamp01(1 - unroll - coiled);
    scroll.rotation.z = Math.sin(t * 1.5) * 0.05 * calm;
    scroll.position.y = 0.56 + Math.abs(Math.sin(t * 2.2)) * 0.03 * unroll;
    roll.scale.set(1 - unroll * 0.35 - coiled * 0.3, 1, 1 - unroll * 0.35 - coiled * 0.3);
    show(cushion, 1 - coiled * 0.999);
    show(scroll, 1 - coiled);
    // the sheet grows down the front and along the ground
    const grown = unroll * (0.6 + Math.min(1, (t % 6) / 4) * 0.4);
    sheet.scale.set(Math.max(0.001, grown), Math.max(0.001, grown), Math.max(0.001, grown));
    drop.rotation.y = Math.sin(t * 2) * 0.04 * unroll;
    run.position.z = 0.18 + Math.sin(t * 1.7) * 0.03;
    show(snake, coiled);
    coils.forEach((seg, k) => { seg.position.y = 0.06 + k * 0.036 + coiled * Math.sin(t * 4 - k * 0.5) * 0.015; seg.rotation.z = 0.1 + Math.sin(t * 4 - k * 0.5) * 0.08; });
    head.position.y = 0.06 + N * 0.036 + Math.sin(t * 4 - N * 0.5) * 0.015;
    neck.rotation.set(Math.sin(t * 2.3) * 0.25, Math.sin(t * 1.6) * 0.6, Math.sin(t * 3.1) * 0.15);
    face.rotation.y = Math.sin(t * 2.7) * 0.5;
    tongue.scale.z = 0.5 + Math.abs(Math.sin(t * 11)) * 0.8;
    cycle(loose, t, 0.5, (s, u, k) => flutter(s, u, k, t, 0.45, 0.6, coiled * (k < 4 ? 1 : 0.6)));
    all.rotation.z = coiled * Math.sin(t * 9) * 0.02;
  });
};

// ---- C42 a box of telemarketers: an open cardboard box with three headset-wearing heads looking over
// its rim, murmuring / the heads up, a phone handset pressed to each ear, the cords running down into the
// box / a forest of handsets ringing on springing cords, speech bubbles of LIMITED OFFER, the heads
// bouncing. (No hands: the heads and their headsets are the telemarketers)
const makeTelemarketers = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const black = lambert(0x1e1e24), handsetMat = lambert(0xf4f4f0), cordMat = lambert(0x2a2a30), hairMats = [lambert(0x4a2e1a), lambert(0x1a1a1e), lambert(0xd8a850)];
  const W = 0.62, H = 0.4, D = 0.5;
  const crateBox = openBox(all, W, H, D, CARD);
  part(crateBox, plane(0.26, 0.09), lettered('SALES', 0xffffff, 0x1e2a5a, 192, 64), 0.0, 0.08, D / 2 + 0.016); // (under the folded-down flap)
  // a head in a headset: a face, hair, eyes, an open mouth; the band over the top, pads at the ears, the
  // mic boom to the mouth
  const heads = [[-0.17, 0.02], [0.02, -0.02], [0.19, 0.08]].map(([x, z], k) => {
    const h = sub(crateBox, x, H, z);
    part(h, sphere(0.09, 14, 10), SKIN);
    part(h, new THREE.SphereGeometry(0.093, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMats[k], 0, 0.004, -0.01);
    for (const d of [-1, 1]) { part(h, sphere(0.013, 6, 5), glow(0xffffff), d * 0.035, 0.015, 0.08); part(h, sphere(0.007, 6, 5), glow(0x101010), d * 0.035, 0.015, 0.09); }
    const mouth = part(h, sphere(0.018, 8, 6), glow(0x4a1014), 0, -0.04, 0.082);
    mouth.scale.set(1.2, 0.6, 0.5);
    part(h, torus(0.095, 0.012, 14, Math.PI), black, 0, 0.01, 0, 0, 0, 0); // (the band)
    for (const d of [-1, 1]) part(h, cyl(0.03, 0.03, 0.025, 10), black, d * 0.095, 0.005, 0, 0, 0, FLAT);
    part(h, cyl(0.005, 0.005, 0.1, 5), black, 0.06, -0.025, 0.06, 0, 0, 0.9).rotation.x = -0.3;
    part(h, sphere(0.014, 6, 5), black, 0.025, -0.05, 0.1);
    // the handset at its ear, with a cord down into the box (only when the phones are out)
    const phone = sub(h, -0.11, 0.0, 0.02);
    phone.rotation.z = 0.25;
    part(phone, box(0.035, 0.2, 0.04), handsetMat, 0, 0, 0);
    for (const y of [-0.095, 0.095]) part(phone, sphere(0.04, 8, 6), handsetMat, 0, y, 0).scale.set(0.9, 1, 1.2);
    const cord = part(phone, cyl(0.006, 0.006, 0.4, 5), cordMat, 0, -0.3, 0);
    return { h, mouth, phone, cord, k, x, z };
  });
  // the murmur: dots that drift up from the mouths
  const murmur = Array.from({ length: 6 }, (_, k) => { const m = part(all, sphere(0.012, 6, 5), glow(0xd8d8e0)); m.userData.k = k; return m; });
  // the forest: handsets up on springing cords (coils), and the speech bubbles
  const handset = (parent) => {
    const g = sub(parent);
    part(g, box(0.2, 0.035, 0.04), handsetMat, 0, 0.04, 0);
    for (const x of [-0.09, 0.09]) part(g, sphere(0.04, 8, 6), handsetMat, x, 0.02, 0).scale.set(1, 0.9, 1.2);
    return g;
  };
  const springs = [[-0.25, -0.14], [-0.08, 0.16], [0.08, -0.16], [0.27, 0.2]].map(([x, z], k) => {
    const root = sub(crateBox, x, H - 0.02, z);
    const coil = [0, 1, 2, 3, 4, 5].map(j => part(root, torus(0.04, 0.01, 8), cordMat, 0, 0.05 + j * 0.09, 0, FLAT));
    const set = handset(root);
    set.position.y = 0.58;
    return { root, coil, set, k };
  });
  const bubbleMat = lettered('LIMITED OFFER', 0xd81e2a, 0xffffff, 256, 80);
  const bubbles = [0, 1, 2].map(k => {
    const b = sub(all);
    part(b, box(0.36, 0.12, 0.012), bubbleMat);
    part(b, cone(0.03, 0.08, 4), glow(0xffffff), -0.1, -0.09, 0, Math.PI);
    b.userData.k = k;
    return b;
  });
  return stated(group, (t, out, forest) => {
    const up = clamp01(out + forest), calm = clamp01(1 - up);
    heads.forEach((hd) => {
      const k = hd.k, talk = Math.abs(Math.sin(t * (6 + up * 6) + k * 2));
      hd.h.position.y = H + 0.0 + Math.sin(t * 1.3 + k * 2) * 0.015 + out * 0.12 + forest * (0.08 + Math.abs(Math.sin(t * 8 + k * 1.3)) * 0.1);
      hd.h.rotation.set(Math.sin(t * 1.1 + k) * 0.08 * calm - forest * 0.15, Math.sin(t * 0.7 + k * 1.5) * 0.5 * (1 - forest * 0.5) + forest * Math.sin(t * 5 + k) * 0.3, out * 0.2 + forest * jitter(t, k) * 0.1);
      hd.mouth.scale.set(1.2, 0.3 + talk * (0.5 + up * 1.2), 0.5);
      show(hd.phone, up);
      hd.phone.rotation.z = 0.25 + Math.sin(t * (3 + forest * 12) + k) * (0.08 + forest * 0.2);
    });
    cycle(murmur, t, 0.5, (m, u, k) => {
      const hd = heads[k % 3];
      m.position.set(hd.x + Math.sin(t * 2 + k) * 0.03, H + 0.02 + u * 0.25, hd.z + 0.1 + u * 0.1);
      show(m, calm * (1 - u) * Math.min(1, u * 5) * (1 + (k % 2)) * 0.6);
    });
    springs.forEach((s) => {
      show(s.root, forest);
      const bounce = Math.abs(Math.sin(t * 7 + s.k * 1.3));
      s.coil.forEach((c, j) => { c.position.y = 0.05 + j * (0.07 + bounce * 0.05); c.position.x = Math.sin(t * 9 + j + s.k) * 0.015; });
      s.set.position.set(Math.sin(t * 9 + s.k) * 0.03, 0.42 + bounce * 0.32, 0);
      s.set.rotation.z = Math.sin(t * 18 + s.k) * 0.4 * forest; // (ringing: it shivers)
    });
    bubbles.forEach((b) => {
      const k = b.userData.k, u = ((t * 0.6 + k / 3) % 1);
      b.position.set(-0.35 + k * 0.32, 1.0 + u * 0.3 + (k % 2) * 0.12, 0.15 - (k % 2) * 0.3);
      b.rotation.y = Math.sin(t * 2 + k) * 0.3;
      show(b, forest * Math.min(1, u * 5) * (1 - u * 0.6));
    });
    all.position.set(out * jitter(t, 1) * 0.012 + forest * jitter(t, 2) * 0.025, forest * Math.abs(Math.sin(t * 9)) * 0.04, 0);
    all.rotation.z = up * Math.sin(t * 11) * 0.03;
  });
};

// ---- C43 a sack of tax inspectors: a slumped burlap sack, its neck tied with rope, two bowler hats
// peeking out of the opening, a till roll of receipts trailing out of it and across the ground / the hats
// higher, arms out of the opening with clipboards, the roll spooling further / rubber stamps hammering
// AUDIT on the sack, forms flying, the hats bouncing
const makeTaxmen = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const sackMat = lambert(0x9a8a6a), patchMat = lambert(0x7a6a4c), rope = lambert(0xd2b98a), black = lambert(0x1a1a1e), tapeMat = sheetMat(0xffffff), red = lambert(0xd81e2a);
  const sack = sub(all);
  // its outline, bottom to top: wide and slumped, a tied neck, the gathered top flaring open
  const PROFILE = [[0.02, 0], [0.34, 0], [0.37, 0.12], [0.35, 0.3], [0.3, 0.48], [0.2, 0.6], [0.13, 0.68], [0.12, 0.72], [0.17, 0.8], [0.19, 0.84]];
  const radiusAt = (y) => { for (let i = 1; i < PROFILE.length; i++) if (y <= PROFILE[i][1]) { const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i]; return mix(r0, r1, (y - y0) / (y1 - y0)); } return PROFILE[PROFILE.length - 1][0]; };
  part(sack, new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 18), sackMat);
  part(sack, new THREE.CircleGeometry(0.17, 18), SHADE, 0, 0.825, 0, -FLAT); // (the dark inside the opening)
  for (const [a, y, r] of [[0.6, 0.22, 0.13], [2.6, 0.38, 0.11], [4.4, 0.16, 0.12]]) part(sack, sphere(r, 10, 8), sackMat, Math.sin(a) * (radiusAt(y) - r * 0.4), y, Math.cos(a) * (radiusAt(y) - r * 0.4)); // (elbows and knees inside)
  part(sack, torus(0.125, 0.022, 12), rope, 0, 0.7, 0, FLAT);
  part(sack, torus(0.125, 0.018, 12), rope, 0, 0.735, 0, FLAT);
  part(sack, box(0.02, 0.12, 0.02), rope, 0.14, 0.64, 0.05, 0, 0, 0.4); // (the rope's loose end)
  const patch = part(sack, box(0.14, 0.12, 0.02), patchMat, -0.1, 0.3, radiusAt(0.3) - 0.004, 0, -0.3, 0.15);
  for (const d of [-1, 1]) for (let k = 0; k < 3; k++) part(patch, box(0.012, 0.025, 0.004), black, d * 0.07, -0.04 + k * 0.04, 0.009, 0, 0, 0.6);
  // the bowler hats, on the tops of heads, in the opening
  const bowler = (x, z, tilt) => {
    const b = sub(sack, x, 0.84, z);
    part(b, sphere(0.055, 10, 8), SKIN, 0, -0.02, 0);
    const hat = sub(b, 0, 0.015, 0);
    hat.rotation.z = tilt;
    part(hat, cyl(0.062, 0.062, 0.012, 14), black, 0, 0, 0);
    part(hat, new THREE.SphereGeometry(0.052, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), black, 0, 0.0, 0).scale.y = 1.3;
    part(hat, torus(0.095, 0.01, 16), black, 0, 0.002, 0, FLAT);
    return b;
  };
  const hats = [bowler(-0.07, 0.02, 0.15), bowler(0.07, -0.04, -0.2)];
  // the till roll: a continuous strip of receipts out of the opening, down the front and along the ground
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0.0, 0.84, 0.1), new THREE.Vector3(0.05, 0.82, 0.2), new THREE.Vector3(0.1, 0.6, 0.32), new THREE.Vector3(0.14, 0.3, 0.37), new THREE.Vector3(0.18, 0.04, 0.42), new THREE.Vector3(0.28, 0.006, 0.6), new THREE.Vector3(0.36, 0.006, 0.85), new THREE.Vector3(0.3, 0.006, 1.1), new THREE.Vector3(0.1, 0.006, 1.3)]);
  const N = 22, segLen = 1 / N;
  const strip = Array.from({ length: N }, () => {
    const seg = sub(all);
    part(seg, plane(0.08, 0.1), tapeMat, 0, 0, 0, -FLAT); // (lies along local z, faces local y)
    for (let n = 0; n < 3; n++) part(seg, box(0.05, 0.001, 0.006), onFace(glow(0x7a7a88)), -0.005, 0.0015, -0.03 + n * 0.03);
    return seg;
  });
  const basis = new THREE.Matrix4(), T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3();
  const layStrip = (shown) => strip.forEach((seg, k) => {
    const u = Math.min(0.999, (k + 0.5) * segLen);
    if (u > shown) { show(seg, 0.001); return; }
    path.getPointAt(u, P);
    path.getTangentAt(u, T);
    Nv.set(P.x, 0, P.z).normalize().lerp(new THREE.Vector3(0, 1, 0), P.y < 0.08 ? 1 : 0.15).normalize();
    B.crossVectors(Nv, T).normalize();
    Nv.crossVectors(T, B).normalize();
    basis.makeBasis(B, Nv, T);
    seg.quaternion.setFromRotationMatrix(basis);
    seg.position.copy(P);
    seg.scale.set(1, 1, 1);
  });
  // arms out of the opening with clipboards
  const clipboard = (parent) => {
    const g = sub(parent, 0, -0.1, 0.04);
    part(g, box(0.16, 0.22, 0.012), lambert(0x6b4a2a));
    part(g, box(0.14, 0.18, 0.004), glow(0xfbf7ea), 0, -0.01, 0.008);
    part(g, box(0.06, 0.03, 0.02), lambert(0x9a9aa6), 0, 0.1, 0.008);
    for (let k = 0; k < 4; k++) part(g, box(0.1, 0.008, 0.001), onFace(glow(0x8a8a9a)), 0, 0.05 - k * 0.035, 0.0105);
    return g;
  };
  const arms = [-1, 1].map((d, k) => {
    const root = sub(sack, d * 0.1, 0.8, -0.02);
    const a = arm(root, 0.26);
    clipboard(a.prop);
    return { root, a, k, d };
  });
  // the stamps: two arms hammering down on the sack, and the AUDIT marks they leave
  const auditMat = onFace(lettered('AUDIT', 0xffffff, 0xd81e2a, 192, 72));
  const stamps = [-1, 1].map((d, k) => {
    const root = sub(sack, d * 0.04, 0.82, 0.04);
    const a = arm(root, 0.22);
    const block = sub(a.prop, 0, 0.02, 0.03);
    part(block, cyl(0.035, 0.03, 0.09, 8), lambert(0x6b4a2a), 0, 0.03, 0);
    part(block, box(0.11, 0.025, 0.07), red, 0, -0.03, 0);
    return { root, a, k, d };
  });
  const marks = Array.from({ length: 7 }, (_, k) => {
    const a = k * 0.9 + 0.3, y = 0.12 + (k % 4) * 0.12, r = radiusAt(y) + 0.006;
    const m = part(sack, plane(0.16, 0.06), auditMat, Math.sin(a) * r, y, Math.cos(a) * r, 0, a, (k % 2 ? 0.3 : -0.3));
    m.userData.k = k;
    return m;
  });
  const forms = sheets(all, 10);
  return stated(group, (t, spool, audit) => {
    const up = clamp01(spool + audit);
    sack.rotation.z = Math.sin(t * 1.3) * 0.02 + spool * jitter(t, 1) * 0.04 + audit * jitter(t, 2) * 0.07;
    sack.position.y = audit * Math.abs(Math.sin(t * 8)) * 0.04;
    hats.forEach((h, k) => {
      h.position.y = 0.84 + Math.sin(t * 1.2 + k * 2) * 0.01 + spool * 0.06 + audit * (0.04 + Math.abs(Math.sin(t * 7 + k)) * 0.08);
      h.rotation.set(Math.sin(t * 1.1 + k) * 0.05 + audit * Math.sin(t * 9 + k) * 0.15, Math.sin(t * 0.6 + k * 2) * 0.4, (k ? -1 : 1) * up * Math.sin(t * 6 + k) * 0.15);
    });
    layStrip(0.35 + spool * 0.4 + audit * 0.65);
    arms.forEach((p) => {
      show(p.root, up);
      p.a.root.rotation.set(-FLAT + 0.5 + Math.sin(t * (2 + audit * 4) + p.k * 2) * (0.2 + audit * 0.35), 0, p.d * (0.5 + Math.sin(t * 1.7 + p.k) * 0.2));
    });
    stamps.forEach((st) => {
      show(st.root, audit);
      const hit = Math.pow(Math.abs(Math.sin(t * 6 + st.k * 1.57)), 3);
      st.a.root.rotation.set(-FLAT + 0.9 + hit * 1.5, 0, st.d * (0.9 + Math.sin(t * 2.5 + st.k) * 0.3));
    });
    marks.forEach((m) => { const k = m.userData.k; show(m, audit * (((t * 0.8 + k / 7) % 1) < 0.85 ? 1 : 0.001)); });
    cycle(forms, t, 0.6, (s, u, k) => flutter(s, u, k, t, 0.5, 0.9, audit));
  });
};



// ---- C47 parking wardens in a van-shaped box: a small cardboard box cut like a van, a peaked cap
// resting on it / a hand out of each side writing tickets / tickets fired like confetti, a wheel clamp
// snapping at the air out of the roof
const makeWardens = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const van = sub(all);
  const navy = lambert(0x1e2a5a), ticketMat = sheetMat(0xfff07a), ticketLine = glow(0x9a3a2a), glass = lambert(0x8bb8d8);
  part(van, box(0.5, 0.36, 0.7), CARD, 0, 0.28, -0.05); // (the body)
  part(van, box(0.5, 0.26, 0.2), CARD, 0, 0.23, 0.35); // (the bonnet)
  part(van, box(0.48, 0.14, 0.02), glass, 0, 0.37, 0.3, -0.5); // (the windscreen drawn on)
  for (const x of [-0.251, 0.251]) part(van, box(0.02, 0.12, 0.3), glass, x, 0.33, 0.05); // (side windows)
  for (const [x, z] of [[-0.26, 0.25], [0.26, 0.25], [-0.26, -0.25], [0.26, -0.25]]) part(van, cyl(0.09, 0.09, 0.03, 12), lambert(0x2a2a30), x, 0.1, z, 0, 0, FLAT);
  for (const x of [-0.12, 0.12]) part(van, new THREE.CircleGeometry(0.035, 10), glow(0xfff3c0), x, 0.3, 0.451);
  const cap = sub(van, 0, 0.46, -0.1);
  part(cap, cyl(0.13, 0.12, 0.08, 14), navy, 0, 0.04, 0);
  part(cap, cyl(0.135, 0.135, 0.015, 14), lambert(0xffe24a), 0, 0.045, 0);
  part(cap, box(0.2, 0.012, 0.1), lambert(0x101018), 0, 0.005, 0.15, 0.15);
  part(cap, cyl(0.03, 0.03, 0.006, 8), lambert(0xd4a94a), 0, 0.05, 0.125, FLAT);
  // a hand out of each side, a ticket pad in it, the pen scribbling
  const writers = [-1, 1].map((d, k) => {
    const root = sub(van, d * 0.25, 0.22, 0.05);
    root.rotation.y = d * FLAT;
    hole(root, 0.07).position.z = 0.003;
    const a = arm(root, 0.2);
    const pad = sub(a.prop, 0, 0.01, 0.04);
    part(pad, box(0.1, 0.012, 0.14), ticketMat, 0, 0, 0, 0, 0, 0);
    for (let n = 0; n < 3; n++) part(pad, box(0.06, 0.002, 0.008), ticketLine, 0, 0.007, -0.04 + n * 0.035);
    const pen = part(pad, cyl(0.006, 0.006, 0.12, 6), lambert(0x101018), 0.03, 0.04, 0, 0.5, 0, 0.5);
    return { root, a, pad, pen, k, d };
  });
  const tickets = Array.from({ length: 16 }, () => { const tk = part(all, plane(0.07, 0.1), ticketMat); part(tk, box(0.04, 0.006, 0.001), ticketLine, 0, 0.02, 0.001); part(tk, box(0.04, 0.006, 0.001), ticketLine, 0, -0.01, 0.001); return tk; });
  // the clamp: a yellow ring with a jaw that snaps, up out of the roof
  const clampRoot = sub(van, 0, 0.46, -0.1);
  const clampArm = arm(clampRoot, 0.22);
  clampArm.root.rotation.x = -FLAT;
  const clamp = sub(clampArm.prop, 0, 0.1, 0);
  const yellow = lambert(0xffd23f);
  part(clamp, torus(0.1, 0.03, 14, Math.PI * 1.3), yellow, 0, 0, 0, 0, 0, 0.9);
  part(clamp, box(0.12, 0.05, 0.05), yellow, 0.1, -0.06, 0);
  const jaw = sub(clamp, -0.08, 0.06, 0);
  part(jaw, torus(0.1, 0.03, 10, Math.PI * 0.6), yellow, 0.08, -0.06, 0, 0, 0, 2.2);
  part(jaw, box(0.1, 0.05, 0.05), lambert(0xd81e2a), 0.02, 0.03, 0);
  return stated(group, (t, write, fire) => {
    const up = clamp01(write + fire);
    cap.rotation.set(Math.sin(t * 0.9) * 0.04, 0.3, 0.08 + up * Math.sin(t * 6) * 0.15);
    cap.position.set(0, 0.46 + fire * 0.12 + up * Math.abs(Math.sin(t * 7)) * 0.04, -0.1 - fire * 0.22);
    cap.scale.setScalar(1 - fire * 0.2 + 0.001);
    writers.forEach((w) => {
      show(w.root, up);
      w.a.root.rotation.set(-0.5 + Math.sin(t * 2 + w.k) * 0.1 * write + fire * Math.sin(t * 7 + w.k) * 0.5, 0, w.d * (0.2 + fire * Math.sin(t * 5 + w.k * 2) * 0.5));
      w.pen.position.set(0.03 + Math.sin(t * 14 + w.k) * 0.02 * write, 0.04, Math.cos(t * 11 + w.k) * 0.03 * write);
      w.pen.rotation.x = 0.5 + Math.sin(t * 14) * 0.2;
    });
    cycle(tickets, t, 0.8, (tk, u, k) => {
      const a = k * 1.3 + Math.floor(t * 0.8 + k / 16) * 0.9, side = k % 2 ? 1 : -1;
      tk.position.set(side * (0.25 + u * 0.7) * Math.abs(Math.cos(a * 0.5)), 0.25 + u * 1.1 - u * u * 0.9, Math.sin(a) * (0.1 + u * 0.5));
      tk.rotation.set(t * 4 + k, t * 3, Math.sin(t * 5 + k));
      show(tk, fire * (1.2 - u * 0.7));
    });
    show(clampRoot, fire);
    clampArm.root.rotation.set(-FLAT + Math.sin(t * 3) * 0.3, 0, Math.sin(t * 2.3) * 0.4);
    clamp.rotation.y = Math.sin(t * 1.7) * 0.8;
    jaw.rotation.z = Math.pow(Math.abs(Math.sin(t * 6)), 3) * 1.1;
    van.position.set(write * jitter(t, 1) * 0.01 + fire * jitter(t, 2) * 0.02, fire * Math.abs(Math.sin(t * 9)) * 0.03, 0);
    van.rotation.z = up * Math.sin(t * 9) * 0.02;
  });
};

// ---- C51 a crate of consultants: a crate labelled SYNERGY with a flip-chart easel standing on it, a
// laser dot wandering over the chart / the chart's pages flipping over by themselves, sticky notes
// breaking out over the crate, the dot frantic / a pie chart spinning in the air above it, sticky notes
// plastered over everything, pages flying off the chart, an invoice unrolling out of the side
const makeConsultants = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.6, H = 0.4, D = 0.5;
  const body = crate(all, W, H, D, lambert(0xc6a16a));
  part(body, plane(0.42, 0.13), lettered('SYNERGY', 0xffffff, 0x1f5fd0, 256, 80), 0, 0.22, D / 2 + 0.016);
  const noteColours = [0xfff176, 0xff9ad5, 0x9df0a0, 0x8fd8ff];
  const note = (parent, x, y, z, ry, k) => part(parent, plane(0.09, 0.09), onFace(lambert(noteColours[k % 4], { side: THREE.DoubleSide })), x, y, z, 0, ry, (k % 3 - 1) * 0.2);
  // the easel on the crate: two front legs and a back leg, a board leaning back, a pad of sheets on it
  const easel = sub(all, 0, H, 0);
  const alu = lambert(0x9a9aa6);
  for (const d of [-1, 1]) part(easel, cyl(0.012, 0.012, 0.66, 6), alu, d * 0.14, 0.32, 0.02, 0, 0, d * 0.12);
  part(easel, cyl(0.012, 0.012, 0.62, 6), alu, 0, 0.3, -0.14, -0.4, 0, 0);
  part(easel, cyl(0.01, 0.01, 0.3, 6), alu, 0, 0.3, 0.02, 0, 0, FLAT); // (the cross bar)
  const board = sub(easel, 0, 0.42, 0.04);
  board.rotation.x = -0.12;
  part(board, box(0.42, 0.34, 0.016), lambert(0xf0f0f0), 0, 0, 0);
  part(board, box(0.44, 0.03, 0.03), lambert(0x2a2a30), 0, 0.175, 0.004); // (the clamp along the top)
  const pad = part(board, box(0.38, 0.28, 0.012), lambert(0xffffff), 0, -0.02, 0.014);
  const chartLine = onFace(glow(0x1f5fd0));
  const inkOn = (parent, z) => { // (a hockey-stick graph: axes, and a line that goes up and up)
    part(parent, box(0.004, 0.2, 0.001), onFace(glow(0x2a2a30)), -0.13, 0.0, z);
    part(parent, box(0.28, 0.004, 0.001), onFace(glow(0x2a2a30)), 0.01, -0.1, z);
    part(parent, box(0.12, 0.008, 0.001), chartLine, -0.07, -0.08, z, 0, 0, 0.15);
    part(parent, box(0.16, 0.008, 0.001), onFace(glow(0xd81e2a)), 0.05, 0.0, z, 0, 0, 0.9);
  };
  inkOn(pad, 0.0065);
  const dot = part(board, new THREE.CircleGeometry(0.014, 8), onFace(glow(0xff2020)), 0, 0, 0.022);
  // the sheet that flips over the top of the board, again and again
  const flip = sub(board, 0, 0.155, 0.028);
  const flipSheet = part(flip, plane(0.38, 0.28), sheetMat(0xffffff), 0, -0.145, 0);
  inkOn(flipSheet, 0.001);
  // the sticky notes: over the crate, then the board and the easel too
  const plastered = Array.from({ length: 20 }, (_, k) => {
    const g = sub(body);
    g.rotation.y = (k % 4) * FLAT;
    const n = note(g, -0.2 + ((k * 0.37) % 1) * 0.4, 0.06 + ((k * 0.61) % 1) * 0.3, (k % 2 ? W : D) / 2 + 0.016, 0, k);
    n.userData.k = k;
    return n;
  });
  const boardNotes = Array.from({ length: 6 }, (_, k) => note(board, -0.15 + ((k * 0.43) % 1) * 0.3, -0.12 + ((k * 0.71) % 1) * 0.24, 0.024, 0, k + 1));
  const lidNotes = [0, 1, 2].map(k => { const n = note(all, -0.2 + k * 0.2, H + 0.014, 0.18 - (k % 2) * 0.36, 0, k + 2); n.rotation.x = -FLAT; return n; });
  // the pie chart in the air, and the invoice out of the side
  const pie = sub(all, 0, H + 0.95, 0);
  const wedges = [[0, 2.4, 0x1f5fd0], [2.4, 1.6, 0xff8a2a], [4.0, 1.4, 0x9df0a0], [5.4, 0.88, 0xd81e2a]];
  for (const [from, len, colour] of wedges) part(pie, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16, 1, false, from, len), lambert(colour), 0, 0, 0);
  const invoice = sub(all, -W / 2 - 0.012, 0, 0);
  const invoiceBits = Array.from({ length: 8 }, (_, k) => { const b = part(invoice, plane(0.14, 0.12), sheetMat(0xffffff)); if (k % 2) part(b, box(0.09, 0.008, 0.001), onFace(glow(0x5a5a66)), 0, 0, 0.001); return b; });
  const total = part(invoice, plane(0.14, 0.06), lettered('$$$$', 0xd81e2a, 0xffffff, 128, 56));
  const loose = sheets(all, 8);
  return stated(group, (t, flipping, over) => {
    const up = clamp01(flipping + over);
    dot.position.set(Math.sin(t * (1.7 + up * 6)) * 0.15 + Math.sin(t * 5.3) * 0.03, -0.02 + Math.sin(t * (2.3 + up * 5)) * 0.1, 0.022);
    dot.scale.setScalar(1 + over * 0.6);
    // the page: it lifts, flips right over the top and comes back
    const cycleAt = (t * (0.5 + over * 0.6)) % 1;
    const lift = up * (cycleAt < 0.5 ? Math.sin(cycleAt * Math.PI * 2) : 0) * 0.5 + over * (cycleAt >= 0.5 ? Math.min(1, (cycleAt - 0.5) * 4) : 0);
    flip.rotation.x = -lift * (0.3 + over * 2.6);
    plastered.forEach((n) => { const k = n.userData.k; show(n, k < 8 ? flipping * (((t * 0.6 + k / 8) % 1) < 0.9 ? 1 : 0) + over : over); });
    boardNotes.forEach((n, k) => show(n, over * (((t * 0.4 + k / 6) % 1) < 0.92 ? 1 : 0)));
    lidNotes.forEach((n) => show(n, over));
    show(pie, over);
    pie.position.set(Math.sin(t * 1.5) * 0.06, H + 0.9 + Math.sin(t * 2) * 0.05, 0.05);
    pie.rotation.set(0.5 + Math.sin(t * 1.5) * 0.2, t * 3, 0);
    easel.rotation.z = over * Math.sin(t * 7) * 0.03;
    // the invoice: down the side and along the ground, growing
    const len = over * (0.5 + Math.min(1, (t % 5) / 3.5) * 0.5);
    invoiceBits.forEach((b, k) => {
      const along = k * 0.12;
      if (along < 0.24) { b.position.set(-0.002, 0.3 - along, 0); b.rotation.set(0, -FLAT, 0); }
      else { b.position.set(-(along - 0.24) - 0.06, 0.004, 0); b.rotation.set(-FLAT, 0, 0); }
      show(b, along <= len ? 1 : 0.001);
    });
    total.position.set(-(len - 0.24) - 0.12, 0.005, 0);
    total.rotation.set(-FLAT, 0, 0);
    show(total, over * (len > 0.9 ? 1 : 0.001));
    cycle(loose, t, 0.5, (s, u, k) => flutter(s, u, k, t, 0.5, 0.9 + H, over * 0.8));
    all.position.set(flipping * jitter(t, 1) * 0.01 + over * jitter(t, 2) * 0.02, over * Math.abs(Math.sin(t * 8)) * 0.03, 0);
    all.rotation.z = up * Math.sin(t * 10) * 0.025;
  });
};

// ---- C45 the in-laws' luggage: a tartan trunk, two strapped suitcases with stickers and handles, a hat
// box on top, all stacked neat / the cases bulge and their lids lift a crack: a slipper, knitting needles,
// a rolled newspaper, a framed photo poking out of the gaps / burst open: the stack heaves apart, the gaps
// full of their things, the hat box's lid blown off and a flowered hat rising out of it. Each case stands
// on the lid of the one below, so the stack moves as one and nothing passes through anything
const makeInlaws = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const brass = lambert(0xd4a94a), leather = lambert(0x8a5a2e), strapMat = lambert(0x3a2a20), tartan = lambert(0x1f4a2a), redLine = lambert(0xb8242a), yellowLine = lambert(0xe8c84a);
  const stickers = [0xff5fa0, 0x5fd0ff, 0xfff176, 0x9df0a0, 0xff8a2a].map(c => onFace(lambert(c)));
  // a case: its body (which bulges) and its lid (which lifts, carrying whatever is stacked on it); what is
  // in it shows in the gap between the two. Returns { g, body, lid, gap } with lid at y = h + gap
  const makeCase = (parent, w, h, d, mat, lidH) => {
    const g = sub(parent);
    const body = sub(g);
    part(body, box(w, h, d), mat, 0, h / 2, 0);
    const lid = sub(g, 0, h + 0.003, 0);
    part(lid, box(w + 0.01, lidH, d + 0.01), mat, 0, lidH / 2, 0);
    const inside = part(g, box(w - 0.03, 1, d - 0.03), SHADE, 0, h, 0); // (the dark of the gap, between body and lid: stretched to the gap)
    inside.visible = false;
    return { g, body, lid, w, h, d, lidH, inside };
  };
  // the trunk: tartan, brass corners, two latches
  const trunk = makeCase(all, 0.72, 0.3, 0.48, tartan, 0.07);
  for (const x of [-0.2, 0.0, 0.2]) part(trunk.body, box(0.035, 0.304, 0.484), redLine, x, 0.15, 0);
  for (const y of [0.1, 0.22]) part(trunk.body, box(0.724, 0.03, 0.484), y > 0.15 ? yellowLine : redLine, 0, y, 0);
  for (const x of [-0.2, 0.0, 0.2]) part(trunk.lid, box(0.035, 0.074, 0.494), redLine, x, 0.035, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) part(trunk.body, box(0.06, 0.06, 0.06), brass, x * 0.345, 0.03, z * 0.225);
  for (const x of [-0.22, 0.22]) part(trunk.body, box(0.06, 0.05, 0.015), brass, x, 0.27, 0.245);
  // the suitcases: leather with two straps, a handle on the front, stickers; floral with one strap and a tag
  const caseA = makeCase(trunk.lid, 0.6, 0.2, 0.4, leather, 0.03);
  caseA.g.position.y = 0.073;
  for (const x of [-0.16, 0.16]) part(caseA.body, box(0.05, 0.204, 0.404), strapMat, x, 0.1, 0);
  for (const x of [-0.16, 0.16]) part(caseA.lid, box(0.05, 0.034, 0.414), strapMat, x, 0.015, 0);
  part(caseA.body, torus(0.05, 0.012, 10, Math.PI), strapMat, 0, 0.1, 0.2, FLAT, 0, 0).scale.set(1.6, 1, 1);
  [[-0.22, 0.12, 0], [0.24, 0.08, 1], [0.05, 0.14, 2]].forEach(([x, y, k]) => part(caseA.body, plane(0.09, 0.065), stickers[k], x, y, 0.204, 0, 0, (k - 1) * 0.3));
  part(caseA.body, plane(0.07, 0.07), stickers[3], 0.0, 0.1, -0.204, 0, Math.PI, 0.2);
  const caseB = makeCase(caseA.lid, 0.46, 0.16, 0.32, lambert(0xf2c6d0), 0.03);
  caseB.g.position.y = 0.033;
  part(caseB.body, box(0.05, 0.164, 0.324), strapMat, 0.0, 0.08, 0);
  part(caseB.lid, box(0.05, 0.034, 0.334), strapMat, 0.0, 0.015, 0);
  for (let n = 0; n < 6; n++) part(caseB.body, new THREE.CircleGeometry(0.016, 6), onFace(glow([0xd84a7a, 0x6a9ad0, 0xe0a030][n % 3])), -0.18 + n * 0.07 + (n % 2) * 0.02, 0.05 + (n % 2) * 0.06, 0.1625);
  part(caseB.body, torus(0.04, 0.01, 10, Math.PI), strapMat, 0.23, 0.08, 0, 0, 0, -FLAT); // (a handle on its end)
  const tag = sub(caseB.body, 0.25, 0.05, 0.1);
  part(tag, cyl(0.004, 0.004, 0.06, 5), lambert(0xd8d8e0), 0, 0.02, 0);
  part(tag, box(0.05, 0.07, 0.008), lambert(0xfff1b8), 0, -0.04, 0);
  // the hat box: striped, a lid with a ribbon bow; a flowered hat inside it
  const hatBox = sub(caseB.lid, 0, 0.033, 0);
  const hatR = 0.17, hatH = 0.15;
  part(hatBox, cyl(hatR, hatR, hatH, 20), lambert(0xf4ead8), 0, hatH / 2, 0);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; part(hatBox, box(0.03, hatH - 0.004, 0.012), lambert(0x6a9ad0), Math.sin(a) * (hatR + 0.004), hatH / 2, Math.cos(a) * (hatR + 0.004), 0, a, 0); }
  part(hatBox, new THREE.CircleGeometry(hatR - 0.004, 20), SHADE, 0, hatH - 0.012, 0, -FLAT);
  const hatLid = sub(hatBox, 0, hatH + 0.003, 0);
  part(hatLid, cyl(hatR + 0.006, hatR + 0.006, 0.03, 20), lambert(0xf4ead8), 0, 0.015, 0);
  part(hatLid, box(0.03, 0.034, hatR * 2 + 0.014), lambert(0xd84a7a), 0, 0.015, 0);
  part(hatLid, box(hatR * 2 + 0.014, 0.034, 0.03), lambert(0xd84a7a), 0, 0.015, 0);
  for (const d of [-1, 1]) part(hatLid, torus(0.04, 0.014, 10), lambert(0xd84a7a), d * 0.045, 0.045, 0, 0, 0, d * 0.4).scale.set(1.2, 1, 0.5);
  part(hatLid, sphere(0.022, 8, 6), lambert(0xd84a7a), 0, 0.04, 0);
  const hat = sub(hatBox, 0, hatH - 0.1, 0);
  part(hat, cyl(0.16, 0.16, 0.012, 18), lambert(0xd0b0e0), 0, 0, 0);
  part(hat, cyl(0.09, 0.1, 0.09, 16), lambert(0xd0b0e0), 0, 0.05, 0);
  part(hat, torus(0.095, 0.012, 16), lambert(0x7a3a8a), 0, 0.012, 0, FLAT);
  for (let k = 0; k < 5; k++) part(hat, sphere(0.022, 8, 6), lambert([0xff5fa0, 0xfff176][k % 2]), 0.08 + Math.sin(k * 1.26) * 0.02, 0.03 + (k % 3) * 0.015, Math.cos(k * 1.26) * 0.03).scale.y = 0.6;
  // what shows in the gaps: a slipper out of the trunk, needles and a newspaper out of the leather case,
  // a framed photo out of the floral one. Each sits on its case's body, at the front or a side
  const slipper = sub(trunk.body, -0.2, 0.3, 0.26);
  part(slipper, sphere(0.06, 8, 6), lambert(0xe28ab0), 0, 0.03, 0).scale.set(1, 0.5, 1.6);
  part(slipper, torus(0.035, 0.012, 10), lambert(0xffffff), 0, 0.045, 0.02, FLAT);
  const needles = sub(caseA.body, 0.3, 0.2, 0.05);
  for (const k of [0, 1]) part(needles, cyl(0.006, 0.006, 0.34, 6), lambert(0xb8b8c8), 0.12, 0.01, k * 0.04 - 0.02, 0, 0, FLAT + (k ? 0.25 : -0.2));
  part(needles, box(0.12, 0.016, 0.1), lambert(0xd84a7a), 0.05, 0.012, 0); // (the knitting on them)
  const paper = sub(caseA.body, -0.3, 0.2, -0.05);
  part(paper, cyl(0.03, 0.03, 0.3, 10), lambert(0xd8d4c8), -0.12, 0.03, 0, 0, 0, FLAT);
  part(paper, cyl(0.033, 0.033, 0.05, 10), lambert(0xd81e2a), -0.12, 0.03, 0, 0, 0, FLAT); // (its band)
  const photo = sub(caseB.body, 0.05, 0.16, 0.16);
  part(photo, box(0.14, 0.016, 0.12), brass, 0, 0.008, 0.06);
  part(photo, box(0.11, 0.004, 0.09), lambert(0xe8e0d0), 0, 0.017, 0.06);
  for (const x of [-0.025, 0.03]) part(photo, sphere(0.02, 8, 6), lambert(0xd8d0c8), x, 0.02, 0.05).scale.y = 0.4;
  const gapStuff = [[slipper, trunk, 0.08], [needles, caseA, 0.03], [paper, caseA, 0.06], [photo, caseB, 0.02]];
  return stated(group, (t, bulge, burst) => {
    const up = clamp01(bulge + burst);
    const gap = bulge * 0.035 + burst * (0.11 + Math.abs(Math.sin(t * 3)) * 0.02);
    for (const c of [trunk, caseA, caseB]) {
      const swell = 1 + bulge * (0.04 + Math.abs(Math.sin(t * 5 + c.h * 20)) * 0.02) + burst * 0.05;
      c.body.scale.set(swell, 1, swell);
      c.lid.position.y = c.h + 0.003 + gap * (c === trunk ? 1 : c === caseA ? 0.8 : 0.6) + burst * Math.abs(Math.sin(t * 6 + c.h * 30)) * 0.02;
      const room = c.lid.position.y - c.h - 0.003;
      c.inside.visible = room > 0.004;
      c.inside.scale.y = Math.max(0.001, room);
      c.inside.position.y = c.h + 0.0015 + room / 2;
    }
    gapStuff.forEach(([thing, c, tall]) => {
      const room = c.lid.position.y - c.h - 0.003;
      show(thing, Math.min(1, room / tall));
      thing.rotation.y = Math.sin(t * 2 + tall * 50) * 0.15 * up;
    });
    hatLid.position.set(burst * (0.3 + Math.sin(t * 3) * 0.06), hatH + 0.003 + bulge * Math.abs(Math.sin(t * 7)) * 0.02 + burst * (0.5 + Math.sin(t * 4) * 0.1), burst * 0.1);
    hatLid.rotation.set(burst * 0.6, burst * t * 3, burst * 0.9);
    hat.position.y = hatH - 0.1 + burst * (0.24 + Math.abs(Math.sin(t * 2.5)) * 0.08);
    hat.rotation.set(burst * 0.15, t * 0.5 * burst, burst * Math.sin(t * 2) * 0.15);
    all.position.x = bulge * jitter(t, 1) * 0.01 + burst * jitter(t, 2) * 0.02;
    all.rotation.z = up * Math.sin(t * 9) * 0.02;
  });
};

// ---- C46 a marching band in a box: an open cardboard box marked BAND, a red bass drum standing in it,
// a tuba's bell and a pair of cymbals showing over the rim, a faint oompah / the cymbals up and clapping,
// a trombone slide shooting in and out over the front, the box bouncing in time / full blast: the tuba
// up and swaying, drumsticks beating the drum, a baton twirling above, notes pouring out
const makeBand = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const red = lambert(0xc82a3a), hoop = lambert(0xf4ead8), brassMat = lambert(0xe0b04a), gold = glow(0xffd23f), wood = lambert(0xe8d8b0);
  const W = 0.64, H = 0.46, D = 0.5;
  const crateBox = openBox(all, W, H, D, CARD);
  part(crateBox, plane(0.3, 0.12), lettered('BAND', 0xffffff, 0xc82a3a, 192, 80), 0, 0.12, D / 2 + 0.016); // (under the folded-down flap)
  // the bass drum: standing on its rim inside the box, its red shell and white hoops showing over the top
  const drum = sub(crateBox, 0.02, 0.3, 0.04);
  part(drum, new THREE.CylinderGeometry(0.21, 0.21, 0.2, 24, 1, true), red, 0, 0, 0, FLAT);
  for (const z of [-0.1, 0.1]) part(drum, torus(0.21, 0.016, 24), hoop, 0, 0, z);
  part(drum, new THREE.CircleGeometry(0.2, 24), lambert(0xf8f4ea), 0, 0, 0.1005);
  part(drum, new THREE.CircleGeometry(0.2, 24), lambert(0xf8f4ea), 0, 0, -0.1005, 0, Math.PI);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; part(drum, box(0.02, 0.02, 0.2), lambert(0x8a8a96), Math.sin(a) * 0.215, Math.cos(a) * 0.215, 0); }
  // the tuba: a pipe up from the back left, its bell flaring open at the top, valves on the pipe
  const tuba = sub(crateBox, -0.17, 0.22, -0.08);
  part(tuba, cyl(0.035, 0.035, 0.34, 10), brassMat, 0, 0.17, 0);
  part(tuba, cyl(0.2, 0.04, 0.26, 18, 1, true), lambert(0xe0b04a, { side: THREE.DoubleSide }), 0, 0.47, 0);
  part(tuba, new THREE.CircleGeometry(0.035, 10), SHADE, 0, 0.345, 0, -FLAT);
  for (let k = 0; k < 3; k++) part(tuba, cyl(0.016, 0.016, 0.05, 8), lambert(0xf0e0a0), 0.045, 0.14 + k * 0.05, 0.02);
  part(tuba, torus(0.08, 0.02, 10, Math.PI), brassMat, 0.06, 0.1, -0.03, 0, FLAT, 0);
  // the cymbals: two gold discs at the right, face to face
  const cymbals = [-1, 1].map(d => { const c = sub(crateBox, 0.22 + d * 0.03, H - 0.04, 0.12); part(c, cyl(0.1, 0.1, 0.008, 18), gold, 0, 0, 0, 0, 0, FLAT); part(c, sphere(0.018, 8, 6), brassMat, d * 0.006, 0, 0); return { c, d }; });
  // the trombone: a bell and a slide, over the front rim, the slide shooting out
  // (its bell pipe lies above and behind the slide's two tubes, which run out beyond it and back)
  const trombone = sub(crateBox, -0.1, H + 0.02, 0.16);
  trombone.rotation.x = 0.55;
  part(trombone, cyl(0.018, 0.018, 0.26, 8), brassMat, 0, 0.12, -0.12);
  part(trombone, cone(0.1, 0.16, 14), brassMat, 0, 0.32, -0.12, Math.PI);
  part(trombone, cyl(0.016, 0.016, 0.12, 8), brassMat, 0, 0.0, -0.06, FLAT); // (the bend joining the two)
  const slide = sub(trombone);
  for (const x of [-0.04, 0.04]) part(slide, cyl(0.014, 0.014, 0.4, 8), brassMat, x, 0.2, 0);
  part(slide, torus(0.04, 0.014, 8, Math.PI), brassMat, 0, 0.4, 0);
  // full blast: the drumsticks over the drum, the baton in the air, the notes
  const sticks = [-1, 1].map(d => { const s = sub(crateBox, 0.02 + d * 0.12, H + 0.12, 0.28); part(s, cyl(0.008, 0.01, 0.3, 6), wood, 0, 0.0, 0); part(s, sphere(0.02, 8, 6), wood, 0, 0.15, 0); return { s, d }; });
  const baton = sub(all, 0.1, H + 0.7, -0.05);
  part(baton, cyl(0.008, 0.008, 0.4, 6), lambert(0xf4f4f4), 0, 0, 0, 0, 0, FLAT);
  for (const x of [-0.2, 0.2]) part(baton, sphere(0.025, 8, 6), gold, x, 0, 0);
  const noteMat = glow(0x2a2a36);
  const notes = Array.from({ length: 12 }, () => quaver(all, noteMat));
  return stated(group, (t, play, blast) => {
    const up = clamp01(play + blast), calm = clamp01(1 - up);
    const beat = Math.abs(Math.sin(t * (3 + play * 3 + blast * 3)));
    all.rotation.z = Math.sin(t * 2.4) * 0.01 * (1 + play * 3) + blast * jitter(t, 1) * 0.05;
    all.position.y = (play * 0.5 + blast) * beat * 0.05;
    drum.rotation.z = Math.sin(t * 2) * 0.03 * calm + beat * 0.08 * blast;
    tuba.position.y = 0.22 + Math.sin(t * 2.5) * 0.015 * (1 + play) + blast * 0.26;
    tuba.rotation.set(blast * Math.sin(t * 2.5) * 0.2, 0, -0.12 + blast * Math.sin(t * 2) * 0.25);
    cymbals.forEach(({ c, d }) => {
      const clap = Math.abs(Math.sin(t * (6 + blast * 3)));
      c.position.set(0.22 + d * (0.03 + (0.02 + clap * 0.1) * up), H - 0.04 + up * 0.18 + blast * Math.abs(Math.sin(t * 6)) * 0.06, 0.12);
      c.rotation.z = d * (0.1 + clap * 0.25 * up);
    });
    show(trombone, up);
    slide.position.y = Math.abs(Math.sin(t * (3 + blast * 3))) * (0.22 + blast * 0.08);
    trombone.rotation.x = 0.55 + Math.sin(t * 2) * 0.1 * up;
    sticks.forEach(({ s, d }) => { show(s, blast); s.rotation.set(-0.8 - Math.abs(Math.sin(t * 9 + d * 0.8)) * 0.7, 0, d * 0.4); });
    show(baton, blast);
    baton.rotation.set(0, Math.sin(t) * 0.4, t * 9);
    baton.position.y = H + 0.75 + Math.abs(Math.sin(t * 2)) * 0.15;
    cycle(notes, t, mix(0.25, 0.7, up), (n, u, k) => {
      const a = k * 2.2 + t * 0.3;
      n.position.set(Math.sin(a) * (0.15 + u * 0.4 * up), H + 0.15 + u * (0.4 + up * 0.7), Math.cos(a) * (0.15 + u * 0.4 * up));
      n.rotation.z = Math.sin(t * 3 + k) * 0.3;
      show(n, (k < 2 ? calm * 0.7 : 0) + play * (k < 6 ? 1 : 0) + blast * 1.1 - u * 0.5 * (1 - calm * 0.5));
    });
  });
};



// ---- C55 a thank-you casserole: an oval dish under a tea towel; the lid lifts on the steam and settles
const makeCasserole = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const enamel = lambert(0xd85a3a), rim = lambert(0xf0c0a0), towel = lambert(0xf2f0e8, { side: THREE.DoubleSide }), check = lambert(0x4a7ad0, { side: THREE.DoubleSide });
  const dish = sub(all);
  part(dish, cyl(0.26, 0.22, 0.2, 20), enamel, 0, 0.1, 0).scale.x = 1.35;
  part(dish, torus(0.26, 0.018, 24), rim, 0, 0.2, 0, FLAT).scale.set(1.35, 1, 1);
  for (const x of [-1, 1]) part(dish, torus(0.05, 0.015, 10, Math.PI), enamel, x * 0.37, 0.14, 0, 0, 0, x > 0 ? -FLAT : FLAT).rotation.x = FLAT;
  const lid = sub(all, 0, 0.2, 0);
  part(lid, new THREE.SphereGeometry(0.26, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), enamel).scale.set(1.35, 0.45, 1);
  part(lid, sphere(0.035, 10, 8), rim, 0, 0.13, 0);
  // the tea towel over it: a strip across the top, hanging down both sides, in a check
  const cloth = sub(lid, 0, 0.1, 0);
  part(cloth, plane(0.74, 0.26), towel, 0, 0.025, 0, -FLAT); // (across the top, the long way)
  for (const [x, z] of [[-0.25, -0.06], [-0.1, 0.06], [0.05, -0.06], [0.2, 0.06]]) part(cloth, plane(0.1, 0.08), check, x, 0.027, z, -FLAT);
  for (const d of [-1, 1]) { // (hanging down over each end, flaring a little at the hem)
    const side = sub(cloth, d * 0.37, 0.02, 0);
    side.rotation.set(0, d * FLAT, -d * 0.12);
    part(side, plane(0.26, 0.3), towel, 0, -0.15, 0);
    part(side, plane(0.2, 0.05), check, 0, -0.26, 0.002);
    part(side, plane(0.2, 0.03), check, 0, -0.08, 0.002);
  }
  const steam = [0, 1, 2, 3].map(() => part(all, sphere(0.05, 7, 5), haze(0xffffff, 0.45)));
  return idle(group, (t) => {
    const puff = Math.max(0, Math.sin(t * 1.1)); // (the steam builds, the lid lifts, it settles)
    lid.position.y = 0.2 + Math.pow(puff, 3) * 0.05;
    lid.rotation.z = Math.pow(puff, 3) * 0.06;
    cloth.children.forEach((c, k) => { if (k > 4) c.rotation.z = (k % 2 ? 1 : -1) * (0.12 + Math.sin(t * 2 + k) * 0.03); });
    cycle(steam, t, 0.5, (s, u, k) => {
      s.position.set((k % 2 ? 0.3 : -0.3) + Math.sin(t * 1.5 + k) * 0.03, 0.26 + u * 0.35, Math.cos(t + k) * 0.05);
      show(s, puff * (0.5 + u) * (1 - u));
      s.material.opacity = 0.45 * (1 - u);
    });
  });
};

// ---- C56 a box of kittens: an open cardboard box, its flaps folded down, three kittens looking out
// over the rim (heads up, ears, whiskers), one paw resting on the rim; a fourth bats at a string on a
// stick poked in the corner
const makeKittens = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const W = 0.56, H = 0.34, D = 0.42;
  const crateBox = openBox(all, W, H, D, CARD);
  part(crateBox, plane(0.2, 0.08), lettered('FREE', 0x3a2a20, 0xf4e8c8, 160, 64), 0.0, 0.08, D / 2 + 0.016, 0, 0, -0.08); // (under the folded-down flap)
  const furs = [lambert(0xf0a050), lambert(0x4a4a50), lambert(0xf4f0e8), lambert(0x8a6a4a)];
  // a kitten's head over the rim: two ears, eyes, a nose, whiskers, on a body that stands proud of the shade
  const kitten = (x, z, fur, k) => {
    const kit = sub(crateBox, x, H + 0.02, z);
    part(kit, sphere(0.085, 12, 10), fur, 0, 0, 0);
    part(kit, sphere(0.09, 10, 8), fur, 0, -0.1, -0.03).scale.set(1, 0.9, 1.1); // (its back, below)
    for (const d of [-1, 1]) { part(kit, cone(0.035, 0.07, 4), fur, d * 0.055, 0.085, 0, 0, 0.8, d * 0.3); part(kit, cone(0.018, 0.045, 4), lambert(0xffb0b0), d * 0.055, 0.082, 0.008, 0, 0.8, d * 0.3); }
    for (const d of [-1, 1]) { part(kit, sphere(0.018, 8, 6), glow(0x4fd0a0), d * 0.035, 0.015, 0.072); part(kit, sphere(0.008, 6, 5), glow(0x101010), d * 0.035, 0.015, 0.088).scale.set(0.5, 1.2, 1); }
    part(kit, sphere(0.012, 6, 5), lambert(0xff9aa8), 0, -0.02, 0.085);
    for (const d of [-1, 1]) for (let n = 0; n < 2; n++) part(kit, box(0.09, 0.003, 0.003), glow(0xffffff), d * 0.07, -0.02 - n * 0.012, 0.075, 0, 0, d * (0.1 + n * 0.25));
    kit.userData.k = k;
    return kit;
  };
  const kits = [kitten(-0.14, 0.02, furs[0], 0), kitten(0.08, -0.08, furs[1], 1), kitten(-0.02, 0.1, furs[2], 2)];
  // a paw resting on the front rim, from the first kitten
  const paw = sub(crateBox, -0.1, H + 0.03, D / 2 - 0.01);
  part(paw, sphere(0.035, 8, 6), furs[0]).scale.set(1.1, 0.7, 1.2);
  for (let n = 0; n < 3; n++) part(paw, sphere(0.01, 6, 5), lambert(0xffb0b0), -0.02 + n * 0.02, 0.0, 0.035);
  // the batter: a fourth kitten, mostly down in the box, one leg up over the front rim batting at the string
  const batterBody = part(crateBox, sphere(0.08, 10, 8), furs[3], 0.16, H - 0.03, D / 2 - 0.12);
  batterBody.scale.set(1, 0.8, 1.1);
  const batter = sub(crateBox, 0.18, H + 0.01, D / 2 - 0.05);
  part(batter, cyl(0.026, 0.028, 0.14, 8), furs[3], 0, 0.07, 0);
  part(batter, sphere(0.038, 8, 6), furs[3], 0, 0.15, 0.01).scale.set(1.2, 0.8, 1.2);
  for (let n = 0; n < 3; n++) part(batter, sphere(0.011, 6, 5), lambert(0xffb0b0), -0.024 + n * 0.024, 0.14, 0.048);
  // the string on a stick poked into the corner, its knot swinging as the paw bats it
  const stick = sub(crateBox, 0.24, H - 0.05, 0.16);
  stick.rotation.set(0.2, 0, -0.15);
  part(stick, cyl(0.008, 0.008, 0.46, 6), lambert(0x6a4a2a), 0, 0.23, 0);
  const string = sub(stick, 0, 0.45, 0);
  part(string, cyl(0.005, 0.005, 0.34, 5), lambert(0xe8d8a0), 0, -0.17, 0);
  part(string, sphere(0.028, 8, 6), lambert(0xd84a4a), 0, -0.36, 0);
  return idle(group, (t) => {
    kits.forEach((kit) => {
      const k = kit.userData.k, bob = Math.sin(t * (1.1 + k * 0.3) + k * 2);
      kit.position.y = H + 0.02 + Math.max(0, bob) * 0.05;
      kit.rotation.set(-0.15 + bob * 0.08, Math.sin(t * 0.7 + k) * 0.35, 0);
    });
    const bat = Math.pow(Math.max(0, Math.sin(t * 2.2)), 2);
    batter.rotation.set(0.6 + bat * 0.4, 0, -0.1 - bat * 0.3);
    batterBody.position.y = H - 0.03 + bat * 0.02;
    string.rotation.set(Math.sin(t * 2.2 - 0.4) * 0.35 - 0.2, 0, Math.sin(t * 1.3) * 0.15 + bat * 0.5);
    paw.rotation.x = -0.3 + Math.sin(t * 1.4) * 0.1;
  });
};

// ---- C57 a hand-knitted jumper: a red jumper on a wooden hanger on a rail, a white fair-isle band of
// diamonds across the chest, ribbed neck, cuffs and hem, one sleeve a little longer than the other (it
// was made by hand); a gift tag on the hook; a ball of wool beside it, still joined to the hem by a
// strand. It sways on the rail, the sleeves swing, the ball rolls
const makeJumper = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wool = lambert(0xd8503a), rib = lambert(0xb03a2a), cream = lambert(0xf8f2e0), wire = lambert(0xb8b8c8), wood = lambert(0x9a6a3a), woodDark = lambert(0x6a4524);
  // the rail: two uprights on feet, the bar across the top
  for (const x of [-0.5, 0.5]) part(all, box(0.2, 0.03, 0.2), woodDark, x, 0.015, 0);
  for (const x of [-0.5, 0.5]) part(all, cyl(0.014, 0.014, 1.0, 8), woodDark, x, 0.53, 0);
  part(all, cyl(0.016, 0.016, 1.04, 8), woodDark, 0, 1.02, 0, 0, 0, FLAT);
  // the hanger: a wire hook over the bar, a wooden shoulder bar; the tag on the hook
  const hanger = sub(all, 0, 1.02, 0);
  part(hanger, torus(0.035, 0.005, 10, Math.PI * 1.3), wire, 0, 0.0, 0, 0, 0, 0.9);
  part(hanger, cyl(0.005, 0.005, 0.1, 6), wire, 0, -0.07, 0);
  const tag = sub(hanger, 0.05, -0.08, 0.02);
  tag.rotation.z = -0.3;
  part(tag, cyl(0.003, 0.003, 0.06, 5), wire, 0, 0.03, 0);
  part(tag, plane(0.07, 0.045), lettered('FOR YOU', 0x3a2a20, 0xfff1b8, 160, 64), 0, -0.02, 0);
  const body = sub(hanger, 0, -0.12, 0);
  part(body, box(0.44, 0.02, 0.03), wood, 0, 0, 0);
  // the jumper: the body hanging from the shoulder bar, the band across the chest, the ribbed hem and
  // neck, and the two sleeves hanging from the shoulders
  const jumper = sub(body, 0, 0.02, 0); // (the shoulder bar is inside the shoulders; the hook comes out of the neck)
  part(jumper, box(0.42, 0.46, 0.13), wool, 0, -0.23, 0);
  part(jumper, box(0.424, 0.08, 0.134), cream, 0, -0.17, 0); // (the fair-isle band, its diamonds front and back)
  for (let k = 0; k < 5; k++) for (const z of [0.0672, -0.0672]) part(jumper, new THREE.OctahedronGeometry(0.03), wool, -0.14 + k * 0.07, -0.17, z).scale.set(1, 1, 0.1);
  for (let k = 0; k < 2; k++) part(jumper, box(0.424, 0.012, 0.134), rib, 0, -0.115 - k * 0.11, 0); // (the band's edging)
  const hem = part(jumper, box(0.43, 0.06, 0.136), rib, 0, -0.49, 0);
  for (let k = 0; k < 14; k++) part(hem, box(0.008, 0.06, 0.004), wool, -0.195 + k * 0.03, 0, 0.069); // (the ribbing's ridges, front)
  for (let k = 0; k < 14; k++) part(hem, box(0.008, 0.06, 0.004), wool, -0.195 + k * 0.03, 0, -0.069);
  part(jumper, torus(0.09, 0.022, 14), rib, 0, 0.0, 0); // (the ribbed crew neck: an arc over the shoulders)
  const sleeve = (d, len) => {
    const s = sub(jumper, d * 0.2, -0.02, 0);
    s.rotation.z = d * 0.5;
    part(s, cyl(0.065, 0.058, len, 10), wool, 0, -len / 2, 0);
    part(s, cyl(0.062, 0.062, 0.05, 10), rib, 0, -len - 0.01, 0);
    for (let k = 0; k < 8; k++) { const a = k * 0.785; part(s, box(0.006, 0.05, 0.004), wool, Math.sin(a) * 0.063, -len - 0.01, Math.cos(a) * 0.063, 0, a, 0); }
    return s;
  };
  const sleeves = [sleeve(-1, 0.4), sleeve(1, 0.46)];
  // the ball of wool, rolling, joined to the hem's corner by a strand
  const ball = sub(all, 0.1, 0.07, 0.25);
  part(ball, sphere(0.07, 12, 10), wool);
  for (let k = 0; k < 4; k++) part(ball, torus(0.07, 0.006, 16), lambert(0xe8604a), 0, 0, 0, k * 0.8, k * 0.5, 0);
  const strand = part(all, cyl(0.004, 0.004, 1, 5).translate(0, 0.5, 0), lambert(0xe8604a));
  const from = new THREE.Vector3(), to = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const hemCorner = new THREE.Vector3(-0.2, -0.5, 0.05);
  return idle(group, (t) => {
    hanger.rotation.y = Math.sin(t * 0.6) * 0.15;
    body.rotation.z = Math.sin(t * 1.1) * 0.03;
    sleeves.forEach((s, k) => { s.rotation.z = (k ? 1 : -1) * 0.5 + Math.sin(t * 1.4 + k * 1.5) * 0.06; s.rotation.x = Math.sin(t * 0.9 + k) * 0.08; });
    const roll = Math.sin(t * 0.9) * 0.2;
    ball.position.x = 0.1 + roll;
    ball.rotation.z = -roll / 0.07;
    // the strand runs from the hem's corner to the ball
    all.updateMatrixWorld(true);
    jumper.localToWorld(from.copy(hemCorner));
    ball.getWorldPosition(to);
    all.worldToLocal(from);
    all.worldToLocal(to);
    dir.subVectors(to, from);
    strand.position.copy(from);
    strand.scale.y = Math.max(0.01, dir.length());
    strand.quaternion.setFromUnitVectors(up, dir.normalize());
  });
};

// ---- C58 returned library books: a strapped stack of hardbacks, late, the cream of the pages showing on
// three sides of each, a date-due slip poking out; the top one's cover lifts in the breeze and its pages
// riffle, a bookmark ribbon waving from under them
const makeBooks = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const colours = [0x2a4a8a, 0x8a2a2a, 0x2a6a3a, 0x7a5a2a, 0x5a2a7a], pages = lambert(0xf4ead8), strap = lambert(0x3a2a20), gilt = onFace(lambert(0xd4a94a));
  // a hardback: two boards and a spine round a block of pages, the block showing at the fore-edge and both ends
  const hardback = (parent, w, h, d, colour, k) => {
    const b = sub(parent);
    const cover = lambert(colour), board = 0.008;
    part(b, box(w, board, d), cover, 0, board / 2, 0);
    part(b, box(w, board, d), cover, 0, h - board / 2, 0);
    part(b, box(0.012, h, d), cover, -w / 2 + 0.006, h / 2, 0);
    part(b, box(w - 0.03, h - board * 2 - 0.004, d - 0.016), pages, 0.003, h / 2, 0);
    part(b, box(0.16, 0.003, 0.03), gilt, -0.1 + (k % 2) * 0.05, h + 0.002, 0.03 - (k % 3) * 0.03); // (the title, on the top board)
    part(b, box(0.006, h * 0.5, 0.008), gilt, -w / 2 - 0.0005, h / 2, 0); // (a stripe on the spine)
    return b;
  };
  const sizes = [[0.46, 0.07, 0.34], [0.42, 0.06, 0.3], [0.44, 0.05, 0.32], [0.4, 0.06, 0.3]];
  let y = 0;
  sizes.forEach(([w, h, d], k) => {
    const b = hardback(all, w, h, d, colours[k], k);
    b.position.set((k % 2 ? 0.02 : -0.02), y, 0);
    b.rotation.y = (k % 2 ? -0.08 : 0.06);
    y += h;
  });
  // the date-due slip, poking out of the second book's fore-edge
  part(all, box(0.08, 0.002, 0.05), onFace(glow(0xfff1b8)), 0.26, 0.1, 0.04, 0, 0.2, 0);
  // the strap round the stack, a buckle on top; the top book sits on the strap
  const Y = y + 0.006;
  for (const z of [-1, 1]) part(all, box(0.06, Y, 0.006), strap, 0, Y / 2, z * 0.176);
  part(all, box(0.06, 0.006, 0.364), strap, 0, Y + 0.003, 0);
  part(all, box(0.07, 0.03, 0.03), lambert(0xd4a94a), 0, Y + 0.02, 0.1);
  // the top book: its block of pages on the stack, the cover hinged at the spine, the top sheets hinged too
  const top = sub(all, 0.04, Y + 0.006, 0.01);
  const [tw, th, td] = [0.42, 0.06, 0.3];
  part(top, box(tw, 0.008, td), lambert(colours[4]), 0, 0.004, 0);
  part(top, box(0.012, th, td), lambert(colours[4]), -tw / 2 + 0.006, th / 2, 0);
  part(top, box(tw - 0.03, 0.03, td - 0.016), pages, 0.003, 0.023, 0); // (the block: 0.008 to 0.038)
  const leaves = Array.from({ length: 4 }, (_, k) => { // (the top sheets, hinged at the spine: 0.04 to 0.053)
    const leaf = sub(top, -tw / 2 + 0.012, 0.04 + k * 0.004, 0);
    part(leaf, box(tw - 0.03, 0.002, td - 0.016), pages, (tw - 0.03) / 2, 0, 0);
    return leaf;
  });
  const cover = sub(top, -tw / 2 + 0.006, 0.058, 0);
  part(cover, box(tw, 0.008, td), lambert(colours[4]), tw / 2 - 0.006, 0, 0);
  part(cover, box(0.2, 0.003, 0.06), gilt, tw / 2, 0.006, 0);
  part(cover, plane(0.14, 0.05), lettered('OVERDUE', 0xffffff, 0xd81e2a, 192, 64), tw / 2 + 0.05, 0.0045, 0.09, -FLAT);
  const ribbon = sub(top, 0.1, 0.039, -td / 2 + 0.008);
  part(ribbon, box(0.03, 0.0015, 0.16), lambert(0xd81e2a), 0, 0, -0.08);
  return idle(group, (t) => {
    const breeze = Math.sin(t * 0.8);
    cover.rotation.z = 0.1 + Math.max(0, breeze) * 0.5;
    leaves.forEach((leaf, k) => { leaf.rotation.z = Math.max(0, Math.sin(t * 2.3 + k * 0.7)) * (0.05 + k * 0.03) * Math.max(0, breeze + 0.3); });
    ribbon.rotation.set(0.2 + Math.sin(t * 2.5) * 0.3, Math.sin(t * 1.7) * 0.25, 0);
    all.rotation.y = Math.sin(t * 0.4) * 0.05;
  });
};

// ---- C59 the new neighbour's fruit basket: an open wicker basket, fruit heaped up over its rim, a
// handle arching over with a bow and a WELCOME tag; the fruit shuffles, and the pineapple's crown sways
const makeFruit = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wicker = lambert(0xc49a5a, { side: THREE.DoubleSide }), wickerDark = lambert(0x9a7238);
  // the basket: an open lathe (no top), the black shade of its inside just under the rim
  part(all, new THREE.LatheGeometry([[0.02, 0], [0.22, 0], [0.26, 0.06], [0.3, 0.2], [0.31, 0.28]].map(([r, y]) => new THREE.Vector2(r, y)), 20), wicker);
  part(all, new THREE.CircleGeometry(0.3, 20), SHADE, 0, 0.266, 0, -FLAT);
  for (let k = 0; k < 4; k++) part(all, torus(0.23 + k * 0.022, 0.012, 20), wickerDark, 0, 0.04 + k * 0.06, 0, FLAT);
  part(all, torus(0.31, 0.022, 20), wickerDark, 0, 0.28, 0, FLAT);
  part(all, torus(0.3, 0.02, 24, Math.PI), wickerDark, 0, 0.28, 0); // (the handle, over the top)
  // the bow and the tag on the handle
  const bow = sub(all, 0, 0.58, 0);
  for (const d of [-1, 1]) part(bow, torus(0.04, 0.014, 10), lambert(0xd83a4a), d * 0.045, 0.02, 0, 0, 0, d * 0.4).scale.set(1.2, 1, 0.5);
  part(bow, sphere(0.022, 8, 6), lambert(0xd83a4a), 0, 0.02, 0);
  const tag = sub(all, -0.2, 0.48, 0.04);
  part(tag, cyl(0.003, 0.003, 0.08, 5), lambert(0xd8d8e0), 0, 0.04, 0);
  part(tag, plane(0.12, 0.06), lettered('WELCOME!', 0x3a2a20, 0xfff1b8, 192, 72), 0, -0.03, 0);
  // the fruit, heaped: every piece stands proud of the shade
  const fruit = [];
  const add = (mesh, k) => { mesh.userData.k = k; mesh.userData.at = mesh.position.clone(); fruit.push(mesh); return mesh; };
  add(part(all, sphere(0.075, 12, 10), lambert(0xd83a2a), -0.16, 0.3, 0.1), 0); // apples
  add(part(all, sphere(0.07, 12, 10), lambert(0x8ac83a), 0.13, 0.29, 0.14), 1);
  add(part(all, sphere(0.08, 12, 10), lambert(0xff8a2a), 0.17, 0.3, -0.1), 2); // an orange
  add(part(all, sphere(0.06, 12, 10), lambert(0xffd23f), -0.02, 0.28, 0.21), 3); // a lemon
  fruit[3].scale.set(1.3, 0.9, 0.9);
  const bunch = sub(all, -0.17, 0.3, -0.12); // (grapes)
  for (let k = 0; k < 9; k++) part(bunch, sphere(0.03, 8, 6), lambert(0x6a3a8a), Math.sin(k * 2.4) * 0.05, (k % 3) * 0.04 - 0.02, Math.cos(k * 2.4) * 0.05);
  add(bunch, 4);
  const bananas = sub(all, 0.1, 0.43, 0.06);
  for (let k = 0; k < 3; k++) part(bananas, torus(0.09, 0.02, 10, 2), lambert(0xf4d35e), k * 0.035, 0, k * 0.02, 0, 0.3, 0.5);
  add(bananas, 5);
  const pineapple = sub(all, -0.03, 0.3, 0.0);
  part(pineapple, sphere(0.1, 12, 10), lambert(0xc8a040), 0, 0.1, 0).scale.set(1, 1.5, 1);
  for (let k = 0; k < 10; k++) part(pineapple, sphere(0.02, 5, 4), lambert(0x8a6a20), Math.sin(k * 2.4) * 0.09, 0.02 + (k % 5) * 0.045, Math.cos(k * 2.4) * 0.09);
  const crown = sub(pineapple, 0, 0.25, 0);
  const leaves = Array.from({ length: 9 }, (_, k) => { const a = k * 0.7; const l = part(crown, cone(0.022, 0.2, 4), lambert(0x3f9b4b), Math.sin(a) * 0.03, 0.08, Math.cos(a) * 0.03, Math.cos(a) * (0.3 + (k % 3) * 0.2), 0, -Math.sin(a) * (0.3 + (k % 3) * 0.2)); l.userData.a = a; return l; });
  return idle(group, (t) => {
    fruit.forEach((f) => { // (a shuffle: each settles, now and then)
      const k = f.userData.k, u = ((t * 0.5 + k / 8) % 1), hop = Math.pow(Math.max(0, Math.sin(u * Math.PI * 2)), 4);
      f.position.set(f.userData.at.x + Math.sin(k) * hop * 0.02, f.userData.at.y + hop * 0.03, f.userData.at.z);
      f.rotation.y = Math.sin(t * 0.7 + k) * 0.3;
    });
    crown.rotation.set(Math.sin(t * 1.3) * 0.15, 0, Math.cos(t * 1.1) * 0.15);
    leaves.forEach((l, k) => { l.rotation.z = -Math.sin(l.userData.a) * (0.3 + (k % 3) * 0.2) + Math.sin(t * 2 + k) * 0.05; });
    pineapple.rotation.y = Math.sin(t * 0.5) * 0.1;
    tag.rotation.y = Math.sin(t * 1.1) * 0.3;
    bow.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
  });
};

// ---- C60 grandad's repaired radio: a wooden wireless; the dial glows, the needle sweeps along it and a
// note floats off the grille
const makeRadio = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const wood = lambert(0x7a4a22), woodDark = lambert(0x5a3416), cloth = lambert(0xd8c8a0), brass = lambert(0xd4a94a);
  const body = sub(all);
  part(body, box(0.6, 0.44, 0.3), wood, 0, 0.26, 0);
  part(body, cyl(0.3, 0.3, 0.6, 20, 1, false, 0, Math.PI), wood, 0, 0.26, 0, 0, 0, FLAT).scale.set(0.6, 1, 0.48); // (its rounded top)
  for (const x of [-0.24, 0.24]) part(body, cyl(0.025, 0.025, 0.03, 10), woodDark, x, 0.015, 0.1);
  // the grille, with its ribs, and the dial window with its glow and the needle
  part(body, box(0.26, 0.22, 0.02), cloth, -0.12, 0.26, 0.15);
  for (let k = 0; k < 5; k++) part(body, box(0.02, 0.24, 0.025), woodDark, -0.22 + k * 0.05, 0.26, 0.152);
  const dialMat = glow(0xffd98a);
  part(body, box(0.2, 0.12, 0.01), dialMat, 0.15, 0.3, 0.152); // (the dial's glass)
  for (let k = 0; k < 7; k++) part(body, box(0.004, 0.03, 0.002), glow(0x6a4a10), 0.07 + k * 0.027, 0.33, 0.158);
  const needle = part(body, box(0.006, 0.11, 0.004), glow(0xd81e2a), 0.15, 0.3, 0.159);
  for (const x of [0.1, 0.2]) part(body, cyl(0.03, 0.03, 0.025, 12), brass, x, 0.15, 0.16, FLAT);
  part(body, box(0.5, 0.02, 0.012), woodDark, 0, 0.09, 0.155);
  const aerial = part(body, cyl(0.006, 0.006, 0.5, 6), lambert(0xb8b8c8), 0.22, 0.6, -0.08, 0, 0, -0.35);
  const noteMat = glow(0x3a3a48);
  const notes = Array.from({ length: 4 }, () => {
    const n = sub(all);
    part(n, sphere(0.024, 7, 5), noteMat).scale.set(1.2, 0.8, 1);
    part(n, box(0.01, 0.09, 0.01), noteMat, 0.025, 0.04, 0);
    part(n, box(0.04, 0.01, 0.01), noteMat, 0.04, 0.085, 0, 0, 0, -0.5);
    return n;
  });
  return idle(group, (t) => {
    const sweep = (Math.sin(t * 0.45) + 1) / 2;
    needle.position.x = 0.07 + sweep * 0.16;
    dialMat.color.setHex(0xffd98a).multiplyScalar(0.85 + Math.sin(t * 3) * 0.08 + Math.sin(t * 11) * 0.04);
    body.rotation.z = Math.sin(t * 1.6) * 0.006; // (humming along)
    aerial.rotation.z = -0.35 + Math.sin(t * 1.1) * 0.03;
    cycle(notes, t, 0.35, (n, u, k) => {
      n.position.set(-0.12 + Math.sin(t * 1.5 + k * 2) * 0.05, 0.36 + u * 0.5, 0.18 + u * 0.15);
      n.rotation.z = Math.sin(t * 2 + k) * 0.25;
      show(n, Math.min(1, u * 4) * (1 - u));
    });
  });
};

// these models, by their ids in cargo.js
export const MORE_MODELS = {
  lawyers: makeLawyers, chainletter: makeChainletter, glitter: makeGlitter, recorders: makeRecorders, subpoena: makeSubpoena,
  telemarketers: makeTelemarketers, taxmen: makeTaxmen, wardens: makeWardens, consultants: makeConsultants,
  inlaws: makeInlaws, band: makeBand, casserole: makeCasserole,
  kittens: makeKittens, jumper: makeJumper, books: makeBooks, fruit: makeFruit, radio: makeRadio,
};
