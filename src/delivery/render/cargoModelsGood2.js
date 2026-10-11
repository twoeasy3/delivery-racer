// ---- more of the cargo's models: twenty more Good things ------------------------------------------
// Spread into CARGO_MODELS by cargoModels.js, and made to the same pattern as its five: a group
// standing on y = 0, facing +z, about a metre tall, with userData.animate(t) posing it for that moment
// (one small idle movement each, which comes round smoothly). Plain three.js, no state, nothing of the
// game's: the ids are those of cargo.js.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const shiny = (color, extra) => new THREE.MeshPhongMaterial({ color, shininess: 90, ...extra });
const glow = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const glassy = (color = 0xcfeaff, opacity = 0.25) => new THREE.MeshPhongMaterial({ color, transparent: true, opacity, shininess: 120, depthWrite: false, side: THREE.DoubleSide });
const sphere = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (top, bottom, h, n = 14) => new THREE.CylinderGeometry(top, bottom, h, n);
const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
const torus = (R, r, n = 18, m = 6, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, m, n, arc);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// a shape turned on a lathe: its outline as [radius, height] pairs, bottom to top
const lathe = (points, n = 18) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), n);
const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const u = clamp01(v); return u * u * (3 - 2 * u); };
const tiny = (v) => Math.max(0.001, v);
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
// a rod from one point to another
const UP = new THREE.Vector3(0, 1, 0);
const rod = (parent, from, to, r, material, r2 = r) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const mesh = part(parent, cyl(r2, r, d.length(), 8), material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  return mesh;
};
// a twinkle: a star of light with a point along every axis, so it shows from any side
const star = (parent, color = 0xffffff) => {
  const g = sub(parent), geometry = new THREE.OctahedronGeometry(1), material = glow(color);
  for (const s of [[1, 0.16, 0.16], [0.16, 1, 0.16], [0.16, 0.16, 1]]) part(g, geometry, material).scale.set(...s);
  return g;
};
// puffs of steam, and one of them `u` (0 .. 1) of the way up from (x, y, z): it grows and thins as it goes
const puffs = (parent, n, r = 0.06) => Array.from({ length: n }, () => part(parent, sphere(r, 7, 5), glow(0xffffff, { transparent: true, opacity: 0.5, depthWrite: false })));
const rise = (puff, u, x, y, z, h = 0.4, strength = 0.5) => {
  puff.position.set(x, y + u * h, z);
  puff.scale.setScalar(0.4 + u);
  puff.material.opacity = strength * Math.min(1, u * 8) * (1 - u);
};
// a drip that runs down from where it hangs (its group's origin), a bead at its tip: `u` 0 .. 1 of its run
const drip = (parent, material, r, x, y, z) => {
  const g = sub(parent, x, y, z);
  const run = part(g, cyl(r, r, 1, 6).translate(0, -0.5, 0), material), bead = part(g, sphere(r * 1.5, 7, 5), material);
  g.userData.run = (u, length) => {
    const len = Math.max(0.01, length * ease(u / 0.8)), thin = 1 - ease((u - 0.82) / 0.18);
    run.scale.set(tiny(thin), len, tiny(thin));
    bead.position.y = -len;
    bead.scale.setScalar(tiny(thin));
  };
  return g;
};
// it only idles
const idle = (group, pose) => {
  group.userData.animate = pose;
  pose(0);
  return group;
};

// C1 a tray of coffees: four paper cups in a pulp holder. Steam curls from two, and one lid rattles
const makeCoffee = () => {
  const group = new THREE.Group();
  const pulp = lambert(0xb89a6e), paper = lambert(0xfffaf0), sleeve = lambert(0x9a6234), black = lambert(0x2b211c), green = lambert(0x2f9e4f);
  part(group, box(0.92, 0.07, 0.92), pulp, 0, 0.035, 0);
  part(group, box(0.98, 0.04, 0.98), pulp, 0, 0.1, 0);
  const lids = [];
  [[-1, -1, 0.5], [1, -1, 0.6], [-1, 1, 0.52], [1, 1, 0.44]].forEach(([dx, dz, h]) => {
    const cup = sub(group, dx * 0.23, 0.07, dz * 0.23);
    part(cup, cyl(0.19, 0.13, h, 16), paper, 0, h / 2, 0);
    part(cup, cyl(0.182, 0.16, h * 0.4, 16), sleeve, 0, h * 0.55, 0);
    part(cup, sphere(0.06, 10, 6), green, 0, h * 0.55, 0.165).scale.z = 0.25;
    const lid = sub(cup, 0, h, 0);
    part(lid, cyl(0.2, 0.2, 0.04, 16), black, 0, 0.02, 0);
    part(lid, cyl(0.15, 0.18, 0.045, 16), black, 0, 0.06, 0);
    lid.userData.top = 0.07 + h + 0.09;
    lids.push(lid);
  });
  const steam = puffs(group, 4, 0.07);
  return idle(group, (t) => {
    // (the rattling lid: in fits, with a moment's peace between them)
    const fit = Math.pow(Math.max(0, Math.sin(t * 1.5)), 2);
    lids[2].rotation.z = Math.sin(t * 27) * 0.13 * fit;
    lids[2].rotation.x = Math.cos(t * 23) * 0.09 * fit;
    lids[2].position.y = 0.52 + Math.abs(Math.sin(t * 27)) * 0.035 * fit;
    steam.forEach((s, k) => {
      const lid = lids[k < 2 ? 1 : 3], u = (t * 0.45 + k * 0.5 + (k < 2 ? 0 : 0.25)) % 1;
      rise(s, u, lid.parent.position.x + Math.sin(t * 2.2 + k) * 0.05 * u, lid.userData.top, lid.parent.position.z, 0.5);
    });
  });
};

// C2 a bunch of balloons tied to a weight, bobbing and tugging at their strings
const makeBalloons = () => {
  const group = new THREE.Group();
  const string = lambert(0xe8e8e8);
  part(group, cyl(0.07, 0.15, 0.16, 12), lambert(0xd8262b), 0, 0.08, 0);
  part(group, torus(0.05, 0.015, 12), lambert(0xe9b93a), 0, 0.19, 0);
  const balloons = [[0xe0304a, 0.3, 0.5, 1.0], [0xffd23f, 1.7, 0.42, 1.12], [0x2f8fe0, 2.9, 0.5, 0.95], [0x3fb85a, 4.2, 0.4, 1.08], [0xff7ab6, 5.4, 0.5, 0.86], [0xff8a1a, 0, 0.04, 1.3]].map(([color, turn, lean, length], k) => {
    const round = sub(group, 0, 0.2, 0);
    round.rotation.y = turn;
    const tug = sub(round);
    part(tug, cyl(0.007, 0.007, length, 4), string, 0, length / 2, 0);
    const bag = sub(tug, 0, length, 0);
    const skin = shiny(color);
    part(bag, sphere(0.23, 14, 10), skin, 0, 0.25, 0).scale.set(1, 1.18, 1);
    part(bag, cone(0.04, 0.06, 8), skin, 0, -0.02, 0, Math.PI);
    return { tug, bag, lean, length, k };
  });
  return idle(group, (t) => {
    for (const b of balloons) {
      b.tug.rotation.z = b.lean + Math.sin(t * 1.3 + b.k * 1.9) * 0.07;
      b.tug.rotation.x = Math.sin(t * 1.1 + b.k * 2.7) * 0.07;
      // (a tug: up the string a little and back)
      b.bag.position.y = b.length + Math.sin(t * 2.6 + b.k * 1.3) * 0.025;
      b.bag.rotation.z = -b.lean * 0.6 + Math.sin(t * 1.9 + b.k) * 0.08;
    }
  });
};

