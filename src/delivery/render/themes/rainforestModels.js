// ---- The rainforest's models (see rainforest.js): no game state, so the gimmicks page can show them too.
// Two kinds: the theme's own plain obstacles (RAINFOREST_OBSTACLES: a crate of bananas, a pile of fallen logs, a termite
// mound: registered in render/obstacleModels.js, each facing local +z with its feet on y = 0), and the scenery's
// pieces. The scenery is drawn instanced, so its pieces here are GEOMETRIES with their colours baked in as vertex
// colours (a whole tree is one geometry, a few hundred triangles at most), tinted a little per instance; the
// hut and the macaws are groups of their own.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// (the dark patch under an obstacle, as the other themes' have)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};

// ---- the plain obstacles ------------------------------------------------------------------------------------
export const RAINFOREST_OBSTACLES = {
  // a crate's: a crate of bananas: a pale wooden crate, dark slats and corner posts, a red stencilled band round it, the bunches heaped
  // over its top, a banana leaf hung down one side
  bananaCrate: () => {
    const group = new THREE.Group(), wood = lambert(0xe2c27c), slat = lambert(0x9a6a34), post = lambert(0x5e3f22);
    put(group, new THREE.BoxGeometry(1.18, 0.74, 0.98), wood, 0, 0.37, 0);
    for (const y of [0.16, 0.37, 0.58]) put(group, new THREE.BoxGeometry(1.22, 0.07, 1.02), slat, 0, y, 0);
    for (const x of [-0.58, 0.58]) for (const z of [-0.48, 0.48]) put(group, new THREE.BoxGeometry(0.1, 0.8, 0.1), post, x, 0.4, z);
    put(group, new THREE.BoxGeometry(0.62, 0.22, 0.02), lambert(0xd8262b), 0, 0.45, 0.51);
    put(group, new THREE.BoxGeometry(0.62, 0.22, 0.02), lambert(0xd8262b), 0, 0.45, -0.51);
    // (the bunches: two layers of yellow fingers heaped over the top, each a crescent of two short pieces lying out from the middle
    // and turning up at the end, a green stalk end and a dark tip, the stalk standing in the middle)
    const yellow = lambert(0xf7d63a), green = lambert(0x86b23a), tip = lambert(0x4a3418);
    for (let layer = 0; layer < 2; layer++) {
      const n = layer ? 6 : 8;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + layer * 0.4, lift = layer ? 0.17 : 0;
        const finger = new THREE.Group();
        const low = put(finger, new THREE.CylinderGeometry(0.085, 0.075, 0.42, 6), yellow, 0, 0, 0);
        low.position.set(0, 0.17, 0); low.rotation.x = 1.15;
        const up = put(finger, new THREE.CylinderGeometry(0.07, 0.085, 0.3, 6), yellow, 0, 0, 0);
        up.position.set(0, 0.37, 0.3); up.rotation.x = 0.35;
        put(finger, new THREE.CylinderGeometry(0.03, 0.06, 0.08, 5), tip, 0, 0.5, 0.38).rotation.x = 0.35;
        put(finger, new THREE.SphereGeometry(0.085, 6, 4), green, 0, 0.0, -0.06);
        finger.position.set(Math.cos(a) * 0.1, 0.72 + lift, Math.sin(a) * 0.1);
        finger.rotation.y = Math.PI / 2 - a;
        group.add(finger);
      }
    }
    put(group, new THREE.CylinderGeometry(0.07, 0.09, 0.45, 6), lambert(0x4f7a2a), 0, 0.98, 0);
    const leaf = put(group, new THREE.BoxGeometry(0.9, 0.04, 0.5), lambert(0x2f8a3a), 0.78, 0.55, 0.2);
    leaf.rotation.z = -1.0;
    return grounded(group, 0.95);
  },
  // a bale's: a pile of fallen logs: two lying side by side, a third across them, their cut ends pale, moss on the top,
  // a shelf of orange fungus, a snapped branch stub
  fallenLog: () => {
    const group = new THREE.Group(), bark = lambert(0x5b3b22), ring = lambert(0xe6c98f), moss = lambert(0x4d8f3a);
    const log = (r, len, x, y, z, turn, shade = bark) => {
      const mesh = put(group, new THREE.CylinderGeometry(r, r * 1.04, len, 9).rotateZ(Math.PI / 2), [shade, ring, ring], x, y, z);
      mesh.rotation.y = turn;
      return mesh;
    };
    log(0.56, 2.1, 0, 0.56, -0.55, 0.05);
    log(0.55, 2.0, 0.05, 0.55, 0.55, -0.07, lambert(0x6d4a2b));
    log(0.5, 2.1, 0, 1.2, 0, 0.12, lambert(0x4a3019));
    put(group, new THREE.SphereGeometry(0.42, 8, 5), moss, -0.3, 1.62, 0.05).scale.set(1.5, 0.35, 0.9);
    put(group, new THREE.SphereGeometry(0.24, 7, 4), moss, 0.55, 1.62, 0.1).scale.set(1.2, 0.4, 0.9);
    const shelf = put(group, new THREE.CylinderGeometry(0.3, 0.3, 0.07, 9, 1, false, 0, Math.PI), lambert(0xf08a24), 0.2, 0.85, 1.07);
    shelf.rotation.x = Math.PI / 2;
    shelf.rotation.z = 0.2;
    const stub = put(group, new THREE.CylinderGeometry(0.1, 0.14, 0.7, 6), lambert(0x4a3019), -0.7, 1.7, -0.2);
    stub.rotation.z = 0.5;
    put(group, new THREE.CircleGeometry(0.1, 6), ring, -0.88, 2.0, -0.2).rotation.set(0, 0, 0);
    return grounded(group, 1.45);
  },
  // a cone's: a termite mound: a tall cathedral of clay, ochre going orange, ridged, a paler sunlit tip, dark holes in its flank
  termiteMound: () => {
    const group = new THREE.Group();
    const profile = [[0.52, 0], [0.5, 0.2], [0.4, 0.5], [0.3, 0.76], [0.2, 0.95], [0.1, 1.08], [0.04, 1.18], [0, 1.2]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 7), new THREE.MeshLambertMaterial({ color: 0xd98a3d, flatShading: true }));
    group.add(body);
    for (const [r, y, h] of [[0.42, 0.46, 0.2], [0.27, 0.8, 0.18]]) put(group, new THREE.CylinderGeometry(r * 0.78, r, h, 7), lambert(0xb86a2a), 0, y, 0);
    put(group, new THREE.ConeGeometry(0.1, 0.3, 6), lambert(0xf1cf94), 0, 1.06, 0);
    for (const [x, z, h] of [[0.34, 0.2, 0.62], [-0.3, -0.26, 0.5]]) {
      const spire = put(group, new THREE.ConeGeometry(0.16, h, 6), lambert(0xc4752f), x, h / 2, z);
      spire.rotation.z = -x * 0.5;
    }
    for (const [x, y, z] of [[0, 0.3, 0.5], [0.32, 0.6, 0.27], [-0.3, 0.45, 0.36]]) {
      const hole = put(group, new THREE.CircleGeometry(0.075, 7), new THREE.MeshBasicMaterial({ color: 0x2a160a, side: THREE.DoubleSide }), x, y, z);
      hole.lookAt(x * 3, y, z * 3);
    }
    return grounded(group, 0.8);
  },
};

