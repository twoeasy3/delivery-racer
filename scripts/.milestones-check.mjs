// A check of the milestone counters (src/delivery/milestones.js, Progress.count), headless.
//   node scripts/.milestones-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Progress } = await g.load('progress.js');
  const { Milestones } = await g.load('milestones.js');
  const P = g.Player, G = g.Game, T = g.Traffic, M = g.CONFIG.milestones, stats = Progress.data.stats;
  const keys = Object.keys(M).filter(k => Array.isArray(M[k]));
  check(keys.every(k => M[k].every(at => g.Message.pick('milestones', k + '_' + at).includes(': '))), 'a title for every milestone of the ' + keys.length + ' counters');
  check(stats && Object.keys(stats).length === 0, 'a save from before the counters starts them at nothing');
  const start = (id = 'suburbs') => { g.select(id); G.evil = false; P.testGhost = true; g.said.length = 0; G.start(); g.drive(1, 0); };
  const said = (text) => g.said.some(line => line.includes(text));

  // ---- a threshold crossed while the level is driven is counted, and nothing is said of it
  start();
  Progress.count('packagesLanded', 9);
  g.run(0.1);
  check(stats.packagesLanded === 9 && !said('Paper boy'), '9 packages: counted, nothing said');
  Progress.count('packagesLanded');
  g.run(0.1);
  check(G.state === 'playing' && stats.packagesLanded === 10, 'the 10th is counted mid-run (' + stats.packagesLanded + ')');
  check(!said('Paper boy') && !g.Message.lines.some(l => l.text.includes(': ')), '...and its milestone ("' + g.Message.pick('milestones', 'packagesLanded_10') + '") is not said during the run');

  // ---- a police car seen, then left behind
  for (const c of T.cars) c.active = false;
  const cop = T.cars[0];
  const place = (ahead) => Object.assign(cop, { active: true, kind: 'police', toad: null, junction: null, stun: 0, s: P.s + ahead, lat: P.lat + 6, dir: 1 });
  place(20); Milestones.update(0);
  place(-(M.outrun + 5)); Milestones.update(0);
  check(stats.copsOutrun === 1, 'a police car that saw the player and fell ' + M.outrun + ' m behind is outrun');
  Milestones.update(0);
  check(stats.copsOutrun === 1, '...once');
  place(-(M.outrun + 5) * 2); Milestones.update(0);
  check(stats.copsOutrun === 1, 'one that was never near is not');
  cop.active = false;

  // ---- wrecks and busts, as the run counts them
  G.wrecks += 2; G.busts += 1;
  Milestones.update(0);
  check(stats.wrecks === 2 && stats.busts === 1, 'the run\'s wrecks and busts are counted (' + stats.wrecks + ', ' + stats.busts + ')');

  // ---- the end of a run: the distance, and the level
  start();
  g.run(10);
  const km = P.s / 1000;
  G.finish('timeout');
  check(Math.abs(stats.kmDriven - km) < 0.011 && !stats.levelsDelivered, 'a failed run: ' + stats.kmDriven + ' km driven, no level delivered');
  start();
  g.run(5);
  G.finish('delivered');
  check(stats.levelsDelivered === 1 && g.Message.lines.some(l => l.text.includes('On the payroll')), 'a delivery: 1 level delivered, and its milestone');
  check(!Progress.countDirty, 'and the counters are saved with the run');
  check(JSON.parse(localStorage.getItem('delivery_racer_progress_backup')).stats.levelsDelivered === 1, 'in local storage (the cookie holds no counters: see progress.js)');

  // ---- packages landed, for real: a run on a busy level, throwing all the way
  start('ring-road');
  P.testGhost = false;
  const had = stats.packagesLanded;
  g.run(40, () => { g.Input.emit?.('throw'); });
  console.log('  (' + (stats.packagesLanded - had) + ' packages landed in 40 s of throwing on Ring Road' + (g.Input.emit ? '' : ': Input.emit is not exposed, nothing thrown') + ')');
  check(!g.track.Track.problems.length && ['playing', 'finished'].includes(G.state), 'the run goes on as ever (' + G.state + ')');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
