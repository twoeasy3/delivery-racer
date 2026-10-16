// A window pane's corners in the model editor's side view (CHECKLIST 336: "Genuinely don't know which corner"): their names as drawn
// (nose to the right: +z is the front, +y up), and a nudge by a step. Pure (no DOM, no three.js): the editor (modeleditor.js
// paneEditor / wirePaneEditor) draws and moves the corners with it, scripts/.editor-mirror-check.mjs checks it. Editor-only: no game
// (logic) file imports it, so it is outside the replay fingerprint.

export const CORNER_NAMES = ['front-top', 'rear-top', 'rear-bottom', 'front-bottom'];
const DIRS = { 'front-top': [1, 1], 'rear-top': [-1, 1], 'rear-bottom': [-1, -1], 'front-bottom': [1, -1] };

// each corner's name: the four corner names go to the corners furthest that way (each name once, the best fit first, the outline's box
// taken as a square so a long low pane is named as it looks); any other corner is named by its side ('top', 'rear'...). 3 corners: three names.
export const cornerNames = (pts) => {
  const n = pts.length;
  if (!n) return [];
  const zs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const zc = (Math.min(...zs) + Math.max(...zs)) / 2, yc = (Math.min(...ys) + Math.max(...ys)) / 2;
  const hz = Math.max(1e-6, (Math.max(...zs) - Math.min(...zs)) / 2), hy = Math.max(1e-6, (Math.max(...ys) - Math.min(...ys)) / 2);
  const uv = pts.map(([z, y]) => [(z - zc) / hz, (y - yc) / hy]);
  const pairs = [];
  for (const name of CORNER_NAMES) uv.forEach(([u, v], i) => pairs.push({ name, i, s: u * DIRS[name][0] + v * DIRS[name][1] }));
  pairs.sort((a, b) => b.s - a.s || a.i - b.i);
  const out = new Array(n).fill(null), used = new Set();
  for (const p of pairs) if (out[p.i] === null && !used.has(p.name)) { out[p.i] = p.name; used.add(p.name); }
  return out.map((name, i) => name ?? (Math.abs(uv[i][1]) >= Math.abs(uv[i][0]) ? (uv[i][1] >= 0 ? 'top' : 'bottom') : (uv[i][0] >= 0 ? 'front' : 'rear')));
};

// the steps a nudge button moves a corner by (metres), the middle one the default
export const NUDGE_STEPS = [0.005, 0.01, 0.05];
export const stepWords = (s) => (s < 0.01 ? Math.round(s * 1000) + ' mm' : Math.round(s * 100) + ' cm');

// a corner nudged: 'front' / 'rear' along the car, 'up' / 'down'; a screen's foot or top ('edge' given: its pillar, [[z, y], [z, y]])
// slides along the pillar by the step (up the slope for 'up'), so it stays on it. To the millimetre. The caller still clamps it.
export const nudged = ([z, y], dir, step, edge = null) => {
  const r = (q) => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
  if (edge) {
    let dz = edge[1][0] - edge[0][0], dy = edge[1][1] - edge[0][1];
    const l = Math.hypot(dz, dy) || 1;
    if (dy < 0) { dz = -dz; dy = -dy; }
    const s = dir === 'up' ? step : dir === 'down' ? -step : 0;
    return r([z + dz / l * s, y + dy / l * s]);
  }
  return r([z + (dir === 'front' ? step : dir === 'rear' ? -step : 0), y + (dir === 'up' ? step : dir === 'down' ? -step : 0)]);
};
