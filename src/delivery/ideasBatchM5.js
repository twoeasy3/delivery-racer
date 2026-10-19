// ============================================================================
// The car ideas' batch M5 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free). Models: render/ideaModelsBatchM5.js. Lamps: render/carlights-batchM5.js.
//   pacecar    the Pace Car, after the 1982 Chevrolet Camaro Z28 Indy 500 pace car (the third-generation Camaro): a light bar
//              on the roof and a bold stripe down its flanks
//   stonecar   the Stone-Age Car, after the Flintstones' car (the 1960 cartoon): a log frame on two rollers of rock, open
//              sides under a hide canopy on sticks, a driver's bench (no people drawn, no feet)
//   skiplorry  the Skip Lorry, after a 1980s skip loader (a flat-fronted cab, two hydraulic lift arms and a steel skip on chains)
// The Stone-Age Car's `height` is its canopy's top; the Skip Lorry's is its arms' tips.
// ============================================================================
export const IDEAS_BATCH_M5 = [
  { id: 'pacecar', name: 'Pace Car', basedOn: 'Chevrolet Camaro Z28 Indy 500 pace car (1982)', model: 'pacecar', color: 0xeef0f2, evilColor: 0x1c1c22,
    hw: 1.06, hl: 2.42, height: 1.42, note: 'Out in front before the green flag, with the lights going on the roof.',
    maxSpeed: 41, accel: 14, agility: 1.15, crossing: 0.35, health: 170, mass: 1.5, sound: 'muscle' },
  { id: 'stonecar', name: 'Stone-Age Car', basedOn: "The Flintstones' car (1960 cartoon)", model: 'stonecar', color: 0x9a6a3c, evilColor: 0x4a3a2e,
    hw: 1.0, hl: 1.85, height: 1.82, note: 'Rollers of solid rock, a frame of logs and a hide to keep the sun off.',
    maxSpeed: 22, accel: 6, agility: 0.9, crossing: 0.8, health: 220, mass: 2.2, sound: 'junker' },
  { id: 'skiplorry', name: 'Skip Lorry', basedOn: 'Leyland Roadrunner skip loader (1980s)', model: 'skiplorry', color: 0xf0c020, evilColor: 0x3f5a3a,
    hw: 1.25, hl: 3.3, height: 3.05, note: 'It lifts a full skip off the kerb and drives off with it swinging on four chains.',
    maxSpeed: 24, accel: 6, agility: 0.9, crossing: 0.8, health: 300, mass: 3.0, sound: 'sixbysix' },
];