// C3 a birthday present with a huge bow: the bow's tails flutter, and whatever is inside makes it hop
const makePresent = () => {
  const group = new THREE.Group();
  const wrap = lambert(0x2f8fe0), lidWrap = lambert(0x2478c8), ribbon = lambert(0xffd23f), spot = lambert(0xffffff);
  const all = sub(group);
  part(all, box(0.74, 0.52, 0.74), wrap, 0, 0.26, 0);
  part(all, box(0.13, 0.525, 0.75), ribbon, 0, 0.26, 0);
  part(all, box(0.75, 0.525, 0.13), ribbon, 0, 0.26, 0);
  for (const [x, y] of [[-0.24, 0.15], [-0.2, 0.38], [0.2, 0.14], [0.25, 0.36]]) {
    for (const turn of [0, 1, 2, 3]) { // (spots, on all four sides)
      const side = sub(all);
      side.rotation.y = turn * FLAT;
      part(side, sphere(0.05, 8, 6), spot, x, y, 0.37).scale.z = 0.2;
    }
  }
  const lid = sub(all, 0, 0.52, 0);
  part(lid, box(0.82, 0.14, 0.82), lidWrap, 0, 0.07, 0);
  part(lid, box(0.14, 0.145, 0.83), ribbon, 0, 0.07, 0);
  part(lid, box(0.83, 0.145, 0.14), ribbon, 0, 0.07, 0);
  const loops = [-1, 1].map((d) => {
    const loop = part(lid, torus(0.15, 0.03, 14, 6), ribbon, d * 0.2, 0.3, 0, 0, 0, d * -0.5);
    loop.scale.set(1.3, 0.85, 3.4);
    return loop;
  });
  part(lid, sphere(0.09, 10, 8), ribbon, 0, 0.22, 0);
  const tails = [-1, 1].map((d) => {
    const lie = sub(lid, 0, 0.15, 0); // (each lies across the lid to its edge, and hangs over it)
    lie.rotation.y = d * 0.45;
    part(lie, box(0.13, 0.02, 0.44), ribbon, 0, 0, 0.24);
    const tail = sub(lie, 0, 0, 0.46);
    part(tail, box(0.13, 0.28, 0.02), ribbon, 0, -0.14, 0);
    return tail;
  });
  return idle(group, (t) => {
    const u = t % 2.8;
    // (a tremble, then a hop and a smaller one)
    const hop = u < 0.36 ? Math.sin(u / 0.36 * Math.PI) : u < 0.6 ? Math.sin((u - 0.36) / 0.24 * Math.PI) * 0.3 : 0;
    all.position.y = hop * 0.16;
    all.rotation.z = (u < 0.6 ? Math.sin(u * 26) * 0.06 * (1 - u / 0.6) : 0) + (u > 2.4 ? Math.sin(t * 41) * 0.012 : 0);
    lid.position.y = 0.52 + hop * 0.07;
    lid.rotation.x = -hop * 0.1;
    tails.forEach((tail, k) => { tail.rotation.x = -0.2 - (0.5 + 0.5 * Math.sin(t * 6.5 + k * 2)) * 0.5 - hop * 0.6; });
    loops.forEach((loop, k) => { loop.scale.y = 0.85 + Math.sin(t * 4 + k * Math.PI) * 0.05 + hop * 0.12; });
  });
};

// C4 a bouquet in a vase: the flowers nod, and a petal falls from one and grows back
const makeBouquet = () => {
  const group = new THREE.Group();
  const china = lambert(0x5fb3e6, { side: THREE.DoubleSide }), green = lambert(0x3f9b4b), yellow = lambert(0xffd23f);
  part(group, lathe([[0.001, 0], [0.16, 0], [0.2, 0.04], [0.27, 0.2], [0.25, 0.34], [0.13, 0.5], [0.1, 0.58], [0.15, 0.66]]), china);
  part(group, torus(0.272, 0.022, 20), lambert(0xfffaf0), 0, 0.22, 0, FLAT);
  part(group, torus(0.15, 0.02, 16), lambert(0xfffaf0), 0, 0.66, 0, FLAT);
  const flowers = [[0xe0304a, 0, 0.02, 0.62], [0xff7ab6, FLAT, 0.5, 0.5], [0xffffff, FLAT + 1.2, 0.42, 0.56], [0xb46ae0, FLAT + 2.4, 0.5, 0.48], [0xffa23a, FLAT + 3.5, 0.44, 0.54], [0xff5fa2, FLAT + 4.6, 0.52, 0.47], [0xfff08a, FLAT + 5.5, 0.3, 0.6]].map(([color, turn, lean, length], k) => {
    const round = sub(group, 0, 0.6, 0);
    round.rotation.y = turn;
    const stem = sub(round);
    part(stem, cyl(0.014, 0.014, length, 5), green, 0, length / 2, 0);
    const head = sub(stem, 0, length, 0), petalMat = lambert(color), petals = [];
    for (let n = 0; n < 7; n++) {
      const a = n / 7 * Math.PI * 2, petal = part(head, sphere(0.085, 8, 6), petalMat, Math.sin(a) * 0.11, 0, Math.cos(a) * 0.11);
      petal.scale.set(1, 0.4, 1);
      petals.push(petal);
    }
    part(head, sphere(0.075, 8, 6), color === 0xfff08a ? lambert(0xff8a1a) : yellow, 0, 0.025, 0);
    part(head, cone(0.08, 0.09, 8), green, 0, -0.045, 0, Math.PI);
    return { stem, head, lean, petals, petalMat, k };
  });
  for (const [turn, lean] of [[0.4, 1.0], [2.5, 1.1], [4.4, 0.95]]) { // leaves, drooping over the lip
    const round = sub(group, 0, 0.62, 0);
    round.rotation.y = turn;
    part(round, sphere(0.1, 8, 6), green, -0.2, 0.12, 0, 0, 0, lean).scale.set(0.55, 2.4, 0.25);
  }
  // the petal that falls: the pink flower's (the one leaning out at the front), and a loose one to do the falling
  const shed = flowers[1], loose = part(group, sphere(0.085, 8, 6), shed.petalMat), from = new THREE.Vector3();
  const pose = (t) => {
    for (const f of flowers) {
      f.stem.rotation.z = f.lean + Math.sin(t * 1.3 + f.k * 1.7) * 0.05;
      f.head.rotation.z = (f.k ? 0.75 : 0.1) + Math.sin(t * 1.9 + f.k * 2.3) * 0.14;
    }
    const u = (t * 0.2) % 1, grown = ease((u - 0.45) / 0.45), fall = clamp01(u / 0.42);
    shed.petals[1].scale.set(tiny(grown), tiny(grown * 0.4), tiny(grown));
    group.updateMatrixWorld(true);
    group.worldToLocal(shed.petals[1].getWorldPosition(from));
    const gone = tiny(1 - ease((fall - 0.85) / 0.15));
    loose.position.set(from.x + Math.sin(fall * 9) * 0.1 * fall, mix(from.y, 0.02, fall * fall * 0.6 + fall * 0.4), from.z + fall * 0.14 + Math.sin(fall * 7) * 0.05);
    loose.rotation.set(fall * 5, 0, fall * 3.3);
    loose.scale.set(gone, gone * 0.4, gone);
  };
  return idle(group, pose);
};

// C5 a stack of pancakes, a pat of butter on top: it wobbles, and the syrup drips slowly down the side
const makePancakes = () => {
  const group = new THREE.Group();
  const batter = lambert(0xecc070), browned = lambert(0xc47f2e), syrup = shiny(0x8a3f0c);
  part(group, cyl(0.56, 0.42, 0.05, 22), lambert(0xfdfdfd), 0, 0.025, 0);
  part(group, torus(0.55, 0.018, 22), lambert(0x6fb7e8), 0, 0.05, 0, FLAT);
  const cakes = [];
  let parent = group;
  for (let k = 0; k < 7; k++) {
    const cake = sub(parent, [0, 0.02, -0.03, 0.025, -0.015, 0.03, -0.01][k], k ? 0.1 : 0.05, [0, -0.02, 0.02, 0.01, -0.025, 0, 0.015][k]);
    const r = 0.41 - (k % 3) * 0.012;
    part(cake, cyl(r, r, 0.07, 20), batter, 0, 0.05, 0);
    part(cake, cyl(r - 0.03, r, 0.016, 20), browned, 0, 0.092, 0);
    part(cake, cyl(r, r - 0.03, 0.016, 20), browned, 0, 0.008, 0);
    cakes.push(cake);
    parent = cake;
  }
  const top = cakes[6];
  part(top, sphere(0.3, 16, 8), syrup, 0, 0.098, 0).scale.set(1, 0.06, 1);
  const butter = part(top, box(0.16, 0.06, 0.16), lambert(0xfff07a), 0.02, 0.135, 0.02, 0, 0.5, 0);
  // the syrup's runs, from the top one's edge
  const drips = [[0.4, 0.42, 0], [1.9, 0.3, 0.3], [3.4, 0.5, 0.55], [4.9, 0.36, 0.8], [5.7, 0.26, 0.15]].map(([a, length, late]) => {
    part(top, sphere(0.085, 8, 6), syrup, Math.sin(a) * 0.36, 0.098, Math.cos(a) * 0.36).scale.set(1, 0.12, 1);
    const d = drip(top, syrup, 0.03, Math.sin(a) * 0.4, 0.1, Math.cos(a) * 0.4);
    return { d, length, late };
  });
  return idle(group, (t) => {
    cakes.forEach((cake, k) => { if (k) { cake.rotation.z = Math.sin(t * 2.3 - k * 0.45) * 0.014; cake.rotation.x = Math.cos(t * 1.9 - k * 0.4) * 0.009; } });
    butter.position.x = 0.02 + Math.sin(t * 2.3 - 3.4) * 0.025;
    for (const { d, length, late } of drips) d.userData.run((t * 0.11 + late) % 1, length);
  });
};

