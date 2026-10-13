// Times a level (any id: on the menu, hidden, or an event's) in the cars and ECUs named: a clean run, flat out as a ghost
// down the starting lane, nothing in its way (as scripts/level-clocks.mjs times a level's clock, cleanrun.js), the car
// driven at that ECU as a free try at the player's own ECU is (the level's `ownEcu`). The Concept Strike's levels
// (CHECKLIST 224) were sized by it.
//   node scripts/strike-times.mjs back-roads fishbowl:1 fishbowl:5 windsong:5
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2), id = args[0], runs = args.slice(1).map(a => a.split(':'));
const g = await boot({ ownAll: true });
try {
  const { Progress } = await g.load('progress.js');
  const { cleanRun } = await g.load('cleanrun.js');
  const { STAGE_LEVELS } = await g.load('events.js');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS), ...STAGE_LEVELS];
  const level = all.find(l => l.id === id);
  if (!level) throw new Error('no such level: ' + id);
  for (const [car, ecu] of runs) {
    const was = { car: level.car, ownEcu: level.ownEcu };
    Progress.data.maxed = []; (Progress.data.blueprints ||= {})[car] = (Number(ecu) - 1) * 5;
    Object.assign(level, { car, ownEcu: true });
    g.select(level);
    const marks = []; const upd = g.Game.update.bind(g.Game); let tt = 0, next = 0;
    if (process.env.TRACE) g.Game.update = (dt) => { upd(dt); tt += dt; if (g.Player.s >= next) { marks.push(Math.round(g.Player.s) + 'm@' + tt.toFixed(1) + 's ' + g.Player.speed.toFixed(0)); next += (g.Player.s > 540 && g.Player.s < 720 ? 10 : 100); } };
    const run = cleanRun();
    g.Game.update = upd;
    if (marks.length) console.log('   ' + marks.join(' | '));
    Object.assign(level, was);
    console.log(`${id}  ${car} ECU${ecu}: ${run.delivered ? run.time.toFixed(1) + ' s' : 'NOT DELIVERED (' + run.outcome + ')'}  top ${g.Player.maxSpeed?.toFixed?.(1) ?? '?'}`);
  }
} finally { await g.close(); }
process.exit(0);
