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
import { readFileSync, writeFileSync } from 'node:fs';
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
// WIDE barriers (a level obstacle's "span", collision.js / track.js spanOffset): `span` lanes wide from lane `lane` rightwards, one box
// 0.55 m in from the outer lanes' lines (as a barrier is in its lane): 2.4 m wide at 1 lane, 4.15 at 1.5, 5.9 at 2, 7.65 at 2.5, 9.4 at 3
export const wideHw = (span) => BOX.hw + (span - 1) * LW / 2;
// the boxes of a row across the road ([left, right] in m): a row is { lanes: [barriers' lanes], wide: [{ lane, span }] } or a plain array of lanes
export const boxesOf = (b, n) => {
  const free = Array.isArray(b) ? [] : (b.free || []).map(k => { const c = centreOf(k, n), hw = b.freeHw ?? BOX.hw; return [c - hw, c + hw]; }); // (obstacles at ANY lane position, e.g. 1.25: the free-position gaps, §5c)
  return [...(Array.isArray(b) ? b : b.lanes || []).map(k => ({ lane: k, span: 1 })), ...(Array.isArray(b) ? [] : b.wide || [])]
    .map(({ lane, span }) => { const c = centreOf(lane + (span - 1) / 2, n), hw = wideHw(span); return [c - hw, c + hw]; }).concat(free);
};
// the squeezes of a row: a gap between two boxes of 1.2 m up to the widest car and 0.6 m (a wall or a way through, never between). A strip between
// a line barrier and the lanes' edge is not one: the shoulder runs on beside it (the audit's rule too)
export const squeezesOf = (b, n) => {
  if (!Array.isArray(b) && (b.free || []).length) return []; // (a slot row: its gaps are slots, judged by width, below)
  const spans = boxesOf(b, n).sort((a, c) => a[0] - c[0]), out = [], need = 2 * WIDEST_HW + 0.6; let at = null;
  for (const [a, c] of spans) { if (at !== null && a - at >= 1.2 && a - at < need) out.push(+(a - at).toFixed(2)); at = at === null ? c : Math.max(at, c); }
  return out;
};
export const openings = (blocked, n, hw = CAR.hw + 0.1) => {
  const spans = boxesOf(blocked, n).sort((a, b) => a[0] - b[0]);
  const out = []; let at = -n * LW / 2;
  for (const [a, b] of [...spans, [n * LW / 2, n * LW / 2]]) { if (a - at >= 2 * hw) out.push([at + hw, a - hw]); at = Math.max(at, b); }
  return out; // (the car's centre's ranges)
};
// the open stretches of a row (m wide), whatever car: for the fairness numbers
export const gapsOf = (blocked, n) => {
  const spans = boxesOf(blocked, n).sort((a, b) => a[0] - b[0]), out = []; let at = -n * LW / 2;
  for (const [a, b] of [...spans, [n * LW / 2, n * LW / 2]]) { if (a - at > 0.01) out.push(+(a - at).toFixed(2)); at = Math.max(at, b); }
  return out;
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
// a row closing every lane but `open` (a lane, or a lane line: 1.5 = the line between lanes 1 and 2), each run of closed road ONE
// wide barrier (a single lane's run is a plain barrier)
export const wallRow = (n, open) => {
  const lo = Math.floor(open) === open ? open : open - 0.5, hi = Math.floor(open) === open ? open : open + 0.5; // (the open stretch, in lanes)
  const row = { lanes: [], wide: [] }, put = (a, b) => { const span = b - a + 1; if (span <= 0) return; if (span < 1) throw new Error('a gap on lane line ' + open + ' leaves half a lane closed at the edge: no barrier is narrower than a lane'); if (span === 1 && Number.isInteger(a)) row.lanes.push(a); else row.wide.push({ lane: a, span }); };
  if (Number.isInteger(open)) { put(0, open - 1); put(open + 1, n - 1); } else { put(0, lo - 0.5); put(hi + 0.5, n - 1); }
  return row;
};

// rows laid one after another, each `gapFor` the one before (or o.spacing)
const chain = (o, blockedList, notes) => {
  let s = o.s;
  return blockedList.map((b, i) => {
    if (i) s += o.spacing ?? gapFor(blockedList[i - 1], b, o.lanes, o.speed, o.agility);
    return Array.isArray(b) ? { s, lanes: b, note: notes[i] } : { ...b, s, lanes: b.lanes || [], wide: b.wide || [], note: notes[i] };
  });
};

// ---- the patterns ------------------------------------------------------------------------------------------------------
// each: (o) => rows: [{ s, lanes: [relative lanes blocked], note }] laid from o.s; o.lanes = the player's lanes, o.speed the
// design speed. Lanes are relative (0 = the player's leftmost); `entries()` turns rows into level JSON entries
const R = (v) => Math.round(v);
const clampLane = (k, n) => Math.max(0, Math.min(n - 1, k));
const allBut = (n, open) => { const keep = new Set([].concat(open)); return [...Array(n).keys()].filter(k => !keep.has(k)); };
// ---- FREE-POSITION SLOTS (OPT-IN, design doc 5c) -------------------------------------------------------------------------
// The player steers continuously and can sit ANYWHERE across the road, not only on a lane centre. A SLOT is the gap between obstacles, centred
// at any lateral position (on a lane line, a quarter lane...), only a little wider than the car: the row is a wall of obstacles either side of it,
// and the slot's position changes from row to row, so the car must be steered to a lateral position, not a lane. Obstacles stand at any lane
// position (`lane: 1.25`; Track.problems allows it between two open lanes: the replay rules fingerprint moved with that edit).
// The slot a car needs: 2 x its half width + a margin each side (0.25 m; 0.30 m for the widest): the classes below.
export const SLOT_MARGIN = 0.25;
export const slotFor = (hw) => +(2 * hw + 2 * (hw > 0.9 ? 0.30 : SLOT_MARGIN)).toFixed(2);
export const SLOT_CLASSES = [['narrow car', 0.75], ['reference car (Sportscompact)', 0.85], ['wide car', 0.95], ['widest garage car', 1.05]].map(([name, hw]) => ({ name, hw, slot: slotFor(hw) }));
export const WALL_MAX = 1.2; // a gap narrower than this reads as closed (no car is that narrow)
// the lane-unit position of a lateral position, and back (the lanes counted from the left of the player's side, n of them)
export const laneAt = (m, n) => +((m + n * LW / 2) / LW - 0.5).toFixed(3);
// the slot centre range (m) a wall of `kind` boxes can hold on n lanes: every box stands at a lane position of 0 or more, so the outermost box
// centre is the first lane's centre, and the slot must leave room for one box each side
export const slotRange = (n, width, kind = KIND) => { const hw = sizeOf(kind).hw, c0 = centreOf(0, n); return [c0 + hw + width / 2, -(c0 + hw + width / 2)]; };
// one wall across n lanes with a slot of `width` m centred at lane position `at` (lane units): boxes of `kind` either side, a pitch of 1.0 m of
// wall between them, out to the first and last lane's centre. Returns the row's `free` lane positions.
export const slotRow = (n, at, width, kind = KIND) => {
  const hw = sizeOf(kind).hw, c = centreOf(at, n), c0 = centreOf(0, n), c1 = centreOf(n - 1, n), pitch = 2 * hw + 1.0, free = [];
  const [lo, hi] = slotRange(n, width, kind);
  if (!(lo <= hi)) throw new Error('slot: a ' + width + ' m slot with ' + kind + ' boxes does not fit ' + n + ' lanes (every box stands at a lane position of 0 or more)');
  if (c < lo - 0.001 || c > hi + 0.001) throw new Error('slot: centre ' + at + ' (' + c.toFixed(2) + ' m) is outside what ' + n + ' lanes can hold, ' + lo.toFixed(2) + ' to ' + hi.toFixed(2) + ' m (lane ' + laneAt(lo, n) + ' to ' + laneAt(hi, n) + ')');
  for (const dir of [-1, 1]) {
    let x = c + dir * (width / 2 + hw), prev = null;
    for (let j = 0; j < 12; j++) {
      const edge = dir < 0 ? c0 : c1;
      let at2 = dir < 0 ? Math.max(x, edge) : Math.min(x, edge);
      if (prev !== null && Math.abs(at2 - prev) < 2.0) break; // (the placement rule: items closer than 2 m across, within 8 m along, are "on top of another")
      free.push(laneAt(at2, n)); prev = at2;
      if (at2 === edge || (dir < 0 ? at2 - hw : at2 + hw) * dir >= (n * LW / 2 - 1.1)) break;
      x += dir * pitch;
    }
  }
  return { free: free.sort((a, b) => a - b), freeKind: kind, freeHw: hw, slot: { at, centre: +c.toFixed(3), width } };
};
// the slots of a row (boxes as [left, right] m): every gap of 1.2 m or more between boxes, { c: centre m, w: width m }
export const slotsOfSpans = (spans) => {
  const sp = [...spans].sort((a, b) => a[0] - b[0]), out = []; let at = null;
  for (const [a, b] of sp) { if (at !== null && a - at >= WALL_MAX) out.push({ c: (a + at) / 2, w: a - at }); at = at === null ? b : Math.max(at, b); }
  return out;
};
// the least a car (half width hw + the margin) must move across between two rows of slots: the slots' usable centre ranges (width less the car and
// its margins) are [c - slack, c + slack], and it moves from one to the other
export const slotShift = (slotsA, slotsB, hw = CAR.hw) => {
  let best = Infinity;
  const slack = (w) => Math.max(0, (w - 2 * (hw + SLOT_MARGIN)) / 2);
  for (const a of slotsA) for (const b of slotsB) best = Math.min(best, Math.max(0, Math.abs(b.c - a.c) - slack(a.w) - slack(b.w)));
  return best;
};
// the road between two rows (m, centre to centre): the shift's time + a little slack at the speed, the boxes' lengths and the car's
export const slotGap = (shift, speed = 40, agility = 1, hl = BOX.hl) => Math.ceil(speed * (shiftChange(shift, { speed, agility }).time + SLACK) + 2 * hl + 2 * CAR.hl + (shift > 0 ? 0 : 8));
// the width of the slots of a row of the given spans, for the audit and the picture
export const rowSlots = (row, n) => slotsOfSpans(boxesOf(row, n));
const slotRows = (o, atList, width, kind, notes) => {
  const rows = atList.map(at => ({ lanes: [], ...slotRow(o.lanes, at, width, kind) }));
  let s = o.s; const hl = sizeOf(kind).hl;
  return rows.map((r, i) => { if (i) s += o.spacing ?? Math.max(o.minSpacing ?? 30, slotGap(slotShift(rowSlots(rows[i - 1], o.lanes), rowSlots(r, o.lanes)), o.speed, o.agility, hl)); return { ...r, s, note: notes[i] }; });
};
// the default slot centre: the middle lane line, or the nearest position the road can hold with those boxes (3 lanes: the middle lane's centre, a line is out of reach)
const middleLine = (n, width = 2.7, kind = KIND) => { const [lo, hi] = slotRange(n, width, kind), at = Math.floor((n - 1) / 2) + 0.5, l0 = laneAt(lo, n), l1 = laneAt(hi, n); return +(at >= l0 && at <= l1 ? at : (n - 1) / 2).toFixed(3); };
const slotWidth = (o) => o.width ?? 2.7;

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
  // ---- FREE-POSITION SLOTS (OPT-IN, §5c): the way through is a slot between obstacles, centred anywhere, a little wider than the car ----
  slot: {
    about: 'SLOT (opt-in): ONE wall of obstacles across the road with ONE slot in it, centred at any lateral position (default ON a lane line): steer the car to it. Width 2.2 m is the reference car with no play at all, 2.4 m is tight, 2.7 m fits the widest.',
    params: { at: 'the slot centre in lane units (default the middle lane line, 1.5 on 4 lanes; 1.25 is a quarter lane past lane 1)', width: 'slot width in m (default 2.7; 2.2 only for cars up to the reference car)', kind: "obstacle kind (default 'barrier'; 'crate' for finer control)" },
    rows: (o) => { const at = o.at ?? middleLine(o.lanes, slotWidth(o), o.kind ?? KIND); return slotRows(o, [at], slotWidth(o), o.kind ?? KIND, ['slot at lane ' + at]); },
  },
  slotrun: {
    about: 'SLOT (opt-in): a run of walls whose slot DRIFTS by a fraction of a lane each row, bouncing between the edges of what the road can hold: a continuous weave, the player hand-steers a thread, never a lane change.',
    params: { at: 'the first slot centre (lane units, default the lowest the road can hold)', step: 'lanes the slot moves each row (default 0.4 = 1.4 m)', count: 'walls (default 6)', width: 'slot width in m (default 2.7)', kind: "obstacle kind (default 'barrier')", spacing: 'm between walls (default: worked out from the shift, at least 30)' },
    rows: (o) => {
      const kind = o.kind ?? KIND, w = slotWidth(o), [lo, hi] = slotRange(o.lanes, w, kind), a = laneAt(lo, o.lanes), b = laneAt(hi, o.lanes), step = o.step ?? 0.4, n = o.count ?? 6;
      if (!(a < b)) throw new Error('slotrun: ' + o.lanes + ' lanes hold a slot at one position only (' + a + '): use `slot`');
      const at = []; let x = Math.max(a, Math.min(b, o.at ?? a)), d = 1;
      for (let i = 0; i < n; i++) { at.push(+x.toFixed(3)); x += d * step; if (x > b) { x = 2 * b - x; d = -1; } else if (x < a) { x = 2 * a - x; d = 1; } }
      return slotRows(o, at, w, kind, at.map((v, i) => 'slot ' + (i + 1) + ' at lane ' + v));
    },
  },
  slotstagger: {
    about: 'SLOT (opt-in): walls leaving their slot alternately at the two sides of a lane line (`offset` lanes either way): a small steer each row, left of the line then right of it.',
    params: { line: 'the lane line (default the middle one)', offset: 'lanes either side of it (default 0.35 = 1.2 m)', count: 'walls (default 4)', width: 'slot width in m (default 2.7)', kind: "obstacle kind (default 'barrier')" },
    rows: (o) => {
      const line = o.line ?? middleLine(o.lanes, slotWidth(o), o.kind ?? KIND), off = o.offset ?? 0.35, n = o.count ?? 4, at = [...Array(n).keys()].map(i => +(line + (i % 2 ? off : -off)).toFixed(3));
      return slotRows(o, at, slotWidth(o), o.kind ?? KIND, at.map((v, i) => 'stagger ' + (i + 1) + ' at lane ' + v));
    },
  },
  needle: {
    about: 'SLOT (opt-in): a long narrow slot, walls `rows` deep 10 m apart with the SAME slot in each: the car holds one lateral position for 20 to 40 m.',
    params: { at: 'the slot centre (lane units, default the middle line)', rows: 'walls (default 4: 30 m)', width: 'slot width in m (default 2.7)', kind: "obstacle kind (default 'barrier')" },
    rows: (o) => { const at = o.at ?? middleLine(o.lanes, slotWidth(o), o.kind ?? KIND), n = o.rows ?? 4; return slotRows({ ...o, spacing: LINE_STEP }, Array(n).fill(at), slotWidth(o), o.kind ?? KIND, Array(n).fill('needle at lane ' + at)); },
  },
  // ---- WIDE barriers (span: more than a lane wide, one box, one hit) ----
  wall: {
    about: 'WIDE: a wall of wide barriers across the road, ONE lane open (`gap`), each closed run one block; with --lead, a diagonal of single barriers sweeping toward the gap first.',
    params: { gap: 'the open lane (default the last)', lead: 'm before the wall the lead-in ends (default none)' },
    rows: (o) => {
      const gap = clampLane(o.gap ?? o.lanes - 1, o.lanes), rows = [];
      if (o.lead) { // (a sweep from the far side toward the gap, a barrier a lane every 20 m, ending `lead` m short of the wall)
        const far = gap >= o.lanes / 2 ? 0 : o.lanes - 1, step = gap > far ? 1 : -1, lanes = []; for (let k = far; k !== gap; k += step) lanes.push(k);
        lanes.forEach((k, i) => rows.push({ s: o.s - o.lead - (lanes.length - 1 - i) * 2 * LINE_STEP, lanes: [k], note: i ? '' : 'lead-in' }));
      }
      const w = wallRow(o.lanes, gap);
      rows.push({ s: o.s, lanes: w.lanes, wide: w.wide, note: 'wall, gap ' + gap });
      return rows;
    },
  },
  wideisland: {
    about: 'WIDE: one block `span` lanes wide in the middle (rows of it `rows` deep), lanes either side: pick a side.',
    params: { at: 'its left lane (default the middle)', span: 'lanes wide (default 2)', rows: 'how many, 10 m apart (default 2)' },
    rows: (o) => {
      const span = o.span ?? 2, at = o.at ?? (o.lanes - span) / 2, rows = [];
      for (let i = 0; i < (o.rows ?? 2); i++) rows.push({ s: o.s + i * LINE_STEP, lanes: [], wide: [{ lane: at, span }], note: i ? '' : 'wide island, ' + span + ' lanes' });
      return rows;
    },
  },
  halfstep: {
    about: 'WIDE: walls whose gaps step HALF a lane at a time (a lane, a lane line, the next lane...): 1.5-lane blocks make a gap centred on a lane line.',
    params: { from: 'the first gap (default 1)', count: 'walls (default 3)' },
    rows: (o) => {
      const opens = [...Array(o.count ?? 3).keys()].map(i => Math.min(o.lanes - 1, (o.from ?? 1) + i / 2));
      return chain(o, opens.map(g => wallRow(o.lanes, g)), opens.map(g => 'half step, gap ' + g));
    },
  },
  zigzag: {
    about: 'WIDE: blocks against alternate edges, each wide enough that the way past swings TWO lanes (4.3 m): span n - 1.5 on 4+ lanes, n - 1 on 3.',
    params: { span: 'lanes wide (default as above)', count: 'blocks (default 4)', first: "'left' (default) or 'right'" },
    rows: (o) => {
      const span = o.span ?? (o.lanes >= 4 ? o.lanes - 1.5 : o.lanes - 1), n = o.count ?? 4, left = o.first !== 'right';
      const rows = [...Array(n).keys()].map(i => ({ lanes: [], wide: [{ lane: (i % 2 === 0) === left ? 0 : o.lanes - span, span }] }));
      return chain(o, rows, rows.map((r, i) => 'zigzag ' + (i + 1) + ((i % 2 === 0) === left ? ', block left' : ', block right')));
    },
  },
  widechicane: {
    about: 'WIDE: the chicane in two blocks, each (lanes - 1) wide: open at one edge, then the other (on a bend: the outside first).',
    params: { first: "the first wall's open lane (default the rightmost)", spacing: 'm between them (default: worked out)' },
    rows: (o) => {
      const a = clampLane(o.first ?? o.lanes - 1, o.lanes), b = a === 0 ? o.lanes - 1 : 0;
      return chain(o, [wallRow(o.lanes, a), wallRow(o.lanes, b)], ['wide chicane in, open ' + a, 'wide chicane out, open ' + b]);
    },
  },
};

