// True speed (CONFIG.trueSpeed, Track.pathScale): progress along the road is the distance driven over the length of the car's own
// line, so the inside of a bend is shorter and the outside longer; a straight is unchanged; the scale stays inside its bounds.
//   node scripts/.truespeed-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
g.select('monza');
g.Game.start();
const Track = g.track.Track, CONFIG = g.CONFIG;
const T = CONFIG.trueSpeed;
check(T.on === true, 'true speed is on');
let bends = 0, inner = 0, outer = 0, flat = 0, straights = 0, bounded = true;
for (let s = 0; s < Track.length; s += 3) {
  const b = Track.bend(s);
  for (const lat of [-6, -3, 0, 3, 6]) {
    const k = Track.pathScale(s, lat);
    if (k < 1 / T.most - 1e-9 || k > 1 / T.least + 1e-9) bounded = false;
    if (Math.abs(b * lat) < 1e-3) { straights++; if (Math.abs(k - 1) < 2e-3) flat++; }
    else if (Math.abs(b * lat) > 1e-6) { bends++; const insideOfBend = b * lat > 0; if (insideOfBend && k > 1) inner++; else if (!insideOfBend && k < 1) outer++; }
  }
}
check(straights > 0 && flat === straights, 'on a straight (or at the centre line) every lane covers the road at about 1x (' + straights + ' samples)');
check(bends > 0 && inner + outer === bends, 'inside of a bend scales above 1, outside below 1 (' + bends + ' samples; inside ' + inner + ', outside ' + outer + ')');
check(bounded, 'the scale stays within [1/most, 1/least]');
T.on = false;
check(Track.pathScale(100, 5) === 1, 'switched off, the scale is 1');
T.on = true;
console.log(failures ? failures + ' failed' : 'all ok');
process.exitCode = failures ? 1 : 0;

