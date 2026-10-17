// A check of the PROP COSMETICS (render/propdress.js, the Roof / Cargo / Wing tabs of render/cosmeticsui.js; CHECKLIST 302). The five cars that
// have table entries (minibus, touringcar, sporttruck, moke, rally) are built as the showroom builds them (render/showcar.js makeShowCar) and:
//   - the registry holds the nine props as roof:<id> / cargo:<id> / wing:<id> (free, a placeholder price); the screen's tabs are Roof, Cargo, Wing
//     (live), the 'Roof ornament' stub is gone, and every tab builds its three props as chips from PROPS (the source says so)
//   - slotStatus: a supported slot is ok; a slot the table says 'no' to carries its short reason; a car with no table entry is 'not available yet'
//     with no reason; a Legendary car keeps its own look; the screen shows 'Not available for this car yet' for those
//   - equip: every prop of every supported slot goes on every supported car as a child of the model's body group or the model, placed by fitProp
//     (position, uniform scale: min(the slot's room, the prop's own maxScale), CHECKLIST 450), the car's OWN tagged props of that slot hidden (only that slot), the other slots untouched; None / Stock shows
//     them again and removes the prop; an unsupported slot adds nothing; a Legendary car is untouched
//   - the prop is a sprung part (never planted on the floor like a wheel), is not mistaken for the car's own prop (existingProps), the paint 'match'
//     follows the car's body colour (same Color object), a hex paint sets its colour, a change refreshes a model already built (no rebuild)
//   - a blacked-out model's prop is flat black; a saved prop the player does not own wears Stock; an unknown id is no error
//   - storage: delivery.prop.<slot> and .paint, kept; ignored with Progress.noSave (held for the visit); blocked storage throws nothing; the test
//     switches ?roofprop= ?roofpaint= ?cargoprop= ?wingprop= work for a visit and write nothing
//   - 'Unlock everything: Absolutely' grants all nine; the replay fingerprint (vite.config.js logicFiles) holds none of the prop modules or the screen
//     and none of its files differs from origin/main's
//   node scripts/.propcosmetic-ui-check.mjs
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { startModels } from './modelpatch-load.mjs';

