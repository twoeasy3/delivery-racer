// Prints the kinds of gimmick a level has, one a line, sorted: for checking that a rework of a level's layout has
// left its LIST of gimmicks as it was (more or fewer of a kind is free; a kind added or dropped is not).
//   node scripts/.gimmick-kinds-b.mjs <level id>            the level's file in this checkout
//   node scripts/.gimmick-kinds-b.mjs <level id> --ref=main the file as it is on that branch (git show)
//   node scripts/.gimmick-kinds-b.mjs <level id> --diff=main  both, and whether they are the same (exit 1 if not)
// A kind is: every level field that places something to be played (whatever is not the road's shape, the traffic's
// mix, pickups, targets, scenery or the menu's wording), by its sub-kind where a field has them (obstacles,
// drifters, wreckage, machinery, siteWorks, herds, stampedes, shoulderRows); a setting, with its value
// (shoulderTimer, flow...); and what the menu's road card lists that comes from somewhere else: a crest sharp
// enough to jump (a segment with an ease and a grade), a traffic kind with a gimmick of its own (falling cargo,
// the quirks, drive-bys), police only in stretches, wrong-way drivers on a side road, a gimmick on a side road.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2), id = args.find(a => !a.startsWith('--'));
const opt = (name) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
if (!id) { console.log('node scripts/.gimmick-kinds-b.mjs <level id> [--ref=<branch> | --diff=<branch>]'); process.exit(1); }
const path = 'src/delivery/levels/' + id + '.json';
const read = (ref) => JSON.parse(ref ? execFileSync('git', ['show', ref + ':' + path], { encoding: 'utf8' }) : readFileSync(new URL('../' + path, import.meta.url), 'utf8'));

// not gimmicks: the level's name and wording, its look, its road, its traffic's mix, its pickups and targets
const FREE = new Set(['id', 'name', 'description', 'theme', 'clock', 'tip', 'lanes', 'median', 'drive', 'traffic', 'trafficCount', 'oncomingCount',
  'trafficSpeed', 'trafficZones', 'quietZones', 'drivers', 'segments', 'pickups', 'targets', 'cargo', 'zones', 'landmarks', 'shoulder', 'speedLimit']);
const SUB = { obstacles: 'kind', drifters: (d) => d.kind + '/' + d.pattern, wreckage: (w) => w.kind + (w.rock ? '/rock' : ''), machinery: 'kind', siteWorks: 'kind', herds: (h) => (h.kind || 'cow') + (h.stay ? '/stay' : ''),
  stampedes: 'kind', shoulderRows: 'kind' };
const QUIRKS = ['cargotruck', 'icecream', 'binlorry', 'learner', 'boyracer', 'caravan', 'driveby'];

const kinds = (level) => {
  const out = new Set();
  for (const [key, value] of Object.entries(level)) {
    if (FREE.has(key)) continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      const sub = SUB[key];
      if (sub) for (const item of value) out.add(key + ': ' + (typeof sub === 'function' ? sub(item) : (item[sub] || (key === 'obstacles' ? 'barrier' : '?'))));
      else out.add(key);
      if (value.some(i => i && i.road === 'side')) out.add(key + ' (on a side road)');
      if (key === 'obstacles' && value.some(o => o.drift)) out.add('obstacles: darting');
      if (key === 'exits' && value.some(x => !x.flyovers && x.oncoming !== false) && !level.flow) out.add('exits: wrong-way drivers');
      if (key === 'exits' && value.some(x => x.flyovers)) out.add('exits: flyovers');
    } else if (value && typeof value === 'object') out.add(key);
    else if (value !== undefined && value !== null) out.add(key + ' = ' + value);
  }
  if ((level.segments || []).some(s => s.ease && s.grade)) out.add('(crest jumps: a segment with an ease and a grade)');
  const everywhere = level.traffic || {}, zoned = (level.trafficZones || []).map(z => z.traffic || {});
  for (const k of QUIRKS) if (everywhere[k] || zoned.some(z => z[k])) out.add('traffic: ' + k);
  if (!(everywhere.police > 0) && zoned.some(z => z.police > 0)) out.add('traffic: police only in stretches');
  return [...out].sort();
};

const show = (list) => list.forEach(k => console.log('  ' + k));
const diff = opt('diff');
if (diff) {
  const before = kinds(read(diff)), after = kinds(read(null));
  const added = after.filter(k => !before.includes(k)), gone = before.filter(k => !after.includes(k));
  console.log(id + ': ' + after.length + ' kinds now, ' + before.length + ' on ' + diff);
  show(after);
  for (const k of added) console.log('  ADDED    ' + k);
  for (const k of gone) console.log('  REMOVED  ' + k);
  console.log(added.length || gone.length ? 'FAIL: the list of gimmicks changed' : 'ok: the same kinds as on ' + diff);
  process.exit(added.length || gone.length ? 1 : 0);
} else {
  console.log(id + (opt('ref') ? ' (' + opt('ref') + ')' : '') + ':');
  show(kinds(read(opt('ref'))));
}
