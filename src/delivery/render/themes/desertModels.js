// ---- the desert dunes' models (render/themes/desert.js): the shapes the scenery is stamped from, and the theme's own
// obstacles (themes.js: a crate is a stack of jerrycans here, a bale a rolled tent, a cone a rally marker flag).
// The scenery's shapes are plain geometries, drawn many at a time by `instances`; the obstacles are models, one
// each, registered with the others in ../obstacleModels.js (this file imports nothing from there, so that file
// can import this). All low-poly: nothing here is more than a few hundred triangles.
import * as THREE from 'three';

// a small stable "random" for shapes that want to look rough but be the same every time
const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

// the lathe-free way to a faceted rock: a geometry with each face its own (flat shading, whatever the material)
const faceted = (geometry) => { const g = geometry.index ? geometry.toNonIndexed() : geometry; g.computeVertexNormals(); return g; };

// ---- a natural arch of sandstone: half a fat ring standing in the plane across the road (x across, y up), its feet
// at y = 0, 1 m wide at the unit size and as thick as it is deep in z. Roughened, faceted. Scale it to span the road:
// x radius, y height, z depth. (The feet are widened a little so it stands on the land and does not balance on its ends.)
export const archGeometry = () => {
  const ring = new THREE.TorusGeometry(1, 0.3, 7, 14, Math.PI);
  const pos = ring.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const bulge = 1 + (hash(i, 1) - 0.5) * 0.28;
    const foot = y < 0.25 ? 1 + (0.25 - y) * 0.9 : 1;           // (wider at the feet)
    pos.setXYZ(i, x * bulge * (x > 0 ? foot : foot), y * bulge, z * (1 + (hash(i, 2) - 0.5) * 0.3) * 1.6);
  }
  return faceted(ring);
};

// ---- a palm's crown: nine fronds out from the middle, each rising a little and then drooping, a ribbon tapering to
// its tip, both faces drawn (the instances' material is one-sided). One unit across; scale it up.
export const palmCrownGeometry = () => {
  const pos = [], SEG = 5;
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + hash(k, 3) * 0.3, c = Math.cos(a), s = Math.sin(a), len = 0.8 + hash(k, 4) * 0.2;
    const at = (t, side) => {
      const w = 0.07 * (1 - t * 0.85) * side, r = t * len;
      return [c * r - s * w, 0.34 * t - 0.8 * t * t - 0.02 * hash(k, 5), s * r + c * w];
    };
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG, t1 = (i + 1) / SEG, a0 = at(t0, -1), a1 = at(t0, 1), b0 = at(t1, -1), b1 = at(t1, 1);
      pos.push(...a0, ...a1, ...b0, ...a1, ...b1, ...b0);   // the top face...
      pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);   // ...and the underside
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
};

// ---- a long low dune seen from far off: half an ellipsoid, wider than it is high, a ridge along its length (z),
// its crest pushed to one side; two of them differing in how the crest sits, so a line of them is not a row of one
export const duneGeometry = (lean = 0.18) => {
  const geo = new THREE.SphereGeometry(0.5, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // (the crest a sharp edge: heights fall away faster from the ridge line, and slide towards one side)
    pos.setXYZ(i, x + y * lean, Math.pow(y * 2, 0.8) * 0.5, z);
  }
  geo.computeVertexNormals();
  return geo;
};

// ---- a tent roof: a four-sided pyramid, its base a unit square
export const roofGeometry = () => new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);

// ---- a wheel on its side (axis across the road)
export const wheelGeometry = () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateZ(Math.PI / 2);

// ---- a flat disc lying on the ground (a pool, a patch of green): radius 0.5, scale it in x and z
export const discGeometry = () => new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);

// ===== the theme's own obstacles ======================================================================================
const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const put = (group, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
};
// (the dark patch under it, as a rock's: a pale road shows a shadow well)
const grounded = (group, r) => {
  const shade = put(group, new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0, 0.03, 0);
  shade.rotation.x = -Math.PI / 2;
  return group;
};

