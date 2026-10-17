// A check that a KILL EFFECT's projectile landing and the car's explosion are ONE moment (CHECKLIST 443; the owner: "There is a slight
// delay in the Kill FX projectile landing and the car exploding"). Headless, no browser. For EVERY shipped effect, at 60 and at 30 frames
// a second:
//   - IN A RUN (render/effects.js, render/packages.js, render/cars.js driven as main.js drives them: the logic in CONFIG.maxStep steps,
//     then the scene): the player's (Evil) packages thrown at traffic set to die at a touch; for every car a package kills, the frame the
//     package is last drawn + 1 (it has landed: gone, its burst) and the frame of the car's explosion spawn, of its mesh hidden (the
//     wreck) and of the explosion's sound: all within one frame of each other (|landing - explosion| <= 1 frame)
//   - THE COSMETICS PREVIEW (render/killpreview.js): the frame the package is gone (landed), the car's explosion spawned (KILL, not the
//     package's small HIT), the car hidden, the 'explode' sound: the same frame, the package's last drawn place within one frame's flight
//     of the car, the run's impact time the effect's impactAt (one number both the flight and the explosion read)
//   - the preview matches the run: the same landing-to-explosion gap (frames) in both
//   - ShowroomView.carGone(true) hides the body in THIS frame's picture (the overlay runs after the frame set its visibility)
//   node scripts/.killfx-sync-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };

