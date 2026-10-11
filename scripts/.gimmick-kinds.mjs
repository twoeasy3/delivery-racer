// Prints the kinds of gimmick a level has, one a line, sorted: to check that a rework of a level has left its list
// of gimmicks as it was (run it on the level before and after, and diff). Three readings of the one level:
//   field   every gimmick-type field of the level's JSON with at least one entry (obstacles, drifters, herds,
//           stampedes, machinery, siteWorks and wreckage by kind; "crest" = a segment with both ease and grade)
//   menu    the gimmicks the menu names for it (levelinfo.js: levelGimmicks)
//   card    the cards its "what's on this road" card shows (gimmicks.js: each card's own "has")
// How many of a kind there are, and where, is not printed: only whether the kind is there.
//   node scripts/.gimmick-kinds.mjs <level id>             the level as it is in this checkout
//   node scripts/.gimmick-kinds.mjs --file=<path.json>     a level's JSON from anywhere (git show main:... > file)
import { boot } from './delivery-headless.mjs';
import { readFileSync } from 'node:fs';

// what a level holds that is no gimmick: what it is, its road's shape, its pickups, traffic mix, look and clock
const NOT_GIMMICKS = new Set(['id', 'name', 'description', 'theme', 'clock', 'tip', 'cargo', 'segments', 'lanes', 'shoulder', 'drive',
  'traffic', 'trafficCount', 'oncomingCount', 'trafficZones', 'quietZones', 'trafficSpeed', 'drivers', 'hesitation',
  'pickups', 'targets', 'zones', 'landmarks', 'parked', 'shoulderRows', 'stands', 'parkedPlanes', 'helicopter']);
const BY_KIND = { obstacles: (o) => o.kind || 'barrier', drifters: (d) => d.kind + (d.pattern === 'dart' ? ':dart' : ''), herds: (h) => h.kind || 'cow',
  stampedes: (s) => s.kind || 'cow', machinery: (m) => m.kind, siteWorks: (w) => w.kind, wreckage: (w) => w.kind + (w.rock ? ':rock' : '') };

const file = process.argv.find(a => a.startsWith('--file='));
const id = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!file && !id) { console.log('Name a level: node scripts/.gimmick-kinds.mjs <id> | --file=<path.json>'); process.exit(1); }
const g = await boot();
try {
  const level = file ? JSON.parse(readFileSync(file.slice(7), 'utf8')) : g.select(id);
  const lines = new Set();
  for (const [key, value] of Object.entries(level)) {
    if (NOT_GIMMICKS.has(key)) continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      if (BY_KIND[key]) for (const item of value) lines.add('field ' + key + ':' + BY_KIND[key](item));
      else lines.add('field ' + key);
      if (value.some(item => item && item.road === 'side')) lines.add('field ' + key + ' (on a side road)');
    } else if (value !== false && value !== null && value !== undefined) {
      lines.add('field ' + key + (typeof value === 'object' ? '' : '=' + value));
    }
  }
  if (level.segments.some(seg => seg.ease && seg.grade)) lines.add('field crest');
  if (level.obstacles?.some(o => o.drift)) lines.add('field obstacles (darting)');
  const info = await g.load('levelinfo.js'), { GROUPS } = await g.load('gimmicks.js');
  for (const name of info.levelGimmicks(level)) lines.add('menu  ' + name);
  for (const card of GROUPS.flatMap(group => group.cards)) if (card.has(level)) lines.add('card  ' + card.name);
  console.log([...lines].sort().join('\n'));
} finally {
  await g.close();
}
