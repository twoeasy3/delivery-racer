// A check of radiation (src/delivery/radiation.js): radiated areas, the meter, infection, infected cars and the
// shield, headless and seeded as scripts/.gimmicks3-check.mjs is (Math.random afresh for every section and every
// scenario in it, each start(), from the seed, the section's name and the scenario's number; a test vehicle is dealt
// through the game's own Traffic.outfit; the traffic a scenario clears is pinned off the road). On a level made here
// from the Test Track (two areas: one lane of the player's side 300 - 500, the whole road 800 - 1000), and then
// on every real level that has the field.
//   node scripts/.radiation-check.mjs [name ...] [--seed=n]     (names: only those sections: area meter shield ...)
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2);
const ONLY = args.filter(a => !a.startsWith('--'));
const SEED = Number((args.find(a => a.startsWith('--seed=')) || '--seed=2026').slice(7)) >>> 0;
// Math.random, seeded (mulberry32, as scripts/delivery-smoke.mjs)
let state = SEED, sectionNow = '', scenario = 0;
// the dice for scenario n of a section: the same whatever ran before it
const reseed = () => { let h = 2166136261 ^ SEED; for (const ch of sectionNow + ':' + scenario) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); state = h >>> 0; };
Math.random = () => {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log(ok ? '  ok    ' + what : '  FAIL  ' + what + '   [--seed=' + SEED + ', section ' + (sectionNow || 'load') + ', scenario ' + scenario + ']'); };
const section = (name, run) => { if (!ONLY.length || ONLY.includes(name)) { console.log('---- ' + name); sectionNow = name; scenario = 0; reseed(); return run(); } };
try {
  const { Radiation } = await g.load('radiation.js');
  const { Hazards } = await g.load('hazards.js');
  const { Progress } = await g.load('progress.js');
  const P = g.Player, G = g.Game, C = g.CONFIG, R = C.radiation, M = g.Message;
  const T = () => g.track.Track;
  const testbed = JSON.parse(readFileSync('src/delivery/levels/testbed.json', 'utf8'));
  const plain = { ...testbed, id: 'radiation-plain', emergencies: undefined };
  const LANE = 2, CLEAN = 3; // (the Test Track's player lanes are 2 and 3)
  const level = { ...plain, id: 'radiation-test', radiation: [{ from: 300, to: 500, lanes: [LANE, LANE] }, { from: 800, to: 1000 }], infectedTraffic: 0 };
  const lane = (n, s) => T().laneOffset(n, s);
  // the traffic taken off the road, and kept off (pinned: a vehicle that has gone and is `fixed` stays gone, until
  // the next start() deals the slots out afresh); not the ones a scenario has put down (held)
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.held) Object.assign(car, { active: false, fixed: true, cleared: true }); };
  const said = (text) => g.said.some(line => line.includes(text));
  const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
  // a fresh run on `on`, the car set down at s in lane n doing v, no traffic but what a check puts there
  const start = (s, n, v = 25, on = level) => {
    g.select(on);
    Progress.data.car = 'sport';
    P.testGhost = false;
    G.evil = false;
    g.said.length = 0;
    scenario++; reseed(); // (the dice afresh for every scenario)
    G.start();
    quiet();
    Object.assign(P, { s, lat: lane(n, s), speed: v, launching: false, shield: 0 });
    Hazards.lastS = s;
    g.drive(1, 0);
  };
  // a traffic vehicle of a kind put at (s, lane n) doing v the player's way, kept where a check holds it (dealt out
  // by the game itself, Traffic.outfit, which blanks the slot first; an ordinary driver of its kind, and ordinary
  // traffic, not `fixed`: only that can be infected)
  const put = (kind, s, n, v, more = {}) => {
    const car = g.Traffic.cars.find(c => !c.active && c.dir > 0 && !c.held);
    car.s = s;
    g.Traffic.outfit(car, kind, n);
    Object.assign(car, { active: true, held: true, unused: false, fixed: false, cleared: false, s, lat: lane(n, s), vs: v, baseSpeed: v, latVel: 0, yaw: 0, spin: 0, stun: 0, junction: null, parked: false, viaSide: false,
      evil: false, defiant: false, hesitant: false, tap: 0, tapWait: 0, emotion: 'neutral', mood: 0, ...more });
    return car;
  };
  // the player held at s in lane n for `seconds` (the road goes by under it: nothing else moves it), and every
  // car a check has put down held where it was; each(t) may end it
  const hold = (s, n, seconds, each) => {
    const spots = g.Traffic.cars.filter(c => c.held && c.active).map(c => [c, c.s, c.lat]);
    const pin = () => {
      quiet();
      Object.assign(P, { s, lat: lane(n, s), latVel: 0, speed: 25 });
      for (const [car, cs, clat] of spots) if (car.active) Object.assign(car, { s: cs, lat: clat, latVel: 0, vs: 25 });
    };
    pin();
    return g.run(seconds, (t) => { pin(); return each && each(t); });
  };
  const lost = () => (P.maxHealth - P.health) / P.maxHealth;

  start(100, LANE);
  console.log('Level problems: ' + (T().problems.join(' | ') || 'none'));
  check(!T().problems.length, 'the test level loads without problems');
  check(Radiation.on && Radiation.areas.length === 2, 'the level has radiation: two areas');

  section('area', () => {
    start(400, LANE);
    hold(400, LANE, 5);
    check(Radiation.source === 'area', 'in an area: the car is being dosed');
    check(near(lost(), R.tick * 5, R.tick * 0.1), 'in an area: health goes at the configured rate (' + (lost() * 100).toFixed(2) + '% of the car in 5 s; ' + (R.tick * 500).toFixed(2) + '% configured)');
    check(near(Radiation.meter, 5 / R.meterTime, 0.01), 'in an area: the meter rises at the configured rate (' + Radiation.meter.toFixed(3) + ' in 5 s; ' + (5 / R.meterTime).toFixed(3) + ' configured)');
    check(said('RADIATION'), 'entering an area is said');
    check(!Radiation.infected, '...and a part-full meter infects nobody');
    // out of it: the ticking stops and the meter falls back
    const health = P.health, meter = Radiation.meter;
    hold(600, LANE, 5);
    check(P.health === health, 'out of the area: the health stops ticking');
    check(near(Radiation.meter, meter - 5 / R.meterFall, 0.005) && Radiation.source === null, 'out of the area: the meter falls back slowly (' + meter.toFixed(3) + ' to ' + Radiation.meter.toFixed(3) + ' in 5 s)');
    // the lane beside it is clean
    start(400, CLEAN);
    hold(400, CLEAN, 5);
    check(P.health === P.maxHealth && Radiation.meter === 0, 'the clean lane beside an area: no dose at all');
    // an area with no lanes named: the whole road, the shoulder too
    start(900, CLEAN);
    hold(900, CLEAN, 2);
    const inLane = lost();
    start(900, CLEAN);
    g.run(2, () => { quiet(); Object.assign(P, { s: 900, lat: T().hi(900) - P.hw - 0.1, latVel: 0, speed: 25 }); });
    check(inLane > 0 && near(lost(), inLane, 1e-6), 'an area with no lanes named covers the whole road, the shoulder too');
    // a crossing at speed: what it costs
    start(280, LANE);
    g.run(20, () => { quiet(); P.lat = lane(LANE, P.s); P.speed = 25; return P.s > 520; });
    console.log('  (a 200 m area crossed at 25 m/s: ' + (lost() * 100).toFixed(1) + '% of the car\'s health, ' + (Radiation.meter * 100).toFixed(0) + '% of the meter)');
    check(lost() > 0.12 && lost() < 0.19 && Radiation.meter > 0.45 && Radiation.meter < 0.75, 'a 200 m area at speed costs a visible slice of health (12 - 19%) and over half the meter, but is not a sentence');
    // staying in it: infected within 12 - 15 s
    start(400, LANE);
    let fullAt = null;
    hold(400, LANE, 25, (t) => { if (Radiation.infected) { fullAt = t; return true; } });
    check(fullAt !== null && fullAt >= 11 && fullAt <= 15, 'staying in an area: infected after ' + (fullAt === null ? 'never' : fullAt.toFixed(1) + ' s') + ' (12 - 15 s)');
    // two stretches in a row: the meter falls only slowly between them
    start(280, LANE);
    g.run(20, () => { quiet(); P.lat = lane(LANE, P.s); P.speed = 25; return P.s > 520; });
    const first = Radiation.meter;
    hold(600, LANE, 19);
    const between = Radiation.meter;
    check(between > first * 0.6 && between < first, 'between two stretches 480 m apart the meter has fallen only a little (' + first.toFixed(2) + ' to ' + between.toFixed(2) + ')');
    check(between + (200 / 25) / R.meterTime >= 1 - 0.05, '...so a second 200 m crossing at 25 m/s all but fills it (' + (between + (200 / 25) / R.meterTime).toFixed(2) + ')');
  });

  section('meter', () => {
    start(400, LANE);
    Radiation.meter = R.high - 0.01;
    hold(400, LANE, 1);
    check(said('three quarters') && !Radiation.infected, 'the meter passing three quarters is said');
    Radiation.meter = 0.99;
    hold(400, LANE, 1);
    check(Radiation.infected && Radiation.meter === 1, 'a full meter infects the player');
    check(said('INFECTED'), '...and it is said');
    check(M.sticky.some(h => h.path === 'events.infected'), '...and held as a lasting condition (its icon by the gauges)');
    // ...and then the health ticks down everywhere
    let health = P.health;
    hold(600, LANE, 5);
    check(near((health - P.health) / P.maxHealth, R.infectedTick * 5, R.infectedTick * 0.1), 'infected, out of every area: health goes at the infected rate (' + ((health - P.health) / P.maxHealth * 100).toFixed(2) + '% in 5 s)');
    check(Radiation.meter === 1, '...and the meter stays full');
    health = P.health;
    hold(400, LANE, 5);
    check(near((health - P.health) / P.maxHealth, Math.max(R.tick, R.infectedTick) * 5, R.tick * 0.1), 'infected and in an area: the greater of the two rates, not both');
    console.log('  (an infected car at full health lasts ' + (1 / R.infectedTick).toFixed(0) + ' s with no wrench; a wrench gives back ' + (C.wrenchRepair * 100) + '%: ' + (C.wrenchRepair / R.infectedTick).toFixed(0) + ' s more)');
    check(1 / R.infectedTick >= 60 && 1 / R.infectedTick <= 100, 'infected, a whole car lasts ' + (1 / R.infectedTick).toFixed(0) + ' s (a minute to a minute and a half)');
    // a wreck does not cure it (CONFIG.radiation.wreckCures), and its icon comes back with the new car
    P.health = 0;
    g.run(C.respawnTime + C.respawnShield + 1.5, () => { quiet(); });
    check(G.wrecks === 1 && P.active && Radiation.infected === !R.wreckCures, 'a wreck ' + (R.wreckCures ? 'cures it' : 'does not cure it: the new car is infected too'));
    check(R.wreckCures || M.sticky.some(h => h.path === 'events.infected'), '...and its icon is back once the new car is down');
  });

  section('shield', () => {
    // the Armour pickup: no dose, no meter, no infection
    start(400, LANE);
    P.armour = 60;
    Radiation.meter = 0.5;
    hold(400, LANE, 5);
    check(P.health === P.maxHealth, 'armoured, in an area: no damage');
    check(Radiation.meter < 0.5 && !Radiation.infected && Radiation.source === null, 'armoured, in an area: the meter does not rise (it falls: ' + Radiation.meter.toFixed(3) + ')');
    check(said('armour keeps'), '...and it is said, once');
    Radiation.meter = 0.999;
    hold(400, LANE, 3);
    check(!Radiation.infected, 'armoured, the meter all but full, in an area: not infected');
    // already infected: the ticking stops while it lasts, and goes on after
    start(600, LANE);
    Radiation.infect();
    P.armour = 3;
    hold(600, LANE, 2.5);
    check(P.health === P.maxHealth && Radiation.infected, 'infected, then armoured: the ticking stops, and the infection is not cured');
    hold(600, LANE, 3);
    check(P.health < P.maxHealth, '...and it goes on once the armour is gone');
    // the helicopter's shield, the SuperCar, a ghost and a tank: the same
    for (const [name, set] of [['a helicopter drop\'s shield', () => { P.shield = 60; }], ['the SuperCar', () => { P.mystery = 'invincible'; P.mysteryTime = 60; }], ['a ghost', () => { P.ghost = 60; }], ['a tank', () => { P.tank = 1; }]]) {
      start(400, LANE);
      set();
      hold(400, LANE, 3);
      check(P.health === P.maxHealth && Radiation.meter === 0, name + ' keeps it out too');
      P.tank = 0; P.mystery = '';
    }
  });

  section('ring', () => {
    // an infected car alongside, a lane over (3.5 m: inside its ring), on clean road
    start(600, LANE);
    put('commuter', 600, CLEAN, 25, { infected: true });
    hold(600, LANE, 5);
    check(Radiation.source === 'car' && Radiation.near, 'beside an infected car: the car is being dosed by it');
    check(near(lost(), R.tick * 5, R.tick * 0.1) && near(Radiation.meter, 5 / R.meterTime, 0.01), 'an infected car\'s ring acts as an area: the same rates (' + (lost() * 100).toFixed(2) + '% and ' + Radiation.meter.toFixed(3) + ' in 5 s)');
    check(said('Infected car') && !Radiation.infected, '...it is said, and nobody is infected by being near');
    // beyond the ring: nothing
    start(600, LANE);
    put('commuter', 600 + R.radius + 1, LANE, 25, { infected: true });
    hold(600, LANE, 5);
    check(P.health === P.maxHealth && Radiation.meter === 0, (R.radius + 1) + ' m from one (its ring is ' + R.radius + ' m): no dose');
    // a clean car alongside: nothing
    start(600, LANE);
    put('commuter', 600, CLEAN, 25);
    hold(600, LANE, 5);
    check(P.health === P.maxHealth && Radiation.meter === 0, 'beside a clean car: no dose');
    // the armour keeps the ring out
    start(600, LANE);
    P.armour = 60;
    put('commuter', 600, CLEAN, 25, { infected: true });
    hold(600, LANE, 5);
    check(P.health === P.maxHealth && Radiation.meter === 0, 'armoured, beside an infected car: no dose');
  });

  section('contact', () => {
    // into the back of an infected car: infected at once, the meter all but empty
    const ram = (setup) => {
      start(600, LANE, 28);
      const car = put('commuter', 612, LANE, 12, { infected: true });
      if (setup) setup(car);
      g.run(4, () => { quiet(); return Radiation.infected; });
      return car;
    };
    ram();
    check(Radiation.infected && Radiation.meter === 1, 'touching an infected car infects the player at once, whatever the meter read');
    check(said('INFECTED'), '...and it is said');
    ram(() => { P.armour = 60; });
    check(!Radiation.infected && Radiation.meter < 0.1, 'touching one through the armour: not infected');  // (a little meter may come from a moment's dose after a pickup on the way cuts the armour short)
    ram(() => { P.ghost = 60; });
    check(!Radiation.infected, 'a ghost drives through one: not infected');
    ram((car) => { car.infected = false; });
    check(!Radiation.infected && Radiation.meter === 0, 'touching a clean car infects nobody');
  });

  section('traffic', () => {
    // infected cars side by side, and a clean one in their ring, on clean road: nobody is harmed, nobody catches it
    start(100, LANE);
    const a = put('commuter', 620, LANE, 25, { infected: true }), b = put('wagon', 620, CLEAN, 25, { infected: true }), c = put('taxi', 626, LANE, 25);
    hold(100, LANE, 10);
    check(a.health === a.maxHealth && b.health === b.maxHealth, 'infected cars side by side: neither is harmed');
    check(c.health === c.maxHealth && !c.infected, 'a clean car in an infected car\'s ring, out of every area: unharmed, and it does not catch it');
    // clean cars held in an area catch it, by chance; one outside never does; the police never do
    start(100, LANE);
    const inside = [put('commuter', 320, LANE, 25), put('wagon', 360, LANE, 25), put('taxi', 400, LANE, 25), put('junker', 440, LANE, 25)];
    const outside = put('commuter', 400, CLEAN, 25), police = put('police', 480, LANE, 25);
    hold(100, LANE, 30);
    const caught = inside.filter(car => car.infected).length;
    check(caught >= 1, 'clean cars driving in an area can catch it (' + caught + ' of 4 in 30 s at ' + R.catch + ' a second)');
    check(!outside.infected, 'a clean car in the lane beside the area never does');
    check(!police.infected, 'a police car in the area never does');
    check(inside.every(car => car.health === car.maxHealth), '...and none is harmed by it');
    // no more than `most` at once
    start(100, LANE);
    const many = [];
    for (let i = 0; i < R.most + 4; i++) many.push(put('commuter', 305 + i * 20, LANE, 25));
    hold(100, LANE, 120);
    check(many.filter(car => car.infected).length === R.most, 'no more than ' + R.most + ' are infected at once (' + many.filter(car => car.infected).length + ' of ' + many.length + ' after two minutes in an area)');
  });

  section('dealt', () => {
    const dealt = (share, seconds = 40) => {
      const on = { ...level, id: 'radiation-dealt', infectedTraffic: share };
      g.select(on); Progress.data.car = 'sport'; P.testGhost = true; G.evil = false; scenario++; reseed(); G.start();
      let most = 0, total = 0, closest = Infinity, wrong = 0, outside = 0;
      const seen = new Set();
      g.run(seconds, () => {
        let n = 0;
        for (const car of g.Traffic.cars) {
          if (!car.active || !car.infected) continue;
          n++;
          if (!Radiation.can(car)) wrong++;
          if (!seen.has(car)) { seen.add(car); total++; closest = Math.min(closest, Math.abs(car.s - P.s)); if (!Radiation.at(car.s, car.lat)) outside++; }
        }
        most = Math.max(most, n);
      });
      P.testGhost = false;
      return { most, total, closest, wrong, outside };
    };
    const some = dealt(0.5);
    check(some.total > 0 && some.most <= R.most, 'a level that deals half its traffic infected: some are (' + some.total + ' seen in 40 s, ' + some.most + ' at once at most; the cap is ' + R.most + ')');
    check(some.wrong === 0, '...never a kind that cannot be (police, an ambulance...)');
    check(some.closest >= 20, '...and none is dealt out on top of the player (the nearest was first seen ' + some.closest.toFixed(0) + ' m off)');
    const none = dealt(0, 30);
    check(none.outside === 0, 'a level that deals none (infectedTraffic: 0): the only infected cars in 30 s are ones that caught it in an area (' + none.total + ', each first seen infected inside one)');
    g.select({ ...level, id: 'radiation-default', infectedTraffic: undefined }); G.start();
    check(Radiation.share === R.share, 'a level with an area and no "infectedTraffic" deals CONFIG\'s share (' + R.share + ')');
  });

  section('without', () => {
    // a level without the field: nothing of this happens
    start(400, LANE, 25, plain);
    check(!Radiation.on && Radiation.areas.length === 0 && Radiation.share === 0, 'a level without the fields has no radiation');
    const dice = state;
    Radiation.update(1 / 60);
    check(state === dice, '...and it draws no dice there');
    G.start(); // (with its traffic)
    P.testGhost = true;
    g.run(30);
    P.testGhost = false;
    check(Radiation.meter === 0 && !Radiation.infected && !g.Traffic.cars.some(c => c.active && c.infected), '30 s of it: no meter, no infection, no infected car');
    check(!said('RADIATION') && !said('INFECTED'), '...and nothing is said');
  });

  section('restart', () => {
    start(400, LANE);
    Radiation.infect();
    for (const car of g.Traffic.cars) car.infected = true;
    put('commuter', 420, CLEAN, 25, { infected: true });
    hold(400, LANE, 2);
    check(Radiation.infected && P.health < P.maxHealth, '(a run with everything infected)');
    G.start();
    check(Radiation.meter === 0 && !Radiation.infected && Radiation.source === null, 'a restart clears the meter and the infection');
    check(!g.Traffic.cars.some(c => c.infected), '...and every car\'s flag (the level deals none)');
    check(P.health === P.maxHealth && !M.sticky.length, '...and the car is whole, with no icon left');
    // a slot dealt out again is clean
    const car = g.Traffic.cars.find(c => c.active);
    car.infected = true;
    g.Traffic.outfit(car, 'commuter', LANE);
    check(!car.infected, 'a slot dealt out again is a clean vehicle');
  });

  section('real', () => {
    // every real level that has it: loads, and each area has a clean line round it or an armour before it
    const found = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)].filter(l => l.radiation?.length || l.infectedTraffic > 0);
    console.log('  (levels with radiation: ' + (found.map(l => l.id).join(', ') || 'none') + ')');
    for (const l of found) {
      g.select(l); Progress.data.car = 'sport'; G.start();
      check(!T().problems.length, l.id + ': loads without problems' + (T().problems.length ? ': ' + T().problems.join(' | ') : ''));
      for (const a of Radiation.areas) {
        // a clean line: somewhere across the road (a lane of the player's side, or a shoulder) the whole stretch
        // is out of it; or a side road leaves before it and rejoins after; or an armour within 400 m before it
        const [first, last] = T().laneRange(1, a.from + 1);
        const lines = [];
        for (let n = first; n <= last; n++) lines.push(['lane ' + n, (s) => lane(n, s)]);
        lines.push(['the right shoulder', (s) => T().hi(s) - 1.2], ['the left shoulder', (s) => T().lo(s) + 1.2]);
        const clean = lines.filter(([, at]) => { for (let s = a.from; s <= a.to; s += 5) if (Radiation.at(s, at(s))) return false; return true; }).map(([name]) => name);
        const round = T().exits.some(x => x.exitAt < a.from && x.mergeAt > a.to);
        const armour = (l.pickups || []).some(p => p.type === 'armour' && !p.road && p.s < a.from && p.s > a.from - 400);
        check(clean.length || round || armour, l.id + ': the area ' + a.from + ' - ' + a.to + ' has a way through clean: ' +
          ([clean.join(', '), round ? 'a side road round it' : '', armour ? 'an armour before it' : ''].filter(Boolean).join('; ') || 'NONE'));
        if (!a.lanes || (clean.length <= 2 && clean.every(n => n.includes('shoulder')))) check(round || armour, l.id + ': ...and, covering every lane, it has a side road round it or an armour before it');
      }
    }
  });
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all radiation checks passed');
process.exit(failures ? 1 : 0);