// ---- MOVERS (OPT-IN, design doc 5d): what the game can already move, from the level's data. No new rules code. ----
// The game has NO obstacle that moves on a timer you set. What a level's JSON can move: `drifters` (an obstacle of a kind sweeping / circling
// / zigzagging / figure-eighting about a stretch, collision.js driftTo: its phase and pace come from a SEEDED sequence, its clock is the level's
// own time from the start, so where it is when the player arrives is not under the level's control), `tractors` (slow traffic: parked until the
// player is within CONFIG.spawnMax, then 7 m/s), `herds` (cows, random rests), `crossings` (a train), trolleys, a wide load, marathons.
// The patterns here are the two a formation can be built from and an audit can judge:
//   SWEEPER   a barrier sweeping across the road (drifters, pattern 'sweep'); fair if, for EVERY phase it might be in when the car arrives
//             (the arrival time is not known), a line through exists from every lane with REACT s to spare (the audit samples the whole cycle)
//   ROLLGATE  tractors abreast in all lanes but one: a moving wall (7 m/s) with a fixed gap; the audit takes them at the point where the
//             car would meet them (placed by `meetAt`), closing at (speed - 7) m/s
const D = CONFIG.drifters, TRACTOR_SPEED = CONFIG.tractorSpeed, SPAWN_MAX = CONFIG.spawnMax;
// the seeded sequence collision.js loadLevel draws a drifter's phase / pace from (seed 2654435761), in its order: phase, phase2, pace, pace2 (a
// 'dart' draws nothing; a 'wreck' one more). `zones` = the level's drifters in order; returns each drifter's { centre, phase, phase2, pace, pace2 }
export const driftDraws = (zones) => {
  let seed = 2654435761; const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const out = [], reach = Math.max(D.circleRadius, D.eightLength) + 5;
  for (const z of zones) {
    const count = z.count || 4;
    for (let i = 0; i < count; i++) {
      const centre = z.from + reach + (count > 1 ? i / (count - 1) : 0.5) * (z.to - z.from - 2 * reach);
      if (z.pattern === 'dart') { out.push({ zone: z, centre, dart: true }); continue; }
      const phase = rand() * Math.PI * 2, phase2 = rand() * Math.PI * 2, pace = 0.7 + rand() * 0.6, pace2 = 1.37 + rand() * 0.9;
      if (z.kind === 'wreck') rand();
      out.push({ zone: z, centre, phase, phase2, pace, pace2, pattern: z.pattern || 'circle', from: z.from, to: z.to });
    }
  }
  return out;
};
// where drifter d is at level time `time` (collision.js driftTo): { across: -1 .. 1 of the road's reach, ds: metres along from its centre }
export const driftAt = (d, time) => {
  const t = time * d.pace, p = d.phase, wobble = D.wobble * Math.sin(time * d.pace2 + d.phase2), wobbleS = D.wobble * Math.sin(time * d.pace2 * 0.61 + d.phase2);
  if (d.pattern === 'sweep') return { across: Math.sin(t * D.sweepRate + p) + wobble, ds: D.circleRadius * wobbleS };
  if (d.pattern === 'circle') return { across: Math.sin(t * D.circleRate + p) + wobble, ds: D.circleRadius * (1 - D.wobble + wobbleS) * Math.cos(t * D.circleRate + p) };
  if (d.pattern === 'figure8') return { across: Math.sin(2 * (t * D.eightRate + p)) + wobble, ds: D.eightLength * (1 - D.wobble + wobbleS) * Math.sin(t * D.eightRate + p) };
  return null; // (zigzag runs the whole stretch: not laid by a pattern here)
};
// the sweeper's lateral path across a road [lo, hi] (m, the pavement incl. shoulders): lat(time) = mid + clamp(across) * (hi - lo) / 2 * D.across
export const sweepLat = (d, time, lo, hi) => (lo + hi) / 2 + Math.max(-1, Math.min(1, driftAt(d, time).across)) * (hi - lo) / 2 * D.across;
// how long a lane stays clear of a sweeper: the free intervals (s) of the band around a lane centre `c` (the barrier's hw + the car's + margin),
// over `secs` of the sweeper's life, for the pace d.pace. Returns { shortest, longest, shareFree }
export const sweepWindows = (d, lo, hi, c, { secs = 400, hwCar = CAR.hw + 0.25 } = {}) => {
  const band = BOX.hw + hwCar, dt = 0.02, free = []; let run = 0, tot = 0;
  for (let t = 0; t < secs; t += dt) { const blocked = Math.abs(sweepLat(d, t, lo, hi) - c) < band; if (blocked) { if (run > 0.2) free.push(run); run = 0; } else { run += dt; tot += dt; } }
  free.sort((a, b) => a - b);
  return { shortest: free[0] ?? secs, longest: free[free.length - 1] ?? secs, shareFree: tot / secs, n: free.length };
};
export const MOVERS = {
  sweeper: {
    about: 'MOVER (opt-in): a barrier SWEEPING across the road on its own clock (a drifter, pattern sweep). The window is the time a lane stays clear: printed with --meta. With --count 2 the pair\'s phases are the level\'s seeded ones (printed).',
    params: { from: 'the stretch it works (default --s - 60)', to: 'its end (default --s + 60: the sweeper keeps its centre mid-stretch; minimum 80 m)', count: 'sweepers (default 1)', kind: "obstacle kind (default 'barrier': the theme swaps it)", pattern: "'sweep' (default), 'circle' or 'figure8'" },
    lay: (o) => {
      const from = o.from ?? o.s - 60, to = o.to ?? o.s + 60;
      return { drifters: [{ from, to, kind: o.kind ?? KIND, count: o.count ?? 1, pattern: o.pattern ?? 'sweep' }] };
    },
  },
  rollgate: {
    about: 'MOVER (opt-in): TRACTORS abreast in every lane but one (a moving wall, 7 m/s, a fixed gap). `--meet S` is where the car and the tractors meet at the design speed: they are placed back by 7 x 640 m / (speed - 7) because a tractor sets off when the player is 640 m away.',
    params: { gap: 'the open lane (default the middle one)', meet: 'where they meet the car at the design speed (default --s)' },
    lay: (o) => {
      const gap = clampLane(o.gap ?? Math.floor(o.lanes / 2), o.lanes), meet = o.meet ?? o.s, back = Math.round(TRACTOR_SPEED * SPAWN_MAX / Math.max(1, o.speed - TRACTOR_SPEED));
      return { tractors: allBut(o.lanes, gap).map(k => ({ s: meet - back, lane: (o.first ?? 0) + k })) };
    },
  },
};
export const meetShift = (speed = 40) => Math.round(TRACTOR_SPEED * SPAWN_MAX / (speed - TRACTOR_SPEED)); // m: where the car meets a tractor, past where it stands
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
  const rows = P.rows(o).map(r => ({ ...r, s: R(r.s), lanes: [...new Set(r.lanes)].sort((a, b) => a - b), ...(r.free ? { free: [...new Set(r.free)].sort((a, b) => a - b) } : {}) }));
  for (const r of rows) {
    if (r.free) { // a slot row: every slot at least a reference car's (2.2 m), and one of them there
      const need = slotFor(CAR.hw), sl = rowSlots(r, o.lanes);
      if (!sl.some(x => x.w >= need - 0.001)) throw new Error(name + ': the row at ' + r.s + ' has no slot of ' + need + ' m (the reference car)');
      const thin = sl.filter(x => x.w < need - 0.001); if (thin.length) throw new Error(name + ': the row at ' + r.s + ' has a slot of ' + thin.map(x => x.w.toFixed(2)).join(', ') + ' m, too narrow for the reference car (' + need + ' m)');
      continue;
    }
    if (!openings(r, o.lanes, WIDEST_HW + 0.3).length) throw new Error(name + ': the row at ' + r.s + ' leaves no way through for the widest car');
    const sq = squeezesOf(r, o.lanes); if (sq.length) throw new Error(name + ': the row at ' + r.s + ' has a squeeze of ' + sq.join(', ') + ' m between two boxes');
  }
  return rows;
};
// the level JSON's obstacle entries for those rows (first: the level's lane number of the player's leftmost lane)
export const entries = (rows, first = 0, kind = KIND) => rows.flatMap(r => [...r.lanes.map(k => ({ s: r.s, lane: first + k, kind })),
  ...(r.free || []).map(k => ({ s: r.s, lane: +(first + k).toFixed(3), kind: r.freeKind || kind })),
  ...(r.wide || []).map(w => ({ s: r.s, lane: first + w.lane, kind: KIND, span: w.span }))]);
