// A headless check of the words files (src/delivery/words.js: carText.json, cargoText.json, trafficText.json,
// pickupText.json, gimmickText.json, obstacleText.json), in seconds, as the game reads them: every thing in each
// table has an entry or a fallback (its own name), no entry is for an id that is not there, every name is a real
// one, every blurb is one short line (BLURB_MOST characters at most), the file's words are what the table carries
// (the file comes first), and the failsafe: a bad entry (not an object, a name that is no text, a blank one) is
// passed over for the table's own, and never crashes or shows nothing.
//   node scripts/.words-check.mjs [--list]
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
const note = (text) => { if (process.argv.includes('--list')) console.log(text); };
try {
  const { WORDS, BLURB_MOST, nameOf, blurbOf, perkOf, statesOf, applyNames, slug } = await g.load('words.js');
  const { CARS, LEVEL_CARS } = await g.load('cars.js');
  const { CARGO } = await g.load('cargo.js');
  const { vehicleInfo, TRAFFIC_KINDS } = await g.load('levelinfo.js');
  const { CARDS } = await g.load('powerups.js');
  const { GROUPS, DRESSING } = await g.load('gimmicks.js');

  // what each kind's table has: [id, the name it carries (the file's, where it has one), whether it must have a blurb]
  const tables = {
    car: [...CARS, ...Object.values(LEVEL_CARS)].map(c => [c.id, c.name, true]),
    cargo: [...CARGO.good, ...CARGO.evil].map(c => [c.id, c.name, true]),
    traffic: (TRAFFIC_KINDS || []).map(kind => [kind, vehicleInfo(kind).name, true]),
    pickup: CARDS.map(c => [c.type, c.name, true]),
    // (a card that says its own line on each level, `line`, may have no blurb: its line is the more particular)
    gimmick: GROUPS.flatMap(gr => gr.cards).map(c => [c.id ?? slug(c.name), c.name, !c.line]),
    obstacle: DRESSING.cards.filter(c => c.id).map(c => [c.id, c.name, true]),
  };
  const shape = (e) => e && typeof e === 'object' && !Array.isArray(e);
  const checkText = (where, field, v) => {
    if (typeof v !== 'string' || !v.trim()) return fail(where + ': ' + field + ' is no text');
    if (v !== v.trim() || /\s{2,}/.test(v)) fail(where + ': stray spaces in ' + field);
  };
  let entries = 0, blurbs = 0, longest = 0;
  for (const [kind, rows] of Object.entries(tables)) {
    const file = WORDS[kind], ids = new Set(rows.map(([id]) => id));
    if (!shape(file)) { fail(kind + 'Text.json is not an object'); continue; }
    if (ids.size !== rows.length) fail(kind + ': two things have the same id');
    for (const id of Object.keys(file)) if (!ids.has(id)) fail(kind + 'Text.json: "' + id + '" is no ' + kind + ' there is');
    for (const [id, name, needsBlurb] of rows) {
      const where = kind + 'Text.json: ' + id, e = file[id];
      if (typeof name !== 'string' || !name.trim()) fail(kind + ' ' + id + ': no name, in the file or in its own table');
      if (e === undefined) { if (needsBlurb) fail(where + ': no entry (a name and a blurb)'); continue; }
      entries++;
      if (!shape(e)) { fail(where + ' is not an object'); continue; }
      const allowed = kind === 'car' ? ['name', 'blurb', 'perk'] : kind === 'cargo' ? ['name', 'blurb', 'states'] : ['name', 'blurb'];
      for (const key of Object.keys(e)) if (!allowed.includes(key)) fail(where + '.' + key + '?');
      checkText(where, 'name', e.name);
      if (e.name !== undefined && name !== e.name) fail(where + ': the table carries "' + name + '", not the file\'s "' + e.name + '"');
      if (e.blurb === undefined) { if (needsBlurb) fail(where + ': no blurb'); }
      else {
        checkText(where, 'blurb', e.blurb);
        blurbs++;
        longest = Math.max(longest, String(e.blurb).length);
        if (String(e.blurb).length > BLURB_MOST) fail(where + ': its blurb is ' + e.blurb.length + ' characters (' + BLURB_MOST + ' at most)');
        if (/[\n\r<>]/.test(e.blurb)) fail(where + ': its blurb is more than one plain line');
        note(kind.padEnd(9) + id.padEnd(22) + String(e.blurb.length).padStart(3) + '  ' + e.name + ' | ' + e.blurb);
      }
      if (e.perk !== undefined) checkText(where, 'perk', e.perk);
    }
  }
  // ---- the cargo: Title Case names are kept as they are; an Evil item's three states, in sentence case
  for (const item of CARGO.evil) {
    const s = WORDS.cargo[item.id]?.states;
    if (s !== undefined && !(Array.isArray(s) && s.length === 3 && s.every(x => typeof x === 'string' && x.trim()))) fail('cargoText.json: ' + item.id + ': "states" is not three lines');
    if (!Array.isArray(item.states) || item.states.length !== 3) fail('cargo ' + item.id + ': it does not carry three states');
    else for (const st of item.states) if (st[0] !== st[0].toUpperCase()) fail('cargo ' + item.id + ': state "' + st + '" does not start with a capital');
  }

  // ---- the failsafe: a bad entry is passed over for the table's own words, never a crash, never nothing
  const odd = { a: 7, b: null, c: [], d: 'text', e: { name: '' }, f: { name: '   ', blurb: 5 }, g: { name: { x: 1 }, blurb: ['x'] }, h: { name: ' Real ', blurb: ' Line ' } };
  const saved = WORDS.car;
  try {
    WORDS.car = odd;
    let bad = '';
    for (const id of [...Object.keys(odd), 'zz', undefined, null, 42, '__proto__', 'constructor', 'toString'])
      if (nameOf('car', id, 'Own') !== (id === 'h' ? 'Real' : 'Own') || blurbOf('car', id, 'own') !== (id === 'h' ? 'Line' : 'own') || perkOf('car', id, 'p') !== 'p') bad += ' ' + String(id);
    if (bad) fail('failsafe: a bad entry is not passed over for the table\'s own words:' + bad);
    if (nameOf('nokind', 'a', 'Own') !== 'Own' || blurbOf('nokind', 'a') !== '') fail('failsafe: an unknown kind of words is not the fallback');
    const items = [{ id: 'a', name: 'Own' }, { id: 'h', name: 'Own', perk: 'Mine' }, { id: 'x', name: 'Own' }, null, 5];
    applyNames('car', items);
    if (items[0].name !== 'Own' || items[1].name !== 'Real' || items[1].perk !== 'Mine' || items[2].name !== 'Own' || 'perk' in items[2]) fail('failsafe: applyNames: the file\'s name comes first, a bad or missing entry leaves the table\'s own');
  } catch (error) {
    fail('failsafe: a bad entry crashed: ' + (error?.message || error));
  } finally { WORDS.car = saved; }
  if (statesOf('no-such', ['A', 'B', 'C']).join() !== 'A,B,C') fail('failsafe: states for a cargo that is not in the file');
  try {
    WORDS.cargo.__s = { states: ['One', '', 'Three'] }; WORDS.cargo.__t = { states: ['One', 'Two'] }; WORDS.cargo.__u = { states: ['One', 'Two', 'Three'] };
    const own = ['A', 'B', 'C'];
    if (statesOf('__s', own) !== own || statesOf('__t', own) !== own || statesOf('__u', own).join() !== 'One,Two,Three') fail('failsafe: states: a bad set of states must give the table\'s own, a good one the file\'s');
  } finally { delete WORDS.cargo.__s; delete WORDS.cargo.__t; delete WORDS.cargo.__u; }
  if (slug('The giant frog') !== 'the-giant-frog' || slug('Stop / go roadworks') !== 'stop-go-roadworks') fail('slug: a card\'s id');

  const counts = Object.entries(tables).map(([k, r]) => k + ' ' + r.length).join(', ');
  console.log(failed ? failed + ' FAILED' : 'words: ' + counts + '; ' + entries + ' entries, ' + blurbs + ' blurbs (longest ' + longest + ' of ' + BLURB_MOST + ' characters)');
} finally {
  await g.close();
}
process.exit(failed ? 1 : 0);
