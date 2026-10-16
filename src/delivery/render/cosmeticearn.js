// ---- HOW COSMETICS ARE EARNED (CHECKLIST 437, EARNED-COSMETICS.md; the owner, 16-Oct: "Plates will be earned. Cosmetics will be earned and
// 1 will be consumed when equipped to a vehicle"). A first version of the EARN TABLE, every reward read from what the save already holds
// (the medals are the best times, tiers.js; the delivery count is the milestone counter levelsDelivered), so it is RETROACTIVE (an old save
// is given what it has already won the first time this runs) and the same however it is reached. What was given is kept in a ledger
// (render/cosmetics.js stockMeta: the reward ids claimed, the crates opened), so each reward is given once.
//   STARTER     the first delivery on time (any medal): Classic white, Yellow rear, Retro cream plates, one each
//   GOOD MEDAL  each tier level's Good medal: the next PLATE design, in order (the list wraps: a later level gives a second of an early one)
//   EVIL MEDAL  each tier level's Evil medal: the next LOUD item: kill effects, underglows and rear wings, in turn
//               (a level with one side, the Battlefield or an always-Good level, gives both at once, as its medals do)
//   TIER SET    every medal of a tier: 2 crates
//   CRATE       one every 5 deliveries on time (the counter levelsDelivered): one of any earned item, the one the player has fewest of
//               (ties: a rotating pick), so crates fill the collection and then make spares for a second car
// Not given during a replay being watched (its save is put back after), and written nowhere on a test visit (Progress.noSave).
// Render-only: imported by main.js; reads the rules' modules, never written by them; not in the replay fingerprint.
import { Progress } from '../progress.js';
import { Tiers } from '../tiers.js';
import { levelName } from '../levels.js';
import { Game } from '../game.js';
import { Replay } from '../replay.js';
import { COSMETICS, cosmeticKey, cosmeticCount, grantCosmetics, stockMeta, setStockMeta } from './cosmetics.js';
import { migrateStock } from './cosmeticstock.js';
import './platecosmetic.js'; // (the registry's items: plates, props, kill effects, glows)
import './propdress.js';
import './killfx.js';
import './underglow.js';

export const STARTER = ['plate:classic', 'plate:yellow', 'plate:retro'];
export const CRATE_EVERY = 5, TIER_CRATES = 2;
const earnedItems = (slots) => COSMETICS.filter(c => c.earned && (!slots || slots.includes(c.slot)));
// the pools, in registry order (plates by family, as the Plate tab lists them)
export const platePool = () => earnedItems(['plate']).filter(c => !STARTER.includes(cosmeticKey(c.slot, c.id)));
export const loudPool = () => {
  const lists = ['kill', 'underglow', 'wing'].map(s => earnedItems([s])), out = [];
  for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]); // (one of each in turn)
  return out;
};
export const cratePool = () => earnedItems();
// the medal rewards: [{ id, level, evil, item }] for every level of every tier, in the menu's order
export const medalTable = () => {
  const plates = platePool(), loud = loudPool(), out = [];
  Tiers.tiers.flat().forEach((level, i) => {
    if (plates.length) out.push({ id: 'm:' + level.id + ':g', level, evil: false, item: plates[i % plates.length] });
    if (loud.length) out.push({ id: 'm:' + level.id + ':e', level, evil: true, item: loud[i % loud.length] });
  });
  return out;
};
const anyMedal = () => Tiers.tiers.flat().some(level => Tiers.medals(level) > 0) || (Progress.data.stats?.levelsDelivered || 0) > 0;
const tiersComplete = () => Tiers.tiers.filter(list => list.length && list.every(level => Tiers.medals(level) === 2)).length;
export const cratesDue = () => Math.floor((Progress.data.stats?.levelsDelivered || 0) / CRATE_EVERY) + TIER_CRATES * tiersComplete();
// one crate: the earned item the player has fewest of; ties broken by a pick that moves on with each crate
export const crateItem = (n) => {
  const pool = cratePool();
  if (!pool.length) return null;
  let best = null, bestN = Infinity;
  for (let k = 0; k < pool.length; k++) {
    const c = pool[(n * 7 + k) % pool.length], have = cosmeticCount(c.slot, c.id);
    if (have < bestN) { best = c; bestN = have; }
  }
  return best;
};

// give what is due and not yet given: [{ key, name, slot, why }] (empty: nothing new)
export const settleEarnings = () => {
  if (Replay.playing) return [];
  migrateStock(); // (before anything is given: what is worn is first made owned, one a car)
  const { claimed, crates } = stockMeta(), have = new Set(claimed), got = [];
  const give = (c, why) => { grantCosmetics([cosmeticKey(c.slot, c.id)]); got.push({ key: cosmeticKey(c.slot, c.id), name: c.name, slot: c.slot, why }); };
  if (!have.has('starter') && anyMedal()) {
    for (const key of STARTER) { const c = COSMETICS.find(x => cosmeticKey(x.slot, x.id) === key); if (c) give(c, 'Your first delivery'); }
    have.add('starter');
  }
  for (const r of medalTable()) {
    if (have.has(r.id) || !Tiers.medalEarned(r.level, r.evil)) continue;
    give(r.item, (r.evil ? 'Evil' : 'Good') + ' medal: ' + levelName(r.level));
    have.add(r.id);
  }
  let opened = crates;
  for (const due = cratesDue(); opened < due; opened++) { const c = crateItem(opened); if (c) give(c, 'Delivery crate'); }
  if (got.length || opened !== crates) setStockMeta({ claimed: [...have], crates: opened });
  return got;
};
// how an item is earned, in a few words for a locked chip
export const hintFor = (slot, id) => {
  const key = cosmeticKey(slot, id);
  if (STARTER.includes(key)) return 'Earn it: your first delivery on time.';
  const medals = medalTable().filter(r => cosmeticKey(r.item.slot, r.item.id) === key);
  const crate = 'a delivery crate (one every ' + CRATE_EVERY + ' deliveries)';
  if (!medals.length) return 'Earn it: ' + crate + '.';
  const m = medals[0];
  return 'Earn it: the ' + (m.evil ? 'Evil' : 'Good') + ' medal on ' + levelName(m.level) + (medals.length > 1 ? ' (or ' + (medals.length - 1) + ' more)' : '') + ', or ' + crate + '.';
};

// at the end of a run: give what is due, and say so on the results (a beat later, after the milestone counters have counted the delivery)
const listeners = new Set();
export const onEarned = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const say = (got) => {
  const note = typeof document !== 'undefined' ? document.getElementById('resultNote') : null;
  if (note && got.length) note.textContent += '  |  Cosmetic' + (got.length > 1 ? 's' : '') + ' earned: ' + got.map(g => g.name).join(', ');
};
if (Game?.onFinish) Game.onFinish.push(() => {
  if (Game.state !== 'finished' || Game.outcome !== 'delivered' || Replay.playing) return;
  setTimeout(() => {
    let got = [];
    try { got = settleEarnings(); } catch (error) { console.warn('cosmetic earnings: ' + (error?.message || error)); }
    if (!got.length) return;
    say(got);
    for (const fn of [...listeners]) { try { fn(got); } catch { /* (a listener's own) */ } }
  }, 0);
});
