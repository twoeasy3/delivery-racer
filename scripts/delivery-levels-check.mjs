// A headless check of the level lists, in seconds: every level on the menu and every hidden one is built
// (Game.start) and must have no Track.problems; the menu's two tabs must number as they should (1.., S1..,
// R1..); and every race (a lapped level) is driven flat out as a ghost for a while and must get somewhere.
// Not the smoke test (scripts/delivery-smoke.mjs), which drives everything: this only says the levels load.
//   node scripts/delivery-levels-check.mjs [--secs=20] [id ...]     (ids: only those races are driven)
import { boot } from './delivery-headless.mjs';

const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SECS = Number(arg('secs', 20));

const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
try {
  const { LEVELS, HIDDEN_LEVELS, MAIN_LEVELS, RACE_LEVELS, DELIVERY_LEVELS, levelLabel, isRace, nextOnTab } = g.levels;
  // ---- every level builds ----
  const all = [...LEVELS, ...Object.values(HIDDEN_LEVELS)];
  for (const level of all) {
    try {
      g.select(level);
      g.Game.evil = false;
      g.Game.start();
      const problems = g.track.Track.problems || [];
      if (problems.length) fail(level.id + ': ' + problems.join(' | '));
    } catch (e) {
      fail(level.id + ': THREW ' + (e.stack || e));
    }
  }
  console.log(`${all.length} levels built (${LEVELS.length} on the menu: ${DELIVERY_LEVELS.length} deliveries, ${RACE_LEVELS.length} races)`);
  // ---- the lists and their labels ----
  const ids = new Set(all.map(l => l.id));
  if (ids.size !== all.length) fail('two levels share an id');
  const labels = LEVELS.map((l, i) => levelLabel(i));
  if (new Set(labels).size !== labels.length) fail('two levels share a label: ' + labels.join(' '));
  MAIN_LEVELS.forEach((l, i) => { if (isRace(l)) fail(l.id + ': a race among the main levels'); else if (labels[i] !== String(i + 1)) fail(l.id + ': labelled ' + labels[i]); });
  RACE_LEVELS.forEach((l, k) => { if (labels[LEVELS.indexOf(l)] !== 'R' + (k + 1)) fail(l.id + ': labelled ' + labels[LEVELS.indexOf(l)] + ', not R' + (k + 1)); });
  // (the special levels S1..., then the amphibious ones A1...)
  const amphibious = g.levels.AMPHIBIOUS_LEVELS || [], themed = g.levels.THEME_LEVELS || [];
  themed.forEach((l) => { if (!MAIN_LEVELS.includes(l)) fail(l.id + ': a themed level that is not among the numbered levels'); }); // (they are ordinary levels: 32, 33...)
  DELIVERY_LEVELS.slice(MAIN_LEVELS.length).filter(l => !amphibious.includes(l) && !themed.includes(l)).forEach((l, k) => { if (labels[LEVELS.indexOf(l)] !== 'S' + (k + 1)) fail(l.id + ': labelled ' + labels[LEVELS.indexOf(l)] + ', not S' + (k + 1)); });
  amphibious.forEach((l, k) => { if (labels[LEVELS.indexOf(l)] !== 'A' + (k + 1)) fail(l.id + ': labelled ' + labels[LEVELS.indexOf(l)] + ', not A' + (k + 1)); if (!l.amphibious) fail(l.id + ': among the amphibious levels, but not "amphibious"'); });
  for (const l of LEVELS) { const next = nextOnTab(l); if (next && isRace(next) !== isRace(l)) fail(l.id + ': its next level is on the other tab'); }
  if (LEVELS.slice(-3).map(l => l.id).join() !== 'monza,spa,albert-park') fail('the circuits are not last in LEVELS: ' + LEVELS.slice(-3).map(l => l.id).join());
  console.log('races: ' + RACE_LEVELS.map(l => labels[LEVELS.indexOf(l)] + ' ' + g.levels.levelName(l)).join(', '));
  // ---- every race starts and is driven ----
  for (const level of RACE_LEVELS) {
    if (IDS.length && !IDS.includes(level.id)) continue;
    try {
      g.select(level);
      g.cars.selectCar('commuter');
      g.Game.evil = false;
      g.Player.testGhost = true;
      g.Game.start();
      g.drive(1, 0);
      const s0 = g.Player.s;
      const t = g.run(SECS, () => g.Game.state !== 'playing');
      const T = g.track.Track, gone = g.Player.s - s0;
      console.log(`${level.id}: ${T.length} m a lap, ${level.laps} laps, ${(level.runoff || []).length} run-off stretches; ` +
        `${t.toFixed(0)} s driven, ${gone.toFixed(0)} m gone, state ${g.Game.state}${g.Game.outcome ? ' (' + g.Game.outcome + ')' : ''}`);
      if (!(gone > 200) || !Number.isFinite(g.Player.s) || !Number.isFinite(g.Player.lat)) fail(level.id + ': the race did not get going');
    } catch (e) {
      fail(level.id + ': THREW ' + (e.stack || e));
    }
  }
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'all good');
process.exit(failed ? 1 : 0);
