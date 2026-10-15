// ---- LEVEL LOADING: a staged start, a plain loading screen, and a load log (the owner, 15-Oct: "The level load times are getting a
// bit significant, even on my desktop. Should we have a loading screen?").
//
// A run started from the menu (Start / Enter, Next level on the results) builds its level here IN STEPS, one frame each, instead of in
// one go inside Game.start: the theme's file (awaited, so the level is drawn once, whole, not bare and then again), the level's rules
// (Game.load with its drawing hooks held back), each drawing hook (Game.onLoad: the road and scenery, the obstacles, the tunnels...),
// the shaders compiled, then Game.start itself (which finds the level loaded and only deals the run). Between steps the page paints, so
// a loading screen can show and its bar moves with the real steps. It shows only when the load has taken longer than SHOW_AFTER ms (no
// flash on a quick load), and goes once the run's first frame has been drawn.
//
// WHY THIS IS THE SAME RUN: Game.start would call Game.load(nextLoadSeed ?? a fresh seed) itself; here that same call is made first,
// so Game.start finds `loaded === LEVEL` and skips it. The drawing hooks use Math.random only (render/road.js), never the rules' dice,
// and nothing of the rules runs between the steps (the state is still 'start': the frame loop steps nothing). Game.start then seeds
// the run's own dice as always. No logic file is changed (vite.config.js logicFiles: the replay fingerprint stays).
//
// NOT STAGED (Game.start as ever, in one go): the screensavers, the race watch, a replay's playback (replay.js), a clean run, the
// address's test starts (?autostart, ?hidden, ...), a restart of the level already loaded (nothing to build), a level the player
// cannot start (Game.start refuses it itself).
//
// ?loadafter=<ms> moves the threshold (a check: no screen at all for a load under it).
// ?loadlog prints a table of where a start's time went (console, and window.__loadlog), staged or not; ?nostage starts in one go
// as before (to compare); ?slowload=<ms> waits that long at each step (to see the screen and its bar: a check, a picture).
import { Game } from '../game.js';
import { LEVEL } from '../levels.js';
import { levelName } from '../levelText.js';
import { THEMES } from '../themes.js';
import { Replay } from '../replay.js';
import { Collision } from '../collision.js';
import { Pickups, Targets } from '../pickups.js';
import { Gambles } from '../gambles.js';
import { Radiation } from '../radiation.js';
import { Hazards } from '../hazards.js';
import { LaneGimmicks } from '../lanegimmicks.js';
import { Roadworks } from '../roadworks.js';
import { Traffic } from '../traffic.js';
import { Player } from '../player.js';
import { loadTheme } from './themes/index.js';

const params = new URLSearchParams(location.search);
const LOG = params.has('loadlog');
const STAGED = !params.has('nostage');
const SLOW = Math.max(0, Number(params.get('slowload')) || 0);
export const SHOW_AFTER = Number(params.get('loadafter')) || 300; // ms: a load quicker than this shows no screen at all (?loadafter=<ms>: another, for a check)

