// A check that a car IN THE AIR does not collect a pickup under it (the owner, 17-Oct: "Cars can pick up items while
// airbourne", confirmed as a bug: they must not; CHECKLIST 457). Headless (scripts/modelpatch-load.mjs): Gimmick Road 3's
// ramp over the jam, flown by the Sport at 47 m/s, the game stepped as in play.
//   - a cash pickup put where the car is 3 m or more up: never collected through the flight (the bank unchanged); with the
//     rule as it was (CONFIG.pickupAirReach = Infinity) the same flight collects it
//   - on the ground the same pickup is collected; Pickups.update at Player.air 1.0 m (a little hop) collects, at 1.3 m not
//   - nothing else about the flight changed: its path (s, lat, air, speed every step) the same with and without the pickup
//     under it, and under the old rule as under the new
//   node scripts/.airpickup-check.mjs
import { startModels } from './modelpatch-load.mjs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const session = await startModels();
try {
  const { load } = session;
  const cars = await load('cars.js');
  const levels = await load('levels.js');
  const { Game } = await load('game.js');
  const { Player } = await load('player.js');
  const { CONFIG } = await load('config.js');
  const TR = await load('track.js');
  const { Pickups } = await load('pickups.js');
  const { Progress } = await load('progress.js');
  const { Traffic } = await load('traffic.js');
  Progress.data.cars = cars.CARS.map(c => c.id); Progress.data.maxed = [...Progress.data.cars];
  CONFIG.progression.tiers = false;
  const REACH = CONFIG.pickupAirReach;
  check(REACH > 0.5 && REACH < 2, `CONFIG.pickupAirReach ${REACH} m`);
  // a flight off the jam ramp (its foot at 2400, lane 4); `put`: a pickup placed before it starts
  const fly = (put, { s = 2380, seconds = 3.5 } = {}) => {
    const lv = levels.LEVELS.find(l => l.id === 'gimmick-road-3') || levels.HIDDEN_LEVELS['gimmick-road-3'];
    if (levels.LEVELS.includes(lv)) levels.selectLevel(levels.LEVELS.indexOf(lv)); else levels.selectSpecial(lv);
    Progress.data.car = 'sport';
    Game.start();
    Object.assign(Player, { s, lat: TR.Track.laneOffset(4, s), speed: 47, launching: false });
    Player.testGhost = true;
    Pickups.items.length = 0; // (only the one put here)
    const p = put ? { type: 'cash20', s: put.s, lat: put.lat, taken: false } : null;
    if (p) Pickups.items.push(p);
    const cash0 = Game.cash, rows = [];
    for (let t = 0; t < seconds; t += 1 / 60) {
      Game.update(CONFIG.maxStep); Game.update(CONFIG.maxStep);
      for (const c of Traffic.cars) if (!c.fixed) c.active = false;
      rows.push([Player.s, Player.lat, Player.air, Player.speed]);
      if (p?.taken && p.at === undefined) p.at = Player.air;
    }
    return { rows, p: p && { ...p }, cash: Game.cash - cash0 }; // (a copy: the next Game.start resets the pickups)
  };
  const plain = fly(null);
  const high = plain.rows.findIndex(r => r[2] > 3);
  check(high > 0, `the car flies (${Math.max(...plain.rows.map(r => r[2])).toFixed(1)} m up at most)`);
  const spot = { s: plain.rows[high + 10][0], lat: plain.rows[high + 10][1] }, upThere = plain.rows[high + 10][2];
  const now = fly(spot);
  check(!now.p.taken && now.cash === 0, `a cash pickup under the car ${upThere.toFixed(1)} m up: not collected, the bank unchanged (+$${now.cash})`);
  CONFIG.pickupAirReach = Infinity; // (the rule as it was)
  const was = fly(spot), wasPlain = fly(null);
  CONFIG.pickupAirReach = REACH;
  check(was.p.taken && was.cash === 20, `...and under the old rule the same flight collected it (at ${was.p.at?.toFixed(1)} m up, +$${was.cash})`);
  const same = (a, b) => a.length === b.length && a.every((r, i) => r.every((x, j) => x === b[i][j]));
  check(same(now.rows, plain.rows), `the flight with the pickup under it the same as without, step for step (${plain.rows.length} steps)`);
  check(same(wasPlain.rows, plain.rows), 'the flight under the old rule the same as under the new (nothing else about the air changed)');
  // on the ground: the same pickup before the ramp
  const ground = fly({ s: 2390, lat: TR.Track.laneOffset(4, 2390) }, { s: 2340, seconds: 1.2 });
  check(ground.p.taken && ground.cash === 20 && ground.p.at <= 0.05, `on the ground: collected (+$${ground.cash}, the car ${ground.p.at?.toFixed(2)} m up)`);
  // a little hop and a little more, by Pickups.update itself
  const at = (air) => { Pickups.items.length = 0; const p = { type: 'cash5', s: Player.s, lat: Player.lat, taken: false }; Pickups.items.push(p); Player.active = true; Player.air = air; Pickups.update(); Player.air = 0; return p.taken; };
  check(at(1.0) && !at(1.3) && at(0), 'Pickups.update: collected at 0 and 1.0 m up (a hop), not at 1.3 m');
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (session.fixStack ? session.fixStack(e.stack) : e.stack));
} finally {
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
