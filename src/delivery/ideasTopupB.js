// ---- car ideas, the top-up batch B (spread into ideas.js IDEA_CARS; the same fields as the others there) ----------
// Three working vehicles: a 1970s Luton removals van, a 1990s rear-loading bin lorry and a Philippine jeepney. Models:
// render/ideaModelsTopupB.js. Placeholder figures, as every idea's (no tier, no stars: the owner's proposed rating, 2 / 3 / 2,
// is noted here only, since an idea has no stars and scripts/.ideas-check.mjs holds them to none).
export const IDEAS_TOPUP_B = [
  { id: 'removalsvan', name: 'Removals Van', basedOn: 'Ford Transit Mk1 Luton (1970s)', model: 'removalsvan', color: 0xeeeeee, evilColor: 0x2c4a34,
    hw: 1.05, hl: 3.0, height: 3.0, note: 'More box than van: it takes the whole house in one load.',
    maxSpeed: 24, accel: 6.5, agility: 0.95, crossing: 0.6, health: 190, mass: 2.0, sound: 'postvan' },
  { id: 'refuselorry', name: 'Bin Lorry', basedOn: 'Dennis Eagle rear-loading refuse truck (1990s)', model: 'refuselorry', color: 0x2f7a3c, evilColor: 0xc4521a,
    hw: 1.15, hl: 3.6, height: 3.1, note: 'It stops at every gate on the street, and nothing pushes it around.',
    maxSpeed: 24, accel: 6, agility: 0.9, crossing: 0.8, health: 300, mass: 3.0, sound: 'sixbysix' },
  { id: 'jeepney', name: 'Jeepney', basedOn: 'Philippine jeepney (1950s on, from converted Willys jeeps)', model: 'jeepney', color: 0xf0c020, evilColor: 0x1c1c20,
    hw: 1.0, hl: 3.0, height: 2.2, note: 'Room for everyone, and plenty of paint to go round.',
    maxSpeed: 25, accel: 7, agility: 1.0, crossing: 0.6, health: 200, mass: 2.0, sound: 'suv' },
];
