// A check of the metro (Metro Run, theme `metro`: render/themes/metro.js), headless. The level: hidden, 3.2 to 3.8 km, its zones
// end to end; nearly all of it one lit tunnel, every part of the metro inside it (running tunnels, bores, stations, the
// interchange) and the cuttings and the depot outside; every tunnel zone at least 8.5 m high (the owner: no lit tunnel lower than
// today's tunnel); no shoulder in the tunnel; the chase camera under the ceiling everywhere (and under a bore's arch at the
// furthest the car can be from the middle); the tunnel's roof under the ground (the lid metro.js lays over it), so nothing pokes
// out. The junctions: each in a bore or the interchange (where metro.js draws its cross passages), clear of the zones' ends and of
// the pads; what crosses there is two cable drums slung under a hoist (the owner, 15-Oct: the tiny train was nonsensical), each
// colliding, never stopping the car, and never across the whole road at once. THE RAILWAY on the road's EDGES (the owner: three
// lanes, the leftmost and rightmost the tracks): two tracks, each with its own trains (down the left against the player, up the
// right from behind), the one road lane between never in their way, the tracks slow a car on them. PILLARS in the road lane (the
// owner: "solid pillars that instakill in the middle road lane that forces drivers to pick a train track"): a wreck as at a dead
// end's wall but for a Ghost; no train sets off while the player is at a group, and never a train on each track near one (by
// measurement, trains due every 1 to 3 s). The boost pads without handrails in the road lane (Mall Dash's keep theirs).
// Obstacles: every one the level places is a real obstacle with a box and a cost, on a TRACK (the road lane is the way round them),
// and driven into, each kind of the metro's knocks the car. Pickups: cash on the tracks, in rows across them or lines along them.
//   node scripts/.metro-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { CONFIG } = g;
  const { THEMES, themedKind } = await g.load('themes.js');
  const { ceilingAt, heightOf, tunnelCamera } = await g.load('render/tunnelshape.js');
  const P = g.Player, G = g.Game;
  const level = g.select('metro-run');
  check(!!g.levels.HIDDEN_LEVELS['metro-run'] && !g.levels.LEVELS.includes(level), 'Metro Run is a hidden level (?hidden=metro-run), not on the menu');
  G.loaded = null; G.evil = false; G.start();
  const T = g.track.Track, theme = THEMES[level.theme];
  check(level.theme === 'metro' && !!theme && theme.tunnel?.lit && theme.tunnel?.shell === false && theme.unmarked && theme.bare, 'its theme is the metro: a lit tunnel the theme draws, unmarked and bare (no lines, no ruts)');
  check(!T.problems.length, 'the level loads without problems' + (T.problems.length ? ': ' + T.problems.join(' | ') : ''));
  const length = T.length;
  check(length >= 3200 && length <= 3800, 'it is ' + length + ' m long (3.2 to 3.8 km)');
  // ---- the zones and the tunnel
  const zones = level.zones.slice().sort((a, b) => a.from - b.from);
  check(zones[0].from === 0 && zones[zones.length - 1].to >= length && zones.every((z, i) => !i || z.from === zones[i - 1].to), zones.length + ' zones, end to end: ' + zones.map(z => z.scenery + ' ' + z.from + '-' + z.to).join(', '));
  const t = level.tunnels[0], inside = ['running', 'bore', 'station', 'interchange'], outside = ['approach', 'exit', 'depot'];
  check(level.tunnels.length === 1 && (t.to - t.from) / length >= 0.75, 'one tunnel, ' + t.from + ' to ' + t.to + ': ' + Math.round((t.to - t.from) / length * 100) + '% of the level');
  check(zones.every(z => inside.includes(z.scenery) ? z.from >= t.from && z.to <= t.to : outside.includes(z.scenery) && (z.to <= t.from || z.from >= t.to)), 'every part of the metro is inside it, the cuttings and the depot outside');
  const heights = theme.tunnel.heights;
  check(inside.every(k => heights[k] >= 8.5), 'every part at least 8.5 m high: ' + inside.map(k => k + ' ' + heights[k]).join(', '));
  let shoulder = 0;
  for (let s = t.from; s <= t.to; s += 2) shoulder = Math.max(shoulder, T.hi(s) - T.laneHi(s), T.laneLo(s) - T.lo(s));
  check(shoulder < 0.01, 'no shoulder anywhere in the tunnel (widest ' + shoulder.toFixed(2) + ' m)');
  // ---- the camera under the ceiling, and under a bore's arch (as metro.js's archTop: SPRING m from the springline to the crown)
  const cam = tunnelCamera(), SPRING = 2.9, kindAt = (s) => zones.find(z => s >= z.from && s < z.to)?.scenery;
  let worst = Infinity, worstAt = 0, archWorst = Infinity, archAt = 0;
  const h = heightOf(t);
  for (let s = t.from; s <= t.to; s += 1) {
    const ceil = ceilingAt(s);
    const camY = Math.min(cam.camHeight, ceil - 1.0); // (scene.js's clamp)
    if (ceil - camY < worst) { worst = ceil - camY; worstAt = s; }
    if (kindAt(s) === 'bore') {
      const L = T.lo(s) - 0.3, R = T.hi(s) + 0.3, mid = (L + R) / 2, half = (R - L) / 2;
      const far = Math.max(Math.abs(T.laneLo(s) + P.hw - mid), Math.abs(T.laneHi(s) - P.hw - mid)); // (the camera follows the car's lat)
      const arch = h(s) - SPRING + SPRING * Math.sqrt(1 - Math.min(1, far / half) ** 2);
      if (arch - camY < archWorst) { archWorst = arch - camY; archAt = s; }
    }
  }
  check(worst >= 1.0, 'the chase camera (' + cam.camHeight + ' m up, ' + cam.camBack + ' m back) is at least 1 m under the ceiling everywhere (least ' + worst.toFixed(2) + ' m, at ' + worstAt + ')');
  check(archWorst >= 1.0, '...and under a bore\'s arch over the furthest the car can be from the middle (least ' + archWorst.toFixed(2) + ' m, at ' + archAt + ')');
  const p = {}, roadY = (s) => { T.toWorld(s, 0, p); return p.y; }, GROUND = roadY(0);
  let roof = -Infinity, roofAt = 0;
  for (let s = t.from; s <= t.to; s += 2) { const top = roadY(s) + h(s) + 0.3 - GROUND; if (top > roof) { roof = top; roofAt = s; } }
  check(roof < -0.2, 'the tunnel\'s roof stays under the ground (the lid over it) everywhere: highest ' + roof.toFixed(2) + ' m below it at ' + roofAt);
  check(roadY(t.from) - GROUND < -8.5 && roadY(t.to) - GROUND < -8.5, 'the portals are deep enough for their openings (road ' + (GROUND - roadY(t.from)).toFixed(1) + ' and ' + (GROUND - roadY(t.to)).toFixed(1) + ' m under the ground)');
  // ---- the junctions
  for (const j of level.tunnelJunctions) {
    const k = kindAt(j.s), z = zones.find(z => j.s >= z.from && j.s < z.to);
    const pads = (level.boostPads || []).filter(b => j.s > b.from - 20 && j.s < b.to + 20);
    check((k === 'bore' || k === 'interchange') && j.s - z.from >= 40 && z.to - j.s >= 40 && !pads.length, 'junction at ' + j.s + ' (' + j.side + '): in ' + (k === 'interchange' ? 'the interchange' : 'a ' + k) + ' (its cross passages; not across the train line), ' + Math.round(Math.min(j.s - z.from, z.to - j.s)) + ' m from the zone\'s ends, clear of the pads');
  }
  // ---- what crosses at a junction: two cable drums under a hoist (themes.js junctionTrain), at the tug's cost, a drum's box
  const H = g.Hazards || (await g.load('hazards.js')).Hazards;
  const drums = g.Collision.obstacles.filter(o => o.hazard && o.kind === 'hoistDrum');
  check(theme.junctionTrain.join() === 'hoistDrum,hoistDrum' && !g.Collision.obstacles.some(o => /^metroCar/.test(o.kind)) && drums.length === 2 * level.tunnelJunctions.length,
    'each junction\'s load is two cable drums slung under a hoist (' + drums.length + ' in all), no little train');
  check(drums.every(o => JSON.stringify(CONFIG.obstacleKinds.hoistDrum) === JSON.stringify(CONFIG.obstacleKinds.tug) && o.hw === 0.95 && o.hl === 0.6 && o.height >= 2),
    '...each at the tug\'s cost (' + CONFIG.obstacleKinds.hoistDrum.damage + ' damage) and a drum\'s box (1.9 m across the road, 1.2 along it, ' + drums[0]?.height + ' m tall)');
  { // the crossing: parked beyond the wall, then across; never the whole road at once; a car driven into a drum is knocked, not stopped
    const TJ = CONFIG.tunnelJunction, j = H.tunnelJunctions[0];
    G.start();
    for (const o of g.Collision.obstacles) if (!o.hazard) o.gone = true;
    const parked = j.train.every(o => (j.side > 0 ? o.lat > T.hi(j.s) : o.lat < T.lo(j.s)));
    Object.assign(P, { s: j.s - TJ.trigger + 5, lat: T.laneOffset(2, j.s), speed: 0, launching: false, ghost: 30 });
    let widest = 0, crossed = false;
    g.run(14, () => {
      P.speed = 0; P.s = j.s - TJ.trigger + 5; P.ghost = 30;
      if (j.state === 'cross') {
        crossed = true;
        const blocked = [0, 1, 2].filter(n => j.train.some(o => Math.abs(o.lat - T.laneOffset(n, j.s)) < o.hw + P.hw)).length;
        widest = Math.max(widest, blocked);
      }
      return j.state === 'done';
    });
    check(parked && crossed && j.state === 'done', 'the drums wait beyond the wall, cross when the player comes within ' + TJ.trigger + ' m (after ' + TJ.warn + ' s of beacons and a bell) and go on into the far passage');
    check(widest <= 2, 'at most ' + widest + ' of the three lanes (track, road, track) blocked by the drums at once: a way past always (or wait: they are across in ' + ((T.hi(j.s) - T.lo(j.s) + 6 + j.spacing) / TJ.speed).toFixed(1) + ' s)');
    // driven into one mid-road
    G.start();
    for (const o of g.Collision.obstacles) if (!o.hazard) o.gone = true;
    j.state = 'cross'; j.t = 0;
    const lane2 = T.laneOffset(1, j.s), t0 = (Math.abs(lane2 - j.from)) / TJ.speed;
    j.t = t0;
    Object.assign(P, { s: j.s - 12, lat: lane2, speed: 15, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
    P.testGhost = false;
    const h0 = P.health;
    let low = Infinity;
    g.run(3, () => { g.drive(1, 0); P.lat = lane2; low = Math.min(low, P.speed); return P.s > j.s + 8; });
    check(P.health < h0 && P.speed > 1 && P.active, 'a car driven into a crossing drum is knocked (' + Math.round(h0 - P.health) + ' health) and goes on (' + P.speed.toFixed(1) + ' m/s): never a stop');
  }
  // ---- THE RAILWAY ON THE EDGES ("railway": { tracks: 'edges', every }): the road's outermost lanes are the two tracks; down the left
  // one the bullet train comes against the player (BulletTrain), up the right one it overtakes from behind (UpTrain); each announced
  // CONFIG.bulletTrain.warning s ahead, wrecking what it touches. Canberra keeps its one track down the median
  const { BulletTrain, UpTrain } = await g.load('bullettrain.js');
  const BT = CONFIG.bulletTrain;
  const lane = (n, s) => T.laneOffset(n, s);
  check(level.lanes === 3 && !level.median && level.railway.tracks === 'edges' && T.railTracks === 2 && T.laneCount === 3,
    'three lanes, the outer two the tracks ("railway": ' + JSON.stringify(level.railway) + '), no median: one road lane between them');
  check(Math.abs(T.railLat(0, 500) - lane(0, 500)) < 1e-6 && Math.abs(T.railLat(1, 500) - lane(2, 500)) < 1e-6, 'the tracks are lanes 0 and 2 (' + lane(0, 500) + ' and ' + lane(2, 500) + ' m), the road lane 1 (' + lane(1, 500) + ')');
  check(lane(1, 500) - P.hw > T.railLat(0, 500) + BT.hw && lane(1, 500) + P.hw < T.railLat(1, 500) - BT.hw,
    'a car in the road lane is clear of a train on either track (' + (lane(1, 500) - P.hw - T.railLat(0, 500) - BT.hw).toFixed(2) + ' and ' + (T.railLat(1, 500) - BT.hw - lane(1, 500) - P.hw).toFixed(2) + ' m between)');
  check(T.laneRange(1, 500).join() === '1,1', 'traffic (if a level had any) keeps to the road lane: ' + T.laneRange(1, 500).join(' to '));
  check(BulletTrain.timed && UpTrain.timed && BulletTrain.next < Infinity && UpTrain.next < Infinity, 'both tracks have their trains, each timed on its own (next in ' + BulletTrain.next.toFixed(1) + ' and ' + UpTrain.next.toFixed(1) + ' s)');
  const drive = (train, lat, opts = {}) => { // the player at lat, a train set off on its track; what became of the car
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    for (const o of g.Collision.obstacles) o.gone = true;
    Object.assign(P, { s: 900, lat, speed: 20, launching: false, shield: 0, ghost: opts.ghost ? 30 : 0, tank: 0, armour: 0 });
    P.testGhost = false;
    BulletTrain.active = UpTrain.active = false; BulletTrain.next = UpTrain.next = Infinity;
    train.start(true);
    const ahead = train.s - P.s;
    let passed = false;
    g.run(10, () => { g.drive(1, 0); P.lat = lat; if (opts.ghost) P.ghost = 30; BulletTrain.next = UpTrain.next = Infinity; passed ||= train.passed; return !train.active || P.health <= 0; });
    return { wrecked: P.health <= 0 || !P.active, ahead, passed, gone: !train.active };
  };
  const down = drive(BulletTrain, lane(0, 900));
  check(down.ahead >= (BT.speed + 20) * BT.warning - 1, 'down the left track: the train sets off ' + Math.round(down.ahead) + ' m up the road, ' + BT.warning + ' s away at its ' + BT.speed + ' m/s and the car\'s 20');
  check(down.wrecked, '...a car on the left track as it comes is wrecked');
  const up = drive(UpTrain, lane(2, 900));
  check(up.ahead <= -(BT.speed - 20) * BT.warning + 1, 'up the right track: the train sets off ' + Math.round(-up.ahead) + ' m behind, ' + BT.warning + ' s away at its ' + BT.speed + ' m/s less the car\'s 20');
  check(up.wrecked, '...a car on the right track as it overtakes is wrecked');
  for (const n of [1]) {
    const a = drive(BulletTrain, lane(n, 900)), b = drive(UpTrain, lane(n, 900));
    check(!a.wrecked && !b.wrecked && a.passed && b.passed && a.gone && b.gone, 'a car in lane ' + n + ' is untouched as each train goes by, and each is gone after');
  }
  check(!drive(BulletTrain, lane(2, 900)).wrecked && !drive(UpTrain, lane(0, 900)).wrecked, 'each train keeps to its own track (a car on the other track untouched)');
  { // the 'behind' marker (render/hud.js syncBehind reads UpTrain.behind()): on exactly while the overtaking train is live behind
    // the player, on the right track's side; off once it has passed; never for the train coming the other way
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s: 900, lat: lane(1, 900), speed: 20, launching: false, ghost: 0, shield: 0 });
    BulletTrain.active = UpTrain.active = false; BulletTrain.next = UpTrain.next = Infinity;
    UpTrain.start(true); BulletTrain.start(true);
    let wrong = 0, on = 0, first = 0, side = true, downMarked = false;
    g.run(10, () => {
      BulletTrain.next = UpTrain.next = Infinity; P.lat = lane(1, P.s);
      const b = UpTrain.behind(), live = UpTrain.active && !UpTrain.passed;
      if (!!b !== live) wrong++;
      if (b) { on++; first ||= b.gap; side &&= b.lat > P.lat && Math.abs(b.lat - T.railLat(1, P.s)) < 1e-6; }
      if (BulletTrain.behind()) downMarked = true;
      return !UpTrain.active && !BulletTrain.active;
    });
    check(!wrong && on > 0 && side && !downMarked, 'the HUD\'s \'behind\' marker for the overtaking train: on from ' + Math.round(first) + ' m behind until it passes (' + on + ' steps), on the right track\'s side, off after; none for the oncoming train');
  }
  check(!drive(BulletTrain, lane(0, 900), { ghost: true }).wrecked && !drive(UpTrain, lane(2, 900), { ghost: true }).wrecked, 'a ghost on a track is passed through');
  { // the tracks slow a car on them, as Canberra's rails do (by how well it crosses: CONFIG.railCrossing)
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    for (const o of g.Collision.obstacles) o.gone = true;
    BulletTrain.active = UpTrain.active = false;
    const top = (lat) => { Object.assign(P, { s: 700, lat, speed: 0, launching: false, ghost: 0 }); let v = 0; g.run(12, () => { g.drive(1, 0); P.lat = lat; BulletTrain.next = UpTrain.next = Infinity; v = Math.max(v, P.speed); return false; }); return v; };
    const free = top(lane(1, 700)), left = top(lane(0, 700)), right = top(lane(2, 700));
    check(left < free * 0.95 && right < free * 0.95 && T.onRails(700, lane(0, 700), P.hw) && T.onRails(700, lane(2, 700), P.hw) && !T.onRails(700, lane(1, 700), P.hw),
      'the tracks slow the car: ' + left.toFixed(1) + ' and ' + right.toFixed(1) + ' m/s on them against ' + free.toFixed(1) + ' in the road lane, which is off them');
  }
  check(level.railway.every.min >= 10, 'each track\'s trains come every ' + level.railway.every.min + ' to ' + level.railway.every.max + ' s, each announced ' + BT.warning + ' s ahead');
  // ---- the boost pads: flush, no handrails (the owner: "use the boost pads without the mall guardrails")
  check(level.boostPads.every(p => p.rails === false && p.lane === 1) && !g.Collision.obstacles.some(o => o.kind === 'handrail'), level.boostPads.length + ' boost pads in the road lane, no handrails');
  // ---- PILLARS in the road lane (lanegimmicks.js "pillars"): solid columns, a wreck as at a dead end's wall but for a Ghost
  const { LaneGimmicks } = await g.load('lanegimmicks.js');
  const groups = LaneGimmicks.groups, PC = CONFIG.pillar, pillars = g.Collision.obstacles.filter(o => o.kind === 'pillar');
  check(groups.length >= 5 && groups.every(q => q.lane === 1) && pillars.length === groups.length * PC.count && pillars.every(o => o.laneEnd === 'pillar' && o.height >= 8),
    groups.length + ' groups of ' + PC.count + ' pillars, ' + PC.gap + ' m apart, in the road lane, up to the ceiling (' + pillars.length + ' in all)');
  check(groups.every(q => ['running', 'bore'].includes(kindAt(q.from)) && kindAt(q.to) === kindAt(q.from) && heights[kindAt(q.from)] === 8.5),
    '...each in a running tunnel or a bore, whose ceiling (8.5 m) the pillars meet: ' + groups.map(q => Math.round(q.from) + ' ' + kindAt(q.from)).join(', '));
  check(groups.every(q => !level.tunnelJunctions.some(j => j.s > q.from - 60 && j.s < q.to + 60) && !level.boostPads.some(b => b.to > q.from - 60 && b.from < q.to + 60)) &&
    groups.every((q, i) => !i || q.from - PC.warn > groups[i - 1].to), '...60 m or more from a junction or a pad, and each group\'s warning after the last pillar of the one before');
  { // the wreck: whatever protects the car but the Ghost; the lane beside (a track) is the way past
    const hitPillar = (opts = {}) => {
      G.start();
      for (const car of g.Traffic.cars) car.active = false;
      BulletTrain.active = UpTrain.active = false; BulletTrain.next = UpTrain.next = Infinity;
      const q = groups[0], lat = opts.lat ?? lane(1, q.from);
      Object.assign(P, { s: q.from - 30, lat, speed: 20, launching: false, shield: opts.shield ? 5 : 0, ghost: opts.ghost ? 30 : 0, tank: opts.tank ? 30 : 0, armour: opts.armour ? 600 : 0 });
      P.testGhost = false;
      let wrecked = false;
      g.run(4, () => { g.drive(1, 0); P.lat = lat; BulletTrain.next = UpTrain.next = Infinity; if (P.health <= 0 || !P.active) wrecked = true; return wrecked || P.s > q.to + 10; });
      return wrecked;
    };
    check(hitPillar(), 'a car driven into a pillar is wrecked outright (the dead end\'s wall\'s way: Collision.hitObstacles, laneEnd \'pillar\')');
    check(hitPillar({ tank: true }) && hitPillar({ armour: true }), '...a tank, armour: wrecked all the same (solid structure, as a wall)');
    check(!hitPillar({ shield: true }), '...a fresh drop\'s respawn shield takes the car through it (a pillar only: a dead end\'s wall still wrecks it)');
    check(!hitPillar({ ghost: true }), '...a Ghost passes through (there is road behind it, as behind a shutter)');
    check(!hitPillar({ lat: lane(0, groups[0].from) }) && !hitPillar({ lat: lane(2, groups[0].from) }), '...a car on either track beside them passes untouched (no train about)');
    check(pillars.every(o => !o.gone), 'the pillars still stand after all that (never knocked down)');
  }
  { // THE DROP after a pillar wreck (the owner: "The respawn invulnerability on the Metro does not prevent instant wreckage from the
    // same pillar. The Heli should respawn the player on a clear track."): for every column of every group, driven into it, wrecked,
    // the helicopter's delivery waited for, then driven on flat out: where the new car lands, its shield, a second wreck, a train
    const rows = [], bad = [];
    for (const forced of [false, true]) for (const v of [15, 35, 60]) for (const q of groups) for (let k = 0; k < PC.count; k++) {
      const col = q.from + k * PC.gap;
      G.start();
      for (const car of g.Traffic.cars) car.active = false;
      for (const o of g.Collision.obstacles) if (o.kind !== 'pillar') o.gone = true;
      BulletTrain.active = UpTrain.active = false;
      Object.assign(P, { s: col - 8 - v * 0.05, lat: lane(1, col), speed: v, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
      P.testGhost = false;
      let phase = 0, drop = null, wrecks = 0, trainNear = false, after = 0;
      g.run(16, (t) => {
        if (forced) BulletTrain.next = UpTrain.next = 0; else BulletTrain.next = UpTrain.next = Infinity; // (forced: both tracks' trains due all the time)
        if (phase === 0) { g.drive(1, 0); P.lat = lane(1, P.s); if (!P.active || P.health <= 0) { phase = 1; wrecks++; } return false; }
        if (phase === 1) { if (P.active) { phase = 2; after = t; drop = { s: P.s, lat: P.lat, lane: T.nearestLane(P.lat, P.s), shield: P.shield, busy: [BulletTrain, UpTrain].some((tr, j) => tr.active && Math.abs(T.railLat(j, P.s) - P.lat) < 1) }; } return false; }
        g.drive(1, 0); P.lat = drop.lat - lane(drop.lane, drop.s) + lane(drop.lane, P.s); // (kept on its track, flat out)
        for (const [j, tr] of [BulletTrain, UpTrain].entries()) if (tr.active && Math.abs(T.railLat(j, P.s) - P.lat) < 1 && Math.abs(tr.s - P.s) < 300) trainNear = true;
        if (!P.active || P.health <= 0) { wrecks++; return true; }
        return P.s > q.to + 40 && t - after > 3;
      });
      const among = drop && drop.s > q.from - PC.clear + 0.5 && drop.s < q.to + PC.clear - 0.5;
      const ok = drop && wrecks === 1 && (drop.lane === 0 || drop.lane === 2) && !among && drop.shield > 0 && !drop.busy;
      rows.push(drop ? drop.s - col : NaN);
      if (!ok) bad.push((forced ? 'trains due ' : '') + v + ' m/s, group ' + q.from + ' column ' + k + ': ' + (drop ? 'set down at ' + drop.s.toFixed(1) + ' lane ' + drop.lane : 'never set down') + ', ' + wrecks + ' wrecks' + (trainNear ? ', a train near' : ''));
    }
    check(!bad.length, 'wrecked at each of the ' + groups.length * PC.count + ' pillars (at 15, 35 and 60 m/s, with and without trains due on both tracks: ' + rows.length + ' runs): set down on a clear TRACK (lane 0 or 2), ' + PC.clear +
      ' m clear of the group (behind or past it, the nearer: ' + Math.min(...rows).toFixed(0) + ' to ' + Math.max(...rows).toFixed(0) + ' m from the column), shielded, never on a train, and driven on past the group with no second wreck' + (bad.length ? ': ' + bad.slice(0, 4).join(' | ') : ''));
  }
  { // THE COUNTERPLAY GUARANTEE: past every group of pillars at most one track has a train on it, and no train sets off from
    // CONFIG.pillar.warn m before a group to its last pillar. Measured: the whole level driven at 15 to 60 m/s with trains due every
    // 1 to 3 s on BOTH tracks (far more often than the level's), seeded runs
    const every = level.railway.every;
    level.railway.every = { min: 1, max: 3 };
    let worst = 0, startedIn = 0, steps = 0, trainsRun = 0, nearBoth = 0;
    try {
      for (const v of [15, 25, 35, 45, 60]) {
        G.start();
        for (const car of g.Traffic.cars) car.active = false;
        for (const o of g.Collision.obstacles) if (o.kind !== 'pillar') o.gone = true;
        Object.assign(P, { s: 5, lat: lane(1, 5), speed: v, launching: false, ghost: 0, shield: 0 });
        P.testGhost = true;
        BulletTrain.reset(); UpTrain.reset();
        const was = [false, false];
        g.run(3600 / v, () => {
          P.speed = v; P.lat = lane(1, P.s);
          const trains = [BulletTrain, UpTrain];
          trains.forEach((tr, k) => { if (tr.active && !was[k]) { trainsRun++; if (groups.some(q => P.s >= q.from - PC.warn + 1 && P.s <= q.to)) startedIn++; /* (+1: the step it set off in) */ } was[k] = tr.active; });
          const at = groups.find(q => P.s >= q.from - 20 && P.s <= q.to + 1); // (from just before the first pillar to the last)
          if (at) { steps++; const n = trains.filter(tr => tr.active).length; worst = Math.max(worst, n); if (n > 1) nearBoth++; }
          return P.s > g.track.Track.length - 20;
        });
      }
    } finally { level.railway.every = every; P.testGhost = false; }
    check(trainsRun > 60 && worst <= 1 && !nearBoth, 'past the pillars at most ONE train is about (' + trainsRun + ' trains in five runs at 15 to 60 m/s, due every 1 to 3 s; ' + steps + ' steps at the pillars, most at once ' + worst + '): a track is always clear');
    check(!startedIn, '...and none set off from ' + PC.warn + ' m before a group to its last pillar (' + startedIn + '): the player knows which track is clear before choosing');
  }
  { // ---- THE CHASE CAMERA (render/scene.js) where the car can be: in the road lane, on either track. Its place as scene.js puts it:
    // camBack m back at the car's lat, kept within the theme's camKeep of the lanes' middle and CAM_PILLAR (2 m) off a pillar's
    // middle, camHeight up (under the ceiling). How near it comes to a wall, a pillar, a train's roof, a platform; the near plane 0.5
    const keep = cam.camKeep, back = cam.camBack, pill = pillars.map(o => [o.s, o.lat]);
    let wall = Infinity, wallAt = 0, pillar = Infinity, roof = Infinity;
    for (let s = t.from + back + 5; s <= t.to; s += 1) {
      const cs = s - back, mid = (T.laneLo(cs) + T.laneHi(cs)) / 2, ceil = ceilingAt(cs), y = Math.min(cam.camHeight, ceil - 1.0);
      for (const n of [0, 1, 2]) {
        let lat = Math.max(mid - keep, Math.min(mid + keep, lane(n, cs)));
        for (const [ps, pl] of pill) if (Math.abs(cs - ps) <= 2 && Math.abs(lat - pl) < 2) lat = pl + (lane(n, cs) < pl ? -2 : 2);
        const L = T.lo(cs) - 0.3, R = T.hi(cs) + 0.3, d = Math.min(lat - L, R - lat);
        if (d < wall) { wall = d; wallAt = cs; }
        for (const [ps, pl] of pill) if (Math.abs(cs - ps) <= 0.7) pillar = Math.min(pillar, Math.abs(lat - pl) - 0.7);
        roof = Math.min(roof, y - BT.height);
      }
    }
    check(keep === 2 && wall > 2 && pillar >= 0.5 && roof >= 1.0, 'the chase camera (' + back + ' m back, ' + cam.camHeight + ' m up, kept within ' + keep + ' m of the lanes\' middle in the metro only): ' +
      wall.toFixed(2) + ' m from a wall at least (at ' + wallAt + '), ' + pillar.toFixed(2) + ' m off a pillar\'s face passing it, ' + roof.toFixed(2) + ' m over a train\'s roof; never over a platform (they are behind the walls)');
  }
  // ---- obstacles: real, with a box and a cost; the theme's own the same as what they stand in for
  const O = g.Collision.obstacles, K = CONFIG.obstacleKinds;
  const placed = O.filter(o => !o.hazard && !o.laneEnd && o.kind !== 'handrail');
  check(placed.length === level.obstacles.length && placed.every(o => K[o.kind] && o.hw > 0 && o.hl > 0 && o.height > 0), placed.length + ' placed obstacles, every one with a cost and a box: ' + [...new Set(placed.map(o => o.kind))].join(', '));
  for (const [plain, own] of Object.entries(theme.obstacles)) {
    check(K[plain].damage === K[own].damage && K[plain].speedKept === K[own].speedKept, 'the metro\'s ' + plain + ' is a ' + own + ' (' + themedKind('metro', plain) + '), at a ' + plain + '\'s cost');
  }
  const inLanes = placed.filter(o => o.lat + o.hw > T.laneLo(o.s) && o.lat - o.hw < T.laneHi(o.s));
  check(inLanes.length === placed.length, 'every one stands (at least partly) where a car can drive: ' + inLanes.length + ' of ' + placed.length);
  const offTrack = level.obstacles.filter(o => o.lane !== 0 && o.lane !== 2), byPillars = level.obstacles.filter(o => groups.some(q => o.s > q.from - 80 && o.s < q.to + 80));
  const both = level.obstacles.filter(o => level.obstacles.some(x => x !== o && x.lane !== o.lane && Math.abs(x.s - o.s) < 30));
  check(!offTrack.length && !byPillars.length && !both.length, 'every one on a TRACK (the road lane beside is the way round it), none within 80 m of pillars (where the tracks are the way past), never one on each track within 30 m');
  // driven into: each of the metro's kinds knocks the car (it collides) and does not stop it
  const kinds = [...new Set(placed.map(o => o.kind))];
  // every one on a track is TRAIN-PROOF (the owner: "look at the train barriers in Canberra"): low and narrow enough to sit inside a
  // passing train, which leaves it standing (bullettrain.js, both trains: one update); the railBarrier's box for the track barrier
  check(kinds.every(k => K[k].trainProof) && placed.every(o => o.hw <= BT.hw && o.height < BT.height) && JSON.stringify(g.Collision.size.trackBarrier) === JSON.stringify(g.Collision.size.railBarrier) &&
    JSON.stringify(K.trackBarrier) === JSON.stringify(K.railBarrier), 'every obstacle on the tracks is train-proof and fits inside a train (' + kinds.join(', ') + '; the track barrier at Canberra\'s rail barrier\'s box and cost)');
  for (const train of [BulletTrain, UpTrain]) { // a train down (or up) its track over every obstacle on it, each left standing
    const k = train.up ? 1 : 0, on = placed.filter(o => Math.abs(o.lat - T.railLat(k, o.s)) < 0.5);
    let standing = true, passedOver = 0;
    for (const o of on) {
      G.start();
      for (const car of g.Traffic.cars) car.active = false;
      Object.assign(P, { s: o.s - (train.up ? -20 : 20), lat: lane(1, o.s), speed: 0, launching: false, ghost: 0 });
      BulletTrain.active = UpTrain.active = false; BulletTrain.next = UpTrain.next = Infinity;
      train.start(true);
      let over = false;
      g.run(8, () => { P.speed = 0; BulletTrain.next = UpTrain.next = Infinity; for (let i = 0; i < BT.cars; i++) { const c = train.carriage(i, {}); if (Math.abs(c.s - o.s) < BT.carLength / 2 && Math.abs(c.lat - o.lat) < 1) over = true; } return !train.active; });
      const live = g.Collision.obstacles.find(x => x.s === o.s && x.lat === o.lat);
      if (over) passedOver++;
      if (!live || live.gone) standing = false;
    }
    check(on.length > 0 && passedOver === on.length && standing, (train.up ? 'the overtaking train (right track)' : 'the oncoming train (left track)') + ' goes over all ' + on.length + ' obstacles on its track and leaves every one standing');
  }
  for (const kind of kinds) {
    const o = placed.find(o => o.kind === kind);
    if (!o) { check(false, 'a ' + kind + ' on the level'); continue; }
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s: o.s - 25, lat: o.lat, speed: 20, launching: false, shield: 0, ghost: 0, tank: 0, armour: 0 });
    P.testGhost = false;
    const h0 = P.health, v0 = 20;
    let low = Infinity;
    g.run(4, () => { g.drive(1, 0); P.lat = o.lat; low = Math.min(low, P.speed); return P.s > o.s + 10; });
    check((P.health < h0 || o.gone || low < v0 - 0.5) && P.speed > 1 && !P.busted, 'driven into, a ' + kind + ' collides: ' + Math.round(h0 - P.health) + ' health, ' + (o.gone ? 'blown away' : 'stands') + ', the car still going (' + P.speed.toFixed(1) + ' m/s)');
  }
  // ---- pickups: on the lanes, cash in rows, none in a dead lane's last 50 m
  const pk = level.pickups, cash = pk.filter(q => /^cash/.test(q.type));
  const rows = cash.filter(q => cash.filter(r => r.s === q.s).length >= 2);
  check(pk.every(q => [0, 1, 2].includes(q.lane)) && pk.filter(q => q.lane !== 1).every(q => /^cash/.test(q.type)), pk.length + ' pickups, every one on a lane; ' + pk.filter(q => q.lane !== 1).length + ' cash on the tracks (the lure)');
  const lines = cash.filter(q => cash.filter(r => r.lane === q.lane && Math.abs(r.s - q.s) <= 20).length >= 3);
  const grouped = cash.filter(q => rows.includes(q) || lines.includes(q));
  check(grouped.length / cash.length >= 0.75, cash.length + ' cash pickups, ' + grouped.length + ' of them in rows across the two tracks (' + rows.length + ') or lines of three along one (' + lines.length + ')');
  const inPillars = pk.filter(q => q.lane === 1 && groups.some(x => q.s > x.from - 12 && q.s < x.to + 12));
  check(!inPillars.length, 'no pickup in the road lane among the pillars');
  check(!pk.some(q => q.type === 'mystery'), 'no mystery pickup (one can call the bullet train down the road lane: with pillars ahead, no way out)');
  // ---- what the shared code must leave alone: Canberra's one track down its median; Mall Dash's pads keep their handrails
  {
    const canberra = g.select('canberra');
    G.load(); BulletTrain.reset(); UpTrain.reset();
    const C = g.track.Track;
    check(canberra.median === 1 && !canberra.railway.tracks && C.railTracks === 1 && C.railLat(0, 500) === 0 && C.onRails(500, 0, P.hw) && !C.onRails(500, C.laneOffset(0, 500), P.hw) && !UpTrain.timed && UpTrain.next === Infinity && BulletTrain.timed,
      'Canberra: its one track down the median as before (no second train)');
    // (Mall Dash's own travelators were taken out, the owner 17-Oct: its three, put back on a copy of it, rails: true)
    const pads = [{ from: 200, to: 280, lane: 0, rails: true }, { from: 1850, to: 1930, lane: 0, rails: true }, { from: 2580, to: 2660, lane: 0, rails: true }];
    const mall = g.select({ ...g.levels.HIDDEN_LEVELS['mall-dash'], id: 'mall-pads', boostPads: pads });
    G.load(); // (loaded, not started: whether the current car may drive it is the tier rule's business, not this check's)
    const rails = g.Collision.obstacles.filter(o => o.kind === 'handrail').length;
    check(mall.boostPads.every(p => p.rails === true) && rails === 144, 'Mall Dash with pads: they keep their handrails (rails: true; ' + rails + ' sections, 144 expected)'); // (handrails are off by default since 16-Oct)
  }
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