// C6 an ice-cream sundae in a tall glass: the cherry slides off the top, stops, and slides back up; it drips
const makeSundae = () => {
  const group = new THREE.Group();
  const glass = glassy(0xe8f6ff, 0.3), cream = lambert(0xfffaf0), pink = lambert(0xff9ec0), choc = lambert(0x6a3a20), vanilla = lambert(0xfff0b8);
  // what is in the glass, in layers
  part(group, cyl(0.135, 0.075, 0.1, 16), choc, 0, 0.35, 0);
  part(group, cyl(0.2, 0.135, 0.1, 16), cream, 0, 0.45, 0);
  part(group, cyl(0.285, 0.2, 0.14, 16), pink, 0, 0.57, 0);
  const cup = part(group, lathe([[0.001, 0], [0.22, 0], [0.22, 0.03], [0.045, 0.07], [0.04, 0.24], [0.1, 0.3], [0.3, 0.62], [0.335, 0.72]]), glass);
  cup.renderOrder = 2;
  // the scoops, the sauce and the cream
  for (const [a, material] of [[0.5, pink], [2.6, lambert(0x8a5230)], [4.7, vanilla]]) part(group, sphere(0.185, 14, 10), material, Math.sin(a) * 0.15, 0.74, Math.cos(a) * 0.15);
  part(group, sphere(0.19, 14, 10), vanilla, 0, 0.93, 0);
  part(group, new THREE.SphereGeometry(0.2, 14, 6, 0, Math.PI * 2, 0, 0.95), choc, 0, 0.93, 0);
  for (const [r, y] of [[0.13, 1.1], [0.095, 1.17], [0.06, 1.23]]) part(group, sphere(r, 12, 8), cream, 0, y, 0).scale.y = 0.75;
  const bits = [0xffd23f, 0x2f8fe0, 0x3fb85a, 0xff5fa2, 0xffffff];
  for (let k = 0; k < 14; k++) { // (sprinkles)
    const a = k * 2.4, y = 0.84 + (k % 5) * 0.035, r = Math.sqrt(Math.max(0, 0.205 * 0.205 - (y - 0.93) * (y - 0.93)));
    part(group, sphere(0.018, 5, 4), glow(bits[k % 5]), Math.sin(a) * r, y, Math.cos(a) * r);
  }
  rod(group, [-0.1, 0.8, -0.1], [-0.3, 1.3, -0.22], 0.04, lambert(0xd9a050)); // a wafer roll
  const cherry = sub(group);
  part(cherry, sphere(0.08, 12, 8), shiny(0xd8102a));
  rod(cherry, [0, 0.06, 0], [0.04, 0.2, 0], 0.008, lambert(0x4a7a2a));
  const drips = [[0.9, 0.3, 0], [3.0, 0.22, 0.4], [5.0, 0.34, 0.7]].map(([a, length, late]) => {
    const round = sub(group, 0, 0.71, 0);
    round.rotation.y = a;
    const lean = sub(round, 0, 0, 0.345);
    lean.rotation.x = 0.5; // (down the outside of the glass, which narrows)
    return { d: drip(lean, pink, 0.022), length, late };
  });
  return idle(group, (t) => {
    const s = ease(0.5 + Math.sin(t * 0.9) * 0.95); // (0 on top, 1 down the side: a stop at each end)
    cherry.position.set(mix(0, 0.17, s), mix(1.32, 1.1, s * s), mix(0, 0.12, s));
    cherry.rotation.z = -s * 1.1;
    for (const { d, length, late } of drips) d.userData.run((t * 0.13 + late) % 1, length);
  });
};

// C7 a sushi boat: the little wooden boat rocks on its stand, and a piece slides along the deck and back
const makeSushi = () => {
  const group = new THREE.Group();
  const wood = lambert(0xdcae6c), darkWood = lambert(0xa8743c), rice = lambert(0xffffff), nori = lambert(0x1c2a22);
  for (const x of [-0.28, 0.28]) part(group, box(0.07, 0.12, 0.44), darkWood, x, 0.06, 0);
  const boat = sub(group, 0, 0.12, 0);
  part(boat, box(0.96, 0.14, 0.4), darkWood, 0, 0.08, 0);
  part(boat, box(1.06, 0.05, 0.5), wood, 0, 0.175, 0);
  for (const z of [-0.24, 0.24]) part(boat, box(1.06, 0.07, 0.025), darkWood, 0, 0.215, z);
  part(boat, box(0.36, 0.06, 0.48), wood, 0.66, 0.27, 0, 0, 0, 0.6);   // the bow, turned up
  part(boat, box(0.2, 0.06, 0.48), wood, -0.58, 0.24, 0, 0, 0, -0.85); // the stern
  part(boat, box(0.05, 0.09, 0.5), darkWood, 0.8, 0.4, 0, 0, 0, 0.6);
  // a mast and its banner
  part(boat, cyl(0.016, 0.016, 0.62, 6), darkWood, -0.36, 0.5, -0.12);
  part(boat, box(0.3, 0.26, 0.012), lambert(0xfffaf0), -0.2, 0.66, -0.12);
  for (const z of [-0.112, -0.128]) part(boat, new THREE.CircleGeometry(0.075, 14), glow(0xd8262b), -0.2, 0.66, z, 0, z > -0.12 ? 0 : Math.PI);
  // the sushi: nigiri along the front, rolls along the back
  const nigiri = (x, z, color, band) => {
    const piece = sub(boat, x, 0.2, z);
    part(piece, new THREE.CapsuleGeometry(0.065, 0.13, 4, 10), rice, 0, 0.055, 0, 0, 0, FLAT).scale.set(0.8, 1, 1);
    part(piece, box(0.27, 0.04, 0.13), lambert(color), 0, 0.125, 0);
    if (band) part(piece, box(0.055, 0.115, 0.14), nori, 0, 0.085, 0);
    else for (const sx of [-0.07, 0, 0.07]) part(piece, box(0.02, 0.042, 0.132), lambert(0xffd0b0), sx, 0.125, 0, 0, 0.5, 0);
    return piece;
  };
  const slider = nigiri(0.26, 0.11, 0xff7a3a);
  nigiri(-0.06, 0.11, 0xc8203a);
  nigiri(-0.38, 0.11, 0xffd23f, true);
  for (const [x, color] of [[0.36, 0xff7a3a], [0.19, 0x3fb85a], [0.02, 0xff7a3a], [-0.15, 0xffd23f]]) {
    part(boat, cyl(0.075, 0.075, 0.1, 12), nori, x, 0.25, -0.12);
    part(boat, cyl(0.06, 0.06, 0.104, 12), rice, x, 0.25, -0.12);
    part(boat, cyl(0.027, 0.027, 0.108, 8), lambert(color), x, 0.25, -0.12);
  }
  part(boat, sphere(0.05, 8, 6), lambert(0x7ac043), 0.48, 0.23, 0.12).scale.y = 0.7; // wasabi
  return idle(group, (t) => {
    const rock = Math.sin(t * 1.6);
    boat.rotation.z = rock * 0.1;
    boat.rotation.x = Math.cos(t * 1.1) * 0.03;
    slider.position.x = 0.2 - Math.sin(t * 1.6 - 0.6) * 0.085; // (it runs downhill, a little behind the boat)
  });
};

