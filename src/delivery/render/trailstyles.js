// ---- the TURBO TRAIL STYLES as data (CHECKLIST 456; a cosmetic since CHECKLIST 466): their ids, names and looks, with nothing drawn here, so the
// Trail cosmetic (render/trailcosmetic.js) and unlockall.js can list them without the game's scene. render/turbotrails.js draws them.
// 'classic' is the turbo as it always was (the cyan and white cubes, render/items.js): the Trail slot's free look.
export const STYLES = {
  flame: 'a short jet of flame from two nozzles: white-hot at the pipe, orange, red, gone (cones)',
  twin: 'two cyan ribbons from the tail corners, flat on the air, bending with every lane change',
  speedlines: 'white streaks rushing back past the body, more and longer the faster it goes (lines)',
  afterimage: 'cyan silhouettes of the car itself left behind it, fading (its own geometry, merged once)',
  embers: 'sparks shed from the tail, falling and bouncing on the road (points)',
  shockwave: 'rings pulsing out of the tail and widening as they fall back (thin tori)',
  rarity: 'one wide ribbon in the colour of the car\'s card rarity (Common grey ... Legendary orange)',
};
export const STYLE_NAMES = Object.keys(STYLES);
// the names on the Cosmetics screen's cards
export const TRAIL_NAMES = { classic: 'Classic', flame: 'Flame', twin: 'Twin', speedlines: 'Speed lines', afterimage: 'Afterimage', embers: 'Embers', shockwave: 'Shockwave', rarity: 'Rarity' };
export const TRAIL_IDS = ['classic', ...STYLE_NAMES];
