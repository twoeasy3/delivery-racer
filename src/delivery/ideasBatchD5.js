// ============================================================================
// The car ideas' batch D5 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there:
// placeholders, tierless and free). Models: render/ideaModelsBatchD5.js. Lamps: render/carlights-batchD5.js.
// A desert racing truck and an armoured limousine (a design target of tier 5 each; an idea has no stars until promoted).
// ============================================================================
export const IDEAS_BATCH_D5 = [
  { id: 'trophytruck', name: 'Trophy Truck', basedOn: 'Baja 1000 class 1 trophy truck', model: 'trophytruck', color: 0xe8821e, evilColor: 0x2f6f5a,
    hw: 1.2, hl: 2.8, height: 2.0, note: 'Long-travel springs, tyres taller than the bonnet and a cage round the cab: it flies over what others drive round.',
    maxSpeed: 38, accel: 12, agility: 1.1, crossing: 1, health: 260, mass: 2.2, sound: 'liftedtruck' },
  { id: 'armouredlimo', name: 'Armoured Limo', basedOn: 'Cadillac One presidential state limousine', model: 'armouredlimo', color: 0x4d5666, evilColor: 0x7a1c34,
    hw: 1.38, hl: 3.15, height: 1.75, note: 'Doors as thick as a vault\'s, tiny windows and a long way to the back seat.',
    maxSpeed: 34, accel: 8, agility: 0.85, crossing: 0.5, health: 420, mass: 3.4, sound: 'hearse' },
];
