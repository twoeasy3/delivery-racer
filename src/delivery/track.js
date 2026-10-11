import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { levelName } from './levelText.js';

// ============================================================================
// TRACK - path sampled by distance along track (s) and lateral offset (lat)
// heading h: forward = (sin h, cos h) in (x, z); +lat is the driver's right
// ============================================================================
const createTrack = () => {
  const STEP = 2;            // sample spacing, metres
  // A lapped level ("laps") is a closed loop: its road comes back round to where it started, facing
  // the same way, so it has no straights past either end, and s goes round (see toWorld)
  const LOOP = !!LEVEL.laps;
  const LEAD_IN = LOOP ? 0 : 100;   // straight road before the start line
  const LEAD_OUT = LOOP ? 0 : 200;  // and after the finish
  const length = LEVEL.segments.reduce((sum, seg) => sum + seg.length, 0);
  const narrows = LEVEL.narrows || [], bridges = LEVEL.bridges || [];
  const X = CONFIG.ramps, LW = CONFIG.laneWidth, SH = LEVEL.shoulder ?? CONFIG.shoulder, FLY = X.flyoverLength; // (a level can have narrower ones)
  // The expressway's lanes: a level's "lanes" is a number (half each side of the centre line, an
  // odd one over going on the right) or { north, south }: how many on the right, the player's
  // way, and how many on the left, oncoming. A two-way level can also have a "median": that many
  // neutral lanes down the middle, which no traffic uses. The centre line (lat 0) runs down the
  // middle of the median, or between the two sides where there is none.
  // Which side the traffic keeps to: the game is laid out for driving on the right, and a level
  // with "drive": "left" is the same game seen in a mirror (see render/road.js): Track works on
  // as if on the right, and "mirrored" tells the drawing (and the steering) to swap sides
  const MIRRORED = LEVEL.drive === 'left';
  const SPEC = LEVEL.lanes ?? CONFIG.laneCount;
  const LEFT = typeof SPEC === 'object' ? SPEC.south ?? 0 : Math.floor(SPEC / 2);
  const RIGHT = typeof SPEC === 'object' ? SPEC.north ?? 0 : Math.ceil(SPEC / 2);
  const MID = LEVEL.median || 0;
  const LANES = LEFT + MID + RIGHT;
  const HM = MID * LW / 2; // half the median's width: each side's lanes start this far out
  // which way the traffic goes: 'both' (the left half of the road is oncoming), or every
  // vehicle 'north' (the player's way) or 'south' (against the player), using all the lanes
  // ('mixed': traffic both ways, every lane open to either: the Battlefield. Its lanes are laid out as a
  // one-way road's, no oncoming half)
  const FLOW = ['north', 'south', 'mixed'].includes(LEVEL.flow) ? LEVEL.flow : 'both';
  const ONE_WAY = FLOW !== 'both';
  const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  // a path sampled every `step` metres starting at s0. The returned function writes the world
  // position of (s, lat) into `out` and returns the heading; past either end it runs on straight.
  // ys (optional) gives the road's height at each sample.
  const makePath = (xs, zs, hs, s0, step, ys) => (s, lat, out) => {
    const f = (s - s0) / step;
    const i = Math.max(0, Math.min(xs.length - 2, Math.floor(f)));
    const t = f - i;
    const h = hs[i] + (hs[i + 1] - hs[i]) * Math.max(0, Math.min(1, t));
    out.x = xs[i] + (xs[i + 1] - xs[i]) * t - Math.cos(h) * lat;
    out.z = zs[i] + (zs[i + 1] - zs[i]) * t + Math.sin(h) * lat;
    out.y = ys ? ys[i] + (ys[i + 1] - ys[i]) * Math.max(0, Math.min(1, t)) : 0; // level past the ends
    return h;
  };

  // ---- the roads ----------------------------------------------------------------
  // The expressway, plus for every exit in the level a side road and two flyovers. Each road
  // owns its own stretch of the s number line, so "which road" never has to be stored
  // separately, and cars on different roads are automatically far apart in s and never interact:
  //   expressway   -100 .. length + 200
  //   exit n       side road from FIRST + 2000 + n * 30000, flyover A from FIRST + 12000 + ..., flyover B
  //                from FIRST + 22000 + ..., where FIRST is 8000, or for a very long level, past its end
  // Track.transfer() moves a vehicle from one road to the next where they join.
  const MAIN = 0, SIDE_ROAD = 1, FLY_A = 2, FLY_B = 3;
  const FIRST = Math.max(8000, Math.ceil((length + LEAD_OUT + 500) / 1000) * 1000), BLOCK = 30000;
  const isMain = (s) => s < FIRST;
  const kindOf = (s) => {
    if (s < FIRST) return MAIN;
    const local = (s - FIRST) % BLOCK;
    return local < 10000 ? SIDE_ROAD : local < 20000 ? FLY_A : FLY_B;
  };
  const exitOf = (s) => exits[Math.floor((s - FIRST) / BLOCK)];

  // ---- expressway path: integrate the segment list once ----------------------------
  // (looked up by the metre, every segment being a whole number of metres long: a circuit can have
  // hundreds of them, and the bend at s is wanted many times a frame)
  const CURVES = new Float64Array(length), GRADES = new Float64Array(length), EASES = new Float64Array(length).fill(CONFIG.gradeEase); // (EASES: a segment's own "ease", a crest: see Gambles)
  {
    let at = 0;
    for (const seg of LEVEL.segments) {
      for (let i = 0; i < seg.length; i++) { CURVES[at + i] = seg.curve; GRADES[at + i] = seg.grade || 0; if (seg.ease > 0) EASES[at + i] = seg.ease; }
      at += seg.length;
    }
  }
  const curveAt = (s) => s < 0 || s >= length ? 0 : CURVES[Math.floor(s)];
  const mainXs = [], mainZs = [], mainHs = [];
  {
    let x = 0, z = -LEAD_IN, h = 0;
    for (let s = -LEAD_IN; s <= length + LEAD_OUT; s += STEP) {
      mainXs.push(x); mainZs.push(z); mainHs.push(h);
      // +curve = right turn, and right is -x when heading +z, so heading decreases
      h -= curveAt(s + STEP / 2) * STEP;
      x += Math.sin(h) * STEP;
      z += Math.cos(h) * STEP;
    }
  }
  // ---- heights: a segment may have a grade (rise per metre travelled; 0.03 is a 3% climb).
  // The gradient is eased over CONFIG.gradeEase metres each way so one slope blends into the next, then summed
  // into a height for every sample. The lowest point of the road is at height 0.
  const gradeAt = (s) => s < 0 || s >= length ? 0 : GRADES[Math.floor(s)];
  const rawGrades = mainXs.map((_, i) => gradeAt(-LEAD_IN + i * STEP));
  const hasGrades = rawGrades.some(g => g !== 0);
  // (a side road follows the land: it is as high as the expressway beside it, and has a slope of its own away
  // from it: see sideHeights. A flyover stands on the land under it: see flyWorld)
  const hilly = hasGrades;
  const mainGrades = rawGrades.map((_, i) => {
    if (!hilly) return 0;
    let sum = 0;
    const at = -LEAD_IN + i * STEP;
    const EASE = Math.max(1, Math.round((at < 0 || at >= length ? CONFIG.gradeEase : EASES[Math.floor(at)]) / STEP)); // samples each way (a segment's own "ease", if it has one)
    const N = rawGrades.length; // (round a loop, the blend carries on over the line, so the road meets itself there)
    for (let k = i - EASE; k <= i + EASE; k++) sum += rawGrades[LOOP ? ((k % N) + N) % N : Math.max(0, Math.min(N - 1, k))];
    return sum / (2 * EASE + 1);
  });
  const mainYs = [0];
  for (let i = 1; i < mainXs.length; i++) mainYs.push(mainYs[i - 1] + mainGrades[i - 1] * STEP);
  if (LOOP) { // (round a loop, whatever is left over is spread along the lap, so the road ends at the height it began)
    const over = mainYs[mainYs.length - 1] - mainYs[0], last = mainYs.length - 1;
    for (let i = 0; i <= last; i++) mainYs[i] -= over * i / last;
  }
  const lowest = Math.min(...mainYs);
  for (let i = 0; i < mainYs.length; i++) mainYs[i] -= lowest;
  // the road's slope at s: rise per metre in the direction of increasing s
  const grade = (s) => {
    if (hilly && kindOf(s) === SIDE_ROAD) { // (a side road's own: from its heights)
      const x = exitOf(s), i = Math.max(0, Math.min(x.ys.length - 2, Math.floor((s - x.side0) / x.step)));
      return (x.ys[i + 1] - x.ys[i]) / x.step;
    }
    if (hilly && !isMain(s)) { // (a flyover's: that of the land under it, a metre either side; its own hump is not counted, as on the level)
      const p = {};
      toWorld(s + 1, 0, p);
      const y = p.y - flyHeight(s + 1);
      toWorld(s - 1, 0, p);
      return (y - (p.y - flyHeight(s - 1))) / 2;
    }
    if (!hilly) return 0;
    return mainGrades[Math.max(0, Math.min(mainGrades.length - 1, Math.floor((s + LEAD_IN) / STEP)))];
  };
  const mainWorld = makePath(mainXs, mainZs, mainHs, -LEAD_IN, STEP, hilly ? mainYs : null);

  // ---- side roads --------------------------------------------------------------------
  // An extra lane outside the expressway's right-hand lane is the exit lane before an exit
  // and the merge lane after a merge (see extraLane below), and the side road's own lane
  // carries on from one to the other. Its shape is a smooth curve leaving the exit point in
  // the expressway's direction there and arriving at the merge point in the expressway's
  // direction there, so it joins up whatever the expressway does in between (and is a
  // straight line when the two points line up).
  // An exit can then give that curve a shape of its own (CONFIG.ramps.shapeLead, shapeEase: its ramps at
  // each end, and the flyovers laid out along them, are left as they are, the shape easing in beyond them):
  //   out    m its middle is pushed out, away from the expressway (the side road's right): a long way round
  //   bends  { count, size }: that many bends one after the other, right then left..., each swinging the
  //          road `size` m off its line (2 is an S-bend; many, a winding lane)
  // Or it can be laid out as freely as the expressway itself:
  //   segments  [{ length, curve }], as a level's own, from the exit on. The side road follows them, and from
  //             where they end, a smooth curve of its own making brings it to the merge: so it always joins
  //             up, and how well depends on where they leave it (near the merge, heading its way, is best)
  // How wide it is, between its single-lane ramps:
  //   lanes  a number (2, if not said; 4 at most), or [{ at, count }]: that many lanes from `at` m along it on
  //          (the first from its start), widening or narrowing to each over CONFIG.ramps.laneTaper m.
  //          Its lanes are numbered from the left: 0, then 1 (the one the ramps are, always there), then 2
  //          and 3 out to the right. Narrowed to one lane, only lane 1 is left
  // And which way its traffic goes: "oncoming" (true on a two-way level, unless it says false; false on a
  // one-way one, unless it says true): its other lane carries traffic coming the other way. Where that
  // traffic comes from is nobody's business: it turns up at the far end and is gone at the near one, unless
  // the exit has "flyovers": true (a two-way level's only), which carry it over from the expressway and back.
  // Only lane 0 is ever oncoming, and with "oncomingFrom": m, only from that far along: before it every lane
  // goes the player's way, and there the double yellow line begins (nothing makes the traffic in lane 0 give
  // way to what comes down it: it is a game).
  const RSLOT = HM + RIGHT * LW + LW / 2; // lat on the expressway of that extra lane's centre line
  const LSLOT = HM + LEFT * LW + SH / 2;   // lat of the left shoulder's centre line, where the flyovers land
  const nearAngle = (h, ref) => {
    while (h - ref > Math.PI) h -= 2 * Math.PI;
    while (h - ref < -Math.PI) h += 2 * Math.PI;
    return h;
  };
  // a smooth curve from one point and heading to another, as points [x, z]
  const link = (p0, h0, p1, h1, n) => {
    const m = Math.hypot(p1.x - p0.x, p1.z - p0.z); // tangent length: the straight-line distance
    const t0x = Math.sin(h0) * m, t0z = Math.cos(h0) * m, t1x = Math.sin(h1) * m, t1z = Math.cos(h1) * m, points = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, u2 = u * u, u3 = u2 * u;
      const a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, d = u3 - u2;
      points.push([a * p0.x + b * t0x + c * p1.x + d * t1x, a * p0.z + b * t0z + c * p1.z + d * t1z]);
    }
    return points;
  };
  const sideHeights = (xs, zs, e, step) => {
    const first = Math.max(0, Math.floor((e.exitAt + LEAD_IN) / STEP)), last = Math.min(mainXs.length - 1, Math.ceil((e.mergeAt + LEAD_IN) / STEP));
    // (the land's height under each point: the expressway's where the point is square to it, between its samples
    // and not the nearest one's own, which on a slope is centimetres out: enough to put one road's pavement
    // through the other's where they lie together at a fork. And how far the point is from its centre line)
    const away = [];
    const land = xs.map((x, k) => {
      let best = Infinity, at = first;
      for (let i = first; i <= last; i++) {
        const d = (x - mainXs[i]) ** 2 + (zs[k] - mainZs[i]) ** 2;
        if (d < best) { best = d; at = i; }
      }
      let y = mainYs[at];
      for (const [a, b] of [[at - 1, at], [at, at + 1]]) {
        if (a < 0 || b >= mainXs.length) continue;
        const ex = mainXs[b] - mainXs[a], ez = mainZs[b] - mainZs[a];
        const t = Math.max(0, Math.min(1, ((x - mainXs[a]) * ex + (zs[k] - mainZs[a]) * ez) / (ex * ex + ez * ez)));
        const d = (x - mainXs[a] - ex * t) ** 2 + (zs[k] - mainZs[a] - ez * t) ** 2;
        if (d <= best) { best = d; y = mainYs[a] + (mainYs[b] - mainYs[a]) * t; }
      }
      away.push(Math.sqrt(best));
      return y;
    });
    // Away from the expressway it has a slope of its own: the land's, evened out (over CONFIG.ramps.gradeEase m:
    // where the expressway bends away from it, the nearest point of the expressway races along its hill, and the
    // land with it, far too steeply for a road). Alongside the expressway (within CONFIG.ramps.level m of its
    // pavement) it is exactly as high as it, so the two pavements, and the land between, lie in one plane
    let ys = land;
    const sigma = X.gradeEase / STEP, passes = Math.round(2 * sigma * sigma);
    for (let pass = 0; pass < passes; pass++) ys = ys.map((y, k) => k === 0 || k === ys.length - 1 ? y : (ys[k - 1] + 2 * y + ys[k + 1]) / 4);
    // (and no steeper than CONFIG.ramps.steepest anywhere out there: whatever a step rises over that is shared out
    // between its two ends, over and over, until the climb is spread along the road)
    const free = away.map(d => d > RSLOT + LW + X.level), most = X.steepest * step;
    for (let pass = 0; pass < 4000; pass++) {
      let over = false;
      for (let k = 0; k < ys.length - 1; k++) {
        const rise = ys[k + 1] - ys[k], excess = Math.abs(rise) - most;
        if (excess <= 1e-4 || !(free[k] || free[k + 1])) continue;
        const share = Math.sign(rise) * excess / (free[k] && free[k + 1] ? 2 : 1);
        if (free[k]) ys[k] += share;
        if (free[k + 1]) ys[k + 1] -= share;
        over = true;
      }
      if (!over) break;
    }
    return ys.map((y, k) => land[k] + (y - land[k]) * smooth((away[k] - RSLOT - LW) / X.level));
  };
  const buildSide = (pG, hG, pE, hE, shape) => {
    // its own segments first, laid out from the exit just as the expressway's are from the start line; then
    // (or with none, all the way) the curve that brings it to the merge
    const fine = [], end = { x: pG.x, z: pG.z };
    let h = hG;
    for (const seg of shape.segments || []) {
      for (let d = 0; d < seg.length; d++) {
        fine.push([end.x, end.z]);
        h -= (seg.curve || 0);
        end.x += Math.sin(h);
        end.z += Math.cos(h);
      }
    }
    fine.push(...link(end, h, pE, hE, 2000));
    const N = fine.length - 1, cum = [0];
    for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
    if (shape.out || shape.bends) {
      // each point moved across the curve (+ = to its right), by how far along it is; then measured again
      const length0 = cum[N], lead = X.shapeLead, middle = Math.max(1, length0 - 2 * lead), ease = Math.min(X.shapeEase, middle / 2);
      const count = shape.bends?.count || 0, size = shape.bends?.size || 0;
      const moved = fine.map((p, i) => {
        const a = fine[Math.max(0, i - 1)], b = fine[Math.min(N, i + 1)], h = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const d = cum[i] - lead, v = Math.max(0, Math.min(1, d / middle));
        const off = smooth(d / ease) * smooth((middle - d) / ease) * ((shape.out || 0) * Math.sin(Math.PI * v) + size * Math.sin(Math.PI * count * v));
        return [p[0] - Math.cos(h) * off, p[1] + Math.sin(h) * off];
      });
      for (let i = 0; i <= N; i++) {
        fine[i] = moved[i];
        if (i) cum[i] = cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]);
      }
    }
    // Every side road parts from the expressway the same way, whatever the expressway does there: the near edge
    // of its lane CONFIG.ramps.apart m or more from the expressway's lanes, that gap opening over its first
    // CONFIG.ramps.part m and closing over its last (a fork and a merge like a real one's, with a nose between
    // the two roads: see render/road.js). Where it would lie closer than that (an expressway that runs straight
    // on past the exit, or bends towards it), each point is moved out, away from the expressway
    if (shape.exitAt !== undefined) {
      const first = Math.max(0, Math.floor((shape.exitAt - 20 + LEAD_IN) / STEP)), last = Math.min(mainXs.length - 1, Math.ceil((shape.mergeAt + 20 + LEAD_IN) / STEP));
      const out = fine.map((p, i) => {
        let best = Infinity, at = first;
        for (let k = first; k <= last; k++) {
          const d = (p[0] - mainXs[k]) ** 2 + (p[1] - mainZs[k]) ** 2;
          if (d < best) { best = d; at = k; }
        }
        const rx = -Math.cos(mainHs[at]), rz = Math.sin(mainHs[at]); // (the expressway's right, there)
        const gap = (p[0] - mainXs[at]) * rx + (p[1] - mainZs[at]) * rz - RSLOT;
        return [Math.max(0, X.apart * smooth(Math.min(cum[i], cum[N] - cum[i]) / X.part) - gap), rx, rz];
      });
      if (out.some(o => o[0] > 0.05)) {
        let off = out.map(o => o[0]);
        const R = Math.max(2, Math.round(X.partEase * N / cum[N])); // (evened out, so it eases in and out)
        for (let pass = 0; pass < 3; pass++) {
          const sums = [0];
          for (let i = 0; i <= N; i++) sums.push(sums[i] + off[i]);
          off = off.map((_, i) => { const r = Math.min(R, i, N - i); return (sums[i + r + 1] - sums[i - r]) / (2 * r + 1); }); // (over less at each end, where it starts from nothing)
        }
        for (let i = 0; i <= N; i++) {
          fine[i] = [fine[i][0] + out[i][1] * off[i], fine[i][1] + out[i][2] * off[i]];
          if (i) cum[i] = cum[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]);
        }
      }
    }
    // resample at even spacing along its length
    const total = cum[N], n = Math.round(total / STEP), step = total / n;
    const xs = [], zs = [], hs = [];
    for (let k = 0, j = 0; k <= n; k++) {
      const target = Math.min(total, k * step);
      while (j < N - 1 && cum[j + 1] < target) j++;
      const t = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
      xs.push(fine[j][0] + (fine[j + 1][0] - fine[j][0]) * t);
      zs.push(fine[j][1] + (fine[j + 1][1] - fine[j][1]) * t);
    }
    for (let k = 0; k <= n; k++) {
      const a = Math.max(0, k - 1), b = Math.min(n, k + 1);
      hs.push(nearAngle(Math.atan2(xs[b] - xs[a], zs[b] - zs[a]), k ? hs[k - 1] : hG));
    }
    // on hilly ground it follows the land: each point as high as the expressway is at its nearest point (so it
    // leaves and rejoins it level with it), smoothed a little
    const ys = hilly ? sideHeights(xs, zs, shape, step) : null;
    return { path: makePath(xs, zs, hs, 0, step, ys), length: total, xs, zs, ys: ys || xs.map(() => 0), step };
  };

  const exits = (LEVEL.exits || []).map((e, i) => {
    const pG = {}, pE = {};
    const hG = mainWorld(e.exitAt, RSLOT, pG), hE = mainWorld(e.mergeAt, RSLOT, pE);
    const side = buildSide(pG, hG, pE, hE, e);
    const oncoming = e.oncoming ?? (e.oncomingFrom !== undefined || !ONE_WAY);
    const lanes = (Array.isArray(e.lanes) ? e.lanes : [{ at: 0, count: e.lanes ?? 2 }]).map(l => ({ at: l.at || 0, count: Math.max(1, Math.min(4, Math.round(l.count) || 2)) }));
    return {
      exitAt: e.exitAt, mergeAt: e.mergeAt, span: e.mergeAt - e.exitAt,
      oncoming, oncomingFrom: oncoming ? e.oncomingFrom || 0 : Infinity, flyovers: !!e.flyovers && oncoming && !ONE_WAY, lanes,
      side0: FIRST + 2000 + i * BLOCK, flyA0: FIRST + 12000 + i * BLOCK, flyB0: FIRST + 22000 + i * BLOCK,
      sideEnd: FIRST + 2000 + i * BLOCK + side.length, length: side.length, path: side.path, xs: side.xs, zs: side.zs, ys: side.ys, step: side.step,
      landingAt: e.exitAt - (FLY - X.ramp),  // where flyover A lands on the expressway's left shoulder
      flyoverAt: e.mergeAt + (FLY - X.ramp), // where flyover B leaves it
    };
  });

  // side-road lat 0 is the line between its two lanes; its own lane (lat +LW/2) is the curve
  const sideWorld = (x, s, lat, out) => x.path(s - x.side0, lat - LW / 2, out);

  // ---- flyovers ---------------------------------------------------------------------
  // t = 0 at the expressway end, 1 at the side-road end. A flyover leaves the side road's
  // oncoming lane, climbs, crosses over the expressway, comes down beyond its far edge and
  // slips onto the left shoulder. Nothing crosses anything else at ground level. It is laid
  // out against the side road's line run on straight past its end, which is why the
  // expressway has to be straight there.
  const DIP = SH / 2 + 2.5; // how far outside the expressway's pavement it touches down
  const flyLat = (t) => -LSLOT - DIP * smooth(t / 0.2) + (LSLOT + RSLOT - LW + DIP) * smooth((t - 0.25) / 0.75);
  const flyY = (t) => X.flyoverHeight * smooth((t - 0.2) / 0.15) * (1 - smooth((t - 0.8) / 0.2));
  const flyT = (x, s, b) => b ? 1 - (s - x.flyB0) / FLY : (s - x.flyA0) / FLY;
  const flyWorld = (x, b, s, lat, out) => { // b: flyover B, which is A mirrored end to end, at the merge
    const t = flyT(x, s, b), tc = Math.max(0, Math.min(1, t));
    const a = FLY * t - (FLY - X.ramp); // metres into the side road from its near end
    const slope = (flyLat(tc + 0.005) - flyLat(tc - 0.005)) / (0.01 * FLY) * (b ? -1 : 1);
    const h = x.path(b ? x.length - a : a, flyLat(tc) - RSLOT, out) - Math.atan(slope);
    out.x -= Math.cos(h) * lat;
    out.z += Math.sin(h) * lat;
    // (it stands on the land: the side road's height where it runs along the side road, which out.y is; and
    // the expressway's where it is laid out along the expressway, beyond the side road's end)
    if (hilly && a < 0) out.y = mainHeight(b ? x.mergeAt - a : x.exitAt + a);
    out.y += flyY(tc);
    return h;
  };
  const mainHeight = (s) => {
    const f = Math.max(0, Math.min(mainYs.length - 1.001, (s + LEAD_IN) / STEP)), i = Math.floor(f);
    return mainYs[i] + (mainYs[i + 1] - mainYs[i]) * (f - i);
  };
  // how high a flyover's deck is above the land at s (for its pillars)
  const flyHeight = (s) => flyY(Math.max(0, Math.min(1, flyT(exitOf(s), s, kindOf(s) === FLY_B))));
  // where a support pillar can stand: under a raised part that isn't over the expressway
  const flyPillar = (s) => {
    const t = flyT(exitOf(s), s, kindOf(s) === FLY_B);
    return flyY(t) > 1.5 && (flyLat(t) < -(LSLOT + SH / 2 + 1) || t > (60 + FLY - X.ramp) / FLY);
  };

  // ---- split carriageways (a level's "splits": { from, to, apart? }; see CONFIG.split) -------------------
  // Over a split the two ways part company: the oncoming side of the expressway swings away to the left,
  // runs on by itself `apart` m off, and comes back in at the far end. To the game nothing has moved: the
  // road is the same lanes side by side, at the same lat. Only where the left side is in the world changes
  // (toWorld, below: everything left of the centre line, or of the median, is that much further left, and
  // turned the way its road goes), and nothing crosses the centre there (see keepOnRoad, and Traffic).
  const splits = LEVEL.splits || [], SPLIT = CONFIG.split;
  const apart = (s) => {
    if (!splits.length || !isMain(s)) return 0;
    let a = 0;
    for (const z of splits) {
      const E = Math.max(1, Math.min(SPLIT.ease, (z.to - z.from) / 2));
      a = Math.max(a, (z.apart ?? SPLIT.apart) * smooth((s - z.from) / E) * (1 - smooth((s - (z.to - E)) / E)));
    }
    return a;
  };

  // writes world position into `out` (y = height above the ground), returns heading
  const toWorld = (s, lat, out) => {
    const kind = kindOf(s);
    if (kind === MAIN) {
      const m = LOOP ? ((s % length) + length) % length : s; // (round a loop)
      const a = splits.length && lat < -HM ? apart(s) : 0;
      return a ? mainWorld(m, lat - a, out) + Math.atan((apart(s + 1) - apart(s - 1)) / 2) : mainWorld(m, lat, out);
    }
    const x = exitOf(s);
    return kind === SIDE_ROAD ? sideWorld(x, s, lat, out) : flyWorld(x, kind === FLY_B, s, lat, out);
  };

  // ---- cross-sections ------------------------------------------------------------------
  // 0 outside the zone, 1 inside, easing over `taper` metres at each end
  const zone = (s, z) => smooth((s - z.from) / CONFIG.taper) *
    (1 - smooth((s - (z.to - CONFIG.taper)) / CONFIG.taper));
  // expressway: the lanes on a side (-1 left, 1 right) at s; where it narrows to `lanesPerSide`,
  // that side's outer lanes merge inward (a median never narrows). A narrowing with a "side" is that side's
  // alone: so each way can lose and gain lanes of its own
  const lanesOn = (side, s) => {
    const n = side < 0 ? LEFT : RIGHT;
    let cut = 0;
    for (const z of narrows) if (!z.side || (z.side === 'left' ? -1 : 1) === side) cut = Math.max(cut, Math.max(0, n - z.lanesPerSide) * zone(s, z));
    return n - cut;
  };
  const edge = (s, side = 1) => HM + lanesOn(side, s) * LW; // expressway: a side's outer lane line, from the centre
  const onBridge = (s) => {
    for (const b of bridges) if (s >= b.from && s <= b.to) return true;
    return false;
  };
  // a side's shoulder at s: SH, but wider where the level has run-off ("runoff": { from, to, side, width }),
  // eased in and out over runoffEase m at each end (but not at the line of a lapped level: a stretch from 0, or to
  // the lap's end, is at its full width there, so run-off can carry on across the line)
  const runoffs = LEVEL.runoff || [];
  const shoulderOn = (side, s) => {
    let w = SH;
    for (const r of runoffs) {
      if ((r.side === 'left' ? -1 : 1) !== side) continue;
      if (s < r.from || s > r.to) continue;
      // (one with an "end" tapers in a straight line from `width` at `from` to `end` at `to`, with no easing: stretches
      // end to end, each beginning at the width the last ended at, make one smooth wall line)
      if (r.end !== undefined) { w = Math.max(w, SH + r.width + (r.end - r.width) * (s - r.from) / (r.to - r.from)); continue; }
      const E = CONFIG.runoffEase;
      const k = (LOOP && r.from <= 0 ? 1 : smooth((s - r.from) / E)) * (LOOP && r.to >= length ? 1 : 1 - smooth((s - (r.to - E)) / E));
      if (k > 0) w = Math.max(w, SH + r.width * k);
    }
    return w;
  };
  const mainOuter = (s, side = 1) => edge(s, side) + (onBridge(s) ? Math.min(SH, CONFIG.bridgeWallInset) : shoulderOn(side, s));
  // The exit / merge lane: an extra lane outside the expressway's right-hand lane, with the
  // shoulder beyond it. Before an exit it opens over `gore` metres at the start of the lane
  // zone and runs to the exit, where the side road's lane carries straight on from it and the
  // expressway's own pavement eases back under the departing side road. At a merge it is the
  // other way round: the side road's lane arrives as the extra lane, which then tapers away
  // over the lane zone. 0 .. 1 of a lane's width.
  const extraLane = (s) => {
    if (!isMain(s)) return 0;
    let w = 0;
    for (const x of exits) {
      w = Math.max(w,
        smooth((s - (x.exitAt - X.laneZone)) / X.gore) * (1 - smooth((s - x.exitAt) / X.gore)),
        smooth((s - (x.mergeAt - X.gore)) / X.gore) * (1 - smooth((s - x.mergeAt) / X.laneZone)));
    }
    return w;
  };
  const extra = (s) => extraLane(s) * LW;
  // side road: 0 on the single-lane ramps at each end, 1 where its oncoming lane exists too
  const sideOpen = (s) => {
    const x = exitOf(s), u = s - x.side0;
    return smooth((u - (X.ramp - 50)) / 45) * (1 - smooth((u - (x.length - X.ramp)) / 45));
  };

  // how many lanes wide a side road is at s (1 on its ramps; a part of a lane where one is opening or closing):
  // its exit's "lanes", eased from each count to the next
  const sideWidth = (s) => {
    const x = exitOf(s), u = s - x.side0;
    let count = x.lanes[0].count;
    for (let k = 1; k < x.lanes.length; k++) count += (x.lanes[k].count - x.lanes[k - 1].count) * smooth((u - x.lanes[k].at) / X.laneTaper);
    return 1 + (count - 1) * sideOpen(s);
  };
  // how much of its lane 0 (the left one) there is, 0 .. 1; and its last lane on the right
  const sideLeft = (s) => Math.max(0, Math.min(1, sideWidth(s) - 1));
  const sideLast = (s) => Math.max(1, Math.round(sideWidth(s)) - 1);
  // whether a side road's lane 0 is oncoming at s
  const sideOncoming = (s) => { const x = exitOf(s); return x.oncoming && s - x.side0 >= x.oncomingFrom; };

  // the lanes span [laneLo, laneHi]; the pavement, shoulders included, spans [lo, hi]
  const laneLo = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? -edge(s, -1) : kind === SIDE_ROAD ? -sideLeft(s) * LW : -LW / 2;
  };
  const laneHi = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? edge(s) + extra(s) : kind === SIDE_ROAD ? LW + Math.max(0, sideWidth(s) - 2) * LW : LW / 2;
  };
  const lo = (s) => {
    const kind = kindOf(s);
    if (kind === MAIN) return -mainOuter(s, -1);
    if (kind !== SIDE_ROAD) return -LW / 2;
    const w = sideLeft(s);
    return -w * LW - 0.3 - w * (SH - 0.3); // (a shoulder as wide as the expressway's, where its lane 0 is; a kerb's width on its ramps)
  };
  const hi = (s) => {
    const kind = kindOf(s);
    return kind === MAIN ? mainOuter(s) + extra(s) : kind === SIDE_ROAD ? laneHi(s) + SH : LW / 2;
  };
  // the middle of a shoulder (side -1 = left, +1 = right): where things stand on it
  const shoulderOffset = (side, s) => side < 0 ? (laneLo(s) + lo(s)) / 2 : (laneHi(s) + hi(s)) / 2;

  // the stretches of expressway with an exit or merge lane on the right
  const rampLaneZone = (s) => {
    if (!isMain(s)) return false;
    for (const x of exits) {
      if ((s >= x.exitAt - X.laneZone && s < x.exitAt + X.gore) ||
          (s >= x.mergeAt - X.gore && s <= x.mergeAt + X.laneZone)) return true;
    }
    return false;
  };
  const onShoulder = (lat, s) => lat > laneHi(s) || lat < laneLo(s);
  // the level's ice patch at (s, lat), if any: on the expressway, over one lane or (with no lane) all of them
  const ice = LEVEL.ice || [], slicks = [], sprays = [];
  const icy = (s, lat) => {
    for (const p of sprays) if (p.on && s >= p.from && s <= p.to && Math.abs(lat - laneOffset(p.lane, s)) <= LW / 2) return p;
    if (!isMain(s)) return null;
    for (const p of ice) {
      if (s < p.from || s > p.to) continue;
      if (p.lane === undefined ? lat >= laneLo(s) && lat <= laneHi(s) : Math.abs(lat - laneOffset(p.lane, s)) <= LW / 2) return p;
    }
    for (const p of slicks) if (s >= p.from && s <= p.to && Math.abs(lat - p.lat) <= p.half) return p;
    return null;
  };
  // how far into a tunnel s is (a level's "tunnels": { from, to }): 0 (outside) .. 1 (well inside), over
  // CONFIG.tunnel.edge m at each portal (the light fades in and out)
  const tunnels = LEVEL.tunnels || [];
  const tunnel = (s) => {
    if (!isMain(s)) return 0;
    let most = 0;
    for (const t of tunnels) {
      const E = CONFIG.tunnel.edge, u = Math.min(s - t.from + E * 0.3, t.to + E * 0.3 - s) / E;
      if (u > 0) most = Math.max(most, Math.min(1, u));
    }
    return most;
  };
  // gravel traps (a level's "gravel": { from, to, side, inner?, outer?, innerEnd?, outerEnd? }): part of that side's
  // shoulder and run-off is a bed of gravel, from `inner` m outside the outer lane's edge (CONFIG.gravel.inner if
  // not given: a strip of asphalt comes first) out to `outer` m, or to the wall if that is nearer or none is
  // given. With innerEnd / outerEnd the edges run in a straight line from one to the other along the stretch.
  // gravelBand(g, s): its two edges at s as [near, far] m outside the lane's edge, or null where there is no room
  // for any; gravelAt(s, lat): is that spot in a trap? (See Player and Traffic for what it does to a car)
  const gravels = (LEVEL.gravel || []).map(g => ({ ...g, sign: g.side === 'left' ? -1 : 1 }));
  const gravelBand = (g, s) => {
    const u = (s - g.from) / (g.to - g.from), inner = g.inner ?? CONFIG.gravel.inner, outer = g.outer ?? Infinity;
    const wall = (g.sign < 0 ? laneLo(s) - lo(s) : hi(s) - laneHi(s)) - CONFIG.gravel.wall;
    const near = inner + ((g.innerEnd ?? inner) - inner) * u, far = Math.min(wall, outer + ((g.outerEnd ?? outer) - outer) * u);
    return far - near > 0.5 ? [near, far] : null;
  };
  const gravelAt = (s, lat) => {
    if (!gravels.length || !isMain(s)) return false;
    for (const g of gravels) {
      if (s < g.from || s > g.to) continue;
      const band = gravelBand(g, s), d = g.sign < 0 ? laneLo(s) - lat : lat - laneHi(s);
      if (band && d >= band[0] && d <= band[1]) return true;
    }
    return false;
  };
  // is s in the mud? (a level's "mud": stretches of the main road where it gives way to mud)
  const mud = LEVEL.mud || [];
  const muddy = (s) => isMain(s) && mud.some(m => s >= m.from && s <= m.to);
  // the level's water stages (its "water": [{ from, to }]: see water.js and CONFIG.water), and how deep the water
  // is at s: 0 = dry road .. 1 = the channel's depth, deepening down the slipway at each end of a stage. (A
  // stage may run on before the start line or past the finish: a level that starts, or ends, on the water)
  const waters = (LEVEL.water || []).map(w => ({ from: w.from, to: w.to }));
  const water = (s) => {
    if (!waters.length || !isMain(s)) return 0;
    for (const w of waters) if (s > w.from && s < w.to) return Math.min(1, (s - w.from) / CONFIG.water.slipway, (w.to - s) / CONFIG.water.slipway);
    return 0;
  };
  // how thick a fog bank is at s (a level's "fog"): 0 (none) .. 1, thickening over its edges (see CONFIG.fog)
  const fogBanks = LEVEL.fog || [];
  const foggy = (s) => {
    let most = 0;
    for (const f of fogBanks) {
      const E = CONFIG.fog.edge, u = Math.min(s - f.from + E, f.to + E - s) / E;
      if (u > 0) most = Math.max(most, Math.min(1, u));
    }
    return most;
  };
  // is a car (lat, half width hw) over the railway's track at s? (a level with a "railway")
  const onRails = (s, lat, hw) => !!LEVEL.railway && isMain(s) && Math.abs(lat) - hw < CONFIG.railCrossing.width / 2;
  // the level's zone at s, if any (a level's "zones": see levels.js)
  const zones = LEVEL.zones || [];
  const zoneAt = (s) => isMain(s) ? zones.find(z => s >= z.from && s < z.to) || null : null;
  // how sharply the road bends at s: radians per metre, + = to the right
  const bend = (s) => {
    if (isMain(s)) return curveAt(s);
    const p = {};
    let d = toWorld(s - 1, 0, p) - toWorld(s + 1, 0, p);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d / 2;
  };

  // ---- lanes ------------------------------------------------------------------------------
  // expressway: 0 .. laneCount-1 left to right: the left side's lanes (oncoming on a two-way
  // road), the median's, then the right side's. -1 is the left shoulder, used as a lane only by
  // oncoming traffic heading for or coming off a flyover; laneCount is the exit / merge lane on
  // the right, used only by traffic taking a side road or coming off one.
  // side road: 0 .. 3 left to right (see its exit's "lanes"): 1 the lane its ramps are, 0 the one to its left
  // (the oncoming one, where it has oncoming traffic), 2 and 3 to its right. flyovers: 0.
  const laneOf = (side, k) => side < 0 ? LEFT - 1 - k : LEFT + MID + k; // k = 0 is a side's innermost lane
  const inMedian = (lane) => lane >= LEFT && lane < LEFT + MID;
  // a side's lanes still open at s (at least one, on a side that has any)
  const openCount = (side, s) => Math.min(side < 0 ? LEFT : RIGHT, Math.max(1, Math.round(lanesOn(side, s))));

  const laneOffset = (lane, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) {
      if (lane === 'left' || lane === 'right') return shoulderOffset(lane === 'left' ? -1 : 1, s);
      // (a lane that is closing eases into the one beside it: lane 0 into 1, the right-hand ones inwards)
      return lane <= 0 ? LW / 2 - sideLeft(s) * LW : (Math.min(lane, Math.max(1, sideWidth(s) - 1)) - 0.5) * LW;
    }
    if (kind !== MAIN) return 0;
    if (lane === 'left' || lane === 'right') return shoulderOffset(lane === 'left' ? -1 : 1, s); // (an item on a shoulder)
    if (lane < 0) return -(edge(s, -1) + SH / 2);
    // (where the exit / merge lane is only partly open, its centre is that much closer in, so
    // a car heading for it moves out as it opens, and one still in it as it closes is eased
    // back into the lane beside it)
    if (lane >= LANES) return edge(s) + extra(s) - LW / 2;
    if (inMedian(lane)) return (lane - LEFT + 0.5) * LW - HM;
    const side = lane < LEFT ? -1 : 1;
    const k = side < 0 ? LEFT - 1 - lane : lane - LEFT - MID;
    return side * (HM + (Math.min(k, lanesOn(side, s) - 1) + 0.5) * LW);
  };

  // the lane itself, or the lane it has merged into where the expressway is narrower
  const openLane = (lane, s) => {
    if (kindOf(s) === SIDE_ROAD && typeof lane === 'number') return Math.max(sideLeft(s) > 0.5 ? 0 : 1, Math.min(sideLast(s), lane));
    if (!isMain(s) || lane < 0 || lane >= LANES || inMedian(lane)) return lane;
    const side = lane < LEFT ? -1 : 1;
    const k = side < 0 ? LEFT - 1 - lane : lane - LEFT - MID;
    return laneOf(side, Math.min(k, openCount(side, s) - 1));
  };

  const nearestLane = (lat, s) => {
    const kind = kindOf(s);
    if (kind === SIDE_ROAD) return Math.max(sideLeft(s) > 0.5 ? 0 : 1, Math.min(sideLast(s), Math.floor(lat / LW) + 1));
    if (kind !== MAIN) return 0;
    // in the exit / merge lane, where there is (most of) one
    if (lat > 0 && extra(s) > LW / 2 && lat > edge(s) + (extra(s) - LW) / 2) return LANES;
    if (Math.abs(lat) < HM) return LEFT + Math.max(0, Math.min(MID - 1, Math.floor((lat + HM) / LW)));
    const side = (lat < 0 && LEFT > 0) || RIGHT === 0 ? -1 : 1;
    const k = Math.round((Math.abs(lat) - HM) / LW - 0.5);
    return laneOf(side, Math.max(0, Math.min(openCount(side, s) - 1, k)));
  };

  // [first, last] lane a vehicle travelling in direction dir normally uses
  const laneRange = (dir, s) => {
    const kind = kindOf(s);
    // (a side road: lane 0 is the oncoming traffic's where it has any, and everybody's before that)
    if (kind === SIDE_ROAD) return dir < 0 ? [0, 0] : [sideOncoming(s) || sideLeft(s) <= 0.5 ? 1 : 0, sideLast(s)];
    if (kind !== MAIN) return [0, 0];
    if (ONE_WAY) return [0, LANES - 1];
    return dir < 0 ? [0, LEFT - 1] : [LEFT + MID, LANES - 1]; // (never the median)
  };

  // where the player's lane assist pulls to: a lane centre, or the middle of a wide shoulder (the shoulder's own
  // width, SH: run-off is wider than that, and a car in it is not drawn to the middle of it, tens of metres from the
  // lanes. The first SH m of run-off behave as the shoulder they are; past that the assist does nothing, the
  // car stays where it is left, and steering is as free as ever)
  const assistOffset = (lat, s) => {
    const hiW = hi(s) - laneHi(s), loW = laneLo(s) - lo(s);
    if (lat > laneHi(s)) {
      if (hiW > SH + 0.01 && lat > laneHi(s) + SH) return lat;
      if (Math.min(hiW, SH) >= LW * 0.8) return laneHi(s) + Math.min(hiW, SH) / 2;
    } else if (lat < laneLo(s)) {
      if (loW > SH + 0.01 && lat < laneLo(s) - SH) return lat;
      if (Math.min(loW, SH) >= LW * 0.8) return laneLo(s) - Math.min(loW, SH) / 2;
    }
    return laneOffset(nearestLane(lat, s), s);
  };

  // ---- joining the roads up ---------------------------------------------------------------
  // Moves a vehicle that has reached a junction onto the next road. Own-direction vehicles
  // (the player included) take an exit by being in the exit lane as they pass the fork.
  // The player can also drive the flyovers the wrong way, against the oncoming traffic they
  // are built for: up flyover A from the expressway's left shoulder where it lands, over and
  // down into the side road's oncoming lane; and, still in that lane at the far end, up
  // flyover B and back over onto the left shoulder where it leaves.
  const transfer = (v) => {
    const kind = kindOf(v.s);
    let lane = null;
    const wrongWay = v.isPlayer && v.dir > 0; // (only at an exit with flyovers)
    if (kind === MAIN) {
      for (const x of exits) {
        if (wrongWay && x.flyovers && v.s >= x.landingAt && v.s < x.landingAt + 6 && v.lat < -edge(v.s, -1)) {
          v.s = x.flyA0 + (v.s - x.landingAt);
          v.lat += LSLOT;
          break;
        }
        if (v.dir > 0 && v.s >= x.exitAt && v.s < x.exitAt + 6 && v.lat > edge(v.s)) {
          v.s = x.side0 + (v.s - x.exitAt);
          v.lat -= RSLOT - LW / 2;
          lane = 1;
          break;
        }
        if (v.dir < 0 && x.flyovers && v.s <= x.flyoverAt && v.s > x.flyoverAt - 6 && v.lat < -edge(v.s, -1)) {
          v.s = x.flyB0 + FLY + (v.s - x.flyoverAt);
          v.lat += LSLOT;
          lane = 0;
          break;
        }
      }
    } else {
      const x = exitOf(v.s);
      if (wrongWay && kind === FLY_A && v.s >= x.flyA0 + FLY) {
        v.s = x.side0 + X.ramp + (v.s - x.flyA0 - FLY);
        v.lat -= LW / 2;
      } else if (wrongWay && x.flyovers && kind === SIDE_ROAD && v.s >= x.sideEnd - X.ramp && v.s < x.sideEnd - X.ramp + 6 && v.lat < 0) {
        v.s = x.flyB0 + (v.s - (x.sideEnd - X.ramp));
        v.lat += LW / 2;
      } else if (wrongWay && kind === FLY_B && v.s >= x.flyB0 + FLY) {
        v.s = x.flyoverAt + (v.s - x.flyB0 - FLY);
        v.lat -= LSLOT;
      } else if (kind === SIDE_ROAD && v.dir > 0 && v.s >= x.sideEnd) {
        v.s = x.mergeAt + (v.s - x.sideEnd);
        v.lat += RSLOT - LW / 2;
        lane = LANES; // arrives in the merge lane
      } else if (kind === SIDE_ROAD && v.dir < 0 && !x.flyovers && v.s <= x.side0 + X.ramp) {
        // (no flyover to take: where its lane meets the expressway, a car carries straight on into the
        // expressway's right-hand lane, the wrong way down it: see Traffic, wrong-way drivers)
        if (!v.isPlayer) {
          v.s = x.exitAt + (v.s - x.side0);
          v.lat += RSLOT - LW / 2 - LW;
          v.wrongWay = FLOW !== 'south'; // (where everything comes the other way, it is only joining the rest)
          lane = LANES - 1;
        }
      } else if (kind === SIDE_ROAD && v.dir < 0 && v.s <= x.side0 + X.ramp) {
        v.s = x.flyA0 + FLY + (v.s - x.side0 - X.ramp);
        v.lat += LW / 2;
        lane = 0;
      } else if (kind === FLY_A && v.s <= x.flyA0) {
        v.s = x.landingAt + (v.s - x.flyA0);
        v.lat -= LSLOT;
        lane = -1;
      } else if (kind === FLY_B && v.s <= x.flyB0) {
        v.s = x.sideEnd - X.ramp + (v.s - x.flyB0);
        v.lat -= LW / 2;
        lane = 0;
      }
    }
    if (lane !== null && v.lane !== undefined) v.lane = lane;
  };

  // how far along the whole course a point is, measured on the expressway. A side road is a
  // different length, so its metres are scaled; used for progress and spawn / despawn distances.
  const along = (s) => {
    const kind = kindOf(s);
    if (kind === MAIN) return s;
    const x = exitOf(s);
    if (kind === SIDE_ROAD) return x.exitAt + (s - x.side0) * x.span / x.length;
    return kind === FLY_A ? x.landingAt + (s - x.flyA0) : x.mergeAt - X.ramp + (s - x.flyB0);
  };
  const progress = (s) => Math.max(0, Math.min(1, along(s) / length));
  const finished = (s) => isMain(s) && s >= length;
  const inBounds = (s) => !isMain(s) || LOOP || (s > -LEAD_IN + 10 && s < length + LEAD_OUT - 10);

  // a point `distance` ahead of the player for new traffic (NaN if there is no road there).
  // Between an exit and its merge that is the player's road; before the exit, either.
  const spawnAt = (playerS, distance, dir) => {
    const from = along(playerS), c = from + distance;
    if (c > length + LEAD_OUT - 20) return NaN;
    let x = null;
    for (const e of exits) if (c > e.exitAt && c < e.mergeAt) x = e;
    // (on a one-way road, what comes the other way is only ever a side road's own)
    const sideOnly = dir < 0 && FLOW === 'north';
    if (!x) return sideOnly ? NaN : c;
    const playerOnIt = !isMain(playerS) && exitOf(playerS) === x;
    if (sideOnly ? !playerOnIt && from > x.exitAt : !playerOnIt && !(from <= x.exitAt && Math.random() < X.trafficShare)) return sideOnly ? NaN : c;
    if (dir < 0 && !x.oncoming) return sideOnly ? NaN : c; // (a one-way side road)
    const s = x.side0 + (c - x.exitAt) * x.length / x.span;
    // the side road's oncoming lane only exists between its ramps, from where its traffic turns oncoming, where it is that wide
    if (dir < 0 && (s < x.side0 + Math.max(X.ramp, x.oncomingFrom) + 10 || s > x.sideEnd - X.ramp - 10 || sideLeft(s) < 0.9)) return NaN;
    return s;
  };

  // s for an item in the level data: { s, road: 'side', exit: n } counts from the start of
  // the nth exit's side road (n defaults to 0)
  const place = (item) => item.road === 'side' && exits[item.exit || 0]
    ? exits[item.exit || 0].side0 + item.s : item.s;

  // distances from a world point to the nearest side road / the expressway, for placing scenery
  const nearest = (xs, zs, x, z, best) => {
    for (let i = 0; i < xs.length; i += 4) best = Math.min(best, Math.hypot(x - xs[i], z - zs[i]));
    return best;
  };
  const sideDistance = (x, z) => exits.reduce((best, e) => nearest(e.xs, e.zs, x, z, best), Infinity);
  const mainDistance = (x, z) => nearest(mainXs, mainZs, x, z, Infinity);

  // the road position { s, lat } of a world point (x, z), found on the road that `near` is on,
  // within `reach` metres of it: the s whose cross-section the point lies in, and how far across
  const fromWorld = (x, z, near, reach = 80) => {
    const road = (s) => isMain(s) ? -1 : Math.floor((s - FIRST) / BLOCK) * 4 + kindOf(s);
    const c = {};
    let s = near, best = Infinity;
    for (let at = near - reach; at <= near + reach; at += STEP) { // the nearest centre-line point...
      if (road(at) !== road(near)) continue;
      toWorld(at, 0, c);
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < best) { best = d; s = at; }
    }
    let h = 0;
    for (let i = 0; i < 3; i++) { // ...then slid along until the point is square to it
      h = toWorld(s, 0, c);
      s += (x - c.x) * Math.sin(h) + (z - c.z) * Math.cos(h);
    }
    h = toWorld(s, 0, c);
    return { s, lat: -(x - c.x) * Math.cos(h) + (z - c.z) * Math.sin(h) };
  };

  // ---- junctions (a level's "junctions": see CONFIG.junction) --------------------------------
  // At each, the road turns a quarter right or left (its bend starting at s), or goes straight on,
  // through a square box as wide as the road, shoulders and all. The two arms it doesn't take are
  // roads of their own, as wide, running out from the box until they would come near the road
  // again (or for ARM metres). All in world space (x, z), on level ground:
  //   s, end     the stretch of expressway through it: the bend, or the box (straight on)
  //   way        1 = a right turn, -1 = left, 0 = straight on; radius: the bend's
  //   centre     the middle of the box; half: half its width
  //   f0, r0     the road's direction coming in, and its right; out: its direction going on
  //   arms       [{ dir, length }]: the arms it doesn't take, length from the centre. A turn's are
  //              straight on, then the side opposite the way it goes; straight on, right then left
  const ARM = 220;
  const junctions = (LEVEL.junctions || []).map((j) => {
    const at = {}, p = {}, h0 = mainWorld(j.s, 0, at);
    const f0 = { x: Math.sin(h0), z: Math.cos(h0) }, r0 = { x: -Math.cos(h0), z: Math.sin(h0) };
    const neg = (v) => ({ x: -v.x, z: -v.z });
    const half = HM + Math.max(LEFT, RIGHT) * LW + SH;
    const way = j.turn === 'right' ? 1 : j.turn === 'left' ? -1 : 0;
    let end = j.s + 2 * half, turned = 0;
    if (way) { // (the bend: as far as the road takes to turn a quarter)
      for (end = j.s; end < j.s + 80 && Math.abs(turned) < Math.PI / 2 - 0.005;) {
        end += 0.5;
        turned = h0 - mainWorld(end, 0, p);
        while (turned > Math.PI) turned -= 2 * Math.PI;
        while (turned < -Math.PI) turned += 2 * Math.PI;
      }
    }
    const radius = way ? (end - j.s) / (Math.PI / 2) : 0, reach = way ? radius : half;
    const centre = { x: at.x + f0.x * reach, y: at.y, z: at.z + f0.z * reach };
    const out = way > 0 ? r0 : way < 0 ? neg(r0) : f0;
    const arms = (way ? [f0, neg(out)] : [r0, neg(r0)]).map((dir) => {
      let length = half;
      while (length < ARM) {
        const t = length + 5;
        if (t > half + 20 && mainDistance(centre.x + dir.x * t, centre.z + dir.z * t) < half + 2) break;
        length = t;
      }
      return { dir, length };
    });
    return { s: j.s, end, turn: j.turn, way, turned, radius, half, centre, f0, r0, out, arms,
      forward: j.forward ?? CONFIG.junction.forward, turnOff: j.turnOff ?? CONFIG.junction.turnOff,
      busy: false }; // (set every step by Traffic: a car is leaving across the box)
  });

  // ---- checking the level data ---------------------------------------------------------------
  const problems = [];
  {
    for (const z of LEVEL.quietZones || []) {
      if (!(z.from < z.to) || z.from < 0 || z.to > length || !(z.density >= 0 && z.density <= 1)) problems.push('quiet zone at ' + z.from + ': from before to, on the road, a density from 0 to 1');
    }
    const clock = LEVEL.clock;
    if (!(clock && clock.good > 0 && clock.evil > 0)) problems.push('clock: { good, evil }, seconds for each side (see scripts/level-clocks.mjs)');
    const reach = FLY - X.ramp;
    const curved = (a, b) => { for (let s = a; s < b; s += STEP) if (curveAt(s) !== 0) return true; return false; };
    const overlaps = (a, b, c, d) => a < d && c < b;
    if (![LEFT, RIGHT, MID].every(n => Number.isInteger(n) && n >= 0) || LEFT + RIGHT < 1) {
      problems.push('lanes: whole numbers, and at least one lane');
    }
    if (!ONE_WAY && (LEFT < 1 || RIGHT < 1)) problems.push('lanes: a two-way road needs at least one lane each way');
    if (ONE_WAY && MID) problems.push('median: only a two-way road can have one');
    if (LEVEL.railway && !MID) problems.push('railway: it needs a median to run down');
    if (LEVEL.drive !== undefined && LEVEL.drive !== 'left' && LEVEL.drive !== 'right') problems.push('drive: left or right');
    // a bend tighter than the road is wide folds its inside edge over itself, and a road that comes
    // back past itself (a hairpin's legs, say) must leave room between the two
    const halfWidth = HM + Math.max(LEFT, RIGHT) * LW + SH;
    LEVEL.segments.forEach((seg, i) => {
      if (seg.curve && 1 / Math.abs(seg.curve) < halfWidth + 3) {
        problems.push('segment ' + (i + 1) + ': a bend of radius ' + (1 / Math.abs(seg.curve)).toFixed(0) +
          ' m is too tight for this road; it needs at least ' + Math.ceil(halfWidth + 3) + ' m');
      }
    });
    {
      const at = [], p = {};
      for (let s = -LEAD_IN; s <= length + LEAD_OUT; s += 8) { mainWorld(s, 0, p); at.push([s, p.x, p.z]); }
      let clash = null;
      for (let i = 0; i < at.length && !clash; i++) {
        for (let j = i + 1; j < at.length; j++) {
          if (at[j][0] - at[i][0] < 3 * halfWidth) continue;
          if (LOOP && length - (at[j][0] - at[i][0]) < 3 * halfWidth) continue; // (round a loop, the end meets the start)
          const d = Math.hypot(at[i][1] - at[j][1], at[i][2] - at[j][2]);
          if (d < 2 * halfWidth + 2) { clash = [at[i][0], at[j][0], d]; break; }
        }
      }
      if (clash) problems.push('the road runs into itself: at ' + clash[0] + ' m and ' + clash[1] + ' m it is only ' + clash[2].toFixed(0) + ' m apart');
    }
    for (const J of junctions) {
      const name = 'junction at ' + J.s;
      if (J.turn !== 'left' && J.turn !== 'right' && J.turn !== 'straight') problems.push(name + ': turn is left, right or straight');
      else if (J.way && Math.abs(J.turned - J.way * Math.PI / 2) > 0.02) problems.push(name + ': the road must turn a quarter ' + J.turn + ' within 80 m of it');
      else if (!J.way && [J.s, J.s + J.half, J.end].some(s => curveAt(s))) problems.push(name + ': the road must run straight through it');
      if (J.arms.some(arm => arm.length < J.half + 100)) problems.push(name + ': an arm runs into the road within 100 m');
      if (J.s < 60 || J.end > length - 20) problems.push(name + ': too near the start or the finish');
    }
    for (const p of ice) {
      if (!(p.from < p.to) || p.from < 0 || p.to > length) problems.push('ice at ' + p.from + '-' + p.to + ': from before to, on the road');
      else if (p.lane !== undefined && !(Number.isInteger(p.lane) && p.lane >= 0 && p.lane < LANES)) problems.push('ice at ' + p.from + ': no lane ' + p.lane);
    }
    for (const z of [...(LEVEL.migration || []), ...(LEVEL.elephants || [])]) {
      if (!(z.from < z.to) || !(z.kinds ? exits[z.exit || 0] || z.road !== 'side' : true) || z.from < 0 || z.to > (z.kinds && z.road === 'side' && exits[z.exit || 0] ? exits[z.exit || 0].length : length)) problems.push((z.kinds ? 'migration' : 'elephants') + ' at ' + z.from + '-' + z.to + ': from before to, on the road');
    }
    if (LOOP) {
      const a = {}, b = {};
      const ha = mainWorld(0, 0, a), hb = mainWorld(length, 0, b);
      const turned = Math.abs(((hb - ha) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (Math.hypot(a.x - b.x, a.z - b.z) > 1 || turned > 0.01) problems.push('laps: the road must come back round to where it starts, facing the same way (it ends ' + Math.hypot(a.x - b.x, a.z - b.z).toFixed(1) + ' m off)');
    }
    for (const r of runoffs) {
      if (!(r.from < r.to) || r.from < 0 || r.to > length || !(r.end === undefined ? r.width > 0 : r.width >= 0 && r.end >= 0 && r.width + r.end > 0) || (r.side !== 'left' && r.side !== 'right')) problems.push('runoff at ' + r.from + ': from before to, on the road, a width, side left or right');
    }
    for (const g of gravels) {
      if (!(g.from < g.to) || g.from < 0 || g.to > length || (g.side !== 'left' && g.side !== 'right')) problems.push('gravel at ' + g.from + ': from before to, on the road, side left or right');
      else if ([g.inner, g.outer, g.innerEnd, g.outerEnd].some(v => v !== undefined && !(v >= 0)) || (g.outer ?? Infinity) <= (g.inner ?? CONFIG.gravel.inner) || (g.outerEnd ?? g.outer ?? Infinity) <= (g.innerEnd ?? g.inner ?? CONFIG.gravel.inner)) problems.push('gravel at ' + g.from + ': inner and outer are m outside the lane\'s edge, outer the greater');
      else if (g.road === 'side') problems.push('gravel at ' + g.from + ': there is none on a side road (only on the expressway)');
    }
    for (const m of mud) {
      if (!(m.from < m.to) || m.from < 0 || m.to > length) problems.push('mud at ' + m.from + '-' + m.to + ': from before to, on the road');
    }
    for (const row of LEVEL.potties || []) {
      const name = 'portaloos at ' + row.s;
      if (!['hop', 'wave', 'slide', 'shuffle', 'stomp', 'spin'].includes(row.pattern)) problems.push(name + ': no dance called "' + row.pattern + '"');
      if (!(row.lanes && row.lanes.length && row.lanes.every(l => l >= 0 && l < LANES))) problems.push(name + ': lanes on the road');
    }
    for (const m of LEVEL.machinery || []) {
      const at = m.s ?? m.from;
      if (!(at >= 0 && at <= length) || (m.to !== undefined && !(m.to > m.from && m.to <= length))) problems.push('machinery at ' + at + ': beyond the road');
    }
    for (const w of LEVEL.siteWorks || []) {
      const at = w.s ?? w.from;
      if (!['trench', 'excavator', 'workers', 'pipes'].includes(w.kind)) problems.push('site works at ' + at + ': no kind called "' + w.kind + '"');
      else if (!(at >= 0 && at <= length) || (w.to !== undefined && !(w.to > w.from && w.to <= length))) problems.push('site works at ' + at + ': beyond the road');
    }
    // the hidden gimmicks level's (see levels.js)
    const straight = (from, to) => { for (let s = from; s <= to; s += 5) if (curveAt(s)) return false; return true; };
    // (whatever is put at a place can be on a side road: { road: 'side', exit: n }, s (or from, to) then m along it.
    // See levels.js for the kinds that can: those that can't say so here)
    for (const [name, list] of [['ice', LEVEL.ice], ['stop / go', LEVEL.stopGo], ['parked car', LEVEL.parked], ['roadblock', LEVEL.roadblocks], ['ice-cream stop', LEVEL.iceCreamStops],
      ['reversible lane', LEVEL.reversible], ['wreckage', LEVEL.wreckage], ['machinery', LEVEL.machinery], ['site works', LEVEL.siteWorks], ['parade', LEVEL.parades], ['hippos', LEVEL.hippos],
      ['elephants', LEVEL.elephants], ['fog', (LEVEL.fog || []).filter(z => !z.count)], ['mud', LEVEL.mud], ['quarry', LEVEL.quarries], ['tunnel', LEVEL.tunnels], ['bridge', LEVEL.bridges]]) {
      for (const item of list || []) if (item.road === 'side') problems.push(name + ' at ' + (item.s ?? item.from ?? item.at) + ': there are none on a side road (only on the expressway)');
    }
    const onRoad = (item, s = item.s) => item.road === 'side' ? !!exits[item.exit || 0] && s >= 0 && s <= exits[item.exit || 0].length : s >= 0 && s <= length;
    const laneOn = (item, lane) => Number.isInteger(lane) && lane >= 0 && lane < (item.road === 'side' ? 4 : LANES);
    const where = (item) => item.road === 'side' ? ' (side road)' : '';
    for (const c of LEVEL.cameras || []) {
      if (!onRoad(c)) problems.push('camera at ' + c.s + where(c) + ': beyond the road');
      else if (!['left', 'right', 'centre'].includes(c.side)) problems.push('camera at ' + c.s + ': side is left, right or centre');
    }
    for (const c of LEVEL.crossings || []) {
      const R = CONFIG.crossing.stopLine + 10;
      if (!onRoad(c, c.s - R) || !onRoad(c, c.s + R)) problems.push('level crossing at ' + c.s + where(c) + ': beyond the road');
      else if (c.road !== 'side' && !straight(c.s - R, c.s + R)) problems.push('level crossing at ' + c.s + ': the road must run straight through it');
    }
    for (const z of LEVEL.stopGo || []) {
      const R = CONFIG.stopGo.stopLine + 10;
      if (!(z.from < z.to) || z.from - R < 0 || z.to + R > length) problems.push('stop / go at ' + z.from + ': from before to, on the road');
      else if (ONE_WAY || LEFT !== 1 || RIGHT !== 1 || MID) problems.push('stop / go at ' + z.from + ': only on a two-way road of one lane each way');
      else if (!straight(z.from - R, z.to + R)) problems.push('stop / go at ' + z.from + ': the road must run straight through it');
    }
    for (const z of [...(LEVEL.fog || []), ...(LEVEL.rockfall || [])]) {
      if (!(z.from < z.to) || !(z.count ? onRoad(z, z.from) && onRoad(z, z.to) : z.from >= 0 && z.to <= length)) problems.push((z.count ? 'rockfall' : 'fog') + ' at ' + z.from + '-' + z.to + ': from before to, on the road');
      else if (z.count && z.side !== 'left' && z.side !== 'right') problems.push('rockfall at ' + z.from + ': side is left or right');
    }
    for (const t of tunnels) {
      if (!(t.from < t.to) || t.from < 30 || t.to > length - 30) problems.push('tunnel at ' + t.from + '-' + t.to + ': from before to, on the road, clear of the start and the finish');
      else if (t.to - t.from < 60) problems.push('tunnel at ' + t.from + ': too short (60 m at least)');
      for (const x of exits) if (overlaps(t.from - 20, t.to + 20, x.exitAt - X.laneZone, x.mergeAt + X.laneZone)) problems.push('tunnel at ' + t.from + ': an exit\'s ramps are in it');
    }
    for (const p of LEVEL.parades || []) {
      if (!(p.s >= 0 && p.s <= length)) problems.push('parade at ' + p.s + ': beyond the road');
      else if (FLOW === 'south') problems.push('parade at ' + p.s + ': there is no side going the player\'s way for it');
    }
    for (const r of LEVEL.roadblocks || []) {
      const [first, last] = laneRange(1, r.s || 0);
      if (!(r.s >= 0 && r.s <= length)) problems.push('roadblock at ' + r.s + ': beyond the road');
      else if (last - first < 1) problems.push('roadblock at ' + r.s + ': the player\'s side needs two lanes or more, for a gap');
      else if (r.gap !== undefined && !(Number.isInteger(r.gap) && r.gap >= first && r.gap <= last)) problems.push('roadblock at ' + r.s + ': gap is a lane on the player\'s side (' + first + ' to ' + last + ')');
    }
    for (const st of LEVEL.iceCreamStops || []) {
      const [first, last] = laneRange(1, st.s || 0);
      if (!(st.s >= 0 && st.s <= length)) problems.push('ice-cream stop at ' + st.s + ': beyond the road');
      else if (!(Number.isInteger(st.lane) && st.lane >= first && st.lane <= last)) problems.push('ice-cream stop at ' + st.s + ': lane is one on the player\'s side (' + first + ' to ' + last + ')');
    }
    for (const r of LEVEL.reversible || []) {
      const [first, last] = laneRange(1, r.from || 0);
      if (!(r.from < r.to) || r.from < 50 || r.to > length) problems.push('reversible lane at ' + r.from + '-' + r.to + ': from before to, on the road, clear of the start');
      else if (!(Number.isInteger(r.lane) && r.lane >= first && r.lane <= last) || last - first < 1) problems.push('reversible lane at ' + r.from + ': lane is one of two or more on the player\'s side (' + first + ' to ' + last + ')');
      else if (ONE_WAY) problems.push('reversible lane at ' + r.from + ': only on a two-way road');
    }
    if (LEVEL.convoys && !(LEVEL.convoys.every && LEVEL.convoys.every.min > 0 && LEVEL.convoys.every.max >= LEVEL.convoys.every.min)) problems.push('convoys: every { min, max } s');
    if (LEVEL.pursuits) {
      const e = LEVEL.pursuits.every;
      if (!(e && e.min > 0 && e.max >= e.min)) problems.push('pursuits: every { min, max } s');
      if (LEVEL.laps || LEVEL.battle || (LEVEL.grid && !LEVEL.grid.rival)) problems.push('pursuits: not on a race, nor the Battlefield');
      else if (FLOW === 'south' || FLOW === 'mixed') problems.push('pursuits: there is no side going the player\'s way for it');
    }
    for (const m of LEVEL.waterMains || []) {
      if (!(m.s >= 0 && m.s <= length)) problems.push('water main at ' + m.s + ': beyond the road');
      else if (!(Number.isInteger(m.lane) && m.lane >= 0 && m.lane < LANES)) problems.push('water main at ' + m.s + ': in a lane on the road');
    }
    for (const z of LEVEL.landmines || []) {
      if (!(z.from < z.to) || !onRoad(z, z.from) || !onRoad(z, z.to) || !(z.count > 0)) problems.push('landmines at ' + z.from + '-' + z.to + where(z) + ': from before to, on the road, with a count');
    }
    for (const q of LEVEL.quarries || []) {
      if (!(q.from < q.to) || q.from < 0 || q.to > length || (q.side !== 'left' && q.side !== 'right')) problems.push('quarry at ' + q.from + ': from before to, on the road, on the left or right');
    }
    for (const h of LEVEL.potholes || []) {
      if (!onRoad(h) || !laneOn(h, h.lane)) problems.push('pothole at ' + h.s + where(h) + ': in a lane on the road');
    }
    for (const p of LEVEL.pelotons || []) {
      if (!onRoad(p) || !(p.count > 0)) problems.push('peloton at ' + p.s + where(p) + ': on the road, with a count');
      else if (p.dir === -1 ? FLOW === 'north' : FLOW === 'south') problems.push('peloton at ' + p.s + ': there is no ' + (p.dir === -1 ? 'oncoming side' : 'side the player\'s way') + ' for it to ride');
    }
    // Gimmick Road 2's (see hazards.js)
    for (const [name, list, R] of [['school crossing', LEVEL.schoolCrossings, CONFIG.schoolCrossing.stopLine + 10], ['drawbridge', LEVEL.drawbridges, CONFIG.drawbridge.stopLine + 10]]) {
      for (const c of list || []) {
        if (!onRoad(c, c.s - R) || !onRoad(c, c.s + R)) problems.push(name + ' at ' + c.s + where(c) + ': beyond the road');
        else if (c.road !== 'side' && !straight(c.s - R, c.s + R)) problems.push(name + ' at ' + c.s + ': the road must run straight through it');
      }
    }
    for (const m of LEVEL.waterMains || []) {
      if (!onRoad(m) || !onRoad(m, m.s + (m.length ?? CONFIG.waterMain.length)) || !laneOn(m, m.lane)) problems.push('water main at ' + m.s + where(m) + ': in a lane on the road');
    }
    for (const [name, list] of [['balloon', LEVEL.balloons], ['wide load', LEVEL.wideLoads]]) {
      for (const b of list || []) {
        if (!onRoad(b)) problems.push(name + ' at ' + b.s + where(b) + ': beyond the road');
        else if (!(b.lanes && b.lanes[0] <= b.lanes[1] && laneOn(b, b.lanes[0]) && laneOn(b, b.lanes[1]))) problems.push(name + ' at ' + b.s + ': lanes [first, last] on the road');
        else if (name === 'wide load' && b.lanes[1] !== b.lanes[0] + 1) problems.push(name + ' at ' + b.s + ': it is two lanes wide: lanes [n, n + 1]');
      }
    }
    for (const m of LEVEL.marathons || []) {
      if (!onRoad(m) || !laneOn(m, m.lane) || !(m.count > 0)) problems.push('marathon at ' + m.s + where(m) + ': in a lane on the road, with a count');
      else if (m.water !== undefined && !onRoad(m, m.water)) problems.push('marathon at ' + m.s + ': its water station is beyond the road');
    }
    for (const [name, list] of [['trolleys', LEVEL.trolleys], ['stampede', LEVEL.stampedes]]) {
      for (const z of list || []) {
        if (!(z.from < z.to) || !onRoad(z, z.from) || !onRoad(z, z.to)) problems.push(name + ' at ' + z.from + where(z) + ': from before to, on the road');
        else if (name === 'stampede' && z.kind !== undefined && z.kind !== 'cow' && z.kind !== 'kangaroo') problems.push(name + ' at ' + z.from + ': kind is cow or kangaroo');
      }
    }
    // ---- Gimmick Road 3's (the road gambles: see gambles.js, and levels.js for each field) ----
    const mainStretch = (z) => z.from < z.to && z.from >= 0 && z.to <= length && z.road !== 'side';
    for (const w of LEVEL.crosswinds || []) {
      if (!mainStretch(w)) problems.push('crosswind at ' + w.from + ': from before to, on the expressway');
      else if (w.dir !== 'left' && w.dir !== 'right') problems.push('crosswind at ' + w.from + ': dir is left or right (the side it blows to)');
      else if ([w.strength, w.every, w.length].some(v => v !== undefined && !(v > 0)) || (w.every ?? CONFIG.crosswind.every) < (w.length ?? CONFIG.crosswind.length)) problems.push('crosswind at ' + w.from + ': strength, every and length are more than 0, a gust no longer than the time between gusts');
    }
    for (const b of LEVEL.lowBridges || []) {
      const name = 'low bridge at ' + b.s;
      if (b.road === 'side' || !(b.s >= 60 && b.s <= length - 30)) problems.push(name + ': on the expressway, 60 m from the start, 30 m from the finish');
      else if (b.clearance !== undefined && !(b.clearance >= 1 && b.clearance <= 5)) problems.push(name + ': clearance is 1 to 5 m');
      else if (b.first !== undefined && b.first !== 'left' && b.first !== 'right') problems.push(name + ': first is left or right (the half that has the first bar)');
      else if (!exits.some(x => x.exitAt + 40 < b.s && x.mergeAt - 40 > b.s + CONFIG.lowBridge.stagger)) problems.push(name + ': between an exit and its merge, 40 m clear of both (the side road is the way round for tall vehicles; its second bar is ' + CONFIG.lowBridge.stagger + ' m on)');
    }
    for (const f of LEVEL.fords || []) {
      const name = 'ford at ' + f.from;
      if (!mainStretch(f) || f.to - f.from > 300) problems.push(name + ': from before to, on the expressway, 300 m long at most');
      else if (f.depth !== undefined && !(f.depth >= 0.1 && f.depth <= 1.5)) problems.push(name + ': depth is 0.1 to 1.5 m');
      else if (f.fills !== undefined && !(f.fills && f.fills.to >= (f.depth ?? CONFIG.ford.depth) && f.fills.to <= 1.5 && f.fills.over > 0)) problems.push(name + ': fills is { to, over }: a depth from its own to 1.5 m, over more than 0 s');
      else if (!exits.some(x => x.exitAt + 40 < f.from && x.mergeAt - 40 > f.to)) problems.push(name + ': between an exit and its merge, 40 m clear of both (the side road is the bridge)');
    }
    for (const c of LEVEL.cushions || []) {
      if (!mainStretch(c)) problems.push('speed cushions at ' + c.from + ': from before to, on the expressway');
      else if (c.every !== undefined && !(c.every >= 15 && c.every <= 200)) problems.push('speed cushions at ' + c.from + ': every is 15 to 200 m');
    }
    for (const z of LEVEL.shade || []) {
      if (!mainStretch(z)) problems.push('shade at ' + z.from + ': from before to, on the expressway');
      else if (z.side !== 'left' && z.side !== 'right') problems.push('shade at ' + z.from + ': side is left or right (the side what casts it stands on)');
      else if (z.lanes !== undefined && !(Number.isInteger(z.lanes) && z.lanes >= 1 && z.lanes <= 8)) problems.push('shade at ' + z.from + ': lanes is 1 to 8');
    }
    for (const r of LEVEL.ruts || []) if (!mainStretch(r)) problems.push('ruts at ' + r.from + ': from before to, on the expressway');
    for (const z of LEVEL.tarmac || []) {
      const name = 'fresh tarmac at ' + z.from;
      if (!mainStretch(z)) { problems.push(name + ': from before to, on the expressway'); continue; }
      const [first, last] = laneRange(1, (z.from + z.to) / 2);
      if (!(Number.isInteger(z.lane) && z.lane >= first && z.lane <= last)) problems.push(name + ': lane is one on the player\'s side (' + first + ' to ' + last + ')');
      else if (last === first) problems.push(name + ': the player\'s side needs a second lane there, for the queue');
    }
    for (const z of LEVEL.spray || []) if (!mainStretch(z)) problems.push('spray at ' + z.from + ': from before to, on the expressway');
    for (const z of LEVEL.lowSun || []) if (!mainStretch(z)) problems.push('low sun at ' + z.from + ': from before to, on the expressway');
    for (const z of LEVEL.dust || []) {
      if (!mainStretch(z)) problems.push('dust at ' + z.from + ': from before to, on the expressway');
      else if (z.wind !== 'left' && z.wind !== 'right') problems.push('dust at ' + z.from + ': wind is left or right (the side it blows to)');
    }
    for (const b of LEVEL.washboards || []) {
      if (!mainStretch(b)) problems.push('washboard at ' + b.from + ': from before to, on the expressway');
    }
    for (const r of LEVEL.jamRamps || []) {
      const J = CONFIG.jamRamp, far = r.s + J.run + J.gap + (r.queue ?? J.queue) * J.spacing + 40, name = 'ramp over the jam at ' + r.s;
      if (r.road === 'side' || !(r.s >= 60 && far <= length)) { problems.push(name + ': on the expressway, 60 m from the start, room for its queue before the finish'); continue; }
      const [first, last] = laneRange(1, r.s);
      let sloped = false;
      for (let s = r.s - 40; s <= far; s += STEP) if (Math.abs(grade(s)) > 0.002) sloped = true;
      if (!(Number.isInteger(r.lane) && r.lane >= first && r.lane <= last)) problems.push(name + ': lane is one on the player\'s side (' + first + ' to ' + last + ')');
      else if (r.lanes !== undefined && !(Array.isArray(r.lanes) && r.lanes[0] >= first && r.lanes[1] <= last && r.lanes[0] <= r.lane && r.lanes[1] >= r.lane)) problems.push(name + ': lanes [first, last] on the player\'s side, its own among them');
      else if (r.queue !== undefined && !(Number.isInteger(r.queue) && r.queue >= 1 && r.queue <= 10)) problems.push(name + ': a queue of 1 to 10 cars');
      else if (!straight(r.s - 40, far) || sloped) problems.push(name + ': the road must run straight and level through it');
      else for (const x of exits) if (overlaps(r.s - 40, far, x.exitAt - X.laneZone, x.exitAt + 20) || overlaps(r.s - 40, far, x.mergeAt - 20, x.mergeAt + X.laneZone)) problems.push(name + ': an exit\'s ramps are in it');
    }
    LEVEL.segments.forEach((seg, i) => { if (seg.ease !== undefined && !(seg.ease >= 2 && seg.ease <= 200)) problems.push('segment ' + (i + 1) + ': ease is 2 to 200 m'); });
    for (const e of LEVEL.wreckage || []) {
      const name = 'wreckage at ' + e.at;
      if (!CONFIG.wreckage.kinds[e.kind]) problems.push(name + ': there is no kind of wreckage called "' + e.kind + '"');
      else if (e.at < 0 || e.at > length) problems.push(name + ': beyond the road');
      else if (!(e.lanes && e.lanes[0] <= e.lanes[1] && e.lanes[0] >= 0 && e.lanes[1] < LANES)) problems.push(name + ': lanes [first, last] on the road');
      else if (e.kind === 'boulders' ? e.lanes[1] - e.lanes[0] + 1 >= LANES // (boulders: some lane left open, either way)
        : e.kind !== 'blast' && e.lanes[1] - e.lanes[0] + 1 >= openCount(1, e.at) + (ONE_WAY ? openCount(-1, e.at) : 0)) problems.push(name + ': it must leave a lane open'); // (a blast leaves the road clear)
    }
    for (const r of LEVEL.hippos || []) {
      if (!(r.from < r.to) || r.from < 0 || r.to > length) problems.push('hippos at ' + r.from + '-' + r.to + ': from before to, on the road');
      else if (!(r.every && r.every.min > 0 && r.every.max >= r.every.min)) problems.push('hippos at ' + r.from + ': every { min, max } s');
    }
    if (LEVEL.tide) {
      const t = LEVEL.tide, w = t.waves || {};
      if (!(t.from < t.to) || t.from < 0 || t.to > length) problems.push('tide: from before to, on the road');
      if (!(t.start >= 0 && t.end >= t.start)) problems.push('tide: start and end are lanes flooded, end no lower than start');
      if (!(w.every && w.every.min > 0 && w.every.max >= w.every.min && w.reach && w.reach.max >= w.reach.min)) problems.push('tide: waves need every { min, max } and reach { min, max }');
      if (t.washUp && !(t.washUp.types && t.washUp.count && t.washUp.count.max >= t.washUp.count.min)) problems.push('tide: washUp needs types { type: share } and count { min, max }');
      if (!RIGHT || ONE_WAY || (LEVEL.exits || []).length) problems.push('tide: only on a two-way road with lanes going the player\'s way, and no exits');
    }
    waters.forEach((w, i) => {
      const name = 'water at ' + w.from + '-' + w.to;
      if (!(w.from < w.to) || w.to - w.from < CONFIG.water.slipway * 3) problems.push(name + ': from before to, and ' + CONFIG.water.slipway * 3 + ' m long at least (a slipway at each end)');
      else if (i && w.from < waters[i - 1].to + 60) problems.push(name + ': 60 m of road at least after the water before');
      else {
        if (!LEVEL.amphibious) problems.push(name + ': only on an amphibious level ("amphibious": true)');
        for (const x of exits) if (overlaps(w.from - 20, w.to + 20, x.exitAt - X.laneZone, x.mergeAt + X.laneZone)) problems.push(name + ': the ramps of an exit are in it');
        for (const j of junctions) if (overlaps(w.from - 20, w.to + 20, j.s - 20, j.end + 20)) problems.push(name + ': a junction is in it');
        for (const z of splits) if (overlaps(w.from - 20, w.to + 20, z.from, z.to)) problems.push(name + ': the two ways of the road are apart there');
        for (const t of tunnels) if (overlaps(w.from - 20, w.to + 20, t.from, t.to)) problems.push(name + ': a tunnel is in it');
        let sloped = false;
        for (let s = Math.max(0, w.from - 20); s <= Math.min(length, w.to + 20); s += STEP) if (Math.abs(grade(s)) > 0.002) sloped = true;
        if (sloped) problems.push(name + ': water lies level: no hills there');
        if (LEVEL.railway) problems.push(name + ': no railway on a level with water');
      }
    });
    zones.forEach((z, i) => {
      const name = 'zone ' + (z.id || i + 1);
      if (!(z.from < z.to) || (i && z.from < zones[i - 1].to)) problems.push(name + ': from before to, and after the zone before');
      for (const kind of Object.keys(z.traffic || {})) {
        if (!CONFIG.vehicles[kind]) problems.push(name + ': there is no vehicle called "' + kind + '"');
      }
    });
    for (const car of LEVEL.parked || []) {
      if (car.s < 0 || car.s > length) problems.push('parked car at ' + car.s + ': beyond the road');
      else if (car.side !== 'left' && car.side !== 'right') problems.push('parked car at ' + car.s + ': side is left or right');
      else if (onBridge(car.s)) problems.push('parked car at ' + car.s + ': no shoulder to park on, on a bridge');
    }
    exits.forEach((x, i) => {
      const name = 'exit ' + i;
      if (x.mergeAt <= x.exitAt + 2 * X.ramp + 100) problems.push(name + ': merge is too close to the exit');
      if (LEVEL.exits[i].flyovers && !x.flyovers) problems.push(name + ': flyovers are only for a two-way road, at an exit with oncoming traffic');
      if (x.flyovers && curved(x.landingAt, x.exitAt)) problems.push(name + ': expressway must be straight for ' + reach + ' m before it (its flyover)');
      if (x.flyovers && curved(x.mergeAt, x.flyoverAt)) problems.push(name + ': expressway must be straight for ' + reach + ' m after the merge (its flyover)');
      if ((x.flyovers ? x.landingAt : x.exitAt - X.laneZone) < 0) problems.push(name + ': too close to the start line');
      if ((x.flyovers ? x.flyoverAt : x.mergeAt) + X.laneZone > length + LEAD_OUT - 10) problems.push(name + ': merge is too close to the finish');
      const p = {};
      let clear = Infinity, sharpest = 0;
      for (let d = x.length / 4; d <= x.length * 3 / 4; d += 10) {
        x.path(d, 0, p);
        clear = Math.min(clear, mainDistance(p.x, p.z));
      }
      for (let d = X.ramp; d <= x.length - X.ramp; d += 4) sharpest = Math.max(sharpest, Math.abs(nearAngle(x.path(d + 4, 0, p) - x.path(d - 4, 0, p), 0)) / 8);
      if (clear < 30) problems.push(name + ': side road runs into the expressway (it must swing away between exit and merge)');
      if (sharpest > 1 / X.tightest) problems.push(name + ': its bends are too sharp (tighter than ' + X.tightest + ' m round)' +
        (LEVEL.exits[i].segments ? ': its own, or the curve back to the merge from where its segments end' : ': fewer of them, or smaller'));
      if (x.length > 9000) problems.push(name + ': side road is too long (9 km at most)');
      const E = LEVEL.exits[i];
      if (Array.isArray(E.lanes) && E.lanes.some((l, k) => !(l.count >= 1 && l.count <= 4) || (k ? !(l.at > E.lanes[k - 1].at) : l.at > 0) || l.at > x.length)) {
        problems.push(name + ': lanes are [{ at, count }], each further along its side road than the last (the first at 0), 1 to 4 lanes');
      } else if (!Array.isArray(E.lanes) && E.lanes !== undefined && !(E.lanes >= 1 && E.lanes <= 4)) problems.push(name + ': 1 to 4 lanes');
      if (E.oncomingFrom !== undefined && !(E.oncomingFrom >= 0 && E.oncomingFrom < x.length - X.ramp)) problems.push(name + ': oncomingFrom is m along its side road, short of its far ramp');
      if (x.flyovers && x.lanes.some(l => l.count < 2)) problems.push(name + ': an exit with flyovers needs its lane 0 all the way (2 lanes or more)');
      for (const seg of LEVEL.exits[i].segments || []) {
        if (!(seg.length > 0) || seg.length % 1) problems.push(name + ': each segment needs a length, a whole number of metres');
      }
      for (const [what, list] of [['bridge', bridges], ['narrowing', narrows]]) {
        for (const z of list) {
          if (overlaps(z.from, z.to, (x.flyovers ? x.landingAt : x.exitAt - X.laneZone) - 20, x.exitAt + 20) ||
              overlaps(z.from, z.to, x.mergeAt - 20, (x.flyovers ? x.flyoverAt : x.mergeAt) + X.laneZone)) {
            problems.push(name + ': a ' + what + ' at ' + z.from + '-' + z.to + ' overlaps its ramps');
          }
        }
      }
    });
    for (const z of splits) {
      const name = 'split at ' + z.from;
      if (!(z.from < z.to) || z.from < 20 || z.to > length - 20) problems.push(name + ': from before to, clear of the start and the finish');
      else if (ONE_WAY || !LEFT) problems.push(name + ': only a two-way road has two ways to part');
      else if (z.to - z.from < 200) problems.push(name + ': too short (200 m at least)');
      else {
        let sharp = false;
        for (let s = z.from; s <= z.to; s += STEP) if (Math.abs(curveAt(s)) * (apart(s) + HM + LEFT * LW + SH) > 0.6) sharp = true;
        if (sharp) problems.push(name + ': the road bends too sharply there for its two ways to be that far apart');
        for (const b of bridges) if (overlaps(z.from, z.to, b.from, b.to)) problems.push(name + ': a bridge at ' + b.from + '-' + b.to + ' is in it');
        for (const x of exits) if (x.flyovers && overlaps(z.from, z.to, x.landingAt - 20, x.flyoverAt + 20)) problems.push(name + ': an exit with flyovers is in it');
      }
    }
    for (const b of bridges) {
      let sloped = false;
      for (let s = b.from; s <= b.to; s += STEP) if (Math.abs(grade(s)) > 0.002) sloped = true;
      if (sloped) problems.push('bridge at ' + b.from + '-' + b.to + ': bridges must be on level road');
    }
    const spots = [];
    for (const [what, list] of [['pickup', LEVEL.pickups || []], ['obstacle', LEVEL.obstacles || []]]) {
      for (const item of list) {
        const name = what + ' at ' + item.s + (item.road === 'side' ? ' (side road)' : '');
        if (item.road === 'side') {
          const x = exits[item.exit || 0];
          if (!x) { problems.push(name + ': no such exit'); continue; }
          if (item.s < 0 || item.s > x.length) problems.push(name + ': beyond the side road (' + Math.round(x.length) + ' m long)');
          else if (item.lane === 'left' || item.lane === 'right') { /* (on its shoulder) */ }
          else if (!(Number.isInteger(item.lane) && item.lane >= 0 && item.lane <= 3)) problems.push(name + ': side road lanes are 0 to 3 (or left, right: its shoulders)');
          else if (openLane(item.lane, x.side0 + item.s) !== item.lane) problems.push(name + ': the side road has no lane ' + item.lane + ' there (see its exit\'s "lanes"; only lane 1 on its ramps)');
        } else if (item.s < 0 || item.s > length) {
          problems.push(name + ': beyond the expressway');
        } else if (item.lane === 'left' || item.lane === 'right') {
          // (on that shoulder, as on a side road: laneOffset puts it there. It used to fall through to the test
          // below, which knows only numbered lanes, and be reported "merged away")
        } else if (!Number.isInteger(item.lane)) {
          problems.push(name + ': its lane is a number, or left or right (a shoulder)');
        } else if (item.lane < 0 || item.lane >= LANES) {
          problems.push(name + ': no lane ' + item.lane);
        } else if (openLane(item.lane, item.s) !== item.lane) {
          problems.push(name + ': lane ' + item.lane + ' is merged away there');
        }
        const s = place(item), lat = laneOffset(item.lane, s);
        if (spots.some(o => Math.abs(o.s - s) < 8 && Math.abs(o.lat - lat) < 2)) problems.push(name + ': on top of another item');
        spots.push({ s, lat });
      }
    }
    for (const kind of Object.keys(LEVEL.traffic || {})) {
      if (!CONFIG.vehicles[kind]) problems.push('traffic: there is no vehicle called "' + kind + '"');
    }
    const counts = (LEVEL.trafficCount !== undefined ? LEVEL.trafficCount : CONFIG.trafficCount) +
      (LEVEL.oncomingCount !== undefined ? LEVEL.oncomingCount : CONFIG.oncomingCount);
    if (counts > CONFIG.trafficPool) problems.push('traffic: trafficCount + oncomingCount is ' + counts + ', more than the pool of ' + CONFIG.trafficPool);
    for (const t of LEVEL.targets || []) {
      const s = place(t), name = 'target at ' + t.s + (t.road === 'side' ? ' (side road)' : '');
      if (t.road === 'side' ? (!exits[t.exit || 0] || t.s < 0 || t.s > exits[t.exit || 0].length) : (t.s < 0 || t.s > length)) {
        problems.push(name + ': beyond the road');
      } else if (onBridge(s)) {
        problems.push(name + ': inside a bridge\'s structure');
      } else if (tunnel(s) > 0) {
        problems.push(name + ': in a tunnel');
      } else if (isMain(s) && junctions.some(j => s > j.s - 12 && s < j.end + 12)) {
        problems.push(name + ': at a junction');
      }
    }
    for (const text of problems) console.warn('Level "' + levelName(LEVEL) + '": ' + text);
  }

  return {
    length, start: -LEAD_IN, end: length + LEAD_OUT, loop: LOOP, problems,
    apart, laneCount: LANES, leftLanes: LEFT, rightLanes: RIGHT, medianLanes: MID, medianHalf: HM, shoulder: SH, flow: FLOW, mirrored: MIRRORED,
    toWorld, fromWorld, grade, hilly, transfer, along, progress, finished, inBounds, spawnAt, place, isMain,
    laneOffset, openLane, nearestLane, laneRange, assistOffset, flyHeight,
    lanesOn, edge, extraLane, onBridge, icy, sprays, slicks, muddy, gravels, gravelBand, gravelAt, water, waters, foggy, tunnel, bend, onRails, junctions, zoneAt, lo, hi, laneLo, laneHi, shoulderOffset, onShoulder, rampLaneZone, sideOpen, sideWidth, sideLeft, sideOncoming,
    flyPillar, sideDistance, mainDistance, exits,
  };
};

// The loaded level's roads: null until a level is loaded (see Game.load). A live binding,
// so every module that imports Track sees the newly built one.
export let Track = null;
export const buildTrack = () => { Track = createTrack(); };
