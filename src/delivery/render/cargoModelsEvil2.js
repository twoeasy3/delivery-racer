// ---- twenty more Evil cargo models ---------------------------------------------------------------
// As cargoModels.js's five (which spreads these into CARGO_MODELS): each a group standing on y = 0,
// facing +z, about a metre tall when calm, with userData.animate(t) and userData.setState(0 | 1 | 2).
// Plain three.js: nothing here touches the game. The ids are those of cargo.js.
// Each is built to be told apart at thumbnail size in each state: its outline changes and so does its
// colour (the egg hatches, the cooker goes red, the goose leaves its crate).
import * as THREE from 'three';

const TRANSITION = 0.5; // s from one state to the next: as cargoModels.js's

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const haze = (color, opacity = 0.5) => glow(color, { transparent: true, opacity, depthWrite: false });
const glassy = (color, opacity = 0.25) => new THREE.MeshPhongMaterial({ color, transparent: true, opacity, shininess: 120, depthWrite: false });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const dome = (r, w = 14, h = 6) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const tube = (r, h, n = 18) => new THREE.CylinderGeometry(r, r, h, n, 1, true);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, n = 20) => new THREE.TorusGeometry(r, t, 6, n);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 8);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
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
// a material's colour, somewhere between two; and through three, by the two weights of a state
const shade = new THREE.Color();
const tint = (material, from, to, k) => material.color.setHex(from).lerp(shade.setHex(to), clamp01(k));
const tint3 = (material, calm, agitated, furious, a, f) => { tint(material, calm, agitated, a + f); material.color.lerp(shade.setHex(furious), clamp01(f)); };
// a shake that never repeats in step: -1 .. 1
const jitter = (t, k = 0) => Math.sin(t * 37.1 + k * 5.3) * Math.sin(t * 23.3 + k * 2.1);
// a chain of joints, each `step` up the last: a stem, a neck, a snake
const chain = (parent, n, step, make) => {
  const joints = [];
  let p = parent;
  for (let j = 0; j < n; j++) { const joint = sub(p, 0, j ? step : 0, 0); make(joint, j); joints.push(joint); p = joint; }
  return joints;
};
// a zigzag hanging down from where it starts: a bolt of lightning, a crack
const zigzag = (parent, material, n, len, w = 0.022) => {
  const g = sub(parent);
  let x = 0, y = 0;
  for (let k = 0; k < n; k++) {
    const s = k % 2 ? -1 : 1, dx = s * Math.sin(0.6) * len, dy = -Math.cos(0.6) * len;
    part(g, box(w, len * 1.1, w), material, x + dx / 2, y + dy / 2, 0, 0, 0, s * 0.6);
    x += dx; y += dy;
  }
  return g;
};
// things that go round and round a cycle (puffs of steam, sparks, drops): fn(mesh, 0 .. 1, k)
const cycle = (list, t, rate, fn) => list.forEach((m, k) => fn(m, (((t * rate + k / list.length) % 1) + 1) % 1, k));
// a leathery wing, flat, out along +x from its root
const WING = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.03); s.lineTo(0.3, 0.1); s.lineTo(0.24, -0.02); s.lineTo(0.17, -0.01); s.lineTo(0.13, -0.09); s.lineTo(0.07, -0.03); s.lineTo(0, -0.1);
  return new THREE.ShapeGeometry(s);
})();
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

// an egg in a nest: a big speckled egg, rocking / cracked round the middle, the top lifting on a
// yellow eye / hatched: a furious little dragon flapping in the shell, breathing fire
const makeEgg = () => {
  const group = new THREE.Group();
  const shell = lambert(0xf2ead8, { side: THREE.DoubleSide }), speck = lambert(0x8a6a4c), straw = lambert(0xc9a24a), strawDark = lambert(0x9a7430);
  const hide = lambert(0x4fae3a), belly = lambert(0xd8e27a), wingMat = lambert(0x2f8a2a, { side: THREE.DoubleSide });
  part(group, cyl(0.42, 0.34, 0.1, 16), strawDark, 0, 0.05, 0);
  part(group, torus(0.4, 0.11, 18), straw, 0, 0.12, 0, FLAT);
  for (let k = 0; k < 12; k++) { // (twigs sticking out of it)
    const a = k * 2.4;
    part(group, box(0.34, 0.025, 0.025), k % 2 ? straw : strawDark, Math.sin(a) * 0.43, 0.1 + (k % 3) * 0.05, Math.cos(a) * 0.43, 0, a + 0.6, (k % 2 ? 1 : -1) * 0.35);
  }
  const all = sub(group, 0, 0.14, 0);
  const lower = sub(all, 0, 0.36, 0), upper = sub(all, 0, 0.36, 0);
  part(lower, new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), shell).scale.y = 1.3;
  part(upper, new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), shell).scale.y = 1.3;
  for (let k = 0; k < 16; k++) { // (its speckles)
    const th = 0.35 + (k * 0.618 % 1) * 2.3, ph = k * 2.4, half = th < Math.PI * 0.45 ? upper : lower;
    part(half, sphere(0.03 + (k % 3) * 0.012, 6, 5), speck, Math.sin(th) * Math.cos(ph) * 0.295, Math.cos(th) * 0.385, Math.sin(th) * Math.sin(ph) * 0.295).scale.setScalar(1);
  }
  const dark = part(lower, sphere(0.27, 12, 8), glow(0x1a120a), 0, -0.02, 0);
  const crack = sub(lower, 0, 0.06, 0);
  part(crack, torus(0.298, 0.014, 18), glow(0x1a120a), 0, 0, 0, FLAT);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; part(crack, cone(0.07, 0.13, 4), shell, Math.sin(a) * 0.275, 0.05, Math.cos(a) * 0.275, 0, a); }
  const eye = sub(lower, 0, 0.13, 0.2);
  part(eye, sphere(0.085, 10, 8), glow(0xffd23f));
  part(eye, sphere(0.04, 8, 6), glow(0x0a0a0a), 0, 0, 0.06).scale.set(0.5, 1.3, 1);
  // the dragon
  const dragon = sub(all, 0, 0.36, 0);
  part(dragon, sphere(0.2, 12, 10), hide, 0, 0.08, 0).scale.y = 1.15;
  part(dragon, sphere(0.15, 10, 8), belly, 0, 0.07, 0.09);
  part(dragon, cyl(0.07, 0.09, 0.24, 8), hide, 0, 0.32, 0.04, 0.25);
  for (let k = 0; k < 3; k++) part(dragon, cone(0.035, 0.1, 4), belly, 0, 0.22 + k * 0.1, -0.12 + k * 0.03, -0.6);
  const head = sub(dragon, 0, 0.5, 0.1);
  part(head, sphere(0.14, 12, 10), hide).scale.z = 1.15;
  part(head, sphere(0.09, 10, 8), hide, 0, -0.03, 0.15).scale.set(1.1, 0.8, 1.3);
  for (const x of [-0.08, 0.08]) {
    part(head, sphere(0.05, 8, 6), glow(0xff2010), x, 0.06, 0.09);
    part(head, box(0.09, 0.025, 0.03), glow(0x14300f), x, 0.115, 0.11, 0, 0, x * 5);
    part(head, cone(0.03, 0.13, 5), belly, x * 0.9, 0.16, -0.05, -0.3);
  }
  const jaw = sub(head, 0, -0.08, 0.06);
  part(jaw, box(0.13, 0.03, 0.18), hide, 0, 0, 0.09);
  const flame = sub(head, 0, -0.05, 0.26);
  // (a cone's tip is +y: turned -FLAT it points back into the mouth, so the flame is narrow there and widens going out)
  part(flame, cone(0.09, 0.4, 7), glow(0xff7a1a), 0, 0, 0.2, -FLAT);
  part(flame, cone(0.05, 0.26, 6), glow(0xfff2a0), 0, 0, 0.14, -FLAT);
  const wings = [1, -1].map(d => {
    const root = sub(dragon, d * 0.13, 0.22, -0.06);
    root.rotation.y = d > 0 ? 0 : Math.PI;
    const wing = part(root, WING, wingMat);
    wing.scale.setScalar(1.7);
    return wing;
  });
  return stated(group, (t, crk, out) => {
    const calm = clamp01(1 - crk - out), open = clamp01(crk + out);
    all.rotation.z = calm * Math.sin(t * 1.6) * 0.08 + crk * Math.sin(t * 9) * 0.05 + out * Math.sin(t * 11) * 0.05;
    all.position.x = crk * jitter(t, 1) * 0.012;
    // the top of the shell: on / lifted at the front / thrown off, lying against the nest
    upper.position.set(out * 0.47, 0.36 + crk * (0.07 + Math.abs(Math.sin(t * 5)) * 0.03) - out * (0.33 - Math.abs(Math.sin(t * 7)) * 0.04), out * 0.12);
    upper.rotation.set(-crk * 0.32, 0, -out * 2.1);
    show(crack, open);
    dark.scale.set(1, 1.2 - out * 0.7, 1);
    show(eye, crk);
    eye.position.x = Math.sin(t * 1.4) * 0.07;
    show(dragon, out);
    dragon.position.y = 0.36 + out * Math.abs(Math.sin(t * 8)) * 0.07;
    dragon.rotation.y = out * Math.sin(t * 3.1) * 0.5;
    head.rotation.set(-0.15 + Math.sin(t * 6) * 0.12, Math.sin(t * 4.3) * 0.3, 0);
    jaw.rotation.x = 0.35 + Math.abs(Math.sin(t * 9)) * 0.3;
    flame.scale.set(1 + jitter(t, 3) * 0.2, 1 + jitter(t, 4) * 0.2, 0.75 + Math.abs(Math.sin(t * 13)) * 0.5);
    wings.forEach((wing) => { wing.rotation.z = 0.35 + Math.sin(t * 16) * 0.6; });
  });
};

// a pressure cooker: steel, hissing a wisp of steam / the lid rattling, the valve whistling, jets
// of steam out of both sides / red hot and swollen, the lid bouncing on a column of steam
const makeCooker = () => {
  const group = new THREE.Group();
  const steel = lambert(0xb8bec8), lidMat = lambert(0xd3d8e0), dark = lambert(0x22252b);
  const all = sub(group);
  const pot = sub(all);
  part(pot, cyl(0.38, 0.36, 0.44, 20), steel, 0, 0.22, 0);
  part(pot, cyl(0.385, 0.385, 0.05, 20), lambert(0x7d838d), 0, 0.09, 0);
  part(pot, torus(0.38, 0.028), lidMat, 0, 0.44, 0, FLAT);
  for (const d of [-1, 1]) part(pot, box(0.16, 0.05, 0.11), dark, d * 0.45, 0.37, 0);
  const lid = sub(all, 0, 0.45, 0);
  part(lid, dome(0.37, 20), lidMat).scale.y = 0.38;
  part(lid, box(0.36, 0.05, 0.09), dark, 0.5, 0.05, 0);
  part(lid, cyl(0.08, 0.08, 0.03, 12), glow(0xfdf4dc), -0.17, 0.11, 0.17, 0.5, 0, 0.35);
  const needle = sub(lid, -0.175, 0.13, 0.175);
  needle.rotation.set(0.5, 0, 0.35);
  const hand = sub(needle);
  part(hand, box(0.014, 0.008, 0.07), glow(0xd8262b), 0, 0, -0.03);
  const valve = sub(lid, 0, 0.13, 0);
  part(valve, cyl(0.05, 0.065, 0.1, 10), dark, 0, 0.05, 0);
  part(valve, sphere(0.05, 8, 6), lambert(0xd8262b), 0, 0.13, 0);
  const steam = [0, 1, 2, 3, 4, 5].map(() => part(all, sphere(0.09, 7, 5), haze(0xffffff, 0.6)));
  const jets = [-1, 1].map(d => {
    const jet = sub(all, d * 0.38, 0.46, 0);
    part(jet, cone(0.11, 0.5, 8), haze(0xffffff, 0.75), d * 0.25, 0, 0, 0, 0, d * FLAT);
    part(jet, sphere(0.12, 7, 5), haze(0xffffff, 0.5), d * 0.52, 0.03, 0);
    return jet;
  });
  const skirt = part(all, torus(0.4, 0.07), haze(0xffffff, 0.6), 0, 0.5, 0, FLAT);
  return stated(group, (t, hot, rage) => {
    const calm = clamp01(1 - hot - rage), up = clamp01(hot + rage), beat = Math.abs(Math.sin(t * 12));
    tint(steel, 0xb8bec8, 0xff3a14, rage * (0.7 + beat * 0.3));
    steel.emissive.setHex(0xff2a00).multiplyScalar(rage * (0.35 + beat * 0.35));
    tint(lidMat, 0xd3d8e0, 0xff7a3a, rage * 0.8);
    pot.scale.set(1 + rage * (0.14 + beat * 0.06), 1 + rage * 0.04, 1 + rage * (0.14 + beat * 0.06));
    const lift = hot * Math.abs(Math.sin(t * 19)) * 0.035 + rage * (0.2 + Math.abs(Math.sin(t * 9)) * 0.32);
    lid.position.set(rage * jitter(t, 5) * 0.05, 0.45 + lift, 0);
    lid.rotation.set(hot * jitter(t, 2) * 0.07 + rage * Math.sin(t * 11) * 0.3, 0, hot * jitter(t, 1) * 0.09 + rage * Math.sin(t * 13) * 0.35);
    hand.rotation.y = 2.2 - hot * 2 - rage * (3.6 + jitter(t, 6) * 0.4);
    valve.rotation.y = t * (2 + up * 30);
    valve.position.y = 0.13 + up * Math.abs(Math.sin(t * 25)) * 0.03;
    // the steam: a wisp / puffs / a column
    cycle(steam, t, mix(mix(0.35, 0.9, hot), 1.5, rage), (s, u, k) => {
      s.position.set(Math.sin(t * 2 + k * 2) * 0.05 * (1 + u * 2 + rage * 2), 0.74 + lift * calm + u * (0.3 + hot * 0.3 + rage * 0.75), Math.cos(t * 1.7 + k) * 0.04);
      show(s, (0.35 + u * 0.7) * (calm * 0.55 + hot * 1.1 + rage * 1.9) * (k < 2 || up > 0.3 ? 1 : calm));
      s.material.opacity = 0.6 * (1 - u);
    });
    jets.forEach((jet, k) => { jet.scale.set(Math.max(0.001, hot * (0.7 + Math.abs(Math.sin(t * 21 + k * 2)) * 0.5) + rage * 0.9), Math.max(0.001, up * (0.8 + jitter(t, k) * 0.2)), Math.max(0.001, up)); });
    show(skirt, rage * (0.95 + beat * 0.2));
    skirt.position.y = 0.48 + lift * 0.4;
    all.position.set(hot * jitter(t, 1) * 0.012 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 10)) * 0.07, 0);
    all.rotation.z = hot * Math.sin(t * 15) * 0.02 + rage * Math.sin(t * 12) * 0.07;
  });
};