// C8 a tiered tea set: cups chattering on their saucers below, the pot above, its lid lifting with a puff
const makeTeaset = () => {
  const group = new THREE.Group();
  const china = lambert(0xfffaf0), gold = lambert(0xe9b93a), rose = lambert(0xff8fb1), tea = lambert(0xa8551a);
  part(group, cyl(0.2, 0.26, 0.04, 16), china, 0, 0.02, 0);
  part(group, cyl(0.58, 0.5, 0.035, 24), china, 0, 0.055, 0);
  part(group, torus(0.58, 0.014, 24), gold, 0, 0.073, 0, FLAT);
  part(group, cyl(0.025, 0.025, 0.42, 8), gold, 0, 0.28, 0);
  part(group, sphere(0.05, 8, 6), gold, 0, 0.26, 0);
  part(group, cyl(0.34, 0.28, 0.03, 20), china, 0, 0.49, 0);
  part(group, torus(0.34, 0.012, 20), gold, 0, 0.505, 0, FLAT);
  const cups = [0.7, 2.27, 3.84, 5.41].map((a, k) => {
    const x = Math.sin(a) * 0.4, z = Math.cos(a) * 0.4;
    part(group, cyl(0.15, 0.1, 0.022, 14), china, x, 0.084, z);
    part(group, torus(0.15, 0.01, 14), k % 2 ? rose : gold, x, 0.095, z, FLAT);
    const cup = sub(group, x, 0.095, z);
    part(cup, cyl(0.11, 0.065, 0.12, 14), china, 0, 0.06, 0);
    part(cup, cyl(0.1, 0.1, 0.006, 14), tea, 0, 0.115, 0);
    part(cup, torus(0.11, 0.01, 14), k % 2 ? rose : gold, 0, 0.12, 0, FLAT);
    part(cup, torus(0.04, 0.012, 10), china, Math.sin(a) * 0.12, 0.065, Math.cos(a) * 0.12, 0, a - FLAT, 0);
    return cup;
  });
  const pot = sub(group, 0, 0.505, 0);
  part(pot, sphere(0.21, 16, 12), china, 0, 0.17, 0).scale.y = 0.82;
  part(pot, torus(0.2, 0.02, 20), rose, 0, 0.2, 0, FLAT);
  part(pot, cyl(0.1, 0.12, 0.03, 14), china, 0, 0.015, 0);
  rod(pot, [0.16, 0.14, 0], [0.36, 0.3, 0], 0.045, china, 0.028); // the spout
  part(pot, torus(0.09, 0.022, 12), china, -0.24, 0.19, 0);
  const lid = sub(pot, 0, 0.33, 0);
  part(lid, sphere(0.11, 12, 8), china).scale.y = 0.4;
  part(lid, sphere(0.035, 8, 6), gold, 0, 0.06, 0);
  const steam = puffs(group, 3, 0.07);
  return idle(group, (t) => {
    cups.forEach((cup, k) => {
      const fit = Math.pow(0.5 + 0.5 * Math.sin(t * 1.3 + k * 1.6), 2);
      cup.position.y = 0.095 + Math.abs(Math.sin(t * 21 + k * 2)) * 0.018 * fit;
      cup.rotation.z = Math.sin(t * 25 + k * 3) * 0.07 * fit;
      cup.rotation.x = Math.cos(t * 22 + k) * 0.05 * fit;
    });
    const u = (t / 2.4) % 1, lift = u < 0.3 ? Math.sin(u / 0.3 * Math.PI) : 0;
    lid.position.y = 0.33 + lift * 0.1;
    lid.rotation.z = lift * 0.3;
    rise(steam[0], u, 0.02, 0.9, 0, 0.4, 0.6);
    rise(steam[1], (u + 0.12) % 1, 0.4, 0.84, 0, 0.35, 0.5);
    rise(steam[2], (u + 0.55) % 1, 0.4, 0.84, 0, 0.35, 0.35);
  });
};

// C9 a record player, its lid up: the record turns, the arm bobs, and notes float off
const makeRecord = () => {
  const group = new THREE.Group();
  const teal = lambert(0x2aa6a0), creamy = lambert(0xfff3d0), dark = lambert(0x22252b), silver = lambert(0xc9cfd6);
  part(group, box(0.98, 0.2, 0.78), teal, 0, 0.12, 0);
  for (const x of [-0.4, 0.4]) for (const z of [-0.3, 0.3]) part(group, cyl(0.04, 0.03, 0.03, 8), dark, x, 0.015, z);
  part(group, box(0.92, 0.012, 0.72), creamy, 0, 0.225, 0);
  part(group, new THREE.CircleGeometry(0.07, 14), dark, -0.25, 0.12, 0.391); // the speaker, and the knobs
  for (const x of [0.2, 0.34]) part(group, cyl(0.035, 0.035, 0.03, 10), creamy, x, 0.12, 0.4, FLAT);
  const lid = sub(group, 0, 0.22, -0.39);
  lid.rotation.x = -0.2;
  part(lid, box(0.98, 0.66, 0.07), teal, 0, 0.33, -0.035);
  part(lid, box(0.9, 0.58, 0.01), creamy, 0, 0.33, 0.003);
  part(group, cyl(0.335, 0.335, 0.03, 24), silver, -0.1, 0.245, 0.02);
  const disc = sub(group, -0.1, 0.265, 0.02);
  part(disc, cyl(0.32, 0.32, 0.014, 24), lambert(0x15151a));
  for (const r of [0.17, 0.23, 0.28]) part(disc, torus(r, 0.004, 24, 4), lambert(0x4a4a55), 0, 0.008, 0, FLAT);
  part(disc, cyl(0.115, 0.115, 0.018, 18), lambert(0xe0304a));
  part(disc, box(0.07, 0.02, 0.03), creamy, 0.06, 0, 0);
  part(disc, cyl(0.015, 0.015, 0.05, 6), silver);
  part(group, cyl(0.045, 0.045, 0.09, 10), silver, 0.38, 0.27, -0.24);
  const arm = sub(group, 0.38, 0.33, -0.24);
  part(arm, box(0.022, 0.022, 0.5), silver, 0, 0, 0.19);
  part(arm, box(0.055, 0.035, 0.09), dark, 0, -0.012, 0.44);
  part(arm, cyl(0.035, 0.035, 0.07, 8), dark, 0, 0, -0.09, FLAT);
  const notes = [0xffd23f, 0xff7ab6, 0x8fd3ff].map((color) => {
    const n = sub(group), ink = glow(color);
    part(n, sphere(0.06, 8, 6), ink, 0, 0, 0, 0, 0, 0.4).scale.set(1.25, 0.85, 1);
    part(n, cyl(0.012, 0.012, 0.22, 5), ink, 0.062, 0.11, 0);
    part(n, box(0.1, 0.05, 0.02), ink, 0.105, 0.2, 0, 0, 0, -0.45);
    return n;
  });
  return idle(group, (t) => {
    disc.rotation.y = -t * 3.4;
    disc.rotation.z = Math.sin(t * 3.4) * 0.012; // (a warp in it, that the arm rides)
    arm.rotation.set(Math.sin(t * 3.4) * 0.035 + 0.1, -0.62 + Math.sin(t * 0.35) * 0.06, 0);
    notes.forEach((n, k) => {
      const u = (t * 0.33 + k / 3) % 1;
      n.position.set(-0.1 + Math.sin(t * 1.7 + k * 2.1) * 0.12 + (k - 1) * 0.16, 0.5 + u * 0.75, 0.1 - u * 0.1);
      n.rotation.z = Math.sin(t * 2.2 + k) * 0.3;
      n.scale.setScalar(tiny(Math.sin(Math.PI * u) * 1.15));
    });
  });
};

// C10 a lava lamp: the blobs rise and sink
const makeLavalamp = () => {
  const group = new THREE.Group();
  const metal = shiny(0xc4cad4, { side: THREE.DoubleSide });
  const bottle = [[0.001, 0.3], [0.2, 0.3], [0.235, 0.44], [0.2, 0.7], [0.11, 1.1]];
  part(group, lathe([[0.001, 0], [0.27, 0], [0.26, 0.03], [0.15, 0.2], [0.21, 0.32]]), metal);
  const liquid = part(group, lathe(bottle.map(([r, y]) => [r * 0.93, y])), new THREE.MeshLambertMaterial({ color: 0x7a2df0, transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x2a0d66 }));
  liquid.renderOrder = 1;
  const glass = part(group, lathe(bottle), glassy(0xe6dcff, 0.22));
  glass.renderOrder = 2;
  part(group, cyl(0.075, 0.115, 0.15, 16), metal, 0, 1.17, 0);
  const lava = glow(0xff5a3a), room = (y) => (y < 0.44 ? mix(0.19, 0.215, (y - 0.3) / 0.14) : y < 0.7 ? mix(0.215, 0.185, (y - 0.44) / 0.26) : mix(0.185, 0.1, (y - 0.7) / 0.4)) - 0.012;
  part(group, sphere(0.185, 14, 8), lava, 0, 0.345, 0).scale.y = 0.3;
  const top = part(group, sphere(0.09, 12, 8), lava, 0, 1.06, 0);
  const blobs = [[0.1, 0.5, 0, 0.9], [0.075, 0.37, 2.1, 2.4], [0.09, 0.44, 4.2, 4.0], [0.06, 0.61, 1.0, 5.3], [0.07, 0.31, 3.3, 0.3]].map(([r, speed, phase, turn]) => ({ mesh: part(group, sphere(r, 12, 10), lava), r, speed, phase, turn }));
  return idle(group, (t) => {
    for (const b of blobs) {
      const a = t * b.speed + b.phase, y = 0.7 + Math.sin(a) * 0.29, wide = room(y), fit = Math.min(1, wide / b.r);
      const out = Math.max(0, wide - b.r) * (0.7 + 0.3 * Math.sin(t * 0.4 + b.turn));
      b.mesh.position.set(Math.sin(b.turn + t * 0.13) * out, y, Math.cos(b.turn + t * 0.13) * out);
      b.mesh.scale.set(fit, 1 + Math.abs(Math.cos(a)) * 0.45, fit); // (drawn out as it travels, round as it turns)
    }
    top.scale.set(1, 0.5 + Math.sin(t * 0.7) * 0.12, 1);
  });
};

