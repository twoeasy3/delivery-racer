// ---- THE CUTSCENES IN THE GAME (CHECKLIST 437; CINE-WIRING.md): the unlock cinematics (render/unlockcine.js, its directors in
// render/ecucine.js) played from the game's own flow, not only by address. Render side only: no logic file is touched (the
// replay fingerprint, scripts/logic-hash.mjs, never moves), and the cinematics' code stays a lazy import (loaded at the first one).
//   jim     a car BOUGHT on the car lot (Crazey Jim's: render/garage.js buy; the results' Better ride, render/ridenudge.js): purchased()
//   ecu     an ECU BOUGHT (ecu.js Ecu.buy's 'ecuchange'): the new level; the car's MAX ECU: ecumax instead
//   key     a KEY CAR's key had (a pack's key card, an event's prize, ...): seen as the car becoming owned (below)
//   car     any other car becoming owned (a blueprint car's first ECU, an earned car, an event / tier / prize car, the secret bus)
// The last two are found by WATCHING what is owned (Progress.owns over the roster), not at each place that gives a car: so a new
// way of giving one plays its cutscene with no change here. A look at it after every change the game announces (progresschange,
// packschange, carchange, ecuchange) and once a second off a run; what the look finds is queued.
// THE RULES: each plays once per event, after the action's own screen has saved it (the purchase, the upgrade, the pack's cards:
// a cutscene is only ever queued from a result already in the save); one at a time, in order; only over the menu (its screens, the
// garage, the Shop) or a run's results, never during a run or its loading, never over a pack being revealed or a dialog (it waits,
// then plays); a pack held waits for the queue (render/packs.js canShow asks pending()), so a reveal's unlocks play when it is
// closed and before the next pack. Tap / Esc / Space / Enter skip to the held end, a tap closes it (unlockcine.js).
// THE SETTING 'Cutscenes' (Options): On / Short (straight to the held end) / Off; localStorage, this device only (not the save).
// The fade-only (lite) version: any ?lite=, reduced motion (unlockcine.js), or a low-end device (2 cores or 2 GB or fewer).
// FAILSAFE: a load that fails, no WebGL, or a play not at its held end 12 s after it began: closed, and the game goes on.
// HEADLESS (navigator.webdriver: the checks, scripts/shots.mjs): nothing plays (a check's clicks are never caught by one) unless
// the address has ?cineplay; what would have played is logged in window.__cine.log either way. ?nocine: none plays.
// MORE THAN BULK new cars at once (Unlock everything, a save brought in): none plays, they are taken as they are.
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { Packs } from '../packs.js';
import { CARS, EARNED_CARS, EVENT_CARS, BESPOKE_CARS, FILLER_CARS, SECRET_CARS, carById } from '../cars.js';
import { LITE } from '../lite.js';
import * as Load from './loadscreen.js';

export const CINE_KEY = 'delivery_cutscenes';
export const CINE_MODES = ['on', 'short', 'off'];
const WORDS = { on: 'On', short: 'Short', off: 'Off' };
export const BULK = 10; // (more new cars than this at once: Unlock everything, an imported save; none plays)
export const LIMIT_MS = 12000; // (the failsafe: a play not held or closed by then is closed; a load not begun by then is dropped)
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

// ---- the setting (this device's: localStorage, never the save) ----
export const cineMode = () => { try { const v = localStorage.getItem(CINE_KEY); return CINE_MODES.includes(v) ? v : 'on'; } catch { return 'on'; } };
export const setCineMode = (mode) => {
  if (!CINE_MODES.includes(mode)) return;
  try { localStorage.setItem(CINE_KEY, mode); } catch { /* (no storage: the default next visit) */ }
  if (mode === 'off') queue.length = 0;
  showSetting();
};
const nextMode = (mode) => CINE_MODES[(CINE_MODES.indexOf(mode) + 1) % CINE_MODES.length];

// ---- where it may play ----
const headless = () => typeof navigator !== 'undefined' && !!navigator.webdriver && !params.has('cineplay');
const lowEnd = () => typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2);
export const liteWanted = () => params.has('cinelite') || LITE.size > 0 || lowEnd();
const silent = () => params.has('nocine') || headless() || cineMode() === 'off';
export const gateOpen = () => {
  if (Load.loading) return false; // (a level being built)
  if (Game.state === 'finished') { const r = document.getElementById('resultScreen'); if (!r || r.classList.contains('hidden')) return false; }
  else if (Game.state !== 'start') return false;
  return !document.querySelector('.pack-reveal:not(.hidden), .menu-dialog');
};

// ---- the queue ----
const queue = [];
const played = new Set(); // (each event once: 'jim:hearse', 'ecu:sport:3', 'key:swancar', ...)
let busy = null; // the one playing: { item, began, handle, timer }
const log = [];
if (typeof window !== 'undefined') window.__cine = { log, queue, get busy() { return busy ? { ...busy.item, held: !!busy.handle?.held } : null; }, look: () => look(), pump: () => pump() };
const note = (item, what) => { log.push({ ...item, what, at: Date.now() }); };
export const enqueue = (item) => {
  const id = item.mode + ':' + item.carId + (item.level ? ':' + item.level : '');
  if (played.has(id)) return false;
  played.add(id);
  const entry = { ...item, id, evil: item.evil ?? !!Game.evil };
  if (silent()) { note(entry, params.has('nocine') ? 'nocine' : headless() ? 'headless' : 'off'); return false; }
  queue.push(entry);
  note(entry, 'queued');
  setTimeout(pump, 0);
  return true;
};
// is a cutscene playing or waiting to? (render/packs.js holds the next pack for it)
export const pending = () => { if (!busy) look(); return !!busy || queue.length > 0; };