// a Venus flytrap in a pot: jaws shut, swaying / jaws wide and pink, looking about, drooling /
// gone crimson, the stem stretched, two more heads up, all three snapping in every direction
const makeFlytrap = () => {
  const group = new THREE.Group();
  const pot = lambert(0x5b4a94), green = lambert(0x3f9b4b), lip = lambert(0x58b83a), mouth = lambert(0xff5f8a), tooth = lambert(0xfffaf0);
  const all = sub(group);
  part(all, cyl(0.3, 0.22, 0.3, 16), pot, 0, 0.15, 0);
  part(all, cyl(0.335, 0.335, 0.08, 16), pot, 0, 0.31, 0);
  part(all, cyl(0.3, 0.3, 0.02, 16), lambert(0x4a3525), 0, 0.355, 0);
  for (let k = 0; k < 5; k++) { const a = k * 1.26 + 0.4; part(all, sphere(0.15, 8, 6), green, Math.sin(a) * 0.26, 0.38, Math.cos(a) * 0.26, 0, -a, 0).scale.set(0.5, 0.15, 1.1); }
  // a head on a stem: two domed jaws hinged at the back, teeth round their rims
  const trap = (x, z, n, size) => {
    const root = sub(all, x, 0.36, z);
    let head = null, hinges = null, drool = [];
    const joints = chain(root, n, 0.1, (joint, j) => {
      part(joint, cyl(0.032, 0.038, 0.11, 6), green, 0, 0.05, 0);
      if (j < n - 1) return;
      head = sub(joint, 0, 0.14, 0);
      head.scale.setScalar(size);
      hinges = [1, -1].map(d => {
        const hinge = sub(head, 0, 0, -0.17), half = sub(hinge, 0, 0, 0.17);
        half.rotation.z = d > 0 ? 0 : Math.PI;
        half.scale.set(1, 0.62, 1.3);
        part(half, dome(0.2, 12, 5), lip);
        part(half, new THREE.CircleGeometry(0.19, 12), mouth, 0, 0.004, 0, FLAT);
        for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.36; part(half, cone(0.026, 0.13, 4), tooth, Math.sin(a) * 0.185, -0.04, Math.cos(a) * 0.185, Math.PI); }
        return hinge;
      });
      drool = [0, 1, 2].map(k => part(head, sphere(0.03, 6, 5), glow(0xd8ffb0), (k - 1) * 0.09, 0, 0.16));
    });
    return { root, joints, head, hinges, drool };
  };
  const main = trap(0, 0, 6, 1), sides = [trap(-0.12, 0.05, 4, 0.62), trap(0.13, -0.03, 4, 0.62)];
  return stated(group, (t, wide, rage) => {
    const calm = clamp01(1 - wide - rage);
    tint(lip, 0x58b83a, 0xb0162c, rage);
    tint(mouth, 0xff5f8a, 0xff2a3a, rage);
    [main, ...sides].forEach((p, n) => {
      const mainOne = n === 0, side = n === 1 ? -1 : 1;
      if (!mainOne) { show(p.root, rage); p.root.rotation.z = -side * (0.75 + Math.sin(t * 3 + n) * 0.15); }
      const stretch = mainOne ? 1 + rage * 0.45 : 1;
      p.joints.forEach((joint, j) => {
        if (j) joint.position.y = 0.1 * stretch;
        joint.rotation.z = calm * Math.sin(t * 1.5 - j * 0.4) * 0.05 + wide * Math.sin(t * 1.4 - j * 0.3) * 0.09 + rage * Math.sin(t * 6.5 - j * 0.8 + n * 2) * 0.24;
        joint.rotation.x = wide * 0.06 + rage * Math.cos(t * 5.1 - j * 0.6 + n) * 0.22;
      });
      p.head.rotation.set(-0.5 * calm + rage * Math.sin(t * 7 + n) * 0.5, wide * Math.sin(t * 1.3) * 0.8 + rage * Math.sin(t * 4.7 + n * 2) * 0.9, 0);
      const gape = calm * (0.02 + Math.max(0, Math.sin(t * 0.9)) * 0.03) + wide * (0.62 + Math.sin(t * 2.2) * 0.08) + rage * Math.abs(Math.sin(t * 11 + n * 1.3)) * 0.85;
      p.hinges[0].rotation.x = -gape;
      p.hinges[1].rotation.x = gape;
      cycle(p.drool, t, 0.8, (d, u, k) => { d.position.y = -0.05 - u * 0.5; d.scale.set(Math.max(0.001, wide * (1 - u * 0.5)), Math.max(0.001, wide * (1.6 - u)), Math.max(0.001, wide * (1 - u * 0.5))); void k; });
    });
    all.rotation.z = rage * Math.sin(t * 9) * 0.1;
    all.position.set(rage * jitter(t, 2) * 0.02, rage * Math.abs(Math.sin(t * 9)) * 0.05, 0);
  });
};

// a barrel of toxic waste: a yellow drum, a green glow at its seam / the lid bulging, ooze running
// down its sides into a puddle / the lid off, froth boiling over and an arm of slime waving out of it
const makeBarrel = () => {
  const group = new THREE.Group();
  const drum = lambert(0xf2c21a), rim = lambert(0xb88a10), black = lambert(0x1c1a17), ooze = lambert(0x6dff2a, { emissive: 0x2a7a00 });
  const all = sub(group);
  part(all, cyl(0.33, 0.33, 0.8, 18), drum, 0, 0.4, 0);
  for (const y of [0.03, 0.27, 0.53, 0.77]) part(all, torus(0.335, 0.024), rim, 0, y, 0, FLAT);
  part(all, cyl(0.336, 0.336, 0.2, 18), black, 0, 0.4, 0);
  for (const turn of [0, Math.PI]) { // the warning sign, front and back
    const sign = sub(all);
    sign.rotation.y = turn;
    part(sign, cyl(0.1, 0.1, 0.02, 14), drum, 0, 0.4, 0.335, FLAT);
    for (let k = 0; k < 3; k++) part(sign, cyl(0.036, 0.036, 0.025, 8), black, Math.sin(k * 2.094) * 0.052, 0.4 + Math.cos(k * 2.094) * 0.052, 0.337, FLAT);
  }
  const seamMat = glow(0x2a7a10);
  const seam = part(all, torus(0.325, 0.028), seamMat, 0, 0.8, 0, FLAT);
  const lid = sub(all, 0, 0.8, 0);
  part(lid, cyl(0.32, 0.32, 0.04, 18), rim, 0, 0.02, 0);
  const bulge = part(lid, dome(0.3, 14, 5), drum, 0, 0.03, 0);
  part(lid, cyl(0.05, 0.05, 0.04, 8), black, 0.16, 0.05, 0.08);
  const drips = [0.5, 1.9, 3.1, 4.3, 5.4].map((a, k) => ({ mesh: part(all, sphere(0.055, 8, 6), ooze, Math.sin(a) * 0.345, 0.8, Math.cos(a) * 0.345), len: 0.25 + (k * 7 % 5) * 0.09, k }));
  const puddle = part(all, sphere(0.5, 14, 6), ooze, 0.06, 0, 0.05);
  const froth = [0, 1, 2, 3, 4, 5, 6, 7].map(k => part(all, sphere(0.13, 8, 6), ooze, Math.sin(k * 2.4) * (k ? 0.19 : 0), 0.82, Math.cos(k * 2.4) * (k ? 0.19 : 0)));
  const arm = sub(all, -0.05, 0.8, 0);
  const joints = chain(arm, 7, 0.11, (joint, j) => {
    part(joint, sphere(0.12 - j * 0.011, 8, 6), ooze, 0, 0.05, 0).scale.y = 1.3;
    if (j === 6) for (const [x, y] of [[-0.08, 0.14], [0, 0.18], [0.08, 0.14]]) part(joint, sphere(0.045, 6, 5), ooze, x, y, 0).scale.y = 1.5;
  });
  const pops = [0, 1, 2].map(() => part(all, sphere(0.04, 6, 5), glow(0xc8ff7a)));
  return stated(group, (t, leak, rage) => {
    const up = clamp01(leak + rage), beat = Math.abs(Math.sin(t * 5));
    tint(seamMat, 0x2a7a10, 0x9dff3a, 0.35 + Math.sin(t * 2.5) * 0.25 + up);
    seam.scale.setScalar(1 + up * 0.03);
    bulge.scale.set(1, 0.06 + leak * (0.5 + beat * 0.25) + rage * 0.2, 1);
    // the lid: on / lifting at one side / off, leaning against the drum
    lid.position.set(rage * 0.52, 0.8 + leak * 0.02 - rage * (0.5 - Math.abs(Math.sin(t * 6)) * 0.03), rage * 0.12);
    lid.rotation.set(0, 0, leak * (0.07 + beat * 0.05) - rage * 1.15);
    for (const d of drips) {
      const len = d.len * clamp01(up * 1.4 - d.k * 0.08) * (1 + rage * 0.6 + Math.sin(t * 2 + d.k) * 0.08);
      d.mesh.scale.set(up ? 1 : 0.001, Math.max(0.001, len / 0.11), up ? 0.6 : 0.001);
      d.mesh.position.y = 0.8 - len / 2;
    }
    puddle.scale.set(Math.max(0.001, leak * 0.8 + rage * 1.25), 0.04, Math.max(0.001, leak * 0.7 + rage * 1.1));
    froth.forEach((f, k) => { show(f, rage * (0.75 + Math.abs(Math.sin(t * (4 + k % 3) + k * 1.7)) * 0.55)); f.position.y = 0.82 + (k ? 0 : 0.05); });
    show(arm, rage);
    arm.rotation.y = Math.sin(t * 1.3) * 0.6;
    joints.forEach((joint, j) => { joint.rotation.z = Math.sin(t * 4.5 - j * 0.7) * 0.24 + (j > 4 ? 0.3 : 0); joint.rotation.x = Math.cos(t * 3.7 - j * 0.6) * 0.16; });
    cycle(pops, t, 0.9, (p, u, k) => { p.position.set(Math.sin(k * 2.2 + t) * 0.2, 0.9 + u * 0.5, Math.cos(k * 2.2) * 0.15); show(p, up * (0.5 + u) * (u < 0.9 ? 1 : 0)); });
    all.position.set(leak * jitter(t, 1) * 0.008 + rage * jitter(t, 2) * 0.02, rage * Math.abs(Math.sin(t * 8)) * 0.04, 0);
    all.rotation.z = leak * Math.sin(t * 4) * 0.02 + rage * Math.sin(t * 9) * 0.06;
  });
};

// a haunted mirror: silver glass in a gilt frame, a glint crossing it / the glass gone violet, a
// pale face that is not yours drifting in it / blood red, the face screaming, arms reaching out of both sides
const makeMirror = () => {
  const group = new THREE.Group();
  const gold = lambert(0xd9a92e), woodDark = lambert(0x53301a), glassMat = glow(0xc4dcea), pale = glow(0xd8f0c8), hollow = glow(0x0a0a0a);
  const haloMat = haze(0xb040ff, 0.55), eyeMat = glow(0x0a0a0a);
  const all = sub(group);
  part(all, box(0.56, 0.06, 0.34), woodDark, 0, 0.03, 0);
  part(all, cyl(0.045, 0.07, 0.2, 10), gold, 0, 0.15, 0);
  const frame = sub(all, 0, 0.72, 0);
  part(frame, torus(0.33, 0.055, 24), gold).scale.y = 1.4;
  part(frame, cyl(0.33, 0.33, 0.04, 24), glassMat, 0, 0, 0, FLAT).scale.z = 1.4;
  part(frame, sphere(0.07, 8, 6), gold, 0, 0.52, 0);
  for (const d of [-1, 1]) part(frame, sphere(0.05, 8, 6), gold, d * 0.38, 0, 0);
  const halo = part(frame, torus(0.43, 0.035, 24), haloMat);
  const sides = [0, Math.PI].map((turn) => {
    const side = sub(frame);
    side.rotation.y = turn;
    const glint = sub(side, 0, 0, 0.023);
    part(glint, box(0.05, 0.36, 0.002), glow(0xffffff), -0.1, 0.08, 0, 0, 0, 0.6);
    part(glint, box(0.025, 0.2, 0.002), glow(0xffffff), 0, -0.02, 0, 0, 0, 0.6);
    const face = sub(side, 0, 0.05, 0.024);
    part(face, new THREE.CircleGeometry(0.17, 14), pale).scale.y = 1.3;
    const eyes = [-1, 1].map(d => part(face, new THREE.CircleGeometry(0.045, 10), eyeMat, d * 0.07, 0.05, 0.003, 0, 0, d * 0.4));
    for (const eye of eyes) eye.scale.y = 1.5;
    const jaw = part(face, new THREE.CircleGeometry(0.05, 10), hollow, 0, -0.1, 0.003);
    const arms = [-1, 1].map(d => {
      const arm = sub(side, d * 0.17, -0.14, 0.02);
      part(arm, capsule(0.055, 0.3), pale, 0, 0, 0.19, FLAT);
      part(arm, sphere(0.085, 8, 6), pale, 0, 0, 0.4);
      for (const k of [-1, 0, 1]) part(arm, cone(0.02, 0.12, 5), pale, k * 0.045, 0, 0.5, FLAT, 0, 0).rotation.z = 0;
      return { arm, d };
    });
    return { glint, face, eyes, jaw, arms };
  });
  return stated(group, (t, seen, rage) => {
    const calm = clamp01(1 - seen - rage), up = clamp01(seen + rage);
    tint3(glassMat, 0xc4dcea, 0x40206e, 0x9a0a14, seen, rage);
    tint(haloMat, 0xb040ff, 0xff2010, rage);
    tint(eyeMat, 0x0a0a0a, 0xff2010, rage * 1.5);
    show(halo, up * (1 + Math.sin(t * 6) * 0.05) + rage * 0.12);
    halo.scale.y *= 1.4;
    for (const s of sides) {
      show(s.glint, calm);
      s.glint.position.x = Math.sin(t * 1.1) * 0.08;
      show(s.face, seen * 0.95 + rage * 1.25);
      s.face.position.set(seen * Math.sin(t * 1.2) * 0.08, 0.05 + Math.sin(t * 1.9) * 0.05 * up, 0.024);
      s.face.rotation.z = seen * Math.sin(t * 0.9) * 0.2 + rage * jitter(t, 3) * 0.15;
      s.jaw.scale.set(1 + rage * 0.5, 0.5 + seen * 0.4 + rage * (1.8 + Math.sin(t * 9) * 0.4), 1);
      for (const e of s.eyes) e.scale.set(1 + rage * 0.3, 1.5 + rage * 0.5, 1);
      for (const { arm, d } of s.arms) {
        arm.scale.set(Math.max(0.001, clamp01(rage * 3)), Math.max(0.001, clamp01(rage * 3)), Math.max(0.001, rage * (1 + Math.sin(t * 5 + d) * 0.15)));
        arm.rotation.set(Math.sin(t * 6 + d * 2) * 0.3 * rage, d * (0.4 + Math.sin(t * 4.3 + d) * 0.25), 0);
      }
    }
    all.rotation.z = seen * Math.sin(t * 2.2) * 0.04 + rage * Math.sin(t * 9) * 0.09;
    all.position.set(rage * jitter(t, 2) * 0.02, rage * Math.abs(Math.sin(t * 8)) * 0.05, 0);
  });
};

