// ============================================================================
// One more car idea (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: a placeholder,
// tierless and free): the owner's Paddle-Wheel Amphibian, a duck-tour amphibian (the sightseeing conversions of the
// wartime six-wheeled DUKW, as the tours in Singapore run them) with a river steamer's paddle wheel and funnel.
// Model: render/ideaModelsPaddleDuck.js. Lamps: render/carlights-paddleduck.js.
// Its `height` is the canopy roof's (3.1 m), not the funnel's top (3.82 m): the funnel is a thin stack behind the canopy, as
// the Dodgem's pole is left out of its height (ideasTopupC.js). Like every idea it is NOT amphibious in the game (ideas.js:
// an idea never is; an amphibious level is driven only in the amphibious garage cars).
// ============================================================================
export const IDEAS_PADDLE_DUCK = [
  { id: 'paddleduck', name: 'Paddle-Wheel Amphibian', basedOn: 'Singapore DUCKtours amphibious tour bus (a converted DUKW) crossed with a sternwheel riverboat',
    model: 'paddleduck', color: 0xf2c21b, evilColor: 0x1e2a48,
    hw: 1.3, hl: 4.8, height: 3.1, note: 'A tour boat on six wheels: benches under a canopy, a duck\'s face on the bow and a paddle wheel turning at the stern.',
    maxSpeed: 24, accel: 5.5, agility: 0.85, crossing: 1, health: 340, mass: 3, sound: 'sixbysix' },
];
