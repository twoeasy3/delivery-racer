// A check of gravel traps (a level's "gravel": Track.gravelAt, CONFIG.gravel), headless, on Monza and Spa:
//   node scripts/.gravel-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const P = g.Player, G = g.Game;
  for (const id of ['monza', 'spa']) {
    g.select(id);
    G.start();
    const T = g.track.Track, GR = g.CONFIG.gravel;
    check(!T.problems.length && T.gravels.length > 0, id + ': ' + T.gravels.length + ' pieces of gravel, no problems' + (T.problems.length ? ' (' + T.problems.join(' | ') + ')' : ''));
    // the widest bed, and a spot in the middle of it; and a spot on plain run-off as far out, where there is no gravel
    let best = null;
    for (const piece of T.gravels) for (let s = piece.from + 2; s < piece.to; s += 4) { const band = T.gravelBand(piece, s); if (band && (!best || band[1] - band[0] > best.width)) best = { piece, s, width: band[1] - band[0], band }; }
    const lat = (b) => b.piece.sign < 0 ? T.laneLo(b.s) - (b.band[0] + b.band[1]) / 2 : T.laneHi(b.s) + (b.band[0] + b.band[1]) / 2;
    check(best && T.gravelAt(best.s, lat(best)) && !T.gravelAt(best.s, 0) && !T.gravelAt(best.s, best.piece.sign * (T.laneHi(best.s) + best.band[0] - 0.3)),
      id + ': its widest bed is ' + best.width.toFixed(1) + ' m across at s ' + best.s + ', ' + best.band[0].toFixed(1) + ' m out from the lane; the road and the strip before it are not gravel');
    // a car put in it at speed, hands off, against one on the road: how far each gets in 2 s
    const run = (inGravel) => {
      G.start();
      for (const car of g.Traffic.cars) car.active = false;
      Object.assign(P, { s: best.s, lat: inGravel ? lat(best) : 0, speed: 40, launching: false, shield: 0 });
      g.drive(1, 0);
      let beached = false, v1 = null;
      g.run(4, (t) => { for (const car of g.Traffic.cars) car.active = false; if (inGravel) P.lat = lat({ ...best, s: Math.min(P.s, best.piece.to - 1), band: T.gravelBand(best.piece, Math.min(P.s, best.piece.to - 1)) || best.band }); if (P.beached > 0) beached = true; if (v1 === null && t >= 1) v1 = P.speed; return false; });
      return { v1, beached, gone: P.s - best.s, said: g.said.some(line => line.includes('Beached')) };
    };
    const road = run(false), bed = run(true);
    check(bed.v1 < road.v1 * 0.5, id + ': from 144 km/h, a second in the gravel leaves ' + (bed.v1 * 3.6).toFixed(0) + ' km/h (on the road: ' + (road.v1 * 3.6).toFixed(0) + ')');
    console.log('         (in 4 s: ' + bed.gone.toFixed(0) + ' m gone in the gravel, ' + road.gone.toFixed(0) + ' m on the road; beached: ' + bed.beached + ')');
  }
  g.select('albert-park');
  G.start();
  check(g.track.Track.gravels.length === 0, 'albert-park: no gravel (none is mapped)');
  console.log(failures ? failures + ' FAILED' : 'all checks passed');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
process.exit(failures ? 1 : 0);
