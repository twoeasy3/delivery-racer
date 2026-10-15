// A check of the metro (Metro Run, theme `metro`: render/themes/metro.js), headless. The level: hidden, 3.2 to 3.8 km, its zones
// end to end; nearly all of it one lit tunnel, every part of the metro inside it (running tunnels, bores, stations, the
// interchange) and the cuttings and the depot outside; every tunnel zone at least 8.5 m high (the owner: no lit tunnel lower than
// today's tunnel); no shoulder in the tunnel; the chase camera under the ceiling everywhere (and under a bore's arch at the
// furthest the car can be from the middle); the tunnel's roof under the ground (the lid metro.js lays over it), so nothing pokes
// out. The junctions: each in a bore or the interchange (where metro.js draws its cross passages), clear of the zones' ends and of
// the pads; what crosses there is two cable drums slung under a hoist (the owner, 15-Oct: the tiny train was nonsensical), each
// colliding, never stopping the car, and never across the whole road at once. THE RAILWAY on the road's EDGES (the owner: the
// leftmost and rightmost lanes are the tracks): two tracks, each with its own trains (down the left against the player, up the
// right from behind), the three lanes between never in their way, the tracks slow a car on them. The boost pads without handrails
// (Mall Dash's keep theirs). Obstacles: every one the level places is a real obstacle with a box and a cost (the theme's own the
// box and cost of what they stand in for), none on a track, and driven into, each kind of the metro's knocks the car (it
// collides: nothing in the road is decoration). Pickups: on the lanes, cash in rows of two or more.
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
        const blocked = [1, 2, 3].filter(n => j.train.some(o => Math.abs(o.lat - T.laneOffset(n, j.s)) < o.hw + P.hw)).length;
        widest = Math.max(widest, blocked);
      }
      return j.state === 'done';
    });
    check(parked && crossed && j.state === 'done', 'the drums wait beyond the wall, cross when the player comes within ' + TJ.trigger + ' m (after ' + TJ.warn + ' s of beacons and a bell) and go on into the far passage');
    check(widest <= 2, 'at most ' + widest + ' of the three lanes between the tracks blocked by the drums at once: a way past always');
    // driven into one mid-road
    G.start();
    for (const o of g.Collision.obstacles) if (!o.hazard) o.gone = true;
    j.state = 'cross'; j.t = 0;
    const lane2 = T.laneOffset(2, j.s), t0 = (Math.abs(lane2 - j.from)) / TJ.speed;
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
  check(level.lanes === 5 && !level.median && level.railway.tracks === 'edges' && T.railTracks === 2 && T.laneCount === 5,
    'five lanes, the outermost two the tracks ("railway": ' + JSON.stringify(level.railway) + '), no median: three lanes to drive between them');
  check(Math.abs(T.railLat(0, 500) - lane(0, 500)) < 1e-6 && Math.abs(T.railLat(1, 500) - lane(4, 500)) < 1e-6, 'the tracks are lanes 0 and 4 (' + lane(0, 500) + ' and ' + lane(4, 500) + ' m)');
  check(lane(1, 500) - P.hw > T.railLat(0, 500) + BT.hw && lane(3, 500) + P.hw < T.railLat(1, 500) - BT.hw,
    'a car in lane 1 or 3 is clear of a train on the track beside it (' + (lane(1, 500) - P.hw - T.railLat(0, 500) - BT.hw).toFixed(2) + ' m between)');
  check(T.laneRange(1, 500).join() === '1,3', 'traffic (if a level had any) keeps to the lanes between the tracks: ' + T.laneRange(1, 500).join(' to '));
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
  const up = drive(UpTrain, lane(4, 900));
  check(up.ahead <= -(BT.speed - 20) * BT.warning + 1, 'up the right track: the train sets off ' + Math.round(-up.ahead) + ' m behind, ' + BT.warning + ' s away at its ' + BT.speed + ' m/s less the car\'s 20');
  check(up.wrecked, '...a car on the right track as it overtakes is wrecked');
  for (const n of [1, 2, 3]) {
    const a = drive(BulletTrain, lane(n, 900)), b = drive(UpTrain, lane(n, 900));
    check(!a.wrecked && !b.wrecked && a.passed && b.passed && a.gone && b.gone, 'a car in lane ' + n + ' is untouched as each train goes by, and each is gone after');
  }
  check(!drive(BulletTrain, lane(4, 900)).wrecked && !drive(UpTrain, lane(0, 900)).wrecked, 'each train keeps to its own track (a car on the other track untouched)');
  check(!drive(BulletTrain, lane(0, 900), { ghost: true }).wrecked && !drive(UpTrain, lane(4, 900), { ghost: true }).wrecked, 'a ghost on a track is passed through');
  { // the tracks slow a car on them, as Canberra's rails do (by how well it crosses: CONFIG.railCrossing)
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    for (const o of g.Collision.obstacles) o.gone = true;
    BulletTrain.active = UpTrain.active = false;
    const top = (lat) => { Object.assign(P, { s: 700, lat, speed: 0, launching: false, ghost: 0 }); let v = 0; g.run(12, () => { g.drive(1, 0); P.lat = lat; BulletTrain.next = UpTrain.next = Infinity; v = Math.max(v, P.speed); return false; }); return v; };
    const free = top(lane(2, 700)), left = top(lane(0, 700)), right = top(lane(4, 700));
    check(left < free * 0.95 && right < free * 0.95 && T.onRails(700, lane(0, 700), P.hw) && T.onRails(700, lane(4, 700), P.hw) && !T.onRails(700, lane(1, 700), P.hw) && !T.onRails(700, lane(3, 700), P.hw),
      'the tracks slow the car: ' + left.toFixed(1) + ' and ' + right.toFixed(1) + ' m/s on them against ' + free.toFixed(1) + ' in the middle lane; lanes 1 and 3 are off them');
  }
  check(level.railway.every.min >= 10, 'each track\'s trains come every ' + level.railway.every.min + ' to ' + level.railway.every.max + ' s, each announced ' + BT.warning + ' s ahead');
  // ---- the boost pads: flush, no handrails (the owner: "use the boost pads without the mall guardrails")
  check(level.boostPads.every(p => p.rails === false && [1, 2, 3].includes(p.lane)) && !g.Collision.obstacles.some(o => o.kind === 'handrail'), level.boostPads.length + ' boost pads in the lanes between the tracks, no handrails');
  // ---- obstacles: real, with a box and a cost; the theme's own the same as what they stand in for
  const O = g.Collision.obstacles, K = CONFIG.obstacleKinds;
  const placed = O.filter(o => !o.hazard && !o.laneEnd && o.kind !== 'handrail');
  check(placed.length === level.obstacles.length && placed.every(o => K[o.kind] && o.hw > 0 && o.hl > 0 && o.height > 0), placed.length + ' placed obstacles, every one with a cost and a box: ' + [...new Set(placed.map(o => o.kind))].join(', '));
  for (const [plain, own] of Object.entries(theme.obstacles)) {
    const a = O.find(o => o.kind === own);
    check(!!a && JSON.stringify(K[plain]) === JSON.stringify(K[own]), 'the metro\'s ' + plain + ' is a ' + own + ' (' + themedKind('metro', plain) + '), at a ' + plain + '\'s cost');
  }
  const inLanes = placed.filter(o => o.lat + o.hw > T.laneLo(o.s) && o.lat - o.hw < T.laneHi(o.s));
  check(inLanes.length === placed.length, 'every one stands (at least partly) where a car can drive: ' + inLanes.length + ' of ' + placed.length);
  const onTrack = placed.filter(o => [0, 1].some(k => Math.abs(o.lat - T.railLat(k, o.s)) < o.hw + BT.hw));
  check(!onTrack.length, 'none where a train runs (a train and an obstacle never share a lane)' + (onTrack.length ? ': ' + onTrack.map(o => o.kind + ' ' + Math.round(o.s)).join(', ') : ''));
  const shut = placed.filter(o => [1, 2, 3].every(n => placed.some(x => Math.abs(x.s - o.s) < 15 && Math.abs(x.lat - lane(n, x.s)) < x.hw + P.hw)));
  check(!shut.length, 'nowhere are all three lanes between the tracks blocked within 15 m' + (shut.length ? ': ' + shut.map(o => Math.round(o.s)).join(', ') : ''));
  // driven into: each of the metro's kinds knocks the car (it collides) and does not stop it
  const kinds = ['ticketGate', 'scrubber', 'trackLamp', 'railTrolley', 'infoTotem', 'cableReel'];
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
  check(pk.every(q => [0, 1, 2, 3, 4].includes(q.lane)) && pk.filter(q => q.lane === 0 || q.lane === 4).every(q => /^cash/.test(q.type)), pk.length + ' pickups, every one on a lane (' + pk.filter(q => q.lane === 0 || q.lane === 4).length + ' cash on the tracks: the lure)');
  check(rows.length / cash.length >= 0.75, cash.length + ' cash pickups, ' + rows.length + ' of them in rows of two or more');
  const trapped = pk.filter(q => (level.deadEnds || []).some(d => q.lane === d.lane && q.s > d.s - 50 && q.s <= d.s));
  check(!trapped.length, 'no pickup in a dead lane\'s last 50 m' + (trapped.length ? ' (' + trapped.map(q => q.s).join(', ') + ')' : ''));
  const blocked = placed.filter(o => (level.deadEnds || []).some(d => o.s > d.s - (CONFIG.deadEnd.sign) && o.s < d.s + 5 && o.lane !== d.lane && (o.lane === 0 || o.lane === 1)));
  check(!blocked.length, 'no obstacle in the open lane beside a dead lane where the divider holds the car in it' + (blocked.length ? ' (' + blocked.map(o => o.s).join(', ') + ')' : ''));
  // ---- what the shared code must leave alone: Canberra's one track down its median; Mall Dash's pads keep their handrails
  {
    const canberra = g.select('canberra');
    G.load(); BulletTrain.reset(); UpTrain.reset();
    const C = g.track.Track;
    check(canberra.median === 1 && !canberra.railway.tracks && C.railTracks === 1 && C.railLat(0, 500) === 0 && C.onRails(500, 0, P.hw) && !C.onRails(500, C.laneOffset(0, 500), P.hw) && !UpTrain.timed && UpTrain.next === Infinity && BulletTrain.timed,
      'Canberra: its one track down the median as before (no second train)');
    const mall = g.select('mall-dash');
    G.load(); // (loaded, not started: whether the current car may drive it is the tier rule's business, not this check's)
    const rails = g.Collision.obstacles.filter(o => o.kind === 'handrail').length;
    check(mall.boostPads.every(p => p.rails === undefined) && rails > 0, 'Mall Dash: its pads keep their handrails (' + rails + ' sections)');
  }
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
