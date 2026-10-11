// The events (src/delivery/events.json; src/delivery/events.js): print them, check them, or time a special event's
// stages for their clocks. A stage's clock is written out in full by hand (the owner), and this says what a clean run
// takes: the stage's car (lent or needed; the reference car where it names none: CONFIG.clock), a ghost flat out
// from the start to the drop, as scripts/level-clocks.mjs times a level. It writes nothing.
//   node scripts/events.mjs                 the events and their stages, and any problems
//   node scripts/events.mjs check           only the check (exit 1 if events.json is unsound)
//   node scripts/events.mjs time [<id>]     each stage's clean run, in its car, beside the clock written for it
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2);
const g = await boot({ ownAll: true });
const { Events, PLAIN_EVENTS } = await g.load('events.js');
const { Tiers } = await g.load('tiers.js');
const day = (t) => (t === null ? '...' : new Date(t).toISOString().slice(0, 10));
const problems = [...Events.problems(), ...Tiers.problems().filter(line => /event/.test(line))];
if (args[0] === 'check') {
  console.log(problems.length ? problems.join('\n') : 'events.json: sound');
  await g.close();
  process.exit(problems.length ? 1 : 0);
}
if (args[0] === 'time') {
  const { cleanRun } = await g.load('cleanrun.js');
  for (const e of Events.specials.filter(e => !args[1] || e.id === args[1])) {
    console.log(e.name + ':');
    for (const s of e.stages) {
      if (!s.level) { console.log('  stage ' + (s.index + 1) + ': no map'); continue; }
      g.levels.selectSpecial({ ...s.level, car: s.car || s.level.car }); // (timed in the stage's car, lent or needed)
      const run = cleanRun(s.level.id);
      const c = s.raw.clock || {};
      console.log(`  stage ${s.index + 1} (${s.map}${s.car ? ', ' + s.car + (s.free ? ' lent' : ' needed') : ''}): ` +
        (run.delivered ? `clean run ${run.time.toFixed(1)} s in the ${run.car}, ${run.pluses} time plus${run.pluses === 1 ? '' : 'es'}` : 'NOT DELIVERED (' + run.outcome + ')') +
        `; clock written: good ${c.good} s, evil ${c.evil} s` + (run.delivered ? ` (${(c.good / run.time).toFixed(2)}x, ${(c.evil / run.time).toFixed(2)}x the clean run)` : ''));
    }
  }
  await g.close();
  process.exit(0);
}
console.log('One-level events:');
for (const e of PLAIN_EVENTS) { const x = typeof e === 'string' ? { id: e } : e; console.log(`  ${x.id}  ${x.from || '...'} to ${x.to || '...'}${x.reward ? '  reward ' + JSON.stringify(x.reward) : ''}`); }
console.log('Special events:');
for (const e of Events.specials) {
  console.log(`  ${e.id}: ${e.name} ("${e.short}"), ${day(e.from)} to ${day(e.to)}, prize ${e.prize?.car || 'none'}`);
  for (const s of e.stages) console.log(`    ${s.index + 1}. ${s.map.padEnd(16)} from ${day(s.from)}  ${s.car ? (s.free ? 'free try: ' : 'needs: ') + s.car : 'any car'}  clock ${JSON.stringify(s.raw.clock)}`);
}
console.log(problems.length ? '\nProblems:\n  ' + problems.join('\n  ') : '\nevents.json: sound');
await g.close();
process.exit(problems.length ? 1 : 0);
