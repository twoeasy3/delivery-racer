// ============================================================================
// The car ideas' batch E2 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchE2.js. Lamps: render/carlights-batchE2.js.
// (Design targets: tier 1 for the Boxy Supermini, tier 2 for the Shuttle Minibus. An idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_E2 = [
  { id: 'supermini', name: 'Boxy Supermini', basedOn: 'Fiat Uno (1983) / original Fiat Panda (1980) square hatchback', model: 'supermini', color: 0xd8402e, evilColor: 0x33363b,
    hw: 0.86, hl: 1.77, height: 1.49, note: 'All straight lines and no airs: a tall little box with a big glass back door, quick round a corner.',
    maxSpeed: 24, accel: 8, agility: 1.3, crossing: 0.45, health: 85, mass: 0.95, sound: 'mini' },
  { id: 'minibus', name: 'Shuttle Minibus', basedOn: 'Toyota HiAce (1989) passenger minibus', model: 'minibus', color: 0xeadfc2, evilColor: 0x5a1f2b,
    hw: 1.21, hl: 2.51, height: 2.27, note: 'Twelve seats, five windows a side and a long wait at every stop.',
    maxSpeed: 25, accel: 6, agility: 0.9, crossing: 0.6, health: 150, mass: 1.9, sound: 'minivan' },
];
