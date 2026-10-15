// THE FLANK DECAL ZONE SEARCH (a feasibility prototype, CHECKLIST 383, src/delivery/DECAL-FEASIBILITY.md). For one side of a car
// model it lays a grid of rays along x over the side view (STEP apart, the model's own frame: x across, y up, the nose at +z) and classes
// what each meets first with the game's own rule (src/delivery/render/flankdecal.js flankHit: 'paint' facing out sideways, 'curve'
// paint turned away, 'glass', 'wheel', 'lamp', 'graphic', 'trim', 'air'). A CELL (between four rays) is CLEAN where all four corners are
// paint and the surface between them is smooth: no more than STEP_JUMP apart in x, and moving as their normals say within STEP_TOL (a panel gap, a ledge, a box-built car's stepped panels are edges). Then:
//   ZONES   the largest clean axis-aligned rectangles, greedily (at most MAX_ZONES a side, each at least MIN_W x MIN_H, no longer than
//           ASPECT times its height), named by where they sit against the wheels: 'fender' over or ahead of the front wheels, 'quarter' over or
//           behind the rear ones, between them 'door' (or 'flank' when longer than FLANK_LEN: a bus, a lorry's body)
//   (a zone whose normals spread more than MAX_CURVE degrees is dropped: a band round a roof's shoulder)
//   FLAT    each zone's plane fitted (x = a + b y + c z) and the most a ray's hit stands off it (mm); CURVE the widest angle between its
//           normals and their mean (degrees)
//   ROOM    the largest clean square (a roundel's diameter), the longest clean run STRIPE_H tall (a stripe's length), the clean share
//           of the side view (the cells where any ray met the car)
//   MIRROR  the left and right clean masks compared (intersection over union, the right flipped onto the left's frame: same z, y)
// (flankHit comes from the game's module as Vite loads it: useHit(fn) before searching; scripts/decal-zones.mjs does)
let flankHit = null;
export const useHit = (fn) => { flankHit = fn; };

export const SEARCH = { STEP: 0.04, STEP_JUMP: 1.25, STEP_TOL: 0.006, MIN_W: 0.3, MIN_H: 0.15, ASPECT: 12, MAX_ZONES: 4, MAX_CURVE: 35, FLANK_LEN: 2.6, STRIPE_H: 0.12 };
const r3 = (v) => Math.round(v * 1000) / 1000;

// one side's samples: { s, z0, y0, nz, ny, step, at(i, j) -> hit }
export const sampleSide = (view, s, step = SEARCH.STEP) => {
  const { box } = view, z0 = box.min.z - step, y0 = Math.max(0.02, box.min.y), nz = Math.ceil((box.max.z - z0 + step) / step), ny = Math.ceil((box.max.y - y0) / step);
  const hits = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nz; i++) hits.push(flankHit(view, s, y0 + j * step, z0 + i * step));
  return { s, z0, y0, nz, ny, step, at: (i, j) => hits[j * (nz + 1) + i], hits };
};

// the clean cells: Uint8Array (nz x ny), 1 = clean
export const cleanMask = (S) => {
  const { nz, ny, step, at } = S, mask = new Uint8Array(nz * ny), jump = SEARCH.STEP_JUMP * step;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) {
    const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    if (!q.every(h => h.kind === 'paint')) continue;
    const xs = q.map(h => h.point.x);
    if (Math.max(...xs) - Math.min(...xs) > jump) continue;
    // a STEP: along each edge the surface moves in x as its normals say it should (a slope), within STEP_TOL; a ledge between two
    // parallel faces (a box-built car's panels, a sill, a swage line) is an edge, whatever its size
    let step = false;
    for (let k = 0; k < 4 && !step; k++) {
      const a = q[k], b = q[(k + 1) % 4], nx = (a.normal.x + b.normal.x) / 2, ny = (a.normal.y + b.normal.y) / 2, nzz = (a.normal.z + b.normal.z) / 2;
      const pred = -(ny * (b.point.y - a.point.y) + nzz * (b.point.z - a.point.z)) / nx;
      if (Math.abs(b.point.x - a.point.x - pred) > SEARCH.STEP_TOL) step = true;
    }
    if (step) continue;
    mask[j * nz + i] = 1;
  }
  return mask;
};

