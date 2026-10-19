// ============================================================================
// The car ideas' batch M2 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchM2.js. Lamps: render/carlights-batchM2.js.
// ============================================================================
export const IDEAS_BATCH_M2 = [
  { id: 'stockcar', name: 'Stock Car', basedOn: 'NASCAR Cup stock car (Chevrolet Lumina era, 1990s)', model: 'stockcar', color: 0x2f7ad6, evilColor: 0x1a1a1a,
    hw: 1.12, hl: 2.55, height: 1.36, note: 'Built to turn left for five hundred miles, and to lean on whoever is beside it.',
    maxSpeed: 36, accel: 12, agility: 1.0, crossing: 0.25, health: 170, mass: 1.4, sound: 'muscle' },
  { id: 'mobilelibrary', name: 'Mobile Library', basedOn: 'British coachbuilt mobile library on a Leyland Terrier chassis (1970s)', model: 'mobilelibrary', color: 0x2e6b4f, evilColor: 0x4a2a5a,
    hw: 1.42, hl: 3.5, height: 3.08, note: 'Shelves floor to ceiling, a step at the back, and every book due back next Tuesday.',
    maxSpeed: 22, accel: 5, agility: 0.8, crossing: 0.6, health: 300, mass: 3.0, sound: 'sixbysix' },
  { id: 'jingletruck', name: 'Jingle Truck', basedOn: 'Pakistani decorated truck ("jingle truck"), coachbuilt on a Bedford J-type chassis', model: 'jingletruck', color: 0xe8a21c, evilColor: 0x2a3f7a,
    hw: 1.48, hl: 3.5, height: 3.5, note: 'Every inch painted, a crown over the cab, and chains along the bumper that sing all the way down the pass.',
    maxSpeed: 24, accel: 6, agility: 0.85, crossing: 0.8, health: 320, mass: 3.0, sound: 'sixbysix' },
];
