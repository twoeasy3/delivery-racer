// A check of the auto brake's strength (the options: 100%, 75%, 50%, 25%, off; the owner, 11-Oct): off the accelerator,
// closing on a slower car in its lane, the player's car brakes by itself that share of its full strength (player.js);
// off, not at all. The setting is the run's (Game.start), and a replay keeps it (replay.js).
//   node scripts/.autobrake-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const { Progress } = await g.load('progress.js');
const { Replay } = await g.load('replay.js');
const { Game, Player, Traffic, Input } = g;
const T = () => g.track.Track;
const testbed = JSON.parse(readFileSync('src/delivery/levels/testbed.json', 'utf8'));
const level = { ...testbed, id: 'autobrake-test', emergencies: undefined };
const LANE = 2;
Object.defineProperty(Input, 'throttle', { get() { return this.fed ? this.fed.throttle : 0; }, configurable: true }); // (off the accelerator)
Object.defineProperty(Input, 'steer', { get() { return this.fed ? this.fed.steer : 0; }, configurable: true });

// the speed lost in 0.25 s, at 25 m/s, 14 m behind a car doing 8 m/s in the same lane, with the auto brake at `share`
const lost = (share, gap = 14) => {
  Progress.data.autoBrake = share;
  g.select(level);
  Game.evil = false;
  Game.start();
  for (const car of Traffic.cars) Object.assign(car, { active: false, fixed: true, cleared: true });
  const s = 600, lat = T().laneOffset(LANE, s);
  Object.assign(Player, { s, lat, speed: 25, launching: false });
  const car = Traffic.cars.find(c => c.dir > 0);
  Traffic.outfit(car, 'commuter', LANE);
  Object.assign(car, { active: true, held: true, unused: false, fixed: false, cleared: false, s: s + gap, lat: T().laneOffset(LANE, s + gap), vs: 8, baseSpeed: 8, latVel: 0, yaw: 0, spin: 0, stun: 0, junction: null, parked: false });
  const before = Player.speed, autoBrake = Player.autoBrake;
  for (let i = 0; i < 30; i++) Game.update(1 / 120);
  const out = { lost: before - Player.speed, autoBrake };
  Game.toMenu();
  return out;
};
try {
  const runs = [1, 0.75, 0.5, 0.25, 0].map(share => ({ share, ...lost(share) }));
  console.log('  speed lost in 0.25 s: ' + runs.map(r => (r.share ? r.share * 100 + '%' : 'off') + ' ' + r.lost.toFixed(2)).join(', ') + ' m/s');
  check(runs.every(r => r.autoBrake === r.share), 'each run takes the setting as it starts (Player.autoBrake)');
  check(runs.every((r, i) => !i || r.lost < runs[i - 1].lost), 'the weaker the setting, the less it brakes');
  // (what coasting loses by itself, the car ahead far off: the braking is what is lost beyond that)
  const coast = lost(1, 400).lost, braked = (r) => r.lost - coast;
  check(Math.abs(braked(runs[2]) / braked(runs[0]) - 0.5) < 0.08 && Math.abs(braked(runs[3]) / braked(runs[0]) - 0.25) < 0.06,
    'braking beyond coasting (' + coast.toFixed(2) + ' m/s): 50% is half of 100%, 25% a quarter (' + (braked(runs[2]) / braked(runs[0])).toFixed(2) + ', ' + (braked(runs[3]) / braked(runs[0])).toFixed(2) + ')');
  check(Math.abs(braked(runs[4])) < 0.01, 'off: nothing beyond coasting, the car ahead or not (' + runs[4].lost.toFixed(2) + ' m/s)');
  // a replay keeps the run's setting, whatever the options say when it is watched
  Progress.data.autoBrake = 0.25;
  g.select('expressway');
  Game.start();
  for (let i = 0; i < 600; i++) Game.update(1 / 120);
  Game.toMenu();
  const rec = Replay.last;
  Progress.data.autoBrake = 1;
  Replay.play(rec);
  check(rec.header.autoBrake === 0.25 && Player.autoBrake === 0.25, 'a replay records the run\'s auto brake (25%) and plays with it, the options at 100%');
  Game.toMenu();
  check(Progress.data.autoBrake === 1, '...and the options as they were once it ends');
  // the save keeps it; something else in its place is not kept
  Progress.data.autoBrake = 0.5;
  Progress.importCode(Progress.exportCode());
  check(Progress.data.autoBrake === 0.5, 'the save keeps the setting');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
