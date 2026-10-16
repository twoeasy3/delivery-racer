// A check of the COSMETICS SCREEN'S TABS (render/cosmeticslots.js, render/cosmeticsui.js; the owner, 16-Oct: "reword 'Coming Soon/Locked'
// to just not rendering if the car does not support it"):
//   - for a sample of cars (a closed hatch with no cargo slot, a pickup, a car with no wing slot, a kei truck, a canopy-roofed car with no
//     prop slot, the Classic GT, a Legendary car) the tabs drawn are exactly Wheels, Plate and the prop slots slotStatus allows, in order
//   - no tab says 'Locked' or 'Coming'; the screen's source has no lock line, no 'Coming later', no lock reason; the CSS no lock styles
//   - the open tab falls back to the first drawn (Wheels) when the car has no tab for it, and stays when it has
//   - Decal and Glow (underglow) never show without ?cosmetics=all, on any car; with it (setDemo) they show on the pickup; the labels are
//     short (7 characters at most)
//   - the KILL EFFECT (slot 'kill', CHECKLIST 390, joined to the registry at the v1.1.148-alpha merge): a 'car' slot (per car over the
//     default); its tab shows on every car once render/killfx.js has registered its items, and cosmeticsui.js gives it its panel;
//     registering a kill-effect item in render/cosmetics.js brings its tab on every car (and removing it takes it away); registerSlot
//     merges into the dormant entry; the demo is off by default and registers nothing in the cosmetics registry
//   - the registry and the screen are outside the replay fingerprint (vite.config.js logicFiles)
//   node scripts/.cosmetics-tabs-check.mjs
import { readFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const D = await load('render/propdress.js');
  const R = await load('render/cosmeticslots.js');
  const { COSMETICS, registerCosmetics } = await load('render/cosmetics.js');
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const car = (id) => all.find(c => c.id === id);
  const tabs = (c) => R.shownSlots(c).map(s => s.id).join();
  const PROPS = ['roof', 'cargo', 'wing'];
  const want = (c) => ['wheels', 'plate', ...PROPS.filter(sl => D.slotStatus(c, sl).ok)].join();

  check(!R.isDemo(), 'the demo is off by default');
  const sample = { hothatch: 'wheels,plate,roof,wing', pickup: 'wheels,plate,roof,cargo,wing', splitwindow: 'wheels,plate,roof', keitruck: 'wheels,plate,roof,cargo,wing', rocketfin: 'wheels,plate', classicgt: 'wheels,plate,wing' };
  for (const [id, exp] of Object.entries(sample)) check(car(id) && tabs(car(id)) === exp && tabs(car(id)) === want(car(id)), id + ': the tabs are ' + (car(id) ? tabs(car(id)) : 'no car') + ' (expected ' + exp + ')');
  const legend = all.find(c => c.legend);
  check(legend && tabs(legend) === 'wheels,plate', 'a Legendary car (' + legend?.id + '): Wheels and Plate only');
  const bad = all.filter(c => tabs(c) !== want(c));
  check(bad.length === 0, 'every one of ' + all.length + ' cars: the tabs are exactly Wheels, Plate and its supported prop slots' + (bad.length ? ' (' + bad.slice(0, 5).map(c => c.id).join(', ') + ')' : ''));
  const dormant = ['decal', 'underglow'];
  check(all.every(c => !R.shownSlots(c).some(s => dormant.includes(s.id) || s.id === 'kill')), 'without ?cosmetics=all (and before render/killfx.js registers its items), Decal, Glow and Kill FX never show, on any car');

  // the open tab
  check(R.tabToOpen(R.shownSlots(car('hothatch')), 'cargo') === 'wheels' && R.tabToOpen(R.shownSlots(car('rocketfin')), 'wing') === 'wheels' && R.tabToOpen(R.shownSlots(car('pickup')), 'cargo') === 'cargo' && R.tabToOpen(R.shownSlots(car('classicgt')), 'underglow') === 'wheels', 'the open tab: kept when the car has it (pickup cargo), else the first drawn, Wheels (hatch cargo, canopy car wing, a dormant Glow)');

  // the words
  const ui = readFileSync(ROOT + '/src/delivery/render/cosmeticsui.js', 'utf8'), css = readFileSync(ROOT + '/src/delivery/cosmetics.css', 'utf8'), reg = readFileSync(ROOT + '/src/delivery/render/cosmeticslots.js', 'utf8');
  check(R.SLOT_LIST.every(s => !/lock|coming/i.test(s.label + s.name)), 'no tab label or name says Locked or Coming');
  check(!/Coming later|'Locked'|lockReason|lockIcon|cz-lockline|is locked: |Not available for this car|not audited/.test(ui) && !/cz-lock|\.later|\.cz-slot\.na|\.cz-slot\.locked/.test(css), "the screen's source and CSS: no 'Locked' / 'Coming later' tab, no lock line, no lock reason, no greyed-tab styles");
  check(/role', 'tab'/.test(ui) && /aria-label', slot\.name/.test(ui) && /button\.cz-slot/.test(ui), "a tab is a role=tab button named by the slot's full name (no lock wording), and the arrow keys reach the tabs drawn (choices())");
  check(R.SLOT_LIST.every(s => s.label.length <= 7) && R.SLOT_LIST.map(s => s.label).join() === 'Wheels,Plate,Roof,Cargo,Wing,Decal,Glow,Kill FX', 'the labels, in order and short: ' + R.SLOT_LIST.map(s => s.label).join(', '));

  // the demo (?cosmetics=all)
  const before = COSMETICS.length;
  R.setDemo(true);
  check(tabs(car('pickup')) === 'wheels,plate,roof,cargo,wing,decal,underglow' && R.shownSlots(car('pickup')).length === 7, 'with ?cosmetics=all: the dormant tabs on the pickup too (' + tabs(car('pickup')) + '; Kill FX comes with its items, below)');
  check(tabs(car('rocketfin')) === 'wheels,plate,decal,underglow', '...and the canopy car still has no prop tab (' + tabs(car('rocketfin')) + ')');
  check(dormant.every(id => R.slotById(id).items().every(it => it.sample && /^Sample/.test(it.name))) && COSMETICS.length === before, '...its items are labelled Sample and nothing is put in the cosmetics registry');
  R.setDemo(false);
  check(!R.shownSlots(car('pickup')).some(s => dormant.includes(s.id)), '...and off again: the dormant tabs are gone');
  check(R.slotById('kill').scope === 'car' && !R.slotById('killfx') && R.SLOT_LIST.filter(s => s.scope === 'player').length === 0, "Kill FX is the 'kill' slot, per car like the others (the car / all cars switch shows on it); no 'player' slot today");
  check(/scopeBar\.hidden = slotById\(id\)\?\.scope === 'player'/.test(ui), '...the screen still hides the switch and the car buttons on a player slot (for a later one)');
  check(/registerSlot\(\{ id: 'kill', panel: \(\) => buildKill\(\), refresh: \(\) => killShown\(\) \}\)/.test(ui) && /viewBtns\[5\]\.hidden = id !== 'kill'/.test(ui), "the screen gives the Kill effect tab its panel (buildKill, with the Test button) through registerSlot");

  // the extension point
  const undo = registerCosmetics([{ slot: 'kill', id: 'zzz-test', name: 'Test', free: true }]);
  check(all.every(c => R.shownSlots(c).some(s => s.id === 'kill')), 'a kill effect registered in render/cosmetics.js: the Kill FX tab shows on every car');
  undo();
  check(!R.shownSlots(car('pickup')).some(s => s.id === 'kill'), '...removed: gone again');
  await load('render/killfx.js');
  check(all.every(c => R.shownSlots(c).some(s => s.id === 'kill')) && R.slotById('kill').items().length >= 2, 'render/killfx.js loaded: its effects registered, the Kill FX tab on every car (' + R.slotById('kill').items().map(i => i.id).join(', ') + ')');
  const orig = R.slotById('decal').supports;
  R.registerSlot({ id: 'decal', supports: (c) => c.id === 'pickup' });
  const undoDecal = registerCosmetics([{ slot: 'decal', id: 'roundel', name: 'Roundel', free: true }]);
  check(tabs(car('pickup')).includes('decal') && !tabs(car('hothatch')).includes('decal') && R.SLOT_LIST.filter(s => s.id === 'decal').length === 1, 'registerSlot merges into the dormant Decal: its supports() decides per car (a zone table row)');
  undoDecal(); R.registerSlot({ id: 'decal', supports: orig });
  R.registerSlot({ id: 'horn', label: 'Horn', scope: 'player', items: () => [{ id: 'a', name: 'A' }] });
  check(R.SLOT_LIST.map(s => s.id).indexOf('horn') === R.SLOT_LIST.map(s => s.id).indexOf('kill') - 1, 'a new slot goes in before Kill FX');
  R.SLOT_LIST.splice(R.SLOT_LIST.findIndex(s => s.id === 'horn'), 1);
  check(/to add a slot/i.test(reg) && /registerSlot\(\{ id: 'kill'/.test(reg) && /registerSlot\(\{ id: 'decal'/.test(reg), 'the registry says how to add a slot (Kill FX and Decal examples)');
  check(/`cosmetics=all`|cosmetics=all/.test(readFileSync(ROOT + '/URL-PARAMS.md', 'utf8')), '?cosmetics=all is in URL-PARAMS.md');

  // the replay fingerprint
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  const logic = logicFiles();
  check(!logic.some(f => /cosmetic/.test(f)), 'the registry and the screen are outside the replay fingerprint (' + logic.length + ' logic files)');
} catch (e) { failures++; console.log('  FAIL  ' + (e.stack || e)); }
await close();
console.log(failures ? failures + ' check(s) failed' : 'all checks passed');
process.exit(failures ? 1 : 0);
