// ============================================================================
// THE LEVEL EDITOR (delivery/editor.html): a level from above, with a control for every field a level can
// have. Everything it knows of a level's fields comes from the level schema (levelSchema.js): the forms, the
// place-buttons, what a new entry starts as, how each thing is drawn on the map and dragged about it, and the
// rules shown while editing. A field added to the schema is in the editor with nothing more done here.
//   Level, Road   the level-wide settings, each a control of its own; the road as a table of its segments
//   Place         a button for everything that can be placed (grouped, searched): click the road (or a side
//                 road) to put one down; a stretch is a band beside the road, dragged by its ends, a point a
//                 marker dragged along it, a landmark a ring in the world beside it
//   List          what is shown on the map, and everything in the level to pick from
//   JSON          the whole level as JSON: the fallback for anything the forms lack
// The selected thing's form is over the map, with its rules and what is wrong with it; the problems the game
// (Track.problems) and the schema find are listed under the map, each a link to its cause.
// The main road is drawn from the level's segments; its side roads are laid out by the game's own Track, so
// they are where the game puts them. "Play it" opens the game on the level as it stands (?edited: see main.js;
// a hidden level, so nothing is saved), "Play from here" at a spot on it, and "Download .json" saves it, to
// drop into ./levels. The level is kept in local storage as it is edited (autosave), with undo and redo.
// For a picture of it (scripts/shots.mjs), the address can say what to show: editor.html?level=<id>&tab=place
// &q=<search>&tool=<field>[:<kind>]&click=<m>[:<lat>]&sideclick=<exit>:<m>&sel=<field>:<n>&zoom=<m>:<px a metre>&hide=a,b
// and, to try the mouse and the history without one: &drag=<field>:<n>:<grab p|a|b|move>:<m to move it> &seglen=<segment>:<m>
// &bend=<segment>:<m on>:<m to the right> &undo=<times> &redo=<times>
// ============================================================================
import './editor.css';
import { CONFIG } from './config.js';
import { LEVELS, HIDDEN_LEVELS, levelLabel, selectSpecial } from './levels.js';
import { levelName, withWords } from './levelText.js';
import { buildTrack, Track } from './track.js';
import { THEMES } from './themes.js';
import { PICKUP_COLOR } from './render/pickupModels.js';
import { closeLoop, roadEnd } from './levelSchema.js';
import { FIELDS, GROUPS, RULES, isPlaced, isList, entriesOf, placeOf, spanOf, triggerOf, makeEntry, roadFacts, brokenRules, checkLevel, loadLevel, saveLevel,
  asSetting, choiceValue, choiceLabel } from './levelSchema.js';
import { h, fill, control, settingsForm } from './editorForms.js';

const $ = (id) => document.getElementById(id);
const view3d = $('view3d'); // (the 3D view: see show3d)
// (something going wrong in the editor itself is said in the panel, not only in the console)
window.addEventListener('error', (e) => { $('status').textContent = 'The editor hit an error: ' + e.message + ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')'; $('status').classList.add('bad'); });
const LW = CONFIG.laneWidth, STEP = 2; // m between the points the road is drawn through
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STORE = 'delivery_editor_level'; // (where "Play it" leaves the level for the game: see main.js)
const AUTOSAVE = 'delivery_editor_autosave'; // (the level being edited, kept as it changes)
const params = new URLSearchParams(location.search);
const PLACED = Object.keys(FIELDS).filter(k => isPlaced(FIELDS[k]));
const ITEMS = PLACED.filter(k => FIELDS[k].group === 'items');
// the rules that depend on where a thing is (the rest are true or not of the whole level)
const SPAN_RULES = ['straight', 'level', 'clearOfExits', 'clearOfEnds', 'noBridge', 'noFlyovers'];

// ---- the level being edited ----------------------------------------------------------------------
// (a built-in level is opened with its words in it, levelText.json's if they are kept there: withWords. So the
// forms show them, and a level downloaded from here carries its own name and description: its file stands by itself)
const sources = [
  ...LEVELS.map((l, i) => [`${levelLabel(i)}. ${levelName(l)}`, withWords(l)]),
  ...Object.entries(HIDDEN_LEVELS).map(([id, l]) => [`Hidden: ${levelName(l)} (${id})`, withWords(l)]),
];
const BLANK = { id: 'new-level', name: 'New Level', clock: { good: 150, evil: 115 }, tip: 50, lanes: 4,
  traffic: { darkvan: 0.4, commuter: 0.2, van: 0.2, bus: 0.1, police: 0.05 },
  segments: [{ length: 600, curve: 0 }, { length: 300, curve: 0.003 }, { length: 600, curve: 0 }] };
let level, sel = null, tool = { kind: 'select' }; // (sel: { key, i }, i -1 for a field that is one entry, not a list)
let facts = null; // (the level's road, for the rules: see roadFacts)
const hidden = new Set(); // (the fields not shown on the map)
const entry = (ref) => (ref.i < 0 ? level[ref.key] : (level[ref.key] || [])[ref.i]);
const each = (key, f) => entriesOf(level, key).forEach((e, n) => f(e, isList(FIELDS[key]) ? n : -1));

// ---- the road's geometry -----------------------------------------------------------------------
// the centre line through every STEP m, x across and y up the map, h its heading (0: up the map)
let points = [];
const lanesOf = () => {
  const L = level.lanes ?? CONFIG.laneCount;
  return typeof L === 'object' ? { left: L.south ?? 0, right: L.north ?? 0 } : { left: Math.floor(L / 2), right: L - Math.floor(L / 2) };
};
const HM = () => (level.median || 0) * LW / 2;
const laneLat = (lane) => { // across the road, + to the right (as Track.laneOffset, on the main road)
  if (lane === 'left') return edges()[0] - shoulder() / 2; // (the shoulders)
  if (lane === 'right') return edges()[1] + shoulder() / 2;
  const { left } = lanesOf(), M = level.median || 0;
  if (lane < left) return -(HM() + (left - 1 - lane + 0.5) * LW);
  return HM() + (lane - left - M + 0.5) * LW;
};
const laneCount = () => { const { left, right } = lanesOf(); return left + right + (level.median || 0); };
const edges = () => { const { left, right } = lanesOf(); return [-(HM() + left * LW), HM() + right * LW]; };
const shoulder = () => level.shoulder ?? CONFIG.shoulder;
const build = () => {
  points = [];
  let x = 0, y = 0, hd = 0, s = 0;
  points.push({ s, x, y, h: hd });
  for (const seg of level.segments || []) {
    for (let d = 0; d < seg.length; d += STEP) {
      const step = Math.min(STEP, seg.length - d);
      hd += (seg.curve || 0) * step;
      x += Math.sin(hd) * step;
      y += Math.cos(hd) * step;
      s += step;
      points.push({ s, x, y, h: hd });
    }
  }
};
const length = () => (points.length ? points[points.length - 1].s : 0);
// how far the oncoming side of the road has parted from the player's at s (a level's "splits": see Track.apart)
const apartAt = (s) => (Track && Track.apart && (level.splits || []).length ? Track.apart(s) : 0);
const at = (s, lat = 0) => { // a point on the map, s along the road and lat across it
  const p = points[clamp(Math.round(s / STEP), 0, points.length - 1)];
  if (lat < -HM()) lat -= apartAt(s);
  return { x: p.x + Math.cos(p.h) * lat, y: p.y - Math.sin(p.h) * lat };
};
const nearest = (x, y) => { // the road's nearest point to a map point: s along it, lat across it
  let best = null, bestD = Infinity;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  let lat = (x - best.x) * Math.cos(best.h) - (y - best.y) * Math.sin(best.h), off = Math.sqrt(bestD);
  const gap = apartAt(best.s);
  if (gap && lat < -HM() - gap / 2) { lat += gap; off = Math.abs(lat); } // (on the side that has parted)
  return { s: best.s, lat, off };
};
const nearestLane = (lat) => { // (or shoulder: 'left' | 'right')
  const [a, b] = edges();
  if (lat < a) return 'left';
  if (lat > b) return 'right';
  let best = 0;
  for (let k = 1; k < laneCount(); k++) if (Math.abs(laneLat(k) - lat) < Math.abs(laneLat(best) - lat)) best = k;
  return best;
};
// ---- the side roads: the level laid out by the game's own Track (see track.js), for what the editor doesn't
// work out for itself: each exit's side road and flyovers, as the game will have them, and the problems the
// game finds with the level. On the map a point of the game's world is (-x, z): the map has right to the right
let sideRoads = [], problems = [], laid = false;
const mapPoint = (s, lat) => { const p = {}; Track.toWorld(s, lat, p); return { x: -p.x, y: p.z }; };
const survey = () => {
  sideRoads = [];
  problems = [];
  laid = false;
  try {
    selectSpecial(saveLevel(level)); // (a copy: the game's level is never the editor's own)
    buildTrack();
  } catch (error) {
    problems = ['the game could not lay this level out: ' + error.message];
    return;
  }
  laid = true;
  problems = Track.problems;
  const FLY = CONFIG.ramps.flyoverLength;
  sideRoads = Track.exits.map((x, i) => {
    const rows = [];
    for (let d = 0; ; d = Math.min(x.length, d + 4)) {
      const a = x.side0 + d, loLat = Track.lo(a), hiLat = Track.hi(a);
      rows.push({ d, loLat, hiLat, lo: mapPoint(a, loLat), laneLo: mapPoint(a, Track.laneLo(a)), mid: mapPoint(a, 0), laneHi: mapPoint(a, Track.laneHi(a)), hi: mapPoint(a, hiLat) });
      if (d >= x.length) break;
    }
    const flyovers = !x.flyovers ? [] : [x.flyA0, x.flyB0].map(from => {
      const line = [];
      for (let d = 0; d <= FLY; d += 6) line.push(mapPoint(from + d, 0));
      return line;
    });
    // (how far along it the level's own segments run, before the game's curve to the merge takes over)
    const own = ((level.exits[i] || {}).segments || []).reduce((sum, seg) => sum + (seg.length || 0), 0);
    return { x, i, rows, flyovers, own };
  });
};
// the point of a side road nearest a map point: { road, d (m along it), lat (m across it), off (m from its middle) }, or null
const nearestSide = (mx, my, only) => {
  let best = null;
  for (const road of sideRoads) {
    if (only !== undefined && road.i !== only) continue;
    for (const row of road.rows) {
      const off = Math.hypot(row.mid.x - mx, row.mid.y - my);
      if (!best || off < best.off) best = { road, row, d: row.d, off };
    }
  }
  if (best) { // (across it: how far along the line from its low edge to its high one)
    const { lo, hi, loLat, hiLat } = best.row, w2 = (hi.x - lo.x) ** 2 + (hi.y - lo.y) ** 2 || 1;
    best.lat = loLat + ((mx - lo.x) * (hi.x - lo.x) + (my - lo.y) * (hi.y - lo.y)) / w2 * (hiLat - loLat);
  }
  return best;
};
const sideOf = (e) => (e.road === 'side' ? (laid && Track.exits[e.exit || 0]) || null : null);
// a point of the map for an entry: s along its own road (the expressway, or its side road) and lat across it
const P = (e, s, lat) => {
  const x = sideOf(e);
  return x ? mapPoint(x.side0 + clamp(s, 0, x.length), lat) : at(s, lat);
};
// the edges of an entry's road at s: [pavement's low edge, lanes' low edge, lanes' high edge, pavement's high edge]
const acrossAt = (e, s) => {
  const x = sideOf(e);
  if (x) { const a = x.side0 + clamp(s, 0, x.length); return [Track.lo(a), Track.laneLo(a), Track.laneHi(a), Track.hi(a)]; }
  const [a, b] = edges();
  return [a - shoulder(), a, b, b + shoulder()];
};
const laneAcross = (e, lane, s) => {
  const x = sideOf(e), [lo, laneLo, laneHi, hi] = acrossAt(e, s);
  if (lane === 'left') return (lo + laneLo) / 2;
  if (lane === 'right') return (hi + laneHi) / 2;
  if (x) return Track.laneOffset(Math.round(lane), x.side0 + clamp(s, 0, x.length));
  return (laneLat(Math.floor(lane)) + laneLat(Math.ceil(lane))) / 2;
};
// across its road, where an entry's marker goes: in its lane (or the middle of its lanes), on its side, or down the middle
const latOf = (key, e, s) => {
  const S = FIELDS[key].settings || {}, [lo, laneLo, laneHi, hi] = acrossAt(e, s);
  const lane = S.lane && e.lane !== undefined ? e.lane : S.gap && e.gap !== undefined ? e.gap : S.lanes && Array.isArray(e.lanes) && e.lanes.length ? (e.lanes[0] + e.lanes[e.lanes.length - 1]) / 2 : undefined;
  if (lane !== undefined) return laneAcross(e, lane, s);
  const side = typeof e.side === 'string' ? e.side : key === 'wreckage' && typeof e.from === 'string' ? e.from : key === 'parkedPlanes' ? 'left' : null;
  const out = key === 'targets' ? CONFIG.targetOffset * 0.5 : key === 'parkedPlanes' ? Math.min(e.d || 0, 60) : 0;
  if (side === 'left') return lo - out;
  if (side === 'right') return hi + out;
  return sideOf(e) ? (laneLo + laneHi) / 2 : 0;
};
// the lanes to offer for a setting of an entry, knowing the road where the entry is: [{ value, label }]
const whereOf = (key, e) => { const place = placeOf(FIELDS[key], e); return place && (place.type === 'stretch' || place.type === 'point') ? e[place.a || place.p] : 0; };
const laneOptions = (e, S, s = 0) => {
  const x = sideOf(e), out = [];
  if (S.shoulders) out.push({ value: 'left', label: 'left shoulder' });
  if (x) {
    for (let l = 0; l < 4; l++) if (Track.openLane(l, x.side0 + clamp(s, 0, x.length)) === l) out.push({ value: l, label: l + (l === 0 && x.oncoming && s >= x.oncomingFrom ? ': oncoming' : ': the player\'s way') });
  } else {
    const f = facts || roadFacts(level);
    for (let l = 0; l < f.lanes; l++) {
      const mine = l >= f.playerFirst && l < f.playerFirst + f.playerLanes, median = !f.oneWay && f.flow !== 'mixed' && l >= f.left && l < f.left + f.median;
      if (S.player && !mine) continue;
      const shut = laid && !median && s >= 0 && s <= length() && Track.openLane(l, s) !== l;
      out.push({ value: l, label: l + (median ? ': median' : f.flow === 'mixed' ? ': both ways' : mine ? ': the player\'s way' : ': oncoming') + (shut ? ' (closed here)' : '') });
    }
  }
  if (S.shoulders) out.push({ value: 'right', label: 'right shoulder' });
  return out;
};
// the lane (or shoulder) of an entry's road nearest a place across it, of those the setting allows
const laneNear = (e, S, s, lat) => {
  const options = laneOptions(e, S, s).filter(o => typeof o.value === 'number' && !o.label.includes('closed') && !o.label.includes('median'));
  const [, laneLo, laneHi] = acrossAt(e, s);
  if (S.shoulders && lat < laneLo) return 'left';
  if (S.shoulders && lat > laneHi) return 'right';
  let best = options[0];
  for (const o of options) if (Math.abs(laneAcross(e, o.value, s) - lat) < Math.abs(laneAcross(e, best.value, s) - lat)) best = o;
  return best ? best.value : 0;
};

