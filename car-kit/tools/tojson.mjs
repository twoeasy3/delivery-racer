#!/usr/bin/env node
// a .car.mjs spec (a script whose default export is the spec) -> the same spec as <id>.car.json beside it (or --out <file>)
import { writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { loadSpec } from './lib/load.mjs';
const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--')), i = args.indexOf('--out');
if (!file) { console.log('usage: node tools/tojson.mjs <spec.car.mjs> [--out file.json]'); process.exit(2); }
const spec = await loadSpec(file);
const out = i >= 0 ? resolve(args[i + 1]) : join(dirname(resolve(file)), spec.id + '.car.json');
// (short number arrays kept on one line, so the file reads)
writeFileSync(out, JSON.stringify(spec, null, 1).replace(/\[\n\s+(-?[\d.e-]+),\n\s+(-?[\d.e-]+)(,\n\s+(-?[\d.e-]+))?\n\s+\]/g, (m, a, b, c, d) => '[' + a + ', ' + b + (d !== undefined ? ', ' + d : '') + ']') + '\n');
console.log('wrote ' + out);
