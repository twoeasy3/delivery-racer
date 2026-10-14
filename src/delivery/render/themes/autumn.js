// ---- autumn: New England in the fall. A road winding through hills (the theme's terrain) under a forest of maples and
// oaks gone red, orange and gold, a few dark pines among them; a carpet of leaves along both verges, and leaves coming
// down (one points object, fluttering on the GPU); stone walls, white clapboard houses with their chimneys and
// porches, a village with its white church and spire, red barns and silos, pumpkin and apple stands with their patches
// and hay, stacked firewood, a sawmill with its log decks and a smoking burner; lakes lying in the valleys; the far
// hills; a low golden sun in a hazy sky. A tunnel (a level's "tunnels") is a covered bridge: a gabled roof over the
// wooden walls, battens, dark windows, a sign over the portal, and the stream it crosses. The ice patches of a level
// are WET LEAVES here (the same mechanic: a darker, glossy sheet strewn with fallen leaves).
// Cheap by design: everything standing is instanced, in chunks of the road 400 m long (so the ones behind and far ahead
// are never drawn), one draw call to a kind of thing in a chunk; the leaves are one Points object; no work is done per
// frame but moving two objects. Laid out from a seed of the level's own, the same every run. (The models: autumnModels.js.)
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { CONFIG } from '../../config.js';
import { landAt } from '../road.js'; // (the height of the land as drawn)

const CHUNK = 400; // m of road to a chunk of instances
const CROWNS = [[0xc0301a, 18], [0xe0661a, 26], [0xe8b42a, 26], [0xb8b02e, 8], [0x9a5a2a, 10], [0x9a1c1c, 7], [0xd9441c, 5]]; // red, orange, gold, yellow-green, brown, crimson, vermilion
const WHITES = [0xfffdf4, 0xfffdf4, 0xfffdf4, 0xf2e6b4, 0xd4e4ea, 0xe8d4c0]; // (clapboard, a little over white: the walls that face the road stand in shade)
const ROOFS = [0x4a4e58, 0x4a4e58, 0x5a3a2a, 0x7a2e26];
const DOORS = [0xa82a22, 0x2f5a3a, 0x203a5a];
const LEAVES = [0xb23a1c, 0xd9741f, 0xe0a62e, 0x8a4a22, 0xc4501c, 0xe8b840];
const CARPET = [0xa8401c, 0xb85a1c, 0xc99a2e, 0x7a4a24, 0xc4601e, 0xb8903a, 0x8a3a1c]; // (the verge's: duller and browner than the leaves in the air)

