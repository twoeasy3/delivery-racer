// ============================================================================
// PACK IDS - a pack's id is its key in packs.json `packs` (CHECKLIST 151: one definition per pack). The save counts
// the packs held by id, and keeps purchase counters by id. Saves from before (v1.1.53 and earlier) held packs by KIND,
// a special pack as 'special:<event id>': packIdOf turns such a key into today's id (the pack whose `event` is that
// event; a 'special' from no event: the first pack with featured cards), so an old save loads with its packs. Its own
// module (packs.json only) so progress.js can use it without importing packs.js (which imports progress.js).
// ============================================================================
import packData from './packs.json';

const PACKS = packData.packs || {};
// a key of the save (or an id a caller hands in), as a pack id of today; null: no such pack
export const packIdOf = (key, from = null) => {
  const k = String(key ?? '');
  if (Object.hasOwn(PACKS, k) && !from) return k;
  const [kind, at = from] = k.split(':');
  if (Object.hasOwn(PACKS, kind) && !at) return kind;
  if (Object.hasOwn(PACKS, kind) && at && PACKS[kind].event === at) return kind;
  if (kind === 'special' || (Object.hasOwn(PACKS, kind) && PACKS[kind].featured)) { // (an old special pack: by its event, else the first featured pack)
    const byEvent = at ? Object.keys(PACKS).find(id => PACKS[id].event === at) : null;
    return byEvent || Object.keys(PACKS).find(id => PACKS[id].featured) || null;
  }
  return Object.hasOwn(PACKS, kind) ? kind : null;
};
// the packs held, an old save's keys turned into ids (counts of the same pack added; a key of no pack dropped)
export const migrateHeld = (held) => {
  const out = {};
  for (const [key, n] of Object.entries(held && typeof held === 'object' && !Array.isArray(held) ? held : {})) {
    const id = packIdOf(key);
    if (id && Number.isInteger(n) && n > 0) out[id] = (out[id] || 0) + n;
  }
  return out;
};
