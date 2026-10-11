// ============================================================================
// LEVEL INFO - what the menu says of a level besides its name: the medal a best time earns, which
// gimmicks the level has (read off its fields: see the top of levels.js), and what is on its road: the
// pickups laid out, the vehicles that turn up, the rules of the road. No drawing here: the stage is
// render/menustage.js, and the "what's on this road" card render/levelcard3d.js.
// ============================================================================
import { CONFIG } from './config.js';
import { CARS, LEVEL_CARS } from './cars.js';
import { nameOf, blurbOf } from './words.js';

// The medal for delivering a level with `spare` s on the clock, on a side: 'gold', 'silver', 'bronze' (any
// delivery on time), or null (not delivered). A level's clock is a clean run in the reference car times
// CONFIG.clock's factor for the side, so that run would leave clock x (1 - 1 / factor) to spare; silver and
// gold are shares of that (CONFIG.medals), which a better car than the reference one can beat.
export const medalFor = (level, evil, spare) => {
  if (typeof spare !== 'number') return null;
  const clock = level.clock?.[evil ? 'evil' : 'good'] ?? 0;
  const clean = clock * (1 - 1 / CONFIG.clock[evil ? 'evil' : 'good']);
  return spare >= clean * CONFIG.medals.gold ? 'gold' : spare >= clean * CONFIG.medals.silver ? 'silver' : 'bronze';
};
// the time to spare a medal asks for (s), to say what the next one would take
export const medalNeeds = (level, evil, medal) => {
  const clock = level.clock?.[evil ? 'evil' : 'good'] ?? 0;
  return medal === 'bronze' ? 0 : clock * (1 - 1 / CONFIG.clock[evil ? 'evil' : 'good']) * CONFIG.medals[medal];
};

// every gimmick a level can have: its name on the menu, and how to tell that a level has it. In the order
// they are listed on a card: the ones that make a level what it is first
const some = (list) => Array.isArray(list) ? list.length > 0 : !!list;
const GIMMICKS = [
  ['Amphibious cars only', (l) => l.amphibious],
  ['Water stages', (l) => some(l.water)],
  ['Boats', (l) => some(l.water) && Object.keys(l.traffic || {}).some(kind => CONFIG.vehicles[kind]?.boat)],
  ['Currents', (l) => (l.water || []).some(w => w.current)],
  ['Race', (l) => l.laps],
  ['Rival couriers', (l) => l.rival],
  ['Battle', (l) => l.battle],
  ['Asteroids', (l) => some(l.asteroidFields)],
  ['Hurricane', (l) => some(l.storm)],
  ['Rising tide', (l) => some(l.tide)],
  ['Tunnels', (l) => some(l.tunnels)],
  ['Bullet train', (l) => l.railway],
  ['Gunfire', (l) => some(l.gunfire)],
  ['Hippos', (l) => some(l.hippos)],
  ['Elephants', (l) => some(l.elephants)],
  ['Migration', (l) => some(l.migration)],
  ['Falling wreckage', (l) => (l.wreckage || []).some(w => w.kind !== 'blast' && w.kind !== 'boulders')],
  ['Blasts', (l) => (l.wreckage || []).some(w => w.kind === 'blast')],
  ['Boulders', (l) => (l.wreckage || []).some(w => w.kind === 'boulders')],
  ['Rockfall', (l) => some(l.rockfall)],
  ['Machinery', (l) => some(l.machinery) || some(l.siteWorks)],
  ['Dancing portaloos', (l) => some(l.potties)],
  ['Parade', (l) => some(l.parades)],
  ['Roadblock', (l) => some(l.roadblocks)],
  ['Reversible lane', (l) => some(l.reversible)],
  ['Convoys', (l) => l.convoys],
  ['Falling cargo', (l) => l.traffic?.cargotruck > 0],
  ['Ice-cream stop', (l) => some(l.iceCreamStops)],
  ['Burst water mains', (l) => some(l.waterMains)],
  ['Speed cameras', (l) => some(l.cameras)],
  ['Level crossing', (l) => some(l.crossings)],
  ['Roadworks', (l) => some(l.stopGo)],
  ['Drawbridge', (l) => some(l.drawbridges)],
  ['School crossing', (l) => some(l.schoolCrossings)],
  ['Wide load', (l) => some(l.wideLoads)],
  ['Balloon', (l) => some(l.balloons)],
  ['Marathon', (l) => some(l.marathons)],
  ['Trolleys', (l) => some(l.trolleys)],
  ['Stampede', (l) => some(l.stampedes)],
  ['Crosswind', (l) => some(l.crosswinds)],
  ['Ramp over the jam', (l) => some(l.jamRamps)],
  ['Washboard dirt', (l) => some(l.washboards)],
  ['Low bridge', (l) => some(l.lowBridges)],
  ['Ford', (l) => some(l.fords) && l.fords.some(f => !f.fills)],
  ['Flooded underpass', (l) => some(l.fords) && l.fords.some(f => f.fills)],
  ['Dust trail', (l) => some(l.dust)],
  ['Low sun', (l) => some(l.lowSun)],
  ['Truck spray', (l) => some(l.spray)],
  ['Fresh tarmac', (l) => some(l.tarmac)],
  ['Ruts', (l) => some(l.ruts)],
  ['Black ice in the shade', (l) => some(l.shade)],
  ['Speed cushions', (l) => some(l.cushions)],
  ['Crest jumps', (l) => l.segments.some(seg => seg.ease && seg.grade)],
  ['Cyclists', (l) => some(l.pelotons)],
  ['Funerals', (l) => l.processions],
  ['Ambulances', (l) => l.emergencies],
  ['Police pursuit', (l) => l.pursuits],
  ['Fog', (l) => some(l.fog)],
  ['Ice', (l) => some(l.ice)],
  ['Mud', (l) => some(l.mud)],
  ['Potholes', (l) => some(l.potholes)],
  ['Frogs', (l) => some(l.frogs)],
  ['Drop bears', (l) => some(l.dropBears)],
  ['Animals', (l) => some(l.herds)],
  ['Tractors', (l) => some(l.tractors)],
  ['Roaming junk', (l) => some(l.drifters)],
  ['Crossroads', (l) => some(l.junctions)],
  ['Side roads', (l) => some(l.exits)],
  ['Bridges', (l) => some(l.bridges)],
  ['One-way', (l) => l.flow === 'north'],
  ['All oncoming', (l) => l.flow === 'south'],
];
// the names of the gimmicks a level has
export const levelGimmicks = (level) => GIMMICKS.filter(([, has]) => has(level)).map(([name]) => name);

