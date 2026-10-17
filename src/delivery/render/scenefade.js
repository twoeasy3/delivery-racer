// ============================================================================
// THE SCENERY FADE (REPLAY-CAM.md): in the orbit camera (render/orbit.js: a replay being watched, a run that is over) whatever of
// a level's set dressing stands between the camera and the car, or round the camera itself, is dissolved, so the shot is never
// blocked by a house, a tree, a lamp post or a wall. Drawn only (render/ is outside the replay fingerprint). In play, and with
// the chase camera, nothing here runs: no index, no test, the scenery's own materials.
//
// What fades: each top-level object of the level's scenery (render/road.js levelGroup: a house, a stand, a group of parts) and
// each INSTANCE of its instanced meshes (road.js instances: one draw call per kind of thing). Instances that make one thing
// together (a house's walls, windows, shutters and roof; a tree's trunk and crown) are joined into one CLUSTER when the index is
// built: the smaller one's middle stands on the bigger one's footprint and the two touch (a cluster no more than CLUSTER_MAX
// across). A cluster fades as one.
// What does not: the flat strips (userData.flat), the land (userData.terrain), points and lines, a ShaderMaterial, and anything
// more than MAX_SIZE across (a hillside, a tunnel's shell, a backdrop: the orbit's nudge keeps the camera out of those).
//
// How: a per-frame test of the line from the camera to the car (BEAM either side of it) and a ball round the camera (NEAR)
// against the clusters' boxes, through a grid of CELL m squares over the ground (only the cells under the line are looked in;
// never a scan of every object). A cluster hit eases to 1 in FADE_TIME s, one no longer hit back to 0. The dissolve is a
// screen-door (a 4x4 ordered dither, `discard`): no sorting, no transparent pass. An instanced mesh with an instance fading is
// drawn with a copy of its material that reads the instance's fade from its instance matrix (the unused element [3], set back
// to 0 before the matrix is used, see VERTEX); a loose object's meshes are drawn with a copy of their material at one of LEVELS
// steps of the dissolve. The copies are made once per material (and step) and kept; the original material is put back when the
// fade is over. Nothing is allocated per frame once a copy exists.
// ============================================================================
import * as THREE from 'three';
import { levelGroup } from './road.js';
import { scene, camera } from './scene.js';
import { Track } from '../track.js';
import { Player } from '../player.js';

const FADE_TIME = 0.15; // s to dissolve or come back
const CELL = 12;        // m: the grid's squares
const BEAM = 0.9;       // m either side of the line from the camera to the car kept clear
const NEAR = 2.5;       // m round the camera kept clear
const KEEP = 1.0;       // m of the line at the car's end not tested (what the car is right up against stays)
const MAX_SIZE = 120;   // m across (x or z): bigger than this is never faded (a city block's podium is up to ~100 m)
const LOW = 0.05;       // m tall: anything thinner is not a thing in the way (a rail is: ~0.1 m)
const CLUSTER_MAX = 40; // m across: a cluster no bigger
const TOUCH = 0.35;     // m: how close two things are to be one (the cluster test)
const STRIP_HEIGHT = 30; // m: a strip taller than this (a mountain, a cliff) is not cut up
const STRIP_VERTS = 200000; // and none of more vertices than this
const LEVELS = 16;      // steps of a loose object's dissolve (the dither has 16)
const HOLD = Math.min(1, Math.max(0, Number(new URLSearchParams(location.search).get('fadehold')) || 1)); // (?fadehold=0.5: the fade held part way, for a still of the dissolve)
const AIM = 1.1;        // m up the car the line ends (where the orbit camera looks)
const AIM_LOW = 0.25;   // m up the car the second line ends (its sills)

export const FADE_SIZES = { beam: BEAM, near: NEAR, time: FADE_TIME, cell: CELL, maxSize: MAX_SIZE };
// what the check and the console can read (render-only stats)
export const SceneFade = { units: 0, clusters: 0, big: 0, buildMs: 0, tested: 0, testedMax: 0, cells: 0, hits: 0, active: 0, frames: 0, ms: 0, msMax: 0 };

