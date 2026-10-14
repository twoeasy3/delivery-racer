// ============================================================================
// The car ideas' batch D (ideas.js spreads it into IDEA_CARS; the same fields and rules as every idea there: placeholders,
// tierless and free, no stars). Ten cars (CHECKLIST 260's tier mix, approved by the owner on 14-Oct; the tier is only the
// design target: here every one is tierless). Models: render/ideaModelsD.js and ideaModelsD2.js. Lamps: render/carlights-d.js.
// T1 the Wedge Microcar, the Farm Tractor; T2 the Flatbed Truck, the Utility Moke; T3 the Half-Track, the Sprint Hatch;
// T4 the Autobahn Estate, the Fin Land Yacht; T5 the Trophy Truck, the Armoured Limo.
// (The brief's "Sprint Hatch (AE86-style)" would have duplicated the Panda Coupe, which IS a Toyota Sprinter Trueno AE86:
// the Sprint Hatch is drawn from the Honda CR-X (1987) instead, a small kammback hatch.)
// The Trophy Truck's `hw` is the lane's, not the real 2.4 m truck's (as the Wide Truck's).
// ============================================================================
export const IDEAS_D = [
  { id: 'flatbed', name: 'Flatbed Truck', basedOn: 'Ford F-600 flatbed (1970s)', model: 'flatbed', color: 0x2e6f9e, evilColor: 0x3b3f2a,
    hw: 0.97, hl: 2.9, height: 2.4, note: 'A bare deck with low boards and whatever is piled on it.',
    maxSpeed: 24, accel: 8, agility: 0.85, crossing: 0.6, health: 170, mass: 2.4, sound: 'keitruck' },
  { id: 'moke', name: 'Utility Moke', basedOn: 'Mini Moke (1964)', model: 'moke', color: 0x58b8d6, evilColor: 0x6b2f5e,
    hw: 0.72, hl: 1.55, height: 1.3, note: 'A flat tray on little wheels: no doors, no roof, no fuss.',
    maxSpeed: 24, accel: 9.5, agility: 1.3, crossing: 0.8, health: 90, mass: 0.9, sound: 'mini' },
  { id: 'halftrack', name: 'Half-Track', basedOn: 'M3 half-track (1941)', model: 'halftrack', color: 0x6e7b3c, evilColor: 0xb09560,
    hw: 1.1, hl: 3.0, height: 2.1, note: 'Wheels at the front, tracks at the back: it climbs what others drive round.',
    maxSpeed: 30, accel: 9, agility: 0.8, crossing: 1, health: 280, mass: 3, sound: 'sixbysix' },
  { id: 'sprinthatch', name: 'Sprint Hatch', basedOn: 'Honda CR-X (1987)', model: 'sprinthatch', color: 0xd9322e, evilColor: 0x222a44,
    hw: 0.84, hl: 1.85, height: 1.27, note: 'Short, low and light: it will go sideways whenever asked.',
    maxSpeed: 36, accel: 15, agility: 1.5, crossing: 0.3, health: 90, mass: 0.9, sound: 'miata' },
  { id: 'autobahnestate', name: 'Autobahn Estate', basedOn: 'Audi RS2 Avant (1994)', model: 'autobahnestate', color: 0x1f4fa8, evilColor: 0xcfd2d6,
    hw: 0.89, hl: 2.3, height: 1.42, note: 'A family load space and a sprinter\'s engine.',
    maxSpeed: 46, accel: 16, agility: 1.05, crossing: 0.4, health: 150, mass: 1.4, sound: 'wagon' },
  { id: 'finlandyacht', name: 'Fin Land Yacht', basedOn: 'Cadillac Eldorado Biarritz (1959)', model: 'finlandyacht', color: 0x7fd6c4, evilColor: 0x4a1d2d,
    hw: 1.0, hl: 2.85, height: 1.4, note: 'Chrome all the way round and tail fins taller than its roof is wide.',
    maxSpeed: 38, accel: 10, agility: 0.8, crossing: 0.2, health: 190, mass: 2.4, sound: 'hearse' },
  { id: 'trophytruck', name: 'Trophy Truck', basedOn: 'Ford F-150 Baja trophy truck', model: 'trophytruck', color: 0xf28a1c, evilColor: 0x23323f,
    hw: 1.2, hl: 2.5, height: 1.95, note: 'Long-travel springs, huge tyres and a desert it takes at full speed.',
    maxSpeed: 44, accel: 16, agility: 1, crossing: 0.9, health: 200, mass: 2, sound: 'rally' },
  { id: 'armouredlimo', name: 'Armoured Limo', basedOn: 'Cadillac One "The Beast" (2009)', model: 'armouredlimo', color: 0x3c4250, evilColor: 0xe7e7e2,
    hw: 1.0, hl: 3.05, height: 1.85, note: 'Doors as thick as a safe and glass you could not cut: a vault on wheels.',
    maxSpeed: 34, accel: 10, agility: 0.75, crossing: 0.3, health: 450, mass: 3.2, sound: 'hearse' },
];
