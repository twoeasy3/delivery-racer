// A check of the DRIVING LESSON (the hidden level `tutorial`, ?hidden=tutorial; NEW-PLAYER-IDEAS.md), headless:
//  - it is hidden as the other hidden levels are: in HIDDEN_LEVELS, not on the menu (LEVELS), in no tier (tiers.json), and a
//    run on it banks nothing (the bank and the best times are the same after a delivered run)
//  - its lessons: zones in order along the road, end to end, each with its line (messages.json "lessons", short: a phone),
//    no zone welcome said twice (no "zones" line for a lesson's zone), the prompt render/lessoncue.js shows is that line
//  - each lesson has what it teaches, and only the one lesson its things: cash rows in alternating lanes (steer), nothing on the
//    road (speed), boost pads (boost), time pluses (clock), obstacles one lane at a time with the other lane open (obstacles),
//    cash on the shoulder (traffic); no obstacle anywhere else; no police in the traffic; every pickup row has a lane on the
//    player's side
//  - a clean ghost run (cleanrun.js, the reference car) delivers, and so does a run in the COMMUTER (a brand-new player's car)
//    with the traffic on, steered by a simple autopilot round the obstacles and the traffic: delivered on time, never wrecked
//    or busted, with time to spare, and some traffic met on the traffic lesson
//  - the clock is generous: at least 1.5 x the Commuter's own flat-out time, on both sides
//   node scripts/.tutorial-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const L = g.levels, level = L.HIDDEN_LEVELS.tutorial;
  check(!!level, 'HIDDEN_LEVELS.tutorial is there');
  check(!L.LEVELS.includes(level), 'not on the menu (not in LEVELS)');
  const tiers = readFileSync(new URL('../src/delivery/tiers.json', import.meta.url), 'utf8');
  check(!/"tutorial"/.test(tiers), 'in no tier (tiers.json does not name it)');
  const progressSrc = readFileSync(new URL('../src/delivery/progress.js', import.meta.url), 'utf8');
  check(!/tutorial/i.test(progressSrc), 'progress.js (INSERTED_AT) does not name it');

  // ---- the lessons ----
  const MESSAGES = JSON.parse(readFileSync(new URL('../src/delivery/messages.json', import.meta.url), 'utf8'));
  const { lessonAt, lessonLine, LESSON_LEVELS } = await g.load('render/lessoncue.js');
  check(LESSON_LEVELS.includes('tutorial'), 'render/lessoncue.js knows it as a lesson level');
  const length = level.segments.reduce((sum, seg) => sum + seg.length, 0);
  const zones = level.zones;
  check(zones[0].from === 0 && zones.at(-1).to === length && zones.every((z, i) => i === 0 || z.from === zones[i - 1].to),
    `${zones.length} lessons, end to end over the ${length} m road: ${zones.map(z => z.id.replace('tut', '') + ' ' + z.from).join(', ')}`);
  for (const z of zones) {
    const line = lessonLine(z.id);
    check(!!line && line.length <= 40, `${z.id}: "${line}" (${line.length} characters, 40 at most)`);
    check(!MESSAGES.zones[z.id], `${z.id}: no zone welcome besides (said once)`);
    const cue = lessonAt(level, z.from + 20);
    check(cue && cue.text === line && cue.step === zones.indexOf(z) + 1 && cue.of === zones.length, `${z.id}: the prompt 20 m in is "${cue?.text}" (${cue?.step}/${cue?.of})`);
    check(!lessonAt(level, Math.min(z.to - 1, z.from + 230)) || z.to - z.from < 230, `${z.id}: the prompt is gone further in`);
  }
  const zoneOf = (s) => zones.find(z => s >= z.from && s < z.to)?.id;
  const items = (list, kind) => (level[list] || []).filter(p => !kind || p.type === kind);
  const inZone = (id, list) => list.filter(p => zoneOf(p.s ?? p.from) === id);
  const cashRows = (id) => {
    const rows = new Map();
    for (const p of inZone(id, level.pickups.filter(p => p.type.startsWith('cash')))) rows.set(p.s, [...(rows.get(p.s) || []), p]);
    return [...rows.values()];
  };
  const best = (row) => row.reduce((a, b) => (Number(b.type.slice(4)) > Number(a.type.slice(4)) ? b : a)).lane;
  const steer = cashRows('tutSteer');
  check(steer.length >= 3 && steer.every(r => r.length >= 2) && steer.every((r, i) => i === 0 || best(r) !== best(steer[i - 1])),
    `steer: ${steer.length} cash rows of two, the big note swapping lanes each time`);
  check(inZone('tutSpeed', [...level.obstacles, ...level.pickups.filter(p => !p.type.startsWith('cash'))]).length === 0, 'speed: nothing on the road but a row of cash');
  check(inZone('tutBoost', level.boostPads).length >= 1 && level.boostPads.every(p => zoneOf(p.from) === 'tutBoost'), `boost: ${level.boostPads.length} boost pads, all in its lesson`);
  check(inZone('tutClock', items('pickups', 'timePlus')).length >= 1 && items('pickups', 'timePlus').every(p => zoneOf(p.s) === 'tutClock'), 'clock: the time pluses, all in its lesson');
  const obs = level.obstacles;
  check(obs.length >= 2 && obs.every(o => zoneOf(o.s) === 'tutObstacles'), `obstacles: ${obs.length}, all in its lesson`);
  check(obs.every((o, i) => [2, 3].includes(o.lane) && obs.filter(p => p.s === o.s).length === 1 && (i === 0 || o.s - obs[i - 1].s >= 60)),
    'obstacles: one lane at a time (the other lane open), 60 m apart at least');
  check(inZone('tutTraffic', level.pickups.filter(p => p.lane === 'right' || p.lane === 'left')).length >= 1, 'traffic: cash on the shoulder');
  check(!(level.traffic.police > 0) && !level.trafficZones, 'no police in the traffic (the shoulder cannot bust)');
  const rows = new Map();
  for (const p of level.pickups) rows.set(p.s, [...(rows.get(p.s) || []), p.lane]);
  check([...rows.values()].every(lanes => lanes.some(l => l === 2 || l === 3 || l === 'right')), 'every pickup row is on the player\'s side');
  check(level.quietZones?.[0]?.from === 0 && level.quietZones[0].to === zones.find(z => z.id === 'tutTraffic').from && level.quietZones[0].density === 0,
    'no traffic turns up before the traffic lesson (a quiet stretch, density 0)');

  // ---- a clean ghost run (the reference car), and the bank untouched ----
  const before = JSON.stringify({ money: g.progress.data.money, best: g.progress.data.bestTime });
  g.select('tutorial');
  const { cleanRun } = await g.load('cleanrun.js');
  const clean = cleanRun();
  check(clean.delivered, `a clean run delivers: ${clean.time.toFixed(1)} s in the ${clean.car} (${clean.pluses} time pluses)`);
  check(JSON.stringify({ money: g.progress.data.money, best: g.progress.data.bestTime }) === before, 'nothing banked, no best time recorded (a hidden level)');

  // ---- the Commuter, traffic on, an autopilot, five seeded runs (the dice: mulberry32, as cleanrun.js) ----
  const { Player, Game, Traffic, track: { Track } } = g;
  const { swapDice } = await g.load('util.js');
  const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  g.select('tutorial');
  g.cars.selectCar('commuter');
  const top = g.cars.carStats(g.cars.CAR).maxSpeed;
  const flatOut = length / top + top / g.cars.carStats(g.cars.CAR).accel / 2; // (the road at its top speed, and getting up to it)
  check(level.clock.good >= 1.5 * flatOut && level.clock.evil >= 1.5 * flatOut, `the clock (${level.clock.good} / ${level.clock.evil} s) is at least 1.5 x the Commuter's flat-out ${flatOut.toFixed(0)} s`);
  let throttle = 1, steerIn = 0;
  Object.defineProperty(g.Input, 'throttle', { get: () => throttle, configurable: true });
  Object.defineProperty(g.Input, 'steer', { get: () => steerIn, configurable: true });
  const runs = [];
  const dice = Math.random;
  for (const seed of [1, 2, 3, 4, 5]) {
    const roll = mulberry(seed * 7919);
    Math.random = roll; const was = swapDice(roll);
    try {
      g.select('tutorial');
      g.cars.selectCar('commuter');
      Game.evil = seed % 2 === 0; // (both sides)
      Game.start();
      let lane = 3, worst = Player.health;
      const met = new Set(), early = new Set();
      const laneLat = (k, s) => Track.laneOffset(k, s);
      const blocked = (k, from, ahead) => level.obstacles.some(o => o.lane === k && o.s > from && o.s - from < ahead) ||
        Traffic.cars.some(c => c.active && c.dir === Player.dir && Math.abs(c.lat - laneLat(k, c.s)) < 1.6 && c.s > from - 6 && c.s - from < ahead);
      const trafficAt = zones.findIndex(z => z.id === 'tutTraffic');
      const t = g.run(400, () => {
        const s = Player.s, other = lane === 3 ? 2 : 3;
        if (blocked(lane, s, 45) && !blocked(other, s, 45)) lane = other;
        throttle = blocked(lane, s, 18) ? -1 : 1;
        steerIn = Math.max(-1, Math.min(1, (laneLat(lane, s) - Player.lat) * 0.8));
        worst = Math.min(worst, Player.health);
        const k = zones.findIndex(z => z.id === zoneOf(s));
        for (const c of Traffic.cars) if (c.active && Math.abs(c.s - s) < 120) { if (k === trafficAt) met.add(c); else if (k < trafficAt && c.dir === Player.dir && c.s > s) early.add(c); }
        return Game.state === 'finished';
      });
      runs.push({ seed, evil: Game.evil, outcome: Game.outcome, t, spare: Game.remaining, cash: Game.cash, wrecks: Game.wrecks, busts: Game.busts, worst, max: Player.maxHealth, met: met.size, early: early.size });
    } finally { Math.random = dice; swapDice(was); }
  }
  for (const r of runs) console.log(`  info  seed ${r.seed} (${r.evil ? 'Evil' : 'Good'}): ${r.outcome}, ${r.spare?.toFixed(1)} s to spare, $${r.cash} cash, health down to ${Math.round(r.worst)} of ${r.max}, ${r.met} vehicles met on the traffic lesson, ${r.early} going its way before it`);
  check(runs.every(r => r.outcome === 'delivered' && r.spare >= 30), 'the Commuter delivers every run, 30 s or more to spare');
  check(runs.every(r => r.wrecks === 0 && r.busts === 0), 'never wrecked nor busted');
  const metSorted = runs.map(r => r.met).sort((x, y) => x - y), median = metSorted[2];
  check(median >= 2, `traffic is met on the traffic lesson (median ${median} vehicles within 120 m)`);
  console.log(`  info  before the traffic lesson: ${runs.map(r => r.early).join(', ')} vehicles going the player's way met within 120 m ahead (the cars on the road at the start: a quiet stretch takes off only those beyond ${g.CONFIG.quietCull} m)`);
  check(JSON.stringify({ money: g.progress.data.money, best: g.progress.data.bestTime }) === before, 'still nothing banked');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await g.close();
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
