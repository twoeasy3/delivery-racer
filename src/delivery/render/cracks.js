// ---- CRACKED GLASS (the owner, 16-Oct: "Lets explore adding a cracked glass texture to the front and back windows on damage model"; then
// "Let's change this to all players next round": ON by default, CHECKLIST 484; src/delivery/CRACKED-GLASS-NOTES.md) ---------------------
// The player's car's WINDSCREEN and REAR WINDOW crack as it is damaged, in three looks on the dents' stages (CONFIG.dents.steps, render/dents.js):
// a hairline star from an impact point at the first stage, a spreading web at the second and third, the glass shattered (a dense web, frosted
// cells, a chunk knocked out beside the impact) at the last. Render only: the damage share is the one render/items.js already dents the car by.
//   (default)          cracks from the real damage
//   ?crack=off / 0     no cracks (the game as it was before 484)
//   ?crack=<1-100>     every car shown cracked (and dented, and scorched) as at that share of damage, for a visit (a picture, a look)
// Also in the model editor and the inspector (render/inspectmodel.js damageModel: their Damage buttons).
// HOW: the two windows are found as the tools find them (render/modelpatch.js extractParts: cabinGlass's panes, else a hand-built window's
// panels, named by which way they face: render/screens.js; the audit scripts/windscreen-audit.mjs measures every car). Each gets an OVERLAY:
// a copy of the pane's own outer triangles (so its outline is the pane's exactly: crisp edges, no overhang) lifted LIFT off it along the pane's
// outward normal, a child of the glass mesh (it rides the body), drawn in one shared material per stage over ONE shared 256 x 256 texture drawn
// in code (no image file): R the line's brightness, G / B / A the coverage at stage 1 / 2 / 3, so a stage is a channel and the cracks of a
// later stage grow out of the earlier ones. Both windows are ONE mesh (one draw call a car). The texture is mapped on the pane in metres with
// the impact point seeded by the car and the window (a different spot, turn and size on each), so no two windows crack alike.
// A CANOPY (a bubble, a dome, a rounded glasshouse: one glass piece facing every way, the audit's 'ambiguous'; CHECKLIST 484): where no pane
// faces that way (or only a much smaller one, or one well under the canopy: a lamp's glass), the canopy's own triangles that face it (front
// or rear, not up, not down, not sideways) are the window (canopyFacing).
// A model's tag `userData.window = 'canopy'` makes a glass mesh a canopy, 'none' keeps it from ever cracking (on the mesh or its material).
// Glass outside every pane of a cabinGlass mesh (the Glass-Hatch Brake's hatch) is measured as a pane of its own.
// Not drawn: on side windows ever, on a blacked-out car (silhouette.js: userData.blackout 'hide'), on the ghost power (hidden). A new car (full health) is clean.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { extractParts } from './modelpatch.js';
import { paneFacing, paneTriangles, outward, cabinMiddle, zRefOf, screenShares, paneHidden, faceOf } from './screens.js';

// ?crack's value -> { on, force }: on unless 'off' or 0; a number above 0 forces that share (null: the real damage)
export const crackParam = (param) => {
  const num = param !== null && param !== undefined && /^\d+(\.\d+)?$/.test(param) ? +param : null;
  return { on: param !== 'off' && num !== 0, force: num ? Math.min(100, num) / 100 : null };
};
const asked = crackParam(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('crack') : null);
export const CRACK = {
  on: asked.on,       // (on unless ?crack=off or ?crack=0)
  force: asked.force, // (?crack=<n>: that share, every frame)
  lift: 0.004,   // m off the glass (the decals' 3 to 6 mm)
  size: 256,     // px a side, the one texture
  alpha: [0, 0.42, 0.52, 0.62], // the lines' opacity at each stage (hairline, web, shattered): see crackMaterial
};
// the share of damage the cracks show (null: none asked for)
export const crackShare = (share) => (CRACK.force ?? (CRACK.on ? share : null));
// the look for a share of damage: 0 clean, 1 hairline, 2 web, 3 shattered (the dents' stages 1, 2-3, 4)
export const crackStage = (share) => [0, 1, 2, 2, 3][CONFIG.dents.steps.filter(s => share >= s).length];

