// A check of the car ideas as cars to drive (src/delivery/ideas.js IDEA_CARS: thirty placeholders, tierless and
// free): that each can be picked, is driven to the end of a level, has figures inside what the garage's cars
// span, is remembered as the car in use over a reload without being written into the save's list of cars (the
// cookie stays small), is never what an amphibious level or a level with a vehicle of its own is driven in,
// and that the mystery effects that change the car cope with one.
//   node scripts/.ideas-check.mjs            every idea driven down the first level
//   node scripts/.ideas-check.mjs --quick    six of them driven (the extremes), the rest only picked
import { boot } from './delivery-headless.mjs';

const quick = process.argv.includes('--quick');
const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Progress } = await g.load('progress.js');
  const { IDEA_CARS } = await g.load('ideas.js');
  const { Gambles } = await g.load('gambles.js');
  const cars = () => g.cars; // (CAR is a live binding: read it afresh)
  const { CARS, EARNED_CARS, SECRET_CARS, LEVEL_CARS, garageCars, selectCar, useLevelCar, stars, superOf, amphibiousCars } = g.cars;
  const { LEVELS } = g.levels, C = g.CONFIG, P = g.Player;
  const STORE = 'delivery_racer_progress_backup', cookieNow = () => document.cookie.split(';')[0], inCookie = () => JSON.parse(decodeURIComponent(cookieNow().split('=')[1]));

  // ---- what they are: thirty, tierless, free, placeholders, and none of them a garage car
  check(IDEA_CARS.length === 26, IDEA_CARS.length + ' car ideas');
  // (four that were ideas are garage cars now: the Blue Stars at four stars. Bought, owned and saved as any other)
  {
    const four = ['gullwing', 'rearengine', 'snake', 'polytruck'].map(id => CARS.find(c => c.id === id));
    check(four.every(c => c && c.tier === 4 && c.blue && !c.placeholder && !c.idea && c.price > 0 && stars(c).length === 4) && !IDEA_CARS.some(c => four.some(f => f.id === c.id)),
      'the four Blue Stars at four stars are garage cars, and ideas no longer: ' + four.map(c => c && c.name + ' $' + c.price).join(', '));
    const blue = (tier) => CARS.filter(c => c.blue && c.tier === tier), range = (list, key) => [Math.min(...list.map(c => c[key])), Math.max(...list.map(c => c[key]))];
    check(CARS.filter(c => c.blue && c.tier === 4).length === 4 && ['maxSpeed', 'price'].every(key => range(four, key)[0] > range(blue(3), key)[1] && range(four, key)[1] < range(blue(5), key)[0]),
      '...each quicker and dearer than every Blue Star of tier 3, slower and cheaper than every one of tier 5 (' + range(four, 'maxSpeed').join(' to ') + ' m/s, $' + range(four, 'price').join(' to $') + ')');
    check(['accel', 'health'].every(key => range(four, key)[0] >= range(blue(3), key)[0] && range(four, key)[1] <= range(blue(5), key)[1]), '...their acceleration and health inside what the Blue Stars of tiers 3 and 5 span between them');
    Progress.reset();
    check(!Progress.owns('snake') && (selectCar('snake'), g.cars.CAR.id !== 'snake'), '...not owned until bought, nor to be picked');
    Progress.data.money = 5000;
    check(four.every(c => Progress.buy(c)) && four.every(c => Progress.data.cars.includes(c.id)) && Progress.data.money === 5000 - four.reduce((sum, c) => sum + c.price, 0), '...bought: in the save\'s list of cars, and paid for');
    selectCar('polytruck');
    Progress.reload();
    useLevelCar(null);
    check(g.cars.CAR.id === 'polytruck' && inCookie().cars.length === 5 && document.cookie.length <= 4096, '...and one in use is there after the save is read again (the cookie: ' + document.cookie.length + ' bytes)');
    Progress.reset();
  }
  const others = [...CARS, ...EARNED_CARS, ...Object.values(SECRET_CARS), ...Object.values(LEVEL_CARS)];
  check(new Set([...others, ...IDEA_CARS].map(c => c.id)).size === others.length + IDEA_CARS.length, 'every id its own, among the ideas and against every other car');
  check(IDEA_CARS.every(c => c.placeholder === true && c.idea === true), 'every one flagged a placeholder');
  check(IDEA_CARS.every(c => c.tier === undefined && c.price === 0 && !c.blue && !c.amphibious && !c.earned && !c.trait && !c.perk && !c.tank && stars(c) === ''), 'tierless: no tier, no stars, no price, no season, not amphibious, not earned, no trait or perk');
  check(IDEA_CARS.every(c => !CARS.includes(c) && !garageCars().includes(c) && superOf(c) === null), 'none in CARS or the garage\'s lot, and none has a Super version');
  const kinds = IDEA_CARS.filter(c => C.vehicles[c.id]).map(c => c.id);
  check(kinds.length === 0, 'none is a traffic kind' + (kinds.length ? ' (BUT these ids are also kinds of traffic: ' + kinds.join(', ') + ')' : ''));
  check(IDEA_CARS.every(c => Progress.owns(c.id)) && !Progress.data.cars.some(id => IDEA_CARS.some(c => c.id === id)), 'every one is open (owned) with none in the save\'s list of cars');

  // ---- their figures: finite, and inside what the garage's cars span (the cars for sale, the 6-star ones and the City Bus)
  const garage = [...CARS, ...EARNED_CARS, ...Object.values(SECRET_CARS)];
  const of = { maxSpeed: c => c.maxSpeed, accel: c => c.accel, agility: c => c.agility ?? 1, crossing: c => c.crossing ?? C.railCrossing.usual, health: c => c.health, mass: c => c.mass ?? 1 };
  const span = Object.fromEntries(Object.entries(of).map(([key, f]) => [key, [Math.min(...garage.map(f)), Math.max(...garage.map(f))]]));
  console.log('the garage\'s span: ' + Object.entries(span).map(([k, [lo, hi]]) => k + ' ' + lo + ' to ' + hi).join(', '));
  const out = [];
  for (const car of IDEA_CARS) for (const [key, f] of Object.entries(of)) {
    const v = car[key];
    if (typeof v !== 'number' || !isFinite(v) || f(car) < span[key][0] || f(car) > span[key][1]) out.push(car.id + '.' + key + ' = ' + v);
  }
  check(out.length === 0, 'every figure a finite number inside the garage\'s span' + (out.length ? ': NOT ' + out.join(', ') : ''));
  const forSale = Math.max(...CARS.map(c => c.maxSpeed)), slowest = Math.min(...CARS.map(c => c.maxSpeed));
  check(IDEA_CARS.every(c => c.maxSpeed <= forSale && c.maxSpeed >= slowest), 'none quicker than the quickest car for sale (' + forSale + ' m/s), none slower than the slowest (' + slowest + ' m/s)');
  check(IDEA_CARS.every(c => [c.hw, c.hl, c.height].every(v => typeof v === 'number' && isFinite(v) && v > 0)), 'every size a finite number');
  const widest = Math.max(...CARS.map(c => c.hw)), longest = Math.max(...garage.map(c => c.hl)), tallest = Math.max(...garage.map(c => c.height));
  check(IDEA_CARS.every(c => c.hw <= widest), 'none wider than the widest garage car (' + widest * 2 + ' m; a lane is ' + C.laneWidth + ' m): the widest idea is ' + Math.max(...IDEA_CARS.map(c => c.hw)) * 2 + ' m');
  check(IDEA_CARS.every(c => c.hl <= longest), 'none longer than the longest (the City Bus, ' + longest * 2 + ' m): the longest idea is ' + Math.max(...IDEA_CARS.map(c => c.hl)) * 2 + ' m');
  check(IDEA_CARS.filter(c => c.real).every(c => Math.abs(c.real.hw * c.scale - c.hw) < 0.02 && Math.abs(c.real.hl * c.scale - c.hl) < 0.02 && Math.abs(c.real.height * c.scale - c.height) < 0.02),
    'one scaled down to fit a lane has its hitbox scaled with its model: ' + IDEA_CARS.filter(c => c.real).map(c => c.name + ' at ' + c.scale).join(', '));
  // (said, not failed: what is outside the garage's sizes. A decision for the balancing pass)
  const tall = IDEA_CARS.filter(c => c.height > tallest), small = IDEA_CARS.filter(c => c.hw < Math.min(...CARS.map(x => x.hw)) || c.hl < Math.min(...CARS.map(x => x.hl)));
  console.log('  note  taller than the tallest garage car (' + tallest + ' m): ' + (tall.map(c => c.name + ' ' + c.height + ' m').join(', ') || 'none'));
  console.log('  note  smaller than the smallest garage car: ' + (small.map(c => c.name + ' ' + c.hw * 2 + ' x ' + c.hl * 2 + ' m').join(', ') || 'none'));
  // (the crosswind's push goes by height: the game holds it under half the steering's speed for the tallest garage car)
  {
    const w = { dir: 1, strength: C.crosswind.strength, every: 1, length: 1 };
    const drift = (h) => Math.abs(Gambles.windPush(w, h, 0.5)) / C.steerResponse;
    const blown = IDEA_CARS.filter(c => drift(c.height) >= C.steerSpeed * 0.5);
    console.log('  note  a crosswind\'s hardest gust drifts the tallest garage car ' + drift(Math.max(...CARS.map(c => c.height))).toFixed(1) + ' m/s (steering: ' + C.steerSpeed + ' m/s); over half the steering\'s speed: ' +
      (blown.map(c => c.name + ' ' + drift(c.height).toFixed(1) + ' m/s').join(', ') || 'no idea'));
    check(IDEA_CARS.every(c => drift(c.height) < C.steerSpeed), 'crosswind: the hardest gust on the tallest idea is still less than the steering gives (' + Math.max(...IDEA_CARS.map(c => drift(c.height))).toFixed(1) + ' of ' + C.steerSpeed + ' m/s)');
  }
  // (a low bridge: what one too tall for it takes, against its health. None is wrecked by one knock)
  {
    const L = C.lowBridge, knock = (c) => L.damage + L.perMetre * (c.height - L.clearance);
    const worst = IDEA_CARS.filter(c => c.height > L.clearance).sort((a, b) => knock(b) / b.health - knock(a) / a.health)[0];
    check(IDEA_CARS.every(c => c.height <= L.clearance || knock(c) < c.health), 'low bridge: no idea is wrecked by one knock (the worst off: ' + worst.name + ', ' + Math.round(knock(worst)) + ' of ' + worst.health + ' health)');
  }

  // ---- picked, saved and loaded again
  Progress.reset();
  const fresh = Progress.saved();
  let picked = 0, kept = 0, small2 = 0, biggest = 0;
  for (const car of IDEA_CARS) {
    selectCar(car.id);
    if (cars().CAR === car && Progress.data.car === car.id && !Progress.data.cars.includes(car.id)) picked++;
    biggest = Math.max(biggest, document.cookie.length);
    if (document.cookie.length <= 4096 && inCookie().car === car.id && inCookie().cars.join() === 'commuter') small2++;
    Progress.reload();
    useLevelCar(null); // (as the page does when it loads: the car in use, from the save)
    if (cars().CAR === car && Progress.data.cars.join() === 'commuter') kept++;
  }
  check(picked === IDEA_CARS.length, 'each is picked (selectCar): the car in use, and not added to the cars owned (' + picked + ' of ' + IDEA_CARS.length + ')');
  check(kept === IDEA_CARS.length, 'each is still the car in use after the save is read again (' + kept + ')');
  check(small2 === IDEA_CARS.length, 'the cookie holds it as the car in use and lists no idea: ' + biggest + ' bytes at most, of 4096');
  // (with local storage gone, the cookie alone brings it back)
  selectCar('doubledecker');
  localStorage.removeItem(STORE);
  Progress.reload();
  useLevelCar(null);
  check(cars().CAR.id === 'doubledecker', 'with local storage gone, the cookie brings the idea in use back');
  // (a full save with one in use: no bigger than with a garage car in use, but for the id)
  Progress.complete({ levels: LEVELS.length, cars: [...CARS.map(c => c.id), ...Object.keys(SECRET_CARS)], money: C.completeBank });
  selectCar('sport');
  const withSport = document.cookie.length;
  selectCar('centreseat');
  check(document.cookie.length <= 4096 && document.cookie.length - withSport === 'centreseat'.length - 'sport'.length, 'a full save with an idea in use: the cookie is ' + document.cookie.length + ' bytes (' + withSport + ' with the Sportscompact in use)');
  check(Progress.data.cars.length === CARS.length + Object.keys(SECRET_CARS).length, '"Unlock everything" adds no idea to the cars owned (' + Progress.data.cars.length + ')');
  // (an old save, with no idea in it, loads as it was)
  Progress.reset();
  Progress.data.cars.push('sport'); Progress.data.car = 'sport'; Progress.data.money = 123.45; Progress.data.unlocked = 7;
  Progress.save();
  const old = Progress.saved();
  Progress.reload();
  useLevelCar(null);
  check(Progress.saved() === old && cars().CAR.id === 'sport', 'a save with no idea in it loads unchanged');
  // (and a save naming a car there is not: the first car, as ever)
  Progress.data.car = 'nosuchidea';
  useLevelCar(null);
  check(cars().CAR === CARS[0], 'a car in use that is no car: the Commuter');
  Progress.reset();
  check(Progress.saved() === fresh, 'reset');

  // ---- driven: down the first level as a ghost, to its end
  const level = LEVELS[0];
  const EXTREMES = ['bubble', 'limo', 'monster', 'schoolbus', 'doubledecker', 'milkfloat'];
  let driven = 0;
  const lines = [];
  for (const car of IDEA_CARS) {
    if (quick && !EXTREMES.includes(car.id)) continue;
    g.select(level.id);
    selectCar(car.id);
    g.Game.evil = false;
    P.testGhost = true;
    g.Game.start();
    g.drive(1, 0);
    let top = 0, bad = false;
    const took = g.run(600, () => { top = Math.max(top, P.speed); bad = bad || ![P.s, P.lat, P.speed, P.health].every(isFinite); return g.Game.state === 'finished'; });
    const ok = cars().CAR === car && g.Game.state === 'finished' && (g.Game.outcome === 'delivered' || g.Game.outcome === 'late') && !bad &&
      P.maxHealth === car.health && P.hw === car.hw && P.hl === car.hl && P.height === car.height && top > car.maxSpeed * 0.9;
    if (ok) driven++;
    lines.push((ok ? '' : 'FAILED ') + car.id + ' ' + g.Game.outcome + ' in ' + took.toFixed(0) + ' s (top ' + top.toFixed(1) + ' of ' + car.maxSpeed + ')');
    if (!ok) console.log('  FAIL  ' + lines[lines.length - 1]);
  }
  console.log('  ' + lines.join('; '));
  check(driven === (quick ? EXTREMES.length : IDEA_CARS.length), driven + ' ideas driven to the end of ' + g.levels.levelName(level) + ' as a ghost, each with its own size and health, at its top speed (clock: ' + level.clock.good + ' s)');
  check(!g.track.Track.problems.length, 'no level problems');
  // (the slowest of them, not a ghost and with nothing done but the accelerator held: it gets there)
  const late = lines.filter(l => !l.includes(' delivered '));
  console.log('  note  not on time, flat out and hands off: ' + (late.join('; ') || 'none'));

  // ---- the rules that restrict the car still hold
  const amphibious = LEVELS.find(l => l.amphibious && !l.car);
  g.select(amphibious.id);
  selectCar('monster');
  check(!g.Game.canStart, 'an amphibious level (' + g.levels.levelName(amphibious) + ') is not started in an idea, with no amphibious car owned');
  g.Game.start();
  check(g.Game.state !== 'playing' || cars().CAR.amphibious, '...Game.start refuses it');
  Progress.data.cars.push(amphibiousCars()[0].id);
  check(g.Game.canStart, '...and with one owned it starts');
  g.Game.start();
  check(cars().CAR.amphibious && !cars().CAR.idea && Progress.data.car === 'monster', '...in the amphibious car (' + cars().CAR.name + '), the idea still the car in use');
  g.select('ufo');
  g.Game.start();
  check(cars().CAR === LEVEL_CARS.ufo, 'a level with a vehicle of its own (the UFO\'s) is driven in that');
  const race = LEVELS.find(l => l.laps);
  g.select(race.id);
  g.Game.start();
  check(!cars().CAR.idea && Object.values(LEVEL_CARS).includes(cars().CAR), 'a race (' + g.levels.levelName(race) + ') in its own car: ' + cars().CAR.name);

  // ---- the mysteries that change the car, with an idea as the player's
  const start = (id) => { g.select('suburbs'); selectCar(id); P.testGhost = true; g.Game.start(); g.drive(1, 0); g.run(2); };
  const mystery = (effect) => { P.nextMystery = effect; P.startMystery(); P.nextMystery = ''; };
  start('schoolbus');
  const bus = cars().CAR;
  mystery('soupedUp');
  check(cars().CAR === bus && P.mystery === C.mystery.fallback, 'souped up: an idea has no Super version, and gets the fallback (' + C.mystery.fallback + ') in its place');
  P.endMystery();
  mystery('carSwap');
  const lentCar = cars().CAR;
  check(CARS.includes(lentCar) && lentCar !== bus && P.hl === lentCar.hl, 'car swap: lent a garage car (' + lentCar.name + '), never an idea');
  g.run(1);
  P.endMystery();
  check(cars().CAR === bus && P.hl === bus.hl && P.hw === bus.hw && P.height === bus.height && P.maxHealth === bus.health, '...and given the School Bus back, its size and health with it');
  mystery('giant');
  check(P.mystery === 'giant' && P.hl > bus.hl * 1.5, 'the giant: the School Bus at ' + (P.hl * 2).toFixed(1) + ' m long, ' + (P.hw * 2).toFixed(1) + ' m wide');
  g.run(C.mystery.giant.time + 1);
  check(P.mystery === '' && Math.abs(P.hl - bus.hl) < 1e-9 && Math.abs(P.height - bus.height) < 1e-9, '...and back to its size after');
  mystery('swapSides');
  g.run(3);
  P.endMystery();
  check([P.s, P.lat, P.speed].every(isFinite), 'swapped sides: it drives on');
  start('bubble');
  g.Game.tankPieces = C.tankPieces;
  P.startTank();
  g.run(5);
  check(P.tank > 0 && cars().CAR.id === 'bubble' && [P.s, P.speed, P.health].every(isFinite) && P.crossing === 1, 'TANK RAGE in the Bubble Car: it rages, at ' + P.speed.toFixed(1) + ' m/s');
  // (the horn: each borrows a garage car's, one there is)
  const audio = (await import('node:fs')).readFileSync(new URL('../src/delivery/render/audio.js', import.meta.url), 'utf8');
  const horns = audio.slice(audio.indexOf('const HORNS'), audio.indexOf('const pick'));
  const noHorn = IDEA_CARS.filter(c => !c.sound || !new RegExp('\\b' + c.sound + ': \\{').test(horns)).map(c => c.id);
  check(noHorn.length === 0, 'each borrows the horn of a car that has one (`sound`)' + (noHorn.length ? ': NOT ' + noHorn.join(', ') : ''));
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
