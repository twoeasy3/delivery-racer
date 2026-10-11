// A check of the replays as the player has them (replaystore.js, render/replayui.js, REPLAY-NOTES.md Phase B): a run
// over is kept as its level's last, and its best when delivered; "Save replay" keeps one until deleted, and all of it
// is in local storage, read back. A playback changes nothing: the save (bank, best times, the TANK RAGE pieces) is as
// it was once it ends, and nothing is written while it plays; it starts with the pieces its run had. A run left part
// way plays to where it was left and is held there; a drifted one is held where it drifted; a run of the player's own
// started after a playback is the player's, with the save as it was.
//   node scripts/.replay-store-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ ownAll: true });
const { Replay } = await g.load('replay.js');
const { ReplayStore } = await g.load('replaystore.js');
const { Input, Game } = g;
const { Progress } = await g.load('progress.js');
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const STEP = 1 / 120;
let live = { steer: 0, throttle: 0 };
// (rounded to 64ths as they are read, as input.js does)
Object.defineProperty(Input, 'steer', { get() { return this.fed ? this.fed.steer : Math.round(live.steer * 64) / 64; }, configurable: true });
Object.defineProperty(Input, 'throttle', { get() { return this.fed ? this.fed.throttle : Math.round(live.throttle * 64) / 64; }, configurable: true });
const steps = (n, until = () => false) => { for (let i = 0; i < n && !until(); i++) { Game.update(STEP); g.FxQueue.length = 0; } };
const stored = () => localStorage.getItem('delivery_replays');
const saveNow = () => JSON.stringify(Progress.data);

try {
  Progress.noSave = false;
  Progress.data.tankPieces = 2;
  // a run of the player's own, to the end of Expressway, flat out down the middle: the first of the seeds 1, 2, ...
  // that gets there (so the check is the same every time)
  let seed = 0;
  do {
    seed++;
    if (Game.state !== 'start') Game.toMenu();
    g.select('expressway');
    Game.evil = false;
    Game.nextSeed = seed;
    Game.nextLoadSeed = seed;
    Game.start();
    live = { steer: 0, throttle: 1 };
    steps(120 * 200, () => Game.state !== 'playing');
  } while (Game.outcome !== 'delivered' && seed < 20);
  console.log('  (seed ' + seed + ')');
  const run = Replay.last;
  check(Game.outcome === 'delivered' && run?.header.outcome === 'delivered' && run.header.spare > 0,
    `a run delivered (${Game.outcome}, ${run?.header.spare?.toFixed(1)} s to spare), its recording closed with its time to spare`);
  check(run.header.tankPieces === 2, 'it recorded the tank pieces it started with (' + run.header.tankPieces + ')');
  let list = ReplayStore.list('expressway');
  check(list.length === 1 && list[0].kind === 'best' && list[0].rec === run, 'kept as the level\'s best (and its last: listed once) ' + JSON.stringify(list.map(e => e.kind)));
  ReplayStore.save(run);
  check(ReplayStore.isSaved(run), 'Save replay keeps it');
  ReplayStore.forget();
  list = ReplayStore.list('expressway');
  check(list.map(e => e.kind).join() === 'best,saved' && list[1].rec.header.date === run.header.date, 'all of it in local storage, read back: ' + list.map(e => e.kind).join());
  Game.toMenu();

  // playing it back changes nothing in the save, writes nothing, and starts with the run's own tank pieces
  Progress.data.tankPieces = 4; // (more found since)
  Progress.save();
  let before = saveNow();
  const storedBefore = stored(), cookieBefore = document.cookie;
  check(Replay.watch(list[1].rec).ok && Replay.playing, 'the saved replay plays');
  check(Game.tankPieces === 2 && Progress.data.tankPieces === 2, 'with the tank pieces its run had (' + Game.tankPieces + '), not the player\'s now (4)');
  live = { steer: 1, throttle: -1 };
  steps(120 * 200, () => Game.state !== 'playing');
  check(Game.outcome === 'delivered' && Math.abs(Game.remaining - run.header.spare) < 1e-6, `played back to the same delivery (${Game.remaining.toFixed(3)} s to spare)`);
  check(!Input.fed && Replay.playing.over === 'finished', 'at its finish the player\'s controls are back (to skip the delivery), nothing more fed');
  check(stored() === storedBefore && document.cookie === cookieBefore, 'nothing written while it played (the replays, the save\'s cookie)');
  Game.toMenu();
  check(saveNow() === before && Progress.data.tankPieces === 4, 'once over, the save as it was: bank $' + Progress.data.money + ', tank pieces ' + Progress.data.tankPieces);
  check(!Progress.noSave && Replay.playing === null, '...and saving again');

  // a run left part way: kept as the last, played to where it was left and held there
  g.select('expressway');
  Game.start();
  live = { steer: 0.3, throttle: 1 };
  steps(120 * 12);
  const leftAt = Game.step;
  Game.exit();
  const left = Replay.last;
  before = saveNow(); // (the run's own counters in it)
  list = ReplayStore.list('expressway');
  check(left.header.outcome === 'left' && list.map(e => e.kind).join() === 'best,last,saved', 'a run left after 12 s kept as the last: ' + list.map(e => e.kind).join());
  check(Replay.watch(left).ok, 'it plays');
  steps(120 * 30);
  check(Replay.playing?.over === 'end' && Game.paused && Game.step === leftAt, `held where it was left (step ${Game.step} of ${leftAt}), paused`);
  Game.togglePause();
  check(Game.paused, '...and Pause does not set it going again');
  // a run of the player's own from there (Enter on the results): the playback over first
  Game.start();
  check(Replay.playing === null && saveNow() === before && Game.tankPieces === 4, 'a run of the player\'s own after it: the playback over, the save as it was (tank pieces ' + Game.tankPieces + ')');
  Game.toMenu();

  // a run that drifts from its recording is held where it does
  before = saveNow();
  const drifted = JSON.parse(JSON.stringify(run));
  drifted.checks[1] = 'x';
  check(Replay.watch(drifted).ok, 'a recording whose run no longer matches it starts');
  steps(120 * 60);
  check(Replay.playing?.over === 'drift' && Replay.playing.drifted === 2400 && Game.paused, 'and is held where it drifts (step ' + Replay.playing?.drifted + ')');
  Game.toMenu();
  check(saveNow() === before, '...the save as it was');

  // deleted
  ReplayStore.remove(run);
  ReplayStore.forget();
  check(!ReplayStore.isSaved(run) && ReplayStore.list('expressway').map(e => e.kind).join() === 'best,last', 'a saved replay deleted');
  // out of date: listed, not played
  const old = JSON.parse(JSON.stringify(run));
  old.header.logic = 'old';
  const said = Replay.watch(old);
  check(!said.ok && /updated/.test(said.why) && !Replay.playing, 'one made under other rules is not played: ' + said.why);
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
