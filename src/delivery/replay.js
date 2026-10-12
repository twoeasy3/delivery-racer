// ============================================================================
// REPLAY - a run recorded as its inputs, and played back (REPLAY-NOTES.md, "The plan"). A run is the same every
// time from its two seeds (the level load's and its own: util.js random), its set-up and the player's inputs, at a
// fixed step (main.js). So a recording is a header and the inputs, each at the logic step it came in on (not the
// clock: a pause is no step, and the rewind mystery turns the clock back but never the step count):
//   header  the build's rules (version.js logic), the level and its fingerprint, the car and its fingerprint, the
//           side, the tank pieces, the race class, a rival, a forced mystery, the two seeds; and once over, the steps
//           it ran and how it ended
//   inputs  [step, steer x 64, throttle x 64, auto]: the controls each time they change (auto: 1 where the accelerator is
//           held by auto accelerate alone, so the auto brake may act: input.js) (they are rounded to 1/64 as they
//           are read: input.js, so what is recorded is what was driven)
//   events  [step, 'throw' | 'horn' | 'confirm']: what the player did between steps, at the step it came after
//   path    [time, s, lat, yaw, air] every PATH_EVERY steps: where the car was by the clock, for a ghost of the run;
//           kept packed (packPath: whole numbers, each the change from the point before, as one string)
//           (render/ghostcar.js). Where the run was rewound (the rewind mystery) what the rewind undid is dropped, so the
//           path is the run as its clock ended up: a rewind never adds its ten seconds to a ghost (the owner, 11-Oct)
//   checks  a fingerprint of where everything was every CHECK_EVERY steps: played back, a fingerprint that differs
//           means the run has drifted (another browser's maths, a change the fingerprints missed): it stops, and says so
// Only runs on a level of the menu or a special event's stage are recorded (not a screensaver, a hidden level or the editor's).
// ============================================================================
import { Input } from './input.js';
import { Game } from './game.js';
import { LEVEL, LEVELS, LEVEL_INDEX, selectLevel, selectSpecial, setRaceClass } from './levels.js';
import { STAGE_LEVELS } from './events.js';
import { CAR, pinCar, carById } from './cars.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Progress } from './progress.js';
import { BUILD } from './version.js';
import { ReplayStore } from './replaystore.js';

const EVENTS = new Set(['throw', 'horn', 'confirm']);
const CHECK_EVERY = 1200; // logic steps between fingerprints of the state (10 s at 120 a second)
const PATH_EVERY = 24;   // logic steps between the path's points (0.2 s: the ghost is drawn between them)
const FORMAT = 1;

// FNV-1a over a list of numbers and words (numbers to 1e-3: what a replay would show)
const fnv = (items) => {
  let h = 0x811c9dc5;
  for (const item of items) {
    const text = typeof item === 'number' ? String(Math.round(item * 1000) / 1000) : String(item);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ 44, 0x01000193);
  }
  return (h >>> 0).toString(36);
};
// a level's fingerprint: its data as loaded, but not its car and grid, which the race class rewrites (recorded apart)
const levelPrint = (level) => fnv([JSON.stringify(level, (k, v) => (k === 'car' || k === 'grid' ? undefined : v))]);
// taken once, as every level was loaded, before any run could change one (a rival rewrites its level's grid)
const LEVEL_PRINTS = new Map([...LEVELS, ...STAGE_LEVELS].map(level => [level.id, levelPrint(level)])); // (a special event's stages too: events.js)
// a car's fingerprint: what it is (its figures, its model, its perks), not its words
const carPrint = (car) => fnv([JSON.stringify(car, (k, v) => (typeof v === 'function' || k === 'name' || k === 'perk' ? undefined : v))]);
// where everything is, as numbers: the clock, the player, every vehicle in play, every obstacle in play
const stateNow = () => {
  const n = [Game.time, Game.state, Player.s, Player.lat, Player.speed, Player.health];
  for (const c of Traffic.cars) if (c.active) n.push(c.kind, c.s, c.lat);
  for (const o of Collision.obstacles) if (!o.gone) n.push(o.s, o.lat);
  return fnv(n);
};
const q = (v) => Math.round(v * 64); // (the controls, as whole 64ths: they are already rounded so as they are read)

