// ---- SITE WORKS: the work on a construction site's shoulders (what it does: ../site.js) -------------
// Trenches dug along the shoulder, dark and deep, with steel plates across them here and there and
// spoil heaped beside; long-reach excavators beside the road swinging their arms out over it; the
// workers pushing their barrows (the barrows are obstacles: render/items.js), and diving clear;
// stacks of concrete pipes by the fence.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Collision } from '../collision.js';
import { Site } from '../site.js';
import { scene, tmp } from './scene.js';
import { buildStrip } from './road.js';
import { makeDigger, makeWorker } from './siteModels.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const flat = (color, offset) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset });
const add = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);


const group = new THREE.Group();
scene.add(group);
let diggers = [], workers = [];
Game.onLoad.push(() => {
  group.clear();
  diggers = [];
  workers = [];
  const W = CONFIG.site, works = LEVEL.siteWorks || [];
  for (const w of works) {
    const side = w.side === 'left' ? -1 : 1;
    if (w.kind === 'trench') {
      // the pit, across the shoulder from just off the lane's edge; plates over it; spoil beside it
      const inner = (s) => side < 0 ? Track.laneLo(s) - W.trenchIn + 0.3 : Track.laneHi(s) + W.trenchIn - 0.3;
      const outer = (s) => side < 0 ? Track.lo(s) : Track.hi(s);
      group.add(new THREE.Mesh(buildStrip(w.from, w.to, inner, outer, 0.015, 2), flat(0x231a12, -3)));
      for (const edge of [inner, outer]) group.add(new THREE.Mesh(buildStrip(w.from, w.to, (s) => edge(s) - 0.12, (s) => edge(s) + 0.12, 0.02, 2), flat(0x5a4632, -4)));
      for (let s = w.from; s < w.to; s += W.plateEvery) {
        group.add(new THREE.Mesh(buildStrip(s, Math.min(w.to, s + W.plateLength), inner, outer, 0.04, 1), flat(0x6f757c, -5)));
      }
      for (let s = w.from; s < w.to; s += 7) {
        const h = Track.toWorld(s, outer(s) + side * 2.2, tmp);
        const heap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.3, 7), lambert(0x6e5232));
        heap.position.set(tmp.x, tmp.y + 0.6, tmp.z);
        heap.rotation.y = h;
        group.add(heap);
      }
    } else if (w.kind === 'pipes') { // a stack of pipes, lying along the road, three on two
      for (const [x, y] of [[-0.95, 0.9], [0.95, 0.9], [0, 2.5]]) {
        const lat = side < 0 ? Track.lo(w.s) - W.stackOut - x : Track.hi(w.s) + W.stackOut + x;
        const h = Track.toWorld(w.s, lat, tmp);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 16, 1, true).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb5b0a6, side: THREE.DoubleSide }));
        pipe.position.set(tmp.x, tmp.y + y, tmp.z);
        pipe.rotation.y = h;
        group.add(pipe);
      }
    } else if (w.kind === 'excavator') {
      const digger = makeDigger();
      group.add(digger);
      diggers.push(digger);
    }
  }
  for (const o of Collision.obstacles) {
    if (!o.walk) continue;
    const worker = makeWorker();
    group.add(worker);
    workers.push({ o, mesh: worker });
  }
});

export const syncSite = () => {
  // the excavators: each at its base, its arm turned out as far as it has swung
  Site.diggers.forEach((d, i) => {
    const mesh = diggers[i];
    if (!mesh) return;
    mesh.visible = !d.gone;
    const h = Track.toWorld(d.s, d.base, tmp);
    mesh.position.copy(tmp);
    // (along the road at angle 0, right across it towards the road at PI/2)
    const fx = Math.sin(h), fz = Math.cos(h), tx = d.side * Math.cos(h), tz = -d.side * Math.sin(h);
    mesh.rotation.y = Math.atan2(fx * Math.cos(d.angle) + tx * Math.sin(d.angle), fz * Math.cos(d.angle) + tz * Math.sin(d.angle));
  });
  // the workers: behind their barrows, pushing; or diving clear over the fence, and lying there
  for (const { o, mesh } of workers) {
    const w = o.walk;
    mesh.visible = true;
    if (w.dive < 0) {
      const h = Track.toWorld(o.s - w.dir * 1.1, o.lat, tmp);
      mesh.position.copy(tmp);
      mesh.rotation.set(0, h + (w.dir > 0 ? 0 : Math.PI), 0);
    } else {
      const u = Math.min(1, w.dive / 0.7), out = w.side < 0 ? Track.lo(o.s) - 4 : Track.hi(o.s) + 4;
      const lat = o.lat + (out - o.lat) * u, h = Track.toWorld(o.s - 1, lat, tmp);
      mesh.position.set(tmp.x, tmp.y + 2.2 * Math.sin(Math.PI * u) + (u >= 1 ? 0.25 : 0), tmp.z);
      mesh.rotation.set(0, h - w.side * Math.PI / 2, -w.side * (Math.PI / 2) * u); // (flinging itself sideways, landing flat)
    }
  }
};
