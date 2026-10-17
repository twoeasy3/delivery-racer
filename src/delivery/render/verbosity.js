// VERBOSITY (the owner's setting, Options: Verbosity): which in-run messages are said. Display only: Message.say
// (messages.js, outside the replay fingerprint) asks shows() and says nothing for a message this level hides. A lookup,
// no per-frame work. Documented in src/delivery/VERBOSITY.md. RE-TAG A MESSAGE HERE (TAGS, IMPORTANT_ZONES).
//   veryLow  no reactions, no location messages, no cash pickups, no gimmick warnings but the Bullet Train and the ambulance
//   low      no reactions, only the IMPORTANT location messages (those that warn of something real on the road)
//   medium   no reactions
//   high     everything (as it was): the default, and an old save's
export const VERBOSITY_LEVELS = ['veryLow', 'low', 'medium', 'high'];
export const VERBOSITY_NAMES = { veryLow: 'Very low', low: 'Low', medium: 'Medium', high: 'High' };

// what a message is, by 'group.key' (messages.json) or by its whole group; untagged: always said
//   reaction  a driver's reaction            location  a zone's welcome (important or not: IMPORTANT_ZONES)
//   cash      a cash pickup's "$n"           warning   a gimmick warned of (keep: warned of at every level)
const W = 'warning';
export const TAGS = {
  reactions: 'reaction',
  zones: 'location',
  'events.tunnel': 'location', // ("Tunnel! Lights on.": a place, nothing to do)
  'powerups.cashBonus': 'cash',
  'events.emergency': 'keep', 'events.trainAhead': 'keep', 'events.trainBehind': 'keep', // (the ambulance and the Bullet Train)
  ...Object.fromEntries(['pursuit', 'speedCameraAhead', 'procession', 'crossing', 'fog', 'radiation', 'radiationHigh', 'infectedCar',
    'schoolCrossing', 'waterMain', 'standingWater', 'wetFloor', 'tunnelJunction', 'deadEnd', 'laneShift', 'laneClosed', 'contraflow',
    'pillars', 'ladle', 'slowPad', 'balloon', 'drawbridge', 'wideLoad', 'jackknife', 'stampede', 'crosswind', 'lowBridgeFits',
    'lowBridgeTall', 'fordFits', 'fordDeep', 'floodFits', 'floodDeep', 'cushions', 'blackIce', 'ruts', 'tarAhead', 'spray', 'lowSun',
    'dust', 'washboard', 'jamAhead', 'jamCleared', 'wrongWay', 'parade', 'roadblock', 'cargo', 'iceCream', 'reversible', 'wave', 'turf',
    'battle', 'driveBy'].map(k => ['events.' + k, W])),
};
// the zone welcomes that warn of something real (a hazard, a camera, a train, a way round); the rest are names only
export const IMPORTANT_ZONES = new Set(['pocketLilyLane', 'mallFashion', 'mallFoodCourt', 'swMeltShop', 'swSidings', 'metroTunnelA',
  'metroBoreB', 'mulgaSiding', 'emuCreek', 'wheatSiding', 'saltbushPub', 'ironbarkRidge', 'ghostGumSiding', 'railhead', 'ousley', 'gois',
  'savanna', 'kopjes', 'river', 'plains', 'headland', 'cliffs', 'causeway', 'cameraRow', 'cameraHill', 'retailPark', 'theParade',
  'lastJam', 'cornStreet', 'marketSquare', 'churchRow', 'townPark', 'cattleMarket', 'zoneGate', 'zonePylons', 'zonePlant', 'zoneVillage',
  'hhWoods']);

// the level in use (render/device.js sets it from the save; 'high' until then, and on a page without the menu)
export const Verbosity = { level: 'high' };
const RANK = { veryLow: 0, low: 1, medium: 2, high: 3 };

export const shows = (group, key) => {
  const at = RANK[Verbosity.level] ?? 3;
  if (at === 3) return true;
  const tag = TAGS[group + '.' + key] || TAGS[group];
  if (!tag || tag === 'keep') return true;
  if (tag === 'reaction') return false; // (every level below High)
  if (at === 2) return true;
  if (tag === 'location') return at === 1 && group === 'zones' && IMPORTANT_ZONES.has(key);
  return at === 1; // (cash and warnings: Low and up)
};
