// A check of the themes' own obstacles (a theme's `obstacles` and `drifting` in themes.js: { crate: 'barrel', ... }): each one
// is a plain obstacle in another shape and nothing more. So: every kind a theme names is a real obstacle kind;
// what it stands in for and what stands in cost the same (CONFIG.obstacleKinds); and on every level of such a
// theme, loaded with the theme's obstacles and again without, the same obstacles are in the same places with
// the same hitboxes, only their kinds differing. Headless.
//   node scripts/.obstacles-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { CONFIG } = await g.load('config.js');
  const { THEMES } = await g.load('themes.js');
  const K = CONFIG.obstacleKinds, G = g.Game;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const [name, theme] of Object.entries(THEMES)) {
    for (const [from, to] of [...Object.entries(theme.obstacles || {}), ...Object.entries(theme.drifting || {})]) {
      check(!!K[from] && !!K[to], `${name}: ${from} -> ${to}: both are obstacle kinds`);
      check(!!K[from] && !!K[to] && same(K[from], K[to]), `${name}: a ${to} costs what a ${from} costs (${JSON.stringify(K[to])})`);
    }
  }
  // a variant of a theme (another name, that theme's scenery) has that theme's obstacles
  for (const [name, theme] of Object.entries(THEMES)) {
    const parent = THEMES[theme.scenery];
    if (!parent || parent === theme || !(parent.obstacles || parent.drifting)) continue;
    check(same(theme.obstacles, parent.obstacles) && same(theme.drifting, parent.drifting), `${name}: a variant of ${theme.scenery}, with its obstacles (${JSON.stringify(theme.obstacles || {})}${theme.drifting ? ', drifting ' + JSON.stringify(theme.drifting) : ''})`);
  }
  const snapshot = (level) => {
    g.select(level);
    G.loaded = null;
    G.evil = false;
    G.start();
    return g.Collision.obstacles.map(o => ({ kind: o.kind, s: o.s, lat: o.lat, hw: o.hw, hl: o.hl, height: o.height, drift: o.drift || null }));
  };
  for (const level of [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)]) {
    const theme = THEMES[level.theme || 'city'], map = theme?.obstacles, drifting = theme?.drifting;
    if (!map && !drifting) continue;
    g.seed?.(level.id);
    const themed = snapshot(level);
    theme.obstacles = theme.drifting = undefined;
    g.seed?.(level.id);
    const plain = snapshot(level);
    theme.obstacles = map;
    theme.drifting = drifting;
    let swapped = 0, wrong = 0;
    for (let i = 0; i < Math.max(themed.length, plain.length); i++) {
      const a = themed[i], b = plain[i];
      if (!a || !b) { wrong++; continue; }
      if (a.kind === b.kind) continue; // (not the theme's doing: and what a gimmick puts out at random need not match)
      swapped++;
      if ((map?.[b.kind] !== a.kind && drifting?.[b.kind] !== a.kind) || !same({ ...a, kind: 0 }, { ...b, kind: 0 })) wrong++;
    }
    check(!wrong && themed.length === plain.length, `${level.id} (${level.theme}): ${swapped} of its ${themed.length} obstacles are the theme's own, each where the plain one was and the same size` + (wrong ? ` (${wrong} are not)` : ''));
  }
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