// a skunk in a pet carrier: curled up asleep / on its feet, the tail up through the roof / stamping,
// the tail fanned out and a green cloud rolling off it
const makeSkunk = () => {
  const group = new THREE.Group();
  const plastic = lambert(0x3f7fbf), bar = lambert(0xc9cfd6), black = lambert(0x1c1a1e), white = lambert(0xfffaf0), cloudMat = haze(0xa6e22a, 0.6);
  const all = sub(group);
  part(all, box(0.84, 0.1, 0.58), plastic, 0, 0.05, 0);
  for (const z of [-0.2, 0.2]) part(all, box(0.84, 0.06, 0.18), plastic, 0, 0.55, z);
  for (const x of [-0.4, 0.4]) part(all, box(0.04, 0.06, 0.58), plastic, x, 0.55, 0);
  for (let k = 0; k < 8; k++) for (const z of [-0.27, 0.27]) part(all, cyl(0.012, 0.012, 0.44, 5), bar, -0.385 + k * 0.11, 0.32, z);
  for (const x of [-0.4, 0.4]) for (const z of [-0.13, 0, 0.13]) part(all, cyl(0.012, 0.012, 0.44, 5), bar, x, 0.32, z);
  part(all, box(0.05, 0.03, 0.44), plastic, 0.2, 0.68, 0);
  for (const z of [-0.2, 0.2]) part(all, box(0.05, 0.1, 0.04), plastic, 0.2, 0.63, z);
  const skunk = sub(all, 0, 0.1, 0);
  part(skunk, sphere(0.16, 12, 10), black, 0, 0.16, 0).scale.set(1.5, 1, 1.1);
  part(skunk, sphere(0.1, 10, 6), white, -0.02, 0.26, 0).scale.set(2, 0.5, 0.55);
  for (const x of [-0.14, 0.14]) for (const z of [-0.09, 0.09]) part(skunk, sphere(0.045, 6, 5), black, x, 0.03, z);
  const head = sub(skunk, 0.25, 0.18, 0.05);
  part(head, sphere(0.11, 10, 8), black);
  part(head, sphere(0.05, 8, 6), white, 0.02, 0.085, 0.01).scale.set(1.6, 0.6, 0.7);
  part(head, cone(0.06, 0.12, 8), black, 0.09, -0.02, 0.05, 0.4, 0, -FLAT);
  part(head, sphere(0.025, 6, 5), lambert(0xff8fb1), 0.15, -0.02, 0.075);
  for (const z of [-0.06, 0.09]) part(head, sphere(0.035, 6, 5), black, -0.02, 0.1, z);
  const eyeMat = glow(0xffffff);
  const eyes = [[0.06, 0.03, 0.09], [0.09, 0.03, -0.03]].map(([x, y, z]) => part(head, sphere(0.03, 6, 5), eyeMat, x, y, z));
  // the tail: three tufts up from its rump, a white stripe up the back of it
  const tail = sub(skunk, -0.22, 0.2, 0);
  const tufts = [[0.13, 0.1], [0.32, 0.125], [0.53, 0.14]].map(([y, r]) => {
    const tuft = sub(tail, 0, y, 0);
    part(tuft, sphere(r, 10, 8), black);
    part(tuft, sphere(r * 0.8, 8, 6), white, -r * 0.4, 0.02, 0).scale.z = 0.7;
    return tuft;
  });
  const zeds = [0, 1, 2].map(() => part(all, sphere(0.035, 6, 5), glow(0xbfe6ff)));
  const cloud = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(all, sphere(0.2, 8, 6), cloudMat));
  return stated(group, (t, up, rage) => {
    const calm = clamp01(1 - up - rage), awake = clamp01(up + rage);
    skunk.position.set(0, 0.1 + rage * Math.abs(Math.sin(t * 11)) * 0.05, 0);
    skunk.rotation.z = rage * Math.sin(t * 11) * 0.12;
    skunk.scale.set(1, 1 + calm * Math.sin(t * 1.6) * 0.04, 1);
    head.position.y = 0.18 - calm * 0.07;
    head.rotation.z = up * Math.sin(t * 2.2) * 0.15;
    tint(eyeMat, 0xffffff, 0xff2010, rage * 1.5);
    for (const e of eyes) e.scale.set(1, Math.max(0.1, awake), 1);
    // the tail: laid along its back / straight up through the roof / fanned out, shaking
    tail.rotation.z = -1.7 * calm + up * Math.sin(t * 3) * 0.1 + rage * Math.sin(t * 17) * 0.12;
    tail.scale.setScalar(mix(0.62, 1, awake));
    tufts.forEach((tuft, k) => { tuft.scale.set(1 + rage * (0.25 + k * 0.2), 1, 1 + rage * (0.5 + k * 0.55)); });
    cycle(zeds, t, 0.4, (z, u, k) => { z.position.set(0.3 + u * 0.15 + Math.sin(u * 6) * 0.03, 0.7 + u * 0.4, 0.1); show(z, calm * (0.5 + u * 0.9)); void k; });
    cycle(cloud, t, 0.55, (c, u, k) => {
      const a = k * 2.4 + t * 0.4;
      c.position.set(-0.22 + Math.sin(a) * u * 0.6, 0.85 + u * 0.35 + Math.sin(k * 1.9) * 0.15, Math.cos(a) * u * 0.5);
      show(c, rage * (0.5 + u * 1.1));
    });
    cloudMat.opacity = 0.5 + Math.sin(t * 5) * 0.08;
    all.position.set(up * jitter(t, 1) * 0.008 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 11)) * 0.05, 0);
    all.rotation.z = rage * Math.sin(t * 11 + 1) * 0.06;
  });
};

// a cannonball: black iron on a ring of rope, a skull painted on it, its fuse unlit / the fuse lit
// and spitting, smoke off it / glowing red, the fuse nearly gone, rolling about by itself
const makeCannonball = () => {
  const group = new THREE.Group();
  const iron = new THREE.MeshPhongMaterial({ color: 0x23262c, shininess: 70, specular: 0x8a94a4 });
  const rope = lambert(0xc9a878), white = lambert(0xf2ead8), hole = glow(0x0a0a0a);
  part(group, torus(0.24, 0.055, 16), rope, 0, 0.055, 0, FLAT);
  const ball = sub(group, 0, 0.44, 0), roll = sub(ball);
  part(roll, sphere(0.37, 20, 14), iron);
  for (const turn of [0, Math.PI]) { // the skull, on its front and its back
    const skull = sub(roll);
    skull.rotation.y = turn;
    part(skull, sphere(0.15, 10, 8), white, 0, 0.03, 0.27).scale.set(1, 1, 0.55);
    part(skull, box(0.13, 0.09, 0.05), white, 0, -0.1, 0.325);
    for (const x of [-0.055, 0.055]) part(skull, sphere(0.04, 6, 5), hole, x, 0.03, 0.345);
    for (const x of [-0.035, 0, 0.035]) part(skull, box(0.008, 0.07, 0.01), hole, x, -0.11, 0.352);
  }
  part(roll, cyl(0.075, 0.09, 0.09, 10), lambert(0x4a4f58), 0, 0.38, 0);
  const fuse = sub(roll, 0, 0.42, 0);
  const cord = part(fuse, cyl(0.016, 0.016, 1, 5).translate(0, 0.5, 0), rope);
  const spark = sub(fuse);
  part(spark, sphere(0.06, 8, 6), glow(0xfff2a0));
  const sparkHalo = part(spark, sphere(0.11, 8, 6), haze(0xff8a1a, 0.55));
  const flying = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(group, sphere(0.032, 5, 4), glow(0xffd23f)));
  const smoke = [0, 1, 2].map(() => part(group, sphere(0.11, 7, 5), haze(0x8a8e96, 0.5)));
  const at = new THREE.Vector3();
  return stated(group, (t, lit, rage) => {
    const on = clamp01(lit + rage), beat = Math.abs(Math.sin(t * 9));
    // rolling: round its ring of rope and off it
    const x = rage * Math.sin(t * 2.6) * 0.3, z = rage * Math.cos(t * 1.9) * 0.22;
    ball.position.set(x + lit * jitter(t, 1) * 0.012, 0.44 - rage * 0.07 + rage * Math.abs(Math.sin(t * 5.2)) * 0.08, z);
    roll.rotation.set(z / 0.37, 0, -x / 0.37 + lit * Math.sin(t * 3) * 0.08 - 0.25 * (1 - rage));
    tint(iron, 0x23262c, 0xff3a10, rage * (0.6 + beat * 0.3));
    iron.emissive.setHex(0xff2a00).multiplyScalar(rage * (0.3 + beat * 0.4));
    const left = mix(mix(0.3, 0.22, lit), 0.07, rage);
    cord.scale.y = left;
    fuse.rotation.z = -0.4 + Math.sin(t * 3) * 0.06;
    spark.position.y = left;
    show(spark, on * (1.5 + jitter(t, 4) * 0.4 + rage * 0.3));
    sparkHalo.scale.setScalar(1 + Math.sin(t * 31) * 0.25);
    spark.getWorldPosition(at);
    group.worldToLocal(at);
    cycle(flying, t, 1.9, (f, u, k) => { // (sparks: short ones lit, thrown wide furious)
      const a = k * 2.4 + Math.floor(t * 1.9 + k / 8) * 1.3, far = lit * 0.42 + rage * 0.6;
      f.position.set(at.x + Math.sin(a) * u * far, at.y + u * far * 0.9 - u * u * far * 0.8, at.z + Math.cos(a) * u * far);
      show(f, on * (1 - u) * 1.5);
    });
    cycle(smoke, t, 0.6, (s, u, k) => {
      s.position.set(at.x + Math.sin(t + k * 3) * 0.06, at.y + 0.08 + u * 0.5, at.z);
      show(s, on * (0.4 + u * 0.8));
      s.material.opacity = 0.5 * (1 - u);
    });
  });
};

// a mimic: a treasure chest, shut / the lid up on two rows of teeth, a tongue lolling out, eyes on
// the lid / up on four stubby legs, running in circles, snapping
const makeMimic = () => {
  const group = new THREE.Group();
  const wood = lambert(0x8a5a2a), band = lambert(0xe2b93a), maw = glow(0x5a0a14), tooth = lambert(0xfffaf0), pink = lambert(0xff5f8a);
  const all = sub(group), body = sub(all);
  part(body, box(0.8, 0.36, 0.5), wood, 0, 0.18, 0);
  for (const x of [-0.3, 0.3]) part(body, box(0.07, 0.37, 0.52), band, x, 0.18, 0);
  part(body, box(0.74, 0.02, 0.44), maw, 0, 0.355, 0);
  const lowerTeeth = sub(body, 0, 0.36, 0);
  for (let k = 0; k < 7; k++) part(lowerTeeth, cone(0.04, 0.13, 4), tooth, -0.3 + k * 0.1, 0.06, 0.21);
  for (const x of [-0.36, 0.36]) for (const z of [-0.05, 0.1]) part(lowerTeeth, cone(0.04, 0.13, 4), tooth, x, 0.06, z);
  const tongue = sub(body, 0, 0.37, 0.05);
  const licks = chain(tongue, 4, 0.13, (joint, j) => { part(joint, sphere(0.085 - j * 0.008, 8, 6), pink, 0, 0.06, 0).scale.set(1.3, 1.1, 0.45); });
  const lid = sub(body, 0, 0.36, -0.25);
  part(lid, new THREE.CylinderGeometry(0.25, 0.25, 0.8, 12, 1, false, 0, Math.PI), wood, 0, 0, 0.25, 0, 0, FLAT);
  for (const x of [-0.3, 0.3]) part(lid, new THREE.CylinderGeometry(0.258, 0.258, 0.07, 12, 1, false, 0, Math.PI), band, x, 0, 0.25, 0, 0, FLAT);
  part(lid, box(0.74, 0.02, 0.44), maw, 0, 0.005, 0.25);
  part(lid, box(0.13, 0.15, 0.04), band, 0, 0.03, 0.505);
  part(lid, sphere(0.025, 6, 5), glow(0x1c1a17), 0, 0.02, 0.53);
  const upperTeeth = sub(lid);
  for (let k = 0; k < 7; k++) part(upperTeeth, cone(0.04, 0.13, 4), tooth, -0.3 + k * 0.1, -0.06, 0.46, Math.PI);
  for (const x of [-0.36, 0.36]) for (const z of [0.2, 0.35]) part(upperTeeth, cone(0.04, 0.13, 4), tooth, x, -0.06, z, Math.PI);
  const eyeMat = glow(0xffd23f);
  const eyes = [-0.19, 0.19].map(x => {
    const eye = sub(lid, x, 0.22, 0.4);
    part(eye, sphere(0.085, 10, 8), eyeMat);
    part(eye, sphere(0.04, 8, 6), glow(0x0a0a0a), 0, 0, 0.065).scale.set(0.5, 1.3, 1);
    part(eye, box(0.2, 0.04, 0.05), wood, 0, 0.09, 0.03, 0, 0, -Math.sign(x) * 0.45);
    return eye;
  });
  const legs = [[-0.3, 0.17], [0.3, 0.17], [-0.3, -0.17], [0.3, -0.17]].map(([x, z], k) => {
    const leg = sub(all, x, 0.24, z);
    part(leg, cyl(0.07, 0.06, 0.2, 8), wood, 0, -0.12, 0);
    part(leg, sphere(0.085, 8, 6), band, 0, -0.2, 0.03).scale.y = 0.6;
    return { leg, k };
  });
  return stated(group, (t, open, rage) => {
    const up = clamp01(open + rage), calm = clamp01(1 - up);
    const gape = calm * Math.max(0, Math.sin(t * 0.7) - 0.9) * 0.3 + open * (0.62 + Math.sin(t * 2.4) * 0.08) + rage * (0.3 + Math.abs(Math.sin(t * 10)) * 0.75);
    lid.rotation.x = -gape;
    show(lowerTeeth, up);
    show(upperTeeth, up);
    show(tongue, up);
    tongue.rotation.x = 0.9 + open * Math.sin(t * 2) * 0.1 + rage * Math.sin(t * 9) * 0.3;
    licks.forEach((joint, j) => { if (j) joint.rotation.x = 0.55 + Math.sin(t * mix(2.5, 9, rage) - j) * (0.18 + rage * 0.25); joint.rotation.z = Math.sin(t * mix(1.7, 7, rage) - j * 0.8) * (0.1 + rage * 0.25); });
    tint(eyeMat, 0xffd23f, 0xff2010, rage * 1.4);
    tint(wood, 0x8a5a2a, 0x7a2f3a, rage);
    for (const eye of eyes) { show(eye, up * (1 + rage * 0.25)); eye.rotation.y = Math.sin(t * 1.9) * 0.4 * open; }
    // up on its legs, and away: round and round its spot
    body.position.y = rage * (0.2 + Math.abs(Math.sin(t * 13)) * 0.04);
    body.rotation.x = -rage * 0.12 + open * Math.sin(t * 2.4) * 0.02;
    for (const { leg, k } of legs) { leg.scale.set(1, Math.max(0.001, rage), 1); leg.rotation.x = Math.sin(t * 13 + (k % 3 ? Math.PI : 0)) * 0.7 * rage; }
    all.position.set(open * jitter(t, 1) * 0.008 + rage * Math.sin(t * 3.4) * 0.3, rage * Math.abs(Math.sin(t * 6.5)) * 0.06, rage * Math.cos(t * 3.4) * 0.22);
    all.rotation.y = rage * Math.cos(t * 3.4) * 0.7;
    all.rotation.z = rage * Math.sin(t * 13) * 0.05;
  });
};

