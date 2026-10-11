// A one-off audit (headless, seconds, no browser): per level, the crests (the road's own height profile, as
// Gambles.buildCrests finds them) that hide a hazard within 120 m beyond the top, and whether the level already
// has a CREST board for it. The game paints "CREST nn+ FLIES" boards by itself, 110 m before a crest that flies at
// 45 m/s (162 km/h) or less (render/gambles.js); a crest above that gets none, and neither does a crest too
// near the start. Those are the ones listed. Nothing is edited: the level files are changed by hand.
//   node scripts/crest-signs.mjs [--all] [--theme=moon] [--hide=120] [id ...]
import { boot } from './delivery-headless.mjs';
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const HIDE = Number(arg('hide', 120)), THEME = arg('theme', '');
const ALL = process.argv.includes('--all'); // (list the covered ones too)
// hazards by level field: the s (or from) of each, and a name
const HAZARDS = {
  obstacles: (h) => ({ s: h.s, name: h.kind }),
  crossings: (h) => ({ s: h.s, name: 'level crossing' }),
  jamRamps: (h) => ({ s: h.s, name: 'jam ramp' }),
  lowBridges: (h) => ({ s: h.s, name: 'low bridge' }),
  drifters: (h) => ({ s: h.from, name: h.kind + ' drifters' }),
  machinery: (h) => ({ s: h.s, name: h.kind }),
  wideLoads: (h) => ({ s: h.s, name: 'wide load' }),
  wreckage: (h) => ({ s: h.at, name: 'wreckage ' + h.kind }),
  stopGo: (h) => ({ s: h.from, name: 'stop/go works' }),
  stopped: (h) => ({ s: h.s, name: 'stopped traffic' }),
  tractors: (h) => ({ s: h.s, name: 'tractor' }),
  parked: (h) => ({ s: h.s, name: 'parked car' }),
};
const g = await boot();
const { Gambles } = await g.load('gambles.js');
try {
  const { LEVELS, HIDDEN_LEVELS } = g.levels;
  const C = g.CONFIG.crest, rows = [];
  for (const level of [...LEVELS, ...Object.values(HIDDEN_LEVELS)]) {
    if (IDS.length && !IDS.includes(level.id)) continue;
    if (THEME && level.theme !== THEME) continue;
    g.select(level);
    g.Game.evil = false;
    g.Game.start();
    for (const c of Gambles.crests) {
      const hid = [];
      for (const [field, f] of Object.entries(HAZARDS)) {
        for (const h of level[field] || []) {
          if (h.road === 'side') continue;
          const x = f(h);
          if (x.s > c.s && x.s <= c.s + HIDE) hid.push(`${x.name}@${Math.round(x.s)}`);
        }
      }
      if (!hid.length) continue;
      const boarded = c.speed <= C.signUnder && c.from - C.sign >= 5;
      if (boarded && !ALL) continue;
      rows.push({ id: level.id, theme: level.theme, top: Math.round(c.s), from: Math.round(c.from), kmh: Math.round(c.speed * 3.6), boarded, hid });
    }
  }
  for (const r of rows) console.log(`${r.id} (${r.theme}) crest top s=${r.top} flies at ${r.kmh} km/h ${r.boarded ? 'BOARDED' : 'NO BOARD'}: ${r.hid.join(', ')}`);
  console.log(rows.length + ' crests listed');
} finally { await g.close(); }
