// A check of the GIANT's silence (the owner, 16-Oct: "constant explosion sounds when the car is giant", then: its sounds are not
// necessary, remove them; CHECKLIST 386), headless: a 12 s giant (CONFIG.mystery.giant) driven flat out through a busy level (default
// harbour) with a pile of three cars put in its path every 0.6 s (--no-piles: the level's own traffic only), every step's FxQueue played
// two ways with Sound.play's own rules: BEFORE (main's render/effects.js) and AFTER (as it is now: no 'heavy' while giant, a crushed car's
// explosion drawn with no sound). After: no footstep or crush sound, every crushed car still drawn, every other sound untouched; and the
// module is outside the replay fingerprint.
//   node scripts/.giantsound-check.mjs [level] [--no-piles]
import { boot } from './delivery-headless.mjs';
import { readFileSync } from 'node:fs';

const LEVEL = process.argv.slice(2).find(a => !a.startsWith('--')) || 'harbour';
const PILE_EVERY = process.argv.includes('--no-piles') ? 0 : 0.6; // s between piles of three cars put in the giant's path
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const g = await boot({ cars: ['commuter', 'sport'], ownAll: true, tiers: false });
try {
  const { crushedBy, giantSilences } = await g.load('render/giantsound.js');
  const { Pickups } = await g.load('pickups.js');
  const P = g.Player, G = g.Game, T = g.Traffic, M = g.CONFIG.mystery;

  // ---- a 12 s giant through traffic: the frames' queues ----
  g.select(LEVEL);
  g.cars.selectCar('sport');
  G.evil = false;
  P.testGhost = false;
  G.start();
  g.drive(1, 0);
  g.run(2);
  for (const p of Pickups.items) p.taken = true; // (no other mystery picked up on the way)
  P.nextMystery = 'giant'; P.collect('mystery'); P.nextMystery = '';
  check(P.giant, 'the giant is on (' + LEVEL + ', ' + T.cars.filter(c => c.active).length + ' cars about)');
  const frames = [], step = 1 / 60;
  let t = 0, crushes = 0;
  let pileAt = 0.3;
  for (; t < M.giant.time + 0.5; t += step) {
    // a PILE in the road ahead every PILE_EVERY s (three of the level's cars from far off, side by side across the giant's path): a busy
    // road, the owner's case, besides whatever of the level's own traffic it meets
    if (PILE_EVERY && t >= pileAt && P.giant) {
      pileAt += PILE_EVERY;
      const spare = T.cars.filter(c => c.active && !c.junction && Math.abs(c.s - P.s) > 120).slice(0, 3);
      spare.forEach((c, i) => Object.assign(c, { s: P.s + 20 + i * 1.5, lat: P.lat + (i - 1) * 3.2, vs: 0, latVel: 0 }));
    }
    P.health = P.maxHealth ?? 100; // (kept up: obstacles still hurt a giant, CHECKLIST 387)
    G.update(step);
    frames.push({ t, giant: P.giant, P: { s: P.s, lat: P.lat, hl: P.hl, hw: P.hw }, queue: g.FxQueue.slice() });
    crushes += g.FxQueue.filter(e => e.type === 'sound' && e.name === 'heavy' && e.volume >= 1).length;
    g.FxQueue.length = 0;
    if (!P.giant && t > 1) break;
  }
  const seconds = frames.filter(f => f.giant).length * step;
  check(seconds >= M.giant.time - 0.5, 'the giant lasted ' + seconds.toFixed(1) + ' s (' + crushes + ' crushes)');
  check(crushes >= (PILE_EVERY ? 30 : 3), 'a busy run: ' + crushes + ' cars crushed');

  // ---- the two ways of playing it ----
  const CRASH_WAV = new Set(['explode', 'explodeBig', 'heavy']); // (Crash 1 / Head On Collision: audio.js SAMPLES)
  const near = (f, e) => (e.s === undefined ? 1 : 1 - Math.abs(e.s - f.P.s) / 160);
  const play = (stats, t, name, volume) => { // (Sound.play's own rules)
    if (volume <= 0.02) return;
    if (t - (stats.last[name] ?? -1) < 0.05) return;
    stats.last[name] = t;
    stats.plays.push({ t, name, volume });
  };
  const before = { last: {}, plays: [], drawn: [] }, after = { last: {}, plays: [], drawn: [] };
  let crushedDrawn = 0, otherSounds = 0;
  for (const f of frames) {
    for (const e of f.queue) { // BEFORE: main's render/effects.js
      if (e.type === 'sound') { play(before, f.t, e.name, e.volume * near(f, e)); continue; }
      if (e.type === 'explode') before.drawn.push({ t: f.t, e });
      play(before, f.t, e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near(f, e));
    }
    for (const e of f.queue) { // AFTER: as render/effects.js does now
      if (e.type === 'sound') { if (!(f.giant && giantSilences(e.name))) play(after, f.t, e.name, e.volume * near(f, e)); continue; }
      if (f.giant && crushedBy(e, f.P)) { after.drawn.push({ t: f.t, e }); crushedDrawn++; continue; }
      if (e.type === 'explode') after.drawn.push({ t: f.t, e });
      play(after, f.t, e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near(f, e));
    }
  }
  const perSecond = (n) => (n / seconds).toFixed(1);
  const busiest = (list) => { let most = 0; for (const a of list) most = Math.max(most, list.filter(b => b.t >= a.t && b.t < a.t + 1).length); return most; };
  for (const [name, st] of [['before', before], ['after', after]]) {
    const crash = st.plays.filter(p => CRASH_WAV.has(p.name));
    console.log(`        ${name.padEnd(7)} sounds ${perSecond(st.plays.length)}/s (busiest second ${busiest(st.plays)}); crash WAVs ${perSecond(crash.length)}/s (busiest ${busiest(crash)}); explosions drawn ${perSecond(st.drawn.length)}/s`);
  }
  console.log(`        ${LEVEL}, ${seconds.toFixed(1)} s giant, ${crushes} crushes`);
  const giantFrames = new Set(frames.filter(f => f.giant).map(f => f.t));
  check(!after.plays.some(p => giantFrames.has(p.t) && p.name === 'heavy'), 'after: no footstep or crush sound while giant');
  const crashWhileGiant = (st) => st.plays.filter(p => giantFrames.has(p.t) && CRASH_WAV.has(p.name)).length;
  const others = frames.filter(f => f.giant).reduce((n, f) => n + f.queue.filter(e => e.type === 'explode' && !crushedBy(e, f.P)).length, 0);
  check(crashWhileGiant(after) <= others, 'after: crash WAVs while giant ' + crashWhileGiant(before) + ' -> ' + crashWhileGiant(after) + ' (only for the ' + others + ' explosions that were not a crush)');
  check(after.drawn.length === before.drawn.length && crushedDrawn > 0, 'after: every explosion still drawn (' + after.drawn.length + ', ' + crushedDrawn + ' of them crushed cars)');
  for (const f of frames) for (const e of f.queue) if (e.type === 'sound' && e.name !== 'heavy') otherSounds++;
  check(['crash', 'explode', 'burst', 'cash5', 'screech'].every(n => !giantSilences(n)) && giantSilences('heavy'), 'only \'heavy\' is silenced (' + otherSounds + ' other sound events played as before)');
  const P0 = { s: 100, lat: 0, hl: 4.4, hw: 2 };
  check(!crushedBy({ type: 'explode', s: 104, lat: 0, vs: 20, big: false }, P0) && !crushedBy({ type: 'explode', s: 104, lat: 0, vs: 20, big: false, scale: 0.55, smoke: 0.5, tyres: true }, P0) &&
    !crushedBy({ type: 'explode', s: 160, lat: 0, vs: 0, big: false, tyres: true }, P0) && crushedBy({ type: 'explode', s: 106, lat: 1, vs: 3, big: false, tyres: true }, P0),
    'an obstacle\'s explosion, a ride\'s, one far off: not a crush (their sound kept); a wrecked car beside the giant: a crush');

  // ---- the wiring ----
  const src = (f) => readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8');
  const fx = src('render/effects.js');
  check(fx.includes('Player.giant && giantSilences(e.name)') && fx.includes('Player.giant && crushedBy(e, Player)) { explode(e, true)'), 'render/effects.js silences the giant');
  check(!/stomp|crush:/.test(src('render/audio.js')), 'audio.js: no giant sounds added');

  // ---- the replay fingerprint ----
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /render\/|giantsound/.test(f)), 'the replay fingerprint (' + files.length + ' logic files) walks no render/ file');
  const named = files.filter(f => /giantsound/.test(src(f)));
  check(!named.length, 'no logic file names render/giantsound.js (' + (named.join(', ') || 'none') + '): render-only');
} catch (error) {
  failures++;
  console.log('  FAIL  threw: ' + (error.stack || error));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
