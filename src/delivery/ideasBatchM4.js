// ============================================================================
// The car ideas' batch M4 (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free). Three working vehicles: a logging truck, a fuel tanker and a combine harvester. Models:
// render/ideaModelsBatchM4.js. Lamps: render/carlights-batchM4.js. CHECKLIST item 523.
// The Combine Harvester is held to the ideas' 3 m width cap (a real header is 6 to 12 m wide): its header is the cap's
// width and its body a little narrower than the real machine's, at its real length and height.
// ============================================================================
export const IDEAS_BATCH_M4 = [
  { id: 'logtruck', name: 'Log Truck', basedOn: 'Western Star 4900 logging truck', model: 'logtruck', color: 0x2f5d3a, evilColor: 0x8e2f1f,
    hw: 1.45, hl: 5.0, height: 3.4, note: 'A long bonnet up front and a whole stand of trees stacked behind it.',
    maxSpeed: 26, accel: 6, agility: 0.8, crossing: 0.9, health: 340, mass: 3.2, sound: 'sixbysix' },
  { id: 'fueltanker', name: 'Fuel Tanker', basedOn: 'Volvo FM rigid fuel tanker', model: 'fueltanker', color: 0xf2f2ee, evilColor: 0x1d1e22,
    hw: 1.4, hl: 4.5, height: 3.2, note: 'A tank full of the one thing nobody wants spilled, and diamonds on every side to say so.',
    maxSpeed: 27, accel: 6, agility: 0.85, crossing: 0.8, health: 300, mass: 3.0, sound: 'sixbysix' },
  { id: 'combine', name: 'Combine Harvester', basedOn: 'Claas Lexion combine harvester', model: 'combine', color: 0x8db63c, evilColor: 0x8c1c1c,
    hw: 1.5, hl: 4.1, height: 3.7, note: 'It eats a field a row at a time, and the road is just the way to the next one.',
    maxSpeed: 22, accel: 5, agility: 0.75, crossing: 1, health: 360, mass: 3.4, sound: 'sixbysix' },
];
