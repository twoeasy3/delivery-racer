// A check of the tunnel junctions (src/delivery/hazards.js, CONFIG.tunnelJunction), headless, on Mall Dash: the level
// loads with its three junctions inside its tunnel; coming up to one, the beacons go on and the bell rings before the
// train sets out; the train (a tug and two trolleys) crosses the whole road and is off it again; a car driven into
// its path is knocked (damage, speed kept, no stun that stops it) and never busted; a car that waits is untouched;
// a ghost goes through. And a junction outside a tunnel is a level problem.
//   node scripts/.tunneljunction-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Hazards } = await g.load('hazards.js');
  const { CONFIG } = g;
  const P = g.Player, G = g.Game, TJ = CONFIG.tunnelJunction;
  const level = g.select('mall-dash');
  const lane = (n, s) => g.track.Track.laneOffset(n, s);
  const start = (s, n, v, { ghost = false } = {}) => {
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = s;
    P.testGhost = ghost;
    g.drive(1, 0);
  };
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  const said = (text) => g.said.some(line => line.includes(text));
  start(100, 0, 0);
  const T = g.track.Track;
  console.log('Level problems: ' + (T.problems.join(' | ') || 'none'));
  check(!T.problems.length, 'the level loads without problems');
  check(Hazards.tunnelJunctions.length === 3 && Hazards.tunnelJunctions.every(j => T.tunnel(j.s) === 1), 'three junctions, each well inside the tunnel');
  const j = Hazards.tunnelJunctions[0];
  check(j.train.length === 3 && j.train[0].kind === 'tug' && j.train[1].kind === 'trolley', 'a train: a tug and two trolleys');
  check(j.train.every(o => o.lat < T.lo(j.s) || o.lat > T.hi(j.s)), 'parked up its mouth, off the road');
  // ---- coming up to it: the warning, then the crossing, then off the road
  start(j.s - 300, 0, 25);
  let warned = null, crossing = null, onRoad = 0, offAgain = false;
  g.run(20, () => {
    quiet();
    if (j.state === 'warn' && warned === null) warned = j.s - P.s;
    if (j.state === 'cross' && crossing === null) crossing = j.s - P.s;
    if (j.state === 'cross' && j.train.some(o => o.lat > T.lo(j.s) && o.lat < T.hi(j.s))) onRoad++;
    if (j.state === 'done') offAgain = true;
    P.speed = 25; P.s = Math.min(P.s, j.s - 60); // (held short of it, watching)
    return offAgain;
  });
  check(warned !== null && warned <= TJ.trigger && warned > TJ.trigger - 30, 'the beacons go on as the player comes within ' + TJ.trigger + ' m (at ' + Math.round(warned) + ' m)');
  check(said('Side tunnel'), 'the player is told: "' + (g.said.find(l => l.includes('Side tunnel')) || '-') + '"');
  check(crossing !== null && onRoad > 0 && offAgain, 'the train sets out ' + TJ.warn + ' s later, crosses the road (' + onRoad + ' steps on it) and is off it again');
  check(j.train.every(o => o.lat < T.lo(j.s) || o.lat > T.hi(j.s)), 'the whole train ends up off the road on the other side');
  // ---- driving into its path: a knock, not a stop, not a bust
  const into = (ghost) => {
    start(j.s - 120, 1, 22, { ghost });
    const health0 = P.health;
    let hit = false, stopped = false;
    g.run(14, () => { quiet(); P.speed = Math.max(P.speed, 4); g.drive(1, 0); if (j.state === 'cross') { const tug = j.train[0]; if (Math.abs(tug.lat - P.lat) > 1.2) P.lat += Math.sign(tug.lat - P.lat) * 0.3; } if (P.health < health0) hit = true; if (P.speed < 1) stopped = true; return P.s > j.s + 60 || P.busted; });
    return { hit, stopped, busted: P.busted, lost: health0 - P.health, past: P.s > j.s + 60 };
  };
  const r = into(false);
  check(r.hit && !r.busted && !r.stopped && r.past, 'driven into the train: knocked (' + Math.round(r.lost) + ' health lost), not stopped, not busted, and past it');
  const gh = into(true);
  check(!gh.hit && gh.past, 'a ghost goes through untouched');
  // ---- waiting until it has crossed: untouched
  start(j.s - 160, 1, 25);
  const h0 = P.health;
  g.run(20, () => { quiet(); if (j.state !== 'done') { P.speed = 0; P.s = Math.min(P.s, j.s - 40); } else { P.speed = 25; g.drive(1, 0); } return P.s > j.s + 40; });
  check(P.health === h0 && !P.busted, 'waiting for the train to cross, then driving on: untouched');
  // ---- a junction outside a tunnel is a problem the level reports
  g.select({ ...level, id: 'junction-outside', tunnelJunctions: [{ s: 100, side: 'left' }] });
  start(100, 0, 0);
  const T2 = g.track.Track;
  check(T2.problems.some(p => p.includes('tunnel junction')), 'a junction outside the tunnel is a level problem: ' + (T2.problems.find(p => p.includes('tunnel junction')) || '-'));
  g.select('mall-dash');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
