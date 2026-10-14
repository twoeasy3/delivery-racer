// ============================================================================
// The car ideas' top-up batch C (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsTopupC.js. Lamps: render/carlights-topup-C.js.
// (The owner's research gave each a star rating, the Pocket 4x4 and the Ice Resurfacer 2, the Dodgem 1: kept here as a
// note only, since an idea has no stars until it is promoted; scripts/.ideas-check.mjs holds every idea starless.)
// The Dodgem's `height` is its body's and seat's (1.05 m), not its pole's (2.0 m at the top): the hitbox height is what
// low bridges, the wind, a low sun's shade and road spray read, and the pole is a thin sprung rod.
// ============================================================================
export const IDEAS_TOPUP_C = [
  { id: 'pocket4x4', name: 'Pocket 4x4', basedOn: 'Suzuki Jimny SJ410 (1981)', model: 'pocket4x4', color: 0x8cc43a, evilColor: 0x6b5f4a,
    hw: 0.78, hl: 1.6, height: 1.75, note: 'A little box that goes where the big ones can\'t.',
    maxSpeed: 26, accel: 10, agility: 1.3, crossing: 0.95, health: 110, mass: 1, sound: 'suv' },
  { id: 'dodgem', name: 'Dodgem', basedOn: 'fairground bumper car', model: 'dodgem', color: 0xd8262b, evilColor: 0x5a2a8a,
    hw: 0.75, hl: 1.1, height: 1.05, note: 'Built to be hit: it bounces off everything and goes straight on.',
    maxSpeed: 23, accel: 10, agility: 1.5, crossing: 0.3, health: 150, mass: 1, sound: 'mini' },
  { id: 'iceresurfacer', name: 'Ice Resurfacer', basedOn: 'Zamboni Model 500', model: 'iceresurfacer', color: 0xeeeeee, evilColor: 0x2a2d33,
    hw: 1.1, hl: 2.4, height: 2.4, note: 'It leaves a clean sheet behind it and nothing in the way.',
    maxSpeed: 23, accel: 5, agility: 0.9, crossing: 0.5, health: 300, mass: 3.2, sound: 'keitruck' },
];
