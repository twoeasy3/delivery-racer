// ============================================================================
// ORBIT DEMO: a test harness for render/orbit.js, loaded only by ?orbitdemo=<phase> (never in play). It drives a REAL replay in
// the page, then does what a player would to the orbit camera, so scripts/shots.mjs can take stills of it:
//   1. the run the address started is driven flat out as a ghost to its delivery (run A), then run B (held back for the first
//      few seconds, so it is the slower: A is the level's best, which the replay ghost shows) is driven and delivered;
//   2. B is played back through the real recorder / player (Replay.watch), and stepped on to the step the phase wants;
//   3. the phase: `chase` (nothing more), `drag` (a mouse drag of 90 degrees' worth of swing, one move a frame, the replay
//      going on), `lock` (the same, then the Chase view button, held part way by &orbitblend=<0..1>), `ghost` (the drag, then the
//      Ghost button), `tap` (a plain tap, which must do nothing) and `wheel` (a wheel on the chase camera: nothing).
// The console says the step and the clock before and after, and the pose at the start of the drag and on its first frame
// (render/orbit.js `trace`). Then the replay is held (paused) so a still is steady, unless &orbitplay is on the address.
// ============================================================================
import { Game } from '../game.js';
import { Replay } from '../replay.js';
import { ReplayStore } from '../replaystore.js';
import { Progress } from '../progress.js';
import { Input } from '../input.js';
import { CONFIG } from '../config.js';
import { Player } from '../player.js';
import { WatchGhost, watchGhostAvailable } from './ghostcar.js';

const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const frames = async (n) => { for (let i = 0; i < n; i++) await frame(); };
const say = (text) => console.warn('ORBITDEMO [' + Math.round(performance.now()) + ' ms] ' + text);

// a run driven flat out (after `hold` seconds) to its finish, as a ghost: nothing wrecks it
const drive = (hold) => {
  Player.testGhost = true;
  for (let t = 0; Game.state === 'playing' && t < 400; t += CONFIG.maxStep) {
    Input.fed = { steer: 0, throttle: t < hold ? 0.25 : 1, auto: false };
    Game.update(CONFIG.maxStep);
  }
  Input.fed = null;
};
// (the store keeps nothing on a test visit: Progress.noSave. One call at a time lets it keep this run)
const keep = () => { const was = Progress.noSave; Progress.noSave = false; try { ReplayStore.kept(Replay.last); } finally { Progress.noSave = was; } };

export const run = async (phase, params, Orbit) => {
  while (Game.state !== 'playing') await frame();
  const canvas = document.getElementById('game');
  drive(0);
  say('run A over: ' + Game.outcome + ' at ' + Game.time.toFixed(1) + ' s, steps ' + Game.step);
  keep();
  Game.start();
  drive(Number(params.get('orbithold') || 8));
  say('run B over: ' + Game.outcome + ' at ' + Game.time.toFixed(1) + ' s, steps ' + Game.step);
  keep();
  const rec = Replay.last;
  const can = Replay.watch(rec);
  say('replay of B: ' + JSON.stringify(can) + ' best kept: ' + !!ReplayStore.best(rec.header.level, rec.header.evil));
  if (!can.ok) return;
  Replay.speed = Number(params.get('orbitspeed') || 1);
  const target = Number(params.get('orbitat') || 360);
  while (Game.step < target) Game.update(CONFIG.maxStep);
  await frames(1);
  say('playing: step ' + Game.step + ' time ' + Game.time.toFixed(2) + ' replaying ' + !!Replay.playing + ' speed ' + Replay.speed + ' ghost available ' + watchGhostAvailable());
  const send = (type, x, y, extra = {}) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y, bubbles: true, ...extra }));
  const X = Math.round(innerWidth / 2), Y = Math.round(innerHeight / 2);
  const hold = () => { if (params.get('orbitplay') === null) Game.paused = true; };
  // (the drag: a press and a first move, then a frame (the first frame of the orbit, which must be the chase frame), then the rest of the
  // swing at once: a page under a script's virtual clock gets only a handful of frames, which is all the harness has to spend)
  const swing = async (px, after = 2) => {
    const before = { step: Game.step, time: Game.time, yaw: 0 };
    send('pointerdown', X, Y);
    send('pointermove', X + 8, Y); // (past the few pixels that make a drag: the orbit takes hold here)
    before.yaw = Orbit.yaw;
    await frame();
    for (let dx = 8 + 6; dx <= px; dx += 6) send('pointermove', X + dx, Y);
    send('pointerup', X + px, Y);
    if (after) await frames(after);
    say('drag of ' + px + ' px: orbit on ' + Orbit.on + ' mode ' + Orbit.mode + ' auto-spin ' + Orbit.auto + ' | step ' + before.step + ' -> ' + Game.step + ', clock ' + before.time.toFixed(2) + ' -> ' + Game.time.toFixed(2) +
      ' | yaw ' + (before.yaw * 180 / Math.PI).toFixed(1) + ' -> ' + (Orbit.yaw * 180 / Math.PI).toFixed(1) + ' (' + ((Orbit.yaw - before.yaw) * 180 / Math.PI).toFixed(1) + ' degrees round)');
  };
  if (phase === 'tap') {
    send('pointerdown', X, Y); send('pointerup', X, Y);
    send('pointerdown', X, Y); send('pointermove', X + 3, Y + 2); send('pointerup', X + 3, Y + 2); // (a tap that wobbles a little)
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    await frames(3);
    say('tap, wobble and wheel on the chase camera: orbit on ' + Orbit.on + ' (must be false)');
  } else if (phase === 'drag' || phase === 'lock' || phase === 'ghost') {
    await swing(Number(params.get('orbitpx') || 270), phase === 'lock' ? 0 : 2); // (about 90 degrees: 0.006 rad a pixel)
    if (phase === 'ghost') {
      const button = document.getElementById('orbitGhostBtn');
      say('ghost button shown ' + (button.style.display !== 'none') + ' says "' + button.textContent + '"');
      button.click();
      await frames(3);
      say('ghost on: ' + WatchGhost.on + ', button says "' + button.textContent + '", the line under the clock says "' + document.getElementById('ghostGap').textContent + '"');
    }
    if (phase === 'lock') {
      document.getElementById('orbitBackBtn').click();
      say('Chase view pressed: orbit on ' + Orbit.on + ' blending ' + Orbit.blending + ' step ' + Game.step);
      await frames(2);
      say('after the blend frames: blending ' + Orbit.blending.toFixed(3) + ' step ' + Game.step + ' time ' + Game.time.toFixed(2));
    }
  }
  hold();
  await frames(2);
  say('held: step ' + Game.step + ' time ' + Game.time.toFixed(2) + ' paused ' + Game.paused + ' orbit on ' + Orbit.on);
};
