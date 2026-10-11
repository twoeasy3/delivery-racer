// A check of the police pursuit (src/delivery/pursuit.js), headless: it fires on its timer, the two cars come from
// behind and leave ahead, traffic moves aside, the player gains and loses nothing by it, and a run still finishes.
//   node scripts/.pursuit-check.mjs [--seed=n]
import { boot } from './delivery-headless.mjs';

// (seeded, as the smoke test is: a failure repeats)
const seedArg = process.argv.find(a => a.startsWith('--seed='));
let seed = seedArg ? Number(seedArg.slice(7)) : 12345;
const reseed = (n) => { seed = n >>> 0; };
Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const seed0 = seed;

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Pursuit } = await g.load('pursuit.js');
  const { Social } = await g.load('social.js');
  const P = g.Player, G = g.Game, T = () => g.track.Track, C = g.CONFIG.pursuit;
  const lane = (n, s) => T().laneOffset(n, s);
  const said = (text) => g.said.some(line => line.includes(text));
  const quiet = () => { for (const car of g.Traffic.cars) if (!car.driver) car.active = false; };
  // a fresh run on a level, the car at s doing v; a pursuit set off `at` s in (null: left to the level's clock)
  const start = (level, { s = 1500, v = 22, evil = false, at = 0.1, n = 1 } = {}) => {
    reseed(seed0 + n * 7919);
    // (without the level's cash pickups: what they pay is none of a pursuit's doing, and "no cash" below is about the pursuit)
    const found = typeof level === 'string' ? [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)].find(l => l.id === level) : level;
    g.select({ ...found, pickups: (found.pickups || []).filter(p => !/^cash/.test(p.type)) });
    P.testGhost = false;
    G.evil = evil;
    g.said.length = 0;
    Pursuit.force = at === null ? null : { at };
    G.start();
    const [first] = T().laneRange(1, s);
    Object.assign(P, { s, lat: lane(first, s), speed: v, launching: false, shield: 0 });
    g.drive(1, 0);
  };
  const steerTo = (lat) => Math.max(-1, Math.min(1, (lat - P.lat) * 0.8)) * (T().mirrored ? -1 : 1);
  // an ordinary careful driver: full throttle, braking for whatever is close ahead in its lane (and holding `lat`)
  const careful = (lat = null) => {
    const close = g.Traffic.cars.some(c => c.active && !c.junction && c.s - P.s > 0 && c.s - P.s < 12 + P.speed * 1.2 && Math.abs(c.lat - P.lat) < c.hw + P.hw + 0.4 && c.vs < P.speed);
    g.drive(close ? -1 : 1, lat === null ? 0 : steerTo(lat));
  };

  // ---- the level field
  console.log('The level field');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)], have = all.filter(l => l.pursuits);
  check(have.length >= 5, 'levels with pursuits: ' + have.map(l => l.id).join(', '));
  for (const l of have) {
    g.select(l); G.evil = false; Pursuit.force = null; G.start();
    check(!T().problems.length && Number.isFinite(Pursuit.next), l.id + ': loads without problems, and one is due in ' + Pursuit.next.toFixed(0) + ' s' + (T().problems.length ? ' (' + T().problems.join(' | ') + ')' : ''));
  }
  for (const id of ['marina-bay', 'battlefield', 'all-heck']) {
    const l = { ...all.find(x => x.id === id), pursuits: { every: { min: 5, max: 6 } } };
    g.select(l); G.start();
    check(T().problems.some(p => p.startsWith('pursuits')) && Pursuit.next === Infinity, id + ' given pursuits: reported, and none is ever due');
  }
  g.select({ ...all.find(x => x.id === 'night'), pursuits: { every: { min: 0 } } }); G.start();
  check(T().problems.some(p => p.startsWith('pursuits: every')), 'pursuits without every { min, max }: reported');

  // ---- it fires, from behind, heard first, and goes by
  console.log('It fires');
  start('night', { at: null, s: 400 });
  let fired = -1;
  g.run(70, (t) => { if (Pursuit.cars.length && fired < 0) fired = t; return fired >= 0; });
  check(fired > 0, 'night, left to the level\'s clock: one set off after ' + fired.toFixed(1) + ' s (every ' + JSON.stringify(g.levels.LEVEL.pursuits.every) + ')');
  start('night', { v: 20, s: 700 });
  g.run(0.5);
  const [getaway, cop] = Pursuit.cars;
  check(!!cop && getaway.kind === 'getaway' && cop.kind === 'interceptor' && cop.sirenOn, 'forced: a getaway car and an interceptor with its siren on');
  check(cop && Math.abs(P.s - getaway.s - C.behind) < 25 && getaway.s - cop.s > C.gap * 0.5, 'they start ' + (P.s - getaway.s).toFixed(0) + ' m behind the player, the interceptor ' + (getaway.s - cop.s).toFixed(0) + ' m behind the getaway car');
  check(C.heard > C.behind + C.gap && said('Police pursuit'), 'the siren is heard from ' + C.heard + ' m: before they are in view, and it is announced');
  let passed = [-1, -1], aside = 0, lanes = new Set(), gone = -1;
  g.run(90, (t) => {
    careful();
    if (passed[0] < 0 && getaway.active && getaway.s > P.s + 10) passed[0] = t;
    if (passed[1] < 0 && cop.active && cop.s > P.s + 10) passed[1] = t;
    if (getaway.driver) lanes.add(getaway.lane);
    aside = Math.max(aside, g.Traffic.cars.filter(c => c.active && c.pulledFor === cop).length);
    if (!Pursuit.cars.length) gone = t;
    return gone >= 0;
  });
  check(passed[0] > 0 && passed[1] >= passed[0], 'both come by the player: the getaway car after ' + passed[0].toFixed(1) + ' s, the interceptor after ' + passed[1].toFixed(1) + ' s');
  check(lanes.size > 1, 'the getaway car weaves: ' + lanes.size + ' lanes used');
  check(aside > 0, 'traffic pulls aside for the interceptor\'s siren: ' + aside + ' at once');
  check(gone > 0 && !getaway.active && !cop.active && !cop.sirenOn && !cop.driver, 'and they are gone up the road after ' + gone.toFixed(1) + ' s, the two cars handed back');

  // ---- nothing in it for the player, nothing against: whatever is done about it
  console.log('Nothing gained, nothing lost');
  const ways = {
    'moving over to the kerb lane': () => careful(lane(T().laneRange(1, P.s)[1], P.s)),
    'sitting in the getaway car\'s way': () => { const c = Pursuit.cars[0]; if (c && c.active && P.s > c.s) g.drive(P.s - c.s < 40 ? -1 : 0, steerTo(c.lat)); else careful(); },
    'sitting in the interceptor\'s way': () => { const c = Pursuit.cars[1]; if (c && c.active && P.s > c.s) g.drive(P.s - c.s < 40 ? -1 : 0, steerTo(c.lat)); else careful(); },
  };
  for (const evil of [false, true]) for (const [what, how] of Object.entries(ways)) {
    let clean = 0, bumped = 0;
    for (let n = 1; n <= 4; n++) {
      start('night', { v: 20, n, evil });
      g.run(0.3);
      const standing = Social.level, health = P.health;
      // (no patrol cars about: a bust of theirs, for the lane the player is in, would be none of the pursuit's doing)
      g.run(70, () => { for (const c of g.Traffic.cars) if (c.kind === 'police') c.active = false; how(); return !Pursuit.cars.length || !P.active; });
      if (P.health < health) bumped++;
      // (ramming the interceptor is the one thing it will bust you for, Q11: a bust there is no fault of the pursuit's; the rest is still nothing against)
      const rams = what.includes('interceptor');
      if (G.cash === 0 && (rams || (G.busts === 0 && !P.busted && Social.level <= standing + 1e-9))) clean++;
      else console.log('        (run ' + n + ': cash ' + G.cash + ', busts ' + G.busts + ', standing ' + standing.toFixed(2) + ' to ' + Social.level.toFixed(2) + '; said: ' + g.said.slice(-3).join(' | ') + ')');
    }
    check(clean === 4, (evil ? 'Evil, ' : 'Good, ') + what + ': no cash' + (what.includes('interceptor') ? ' (a bust for ramming it is allowed)' : ', no bust, no standing gained') + ' in ' + clean + ' of 4 runs (the car damaged in ' + bumped + ')');
  }

  // ---- a run with pursuits in it still finishes
  console.log('A run still finishes');
  for (const id of ['night', 'gimmick-road-2']) {
    start(id, { s: 0, v: 0, at: 6 });
    P.testGhost = true;
    g.drive(1, 0);
    let seen = 0, wasOn = false;
    g.run(600, () => { const on = Pursuit.cars.length > 0; if (on && !wasOn) seen++; wasOn = on; return G.state !== 'playing'; });
    check(G.state === 'finished' && seen > 0, id + ': driven to the end (' + G.outcome + '), ' + seen + ' pursuit(s) on the way');
  }

  // ---- never on a race or the Battlefield, even forced
  console.log('Never on a race');
  for (const id of ['marina-bay', 'battlefield']) {
    g.select(all.find(x => x.id === id));
    Pursuit.force = { at: 1, anywhere: true };
    G.evil = false;
    G.start();
    let seen = false;
    g.drive(1, 0);
    g.run(25, () => { seen = seen || Pursuit.cars.length > 0; return seen; });
    check(!seen && Pursuit.next === Infinity && !g.Traffic.cars.some(c => c.active && (c.kind === 'interceptor' || c.kind === 'getaway')), id + ': forced, and none in 25 s');
  }
  Pursuit.force = null;
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
