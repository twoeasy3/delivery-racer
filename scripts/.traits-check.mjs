// A check of the cars' traits (src/delivery/cars.js: trait), headless: each against a car without it.
//   node scripts/.traits-check.mjs
import { boot } from './delivery-headless.mjs';

const ALL = ['commuter', 'sport', 'mini', 'rally', 'towtruck', 'sixbysix', 'pickup', 'taxi'];
const g = await boot({ cars: ALL, ownAll: true, tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Wreckage } = await g.load('wreckage.js');
  const P = g.Player, G = g.Game;
  const quiet = () => { for (const car of g.Traffic.cars) car.active = false; };
  // (the test levels are driven in a car of their own: here, in the car being tried)
  const own = (id) => ({ ...g.levels.HIDDEN_LEVELS[id], car: undefined });
  const start = (level, car, s, lane, v) => {
    g.select(level);
    g.cars.selectCar(car);
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    G.start();
    quiet();
    Object.assign(P, { s, lat: g.track.Track.laneOffset(lane, s), speed: v, launching: false, shield: 0 });
    g.drive(1, 0);
  };
  const said = (text) => g.said.some(line => line.includes(text));

  // ---- the Rally Car and mud (Quarry Run has mud)
  const quarry = g.levels.LEVELS.find(l => l.id === 'quarry-run'), mud = quarry.mud[0];
  const through = (car) => {
    start('quarry-run', car, mud.from + 5, 1, 0);
    let top = 0;
    g.run(8, () => { quiet(); P.health = P.maxHealth; top = Math.max(top, P.speed); return P.s > mud.to - 5; });
    return top / g.cars.CAR.maxSpeed;
  };
  const rally = through('rally'), taxi = through('taxi');
  check(rally > 0.97 && taxi < 0.9, `Rally Car: flat out in mud it reaches ${Math.round(rally * 100)}% of its top speed (a Taxi: ${Math.round(taxi * 100)}%)`);

  // ---- the 6x6 and rockfall (Gimmick Road has a rockfall, 3320 - 3650)
  const rocks = (car) => {
    start(own('gimmick-road'), car, 3300, 1, 25);
    let hit = 0, least = 1;
    g.run(25, () => {
      quiet();
      const rock = g.Collision.obstacles.find(o => o.kind === 'rock' && !o.gone && o.h === 0 && o.s > P.s && o.s - P.s < 30);
      if (rock) P.lat = rock.lat; // (straight at every rock that has landed)
      hit = g.Collision.obstacles.filter(o => o.kind === 'rock' && o.gone).length;
      least = Math.min(least, P.health / P.maxHealth);
      return P.s > 3680 || G.wrecks > 0;
    });
    return { hit, health: G.wrecks ? 0 : least };
  };
  const six = rocks('sixbysix'), pick = rocks('pickup');
  check(six.hit > 0 && six.health === 1 && pick.health < 1, `6x6: ran over ${six.hit} rocks at no cost (a Pick-Up, over ${pick.hit}: down to ${Math.round(pick.health * 100)}% health)`);

  // ---- the Tow Truck and wreckage (shelved trait) (Gimmick Road 2's road train, at 5050 across lanes 4 and 5)
  const wreck = (car) => {
    start(own('gimmick-road-2'), car, 4900, 5, 25);
    g.run(15, () => { quiet(); return P.s > 5120 || G.wrecks > 0; });
    return { wrecks: G.wrecks, cleared: !!Wreckage.list[0].cleared, blocked: Wreckage.blocked(5, 5050) };
  };
  // (the 'tow' trait is shelved: the Tow Truck is wrecked by it like any car, and nothing is cleared)
  const tow = wreck('towtruck'), other = wreck('taxi');
  check(tow.wrecks === 1 && !tow.cleared && other.wrecks === 1 && !other.cleared,
    `Tow Truck: wrecked by the jackknifed road train like a Taxi, nothing cleared (wrecks ${tow.wrecks}; a Taxi: wrecks ${other.wrecks})`);

  // ---- the Mini and a scrape down a car's side
  const scrape = (car) => {
    start('expressway', car, 400, 3, 20);
    const t = g.Traffic.cars[0];
    g.Traffic.reset();
    quiet();
    Object.assign(t, { active: true, dir: 1, s: 400, lane: 2, lat: g.track.Track.laneOffset(2, 400), vs: 20, baseSpeed: 20, health: 500, maxHealth: 500, kind: 'bus', hw: 1.3, hl: 5.5 });
    g.run(3, () => { for (const c of g.Traffic.cars) if (c !== t) c.active = false; t.vs = 20; P.speed = 20; g.drive(0, -1); });
    return P.health / P.maxHealth;
  };
  const mini = scrape('mini'), commuter = scrape('commuter');
  check(mini === 1 && commuter < 1, `Mini: steering into a bus's side cost it nothing (a Commuter: down to ${Math.round(commuter * 100)}% health)`);
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
