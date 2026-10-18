#!/usr/bin/env node
// SELF-TEST of the checker: node tools/selftest.mjs
// Takes the hatchback example (which passes), breaks it in one known way at a time, and makes sure the right check FAILS.
// Run it after changing engine/checks.mjs. Exits 1 if a defect slips through or the clean example fails.
import * as THREE from '../engine/vendor/three.module.min.js';
import { runChecks } from '../engine/checks.mjs';
import { loadSpec } from './lib/load.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = await loadSpec(join(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'hatchback.car.json'));
const clone = () => JSON.parse(JSON.stringify(base));
const part = (s, name) => s.parts.find(p => p.name === name);
const CASES = [
  ['clean example passes', null, (s) => s],
  ['z-fighting: a badge flush with the flank', 'z-fighting', (s) => { s.parts.push({ name: 'badge', role: 'trim', shape: 'box', size: [0.02, 0.1, 0.3], at: [0.89, 0.6, 0], mirror: true }); return s; }],
  ['floating part: a box in the air', 'no-floating', (s) => { s.parts.push({ name: 'balloon', role: 'trim', shape: 'box', size: [0.2, 0.2, 0.2], at: [0, 2.2, 0] }); return s; }],
  ['open shell: a one-sided panel of trim', 'closed-shells', (s) => { s.parts.push({ name: 'flap', role: 'trim', shape: 'panel', points: [[-0.3, 0.98, 0.2], [0.3, 0.98, 0.2], [0.3, 0.98, -0.2], [-0.3, 0.98, -0.2]] }); return s; }],
  ['glass buried in the body', 'glass-visible', (s) => { part(s, 'windscreen').points = part(s, 'windscreen').points.map(([x, y, z]) => [x, y - 0.12, z - 0.12]); return s; }],
  ['glass floating off the body', 'glass-seated', (s) => { part(s, 'side window').points = part(s, 'side window').points.map(([x, y, z]) => [x + 0.08, y, z]); return s; }],
  ['wheel on a stalk, out from the body', 'wheels-under-arch', (s) => { s.wheels[0].at = [1.35, 1.25]; return s; }],
  ['wheel off the ground', 'wheels-ground', (s) => { s.wheels[1].at = [0.84, 0.4, -1.25]; s.wheels[1].mirror = true; return s; }],
  ['wheels not in pairs', 'wheels-pairs', (s) => { s.wheels[1].mirror = false; s.wheels.push({ at: [-0.84, -1.1], radius: 0.31, width: 0.24 }); return s; }],
  ['asymmetric: a door mirror on one side only', 'symmetry', (s) => { part(s, 'mirror').mirror = false; return s; }],
  ['headlamps hidden inside the body', 'lights-front', (s) => { part(s, 'headlamp').at[2] = 1.6; return s; }],
  ['too big for its class', 'size-class', (s) => { s.class = 'small'; part(s, 'tub').scale = [1, 1, 1.3]; return s; }],
  ['part under the ground', 'above-ground', (s) => { s.parts.push({ name: 'skid', role: 'underbody', shape: 'box', size: [0.5, 0.1, 0.5], at: [0, 0.03, 0] }); return s; }],
  ['roof mount floating over the roof', 'mount-roof', (s) => { s.mounts.roof.at[1] = 1.6; return s; }],
  ['decal area over the windows', 'mount-door-L', (s) => { s.mounts.decals[0].at = [0.77, 1.12, -0.3]; s.mounts.decals[0].normal = [0.97, 0.25, 0]; return s; }],
  ['wing mount too narrow for the rear', 'mount-wing-width', (s) => { s.mounts.wing.size[0] = 0.6; return s; }],
  ['roof mount a sliver', 'mount-roof-size', (s) => { s.mounts.roof.size[0] = 0.3; return s; }],
  ['mount areas overlapping', 'mounts-apart', (s) => { s.mounts.wing.at[2] = -0.6; return s; }],
  ['schema error: a part with no role', 'schema', (s) => { delete part(s, 'grille').role; return s; }],
  ['over the triangle budget', 'budget-tris', (s) => { for (let i = 0; i < 6; i++) s.parts.push({ name: 'blob ' + i, role: 'trim', shape: 'sphere', radius: 0.06, segments: [32, 24], at: [0, 1.0, -1.0 - i * 0.12] }); return s; }],
];
let bad = 0;
for (const [what, expect, make] of CASES) {
  const { results } = runChecks(THREE, make(clone()));
  const fails = results.filter(r => r.status === 'fail').map(r => r.id);
  const ok = expect ? fails.includes(expect) : fails.length === 0;
  if (!ok) bad++;
  console.log((ok ? 'ok    ' : 'MISSED') + ' ' + what + (expect ? '  (expects ' + expect + ' to fail; failed: ' + (fails.join(', ') || 'nothing') + ')' : fails.length ? '  (failed: ' + fails.join(', ') + ')' : ''));
}
console.log(bad ? bad + ' case(s) wrong' : 'all ' + CASES.length + ' cases right');
process.exit(bad ? 1 : 0);