// ---- geometry with its colours baked in -----------------------------------------------------------------------------
// parts: [geometry, color, x, y, z, sx, sy, sz, rotY, rotZ?] merged into one non-indexed geometry with a `color` attribute
const baked = (parts) => {
  const color = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const geos = parts.map(([geometry, hex, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, turn = 0, lean = 0, tilt = 0]) => {
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone());
    g.deleteAttribute('uv');
    if (!g.attributes.normal) g.computeVertexNormals();
    e.set(tilt, turn, lean, 'YXZ');
    m.compose(p.set(x, y, z), q.setFromEuler(e), s.set(sx, sy, sz));
    g.applyMatrix4(m);
    color.set(hex);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  merged.computeVertexNormals();
  return merged;
};
const TRUNK = (top, bottom, h, sides = 6) => new THREE.CylinderGeometry(top, bottom, h, sides, 1);
const BLOB = new THREE.IcosahedronGeometry(1, 0);

// an arching frond / leaf: a strip of `len` m out from the middle, `wide` m across at its widest, curving up then drooping,
// two-sided (so drawn double-sided); `rib`: a darker line down it is baked in by the caller's colour pairs
const strip = (len, wide, rise, droop, steps = 4) => {
  const pos = [], idx = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps, w = wide * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.12)) * (1 - u * 0.25);
    const x = len * u, y = rise * Math.sin(u * Math.PI * 0.6) - droop * u * u;
    pos.push(x, y, -w / 2, x, y, w / 2);
    if (k) { const i = (k - 1) * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
};