// ---- the texture, drawn once --------------------------------------------------------------------------------------------------------
const rand = (seed) => () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// the crack pattern, around the middle (0, 0) of a square of half-width 1: polylines with the stage they appear at, filled cells (frost), the hole
export const crackPattern = (seed = 0xc4ac) => {
  const r = rand(seed), lines = [], cells = [], TAU = Math.PI * 2;
  const n = 8 + Math.floor(r() * 3), rays = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i + 0.15 + r() * 0.7) / n * TAU;
    // a jagged, wandering ray: points every ~0.05, its length by stage (a hairline star: some rays only; then long; then to the edge)
    const len = [0, r() < 0.7 ? 0.07 + r() * 0.16 : 0.02, 0.28 + r() * 0.34, 1.3];
    let a = a0, x = 0, y = 0;
    const pts = [[0, 0, 1]];
    for (let s = 1; s <= 3; s++) {
      while (Math.hypot(x, y) < len[s]) {
        a += (r() - 0.5) * 0.55; a += (a0 - a) * 0.12;
        const step = 0.03 + r() * 0.045;
        x += Math.cos(a) * step; y += Math.sin(a) * step;
        pts.push([x, y, s]);
      }
    }
    rays.push({ a0, pts });
    for (let k = 1; k < pts.length; k++) lines.push({ a: pts[k - 1], b: pts[k], stage: pts[k][2] });
    // branches off the ray (stage 2 and 3), forking outward
    for (let k = 3; k < pts.length - 2; k += 3 + Math.floor(r() * 4)) {
      if (r() < 0.4) continue;
      const st = Math.max(2, pts[k][2]);
      let bx = pts[k][0], by = pts[k][1], ba = Math.atan2(by, bx) + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.45);
      const blen = 0.06 + r() * (st === 2 ? 0.12 : 0.26);
      for (let d = 0; d < blen;) { const step = 0.025 + r() * 0.03; const nx = bx + Math.cos(ba) * step, ny = by + Math.sin(ba) * step; lines.push({ a: [bx, by], b: [nx, ny], stage: st }); bx = nx; by = ny; ba += (r() - 0.5) * 0.6; d += step; }
    }
  }
  // the rings: broken chords between neighbouring rays (the crushed ring at the impact at once; a few more as it spreads; more when shattered)
  const at = (ray, rad) => { const p = ray.pts.find(q => Math.hypot(q[0], q[1]) >= rad); return p ? [p[0], p[1]] : null; };
  const rings = [[0.035, 1, 0.9], [0.09, 2, 0.5], [0.17, 2, 0.3], [0.26, 3, 0.55], [0.4, 3, 0.4], [0.58, 3, 0.35], [0.8, 3, 0.3]];
  for (const [rad, stage, p] of rings) {
    for (let i = 0; i < n; i++) {
      if (r() > p) continue;
      const j = (i + 1) % n, A = at(rays[i], rad * (0.85 + r() * 0.3)), B = at(rays[j], rad * (0.85 + r() * 0.3));
      if (!A || !B) continue;
      const mid = [(A[0] + B[0]) / 2 * (1.0 + r() * 0.1) + (r() - 0.5) * 0.02, (A[1] + B[1]) / 2 * (1.0 + r() * 0.1) + (r() - 0.5) * 0.02];
      lines.push({ a: A, b: mid, stage }, { a: mid, b: B, stage });
      if (stage === 3 && rad < 0.2 && r() < 0.4) { // (a frosted cell of the shattered glass, near the impact)
        const C = at(rays[i], rad * 1.4), D = at(rays[j], rad * 1.4);
        if (C && D) cells.push([A, mid, B, D, C]);
      }
    }
  }
  // the crazing of shattered glass (stage 3): a mosaic near the impact, each of a scatter of points joined to its two nearest
  const dots = [];
  for (let k = 0; k < 80; k++) { const rad = 0.03 + Math.pow(r(), 1.3) * 0.5, a = r() * TAU; dots.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
  for (const A of dots) {
    const near = dots.filter(B => B !== A).sort((p, q) => Math.hypot(p[0] - A[0], p[1] - A[1]) - Math.hypot(q[0] - A[0], q[1] - A[1])).slice(0, 2);
    for (const B of near) if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 0.13) lines.push({ a: A, b: B, stage: 3 });
  }
  // a chunk knocked out beside the impact (stage 3): a jagged hole
  const ha = r() * TAU, hc = [Math.cos(ha) * 0.1, Math.sin(ha) * 0.1], hole = [];
  for (let k = 0; k < 11; k++) { const t = k / 11 * TAU, rr = 0.05 + r() * 0.045; hole.push([hc[0] + Math.cos(t) * rr, hc[1] + Math.sin(t) * rr]); }
  return { lines, cells, hole };
};
let texture = null;
export const crackTexture = () => {
  if (texture) return texture;
  const S = CRACK.size, data = new Uint8Array(S * S * 4);
  const doc = typeof document !== 'undefined' ? document : null;
  const canvas = (doc && doc.createElement('canvas'));
  const ctx = canvas?.getContext?.('2d', { willReadFrequently: true });
  if (ctx) {
    canvas.width = canvas.height = S;
    const { lines, cells, hole } = crackPattern();
    const px = ([x, y]) => [S / 2 + x * S / 2, S / 2 - y * S / 2];
    const stroke = (list, width, shade) => { ctx.strokeStyle = shade; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); for (const l of list) { ctx.moveTo(...px(l.a)); ctx.lineTo(...px(l.b)); } ctx.stroke(); };
    const fill = (poly, shade) => { ctx.fillStyle = shade; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p)))); ctx.closePath(); ctx.fill(); };
    const read = (k) => { const img = ctx.getImageData(0, 0, S, S).data; if (img.length !== S * S * 4) return false; for (let i = 0; i < S * S; i++) data[i * 4 + k] = img[i * 4]; return true; };
    const blank = () => { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S); };
    let ok = true;
    // the coverage, stage by stage (G, B, A): the fine dark edge (1.7 px) round each line, the frost and the hole at the last
    for (const stage of [1, 2, 3]) {
      blank();
      const mine = lines.filter(l => l.stage <= stage);
      if (stage === 3) { for (const c of cells) fill(c, '#2c2c2c'); fill(hole, '#f0f0f0'); }
      stroke(mine, 1.7, '#ffffff');
      if (stage === 1) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S / 2, S / 2, 3.2, 0, Math.PI * 2); ctx.fill(); }
      ok = read(stage) && ok;
    }
    // the brightness (R): the frost milky, the hole dark (its rim bright), the lines' light core (0.8 px, over the hole too: shards), the impact's crushed white dot
    blank();
    for (const c of cells) fill(c, '#c8c8c8');
    fill(hole, '#000');
    stroke(lines, 0.8, '#ffffff');
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S / 2, S / 2, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1.2; ctx.beginPath(); hole.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p)))); ctx.closePath(); ctx.stroke();
    ok = read(0) && ok;
    if (!ok) data.fill(0);
  }
  texture = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.userData.shared = true;
  return texture;
};
// the material of a stage: unlit, the line white-grey over its faint dark edge, see-through elsewhere, never writing depth, pulled forward
const materials = [];
export const crackMaterial = (stage) => {
  if (materials[stage]) return materials[stage];
  const m = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  m.defines = { CRACK_STAGE: stage, CRACK_ALPHA: CRACK.alpha[stage].toFixed(2) };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec4 ck = texture2D( map, vMapUv );
      float cover = CRACK_STAGE == 1 ? ck.g : CRACK_STAGE == 2 ? ck.b : ck.a;
      // (the owner, 16-Oct: "The cracks contrast too well": cracks IN the glass, not white drawn on it. A soft grey-white line over a fine dark edge,
      // at CRACK.alpha of full (the hairline the faintest, the mosaic the strongest), so the glass's own tint shows through; no boost far off:
      // subtle at a distance, clear up close)
      diffuseColor = vec4( mix( vec3( 0.015, 0.018, 0.024 ), vec3( 0.76, 0.79, 0.82 ), ck.r ), diffuseColor.a * cover * CRACK_ALPHA );`);
  };
  m.customProgramCacheKey = () => 'crack' + stage;
  m.userData.shared = true;
  m.userData.blackout = 'hide'; // (render/silhouette.js: not drawn on a blacked-out car)
  materials[stage] = m;
  return m;
};

// ---- the two windows of a model ---------------------------------------------------------------------------------------------------
const MIN_AREA = 0.03; // m2 (as the audit)
// (kept beside the model, not in its userData: a model's userData is copied as JSON when it is cloned, and a mesh in it would read as a hook)
const SCREENS = new WeakMap(), OVERLAY = new WeakMap(), BUILD_MS = new WeakMap();
export const crackInfo = (model) => ({ screens: SCREENS.get(model) || null, overlay: OVERLAY.get(model) ?? null, ms: BUILD_MS.get(model) ?? null });
// A CANOPY's window that way: its triangles facing `dir` (faceOf: front or rear, not side, roof or floor) and not down, their outward normal
// taken from the canopy's own middle as paneFacing does -> a facing of those alone ({ area, centre, normal, share, face, box, tris }), or null
const CANOPY_SHARE = 0.08;  // the least share of a canopy facing that way to crack it there
const CANOPY_DOWN = -0.1;   // a triangle whose outward normal leans down more than this is under the canopy's rim (in the body)
const CANOPY_TOP = 0.92;    // ... or up more than this is the canopy's top (a roof, about 23 degrees off flat), not its screen
const CANOPY_OVER = 3;      // a canopy's screen this many times a found pane's area wins (a small pane facing that way: a lamp's glass, a visor)
const CANOPY_LOW = 0.3;     // m: ... or a bigger canopy's screen when the pane found sits this far under it
const cn = new THREE.Vector3(), cc = new THREE.Vector3();
const canopyKeeps = (n, dir) => faceOf(n) === dir && n.y > CANOPY_DOWN && n.y < CANOPY_TOP;
export const canopyFacing = (e, dir) => {
  const middle = e.pane.middle ? new THREE.Vector3().fromArray(e.pane.middle) : e.facing.box.getCenter(new THREE.Vector3());
  const box = new THREE.Box3(), normal = new THREE.Vector3(), centre = new THREE.Vector3();
  let area = 0, tris = 0;
  paneTriangles(e.node, e.toModel, e.pane, (a, b, c) => {
    const s = outward(a, b, c, e.zRef, cn, middle);
    if (!s || !canopyKeeps(cn, dir)) return;
    tris++; area += s;
    normal.addScaledVector(cn, s);
    centre.addScaledVector(cc.addVectors(a, b).add(c).divideScalar(3), s);
    box.expandByPoint(a); box.expandByPoint(b); box.expandByPoint(c);
  });
  if (!area || normal.lengthSq() === 0) return null;
  const share = { front: 0, rear: 0, side: 0, roof: 0, floor: 0 };
  share[dir] = 1;
  return { area, centre: centre.divideScalar(area), normal: normal.normalize(), share, face: dir, box, tris, canopy: dir, middle };
};
// -> { windscreen: [{ node, pane, facing }...], rear: [...] } (a split screen: both halves), measured once and kept on the model
export const screensOf = (model) => {
  if (SCREENS.has(model)) return SCREENS.get(model);
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const { parts, nodes, panes } = extractParts(model);
  const carBox = new THREE.Box3().setFromObject(model).applyMatrix4(inv);
  const list = [];
  for (const row of parts) {
    const node = nodes.get(row.id);
    if (!row.window || !node?.isMesh || !node.visible || node.isInstancedMesh || !node.geometry?.attributes.position) continue;
    const toModel = new THREE.Matrix4().multiplyMatrices(inv, node.matrixWorld);
    for (const pane of panes.get(row.id) || []) list.push({ node, toModel, pane });
  }
  const zCar = cabinMiddle(list, carBox), zOf = new Map();
  for (const e of list) {
    if (!zOf.has(e.node)) zOf.set(e.node, zRefOf(list, e.node, zCar));
    e.zRef = zOf.get(e.node);
    e.facing = paneFacing(e.node, e.toModel, e.pane, e.zRef);
    const sh = screenShares(e.facing, e.zRef);
    if (sh.reverse) e.facing = { ...e.facing, share: sh, face: 'rear' };
    const tag = e.node.userData.window || e.pane.window || [].concat(e.node.material)[0]?.userData?.window; // (on a material: a glass-coloured part merged by material, the Junker's bumpers)
    if (tag === 'canopy') e.facing = { ...e.facing, face: 'mixed' };
    else if (tag === 'none') e.facing = { ...e.facing, face: 'none' };
    else if (tag) e.facing = { ...e.facing, face: tag === 'windscreen' ? 'front' : 'rear' };
  }
  // (glass a cabinGlass mesh holds outside every pane, the Glass-Hatch Brake's hatch: a pane of its own here, judged against its mesh's cabin)
  for (const node of new Set(list.map(e => e.node))) {
    const ps = list.filter(e => e.node === node);
    if (ps.some(e => e.pane.kind === 'hand' || !Number.isFinite(e.pane.start))) continue;
    const cover = new Uint8Array(node.geometry.attributes.position.count);
    for (const e of ps) cover.fill(1, e.pane.start, e.pane.start + e.pane.count);
    for (let i = 0; i < cover.length;) {
      if (cover[i]) { i++; continue; }
      let j = i; while (j < cover.length && !cover[j]) j++;
      const e = { node, toModel: ps[0].toModel, pane: { start: i, count: j - i }, zRef: ps[0].zRef };
      e.facing = paneFacing(node, e.toModel, e.pane, e.zRef);
      list.push(e);
      i = j;
    }
  }
  const glass = new Set(list.map(e => e.node)), skip = (o) => glass.has(o) || !!o.userData.crackOverlay;
  const pick = (dir) => {
    const cand = list.filter(e => e.facing.face === dir && e.facing.area * e.facing.share[dir] >= MIN_AREA && !paneHidden(model, e.facing, skip)).sort((a, b) => b.facing.area - a.facing.area); // (a pane hidden behind the body, a van's cab window, is no window to crack)
    const p = cand[0];
    if (!p) return [];
    const halves = cand.filter(q => q !== p && Math.abs(q.facing.centre.y - p.facing.centre.y) < 0.15 && Math.abs(q.facing.centre.z - p.facing.centre.z) < 0.3 && q.facing.area > 0.4 * p.facing.area && Math.abs(q.facing.centre.x) > 0.1 && Math.abs(p.facing.centre.x) > 0.1 && q.facing.centre.x * p.facing.centre.x < 0); // (half of a split screen: the other half across the car, not a second glass over the same place)
    return [p, ...halves.slice(0, 1)];
  };
  // no pane faces that way: a canopy's triangles that do (the biggest canopy with enough of them, not hidden)
  const canopy = (dir) => {
    const cand = list.filter(e => e.facing.face === 'mixed' && !e.facing.share.reverse && e.facing.share[dir] >= CANOPY_SHARE).sort((a, b) => b.facing.area * b.facing.share[dir] - a.facing.area * a.facing.share[dir]);
    for (const e of cand) {
      const f = canopyFacing(e, dir);
      if (f && f.area >= MIN_AREA && !paneHidden(model, f, skip)) return [{ ...e, facing: f }];
    }
    return [];
  };
  const choose = (dir) => {
    const p = pick(dir), area = p.reduce((s, e) => s + e.facing.area, 0);
    const c = canopy(dir);
    const low = p.length && p[0].facing.centre.y < (c[0]?.facing.centre.y ?? 0) - CANOPY_LOW; // (a lamp's glass under the canopy)
    return c.length && (!p.length || c[0].facing.area > CANOPY_OVER * area || (low && c[0].facing.area > area)) ? c : p;
  };
  const out = { windscreen: choose('front'), rear: choose('rear') };
  SCREENS.set(model, out);
  return out;
};

// ---- the overlay ---------------------------------------------------------------------------------------------------------------------
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const n = new THREE.Vector3(), raw = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
// one window's triangles for the overlay, in the model's frame: the pane's OUTER face (a glass slab's two faces both face out once turned: its
// own winding tells the outer one; a one-sided panel has one), lifted along the pane's normal; uv in the crack texture's square
// (a canopy's: only its triangles that face that way, each judged by its own outward normal, as the canopy curves)
const windowTris = (e, r, out) => {
  const N = e.facing.normal, tris = [], cap = e.facing.canopy;
  const middle = cap ? e.facing.middle : e.pane.middle ? new THREE.Vector3().fromArray(e.pane.middle) : null;
  let pos = 0, neg = 0, posOut = 0, negOut = 0;
  paneTriangles(e.node, e.toModel, e.pane, (a, b, c) => {
    const s = outward(a, b, c, e.zRef, n, middle);
    if (!s || (cap ? !canopyKeeps(n, cap) || n.dot(N) < 0.35 : n.dot(N) < 0.6)) return;
    raw.subVectors(b, a).cross(e2.subVectors(c, a)).normalize();
    const d = raw.dot(cap ? n : N);
    const o = ((a.x + b.x + c.x) * N.x + (a.y + b.y + c.y) * N.y + (a.z + b.z + c.z) * N.z) / 3 * s; // (how far out along the normal)
    tris.push({ p: [a.clone(), b.clone(), c.clone()], d, s });
    if (d > 0.5) { pos += s; posOut += o; } else if (d < -0.5) { neg += s; negOut += o; }
  });
  // (a flat slab: both faces turned out, the outer the one further out along the normal, whichever way it is wound; a canopy or one face: the winding's majority)
  const outer = !cap && pos && neg && Math.abs(posOut / pos - negOut / neg) > 0.003 ? posOut / pos > negOut / neg : pos >= neg;
  const keep = tris.filter(t => (outer ? t.d > 0.5 : t.d < -0.5));
  if (!keep.length) return;
  // the plane's axes: across (the car's x laid on the pane) and up the pane
  const U = new THREE.Vector3(1, 0, 0).addScaledVector(N, -N.x).normalize(), V = new THREE.Vector3().crossVectors(N, U).normalize();
  if (V.y < 0) V.negate();
  // the extent on the pane, the impact point seeded inside it (not too near an edge), the pattern's size to reach every corner
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  const C = e.facing.centre;
  for (const t of keep) for (const p of t.p) { e1.subVectors(p, C); const u = e1.dot(U), v = e1.dot(V); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const iu = u0 + (u1 - u0) * (0.25 + r() * 0.5), iv = v0 + (v1 - v0) * (0.3 + r() * 0.45);
  const reach = Math.max(Math.hypot(u0 - iu, v0 - iv), Math.hypot(u1 - iu, v0 - iv), Math.hypot(u0 - iu, v1 - iv), Math.hypot(u1 - iu, v1 - iv));
  const half = Math.min(1.6, Math.max(0.55, reach * 1.05)), turn = r() * Math.PI * 2, cos = Math.cos(turn), sin = Math.sin(turn), flip = r() < 0.5 ? -1 : 1;
  for (const t of keep) for (const p of t.p) {
    e1.subVectors(p, C); const u = (e1.dot(U) - iu) * flip, v = e1.dot(V) - iv;
    out.pos.push(p.x + N.x * CRACK.lift, p.y + N.y * CRACK.lift, p.z + N.z * CRACK.lift);
    out.uv.push(0.5 + (u * cos - v * sin) / (2 * half), 0.5 + (u * sin + v * cos) / (2 * half));
    out.owner.push(e.node);
  }
};
// the overlay mesh of a model (null: no window to crack), built once; one mesh for both windows, a child of the windscreen's glass mesh
// (or the rear's): its vertices are in that mesh's frame, so it rides with it
export const crackOverlay = (model, key = 'car') => {
  if (OVERLAY.has(model)) return OVERLAY.get(model);
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const sc = screensOf(model), host = (sc.windscreen[0] || sc.rear[0])?.node;
  let mesh = null;
  if (host) {
    const out = { pos: [], uv: [], owner: [] };
    for (const [which, list] of [['windscreen', sc.windscreen], ['rear', sc.rear]]) list.forEach((e, i) => windowTris(e, rand(hash(key + '|' + which + '|' + i)), out));
    if (out.pos.length) {
      // into the host's frame (every window's glass sits still on the body, as the host does: they share the body's frame)
      host.updateMatrixWorld(true);
      const toHost = new THREE.Matrix4().copy(host.matrixWorld).invert().multiply(model.matrixWorld), v = new THREE.Vector3();
      for (let i = 0; i < out.pos.length; i += 3) { v.fromArray(out.pos, i).applyMatrix4(toHost); out.pos[i] = v.x; out.pos[i + 1] = v.y; out.pos[i + 2] = v.z; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
      geo.computeBoundingSphere();
      mesh = new THREE.Mesh(geo, crackMaterial(1));
      mesh.name = 'cracks';
      mesh.renderOrder = 2;
      mesh.userData.crackOverlay = true; // (render/modelpatch.js: not a part of the model; render/dents.js: never dented)
      mesh.visible = false;
      host.add(mesh);
    }
  }
  OVERLAY.set(model, mesh);
  BUILD_MS.set(model, (typeof performance !== 'undefined' ? performance.now() : 0) - t0);
  return mesh;
};
// the model's glass cracked for that share of damage (0: clean; null: cracks not asked for, nothing built). `hide`: not now (the ghost power)
export const crackModel = (model, share, key, hide = false) => {
  if (share === null || share === undefined) return 0;
  const stage = crackStage(share);
  if (!stage && !OVERLAY.get(model)) return 0;
  const mesh = crackOverlay(model, key);
  if (!mesh) return 0;
  mesh.visible = stage > 0 && !hide;
  if (stage) mesh.material = crackMaterial(stage);
  return stage;
};
