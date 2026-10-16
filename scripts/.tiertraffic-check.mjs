// A check of TIER TRAFFIC (CONFIG.tierTraffic, src/delivery/tiertraffic.js; the owner, 16-Oct: a tiered level's traffic
// is traffic-exclusive vehicles and garage cars of its tier and below), headless:
//   - the table: every kind in CONFIG.vehicles is classified (a tier 1-10 or 'exclusive'), and a kind's tier is its
//     garage car's (cars.js carTier; an amphibious car's own stars); every kind that is a later tier than some tiered
//     level has a swap entry (a kind, or null to drop it), and a swap leads to a kind that is allowed or nowhere
//   - the data: on every tiered level, its own mix and every traffic zone, after the rule: every kind allowed, never
//     empty where it was not, the total weight kept where nothing was dropped; a convoy's kind allowed
//   - the runs: every tiered level driven for a while on several seeds (the tiers on, and once off: the rule is the
//     level's, not the menu's): every vehicle that turns up (traffic, oncoming, parked, convoys, jams, reversible lanes)
//     is exclusive or of the level's tier or below, and some traffic turns up where the level has any
//   - untouched: the levels outside the tiers (races, specials, amphibious, events, hidden) keep their mix as it was
//   - the rule is what does it: with CONFIG.tierTraffic.on false, Big Business (tier 1) shows its Sportscompacts again
//   Every tiered level is run twice (`--seconds`, one seed with the tiers on, one off); the levels whose mix the rule
//   changes `--seeds` more times for `--long` s. About 10 minutes.
//   node scripts/.tiertraffic-check.mjs [--seconds=12] [--seeds=3] [--long=25] [level-id ...]
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? Number(a.slice(name.length + 3)) : fallback; };
const SECONDS = opt('seconds', 12), SEEDS = opt('seeds', 3), LONG = opt('long', 25), only = args.filter(a => !a.startsWith('--'));

