// A check of cosmetic OWNERSHIP (src/delivery/render/cosmetics.js: the registry and the owned list in its OWN localStorage key, unlockall.js, CHECKLIST 278).
// Every shipped cosmetic is free, so a FIXTURE (a non-free item registered here, never shipped) stands in for a later one: locked by
// default, unlocked by unlockEverything('abs'), still locked after 'all', kept by a save and a load through local storage, and the
// COOKIE byte-identical with and without it granted (the list is local storage only, not progress.js's save). Also the cleaner, the
// default, the equipped-but-not-owned and the unknown-id fall back to Stock, and that the REPLAY FINGERPRINT (vite.config.js
// logicFiles hash) is the same on origin/main and on this branch, and progress.js is byte-identical to origin/main's.
//   node scripts/.cosmetics-own-check.mjs
import { boot } from './delivery-headless.mjs';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { COSMETICS, registerCosmetics, cosmeticKeys, isFreeCosmetic, ownsCosmetic, grantCosmetics, ownedCosmetics, reloadCosmetics, clearCosmetics, KEY: OWN_KEY } = await g.load('render/cosmetics.js');
const { unlockEverything } = await g.load('unlockall.js');
const wheels = await g.load('render/wheelcosmetic.js');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const STORE = 'delivery_racer_progress_backup', cookie = () => document.cookie.split(';')[0];

// the shipped registry
const shipped = cosmeticKeys();
const plateKeys = shipped.filter(k => k.startsWith('plate:'));
check(wheels.WHEEL_SETS.length === 12 && shipped.length === 12 + plateKeys.length + shipped.filter(k => /^(roof|cargo|wing):/.test(k)).length && wheels.WHEEL_SETS.every(s => shipped.includes('wheels:' + s.id)), 'the registry holds the 12 wheel sets as wheels:<id> and the plate designs as plate:<id> (' + shipped.length + ' keys, ' + plateKeys.length + ' plate designs)');
check(COSMETICS.filter(c => c.slot === 'wheels').every(c => c.free === true) && COSMETICS.filter(c => c.slot === 'plate').some(c => !c.free), 'every wheel set is free; the plate designs are partly locked (CHECKLIST 286)');
Progress.reset(); clearCosmetics();
check(ownedCosmetics().length === 0 && wheels.WHEEL_SETS.every(s => ownsCosmetic('wheels', s.id)), 'a fresh start lists none and owns every free set');
check(!ownsCosmetic('wheels', 'no-such-set') && !ownsCosmetic('plate', 'x'), 'an unknown item is not owned');
check(JSON.stringify(Progress.data).includes('cosmetic') === false, "progress.js's save has no cosmetics field at all");

// the fixture
const undo = registerCosmetics([{ slot: 'plate', id: 'fixture-gold', name: 'Fixture gold plate', free: false }, { slot: 'wheels', id: 'fixture-set', name: 'Fixture wheels', free: false }]);
const KEY = 'plate:fixture-gold';
check(cosmeticKeys().includes(KEY) && !isFreeCosmetic('plate', 'fixture-gold'), 'the fixture is in the registry, not free');
Progress.reset(); clearCosmetics();
check(!ownsCosmetic('plate', 'fixture-gold'), 'locked by default');
unlockEverything('all');
check(!ownsCosmetic('plate', 'fixture-gold') && ownedCosmetics().length === 0, "still locked after unlockEverything('all')");
unlockEverything('abs');
check(ownsCosmetic('plate', 'fixture-gold') && ownsCosmetic('wheels', 'fixture-set'), "unlocked after unlockEverything('abs')");
check(cosmeticKeys().every(k => ownedCosmetics().includes(k)), "'abs' grants every key in the registry (" + ownedCosmetics().length + ', free ones too)');
unlockEverything('abs');
check(new Set(ownedCosmetics()).size === ownedCosmetics().length, 'granting twice does not repeat a key');

// saved and loaded, from local storage (its own key)
const listed = ownedCosmetics();
check(JSON.parse(localStorage.getItem(OWN_KEY)).join() === listed.join() && !localStorage.getItem(STORE).includes('cosmetic'), 'local storage holds the list under ' + OWN_KEY + ', and the progress save does not');
reloadCosmetics(); Progress.reload();
check(ownedCosmetics().join() === listed.join() && ownsCosmetic('plate', 'fixture-gold'), 'a load keeps it');

