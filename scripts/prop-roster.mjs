// The PROP ROSTER: every car a player can drive or own, built as the showroom builds it (render/showcar.js makeShowCar), with the group it
// is in. Shared by scripts/prop-anchors.mjs (the generator), scripts/.propanchors-check.mjs and scripts/.proptag-check.mjs (CHECKLIST 300).
// Traffic-only kinds and the plain box traffic car are out of scope (they never wear the player's cosmetics). Keyed by CAR ID: a Super
// (its body kit adds a wing and roof lamps), a Legendary and an earned reskin each get a row of their own.
//   roster(C, IDEA_CARS) -> [{ group, car }]   groups: garage, super, filler, earned, legendary, bespoke, event, secret, level, idea
export const roster = (C, IDEA_CARS) => {
  const cars = [], seen = new Set();
  const add = (group, car) => { if (car && !seen.has(car.id)) { seen.add(car.id); cars.push({ group, car }); } };
  for (const car of C.CARS) add('garage', car);
  for (const car of C.CARS) add('super', C.superOf(car));
  for (const car of C.FILLER_CARS) add('filler', car);
  for (const car of C.EARNED_CARS) add(car.legend ? 'legendary' : 'earned', car);
  for (const car of C.BESPOKE_CARS) add('bespoke', car);
  for (const car of C.EVENT_CARS) add('event', car);
  for (const car of Object.values(C.SECRET_CARS)) add('secret', car);
  for (const car of Object.values(C.LEVEL_CARS)) add('level', car);
  add('level', C.AMPHIBIOUS_TANK);
  for (const car of IDEA_CARS) add('idea', car);
  return cars;
};
// the contact sheets' groups (scripts/prop-anchors.mjs --sheets): about 12 to 20 cars a sheet
export const sheetGroups = (cars) => {
  const sheets = [];
  const tier = (car) => car.tier || 0;
  const byTier = (name, list) => {
    for (const t of [1, 2, 3, 4, 5]) { const ofTier = list.filter(c => tier(c.car) === t); if (ofTier.length) sheets.push([name + '-T' + t, ofTier]); }
    const rest = list.filter(c => !tier(c.car) || tier(c.car) > 5);
    if (rest.length) sheets.push([name + '-other', rest]);
  };
  byTier('garage', cars.filter(c => c.group === 'garage'));
  byTier('super', cars.filter(c => c.group === 'super'));
  byTier('filler', cars.filter(c => c.group === 'filler'));
  sheets.push(['earned-legend', cars.filter(c => c.group === 'earned' || c.group === 'legendary')]);
  sheets.push(['bespoke-concept', cars.filter(c => c.group === 'bespoke')]);
  sheets.push(['event-special', cars.filter(c => ['event', 'secret', 'level'].includes(c.group))]);
  const ideas = cars.filter(c => c.group === 'idea');
  for (let i = 0; i < ideas.length; i += 18) sheets.push(['ideas-' + (i / 18 + 1), ideas.slice(i, i + 18)]);
  return sheets;
};
