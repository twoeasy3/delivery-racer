// ---- ice road: a ploughed road across a frozen lake, at night under the aurora. The road is bare blue ice between
// two snowbanks, marker poles with reflectors down both of them, tongues of drifted snow across it; out on the
// lake, snow with swept patches of dark ice, pressure ridges (lines of broken slabs heaved up on end: where the
// road humps, a level's segments and their "grade", it is going over one), ice fishermen's huts in villages,
// their windows lit, a snowmobile by the door; islands of spruce; and a long way off, the dark shore. Overhead
// the stars, a moon, and the aurora drifting. (The models: iceroadModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { makeAurora, makeSnowmobile, makeFishingHut, makeIceSign } from './iceroadModels.js';

const HUTS = [0xb5352c, 0xe2b21c, 0x2d5f8a, 0x2f7f4f, 0xd9683a, 0x7a4a8a];

export const iceroad = ({ theme, add, instances, buildStrip, offRoads, beside, inJunction, exits, cube, tube, cone, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 31 + (LEVEL.id || '').length * 127;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {};
  const SPHERE = new THREE.SphereGeometry(0.5, 10, 7), DOME = new THREE.SphereGeometry(0.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const roads = [[Track.start, Track.end], ...exits.map(x => [x.side0, x.sideEnd])];
  const height = (s) => { Track.toWorld(s, 0, p); return p.y; };
  // out on the lake, `far` m off the main road at s: its world point, if it is that far from every part of the road
  // (inside a bend the lake is narrow) and off every other road
  const lake = (s, side, far, margin = 4) => {
    Track.toWorld(s, beside(side, s, far), p);
    return Track.mainDistance(p.x, p.z) > far * 0.8 && offRoads(p.x, p.z, margin);
  };
  const put = (model, s, lat, turn = 0, margin = 3) => {
    const h = Track.toWorld(s, lat, p);
    if (!offRoads(p.x, p.z, margin)) return null;
    model.position.set(p.x, p.y, p.z);
    model.rotation.y = h + turn;
    levelGroup.add(model);
    return model;
  };

  // (the land road.js lays under a hilly road, its ribbon and its banks in the ground's colour, is built with no
  // normals, and so is black on a lit theme: given them here, the snow over a pressure ridge is lit as the lake is)
  const snowHex = new THREE.Color(theme.ground).getHex(), bankHex = new THREE.Color(theme.ground).multiplyScalar(0.8).getHex();
  for (const m of levelGroup.children) {
    if (m.isMesh && m.renderOrder !== -2 && m.material && m.material.color && (m.material.color.getHex() === snowHex || m.material.color.getHex() === bankHex) && !m.geometry.attributes.normal) m.geometry.computeVertexNormals();
  }

  // ---- the sky: stars, a moon, the aurora (all of them round whoever is looking, never any nearer)
  const points = [];
  for (let i = 0; i < 900; i++) {
    const a = rand() * Math.PI * 2, y = 0.04 + rand() * 0.96, r = Math.sqrt(1 - y * y);
    points.push(Math.cos(a) * r * 640, y * 640, Math.sin(a) * r * 640);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false }));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4f1dc, fog: false }));
  // (by day, the thaw's level, there are none of them: the dice for them are thrown all the same)
  for (const [thing, x, y, z] of theme.night ? [[stars, 0, 0, 0], [moon, -330, 250, 420]] : []) {
    thing.frustumCulled = false;
    thing.renderOrder = -3;
    thing.onBeforeRender = (renderer, scene, camera) => {
      thing.position.set((scene.scale.x < 0 ? -camera.position.x : camera.position.x) + x, camera.position.y + y, camera.position.z + z);
      thing.updateMatrixWorld();
    };
    levelGroup.add(thing);
  }
  const aurora = makeAurora(6, 430, 70, seed);
  if (theme.night) levelGroup.add(aurora);

  // ---- the road's own: a snowbank along each edge, lumpy; a marker pole every 24 m, a reflector at its top
  // (orange down the right, blue down the left); tongues of snow drifted in over the ice
  const banks = [], lumps = [], poles = [], orange = [], blue = [];
  for (const [from, to] of roads) {
    for (let s = from; s < to; s += 4) {
      if (inJunction(s)) continue;
      for (const side of [-1, 1]) {
        banks.push([s, beside(side, s, 1.2), 0.35, 2.4, 0.7, 4.02, [s + 4, beside(side, s + 4, 1.2)]]);
        lumps.push([s + rand() * 4, beside(side, s, 0.9 + rand() * 1.5), 0.45 + rand() * 0.3, 2 + rand() * 1.8, 0.9 + rand() * 0.9, 2.6 + rand() * 2.4]);
      }
    }
    for (let s = from + 12; s < to; s += 24) {
      if (inJunction(s)) continue;
      for (const side of [-1, 1]) {
        poles.push([s, beside(side, s, 0.7), 1.5, 0.1, 3, 0.1]);
        (side > 0 ? orange : blue).push([s, beside(side, s, 0.7), 2.7, 0.2, 0.5, 0.2]);
      }
    }
  }
  const drift = new THREE.MeshLambertMaterial({ color: 0xf4f8fc, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  for (let s = Track.start + 20; s < Track.end - 20; s += 22 + rand() * 30) {
    if (inJunction(s)) continue;
    const side = rand() < 0.5 ? -1 : 1, len = 5 + rand() * 9, reach = 1.5 + rand() * 4.5;
    const edge = (t) => side < 0 ? Track.lo(t) : Track.hi(t), tip = (t) => edge(t) - side * reach * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - s) / len)));
    const geo = buildStrip(s, s + len, edge, tip, 0.02, 1);
    geo.computeVertexNormals();
    add(geo, drift);
  }

  // ---- the lake: swept patches of dark ice in the snow
  const patches = [[], []];
  for (let s = Track.start; s < Track.end; s += 13) {
    for (const side of [-1, 1]) {
      const far = 8 + rand() * rand() * 230, w = 6 + rand() * 26, l = 10 + rand() * 44;
      if (Math.abs(height(s)) > 0.2 || !lake(s, side, far + w / 2, w / 2 + 2)) continue;
      patches[rand() < 0.5 ? 0 : 1].push([s, beside(side, s, far + w / 2), 0.012, w, 0.024, l]);
    }
  }

  // ---- pressure ridges: slabs of ice heaved up on end, in lines across the lake; and one along every hump in the
  // road, which is the road going over it
  const slabs = [];
  const ridge = (s0, lat0, ds, dlat, length, big = 1) => {
    for (let t = 0; t < length; t += 1.6 + rand() * 1.4) {
      const s = s0 + ds * t + (rand() - 0.5) * 2.4, lat = lat0 + dlat * t + (rand() - 0.5) * 2.4;
      if (s < Track.start + 2 || s > Track.end - 2) continue;
      const h = Track.toWorld(s, lat, p);
      if (!offRoads(p.x, p.z, 3) || Track.mainDistance(p.x, p.z) < Math.abs(lat) * 0.7) continue;
      const size = (0.6 + rand() * 1.1) * big;
      slabs.push([p.x, p.y + size * (0.2 + rand() * 0.5), p.z, h + rand() * 3, (rand() - 0.5) * 2.2, (rand() - 0.5) * 1.4, 2.4 * size, 0.5 + rand() * 0.4, (1.4 + rand() * 1.6) * size]);
    }
  };
  for (let s = Track.start + 140, n = 0; s < Track.end - 100; s += 210 + rand() * 160, n++) {
    const side = n % 2 ? -1 : 1, slant = (rand() - 0.5) * 1.6;
    ridge(s, beside(side, s, 5.5), slant / Math.hypot(1, slant), side / Math.hypot(1, slant), 90 + rand() * 170);
  }
  let open = null, top = 0, at = 0;
  for (let s = Track.start; s <= Track.end; s += 2) {
    const y = height(s);
    if (y > 0.3) { if (open === null) { open = s; top = 0; } if (y > top) { top = y; at = s; } }
    else if (open !== null) { for (const side of [-1, 1]) for (const k of [0, 3]) ridge(at + k - 1.5, beside(side, at, 4), 0, side, 118, 1.5); open = null; }
  }

  // ---- fishing villages: huts in clusters out on the ice, their windows lit; a snowmobile by one of them; one
  // hut close by the road now and then
  const walls = HUTS.map(() => []), roofs = [], snow = [], windows = [], pipes = [], holes = [], skids = [], flags = [];
  const hut = (s, lat) => {
    Track.toWorld(s, lat, p);
    if (!offRoads(p.x, p.z, 5) || Track.mainDistance(p.x, p.z) < Math.abs(lat) * 0.7) return false;
    const w = 2.6 + rand() * 1.2, l = 3 + rand() * 1.6, h = 2.3 + rand() * 0.5, side = lat > 0 ? 1 : -1;
    walls[Math.floor(rand() * HUTS.length)].push([s, lat, 0.2 + h / 2, w, h, l]);
    skids.push([s, lat - w * 0.35, 0.1, 0.25, 0.2, l + 0.8], [s, lat + w * 0.35, 0.1, 0.25, 0.2, l + 0.8]);
    roofs.push([s, lat, h + 0.3, w + 0.4, 0.2, l + 0.5]);
    snow.push([s, lat, h + 0.47, w + 0.2, 0.16, l + 0.3]);
    windows.push([s + (rand() - 0.5) * l * 0.4, lat - side * (w / 2 + 0.04), 1.6, 0.06, 0.7, 0.9], [s - l / 2 - 0.04, lat, 1.6, 0.8, 0.6, 0.06]);
    pipes.push([s + l * 0.25, lat + side * w * 0.2, h + 1, 0.28, 1.2, 0.28]);
    holes.push([s - l / 2 - 2.2, lat, 0.03, 1, 0.06, 1]);
    flags.push([s - l / 2 - 2.2, lat + 0.5, 0.75, 0.3, 0.2, 0.04]);
    return true;
  };
  for (let s = Track.start + 90, n = 0; s < Track.end - 60; s += 110 + rand() * 80, n++) {
    const side = n % 2 ? 1 : -1, far = 11 + rand() * 26, count = 4 + Math.floor(rand() * 5);
    for (let k = 0; k < count; k++) hut(s + (k - count / 2) * 9 + rand() * 4, beside(side, s, far + (k % 3) * 9 + rand() * 4));
    put(makeSnowmobile(HUTS[n % HUTS.length]), s + 4, beside(side, s + 4, far - 5), rand() * 6, 3);
    if (n % 3 === 1) put(makeFishingHut(HUTS[(n + 2) % HUTS.length]), s + 60, beside(-side, s + 60, 7 + rand() * 4), side > 0 ? 0.3 : Math.PI - 0.3, 5);
  }

  // ---- islands of spruce out on the lake, and the far shore: a dark line of forest, low hills behind it
  const spruce = [], spruceSnow = [], trunks = [], mounds = [], hills = [];
  const tree = (s, lat, h, y = 0) => {
    trunks.push([s, lat, y + 0.9, 0.5, 1.8, 0.5]);
    spruce.push([s, lat, y + 1.4 + h * 0.5, h * 0.48, h, h * 0.48]);
    spruceSnow.push([s, lat, y + 1.4 + h * 0.82, h * 0.2, h * 0.36, h * 0.2]);
  };
  for (let s = Track.start + 260, n = 0; s < Track.end - 100; s += 420 + rand() * 200, n++) {
    const side = n % 2 ? -1 : 1, far = 90 + rand() * 60, lat = beside(side, s, far);
    if (!lake(s, side, far, 34)) continue;
    mounds.push([s, lat, 0, 44, 7, 62]);
    for (let k = 0; k < 16; k++) { const a = rand() * 6.28, d = rand() * 0.8; tree(s + Math.cos(a) * d * 26, lat + Math.sin(a) * d * 18, 7 + rand() * 7, 1.6 * (1 - d)); }
  }
  for (let s = Track.start - 200; s < Track.end + 200; s += 8) {
    const q0 = Math.max(Track.start, Math.min(Track.end, s));
    for (const side of [-1, 1]) {
      const far = 250 + rand() * 50;
      Track.toWorld(q0, beside(side, q0, far), p);
      if (Track.mainDistance(p.x, p.z) < 220 || !offRoads(p.x, p.z, 30)) continue;
      tree(s, beside(side, q0, far), 13 + rand() * 11);
      if (rand() < 0.14) hills.push([s, beside(side, q0, far + 60), 0, 150, 70 + rand() * 70, 200]);
    }
  }

  // ---- the sign where the ice begins
  put(makeIceSign(), Math.min(46, Track.length / 5), beside(1, 46, 4.2), Math.PI, 3);

  // ---- drawn
  instances(cube, 0xeef4fa, banks);
  instances(SPHERE, 0xf4f8fc, lumps);
  instances(cube, 0x2c2f36, poles);
  instances(cube, 0xff8a1a, orange, true);
  instances(cube, 0x6fd8ff, blue, true);
  instances(tube, 0x8fb4cc, patches[0], false, 3);
  instances(tube, 0xa4c4d8, patches[1], false, 3);
  HUTS.forEach((color, i) => instances(cube, color, walls[i], false, 1));
  instances(cube, 0x2c2f36, roofs);
  instances(cube, 0xf4f8fc, snow);
  instances(cube, 0xffc86a, windows, true);
  instances(tube, 0x2c2f36, pipes);
  instances(tube, 0x16283a, holes);
  instances(cube, 0x6b4a2c, skids);
  instances(cube, 0xff5a2a, flags, true);
  instances(tube, 0x3a2a1c, trunks);
  instances(cone, 0x1c3d30, spruce, false, 4);
  instances(cone, 0xe6eef6, spruceSnow, false, 4);
  instances(DOME, 0xe6eef6, mounds, false, 10);
  instances(DOME, 0x263a4a, hills);
  if (slabs.length) {
    const dummy = new THREE.Object3D();
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), slabs.length);
    const tint = new THREE.Color();
    slabs.forEach(([x, y, z, ry, rx, rz, sx, sy, sz], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint.set([0xcfeaf5, 0xa8d4e8, 0xe6f4fa, 0x8fc4dc][i % 4]));
    });
    mesh.frustumCulled = false;
    levelGroup.add(mesh);
  }
};
