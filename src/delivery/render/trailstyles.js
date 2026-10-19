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
  // CHECKLIST 513 (render/turbotrailsmore.js)
  pixels: 'an 8-bit rainbow carpet: rows of six coloured blocks side by side, stepping left and right, shrinking out in steps',
  stardust: 'gold and white four-pointed sparkles hanging in the air round the tail, twinkling',
  bubbles: 'soap bubbles rising and wobbling behind the car, flashing as they pop',
  leaves: 'autumn leaves thrown from the tail corners, tumbling and swaying down onto the road',
  lightning: 'short jagged violet bolts crackling back from the tail, a new shape every bolt',
  comet: 'a bright white head behind the tail and a tapering tail of beads, white to blue to violet',
  helix: 'two strands of beads, lime and magenta, twisting round each other',
  chevrons: 'amber arrows stamped on the road under the car, pointing the way it goes',
};
export const STYLE_NAMES = Object.keys(STYLES);
// the names on the Cosmetics screen's cards
export const TRAIL_NAMES = { classic: 'Classic', flame: 'Flame', twin: 'Twin', speedlines: 'Speed lines', afterimage: 'Afterimage', embers: 'Embers', shockwave: 'Shockwave', rarity: 'Rarity',
  pixels: 'Pixels', stardust: 'Stardust', bubbles: 'Bubbles', leaves: 'Leaves', lightning: 'Lightning', comet: 'Comet', helix: 'Helix', chevrons: 'Chevrons' };
export const TRAIL_IDS = ['classic', ...STYLE_NAMES];
