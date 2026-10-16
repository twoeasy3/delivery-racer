// OBSTACLE PATTERNS: a library and a command line for laying the STANDARD exploding obstacle (`barrier`) in named
// formations, in the level JSON's own format ({ s, lane, kind }), with the spacing worked out from the player's real
// steering (config.js steerSpeed / steerResponse / yawGain, as player.js and physics.js use them). The design is in
// src/delivery/OBSTACLE-STAGE-DESIGN.md; the fairness checker that reads a whole level is scripts/obstacle-audit.mjs.
//
//   node scripts/obstacle-patterns.mjs kinematics [--speed 40] [--agility 1]       lane-change times and distances
//   node scripts/obstacle-patterns.mjs gate --lanes 4 --s 500 --gap 2               one formation's obstacle entries
//   node scripts/obstacle-patterns.mjs <pattern> ... --first 2                      lanes counted from the first lane of the player's
//                                                                                   side (a two-way 4-lane road: --first 2)
//   node scripts/obstacle-patterns.mjs list                                        the patterns and their parameters
//   add --meta to print the pattern's rows and the spacing rule it was laid to (to stderr), --speed for the design speed.
//
// Lanes in the parameters are the PLAYER'S lanes counted from the left, 0 .. lanes-1 (the formation is laid in
// those; --first adds the level's lane number of the first). Every pattern leaves at least one lane open in every row.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CONFIG } from '../src/delivery/config.js';

export const KIND = 'barrier'; // THE standard obstacle (see the design doc: the default kind, the widest plain box, a wall when side by side)
const LW = CONFIG.laneWidth;

// the box of a kind, read from collision.js's SIZE table (hw, hl, height), so the library follows the game
export const sizeOf = (kind = KIND) => {
  const src = readFileSync(new URL('../src/delivery/collision.js', import.meta.url), 'utf8');
  const m = src.match(new RegExp('\\b' + kind + ':\\s*\\[([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)\\]'));
  if (!m) throw new Error('no SIZE for ' + kind + ' in collision.js');
  return { hw: +m[1], hl: +m[2], height: +m[3] };
};
export const BOX = sizeOf(KIND);
// the car the numbers are worked for: the reference car of the clocks (CONFIG.clock.car, the Sportscompact) by default,
// and the widest car's half width for the gaps
export const CAR = { hw: 0.85, hl: 1.9, agility: 1 };
export const WIDEST_HW = 1.05; // cars.js: the widest garage car's half width (a bus-like body); gaps are judged for it

// ---- the player's lateral motion, as player.js moves it -------------------------------------------------------------
// latVel goes toward steer * steerSpeed * agility (x min(1, speed / steerFullSpeed)) at steerResponse * sqrt(agility)
// per second (damp: 1 - e^(-rate dt)); with the stick let go, it goes toward the lane assist's faint pull (none within
// laneAssistFree of a lane's centre). The car's yaw follows atan2(latVel, max(speed, yawMinSpeed)) * yawGain, clamped to
// maxYawDeg, at yawSmoothing per second; a yawed car is wider across the road: hl sin(yaw) + hw cos(yaw).
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const MAX_YAW = Math.min(CONFIG.maxYawDeg, 45) * Math.PI / 180;
export const yawFor = (latVel, speed) => Math.max(-MAX_YAW, Math.min(MAX_YAW, Math.atan2(latVel, Math.max(Math.abs(speed), CONFIG.yawMinSpeed)) * CONFIG.yawGain));
export const stepLateral = (st, steer, speed, agility, dt, assistTo = null) => {
  let want;
  if (steer !== 0) want = steer * CONFIG.steerSpeed * agility * Math.min(1, Math.max(0, speed) / CONFIG.steerFullSpeed);
  else if (assistTo !== null) { const off = assistTo - st.lat; want = Math.sign(off) * Math.max(0, Math.abs(off) - CONFIG.laneAssistFree) * CONFIG.laneAssist; }
  else want = 0;
  const latVel = st.latVel + (want - st.latVel) * damp(CONFIG.steerResponse * Math.sqrt(agility), dt);
  const lat = st.lat + latVel * dt;
  let yaw = st.yaw + (yawFor(latVel, speed) - st.yaw) * damp(CONFIG.yawSmoothing, dt);
  yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw));
  return { lat, latVel, yaw };
};
// time to move `lanes` lanes over and be settled in the new lane (within `tol` m of its centre, under 0.5 m/s across):
// steer full until letting go would coast the rest of the way, then let go (the best a player can do with a key)
export const laneChange = (lanes = 1, opts = {}) => ({ lanes, ...shiftChange(lanes * LW, opts) });
export const shiftChange = (metres, { speed = 40, agility = 1, dt = 1 / 120, tol = 0.3 } = {}) => {
  if (metres <= 0) return { time: 0, held: 0, distance: 0, widestHalf: CAR.hw };
  const target = metres, tau = 1 / (CONFIG.steerResponse * Math.sqrt(agility));
  let st = { lat: 0, latVel: 0, yaw: 0 }, t = 0, held = 0, widest = CAR.hw;
  while (t < 10) {
    const steer = st.lat + st.latVel * tau < target ? 1 : 0;
    if (steer) held = t + dt;
    st = stepLateral(st, steer, speed, agility, dt);
    t += dt;
    widest = Math.max(widest, CAR.hl * Math.sin(Math.abs(st.yaw)) + CAR.hw * Math.cos(st.yaw));
    if (Math.abs(st.lat - target) < Math.min(tol, target / 2) && Math.abs(st.latVel) < 0.5) break;
  }
  return { time: t, held, distance: t * speed, widestHalf: widest };
};

