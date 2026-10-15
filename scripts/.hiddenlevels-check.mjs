// A check of the HIDDEN LEVELS MENU (render/hiddenlevels.js; Options > Hidden levels), headless:
// every level of HIDDEN_LEVELS that is not a test track is in the menu's data with a name and starts as ?hidden=<id> does; the test tracks
// are the only ones left out; the menu's code never touches Progress (a hidden run banks nothing); the page has the button and the panel.
//   node scripts/.hiddenlevels-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ tiers: false });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const L = g.levels, { levelName, levelDescription } = await g.load('levelText.js');
  const all = Object.keys(L.HIDDEN_LEVELS), shown = L.playableHidden();
  check(all.length > 0 && shown.length > 0, `${all.length} hidden levels, ${shown.length} in the menu`);
  const left = all.filter(id => !shown.some(s => s.id === id));
  check(left.every(id => L.TEST_LEVELS.includes(id)) && L.TEST_LEVELS.every(id => left.includes(id)), 'the only ones left out are the test tracks: ' + left.join(', '));
  for (const { id, level } of shown) {
    const name = levelName(level);
    check(name && name !== id, id + ': has a name (' + name + ')');
    const words = levelDescription(level, false);
    if (!words) console.log('  info  ' + id + ': no description (the card shows its tags only)');
    let ok = true;
    try { g.select(id); g.Game.evil = false; g.Game.start(); } catch (e) { ok = false; console.log('        ' + (e && e.message)); }
    check(ok, id + ': starts as ?hidden=' + id + ' does (selectSpecial, Game.start)');
  }
  // the menu's code: the address it plays, no Progress
  const src = readFileSync(new URL('../src/delivery/render/hiddenlevels.js', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  check(!/Progress/.test(src), 'the menu code never touches Progress (a hidden run banks nothing)');
  check(/'\?hidden='/.test(src), 'its Play is the address ?hidden=<id>');
  check(/playableHidden\(\)/.test(src) && !/mall-dash|haunted-hollow|foliage-run|chianti/.test(src), 'its list is built from HIDDEN_LEVELS (no level named in the menu code)');
  const html = readFileSync(new URL('../delivery/index.html', import.meta.url), 'utf8');
  check(/id="hiddenLevelsBtn"/.test(html) && /id="hiddenLevels"/.test(html), 'the page has the Options button and the panel');
  const game = readFileSync(new URL('../src/delivery/game.js', import.meta.url), 'utf8');
  check(/LEVEL_INDEX >= 0 \? Progress\.levelDone/.test(game), 'game.js: only a menu level (LEVEL_INDEX >= 0) is recorded; a hidden one banks nothing');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
