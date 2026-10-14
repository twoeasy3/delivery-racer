// ============================================================================
// The car ideas' batch E1 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchE1.js. Lamps: render/carlights-batchE1.js.
// (Design targets were tier 1 for both; an idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_E1 = [
  { id: 'cinquecento', name: 'Cinquecento', basedOn: 'Fiat 500 (Nuova 500, 1957)', model: 'cinquecento', color: 0x8fc1e0, evilColor: 0x1b1b1f,
    hw: 0.69, hl: 1.55, height: 1.32, note: 'A round little egg with its engine in the tail, and a very small turning circle.',
    maxSpeed: 22, accel: 7, agility: 1.25, crossing: 0.5, health: 80, mass: 0.9, sound: 'mini' },
  { id: 'keivan', name: 'Kei Van', basedOn: 'Suzuki Every', model: 'keivan', color: 0xf1f1ec, evilColor: 0x1f4a4a,
    hw: 0.78, hl: 1.75, height: 1.88, note: 'Tall, boxy and narrow: a whole delivery round folded into a few square metres.',
    maxSpeed: 23, accel: 7, agility: 1.05, crossing: 0.6, health: 100, mass: 1.1, sound: 'keitruck' },
];