// ---- the spacing rules ---------------------------------------------------------------------------------------------
// REACT: s from first seeing a formation to the first steering (a fast but not twitchy human: a seen, expected
// obstacle ~0.5 s; we design to 0.75 s). The rows of a formation, once seen, are planned together, so between two rows
// only the lane change itself and a little slack are needed: rowGap(k) = speed x (laneChange(k) + SLACK) + the two
// boxes' lengths and the car's (the car must be clear of one row before turning hard into the next).
export const REACT = 0.75, SLACK = 0.25;
export const rowGap = (lanes, speed = 40, agility = 1) => {
  if (lanes <= 0) return Math.ceil(2 * BOX.hl + 2 * CAR.hl + 8); // (no lane change: just apart enough to read as two rows)
  return Math.ceil(speed * (laneChange(lanes, { speed, agility }).time + SLACK) + 2 * BOX.hl + 2 * CAR.hl);
}; // (a whole number of lanes, centre to centre; for two rows of barriers use gapFor, which knows a one-lane step is a nudge)
// how far ahead a formation must be in plain sight (m) for a player in the worst lane, `lanes` lanes from the way through
export const sightNeeded = (lanes, speed = 40, agility = 1) => Math.ceil(speed * (REACT + laneChange(Math.max(1, lanes), { speed, agility }).time + SLACK) + BOX.hl + CAR.hl);
// Track.problems: two items closer than 8 m along the road AND 2 m across are "on top of another item"; so the same
// lane is never used twice within 8 m (a lane line drawn in barriers: every LINE_STEP m)
export const LINE_STEP = 10;
// the space a car of half width hw (and its yaw) needs between two boxes, and what the row leaves
export const gapBetween = (latA, latB) => Math.abs(latB - latA) - 2 * BOX.hw; // (centres a lane apart: 3.5 - 2.4 = 1.1 m: a wall)

// ---- what a row leaves open, and how far the car must move between two rows ------------------------------------------------
// lanes (relative, 0 .. n-1) on a road of n lanes centred on 0. A row's OPENINGS are the stretches across the lanes no barrier
// covers; a car of half width hw fits where an opening is wider than 2 hw (its centre then anywhere in [a + hw, b - hw]).
// The SHIFT between two rows is the least a car must move across between them: 0 where an opening of each overlaps by a car's
// width (two gates one lane apart overlap by 1.1 m, a lane line's width each side: a car on the line nudges 0.6 m, it does not
// change lane). So one-lane steps are NUDGES; a real lane change needs openings two lanes apart.
export const centreOf = (k, n) => (k - (n - 1) / 2) * LW;
export const openings = (blocked, n, hw = CAR.hw + 0.1) => {
  const spans = blocked.map(k => [centreOf(k, n) - BOX.hw, centreOf(k, n) + BOX.hw]).sort((a, b) => a[0] - b[0]);
  const out = []; let at = -n * LW / 2;
  for (const [a, b] of [...spans, [n * LW / 2, n * LW / 2]]) { if (a - at >= 2 * hw) out.push([at + hw, a - hw]); at = Math.max(at, b); }
  return out; // (the car's centre's ranges)
};
export const shiftBetween = (blockedA, blockedB, n) => {
  let best = Infinity;
  for (const [a0, a1] of openings(blockedA, n)) for (const [b0, b1] of openings(blockedB, n)) best = Math.min(best, Math.max(0, b0 - a1, a0 - b1));
  return best;
};
// the road between two rows (m, centre to centre) for the shift between them: speed x (the shift's time + SLACK), the boxes and the car
export const gapFor = (blockedA, blockedB, n, speed = 40, agility = 1) => {
  const d = shiftBetween(blockedA, blockedB, n);
  return Math.ceil(speed * (shiftChange(d, { speed, agility }).time + SLACK) + 2 * BOX.hl + 2 * CAR.hl + (d > 0 ? 0 : 8));
};
// rows laid one after another, each `gapFor` the one before (or o.spacing)
const chain = (o, blockedList, notes) => {
  let s = o.s;
  return blockedList.map((lanes, i) => {
    if (i) s += o.spacing ?? gapFor(blockedList[i - 1], lanes, o.lanes, o.speed, o.agility);
    return { s, lanes, note: notes[i] };
  });
};