// ---- what is on the map: every placed entry of the level, by the schema. A stretch is a band beside its
// road (a row of its own for each field; on the left for one that is on the left), a point a marker on it
// (in its lane, or on its side), a landmark a ring where it is in the world.
const hue = (key) => { let v = 0; for (const c of key) v = (v * 31 + c.charCodeAt(0)) % 360; return v; };
const colour = (key, alpha = 1) => `hsla(${hue(key)}, 75%, 62%, ${alpha})`;
const same = (a, b) => a && b && a.key === b.key && a.i === b.i;
let bandRows = []; // the fields that have a stretch on the map, in the order of their rows
const rowsOf = () => { bandRows = PLACED.filter(k => !hidden.has(k) && entriesOf(level, k).some(e => (placeOf(FIELDS[k], e) || {}).type === 'stretch')); };
const bandLat = (key, e, s) => {
  const row = Math.max(0, bandRows.indexOf(key)), [lo, , , hi] = acrossAt(e, s), off = (14 + row * 11) / view.k;
  return e.side === 'left' ? lo - off : hi + off;
};
// a stretch's band, as points on the canvas
const bandLine = (key, e, place) => {
  const x = sideOf(e), max = x ? x.length : length(), from = clamp(e[place.a], 0, max), to = clamp(e[place.b], 0, max), line = [];
  const step = Math.max(x ? 4 : STEP, 3 / view.k);
  for (let s = from; s < to; s += step) { const q = P(e, s, bandLat(key, e, s)); line.push(toScreen(q.x, q.y)); }
  const q = P(e, to, bandLat(key, e, to));
  line.push(toScreen(q.x, q.y));
  return line;
};
const markerAt = (key, e, place) => { const s = e[place.p], q = P(e, s, latOf(key, e, s)); return toScreen(q.x, q.y); };
const worldAt = (e) => toScreen(-e.x, e.z);
const usable = (e) => e.road !== 'side' || !!sideOf(e); // (an entry on a side road that isn't there can't be shown)

