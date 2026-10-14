// The level manifest (src/delivery/levels/manifest.json): for each level file, only the fields that something reads
// WITHOUT a run (the menu's cards, the tiers, the cargo dealing, the HUD at the start screen, the race lists...), in the
// file's own order. levels.js makes each level object from its entry and fills in the rest of the file when the level is
// needed (loadLevel). So a field that anything reads before a level is loaded must be in KEYS, and the manifest must say
// what the files say: `node scripts/level-manifest.mjs` writes it, `--check` compares (scripts/.levels-lazy-check.mjs
// and the levels group run it). Edit a level file's listed field and run this again.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const KEYS = ['id', 'name', 'description', 'cargo', 'clock', 'tip', 'theme', 'laps', 'grid', 'car', 'amphibious', 'battle', 'alwaysGood',
  'ownEcu', 'allowedCars', 'noPackages', 'noTankRage', 'rival', 'shoulderTimer', 'drive', 'flow'];
const dir = fileURLToPath(new URL('../src/delivery/levels/', import.meta.url));
export const build = () => {
  const out = {};
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort()) {
    const level = JSON.parse(readFileSync(dir + file, 'utf8'));
    out[file.slice(0, -5)] = Object.fromEntries(Object.entries(level).filter(([key]) => KEYS.includes(key)));
  }
  return JSON.stringify(out, null, 1) + '\n';
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = build(), path = dir + 'manifest.json';
  if (process.argv.includes('--check')) {
    let have = ''; try { have = readFileSync(path, 'utf8'); } catch { /* none */ }
    if (have !== text) { console.error('levels/manifest.json is out of date: run node scripts/level-manifest.mjs'); process.exit(1); }
    console.log('levels/manifest.json matches the level files (' + Object.keys(JSON.parse(text)).length + ' levels)');
  } else { writeFileSync(path, text); console.log('written: ' + path + ' (' + text.length + ' bytes)'); }
}
