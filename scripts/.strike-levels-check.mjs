// A check of the Concept Strike's own levels (CHECKLIST 224; events.json concept-strike days[].level, levels.js EVENT_MAPS):
// each day's stage level is driven by a clean run (cleanrun.js: flat out as a ghost down the starting lane, nothing in its
// way, the run the game's clocks are worked out from) in the cars that will be driven there, each at the ECU it is driven at
// (the free try's `ownEcu`): the day's car at ECU1 (the slowest: a free try with no blueprints) and at ECU5, the car of the
// day's task 2 (the day before's concept car, owned, so at its max ECU), and the fastest car in the game (the Wind-Song
// maxed). The owner, 13-Oct: about 50 s for the fast case (the day's car maxed); the clock set for the slow case.
//   node scripts/.strike-levels-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ ownAll: true });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Progress } = await g.load('progress.js');
  const { cleanRun } = await g.load('cleanrun.js');
  const { Events } = await g.load('events.js');
  const { CONFIG } = await g.load('config.js');
  const strike = Events.specials.find(e => e.id === 'concept-strike');
  // a clean run of the level in that car at that ECU (its blueprints: 5 an ECU step), lent as the free try lends it
  const time = (level, car, ecu) => {
    const was = { car: level.car, ownEcu: level.ownEcu };
    Progress.data.maxed = []; (Progress.data.blueprints ||= {})[car] = (ecu - 1) * 5;
    Object.assign(level, { car, ownEcu: true });
    g.select(level);
    const run = cleanRun();
    Object.assign(level, was);
    if (was.car === undefined) delete level.car;
    if (was.ownEcu === undefined) delete level.ownEcu;
    return run.delivered ? run.time : Infinity;
  };
  const C = CONFIG.clock, round = (t) => Math.round(t / C.round) * C.round;
  strike.days.forEach((day, i) => {
    const level = day.level, prev = day.tasks.find(t => t.car && !t.featured)?.car;
    if (!level) { check(false, 'day ' + (i + 1) + ': no level of its own'); return; }
    const slow = time(level, day.car, 1), fast = time(level, day.car, 5), before = prev ? time(level, prev, 5) : null, top = time(level, 'windsong', 5);
    const s = (t) => (Number.isFinite(t) ? t.toFixed(1) + ' s' : 'NOT DELIVERED');
    check([slow, fast, before ?? 0, top].every(Number.isFinite), level.id + ' (' + level.stage.map + '): delivered by every car: ' + day.car + ' ECU1 ' + s(slow) + ', ECU5 ' + s(fast) + (prev ? ', ' + prev + ' ECU5 ' + s(before) : '') + ', windsong ECU5 ' + s(top));
    check(fast >= 45 && fast <= 58, '...the day\'s car maxed takes about 50 s (' + s(fast) + ')');
    check(slow <= 70 && (before === null || before <= 70), '...the slowest car driven there (the free try at ECU1' + (prev ? ', the ' + prev + ' maxed' : '') + ') takes 70 s at most');
    check(top >= 30, '...the fastest car in the game still has 30 s of it (' + s(top) + ')');
    const worst = Math.max(slow, before ?? 0);
    check(level.clock.good >= round(worst * C.good) - C.round && level.clock.evil >= round(worst * C.evil) - C.round && level.clock.good <= round(worst * C.good) + 2 * C.round,
      '...its clock (' + level.clock.good + ' / ' + level.clock.evil + ') is the slow case\'s by the game\'s rule (' + round(worst * C.good) + ' / ' + round(worst * C.evil) + ', CONFIG.clock), within a step');
  });
} finally { await g.close(); }
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
