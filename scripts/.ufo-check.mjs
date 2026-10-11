// A check of the UFO air strike (a mystery effect: ufostrike.js, CONFIG.ufoStrike), headless: on Night Drive the
// saucer is called in four times. What the strike is meant to do, each of which is checked: nothing burns while
// the saucer comes in and hovers; as it leaves, every vehicle on the road is set alight; each of those burns
// faster and faster, smoking within a second or so, and is wrecked 2.5 to 5 s later unless it has left the road
// by then; and nothing that turns up afterwards burns. Seeded, so a run repeats (--seed=n: other dice).
//   node scripts/.ufo-check.mjs
import { boot } from './delivery-headless.mjs'; // (the game's logic and the stand-in page it needs: this used to make
// a stand-in of its own, which fell behind the game (no querySelectorAll) and died before anything ran)

// Math.random, seeded (mulberry32, as scripts/delivery-smoke.mjs)
let state = Number((process.argv.find(a => a.startsWith('--seed=')) || '--seed=2026').slice(7)) >>> 0;
Math.random = () => {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { levels, Game, Player, Traffic, FxQueue, CONFIG } = g;
  const { UfoStrike } = await g.load('ufostrike.js');
  const U = CONFIG.ufoStrike, HZ = 120, WATCH = 8;
  const step = () => { Player.shield = 99; Game.update(1 / HZ); FxQueue.length = 0; };
  const burning = () => Traffic.cars.filter(c => c.active && c.ufoBurning);
  let spun = 0, smokingBy1s = 0, total = 0, early = 0, missed = 0, survived = 0, lateBurners = 0, strikes = 0, stillOn = 0;
  const deaths = [];
  for (let run = 0; run < 4; run++) {
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'night'));
    Game.loaded = null;
    Game.start();
    Player.s = 300;
    for (let i = 0; i < HZ; i++) step();
    Player.nextMystery = 'ufo';
    Player.collect('mystery');
    if (UfoStrike.phase === 'arrive') strikes++;
    // (coming in: nothing burns yet)
    for (let i = 0; i < HZ * U.arrive - 2; i++) { step(); early += burning().length; }
    for (let i = 0; i < 4; i++) step(); // (over the moment it starts to hover: the burn begins, Q43)
    const onRoad = Traffic.cars.filter(c => c.active && c.health > 0);
    missed += onRoad.filter(c => !c.ufoBurning).length;
    const doomed = burning().map(car => ({ car, spun: false, died: 0, gone: false }));
    for (let i = 1; i <= HZ * WATCH; i++) {
      step();
      for (const d of doomed) {
        if (d.died || d.gone) continue;
        if (i === HZ && d.car.active && d.car.health / d.car.maxHealth < CONFIG.smokeStart) smokingBy1s++;
        if (d.car.spin > 0) d.spun = true;
        if (!d.car.active || !d.car.ufoBurning) {
          if (d.car.health > 0) d.gone = true; // (off the end of the road, or taken off it, alive)
          else d.died = i / HZ;
        }
      }
    }
    total += doomed.filter(d => !d.gone).length;
    spun += doomed.filter(d => d.spun && !d.gone).length;
    survived += doomed.filter(d => !d.gone && !d.died).length;
    deaths.push(...doomed.filter(d => d.died).map(d => d.died));
    lateBurners += burning().filter(car => !doomed.some(d => d.car === car)).length;
    if (UfoStrike.phase) stillOn++;
  }
  deaths.sort((a, b) => a - b);
  const at = (q) => deaths[Math.floor(q * (deaths.length - 1))], pct = (q) => at(q).toFixed(1);
  console.log(`${total} cars wrecked, ${spun} spun out on the way, ${smokingBy1s} smoking 1 s after the burn began; wrecked ${pct(0)}-${pct(1)} s after (10% by ${pct(0.1)}, median ${pct(0.5)}, 90% by ${pct(0.9)})`);
  check(strikes === 4, 'the mystery calls the saucer in, every time (' + strikes + ' of 4)');
  check(early === 0, 'nothing burns while it comes in (' + U.arrive + ' s)');
  check(total >= 20 && missed === 0, 'as it starts to hover, every vehicle on the road is set alight (' + total + ' in four strikes' + (missed ? ', ' + missed + ' missed' : '') + ')');
  check(survived === 0, 'none of them is still driving ' + WATCH + ' s later' + (survived ? ' (' + survived + ' are)' : ''));
  check(smokingBy1s > 0, 'some are smoking within a second (' + smokingBy1s + ')');
  check(at(0.5) >= 2.5 && at(0.5) <= 5 && at(0.9) <= 5.5, 'most are wrecked 2.5 to 5 s after the burn begins (median ' + pct(0.5) + ' s, 90% by ' + pct(0.9) + ' s)');
  check(at(1) <= 6, 'and the last of them within 6 s (' + pct(1) + ' s)');
  check(lateBurners === 0, 'nothing that turns up afterwards burns');
  check(stillOn === 0, 'the strike is over by then (' + (U.hover + U.leave) + ' s to hover and fly away)');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
