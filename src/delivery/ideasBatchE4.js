// ============================================================================
// The car ideas' batch E4 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchE4.js. Lamps: render/carlights-batchE4.js.
// (Design targets were tier 3 for both; an idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_E4 = [
  { id: 'sporttruck', name: 'Sport Truck', basedOn: 'Ford F-150 Lightning (2000s)', model: 'sporttruck', color: 0x2f55b0, evilColor: 0x141418,
    hw: 1.12, hl: 2.62, height: 1.75, note: 'A pickup that sat down on its springs: low, loud and quick, with a bed for one small job.',
    maxSpeed: 38, accel: 14, agility: 0.9, crossing: 0.7, health: 230, mass: 1.9, sound: 'pickup' },
  { id: 'pixelev', name: 'Pixel EV', basedOn: 'Hyundai Ioniq 5 (2020s)', model: 'pixelev', color: 0xb9bec4, evilColor: 0x1a1a1f,
    hw: 1.0, hl: 2.4, height: 1.6, note: 'A quiet, boxy electric hatch whose lamps are little glowing squares.',
    maxSpeed: 38, accel: 16, agility: 1.1, crossing: 0.4, health: 140, mass: 1.2, sound: 'evsaloon' },
];