// a bundle of fireworks: seven rockets tied up in a bucket / one of them fizzing, smoke off it,
// the bundle trembling / going off in turn: up on a flame, a burst of stars, the bundle spinning
const makeFireworks = () => {
  const group = new THREE.Group();
  const COLOURS = [[0xd8262b, 0xffd23f], [0x2a5fd0, 0xfffaf0], [0x2fae5a, 0xff8fb1], [0xffd23f, 0xd8262b], [0x9a3ad0, 0xffd23f], [0xff7a1a, 0x2a5fd0], [0xfffaf0, 0xd8262b]];
  const all = sub(group);
  part(all, cyl(0.24, 0.18, 0.26, 14), lambert(0x7d838d), 0, 0.13, 0);
  part(all, torus(0.24, 0.02, 14), lambert(0x4a4f58), 0, 0.26, 0, FLAT);
  const bundle = sub(all);
  part(bundle, cyl(0.205, 0.205, 0.05, 14), lambert(0xc9a878), 0, 0.62, 0);
  const stick = lambert(0xc9a05a);
  const rockets = COLOURS.map(([main, nose], k) => {
    const a = k * Math.PI / 3, r = k ? 0.135 : 0;
    const home = sub(bundle, Math.sin(a) * r, 0, Math.cos(a) * r);
    home.rotation.set(k ? Math.cos(a) * 0.08 : 0, 0, k ? -Math.sin(a) * 0.08 : 0);
    const rocket = sub(home);
    part(rocket, box(0.016, 0.5, 0.016), stick, 0, 0.27, 0);
    part(rocket, cyl(0.065, 0.065, 0.46, 10), lambert(main), 0, 0.66, 0);
    part(rocket, cyl(0.067, 0.067, 0.07, 10), lambert(nose), 0, 0.72, 0);
    part(rocket, cone(0.085, 0.18, 10), lambert(nose), 0, 0.98, 0);
    const flame = sub(rocket, 0, 0.43, 0);
    part(flame, cone(0.07, 0.34, 7), glow(0xff8a1a), 0, -0.17, 0, Math.PI);
    part(flame, cone(0.04, 0.2, 6), glow(0xfff2a0), 0, -0.1, 0, Math.PI);
    const stars = [0, 1, 2, 3, 4, 5].map(() => part(home, sphere(0.055, 5, 4), glow(k % 2 ? nose : main)));
    return { rocket, flame, stars, k };
  });
  // the one that fizzes: a spark at its tail, and what it throws
  const fizz = sub(bundle, 0, 1.09, 0);
  part(fizz, sphere(0.06, 8, 6), glow(0xfff2a0));
  const fizzHalo = part(fizz, sphere(0.11, 8, 6), haze(0xff8a1a, 0.55));
  const bits = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(bundle, sphere(0.028, 5, 4), glow(0xffd23f)));
  const smoke = [0, 1, 2].map(() => part(all, sphere(0.11, 7, 5), haze(0x9a9ea6, 0.5)));
  let spin = 0;
  return stated(group, (t, hot, rage, dt) => {
    const on = clamp01(hot + rage);
    spin = rage > 0 ? spin + dt * rage * 4.5 : 0;
    bundle.rotation.y = spin;
    for (const { rocket, flame, stars, k } of rockets) {
      const u = (t * 0.75 + k * 3 / 7) % 1, up = clamp01(u / 0.5), gone = u > 0.5;
      // furious: up on its flame, burst, and a new one pushed up in its place
      const y = rage * (gone ? 0 : up * up * 0.75) + (k === 1 ? hot * Math.abs(Math.sin(t * 21)) * 0.04 : 0);
      rocket.position.y = y;
      show(rocket, rage > 0.02 && gone ? mix(1, clamp01((u - 0.8) / 0.2), clamp01(rage * 3)) : 1);
      show(flame, rage * (gone ? 0 : 0.7 + jitter(t, k) * 0.3));
      const v = clamp01((u - 0.5) / 0.4);
      stars.forEach((s, n) => {
        const a = n * Math.PI / 3 + k;
        s.position.set(Math.sin(a) * v * 0.36, 1.75 + Math.cos(a) * v * 0.36 - v * v * 0.12, Math.sin(a * 2 + k) * v * 0.2);
        show(s, rage * (gone && v < 1 ? (1 - v) * 1.6 + 0.2 : 0));
      });
    }
    show(fizz, hot * (1.5 + jitter(t, 4) * 0.5));
    fizzHalo.scale.setScalar(1 + Math.sin(t * 31) * 0.25);
    cycle(bits, t, 2.3, (b, u, k) => {
      const a = k * 2.4 + Math.floor(t * 2.3 + k / 8) * 1.7;
      b.position.set(Math.sin(a) * u * 0.4, 1.09 + u * 0.75 - u * u * 0.6, Math.cos(a) * u * 0.4);
      show(b, hot * (1 - u) * 1.9);
    });
    cycle(smoke, t, 0.6, (s, u, k) => {
      s.position.set(Math.sin(t + k * 3) * 0.08, 1.2 + u * 0.5, 0.05);
      show(s, on * (0.4 + u * 0.9));
      s.material.opacity = 0.5 * (1 - u);
    });
    all.position.set(hot * jitter(t, 1) * 0.014 + rage * jitter(t, 2) * 0.025, rage * Math.abs(Math.sin(t * 9)) * 0.05, 0);
    all.rotation.z = hot * Math.sin(t * 17) * 0.025 + rage * Math.sin(t * 10) * 0.06;
  });
};

// a baby alien in an incubator: curled up asleep under a slow blue light / sat up, great black eyes
// open, hands on the glass, the light amber / the glass cracked and the lid tipped off, antennae
// out, eyes red, the whole thing off the ground on a magenta beam
const makeAlien = () => {
  const group = new THREE.Group();
  const metal = lambert(0x8a93a0), skin = lambert(0x8fe36a), glass = glassy(0xcfeaff, 0.22), lampMat = glow(0x3ad0ff), beamMat = haze(0xff3ad0, 0.4);
  const eyeMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 120 });
  const all = sub(group);
  part(all, cyl(0.4, 0.44, 0.16, 18), metal, 0, 0.08, 0);
  const lamp = part(all, torus(0.37, 0.035), lampMat, 0, 0.17, 0, FLAT);
  for (const x of [-0.12, 0, 0.12]) part(all, sphere(0.03, 6, 5), lampMat, x, 0.09, 0.415);
  const alien = sub(all, 0, 0.18, 0);
  part(alien, sphere(0.12, 10, 8), skin, 0, 0.13, 0).scale.y = 1.25;
  for (const x of [-0.07, 0.07]) part(alien, sphere(0.05, 6, 5), skin, x, 0.03, 0.07).scale.z = 1.6;
  const head = sub(alien, 0, 0.4, 0);
  part(head, sphere(0.19, 14, 10), skin).scale.set(1.2, 1, 1.05);
  const eyes = [-1, 1].map(d => part(head, sphere(0.085, 10, 8), eyeMat, d * 0.095, -0.01, 0.14, 0, 0, d * 0.45));
  const antennae = [-1, 1].map(d => {
    const stalk = sub(head, d * 0.09, 0.15, 0);
    stalk.rotation.z = -d * 0.3;
    part(stalk, cyl(0.014, 0.018, 0.3, 5), skin, 0, 0.15, 0);
    part(stalk, sphere(0.045, 8, 6), lampMat, 0, 0.32, 0);
    return stalk;
  });
  const hands = [-1, 1].map(d => {
    const hand = sub(alien);
    part(hand, sphere(0.05, 8, 6), skin);
    for (const k of [-1, 0, 1]) part(hand, sphere(0.022, 5, 4), skin, k * 0.035, 0.055, 0);
    return { hand, d };
  });
  const tubeGlass = part(all, tube(0.34, 0.52), glass, 0, 0.42, 0);
  tubeGlass.renderOrder = 2;
  const lid = sub(all, -0.34, 0.68, 0);
  const cap = part(lid, dome(0.34, 18, 6), glass, 0.34, 0, 0);
  cap.renderOrder = 2;
  part(lid, torus(0.34, 0.022), metal, 0.34, 0, 0, FLAT);
  part(lid, sphere(0.05, 8, 6), metal, 0.34, 0.35, 0);
  const cracks = sub(all, 0, 0.62, 0);
  const crackMat = glow(0xffffff);
  for (const [a, n] of [[0.2, 4], [1.5, 3], [-1.1, 4], [3.1, 3], [-2.3, 3]]) { const c = zigzag(cracks, crackMat, n, 0.1, 0.014); c.position.set(Math.sin(a) * 0.345, 0, Math.cos(a) * 0.345); c.rotation.y = a; }
  const beam = part(group, new THREE.CylinderGeometry(0.34, 0.5, 1, 16, 1, true), beamMat, 0, 0, 0);
  const shadow = part(group, new THREE.CircleGeometry(0.5, 18), beamMat, 0, 0.006, 0, -FLAT);
  return stated(group, (t, awake, rage) => {
    const calm = clamp01(1 - awake - rage), up = clamp01(awake + rage);
    const pulse = 0.5 + 0.5 * Math.sin(t * mix(mix(1.6, 6, awake), 17, rage));
    tint3(lampMat, 0x1a6a9a, 0xffb02e, 0xff3ad0, awake, rage);
    lampMat.color.multiplyScalar(0.55 + pulse * 0.45);
    lamp.scale.setScalar(1 + up * pulse * 0.04);
    tint(glass, 0xcfeaff, 0xff9ae0, rage);
    // the alien: curled over, small / sat up / stretched up through the top
    alien.rotation.x = calm * 0.95;
    alien.position.set(0, 0.18, -calm * 0.08);
    show(alien, mix(0.85, 1, up) + rage * 0.12);
    head.rotation.set(0, awake * Math.sin(t * 1.3) * 0.5 + rage * Math.sin(t * 9) * 0.3, awake * Math.sin(t * 0.9) * 0.15 + rage * jitter(t, 2) * 0.15);
    head.position.y = 0.4 + rage * 0.06;
    tint(eyeMat, 0x0a0a0a, 0xff1a10, rage * 1.4);
    eyeMat.emissive.setHex(0xff1a10).multiplyScalar(rage * 0.8);
    for (const e of eyes) e.scale.set(0.8, mix(0.12, 1.25, up), 0.5);
    for (const stalk of antennae) stalk.scale.set(1, mix(mix(0.25, 0.55, awake), 1.7 + Math.sin(t * 11) * 0.1, rage), 1);
    for (const { hand, d } of hands) {
      hand.position.set(d * mix(0.1, 0.15, up) + rage * d * 0.1, mix(0.12, 0.3, awake) + rage * (0.42 + Math.abs(Math.sin(t * 9 + d)) * 0.1), mix(0.1, 0.31, awake) + rage * 0.2);
      hand.rotation.x = -FLAT * up;
    }
    show(cracks, rage);
    lid.rotation.z = rage * (0.75 + Math.sin(t * 7) * 0.12);
    lid.position.y = 0.68 + rage * 0.03;
    // off the ground, on its beam
    const lift = rage * (0.34 + Math.sin(t * 3.2) * 0.05);
    all.position.set(awake * jitter(t, 1) * 0.006 + rage * jitter(t, 2) * 0.015, lift, 0);
    all.rotation.z = rage * Math.sin(t * 4.2) * 0.1;
    all.rotation.x = rage * Math.cos(t * 3.4) * 0.06;
    beam.position.y = lift / 2;
    beam.scale.set(rage ? 1 : 0.001, Math.max(0.001, lift), rage ? 1 : 0.001);
    show(shadow, rage * (0.9 + pulse * 0.2));
  });
};

