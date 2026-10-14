// ---- Tuscany: the Chianti hills in the late afternoon. The land (the theme's terrain: it climbs and falls with the road) is
// laid out in fields that are only colour (wheat, stubble, ploughed earth, sunflowers, vines, olive groves, pasture) draped
// over the hills in a patchwork of strips; the vineyards' rows, the olive trees, round hay bales and the sunflowers
// standing in them; rows of cypress along the road and up the lanes to the stone farmhouses, whose roofs are terracotta; a
// hill village on the skyline with its bell tower; dry-stone walls, stone parapets on the humpback bridges, and a pale gravel
// shoulder. All of it instanced (a draw call a kind of thing) or colour on one mesh, and laid out from a seed of the level's
// own: the same every run.
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { landAt } from '../road.js'; // (the height of the land as drawn: null on a level whose theme has no terrain)
import { cypressGeometry } from './tuscanyModels.js';

const CELL = 10, REACH = 135;  // the fields are worked out on a grid this fine, this far from the road
const VERGE = 5;               // m beyond the pavement's edge kept clear of fields (the cypress, the walls and the gravel are there)
const FIELDS = { wheat: 0xdcbc58, stubble: 0xe6d494, plough: 0x9a7854, sunflower: 0xe9b92a, vine: 0x879a52, olive: 0x9aa472, pasture: 0x8ca75c, scrub: 0x62794a };
const WALLS = [0xe3d3a8, 0xd8bd8e, 0xe9dcc0]; // the stone: cream, honey, pale
const TERRACOTTA = 0xb85a34, STONE = 0xa89f8c;

