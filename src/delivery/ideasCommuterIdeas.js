// ============================================================================
// Three plain little city hatchbacks for the car ideas lot (ideas.js spreads them into IDEA_CARS; the same fields and rules
// as every idea there: placeholders, tierless and free). They began as three drafts for a new Commuter (the owner, 15-Oct);
// the Commuter stayed as it is and these became ideas of their own. Models: render/ideaModelsCommuterIdeas.js. Lamps:
// render/carlights-commuter-ideas.js. Sizes: the Commuter's footprint (the models are built to it).
// ============================================================================
export const IDEAS_COMMUTER_IDEAS = [
  { id: 'smileyhatch', name: 'Smiley Hatch', basedOn: 'Daewoo Matiz (1998)', model: 'smileyhatch', color: 0x6cc4e0, evilColor: 0x4b2a5e,
    hw: 0.85, hl: 1.85, height: 1.45, note: 'Two big round eyes and a grin: the friendliest face in any traffic jam.',
    maxSpeed: 24, accel: 10, agility: 1.25, crossing: 0.5, health: 85, mass: 0.9, sound: 'commuter' },
  { id: 'eightieshatch', name: 'Eighties Hatch', basedOn: 'Ford Fiesta Mk2 (1983)', model: 'eightieshatch', color: 0xd9b23a, evilColor: 0x1f3d2e,
    hw: 0.85, hl: 1.85, height: 1.45, note: 'Square lamps, rubber bumpers and nothing round about it but the wheels.',
    maxSpeed: 24, accel: 9.5, agility: 1.2, crossing: 0.5, health: 95, mass: 0.9, sound: 'commuter' },
  { id: 'pebble', name: 'Pebble', basedOn: 'Ford Ka (1996)', model: 'pebble', color: 0x9ccf3a, evilColor: 0x2e3478,
    hw: 0.85, hl: 1.85, height: 1.45, note: 'One smooth curve from nose to tail, with a wheel out at each corner.',
    maxSpeed: 25, accel: 10, agility: 1.3, crossing: 0.45, health: 80, mass: 0.85, sound: 'commuter' },
];
