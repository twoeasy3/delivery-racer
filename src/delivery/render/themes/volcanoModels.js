// ---- The volcano island's models: no game state. The volcano itself, for the skyline (a broad cone, lava running
// down it from a glowing crater, a column of smoke going up and off with the wind); and the shapes its scenery is
// made of many times over: a palm's crown of fronds, a boulder of basalt.
import * as THREE from 'three';

// a palm's crown: eight fronds arching out and down from the top of the trunk, some 4.5 m long (both faces)
export const FRONDS = (() => {
  const pos = [], idx = [];
  const spine = [[0, 0, 1], [1.2, 0.55, 0.95], [2.4, 0.6, 0.8], [3.4, 0.1, 0.55], [4.3, -1, 0.12]]; // out, up, half its width
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + (k % 2) * 0.2, c = Math.cos(a), s = Math.sin(a), lift = (k % 2) * 0.35, base = pos.length / 3;
    for (const [r, y, w] of spine) pos.push(c * r - s * w * 0.55, y + lift * r * 0.2, s * r + c * w * 0.55, c * r + s * w * 0.55, y + lift * r * 0.2, s * r - c * w * 0.55);
    for (let j = 0; j < spine.length - 1; j++) {
      const q = base + j * 2;
      idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2, q + 2, q + 1, q, q + 2, q + 3, q + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
})();
// a boulder: a ball of a few flat faces, 1 m across
export const BOULDER = new THREE.IcosahedronGeometry(0.5, 0);
export const PUFF = new THREE.IcosahedronGeometry(0.5, 1);

// the volcano: `r` m across its foot and `h` high, its foot at the origin. userData.animate(t) moves its smoke
export const makeVolcano = (r = 230, h = 150) => {
  const g = new THREE.Group();
  const top = r * 0.17;
  const at = (y) => top + (r - top) * (1 - y / h);                 // its radius at a height
  const body = new THREE.CylinderGeometry(top, r, h, 30, 7, true);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {                              // gullies down its flanks
    const y = p.getY(i) + h / 2, a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 + (Math.sin(a * 7) * 0.05 + Math.sin(a * 13 + 1.7) * 0.03) * (0.4 + y / h);
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  body.computeVertexNormals();
  const rock = new THREE.MeshLambertMaterial({ color: 0x352b30, fog: false, flatShading: true });
  const cone = new THREE.Mesh(body, rock);
  cone.position.y = h / 2;
  g.add(cone);
  // lava down its flanks: ribbons from the rim, each a way of its own, a brighter thread down the middle of it
  const glow = (color) => new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide });
  const hot = glow(0xff4a12), bright = glow(0xffc23a);
  const ribbon = (a0, len, width, out, mat) => {
    const pos = [], idx = [];
    for (let k = 0; k <= 14; k++) {
      const u = k / 14, y = h - u * len, a = a0 + Math.sin(u * 5 + a0 * 3) * 0.07, w = width * (1 - u * 0.6) / at(y), rad = at(y) * 1.13 + out;
      pos.push(Math.cos(a - w) * rad, y, Math.sin(a - w) * rad, Math.cos(a + w) * rad, y, Math.sin(a + w) * rad);
      if (k) { const q = (k - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    g.add(new THREE.Mesh(geo, mat));
  };
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + 0.3, len = h * (0.35 + ((k * 7) % 5) * 0.12);
    ribbon(a, len, 7, 1.5, hot);
    ribbon(a, len * 0.8, 2.6, 2.5, bright);
  }
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(top * 1.02, top * 1.08, 5, 30), hot);
  rim.position.y = h + 1;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(top * 1.5, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: false, transparent: true, opacity: 0.35, depthWrite: false }));
  halo.position.y = h + 8;
  halo.scale.y = 0.7;
  g.add(rim, halo);
  // its smoke: puffs going up out of the crater, swelling and leaning off down the wind
  const puffs = [];
  for (let k = 0; k < 10; k++) {
    const puff = new THREE.Mesh(PUFF, new THREE.MeshLambertMaterial({ color: 0x6a6166, fog: false, transparent: true, depthWrite: false, flatShading: true }));
    g.add(puff);
    puffs.push(puff);
  }
  g.userData.animate = (t) => {
    puffs.forEach((puff, k) => {
      const u = ((t * 0.035 + k / puffs.length) % 1 + 1) % 1, size = top * (1.1 + u * 3.2);
      puff.position.set(u * u * r * 0.9 + Math.sin(k * 2.4) * top * 0.3, h + 6 + u * h * 1.5, Math.cos(k * 1.7) * top * 0.3 + u * r * 0.2);
      puff.scale.set(size, size * 0.85, size);
      puff.rotation.y = k + t * 0.05;
      puff.material.opacity = 0.92 * Math.min(1, u * 8) * (1 - u) ** 0.6;
    });
  };
  g.userData.animate(0);
  return g;
};