// ---- what is on a level's road (the menu's "what's on this road" card) ---------------------------------
// The rules of the road, in a few words each: the ones among the gimmicks above that are no thing to show a
// model of, and what the level's own fields add (the side driven on, a limit, laps, no throwing)
const RULES = new Set(['Amphibious cars only', 'Currents', 'One-way', 'All oncoming']);
export const levelNotes = (level) => [
  ...levelGimmicks(level).filter(name => RULES.has(name)),
  ...(level.drive === 'left' ? ['Drive on the left'] : []),
  ...(level.speedLimit ? [level.speedLimit + ' km/h limit'] : []),
  ...(level.laps ? [level.laps + ' laps'] : []),
  ...(level.noPackages ? ['No packages'] : []),
  ...(level.battle || level.alwaysGood ? ['Always Good'] : []),
];

// The pickups a level has, by type, the commonest first: the ones laid out on it (its "pickups") and the ones
// its tide washes up; 'target' last if it has TANK RAGE targets. (A 'mystery' among them is one of mysteryPool)
export const levelPickups = (level) => {
  const counts = {};
  for (const p of level.pickups || []) counts[p.type] = (counts[p.type] || 0) + 1;
  for (const type of Object.keys(level.tide?.washUp?.types || {})) counts[type] = counts[type] || 0.5;
  return [...Object.keys(counts).sort((a, b) => counts[b] - counts[a]), ...(level.targets?.length ? ['target'] : [])];
};
// what a mystery pickup can turn out to be (CONFIG.mystery: the second pool is not drawn from)
export const mysteryPool = () => CONFIG.mystery.effects;