// ---- the shader ----
const BAYER = `
float fadeBayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float fadeBayer(vec2 p) { return fadeBayer2(0.5 * p) * 0.25 + fadeBayer2(p); }
`;
const MAIN = /void\s+main\s*\(\s*\)\s*\{/;
const VERTEX = `
varying float vFade;
mat4 fadeRawIM() { return instanceMatrix; }
#define instanceMatrix fadeIM
mat4 fadeIM;
void main() {
  fadeIM = fadeRawIM(); vFade = fadeIM[0].w; fadeIM[0].w = 0.0;`;
// (a long strip of scenery, cut in pieces: each vertex's piece's fade in an attribute of its own)
const VERTEX_STRIP = `
attribute float aFade;
varying float vFade;
void main() {
  vFade = aFade;`;
const fragment = (src) => `${BAYER}
${src === 'vFade' ? 'varying float vFade;' : 'uniform float uFade;'}
void main() {
  if (${src} > fadeBayer(gl_FragCoord.xy) + 0.03) discard;`;
const copies = new Map(); // original material -> { i: the instanced copy, v: the strip copy, q: [a copy a step] }
// kind: 'i' an instanced mesh (the fade in the instance matrix), 'v' a strip (the fade a vertex), 'q' a loose object (a step of LEVELS)
const copyOf = (orig, kind, step = 0) => {
  let c = copies.get(orig);
  if (!c) copies.set(orig, c = { i: null, v: null, q: [] });
  const have = kind === 'q' ? c.q[step] : c[kind];
  if (have) return have;
  const m = orig.clone();
  const own = orig.onBeforeCompile, key = orig.customProgramCacheKey();
  const uFade = { value: step / LEVELS };
  m.onBeforeCompile = (shader, renderer) => {
    own.call(orig, shader, renderer);
    if (kind === 'i') shader.vertexShader = shader.vertexShader.replace(MAIN, VERTEX);
    else if (kind === 'v') shader.vertexShader = shader.vertexShader.replace(MAIN, VERTEX_STRIP);
    else shader.uniforms.uFade = uFade;
    shader.fragmentShader = shader.fragmentShader.replace(MAIN, fragment(kind === 'q' ? 'uFade' : 'vFade'));
  };
  m.customProgramCacheKey = () => key + '|fade-' + kind;
  m.userData = { ...orig.userData, fadeOf: orig, shared: false };
  if (kind === 'q') c.q[step] = m; else c[kind] = m;
  return m;
};
// (a copy follows what may change on its original as the level goes on: a colour, a glow, an opacity)
const follow = (m) => {
  const o = m.userData.fadeOf;
  if (o.color && m.color) m.color.copy(o.color);
  if (o.emissive && m.emissive) m.emissive.copy(o.emissive);
  m.opacity = o.opacity; m.visible = o.visible;
};
const fadeable = (mat) => !!mat && !mat.isShaderMaterial && !mat.isPointsMaterial && !mat.isLineBasicMaterial && !mat.isSpriteMaterial;

// ---- the index (built the first time the fade is wanted for this level's scenery) ----
let built = null; // what it was built for: [children, first, last]
// units: a box each (world terms), and what it is: an instanced mesh's instance or a loose object
let nU = 0, uBox = new Float32Array(0), uMesh = new Int32Array(0), uInst = new Int32Array(0), uCluster = new Int32Array(0);
const meshes = [];       // the instanced meshes (uMesh >= 0 indexes it)
const meshUnits = [];    // per instanced mesh: each instance's unit, or -1
const looseUnit = [];    // per loose object: its unit
const strips = [];       // the long strips cut in pieces (uMesh = -2 - its index, uInst its piece)
const loose = [];        // the loose objects: [ [mesh, original material(s)] ... ] each (uMesh = -1, uInst indexes it)
// (every box in levelGroup's own terms, the game's: x not mirrored)
// clusters: a box each, their members (CSR), their fade and target
let nC = 0, cBox = new Float32Array(0), cStart = new Int32Array(0), cMembers = new Int32Array(0), cFade = new Float32Array(0), cStamp = new Uint32Array(0), cHit = new Uint32Array(0);
let cActive = new Int32Array(0), cIsActive = new Uint8Array(0), nActive = 0;
// the grid: cell key -> [start, count] into gItems
const grid = new Map();
let gItems = new Int32Array(0);
const meshFaded = []; // per instanced mesh: how many of its instances are fading
const meshLo = [], meshHi = []; // per instanced mesh: the instance range written this frame
let stamp = 0;

const key = (i, j) => i * 65536 + j;
let boxesCount = () => 0;
const M = new THREE.Matrix4(), V = new THREE.Vector3(), toLocal = new THREE.Matrix4(), box = new THREE.Box3(), MID = [0, 0, 0], HALF = [0, 0, 0], LO = [0, 0, 0], HI = [0, 0, 0];

// put back everything faded (before an index is dropped, and when it is over)
const restoreAll = () => {
  for (let a = 0; a < nActive; a++) { const c = cActive[a]; cFade[c] = 0; applyCluster(c, 0); cIsActive[c] = 0; }
  nActive = 0;
  flushMeshes();
};

// (built a slice at a time, BUDGET ms a frame, so a level of tens of thousands of props makes no pause: until it is done, nothing
// fades and the orbit's nudge works as it always did)
const BUDGET = 6;
let builder = null, deadline = 0, slices = 0, worked = 0, slowest = 0;
const late = () => performance.now() > deadline;
function* building() {
  restoreAll();
  built = null;
  const sig = [levelGroup.children.length, levelGroup.children[0], levelGroup.children[levelGroup.children.length - 1]];
  let ticks = 0;
  for (const c of copies.values()) { c.i?.dispose(); c.v?.dispose(); for (const q of c.q) q?.dispose(); }
  copies.clear();
  meshes.length = 0; meshUnits.length = 0; loose.length = 0; looseUnit.length = 0; strips.length = 0; meshFaded.length = 0; meshLo.length = 0; meshHi.length = 0;
  levelGroup.updateMatrixWorld(true);
  toLocal.copy(levelGroup.matrixWorld).invert();
  for (const c of levelGroup.children) { delete c.userData.fadeMesh; delete c.userData.fadeLoose; delete c.userData.fadeStrip; }
  const boxes = [], mIdx = [], iIdx = [];
  let big = 0;
  boxesCount = () => mIdx.length;
  const take = (b, mi, ii) => {
    const sx = b.max.x - b.min.x, sz = b.max.z - b.min.z, sy = b.max.y - b.min.y;
    if (b.isEmpty() || !Number.isFinite(sx + sy + sz)) return false;
    if (sx > MAX_SIZE || sz > MAX_SIZE) { big++; return false; }
    if (sy < LOW) return false;
    boxes.push(b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z); mIdx.push(mi); iIdx.push(ii);
    return true;
  };
  for (const c of levelGroup.children) {
    if (!c.visible || c.userData.flat || c.userData.terrain || c.isPoints || c.isLine || c.isSprite) continue;
    if (c.isInstancedMesh) {
      if (Array.isArray(c.material) || !fadeable(c.material) || !c.count) continue;
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      if (!c.boundingBox) c.computeBoundingBox(); // (both made now, while every instance matrix is plain: see VERTEX)
      if (!c.boundingSphere) c.computeBoundingSphere();
      const mi = meshes.length, units = new Int32Array(c.count).fill(-1);
      let any = false;
      const g = c.geometry.boundingBox, w = c.matrix.elements, a = c.instanceMatrix.array; // (in levelGroup's own terms, the game's: not mirrored)
      const gc = [(g.min.x + g.max.x) / 2, (g.min.y + g.max.y) / 2, (g.min.z + g.max.z) / 2], ge = [(g.max.x - g.min.x) / 2, (g.max.y - g.min.y) / 2, (g.max.z - g.min.z) / 2];
      for (let i = 0; i < c.count; i++) {
        if ((++ticks & 255) === 0 && late()) yield;
        // (the box of the geometry's box turned and scaled: its middle moved, its half-sizes the sum of |matrix| x half-sizes; the
        // instance's matrix, then the mesh's world matrix, each that way: far cheaper than eight corners, for tens of thousands)
        const o = i * 16;
        for (let r = 0; r < 3; r++) {
          MID[r] = a[o + r] * gc[0] + a[o + 4 + r] * gc[1] + a[o + 8 + r] * gc[2] + a[o + 12 + r];
          HALF[r] = Math.abs(a[o + r]) * ge[0] + Math.abs(a[o + 4 + r]) * ge[1] + Math.abs(a[o + 8 + r]) * ge[2];
        }
        for (let r = 0; r < 3; r++) {
          const mid = w[r] * MID[0] + w[4 + r] * MID[1] + w[8 + r] * MID[2] + w[12 + r];
          const half = Math.abs(w[r]) * HALF[0] + Math.abs(w[4 + r]) * HALF[1] + Math.abs(w[8 + r]) * HALF[2];
          LO[r] = mid - half; HI[r] = mid + half;
        }
        box.min.fromArray(LO); box.max.fromArray(HI);
        if (take(box, mi, i)) { any = true; units[i] = mIdx.length - 1; }
      }
      if (any) { meshes.push(c); meshUnits.push(units); meshFaded.push(0); meshLo.push(-1); meshHi.push(-1); c.userData.fadeMesh = mi; }
      continue;
    }
    if ((++ticks & 15) === 0 && late()) yield;
    const parts = [];
    c.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && [].concat(o.material).every(fadeable)) parts.push(o, o.material); });
    if (!parts.length) continue;
    box.setFromObject(c).applyMatrix4(toLocal); // (world, then back into levelGroup's own terms)
    // a long strip (a hall's shell, a gallery, a tunnel's lining: one mesh along the road, too long to fade whole, no taller than
    // STRIP_HEIGHT): cut into pieces of CELL m by where its triangles are, each piece a unit of its own
    if ((box.max.x - box.min.x > MAX_SIZE || box.max.z - box.min.z > MAX_SIZE) && c.isMesh && !c.children.length && !Array.isArray(c.material)
      && fadeable(c.material) && !c.geometry.userData.shared && box.max.y - box.min.y <= STRIP_HEIGHT && box.max.y - box.min.y >= LOW
      && c.geometry.attributes.position.count <= STRIP_VERTS) {
      yield* cutStrip(c, take);
      continue;
    }
    if (take(box, -1, loose.length)) { loose.push(parts); looseUnit.push(mIdx.length - 1); c.userData.fadeLoose = loose.length - 1; }
  }
  nU = mIdx.length;
  uBox = new Float32Array(boxes); uMesh = Int32Array.from(mIdx); uInst = Int32Array.from(iIdx);
  // ---- clusters: union-find, the bigger first ----
  const parent = new Int32Array(nU).map((_, i) => i), ext = new Float32Array(boxes);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const vol = new Float32Array(nU);
  for (let u = 0; u < nU; u++) vol[u] = (uBox[u * 6 + 3] - uBox[u * 6]) * (uBox[u * 6 + 4] - uBox[u * 6 + 1]) * (uBox[u * 6 + 5] - uBox[u * 6 + 2]);
  const tmpGrid = new Map(); // units by the cells their boxes cover
  for (let u = 0; u < nU; u++) {
    if ((++ticks & 255) === 0 && late()) yield;
    for (let i = Math.floor(uBox[u * 6] / CELL); i <= Math.floor(uBox[u * 6 + 3] / CELL); i++) {
      for (let j = Math.floor(uBox[u * 6 + 2] / CELL); j <= Math.floor(uBox[u * 6 + 5] / CELL); j++) {
        const k = key(i, j);
        let l = tmpGrid.get(k); if (!l) tmpGrid.set(k, l = []);
        l.push(u);
      }
    }
  }
  for (let u = 0; u < nU; u++) {
    if ((++ticks & 255) === 0 && late()) yield;
    const o = u * 6, cx = (uBox[o] + uBox[o + 3]) / 2, cz = (uBox[o + 2] + uBox[o + 5]) / 2;
    const list = tmpGrid.get(key(Math.floor(cx / CELL), Math.floor(cz / CELL)));
    let host = -1;
    for (const v of list) {
      if (v === u || vol[v] < vol[u] || (vol[v] === vol[u] && v > u)) continue;
      const p = v * 6;
      if (cx < uBox[p] - TOUCH || cx > uBox[p + 3] + TOUCH || cz < uBox[p + 2] - TOUCH || cz > uBox[p + 5] + TOUCH) continue;
      if (uBox[o + 1] > uBox[p + 4] + TOUCH || uBox[o + 4] < uBox[p + 1] - TOUCH) continue;
      if (host < 0 || vol[v] > vol[host]) host = v;
    }
    if (host < 0) continue;
    const a = find(u), b = find(host);
    if (a === b) continue;
    const A = a * 6, B = b * 6;
    const x0 = Math.min(ext[A], ext[B]), z0 = Math.min(ext[A + 2], ext[B + 2]), x1 = Math.max(ext[A + 3], ext[B + 3]), z1 = Math.max(ext[A + 5], ext[B + 5]);
    // (no bigger than CLUSTER_MAX, or than the host's own cluster was: a big block keeps the windows on its face)
    const cap = Math.max(CLUSTER_MAX, ext[B + 3] - ext[B], ext[B + 5] - ext[B + 2]) + 2 * TOUCH;
    if (x1 - x0 > cap || z1 - z0 > cap) continue;
    parent[a] = b;
    for (let k = 0; k < 3; k++) { ext[B + k] = Math.min(ext[A + k], ext[B + k]); ext[B + 3 + k] = Math.max(ext[A + 3 + k], ext[B + 3 + k]); }
  }
  // number the clusters, their members in a row each
  const id = new Int32Array(nU).fill(-1);
  nC = 0;
  for (let u = 0; u < nU; u++) { const r = find(u); if (id[r] < 0) id[r] = nC++; }
  uCluster = new Int32Array(nU);
  const count = new Int32Array(nC + 1);
  for (let u = 0; u < nU; u++) { uCluster[u] = id[find(u)]; count[uCluster[u] + 1]++; }
  cStart = new Int32Array(nC + 1);
  for (let c = 0; c < nC; c++) cStart[c + 1] = cStart[c] + count[c + 1];
  cMembers = new Int32Array(nU);
  const fill = cStart.slice(0, nC);
  cBox = new Float32Array(nC * 6);
  for (let u = 0; u < nU; u++) {
    const c = uCluster[u];
    cMembers[fill[c]++] = u;
    const r = find(u) * 6;
    for (let k = 0; k < 6; k++) cBox[c * 6 + k] = ext[r + k];
  }
  cFade = new Float32Array(nC); cStamp = new Uint32Array(nC); cHit = new Uint32Array(nC);
  cActive = new Int32Array(nC); cIsActive = new Uint8Array(nC); nActive = 0;
  // ---- the grid of clusters ----
  grid.clear();
  const cells = new Map();
  for (let c = 0; c < nC; c++) {
    if ((++ticks & 255) === 0 && late()) yield;
    const o = c * 6;
    for (let i = Math.floor(cBox[o] / CELL); i <= Math.floor(cBox[o + 3] / CELL); i++) {
      for (let j = Math.floor(cBox[o + 2] / CELL); j <= Math.floor(cBox[o + 5] / CELL); j++) {
        const k = key(i, j);
        let l = cells.get(k); if (!l) cells.set(k, l = []);
        l.push(c);
      }
    }
  }
  let n = 0;
  for (const l of cells.values()) n += l.length;
  gItems = new Int32Array(n);
  n = 0;
  for (const [k, l] of cells) { grid.set(k, [n, l.length]); for (const c of l) gItems[n++] = c; }
  built = sig;
  Object.assign(SceneFade, { units: nU, clusters: nC, big, strips: strips.length, cells: grid.size });
}
// a strip cut in pieces (see building): the pieces' boxes as units, each vertex's piece, each triangle's unit
function* cutStrip(c, take) {
  const g = c.geometry, pos = g.attributes.position, index = g.index, nV = pos.count, nT = (index ? index.count : nV) / 3;
  M.multiplyMatrices(toLocal, c.matrixWorld);
  const vx = new Float32Array(nV * 3);
  for (let v = 0; v < nV; v++) {
    if ((v & 4095) === 4095 && late()) yield;
    V.fromBufferAttribute(pos, v).applyMatrix4(M); vx[v * 3] = V.x; vx[v * 3 + 1] = V.y; vx[v * 3 + 2] = V.z;
  }
  const pieces = new Map(), triPiece = new Int32Array(nT), vPiece = new Int32Array(nV).fill(-1), lo = [], hi = [];
  for (let t = 0; t < nT; t++) {
    if ((t & 511) === 511 && late()) yield;
    const a = index ? index.getX(t * 3) : t * 3, b = index ? index.getX(t * 3 + 1) : t * 3 + 1, d = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    const k = key(Math.floor((vx[a * 3] + vx[b * 3] + vx[d * 3]) / 3 / CELL), Math.floor((vx[a * 3 + 2] + vx[b * 3 + 2] + vx[d * 3 + 2]) / 3 / CELL));
    let p = pieces.get(k);
    if (p === undefined) { pieces.set(k, p = lo.length / 3); lo.push(Infinity, Infinity, Infinity); hi.push(-Infinity, -Infinity, -Infinity); }
    triPiece[t] = p;
    for (const v of [a, b, d]) {
      if (vPiece[v] < 0) vPiece[v] = p;
      for (let r = 0; r < 3; r++) { lo[p * 3 + r] = Math.min(lo[p * 3 + r], vx[v * 3 + r]); hi[p * 3 + r] = Math.max(hi[p * 3 + r], vx[v * 3 + r]); }
    }
  }
  const nP = lo.length / 3, si = strips.length, unit = new Int32Array(nP).fill(-1);
  let any = false;
  for (let p = 0; p < nP; p++) {
    box.min.set(lo[p * 3], lo[p * 3 + 1], lo[p * 3 + 2]); box.max.set(hi[p * 3], hi[p * 3 + 1], hi[p * 3 + 2]);
    if (take(box, -2 - si, p)) { unit[p] = boxesCount() - 1; any = true; }
  }
  if (!any) return;
  // each piece's vertices in a row (CSR), for writing its fade
  const start = new Int32Array(nP + 1);
  for (let v = 0; v < nV; v++) if (vPiece[v] >= 0) start[vPiece[v] + 1]++;
  for (let p = 0; p < nP; p++) start[p + 1] += start[p];
  const fillAt = start.slice(0, nP), verts = new Int32Array(start[nP]);
  for (let v = 0; v < nV; v++) if (vPiece[v] >= 0) verts[fillAt[vPiece[v]]++] = v;
  const triUnit = new Int32Array(nT);
  for (let t = 0; t < nT; t++) triUnit[t] = unit[triPiece[t]];
  if (!g.attributes.aFade) g.setAttribute('aFade', new THREE.BufferAttribute(new Float32Array(nV), 1));
  strips.push({ mesh: c, orig: c.material, attr: g.attributes.aFade, start, verts, fade: new Float32Array(nP), faded: 0, dirty: false, triUnit });
  c.userData.fadeStrip = si;
}
// a slice of the build (a new one begun if the scenery changed); true once the index is ready
const advance = () => {
  if (!stale() && !builder) return true;
  if (!builder) { builder = building(); slices = 0; worked = 0; slowest = 0; }
  const t0 = performance.now();
  deadline = t0 + BUDGET;
  const done = builder.next().done;
  const ms = performance.now() - t0;
  slices++; worked += ms; slowest = Math.max(slowest, ms);
  if (done) { builder = null; Object.assign(SceneFade, { buildMs: +worked.toFixed(1), buildFrames: slices, buildSlowest: +slowest.toFixed(1) }); }
  return done && !stale();
};
export const fadeReady = () => !builder && !stale();
const stale = () => !built || built[0] !== levelGroup.children.length || built[1] !== levelGroup.children[0] || built[2] !== levelGroup.children[levelGroup.children.length - 1];

