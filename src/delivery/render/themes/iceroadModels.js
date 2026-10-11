// ---- The ice road's models: no game state, so the gimmicks page can show them too. The aurora (curtains of
// light hung round the sky), a snowmobile, an ice fisherman's hut on its skids, and the sign at the start of the
// ice. Each faces local +z.
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const part = (parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
};
const BOX = new THREE.BoxGeometry(1, 1, 1), ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);

// the aurora: `count` curtains hung in arcs round the sky, `radius` m off and from `low` m up, green at the hem
// and fading out through violet above, in folds, brighter in some rays than others. Out of the fog, and writing no depth; it stays round whoever is looking and drifts slowly (onBeforeRender)
export const makeAurora = (count = 5, radius = 430, low = 70, seed = 7) => {
  const g = new THREE.Group();
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  for (let n = 0; n < count; n++) {
    const from = rand() * Math.PI * 2, sweep = 0.9 + rand() * 1.3, r = radius * (0.8 + rand() * 0.35), base = low + rand() * 60, tall = 110 + rand() * 130;
    const folds = 3 + rand() * 4, wave = 18 + rand() * 30, tint = rand();
    const pos = [], col = [], idx = [], N = 90;
    for (let k = 0; k <= N; k++) {
      const t = k / N, a = from + sweep * t, rr = r + Math.sin(t * Math.PI * 2 * folds) * wave + Math.sin(t * 37) * 6;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, hem = base + Math.sin(t * Math.PI * 2 * folds + 1) * 14;
      const ray = (0.45 + 0.55 * Math.abs(Math.sin(t * 61 + n))) * Math.sin(Math.PI * t) ** 0.6; // (rays, and the curtain fading out at its two ends)
      pos.push(x, hem, z, x * 0.96, hem + tall * 0.45, z * 0.96, x * 0.9, hem + tall, z * 0.9);
      col.push(0.12 * ray, 0.95 * ray, (0.45 + tint * 0.3) * ray, (0.1 + tint * 0.25) * ray, 0.5 * ray, 0.5 * ray, 0, 0, 0);
      if (k) { const q = (k - 1) * 3; idx.push(q, q + 3, q + 1, q + 1, q + 3, q + 4, q + 1, q + 4, q + 2, q + 2, q + 4, q + 5); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const curtain = new THREE.Mesh(geo, material);
    curtain.frustumCulled = false;
    curtain.renderOrder = -1.5;
    curtain.onBeforeRender = (renderer, scene, camera) => {
      curtain.position.set(scene.scale.x < 0 ? -camera.position.x : camera.position.x, 0, camera.position.z);
      curtain.rotation.y = performance.now() * 0.000012 * (n % 2 ? 1 : -1);
      curtain.scale.y = 1 + Math.sin(performance.now() * 0.0004 + n * 2) * 0.06;
      curtain.updateMatrixWorld();
    };
    g.add(curtain);
  }
  return g;
};

// a snowmobile: a cowl and a windscreen, a long seat, two skis out in front
export const makeSnowmobile = (color = 0xd22a2a) => {
  const g = new THREE.Group();
  const body = lambert(color), black = lambert(0x16171a), steel = lambert(0xb9c2cc);
  part(g, BOX, black, 0, 0.35, -0.3, 0.7, 0.4, 2.2);
  part(g, BOX, body, 0, 0.75, 0.5, 0.9, 0.5, 1.4);
  part(g, BOX, body, 0, 0.6, 1.3, 0.7, 0.3, 0.6).rotation.x = 0.4;
  part(g, BOX, black, 0, 0.8, -0.6, 0.6, 0.25, 1.3);
  part(g, BOX, lambert(0x35576a), 0, 1.15, 0.75, 0.7, 0.45, 0.06).rotation.x = -0.5;
  part(g, BOX, black, 0, 1.05, 0.3, 1, 0.06, 0.06);
  for (const x of [-0.55, 0.55]) {
    part(g, BOX, steel, x, 0.06, 1.4, 0.16, 0.06, 1.5);
    part(g, BOX, steel, x, 0.16, 2.18, 0.16, 0.06, 0.3).rotation.x = -0.7;
    part(g, BOX, black, x * 0.8, 0.35, 1.3, 0.06, 0.55, 0.06);
  }
  return g;
};

// an ice fisherman's hut: a small cabin on skids, a lit window, a door, a stovepipe; its fishing hole beside it,
// a tip-up with its flag over it
export const makeFishingHut = (color = 0xb5352c) => {
  const g = new THREE.Group();
  const wall = lambert(color), roof = lambert(0x2c2f36), snow = lambert(0xf4f8fc), wood = lambert(0x6b4a2c);
  for (const x of [-1.2, 1.2]) part(g, BOX, wood, x, 0.12, 0, 0.25, 0.24, 4.2);
  part(g, BOX, wall, 0, 1.45, 0, 2.8, 2.4, 3.4);
  part(g, BOX, roof, 0, 2.75, 0, 3.1, 0.2, 3.8).rotation.z = 0.12;
  part(g, BOX, snow, 0, 2.9, 0, 2.9, 0.16, 3.5).rotation.z = 0.12;
  part(g, BOX, glow(0xffc86a), 1.42, 1.6, 0.5, 0.06, 0.7, 0.9);
  part(g, BOX, glow(0xffc86a), 0, 1.6, 1.72, 0.8, 0.6, 0.06);
  part(g, BOX, wood, 1.42, 1.15, -0.8, 0.06, 1.9, 0.9);
  part(g, ROD, roof, -0.8, 3.4, -0.9, 0.28, 1.3, 0.28);
  part(g, ROD, lambert(0x1c2a3a), 3, 0.03, 0.4, 1, 0.06, 1);              // the hole
  part(g, BOX, wood, 3, 0.4, 0.4, 0.06, 0.8, 0.06);
  part(g, BOX, glow(0xff5a2a), 3, 0.75, 0.6, 0.04, 0.22, 0.34);
  return g;
};

// the sign where the ice begins: a board on two posts
export const makeIceSign = (lines = ['ICE ROAD', 'MAX 10 t  ·  NO STOPPING']) => {
  const g = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#f2b21c';
  c.fillRect(0, 0, 256, 128);
  c.strokeStyle = '#16171a';
  c.lineWidth = 6;
  c.strokeRect(5, 5, 246, 118);
  c.fillStyle = '#16171a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'bold 50px Arial, sans-serif';
  c.fillText(lines[0], 128, 46);
  c.font = 'bold 19px Arial, sans-serif';
  c.fillText(lines[1], 128, 96);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
  board.position.set(0, 3.4, 0.08);
  g.add(board);
  part(g, BOX, lambert(0x5a5f67), 0, 3.4, 0, 5.1, 2.6, 0.1);
  for (const x of [-2, 2]) part(g, BOX, lambert(0x5a5f67), x, 1.6, -0.05, 0.16, 3.2, 0.16);
  return g;
};