// ---- the map -------------------------------------------------------------------------------------
const canvas = $('map'), pen = canvas.getContext('2d');
let view = { ox: 0, oy: 0, k: 1 }; // map point at the canvas's middle, and pixels a metre
const toScreen = (x, y) => [canvas.width / 2 + (x - view.ox) * view.k, canvas.height / 2 - (y - view.oy) * view.k];
const toMap = (px, py) => [view.ox + (px - canvas.width / 2) / view.k, view.oy - (py - canvas.height / 2) / view.k];
const size = () => { const w = canvas.clientWidth, ht = canvas.clientHeight; if (w && ht && (canvas.width !== w || canvas.height !== ht)) { canvas.width = w; canvas.height = ht; } };
const fit = () => {
  size();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of [...points, ...sideRoads.flatMap(r => r.rows.map(row => row.mid))]) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  view = { ox: (x0 + x1) / 2, oy: (y0 + y1) / 2, k: Math.min(canvas.width / (x1 - x0 + 160), canvas.height / (y1 - y0 + 160)) };
};
const ribbon = (from, to, color, s0 = 0, s1 = length()) => { // the road between two offsets across it, from s0 to s1 along it
  const part = points.filter(p => p.s >= s0 && p.s <= s1);
  if (part.length < 2) return;
  pen.beginPath();
  part.forEach((p, i) => { const q = at(p.s, from), [sx, sy] = toScreen(q.x, q.y); if (i) pen.lineTo(sx, sy); else pen.moveTo(sx, sy); });
  for (let i = part.length - 1; i >= 0; i--) { const q = at(part[i].s, to); pen.lineTo(...toScreen(q.x, q.y)); }
  pen.fillStyle = color;
  pen.fill();
};
const lineAlong = (lat, color, dash = []) => {
  pen.beginPath();
  points.forEach((p, i) => { const q = at(p.s, lat), [sx, sy] = toScreen(q.x, q.y); if (i) pen.lineTo(sx, sy); else pen.moveTo(sx, sy); });
  pen.strokeStyle = color;
  pen.setLineDash(dash);
  pen.lineWidth = 1;
  pen.stroke();
  pen.setLineDash([]);
};
const across = (s, color, width) => { // a line across the road at s
  const [a, b] = edges(), p = at(s, a - shoulder()), q = at(s, b + shoulder());
  pen.beginPath(); pen.moveTo(...toScreen(p.x, p.y)); pen.lineTo(...toScreen(q.x, q.y));
  pen.strokeStyle = color; pen.lineWidth = width; pen.stroke();
};
// a side road: its pavement and lanes, its centre line (yellow with traffic coming the other way, white
// dashes one-way), its flyovers, and its name; the stretch of it the level's own segments lay out is drawn
// lighter than the game's curve on to the merge, with a tick across where the one hands over to the other
const path = (list, get) => list.forEach((row, i) => { const [sx, sy] = toScreen(get(row).x, get(row).y); if (i) pen.lineTo(sx, sy); else pen.moveTo(sx, sy); });
const drawSide = ({ x, i, rows, flyovers, own }) => {
  const band = (list, a, b, color) => {
    if (list.length < 2) return;
    pen.beginPath();
    path(list, r => r[a]);
    path([...list].reverse(), r => r[b]);
    pen.fillStyle = color;
    pen.fill();
  };
  band(rows, 'lo', 'hi', '#3a4150');
  band(rows, 'laneLo', 'laneHi', own ? '#4f5666' : '#5a6272');
  if (own) band(rows.filter(r => r.d <= own + 4), 'laneLo', 'laneHi', '#5a6272');
  pen.lineWidth = 1;
  for (const line of flyovers) {
    pen.beginPath();
    path(line, q => q);
    pen.strokeStyle = '#9aa1ab';
    pen.lineWidth = Math.max(2, LW * view.k);
    pen.stroke();
  }
  if (view.k > 0.6) { // the line between lanes 0 and 1: white dashes, and yellow from where lane 0 turns oncoming
    const R = CONFIG.ramps.ramp, turn = Math.max(R, x.oncomingFrom);
    for (const yellow of [false, true]) {
      const part = rows.filter(r => r.d >= R && r.d <= x.length - R && (yellow ? r.d >= turn - 4 : r.d <= turn) && Track.sideLeft(x.side0 + r.d) > 0.6);
      if (part.length < 2) continue;
      pen.beginPath();
      path(part, r => r.mid);
      pen.strokeStyle = yellow ? 'rgba(255,210,63,.9)' : 'rgba(255,255,255,.35)';
      pen.setLineDash(yellow ? [] : [6, 8]);
      pen.lineWidth = yellow ? 2 : 1;
      pen.stroke();
      pen.setLineDash([]);
    }
  }
  if (x.oncoming) { // the point its lane 0 turns oncoming at: a handle, to drag along it
    const q = mapPoint(x.side0 + clamp(x.oncomingFrom, 0, x.length), 0), [hx, hy] = toScreen(q.x, q.y);
    pen.beginPath();
    pen.moveTo(hx, hy - 7); pen.lineTo(hx + 7, hy); pen.lineTo(hx, hy + 7); pen.lineTo(hx - 7, hy); pen.closePath();
    pen.fillStyle = '#ffd23f';
    pen.fill();
    pen.strokeStyle = '#11151c';
    pen.lineWidth = 1;
    pen.stroke();
    pen.fillStyle = '#ffd23f';
    pen.fillText('oncoming from here', hx + 10, hy + 4);
  }
  const tick = own && rows.find(r => r.d >= own);
  if (tick) {
    pen.beginPath();
    pen.moveTo(...toScreen(tick.lo.x, tick.lo.y));
    pen.lineTo(...toScreen(tick.hi.x, tick.hi.y));
    pen.strokeStyle = '#ffd23f';
    pen.lineWidth = 2;
    pen.stroke();
  }
  const label = rows[Math.floor(rows.length / 2)].lo, [lx, ly] = toScreen(label.x, label.y);
  pen.fillStyle = colour('exits');
  pen.font = '11px system-ui';
  pen.fillText(`side road ${i}: ${Math.round(x.length)} m${x.oncoming ? ', two-way' : ', one-way'}${x.flyovers ? ', flyovers' : ''}`, lx + 6, ly);
};
// where on the expressway the rules of a field (or of the entry selected) forbid it: [[from, to]]
const forbidden = (key) => {
  const f = facts, out = [], rules = FIELDS[key].rules || [];
  if (!f) return out;
  f.segments.forEach((seg, i) => {
    if ((rules.includes('straight') && seg.curve) || (rules.includes('level') && Math.abs(seg.grade || 0) > 0.002)) out.push([f.starts[i], f.starts[i] + seg.length]);
  });
  if (rules.includes('clearOfExits')) out.push(...f.ramps);
  if (rules.includes('clearOfEnds')) out.push([0, 20], [f.length - 20, f.length]);
  if (rules.includes('noBridge')) for (const b of level.bridges || []) out.push([b.from, b.to]);
  return out;
};
const diamond = (sx, sy, r) => { pen.beginPath(); pen.moveTo(sx, sy - r); pen.lineTo(sx + r, sy); pen.lineTo(sx, sy + r); pen.lineTo(sx - r, sy); pen.closePath(); };
const drawEntry = (key, e, i) => {
  const def = FIELDS[key], place = placeOf(def, e), on = same({ key, i }, sel);
  if (!place || !usable(e)) return;
  pen.font = '11px system-ui';
  if (place.type === 'paths') { // (a circuit's lake, stream or old banking: lines in the world)
    for (const line of e.paths) {
      if (!Array.isArray(line) || line.length < 2) continue;
      pen.beginPath();
      line.forEach((q, n) => { const [sx, sy] = toScreen(-q[0], q[1]); if (n) pen.lineTo(sx, sy); else pen.moveTo(sx, sy); });
      pen.strokeStyle = colour(key, on ? 1 : 0.45);
      pen.lineWidth = on ? 3 : 1.5;
      pen.stroke();
    }
    return;
  }
  if (place.type === 'world') { // a landmark: a ring as wide as the room kept round it, a tick the way it faces
    const [sx, sy] = worldAt(e), r = Math.max(7, (e.r || 0) * view.k), rot = e.rot || 0;
    pen.beginPath(); pen.arc(sx, sy, r, 0, Math.PI * 2);
    pen.fillStyle = colour(key, 0.12); pen.fill();
    pen.strokeStyle = on ? '#ffd23f' : colour(key); pen.lineWidth = on ? 3 : 1.5; pen.stroke();
    pen.beginPath(); pen.moveTo(sx, sy); pen.lineTo(sx - Math.sin(rot) * (r + 10), sy - Math.cos(rot) * (r + 10)); pen.stroke();
    pen.beginPath(); pen.arc(sx - Math.sin(rot) * (r + 10), sy - Math.cos(rot) * (r + 10), 4, 0, Math.PI * 2); pen.fillStyle = on ? '#ffd23f' : colour(key); pen.fill();
    pen.fillStyle = colour(key);
    pen.fillText(e.kind || key, sx + 6, sy - 6);
    return;
  }
  if (place.type === 'stretch') {
    const line = bandLine(key, e, place);
    pen.beginPath();
    line.forEach(([sx, sy], n) => { if (n) pen.lineTo(sx, sy); else pen.moveTo(sx, sy); });
    pen.strokeStyle = colour(key, on ? 1 : 0.75);
    pen.lineWidth = on ? 9 : 7;
    pen.lineCap = 'butt';
    pen.stroke();
    if (on) {
      if (!sideOf(e)) { // (and the stretch shaded on the road itself: its lane, its side, or the whole width)
        const [lo, a, b, hi] = acrossAt(e, e[place.a]), S = def.settings || {};
        const from = S.lane && Number.isInteger(e.lane) ? laneLat(e.lane) - LW / 2 : e.side === 'left' ? lo - (e.width || 0) : e.side === 'right' ? b : a;
        const to = S.lane && Number.isInteger(e.lane) ? laneLat(e.lane) + LW / 2 : e.side === 'left' ? a : e.side === 'right' ? hi + (e.width || 0) : b;
        ribbon(from, to, colour(key, 0.4), Math.max(0, e[place.a]), Math.min(length(), e[place.b]));
      }
      for (const [sx, sy] of [line[0], line[line.length - 1]]) { pen.beginPath(); pen.arc(sx, sy, 6, 0, Math.PI * 2); pen.fillStyle = '#ffd23f'; pen.fill(); pen.strokeStyle = '#11151c'; pen.lineWidth = 1; pen.stroke(); }
    }
    if (on || view.k > 1.5 || entriesOf(level, key).length < 12) { pen.fillStyle = colour(key); pen.fillText(def.label, line[0][0] + 6, line[0][1] - 6); }
  } else {
    const [sx, sy] = markerAt(key, e, place);
    if (ITEMS.includes(key)) {
      const r = clamp(view.k * 1.6, 4, 9);
      pen.beginPath();
      if (key === 'obstacles') pen.rect(sx - r, sy - r, r * 2, r * 2); else pen.arc(sx, sy, r, 0, Math.PI * 2);
      pen.fillStyle = key === 'pickups' ? hex(PICKUP_COLOR[e.type] ?? 0xffffff) : key === 'obstacles' ? '#ff8a3d' : 'rgba(57,255,106,.25)';
      pen.fill();
      pen.lineWidth = on ? 3 : 1;
      pen.strokeStyle = on ? '#ffd23f' : key === 'targets' ? '#39ff6a' : '#11151c';
      pen.stroke();
    } else {
      const r = on ? 8 : 6;
      diamond(sx, sy, r);
      pen.fillStyle = colour(key);
      pen.fill();
      pen.strokeStyle = on ? '#ffd23f' : '#11151c';
      pen.lineWidth = on ? 3 : 1;
      pen.stroke();
      if (on || view.k > 1.5 || entriesOf(level, key).length < 12) pen.fillText(def.sub && e[def.sub] ? e[def.sub] : def.label, sx + r + 3, sy + 4);
    }
    // (another spot of its own along the road: a marathon's water station)
    for (const [k, S] of Object.entries(def.settings || {})) {
      if (S.type !== 'metres' || !Number.isFinite(e[k]) || k === place.p || !on) continue;
      const q = P(e, e[k], latOf(key, e, e[k])), [wx, wy] = toScreen(q.x, q.y);
      pen.beginPath(); pen.arc(wx, wy, 5, 0, Math.PI * 2); pen.strokeStyle = colour(key); pen.lineWidth = 2; pen.stroke();
      pen.fillStyle = colour(key); pen.fillText(S.label, wx + 8, wy + 4);
    }
  }
  // where the player sets it off: a hollow arrowhead that far short of it, joined to it when it is selected
  const t = triggerOf(def, e);
  if (t !== null && (on || view.k > 0.2)) {
    const span = spanOf(def, e), q = P(e, Math.max(sideOf(e) ? 0 : -100, t), latOf(key, e, span[0])), [tx, ty] = toScreen(q.x, q.y);
    const p0 = P(e, span[0], latOf(key, e, span[0])), [ex, ey] = toScreen(p0.x, p0.y);
    if (on) { pen.beginPath(); pen.moveTo(tx, ty); pen.lineTo(ex, ey); pen.setLineDash([4, 4]); pen.strokeStyle = colour(key); pen.lineWidth = 1.5; pen.stroke(); pen.setLineDash([]); }
    const a = Math.atan2(ey - ty, ex - tx) || -Math.PI / 2, r = on ? 8 : 5;
    pen.beginPath();
    pen.moveTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
    pen.lineTo(tx + Math.cos(a + 2.4) * r, ty + Math.sin(a + 2.4) * r);
    pen.lineTo(tx + Math.cos(a - 2.4) * r, ty + Math.sin(a - 2.4) * r);
    pen.closePath();
    pen.fillStyle = '#151a22'; pen.fill();
    pen.strokeStyle = colour(key); pen.lineWidth = 1.5; pen.stroke();
    if (on) { pen.fillStyle = colour(key); pen.fillText('set off here', tx + 10, ty + 4); }
  }
};
// the road dragged on the map (the Road tab): each segment's end is a handle. Dragged along the road it makes the
// segment longer or shorter; dragged across it, it bends it: the segment is the arc from where it starts to the handle
const roadTab = () => !$('tab-road').hidden;
const segmentEnds = () => { let s = 0; return (level.segments || []).map(seg => { s += seg.length; return points[clamp(Math.round(s / STEP), 0, points.length - 1)]; }); };
const bendTo = (i, mx, my, from) => {
  level = loadLevel(JSON.parse(from)); // (from the level as it was when the handle was picked up, each time: nothing adds up)
  build();
  const p0 = points[clamp(Math.round(segmentStart(i) / STEP), 0, points.length - 1)], seg = level.segments[i];
  const fwd = (mx - p0.x) * Math.sin(p0.h) + (my - p0.y) * Math.cos(p0.h), lat = (mx - p0.x) * Math.cos(p0.h) - (my - p0.y) * Math.sin(p0.h);
  let turn = clamp(2 * Math.atan2(lat, Math.max(fwd, 0.001)), -Math.PI * 1.5, Math.PI * 1.5);
  if (Math.abs(turn) < 0.035) turn = 0; // (within a couple of degrees of straight: straight)
  const chord = Math.hypot(fwd, lat), L = Math.max(10, Math.round(turn ? chord * (turn / 2) / Math.sin(turn / 2) : chord));
  resize(i, L);
  seg.curve = Math.round(turn / L * 1e6) / 1e6 || 0;
  build();
};
// the road's rise and fall, as a strip along the bottom of the map (only on a road with a slope somewhere): the
// height along it, the segments marked, and where the selected thing is
const profile = () => {
  const segs = level.segments || [];
  if (!segs.some(seg => seg.grade)) return;
  const W = canvas.width, H = 64, top = canvas.height - H, L = length() || 1, heights = [0];
  let y = 0, lo = 0, hi = 0;
  for (const seg of segs) { y += (seg.grade || 0) * seg.length; heights.push(y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const X = (s) => 50 + s / L * (W - 70), Y = (v) => top + H - 10 - (v - lo) / (hi - lo || 1) * (H - 26);
  pen.fillStyle = 'rgba(21,26,34,.88)'; pen.fillRect(0, top, W, H);
  pen.beginPath();
  let s = 0;
  pen.moveTo(X(0), Y(0));
  segs.forEach((seg, i) => { s += seg.length; pen.lineTo(X(s), Y(heights[i + 1])); });
  pen.strokeStyle = '#7fd69a'; pen.lineWidth = 2; pen.stroke();
  pen.lineTo(X(L), top + H); pen.lineTo(X(0), top + H); pen.closePath(); pen.fillStyle = 'rgba(127,214,154,.14)'; pen.fill();
  s = 0;
  pen.strokeStyle = 'rgba(255,255,255,.25)'; pen.lineWidth = 1;
  for (const seg of segs) { s += seg.length; pen.beginPath(); pen.moveTo(X(s), top + 14); pen.lineTo(X(s), top + H); pen.stroke(); }
  pen.fillStyle = '#aab3c2'; pen.font = '11px system-ui';
  pen.fillText(`Rise and fall: ${Math.round(lo)} m to ${Math.round(hi)} m (the finish at ${Math.round(y)} m)`, 8, top + 12);
  const e = sel && entry(sel), span = e && e.road !== 'side' && isPlaced(FIELDS[sel.key]) ? spanOf(FIELDS[sel.key], e) : null;
  if (span) { pen.fillStyle = colour(sel.key, 0.6); pen.fillRect(X(clamp(span[0], 0, L)) - 1, top + 14, Math.max(3, X(clamp(span[1], 0, L)) - X(clamp(span[0], 0, L))), H - 14); }
};
const draw = () => {
  size();
  pen.fillStyle = '#151a22';
  pen.fillRect(0, 0, canvas.width, canvas.height);
  if (points.length < 2) return;
  const [a, b] = edges();
  rowsOf();
  for (const key of PLACED) if (!hidden.has(key)) each(key, (e, i) => { if ((placeOf(FIELDS[key], e) || {}).type === 'paths') drawEntry(key, e, i); });
  for (const road of sideRoads) drawSide(road);
  if ((level.splits || []).length) { // (each way a road of its own, where they part)
    ribbon(a - shoulder(), -HM() - 0.01, '#3a4150'); ribbon(-HM(), b + shoulder(), '#3a4150');
    ribbon(a, -HM() - 0.01, '#5a6272'); ribbon(-HM(), b, '#5a6272');
  } else {
    ribbon(a - shoulder(), b + shoulder(), '#3a4150');                        // the shoulders...
    ribbon(a, b, '#5a6272');                                                  // ...and the lanes
  }
  // where the thing being placed (or the one selected) cannot go, by its rules: the road tinted red
  const ruled = tool.kind === 'place' ? tool.key : sel ? sel.key : null;
  if (ruled) for (const [s0, s1] of forbidden(ruled)) ribbon(a, b, 'rgba(255,90,79,.45)', s0, s1);
  if (view.k > 1.5) for (let k = 1; k < laneCount(); k++) lineAlong((laneLat(k - 1) + laneLat(k)) / 2, 'rgba(255,255,255,.35)', [6, 8]);
  for (let s = 500; s < length(); s += 500) { // every half a kilometre, marked
    across(s, 'rgba(255,255,255,.18)', 1);
    const q = at(s, b + shoulder() + 6), [sx, sy] = toScreen(q.x, q.y);
    pen.fillStyle = '#aab3c2'; pen.font = '11px system-ui'; pen.fillText((s / 1000).toFixed(1) + ' km', sx, sy);
  }
  across(0, '#3ddc68', 3);                                                    // start
  across(length(), '#ffffff', 3);                                             // finish
  if (roadTab()) for (const [n, q] of segmentEnds().entries()) { // (the Road tab: a handle at the end of each segment, to drag)
    const [sx, sy] = toScreen(q.x, q.y), on = drag && drag.segment === n;
    pen.beginPath(); pen.rect(sx - 6, sy - 6, 12, 12);
    pen.fillStyle = on ? '#ffd23f' : '#f2f4f7'; pen.fill();
    pen.strokeStyle = '#11151c'; pen.lineWidth = 1.5; pen.stroke();
    pen.fillStyle = '#f2f4f7'; pen.font = '11px system-ui'; pen.fillText(String(n + 1), sx + 9, sy - 8);
  }
  // everything placed: the bands and markers first, the pickups, obstacles and targets over them
  for (const key of [...PLACED.filter(k => !ITEMS.includes(k)), ...ITEMS]) {
    if (!hidden.has(key)) each(key, (e, i) => { if ((placeOf(FIELDS[key], e) || {}).type !== 'paths') drawEntry(key, e, i); });
  }
  profile();
};

// ---- history: undo, redo and the autosave ------------------------------------------------------------
let past = [], future = [], pending = null;
const snapshot = () => JSON.stringify(saveLevel(level));
const showHistory = () => { $('undo').disabled = past.length < 2; $('redo').disabled = !future.length; };
const record = () => { // (the level as it stands, if it has changed, on top of the history; and kept for next time)
  pending = null;
  const now = snapshot();
  if (past[past.length - 1] === now) return;
  past.push(now);
  if (past.length > 200) past.shift();
  future = [];
  showHistory();
  if (!params.get('level')) try { localStorage.setItem(AUTOSAVE, now); } catch { /* (storage blocked: no autosave) */ }
};
const commit = () => { clearTimeout(pending); pending = setTimeout(record, 350); }; // (typing and dragging: one step, once it stops)
const restore = (text) => {
  level = loadLevel(JSON.parse(text));
  sel = null;
  refresh();
  showHistory();
};
const undo = () => { if (pending) { clearTimeout(pending); record(); } if (past.length < 2) return; future.push(past.pop()); restore(past[past.length - 1]); };
const redo = () => { if (!future.length) return; const next = future.pop(); past.push(next); restore(next); };
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);

// ---- the panel -------------------------------------------------------------------------------------
// what is wrong with the level: what the game finds (Track.problems: text) and what the schema finds
// ({ key, i, text }), each traced to what causes it where it can be
const TRACK_NAMES = { 'quiet zone': 'quietZones', camera: 'cameras', 'level crossing': 'crossings', 'stop / go': 'stopGo', tunnel: 'tunnels', parade: 'parades', roadblock: 'roadblocks',
  'ice-cream stop': 'iceCreamStops', 'reversible lane': 'reversible', 'water main': 'waterMains', quarry: 'quarries', pothole: 'potholes', peloton: 'pelotons', 'school crossing': 'schoolCrossings',
  drawbridge: 'drawbridges', balloon: 'balloons', 'wide load': 'wideLoads', marathon: 'marathons', stampede: 'stampedes', 'parked car': 'parked', bridge: 'bridges', pickup: 'pickups',
  obstacle: 'obstacles', target: 'targets', 'site works': 'siteWorks', exit: 'exits', split: 'splits', junction: 'junctions', 'traffic zone': 'trafficZones', segment: 'segments',
  potties: 'potties', 'side road': 'exits', zone: 'zones', 'water stage': 'water' };
const trace = (text) => { // the field (and the entry) a problem of the game's is about, by its wording: { key, i } or null
  const head = text.split(':')[0];
  let key = null, rest = '';
  for (const name of [...Object.keys(TRACK_NAMES), ...Object.keys(FIELDS)].sort((a, b) => b.length - a.length)) {
    if (head.toLowerCase().startsWith(name.toLowerCase())) { key = TRACK_NAMES[name] || name; rest = head.slice(name.length); break; }
  }
  if (!key || level[key] === undefined) return key ? { key, i: -1 } : null;
  const def = FIELDS[key], list = entriesOf(level, key);
  if (!isList(def)) return { key, i: -1 };
  const where = / at (-?[\d.]+)/.exec(rest), nth = /^ #?(\d+)/.exec(rest), side = rest.includes('side road');
  let i = -1;
  if (where) i = list.findIndex(e => { const p = placeOf(def, e); return p && e[p.a || p.p] === Number(where[1]) && (e.road === 'side') === side; });
  else if (nth) i = Number(nth[1]) - 1;
  return { key, i: i >= 0 && i < list.length ? i : -1, list: i < 0 };
};
let found = []; // [{ text, ref }]
const diagnose = () => {
  found = problems.map(text => ({ text, ref: trace(text) }));
  let schema = [];
  try { schema = checkLevel(saveLevel(level)); } catch { /* (a level too broken to check: the game's word will do) */ }
  // (the game says most of what the rules do, in its own words: a rule it has not is added)
  for (const p of schema) if (!found.some(f => f.ref && f.ref.key === p.key && f.ref.i === p.i)) found.push({ text: p.text, ref: { key: p.key, i: p.i } });
};
const showProblems = () => {
  const box = $('problems');
  box.hidden = !found.length;
  fill(box, h('h3', {}, found.length === 1 ? '1 problem' : found.length + ' problems', h('span', { class: 'small' }, ' click one to go to what causes it')),
    found.slice(0, 80).map(p => h('button', { class: 'problem', disabled: !p.ref, onclick: () => goTo(p.ref) }, '⚠ ' + p.text)),
    found.length > 80 ? h('p', { class: 'note' }, '...and ' + (found.length - 80) + ' more') : null);
};
const status = () => {
  const L = length(), good = level.clock?.good || 1, evil = level.clock?.evil || 1;
  const n = PLACED.reduce((sum, k) => sum + entriesOf(level, k).length, 0);
  $('length').textContent = (L / 1000).toFixed(2) + ' km';
  $('status').textContent = `${(L / 1000).toFixed(2)} km: an average of ${(L / good * 3.6).toFixed(0)} km/h needed playing Good, ` +
    `${(L / evil * 3.6).toFixed(0)} km/h Evil. ${n} things placed, of ${PLACED.filter(k => entriesOf(level, k).length).length} kinds.` +
    (found.length ? ` ⚠ ${found.length === 1 ? 'A problem' : found.length + ' problems'}: see under the map.` : ' No problems found.');
  const end = roadEnd(level.segments || []), gap = Math.hypot(end.x, end.y), // (as the game lays the road out and measures it: see levelSchema.js)
    turned = ((end.h * 180 / Math.PI) % 360 + 540) % 360 - 180;
  $('closeLoop').hidden = !(level.laps || gap < 150) || (gap < 1 && Math.abs(turned) < 0.6);
  $('loopNote').textContent = level.laps || gap < 150 ? `A circuit: the road ends ${gap.toFixed(1)} m from where it starts, facing ${Math.abs(turned).toFixed(1)}° off` +
    (gap < 1 && Math.abs(turned) < 0.6 ? ' (closed).' : ' (a lapped level needs it closed: under 1 m, facing the same way).') : '';
};
// everything that follows a change to the level: the road laid out again, the game's word on it, the map
const changed = ({ layout = true } = {}) => {
  update3d();
  if (layout) { build(); facts = roadFacts(level); survey(); diagnose(); }
  status();
  showProblems();
  notes();
  counts();
  if (!$('tab-list').hidden) renderList();
  draw();
  commit();
};
// everything made afresh (a level opened, an undo)
const refresh = () => {
  update3d();
  build(); facts = roadFacts(level); survey(); diagnose();
  renderLevel(); segmentRows(); renderTools(); renderList(); renderInspector(); jsonBox();
  status(); showProblems(); notes();
  draw();
};

// ---- the level-wide settings: a control for every field that is not placed on the map, group by group ----
const noteFor = new Map(); // (each field's line of rules broken and problems: see notes)
const themeNote = (name) => {
  const t = THEMES[name || 'city'] || {}, brings = [t.rain && 'rain', t.snow && 'snow', t.festive && 'festive lights', t.night && 'night', t.lit && 'lit surfaces', t.headlights && 'headlights on',
    t.elevated && 'an elevated road (' + t.elevated + ' m up)', t.terrain && 'land that climbs and falls with the road', t.unmarked && 'no lane markings', t.sea && 'the sea beside it', t.water && 'open water',
    t.scenery === 'zones' && 'a look in zones (see Zones under Place)', t.channel && 'water-stage colours of its own'].filter(Boolean);
  return 'Scenery: ' + (t.scenery || '?') + (brings.length ? '. It brings ' + brings.join(', ') + '.' : '. No weather of its own.') + ' (Rain, snow, lights and an elevated road belong to the theme: a level cannot switch them on by themselves.)';
};
const fieldControl = (key, rebuild) => {
  const def = FIELDS[key];
  const el = control(asSetting(def), () => level[key], (v) => { if (v === undefined) delete level[key]; else level[key] = v; },
    { changed: () => changed(), rebuild, lanes: (S) => laneOptions({}, S, 0) });
  const note = h('span', { class: 'warn' });
  noteFor.set(key, note);
  const wide = def.alt || ['mix', 'object', 'timed', 'list'].includes(def.shape) || key === 'theme';
  return h('div', { class: 'field' + (wide ? ' wide' : ''), 'data-field': key }, el, def.shape === 'flag' ? null : h('span', { class: 'help' }, def.help + (key === 'theme' ? ' ' + themeNote(level.theme) : '')), note);
};
const groupSection = (group, rebuild) => {
  const keys = Object.keys(FIELDS).filter(k => FIELDS[k].group === group && !isPlaced(FIELDS[k]) && FIELDS[k].custom !== 'segments');
  if (!keys.length) return null;
  const flags = keys.filter(k => FIELDS[k].shape === 'flag'), rest = keys.filter(k => FIELDS[k].shape !== 'flag');
  return h('section', {}, h('h2', {}, GROUPS[group]), h('div', { class: 'grid' }, rest.map(k => fieldControl(k, rebuild))),
    flags.length ? h('div', { class: 'grid flags' }, flags.map(k => { const el = fieldControl(k, rebuild); el.title = FIELDS[k].help; return el; })) : null);
};
const renderLevel = () => {
  noteFor.clear();
  const top = $('side').scrollTop;
  fill($('tab-level'), ...['basics', 'look', 'traffic', 'events', 'modes', 'race'].map(g => groupSection(g, renderLevel)).filter(Boolean));
  fill($('roadFields'), groupSection('road', renderLevel));
  $('side').scrollTop = top;
  notes();
};
// under each control, the rules its field breaks and what else is wrong with it; in the form over the map, the same for the selected entry
const notes = () => {
  for (const [key, el] of noteFor) {
    const broken = level[key] === undefined ? [] : brokenRules(key, null, facts);
    const wrong = found.filter(p => p.ref && p.ref.key === key && p.ref.i < 0 && !isPlaced(FIELDS[key])).map(p => p.text);
    el.textContent = [...new Set([...broken, ...wrong])].map(t => '⚠ ' + t).join('  ');
  }
  const box = $('entryNotes');
  if (box && sel && entry(sel)) {
    const def = FIELDS[sel.key], e = entry(sel), span = spanOf(def, e) || [0, 0];
    const rules = (def.rules || []).map(id => { const bad = !(e.road === 'side' && SPAN_RULES.includes(id)) && RULES[id].broken(facts, e, span); return h('li', { class: bad ? 'bad' : 'ok' }, (bad ? '✗ ' : '✓ ') + RULES[id].text); });
    const wrong = found.filter(p => same(p.ref, sel) && !(def.rules || []).some(id => p.text.endsWith(RULES[id].text))).map(p => h('li', { class: 'bad' }, '⚠ ' + p.text));
    const road = def.road === 'both' ? 'It can be on a side road too.' : isPlaced(def) && def.shape !== 'world' ? 'On the expressway only (not on a side road).' : '';
    fill(box, h('ul', { class: 'rules' }, rules, wrong), road ? h('p', { class: 'note' }, road) : null);
  }
};

// the road, as a table of its segments: length, how far it bends (degrees, + right) and its slope
// (and a column for any other setting the schema gives a segment: one more entry there is one more column here)
const SEGMENT_EXTRAS = Object.entries(FIELDS.segments.settings).filter(([k]) => !['length', 'curve', 'grade'].includes(k));
const segmentRows = () => {
  // (built as elements, never as HTML text: a level file's values are not to be trusted with the page)
  const cell = (k, value, more) => h('td', null, h('input', { type: 'number', ...more, 'data-k': k, value: String(value) }));
  fill($('segments').tHead, h('tr', null, h('th', null, 'Length m'), h('th', null, 'Bend °'), h('th', null, 'Slope %'), SEGMENT_EXTRAS.map(([, S]) => h('th', { title: S.help || '' }, S.label)), h('th')));
  fill($('segments').tBodies[0], (level.segments || []).map((seg, i) => h('tr', { 'data-i': i },
    cell('length', seg.length, { min: 10, step: 10 }),
    cell('bend', Math.round((seg.curve || 0) * seg.length * 180 / Math.PI * 10) / 10, { step: 5 }),
    cell('grade', ((Number(seg.grade) || 0) * 100).toFixed(1), { step: 0.5 }),
    SEGMENT_EXTRAS.map(([k, S]) => cell(k, seg[k] ?? '', { min: S.min, max: S.max, step: S.step ?? 'any', 'data-extra': '1' })),
    h('td', { class: 'ops' }, h('button', { 'data-op': 'up', title: 'Move up' }, '↑'), h('button', { 'data-op': 'down', title: 'Move down' }, '↓'), h('button', { 'data-op': 'del', title: 'Remove' }, '×')))));
};
// everything on the expressway moved by a change to it: each place along it (a point's, a stretch's two ends, an
// exit's fork and merge, a water station) put through `move`. Things on a side road are measured along that, and stay
const carry = (move) => {
  const put = (e, k) => { if (Number.isFinite(e[k])) e[k] = Math.round(move(e[k]) * 10) / 10; };
  for (const key of PLACED) {
    each(key, (e) => {
      const place = placeOf(FIELDS[key], e);
      if (!place || e.road === 'side') return;
      if (place.type === 'stretch') { put(e, place.a); put(e, place.b); if (e[place.b] <= e[place.a]) e[place.b] = e[place.a] + 1; }
      if (place.type === 'point') put(e, place.p);
      for (const [k, S] of Object.entries(FIELDS[key].settings || {})) if (S.type === 'metres' && k !== place.p) put(e, k);
    });
  }
};
const segmentStart = (i) => level.segments.slice(0, i).reduce((sum, seg) => sum + seg.length, 0);
const resize = (i, to) => { // a segment's length changed: what is on it stretched with it, what comes after moved
  const seg = level.segments[i], from = seg.length, A = segmentStart(i), bend = (seg.curve || 0) * from;
  seg.length = to;
  seg.curve = bend / to || 0; // (keeping how far it bends)
  if ($('carry').checked && to !== from) carry(s => (s <= A ? s : s < A + from ? A + (s - A) * to / from : s + to - from));
};
$('segments').addEventListener('change', (e) => { // (a length: only once it is typed in full, since it moves things)
  if (e.target.dataset.k !== 'length') return;
  const i = Number(e.target.closest('tr').dataset.i);
  resize(i, Math.max(10, Math.round(Number(e.target.value) || 0)));
  e.target.value = level.segments[i].length;
  renderInspector();
  changed();
});
$('segments').addEventListener('input', (e) => {
  const row = e.target.closest('tr'), seg = level.segments[Number(row.dataset.i)], k = e.target.dataset.k, v = Number(e.target.value) || 0;
  if (k === 'length') return;
  if (k === 'bend') seg.curve = v * Math.PI / 180 / seg.length;
  if (k === 'grade') { if (v) seg.grade = v / 100; else delete seg.grade; }
  if (e.target.dataset.extra) { if (e.target.value === '') delete seg[k]; else seg[k] = v; }
  if (!seg.curve) seg.curve = 0;
  changed();
});
$('segments').addEventListener('click', (e) => {
  const op = e.target.dataset.op;
  if (!op) return;
  const i = Number(e.target.closest('tr').dataset.i), S = level.segments;
  if (op === 'up' && i > 0) [S[i - 1], S[i]] = [S[i], S[i - 1]];
  if (op === 'down' && i < S.length - 1) [S[i + 1], S[i]] = [S[i], S[i + 1]];
  if (op === 'del' && S.length > 1) {
    const A = segmentStart(i), L = S[i].length;
    S.splice(i, 1);
    if ($('carry').checked) carry(s => (s <= A ? s : s < A + L ? A : s - L)); // (what was on it gathered where it was, the rest moved back)
  }
  segmentRows();
  renderInspector();
  changed();
});
$('addSegment').addEventListener('click', () => { level.segments.push({ length: 300, curve: 0 }); segmentRows(); changed(); });
// a lapped road closed (levelSchema.js closeLoop): the bends each turned a touch, and two segments made longer or
// shorter, what is on them and after them carried along as for any change of length (see resize)
$('closeLoop').addEventListener('click', () => {
  const closed = closeLoop(level.segments);
  if (closed.problem) { $('loopNote').textContent = 'Not closed: ' + closed.problem + '.'; return; }
  for (const m of [...closed.moved].sort((a, b) => b.i - a.i)) resize(m.i, m.to); // (the later one first: the earlier one's place is not moved by it)
  level.segments.forEach((seg, i) => { if (seg.curve) seg.curve = closed.segments[i].curve; });
  segmentRows();
  changed();
  $('loopNote').textContent += ' Closed: ' + (closed.moved.length ? closed.moved.map(m => 'segment ' + (m.i + 1) + ' ' + m.from + ' to ' + m.to + ' m').join(', ') : 'no length changed') +
    '; ' + Math.abs(closed.turned * 180 / Math.PI).toFixed(2) + '° shared out over the bends.';
});

// ---- the tools: select, or place one of anything the schema says can be placed, grouped and searched ----
const sameTool = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const levelRules = (key) => (FIELDS[key].rules || []).filter(id => !SPAN_RULES.includes(id) && RULES[id].broken(facts, {}, [0, 0])).map(id => RULES[id].text);
const toolButton = (label, t, swatch, title, key) => {
  const broken = key ? levelRules(key) : [], n = key ? entriesOf(level, key).filter(e => !t.sub || e[FIELDS[key].sub] === t.sub || (t.sub === FIELDS[key].settings[FIELDS[key].sub].default && e[FIELDS[key].sub] === undefined)).length : 0;
  return h('button', { class: (sameTool(t, tool) ? 'on ' : '') + (broken.length ? 'warned' : ''), 'data-tool': JSON.stringify(t), title: (title || '') + (broken.length ? '\n⚠ On this level: ' + broken.join('; ') : '') },
    swatch ? h('span', { class: 'swatch', style: 'background:' + swatch }) : null, label, broken.length ? ' ⚠' : '', h('span', { class: 'count', 'data-count': '1' }, n ? String(n) : ''));
};
const describe = (key) => {
  const def = FIELDS[key];
  return def.help + ((def.rules || []).length ? '\nRules: ' + def.rules.map(id => RULES[id].text).join('; ') : '') + (def.road === 'both' ? '\nCan be on a side road: click one.' : isPlaced(def) && def.shape !== 'world' ? '\nOn the expressway only.' : '') +
    (def.shape === 'stretch' ? '\nA stretch: ' + (def.span || 150) + ' m from where you click; drag its ends.' : def.shape === 'world' ? '\nPlaced in the world: click anywhere on the map.' : '') + (def.single ? '\nOne a level.' : '');
};
const renderTools = () => {
  const q = $('search').value.trim().toLowerCase(), out = [];
  const match = (...words) => !q || words.some(w => String(w).toLowerCase().includes(q));
  if (!q) out.push(toolButton('Select / move', { kind: 'select' }, null, 'Click a thing to select it; drag it to move it (Esc comes back to this)'));
  for (const [group, title] of Object.entries(GROUPS)) {
    const buttons = [];
    for (const key of PLACED.filter(k => FIELDS[k].group === group)) {
      const def = FIELDS[key];
      if (def.sub) { // (one button for each kind of it)
        const subs = def.settings[def.sub].choices.map(choiceValue).filter(v => match(v, key, def.label, title));
        if (subs.length) buttons.push(h('h4', {}, def.label), ...subs.map(v => toolButton(v, { kind: 'place', key, sub: v }, key === 'pickups' ? hex(PICKUP_COLOR[v] ?? 0xffffff) : key === 'obstacles' ? '#ff8a3d' : colour(key), describe(key), key)));
      } else if (match(key, def.label, title)) buttons.push(toolButton(def.label, { kind: 'place', key }, colour(key), describe(key), key));
    }
    if (group === 'sideRoads' && match('oncoming from here', 'side road')) buttons.push(toolButton('oncoming from here', { kind: 'oncomingFrom' }, '#ffd23f', 'Click a side road: its lane 0 is oncoming from there on (the yellow handle can be dragged too)'));
    if (buttons.length) out.push(h('h3', {}, title), ...buttons);
  }
  if (out.length === 0) out.push(h('p', { class: 'note' }, 'Nothing called that can be placed.'));
  fill($('tools'), ...out);
};
const counts = () => { if (!$('tab-place').hidden) renderTools(); };
const hint = () => {
  const def = tool.kind === 'place' ? FIELDS[tool.key] : null;
  $('hint').textContent = !view3d.hidden ? 'W A S D to fly · drag to look · E / Space up, Q / C down · Shift faster · scroll for speed · click the road to place a pickup, obstacle or target picked in Place · right-click one to remove it · T shows what only triggers later'
    : tool.kind === 'playFrom' ? 'Click the road: a run starts there. Esc to cancel.'
    : tool.kind === 'oncomingFrom' ? 'Click a side road: its lane 0 is oncoming from there on. Esc to cancel.'
    : def ? `Click ${def.shape === 'world' ? 'anywhere on the map' : def.road === 'both' ? 'the road or a side road' : 'the road'} to place: ${def.label}${tool.sub ? ' (' + tool.sub + ')' : ''}. ` +
      ((def.rules || []).length ? def.rules.map(id => RULES[id].text).join('; ') + (forbidden(tool.key).length ? ' (red: not there). ' : '. ') : '') + 'Esc to stop placing.'
    : roadTab() ? 'Drag a numbered handle: along the road makes its segment longer or shorter, across it bends it · scroll to zoom · drag the map to pan · Ctrl+Z undoes'
    : 'Scroll to zoom · drag the map to pan · click a thing to select it · drag it (or a band\'s end) to move it · Delete removes it · Ctrl+Z undoes · Ctrl+D duplicates';
};
const setTool = (t) => {
  tool = t;
  for (const b of $('tools').querySelectorAll('button[data-tool]')) b.classList.toggle('on', b.dataset.tool === JSON.stringify(tool));
  $('playFrom').classList.toggle('primary', tool.kind === 'playFrom');
  canvas.style.cursor = tool.kind === 'select' ? 'default' : 'crosshair';
  hint();
  toolTo3d();
  draw();
};
// (the 3D view places only pickups, obstacles and targets: it is told of those, in the words it knows)
const toolTo3d = () => {
  if (view3d.hidden || !view3d.contentWindow) return;
  const t = tool.kind === 'place' && ITEMS.includes(tool.key) ? (tool.key === 'targets' ? { kind: 'targets' } : { kind: tool.key, type: tool.sub }) : { kind: 'select' };
  view3d.contentWindow.postMessage({ type: 'tool', tool: t }, '*');
};
$('tools').addEventListener('click', (e) => { const b = e.target.closest('button[data-tool]'); if (b) setTool(JSON.parse(b.dataset.tool)); });
$('search').addEventListener('input', renderTools);
// the 3D view placing and removing items: the editor's copy of the level kept in step (see render/fly.js)
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || e.source !== view3d.contentWindow) return;
  if (m.type === 'flyReady') { toolTo3d(); if (revealed) view3d.contentWindow.postMessage({ type: 'reveal', on: true }, '*'); } // (still showing, in a view made afresh)
  if (m.type === 'reveal') { revealed = !!m.on; showRevealed(); }
  if (m.type === 'pose' && asked3d) remake3d(m.cam);
  own3d = m.type === 'placed' || m.type === 'removed'; // (the view's own change: not made afresh for it)
  if (m.type === 'placed') {
    (level[m.list] ||= []).push(m.item);
    sel = { key: m.list, i: level[m.list].length - 1 };
  }
  if (m.type === 'removed') {
    const i = (level[m.list] || []).findIndex(it => JSON.stringify(it) === JSON.stringify(m.item));
    if (i >= 0) level[m.list].splice(i, 1);
    sel = null;
  }
  if (m.type === 'placed' || m.type === 'removed') { renderInspector(); changed(); }
});