// a tall emergent tree: a flared, buttressed trunk 25 m, a flat umbrella of crown on top in a few lobes (the crown above the camera's 11 m)
export const treeEmergent = () => baked([
  [new THREE.CylinderGeometry(0.5, 0.95, 25, 6, 1, true), 0x6b5a48, 0, 12.5, 0],
  [new THREE.CylinderGeometry(0.95, 2.1, 3.6, 6, 1, true), 0x6b5a48, 0, 1.8, 0],              // (the flare of its buttresses)
  [new THREE.CylinderGeometry(0.56, 0.6, 7, 5, 1, true), 0x4f7a36, 0, 7.5, 0],            // (a sleeve of moss and epiphytes up the lower trunk)
  [BLOB, 0x3b8f3b, 0, 28, 0, 6.5, 3.2, 6.5],
  [BLOB, 0x49a042, 4.4, 26, 1.5, 4.6, 2.8, 4.6],
  [BLOB, 0x2f7e36, -3.6, 25.5, -2.4, 4.8, 2.6, 4.8],
  [BLOB, 0x5aaf4a, 0.5, 30.2, 0.8, 3.6, 2.0, 3.6],
]);
// a middle-storey tree: a slim trunk 17 m, a round crown of four lobes above it, a bit of lighter green on top
export const treeMid = () => baked([
  [new THREE.CylinderGeometry(0.3, 0.65, 17, 6, 1, true), 0x7a6650, 0, 8.5, 0],
  [BLOB, 0x2c7a34, 0, 19, 0, 4.4, 3.6, 4.4],
  [BLOB, 0x3a8f3c, 2.6, 17, 1.2, 3.2, 2.6, 3.2],
  [BLOB, 0x246c2e, -2.4, 17.3, -1.6, 3.3, 2.7, 3.3],
  [BLOB, 0x55a846, 0.4, 21.6, -0.4, 2.7, 2.0, 2.7],
]);
// a tree fern: a thin dark trunk and a crown of arching fronds, pale green
export const treeFern = () => {
  const frond = strip(1, 0.34, 0.28, 0.5, 4);
  const parts = [[TRUNK(0.12, 0.2, 4.2, 5), 0x4a3b2a, 0, 2.1, 0]];
  for (let k = 0; k < 8; k++) parts.push([frond, k % 2 ? 0x4aa545 : 0x62b84c, 0, 4.2, 0, 3.4, 1.7, 1.2, k / 8 * Math.PI * 2, 0.15 + (k % 2) * 0.12]);
  return baked(parts);
};
// a clump of ferns: nine fronds from the middle, arching, in two greens
export const fernClump = () => {
  const frond = strip(1, 0.3, 0.38, 0.42, 3);
  const parts = [];
  for (let k = 0; k < 9; k++) parts.push([frond, k % 2 ? 0x3c9a3c : 0x2c7e32, 0, 0.1, 0, 1.5, 1.1, 0.9, k / 9 * Math.PI * 2 + (k % 3) * 0.2, 0.25 + (k % 3) * 0.18]);
  return baked(parts);
};
// a plant of big leaves (a banana or a philodendron): four broad leaves on stalks, arching out and up, a darker midrib along each
export const bigLeaves = () => {
  const leaf = strip(1, 0.62, 0.5, 0.2, 4), rib = strip(1, 0.05, 0.5, 0.2, 4);
  const parts = [[TRUNK(0.08, 0.14, 1.2, 5), 0x4f7a34, 0, 0.6, 0]];
  for (let k = 0; k < 5; k++) {
    const turn = k / 5 * Math.PI * 2 + 0.3, lean = 0.45 + (k % 2) * 0.35;
    parts.push([leaf, k % 2 ? 0x57b24a : 0x3f9c3e, 0, 1.0 + (k % 2) * 0.3, 0, 2.5, 1.4, 1.3, turn, lean]);
    parts.push([rib, 0x1f5a28, 0, 1.03 + (k % 2) * 0.3, 0, 2.5, 1.4, 1.3, turn, lean]);
  }
  return baked(parts);
};
// a flower head to be tinted per instance: a heliconia's, a dark stem and four stacked bracts, each a flat cone one over the next, a
// yellow-green tip; made white so the instance's colour is the flower's
export const flowerHead = () => baked([
  [TRUNK(0.025, 0.04, 1.1, 4), 0x2f5a22, 0, 0.55, 0],
  ...[0, 1, 2, 3].map(k => [new THREE.ConeGeometry(0.2 - k * 0.025, 0.28, 5), 0xffffff, 0, 1.1 + k * 0.17, 0, 1, 1, 1, k * 1.2, 0.35 * (k % 2 ? -1 : 1)]),
  [new THREE.SphereGeometry(0.07, 5, 4), 0xf6e65a, 0, 1.78, 0],
]);
// a hanging vine: a thin dark rope with a leaf or two on it, 1 m long, to be stretched
export const vine = () => baked([
  [TRUNK(0.045, 0.045, 1, 4), 0x2f4a22, 0, -0.5, 0],
  [new THREE.BoxGeometry(0.34, 0.02, 0.2), 0x3f9a3a, 0.14, -0.3, 0, 1, 1, 1, 0.5, 0.3],
  [new THREE.BoxGeometry(0.3, 0.02, 0.18), 0x4aa845, -0.12, -0.62, 0, 1, 1, 1, -0.4, -0.3],
]);