// ---- the drawing hooks, named (by their module, from where they were registered) --------------------------------------------
// (this module is imported first by main.js, so every render module's Game.onLoad.push comes through here)
const hookName = (fn) => {
  const line = (new Error().stack || '').split('\n').find(l => /\/render\//.test(l) && !/loadscreen/.test(l)) || '';
  const file = (line.match(/\/render\/([\w/.-]+?\.js)/) || [])[1] || '';
  return (file ? file.replace(/\.js$/, '') : 'hook') + (fn.name && fn.name !== 'build' ? ' ' + fn.name : '');
};
const push = Game.onLoad.push;
Game.onLoad.push = function (...fns) { for (const fn of fns) fn.loadName ||= hookName(fn); return push.apply(this, fns); };

// ---- the load log (?loadlog) ------------------------------------------------------------------------------------------------
let log = null; // the start being logged: { level, staged, t0, phases: [[name, ms]], ... }
const now = () => performance.now();
const phase = (name, ms) => { if (log) log.phases.push([name, Math.round(ms * 10) / 10]); };
const timed = (obj, key, name) => {
  const fn = obj[key];
  obj[key] = function (...a) { const t = now(); try { return fn.apply(this, a); } finally { phase(name, now() - t); } };
};
let renderer = null, scene = null, camera = null;
if (LOG) {
  window.__loadlog = [];
  for (const [obj, key, name] of [[Collision, 'loadLevel', 'rules: obstacles'], [Pickups, 'load', 'rules: pickups'], [Targets, 'load', 'rules: targets'],
    [Gambles, 'build', 'rules: gambles'], [Radiation, 'build', 'rules: radiation'], [Hazards, 'attach', 'rules: hazards'],
    [LaneGimmicks, 'attach', 'rules: lane gimmicks'], [Roadworks, 'attach', 'rules: roadworks'], [Traffic, 'reset', 'run: traffic dealt'], [Player, 'reset', 'run: player reset']]) timed(obj, key, name);
  // (Game.load: the track itself is what is left of it once the parts above and the hooks are taken off)
  const load = Game.load;
  Game.load = function (...a) {
    const t = now(), before = log ? log.phases.length : 0;
    try { return load.apply(this, a); } finally {
      if (log) {
        const parts = log.phases.slice(before).filter(([n]) => n.startsWith('rules:') || n.startsWith('draw:')).reduce((s, [, ms]) => s + ms, 0);
        phase('rules: track (buildTrack)', now() - t - parts);
      }
    }
  };
  // each frame callback timed while a start is being logged (the frame loop's first frames: the car's model, the traffic's, the first draw)
  // (one entry per frame, all the callbacks of the frame together, by its timestamp: the frame loop's, the menu's, the corners')
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => {
    if (!log?.framing || cb.internal) return cb(ts);
    let f = log.frames[log.frames.length - 1];
    if (!f || f.ts !== ts) log.frames.push(f = { ts, js: 0, draw: 0, programs: 0, calls: 0 });
    const t = now();
    try { return cb(ts); } finally { f.js += now() - t; }
  });
}
// (main.js hands over the run's renderer: the first draw is timed, the shaders are compiled during a staged load)
export const useRenderer = (r, s, c) => {
  renderer = r; scene = s; camera = c;
  if (!LOG) return;
  const render = r.render.bind(r);
  r.render = (...a) => {
    if (!log?.framing) return render(...a);
    const t = now(), programs = r.info.programs?.length || 0, f = log.frames[log.frames.length - 1];
    try { return render(...a); } finally { if (f) { f.draw += now() - t; f.programs += (r.info.programs?.length || 0) - programs; if (a[0] === s) f.calls = r.info.render.calls; } }
  };
};
const hookRun = (fn) => { const t = now(); try { fn(); } finally { phase('draw: ' + (fn.loadName || 'hook'), now() - t); } };
const beginLog = (staged) => {
  if (!LOG) return;
  log = { level: LEVEL.id, staged, warm: Game.loaded === LEVEL, t0: now(), phases: [], notes: [], frames: [], blocks: [], framing: false, programs0: renderer?.info.programs?.length || 0 };
};
// after the run's first frames: the table
const endLog = () => {
  if (!log) return;
  const l = log;
  log = null;
  const r1 = (ms) => Math.round(ms * 10) / 10;
  l.frames.slice(0, 2).forEach((f, i) => {
    l.phases.push([`frame ${i + 1}: JS (car model, traffic models, sync)`, r1(f.js - f.draw)]);
    l.phases.push([`frame ${i + 1}: draw (programs compiled + upload)`, r1(f.draw)]);
    l.notes.push(`frame ${i + 1}: ${f.programs} new programs, ${f.calls} draw calls`);
  });
  if (renderer) l.notes.push('KHR_parallel_shader_compile ' + (renderer.extensions.has('KHR_parallel_shader_compile') ? 'on (shaders compile off the main thread)' : 'off'));
  const blocked = Math.max(...l.blocks, ...l.frames.slice(0, 2).map(f => f.js), 0);
  const out = { level: l.level, staged: l.staged, warm: l.warm, total: Math.round(l.toFirstFrame), blocked: Math.round(blocked), phases: l.phases, notes: l.notes };
  window.__loadlog.push(out);
  console.log(`[loadlog] ${l.level} ${l.warm ? '(built already)' : ''} ${l.staged ? 'staged' : 'in one go'}: ${out.total} ms to the first frame drawn, longest block ${out.blocked} ms`);
  console.table(Object.fromEntries(l.phases.map(([n, ms], i) => [i + ' ' + n, ms])));
  if (l.notes.length) console.log('[loadlog] ' + l.notes.join('; '));
};
// the frames of the run up to the first drawn: timed, then the table
const watchFirstFrames = () => {
  if (!log) return;
  log.framing = true;
  // (main.js's frame loop's callback runs before this one in the same frame: two frames on, both have been drawn)
  let n = 0;
  const step = () => {
    if (!log) return;
    if (++n === 1) log.toFirstFrame = now() - log.t0;
    if (n < 2) { requestAnimationFrame(internal(step)); return; }
    log.framing = false;
    endLog();
  };
  requestAnimationFrame(internal(step));
};

