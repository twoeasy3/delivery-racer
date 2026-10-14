// ============================================================================
// The car ideas' batch E3 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchE3.js. Lamps: render/carlights-batchE3.js.
// (Design targets: tier 2 for the Crane Lorry, tier 3 for the Moor Rover; an idea has no tier or stars until promoted.)
// ============================================================================
export const IDEAS_BATCH_E3 = [
  { id: 'cranelorry', name: 'Crane Lorry', basedOn: 'Hiab-style loader crane on a three-axle flatbed lorry (1970s)', model: 'cranelorry', color: 0xe8c21a, evilColor: 0x8a4a22,
    hw: 1.48, hl: 3.2, height: 3.02, note: 'A crane folded away behind the cab, ready to lift its own load.',
    maxSpeed: 23, accel: 6, agility: 0.85, crossing: 0.7, health: 340, mass: 3, sound: 'sixbysix' },
  { id: 'moorrover', name: 'Moor Rover', basedOn: 'Range Rover two-door (1970)', model: 'moorrover', color: 0x9c6b3a, evilColor: 0x1f3a2a,
    hw: 1.08, hl: 2.3, height: 1.81, note: 'The first posh 4x4: a tall boxy estate that goes where the road gives up.',
    maxSpeed: 34, accel: 10, agility: 1.05, crossing: 1, health: 200, mass: 1.7, sound: 'suv' },
];