// ---- a ranger's hut: on stilts, planked walls, a roof of green tin hung out over a porch, a ladder, a lit lamp, a flag,
// a water tank on a frame beside it, a board with a leaf on it
export const makeRangerHut = () => {
  const g = new THREE.Group();
  const wood = lambert(0x6a4a2e), light = lambert(0xb08a58), tin = lambert(0x3f7d57), dark = lambert(0x2a1c10), white = lambert(0xf2efe2);
  for (const x of [-2.6, 2.6]) for (const z of [-3.2, 3.2]) put(g, new THREE.CylinderGeometry(0.17, 0.2, 2.6, 6), wood, x, 1.3, z);
  put(g, new THREE.BoxGeometry(6.4, 0.25, 8), light, 0, 2.7, 0);
  put(g, new THREE.BoxGeometry(5, 3, 5.6), wood, -0.2, 4.3, -0.5);
  for (let k = 0; k < 6; k++) put(g, new THREE.BoxGeometry(5.04, 0.08, 5.64), dark, -0.2, 3.1 + k * 0.5, -0.5);
  put(g, new THREE.BoxGeometry(0.06, 1.8, 1.1), dark, 2.33, 4.0, -0.5);                              // the door
  put(g, new THREE.BoxGeometry(0.06, 0.9, 1.1), lambert(0xffd27a, { emissive: 0x8a5a10 }), 2.33, 4.5, 1.6); // a lit window
  for (const s of [-1, 1]) {                                                                         // the roof: two slopes, a ridge
    const slope = put(g, new THREE.BoxGeometry(3.9, 0.14, 7.4), tin, s * 1.8 - 0.2, 6.35, -0.5);
    slope.rotation.z = -s * 0.42;
  }
  put(g, new THREE.BoxGeometry(0.4, 0.2, 7.4), lambert(0x2f6446), -0.2, 7.0, -0.5);
  for (const z of [-3.2, 3.2]) { // (the porch rail along the front, with posts)
    put(g, new THREE.BoxGeometry(0.14, 1.2, 0.14), wood, 3.0, 3.5, z);
  }
  put(g, new THREE.BoxGeometry(0.1, 0.1, 6.4), wood, 3.0, 4.1, 0);
  const ladder = put(g, new THREE.BoxGeometry(0.16, 3.2, 0.9), light, 3.9, 1.4, 0);
  ladder.rotation.z = -0.5;
  put(g, new THREE.BoxGeometry(0.1, 5, 0.1), white, -2.6, 8.3, 3.1);                                 // the flag
  put(g, new THREE.BoxGeometry(0.05, 0.9, 1.5), lambert(0x2e9e4f), -2.6, 10.4, 3.9);
  put(g, new THREE.SphereGeometry(0.18, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffc860 }), 2.7, 5.6, 0);  // the lamp
  // (a tank on a frame)
  for (const x of [-1, 1]) for (const z of [-1, 1]) put(g, new THREE.CylinderGeometry(0.1, 0.1, 2.4, 5), wood, -6 + x * 0.8, 1.2, 0.5 + z * 0.8);
  put(g, new THREE.CylinderGeometry(1.2, 1.2, 1.9, 12), lambert(0x4f6f8a), -6, 3.3, 0.5);
  // (the board)
  put(g, new THREE.CylinderGeometry(0.07, 0.07, 3, 5), wood, 5.6, 1.5, 4.8);
  put(g, new THREE.BoxGeometry(0.1, 1.5, 2.6), white, 5.6, 3.2, 4.8);
  put(g, new THREE.BoxGeometry(0.12, 0.9, 0.9), lambert(0x2e9e4f), 5.62, 3.2, 4.8).rotation.x = 0.78;
  return g;
};

