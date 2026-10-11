// A check of the level editor's "Close the loop" (levelSchema.js closeLoop): every lapped level is pulled out
// of shape (a straight made longer, a bend turned further), closed again, and built by the game, which must
// find its road back where it started, facing the same way (track.js: within 1 m). Headless.
//   node scripts/.loop-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { closeLoop, roadEnd } = await g.load('levelSchema.js');
  const loops = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)].filter(level => level.laps);
  const builds = (level, segments) => {
    g.select({ ...level, id: level.id + '-loop-check', segments, pickups: [], obstacles: [] });
    g.Game.loaded = null;
    g.Game.load();
    return g.track.Track.problems.filter(p => p.startsWith('laps:'));
  };
  for (const level of loops) {
    // as it is: closed already, and closing it again changes next to nothing
    const same = closeLoop(level.segments);
    check(!same.problem && same.gap < 1 && same.moved.every(m => Math.abs(m.to - m.from) <= 2), level.id + ': closed as it stands, and closing it moves nothing by more than two metres' + (same.problem ? ' (' + same.problem + ')' : ''));
    // pulled out of shape
    const bent = level.segments.map(seg => ({ ...seg })), straights = [...bent].sort((a, b) => b.length - a.length), bends = bent.filter(seg => seg.curve);
    straights[0].length += 37;
    if (straights[2] && straights[2].length > 30) straights[2].length -= 12;
    bends[Math.floor(bends.length / 2)].curve *= 1.2;
    const open = roadEnd(bent), was = builds(level, bent);
    const closed = closeLoop(bent);
    if (closed.problem) { check(false, level.id + ': ' + closed.problem); continue; }
    const now = builds(level, closed.segments);
    check(was.length > 0 && !now.length && closed.gap < 1, `${level.id}: pulled ${Math.hypot(open.x, open.y).toFixed(1)} m open, closed to ${closed.gap.toFixed(2)} m: the game finds it closed` +
      ` (${closed.moved.map(m => 'segment ' + (m.i + 1) + ' ' + m.from + ' to ' + m.to).join(', ')})` + (now.length ? ' ' + now.join(' | ') : ''));
    check(closed.segments.every(seg => Number.isInteger(seg.length) && seg.length >= 1), level.id + ': every length still a whole number of metres');
  }
  check(!!closeLoop([{ length: 500, curve: 0 }]).problem, 'a road with no bends is not closed, and says why');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
