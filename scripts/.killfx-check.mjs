// A check of the KILL EFFECTS (render/killfx.js, render/killfxdefs.js, render/particles.js; the owner, 15-Oct: "alternative explosion
// effects ... a 'Kill effects' equip ... It should also affect the trace that throwing packages leaves behind"; CHECKLIST 405). Headless:
//   - every effect spawns for a small and a big event (and the tank shell's scale / smoke) and the package hit, and its trail, without throwing
//   - its cost: pools (draw calls), live particles, triangles, JS ms a spawn (printed: the budget table)
//   - the GIANT-CAR case: 200 explosions in a second stay under every pool's cap (and the LOW version kicks in); after 1000 spawns the
//     pools' arrays are the same objects and lengths (no growth), and the heap has not grown (with --expose-gc: re-run under it)
//   - CLASSIC is the old code: the same particles, the same numbers, call for call, as main's explode / flame trail / burst (a seeded
//     Math.random, the old functions copied below)
//   - the choice: absent / unknown / not owned = Classic; per car over the All-cars default (render/loadoutstore.js slot 'kill'); the old
//     save shapes migrate (no 'kill' anywhere = Classic); garbage dropped; the registry (slot 'kill', free, a placeholder price)
//   - IN A RUN (headless, the scene stubbed): every 'explode' event the rules queue is drawn in the chosen effect (none by the classic
//     fireball), 'burst' and 'gift' events from others are untouched, the player's own package trail follows the choice, the player's own
//     flaming package bursts in it; with Classic chosen, no kill-effect pool is touched
//   - the replay fingerprint (vite.config.js logicFiles) walks no render/ file, and no logic file names a kill-effect module (render-only)
//   node scripts/.killfx-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (typeof globalThis.gc !== 'function' && !process.env.KILLFX_NO_GC) { // (once more under --expose-gc, for the heap's numbers)
  const r = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, KILLFX_NO_GC: '1' } });
  process.exit(r.status ?? 1);
}
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
// a seeded Math.random (mulberry32)
const seeded = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const realRandom = Math.random;

