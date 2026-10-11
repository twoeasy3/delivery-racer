// ---- rice terraces: a narrow road over a hill that is paddies all the way down: the land (the theme's terrain: it
// climbs and falls with the road) cut into level steps every 1.8 m of height, each a sheet of water held by a bank
// that follows the contour, some just flooded and pale as the sky, some bright with young rice, some deep green,
// glints on them all. Farmers in straw hats bent over the rice, water buffalo, huts on stilts with thatch down to
// their eaves, coconut palms along the banks, kites flying over them, three tall gates of red brick and tiered
// roofs across the road, mist lying in the low ground.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { landAt } from '../road.js'; // (the height of the land as drawn: null on a level whose theme has no terrain)
import { makeKite, makeBuffalo, makeHut, makeFarmer } from './riceModels.js';

const STEP = 1.8, DEEP = 1.5; // m of height from one paddy to the next; and how far below its water a paddy's bed may be
const CELL = 5, REACH = 190;  // the paddies are worked out on a grid this fine, this far from the road
const VERGE = 7;              // m beyond the pavement kept dry: the road's own bank
const WATER = [0xc4ece6, 0xa9e56a, 0xdcf0b4, 0x86d6c2, 0x8fdc5a]; // just flooded, young rice, seedlings, deep water, bright green
const BANK = 0x3f7a36;

