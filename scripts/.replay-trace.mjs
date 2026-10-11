// A companion to scripts/.replay-check.mjs: where two runs of a level from one seed first part. Every draw of
// Math.random is logged with where it was called from; the first draw that differs between the two runs
// (same seed, same inputs: flat out, straight) is printed with the draws round it, from each run. The call
// that one run makes and the other does not is the one reading state left over from the run before.
//   node scripts/.replay-trace.mjs <level-id> [steps]
import { boot } from './delivery-headless.mjs';
let state = 1, log = null;
Math.random = () => { if (log) log.push(new Error().stack.split('\n').slice(2, 6).map(l => l.trim().replace(/\(.*src\/delivery\//, '(')).filter(l => !l.includes('.replay-trace')).join(' < ')); state = (state + 0x6D2B79F5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const g = await boot();
const { Game: G } = g;
const run = (steps) => {
  g.select(process.argv[2] || 'marina-bay'); state = 12345; G.evil = false; G.loaded = null; log = []; G.start();
  const atStart = log.length;
  g.drive(1, 0);
  for (let i = 0; i < steps; i++) { G.update(1 / 120); g.FxQueue.length = 0; }
  const out = log; log = null; return { out, atStart };
};
const STEPS = Number(process.argv[3]) || 240;
const a = run(STEPS), b = run(STEPS);
console.log('draws', a.out.length, b.out.length, 'at start', a.atStart, b.atStart);
const i = a.out.findIndex((v, k) => v !== b.out[k]);
if (i < 0) console.log('no draw differs in ' + STEPS + ' steps');
else console.log('first differing draw', i, '\n a:', a.out.slice(Math.max(0, i - 1), i + 2).join('\n    '), '\n b:', b.out.slice(Math.max(0, i - 1), i + 2).join('\n    '));
await g.close();