// a possessed teddy bear: sat with its button eyes / its head turned right round to the back, arms
// lifting, one eye hanging by a thread / stood up, gone grey, eyes red, ripped open and holding up its own stuffing
const makeTeddy = () => {
  const group = new THREE.Group();
  const fur = lambert(0xb07a44), pad = lambert(0xe6c79a), black = glow(0x14100c), fluff = lambert(0xffffff), eyeMat = glow(0x14100c);
  const fig = sub(group), bear = sub(fig);
  part(bear, sphere(0.24, 14, 10), fur, 0, 0.3, 0).scale.set(1, 1.15, 0.9);
  part(bear, sphere(0.17, 10, 8), pad, 0, 0.28, 0.14).scale.z = 0.45;
  const rip = sub(bear, 0, 0.28, 0.21);
  part(rip, sphere(0.09, 8, 6), glow(0x2a0a0e)).scale.set(0.7, 1.5, 0.4);
  const guts = [[0, 0, 0.05, 0.085], [-0.06, -0.07, 0.07, 0.07], [0.06, 0.06, 0.06, 0.07], [0.02, -0.14, 0.09, 0.06], [-0.03, 0.12, 0.04, 0.055]].map(([x, y, z, r]) => part(rip, sphere(r, 7, 5), fluff, x, y, z));
  const legs = [-1, 1].map(d => {
    const leg = sub(bear, d * 0.14, 0.14, 0.04);
    part(leg, capsule(0.085, 0.14), fur, 0, -0.13, 0);
    part(leg, sphere(0.07, 8, 6), pad, 0, -0.27, 0.02).scale.set(1, 0.4, 1.2);
    return { leg, d };
  });
  const arms = [-1, 1].map(d => {
    const arm = sub(bear, d * 0.21, 0.46, 0);
    part(arm, capsule(0.068, 0.16), fur, 0, -0.13, 0);
    part(arm, sphere(0.055, 8, 6), pad, 0, -0.26, 0.03);
    return { arm, d };
  });
  const tuft = sub(arms[1].arm, 0, -0.34, 0);
  for (const [x, y, r] of [[0, 0, 0.09], [0.07, -0.05, 0.07], [-0.06, -0.06, 0.075], [0.01, -0.12, 0.06]]) part(tuft, sphere(r, 7, 5), fluff, x, y, 0);
  const head = sub(bear, 0, 0.7, 0);
  part(head, sphere(0.2, 14, 10), fur);
  part(head, sphere(0.09, 10, 8), pad, 0, -0.05, 0.16);
  part(head, sphere(0.03, 6, 5), black, 0, -0.02, 0.245);
  for (const d of [-1, 1]) {
    part(head, sphere(0.08, 8, 6), fur, d * 0.16, 0.16, 0);
    part(head, sphere(0.045, 6, 5), pad, d * 0.16, 0.16, 0.05);
  }
  const grin = sub(head, 0, -0.1, 0.225);
  for (let k = 0; k < 5; k++) part(grin, box(0.045, 0.014, 0.01), black, (k - 2) * 0.034, k % 2 ? 0.012 : -0.012, 0, 0, 0, k % 2 ? 0.5 : -0.5);
  const eyeR = part(head, sphere(0.04, 8, 6), eyeMat, 0.075, 0.05, 0.175);
  const eyeL = sub(head, -0.075, 0.05, 0.175);
  const thread = part(eyeL, box(0.008, 1, 0.008).translate(0, -0.5, 0), black);
  const button = part(eyeL, sphere(0.04, 8, 6), eyeMat);
  const socket = part(head, sphere(0.025, 6, 5), glow(0x2a0a0e), -0.075, 0.05, 0.178);
  const ruff = sub(bear, 0, 0.53, 0);
  for (let k = 0; k < 7; k++) part(ruff, sphere(0.07, 7, 5), fluff, Math.sin(k * 0.9) * 0.14, Math.sin(k * 2.3) * 0.015, Math.cos(k * 0.9) * 0.13);
  const bits = [0, 1, 2, 3, 4].map(() => part(group, sphere(0.045, 6, 5), fluff));
  return stated(group, (t, turned, rage) => {
    const calm = clamp01(1 - turned - rage), up = clamp01(turned + rage);
    tint(fur, 0xb07a44, 0x5e5560, rage);
    tint(eyeMat, 0x14100c, 0xff1a10, rage * 1.5);
    // sat / sat, arms coming up / on its feet, lurching
    bear.position.y = rage * (0.2 + Math.abs(Math.sin(t * 4.4)) * 0.03);
    for (const { leg, d } of legs) leg.rotation.set(-FLAT * (1 - rage) + rage * Math.sin(t * 4.4 + d) * 0.25, 0, d * 0.25 * (1 - rage));
    fig.rotation.z = calm * Math.sin(t * 1.1) * 0.03 + rage * Math.sin(t * 4.4) * 0.14;
    fig.position.x = rage * Math.sin(t * 2.2) * 0.1;
    head.rotation.set(calm * 0.12, turned * (Math.PI + Math.sin(t * 2.1) * 0.12) + rage * jitter(t, 3) * 0.25, turned * 0.2 + rage * (0.42 + Math.sin(t * 6) * 0.08));
    arms[0].arm.rotation.set(-turned * 0.5 - rage * (1.35 + Math.sin(t * 5) * 0.2), 0, -(0.25 + turned * (0.95 + Math.sin(t * 3) * 0.1) + rage * 0.2));
    arms[1].arm.rotation.set(-turned * 0.5, 0, 0.25 + turned * (0.95 + Math.sin(t * 3 + 1) * 0.1) + rage * (2.5 + Math.sin(t * 8) * 0.18));
    show(tuft, rage);
    show(ruff, up * (1 + Math.sin(t * 3) * 0.05));
    tint(fur, 0xb07a44, 0x5e5560, turned * 0.3 + rage);
    show(rip, rage * (1 + Math.sin(t * 6) * 0.06));
    guts.forEach((g, k) => g.scale.setScalar(1 + Math.sin(t * 5 + k * 1.3) * 0.15));
    // the eye that hangs by a thread
    const drop = up * (0.11 + rage * 0.04);
    thread.scale.y = Math.max(0.001, drop);
    button.position.y = -drop;
    eyeL.rotation.z = up * Math.sin(t * 4.2) * 0.5;
    show(socket, up);
    eyeR.scale.setScalar(1 + rage * 0.7);
    button.scale.setScalar(1 + rage * 0.3);
    grin.scale.set(1 + rage * 0.6, 1 + rage * 1.6, 1);
    cycle(bits, t, 0.7, (b, u, k) => {
      const a = k * 2.4 + Math.floor(t * 0.7 + k / 5);
      b.position.set(fig.position.x + Math.sin(a) * (0.15 + u * 0.4), 0.55 + u * 0.7 - u * u * 0.9, 0.2 + Math.cos(a) * u * 0.3);
      show(b, rage * (1 - u * 0.5));
    });
  });
};

// a cage of bats: five of them hanging asleep from the perch / three awake, yellow eyes, wings
// half out, the cage swinging / all of them loose inside, red-eyed, battering the bars
const makeBats = () => {
  const group = new THREE.Group();
  const brass = lambert(0xc9a24a), hide = lambert(0x7a55b0), wingMat = lambert(0x9a6ae0, { side: THREE.DoubleSide });
  const all = sub(group), cage = sub(all);
  part(cage, cyl(0.37, 0.37, 0.05, 18), brass, 0, 0.025, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; part(cage, cyl(0.011, 0.011, 0.72, 5), brass, Math.sin(a) * 0.34, 0.4, Math.cos(a) * 0.34); }
  for (const y of [0.4, 0.76]) part(cage, torus(0.34, 0.016), brass, 0, y, 0, FLAT);
  for (let k = 0; k < 6; k++) part(cage, new THREE.TorusGeometry(0.34, 0.011, 4, 12, Math.PI), brass, 0, 0.76, 0, 0, k * Math.PI / 6, 0);
  part(cage, torus(0.05, 0.014, 10), brass, 0, 1.14, 0);
  part(cage, cyl(0.014, 0.014, 0.66, 5), brass, 0, 0.8, 0, 0, 0, FLAT);
  const eyeMats = [glow(0xffd23f), glow(0xffd23f)];
  const bats = [0, 1, 2, 3, 4].map((k) => {
    const bat = sub(cage), early = k % 2 === 0; // (three of the five wake first)
    part(bat, sphere(0.06, 8, 6), hide).scale.y = 1.5;
    part(bat, sphere(0.05, 8, 6), hide, 0, 0.1, 0.01);
    for (const x of [-0.03, 0.03]) part(bat, cone(0.02, 0.07, 4), hide, x, 0.16, 0);
    const eyes = [-0.022, 0.022].map(x => part(bat, sphere(0.016, 5, 4), eyeMats[early ? 0 : 1], x, 0.105, 0.05));
    const wings = [1, -1].map(d => {
      const root = sub(bat, d * 0.03, 0.04, 0);
      root.rotation.y = d > 0 ? 0 : Math.PI;
      return part(root, WING, wingMat);
    });
    return { bat, eyes, wings, early, k, at: k * 1.3 };
  });
  return stated(group, (t, waking, rage, dt) => {
    const calm = clamp01(1 - waking - rage);
    tint(eyeMats[0], 0xffd23f, 0xff1a10, rage * 1.5);
    tint(eyeMats[1], 0xffd23f, 0xff1a10, rage * 1.5);
    for (const b of bats) {
      b.at += dt * (5 + b.k * 0.7) * (b.k % 2 ? 1 : -1);
      const awake = clamp01((b.early ? waking : 0) + rage);
      // hung by its feet from the perch / on the wing, round the cage and into its bars
      const hx = (b.k - 2) * 0.125, r = 0.2 + Math.abs(Math.sin(t * 3.3 + b.k * 2)) * 0.2;
      b.bat.position.set(mix(hx, Math.sin(b.at) * r, rage), mix(0.6, 0.5 + Math.sin(t * 4.1 + b.k * 1.9) * 0.28, rage), mix(0, Math.cos(b.at) * r, rage));
      b.bat.rotation.set(0, rage * (b.at + (b.k % 2 ? 1 : -1) * FLAT), Math.PI * (1 - rage) + waking * (b.early ? Math.sin(t * 3 + b.k) * 0.2 : 0) + calm * Math.sin(t * 1.3 + b.k) * 0.05);
      show(b.bat, 1.5 + rage * 0.2);
      for (const e of b.eyes) show(e, awake * (1 + rage * 0.6));
      const spread = mix(0.2, 0.75, awake * (1 - rage)) + rage * 0.8, flap = waking * (b.early ? Math.sin(t * 9 + b.k) * 0.25 : 0) + rage * Math.sin(t * 26 + b.k * 2) * 0.75;
      for (const wing of b.wings) { wing.scale.set(spread, mix(1.5, 1, awake), 1); wing.rotation.z = flap + 0.1; }
    }
    // the cage: still / swinging / thrown about
    cage.rotation.z = waking * Math.sin(t * 3.1) * 0.1 + rage * Math.sin(t * 12) * 0.14;
    cage.rotation.x = rage * Math.cos(t * 9.5) * 0.09;
    cage.scale.set(1 + rage * Math.abs(Math.sin(t * 7)) * 0.08, 1, 1 + rage * Math.abs(Math.cos(t * 7)) * 0.08);
    all.position.set(rage * jitter(t, 2) * 0.04, rage * Math.abs(Math.sin(t * 9)) * 0.09, 0);
  });
};

// a block of ice: frosted, a dark shape in the middle of it / melting and leaning in a puddle, the
// shape's eyes lit and a hand up against the ice / shattered: a thawed yeti cub, white, arms up, roaring among the shards
const makeIce = () => {
  const group = new THREE.Group();
  const ice = glassy(0xbfe6ff, 0.6), frost = lambert(0xffffff), fur = lambert(0x4a6a8a), skin = lambert(0x5a8fc0), water = lambert(0x6ab8ff), shardMat = lambert(0xd8f0ff);
  const eyeMat = glow(0xffd23f);
  const puddle = part(group, sphere(0.5, 14, 6), water, 0, 0, 0);
  const all = sub(group);
  const cub = sub(all, 0, 0.1, 0);
  part(cub, sphere(0.2, 12, 10), fur, 0, 0.2, 0).scale.y = 1.1;
  for (const d of [-1, 1]) part(cub, sphere(0.08, 8, 6), skin, d * 0.1, 0.03, 0.08).scale.z = 1.4;
  const head = sub(cub, 0, 0.5, 0);
  part(head, sphere(0.18, 12, 10), fur);
  part(head, sphere(0.13, 10, 8), skin, 0, -0.02, 0.09).scale.z = 0.6;
  for (const d of [-1, 1]) part(head, cone(0.04, 0.14, 6), lambert(0xd8d2c4), d * 0.13, 0.15, 0, 0, 0, -d * 0.6);
  const eyes = [-1, 1].map(d => part(head, sphere(0.032, 8, 6), eyeMat, d * 0.055, 0.02, 0.165));
  const mouth = sub(head, 0, -0.08, 0.15);
  part(mouth, sphere(0.06, 8, 6), glow(0x7a1420)).scale.z = 0.5;
  for (const x of [-0.03, 0.03]) part(mouth, cone(0.014, 0.05, 4), glow(0xffffff), x, -0.02, 0.03);
  const arms = [-1, 1].map(d => {
    const arm = sub(cub, d * 0.2, 0.36, 0);
    part(arm, capsule(0.065, 0.2), fur, 0, -0.14, 0);
    part(arm, sphere(0.075, 8, 6), skin, 0, -0.3, 0);
    return { arm, d };
  });
  const slab = part(all, box(0.74, 0.12, 0.64), ice, 0, 0.06, 0);
  slab.renderOrder = 2;
  const block = sub(all, 0, 0.1, 0);
  const cube = part(block, box(0.74, 0.8, 0.64), ice, 0, 0.4, 0);
  cube.renderOrder = 2;
  const cap = sub(block, 0, 0.8, 0);
  part(cap, box(0.77, 0.05, 0.67), frost, 0, 0.01, 0);
  for (const [x, z, r] of [[-0.2, 0.1, 0.11], [0.15, -0.08, 0.13], [0.22, 0.18, 0.08]]) part(cap, sphere(r, 8, 6), frost, x, 0.03, z).scale.y = 0.5;
  for (const [x, y, z] of [[-0.3, 0.3, 0.325], [0.2, 0.55, 0.325], [0.375, 0.4, 0.1], [-0.375, 0.6, -0.1]]) part(block, sphere(0.07, 6, 5), frost, x, y, z).scale.set(z > 0.3 ? 1 : 0.15, 1, z > 0.3 ? 0.15 : 1);
  const drips = [0, 1, 2, 3, 4, 5].map(() => part(all, sphere(0.035, 6, 5), water));
  const shards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => {
    const shard = part(all, cone(0.11 + (k % 3) * 0.03, 0.3 + (k % 4) * 0.06, 3), shardMat);
    shard.rotation.set(k % 2 ? 1.2 : 0.2, k * 1.7, k % 3 ? 0.3 : -1.1);
    return shard;
  });
  return stated(group, (t, melt, rage) => {
    const calm = clamp01(1 - melt - rage), up = clamp01(melt + rage);
    tint3(fur, 0x4a6a8a, 0x7fa2c8, 0xfafdff, melt, rage);
    tint3(skin, 0x3f6a94, 0x5a8fc0, 0x6fb0e8, melt, rage);
    tint(eyeMat, 0xffd23f, 0xff1a10, rage * 1.5);
    ice.opacity = 0.62 - melt * 0.22;
    // the block: square / shrunk, leaning, running with water / gone to pieces
    block.scale.set((1 - melt * 0.1) * (1 - rage), Math.max(0.001, (1 - melt * 0.16) * (1 - rage)), (1 - melt * 0.1) * (1 - rage));
    block.rotation.z = melt * 0.07;
    show(cap, calm);
    puddle.scale.set(Math.max(0.001, melt * 0.95 + rage * 1.15), 0.03, Math.max(0.001, melt * 0.85 + rage * 1.05));
    cycle(drips, t, 0.9, (d, u, k) => {
      const a = k * 1.05 + 0.4;
      d.position.set(Math.sign(Math.sin(a)) * (Math.abs(Math.sin(a)) > 0.7 ? 0.36 : 0.36 * Math.sin(a)), 0.78 - u * 0.72, Math.abs(Math.sin(a)) > 0.7 ? 0.3 * Math.cos(a) : Math.sign(Math.cos(a)) * 0.32);
      d.scale.set(Math.max(0.001, melt), Math.max(0.001, melt * 1.7), Math.max(0.001, melt));
    });
    shards.forEach((shard, k) => {
      const a = k / 10 * Math.PI * 2 + 0.3, r = rage * (0.48 + (k % 3) * 0.1);
      shard.position.set(Math.sin(a) * r, 0.1 + (k % 2) * 0.04 + Math.sin(rage * Math.PI) * 0.3, Math.cos(a) * r * 0.85);
      show(shard, rage);
    });
    // the cub: frozen stiff / looking out, a hand up / free
    show(cub, mix(0.92, 1.3, rage));
    cub.position.set(melt * 0.06, 0.1 + rage * Math.abs(Math.sin(t * 9)) * 0.1, melt * 0.05);
    cub.rotation.z = rage * Math.sin(t * 9) * 0.1;
    head.rotation.set(calm * 0.3, melt * Math.sin(t * 1.4) * 0.5, rage * Math.sin(t * 7) * 0.15);
    for (const e of eyes) show(e, up * (1 + rage * 0.6));
    show(mouth, rage * (1 + Math.abs(Math.sin(t * 8)) * 0.5));
    for (const { arm, d } of arms) arm.rotation.set(d > 0 ? -melt * (1.5 + Math.sin(t * 2.3) * 0.1) : 0, 0, d * (0.2 + rage * (2.5 + jitter(t, d) * 0.3)));
    all.position.x = melt * jitter(t, 1) * 0.004;
  });
};