const session = await startModels();
try {
  const { load } = session;
  const THREE = await session.server.ssrLoadModule('three');
  const K = await load('render/killfx.js');
  const { grantAll } = await load('render/cosmetics.js');
  grantAll();
  const { Progress } = await load('progress.js');
  const Store = await load('render/loadoutstore.js');
  const { Sound } = await load('render/audio.js');
  const cars = await load('cars.js');
  const levels = await load('levels.js');
  const { Game } = await load('game.js');
  const { FxQueue } = await load('physics.js');
  const { Input } = await load('input.js');
  const { Packages } = await load('packages.js');
  const { Player } = await load('player.js');
  const { Traffic } = await load('traffic.js');
  const { CONFIG } = await load('config.js');
  const FX = await load('render/effects.js');
  const RP = await load('render/packages.js');
  const RC = await load('render/cars.js');
  const SV = (await load('render/showroomview.js')).ShowroomView;
  const KP = await load('render/killpreview.js');
  const { KillPreview } = KP;
  const IDS = K.KILL_IDS;
  const FPS = [60, 30];

  // ---- the sounds and the spawns, per frame ----
  let sounds = [];
  const realPlay = Sound.play;
  Sound.play = function (name, ...a) { sounds.push(name); return realPlay.call(this, name, ...a); };
  let fireEmits = 0;
  const fireEmit = FX.Fire.emit;
  FX.Fire.emit = (...a) => { fireEmits++; return fireEmit(...a); };
  const killExplode = FX.KillFx.explode;
  let killEvents = [];
  FX.KillFx.explode = (id, x, y, z, vx, vz, e) => { killEvents.push(e); return killExplode(id, x, y, z, vx, vz, e); };

  // ---- IN A RUN ----
  Progress.data.cars = cars.CARS.map(c => c.id); Progress.data.maxed = [...Progress.data.cars];
  CONFIG.progression.tiers = false;
  Object.defineProperty(Input, 'throttle', { get: () => 1, configurable: true });
  Object.defineProperty(Input, 'steer', { get: () => Math.sin(Date.now() / 300) * 0.3, configurable: true });
  const lv = levels.LEVELS.find(l => /quarry|city|ring/.test(l.id)) || levels.LEVELS[2];
  const run = (look, fps) => {
    localStorage.removeItem('delivery.loadout'); Store.reloadStore(); K.forgetKillCache();
    if (look !== 'classic') K.setKill(look, cars.carInUse().id);
    levels.selectLevel(levels.LEVELS.indexOf(lv));
    Game.evil = true; Progress.data.evil = true;
    Game.start();
    const steps = Math.round(1 / fps / CONFIG.maxStep), dt = 1 / fps;
    const kills = [];
    for (let f = 0; f < fps * 20 && kills.length < 4; f++) {
      if (f % Math.round(fps / 4) === 0) Packages.throwOne();
      for (const c of Traffic.cars) if (c.active && c.health > 0.5 && !c.courier) c.health = 0.5; // (any package kills)
      const flying = Packages.list.filter(p => p.active && p.owner === Player);
      const alive = Traffic.cars.filter(c => c.active);
      for (let n = 0; n < steps; n++) Game.update(CONFIG.maxStep);
      const landed = flying.filter(p => !p.active), died = alive.filter(c => !c.active && c.wreckedByPlayer);
      // the explosions queued for the cars that died, marked as render/effects.js reads them
      const queued = new Map();
      for (const c of died) { const e = FxQueue.find(q => q.type === 'explode' && q.s === c.s && q.lat === c.lat); if (e) queued.set(c, e); }
      sounds = []; killEvents = []; const fire0 = fireEmits;
      RP.syncPackages(dt);
      RC.syncTraffic();
      FX.updateEffects(dt);
      for (const c of died) {
        const p = landed.find(q => Math.abs(q.s - c.s) < c.hl + 3 && Math.abs(q.lat - c.lat) < 3);
        if (!p) continue; // (died of something else this frame)
        const e = queued.get(c), mesh = RC.trafficMeshes[Traffic.cars.indexOf(c)];
        kills.push({
          landed: f, // (the first frame the package is not drawn: it has come down)
          explosion: e && (look === 'classic' ? fireEmits > fire0 : killEvents.includes(e)) ? f : null,
          hidden: mesh && !mesh.visible ? f : null,
          sound: sounds.some(s => s === 'explode' || s === 'explodeBig') ? f : null,
        });
      }
      FxQueue.length = 0;
    }
    return kills;
  };
  const inRun = {}, bad = [];
  for (const id of IDS) for (const fps of FPS) {
    let kills = run(id, fps);
    for (let n = 0; n < 2 && !kills.length; n++) kills = run(id, fps); // (a run the player was busted in early, throwing nothing: again)
    inRun[id + '@' + fps] = kills;
    if (!kills.length) { bad.push(id + ' @' + fps + ': no package kill in 20 s'); continue; }
    for (const k of kills) {
      const worst = Math.max(...['explosion', 'hidden', 'sound'].map(n => (k[n] === null ? Infinity : Math.abs(k[n] - k.landed))));
      if (worst > 1) bad.push(id + ' @' + fps + ': landed frame ' + k.landed + ', explosion ' + k.explosion + ', car hidden ' + k.hidden + ', sound ' + k.sound);
    }
  }
  const total = Object.values(inRun).reduce((n, l) => n + l.length, 0);
  check(!bad.length, 'IN A RUN, every effect at 60 and 30 fps (' + total + ' cars killed by a package): the car\'s explosion spawned, its mesh hidden and the explosion\'s sound within one frame of the package landing (gaps in frames: ' +
    [...new Set(Object.values(inRun).flat().map(k => Math.max(k.explosion - k.landed, k.hidden - k.landed, k.sound - k.landed)))].join(', ') + ')' + (bad.length ? ': ' + bad.slice(0, 8).join('; ') : ''));
  FX.KillFx.explode = killExplode; FX.Fire.emit = fireEmit;

  // ---- THE COSMETICS PREVIEW ----
  const scene = new THREE.Scene(), pcam = new THREE.PerspectiveCamera(30, 0.6, 0.1, 400); pcam.position.set(0, 3, 10); pcam.lookAt(0, 0.6, 0); pcam.updateMatrixWorld();
  KillPreview.test('confetti', pcam, 1.4); // (makes its system)
  const sysP = KillPreview.fx, real = sysP.explode;
  let pv = [];
  sysP.explode = (id, x, y, z, vx, vz, e) => { pv.push(e); return real.call(sysP, id, x, y, z, vx, vz, e); };
  const prev = {}, pbad = [];
  for (const id of IDS) for (const fps of FPS) {
    const dt = 1 / fps;
    KillPreview.test(id, pcam, 1.4);
    const impact = KillPreview.state.impactAt;
    if (impact !== KP.impactAt(id)) pbad.push(id + ': the run\'s impact ' + impact + ' is not impactAt ' + KP.impactAt(id));
    let wasBox = false, landed = null, explosion = null, hidden = null, sound = null, lastT = 0;
    for (let f = 0; f < fps * 2 && (landed === null || explosion === null || f <= landed + 2); f++) {
      pv = []; sounds = []; const fire0 = KillPreview.state.classicFire;
      KillPreview.frame(scene, dt, pcam);
      const st = KillPreview.state;
      if (st.box) { wasBox = true; lastT = st.t; }
      else if (wasBox && landed === null) landed = f;
      if (explosion === null && (id === 'classic' ? st.classicFire > fire0 : pv.some(e => !(e.scale < 1)))) explosion = f; // (the car's: not the package's small HIT)
      if (hidden === null && st.carHidden) hidden = f;
      if (sound === null && sounds.includes('explode')) sound = f;
    }
    // (its last drawn place: within one frame's flight of the car)
    if (!(impact - lastT <= dt + 1e-9)) pbad.push(id + ' @' + fps + ': the package last drawn ' + (impact - lastT).toFixed(3) + ' s short of the impact');
    prev[id + '@' + fps] = { landed, explosion, hidden, sound };
    const worst = Math.max(...[explosion, hidden, sound].map(v => (v === null || landed === null ? Infinity : Math.abs(v - landed))));
    if (worst > 1) pbad.push(id + ' @' + fps + ': landed frame ' + landed + ', explosion ' + explosion + ', car hidden ' + hidden + ', sound ' + sound);
  }
  sysP.explode = real;
  KillPreview.clear();
  check(!pbad.length, 'THE PREVIEW, every effect at 60 and 30 fps: the package gone (landed), the car\'s explosion, the car hidden and the \'explode\' sound on the same frame, the package last drawn within a frame of the car, the impact time the effect\'s impactAt (' + KP.impactAt('confetti') + ' s)' + (pbad.length ? ': ' + pbad.slice(0, 8).join('; ') : ''));

  // ---- the preview matches the run ----
  const gap = (k) => (k.explosion === null || k.landed === null ? null : k.explosion - k.landed);
  const mism = [];
  for (const id of IDS) for (const fps of FPS) {
    const r = [...new Set((inRun[id + '@' + fps] || []).map(gap))], p = gap(prev[id + '@' + fps]);
    if (r.length !== 1 || r[0] !== p) mism.push(id + ' @' + fps + ': run ' + r.join('/') + ', preview ' + p);
  }
  check(!mism.length, 'the preview matches the run: the same landing-to-explosion gap, every effect, at 60 and 30 fps (' + (mism.length ? mism.join('; ') : 'all 0 frames') + ')');

  // ---- the showroom hides the car in this frame's picture ----
  const svSrc = readFileSync(new URL('../src/delivery/render/showroomview.js', import.meta.url), 'utf8');
  check(/carGone\(on\) \{[^\n]*if \(on && v\?\.body\) v\.body\.visible = v\.shadow\.visible = false;/.test(svSrc) && SV.carHidden === false,
    'ShowroomView.carGone(true) hides the body and shadow at once (the overlay that calls it runs after the frame set their visibility: else drawn one frame into its own explosion)');
  Sound.play = realPlay;
} finally {
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
