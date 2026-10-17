// ---- WHICH POSE A PACK'S BANNER TAKES (render/packbanner.js; BANNER-POSES.md). Render-side on purpose: packs.json is a
// replay RULES file (progress.js -> packid.js -> packs.json, scripts/logic-hash.mjs), so a banner field there would move
// the replay fingerprint. A pack named in PAIRINGS takes its pairing; any other, a pose picked from its id (a hash: the
// same pack, the same pose, every time).
import { POSES, POSE_NAMES, DEFAULT_POSE } from './bannerposes.js';

export const PAIRINGS = {
  'supercar-special': { pose: 'showdown' },  // the template's own pack keeps its look
  'classic-special': { pose: 'abreast' },    // a road trip: side by side
  'record-special': { pose: 'headon' },      // record cars, at the camera
  'cruiser-special': { pose: 'staggered' },  // the big saloons, overlapping
  'car-hunt-special': { pose: 'solo' },      // (one car: no banner today; ready if it gets one)
  'comet-special': { pose: 'chase' },        // (the same)
};
// a string's hash (FNV-1a, 32 bits)
export const hashOf = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
};
// { pose } for a pack id ('' or none: the default)
export const bannerChoice = (packId = '') => {
  const set = PAIRINGS[packId] || {};
  const pose = POSES[set.pose] ? set.pose : packId ? POSE_NAMES[hashOf(packId) % POSE_NAMES.length] : DEFAULT_POSE;
  return { pose };
};
