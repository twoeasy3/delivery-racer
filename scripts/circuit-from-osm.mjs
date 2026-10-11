// Builds a real circuit's level (src/delivery/levels/<id>.json) from OpenStreetMap and SRTM data:
//   the OSM map of a bounding box (cached in scripts/circuits/cache/<id>-map.json)
//   -> the raceway ways stitched into the lap, in the direction it is driven, from the start line
//   -> 4 m segments (curve to 7 decimals), closed as track.js checks a lapped level (1 m, 0.01 rad)
//   -> grades from SRTM heights along the lap (opentopodata, cached in cache/<id>-srtm.json)
//   -> run-off: at every 4 m, on each side, how far it really is from the track to whatever stops a car
//      there (a mapped barrier, a building, the trees, water, the far edge of a mapped gravel trap or asphalt
//      apron, the pit lane, the track itself coming back), merged into the level's "runoff" stretches
//   -> grandstands and the pits from the map, landmarks placed where they are, and the level's JSON.
// A picture of what was measured is drawn to scripts/circuits/out/<id>.svg (the map, the barriers found, the
// limit measured on each side in blue, and what the level's stretches make of it in orange).
//   node scripts/circuit-from-osm.mjs monza            builds and writes the level
//   node scripts/circuit-from-osm.mjs monza --dry      everything but writing the level
//   node scripts/circuit-from-osm.mjs monza --refetch  downloads again, whatever is cached
//   node scripts/circuit-from-osm.mjs monza --ways     lists the raceway ways in the box (to write a config from)
// The circuit's config is scripts/circuits/<id>.json:
//   bbox        [minlon, minlat, maxlon, maxlat]: the map to fetch (split into tiles if OSM says it is too big)
//   relation    the id of the circuit's relation (its ways, but for those whose role is in "skipRoles"), or
//   ways        the ids of the ways that make the lap, in any order (they are chained by their end nodes)
//   start       { lat, lon }: the start line (the nearest point of the lap to it)
//   reverse     true = the lap is driven against the ways' direction
//   realLength  m, the published lap, to report against
//   smooth      m, how far the heading is smoothed (default 4); minRadius m (default 9.5: the road's limit is 9)
//   elevation   false = flat; or { every: m between heights asked for (40), smooth: m (40), scale: 1 }
//   runoff      { max: m (60), minWidth: m (2), gap: m (40: anything wider for less than this is shut), smooth: m (12:
//               how far either way the measured widths are smoothed), over: m (0.75: the most the level's wall may
//               stand beyond what was measured), taper: m per m (1: the fastest the width may change), fit: m (1.5: how closely the tapers keep to the smoothed line: more
//               gives fewer, longer stretches); barriers: [extra barrier
//               values], ignoreWays: [ids]; street: true = a street circuit, whose walls (put up for the race, and
//               on no map) stand at the road's edge: only a mapped gravel trap or apron is run-off }
//   pit         { way: id } the pit lane (if not the relation's pit_lane member): where the pits are drawn
//   stands      extra grandstands, as the level's own "stands" (those mapped are found by themselves)
//   landmarks   [{ kind, lat, lon, r?, rot? }] a point (or { kind, at: way id }: that way's middle), or
//               [{ kind, ways: [ids] }] the ways' lines, or
//               [{ kind, area: way or relation id }] an outline: each put into the level's own coordinates
//   level       fields of the level file to set (laps, name, theme, tip, ...)
// What the level already has is kept, but for segments, runoff, gravel, stands, landmarks, pickups and "level"'s fields.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const here = (path) => new URL(path, import.meta.url);
const ID = process.argv.slice(2).find(a => !a.startsWith('--'));
const flag = (name) => process.argv.includes('--' + name);
if (!ID) { console.log('Name the circuit: node scripts/circuit-from-osm.mjs <id> [--dry] [--refetch] [--ways]'); process.exit(1); }
const CFG = JSON.parse(readFileSync(here(`./circuits/${ID}.json`), 'utf8'));
const UA = 'DeliveryRacer-circuit-tool/1.0 (hobby game level builder)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (const dir of ['./circuits/cache/', './circuits/out/']) if (!existsSync(here(dir))) mkdirSync(here(dir), { recursive: true });

// ---------------------------------------------------------------------------------------------------
// the map
// ---------------------------------------------------------------------------------------------------
const fetchBox = async (box, depth = 0) => {
  const url = 'https://api.openstreetmap.org/api/0.6/map.json?bbox=' + box.join(',');
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 400 || res.status === 413 || res.status === 509) {
    // (too many nodes in the box, 50000 at most: four smaller ones)
    const text = await res.text();
    if (depth > 3 || !/too many|limit/i.test(text)) throw new Error('OSM said ' + res.status + ': ' + text.slice(0, 200));
    const [a, b, c, d] = box, mx = (a + c) / 2, my = (b + d) / 2, out = [];
    for (const part of [[a, b, mx, my], [mx, b, c, my], [a, my, mx, d], [mx, my, c, d]]) { await sleep(1000); out.push(...await fetchBox(part, depth + 1)); }
    return out;
  }
  if (!res.ok) throw new Error('OSM said ' + res.status + ' for ' + url);
  return (await res.json()).elements;
};
const mapPath = here(`./circuits/cache/${ID}-map.json`);
let elements;
if (existsSync(mapPath) && !flag('refetch')) elements = JSON.parse(readFileSync(mapPath, 'utf8')).elements;
else {
  console.log('fetching the map of ' + CFG.bbox.join(',') + ' ...');
  const seen = new Set();
  elements = (await fetchBox(CFG.bbox)).filter(e => { const k = e.type[0] + e.id; if (seen.has(k)) return false; seen.add(k); return true; });
  // (only what is used is kept: where things are and what they are, not who mapped them when)
  elements = elements.map(e => e.type === 'node' ? { type: e.type, id: e.id, lat: e.lat, lon: e.lon, ...(e.tags ? { tags: e.tags } : {}) }
    : e.type === 'way' ? { type: e.type, id: e.id, nodes: e.nodes, ...(e.tags ? { tags: e.tags } : {}) }
      : { type: e.type, id: e.id, members: e.members, ...(e.tags ? { tags: e.tags } : {}) });
  writeFileSync(mapPath, JSON.stringify({ bounds: CFG.bbox, elements }));
}
const NODES = new Map(), WAYS = new Map(), RELS = new Map();
for (const e of elements) (e.type === 'node' ? NODES : e.type === 'way' ? WAYS : RELS).set(e.id, e);

// metres east and north of the middle of the box
const LAT0 = (CFG.bbox[1] + CFG.bbox[3]) / 2, LON0 = (CFG.bbox[0] + CFG.bbox[2]) / 2;
const MLAT = 111132.92 - 559.82 * Math.cos(2 * LAT0 * Math.PI / 180), MLON = 111412.84 * Math.cos(LAT0 * Math.PI / 180) - 93.5 * Math.cos(3 * LAT0 * Math.PI / 180);
const toM = (lat, lon) => [(lon - LON0) * MLON, (lat - LAT0) * MLAT];
const toLL = (p) => [LAT0 + p[1] / MLAT, LON0 + p[0] / MLON];
const wayPts = (way) => way.nodes.map(n => NODES.get(n)).filter(Boolean).map(n => toM(n.lat, n.lon));