export const tuscany = ({ instances, sideStrip, add, flat, offRoads, beside, inJunction, cube, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 41 + (LEVEL.id || '').length * 191;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const p = {}, q = {};
  const open = (s) => s > Track.start + 2 && s < Track.end - 2 && !inJunction(s) && !Track.onBridge(s) && !(Track.tunnel(s) > 0);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  const land = (x, z, fallback = 0) => landAt ? landAt(x, z) : fallback;
  const HALF = half(0);

  // ---- the road's own: a shoulder of pale gravel along both sides, a dry-stone wall in places beyond it
  for (const side of [-1, 1]) add(sideStrip(Track.start, Track.end, (s) => beside(side, s, 0), (s) => beside(side, s, 1.7), 0.03, 4), flat(0xd8cfb6));

  // a place beside the road, d m off the pavement, if it is clear of every stretch of road: sets p (and its land's height) and
  // answers the road's heading there
  const clear = (s, side, d, r) => {
    const h = Track.toWorld(s, beside(side, s, d), p);
    const own = (side < 0 ? -Track.lo(s) : Track.hi(s)) + d, gap = Track.mainDistance(p.x, p.z);
    if (!open(s) || !offRoads(p.x, p.z, r) || !(gap >= half(s) + r + 1 || gap >= own - 0.6)) return null;
    p.land = d < 9 ? p.y - 0.3 : land(p.x, p.z, p.y);
    return h;
  };
  // a place in the world, if clear of the road, its land under it
  const free = (x, z, r) => Track.mainDistance(x, z) > HALF + r + 2 && offRoads(x, z, r);

  // ---- the fields. A grid over the land round the road: the height of the land at each corner and how far the road is. A cell
  // not on the road's verge, nor on another road, nor too steep, is a field of the parcel it falls in: parcels are strips
  // laid across the hills at an angle that drifts from place to place, each one a crop, and the cell's colour that crop's
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let s = Track.start; s <= Track.end; s += 20) { Track.toWorld(s, 0, p); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  x0 -= REACH; z0 -= REACH;
  const cols = Math.ceil((x1 + REACH - x0) / CELL) + 1, rows = Math.ceil((z1 + REACH - z0) / CELL) + 1;
  const H = new Float32Array(cols * rows), GAP = new Float32Array(cols * rows);
  const crop = { wheat: [], stubble: [], sunflower: [], vine: [], olive: [] }; // (where each crop is, for what stands in it: [x, y, z, angle, gap])
  const parcel = (x, z) => {
    const ang = 0.5 + 0.7 * Math.sin(x * 0.0017 + z * 0.0011) + 0.3 * Math.sin(z * 0.0043);
    const ca = Math.cos(ang), sa = Math.sin(ang), u = x * ca + z * sa, v = -x * sa + z * ca;
    const iv = Math.floor(v / 105), iu = Math.floor(u / 52 + hash(iv, 7) * 3);
    const k = hash(iu, iv + 101);
    const kind = k < 0.2 ? 'wheat' : k < 0.28 ? 'stubble' : k < 0.38 ? 'plough' : k < 0.5 ? 'sunflower' : k < 0.72 ? 'vine' : k < 0.82 ? 'olive' : k < 0.94 ? 'pasture' : 'scrub';
    return { kind, ang, id: iu * 977 + iv };
  };
  if (landAt) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * CELL, z = z0 + r * CELL;
        H[r * cols + c] = landAt(x, z);
        GAP[r * cols + c] = Track.mainDistance(x, z);
      }
    }
    const pos = [], nor = [], col = [], tone = new THREE.Color();
    const slope = (c, r) => { // (the land's lean at a corner)
      const cc = Math.max(1, Math.min(cols - 2, c)), rr = Math.max(1, Math.min(rows - 2, r));
      return [(H[rr * cols + cc - 1] - H[rr * cols + cc + 1]) / (2 * CELL), (H[(rr - 1) * cols + cc] - H[(rr + 1) * cols + cc]) / (2 * CELL)];
    };
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const at = [r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1];
        let near = Infinity, far = 0, lo = Infinity, hi = -Infinity;
        for (const i of at) { near = Math.min(near, GAP[i]); far = Math.max(far, GAP[i]); lo = Math.min(lo, H[i]); hi = Math.max(hi, H[i]); }
        if (near < HALF + VERGE || far > REACH || hi - lo > CELL * 0.95) continue;
        const cx = x0 + (c + 0.5) * CELL, cz = z0 + (r + 0.5) * CELL;
        if (!offRoads(cx, cz, CELL * 0.8)) continue;
        const P = parcel(cx, cz), jitter = 0.93 + 0.14 * hash(c, r);
        tone.set(FIELDS[P.kind]).multiplyScalar(P.kind === 'sunflower' && (Math.floor((cx * Math.cos(P.ang) + cz * Math.sin(P.ang)) / CELL) & 1) ? 0.9 : jitter);
        at.forEach((i) => {
          const cc = i % cols, rr = Math.floor(i / cols), [gx, gz] = slope(cc, rr), len = Math.hypot(gx, 1, gz);
          pos.push(x0 + cc * CELL, H[i] + 0.14, z0 + rr * CELL);
          nor.push(gx / len, 1 / len, gz / len);
          col.push(tone.r, tone.g, tone.b);
        });
        const mid = H[at[0]] / 4 + H[at[1]] / 4 + H[at[2]] / 4 + H[at[3]] / 4;
        if (crop[P.kind]) crop[P.kind].push([cx, mid, cz, P.ang, near]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const idx = [];
    for (let v = 0; v < pos.length / 3; v += 4) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    geo.setIndex(idx);
    const fields = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    fields.userData.flat = true;
    levelGroup.add(fields);
  }

  // ---- things standing in the world (not along the road): one draw call a kind. [x, y, z, sx, sy, sz, turn, lean]
  const spot = new THREE.Object3D();
  const placed = (geometry, color, list) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: false }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, turn = 0, lean = 0, roll = 0], i) => {
      spot.position.set(x, y, z);
      spot.rotation.set(lean, turn, roll, 'YXZ');
      spot.scale.set(sx, sy, sz);
      spot.updateMatrix();
      mesh.setMatrixAt(i, spot.matrix);
    });
    levelGroup.add(mesh);
  };
  const HIP = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4); // (a pyramid on a 1 m square, 1 m tall, its middle at y 0)
  const ROD = new THREE.CylinderGeometry(0.5, 0.5, 1, 5, 1, true);
  const CROWN = new THREE.IcosahedronGeometry(0.5, 0), HAY = new THREE.CylinderGeometry(0.75, 0.75, 1.5, 10).rotateZ(Math.PI / 2);
  const PRISM = new THREE.BufferGeometry(); // (a row of vines: a ridge 1 m long, 1 wide at the foot and 1 tall, no ends and no floor)
  PRISM.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5], 3));
  PRISM.setIndex([0, 3, 2, 3, 5, 2, 1, 2, 4, 2, 5, 4]);
  PRISM.computeVertexNormals();

  // ---- the farmhouses and the village share their parts: stone, walls in three tones, terracotta roofs, windows, shutters
  const wall = [[], [], []], roof = [], stone = [], window = [], shutter = [], chimney = [], dark = [];
  const corner = (x, z, turn, lx, lz) => [x + lx * Math.cos(turn) + lz * Math.sin(turn), z - lx * Math.sin(turn) + lz * Math.cos(turn)];
  // a block of wall with its hip roof, standing (lx, lz) from the house's middle: w across the front, d deep, h tall, rh of roof
  const block = (x, z, turn, yb, tone, lx, lz, w, d, h, rh, over = 0.8) => {
    const [bx, bz] = corner(x, z, turn, lx, lz);
    wall[tone].push([bx, yb + 0.9 + h / 2, bz, w, h, d, turn]);
    roof.push([bx, yb + 0.9 + h + rh / 2, bz, w + over * 2, rh, d + over * 2, turn]);
  };
  // a house at (x, z) with its front (+z, local) turned `turn`; the land under its four corners is read for the foot of it
  const house = (x, z, turn, w, d, h, rh, tone, rich) => {
    let yb = Infinity;
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [cx, cz] = corner(x, z, turn, lx * w / 2, lz * d / 2); yb = Math.min(yb, land(cx, cz, p.y)); }
    stone.push([x, yb - 0.6, z, w + 0.5, 3, d + 0.5, turn]);
    block(x, z, turn, yb, tone, 0, 0, w, d, h, rh);
    if (rich) {
      block(x, z, turn, yb, tone, w / 2 + 2.4, -d * 0.1, 5, d * 0.8, h * 0.68, 1.8, 0.5);          // an annex, the barn
      if (rand() < 0.6) block(x, z, turn, yb, tone, -w / 2 - 0.2, -d / 2 + 1.2, 3.4, 3.4, h + 3.4, 2, 0.5); // a dovecote tower
    }
    const [chx, chz] = corner(x, z, turn, w * 0.25, -d * 0.2);
    chimney.push([chx, yb + 0.9 + h + rh * 0.9, chz, 0.9, 2.2, 0.9, turn]);
    const cols = Math.max(2, Math.round(w / 3.2)), floors = Math.max(1, Math.round(h / 3.2));
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < cols; k++) {
        const lx = (k - (cols - 1) / 2) * ((w - 2.6) / Math.max(1, cols - 1)), ly = yb + 0.9 + 1.7 + f * 3.1;
        const [wx, wz] = corner(x, z, turn, lx, d / 2 + 0.05);
        window.push([wx, ly, wz, 0.95, 1.5, 0.14, turn]);
        for (const side of [-1, 1]) { const [sx, sz] = corner(x, z, turn, lx + side * 0.8, d / 2 + 0.07); shutter.push([sx, ly, sz, 0.45, 1.5, 0.1, turn]); }
      }
    }
  };

  // ---- cypresses: tall dark flames, five-sided, in two greens. [x, y, z, width, height]
  const flames = [[], []];
  const cypress = (x, y, z, h = 9 + rand() * 5, w = 2.2 + rand() * 0.7) => { flames[rand() < 0.5 ? 0 : 1].push([x, y, z, w, h, w, rand() * 6.28]); };

  // along the road: avenues (both sides, or one) of cypress every 7 m or so, set 3 m off the pavement
  const avenues = [[Track.start + 30, 290, -1], [830, 1020, 1], [1500, 1650, 0], [2060, 2250, 0], [2640, 2800, -1], [3000, 3170, 0], [3440, 3700, 1], [3910, 4210, 0], [4210, 4330, 0]];
  for (const [a, b, only] of avenues) {
    for (const side of [-1, 1]) {
      if (only && only !== side) continue;
      for (let s = a + rand() * 3; s < b; s += 6.5 + rand() * 1.5) {
        if (clear(s, side, 3.3 + rand() * 0.4, 1.2) === null) continue;
        cypress(p.x, p.land, p.z);
      }
    }
  }

  // ---- the farmhouses, one now and then along the road on alternate sides, each with a lane of cypress down to the road and a
  // pair at its door; the land is read under it
  const FARMS = [150, 560, 900, 1330, 1720, 2120, 2440, 2800, 3140, 3560, 3870, 4180];
  FARMS.forEach((at, k) => {
    const side = k % 2 ? 1 : -1, s = at + (rand() - 0.5) * 50, d = 20 + rand() * 24;
    if (side > 0 && s < Track.start + 330) return; // (room for the menu picture's camera, beside the start)
    if (clear(s, side, d, 11) === null) return;
    const hx = p.x, hz = p.z;
    Track.toWorld(s, beside(side, s, 0), q);
    const turn = Math.atan2(q.x - hx, q.z - hz), tone = Math.floor(rand() * 3), w = 10 + rand() * 4, dep = 7 + rand() * 2;
    house(hx, hz, turn, w, dep, 6.2 + rand() * 0.8, 2.8, tone, true);
    // the lane: from the road up to the front, a tree each side every 7 m
    const run = Math.hypot(q.x - hx, q.z - hz), nx = (q.x - hx) / run, nz = (q.z - hz) / run;
    for (let t = dep / 2 + 4; t < run - 3.4; t += 7) {
      for (const sd of [-1, 1]) {
        const lx = hx + nx * t - nz * sd * 3.2, lz = hz + nz * t + nx * sd * 3.2;
        if (free(lx, lz, 1.5)) cypress(lx, land(lx, lz, p.y), lz);
      }
    }
    for (const sd of [-1, 1]) { const [cx, cz] = corner(hx, hz, turn, sd * (w / 2 + 3), dep / 2 + 3); if (free(cx, cz, 1.5)) cypress(cx, land(cx, cz, p.y), cz, 7 + rand() * 3); }
  });

  // ---- a hill village on the skyline: the highest ground a good way from the road, three times along it. A ring of low
  // wall, twenty houses packed on the hilltop, a church with its nave and a tall bell tower with an open belfry
  const villages = [0.2, 0.52, 0.84];
  if (landAt) {
    villages.forEach((f, vi) => {
      Track.toWorld(Track.start + (Track.end - Track.start) * f, 0, p);
      let best = null;
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          const x = x0 + c * CELL, z = z0 + r * CELL, away = Math.hypot(x - p.x, z - p.z), g = GAP[r * cols + c];
          if (away > 330 || g < 110 || g > 300) continue;
          const h = H[r * cols + c];
          if (!best || h > best.h) if (free(x, z, 40)) best = { x, z, h };
        }
      }
      if (!best) return;
      const { x, z } = best, base = best.h;
      // the bell tower and the church beside it
      const turn0 = (vi * 1.3 + 0.4);
      const [tx, tz] = [x, z];
      stone.push([tx, base - 2, tz, 22, 6, 24, turn0]);                // the village's own hilltop of stone
      wall[0].push([tx, base + 11.5, tz, 4.4, 22, 4.4, turn0]);        // the shaft
      wall[2].push([tx, base + 24.2, tz, 3.8, 4.2, 3.8, turn0]);       // the belfry
      for (const a of [0, Math.PI / 2]) for (const sd of [-1, 1]) {
        const [ox, oz] = corner(tx, tz, turn0 + a, 0, sd * 1.93);
        dark.push([ox, base + 24.4, oz, 1.5, 2.8, 0.2, turn0 + a]);
      }
      roof.push([tx, base + 29.8, tz, 5, 7, 5, turn0]);               // its pointed cap
      const [nx, nz] = corner(tx, tz, turn0, 11, 0);
      wall[1].push([nx, base + 5.5, nz, 10, 11, 17, turn0]);          // the nave
      roof.push([nx, base + 13.1, nz, 11.4, 4.2, 18.4, turn0]);
      // houses round them on the crown, in rings
      let count = 0;
      const spots = [[tx, tz, 13]];
      for (let tries = 0; tries < 220 && count < 22; tries++) {
        const a = rand() * 6.28, d = 12 + rand() * 24, hx = tx + Math.sin(a) * d, hz = tz + Math.cos(a) * d;
        if (spots.some(([ox, oz, r]) => Math.hypot(hx - ox, hz - oz) < r)) continue;
        if (land(hx, hz, base) > base + 3 || land(hx, hz, base) < base - 12) continue;
        const w = 6 + rand() * 4, dep = 5 + rand() * 3;
        house(hx, hz, Math.round(rand() * 4) * Math.PI / 2 + (rand() - 0.5) * 0.3, w, dep, 5 + rand() * 4.5, 2.2, Math.floor(rand() * 3), false);
        spots.push([hx, hz, Math.max(w, dep) + 3.5]);
        count++;
      }
      // the wall round the village: runs of stone, a tower-high band of cypress outside
      const R = 38;
      for (let k = 0; k < 22; k++) {
        const a = k / 22 * Math.PI * 2, wx = tx + Math.sin(a) * R, wz = tz + Math.cos(a) * R, y = land(wx, wz, base);
        stone.push([wx, y + 0.9, wz, 8.4, 3.2, 1.2, a + Math.PI / 2]);
        if (k % 3 === 0 && free(wx, wz, 2)) cypress(tx + Math.sin(a) * (R + 3), land(tx + Math.sin(a) * (R + 3), tz + Math.cos(a) * (R + 3), base), tz + Math.cos(a) * (R + 3), 11 + rand() * 3);
      }
    });
  }

  // ---- the vineyards' rows, olive trees, hay bales and sunflowers standing in the fields near the road
  const vines = []; // vine rows: [x, y, z, width, height, length, turn, pitch]
  for (const [cx, cy, cz, ang, gap] of crop.vine) {
    if (gap > 95 || vines.length > 2200) continue;
    // (rows lie on a lattice in the parcel's own frame, 10 m long and 2.5 m apart, each belonging to the cell its middle is in:
    // so they run on from one cell to the next, whatever the angle)
    const ca = Math.cos(ang), sa = Math.sin(ang), u0 = cx * ca + cz * sa, v0 = -cx * sa + cz * ca;
    for (let ui = Math.floor((u0 - 8) / 10); ui <= Math.ceil((u0 + 8) / 10); ui++) {
      for (let vi = Math.floor((v0 - 8) / 2.5); vi <= Math.ceil((v0 + 8) / 2.5); vi++) {
        const u = ui * 10, v = vi * 2.5, px = u * ca - v * sa, pz = u * sa + v * ca;
        if (Math.abs(px - cx) >= CELL / 2 || Math.abs(pz - cz) >= CELL / 2 || !free(px, pz, 5)) continue;
        const h1 = land(px - ca * 5, pz - sa * 5, cy), h2 = land(px + ca * 5, pz + sa * 5, cy);
        vines.push([px, (h1 + h2) / 2 - 0.05, pz, 1.0, 0.9, 10, Math.atan2(ca, sa), -Math.atan2(h2 - h1, 10)]);
      }
    }
  }
  placed(PRISM, 0x5f8f32, vines);
  const crowns = [[], []], trunks = [];
  for (const [cx, , cz, , gap] of crop.olive) {
    if (gap > 85 || trunks.length > 330 || rand() < 0.35) continue;
    const x = cx + (rand() - 0.5) * 6, z = cz + (rand() - 0.5) * 6;
    if (!free(x, z, 3)) continue;
    const y = land(x, z, p.y), s = 3.2 + rand() * 1.5;
    trunks.push([x, y + 0.8, z, 0.7, 1.7, 0.7, rand() * 6.28, (rand() - 0.5) * 0.3]);
    crowns[trunks.length % 2].push([x, y + 2.3 + s * 0.2, z, s * 1.35, s * 0.85, s * 1.35, rand() * 6.28]);
  }
  placed(ROD, 0x6b5a45, trunks);
  placed(CROWN, 0x7d8d5c, crowns[0]);
  placed(CROWN, 0x93a070, crowns[1]);
  const hay = [];
  for (const kind of ['wheat', 'stubble']) {
    for (const [cx, , cz, ang, gap] of crop[kind]) {
      if (gap > 110 || rand() > (kind === 'stubble' ? 0.16 : 0.05)) continue;
      const x = cx + (rand() - 0.5) * 6, z = cz + (rand() - 0.5) * 6;
      if (free(x, z, 2)) hay.push([x, land(x, z, p.y) + 0.74, z, 1, 1, 1, ang + Math.PI / 2 * (rand() < 0.5 ? 0 : 1) + rand() * 0.2]);
    }
  }
  placed(HAY, 0xd9b54a, hay);
  const stalks = [], heads = [];
  for (const [cx, , cz, , gap] of crop.sunflower) {
    if (gap > 45 || stalks.length > 220) continue;
    for (let n = 0; n < 3; n++) {
      const x = cx + (rand() - 0.5) * 8, z = cz + (rand() - 0.5) * 8;
      if (!free(x, z, 2)) continue;
      const y = land(x, z, p.y), h = 1.7 + rand() * 0.5, face = 2.2 + (rand() - 0.5) * 0.4; // (all turned to the afternoon sun)
      stalks.push([x, y + h / 2, z, 0.1, h, 0.1]);
      heads.push([x, y + h, z, 0.75, 0.16, 0.75, face, 1.1]);
    }
  }
  placed(ROD, 0x3f7a2e, stalks);
  placed(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), 0xf5bf1c, heads);

  // ---- cypress, last (the lanes and the villages and the farmhouses have all had their say): two greens
  placed(cypressGeometry(), 0x2b4a2c, flames[0]);
  placed(cypressGeometry(), 0x3b5d36, flames[1]);

  // the houses' parts, a draw call a kind
  WALLS.forEach((c, i) => placed(cube, c, wall[i]));
  placed(cube, STONE, stone);
  placed(HIP, TERRACOTTA, roof);
  placed(cube, 0x33291f, window);
  placed(cube, 0x33291f, dark);
  placed(cube, 0x5e7d4a, shutter);
  placed(cube, 0xa8967a, chimney);

  // ---- along the road: stone parapets on the humpback bridges (every pair of steep grades in the level is one), dry-stone walls
  // beside the road where there is no avenue, every 6 m a run of wall
  const bumps = [];
  { let at = 0; const segs = LEVEL.segments || []; for (let i = 0; i < segs.length; i++) { if ((segs[i].grade || 0) >= 0.1 && (segs[i + 1]?.grade || 0) <= -0.1) bumps.push(at); at += segs[i].length; } }
  const parapet = [], capstone = [];
  for (const s0 of bumps) {
    for (let s = s0 - 6; s < s0 + 78; s += 6) {
      for (const side of [-1, 1]) {
        const lat = beside(side, s, 0.45), end = [s + 6.05, beside(side, s + 6, 0.45)];
        parapet.push([s, lat, 0.55, 0.7, 1.1, 0, end]);
        capstone.push([s, lat, 1.15, 1.0, 0.18, 0, end]);
      }
    }
  }
  instances(cube, 0xcdbf9f, parapet);
  instances(cube, 0xe6dcc0, capstone);
  const walls = [];
  const bare = (s) => !avenues.some(([a, b, only]) => s > a - 10 && s < b + 10 && !only);
  for (let s = Track.start + 20; s < Track.end - 20; s += 6) {
    if (!open(s) || !bare(s) || bumps.some(b => s > b - 12 && s < b + 84) || hash(Math.floor(s / 6), 3) < 0.45) continue;
    const side = hash(Math.floor(s / 90), 9) < 0.5 ? -1 : 1;
    if (Math.floor(s / 90) % 2) continue;
    walls.push([s, beside(side, s, 2.7), 0.4, 0.55, 0.85, 0, [s + 6.05, beside(side, s + 6, 2.7)]]);
  }
  instances(cube, 0xb9ab8a, walls);
};