// a sack of snakes: tied at the neck, lumps moving under the cloth / three heads out through holes,
// tongues going / the neck undone and the sack slumped, snakes pouring out of the top of it
const makeSnakes = () => {
  const group = new THREE.Group();
  const cloth = lambert(0xb89a62), patch = lambert(0x8f7444), ropeMat = lambert(0x53301a), eyeMat = glow(0xffe23f), red = glow(0xff2a3a);
  const SKINS = [[0x4fae3a, 0x2f7a2a], [0xd8262b, 0xffd23f], [0x9a3ad0, 0x4a1a7a], [0xffb02e, 0x1c1a17]];
  const all = sub(group);
  const sack = part(all, sphere(0.36, 14, 10), cloth, 0, 0.34, 0);
  part(sack, box(0.2, 0.2, 0.02), patch, 0.05, -0.05, 0.345, 0, 0.1, 0.2);
  const lumps = [0, 1, 2, 3].map(() => part(all, sphere(0.15, 8, 6), cloth));
  const neck = sub(all, 0, 0.66, 0);
  part(neck, cyl(0.1, 0.17, 0.14, 10), cloth, 0, 0.02, 0);
  part(neck, cyl(0.19, 0.09, 0.13, 10), cloth, 0, 0.14, 0);
  const rope = part(all, torus(0.115, 0.03, 12), ropeMat);
  const opening = part(all, cyl(0.2, 0.2, 0.02, 12), glow(0x1a120a), 0, 0.45, 0);
  // a snake: a chain of beads with a head on the end, banded in two colours
  const snake = (parent, n, r, [main, bands]) => {
    const root = sub(parent), mats = [lambert(main), lambert(bands)];
    let tongue = null;
    const joints = chain(root, n, r * 1.7, (joint, j) => {
      part(joint, sphere(r, 8, 6), mats[j % 3 === 1 ? 1 : 0], 0, r * 0.8, 0).scale.y = 1.35;
      if (j < n - 1) return;
      const head = sub(joint, 0, r * 2.4, 0);
      part(head, sphere(r * 1.5, 8, 6), mats[0]).scale.set(1.1, 1.25, 0.8);
      for (const d of [-1, 1]) part(head, sphere(r * 0.42, 6, 5), eyeMat, d * r * 0.95, r * 0.5, r * 0.75);
      tongue = part(head, box(r * 0.25, r * 2.4, r * 0.2).translate(0, r * 1.2, 0), red, 0, r * 1.6, 0);
    });
    return { root, joints, tongue };
  };
  const up = new THREE.Vector3(0, 1, 0);
  const pokers = [[0.3, 0.42, 0.18], [-0.3, 0.5, 0.1], [0.02, 0.26, 0.34]].map((p, n) => {
    const s = snake(all, 4, 0.05, SKINS[n]);
    s.root.position.set(p[0], p[1], p[2]);
    s.root.quaternion.setFromUnitVectors(up, new THREE.Vector3(p[0], p[1] - 0.3, p[2]).normalize());
    return s;
  });
  const spill = [0.5, 2.2, 3.7, 5.3].map((turn, n) => {
    const s = snake(all, 10, 0.055, SKINS[(n + 1) % 4]);
    s.root.position.set(0, 0.44, 0);
    return { ...s, turn, n };
  });
  return stated(group, (t, out, rage) => {
    const calm = clamp01(1 - out - rage), poke = clamp01(out + rage * 0.6);
    // the sack: full and shifting / slumped
    sack.scale.set(1 + rage * 0.25 + Math.sin(t * 2.1) * 0.02, 0.95 - rage * 0.3 + Math.sin(t * 2.7) * 0.02, 0.95 + rage * 0.2);
    sack.position.y = 0.34 - rage * 0.1;
    lumps.forEach((lump, k) => {
      const a = t * (0.9 + k * 0.25) * (k % 2 ? 1 : -1) + k * 1.6, y = 0.3 + Math.sin(t * 1.3 + k * 2) * 0.14;
      lump.position.set(Math.sin(a) * 0.25, y - rage * 0.08, Math.cos(a) * 0.25);
      show(lump, 0.8 + Math.sin(t * 3 + k) * 0.15 + out * 0.1);
    });
    show(neck, 1 - rage);
    neck.rotation.z = calm * Math.sin(t * 1.7) * 0.08 + out * Math.sin(t * 6) * 0.12;
    rope.position.set(rage * 0.5, mix(0.68, 0.03, rage), rage * 0.22);
    rope.rotation.set(FLAT, 0, 0);
    show(opening, rage);
    pokers.forEach((s, n) => {
      show(s.root, poke * (0.9 + 0.1 * Math.sin(t * 2 + n)));
      s.joints.forEach((joint, j) => { joint.rotation.z = Math.sin(t * mix(3, 7, rage) - j * 0.9 + n * 2) * 0.3; joint.rotation.x = Math.cos(t * 2.3 - j * 0.7 + n) * 0.22; });
      s.tongue.scale.y = Math.max(0.001, Math.sin(t * 9 + n * 2));
    });
    for (const s of spill) {
      show(s.root, rage);
      s.root.rotation.set(0, s.turn + Math.sin(t * 1.1 + s.n) * 0.25, -0.75);
      s.joints.forEach((joint, j) => {
        const wave = Math.sin(t * 6 - j * 0.9 + s.n * 1.7);
        joint.rotation.z = (j === 0 ? 0 : j < 6 ? -0.28 : 0.42) + wave * 0.1;
        joint.rotation.x = Math.cos(t * 5.2 - j * 0.8 + s.n) * 0.32;
      });
      s.tongue.scale.y = Math.max(0.001, Math.sin(t * 11 + s.n * 2));
    }
    all.position.set(out * jitter(t, 1) * 0.008 + rage * jitter(t, 2) * 0.012, 0, 0);
    all.rotation.z = calm * Math.sin(t * 1.9) * 0.025 + out * Math.sin(t * 5) * 0.04;
  });
};

// a genie in a bottle: teal glass, corked, smoke turning inside / gone magenta, the cork jumping,
// two yellow eyes in the smoke / red, the cork blown out and the genie risen out of the neck, scowling, fists up
const makeGenie = () => {
  const group = new THREE.Group();
  const glass = glassy(0x2fb8b0, 0.5), gold = lambert(0xe2b93a), corkMat = lambert(0xb98a5a), smokeMat = lambert(0x9a8ae8);
  const body = lambert(0x9a3ae0), dark = glow(0x1a0a2a), eyeMat = glow(0xffe23f);
  const all = sub(group);
  part(all, cyl(0.17, 0.22, 0.05, 14), gold, 0, 0.025, 0);
  const swirl = [0, 1, 2, 3, 4].map(() => part(all, sphere(0.1, 8, 6), smokeMat));
  const peep = sub(all, 0, 0.38, 0);
  const peepEyes = [0, Math.PI].flatMap(turn => [-1, 1].map(d => {
    const eye = part(peep, sphere(0.06, 8, 6), eyeMat, Math.cos(turn) * d * 0.09, 0, Math.cos(turn) * 0.2, 0, 0, d * Math.cos(turn) * 0.5);
    eye.scale.set(1.3, 0.55, 0.6);
    return eye;
  }));
  const belly = part(all, sphere(0.31, 16, 12), glass, 0, 0.34, 0);
  belly.renderOrder = 2;
  const neck = part(all, new THREE.CylinderGeometry(0.075, 0.13, 0.36, 12, 1, true), glass, 0, 0.78, 0);
  neck.renderOrder = 2;
  part(all, torus(0.135, 0.025, 14), gold, 0, 0.62, 0, FLAT);
  part(all, torus(0.085, 0.022, 12), gold, 0, 0.96, 0, FLAT);
  part(all, new THREE.TorusGeometry(0.13, 0.022, 5, 10, Math.PI), gold, 0.2, 0.72, 0, 0, 0, -FLAT);
  const cork = sub(all);
  part(cork, cyl(0.085, 0.065, 0.14, 10), corkMat);
  const puffs = [0, 1, 2].map(() => part(all, sphere(0.06, 7, 5), smokeMat));
  // the genie: a tail of smoke out of the neck, a chest, a head, two fists
  const genie = sub(all, 0, 0.94, 0);
  let chest = null;
  const tail = chain(genie, 4, 0.11, (joint, j) => {
    part(joint, sphere(0.075 + j * 0.035, 9, 7), body, 0, 0.05, 0);
    if (j === 3) chest = sub(joint, 0, 0.2, 0);
  });
  part(chest, sphere(0.23, 12, 10), body).scale.set(1.3, 1, 0.8);
  part(chest, torus(0.2, 0.03, 14), gold, 0, -0.14, 0, FLAT).scale.set(1.2, 0.75, 1);
  const head = sub(chest, 0, 0.36, 0.02);
  part(head, sphere(0.17, 12, 10), body);
  for (const d of [-1, 1]) {
    part(head, sphere(0.05, 8, 6), eyeMat, d * 0.07, 0.02, 0.14, 0, 0, d * 0.5).scale.set(1.3, 0.6, 0.6);
    part(head, box(0.12, 0.035, 0.03), dark, d * 0.075, 0.075, 0.155, 0, 0, d * -0.55);
    part(head, torus(0.04, 0.012, 8), gold, d * 0.18, -0.06, 0, 0, FLAT, 0);
    part(head, sphere(0.045, 6, 5), body, d * 0.17, 0, 0).scale.set(0.5, 1.4, 1);
  }
  part(head, box(0.14, 0.03, 0.03), dark, 0, -0.08, 0.155);
  part(head, cone(0.06, 0.2, 6), dark, 0, -0.2, 0.1, Math.PI);
  part(head, torus(0.05, 0.02, 8), gold, 0, 0.17, 0, FLAT);
  part(head, cone(0.05, 0.22, 6), dark, 0, 0.3, -0.02, -0.3);
  const arms = [-1, 1].map(d => {
    const arm = sub(chest, d * 0.28, 0.08, 0);
    part(arm, capsule(0.075, 0.2), body, 0, 0.15, 0);
    part(arm, torus(0.085, 0.025, 10), gold, 0, 0.27, 0, FLAT);
    part(arm, sphere(0.12, 9, 7), body, 0, 0.38, 0);
    return { arm, d };
  });
  return stated(group, (t, stir, rage) => {
    const calm = clamp01(1 - stir - rage), up = clamp01(stir + rage);
    tint3(glass, 0x2fb8b0, 0xd040d0, 0xff3a30, stir, rage);
    tint3(smokeMat, 0xa89cf0, 0xff70d8, 0xff7a4a, stir, rage);
    glass.opacity = 0.5 - stir * 0.12;
    swirl.forEach((s, k) => {
      const a = t * mix(1.2, 5, up) + k * 1.26;
      s.position.set(Math.sin(a) * 0.14, 0.26 + (k % 3) * 0.08 + Math.sin(t * 2 + k) * 0.03, Math.cos(a) * 0.14);
      show(s, 0.9 + Math.sin(t * 3 + k * 2) * 0.2 + up * 0.25);
    });
    peep.position.y = 0.38 + Math.sin(t * 2.3) * 0.03;
    for (const e of peepEyes) e.scale.set(1.3 * Math.max(0.001, stir), 0.55 * Math.max(0.001, stir) * (Math.sin(t * 1.7) > 0.93 ? 0.2 : 1), 0.6 * Math.max(0.001, stir));
    // the cork: in / jumping in the neck / blown out, tumbling about above
    cork.position.set(rage * (0.55 + Math.sin(t * 2.9) * 0.1), 1 + stir * Math.abs(Math.sin(t * 11)) * 0.09 + rage * (0.25 + Math.abs(Math.sin(t * 4.4)) * 0.3), rage * Math.cos(t * 2.9) * 0.15);
    cork.rotation.set(rage * t * 6, 0, stir * jitter(t, 1) * 0.3 + rage * t * 4);
    cycle(puffs, t, 1.1, (p, u, k) => { p.position.set(Math.sin(k * 2.2 + t) * (0.08 + u * 0.12), 1 + u * 0.3, Math.cos(k * 2.2) * 0.1); show(p, stir * (0.5 + u) * (1 - u) * 2); });
    show(genie, rage);
    tail.forEach((joint, j) => { joint.rotation.z = Math.sin(t * 3.4 - j * 0.9) * 0.2; joint.rotation.x = Math.cos(t * 2.7 - j * 0.8) * 0.12; });
    chest.rotation.z = -Math.sin(t * 3.4 - 2.7) * 0.3;
    head.rotation.set(0.2, Math.sin(t * 2.1) * 0.3, 0);
    arms[0].arm.rotation.set(0, 0, 0.55 + Math.sin(t * 9) * 0.2);
    arms[1].arm.rotation.set(1.1 + Math.sin(t * 5) * 0.2, 0, -0.3);
    all.position.set(stir * jitter(t, 1) * 0.012 + rage * jitter(t, 2) * 0.012, stir * Math.abs(Math.sin(t * 11)) * 0.015, 0);
    all.rotation.z = calm * Math.sin(t * 1.3) * 0.015 + stir * Math.sin(t * 13) * 0.04 + rage * Math.sin(t * 9) * 0.04;
  });
};