if (flag('ways')) {
  for (const w of WAYS.values()) if (w.tags && w.tags.highway === 'raceway') console.log(w.id, w.nodes.length + ' nodes', w.nodes[0] + '..' + w.nodes[w.nodes.length - 1], JSON.stringify(w.tags));
  for (const r of RELS.values()) if (r.tags && (r.tags.type === 'circuit' || r.tags.highway === 'raceway' || r.tags.sport === 'motor')) console.log('relation', r.id, JSON.stringify(r.tags), r.members.map(m => m.type[0] + m.ref + (m.role ? ':' + m.role : '')).join(' '));
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------------
// the lap: the ways chained end to end
// ---------------------------------------------------------------------------------------------------
const skipRoles = CFG.skipRoles || ['pit_lane', 'pit', 'start', 'finish'];
const relation = CFG.relation ? RELS.get(CFG.relation) : null;
if (CFG.relation && !relation) throw new Error('relation ' + CFG.relation + ' is not in the map');
let lapIds = CFG.ways || relation.members.filter(m => m.type === 'way' && !skipRoles.includes(m.role)).map(m => m.ref);
lapIds = lapIds.filter(id => !(CFG.skipWays || []).includes(id));
const pitWayId = (CFG.pit && CFG.pit.way) || (relation && (relation.members.find(m => m.type === 'way' && /pit/.test(m.role)) || {}).ref) || null;
const chain = (() => {
  const left = lapIds.map(id => { const w = WAYS.get(id); if (!w) throw new Error('way ' + id + ' is not in the map'); return w; });
  const nodes = [...left.shift().nodes];
  while (left.length) {
    const end = nodes[nodes.length - 1];
    let k = left.findIndex(w => w.nodes[0] === end), flip = false;
    if (k < 0) { k = left.findIndex(w => w.nodes[w.nodes.length - 1] === end); flip = true; }
    if (k < 0) throw new Error('the lap does not join up after node ' + end + ' (ways left: ' + left.map(w => w.id).join(', ') + ')');
    const w = left.splice(k, 1)[0];
    nodes.push(...(flip ? [...w.nodes].reverse() : w.nodes).slice(1));
  }
  if (nodes[0] !== nodes[nodes.length - 1]) throw new Error('the lap is not a loop: it runs from node ' + nodes[0] + ' to ' + nodes[nodes.length - 1]);
  nodes.pop();
  // (the way the first way runs is the way the lap is driven, unless the config says otherwise)
  return CFG.reverse ? nodes.reverse() : nodes;
})();
let poly = chain.map(n => { const node = NODES.get(n); if (!node) throw new Error('node ' + n + ' of the lap is outside the map: widen bbox'); return toM(node.lat, node.lon); });
poly = poly.filter((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05; });

// a centripetal Catmull-Rom spline through the nodes, all the way round, sampled every half metre or so...
const dense = [];
{
  const M = poly.length, P = (i) => poly[((i % M) + M) % M];
  for (let i = 0; i < M; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const d = (a, b) => Math.max(1e-6, Math.sqrt(Math.hypot(a[0] - b[0], a[1] - b[1])));
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.5));
    const mix = (a, b, ta, tb, t) => [(a[0] * (tb - t) + b[0] * (t - ta)) / (tb - ta), (a[1] * (tb - t) + b[1] * (t - ta)) / (tb - ta)];
    for (let k = 0; k < n; k++) {
      const t = t1 + (t2 - t1) * k / n;
      const a1 = mix(p0, p1, t0, t1, t), a2 = mix(p1, p2, t1, t2, t), a3 = mix(p2, p3, t2, t3, t);
      const b1 = mix(a1, a2, t0, t2, t), b2 = mix(a2, a3, t1, t3, t);
      dense.push(mix(b1, b2, t1, t2, t));
    }
  }
}
// ...then walked at an even 0.5 m (or a hair off it, to come out even), starting from the start line
const H = 0.5;
let even, LAP; // (even: the points; LAP: the lap's length on the map, m)
{
  const M = dense.length, cum = [0];
  for (let i = 0; i < M; i++) { const a = dense[i], b = dense[(i + 1) % M]; cum.push(cum[i] + Math.hypot(a[0] - b[0], a[1] - b[1])); }
  LAP = cum[M];
  const at = (s) => {
    s = ((s % LAP) + LAP) % LAP;
    let lo = 0, hi = M;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const a = dense[lo], b = dense[(lo + 1) % M], f = (s - cum[lo]) / Math.max(1e-9, cum[lo + 1] - cum[lo]);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  let s0 = 0;
  if (CFG.start) {
    const q = toM(CFG.start.lat, CFG.start.lon);
    let best = Infinity;
    for (let i = 0; i < M; i++) { const d = Math.hypot(dense[i][0] - q[0], dense[i][1] - q[1]); if (d < best) { best = d; s0 = cum[i]; } }
    if (best > 60) throw new Error('the start line is ' + best.toFixed(0) + ' m off the lap');
  }
  even = [];
  const n = Math.round(LAP / H);
  for (let i = 0; i < n; i++) even.push(at(s0 + i * LAP / n));
}
const NSEG = Math.round(LAP / 4), LENGTH = NSEG * 4;   // the level's lap: 4 m segments
const DS = LAP / NSEG;                                  // what 4 m of the level is on the map
const E = even.length, PER = E / NSEG;                  // (even points per segment: 8 or so)

// the heading all the way round (anticlockwise from east, never jumping), smoothed
const theta = [];
{
  let prev = 0;
  for (let i = 0; i < E; i++) {
    const a = even[i], b = even[(i + 1) % E];
    let t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (i) { while (t - prev > Math.PI) t -= 2 * Math.PI; while (t - prev < -Math.PI) t += 2 * Math.PI; }
    theta.push(prev = t);
  }
}
const TURNS = Math.round((theta[E - 1] - theta[0]) / (2 * Math.PI)); // (+1: an anticlockwise lap, -1: clockwise)
if (Math.abs(TURNS) !== 1) throw new Error('the lap turns ' + TURNS + ' times round: not a simple loop');
const smoothLoop = (values, sigma, trend = 0) => { // a Gaussian blur round the loop (trend: what the values gain a lap)
  const n = values.length, r = Math.ceil(sigma * 3), w = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-k * k / (2 * sigma * sigma)));
  const sum = w.reduce((a, b) => a + b, 0);
  return values.map((_, i) => {
    let v = 0;
    for (let k = -r; k <= r; k++) { const j = i + k, lap = Math.floor(j / n); v += w[k + r] * (values[j - lap * n] + lap * trend); }
    return v / sum;
  });
};
const SMOOTH = CFG.smooth ?? 4;
const heading = smoothLoop(theta, SMOOTH / (LAP / E), TURNS * 2 * Math.PI);
const headingAt = (i) => { const lap = Math.floor(i / E); return heading[i - lap * E] + lap * TURNS * 2 * Math.PI; };

