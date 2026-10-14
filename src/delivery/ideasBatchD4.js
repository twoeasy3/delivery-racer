// ---- the idea cars' batch D4 (CHECKLIST item 3xx, to be renumbered): two cars for the Car ideas lot ----------------------
// Entries as IDEA_CARS' (ideas.js: see its header); ideas.js spreads IDEAS_BATCH_D4 into IDEA_CARS, which marks every one an
// idea and a placeholder (price 0). Tierless: no tier, no stars. Models: render/ideaModelsBatchD4.js.
export const IDEAS_BATCH_D4 = [
  { id: 'autobahnestate', name: 'Autobahn Estate', basedOn: 'Audi RS6 Avant', model: 'autobahnestate', color: 0x6f7a86, evilColor: 0x8a1c26,
    hw: 0.92, hl: 2.4, height: 1.42, note: 'A family estate with a very long right foot and room for the shopping at 250.',
    maxSpeed: 42, accel: 15, agility: 1.05, crossing: 0.4, health: 220, mass: 1.5, sound: 'wagon' },
  { id: 'finlandyacht', name: 'Fin Land Yacht', basedOn: 'Cadillac Sedan de Ville (1959)', model: 'finlandyacht', color: 0xe3a9b8, evilColor: 0x17171c,
    hw: 1.0, hl: 2.9, height: 1.45, note: 'Nearly six metres of chrome and sofa, with fins that could hold a sail.',
    maxSpeed: 31, accel: 8, agility: 0.8, crossing: 0.4, health: 300, mass: 2.4, sound: 'lowrider' },
];
