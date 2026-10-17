// A check that the trails run on their PARENT'S GAME CLOCK (CHECKLIST 442; the owner: "Smoke and boost (and all other trails) should
// continue to be calculated by their parent's actual game speed when paused"). Headless (scripts/modelpatch-load.mjs: the render
// modules with a stand-in renderer). The frame is main.js's: render/gameclock.js stepGame steps the logic and gives the GAME time
// of the frame, and the car is placed, then render/effects.js emitVehicleSmoke, render/items.js syncPickups (the turbo exhaust) and
// render/effects.js updateEffects (the particle pools) run on that game time, as main.js runs them.
//   - PAUSED (Game.paused, as the pause and photo mode leave it), the Sport on turbo, damaged (smoke) and in a gravel trap (stones and
//     dust), 60 paused frames: the car does not move, and no particle of the pools moves, comes or goes (the instance matrices are
//     the same to the bit), the logic is not stepped; then unpaused, they go on. And the OLD clock (the wall time handed to the
//     pools, as main.js did before) shown moving them on a frozen car, so the check sees what it is for
//   - HALF SPEED (a time scale of 0.5, as a replay's 2x / 4x, at a half): the game time of a frame is half; each of the turbo's,
//     the smoke's and the gravel's particles goes half as far a frame as at 1x (the median, 10 frames each), the car too; and the
//     turbo's trail behind the car is as long at 0.5 as at 1 (it is the car's, in game time)
//   - TURBO TRAIL STYLES (render/turbotrails.js, ?turbotrail=, when it is there): each style paused holds still and emits nothing,
//     and at half speed goes half as far
//   - render-only: the replay fingerprint walks no render/ file; its hashes printed
//   node scripts/.trail-clock-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { existsSync } from 'node:fs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const session = await startModels();
try {
  const { load } = session;
  const cars = await load('cars.js');
  const levels = await load('levels.js');
  const { Game } = await load('game.js');
  const { Player } = await load('player.js');
  const { CONFIG } = await load('config.js');
  const TR = await load('track.js');
  const { Mysteries } = await load('mysteries.js');
  const { Progress } = await load('progress.js');
  const { Traffic } = await load('traffic.js');
  const RC = await load('render/cars.js');
  const FX = await load('render/effects.js');
  const IT = await load('render/items.js');
  const GC = await load('render/gameclock.js');
  const TT = existsSync(new URL('../src/delivery/render/turbotrails.js', import.meta.url)) ? await load('render/turbotrails.js') : null;
  const carMesh = RC.carMesh;
  Progress.data.cars = cars.CARS.map(c => c.id); Progress.data.maxed = [...Progress.data.cars];
  CONFIG.progression.tiers = false;
  const place = () => { // (main.js frame())
    const heading = TR.Track.toWorld(Player.s, Player.lat, carMesh.position);
    carMesh.position.y += Player.air + Mysteries.heave(Player.s);
    carMesh.rotation.order = 'YXZ';
    carMesh.rotation.y = heading - Player.yaw;
    carMesh.rotation.x = -Math.atan(TR.Track.grade(Player.s)) - Player.pitch;
    if (Player.pitch) carMesh.position.y += Math.abs(Math.sin(Player.pitch)) * 0.25;
  };
  let steps = 0;
  const logicStep = (st) => { const before = Game.step; Game.update(st); steps++; return Game.step !== before; };
  let opts = {};
  // one frame of wall time `wall`, main.js's way (oldClock: the wall time handed to the effects, as before CHECKLIST 442)
  const frame = ({ wall = 1 / 60, scale = 1, oldClock = false } = {}) => {
    let gdt = GC.stepGame(wall, { paused: Game.paused, scale, update: logicStep });
    if (oldClock) { GC.tickGameClock(wall, wall, 1); gdt = wall; }
    if (!Game.paused) { // (after the rules' step, as the airtrail check does)
      if (opts.damaged) Player.health = Player.maxHealth * 0.1;
      if (opts.gravel) Player.inGravel = true;
      if (opts.hold) Player.speed = opts.hold;
    }
    for (const c of Traffic.cars) if (!c.fixed) c.active = false;
    place();
    FX.emitVehicleSmoke(gdt);
    IT.syncPickups(gdt);
    TT?.syncTurboTrail?.(gdt);
    FX.updateEffects(gdt);
  };
  const start = (o) => {
    opts = o;
    levels.selectLevel(0);
    Progress.data.car = 'sport';
    Game.start();
    GC.resetGameClock();
    Object.assign(Player, { s: 700, lat: TR.Track.laneOffset(1, 700), speed: o.hold, launching: false, turbo: o.turbo ? 99 : 0 });
    Player.testGhost = true;
    for (let i = 0; i < 60; i++) frame();
  };
  // the pools' drawn particles (their instance matrices), and their live counts
  const pools = () => ({ Particles: FX.Particles, Smoke: FX.Smoke, ...(TT?.pools?.() || {}) });
  const snap = () => Object.fromEntries(Object.entries(pools()).map(([k, p]) => [k, Float32Array.from(p.mesh.instanceMatrix.array)]));
  const lives = () => Object.fromEntries(Object.entries(pools()).filter(([, p]) => p.live).map(([k, p]) => [k, p.live()]));
  const drifted = (a, b) => { const d = []; for (const k in a) for (let m = 0; m < a[k].length; m += 16) if (a[k][m] > 0 && b[k][m] > 0) d.push(Math.hypot(b[k][m + 12] - a[k][m + 12], b[k][m + 14] - a[k][m + 14])); return median(d); };
  const moved = (a, b) => { let most = 0; for (const k in a) for (let i = 0; i < a[k].length; i++) most = Math.max(most, Math.abs(a[k][i] - b[k][i])); return most; };
  // each live particle's move over one frame (matrix positions; a slot written afresh, or one gone, is left out by the median)
  const steppedBy = (key, run) => {
    const a = pools()[key].mesh.instanceMatrix.array, before = Float32Array.from(a);
    run();
    const d = [];
    for (let m = 0; m < a.length; m += 16) if (before[m] > 0 && a[m] > 0) d.push(Math.hypot(a[m + 12] - before[m + 12], a[m + 13] - before[m + 13], a[m + 14] - before[m + 14]));
    return median(d);
  };

  // ---- PAUSED: the Sport on turbo, damaged, in gravel ----
  start({ turbo: true, damaged: true, gravel: true, hold: 30 });
  const live0 = lives();
  check(live0.Particles > 20 && live0.Smoke > 5, 'running: the turbo, the gravel and the smoke out (' + JSON.stringify(live0) + ' live)');
  Game.paused = true;
  const s0 = Player.s, car0 = carMesh.position.clone(), m0 = snap(), steps0 = steps;
  for (let i = 0; i < 60; i++) frame();
  check(Player.s === s0 && carMesh.position.distanceTo(car0) === 0 && steps === steps0, 'paused 60 frames: the car frozen, the logic not stepped');
  check(GC.GameClock.dt === 0 && GC.GameClock.frozen, 'paused: the game clock\'s dt 0, frozen');
  check(moved(m0, snap()) === 0, 'paused 60 frames: no particle of the turbo, the smoke or the gravel moved, came or went (to the bit)');
  check(JSON.stringify(lives()) === JSON.stringify(live0), '...and as many live as when it paused (' + JSON.stringify(lives()) + ')');
  // (the old clock: the wall time to the effects while the game is paused)
  const mOld = snap();
  for (let i = 0; i < 10; i++) frame({ oldClock: true });
  const drift = drifted(mOld, snap());
  check(drift > 0.5, 'the OLD clock (wall time to the effects, paused), for contrast: the particles go on drifting from a frozen car (' + drift.toFixed(2) + ' m in 10 frames, the median) and more pour out');
  Game.paused = false;
  const m1 = snap();
  for (let i = 0; i < 5; i++) frame();
  check(moved(m1, snap()) > 0.1 && Player.s > s0, 'unpaused: they go on with the car');

  // ---- HALF SPEED ----
  const half = (name, key, o) => {
    start(o);
    const car = (scale) => { const s = Player.s; frame({ scale }); return Player.s - s; };
    const full = [], slow = [], carFull = [], carSlow = [];
    // (the moves measured inside the frames: each a frame at 1, then each at 0.5)
    for (let i = 0; i < 10; i++) { let c = 0; full.push(steppedBy(key, () => { c = car(1); })); carFull.push(c); }
    for (let i = 0; i < 30; i++) frame({ scale: 0.5 }); // (settled at 0.5)
    for (let i = 0; i < 10; i++) { let c = 0; slow.push(steppedBy(key, () => { c = car(0.5); })); carSlow.push(c); }
    const r = median(slow) / median(full), rc = median(carSlow) / median(carFull);
    check(Math.abs(rc - 0.5) < 0.02 && Math.abs(r - 0.5) < 0.1, name + ' at a time scale of 0.5: each particle goes ' + r.toFixed(2) + 'x as far a frame as at 1 (' + median(full).toFixed(3) + ' -> ' + median(slow).toFixed(3) + ' m), the car ' + rc.toFixed(2) + 'x');
    return { full: median(full), slow: median(slow) };
  };
  half('the turbo exhaust', 'Particles', { turbo: true, hold: 30 });
  half('the damage smoke', 'Smoke', { damaged: true, hold: 30 });
  half('the gravel spray', 'Particles', { gravel: true, hold: 30 });
  // the turbo's trail, as long behind the car at 0.5 as at 1 (the old clock: it bunches up at the tail)
  const trailLength = (scale, oldClock = false) => {
    start({ turbo: true, hold: 30 });
    for (let i = 0; i < 40; i++) frame({ scale, oldClock });
    const v = { x: 0, y: 0, z: 0 }, h = TR.Track.toWorld(Player.s - Player.hl, Player.lat, v), fx = Math.sin(h), fz = Math.cos(h);
    const a = FX.Particles.mesh.instanceMatrix.array, behind = [];
    for (let m = 0; m < a.length; m += 16) if (a[m] > 0) behind.push(-((a[m + 12] - v.x) * fx + (a[m + 14] - v.z) * fz));
    return Math.max(...behind);
  };
  const L1 = trailLength(1), Lh = trailLength(0.5), Lold = trailLength(0.5, true);
  check(Math.abs(Lh / L1 - 1) < 0.2, 'the turbo trail behind the car at 30 m/s: ' + L1.toFixed(2) + ' m at 1x, ' + Lh.toFixed(2) + ' m at 0.5x (the car\'s own, in game time; the old clock at 0.5x: ' + Lold.toFixed(2) + ' m)');

  // ---- TURBO TRAIL STYLES (Part 2: render/turbotrails.js) ----
  if (TT) {
    for (const style of TT.STYLE_NAMES) {
      TT.setTurboTrail(style);
      start({ turbo: true, hold: 30 });
      const n = TT.liveCount();
      Game.paused = true;
      const a = snap(), st = TT.state();
      for (let i = 0; i < 30; i++) frame();
      const still = moved(a, snap()) === 0 && TT.state() === st;
      Game.paused = false;
      const d1 = TT.advanceProbe(() => frame({ scale: 1 }));
      for (let i = 0; i < 20; i++) frame({ scale: 0.5 });
      const d2 = TT.advanceProbe(() => frame({ scale: 0.5 }));
      const r = d2 / d1;
      check(n > 0 && still && Math.abs(r - 0.5) < 0.1, 'turbo trail \'' + style + '\': drawing (' + n + ' live), paused 30 frames: nothing moved or came (' + still + '); at 0.5x it goes ' + r.toFixed(2) + 'x as far a frame');
      Player.turbo = 0;
      for (let i = 0; i < 40; i++) frame();
      check(TT.liveCount() === 0, '...and the turbo off: nothing drawn (' + TT.liveCount() + ')');
    }
    TT.setTurboTrail('classic');
  }

  // ---- render-only ----
  const { fingerprints } = await import('./logic-hash.mjs');
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  check(!files.some(f => /^render\//.test(f) || f === 'main.js'), 'the replay fingerprint (' + files.length + ' logic files) walks no render/ file nor main.js');
  console.log('        the replay fingerprint: ' + JSON.stringify(fingerprints()));
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (session.fixStack ? session.fixStack(e.stack) : e.stack));
} finally {
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