// ---------------------------------------------------------------------------------------------------
// the segments: a curve for every 4 m (+ = a right turn: the heading falling), closed as track.js closes it
// ---------------------------------------------------------------------------------------------------
const RMIN = CFG.minRadius ?? 9.5, CMAX = 1 / RMIN;
let curves = [];
for (let i = 0; i < NSEG; i++) curves.push(-(headingAt(Math.round((i + 1) * PER)) - headingAt(Math.round(i * PER))) / 4);
// (a bend tighter than the road can turn is held to what it can, and the turning it loses goes to the segments
// either side of it, so the corner still turns as far, only a little wider)
const clamped = curves.map(c => Math.abs(c) > CMAX);
for (let pass = 0; pass < 200 && curves.some(c => Math.abs(c) > CMAX + 1e-12); pass++) {
  const next = [...curves];
  for (let i = 0; i < NSEG; i++) {
    const over = curves[i] - Math.max(-CMAX, Math.min(CMAX, curves[i]));
    if (!over) continue;
    next[i] -= over; next[(i + 1) % NSEG] += over / 2; next[(i - 1 + NSEG) % NSEG] += over / 2;
  }
  curves = next;
}
for (let i = 0; i < NSEG; i++) if (Math.abs(curves[i]) >= CMAX - 1e-9) clamped[i] = true;
curves = curves.map(c => Math.max(-CMAX, Math.min(CMAX, c)));
// (a straight: 40 m or more of next to no curve is one segment of its mean curve)
const straight = new Array(NSEG).fill(false);
{
  const THR = CFG.straight ?? 0.0004;
  for (let i = 0; i < NSEG;) {
    if (Math.abs(curves[i]) >= THR) { i++; continue; }
    let j = i;
    while (j < NSEG && Math.abs(curves[j]) < THR) j++;
    if (j - i >= 10) { const mean = curves.slice(i, j).reduce((a, b) => a + b, 0) / (j - i); for (let k = i; k < j; k++) { curves[k] = mean; straight[k] = true; } }
    i = j;
  }
}
// track.js's own sum: 2 m steps, the heading turned by the curve at each step's middle
const drive = (cs, each) => {
  let x = 0, z = 0, h = 0;
  for (let s = 0; s < LENGTH; s += 2) {
    if (each && s % 4 === 0) each(s / 4, x, z, h);
    h -= cs[Math.floor((s + 1) / 4)] * 2;
    x += Math.sin(h) * 2;
    z += Math.cos(h) * 2;
  }
  return [h, x, z];
};
const TARGET = TURNS * 2 * Math.PI; // (an anticlockwise lap: left turns, the game's heading rising by a whole turn)
{
  // what is left over at the line (the heading, x, z) is taken out by the smallest of changes, spread round
  // the bends: a constant and one wave round the lap, found by Newton's method
  const free = curves.map((c, i) => !straight[i] && !clamped[i] && Math.abs(c) > 0.001 ? 1 : 0);
  const withQ = (q) => curves.map((c, i) => c + free[i] * (q[0] + q[1] * Math.cos(2 * Math.PI * i / NSEG) + q[2] * Math.sin(2 * Math.PI * i / NSEG)));
  const miss = (q) => { const [h, x, z] = drive(withQ(q)); return [h - TARGET, x, z]; };
  let q = [0, 0, 0];
  for (let it = 0; it < 12; it++) {
    const r = miss(q), J = [[], [], []], eps = 1e-7;
    for (let k = 0; k < 3; k++) { const q2 = [...q]; q2[k] += eps; const r2 = miss(q2); for (let m = 0; m < 3; m++) J[m][k] = (r2[m] - r[m]) / eps; }
    // (Cramer's rule)
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(J);
    q = q.map((v, k) => v - det(J.map((row, m) => row.map((c, n) => n === k ? r[m] : c))) / D);
  }
  curves = withQ(q).map(c => Math.round(c * 1e7) / 1e7);
  // (rounding to 7 decimals leaves a few millimetres: the last of it goes on the widest bends, one unit at a time)
  for (let it = 0; it < 40; it++) {
    const [h] = drive(curves), units = Math.round((h - TARGET) / 4e-7);
    if (!units) break;
    const order = curves.map((c, i) => i).filter(i => free[i]).sort((a, b) => Math.abs(curves[a]) - Math.abs(curves[b]));
    for (let k = 0; k < Math.min(Math.abs(units), order.length); k++) { const i = order[Math.floor((k + 0.5) * order.length / Math.min(Math.abs(units), order.length))]; curves[i] = Math.round((curves[i] + Math.sign(units) * 1e-7) * 1e7) / 1e7; }
  }
}
const GAME = []; // the level's centre line, every 4 m: [x, z, h]
const [endH, endX, endZ] = drive(curves, (i, x, z, h) => GAME.push([x, z, h]));
const closure = { off: Math.hypot(endX, endZ), turned: Math.abs(endH - TARGET) };
const tightest = Math.min(...curves.filter(c => c).map(c => 1 / Math.abs(c)));

// the map's own centre line every 4 m of the level: [east, north, heading]
const MAPL = [];
for (let i = 0; i < NSEG; i++) { const k = Math.round(i * PER) % E; MAPL.push([even[k][0], even[k][1], heading[k]]); }
// a point on the map, in the level's world: by where it is from the nearest of the lap (so what stands by
// the track stands by the level's track, however little the two have drifted apart)
const nearestSample = (p) => { let best = Infinity, at = 0; for (let i = 0; i < NSEG; i++) { const d = (MAPL[i][0] - p[0]) ** 2 + (MAPL[i][1] - p[1]) ** 2; if (d < best) { best = d; at = i; } } return at; };
const toGame = (p, at = nearestSample(p)) => {
  const [e, n, t] = MAPL[at], [x, z, h] = GAME[at];
  const along = (p[0] - e) * Math.cos(t) + (p[1] - n) * Math.sin(t), left = -(p[0] - e) * Math.sin(t) + (p[1] - n) * Math.cos(t);
  // (heading h: forward is (sin h, cos h), and the right (-cos h, sin h))
  return { x: x + along * Math.sin(h) + left * Math.cos(h), z: z + along * Math.cos(h) - left * Math.sin(h), s: at * 4 + along, lat: -left, far: Math.hypot(along, left) };
};
// how far the level's lap has drifted from the map's (the map's laid over it by the start line alone)
let drift = 0;
for (let i = 0; i < NSEG; i++) { const g = toGame([MAPL[i][0], MAPL[i][1]], 0); drift = Math.max(drift, Math.hypot(g.x - GAME[i][0], g.z - GAME[i][1])); }