// ---- the patterns ------------------------------------------------------------------------------------------------------
// each: (o) => rows: [{ s, lanes: [relative lanes blocked], note }] laid from o.s; o.lanes = the player's lanes, o.speed the
// design speed. Lanes are relative (0 = the player's leftmost); `entries()` turns rows into level JSON entries
const R = (v) => Math.round(v);
const clampLane = (k, n) => Math.max(0, Math.min(n - 1, k));
const allBut = (n, open) => { const keep = new Set([].concat(open)); return [...Array(n).keys()].filter(k => !keep.has(k)); };
export const PATTERNS = {
  gate: {
    about: 'A wall across every lane but one: the gap. The plainest decision: find the gap, be in it.',
    params: { gap: 'lane left open (default the middle-right one)' },
    rows: (o) => [{ s: o.s, lanes: allBut(o.lanes, o.gap ?? Math.floor(o.lanes / 2)), note: 'gate, gap ' + (o.gap ?? Math.floor(o.lanes / 2)) }],
  },
  gaterun: {
    about: 'Gates in a row, the gap jumping about: each gate spaced for the shift it asks (a one-lane step is a nudge, two lanes a lane change).',
    params: { gaps: 'the gap of each gate, comma separated (default 0,2,1,3 on 4 lanes, 0,2,1 on 3, 0,1,0 on 2)', spacing: 'm between gates (default: worked out per pair)' },
    rows: (o) => {
      const gaps = (o.gaps !== undefined ? String(o.gaps).split(',').map(Number) : o.lanes >= 4 ? [0, 2, 1, 3] : o.lanes === 3 ? [0, 2, 1] : [0, 1, 0]).map(k => clampLane(k, o.lanes));
      return chain(o, gaps.map(g => allBut(o.lanes, g)), gaps.map((g, i) => 'gate ' + (i + 1) + ', gap ' + g));
    },
  },
  slalom: {
    about: 'A one-lane way swinging between two lanes TWO apart, again and again: a full lane change each time, in a rhythm.',
    params: { a: 'one lane of the weave (default 0)', b: 'the other (default a + 2)', count: 'rows (default 5)', spacing: 'm between rows' },
    rows: (o) => {
      const a = clampLane(o.a ?? 0, o.lanes), b = clampLane(o.b ?? a + 2, o.lanes), n = o.count ?? 5, open = [...Array(n).keys()].map(i => i % 2 ? b : a);
      return chain(o, open.map(k => allBut(o.lanes, k)), open.map((k, i) => 'slalom ' + (i + 1) + ', open ' + k));
    },
  },
  zipper: {
    about: 'Two staggered rows, every other lane then the others: no lane change, a THREAD: sit on a lane line and nudge 0.6 m.',
    params: { spacing: 'm between the two rows (default: worked out)', start: '0 = the first row on even lanes (default), 1 = on odd lanes' },
    rows: (o) => {
      const even = [...Array(o.lanes).keys()].filter(k => k % 2 === (o.start ?? 0)), odd = allBut(o.lanes, even);
      return chain(o, [even, odd], ['zipper, row 1', 'zipper, row 2']);
    },
  },
  taper: {
    about: 'Lanes close one by one from one side (a diagonal), each closed lane then a line of barriers `hold` m long: a funnel to the open lane.',
    params: { side: "'right' (default: the right-hand lanes close first) or 'left'", open: 'the lane that stays open (default the far side)', hold: 'm the closed lanes stay shut after the last one closes (default 40)', step: 'm between one lane closing and the next (default 30)' },
    rows: (o) => {
      const right = o.side !== 'left', open = clampLane(o.open ?? (right ? 0 : o.lanes - 1), o.lanes);
      const order = right ? [...Array(o.lanes).keys()].reverse().filter(k => k > open) : [...Array(o.lanes).keys()].filter(k => k < open);
      const step = o.step ?? 3 * LINE_STEP, hold = o.hold ?? 40, rows = [], end = o.s + (order.length - 1) * step + hold;
      order.forEach((k, i) => { for (let s = o.s + i * step; s <= end; s += LINE_STEP) rows.push({ s, lanes: [k], note: s === o.s + i * step ? 'lane ' + k + ' closes' : '' }); });
      return mergeRows(rows);
    },
  },
  diagonal: {
    about: 'A rolling roadworks line: one barrier a lane, stepping across the road, sweeping the player to one side.',
    params: { side: "'right' (default: starts in the right lane, sweeps left) or 'left'", stop: 'lanes it covers (default lanes - 1: the last lane stays open)', step: 'm between barriers (default 20)' },
    rows: (o) => {
      const right = o.side !== 'left', n = o.stop ?? o.lanes - 1, step = o.step ?? 2 * LINE_STEP;
      return [...Array(n).keys()].map(i => ({ s: o.s + i * step, lanes: [right ? o.lanes - 1 - i : i], note: 'diagonal ' + (i + 1) }));
    },
  },
  chicane: {
    about: 'Two walls, the first open at one edge, the second at the other: the full-width swing (on a bend: open on the outside, then the apex).',
    params: { first: "the first wall's open lane (default the rightmost)", spacing: 'm between the walls (default: worked out for the swing)' },
    rows: (o) => {
      const a = clampLane(o.first ?? o.lanes - 1, o.lanes), b = a === 0 ? o.lanes - 1 : 0;
      return chain(o, [allBut(o.lanes, a), allBut(o.lanes, b)], ['chicane in, open ' + a, 'chicane out, open ' + b]);
    },
  },
  island: {
    about: 'A block `width` lanes wide and `length` long in the middle of the road, lanes either side: pick a side early and commit.',
    params: { at: 'its left lane (default the middle)', width: 'lanes wide (default 2; 1 on 3 lanes)', length: 'm long (default 20: three rows)' },
    rows: (o) => {
      const w = o.width ?? (o.lanes >= 4 ? 2 : 1), at = clampLane(o.at ?? Math.floor((o.lanes - w) / 2), o.lanes - w + 1), len = o.length ?? 20, rows = [];
      for (let s = o.s; s <= o.s + len; s += LINE_STEP) rows.push({ s, lanes: [...Array(w).keys()].map(i => at + i), note: s === o.s ? 'island' : '' });
      return rows;
    },
  },
  crest: {
    about: 'A lead-in gate in plain sight BEFORE a blind crest, and its echo past the crest with the SAME gap: trust the gate.',
    params: { crest: 's of the crest', gap: 'the gap of both', before: 'm short of the crest (default 60)', after: 'm past it (default 40)' },
    rows: (o) => {
      const c = o.crest ?? o.s, gap = o.gap ?? Math.floor(o.lanes / 2);
      return [{ s: c - (o.before ?? 60), lanes: allBut(o.lanes, gap), note: 'lead-in gate, gap ' + gap }, { s: c + (o.after ?? 40), lanes: allBut(o.lanes, gap), note: 'echo past the crest, gap ' + gap }];
    },
  },
  bookend: {
    about: 'Two walls with a safe pocket between (cash in it): in at one gap, out at another, time to cross between.',
    params: { in: 'gap of the first (default 0)', out: 'gap of the second (default the last lane)', pocket: 'm between them (default 3 s at the speed, or more if the swing needs it)' },
    rows: (o) => {
      const a = clampLane(o.in ?? 0, o.lanes), b = clampLane(o.out ?? o.lanes - 1, o.lanes), A = allBut(o.lanes, a), B = allBut(o.lanes, b);
      const P = o.pocket ?? Math.max(gapFor(A, B, o.lanes, o.speed, o.agility), R(3 * o.speed));
      return [{ s: o.s, lanes: A, note: 'bookend in, gap ' + a }, { s: o.s + P, lanes: B, note: 'bookend out, gap ' + b }];
    },
  },
};
// rows at the same s merged
const mergeRows = (rows) => {
  const by = new Map();
  for (const r of rows) { const row = by.get(r.s) || { s: r.s, lanes: [], note: '' }; row.lanes.push(...r.lanes); row.note = [row.note, r.note].filter(Boolean).join('; '); by.set(r.s, row); }
  return [...by.values()].sort((a, b) => a.s - b.s);
};
// a pattern's rows, checked: no row may close every lane
export const layRows = (name, opts) => {
  const P = PATTERNS[name];
  if (!P) throw new Error('no pattern ' + name + ' (' + Object.keys(PATTERNS).join(', ') + ')');
  const o = { speed: 40, agility: 1, lanes: 4, s: 0, ...opts };
  const rows = P.rows(o).map(r => ({ ...r, s: R(r.s), lanes: [...new Set(r.lanes)].sort((a, b) => a - b) }));
  for (const r of rows) if (r.lanes.length >= o.lanes) throw new Error(name + ': the row at ' + r.s + ' closes every lane');
  return rows;
};
// the level JSON's obstacle entries for those rows (first: the level's lane number of the player's leftmost lane)
export const entries = (rows, first = 0, kind = KIND) => rows.flatMap(r => r.lanes.map(k => ({ s: r.s, lane: first + k, kind })));
export const lay = (name, opts = {}) => entries(layRows(name, opts), opts.first ?? 0, opts.kind ?? KIND);
// a cash line through a formation: pickups on the way through (the open lane of each row, and between rows on the line
// the car takes), `every` m apart: lures INTO the line the formation wants, never into a barrier
export const cashLine = (rows, { first = 0, every = 15, type = 'cash5', from, to, lanes = 4 } = {}) => {
  const open = rows.map(r => ({ s: r.s, lane: allBut(lanes, r.lanes).sort((a, b) => a - b) }));
  const out = [], a = from ?? open[0].s - 30, b = to ?? open[open.length - 1].s + 30;
  for (let s = a; s <= b; s += every) {
    const next = open.find(r => r.s >= s) || open[open.length - 1];
    const lane = next.lane[Math.floor(next.lane.length / 2)];
    if (rows.some(r => Math.abs(r.s - s) < 9 && r.lanes.includes(lane))) continue; // (never on top of a barrier)
    out.push({ type, s: R(s), lane: first + lane });
  }
  return out;
};