// ---- the selected thing's own form, over the map ------------------------------------------------------
const select = (ref) => { sel = ref; renderInspector(); if (!$('tab-list').hidden) renderList(); draw(); };
const titleOf = (key, e, i) => {
  const def = FIELDS[key];
  return def.label + (def.sub && e[def.sub] ? ': ' + e[def.sub] : '') + (i >= 0 ? ' #' + (i + 1) : '');
};
const renderInspector = () => {
  const box = $('inspector'), e = sel && entry(sel);
  if (!e || typeof e !== 'object') { sel = null; box.hidden = true; fill(box, ); return; }
  const def = FIELDS[sel.key], place = placeOf(def, e), key = sel.key;
  const ctx = { changed: () => changed(), rebuild: () => renderInspector(), lanes: (S) => laneOptions(e, S, whereOf(key, e)) };
  const numberOf = (k, label, step = 5) => h('label', {}, h('span', { class: 'cap' }, label), h('input', { type: 'number', step, value: e[k] ?? '',
    oninput: (ev) => { if (ev.target.value !== '') { e[k] = Number(ev.target.value); changed(); } } }));
  const where = [];
  const along = e.road === 'side' ? ' (m along the side road)' : ' (m)';
  if (place && place.type === 'stretch') where.push(numberOf(place.a, def.ends ? 'Fork at (m)' : 'From' + along), numberOf(place.b, def.ends ? 'Merge at (m)' : 'To' + along));
  if (place && place.type === 'point') where.push(numberOf(place.p, 'At' + along));
  if (def.road === 'both' && place && place.type !== 'world') {
    const options = [h('option', { value: '', selected: e.road !== 'side' }, 'the expressway'), ...sideRoads.map(r => h('option', { value: r.i, selected: e.road === 'side' && (e.exit || 0) === r.i }, 'side road ' + r.i + ' (' + Math.round(r.x.length) + ' m)'))];
    if (e.road === 'side' && !sideOf(e)) options.push(h('option', { value: e.exit || 0, selected: true }, 'side road ' + (e.exit || 0) + ' (no such exit)'));
    where.push(h('label', {}, h('span', { class: 'cap' }, 'On'), h('select', { disabled: !sideRoads.length && e.road !== 'side', title: sideRoads.length ? '' : 'The level has no side roads (exits)', onchange: (ev) => {
      if (ev.target.value === '') { delete e.road; delete e.exit; } else { e.road = 'side'; if (Number(ev.target.value)) e.exit = Number(ev.target.value); else delete e.exit; }
      const max = sideOf(e) ? sideOf(e).length : length(), keys = place.type === 'stretch' ? [place.a, place.b] : [place.p]; // (kept on the road it is now on)
      const over = Math.max(0, e[keys[keys.length - 1]] - max);
      for (const k of keys) e[k] = Math.max(0, Math.round(e[k] - over));
      for (const [k, S] of Object.entries(def.settings || {})) if (S.type === 'lane' && e[k] !== undefined) e[k] = laneNear(e, S, e[keys[0]], 0);
      renderInspector(); changed();
    } }, options)));
  }
  const known = new Set([...Object.keys(def.settings || {}), 'road', 'exit', ...(place ? [place.a, place.b, place.p, place.type === 'world' ? 'x' : '', place.type === 'world' ? 'z' : ''] : [])]);
  const extra = Object.keys(e).filter(k => !known.has(k));
  const json = h('textarea', { class: 'json small', spellcheck: false, value: JSON.stringify(e, null, 2), oninput: (ev) => {
    let next;
    try { next = JSON.parse(ev.target.value); } catch (error) { jsonNote.textContent = 'Not valid JSON yet: ' + error.message; return; }
    if (sel.i < 0) level[key] = next; else level[key][sel.i] = next;
    jsonNote.textContent = 'Applied.';
    changed();
  } }), jsonNote = h('p', { class: 'note' });
  const spot = place && place.type !== 'world' && place.type !== 'paths' && e.road !== 'side' ? e[place.a || place.p] : null;
  box.hidden = false;
  fill(box, 
    h('div', { class: 'inspHead' }, h('h3', { style: 'color:' + colour(key) }, titleOf(key, e, sel.i)), h('button', { title: 'Close (the thing stays selected on the map until you click elsewhere)', onclick: () => select(null) }, '×')),
    h('p', { class: 'help' }, def.help),
    where.length ? h('div', { class: 'grid' }, where) : null,
    settingsForm(def.settings, e, ctx),
    h('div', { id: 'entryNotes' }),
    h('div', { class: 'buttons' }, h('button', { onclick: () => remove() }, 'Delete'), def.single ? null : h('button', { onclick: () => duplicate(), title: 'Ctrl+D' }, 'Duplicate'),
      h('button', { onclick: () => centre(sel) }, 'Find on map'), spot !== null ? h('button', { onclick: () => play(false, Math.max(0, spot - 80)), title: 'A run starting 80 m short of it' }, 'Play from here') : null),
    h('details', { open: extra.length > 0 }, h('summary', {}, 'As JSON' + (extra.length ? ' (it has settings the form lacks: ' + extra.join(', ') + ')' : '')), json, jsonNote));
  notes();
};
const remove = () => {
  if (!sel) return;
  if (sel.i < 0) delete level[sel.key];
  else { level[sel.key].splice(sel.i, 1); if (!level[sel.key].length && !level.__empties.has(sel.key)) delete level[sel.key]; }
  sel = null;
  renderInspector();
  changed();
};
let clip = null; // (a copy of an entry, to paste)
const paste = (key, e, shift = 30) => {
  const def = FIELDS[key], place = placeOf(def, e);
  if (def.single || !place) return;
  const copy = structuredClone(e);
  if (place.type === 'stretch') { const L = copy[place.b] - copy[place.a]; copy[place.a] += L + 10; copy[place.b] += L + 10; }
  if (place.type === 'point') copy[place.p] += shift;
  if (place.type === 'world') { copy.x += shift; }
  (level[key] ||= []).push(copy);
  select({ key, i: level[key].length - 1 });
  changed();
};
const duplicate = () => { if (sel && entry(sel)) paste(sel.key, entry(sel)); };
// the map brought round to a thing (and, for a level-wide field, its control shown)
const refPoint = (ref) => {
  const def = FIELDS[ref.key], e = entry(ref), place = e && placeOf(def, e);
  if (!place || !usable(e)) return null;
  if (place.type === 'world') return { x: -e.x, y: e.z };
  if (place.type === 'paths') return e.paths[0] && e.paths[0][0] ? { x: -e.paths[0][0][0], y: e.paths[0][0][1] } : null;
  const s = place.type === 'stretch' ? (e[place.a] + e[place.b]) / 2 : e[place.p];
  return P(e, s, 0);
};
const centre = (ref) => { const p = refPoint(ref); if (p) { view.ox = p.x; view.oy = p.y; if (view.k < 0.5) view.k = 0.8; draw(); } };
const showTab = (name) => {
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === name);
  for (const t of document.querySelectorAll('.tab')) t.hidden = t.id !== 'tab-' + name;
  if (name === 'list') renderList();
  if (name === 'place') renderTools();
  if (name === 'json') jsonBox();
  if (level) { hint(); draw(); } // (the Road tab's handles on the map come and go with it)
};
$('tabs').addEventListener('click', (e) => { if (e.target.dataset.tab) showTab(e.target.dataset.tab); });
const goTo = (ref) => {
  if (!ref) return;
  const def = FIELDS[ref.key];
  if (def && isPlaced(def) && entry(ref) && (ref.i >= 0 || def.single)) { select({ key: ref.key, i: def.single ? -1 : ref.i }); centre(sel); return; }
  if (def && isPlaced(def)) { showTab('list'); return; } // (one of a list, the game doesn't say which)
  showTab(def && (def.group === 'road' || ref.key === 'segments') ? 'road' : 'level');
  const el = document.querySelector(`[data-field="${ref.key}"]`) || (ref.key === 'segments' ? $('segments') : null);
  if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); }
};

