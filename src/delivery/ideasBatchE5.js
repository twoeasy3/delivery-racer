// ============================================================================
// The car ideas' batch E5 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchE5.js. Lamps: render/carlights-batchE5.js.
// (Design targets: the Touring Car T4, the Hill-Climb Special T5; an idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_E5 = [
  { id: 'touringcar', name: 'Touring Car', basedOn: 'BMW M3 E30 (Group A touring car, 1987)', model: 'touringcar', color: 0xf0f0f0, evilColor: 0xc42a2a,
    hw: 1.13, hl: 2.3, height: 1.62, note: 'A family saloon with the rules bent: the big wing is not for show, and it grips like glue.',
    maxSpeed: 38, accel: 14, agility: 1.35, crossing: 0.2, health: 130, mass: 1.2, sound: 'sport' },
  { id: 'hillclimb', name: 'Hill-Climb Special', basedOn: 'Peugeot 205 T16 Pikes Peak (1987)', model: 'hillclimb', color: 0xc4c8cc, evilColor: 0x4a2a6e,
    hw: 1.085, hl: 2.36, height: 1.88, note: 'All wing and no brakes to speak of: very quick, and it twitches at every touch.',
    maxSpeed: 44, accel: 19, agility: 1.6, crossing: 0.3, health: 100, mass: 1, sound: 'rally' },
];
