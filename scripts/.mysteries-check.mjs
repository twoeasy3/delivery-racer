// A check of the mystery pickup's second batch (src/delivery/mysteries.js) and the Super cars (cars.js superOf),
// headless: each effect is started on a quiet level and its mark on the game's state looked for.
//   node scripts/.mysteries-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport', 'lowrider'], ownAll: true, tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Mysteries } = await g.load('mysteries.js');
  const { Pickups } = await g.load('pickups.js');
  const P = g.Player, G = g.Game, T = g.Traffic, M = g.CONFIG.mystery;
  const start = (id = 'suburbs', car = 'sport', evil = false, pickups = false, ghost = true) => {
    g.select(id);
    g.cars.selectCar(car);
    G.evil = evil;
    P.testGhost = false;
    g.said.length = 0;
    G.start();
    g.drive(1, 0);
    g.run(3);
    P.testGhost = ghost; // (a ghost, unless told otherwise: a wrecked car's mystery only ends as its next car lands)
    if (!pickups) for (const p of Pickups.items) p.taken = true; // (none of the level's own to get in the way)
  };
  const mystery = (effect) => { P.nextMystery = effect; P.collect('mystery'); P.nextMystery = ''; };
  const said = (text) => g.said.some(line => line.includes(text));

  for (const effect of M.effects) check(!!g.Message.pick('powerups', 'mystery', effect), 'wording for ' + effect);

  start();
  console.log('Level problems: ' + (g.track.Track.problems.join(' | ') || 'none'));
  // ---- earthquake
  mystery('earthquake');
  g.run(1);
  check(P.mystery === 'earthquake' && Mysteries.quake && [0, 3, 6, 9].some(s => Mysteries.heave(P.s + s) !== 0), 'earthquake: the road heaves');
  check(Math.abs(P.mysteryTime - (M.earthquake.time - 1)) < 1.5, 'earthquake: lasts its own time (' + P.mysteryTime.toFixed(1) + ' s left)');
  g.run(M.earthquake.time + 1);
  check(P.mystery === '' && !Mysteries.quake && Mysteries.heave(P.s) === 0, 'earthquake: over, the road still');

  // ---- rewind
  start();
  P.testGhost = true;
  g.run(12);
  const before = { s: P.s, time: G.time };
  mystery('rewind');
  check(P.mystery === '' && G.time < before.time - 8 && P.s < before.s - 50, `rewind: ${(before.time - G.time).toFixed(1)} s and ${(before.s - P.s).toFixed(0)} m back, over at once`);
  g.run(2);
  check(G.state === 'playing' && P.s > 0, 'rewind: the run carries on');

  // ---- giant
  start('suburbs', 'sport', false, false, false);
  const hw = P.hw;
  mystery('giant');
  check(P.giant && Math.abs(P.hw - hw * M.giant.scale) < 1e-9, 'giant: the hitbox is ' + M.giant.scale + ' times as wide');
  const victim = T.cars.find(c => c.active && !c.junction && c.dir > 0);
  for (const c of T.cars) if (c !== victim) c.active = false;
  Object.assign(victim, { s: P.s + 14, lat: P.lat, vs: 0 });
  const health = P.health;
  g.run(3, () => !victim.active);
  check(victim.health <= 0 || !victim.active, 'giant: a car driven into is crushed (' + (victim.s - P.s).toFixed(1) + ' m off, player ' + (P.active ? 'driving' : 'wrecked') + ')');
  check(P.health === health, 'giant: at no cost to the player');
  g.run(M.giant.time + 1);
  check(!P.giant && Math.abs(P.hw - hw) < 1e-9, 'giant: back to size after');

  // ---- swap sides
  start('suburbs', 'sport', false);
  mystery('swapSides');
  g.run(0.1);
  check(P.evil === true && said('EVIL'), 'swap sides: Good turns Evil, and says so');
  P.testGhost = true; // (a wrecked car's mystery only ends as its next car lands)
  g.run(M.time + 1);
  check(P.evil === false, 'swap sides: back after');
  mystery('swapSides');
  G.finish('timeout');
  check(P.evil === false, 'swap sides: back on its own side when the run ends');
  start('battlefield', 'sport');
  mystery('swapSides');
  check(P.mystery === M.fallback && P.evil === false, 'swap sides: not on the Battlefield (' + P.mystery + ' instead)');

  // ---- magnet
  start('mystery-meadows', 'sport', false, true);
  const ahead = Pickups.items.filter(p => !p.taken && p.s > P.s).sort((a, b) => a.s - b.s)[0];
  P.s = ahead.s - 80;
  const home = ahead.s;
  mystery('magnet');
  g.run(1, () => ahead.taken);
  check(ahead.pulled && ahead.s < home, 'magnet: a pickup ahead comes toward the car (' + (home - ahead.s).toFixed(1) + ' m in a second)');
  G.start();
  check(ahead.s === home, 'magnet: it is back in its place on the next run');

  // ---- blackout
  start();
  mystery('blackout');
  check(Mysteries.blackout, 'blackout: on');
  g.run(M.time + 1);
  check(!Mysteries.blackout, 'blackout: off after');

  // ---- traffic freeze
  start();
  g.run(4);
  mystery('trafficFreeze');
  const where = T.cars.filter(c => c.active && Math.abs(c.s - P.s) > 40).map(c => [c, c.s]); // (not one the player may shove)
  g.run(2);
  check(T.frozen && where.length > 0 && where.every(([c, s]) => !c.active || c.s === s || Math.abs(c.s - P.s) < 12), 'traffic freeze: ' + where.length + ' cars stand still');
  g.run(M.trafficFreeze.time);
  check(!T.frozen, 'traffic freeze: over');
  g.run(2);
  check(where.some(([c, s]) => c.active && c.s !== s), 'traffic freeze: and they move again');

  // ---- souped up, and the Super cars
  start();
  const base = g.cars.CAR, top = base.maxSpeed, healthShare = P.health / P.maxHealth;
  mystery('soupedUp');
  const now = (await g.load('cars.js')).CAR;
  check(now.super && now.base === base && now.maxSpeed === top + g.CONFIG.superCar.maxSpeed, 'souped up: in the ' + now.name + ' (' + now.maxSpeed + ' m/s against ' + top + ')');
  check(Math.abs(P.health / P.maxHealth - healthShare) < 1e-9 && P.maxHealth === now.health, 'souped up: its health, the same share of it');
  g.run(M.soupedUp.time + 1);
  check((await g.load('cars.js')).CAR === base && P.maxHealth === base.health, 'souped up: its own car back after');
  start('suburbs', 'lowrider');
  mystery('soupedUp');
  const { CARS, superOf, SUPER_LIVERIES } = g.cars;
  {
    const lent = (await g.load('cars.js')).CAR, own = CARS.find(c => c.id === 'superlowrider');
    check(P.mystery === 'soupedUp' && lent.super && lent.base.id === 'lowrider' && lent.model === own.model && lent.maxSpeed === own.maxSpeed && lent.health === own.health,
      'souped up: the Lowrider becomes the garage\'s Super Lowrider (' + lent.name + ', ' + lent.maxSpeed + ' m/s)');
    check(superOf(superOf(CARS.find(c => c.id === 'lowrider'))) === null, '...which has no Super version of its own while lent');
  }
  const tiered = CARS.filter(c => c.tier && c.tier <= 5 && c.id !== 'lowrider');
  check(tiered.every(c => superOf(c) && superOf(c).id === 'super-' + c.id && superOf(superOf(c)) === null), 'a Super version of each of the ' + tiered.length + ' tiered cars, and none of a Super car');
  check(tiered.every(c => SUPER_LIVERIES[c.id]), 'a Super livery for each' + tiered.filter(c => !SUPER_LIVERIES[c.id]).map(c => ' (none: ' + c.id + ')').join(''));
  check(superOf(CARS.find(c => c.tank)) === null && superOf(g.cars.LEVEL_CARS.ufo) === null, 'none for the Tank, nor a level\'s vehicle');

  // ---- the draw: every effect in the pool comes up, and a full run with each is survived
  start();
  P.testGhost = true;
  const drawn = new Set();
  for (let i = 0; i < 400; i++) { P.collect('mystery'); drawn.add(P.mystery); for (const line of g.Message.lines) if (line.text) drawn.add(line.text); g.run(0.1); }
  const missing = ['soupedUp', 'earthquake', 'giant', 'swapSides', 'magnet', 'blackout', 'trafficFreeze'].filter(e => !drawn.has(e));
  check(!missing.length, 'every lasting new effect is drawn in 400 mysteries' + (missing.length ? ' (never: ' + missing.join(', ') + ')' : ''));
  check(G.state === 'playing' || G.state === 'finished', 'and the run survives them all (' + G.state + ')');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
