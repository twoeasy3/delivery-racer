// OBSTACLE AUDIT: a fairness checker for a level's stationary obstacles (its "obstacles"), headless. For every group of
// obstacles (those closer than 1.5 s apart at the speed) it works out, by SIMULATION of the player's real lateral motion
// (player.js / physics.js: steerSpeed, steerResponse, the yaw that widens a car across the road, the lane assist; see
// scripts/obstacle-patterns.mjs stepLateral), whether there is a clean line through from EVERY lane of the player's side, and
// how late the player can start steering after the group comes into sight (the camera's line of sight over crests and
// round bends, capped at a reading distance). It flags what is unfair or out of place, and prints the level's evidence:
// how many obstacles, where across the road, how many in formations.
//   node scripts/obstacle-audit.mjs steelworks-run expressway [--speed 40] [--car sport] [--verbose] [--fairup]
//   node scripts/obstacle-audit.mjs --all [--speed 40]                     every level with obstacles, one line each
//   node scripts/obstacle-audit.mjs --pattern out.json --lanes 4           a pattern's output (obstacle-patterns.mjs) on a straight one-way road
//   --strict: exit 1 if any group is unfair (no line, or less than REACT s to react), or anything is out of place
// Only the level's own plain obstacles are judged (not its gimmicks', nor cargo, nor drifting ones, nor light kinds: a
// cone costs 3 health, it is not a wall). Fairness is BY SIMULATION, not by feel: no one has played these numbers.
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';
import { stepLateral, yawFor, REACT, SLACK, laneChange, shiftChange, driftDraws, driftAt, meetShift, slotFor, slotShift, SLOT_CLASSES } from './obstacle-patterns.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback; };
const flag = (name) => args.includes('--' + name);
const SPEED = Number(opt('speed', 40)), VERBOSE = flag('verbose'), STRICT = flag('strict'), FAIRUP = flag('fairup');
const IDS = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--verbose', '--all', '--strict', '--fairup'].includes(args[i - 1])));

const READ = 150;       // m: the farthest a barrier is read on the screen (about 11 px wide on a 1280 px landscape screen at 150 m)
const VERGE = 6;        // m beyond the road's edge (shoulders included) the eye sees past (the city's buildings stand further off; walls in a tunnel)
const START_CLEAR = 150, END_CLEAR = 60, MOUTH = [-30, 60]; // m: the start, the drop, a tunnel's mouth (before / into it)
const WALL_GAP = 1.2;   // m: a gap between two boxes narrower than this reads as closed (a lane apart: 1.1 m)
const DT = 1 / 30, LAT_BIN = 0.15, VEL_BIN = 0.5;
const MARGIN = Number(opt('margin', 0.25)); // m added to each side of every obstacle in the simulation: a person does not thread a line to the centimetre
const BREATH = 3;       // s: obstacles closer than this at the speed are one group (the design's breather between formations: 3 s)

const g = await boot();
const { CONFIG } = g;
// The audit drives every level in the car it judges (--car): the garage's car rule (tiers.js: a level's tier, or its own
// "allowedCars") is off for it. Left on, Game.start refused every level whose tier is not that car's ("No car for this
// level"), built nothing, and the audit fell over on the empty track (TypeError at Track.length).
g.cars.setTierHooks({ rule: () => null });
const LW = CONFIG.laneWidth;
const carId = opt('car', CONFIG.clock.car);
const carDef = g.cars.CARS.find(c => c.id === carId);
const CAR = { hw: carDef.hw, hl: carDef.hl, agility: carDef.agility ?? 1 };
const { cornerSpeed } = await g.load('physics.js');

// the separating axis test of collision.js (a car's long axis at its yaw; the obstacle square to the road)
const overlap = (a, b) => {
  const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw), dx = b.s - a.s, dy = b.lat - a.lat;
  for (const [ux, uy] of [[ca, sa], [-sa, ca], [1, 0], [0, 1]]) {
    const ra = a.hl * Math.abs(ux * ca + uy * sa) + a.hw * Math.abs(uy * ca - ux * sa);
    const rb = b.hl * Math.abs(ux) + b.hw * Math.abs(uy);
    if (Math.abs(dx * ux + dy * uy) > ra + rb) return false;
  }
  return true;
};

