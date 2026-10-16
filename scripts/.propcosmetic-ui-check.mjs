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
  const { COSMETICS, cosmeticKeys, ownedCosmetics, clearCosmetics, reloadCosmetics, ownsCosmetic } = await load('render/cosmetics.js');
  const { Progress } = await load('progress.js');
  const { unlockEverything } = await load('unlockall.js');
  const { SILHOUETTE } = await load('render/silhouette.js');
  const { prepareSuspension } = await load('render/carsuspension.js');
  const ids = ['minibus', 'touringcar', 'sporttruck', 'moke', 'rally'];
  const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS), ...IDEA_CARS];
  const car = (id) => all.find(c => c.id === id);
  const SLOTS = ['roof', 'cargo', 'wing'];
  Progress.noSave = false;
  clearCosmetics();
  const wipe = () => { for (const s of SLOTS) { localStorage.removeItem('delivery.prop.' + s); localStorage.removeItem('delivery.prop.' + s + '.paint'); } };
  wipe();

  // ---- the registry and the screen ----
  const keys = SLOTS.flatMap(s => PM.PROPS[s].map(p => s + ':' + p.id));
  check(keys.length === 46 && keys.every(k => cosmeticKeys().includes(k)) && COSMETICS.filter(c => SLOTS.includes(c.slot)).every(c => c.free && 'price' in c), 'the registry holds all 46 props (9 roof, 16 cargo, 21 wing) as roof:<id> / cargo:<id> / wing:<id>, free, a placeholder price');
  const ui = readFileSync(ROOT + '/src/delivery/render/cosmeticsui.js', 'utf8');
  check(/id: 'roof', name: 'Roof', live: true, prop: true/.test(ui) && /id: 'cargo', name: 'Cargo', live: true, prop: true/.test(ui) && /id: 'wing', name: 'Wing', live: true, prop: true/.test(ui) && !/Roof ornament/.test(ui) && /id: 'underglow'[^}]*live: false/.test(ui), "the screen's tabs: Roof, Cargo, Wing live, Underglow still greyed, 'Roof ornament' gone");
  check(/for \(const p of PROPS\[slot\]\)/.test(ui) && /'None'/.test(ui) && /Stock/.test(ui) && /PROP_PAINTS/.test(ui) && /Not available for this car yet/.test(ui) && /propSlots\(car\.id\)/.test(ui) && SLOTS.every((s, i) => PM.PROPS[s].length === [9, 16, 21][i]), 'every tab lists all its props as chips plus None / Stock and the colour row; an unsupported car shows "Not available for this car yet" (data-driven from the table)');
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

  // ---- locked tabs (the owner, 15-Oct: a slot the car cannot wear has its TAB locked, not selectable, with the reason; the open tab falls back to Wheels) ----
  {
    const locked = (id) => SLOTS.filter(sl => !st(id, sl).ok).join();
    check(locked('moke') === 'roof' && locked('touringcar') === 'cargo' && locked('minibus') === 'cargo' && locked('sporttruck') === '' && locked(noEntry.id) === 'roof,cargo,wing', 'locked tabs: moke roof (an open car; its rear deck takes a wing since the placement audit, CHECKLIST 307), touringcar cargo, minibus cargo, sporttruck none, a car with no table entry (' + noEntry.id + ') all three');
    check(/tab\.setAttribute\('aria-disabled', String\(!st\.ok\)\)/.test(ui) && /tab\.setAttribute\('aria-label', st\.ok \? [^:]+: lockReason\(slot\)\)/.test(ui) && /tab\.title = st\.ok/.test(ui) && /cz-lockline/.test(ui) && /Not available for this car yet/.test(ui), "a locked tab is aria-disabled, carries the reason in its aria-label and tooltip, and shows a padlock and 'Locked'");
    check(/if \(slot\.prop && !slotStatus\(state\.car, slot\.id\)\.ok\) flash\(tabMsg, lockReason\(slot\.id\)\)/.test(ui) && /!slotStatus\(car, openSlot\)\.ok\) \{ flash\(tabMsg, ''\); openSection\('wheels'\)/.test(ui), 'a tap on a locked tab opens nothing and shows the one-line reason; a locked open tab falls back to Wheels');
    check(!/aria-disabled', String\(!st\.ok\)\);\n\s*b\.classList/.test(ui) && /sec\.node\.classList\.toggle\('unsupported'/.test(ui), 'wheels and number plate tabs are not made lockable (only slots flagged prop)');
  }

  // ---- equip on the five cars ----
  const ownOf = (model, slot) => PC.existingProps(model).filter(e => e.slot === slot);
  const rideOk = (model, group) => group.parent === model || group.parent === model.userData.body?.parent;
  let dressed = 0, bad = [], capped = 0;
  for (const id of ids) {
    const c = car(id), t = PA.propSlots(id);
    for (const slot of SLOTS) {
      for (const p of PM.PROPS[slot]) {
        for (const x of SLOTS) { D.setProp(x, 'none'); D.setPropPaint(x, 'match'); }
        const model = makeShowCar(c);
        const others = SLOTS.filter(s => s !== slot);
        const ownBefore = Object.fromEntries(SLOTS.map(s => [s, ownOf(model, s).map(e => e.mesh.visible).join()]));
        const kids = model.children.length;
        D.setProp(slot, p.id);
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
        D.setProp(slot, 'none');
        if (D.propPlan(model).groups[slot] || ownOf(model, slot).some(e => !e.mesh.visible) || model.children.length !== kids) why += ' None did not restore';
        if (why) bad.push(id + ' ' + slot + ' ' + p.id + ': ' + why); else dressed++;
      }
    }
  }
  check(bad.length === 0, dressed + ' prop / slot / car combinations dress and restore on the five cars, each worn at min(the slot\'s room, the prop\'s own maxScale) (' + capped + ' at their max)' + (bad.length ? ' (' + bad.slice(0, 6).join('; ') + ')' : ''));
  const hasOwn = ['minibus roof', 'moke cargo', 'rally roof', 'rally wing', 'touringcar wing'].filter(k => ownOf(makeShowCar(car(k.split(' ')[0])), k.split(' ')[1]).length);
  check(hasOwn.length === 5, "the cars with their own tagged prop hide it for a worn prop and show it for None (" + hasOwn.join(', ') + ')');
  D.setProp('roof', 'none');

  // ---- Legendary and unsupported ----
  {
    D.setProp('roof', 'roofbox'); D.setProp('wing', 'winggt');
    const legend = makeShowCar({ ...car('rally'), legend: true });
    check(D.propPlan(legend).worn.length === 0 && D.propPlan(legend).status === 'legend', 'a Legendary car is not dressed with props');
    const moke = makeShowCar(car('moke'));
    check(D.propPlan(moke).worn.join() === 'wing', 'the Moke: roof unsupported (an open car), so only the wing is worn');
    const traffic = new THREE.Group();
    check(D.propPlan(traffic) === null && D.dressProps(traffic, null) === traffic && D.propPlan(traffic).worn.length === 0, 'a model that is not dressed (traffic) has no plan; dressing one with no car adds nothing');
    D.setProp('roof', 'none'); D.setProp('wing', 'none');
  }

  // ---- paint ----
  {
    const model = makeShowCar(car('sporttruck'));
    D.setProp('roof', 'roofbox'); D.setPropPaint('roof', 'match');
    const g = D.propPlan(model).groups.roof, main = () => { let m = null; g.traverse(o => { if (o.isMesh && o.material.userData.ownPaint) m = o.material; }); return m; };
    const body = model.userData.body.material;
    check(main() && main().color === body.color, "'match' follows the car: the prop's paint shares the body's Color (not its vertex-coloured material)");
    body.color.setHex(0x44aa22);
    check(main().color.getHex() === 0x44aa22, '...so a livery / Good / Evil change reaches it');
    D.setPropPaint('roof', 'd8262b');
    const g2 = D.propPlan(model).groups.roof;
    let m2 = null; g2.traverse(o => { if (o.isMesh && o.material.userData.ownPaint) m2 = o.material; });
    check(g2 !== g && m2.color.getHex() === 0xd8262b && body.color.getHex() === 0x44aa22, 'a hex paint is the prop\'s own colour (the car is not recoloured); a change refreshes the model already built');
    check(!D.setPropPaint('roof', 'zzzzzz') && !D.setPropPaint('roof', 'red') && D.propPaintChoice('roof') === 'd8262b' && D.setPropPaint('roof', '#1B1C20') && D.propPaintChoice('roof') === '1b1c20', 'a bad paint is refused; #hex is taken, lower-cased');
    // a blackout
    const dark = makeShowCar(car('sporttruck'));
    dark.userData.body.material = SILHOUETTE;
    D.setPropPaint('roof', 'd8262b');
    const meshes = []; D.propPlan(dark).groups.roof.traverse(o => { if (o.isMesh) meshes.push(o); });
    check(meshes.length && meshes.every(o => o.material === SILHOUETTE), "a blacked-out model's prop is the flat black silhouette");
    D.setProp('roof', 'none'); D.setPropPaint('roof', 'match');
  }

  // ---- ownership: an unowned saved prop wears Stock; unknown ids ----
  {
    const entry = COSMETICS.find(c => c.slot === 'wing' && c.id === 'winggt');
    D.setProp('wing', 'winggt');
    check(D.shownProp('wing') === 'winggt', 'an owned prop is worn');
    entry.free = false;
    check(D.shownProp('wing') === 'none' && D.propChoice('wing') === 'winggt' && !ownsCosmetic('wing', 'winggt') && D.setProp('wing', 'winggt') === false, 'equipped but not owned: Stock is worn (the choice is kept) and it cannot be equipped');
    entry.free = true;
    check(D.shownProp('wing') === 'winggt', '...and owning it again brings it back');
    check(D.setProp('wing', 'no-such-prop') === false && D.setProp('roof', 'winggt') === false && D.setProp('bumper', 'x') === false, 'an unknown id, a prop of another slot and an unknown slot are refused, no error');
    D.resetProp('wing');
    check(D.propChoice('wing') === 'none' && D.propPaintChoice('wing') === 'match' && localStorage.getItem('delivery.prop.wing') === null, 'Reset to stock: none, match, the keys removed');
  }

  // ---- storage ----
  {
    wipe(); for (const s of SLOTS) D.resetProp(s);
    D.setProp('roof', 'roofsign'); D.setPropPaint('roof', 'ff7a1a'); D.setProp('cargo', 'cargobarrel'); D.setProp('wing', 'wingtube');
    check(localStorage.getItem('delivery.prop.roof') === 'roofsign' && localStorage.getItem('delivery.prop.roof.paint') === 'ff7a1a' && localStorage.getItem('delivery.prop.cargo') === 'cargobarrel' && localStorage.getItem('delivery.prop.wing') === 'wingtube', 'kept in localStorage: delivery.prop.roof | .cargo | .wing and delivery.prop.<slot>.paint');
    check(!document.cookie.includes('prop') && !Progress.saved().includes('prop') && !JSON.stringify(Progress.data).includes('roofsign'), 'never the cookie or the save code');
    // a visit that saves nothing
    Progress.noSave = true;
    const before = ['roof', 'cargo', 'wing'].map(s => localStorage.getItem('delivery.prop.' + s)).join();
    check(D.propChoice('roof') === 'none', 'with Progress.noSave the saved choice is ignored (a test visit shows Stock)');
    D.setProp('roof', 'roofbeacon');
    check(D.propChoice('roof') === 'roofbeacon' && localStorage.getItem('delivery.prop.roof') === 'roofsign' && ['roof', 'cargo', 'wing'].map(s => localStorage.getItem('delivery.prop.' + s)).join() === before, '...a change lasts the visit and writes nothing');
    Progress.noSave = false;
    check(D.propChoice('roof') === 'roofsign', '...and the saved choice is back');
    // the test switches
    globalThis.location = { search: '?roofprop=roofbeacon&roofpaint=00ff00&cargoprop=none&wingprop=winglip' };
    check(D.propChoice('roof') === 'roofbeacon' && D.propPaintChoice('roof') === '00ff00' && D.shownProp('roof') === 'roofbeacon' && D.propChoice('cargo') === 'none' && D.shownProp('wing') === 'winglip' && localStorage.getItem('delivery.prop.roof') === 'roofsign', '?roofprop= ?roofpaint= ?cargoprop= ?wingprop= are the visit\'s own and write nothing');
    globalThis.location = { search: '?roofprop=bogus&roofpaint=nope' };
    check(D.propChoice('roof') === 'roofsign' && D.propPaintChoice('roof') === 'ff7a1a', 'a bad switch is ignored');
    delete globalThis.location;
    // blocked storage
    const real = globalThis.localStorage;
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
    let threw = false;
    try { D.setProp('cargo', 'cargotarp'); D.setPropPaint('cargo', 'f2f2ee'); D.resetProp('cargo'); D.propChoice('wing'); } catch { threw = true; }
    globalThis.localStorage = real;
    check(!threw, 'blocked storage: nothing throws');
    for (const s of SLOTS) D.resetProp(s);
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