// ---- the list: what is shown on the map, and everything in the level ------------------------------------
const SCENERY = ['zones', 'runoff', 'gravel', 'stands', 'quarries', 'landmarks', 'quietZones', 'trafficZones'];
const renderList = () => {
  const present = PLACED.filter(k => entriesOf(level, k).length);
  fill($('filters'), ...present.map(k => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !hidden.has(k), onchange: (e) => { if (e.target.checked) hidden.delete(k); else hidden.add(k); draw(); } }),
    h('span', { class: 'swatch', style: 'background:' + colour(k) }), h('span', {}, FIELDS[k].label + ' (' + entriesOf(level, k).length + ')'))));
  const rows = [];
  for (const key of present) each(key, (e, i) => {
    const def = FIELDS[key], place = placeOf(def, e);
    const pos = !place ? 0 : place.type === 'stretch' ? e[place.a] : place.type === 'point' ? e[place.p] : 1e9;
    const where = !place ? '' : place.type === 'stretch' ? `${Math.round(e[place.a])}–${Math.round(e[place.b])} m` : place.type === 'point' ? `${Math.round(e[place.p])} m` : place.type === 'world' ? `at ${Math.round(e.x)}, ${Math.round(e.z)}` : 'in the world';
    const more = [e.side, e.lane !== undefined ? 'lane ' + e.lane : '', Array.isArray(e.lanes) ? 'lanes ' + e.lanes.join('–') : '', e.count ? '×' + e.count : ''].filter(Boolean).join(', ');
    rows.push({ road: e.road === 'side' ? 1 + (e.exit || 0) : 0, pos, key, i, text: where + (e.road === 'side' ? ' (side road ' + (e.exit || 0) + ')' : ''), name: titleOf(key, e, -1), more });
  });
  rows.sort((a, b) => a.road - b.road || a.pos - b.pos);
  $('listCount').textContent = rows.length + (rows.length > 500 ? ' (the first 500 listed)' : '');
  fill($('everything'), ...rows.slice(0, 500).map(r => h('button', { class: 'row' + (same(r, sel) ? ' on' : ''), onclick: () => { select({ key: r.key, i: r.i }); centre(sel); } },
    h('span', { class: 'swatch', style: 'background:' + colour(r.key) }), h('span', { class: 'pos' }, r.text), h('span', { class: 'name' }, r.name), h('span', { class: 'cap' }, r.more))));
};
$('showAll').addEventListener('click', () => { hidden.clear(); renderList(); draw(); });
$('hideAll').addEventListener('click', () => { for (const k of PLACED) hidden.add(k); renderList(); draw(); });
$('hideScenery').addEventListener('click', () => { for (const k of SCENERY) hidden.add(k); renderList(); draw(); });

