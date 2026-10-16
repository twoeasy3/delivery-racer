// A check of the BETTER RIDE NUDGE (render/rides.js, shown by render/ridenudge.js; a prototype behind ?nudge: NEW-PLAYER-IDEAS.md),
// headless: the switch (off unless asked; ?nudge=on remembered, ?nudge=off forgotten), what it offers a new save after level 1
// (the Junker for Back Roads) and level 2 (the Darkvan for Farm Lanes) as the bank and the garage change, that it leaves a player
// already in the car (or a better one) alone, that its bars only name what the ride does better, and that neither it nor the
// Driving Lesson's prompts are part of the replays' rules (vite.config.js logicFiles).
//   node scripts/.ridenudge-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { nudgeOn, nudgeFor, betterStats, KEY, RIDES } = await g.load('render/rides.js');
  const { carById } = g.cars, P = g.progress;
  const level = (id) => g.levels.LEVELS.find(l => l.id === id);
  // ---- the switch ----
  localStorage.removeItem(KEY);
  check(nudgeOn('') === false, 'off by default');
  check(nudgeOn('?nudge') === true && localStorage.getItem(KEY) === null, '?nudge: on for the visit, nothing remembered');
  check(nudgeOn('?nudge=on') === true && nudgeOn('') === true, '?nudge=on: remembered');
  check(nudgeOn('?nudge=off') === false && nudgeOn('') === false, '?nudge=off: forgotten');
  // ---- a brand-new save, level by level ----
  Object.assign(P.data, { money: 0, cars: ['commuter'], car: 'commuter', bestTime: { good: {}, evil: {} }, tierCars: {}, tierBase: 1, unlocked: 1 });
  g.cars.selectCar('commuter');
  const commuter = carById('commuter'), junker = carById('junker'), darkvan = carById('darkvan');
  check(nudgeFor(level('expressway'), commuter) === null, 'Expressway (level 1): no nudge, the Commuter is the car for it');
  let n = nudgeFor(level('back-roads'), commuter);
  check(n?.ride.id === 'junker' && n.offer === 'short' && n.short === junker.price, `Back Roads, $0 in the bank: the Junker, $${n?.short} short`);
  P.data.money = 50; // (level 1's tip)
  n = nudgeFor(level('back-roads'), commuter);
  check(n?.offer === 'buy', 'Back Roads, $50 (level 1\'s tip): Buy the Junker');
  check(P.buy(junker) && P.data.money === 20, 'bought: $20 left');
  n = nudgeFor(level('back-roads'), commuter);
  check(n?.offer === 'use', 'owned, still in the Commuter: Use it');
  check(nudgeFor(level('back-roads'), junker) === null, 'in the Junker: no nudge on Back Roads');
  n = nudgeFor(level('farm'), junker);
  check(n?.ride.id === 'darkvan' && n.offer === 'short' && n.short === darkvan.price - 20, `Farm Lanes in the Junker, $20: the Darkvan, $${n?.short} short`);
  P.data.money = 20 + 40 + 20; // (level 2's tip and $20 of cash)
  check(nudgeFor(level('farm'), junker)?.offer === 'buy', 'Farm Lanes, $80 after level 2 (its tip and $20 of cash): Buy the Darkvan');
  check(nudgeFor(level('farm'), darkvan) === null && nudgeFor(level('farm'), carById('sport')) === null, 'in the Darkvan, or a car it does not better: no nudge');
  check(Object.keys(RIDES).every(id => level(id)) && Object.values(RIDES).every(r => carById(r.car)), 'every ride names a real level and car');
  // ---- the bars: only what the ride does better, top speed first ----
  const bars = (a, b) => betterStats(a, b).map(s => s.label + ' ' + s.from + '>' + s.to).join(', ');
  const cj = betterStats(commuter, junker), jd = betterStats(junker, darkvan);
  check(cj[0]?.label === 'Top speed' && cj.every(s => s.to > s.from), 'Commuter to Junker: ' + bars(commuter, junker));
  check(jd.length >= 1 && jd.every(s => s.label !== 'Top speed' && s.to > s.from), 'Junker to Darkvan (no faster: not claimed): ' + bars(junker, darkvan));
  // ---- not part of the rules ----
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /render\/|rides|ridenudge|lessoncue/.test(f)) && files.includes('levels.js'),
    `the replays' rules (${files.length} files) leave out render/rides.js, render/ridenudge.js, render/lessoncue.js`);
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await g.close();
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
