// A check of the LOADOUT SIGNATURE and the STOCK pack pictures (render/loadout.js, render/carstill.js; the owner, 15-Oct: "Packs render images
// based on the player's customisation. It should be a STOCK good car" and "The showroom caches the player's car on load. It should re-render
// after customisation"). Headless (no renderer):
//   - loadoutKey(car) is stable while nothing changes (by id or by the car object alike), and CHANGES when each cosmetic changes: a wheel set,
//     a rim alone, a wheel colour, a wheel design, a plate design, the plate's text (saved or being typed), the raw "existing plates off"
//     switch, each prop slot and each prop's paint; putting everything back gives the first key again; a Legendary car's key is 'legend'
//     (not dressed) and moves only with the raw plates switch; onLoadout tells of every change
//   - the still cache's keys (carstill.js stillKey): a dressed picture is keyed by the loadout (a change = another key, no change = the same
//     key), per car id, side, pose and size; a STOCK picture's key never meets a dressed one (even with every cosmetic on Stock), does not move
//     when the loadout does, and is the Good one whatever side is asked (drawSoon logs evil false)
//   - every pack / Shop / blueprint-card call site draws the STOCK car (the source of render/packs.js, packart.js, packcontents.js, shop.js,
//     jimshop.js, carsources.js, packbanner.js, and the event offers of menustage.js); the dressed ones (showroom.js, cosmeticsui.js, the
//     menu card, the showroom's live car) key or compare by the loadout and listen to onLoadout
//   node scripts/.loadout-key-check.mjs
import { readFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const src = (f) => readFileSync(ROOT + '/src/delivery/' + f, 'utf8');
try {
  const C = await load('cars.js');
  const L = await load('render/loadout.js');
  const W = await load('render/wheelcosmetic.js');
  const P = await load('render/platecosmetic.js');
  const D = await load('render/propdress.js');
  const S = await load('render/carstill.js');
  const Store = await load('render/loadoutstore.js');
  const { Progress } = await load('progress.js');
  const { clearCosmetics, grantCosmetics, cosmeticKeys } = await load('render/cosmetics.js');
  Progress.noSave = true; // (the visit's own choices: nothing stored)
  clearCosmetics();
  grantCosmetics(cosmeticKeys()); // (every design owned, so each can be equipped)
  const car = C.carById('commuter'), legend = [...C.EARNED_CARS, ...C.CARS].find(c => c.legend);
  let told = 0;
  L.onLoadout(() => { told++; });

  // ---- the key ----
  const k0 = L.loadoutKey('commuter');
  check(k0 === L.loadoutKey(car) && k0 === L.loadoutKey('commuter') && k0 !== L.STOCK_KEY, 'stable while nothing changes, the same by id or by car (' + k0 + ')');
  const steps = [
    ['a wheel set', () => W.setWheelSet('whitewall-silver')],
    ['a wheel set with a rim', () => W.setWheelSet('spoke5')],
    ['a rim alone', () => W.setWheelRim('turbine')],
    ['a wheel colour', () => W.setWheelColour('gold')],
    ['a wheel design', () => W.setWheelDesign('redline')],
    ['a plate design', () => P.setPlateDesign('yellow', 'commuter')],
    ['the plate text', () => P.setPlateText('LOADOUT', 'commuter')],
    ['the plate text being typed', () => P.previewPlateText('TYPING', 'commuter')],
    ['the typing let go', () => P.previewPlateText(null)],
    ['the raw plates switch', () => P.setPlatesEquipped(true)],
    ['the raw plates switch off', () => P.setPlatesEquipped(false)],
    ['a roof prop', () => D.setProp('roof', 'roofbox', 'commuter')],
    ['the roof prop\'s paint', () => D.setPropPaint('roof', 'd8262b', 'commuter')],
    ['a cargo prop', () => D.setProp('cargo', 'cargocrates', 'commuter')],
    ['a wing', () => D.setProp('wing', 'winggt', 'commuter')],
    ['the wing\'s paint', () => D.setPropPaint('wing', 'f2f2ee', 'commuter')],
  ];
  let prev = k0;
  const seen = new Set([k0]), moved = [];
  for (const [what, act] of steps) {
    const before = told;
    act();
    const k = L.loadoutKey('commuter');
    const ok = k !== prev && told > before && k === L.loadoutKey('commuter');
    if (!ok) moved.push(what + ' (' + prev + ' -> ' + k + ', told ' + (told - before) + ')');
    if (what !== 'the typing let go' && what !== 'the raw plates switch off') seen.add(k);
    prev = k;
  }
  check(!moved.length, 'changes with each cosmetic and onLoadout tells of it: ' + steps.map(s => s[0]).join(', ') + (moved.length ? ' -- NOT: ' + moved.join('; ') : ''));
  check(seen.size === steps.length - 1, 'every step gave a key of its own (' + seen.size + ')');
  const kAll = L.loadoutKey('commuter');
  check(/turbine/.test(kAll) && /yellow\.LOADOUT/.test(kAll) && /roof=roofbox\.d8262b/.test(kAll) && /wing=winggt\.f2f2ee/.test(kAll), 'the full key reads every choice: ' + kAll);
  // Legendary
  if (legend) {
    const lk = L.loadoutKey(legend);
    P.setPlatesEquipped(true); const lk2 = L.loadoutKey(legend); P.setPlatesEquipped(false);
    check(lk === 'legend' && lk2 !== lk && L.loadoutKey(legend) === lk, 'a Legendary car (' + legend.id + ') is not dressed: "legend", whatever the loadout, moved only by the raw plates switch');
  } else check(false, 'a Legendary car to try');
  // back to Stock: the first key again
  W.setWheelSet('stock'); P.resetPlate(); for (const s of D.SLOTS) D.resetProp(s); Store.resetCar('commuter'); // (the earned slots were set on the commuter: per car only, CHECKLIST 437)
  check(L.loadoutKey('commuter') === k0, 'everything back to Stock: the first key again');

  // ---- the still cache's keys ----
  const el = (w = 200, h = 120) => ({ offsetWidth: w, offsetHeight: h, dataset: {}, className: 'test-pic', getBoundingClientRect: () => ({ width: w, height: h }) });
  const e = el();
  const dressedStock = S.stillKey(e, car, false, 'front', false), stockKey = S.stillKey(e, car, false, 'front', true);
  check(dressedStock !== stockKey && /\/stock\//.test(stockKey) && !/\/stock\//.test(dressedStock), 'a stock picture and a dressed one never share a key, even with every cosmetic on Stock (' + stockKey + ' / ' + dressedStock + ')');
  check(S.stillKey(e, car, true, 'front', true) === stockKey && S.stillKey(e, car, true, 'front', false) !== dressedStock, 'a stock picture is the Good one whatever side is asked; a dressed one keeps its side');
  check(S.stillKey(e, car, false, 'front', false) === dressedStock, 'a dressed key is stable while nothing changes');
  D.setProp('roof', 'roofbox', 'commuter');
  const dressedRoof = S.stillKey(e, car, false, 'front', false);
  check(dressedRoof !== dressedStock && S.stillKey(e, car, false, 'front', true) === stockKey, 'a cosmetic changed: the dressed key moves, the stock key does not');
  check(S.stillKey(e, C.carById('sport'), false, 'front', false) !== dressedRoof && S.stillKey(el(400, 240), car, false, 'front', false) !== dressedRoof && S.stillKey(e, car, false, 'hero', false) !== dressedRoof, 'keyed per car id, size and pose too');
  // drawSoon's log: the side and stock passed (window.__stillLog)
  globalThis.requestAnimationFrame = () => 0;
  globalThis.window.__stillLog = [];
  S.drawSoon(el(), car, { side: 'evil', stock: true, pose: 'front' });
  S.drawSoon(el(), car, { side: 'evil', pose: 'front' });
  const log = globalThis.window.__stillLog;
  check(log.length === 2 && log[0].stock && !log[0].evil && !log[1].stock && log[1].evil, 'drawSoon: a stock picture asked for Evil is drawn Good; a dressed one keeps Evil');
  D.resetProp('roof');

  // ---- the call sites ----
  const calls = (file, re) => [...src(file).matchAll(re)].map(m => m[0]);
  const site = [];
  const want = (file, re, n, what) => {
    const found = calls(file, re), stock = found.filter(c => /stock: true|, true\]\)|PRIZE_POSE, true\)/.test(c));
    if (found.length < n || stock.length !== found.length) site.push(file + ' ' + what + ': ' + stock.length + ' of ' + found.length + ' (want ' + n + '+)');
  };
  want('render/packs.js', /drawSoon\([^\n]*\);/g, 1, 'reveal cards');
  want('render/packart.js', /const opts = \{[^\n]*\}/g, 1, 'the car on a pack');
  want('render/packcontents.js', /observer\.watch\([^\n]*\)/g, 1, 'What\'s inside');
  want('render/shop.js', /stillSoon\(el, car, \{[^}]*\}\)/g, 2, 'the Featured tile');
  want('render/jimshop.js', /pics\.watch\([^\n]*\)/g, 1, 'Jim\'s blueprint cards');
  want('render/carsources.js', /drawSoon\(c\.pic[^\n]*\)/g, 1, 'Where to get it\'s blueprint card');
  want('render/packbanner.js', /makeShowCar\([^\n]*\)/g, 1, 'the pack banner');
  want('render/menustage.js', /drawLater\.push\(\[(?:prizeView|view, car, false)[^\n]*\]\)|stillCar\(view, car, false, PRIZE_POSE[^\n]*\)/g, 3, 'the event offers (grand prize, hunt car, featured / prize car)');
  check(!site.length, 'every pack / Shop / blueprint-card picture is drawn STOCK (packs, packart, packcontents, shop, jimshop, carsources, packbanner, the event offers)' + (site.length ? ' -- ' + site.join('; ') : ''));
  const still = src('render/carstill.js');
  check(/lookOf\(car, stock\)/.test(still) && /sideOf\(evil, stock\)/.test(still) && /onLoadout\(/.test(still), 'carstill.js keys a dressed picture by loadoutKey, a stock one apart and Good, and lets go of old loadouts on onLoadout');
  check(/loadoutKey\(car\)/.test(src('render/showroomview.js')) && /restyled/.test(src('render/showroomview.js')), 'the showroom\'s live car is built again when its loadout key differs (showroomview.js)');
  check(/onLoadout\(/.test(src('render/showroom.js')) && /onLoadout\(/.test(src('render/menustage.js')) && /carView\.loadout === loadoutKey\(CAR\)/.test(src('render/menustage.js')) && /onLoadout\(/.test(src('render/cosmeticsui.js')), 'the showroom\'s cards, the menu\'s car card and the Cosmetics fallback listen to onLoadout');
  check(/resolveRim\(carId, axle\)/.test(src('render/wheelcosmetic.js')) && /wornRim\(id, 'front'\)/.test(src('render/loadout.js')) && /wornRim\(id, 'rear'\)/.test(src('render/loadout.js')), 'the rim is read per car id and axle (resolveRim), as the dressing reads it');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