const audit = (level) => {
  g.select(level);
  g.Game.evil = false;
  g.Game.loaded = null;
  g.Game.start();
  if (g.Game.state !== 'playing') throw new Error(level.id + ': Game.start refused it (Game.canStart), nothing built');
  const T = g.track.Track, L = level, size = g.Collision.size;
  const length = T.length;
  const K = CONFIG.obstacleKinds;
  const items = [], skipped = { light: 0, side: 0, drift: 0 };
  for (const o of L.obstacles || []) {
    const kind = o.kind || 'barrier';
    if (o.road === 'side') { skipped.side++; continue; }
    if (o.drift) { skipped.drift++; continue; }
    if (K[kind]?.light) { skipped.light++; continue; }
    const s = T.place(o), [pfirst, plast] = T.laneRange(1, s), span = o.span > 1 ? o.span : 1;
    const free = typeof o.lane === 'number' && !Number.isInteger(o.lane) && span === 1; // an obstacle at a FRACTIONAL lane position (1.25, 1.5): part of a free-position slot wall, never "off lane" (design doc 5c)
    const lat = span > 1 ? T.spanOffset(o.lane, span, s) : T.laneOffset(o.lane, s); // (a wide barrier: Collision.loadLevel's own sums)
    const [hw0, hl, height] = size[span > 1 ? 'barrier' : kind], hw = hw0 + (span - 1) * LW / 2;
    const where = o.lane === 'left' || o.lane === 'right' ? 'shoulder' : Math.ceil(o.lane) < pfirst ? 'oncoming' : Math.floor(o.lane) > plast ? 'beyond' : 'lane';
    // (an oncoming-lane obstacle is judged for a player who ends up there, driving the same way in the oncoming lanes: its own range)
    const [first, last] = where === 'oncoming' ? T.laneRange(-1, s) : [pfirst, plast];
    items.push({ s, lat, hw, hl, height, kind, span, lane: o.lane, rel: where === 'lane' ? o.lane - first : null, lanes: last - first + 1, where, first, last, free, side: where === 'oncoming' ? -1 : 1 });
  }
  // ---- MOVERS (design doc 5d): the level's sweeping drifters and its tractors, judged over what the car might meet ----
  // a sweeper's clock is the level's own and the car's arrival time is not known: the audit samples a whole cycle of phases (THETAS) and wants a
  // line for every one. A tractor sets off when the player is CONFIG.spawnMax away and goes 7 m/s: it is taken where the car would meet it
  // at the design speed (`meetShift`), as a box moving with the traffic's speed (closing at speed - 7).
  const movers = [];
  const D = CONFIG.drifters;
  for (const d of driftDraws((L.drifters || []).map(z => ({ ...z, kind: z.kind || 'cone' })))) {
    if (d.dart || !['sweep', 'circle', 'figure8'].includes(d.pattern)) continue;
    const kind = d.zone.kind || 'cone'; if (K[kind]?.light || !size[kind]) continue;
    const [pf, pl] = T.laneRange(1, d.centre), [hw, hl, height] = size[kind];
    const it = { s: d.centre, lat: 0, hw, hl, height, kind, span: 1, lane: 'sweep', rel: null, lanes: pl - pf + 1, where: 'lane', first: pf, last: pl, free: false, side: 1, mover: d };
    items.push(it); movers.push(it);
  }
  for (const t of L.tractors || []) {
    if (t.road === 'side') continue;
    const s0 = T.place(t), [pf, pl] = T.laneRange(1, s0); if (t.lane < pf || t.lane > pl) continue; // (an oncoming tractor comes at the player: not judged)
    const s = s0 + meetShift(SPEED), v = CONFIG.vehicles.tractor;
    const it = { s, lat: T.laneOffset(t.lane, s), hw: v.hw, hl: v.hl, height: v.height, kind: 'tractor', span: 1, lane: t.lane, rel: t.lane - pf, lanes: pl - pf + 1, where: 'lane', first: pf, last: pl, free: false, side: 1, vs: CONFIG.tractorSpeed };
    items.push(it); movers.push(it);
  }
  items.sort((a, b) => a.s - b.s);
  // ---- the evidence ----
  const inLanes = items.filter(o => o.where === 'lane' && !o.mover && !o.vs);
  const widerThanLane = items.filter(o => 2 * o.hw > LW).length, widest = items.reduce((m, o) => Math.max(m, 2 * o.hw), 0);
  const byRel = {}, kinds = {};
  for (const o of items) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
  for (const o of inLanes) { const key = (Number.isInteger(o.rel) ? o.rel : 'between') + '/' + o.lanes; byRel[key] = (byRel[key] || 0) + 1; }
  const twoWay = T.flow === 'both';
  const inner = inLanes.filter(o => twoWay ? o.rel === 0 : o.lanes >= 3 && o.rel > 0 && o.rel < o.lanes - 1).length; // (two-way: the lane by the centre line; one-way: the middle lanes)
  const near30 = (o) => items.some(p => p !== o && Math.abs(p.s - o.s) <= 30);
  const singles = items.filter(o => !near30(o)).length;
  const gaps = items.slice(1).map((o, i) => o.s - items[i].s).sort((a, b) => a - b);
  // formations: runs of obstacles each within 30 m of the next, two or more
  let formations = 0;
  for (let i = 0; i < items.length;) { let j = i; while (j + 1 < items.length && items[j + 1].s - items[j].s <= 30) j++; if (j > i) formations++; i = j + 1; }

  // ---- what the eye sees: the chase camera (camBack behind the car, camHeight up) to the top of the obstacle ----
  const centre = [], p = {};
  for (let s = -100; s <= length + 100; s += 2) { T.toWorld(s, 0, p); centre.push({ s, x: p.x, z: p.z, y: p.y, half: Math.max(-T.lo(s), T.hi(s)), tunnel: T.tunnel(s) > 0.5 }); }
  const visible = (sCar, latCar, o) => {
    const a = {}, b = {};
    T.toWorld(sCar - CONFIG.camBack, latCar, a); a.y += CONFIG.camHeight;
    T.toWorld(o.s, o.lat, b); b.y += o.height;
    const i0 = Math.round((sCar - CONFIG.camBack - 30 + 100) / 2), i1 = Math.round((o.s + 30 + 100) / 2);
    for (let k = 1; k < 24; k++) {
      const t = k / 24, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t;
      let best = Infinity, c = null;
      for (let i = Math.max(0, i0); i <= Math.min(centre.length - 1, i1); i++) { const d = (centre[i].x - x) ** 2 + (centre[i].z - z) ** 2; if (d < best) { best = d; c = centre[i]; } }
      if (!c) continue;
      if (Math.sqrt(best) > c.half + (c.tunnel ? 0.3 : VERGE)) return false; // (round a bend: through what stands beside the road)
      if (y < c.y + 0.3) return false; // (over a crest: into the road itself)
    }
    return true;
  };
  const sightOf = (o) => {
    const cap = T.foggy && T.foggy(o.s) > 0.5 ? 60 : T.tunnel(o.s) > 0.5 ? 120 : READ;
    let d = 10;
    while (d + 5 <= cap && visible(o.s - (d + 5), T.laneOffset(Math.round((o.first + o.last) / 2), o.s - d - 5), o)) d += 5;
    return { sight: d, cap };
  };

  // ---- the line through a group, by simulation ----
  // from each lane of the player's side, from s0 on: `hold` s hands off (the lane assist only), then free steering (full left,
  // none, full right each step, every line kept); the car's speed min(speed, the bend's corner speed). Survives = a clean line.
  // mode: where the line may go: 'lanes' (the player's own lanes), 'shoulder' (and the shoulders of the player's side), 'road'
  // (anywhere on the pavement: the oncoming lanes too)
  const throughOne = (group, s0, hold, speed, startLane, mode = 'lanes', dir = 1, theta = 0) => {
    const obs = group.obs, sEnd = obs[obs.length - 1].s + obs[obs.length - 1].hl + CAR.hl + 1;
    let s = s0, st = { lat: T.laneOffset(startLane, s0), latVel: 0, yaw: 0 }, t = 0;
    const assist = () => T.laneOffset(startLane, s);
    // (a mover is where it is when the car is at s: a sweeper by the level's clock theta + (s - its centre) / speed, a tractor by 7 m/s from the meeting point)
    const place = (o, s) => {
      if (o.mover) { const t = theta + (s - o.s) / speed, a = driftAt(o.mover, t), lo = T.lo(o.s) + o.hl, hi = T.hi(o.s) - o.hl; return { s: o.s + a.ds, lat: (lo + hi) / 2 + Math.max(-1, Math.min(1, a.across)) * (hi - lo) / 2 * D.across, hw: o.hw, hl: o.hl }; }
      if (o.vs) return { s: o.s + o.vs * (s - o.s) / speed, lat: o.lat, hw: o.hw, hl: o.hl };
      return o;
    };
    const hit = (s, lat, yaw) => { for (const o of obs) { const q = place(o, s); if (Math.abs(q.s - s) < q.hl + CAR.hl + 0.5 && overlap({ s, lat, hw: CAR.hw + MARGIN, hl: CAR.hl, yaw }, q)) return true; } return false; };
    const bounds = (s) => {
      const [f, l] = T.laneRange(dir, s), lo = T.laneOffset(f, s) - LW / 2, hi = T.laneOffset(l, s) + LW / 2;
      if (mode === 'lanes') return [lo, hi];
      if (mode === 'shoulder') return dir < 0 ? [T.lo(s) + CAR.hw, twoWay ? hi : T.hi(s) - CAR.hw] : [twoWay ? lo : T.lo(s) + CAR.hw, T.hi(s) - CAR.hw];
      return [T.lo(s) + CAR.hw, T.hi(s) - CAR.hw];
    };
    const v = (s) => Math.min(speed, cornerSpeed(s, 1, CAR.agility));
    while (t < hold && s < sEnd) { // hands off
      st = stepLateral(st, 0, v(s), CAR.agility, DT, assist());
      s += v(s) * DT; t += DT;
      if (hit(s, st.lat, st.yaw)) return false;
    }
    let states = new Map([[0, { lat: st.lat, latVel: st.latVel }]]);
    while (s < sEnd) {
      const next = new Map(), sp = v(s), sn = s + sp * DT, [lo, hi] = bounds(sn);
      for (const q of states.values()) {
        for (const steer of [-1, 0, 1]) {
          const n = stepLateral({ lat: q.lat, latVel: q.latVel, yaw: yawFor(q.latVel, sp) }, steer, sp, CAR.agility, DT);
          if (n.lat < lo || n.lat > hi) continue;
          const key = Math.round(n.lat / LAT_BIN) * 1000 + Math.round(n.latVel / VEL_BIN);
          if (next.has(key)) continue;
          if (hit(sn, n.lat, yawFor(n.latVel, sp))) continue;
          next.set(key, { lat: n.lat, latVel: n.latVel });
        }
      }
      states = next; s = sn;
      if (!states.size) return false;
    }
    return true;
  };
  // groups: obstacles in the player's lanes (and shoulders) with less than BREATH s between them at the speed: what is that close
  // is driven, and planned, as one
  const groupsAt = (speed, side = 1) => {
    const out = [];
    for (const o of items.filter(o => o.where !== 'beyond' && o.side === side)) {
      const last = out[out.length - 1];
      if (last && o.s - last.obs[last.obs.length - 1].s < speed * BREATH) last.obs.push(o); else out.push({ obs: [o] });
    }
    return out;
  };
  const quiet0 = (L.quietZones || []).filter(z => z.density <= 0.05).sort((a, b) => a.from - b.from); // (the zones with no traffic)
  const quietOver = (a, b) => { let at = a; for (const z of quiet0) if (z.from <= at && z.to > at) at = z.to; return at >= b; };
  const hasTraffic = ((L.trafficCount ?? CONFIG.trafficCount) + (L.oncomingCount ?? CONFIG.oncomingCount)) > 0 && !(L.traffic && !Object.keys(L.traffic).length);
  const THETAS = [...Array(16).keys()].map(i => i * 0.6); // s: arrival phases sampled for a sweeper (its cycle is 3 to 8 s)
  const judge = (speed, detail) => {
    const rows = [];
    for (const side of [1, -1]) rows.push(...judgeSide(speed, detail, side));
    return rows.sort((a, b) => a.from - b.from);
  };
  const judgeSide = (speed, detail, side) => {
    const groups = groupsAt(speed, side), rows = [];
    let prevEnd = -Infinity;
    for (const gr of groups) {
      const thetas = gr.obs.some(o => o.mover && o.mover.pattern) ? THETAS : [0];
      const through = (group, s0, hold, spd, k, m, sd) => thetas.every(th => throughOne(group, s0, hold, spd, k, m, sd, th));
      const firstObs = gr.obs[0], sight = sightOf(firstObs);
      // the player comes on it when it comes into sight, or as it clears the group before (whichever is later)
      const sSee = firstObs.s - sight.sight, chained = prevEnd + 2 > sSee, s0 = chained ? prevEnd + 2 : sSee;
      const lanes = []; for (let k = firstObs.first; k <= firstObs.last; k++) lanes.push(k);
      // the latest the player can start steering, from s0 (s), for the worst lane: bisection
      const window = Math.max(0, (firstObs.s - firstObs.hl - CAR.hl - s0) / speed);
      let worst = Infinity, worstLane = null, noLine = [], mode = null;
      for (const m of ['lanes', 'shoulder', 'road']) if (lanes.every(k => through(gr, s0, 0, speed, k, m, side))) { mode = m; break; }
      if (!mode) { mode = 'road'; for (const k of lanes) if (!through(gr, s0, 0, speed, k, mode, side)) noLine.push(k); worst = -1; worstLane = noLine[0]; }
      else for (const k of lanes) {
        if (through(gr, s0, window, speed, k, mode, side)) { if (window < worst) { worst = window; worstLane = k; } continue; }
        let a = 0, b = window;
        for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (through(gr, s0, m, speed, k, mode, side)) a = m; else b = m; }
        if (a < worst) { worst = a; worstLane = k; }
      }
      const flags = [], slotRows = [];
      // (a group in sight before the one ahead of it was passed: the player has been looking at it since, while driving that one)
      const seenFor = chained ? Math.max(0, (s0 - sSee) / speed) : 0;
      if (noLine.length) flags.push('NO_LINE from lane ' + noLine.join(','));
      else if (worst + seenFor < REACT) flags.push('NO_REACTION ' + (worst + seenFor).toFixed(2) + ' s (lane ' + worstLane + ')');
      const oneLane = side < 0 && lanes.length === 1; // (a one-lane oncoming side: a barrier is passed by swinging out over the centre line, that is its line, not an escape)
      if (mode === 'shoulder' && !noLine.length && !oneLane) flags.push('OFF_LANES: the only way past is the shoulder');
      if (mode === 'road' && !noLine.length && !oneLane) flags.push(side < 0 ? 'OFF_LANES: the only way past is the player\'s side' : 'OFF_LANES: the only way past is the oncoming side');
      // a row's gaps: a gap a car would try that is narrower than the widest car, or every lane shut
      const rowsOf = []; for (const o of gr.obs) { const r = rowsOf.find(r => Math.abs(r.s - o.s) < 3); if (r) r.obs.push(o); else rowsOf.push({ s: o.s, obs: [o] }); }
      for (const r of rowsOf) {
        const [lo, hi] = [T.laneOffset(firstObs.first, r.s) - LW / 2, T.laneOffset(firstObs.last, r.s) + LW / 2];
        const spans = r.obs.filter(o => o.where !== 'shoulder').map(o => [o.lat - o.hw, o.lat + o.hw, o.free]).sort((a, b) => a[0] - b[0]);
        const isSlotRow = spans.some(x => x[2]), need = slotFor(CAR.hw); // (a slot row: a wall with free-position obstacles; its gaps are slots, judged by width)
        let at = lo, open = 0; const slots = [];
        for (const [i, [a, b]] of [...spans, [hi, hi]].entries()) {
          const gap = a - at, between = i > 0 && i < spans.length; // (a gap between two boxes, not the lanes' edge strip)
          if (isSlotRow) { if (gap >= WALL_GAP && between) { if (gap < need - 0.001) flags.push('SLOT_TOO_NARROW ' + gap.toFixed(2) + ' m (the ' + carId + ' needs ' + need + ') at ' + Math.round(r.s)); else slots.push({ c: at + gap / 2, w: gap }); } }
          else if (gap >= WALL_GAP && gap < 2 * 1.05 + 0.6) flags.push('SQUEEZE ' + gap.toFixed(1) + ' m at ' + Math.round(r.s));
          if (gap >= 2 * CAR.hw + 0.4) open++;
          at = Math.max(at, b);
        }
        if (isSlotRow) { if (!slots.length) flags.push('NO_PATH: no slot of ' + need + ' m at ' + Math.round(r.s)); slotRows.push({ s: r.s, hl: Math.max(...r.obs.map(o => o.hl)), slots, lo }); }
        if (!open && T.hi(r.s) - hi < 2 * CAR.hw + 0.4 && (twoWay ? true : lo - T.lo(r.s) < 2 * CAR.hw + 0.4) && mode !== 'road') flags.push('ALL_BLOCKED at ' + Math.round(r.s));
      }
      // free-position slots: each slot's centre, width and the shift to the next, and whether the next is reachable at the speed (the shift's time + 0.25 s)
      const slotLines = [];
      slotRows.forEach((sr, i) => {
        const nx = slotRows[i + 1], fits = (w) => SLOT_CLASSES.filter(c => c.slot <= w + 0.001).map(c => c.name.split(' ')[0]).join('/');
        const lane0 = T.laneOffset(firstObs.first, sr.s);
        let line = Math.round(sr.s) + ': ' + sr.slots.map(x => 'slot centre at lane ' + ((x.c - lane0) / LW).toFixed(2) + ' (' + (x.c - lane0 >= 0 ? '+' : '') + (x.c - lane0).toFixed(2) + ' m from the first lane\'s centre), ' + x.w.toFixed(2) + ' m wide (fits ' + fits(x.w) + ' cars)').join('; ');
        if (nx && sr.slots.length && nx.slots.length) {
          const shift = slotShift(sr.slots, nx.slots, CAR.hw), dist = nx.s - sr.s, needD = shift > 0 ? speed * (shiftChange(shift, { speed, agility: CAR.agility }).time + SLACK) + sr.hl + nx.hl + 2 * CAR.hl : 0; // (no shift: the same line, nothing to reach)
          line += '; shift to the next ' + shift.toFixed(2) + ' m in ' + Math.round(dist) + ' m (needs ' + Math.round(needD) + ')';
          if (dist < needD - 0.5) flags.push('UNREACHABLE: ' + shift.toFixed(2) + ' m shift in ' + Math.round(dist) + ' m at ' + Math.round(sr.s) + ' (needs ' + Math.round(needD) + ' m at ' + speed + ' m/s)');
        }
        slotLines.push(line);
      });
      for (const o of gr.obs) {
        if (o.s < START_CLEAR) flags.push('START ' + Math.round(o.s));
        if (o.s > length - END_CLEAR) flags.push('AT_DROP ' + Math.round(o.s));
        for (const t of L.tunnels || []) if (o.s > t.from + MOUTH[0] && o.s < t.from + MOUTH[1]) flags.push('TUNNEL_MOUTH ' + Math.round(o.s));
        for (const pd of L.boostPads || []) if (o.s > pd.from - 20 && o.s < pd.to + speed * 1.5 && Math.abs(o.lat - T.laneOffset(pd.lane, o.s)) < LW / 2 + o.hw) flags.push('PAD ' + Math.round(o.s));
        for (const pd of L.slowPads || []) if (o.s > pd.from - 5 && o.s < pd.to + 5 && Math.abs(o.lat - T.laneOffset(pd.lane, o.s)) < LW / 2 + o.hw) flags.push('SLOW_PAD ' + Math.round(o.s)); // (nothing on a slow pad: SLOW-PAD-DESIGN.md)
        const twin = gr.obs.find(q => q !== o && q.lane === o.lane && q.s > o.s && q.s - o.s < 4);
        if (twin && Math.abs(T.bend(o.s)) > 0.004) flags.push('JAGGED line on a bend at ' + Math.round(o.s));
      }
      // rule 8: traffic everywhere except a short quiet zone round a formation (28 m before its first row to 10 m past its last: allowed 3 m short)
      if (hasTraffic) for (let i = 0; i < gr.obs.length;) {
        let j = i; while (j + 1 < gr.obs.length && gr.obs[j + 1].s - gr.obs[j].s <= 30) j++;
        if (j > i && !quietOver(gr.obs[i].s - 25, gr.obs[j].s + 7)) flags.push('TRAFFIC: no quiet zone round the formation at ' + Math.round(gr.obs[i].s) + '-' + Math.round(gr.obs[j].s) + ' (28 m before to 10 m after)');
        i = j + 1;
      }
      const unfair = flags.some(f => /^(NO_LINE|NO_REACTION|ALL_BLOCKED|NO_PATH|SLOT_TOO_NARROW|UNREACHABLE)/.test(f));
      const misplaced = flags.some(f => /^(START|AT_DROP|TUNNEL_MOUTH|PAD|JAGGED|SQUEEZE|TRAFFIC)/.test(f)), forced = flags.some(f => /^OFF_LANES/.test(f));
      rows.push({ movers: gr.obs.filter(o => o.mover || o.vs).length, side, slotLines: slotLines.length ? slotLines : null, from: Math.round(firstObs.s), to: Math.round(gr.obs[gr.obs.length - 1].s), n: gr.obs.length, sight: sight.sight, cap: sight.cap, chained, react: worst, worstLane, mode, flags: [...new Set(flags)], unfair, misplaced, forced });
      prevEnd = gr.obs[gr.obs.length - 1].s + gr.obs[gr.obs.length - 1].hl;
      if (detail) {
        const pic = rowsOf.map(r => String(Math.round(r.s)).padStart(6) + '  ' + lanes.map(k => { // (a lane whose centre a box covers, or only part of it)
          const c = T.laneOffset(k, r.s), cover = (o) => Math.min(o.lat + o.hw, c + LW / 2) - Math.max(o.lat - o.hw, c - LW / 2);
          const most = Math.max(0, ...r.obs.filter(o => o.where !== 'shoulder').map(cover));
          return most >= 2.3 ? '[##]' : most > 0.6 ? ' [#]' : ' .. ';
        }).join('') + (r.obs.some(o => o.where === 'shoulder') ? '  +shoulder' : ''));
        rows[rows.length - 1].pic = pic;
      }
    }
    return rows;
  };
  const rows = judge(SPEED, VERBOSE);
  // the highest speed at which every group is still fair IN THE LANES (a line from every lane of the player's, kept to those lanes,
  // and REACT s to react), by bisection
  let fairUpTo = null;
  if (FAIRUP && items.length) {
    const ok = (v) => judge(v, false).every(r => !r.unfair && !r.forced);
    let a = 15, b = 75;
    if (!ok(a)) fairUpTo = '<15'; else if (ok(b)) fairUpTo = ">75"; else { for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } fairUpTo = Math.floor(a); }
  }
  return {
    id: L.id, length: Math.round(length), lanes: T.laneCount, twoWay, count: items.length, total: (L.obstacles || []).length, perKm: items.length / (length / 1000), kinds, byRel,
    inLanes: inLanes.length, innerShare: inLanes.length ? inner / inLanes.length : 0, shoulders: items.filter(o => o.where === 'shoulder').length,
    oncoming: items.filter(o => o.where === 'oncoming').length, movers: movers.map(m => m.mover ? 'sweeper' : 'tractor'), free: items.filter(o => o.free).length, singles, formations, medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
    minGap: gaps[0] ?? null, skipped, rows, fairUpTo, widerThanLane, widest,
  };
};

