// A check of ghost traffic (a level's "ghostTraffic", CONFIG.ghostTraffic; traffic.js ghostMark / phantomState / phantomPass,
// collision.js). Headless. What it holds the gimmick to:
//   - a ghost car is dealt only inside a stretch, only of the kinds allowed, and in bounds (density) over a long run; none on a level
//     without the field; and the same run twice deals the same cars
//   - the phases: ghost, then a flicker of CONFIG.ghostTraffic.flicker s ('warn'), then solid for the last solidShare of its cycle
//   - GHOSTLY (ghost and warn) it is intangible: the player driving through it takes no damage and the car is untouched;
//     SOLID it is a car like any other (the hit costs what it costs); one turning solid on top of something stays ghostly until clear
//   - nothing targets or wrecks a ghostly car (a thrown gift, the horn, ...), and the same thing does reach it once it is solid
//   - driving through it upsets it once a pass (upsetUntil, one honk), the solid phase comes sooner but the warning flicker is whole
//   node scripts/.ghosttraffic-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const G = g.CONFIG.ghostTraffic;
  const level = g.select('haunted-hollow');
  const stretches = level.ghostTraffic || [];
  check(stretches.length >= 2, `haunted-hollow has ${stretches.length} ghost traffic stretches`);
  const inStretch = (s) => stretches.some(z => s >= z.from - 40 && s <= z.to + 400); // (dealt inside, then drives on a while: cars are dealt ahead of the player and drive off)
  const { seedRandom } = await g.load('util.js');
  const { Targets } = await g.load('pickups.js');
  const { Packages } = await g.load('packages.js');
  const Traffic = g.Traffic, Collision = g.Collision, Player = g.Player, Game = g.Game;

  // ---- dealt: bounds, kinds, determinism
  const dealt = () => {
    g.select('haunted-hollow');
    Game.evil = false; Game.loaded = null; Game.nextSeed = 7; Game.nextLoadSeed = 9; Game.start();
    Player.testGhost = true;
    g.drive(1, 0);
    const seen = new Map();
    g.run(150, () => { for (const [i, c] of Traffic.cars.entries()) if (c.active && c.phantom && !seen.has(i + ':' + c.kind + ':' + Math.round(c.baseSpeed * 100))) seen.set(i + ':' + c.kind + ':' + Math.round(c.baseSpeed * 100), { kind: c.kind, s: c.s, cycle: c.phantom.cycle, offset: c.phantom.offset }); return Game.state !== 'playing'; });
    return seen;
  };
  const one = dealt();
  const kinds = [...one.values()].map(x => x.kind);
  check(one.size > 0, `a run deals ghost cars (${one.size} seen in 150 s)`);
  check(kinds.every(k => G.kinds.includes(k)), 'every ghost car is of an allowed kind: ' + [...new Set(kinds)].join(' '));
  check([...one.values()].every(x => inStretch(x.s)), 'every ghost car is on or near a stretch when seen');
  check(one.size < 60, `density is bounded (${one.size} ghost cars in the run, not every car)`);
  const two = dealt();
    check(JSON.stringify([...one].map(([k, x]) => [k, x.kind, x.cycle, x.offset])) === JSON.stringify([...two].map(([k, x]) => [k, x.kind, x.cycle, x.offset])), 'the same run twice deals the same ghost cars, phases and all');
  g.select('fallout'); seedRandom(7); Game.evil = false; Game.start(); Player.testGhost = true; g.drive(1, 0);
  let other = 0; g.run(40, () => { other += Traffic.cars.filter(c => c.active && c.phantom).length; return Game.state !== 'playing'; });
  check(other === 0, 'a level with no ghostTraffic has no ghost cars');

  // ---- the mechanics, by hand: a lone car on the player
  g.select('haunted-hollow'); seedRandom(7); Game.evil = false; Game.start();
  Player.testGhost = false; Player.ghost = 0; Player.shield = 0;
  g.drive(0, 0);
  const car = Traffic.cars[0];
  const reset = () => {
    for (const c of Traffic.cars) c.active = false;
    Targets.items.length = 0;
    Traffic.outfit(car, 'commuter', 2);
    car.dir = 1; car.vs = 0; car.baseSpeed = 0; car.evil = true; car.emotion = 'neutral'; car.honkWait = 0; car.health = car.maxHealth;
    car.s = Player.s + 0.5; car.lat = Player.lat; car.active = true;
    Player.health = 100; Player.shield = 0; Player.ghost = 0; Player.air = 0; Player.active = true; Player.busted = false;
  };
  // (the phase the car is in right now, set by moving its offset: state 'ghost' | 'warn' | 'solid', `into` s into it)
  const phase = (state, into = 0.1) => {
    const cycle = 8, from = cycle * (1 - G.solidShare);
    const u = state === 'solid' ? from + into : state === 'warn' ? from - G.flicker + into : Math.min(into, from - G.flicker - 0.5);
    car.phantom = { cycle, offset: ((u - Game.time) % cycle + cycle) % cycle, live: false, touching: false, upsetUntil: -1, honked: false };
  };
  const hit = () => { const before = Player.health, cb = car.health; Collision.check(); return { player: before - Player.health, car: cb - car.health }; };

  reset(); phase('ghost');
  check(Traffic.phantomState(car) === 'ghost' && Traffic.ghostly(car), 'phase: ghost, ghostly');
  let r = hit();
  check(r.player === 0 && r.car === 0 && car.vs === 0, 'ghostly: the player drives through it with no damage to either, and no knock');
  reset(); phase('warn');
  check(Traffic.phantomState(car) === 'warn' && Traffic.ghostly(car), 'phase: warn (the flicker) is still ghostly');
  r = hit();
  check(r.player === 0 && r.car === 0, 'the warning flicker is intangible too: no damage');
  // the warning is a flicker of the length in CONFIG before the solid phase
  phase('ghost');
  const states = [];
  for (let t = 0; t < 8; t += 0.01) { Game.time += 0.01; states.push(Traffic.phantomState(car)); }
  const first = (s) => states.indexOf(s) * 0.01, lastWarn = states.lastIndexOf('warn') * 0.01;
  check(Math.abs((first('solid') - first('warn')) - G.flicker) < 0.03 && states.indexOf('warn') < states.indexOf('solid'), `the flicker comes before the solid phase and lasts ${G.flicker} s`);
  check(Math.abs((8 - first('solid')) / 8 - G.solidShare) < 0.02 && lastWarn < first('solid'), `the solid phase is the last ${G.solidShare * 100}% of the cycle`);
  Player.speed = 20;
  reset(); phase('solid');
  car.s = Player.s + 6; // (clear when it turns solid)
  Collision.check();
  check(car.phantom.live && !Traffic.ghostly(car), 'solid and clear: it is live, not ghostly');
  car.s = Player.s + 0.5;
  r = hit();
  check(r.player > 0, `solid: it is a car like any other, the hit costs the player ${r.player}`);
  reset(); phase('solid'); // (turned solid on top of the player)
  r = hit();
  check(r.player === 0 && !car.phantom.live && Traffic.ghostly(car), 'turned solid while overlapping: it stays ghostly (no hit) until clear');
  car.s = Player.s + 8; Collision.check();
  check(car.phantom.live, '...and is live once it is clear');

  // ---- targeting: nothing aims at a ghostly car; the same car solid is a target
  const gift = () => { Packages.reset?.(); Player.evil = false; Player.active = true; Player.busted = false; Player.butterfingers = 0; Player.tank = 0; Player.vs = 0; Player.speed = 0; Packages.update(1); Packages.throwOne(); return Packages.list.filter(p => p.active); };
  reset(); phase('ghost'); car.s = Player.s + 20; car.evil = false;
  let thrown = gift();
  check(thrown.length === 1 && thrown[0].endH !== car.height, 'a thrown gift ignores a ghostly car (goes to the ground ahead)');
  reset(); phase('solid'); car.s = Player.s + 20; car.evil = false; car.phantom.live = true;
  Packages.update(1);
  thrown = gift();
  check(thrown.length === 1 && thrown[0].endH === car.height, 'the same car solid is thrown at');
  reset(); phase('ghost'); car.s = Player.s + 20; car.evil = true; car.honkWait = 0;
  Traffic.hornedAt();
  check(car.honkWait === 0, 'the horn does not reach a ghostly car (an evil one ahead does not honk back)');
  reset(); phase('solid'); car.s = Player.s + 20; car.evil = true; car.honkWait = 0; car.phantom.live = true;
  Traffic.hornedAt();
  check(car.honkWait > 0, '...but a solid one is honked back from');
  // every system that picks traffic out leaves a ghostly car alone (the others read from the source: each line carries the test)
  const systems = { 'packages.js': 7, 'bullettrain.js': 1, 'crossing.js': 1, 'hazards.js': 1, 'wreckage.js': 1, 'hippos.js': 1, 'ufostrike.js': 2, 'radiation.js': 2, 'mysteries.js': 1, 'player.js': 1, 'collision.js': 1, 'traffic.js': 1 };
  for (const [file, n] of Object.entries(systems)) {
    const count = (readFileSync('src/delivery/' + file, 'utf8').match(/(?:Traffic\.)?ghostly\(/g) || []).length;
    check(count >= n, `${file} skips ghostly cars where it targets or wrecks traffic (${count} of at least ${n} places)`);
  }

  // ---- upset: once a pass, a honk, a sooner solid phase with its warning whole
  reset(); phase('ghost', 0.5);
  const warnAt = (c) => { const u = (Game.time + c.phantom.offset) % c.phantom.cycle; return (c.phantom.cycle * (1 - G.solidShare) - G.flicker) - u; };
  const wait0 = warnAt(car);
  car.honkWait = 0;
  Collision.check();
  const p = car.phantom;
  check(p.upsetUntil > Game.time && Math.abs(p.upsetUntil - Game.time - G.upsetTime) < 0.01 && Traffic.upset(car), `driving through it upsets it for ${G.upsetTime} s`);
  check(p.honked && car.honkWait > 0, 'it honks (once)');
  const wait1 = warnAt(car), offset1 = p.offset;
  check(wait1 < wait0 && wait0 - wait1 <= G.upsetSooner.max + 1e-6 && wait1 >= -1e-6, `its solid phase comes sooner (${wait0.toFixed(2)} s to the flicker, now ${wait1.toFixed(2)})`);
  const states2 = [], T0 = Game.time;
  for (let t = 0; t < 8; t += 0.01) { Game.time = T0 + t; states2.push(Traffic.phantomState(car)); }
  Game.time = T0;
  const a = states2.indexOf('warn'), b = states2.indexOf('solid');
  check(a >= 0 && b > a && Math.abs((b - a) * 0.01 - G.flicker) < 0.03, 'the warning flicker is still whole after it was brought forward');
  for (let i = 0; i < 20; i++) Collision.check();
  check(p.offset === offset1, 'staying inside it does not upset it again (once a pass)');
  car.s = Player.s + 15; Collision.check(); car.s = Player.s + 0.5; Collision.check();
  check(p.offset === offset1, 'a second pass while it is still upset does not move it again either');
  reset(); phase('ghost', 0.5);
  Collision.check();
  const until = car.phantom.upsetUntil;
  Game.time += G.upsetTime + 0.5; car.s = Player.s + 15; Collision.check(); car.s = Player.s + 0.5;
  car.phantom.offset = ((car.phantom.offset - G.upsetTime - 0.5) % car.phantom.cycle + car.phantom.cycle) % car.phantom.cycle; // (the clock moved on: the phase stays where it was)
  Collision.check();
  check(car.phantom.upsetUntil > until, 'a new pass after it has calmed down upsets it again');
  const mid = car.phantom.offset;
  reset(); phase('solid');
  car.s = Player.s + 15; Collision.check(); car.s = Player.s + 0.5; Collision.check();
  check(!(car.phantom.upsetUntil > Game.time), 'a solid car is not upset by anything (it is hit, not driven through)');
  void mid;
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
g.close?.();
process.exit(failures ? 1 : 0);