// ---------------------------------------------------------------------------------------------------
// heights: SRTM along the lap
// ---------------------------------------------------------------------------------------------------
let grades = new Array(NSEG).fill(0), heights = null, elevation = null;
if (CFG.elevation !== false) {
  const EL = { every: 40, smooth: 40, scale: 1, hold: 5, ...(CFG.elevation || {}) };
  const count = Math.round(LENGTH / EL.every), pts = [];
  for (let k = 0; k < count; k++) pts.push(toLL(even[Math.round(k * E / count) % E]).map(v => +v.toFixed(6)));
  const path = here(`./circuits/cache/${ID}-srtm.json`);
  let cache = existsSync(path) && !flag('refetch') ? JSON.parse(readFileSync(path, 'utf8')) : null;
  if (!cache || JSON.stringify(cache.points) !== JSON.stringify(pts)) {
    console.log('fetching ' + pts.length + ' heights ...');
    const got = [];
    for (let k = 0; k < pts.length; k += 100) {
      const res = await fetch('https://api.opentopodata.org/v1/srtm30m?locations=' + pts.slice(k, k + 100).map(p => p.join(',')).join('|'), { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('opentopodata said ' + res.status);
      got.push(...(await res.json()).results.map(r => r.elevation));
      await sleep(1100);
    }
    cache = { source: 'opentopodata srtm30m', points: pts, heights: got };
    writeFileSync(path, JSON.stringify(cache));
  }
  const raw = cache.heights.map(v => v ?? 0);
  // (each sample's height, a line between those asked for; smoothed, as SRTM is a 30 m grid, and noisy)
  const perSample = [];
  for (let i = 0; i < NSEG; i++) { const f = i * count / NSEG, a = Math.floor(f) % count, b = (a + 1) % count; perSample.push(raw[a] + (raw[b] - raw[a]) * (f - Math.floor(f))); }
  heights = smoothLoop(perSample, EL.smooth / 4).map(v => v * EL.scale);
  // (a grade held for `hold` segments at a time)
  for (let i = 0; i < NSEG; i += EL.hold) {
    const j = Math.min(NSEG, i + EL.hold), g = (heights[j % NSEG] - heights[i]) / ((j - i) * 4);
    for (let k = i; k < j; k++) grades[k] = Math.round(g * 1e4) / 1e4;
  }
  // what track.js will make of them: eased over CONFIG.gradeEase (60 m) each way, what is left spread round
  const N2 = LENGTH / 2 + 1, raw2 = [], ease = 30, ys = [0];
  for (let i = 0; i < N2; i++) raw2.push(i * 2 >= LENGTH ? 0 : grades[Math.floor(i * 2 / 4)]);
  for (let i = 1; i < N2; i++) { let sum = 0; for (let k = i - 1 - ease; k <= i - 1 + ease; k++) sum += raw2[((k % N2) + N2) % N2]; ys.push(ys[i - 1] + sum / (2 * ease + 1) * 2); }
  const over = ys[N2 - 1];
  const made = ys.map((y, i) => y - over * i / (N2 - 1));
  elevation = { srtmMin: Math.min(...raw), srtmMax: Math.max(...raw), range: Math.max(...made) - Math.min(...made), startAt: perSample[0],
    steepest: Math.max(...grades.map(Math.abs)), over };
}

// ---------------------------------------------------------------------------------------------------
// what is beside the track: everything on the map sorted into what it means for a car leaving the road
// ---------------------------------------------------------------------------------------------------
const RO = { max: 60, minWidth: 2, gap: 40, within: 4, share: 0.35, barriers: [], ignoreWays: [], ...(CFG.runoff || {}) };
const HALF = 6;      // m from the centre line to where the level draws its wall with no run-off (2 lanes of 3.5 + 2.5)
const REACH = RO.max + HALF + 40; // m a ray looks out
const BARRIERS = ['wall', 'fence', 'guard_rail', 'tyres', 'jersey_barrier', 'block', 'retaining_wall', 'city_wall', 'hedge', 'yes', 'armco', 'barrier', 'cable_barrier', ...RO.barriers];
const TRAP = (t) => t.natural === 'sand' || t.natural === 'shingle' || ((t.surface === 'gravel' || t.surface === 'sand' || t.surface === 'fine_gravel' || t.surface === 'pebblestone') && !t.highway) || t.landuse === 'sand' || t.raceway === 'runoff' || t.runoff;
const APRON = (t) => !!t['area:highway'] || (t.highway === 'raceway' && t.area === 'yes') || ((t.surface === 'asphalt' || t.surface === 'concrete' || t.surface === 'paved') && (t.area === 'yes' || !t.highway) && !t.building && !t.amenity && !t.leisure);
const GRASS = (t) => t.landuse === 'grass' || t.landuse === 'meadow' || t.natural === 'grassland' || t.surface === 'grass' || t.landuse === 'greenfield';
const HARD = (t) => (t.building && t.building !== 'no') || t.landuse === 'forest' || t.natural === 'wood' || t.natural === 'water' || t.natural === 'scrub' || t.natural === 'tree_row' || t.waterway || t.leisure === 'bleachers' || t.man_made === 'embankment' || t.natural === 'cliff';
// each feature: { kind, id, tags, edges: [[ax, ay, bx, by], ...], closed, box }
const lapNodes = new Set(chain), lapWays = new Set(lapIds);
const features = [];
let trackBox = [Infinity, Infinity, -Infinity, -Infinity];
for (const p of even) trackBox = [Math.min(trackBox[0], p[0]), Math.min(trackBox[1], p[1]), Math.max(trackBox[2], p[0]), Math.max(trackBox[3], p[1])];
const addFeature = (kind, id, tags, rings, closed) => {
  const edges = [];
  let box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) for (let i = 0; i + 1 < ring.length; i++) {
    const a = ring[i], b = ring[i + 1];
    edges.push([a[0], a[1], b[0], b[1]]);
    box = [Math.min(box[0], a[0], b[0]), Math.min(box[1], a[1], b[1]), Math.max(box[2], a[0], b[0]), Math.max(box[3], a[1], b[1])];
  }
  if (!edges.length || box[0] > trackBox[2] + REACH || box[2] < trackBox[0] - REACH || box[1] > trackBox[3] + REACH || box[3] < trackBox[1] - REACH) return;
  features.push({ kind, id, tags, edges, closed, box });
};
const kindOf = (t, closed) => {
  if (t.barrier && BARRIERS.includes(t.barrier)) return 'barrier';
  if (t.highway === 'raceway' && t.area !== 'yes') return 'raceway';
  if (!closed) return t.natural === 'tree_row' || t.waterway === 'river' || t.waterway === 'canal' || t.natural === 'cliff' || t.man_made === 'embankment' ? 'hardline' : null;
  return TRAP(t) ? 'trap' : APRON(t) ? 'apron' : HARD(t) ? 'hard' : GRASS(t) ? 'grass' : null;
};
const inRelation = new Set();
for (const r of RELS.values()) {
  if (!r.tags || r.tags.type !== 'multipolygon') continue;
  const kind = kindOf(r.tags, true);
  if (!kind || kind === 'barrier' || kind === 'raceway') continue;
  const rings = r.members.filter(m => m.type === 'way' && WAYS.has(m.ref)).map(m => wayPts(WAYS.get(m.ref)));
  // (a multipolygon with ways outside the box is not a whole outline, and inside-or-out cannot be told)
  const whole = r.members.filter(m => m.type === 'way').every(m => WAYS.has(m.ref) && WAYS.get(m.ref).nodes.every(n => NODES.has(n)));
  if (whole) addFeature(kind, 'r' + r.id, r.tags, rings, true);
}
for (const w of WAYS.values()) {
  if (!w.tags || lapWays.has(w.id) || RO.ignoreWays.includes(w.id)) continue;
  const closed = w.nodes.length > 3 && w.nodes[0] === w.nodes[w.nodes.length - 1];
  const kind = kindOf(w.tags, closed);
  if (!kind) continue;
  if (w.nodes.some(n => !NODES.has(n)) && kind !== 'barrier' && kind !== 'raceway' && kind !== 'hardline') continue;
  addFeature(kind, 'w' + w.id, w.tags, [wayPts(w)], closed && kind !== 'barrier' && kind !== 'raceway' && kind !== 'hardline');
}
// a ray out from (cx, cy) along (nx, ny): where it crosses a feature's edges (m out, in order, every one of
// them: a point is inside an outline if the ray crosses it an odd number of times)
const crossings = (f, cx, cy, nx, ny) => {
  const out = [];
  if (!f.closed) { // (a line only matters within reach)
    const x2 = cx + nx * REACH, y2 = cy + ny * REACH;
    if (Math.max(cx, x2) < f.box[0] || Math.min(cx, x2) > f.box[2] || Math.max(cy, y2) < f.box[1] || Math.min(cy, y2) > f.box[3]) return out;
  }
  for (const [ax, ay, bx, by] of f.edges) {
    const ex = bx - ax, ey = by - ay, den = nx * ey - ny * ex;
    if (Math.abs(den) < 1e-12) continue;
    const u = ((ax - cx) * ey - (ay - cy) * ex) / den, v = ((ax - cx) * ny - (ay - cy) * nx) / den;
    if (u > 0 && v >= 0 && v < 1) out.push(u);
  }
  return out.sort((a, b) => a - b);
};

// ---------------------------------------------------------------------------------------------------
// run-off: every 4 m, each side, how far out a car can go
// ---------------------------------------------------------------------------------------------------
const EDGE = CFG.trackHalf ?? 6; // m from the centre line within which nothing counts (the track itself, its kerbs)
const pitFeature = features.find(f => f.id === 'w' + pitWayId);
const measured = { left: [], right: [] }; // per sample: { limit (m from the centre line), by }
const sourceCount = { left: {}, right: {} };
for (const side of ['left', 'right']) {
  for (let i = 0; i < NSEG; i++) {
    const [cx, cy, t] = MAPL[i], sgn = side === 'left' ? 1 : -1, nx = -Math.sin(t) * sgn, ny = Math.cos(t) * sgn;
    let limit = Infinity, by = null;
    const take = (u, name) => { if (u < limit) { limit = u; by = name; } };
    let soft = []; // [from, to, kind]: gravel, aprons and grass the ray passes through
    for (const f of features) {
      const us = crossings(f, cx, cy, nx, ny);
      if (!us.length) continue;
      if (f.kind === 'barrier') { const u = us.find(u => u > EDGE - 2); if (u !== undefined) take(u, 'barrier'); }
      else if (f.kind === 'hardline') { const u = us.find(u => u > EDGE - 2); if (u !== undefined) take(u, 'trees or water'); }
      else if (f.kind === 'raceway') { const u = us.find(u => u > EDGE - 2); if (u !== undefined) take(Math.max(EDGE, u - (f === pitFeature ? 3 : 5)), f === pitFeature ? 'pit lane' : 'another track'); }
      else if (f.kind === 'hard') {
        if (us.length % 2) continue; // (the track is drawn through it: a forest mapped over the whole park says nothing)
        const u = us.find(u => u > EDGE - 2);
        if (u !== undefined) take(u, f.tags.building || f.tags.leisure === 'bleachers' ? 'building' : 'trees or water');
      } else {
        const inside = us.length % 2 === 1, at = inside ? [0, ...us] : us;
        for (let k = 0; k + 1 < at.length; k += 2) soft.push([at[k], at[k + 1], f.kind]);
      }
    }
    // (the lap itself, coming back past: half the gap each)
    for (let j = 0; j < NSEG; j += 1) {
      const gap = Math.min(Math.abs(j - i), NSEG - Math.abs(j - i)) * 4;
      if (gap < 60) continue;
      const a = MAPL[j], b = MAPL[(j + 1) % NSEG], ex = b[0] - a[0], ey = b[1] - a[1], den = nx * ey - ny * ex;
      if (Math.abs(den) < 1e-12) continue;
      const u = ((a[0] - cx) * ey - (a[1] - cy) * ex) / den, v = ((a[0] - cx) * ny - (a[1] - cy) * nx) / den;
      if (u > 0 && v >= 0 && v < 1 && u < 2 * REACH) take(Math.max(EDGE, u / 2), 'the track itself');
    }
    // the gravel and aprons out from the track's edge, one after another (grass between them counts, a gap
    // of 4 m does not break them): where the last of them ends is as far as the run-off goes, if nothing
    // mapped stops a car sooner, or only something a long way beyond
    soft = soft.filter(v => v[1] > EDGE - 1).sort((a, b) => a[0] - b[0]);
    // (the mapped gravel the ray goes through first, for the level's "gravel": [near, far] m from the centre line)
    const bed = soft.find(v => v[2] === 'trap' && v[1] - Math.max(v[0], EDGE - 1) > 1.5);
    let reach = EDGE + 3, paved = 0, any = false;
    for (const [from, to, kind] of soft) {
      if (from > reach + 4) break;
      if (to > reach) { if (kind !== 'grass') { paved = Math.max(paved, to); any = true; } reach = to; }
    }
    if (RO.street) { // (a street circuit: its walls stand at the road's edge, but for where a gravel trap or an apron is mapped)
      if (any) { if (paved < limit) { limit = paved; by = 'the trap\'s far edge'; } }
      else { limit = EDGE; by = 'the wall at the road\'s edge'; }
    } else if (any && paved < limit - 10) { limit = paved; by = 'the trap\'s far edge'; }
    else if (limit === Infinity && soft.length && reach > EDGE + 3) { limit = reach; by = 'the grass\'s far edge'; }
    if (limit > REACH) { limit = null; by = 'nothing mapped'; }
    measured[side].push({ limit, by, bed: bed && Math.max(bed[0], EDGE - 1) < (limit ?? Infinity) ? [Math.max(bed[0], EDGE - 1), Math.min(bed[1], limit ?? Infinity)] : null });
    sourceCount[side][by] = (sourceCount[side][by] || 0) + 1;
  }
}
// the level's widths: what is beyond the wall the level draws anyway (HALF from the centre line), no wider
// than the config's most, nor (on the inside of a bend) than the bend leaves room for; where nothing is
// mapped, the nearest sample that has something, if within 40 m, or none
const widths = { left: [], right: [] };
for (const side of ['left', 'right']) {
  const m = measured[side], raw = [];
  for (let i = 0; i < NSEG; i++) {
    let limit = m[i].limit;
    if (limit === null) for (let k = 1; k <= 10 && limit === null; k++) limit = m[(i + k) % NSEG].limit ?? m[(i - k + NSEG) % NSEG].limit;
    let w = limit === null ? 0 : Math.max(0, Math.min(RO.max, limit - HALF));
    let tight = 0;
    for (let k = -4; k <= 4; k++) { const c = curves[(i + k + NSEG) % NSEG]; tight = Math.max(tight, side === 'right' ? c : -c); } // (this side the inside)
    if (tight > 0) w = Math.max(0, Math.min(w, 1 / tight - HALF - 3));
    raw.push(w);
  }
  // (a median of five: one stray wall end is not a change in the run-off; then anything wider for less than
  // `gap` m is shut: a gap between two buildings is not run-off, the wall runs on across it)
  const med = raw.map((_, i) => [-2, -1, 0, 1, 2].map(k => raw[(i + k + NSEG) % NSEG]).sort((a, b) => a - b)[2]);
  const R = Math.round(RO.gap / 8), near = (list, i, pick) => { let v = list[i]; for (let k = -R; k <= R; k++) v = pick(v, list[(i + k + NSEG) % NSEG]); return v; };
  const shut = med.map((_, i) => near(med, i, Math.min));
  for (let i = 0; i < NSEG; i++) widths[side].push(near(shut, i, Math.max));
}
// The level's run-off, from those widths: a wall line that changes gradually. The widths measured every 4 m
// are noisy (a ray catches a tree, a wall end, a gap), and written out as they are they made a stepped,
// ragged wall. So, on each side:
//   1. (a median of five has dropped single stray samples already;) anything under minWidth is none;
//   2. held to change by no more than `taper` m per m (RO.taper, 1: a wall turning away at 45 degrees), by narrowing: the widest line that is
//      nowhere beyond what was measured and nowhere steeper;
//   3. smoothed, on the narrow side: the narrowest within `smooth` m either way (RO.smooth, 12), then a weighted
//      mean reaching no further than that, so the wall is never beyond where the barrier was measured;
//   4. simplified into as few straight tapers as keep within `fit` m (RO.fit, 1.5) of the smoothed line
//      (Douglas-Peucker), a vertex added wherever a taper would be more than `over` m (RO.over, 0.75) wider than measured;
//   5. each taper one stretch { from, to, side, width, end } (see track.js shoulderOn): they join end to end
//      at the same width, so the wall has no steps at all, only gentle changes of angle.
const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const EASE = 25;
const shoulderOf = (stretches, side, s) => {
  let w = 0;
  for (const r of stretches) {
    if (r.side !== side) continue;
    if (s < r.from || s > r.to) continue;
    if (r.end !== undefined) { w = Math.max(w, r.width + (r.end - r.width) * (s - r.from) / (r.to - r.from)); continue; }
    const k = (r.from <= 0 ? 1 : smooth01((s - r.from) / EASE)) * (r.to >= LENGTH ? 1 : 1 - smooth01((s - (r.to - EASE)) / EASE));
    if (k > 0) w = Math.max(w, r.width * k);
  }
  return w;
};
const SM = { smooth: 12, over: 0.75, fit: 1.5, taper: 1, ...RO };
const runoff = [], smoothed = { left: [], right: [] };
for (const side of ['left', 'right']) {
  const at = (list, i) => list[((i % NSEG) + NSEG) % NSEG];
  // (widths has had its median of five already: single stray samples are gone)
  const measuredW = widths[side].map(v => v < RO.minWidth ? 0 : v);
  // (then no part of it may change faster than `taper` m per m: each sample is held down by its neighbours'
  // widths plus what the taper allows over the distance between them. The widest line that is nowhere beyond
  // what was measured and nowhere steeper than that)
  const env = measuredW.slice();
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < 2 * NSEG; i++) env[i % NSEG] = Math.min(env[i % NSEG], at(env, i - 1) + SM.taper * 4);
    for (let i = 2 * NSEG - 1; i >= 0; i--) env[i % NSEG] = Math.min(env[i % NSEG], at(env, i + 1) + SM.taper * 4);
  }
  // (the narrowest within `smooth` m either way; then a weighted mean, twice, reaching no further than that
  // in all: a mean of values none of which is wider than what was measured here cannot be wider either)
  const R = Math.max(2, Math.round(SM.smooth / 4)), r = Math.floor(R / 2);
  let w = env.map((_, i) => { let v = Infinity; for (let k = -R; k <= R; k++) v = Math.min(v, at(env, i + k)); return v; });
  for (let pass = 0; pass < 2; pass++) {
    w = w.map((_, i) => {
      let sum = 0, weight = 0;
      for (let k = -r; k <= r; k++) { const g = 1 - Math.abs(k) / (r + 1); sum += at(w, i + k) * g; weight += g; }
      return sum / weight;
    });
  }
  w = w.map((v, i) => env[i] === 0 || v < 0.4 ? 0 : v);
  smoothed[side] = w;
  // simplified: the vertices kept, round the lap from sample 0 back to it (sample NSEG is sample 0 again)
  const keep = new Set([0, NSEG]), W = (i) => at(w, i);
  for (let i = 0; i < NSEG; i++) if ((W(i) === 0) !== (W(i + 1) === 0)) keep.add(W(i) === 0 ? i : i + 1); // (where it begins and ends: exactly there)
  const split = (i, j) => {
    let worst = 0, k = -1;
    for (let n = i + 1; n < j; n++) {
      const line = W(i) + (W(j) - W(i)) * (n - i) / (j - i), d = Math.max(Math.abs(line - W(n)) - SM.fit, line - at(env, n) - SM.over, W(n) === 0 && line > 0 ? 1 : 0);
      if (d > worst) { worst = d; k = n; }
    }
    if (k < 0) return;
    keep.add(k);
    split(i, k);
    split(k, j);
  };
  { const first = [...keep].sort((x, y) => x - y); for (let n = 0; n + 1 < first.length; n++) split(first[n], first[n + 1]); }
  const vertices = [...keep].sort((x, y) => x - y);
  for (let n = 0; n + 1 < vertices.length; n++) {
    const i = vertices[n], j = vertices[n + 1], width = Math.round(W(i) * 10) / 10, end = Math.round(W(j) * 10) / 10;
    if (width === 0 && end === 0) continue;
    runoff.push({ from: i * 4, to: Math.min(LENGTH, j * 4), side, width, end });
  }
}
runoff.sort((a, b) => a.from - b.from);
// The level's gravel traps (its "gravel": see levels.js and Track.gravelBand): where the map has gravel or sand
// beside the track (TRAP, above: natural=sand, surface=gravel / sand and the like), the bed's near and far edges
// as measured along each ray, in runs of 20 m or more (a gap of 8 m or less does not break one), smoothed over
// 16 m and written as straight pieces 20 m long, each { from, to, side, inner, outer, innerEnd, outerEnd } in m
// outside the level's outer lane edge (LANE_EDGE from the centre line). The engine stops it at the wall anyway
const LANE_EDGE = 3.5, gravel = [];
for (const side of ['left', 'right']) {
  const beds = measured[side].map(m => m.bed), at = (i) => beds[((i % NSEG) + NSEG) % NSEG];
  for (let i = 0; i < NSEG; i++) { // (short gaps bridged, from the beds either side)
    if (beds[i]) continue;
    let a = 0, b = 0;
    for (let k = 1; k <= 2 && !a; k++) if (at(i - k)) a = k;
    for (let k = 1; k <= 2 && !b; k++) if (at(i + k)) b = k;
    if (a && b && a + b <= 3) beds[i] = [0, 1].map(n => (at(i - a)[n] * b + at(i + b)[n] * a) / (a + b));
  }
  let i = Math.max(0, beds.findIndex(b => !b));
  const stop = i + NSEG;
  while (i < stop) {
    if (!at(i)) { i++; continue; }
    let j = i;
    while (j < stop && at(j)) j++;
    if (j - i >= 5) {
      const edge = (n, k) => { // (edge k of the bed at sample n, smoothed within the run)
        let sum = 0, count = 0;
        for (let d = -2; d <= 2; d++) if (n + d >= i && n + d < j) { sum += at(n + d)[k]; count++; }
        return Math.max(0, Math.round((sum / count - LANE_EDGE) * 2) / 2);
      };
      for (let a = i; a < j - 1; a += 5) {
        const b = Math.min(j - 1, a + 5), inner = Math.max(0.5, edge(a, 0)), innerEnd = Math.max(0.5, edge(b, 0)), outer = edge(a, 1), outerEnd = edge(b, 1);
        if (outer - inner < 1 && outerEnd - innerEnd < 1) continue;
        const piece = (from, to) => gravel.push({ from, to, side, inner, outer: Math.max(outer, inner + 0.5), innerEnd, outerEnd: Math.max(outerEnd, innerEnd + 0.5) });
        const from = (a % NSEG) * 4, to = from + (b - a) * 4;
        if (to <= LENGTH) piece(from, to); // (a piece across the line is left out: 20 m of gravel at most)
      }
    }
    i = j;
  }
}
gravel.sort((a, b) => a.from - b.from);
const fit = {};
for (const side of ['left', 'right']) {
  let err = 0, worst = 0;
  let over = 0, steepest = 0;
  for (let i = 0; i < NSEG; i++) { const now = shoulderOf(runoff, side, i * 4), d = Math.abs(now - widths[side][i]); err += d; worst = Math.max(worst, d); over = Math.max(over, now - Math.max(widths[side][i], widths[side][(i + 1) % NSEG], widths[side][(i + NSEG - 1) % NSEG])); steepest = Math.max(steepest, Math.abs(shoulderOf(runoff, side, ((i + 1) % NSEG) * 4) - now) / 4); }
  fit[side] = { over, steepest, mean: err / NSEG, worst, widest: Math.max(...widths[side]), with: widths[side].filter(v => v >= RO.minWidth).length * 4 };
}

