// A check of the GIANT's sounds (the owner, 16-Oct: "constant explosion sounds when the car is giant"; CHECKLIST 386), headless:
//   - a 12 s giant (CONFIG.mystery.giant) driven flat out through the traffic of a busy level (default harbour: 12 + 11 cars) with a pile
//     of three cars put in its path every 0.6 s (--no-piles: the level's own traffic only), its health kept up, every step's FxQueue gathered as a drawn frame at 60 a second would get it;
//   - each frame played two ways: BEFORE, as render/effects.js routed it on main (every 'heavy' a crash WAV, every crushed car's
//     explosion its own crash WAV), and AFTER, through render/giantsound.js's gate; Sound.play's own rule kept in both (the same
//     name within 50 ms plays once; 0.02 or quieter is silent): crash-WAV plays (explode / explodeBig / heavy: Crash 1 / Head On
//     Collision) and the giant's own (crush, stomp) a second, and explosions drawn (classic particles) a second;
//   - after: at most one crush sound in any 0.25 s, no footstep a crash WAV, every explosion that is not a crushed car's untouched
//     (an obstacle's, one far off, and all of them with the car its own size);
//   - the rules untouched: render/giantsound.js is not in the replay fingerprint (vite.config.js logicFiles) and no logic file names it.
//   node scripts/.giantsound-check.mjs [level] [--no-piles]
import { boot } from './delivery-headless.mjs';
import { readFileSync } from 'node:fs';

