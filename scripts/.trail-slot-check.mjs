// A check of the TRAIL cosmetic (CHECKLIST 452: render/trailcosmetic.js, the Cosmetics screen's 'Trail' tab, render/trailpreview.js):
//   - the registry: Classic (free, never counted) and the seven turbo trail styles as earned items, Uncommon, no price
//   - the store: per car only (never the All-cars default's), a store from before has none (Classic), Reset car clears it
//   - stock: awarded through awardCosmetic (and ?czgive=trail:flame*3); equipping takes one from the hand, taking it off gives it back
//   - Unlock everything: Absolutely gives 999 of each; the tab hidden on the cars that cannot show it (the wheels' rule: the Tank(s), the Saucer)
//   - the game: the car's turbo wears its equipped trail (render/turbotrails.js wornTrail; ?turbotrail= / setTurboTrail pins one over it);
//     the trail mesh is never under the car (the Ghost power-up and a blackout leave it alone); the replay ghost never draws one
//   - the PREVIEW: every style (and its lite) drawn by the game's own code behind a car standing still, behind its tail, in the given parent
//     (no renderer of its own), flagged shared (the showroom's scene let go never disposes it), hidden and empty once cleared
//   - render-only: the replay fingerprint unchanged
//   node scripts/.trail-slot-check.mjs
import { startModels } from './modelpatch-load.mjs'; // (a stand-in scene and window: the game's render modules load headless)
import { readFileSync } from 'node:fs';

const g = await startModels();
const { load } = g;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const THREE = await import('three');
const { Progress } = await load('progress.js');
const C = await load('cars.js');
const Cz = await load('render/cosmetics.js');
const Store = await load('render/loadoutstore.js');
const Stock = await load('render/cosmeticstock.js');
const T = await load('render/trailcosmetic.js');
const R = await load('render/cosmeticslots.js');
const { unlockEverything } = await load('unlockall.js');
Progress.noSave = true; Store.reloadStore(); Cz.clearCosmetics();

// ---- the registry ----
const items = Cz.COSMETICS.filter(c => c.slot === 'trail');
check(items.map(c => c.id).join() === 'classic,flame,twin,speedlines,afterimage,embers,shockwave,rarity', 'the registry: ' + items.map(c => c.name).join(', '));
check(items[0].free && items.slice(1).every(c => c.earned && !c.free && c.price === 0 && Cz.cosmeticRarity('trail', c.id) === 'uncommon') && Cz.isEarnedSlot('trail') && Cz.EARNED_SLOTS.trail === 'classic', 'Classic free; the seven styles earned, Uncommon, no cash price');

// ---- default, migration, per car ----
const a = 'sprinthatch', b = 'hothatch';
check(Store.get(a, 'trail').id === 'classic' && T.shownTrail(a) === 'classic', 'nothing chosen: Classic');
Store.restore({ v: 1, default: { wheels: { design: 'red' } }, cars: { [a]: { plate: { design: 'stock' } } } }); // (a store written before the Trail slot)
check(T.shownTrail(a) === 'classic' && T.shownTrail(b) === 'classic', 'a store from before the slot (no trail): Classic on every car');
check(!T.setTrail('flame', null) && T.setTrail('nonsense', a) === false, 'no All-cars trail (per car only), an unknown id refused');
T.setTrail('flame', a);
check(T.trailChoice(a) === 'flame' && T.shownTrail(a) === 'classic', 'equipped but none owned: chosen, worn as Classic');
// ---- stock ----
Cz.awardCosmetic('trail:flame', 3, { source: 'check' });
check(Cz.cosmeticCount('trail', 'flame') === 3 && T.shownTrail(a) === 'flame' && T.shownTrail(b) === 'classic', 'awarded x3 (awardCosmetic): worn on its car, not another (per car)');
check(Stock.spare('trail', 'flame') === 2, 'one equipped: 2 left in the hand (' + Stock.spare('trail', 'flame') + ')');
T.setTrail('flame', b);
check(Stock.spare('trail', 'flame') === 1, 'equipped on a second car: 1 left');
T.setTrail('classic', b);
check(Stock.spare('trail', 'flame') === 2 && Store.get(b, 'trail').id === 'classic', 'taken off (Classic): back in the hand, 2');
Store.setSlot(null, 'trail', { id: 'flame' });
check(Store.get(b, 'trail').id === 'classic' && Store.snapshot().default.trail?.id !== 'flame', 'the default never holds an earned trail');
Store.resetCar(a);
check(Stock.spare('trail', 'flame') === 3 && T.shownTrail(a) === 'classic', 'Reset car: Classic again, its trail back in the hand (3)');
// ---- Absolutely ----
unlockEverything('abs');
check(T.TRAIL_IDS.slice(1).every(id => Cz.cosmeticCount('trail', id) === 999) && Cz.cosmeticCount('trail', 'classic') === Infinity, 'Unlock everything (Absolutely): 999 of each trail');
// ---- the tab ----
const all = [...C.CARS, ...C.FILLER_CARS, ...C.BESPOKE_CARS, ...C.EVENT_CARS, ...C.EARNED_CARS, ...Object.values(C.SECRET_CARS)];
const off = all.filter(c => !R.shownSlots(c).some(s => s.id === 'trail'));
check(off.length && off.every(c => c.tank || c.ufo) && all.filter(c => c.tank || c.ufo).every(c => off.includes(c)), 'the Trail tab hidden only on the cars with no wheels to dress (the wheels\' rule): ' + [...new Set(off.map(c => c.id))].join(', '));
check(R.slotById('trail').label === 'Trail' && R.SLOT_LIST.map(s => s.id).indexOf('trail') === R.SLOT_LIST.map(s => s.id).indexOf('kill') - 1, 'its tab: \'Trail\', before Kill FX');