// ---------------------------------------------------------------------------------------------------
// grandstands and the pits, from the map
// ---------------------------------------------------------------------------------------------------
const along = (pts) => { // the stretch of the lap a thing lies along, and its side
  const at = pts.map(p => toGame(p)).filter(g => g.far < 120);
  if (!at.length) return null;
  // (round the line: s wraps)
  let ss = at.map(g => ((g.s % LENGTH) + LENGTH) % LENGTH).sort((a, b) => a - b), gapAt = 0, gap = ss[0] + LENGTH - ss[ss.length - 1];
  for (let k = 1; k < ss.length; k++) if (ss[k] - ss[k - 1] > gap) { gap = ss[k] - ss[k - 1]; gapAt = k; }
  const from = ss[gapAt], to = ss[(gapAt - 1 + ss.length) % ss.length];
  const lat = at.reduce((a, g) => a + g.lat, 0) / at.length;
  return { from, to, side: lat > 0 ? 'right' : 'left', off: Math.abs(lat) };
};
const stands = [];
const pushStand = (st, extra = {}) => {
  // (a stretch over the line is two: one to the lap's end, one from its start)
  const parts = st.from <= st.to ? [[st.from, st.to]] : [[st.from, LENGTH], [0, st.to]];
  for (const [a, b] of parts) if (b - a >= 20) stands.push({ from: Math.round(a), to: Math.round(b), side: st.side, ...extra });
};
const densify = (pts) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) { const n = Math.max(1, Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 5)); for (let k = 0; k < n; k++) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n]); } return out; };
if (pitWayId && WAYS.has(pitWayId)) {
  const a = along(densify(wayPts(WAYS.get(pitWayId))));
  if (a) { // (the garages: the middle of the pit lane, not its way in and out)
    const len = (a.to - a.from + LENGTH) % LENGTH, trim = Math.min(120, len * 0.25);
    pushStand({ from: (a.from + trim) % LENGTH, to: (a.to - trim + LENGTH) % LENGTH, side: a.side }, { pits: true });
  }
}
for (const w of WAYS.values()) {
  const t = w.tags || {};
  if (!(t.building === 'grandstand' || t.leisure === 'bleachers' || t.building === 'stands' || t.building === 'bleachers' || t.tourism === 'grandstand')) continue;
  const a = along(densify(wayPts(w)));
  if (!a || a.off > 70) continue;
  if (stands.some(s => s.pits && s.side === a.side && a.from < s.to && s.from < a.to)) continue; // (not on top of the pits)
  pushStand(a);
}
for (const st of CFG.stands || []) stands.push(st);
stands.sort((a, b) => a.from - b.from);

