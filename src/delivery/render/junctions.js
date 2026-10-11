// ---- junctions: the box, the arms the road doesn't take, and the arrows -----------------------------
// (The layout is Track.junctions; the traffic leaving the road down the arms is Traffic's.) Each
// junction looks like a real one: a plain box with no lines through it (the road's markings stop at
// it: see road.js), and on every arm, the road's included, a zebra crossing and a stop line before
// it. Across the mouth of each arm the road doesn't take is a barrier: a single sheet of light
// covered in big chevrons, pointing the way the road goes and scrolling along it (as in Need for
// Speed Underground 2). It keeps the player on the one route; traffic goes through it.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { scene, clearGroup } from './scene.js';
import { buildStrip } from './road.js';

const group = new THREE.Group();
scene.add(group);

const ASPHALT = new THREE.MeshBasicMaterial({ color: 0x3a3d42, side: THREE.DoubleSide });
const paint = (color, order) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: order, polygonOffsetUnits: order });
const WHITE = paint(0xf2f2f2, -2), YELLOW = paint(0xffc400, -2);
const GLOW = 0x5cf6ff;
const SHEET_HEIGHT = 10, TILE = 3.4; // m tall; and the size of each chevron's square, repeated across it and up it
// the chevrons: one texture for every barrier, repeating along it. A soft band of light, brightest
// across the middle, and on it one fat glowing chevron pointing along +u (it is drawn additively, so
// black is see-through)
const CHEVRONS = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const g = canvas.getContext('2d');
  const band = g.createLinearGradient(0, 0, 0, 128);
  band.addColorStop(0, '#000');
  band.addColorStop(0.5, '#3c3c3c');
  band.addColorStop(1, '#000');
  g.fillStyle = band;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#fff';
  g.lineWidth = 20;
  g.lineJoin = 'miter';
  g.shadowColor = '#fff';
  g.shadowBlur = 16;
  g.beginPath();
  g.moveTo(36, 20);
  g.lineTo(88, 64);
  g.lineTo(36, 108);
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
})();
const SHEET = new THREE.MeshBasicMaterial({ map: CHEVRONS, color: GLOW, vertexColors: true, transparent: true,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
const rightOf = (d) => ({ x: -d.z, z: d.x });

// a flat rectangle: `length` m on from (x, z) in direction d, from `a` to `b` m right of that line, at height y
const slab = (x, z, d, length, a, b, y, material) => {
  const r = rightOf(d), p = [];
  for (const [u, v] of [[0, a], [0, b], [length, a], [length, b]]) p.push(x + d.x * u + r.x * v, y, z + d.z * u + r.z * v);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setIndex([0, 1, 2, 1, 3, 2]);
  const mesh = new THREE.Mesh(geo, material);
  group.add(mesh);
  return mesh;
};

// a barrier: a sheet `width` m wide standing at (x, y, z), facing along `facing`, its chevrons pointing
// along `point` (or, where that runs straight through the sheet, along `otherwise`)
const barrier = (x, y, z, width, facing, point, otherwise) => {
  const geo = new THREE.PlaneGeometry(width, SHEET_HEIGHT);
  // (the chevrons repeat along it and up it, and it fades out towards the top)
  const uv = geo.attributes.uv, shade = [];
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * width / TILE, uv.getY(i) * SHEET_HEIGHT / TILE);
    const k = uv.getY(i) > 0 ? 0.12 : 1;
    shade.push(k, k, k);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(shade, 3));
  const sheet = new THREE.Mesh(geo, SHEET);
  sheet.position.set(x, y + SHEET_HEIGHT / 2, z);
  sheet.lookAt(x + facing.x, y + SHEET_HEIGHT / 2, z + facing.z);
  const along = new THREE.Vector3(1, 0, 0).applyQuaternion(sheet.quaternion); // (the way +u runs)
  let way = along.x * point.x + along.z * point.z;
  if (Math.abs(way) < 0.5) way = along.x * otherwise.x + along.z * otherwise.z;
  if (way < 0) sheet.rotateY(Math.PI);
  group.add(sheet);
};

const build = () => {
  clearGroup(group);
  const LW = CONFIG.laneWidth;
  for (const jn of Track.junctions) {
    const { centre: c, half, f0 } = jn, y = c.y + 0.004;
    // the box, and each arm the road doesn't take, out into the distance
    slab(c.x - f0.x * half, c.z - f0.z * half, f0, 2 * half, -half, half, y, ASPHALT);
    const lanes = Math.max(Track.leftLanes, Track.rightLanes), edge = Track.medianHalf + lanes * LW;
    const toward = jn.way ? jn.out : f0; // (the way the road goes on from here)
    jn.arms.forEach((arm, k) => {
      const d = arm.dir, mx = c.x + d.x * half, mz = c.z + d.z * half, run = arm.length - half;
      slab(mx, mz, d, run, -half, half, y, ASPHALT);
      // a zebra crossing at the mouth and a stop line behind it, across the lanes coming in (on the
      // left, looking out along the arm); beyond, edge lines, double yellow down the middle, and
      // dashed lane lines
      for (let v = -edge + 0.3; v < edge - 0.3; v += 1.1) slab(mx + d.x * 1.5, mz + d.z * 1.5, d, 4, v, v + 0.55, y + 0.01, WHITE);
      slab(mx + d.x * 6.5, mz + d.z * 6.5, d, 0.45, -edge, -0.3, y + 0.01, WHITE);
      const lx = mx + d.x * 7, lz = mz + d.z * 7, lrun = run - 7;
      for (const side of [-1, 1]) {
        slab(lx, lz, d, lrun, side * edge - 0.1, side * edge + 0.1, y + 0.01, WHITE);
        slab(lx, lz, d, lrun, side * 0.12 - 0.08, side * 0.12 + 0.08, y + 0.01, YELLOW);
        for (let n = 1; n < lanes; n++) {
          for (let u = 2; u < lrun - 3; u += 9) {
            const lat = side * (Track.medianHalf + n * LW);
            slab(lx + d.x * u, lz + d.z * u, d, 3, lat - 0.08, lat + 0.08, y + 0.01, WHITE);
          }
        }
      }
      // the barrier across its mouth, just inside the box
      barrier(mx - d.x * 0.5, y, mz - d.z * 0.5, 2 * half, d, toward, f0);
    });
    // and on the road's own arms (the way in and the way out): a crossing at the box's edge, and a
    // stop line behind it across the lanes coming in
    const lo = (s) => Track.laneLo(s) + 0.3, hi = (s) => Track.laneHi(s) - 0.3;
    for (const [from, to, stop, side] of [[jn.s - 6, jn.s - 2, jn.s - 7.5, 1], [jn.end + 2, jn.end + 6, jn.end + 7, -1]]) {
      for (let v = lo(from); v < hi(from); v += 1.1) group.add(new THREE.Mesh(buildStrip(from, to, v, v + 0.55, 0.025, 1), WHITE));
      group.add(new THREE.Mesh(buildStrip(stop, stop + 0.45, side > 0 ? 0.3 : lo, side > 0 ? hi : -0.3, 0.025, 1), WHITE));
    }
  }
};
Game.onLoad.push(build);

// every frame: the chevrons scroll along the barriers, and the light breathes
export const syncJunctions = (now) => {
  const t = now / 1000;
  CHEVRONS.offset.x = -((t * 0.9) % 1);
  SHEET.opacity = 0.8 + 0.2 * Math.sin(t * 4);
};