const LEVEL = process.argv.slice(2).find(a => !a.startsWith('--')) || 'harbour';
const PILE_EVERY = process.argv.includes('--no-piles') ? 0 : 0.6; // s between piles of three cars put in the giant's path
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const g = await boot({ cars: ['commuter', 'sport'], ownAll: true, tiers: false });
try {
  const { createGiantGate, crushedBy, GIANT_FX } = await g.load('render/giantsound.js');
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
  const PARTICLES = (e) => { const k = (e.big ? 1.5 : 1) * (e.scale || 1), ks = (e.big ? 1.5 : 1) * (e.smoke ?? 1); return Math.ceil(35 * k) + Math.ceil(7 * ks) + Math.ceil(7 * k); }; // (classicExplode)
  const before = { last: {}, plays: [], drawn: [] }, after = { last: {}, plays: [], drawn: [], passed: [] };
  const gate = createGiantGate();
  for (const f of frames) {
    for (const e of f.queue) { // BEFORE: main's render/effects.js
      if (e.type === 'sound') { play(before, f.t, e.name, e.volume * near(f, e)); continue; }
      if (e.type === 'explode') before.drawn.push({ t: f.t, e });
      play(before, f.t, e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near(f, e));
    }
    gate.begin(step, f.giant); // AFTER: through the gate, as render/effects.js does now
    for (const e of f.queue) {
      if (e.type === 'sound') { const p = gate.sound(e.name, e.volume * near(f, e)); if (p) play(after, f.t, p[0], p[1]); continue; }
      if (gate.on && crushedBy(e, f.P)) { const d = gate.crushed(e, near(f, e)); if (d) after.drawn.push({ t: f.t, e: d, crushed: true }); continue; }
      if (e.type === 'explode') { after.drawn.push({ t: f.t, e }); after.passed.push(e); }
      play(after, f.t, e.sound || (e.type === 'explode' && e.big ? 'explodeBig' : e.type), near(f, e));
    }
    for (const [name, volume] of gate.end()) play(after, f.t, name, volume);
  }
  const perSecond = (n) => (n / seconds).toFixed(1);
  const busiest = (list) => { let most = 0; for (const a of list) most = Math.max(most, list.filter(b => b.t >= a.t && b.t < a.t + 1).length); return most; };
  const report = (name, s) => {
    const crash = s.plays.filter(p => CRASH_WAV.has(p.name)), own = s.plays.filter(p => p.name === 'crush' || p.name === 'stomp');
    const particles = s.drawn.reduce((n, d) => n + PARTICLES(d.e), 0);
    let mostFrame = 0; for (const f of frames) mostFrame = Math.max(mostFrame, s.drawn.filter(d => d.t === f.t).length);
    console.log(`        ${name.padEnd(7)} sounds ${perSecond(s.plays.length)}/s (busiest second ${busiest(s.plays)}); crash WAVs ${perSecond(crash.length)}/s (busiest ${busiest(crash)});` +
      ` crush ${perSecond(own.filter(p => p.name === 'crush').length)}/s, stomp ${perSecond(own.filter(p => p.name === 'stomp').length)}/s;` +
      ` explosions drawn ${perSecond(s.drawn.length)}/s (most in a frame ${mostFrame}), classic particles ${perSecond(particles)}/s`);
    return { crash, own, particles, mostFrame };
  };
  console.log(`        ${LEVEL}, ${seconds.toFixed(1)} s giant, ${crushes} crushes, ${frames.reduce((n, f) => n + f.queue.filter(e => e.type === 'explode').length, 0)} explode events:`);
  const B = report('before', before), A = report('after', after);

  const crunches = after.plays.filter(p => p.name === 'crush').map(p => p.t);
  check(crunches.every((c, i) => !i || c - crunches[i - 1] >= GIANT_FX.crushGap - 1e-9), 'after: at most one crush sound in any ' + GIANT_FX.crushGap + ' s (' + crunches.length + ' in all)');
  check(crunches.length > 0, 'after: the crushing is still heard (' + crunches.length + ' crunches)');
  const giantFrames = new Set(frames.filter(f => f.giant).map(f => f.t));
  const crashWhileGiant = A.crash.filter(p => giantFrames.has(p.t));
  const passedCrash = after.passed.length; // (explosions that were not a crushed car's: their own sound as before)
  check(crashWhileGiant.length <= passedCrash + frames.filter(f => f.giant && f.queue.some(e => e.type === 'sound' && CRASH_WAV.has(e.name) && e.name !== 'heavy')).length,
    'after: a crash WAV while giant only for an explosion that was not a crush (' + crashWhileGiant.length + ' crash WAVs, ' + passedCrash + ' other explosions)');
  check(A.crash.length < B.crash.length / 3, 'after: crash WAVs ' + B.crash.length + ' -> ' + A.crash.length);
  check(A.mostFrame <= GIANT_FX.drawMost || after.passed.length, 'after: crushed cars drawn ' + GIANT_FX.drawMost + ' a frame at most');
  check(A.particles <= B.particles, 'after: classic particles ' + B.particles + ' -> ' + A.particles);

  // ---- every other explosion and sound untouched ----
  const g2 = createGiantGate();
  g2.begin(step, true);
  const P0 = { s: 100, lat: 0, hl: 4.4, hw: 2 };
  const obstacle = { type: 'explode', s: 104, lat: 0, vs: 20, big: false }; // (collision.js hitObstacles: no tyres)
  const ride = { type: 'explode', s: 104, lat: 0, vs: 20, big: false, scale: 0.55, smoke: 0.5, tyres: true };
  const far = { type: 'explode', s: 160, lat: 0, vs: 0, big: false, tyres: true };
  const crushedCar = { type: 'explode', s: 106, lat: 1, vs: 3, big: false, tyres: true };
  check(!crushedBy(obstacle, P0) && !crushedBy(ride, P0) && !crushedBy(far, P0) && crushedBy(crushedCar, P0), 'an obstacle\'s explosion, a ride\'s, one far off: not a crush; a wrecked car beside the giant: a crush');
  check(['crash', 'explode', 'burst', 'cash5', 'screech'].every(n => JSON.stringify(g2.sound(n, 0.7)) === JSON.stringify([n, 0.7])), 'while giant, every sound but \'heavy\' plays as it was');
  const g3 = createGiantGate(); g3.begin(step, false);
  check(JSON.stringify(g3.sound('heavy', 1)) === '["heavy",1]' && JSON.stringify(g3.sound('heavy', 0.4)) === '["heavy",0.4]' && !g3.on && g3.end().length === 0,
    'with the car its own size (TANK RAGE\'s \'heavy\' too) everything plays as it was');

  // ---- the sources: the footstep and crush as the gate expects them; the wiring ----
  const src = (f) => readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8');
  check(src('mysteries.js').includes("sfx('heavy', 0.4)") && 0.4 < GIANT_FX.footstepBelow && /Player\.giant[^\n]*\n[^]*?sfx\('heavy'\);/.test(src('collision.js')),
    'the rules\' footstep (mysteries.js sfx(\'heavy\', 0.4)) and crush (collision.js sfx(\'heavy\')) as the gate tells them apart');
  const fx = src('render/effects.js'), audio = src('render/audio.js');
  check(fx.includes('giantGate.begin(dt, Player.giant)') && fx.includes('giantGate.end()') && fx.includes('crushedBy(e, Player)') && fx.includes('explode(drawn, true)'), 'render/effects.js routes the queue through the gate');
  check(/crush: \['Short Crash with Glass', 'Collide1'\]/.test(audio) && /stomp: null/.test(audio) && /stomp: \(v\) =>/.test(audio), 'audio.js: crush (existing crash WAVs), stomp (synthesised)');

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
