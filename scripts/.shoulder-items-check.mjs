// A check of pickups and obstacles on the expressway's shoulders (lane: 'left' | 'right', as levels.js says):
// a row of four across a two-lane road (left shoulder, lane 0, lane 1, right shoulder) is no level problem,
// each one sits where it should, and each is collected (or hit) by driving over it. Headless.
//   node scripts/.shoulder-items-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Pickups } = await g.load('pickups.js');
  const { checkLevel } = await g.load('levelSchema.js');
  const P = g.Player, G = g.Game, LANES = ['left', 0, 1, 'right'];
  for (const drive of ['right', 'left']) {
    for (const lanes of [2, 4]) {
      const across = lanes === 2 ? LANES : ['left', 0, 1, 2, 3, 'right'];
      const level = { id: 'shoulder-check', name: 'Shoulder check', lanes, drive, tip: 10, clock: { good: 200, evil: 200 }, traffic: {}, trafficCount: 0, oncomingCount: 0,
        segments: [{ length: 1500, curve: 0 }],
        pickups: across.map(lane => ({ type: 'cash20', s: 400, lane })),
        obstacles: [{ s: 900, lane: 'left' }, { s: 900, lane: 'right' }] };
      const what = lanes + ' lanes, driving on the ' + drive + ': ';
      g.select(level);
      G.loaded = null;
      G.evil = false;
      G.start();
      const T = g.track.Track;
      check(!T.problems.length, what + 'a row of ' + across.length + ' pickups, shoulder to shoulder, and an obstacle on each shoulder: no level problems' + (T.problems.length ? ' (' + T.problems.join(' | ') + ')' : ''));
      const schema = checkLevel(level, { rules: false }).filter(p => p.key === 'pickups' || p.key === 'obstacles');
      check(!schema.length, what + 'nor any by the schema' + (schema.length ? ' (' + schema.map(p => p.text).join(' | ') + ')' : ''));
      const row = Pickups.items.filter(p => p.s === 400), lats = row.map(p => p.lat);
      const sorted = [...lats].sort((a, b) => a - b), gaps = sorted.slice(1).map((lat, i) => lat - sorted[i]);
      check(row.length === across.length && gaps.every(gap => gap > 2), what + 'they sit side by side, at least 2 m apart (' + lats.map(lat => lat.toFixed(1)).join(', ') + ')');
      const lo = T.laneOffset(0, 400), hi = T.laneOffset(lanes - 1, 400);
      check(Math.min(...lats) < Math.min(lo, hi) - 1 && Math.max(...lats) > Math.max(lo, hi) + 1, what + 'the outer two are out beyond the lanes, on the shoulders');
      check(lats.every(lat => lat >= T.lo(400) && lat <= T.hi(400)), what + 'and all on the paved width (' + T.lo(400).toFixed(1) + ' to ' + T.hi(400).toFixed(1) + ')');
      // each driven over, one run apiece
      let taken = 0;
      for (let i = 0; i < across.length; i++) {
        G.start();
        P.testGhost = true;
        const item = Pickups.items.filter(p => p.s === 400)[i];
        Object.assign(P, { s: 380, lat: item.lat, speed: 20, launching: false });
        g.drive(1, 0);
        g.run(2.5, () => { P.lat = item.lat; });
        if (item.taken) taken++;
      }
      check(taken === across.length, what + 'each is collected by driving over it (' + taken + ' of ' + across.length + ')');
      for (const side of ['left', 'right']) {
        G.start();
        P.testGhost = false;
        const o = g.Collision.obstacles.find(x => Math.abs(x.s - 900) < 1 && Math.sign(x.lat) === Math.sign(T.laneOffset(side, 900)));
        const health = P.health;
        Object.assign(P, { s: 880, lat: o ? o.lat : 0, speed: 20, launching: false, shield: 0 });
        g.run(2.5, () => { if (o) P.lat = o.lat; });
        check(!!o && (o.gone || P.health < health), what + 'the obstacle on the ' + side + ' shoulder is there to be hit');
      }
    }
  }
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