// the cookie: byte-identical with and without the list
{
  Progress.save();
  const withList = cookie();
  check(!decodeURIComponent(withList).includes('cosmetic'), 'the cookie text has no cosmetics in it (' + withList.length + ' bytes)');
  const saveWith = Progress.saved();
  clearCosmetics();
  Progress.save();
  check(cookie() === withList && Progress.saved() === saveWith, 'the cookie and the whole progress save are byte-identical with the cosmetics granted and without (' + withList.length + ' bytes)');
  grantCosmetics(listed);
  localStorage.removeItem(OWN_KEY); reloadCosmetics();
  check(ownedCosmetics().length === 0 && !ownsCosmetic('plate', 'fixture-gold') && ownsCosmetic('wheels', 'stock'), 'with its key gone the fixture is locked again and the free sets are not');
}

// the cleaner, and storage that is broken
{
  const put = (v) => { localStorage.setItem(OWN_KEY, typeof v === 'string' ? v : JSON.stringify(v)); reloadCosmetics(); return ownedCosmetics(); };
  check(put(['plate:a', 'plate:a', 7, null, '<img>', 'x', 'wheels:ok_1', 'a:' + 'b'.repeat(41)]).join() === 'plate:a,wheels:ok_1', "the list is cleaned: repeats, non-text, bad keys dropped");
  check(put('not json{').length === 0 && put('"text"').length === 0 && put({ a: 1 }).length === 0, 'a broken or wrong-kind value falls back to none');
  check(put(Array.from({ length: 500 }, (_, i) => 'plate:p' + i)).length === 300, 'no more than 300 keys');
  localStorage.removeItem(OWN_KEY); reloadCosmetics();
  check(ownedCosmetics().length === 0, 'a browser from before has none: default []');
  // a test visit (noSave) holds a grant for the visit and writes nothing
  Progress.noSave = true;
  grantCosmetics([KEY]);
  check(ownsCosmetic('plate', 'fixture-gold') && localStorage.getItem(OWN_KEY) === null, 'a test visit (noSave): granted for the visit, nothing written');
  Progress.noSave = false; clearCosmetics(); reloadCosmetics();
  // blocked storage: nothing throws
  const real = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  reloadCosmetics();
  let threw = false;
  try { grantCosmetics([KEY]); ownsCosmetic('plate', 'fixture-gold'); clearCosmetics(); } catch { threw = true; }
  globalThis.localStorage = real; reloadCosmetics();
  check(!threw, 'blocked storage: nothing throws');
}

// the replay fingerprint: the same on origin/main and on this branch, and progress.js untouched
{
  const here = (await import('../vite.config.js')).logicFiles();
  const hashOf = (files, read) => { const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + read(f)); return h.digest('hex').slice(0, 10); };
  const mine = hashOf(here, f => readFileSync('src/delivery/' + f));
  const dir = mkdtempSync(join(tmpdir(), 'main-snapshot-'));
  execSync('git archive origin/main package.json vite.config.js src/delivery | tar -x -C ' + dir);
  symlinkSync(join(process.cwd(), 'node_modules'), join(dir, 'node_modules'));
  const cwd = process.cwd();
  process.chdir(dir);
  const theirFiles = (await import(pathToFileURL(join(dir, 'vite.config.js')).href)).logicFiles();
  const theirs = hashOf(theirFiles, f => readFileSync(join(dir, 'src/delivery', f)));
  process.chdir(cwd);
  console.log('replay logic hash: origin/main ' + theirs + ', this branch ' + mine);
  check(mine === theirs && here.join() === theirFiles.join(), 'the replay fingerprint is identical on origin/main and on this branch (' + mine + ')');
  check(!here.includes('render/cosmetics.js') && !here.includes('cosmetics.js') && !here.includes('unlockall.js') && readFileSync('src/delivery/progress.js', 'utf8') === readFileSync(join(dir, 'src/delivery/progress.js'), 'utf8'), "cosmetics.js is not in the fingerprint's files, and progress.js is byte-identical to origin/main's");
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
  grantCosmetics(['wheels:whitewall-silver']);
  check(wheels.wheelSet() === 'whitewall-silver', '...and owning it brings it back');
  sets.free = true;
  wheels.setWheelSet('stock');
}
// an id that does not exist (a save, a replay or a ghost from another version) wears Stock, never an error
{
  let ok = true;
  try { wheels.setWheelSet('no-such-set'); wheels.setWheelDesign('no-such-design'); wheels.setWheelColour('no-such-colour'); } catch { ok = false; }
  check(ok && wheels.wheelDesign() === 'stock' && wheels.wheelColour() === 'stock' && wheels.wheelSet() === 'stock', 'an unknown set / design / colour id: no error, Stock is worn');
  wheels.setWheelSet('stock');
}
undo();
check(!cosmeticKeys().includes(KEY) && cosmeticKeys().length === shipped.length, 'the fixture is taken out again (nothing shipped changed)');
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
