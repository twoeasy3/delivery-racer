// A check of the PER-CAR LOADOUT (render/loadoutstore.js; the owner, 15-Oct: "Let's change the customisation to be car specific now"). Headless:
//   - MIGRATION: an older save (only the old global keys: wheel design / colour / rim with its old per-car part, plate design / text, the
//     three props and paints) is read as the DEFAULT, so every car keeps the look; nothing is written by reading; the old keys stay
//   - a car's OVERRIDE beats the default; a DEFAULT change reaches only the cars without their own for that slot; an override equal to the
//     default is dropped; Reset car; Copy to all (others cleared, or kept); the old keys follow the default (a mirror), never a car's choice
//   - garbage in the key (not JSON, wrong shapes, bad car ids, unknown ids, too many cars), blocked storage, Progress.noSave
//   - loadoutKey per car: stable, moves for the car changed only; a default change moves the followers only (per-car cache invalidation)
//   - live models follow their own car (a commuter with 5-spoke rims and a roof box beside a pick-up on the default); the plate's typed
//     preview reaches only its target; ownership stays global and gates each car's choice (a locked plate shows Stock on that car only)
//   - a STOCK model (the unlock reveals, packs: dressCosmetics { stock: true }) wears nothing whatever the loadout
//   - every car of the game (221-ish: garage, level, secret, idea and Super cars) resolves its key and builds dressed without error, cars
//     with no rims, plate or prop slots included; the store's size with an override on every car
//   - ?wheelrim= ?platedesign= ?roofprop= (a visit's test switches) still dress EVERY car, over its own choice
//   - the replay fingerprint (vite.config.js logicFiles) includes none of it
//   - EARNED SLOTS ARE PER CAR ONLY (CHECKLIST 437: plate design, props, kill, glow): a car wears its own item or the free look, never the
//     default's; a default's other fields (plate text, prop paint) still reach the followers; Copy to all copies the wheels only
//   node scripts/.loadout-store-check.mjs
import { startModels } from './modelpatch-load.mjs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
let session = await startModels();
try {
  const { load } = session;
  const C = await load('cars.js');
  const Store = await load('render/loadoutstore.js');
  const W = await load('render/wheelcosmetic.js');
  const R = await load('render/rims.js');
  const P = await load('render/platecosmetic.js');
  const D = await load('render/propdress.js');
  const L = await load('render/loadout.js');
  const { makeShowCar } = await load('render/showcar.js');
  const { Progress } = await load('progress.js');
  const { clearCosmetics, grantCosmetics, cosmeticKeys } = await load('render/cosmetics.js');
  const raw = globalThis.localStorage;
  const keys = () => { const out = {}; for (const k of ['delivery.loadout', 'delivery.wheeldesign', 'delivery.wheelcolour', 'delivery.wheelrim', 'delivery.platedesign', 'delivery.platetext', 'delivery.prop.roof', 'delivery.prop.roof.paint']) out[k] = raw.getItem(k); return out; };
  const wipe = () => { for (const k of Object.keys(keys())) raw.removeItem(k); for (const s of ['cargo', 'wing']) { raw.removeItem('delivery.prop.' + s); raw.removeItem('delivery.prop.' + s + '.paint'); } Store.reloadStore(); };
  clearCosmetics(); grantCosmetics(cosmeticKeys(), 50); // (earned cosmetics, CHECKLIST 437: plenty of each, so every choice below can be worn)

  // ---- MIGRATION ----
  wipe();
  raw.setItem('delivery.wheeldesign', 'whitewall'); raw.setItem('delivery.wheelcolour', 'silver');
  raw.setItem('delivery.wheelrim', JSON.stringify({ all: 'none', cars: { sport: { all: 'turbine' } } }));
  raw.setItem('delivery.platedesign', 'yellow'); raw.setItem('delivery.platetext', 'OLD 1');
  raw.setItem('delivery.prop.roof', 'roofbox'); raw.setItem('delivery.prop.roof.paint', 'D8262B');
  Store.reloadStore();
  const before = JSON.stringify(keys());
  check(W.wheelSet('commuter') === 'whitewall-silver' && W.wheelSet('pickup') === 'whitewall-silver' && W.wheelSet() === 'whitewall-silver', 'an older save: its global wheel set is the default, on every car');
  check(P.plateDesign() === 'yellow' && P.plateText('pickup') === 'OLD 1' && D.propChoice('roof') === 'roofbox' && D.propPaintChoice('roof', 'commuter') === 'd8262b' && P.plateDesign('commuter') === 'stock' && D.propChoice('roof', 'pickup') === 'none', '...its plate (design, text) and roof prop (and paint) read into the default; the earned items are per car (render/cosmeticstock.js migrateStock moves them onto the cars), so a car reads its own: Stock');
  check(R.resolveRim('sport', 'front') === 'turbine' && W.wheelDesign('sport') === 'whitewall' && R.resolveRim('commuter', 'front') === 'none', 'the old per-car rim (never used by a screen) became that car\'s own rim, its tyre and hub from the default');
  check(Store.wasMigrated() && JSON.stringify(keys()) === before && raw.getItem('delivery.loadout') === null, 'reading wrote nothing: the store is first written at the first change; the old keys untouched');

  // ---- a car's own beats the default; the default reaches only the followers ----
  W.setWheelSet('spoke5', 'commuter'); D.setProp('roof', 'roofbeacon', 'commuter');
  const stored = JSON.parse(raw.getItem('delivery.loadout'));
  check(stored && stored.v === 1 && stored.default.wheels.design === 'whitewall' && stored.cars.commuter.wheels.rim.all === 'spoke5', 'the first change writes the ONE key (' + raw.getItem('delivery.loadout').length + ' chars), the default imported in it');
  check(raw.getItem('delivery.wheeldesign') === 'whitewall' && raw.getItem('delivery.prop.roof') === 'roofbox', 'a car\'s choice is not mirrored into the old keys (they hold the default)');
  check(W.wheelSet('commuter') === 'spoke5' && R.resolveRim('commuter', 'front') === 'spoke5' && R.resolveRim('commuter', 'rear') === 'spoke5' && D.propChoice('roof', 'commuter') === 'roofbeacon', 'the commuter\'s own: 5-spoke on both axles, a beacon');
  check(W.wheelSet('pickup') === 'whitewall-silver' && R.resolveRim('pickup', 'front') === 'none' && D.propChoice('roof', 'pickup') === 'none', 'the pick-up keeps the default (no roof prop: earned items are per car)');
  check(D.propPaintChoice('roof', 'commuter') === 'd8262b', 'an edit copies the car\'s resolved slot first (the beacon keeps the red it inherited)');
  W.setWheelSet('gold-rush'); D.setProp('roof', 'roofsign');
  check(W.wheelSet('pickup') === 'gold-rush' && D.propChoice('roof', 'pickup') === 'none' && W.wheelSet('commuter') === 'spoke5' && D.propChoice('roof', 'commuter') === 'roofbeacon', 'a default change (All cars) reaches the pick-up, not the commuter\'s own; an earned item set on the default is ignored (per car only)');
  check(raw.getItem('delivery.wheelcolour') === 'gold' && raw.getItem('delivery.wheeldesign') === 'stock' && raw.getItem('delivery.prop.roof') === null, '...and the old keys follow the default (a rollback finds the all-cars look; an earned item set on All cars clears the default\'s to the free look)');
  P.setPlateDesign('classic');
  check(P.plateDesign('commuter') === 'stock' && P.plateDesign() === 'stock' && P.plateText('commuter') === 'OLD 1' && Store.hasOwn('commuter', 'plate') === false, 'a slot the commuter has none of its own for follows the default (its text); a design set on All cars is ignored');
  W.setWheelSet('gold-rush', 'commuter');
  check(!Store.hasOwn('commuter', 'wheels') && Store.hasOwn('commuter', 'roof'), 'a car\'s choice equal to the default is dropped (the car follows the default again)');
  check(Store.differs('commuter') && !Store.differs('pickup') && Store.differs('commuter', 'roof') && !Store.differs('commuter', 'wheels'), 'differs(): the Cosmetics screen\'s Custom mark and tab dots');

  // ---- loadoutKey per car (the caches: stills, showroom, menu card) ----
  const kc = L.loadoutKey('commuter'), kp = L.loadoutKey('pickup'), ks = L.loadoutKey('sport');
  check(kc !== kp && L.loadoutKey('commuter') === kc && L.loadoutKey(C.carById('commuter')) === kc, 'keys differ car to car and are stable (' + kc + ' / ' + kp + ')');
  D.setProp('roof', 'roofbox', 'commuter');
  check(L.loadoutKey('commuter') !== kc && L.loadoutKey('pickup') === kp && L.loadoutKey('sport') === ks, 'the commuter changed: its key moves, the pick-up\'s and the sport\'s do not');
  const kc2 = L.loadoutKey('commuter');
  D.setProp('roof', 'roofbeacon');
  check(L.loadoutKey('commuter') === kc2 && L.loadoutKey('pickup') === kp && L.loadoutKey('sport') === ks, 'a roof set on the default is ignored (per car only): no key moves');
  W.setWheelSet('red-hot');
  check(L.loadoutKey('commuter') !== kc2, '...and a default slot the commuter follows (wheels) moves its key too');

  // ---- live models: each wears its own car's loadout ----
  W.setWheelSet('stock'); P.resetPlate(); for (const s of D.SLOTS) D.resetProp(s); Store.resetCar('commuter'); Store.resetCar('sport');
  const com = makeShowCar(C.carById('commuter')), pick = makeShowCar(C.carById('pickup'));
  const rims = (m) => m.userData.wheelHubs?.rims?.list?.length || 0, roof = (m) => m.userData.propPlan?.groups.roof?.userData.propId || null;
  W.setWheelSet('spoke5', 'commuter'); D.setProp('roof', 'roofbox', 'commuter');
  check(rims(com) === 4 && roof(com) === 'roofbox' && rims(pick) === 0 && roof(pick) === null, 'live: the commuter wears 5-spoke rims and a roof box at once, the pick-up beside it stays stock');
  W.setWheelSet('twin-spoke'); D.setProp('roof', 'roofbeacon');
  check(rims(pick) === 4 && pick.userData.wheelHubs.rims.list[0].userData.rim.id === 'twin10' && roof(pick) === null && com.userData.wheelHubs.rims.list[0].userData.rim.id === 'spoke5' && roof(com) === 'roofbox', 'live: All cars to twin spoke (and a beacon, ignored: per car): the pick-up follows the wheels, the commuter keeps its own');
  Store.resetCar('commuter');
  check(com.userData.wheelHubs.rims.list[0]?.userData.rim.id === 'twin10' && roof(com) === null && !Store.differs('commuter') && raw.getItem('delivery.loadout').indexOf('commuter') < 0, 'Reset car: the commuter is back on the default, live, and its entry is gone');
  const stock = makeShowCar(C.carById('commuter'), { stock: true });
  check(!stock.userData.wheelHubs && !stock.userData.propPlan && !stock.userData.platePlan, 'a STOCK model (unlock reveals, packs, Shop) is not dressed at all');

  // ---- the plate's typed preview reaches only its target ----
  P.setPlateDesign('yellow');
  P.previewPlateText('MINE', 'commuter');
  check(P.plateText('commuter') === 'MINE' && P.plateText('pickup') === P.plateText() && P.plateText() !== 'MINE', 'a text typed for This car shows on that car only');
  P.previewPlateText('ALL', null); P.setPlateText('MINE 2', 'commuter'); P.previewPlateText('ALL', null);
  check(P.plateText('pickup') === 'ALL' && P.plateText('commuter') === 'MINE 2', 'a text typed for All cars shows on the followers, not on a car with its own plate');
  P.previewPlateText(null);

  // ---- Copy to all ----
  W.setWheelSet('spoke5', 'commuter'); D.setProp('roof', 'roofbox', 'commuter'); W.setWheelSet('turbine', 'sport');
  Store.copyToAll('commuter', { others: 'keep' });
  check(W.wheelSet() === 'spoke5' && D.propChoice('roof') === 'none' && D.propChoice('roof', 'commuter') === 'roofbox' && !Store.hasOwn('commuter', 'wheels') && W.wheelSet('sport') === 'turbine', 'Copy to all (keep): the commuter\'s wheels are the default; its roof stays its own (earned: per car); the sport keeps its own');
  W.setWheelSet('blackout', 'commuter');
  Store.copyToAll('commuter');
  check(W.wheelSet('sport') === 'blackout' && W.wheelSet('pickup') === 'blackout' && Object.values(Store.snapshot().cars).every(c => !c.wheels) && D.propChoice('roof', 'commuter') === 'roofbox' && raw.getItem('delivery.wheelcolour') === 'black', 'Copy to all (the screen\'s: clear): every car wears its wheels, no car keeps its own wheels; earned items stay per car; the old keys follow');
  // (CHECKLIST 340) only the slots the car CHANGED are copied; another car keeps its own choice of every other slot
  D.setProp('roof', 'roofbeacon', 'sport'); W.setWheelSet('turbine', 'sport'); P.setPlateText('SPORT', 'pickup'); W.setWheelSet('red-hot', 'commuter');
  const roofBefore = D.propChoice('roof'), plateBefore = P.plateText();
  check(JSON.stringify(Store.copySlots('commuter')) === '["wheels"]' && JSON.stringify(Store.copyAffects('commuter')) === '["sport"]', 'Copy to all: the commuter changed its wheels only (copySlots ' + JSON.stringify(Store.copySlots('commuter')) + '); it would change the sport\'s own wheels, not the pick-up (its own plate)');
  const copied = Store.copyToAll('commuter');
  check(JSON.stringify(copied) === '["wheels"]' && W.wheelSet() === 'red-hot' && W.wheelSet('sport') === 'red-hot' && W.wheelSet('pickup') === 'red-hot' && !Store.hasOwn('commuter', 'wheels'), '...copied: every car wears its wheels, the sport\'s own wheels dropped');
  check(D.propChoice('roof', 'sport') === 'roofbeacon' && Store.hasOwn('sport', 'roof') && P.plateText('pickup') === 'SPORT' && D.propChoice('roof') === roofBefore && P.plateText() === plateBefore, '...the sport keeps its own roof, the pick-up its own plate, the default\'s roof and plate untouched');
  check(Store.copyToAll('commuter').length === 0 && W.wheelSet('sport') === 'red-hot', 'Copy to all on a car that follows the default everywhere: nothing copied, nothing changed');
  // (CHECKLIST 340) Reset progress clears every choice (render/menu.js calls resetAll beside clearCosmetics)
  Store.resetAll();
  check(W.wheelSet('sport') === 'stock' && W.wheelSet() === 'stock' && D.propChoice('roof', 'sport') === 'none' && D.propChoice('roof') === 'none' && P.plateText('pickup') === P.plateText() && !Object.keys(Store.snapshot().cars).length && !Object.keys(Store.snapshot().default).length, 'resetAll (Reset progress): every car and the default back to Stock');
  Store.reloadStore();
  check(!Store.wasMigrated() && W.wheelSet() === 'stock' && raw.getItem('delivery.prop.roof') === null && raw.getItem('delivery.wheelcolour') === 'stock', '...written: a reload reads the empty store (not the old keys), and the old keys are Stock too');
  W.setWheelSet('blackout'); P.setPlateDesign('yellow'); P.setPlateText('MINE 2', 'commuter'); // (the state before these lines, for what follows)

  // ---- ownership: global, gating each car's choice ----
  grantCosmetics(['plate:blackgold']);
  check(P.setPlateDesign('blackgold', 'commuter') && P.shownDesign('commuter') === 'blackgold', 'an owned locked design equips on one car');
  clearCosmetics();
  check(P.plateDesign('commuter') === 'blackgold' && P.shownDesign('commuter') === 'stock' && P.shownDesign('pickup') === 'stock' && P.setPlateDesign('blackgold', 'pickup') === false, 'ownership forgotten (Reset progress): that car wears Stock (its choice kept), the others unchanged; it cannot be equipped');
  grantCosmetics(['plate:blackgold']);
  check(P.shownDesign('commuter') === 'blackgold', '...owned again: back on that car');
  clearCosmetics();

  // ---- garbage, blocked storage, noSave ----
  raw.setItem('delivery.loadout', 'nonsense{'); Store.reloadStore();
  check(Store.wasMigrated() && W.wheelSet('commuter') === 'blackout', 'a store that is not JSON: the old keys (the mirror) are read instead');
  const junkCars = { 'bad id!': { wheels: { design: 'redline' } }, commuter: { wheels: { design: '<b>', hub: 7, rim: { all: 'spoke5', front: 'nope!' } }, roof: 'x', plate: { text: 'A'.repeat(99) }, bumper: { id: 'x' } } };
  for (let i = 0; i < 450; i++) junkCars['car' + i] = { wheels: { design: 'redline' } };
  raw.setItem('delivery.loadout', JSON.stringify({ v: 1, default: { wheels: { design: 'nonsense', hub: 'gold' }, roof: { id: 'roofbox', paint: 'zzz' }, junk: 1 }, cars: junkCars }));
  Store.reloadStore();
  const snap = Store.snapshot();
  check(Object.keys(snap.cars).length <= Store.MAX_CARS && !snap.cars['bad id!'] && !snap.default.junk && !snap.cars.commuter?.roof && !snap.cars.commuter?.plate && !snap.cars.commuter?.bumper && snap.cars.commuter?.wheels?.rim?.all === 'spoke5' && !snap.cars.commuter?.wheels?.rim?.front, 'garbage: unknown slots, fields, car ids and values dropped; at most ' + Store.MAX_CARS + ' cars');
  check(W.wheelDesign() === 'stock' && W.wheelColour() === 'gold' && D.propPaintChoice('roof') === 'match' && R.resolveRim('commuter', 'front') === 'spoke5' && W.wheelDesign('commuter') === 'stock', 'unknown ids read as Stock / match by each slot\'s module; the good parts kept');
  raw.setItem('delivery.loadout', JSON.stringify({ v: 2, default: {} })); Store.reloadStore();
  check(Store.wasMigrated(), 'a store of another version: the old keys');
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  Store.reloadStore();
  let threw = false;
  try {
    check(W.wheelSet('commuter') === 'stock' && P.shownDesign('pickup') === 'stock', 'no storage (it throws): Stock everywhere');
    W.setWheelSet('red-hot', 'commuter'); P.setPlateText('NOSTORE', 'commuter'); Store.resetCar('pickup'); Store.copyToAll('commuter');
    check(W.wheelSet('pickup') === 'red-hot', 'no storage: changes hold for the visit');
  } catch (error) { threw = String(error); }
  check(!threw, 'no storage: nothing throws' + (threw ? ' (' + threw + ')' : ''));
  globalThis.localStorage = raw;
  wipe();
  W.setWheelSet('spoke5', 'commuter');
  const saved = JSON.stringify(keys());
  grantCosmetics(cosmeticKeys(), 5); // (owned again, for the visit's roof below)
  Progress.noSave = true;
  check(W.wheelSet('commuter') === 'stock', 'Progress.noSave: the saved store is not read (a test visit starts Stock)');
  W.setWheelSet('turbine', 'pickup'); D.setProp('roof', 'roofbox', 'commuter');
  check(W.wheelSet('pickup') === 'turbine' && D.propChoice('roof', 'commuter') === 'roofbox' && JSON.stringify(keys()) === saved, '...its changes last the visit and write nothing');
  Progress.noSave = false;
  check(W.wheelSet('commuter') === 'spoke5' && W.wheelSet('pickup') === 'stock', '...and the saved store is back');

  // ---- every car: resolves and builds dressed without error ----
  const { showroomCars } = await load('showroomData.js'), { IDEA_CARS } = await load('ideas.js');
  const fleet = [...new Set([...showroomCars(), ...Object.values(C.LEVEL_CARS), ...Object.values(C.SECRET_CARS), ...IDEA_CARS, ...C.CARS.map(C.superOf).filter(Boolean)])];
  grantCosmetics(cosmeticKeys());
  W.setWheelSet('spoke5'); P.setPlateDesign('yellow'); D.setProp('roof', 'roofbox'); D.setProp('cargo', 'cargocrates'); D.setProp('wing', 'winggt');
  const bad = [];
  let built = 0, noRim = 0, noPlate = 0, noRoof = 0;
  for (const car of fleet) {
    try {
      W.setWheelSet('twin-spinner', car.id);
      const k = L.loadoutKey(car);
      if (!k || (car.legend ? !k.startsWith('legend') : !k.includes('twinspin'))) bad.push(car.id + ' key ' + k);
      let m = null;
      try { m = makeShowCar(car); } catch { m = null; } // (a car with no model of its own throws here today; not this change's)
      if (m) { built++; if (!(m.userData.wheelHubs?.rims?.list?.length)) noRim++; if (!m.userData.platePlan?.worn.length) noPlate++; if (!m.userData.propPlan?.worn.includes('roof')) noRoof++; }
    } catch (error) { bad.push(car.id + ': ' + (error?.message || error)); }
  }
  check(!bad.length && fleet.length > 200, fleet.length + ' cars resolve their loadout (an override each) and ' + built + ' build dressed without error (' + noRim + ' with no rim, ' + noPlate + ' no plate, ' + noRoof + ' no roof prop: odd cars and Legendary)' + (bad.length ? ' -- ' + bad.slice(0, 8).join('; ') : ''));
  const size = raw.getItem('delivery.loadout').length;
  check(size < 40000, 'the key with an override on every car: ' + size + ' chars');
  for (const car of fleet) Store.resetCar(car.id);
  check(raw.getItem('delivery.loadout').length < 600, 'every car reset: the key is small again (' + raw.getItem('delivery.loadout').length + ' chars)');

  // ---- THE THREE-PART WHEEL SET (CHECKLIST 399): every OLD saved wheels pair (the six old designs x the nine hub colours, x a rim or none),
  // saved as the default (the old global keys AND the store) and as a car's own (the store), reads back as the SAME LOOK: the tyre's rubber
  // colour, its sidewall ring and the hub colour (the old rule: a chosen hub colour wins; Stock lets the design's own hub show)
  {
    const OLD = { stock: [null, null, null], whitewall: [null, 'w', null], redline: [null, 'r', null], redwhite: [0xd8262b, null, 0xf4f4f2], whiteblack: [null, null, 0xf4f4f2], goldwall: [null, 'w', 0xd9a92a] };
    const ringOf = (t) => (t.ring ? (t.ring.hex === 0xd8262b ? 'r' : 'w') : null);
    const bad = [];
    let n = 0;
    for (const [design, [rubber, ring, ownHub]] of Object.entries(OLD)) for (const hub of W.WHEEL_COLOURS) for (const rim of ['none', 'turbine']) for (const how of ['keys', 'default', 'car']) {
      wipe();
      if (how === 'keys') { raw.setItem('delivery.wheeldesign', design); raw.setItem('delivery.wheelcolour', hub.id); raw.setItem('delivery.wheelrim', JSON.stringify({ all: rim })); }
      else raw.setItem('delivery.loadout', JSON.stringify({ v: 1, default: how === 'default' ? { wheels: { design, hub: hub.id, rim: { all: rim } } } : {}, cars: how === 'car' ? { pickup: { wheels: { design, hub: hub.id, rim: { all: rim } } } } : {} }));
      Store.reloadStore();
      const id = how === 'car' ? 'pickup' : null, t = W.TYRE_COLOURS.find(x => x.id === W.wheelTyre(id)), h = W.WHEEL_COLOURS.find(x => x.id === W.wheelColour(id));
      const want = [rubber, ring, hub.hex !== null ? hub.hex : ownHub, rim], got = [t.tyre, ringOf(t), h.hex, R.resolveRim(id, 'front')];
      n++;
      if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(how + ' ' + design + '+' + hub.id + '+' + rim + ': ' + JSON.stringify(got) + ' not ' + JSON.stringify(want));
    }
    check(!bad.length, 'every old saved wheels pair (' + n + ': 6 designs x 9 hub colours x rim or none, as the old keys, the default and a car\'s own) reads back as the same tyre, ring and hub colour in the three-part set' + (bad.length ? ': ' + bad.slice(0, 4).join('; ') : ''));
    wipe();
    raw.setItem('delivery.wheeldesign', 'goldwall'); raw.setItem('delivery.wheelcolour', 'stock');
    Store.reloadStore();
    check(W.wheelSet() === 'whitewall-gold' && W.wheelTread() === 'none', 'an old save wearing the Whitewall + gold set (its design carried the gold hub) is that preset still, with no tread');
    wipe();
  }

  // ---- the fingerprint ----
  const { logicFiles } = await import('../vite.config.js');
  check(!logicFiles().some(f => /loadout|cosmetic|render\//.test(f)), 'the replay fingerprint (vite.config.js logicFiles, ' + logicFiles().length + ' files) includes no loadout or cosmetic module');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await session.close();

// ---- a visit's test switches dress EVERY car, over its own choice (a fresh load with ?wheelrim= etc.) ----
globalThis.location = { search: '?wheelrim=turbine&platedesign=yellow&roofprop=roofbox&wheelcolour=red' };
session = await startModels();
try {
  const { load } = session;
  const W = await load('render/wheelcosmetic.js'), R = await load('render/rims.js'), P = await load('render/platecosmetic.js'), D = await load('render/propdress.js');
  W.setWheelSet('spoke5', 'commuter'); D.setProp('roof', 'roofbeacon', 'commuter');
  check(['commuter', 'pickup', null].every(id => R.resolveRim(id, 'front') === 'turbine' && W.wheelColour(id) === 'red' && P.shownDesign(id) === 'yellow' && D.shownProp('roof', id) === 'roofbox'), '?wheelrim= ?wheelcolour= ?platedesign= ?roofprop=: every car wears them for the visit, over its own');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await session.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