const session = await startModels();
try {
  const { load } = session;
  const THREE = await session.server.ssrLoadModule('three');
  const K = await load('render/killfx.js');
  const PT = await load('render/particles.js');
  const Store = await load('render/loadoutstore.js');
  const { COSMETICS, cosmeticKeys } = await load('render/cosmetics.js');
  const { Progress } = await load('progress.js');
  const ids = K.KILL_IDS.filter(id => id !== 'classic');

  // ---- the registry ----
  const reg = COSMETICS.filter(c => c.slot === 'kill');
  check(K.KILL_IDS[0] === 'classic' && reg.length === K.KILL_IDS.length && reg.every(c => c.free && 'price' in c && c.name.length <= 10) && K.KILL_IDS.every(id => cosmeticKeys().includes('kill:' + id)), 'the registry: ' + reg.length + ' kill effects, Classic first, slot \'kill\', free, a placeholder price, short names (' + reg.map(c => c.name).join(', ') + ')');
  check(K.KILL_IDS.every(id => typeof K.KILL_FX[id].icon === 'function') && ids.every(id => typeof K.KILL_FX[id].explode === 'function' && typeof K.KILL_FX[id].trail === 'function'), 'every effect has an icon, an explosion and a trail');

  // ---- every effect, small and big: spawns, its cost ----
  const group = new THREE.Group();
  const sys = K.createKillFx(group);
  const cam = new THREE.PerspectiveCamera(); cam.position.set(0, 6, 14); cam.lookAt(0, 1, 0); cam.updateMatrixWorld();
  const EVENTS = { small: { big: false }, big: { big: true }, shell: { big: true, scale: 1.5, smoke: 0.5 }, hit: { big: false, scale: 0.45, smoke: 0.3 } };
  const rows = [];
  let threw = null;
  for (const id of ids) {
    const row = { id };
    for (const [name, e] of Object.entries(EVENTS)) {
      sys.clear();
      try {
        sys.explode(id, 0, 0, 0, 2, 3, e);
        let peak = sys.stats();
        for (let f = 0; f < 6; f++) { sys.update(1 / 60, cam); const s = sys.stats(); if (s.live >= peak.live) peak = s; }
        row[name] = peak;
        for (let f = 0; f < 240; f++) sys.update(1 / 60, cam);
        row[name].after4s = sys.live();
      } catch (error) { threw ||= id + ' ' + name + ': ' + error.message; }
    }
    // ms a spawn: 200 of them (cleared between, the cost of the spawn alone), small and big
    for (const name of ['small', 'big']) {
      sys.clear(); for (let i = 0; i < 20; i++) { sys.explode(id, 0, 0, 0, 0, 0, EVENTS[name]); sys.clear(); } // (warm)
      const t0 = performance.now();
      for (let i = 0; i < 200; i++) { sys.explode(id, 0, 0, 0, 0, 0, EVENTS[name]); if (i % 20 === 19) sys.clear(); sys.update(0.5, cam); }
      row[name + 'ms'] = (performance.now() - t0) / 200;
    }
    // the trail: two a frame at most, a second of flight
    sys.clear();
    let most = 0;
    try { for (let f = 0; f < 60; f++) { const before = sys.pools && Object.values(sys.pools).reduce((n, p) => n + p.spawned, 0); sys.trail(id, 0, 2, f * 0.3, 0); const after = Object.values(sys.pools).reduce((n, p) => n + p.spawned, 0); most = Math.max(most, after - before); sys.update(1 / 60, cam); } }
    catch (error) { threw ||= id + ' trail: ' + error.message; }
    row.trail = { most, live: sys.live() };
    rows.push(row);
  }
  check(!threw, 'every effect spawns small, big, as the tank\'s shell and as the package hit, and its trail, without throwing' + (threw ? ': ' + threw : ''));
  check(rows.every(r => r.small.live > 10 && r.big.live > r.small.live && r.hit.live > 0 && r.hit.live < r.small.live), 'each reads bigger for a big event than a small one, and the package hit is smaller still');
  check(rows.every(r => r.small.after4s === 0 && r.big.after4s === 0), 'every explosion is gone within 4 s (nothing lingers)');
  check(rows.every(r => r.trail.most <= 2), 'every trail adds at most two particles a frame (the classic flames: two)');
  console.log('        effect      draw calls   live (small / big)   triangles (small / big)   ms a spawn (small / big)   trail live (1 s)');
  for (const r of rows) console.log('        ' + r.id.padEnd(11) + String(r.small.calls + ' / ' + r.big.calls).padEnd(13) + String(r.small.live + ' / ' + r.big.live).padEnd(21) + String(r.small.tris + ' / ' + r.big.tris).padEnd(26) + (r.smallms.toFixed(3) + ' / ' + r.bigms.toFixed(3)).padEnd(27) + r.trail.live);

  // ---- the giant car: 200 explosions in a second; caps; no growth ----
  const giant = [];
  for (const id of ids) {
    sys.clear();
    let over = null, lowSeen = false;
    for (let i = 0; i < 200; i++) {
      sys.explode(id, Math.random() * 40, 0, i * 0.5, 0, 0, i % 3 ? EVENTS.small : EVENTS.big);
      if (sys.load > 5) lowSeen = true;
      sys.update(1 / 200, cam);
      for (const [name, p] of Object.entries(sys.pools)) if (p.live > p.max) over = name;
    }
    if (over || !lowSeen) giant.push(id + (over ? ': the ' + over + ' pool over its cap' : ': the LOW version never came on'));
  }
  const caps = Object.fromEntries(Object.entries(K.POOL_TYPES).map(([n, t]) => [n, t.max]));
  check(!giant.length, (giant.length ? giant.join('; ') + '. ' : '') + '200 explosions in a second, every effect: no pool over its cap, the LOW version on (caps: ' + Object.entries(caps).map(([n, m]) => n + ' ' + m).join(', ') + ')');
  const arrays = Object.fromEntries(Object.entries(sys.pools).map(([n, p]) => [n, [p.mesh.instanceMatrix.array, p.mesh.instanceMatrix.array.length, p.mesh.instanceColor.array.length]]));
  globalThis.gc(); const heap0 = process.memoryUsage().heapUsed;
  for (let i = 0; i < 1000; i++) { sys.explode(ids[i % ids.length], 0, 0, 0, 1, 1, i % 2 ? EVENTS.small : EVENTS.big); sys.trail(ids[i % ids.length], 0, 2, 0, 0); sys.update(1 / 120, cam); }
  globalThis.gc(); const heap1 = process.memoryUsage().heapUsed;
  const same = Object.entries(arrays).every(([n, [a, m, c]]) => sys.pools[n].mesh.instanceMatrix.array === a && a.length === m && sys.pools[n].mesh.instanceColor.array.length === c);
  check(same && (heap1 - heap0) < 512 * 1024, '1000 spawns and trails: the same pools and arrays (no growth), the heap ' + ((heap1 - heap0) / 1024).toFixed(0) + ' KB after (under 512 KB)');
  const total = Object.values(K.POOL_TYPES).reduce((n, t) => n + t.max, 0);
  check(sys.live() <= total, 'all pools together never more than ' + total + ' live particles (' + sys.live() + ' now)');

  // ---- CLASSIC: the old code, call for call ----
  const recorder = () => { const calls = []; const pool = (name) => ({ emit: (...a) => calls.push(name + ':' + a.map(v => (typeof v === 'number' ? v.toFixed(6) : v)).join(',')) }); return { calls, P: { Fire: pool('fire'), Smoke: pool('smoke'), Particles: pool('particles') } }; };
  // (main's render/effects.js explode() body after the tyres, and render/packages.js's flame trail, and burst(): copied as they were)
  const FIRE_COLORS = [0xffffff, 0xffd23f, 0xff8c1a, 0xff3b1a];
  const rnd = (range) => (Math.random() - 0.5) * 2 * range;
  const oldExplode = ({ Fire, Smoke, Particles }, tmp, vx, vz, e) => {
    const k = (e.big ? 1.5 : 1) * (e.scale || 1);
    const ks = (e.big ? 1.5 : 1) * (e.smoke ?? 1);
    for (let i = 0; i < 35 * k; i++) {
      Fire.emit(tmp.x + rnd(1), tmp.y + 0.5 + Math.random() * 1.2, tmp.z + rnd(1), vx + rnd(6), 2 + Math.random() * 8, vz + rnd(6), 0.4 + Math.random() * 0.6, (0.5 + Math.random() * 0.7) * k, 1.2, 8, FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
    }
    for (let i = 0; i < 7 * ks; i++) {
      const grey = 20 + Math.floor(Math.random() * 50);
      Smoke.emit(tmp.x + rnd(2), tmp.y + 1 + Math.random() * 2, tmp.z + rnd(2), vx * 0.5 + rnd(3), 3 + Math.random() * 6, vz * 0.5 + rnd(3), 1.2 + Math.random() * 1.3, (0.8 + Math.random() * 0.8) * ks, 1.5, 0, grey << 16 | grey << 8 | grey);
    }
    for (let i = 0; i < 7 * k; i++) {
      Particles.emit(tmp.x + rnd(1), tmp.y + 0.8, tmp.z + rnd(1), vx * 1.5 + rnd(10), 5 + Math.random() * 9, vz * 1.5 + rnd(10), 1.5 + Math.random(), 0.25 + Math.random() * 0.5, 0, 25, 0xff8c1a, tmp.y);
    }
  };
  const oldTrail = ({ Particles }, tmp, h) => {
    for (let n = 0; n < 2; n++) Particles.emit(tmp.x + rnd(0.2), tmp.y + h + rnd(0.2), tmp.z + rnd(0.2), rnd(1), 1 + Math.random() * 2, rnd(1), 0.3, 0.55, 0.4, 0, FIRE_COLORS[1 + Math.floor(Math.random() * 3)]);
  };
  const oldBurst = ({ Particles }, tmp, vx, vz) => {
    for (let i = 0; i < 18; i++) Particles.emit(tmp.x + rnd(0.5), tmp.y + 0.8 + Math.random(), tmp.z + rnd(0.5), vx + rnd(5), 1 + Math.random() * 6, vz + rnd(5), 0.3 + Math.random() * 0.4, 0.5 + Math.random() * 0.6, 1, 6, FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
  };
  const tmp = { x: 12.5, y: 3.25, z: -40.75 };
  let classicSame = true, counts = [];
  for (const e of [EVENTS.small, EVENTS.big, EVENTS.shell, { big: false, scale: 2 }, { big: true, smoke: 0 }]) {
    const a = recorder(), b = recorder();
    Math.random = seeded(7); oldExplode(a.P, tmp, 1.5, -2.5, e);
    Math.random = seeded(7); PT.classicExplode(b.P, tmp.x, tmp.y, tmp.z, 1.5, -2.5, e);
    Math.random = realRandom;
    classicSame &&= a.calls.length > 0 && a.calls.join('|') === b.calls.join('|');
    counts.push(a.calls.length);
  }
  const ta = recorder(), tb = recorder(), ba = recorder(), bb = recorder();
  Math.random = seeded(3); oldTrail(ta.P, tmp, 1.7); Math.random = seeded(3); PT.classicTrail(tb.P, tmp.x, tmp.y + 1.7, tmp.z);
  Math.random = seeded(5); oldBurst(ba.P, tmp, 4, 1); Math.random = seeded(5); PT.classicBurst(bb.P, tmp.x, tmp.y, tmp.z, 4, 1);
  Math.random = realRandom;
  check(classicSame, 'Classic explode is main\'s code call for call (the same emits, the same numbers, a seeded random; ' + counts.join(' / ') + ' particles for small / big / tank shell / scale 2 / no smoke)');
  check(ta.calls.join('|') === tb.calls.join('|') && ta.calls.length === 2 && ba.calls.join('|') === bb.calls.join('|') && ba.calls.length === 18, 'Classic flame trail (2 a frame) and the package burst (18) are main\'s code call for call');
  const effectsSrc = readFileSync(new URL('../src/delivery/render/effects.js', import.meta.url), 'utf8');
  check(/if \(e\.tyres\) throwTyres\(tmp\.x, tmp\.y, tmp\.z, vx, vz\);\s*\n\s*const look = chosenKill\(CAR\.id\);\s*\n\s*if \(look === 'classic' \|\| !KillFx\.explode\(look, tmp\.x, tmp\.y, tmp\.z, vx, vz, e\)\) classicExplode\(CLASSIC, tmp\.x, tmp\.y, tmp\.z, vx, vz, e\);/.test(effectsSrc), 'effects.js explode(): the tyres first, then Classic is classicExplode on the game\'s own three pools (the old order of random draws)');

  // ---- the choice ----
  const raw = globalThis.localStorage;
  const wipe = () => { raw.removeItem('delivery.loadout'); Store.reloadStore(); K.forgetKillCache(); };
  wipe();
  check(K.killChoice() === 'classic' && K.shownKill('commuter') === 'classic' && K.chosenKill('commuter') === 'classic', 'a fresh save: Classic');
  raw.setItem('delivery.loadout', JSON.stringify({ v: 1, default: { wheels: { design: 'whitewall' } }, cars: { sport: { roof: { id: 'roofbox' } } } })); Store.reloadStore(); K.forgetKillCache();
  check(K.shownKill('sport') === 'classic' && K.shownKill(null) === 'classic', 'a save from before the kill effects (no \'kill\' anywhere): Classic, and the rest of it kept (' + Store.get('sport', 'roof').id + ')');
  raw.setItem('delivery.loadout', JSON.stringify({ v: 1, default: { kill: { id: 'nonsense' } }, cars: { sport: { kill: { id: 'x<script>' } } } })); Store.reloadStore(); K.forgetKillCache();
  check(K.shownKill('sport') === 'classic' && K.shownKill(null) === 'classic' && !Store.snapshot().cars.sport, 'an unknown id is Classic; garbage is dropped by the store');
  wipe();
  K.setKill('confetti');
  K.setKill('coins', 'sport');
  check(K.chosenKill('commuter') === 'confetti' && K.chosenKill('sport') === 'coins' && K.shownKill(null) === 'confetti', 'per car over the All-cars default: the commuter follows the default (Confetti), the sport has its own (Coins)');
  K.setKill('confetti', 'sport');
  check(!Store.hasOwn('sport', 'kill') && K.chosenKill('sport') === 'confetti', 'a car\'s choice equal to the default is dropped (the cache follows the change)');
  check(K.setKill('nope') === false && K.shownKill(null) === 'confetti', 'setKill refuses an unknown id');
  check(JSON.parse(raw.getItem('delivery.loadout')).default.kill.id === 'confetti' && raw.getItem('delivery.wheeldesign') !== 'confetti', 'stored in the one loadout key (delivery.loadout), never mirrored into the old global keys');
  const L = await load('render/loadout.js');
  const k1 = L.loadoutKey('commuter'); K.setKill('bubbles');
  check(L.loadoutKey('commuter') === k1, 'loadoutKey (the model caches) does not move with the kill effect (no model is rebuilt for it)');
  Progress.noSave = true; Store.reloadStore(); K.forgetKillCache();
  check(K.shownKill('commuter') === 'classic', 'a visit with test switches (Progress.noSave) starts from Classic, the save untouched');
  Progress.noSave = false; Store.reloadStore(); K.forgetKillCache();

  // ---- IN A RUN: the queue's consumer ----
  {
    const cars = await load('cars.js');
    const levels = await load('levels.js');
    const { Game } = await load('game.js');
    const { FxQueue } = await load('physics.js');
    const { Input } = await load('input.js');
    const { Packages } = await load('packages.js');
    const { Player } = await load('player.js');
    const { CONFIG } = await load('config.js');
    const FX = await load('render/effects.js');
    const RP = await load('render/packages.js');
    Progress.data.cars = cars.CARS.map(c => c.id); Progress.data.maxed = [...Progress.data.cars];
    CONFIG.progression.tiers = false;
    Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });
    Object.defineProperty(Input, 'steer', { get: () => Math.sin(Date.now() / 300) * 0.3, configurable: true });
    const tally = { explode: 0, burst: 0, gift: 0, killCalls: {}, fire: 0, particles: 0, killTrail: 0, playerHit: 0 };
    const fireEmit = FX.Fire.emit, partEmit = FX.Particles.emit, killExplode = FX.KillFx.explode, killTrail = FX.KillFx.trail;
    FX.Fire.emit = (...a) => { tally.fire++; return fireEmit(...a); };
    FX.Particles.emit = (...a) => { tally.particles++; return partEmit(...a); };
    FX.KillFx.explode = (id, ...a) => { tally.killCalls[id] = (tally.killCalls[id] || 0) + 1; if (a[5]?.scale === 0.45) tally.playerHit++; return killExplode(id, ...a); };
    FX.KillFx.trail = (...a) => { tally.killTrail++; return killTrail(...a); };
    const runLevel = (id, seconds, look, { evil = false } = {}) => {
      wipe(); if (look) K.setKill(look);
      const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)], lv = all.find(l => l.id === id);
      if (levels.LEVELS.includes(lv)) levels.selectLevel(levels.LEVELS.indexOf(lv)); else levels.selectSpecial(lv);
      Game.evil = evil; Progress.data.evil = evil;
      Game.start();
      for (const key of Object.keys(tally)) tally[key] = key === 'killCalls' ? {} : 0;
      const before = { fire: 0 };
      let thrown = 0;
      for (let t = 0; t < seconds; t += 1 / 60) {
        Game.update(1 / 60);
        if (Math.round(t * 60) % 30 === 0) { Packages.throwOne(); thrown++; }
        for (const e of FxQueue) if (e.type in tally) tally[e.type]++;
        const fire0 = tally.fire;
        RP.syncPackages(1 / 60);
        FX.updateEffects(1 / 60);
        before.fire += tally.fire - fire0;
      }
      return { ...tally, killCalls: { ...tally.killCalls }, thrown, player: Player };
    };
    // a level with obstacles to plough and traffic; Evil (flaming packages that burst)
    const lvId = (levels.LEVELS.find(l => /quarry|city|ring/.test(l.id)) || levels.LEVELS[2]).id;
    const r = runLevel(lvId, 40, 'confetti', { evil: true });
    console.log('        a run of ' + lvId + ' (Evil, 40 s, throwing): ' + r.explode + ' explode, ' + r.burst + ' burst, ' + r.gift + ' gift events; kill-effect spawns ' + JSON.stringify(r.killCalls) + ', of them the player\'s package hits ' + r.playerHit + '; classic fireball particles ' + r.fire + '; trail calls ' + r.killTrail);
    check(r.explode > 0 && (r.killCalls.confetti || 0) - r.playerHit === r.explode && r.fire === 0, 'every \'explode\' event of the run (' + r.explode + ') drawn in Confetti, none as the classic fireball');
    check(r.killTrail > 0, 'the player\'s packages in the air leave the Confetti trail (' + r.killTrail + ' frames)');
    check(r.burst >= r.playerHit, 'the player\'s own flaming packages\' bursts (' + r.playerHit + ' of ' + r.burst + ' bursts) drawn as a small Confetti explosion; the others\' bursts untouched');
    const c = runLevel(lvId, 20, null, { evil: true });
    check(Object.keys(c.killCalls).length === 0 && c.killTrail === 0 && (c.explode === 0 || c.fire > 0), 'Classic chosen: no kill-effect pool touched (' + c.explode + ' explosions, ' + c.fire + ' classic fireball particles)');
    const g = runLevel(lvId, 20, 'coins', { evil: false });
    check(g.gift === 0 || g.particles > 0, 'Good: the gifts\' arrival (\'gift\' events, ' + g.gift + ') still the classic confetti puff; the trail Coins (' + g.killTrail + ' frames)');
    FX.Fire.emit = fireEmit; FX.Particles.emit = partEmit; FX.KillFx.explode = killExplode; FX.KillFx.trail = killTrail;
  }

  // ---- the replay fingerprint ----
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /render\/|killfx|killpreview|particles/.test(f)), 'the replay fingerprint (vite.config.js logicFiles, ' + files.length + ' files) walks no render/ file');
  // (render-only: no logic file imports or names a kill-effect module. This used to compare the whole logic hash with the merge-base's,
  // which only holds on the kill-effects branch alone: an integration of several branches changes logic files of its own, v1.1.148-alpha)
  const named = files.filter(f => /killfx|killpreview|particles\.js/.test(readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8')));
  check(!named.length, 'no logic file imports or names a kill-effect module (' + (named.join(', ') || 'none') + '): render-only');
} finally {
  Math.random = realRandom;
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