// ---- the screen ---------------------------------------------------------------------------------------------------------------
let screen = null, bar = null, title = null;
const startScreen = document.getElementById('startScreen');
const makeScreen = () => {
  screen = document.createElement('div');
  screen.id = 'loadScreen';
  screen.className = 'hidden';
  screen.setAttribute('role', 'status');
  screen.innerHTML = '<div class="ls-box"><small>Loading</small><h2></h2><div class="ls-bar"><i></i></div></div>';
  title = screen.querySelector('h2');
  bar = screen.querySelector('i');
  document.body.appendChild(screen);
};
const showScreen = (level) => {
  if (!screen) makeScreen();
  title.textContent = String(levelName(level) || '').toUpperCase();
  screen.classList.toggle('evil', !!Game.evil);
  screen.classList.remove('hidden');
  startScreen.classList.add('hidden'); // (the menu under it stops drawing its 3D car and moving: menustage.js menuUp)
};
const setProgress = (f) => { if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, f)).toFixed(3)})`; };
const hideScreen = () => { screen?.classList.add('hidden'); setProgress(0); };

// ---- input held while a level loads (the menu's keys would pick another level under it) ------------------------------------
const swallow = (e) => { e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); };
const HELD = ['keydown', 'pointerdown', 'click', 'touchstart', 'wheel', 'contextmenu']; // (not a key's or a finger's release: nothing is left held down)
const holdInput = (on) => { for (const type of HELD) window[on ? 'addEventListener' : 'removeEventListener'](type, swallow, { capture: true, passive: false }); };

// ---- the staged start ---------------------------------------------------------------------------------------------------------
const internal = (cb) => Object.assign(cb, { internal: true }); // (this module's own frame callbacks: not timed as the game's)
const frame = () => new Promise((done) => requestAnimationFrame(internal(() => (SLOW ? setTimeout(done, SLOW) : done()))));
const realStart = Game.start;
let fromMenu = false; // (set by the menu's own ways in: startAsked, nextLevel)
export let loading = false;
const needsLoad = () => Game.loaded !== LEVEL || (Game.nextLoadSeed !== null && Game.nextLoadSeed !== Game.loadSeed);

const staged = async () => {
  loading = true;
  holdInput(true);
  const level = LEVEL, t0 = now();
  let shown = false, blockFrom = now();
  const blocks = [];
  const yieldFrame = async () => { blocks.push(now() - blockFrom); await frame(); blockFrom = now(); };
  if (log) log.blocks = blocks;
  const hooks = Game.onLoad;
  // the bar: the steps' rough weights (the road and its scenery are most of a load: measured, scripts/perf-load.mjs)
  // (a hook says its own: fn.loadWeight, road.js 8, items.js 2; the rest are small. Not by name: a built page's names are minified)
  const weight = (fn) => fn.loadWeight ?? 0.25;
  const total = 1 + 1.5 + hooks.reduce((s, fn) => s + weight(fn), 0) + 1.5 + 1;
  let done = 0;
  const step = (w) => {
    done += w;
    if (!shown && now() - t0 >= SHOW_AFTER) { shown = true; showScreen(level); }
    if (shown) setProgress(done / total);
  };
  const showTimer = setTimeout(() => { if (!shown && loading) { shown = true; showScreen(level); setProgress(done / total); } }, SHOW_AFTER);
  try {
    // 1 the theme's file (asked for when the level was picked: usually here already)
    const name = (THEMES[level.theme] || THEMES.city).scenery;
    let t = now();
    await loadTheme(name).catch(() => null);
    phase('theme file (fetch + parse, if not here)', now() - t);
    step(1); await yieldFrame();
    // 2 the level's rules, its drawing held back
    t = now();
    Game.onLoad = [];
    try { Game.load(Game.nextLoadSeed ?? undefined); } finally { Game.onLoad = hooks; }
    if (log) phase('rules: Game.load in all', now() - t);
    step(1.5); await yieldFrame();
    // 3 each drawing hook, a frame each (the big ones alone)
    let batch = 0;
    for (const fn of hooks) {
      if (LEVEL !== level) throw new Error('the level changed while it loaded');
      hookRun(fn);
      const w = weight(fn);
      step(w);
      batch += w;
      if (batch >= 1) { batch = 0; await yieldFrame(); }
    }
    await yieldFrame();
    // 4 the level's shaders compiled before its first frame (where the browser can, off the main thread: compileAsync)
    if (renderer && scene && camera) {
      t = now();
      // (compileAsync only where the browser can say when a shader is done, KHR_parallel_shader_compile: without it three.js's wait
      // never ends on some browsers. Then compile(), here under the screen, not on the first frame. Never waited on past 4 s)
      const parallel = renderer.extensions.has('KHR_parallel_shader_compile') && renderer.compileAsync;
      try { await Promise.race([parallel ? renderer.compileAsync(scene, camera) : renderer.compile(scene, camera), new Promise(r => setTimeout(r, 4000))]); } catch { /* (drawn on the first frame instead) */ }
      phase(parallel ? 'shaders compiled (renderer.compileAsync)' : 'shaders compiled (renderer.compile)', now() - t);
    }
    step(1.5); await yieldFrame();
    // 5 the run itself: Game.start finds the level loaded and deals the run
    if (LEVEL !== level) throw new Error('the level changed while it loaded');
    t = now();
    realStart.call(Game);
    phase('run: Game.start (level already built)', now() - t);
    if (shown) setProgress(1);
    // 6 its first frame drawn PAUSED, under the screen: the car's model and the traffic's built, their shaders compiled, the car's
    // dents readied (render/dents.js, just after: a timeout). Paused, nothing of the run moves (the frame loop steps nothing) and
    // nothing is recorded; then the run goes on from its step 0 as it would have, and the screen goes
    // (only under the screen: a quick load's first frame is seen, and a paused one would show the PAUSED banner)
    clearTimeout(showTimer); // (no screen from here on if there is none yet)
    if (log) log.framing = true;
    const held = Game.paused;
    if (shown) Game.paused = true;
    blocks.push(now() - blockFrom);
    await new Promise(r => requestAnimationFrame(internal(r))); // (the frame loop's own callback runs first in that frame)
    t = now();
    await new Promise(r => setTimeout(r, 0));
    phase('after the first frame: dents readied (timeout)', now() - t);
    blockFrom = now();
    Game.paused = held;
    hideScreen();
    await new Promise(r => requestAnimationFrame(internal(r))); // (the first frame of the run, seen)
    blocks.push(now() - blockFrom);
    if (log) { log.toFirstFrame = now() - t0; log.framing = false; endLog(); }
  } catch (error) {
    console.error('loading ' + level.id + ': ' + (error?.message || error));
    if (Game.state === 'start') { Game.loaded = null; startScreen.classList.remove('hidden'); } // (built in part: built again next time; the menu back)
  } finally {
    clearTimeout(showTimer);
    hideScreen();
    holdInput(false);
    loading = false;
  }
};

Game.start = function (...a) {
  const menu = fromMenu && !this.asking;
  fromMenu = false;
  if (loading) return; // (a second Start while one loads)
  if (!STAGED || !menu || !this.canStart || Replay.playing || !needsLoad() || this.state === 'playing') {
    beginLog(false);
    if (log) log.blocks = [];
    const t = now();
    const r = realStart.apply(this, a);
    if (log) { log.blocks.push(now() - t); phase('Game.start in all', now() - t); watchFirstFrames(); }
    return r;
  }
  beginLog(true);
  staged();
};
// the menu's ways into a run (game.js: Start and Enter, Restart, Next level) are the staged ones
const startAsked = Game.startAsked;
Game.startAsked = function (...a) { fromMenu = true; const p = startAsked.apply(this, a); Promise.resolve(p).finally(() => { fromMenu = false; }); return p; };
const nextLevel = Game.nextLevel;
Game.nextLevel = function (...a) { fromMenu = true; try { return nextLevel.apply(this, a); } finally { fromMenu = false; } };
// (the drawing hooks are timed in the log when a start is not staged too)
if (LOG) {
  const load = Game.load;
  Game.load = function (...a) {
    if (!log) return load.apply(this, a);
    const hooks = this.onLoad;
    this.onLoad = hooks.map(fn => Object.assign(() => hookRun(fn), { loadName: fn.loadName }));
    try { return load.apply(this, a); } finally { this.onLoad = hooks; }
  };
}