// ---- the level as JSON: the fallback for anything the forms lack, applied as soon as it is valid ---------
const jsonNote = (text, bad) => { $('extraNote').textContent = text; $('extraNote').classList.toggle('bad', bad); $('extra').classList.toggle('bad', bad); };
const jsonBox = () => {
  if ($('tab-json').hidden) return;
  $('extra').value = JSON.stringify(saveLevel(level), null, 2);
  const unknown = Object.keys(level).filter(k => !FIELDS[k]);
  jsonNote(unknown.length ? 'Fields the schema does not know (kept as they are): ' + unknown.join(', ') : Object.keys(level).length + ' fields, all known to the schema.', false);
};
$('extra').addEventListener('input', (e) => {
  let parsed;
  try { parsed = JSON.parse(e.target.value || '{}'); } catch (error) { jsonNote('Not valid JSON yet: ' + error.message, true); return; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.segments) || !parsed.segments.length) { jsonNote('It should be one { } level, with its "segments".', true); return; }
  level = loadLevel(parsed);
  sel = null;
  build(); facts = roadFacts(level); survey(); diagnose();
  renderLevel(); segmentRows(); renderInspector(); status(); showProblems(); draw(); commit();
  jsonNote('Applied.', false);
});
$('extra').addEventListener('keydown', (e) => { // (Tab indents, rather than leaving the box)
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const box = e.target;
  box.setRangeText('  ', box.selectionStart, box.selectionEnd, 'end');
});
$('tidy').addEventListener('click', () => { if (!$('extra').classList.contains('bad')) jsonBox(); });

