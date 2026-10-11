// A check for a replay system (see src/delivery/REPLAY-NOTES.md): is a run the same twice, given the same
// seed, the same inputs and a fixed timestep? Headless: for each level it plays a scripted run (weaving,
// braking now and then, throwing packages) three times: twice with the same seed, once with another. The
// whole of the game's state (the player, every vehicle, every obstacle, the clock) is hashed once a second
// of game time; the two same-seed runs must agree hash for hash, and the other seed must not.
//   node scripts/.replay-check.mjs [level-id ...] [--seconds=60] [--step=120] [--keep-level]
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? Number(a.slice(name.length + 3)) : fallback; };
const ids = args.filter(a => !a.startsWith('--'));
const SECONDS = opt('seconds', 60), STEP = 1 / opt('step', 120);
const KEEP_LEVEL = args.includes('--keep-level'); // (as the game does now: the level is only built the first time)

// Math.random, seeded (mulberry32, as scripts/delivery-smoke.mjs)
let state = 1;
const seed = (n) => { state = n >>> 0; };
Math.random = () => {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const g = await boot({ cars: ['commuter', 'sport', 'floatvan'] }); // (the Float Van: an amphibious level starts in nothing else)
const { Game: G, Player: P, Traffic, Collision, Input } = g;
const { Progress } = await g.load('progress.js');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };

// FNV-1a over the numbers that make up the state (each to 1e-6, so a hash is of what a replay would show)
const hashOf = (numbers) => {
  let h = 0x811c9dc5;
  for (const n of numbers) {
    const text = typeof n === 'number' ? (Math.round(n * 1e6) / 1e6).toString() : String(n);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ 44, 0x01000193);
  }
  return h >>> 0;
};
const snapshot = () => {
  const n = [G.time, G.state, G.wrecks, G.busts, G.lap || 0, P.s, P.lat, P.speed, P.health, P.active ? 1 : 0];
  for (const c of Traffic.cars) { n.push(c.active ? 1 : 0); if (c.active) n.push(c.s, c.lat, c.lane ?? 0, c.health ?? 0, c.kind, c.evil ? 1 : 0); }
  for (const o of Collision.obstacles) n.push(o.gone ? 1 : 0, o.s, o.lat);
  n.push(Math.random()); // (and where the dice are: a draw more or fewer anywhere shows at once)
  return n;
};
// the scripted inputs: a pure function of the step number (what a recording of a real run would hold)
const inputAt = (i) => {
  const t = i * STEP;
  return { throttle: (t % 17) > 15.5 ? -1 : 1, steer: Math.sin(t * 0.9) > 0.55 ? 1 : Math.sin(t * 0.9) < -0.55 ? -1 : 0, throws: i % Math.round(2.3 / STEP) === 0 };
};
// one run: its hashes, a second apart; the bytes a state recording at 10 samples a second would take
// (s, lat, speed as 4-byte floats and a byte of state for the player and each active vehicle); and how many
// inputs changed (what an input recording would hold)
const play = (level, seedValue) => {
  g.select(level);
  seed(seedValue);
  G.evil = false;
  // (and the save as it was: a run reads it, and writes to it. The milestone counters carry on from the run before,
  // and one reached says so with a line picked by the dice; TANK RAGE pieces found are kept. A recording's header
  // would hold these: see REPLAY-NOTES.md, "What is in the garage")
  Object.assign(Progress.data, { stats: {}, tankPieces: 0, money: 0, bestTime: { good: {}, evil: {} } });
  // (the level built afresh from the seed: building it draws random numbers too, and what it builds is kept from
  // run to run otherwise, so a run would depend on whether the level was already loaded: see REPLAY-NOTES.md)
  // (the tiers are on by default: a tier level starts only in a car of its tier, and the player owns the Commuter alone. Own every
  // car, so the level starts in a car of its tier as a player's would: the rule is the game's own, only the garage is full)
  Progress.data.cars = [...new Set([...Progress.data.cars, ...g.cars.CARS.map(c => c.id)])];
  if (!KEEP_LEVEL) G.loaded = null;
  G.start();
  const hashes = [], perSecond = Math.round(1 / STEP);
  let stateBytes = 0, inputChanges = 0, last = '', busiest = 0;
  for (let i = 0; i < SECONDS * perSecond && G.state === 'playing'; i++) {
    const input = inputAt(i), key = input.throttle + ',' + input.steer;
    if (key !== last) { inputChanges++; last = key; }
    g.drive(input.throttle, input.steer);
    if (input.throws) { Input.emit('throw'); inputChanges++; }
    G.update(STEP);
    g.FxQueue.length = 0;
    if (i % Math.round(perSecond / 10) === 0) {
      const active = Traffic.cars.filter(c => c.active).length;
      busiest = Math.max(busiest, active);
      stateBytes += 13 * (1 + active) + 3 * Collision.obstacles.filter(o => !o.gone && Math.abs(o.s - P.s) < 400).length;
    }
    if ((i + 1) % perSecond === 0) hashes.push(hashOf(snapshot()));
  }
  return { hashes, stateBytes, inputChanges, busiest, seconds: hashes.length, end: G.state + ' at ' + P.s.toFixed(1) + ' m' };
};

try {
  const levels = ids.length ? ids : ['expressway', 'tokyo', 'marina-bay'];
  for (const id of levels) {
    console.log(id);
    const a = play(id, 12345), b = play(id, 12345), c = play(id, 999);
    const first = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
    check(first < 0 && a.hashes.length === b.hashes.length, first < 0 ? `the same seed and inputs: the same run, ${a.seconds} s of it (${a.end})` : `the same seed and inputs: the runs part at ${first + 1} s of ${a.seconds} (${a.end} / ${b.end})`);
    check(c.hashes.some((h, i) => h !== a.hashes[i]), 'another seed: another run (' + c.end + ')');
    const perMinute = (n) => Math.round(n * 60 / Math.max(1, a.seconds));
    console.log(`         up to ${a.busiest} vehicles at once; a state recording at 10 a second: about ${Math.round(perMinute(a.stateBytes) / 1024)} KB a minute; ` +
      `an input recording: ${perMinute(a.inputChanges)} changes a minute (about ${perMinute(a.inputChanges) * 3} bytes)`);
  }
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