// ---- the game ----
const TT = await load('render/turbotrails.js');
const { CAR } = C;
T.setTrail('embers', CAR.id);
check(TT.wornTrail(CAR) === 'embers' + (TT.trailLite() ? '-lite' : '') && TT.wornTrail(C.carById('tank') || { id: 'tank', tank: true }) === 'classic' + (TT.trailLite() ? '-lite' : ''), 'the car in use wears its own trail in a run (' + TT.wornTrail(CAR) + '); the Tank Classic');
TT.setTurboTrail('twin');
check(TT.turboTrailStyle() === 'twin', 'setTurboTrail / ?turbotrail= pin a style (twin) for tests');
TT.followLoadout();
check(TT.turboTrailStyle() === 'embers' && TT.trailMesh()?.parent && !TT.trailMesh().parent.isMesh, 'followLoadout: back to the car\'s own (embers), drawn in the scene');
const { carMesh } = await load('render/cars.js');
let under = false; carMesh.traverse(o => { if (o === TT.trailMesh()) under = true; });
check(!under, 'the trail is never under the car: the Ghost power-up (items.js ghostify) and a blackout (render/silhouette.js) leave it alone');
check(!/turbotrails|syncTurboTrail/.test(readFileSync(new URL('../src/delivery/render/ghostcar.js', import.meta.url), 'utf8')), 'the replay ghost (render/ghostcar.js) draws no turbo trail');
TT.setTurboTrail('classic');

// ---- the preview ----
const { makeShowCar } = await load('render/showcar.js');
const { TrailPreview } = await load('render/trailpreview.js');
const parent = new THREE.Group(), model = makeShowCar(C.carById('sprinthatch'));
parent.add(model); parent.rotation.y = 0.7; parent.updateMatrixWorld(true);
for (const style of [...T.TRAIL_IDS, ...T.TRAIL_IDS.map(s => s + '-lite')]) {
  TrailPreview.show(style.replace(/-lite$/, ''));
  let p = null;
  for (let i = 0; i < 40; i++) p = TrailPreview.step(1 / 60, model, parent, C.carById('sprinthatch'), style);
  const m = p.mesh, behind = [];
  if (m?.isInstancedMesh) { const e = m.instanceMatrix.array, inv = new THREE.Matrix4().copy(parent.matrixWorld); for (let k = 0; k < (m.count ?? 0); k++) { const v = new THREE.Vector3(e[k * 16 + 12], e[k * 16 + 13], e[k * 16 + 14]).applyMatrix4(inv); if (e[k * 16] || e[k * 16 + 5]) behind.push(v); } }
  // (behind the car: along the car's own -z, past its tail; the parent turned 0.7 rad, so measured in the parent's frame)
  const ok = p.live > 0 && m.parent === parent && m.userData.shared === true && p.style === style;
  const back = !behind.length || behind.filter(v => v.z < 0).length / behind.length > 0.7;
  check(ok && back, 'preview \'' + style + '\': ' + p.live + ' alive behind a car standing still, drawn in the given parent (shared)' + (behind.length ? ', ' + behind.filter(v => v.z < 0).length + ' of ' + behind.length + ' instances behind the middle' : ''));
}
TrailPreview.clear();
const st = TrailPreview.state;
check(st.style === null && st.live === 0 && !st.visible, 'cleared (the tab closed): no style, nothing alive, nothing drawn (' + JSON.stringify(st) + ')');
const src = ['turbotrails.js', 'trailpreview.js', 'trailcosmetic.js'].map(f => readFileSync(new URL('../src/delivery/render/' + f, import.meta.url), 'utf8')).join('\n');
check(!/WebGLRenderer|getContext\(['"]webgl/.test(src), 'no renderer or WebGL context of its own (the showroom view\'s draws it)');

// ---- render-only ----
const { fingerprints } = await import('./logic-hash.mjs');
const fp = fingerprints();
check(fp.logic === '33a0394c26' && fp.legacy === 'dd565f56b3', 'the replay fingerprint unchanged: ' + JSON.stringify(fp));

Progress.noSave = false;
console.log(failures ? failures + ' FAILED' : 'all ok');
await g.close();
process.exit(failures ? 1 : 0);
