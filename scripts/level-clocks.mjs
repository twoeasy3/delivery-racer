// Works out a level's clock (its "clock": { good, evil }) from a clean run in the reference car
// (CONFIG.clock): a ghost, flat out, from the start line to the drop, nothing in its way. The clock is that
// run's time times CONFIG.clock.good or .evil, less CONFIG.clock.timePlus s for each time plus on the level.
// A level driven in a car of its own (its "car") is timed in that. Only the levels named are timed.
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast          prints their clean runs and clocks
//   node scripts/level-clocks.mjs mountain-pass tour-de-coast --write  and writes the clocks into their files
//   node scripts/level-clocks.mjs --all                                every level's, and which written clocks are far off
// The run is seeded from the level's id, so a level's clock is the same every time (--seed=x: other dice).
import { logicServer } from './delivery-headless.mjs'; // (a Vite server that shares no cache with any other run)
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const SEED = (process.argv.find(a => a.startsWith('--seed=')) || '').slice(7); // (other dice: the run is seeded from the level's id, so it is the same every time)
const ALL = process.argv.includes('--all'); // (every level, and at the end those whose written clock is more than a rounding step from the one worked out)
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!IDS.length && !ALL) { console.log('Name the levels to time: node scripts/level-clocks.mjs <id> ... [--write]'); process.exit(1); }

const element = () => ({ classList: { add() {}, remove() {} }, addEventListener() {}, style: {}, textContent: '' });
globalThis.window = { addEventListener() {} };
const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars: ['commuter', 'sport', 'floatvan'] })); // (floatvan: CONFIG.clock.amphibious)
globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };

const server = await logicServer();
try {
  const load = (path) => server.ssrLoadModule(path);
  const levels = await load('/src/delivery/levels.js');
  const { cleanRun } = await load('/src/delivery/cleanrun.js'); // (the run and the sum: the level editor's button uses the same)
  const C = (await load('/src/delivery/config.js')).CONFIG.clock;
  const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)];
  const off = [];
  for (const id of ALL ? all.map(l => l.id) : IDS) {
    const level = all.find(l => l.id === id);
    if (!level) { console.log(`${id}: no such level`); continue; }
    if (levels.LEVELS.includes(level)) levels.selectLevel(levels.LEVELS.indexOf(level));
    else levels.selectSpecial(level);
    const run = cleanRun(SEED);
    if (!run.delivered) { console.log(`${id}: NOT DELIVERED (${run.outcome})`); continue; }
    const { clock, pluses } = run;
    console.log(`${id}: clean run ${run.time.toFixed(1)} s in the ${run.car}, ${pluses} time plus${pluses === 1 ? '' : 'es'}: ` +
      `good ${clock.good} s, evil ${clock.evil} s (was ${JSON.stringify(level.clock)})`);
    if (level.clock && (Math.abs(level.clock.good - clock.good) > C.round || Math.abs(level.clock.evil - clock.evil) > C.round)) off.push(`${id}: written ${level.clock.good} / ${level.clock.evil}, worked out ${clock.good} / ${clock.evil}`);
    if (!WRITE) continue;
    const path = new URL(`../src/delivery/levels/${id}.json`, import.meta.url);
    const text = readFileSync(path, 'utf8'), line = `"clock": { "good": ${clock.good}, "evil": ${clock.evil} }`;
    writeFileSync(path, /"clock": \{[^}]*\}/.test(text) ? text.replace(/"clock": \{[^}]*\}/, line) : text.replace(/"time": [\d.]+/, line));
  }
  if (ALL) { console.log(''); console.log(off.length ? off.length + ' written clocks more than ' + C.round + ' s from the one worked out:' : 'every written clock is within a rounding step of the one worked out'); for (const line of off) console.log('  ' + line); }
} finally {
  await server.close();
}
process.exit(0);
