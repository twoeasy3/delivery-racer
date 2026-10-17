// ---- the TRAIL cosmetic (CHECKLIST 452; the owner, 17-Oct: "build the trail FX tab on the cosmetics"): the look of a car's TURBO TRAIL, one of
// render/turbotrails.js's styles, chosen PER CAR on the Cosmetics screen's 'Trail' tab and worn by that car's turbo in a run.
//   Items: 'classic' (the turbo as it always was: the free look, never counted) and the seven styles (flame, twin, speedlines, afterimage,
//   embers, shockwave, rarity), EARNED like every earned cosmetic (render/cosmetics.js EARNED_SLOTS: a count each, given only through
//   awardCosmetic; one taken from the hand by each car wearing it; no cash price). Rarity: cosmetics.js COSMETIC_RARITY (Uncommon).
//   Storage: render/loadoutstore.js slot 'trail' { id }, per car only (PER_CAR: never the All-cars default's); a store from before has none
//   (absent = Classic: nothing to migrate). Not a model's dressing (nothing on the car's model changes), so NOT in render/loadout.js
//   loadoutKey, as the kill effect is not: a still or a live model is never rebuilt for it.
//   Cars: every car but those with no wheels of their own to dress (the wheels' rule, render/cosmeticslots.js: the Tank and the
//   amphibious tank, car.tank, and the Saucer, car.ufo): no Trail tab on them, and their turbo stays Classic.
//   In a run: render/turbotrails.js asks shownTrail(CAR.id) at every level load (?turbotrail=<name> still overrides it, for tests).
// Render-only: no rules module imports this; it is not in the replay fingerprint.
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import * as Store from './loadoutstore.js';
import { TRAIL_IDS, TRAIL_NAMES } from './trailstyles.js';

export { TRAIL_IDS, TRAIL_NAMES };
export const TRAILS = TRAIL_IDS.map(id => ({ id, name: TRAIL_NAMES[id] || id }));
registerCosmetics(TRAILS.map(t => ({ slot: 'trail', id: t.id, name: t.name })));

export const trailValid = (id) => typeof id === 'string' && TRAIL_IDS.includes(id);
// the support rule: the wheels' (render/cosmeticslots.js): not the Tank(s) or the Saucer
export const trailSupported = (car) => !!car && !car.tank && !car.ufo;
// the trail a car has chosen (Classic: absent, unknown); worn only when owned (or tried on, on the Cosmetics screen)
export const trailChoice = (carId) => { const id = Store.get(carId, 'trail').id; return trailValid(id) ? id : 'classic'; };
export const shownTrail = (carId) => { const id = trailChoice(carId); return id === 'classic' || ownsCosmetic('trail', id) ? id : 'classic'; };
export const setTrail = (id, target) => (trailValid(id) && target != null ? Store.setSlot(target, 'trail', { id }) : false);