// an unstable reactor core: a canister, the rod blue, three blue rings level round it / the rings
// yellow and tumbling, the rod yellow, a red lamp flashing / white hot, off the ground, arcs of lightning out of it
const makeReactor = () => {
  const group = new THREE.Group();
  const metal = lambert(0x3f4856), stripe = lambert(0xffd23f), coreMat = glow(0x3ad0ff), haloMat = haze(0x3ad0ff, 0.4), ringMat = glow(0x3ad0ff);
  const lampMat = glow(0x3a0d0d), arcMat = glow(0xdff4ff);
  const all = sub(group);
  for (const [y, top, bottom] of [[0.07, 0.3, 0.34], [0.93, 0.34, 0.3]]) {
    part(all, cyl(top, bottom, 0.14, 16), metal, 0, y, 0);
    part(all, cyl(0.345, 0.345, 0.035, 16), stripe, 0, y < 0.5 ? 0.12 : 0.88, 0);
  }
  const lamp = part(all, sphere(0.075, 8, 6), lampMat, 0, 1.03, 0);
  const core = part(all, capsule(0.085, 0.42), coreMat, 0, 0.5, 0);
  const halo = part(all, sphere(0.19, 12, 8), haloMat, 0, 0.5, 0);
  const glass = part(all, tube(0.21, 0.72, 16), glassy(0xcfeaff, 0.2), 0, 0.5, 0);
  glass.renderOrder = 2;
  const rings = [0, 1, 2].map(k => {
    const ring = sub(all, 0, 0.5, 0);
    part(ring, torus(0.31 + k * 0.045, 0.024, 24), ringMat);
    part(ring, sphere(0.05, 8, 6), ringMat, 0.31 + k * 0.045, 0, 0);
    return { ring, k, spin: k * 2 };
  });
  const arcs = [0, 1, 2, 3, 4].map(() => { const pivot = sub(all, 0, 0.5, 0); zigzag(pivot, arcMat, 5, 0.2, 0.04); return pivot; });
  const shadow = part(group, new THREE.CircleGeometry(0.36, 16), haze(0x000000, 0.35), 0, 0.006, 0, -FLAT);
  return stated(group, (t, fast, rage, dt) => {
    const calm = clamp01(1 - fast - rage), up = clamp01(fast + rage), beat = 0.5 + 0.5 * Math.sin(t * mix(mix(2, 9, fast), 23, rage));
    tint3(coreMat, 0x3ad0ff, 0xffd23f, 0xffffff, fast, rage);
    tint3(haloMat, 0x3ad0ff, 0xffb02e, 0xffffff, fast, rage);
    tint3(ringMat, 0x3ad0ff, 0xffd23f, 0xff7a1a, fast, rage);
    tint(metal, 0x3f4856, 0xb04a3a, rage * (0.6 + beat * 0.4));
    halo.scale.set(1 + up * 0.15 + rage * 0.7 + beat * 0.12, 1.8 + rage * 0.3, 1 + up * 0.15 + rage * 0.7 + beat * 0.12);
    core.scale.set(1 + rage * 0.6, 1, 1 + rage * 0.6);
    tint(lampMat, 0x3a0d0d, 0xff2010, up * (Math.sin(t * mix(8, 19, rage)) > 0 ? 1 : 0));
    lamp.scale.setScalar(1 + up * 0.5);
    for (const r of rings) {
      r.spin += dt * mix(mix(1.2, 7, fast), 13, rage) * (r.k % 2 ? -1 : 1);
      // level, stacked up the canister / tumbling round its middle
      r.ring.position.y = 0.5 + calm * (r.k - 1) * 0.22;
      r.ring.rotation.set(FLAT + up * Math.sin(r.spin * 0.7 + r.k * 2) * (0.6 + rage * 0.7), 0, r.spin);
      r.ring.rotation.y = up * Math.cos(r.spin * 0.5 + r.k) * (0.5 + rage * 0.6);
      show(r.ring, 1 + rage * (0.15 + beat * 0.1));
    }
    arcs.forEach((arc, k) => {
      const tick = Math.floor(t * 14 + k * 0.37), on = (tick * 7 + k * 3) % 5 < 4;
      arc.rotation.set((tick * 2.39 + k) % 6.28, (tick * 1.61 + k * 2) % 6.28, 0);
      arc.scale.set(Math.max(0.001, rage * (on ? 1 : 0)), Math.max(0.001, rage * (on ? 0.85 + (tick % 3) * 0.2 : 0)), Math.max(0.001, rage));
    });
    const lift = rage * (0.24 + Math.sin(t * 3) * 0.05);
    all.position.set(fast * jitter(t, 1) * 0.008 + rage * jitter(t, 2) * 0.02, lift, 0);
    all.rotation.z = fast * Math.sin(t * 14) * 0.015 + rage * Math.sin(t * 5) * 0.07;
    show(shadow, rage);
  });
};

// an angry goose in a crate: only its beak at the hole / a plank of the lid pushed up and its neck
// out of the top, hissing, swaying / up on the crate, the lid thrown off, wings wide, neck down and out, snapping
const makeGoose = () => {
  const group = new THREE.Group();
  const wood = lambert(0xc9a05a), plank = lambert(0xa87f3e), white = lambert(0xffffff), orange = lambert(0xff8a1a), grey = lambert(0xc4ccd6), black = glow(0x14100c);
  const all = sub(group);
  part(all, box(0.72, 0.5, 0.58), wood, 0, 0.25, 0);
  for (const y of [0.17, 0.34]) part(all, box(0.726, 0.014, 0.586), plank, 0, y, 0);
  for (const x of [-0.34, 0.34]) for (const z of [-0.27, 0.27]) part(all, box(0.07, 0.52, 0.07), plank, x, 0.26, z);
  part(all, new THREE.CircleGeometry(0.12, 14), black, 0, 0.28, 0.292);
  const peek = sub(all, 0, 0.28, 0.25);
  part(peek, cone(0.055, 0.2, 6), orange, 0, 0, 0.08, FLAT).scale.z = 0.7;
  const lids = [-0.245, 0, 0.245].map((x, k) => {
    const hinge = sub(all, x, 0.52, -0.3);
    part(hinge, box(0.235, 0.035, 0.6), plank, 0, 0, 0.3);
    return { hinge, x, k };
  });
  const goose = sub(all);
  part(goose, sphere(0.24, 12, 10), white).scale.set(0.9, 0.85, 1.35);
  part(goose, cone(0.12, 0.26, 6), white, 0, 0.1, -0.33, -1.1);
  const wings = [1, -1].map(d => {
    const root = sub(goose, d * 0.16, 0.08, 0);
    part(root, sphere(0.3, 10, 6), white, d * 0.3, 0, 0).scale.set(1.15, 0.1, 0.6);
    part(root, sphere(0.16, 8, 5), grey, d * 0.56, 0, -0.03).scale.set(1, 0.1, 0.8);
    return { root, d };
  });
  const feet = [-1, 1].map(d => {
    const foot = sub(goose, d * 0.11, -0.12, 0.05);
    part(foot, cyl(0.022, 0.022, 0.16, 5), orange, 0, -0.07, 0);
    part(foot, box(0.11, 0.02, 0.14), orange, 0, -0.15, 0.04);
    return foot;
  });
  const neckRoot = sub(goose, 0, 0.1, 0.2);
  let head = null;
  const neck = chain(neckRoot, 5, 0.115, (joint, j) => {
    part(joint, sphere(0.065, 8, 6), white, 0, 0.055, 0).scale.y = 1.35;
    if (j === 4) head = sub(joint, 0, 0.15, 0);
  });
  part(head, sphere(0.09, 10, 8), white).scale.z = 1.2;
  part(head, cone(0.05, 0.2, 6), orange, 0, 0.005, 0.17, FLAT).scale.z = 0.5;
  const jaw = sub(head, 0, -0.03, 0.07);
  part(jaw, box(0.06, 0.016, 0.16), orange, 0, 0, 0.08);
  part(jaw, box(0.035, 0.012, 0.12), lambert(0xff5f8a), 0, 0.012, 0.07);
  for (const d of [-1, 1]) {
    part(head, sphere(0.022, 6, 5), black, d * 0.065, 0.03, 0.05);
    part(head, box(0.07, 0.02, 0.02), black, d * 0.06, 0.065, 0.06, 0, d * 0.5, d * -0.5);
  }
  return stated(group, (t, hiss, rage) => {
    const calm = clamp01(1 - hiss - rage), up = clamp01(hiss + rage);
    show(peek, calm);
    peek.position.z = 0.25 + Math.max(0, Math.sin(t * 1.3)) * 0.04;
    // the lid: nailed down / the middle plank pushed up / all three thrown off
    for (const { hinge, x, k } of lids) {
      const mid = k === 1;
      hinge.position.set(x + (mid ? 0 : rage * Math.sign(x) * 0.42), 0.52 - (mid ? 0 : rage * 0.5), -0.3 + (mid ? 0 : rage * 0.25));
      hinge.rotation.set(mid ? -(hiss * (0.95 + Math.abs(Math.sin(t * 7)) * 0.08) + rage * 2.3) : 0, mid ? 0 : rage * Math.sign(x) * 0.6, 0);
    }
    // the goose: shut in / its neck out / up on top
    goose.position.set(0, mix(0.24, 0.76, rage) + rage * Math.abs(Math.sin(t * 9)) * 0.06, rage * -0.04);
    goose.rotation.set(rage * 0.12, rage * Math.sin(t * 3.3) * 0.35, 0);
    show(neckRoot, up);
    neck.forEach((joint, j) => {
      joint.rotation.z = hiss * Math.sin(t * 3 - j * 0.5) * 0.11 + rage * Math.sin(t * 8 - j * 0.6) * 0.08;
      joint.rotation.x = hiss * (j === 0 ? -0.1 : Math.sin(t * 2.2 - j * 0.6) * 0.06) + rage * (0.26 + Math.sin(t * 10) * 0.07);
    });
    head.rotation.x = hiss * 0.15 - rage * 1.05;
    jaw.rotation.x = up * (0.3 + Math.abs(Math.sin(t * mix(5, 15, rage))) * 0.35);
    for (const { root, d } of wings) { show(root, rage); root.rotation.z = d * (0.35 + Math.sin(t * 13) * 0.45); root.rotation.y = d * -0.2; }
    for (const foot of feet) show(foot, rage);
    all.position.x = hiss * jitter(t, 1) * 0.008;
    all.rotation.z = hiss * Math.sin(t * 6) * 0.015;
  });
};

// a jack-in-the-box: shut, its handle turning by itself, a note or two / the handle spinning, the
// lid jumping on a violet light, notes pouring out / sprung: a leering clown lunging about on its spring
const makeJack = () => {
  const group = new THREE.Group();
  const red = lambert(0xd8262b), blue = lambert(0x2a5fd0), yellow = lambert(0xffd23f), white = lambert(0xfdf4f0), steelMat = lambert(0xaab2be);
  const light = glow(0xb040ff), noteMat = glow(0xfff2a0), eyeMat = glow(0xffe23f), dark = glow(0x14100c);
  const all = sub(group);
  part(all, box(0.6, 0.5, 0.6), red, 0, 0.25, 0);
  for (const x of [-0.29, 0.29]) for (const z of [-0.29, 0.29]) part(all, box(0.06, 0.51, 0.06), blue, x, 0.255, z);
  for (let k = 0; k < 4; k++) { const a = k * FLAT; part(all, box(0.22, 0.22, 0.012), yellow, Math.sin(a) * 0.302, 0.25, Math.cos(a) * 0.302, 0, a, Math.PI / 4); }
  part(all, box(0.54, 0.02, 0.54), light, 0, 0.495, 0);
  const crank = sub(all, 0.31, 0.3, 0);
  part(crank, cyl(0.022, 0.022, 0.12, 6), steelMat, 0.05, 0, 0, 0, 0, FLAT);
  part(crank, box(0.03, 0.17, 0.03), steelMat, 0.11, 0.07, 0);
  part(crank, sphere(0.045, 8, 6), yellow, 0.14, 0.15, 0);
  const lid = sub(all, 0, 0.5, -0.31);
  part(lid, box(0.64, 0.05, 0.64), blue, 0, 0.025, 0.32);
  part(lid, box(0.3, 0.012, 0.3), yellow, 0, 0.053, 0.32, 0, Math.PI / 4, 0);
  const notes = [0, 1, 2, 3, 4].map(() => {
    const note = sub(all);
    part(note, sphere(0.045, 6, 5), noteMat).scale.y = 0.75;
    part(note, box(0.014, 0.13, 0.014), noteMat, 0.038, 0.065, 0);
    part(note, box(0.06, 0.025, 0.014), noteMat, 0.065, 0.125, 0);
    return note;
  });
  // the clown, on its spring
  const jack = sub(all, 0, 0.5, 0);
  let top = null;
  const coils = chain(jack, 6, 0.1, (joint, j) => { part(joint, torus(0.11, 0.024, 14), steelMat, 0, 0, 0, FLAT + 0.12); if (j === 5) top = sub(joint, 0, 0.08, 0); });
  part(top, torus(0.15, 0.06, 12), yellow, 0, 0.02, 0, FLAT);
  for (const d of [-1, 1]) {
    const arm = sub(top, d * 0.14, 0.04, 0);
    part(arm, capsule(0.05, 0.2), d > 0 ? red : blue, d * 0.14, 0.02, 0.04, 0, 0, FLAT);
    part(arm, sphere(0.085, 8, 6), white, d * 0.32, 0.03, 0.06);
  }
  const head = sub(top, 0, 0.26, 0);
  part(head, sphere(0.21, 14, 10), white);
  part(head, sphere(0.065, 8, 6), red, 0, -0.01, 0.21);
  for (const d of [-1, 1]) {
    part(head, sphere(0.12, 8, 6), lambert(d > 0 ? 0x2fae5a : 0xff7a1a), d * 0.22, 0.08, -0.02);
    part(head, sphere(0.05, 8, 6), eyeMat, d * 0.08, 0.07, 0.175).scale.set(1, 1.3, 0.6);
    part(head, sphere(0.022, 6, 5), dark, d * 0.08, 0.07, 0.205);
    part(head, box(0.11, 0.028, 0.02), dark, d * 0.085, 0.145, 0.165, 0, 0, d * -0.5);
  }
  part(head, new THREE.TorusGeometry(0.11, 0.03, 6, 12, Math.PI), red, 0, -0.045, 0.165, 0, 0, Math.PI);
  for (let k = 0; k < 5; k++) part(head, box(0.03, 0.045, 0.02), white, (k - 2) * 0.042, -0.115 - Math.abs(k - 2) * -0.022, 0.185);
  part(head, cone(0.13, 0.34, 10), lambert(0x9a3ad0), 0, 0.33, -0.02, -0.15);
  part(head, sphere(0.055, 8, 6), yellow, 0, 0.5, -0.045);
  let wind = 0;
  return stated(group, (t, twitch, rage, dt) => {
    const calm = clamp01(1 - twitch - rage), up = clamp01(twitch + rage);
    wind += dt * mix(mix(2.2, 11, twitch), 4, rage);
    crank.rotation.x = wind;
    const jump = Math.max(0, Math.sin(t * 11)) * (Math.sin(t * 2.9) > -0.3 ? 1 : 0.25);
    lid.rotation.x = -(twitch * (0.12 + jump * 0.5) + rage * (2.1 + Math.sin(t * 9) * 0.08));
    tint(light, 0x5a2080, 0xd060ff, up * (0.6 + Math.sin(t * 14) * 0.4));
    cycle(notes, t, mix(0.3, 1.1, twitch), (note, u, k) => {
      const a = k * 2.4;
      note.position.set(Math.sin(a) * (0.2 + u * 0.3) + Math.sin(u * 9 + k) * 0.05, 0.62 + u * mix(0.45, 0.75, twitch), Math.cos(a) * 0.25);
      note.rotation.z = Math.sin(u * 7 + k) * 0.4;
      show(note, (calm * (k < 2 ? 0.9 : 0) + twitch * 1.5) * Math.min(1, u * 5) * (1 - u * 0.5));
    });
    // sprung: the coils opened out, bending as he lunges
    show(jack, rage);
    const lean = Math.sin(t * 4.6), nod = Math.cos(t * 3.7);
    coils.forEach((joint, j) => {
      if (j) joint.position.y = 0.1 * rage * (1 + Math.sin(t * 9.2) * 0.12);
      joint.rotation.z = lean * 0.13;
      joint.rotation.x = 0.07 + nod * 0.09;
    });
    top.rotation.set(-0.2, Math.sin(t * 2.3) * 0.4, -lean * 0.4);
    head.rotation.z = Math.sin(t * 9) * 0.12;
    all.position.set(twitch * jitter(t, 1) * 0.014 + rage * jitter(t, 2) * 0.012, twitch * jump * 0.03 + rage * Math.abs(Math.sin(t * 9.2)) * 0.04, 0);
    all.rotation.z = twitch * Math.sin(t * 17) * 0.03 + rage * lean * -0.05;
  });
};