// ---- the mouse on the map ------------------------------------------------------------------------
// what is under a point of the canvas: { ref, grab }: a marker ('p'), a landmark ('world', or 'rot': the end of
// its tick), a band's end ('a' | 'b') or the band itself ('move'). Markers before bands, the newest first
const hit = (px, py) => {
  rowsOf();
  let band = null;
  for (const key of [...ITEMS, ...PLACED.filter(k => !ITEMS.includes(k))]) {
    if (hidden.has(key)) continue;
    const def = FIELDS[key], list = entriesOf(level, key);
    for (let n = list.length - 1; n >= 0; n--) {
      const e = list[n], place = placeOf(def, e), ref = { key, i: isList(def) ? n : -1 };
      if (!place || !usable(e) || place.type === 'paths') continue;
      if (place.type === 'point') { const [sx, sy] = markerAt(key, e, place); if (Math.hypot(sx - px, sy - py) < 10) return { ref, grab: 'p' }; }
      if (place.type === 'world') {
        const [sx, sy] = worldAt(e), r = Math.max(7, (e.r || 0) * view.k), rot = e.rot || 0;
        if (Math.hypot(sx - Math.sin(rot) * (r + 10) - px, sy - Math.cos(rot) * (r + 10) - py) < 8) return { ref, grab: 'rot' };
        if (Math.hypot(sx - px, sy - py) < Math.min(r, 14)) return { ref, grab: 'world' };
      }
      if (place.type === 'stretch' && !band) {
        const line = bandLine(key, e, place), first = line[0], last = line[line.length - 1];
        if (Math.hypot(first[0] - px, first[1] - py) < 8) band = { ref, grab: 'a' };
        else if (Math.hypot(last[0] - px, last[1] - py) < 8) band = { ref, grab: 'b' };
        else for (let k = 1; k < line.length && !band; k++) { // (how near the pointer is to each piece of the band)
          const [x1, y1] = line[k - 1], [x2, y2] = line[k], L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
          const t = clamp(((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2, 0, 1);
          if (Math.hypot(x1 + t * (x2 - x1) - px, y1 + t * (y2 - y1) - py) < 6) band = { ref, grab: 'move' };
        }
      }
    }
  }
  return band;
};
// where a point of the map is along an entry's own road: { s, lat }
const alongOf = (e, mx, my) => {
  if (e.road === 'side') { const n = nearestSide(mx, my, e.exit || 0); return n ? { s: n.d, lat: n.lat } : { s: 0, lat: 0 }; }
  return nearest(mx, my);
};
// a click on the map with a place tool: one of that field put there (on a side road, if the click is on one and it can be)
const placeAt = (mx, my) => {
  const key = tool.key, def = FIELDS[key];
  let e;
  if (def.shape === 'world') e = makeEntry(key, { x: -mx, z: my }, { sub: tool.sub });
  else {
    const n = nearest(mx, my), side = nearestSide(mx, my), [a, b] = edges();
    const onMain = n.off < Math.max(Math.abs(a), b) + shoulder() + 4 && n.s > 0 && n.s < length();
    const onSide = side && def.road === 'both' && side.off < 14 && (!onMain || side.off < n.off);
    if (!onSide && !onMain) return false;
    const where = onSide ? { road: 'side', exit: side.road.i } : {}, s = onSide ? side.d : n.s, lat = onSide ? side.lat : n.lat;
    const numeric = laneNear(where, { player: Object.values(def.settings || {}).some(S => (S.type === 'lane' || S.type === 'lanes') && S.player) }, s, lat);
    e = makeEntry(key, { s }, { sub: tool.sub, road: where.road, exit: where.exit, lane: laneNear(where, { shoulders: true }, s, lat), laneNumber: numeric, side: lat < (onSide ? (acrossAt(where, s)[1] + acrossAt(where, s)[2]) / 2 : 0) ? 'left' : 'right',
      length: onSide ? side.road.x.length : length() });
    for (const [k, S] of Object.entries(def.settings || {})) { // (lanes that are on the road there)
      if (S.type === 'lanes' && S.span && Array.isArray(e[k])) { const top = (onSide ? 3 : laneCount() - 1), w = e[k][1] - e[k][0]; e[k][0] = clamp(e[k][0], 0, Math.max(0, top - w)); e[k][1] = e[k][0] + w; }
    }
  }
  if (def.single) { level[key] = e; sel = { key, i: -1 }; } else { if (!Array.isArray(level[key])) level[key] = []; level[key].push(e); sel = { key, i: level[key].length - 1 }; }
  renderInspector();
  changed();
  return true;
};
// where an exit's lane 0 turns oncoming: set (m along its side road), for the map and the form to follow
const setOncomingFrom = (i, d) => {
  level.exits[i].oncomingFrom = Math.max(0, Math.round(d));
  if (level.exits[i].oncoming === false) delete level.exits[i].oncoming;
  survey();
  status();
};
let drag = null; // { ref, grab, ... } being moved or resized, { oncoming: i }, or { pan: [px, py] }
const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const press = (px, py) => {
  const [mx, my] = toMap(px, py);
  if (tool.kind === 'playFrom') { const n = nearest(mx, my); play(false, Math.round(n.s)); setTool({ kind: 'select' }); return; }
  // a side road's "oncoming from here": its handle dragged, or (with that tool) set where the click is
  const handle = sideRoads.find(({ x }) => {
    if (!x.oncoming) return false;
    const q = mapPoint(x.side0 + clamp(x.oncomingFrom, 0, x.length), 0), [hx, hy] = toScreen(q.x, q.y);
    return Math.hypot(hx - px, hy - py) < 10;
  });
  const onSide = nearestSide(mx, my);
  if (roadTab() && tool.kind === 'select') { // (a segment's end, picked up: see bendTo)
    const n = segmentEnds().findIndex(q => { const [sx, sy] = toScreen(q.x, q.y); return Math.hypot(sx - px, sy - py) < 10; });
    if (n >= 0) { clearTimeout(pending); record(); drag = { segment: n, from: snapshot() }; draw(); return; }
  }
  const got = tool.kind === 'select' || tool.kind === 'place' ? hit(px, py) : null;
  if (tool.kind === 'oncomingFrom' ? onSide && onSide.off < 12 : handle && !(got && got.grab === 'p')) {
    const i = tool.kind === 'oncomingFrom' ? onSide.road.i : handle.i;
    if (tool.kind === 'oncomingFrom') setOncomingFrom(i, onSide.d);
    drag = { oncoming: i };
    draw();
    return;
  }
  if (got && (tool.kind === 'select' || got.grab === 'p' || got.grab === 'world' || got.grab === 'rot')) { // (a thing picked up; with a place tool, only a marker: a band is clicked through)
    const e = entry(got.ref), place = placeOf(FIELDS[got.ref.key], e);
    select(got.ref);
    drag = { ref: got.ref, grab: got.grab, start: place.type === 'world' ? [mx, my] : alongOf(e, mx, my).s, a: e[place.a], b: e[place.b], p: e[place.p], x: e.x, z: e.z, moved: false };
    return;
  }
  if (tool.kind === 'place' && placeAt(mx, my)) return;
  if (sel && tool.kind === 'select') select(null);
  drag = { pan: [px, py] };
  draw();
};
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); press(...local(e)); });
const moveTo = (px, py) => {
  if (!drag) return;
  const [mx, my] = toMap(px, py);
  if (drag.segment !== undefined) {
    bendTo(drag.segment, mx, my, drag.from);
    drag.moved = true;
    const seg = level.segments[drag.segment];
    $('hint').textContent = `Segment ${drag.segment + 1}: ${seg.length} m, bending ${(seg.curve * seg.length * 180 / Math.PI).toFixed(1)}°`;
  } else if (drag.oncoming !== undefined) {
    const n = nearestSide(mx, my, drag.oncoming);
    if (n) setOncomingFrom(drag.oncoming, n.d);
  } else if (drag.pan) {
    view.ox -= (px - drag.pan[0]) / view.k;
    view.oy += (py - drag.pan[1]) / view.k;
    drag.pan = [px, py];
  } else { // a thing: a point moved (and to the lane or side under the pointer), a stretch moved or one of its ends dragged, a landmark moved or turned
    const e = entry(drag.ref), key = drag.ref.key, def = FIELDS[key], place = placeOf(def, e), { grab } = drag;
    if (!place) return;
    drag.moved = true;
    if (grab === 'world') { e.x = Math.round(drag.x - (mx - drag.start[0])); e.z = Math.round(drag.z + (my - drag.start[1])); }
    else if (grab === 'rot') { const [sx, sy] = worldAt(e); e.rot = Math.round(Math.atan2(sx - px, sy - py) * 100) / 100; }
    else {
      const n = alongOf(e, mx, my), d = Math.round(n.s - drag.start), max = sideOf(e) ? sideOf(e).length : def.beyond ? Infinity : length(), min = def.beyond ? -Infinity : 0, least = def.minSpan || 10;
      if (grab === 'p') {
        e[place.p] = clamp(drag.p + d, 0, max);
        for (const [k, S] of Object.entries(def.settings || {})) {
          if (S.type === 'lane' && (e[k] !== undefined || S.required)) e[k] = laneNear(e, S, e[place.p], n.lat);
          if (S.type === 'lanes' && S.span && Array.isArray(e[k])) { const w = e[k][1] - e[k][0], l = laneNear(e, {}, e[place.p], n.lat), top = sideOf(e) ? 3 : laneCount() - 1; e[k] = [clamp(l, 0, Math.max(0, top - w)), clamp(l, 0, Math.max(0, top - w)) + w]; }
        }
        const mid = sideOf(e) ? (acrossAt(e, e[place.p])[1] + acrossAt(e, e[place.p])[2]) / 2 : 0;
        if (e.side === 'left' || e.side === 'right') e.side = n.lat < mid ? 'left' : 'right';
      } else if (grab === 'a') e[place.a] = clamp(drag.a + d, min, e[place.b] - least);
      else if (grab === 'b') e[place.b] = clamp(drag.b + d, e[place.a] + least, max);
      else { e[place.a] = clamp(drag.a + d, min, max - (drag.b - drag.a)); e[place.b] = e[place.a] + (drag.b - drag.a); if ((e.side === 'left' || e.side === 'right') && !sideOf(e) && Math.abs(n.lat) > 1) e.side = n.lat < 0 ? 'left' : 'right'; }
      if (key === 'exits') { survey(); } // (its side road follows it as it is dragged)
    }
  }
  draw();
};
const release = () => {
  if (drag && drag.segment !== undefined) { segmentRows(); hint(); }
  if (drag && (drag.moved || drag.oncoming !== undefined)) { renderInspector(); changed(); } // (the form and the game catch up with the drag)
  drag = null;
};
canvas.addEventListener('pointermove', (e) => moveTo(...local(e)));
canvas.addEventListener('pointerup', release);
canvas.addEventListener('wheel', (e) => { // zoom about the pointer
  e.preventDefault();
  const [px, py] = local(e), [mx, my] = toMap(px, py), k = clamp(view.k * Math.exp(-e.deltaY * 0.0015), 0.02, 40);
  view.k = k;
  const [nx, ny] = toMap(px, py);
  view.ox += mx - nx;
  view.oy += my - ny;
  draw();
}, { passive: false });
$('fit').addEventListener('click', () => { fit(); draw(); });
window.addEventListener('keydown', (e) => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
  if (e.key === 'Escape') { if (tool.kind !== 'select') setTool({ kind: 'select' }); else select(null); return; }
  if (typing) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
  else if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  else if (ctrl && k === 'd') { e.preventDefault(); duplicate(); }
  else if (ctrl && k === 'c' && sel && entry(sel)) clip = { key: sel.key, e: structuredClone(entry(sel)) };
  else if (ctrl && k === 'v' && clip) paste(clip.key, clip.e);
});