// C11 a snow globe: a tiny village under glass; every so often it shakes, and the snow swirls and settles
const makeSnowglobe = () => {
  const group = new THREE.Group();
  const all = sub(group);
  const red = lambert(0xb8262b), gold = lambert(0xe9b93a), white = lambert(0xffffff), pine = lambert(0x2f8a4a), lit = glow(0xffe07a);
  part(all, cyl(0.4, 0.47, 0.2, 20), red, 0, 0.1, 0);
  part(all, torus(0.405, 0.028, 20), gold, 0, 0.2, 0, FLAT);
  part(all, torus(0.468, 0.022, 20), gold, 0, 0.02, 0, FLAT);
  part(all, box(0.22, 0.08, 0.02), gold, 0, 0.1, 0.432);
  part(all, sphere(0.36, 16, 8), white, 0, 0.38, 0).scale.y = 0.3;
  const house = (x, z, w, h, color, roofH, turn = 0) => {
    const g = sub(all, x, 0.46, z);
    g.rotation.y = turn;
    part(g, box(w, h, w * 0.9), lambert(color), 0, h / 2, 0);
    part(g, cone(w * 0.85, roofH, 4), white, 0, h + roofH / 2, 0, 0, Math.PI / 4);
    part(g, box(w * 0.3, h * 0.35, 0.01), lit, 0, h * 0.5, w * 0.455);
    return g;
  };
  house(-0.15, 0.04, 0.15, 0.12, 0xd8483a, 0.1, 0.3);
  house(0.15, 0.07, 0.13, 0.1, 0xe9a23a, 0.09, -0.3);
  house(0.01, -0.1, 0.11, 0.24, 0x6a8fb5, 0.22); // the church, and its spire
  for (const [x, z, s] of [[-0.01, 0.2, 1], [0.24, -0.08, 0.85], [-0.24, -0.1, 0.9]]) {
    part(all, cone(0.075 * s, 0.13 * s, 7), pine, x, 0.45 + 0.085 * s, z);
    part(all, cone(0.055 * s, 0.11 * s, 7), pine, x, 0.45 + 0.165 * s, z);
  }
  const globe = part(all, sphere(0.45, 22, 16), glassy(0xcfeaff, 0.22), 0, 0.62, 0);
  globe.renderOrder = 2;
  part(all, sphere(0.05, 8, 6), glow(0xffffff, { transparent: true, opacity: 0.7, depthWrite: false }), -0.2, 0.86, 0.3).renderOrder = 3; // (a shine on the glass)
  const flake = sphere(0.016, 5, 4), snow = glow(0xffffff);
  const flakes = Array.from({ length: 34 }, (_, k) => ({ mesh: part(all, flake, snow), at: k * 2.39996, r: Math.sqrt((k + 0.5) / 34) * 0.9, high: 0.3 + (k * 7 % 10) / 10 * 0.7, k }));
  return idle(group, (t) => {
    const u = (t / 7) % 1, shake = u < 0.08 ? Math.sin(u / 0.08 * Math.PI) : 0;
    all.rotation.z = Math.sin(u / 0.08 * Math.PI * 4) * 0.11 * shake;
    all.position.y = shake * 0.05;
    const stirred = u < 0.08 ? ease(u / 0.08) : 1 - ease((u - 0.08) / 0.85), round = (1 - Math.pow(1 - u, 3)) * Math.PI * 2;
    for (const f of flakes) {
      const e = Math.pow(stirred, 0.5 + (f.k % 3) * 0.5);
      const guess = 0.45 + 0.5 * f.high * e, reach = f.r * Math.sqrt(Math.max(0, 0.42 * 0.42 - (guess - 0.62) * (guess - 0.62)));
      const floor = 0.385 + 0.105 * Math.sqrt(Math.max(0, 1 - Math.pow(reach / 0.36, 2)));
      const a = f.at + round * (1 + f.k % 2);
      f.mesh.position.set(Math.sin(a) * reach, Math.max(floor, guess + Math.sin(t * 3 + f.k) * 0.02 * e), Math.cos(a) * reach);
    }
  });
};

// C12 a potted bonsai: its leaves shiver, and a tiny bird hops along a branch
const makeBonsai = () => {
  const group = new THREE.Group();
  const glaze = lambert(0x2f5d8a), bark = lambert(0x6b4a2e), leaf = lambert(0x3f9440), light = lambert(0x62b84e);
  part(group, box(0.86, 0.16, 0.52), glaze, 0, 0.11, 0);
  part(group, box(0.92, 0.05, 0.58), glaze, 0, 0.2, 0);
  for (const x of [-0.32, 0.32]) part(group, box(0.14, 0.04, 0.46), glaze, x, 0.02, 0);
  part(group, box(0.84, 0.02, 0.5), lambert(0x4a3525), 0, 0.225, 0);
  part(group, sphere(0.2, 10, 6), lambert(0x6aa84a), -0.2, 0.23, 0.04).scale.set(1.3, 0.25, 1);
  part(group, sphere(0.07, 7, 5), lambert(0x8a8f98), 0.28, 0.25, 0.1).scale.y = 0.7;
  const limb = (points, r) => part(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 14, r, 7), bark);
  limb([[-0.14, 0.2, 0], [-0.1, 0.34, 0.02], [0.08, 0.46, 0.03], [-0.02, 0.64, 0], [-0.1, 0.78, -0.02], [0.04, 0.94, 0]], 0.055);
  part(group, cone(0.12, 0.2, 8), bark, -0.14, 0.31, 0);
  limb([[0.06, 0.46, 0.03], [0.26, 0.5, 0.04], [0.5, 0.52, 0.02]], 0.032);
  limb([[-0.04, 0.66, 0], [-0.24, 0.7, 0.02], [-0.4, 0.78, 0]], 0.03);
  const pads = [[0.56, 0.61, 0.02, 0.19], [-0.44, 0.85, 0, 0.21], [0.06, 1.03, 0, 0.27], [-0.14, 0.98, 0.14, 0.16], [0.24, 0.96, -0.1, 0.17]].map(([x, y, z, r], k) => {
    const pad = sub(group, x, y, z);
    part(pad, sphere(r, 12, 8), leaf).scale.y = 0.55;
    part(pad, sphere(r * 0.62, 10, 6), light, -r * 0.3, r * 0.24, r * 0.3).scale.y = 0.55;
    part(pad, sphere(r * 0.55, 10, 6), leaf, r * 0.55, -r * 0.05, -r * 0.2).scale.y = 0.6;
    return { pad, k };
  });
  const bird = sub(group), feather = lambert(0xe0303a);
  part(bird, sphere(0.06, 10, 8), feather, 0, 0.06, 0).scale.set(0.9, 0.95, 1.25);
  part(bird, sphere(0.043, 8, 6), feather, 0, 0.13, 0.05);
  part(bird, cone(0.018, 0.05, 6), lambert(0xffc21a), 0, 0.125, 0.105, FLAT);
  for (const x of [-0.025, 0.025]) part(bird, sphere(0.01, 5, 4), glow(0x15100c), x, 0.14, 0.082);
  part(bird, box(0.045, 0.012, 0.1), lambert(0x8a1a22), 0, 0.07, -0.1, 0.5);
  return idle(group, (t) => {
    for (const { pad, k } of pads) {
      pad.rotation.z = Math.sin(t * 1.4 + k * 1.3) * 0.04 + Math.sin(t * 13 + k * 2) * 0.012;
      pad.scale.setScalar(1 + Math.sin(t * 11 + k * 1.7) * 0.012);
    }
    // the bird: three hops out along the branch, a look about, three hops back
    const q = (t * 0.45) % 2, f = q < 1 ? q : 2 - q, step = Math.min(2, Math.floor(f * 3.6)), within = clamp01((f * 3.6 - step) / 0.45);
    const along = step < 3 ? (step + ease(within)) / 3 : 1, x = mix(0.15, 0.34, Math.min(1, along));
    bird.position.set(x, 0.5 + (x - 0.06) * 0.14 + (f * 3.6 < 3 ? Math.sin(Math.PI * within) * 0.06 : 0), 0.04);
    bird.rotation.y = (q < 1 ? 1 : -1) * 1.1 + Math.sin(t * 2.6) * 0.25;
    bird.rotation.x = Math.max(0, Math.sin(t * 5.2)) * 0.25; // (a peck)
  });
};

