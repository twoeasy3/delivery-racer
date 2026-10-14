// ---- the idea cars' top-up, batch A (CHECKLIST: the ideas top-up): four classic road cars for the Car ideas lot ---------
// Entries as IDEA_CARS' (ideas.js: see its header for the fields); ideas.js spreads IDEA_CARS_TOPUP_A into IDEA_CARS, which
// marks every one an idea and a placeholder (price 0). Models: render/ideaModelsTopupA.js. The owner's proposed star ratings
// are kept here as `ratingIdea`, not `rating`: cars.js stars() reads `rating`, and an idea must show no stars (it is
// tierless; scripts/.ideas-check.mjs checks it). A balancing pass that makes one a real car can take it from there.
export const IDEA_CARS_TOPUP_A = [
  { id: 'slantback', name: 'Slant-Back Saloon', basedOn: 'Ford Anglia 105E (1959)', model: 'slantback', color: 0x8fcfc4, evilColor: 0x6b1f2a,
    hw: 0.85, hl: 2.1, height: 1.4, note: 'Its back window leans the wrong way, and it still gets there first.',
    maxSpeed: 28, accel: 10.5, agility: 1.0, crossing: 0.5, health: 110, mass: 1.0, sound: 'commuter', ratingIdea: 2 },
  { id: 'glassbrake', name: 'Glass-Hatch Brake', basedOn: 'Volvo P1800 ES (1972)', model: 'glassbrake', color: 0xe8e2cf, evilColor: 0x1f3a2a,
    hw: 0.88, hl: 2.1, height: 1.25, note: 'A sports coupe that learned to carry the shopping, and the glass shows it.',
    maxSpeed: 34, accel: 12, agility: 1.0, crossing: 0.4, health: 130, mass: 1.0, sound: 'miata', ratingIdea: 3 },
  { id: 'sevenroadster', name: 'Seven Roadster', basedOn: 'Lotus Seven (1957)', model: 'sevenroadster', color: 0x1d4a2c, evilColor: 0x1c1c20,
    hw: 0.78, hl: 1.8, height: 0.95, note: 'More wheels and engine than car, and happiest flat out.',
    maxSpeed: 38, accel: 16, agility: 1.45, crossing: 0.2, health: 80, mass: 0.8, sound: 'rally', ratingIdea: 4 },
  { id: 'talltourer', name: 'Tall Tourer', basedOn: 'Ford Model T (1908-27)', model: 'talltourer', color: 0x1b1c20, evilColor: 0x6b1a1a,
    hw: 0.85, hl: 1.95, height: 2.0, note: "Any colour you like, so long as it's tall.",
    maxSpeed: 23, accel: 6, agility: 0.9, crossing: 0.9, health: 100, mass: 1.0, sound: 'junker', ratingIdea: 1 },
];