// the largest clean rectangle not in `used` (cells), within the size rules: { i0, i1, j0, j1 } (cells i0..i1-1, j0..j1-1) or null
const largestRect = (S, mask, used) => {
  const { nz, ny, step } = S, minW = Math.ceil(SEARCH.MIN_W / step), minH = Math.ceil(SEARCH.MIN_H / step);
  let best = null, bestArea = 0;
  const col = new Uint8Array(nz);
  for (let j0 = 0; j0 < ny; j0++) {
    col.fill(1);
    for (let j1 = j0 + 1; j1 <= ny; j1++) {
      const h = j1 - j0;
      for (let i = 0; i < nz; i++) if (!mask[(j1 - 1) * nz + i] || used[(j1 - 1) * nz + i]) col[i] = 0;
      if (h < minH) continue;
      let run = 0;
      for (let i = 0; i <= nz; i++) {
        if (i < nz && col[i]) { run++; continue; }
        if (run >= minW) {
          const w = Math.min(run, Math.floor(h * SEARCH.ASPECT)), area = w * h;
          if (w >= minW && area > bestArea) { bestArea = area; const mid = i - run + Math.floor((run - w) / 2); best = { i0: mid, i1: mid + w, j0, j1 }; }
        }
        run = 0;
      }
    }
  }
  return best;
};
// the largest clean square's side (cells) and the longest clean run `rows` tall (cells)
const roomOf = (S, mask) => {
  const { nz, ny, step } = S, dp = new Uint16Array(nz * ny);
  let sq = 0, sqAt = null;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) {
    if (!mask[j * nz + i]) continue;
    const v = i && j ? 1 + Math.min(dp[(j - 1) * nz + i], dp[j * nz + i - 1], dp[(j - 1) * nz + i - 1]) : 1;
    dp[j * nz + i] = v;
    if (v > sq) { sq = v; sqAt = [i, j]; }
  }
  const rows = Math.ceil(SEARCH.STRIPE_H / step);
  let run = 0;
  for (let j0 = 0; j0 + rows <= ny; j0++) {
    let r = 0;
    for (let i = 0; i < nz; i++) {
      let ok = true;
      for (let j = j0; j < j0 + rows && ok; j++) ok = !!mask[j * nz + i];
      r = ok ? r + 1 : 0;
      run = Math.max(run, r);
    }
  }
  return { square: sq * step, squareAt: sqAt && [r3(S.z0 + (sqAt[0] - sq / 2 + 1) * step), r3(S.y0 + (sqAt[1] - sq / 2 + 1) * step)], stripe: run * step };
};
// the plane of a zone's hits and how far they stand off it (mm), the spread of their normals (deg)
const flatness = (S, z) => {
  const pts = [];
  for (let j = z.j0; j <= z.j1; j++) for (let i = z.i0; i <= z.i1; i++) { const h = S.at(i, j); if (h.point) pts.push(h); }
  // least squares x = a + b y + c z
  let n = 0, sy = 0, sz = 0, sx = 0, syy = 0, szz = 0, syz = 0, sxy = 0, sxz = 0;
  for (const { point: p } of pts) { n++; sy += p.y; sz += p.z; sx += p.x; syy += p.y * p.y; szz += p.z * p.z; syz += p.y * p.z; sxy += p.x * p.y; sxz += p.x * p.z; }
  const M = [[n, sy, sz], [sy, syy, syz], [sz, syz, szz]], B = [sx, sxy, sxz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M), col = (k) => M.map((row, r) => row.map((v, c) => (c === k ? B[r] : v)));
  const [a, b, c] = Math.abs(D) < 1e-12 ? [sx / n, 0, 0] : [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
  let dev = 0;
  for (const { point: p } of pts) dev = Math.max(dev, Math.abs(p.x - (a + b * p.y + c * p.z)));
  const mean = pts.reduce((m, h) => m.add(h.normal), pts[0].normal.clone().multiplyScalar(0)).normalize();
  let curve = 0;
  for (const h of pts) curve = Math.max(curve, Math.acos(Math.min(1, h.normal.dot(mean))) * 180 / Math.PI);
  return { flat: Math.round(dev * 1000), curve: Math.round(curve) };
};
// the wheels' z extents on this side (clusters of 'wheel' hits)
const wheelSpans = (S) => {
  const zs = [...new Set(S.hits.map((h, k) => (h.kind === 'wheel' ? k % (S.nz + 1) : null)).filter(k => k !== null))].sort((a, b) => a - b);
  const spans = [];
  for (const i of zs) { const last = spans[spans.length - 1]; if (last && i - last[1] <= 3) last[1] = i; else spans.push([i, i]); }
  return spans.map(([a, b]) => [S.z0 + a * S.step, S.z0 + b * S.step]);
};
const nameZone = (z, wheels) => {
  const zc = (z.z0 + z.z1) / 2;
  if (!wheels.length) return z.z1 - z.z0 > SEARCH.FLANK_LEN ? 'flank' : 'door';
  const mids = wheels.map(w => (w[0] + w[1]) / 2), front = Math.max(...mids), rear = Math.min(...mids);
  const over = wheels.findIndex(w => zc >= w[0] - 0.1 && zc <= w[1] + 0.1); // (over a wheel: its arch's panel)
  if (over >= 0) return mids[over] === rear ? 'quarter' : mids[over] === front ? 'fender' : 'flank';
  if (zc > front) return 'fender';
  if (zc < rear) return 'quarter';
  return z.z1 - z.z0 > SEARCH.FLANK_LEN ? 'flank' : 'door';
};

// the whole search on one side
export const searchSide = (view, s, step = SEARCH.STEP) => {
  const S = sampleSide(view, s, step), mask = cleanMask(S), used = new Uint8Array(mask.length);
  const counts = {};
  let seen = 0;
  for (const h of S.hits) { counts[h.kind] = (counts[h.kind] || 0) + 1; if (h.kind !== 'air') seen++; }
  const wheels = wheelSpans(S), zones = [];
  for (let k = 0; k < SEARCH.MAX_ZONES; k++) {
    const r = largestRect(S, mask, used);
    if (!r) break;
    for (let j = r.j0; j < r.j1; j++) for (let i = r.i0; i < r.i1; i++) used[j * S.nz + i] = 1;
    const z = { z0: r3(S.z0 + r.i0 * step), z1: r3(S.z0 + r.i1 * step), y0: r3(S.y0 + r.j0 * step), y1: r3(S.y0 + r.j1 * step), ...r };
    Object.assign(z, flatness(S, z));
    if (z.curve > SEARCH.MAX_CURVE) { k--; continue; } // (its cells stay used: a band round a roof's shoulder or a wing's crown is no zone)
    z.id = nameZone(z, wheels);
    zones.push(z);
  }
  const clean = mask.reduce((a, v) => a + v, 0);
  return { S, mask, counts, seen, clean, coverage: seen ? clean / ((S.nz * S.ny) * seen / S.hits.length) : 0, zones, wheels, room: roomOf(S, mask) };
};
// left and right compared: IoU of the clean masks (both grids are laid from the same box, so cell (i, j) is the same z, y on each side)
export const mirrorIoU = (L, R) => {
  let both = 0, either = 0;
  for (let k = 0; k < L.mask.length; k++) { both += L.mask[k] & R.mask[k]; either += L.mask[k] | R.mask[k]; }
  return either ? both / either : 1;
};
// do two sides' zone lists agree (the same count, each within `tol` m)?
export const sameZones = (a, b, tol = 0.03) => a.length === b.length && a.every((z, k) => ['z0', 'z1', 'y0', 'y1'].every(f => Math.abs(z[f] - b[k][f]) <= tol) && z.id === b[k].id);