// ---- the fade, put on what draws it ----
const setLoose = (parts, f) => {
  const step = Math.min(LEVELS, Math.ceil(f * LEVELS - 1e-4));
  for (let k = 0; k < parts.length; k += 2) {
    const mesh = parts[k], orig = parts[k + 1];
    if (step <= 0) { mesh.material = orig; continue; }
    if (Array.isArray(orig)) {
      if (!Array.isArray(mesh.material) || mesh.material === orig) mesh.material = orig.slice();
      for (let q = 0; q < orig.length; q++) { mesh.material[q] = copyOf(orig[q], 'q', step); follow(mesh.material[q]); }
    } else { mesh.material = copyOf(orig, 'q', step); follow(mesh.material); }
  }
};
const applyCluster = (c, f) => {
  for (let k = cStart[c]; k < cStart[c + 1]; k++) {
    const u = cMembers[k], mi = uMesh[u], i = uInst[u];
    if (mi === -1) { setLoose(loose[i], f); continue; }
    if (mi < -1) {
      const st = strips[-2 - mi], was = st.fade[i];
      if (was === f) continue;
      if (was === 0 && f > 0) st.faded++; else if (was > 0 && f === 0) st.faded--;
      st.fade[i] = f;
      const a = st.attr.array;
      for (let k = st.start[i]; k < st.start[i + 1]; k++) a[st.verts[k]] = f;
      st.dirty = true;
      continue;
    }
    const mesh = meshes[mi], arr = mesh.instanceMatrix.array, was = arr[i * 16 + 3];
    if (was === f) continue;
    if (was === 0 && f > 0) meshFaded[mi]++; else if (was > 0 && f === 0) meshFaded[mi]--;
    arr[i * 16 + 3] = f;
    if (meshLo[mi] < 0 || i < meshLo[mi]) meshLo[mi] = i;
    if (i > meshHi[mi]) meshHi[mi] = i;
  }
};
// the instanced meshes written this frame: their changed range sent, and the fading copy of their material on while any instance fades
const flushMeshes = () => {
  for (const st of strips) {
    if (!st.dirty) continue;
    st.dirty = false;
    st.attr.needsUpdate = true;
    st.mesh.material = st.faded > 0 ? copyOf(st.orig, 'v') : st.orig;
    if (st.faded > 0) follow(st.mesh.material);
  }
  for (let mi = 0; mi < meshes.length; mi++) {
    if (meshLo[mi] < 0) continue;
    const mesh = meshes[mi], attr = mesh.instanceMatrix;
    attr.addUpdateRange(meshLo[mi] * 16, (meshHi[mi] - meshLo[mi] + 1) * 16);
    attr.needsUpdate = true;
    meshLo[mi] = meshHi[mi] = -1;
    const orig = mesh.material.userData.fadeOf || mesh.material;
    mesh.material = meshFaded[mi] > 0 ? copyOf(orig, 'i') : orig;
    if (meshFaded[mi] > 0) follow(mesh.material);
  }
};

