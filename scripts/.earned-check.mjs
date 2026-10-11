// A check of the 6-star tier (src/delivery/cars.js EARNED_CARS): one car per special level, within
// NEXT_TIER_CAPS, earned by the level's par on each side it names, and drivable once it is.
//   node scripts/.earned-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Progress } = await g.load('progress.js');
  const { CARS, EARNED_CARS, NEXT_TIER_CAPS, earnedFor, garageCars, selectCar, stars, starColour, STAR_COLOURS, superOf, LEVEL_CARS } = g.cars;
  const { SPECIAL_LEVELS, LEVELS } = g.levels;
  check(SPECIAL_LEVELS.every(l => earnedFor(l.id)) && EARNED_CARS.length === SPECIAL_LEVELS.length, 'a car for each of the ' + SPECIAL_LEVELS.length + ' special levels, and no other');
  check(new Set([...CARS, ...EARNED_CARS, ...Object.values(LEVEL_CARS)].map(c => c.id)).size === CARS.length + EARNED_CARS.length + Object.keys(LEVEL_CARS).length, 'every id its own');
  for (const car of EARNED_CARS) {
    const level = LEVELS.find(l => l.id === car.earned.level), par = car.earned.par, onlyGood = level.battle || level.alwaysGood;
    // (held to no cap: each drives by its own figures; a level's vehicle as on its level unless one is given)
    const own = ['maxSpeed', 'accel', 'health'].every(k => car[k] > 0 && isFinite(car[k]));
    // (a race car's road version is a little tamer than it is on its circuit; the others as on their levels)
    const racer = ['gt', 'f1', 'lmp'].includes(car.base?.id);
    const within = own && (!car.base || (racer ? car.maxSpeed < car.base.maxSpeed && car.maxSpeed > car.base.maxSpeed * 0.85 && car.accel < car.base.accel
      : car.maxSpeed === car.base.maxSpeed && car.accel === car.base.accel));
    const fair = par.good < level.clock.good && (onlyGood ? par.evil === undefined : par.evil < level.clock.evil);
    check(within && fair && car.tier === 6 && !CARS.includes(car) && superOf(car) === null,
      `${car.name} (${car.id}): ${car.maxSpeed} / ${car.accel} / ${car.health}, par ${par.good}${par.evil === undefined ? '' : ' / ' + par.evil} of ${level.clock.good} / ${level.clock.evil}`);
  }
  const car = earnedFor('ufo'), other = earnedFor('all-heck');
  check(stars(car).length === 6 && starColour(car) === STAR_COLOURS.earned, 'six stars, in their own colour');
  check(!Progress.owns(car.id) && !garageCars().includes(car), 'not owned, nor in the garage, before it is earned');
  selectCar(car.id);
  check(g.cars.CAR !== car, 'nor to be picked');
  Progress.data.bestTime.good.ufo = car.earned.par.good;
  check(!Progress.earned(car), 'one side\'s par is not enough where both are asked');
  Progress.data.bestTime.evil.ufo = car.earned.par.evil - 0.1;
  check(!Progress.earned(car), 'nor a par just missed');
  Progress.data.bestTime.evil.ufo = car.earned.par.evil;
  check(Progress.earned(car) && Progress.owns(car.id) && garageCars().includes(car) && !garageCars().includes(other), 'earned with both: owned, and in the garage');
  Progress.data.bestTime.good['all-heck'] = other.earned.par.good;
  check(Progress.earned(other), 'a level played on one side only asks for that side');
  // (driven on an ordinary level)
  Progress.data.bestTime.good.suburbs = 99; // (the tiers are the default: a tier level whose medal is not earned allows only its tier's cars; this one's Good medal is earned, so any car will do)
  g.select('suburbs');
  selectCar(car.id);
  g.Game.evil = false;
  g.Player.testGhost = true;
  g.Game.start();
  g.drive(1, 0);
  g.run(20);
  const CAR = (await g.load('cars.js')).CAR;
  check(CAR === car && g.Player.maxHealth === car.health && g.Player.speed > 40, 'driven on Suburbs: ' + CAR.name + ' at ' + g.Player.speed.toFixed(1) + ' m/s');
  check(!g.track.Track.problems.length, 'no level problems');
  // (and the result screen's note: earning one by a run)
  delete Progress.data.bestTime.good['all-heck'];
  g.select('all-heck');
  g.Game.start();
  g.Game.time = g.Game.allowed - other.earned.par.good - 1;
  g.Game.finish('delivered');
  check(Progress.earned(other), 'a delivery with the par to spare earns the car');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