// ---- the lab level (src/delivery/levels/obstacle-lab.json): every pattern once, in a rhythm, on a 4-lane one-way city road ----
// (`node scripts/obstacle-patterns.mjs lab` prints its obstacles and pickups; the level's shape, a bend at 1150-1400 and a crest
// at 1950, is in its file). Laid for 40 m/s.
export const LAB = [
  { name: 'gate', s: 260, gap: 2, cash: true },                      // call: one decision
  { name: 'zipper', s: 440, cash: true },                            // response: one shift between two rows
  { name: 'island', s: 640, at: 1, width: 2, length: 20, cash: 'left' }, // a fork: pick a side (the cash says left)
  { name: 'gaterun', s: 840, gaps: '0,2,1,3', cash: true },          // the first bigger set
  { name: 'chicane', s: 1200, first: 0, cash: true },                // on the right-hand bend: outside, then the apex
  { name: 'diagonal', s: 1440, side: 'right' },                      // a rolling line sweeping left...
  { name: 'taper', s: 1600, side: 'right', open: 0, hold: 40 },      // ...into a funnel down to lane 0
  { name: 'crest', crest: 1950, gap: 1, before: 70, after: 45 },     // trust the gate over the blind crest
  { name: 'slalom', s: 2160, a: 1, b: 3, count: 5, cash: true },     // the climax: a weave, a lane change each row
  { name: 'bookend', s: 2440, in: 0, out: 3, pocket: 120, cash: true }, // the last word: in at one edge, out at the other, cash in the pocket
];
export const layLab = (speed = 40) => {
  const obstacles = [], pickups = [];
  for (const step of LAB) {
    const rows = layRows(step.name, { ...step, lanes: 4, speed });
    obstacles.push(...entries(rows));
    if (step.cash === 'left') for (let s = step.s - 20; s <= step.s + (step.length ?? 20) + 20; s += 10) pickups.push({ type: 'cash10', s, lane: 0 });
    else if (step.cash) pickups.push(...cashLine(rows, { lanes: 4, every: 12, type: 'cash5' }));
  }
  return { obstacles: obstacles.sort((a, b) => a.s - b.s || a.lane - b.lane), pickups: pickups.sort((a, b) => a.s - b.s) };
};

