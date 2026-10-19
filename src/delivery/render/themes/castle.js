// ---- the MEDIEVAL CASTLE TOWN (theme 'castle', CHECKLIST 520): a cobbled road across strip fields with haystacks and a windmill,
// over a stone bridge across the moat, through the gatehouse of a walled town (crenellated walls, round towers with conical roofs,
// pennants), up its street of timber-framed houses past the market square and the torches, through the inner gate and out of the
// far one over the moat again, toward the castle on its hill. No figures anywhere, no lettering, no lights (the flames are colour).
// The level's NARROWINGS are the gates (each one's middle; a level with none gets three, a quarter of the way apart); its HUMPS
// (a steep climb and a steep drop: render/themes/tuscany.js reads them the same way) the bridges, the moat under them.
// COST: everything solid is merged with its colours in its vertices into one mesh a 180 m stretch (render/themes/castleModels.js
// Batch), the flames into one, the land's colour (fields, pavements, the square, the moat) into one, the castle and its hill
// into one, a windmill's sails one each (turned as they are drawn); the road's cobbles one, a 128 x 128 canvas (64 KB).
// Laid out from a seed of the level's own: the same every run (no Math.random).
import * as THREE from 'three';
import { LEVEL } from '../../levels.js';
import { Track } from '../../track.js';
import { BOX, CYL, CONE, LUMP, PRISM, PENNANT, BANNER, gatehouse, Batch, frameAt, cobbleTexture, timberTexture } from './castleModels.js';

const STONE = 0xa69d8b, STONE_DARK = 0x857c6c, CAP = 0xc9c0ab, TIMBER = 0x3b2b1f, IRON = 0x2a2a2e, SLATE = 0x56617a, TILE = 0x9b4a33;
const PLASTER = [0xece2cb, 0xf3eee3, 0xdcbb82, 0xdcac9c, 0xcfd3bb];
const ROOFS = [0x9b4a33, 0x84513a, 0xb89a5a, 0x5a6470, 0xa25a3a];
const CLOTH = [0xc8262c, 0x2f55b5, 0xe0b52a, 0x2f8a46, 0x7a2f8f, 0xf2efe6]; // (plain colours: no device, no lettering)
const CROPS = [0xcfb25a, 0xbfae6a, 0x84a352, 0x8a6c4c, 0x9aa66a, 0x8bab5e, 0xd8c27a];
const WATER = 0x3f6f78, BANK = 0x5d5a3e, PAVING = 0xb5ab97, SQUARE = 0xb9ae96;
const DW = 68;       // m from the road's middle to the town's side walls
const CH = 180;      // m of road a merged mesh of the solid things covers
const GD = 10;       // m a gatehouse is deep, along the road