// ---- the test ----
const ballBox = (b, o, x, y, z, r) => {
  const dx = Math.max(b[o] - x, 0, x - b[o + 3]), dy = Math.max(b[o + 1] - y, 0, y - b[o + 4]), dz = Math.max(b[o + 2] - z, 0, z - b[o + 5]);
  return dx * dx + dy * dy + dz * dz <= r * r;
};
// does the segment P -> P + D pass within r of the box [o, o + 6) of b (the box grown by r: a slab test)?
const D = [0, 0, 0], P = [0, 0, 0]; // (made once)
const segBox = (b, o, x0, y0, z0, dx, dy, dz, r) => { D[0] = dx; D[1] = dy; D[2] = dz; P[0] = x0; P[1] = y0; P[2] = z0; return slab(b, o, r); };
const slab = (b, o, r) => {
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const lo = b[o + k] - r, hi = b[o + 3 + k] + r, d = D[k], p = P[k];
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) { const t = a; a = c; c = t; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    if (t0 > t1) return false;
  }
  return true;
};

// every frame, once the camera is placed (main.js): on while the orbit camera (render/orbit.js) or photo mode (render/photo.js)
// has the camera. Off (the chase camera back): what is faded comes back in FADE_TIME, then nothing runs at all
const car = new THREE.Vector3(), CAM = new THREE.Vector3();
export const fadeScenery = (dt, on) => {
  if (!on && !nActive) return;
  const t0 = performance.now();
  SceneFade.frames++;
  stamp++;
  let tested = 0;
  if (on) {
    if (!advance()) on = false; // (not ready yet: what was faded eases back, nothing new fades)
    // (everything in the game's terms, levelGroup's own: the camera as drawn is mirrored on a left-hand level, so it is put back)
    const flip = scene.scale.x < 0 ? -1 : 1, cam = CAM.set(camera.position.x * flip, camera.position.y, camera.position.z);
    Track.toWorld(Player.s, Player.lat, car); // (the car's middle, in the game's terms)
    const ax = car.x, ay = car.y + Player.air + AIM, az = car.z;
    let dx = ax - cam.x, dy = ay - cam.y, dz = az - cam.z;
    const len = Math.hypot(dx, dy, dz), k = len > KEEP ? (len - KEEP) / len : 0;
    dx *= k; dy *= k; dz *= k;
    const ly = dy - (AIM - AIM_LOW) * k; // (and a second line, to the car's sills: a low wall can hide the body under the middle's line)
    const reach = BEAM + NEAR;
    const i0 = Math.floor((Math.min(cam.x, cam.x + dx) - reach) / CELL), i1 = Math.floor((Math.max(cam.x, cam.x + dx) + reach) / CELL);
    const j0 = Math.floor((Math.min(cam.z, cam.z + dz) - reach) / CELL), j1 = Math.floor((Math.max(cam.z, cam.z + dz) + reach) / CELL);
    // (only the cells whose square the line, grown by the beam, crosses: a 2D slab test on each cell of the rectangle)
    const cell = CELL_BOX;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const g = grid.get(key(i, j));
        if (!g) continue;
        cell[0] = i * CELL; cell[1] = -1e9; cell[2] = j * CELL; cell[3] = (i + 1) * CELL; cell[4] = 1e9; cell[5] = (j + 1) * CELL;
        if (!segBox(cell, 0, cam.x, cam.y, cam.z, dx, dy, dz, reach)) continue;
        for (let n = g[0], e = g[0] + g[1]; n < e; n++) {
          const c = gItems[n];
          if (cStamp[c] === stamp) continue;
          cStamp[c] = stamp;
          tested++;
          if (segBox(cBox, c * 6, cam.x, cam.y, cam.z, dx, dy, dz, BEAM) || segBox(cBox, c * 6, cam.x, cam.y, cam.z, dx, ly, dz, BEAM) || ballBox(cBox, c * 6, cam.x, cam.y, cam.z, NEAR)) {
            cHit[c] = stamp;
            if (!cIsActive[c]) { cIsActive[c] = 1; cActive[nActive++] = c; }
          }
        }
      }
    }
  }
  // ease every cluster in play toward its target; drop those back to nothing
  const step = Math.min(1, dt / FADE_TIME);
  let hits = 0;
  for (let a = 0; a < nActive; a++) {
    const c = cActive[a], want = on && cHit[c] === stamp ? 1 : 0;
    if (want) hits++;
    const f = want ? Math.min(HOLD, cFade[c] + step) : Math.max(0, cFade[c] - step);
    if (f !== cFade[c]) { cFade[c] = f; applyCluster(c, f); }
    if (f === 0 && !want) { cIsActive[c] = 0; cActive[a] = cActive[--nActive]; a--; }
  }
  flushMeshes();
  const ms = performance.now() - t0;
  Object.assign(SceneFade, { tested, testedMax: Math.max(SceneFade.testedMax, tested), hits, active: nActive, ms, msMax: Math.max(SceneFade.msMax, ms) });
};
const CELL_BOX = new Float32Array(6);