const finish = (why) => {
  if (!busy) return;
  const { item, timer } = busy;
  clearInterval(timer);
  busy = null;
  note(item, why);
  if (queue.length) setTimeout(pump, 60);
  else setTimeout(() => Packs.revealNow(), 60); // (a pack held for it: opened now)
};
export const pump = () => {
  if (busy || !queue.length || !gateOpen()) return;
  if (silent()) { queue.length = 0; return; }
  const item = queue.shift();
  const short = cineMode() === 'short', lite = liteWanted();
  busy = { item, began: Date.now(), handle: null };
  const mine = busy;
  // the failsafe: a load that never comes, a play not at its held end within LIMIT_MS, a run begun: closed
  mine.timer = setInterval(() => {
    if (busy !== mine) return clearInterval(mine.timer);
    const h = mine.handle, late = Date.now() - mine.began > LIMIT_MS;
    if (h?.done) return finish('closed');
    if (Game.state === 'playing') { h?.close(); return finish('run'); }
    if (late && !h) return finish('timeout');
    if (late && !h.held) { h.close(); finish('timeout'); }
  }, 250);
  import('./unlockcine.js').then((m) => {
    if (busy !== mine) return;
    const h = m.playUnlock({ mode: item.mode, carId: item.carId, level: item.level ?? null, evil: item.evil, lite, short, onClose: () => { if (busy === mine) finish('closed'); } });
    if (!h) return finish('nogl');
    mine.handle = h;
    mine.began = Date.now(); // (the 12 s from the first frame, not the load)
    note({ ...item, lite, short, owned: Progress.owns(item.carId) }, 'started');
  }).catch((error) => { console.warn('cutscene: ' + (error?.message || error)); finish('error'); });
};

// ---- a car bought on the lot: Crazey Jim's sale (its own 'car' is not played as well) ----
export const purchased = (car) => {
  if (!car || !Progress.owns(car.id)) return false;
  owned?.add(car.id);
  return enqueue({ mode: 'jim', carId: car.id });
};

// ---- an ECU bought (ecu.js Ecu.buy, after it saved): ECU UP, or MAX ECU at the car's last ----
const onEcu = (e) => {
  const d = e?.detail;
  if (!d?.car || !(d.to >= 1)) return;
  setTimeout(() => enqueue({ mode: d.max && d.to >= d.max ? 'ecumax' : 'ecu', carId: d.car, level: d.to }), 0); // (a beat later: the showroom's own, with its livery, first)
};

// ---- the watch: what is owned now, against what was ----
const roster = () => {
  const ids = new Set([...CARS, ...EARNED_CARS, ...EVENT_CARS, ...BESPOKE_CARS, ...FILLER_CARS, ...Object.values(SECRET_CARS)].map(c => c.id));
  for (const id of Progress.data.cars || []) ids.add(id);
  return ids;
};
const ownedNow = () => {
  const out = new Set();
  for (const id of roster()) { try { if (Progress.owns(id)) out.add(id); } catch { /* (a car the save cannot judge) */ } }
  return out;
};
let owned = null; // (null until the page has loaded: what the save and the address had by then is not new)
export const look = () => {
  if (!owned || Game.state === 'playing') return; // (a run: looked at once it is over)
  const now = ownedNow();
  const fresh = [...now].filter(id => !owned.has(id));
  owned = now;
  if (!fresh.length || Progress.noSave) return; // (a test visit lends cars by the dozen: nothing played for them)
  if (fresh.length > BULK) { note({ mode: 'bulk', carId: fresh.length + ' cars' }, 'bulk'); return; }
  for (const id of fresh) { const car = carById(id); if (car) enqueue({ mode: car.bespoke ? 'key' : 'car', carId: id }); }
};
let soon = 0;
const lookSoon = () => { clearTimeout(soon); soon = setTimeout(() => { look(); pump(); }, 0); };

// ---- the setting's button (Options > Settings) ----
const showSetting = () => {
  const b = typeof document !== 'undefined' && document.getElementById('cineBtn');
  if (b) b.textContent = 'Cutscenes: ' + WORDS[cineMode()];
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const start = () => setTimeout(() => { owned = ownedNow(); }, 0);
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  for (const name of ['progresschange', 'packschange', 'carchange']) addEventListener(name, lookSoon);
  addEventListener('ecuchange', onEcu);
  setInterval(() => { if (!busy) { look(); pump(); } }, 1000);
  // while one plays, no key reaches the screen under it (Enter would start a run, the arrows move the menu); unlockcine.js's own
  // listener (Esc / Space / Enter: skip) is on the same window, so it still hears them
  addEventListener('keydown', (e) => { if (busy?.handle && !busy.handle.done) e.stopPropagation(); }, true);
  const b = document.getElementById('cineBtn');
  if (b) b.addEventListener('click', () => setCineMode(nextMode(cineMode())));
  showSetting();
}
