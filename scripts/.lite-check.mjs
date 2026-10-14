// A check of the ?lite=<list> bisect switches (src/delivery/lite.js, lite.css; CHECKLIST 213): with no ?lite nothing is set
// (no class on <html>, no badge); each name sets its own `lite-<name>` class and only that; `all` sets every one; an unknown
// name is ignored; every name has CSS (or code) that acts on it, and every lite.css rule but the sheet-up block needs a lite
// class; the menu stage stops drawing under a sheet and the What's inside timer obeys the switches. No browser: lite.js is
// run with a stub document (its CSS import taken out).
//   node scripts/.lite-check.mjs
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const src = readFileSync('src/delivery/lite.js', 'utf8');
const css = readFileSync('src/delivery/lite.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const dir = mkdtempSync(join(tmpdir(), 'lite-check-'));
const file = join(dir, 'lite.mjs');
writeFileSync(file, src.replace(/^import '\.\/lite\.css';$/m, ''));

let n = 0;
const run = async (search) => {
  const classes = new Set(), body = [];
  globalThis.location = { search };
  globalThis.document = { documentElement: { classList: { add: (c) => classes.add(c), toggle: () => {} } }, body: { append: (x) => body.push(x) }, createElement: () => ({}) };
  const m = await import(pathToFileURL(file).href + '?' + (n++));
  return { classes: [...classes].sort(), badge: body.length, names: m.LITE_NAMES, lite: m.lite };
};
try {
  const none = await run('');
  check(none.classes.length === 0 && none.badge === 0, 'no ?lite: no class on <html>, no badge');
  const other = await run('?level=1&shop');
  check(other.classes.length === 0 && other.badge === 0, 'other parameters only: no class, no badge');
  const two = await run('?lite=glow,%20Twinkle,bogus');
  check(two.classes.join() === 'lite-glow,lite-twinkle' && two.badge === 1, '?lite=glow,Twinkle,bogus: lite-glow and lite-twinkle only, and the badge (' + two.classes.join(' ') + ')');
  check(two.lite('glow') && !two.lite('shine'), 'lite(name) answers for the names given only');
  const all = await run('?lite=all');
  check(all.classes.length === all.names.length && all.names.every(x => all.classes.includes('lite-' + x)), '?lite=all: every switch (' + all.names.join(',') + ')');
  for (const name of none.names) {
    const acted = name === 'scene' /* (since 14-Oct the rule itself: html.sheet-up hides what lies under a sheet) */ || css.includes('html.lite-' + name) || new RegExp("lite\\('" + name + "'\\)").test(readFileSync('src/delivery/render/packcontents.js', 'utf8'));
    check(acted, `'${name}' is acted on (lite.css or packcontents.js)`);
  }
} finally { rmSync(dir, { recursive: true, force: true }); }

// every lite.css rule but the sheet-up block and the badge needs a lite-* class (so no ?lite = nothing changes)
const rules = css.split('}').map(r => r.split('{')[0].trim()).filter(Boolean);
const loose = rules.filter(sel => !/^\.lite-badge$/.test(sel) && sel.split(',').some(s => !/html\.lite-|html\.sheet-up/.test(s)));
check(loose.length === 0, 'every lite.css rule is gated by html.lite-* (or html.sheet-up)' + (loose.length ? ': ' + loose.join(' | ') : ''));
const sheetRules = rules.filter(sel => sel.includes('html.sheet-up') && !sel.includes('lite-'));
// under a sheet (no ?lite): animations paused or stopped, and (since the owner's Mi Pad bisect, 14-Oct) everything under it hidden
const SHEET_BODIES = ['animation-play-state:paused!important;', 'animation:none!important;', 'visibility:hidden!important;', 'visibility:visible!important;'];
const sheetBodies = css.split('}').map(r => r.split('{')).filter(([sel, body]) => body && /html\.sheet-up/.test(sel) && !/lite-/.test(sel)).map(([, body]) => body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s/g, ''));
check(sheetRules.length > 0 && sheetBodies.every(body => SHEET_BODIES.includes(body)),
  'under a sheet (no ?lite) only animations stop and what lies under it is hidden (' + sheetBodies.length + ' rules)');

const main = readFileSync('src/delivery/main.js', 'utf8');
check(/^import '\.\/lite\.js';/m.test(main), 'main.js imports lite.js early (before the menu is built)');
const stage = readFileSync('src/delivery/render/menustage.js', 'utf8');
check(/const covered = sheetUp\(\);/.test(stage) && /if \(Garage\.isOpen \|\| covered\) return;/.test(stage), "menustage.js: the stage's 3D car is not drawn while a sheet is up");
const pc = readFileSync('src/delivery/render/packcontents.js', 'utf8');
check(/!lite\('stacks'\) && !lite\('anim'\)/.test(pc), "packcontents.js: the stacks' timer obeys ?lite=stacks and ?lite=anim");

console.log(failures ? failures + ' FAIL' : 'all ok');
process.exit(failures ? 1 : 0);