export const DESERT_OBSTACLES = {
  // the desert's crate: jerrycans stacked on a pallet, two layers of four: red, olive and sand yellow, each a flat-sided can with
  // a spout and a handle, strapped round with a white band. Tall and bright against the pale sand
  jerryStack: () => {
    const group = new THREE.Group(), colours = [0xc8321f, 0x59702f, 0xe0a82a, 0xc8321f, 0xe0a82a, 0x59702f, 0xc8321f, 0x59702f];
    put(group, new THREE.BoxGeometry(1.2, 0.1, 1.2), lambert(0x7d5a36), 0, 0.05, 0);          // the pallet
    colours.forEach((colour, i) => {
      const layer = Math.floor(i / 4), x = (i % 2 ? 1 : -1) * 0.29, z = (Math.floor(i / 2) % 2 ? 1 : -1) * 0.29, can = new THREE.Group();
      put(can, new THREE.BoxGeometry(0.5, 0.5, 0.5), lambert(colour), 0, 0.25, 0);
      put(can, new THREE.BoxGeometry(0.5, 0.045, 0.14), lambert(0x15171a), 0, 0.52, 0);       // the handle's top bar
      put(can, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6), lambert(0x15171a), 0.14, 0.55, -0.12); // the spout
      can.position.set(x, 0.1 + layer * 0.5, z);
      can.rotation.y = layer * 0.35 + (i % 3) * 0.08;
      group.add(can);
    });
    for (const y of [0.35, 0.85]) put(group, new THREE.BoxGeometry(1.24, 0.07, 1.24), lambert(0xf4f1e6), 0, y, 0); // the straps
    return grounded(group, 0.95);
  },
  // the desert's bale: a rolled tent on its side (its axis along the road: it rolls across it as it drifts): red-orange canvas in a
  // fat roll, two white straps, the tent poles bundled along it, the canvas's coil showing at each end
  tentRoll: () => {
    const group = new THREE.Group(), roller = new THREE.Group(), strap = lambert(0xf4f1e6);
    roller.position.y = 0.78;
    group.add(roller);
    put(roller, new THREE.CylinderGeometry(0.78, 0.78, 2.1, 14).rotateX(Math.PI / 2), lambert(0xc4452a), 0, 0, 0);
    for (const z of [-0.6, 0.6]) put(roller, new THREE.CylinderGeometry(0.81, 0.81, 0.14, 14).rotateX(Math.PI / 2), strap, 0, 0, z);
    for (const end of [-1, 1]) {
      put(roller, new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12).rotateX(Math.PI / 2), lambert(0x8a2a17), 0, 0, end * 1.06);
      put(roller, new THREE.TorusGeometry(0.28, 0.05, 5, 12), lambert(0xe8a07a), 0, 0, end * 1.09);
    }
    for (const a of [0.5, 2.3, 4.1]) put(roller, new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5).rotateX(Math.PI / 2), lambert(0x6e7276), Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0); // the poles
    group.userData = { roller };
    return grounded(group, 1.15);
  },
  // the desert's cone: a rally marker flag: a pole stuck in a heap of sand, a red-and-white pennant streaming from it
  rallyFlag: () => {
    const group = new THREE.Group();
    put(group, new THREE.ConeGeometry(0.5, 0.45, 9), lambert(0xd9a85c), 0, 0.22, 0);                // the heap of sand
    put(group, new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6), lambert(0xf4f1e6), 0, 1.3, 0);      // the pole
    put(group, new THREE.SphereGeometry(0.07, 6, 5), lambert(0xe6b63c), 0, 2.42, 0);
    const flag = new THREE.Group();
    flag.position.set(0, 2.1, 0);
    group.add(flag);
    const bands = [[0xd8262b, 0.62], [0xf4f1e6, 0.42], [0xd8262b, 0.22]];
    bands.forEach(([colour, len], i) => put(flag, new THREE.BoxGeometry(0.03, 0.2, len), new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide }), 0, 0.2 - i * 0.2, len / 2 + 0.03));
    return grounded(group, 0.65);
  },
};
