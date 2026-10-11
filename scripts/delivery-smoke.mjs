// Headless smoke test: runs the game logic (no rendering) through every level and checks
// that nothing breaks. Run with: npm run test:delivery, or with --quick (npm run
// test:delivery:quick), which skips driving every level to the finish on both sides (the
// slowest part by far) but keeps every other check. Each section says how long it took.
import { logicServer } from './delivery-headless.mjs'; // (a Vite server that shares no cache with any other run)

// the game logic touches the DOM only to show / hide screens
const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
// every level unlocked and every car owned, so each can be loaded and tested
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['commuter', 'junker', 'darkvan', 'lowrider', 'wagon', 'sport', 'lovebus', 'taxi', 'suv', 'hotrod', 'minivan', 'hearse', 'miata', 'pickup', 'muscle', 'fullsize', 'evsaloon', 'postvan', 'keitruck', 'mini', 'hothatch', 'ute', 'buggy', 'liftedtruck', 'sleeper', 'rally', 'towtruck', 'rotary', 'superlowrider', 'classicgt', 'sixbysix', 'tank'] }));
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };

// the game's dice are loaded, so a run is the same every time: a check that fails, fails again, and can be
// looked into (--seed=n for another run of the dice). They are loaded afresh for every section, from the
// seed and the section's name, and again after every check, from those and how many checks into the
// section it is: so how many dice one test throws (a level given more cyclists, say) never changes the
// throws of the tests in other sections, nor of the ones before it in its own
const SEED = Number((process.argv.find(a => a.startsWith('--seed=')) || '').slice(7)) || 20261008;
let dice = SEED;
Math.random = () => { // (mulberry32)
  dice = (dice + 0x6d2b79f5) | 0;
  let t = Math.imul(dice ^ (dice >>> 15), 1 | dice);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const reseed = (...parts) => { // (FNV-1a over the seed and the parts)
  let h = 0x811c9dc5;
  for (const ch of [SEED, ...parts].join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  dice = h | 0;
};
const server = await logicServer();
let failures = 0;
const QUICK = process.argv.includes('--quick');
// --levels=id,id: only the per-level checks (the first section), for those levels (a menu level's id, as levels/<file>.json has it)
const ONLY_LEVELS = (() => { const ids = (process.argv.find(a => a.startsWith('--levels=')) || '').slice(9).split(',').filter(Boolean); return ids.length ? ids : null; })();
// a section's heading, after how long the one before took
const started = Date.now();
let sectionStart = started;
let sectionName = '', checksIn = 0; // (the section the checks are in, and how many so far: see reseed)
const section = (name) => {
  const now = Date.now();
  if (now - sectionStart > 50) console.log(`  (${((now - sectionStart) / 1000).toFixed(1)} s)`);
  sectionStart = now;
  if (name) console.log(name);
  sectionName = name || '';
  checksIn = 0;
  reseed(sectionName);
};
const check = (ok, what) => {
  if (!ok) failures++;
  console.log((ok ? '  ok    ' : '  FAIL  ') + what);
  reseed(sectionName, ++checksIn);
};

try {
  const load = (path) => server.ssrLoadModule(path);
  const levels = await load('/src/delivery/levels.js');
  const track = await load('/src/delivery/track.js');
  const { Game } = await load('/src/delivery/game.js');
  const { Player } = await load('/src/delivery/player.js');
  const { Collision } = await load('/src/delivery/collision.js');
  const { Traffic } = await load('/src/delivery/traffic.js');
  const { Input } = await load('/src/delivery/input.js');
  const { FxQueue } = await load('/src/delivery/physics.js');
  const cars = await load('/src/delivery/cars.js');
  const themes = await load('/src/delivery/themes.js');
  const { Water } = await load('/src/delivery/water.js');
  const { CONFIG } = await load('/src/delivery/config.js');
  // (the tiers are on by default: a tier level starts only in a car of its tier, and a new save owns the Commuter alone. Own every
  // car, so each level starts as a player's would; the rule is the game's own, only the garage is full)
  const { Progress } = await load('/src/delivery/progress.js');
  Progress.data.cars = cars.CARS.map(c => c.id);
  Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });

  check(track.Track === null, 'nothing of a level is built before a run starts');

  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    if (ONLY_LEVELS && !ONLY_LEVELS.includes(levels.LEVEL.id)) continue;
    section(`level ${n + 1}: ${levels.levelName(levels.LEVEL)}`);

    // drive flat out, throwing packages, kept alive so the whole course is covered
    // (in quick mode, only the Good side's level checks: no drive)
    for (const evil of QUICK ? [false] : [false, true]) {
      Game.evil = evil;
      Game.start(); // this is what loads the level
      if (!evil) {
        const problems = track.Track.problems;
        check(Game.loaded === levels.LEVEL, 'starting a run loads the level picked on the menu');
        check(problems.length === 0, 'level data has no problems' + (problems.length ? ': ' + problems.join('; ') : ''));
        // heights: a level with grades has hills, the rest are flat; slopes stay gentle and smooth
        const T = track.Track, p = {}, wantHills = levels.LEVEL.segments.some(seg => seg.grade);
        let low = Infinity, high = -Infinity, steepest = 0, sharpest = 0, last = null;
        for (let s = T.start; s <= T.end; s += 2) {
          T.toWorld(s, 0, p);
          low = Math.min(low, p.y); high = Math.max(high, p.y);
          steepest = Math.max(steepest, Math.abs(T.grade(s)));
          if (last !== null) sharpest = Math.max(sharpest, Math.abs(T.grade(s) - last));
          last = T.grade(s);
        }
        // (a kink is judged against the level's own crests: a slope eases into the next over the segment's "ease" metres each way
        // (CONFIG.gradeEase if it has none), so the grade can change by up to the step between two segments' grades over that,
        // per metre, a little over: the stock 0.03 stands where the levels' eases are the default, and a gamble's sharp crest
        // (Mystery Meadows' ease of 6) is allowed the sharpness it was given. A hill that rises under 2 m is not a hill)
        const segs = levels.LEVEL.segments;
        let kinkLimit = 0.03;
        for (let i = 1; i < segs.length; i++) {
          const ease = Math.min(segs[i - 1].ease || CONFIG.gradeEase, segs[i].ease || CONFIG.gradeEase);
          kinkLimit = Math.max(kinkLimit, 1.25 * Math.abs((segs[i].grade || 0) - (segs[i - 1].grade || 0)) / ease);
        }
        check(T.hilly === wantHills && Number.isFinite(high) && Math.abs(low) < 1e-6 &&
          (wantHills ? high > 2 && steepest <= Math.max(...segs.map(seg => Math.abs(seg.grade || 0))) + 1e-9 && sharpest < kinkLimit : high === 0),
          wantHills ? `hills: road height runs from 0 to ${high.toFixed(1)} m, steepest slope ${(steepest * 100).toFixed(1)}%, no sharp kinks`
            : 'the road is flat');
      }
      if (QUICK) continue;
      // (the drive is in a car of the test's own, to get it over with: the garage's Commuter with a top speed of
      // 99 m/s and the acceleration to reach it, nothing else about it changed, and its own again afterwards.
      // A level with a vehicle of its own is driven in that, as it is)
      const drive = cars.CARS[0], stock = { maxSpeed: drive.maxSpeed, accel: drive.accel };
      Object.assign(drive, { maxSpeed: 99, accel: 30 });
      let sane = true, steps = 0;
      while (Game.state === 'playing' && steps < 120 * 600) {
        if (steps % 40 === 0) Input.emit('throw');
        Player.health = Player.maxHealth;
        Game.busts = 0;
        Game.time = 0; // hold the clock: this run is about the road, not the deadline
        Game.update(1 / 120);
        FxQueue.length = 0;
        for (const v of Collision.bodies) {
          if (v.active && ![v.s, v.lat, v.vs, v.health].every(Number.isFinite)) sane = false;
        }
        for (const o of Collision.obstacles) {
          if (![o.s, o.lat, o.h].every(Number.isFinite)) sane = false;
        }
        steps++;
      }
      Object.assign(drive, stock);
      const side = evil ? 'Evil' : 'Good';
      check(sane, `${side}: every vehicle and obstacle keeps a finite position, speed and health`);
      check(Game.outcome === 'delivered', `${side}: reaches the finish (outcome: ${Game.outcome || 'still driving'})`);
    }

    // obstacles: the movers stay on the road in their stretches, and driving into one of
    // each kind blows it up and costs what CONFIG says
    Game.evil = false;
    Game.start();
    const kinds = [...new Set(Collision.obstacles.map(o => o.kind))];
    let contained = true;
    for (let i = 0; i < 120 * 60; i++) {
      Collision.updateObstacles(1 / 120);
      for (const o of Collision.obstacles) {
        if (o.from === undefined) continue;
        const reach = o.kind === 'tractor' ? o.hw : o.hl; // cows and frogs lie across the road
        if (o.s < o.from - 0.01 || o.s > o.to + 0.01) contained = false;
        if (o.lat < track.Track.lo(o.s) + reach - 0.01 || o.lat > track.Track.hi(o.s) - reach + 0.01) contained = false;
      }
    }
    check(contained, `obstacles (${kinds.join(', ')}) stay on the road within their stretches`);
    for (const kind of kinds) {
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      // (for an asteroid, one that is at road level: the others pass over or under the car)
      const o = Collision.obstacles.find(x => x.kind === kind && (kind !== 'asteroid' || (Collision.atRoadLevel(x) && !x.bob)));
      for (const other of Collision.obstacles) if (other !== o) other.gone = true; // (herds can stand two deep)
      if (kind === 'dropBear') o.h = 0; // (down from its tree)
      if (kind === 'rock' || kind === 'lavaRock') Object.assign(o, { h: 0, lat: o.land ?? o.lat }); // (come down the hillside, onto the road; a level's own rock, not a rockfall's, is on the road already)
      if (kind === 'landmine') o.buried = false; // (up out of the dirt, as it is once the player is near)
      o.gone = false; // (a pipe waits on its stack, out of play, until it rolls)
      Player.s = o.knock ? o.s - o.hl - 0.5 : o.s - 1; Player.lat = o.lat; // overlapping it (a knock from behind: the car's nose in its tail) Player.speed = 20; Player.launching = false;
      Collision.check();
      FxQueue.length = 0;
      const cost = CONFIG.obstacleKinds[kind];
      // (a landmine destroys the car outright, whatever its health)
      // (the 6x6 ignores rockfall, free: the tiers put it in on the levels of its tier, Far Side's and Eruption Day's among them)
      const ignored = (kind === 'rock' || kind === 'lavaRock') && cars.CAR.trait === 'rocks';
      const damage = ignored ? 0 : kind === 'landmine' ? Player.maxHealth : kind === 'asteroid' ? Math.min(cost.maxDamage, cost.damage * o.r) : cost.damage;
      if (o.knock) {
        // (a wide load or its escort is not blown up: it is a knock. It stays, the car is put clear of it, and it costs what the kind says
        // (here from behind: the car is put at its tail) once; the next touch costs nothing until its `knocked` has counted down)
        const once = Math.abs(Player.health - (Player.maxHealth - damage)) < 1e-6 && !o.gone && o.knocked > 0 && Player.s < o.s;
        const health = Player.health;
        Player.s = o.s - o.hl - 0.5; Player.lat = o.lat;
        Collision.check();
        FxQueue.length = 0;
        check(once && Player.health === health,
          `hitting a ${kind} is a knock: it stays, costs ${damage.toFixed(0)} health once, and a second touch straight after costs nothing`);
        continue;
      }
      check(o.gone && Math.abs(Player.health - (Player.maxHealth - damage)) < 1e-6,
        `hitting a ${kind} destroys it and costs ${kind === 'landmine' ? 'all its' : damage.toFixed(0)} health${ignored ? ' (the 6x6 shrugs rocks off)' : ''}`);
    }

    if (kinds.includes('asteroid')) {
      // asteroids: the same field every run, a mix of sizes, some off the road's level
      // (which can't be hit), some moving
      let rocks = Collision.obstacles.filter(o => o.kind === 'asteroid');
      const layout = rocks.map(o => [o.s, o.lat0, o.r, o.h0].map(v => v.toFixed(3)).join()).join(';');
      Game.load();
      rocks = Collision.obstacles.filter(o => o.kind === 'asteroid'); // the freshly built ones
      const again = Collision.obstacles.filter(o => o.kind === 'asteroid').map(o => [o.s, o.lat0, o.r, o.h0].map(v => v.toFixed(3)).join()).join(';');
      const level = rocks.filter(o => Collision.atRoadLevel(o)).length;
      const moving = rocks.filter(o => o.vLat || o.bob).length;
      const sizes = rocks.map(o => o.r);
      check(layout === again && level > 0 && level < rocks.length && moving > 0 && moving < rocks.length,
        `${rocks.length} asteroids, radius ${Math.min(...sizes).toFixed(1)}-${Math.max(...sizes).toFixed(1)} m: ${level} at road level, ${rocks.length - level} above or below it, ${moving} moving; same layout every run`);
      const off = rocks.find(o => !Collision.atRoadLevel(o) && !o.bob && !o.vLat);
      Game.start();
      Player.s = off.s; Player.lat = off.lat; Player.speed = 20; Player.launching = false;
      Collision.check();
      check(!off.gone && Player.health === Player.maxHealth, `an asteroid ${off.h.toFixed(1)} m off the road's level can be driven straight under or over`);
      if (levels.LEVEL.car === 'ufo') { // (an asteroid field is not the UFO's alone: Far Side drives it in a car)
        check(cars.CAR.ufo === true && Player.hw === cars.LEVEL_CARS.ufo.hw, 'the level is flown in a UFO, whatever car is in the garage');
        // the UFO is very fast and agile: flat out on a clear road, then a hard swerve
        Game.start();
        let steerNow = 0, topSpeed = 0, sideSpeed = 0;
        Object.defineProperty(Input, 'steer', { get: () => steerNow, configurable: true });
        for (let i = 0; i < 120 * 8; i++) {
          for (const o of Collision.obstacles) o.gone = true;
          steerNow = i > 120 * 7 ? 1 : 0;
          Game.update(1 / 120);
          FxQueue.length = 0;
          topSpeed = Math.max(topSpeed, Player.speed);
          sideSpeed = Math.max(sideSpeed, Player.latVel);
        }
        steerNow = 0;
        check(topSpeed > 55 && sideSpeed > 20, `the UFO reaches ${(topSpeed * 3.6).toFixed(0)} km/h and moves sideways at ${sideSpeed.toFixed(0)} m/s (a car manages ${CONFIG.steerSpeed})`);
        // this level has the shoulder timer off: the shoulder is there and can be driven on
        // for as long as you like
        Game.start();
        steerNow = 1;
        let onShoulder = false, lowestDanger = Infinity;
        for (let i = 0; i < 120 * 6; i++) {
          for (const o of Collision.obstacles) o.gone = true;
          Game.update(1 / 120);
          FxQueue.length = 0;
          if (Player.onShoulder) onShoulder = true;
          lowestDanger = Math.min(lowestDanger, Player.danger);
        }
        steerNow = 0;
        const T2 = track.Track;
        check(T2.shoulder === CONFIG.shoulder && Player.lat > T2.laneHi(Player.s) && !onShoulder &&
          lowestDanger === CONFIG.dangerTime && Game.busts === 0 && !Player.busted,
          'shoulder timer off: 6 s on the shoulder, the timer never moves and nobody is busted');
        let anyTraffic = false;
        for (let i = 0; i < 120 * 20; i++) { Game.update(1 / 120); FxQueue.length = 0; if (Traffic.cars.some(c => c.active)) anyTraffic = true; }
        check(!anyTraffic, 'no traffic at all');
      }
    }
    if (levels.LEVEL.car !== 'ufo') {
      check(track.Track.shoulder === (levels.LEVEL.shoulder ?? CONFIG.shoulder), 'the shoulders are there (as wide as the level has them)');
      check(!cars.CAR.ufo, 'the garage car is back on this level');
    }

    if ((levels.LEVEL.drifters || []).length) {
      // drifters: obstacles that move about the road in patterns, all of them on the move
      Game.start();
      const drifters = Collision.obstacles.filter(o => o.drift);
      const before = drifters.map(o => [o.s, o.lat]), furthest = drifters.map(() => 0);
      let jump = 0; // the biggest move in one step: none of them may teleport
      for (let i = 0; i < 120 * 3; i++) {
        const last = drifters.map(o => [o.s, o.lat]);
        Collision.updateObstacles(1 / 120);
        drifters.forEach((o, k) => {
          furthest[k] = Math.max(furthest[k], Math.hypot(o.s - before[k][0], o.lat - before[k][1]));
          jump = Math.max(jump, Math.hypot(o.s - last[k][0], o.lat - last[k][1]));
        });
      }
      const moved = furthest.filter(d => d > 1).length;
      const patterns = [...new Set(drifters.map(o => o.drift))];
      check(drifters.length === levels.LEVEL.drifters.reduce((n, z) => n + (z.count || 0), 0) + (levels.LEVEL.obstacles || []).filter(o => o.drift).length && drifters.length > 0 && moved === drifters.length && jump < 1,
        `${drifters.length} drifters (${patterns.join(', ')}): every one moves within 3 s, none jumps (largest step ${jump.toFixed(2)} m)`);
    }

    if ((levels.LEVEL.tractors || []).length) {
      // tractors: traffic vehicles, starting from the same spots every run
      const spots = () => Traffic.cars.filter(c => c.active && c.kind === 'tractor').map(c => c.s.toFixed(1) + '/' + c.lane).sort().join(' ');
      Game.start();
      const first = spots();
      Game.start();
      const tractors = Traffic.cars.filter(c => c.active && c.kind === 'tractor');
      check(first === spots() && tractors.length === levels.LEVEL.tractors.length &&
        !Collision.obstacles.some(o => o.kind === 'tractor'),
        `${tractors.length} tractors are traffic, not obstacles, and start in the same places every run (${first})`);
      // one of them is hit like any other vehicle: it shoves and is shoved, it doesn't just vanish
      const t = tractors.find(c => c.dir > 0);
      for (const c of Traffic.cars) if (c !== t) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Player.s = t.s - 6; Player.lat = t.lat; Player.speed = 30; Player.launching = false;
      const before = t.health;
      for (let i = 0; i < 60; i++) { for (const c of Traffic.cars) if (c !== t) c.active = false; Game.update(1 / 120); FxQueue.length = 0; }
      check(t.active && t.health < before && Player.health < Player.maxHealth && t.vs > 0,
        `running into a tractor is a crash: it takes ${(before - t.health).toFixed(0)} damage, the player ${(Player.maxHealth - Player.health).toFixed(0)}, and it is shoved forward`);
    }

  }

  if (ONLY_LEVELS) { // (--levels=id,id: only the per-level checks above, for the levels named: seconds; the other sections are not run)
    const missing = ONLY_LEVELS.filter(id => !levels.LEVELS.some(l => l.id === id));
    if (missing.length) { failures++; console.log('  FAIL  no such level on the menu: ' + missing.join(', ')); }
    throw 'levels only';
  }

  // the clock: sitting still runs it out and drains the tip. On a level of the test's own, with a clock of 30 s
  // (the clock is the same one on every level, and sitting each of theirs out was most of a run's time)
  section('the clock');
  {
    levels.selectSpecial({ id: 'clock', name: 'clock', clock: { good: 30, evil: 30 }, tip: 50, traffic: {}, segments: [{ length: 3000, curve: 0 }] });
    Game.evil = false;
    Game.start();
    const allowed = Game.allowed;
    let steps = 0;
    for (; steps < 120 * (allowed + CONFIG.tipCountdown + 10) && Game.state === 'playing'; steps++) {
      Player.speed = 0;
      Player.launching = false;
      Player.health = Player.maxHealth;
      Game.update(1 / 120);
      FxQueue.length = 0;
    }
    check(Math.abs(allowed - 30) < 1e-6 && Game.outcome === 'timeout' && Game.tip === 0 && Math.abs(steps / 120 - (allowed + CONFIG.tipCountdown)) < 1,
      `standing still on a ${allowed.toFixed(0)} s clock ends in a timeout with no tip, ${(steps / 120).toFixed(1)} s in (outcome: ${Game.outcome}, tip: ${Game.tip})`);
    Game.toMenu();
  }

  // the screensaver: its own level, no player car, traffic that crashes on its own, and the
  // road goes round and round until Exit
  section('screensaver');
  {
    levels.selectLevel(2);
    Game.startScreensaver();
    const T = track.Track;
    check(Game.state === 'playing' && Game.screensaver && levels.LEVEL === levels.SCREENSAVER_LEVEL && T.problems.length === 0 &&
      T.laneCount === 8 && T.flow === 'south' && Traffic.cars.every(c => c.unused || c.dir < 0),
    `starts on "${levels.levelName(levels.LEVEL)}": ${T.laneCount} lanes, everything oncoming, no level problems`);
    const inPlay = Traffic.cars.filter(c => !c.unused).length;
    let laps = 0, ghost = true, lowest = Infinity, highest = -Infinity, maxActive = 0, lastS = 0;
    // (half a minute of it, and then, the dolly put down 150 m short of the end of its lap, the lap coming round)
    for (let i = 0; i < 120 * 45; i++) {
      if (i === 120 * 30) lastS = Player.s = T.length - 150;
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (Player.ghost <= 0 || Player.speed !== CONFIG.screensaver.speed) ghost = false;
      lowest = Math.min(lowest, Player.lat); highest = Math.max(highest, Player.lat);
      if (Player.s < lastS) laps++;
      lastS = Player.s;
      maxActive = Math.max(maxActive, Traffic.cars.filter(c => c.active).length);
    }
    check(inPlay === levels.SCREENSAVER_LEVEL.trafficCount + levels.SCREENSAVER_LEVEL.oncomingCount && maxActive > CONFIG.trafficCount + CONFIG.oncomingCount,
      `${inPlay} vehicles in play, up to ${maxActive} on the road at once (a normal level has ${CONFIG.trafficCount + CONFIG.oncomingCount})`);
    check(ghost && Player.health === Player.maxHealth && Game.busts === 0 && lowest === 0 && highest === 0,
      `the dolly is a ghost at a steady ${CONFIG.screensaver.speed} m/s, never hurt, on the centre line (lat ${lowest} to ${highest})`);
    check(laps >= 1 && Game.state === 'playing' && Game.outcome === '', `went round ${laps} time(s) with no finish and no timeout`);
    const tractors = Traffic.cars.filter(c => c.active && c.kind === 'tractor').length;
    check(tractors > 0, `${tractors} tractors are out again on the new lap`);
    Game.togglePause();
    const s = Player.s;
    Game.update(1 / 120);
    check(Game.paused && Player.s === s, 'paused: nothing moves');
    Game.togglePause();
    Game.update(1 / 120);
    check(!Game.paused && Player.s > s, 'resumed: it moves again');
    Game.exit();
    check(Game.state === 'start' && !Game.screensaver && !Game.paused && levels.LEVEL === levels.LEVELS[2],
      'Exit: back on the menu with the level the menu had picked');
    // a normal run keeps its usual traffic counts
    levels.selectLevel(1);
    Game.start();
    const L1 = levels.LEVEL;
    const usual = (L1.trafficCount ?? CONFIG.trafficCount) + (L1.oncomingCount ?? CONFIG.oncomingCount);
    let most = 0;
    for (let i = 0; i < 120 * 20; i++) { Game.update(1 / 120); FxQueue.length = 0; most = Math.max(most, Traffic.cars.filter(c => c.active).length); }
    check(Traffic.cars.filter(c => !c.unused).length === usual && most <= usual && usual < CONFIG.trafficPool && !Game.screensaver,
      `a normal run (${L1.name}): never more than its ${usual} vehicles on the road (at most ${most} in 20 s), and a player car`);
    const clock = Game.time;
    Game.togglePause();
    Game.update(1 / 120);
    check(Game.paused && Game.time === clock, 'a run can be paused: the clock stops too');
    Game.exit();
    check(Game.state === 'start' && !Game.paused, 'Exit level: back on the menu');
  }

  // going back to the menu and picking another level loads that one on the next start
  section('menu');
  Game.toMenu();
  levels.selectLevel(0);
  check(Game.state === 'start' && Game.loaded !== levels.LEVEL, 'back on the menu, picking a level does not load it');
  Game.start();
  check(Game.loaded === levels.LEVEL && track.Track.length === 3300, 'starting a run loads it (Expressway, 3300 m)');

  // collisions
  section('collisions');
  {
    const physics = await load('/src/delivery/physics.js');
    levels.selectLevel(0);
    // an empty road with the player at 200 m in lane 2 and one chosen vehicle beside / ahead
    const stage = (kind, bound, set) => {
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      const other = Traffic.cars.find(c => c.bound === bound), type = CONFIG.vehicles[kind];
      Object.assign(other, { active: true, kind, lane: 2, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, fixed: false,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health, sideTick: -999 });
      Player.s = 200; Player.launching = false; Player.lat = track.Track.laneOffset(2, 200); Player.speed = 30; Player.sideTick = -999;
      set(other);
      return other;
    };
    const tags = new Set(Traffic.cars.map(c => c.bound));
    check(Player.bound === 'north' && tags.size === 2 && Traffic.cars.every(c => (c.bound === 'north') === (c.dir > 0)),
      'every vehicle is tagged northbound (with the player) or southbound');

    // opposite directions: a head-on however they touch, here side by side
    let o = stage('darkvan', 'south', (c) => { c.s = 200; c.lat = Player.lat - 1.7; c.vs = -30; });
    Collision.check();
    check(!Player.active && !o.active, 'a southbound car brushing the side of the northbound player is a head-on: both wrecked');

    // same direction, side contact: nobody moves sideways; they are slid apart along the road
    o = stage('darkvan', 'north', (c) => { c.s = 200.5; c.lat = Player.lat + 1.6; c.vs = 30; });
    const lat0 = o.lat, playerLat0 = Player.lat, gap0 = o.s - Player.s;
    Player.latVel = 6; // steering into it
    for (let i = 0; i < 30; i++) { Player.latVel = 6; Collision.check(); }
    FxQueue.length = 0;
    check(o.lat === lat0 && Player.lat === playerLat0 && o.s - Player.s > gap0 + 2 && Player.health < Player.maxHealth && o.health < o.maxHealth,
      `steering into the side of a car: neither is shoved sideways, they slide ${(o.s - Player.s - gap0).toFixed(1)} m apart along the road, and both take damage once (player ${(Player.maxHealth - Player.health).toFixed(0)})`);

    // the player wins shoving matches: sideswiping a much slower car, or being rammed from
    // behind by a faster one, costs little speed, and the other vehicle is the one sent on its way
    o = stage('darkvan', 'north', (c) => { c.s = 200.5; c.lat = Player.lat + 1.6; c.vs = 15; });
    Player.speed = 45;
    for (let i = 0; i < 30; i++) { Player.latVel = 6; Collision.check(); }
    FxQueue.length = 0;
    const afterSwipe = Player.speed, carAfter = o.vs;
    o = stage('darkvan', 'north', (c) => { c.s = Player.s - Player.hl - c.hl + 0.2; c.lat = Player.lat; c.vs = 45; }); // (just touching)
    Player.speed = 15;
    Collision.check();
    FxQueue.length = 0;
    check(afterSwipe > 41 && carAfter > 40 && Player.speed < 20 && o.vs < 20,
      `at 45 m/s into traffic doing 15: a sideswipe leaves the player at ${afterSwipe.toFixed(1)} m/s (the car is sent off at ${carAfter.toFixed(1)}); rammed from behind at 45 while doing 15, the player is at ${Player.speed.toFixed(1)} and the rammer at ${o.vs.toFixed(1)}`);
    // ...except that running into the back of a traffic vehicle is the one shove the traffic
    // wins: the player loses most of the speed difference and is left behind it
    o = stage('bus', 'north', (c) => { c.s = 207; c.lat = Player.lat; c.vs = 15; });
    Player.speed = 45;
    Collision.check();
    FxQueue.length = 0;
    check(Player.speed < 30 && o.vs < 35 && Player.speed < o.vs,
      `ramming a bus doing 15 from behind at 45 leaves the player at ${Player.speed.toFixed(1)} m/s, behind the bus at ${o.vs.toFixed(1)}`);
    // a rear-end, even an off-centre one, turns neither vehicle
    o = stage('darkvan', 'north', (c) => { c.s = 204; c.lat = Player.lat + 1.2; c.vs = 15; });
    Player.speed = 45;
    Collision.check();
    FxQueue.length = 0;
    check(Player.yawVel === 0 && o.yawVel === 0, 'an off-centre rear-end gives neither vehicle any yaw');

    // a spinning car is not kept on the road
    o = stage('darkvan', 'north', (c) => { c.s = 260; c.lat = track.Track.laneOffset(3, 260); c.vs = 25; });
    physics.spinOut(o);
    o.spinRate = 0.8;
    let furthest = 0;
    for (let i = 0; i < 120 * 3 && o.active; i++) {
      Player.speed = 20;
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (o.active) furthest = Math.max(furthest, o.lat - track.Track.hi(o.s));
    }
    check(furthest > 1 && !o.active, `a spinning car leaves the road (${furthest.toFixed(1)} m past the edge of the shoulder) and then blows up`);

    // police: no bust if the police car was out of control, or oncoming
    o = stage('police', 'north', (c) => { c.s = 203; c.lat = Player.lat; c.vs = 10; });
    physics.spinOut(o);
    Collision.check();
    check(!Player.busted, 'hitting a police car that is spinning out: not busted');
    o = stage('police', 'south', (c) => { c.s = 203; c.lat = Player.lat; c.vs = -25; });
    Collision.check();
    check(!Player.busted && !Player.active, 'a head-on with an oncoming police car: wrecked, but not busted');
    FxQueue.length = 0;

    // critical hits: a small share of hits make the car wobble, and a wobble ends in a spin
    let crits = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const c = { health: 60, maxHealth: 60, mood: 0, spin: 0, wobble: 0 };
      physics.hurt(c, 1); // a light tap, far too small to spin it by damage alone
      if (c.wobble > 0) crits++;
    }
    o = stage('darkvan', 'north', (c) => { c.s = 300; c.lat = Player.lat; c.vs = 25; c.baseSpeed = 25; });
    o.wobble = CONFIG.critWobbleTime;
    let wobbled = 0, spun = false;
    for (let i = 0; i < 120 * 2; i++) {
      Player.speed = 20;
      Game.update(1 / 120);
      FxQueue.length = 0;
      wobbled = Math.max(wobbled, Math.abs(o.yaw));
      if (o.spin > 0) spun = true;
    }
    check(Math.abs(crits / N - CONFIG.critChance) < 0.01 && wobbled > 0.05 && spun,
      `critical hits: ${(crits / N * 100).toFixed(1)}% of hits; the car wobbles (up to ${(wobbled * 180 / Math.PI).toFixed(0)} degrees) and then spins out`);
  }

  // each level's traffic list sets what turns up and how often
  section('traffic lists');
  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    if (levels.LEVEL.zones) continue; // (each zone has a list of its own: see the zones' own check)
    const want = levels.LEVEL.traffic, kinds = Object.keys(want);
    const seen = {}, expected = {}, wet = (levels.LEVEL.water || []).length > 0;
    let count = 0;
    for (let r = 0; r < 60; r++) {
      Game.start();
      // (not a kind a stretch with a list of its own, a level's "trafficZones", sets there: the Hood's police)
      const own = (c) => !(levels.LEVEL.trafficZones || []).some(z => c.s >= z.from && c.s < z.to && c.kind in z.traffic);
      for (const c of Traffic.cars) if (c.active && !c.fixed && own(c)) {
        seen[c.kind] = (seen[c.kind] || 0) + 1; count++;
        if (wet) { // (boats turn up on the water only, cars off it: a vehicle is one of the kinds that can be where it is, by the list's shares)
          const here = kinds.filter(k => Water.allows(k, c.s, c.dir)), sum = here.reduce((t, k) => t + want[k], 0);
          for (const k of here) expected[k] = (expected[k] || 0) + want[k] / sum;
        }
      }
    }
    const total = kinds.reduce((sum, k) => sum + want[k], 0);
    // (within three standard deviations of the listed share, plus a little: a sparse level gives few samples)
    const close = wet ? kinds.every(k => Math.abs((seen[k] || 0) - (expected[k] || 0)) < 0.03 * count + 3 * Math.sqrt(expected[k] || 0))
      : kinds.every(k => {
        const share = want[k] / total;
        return Math.abs((seen[k] || 0) / count - share) < 0.03 + 3 * Math.sqrt(share * (1 - share) / Math.max(1, count));
      });
    const extra = Object.keys(seen).filter(k => !kinds.includes(k) && !(levels.LEVEL.trafficZones || []).some(z => k in z.traffic));
    check(kinds.length ? close && !extra.length : count === 0, kinds.length
      ? `${levels.levelName(levels.LEVEL)}: ${kinds.map(k => k + ' ' + ((seen[k] || 0) / count * 100).toFixed(0) + '%').join(', ')} (as listed${wet ? ', among the kinds that can be where each is: boats on the water only' : ''})`
      : `${levels.levelName(levels.LEVEL)}: an empty list, so no traffic`);
  }

  // one-way levels, and rows of cones / signs on the shoulders
  section('one-way levels and shoulder rows');
  for (let n = 0; n < levels.LEVELS.length; n++) {
    levels.selectLevel(n);
    const L = levels.LEVEL;
    if (!L.flow && !L.shoulderRows) continue;
    if (!Object.keys(L.traffic || {}).length) continue; // (no traffic at all: the construction site)
    const lanes = new Set();
    let live = 0, wrongWay = 0, oncomingSeen = 0;
    for (let r = 0; r < 10; r++) {
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) {
        if (!c.active) continue;
        live++;
        // ('mixed', the Battlefield: both ways, each tagged by the way it goes)
        // (a side road with oncoming traffic of its own, an exit's "oncoming", has that coming the other way: nowhere else)
        const sideOncoming = !track.Track.isMain(c.s) && c.dir < 0 && c.bound === 'south' && track.Track.sideOncoming(c.s);
        if (sideOncoming) { oncomingSeen++; continue; }
        if (L.flow === 'mixed' ? c.bound !== (c.dir > 0 ? 'north' : 'south') : c.bound !== L.flow || (c.dir > 0) !== (L.flow === 'north')) wrongWay++;
        if (track.Track.isMain(c.s)) lanes.add(c.lane);
      }
    }
    const T = track.Track;
    const inPlay = (L.trafficCount ?? CONFIG.trafficCount) + (L.oncomingCount ?? CONFIG.oncomingCount);
    if (L.flow) check(live > inPlay * 10 * 0.5 && wrongWay === 0 && lanes.size === T.laneCount && T.flow === L.flow,
      `${levels.levelName(L)}: every vehicle is ${L.flow === 'mixed' ? 'tagged by the way it goes, both ways in every lane' : L.flow + 'bound'} (${live} seen over 10 starts), and they use all ${T.laneCount} lanes` +
      (oncomingSeen ? ` (but for ${oncomingSeen} coming the other way along a side road that has oncoming traffic)` : ''));
    if (!L.shoulderRows) continue;
    // (a row's kind is on the level's theme: a cone is a cafe table on one, a crate a waste drum on another, so the rows are what
    // those kinds are here. A level's other obstacles of the same kind, roadworks cones say, are not rows and are not counted)
    const rowKinds = new Set(L.shoulderRows.map(r => themes.themedKind(L.theme, r.kind || 'cone')));
    // (and a level's own "obstacles" of the same kind, Hot Zone's drums in the road, are not rows: they are left out, the level built again
    // without them for the count, and with them again for what follows)
    const own = L.obstacles;
    L.obstacles = [];
    Game.load();
    const rows = Collision.obstacles.filter(o => !o.drift && rowKinds.has(o.kind));
    L.obstacles = own;
    Game.load();
    const kind = rows[0].kind, cost = CONFIG.obstacleKinds[kind];
    check(rows.length >= 5 && rows.every(o => T.onShoulder(o.lat, o.s)),
      `${levels.levelName(L)}: ${rows.length} ${kind}s, every one on a shoulder and none in an exit or merge lane`);
    for (const c of Traffic.cars) c.active = false;
    const mid = rows[Math.floor(rows.length / 2)];
    const o = Collision.obstacles.find(x => x.kind === mid.kind && x.s === mid.s && x.lat === mid.lat); // (the level built again: the same one in the new list)
    Player.s = o.s - 1; Player.lat = o.lat; Player.speed = 20; Player.launching = false; Player.shield = 0;
    Collision.check();
    FxQueue.length = 0;
    check(o.gone && Math.abs(Player.maxHealth - Player.health - cost.damage) < 1e-9 && (Player.stun > 0) === !cost.light,
      `driving into a ${kind}: it goes, costing ${cost.damage} health${cost.light ? ' and no loss of steering' : ''}`);
  }

  // (from here on the sections try cars one against another on whatever level they use: the Expressway, Canberra, a flooded road. With
  // the tiers on, a tier level starts only in a car of its tier, and a test that picks the Pick-Up and then the Lowrider would be
  // driving the same substitute twice. So the tiers are off for the rest, as `?tiers=0`: the garage's Blue Stars are then the old
  // rule's too. The tier rule has its own checks: scripts/.tiers-check.mjs, .earned-check.mjs, .save-check.mjs)
  CONFIG.progression.tiers = false;

  // lane assist: off-centre in a lane the car stays put; near a lane line it eases back, slowly
  section('steering');
  {
    const settle = (offset) => {
      Game.evil = false;
      Game.start();
      const centre = track.Track.laneOffset(2, 0);
      Player.lat = centre + offset;
      for (let i = 0; i < 120 * 4; i++) { // four seconds, hands off, on an empty road
        for (const c of Traffic.cars) c.active = false;
        for (const o of Collision.obstacles) o.gone = true;
        Game.update(1 / 120);
        FxQueue.length = 0;
      }
      return Player.lat - centre;
    };
    const kept = settle(0.8), eased = settle(1.6);
    check(Math.abs(kept - 0.8) < 0.01, `0.8 m off the centre of a lane, hands off for 4 s: still ${kept.toFixed(2)} m off`);
    check(eased < 1.6 && eased > 1.0, `1.6 m off (nearly on the line): eased back to ${eased.toFixed(2)} m in 4 s, no snap`);
  }

  // police contact: a bust, except when the police car runs into the back of the player
  section('police');
  {
    const meet = (label, place, want) => {
      levels.selectLevel(0); // (the Expressway, in the Commuter: whatever level the sections before left picked)
      cars.selectCar('commuter');
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      const cop = Traffic.cars[0], type = CONFIG.vehicles.police;
      Object.assign(cop, { active: true, kind: 'police', dir: 1, lane: 2, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health });
      Player.s = 200; Player.launching = false; Player.lat = track.Track.laneOffset(2, 200);
      place(cop);
      Collision.check();
      FxQueue.length = 0;
      check(Player.busted === want, `${label}: ${want ? 'busted' : 'not busted'}`);
    };
    meet('a police car runs into the back of the player', (cop) => { cop.s = 197; cop.lat = Player.lat; cop.vs = 30; Player.speed = 15; }, false);
    meet('the player runs into the back of a police car', (cop) => { cop.s = 203; cop.lat = Player.lat; cop.vs = 15; Player.speed = 30; }, true);
    meet('the player side-swipes a police car', (cop) => { cop.s = 200; cop.lat = Player.lat + 1.6; cop.vs = 30; Player.speed = 30; Player.latVel = 3; }, true);
    meet('a police car side-swipes the player', (cop) => { cop.s = 200; cop.lat = Player.lat + 1.6; cop.vs = 30; cop.latVel = -3; Player.speed = 30; }, false);
    meet('a police car just ahead turns into the player', (cop) => { cop.s = 203; cop.lat = Player.lat + 1.5; cop.vs = 30; cop.latVel = -3; Player.speed = 30; }, false);
    meet('the player and a police car steer into each other, the player faster', (cop) => {
      cop.s = 200; cop.lat = Player.lat + 1.6; cop.vs = 30; cop.latVel = -1; Player.speed = 30; Player.latVel = 3; }, true);
    meet('the player brakes while a police car behind is no faster', (cop) => { cop.s = 197; cop.lat = Player.lat; cop.vs = 15; Player.speed = 20; }, true);
  }

  // swapping cars takes effect at once, with no reload
  section('flyovers');
  {
    const n = levels.LEVELS.findIndex(l => (l.exits || []).length && !l.flow);
    levels.selectLevel(n);
    Game.start();
    const T = track.Track, x = T.exits[0], FLY = CONFIG.ramps.flyoverLength;
    Player.s = x.landingAt - 30; Player.lat = T.laneOffset(-1, Player.s); // the left shoulder
    Player.speed = 25; Player.launching = false; Player.shield = 0;
    const seen = new Set();
    for (let i = 0; i < 120 * 120 && !(T.isMain(Player.s) && Player.s > x.flyoverAt + 20); i++) {
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Player.danger = CONFIG.dangerTime; // (the shoulder timer isn't what is being tested)
      Game.update(1 / 120);
      FxQueue.length = 0;
      const s = Player.s;
      seen.add(T.isMain(s) ? 'main' : s >= x.flyA0 && s < x.flyA0 + FLY ? 'A' : s >= x.flyB0 && s < x.flyB0 + FLY ? 'B' : 'side');
    }
    const order = [...seen].join(' > ');
    check(order === 'main > A > side > B' && Player.active && T.isMain(Player.s) && Player.s > x.flyoverAt,
      `${levels.levelName(levels.LEVEL)}: the player drives up flyover A from the left shoulder, along the side road's oncoming lane, over flyover B and back (${order})`);
  }

  section('busted');
  levels.selectLevel(0);
  Game.start();
  Player.s = 200; Player.speed = 20; Player.launching = false; Player.shield = 0;
  const bustLat = Player.lat;
  Player.bust('shoulder');
  let bustTop = 0;
  for (let i = 0; i < 60; i++) { // half a second, steering hard right with the accelerator down
    Player.update(1 / 120, 1, 1, false);
    bustTop = Math.max(bustTop, Player.speed);
  }
  check(Math.abs(Player.lat - bustLat) < 1e-6 && bustTop <= 20 && Player.speed < 20,
    `busted: steering and the accelerator do nothing (moved ${(Player.lat - bustLat).toFixed(2)} m sideways, slowed to ${Player.speed.toFixed(1)} m/s)`);

  section('powerups');
  levels.selectLevel(0);
  Game.start();
  Player.collect('turbo');
  Player.collect('ghost');
  const afterGhost = { turbo: Player.turbo, ghost: Player.ghost };
  Player.collect('passenger');
  Player.update(0.3, 0, 0, false);
  Player.collect('wrench');
  check(afterGhost.turbo === 0 && afterGhost.ghost === CONFIG.ghostTime && Player.turbo === 0 && Player.ghost === 0 &&
    Math.abs(Player.passenger - (CONFIG.passengerTime - 0.3)) < 1e-9 && Player.powerLeft === Player.passenger,
    `one powerup at a time: a ghost replaces a turbo, a passenger the ghost, and a wrench leaves the passenger running (${Player.powerLeft.toFixed(1)} s left)`);

  // the top speed reached with a powerup picked up at the start, on an empty road, flat out for 8 s
  const topWith = (carId, type) => {
    cars.selectCar(carId);
    Game.evil = false;
    Game.start();
    if (type) Player.collect(type);
    let top = 0;
    for (let i = 0; i < 120 * 8; i++) {
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Game.update(1 / 120);
      FxQueue.length = 0;
      top = Math.max(top, Player.speed);
    }
    return top;
  };
  {
    const slow = cars.CARS.find(car => car.id === 'darkvan'), fast = cars.CARS.find(car => car.id === 'miata');
    const slowTop = topWith(slow.id, 'turbo'), fastTop = topWith(fast.id, 'turbo');
    check(Math.abs(slowTop - (slow.maxSpeed + CONFIG.turboBoost)) < 0.5 && Math.abs(fastTop - (fast.maxSpeed + CONFIG.turboBoost)) < 0.5 &&
      CONFIG.turboTime === 10 && CONFIG.ghostTime === 10,
      `a turbo adds a flat ${CONFIG.turboBoost} m/s for ${CONFIG.turboTime} s: ${slow.name} ${slow.maxSpeed} > ${slowTop.toFixed(1)}, ${fast.name} ${fast.maxSpeed} > ${fastTop.toFixed(1)} (a ghost lasts ${CONFIG.ghostTime} s)`);
    const hatch = cars.CARS.find(car => car.id === 'commuter');
    const gasTop = topWith('commuter', 'badGas'), heavyTop = topWith('commuter', 'heavyMass');
    check(Math.abs(gasTop - hatch.maxSpeed * CONFIG.badGas.topSpeed) < 0.5 && Math.abs(heavyTop - hatch.maxSpeed * CONFIG.heavyMass.topSpeed) < 0.5,
      `bad gas and the 1000 lb weight hold the ${hatch.name} (${hatch.maxSpeed} m/s) to ${gasTop.toFixed(1)} and ${heavyTop.toFixed(1)} m/s`);  }

  // bad gas and the weight are powerups like any other: one at a time
  levels.selectLevel(0);
  cars.selectCar('commuter');
  Game.start();
  Player.collect('turbo');
  Player.collect('badGas');
  const gasOverTurbo = Player.turbo === 0 && Player.badGas === CONFIG.badGas.time;
  Player.collect('wrench');
  const gasAfterWrench = Player.badGas === CONFIG.badGas.time;
  Player.collect('heavyMass');
  const heavyMass = Player.mass, heavyAgility = Player.agility;
  Player.collect('ghost');
  check(gasOverTurbo && gasAfterWrench && Player.badGas === 0 && heavyMass === CONFIG.heavyMass.mass &&
    heavyAgility < (cars.CAR.agility || 1) && Player.heavy === 0 && Player.mass === 1,
    `bad gas replaces a turbo and outlasts a wrench; the weight replaces it (mass ${heavyMass}, steering ${heavyAgility}) and a ghost the weight (mass ${Player.mass})`);

  // under the weight, the player wins a collision it would otherwise lose: running into the back of a slower car
  const rearEnd = (heavy) => {
    levels.selectLevel(0);
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    for (const o of Collision.obstacles) o.gone = true;
    const other = Traffic.cars.find(c => c.bound === 'north'), type = CONFIG.vehicles.darkvan;
    Object.assign(other, { active: true, kind: 'darkvan', lane: 2, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, fixed: false,
      hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health, sideTick: -999 });
    Player.s = 200; Player.launching = false; Player.lat = track.Track.laneOffset(2, 200); Player.shield = 0; Player.stun = 0; Player.sideTick = -999;
    if (heavy) Player.collect('heavyMass');
    Object.assign(other, { s: Player.s + Player.hl + other.hl - 0.2, lat: Player.lat, vs: 15 });
    Player.speed = 35;
    Collision.check();
    FxQueue.length = 0;
    return { speed: Player.speed, other: other.vs, taken: Player.maxHealth - Player.health, dealt: other.maxHealth - other.health, stun: Player.stun };
  };
  {
    const light = rearEnd(false), heavy = rearEnd(true);
    check(light.speed < 25 && heavy.speed > 30 && heavy.other > light.other && heavy.taken < light.taken / 2 &&
      heavy.dealt > light.dealt && heavy.stun < light.stun,
      `rear-ending a car at 35 vs 15: normally the player drops to ${light.speed.toFixed(1)} m/s, takes ${light.taken.toFixed(0)} and deals ${light.dealt.toFixed(0)}; ` +
      `under the weight ${heavy.speed.toFixed(1)} m/s, takes ${heavy.taken.toFixed(0)} and deals ${heavy.dealt.toFixed(0)}, stunned ${heavy.stun.toFixed(2)} s, not ${light.stun.toFixed(2)}`);
  }

  // the stopwatches move the clock at once, and leave the powerup running alone
  levels.selectLevel(0);
  Game.start();
  Player.collect('turbo');
  {
    const allowed0 = Game.allowed, turbo0 = Player.turbo;
    Player.collect('timePlus');
    const plus = Game.allowed - allowed0;
    Player.collect('timeMinus');
    Player.collect('timeMinus');
    const minus = Game.allowed - allowed0;
    check(plus === CONFIG.timePickup && minus === -CONFIG.timePickup && Player.turbo === turbo0 && Player.powerLeft === turbo0,
      `time plus puts ${plus} s on the clock, two time minuses take ${-minus + plus} s off, and the turbo runs on (${Player.turbo} s)`);
    // half way through the tip countdown: a time plus winds it back, and the tip with it
    Game.time = Game.allowed + CONFIG.tipCountdown / 2;
    const tipBefore = Game.tip;
    Player.collect('timePlus');
    check(Math.abs(Game.remaining - (CONFIG.timePickup - CONFIG.tipCountdown / 2)) < 1e-9 && Game.tip > tipBefore,
      `in the tip countdown, time plus winds the clock back to ${Game.remaining.toFixed(1)} s and the tip from $${tipBefore.toFixed(2)} to $${Game.tip.toFixed(2)}`);
  }

  section('messages');
  {
    const { Message } = await load('/src/delivery/messages.js');
    Message.clear();
    const first = Message.say('wrecks', 'byPlayer'), at0 = first.at, id0 = first.id;
    await new Promise(resolve => setTimeout(resolve, 20));
    const again = Message.say('wrecks', 'byPlayer');
    const shown = () => Message.lines.filter(line => line.text).length;
    check(again === first && again.id === id0 && again.at > at0 && shown() === 1,
      `the same message twice ("${first.text}") stays on one line, its time started again (${shown()} line in use)`);
    Message.say('powerups', 'turbo');
    check(shown() === 2, 'a different message still takes the other line');
    Message.clear();
  }

  section('levels list');
  {
    const main = levels.MAIN_LEVELS.length, labels = levels.LEVELS.map((l, i) => levels.levelLabel(i) + ' ' + levels.levelName(l));
    // (the first of them in the order they have always been in: saved progress counts unlocked levels by position)
    // (after the main levels: the special ones, then the real circuits. Each tab numbers its own: the deliveries
    // among them S1.., the races, the lapped levels, R1..)
    // (the amphibious levels follow the specials and have their own tab: A1..)
    const rest = levels.LEVELS.slice(main), special = rest.filter(l => !levels.isRace(l) && !levels.AMPHIBIOUS_LEVELS.includes(l)), races = rest.filter(levels.isRace);
    check(rest.map(l => l.id).join().startsWith('all-heck,ufo,marina-bay,oh-mine,montreal') && levels.levelLabel(main - 1) === String(main) &&
      rest.length === levels.SPECIAL_LEVELS.length + levels.AMPHIBIOUS_LEVELS.length + levels.CIRCUIT_LEVELS.length &&
      rest.every((l, k) => levels.levelLabel(main + k) === (levels.isRace(l) ? 'R' + (races.indexOf(l) + 1)
        : levels.AMPHIBIOUS_LEVELS.includes(l) ? 'A' + (levels.AMPHIBIOUS_LEVELS.indexOf(l) + 1) : 'S' + (special.indexOf(l) + 1))) &&
      levels.MAIN_LEVELS.every(l => levels.LEVELS.indexOf(l) < main && !levels.isRace(l)),
      `the special levels, the amphibious ones and the circuits come last, as S1 to S${special.length}, A1 to A${levels.AMPHIBIOUS_LEVELS.length} and R1 to R${races.length}: ${labels.slice(main - 1).join(', ')}`);
  }

  section('hesitation, signals and lights');
  {
    const H = CONFIG.hesitation;
    const pick = (id) => levels.selectLevel(levels.LEVELS.findIndex(l => l.id === id));
    const topOf = (kind) => (cars.CARS.find(car => car.id === kind) || {}).maxSpeed;
    // drives on for `seconds`, the player kept whole and the clock held, calling look() each step
    const drive = (seconds, look) => {
      for (let i = 0; i < 120 * seconds && Game.state === 'playing'; i++) {
        Player.health = Player.maxHealth;
        Game.busts = 0;
        Game.time = 0;
        Game.update(1 / 120);
        FxQueue.length = 0;
        look();
      }
    };

    // Suburbia's traffic is all garage cars, too fast to catch: the ones going the player's way hesitate
    // (without its ambulances: this test's player never gives way to one, and would be busted)
    levels.selectSpecial({ ...levels.LEVELS.find(l => l.id === 'suburbs'), emergencies: null });
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const going = Traffic.cars.filter(c => c.active && c.dir > 0), coming = Traffic.cars.filter(c => c.active && c.dir < 0);
    check(going.length > 0 && going.every(c => c.hesitant && c.baseSpeed >= H.pace.min && c.baseSpeed <= H.pace.max) &&
      coming.length > 0 && coming.every(c => !c.hesitant),
      `Suburbia: all ${going.length} cars going the player's way hesitate (${going.map(c => c.baseSpeed.toFixed(0)).join(', ')} m/s), none of the ${coming.length} oncoming`);
    let fromBehind = 0, slowBehind = 0, tapped = false, police = false;
    const seen = new Set();
    drive(120, () => {
      for (const c of Traffic.cars) {
        if (!c.active) continue;
        if (c.kind === 'police') police = true;
        if (c.hesitant && c.tap > 0 && c.braking) tapped = true;
        if (c.fromBehind && !seen.has(c)) {
          seen.add(c);
          fromBehind++;
          if (c.baseSpeed < H.behindPace.min * topOf(c.kind) - 1e-9) slowBehind++;
        } else if (!c.fromBehind) seen.delete(c);
      }
    });
    check(fromBehind > 0 && !slowBehind && tapped && !police,
      `Suburbia, 2 min: ${fromBehind} cars came up from behind at ${H.behindPace.min * 100}%+ of full speed, hesitant ones touched their brakes, and no police`);

    // the Expressway's traffic is never too fast for the player: nobody hesitates, nobody comes from behind
    pick('expressway');
    Game.start();
    let anyHesitant = false, anyBehind = false;
    drive(30, () => {
      for (const c of Traffic.cars) if (c.active) { anyHesitant ||= c.hesitant; anyBehind ||= c.fromBehind; }
    });
    check(!anyHesitant && !anyBehind, 'Expressway, 30 s: no hesitation, and no traffic from behind');

    // one car, staged ahead of the player in lane 2 of the Expressway (the player's other lane, 3, free)
    const stageOne = (props) => {
      pick('expressway');
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Player.s = 200; Player.lat = track.Track.laneOffset(2, 200); Player.speed = 15; Player.launching = false; Player.shield = 0;
      const car = Traffic.cars.find(c => c.dir > 0), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, viaSide: false, s: 230, lane: 2, lat: Player.lat, vs: 15, baseSpeed: 15,
        latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, rival: null, rivalTime: 0, honkWait: 0, throwTimer: 99, arrest: -1,
        pulledOver: false, toad: null, hesitant: false, tap: 0, wander: 0, think: 0, braking: false, signal: 0, hazards: false,
        pendingLane: null, signalTime: 0, hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health,
        maxHealth: type.health, evil: false, mood: 0.9, emotion: 'happy' }, props);
      return car;
    };
    const run = (car, seconds) => { for (let i = 0; i < Math.round(seconds * 120); i++) Traffic.update(1 / 120); };

    // a happy, good driver in the player's lane decides to move over, and signals for signalTime first
    let car = stageOne({});
    run(car, 1 / 120);
    car.think = 99; // (no second thoughts during the test)
    const signalled = car.signal === 1 && car.lane === 2;
    run(car, CONFIG.signalTime - 0.1);
    const stillWaiting = car.lane === 2 && car.signal === 1;
    run(car, 0.2);
    const moved = car.lane === 3;
    run(car, 3);
    check(signalled && stillWaiting && moved && car.signal === 0,
      `a happy good driver signals, waits ${CONFIG.signalTime} s, then moves over (and the indicator goes off once it is there)`);
    // ...an evil one just goes
    // (for an evil player: a happy evil driver is a wingman, and moves out of the way; for a good one, it gets in it)
    car = stageOne({ evil: true });
    Player.evil = true; // (after the staging: starting a run sets the player's side)
    run(car, 1 / 120);
    Player.evil = false;
    check(car.lane === 3 && car.signal === 0, 'an evil driver moves over at once, without signalling');

    // the siren: a car in the player's lane moves over signalling at once, evil or not...
    Player.siren = 0;
    car = stageOne({ evil: true, mood: 0 });
    Player.siren = 5;
    run(car, 1 / 120);
    check(car.lane === 3 && car.signal === 1, 'with a siren behind it, even an evil driver signals as it gets out of the way');
    // ...and one with nowhere to go but the shoulder puts its hazards on once it is there
    car = stageOne({ lane: 3 });
    Player.lat = car.lat = track.Track.laneOffset(3, 200);
    Player.siren = 5;
    run(car, 1 / 120);
    const signalling = car.pulledOver && car.signal === 1 && !car.hazards;
    run(car, 3);
    check(signalling && car.hazards && car.signal === 0 && track.Track.onShoulder(car.lat, car.s),
      'pulled over onto the shoulder for a siren: it signals on the way, then puts its hazards on');
    Player.siren = 0;

    // brake lights: the player's while braking, not while holding speed; a car's while it slows
    Player.speed = 20;
    Player.updateSpeed(1 / 120, -1, false);
    const braking = Player.brakeLight;
    Player.updateSpeed(1 / 120, 0, false);
    car = stageOne({ vs: 25, think: 99 });
    run(car, 1 / 120);
    const carBraking = car.braking;
    run(car, 8);
    check(braking && !Player.brakeLight && carBraking && !car.braking,
      'brake lights: the player\'s while braking (not holding speed), a car\'s while it slows to its pace (not once there)');
  }

  section('bullet train');
  {
    const { BulletTrain } = await load('/src/delivery/bullettrain.js');
    const { Message } = await load('/src/delivery/messages.js');
    const B = CONFIG.bulletTrain, L2 = (s) => track.Track.laneOffset(2, s), L3 = (s) => track.Track.laneOffset(3, s);
    // the Expressway, the player in lane 2 at 200 m doing 20, a car ahead in the same lane: a mystery that is the train
    const setOff = () => {
      levels.selectLevel(0);
      cars.selectCar('commuter');
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Player.s = 200; Player.lat = L2(200); Player.speed = 20; Player.launching = false; Player.shield = 0;
      const car = Traffic.cars.find(c => c.dir > 0), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, viaSide: false, s: 420, lane: 2, lat: L2(420), vs: 15, baseSpeed: 15,
        latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, rival: null, rivalTime: 0, honkWait: 0, throwTimer: 99, arrest: -1,
        pulledOver: false, toad: null, hesitant: false, tap: 0, think: 99, pendingLane: null, signal: 0, hazards: false, braking: false,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health, evil: false, mood: 0 });
      Player.nextMystery = 'bulletTrain';
      Player.collect('mystery');
      Player.nextMystery = '';
      return car;
    };
    const step = () => { Game.update(1 / 120); FxQueue.length = 0; };

    // it comes down the player's lane and wrecks the player about `warning` s later, and everything else in that lane on the way
    const car = setOff();
    const startGap = BulletTrain.s - Player.s;
    const said = Message.lines.some(line => line.text === 'BULLET TRAIN INCOMING!!!');
    let t = 0, carWrecked = false;
    // (watched as it goes: once wrecked, its slot in the pool may be dealt out again as a new car)
    while (Player.active && t < 8) { step(); t += 1 / 120; carWrecked ||= !car.active; }
    const inLane = Collision.obstacles.find(o => o.s === 300), otherLane = Collision.obstacles.find(o => o.s === 500);
    const fastest = Math.max(...cars.CARS.map(c => c.maxSpeed), ...Object.values(cars.LEVEL_CARS).map(c => c.maxSpeed), ...Object.values(cars.SECRET_CARS).map(c => c.maxSpeed), CONFIG.tankMaxSpeed) + CONFIG.turboBoost;
    check(said && BulletTrain.lane === 2 && !Player.active && Math.abs(t - B.warning) < 0.5 && carWrecked &&
      inLane.gone && !otherLane.gone && B.speed > fastest * 1.5,
      `the bullet train ("${Message.pick('powerups', 'mystery', 'bulletTrain')}") appears ${startGap.toFixed(0)} m up lane 2 at ${(B.speed * 3.6).toFixed(0)} km/h ` +
      `(anything else tops out at ${(fastest * 3.6).toFixed(0)}), wrecks the player ${t.toFixed(2)} s later, and the car and the barrier in its lane on the way, not the one beside it` +
      (said && carWrecked && inLane.gone && !otherLane.gone ? '' : ` [said ${said}, car wrecked ${carWrecked}, barrier ${inLane.gone}, one beside ${otherLane.gone}]`));

    // out of its lane in time, the player is safe, and it is gone once it is past
    setOff();
    Player.lat = L3(Player.s);
    let passedBy = false;
    for (let i = 0; i < 120 * 8 && BulletTrain.active; i++) { step(); passedBy ||= BulletTrain.passed; }
    check(Player.active && passedBy && !BulletTrain.active, 'a player who changes lane in time is passed by, unharmed, and the train is gone once it is by');

    // ...but steering into its side as it goes by is a wreck too
    setOff();
    Player.lat = L3(Player.s);
    for (let i = 0; i < 120 * 8 && BulletTrain.s > Player.s - 60; i++) step();
    const besideIt = Player.active && BulletTrain.active;
    Player.lat = L3(Player.s) - 1.5; // (most of the way back into its lane)
    step();
    check(besideIt && !Player.active, 'steering into the side of the train as it goes by wrecks the player');

    // a ghost (picked up after the mystery) passes straight through it
    setOff();
    Player.ghost = CONFIG.ghostTime;
    let through = false;
    for (let i = 0; i < 120 * 8 && BulletTrain.active; i++) { step(); through ||= BulletTrain.passed; }
    check(through && Player.active && Player.health > 0, "a ghost stays in the train's lane and comes out the other side");

    // mercy: while the train is about, the shoulder's danger meter runs down at half speed
    const drain = (train) => {
      setOff();
      if (!train) BulletTrain.reset();
      Player.lat = track.Track.shoulderOffset(1, Player.s);
      for (let i = 0; i < 120; i++) step(); // 1 s on the shoulder
      return CONFIG.dangerTime - Player.danger;
    };
    const withTrain = drain(true), without = drain(false);
    check(Math.abs(withTrain - CONFIG.bulletTrain.dangerMercy) < 0.02 && Math.abs(without - 1) < 0.02,
      `on the shoulder for 1 s: the danger meter loses ${withTrain.toFixed(2)} s with the train about, ${without.toFixed(2)} s without`);

    // ...and nobody is busted for being on the shoulder while it is about, nor for mercyAfter s after it has gone
    setOff();
    Player.lat = track.Track.shoulderOffset(1, Player.s);
    Player.danger = 0.1; // (the meter runs out almost at once)
    let gone = -1, bustedAt = -1;
    for (let i = 0; i < 120 * 12 && bustedAt < 0; i++) {
      step();
      if (gone < 0 && !BulletTrain.active) gone = i / 120;
      if (Player.busted) bustedAt = i / 120;
    }
    const wait = bustedAt - gone;
    check(gone > 0 && bustedAt > 0 && Math.abs(wait - CONFIG.bulletTrain.mercyAfter) < 0.05,
      `an empty danger meter on the shoulder: no bust while the train is about, nor until ${wait.toFixed(2)} s after it has gone`);
  }

  section('the unused mystery pool');
  {
    const { Message } = await load('/src/delivery/messages.js');
    const M = CONFIG.mystery;
    const fresh = () => { levels.selectLevel(0); cars.selectCar('commuter'); Game.evil = false; Game.start(); };
    const pick = (effect) => { Player.nextMystery = effect; Player.collect('mystery'); Player.nextMystery = ''; };
    const step = (n) => { for (let i = 0; i < n; i++) { Traffic.update(1 / 120); FxQueue.length = 0; } };
    const running = () => Traffic.cars.filter(c => c.active && !c.fixed && !c.emergency);
    check(M.extraEffects.every(e => !M.effects.includes(e) && Message.pick('powerups', 'mystery', e)),
      `${M.extraEffects.join(', ')}: never drawn by chance (not in the mystery's effects), each with its own message`);

    // Sunday Drivers: everyone slows to sundayPace of their speed, and picks up again after
    fresh();
    step(240);
    const pace = (list) => list.filter(c => c.active).reduce((a, c) => a + Math.abs(c.vs) / c.baseSpeed, 0) / Math.max(1, list.filter(c => c.active).length);
    const watched = running(), before = pace(watched);
    pick('sundayDrivers');
    step(360);
    const during = pace(watched);
    Player.endMystery();
    step(480);
    const after = pace(watched);
    check(Player.mystery === '' && before > 0.85 && Math.abs(during - M.sundayPace) < 0.12 && after > 0.85,
      `Sunday Drivers: traffic at ${(before * 100).toFixed(0)}% of its speed slows to ${(during * 100).toFixed(0)}% in 3 s, back to ${(after * 100).toFixed(0)}% 4 s after`);

    // Rush Hour: the traffic each way doubles at once; after, the extra cars aren't replaced
    fresh();
    step(120);
    const used = Traffic.cars.filter(c => !c.unused).length, ways = (dir) => running().filter(c => c.dir === dir).length;
    const north = ways(1), south = ways(-1);
    pick('rushHour');
    step(60); // (half a second: one with no room to turn up just then is in play, and turns up the moment there is)
    const rushNorth = ways(1), rushSouth = ways(-1), spare = Traffic.cars.filter(c => !c.active && c.unused).length;
    Player.endMystery();
    const usedAfter = Traffic.cars.filter(c => !c.unused).length;
    step(120 * 90);
    const settled = running().length;
    check(rushNorth >= north * 1.8 && rushSouth >= south * 1.8 && spare >= 2 && usedAfter === used && settled <= used,
      `Rush Hour: ${north} cars going your way and ${south} oncoming become ${rushNorth} and ${rushSouth} at once (${spare} left spare); ` +
      `after it, ${settled} about once the extra ones have gone (the level's ${used})`);

    // Mood Swing: every driver that can be evil swaps sides, new ones too; specials never; and back after
    fresh();
    step(60);
    const newcomer = Traffic.cars.find(c => !c.active && !c.unused) || running()[0]; // (one that will turn up during it)
    newcomer.active = false;
    const sides = new Map(running().map(c => [c, c.evil]));
    const special = (c) => CONFIG.vehicles[c.kind].special || CONFIG.vehicles[c.kind].evilOnly;
    pick('moodSwing');
    const swapped = [...sides].every(([c, evil]) => special(c) ? c.evil === evil : c.evil === !evil);
    let fresh1 = false;
    for (let k = 0; k < 50 && !fresh1; k++) { step(1); fresh1 = newcomer.active && (special(newcomer) || newcomer.swung); }
    Player.endMystery();
    const back = [...sides].every(([c, evil]) => c.evil === evil) && !Traffic.cars.some(c => c.swung);
    check(swapped && fresh1 && back, `Mood Swing: all ${sides.size} drivers about swap sides (special vehicles excepted), a new one turns up swapped too, and all swap back after`);

    // Car Swap: lent another of the garage's cars, keeping its share of health, and given its own back
    // after, on leaving the run, and never the Tank
    fresh();
    const own = cars.CAR;
    Player.health = Player.maxHealth / 2;
    const lentOut = new Set();
    let fits = true;
    for (let k = 0; k < 40; k++) {
      pick('carSwap');
      const lent = cars.CAR;
      lentOut.add(lent.id);
      fits &&= lent !== own && cars.CARS.includes(lent) && !lent.tank && Player.hw === lent.hw && Player.maxHealth === lent.health && Math.abs(Player.health / Player.maxHealth - 0.5) < 1e-9;
      Player.endMystery();
      fits &&= cars.CAR === own && Player.hw === own.hw && Math.abs(Player.health / Player.maxHealth - 0.5) < 1e-9;
    }
    pick('carSwap');
    const lentNow = cars.CAR;
    Game.exit();
    check(fits && lentOut.size > 3 && lentNow !== own && cars.CAR === own,
      `Car Swap: the Commuter is lent ${lentOut.size} different cars over 40 swaps (never itself or the Tank), each with the same share of health, and given back after, and on leaving the run`);
  }

  section('Gimmick Road: cameras, crossings, stop / go, fog, potholes, rockfall, pelotons, processions');
  {
    const { SpeedCameras } = await load('/src/delivery/cameras.js');
    const { Crossings } = await load('/src/delivery/crossing.js');
    const { StopGo } = await load('/src/delivery/stopgo.js');
    const { Site } = await load('/src/delivery/site.js');
    const T = () => track.Track;
    const fresh = () => {
      levels.selectSpecial(levels.HIDDEN_LEVELS['gimmick-road']);
      cars.selectCar('commuter');
      Game.evil = false;
      Game.start();
    };
    // the player at s in its lane doing speed, nothing else about
    const setPlayer = (s, speed, extra = {}) => Object.assign(Player, { s, lat: T().laneOffset(1, s), speed, launching: false, shield: 0, ghost: 0, latVel: 0, ...extra });
    const step = (n = 1) => { for (let i = 0; i < n; i++) { Game.update(1 / 120); FxQueue.length = 0; } };
    const clearRoad = () => { for (const c of Traffic.cars) c.active = false; };
    // one traffic car, kind, going dir in lane at s doing speed (taken from the pool)
    const placeCar = (dir, lane, s, speed, extra = {}) => {
      const car = Traffic.cars.find(c => !c.active && !c.unused && c.dir === dir) || Traffic.cars.find(c => !c.unused && !c.fixed && c.dir === dir), type = CONFIG.vehicles.commuter;
      Object.assign(car, { active: true, kind: 'commuter', fixed: false, parked: false, emergency: false, racer: false, procession: 0, junction: null,
        s, lane, lat: T().laneOffset(lane, s), vs: dir * speed, baseSpeed: speed, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0,
        toad: null, arrest: -1, think: 99, rival: null, pendingLane: null, evil: false, mood: 0, emotion: 'neutral', hesitant: false, tap: 0,
        hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health, stopGoFor: null, pulledOver: false, ...extra });
      return car;
    };
    fresh();
    check(T().problems.length === 0 && T().length === 5000, 'Gimmick Road loads with no problems' + (T().problems.length ? ': ' + T().problems.join('; ') : ''));

    // speed cameras: over the limit, the first a fine and the next a bust; under it, run over, or with a radar detector, nothing
    const C = CONFIG.speedCamera, cams = SpeedCameras.list;
    const pass = (cam, speed, extra) => { setPlayer(cam.s - 3, speed, extra); SpeedCameras.lastS = Player.s; step(30); };
    fresh(); clearRoad();
    pass(cams[0], cams[0].limit * 0.85);
    const slow = SpeedCameras.caught;
    fresh(); clearRoad();
    pass(cams[0], cams[0].limit * 1.3);
    const fined = Game.fines, busted1 = Player.busted;
    pass(cams[1], cams[1].limit * 1.3);
    const busted2 = Player.busted;
    fresh(); clearRoad();
    pass(cams[0], cams[0].limit * 1.3, { radar: 5 });
    const radar = SpeedCameras.caught;
    fresh(); clearRoad();
    cams[0].obstacle.gone = true;
    pass(cams[0], cams[0].limit * 1.3);
    const owed = SpeedCameras.fineFor(cams[0].limit * 0.3 * 3.6); // (30% over its limit)
    check(slow === 0 && fined === owed && !busted1 && busted2 && radar === 0 && SpeedCameras.caught === 0,
      `speed cameras: under the limit, nothing; over it, a $${fined} fine, then a bust at the next; with a radar detector, or the camera run over, nothing`);
    // the fine goes by how far over the limit: stepped (CONFIG.speedCamera.fines)
    const steps = [5, 15, 25, 45].map(over => SpeedCameras.fineFor(over));
    check(steps.join() === '20,50,80,120', `speed camera fines by how far over: 5 km/h $${steps[0]}, 15 $${steps[1]}, 25 $${steps[2]}, 45 $${steps[3]}`);
    // a warning of each camera coming up, radar detector or not, once; and a speed limit sign on the shoulder on its
    // side before it (on the right for one on the centre line), showing its limit
    {
      const { Message } = await load('/src/delivery/messages.js');
      fresh(); clearRoad();
      const cam = cams[0], warned = [];
      setPlayer(cam.s - C.warn - 20, 20, { radar: 30 });
      SpeedCameras.lastS = Player.s;
      for (let i = 0; i < 120 * 4; i++) {
        Player.speed = 20; Player.radar = 30;
        step();
        for (const line of Message.lines) if (/speed camera ahead/i.test(line.text || '') && !warned.includes(line.text)) warned.push(line.text);
      }
      const signs = Collision.obstacles.filter(o => o.kind === 'limitSign');
      const placed = levels.LEVEL.cameras.every((c, i) => {
        const sign = signs.find(o => Math.abs(o.s - (cams[i].s - C.signAhead)) < 0.5);
        return sign && sign.limit === (c.limit ?? C.limit) && Math.sign(sign.lat) === (c.side === 'left' ? -1 : 1);
      });
      check(C.limit === 100 && warned.length === 1 && warned[0].includes(String(Math.round(cam.limit * 3.6))) && signs.length === cams.length && placed,
        `speed cameras: limit ${C.limit} km/h unless set; "${warned[0]}" ${C.warn} m out, radar detector or not; a limit sign ${C.signAhead} m before each, on its side`);
    }
    // the fine comes off what the run banks
    fresh(); clearRoad();
    pass(cams[0], cams[0].limit * 1.3);
    check(Game.fines === SpeedCameras.fineFor(cams[0].limit * 0.3 * 3.6), `a fine of $${Game.fines} is taken off the tip and cash banked on delivery`);

    // a level crossing: set off as the player comes near; traffic waits at the booms; the train wrecks what is on the line
    fresh(); clearRoad();
    const X = CONFIG.crossing;
    let cross = Crossings.list[0]; // (made afresh as each run starts)
    // (timed to the player: at 25 m/s, quiet while it is further off than the train takes, set off once it is nearer)
    const early = 25 * (Crossings.lead - X.timing.min) + 20, late = 25 * (Crossings.lead - X.timing.max) - 5;
    for (let i = 0; i < 5; i++) { setPlayer(cross.s - early, 25); step(); }
    const quiet = cross.state;
    for (let i = 0; i < 2; i++) { setPlayer(cross.s - late, 25); step(); }
    const set = cross.state;
    const waiting = placeCar(1, 1, cross.s - 60, 12);
    const onLine = placeCar(-1, 0, cross.s, 0.01, { baseSpeed: 0.01 });
    let maxLowered = 0, sawTrain = false, front = -Infinity, lineWrecked = false;
    for (let i = 0; i < 120 * 8 && !(sawTrain && cross.state === 'idle'); i++) {
      Player.s = cross.s - late; Player.speed = 0.1;
      if (onLine.health > 0 && !lineWrecked) { onLine.s = cross.s; onLine.vs = -0.01; }
      step();
      lineWrecked ||= onLine.health <= 0;
      maxLowered = Math.max(maxLowered, Crossings.lowered(cross));
      if (cross.state === 'train') sawTrain = true;
      if (Crossings.flashing(cross)) front = Math.max(front, waiting.s + waiting.hl); // (the furthest its nose gets while the lights flash)
    }
    const stopLine = cross.s - X.stopLine;
    check(quiet === 'idle' && set === 'warn' && sawTrain && maxLowered === 1 && front < stopLine && front > cross.s - 60 && lineWrecked,
      `level crossing: at 90 km/h, quiet ${early.toFixed(0)} m off, set off by ${late.toFixed(0)} m (its train timed to reach the road as the player would), then lights, booms down and a train; a car waits ${(stopLine - front).toFixed(1)} m short of the boom, and one left on the line is wrecked`);
    // the player on the line as the train goes by is wrecked; a ghost isn't; driving through a lowered boom breaks it
    fresh(); clearRoad();
    cross = Crossings.list[0];
    Crossings.start(cross);
    cross.t = X.warn; // (the train comes now)
    let wrecked = false;
    for (let i = 0; i < 120 * 6 && !wrecked; i++) { setPlayer(cross.s, 0.1); step(); wrecked = Player.health <= 0 || !Player.active; } // (the train in from the end of the line)
    fresh(); clearRoad();
    cross = Crossings.list[0];
    Crossings.start(cross);
    cross.t = X.warn;
    let ghosted = true;
    for (let i = 0; i < 120 * 6; i++) { setPlayer(cross.s, 0.1, { ghost: 5 }); step(); ghosted &&= Player.active && Player.health > 0; }
    fresh(); clearRoad();
    cross = Crossings.list[0];
    Crossings.start(cross);
    cross.t = X.lower;
    setPlayer(stopLine - 6, 15);
    const health0 = Player.health;
    step(60);
    check(wrecked && ghosted && cross.broken[0] && Player.health < health0,
      'level crossing: the player\'s car on the line as the train goes by is wrecked (a ghost passes through), and driving through a lowered boom breaks it, with a knock' +
      (wrecked && ghosted && cross.broken[0] ? '' : ` [wrecked ${wrecked}, ghost ok ${ghosted}, boom broken ${cross.broken[0]}]`));

    // stop / go: the sign goes round; traffic waits at its STOP; coming the other way, it goes through in the player's lane
    fresh(); clearRoad();
    const G = CONFIG.stopGo, works = StopGo.list[0];
    const seen = new Set();
    for (let i = 0; i < 120 * (2 * G.go + 2 * G.clear + 1); i++) { StopGo.update(1 / 120); seen.add(works.phase); }
    works.phase = 2; works.t = 0; // (GO the other way: STOP for the player's way)
    setPlayer(works.from - 400, 0.1);
    const queued = placeCar(1, 1, works.from - 70, 12);
    const through = placeCar(-1, 0, works.to + 30, 10);
    let detourLat = -Infinity;
    for (const c of Traffic.cars) if (c !== queued && c !== through) Object.assign(c, { active: false, unused: true }); // (just the two of them)
    for (let i = 0; i < 120 * 6; i++) {
      Player.s = works.from - 400; Player.speed = 0.1;
      step();
      if (through.s < works.to - 10 && through.s > works.from) detourLat = Math.max(detourLat, through.lat);
    }
    check(seen.size === 4 && queued.active && queued.s + queued.hl < works.from - StopGo.taper && queued.s > works.from - 70 && Math.abs(queued.vs) < 0.5 &&
      Math.abs(detourLat - StopGo.openLat(works.from)) < 0.4,
      `stop / go: GO, clear, GO the other way, clear; a car waits at its STOP ${(works.from - queued.s - queued.hl).toFixed(1)} m short of the works (clear of the traffic coming out of it), and one coming the other way goes through in the player's lane`);

    // fog: thickest in the bank, easing in over its edges; the police see less in it
    fresh(); clearRoad();
    const fog = levels.HIDDEN_LEVELS['gimmick-road'].fog[0], E = CONFIG.fog.edge;
    const foggy = [fog.from - E - 5, fog.from - E / 2, fog.from + 10, (fog.from + fog.to) / 2, fog.to + E + 5].map(s => T().foggy(s));
    const cop = placeCar(1, 1, 0, 1, { kind: 'police' });
    const sees = (s, ahead) => { setPlayer(s, 0.1); cop.s = s + ahead; cop.lat = Player.lat; return Traffic.policeNear(); };
    const sight = CONFIG.policeSightRange;
    check(foggy[0] === 0 && foggy[1] > 0.4 && foggy[1] < 0.6 && foggy[2] === 1 && foggy[3] === 1 && foggy[4] === 0 &&
      sees(500, sight * 0.8) && !sees((fog.from + fog.to) / 2, sight * 0.8) && sees((fog.from + fog.to) / 2, sight * CONFIG.fog.policeSight * 0.8),
      `fog: none, half, thick, thick, none along the bank; a police car ${(sight * 0.8).toFixed(0)} m off sees the player out of it, not in it (in it, only within ${(sight * CONFIG.fog.policeSight).toFixed(0)} m)`);

    // potholes and trenches: a jolt each, and sometimes a flat tyre (on the side that hit)
    const W = CONFIG.site;
    let holes = 0, holeFlats = 0, gaps = 0, gapFlats = 0, sideOk = true;
    for (let k = 0; k < 200; k++) {
      fresh(); clearRoad();
      const hole = Site.holes[0];
      setPlayer(hole.s - 6, 20, { health: Player.maxHealth, lat: hole.lat + 0.3 });
      for (let i = 0; i < 40; i++) step();
      if (Player.health < Player.maxHealth) holes++;
      if (Player.puncture) { holeFlats++; sideOk &&= Player.puncture === -1; }
      fresh(); clearRoad();
      const trench = levels.HIDDEN_LEVELS['gimmick-road'].siteWorks[0];
      Object.assign(Player, { s: trench.from + W.plateLength + 1, lat: T().hi(trench.from + 10) - 1.2, speed: 4, launching: false, shield: 0, latVel: 0, health: Player.maxHealth });
      Site.lastGap = null;
      step(2);
      if (Player.health < Player.maxHealth) gaps++;
      if (Player.puncture) { gapFlats++; sideOk &&= Player.puncture === 1; }
    }
    check(holes === 200 && gaps === 200 && sideOk && Math.abs(holeFlats / 200 - W.potholePuncture) < 0.1 && Math.abs(gapFlats / 200 - W.trenchPuncture) < 0.09,
      `potholes and trenches: a jolt every time; a flat tyre on the side that hit in ${holeFlats} of 200 potholes (about ${W.potholePuncture * 200}) and ${gapFlats} of 200 trench gaps (about ${W.trenchPuncture * 200})` +
      (holes === 200 && gaps === 200 && sideOk ? '' : ` [jolts ${holes} / ${gaps}, sides right ${sideOk}]`));

    // rockfall: up the hillside until the player is near, then down onto the road; only the player hits one
    fresh(); clearRoad();
    const rocks = Collision.obstacles.filter(o => o.kind === 'rock');
    const up = rocks.every(r => r.h === CONFIG.rockfall.height);
    const fall = levels.HIDDEN_LEVELS['gimmick-road'].rockfall[0];
    for (let s = fall.from - 200; s < fall.to + 10; s += 2) { setPlayer(s, 0.1, { ghost: 9 }); step(6); }
    step(120 * 3);
    const down = rocks.every(r => r.h === 0 && r.lat > T().lo(r.s) && r.lat < T().hi(r.s));
    const rock = rocks[0], passer = placeCar(1, 1, rock.s - 4, 10, { lat: rock.lat, lane: T().nearestLane(rock.lat, rock.s) });
    const passerHealth = passer.health;
    let passed = false;
    for (let i = 0; i < 120; i++) { passer.lat = rock.lat; setPlayer(rock.s - 40, 0.1, { ghost: 9 }); step(); passed ||= passer.s > rock.s + rock.hl + passer.hl; }
    check(up && down && !rock.gone && passed && passer.active && passer.health === passerHealth,
      `rockfall: all ${rocks.length} rocks up the hillside to start with, all down on the road once the player has come by, and traffic drives through them untouched`);

    // a peloton: waiting until the player is near, then riding along by the kerb; only the player hits a cyclist
    fresh(); clearRoad();
    const riders = Collision.obstacles.filter(o => o.ride), ride0 = riders[0], P = CONFIG.peloton;
    setPlayer(ride0.ride.s0 - P.trigger - 50, 0.1);
    step(120);
    const waited = riders.every(r => !r.ride.on && Math.abs(r.s - r.ride.s0) < 1e-6);
    setPlayer(ride0.ride.s0 - P.trigger + 20, 0.1);
    step(1);
    const s1 = ride0.s;
    step(120);
    const rode = ride0.s - s1;
    const byKerb = riders.every(r => r.lat > T().laneOffset(1, r.s) && r.lat < T().laneHi(r.s));
    const through2 = placeCar(1, 1, ride0.s - 6, 20, { lat: ride0.lat });
    const health2 = through2.health;
    for (let i = 0; i < 60; i++) { through2.lat = ride0.lat; Player.s = ride0.ride.s0 - P.trigger + 20; Player.speed = 0.1; step(); }
    setPlayer(ride0.s - 3, 15, { lat: ride0.lat, health: Player.maxHealth });
    step(20);
    check(waited && Math.abs(rode - P.speed) < 0.2 && byKerb && through2.health === health2 && riders.some(r => r.gone) && Player.health < Player.maxHealth,
      `peloton: ${riders.length} cyclists wait until the player is within ${P.trigger} m, then ride at ${rode.toFixed(1)} m/s by the kerb; traffic passes through them, the player knocks one flying`);
    // a good driver coming up behind the peloton on this one-lane-each-way road eases out past it,
    // touching none of them, waiting behind them while something is coming the other way, so never
    // meeting it head-on; an evil one ploughs straight through. (Just the cars in question, on their own)
    const overtake = (evil, oncomingAt, behind = 60) => {
      fresh();
      const pack = Collision.obstacles.filter(o => o.ride);
      setPlayer(pack[0].ride.s0 - 250, 0.1, { ghost: 9 });
      step(2); // (it sets off)
      const back0 = Math.min(...pack.map(o => o.s));
      const follower = placeCar(1, 1, back0 - behind, 18, { evil }), oncoming = oncomingAt ? placeCar(-1, 0, back0 + oncomingAt, 15) : null;
      for (const c of Traffic.cars) if (c !== follower && c !== oncoming) Object.assign(c, { active: false, unused: true });
      let touched = 0, wrecks = 0, waited = false, passedPack = false, slowest = Infinity, widest = Infinity;
      for (let i = 0; i < 120 * 30 && !passedPack; i++) {
        setPlayer(Math.min(...pack.map(o => o.s)) - 250, 0.1, { ghost: 9 });
        step();
        const back = Math.min(...pack.map(o => o.s)), front = Math.max(...pack.map(o => o.s));
        if (pack.some(o => Collision.overlap(follower, o))) touched++;
        if (follower.health <= 0 || !follower.active || (oncoming && (oncoming.health <= 0 || !oncoming.active))) wrecks++;
        if (follower.s > back - 30 && follower.s < front) slowest = Math.min(slowest, Math.abs(follower.vs) / follower.baseSpeed);
        if (follower.s > back - 30 && follower.s < back && Math.abs(follower.vs) < pack[0].ride.speed + 1) waited = true;
        if (follower.s > back - 2 && follower.s < front) widest = Math.min(widest, follower.lat);
        passedPack = follower.s > front + 5;
      }
      return { touched, wrecks, waited, passedPack, slowest, widest };
    };
    const clearRoadPass = overtake(false, 0), meet = overtake(false, 90, 15), plough = overtake(true, 0); // (meet: the two of them would meet by the bunch)
    check(clearRoadPass.passedPack && clearRoadPass.touched === 0 && clearRoadPass.wrecks === 0 && clearRoadPass.widest < T().laneOffset(1, 0) - 0.5 &&
      meet.passedPack && meet.touched === 0 && meet.wrecks === 0 && meet.waited &&
      plough.passedPack && plough.slowest > 0.95,
      `a peloton on a one-lane road: a good driver eases out past it (to ${clearRoadPass.widest.toFixed(2)} m), touching none; with a car coming the other way it waits behind the bunch first, and no head-on; an evil one ploughs through at ${Math.round(plough.slowest * 100)}% of its speed`);

    // a peloton coming the other way (dir -1): waiting on the far side until the player is near, then riding
    // towards it by the far kerb, facing its way; and a good driver coming up behind it the other way eases
    // out past it just the same (an evil one ploughs through)
    {
      const road = levels.HIDDEN_LEVELS['gimmick-road'], at = 2600;
      const freshOncoming = () => {
        levels.selectSpecial({ ...road, pelotons: [{ s: at, count: 6, dir: -1 }] });
        cars.selectCar('commuter');
        Game.evil = false;
        Game.start();
      };
      freshOncoming(); clearRoad();
      const pack = Collision.obstacles.filter(o => o.ride), lead = pack[0];
      setPlayer(at - P.trigger - 50, 0.1);
      step(120);
      const waitedFar = pack.every(r => !r.ride.on && Math.abs(r.s - r.ride.s0) < 1e-6) && pack.every(r => r.s >= at - 1e-6);
      setPlayer(at - P.trigger + 20, 0.1);
      step(1);
      const s0 = lead.s;
      step(120);
      const towards = s0 - lead.s;
      const farKerb = pack.every(r => r.lat < T().laneOffset(0, r.s) && r.lat > T().laneLo(r.s)) && pack.every(r => Math.abs(Math.abs(r.face) - Math.PI) < 0.1);
      const passBy = (evil) => {
        freshOncoming();
        const riders = Collision.obstacles.filter(o => o.ride);
        setPlayer(at - 250, 0.1, { ghost: 9 });
        step(2); // (they set off)
        const back0 = Math.max(...riders.map(o => o.s)); // (the back of the bunch, riding towards lower s)
        const follower = placeCar(-1, 0, back0 + 60, 18, { evil });
        for (const c of Traffic.cars) if (c !== follower) Object.assign(c, { active: false, unused: true });
        let touched = 0, passed = false, slowest = Infinity, widest = -Infinity;
        for (let i = 0; i < 120 * 30 && !passed; i++) {
          setPlayer(Math.min(...riders.map(o => o.s)) - 250, 0.1, { ghost: 9 });
          step();
          const back = Math.max(...riders.map(o => o.s)), front = Math.min(...riders.map(o => o.s));
          if (riders.some(o => Collision.overlap(follower, o))) touched++;
          if (follower.s < back + 30 && follower.s > front) slowest = Math.min(slowest, Math.abs(follower.vs) / follower.baseSpeed);
          if (follower.s < back + 2 && follower.s > front) widest = Math.max(widest, follower.lat);
          passed = follower.s < front - 5;
        }
        return { touched, passed, slowest, widest, wrecked: follower.health <= 0 || !follower.active };
      };
      const good = passBy(false), bad = passBy(true);
      check(waitedFar && Math.abs(towards - P.speed) < 0.2 && farKerb && good.passed && good.touched === 0 && !good.wrecked &&
        good.widest > T().laneOffset(0, 0) + 0.5 && bad.passed && bad.slowest > 0.95,
        `a peloton coming the other way: waits on the far side, then rides towards the player at ${towards.toFixed(1)} m/s by the far kerb; a good driver behind it eases out past it (to ${good.widest.toFixed(2)} m), touching none; an evil one ploughs through at ${Math.round(bad.slowest * 100)}% of its speed`);
    }

    // ...which is a bust with a police car watching, and no offence without one
    const knock = (police) => {
      fresh(); clearRoad();
      const rider = Collision.obstacles.find(o => o.ride);
      const cop = police ? placeCar(1, 0, rider.s + 20, 0.1, { kind: 'police', lane: 0 }) : null;
      for (const c of Traffic.cars) if (c !== cop) Object.assign(c, { active: false, unused: true }); // (no other police about)
      setPlayer(rider.s - 3, 15, { lat: rider.lat });
      step(20);
      return { hit: Collision.obstacles.some(o => o.ride && o.gone), busted: Player.busted };
    };
    const seen2 = knock(true), unseen = knock(false);
    check(seen2.hit && seen2.busted && unseen.hit && !unseen.busted,
      'knocking a cyclist off with a police car watching is a bust; with none about, it is not');

    // a funeral procession: a hearse and its cars in black, nose to tail; crash into one and all of them are furious
    fresh(); clearRoad();
    let started = false;
    for (let k = 0; k < 10 && !started; k++) started = Traffic.startProcession(1);
    const train = Traffic.cars.filter(c => c.active && c.procession).sort((a, b) => b.s - a.s);
    const rightCars = train.length === CONFIG.procession.cars + 1 && train[0].kind === 'hearse' && train.slice(1).every(c => c.colors?.[0] === CONFIG.procession.paint);
    for (const c of Traffic.cars) if (!c.procession) Object.assign(c, { active: false, unused: true });
    for (let i = 0; i < 120 * 8; i++) { setPlayer(train[0].s - 300, 0.1, { ghost: 9, health: Player.maxHealth }); step(); } // (out of everyone's way)
    const lane = train.every(c => c.lane === train[0].lane) && train.every(c => Math.abs(Math.abs(c.vs) - CONFIG.procession.speed) < 0.3);
    const gapsOk = train.slice(1).every((c, i) => { const g = train[i].s - c.s - train[i].hl - c.hl; return g > 1 && g < 15; });
    const calm = train.every(c => c.emotion !== 'angry');
    const last = train[train.length - 1];
    setPlayer(last.s - last.hl - Player.hl - 0.5, 20, { lat: last.lat });
    step(30);
    check(started && rightCars && lane && gapsOk && calm && train.every(c => c.emotion === 'angry'),
      `funeral procession: a hearse and ${CONFIG.procession.cars} cars in black, keeping their lane at ${CONFIG.procession.speed} m/s nose to tail, calm until the player runs into the back of it, then all of them furious`);
  }

  section('the Battlefield: armies, head-ons, guns, pillboxes');
  {
    const { Packages } = await load('/src/delivery/packages.js');
    const { Gunfire } = await load('/src/delivery/gunfire.js');
    const { Collision } = await load('/src/delivery/collision.js');
    const B = CONFIG.battle;
    const T = () => track.Track;
    const fresh = (evil = false) => {
      levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'battlefield'));
      Game.evil = evil;
      Game.start();
    };
    const step = (n = 1) => { for (let i = 0; i < n; i++) { Game.update(1 / 120); FxQueue.length = 0; } };
    // (and no landmines, but in the tests of them: a test's vehicles would run onto them)
    const alone = (mines = false) => {
      for (const c of Traffic.cars) Object.assign(c, { active: false, unused: true });
      if (!mines) for (const o of Collision.obstacles) if (o.kind === 'landmine') o.gone = true;
    };
    // one army vehicle of that kind, going dir in lane at s doing speed
    const army = (kind, dir, lane, s, speed = 10, extra = {}) => {
      const car = Traffic.cars.find(c => !c.active && c.unused && !c.taken);
      const type = CONFIG.vehicles[kind];
      Object.assign(car, { active: true, unused: false, taken: true, kind, dir, bound: dir > 0 ? 'north' : 'south', fixed: false, junction: null, racer: false,
        procession: 0, emergency: false, parked: false, s, lane, lat: T().laneOffset(lane, s), vs: dir * speed, baseSpeed: speed, latVel: 0, yaw: 0, yawVel: 0,
        stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, think: 99, rival: null, pendingLane: null, evil: dir < 0, mood: 0, emotion: 'neutral',
        hesitant: false, tap: 0, hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health,
        turret: 0, gunWait: 99, foe: null, dodging: null, dodges: false, pulledOver: false, shield: 0, laneWait: 0, tracksBroken: false, punctured: false, ...extra });
      return car;
    };
    const untake = () => { for (const c of Traffic.cars) c.taken = false; };
    // the player held out of it all, a ghost, at s (near enough that nothing it watches is gone for being too far off)
    const hold = (s) => Object.assign(Player, { s, lat: T().laneOffset(2, s), speed: 0.1, ghost: 9, launching: false });
    // how a vehicle comes out of it: its lowest health while the steps run ('wrecked' at 0)
    const watch = (list, n, each) => {
      const low = new Map(list.map(c => [c, c.health]));
      for (let i = 0; i < n; i++) {
        each?.();
        step();
        for (const c of list) low.set(c, Math.min(low.get(c), c.active ? c.health : 0));
      }
      return list.map(c => low.get(c) <= 0 ? 'wrecked' : Math.round(low.get(c) / c.maxHealth * 100) + '%');
    };

    fresh(true);
    const active = Traffic.cars.filter(c => c.active);
    const { clockFor } = await load('/src/delivery/game.js');
    check(T().problems.length === 0 && T().flow === 'mixed' && T().laneRange(1, 100).join() === '0,5' && T().laneRange(-1, 100).join() === '0,5' &&
      cars.CAR.id === 'apc' && !Player.evil && Game.allowed === clockFor(levels.LEVEL, false) && Gunfire.pillboxes.length > 20,
      `the Battlefield loads: 6 lanes open both ways, the player in the 8x8 and in the green army, on Good's clock, even having picked Evil; ${Gunfire.pillboxes.length} pillboxes`);
    check(active.length > 10 && active.every(c => c.evil === (c.dir < 0) && c.colors?.[0] === B.colors[c.dir > 0 ? 'good' : 'evil'][c.kind]) &&
      active.every(c => ['jeep', 'apc', 'tank'].includes(c.kind)) && new Set(active.filter(c => c.dir < 0).map(c => c.lane)).size > 2,
      'its traffic is jeeps, 8x8s and tanks: going the player\'s way the green army (good), the other way the red (evil), each kind its own shade, the red army down every lane');
    // the green army: none of it starts out ahead of the player; it all comes up from behind, at its own pace,
    // a little faster than the player, so as to come by
    const GA = B.goodArmy, aheadAtStart = active.filter(c => c.dir > 0).length;
    Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 30, ghost: 99 });
    const arrivals = new Map();
    for (let i = 0; i < 120 * 2; i++) {
      Player.s += 30 / 120; Player.speed = 30;
      Traffic.update(1 / 120);
      FxQueue.length = 0;
      for (const c of Traffic.cars) if (c.active && c.dir > 0 && !arrivals.has(c)) arrivals.set(c, { behind: c.s < Player.s, pace: c.baseSpeed });
    }
    const came = [...arrivals.values()];
    check(aheadAtStart === 0 && came.length > 3 && came.every(a => a.behind && a.pace >= 30 + GA.overtake.min),
      `the green army: none ahead at the start; ${came.length} came up from behind the player in 2 s, ` +
      `at ${Math.min(...came.map(a => a.pace)).toFixed(1)}+ m/s (the player doing 30)`);

    // head-ons: a tank beats an 8x8 and an 8x8 a jeep, at half their health; a jeep and a tank, or two of a kind, both wrecked
    const meet = (north, south) => {
      fresh(); alone(); untake();
      const a = army(north, 1, 2, 600, 8), b = army(south, -1, 2, 600 + CONFIG.vehicles[north].hl + CONFIG.vehicles[south].hl + 1, 8);
      for (const c of [a, b]) c.dodging = c === a ? b : a; // (neither dodges: decided)
      return watch([a, b], 60, () => hold(400)).join(' / ');
    };
    const outcomes = { 'tank-apc': meet('tank', 'apc'), 'apc-tank': meet('apc', 'tank'), 'apc-jeep': meet('apc', 'jeep'), 'jeep-tank': meet('jeep', 'tank'),
      'jeep-jeep': meet('jeep', 'jeep'), 'apc-apc': meet('apc', 'apc') };
    check(outcomes['tank-apc'] === '50% / wrecked' && outcomes['apc-tank'] === 'wrecked / 50%' && outcomes['apc-jeep'] === '50% / wrecked' &&
      outcomes['jeep-tank'] === 'wrecked / wrecked' && outcomes['jeep-jeep'] === 'wrecked / wrecked' && outcomes['apc-apc'] === 'wrecked / wrecked',
      'head-ons: ' + Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(', '));
    // ...and the player's 8x8 the same: it beats a jeep at half its health, and a tank beats it
    const playerMeets = (kind) => {
      fresh(); alone(); untake();
      Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 8, launching: false, shield: 0, ghost: 0, latVel: 0, health: Player.maxHealth });
      const foe = army(kind, -1, 2, 600 + Player.hl + CONFIG.vehicles[kind].hl + 1, 8);
      foe.dodging = Player;
      let low = Player.health, foeLow = foe.health;
      for (let i = 0; i < 60; i++) {
        step();
        low = Math.min(low, Player.active ? Player.health : 0);
        foeLow = Math.min(foeLow, foe.active ? foe.health : 0);
      }
      return { player: low <= 0 ? 'wrecked' : Math.round(low / Player.maxHealth * 100) + '%', foe: foeLow <= 0 ? 'wrecked' : 'standing' };
    };
    const vsJeep = playerMeets('jeep'), vsTank = playerMeets('tank');
    check(vsJeep.player === '50%' && vsJeep.foe === 'wrecked' && vsTank.player === 'wrecked' && vsTank.foe === 'standing',
      `the player's 8x8 head-on: against a jeep it comes off at ${vsJeep.player}, the jeep ${vsJeep.foe}; against a tank it is ${vsTank.player}`);

    // guns: an 8x8 or a tank turns its gun on the nearest enemy ahead in reach and fires; a jeep throws a package at it;
    // nobody's shell or package hurts its own side
    // (at one it won't go after head-on, so it stays where it is and has to turn its gun to it)
    const shoot = (kind, at) => {
      fresh(); alone(); untake();
      const gunner = army(kind, -1, 0, 900, 0.01, { gunWait: 0.5 });
      const target = army(at, 1, 4, 900 - 35, 0.01), friend = army('tank', -1, 3, 900 - 34, 0.01);
      for (const c of [gunner, target, friend]) c.baseSpeed = 0.01;
      let fired = null;
      for (let i = 0; i < 120 * 3 && !fired; i++) {
        for (const c of [gunner, target, friend]) { c.vs = c.dir * 0.01; c.lat = T().laneOffset(c.lane, c.s); }
        hold(700);
        step();
        fired = Packages.list.find(p => p.active && p.owner === gunner) || null;
      }
      const kindFired = fired?.kind, turned = gunner.turret;
      const [, targetLow, friendLow] = watch([gunner, target, friend], 120 * 2, () => { for (const c of [gunner, target, friend]) c.vs = c.dir * 0.01; hold(700); });
      return { fired: kindFired, turned, hurt: targetLow !== '100%', friendly: friendLow === '100%' };
    };
    const tankGun = shoot('tank', 'jeep'), jeepThrow = shoot('jeep', 'apc');
    check(tankGun.fired === 'shell' && Math.abs(tankGun.turned) > 0.1 && tankGun.hurt && tankGun.friendly && jeepThrow.fired === 'bomb' && jeepThrow.friendly,
      `a red tank turns its gun (${tankGun.turned.toFixed(2)} rad) on a green jeep off to one side and shells it, sparing the red tank beside it; a red jeep throws a package at a green 8x8, sparing its own side too`);

    // hunting and dodging: a tank steers into the lane of an 8x8 coming at it, but lumbers: only once it is close
    // (B.tank.hunt), and one lane change in a while (B.tank.laneWait), so an 8x8 lanes away gets by; that 8x8
    // dodges half the time; two of a kind always steer clear of each other
    let hunted = 0, dodged = 0, clear = 0, steps = 0, escaped = 0;
    for (let k = 0; k < 40; k++) {
      fresh(); alone(); untake();
      const hunter = army('tank', -1, 3, 1000, 10), prey = army('apc', 1, 4, 930, 10);
      for (let i = 0; i < 120 * 2.5; i++) { hold(800); step(); }
      if (hunter.lane === prey.lane || prey.dodging === hunter) hunted++;
      if (prey.dodging === hunter && prey.dodges) dodged++;
      if (k < 10) { // (one three lanes away)
        fresh(); alone(); untake();
        const far = army('tank', -1, 3, 1000, 10), fast = army('apc', 1, 0, 930, 10);
        let last = far.lane, met = false;
        for (let i = 0; i < 120 * 4; i++) {
          hold(800); step();
          if (far.lane !== last) { steps++; last = far.lane; }
          met ||= !fast.active || fast.health < fast.maxHealth;
        }
        if (!met) escaped++;
      }
      fresh(); alone(); untake();
      const a = army('jeep', 1, 2, 900, 10), b = army('jeep', -1, 2, 950, 10);
      if (!watch([a, b], 120 * 3, () => hold(700)).includes('wrecked')) clear++;
    }
    check(hunted >= 36 && dodged > 8 && dodged < 32 && clear >= 36 && steps <= 10 && escaped >= 9,
      `a tank goes after an 8x8 a lane over coming at it (${hunted} of 40), which tries to dodge it ${dodged} times of 40 (about half); ` +
      `one three lanes over gets by ${escaped} times of 10 (the tank changing lanes ${steps} times in all); two jeeps meeting steer clear of each other ${clear} times of 40`);

    // tanks don't wander lanes on a whim (a free-for-all, the player held back out of it)
    fresh();
    for (let k = 0; k < 10 && !Traffic.cars.some(c => c.active && c.kind === 'tank'); k++) fresh(); // (one with some tanks about)
    const tanks = Traffic.cars.filter(c => c.active && c.kind === 'tank');
    const lanesOf = new Map(tanks.map(c => [c, [c.lane, c.s]]));
    let wandered = 0;
    for (let i = 0; i < 120 * 6; i++) {
      hold(Player.s);
      step();
      for (const c of tanks) {
        const [lane, s] = lanesOf.get(c);
        // (not knocked over by a shell, nor gone and come back on elsewhere)
        if (c.active && c.kind === 'tank' && !c.foe && !c.stun && !c.spin && c.lane !== lane && Math.abs(c.s - s) < 5) wandered++;
        lanesOf.set(c, [c.lane, c.s]);
      }
    }

    // the green army's override (B.goodFire): a green 8x8 fires on a red tank behind it, its turret snapped round
    fresh(); alone(); untake();
    const gunner = army('apc', 1, 1, 900, 0.01, { gunWait: 0.2 }), behind = army('tank', -1, 4, 900 - 20, 0.01);
    let shot = null;
    for (let i = 0; i < 120 * 2 && !shot; i++) {
      for (const c of [gunner, behind]) { c.vs = c.dir * 0.01; c.lat = T().laneOffset(c.lane, c.s); }
      hold(700);
      step();
      shot = Packages.list.find(p => p.active && p.owner === gunner) || null;
    }
    check(tanks.length > 0 && wandered === 0 && shot?.kind === 'shell' && Math.abs(gunner.turret) > 1.5,
      `tanks keep their lanes unless hunting or dodging (${wandered} wanders by ${tanks.length} tanks in 6 s); ` +
      `a green 8x8 shells a red tank behind it, its turret swung ${gunner.turret?.toFixed(2)} rad`);

    // the player's gun: the throw button fires a small shell, then must wait; with nobody in reach dead ahead...
    fresh(); alone(); untake();
    Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 20, launching: false });
    Packages.throwOne();
    const shell = Packages.list.find(p => p.active && p.owner === Player);
    Packages.throwOne();
    const shells = Packages.list.filter(p => p.active && p.owner === Player).length;
    // ...otherwise at the nearest enemy in its reach, as a package is aimed (one behind counting as further off),
    // never at the green army
    fresh(); alone(); untake();
    Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1, launching: false, ghost: 9 });
    army('jeep', 1, 3, 615, 0.01); army('tank', 1, 1, 625, 0.01); // (green, nearer)
    // (the one behind 15 m off, so as good as 30 m: the one 25 m ahead is nearer; and not so far behind it goes up)
    const redFar = army('apc', -1, 5, 625, 0.01), redBehind = army('jeep', -1, 4, 585, 0.01);
    Packages.throwOne();
    const aimed = Packages.list.find(p => p.active && p.owner === Player);
    const turnedTo = Math.abs(Player.turret - Math.atan2(redFar.lat - Player.lat, redFar.s - Player.s)) < 0.01;
    const aimedAt = !!aimed && Math.abs(aimed.lat + aimed.vlat * aimed.flight - redFar.lat) < 1 && Math.abs(aimed.s + aimed.vs * aimed.flight - redFar.s) < 3;
    redFar.active = false;
    Packages.list.forEach(p => { p.active = false; });
    const shotBehind = () => { for (let i = 0; i < 240; i++) { Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1 }); redBehind.s = 585; step(); if (Packages.list.some(p => p.active && p.owner === Player)) break; Packages.throwOne(); } return Packages.list.find(p => p.active && p.owner === Player); };
    const back = shotBehind();
    const backAt = !!back && Math.abs(back.s + back.vs * back.flight - redBehind.s) < 4;
    // how many of its shells it takes to destroy each of the red army's vehicles, sat still 40 m ahead (crits vary it)
    const shotsFor = (kind) => {
      const counts = [];
      for (let k = 0; k < 20; k++) {
        fresh(); alone(); untake();
        const target = army(kind, -1, 2, 640, 0.01);
        let n = 0;
        for (let i = 0; i < 120 * 30 && target.active && target.health > 0; i++) {
          Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1, launching: false, ghost: 9 });
          target.vs = -0.01; target.s = 640;
          if (!Packages.list.some(p => p.active && p.owner === Player) && Packages.ready) { Packages.throwOne(); n++; }
          step();
        }
        counts.push(target.active && target.health > 0 ? Infinity : n);
      }
      counts.sort((x, y) => x - y);
      return counts;
    };
    const tally = Object.fromEntries(['jeep', 'apc', 'tank'].map(k => [k, shotsFor(k)]));
    const spread = (c) => { const m = c[Math.floor(c.length / 2)]; return `${c[0]}-${c[c.length - 1]} (mostly ${m})`; };
    console.log('    shots to destroy: ' + Object.entries(tally).map(([k, c]) => `${k} ${c.join(',')}`).join('; '));
    check(shell?.kind === 'shell' && shell.gun === cars.CAR.cannon && shells === 1 && aimedAt && turnedTo && backAt && Object.values(tally).every(c => c.every(Number.isFinite)),
      `the player's 8x8 fires a shell (${cars.CAR.cannon.range} m reach, ${cars.CAR.cannon.damage} damage) with the throw button, then must wait ${cars.CAR.cannon.cooldown} s: ` +
      `at the nearest red vehicle in reach, ahead or behind, past green ones nearer, its turret turned to it; shells to destroy a red jeep ${spread(tally.jeep)}, 8x8 ${spread(tally.apc)}, tank ${spread(tally.tank)}`);

    // Big Splash: the 8x8's shell hits bigSplash.gun.damage times as hard, and its blast reaches bigSplash.gun.splash
    // times as far, so it catches an enemy beside its target too
    const splashShot = (boosted) => {
      fresh(); alone(); untake();
      Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1, launching: false, ghost: 9, bigSplash: boosted ? 5 : 0 });
      const target = army('apc', -1, 2, 640, 0.01), beside = army('jeep', -1, 4, 640, 0.01); // (its neighbour two lanes over)
      Gunfire.pillboxes.length = 0; // (only the shell hurting them)
      Packages.throwOne();
      let low = { target: target.health, beside: beside.health };
      for (let i = 0; i < 120; i++) {
        Object.assign(Player, { s: 600, speed: 0.1 });
        for (const c of [target, beside]) { c.s = 640; c.vs = -0.01; c.wobble = 0; }
        step();
        low = { target: Math.min(low.target, target.active ? target.health : 0), beside: Math.min(low.beside, beside.active ? beside.health : 0) };
      }
      return { target: low.target <= 0 ? 'wrecked' : Math.round(low.target), beside: Math.round(Math.max(0, low.beside)), max: beside.maxHealth };
    };
    const plain = splashShot(false), big = splashShot(true);
    check(plain.target !== 'wrecked' && big.target === 'wrecked' && big.beside < plain.beside - 20,
      `Big Splash: one shell leaves a red 8x8 at ${plain.target} health and the jeep two lanes over at ${plain.beside} of ${plain.max}; ` +
      `with Big Splash it wrecks the 8x8 and the jeep comes off at ${big.beside}`);

    // red vehicles that have got evilBehind m past the player go up, by no one's hand (so they don't thin out the
    // green army coming up behind)
    fresh(); alone(); untake();
    Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1, launching: false, ghost: 9 });
    const justBy = army('jeep', -1, 5, 600 - B.evilBehind + 5, 10), longGone = army('tank', -1, 0, 600 - B.evilBehind - 5, 10), friend = army('apc', 1, 3, 600 - B.evilBehind - 10, 10);
    step();
    const goneNow = !longGone.active && !longGone.wreckedByPlayer, keptOn = justBy.active && friend.active;
    for (let i = 0; i < 120 * 2 && justBy.active; i++) { Object.assign(Player, { s: 600, speed: 0.1 }); step(); }
    check(goneNow && keptOn && !justBy.active,
      `red vehicles ${B.evilBehind} m past the player go up there and then (not the player's doing); green ones carry on`);

    // broken tracks: a shell's blast can break a tank's track (here always), and it grinds to a halt in its lane and
    // stays there, its gun still firing; nothing but a blast does it (here: rammed by a green 8x8, never)
    const BT = CONFIG.brokenTracks, odds = { ...BT };
    Object.assign(BT, { direct: 1, splash: 1 });
    fresh(); alone(); untake();
    const lame = army('tank', -1, 2, 660, 10, { gunWait: 99 }), mark = army('jeep', 1, 5, 615, 0.01, { gunWait: 99 }); // (something to shoot at)
    let stoppedIn = null, t = 0, hit = false;
    const laneAt = lame.lane, lameShot = [];
    for (let i = 0; i < 120 * 6 && lame.active; i++, t += 1 / 120) {
      Object.assign(Player, { s: 600, lat: T().laneOffset(2, 600), speed: 0.1, launching: false, ghost: 9 });
      Object.assign(mark, { s: 615, vs: 0.01, gunWait: 99, health: mark.maxHealth });
      if (!hit && Packages.ready) { Packages.throwOne(); hit = true; }
      step();
      if (lame.tracksBroken && stoppedIn === null && Math.abs(lame.vs) < 0.05) stoppedIn = t;
      if (lame.tracksBroken) lame.gunWait = Math.min(lame.gunWait, 0.5);
      for (const p of Packages.list) if (p.active && p.owner === lame && !lameShot.includes(p)) lameShot.push(p);
    }
    const stayed = lame.active && Math.abs(lame.vs) < 0.05 && lame.lane === laneAt, broke = lame.tracksBroken; // (before its slot is dealt out again)
    fresh(); alone(); untake();
    const rammed = army('tank', -1, 2, 640, 8), rammer = army('apc', 1, 2, 640 - 7.5, 8);
    for (const c of [rammed, rammer]) c.dodging = c === rammed ? rammer : rammed;
    watch([rammed, rammer], 120, () => hold(400));
    const notByRam = !rammed.tracksBroken;
    Object.assign(BT, odds);
    check(broke && stoppedIn !== null && stoppedIn < 1.5 && stayed && lameShot.length > 0 && notByRam,
      `broken tracks: a red tank whose track a shell breaks grinds to a halt in ${stoppedIn?.toFixed(2)} s and stays put in its lane, ` +
      `still firing (${lameShot.length} shots); a ram never breaks one (odds: ${Math.round(BT.direct * 100)}% on a direct hit, ${Math.round(BT.splash * 100)}% in the splash)`);

    // landmines: down the lanes, buried (harmless) until the player is mineRise.ahead off, when they pop up; whatever
    // touches one then (the player's car, a ghost aside, or traffic, which never steers round one) is destroyed
    // outright, and the mine is gone; a shell's blast never sets one off
    fresh(); alone(true); untake();
    const mines = Collision.obstacles.filter(o => o.kind === 'landmine');
    const inLanes = mines.every(m => [0, 1, 2, 3, 4, 5].some(l => Math.abs(m.lat - T().laneOffset(l, m.s)) < 1e-6));
    const mine = mines[5];
    Object.assign(Player, { s: mine.s - Player.hl - 2, lat: mine.lat, speed: 10, launching: false, shield: 0, ghost: 0, latVel: 0, health: Player.maxHealth });
    let blown = false;
    for (let i = 0; i < 120 && !blown; i++) { step(); blown = !Player.active || Player.health <= 0; }
    const gone = mine.gone;
    fresh(); alone(true); untake();
    const mine2 = Collision.obstacles.filter(o => o.kind === 'landmine')[5];
    Object.assign(Player, { s: mine2.s - Player.hl - 2, lat: mine2.lat, speed: 10, launching: false, shield: 0, ghost: 5, latVel: 0, health: Player.maxHealth });
    for (let i = 0; i < 120; i++) step();
    const ghostOk = Player.active && Player.health === Player.maxHealth && !mine2.gone;
    fresh(); alone(true); untake();
    const mine3 = Collision.obstacles.filter(o => o.kind === 'landmine')[8];
    const lane3 = [0, 1, 2, 3, 4, 5].find(l => Math.abs(mine3.lat - T().laneOffset(l, mine3.s)) < 1e-6);
    const victim = army('tank', -1, lane3, mine3.s + 20, 12);
    Gunfire.pillboxes.length = 0; // (nothing shooting at it on the way)
    let lowest = victim.health, drift = 0;
    for (let i = 0; i < 120 * 2.5 && lowest > 0; i++) { // (until it goes up)
      hold(mine3.s - 100);
      Player.lat = T().laneOffset((lane3 + 3) % 6, Player.s); // (out of its way)
      step();
      if (victim.active) drift = Math.max(drift, Math.abs(victim.lat - mine3.lat));
      lowest = Math.min(lowest, victim.active ? victim.health : 0);
    }
    const mine3Gone = mine3.gone; // (before the mines are laid again)
    // (buried: a tank drives over one with the player far off, and the mine is still there; once up, a shell
    // bursting on it leaves it be)
    fresh(); alone(true); untake();
    const MR = B.mineRise, mine4 = Collision.obstacles.filter(o => o.kind === 'landmine')[12];
    const lane4 = [0, 1, 2, 3, 4, 5].find(l => Math.abs(mine4.lat - T().laneOffset(l, mine4.s)) < 1e-6);
    const crosser = army('tank', -1, lane4, mine4.s + 15, 12);
    let crossedLow = crosser.health;
    for (let i = 0; i < 120 * 2.5; i++) { hold(mine4.s - MR.ahead - 200); step(); crossedLow = Math.min(crossedLow, crosser.active ? crosser.health : 0); }
    const stillBuried = mine4.buried && !mine4.gone && crossedLow > 0;
    for (let i = 0; i < 120; i++) { hold(mine4.s - MR.ahead + 10); step(); }
    const popped = !mine4.buried && mine4.rise === 1;
    Packages.list.forEach(p => { p.active = false; });
    const mineShot = Packages.fireShell({ s: mine4.s - 40, lat: mine4.lat, dir: 1, hl: 1, height: 2 }, { s: mine4.s, lat: mine4.lat, vs: 0, latVel: 0 }, B.guns.tank);
    for (let i = 0; i < 120; i++) { hold(mine4.s - MR.ahead + 10); step(); }
    const survived = mineShot && !mine4.gone;
    check(mines.length === 70 && inLanes && blown && gone && ghostOk && lowest <= 0 && mine3Gone && drift < 0.2 && stillBuried && popped && survived,
      `landmines: ${mines.length} down the lanes, buried until the player is ${MR.ahead} m off, then popping up; the player's car driving onto one is destroyed and the mine gone, a ghost passes over; ` +
      `a tank drives straight onto one (${drift.toFixed(2)} m off its line) and is destroyed, the mine with it, but over a buried one unharmed; a shell bursting on one leaves it be`);

    // pillboxes fire only at the other army: a red one at the player and the green army, a green one at the red
    fresh(); alone(); untake();
    const red = Gunfire.pillboxes.find(b => b.team < 0), green = Gunfire.pillboxes.find(b => b.team > 0 && b.s > red.s + 300);
    const shotAt = (box, kinds) => {
      Gunfire.reset();
      Gunfire.pillboxes.length = 0;
      Gunfire.pillboxes.push(box);
      Object.assign(Player, { s: box.s + 2, lat: T().laneOffset(box.side > 0 ? 5 : 0, box.s), speed: 0.1, ghost: 0, shield: 0, health: Player.maxHealth });
      const targets = [];
      Gunfire.bursts.length = 0;
      for (let i = 0; i < 120 * 2; i++) {
        Player.s = box.s + 2; Player.speed = 0.1;
        step();
        for (const b of Gunfire.bursts) targets.push(b.target);
      }
      return targets;
    };
    const fromRed = shotAt(red), fromGreen = shotAt(green);
    check(fromRed.length > 0 && fromRed.every(t => t.isPlayer || t.dir > 0) && fromGreen.every(t => !t.isPlayer && t.dir < 0),
      `pillboxes: a red one fires on the player (${fromRed.filter(t => t.isPlayer).length} bursts at it), a green one never does`);
  }

  section('emergency vehicles');
  {
    const { Message } = await load('/src/delivery/messages.js');
    const E = CONFIG.emergency, T = () => track.Track;
    const pick = (id) => levels.selectLevel(levels.LEVELS.findIndex(l => l.id === id));
    // Suburbia, the player in lane 2 at 600 m (where the road is one lane each way) doing 20, the
    // shoulder legal (a passenger), and no traffic but what a test puts there
    const staged = [];
    const setUp = () => {
      pick('suburbs');
      cars.selectCar('commuter');
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      staged.length = 0;
      Message.clear();
      Player.s = 600; Player.lat = T().laneOffset(2, 600); Player.speed = 20; Player.launching = false; Player.shield = 0; Player.passenger = 99;
    };
    const stage = (props) => {
      const car = Traffic.cars.find(c => c.dir > 0 && !c.active && !c.unused), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, viaSide: false, s: 700, lane: 2, lat: T().laneOffset(2, 700), vs: 15, baseSpeed: 15,
        latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, rival: null, rivalTime: 0, honkWait: 0, throwTimer: 99, arrest: -1,
        pulledOver: false, pulledFor: null, toad: null, hesitant: false, tap: 0, think: 99, pendingLane: null, signal: 0, hazards: false,
        braking: false, emergency: false, defiant: false, hw: type.hw, hl: type.hl, height: type.height, mass: type.mass,
        health: type.health, maxHealth: type.health, evil: false, mood: 0 }, props);
      staged.push(car);
      return car;
    };
    // runs on, keeping the road clear of anything else; returns the closest the ambulance came to running into anything
    const run = (amb, seconds, until = () => false) => {
      let closest = Infinity;
      for (let i = 0; i < 120 * seconds && !until(); i++) {
        for (const c of Traffic.cars) if (c !== amb && !staged.includes(c)) c.active = false;
        Game.update(1 / 120);
        FxQueue.length = 0;
        for (const v of [Player, ...staged]) {
          if (!amb.active || !v.active || v.arrest >= 0 || (v.isPlayer && Player.busted)) continue;
          const room = (v.s - amb.s) * amb.dir - v.hl - amb.hl;
          if (room > -1 && Math.abs(v.lat - amb.lat) < v.hw + amb.hw) closest = Math.min(closest, room);
        }
      }
      return closest;
    };
    const fastest = Math.max(...cars.CARS.map(c => c.maxSpeed), ...Object.values(cars.LEVEL_CARS).map(c => c.maxSpeed)) + CONFIG.turboBoost;
    check(E.speed > fastest && E.speed < CONFIG.bulletTrain.speed,
      `an ambulance does ${(E.speed * 3.6).toFixed(0)} km/h: second only to the bullet train (${(CONFIG.bulletTrain.speed * 3.6).toFixed(0)}), ahead of anything else (${(fastest * 3.6).toFixed(0)})`);

    // one going the player's way sets off behind the player, in the player's lane, and says so; the
    // player and a car ahead get out of its way, and it goes by without touching either
    setUp();
    let car = stage({});
    let amb = Traffic.startEmergency(1);
    const warned = Message.lines.some(line => line.text === 'Emergency vehicle oncoming!! Give way!');
    const setOff = amb && amb.dir === 1 && Math.abs(Player.s - amb.s - E.behind) < 1e-6 && amb.lane === 2 && amb.kind === 'ambulance';
    Player.lat = T().shoulderOffset(1, Player.s);
    let gaveWay = false; // (the car pulls over, and back again once the ambulance is by)
    let closest = run(amb, 8, () => { gaveWay ||= car.pulledOver || car.lane !== 2; return amb.s > car.s + 30; });
    check(setOff && warned && amb.s > car.s + 30 && !Player.busted && car.arrest < 0 && gaveWay && closest > 0.5,
      `an ambulance going the player's way sets off ${E.behind} m behind in the player's lane ("${Message.pick('events', 'emergency')}"); ` +
      `the player and a car ahead give way, and it goes by (closest it came to anything: ${closest.toFixed(1)} m)`);

    // a player who stays in its way: it closes up behind and waits, then after giveWay s the player is busted
    setUp();
    amb = Traffic.startEmergency(1);
    let closeAt = -1, t = 0;
    closest = Infinity;
    for (let i = 0; i < 120 * 12 && !Player.busted; i++, t += 1 / 120) {
      closest = Math.min(closest, run(amb, 1 / 120));
      if (closeAt < 0 && (Player.s - amb.s) - Player.hl - amb.hl <= E.reach) closeAt = t;
    }
    check(Player.busted && Player.bustReason === 'emergency' && Math.abs(t - closeAt - E.giveWay) < 0.1 && closest > 0.5,
      `a player who won't give way is busted ${(t - closeAt).toFixed(2)} s after it closes up ("${Message.pick('busts', 'emergency')}"), and it never runs into the player (${closest.toFixed(1)} m)`);

    // a defiant evil driver who won't give way is arrested, and it goes on by
    setUp();
    car = stage({ evil: true, defiant: true });
    amb = Traffic.startEmergency(1);
    Player.lat = T().shoulderOffset(1, Player.s);
    let arrested = false;
    closest = run(amb, 12, () => { arrested ||= car.arrest >= 0; return amb.s > car.s + 30; });
    check(arrested && amb.s > car.s + 30 && closest > 0.5 && !Player.busted,
      `a driver who won't give way (${E.defiance * 100}% of evil ones) is arrested, and the ambulance goes on by (closest ${closest.toFixed(1)} m)`);

    // one coming the other way turns up ahead, in an oncoming lane, and says nothing
    setUp();
    amb = Traffic.startEmergency(-1);
    const [first, last] = T().laneRange(-1, amb.s);
    check(amb && amb.dir === -1 && amb.lane >= first && amb.lane <= last && amb.s - Player.s >= CONFIG.spawnMin &&
      !Message.lines.some(line => line.text), 'an ambulance coming the other way turns up ahead in an oncoming lane, with no message');

    // Suburbia sends them now and then, either way; the Expressway never
    const seen = (id) => {
      pick(id);
      Game.start();
      let ways = new Set();
      for (let i = 0; i < 120 * 90 && Game.state === 'playing'; i++) {
        Player.health = Player.maxHealth; Game.busts = 0; Game.time = 0;
        Game.update(1 / 120);
        FxQueue.length = 0;
        for (const c of Traffic.cars) if (c.active && c.emergency) ways.add(c.dir);
      }
      return ways;
    };
    const suburbs = seen('suburbs'), expressway = seen('expressway');
    check(suburbs.size > 0 && expressway.size === 0,
      `90 s of Suburbia brings ambulances (${[...suburbs].map(d => d > 0 ? 'going the player\'s way' : 'oncoming').join(', ')}); the Expressway none`);
  }

  section('Canberra: a median railway');
  {
    const { BulletTrain } = await load('/src/delivery/bullettrain.js');
    const { Message } = await load('/src/delivery/messages.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'canberra'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = track.Track, HM = T.medianHalf;
    const [south] = T.laneRange(-1, 500), [north] = T.laneRange(1, 500);
    check(T.laneCount === 3 && T.leftLanes === 1 && T.medianLanes === 1 && T.rightLanes === 1 && south === 0 && north === 2 &&
      T.laneOffset(1, 500) === 0 && Math.abs(Player.lat - T.laneOffset(2, 0)) < 1e-9 && T.nearestLane(0, 500) === 1 &&
      Math.abs(T.laneLo(500) + HM + CONFIG.laneWidth) < 1e-9 && Math.abs(T.laneHi(500) - HM - CONFIG.laneWidth) < 1e-9,
      `three lanes: one oncoming (0), the railway's median (1, centred on the centre line), and one going the player's way (2), where the player starts`);
    // two minutes of driving, the player kept going: no traffic ever drives onto the median, and the trains come down it
    let onMedian = 0, trains = 0, offTrack = 0, warned = false, wasActive = false;
    for (let i = 0; i < 120 * 120 && Game.state === 'playing'; i++) {
      Player.health = Player.maxHealth; Game.busts = 0; Game.time = 0;
      Game.update(1 / 120);
      FxQueue.length = 0;
      for (const c of Traffic.cars) {
        if (c.active && c.arrest < 0 && !(c.spin > 0) && !(c.stun > 0) && !(c.wobble > 0) && Math.abs(c.lat) - c.hw < HM - 0.05) onMedian++;
      }
      if (BulletTrain.active && !wasActive) {
        trains++;
        warned ||= Message.lines.some(line => line.text === 'BULLET TRAIN INCOMING!!!');
      }
      if (BulletTrain.active && (!BulletTrain.onTrack || BulletTrain.carriage(3, {}).lat !== 0)) offTrack++;
      wasActive = BulletTrain.active;
    }
    const { min, max } = levels.LEVEL.railway.every;
    const rail = Collision.obstacles.filter(o => o.kind === 'railBarrier');
    check(onMedian === 0 && trains >= Math.floor(120 / (max + 6)) && warned && !offTrack && rail.length > 0 && rail.every(o => !o.gone),
      `2 min of Canberra: ${trains} bullet trains down the median track (every ${min}-${max} s), with the warning; no traffic ever on the median; ` +
      `all ${rail.length} railway barriers on the track still standing`);
  }

  // the railway track slows a car on it by how well it crosses one (its "crossing")
  {
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'canberra'));
    const R = CONFIG.railCrossing, onTrack = {};
    for (const id of ['pickup', 'lowrider']) {
      cars.selectCar(id);
      Game.evil = false;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s: 300, lat: 0, speed: cars.CAR.maxSpeed, launching: false, shield: 0 });
      for (let i = 0; i < 120; i++) { Player.update(1 / 120, 1, 0, false); Player.lat = 0; } // (1 s on it, foot down)
      onTrack[id] = { got: Player.speed, want: cars.CAR.maxSpeed * (R.slowest + (1 - R.slowest) * cars.CAR.crossing), top: cars.CAR.maxSpeed };
    }
    cars.selectCar('commuter');
    Game.start();
    Object.assign(Player, { s: 300, lat: track.Track.laneOffset(2, 300), speed: 24, launching: false });
    for (let i = 0; i < 120; i++) Player.update(1 / 120, 1, 0, false);
    const { pickup, lowrider } = onTrack;
    check(Math.abs(pickup.got - pickup.want) < 0.1 && Math.abs(lowrider.got - lowrider.want) < 0.1 && Math.abs(Player.speed - 24) < 1e-6,
      `crossing the railway: the Pick-Up holds ${pickup.got.toFixed(1)} of its ${pickup.top} m/s on the track, the Lowrider ${lowrider.got.toFixed(1)} of its ${lowrider.top}; off it, nothing changes`);
  }

  section('Monte Carlo: hairpins and parked cars');
  {
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'monte-carlo'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = track.Track, a = {}, b = {};
    // each hairpin turns the road right round, and the legs either side of it run side by side
    const hairpins = levels.LEVEL.segments.filter(seg => Math.abs(Math.abs(seg.curve * seg.length) - Math.PI) < 0.01).length;
    const h0 = T.toWorld(500, 0, a), h1 = T.toWorld(800, 0, b);
    check(hairpins === 5 && Math.abs(Math.abs(h0 - h1) - Math.PI) < 0.01 && Math.abs(Math.hypot(a.x - b.x, 0) - 35.6) < 1,
      `${hairpins} hairpins: the legs either side of the first run exactly opposite ways, ${Math.abs(a.x - b.x).toFixed(1)} m apart`);
    const parked = Traffic.cars.filter(c => c.active && c.parked), start = new Map(parked.map(c => [c, c.s]));
    const placed = parked.length === levels.LEVEL.parked.length && parked.every(c => T.onShoulder(c.lat, c.s) && c.hazards && c.fixed && !c.evil &&
      c.dir === (c.lat > 0 ? 1 : -1));
    let moved = 0;
    for (let i = 0; i < 120 * 60 && Game.state === 'playing'; i++) {
      Player.health = Player.maxHealth; Game.busts = 0; Game.time = 0;
      Game.update(1 / 120);
      FxQueue.length = 0;
    }
    // (passing traffic may brush one, and nudge it along a little)
    for (const [c, s] of start) if (c.active && (Math.abs(c.s - s) > 3 || !c.hazards || !T.onShoulder(c.lat, c.s))) moved++;
    check(placed && moved === 0, `all ${parked.length} parked cars are on their shoulders, facing that side's way, hazards on, and still there a minute later`);
    // ice: braking has less bite on it, and in a bend the car understeers to the outside, the more
    // the faster and heavier it is; traffic hitting it may spin out, the likelier the faster
    const T2 = () => track.Track;
    const brakeLoss = (s) => {
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s, lat: T2().laneOffset(1, s), speed: 24, launching: false, shield: 0 });
      for (let i = 0; i < 60; i++) Player.update(1 / 120, -1, 0, false);
      return 24 - Player.speed;
    };
    const dry = brakeLoss(300), iced = brakeLoss(445);
    const slide = (speed, heavy) => {
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s: 606, lat: T2().laneOffset(1, 606), speed, launching: false, shield: 0, latVel: 0, heavy: heavy ? 99 : 0 });
      const lat0 = Player.lat;
      for (let i = 0; i < 120; i++) Player.update(1 / 120, 0, 0, false); // (1 s round the first hairpin, a left, hands off)
      return Player.lat - lat0;
    };
    const slow = slide(8), fast = slide(24), medium = slide(14), weighed = slide(14, true);
    check(Math.abs(iced / dry - CONFIG.ice.brakeGrip) < 0.02 && Math.abs(slow) < 0.05 && fast > 1 && weighed > medium * 3,
      `on ice: braking takes ${iced.toFixed(1)} m/s off in 0.5 s, not ${dry.toFixed(1)}; round a hairpin hands off for 1 s the car slides ` +
      `${slow.toFixed(2)} m to the outside at 8 m/s, ${medium.toFixed(2)} at 14 (${weighed.toFixed(2)} with the 1000 lb weight), ${fast.toFixed(2)} at 24`);
    Game.start();
    let spins = 0;
    for (let k = 0; k < 400; k++) {
      for (const c of Traffic.cars) c.active = false;
      const car = Traffic.cars.find(c => c.dir > 0 && !c.unused), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, parked: false, emergency: false, s: 444, lane: 1, lat: T2().laneOffset(1, 444),
        vs: 15, baseSpeed: 15, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, onIce: false, toad: null, arrest: -1,
        hw: type.hw, hl: type.hl, height: type.height, mass: 1, health: 60, maxHealth: 60, think: 99, rival: null, pendingLane: null });
      Traffic.update(1 / 120);
      FxQueue.length = 0;
      if (car.spin > 0) spins++;
    }
    const want = 400 * CONFIG.ice.spinPerSpeed * 15;
    check(Math.abs(spins - want) < 4 * Math.sqrt(want), `traffic hitting the ice at 15 m/s: ${spins} of 400 spin out (about ${want.toFixed(0)} expected)`);

    // no brakes (a mystery): the car doesn't slow for a bend, it slides wide past the bend's limit,
    // scrubbing off a little; braking only lifts off, coasting down; steering scrubs a very little
    const NB = CONFIG.mystery.noBrakes;
    const run = (s, speed, noBrakes, throttle, steer, time) => {
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s, lat: T2().laneOffset(0, s), speed, launching: false, shield: 0, latVel: 0, heavy: 0,
        mystery: noBrakes ? 'noBrakes' : '', mysteryTime: noBrakes ? 99 : 0 });
      const lat0 = Player.lat;
      for (let i = 0; i < time * 120; i++) Player.update(1 / 120, throttle, typeof steer === 'function' ? steer(i) : steer, false);
      const out = { lost: speed - Player.speed, slid: Player.lat - lat0 };
      Player.mystery = '';
      return out;
    };
    const limit = Math.sqrt(CONFIG.cornering.grip / Math.abs(T2().bend(606)));
    const capped = run(606, 24, false, 0, 0, 1), skid = run(606, 24, true, 0, 0, 1), within = run(606, 15, true, 0, 0, 1);
    check(capped.lost > 2 && Math.abs(capped.slid) < 0.05 && skid.slid > 0.5 && skid.lost > 0 && skid.lost < capped.lost / 2 &&
      Math.abs(within.slid) < 0.05 && Math.abs(within.lost) < 1e-6,
      `no brakes, round a hairpin (limit ${limit.toFixed(1)} m/s) hands off for 1 s: at 24 m/s the car slides ${skid.slid.toFixed(2)} m wide and scrubs off ` +
      `${skid.lost.toFixed(2)} m/s (with brakes it is slowed ${capped.lost.toFixed(1)} m/s and doesn't slide); at 15 it neither slides nor slows`);
    const lift = run(300, 24, true, -1, 0, 1), hold = run(300, 24, true, 0, 0, 1);
    const weave = run(300, 24, true, 0, (i) => (Math.floor(i / 30) % 2 ? -1 : 1), 1);
    check(Math.abs(lift.lost - NB.coast) < 0.05 && Math.abs(hold.lost) < 1e-6 && weave.lost > 0 && weave.lost < NB.coast / 4,
      `no brakes, on the straight for 1 s: holding brake coasts ${lift.lost.toFixed(2)} m/s off, hands off holds speed, ` +
      `weaving scrubs only ${weave.lost.toFixed(2)} m/s off`);

    // the level checks catch a bend too tight for the road, and a road that runs into itself
    levels.selectSpecial({ id: 'tight', name: 'tight', clock: { good: 99, evil: 99 }, tip: 1, traffic: {}, segments: [{ length: 200, curve: 0 }, { length: 20, curve: 0.15 }, { length: 200, curve: 0 }] });
    Game.start();
    const tight = T === track.Track ? [] : track.Track.problems;
    levels.selectSpecial({ id: 'loop', name: 'loop', clock: { good: 99, evil: 99 }, tip: 1, traffic: {}, segments: [{ length: 200, curve: 0 }, { length: 252, curve: 1 / 40 }, { length: 200, curve: 0 }] });
    Game.start();
    const loop = track.Track.problems;
    check(tight.some(p => p.includes('too tight')) && loop.some(p => p.includes('runs into itself')) && !loop.some(p => p.includes('too tight')),
      `level checks: "${tight.find(p => p.includes('too tight'))}"; "${loop[0]}"`);
    Game.toMenu();
  }

  section('Singapore: junctions, and driving on the left');
  {
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'singapore'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = track.Track, turns = T.junctions.filter(jn => jn.way), straight = T.junctions.filter(jn => !jn.way);
    check(T.junctions.length === 10 && turns.length === 5 && turns.every(jn => Math.abs(Math.abs(jn.turned) - Math.PI / 2) < 0.02) &&
      T.junctions.every(jn => jn.arms.length === 2 && jn.arms.every(arm => arm.length > jn.half + 150)),
      `${T.junctions.length} junctions: ${turns.length} quarter turns (radius ${turns[0].radius.toFixed(1)} m) and ${straight.length} straight on, every arm running ${Math.min(...T.junctions.flatMap(jn => jn.arms.map(a => a.length))).toFixed(0)} m or more`);
    // leaving at junctions, one car at a time (the road cleared, the player held well back, every junction's
    // chances of leaving at 1 so nothing is left to the dice): at a turn a car carries straight on down the arm
    // ahead and is gone at its end, unless something going its way is beside it on the outside of the bend
    // (it would cut across it); at a junction straight on only a car in the outside lane turns off; and
    // oncoming traffic gives way while one is crossing the box
    {
      const alone = () => { for (const c of Traffic.cars) Object.assign(c, { active: false, unused: true }); };
      const put = (lane, s, speed, dir = 1) => {
        const car = Traffic.cars.find(c => !c.active && c.unused);
        Object.assign(car, { active: true, unused: false, kind: 'commuter', dir, bound: dir > 0 ? 'north' : 'south', fixed: false, parked: false, emergency: false,
          racer: false, procession: 0, junction: null, junctionSeen: null, s, lane, lat: T.laneOffset(lane, s), vs: dir * speed, baseSpeed: speed, latVel: 0,
          yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, think: 99, rival: null, pendingLane: null, pulledOver: false,
          evil: false, mood: 0, emotion: 'neutral', hesitant: false, tap: 0, hw: CONFIG.vehicles.commuter.hw, hl: CONFIG.vehicles.commuter.hl });
        return car;
      };
      const fresh = (jn) => {
        Game.start();
        alone();
        for (const x of T.junctions) Object.assign(x, { forward: 1, turnOff: 1 });
        Object.assign(Player, { s: jn.s - 300, lat: T.laneOffset(T.laneRange(1, jn.s - 300)[1], jn.s - 300), speed: 0, ghost: 99, launching: false });
      };
      const run = (cars, seconds, each) => {
        for (let i = 0; i < 120 * seconds; i++) {
          Player.speed = 0; Player.health = Player.maxHealth; Game.time = 0;
          Game.update(1 / 120);
          FxQueue.length = 0;
          each?.();
        }
      };
      const kept0 = T.junctions.map(x => ({ ...x })); // (put back after: the junctions outlast a restart)
      const turn = turns[1], ahead = straight[1];
      const [first, last] = T.laneRange(1, turn.s - 30);
      // (the lane on the inside of the bend, and the one beside it on the outside)
      const inside = turn.way > 0 ? last : first, outside = turn.way > 0 ? first : last;
      fresh(turn);
      const goes = put(inside, turn.s - 30, 10);
      let left = false, gone = false;
      run([goes], 40, () => { left ||= !!goes.junction; gone ||= left && !goes.active; });
      fresh(turn);
      const held = put(inside, turn.s - 30, 10), blocker = put(outside, turn.s - 32, 10);
      let cut = false;
      run([held, blocker], 6, () => { cut ||= !!held.junction; });
      const [, outer] = T.laneRange(1, ahead.s - 30);
      fresh(ahead);
      const turner = put(outer, ahead.s - 30, 10), keeper = put(outer - 1, ahead.s - 40, 10);
      let turned = false, kept = true;
      run([turner, keeper], 8, () => { turned ||= !!turner.junction; kept &&= !keeper.junction; });
      fresh(turn);
      const crosser = put(inside, turn.s - 12, 10), oncoming = put(T.laneRange(-1, turn.s)[1], turn.end + 40, 10, -1);
      let busyIn = false;
      run([crosser, oncoming], 6, () => { if (turn.busy && oncoming.active && oncoming.s < turn.end && oncoming.s > turn.s) busyIn = true; });
      T.junctions.forEach((x, i) => Object.assign(x, kept0[i]));
      check(left && gone && !cut && turned && kept && !busyIn,
        `junctions: at a turn a car carries straight on down the arm and is gone at its end, but not across one beside it on the outside of the bend; ` +
        `straight on, one in the outside lane turns off and one in from it doesn't; oncoming traffic waits while one crosses the box` +
        (left && gone && !cut && turned && kept && !busyIn ? '' : ` [left ${left}, gone ${gone}, cut ${cut}, turned ${turned}, kept ${kept}, oncoming in the busy box ${busyIn}]`));
    }
    // driving on the left: the level is shown mirrored, so steering is reversed in the game's own terms
    const steerFor = (id) => {
      levels.selectLevel(levels.LEVELS.findIndex(l => l.id === id));
      Game.start();
      for (const c of Traffic.cars) c.active = false; // (nothing beside the car to stop it moving over)
      Object.assign(Player, { s: 100, speed: 15, launching: false });
      const lat0 = Player.lat;
      steerNote = `active ${Player.active}, busted ${Player.busted}, state ${Game.state}, paused ${Game.paused}`;
      const real = Object.getOwnPropertyDescriptor(Input, 'steer');
      Object.defineProperty(Input, 'steer', { get: () => 1, configurable: true }); // (holding right)
      for (let i = 0; i < 30; i++) Game.update(1 / 120);
      Object.defineProperty(Input, 'steer', real);
      return Player.lat - lat0;
    };
    let steerNote = '';
    const onLeft = steerFor('singapore'), leftNote = steerNote, onRight = steerFor('expressway');
    check(levels.LEVELS.find(l => l.id === 'singapore').drive === 'left' && onLeft < 0 && onRight > 0,
      `driving on the left (Singapore, shown mirrored): holding right moves the car ${onLeft.toFixed(2)} m in the game's own terms (on the right: ${onRight.toFixed(2)})` +
      (onLeft < 0 ? '' : ` [${leftNote}]`));
  }

  section('Sydney to Kiama: zones, and 18-wheelers');
  {
    const { Message } = await load('/src/delivery/messages.js');
    const physics = await load('/src/delivery/physics.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'grand-pacific'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = track.Track, L = levels.LEVEL, semi = CONFIG.vehicles.semi;
    // traffic dealt out around the player in a zone: that zone's own traffic list
    const dealAt = (s) => {
      Player.s = s;
      Traffic.reset();
      return Traffic.cars.filter(c => c.active && !c.fixed);
    };
    const inSydney = dealAt(200).map(c => c.kind), onOusley = dealAt(4000); // (Sydney's kinds noted before the cars are dealt out again)
    const trucks = onOusley.filter(c => c.kind === 'semi');
    const atKerb = (c) => c.lane === T.laneRange(c.dir, c.s)[c.dir > 0 ? 1 : 0];
    check(!inSydney.includes('semi') && trucks.length > 0 && trucks.every(c => atKerb(c) && !c.hesitant &&
      c.baseSpeed >= semi.cruise.min && c.baseSpeed <= semi.cruise.max),
      `zones have traffic of their own: none of the ${inSydney.length} vehicles in Sydney is an 18-wheeler; on Mount Ousley ${trucks.length} of ${onOusley.length} are, ` +
      `each in the lane by the kerb, at ${(semi.cruise.min * 3.6).toFixed(0)}-${(semi.cruise.max * 3.6).toFixed(0)} km/h, and none hesitating` +
      trucks.filter(c => !atKerb(c) || c.hesitant || c.baseSpeed < semi.cruise.min || c.baseSpeed > semi.cruise.max)
        .map(c => ` [dir ${c.dir} lane ${c.lane} of ${T.laneRange(c.dir, c.s)} at ${c.s.toFixed(0)}, ${c.baseSpeed.toFixed(1)} m/s${c.hesitant ? ', hesitant' : ''}]`).join(''));
    // an 18-wheeler never spins out: a critical hit makes it wobble, and then it blows up
    const truck = trucks[0];
    let spun = false;
    for (let i = 0; i < 400 && truck.health > 0; i++) {
      physics.hurt(truck, 0.5, 30); // (small hits, every one likely critical)
      spun ||= truck.spin > 0;
      if (truck.wobble > 0) break;
    }
    const wobbled = truck.wobble > 0;
    for (let i = 0; i < 240 && truck.active; i++) {
      for (const c of Traffic.cars) if (c !== truck) c.active = false;
      Traffic.update(1 / 120);
      Collision.check();
      FxQueue.length = 0;
      spun ||= truck.spin > 0;
    }
    check(wobbled && !spun && !truck.active, `an 18-wheeler never spins: a critical hit makes it wobble, then it blows up (spun: ${spun}, still there: ${truck.active})`);
    // coming into each zone, the player is welcomed to it
    Game.start();
    const welcomes = [];
    for (const z of L.zones) {
      Player.s = z.from + 5;
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (Message.lines.some(line => line.text === Message.pick('zones', z.id))) welcomes.push(z.id);
    }
    check(welcomes.length === L.zones.length && T.length > 10000,
      `${(T.length / 1000).toFixed(1)} km in ${L.zones.length} zones, each welcoming the player: ${welcomes.join(', ')}`);
  }

  section('Passage du Gois: the tide');
  {
    const { Message } = await load('/src/delivery/messages.js');
    const { Tide } = await load('/src/delivery/tide.js');
    const { Pickups } = await load('/src/delivery/pickups.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'passage-du-gois'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = () => track.Track, W = CONFIG.tide, L = levels.LEVEL, mid = (L.tide.from + L.tide.to) / 2;
    const north = T().laneRange(1, mid), lanes = [];
    for (let l = north[0]; l <= north[1]; l++) lanes.push(l);
    // the tide rises with the clock, from the kerb in, and never comes over the centre line; a
    // wave floods further still, after its warning
    const deepLanes = () => lanes.filter(l => Tide.depth(mid, T().laneOffset(l, mid)) >= W.deep).length;
    Tide.next = Infinity;
    const atStart = deepLanes(), dryAtStart = Tide.dryLane(mid);
    Tide.time = Game.allowed;
    const atEnd = deepLanes(), dryAtEnd = Tide.dryLane(mid);
    Player.s = mid - 100;
    Player.speed = 100 / W.warning;
    Player.active = true;
    Player.shield = 0;
    Message.clear();
    Tide.start(mid);
    const warned = Message.lines.some(line => line.text === Message.pick('events', 'wave'));
    const gifts = Tide.waves[0].gifts, hidden = gifts.every(p => p.taken);
    const before = Tide.flood(mid), held = before === Tide.base(); // (nothing yet, during the warning)
    Tide.update(W.warning + W.rise);
    const peak = Tide.flood(mid);
    const washed = gifts.length > 0 && hidden && gifts.every(p => !p.taken && p.s > mid && p.s < mid + 120 && Tide.depth(p.s, p.lat) >= W.deep);
    Object.assign(Player, { s: gifts[0].s, lat: gifts[0].lat });
    Pickups.update();
    const collected = gifts[0].taken;
    let oncomingDry = true;
    for (let lat = T().lo(mid); lat <= 0; lat += 0.25) if (Tide.depth(mid, lat) > 0) oncomingDry = false;
    const offCauseway = Tide.flood(L.tide.from - 100) === 0 && Tide.flood(L.tide.to + 100) === 0;
    check(atStart === 0 && dryAtStart === north[1] && atEnd === lanes.length - 1 && dryAtEnd === north[0] && warned &&
      held && peak > before + L.tide.waves.reach.min - 0.01 && oncomingDry && offCauseway,
      `the tide comes in from the kerb: no lane deep at the start, ${atEnd} of ${lanes.length} by the end of the clock; a wave is warned of, ` +
      `then floods ${(peak - before).toFixed(1)} lanes further; the oncoming side and the road off the causeway stay dry`);
    // ...then it drains right out, leaving the road bare, before the tide comes back in; and it
    // washes up pickups, out of sight until it comes in, then left in deep water for the taking
    Tide.update(W.hold + W.fall + W.low / 2);
    const bare = Tide.flood(mid), edgeBare = Tide.edge(mid) === T().hi(mid);
    Tide.update(W.low / 2 + W.back + 0.1);
    const back = Tide.flood(mid);
    check(bare === 0 && edgeBare && Math.abs(back - Tide.base()) < 1e-9 && Tide.waves.length === 0 && washed && collected,
      `after its height the wave drains right out (flood ${bare.toFixed(1)}: the road bare) and the tide comes back in (${back.toFixed(1)} lanes); ` +
      `it washed up ${gifts.map(p => p.type).join(' and ')}, hidden until it came in, then in deep water ahead, and there to be picked up`);
    // in the water a car is slowed twice as much as by a railway track, and deep water damages it
    // by how badly it wades (a tank not at all, a ghost skims over it)
    const wade = (id, extra = {}) => {
      cars.selectCar(id);
      Game.start();
      Tide.next = Infinity;
      Tide.time = Game.allowed;
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s: mid, lat: T().laneOffset(north[1], mid), speed: 30, launching: false, shield: 0 }, extra);
      const hp = Player.health;
      for (let i = 0; i < 120 * 3; i++) {
        Player.lat = T().laneOffset(north[1], Player.s);
        Player.update(1 / 120, 1, 0, false);
      }
      return { top: Player.speed, lost: (hp - Player.health) / 3, crossing: Player.crossing, max: cars.CAR.maxSpeed };
    };
    const R = CONFIG.railCrossing, hatch = wade('commuter'), sport = wade('sport'), tank = wade('tank'), ghost = wade('commuter', { ghost: 99 });
    cars.selectCar('commuter');
    const want = (c) => c.max * Math.max(W.slowest, 1 - W.crossing * (1 - R.slowest) * (1 - c.crossing));
    check(Math.abs(hatch.top - want(hatch)) < 0.2 && Math.abs(sport.top - want(sport)) < 0.2 &&
      Math.abs(hatch.lost - W.damage * (1 - hatch.crossing)) < 0.5 && sport.lost > hatch.lost && tank.lost === 0 && ghost.lost === 0 && ghost.top > hatch.top * 1.5,
      `wading in deep water: the hatchback at ${hatch.top.toFixed(1)} of ${hatch.max} m/s losing ${hatch.lost.toFixed(1)} health a second, the sports car ` +
      `at ${sport.top.toFixed(1)} of ${sport.max} losing ${sport.lost.toFixed(1)}; a tank takes no harm, and a ghost skims over it`);
    // traffic: none turns up in the water, a good driver keeps out of it, and a wave that catches a
    // car in deep water stalls it there, hazards on
    Game.start();
    Tide.next = Infinity;
    Tide.time = Game.allowed * 0.5;
    Player.s = mid - 300;
    Traffic.reset();
    const dealt = Traffic.cars.filter(c => c.active && !c.fixed && c.dir > 0);
    const dryDeal = dealt.every(c => c.lane <= Tide.dryLane(c.s));
    let wet = 0, samples = 0;
    for (let i = 0; i < 120 * 30; i++) {
      Player.health = Player.maxHealth;
      Player.ghost = 1;
      Tide.waves = [];
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (i % 60) continue;
      for (const c of Traffic.cars) {
        if (!c.active || c.dir < 0 || c.fixed || c.evil || c.stalled || c.rival || c.stun > 0 || c.spin > 0) continue;
        samples++;
        if (Tide.depth(c.s, c.lat) >= W.deep) wet++;
      }
    }
    for (const c of Traffic.cars) c.active = false;
    const car = Traffic.cars.find(c => c.dir > 0 && !c.unused), type = CONFIG.vehicles.darkvan;
    Object.assign(car, { active: true, kind: 'darkvan', fixed: false, parked: false, stalled: false, emergency: false, evil: true, s: Player.s + 60, lane: north[1],
      lat: T().laneOffset(north[1], Player.s + 60), vs: 15, baseSpeed: 15, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1,
      hw: type.hw, hl: type.hl, height: type.height, mass: 1, health: 60, maxHealth: 60, think: 99, rival: null, pendingLane: null, junction: null });
    Tide.waves = [{ s0: car.s - 120, s1: car.s + 120, reach: 1, t: W.rise / 2 }];
    for (let i = 0; i < 120 * 2; i++) Traffic.update(1 / 120);
    check(dealt.length > 0 && dryDeal && wet <= samples * 0.02 && car.stalled && car.hazards && Math.abs(car.vs) < 1,
      `traffic: ${dealt.length} vehicles dealt out going the player's way, none in the water; good drivers keep out of deep water ` +
      `(${wet} of ${samples} looks in it); a car a wave catches in deep water stalls, hazards on`);
    // wrecked, the new car is set down in a lane of the player's that will still be dry; with none,
    // on the oncoming side, with CONFIG.tide.oncomingShield s more shield
    const drop = (time, wave) => {
      Game.start();
      Tide.next = Infinity;
      Tide.time = time;
      if (wave) Tide.waves = [{ s0: mid - 150, s1: mid + 150, reach: 1.6, t: 0 }];
      Object.assign(Player, { s: mid, lat: T().laneOffset(north[1], mid) });
      Player.health = 0;
      for (let i = 0; i < 120 * 8 && (!Player.active || i < 2); i++) {
        for (const c of Traffic.cars) c.active = false;
        Game.update(1 / 120);
        FxQueue.length = 0;
      }
      return { lane: T().nearestLane(Player.lat, Player.s), shield: Player.shield, dry: Tide.depth(Player.s, Player.lat) <= W.wet };
    };
    const own = drop(Game.allowed * 0.6, false), oncoming = drop(Game.allowed * 1.3, true);
    check(own.lane >= north[0] && own.lane < north[1] && own.dry && own.shield <= CONFIG.respawnShield &&
      oncoming.lane < north[0] && oncoming.dry && oncoming.shield > CONFIG.respawnShield + W.oncomingShield - 0.1,
      `wrecked in the water: set down in dry lane ${own.lane} (shield ${own.shield.toFixed(1)} s); with every lane flooded, ` +
      `in oncoming lane ${oncoming.lane}, shield ${oncoming.shield.toFixed(1)} s`);
    Game.toMenu();
  }

  section('Safari: one way, and hippos');
  {
    const { Message } = await load('/src/delivery/messages.js');
    const { Hippos } = await load('/src/delivery/hippos.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'safari'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = () => track.Track, H = CONFIG.hippo, at = 2600;
    const oneWay = T().flow === 'north' && Traffic.cars.some(c => c.active) && Traffic.cars.every(c => !c.active || c.dir > 0);
    // a hippo surfaces in the river and charges straight across the road, destroying what is in its way
    // (a car, and the player's car, outright), and goes on, unharmed, into the grass on the far side
    const charge = (ghost) => {
      Game.start();
      Hippos.next = Infinity;
      for (const c of Traffic.cars) c.active = false;
      Object.assign(Player, { s: at, lat: T().laneOffset(1, at), speed: 0, shield: 0, ghost });
      const car = Traffic.cars.find(c => !c.unused), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, parked: false, stalled: false, emergency: false, s: at, lane: 0, lat: T().laneOffset(0, at),
        vs: 0, baseSpeed: 0, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, junction: null,
        hw: type.hw, hl: type.hl, height: type.height, mass: 1, health: 60, maxHealth: 60, think: 99, rival: null, pendingLane: null });
      Message.clear();
      Hippos.start(at);
      const h = Hippos.list[0], said = !Message.lines.some(line => line.text); // (no message of its own: the river's welcome warns of them)
      const inWater = h.lat > T().hi(at) + H.bank && h.y < 0;
      let carWrecked = false, playerWrecked = false, furthest = h.lat, lasted = 0;
      for (let i = 0; i < 120 * 8 && Hippos.list.length; i++) {
        Hippos.update(1 / 120);
        Collision.check();
        FxQueue.length = 0;
        carWrecked ||= !car.active;
        playerWrecked ||= !Player.active;
        if (Hippos.list.includes(h)) { furthest = h.lat; lasted = h.t; }
      }
      return { said, inWater, carWrecked, playerWrecked, across: furthest < T().lo(at) - H.beyond + 1, lasted };
    };
    const hit = charge(0), ghosted = charge(99);
    check(oneWay && hit.said && hit.inWater && hit.carWrecked && hit.playerWrecked && hit.across && ghosted.across && !ghosted.playerWrecked,
      `all the traffic goes the player's way; a hippo surfaces in the river ("${Message.pick('zones', 'river')}") and charges across the road in ` +
      `${hit.lasted.toFixed(1)} s, wrecking a car and the player's car in its way and running on unharmed into the grass; a ghost comes through it`);
    // aimed at the player: one sets off when the player is by the river, ahead of where the player is
    Game.start();
    Object.assign(Player, { s: 2400, lat: T().laneOffset(1, 2400), speed: 20, launching: false, shield: 0 });
    Hippos.next = 0;
    Hippos.update(1 / 120);
    const aimed = Hippos.list[0];
    check(!!aimed && aimed.s > Player.s + 20 && aimed.s < Player.s + 120 && !!Hippos.riverAt(aimed.s),
      `by the river, hippos come for the player: one surfaces ${aimed ? (aimed.s - Player.s).toFixed(0) : '-'} m ahead`);
    // the migration: a great herd streaming across the road one way and round again, always some of
    // it on the road; each animal an obstacle, blown up when hit
    {
      Game.start();
      const herd = Collision.obstacles.filter(o => o.migrate), z = levels.LEVEL.migration[0], M = CONFIG.migration;
      const start = new Map(herd.map(o => [o, o.lat]));
      let fewest = Infinity, wrapped = 0, oneWay = true;
      for (let i = 0; i < 120 * 20; i++) {
        const before = herd.map(o => o.lat);
        Collision.updateObstacles(1 / 120);
        herd.forEach((o, k) => {
          const moved = o.lat - before[k];
          if (moved < -1) wrapped++; // (off the far side, and round again)
          else if (Math.sign(moved) !== z.dir) oneWay = false;
        });
        if (i % 60 === 0) fewest = Math.min(fewest, herd.filter(o => o.lat > T().lo(o.s) && o.lat < T().hi(o.s)).length);
      }
      check(herd.length === z.count && herd.every(o => o.kind === 'wildebeest' || o.kind === 'zebra') && oneWay && wrapped > z.count / 2 && fewest >= 5 &&
        [...start.keys()].every(o => o.s >= z.from - 1 && o.s <= z.to + 1),
        `the migration: ${herd.length} wildebeest and zebras streaming across the road at ${M.speed.min}-${M.speed.max} m/s, ` +
        `${wrapped} times round again in 20 s, never fewer than ${fewest} on the road`);
    }
    // elephants: they plod across the road and back; one walking into the player's car wrecks it
    // outright, and it walks on; traffic waits for one in its way
    {
      const { Elephants } = await load('/src/delivery/elephants.js');
      const E = CONFIG.elephant;
      Game.start();
      for (const c of Traffic.cars) c.active = false;
      const e = Elephants.list[0], lane = T().laneOffset(1, e.s);
      Object.assign(e, { lat: lane + 6, dir: -1, rest: 0 });
      Object.assign(Player, { s: e.s, lat: lane, speed: 0, shield: 0, ghost: 0 });
      let wrecked = false, crossed = false;
      for (let i = 0; i < 120 * 12; i++) {
        Elephants.update(1 / 120);
        Collision.check();
        FxQueue.length = 0;
        wrecked ||= !Player.active;
        crossed ||= e.lat < lane - 4;
      }
      // and traffic drives on into one standing in its lane, and is trampled
      Game.start();
      const e2 = Elephants.list[0];
      Object.assign(e2, { lat: T().laneOffset(1, e2.s), rest: 99 }); // (standing in lane 1)
      for (const c of Traffic.cars) c.active = false;
      const car = Traffic.cars.find(c => !c.unused), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, parked: false, stalled: false, emergency: false, evil: false, s: e2.s - 60, lane: 1,
        lat: T().laneOffset(1, e2.s - 60), vs: 20, baseSpeed: 20, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, junction: null,
        hw: type.hw, hl: type.hl, height: type.height, mass: 1, health: 60, maxHealth: 60, think: 99, rival: null, pendingLane: null, hesitant: false, tap: 0 });
      Player.s = e2.s - 200;
      let trampled = false;
      for (let i = 0; i < 120 * 6 && !trampled; i++) {
        for (const c of Traffic.cars) if (c !== car) c.active = false;
        Traffic.update(1 / 120);
        Elephants.update(1 / 120);
        Collision.check();
        FxQueue.length = 0;
        trampled = !car.active;
      }
      check(Elephants.list.length === levels.LEVEL.elephants.reduce((n, z) => n + z.count, 0) && wrecked && crossed && trampled && Elephants.list.includes(e2),
        `${Elephants.list.length} elephants: one plods across the road at ${E.speed} m/s, wrecking the player's car in its way, and walks on; ` +
        `traffic drives on into one and is trampled`);
    }
    Game.toMenu();
  }

  section('Airport Apocalypse: wreckage');
  {
    const { Wreckage } = await load('/src/delivery/wreckage.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'airport'));
    cars.selectCar('commuter');
    Game.evil = false;
    const T = () => track.Track, W = CONFIG.wreckage;
    // a car of the pool, in a lane, at s, at speed
    const carAt = (s, lane, vs) => {
      const car = Traffic.cars.find(c => !c.unused && !c.active), type = CONFIG.vehicles.darkvan;
      Object.assign(car, { active: true, kind: 'darkvan', fixed: false, parked: false, stalled: false, halted: 0, emergency: false, evil: false, s, lane,
        lat: T().laneOffset(lane, s), vs, baseSpeed: vs, latVel: 0, yaw: 0, yawVel: 0, stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, junction: null,
        hw: type.hw, hl: type.hl, height: type.height, mass: 1, health: 60, maxHealth: 60, think: 99, rival: null, pendingLane: null, hesitant: false, tap: 0 });
      return car;
    };
    const step = () => {
      Traffic.update(1 / 120);
      Wreckage.update(1 / 120);
      Collision.check();
      FxQueue.length = 0;
    };
    // the first: nothing until the player comes up to it; then it flies in and lands across its lanes,
    // wrecking a car there; traffic heading for those lanes pulls over and stops, the rest carry on
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    const e = Wreckage.list.find(w => w.kind !== 'blast' && !w.slide), [a, b] = e.lanes, open = a > 0 ? 0 : b + 1;
    Object.assign(Player, { s: e.at - W.trigger - 30, lat: T().laneOffset(open, e.at), speed: 0, shield: 0, ghost: 0, active: true });
    const victim = Object.assign(carAt(e.at, a, 0), { fixed: true }), blocked = carAt(e.at - 100, b, 20), clear = carAt(e.at - 60, open, 20);
    for (let i = 0; i < 60; i++) step();
    const waited = e.t < 0;
    Player.s = e.at - W.trigger;
    let pulledOver = false;
    for (let i = 0; i < 120 * 4; i++) {
      for (const c of Traffic.cars) if (![victim, blocked, clear].includes(c)) c.active = false;
      step();
      pulledOver ||= blocked.halted !== 0 && blocked.hazards && T().onShoulder(blocked.lat, blocked.s);
    }
    check(waited && e.landed && !victim.active && pulledOver && Math.abs(blocked.vs) < 0.5 && blocked.s < e.s0 && clear.active && !clear.halted && clear.s > e.s1,
      `${e.kind} (lanes ${a}-${b}): set off as the player comes within ${W.trigger} m, it lands and wrecks a car there; a car heading for ` +
      `its lanes pulls over onto the shoulder, hazards on, and stops; one in a lane it leaves open drives on by`);
    // landed, it blocks its lanes for good: driving into it wrecks the player's car (a ghost comes through)
    const into = (ghost) => {
      Object.assign(Player, { s: e.s0 - 3, lat: T().laneOffset(a, e.at), speed: 20, shield: 0, ghost, active: true, health: Player.maxHealth });
      for (let i = 0; i < 60 && Player.active; i++) { Player.update(1 / 120, 0, 0, false); step(); }
      return Player.active;
    };
    check(!into(0) && into(99), 'driving into landed wreckage wrecks the car; a ghost comes through it');
    // the helicopter sets a car wrecked in front of it down in a lane it leaves open
    Game.start();
    for (const w of Wreckage.list) { w.t = W.flight + 1; w.landed = true; }
    Wreckage.list.filter(w => w.slide).forEach(w => { w.t = W.approachTime + W.slideTime + 1; w.s0 = w.at - w.depth / 2; w.s1 = w.at + w.depth / 2; });
    Object.assign(Player, { s: e.at, lat: T().laneOffset(a, e.at), health: 0 });
    for (let i = 0; i < 120 * 8 && (!Player.active || i < 2); i++) {
      for (const c of Traffic.cars) c.active = false;
      Game.update(1 / 120);
      FxQueue.length = 0;
    }
    const dropLane = T().nearestLane(Player.lat, Player.s);
    check(Player.active && !Wreckage.blocked(dropLane, Player.s), `wrecked at the wreckage, the new car is set down in open lane ${dropLane}`);
    // the airliner: it comes in from far up the road, touches down, and slides back along its lanes to
    // rest, wrecking a car in its path on the way
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    const jet = Wreckage.list.find(w => w.slide);
    Object.assign(Player, { s: jet.at - jet.trigger, lat: T().laneOffset(jet.lanes[0] > 0 ? 0 : 3, jet.at), speed: 0, shield: 0, ghost: 0 });
    const inPath = Object.assign(carAt(jet.at + jet.slide / 2, jet.lanes[0], 0), { fixed: true }); // (fixed: it stays put)
    let highest = 0, touchedAt = 0;
    for (let i = 0; i < 120 * (W.approachTime + W.slideTime + 1); i++) {
      for (const c of Traffic.cars) if (c !== inPath) c.active = false;
      inPath.vs = 0;
      step();
      const at = Wreckage.airliner(jet, jet.t);
      highest = Math.max(highest, at.h);
      if (!touchedAt && jet.landed) touchedAt = (jet.s0 + jet.s1) / 2;
    }
    check(highest > 40 && Math.abs(touchedAt - (jet.at + jet.slide)) < 10 && !inPath.active && !jet.sliding && Math.abs((jet.s0 + jet.s1) / 2 - jet.at) < 0.5,
      `an airliner dives in from ${highest.toFixed(0)} m up, touches down ${jet.slide} m up the road and slides back along lanes ` +
      `${jet.lanes.join('-')} to rest, wrecking a car in its path`);
    // a building blowing out: its red box flashes first, then whatever is in it is wrecked; it
    // leaves the road clear, and nobody pulls over for it
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    const bl = Wreckage.list.find(w => w.kind === 'blast'), spare = bl.lanes[0] > 0 ? 0 : bl.lanes[1] + 1;
    Object.assign(Player, { s: bl.at - W.blastNear, lat: T().laneOffset(spare, bl.at), speed: 0, shield: 0, ghost: 0 });
    const inBox = Object.assign(carAt(bl.at, bl.lanes[0], 0), { fixed: true }), beside = Object.assign(carAt(bl.at, spare, 0), { fixed: true });
    let warnedFirst = true;
    for (let i = 0; i < 120 * (W.blastWarn + W.blastTime + 0.5); i++) {
      for (const c of Traffic.cars) if (c !== inBox && c !== beside) c.active = false;
      step();
      if (bl.t < W.blastWarn - 0.05 && !inBox.active) warnedFirst = false;
    }
    check(warnedFirst && !inBox.active && beside.active && !Wreckage.blocked(bl.lanes[0], bl.at) &&
      !Wreckage.ahead({ s: bl.at - 50, lat: T().laneOffset(bl.lanes[0], bl.at), hw: 1, dir: 1 }),
      `a building blows out across its red box (lanes ${bl.lanes.join('-')} to the road's edge, ${W.blastWarn} s after it starts flashing), ` +
      `wrecking a car in it and not one beside it, and leaves the road clear`);
    // ...and it goes by the player's pace: one driving on flat out in its lane is in the box as it blows
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    Object.assign(Player, { s: bl.at - 120, lat: T().laneOffset(bl.lanes[0], bl.at), speed: cars.CAR.maxSpeed, launching: false, shield: 0, ghost: 0 });
    let caught = false, seenFrom = -1;
    const pace = Wreckage.list.find(w => w.at === bl.at);
    for (let i = 0; i < 120 * 8 && !caught; i++) {
      for (const c of Traffic.cars) c.active = false;
      Player.lat = T().laneOffset(bl.lanes[0], Player.s);
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (pace.landed && seenFrom < 0) seenFrom = pace.s0 - (Player.s + Player.hl); // (how far short its nose was as it blew)
      caught = !Player.active;
    }
    check(caught && Math.abs(Player.s - bl.at) < bl.depth && seenFrom > 0 && seenFrom < 8,
      `a player who keeps on flat out (${cars.CAR.maxSpeed} m/s) in its lane sees it blow ${seenFrom.toFixed(1)} m ahead, and drives on into the fire`);
    // one with "ahead" goes off well before the player can get there
    Game.start();
    for (const c of Traffic.cars) c.active = false;
    const early = Wreckage.list.find(w => w.kind === 'blast' && w.ahead);
    Object.assign(Player, { s: early.at - 250, lat: T().laneOffset(early.lanes[0], early.at), speed: cars.CAR.maxSpeed, launching: false, shield: 0, ghost: 0 });
    let short = null;
    for (let i = 0; i < 120 * 12 && short === null; i++) {
      for (const c of Traffic.cars) c.active = false;
      Player.lat = T().laneOffset(early.lanes[0], Player.s);
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (early.landed) short = early.s0 - (Player.s + Player.hl);
    }
    check(short > cars.CAR.maxSpeed * early.ahead * 0.8 && Player.active,
      `one timed ${early.ahead} s ahead blows with the player still ${short?.toFixed(0)} m short, out of reach at that pace`);
    // the control tower: standing until the player comes up to the turn, then down across the old road
    Game.start();
    const tw = Wreckage.tower;
    Player.s = tw.at - tw.trigger - 20;
    Wreckage.update(1 / 120);
    const standing = tw.t < 0;
    Player.s = tw.at - tw.trigger;
    for (let i = 0; i < 120 * (W.towerFall + 0.5); i++) Wreckage.update(1 / 120);
    check(standing && tw.down && T().bend(tw.at + 100) < -0.005, `the control tower stands until the player is ${tw.trigger} m from the turn onto the runway, then comes down across the old road`);
    Game.toMenu();
  }

  section('Construction Site: mud, dancing portaloos, machinery');
  {
    const { Machinery } = await load('/src/delivery/machinery.js');
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'construction'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const T = () => track.Track, L = levels.LEVEL, R = CONFIG.railCrossing;
    // sparse traffic, pickups and minivans (passing through the obstacles, as on any level)
    const live = Traffic.cars.filter(c => c.active);
    check(live.length > 0 && live.length <= L.trafficCount && live.every(c => c.kind === 'pickup' || c.kind === 'minivan'),
      `sparse traffic: ${live.length} vehicles, pickups and minivans`);
    // mud: a car in it is held to what a railway track holds it to
    const topIn = (s) => {
      Game.start();
      for (const o of Collision.obstacles) o.gone = true;
      Object.assign(Player, { s, lat: T().laneOffset(1, s), speed: 30, launching: false, shield: 0 });
      for (let i = 0; i < 120 * 2; i++) Player.update(1 / 120, 1, 0, false);
      return Player.speed;
    };
    const mud = L.mud[0], inMud = topIn(mud.from + 5), onRoad = topIn(mud.from - 120);
    const want = cars.CAR.maxSpeed * (R.slowest + (1 - R.slowest) * cars.CAR.crossing);
    check(T().muddy(mud.from + 5) && !T().muddy(mud.from - 120) && Math.abs(inMud - want) < 0.3 && Math.abs(onRoad - cars.CAR.maxSpeed) < 0.3,
      `${L.mud.length} stretches of mud: the hatchback held to ${inMud.toFixed(1)} m/s in it (as on a railway track), ${onRoad.toFixed(1)} on the road`);
    // the portaloos dance in step: every one in a row together, each dance moving them its own way
    Game.start();
    const rows = {};
    for (const o of Collision.obstacles) if (o.dance) (rows[o.row] ||= []).push(o);
    const moves = {};
    let inStep = true;
    for (let i = 0; i < 120 * 8; i++) {
      Collision.updateObstacles(1 / 120);
      for (const row of Object.values(rows)) {
        const d = row[0].dance, m = (moves[d] ||= { h: 0, lat: 0, s: 0 });
        for (const o of row) {
          m.h = Math.max(m.h, o.h);
          m.lat = Math.max(m.lat, Math.abs(o.lat - o.lat0));
          m.s = Math.max(m.s, Math.abs(o.s - o.s0));
        }
        if (d === 'hop' && row.some(o => Math.abs(o.h - row[0].h) > 1e-9)) inStep = false;
      }
    }
    const P = CONFIG.potties;
    check(inStep && moves.hop.h > Player.height + 1 && moves.wave.h > Player.height && moves.slide.lat > P.slide * 0.9 &&
      moves.shuffle.lat > P.slide * 0.9 && moves.stomp.lat > P.slide * 0.9 && moves.stomp.h > 1 && moves.spin.s > 3,
      `${Object.keys(rows).length} rows of dancing portaloos: hopping together (up to ${moves.hop.h.toFixed(1)} m), in a wave, sliding, ` +
      `shuffling, stomping a lane over and spinning round`);
    // up in the air a portaloo is driven under; down, it is hit and bursts
    const hopper = Object.values(rows).find(r => r[0].dance === 'hop')[0];
    const under = (up) => {
      Game.start();
      for (const o of Collision.obstacles) if (o !== hopper) o.gone = true;
      let t = 0;
      while ((up ? hopper.h < Player.height + 0.5 : hopper.h > 0) && t < 10) { Collision.updateObstacles(1 / 120); t += 1 / 120; }
      Object.assign(Player, { s: hopper.s, lat: hopper.lat, speed: 20, shield: 0, ghost: 0, health: Player.maxHealth });
      Collision.check();
      FxQueue.length = 0;
      return !hopper.gone;
    };
    check(under(true) && !under(false), 'a portaloo hopping above the car is driven under; one down on the road is hit, and bursts');
    // machinery: it crosses the road and back; and like any obstacle, the car touching one blows it
    // up, at a cost, and it is gone
    Game.start();
    for (const o of Collision.obstacles) o.gone = true;
    const m = Machinery.list.find(x => x.mode === 'cross'), M = CONFIG.machinery;
    const lats = [];
    // (for as long as it takes it to have been off both sides: it starts off either way, and rests a while of its own choosing at each)
    let leftmost = Infinity, rightmost = -Infinity;
    for (let i = 0; i < 120 * 120 && !(leftmost < T().lo(m.s) && rightmost > T().hi(m.s)); i++) {
      Machinery.update(1 / 120);
      lats.push(m.lat);
      leftmost = Math.min(leftmost, m.lat); rightmost = Math.max(rightmost, m.lat);
    }
    const crosses = leftmost < T().lo(m.s) && rightmost > T().hi(m.s);
    Object.assign(m, { lat: T().laneOffset(1, m.s), rest: 99 });
    Object.assign(Player, { s: m.s - 20, lat: T().laneOffset(1, m.s), speed: 20, launching: false, shield: 0, ghost: 0 });
    const hp = Player.health;
    let fast = 0;
    for (let i = 0; i < 120 * 2; i++) {
      Player.update(1 / 120, 1, 0, false);
      Machinery.update(1 / 120);
      FxQueue.length = 0;
      if (m.gone && !fast) fast = Player.speed;
    }
    check(crosses && m.gone && Player.active && Math.abs(hp - Player.health - M.damage) < 1e-6 && fast > 8,
      `${Machinery.list.length} machines at work; one crossing the road blows up as the car hits it, costing ${M.damage} health, and the car drives on` +
      (crosses && m.gone && Player.active && Math.abs(hp - Player.health - M.damage) < 1e-6 && fast > 8 ? ''
        : ` [crosses ${crosses} (lat ${Math.min(...lats).toFixed(1)} to ${Math.max(...lats).toFixed(1)}, road ${T().lo(m.s).toFixed(1)} to ${T().hi(m.s).toFixed(1)}), gone ${m.gone}, active ${Player.active}, cost ${(hp - Player.health).toFixed(1)}, speed after ${fast.toFixed(1)}]`));
    Game.toMenu();
  }

  section('rockfall comes from uphill');
  {
    // on every level with rockfall: where the road runs beside another stretch of itself (a switchback), the rocks
    // come down from the side of the higher one, never off the lower one, where they would hang in the air
    const wrong = [];
    for (const level of levels.LEVELS.filter(l => l.rockfall)) {
      levels.selectLevel(levels.LEVELS.indexOf(level));
      Game.start();
      const T = track.Track, p = {}, q = {}, w = {};
      // (the rise to the nearest other stretch of road 25 m off that side, if there is one within 30 m of the point)
      const rise = (s, side) => {
        T.toWorld(s, 0, p);
        T.toWorld(s, (side < 0 ? T.lo(s) : T.hi(s)) + side * 25, q);
        let best = 30, y = null;
        for (let t = 0; t < T.length; t += 2) {
          if (Math.abs(t - s) < 60) continue;
          T.toWorld(t, 0, w);
          const d = Math.hypot(w.x - q.x, w.z - q.z);
          if (d < best) { best = d; y = w.y - p.y; }
        }
        return y;
      };
      for (const r of level.rockfall) {
        const side = r.side === 'left' ? -1 : 1;
        for (const s of [r.from, (r.from + r.to) / 2, r.to]) {
          const up = rise(s, side), other = rise(s, -side);
          if ((up !== null && up < -5) || (other !== null && other > 10 && (up === null || up < other))) wrong.push(`${level.id} at ${s}`);
        }
      }
    }
    check(wrong.length === 0, `rockfall comes down from the uphill side of the road` + (wrong.length ? `: not at ${wrong.join(', ')}` : ''));
  }

  section('Mountain Pass: no police at the stop / go works; vans never evil');
  {
    // the works and 300 m either side are kept clear of police: they only come in zones round it, and one
    // reaching a zone's edge stays there, on station. A ghost drives the whole level, the clock held
    const level = levels.LEVELS.find(l => l.id === 'mountain-pass'), [z] = level.stopGo;
    levels.selectLevel(levels.LEVELS.indexOf(level));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    let inside = 0, police = 0, vans = 0, evilVans = 0;
    const seen = new Set();
    for (let i = 0; i < 120 * 400 && Game.state === 'playing'; i++) {
      Object.assign(Player, { ghost: 99, health: Player.maxHealth });
      Game.busts = 0; Game.time = 0;
      Game.update(1 / 120);
      FxQueue.length = 0;
      for (const c of Traffic.cars) {
        if (!c.active) { seen.delete(c); continue; }
        if (c.kind === 'police') {
          if (!seen.has(c)) police++;
          if (c.s > z.from - 300 && c.s < z.to + 300) inside++;
        }
        if (c.kind === 'van' && !seen.has(c)) { vans++; if (c.evil) evilVans++; }
        seen.add(c);
      }
    }
    // (and vans, anywhere: a level with plenty of them)
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'big-business'));
    for (let k = 0; k < 6; k++) {
      Game.start();
      for (const c of Traffic.cars) if (c.active && c.kind === 'van') { vans++; if (c.evil) evilVans++; }
    }
    check(Game.outcome !== undefined && police > 0 && inside === 0 && vans > 5 && evilVans === 0,
      `no police within 300 m of Mountain Pass's stop / go works (${police} police cars about over the run); ${vans} vans, none of them evil`);
  }

  section('Outback Express: every train timed to the player');
  {
    // driving the level at a steady 25 m/s (a ghost: the train passes through), each crossing's train reaches the
    // road within CONFIG.crossing.timing of when the player does
    const { Crossings } = await load('/src/delivery/crossing.js');
    const X = CONFIG.crossing;
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'outback-express'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    const meet = Crossings.list.map(() => ({ player: null, train: null }));
    let t = 0;
    for (let i = 0; i < 120 * 260 && Game.state === 'playing'; i++, t += 1 / 120) {
      Object.assign(Player, { speed: 25, ghost: 99, health: Player.maxHealth });
      Game.busts = 0; Game.time = 0;
      Game.update(1 / 120);
      FxQueue.length = 0;
      Crossings.list.forEach((c, k) => {
        if (meet[k].player === null && Player.s >= c.s) meet[k].player = t;
        if (meet[k].train === null && c.state === 'train' && c.train * c.dir >= 0) meet[k].train = t;
      });
    }
    const gaps = meet.map(m => m.train - m.player);
    check(gaps.length === levels.LEVEL.crossings.length && gaps.length >= 3 && gaps.every(g => Number.isFinite(g) && g >= X.timing.min - 0.3 && g <= X.timing.max + 0.3),
      `Outback Express: at 90 km/h each crossing's train reaches the road ${gaps.map(g => (g >= 0 ? '+' : '') + g.toFixed(1) + ' s').join(', ')} from the player (${X.timing.min} to +${X.timing.max} s)`);
  }

  section('quiet zones: less traffic on the narrow cliff road');
  {
    // Tour de Coast's cliff road (one lane each way, no shoulder): driven through by a ghost with
    // its quiet zone, and again without it; the cars about on the bridge stretch while the player is on it, counted
    const level = levels.LEVELS.find(l => l.id === 'tour-de-coast'), zone = level.quietZones[0], zones = level.quietZones;
    const onBridge = (quiet) => {
      level.quietZones = quiet ? zones : [];
      levels.selectLevel(levels.LEVELS.indexOf(level));
      cars.selectCar('commuter');
      Game.evil = false;
      Game.start();
      Object.assign(Player, { s: zone.from - 900, speed: 25 });
      let total = 0, samples = 0;
      for (let i = 0; i < 120 * 70 && Player.s < zone.to; i++) {
        Object.assign(Player, { ghost: 99, health: Player.maxHealth });
        Game.busts = 0; Game.time = 0;
        Game.update(1 / 120);
        FxQueue.length = 0;
        if (Player.s > zone.from && i % 30 === 0) {
          total += Traffic.cars.filter(c => c.active && c.s > zone.from && c.s < zone.to).length;
          samples++;
        }
      }
      return total / Math.max(1, samples);
    };
    let quiet = 0, busy = 0;
    for (let k = 0; k < 6; k++) { quiet += onBridge(true); busy += onBridge(false); }
    level.quietZones = zones;
    check(quiet < busy * 0.75,
      `quiet zones: on Tour de Coast's cliff road ${(quiet / 6).toFixed(1)} cars about on average, against ${(busy / 6).toFixed(1)} without its quiet zone (density ${zone.density})`);
  }

  section('grudges, chasing and blocking');
  {
    // Back Roads (two-way): one evil car about, nothing else, the player held still at 600 m in its own lane
    const T = () => track.Track;
    levels.selectLevel(levels.LEVELS.findIndex(l => l.id === 'back-roads'));
    cars.selectCar('commuter');
    Game.evil = false;
    Game.start();
    for (const c of Traffic.cars) Object.assign(c, { active: false, unused: true });
    const [first, last] = T().laneRange(1, 600), [, oncomingLast] = T().laneRange(-1, 600);
    const car = Traffic.cars[0], type = CONFIG.vehicles.commuter;
    Object.assign(car, { active: true, unused: false, kind: 'commuter', dir: 1, bound: 'north', fixed: false, parked: false, emergency: false, racer: false,
      procession: 0, junction: null, s: 600, lane: first, lat: T().laneOffset(first, 600), vs: 15, baseSpeed: 15, latVel: 0, yaw: 0, yawVel: 0,
      stun: 0, spin: 0, wobble: 0, toad: null, arrest: -1, think: 99, rival: null, pendingLane: null, pulledOver: false, evil: true, mood: 0,
      emotion: 'neutral', hesitant: false, tap: 0, hw: type.hw, hl: type.hl, height: type.height, mass: type.mass, health: type.health, maxHealth: type.health });
    // a grudge wears off CONFIG.grudgeTime s after the last upset
    car.grudge = CONFIG.grudgeTime;
    const hold = (lane) => Object.assign(Player, { s: car.s, lat: T().laneOffset(lane, car.s), speed: car.vs, ghost: 99, launching: false });
    let at = null;
    for (let i = 0; i < 120 * (CONFIG.grudgeTime + 1); i++) {
      hold(last);
      Game.update(1 / 120);
      FxQueue.length = 0;
      if (at === null && !(car.grudge > 0)) at = i / 120;
    }
    // chasing: a car out to get the player (here, a jerk's mystery) steers at it alongside, but never over
    // the centre line after it into the oncoming lanes
    let furthest = -Infinity;
    for (let i = 0; i < 120 * 4; i++) {
      Object.assign(Player, { mystery: 'jerk', mysteryTime: 9 });
      hold(oncomingLast);
      Game.update(1 / 120);
      FxQueue.length = 0;
      // (how far past its own lane's centre it has come, towards the oncoming side)
      const toward = Math.sign(T().laneOffset(oncomingLast, car.s) - T().laneOffset(first, car.s));
      if (car.active) furthest = Math.max(furthest, (car.lat - T().laneOffset(first, car.s)) * toward);
    }
    Object.assign(Player, { mystery: '', mysteryTime: 0 });
    check(at !== null && Math.abs(at - CONFIG.grudgeTime) < 0.05 && furthest < 0.3,
      `a grudge wears off ${at?.toFixed(2)} s after the last upset; a car chasing the player alongside in the oncoming lane stays on its own side (at most ${furthest.toFixed(2)} m past its lane's centre towards it)`);
    // blocking: a smug driver (evil, happy, the player good) a lane over moves into the player's lane in front of
    // it only with room enough ahead for the player's speed (CONFIG.blocking), and not from too far ahead either
    const B = CONFIG.blocking, own = T().laneRange(1, 600), chance = CONFIG.laneChangeChance;
    CONFIG.laneChangeChance = 0; // (no lane changes on a whim, only its moves at the player)
    const blocks = (ahead, speed) => {
      Game.start();
      for (const c of Traffic.cars) Object.assign(c, { active: false, unused: true });
      Object.assign(car, { active: true, unused: false, s: 600 + ahead, lane: own[0], lat: T().laneOffset(own[0], 600 + ahead), vs: speed, baseSpeed: speed,
        kind: 'commuter', fixed: false, parked: false, emergency: false, racer: false, procession: 0, junction: null, // (whatever its slot was dealt on the restart)
        mood: 0.9, emotion: 'happy', evil: true, grudge: 0, blockedPlayer: false, rival: null, hunt: 0, pendingLane: null, think: 0, stun: 0, spin: 0, wobble: 0 });
      let moved = false;
      for (let i = 0; i < 120 * 4 && !moved; i++) {
        Object.assign(Player, { s: car.s - ahead, lat: T().laneOffset(own[1], car.s - ahead), speed, ghost: 99, launching: false, mystery: '', mysteryTime: 0 });
        car.vs = speed; car.s = Player.s + ahead;
        Game.update(1 / 120);
        FxQueue.length = 0;
        moved = car.lane === own[1];
      }
      return moved;
    };
    const room = (speed) => Math.max(B.min, speed * B.headway) + car.hl + Player.hl; // (nose to tail, centre to centre)
    // shadowing: once in the player's way, a driver with no grudge stays put when the player moves over again;
    // one holding a grudge follows it over
    const follows = (grudge) => {
      const ahead = room(15) + 5;
      if (!blocks(ahead, 15)) return null;
      let moved = false;
      for (let i = 0; i < 120 * 6 && !moved; i++) {
        Object.assign(Player, { s: car.s - ahead, lat: T().laneOffset(own[0], car.s - ahead), speed: 15, ghost: 99, launching: false });
        car.vs = 15; car.s = Player.s + ahead; car.grudge = grudge;
        Game.update(1 / 120);
        FxQueue.length = 0;
        moved = car.lane === own[0];
      }
      return moved;
    };
    // (the calm one with a lane change on a whim at every turn: it never wanders back into the player's way either)
    CONFIG.laneChangeChance = 1;
    const calm = follows(0);
    CONFIG.laneChangeChance = 0;
    const shadow = { calm, grudge: follows(CONFIG.grudgeTime) };
    const cases = { slowNear: blocks(room(10) + 3, 10), fastNear: blocks(room(10) + 3, 30), fastFar: blocks(room(30) + 3, 30), tooFar: blocks(room(30) + B.window + 15, 30) };
    CONFIG.laneChangeChance = chance;
    check(shadow.calm === false && shadow.grudge === true,
      `shadowing: a driver with no grudge blocks the player once and never moves back into its way (even changing lanes at every turn); one holding a grudge follows it over [${JSON.stringify(shadow)}]`);
    check(cases.slowNear && !cases.fastNear && cases.fastFar && !cases.tooFar,
      `blocking: a smug driver ${room(10).toFixed(0)}+ m ahead moves into the player's lane at 36 km/h, but not that close at 108 km/h; ` +
      `there it waits for ${room(30).toFixed(0)}+ m, and from ${(room(30) + B.window).toFixed(0)}+ m it doesn't bother [${JSON.stringify(cases)}]`);
  }

  section('cars');
  levels.selectLevel(0); // (a level with no vehicle of its own)
  for (const car of cars.CARS) {
    cars.selectCar(car.id);
    Game.evil = false;
    Game.start();
    let top = 0;
    for (let i = 0; i < 120 * 12; i++) { // an empty road, flat out
      for (const c of Traffic.cars) c.active = false;
      for (const o of Collision.obstacles) o.gone = true;
      Game.update(1 / 120);
      FxQueue.length = 0;
      top = Math.max(top, Player.speed);
    }
    const wantTop = car.tank ? CONFIG.tankMaxSpeed : car.maxSpeed;
    check(cars.CAR === car && Player.maxHealth === car.health && Player.hl === car.hl &&
      Math.abs(top - wantTop) < 0.5 && (Player.tank > 0) === !!car.tank,
      `${car.name}: in use straight away (health ${Player.maxHealth}, top speed ${top.toFixed(1)} m/s, tank: ${Player.tank > 0})`);
  }
  cars.selectCar('commuter');
  // the secret bus: not in the garage, but once owned it is driven like any other car
  Progress.buy(cars.SECRET_CARS.bus);
  cars.selectCar('bus');
  Game.start();
  check(!cars.CARS.some(car => car.id === 'bus') && cars.CAR === cars.SECRET_CARS.bus && Player.hl === 5.5 && Player.maxHealth === 220,
    `the secret City Bus: not in the garage, but in use once owned (hitbox ${Player.hl * 2} m long, health ${Player.maxHealth})`);
  cars.selectCar('commuter');
  // the Blue Star cars: kept out of the garage until level CONFIG.blueStarsAfter is delivered (opening the next)
  {
    const blue = cars.CARS.filter(car => car.blue), saved = Progress.data.unlocked;
    Progress.data.unlocked = CONFIG.blueStarsAfter;
    const shut = cars.garageCars();
    Progress.data.unlocked = CONFIG.blueStarsAfter + 1;
    const open = cars.garageCars();
    Progress.data.unlocked = saved;
    check(blue.length > 0 && !shut.some(car => car.blue) && blue.every(car => open.includes(car)) && open.length === cars.CARS.length,
      `the ${blue.length} Blue Star cars: out of the garage until level ${CONFIG.blueStarsAfter} is delivered (${shut.length} cars), then in it (${open.length})`);
  }
  // a complete savegame: every level open and delivered, every car bought, a full bank
  Progress.reset();
  Progress.complete({ levels: levels.LEVELS.length, cars: cars.CARS.map(car => car.id), money: CONFIG.completeBank });
  check(Progress.data.unlocked === levels.LEVELS.length && cars.CARS.every(car => Progress.owns(car.id)) &&
    !Progress.owns('bus') && Progress.data.money === CONFIG.completeBank && Progress.bestTime('expressway', false) === undefined,
    `a complete savegame: ${Progress.data.unlocked} levels open, ${Progress.data.cars.length} cars owned, $${Progress.data.money} banked, the bus still secret`);
} catch (error) {
  if (error !== 'levels only') { // (thrown to end a --levels run early)
    failures++;
    console.error(error);
  }
} finally {
  await server.close();
}
section(null);
console.log(`${QUICK ? 'quick run' : 'full run'}, ${((Date.now() - started) / 1000).toFixed(0)} s`);
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