// ---------------------------------------------------------------------------------------------------
// landmarks, where they are
// ---------------------------------------------------------------------------------------------------
const round1 = (v) => Math.round(v * 10) / 10;
const landmarks = [];
for (const l of CFG.landmarks || []) {
  const { ways, area, at, ...rest } = l;
  let { lat, lon } = l;
  delete rest.lat; delete rest.lon;
  if (at !== undefined && WAYS.has(at)) { // (a point: the middle of that way)
    const pts = wayPts(WAYS.get(at)), mid = [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length];
    [lat, lon] = toLL(mid);
  }
  if (lat !== undefined) {
    const g = toGame(toM(lat, lon));
    landmarks.push({ ...rest, x: round1(g.x), z: round1(g.z), s: Math.round(((g.s % LENGTH) + LENGTH) % LENGTH), off: round1(g.lat) });
    continue;
  }
  let lines = [];
  if (ways) lines = ways.filter(id => WAYS.has(id)).map(id => wayPts(WAYS.get(id)));
  else if (area) {
    const rel = RELS.get(area), way = WAYS.get(area);
    lines = l.relation !== false && rel ? rel.members.filter(m => m.type === 'way' && m.role !== 'inner' && WAYS.has(m.ref)).map(m => wayPts(WAYS.get(m.ref))) : way ? [wayPts(way)] : [];
  }
  if (!lines.length) { console.log('  (landmark ' + l.kind + ': not in the map, left out)'); continue; }
  // (ways that join end to end are one line)
  const key = (p) => p[0].toFixed(2) + ',' + p[1].toFixed(2);
  let joined = true;
  while (joined && lines.length > 1) {
    joined = false;
    outer: for (let a = 0; a < lines.length; a++) for (let b = 0; b < lines.length; b++) {
      if (a === b) continue;
      const A = lines[a], B = lines[b];
      if (key(A[A.length - 1]) === key(B[0])) { lines[a] = [...A, ...B.slice(1)]; lines.splice(b, 1); joined = true; break outer; }
      if (key(A[A.length - 1]) === key(B[B.length - 1])) { lines[a] = [...A, ...[...B].reverse().slice(1)]; lines.splice(b, 1); joined = true; break outer; }
      if (key(A[0]) === key(B[0])) { lines[a] = [...[...B].reverse(), ...A.slice(1)]; lines.splice(b, 1); joined = true; break outer; }
    }
  }
  // (thinned to a point every `every` m or so: an outline need not keep every node)
  const every = l.every ?? 12;
  delete rest.every;
  const paths = lines.map(line => {
    const out = [];
    let last = null;
    line.forEach((p, i) => { if (!last || i === line.length - 1 || Math.hypot(p[0] - last[0], p[1] - last[1]) >= every) { const g = toGame(p); out.push([round1(g.x), round1(g.z)]); last = p; } });
    return out;
  });
  landmarks.push({ ...rest, paths });
}

