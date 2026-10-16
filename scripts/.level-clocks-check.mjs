// THE LEVEL TOOLS DRIVE OFF-TIER LEVELS (CHECKLIST 344): scripts/level-clocks.mjs and scripts/obstacle-audit.mjs turn the garage's
// car rule off (tiers.js: a level's tier or its "allowedCars"). With it on, Game.start refused every level whose tier is not the
// reference car's: level-clocks said "NOT DELIVERED (still driving)" for a level alone and a 0.0 s clean run after another level,
// and the audit fell over on the empty track (TypeError). Here: two off-tier levels in one run of level-clocks (Tokyo, the Toy
// Room) each give a clean run of over 60 s in the Sportscompact, and the audit of Construction runs through.
//   node scripts/.level-clocks-check.mjs
import { spawnSync } from 'node:child_process';

let failed = 0;
const check = (ok, what) => { console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) failed++; };
const run = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 15 * 60 * 1000 });

const clocks = run(['scripts/level-clocks.mjs', 'tokyo', 'toys']);
const text = clocks.stdout + clocks.stderr;
for (const id of ['tokyo', 'toys']) {
  const m = text.match(new RegExp('^' + id + ': clean run ([\\d.]+) s in the (\\S+),', 'm'));
  check(!!m && Number(m[1]) > 60 && m[2] === 'sport', id + ': delivered in the reference car (' + (m ? m[1] + ' s in the ' + m[2] : text.split('\n').find(l => l.startsWith(id)) || 'no line') + ')');
}
const audit = run(['scripts/obstacle-audit.mjs', 'construction']);
check(audit.status === 0 && /^construction: \d+ obstacles/m.test(audit.stdout), 'obstacle-audit construction runs through (exit ' + audit.status + ')');
console.log(failed ? failed + ' failed' : 'all ok');
process.exit(failed ? 1 : 0);