// C13 a puppy in a basket: ears flopping, tail wagging, head on one side and then the other
const makePuppy = () => {
  const group = new THREE.Group();
  const wicker = lambert(0xcf9f58), band = lambert(0xa5742f), fur = lambert(0xe6ad5c), pale = lambert(0xf8e3bd), brown = lambert(0x8a5226), ink = glow(0x1a1210);
  part(group, cyl(0.52, 0.4, 0.38, 20), wicker, 0, 0.19, 0);
  for (const [y, r] of [[0.07, 0.425], [0.17, 0.455], [0.27, 0.49]]) part(group, torus(r, 0.022, 20), band, 0, y, 0, FLAT);
  part(group, torus(0.52, 0.05, 20, 8), band, 0, 0.38, 0, FLAT);
  part(group, sphere(0.47, 16, 8), lambert(0xd83a4a), 0, 0.37, 0).scale.y = 0.22; // a blanket
  const pup = sub(group, 0, 0.36, -0.04);
  const chest = part(pup, sphere(0.27, 14, 10), fur, 0, 0.16, 0);
  chest.scale.set(1, 0.95, 1.1);
  part(pup, sphere(0.14, 10, 8), pale, 0, 0.2, 0.2);
  for (const x of [-0.15, 0.15]) part(group, sphere(0.085, 10, 8), pale, x, 0.45, 0.46).scale.set(1, 0.8, 1.2); // paws, over the rim
  const tail = sub(pup, 0, 0.2, -0.26);
  part(tail, new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), fur, 0, 0.13, -0.03, -0.3);
  part(tail, sphere(0.045, 8, 6), pale, 0, 0.26, -0.07);
  const head = sub(pup, 0, 0.5, 0.12);
  part(head, sphere(0.25, 16, 12), fur);
  part(head, sphere(0.1, 10, 8), brown, 0.11, 0.07, 0.17).scale.z = 0.6; // (a patch over one eye)
  part(head, sphere(0.13, 12, 10), pale, 0, -0.07, 0.19).scale.set(1.15, 0.8, 1);
  part(head, sphere(0.05, 8, 6), ink, 0, -0.03, 0.31).scale.y = 0.8;
  for (const x of [-0.1, 0.1]) {
    part(head, sphere(0.042, 8, 6), ink, x, 0.07, 0.215);
    part(head, sphere(0.015, 5, 4), glow(0xffffff), x - 0.012, 0.085, 0.25);
  }
  const tongue = part(head, sphere(0.045, 8, 6), lambert(0xff7a95), 0, -0.15, 0.25);
  tongue.scale.set(0.9, 1, 0.5);
  const ears = [-1, 1].map((d) => {
    const ear = sub(head, d * 0.2, 0.14, 0);
    part(ear, sphere(0.1, 10, 8), brown, d * 0.04, -0.16, 0.02).scale.set(0.55, 1.6, 0.95);
    return { ear, d };
  });
  const tilt = (t) => (ease(0.5 + Math.sin(t * 0.85) * 1.2) - 0.5) * 0.6;
  return idle(group, (t) => {
    const now = tilt(t), swing = (now - tilt(t - 0.22)) * 2.6; // (the ears come after the head)
    head.rotation.set(Math.sin(t * 1.7) * 0.05, Math.sin(t * 0.6) * 0.18, now);
    for (const { ear, d } of ears) ear.rotation.z = d * 0.22 - swing + Math.sin(t * 3.1 + d) * 0.05;
    tail.rotation.z = Math.sin(t * 15) * 0.55;
    tongue.scale.y = 1 + Math.sin(t * 9) * 0.22;
    chest.scale.y = 0.95 + Math.sin(t * 9) * 0.02;
  });
};

// C14 a canary in a cage: it hops from one perch to the other and back, and the cage rocks
const makeCanary = () => {
  const group = new THREE.Group();
  const brass = lambert(0xd9a93a), yellow = lambert(0xffe02a), deep = lambert(0xf0b81a);
  const cage = sub(group);
  part(cage, cyl(0.44, 0.47, 0.08, 20), brass, 0, 0.04, 0);
  part(cage, cyl(0.41, 0.41, 0.01, 20), lambert(0xf3e7cc), 0, 0.082, 0);
  const bar = cyl(0.009, 0.009, 0.76, 5);
  for (let k = 0; k < 16; k++) part(cage, bar, brass, Math.sin(k / 16 * Math.PI * 2) * 0.42, 0.46, Math.cos(k / 16 * Math.PI * 2) * 0.42);
  for (const y of [0.46, 0.84]) part(cage, torus(0.42, 0.015, 20), brass, 0, y, 0, FLAT);
  for (let k = 0; k < 4; k++) part(cage, torus(0.42, 0.009, 14, 4, Math.PI), brass, 0, 0.84, 0, 0, k * Math.PI / 4, 0);
  part(cage, sphere(0.045, 8, 6), brass, 0, 1.27, 0);
  part(cage, torus(0.055, 0.013, 12), brass, 0, 1.36, 0);
  const A = [-0.17, 0.36, 0.06], B = [0.17, 0.66, -0.04];
  for (const [, y, z] of [A, B]) part(cage, cyl(0.016, 0.016, 0.84, 6), lambert(0x8a6234), 0, y, z, 0, 0, FLAT);
  const bird = sub(cage);
  part(bird, sphere(0.1, 12, 10), yellow, 0, 0.1, 0).scale.set(0.88, 0.95, 1.2);
  part(bird, box(0.08, 0.016, 0.16), deep, 0, 0.07, -0.16, 0.45);
  const wings = [-1, 1].map((d) => {
    const wing = sub(bird, d * 0.08, 0.13, -0.01);
    part(wing, sphere(0.085, 8, 6), deep, 0, -0.04, -0.02).scale.set(0.28, 0.75, 1.1);
    return { wing, d };
  });
  const head = sub(bird, 0, 0.21, 0.06);
  part(head, sphere(0.072, 10, 8), yellow);
  part(head, cone(0.025, 0.07, 6), lambert(0xff8a1a), 0, -0.005, 0.09, FLAT);
  for (const x of [-0.045, 0.045]) part(head, sphere(0.015, 5, 4), glow(0x15100c), x, 0.02, 0.05);
  return idle(group, (t) => {
    cage.rotation.z = Math.sin(t * 1.5) * 0.03;
    const u = (t / 3.2) % 1;
    const k = u < 0.38 ? 0 : u < 0.5 ? (u - 0.38) / 0.12 : u < 0.88 ? 1 : 1 - (u - 0.88) / 0.12, e = ease(k);
    const flying = Math.sin(Math.PI * k), perched = 1 - Math.min(1, flying * 3);
    bird.position.set(mix(A[0], B[0], e), mix(A[1], B[1], e) + 0.016 + flying * 0.13 + Math.abs(Math.sin(t * 6.5)) * 0.012 * perched, mix(A[2], B[2], e));
    bird.rotation.y = mix(0.75, -0.75, e);
    head.rotation.y = Math.sin(t * 2.7) * 0.6 * perched;
    head.rotation.z = Math.sin(t * 1.9) * 0.2 * perched;
    for (const { wing, d } of wings) wing.rotation.z = d * (0.05 + (0.5 + 0.5 * Math.sin(t * 42)) * 1.5 * Math.min(1, flying * 3));
  });
};

// C15 a bowl of ramen: steam rising, the chopsticks lifting a noodle and letting it drop
const makeRamen = () => {
  const group = new THREE.Group();
  const red = lambert(0xc8262b, { side: THREE.DoubleSide }), noodle = lambert(0xffe7a0), stick = lambert(0xf0d9a0);
  part(group, lathe([[0.001, 0], [0.23, 0], [0.25, 0.03], [0.21, 0.07], [0.42, 0.24], [0.54, 0.44], [0.56, 0.49]], 22), red);
  part(group, torus(0.56, 0.02, 22), lambert(0x1c1a17), 0, 0.49, 0, FLAT);
  part(group, torus(0.468, 0.02, 22), lambert(0xfffaf0), 0, 0.31, 0, FLAT);
  part(group, cyl(0.525, 0.52, 0.02, 22), lambert(0xe0a23e), 0, 0.43, 0); // the broth
  const Y = 0.445;
  for (const [x, z, r, lift] of [[0, 0.1, 0.17, 0], [-0.1, 0, 0.13, 0.012], [0.1, -0.06, 0.15, 0.02], [-0.02, 0.2, 0.1, 0.03], [0.14, 0.14, 0.09, 0.035]]) part(group, torus(r, 0.024, 16, 5), noodle, x, Y + lift, z, FLAT);
  part(group, sphere(0.12, 12, 8), lambert(0xffffff), 0.3, Y + 0.01, 0.2).scale.y = 0.5;       // half an egg
  part(group, sphere(0.065, 10, 6), lambert(0xffa21a), 0.3, Y + 0.045, 0.2).scale.y = 0.5;
  part(group, cyl(0.1, 0.1, 0.035, 12), lambert(0xffffff), -0.3, Y + 0.02, 0.22);              // a slice of fish cake
  part(group, torus(0.05, 0.016, 12, 5), lambert(0xff5fa2), -0.3, Y + 0.04, 0.22, FLAT);
  for (const [x, z] of [[-0.28, -0.14], [-0.08, -0.32]]) {                                     // pork
    part(group, cyl(0.14, 0.14, 0.035, 14), lambert(0xc98a6a), x, Y + 0.02, z);
    part(group, torus(0.09, 0.02, 12, 5), lambert(0x9a5a3e), x, Y + 0.04, z, FLAT);
  }
  part(group, box(0.3, 0.34, 0.014), lambert(0x1f3a2a), 0.3, Y + 0.13, -0.3, -0.25, -0.7, 0);  // a sheet of seaweed
  for (let k = 0; k < 9; k++) part(group, cyl(0.022, 0.022, 0.018, 6), lambert(0x5fbf4a), Math.sin(k * 2.4) * (0.12 + k * 0.035), Y + 0.045, Math.cos(k * 2.4) * (0.12 + k * 0.035));
  const sticks = sub(group, -0.02, 0, 0.08);
  for (const z of [-0.028, 0.028]) part(sticks, cyl(0.02, 0.011, 0.85, 6).translate(0, 0.425, 0), stick, 0, 0, z, z * -1.2, 0, -0.85);
  const strands = [-1, 0, 1].map(k => part(group, cyl(0.02, 0.02, 1, 6).translate(0, 0.5, 0), noodle, -0.02 + k * 0.035, Y, 0.08 + k * 0.02));
  const steam = puffs(group, 3, 0.09);
  return idle(group, (t) => {
    const u = (t / 3.4) % 1;
    const lift = u < 0.4 ? ease(u / 0.4) : u < 0.62 ? 1 : 1 - ease((u - 0.62) / 0.38);
    const tip = Y + 0.06 + lift * 0.42 + (u > 0.4 && u < 0.62 ? Math.sin((u - 0.4) / 0.22 * Math.PI * 3) * 0.02 : 0);
    sticks.position.y = tip;
    const held = tip - Y, length = u < 0.55 ? held : u < 0.66 ? mix(held, 0.02, Math.pow((u - 0.55) / 0.11, 2)) : mix(0.02, 0.06, (u - 0.66) / 0.34);
    strands.forEach((s, k) => {
      s.scale.y = Math.max(0.01, length - (u < 0.55 ? Math.abs(k - 1) * 0.012 : 0));
      s.rotation.z = Math.sin(t * 6 + k * 1.4) * 0.05 * lift;
      s.rotation.x = Math.cos(t * 5 + k) * 0.04 * lift;
    });
    steam.forEach((s, k) => rise(s, (t * 0.4 + k / 3) % 1, -0.2 + k * 0.2 + Math.sin(t * 1.8 + k * 2) * 0.05, 0.55, -0.1 + (k % 2) * 0.12, 0.6, 0.45));
  });
};