export const Replay = {
  recording: null, // the run being recorded
  last: null,      // the last run recorded, once over (kept in replaystore.js; "Save replay" keeps it for good)
  playing: null,   // the recording being played back: { rec, input, event, drifted, over, ...what it put back }
  speed: 1,        // a playback's speed: 1, 2 or 4 logic steps for each one of time (main.js)
  starting: false, // (Game.start, called by play: any other start ends a playback first)
  onOver: null,    // told when a playback stops before a finish of its own: ('end' | 'drift')

  // ---- recording ----
  // the run has started (Game.start, once everything is dealt): a recording begins, of a menu level only
  begin() {
    if (this.playing) return; // (a playback is not recorded again)
    this.recording = null;
    if (Game.screensaver || Game.raceWatch || !(LEVELS.includes(LEVEL) || STAGE_LEVELS.includes(LEVEL))) return;
    this.recording = {
      format: FORMAT,
      header: {
        logic: BUILD.logic, version: BUILD.version, level: LEVEL.id, levelPrint: LEVEL_PRINTS.get(LEVEL.id),
        car: CAR.id, carPrint: carPrint(CAR), evil: !!Game.evil, tankPieces: Progress.data.tankPieces || 0,
        raceClass: LEVEL.grid && !LEVEL.grid.rival ? LEVEL.grid.kind || null : null, rival: Game.rival || null,
        mystery: Player.nextMystery || '', autoBrake: Player.autoBrake, seed: Game.seed, loadSeed: Game.loadSeed, date: new Date().toISOString(),
      },
      inputs: [], events: [], checks: [], path: [],
      at: { steer: 0, throttle: 0, auto: 0 },
    };
    this.mark();
  },
  // a point of the path: where the car is now, by the clock (any points past the clock dropped first: rewound)
  mark(path = this.recording.path) {
    const r = (v, n) => Math.round(v * n) / n;
    while (path.length && path[path.length - 1][0] > Game.time + 1e-6) path.pop();
    path.push([r(Game.time, 1000), r(Player.s, 100), r(Player.lat, 1000), r(Player.yaw, 1000), r(Player.air, 100)]);
  },
  // a path as kept: each figure a whole number (ms, cm, mm, mrad, cm), the change from the point before, ',' between
  packPath(path) {
    const scale = [1000, 100, 1000, 1000, 100], was = [0, 0, 0, 0, 0], out = [];
    for (const pt of path) for (let i = 0; i < 5; i++) { const v = Math.round(pt[i] * scale[i]); out.push(v - was[i]); was[i] = v; }
    return out.join(',');
  },
  unpackPath(text) {
    if (Array.isArray(text)) return text;
    const scale = [1000, 100, 1000, 1000, 100], was = [0, 0, 0, 0, 0], path = [], n = text ? text.split(',').map(Number) : [];
    for (let j = 0; j + 4 < n.length; j += 5) path.push(was.map((v, i) => (was[i] = v + n[j + i]) / scale[i]));
    return path;
  },
  // an input event (input.js): kept with the step it came after. Not while paused: the game does nothing with them
  // then (Game, Horn), and played back where there is no pause they would
  tap(action) {
    if (this.recording && EVENTS.has(action) && !Game.paused) this.recording.events.push([Game.step, action]);
  },
  // before each logic step (Game.update, with the steps taken so far): the controls are what this step is driven with
  beforeStep(step) {
    if (this.playing) return this.feed(step);
    const rec = this.recording;
    if (!rec) return;
    const steer = q(Input.steer), throttle = q(Input.throttle), auto = Input.auto ? 1 : 0;
    if (steer !== rec.at.steer || throttle !== rec.at.throttle || auto !== rec.at.auto) {
      rec.inputs.push(auto ? [step, steer, throttle, 1] : [step, steer, throttle]);
      rec.at = { steer, throttle, auto };
    }
  },
  // after each logic step: every CHECK_EVERY steps, a fingerprint of where everything is
  afterStep(step) {
    if (this.recording && step % PATH_EVERY === 0) this.mark();
    if (step % CHECK_EVERY !== 0) return;
    const print = stateNow();
    if (this.recording) this.recording.checks.push(print);
    else if (this.playing && !this.playing.drifted) {
      const want = this.playing.rec.checks[step / CHECK_EVERY - 1];
      if (want !== undefined && want !== print) { this.playing.drifted = step; this.halt('drift'); }
    }
  },
  // the run is over (Game.finish, or left for the menu): the recording is closed, and kept (replaystore.js). A
  // playback that reaches its finish: the player's controls back (to skip the delivery at the kerb), nothing more fed
  end(outcome) {
    if (this.playing && outcome && !this.playing.over) { this.playing.over = 'finished'; Input.fed = null; }
    const rec = this.recording;
    this.recording = null;
    if (!rec) return;
    rec.header.steps = Game.step;
    rec.header.outcome = outcome || 'left';
    rec.header.time = Game.time;
    this.mark(rec.path); // (where it ended)
    rec.path = this.packPath(rec.path);
    if (outcome === 'delivered') rec.header.spare = Game.remaining;
    rec.header.wrecks = Game.wrecks;
    rec.header.busts = Game.busts;
    delete rec.at;
    this.last = rec;
    ReplayStore.kept(rec);
  },

  // ---- playing back ----
  // can this recording be played under this build? { ok } or { ok: false, why }
  check(rec) {
    const h = rec?.header;
    if (!h || rec.format !== FORMAT) return { ok: false, why: 'This is not a replay this game can read.' };
    if (h.logic !== BUILD.logic) return { ok: false, why: 'The game has been updated since this replay was recorded.' };
    if (!LEVEL_PRINTS.has(h.level)) return { ok: false, why: 'The level of this replay is no longer in the game.' };
    if (LEVEL_PRINTS.get(h.level) !== h.levelPrint) return { ok: false, why: 'This level has changed since the replay was recorded.' };
    const car = carById(h.car);
    if (!car) return { ok: false, why: 'The car of this replay is no longer in the game.' };
    if (carPrint(car) !== h.carPrint) return { ok: false, why: 'The car has changed since the replay was recorded.' };
    return { ok: true };
  },
  // play a recording back: the level, the side, the car and the rest of the set-up as recorded, both seeds, and its
  // inputs fed in step by step. The save is put back as it was when it ends (stop). False: it can't be (see check)
  play(rec) {
    if (!this.check(rec).ok) return false;
    const h = rec.header;
    this.stop();
    this.end(); // (a run under way is closed first)
    this.playing = { rec, input: 0, event: 0, drifted: 0, over: '', saved: JSON.stringify(Progress.data), noSave: Progress.noSave,
      raceClass: LEVEL.grid?.kind, levelIndex: LEVEL_INDEX, evil: Game.evil, rival: Game.rival, mystery: Player.nextMystery };
    this.speed = 1;
    Progress.noSave = true;
    Progress.data.tankPieces = h.tankPieces;
    const stage = STAGE_LEVELS.find(level => level.id === h.level);
    if (stage) selectSpecial(stage); // (a special event's stage: off the menu's list)
    else selectLevel(LEVELS.findIndex(level => level.id === h.level));
    if (h.raceClass) setRaceClass(h.raceClass);
    Game.evil = h.evil;
    Game.rival = h.rival;
    Player.nextMystery = h.mystery;
    Progress.data.autoBrake = h.autoBrake ?? 1; // (as the run had it: the save is put back when the playback ends)
    pinCar(h.car);
    Game.nextSeed = h.seed;
    Game.nextLoadSeed = h.loadSeed;
    Input.fed = { steer: 0, throttle: 0, auto: false };
    this.starting = true;
    try { Game.start(); } finally { this.starting = false; }
    if (Game.state !== 'playing') { this.stop(); return false; } // (refused: see Game.canStart)
    return true;
  },
  // the player's way in (results, the level card): { ok } or { ok: false, why }, and played if it can be
  watch(rec) {
    const can = this.check(rec);
    if (!can.ok) return can;
    return this.play(rec) ? { ok: true } : { ok: false, why: 'This replay could not be started.' };
  },
  // a playback held where it is: its recording run out before a finish of its own (the run was left part way), or
  // drifted from it. Held paused (Game.togglePause will not go on), the player's controls back, and the page told
  halt(why) {
    const p = this.playing;
    if (!p || p.over) return;
    p.over = why;
    Input.fed = null;
    Game.paused = true;
    this.onOver?.(why);
  },
  // the controls and the events for step `step` (before it is taken)
  feed(step) {
    const p = this.playing, { inputs, events } = p.rec;
    if (p.over) return;
    if (step >= p.rec.header.steps) return this.halt('end'); // (no more was recorded)
    while (p.input < inputs.length && inputs[p.input][0] <= step) {
      const [, steer, throttle, auto] = inputs[p.input++];
      Input.fed = { steer: steer / 64, throttle: throttle / 64, auto: !!auto };
    }
    while (p.event < events.length && events[p.event][0] <= step) Input.emit(events[p.event++][1], true);
  },
  // the playback over (or given up): the save, the car and the controls as they were
  stop() {
    const p = this.playing;
    if (!p) return;
    this.playing = null;
    this.speed = 1;
    Input.fed = null;
    pinCar(null);
    // the save exactly as it was: whatever the playback did to it (the bank, the tank pieces found or lost, a best)
    // goes, keys and all
    const saved = JSON.parse(p.saved);
    for (const key of Object.keys(Progress.data)) if (!(key in saved)) delete Progress.data[key];
    Object.assign(Progress.data, saved);
    Progress.noSave = p.noSave;
    if (p.raceClass) setRaceClass(p.raceClass);
    if (p.levelIndex >= 0) selectLevel(p.levelIndex);
    Game.evil = p.evil;
    Game.rival = p.rival;
    Player.nextMystery = p.mystery;
  },
};
Input.tap = (action) => Replay.tap(action); // (every event passed on: recorded while a run is)
