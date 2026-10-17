// ---- WHICH POSE AND BACKDROP A PACK'S BANNER TAKES (render/packbanner.js; BANNER-POSES.md). Render-side on purpose: packs.json is a
// replay RULES file (progress.js -> packid.js -> packs.json, scripts/logic-hash.mjs), so a banner field there would move
// the replay fingerprint. A pack named in PAIRINGS takes its pairing; any other, a pose picked from its id (a hash: the
// same pack, the same pose, every time).
import { POSES, POSE_NAMES, DEFAULT_POSE } from './bannerposes.js';
import { BACKDROP_NAMES, DEFAULT_BACKDROP } from './bannerbackdrops.js';

export const PAIRINGS = {
  'supercar-special': { pose: 'showdown', backdrop: 'town' },   // the template's own pack keeps its look
  'classic-special': { pose: 'abreast', backdrop: 'coast' },    // a road trip: side by side, by the sea
  'record-special': { pose: 'chase', backdrop: 'tunnel' },      // record cars from behind, at speed (head-on hid the jet car's length)
  'cruiser-special': { pose: 'headon', backdrop: 'neon' },      // the big saloons' grilles, at night
  'car-hunt-special': { pose: 'solo', backdrop: 'showroom' },   // (one car: no banner today; ready if it gets one)
  'comet-special': { pose: 'chase', backdrop: 'synthwave' },    // (the same)
};
// a string's hash (FNV-1a, 32 bits)
export const hashOf = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};
// { pose, backdrop } for a pack id ('' or none: the defaults). The backdrop from another bit of the hash than the pose
export const bannerChoice = (packId = '') => {
  const set = PAIRINGS[packId] || {}, h = packId ? hashOf(packId) : 0;
  const pose = POSES[set.pose] ? set.pose : packId ? POSE_NAMES[h % POSE_NAMES.length] : DEFAULT_POSE;
  const backdrop = BACKDROP_NAMES.includes(set.backdrop) ? set.backdrop : packId ? BACKDROP_NAMES[(h >>> 8) % BACKDROP_NAMES.length] : DEFAULT_BACKDROP;
  return { pose, backdrop };
};
