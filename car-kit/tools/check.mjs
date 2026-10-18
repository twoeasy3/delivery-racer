#!/usr/bin/env node
// CHECK a car spec: node tools/check.mjs <spec.car.json> [--json]
// Prints PASS / WARN / FAIL per check with the numbers, then a summary. Exits 1 if any check FAILS (warnings do not fail).
// No browser needed: the model is built and measured in Node with the kit's own three.js (engine/vendor).
import * as THREE from '../engine/vendor/three.module.min.js';
import { runChecks, formatResults } from '../engine/checks.mjs';
import { loadSpec } from './lib/load.mjs';

const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
if (!files.length) { console.log('usage: node tools/check.mjs <spec.car.json> [more specs...] [--json]'); process.exit(2); }
let failed = false;
for (const file of files) {
  const t0 = Date.now();
  let out;
  try { out = runChecks(THREE, await loadSpec(file)); } catch (e) { console.log('FAIL ' + file + ': ' + (e.stack || e)); failed = true; continue; }
  if (args.includes('--json')) console.log(JSON.stringify({ file, ...out }, null, 1));
  else console.log(formatResults(out, file) + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)\n');
  if (out.results.some(r => r.status === 'fail')) failed = true;
}
process.exit(failed ? 1 : 0);
