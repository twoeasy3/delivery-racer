// ---- car ideas, batch M3 (spread into ideas.js IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free). Models: render/ideaModelsBatchM3.js. Lamps: render/carlights-batchM3.js. CHECKLIST 517.
// The Soapbox Racer's `height` is its seat back's (0.7 m): an open cart with no roof, the driver's seat in it (no driver drawn).
// ============================================================================
export const IDEAS_BATCH_M3 = [
  { id: 'soapbox', name: 'Soapbox Racer', basedOn: 'soapbox-derby cart (1930s on)', model: 'soapbox', color: 0xc8964a, evilColor: 0x2a2626,
    hw: 0.56, hl: 1.03, height: 0.7, note: 'Planks, pram wheels and a rope to steer by: downhill is the only engine it has.',
    maxSpeed: 22, accel: 6, agility: 1.4, crossing: 0.2, health: 60, mass: 0.6, sound: 'mini' },
  { id: 'backhoe', name: 'Backhoe Loader', basedOn: 'JCB 3CX backhoe loader (1980s on)', model: 'backhoe', color: 0xf0b414, evilColor: 0x4a5058,
    hw: 1.2, hl: 2.85, height: 3.2, note: 'A shovel on the front, a digger on the back and a cab in the middle to argue with both.',
    maxSpeed: 22, accel: 5, agility: 0.9, crossing: 0.9, health: 280, mass: 2.6, sound: 'sixbysix' },
  { id: 'cartransporter', name: 'Car Transporter', basedOn: 'rigid two-deck car transporter lorry (1990s)', model: 'cartransporter', color: 0x2a5aa8, evilColor: 0x9a1e1e,
    hw: 1.28, hl: 5.4, height: 3.5, note: 'Four new cars on two decks, and every one of them still has to get there in one piece.',
    maxSpeed: 25, accel: 5, agility: 0.85, crossing: 0.8, health: 340, mass: 3.4, sound: 'sixbysix' },
];
