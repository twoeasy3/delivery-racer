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
import { existsSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const g = await boot();
const { Progress } = await g.load('progress.js');
const { COSMETICS, registerCosmetics, cosmeticKeys, isFreeCosmetic, ownsCosmetic, grantCosmetics, ownedCosmetics, reloadCosmetics, clearCosmetics, KEY: OWN_KEY, STOCK_KEY, cosmeticCount, awardCosmetic, onAward, MOST_EACH } = await g.load('render/cosmetics.js');
const { unlockEverything } = await g.load('unlockall.js');
const wheels = await g.load('render/wheelcosmetic.js');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const STORE = 'delivery_racer_progress_backup', cookie = () => document.cookie.split(';')[0];

// the shipped registry
const shipped = cosmeticKeys();
const plateKeys = shipped.filter(k => k.startsWith('plate:'));
check(wheels.WHEEL_SETS.length >= 12 && shipped.length === wheels.WHEEL_SETS.length + plateKeys.length + shipped.filter(k => /^(roof|cargo|wing|kill|underglow|decal):/.test(k)).length && wheels.WHEEL_SETS.every(s => shipped.includes('wheels:' + s.id)), 'the registry holds the ' + wheels.WHEEL_SETS.length + ' wheel sets as wheels:<id> and the plate designs as plate:<id>, props, decals and underglows by their slots (' + shipped.length + ' keys, ' + plateKeys.length + ' plate designs)');
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
check(cosmeticCount('plate', 'fixture-gold') === MOST_EACH && MOST_EACH === 999 && COSMETICS.filter(c => c.earned).every(c => cosmeticCount(c.slot, c.id) === 999), "'abs' gives 999 of every earned item: a real stock, not unlimited (CHECKLIST 437)");
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
  localStorage.removeItem(OWN_KEY); localStorage.removeItem(STOCK_KEY); reloadCosmetics();
  check(ownedCosmetics().length === 0 && !ownsCosmetic('plate', 'fixture-gold') && ownsCosmetic('wheels', 'stock'), 'with its keys gone (the old list and the counts) the fixture is locked again and the free sets are not');
}