const pct = (x) => Math.round(x * 100) + '%';
const report = (r) => {
  const unfair = r.rows.filter(x => x.unfair), misplaced = r.rows.filter(x => x.misplaced), forced = r.rows.filter(x => x.forced), sightLimited = r.rows.filter(x => x.sight < x.cap && !x.chained);
  console.log(`${r.id}: ${r.total} obstacles, ${r.count} judged (${r.perKm.toFixed(1)}/km over ${r.length} m, ${r.lanes} lanes${r.twoWay ? ' two-way' : ' one-way'}; ${Object.entries(r.kinds).map(([k, n]) => n + ' ' + k).join(', ')}` +
    `${r.skipped.light ? '; ' + r.skipped.light + ' light ones not judged' : ''}; widest ${r.widest.toFixed(1)} m, ${r.widerThanLane} wider than a lane)`);
  console.log(`  across: ${r.inLanes} in the player's lanes (${Object.entries(r.byRel).sort().map(([k, n]) => 'lane ' + k + ': ' + n).join(', ')}), ${r.shoulders} on shoulders, ${r.oncoming} in oncoming lanes; ` +
    `${pct(r.innerShare)} in the ${r.twoWay ? 'lane by the centre line' : 'middle lanes'}`);
  if (r.movers.length) console.log(`  movers: ${r.movers.filter(x => x === 'sweeper').length} sweeping, ${r.movers.filter(x => x === 'tractor').length} tractors (a sweeper is judged over its whole cycle of phases, a tractor where the car meets it, closing at speed - ${CONFIG.tractorSpeed})`);
  if (r.free) console.log(`  slots: ${r.free} obstacles at fractional lane positions (free-position slot walls, never off-lane); each slot is judged by its continuous width against the car (${carId} needs ${slotFor(CAR.hw)} m; narrow ${SLOT_CLASSES[0].slot}, wide ${SLOT_CLASSES[2].slot}, widest ${SLOT_CLASSES[3].slot}), reachable from the one before, and a clean line is simulated from every lane`);
  console.log(`  layout: ${r.singles} of ${r.count} alone (no other within 30 m: ${pct(r.count ? r.singles / r.count : 0)}), ${r.formations} formations (2+ within 30 m), gap median ${r.medianGap ?? '-'} m, least ${r.minGap ?? '-'} m`);
  console.log(`  at ${SPEED} m/s (${carId}): ${r.rows.length} groups, ${unfair.length} unfair (no line / under ${REACT} s to react / all blocked), ${forced.length} passable only off the lanes, ${misplaced.length} out of place, ${sightLimited.length} seen late (crest or bend)` +
    (r.fairUpTo !== null ? `; every group fair in the lanes up to ${r.fairUpTo} m/s` : ''));
  for (const x of r.rows) {
    if (!VERBOSE && !x.unfair && !x.misplaced && !x.forced && !x.slotLines) continue;
    console.log(`    ${String(x.from).padStart(5)}${x.to !== x.from ? '-' + x.to : ''}${x.side < 0 ? ' (oncoming side)' : ''}: ${x.n} obstacle${x.n > 1 ? 's' : ''}${x.movers ? ', ' + x.movers + ' moving' : ''}, seen ${x.sight} m${x.chained ? ' (straight after the group before)' : ''}, latest steer ${x.react < 0 ? 'none' : x.react.toFixed(2) + ' s'} ${x.flags.join('; ')}`);
    if (x.slotLines) for (const line of x.slotLines) console.log('      ' + line);
    if (x.pic) for (const line of x.pic) console.log('      ' + line);
  }
};