export const autumn = ({ theme, offRoads, beside, inJunction, levelGroup }) => {
  // (laid out the same every time: a seed of the level's own)
  let seed = 41 + (LEVEL.id || '').length * 197;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rand() * (b - a);
  const p = {};
  const tunnels = LEVEL.tunnels || [];
  const inTunnel = (s, pad = 0) => tunnels.some(t => s > t.from - pad && s < t.to + pad);
  const half = (s) => Math.max(Track.hi(s), -Track.lo(s));
  const ground = (x, z, fallback) => landAt ? landAt(x, z) : fallback;
  const L0 = Track.start - 120, L1 = Track.end + 160;

  // ---- instancing: kinds of thing, each drawn once to a chunk of road. spawn(kind, s, matrix, colour)
  const UNIT = {
    cube: new THREE.BoxGeometry(1, 1, 1),
    tube: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
    log: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
    spire: new THREE.ConeGeometry(0.5, 1, 4),
    blob: new THREE.IcosahedronGeometry(0.5, 0),
    ball: new THREE.SphereGeometry(0.5, 6, 4),
    dome: new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    trunk: new THREE.CylinderGeometry(0.28, 0.5, 1, 4, 1, true),
    leaf: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    prism: (() => { // a gable: a triangle 1 across and 1 tall, 1 long, the ridge along z, its foot on y = 0
      const g = new THREE.BufferGeometry(), a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0, 1, -0.5], d = [-0.5, 0, 0.5], e = [0.5, 0, 0.5], f = [0, 1, 0.5];
      g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...c, ...b, ...d, ...e, ...f, ...a, ...d, ...c, ...c, ...d, ...f, ...b, ...c, ...e, ...c, ...f, ...e, ...a, ...b, ...d, ...b, ...e, ...d], 3));
      g.computeVertexNormals();
      return g;
    })(),
  };
  const kinds = {};
  for (const [name, geometry] of Object.entries(UNIT)) kinds[name] = { geometry, chunks: new Map() };
  const M = new THREE.Matrix4(), BASE = new THREE.Matrix4(), LOCAL = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color();
  const spawn = (kind, s, color) => {
    const k = kinds[kind], c = Math.floor(s / CHUNK);
    let chunk = k.chunks.get(c);
    if (!chunk) k.chunks.set(c, chunk = { mats: [], cols: [] });
    chunk.mats.push(...M.elements);
    C.set(color);
    chunk.cols.push(C.r, C.g, C.b);
  };
  // a thing standing in the world: at (x, y, z), turned ry, scaled (sx, sy, sz) about its own middle
  const at = (kind, s, color, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => {
    E.set(rx, ry, rz, 'YXZ'); Q.setFromEuler(E);
    M.compose(V.set(x, y, z), Q, S.set(sx, sy, sz));
    spawn(kind, s, color);
  };
  // a model made of parts, set on the ground at world (x, y, z) facing `ry`: parts are [kind, lx, ly, lz, sx, sy, sz, colour, ry?, rx?, rz?],
  // (lx, ly, lz) the part's middle, in the model's own terms
  const model = (s, x, y, z, ry, parts, scale = 1) => {
    BASE.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, ry, 0)), S.set(scale, scale, scale));
    for (const [kind, lx, ly, lz, sx, sy, sz, color, pry = 0, prx = 0, prz = 0] of parts) {
      LOCAL.compose(V.set(lx, ly, lz), Q.setFromEuler(E.set(prx, pry, prz, 'YXZ')), S.set(sx, sy, sz));
      M.multiplyMatrices(BASE, LOCAL);
      spawn(kind, s, color);
    }
  };
  const flush = () => {
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const onRoad = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }); // (the leaves lying on the road win over its sheet of wet)
    for (const [name, k] of Object.entries(kinds)) {
      for (const chunk of k.chunks.values()) {
        const n = chunk.mats.length / 16, mesh = new THREE.InstancedMesh(k.geometry, name === 'leaf' ? onRoad : white, n);
        mesh.instanceMatrix.array.set(chunk.mats);
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(chunk.cols), 3);
        mesh.computeBoundingSphere();
        levelGroup.add(mesh);
      }
    }
  };

  // ---- the lie of the land
  const roadY = (s) => { Track.toWorld(s, 0, p); return p.y; };
  const gapOk = (x, z, s, d, k = 0.85) => Track.mainDistance(x, z) >= Math.max(half(s) + 3, (half(s) + d) * k);
  const blocked = [];
  const free = (x, z, r) => { for (const [bx, bz, br] of blocked) if (Math.hypot(x - bx, z - bz) < br + r) return false; return true; };

  // ---- lakes: where the land dips well below the road, water to a level of its own (flooded from the lowest corner of a
  // 5 m grid, out of the way of every road). A lake is a sheet of quads; nothing else stands in it
  const wet = new Set(), CELL = 5, wkey = (x, z) => Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
  const lakeAt = (x, z) => wet.has(wkey(x, z));
  const lakes = [];
  if (landAt) {
    const R = 115, N = Math.floor(2 * R / CELL), found = [];
    for (let s = Track.start + 100; s < Track.end - 100; s += 160) {
      for (const side of [-1, 1]) {
        const off = 55 + range(0, 45);
        Track.toWorld(s, beside(side, s, off), p);
        const cx = p.x, cz = p.z, top = roadY(s), H = new Float32Array(N * N);
        let best = Infinity, bi = -1;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const h = landAt(cx - R + (i + 0.5) * CELL, cz - R + (j + 0.5) * CELL);
          H[j * N + i] = h;
          if (h < best && Track.mainDistance(cx - R + (i + 0.5) * CELL, cz - R + (j + 0.5) * CELL) > 60 && offRoads(cx - R + (i + 0.5) * CELL, cz - R + (j + 0.5) * CELL, 30)) { best = h; bi = j * N + i; }
        }
        if (bi < 0) continue;
        const level = Math.min(best + 3.2, top - 2.2);
        if (level < best + 1.4) continue;
        const seen = new Set([bi]), todo = [bi], cells = [];
        while (todo.length) {
          const k = todo.pop(), i = k % N, j = Math.floor(k / N);
          cells.push([cx - R + (i + 0.5) * CELL, cz - R + (j + 0.5) * CELL]);
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di, nj = j + dj, nk = nj * N + ni;
            if (ni < 0 || nj < 0 || ni >= N || nj >= N || seen.has(nk) || H[nk] >= level) continue;
            const x = cx - R + (ni + 0.5) * CELL, z = cz - R + (nj + 0.5) * CELL;
            if (Track.mainDistance(x, z) < 40 || !offRoads(x, z, 25)) continue;
            seen.add(nk);
            todo.push(nk);
          }
        }
        if (cells.length >= 30) found.push({ s, level, cells });
      }
    }
    found.sort((a, b) => b.cells.length - a.cells.length);
    for (const lake of found) {
      if (lakes.length >= 3 || lakes.some(o => Math.abs(o.s - lake.s) < 700)) continue;
      lakes.push(lake);
    }
    const pos = [], idx = [];
    for (const { level, cells } of lakes) {
      for (const [x, z] of cells) {
        const n = pos.length / 3;
        pos.push(x - CELL / 2, level, z - CELL / 2, x + CELL / 2, level, z - CELL / 2, x - CELL / 2, level, z + CELL / 2, x + CELL / 2, level, z + CELL / 2);
        idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) wet.add(wkey(x + a * CELL, z + b * CELL));
      }
    }
    if (pos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const water = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x86a8ac, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      water.userData.flat = true;
      levelGroup.add(water);
    }
  }

  // ---- the sky: a dome that shades from the haze at the horizon (the theme's sky, so it meets the fog) up to a pale blue,
  // a low sun with its glow; both go with the camera, never any nearer
  {
    const HORIZON = new THREE.Color(theme.sky), TOP = new THREE.Color(0x8fb4d4), MID = new THREE.Color(0xe0d2ae);
    const geo = new THREE.SphereGeometry(600, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const col = [], pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = Math.max(0, pos.getY(i) / 600), c = new THREE.Color();
      if (u < 0.22) c.copy(HORIZON).lerp(MID, u / 0.22); else c.copy(MID).lerp(TOP, Math.min(1, (u - 0.22) / 0.65));
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    const SUN = new THREE.Vector3(-0.55, 0.2, -0.81).normalize().multiplyScalar(540);
    let glowMap = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(0.18, 'rgba(255,226,160,0.85)'); g.addColorStop(0.5, 'rgba(255,190,110,0.28)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      glowMap = new THREE.CanvasTexture(canvas);
    } catch { /* (no canvas to draw on: a headless check) */ }
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(330, 330), new THREE.MeshBasicMaterial({ map: glowMap, color: glowMap ? 0xffffff : 0xffd890, transparent: true, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false, depthWrite: false }));
    for (const thing of [dome, halo, disc]) { thing.frustumCulled = false; levelGroup.add(thing); }
    dome.renderOrder = -3; halo.renderOrder = -2.9; disc.renderOrder = -2.8;
    dome.onBeforeRender = (renderer, scene, camera) => {
      const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x;
      dome.position.set(x, camera.position.y - 4, camera.position.z);
      halo.position.set(x + SUN.x, camera.position.y + SUN.y, camera.position.z + SUN.z);
      disc.position.copy(halo.position);
      halo.lookAt(x, camera.position.y, camera.position.z);
      disc.lookAt(x, camera.position.y, camera.position.z);
      for (const o of [dome, halo, disc]) o.updateMatrixWorld();
    };
  }

  // ---- the far hills, off in the haze: low domes in rust and ochre, one every so often on both sides
  for (let s = L0; s < L1; s += 130) {
    for (const side of [-1, 1]) {
      const far = 380 + rand() * 90, sc = range(160, 280), tall = range(110, 200), q = Math.max(Track.start, Math.min(Track.end, s));
      Track.toWorld(q, beside(side, q, far), p);
      if (rand() < 0.35 || Track.mainDistance(p.x, p.z) < 330 || !offRoads(p.x, p.z, 120)) continue;
      at('dome', s, [0xb0722e, 0x9a5a2a, 0xc08a38, 0x8a6a46, 0xa8642c][Math.floor(rand() * 5)], p.x, -2, p.z, sc, tall, sc * range(0.8, 1.2), rand() * 3);
    }
  }

  // ---- the road's own: the carpet of leaves along both verges (one strip with colour at its corners, red and orange by the
  // road, gold and brown further out, fading into the land)
  {
    const COLS = [0.3, 1.8, 3.6, 6, 9, 13], STEP = 4, per = COLS.length * 2;
    const land = new THREE.Color(theme.terrain.gentle), tint = new THREE.Color();
    for (let a = Track.start; a < Track.end; a += 700) {
      const b = Math.min(a + 700, Track.end), pos = [], col = [], idx = [];
      let rows = 0;
      for (let s = a; s <= b + 0.001; s += STEP) {
        if (inJunction(s) || inTunnel(s, 6)) { rows = 0; continue; }
        for (const side of [-1, 1]) {
          for (let c = 0; c < COLS.length; c++) {
            Track.toWorld(s, beside(side, s, COLS[c]), p);
            pos.push(p.x, p.y - 0.24, p.z);
            tint.set(CARPET[Math.floor(rand() * CARPET.length)]);
            if (c === COLS.length - 1) tint.copy(land); else tint.lerp(land, 0.15 + Math.max(0, (c - 1) / 5) * 0.75);
            col.push(tint.r, tint.g, tint.b);
          }
        }
        if (rows) {
          const cur = pos.length / 3 - per;
          for (let side = 0; side < 2; side++) for (let c = 0; c < COLS.length - 1; c++) {
            const i = side * COLS.length + c, A = cur - per + i, B = A + 1, Cc = cur + i, D = Cc + 1;
            idx.push(A, Cc, B, B, Cc, D);
          }
        }
        rows++;
      }
      if (!idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      for (let i = 0; i < idx.length; i += 3) { // (every triangle wound to face up, the left verge's and the right's being mirrors of each other)
        const A = idx[i] * 3, B = idx[i + 1] * 3, Cc = idx[i + 2] * 3;
        if ((pos[B + 2] - pos[A + 2]) * (pos[Cc] - pos[A]) - (pos[B] - pos[A]) * (pos[Cc + 2] - pos[A + 2]) < 0) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; }
      }
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const carpet = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      carpet.userData.flat = true;
      levelGroup.add(carpet);
    }
  }

  const signMats = new Map();
  const canvasSign = (text, w, h, ground0, ink) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = ground0; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = text.split('|');
      lines.forEach((line, i) => { ctx.font = 'bold ' + Math.round(h / (lines.length + 0.9)) + 'px sans-serif'; ctx.fillText(line, w / 2, h * (i + 1) / (lines.length + 1), w - 24); });
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map });
    } catch { return new THREE.MeshBasicMaterial({ color: ground0 }); }
  };
  // a sign board: the text drawn once on a canvas (a texture a sign, shared by all of that text)
  const signAt = (text, w, h, x, y, z, ry, ground0 = '#f2efe6', ink = '#5a1a10') => {
    if (!signMats.has(text)) signMats.set(text, canvasSign(text, 256, 96, ground0, ink));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMats.get(text));
    sign.position.set(x, y, z);
    sign.rotation.y = ry;
    levelGroup.add(sign);
    return sign;
  };

  // ---- places to build: set-pieces first (so the trees keep clear of them), at fixed shares of the road
  const along = (share) => Track.start + (Track.end - Track.start) * share;
  // a spot beside the road d m off its edge, facing the road: sets p, and returns its heading and the land's height; null if it isn't clear
  const site = (s, side, d, r) => {
    const lat = beside(side, s, d);
    const h = Track.toWorld(s, lat, p);
    if (inTunnel(s, 40) || inJunction(s) || !offRoads(p.x, p.z, r) || !gapOk(p.x, p.z, s, d) || lakeAt(p.x, p.z) || !free(p.x, p.z, r)) return null;
    p.land = ground(p.x, p.z, p.y - 0.3);
    if (Math.abs(p.land - (p.y - 0.3)) > 1.2) return null; // (not on a slope)
    p.heading = h + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    return h;
  };
  const sites = []; // what has been put where, for the trees to keep off
  const claim = (x, z, r) => blocked.push([x, z, r]);

  const house = (s, side, d, big) => {
    const w = big ? range(10, 12) : range(7.5, 9.5), dep = big ? range(7, 8) : range(6, 7), wallH = big ? 6.4 : 4.8, roofH = range(2.8, 3.6);
    if (site(s, side, d, w * 0.8) === null) return false;
    const x = p.x, z = p.z, y = p.land, body = WHITES[Math.floor(rand() * WHITES.length)], door = DOORS[Math.floor(rand() * DOORS.length)];
    const roof = ROOFS[Math.floor(rand() * ROOFS.length)], slope = Math.atan2(roofH, dep / 2 + 0.35), run = Math.hypot(roofH, dep / 2 + 0.35) + 0.15;
    const shutter = [0x1f3a2a, 0x1c1f26, 0x2f3f5a][Math.floor(rand() * 3)], brick = 0x9a4a38;
    const parts = [
      ['cube', 0, 0.3, 0, w + 0.2, 0.7, dep + 0.2, 0x7a7a74],                                    // the foundation
      ['cube', 0, wallH / 2 + 0.3, 0, w, wallH, dep, body],                                       // the walls
      ['prism', 0, wallH + 0.3, 0, dep, roofH, w - 0.04, body, Math.PI / 2],                      // the gable ends
      ['cube', 0, wallH + 0.3 + roofH / 2 + 0.05, (dep / 2 + 0.35) / 2, w + 0.7, 0.22, run, roof, 0, slope],
      ['cube', 0, wallH + 0.3 + roofH / 2 + 0.05, -(dep / 2 + 0.35) / 2, w + 0.7, 0.22, run, roof, 0, -slope],
      ['cube', w * 0.3, wallH + roofH * 0.75 + 0.5, -dep * 0.15, 1.1, roofH * 0.9 + 0.6, 1.1, brick],     // the chimney
      ['cube', -w * 0.12, 1.4, dep / 2 + 0.04, 1.1, 2.2, 0.1, door],                              // the door
    ];
    for (const [wy, upstairs] of big ? [[2.8, false], [5.7, true]] : [[2.8, false]]) for (const wx of (upstairs ? [-w * 0.34, -w * 0.12, w * 0.14, w * 0.36] : [-w * 0.38, w * 0.14, w * 0.38])) {
      parts.push(['cube', wx, wy + 0.3, dep / 2 + 0.04, 1.15, 1.5, 0.1, 0x2c3c4c], ['cube', wx - 0.85, wy + 0.3, dep / 2 + 0.06, 0.4, 1.5, 0.1, shutter], ['cube', wx + 0.85, wy + 0.3, dep / 2 + 0.06, 0.4, 1.5, 0.1, shutter]);
    }
    for (const sx of [-1, 1]) parts.push(['cube', sx * (w / 2 + 0.04), 3.3, 0, 0.1, 1.4, 1.1, 0x2c3c4c]);
    if (rand() < 0.6) { // a porch across the front: a roof on posts
      const pw = w * 0.5;
      parts.push(['cube', -w * 0.12, 0.4, dep / 2 + 1.0, pw, 0.2, 2, 0xb8a888], ['cube', -w * 0.12, 3.0, dep / 2 + 1.0, pw + 0.3, 0.2, 2.3, 0x5a5e68]);
      for (const px of [-1, 1]) parts.push(['cube', -w * 0.12 + px * (pw / 2 - 0.2), 1.7, dep / 2 + 1.9, 0.18, 2.5, 0.18, 0xf4f1e8]);
    }
    model(s, x, y, z, p.heading, parts);
    claim(x, z, w * 0.75 + 3);
    sites.push([s, side, d]);
    return true;
  };
  const barn = (s, side, d) => {
    if (site(s, side, d, 14) === null) return false;
    const x = p.x, z = p.z, y = p.land;
    const w = 14, dep = 9, wallH = 5.6, roofH = 3.4, slope = Math.atan2(roofH, dep / 2 + 0.4), run = Math.hypot(roofH, dep / 2 + 0.4) + 0.2, red = 0x9a2a1e;
    model(s, x, y, z, p.heading, [
      ['cube', 0, wallH / 2, 0, w, wallH, dep, red],
      ['prism', 0, wallH, 0, dep, roofH, w - 0.04, red, Math.PI / 2],
      ['cube', 0, wallH + roofH / 2 + 0.05, (dep / 2 + 0.4) / 2, w + 0.8, 0.25, run, 0x6a6e74, 0, slope],
      ['cube', 0, wallH + roofH / 2 + 0.05, -(dep / 2 + 0.4) / 2, w + 0.8, 0.25, run, 0x6a6e74, 0, -slope],
      ['cube', 0, 1.9, dep / 2 + 0.05, 4.6, 3.8, 0.12, 0xf2efe6], ['cube', 0, 1.9, dep / 2 + 0.09, 4.0, 3.2, 0.12, red],        // the big doors in white trim
      ['cube', 0, 1.9, dep / 2 + 0.13, 0.2, 3.8, 0.1, 0xf2efe6], ['cube', 0, wallH + 1.1, dep / 2 + 0.05, 1.4, 1.4, 0.12, 0x2a1a12],
      ['cube', -w / 2 + 0.2, wallH / 2, dep / 2 + 0.06, 0.4, wallH, 0.1, 0xf2efe6], ['cube', w / 2 - 0.2, wallH / 2, dep / 2 + 0.06, 0.4, wallH, 0.1, 0xf2efe6],
    ]);
    // a silo beside it, with its dome
    const sx = Math.cos(p.heading) * (w / 2 + 3), sz = -Math.sin(p.heading) * (w / 2 + 3);
    model(s, x + sx, y, z + sz, 0, [['tube', 0, 6, 0, 4.4, 12, 4.4, 0xb8b4a8], ['dome', 0, 12, 0, 4.4, 3, 4.4, 0x8a8e94]]);
    claim(x, z, 17);
    // round bales in the field in front
    for (let k = 0; k < 4; k++) at('tube', s, 0xd9b44f, x + Math.sin(p.heading) * (12 + (k % 2) * 3.5) + Math.cos(p.heading) * (k * 2.6 - 4), y + 0.75, z + Math.cos(p.heading) * (12 + (k % 2) * 3.5) - Math.sin(p.heading) * (k * 2.6 - 4), 1.5, 1.4, 1.5, p.heading + Math.PI / 2, Math.PI / 2, 0);
    return true;
  };
  const church = (s, side, d) => {
    if (site(s, side, d, 12) === null) return false;
    const x = p.x, z = p.z, y = p.land, w = 9, dep = 15, wallH = 7, roofH = 3.6, slope = Math.atan2(roofH, w / 2 + 0.4), run = Math.hypot(roofH, w / 2 + 0.4) + 0.2;
    // (its long axis runs away from the road; its tower is at the front)
    model(s, x, y, z, p.heading, [
      ['cube', 0, wallH / 2, 0, w, wallH, dep, 0xf4f1e8],
      ['prism', 0, wallH, 0, w, roofH, dep - 0.04, 0xf4f1e8],
      ['cube', (w / 2 + 0.4) / 2, wallH + roofH / 2 + 0.05, 0, run, 0.24, dep + 0.8, 0x4a4e58, 0, 0, -slope], ['cube', -(w / 2 + 0.4) / 2, wallH + roofH / 2 + 0.05, 0, run, 0.24, dep + 0.8, 0x4a4e58, 0, 0, slope],
      ['cube', 0, 6, dep / 2 + 1.6, 4, 12, 4, 0xf4f1e8],                                          // the tower
      ['cube', 0, 12.4, dep / 2 + 1.6, 4.4, 0.4, 4.4, 0xe4e0d4],
      ['spire', 0, 17.1, dep / 2 + 1.6, 6, 9, 6, 0xf4f1e8, Math.PI / 4],                      // the spire
      ['cube', 0, 10.4, dep / 2 + 3.62, 1.4, 2.6, 0.1, 0x2a1a12],                                 // the belfry's louvre
      ['cube', 0, 1.3, dep / 2 + 3.64, 1.8, 2.6, 0.1, 0xa82a22],                                  // the door
      ['cube', 0, 22, dep / 2 + 1.6, 0.12, 1.8, 0.12, 0x3a3a3a],
    ]);
    for (const sx of [-1, 1]) for (const k of [-4, 0, 4]) model(s, x, y, z, p.heading, [['cube', sx * (w / 2 + 0.04), 3.8, k, 0.1, 3, 1.3, 0x2c3c4c]]);
    claim(x, z, 14);
    return true;
  };
  const woodpile = (s, side, d) => {
    if (site(s, side, d, 3) === null) return false;
    const cols = 5 + Math.floor(rand() * 3), rowsN = 3 + Math.floor(rand() * 2), x = p.x, z = p.z, y = p.land, parts = [];
    const WOODS = [0x8a5a2e, 0x6e4522, 0xa8763e, 0x7a4e28];
    for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) {
      parts.push(['log', (c - cols / 2 + 0.5) * 0.52 + (r % 2) * 0.26, 0.28 + r * 0.46, 0, 0.5, 1.6, 0.5, WOODS[(c + r * 3) % 4], 0, Math.PI / 2, 0]);
    }
    for (const sx of [-1, 1]) parts.push(['cube', sx * (cols * 0.26 + 0.35), rowsN * 0.23 + 0.15, 0, 0.14, rowsN * 0.46 + 0.3, 0.14, 0x5e3d1e]);
    model(s, x, y, z, p.heading, parts);
    claim(x, z, 2.6);
    return true;
  };
  const wall = (s0, s1, side, d) => { // a dry-stone wall along the field edge: a course of rounded stones with another on top, in lengths with gaps
    for (let s = s0; s < s1; s += 2.3) {
      if (rand() < 0.1) continue;
      const lat = beside(side, s, d + (rand() - 0.5) * 0.3), h = Track.toWorld(s, lat, p);
      if (inTunnel(s, 10) || inJunction(s) || !offRoads(p.x, p.z, 3) || lakeAt(p.x, p.z) || !gapOk(p.x, p.z, s, d, 0.9) || !free(p.x, p.z, 0.5)) continue;
      const hh = range(0.4, 0.62), gy = ground(p.x, p.z, p.y - 0.3), stone = [0x8a8780, 0x7d7a74, 0x9a968c, 0x6f6c66, 0x948a78][Math.floor(rand() * 5)];
      if (Math.abs(gy - (p.y - 0.3)) > 1.5) continue;
      at('blob', s, stone, p.x, gy + hh * 0.35, p.z, range(0.8, 1.0), hh * 1.3, range(2.1, 2.7), h + (rand() - 0.5) * 0.25);
      if (rand() < 0.8) at('blob', s, [0x9a968c, 0x8a8780, 0xa49c88][Math.floor(rand() * 3)], p.x, gy + hh * 0.85, p.z, range(0.55, 0.75), hh * 0.9, range(1.4, 2.0), h + (rand() - 0.5) * 0.3);
    }
  };

  const stand = (s, side, kind) => { // a roadside stand with its patch behind: pumpkins or apples
    const d = 3.4;
    if (site(s, side, d, 7) === null) return false;
    const x = p.x, z = p.z, y = p.land, hd = p.heading, pumpkins = kind === 'pumpkins';
    const awnA = pumpkins ? 0xe8751a : 0xc42a1c, awnB = 0xf4f1e8, wood = 0x8a5a2e, parts = [
      ['cube', 0, 0.95, 0, 4.4, 0.12, 1.4, wood], ['cube', 0, 0.45, 0, 4.2, 0.9, 1.2, 0x5e3d1e],
    ];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(['cube', sx * 2.1, 1.55, sz * 0.75, 0.12, 3.1, 0.12, wood]);
    for (let k = 0; k < 8; k++) parts.push(['cube', -1.96 + k * 0.56, 3.0, 0.1, 0.56, 0.1, 2.0, k % 2 ? awnB : awnA, 0, 0.18]);
    for (let k = 0; k < 7; k++) {
      const px = -1.8 + k * 0.6, pr = pumpkins ? range(0.34, 0.46) : 0.2;
      if (pumpkins) parts.push(['ball', px, 1.0 + pr * 0.5, range(-0.3, 0.3), pr * 2, pr * 1.6, pr * 2, [0xf07a14, 0xe8680f, 0xf58a22][k % 3]]);
      else for (let a = 0; a < 3; a++) parts.push(['ball', px + (a - 1) * 0.16, 1.15 + (a % 2) * 0.1, range(-0.3, 0.3), 0.34, 0.34, 0.34, [0xc42a1c, 0xd9441c, 0x8ab43a][(k + a) % 3]]);
    }
    model(s, x, y, z, hd, parts);
    const fx = Math.sin(hd), fz = Math.cos(hd), rx = Math.cos(hd), rz = -Math.sin(hd);
    signAt(pumpkins ? 'PUMPKINS|& HAY' : 'APPLES|& CIDER', 3.6, 1.2, x + fx * 1.3, y + 3.45, z + fz * 1.3, hd);
    // stacks in front (crates and hay), and the patch behind
    for (let k = 0; k < 3; k++) at('cube', s, 0x9a6a38, x + fx * 1.5 + rx * (k - 1) * 1.7, y + 0.3, z + fz * 1.5 + rz * (k - 1) * 1.7, 1.1, 0.6, 0.9, hd);
    for (let k = 0; k < 4; k++) at('tube', s, 0xd9b44f, x - fx * (3.4 + (k % 2) * 1.8) + rx * (k * 2.4 - 3.5), y + 0.7, z - fz * (3.4 + (k % 2) * 1.8) + rz * (k * 2.4 - 3.5), 1.4, 1.4, 1.4, hd + Math.PI / 2, Math.PI / 2);
    if (pumpkins) { // the patch: a plot of vine with pumpkins lying in it
      const px = x - fx * 11.5, pz = z - fz * 11.5, py = ground(px, pz, y);
      at('cube', s, 0x5a7a2c, px, py + 0.04, pz, 20, 0.08, 11, hd);
      for (let k = 0; k < 46; k++) {
        const u = range(-9, 9), v = range(-16, -7), r = range(0.28, 0.5), bx = x + rx * u + fx * v, bz = z + rz * u + fz * v;
        at('ball', s, [0xf07a14, 0xe8680f, 0xf58a22, 0xdd5a0c][k % 4], bx, py + r * 0.7, bz, r * 2, r * 1.5, r * 2, rand() * 6);
      }
    } else { // an orchard behind: rows of squat trees, red with fruit
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
        const u = (k - 1.5) * 6, v = 9 + row * 6.5, cx = x - fx * v + rx * u, cz = z - fz * v + rz * u;
        if (!offRoads(cx, cz, 3)) continue;
        const gy = ground(cx, cz, y);
        at('trunk', s, 0x5a3a22, cx, gy + 0.9, cz, 0.5, 1.8, 0.5);
        at('blob', s, [0xb4a02a, 0xc8741e, 0x9aa02e][(k + row) % 3], cx, gy + 2.7, cz, 4.2, 3.2, 4.2, rand() * 6);
        for (let a = 0; a < 3; a++) at('ball', s, 0xc42a1c, cx + Math.cos(a * 2.1) * 1.7, gy + 2.2 + a * 0.3, cz + Math.sin(a * 2.1) * 1.7, 0.45, 0.45, 0.45);
      }
    }
    claim(x, z, 8);
    return true;
  };
  const sawmill = (s, side) => {
    const d = 21;
    if (site(s, side, d, 24) === null) return false;
    const x = p.x, z = p.z, y = p.land, hd = p.heading, fx = Math.sin(hd), fz = Math.cos(hd), rx = Math.cos(hd), rz = -Math.sin(hd);
    const board = 0x7a6248, tin = 0xa24a2a;
    model(s, x, y, z, hd, [
      ['cube', 0, 3.4, 0, 22, 6.8, 12, board],                                                    // the mill: a long shed...
      ['prism', 0, 6.8, 0, 12, 2.8, 21.96, board, Math.PI / 2],
      ['cube', 0, 6.8 + 1.4 + 0.1, 3.2 + 0.2, 22.8, 0.25, 6.6, tin, 0, 0.42], ['cube', 0, 6.8 + 1.4 + 0.1, -3.2 - 0.2, 22.8, 0.25, 6.6, tin, 0, -0.42],
      ['cube', -3, 2.6, 6.04, 8, 5, 0.12, 0x2a1a12],                                              // ...its open bay, dark inside
      ['cube', -3, 5.35, 6.06, 8.4, 0.3, 0.14, 0x4a3a28], ['cube', 5.5, 3.0, 6.04, 2, 3.6, 0.12, 0xa82a22],
      ['cube', 14, 1.8, 1, 8, 3.6, 8, board], ['cube', 14, 3.95, 1, 8.6, 0.3, 8.6, tin, 0, 0, 0.08],   // a lean-to for the planed boards
      ['tube', -8, 9, -4, 2.2, 18, 2.2, 0x6a6e74], ['tube', -8, 18.2, -4, 2.8, 0.7, 2.8, 0x4a4e54],  // the burner's stack
      ['cube', 0, 1.0, -9, 22, 2.0, 6, 0x6a5238, 0, 0, 0],                                        // a conveyor / sawdust bank behind
    ]);
    // log decks in front: heaps of long logs, lying in rows
    const WOODS = [0x7a4e28, 0x8a5a2e, 0x6e4522, 0x9a6a38, 0x5e3d1e];
    for (let deck = 0; deck < 3; deck++) {
      const u0 = -10 + deck * 9.5, v0 = 12 + (deck % 2) * 3;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8 - r; c++) {
        const lx = u0 + (c - (8 - r) / 2) * 0.62 + 2.8, lh = 0.34 + r * 0.56;
        at('log', s, WOODS[(c * 3 + r + deck) % 5], x + rx * lx + fx * v0, y + lh, z + rz * lx + fz * v0, 0.62, 5.6, 0.62, hd + Math.PI / 2, Math.PI / 2, 0);
      }
    }
    // stacks of sawn timber, pale
    for (let k = 0; k < 3; k++) at('cube', s, 0xd9b87a, x + rx * (-14) + fx * (5 + k * 3.2), y + 1.0, z + rz * (-14) + fz * (5 + k * 3.2), 1.6, 2.0, 4.2, hd);
    // the smoke from the burner's stack: a few pale puffs, still
    for (let k = 0; k < 5; k++) at('ball', s, k % 2 ? 0xc8c0b4 : 0xdad2c4, x + rx * -8 + Math.sin(hd + 1) * k * 1.2, y + 20 + k * 2.4, z + rz * -8 - fz * 0, 2.4 + k * 1.1, 2 + k, 2.4 + k * 1.1);
    signAt('SAWMILL|SINCE 1884', 6, 2, x + fx * 6.4 + rx * -9, y + 5.6, z + fz * 6.4 + rz * -9, hd);
    claim(x, z, 26);
    return { x, z, y, hd };
  };

  // the villages: a church, white houses on both sides, a barn; farms and stands and wood stacks between
  const villages = [0.07, 0.47, 0.88];
  const placed = { church: 0, houses: 0, farms: 0, stands: 0, wood: 0, sawmill: null };
  villages.forEach((share, n) => {
    const s0 = along(share);
    for (let k = 0; k < 9; k++) {
      const s = s0 + k * 38 + rand() * 12, side = k % 2 ? 1 : -1;
      if (n === 1 && k === 3 && church(s, side, 11)) placed.church++;
      else if (house(s, side, range(11, 15), k % 3 === 0)) placed.houses++;
      if (rand() < 0.5 && woodpile(s + 14, side, range(4.5, 6))) placed.wood++;
    }
  });
  placed.sawmill = sawmill(along(0.74), 1) || sawmill(along(0.76), -1) || sawmill(along(0.72), 1) || sawmill(along(0.78), -1);
  for (let s = along(0.04); s < Track.end - 100; s += range(210, 330)) {
    const side = rand() < 0.5 ? -1 : 1, roll = rand();
    if (roll < 0.34) { if (barn(s, side, range(22, 34))) { placed.farms++; house(s - 38, side, range(14, 20), true); } }
    else if (roll < 0.62) { if (house(s, side, range(13, 24), rand() < 0.4)) placed.houses++; }
    else if (woodpile(s, side, range(4.5, 8))) placed.wood++;
  }
  // stands: a pumpkin stand and an apple stand, a few of each, on the right where the cars pull in
  [0.19, 0.31, 0.57, 0.66, 0.84, 0.95].forEach((share, n) => {
    for (const ds of [0, 22, -22, 44, -44]) if (stand(along(share) + ds, n % 3 === 2 ? -1 : 1, n % 2 ? 'apples' : 'pumpkins')) { placed.stands++; break; }
  });
  // stone walls along the fields
  for (let s = L0; s < L1; s += 90) {
    for (const side of [-1, 1]) if (rand() < 0.62) wall(s, s + range(40, 150), side, range(3.2, 4.6));
  }

  // ---- the forest. Along both sides of the road a belt of trees thinning out with the distance, maples and oaks in the colours
  // of the fall (a tall rounded crown or two on a trunk), a few dark pines; shrubs low by the verge
  let pines = 0, maples = 0;
  const treeSpot = (s, side, d) => {
    const lat = beside(side, s, d);
    Track.toWorld(s, lat, p);
    if (inTunnel(s, 25) || inJunction(s)) return false;
    if (!offRoads(p.x, p.z, 8) || !gapOk(p.x, p.z, s, d) || lakeAt(p.x, p.z) || !free(p.x, p.z, 3)) return false;
    p.land = ground(p.x, p.z, p.y - 0.3);
    return true;
  };
  const crownColor = () => {
    let r = rand() * 100;
    for (const [c, w] of CROWNS) { r -= w; if (r <= 0) return c; }
    return CROWNS[0][0];
  };
  {
    for (let s = L0; s < L1; s += 6.5) {
      const q = Math.max(Track.start, Math.min(Track.end, s));
      for (const side of [-1, 1]) {
        const count = 1 + (rand() < 0.75 ? 1 : 0) + (rand() < 0.35 ? 1 : 0);
        for (let k = 0; k < count; k++) {
          const d = 5.2 + Math.pow(rand(), 1.7) * 62, ss = q + (rand() - 0.5) * 9;
          if (!treeSpot(ss, side, d)) { rand(); rand(); continue; }
          const x = p.x, z = p.z, y = p.land, kind = rand();
          if (kind < 0.13) { // a pine: two stacked cones on a short trunk
            const h = range(9, 15);
            at('trunk', ss, 0x4a3220, x, y + 1.1, z, 0.5, 2.2, 0.5);
            at('cone', ss, 0x1f4a2a, x, y + 2 + h * 0.36, z, h * 0.42, h * 0.72, h * 0.42);
            at('cone', ss, 0x2a5a32, x, y + 2 + h * 0.66, z, h * 0.3, h * 0.55, h * 0.3);
            pines++;
          } else { // a maple or an oak
            const h = range(8, 15) * (d < 14 ? 0.92 : 1), r = range(3.1, 5.2), c = crownColor(), tilt = rand() * 6;
            at('trunk', ss, 0x4a3220, x, y + h * 0.28, z, 0.55 + h * 0.02, h * 0.56, 0.55 + h * 0.02);
            at('blob', ss, c, x, y + h * 0.7, z, r * 2, r * 1.5, r * 2, tilt);
            if (rand() < 0.75) at('blob', ss, crownColor(), x + (rand() - 0.5) * r * 0.9, y + h * 0.7 + r * 0.9, z + (rand() - 0.5) * r * 0.9, r * 1.3, r * 1.1, r * 1.3, rand() * 6);
            maples++;
          }
        }
      }
      // shrubs by the verge, low and bright
      if (rand() < 0.55) {
        const side = rand() < 0.5 ? -1 : 1, d = range(2.4, 6), ss = q + rand() * 6;
        const lat = beside(side, ss, d);
        Track.toWorld(ss, lat, p);
        if (!inTunnel(ss, 8) && !inJunction(ss) && offRoads(p.x, p.z, 4) && gapOk(p.x, p.z, ss, d, 0.9) && !lakeAt(p.x, p.z) && free(p.x, p.z, 1.5)) {
          const r = range(0.8, 1.6);
          at('blob', ss, [0xc0301a, 0xe0661a, 0xe8b42a, 0x7a8a2a, 0x9a5a2a][Math.floor(rand() * 5)], p.x, ground(p.x, p.z, p.y - 0.3) + r * 0.4, p.z, r * 2, r * 1.1, r * 2, rand() * 6);
        }
      }
    }
  }

  // ---- the covered bridges (a level's tunnels): a gabled roof over the walls, battens, windows, a sign, and the stream
  for (const t of tunnels) {
    const lo = (s) => Track.lo(s) - 0.3, hi = (s) => Track.hi(s) + 0.3, H = CONFIG.tunnel.height;
    // the roof: two pitches from the top of the walls up to a ridge down the middle, overhanging; its gable ends
    const pos = [], idx = [];
    const ridge = 3.4, over = 1.6;
    let n = 0;
    for (let s = t.from - 1.5; s <= t.to + 1.5 + 0.001; s += 6, n++) {
      const q = Math.min(s, t.to + 1.5), a = lo(q) - over, b = hi(q) + over, m = (a + b) / 2;
      for (const [lat, up] of [[a, 0], [m, ridge], [b, 0]]) { Track.toWorld(q, lat, p); pos.push(p.x, p.y + H + up - 0.1, p.z); }
      if (n) { const k = (n - 1) * 3; idx.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5); }
    }
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    roofGeo.setIndex(idx);
    roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a32, side: THREE.DoubleSide }));
    roof.userData.flat = true;
    levelGroup.add(roof);
    // a gable at each end (the barn red, the road's width), battens down the sides, windows with white trim
    for (const end of [t.from - 1.5, t.to + 1.5]) {
      const a = lo(end), b = hi(end), g = [];
      Track.toWorld(end, a - over, p); g.push(p.x, p.y + H - 0.1, p.z);
      Track.toWorld(end, (a + b) / 2, p); g.push(p.x, p.y + H + ridge - 0.1, p.z);
      Track.toWorld(end, b + over, p); g.push(p.x, p.y + H - 0.1, p.z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g, 3));
      geo.computeVertexNormals();
      levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7e2a1e, side: THREE.DoubleSide })));
      // the sign over the opening
      const dir = end < (t.from + t.to) / 2 ? -1 : 1, hd = Track.toWorld(end + dir * 0.12, (a + b) / 2, p);
      signAt('COVERED BRIDGE|BUILT 1861', 7, 1.9, p.x, p.y + H + 1.35, p.z, hd + (dir > 0 ? 0 : Math.PI));
      // white boards along the two slopes of the gable and round the opening
      const span = b - a + over * 2, front = Track.toWorld(end + dir * 0.2, (a + b) / 2, p);
      const barge = Math.atan2(ridge, span / 2), bl = Math.hypot(span / 2, ridge) + 0.3, X = p.x, Y = p.y, Z = p.z;
      model(end, X, Y, Z, front, [
        ['cube', -span / 4, H - 0.1 + ridge / 2, 0, bl, 0.34, 0.34, 0xf2efe6, 0, 0, barge], ['cube', span / 4, H - 0.1 + ridge / 2, 0, bl, 0.34, 0.34, 0xf2efe6, 0, 0, -barge],
        ['cube', 0, H + 0.1, 0, b - a + 1.2, 0.5, 0.4, 0xf2efe6], ['cube', -(b - a) / 2 - 0.3, H / 2, 0, 0.6, H, 0.4, 0xf2efe6], ['cube', (b - a) / 2 + 0.3, H / 2, 0, 0.6, H, 0.4, 0xf2efe6],
      ]);
    }
    for (let s = t.from + 3; s < t.to; s += 2.4) {
      for (const side of [-1, 1]) {
        const lat = (side < 0 ? lo(s) : hi(s)) + side * 0.07, h = Track.toWorld(s, lat, p);
        at('cube', s, 0x5a1e14, p.x, p.y + H / 2, p.z, 0.12, H, 0.28, h);
      }
    }
    for (let s = t.from + 8; s < t.to - 6; s += 11) {
      for (const side of [-1, 1]) {
        const lat = (side < 0 ? lo(s) : hi(s)) + side * 0.1, h = Track.toWorld(s, lat, p);
        at('cube', s, 0x1c1410, p.x, p.y + 5.6, p.z, 0.14, 2.4, 4.2, h);
        for (const [dy, hy, ww, dz] of [[6.9, 0.22, 4.6, 0], [4.3, 0.22, 4.6, 0], [5.6, 2.6, 0.22, -2.2], [5.6, 2.6, 0.22, 2.2]]) {
          Track.toWorld(s + dz, lat + side * 0.04, p);
          at('cube', s, 0xf2efe6, p.x, p.y + dy, p.z, 0.16, hy, ww, h);
        }
      }
    }
    // the stream: across the road from bank to bank, at the foot of the walls, with stones along its edges
    const s0 = t.from + 20, s1 = t.to - 20, mid = (t.from + t.to) / 2;
    if (s1 - s0 > 6) {
      const sheet = [];
      for (const [lo0, hi0] of [[lo(mid) - 90, lo(mid) - 0.2], [hi(mid) + 0.2, hi(mid) + 90]]) {
        for (const [ss, lat] of [[s0, lo0], [s1, lo0], [s0, hi0], [s1, hi0]]) { Track.toWorld(ss, lat, p); sheet.push(p.x, p.y - 0.2, p.z); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(sheet, 3));
      geo.setIndex([0, 2, 1, 1, 2, 3, 4, 6, 5, 5, 6, 7]);
      const stream = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x5f8a96, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      stream.userData.flat = true;
      levelGroup.add(stream);
      for (const ss of [s0 - 1.2, s1 + 1.2]) for (const side of [-1, 1]) for (let lat = 4; lat < 70; lat += 3 + rand() * 4) {
        const h = Track.toWorld(ss + (rand() - 0.5) * 1.4, beside(side, mid, lat), p), r = range(0.45, 0.9);
        if (!offRoads(p.x, p.z, 2)) continue;
        at('blob', ss, [0x7d7a74, 0x8a8780, 0x6f6c66][Math.floor(rand() * 3)], p.x, p.y - 0.2 + r * 0.3, p.z, r * 2, r * 1.1, r * 1.6, h + rand() * 3);
      }
    }
    claim(0, 0, 0);
  }

  // ---- wet leaves: the level's ice patches, repainted: a dark, wet sheet and a gold shine, strewn with fallen leaves
  for (const m of levelGroup.children) {
    if (!m.isMesh || !m.material || !m.material.color || m.material.type !== 'MeshBasicMaterial' || !m.material.transparent) continue;
    const hex = m.material.color.getHex();
    if (hex === 0xd6eef8) { m.material.color.set(0x5a3416); m.material.opacity = 0.8; }       // (the ice's sheet)
    else if (hex === 0xffffff && Math.abs(m.material.opacity - 0.8) < 0.01) { m.material.color.set(0xd98a28); m.material.opacity = 0.62; } // (its shine)
  }
  const LW = CONFIG.laneWidth;
  for (const patch of LEVEL.ice || []) {
    const len = patch.to - patch.from, wide = patch.lane === undefined ? Track.laneHi(patch.from) - Track.laneLo(patch.from) : LW - 0.3;
    const count = Math.round(len * wide * 0.32);
    for (let k = 0; k < count; k++) {
      const s = patch.from + rand() * len, a = patch.lane === undefined ? Track.laneLo(s) : Track.laneOffset(patch.lane, s) - LW / 2 + 0.15, b = patch.lane === undefined ? Track.laneHi(s) : Track.laneOffset(patch.lane, s) + LW / 2 - 0.15;
      const h = Track.toWorld(s, a + (b - a) * rand(), p);
      at('leaf', s, LEAVES[Math.floor(rand() * LEAVES.length)], p.x, p.y + 0.045, p.z, range(0.35, 0.65), 1, range(0.25, 0.45), h + rand() * 6);
    }
  }
  // (and a scatter of dry ones blown across the road and onto the shoulders, thinning out from the verge)
  {
    for (let s = Track.start; s < Track.end; s += 3.2) {
      if (inJunction(s) || inTunnel(s, 2)) continue;
      const side = rand() < 0.5 ? -1 : 1, d = -rand() * rand() * 4.5;
      const h = Track.toWorld(s, beside(side, s, d), p);
      at('leaf', s, LEAVES[Math.floor(rand() * LEAVES.length)], p.x, p.y + 0.04, p.z, range(0.3, 0.55), 1, range(0.2, 0.38), h + rand() * 6);
    }
  }

  flush();

  // ---- leaves coming down: one points object in two layers, as the snow's, each a leaf-shaped sprite in an autumn colour,
  // tumbling and drifting on the GPU (the vertex shader swings each about by its place in the air; the sprite turns as it falls)
  {
    const BOX = 46, COUNT = 640, positions = [], colors = [], c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      positions.push((rand() - 0.5) * BOX * 2, rand() * BOX, (rand() - 0.5) * BOX * 2);
      c.set(LEAVES[Math.floor(rand() * LEAVES.length)]);
      colors.push(c.r, c.g, c.b);
    }
    let map = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(32, 6); ctx.bezierCurveTo(52, 14, 54, 44, 32, 58); ctx.bezierCurveTo(10, 44, 12, 14, 32, 6);
      ctx.fill();
      ctx.strokeStyle = '#b0b0b0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(32, 10); ctx.lineTo(32, 62); ctx.stroke();
      map = new THREE.CanvasTexture(canvas);
    } catch { /* (no canvas to draw on) */ }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const uniforms = { uTime: { value: 0 }, uOn: { value: 1 } };
    const mat = new THREE.PointsMaterial({ size: 0.9, map, vertexColors: true, transparent: true, alphaTest: 0.25, depthWrite: false, sizeAttenuation: true });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uOn = uniforms.uOn;
      shader.vertexShader = 'uniform float uTime;\nuniform float uOn;\nvarying float vSpin;\n' + shader.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n        gl_PointSize *= uOn;').replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = position.x * 0.37 + position.z * 0.53 + position.y * 0.21;
        transformed.x += sin(uTime * 1.5 + ph) * 1.1;
        transformed.z += cos(uTime * 1.2 + ph * 1.3) * 1.1;
        transformed.y += sin(uTime * 2.6 + ph * 2.0) * 0.18;
        vSpin = ph * 3.0 + uTime * (1.0 + fract(ph * 7.0) * 2.0);`);
      shader.fragmentShader = 'varying float vSpin;\n' + shader.fragmentShader.replace('#include <map_particle_fragment>', `
        #ifdef USE_MAP
          vec2 pc = gl_PointCoord - 0.5;
          float cs = cos(vSpin), sn = sin(vSpin);
          pc = vec2(cs * pc.x - sn * pc.y, sn * pc.x + cs * pc.y) * 1.25 + 0.5;
          diffuseColor *= texture2D(map, vec2(pc.x, 1.0 - pc.y));
        #endif`);
    };
    for (const layer of [0, 1]) {
      const fall = new THREE.Points(geo, mat);
      fall.frustumCulled = false;
      fall.onBeforeRender = (renderer, scene, camera) => {
        const now = performance.now() / 1000, down = (now * 1.5 + layer * BOX) % (BOX * 2);
        uniforms.uTime.value = now;
        uniforms.uOn.value = scene.fog && scene.fog.near < 80 ? 0 : 1; // (none under a covered bridge's roof: the tunnel draws the fog in)
        const x = scene.scale.x < 0 ? -camera.position.x : camera.position.x;
        fall.position.set(x, camera.position.y + BOX - down, camera.position.z);
        fall.updateMatrixWorld();
      };
      levelGroup.add(fall);
    }
  }
  levelGroup.userData.autumn = { trees: maples + pines, pines, lakes: lakes.length, ...placed };
};
