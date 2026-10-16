// ============================================================================
// TIER TRAFFIC - a tiered level's traffic is traffic-exclusive vehicles and garage cars of its tier and below
// (the owner, 16-Oct; CONFIG.tierTraffic). One table and one rule:
//   TRAFFIC_TIERS  every kind in CONFIG.vehicles -> its tier (a garage car's: cars.js carTier, gold 1-5 and Blue 6-10;
//                  an amphibious car's own stars) or 'exclusive' (no garage car with stars: always allowed)
//   levelTier      the level's tier in tiers.json (1-10), or null (races, specials, amphibious, events, hidden)
//   tierWeights    a traffic mix (kind -> weight) with each kind the tier does not allow swapped (CONFIG.tierTraffic.swap)
//                  or dropped; never left empty
// traffic.js reads every mix through it (weightsAt: the level's list and its zones, so spawns, parked cars, jam queues
// and reversible lanes), and a convoy's own kind through swapKind. Not the tiers switch (?tiers=0): a level's traffic
// is its own, whatever the menu's rules, so a replay plays the same either way
// ============================================================================
import tierData from './tiers.json';
import { CONFIG } from './config.js';
import { carById, carTier } from './cars.js';

const TIER_OF_LEVEL = new Map();
for (const [n, ids] of Object.entries(tierData.tiers || {})) for (const id of Array.isArray(ids) ? ids : []) TIER_OF_LEVEL.set(String(id), Number(n));

// a kind's tier: the garage car of that id with stars, or 'exclusive'
const kindTier = (kind) => {
  const car = carById(kind);
  const tier = carTier(car) ?? (car?.amphibious && car.tier >= 1 && car.tier <= 5 ? car.tier : null);
  return tier ?? 'exclusive';
};
export const TRAFFIC_TIERS = Object.fromEntries(Object.keys(CONFIG.vehicles).map(kind => [kind, kindTier(kind)]));

export const levelTier = (level) => (level && TIER_OF_LEVEL.get(String(level.id))) ?? null;
const on = () => CONFIG.tierTraffic?.on !== false;

// may this kind turn up on a level of that tier (null: any)?
export const allowedKind = (kind, tier) => tier == null || !on() || TRAFFIC_TIERS[kind] === undefined || TRAFFIC_TIERS[kind] === 'exclusive' || TRAFFIC_TIERS[kind] <= tier;
// the kind that turns up in its place: itself if allowed, else its swap (followed), else null (dropped)
export const swapKind = (kind, tier) => {
  const seen = new Set();
  while (kind && !allowedKind(kind, tier)) {
    if (seen.has(kind)) return null;
    seen.add(kind);
    kind = CONFIG.tierTraffic.swap[kind] ?? null;
  }
  return kind || null;
};
// a mix (kind -> weight) for that tier: each kind's weight goes to the kind in its place (its own key order kept, a
// swapped one added to its stand-in's); all of a positive mix dropped: the lot to the fallback. The same object back
// where nothing changes
export const tierWeights = (weights, tier) => {
  if (tier == null || !on() || Object.keys(weights).every(kind => allowedKind(kind, tier))) return weights;
  const out = {};
  let total = 0, kept = 0;
  for (const [kind, rate] of Object.entries(weights)) {
    total += rate > 0 ? rate : 0;
    const to = swapKind(kind, tier);
    if (!to) continue;
    out[to] = (out[to] || 0) + rate;
    kept += rate > 0 ? rate : 0;
  }
  if (total > 0 && !(kept > 0)) out[CONFIG.tierTraffic.fallback] = total;
  return out;
};
