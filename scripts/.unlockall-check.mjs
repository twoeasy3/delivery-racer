// The Options screen's Unlock everything, in its two modes (src/delivery/unlockall.js):
//   'all' gives exactly Progress.complete() (the save as it always was); 'abs' (ABSOLUTELY everything) is a superset of it:
//   every car owned incl. the `off` earned cars, the Bespoke and concept key cars, every ECU maxed, events done, big bank
//   and Crazey Cash, the cookie still under its cap; and a player who never chose it still has the off cars off.
//   node scripts/.unlockall-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { unlockEverything, everyCarId, setUnlockMode, unlockMode, ABS_BANK, ABS_CASH } = await g.load('unlockall.js');
const { Ecu } = await g.load('ecu.js');
const { Shop } = await g.load('shop.js');
const { LEVELS } = g.levels;
const { CARS, EARNED_CARS, BESPOKE_CARS, CONCEPT_CARS, FILLER_CARS, SECRET_CARS } = g.cars;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const full = (mode) => { Progress.reset(); unlockEverything(mode); return JSON.parse(JSON.stringify(Progress.data)); };

// 'Everything' is Progress.complete(), unchanged
Progress.reset();
Progress.complete({ levels: LEVELS.length, cars: CARS.map(c => c.id), money: g.CONFIG.completeBank });
const plain = JSON.parse(JSON.stringify(Progress.data));
check(JSON.stringify(full('all')) === JSON.stringify(plain), 'mode "all" gives the same save as Progress.complete() (byte for byte)');
check(!plain.cars.some(id => EARNED_CARS.find(c => c.id === id && c.off)), 'after "all", no off car is owned');
const offIds = EARNED_CARS.filter(c => c.off).map(c => c.id);
check(offIds.length >= 14, 'there are off earned cars (' + offIds.length + ')');
Progress.reset(); unlockEverything('all');
check(offIds.every(id => !Progress.owns(id)), 'after "all", the off cars are still not owned');

// the nineteen chosen idea cars (cars.js FEATURE_ROSTER, 15-Oct): blueprint cars in no pack for now. "Everything" must not give them;
// "Absolutely everything" gives every roster car, so it unlocks them (maxed) like the other blueprint cars
Progress.reset(); unlockEverything('all');
check(g.cars.FEATURE_ROSTER.length === 19 && g.cars.FEATURE_ROSTER.every(c => !Progress.owns(c.id) && !Ecu.unlocked(c) && Ecu.reached(c) === 0), 'after "all", none of the 19 feature-roster cars is owned or unlocked (no blueprints)');

// 'abs'
const abs = full('abs');
Progress.data.cars.length; // (Progress.data is the abs save now)
const ids = everyCarId();
check(ids.every(id => Progress.owns(id)), 'abs: every car id owned (' + ids.length + ')');
check(offIds.every(id => Progress.owns(id)), 'abs: every off earned car owned (' + offIds.length + ')');
check(BESPOKE_CARS.every(c => Ecu.hasKey(c)), 'abs: every Bespoke key car has its key (' + BESPOKE_CARS.length + ', concept ' + CONCEPT_CARS.length + ')');
check(Object.keys(SECRET_CARS).every(id => Progress.owns(id)), 'abs: the secrets owned');
const all = [...CARS, ...EARNED_CARS, ...BESPOKE_CARS, ...FILLER_CARS];
check(all.every(c => Ecu.kind(c) === null || Ecu.unlocked(c)), 'abs: every car with an ECU table is unlocked');
check(g.cars.FEATURE_ROSTER.every(c => Ecu.unlocked(c) && Ecu.reached(c) === Ecu.max(c)), 'abs: the 19 feature-roster cars are unlocked at their max ECU, as every roster car is');
check(all.every(c => Ecu.kind(c) === null || Ecu.reached(c) === Ecu.max(c)), 'abs: every car at its max ECU, blueprint cars and key cars included');
check(abs.money === ABS_BANK && Shop.balance() === ABS_CASH, 'abs: bank ' + abs.money + ', Crazey Cash ' + Shop.balance());
check(abs.unlocked >= plain.unlocked && Object.keys(plain.bestTime.good).every(k => k in abs.bestTime.good), 'abs: a superset of "all" (levels, medals)');
check(plain.cars.every(id => abs.cars.includes(id)) && plain.maxed.every(id => abs.maxed.includes(id)), 'abs: every car "all" gives is there too');
const cookie = document.cookie.length;
console.log('abs cookie: ' + cookie + ' bytes of 4096 (room 3600 for the value); ' + abs.cars.length + ' cars owned; local storage ' + localStorage.getItem('delivery_racer_progress_backup').length + ' characters');
check(cookie <= 4096, 'abs: the cookie is under its cap');
check(JSON.parse(decodeURIComponent(document.cookie.split(';')[0].split('=')[1])).cars.length === abs.cars.length, 'abs: the cookie still holds the whole car list');

// the setting is remembered and is not in the way of a reset's fresh save
Progress.reset(); check(unlockMode() === 'all', 'a fresh save is on "Everything"');
setUnlockMode('abs'); check(unlockMode() === 'abs' && JSON.parse(localStorage.getItem('delivery_racer_progress_backup')).unlockMode === 'abs', 'the mode is saved with the other options');
setUnlockMode('junk'); check(unlockMode() === 'all', 'an unknown mode reads as "Everything"');
Progress.reset();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
