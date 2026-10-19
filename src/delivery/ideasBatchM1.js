// ============================================================================
// The car ideas' batch M1 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free). Models: render/ideaModelsBatchM1.js. Lamps: render/carlights-batchM1.js.
// The Mining Haul Truck is built at the game's scale (no `real` / `scale`): the real truck is 9.75 m wide, so its width is folded
// into the 3 m cap while its length and height stay near the real proportions (a giant beside the road cars, not a toy).
// ============================================================================
export const IDEAS_BATCH_M1 = [
  { id: 'haultruck', name: 'Mining Haul Truck', basedOn: 'Caterpillar 797F mining haul truck', model: 'haultruck', color: 0xf2c200, evilColor: 0x3a3e44,
    hw: 1.5, hl: 3.1, height: 3.5, note: 'Tyres taller than a man, a stairway up the front and a tray that could swallow a house.',
    maxSpeed: 23, accel: 5, agility: 0.85, crossing: 1, health: 350, mass: 3.2, sound: 'sixbysix' },
  { id: 'bulldozer', name: 'Bulldozer', basedOn: 'Caterpillar D9 crawler dozer', model: 'bulldozer', color: 0xf0b400, evilColor: 0x7a2318,
    hw: 1.5, hl: 2.55, height: 3.02, note: 'A blade in front, a ripper behind and tracks that flatten whatever the blade missed.',
    maxSpeed: 23, accel: 5, agility: 0.85, crossing: 1, health: 350, mass: 3.2, sound: 'tank' },
  { id: 'gritter', name: 'Gritter', basedOn: 'UK council road gritter (4x2 lorry with a salt spreader)', model: 'gritter', color: 0xf07a14, evilColor: 0x1e2a4a,
    hw: 1.36, hl: 3.3, height: 3.24, note: 'Out before dawn on a frosty night, flinging salt off a spinning plate.',
    maxSpeed: 26, accel: 6.5, agility: 0.9, crossing: 0.8, health: 300, mass: 2.6, sound: 'sixbysix' },
];