// ---------------------------------------------------------------------------------------------------
// the report, the picture, the level
// ---------------------------------------------------------------------------------------------------
console.log(`${ID}: ${poly.length} nodes round the lap; ${LAP.toFixed(0)} m on the map` + (CFG.realLength ? ` (the real lap: ${CFG.realLength} m, ${((LAP / CFG.realLength - 1) * 100).toFixed(2)}% off)` : '') +
  `; the level's lap ${LENGTH} m in ${NSEG} segments, ${TURNS > 0 ? 'anticlockwise' : 'clockwise'}`);
console.log(`  closes ${closure.off.toFixed(3)} m and ${closure.turned.toFixed(5)} rad off; tightest bend ${tightest.toFixed(1)} m (${clamped.filter(Boolean).length} segments held to ${RMIN} m); ` +
  `the level's lap drifts ${drift.toFixed(1)} m at most from the map's`);
if (elevation) console.log(`  heights: SRTM ${elevation.srtmMin} to ${elevation.srtmMax} m; the level climbs ${elevation.range.toFixed(1)} m from its lowest to its highest, steepest grade ${(elevation.steepest * 100).toFixed(1)}%` +
  ` (${elevation.over.toFixed(2)} m left over a lap, spread round by track.js)`);
else console.log('  heights: none (flat)');
const kinds = {};
for (const f of features) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
console.log('  beside the track on the map: ' + Object.entries(kinds).map(([k, n]) => n + ' ' + k).join(', '));
for (const side of ['left', 'right']) {
  console.log(`  ${side}: limit set by ` + Object.entries(sourceCount[side]).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / NSEG * 100).toFixed(0)}%`).join(', '));
  { const mine = gravel.filter(g => g.side === side); console.log(`    gravel mapped along ${mine.reduce((sum, g) => sum + g.to - g.from, 0)} m (${mine.length} pieces)` + (mine.length ? ': ' + mine.reduce((runs, g) => { const last = runs[runs.length - 1]; if (last && last[1] === g.from) last[1] = g.to; else runs.push([g.from, g.to]); return runs; }, []).map(r => r.join('-')).join(', ') : '')); }
  console.log(`    run-off over ${fit[side].with} m of the lap, widest ${fit[side].widest.toFixed(1)} m; ${runoff.filter(r => r.side === side).length} stretches, ` +
    `off what was measured by ${fit[side].mean.toFixed(2)} m on average, ${fit[side].worst.toFixed(1)} m at worst; never wider than measured by more than ${fit[side].over.toFixed(2)} m; ` +
    `the wall line turns in or out by ${fit[side].steepest.toFixed(2)} m per m at its steepest`);
}
console.log(`  ${stands.length} stands (${stands.filter(s => s.pits).length} the pits), ${landmarks.length} landmarks`);

{ // the picture
  const pad = 80, x0 = trackBox[0] - pad, y1 = trackBox[3] + pad, W = trackBox[2] - trackBox[0] + 2 * pad, Hh = trackBox[3] - trackBox[1] + 2 * pad;
  const P = (p) => (p[0] - x0).toFixed(1) + ',' + (y1 - p[1]).toFixed(1);
  const style = { grass: 'fill="#cfe8b0"', trap: 'fill="#f0d98a"', apron: 'fill="#b9bcc4"', hard: 'fill="#7fa37a"', barrier: 'fill="none" stroke="#d1242f" stroke-width="0.8"', raceway: 'fill="none" stroke="#888" stroke-width="3"', hardline: 'fill="none" stroke="#3d7a3a" stroke-width="1"' };
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${Hh.toFixed(0)}" width="${Math.min(4000, W * 2).toFixed(0)}"><rect width="100%" height="100%" fill="#f4f4ee"/>`];
  for (const kind of ['grass', 'hard', 'apron', 'trap', 'raceway', 'hardline', 'barrier']) {
    for (const f of features) if (f.kind === kind) out.push(`<path d="${f.edges.map(e => 'M' + P([e[0], e[1]]) + 'L' + P([e[2], e[3]])).join('')}" ${f.closed ? style[kind].replace('fill=', 'fill-rule="evenodd" fill=') : style[kind]}${f.closed ? '' : ''}/>`);
  }
  // (closed outlines drawn again as filled shapes: the edges above are only their lines)
  const fills = [];
  for (const kind of ['grass', 'hard', 'apron', 'trap']) for (const f of features) if (f.kind === kind && f.id[0] === 'w') fills.push(`<polygon points="${wayPts(WAYS.get(+f.id.slice(1))).map(P).join(' ')}" ${style[kind]} opacity="0.8"/>`);
  out.splice(1, 0, ...fills);
  out.push(`<polyline points="${[...MAPL, MAPL[0]].map(P).join(' ')}" fill="none" stroke="#33363c" stroke-width="${2 * HALF}" stroke-linejoin="round" opacity="0.85"/>`);
  for (const side of ['left', 'right']) {
    const sgn = side === 'left' ? 1 : -1, pt = (i, d) => [MAPL[i][0] - Math.sin(MAPL[i][2]) * sgn * d, MAPL[i][1] + Math.cos(MAPL[i][2]) * sgn * d];
    const dots = [];
    for (let i = 0; i < NSEG; i++) if (measured[side][i].limit !== null) dots.push(`<circle cx="${P(pt(i, measured[side][i].limit)).replace(',', '" cy="')}" r="0.9"/>`);
    out.push(`<g fill="#1f6feb">${dots.join('')}</g>`);
    const line = [];
    for (let i = 0; i <= NSEG; i++) line.push(P(pt(i % NSEG, HALF + shoulderOf(runoff, side, (i % NSEG) * 4))));
    out.push(`<polyline points="${line.join(' ')}" fill="none" stroke="#f08c00" stroke-width="1"/>`);
    // (and the level's gravel: each piece's four corners, in brown)
    for (const g of gravel.filter(g => g.side === side)) {
      const a = Math.round(g.from / 4) % NSEG, b = Math.round(g.to / 4) % NSEG;
      out.push(`<polygon points="${[pt(a, LANE_EDGE + g.inner), pt(a, LANE_EDGE + g.outer), pt(b, LANE_EDGE + g.outerEnd), pt(b, LANE_EDGE + g.innerEnd)].map(P).join(' ')}" fill="#8a5a2b" opacity="0.55"/>`);
    }
  }
  for (let i = 0; i < NSEG; i += 50) out.push(`<text x="${P(MAPL[i]).replace(',', '" y="')}" font-size="9" fill="#fff" text-anchor="middle">${i * 4}</text>`);
  out.push('</svg>');
  writeFileSync(here(`./circuits/out/${ID}.svg`), out.join('\n'));
}