// the index made ahead of need (render/orbit.js: as a replay's orbit camera comes on offer, so its first frame does not stall)
export const prepareFade = () => { advance(); };
// is this hit (a ray's, on levelGroup) on something the fade takes care of? (the orbit's nudge leaves those to it)
// (the orbit says where it would put the camera, the game's terms, before it asks about hits: a prop whose cluster's box holds that
// place, or is within NEAR of it, is NOT passed over, so the nudge draws the camera out in front of it, not into its dissolve)
const PROBE = [0, 0, 0];
export const fadeProbe = (v) => { PROBE[0] = v.x; PROBE[1] = v.y; PROBE[2] = v.z; };
const holdsProbe = (u) => ballBox(cBox, uCluster[u] * 6, PROBE[0], PROBE[1], PROBE[2], NEAR); // (in its box, or as near it as the ball round the camera: a dissolve filling the frame)
export const fadesAway = (object, instanceId, faceIndex) => {
  if (builder || stale()) return false; // (no index yet: the nudge as it always was)
  while (object.parent && object.parent !== levelGroup) object = object.parent;
  let u = -1;
  if (object.isInstancedMesh) {
    const mi = object.userData.fadeMesh;
    if (mi !== undefined && meshes[mi] === object) u = uIndexOf(mi, instanceId);
  } else if (object.userData.fadeLoose !== undefined && loose[object.userData.fadeLoose] !== undefined) u = looseUnit[object.userData.fadeLoose];
  else if (object.userData.fadeStrip !== undefined && strips[object.userData.fadeStrip]?.mesh === object && faceIndex !== undefined) u = strips[object.userData.fadeStrip].triUnit[faceIndex] ?? -1;
  return u >= 0 && !holdsProbe(u);
};
// (an instance's unit, or -1)
const uIndexOf = (mi, i) => meshUnits[mi]?.[i] ?? -1;


// the fade of whatever this is (a top-level object of levelGroup, or an instanced mesh and an instance): for the check
export const fadeOf = (object, instanceId, faceIndex) => {
  if (stale() || !object) return 0;
  while (object.parent && object.parent !== levelGroup) object = object.parent;
  let u = -1;
  if (object.isInstancedMesh && object.userData.fadeMesh !== undefined) u = uIndexOf(object.userData.fadeMesh, instanceId);
  else if (object.userData.fadeLoose !== undefined) u = looseUnit[object.userData.fadeLoose] ?? -1;
  else if (object.userData.fadeStrip !== undefined && faceIndex !== undefined) u = strips[object.userData.fadeStrip]?.triUnit[faceIndex] ?? -1;
  return u < 0 ? -1 : cFade[uCluster[u]];
};
// for the check: is every fade at 0 or 1 (nothing on its way)?
export const settled = () => { for (let a = 0; a < nActive; a++) if (cFade[cActive[a]] > 0 && cFade[cActive[a]] < 1) return false; return true; };
// for the check: every cluster's box and fade (a copy)
export const fadeClusters = () => ({ box: Array.from(cBox), fade: Array.from(cFade), size: Array.from({ length: nC }, (_, c) => cStart[c + 1] - cStart[c]) });