export const castle = ({ theme, add, offRoads, inJunction, levelGroup }) => {
  let seed = 23 + (LEVEL.id || '').length * 131;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const tmp = {};
  const P = (s, lat) => { const o = {}; Track.toWorld(s, lat, o); return new THREE.Vector3(o.x, o.y, o.z); };
  const mid = (s) => (Track.lo(s) + Track.hi(s)) / 2;
  const half = (s) => (Track.hi(s) - Track.lo(s)) / 2;
  const off = (side, s, d) => (side < 0 ? Track.lo(s) - d : Track.hi(s) + d); // (d m off the pavement)
  const S0 = Track.start, S1 = Track.end, LEN = S1 - S0;
  const open = (s) => s > S0 + 2 && s < S1 - 2 && !inJunction(s) && !(Track.tunnel(s) > 0);
  let widest = 0;
  for (let s = S0; s <= S1; s += 25) widest = Math.max(widest, half(s));
  // a world spot clear of the road (anywhere along it) by r m, and of any other road
  const free = (x, z, r) => Track.mainDistance(x, z) > widest + r + 1.5 && offRoads(x, z, r);
  const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

  // ---- the batches: solid things by stretch of road, the flames, the land's colour, the castle on its hill
  const solidMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const solids = [];
  const at = (s) => (solids[Math.max(0, Math.floor((s - S0) / CH))] ||= new Batch(rand));
  const glow = new Batch(rand), land = new Batch(rand), far = new Batch(rand);

  // ---- where things are: the gates (the narrowings' middles), the bridges (the humps), the town between the outer gates
  const gates = (LEVEL.narrows || []).filter(z => !z.side).map(z => (z.from + z.to) / 2).filter(s => s > S0 + 40 && s < S1 - 40).sort((a, b) => a - b);
  if (!gates.length) for (const f of [0.25, 0.5, 0.75]) gates.push(S0 + LEN * f);
  const humps = [];
  { let s = 0; const segs = LEVEL.segments || []; for (let i = 0; i < segs.length; i++) { const up = segs[i], down = segs[i + 1]; if ((up.grade || 0) >= 0.1 && (down?.grade || 0) <= -0.1) humps.push({ from: s, peak: s + up.length, to: s + up.length + down.length }); s += up.length; } }
  const town = [gates[0], gates[gates.length - 1]];
  // (a level with no hump by an outer gate still crosses the moat there: a flat stone bridge, the road at the land's height, 40 m out)
  if (gates.length >= 2) for (const [g, dir] of [[town[0], -1], [town[1], 1]]) if (!humps.some(h => Math.abs(h.peak - g) < 120)) humps.push({ from: g + dir * 52 - 12, peak: g + dir * 52, to: g + dir * 52 + 12, flat: true });
  humps.sort((a, b) => a.from - b.from);
  const inTown = (s) => s > town[0] && s < town[1];
  const nearGate = (s, d) => gates.some(g => Math.abs(s - g) < d);
  const onHump = (s, d = 0) => humps.some(h => s > h.from - d && s < h.to + d);
  const moats = humps.filter(h => Math.abs(h.peak - town[0]) < 120 || Math.abs(h.peak - town[1]) < 120); // (the bridges by the outer gates)

  // the timber-framed fronts: one quad a floor with the frame drawn on it (castleModels.js timberTexture, 128 x 128), tinted by the plaster
  const face = { p: [], uv: [], c: [], n: [] }, FC = new THREE.Color(), FV = new THREE.Vector3(), FN = new THREE.Vector3();
  const facade = (F, x0, x1, y0, y1, z, color, bays) => {
    FC.set(color); FN.set(0, 0, 1).transformDirection(F);
    const pts = [[x0, y0, 0, 0], [x1, y0, bays, 0], [x1, y1, bays, 1], [x0, y1, 0, 1]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const [x, y, u, v] = pts[k]; FV.set(x, y, z).applyMatrix4(F); face.p.push(FV.x, FV.y, FV.z); face.uv.push(u, v); face.c.push(FC.r, FC.g, FC.b); face.n.push(FN.x, FN.y, FN.z); }
  };
  // ---- the parts every place shares
  const tower = (B, x, y0, z, r, h, roof, flag = true) => {
    const F = frameAt(x, y0, z, rand() * 6.28);
    B.part(CYL(12), F, STONE, 0, -1, 0, r * 2, h + 1, r * 2, 0, 0, 0, 0.04);
    B.part(CONE(12), F, roof, 0, h, 0, r * 2.5, r * 1.9, r * 2.5);
    for (let k = 0; k < 2; k++) { const a = k * 3.1; B.part(BOX, F, 0x2c2a28, Math.sin(a) * r * 0.98, h * (0.45 + 0.18 * (k % 2)), Math.cos(a) * r * 0.98, 0.3, 1.5, 0.3, 0, a, 0); } // (arrow slits)
    if (flag) {
      const top = h + r * 1.9 - 0.3;
      B.part(BOX, F, IRON, 0, top, 0, 0.14, 3.2, 0.14);
      B.part(PENNANT, F, pick(CLOTH), 0.07, top + 1.9, 0, 3.2, 1.1, 1, 0, rand() * 6.28, 0);
    }
  };
  // a run of crenellated wall from a to b (world points, its foot at y0), as segments about 10 m long
  const wallRun = (B, a, b, y0 = 0, high = 8) => {
    const run = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(run / 10));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, x0 = a.x + (b.x - a.x) * t0, z0 = a.z + (b.z - a.z) * t0, x1 = a.x + (b.x - a.x) * t1, z1 = a.z + (b.z - a.z) * t1;
      const len = Math.hypot(x1 - x0, z1 - z0), F = frameAt((x0 + x1) / 2, y0, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
      B.part(BOX, F, STONE, 0, -1, 0, 2.4, high + 1, len + 0.3, 0, 0, 0, 0.03);
      const m = Math.max(1, Math.round(len / 4.8));
      for (let j = 0; j < m; j++) B.part(BOX, F, STONE, 0, high, -len / 2 + (j + 0.5) * len / m, 2.6, 1.3, 1.6);
    }
  };
  const torch = (s, side, d) => {
    const p = P(s, off(side, s, d)), F = frameAt(p.x, p.y, p.z, 0), B = at(s);
    B.part(BOX, F, TIMBER, 0, 0, 0, 0.2, 3.0, 0.2);
    B.part(CYL(6, 1.4), F, IRON, 0, 2.95, 0, 0.42, 0.34, 0.42);
    glow.part(CONE(6), F, 0xff8a1e, 0, 3.25, 0, 0.44, 0.9, 0.44);
    glow.part(CONE(5), F, 0xffe17a, 0, 3.25, 0, 0.24, 0.6, 0.24);
  };
  const haystack = (B, x, z, k = 1) => {
    const F = frameAt(x, 0, z, rand() * 6.28), c = rand() < 0.5 ? 0xd8b45a : 0xc9a24a;
    B.part(CYL(6), F, c, 0, 0, 0, 2.6 * k, 1.6 * k, 2.6 * k);
    B.part(CONE(6), F, c, 0, 1.6 * k, 0, 2.9 * k, 2.0 * k, 2.9 * k, 0, 0, 0, 0.05);
  };
  const tree = (B, x, z) => {
    const F = frameAt(x, 0, z, rand() * 6.28), h = 2.2 + rand() * 1.4, s = 3.2 + rand() * 1.8;
    B.part(CYL(5), F, 0x5a4230, 0, 0, 0, 0.5, h + 0.6, 0.5);
    B.part(LUMP, F, rand() < 0.5 ? 0x4f7a3a : 0x5f8a42, 0, h + s * 0.35, 0, s, s * 0.85, s, 0, 0, 0, 0.06);
  };
  const barrels = (B, F, x, z, n = 3) => {
    for (let k = 0; k < n; k++) {
      const bx = x + (k % 2) * 0.95 - 0.45, bz = z + Math.floor(k / 2) * 0.95;
      B.part(CYL(10), F, 0x7a4a24, bx, 0, bz, 0.9, 1.2, 0.9, 0, 0, 0, 0.06);
      for (const y of [0.22, 0.95]) B.part(CYL(10), F, IRON, bx, y, bz, 0.94, 0.07, 0.94);
    }
    if (n >= 3) { B.part(CYL(10), F, 0x7a4a24, x, 1.2, z + 0.3, 0.9, 1.2, 0.9); B.part(CYL(10), F, IRON, x, 1.95, z + 0.3, 0.94, 0.07, 0.94); }
  };
  // land colour laid flat: a quad strip from (s0..s1) between d0 and d1 m off the pavement on one side, at height y (absolute)
  const patch = (side, s0, s1, d0, d1, y, color, step = 6) => {
    for (let s = s0; s < s1 - 0.01; s += step) {
      const sb = Math.min(s1, s + step), a = P(s, off(side, s, d0)), b = P(sb, off(side, sb, d0)), c = P(sb, off(side, sb, d1)), d = P(s, off(side, s, d1));
      if (Track.mainDistance(c.x, c.z) < widest + d0 - 2 || Track.mainDistance(d.x, d.z) < widest + d0 - 2) continue; // (the road come round close again)
      for (const q of [a, b, c, d]) q.y = y;
      land.quad(a, b, c, d, color, UP);
    }
  };
  // the same between two lats from the road's middle (across it: the moat under a bridge)
  const band = (s0, s1, l0, l1, y, color, step = 6) => {
    for (let s = s0; s < s1 - 0.01; s += step) {
      const sb = Math.min(s1, s + step), a = P(s, l0), b = P(sb, l0), c = P(sb, l1), d = P(s, l1);
      for (const q of [a, b, c, d]) q.y = y;
      land.quad(a, b, c, d, color, UP);
    }
  };

  // ---- the road: cobbles over the whole pavement (a strip of its own, the texture laid by the metre)
  {
    const map = cobbleTexture(), pos = [], uv = [], idx = [];
    let n = 0, joined = false;
    for (let s = S0; s <= S1; s += 2) {
      if (!open(s) && s > S0 + 2 && s < S1 - 2) { joined = false; continue; }
      for (const lat of [Track.lo(s), Track.hi(s)]) { Track.toWorld(s, lat, tmp); pos.push(tmp.x, tmp.y + 0.006, tmp.z); uv.push(lat / 1.7, s / 1.7); }
      if (joined) { const q = (n - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      joined = true; n++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    if (theme.lit) g.computeVertexNormals();
    const mat = new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ map, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    add(g, mat); // (laid on the road: road.js marks it flat)
  }

  // ---- the bridges: stone walls along both edges from the ground up to a parapet over the road, an arch over the moat
  for (const h of humps) {
    const B = at(h.peak), R = 5, CY = -1.5;
    const archAt = (s) => { const d = s - h.peak; return !h.flat && Math.abs(d) < R ? Math.max(0, CY + Math.sqrt(R * R - d * d)) : 0; };
    for (const side of [-1, 1]) {
      const e = (s) => (side < 0 ? Track.lo(s) : Track.hi(s)), outward = (s) => P(s, e(s) + side).sub(P(s, e(s))).setY(0).normalize();
      for (let s = h.from - 4; s < h.to + 4 - 0.01; s += 1) {
        const sb = s + 1, ia = P(s, e(s)), ib = P(sb, e(sb)), oa = P(s, e(s) + side * 0.7), ob = P(sb, e(sb) + side * 0.7);
        const ta = ia.y + 1.0, tb = ib.y + 1.0, ba = archAt(s), bb = archAt(sb), out = outward(s), inn = out.clone().negate();
        const v = (p, y) => new THREE.Vector3(p.x, y, p.z);
        B.quad(v(oa, ba), v(ob, bb), v(ob, tb), v(oa, ta), STONE, out);
        B.quad(v(ia, ba), v(ib, bb), v(ib, tb), v(ia, ta), STONE, inn);
        B.quad(v(ia, ta), v(ib, tb), v(ob, tb), v(oa, ta), CAP, UP);
        if (ba > 0 || bb > 0) B.quad(v(ia, ba), v(ib, bb), v(ob, bb), v(oa, ba), STONE_DARK, DOWN);
      }
      for (const s of [h.from - 4, h.to + 4]) { // (the parapet's ends)
        const i = P(s, e(s)), o = P(s, e(s) + side * 0.7), y = i.y + 1.0, along = P(s + 1, e(s)).sub(i).setY(0).normalize().multiplyScalar(s < h.peak ? -1 : 1);
        B.quad(new THREE.Vector3(i.x, 0, i.z), new THREE.Vector3(o.x, 0, o.z), new THREE.Vector3(o.x, y, o.z), new THREE.Vector3(i.x, y, i.z), STONE, along);
      }
    }
    if (!h.flat) for (let s = h.peak - R; s < h.peak + R - 0.01; s += 1) { // (the vault under the road)
      const sb = s + 1, a = P(s, Track.lo(s)), b = P(sb, Track.lo(sb)), c = P(sb, Track.hi(sb)), d = P(s, Track.hi(s));
      a.y = d.y = archAt(s); b.y = c.y = archAt(sb);
      B.quad(a, b, c, d, STONE_DARK, DOWN);
    }
  }
  // ---- the moat: under each outer bridge right across, and along both side walls between them; a bank of dark earth either side
  const MW = [DW + 8, DW + 20];
  for (const h of moats) {
    band(h.peak - 7, h.peak + 7, -(MW[1] + 1.5), MW[1] + 1.5, 0.05, WATER, 3.5);
    band(h.peak - 8.5, h.peak - 7, -(MW[1] + 1.5), MW[1] + 1.5, 0.04, BANK, 1.5);
    band(h.peak + 7, h.peak + 8.5, -(MW[1] + 1.5), MW[1] + 1.5, 0.04, BANK, 1.5);
  }
  if (moats.length >= 2) {
    const a = moats[0].peak + 8.5, b = moats[moats.length - 1].peak - 8.5;
    for (const side of [-1, 1]) {
      const lat = (d) => side * d;
      band(a, b, lat(MW[0]), lat(MW[1]), 0.05, WATER, 20);
      band(a, b, lat(MW[0] - 1.5), lat(MW[0]), 0.04, BANK, 20);
      band(a, b, lat(MW[1]), lat(MW[1] + 1.5), 0.04, BANK, 20);
    }
  }

  // ---- the gatehouses: a block over the road with its arched way, merlons, two round towers with conical roofs and pennants,
  // banners over the arch; the wall from each tower out to the side walls, a tower at the corner; torches either side
  gates.forEach((g, gi) => {
    const B = at(g), c = P(g, mid(g)), f = P(g + 1, mid(g + 1)).sub(P(g - 1, mid(g - 1)));
    const turn = Math.atan2(f.x, f.z), F = frameAt(c.x, c.y, c.z, turn);
    const opening = half(g) * 2 + 1.6, T = 3.2, w = opening + 2 * T, spring = 6.5, H = spring + opening / 2 + 3;
    B.part(gatehouse(w, H, GD, opening, spring), F, STONE, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0);
    B.part(BOX, F, STONE_DARK, 0, -1.2, 0, w, 1.2, GD + 0.4); // (its footing)
    const m = Math.round(w / 2.4);
    for (let k = 0; k < m; k++) for (const z of [-GD / 2 + 0.45, GD / 2 - 0.45]) B.part(BOX, F, STONE, -w / 2 + (k + 0.5) * w / m, H, z, 1.2, 1.3, 0.9);
    const colours = [pick(CLOTH), pick(CLOTH)];
    for (const z of [-GD / 2 - 0.09, GD / 2 + 0.05]) { // (three banners over the arch, each face)
      [-0.55, 0, 0.55].forEach((k, j) => B.part(BANNER, F, colours[j % 2], k * opening / 2, H - 0.4, z, 1.8, 2.5, 1));
    }
    for (const sx of [-1, 1]) {
      const tx = sx * (w / 2 + 1.5), tw = new THREE.Vector3(tx, 0, 0).applyMatrix4(F);
      tower(B, tw.x, c.y, tw.z, 4.6, H + 4, gi === 1 ? TILE : SLATE);
    }
    for (const side of [-1, 1]) {
      const start = P(g, mid(g) + side * (w / 2 + 6)), end = P(g, mid(g) + side * DW);
      start.y = end.y = 0;
      wallRun(B, start, end);
      tower(B, end.x, 0, end.z, 4.2, 12, SLATE, rand() < 0.6);
      for (const d of [-GD / 2 - 3, GD / 2 + 3]) if (open(g + d)) torch(g + d, side, 0.7);
    }
  });
  // ---- the town's side walls, between the outer gates, a round tower every 70 m (where the road does not come back close)
  if (gates.length >= 2) {
    for (const side of [-1, 1]) {
      let next = town[0] + 70;
      for (let s = town[0]; s < town[1] - 0.01; s += 10) {
        const sb = Math.min(town[1], s + 10), a = P(s, side * DW), b = P(sb, side * DW);
        if (Track.mainDistance(a.x, a.z) < DW - 4 || Track.mainDistance(b.x, b.z) < DW - 4) continue;
        a.y = b.y = 0;
        wallRun(at(s), a, b);
        if (sb >= next && sb < town[1] - 20) { tower(at(s), b.x, 0, b.z, 3.8, 11, rand() < 0.5 ? SLATE : TILE, rand() < 0.5); next += 70; }
      }
    }
  }

  // ---- the houses: timber-framed, their upper floors jettied out over the street, plaster in five colours, steep roofs of tile,
  // thatch or slate, some gabled to the street; a second row of plainer ones behind; their fronts 3.2 m off the pavement
  const house = (s, side, d0, w, dep, frontRow) => {
    const c = P(s, off(side, s, d0 + dep / 2)), r = P(s, mid(s)).sub(c).setY(0).normalize(), B = at(s);
    const F = frameAt(c.x, 0, c.z, Math.atan2(r.x, r.z)), plaster = pick(PLASTER), roof = pick(ROOFS);
    if (!frontRow) { // (behind: a block and its roof)
      const hh = 5.5 + rand() * 3.5;
      B.part(BOX, F, plaster, 0, -0.5, 0, w, hh + 0.5, dep, 0, 0, 0, 0.05);
      B.part(PRISM, F, roof, 0, hh, 0, dep + 0.8, 3 + rand() * 2, w + 0.6, 0, Math.PI / 2, 0, 0.05);
      return;
    }
    const stoneFloor = rand() < 0.4, tall = rand() < 0.35, gable = rand() < 0.45;
    B.part(BOX, F, stoneFloor ? STONE : plaster, 0, -0.5, 0, w - 0.1, 4.0, dep - 0.1, 0, 0, 0, 0.04);
    const floors = tall ? 2 : 1;
    let top = 3.5, front = dep / 2;
    for (let k = 0; k < floors; k++) {
      const jut = 0.35 * (k + 1), dd = dep + jut * 2;
      B.part(BOX, F, plaster, 0, top, jut, w, 2.7, dd, 0, 0, 0, 0.03);
      front = dd / 2 + jut;
      facade(F, -w / 2, w / 2, top, top + 2.7, front + 0.04, plaster, Math.max(1, Math.round(w / 2.4))); // (the timber frame and the windows: a picture)
      top += 2.7;
    }
    const zg = (dep - 0.1) / 2 + 0.02, door = (rand() - 0.5) * (w - 2.4);
    B.part(BOX, F, 0x5a3a22, door, 0.5, zg, 1.1, 2.1, 0.12);
    if (rand() < 0.5) B.part(BOX, F, 0x2b2a2e, door > 0 ? door - 2.0 : door + 2.0, 1.6, zg, 1.0, 0.9, 0.12);
    const rh = 3.2 + rand() * 1.8; // (the roof over the top floor)
    const depth = dep + 0.7 * floors;
    if (gable) {
      B.part(PRISM, F, roof, 0, top, 0.35 * floors, w + 0.6, rh, depth + 1.0, 0, 0, 0, 0.04);
      B.part(BOX, F, TIMBER, 0, top, 0.35 * floors + depth / 2 + 0.5 + 0.03, 0.18, rh * 0.72, 0.12);
    } else B.part(PRISM, F, roof, 0, top, 0.35 * floors, depth + 1.0, rh, w + 0.6, 0, Math.PI / 2, 0, 0.04);
    if (rand() < 0.6) B.part(BOX, F, 0x8a7a68, w * 0.28, top + rh * 0.35, 0.35 * floors - 0.9, 0.7, rh * 0.75 + 0.6, 0.7); // (a chimney)
  };
  const MARKET = gates.length >= 3 ? (gates[0] + gates[1]) / 2 : (town[0] + town[1]) / 2;
  const CHURCH = gates.length >= 3 ? (gates[1] + gates[2]) / 2 : null;
  const street = (s) => inTown(s) && open(s) && !nearGate(s, 32) && !onHump(s, 6);
  if (gates.length >= 2) {
    for (const side of [-1, 1]) {
      for (let s = town[0] + 32; s < town[1] - 32;) {
        const w = 6 + rand() * 3.5, mid0 = s + w / 2;
        if (!street(s) || !street(s + w)) { s += 4; continue; }
        const square = Math.abs(mid0 - MARKET) < 48, church = CHURCH !== null && side < 0 && Math.abs(mid0 - CHURCH) < 20;
        if (!church) house(mid0, side, square ? 24 : 3.2, w, 7 + rand() * 2, true);
        if (!square && !church && rand() < 0.55) house(mid0 + (rand() - 0.5) * 2, side, 15 + rand() * 3, w * (0.8 + rand() * 0.4), 7 + rand() * 3, false);
        s += w + (rand() < 0.15 ? 2.5 + rand() * 3 : 0.3);
      }
      // the pavement, pale stone, from the first gate to the last
      for (const [a, b] of [[town[0] - 30, town[1] + 30]]) {
        let from = null;
        for (let s = a; s <= b; s += 2) {
          const ok = open(s) && !onHump(s, 1);
          if (ok && from === null) from = s;
          if ((!ok || s + 2 > b) && from !== null) { if (s - from > 4) patch(side, from, s, 0, 2.6, 0.03, PAVING, 4); from = null; }
        }
      }
      // trees in the gardens behind, between the houses and the wall
      for (let s = town[0] + 40; s < town[1] - 40; s += 16 + rand() * 20) {
        if (nearGate(s, 30) || rand() < 0.3) continue;
        const p = P(s, off(side, s, 32 + rand() * 18));
        if (free(p.x, p.z, 4)) tree(at(s), p.x, p.z);
      }
    }
    // the torches along the street, by turns either side
    let k = 0;
    for (let s = town[0] + 36; s < town[1] - 36; s += 30, k++) if (street(s)) torch(s, k % 2 ? 1 : -1, 1.0);
  }
  // ---- the market square: paving out to the houses set back round it, a well, stalls under striped awnings, barrels, banner posts
  if (gates.length >= 2) {
    const B = at(MARKET);
    for (const side of [-1, 1]) patch(side, MARKET - 46, MARKET + 46, 2.6, 24, 0.03, SQUARE, 4);
    { // the well
      const s = MARKET + 10, p = P(s, off(-1, s, 11)), F = frameAt(p.x, 0, p.z, 0.4);
      B.part(CYL(12), F, STONE, 0, 0, 0, 3.0, 1.0, 3.0, 0, 0, 0, 0.03);
      B.part(CYL(12), F, 0x2c4a52, 0, 1.0, 0, 2.4, 0.02, 2.4);
      for (const x of [-1.35, 1.35]) B.part(BOX, F, TIMBER, x, 0.9, 0, 0.2, 2.2, 0.2);
      B.part(BOX, F, TIMBER, 0, 2.6, 0, 3.0, 0.12, 0.12);
      B.part(PRISM, F, TILE, 0, 3.0, 0, 3.4, 1.0, 1.8, 0, Math.PI / 2, 0);
      B.part(CYL(8), F, 0x6a4a2a, 0.3, 1.9, 0, 0.45, 0.45, 0.45);
    }
    [-28, -14, 0, 14].forEach((ds, j) => { // the stalls, on the right
      const s = MARKET + ds, p = P(s, off(1, s, 8 + (j % 2) * 4)), r = P(s, mid(s)).sub(p).setY(0).normalize(), F = frameAt(p.x, 0, p.z, Math.atan2(r.x, r.z));
      const c = CLOTH[j % 5];
      for (const [x, z] of [[-1.5, -0.9], [1.5, -0.9], [-1.5, 0.9], [1.5, 0.9]]) B.part(BOX, F, TIMBER, x, 0, z, 0.12, 2.4, 0.12);
      B.part(BOX, F, 0x8a6a44, 0, 0, 0.2, 3.0, 0.9, 1.4);
      for (let k = 0; k < 4; k++) B.part(BOX, F, k % 2 ? 0xf2ede2 : c, -1.125 + k * 0.75, 2.4, 0.15, 0.75, 0.08, 2.4, 0.18, 0, 0);
      for (let k = 0; k < 5; k++) B.part(LUMP, F, [0xc8452a, 0xe0a02a, 0x6a9a3a, 0x9a3a5a][(k + j) % 4], -1.1 + k * 0.55, 1.05, 0.25, 0.42, 0.32, 0.42);
      barrels(B, F, 2.2, -0.2, 2);
    });
    for (const [ds, side] of [[-40, -1], [40, 1], [-8, -1]]) { // the banner posts
      const s = MARKET + ds, p = P(s, off(side, s, 5)), r = P(s, mid(s)).sub(p).setY(0).normalize(), F = frameAt(p.x, 0, p.z, Math.atan2(r.x, r.z) + Math.PI / 2);
      B.part(BOX, F, TIMBER, 0, 0, 0, 0.22, 7.2, 0.22);
      B.part(BOX, F, TIMBER, 0.6, 6.6, 0, 1.6, 0.14, 0.14);
      B.part(BANNER, F, pick(CLOTH), 0.75, 6.55, 0.03, 1.1, 2.8, 1);
      B.part(PENNANT, F, pick(CLOTH), 0.05, 6.9, 0, 2.4, 0.8, 1);
    }
    { const s = MARKET - 20, p = P(s, off(-1, s, 6)), F = frameAt(p.x, 0, p.z, 1.1); barrels(B, F, 0, 0, 4); }
  }
  // ---- the church of the upper town, set back on the left: a nave and a tower with its spire
  if (CHURCH !== null) {
    const s = CHURCH, c = P(s, off(-1, s, 16)), r = P(s, mid(s)).sub(c).setY(0).normalize(), F = frameAt(c.x, 0, c.z, Math.atan2(r.x, r.z)), B = at(s);
    B.part(BOX, F, STONE, 0, -0.5, -4, 11, 12, 24, 0, 0, 0, 0.03);
    B.part(PRISM, F, SLATE, 0, 11.5, -4, 12, 6, 25);
    B.part(BOX, F, STONE, 0, -0.5, 9.5, 6.5, 24, 6.5);
    B.part(CONE(4), F, SLATE, 0, 23.5, 9.5, 8.6, 16, 8.6, 0, Math.PI / 4, 0);
    for (const x of [-3.26, 3.26]) B.part(BOX, F, 0x2c2a28, x, 16, 9.5, 0.12, 2.6, 1.0);
    B.part(BOX, F, 0x2c2a28, 0, 16, 12.76, 1.0, 2.6, 0.12);
  }

  // ---- the fields: strips across the land (beyond the moat by the town), wheat, barley, green crops, plough, fallow, pasture;
  // haystacks on the harvested ones, a tree now and then at a strip's end
  for (const side of [-1, 1]) {
    for (let s = S0 + 4; s < S1 - 6;) {
      const w = 9 + rand() * 5, sb = Math.min(S1 - 2, s + w);
      const byTown = s > town[0] - 70 && sb < town[1] + 70 && gates.length >= 2, near = humps.some(h => sb > h.peak - 12 && s < h.peak + 12);
      if (!near) {
        const d0 = byTown ? DW + 24 - half(s) : 8, d1 = d0 + 50 + rand() * 80, crop = pick(CROPS);
        patch(side, s, sb - 0.8, d0, d1, 0.02, crop, 20);
        if ((crop === CROPS[0] || crop === CROPS[6] || crop === CROPS[1]) && rand() < 0.45) {
          for (let k = 0, n = 1 + Math.floor(rand() * 2); k < n; k++) {
            const ss = s + 2 + rand() * (w - 4), p = P(ss, off(side, ss, d0 + 4 + rand() * (d1 - d0 - 8)));
            if (free(p.x, p.z, 2)) haystack(at(ss), p.x, p.z, 0.85 + rand() * 0.3);
          }
        }
        if (rand() < 0.12) { const p = P(sb, off(side, sb, d1 + 3)); if (free(p.x, p.z, 4)) tree(at(sb), p.x, p.z); }
      }
      s = sb;
    }
  }

  // ---- the windmills: in the fields at either end, their sails turning (a mesh each, turned as it is drawn)
  for (const [f, side] of [[0.085, 1], [0.84, -1]]) {
    const s = S0 + LEN * f;
    if (inTown(s) && gates.length >= 2) continue;
    const p = P(s, off(side, s, 34));
    if (!free(p.x, p.z, 8)) continue;
    const r = P(s, mid(s)).sub(p).setY(0).normalize(), turn = Math.atan2(r.x, r.z), F = frameAt(p.x, 0, p.z, turn), B = at(s);
    B.part(CYL(8, 0.72), F, 0xe9e2d2, 0, -0.5, 0, 6.4, 12.5, 6.4, 0, 0, 0, 0.02);
    B.part(CONE(8), F, 0x6b4a35, 0, 12, 0, 5.6, 3.8, 5.6);
    B.part(BOX, F, 0x5a3a22, 0, 0, 3.0, 1.2, 2.3, 0.3, -0.12, 0, 0);
    B.part(BOX, F, 0x2b2a2e, 0, 6.5, 2.65, 0.8, 1.0, 0.25, -0.1, 0, 0);
    B.part(BOX, F, TIMBER, 0, 12.3, 2.0, 0.4, 0.4, 3.2);
    const sails = new Batch(rand), O = new THREE.Matrix4();
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      sails.part(BOX, O, TIMBER, 0, 0, 0, 0.3, 9.5, 0.25, 0, 0, a);
      const ax = -Math.sin(a), ay = Math.cos(a), bx = Math.cos(a), by = Math.sin(a); // (along the arm, and across it)
      sails.part(BOX, O, 0xe6dccb, ax * 2.2 + bx * 0.95, ay * 2.2 + by * 0.95, 0.05, 1.5, 7.0, 0.06, 0, 0, a);
    }
    sails.part(CYL(8), O, TIMBER, 0, 0, -0.4, 0.8, 0.9, 0.8, Math.PI / 2, 0, 0);
    const mesh = sails.mesh(solidMat), hub = new THREE.Vector3(0, 12.3, 3.7).applyMatrix4(F);
    mesh.position.copy(hub);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = turn;
    const spin = 0.55 + rand() * 0.2, phase = rand() * 6.28;
    mesh.onBeforeRender = () => { mesh.rotation.z = phase - performance.now() * 0.001 * spin; mesh.updateMatrixWorld(); }; // (scenery has no frame call of its own)
    levelGroup.add(mesh);
    for (let k = 0; k < 3; k++) { const q = P(s + (rand() - 0.5) * 30, off(side, s, 44 + rand() * 20)); if (free(q.x, q.z, 3)) haystack(B, q.x, q.z); }
  }
  // a few clumps of trees out in the fields
  for (let s = S0 + 120; s < S1 - 60; s += 140 + rand() * 120) {
    if (inTown(s) && gates.length >= 2) continue;
    const side = rand() < 0.5 ? -1 : 1, d = 30 + rand() * 60;
    for (let k = 0, n = 3 + Math.floor(rand() * 4); k < n; k++) {
      const ss = s + (rand() - 0.5) * 24, p = P(ss, off(side, ss, d + (rand() - 0.5) * 16));
      if (free(p.x, p.z, 4)) tree(at(ss), p.x, p.z);
    }
  }

  // ---- the castle on its hill: on the left toward the end (else wherever there is room), a grassy hill with a curtain wall of
  // eight sides round it, a tower at every corner with its conical roof, the keep in the middle with its turrets, pennants flying
  {
    let spot = null;
    for (const [f, side, d] of [[0.9, -1, 165], [0.9, 1, 165], [0.8, -1, 180], [0.8, 1, 180], [0.6, -1, 220], [0.6, 1, 220]]) {
      const s = S0 + LEN * f, p = P(s, side * d);
      if (Track.mainDistance(p.x, p.z) > d - 10 && offRoads(p.x, p.z, 100)) { spot = p; break; }
    }
    if (spot) {
      const F = frameAt(spot.x, 0, spot.z, rand() * 6.28), top = 30;
      far.part(CYL(14, 0.42), F, 0x6f9850, 0, -1, 0, 180, top + 1, 180, 0, 0, 0, 0.04);
      far.part(CYL(10, 0.5), F, 0x79a056, 46, -1, 26, 120, 15, 104, 0, 0.3, 0);
      far.part(CYL(12), F, 0x8a8572, 0, top - 0.5, 0, 72, 1, 72); // (the hilltop's crown of rock)
      const R = 30, corners = [];
      for (let k = 0; k < 8; k++) corners.push(new THREE.Vector3(Math.sin(k * Math.PI / 4) * R, 0, Math.cos(k * Math.PI / 4) * R).applyMatrix4(F));
      for (let k = 0; k < 8; k++) wallRun(far, corners[k], corners[(k + 1) % 8], top, 9);
      corners.forEach((q, k) => tower(far, q.x, top, q.z, k % 2 ? 3.8 : 4.8, k % 2 ? 14 : 17, k % 2 ? TILE : SLATE));
      far.part(BOX, F, STONE, 0, top, 0, 18, 26, 22, 0, 0, 0, 0.02);
      for (const [x, z] of [[-9, -11], [9, -11], [-9, 11], [9, 11]]) {
        far.part(CYL(10), F, STONE, x, top + 20, z, 4.4, 12, 4.4);
        far.part(CONE(10), F, SLATE, x, top + 32, z, 5.4, 6, 5.4);
        far.part(BOX, F, IRON, x, top + 37.5, z, 0.16, 3.4, 0.16);
        far.part(PENNANT, F, pick(CLOTH), x + 0.08, top + 39.6, z, 3.4, 1.2, 1);
      }
      for (let k = 0; k < 7; k++) for (const z of [-10.6, 10.6]) far.part(BOX, F, STONE, -7.7 + k * 2.56, top + 26, z, 1.3, 1.4, 0.8);
      for (let k = 0; k < 8; k++) for (const x of [-8.6, 8.6]) far.part(BOX, F, STONE, x, top + 26, -8.9 + k * 2.54, 0.8, 1.4, 1.3);
      far.part(BOX, F, IRON, 0, top + 27, 0, 0.3, 9, 0.3);
      far.part(PENNANT, F, CLOTH[0], 0.15, top + 33.5, 0, 6, 2.3, 1);
      for (let k = 0; k < 6; k++) far.part(BOX, F, 0x2c2a28, -6 + k * 2.4, top + 16, 11.03, 0.5, 1.6, 0.1); // (the keep's windows)
    }
  }

  // ---- into the level: a mesh a stretch, the flames, the land, the castle
  for (const B of solids) if (B && !B.empty) levelGroup.add(B.mesh(solidMat));
  if (!glow.empty) levelGroup.add(glow.mesh(new THREE.MeshBasicMaterial({ vertexColors: true })));
  if (!land.empty) { const m = land.mesh(new (theme.lit ? THREE.MeshLambertMaterial : THREE.MeshBasicMaterial)({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.userData.flat = true; levelGroup.add(m); }
  if (!far.empty) levelGroup.add(far.mesh(solidMat));
  if (face.p.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(face.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(face.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(face.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(face.c, 3));
    levelGroup.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: timberTexture(), vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  }
};
