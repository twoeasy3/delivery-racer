// A check of the traffic with quirks of its own (CONFIG.vehicles: icecream, binlorry, learner, boyracer,
// caravan), headless, on Gimmick Road 2: that each turns up, and does what it is meant to.
//   node scripts/.traffic-quirks-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  g.select('gimmick-road-2');
  g.Player.testGhost = true;
  g.Game.start();
  g.drive(0, 0);
  const seen = {}, stopped = new Set(), swayed = {};
  let jingles = 0, binHazards = false, tapped = false, tailgated = false;
  for (let t = 0; t < 150; t += 1 / 60) {
    g.Player.s = Math.min(g.Player.s, 3000); // (held back from the drawbridge end of the level: only the traffic is looked at)
    g.Game.update(1 / 60);
    jingles += g.FxQueue.filter(f => f.type === 'sound' && f.name === 'jingle').length;
    g.FxQueue.length = 0;
    for (const car of g.Traffic.cars) {
      if (!car.active) continue;
      seen[car.kind] = (seen[car.kind] || 0) + 1;
      if (car.kind === 'binlorry' && car.binStop > 0 && Math.abs(car.vs) < 0.3) { stopped.add(car); if (car.hazards) binHazards = true; }
      if (car.kind === 'learner' && car.hesitant && car.tap > 0) tapped = true;
      if (car.kind === 'caravan' && !car.junction) {
        const off = car.lat - g.track.Track.laneOffset(car.lane, car.s), w = swayed[car.paint] || (swayed[car.paint] = { lo: 0, hi: 0 });
        if (car.pendingLane === null && Math.abs(off) < 1) { w.lo = Math.min(w.lo, off); w.hi = Math.max(w.hi, off); }
      }
      const gap = g.Player.s - car.s;
      if (car.kind === 'boyracer' && car.dir > 0 && gap > 0 && gap < g.Player.hl + car.hl + g.CONFIG.attitude.tailgate + 1 && Math.abs(car.lat - g.Player.lat) < 1.5) tailgated = true;
    }
  }
  for (const kind of ['icecream', 'binlorry', 'learner', 'boyracer', 'caravan']) check(seen[kind] > 0, kind + ': turned up in the traffic');
  check(jingles > 0, 'ice cream van: its tune was played near the player (' + jingles + ' bars)');
  check(stopped.size > 0 && binHazards, 'bin lorry: pulled up where it was, hazards on (' + stopped.size + ' did)');
  check(tapped, 'learner: dabbed its brakes');
  const widest = Math.max(0, ...Object.values(swayed).map(w => w.hi - w.lo));
  check(widest > 0.4, 'caravan: swayed about its lane (' + widest.toFixed(2) + ' m)');
  console.log('         (a boy racer sat on the player\'s bumper: ' + (tailgated ? 'yes' : 'not seen in this run') + ')');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
