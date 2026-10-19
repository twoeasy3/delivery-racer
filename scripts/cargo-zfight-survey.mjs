// CARGO Z-FIGHT SURVEY (CHECKLIST 455, CARGO-ZFIGHT.md): every cargo model built headless, the Evil ones in each state
// (0 calm, 1 agitated, 2 furious), posed at t = 0.3, 1.3, 2.7 and 4.1 s, read by render/zfight.js findZFights (planes
// within 4 mm). Counts FLICKER-CLASS pairs only (not one flat colour), once per state (a pair seen at several times counts
// once): `pairs` all of them, `certain` those under 0.5 mm. A report, not a check (exit 0); the check is
// .cargo-contain-check's z-fight pass (certain pairs only).
//   node scripts/cargo-zfight-survey.mjs [id ...] [--json=<file>] [--detail]
import { writeFileSync } from 'node:fs';

const { CARGO_MODELS, makeCargoModel } = await import('../src/delivery/render/cargoModels.js');
const { findZFights } = await import('../src/delivery/render/zfight.js');
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), detail = args.includes('--detail');
const json = args.find(a => a.startsWith('--json='))?.slice(7);
const TIMES = [0.3, 1.3, 2.7, 4.1];

const path = (o, root) => { const p = []; for (let n = o; n && n !== root; n = n.parent) p.push((n.name || '') + '#' + n.parent?.children.indexOf(n)); return p.reverse().join('/'); };
const desc = (o, mat) => {
  const prm = o.geometry.parameters || {}, keys = Object.keys(prm).filter(k => typeof prm[k] === 'number').slice(0, 4);
  return (o.name ? o.name + ':' : '') + o.geometry.type.replace('Geometry', '') + '(' + keys.map(k => +prm[k].toFixed(4)).join(',') + ')' + (mat?.color ? '#' + mat.color.getHexString() : '') + '@' + o.position.toArray().map(v => +v.toFixed(4)).join(',');
};
const out = {};
for (const id of Object.keys(CARGO_MODELS).filter(id => !only.length || only.includes(id))) {
  const stated = !!makeCargoModel(id).userData.setState;
  const seen = new Map();
  for (const s of stated ? [0, 1, 2] : [0]) for (const T of TIMES) {
    const m = makeCargoModel(id);
    m.userData.setState?.(s, true);
    for (let t = 0; t <= T + 1e-9; t += 0.05) m.userData.animate?.(t);
    for (const g of findZFights(m).filter(g => !g.sameColour)) {
      const k = s + '|' + [path(g.a, m), path(g.b, m)].sort().join('|');
      const was = seen.get(k);
      if (!was || g.area > was.area) seen.set(k, { s, area: g.area, gap: g.gapMin, certain: g.certain || was?.certain, at: g.at.toArray().map(v => +v.toFixed(3)), a: desc(g.a, g.aMat), b: desc(g.b, g.bMat) });
    }
  }
  const all = [...seen.values()];
  if (!all.length) continue;
  out[id] = { pairs: all.length, certain: all.filter(x => x.certain).length, biggest: Math.round(Math.max(...all.map(x => x.area)) * 1e4), list: all.sort((a, b) => b.area - a.area) };
}
const rows = Object.entries(out).sort((a, b) => b[1].certain - a[1].certain || b[1].biggest - a[1].biggest);
console.log('cargo pairs certain biggest(cm2)');
for (const [id, r] of rows) {
  console.log(id.padEnd(16) + String(r.pairs).padStart(5) + String(r.certain).padStart(8) + String(r.biggest).padStart(9));
  if (detail) { // (the kinds of pair: the same two parts in other copies or states counted together)
    const kinds = new Map();
    for (const x of r.list) { const k = [x.a, x.b].sort().join(' / '); const q = kinds.get(k) || { n: 0, c: 0, gap: x.gap, area: x.area, at: x.at }; q.n++; if (x.certain) q.c++; q.gap = Math.min(q.gap, x.gap); kinds.set(k, q); }
    for (const [k, q] of [...kinds].sort((a, b) => b[1].c - a[1].c || b[1].n - a[1].n).slice(0, 14)) console.log('    ' + q.n + 'x (' + q.c + ' certain) ' + (q.gap * 1000).toFixed(2) + ' mm ' + (q.area * 1e4).toFixed(1) + ' cm2 at ' + q.at.join(',') + '  ' + k);
  }
  if (false) for (const x of r.list.slice(0, 12)) console.log('    s' + x.s + ' ' + (x.area * 1e4).toFixed(1) + ' cm2 ' + (x.gap * 1000).toFixed(2) + ' mm' + (x.certain ? ' certain' : '') + ' at ' + x.at.join(',') + ' ' + x.a + ' / ' + x.b);
}
console.log('models: ' + rows.length + ', pairs: ' + rows.reduce((n, [, r]) => n + r.pairs, 0) + ', certain: ' + rows.reduce((n, [, r]) => n + r.certain, 0));
if (json) writeFileSync(json, JSON.stringify(Object.fromEntries(rows.map(([id, r]) => [id, { pairs: r.pairs, certain: r.certain, biggest: r.biggest }])), null, 1));
