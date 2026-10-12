// A check of what a level (and an event) can be given (the owner, 11-Oct): a car lock (a level's "car": any car, owned
// or not); a list of the cars allowed ("allowedCars": named cars, tiers, a top speed; owned; in place of the tier rule);
// an event's time on the menu (from / to, by the device's clock) and its reward (given once, into the save, and kept
// when the event is gone); and the labels of the levels outside the tiers, counted in the menu's order.
//   node scripts/.levelrules-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const { Progress } = await g.load('progress.js');
const { Tiers } = await g.load('tiers.js');
const cars = g.cars, levels = g.levels, Game = g.Game;
const L = (id) => levels.LEVELS.find(l => l.id === id);
g.CONFIG.progression.tiers = true;
const fresh = () => { Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1; Tiers.sideIsEvil = () => false; };
const on = (level) => { levels.selectSpecial(level); cars.useLevelCar(level.car, level.amphibious); return cars.CAR; };

try {
  // ---- the list of cars allowed
  fresh();
  const only = { ...L('expressway'), id: 'rule-test', allowedCars: { cars: ['sport'] } };
  let car = on(only);
  const rule = cars.carRule();
  check(rule?.list && car.id === 'null-car' && !cars.carAllowed() && /Sport/i.test(car.ruleLabel || ''), 'a level that allows only the Sport, none owned: no car to start in, the card says which (' + car.ruleLabel + ')');
  Progress.data.cars.push('sport');
  car = on(only);
  check(car.id === 'sport' && cars.carAllowed() && cars.carAllowedOn(cars.carById('sport')) && !cars.carAllowedOn(cars.carById('commuter')), 'the Sport bought: the level puts the player in it; the Commuter not allowed');
  car = on({ ...only, id: 'rule-tiers', allowedCars: { tiers: [1] } });
  check(car.id === 'commuter', 'allowed: the cars of tier 1 (the Commuter, the pick: ' + car.id + ')');
  car = on({ ...only, id: 'rule-speed', allowedCars: { maxSpeed: 24 } });
  check(car.id === 'commuter' && !cars.carAllowedOn(cars.carById('sport')), 'allowed: any car no faster than 24 m/s (the Commuter yes, the Sport no)');
  // in place of the tier rule: a tier 7 level that lists tier 1 is driven in a tier 1 car
  const seventh = Tiers.tiers[6][1];
  check(Tiers.restriction(seventh, false) === 7, '(a tier 7 level, unbeaten: the tier rule wants a tier 7 car)');
  car = on({ ...seventh, allowedCars: { tiers: [1] } });
  check(car.id === 'commuter' && cars.carAllowed() && cars.restrictedTier() === null, 'with a list of its own, the list holds instead: a tier 1 car');
  // the car picked for the level's list is kept apart, by the level, and survives the save's round trip
  on(only);
  Progress.data.cars.push('ute');
  const allowsBoth = { ...only, id: 'rule-both', allowedCars: { cars: ['sport', 'ute'] } };
  on(allowsBoth);
  cars.selectCar('ute');
  check(Progress.data.tierCars['rule-both'] === 'ute' && cars.CAR.id === 'ute', 'a car picked for a level with a list: kept for that level (' + JSON.stringify(Progress.data.tierCars) + ')');
  const code = Progress.exportCode();
  check(Progress.importCode(code) && Progress.data.tierCars['rule-both'] === 'ute', '...and kept through the save code (the tier cars were all dropped before: a lost backslash)');
  Progress.noSave = true;
  // ---- the garage on a level with a list: every car it lists parked and drawn, owned or not; for sale only what the
  // player could buy anyway (its tier open): a car of a tier not reached, an earned car, one switched off, drawn but
  // not to be bought or picked (the owner, 11-Oct); an idea in the ideas lot, not here
  fresh();
  on(L('christmas'));
  const lot = cars.garageCars(), has = (id) => lot.some(c => c.id === id), car_ = (id) => cars.carById(id);
  check(['commuter', 'lovebus', 'sport', 'towtruck', 'sixbysix', 'floatvan', 'tank', 'hellrod', 'earned-ufo', 'courier'].every(has) && !has('milkfloat'),
    'Christmas Eve\'s garage parks all it lists (but the Milk Float, a blueprint car still locked: ecu.js): ' + L('christmas').allowedCars.cars.filter(has).join(' '));
  check(['towtruck', 'sixbysix', 'hellrod', 'courier'].every(id => cars.carPreview(car_(id)) === 'show'), '...each drawn in full, a tier not reached or not (no silhouettes)');
  const unsold = ['lovebus', 'towtruck', 'sixbysix', 'hellrod', 'earned-ufo', 'courier'].filter(id => cars.forSale(car_(id)));
  check(cars.forSale(car_('junker')) && cars.forSale(car_('tank')) && !unsold.length,
    'on a new save, for sale only what the garage sells anyway (tier 1, and the Tank, in no tier): not the Love Bus (tier 2), the Tow Truck (8), the 6x6 (10), the earned cars' + (unsold.length ? ' (for sale: ' + unsold.join(' ') + ')' : ''));
  Progress.data.unlocked = 99; Progress.data.tierBase = 99; // (every tier open)
  check(cars.forSale(car_('sixbysix')) && cars.forSale(car_('lovebus')) && !cars.forSale(car_('hellrod')), 'every tier open: the 6x6 and the Love Bus for sale; the Hell Rod never');
  fresh();
  levels.selectLevel(0); cars.useLevelCar(null, false);
  check(!cars.garageCars().some(c => c.id === 'hellrod') && cars.carPreview(car_('sixbysix')) === 'hide', 'on Expressway (no list): neither parked, as before');
  // ---- the car lock: any car, owned or not, ahead of the list
  car = on({ ...only, id: 'lock-test', car: 'hellrod' });
  check(car.id === 'hellrod' && !Progress.owns('hellrod') && cars.carRule() === null && cars.carAllowed(), 'a car lock (the Hell Rod, not owned): driven in it, no car rule');

  // ---- the events: on the menu between from and to, by the clock; the reward, once, into the save
  fresh();
  const xmas = L('christmas'), entry = Tiers.eventOf(xmas), now = Date.now(), clock = Tiers.now, times = { from: entry.from, to: entry.to };
  Object.assign(entry, { from: null, to: null });
  check(entry && Tiers.eventLive(xmas) && Tiers.isOpen(xmas), 'Christmas Eve, given no times: on, and open');
  Object.assign(entry, { from: now + 3600e3, to: now + 7200e3 });
  check(!Tiers.eventLive(xmas) && !Tiers.isOpen(xmas) && !Tiers.liveEvents().length, 'starting in an hour: not on yet, not open');
  Tiers.now = () => now + 5400e3;
  check(Tiers.eventLive(xmas) && Tiers.isOpen(xmas), 'half way through: on');
  Tiers.now = () => now + 7200e3;
  check(!Tiers.eventLive(xmas) && !Tiers.isOpen(xmas), 'at its end: off');
  Tiers.now = () => now + 5400e3;
  entry.reward = { car: 'sport', money: 500 };
  const bank = Progress.data.money;
  const words = 'the ' + cars.carById('sport').name + ' and $500';
  check(Tiers.rewardWords(xmas) === words && !Tiers.rewardClaimed(xmas), 'its reward: ' + Tiers.rewardWords(xmas));
  // delivered (a finish straight away: the results say it)
  levels.selectLevel(levels.LEVELS.indexOf(xmas));
  Game.evil = false;
  Game.start();
  Game.finish('delivered');
  check(Progress.owns('sport') && Progress.data.money === bank + 500 + Math.max(0, Game.tip + Game.cash - Game.fines) && Tiers.rewardClaimed(xmas),
    'delivered (Game.finish): ' + words + ' given ($' + bank + ' to $' + Progress.data.money + ', the tip with it)');
  Game.toMenu();
  const after = Progress.data.money;
  check(Tiers.claimReward(xmas) === '' && Progress.data.money === after, 'delivered again: nothing more');
  // the event over and gone from the list: the reward stays
  entry.reward = null;
  Tiers.now = () => now + 99999e3;
  check(Progress.owns('sport') && Progress.data.claimed.includes('event-christmas') && Progress.importCode(Progress.exportCode()) && Progress.owns('sport') && Progress.data.claimed.includes('event-christmas'),
    'the event over and its entry gone: the Sport still owned, the claim kept (through the save code too)');
  Progress.noSave = true;
  Tiers.now = clock;
  Object.assign(entry, times);

  // ---- the labels outside the tiers: in the menu's order, one count a kind, no gaps
  const outside = Tiers.outside.filter(l => !levels.isRace(l)).map(l => levels.levelLabel(levels.LEVELS.indexOf(l)));
  const s = outside.filter(x => x.startsWith('S')), a = outside.filter(x => x.startsWith('A'));
  check(s.every((x, i) => x === 'S' + (i + 1)) && a.every((x, i) => x === 'A' + (i + 1)) && s.length + a.length === outside.length,
    'outside the tiers: ' + outside.join(' '));
  check(levels.levelLabel(levels.LEVELS.indexOf(xmas)) === 'E1', 'the event: E1');
  check(Tiers.problems().length === 0, 'tiers.json sound: ' + (Tiers.problems().join('; ') || 'yes'));
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