// C16 a globe on a stand: it spins slowly one way, tilts, and spins back
const makeGlobe = () => {
  const group = new THREE.Group();
  const wood = lambert(0x5a3620), brass = lambert(0xe0b040), sea = lambert(0x2a80d8), land = lambert(0x4fae4a), ice = lambert(0xffffff);
  part(group, cyl(0.3, 0.36, 0.06, 20), wood, 0, 0.03, 0);
  part(group, torus(0.3, 0.015, 20), brass, 0, 0.06, 0, FLAT);
  part(group, lathe([[0.001, 0.06], [0.11, 0.06], [0.05, 0.12], [0.035, 0.24], [0.06, 0.29]], 12), brass);
  const lean = sub(group, 0, 0.76, 0);
  part(lean, torus(0.475, 0.02, 22, 6, Math.PI), brass, 0, 0, 0, 0, 0, -FLAT);
  for (const d of [-1, 1]) part(lean, cyl(0.022, 0.022, 0.1, 8), brass, 0, d * 0.45, 0);
  part(lean, sphere(0.035, 8, 6), brass, 0, 0.5, 0);
  const ball = sub(lean);
  part(ball, sphere(0.42, 24, 16), sea);
  // the land: big balls sunk in the sea's, so only a cap of each shows. [latitude, longitude, radius]
  const cap = (lat, lon, r, material = land) => {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180, d = 0.42 - r + 0.022;
    part(ball, sphere(r, 16, 12), material, Math.cos(a) * Math.sin(b) * d, Math.sin(a) * d, Math.cos(a) * Math.cos(b) * d);
  };
  for (const [lat, lon, r] of [[48, -100, 0.3], [22, -98, 0.17], [64, -115, 0.24], [-8, -60, 0.26], [-34, -66, 0.17], [8, 20, 0.3], [-20, 26, 0.23], [50, 14, 0.18], [52, 80, 0.3], [34, 104, 0.28], [18, 78, 0.17], [60, 125, 0.24], [-25, 134, 0.23], [72, -40, 0.16], [-4, 112, 0.15], [-42, 172, 0.13], [36, 138, 0.13]]) cap(lat, lon, r);
  cap(90, 0, 0.2, ice);
  cap(-90, 0, 0.26, ice);
  return idle(group, (t) => {
    ball.rotation.y = Math.sin(t * 0.45) * 2.8;
    lean.rotation.z = -0.41 + Math.sin(t * 0.9) * 0.08;
  });
};

// C17 a trophy: it gleams, and a star of light travels round its rim
const makeTrophy = () => {
  const group = new THREE.Group();
  const gold = shiny(0xf2c230, { side: THREE.DoubleSide, emissive: 0x000000 }), stone = lambert(0x24262c);
  part(group, box(0.52, 0.14, 0.52), stone, 0, 0.07, 0);
  part(group, box(0.42, 0.08, 0.42), stone, 0, 0.18, 0);
  part(group, box(0.28, 0.08, 0.012), gold, 0, 0.07, 0.262);
  part(group, lathe([[0.001, 0.22], [0.17, 0.22], [0.15, 0.26], [0.05, 0.31], [0.04, 0.42], [0.08, 0.47]], 16), gold);
  part(group, lathe([[0.001, 0.47], [0.08, 0.47], [0.2, 0.52], [0.28, 0.66], [0.32, 0.84], [0.335, 1.0]], 20), gold);
  part(group, torus(0.335, 0.024, 20), gold, 0, 1.0, 0, FLAT);
  part(group, cyl(0.31, 0.31, 0.01, 20), lambert(0x8a6a14), 0, 0.96, 0); // (the shadow inside it)
  for (const d of [-1, 1]) part(group, torus(0.15, 0.028, 14, 6, Math.PI), gold, d * 0.27, 0.76, 0, 0, 0, -d * FLAT).scale.set(1, 1.15, 1);
  const badge = star(group, 0xfff6c0); // (on the cup's front: a star)
  badge.position.set(0, 0.76, 0.305);
  badge.scale.setScalar(0.085);
  const runner = star(group), twinkle = star(group);
  twinkle.position.set(-0.2, 0.86, 0.27);
  return idle(group, (t) => {
    const a = t * 2.1;
    runner.position.set(Math.sin(a) * 0.335, 1.02, Math.cos(a) * 0.335);
    runner.scale.setScalar(0.12 * (1 + Math.sin(t * 9) * 0.25));
    runner.rotation.y = t * 3;
    twinkle.scale.setScalar(tiny(Math.pow(Math.max(0, Math.sin(t * 1.7)), 6) * 0.13));
    twinkle.rotation.z = t;
    gold.emissive.setHex(0x664400).multiplyScalar(0.3 + 0.3 * Math.sin(t * 2.1));
  });
};

// C18 a surfboard with a ribbon round it, stood on its tail in a heap of sand: it leans and rocks
const makeSurfboard = () => {
  const group = new THREE.Group();
  const outline = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.08, 0);
    s.bezierCurveTo(0.24, 0.1, 0.31, 0.5, 0.27, 0.85);
    s.bezierCurveTo(0.23, 1.2, 0.09, 1.42, 0, 1.52);
    s.bezierCurveTo(-0.09, 1.42, -0.23, 1.2, -0.27, 0.85);
    s.bezierCurveTo(-0.31, 0.5, -0.24, 0.1, -0.08, 0);
    s.closePath();
    return s;
  };
  const ribbon = lambert(0xe0203a);
  part(group, sphere(0.42, 14, 8), lambert(0xecd9a2), 0, 0, 0).scale.set(1, 0.28, 0.8);
  part(group, sphere(0.05, 8, 6), lambert(0xff8fb1), 0.26, 0.07, 0.16).scale.y = 0.6; // a shell
  const rock = sub(group, 0, 0.04, 0);
  const plank = sub(rock);
  part(plank, new THREE.ExtrudeGeometry(outline(), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -0.025), lambert(0x1fb5b0));
  part(plank, new THREE.ExtrudeGeometry(outline(), { depth: 0.092, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -0.046), lambert(0xfff3d0), 0, 0.09, 0).scale.set(0.8, 0.9, 1);
  part(plank, box(0.03, 1.3, 0.096), lambert(0xff8a1a), 0, 0.76, 0);
  for (const y of [1.0, 1.08]) part(plank, box(0.5, 0.035, 0.094), lambert(0xff8a1a), 0, y, 0).scale.x = y > 1.04 ? 0.82 : 0.9;
  for (const [x, y] of [[0, 0.16], [-0.12, 0.26], [0.12, 0.26]]) part(plank, cone(0.07, 0.18, 4), lambert(0x147a78), x, y, -0.1, -FLAT - 0.5).scale.x = 0.2; // the fins
  part(plank, box(0.6, 0.11, 0.12), ribbon, 0, 0.6, 0);
  const bow = sub(plank, 0, 0.6, 0.075);
  const loops = [-1, 1].map(d => part(bow, cone(0.11, 0.26, 4), ribbon, d * 0.14, 0.02, 0, 0, 0, d * FLAT));
  for (const loop of loops) loop.scale.z = 0.45;
  part(bow, sphere(0.055, 8, 6), ribbon);
  const tails = [-1, 1].map((d) => {
    const tail = sub(bow);
    part(tail, box(0.065, 0.24, 0.02), ribbon, 0, -0.12, 0);
    return { tail, d };
  });
  return idle(group, (t) => {
    rock.rotation.z = Math.sin(t * 1.5) * 0.13;
    rock.rotation.x = -0.1 + Math.cos(t * 1.5) * 0.035;
    plank.rotation.y = Math.sin(t * 0.75) * 0.12;
    for (const { tail, d } of tails) tail.rotation.set(Math.sin(t * 5 + d) * 0.2 + 0.1, 0, d * 0.4 - Math.sin(t * 1.5) * 0.35);
    loops.forEach((loop, k) => { loop.scale.y = 1 + Math.sin(t * 4 + k * Math.PI) * 0.1; });
  });
};