// ---- the 3D view: the game itself, in the editor, on the level as it stands, with a free camera (?edited&fly) ----
const hand = () => { try { localStorage.setItem(STORE, JSON.stringify(saveLevel(level))); return true; } catch { return false; } };
// (and kept in step with the level: a little after the last change the view is made afresh, its camera where it
// was. A change made in the view itself, a thing placed or removed there, is in it already)
const STALE_3D = 900; // ms after the last change
let stale3d = 0, own3d = false, asked3d = 0;
const remake3d = (cam) => {
  clearTimeout(asked3d);
  asked3d = 0;
  if (view3d.hidden || !hand()) return;
  view3d.src = './?edited&fly' + (cam ? '&cam=' + cam.join(',') : '') + '&v=' + Date.now();
};
function update3d() {
  if (view3d.hidden || own3d) return;
  clearTimeout(stale3d);
  stale3d = setTimeout(() => {
    if (view3d.hidden || !view3d.contentWindow) return;
    view3d.contentWindow.postMessage({ type: 'pose' }, '*'); // (its answer makes the view afresh: see the messages below)
    asked3d = setTimeout(() => remake3d(null), 500); // (no answer: a view still loading. Afresh from the start line)
  }, STALE_3D);
}
const show3d = (on) => {
  clearTimeout(stale3d);
  view3d.hidden = !on;
  canvas.hidden = on;
  $('fit').hidden = on;
  $('refresh3d').hidden = !on;
  $('reveal3d').hidden = !on;
  $('inspector').classList.toggle('over3d', on);
  $('show3d').textContent = on ? 'Map' : '3D view';
  hint();
  if (on && hand()) view3d.src = './?edited&fly&v=' + Date.now(); // (afresh, with the edits so far)
  if (on) view3d.focus();
  if (!on) { view3d.src = 'about:blank'; draw(); }
};
$('show3d').addEventListener('click', () => show3d(view3d.hidden));
// (not on a touch screen: it is a whole second game running in the page, too much for a phone, and it is
// flown with a keyboard and mouse)
if (matchMedia('(hover: none) and (pointer: coarse)').matches) {
  $('show3d').disabled = true;
  $('show3d').title = 'The 3D view needs a keyboard and mouse (and more than a phone can spare)';
  $('show3d').textContent = '3D view (desktop only)';
}
$('refresh3d').addEventListener('click', () => show3d(true));
// what a level only sets off as the player comes up to it (mines, drop bears, rockfalls, wreckage), shown in
// the 3D view as it ends up, or not: the view is told, and tells back what it is showing (see render/fly.js)
let revealed = false;
const showRevealed = () => { $('reveal3d').textContent = revealed ? 'Hide what triggers later' : 'Show what triggers later'; $('reveal3d').classList.toggle('primary', revealed); };
$('reveal3d').addEventListener('click', () => { if (view3d.contentWindow) view3d.contentWindow.postMessage({ type: 'reveal', on: !revealed }, '*'); view3d.focus(); });
window.addEventListener('resize', () => draw());

// ---- open, load, play and download ---------------------------------------------------------------
let autosaved = null;
try { autosaved = JSON.parse(localStorage.getItem(AUTOSAVE)); } catch { /* (none, or storage blocked) */ }
if (!autosaved || !Array.isArray(autosaved.segments)) autosaved = null;
fill($('pick'), autosaved ? h('option', { value: 'auto' }, 'Autosaved: ' + String(autosaved.name || autosaved.id || 'a level') + ' (where you left off)') : null,
  h('option', { value: '-1' }, 'A new, blank level'), sources.map(([label], i) => h('option', { value: String(i) }, label)));
const openLevel = (raw) => {
  level = loadLevel(raw);
  sel = null;
  hidden.clear();
  refresh();
  fit(); draw();
  past = [snapshot()];
  future = [];
  showHistory();
};
const open = (i) => openLevel(i === 'auto' ? autosaved : Number(i) < 0 ? BLANK : sources[Number(i)][1]);
$('pick').addEventListener('change', (e) => open(e.target.value));
// a level's .json file from the computer: picked with the button, or dropped on the page
const loadFile = (file) => {
  if (!file) return;
  file.text().then((text) => {
    let raw;
    try { raw = JSON.parse(text); } catch (error) { $('status').textContent = file.name + ' is not valid JSON: ' + error.message; return; }
    if (!raw || !Array.isArray(raw.segments) || !raw.segments.length) { $('status').textContent = file.name + ' is not a level: it has no "segments".'; return; }
    const option = h('option', { value: 'file', selected: true }, 'File: ' + file.name);
    $('pick').querySelector('option[value="file"]')?.remove();
    $('pick').prepend(option);
    openLevel(raw);
    record();
  });
};
$('load').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
const play = (evil, from) => {
  if (!hand()) { $('status').textContent = 'Could not hand the level to the game (storage is blocked).'; return; }
  window.open('./?edited' + (evil ? '&evil' : '') + (from ? '&at=' + Math.round(from) : ''), '_blank');
};
$('play').addEventListener('click', () => play(false));
// "Work out the clock": the game, loaded out of sight on the level as it stands, drives its clean run and says
// what clock that gives (main.js ?edited&clock, cleanrun.js: what scripts/level-clocks.mjs does)
let clockFrame = null;
$('workClock').addEventListener('click', () => {
  if (!hand()) { $('status').textContent = 'Could not hand the level to the game (storage is blocked).'; return; }
  if (clockFrame) clockFrame.remove();
  clockFrame = h('iframe', { hidden: true, title: 'The clean run' });
  document.body.append(clockFrame);
  $('workClock').disabled = true;
  $('status').textContent = 'Driving the clean run...';
  clockFrame.src = './?edited&clock&v=' + Date.now();
});
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.type !== 'clock' || !clockFrame || e.source !== clockFrame.contentWindow) return;
  clockFrame.remove();
  clockFrame = null;
  $('workClock').disabled = false;
  if (m.problem || !m.delivered) { $('status').textContent = 'No clock: ' + (m.problem || 'the clean run was not delivered (' + m.outcome + ').'); return; }
  const was = level.clock ? level.clock.good + ' / ' + level.clock.evil + ' s' : 'none';
  level.clock = m.clock;
  renderLevel();
  changed({ layout: false });
  $('status').textContent = 'The clock: ' + m.clock.good + ' s Good, ' + m.clock.evil + ' s Evil (it was ' + was + '), from a clean run of ' + m.time.toFixed(1) + ' s in the ' + m.car +
    (m.pluses ? ', less ' + m.pluses + ' time plus' + (m.pluses === 1 ? '' : 'es') : '') + '.';
});
$('playEvil').addEventListener('click', () => play(true));
$('playFrom').addEventListener('click', () => setTool(tool.kind === 'playFrom' ? { kind: 'select' } : { kind: 'playFrom' }));
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(saveLevel(level), null, 2) + '\n'], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: (level.id || 'level') + '.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---- starting up: the level the address names, or the one left off at, or the first -------------------
const wanted = params.get('level');
const first = wanted === 'blank' ? '-1' : wanted ? String(sources.findIndex(([, l]) => l.id === wanted)) : autosaved ? 'auto' : '0';
$('pick').value = first === '-1' && wanted !== 'blank' ? '0' : first;
open($('pick').value);
showTab(params.get('tab') || 'level');
setTool({ kind: 'select' });
// (for a picture of the editor: see the top of this file)
if (params.get('q')) { $('search').value = params.get('q'); renderTools(); }
if (params.get('hide')) { for (const k of params.get('hide').split(',')) hidden.add(k); renderList(); }
if (params.get('tool')) { const [key, sub] = params.get('tool').split(':'); if (FIELDS[key]) setTool(sub ? { kind: 'place', key, sub } : { kind: 'place', key }); else setTool({ kind: key }); }
for (const spot of params.getAll('click')) { const [s, lat] = spot.split(':').map(Number), q = at(s, lat || 0); placeAt(q.x, q.y); }
for (const spot of params.getAll('sideclick')) { const [i, d] = spot.split(':').map(Number), x = laid && Track.exits[i]; if (x) { const q = mapPoint(x.side0 + d, 0); placeAt(q.x, q.y); } }
if (params.get('sel')) { const [key, n] = params.get('sel').split(':'); const ref = { key, i: FIELDS[key] && isList(FIELDS[key]) ? Number(n) || 0 : -1 }; if (FIELDS[key] && entry(ref)) select(ref); }
for (const d of params.getAll('drag')) { // (a thing picked up where it is and let go that much further on, as the mouse would)
  const [key, n, grab, by] = d.split(':'), ref = { key, i: isList(FIELDS[key]) ? Number(n) : -1 }, e = entry(ref), place = e && placeOf(FIELDS[key], e);
  if (!place) continue;
  rowsOf();
  const line = place.type === 'stretch' ? bandLine(key, e, place) : null, from = place.type === 'point' ? markerAt(key, e, place) : grab === 'a' ? line[0] : grab === 'b' ? line[line.length - 1] : line[Math.floor(line.length / 2)];
  const s0 = place.type === 'point' ? e[place.p] : grab === 'a' ? e[place.a] : grab === 'b' ? e[place.b] : (e[place.a] + e[place.b]) / 2, q = P(e, s0 + Number(by), place.type === 'point' ? latOf(key, e, s0) : bandLat(key, e, s0));
  setTool({ kind: 'select' });
  press(from[0], from[1]);
  moveTo(...toScreen(q.x, q.y));
  release();
}
if (params.get('seglen')) { const [i, to] = params.get('seglen').split(':').map(Number); resize(i, to); segmentRows(); renderInspector(); changed(); }
if (params.get('bend')) { // (a segment's handle dragged to that far on from where the segment starts, and that far to the right)
  const [i, fwd, lat] = params.get('bend').split(':').map(Number), end = segmentEnds()[i], p0 = points[clamp(Math.round(segmentStart(i) / STEP), 0, points.length - 1)];
  press(...toScreen(end.x, end.y));
  moveTo(...toScreen(p0.x + Math.sin(p0.h) * fwd + Math.cos(p0.h) * lat, p0.y + Math.cos(p0.h) * fwd - Math.sin(p0.h) * lat));
  release();
}
if (params.get('undo') || params.get('redo')) { clearTimeout(pending); record(); for (let n = 0; n < Number(params.get('undo')); n++) undo(); for (let n = 0; n < Number(params.get('redo')); n++) redo(); }
if (params.get('zoom')) { const [s, k] = params.get('zoom').split(':').map(Number), q = at(s, 0); view.ox = q.x; view.oy = q.y; view.k = k || 1; }
else if (sel && params.get('sel')) centre(sel);
if (params.get('scroll')) $('side').scrollTop = Number(params.get('scroll'));
if (params.get('view') === '3d') show3d(true); // (&view=3d: the 3D view open)
draw();
