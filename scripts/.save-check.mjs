// A check of saved progress (src/delivery/progress.js): that local storage holds the whole save and the cookie only
// the short of it, never over its cap, even for 100 levels and 80 cars (the cap is 4096 bytes:
// every level delivered on both sides, every car owned), and that a save code comes back as it went out.
//   node scripts/.save-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { LEVELS } = g.levels, { CARS, SECRET_CARS } = g.cars;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const cookieSize = (data) => ('delivery_racer_progress=' + encodeURIComponent(JSON.stringify(data))).length;

// a full save: every level, both sides, with times as a run leaves them (unrounded)
Progress.reset();
Progress.complete({ levels: LEVELS.length, cars: [...CARS.map(c => c.id), ...Object.keys(SECRET_CARS)], money: g.CONFIG.completeBank });
let n = 0;
for (const level of LEVELS) for (const side of ['good', 'evil']) Progress.data.bestTime[side][level.id] = 10 + (++n * 7.123456789012345) % 90;
Progress.data.money = 12345.678901234567;
console.log(`${LEVELS.length} levels, ${Progress.data.cars.length} cars`);
const STORE = 'delivery_racer_progress_backup', cookieNow = () => document.cookie.split(';')[0], inCookie = () => JSON.parse(decodeURIComponent(cookieNow().split('=')[1]));
if (Progress.saved) {
  const whole = ('delivery_racer_progress=' + encodeURIComponent(Progress.saved())).length;
  console.log('the whole save, were it a cookie: ' + whole + ' bytes (' + cookieSize(Progress.data) + ' with times as a run leaves them)');
  Progress.save();
  console.log('the cookie as saved now: ' + document.cookie.length + ' bytes; local storage: ' + localStorage.getItem(STORE).length + ' characters');
  check(document.cookie.length <= 4096, 'the cookie is under its cap (4096 bytes)');
  check(localStorage.getItem(STORE) === Progress.saved(), 'local storage holds the whole save');
  check(JSON.parse(localStorage.getItem(STORE)).bestTime.good[LEVELS[0].id] === Math.round(Progress.data.bestTime.good[LEVELS[0].id] * 10) / 10, 'best times saved to 0.1 s');
  check(inCookie().bestTime === undefined && inCookie().stats === undefined && inCookie().unlocked === Progress.data.unlocked && inCookie().cars.length === Progress.data.cars.length, 'the cookie holds what is open, the bank and the cars, and no best times or counters');
  // a save far bigger than the game has: 100 levels on both sides, 80 cars, 60 counters. Saved, and loaded again
  {
    const kept = Progress.saved();
    Progress.reset();
    const big = Progress.data;
    big.unlocked = 100; big.money = 987654.32; big.car = 'car-number-79';
    big.cars = ['commuter', ...Array.from({ length: 79 }, (_, i) => 'car-number-' + (i + 1))];
    for (let i = 0; i < 100; i++) for (const side of ['good', 'evil']) big.bestTime[side]['a-level-called-' + i] = 10 + i * 0.7;
    for (let i = 0; i < 60; i++) big.stats['somethingCounted' + i] = i * 1234.56;
    Progress.save();
    const text = Progress.saved();
    console.log('100 levels and 80 cars: the whole save ' + text.length + ' characters (' + encodeURIComponent(text).length + ' bytes as a cookie); the cookie as saved: ' + document.cookie.length + ' bytes');
    check(document.cookie.length <= 4096, '100 levels and 80 cars: the cookie is still under its cap');
    Progress.reload();
    check(Progress.saved() === text, '...and the whole of it loads again, from local storage');
    localStorage.removeItem(STORE);
    Progress.reload();
    const d = Progress.data;
    check(d.unlocked === 100 && d.money === 987654.32 && d.cars.length === 80 && d.car === 'car-number-79', '...and with local storage gone, the cookie brings back what is open, the bank and every car (' + d.cars.length + ' cars, level ' + d.unlocked + ')');
    check(Object.keys(d.bestTime.good).length === 0 && Object.keys(d.stats).length === 0, '   (best times and counters are not in it: those are lost with local storage)');
    // more cars than any cookie could list: it goes down to the car in use, and still fits
    d.cars = ['commuter', ...Array.from({ length: 600 }, (_, i) => 'a-car-with-a-long-name-' + i)]; d.car = 'a-car-with-a-long-name-7';
    Progress.save();
    check(document.cookie.length <= 4096 && inCookie().car === d.car && inCookie().cars.includes(d.car), '600 cars: the cookie keeps the car in use, and is ' + document.cookie.length + ' bytes');
    Progress.reload();
    check(Progress.data.cars.length === 601, '...while local storage has them all');
    // a cookie from before, holding everything, is still read
    localStorage.removeItem(STORE);
    document.cookie = 'delivery_racer_progress=' + encodeURIComponent(kept) + '; path=/';
    Progress.reload();
    check(Progress.saved() === kept, 'a cookie from before this, holding the whole save, is read as it is');
    Progress.save();
  }
  // a save code, out and back
  const code = Progress.exportCode(), before = Progress.saved();
  console.log('save code: ' + code.length + ' characters');
  Progress.reset();
  check(Progress.data.unlocked === 1, 'reset');
  check(Progress.importCode('  ' + code + '\n') === true, 'the code is taken (spaces round it and all)');
  check(Progress.saved() === before, 'and the save is as it was');
  for (const bad of ['', 'hello', 'DR1.!!!!', 'DR1.' + btoa('[1,2]'), 'DR1.' + btoa('{"unlocked":"x"}')]) {
    const kept = Progress.saved();
    check(Progress.importCode(bad) === false && Progress.saved() === kept, 'refused, nothing changed: ' + JSON.stringify(bad.slice(0, 24)));
  }
  // a code with junk in it is tidied, not trusted
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 5, money: -3, cars: ['sport', 7, 'nosuchcar'], car: 'sport', bestTime: { good: { expressway: 'x', farm: 12.34 } } })));
  check(Progress.data.unlocked === 5 && Progress.data.money === 0, 'a tidied code: levels open ' + Progress.data.unlocked + ', bank ' + Progress.data.money);
  check(Progress.data.cars.includes('commuter') && Progress.data.cars.includes('sport') && !Progress.data.cars.includes(7), 'its cars: ' + Progress.data.cars.join(','));
  check(Progress.data.bestTime.good.expressway === undefined && Progress.data.bestTime.good.farm === 12.34 && !!Progress.data.bestTime.evil, 'its best times: ' + JSON.stringify(Progress.data.bestTime));
  // ...and holds only what a save holds: anything else in the code is dropped, each thing kept is of its kind
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['sport', '<img src=x>'], car: { id: 1 }, junk: 'x'.repeat(500), __proto__x: 1, stats: 'letters', muted: 'yes', touch: 1, raceClass: ['f1'],
    bestTime: { good: { [LEVELS[0].id]: 20, 'no-such-level': 30 }, evil: 'x' } })));
  const kept = JSON.parse(Progress.saved());
  check(kept.junk === undefined && kept.__proto__x === undefined, 'a code\'s unknown fields are dropped (' + Object.keys(kept).length + ' fields saved)');
  check(Object.keys(kept).sort().join() === Object.keys(JSON.parse((Progress.reset(), Progress.saved()))).sort().join(), '...leaving exactly a fresh save\'s fields');
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['sport', '<img src=x>'], car: { id: 1 }, stats: 'letters', muted: 'yes', touch: 1, raceClass: ['f1'], bestTime: { good: { [LEVELS[0].id]: 20, 'no-such-level': 30 }, evil: 'x' } })));
  const d = Progress.data;
  check(d.car === 'commuter' && d.cars.join() === 'commuter,sport', 'its car and cars are plain ids: ' + d.car + ' / ' + d.cars.join());
  check(JSON.stringify(d.stats) === '{}' && d.muted === false && d.touch === null && d.raceClass === 'f1', 'counters, switches and the race class of the wrong kind fall back to a fresh save\'s');
  check(JSON.stringify(d.bestTime) === JSON.stringify({ good: { [LEVELS[0].id]: 20 }, evil: {} }), 'best times only for levels there are');
  check(Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 2, cars: [], junk: 'x'.repeat(30000) }))) === false, 'a code far longer than a save is refused');
}
// a visit from the address bar's test switches (main.js sets Progress.noSave) lends cars and opens levels in
// Progress.data: nothing of it is written, whatever is counted, delivered or bought on the way
{
  Progress.reset();
  Progress.save();
  const stored = () => document.cookie.split(';')[0] + ' | ' + localStorage.getItem('delivery_racer_progress_backup');
  const before = stored();
  Progress.noSave = true;
  Progress.data.cars.push('tank'); // (as ?car=tank does)
  Progress.data.car = 'tank';
  Progress.data.unlocked = LEVELS.length; // (as ?pick does)
  Progress.countSaved = 0;
  Progress.count('packagesLanded'); // (the first count of a run saves at once)
  Progress.levelDone(0, LEVELS[0].id, 500, 12, false);
  Progress.useCar('tank');
  Progress.flush();
  check(stored() === before, 'a test visit (noSave): a count, a delivery and a car change write nothing');
  check(Progress.owns('tank') && Progress.data.unlocked === LEVELS.length, '...while the visit itself has the lent car and the open levels');
  const main = (await import('node:fs')).readFileSync(new URL('../src/delivery/main.js', import.meta.url), 'utf8');
  const list = (main.match(/\[([^\]]*)\]\.some\(key => params\.get\(key\) !== null\)\) Progress\.noSave = true/) || [])[1] || '';
  for (const key of ['autostart', 'hidden', 'test', 'edited', 'pick', 'car', 'ghost']) check(list.includes("'" + key + "'"), 'main.js: ?' + key + ' makes the visit one that saves nothing');
  Progress.reset();
  check(Progress.noSave === false && !Progress.owns('tank'), 'a reset ends it');
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
