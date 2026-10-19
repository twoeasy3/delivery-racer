// ---- THE NEON FUTURE CITY'S OBSTACLES (theme 'neonCity': themes.js OBSTACLES; render/obstacleModels.js takes them in) ------------
// Each the box and the cost of the plain kind it stands in for (collision.js, config.js): a delivery pod (a crate), a hover planter
// (a bale), a charging post (a cone), a holo barrier (a barrier). Plain, readable at a glance: a pale body, ONE glowing colour each.
// Solid parts lit by the scene, glowing parts MeshBasic (no light). No text, no logo, no figure.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matrix = new THREE.Matrix4(), euler = new THREE.Euler(), colour = new THREE.Color();
const kit = () => {
  const solid = [], lit = [];
  const add = (list, geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(matrix.makeRotationFromEuler(euler.set(rx, ry, rz)).setPosition(x, y, z));
    colour.set(col);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([colour.r, colour.g, colour.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
    list.push(g);
  };
  return {
    box: (w, h, d, col, x, y, z, rx, ry, rz) => add(solid, new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz),
    cyl: (rt, rb, h, n, col, x, y, z, rx, ry, rz) => add(solid, new THREE.CylinderGeometry(rt, rb, h, n), col, x, y, z, rx, ry, rz),
    ball: (r, col, x, y, z, sy = 1) => add(solid, new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1), col, x, y, z),
    glowBox: (w, h, d, col, x, y, z, rx, ry, rz) => add(lit, new THREE.BoxGeometry(w, h, d), col, x, y, z, rx, ry, rz),
    glowCyl: (rt, rb, h, n, col, x, y, z, rx, ry, rz) => add(lit, new THREE.CylinderGeometry(rt, rb, h, n), col, x, y, z, rx, ry, rz),
    done() {
      const group = new THREE.Group();
      if (solid.length) group.add(new THREE.Mesh(mergeGeometries(solid), new THREE.MeshLambertMaterial({ vertexColors: true })));
      if (lit.length) group.add(new THREE.Mesh(mergeGeometries(lit), new THREE.MeshBasicMaterial({ vertexColors: true })));
      return group;
    },
  };
};
const grounded = (group, r) => {
  const shade = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.03;
  group.add(shade);
  return group;
};
const CYAN = 0x2ff4ff, MAGENTA = 0xff2fd0, WHITE = 0xe8ecf4, DARK = 0x23263a;

export const NEON_OBSTACLES = {
  // the crate: a DELIVERY POD, a pale rounded-off box on a dark skid, a cyan band of light round its middle, a dark lid seam
  cargoPod: () => {
    const K = kit();
    K.box(1.1, 0.12, 1.1, DARK, 0, 0.06, 0);
    K.box(1.08, 0.82, 1.08, WHITE, 0, 0.53, 0);
    K.box(0.92, 0.14, 0.92, WHITE, 0, 1.01, 0);                    // (its top stepped in: the corners read rounded)
    K.glowBox(1.12, 0.08, 1.12, CYAN, 0, 0.62, 0);
    K.box(0.94, 0.02, 0.94, DARK, 0, 1.085, 0);
    return grounded(K.done(), 0.75);
  },
  // the bale: a HOVER PLANTER, a dark base pad, a magenta ring of light, then (a hand's width over it) a white tub with a round
  // shrub in it: floating. A bale's box (2.2 m square, 1.5 m)
  hoverPlanter: () => {
    const K = kit();
    K.cyl(1.0, 1.05, 0.14, 24, DARK, 0, 0.07, 0);
    K.glowCyl(0.95, 0.95, 0.06, 24, MAGENTA, 0, 0.17, 0);
    K.cyl(1.0, 0.82, 0.6, 24, WHITE, 0, 0.62, 0);
    K.glowCyl(1.02, 1.02, 0.05, 24, MAGENTA, 0, 0.9, 0);
    K.ball(0.82, 0x2f8a6a, 0, 1.08, 0, 0.55);
    K.ball(0.45, 0x3aa47a, 0.3, 1.32, -0.2, 0.7);
    return grounded(K.done(), 1.25);
  },
  // the cone: a CHARGING POST, a slim white post, a cyan strip of light down its front, a dark screen near the top, a dark foot
  chargePost: () => {
    const K = kit();
    K.box(0.5, 0.08, 0.4, DARK, 0, 0.04, 0);
    K.box(0.34, 1.0, 0.24, WHITE, 0, 0.58, 0);
    K.glowBox(0.06, 0.7, 0.02, CYAN, 0, 0.5, 0.125);
    K.box(0.24, 0.16, 0.02, 0x0c0e18, 0, 0.95, 0.125);
    K.glowBox(0.36, 0.04, 0.26, CYAN, 0, 1.1, 0);
    return grounded(K.done(), 0.45);
  },
  // the barrier: a HOLO BARRIER, two dark posts, a rail of light along their tops and a band of magenta light between them
  holoGate: () => {
    const K = kit();
    for (const x of [-1.05, 1.05]) { K.box(0.2, 1.15, 0.3, DARK, x, 0.575, 0); K.box(0.36, 0.08, 0.5, DARK, x, 0.04, 0); }
    K.glowBox(2.0, 0.5, 0.04, MAGENTA, 0, 0.62, 0);
    K.box(2.3, 0.1, 0.16, WHITE, 0, 1.13, 0);
    K.glowBox(2.3, 0.04, 0.17, CYAN, 0, 1.07, 0);
    K.box(2.0, 0.08, 0.1, DARK, 0, 0.32, 0);
    return grounded(K.done(), 1.2);
  },
};