// the cleaner, and storage that is broken
{
  localStorage.removeItem(STOCK_KEY);
  const put = (v) => { localStorage.removeItem(STOCK_KEY); localStorage.setItem(OWN_KEY, typeof v === 'string' ? v : JSON.stringify(v)); reloadCosmetics(); return ownedCosmetics(); };
  check(put(['plate:a', 'plate:a', 7, null, '<img>', 'x', 'wheels:ok_1', 'a:' + 'b'.repeat(41)]).join() === 'plate:a,wheels:ok_1', "the list is cleaned: repeats, non-text, bad keys dropped");
  check(put('not json{').length === 0 && put('"text"').length === 0 && put({ a: 1 }).length === 0, 'a broken or wrong-kind value falls back to none');
  check(put(Array.from({ length: 500 }, (_, i) => 'plate:p' + i)).length === 300, 'no more than 300 keys');
  localStorage.removeItem(OWN_KEY); localStorage.removeItem(STOCK_KEY); reloadCosmetics();
  check(ownedCosmetics().length === 0, 'a browser from before has none: default []');
  // a test visit (noSave) holds a grant for the visit and writes nothing
  Progress.noSave = true;
  grantCosmetics([KEY]);
  check(ownsCosmetic('plate', 'fixture-gold') && localStorage.getItem(OWN_KEY) === null && localStorage.getItem(STOCK_KEY) === null, 'a test visit (noSave): granted for the visit, nothing written');
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

// the replay fingerprint: nothing cosmetic in what differs from origin/main, and progress.js untouched
{
  const here = (await import('../vite.config.js')).logicFiles();
  const hashOf = (files, read) => { const h = createHash('sha256'); for (const f of files) h.update(f + '\0' + read(f)); return h.digest('hex').slice(0, 10); };
  const mine = hashOf(here, f => readFileSync('src/delivery/' + f));
  const dir = mkdtempSync(join(tmpdir(), 'main-snapshot-'));
  execSync('git archive origin/main package.json vite.config.js scripts src/delivery | tar -x -C ' + dir); // (scripts: vite.config.js imports scripts/placements-lib.mjs)
  { let up = process.cwd(); while (!existsSync(join(up, 'node_modules')) && dirname(up) !== up) up = dirname(up); symlinkSync(join(up, 'node_modules'), join(dir, 'node_modules')); } // (a worktree finds the repository's node_modules above it)
  const cwd = process.cwd();
  process.chdir(dir);
  const theirFiles = (await import(pathToFileURL(join(dir, 'vite.config.js')).href)).logicFiles();
  const theirs = hashOf(theirFiles, f => readFileSync(join(dir, 'src/delivery', f)));
  process.chdir(cwd);
  console.log('replay logic hash: origin/main ' + theirs + ', this branch ' + mine);
  // (the hash itself moves whenever another merged branch changes a logic file, as the v1.1.148-alpha integration does: what this
  // check holds is that the cosmetics are not why: no logic file that differs from origin/main's is a cosmetic module or names one)
  const differ = here.filter(f => !theirFiles.includes(f) || readFileSync('src/delivery/' + f, 'utf8') !== readFileSync(join(dir, 'src/delivery', f), 'utf8'));
  console.log('logic files that differ from origin/main: ' + (differ.join(', ') || 'none'));
  check(differ.every(f => !/cosmetic|unlockall|loadout/.test(f) && !/cosmetics\.js|unlockall|loadoutstore|loadout\.js/.test(readFileSync('src/delivery/' + f, 'utf8'))), 'no logic file that differs from origin/main is or names a cosmetic module (' + (mine === theirs ? 'the fingerprint is identical, ' + mine : differ.length + ' logic files differ') + ')');
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
// RESET PROGRESS (CHECKLIST 340): the menu's Reset forgets what is owned AND every car's choices (render/loadoutstore.js resetAll)
{
  const menu = readFileSync('src/delivery/render/menu.js', 'utf8');
  const handler = menu.slice(menu.indexOf("getElementById('resetBtn')"), menu.indexOf("getElementById('resetBtn')") + 700);
  check(/clearCosmetics\(\);\s*resetLoadout\(\);/.test(handler) && /import \{ resetAll as resetLoadout \} from '\.\/loadoutstore\.js'/.test(menu), "the menu's Reset progress clears the owned cosmetics and the loadout store (every car's choices)");
  const Store = await g.load('render/loadoutstore.js');
  wheels.setWheelSet('whitewall-silver', 'commuter'); wheels.setWheelSet('whitewall-silver');
  Progress.reset(); clearCosmetics(); Store.resetAll();
  check(wheels.wheelSet('commuter') === 'stock' && wheels.wheelSet() === 'stock' && !Store.customCars().length, '...after it, every car and All cars wear Stock');
}
// ---- EARNED COSMETICS, LIKE CARDS (CHECKLIST 437): 1 = unlocked; equipping takes 1 from the hand, taking it off gives it back, per car ----
{
  Progress.reset(); clearCosmetics();
  const Store = await g.load('render/loadoutstore.js'), stock = await g.load('render/cosmeticstock.js'), P = await g.load('render/platecosmetic.js');
  Store.reloadStore(); Progress.noSave = true;
  const heard = []; const off = onAward(a => heard.push(a));
  const a = awardCosmetic('plate:ev', 2, { source: 'check' });
  check(a && a.key === 'plate:ev' && a.n === 2 && a.count === 2 && heard.length === 1 && awardCosmetic('not a key') === null, 'awardCosmetic (the one entry point): 2 given, the listener told; a bad key refused');
  off();
  check(ownsCosmetic('plate', 'ev') && stock.spare('plate', 'ev') === 2 && !ownsCosmetic('plate', 'hex') && P.setPlateDesign('hex', 'commuter') === false, 'unlocked with 1 or more; x2 in the hand; one not earned cannot be equipped');
  P.setPlateDesign('ev', 'commuter');
  check(stock.spare('plate', 'ev') === 1 && stock.wornBy('plate', 'ev').join() === 'commuter', 'equipped on a car: 1 taken from the hand');
  P.setPlateDesign('ev', 'pickup');
  check(stock.spare('plate', 'ev') === 0, '...a second car takes the second');
  P.setPlateDesign('stock', 'commuter');
  check(stock.spare('plate', 'ev') === 1, 'taken off (back to Stock): back in the hand');
  Store.resetCar('pickup');
  check(stock.spare('plate', 'ev') === 2, 'Reset car: back in the hand');
  P.setPlateDesign('ev', null);
  check(P.plateDesign('commuter') === 'stock' && stock.spare('plate', 'ev') === 2, 'per car only: a design set on All cars is no car\'s (nothing taken)');
  const kill = await g.load('render/killfx.js');
  check(stock.spare('kill', 'classic') === Infinity && ownsCosmetic('plate', 'stock'), 'the free looks (Stock plate, Classic kill effect) are unlimited');
  // a migration: an older All-cars look moved onto the garage cars that followed it, the stock made enough for them
  clearCosmetics(); Store.restore({ v: 1, default: { plate: { design: 'ev', text: 'OLD' } }, cars: {} }); clearCosmetics();
  const moved = stock.migrateStock(), owners = Store.snapshot().cars, onCars = Object.keys(owners).filter(id => owners[id].plate?.design === 'ev');
  check(moved && onCars.length > 0 && Store.snapshot().default.plate?.design === undefined && cosmeticCount('plate', 'ev') === onCars.length && stock.spare('plate', 'ev') === 0 && P.plateText(onCars[0]) === 'OLD', 'migration: an old All-cars plate moved onto the ' + onCars.length + ' garage car(s) that followed it, the stock made that many (none lost), the default keeps its text');
  check(stock.migrateStock() === false, '...once only');
  Progress.noSave = false; clearCosmetics(); Store.reloadStore(); void kill;
}
// ---- the card packs: a pack's `cosmetics` list (packs.json, the owner's to place) awards through awardCosmetic ----
{
  const packs = await g.load('packs.js');
  Progress.reset(); clearCosmetics(); Progress.noSave = true;
  check(Object.values(packs.PACKS).every(p => p.cosmetics === undefined) && packs.packProblems().length === 0, 'no pack carries cosmetics today (where they drop is the owner\'s), and packs.json has no problems');
  check(packs.cosmeticProblems([{ item: 'plate:ev', chance: 2 }, { any: 'plate', item: 'plate:x' }, { n: 0, item: 'x' }, { item: 'plate:ev', z: 1 }]).length >= 4 && !packs.cosmeticProblems([{ item: 'plate:ev' }, { any: 'underglow', chance: 0.5, n: 2 }]).length, 'a pack\'s cosmetics list is checked (item or any, chance 0 to 1, n whole, nothing else)');
  packs.Packs.cosmeticsOverride = [{ item: 'plate:ev', n: 2 }, { item: 'plate:hex', chance: 0 }];
  const r = packs.Packs.open(packs.PACK_IDS[0], { free: true });
  packs.Packs.cosmeticsOverride = null;
  check(r && r.cosmetics.length === 1 && r.cosmetics[0].key === 'plate:ev' && r.cosmetics[0].n === 2 && cosmeticCount('plate', 'ev') === 2 && cosmeticCount('plate', 'hex') === 0 && Progress.data.packLog[0].cosmetics?.[0] === 'plate:ev*2', 'a pack opened: its cosmetic card (chance 1) awarded x2 and logged, the chance-0 one not (' + r.cosmetics.map(x => x.name).join(', ') + ')');
  Progress.noSave = false; clearCosmetics(); Progress.reset();
}
undo();
check(!cosmeticKeys().includes(KEY) && cosmeticKeys().length === shipped.length, 'the fixture is taken out again (nothing shipped changed)');
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
