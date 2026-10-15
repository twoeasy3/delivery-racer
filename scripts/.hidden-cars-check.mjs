// A check of HIDDEN UNTIL AVAILABLE (cars.js `hideUnlessAvailable`, isVisibleCar; the owner, 15-Oct: "hide some unobtainable cars
// and from the count entirely if the player doesn't have them, have a blueprint or it currently isn't available at all"):
// a flagged car is off the showroom's floor and out of every count while the player neither owns it, nor has a blueprint of it,
// nor can get it now (carsources.js sourcesOf); any one of those and it is back. Opt-in: no unflagged car is ever affected.
// Today's flagged cars: the 14 Legendary cars (cars.js LEGEND_CARS).
//   node scripts/.hidden-cars-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = g.cars;
  const { Progress } = await g.load('progress.js');
  const D = await g.load('showroomData.js');
  const S = await g.load('carsources.js');
  const { Events } = await g.load('events.js');
  const U = await g.load('unlockall.js');
  const P = await g.load('packs.js');
  const { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS, isVisibleCar, garageCars } = C;
  const roster = [...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...Object.values(SECRET_CARS)];
  const flagged = roster.filter(car => car.hideUnlessAvailable), ids = flagged.map(car => car.id);
  const LEGENDS = ['l-commuter', 'l-sport', 'l-miata', 'l-lowrider', 'l-wagon', 'l-lovebus', 'l-darkvan', 'l-hearse', 'l-hotrod', 'l-minivan', 'l-pickup', 'l-junker', 'l-taxi', 'l-suv'];
  console.log('        flagged: ' + ids.join(' '));
  check(ids.length === LEGENDS.length && LEGENDS.every(id => ids.includes(id)) && flagged.every(car => car.legend && car.earned && car.off), 'the flagged cars are exactly the 14 Legendary cars');

  const floor = () => D.showroomCars().map(car => car.id);
  const count = () => { const cards = D.showroomCars().map(car => D.carCard(car)); return { all: cards.length, ready: cards.filter(c => c.unlocked).length }; };
  const shownOnly = (save) => { Progress.reset(); save?.(); return LEGENDS.filter(id => floor().includes(id)); };

  // ---- a fresh save: every Legendary car hidden and uncounted; every other car as before
  Progress.reset();
  const fresh = count(), everyOther = roster.filter(car => !car.hideUnlessAvailable && !Object.values(SECRET_CARS).includes(car));
  console.log('        fresh save: ' + fresh.ready + ' / ' + fresh.all + ' cars');
  check(LEGENDS.every(id => !isVisibleCar(C.carById(id))) && shownOnly().length === 0, 'fresh save: no Legendary car is visible or on the floor');
  check(fresh.all === everyOther.length, 'fresh save: the count is every unflagged car (' + everyOther.length + '), none of the 14');
  check(roster.filter(car => !car.hideUnlessAvailable).every(isVisibleCar) && everyOther.every(car => floor().includes(car.id)), 'an unflagged car is never hidden (the off Courier Special, the no-key Bespoke cars, the noPacks blueprint cars all shown)');
  check(LEGENDS.every(id => !S.obtainableNow(C.carById(id))), 'none of the 14 can be had now (sourcesOf: no key source, no blueprints)');

  // ---- owned: it shows and counts (and parks in the car lot)
  check(shownOnly(() => Progress.data.cars.push('l-hotrod')).join() === 'l-hotrod' && count().all === fresh.all + 1 && count().ready === fresh.ready + 1, 'owning the Legendary Hot Rod: it alone shows, counted (' + count().ready + ' / ' + count().all + ')');
  check(garageCars().some(car => car.id === 'l-hotrod'), 'owned: it is parked in the car lot');
  // ---- a blueprint of it: shows and counts
  check(shownOnly(() => { (Progress.data.blueprints ||= {})['l-sport'] = 1; }).join() === 'l-sport' && count().all === fresh.all + 1, 'a blueprint of the Legendary Sportscompact: it alone shows, counted');
  check(!garageCars().some(car => car.id === 'l-sport'), 'a blueprint only: not parked in the car lot (not owned)');
  // ---- available: an event featuring it (a special event with it as the grand prize, on now) shows it, until the event goes
  const fake = { id: 'hidden-cars-check', name: 'Legend Cup', prize: { car: 'l-taxi' }, stages: [{ level: g.levels.LEVELS[0].id, index: 0 }], from: null, to: null };
  Events.specials.push(fake);
  try {
    check(S.obtainableNow(C.carById('l-taxi')) && shownOnly().join() === 'l-taxi' && count().all === fresh.all + 1, 'an event on now with it as its prize: the Legendary Taxi shows, counted');
    fake.to = Events.now() - 1;
    check(shownOnly().length === 0, 'the event over: hidden again (never owned)');
    fake.to = null;
    check(shownOnly(() => (Progress.data.claimed ||= []).push(Events.prizeKey(fake))).length === 0, 'its prize already won by a save that does not own it: nothing to get, hidden');
  } finally { Events.specials.splice(Events.specials.indexOf(fake), 1); }
  // ---- available: its level open (an earned car taken off `off` and given a level: the owner's switch to make one earnable)
  const suv = C.carById('l-suv'), was = { off: suv.off, earned: suv.earned };
  Object.assign(suv, { off: false, earned: { level: g.levels.LEVELS[0].id, par: { good: 999 } } });
  try { check(shownOnly().join() === 'l-suv', 'not off and earned on an open level: the Legendary SUV shows (it can be earned now)'); }
  finally { Object.assign(suv, was); }
  check(shownOnly().length === 0, 'back off: hidden');

  // ---- Unlock everything: 'all' (the garage's cars only) leaves them hidden; 'abs' owns every car, so all 14 show
  check(shownOnly(() => U.unlockEverything('all')).length === 0, '"Unlock everything" (Everything): the 14 stay hidden (not owned)');
  check(shownOnly(() => U.unlockEverything('abs')).length === LEGENDS.length, '"Absolutely everything": all 14 owned, all shown and counted (' + count().ready + ' / ' + count().all + ')');

  // ---- lists that cannot hold a hidden car: Jim's stall and the packs' roster deal only cars that can be had (so shown)
  Progress.reset();
  const jim = await g.load('jimshop.js');
  const jimPool = Object.values(jim.pool()).flat().map(x => x.car || x).filter(Boolean);
  check(jimPool.length > 0 && jimPool.every(isVisibleCar), "Jim's stall pool (" + jimPool.length + ' cars): none hidden');
  check(P.roster().every(car => !car.hideUnlessAvailable || isVisibleCar(car)), 'the packs\' roster: no hidden car in it');

  // ---- the listing code goes through the one predicate
  const src = (f) => readFileSync('src/delivery/' + f, 'utf8');
  check(/export const showroomCars = \(\) => visibleCars\(/.test(src('showroomData.js')), 'showroomData.js showroomCars (the floor, and every showroom count) is filtered by visibleCars');
  check(/\]\)\]\.filter\(isVisibleCar\);/.test(src('cars.js')), 'cars.js garageCars (the car lot) is filtered by isVisibleCar');
  const sr = src('render/showroom.js') + src('render/showroomphone.js');
  check(!/\.\.\.(CARS|EARNED_CARS|FILLER_CARS|BESPOKE_CARS|EVENT_CARS)\b/.test(sr) && /showroomCars\(\)/.test(src('render/showroom.js')), 'the showroom draws and counts only showroomCars() (no roster of its own)');
  check(/setVisibilityHooks\(\{ available:/.test(src('carsources.js')), 'carsources.js tells cars.js what can be had now (sourcesOf)');
} catch (e) { failures++; console.log('  FAIL  threw: ' + (e.stack || e)); }
console.log(failures ? failures + ' FAILED' : 'all ok');
await g.close?.();
process.exit(failures ? 1 : 0);