export const lay = (name, opts = {}) => entries(layRows(name, opts), opts.first ?? 0, opts.kind ?? KIND);
// a cash line through a formation: pickups on the way through (the open lane of each row, and between rows on the line
// the car takes), `every` m apart: lures INTO the line the formation wants, never into a barrier
export const cashLine = (rows, { first = 0, every = 15, type = 'cash5', from, to, lanes = 4 } = {}) => {
  const covered = (r, k) => { const c = centreOf(k, lanes); return boxesOf(r, lanes).some(([a, b]) => b > c - 0.9 && a < c + 0.9); };
  const open = rows.map(r => ({ s: r.s, lane: [...Array(lanes).keys()].filter(k => !covered(r, k)) }));
  const out = [], a = from ?? open[0].s - 30, b = to ?? open[open.length - 1].s + 30;
  for (let s = a; s <= b; s += every) {
    const next = open.find(r => r.s >= s) || open[open.length - 1];
    const lane = next.lane[Math.floor(next.lane.length / 2)];
    if (lane === undefined || rows.some(r => Math.abs(r.s - s) < 9 && covered(r, lane))) continue; // (never on top of a barrier)
    out.push({ type, s: R(s), lane: first + lane });
  }
  return out;
};

// NO cash around formations (the owner, 17-Oct: formations were ringed with cash lines). `cashLine` above is kept for a deliberate lure
// and is never the default. The default is `cashAfter`: at most ONE small pickup, well clear (CASH_CLEAR m past the last row), in the
// lane the formation's way out leaves; and `cashRhythm`: cash spread along the road on its own rhythm, in pairs side by side, each pair
// CASH_CLEAR m clear of every formation (`avoid`: their s values).
export const CASH_CLEAR = 45;
export const cashAfter = (rows, { first = 0, lanes = 4, type = 'cash5', clear = CASH_CLEAR } = {}) => {
  const last = rows[rows.length - 1], free = [...Array(lanes).keys()].filter(k => !boxesOf(last, lanes).some(([a, b]) => b > centreOf(k, lanes) - 0.9 && a < centreOf(k, lanes) + 0.9));
  return [{ type, s: R(last.s + clear), lane: first + (free[Math.floor(free.length / 2)] ?? 0) }];
};
export const cashRhythm = ({ from, to, every = 70, lanes = 3, first = 0, avoid = [], clear = CASH_CLEAR, type = 'cash5', width = 2 }) => {
  const out = []; let i = 0;
  for (let s = from; s <= to; s += every, i++) {
    if (avoid.some(a => Math.abs(a - s) < clear)) continue;
    const w = Math.min(width, lanes), left = (i * 2) % (lanes - w + 1); // (the pair drifts across the lanes from one to the next)
    for (let k = 0; k < w; k++) out.push({ type, s: R(s), lane: first + left + k });
  }
  return out;
};
// the quiet zone a formation wants (design doc rule 8): traffic everywhere else, but none from `before` m ahead of its first row to `after`
// m past its last, so no car sits in a gap. Zones that touch are merged. rows: [{ s }] (any list of rows or entries)
export const QUIET = { before: 28, after: 10 };
export const quietZones = (rows, { before = QUIET.before, after = QUIET.after, merge = 15 } = {}) => {
  const zs = [...rows].sort((a, b) => a.s - b.s).map(r => ({ from: Math.max(0, R(r.s - before)), to: R(r.s + after), density: 0 })), out = [];
  for (const z of zs) { const l = out[out.length - 1]; if (l && z.from <= l.to + merge) l.to = Math.max(l.to, z.to); else out.push({ ...z }); }
  return out;
};

