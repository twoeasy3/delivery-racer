// The level tiers (src/delivery/tiers.json): print the table, check it, or move a level. The data is the one file the
// game loads; edit it by hand if you like, this only rewrites it in the same shape.
//   node scripts/tiers.mjs                       print the table (tier -> levels), the levels outside, and any problems
//   node scripts/tiers.mjs check                 only the check (exit 1 if the file is unsound)
//   node scripts/tiers.mjs move <id> <tier> [position]
//        put a level in tier <tier> (1 to 10: gold 1 to 5, then blue 1 to 5) at <position> (1 to 5; default last),
//        taking it out of wherever it was. Tier 0, or the word "outside", puts it in the outside list (at <position>, or last)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boot } from './delivery-headless.mjs';

const FILE = fileURLToPath(new URL('../src/delivery/tiers.json', import.meta.url));
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const g = await boot();
const levelsById = new Map(g.levels.LEVELS.map((l, i) => [l.id, { level: l, index: i }]));
const name = (id) => { const f = levelsById.get(id); return f ? g.levels.levelName(f.level) : '(no such level)'; };
const label = (id) => { const f = levelsById.get(id); return f ? g.levels.levelLabel(f.index) : '?'; };
const tierName = (n) => (n <= 5 ? 'Gold ' + n + ' (' + '*'.repeat(n) + ')' : 'Blue ' + (n - 5) + ' (' + '*'.repeat(n - 5) + ' blue)');

const save = () => {
  const lines = Object.entries(data.tiers).map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`).join(',\n');
  writeFileSync(FILE, `{\n  "_about": ${JSON.stringify(data._about)},\n  "tiers": {\n${lines}\n  },\n  "outside": ${JSON.stringify(data.outside)}\n}\n`);
};
const problems = () => {
  const out = [], seen = new Map();
  const note = (id, where) => { if (!levelsById.has(id)) out.push(`"${id}" in ${where} is not a level`); else if (seen.has(id)) out.push(`${id} is in both ${seen.get(id)} and ${where}`); else seen.set(id, where); };
  for (const [n, list] of Object.entries(data.tiers)) { list.forEach(id => note(id, 'tier ' + n)); if (list.length !== 5) out.push(`tier ${n} has ${list.length} levels, not 5`); }
  data.outside.forEach(id => note(id, 'outside'));
  for (const id of levelsById.keys()) if (!seen.has(id)) out.push(`${id} is in no tier and not listed outside`);
  return out;
};
const print = () => {
  for (const [n, list] of Object.entries(data.tiers)) {
    console.log(`\nTier ${n}: ${tierName(Number(n))}`);
    list.forEach((id, i) => console.log(`  ${i + 1}. ${id.padEnd(18)} #${label(id).padEnd(3)} ${name(id)}`));
  }
  console.log('\nOutside the tiers (open in this order after tier 10; amphibious by their own rule; races always):');
  data.outside.forEach(id => console.log(`  ${id.padEnd(18)} ${label(id).padEnd(4)} ${name(id)}`));
};

const [cmd, ...rest] = process.argv.slice(2);
let code = 0;
try {
  if (cmd === 'move') {
    const [id, tierArg, posArg] = rest;
    if (!id || tierArg === undefined) throw new Error('usage: node scripts/tiers.mjs move <id> <tier|outside> [position]');
    if (!levelsById.has(id)) throw new Error(`no level with the id "${id}"`);
    const out = tierArg === 'outside' || Number(tierArg) === 0;
    const tier = Number(tierArg);
    if (!out && !data.tiers[tier]) throw new Error(`no tier ${tierArg} (the tiers are ${Object.keys(data.tiers).join(', ')})`);
    for (const list of [...Object.values(data.tiers), data.outside]) { const k = list.indexOf(id); if (k >= 0) list.splice(k, 1); }
    const list = out ? data.outside : data.tiers[tier];
    const at = posArg === undefined ? list.length : Math.max(0, Math.min(list.length, Number(posArg) - 1));
    list.splice(at, 0, id);
    save();
    console.log(`${id} (${name(id)}) is now ${out ? 'outside the tiers' : 'in tier ' + tier + ' at ' + (at + 1)}.`);
    const odd = Object.entries(data.tiers).filter(([, l]) => l.length !== 5).map(([n, l]) => `tier ${n}: ${l.length}`);
    if (odd.length) console.log('Note: ' + odd.join(', ') + ' levels (the rules assume five; move another level to even it up).');
  } else if (cmd && cmd !== 'check' && cmd !== 'print') throw new Error('unknown command ' + cmd);
  if (cmd !== 'check' && cmd !== 'move') print();
  const bad = problems();
  console.log(bad.length ? '\nPROBLEMS:\n  ' + bad.join('\n  ') : '\ntiers.json: every level is in exactly one tier or listed outside.');
  if (bad.length && cmd === 'check') code = 1;
} catch (e) {
  console.error(e.message);
  code = 1;
}
await g.close();
process.exit(code);