// ---- a scarlet macaw: a red body, long red tail, blue and yellow wings that beat; it flies a circle (userData.animate(t))
export const makeMacaw = (path = 18) => {
  const g = new THREE.Group(), bird = new THREE.Group();
  const red = new THREE.MeshBasicMaterial({ color: 0xe6281f }), blue = new THREE.MeshBasicMaterial({ color: 0x2a6fe0, side: THREE.DoubleSide });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xf8cf2a, side: THREE.DoubleSide });
  put(bird, new THREE.SphereGeometry(0.5, 6, 5), red, 0, 0, 0).scale.set(0.7, 0.7, 1.5);
  put(bird, new THREE.SphereGeometry(0.34, 6, 5), red, 0, 0.12, 0.85);
  put(bird, new THREE.BoxGeometry(0.2, 0.12, 0.35), lambert(0xf2f0e6), 0, 0.1, 1.2);
  put(bird, new THREE.BoxGeometry(0.34, 0.06, 2.2), blue, 0, -0.05, -1.7);
  const wings = [-1, 1].map(side => {
    const wing = new THREE.Group();
    put(wing, new THREE.BoxGeometry(1.9, 0.05, 0.9), yellow, side * 0.95, 0, 0);
    put(wing, new THREE.BoxGeometry(1.7, 0.05, 0.7), blue, side * 1.0, 0, -0.55);
    bird.add(wing);
    wing.userData.side = side;
    return wing;
  });
  g.add(bird);
  g.userData.animate = (t) => {
    const a = t * 0.35, flap = Math.sin(t * 9) * 0.6;
    for (const w of wings) w.rotation.z = w.userData.side * flap;
    bird.position.set(Math.cos(a) * path, Math.sin(t * 0.8) * 1.5, Math.sin(a) * path);
    bird.rotation.y = -a;
    bird.rotation.z = -0.25;
  };
  return g;
};
