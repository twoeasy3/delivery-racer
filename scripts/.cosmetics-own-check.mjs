// A check of cosmetic OWNERSHIP (src/delivery/cosmetics.js registry, Progress.data.cosmetics, Progress.ownsCosmetic, unlockall.js, CHECKLIST 278).
// Every shipped cosmetic is free, so a FIXTURE (a non-free item registered here, never shipped) stands in for a later one: locked by
// default, unlocked by unlockEverything('abs'), still locked after 'all', kept by a save and a load through local storage, and the
// COOKIE byte-identical with and without it granted (the list is local storage only). Also the cleaner, the old-save default,
// the equipped-but-not-owned fall back to Stock.
//   node scripts/.cosmetics-own-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { COSMETICS, registerCosmetics, cosmeticKeys, isFreeCosmetic } = await g.load('cosmetics.js');
const { unlockEverything } = await g.load('unlockall.js');
const wheels = await g.load('render/wheelcosmetic.js');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const STORE = 'delivery_racer_progress_backup', cookie = () => document.cookie.split(';')[0];

// the shipped registry
const shipped = cosmeticKeys();
check(wheels.WHEEL_SETS.length === 12 && shipped.length === 12 && wheels.WHEEL_SETS.every(s => shipped.includes('wheels:' + s.id)), 'the registry holds the 12 wheel sets as wheels:<id> (' + shipped.length + ' keys)');
check(COSMETICS.every(c => c.free === true), 'every shipped cosmetic is free');
Progress.reset();
check(Progress.data.cosmetics.length === 0 && wheels.WHEEL_SETS.every(s => Progress.ownsCosmetic('wheels', s.id)), 'a fresh save lists none and owns every free set');
check(!Progress.ownsCosmetic('wheels', 'no-such-set') && !Progress.ownsCosmetic('plate', 'x'), 'an unknown item is not owned');

// the fixture
const undo = registerCosmetics([{ slot: 'plate', id: 'fixture-gold', name: 'Fixture gold plate', free: false }, { slot: 'wheels', id: 'fixture-set', name: 'Fixture wheels', free: false }]);
const KEY = 'plate:fixture-gold';
check(cosmeticKeys().includes(KEY) && !isFreeCosmetic('plate', 'fixture-gold'), 'the fixture is in the registry, not free');
Progress.reset();
check(!Progress.ownsCosmetic('plate', 'fixture-gold'), 'locked by default');
unlockEverything('all');
check(!Progress.ownsCosmetic('plate', 'fixture-gold') && Progress.data.cosmetics.length === 0, "still locked after unlockEverything('all')");
unlockEverything('abs');
check(Progress.ownsCosmetic('plate', 'fixture-gold') && Progress.ownsCosmetic('wheels', 'fixture-set'), "unlocked after unlockEverything('abs')");
check(cosmeticKeys().every(k => Progress.data.cosmetics.includes(k)), "'abs' grants every key in the registry (" + Progress.data.cosmetics.length + ', free ones too)');
unlockEverything('abs');
check(new Set(Progress.data.cosmetics).size === Progress.data.cosmetics.length, 'granting twice does not repeat a key');

// saved and loaded, from local storage
const listed = [...Progress.data.cosmetics];
Progress.save();
check(JSON.parse(localStorage.getItem(STORE)).cosmetics.join() === listed.join(), 'local storage holds the list');
Progress.reload();
check(Progress.data.cosmetics.join() === listed.join() && Progress.ownsCosmetic('plate', 'fixture-gold'), 'a save and a load keep it');

// the cookie: byte-identical with and without the list
{
  const withList = cookie();
  check(!decodeURIComponent(withList).includes('cosmetic'), 'the cookie text has no cosmetics in it (' + withList.length + ' bytes)');
  Progress.data.cosmetics = [];
  Progress.save();
  check(cookie() === withList, 'the cookie is byte-identical with the cosmetics granted and without (' + withList.length + ' bytes)');
  Progress.grantCosmetics(listed);
  Progress.save();
  check(cookie() === withList && cookie().length === withList.length, '...and granted again');
  check(JSON.parse(localStorage.getItem(STORE)).cosmetics.length === listed.length, '...while local storage has the list again');
  // with local storage gone, the cookie brings back the save but not the cosmetics: locked again (not free), the free sets still free
  localStorage.removeItem(STORE);
  Progress.reload();
  check(Progress.data.cosmetics.length === 0 && !Progress.ownsCosmetic('plate', 'fixture-gold') && Progress.ownsCosmetic('wheels', 'stock'), 'with local storage gone the cookie has no cosmetics: the fixture is locked, the free sets are not');
}

// the cleaner and an old save
{
  const mk = (cosmetics) => { Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 2, cars: ['commuter'], cosmetics }))); return Progress.data.cosmetics; };
  check(mk(['plate:a', 'plate:a', 7, null, '<img>', 'x', 'wheels:ok_1', 'a:' + 'b'.repeat(41)]).join() === 'plate:a,wheels:ok_1', 'a code\'s cosmetics are cleaned: repeats, non-text, bad keys dropped');
  check(mk('not a list').length === 0 && mk({ a: 1 }).length === 0, 'a list of the wrong kind falls back to none');
  check(mk(Array.from({ length: 500 }, (_, i) => 'plate:p' + i)).length === 300, 'no more than 300 keys');
  localStorage.setItem(STORE, JSON.stringify({ unlocked: 4, money: 5, cars: ['commuter'], car: 'commuter' })); // (a save from before)
  Progress.reload();
  check(Array.isArray(Progress.data.cosmetics) && Progress.data.cosmetics.length === 0 && Progress.data.unlocked === 4, 'a save from before has none: default []');
  localStorage.setItem(STORE, JSON.stringify({ unlocked: 4, cars: ['commuter'], cosmetics: 'junk' }));
  Progress.reload();
  check(Progress.data.cosmetics.length === 0, 'a broken list in a stored save cannot break the game');
}

// an equipped set that is not owned wears Stock (the saved ids stay, so owning it again brings it back)
{
  Progress.reset();
  const gone = registerCosmetics([{ slot: 'wheels', id: 'whitewall-silver', name: 'x', free: false }]); // (already registered free: this repeat is ignored)
  check(isFreeCosmetic('wheels', 'whitewall-silver'), 'a repeat registration of a key is ignored');
  gone();
  wheels.setWheelSet('whitewall-silver');
  check(wheels.wheelSet() === 'whitewall-silver' && wheels.wheelDesign() === 'whitewall', 'an owned set is worn');
  const sets = COSMETICS.find(c => c.slot === 'wheels' && c.id === 'whitewall-silver');
  sets.free = false; // (as if the set were made a paid one)
  check(wheels.wheelSet() === 'stock' && wheels.wheelDesign() === 'stock' && wheels.wheelColour() === 'stock', 'equipped but not owned: Stock is worn');
  Progress.grantCosmetics(['wheels:whitewall-silver']);
  check(wheels.wheelSet() === 'whitewall-silver', '...and owning it brings it back');
  sets.free = true;
  wheels.setWheelSet('stock');
}
undo();
check(!cosmeticKeys().includes(KEY) && cosmeticKeys().length === 12, 'the fixture is taken out again (nothing shipped changed)');
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
