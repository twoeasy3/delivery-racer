// A check of the showroom's cards (src/delivery/showroomData.js; drawn by render/showroom.js): every car is on the
// floor once, the ECU pips are within the car's maximum, the blueprint bar within its step, and a car that cannot be
// driven says why in the owner's words ("You need the key to drive this car", "Purchase this car from the car lot").
// It reads ecu.js (Ecu) through the cards, so it holds for the real tables, not a copy of them.
//   node scripts/.showroom-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot(); // (owns the Commuter, the Sportscompact and the Float Van)
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { showroomCars, carCard, LOCKED_WORDS, RARITIES, rarityOf } = await g.load('showroomData.js');
  const { Ecu } = await g.load('ecu.js');
  const { Progress } = await g.load('progress.js');
  const { CARS, EARNED_CARS, EVENT_CARS, carById } = g.cars;
  check(LOCKED_WORDS.key === 'You need the key to drive this car' && LOCKED_WORDS.lot === 'Purchase this car from the car lot', 'the locked words are the owner\'s');
  const floor = showroomCars(), ids = floor.map(car => car.id);
  check(new Set(ids).size === ids.length, 'every car on the floor once (' + ids.length + ')');
  check(CARS.every(car => ids.includes(car.id)) && EVENT_CARS.every(car => ids.includes(car.id)), 'every garage car and event car is there');
  check(EARNED_CARS.every(car => ids.includes(car.id) === !car.off), 'the earned cars, but not one that is off (the Courier Special)');
  // every card: pips within the maximum, blueprints within the step, a reason exactly when it is locked
  const cards = floor.map(car => carCard(car));
  const bad = cards.filter(c => !(c.max >= 1 && c.ecu >= 0 && c.ecu <= c.max && c.have >= 0 && c.have <= c.toNext && c.toNext >= 1)
    || (c.state === 'locked') !== !!c.reason || !RARITIES[c.rarity] || !(c.stats.maxSpeed > 0 && c.stats.respawn > 0 && c.maxStats.maxSpeed >= c.stats.maxSpeed - 1e-9));
  check(!bad.length, 'every card in range: ECU 0..max, blueprints 0..step, figures, a rarity, a reason only when locked' + (bad.length ? ' (not: ' + bad.map(c => c.id).join(', ') + ')' : ''));
  check(cards.every(c => !c.unlocked || c.ecu >= 1), 'a car that can be driven is at ECU1 or more');
  const say = (c) => c.id + ': ECU ' + c.ecu + '/' + c.max + ', blueprints ' + c.have + '/' + c.toNext + ', ' + c.state + (c.reason ? ' ("' + c.reason + '")' : '') + ', ' + c.rarity;
  // a few cars, said out
  const commuter = carCard(carById('commuter')), sport = carCard(carById('sport')), hotrod = carCard(carById('hotrod'));
  console.log('        ' + say(commuter) + '\n        ' + say(sport) + '\n        ' + say(hotrod));
  check(commuter.unlocked && commuter.state === 'ready' && commuter.ecu === commuter.max, 'the Commuter (a starter, owned): ready, maxed');
  check(!hotrod.unlocked && hotrod.reason === LOCKED_WORDS.lot, 'the Hot Rod (a car lot car not bought): "' + LOCKED_WORDS.lot + '"');
  const hellrod = carCard(carById('hellrod'));
  console.log('        ' + say(hellrod));
  check(!hellrod.unlocked && hellrod.reason === LOCKED_WORDS.key && hellrod.max === 1 && !hellrod.upgradable && hellrod.rarity === 'special', 'the Hell Rod (a special car, not earned): "' + LOCKED_WORDS.key + '", ECU1 at most, no blueprints');
  // blueprints for a locked car lot car count before its key (the owner, 12-Oct): the bar moves, the car stays locked
  (Progress.data.blueprints ||= {}).hotrod = 1;
  const hotrod1 = carCard(carById('hotrod'));
  check(Ecu.blueprints('hotrod') === 1 && (hotrod1.have > hotrod.have || hotrod1.ecu > hotrod.ecu) && hotrod1.state === 'locked', 'a blueprint for the locked Hot Rod moves its bar, and it stays locked (' + say(hotrod1) + ')');
  // a blueprint car (a filler, `evergreen`), if the roster has one: locked until its first step of blueprints, then ECU1
  const filler = floor.find(car => car.evergreen);
  if (filler) {
    Progress.data.blueprints[filler.id] = 0;
    const before = carCard(filler);
    Progress.data.blueprints[filler.id] = before.perEcu;
    const after = carCard(filler);
    console.log('        ' + say(before) + '\n        ' + say(after));
    check(before.blueprint && before.state === 'locked' && /blueprint/.test(before.reason) && before.ecu === 0, 'the ' + filler.name + ' (a blueprint car) with none: locked, ECU0, and says how many blueprints');
    check(after.unlocked && after.ecu === 1, 'with its first step of blueprints: unlocked at ECU1');
  } else console.log('  (no blueprint car on the floor yet: the filler cars are not in this tree)');
  // rarity by the ladder (where a car says none of its own)
  const gold5 = CARS.find(car => car.tier === 5 && !car.blue && !car.amphibious && !car.rarity), blue5 = CARS.find(car => car.tier === 5 && car.blue && !car.rarity);
  check((!gold5 || rarityOf(gold5) === 'uncommon') && (!blue5 || rarityOf(blue5) === 'epic') && ['epic', 'legendary'].includes(rarityOf(EVENT_CARS[0])), 'rarity by the ladder: 5 gold uncommon, 5 blue epic, an event car epic or better');
  // ---- the side (Good / Evil, one choice in the header and the detail): the cards' car rule is that side's, the
  // button says the side, and DRIVE sets the car AND the side, as the car lot's "Drive it as Evil" does
  const { driveWords, barredWhy, driveAs, sideName } = await g.load('showroomData.js');
  const { Tiers } = await g.load('tiers.js');
  const { Game } = g;
  g.CONFIG.progression.tiers = true;
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1;
  Progress.data.cars.push('sport');
  const first = Tiers.tiers[0][0];
  g.select(first.id);
  Progress.data.bestTime.good[first.id] = 5; // (Good's medal earned there: Good free, Evil still held to a tier 1 car)
  Game.evil = false;
  const sportCar = carById('sport'), commuterCar = carById('commuter');
  const onGood = carCard(sportCar, false), onEvil = carCard(sportCar, true);
  console.log('        ' + first.id + ': sport on Good ' + onGood.state + ' ("' + driveWords(onGood, false) + '"), on Evil ' + onEvil.state + ' ("' + driveWords(onEvil, true) + '")');
  check(sideName(false) === 'Good' && sideName(true) === 'Evil', 'the sides are called Good and Evil');
  check(onGood.state === 'ready' && driveWords(onGood, false) === 'Drive as Good', 'Good free: the Sportscompact is ready, the button says "Drive as Good"');
  check(onEvil.state === 'barred' && onEvil.rule?.tier === 1 && driveWords(onEvil, true) === 'Not on this level as Evil', 'Evil held to tier 1: the same car is barred on Evil, "Not on this level as Evil"');
  const why = barredWhy(onEvil, true);
  console.log('        why: ' + why.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(''));
  check(/^As Evil, the level picked needs a /.test(why[0]) && why[1]?.tier === 1, 'the barred words name the side and the tier wanted');
  check(driveAs(onEvil, true) === false && Game.evil === false, 'DRIVE on the barred side does nothing (the side played stays Good)');
  const commuterEvil = carCard(commuterCar, true);
  check(commuterEvil.state === 'ready' && driveWords(commuterEvil, true) === 'Drive as Evil', 'the Commuter (tier 1) on Evil: ready, "Drive as Evil"');
  check(driveAs(commuterEvil, true) === true && Game.evil === true && Progress.data.evil === true && g.cars.carInUse().id === 'commuter', 'DRIVE as Evil: the side played is Evil (and saved), the Commuter in use');
  const sportGood = carCard(sportCar, false);
  check(driveAs(sportGood, false) === true && Game.evil === false && Progress.data.evil === false && g.cars.carInUse().id === 'sport', 'DRIVE as Good: back to Good, the Sportscompact in use');
  const lockedCard = carCard(carById('hotrod'), false);
  check(lockedCard.state === 'locked' && driveAs(lockedCard, false) === false && /^(Buy at|Locked)/.test(driveWords(lockedCard, false)), 'a locked car: DRIVE does nothing, the button says buy or locked ("' + driveWords(lockedCard, false) + '")');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await g.close?.();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