// a thundercloud under a bell jar: a small pale cloud, drifting / swollen and dark, flickering
// from inside, the jar shaking / black, filling the jar, lightning through the glass, rain and a pool of it
const makeCloud = () => {
  const group = new THREE.Group();
  const woodMat = lambert(0x53301a), brass = lambert(0xd9a92e), glass = glassy(0xcfeaff, 0.2), cloudMat = lambert(0xe6eaf0), boltMat = glow(0xfff27a);
  const rainMat = glow(0x6ab8ff), pool = new THREE.MeshLambertMaterial({ color: 0x3f8fe0, transparent: true, opacity: 0.7, depthWrite: false });
  const flashMat = haze(0xfff8c0, 0.7), crackMat = glow(0xffffff);
  const all = sub(group);
  part(all, cyl(0.42, 0.45, 0.09, 18), woodMat, 0, 0.045, 0);
  part(all, torus(0.37, 0.02), brass, 0, 0.1, 0, FLAT);
  const water = part(all, cyl(0.35, 0.35, 1, 16).translate(0, 0.5, 0), pool, 0, 0.09, 0);
  water.renderOrder = 1;
  const cloud = sub(all, 0, 0.6, 0);
  const blobs = [[0, 0, 0, 0.16], [-0.16, -0.02, 0.02, 0.12], [0.16, -0.03, -0.02, 0.13], [0.07, 0.08, 0.05, 0.12], [-0.08, 0.07, -0.05, 0.12], [0, -0.03, 0.12, 0.11], [0.02, -0.02, -0.13, 0.11]].map(([x, y, z, r]) => part(cloud, sphere(r, 10, 8), cloudMat, x, y, z));
  const flash = part(cloud, sphere(0.2, 8, 6), flashMat);
  const bolts = [[0, 0.05], [-0.12, -0.08], [0.13, 0]].map(([x, z], k) => { const b = zigzag(all, boltMat, 4, 0.13, 0.035); b.position.set(x, 0.56, z); b.rotation.y = k * 1.1; return b; });
  const strikes = [[1, 0.5], [-1, 0.62], [1, 0.3]].map(([d, y], k) => { // (the ones that get out through the glass)
    const b = zigzag(all, boltMat, 3, 0.16, 0.035);
    b.position.set(d * 0.34, y, k === 2 ? 0.1 : -0.05);
    b.rotation.z = d * 1.35;
    return b;
  });
  const rain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => part(all, box(0.014, 0.09, 0.014), rainMat, Math.sin(k * 2.4) * (0.08 + (k % 3) * 0.08), 0, Math.cos(k * 2.4) * (0.08 + (k % 3) * 0.08)));
  const jar = sub(all);
  const wall = part(jar, tube(0.37, 0.62), glass, 0, 0.4, 0);
  wall.renderOrder = 2;
  const roof = part(jar, dome(0.37, 18, 6), glass, 0, 0.71, 0);
  roof.renderOrder = 2;
  part(jar, sphere(0.055, 8, 6), brass, 0, 1.1, 0);
  const cracks = sub(jar, 0, 0.66, 0);
  for (const [a, n] of [[0.3, 4], [1.9, 3], [-1.2, 4], [3.3, 3]]) { const c = zigzag(cracks, crackMat, n, 0.1, 0.014); c.position.set(Math.sin(a) * 0.375, 0, Math.cos(a) * 0.375); c.rotation.y = a; }
  return stated(group, (t, dark, rage) => {
    const calm = clamp01(1 - dark - rage), up = clamp01(dark + rage);
    const flick = Math.sin(t * 23) * Math.sin(t * 7.1) > mix(0.6, 0.45, rage) ? 1 : 0;
    tint3(cloudMat, 0xe6eaf0, 0x566070, 0x2a2440, dark, rage);
    cloudMat.emissive.setHex(0xfff2a0).multiplyScalar(flick * (dark * 0.4 + rage * 0.25));
    cloud.position.set(calm * Math.sin(t * 0.8) * 0.08 + up * jitter(t, 3) * 0.015, 0.6 + Math.sin(t * 1.1) * 0.03 + rage * 0.08, 0);
    cloud.scale.set(mix(mix(0.8, 1.2, dark), 1.42, rage), mix(mix(0.8, 1.25, dark), 1.5, rage), mix(mix(0.8, 1.2, dark), 1.42, rage));
    blobs.forEach((b, k) => b.scale.setScalar(1 + Math.sin(t * mix(1.5, 6, up) + k * 1.9) * 0.08));
    show(flash, up * flick * (0.8 + rage * 0.5));
    bolts.forEach((b, k) => { const on = Math.floor(t * 9 + k * 0.4) % 3 === k ? 1 : 0; b.scale.set(Math.max(0.001, rage * on), Math.max(0.001, rage * on), Math.max(0.001, rage)); });
    strikes.forEach((b, k) => { const on = Math.floor(t * 7 + k * 0.6) % 4 === k ? 1 : 0; b.scale.set(Math.max(0.001, rage * on), Math.max(0.001, rage * on * 1.15), Math.max(0.001, rage)); });
    cycle(rain, t, 2.2, (r, u, k) => { r.position.y = 0.5 - u * 0.36; show(r, rage); void k; });
    water.scale.set(Math.max(0.001, clamp01(rage * 3)), Math.max(0.001, rage * (0.11 + Math.sin(t * 5) * 0.01)), Math.max(0.001, clamp01(rage * 3)));
    show(cracks, rage);
    tint(glass, 0xcfeaff, 0xfff2a0, rage * flick * 0.6);
    all.position.set(dark * jitter(t, 1) * 0.014 + rage * jitter(t, 2) * 0.025, rage * Math.abs(Math.sin(t * 9)) * 0.06, 0);
    all.rotation.z = dark * Math.sin(t * 13) * 0.03 + rage * Math.sin(t * 10) * 0.07;
  });
};

// a tank of piranhas: four of them idling up and down / round and round fast, the water murky and
// churned white / the water red, the fish leaping clear of the tank, jaws wide, water thrown everywhere
const makePiranhas = () => {
  const group = new THREE.Group();
  const frame = lambert(0x22252b), glass = glassy(0xcfeaff, 0.16), back = lambert(0x6f8a96), bellyMat = lambert(0xe0303a), tooth = glow(0xffffff), eyeMat = glow(0xffffff);
  const water = new THREE.MeshLambertMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.5, depthWrite: false });
  const dropMat = glow(0x9ad4ff);
  const all = sub(group);
  part(all, box(0.96, 0.06, 0.5), frame, 0, 0.03, 0);
  for (const x of [-0.46, 0.46]) for (const z of [-0.23, 0.23]) part(all, box(0.035, 0.56, 0.035), frame, x, 0.33, z);
  for (const z of [-0.23, 0.23]) part(all, box(0.96, 0.035, 0.035), frame, 0, 0.6, z);
  for (const x of [-0.46, 0.46]) part(all, box(0.035, 0.035, 0.5), frame, x, 0.6, 0);
  part(all, box(0.9, 0.04, 0.44), lambert(0xe2c58f), 0, 0.08, 0);
  part(all, sphere(0.06, 8, 6), lambert(0xfdf4dc), 0.25, 0.13, 0.05).scale.set(1, 0.9, 1.1); // (what is left of the last delivery driver)
  for (const d of [-1, 1]) part(all, box(0.16, 0.025, 0.025), lambert(0xfdf4dc), -0.2, 0.11, 0, 0, d * 0.5, 0);
  const sea = part(all, box(0.89, 0.44, 0.43), water, 0, 0.32, 0);
  sea.renderOrder = 1;
  const pane = part(all, box(0.92, 0.54, 0.46), glass, 0, 0.33, 0);
  pane.renderOrder = 2;
  const fish = [0, 1, 2, 3].map((k) => {
    const f = sub(all);
    part(f, sphere(0.1, 10, 8), back).scale.set(0.5, 0.95, 1.3);
    part(f, sphere(0.085, 10, 8), bellyMat, 0, -0.035, 0.01).scale.set(0.52, 0.8, 1.2);
    part(f, cone(0.09, 0.13, 4), back, 0, 0, -0.17, -FLAT).scale.x = 0.25;
    part(f, cone(0.05, 0.09, 4), back, 0, 0.11, -0.02).scale.x = 0.25;
    for (const d of [-1, 1]) { part(f, sphere(0.026, 6, 5), eyeMat, d * 0.045, 0.025, 0.085); part(f, sphere(0.012, 5, 4), glow(0x0a0a0a), d * 0.062, 0.025, 0.095); }
    for (const x of [-0.025, 0, 0.025]) part(f, cone(0.012, 0.04, 4), tooth, x, -0.025, 0.125, Math.PI);
    const jaw = sub(f, 0, -0.045, 0.06);
    part(jaw, box(0.07, 0.03, 0.09), bellyMat, 0, 0, 0.035);
    for (const x of [-0.025, 0, 0.025]) part(jaw, cone(0.012, 0.045, 4), tooth, x, 0.035, 0.07);
    return { f, jaw, k, at: k * 1.6 };
  });
  const foam = [0, 1, 2, 3, 4, 5, 6].map(k => part(all, sphere(0.07, 7, 5), glow(0xffffff), -0.36 + k * 0.12, 0.55, (k % 2 ? 0.1 : -0.08)));
  const drops = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(() => part(all, sphere(0.04, 6, 5), dropMat));
  return stated(group, (t, fast, rage, dt) => {
    const up = clamp01(fast + rage);
    tint3(water, 0x3fa9f5, 0x4f8f86, 0xd8303a, fast, rage);
    tint(dropMat, 0x9ad4ff, 0xff6a6a, rage);
    tint(eyeMat, 0xffffff, 0xffe23f, rage);
    for (const p of fish) {
      p.at += dt * mix(mix(0.8, 5.5, fast), 6.5, rage) * (p.k % 2 ? 1 : -1);
      const x = Math.sin(p.at) * 0.3, z = Math.cos(p.at) * 0.1, dir = p.k % 2 ? 1 : -1;
      // furious: up out of the water and back, one after another
      const u = (t * 1.25 + p.k / 4) % 1, leap = rage * Math.sin(u * Math.PI);
      p.f.position.set(x, 0.2 + (p.k % 3) * 0.09 + Math.sin(t * 1.7 + p.k * 2) * 0.03 * (1 - rage) + leap * 0.8, z);
      p.f.rotation.set(-rage * Math.cos(u * Math.PI) * 1.1, Math.atan2(Math.cos(p.at) * 0.3 * dir, -Math.sin(p.at) * 0.1 * dir), 0, 'YXZ');
      show(p.f, 1 + rage * 0.4);
      p.jaw.rotation.x = 0.1 + fast * Math.abs(Math.sin(t * 6 + p.k)) * 0.3 + rage * (0.5 + Math.abs(Math.sin(t * 14 + p.k)) * 0.6);
    }
    foam.forEach((f, k) => { f.position.y = 0.54 + Math.sin(t * 9 + k * 1.9) * 0.03 * up; show(f, up * (0.7 + Math.abs(Math.sin(t * 7 + k * 2.3)) * 0.7)); f.scale.y *= 0.6; });
    cycle(drops, t, 1.5, (d, u, k) => {
      const a = k * 2.4 + Math.floor(t * 1.5 + k / 10) * 1.3;
      d.position.set(Math.sin(a) * (0.2 + u * 0.5), 0.56 + u * 1 - u * u * 0.95, Math.cos(a) * (0.1 + u * 0.4));
      show(d, rage * (1.3 - u * 0.6));
    });
    all.position.set(fast * jitter(t, 1) * 0.01 + rage * jitter(t, 2) * 0.03, rage * Math.abs(Math.sin(t * 9)) * 0.05, 0);
    all.rotation.z = fast * Math.sin(t * 5) * 0.03 + rage * Math.sin(t * 11) * 0.07;
  });
};

// these models, by their ids in cargo.js
export const EVIL2_MODELS = {
  egg: makeEgg, cooker: makeCooker, flytrap: makeFlytrap, barrel: makeBarrel, mirror: makeMirror,
  skunk: makeSkunk, cannonball: makeCannonball, mimic: makeMimic, fireworks: makeFireworks, alien: makeAlien,
  teddy: makeTeddy, bats: makeBats, ice: makeIce, snakes: makeSnakes, genie: makeGenie,
  reactor: makeReactor, goose: makeGoose, jack: makeJack, cloud: makeCloud, piranhas: makePiranhas,
};