const g = await boot({ ownAll: true });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const T = await g.load('tiertraffic.js'), tierData = (await g.load('tiers.json')).default;
  const { CONFIG } = g, { carById, carTier } = g.cars;
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)];
  const tiered = all.filter(l => T.levelTier(l) != null), untiered = all.filter(l => T.levelTier(l) == null);
  const ok = (kind, tier) => T.TRAFFIC_TIERS[kind] === 'exclusive' || T.TRAFFIC_TIERS[kind] <= tier;

  // ---- the table
  const kinds = Object.keys(CONFIG.vehicles);
  check(kinds.every(k => T.TRAFFIC_TIERS[k] === 'exclusive' || (Number.isInteger(T.TRAFFIC_TIERS[k]) && T.TRAFFIC_TIERS[k] >= 1 && T.TRAFFIC_TIERS[k] <= 10)),
    'the table: all ' + kinds.length + ' vehicle kinds classified');
  const wrong = kinds.filter(k => { const car = carById(k), t = carTier(car) ?? (car?.amphibious ? car.tier : null); return (t ?? 'exclusive') !== T.TRAFFIC_TIERS[k]; });
  check(!wrong.length, 'the table: each kind\'s tier is its garage car\'s (cars.js)' + (wrong.length ? ': ' + wrong.join(', ') : ''));
  check(T.TRAFFIC_TIERS.commuter === 1 && T.TRAFFIC_TIERS.sport === 2 && T.TRAFFIC_TIERS.miata === 4 && T.TRAFFIC_TIERS.postvan === 6 &&
    T.TRAFFIC_TIERS.bus === 'exclusive' && T.TRAFFIC_TIERS.police === 'exclusive' && T.TRAFFIC_TIERS.semi === 'exclusive',
    'the table: Commuter 1, Sportscompact 2, Sportscar 4, Post Van 6 (Blue 1); bus, police, semi exclusive');
  const maxTier = Math.max(...tiered.map(l => T.levelTier(l)));
  const needSwap = kinds.filter(k => T.TRAFFIC_TIERS[k] !== 'exclusive' && T.TRAFFIC_TIERS[k] > 1 && T.TRAFFIC_TIERS[k] <= 10 && T.TRAFFIC_TIERS[k] > Math.min(...tiered.map(l => T.levelTier(l))));
  const noEntry = needSwap.filter(k => !(k in CONFIG.tierTraffic.swap));
  check(!noEntry.length, 'the swaps: every kind a tiered level may refuse has an entry (' + needSwap.length + ')' + (noEntry.length ? ': missing ' + noEntry.join(', ') : ''));
  const badSwap = [];
  for (let tier = 1; tier <= maxTier; tier++) for (const k of kinds) { const to = T.swapKind(k, tier); if (to !== null && (!CONFIG.vehicles[to] || !ok(to, tier))) badSwap.push(k + '@' + tier + '->' + to); }
  check(!badSwap.length, 'the swaps: every kind, at every tier, becomes an allowed kind or is dropped' + (badSwap.length ? ': ' + badSwap.join(', ') : ''));
  check(Object.keys(T.tierWeights({ sport: 1, miata: 1 }, 1)).join() === CONFIG.tierTraffic.fallback, 'the fallback: a mix of only sports cars on a tier-1 level is not left empty');

  // ---- the data
  const sum = (w) => Object.values(w).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const bad = [];
  let changed = 0;
  for (const level of tiered) {
    const tier = T.levelTier(level);
    for (const [w, what] of [[level.traffic || {}, 'its mix'], ...(level.trafficZones || []).map(z => [{ ...(level.traffic || {}), ...z.traffic }, 'zone ' + z.from])]) {
      const after = T.tierWeights(w, tier);
      if (after !== w) changed++;
      const refused = Object.entries(after).filter(([k, v]) => v > 0 && !ok(k, tier)).map(([k]) => k);
      const dropped = Object.keys(w).some(k => w[k] > 0 && T.swapKind(k, tier) === null);
      if (refused.length) bad.push(level.id + ' ' + what + ': ' + refused.join(', '));
      if (sum(w) > 0 && !(sum(after) > 0)) bad.push(level.id + ' ' + what + ': left empty');
      if (!dropped && Math.abs(sum(after) - sum(w)) > 1e-9) bad.push(level.id + ' ' + what + ': weight lost');
    }
    if (level.convoys?.kind && !ok(T.swapKind(level.convoys.kind, tier) ?? 'commuter', tier)) bad.push(level.id + ' convoy');
  }
  check(!bad.length, 'the data: ' + tiered.length + ' tiered levels, every mix and zone allowed, never emptied, weight kept (' + changed + ' mixes changed)' + (bad.length ? ': ' + bad.join('; ') : ''));
  check(tiered.length === Object.values(tierData.tiers).flat().length, 'the data: every level in tiers.json is a tiered level (' + tiered.length + ')');
  const touched = untiered.filter(l => T.tierWeights(l.traffic || {}, T.levelTier(l)) !== (l.traffic || {}));
  check(!touched.length && untiered.some(l => l.laps) && untiered.some(l => g.levels.HIDDEN_LEVELS[l.id]),
    'untouched: ' + untiered.length + ' levels outside the tiers (races, specials, amphibious, events, hidden) keep their mix' + (touched.length ? ': ' + touched.map(l => l.id).join(', ') : ''));

  // ---- the runs
  const { Game: G, Player: P, Traffic } = g;
  const changedLevel = (l) => [l.traffic || {}, ...(l.trafficZones || []).map(z => z.traffic)].some(w => T.tierWeights(w, T.levelTier(l)) !== w) ||
    (l.convoys?.kind && T.swapKind(l.convoys.kind, T.levelTier(l)) !== l.convoys.kind);
  // one run: every vehicle as it turns up (a pool slot dealt out again, or made another kind, is a new one) -> [kind, what]
  const drive = (level, seed, tiersOn, seconds) => {
    g.CONFIG.progression.tiers = tiersOn;
    g.select(level.id);
    G.loaded = null;
    G.nextSeed = seed * 7919;
    G.nextLoadSeed = seed * 104729;
    G.start();
    if (G.state !== 'playing') return null;
    P.testGhost = true;
    g.drive(1, 0);
    const was = new Map(), seen = [];
    const look = () => {
      for (const car of Traffic.cars) {
        const now = car.active && !car.racer && !car.procession && !car.driver ? car.kind : null;
        if (now && was.get(car) !== now) seen.push([car.kind, car.parked ? 'parked' : car.convoy ? 'convoy' : car.jam ? 'jam' : car.dir < 0 ? 'oncoming' : 'traffic']);
        was.set(car, now);
      }
    };
    look();
    g.run(seconds, () => { look(); return G.state !== 'playing'; });
    return seen;
  };
  const runs = tiered.filter(l => !only.length || only.includes(l.id));
  const seenBad = [], quiet = [];
  let vehicles = 0, count = 0;
  for (const level of runs) {
    const tier = T.levelTier(level), kindsSeen = new Set(), plan = [[1, true, SECONDS], [2, false, SECONDS]];
    if (changedLevel(level)) for (let k = 0; k < SEEDS; k++) plan.push([3 + k, true, LONG]);
    for (const [seed, tiersOn, seconds] of plan) {
      const seen = drive(level, seed, tiersOn, seconds);
      count++;
      if (!seen) { seenBad.push(level.id + ': did not start'); continue; }
      vehicles += seen.length;
      for (const [kind, what] of seen) {
        kindsSeen.add(kind);
        if (!ok(kind, tier)) seenBad.push(level.id + ' (tier ' + tier + ', seed ' + seed + '): ' + kind + ' ' + what);
      }
    }
    const hasTraffic = sum(level.traffic || {}) > 0 && (level.trafficCount ?? 1) + (level.oncomingCount ?? 1) > 0;
    if (hasTraffic && !kindsSeen.size) quiet.push(level.id);
    console.log('         ' + level.id + ' (tier ' + tier + (changedLevel(level) ? ', changed' : '') + '): ' + [...kindsSeen].sort().join(' '));
  }
  check(!seenBad.length, 'the runs: ' + runs.length + ' tiered levels, ' + count + ' runs, ' + vehicles + ' vehicles, every one exclusive or of the level\'s tier or below' +
    (seenBad.length ? ': ' + [...new Set(seenBad)].slice(0, 20).join('; ') : ''));
  check(!quiet.length, 'the runs: traffic turned up on every tiered level that has any' + (quiet.length ? ': none on ' + quiet.join(', ') : ''));
  // ---- and the rule is what does it: off, Big Business shows a car of a later tier again
  if (!only.length || only.includes('big-business')) {
    CONFIG.tierTraffic.on = false;
    const seen = [1, 2, 3].flatMap(seed => drive(all.find(l => l.id === 'big-business'), seed, true, LONG) || []);
    CONFIG.tierTraffic.on = true;
    const late = [...new Set(seen.map(([k]) => k).filter(k => !ok(k, 1)))];
    check(late.length > 0, 'the rule off: Big Business (tier 1) shows cars of later tiers again (' + late.join(', ') + ')');
  }
  g.CONFIG.progression.tiers = true;
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
