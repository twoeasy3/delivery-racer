// ============================================================================
// The car ideas' batch D1 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free, no stars): the two T1-tier design targets of CHECKLIST 260 (the tier is only the target). Models:
// render/ideaModelsBatchD1.js. Lamps: render/carlights-batchD1.js.
// ============================================================================
export const IDEAS_BATCH_D1 = [
  { id: 'wedgemicro', name: 'Wedge Microcar', basedOn: 'Peel P50 (1962)', model: 'wedgemicro', color: 0xf2c230, evilColor: 0x3a2a55,
    hw: 0.58, hl: 0.85, height: 1.3, note: 'One door, one headlamp and room for one. It turns on a coin.',
    maxSpeed: 21, accel: 8, agility: 1.5, crossing: 0.2, health: 55, mass: 0.6, sound: 'mini' },
  { id: 'farmtractor', name: 'Farm Tractor', basedOn: 'Ford 8N (1947)', model: 'farmtractor', color: 0xc8381f, evilColor: 0x232a35,
    hw: 0.99, hl: 1.7, height: 1.65, note: 'No hurry, no ditch it cannot cross, and nothing gets it to stop.',
    maxSpeed: 17, accel: 5, agility: 0.8, crossing: 0.9, health: 260, mass: 2.2, sound: 'keitruck' },
];