const { load, close, ROOT } = await startModels();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const C = await load('cars.js');
  const { IDEA_CARS } = await load('ideas.js');
  const { makeShowCar } = await load('render/showcar.js');
  const D = await load('render/propdress.js');
  const PM = await load('render/propmodels.js');
  const PA = await load('render/propanchors.js');
  const PC = await load('render/propcosmetic.js');
  const { COSMETICS, cosmeticKeys, ownedCosmetics, clearCosmetics, reloadCosmetics, ownsCosmetic, grantAll } = await load('render/cosmetics.js');
  const Store = await load('render/loadoutstore.js');
  const { Progress } = await load('progress.js');
  const { unlockEverything } = await load('unlockall.js');
  const { SILHOUETTE } = await load('render/silhouette.js');
  const { prepareSuspension } = await load('render/carsuspension.js');
  const ids = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const car = (id) => all.find(c => c.id === id);
  const SLOTS = ['roof', 'cargo', 'wing'];
  Progress.noSave = false;
  clearCosmetics(); grantAll(); // (earned cosmetics, CHECKLIST 433: 999 of each prop, so each can be worn)
  // EARNED PROPS ARE PER CAR ONLY (CHECKLIST 433): a choice is put on each car this check builds (and the default, for its paint), and read
  // back on one of them (TC)
  const TC = 'sporttruck', DRESS = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  const setP = (slot, id) => { const r = D.setProp(slot, id, TC); if (r !== false) for (const c of DRESS) Store.setSlot(c, slot, { id }); return r; };
  const setPaint = (slot, v) => { const r = D.setPropPaint(slot, v); if (r !== false) for (const c of DRESS) Store.setSlot(c, slot, { paint: D.propPaintChoice(slot) }); return r; };
  const resetP = (slot) => { D.resetProp(slot); for (const c of DRESS) D.resetProp(slot, c); };
  const wipe = () => { for (const s of SLOTS) { localStorage.removeItem('delivery.prop.' + s); localStorage.removeItem('delivery.prop.' + s + '.paint'); } };
  wipe();

  // ---- the registry and the screen ----
  const keys = SLOTS.flatMap(s => PM.PROPS[s].map(p => s + ':' + p.id));
  check(keys.length === 52 && keys.every(k => cosmeticKeys().includes(k)) && COSMETICS.filter(c => SLOTS.includes(c.slot)).every(c => c.earned && !c.free && 'price' in c), 'the registry holds all 52 props (15 roof, 16 cargo, 21 wing) as roof:<id> / cargo:<id> / wing:<id>, earned (CHECKLIST 433)');
  const ui = readFileSync(ROOT + '/src/delivery/render/cosmeticsui.js', 'utf8');
  const reg = readFileSync(ROOT + '/src/delivery/render/cosmeticslots.js', 'utf8');
  check(/id: 'roof', label: 'Roof'[^}]*prop: true, supports: prop\('roof'\)/.test(reg) && /id: 'cargo', label: 'Cargo'[^}]*prop: true, supports: prop\('cargo'\)/.test(reg) && /id: 'wing', label: 'Wing'[^}]*prop: true, supports: prop\('wing'\)/.test(reg) && !/Roof ornament/.test(ui) && /id: 'underglow'[^}]*items: dormant\('underglow'\)/.test(reg), "the screen's tabs (render/cosmeticslots.js): Roof, Cargo, Wing shown where slotStatus is ok, Underglow dormant (no items: no tab), 'Roof ornament' gone");
  check(/for \(const p of PROPS\[slot\]\)/.test(ui) && /'None'/.test(ui) && /Stock/.test(ui) && /PROP_PAINTS/.test(ui) && /propSlots\(car\.id\)/.test(ui) && SLOTS.every((s, i) => PM.PROPS[s].length === [15, 16, 21][i]), 'every tab lists all its props as chips plus None / Stock and the colour row');
  const swatches = D.PROP_PAINTS;
  const hexes = swatches.map(p => p.hex);
  check(swatches.length === 8 && swatches[0].id === 'match' && [0x1b1c20, 0xf2f2ee].every(h => hexes.includes(h)) && ['red', 'orange', 'blue', 'green', 'gold'].every(n => swatches.some(p => p.id === n)), 'the colour row: match car colour, black, white, red, orange, blue, green, gold');

  // ---- slotStatus ----
  const st = (id, slot) => D.slotStatus(car(id), slot);
  check(st('sporttruck', 'roof').ok && st('sporttruck', 'cargo').ok && st('sporttruck', 'wing').ok && st('touringcar', 'wing').ok && st('minibus', 'roof').ok && st('minibus', 'wing').ok, 'supported: sporttruck roof / cargo / wing, touringcar wing, minibus roof / wing');
  check(!st('moke', 'roof').ok && /no roof/.test(st('moke', 'roof').why) && !st('minibus', 'cargo').ok && /load deck/.test(st('minibus', 'cargo').why), "a slot the table says no to is greyed with the table's own short reason (" + st('moke', 'roof').why + ')');
  const { PROP_TABLE } = await load('render/propanchors.js');
  const noEntry = all.find(c => !(c.id in PROP_TABLE) && !c.legend && !c.silhouette) || { id: 'no-such-car', name: 'Unaudited' }; // (the audit is complete: every car has an entry, so a made-up one stands in)
  check(noEntry && SLOTS.every(s => !D.slotStatus(noEntry, s).ok && D.slotStatus(noEntry, s).why === ''), 'a car with no table entry (' + noEntry?.id + '): every slot not available, no reason');
  check(D.slotStatus({ ...car('rally'), legend: true }, 'roof').legend === true && !D.slotStatus({ ...car('rally'), legend: true }, 'roof').ok, 'a Legendary car keeps its own look');

  // ---- hidden tabs (the owner, 16-Oct: a slot the car cannot wear has NO tab; the open tab falls back to the first drawn; was 'locked' on 15-Oct) ----
  {
    const locked = (id) => SLOTS.filter(sl => !st(id, sl).ok).join();
    check(locked('moke') === 'roof' && locked('touringcar') === 'cargo' && locked('minibus') === 'cargo' && locked('sporttruck') === '' && locked(noEntry.id) === 'roof,cargo,wing', 'unsupported slots (no tab): moke roof (an open car; its rear deck takes a wing since the placement audit, CHECKLIST 307), touringcar cargo, minibus cargo, sporttruck none, a car with no table entry (' + noEntry.id + ') all three');
    const { shownSlots } = await load('render/cosmeticslots.js');
    const tabsOf = (id) => shownSlots(car(id) || noEntry).map(s => s.id).join();
    const { underglowSupported } = await load('render/underglow.js'); // (the Glow tab, 16-Oct: on every car that can wear an underglow)
    const glow = (id) => (underglowSupported(car(id) || noEntry) ? ['underglow'] : []);
    check(['moke', 'touringcar', 'minibus', 'sporttruck', noEntry.id].every(id => tabsOf(id) === ['wheels', 'plate', ...SLOTS.filter(sl => st(id, sl).ok || (id === noEntry.id && D.slotStatus(noEntry, sl).ok)), ...glow(id), 'trail', 'kill'].join()), 'the tabs drawn are exactly Wheels, Plate, the slots slotStatus allows, Glow where an underglow fits, the Turbo trail (CHECKLIST 452) and the Kill effect (every car) (moke ' + tabsOf('moke') + '; ' + noEntry.id + ' ' + tabsOf(noEntry.id) + ')');
    check(!/lockReason|cz-lockline|Coming later|Not available for this car yet/.test(ui) && /openSlot = renderTabs\(\)/.test(ui) && /tabToOpen\(list, openSlot\)/.test(ui), "no 'Locked' / 'Coming later' tab, no lock reason line; the open tab falls back to the first drawn (renderTabs)");
  }

  // ---- equip on the five cars ----
  const ownOf = (model, slot) => PC.existingProps(model).filter(e => e.slot === slot);
  const rideOk = (model, group) => group.parent === model || group.parent === model.userData.body?.parent;
  let dressed = 0, bad = [], capped = 0;
  for (const id of ids) {
    const c = car(id), t = PA.propSlots(id);
    for (const slot of SLOTS) {
      for (const p of PM.PROPS[slot]) {
        for (const x of SLOTS) { setP(x, 'none'); setPaint(x, 'match'); }
        const model = makeShowCar(c);
        const others = SLOTS.filter(s => s !== slot);
        const ownBefore = Object.fromEntries(SLOTS.map(s => [s, ownOf(model, s).map(e => e.mesh.visible).join()]));
        const kids = model.children.length;
        setP(slot, p.id);
        const plan = D.propPlan(model), g = plan.groups[slot];
        if (!t[slot].supported) {
          if (g || plan.worn.length || model.children.length !== kids || ownOf(model, slot).some(e => !e.mesh.visible)) bad.push(id + ' ' + slot + ' ' + p.id + ' unsupported but changed');
          continue;
        }
        const fit = PA.fitProp(id, slot, p.shape, p), room = PA.fitProp(id, slot, p.shape);
        if (Math.abs(fit.scale - Math.min(room.scale, p.maxScale)) > 1e-9) bad.push(id + ' ' + slot + ' ' + p.id + ': not worn at min(room ' + room.scale + ', maxScale ' + p.maxScale + ')');
        if (fit.capped) capped++;
        let why = '';
        if (!g) why = 'no group';
        else {
          if (g.userData.propId !== p.id || g.userData.propCosmetic !== slot) why = 'untagged';
          if (!rideOk(model, g)) why += ' parent';
          if (Math.abs(g.scale.x - fit.scale) > 1e-6 || Math.abs(g.scale.y - g.scale.x) > 1e-9) why += ' scale ' + g.scale.x + '/' + fit.scale;
          if (g.parent === model && g.position.distanceTo(new THREE.Vector3(...fit.position)) > 1e-6) why += ' position';
          if (g.parent !== model) { model.updateMatrixWorld(true); const w = g.getWorldPosition(new THREE.Vector3()), at = new THREE.Vector3(...fit.position).applyMatrix4(model.matrixWorld); if (w.distanceTo(at) > 1e-4) why += ' world position'; }
          if (ownOf(model, slot).some(e => e.mesh.visible)) why += ' own prop still visible';
          if (PC.existingProps(model).some(e => e.mesh.userData.propId)) why += ' equipped counted as own';
          for (const o of others) if (ownOf(model, o).map(e => e.mesh.visible).join() !== ownBefore[o]) why += ' other slot touched';
          let tris = 0; g.traverse(m => { if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
          if (tris > 300) why += ' tris ' + tris;
          // sprung with the body, never planted like a wheel
          const sus = prepareSuspension(model), planted = sus.planted, held = (n) => (planted && (planted.has ? planted.has(n) : planted.includes(n)));
          g.traverse(m => { if (m.isMesh && held(m)) why += ' planted'; });
        }
        setP(slot, 'none');
        if (D.propPlan(model).groups[slot] || ownOf(model, slot).some(e => !e.mesh.visible) || model.children.length !== kids) why += ' None did not restore';
        if (why) bad.push(id + ' ' + slot + ' ' + p.id + ': ' + why); else dressed++;
      }
    }
  }
  check(bad.length === 0, dressed + ' prop / slot / car combinations dress and restore on the five cars, each worn at min(the slot\'s room, the prop\'s own maxScale) (' + capped + ' at their max)' + (bad.length ? ' (' + bad.slice(0, 6).join('; ') + ')' : ''));
  const hasOwn = ['minibus roof', 'moke cargo', 'rally roof', 'rally wing', 'touringcar wing'].filter(k => ownOf(makeShowCar(car(k.split(' ')[0])), k.split(' ')[1]).length);
  check(hasOwn.length === 5, "the cars with their own tagged prop hide it for a worn prop and show it for None (" + hasOwn.join(', ') + ')');
  setP('roof', 'none');

  // ---- Legendary and unsupported ----
  {
    setP('roof', 'roofbox'); setP('wing', 'winggt');
    const legend = makeShowCar({ ...car('rally'), legend: true });
    check(D.propPlan(legend).worn.length === 0 && D.propPlan(legend).status === 'legend', 'a Legendary car is not dressed with props');
    const moke = makeShowCar(car('moke'));
    check(D.propPlan(moke).worn.join() === 'wing', 'the Moke: roof unsupported (an open car), so only the wing is worn');
    const traffic = new THREE.Group();
    check(D.propPlan(traffic) === null && D.dressProps(traffic, null) === traffic && D.propPlan(traffic).worn.length === 0, 'a model that is not dressed (traffic) has no plan; dressing one with no car adds nothing');
    setP('roof', 'none'); setP('wing', 'none');
  }

  // ---- paint ----
  {
    const model = makeShowCar(car('sporttruck'));
    setP('roof', 'roofbox'); setPaint('roof', 'match');
    const g = D.propPlan(model).groups.roof, main = () => { let m = null; g.traverse(o => { if (o.isMesh && o.material.userData.ownPaint) m = o.material; }); return m; };
    const body = model.userData.body.material;
    check(main() && main().color === body.color, "'match' follows the car: the prop's paint shares the body's Color (not its vertex-coloured material)");
    body.color.setHex(0x44aa22);
    check(main().color.getHex() === 0x44aa22, '...so a livery / Good / Evil change reaches it');
    setPaint('roof', 'd8262b');
    const g2 = D.propPlan(model).groups.roof;
    let m2 = null; g2.traverse(o => { if (o.isMesh && o.material.userData.ownPaint) m2 = o.material; });
    check(g2 !== g && m2.color.getHex() === 0xd8262b && body.color.getHex() === 0x44aa22, 'a hex paint is the prop\'s own colour (the car is not recoloured); a change refreshes the model already built');
    check(!setPaint('roof', 'zzzzzz') && !setPaint('roof', 'red') && D.propPaintChoice('roof') === 'd8262b' && setPaint('roof', '#1B1C20') && D.propPaintChoice('roof') === '1b1c20', 'a bad paint is refused; #hex is taken, lower-cased');
    // a blackout
    const dark = makeShowCar(car('sporttruck'));
    dark.userData.body.material = SILHOUETTE;
    setPaint('roof', 'd8262b');
    const meshes = []; D.propPlan(dark).groups.roof.traverse(o => { if (o.isMesh) meshes.push(o); });
    check(meshes.length && meshes.every(o => o.material === SILHOUETTE), "a blacked-out model's prop is the flat black silhouette");
    setP('roof', 'none'); setPaint('roof', 'match');
  }

  // ---- ownership: an unowned saved prop wears Stock; unknown ids ----
  {
    const entry = COSMETICS.find(c => c.slot === 'wing' && c.id === 'winggt');
    setP('wing', 'winggt');
    check(D.shownProp('wing', TC) === 'winggt', 'an owned prop is worn');
    clearCosmetics();
    check(D.shownProp('wing', TC) === 'none' && D.propChoice('wing', TC) === 'winggt' && !ownsCosmetic('wing', 'winggt') && setP('wing', 'winggt') === false, 'equipped but not owned: Stock is worn (the choice is kept) and it cannot be equipped');
    grantAll(); void entry;
    check(D.shownProp('wing', TC) === 'winggt', '...and owning it again brings it back');
    check(setP('wing', 'no-such-prop') === false && setP('roof', 'winggt') === false && setP('bumper', 'x') === false, 'an unknown id, a prop of another slot and an unknown slot are refused, no error');
    resetP('wing');
    check(D.propChoice('wing', TC) === 'none' && D.propPaintChoice('wing') === 'match' && localStorage.getItem('delivery.prop.wing') === null, 'Reset to stock: none, match, the keys removed');
  }

  // ---- storage ----
  {
    wipe(); for (const s of SLOTS) resetP(s);
    setP('roof', 'roofsign'); setPaint('roof', 'ff7a1a'); setP('cargo', 'cargobarrel'); setP('wing', 'wingtube');
    const ownOfTC = JSON.parse(localStorage.getItem('delivery.loadout')).cars[TC];
    check(ownOfTC.roof.id === 'roofsign' && ownOfTC.cargo.id === 'cargobarrel' && ownOfTC.wing.id === 'wingtube' && localStorage.getItem('delivery.prop.roof.paint') === 'ff7a1a' && localStorage.getItem('delivery.prop.roof') === null, 'kept in localStorage: each car\'s props in delivery.loadout (per car only, CHECKLIST 433); the old global keys mirror the default (its paint; no prop, as the default holds none)');
    check(!document.cookie.includes('prop') && !Progress.saved().includes('prop') && !JSON.stringify(Progress.data).includes('roofsign'), 'never the cookie or the save code');
    // a visit that saves nothing
    Progress.noSave = true;
    const before = ['roof', 'cargo', 'wing'].map(s => localStorage.getItem('delivery.prop.' + s)).join() + localStorage.getItem('delivery.loadout');
    check(D.propChoice('roof', TC) === 'none', 'with Progress.noSave the saved choice is ignored (a test visit shows Stock)');
    setP('roof', 'roofbeacon');
    check(D.propChoice('roof', TC) === 'roofbeacon' && ['roof', 'cargo', 'wing'].map(s => localStorage.getItem('delivery.prop.' + s)).join() + localStorage.getItem('delivery.loadout') === before, '...a change lasts the visit and writes nothing');
    Progress.noSave = false;
    check(D.propChoice('roof', TC) === 'roofsign', '...and the saved choice is back');
    // the test switches
    globalThis.location = { search: '?roofprop=roofbeacon&roofpaint=00ff00&cargoprop=none&wingprop=winglip' };
    check(D.propChoice('roof', TC) === 'roofbeacon' && D.propPaintChoice('roof') === '00ff00' && D.shownProp('roof', TC) === 'roofbeacon' && D.propChoice('cargo', TC) === 'none' && D.shownProp('wing', TC) === 'winglip' && JSON.parse(localStorage.getItem('delivery.loadout')).cars[TC].roof.id === 'roofsign', '?roofprop= ?roofpaint= ?cargoprop= ?wingprop= are the visit\'s own and write nothing');
    globalThis.location = { search: '?roofprop=bogus&roofpaint=nope' };
    check(D.propChoice('roof', TC) === 'roofsign' && D.propPaintChoice('roof') === 'ff7a1a', 'a bad switch is ignored');
    delete globalThis.location;
    // blocked storage
    const real = globalThis.localStorage;
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    let threw = false;
    try { setP('cargo', 'cargotarp'); setPaint('cargo', 'f2f2ee'); resetP('cargo'); D.propChoice('wing', TC); } catch { threw = true; }
    globalThis.localStorage = real;
    check(!threw, 'blocked storage: nothing throws');
    for (const s of SLOTS) resetP(s);
  }

  // ---- unlock everything: Absolutely ----
  {
    Progress.reset(); clearCosmetics();
    unlockEverything('abs');
    check(keys.every(k => ownedCosmetics().includes(k)), "'Unlock everything: Absolutely' grants all nine props");
    clearCosmetics(); reloadCosmetics();
    unlockEverything('all');
    check(!keys.some(k => ownedCosmetics().includes(k)), "'Everything' (all) grants no cosmetic");
    clearCosmetics();
  }

  // ---- (CHECKLIST 340) the cars with no model of their own: the tabs they get, and the Tank's plate as the game dresses it ----
  {
    const { shownSlots } = await load('render/cosmeticslots.js');
    const ids = (car) => shownSlots(car).map(s => s.id).join(',');
    const lists = [...C.CARS, ...Object.values(C.LEVEL_CARS), ...Object.values(C.SECRET_CARS), ...C.EARNED_CARS, ...Object.values(C.EVENT_CARS || {}), ...Object.values(C.BESPOKE_CARS || {}), ...Object.values(C.CONCEPT_CARS || {}), ...Object.values(C.FILLER_CARS || {})].filter(c => c && c.id);
    const noModel = [...new Set(lists.filter(c => !c.model && !c.idea).map(c => c.id))].sort();
    check(noModel.join() === 'earned-ufo,tank,ufo', 'the cars with no model of their own (garage, level, secret, earned, event, bespoke, concept, filler): ' + noModel.join(', '));
    const tank = C.carById('tank'), saucer = C.EARNED_CARS.find(c => c.id === 'earned-ufo'), ufo = C.LEVEL_CARS.ufo || Object.values(C.LEVEL_CARS).find(c => c.id === 'ufo');
    check(!ids(tank).includes('wheels') && ids(tank).includes('plate') && ids(tank).includes('kill'), 'the Tank: no Wheels tab (its road wheels sit in the tracks), a Plate and a Kill FX tab (' + ids(tank) + ')');
    check(ids(saucer) === 'kill' && ids(ufo) === 'kill', 'the Saucer and the UFO: the Kill FX tab only (no wheels, no plate) (' + ids(saucer) + ' / ' + ids(ufo) + ')');
    check(['commuter', 'pickup', 'sport'].every(id => /^wheels,plate/.test(ids(C.carById(id)))), 'a car with a model keeps Wheels and Plate first');
    // the game's own Tank (render/items.js ownTank) is dressCosmetics(makeTankMesh(...), car): its plate is worn, as here
    const P = await load('render/platecosmetic.js');
    // (since CHECKLIST 433 an earned plate is per car only and must be in the hand: one given and worn on the Tank itself; v1.1.151-alpha merge)
    const Cz = await load('render/cosmetics.js');
    if (!Cz.isFreeCosmetic('plate', 'yellow')) Cz.awardCosmetic('plate:yellow', 1, { source: 'check' });
    P.setPlateDesign('yellow', tank.id);
    const { makeTankMesh } = await load('render/cars.js'), { dressCosmetics } = await load('render/showcar.js');
    const t = dressCosmetics(makeTankMesh(tank.color), tank);
    check(t.userData.platePlan?.worn.length > 0, 'a Tank model dressed as the game dresses it wears its plate (' + (t.userData.platePlan?.worn.length || 0) + ')');
    P.resetPlate();
    const src = readFileSync(ROOT + '/src/delivery/render/items.js', 'utf8');
    check(/dressCosmetics\(makeTankMesh\(car\.color\), car\)/.test(src) && /CAR\.tank \? ownTank\(CAR\)/.test(src), 'render/items.js: the garage Tank drives its own dressed model (TANK RAGE keeps the plain one)');
  }

  // ---- render-only: not in the replay fingerprint ----
  {
    const { logicFiles } = await import('../vite.config.js');
    const logic = [...logicFiles()];
    check(!logic.some(f => /propdress|propcosmetic|propmodels|propanchors|cosmeticsui|showroomview|cosmetics\.js|showcar|unlockall/.test(f)), 'no prop module, the Cosmetics screen, showcar or unlockall is in the replay fingerprint (' + logic.length + ' logic files)');
    // (a line here once checked that no logic file differed from origin/main: true only on the prop branch itself, false on any later
    // branch that changes a car (cars.js, ecus.json...). What it meant, that the props are render-only, is the check above)
  }
} catch (e) { failures++; console.log('  FAIL  threw ' + (e && e.stack || e)); }
await close();
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
