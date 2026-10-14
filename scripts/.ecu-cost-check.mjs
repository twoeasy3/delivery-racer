// A check of ECU UPGRADES THAT COST BANK (the owner, 14-Oct: "ECU levels should cost bank to upgrade. Collecting the blueprints only
// unblocks the upgrade"; src/delivery/ecu.js price / upgrade / buy / purchased / migrate, CONFIG.ecuCost, progress.js ecuBought):
//   the price table (positive, in whole rounding steps, rising with every step of a car), a purchase takes exactly its price from
//   the bank and never takes it below zero, no purchase above the level the blueprints reached (a key car WITHOUT its key may buy, 14-Oct, and stays locked), blueprints
//   alone no longer raise the ECU a car plays at, an old save (no purchased levels) keeps every car at the ECU it had (and
//   migrating twice changes nothing), the save round trip, "Unlock everything" (both modes), the cookie.
//   node scripts/.ecu-cost-check.mjs            the checks
//   node scripts/.ecu-cost-check.mjs --table    ...and the price of every car's every step
import { boot } from './delivery-headless.mjs';

const g = await boot({ tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Ecu } = await g.load('ecu.js');
  const { Progress } = await g.load('progress.js');
  const { unlockEverything } = await g.load('unlockall.js');
  const { CONFIG } = g;
  const { CARS, FILLER_CARS, EVENT_CARS, EARNED_CARS, BESPOKE_CARS = [], carById } = g.cars;
  const car = (id) => carById(id);
  const all = [...CARS, ...FILLER_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...EARNED_CARS];
  const upgradable = all.filter(c => Ecu.kind(c) && Ecu.max(c) > 1);
  const STORE = 'delivery_racer_progress_backup';
  const fresh = () => { Progress.reset(); Progress.noSave = false; Progress.data.money = 0; };

  // ---- the price table
  const rows = upgradable.map(c => ({ c, steps: Array.from({ length: Ecu.max(c) - 1 }, (_, i) => Ecu.price(c, i + 2)) }));
  const R = CONFIG.ecuCost.round;
  check(rows.every(r => r.steps.every(p => p > 0 && p % R === 0)), 'every price is positive, in whole $' + R + ' (' + rows.length + ' cars with ECUs to buy)');
  check(rows.every(r => r.steps.every((p, i) => i === 0 || p > r.steps[i - 1])), 'each car: every step costs more than the one before');
  check(upgradable.every(c => Ecu.price(c, 1) === 0 && Ecu.price(c, 0) === 0), 'ECU1 is free (price 0)');
  const total = (r) => r.steps.reduce((a, b) => a + b, 0);
  const lot = rows.filter(r => r.c.price > 0);
  const ratios = lot.map(r => total(r) / r.c.price);
  check(Math.min(...ratios) >= 0.1 && Math.max(...ratios) <= 3, 'maxing a car costs between a tenth and three times its own price (' + Math.min(...ratios).toFixed(2) + ' to ' + Math.max(...ratios).toFixed(2) + ' x the car lot price)');
  check(rows.filter(r => r.steps.length >= 4).every(r => r.steps.at(-1) >= 0.2 * r.c.price || !r.c.price), 'the 5-ECU cars\' last step is a real sink (at least a fifth of the car\'s own price)');
  if (process.argv.includes('--table')) {
    const money = (n) => '$' + n;
    for (const r of rows) console.log('   ' + r.c.id.padEnd(14) + String((r.c.blue ? 'B' : 'G') + (r.c.tier ?? '-')).padEnd(4) + 'ECU max ' + Ecu.max(r.c) + '  steps ' + r.steps.map(money).join(' ').padEnd(30) + ' maxing ' + money(total(r)).padEnd(8) + (r.c.price ? ' car price ' + money(r.c.price) + ' (' + (total(r) / r.c.price).toFixed(2) + 'x)' : ''));
  }

  // ---- blueprints alone no longer raise the ECU a car plays at
  fresh();
  const sport = car('sport');
  Progress.data.cars.push('sport');
  check(Ecu.level(sport) === 1 && Ecu.purchased(sport) === 1, 'a key car with its key plays at ECU1');
  Ecu.addBlueprints('sport', 5);
  check(Ecu.reached(sport) === 2 && Ecu.level(sport) === 1, 'blueprints (5): ECU2 reached, still playing at ECU1');
  check(g.cars.carStats(sport).ecu === 1, '...and a run is driven with the ECU1 figures');

  // ---- buying
  let up = Ecu.upgrade(sport);
  check(up.state === 'short' && up.to === 2 && up.price === Ecu.price(sport, 2) && up.short === up.price, 'bank $0: the upgrade is "short" by the whole price ($' + up.price + ')');
  check(Ecu.buy(sport).ok === false && Progress.data.money === 0 && Ecu.level(sport) === 1, '...and buying then does nothing (bank $0, ECU1)');
  Progress.data.money = up.price - 0.01;
  check(Ecu.buy(sport).ok === false && Math.abs(Progress.data.money - (up.price - 0.01)) < 1e-9, 'a cent short: refused, the bank untouched');
  Progress.data.money = up.price + 123.45;
  const done = Ecu.buy(sport);
  check(done.ok && Math.abs(Progress.data.money - 123.45) < 1e-9 && Ecu.level(sport) === 2, 'bought with the bank: exactly $' + up.price + ' taken ($123.45 left), now ECU2');
  check(Ecu.upgrade(sport).state === 'maxed' && Ecu.buy(sport).ok === false, 'sport (2 ECUs) is then maxed: nothing to buy');
  Progress.data.money = 5;
  check(!Ecu.buy(sport).ok && Progress.data.money === 5, 'the bank never goes below zero ($5 stays $5)');

  // a 5-ECU key car: only up to the level its blueprints reached, one step at a time, in order
  fresh();
  const muscle = car('muscle');
  Progress.data.cars.push('muscle'); Progress.data.money = 1e6;
  check(Ecu.upgrade(muscle).state === 'blueprints' && Ecu.upgrade(muscle).need === 5 && !Ecu.buy(muscle).ok && Progress.data.money === 1e6, 'no blueprints: ECU2 needs 5, buying refused, bank untouched');
  Ecu.addBlueprints('muscle', 4);
  check(Ecu.upgrade(muscle).need === 1, '4 blueprints: "needs 1 more"');
  Ecu.addBlueprints('muscle', 1 + 5);
  const b0 = Progress.data.money;
  check(Ecu.buy(muscle).ok && Ecu.level(muscle) === 2 && b0 - Progress.data.money === Ecu.price(muscle, 2), '10 blueprints: ECU2 bought (price ' + Ecu.price(muscle, 2) + ')');
  check(Ecu.buy(muscle).ok && Ecu.level(muscle) === 3 && Ecu.reached(muscle) === 3, '...then ECU3 (the second step)');
  check(!Ecu.buy(muscle).ok && Ecu.level(muscle) === 3 && Ecu.upgrade(muscle).state === 'blueprints', '...and not ECU4 (its blueprints reached 3)');
  Ecu.addBlueprints('muscle', 100);
  while (Ecu.buy(muscle).ok);
  check(Ecu.level(muscle) === 5 && Ecu.upgrade(muscle).state === 'maxed', 'with blueprints for all: bought one step at a time up to ECU5');
  const spent = 1e6 - Progress.data.money;
  check(spent === rows.find(r => r.c.id === 'muscle').steps.reduce((a, b) => a + b, 0), 'the muscle car cost the sum of its steps ($' + spent + ')');

  // a key car without its key (14-Oct, the owner: 'Yes, paid upgrades'): its ECUs CAN be bought, up to what its blueprints reached; it stays locked until the key
  fresh();
  const cl = car('classicgt');
  Progress.data.money = 1e6; Ecu.addBlueprints('classicgt', 50);
  check(Ecu.blueprints('classicgt') === 20 && Ecu.cap(cl) === 20, 'a key car without its key (50 blueprints offered): the cap holds 20, the 5-ECU key car needs no more');
  check(Ecu.reached(cl) === 5 && Ecu.upgrade(cl).state === 'ready' && Ecu.upgrade(cl).to === 2, '...ECU5 reached, the upgrade to ECU2 is "ready" (no "nokey" state any more)');
  const keyless = Ecu.buy(cl);
  check(keyless.ok && Ecu.purchased(cl) === 2 && Progress.data.money === 1e6 - Ecu.price(cl, 2), '...and it can be BOUGHT without the key (ECU2, ' + Ecu.price(cl, 2) + ' from the bank)');
  check(Ecu.level(cl) === 0 && !Ecu.unlocked(cl) && Ecu.lockedWords(cl) === 'Purchase this car from the car lot', '...but it stays locked (level 0, not driveable, "' + Ecu.lockedWords(cl) + '")');
  Ecu.buy(cl); Ecu.buy(cl); Ecu.buy(cl);
  check(Ecu.purchased(cl) === 5 && Ecu.upgrade(cl).state === 'maxed' && Ecu.level(cl) === 0, '...one step at a time to ECU5 bought, still no key, still locked');
  Progress.data.cars.push('classicgt');
  check(Ecu.level(cl) === 5, '...the key arrives: it plays at the ECU bought (5), not at ECU1');
  // only up to the reached level, with or without the key
  fresh();
  Progress.data.money = 1e6; Ecu.addBlueprints('classicgt', 5);
  check(Ecu.buy(cl).ok && !Ecu.buy(cl).ok && Ecu.purchased(cl) === 2 && Ecu.upgrade(cl).state === 'blueprints', 'a keyless key car with 5 blueprints: ECU2 bought, ECU3 refused (blueprints reached 2)');
  fresh();
  Progress.data.cars.push('classicgt'); Progress.data.money = 1e6; Ecu.addBlueprints('classicgt', 5);
  check(Ecu.level(cl) === 1 && Ecu.buy(cl).ok && Ecu.level(cl) === 2, 'with the key: ECU1 free, then ECU2 can be bought');

  // a blueprint car: its first X blueprints unlock it at ECU1 (free), the rest are bought
  fresh();
  const woody = car('woody');
  Progress.data.money = 1e6;
  check(Ecu.level(woody) === 0 && Ecu.upgrade(woody).state === 'locked' && Ecu.upgrade(woody).need === 5 && !Ecu.buy(woody).ok, 'a blueprint car with none: ECU0, locked, "needs 5", cannot be bought');
  Ecu.addBlueprints('woody', 5);
  check(Ecu.level(woody) === 1 && Progress.owns('woody') && Progress.data.money === 1e6, '5 blueprints: unlocked at ECU1 for nothing');
  check(Ecu.upgrade(woody).state === 'blueprints' && Ecu.upgrade(woody).need === 5, '...its ECU2 needs 5 more');
  Ecu.addBlueprints('woody', 5);
  check(Ecu.buy(woody).ok && Ecu.level(woody) === 2, '10: ECU2 bought');

  // a car with nothing to buy
  check(Ecu.upgrade(car('commuter')).state === 'none' && Ecu.upgrade(car('hellrod')).state === 'none', 'a starter and a special car (ECU1 only): nothing to buy');

  // ---- the save: round trip, the code, the cookie
  fresh();
  Progress.data.cars.push('sport', 'muscle'); Progress.data.money = 5000;
  Ecu.addBlueprints('sport', 5); Ecu.addBlueprints('muscle', 15);
  Ecu.buy(sport); Ecu.buy(muscle); Ecu.buy(muscle);
  const code = Progress.exportCode(), text = Progress.saved();
  Progress.reload();
  check(Progress.saved() === text && Ecu.level(sport) === 2 && Ecu.level(muscle) === 3, 'the save read again from local storage: the purchased levels kept (sport 2, muscle 3)');
  Progress.reset();
  check(Progress.importCode(code) && Ecu.level(sport) === 2 && Ecu.level(muscle) === 3 && Ecu.reached(muscle) === 4, 'the save code round trip: purchased levels kept');

  // ---- MIGRATION: an old save has no purchased levels; every car stays at the ECU its blueprints gave it
  const oldSave = (extra) => {
    fresh();
    Progress.data.cars.push('sport', 'muscle', 'hotrod', 'taxi'); Progress.data.money = 777;
    Progress.data.blueprints = { sport: 12, muscle: 10, hotrod: 3, taxi: 99, woody: 12, bubble: 5, classicgt: 8, ...extra }; // (classicgt: no key; woody 12 = ECU2; bubble ECU1)
    Progress.data.maxed = ['commuter', 'taxi'];
    const saved = JSON.parse(Progress.saved());
    delete saved.ecuBought; // (what a save from before the purchases is)
    localStorage.setItem(STORE, JSON.stringify(saved));
    document.cookie = 'delivery_racer_progress=; max-age=0; path=/delivery';
    Progress.reload();
    return saved;
  };
  const before = (ids) => Object.fromEntries(ids.map(id => [id, { reached: Ecu.reached(car(id)), max: Ecu.max(car(id)) }]));
  const ids = ['sport', 'muscle', 'hotrod', 'taxi', 'woody', 'bubble', 'classicgt', 'commuter', 'lovebus'];
  oldSave();
  check(Progress.data.ecuBought === null, 'an old save loads with no purchased levels (null until used)');
  const want = { sport: 2, muscle: 3, hotrod: 1, taxi: 4, woody: 2, bubble: 1, commuter: 1 }; // (what the blueprints gave: taxi is maxed 4; sport 12 = ECU2 of 2)
  const got = Object.fromEntries(Object.keys(want).map(id => [id, Ecu.level(car(id))]));
  check(JSON.stringify(got) === JSON.stringify(want), 'every car stays at the ECU it had: ' + JSON.stringify(got));
  const money0 = Progress.data.money;
  check(money0 === 777 && Progress.data.ecuBought && Object.keys(Progress.data.ecuBought).every(k => !Ecu.maxed(car(k))), 'no charge, no refund (bank $777), a maxed car has no entry');
  check(Ecu.reached(car('classicgt')) === 2 && Ecu.purchased(car('classicgt')) === 2, 'a key car locked with blueprints (8) keeps the ECU they gave once its key is had: purchased 2 (8 blueprints)');
  check(JSON.parse(localStorage.getItem(STORE)).ecuBought && Object.keys(JSON.parse(localStorage.getItem(STORE)).ecuBought).length >= 4, 'the migration was saved at once');
  // idempotent
  const once = Progress.saved();
  check(Ecu.migrate() === false && Progress.saved() === once, 'migrating again changes nothing');
  Progress.reload(); Ecu.migrate();
  check(Progress.saved() === once, '...nor does a reload');
  // blueprints collected after the migration do not raise the ECU
  Ecu.addBlueprints('hotrod', 50);
  check(Ecu.level(car('hotrod')) === 1 && Ecu.reached(car('hotrod')) === 3, '...and later blueprints only unlock: hotrod stays at ECU1 (ECU3 reached) until bought');
  // an old save loaded, then blueprints added BEFORE anything else looked at it
  oldSave();
  Ecu.addBlueprints('muscle', 20);
  check(Ecu.level(car('muscle')) === 3 && Ecu.reached(car('muscle')) === 5, 'blueprints added to a never-migrated save first migrate it: muscle keeps ECU3 (the old 10), not 5');
  // an old save code
  oldSave();
  const oldCode = (() => { const s = JSON.parse(Progress.saved()); delete s.ecuBought; return 'DR1.' + btoa(JSON.stringify(s)); })();
  Progress.reset();
  check(Progress.importCode(oldCode) && Ecu.level(car('muscle')) === 3 && Ecu.level(car('taxi')) === 4, 'an old save code: imported and migrated, every car at its old ECU');
  // a save older than the ECUs (no blueprints, no maxed): every car it owns maxed, as before
  {
    fresh(); Progress.data.cars.push('muscle', 'sport');
    const s = JSON.parse(Progress.saved()); delete s.ecuBought; delete s.blueprints; delete s.maxed;
    localStorage.setItem(STORE, JSON.stringify(s)); Progress.reload();
    check(Ecu.level(car('muscle')) === 5 && Ecu.level(car('sport')) === 2 && Ecu.level(woody) === 0, 'a save from before the ECUs: owned cars at their max, a blueprint car locked (as ever)');
  }
  void before; void ids;

  // ---- "Unlock everything": every car at its max purchased level
  for (const mode of ['all', 'abs']) {
    oldSave();
    Progress.data.cars = ['commuter'];
    unlockEverything(mode);
    const dealt = mode === 'abs' ? all : CARS;
    const short = dealt.filter(c => Ecu.kind(c) && Ecu.purchased(c) !== Ecu.max(c));
    check(short.length === 0, 'Unlock everything (' + mode + '): every car it deals is bought up to its max' + (short.length ? ' (NOT ' + short.map(c => c.id).join(', ') + ')' : ' (' + dealt.length + ' cars)'));
    check(CARS.every(c => Ecu.level(c) === Ecu.max(c)), '   ...and the car lot\'s cars play at their max');
  }
  check(FILLER_CARS.every(c => Ecu.level(c) === Ecu.max(c)), 'abs: the blueprint cars too');
  oldSave(); Progress.data.cars = ['commuter']; unlockEverything('all');
  check(Ecu.purchased(car('woody')) === 2 && Ecu.level(car('bubble')) === 1, 'all: a blueprint car that blueprints had unlocked is bought up to what they reached (woody 2); none is dealt');

  // ---- the cookie: the purchased levels add at most a few hundred bytes, and it stays under its cap
  const cookie = () => document.cookie.split(';')[0];
  fresh(); Progress.save();
  const freshLen = cookie().length;
  Progress.data.cars = ['commuter', ...CARS.map(c => c.id)]; Progress.data.blueprints = {}; Progress.data.ecuBought = {};
  Progress.save(); const noneLen = cookie().length;
  for (const c of CARS) if (Ecu.max(c) > 1) Progress.data.ecuBought[c.id] = Ecu.max(c);
  Progress.save(); const fullLen = cookie().length;
  console.log('   cookie bytes: a fresh save ' + freshLen + '; every lot car owned, no purchases ' + noneLen + '; ... and every lot car bought up to its max ' + fullLen + ' (' + Object.keys(Progress.data.ecuBought).length + ' entries)');
  check(fullLen <= 4096 && fullLen - noneLen <= 1100, 'the cookie with every lot car fully bought is ' + (fullLen - noneLen) + ' bytes more than without, under the 4096 cap (' + fullLen + ')');
  Progress.data.ecuBought = {}; Progress.save();
  const inCookie = JSON.parse(decodeURIComponent(cookie().split('=')[1]));
  const without = (() => { const o = { ...inCookie }; delete o.ecuBought; return 'delivery_racer_progress=' + encodeURIComponent(JSON.stringify(o)); })();
  check('ecuBought' in inCookie && cookie().length - without.length <= 30, 'no purchases: the new field costs ' + (cookie().length - without.length) + ' bytes of cookie');
  // a cookie that is too long drops it with the blueprints (a cookie without them reads as a save from before: nothing taken away)
  Progress.data.cars = ['commuter', ...Array.from({ length: 250 }, (_, i) => 'a-car-with-a-long-name-' + i)];
  Progress.data.blueprints = { sport: 5 }; Progress.data.ecuBought = { sport: 2 };
  Progress.save();
  check(cookie().length <= 4096, 'a very long car list: the cookie is still under its cap (' + cookie().length + ')');
  fresh();

  // ---- 14-Oct FOLLOW-UP (CHECKLIST 286): the ECU UP moment is the PURCHASE's, the blueprint cap, the bars
  // the hooks: a purchase fires 'ecuchange' (render/ecuupgrade.js plays the glow and the cinematic from it); reaching an ECU by blueprints does not
  {
    const heard = [];
    const was = window.dispatchEvent; // (the headless page's window is a stub: its dispatchEvent is wrapped to listen)
    window.dispatchEvent = (e) => { if (e?.type === 'ecuchange') heard.push(e.detail); return was?.call(window, e); };
    fresh();
    Progress.data.cars.push('muscle'); Progress.data.money = 1e6;
    Ecu.addBlueprints('muscle', 5);
    check(Ecu.reached(car('muscle')) === 2 && heard.length === 0, 'blueprints reaching a new ECU fire no ECU UP moment (the glow and cinematic hook stay quiet)');
    Ecu.buy(car('muscle'));
    check(heard.length === 1 && heard[0].car === 'muscle' && heard[0].to === 2 && heard[0].from === 1 && heard[0].max === 5, 'buying it fires it once: ' + JSON.stringify(heard[0]));
    Ecu.buy(car('muscle'));
    check(heard.length === 1, 'a refused purchase (ECU3 needs more blueprints) fires nothing');
    window.dispatchEvent = was;
  }
  // the cap: X per step times the steps (a key car: max - 1 steps, a blueprint car: max steps); none for a car with no ECU or a 1-ECU key car
  {
    const caps = { sport: 5, muscle: 20, classicgt: 20, woody: 10, bubble: 5, midnight: 25, commuter: 0, hellrod: 0, bus: 0 };
    const got = Object.fromEntries(Object.keys(caps).map(id => [id, Ecu.cap(car(id))]));
    check(JSON.stringify(got) === JSON.stringify(caps), 'the cap per car: ' + JSON.stringify(got));
    fresh();
    check(Ecu.addBlueprints('commuter', 5) === 1 && Ecu.blueprints('commuter') === 0 && Ecu.blueprints('bus') === 0 && Ecu.addBlueprints('bus', 3) === 0 && Ecu.blueprints('bus') === 0 && Ecu.capped(car('bus')) && Ecu.capped(car('commuter')), 'a 1-ECU key car (the starter) and a car with no ECU take no blueprints');
    Ecu.addBlueprints('woody', 7); Ecu.addBlueprints('woody', 7);
    check(Ecu.blueprints('woody') === 10 && Ecu.capped(car('woody')) && Ecu.room(car('woody')) === 0, 'a blueprint car stops at its cap (woody 2 ECUs: 10, not 14)');
    Ecu.addBlueprints('midnight', 24);
    check(Ecu.room(car('midnight')) === 1 && Ecu.addBlueprints('midnight', 9) === 5 && Ecu.blueprints('midnight') === 25, 'one blueprint of room left: a stack of 9 gives 1');
    // an over-cap save is read, never rewritten: the display clamps (showroom card, counted), the data stays
    fresh();
    Progress.data.blueprints = { woody: 40, sport: 99 };
    Progress.save(); Progress.reload();
    check(Progress.data.blueprints.woody === 40 && Ecu.counted(car('woody')) === 10 && Ecu.reached(car('woody')) === 2 && Ecu.addBlueprints('woody', 5) === 2 && Progress.data.blueprints.woody === 40,
      'a save with 40 woody blueprints (cap 10): the data stays 40 through a reload and an add, reads as 10, ECU2');
    const D = await g.load('showroomData.js');
    check(D.carCard(car('woody')).blueprints === 10 && D.carCard(car('sport')).blueprints === 5, '...and the showroom card shows the clamped count (10, 5)');
  }
  // the bar: FULL and OVERFILLED while an upgrade is available and not bought (render/barfill.js, the one rule every bar uses)
  {
    const { barFill } = await g.load('render/barfill.js');
    const same = (a, b) => a.pct === b.pct && a.over === b.over && a.full === b.full;
    check(same(barFill({ have: 2, toNext: 5, ecu: 2, bought: 2, max: 5 }), { pct: 40, over: false, full: false }), 'bar: reached = bought: the next step\'s progress as ever (2 of 5 = 40%)');
    check(same(barFill({ have: 2, toNext: 5, ecu: 3, bought: 2, max: 5 }), { pct: 100, over: true, full: true }), 'bar: an ECU reached and not bought: FULL and overfilled (not the next step\'s 40%)');
    check(same(barFill({ have: 0, toNext: 5, ecu: 3, bought: 1, max: 5 }), { pct: 100, over: true, full: true }), 'bar: two steps unbought: still full and overfilled');
    check(same(barFill({ have: 5, toNext: 5, ecu: 5, bought: 4, max: 5 }), { pct: 100, over: true, full: true }), 'bar: the last step reached and not bought: full, overfilled');
    check(same(barFill({ have: 5, toNext: 5, ecu: 5, bought: 5, max: 5 }), { pct: 100, over: false, full: true }), 'bar: the last step bought: full (no overfill)');
    check(same(barFill({ have: 3, toNext: 5, ecu: 0, bought: 0, max: 2 }), { pct: 60, over: false, full: false }), 'bar: a blueprint car part-way to its unlock: 60%');
    check(same(barFill({ have: 0, toNext: 5, ecu: 1, bought: 1, max: 1 }), { pct: 100, over: false, full: true }) && barFill({}).pct === 0, 'bar: a 1-ECU car at its top is full; no figures: empty');
    // the same on real cars: the showroom's card and the pack reveal's / Jim's state
    fresh();
    const D = await g.load('showroomData.js'), P = await g.load('packs.js'), J = await g.load('jimshop.js');
    Progress.data.money = 1e6; Ecu.addBlueprints('classicgt', 5);
    const keyless2 = D.carCard(car('classicgt'));
    check(keyless2.over && keyless2.bought === 1 && keyless2.ecu === 2 && !keyless2.unlocked && keyless2.state === 'locked' && keyless2.upgrade.state === 'ready',
      'a keyless key car with 5 blueprints: the card is locked, its bar over (ECU2 reached, ECU1), the Upgrade block "ready"');
    check(J.stand(car('classicgt')).over === true && J.stand(car('classicgt')).bought === 1, '...Jim\'s stand() says over too');
    Ecu.buy(car('classicgt'));
    const bought2 = D.carCard(car('classicgt'));
    check(!bought2.over && bought2.bought === 2 && J.stand(car('classicgt')).over === false, '...bought: the bar is the next step\'s progress again (not over)');
    Ecu.addBlueprints('classicgt', 3);
    const pr = P.revealProgress([{ car: 'classicgt', n: 3, key: false }]);
    check(pr[0].after.over === false && pr[0].before.over === false && pr[0].after.have === 3, 'the reveal: 3 more blueprints (8 of 20, ECU2 bought): the next step at 3 of 5, no glow-worthy ECU UP');
    Ecu.addBlueprints('classicgt', 2);
    const pr2 = P.revealProgress([{ car: 'classicgt', n: 2, key: false }]);
    check(pr2[0].ecuUp && pr2[0].after.over && pr2[0].after.bought === 2 && pr2[0].after.ecu === 3 && !pr2[0].unlocks, 'the reveal: the 2 blueprints that reach ECU3 -> over (bought 2, reached 3), nothing unlocked');
  }
  // events: the Concept Strike key's 'max ECU' is the BOUGHT level, and the free try drives at it
  {
    fresh();
    const fb = car('fishbowl'); Progress.data.money = 1e9; Ecu.addBlueprints('fishbowl', 20);
    check(Ecu.reached(fb) === 5 && Ecu.purchased(fb) === 1 && !Progress.owns('fishbowl') && Ecu.level(fb) === 0, 'the Fishbowl (a concept key car) with all 20 blueprints, nothing bought: reached 5, bought 1, not owned');
    while (Ecu.buy(fb).ok);
    check(Ecu.purchased(fb) === 5 && Ecu.max(fb) === 5 && !Progress.owns('fishbowl'), '...bought to ECU5 with no key: max ECU is now the bought level');
  }
  fresh();
} finally {
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
  await g.close();
  process.exit(failures ? 1 : 0);
}
