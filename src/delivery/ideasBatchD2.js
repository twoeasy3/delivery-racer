// ============================================================================
// The car ideas' batch D2 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchD2.js. Lamps: render/carlights-batchD2.js.
// (Design targets were tier 2 for both; an idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_D2 = [
  { id: 'flatbed', name: 'Flatbed Truck', basedOn: 'Bedford TK (1960) flatbed lorry', model: 'flatbed', color: 0xd9a21b, evilColor: 0x2f3b2c,
    hw: 0.98, hl: 2.4, height: 2.3, note: 'No sides to speak of: whatever it carries is held on by rope and hope.',
    maxSpeed: 25, accel: 6, agility: 0.95, crossing: 0.7, health: 220, mass: 2.2, sound: 'keitruck' },
  { id: 'moke', name: 'Utility Moke', basedOn: 'Mini Moke (1964)', model: 'moke', color: 0x6fb8c8, evilColor: 0x4a3c2c,
    hw: 0.8, hl: 1.7, height: 1.4, note: 'No doors, no roof and no shame: a bed in the back for the odd job.',
    maxSpeed: 22, accel: 8, agility: 1.25, crossing: 0.5, health: 90, mass: 1, sound: 'mini' },
];
