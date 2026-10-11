// A check of the replays (src/delivery/replay.js, REPLAY-NOTES.md): runs recorded through the game's own recorder and
// played back through its own player come out the same, step for step: plain runs; a run paused part way (the keys
// still pressed while paused are not recorded); a run with a rewind mystery (the clock turned back, the steps not);
// a second run on a level already loaded. While one plays, the player's own controls are not heard. And a recording
// made under other rules, of a changed level or a changed car, is refused, saying which.
//   node scripts/.replay-record-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ ownAll: true });
const { Replay } = await g.load('replay.js');
const { Input, Game, Player, Traffic } = g;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const STEP = 1 / 120;
// the player's hands (what the keys give; the game reads them unless a replay feeds it, as input.js does)
let live = { steer: 0, throttle: 0 };
Object.defineProperty(Input, 'steer', { get() { return this.fed ? this.fed.steer : Math.round(live.steer * 64) / 64; }, configurable: true });
Object.defineProperty(Input, 'throttle', { get() { return this.fed ? this.fed.throttle : Math.round(live.throttle * 64) / 64; }, configurable: true });
let rewinds = 0, lastTime = 0;
// `seconds` of driving by script(i); pauseAt: a step where the game is paused for 3 s, keys pressed and a throw tried
const drive = (seconds, script, pauseAt = -1) => {
  for (let i = 0; i < seconds / STEP && Game.state === 'playing'; i++) {
    if (i === pauseAt) {
      Game.paused = true;
      for (let k = 0; k < 360; k++) { live = { throttle: 0.3, steer: -1 }; Input.emit('throw'); Game.update(STEP); }
      Game.paused = false;
    }
    if (Game.time < lastTime - 1) rewinds++;
    lastTime = Game.time;
    const s = script(i);
    live = { throttle: s.throttle, steer: s.steer };
    if (s.throws) Input.emit('throw');
    if (s.horn) Input.emit('horn');
    Game.update(STEP);
    g.FxQueue.length = 0;
  }
};
const where = () => [Game.state, Game.step, Game.time.toFixed(3), Player.s.toFixed(3), Player.lat.toFixed(3), Player.health.toFixed(2), Traffic.cars.filter(c => c.active).length].join(' ');
const scriptOf = (k) => (i) => ({
  throttle: (i % 2000) > 1850 ? -1 : 1,
  steer: i < 120 * (1 + k) ? (k % 2 ? 0.6 : -0.6) : Math.sin(i / (60 + 20 * k)) > 0.85 ? 0.5 : Math.sin(i / (60 + 20 * k)) < -0.85 ? -0.5 : 0,
  throws: i % 300 === 7, horn: i % 1100 === 50,
});
// record a run, play it back (the player's hands doing something else all along), compare
const roundTrip = ({ id, k = 0, seconds = 40, pauseAt = -1, mystery = '', what }) => {
  g.select(id);
  Game.evil = false;
  Player.nextMystery = mystery;
  Game.start();
  rewinds = 0; lastTime = 0;
  drive(seconds, scriptOf(k), pauseAt);
  const recorded = where(), recRewinds = rewinds, steps = Game.step;
  Game.toMenu();
  Player.nextMystery = '';
  const rec = Replay.last;
  rewinds = 0; lastTime = 0;
  const played = Replay.play(rec);
  for (let i = 0; i < steps && Game.state === 'playing'; i++) {
    live = { throttle: -1, steer: 1 };
    Input.emit('throw'); Input.emit('horn');
    if (Game.time < lastTime - 1) rewinds++;
    lastTime = Game.time;
    Game.update(STEP);
    g.FxQueue.length = 0;
  }
  const back = where(), drifted = Replay.playing?.drifted;
  Game.toMenu();
  check(played && back === recorded && !drifted,
    `${what}: ${id}, ${JSON.stringify(rec).length} bytes (${rec.inputs.length} inputs, ${rec.events.length} events), the same played back (${recorded})` +
    (back !== recorded ? ` / played back: ${back}` : '') + (drifted ? `; drifted at step ${drifted}` : ''));
  return { rec, recRewinds, playRewinds: rewinds };
};
try {
  for (const id of ['expressway', 'tokyo', 'noon']) roundTrip({ id, what: 'a run' });
  const paused = roundTrip({ id: 'night', k: 2, pauseAt: 1500, mystery: 'rewind', what: 'paused 3 s, and a rewind' });
  check(paused.recRewinds === 1 && paused.playRewinds === 1 && paused.rec.events.length === 21,
    `the rewind happened, and again played back (${paused.recRewinds} / ${paused.playRewinds}); the keys pressed while paused not recorded (${paused.rec.events.length} events)`);
  const meadows = roundTrip({ id: 'mystery-meadows', k: 0, pauseAt: 1500, mystery: 'rewind', what: 'paused 3 s, and a rewind' });
  check(meadows.recRewinds === 1 && meadows.playRewinds === 1, `the rewind there too (${meadows.recRewinds} / ${meadows.playRewinds})`);
  // a second run on the level already loaded: its recording holds the load's seed, and plays back as well
  roundTrip({ id: 'tokyo', k: 3, what: 'a second run on a level already loaded' });
  // refused: other rules, a changed level, a changed car
  const rec = Replay.last, copy = (edit) => { const r = JSON.parse(JSON.stringify(rec)); edit(r.header); return r; };
  const why = (r) => Replay.check(r).why || 'played';
  check(/updated/.test(why(copy(h => { h.logic = 'other'; }))), 'a recording under other rules is refused: ' + why(copy(h => { h.logic = 'other'; })));
  check(/level has changed/.test(why(copy(h => { h.levelPrint = 'x'; }))), 'a changed level is refused: ' + why(copy(h => { h.levelPrint = 'x'; })));
  check(/car has changed/.test(why(copy(h => { h.carPrint = 'x'; }))), 'a changed car is refused: ' + why(copy(h => { h.carPrint = 'x'; })));
  check(Replay.check(rec).ok, 'and the recording itself is not');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