// The vehicles on a level, each once: [{ kind, role }], kind a key of CONFIG.vehicles (or 'ufo', 'jetboat': a
// level's own vehicle) and role 'drive' (what the player is put in: a level's "car"), 'grid' (the cars raced
// in and against), 'traffic' (its "traffic", the commonest first) or 'zone' (only on some stretch: its "trafficZones").
// The timed events (ambulances, a police pursuit, funerals, convoys) are gimmicks with cards of their own.
export const levelTraffic = (level) => {
  const list = [], seen = new Set();
  const add = (kind, role) => { if (kind && !seen.has(kind)) { seen.add(kind); list.push({ kind, role }); } };
  const raced = level.grid && !level.grid.rival; // (a race: the player and the grid in the same cars)
  if (level.car) add(level.car, raced && level.grid.kind === level.car ? 'grid' : 'drive');
  if (raced) add(level.grid.kind, 'grid');
  const mix = Object.entries(level.traffic || {}).filter(([, weight]) => weight > 0).sort((a, b) => b[1] - a[1]);
  for (const [kind] of mix) add(kind, 'traffic');
  for (const zone of level.trafficZones || []) for (const [kind, weight] of Object.entries(zone.traffic || {})) if (weight > 0) add(kind, 'zone');
  if (level.tractors?.length) add('tractor', 'traffic');
  return list;
};
// A vehicle kind's name and a line about it as traffic. The garage's cars (and the levels' own vehicles) are
// named by cars.js (and carText.json); the rest, and whatever has a way of its own on the road, here (the wording
// follows CONFIG.vehicles' notes). trafficText.json comes first for both (words.js): this table is its fallback
const GARAGE_LINE = 'One of the garage\'s cars out as traffic: it cruises near its own top speed.';
const AMPHIBIOUS_LINE = 'Amphibious traffic: down the slipway, across the water and out the far side, slower afloat.';
const VEHICLES = {
  commuter: [null, 'The everyday small car, at the level\'s own pace.'],
  darkvan: ['Panel van', 'The everyday van, at the level\'s own pace: bigger and heavier than a commuter.'],
  van: ['Delivery van', 'A vintage delivery van in its one livery. Never evil.'],
  bus: ['City bus', 'Long and heavy, and slower than the cars round it. Never evil.'],
  tractor: ['Tractor', 'Slow traffic that sets off from the same spot every run.'],
  police: ['Police car', 'Bump it, or use the shoulder while it is near, and you are busted.'],
  semi: ['18-wheeler', 'Keeps to the kerb lane and runs fast whatever the level\'s pace. It never spins out: hit hard enough, it wobbles, then blows up.'],
  cargotruck: ['Cargo truck', 'An 18-wheeler with its back doors swung open and its load showing, which comes off the back as it goes.'],
  f1: [null, 'What you and the whole grid race in: Formula 1 cars, light, quick and nimble.'],
  gt: [null, 'What you and the whole grid race in: GT road cars, heavier than an F1 car, and tougher.'],
  lmp: [null, 'What you and the whole grid race in: Le Mans prototypes, the toughest of the three, and they never spin out.'],
  boat: ['Cruiser', 'A cruiser like your jetboat. It leaves a wake.'],
  trawler: ['Trawler', 'A fishing trawler, big and slow.'],
  dinghy: ['Dinghy', 'A dinghy with an outboard, quick and light. On the water only.'],
  barge: ['Barge', 'Long, wide, heavy and slow: something to slip round. On the water only.'],
  ferry: ['Ferry', 'Big and steady. On the water only.'],
  pedalo: ['Pedal boat', 'Hardly moving. On the water only.'],
  icecream: ['Ice-cream van', 'Slow, pink, and never evil.'],
  binlorry: ['Bin lorry', 'Pulls up where it is every few seconds, hazards on.'],
  learner: ['Learner driver', 'Hesitates all the time: dabs of the brakes, drifting about its lane.'],
  boyracer: ['Boy racer', 'Fast, and it sits on your bumper.'],
  caravan: ['Caravan', 'A car towing a caravan, which swings about behind it.'],
  driveby: ['Drive-by car', 'Only ever evil, and out for trouble.'],
  rickshaw: ['Auto-rickshaw', 'Small, slow, nimble and flimsy.'],
  float: ['Parade float', 'A long flatbed under a tower of colour, at a crawl. Never evil, never spun.'],
  jeep: ['Jeep', 'The lightest of the armies\' vehicles: it loses a head-on with anything bigger.'],
  apc: ['8x8', 'An armoured carrier: it wins a head-on with a jeep and loses one with a tank.'],
  tank: ['Tank', 'Wins every head-on. Only its health, or a mine, finishes it.'],
  ambulance: ['Ambulance', 'Only ever an emergency vehicle, siren going.'],
  getaway: ['Getaway car', 'Flat out, with the law behind it.'],
  interceptor: ['Police interceptor', 'After the getaway car, siren going.'],
};
// every kind this table names (trafficText.json has one entry for each: scripts/.words-check.mjs)
export const TRAFFIC_KINDS = Object.keys(VEHICLES);
export const vehicleInfo = (kind, role = 'traffic') => {
  const car = LEVEL_CARS[kind] || CARS.find(c => c.id === kind), type = CONFIG.vehicles[kind], [name, line] = VEHICLES[kind] || [];
  // (a garage car in traffic is told by its own line in carText.json; GARAGE_LINE only if it has none)
  const own = line || (type?.amphibious ? AMPHIBIOUS_LINE : car ? blurbOf('car', car.id, GARAGE_LINE) : 'Traffic.');
  return {
    name: nameOf('traffic', kind, name || car?.name || kind[0].toUpperCase() + kind.slice(1)),
    // (what you drive here is a rule of the level, said whatever the thing's own line)
    line: role === 'drive' ? 'What you drive on this level, whatever is in the garage.' : blurbOf('traffic', kind, own),
    // (its paint on a tile: the one livery it has, or the garage car's, or left to whoever draws it)
    color: type?.livery ?? car?.color ?? null,
  };
};