// the level file: what it has is kept, but for what is made here
const levelPath = here(`../src/delivery/levels/${ID}.json`);
const old = existsSync(levelPath) ? JSON.parse(readFileSync(levelPath, 'utf8')) : {};
const segments = [];
for (let i = 0; i < NSEG; i++) {
  const last = segments[segments.length - 1], seg = { length: 4, curve: curves[i] || 0, ...(grades[i] ? { grade: grades[i] } : {}) };
  if (last && last.curve === seg.curve && (last.grade || 0) === (seg.grade || 0)) last.length += 4; else segments.push(seg);
}
const pickups = [];
{ // a wrench every sixth of the lap or so, clear of the start, in one lane then the other
  const n = Math.max(3, Math.round(LENGTH / 1000));
  for (let k = 0; k < n; k++) pickups.push({ type: 'wrench', s: Math.round((k + 0.6) * LENGTH / n / 10) * 10, lane: k % 2 });
}
const level = {
  id: ID, name: old.name || CFG.name || ID, theme: old.theme || ID, car: 'f1', flow: 'north', lanes: 2, shoulder: 2.5,
  shoulderTimer: false, clock: old.clock || { good: 300, evil: 210 }, tip: old.tip || 400, traffic: {}, trafficCount: 0, oncomingCount: 0, laps: old.laps || 3,
  grid: old.grid || { count: 39, kind: 'f1', gap: 7, pace: { min: 0.96, max: 1.02 } }, noPackages: true, understeer: true, wallDamage: true, nudge: true,
  ...Object.fromEntries(Object.entries(old).filter(([k]) => !['segments', 'runoff', 'gravel', 'stands', 'landmarks', 'pickups'].includes(k))),
  ...(CFG.level || {}),
  runoff, ...(gravel.length ? { gravel } : {}), stands, landmarks, pickups, segments,
};
const one = (v) => JSON.stringify(v).replace(/([{,])"/g, '$1 "').replace(/":/g, '": ').replace(/}/g, ' }').replace(/{ {2}/g, '{ ').replace(/\[ "/g, '["').replace(/,(\S)/g, ', $1').replace(/{ +}/g, '{}');
const text = '{\n' + Object.entries(level).map(([k, v]) =>
  Array.isArray(v) && v.length && typeof v[0] === 'object' ? `  "${k}": [\n` + v.map(item => '    ' + one(item)).join(',\n') + '\n  ]' : `  "${k}": ${one(v)}`).join(',\n') + '\n}\n';
JSON.parse(text);
if (flag('dry')) console.log('  (dry run: the level is not written)');
else { writeFileSync(levelPath, text); console.log('  written: src/delivery/levels/' + ID + '.json (' + segments.length + ' segments, ' + runoff.length + ' run-off stretches)'); }