// ---- the lab level (src/delivery/levels/obstacle-lab.json): every pattern once, in a rhythm, on a 4-lane one-way city road ----
// (`node scripts/obstacle-patterns.mjs lab` prints its obstacles and pickups; the level's shape, a right-hand bend at 1150-1400, a crest
// at 1950 and a left-hand bend at 3450-3700, is in its file). Laid for 40 m/s.
export const LAB = [
  { name: 'gate', s: 260, gap: 2 },                      // call: one decision
  { name: 'zipper', s: 440 },                            // response: one shift between two rows
  { name: 'island', s: 640, at: 1, width: 2, length: 20 }, // a fork: pick a side (the cash says left)
  { name: 'gaterun', s: 840, gaps: '0,2,1,3' },          // the first bigger set
  { name: 'chicane', s: 1200, first: 0 },                // on the right-hand bend: outside, then the apex
  { name: 'diagonal', s: 1440, side: 'right' },                      // a rolling line sweeping left...
  { name: 'taper', s: 1600, side: 'right', open: 0, hold: 40 },      // ...into a funnel down to lane 0
  { name: 'crest', crest: 1950, gap: 1, before: 70, after: 45 },     // trust the gate over the blind crest
  { name: 'slalom', s: 2160, a: 1, b: 3, count: 5 },     // the climax: a weave, a lane change each row
  { name: 'bookend', s: 2440, in: 0, out: 3, pocket: 120 }, // the last word: in at one edge, out at the other, cash in the pocket
  // ---- the second half (the owner, 16-Oct: "attempt some obstacles with widths wider than 1 lane"): WIDE barriers ("span") ----
  { name: 'wall', s: 2780, gap: 3, lead: 40 },           // a full-width wall, one lane open, a lead-in sweeping to it
  { name: 'wideisland', s: 2930, span: 2, rows: 2 },   // a two-lane block: pick a side
  { name: 'halfstep', s: 3060, from: 1, count: 3 },      // gaps stepping half a lane: a drift, not a lane change
  { name: 'zigzag', s: 3220, count: 4 },                 // 2.5-lane blocks at alternate edges: a two-lane swing each
  { name: 'widechicane', s: 3520, first: 3 },            // on the left-hand bend: the outside (right) first, then the apex
  { name: 'wall', s: 3800, gap: 1 },                     // the wide gate: a barrier, the gap, a two-lane block
  // ---- FREE-POSITION SLOTS (opt-in, design doc 5c): the way through is a slot, centred anywhere ----
  { name: 'slot', s: 3980, at: 1.5, width: 2.7 },                              // one wall, one slot ON the middle lane line, wide enough for every car
  { name: 'slot', s: 4130, at: 1.25, width: 2.4 },                             // one slot a quarter lane off the line, tight: reference and narrow cars (2.4 m; 2.2 has no play at all)
  { name: 'slotrun', s: 4280, count: 6, step: 0.4 },                           // a weave: the slot drifts 0.4 lane a row between the edges the road can hold
  { name: 'slotstagger', s: 4560, offset: 0.35, count: 4 },                    // slots alternately either side of the middle line
  { name: 'needle', s: 4760, at: 1.5, rows: 4 },                               // a long narrow slot, 30 m: hold the lateral position
  { name: 'slotrun', s: 4960, count: 5, step: 0.5, kind: 'crate', width: 2.4 }, // the weave in 1.2 m crates (finer control), tight slots
  // ---- MOVERS (opt-in, design doc 5d): what the level data can already move ----
  { name: 'rollgate', s: 5300, gap: 1 },                               // three tractors abreast, a moving wall with a fixed gap (they meet the car here at 40 m/s)
  { name: 'sweeper', s: 5600, from: 5530, to: 5670, count: 1 },        // one barrier sweeping across the road on its own clock
  { name: 'sweeper', s: 5920, from: 5840, to: 6000, count: 2, prior: 1 }, // a pair, on the level's seeded phases (not opposite: 2.15 rad apart)
];
export const LAB_END = 6200; // the lab's length (its last segment is stretched to reach it)
export const layLab = (speed = 40) => {
  const obstacles = [], pickups = [], avoid = [];
  const extra = { drifters: [], tractors: [] };
  for (const step of LAB) {
    if (MOVERS[step.name]) { // a mover: drifters / tractors, not obstacle rows
      const m = MOVERS[step.name].lay({ speed, agility: 1, first: 0, ...step, lanes: 4 });
      for (const k of Object.keys(extra)) extra[k].push(...(m[k] || []));
      avoid.push(step.s);
      continue;
    }
    const rows = layRows(step.name, { ...step, lanes: 4, speed });
    obstacles.push(...entries(rows));
    avoid.push(...rows.map(r => r.s));
  }
  // cash on its own sparse rhythm, pairs side by side, never within CASH_CLEAR m of a formation (the owner, 17-Oct: no cash round formations)
  pickups.push(...cashRhythm({ from: 200, to: LAB_END - 150, every: 70, lanes: 4, avoid, width: 2 }));
  return { obstacles: obstacles.sort((a, b) => a.s - b.s || a.lane - b.lane), pickups: pickups.sort((a, b) => a.s - b.s || a.lane - b.lane), ...extra };
};