// C19 a tool box, open: the spanners rattle in their tray and the lid creaks
const makeToolbox = () => {
  const group = new THREE.Group();
  const red = lambert(0xd8262b), deep = lambert(0x9a1a1e), steel = shiny(0xc9cfd6), grey = lambert(0x4a4e56), wood = lambert(0xc98a3c);
  const body = sub(group);
  part(body, box(1.0, 0.34, 0.46), red, 0, 0.19, 0);
  for (const x of [-0.4, 0.4]) part(body, box(0.12, 0.03, 0.42), grey, x, 0.015, 0);
  part(body, box(1.02, 0.045, 0.48), deep, 0, 0.34, 0);
  part(body, box(0.94, 0.02, 0.4), grey, 0, 0.365, 0);
  for (const x of [-0.32, 0.32]) part(body, box(0.09, 0.11, 0.02), steel, x, 0.3, 0.24);
  const lid = sub(body, 0, 0.36, -0.23);
  part(lid, box(1.0, 0.1, 0.46), red, 0, 0.05, 0.23);
  part(lid, box(1.02, 0.03, 0.48), deep, 0, 0.012, 0.23);
  part(lid, torus(0.12, 0.018, 12, 6, Math.PI), steel, 0, 0.1, 0.23);
  // a spanner, lying along x: a ring at one end, jaws at the other
  const spanner = (x, z, length, turn) => {
    const g = sub(body, x, 0.39, z);
    g.userData.turn = turn;
    part(g, box(length, 0.022, 0.05), steel);
    part(g, torus(0.05, 0.02, 12, 5), steel, -length / 2 - 0.04, 0, 0, FLAT);
    part(g, torus(0.055, 0.022, 10, 5, 4.3), steel, length / 2 + 0.04, 0, 0, FLAT, 0, 1.0);
    return g;
  };
  const spanners = [spanner(-0.02, 0.1, 0.46, 0.08), spanner(-0.12, -0.02, 0.34, -0.14), spanner(0.08, -0.12, 0.26, 0.05)];
  const hammer = sub(body, 0.34, 0.36, -0.06);
  part(hammer, cyl(0.026, 0.032, 0.58, 8), wood, 0, 0.29, 0);
  part(hammer, box(0.26, 0.1, 0.1), grey, 0.02, 0.6, 0);
  part(hammer, cyl(0.06, 0.06, 0.03, 10), steel, 0.16, 0.6, 0, 0, 0, FLAT);
  const driver = sub(body, -0.36, 0.36, -0.08);
  part(driver, cyl(0.014, 0.014, 0.3, 6), steel, 0, 0.15, 0);
  part(driver, cyl(0.045, 0.04, 0.2, 10), lambert(0xffc21a), 0, 0.38, 0);
  part(driver, cyl(0.047, 0.047, 0.04, 10), lambert(0x22252b), 0, 0.34, 0);
  part(body, cyl(0.085, 0.085, 0.06, 14), lambert(0xffc21a), 0.34, 0.405, 0.12); // a tape measure
  part(body, cyl(0.045, 0.045, 0.064, 10), lambert(0x22252b), 0.34, 0.405, 0.12);
  return idle(group, (t) => {
    const fit = Math.pow(Math.max(0, Math.sin(t * 1.4)), 2);
    spanners.forEach((s, k) => {
      s.rotation.y = s.userData.turn + Math.sin(t * 31 + k * 2) * 0.07 * fit;
      s.rotation.x = Math.sin(t * 29 + k) * 0.12 * fit;
      s.position.y = 0.39 + Math.abs(Math.sin(t * 27 + k * 1.3)) * 0.03 * fit;
    });
    hammer.rotation.z = -0.4 + Math.sin(t * 24) * 0.035 * fit;
    driver.rotation.z = 0.32 + Math.sin(t * 26 + 1) * 0.04 * fit;
    body.position.x = Math.sin(t * 33) * 0.005 * fit;
    lid.rotation.x = -1.85 + Math.sin(t * 0.9) * 0.16 + Math.sin(t * 9) * 0.012; // (the creak)
  });
};

// C20 a telescope on a tripod: it swings round to look at one thing and then another, and the lens glints
const makeTelescope = () => {
  const group = new THREE.Group();
  const wood = lambert(0xb07840), dark = lambert(0x22304a), white = lambert(0xf6f6f0), brass = shiny(0xe0b040);
  for (const a of [0.5, 0.5 + Math.PI * 2 / 3, 0.5 + Math.PI * 4 / 3]) {
    rod(group, [Math.sin(a) * 0.46, 0, Math.cos(a) * 0.46], [Math.sin(a) * 0.04, 0.8, Math.cos(a) * 0.04], 0.03, wood, 0.024);
    part(group, sphere(0.04, 8, 6), dark, Math.sin(a) * 0.46, 0.03, Math.cos(a) * 0.46);
  }
  part(group, cyl(0.22, 0.22, 0.02, 3), dark, 0, 0.4, 0, 0, 0.5 + Math.PI, 0);
  part(group, cyl(0.07, 0.085, 0.08, 10), dark, 0, 0.82, 0);
  const head = sub(group, 0, 0.86, 0);
  part(head, box(0.1, 0.12, 0.1), dark, 0, 0.05, 0);
  const tube = sub(head, 0, 0.14, 0);
  part(tube, cyl(0.09, 0.09, 0.8, 16), white, 0, 0, 0.1, FLAT);
  for (const z of [-0.26, 0.42]) part(tube, cyl(0.097, 0.097, 0.05, 16), brass, 0, 0, z, FLAT);
  part(tube, cyl(0.115, 0.105, 0.2, 16), dark, 0, 0, 0.58, FLAT);
  part(tube, new THREE.CircleGeometry(0.1, 16), glow(0x8fd3ff), 0, 0, 0.682);
  part(tube, new THREE.CircleGeometry(0.045, 12), glow(0xffffff), -0.03, 0.03, 0.684);
  part(tube, cyl(0.09, 0.05, 0.1, 12), dark, 0, 0, -0.35, FLAT);
  part(tube, cyl(0.035, 0.035, 0.16, 8), dark, 0, 0, -0.46, FLAT);
  part(tube, cyl(0.045, 0.035, 0.05, 8), brass, 0, 0, -0.55, FLAT);
  part(tube, cyl(0.03, 0.03, 0.34, 8), dark, 0, 0.14, 0.06, FLAT); // its finder
  for (const z of [-0.05, 0.17]) part(tube, box(0.025, 0.07, 0.025), dark, 0, 0.1, z);
  const glint = star(tube);
  glint.position.set(0, 0, 0.7);
  const looks = [[0.5, 0.5], [-0.9, 0.22], [1.7, 0.7], [-0.2, 0.38]]; // [round, up]: what it looks at, in turn
  return idle(group, (t) => {
    const n = Math.floor(t / 2) % 4, k = ease((t / 2 % 1) / 0.45), from = looks[(n + 3) % 4], to = looks[n];
    head.rotation.y = mix(from[0], to[0], k);
    tube.rotation.x = -mix(from[1], to[1], k) + Math.sin(t * 2.2) * 0.01;
    glint.scale.setScalar(tiny(Math.pow(Math.max(0, Math.sin(t * 1.57 + 2.2)), 8) * 0.2));
    glint.rotation.z = t * 2;
  });
};

// the twenty, by their ids in cargo.js
export const GOOD2_MODELS = {
  coffee: makeCoffee, balloons: makeBalloons, present: makePresent, bouquet: makeBouquet, pancakes: makePancakes,
  sundae: makeSundae, sushi: makeSushi, teaset: makeTeaset, record: makeRecord, lavalamp: makeLavalamp,
  snowglobe: makeSnowglobe, bonsai: makeBonsai, puppy: makePuppy, canary: makeCanary, ramen: makeRamen,
  globe: makeGlobe, trophy: makeTrophy, surfboard: makeSurfboard, toolbox: makeToolbox, telescope: makeTelescope,
};
