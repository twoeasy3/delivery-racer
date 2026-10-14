// ============================================================================
// The car ideas' batch D3 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free). Models: render/ideaModelsBatchD3.js. Lamps: render/carlights-batchD3.js.
// (Design tiers: the Half-Track and the Sprint Hatch were drawn to a tier-3 target, CHECKLIST item 260; as ideas they carry
// no tier and no stars. The Sprint Hatch is after the Honda CR-X, not an AE86: the Panda Coupe is already that.)
// ============================================================================
export const IDEAS_BATCH_D3 = [
  { id: 'halftrack', name: 'Half-Track', basedOn: 'Kegresse / M3 half-track (civilian utility)', model: 'halftrack', color: 0xc9a24a, evilColor: 0x2f3a2a,
    hw: 1.35, hl: 3.0, height: 2.45, note: 'Wheels to steer at the front, tracks to push at the back: it crosses anything.',
    maxSpeed: 27, accel: 8, agility: 0.9, crossing: 1, health: 200, mass: 2.6, sound: 'suv' },
  { id: 'sprinthatch', name: 'Sprint Hatch', basedOn: 'Honda CR-X (1984)', model: 'sprinthatch', color: 0xcf2a22, evilColor: 0x2c3f8f,
    hw: 0.925, hl: 2.0, height: 1.3, note: 'Short, light and quick to turn: the back end likes to come round.',
    maxSpeed: 31, accel: 12, agility: 1.5, crossing: 0.4, health: 105, mass: 1, sound: 'hothatch' },
];