// a pattern's rows as a picture: one line a row, the lanes left to right, and the shift the car must make from the row before
export const picture = (rows, n) => rows.map((r, i) => String(r.s).padStart(6) + '  ' + [...Array(n).keys()].map(k => r.lanes.includes(k) ? '[##]' : ' .. ').join('') +
  (i ? '  +' + String(r.s - rows[i - 1].s).padStart(3) + ' m, shift ' + shiftBetween(rows[i - 1].lanes, r.lanes, n).toFixed(1) + ' m' : '') + (r.note ? '  ' + r.note : ''));

// ---- the command line ----------------------------------------------------------------------------------------------------
const main = () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) continue;
    const key = rest[i].slice(2), val = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    o[key] = typeof val === 'string' && /^-?[\d.]+$/.test(val) ? Number(val) : val;
  }
  if (!cmd || cmd === 'list' || cmd === 'help') {
    console.log('patterns (all lay `' + KIND + '` only, ' + (2 * BOX.hw) + ' m wide, ' + (2 * BOX.hl) + ' m long):');
    for (const [name, P] of Object.entries(PATTERNS)) {
      console.log('  ' + name.padEnd(9) + P.about);
      for (const [k, v] of Object.entries(P.params)) console.log('             --' + k + ': ' + v);
    }
    console.log('  common:  --lanes N (the player\'s lanes)  --first F (level lane of the leftmost)  --s S  --speed V (m/s)  --agility A  --meta  --cash');
    return;
  }
  if (cmd === 'kinematics') {
    const speeds = o.speed ? [o.speed] : [25, 32, 40, 50, 60, 70];
    console.log('lane change (agility ' + (o.agility ?? 1) + ', the reference car ' + CAR.hw * 2 + ' m wide): time to be settled k lanes over, and the road it takes');
    for (const v of speeds) {
      const cells = [1, 2, 3].map(k => { const c = laneChange(k, { speed: v, agility: o.agility ?? 1 }); return k + ' lane' + (k > 1 ? 's' : ' ') + ' ' + c.time.toFixed(2) + ' s ' + R(c.distance) + ' m'; });
      console.log('  ' + String(v).padStart(3) + ' m/s: ' + cells.join('  |  ') + '  |  row gap(1) ' + rowGap(1, v, o.agility ?? 1) + ' m, sight needed(1) ' + sightNeeded(1, v, o.agility ?? 1) + ' m, (3) ' + sightNeeded(3, v, o.agility ?? 1) + ' m');
    }
    for (const v of speeds.slice(0, 1)) console.log('  (the times do not depend on the speed above ' + CONFIG.steerFullSpeed + ' m/s, the road taken does) a nudge of 0.6 m (a lane line straddled through a one-lane step) ' + shiftChange(0.6, { speed: v }).time.toFixed(2) + ' s; the full swing across 4 lanes between two walls (' + shiftBetween([0, 1, 2], [1, 2, 3], 4).toFixed(1) + ' m) ' + shiftChange(shiftBetween([0, 1, 2], [1, 2, 3], 4), { speed: v }).time.toFixed(2) + ' s');
    const c = laneChange(1, { speed: 40 });
    console.log('  the car is ' + (2 * c.widestHalf).toFixed(2) + ' m across at the height of a lane change at 40 m/s (yawed); two barriers a lane apart leave ' + gapBetween(0, LW).toFixed(1) + ' m (a wall), two lanes apart ' + gapBetween(0, 2 * LW).toFixed(1) + ' m');
    return;
  }
  if (cmd === 'lab') {
    const lab = layLab(o.speed ?? 40);
    if (o.meta) for (const step of LAB) { console.error(step.name + ':'); for (const line of picture(layRows(step.name, { ...step, lanes: 4, speed: o.speed ?? 40 }), 4)) console.error(line); }
    console.log(JSON.stringify(lab));
    return;
  }
  const rows = layRows(cmd, o);
  const list = entries(rows, o.first ?? 0, o.kind ?? KIND);
  if (o.meta) {
    for (const line of picture(rows, o.lanes ?? 4)) console.error(line);
    console.error('(' + list.length + ' barriers; at ' + (o.speed ?? 40) + ' m/s the first row must be in plain sight ' + sightNeeded(o.lanes ?? 4, o.speed ?? 40) + ' m ahead for a player in the farthest lane)');
  }
  const out = o.cash ? { obstacles: list, pickups: cashLine(rows, { first: o.first ?? 0, lanes: o.lanes ?? 4 }) } : list;
  console.log(JSON.stringify(out, null, o.pretty ? 2 : 0).replace(/\},\{/g, '},\n{'));
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
