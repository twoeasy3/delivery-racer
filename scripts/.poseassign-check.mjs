// A check of the blueprint cards' poses (src/delivery/render/poseassign.js; CHECKLIST 479): the five poses (top, hero, front, rear,
// side), each with its numbers in carstill.js POSES; the owner's FIXED pose per car (every id a real car, every pose a real one); a
// fixed car always gets its pose (posePick, and in a pack's row, variedPoses); a car without one gets the hash pick over the five;
// all five reachable by the hash; a pack's hash cars never share a pose with the card before them; and the table is render-only
// (no rules file imports it, so the replay fingerprint does not see it).
//   node scripts/.poseassign-check.mjs
import { boot } from './delivery-headless.mjs';
import { logicFiles } from './logic-hash.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { POSE_NAMES, FIXED_POSES, hashPose, posePick, variedPoses } = await g.load('render/poseassign.js');
  const C = await g.load('cars.js');
  const { IDEA_CARS } = await g.load('ideas.js');
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.EVENT_CARS, ...C.BESPOKE_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS),
    ...Object.values(C.LEVEL_CARS), C.AMPHIBIOUS_TANK, ...IDEA_CARS].filter(Boolean);
  const ids = [...new Set(all.map(c => c.id))];
  check(POSE_NAMES.join() === 'top,hero,front,rear,side', 'the five poses: ' + POSE_NAMES.join(', '));
  // carstill.js imports three.js models; read its POSES table's keys from the source (a check without WebGL)
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/delivery/render/carstill.js', import.meta.url), 'utf8');
  const table = src.slice(src.indexOf('export const POSES = {'), src.indexOf('};', src.indexOf('export const POSES = {')));
  const numbered = POSE_NAMES.filter(p => new RegExp('\\n\\s*' + p + ': \\{ lift:').test(table));
  check(numbered.length === 5, 'each pose has its numbers in carstill.js POSES: ' + numbered.join(', '));
  const fixed = Object.entries(FIXED_POSES);
  const unknown = fixed.filter(([id]) => !ids.includes(id)).map(([id]) => id);
  check(!unknown.length, fixed.length + ' fixed poses, every id a real car' + (unknown.length ? ': NOT CARS ' + unknown.join(', ') : ''));
  const badPose = fixed.filter(([, p]) => !POSE_NAMES.includes(p));
  check(!badPose.length, 'every fixed pose a real pose' + (badPose.length ? ': ' + JSON.stringify(badPose) : ''));
  const counts = Object.fromEntries(POSE_NAMES.map(p => [p, fixed.filter(([, q]) => q === p).length]));
  check(fixed.every(([id, p]) => posePick(id) === p), 'a fixed car always gets its pose: ' + JSON.stringify(counts));
  const loose = ids.filter(id => !FIXED_POSES[id]);
  check(loose.every(id => posePick(id) === hashPose(id) && POSE_NAMES.includes(posePick(id)) && posePick(id) === posePick(id)),
    loose.length + ' cars without one get the stable hash pick');
  const hashCounts = Object.fromEntries(POSE_NAMES.map(p => [p, ids.filter(id => hashPose(id) === p).length]));
  check(Object.values(hashCounts).every(n => n > 0), 'the hash reaches all five (over the ' + ids.length + ' cars): ' + JSON.stringify(hashCounts));
  const game = Object.fromEntries(POSE_NAMES.map(p => [p, ids.filter(id => posePick(id) === p).length]));
  check(Object.values(game).every(n => n > 0), 'all five drawn in the game: ' + JSON.stringify(game));
  // a pack's row: fixed cars keep theirs, hash cars differ from the card before (random rows of the roster, seeded)
  let seed = 7, keep = true, differ = true;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 500; i++) {
    const row = Array.from({ length: 10 }, () => ids[Math.floor(rnd() * ids.length)]), v = variedPoses(row);
    if (row.some((id, j) => FIXED_POSES[id] && v[j] !== FIXED_POSES[id])) keep = false;
    if (row.some((id, j) => !FIXED_POSES[id] && j > 0 && v[j] === v[j - 1])) differ = false;
  }
  const six = variedPoses(Array(6).fill(loose[0]));
  check(keep && differ && six.every((p, j) => j === 0 || p !== six[j - 1]), 'a pack\'s row: fixed cars keep their pose, a hash car never shares the card before\'s (500 rows; six of ' + loose[0] + ': ' + six.join(', ') + ')');
  const rules = logicFiles();
  check(!rules.some(f => f.includes('poseassign')), 'poseassign.js is not a rules file (the replay fingerprint does not see it)');
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e?.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