export const rice = ({ instances, offRoads, beside, inJunction, cube, tube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 17 + (LEVEL.id || '').length * 191;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const p = {}, q = {};
  const open = (s) => s > Track.start + 2 && s < Track.end - 2 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  const land = (x, z, fallback = 0) => landAt ? landAt(x, z) : fallback;
  const HALF = half(0);

  // ---- the paddies. Over a grid round the road: the height of the land at each corner, and whether it is the road's
  // own verge (dry). A paddy at each level k (its water at k * STEP): every square with a corner whose land is under
  // that water by no more than DEEP; its corners out of the paddy go down into the land, so its edge is a bank
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let s = Track.start; s <= Track.end; s += 20) { Track.toWorld(s, 0, p); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  x0 -= REACH; z0 -= REACH;
  const cols = Math.ceil((x1 + REACH - x0) / CELL) + 1, rows = Math.ceil((z1 + REACH - z0) / CELL) + 1;
  const H = new Float32Array(cols * rows), DRY = new Uint8Array(cols * rows);
  const wet = []; // (places in the water, for what stands in it: [x, y, z])
  if (landAt) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * CELL, z = z0 + r * CELL, gap = Track.mainDistance(x, z);
        H[r * cols + c] = landAt(x, z);
        DRY[r * cols + c] = gap < HALF + VERGE || gap > REACH || !offRoads(x, z, VERGE) ? 1 : 0;
      }
    }
    const pos = [], col = [], idx = [], shade = new THREE.Color(), bank = new THREE.Color(BANK);
    const glint = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const at = [r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1];
        if (at.every(i => DRY[i])) continue;
        let lo = Infinity, hi = -Infinity;
        for (const i of at) { lo = Math.min(lo, H[i]); hi = Math.max(hi, H[i]); }
        for (let k = Math.ceil(lo / STEP); k * STEP < hi + DEEP; k++) {
          const level = k * STEP, inside = at.map(i => !DRY[i] && H[i] > level - DEEP);
          if (!at.some((i, n) => inside[n] && H[i] <= level)) continue;
          shade.set(WATER[((k % WATER.length) + WATER.length) % WATER.length]);
          const first = pos.length / 3;
          at.forEach((i, n) => {
            const x = x0 + (i % cols) * CELL, z = z0 + Math.floor(i / cols) * CELL;
            pos.push(x, inside[n] ? level : Math.min(level, H[i]) - 0.35, z);
            const tint = inside[n] ? shade : bank;
            col.push(tint.r, tint.g, tint.b);
          });
          idx.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
          if (inside.every(Boolean) && hi < level - 0.15) {
            const x = x0 + (c + 0.5) * CELL, z = z0 + (r + 0.5) * CELL;
            if (rand() < 0.1) wet.push([x, level, z]);
            if (rand() < 0.07) glint.push([x + (rand() - 0.5) * 3, level + 0.03, z + (rand() - 0.5) * 3, 0.5 + rand() * 1.6]);
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const paddies = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    paddies.userData.flat = true;
    levelGroup.add(paddies);
    // glints: small bright flecks lying on the water, half of them out at a time
    const flecks = [0, 1].map(n => {
      const list = glint.filter((_, i) => i % 2 === n), mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }), Math.max(1, list.length));
      const o = new THREE.Object3D();
      list.forEach(([x, y, z, w], i) => { o.position.set(x, y, z); o.scale.set(w, 1, 1); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
      mesh.count = list.length;
      levelGroup.add(mesh);
      return mesh;
    });
    levelGroup.userData.riceGlints = flecks;
  }

  // ---- things standing in the world (not along the road): one draw call a kind. [x, y, z, sx, sy, sz, turn]
  const spot = new THREE.Object3D();
  const placed = (geometry, color, list, both) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color, side: both ? THREE.DoubleSide : THREE.FrontSide }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, turn = 0, lean = 0], i) => {
      spot.position.set(x, y, z);
      spot.rotation.set(lean, turn, 0, 'YXZ');
      spot.scale.set(sx, sy, sz);
      spot.updateMatrix();
      mesh.setMatrixAt(i, spot.matrix);
    });
    levelGroup.add(mesh);
  };
  // a place beside the road, d m off the pavement, if it is clear of every stretch of road: sets p (and its land's height)
  const clear = (s, side, d, r) => {
    const h = Track.toWorld(s, beside(side, s, d), p);
    const own = (side < 0 ? -Track.lo(s) : Track.hi(s)) + d, gap = Track.mainDistance(p.x, p.z);
    if (!open(s) || !offRoads(p.x, p.z, r) || !(gap >= half(s) + r + 1 || gap >= own - 0.6)) return null;
    p.land = d < 9 ? p.y - 0.3 : land(p.x, p.z, p.y);
    return h;
  };

  // ---- coconut palms: a leaning trunk, a crown of fronds like an open umbrella with a smaller one over it,
  // coconuts under; along the road's verge and out on the banks between the paddies
  const NUT = new THREE.SphereGeometry(0.5, 6, 5), FROND = new THREE.BufferGeometry();
  { // (eight fronds from the middle, each arching up and out and drooping at its tip: 1 across, about 0.4 tall)
    const pos = [], idx = [], PATH = [[0, 0, 0.05], [0.18, 0.16, 0.07], [0.36, 0.1, 0.06], [0.5, -0.2, 0.01]];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a), first = pos.length / 3, lift = k % 2 ? 0.06 : 0;
      for (const [r, y, w] of PATH) pos.push(cx * r - cz * w, y + lift * r * 2, cz * r + cx * w, cx * r + cz * w, y + lift * r * 2, cz * r - cx * w);
      for (let n = 0; n < PATH.length - 1; n++) { const i = first + n * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
    }
    FROND.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    FROND.setIndex(idx);
    FROND.computeVertexNormals();
  }
  const trunks = [], fronds = [[], []], nuts = [];
  const palm = (x, y, z) => {
    const h = 7 + rand() * 6, turn = rand() * 6.28, lean = 0.08 + rand() * 0.16;
    const tx = x + Math.sin(turn) * Math.sin(lean) * h, ty = y + Math.cos(lean) * h, tz = z + Math.cos(turn) * Math.sin(lean) * h;
    trunks.push([(x + tx) / 2, (y + ty) / 2 - 0.3, (z + tz) / 2, 0.42, h + 0.6, 0.42, turn, lean]);
    fronds[0].push([tx, ty, tz, 9 + rand() * 2, 7, 9 + rand() * 2, turn]);
    fronds[1].push([tx, ty + 0.5, tz, 6, 9, 6, turn + 0.4]);
    nuts.push([tx + 0.3, ty - 0.7, tz, 0.5, 0.5, 0.5], [tx - 0.25, ty - 0.75, tz + 0.2, 0.5, 0.5, 0.5]);
  };
  for (let s0 = Track.start + 8; s0 < Track.end - 6; s0 += 17) {
    for (const side of [-1, 1]) {
      if (rand() < 0.3) continue;
      const s = s0 + rand() * 10, d = rand() < 0.55 ? 3.5 + rand() * 5 : 14 + rand() * 60;
      if (side > 0 && s < Track.start + 280 && d < 14) continue; // (room for the menu picture's camera, beside the start)
      if (clear(s, side, d, 1.5) === null) continue;
      palm(p.x, p.land, p.z);
      if (d > 14 && rand() < 0.6) palm(p.x + 3 + rand() * 3, land(p.x + 4, p.z + 2, p.y), p.z + 2 + rand() * 3);
    }
  }
  placed(tube, 0x8a6f4e, trunks);
  placed(FROND, 0x2f8a40, fronds[0], true);
  placed(FROND, 0x4aa548, fronds[1], true);
  placed(NUT, 0x5a4226, nuts);

  // ---- huts on stilts on the verge, now and then; farmers and buffalo out in the water; kites over it all
  const alive = [];
  const stand = (model, x, y, z, turn) => { model.position.set(x, y, z); model.rotation.y = turn; levelGroup.add(model); if (model.userData.animate) alive.push([model, rand() * 20]); };
  for (let s = Track.start + 150, k = 0; s < Track.end - 60; s += 210, k++) {
    const side = k % 2 ? 1 : -1, at = s + rand() * 60, h = clear(at, side, 6.5, 5);
    if (h !== null) stand(makeHut(), p.x, p.land, p.z, h + (side > 0 ? Math.PI : 0));
    const kh = clear(at + 70, -side, 30 + rand() * 40, 2);
    if (kh !== null) stand(makeKite([0xe8443a, 0x3a8fe8, 0xf08ab0, 0xff9a2a][k % 4], [0xffd23a, 0xffffff, 0x6cd06a][k % 3], 24 + rand() * 16), p.x, p.land, p.z, kh + rand() * 2);
  }
  const SHIRTS = [0x3a6fd0, 0xd8443a, 0xf4f0e6, 0x8a5fc0, 0xf2a03a];
  const near = wet.filter(([x, , z]) => Track.mainDistance(x, z) < HALF + 80);
  for (let i = 0, farmers = 0, herd = 0; i < near.length && farmers < 46; i += Math.max(1, Math.floor(near.length / 60))) {
    const [x, y, z] = near[i];
    if (i % 4 === 3 && herd < 14) { stand(makeBuffalo(), x, y - 0.35, z, rand() * 6.28); herd++; }
    else { for (let n = 0; n < 1 + Math.floor(rand() * 3); n++) stand(makeFarmer(SHIRTS[(i + n) % SHIRTS.length]), x + n * 1.3 - 1, y - 0.2, z + (rand() - 0.5) * 1.5, rand() * 6.28); farmers++; }
  }

  // ---- three gates across the road: red brick piers stepped in at the top, a beam between them high over the
  // road (over the camera too), three roofs one on another above it, gold at the peak and on the piers
  const brick = [], stone = [], tiers = [], gold = [];
  for (const f of [0.14, 0.47, 0.8]) {
    let s = Track.start + (Track.end - Track.start) * f;
    for (let tries = 0; tries < 30 && !(open(s) && open(s - 8) && open(s + 8) && Math.abs(Track.bend(s)) < 0.002 && beside(1, s, 0) - beside(-1, s, 0) < HALF * 2 + 3); tries++) s += 12;
    if (!open(s)) continue;
    const mid = (Track.lo(s) + Track.hi(s)) / 2, w = Track.hi(s) - Track.lo(s);
    for (const side of [-1, 1]) {
      const l = beside(side, s, 2.1);
      brick.push([s, l, 2, 4.2, 4, 4.2], [s, l, 7.5, 3.3, 7, 3.3], [s, l, 12.6, 2.5, 3.2, 2.5]);
      stone.push([s, l, 4.15, 4.5, 0.3, 4.5], [s, l, 11.1, 3.6, 0.3, 3.6], [s, l, 0.25, 4.6, 0.5, 4.6]);
      gold.push([s, l, 9.2, 3.45, 0.5, 3.45], [s, l + side * 2.6, 16.2, 0.5, 1.6, 0.5]);
    }
    brick.push([s, mid, 14.9, w + 8, 1.5, 2.4]);
    stone.push([s, mid, 15.75, w + 8.6, 0.3, 2.9]);
    [[w + 12, 16.3, 6], [w * 0.72 + 6, 18.1, 4.6], [w * 0.42 + 3, 19.9, 3.4]].forEach(([wide, y, deep]) => { tiers.push([s, mid, y, wide, 0.55, deep]); brick.push([s, mid, y + 0.9, wide * 0.55, 1.3, deep * 0.5]); });
    gold.push([s, mid, 22.2, 0.6, 2.6, 0.6], [s, mid, 14.9, w * 0.3, 0.9, 2.5]);
  }
  instances(cube, 0xb5532f, brick);
  instances(cube, 0x8f8a80, stone);
  instances(cube, 0x3d3530, tiers);
  instances(cube, 0xe8b93a, gold);

  // ---- the road's own: white stones along both edges, every 10 m
  const stones = [];
  for (let s = Track.start; s < Track.end; s += 10) if (open(s)) for (const side of [-1, 1]) stones.push([s, beside(side, s, 0.5), 0.3, 0.4, 0.6, 0.4]);
  instances(cube, 0xf1eee4, stones);

  // ---- mist lying in the low ground: wide pale sheets a few metres over the land wherever it is well below the road
  const MIST = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), haze = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const sheets = [];
  for (let s = Track.start + 60; s < Track.end; s += 70) {
    for (const side of [-1, 1]) {
      const d = 60 + rand() * 130;
      Track.toWorld(s, beside(side, s, d), p);
      const y = land(p.x, p.z, p.y);
      if (y > p.y - 9 || Track.mainDistance(p.x, p.z) < 45) continue;
      for (let n = 0; n < 3; n++) sheets.push([p.x + (rand() - 0.5) * 40, y + 3 + n * 2.5 + rand() * 2, p.z + (rand() - 0.5) * 40, 45 + rand() * 60, 30 + rand() * 40, rand() * 3]);
    }
  }
  if (sheets.length) {
    const mist = new THREE.InstancedMesh(MIST, haze, sheets.length);
    sheets.forEach(([x, y, z, a, b, turn], i) => { spot.position.set(x, y, z); spot.rotation.set(0, turn, 0); spot.scale.set(a, 1, b); spot.updateMatrix(); mist.setMatrixAt(i, spot.matrix); });
    mist.renderOrder = 3;
    mist.userData.flat = true;
    levelGroup.add(mist);
  }

  // (the kites and the glints are kept moving by a speck that is always drawn: there is no state of the game's in any of it)
  const flecks = levelGroup.userData.riceGlints || [];
  delete levelGroup.userData.riceGlints;
  const speck = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, -90, 0, 0.01, -90, 0, 0, -90, 0.01], 3)), new THREE.MeshBasicMaterial());
  speck.frustumCulled = false;
  speck.onBeforeRender = () => {
    const t = performance.now() / 1000;
    for (const [model, phase] of alive) model.userData.animate(t + phase);
    flecks.forEach((mesh, n) => { mesh.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.1 + n * 1.6)); });
  };
  levelGroup.add(speck);
};