let failures = 0;
try {
  const lc = laneChange(1, { speed: SPEED, agility: CAR.agility });
  console.log(`(the ${carId}: ${(2 * CAR.hw).toFixed(2)} m wide, agility ${CAR.agility}; a lane change at ${SPEED} m/s takes ${lc.time.toFixed(2)} s, ${Math.round(lc.distance)} m; reading distance ${READ} m; REACT ${REACT} s; ${MARGIN} m of margin each side of the car)`);
  let levels;
  if (opt('pattern')) {
    const data = JSON.parse(readFileSync(opt('pattern'), 'utf8')), obstacles = Array.isArray(data) ? data : data.obstacles;
    const lanes = Number(opt('lanes', 4)), end = Math.max(...obstacles.map(o => o.s)) + 400;
    levels = [{ id: 'pattern', lanes: { north: lanes, south: 0 }, flow: 'north', segments: [{ length: end, curve: 0 }], obstacles, pickups: [], traffic: {}, trafficCount: 0, oncomingCount: 0 }];
  } else {
    const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)];
    levels = flag('all') ? all.filter(l => (l.obstacles || []).length) : IDS.map(id => { const l = all.find(x => x.id === id); if (!l) throw new Error('no level ' + id); return l; });
  }
  if (flag('all')) {
    const sum = { n: 0, singles: 0, inLanes: 0, inner: 0, formations: 0, unfair: 0, levels: 0 };
    for (const l of levels) {
      const r = audit(l);
      const unfair = r.rows.filter(x => x.unfair).length, mis = r.rows.filter(x => x.misplaced).length, forced = r.rows.filter(x => x.forced).length;
      sum.forced = (sum.forced || 0) + forced; sum.mis = (sum.mis || 0) + mis; sum.groups = (sum.groups || 0) + r.rows.length;
      sum.n += r.count; sum.singles += r.singles; sum.inLanes += r.inLanes; sum.inner += r.innerShare * r.inLanes; sum.formations += r.formations; sum.unfair += unfair; sum.levels++;
      sum.total = (sum.total || 0) + r.total; sum.wide = (sum.wide || 0) + r.widerThanLane; sum.widest = Math.max(sum.widest || 0, r.widest);
      console.log(`${r.id.padEnd(20)} ${String(r.total).padStart(3)} obst (${String(r.count).padStart(3)} judged) ${r.perKm.toFixed(1).padStart(4)}/km  alone ${pct(r.count ? r.singles / r.count : 0).padStart(4)}  inner ${pct(r.innerShare).padStart(4)}  formations ${String(r.formations).padStart(2)}  unfair@${SPEED} ${unfair}  off-lanes ${forced}  out of place ${mis}`);
    }
    console.log(`ALL: ${sum.levels} levels, ${sum.total} obstacles, ${sum.n} judged, ${pct(sum.singles / sum.n)} alone, ${pct(sum.inner / sum.inLanes)} in the inner lane(s), ${sum.formations} formations, widest judged obstacle ${(sum.widest || 0).toFixed(1)} m, ${sum.wide || 0} wider than a lane (${LW} m); at ${SPEED} m/s ${sum.groups} groups: ${sum.unfair} unfair, ${sum.forced} passable only off the lanes, ${sum.mis} out of place`);
  } else {
    for (const l of levels) {
      const r = audit(l);
      report(r);
      if (STRICT && r.rows.some(x => x.unfair || x.misplaced)) failures++;
    }
  }
} catch (e) { failures++; console.log(e.stack || e); }
await g.close();
process.exit(failures ? 1 : 0);
