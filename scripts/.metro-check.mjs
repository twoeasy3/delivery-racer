// A check of the metro (Metro Run, theme `metro`: render/themes/metro.js), headless. The level: hidden, 3.2 to 3.8 km, its zones
// end to end; nearly all of it one lit tunnel, every part of the metro inside it (running tunnels, bores, stations, the
// interchange) and the cuttings and the depot outside; every tunnel zone at least 8.5 m high (the owner: no lit tunnel lower than
// today's tunnel); no shoulder in the tunnel; the chase camera under the ceiling everywhere (and under a bore's arch at the
// furthest the car can be from the middle); the tunnel's roof under the ground (the lid metro.js lays over it), so nothing pokes
// out. The junctions: each in a bore or the interchange (where metro.js draws its cross passages; never across the train line),
// clear of the zones' ends and of the pads. Obstacles: every one the level places is a real obstacle with a box and a cost (the
// theme's own the box and cost of what they stand in for), and driven into, each kind of the metro's knocks the car (it
// collides: nothing in the road is decoration). Pickups: on the lanes, cash in rows of two or more, none in a dead end's last
// 50 m. The train line: a span of running tunnels and stations for the passing trains.
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
  // ---- the junctions' train: the Canberra carriages, cut down, at the tug's and the trolleys' boxes and costs (the gimmick's rules unchanged)
  const pieces = g.Collision.obstacles.filter(o => o.hazard && /^metroCar/.test(o.kind)), like = { metroCarFront: 'tug', metroCarMid: 'trolley', metroCarBack: 'trolley' };
  check(pieces.length === 3 * level.tunnelJunctions.length && pieces.every(o => JSON.stringify(CONFIG.obstacleKinds[o.kind]) === JSON.stringify(CONFIG.obstacleKinds[like[o.kind]])),
    'each junction\'s train is three cut-down Canberra carriages, at the tug\'s and the trolleys\' costs (' + [...new Set(pieces.map(o => o.kind))].join(', ') + ')');
  check(pieces.every(o => [o.hw, o.hl].join() === (like[o.kind] === 'tug' ? [0.7, 1.0] : [0.45, 0.6]).join()), '...and at their boxes (tug 1.4 x 2.0 m, trolley 0.9 x 1.2 m)');
  // ---- the train line: spans of running tunnels and stations
  const spans = zones.filter(z => z.scenery === 'running' || z.scenery === 'station');
  check(spans.length >= 2, 'the train line runs beside the road in ' + spans.length + ' zones (' + spans.map(z => z.id).join(', ') + ')');
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
  check(pk.every(q => q.lane === 0 || q.lane === 1), pk.length + ' pickups, every one on a lane');
  check(rows.length / cash.length >= 0.75, cash.length + ' cash pickups, ' + rows.length + ' of them in rows of two or more');
  const trapped = pk.filter(q => (level.deadEnds || []).some(d => q.lane === d.lane && q.s > d.s - 50 && q.s <= d.s));
  check(!trapped.length, 'no pickup in a dead lane\'s last 50 m' + (trapped.length ? ' (' + trapped.map(q => q.s).join(', ') + ')' : ''));
  const blocked = placed.filter(o => (level.deadEnds || []).some(d => o.s > d.s - (CONFIG.deadEnd.sign) && o.s < d.s + 5 && o.lane !== d.lane && (o.lane === 0 || o.lane === 1)));
  check(!blocked.length, 'no obstacle in the open lane beside a dead lane where the divider holds the car in it' + (blocked.length ? ' (' + blocked.map(o => o.s).join(', ') + ')' : ''));
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