// the level files' own look: flat objects on one line, arrays of them one a line
const flatObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => x === null || typeof x !== 'object' || (Array.isArray(x) && x.every(y => typeof y !== 'object')));
export const fmtJson = (v, ind = '') => {
  if (Array.isArray(v)) { if (!v.length) return '[]'; if (v.every(x => typeof x !== 'object' || x === null)) return '[' + v.map(x => JSON.stringify(x)).join(', ') + ']'; return '[\n' + v.map(x => ind + '  ' + fmtJson(x, ind + '  ')).join(',\n') + '\n' + ind + ']'; }
  if (v && typeof v === 'object') { if (flatObj(v)) return '{ ' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + (Array.isArray(x) ? '[' + x.map(y => JSON.stringify(y)).join(', ') + ']' : JSON.stringify(x))).join(', ') + ' }'; return '{\n' + Object.entries(v).map(([k, x]) => ind + '  ' + JSON.stringify(k) + ': ' + fmtJson(x, ind + '  ')).join(',\n') + '\n' + ind + '}'; }
  return JSON.stringify(v);
};

// a pattern's rows as a picture: one line a row, the lanes left to right, and the shift the car must make from the row before
const cell = (r, k, n = 4) => { // (a lane wholly covered, half covered, or open; in a slot row, quarters of the lane: '#' where a box covers it)
  if ((r.free || []).length) {
    const c = centreOf(k, n), spans = boxesOf(r, n);
    return [...Array(8).keys()].map(q => { const x = c - LW / 2 + (q + 0.5) * LW / 8; return spans.some(([a, b]) => x > a && x < b) ? '#' : '.'; }).join('') + ' ';
  }
  if (r.lanes.includes(k)) return '[##]';
  for (const w of r.wide || []) { const a = w.lane, b = w.lane + w.span - 1; if (k >= a && k <= b) return k === a || k === b ? (k === a && k === b ? '[##]' : k === a ? (Number.isInteger(a) ? '[###' : ' [##') : (Number.isInteger(b) ? '###]' : '##] ')) : '####'; if (k > b && k < b + 1) return '#]  '; if (k < a && k > a - 1) return '  [#'; }
  return ' .. ';
};
export const picture = (rows, n) => rows.map((r, i) => {
  const slots = (r.free || []).length ? rowSlots(r, n) : [];
  return String(r.s).padStart(6) + '  ' + [...Array(n).keys()].map(k => cell(r, k, n)).join('') +
    (i ? '  +' + String(r.s - rows[i - 1].s).padStart(3) + ' m, shift ' + (slots.length && (rows[i - 1].free || []).length ? slotShift(rowSlots(rows[i - 1], n), slots) : shiftBetween(rows[i - 1], r, n)).toFixed(1) + ' m' : '') +
    (slots.length ? '  slot ' + slots.map(x => 'centre ' + (x.c >= 0 ? '+' : '') + x.c.toFixed(2) + ' m (lane ' + laneAt(x.c, n) + '), ' + x.w.toFixed(2) + ' m wide').join('; ') : '') +
    (r.note ? '  ' + r.note : '') + ((r.wide || []).length ? '  [open: ' + gapsOf(r, n).join(' / ') + ' m]' : '');
});

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
    console.log('movers (opt-in; level data other than obstacles: they print { drifters } / { tractors }):');
    for (const [name, M] of Object.entries(MOVERS)) { console.log('  ' + name.padEnd(9) + M.about); for (const [k, v] of Object.entries(M.params)) console.log('             --' + k + ': ' + v); }
    console.log('  common:  --lanes N (the player\'s lanes)  --first F (level lane of the leftmost)  --s S  --speed V (m/s)  --agility A  --meta  --cash (ONE small pickup 45 m clear; --cashline = the old lure, avoid)  --oncoming N [--shift m] (also lay it on the N oncoming lanes, numbered 0..N-1)  --quiet (the quietZones it wants, rule 8)\n  other commands:  rhythm --from --to --every --lanes --first --avoid s,s  (sparse cash pairs, clear of formations)  lab  kinematics');
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
  if (cmd === 'rhythm') { // sparse cash on its own rhythm: rhythm --from 200 --to 3400 --every 70 --lanes 3 --first 2 --avoid 520,1400 [--width 2]
    const avoid = typeof o.avoid === 'string' ? o.avoid.split(',').map(Number) : typeof o.avoid === 'number' ? [o.avoid] : [];
    console.log(JSON.stringify(cashRhythm({ from: o.from ?? 200, to: o.to ?? 3400, every: o.every ?? 70, lanes: o.lanes ?? 3, first: o.first ?? 0, avoid, width: o.width ?? 2, type: o.type ?? 'cash5' })).replace(/\},\{/g, '},\n{'));
    return;
  }
  if (cmd === 'lab') {
    const lab = layLab(o.speed ?? 40);
    if (o.write) { // lab --write: put the obstacles and pickups into the level file (and stretch its last segment to LAB_END)
      const f = new URL('../src/delivery/levels/obstacle-lab.json', import.meta.url), L = JSON.parse(readFileSync(f, 'utf8'));
      L.obstacles = lab.obstacles; L.pickups = lab.pickups; L.drifters = lab.drifters; L.tractors = lab.tractors;
      // (a tractor takes a car from the traffic pool, so the lab keeps 4 of them (the rollgate has 3 tractors); the whole road is a quiet zone, which culls every ordinary car and leaves the fixed tractors)
      L.traffic = { commuter: 1 }; L.trafficCount = 4; L.oncomingCount = 0; L.quietZones = [{ from: 0, to: LAB_END, density: 0 }];
      const sum = L.segments.reduce((a, g) => a + g.length, 0); L.segments[L.segments.length - 1].length += LAB_END - sum;
      writeFileSync(f, fmtJson(L) + '\n'); console.error('wrote ' + f.pathname + ': ' + lab.obstacles.length + ' obstacles, ' + lab.pickups.length + ' pickups, ' + lab.drifters.length + ' drifters, ' + lab.tractors.length + ' tractors, length ' + LAB_END);
      return;
    }
    if (o.meta) for (const step of LAB) { console.error(step.name + ':'); for (const line of picture(layRows(step.name, { ...step, lanes: 4, speed: o.speed ?? 40 }), 4)) console.error(line); }
    console.log(JSON.stringify(lab));
    return;
  }
  if (MOVERS[cmd]) { // a mover: level data other than "obstacles" ({ drifters } or { tractors })
    const M = MOVERS[cmd], p = { speed: 40, agility: 1, lanes: 3, s: 0, first: 0, ...o };
    const out = M.lay(p);
    if (o.meta) {
      const lc = laneChange(1, { speed: p.speed, agility: p.agility }).time, need = lc + 0.5;
      if (out.drifters) { // the sweeper's windows, lane by lane, for the pace(s) the level's seeded sequence gives it
        const on = Number(o.oncoming ?? 0), total = p.lanes + on, half = total * LW / 2 + 3.5, z = out.drifters[0];
        const draws = driftDraws([...(o.prior ? [{ from: 0, to: 1000, count: Number(o.prior), pattern: 'sweep' }] : []), z]).slice(o.prior ? Number(o.prior) : 0);
        draws.forEach((d, i) => {
          console.error('sweeper ' + (i + 1) + ': pace ' + d.pace.toFixed(2) + ', one crossing every ' + (Math.PI / (D.sweepRate * d.pace)).toFixed(1) + ' s, phase ' + d.phase.toFixed(2) + ' rad; reaches ' + (half * D.across).toFixed(1) + ' m each side of the middle, up to ' + (half * D.across * D.sweepRate * d.pace).toFixed(1) + ' m/s sideways');
          for (let k = 0; k < p.lanes; k++) {
            const w = sweepWindows(d, -half, half, centreOf(k + on, total));
            console.error('  lane ' + k + ': clear ' + Math.round(w.shareFree * 100) + '% of the time, in windows of ' + w.shortest.toFixed(1) + ' to ' + w.longest.toFixed(1) + ' s' + (w.shortest >= need ? ' (>= ' + need.toFixed(2) + ' s: lane change ' + lc.toFixed(2) + ' + 0.5)' : '  SHORT: under the lane change ' + lc.toFixed(2) + ' s + 0.5 s margin'));
          }
        });
        if (draws.length > 1) console.error('phase difference of the first two: ' + (((draws[1].phase - draws[0].phase) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)).toFixed(2) + ' rad (3.14 = opposite)');
        console.error('(the arrival time is not known, so the audit samples the whole cycle: obstacle-audit.mjs; the walls here are pure sines, the game adds a wobble of 0.3)');
      } else if (out.tractors) {
        const rel = p.speed - TRACTOR_SPEED, sight = 150, win = sight / rel;
        console.error('rollgate: ' + out.tractors.length + ' tractors at ' + out.tractors[0].s + ' (they meet the car about ' + meetShift(p.speed) + ' m on, at ' + (p.meet ?? p.s) + '); closing at ' + rel + ' m/s, seen 150 m: ' + win.toFixed(1) + ' s to react and change lane (needs ' + (REACT + laneChange(Math.max(1, p.lanes - 1), { speed: p.speed }).time + SLACK).toFixed(2) + ' s)');
      }
    }
    console.log(JSON.stringify(out));
    return;
  }
  const rows = layRows(cmd, o);
  const list = entries(rows, o.first ?? 0, o.kind ?? KIND);
  if (o.meta) {
    for (const line of picture(rows, o.lanes ?? 4)) console.error(line);
    console.error('(' + list.length + ' barriers; at ' + (o.speed ?? 40) + ' m/s the first row must be in plain sight ' + sightNeeded(Math.max(1, (o.lanes ?? 4) - 1), o.speed ?? 40) + ' m ahead for a player in the farthest lane)');
  }
  const obstacles = [...list], extra = {}, quietRows = [...rows];
  if (o.oncoming) { // the same pattern on the ONCOMING side too (rule 9): its lanes are numbered 0 .. N-1 from the left, shifted along the road
    const N = Number(o.oncoming), shift = o.shift ?? 70;
    try {
      const orows = layRows(cmd, { ...o, lanes: N, s: (o.s ?? 0) + shift, ...(o.gap !== undefined ? { gap: Math.min(o.gap, N - 1) } : {}) });
      obstacles.push(...entries(orows, 0, o.kind ?? KIND)); quietRows.push(...orows);
      if (o.meta) { console.error('oncoming (' + N + ' lanes, lanes 0..' + (N - 1) + '):'); for (const line of picture(orows, N)) console.error(line); }
    } catch (e) { console.error('not laid on the oncoming side: ' + e.message); }
  }
  if (o.cash) extra.pickups = o.cashline ? cashLine(rows, { first: o.first ?? 0, lanes: o.lanes ?? 4 }) : cashAfter(rows, { first: o.first ?? 0, lanes: o.lanes ?? 4 });
  if (o.quiet) extra.quietZones = quietZones(quietRows);
  const out = Object.keys(extra).length ? { obstacles, ...extra } : obstacles;
  console.log(JSON.stringify(out, null, o.pretty ? 2 : 0).replace(/\},\{/g, '},\n{'));
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
