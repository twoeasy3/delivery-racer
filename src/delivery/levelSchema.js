// ============================================================================
// THE LEVEL SCHEMA - one description of every field a level's .json can have (the fields documented at the
// top of levels.js): its shape, its settings (each with a type, a range, a default, its choices), which road
// it may be on, the rules it must keep, and a line of help. The level editor (editor.js) builds its forms,
// its place-buttons, its default entries and its map drawing from this, and scripts/.schema-check.mjs holds
// every level in ./levels to it. Only data and plain functions of a level: nothing is drawn here, and nothing
// is read from the loaded Track (the rules work the road out from the level's own segments).
//
// TO ADD A FIELD: add one entry to FIELDS below (and its documentation to levels.js, as ever). That is all the
// editor needs: the entry's `shape` says how it is placed, its `settings` what its form has.
//   shape     'flag' | 'number' | 'text' | 'choice'   one value
//             'object'      one { } of settings                    'timed'   one { every: { min, max }, ... }
//             'mix'         { kind: weight }                        'list'    [{ ... }], not placed anywhere
//             'stretch'     [{ from, to, ... }] along the road      'point'   [{ s, ... }] at a spot on it
//             'world'       [{ x, z, ... }] in the world, beside the road
//   single    true = one entry, not a list of them (a level's "tide", "storm", "tower", "runway")
//   ends      a stretch's two keys, if not ['from', 'to'] (an exit's exitAt and mergeAt)
//   pos       a point's key, if not 's' (wreckage's "at", a runway's "from")
//   group     where it is listed in the editor (GROUPS)
//   label     its name in the editor; help: a line about it
//   road      'both' = it can be on a side road too ({ road: 'side', exit: n }); left out, the expressway only
//   rules     the ids of the RULES it must keep (straight road only, level road only, two-way only...)
//   span      m long a new stretch is (150 if not said); minSpan: the least it may be
//   trigger   { setting?, default }: where the player sets it off: `setting` m (or the default) short of it
//   settings  { name: { type, label, ... } }, each one of:
//             number  min, max, step, int      choice  choices: [value] or [{ value, label }]
//             flag    text    colour           range   { min, max }: its own min, max, step
//             lane    a lane number (shoulders: true = or 'left' / 'right'; player: true = the player's side only)
//             lanes   lane numbers: a list, or (span: true) [first, last]; width: n = exactly n lanes wide
//             mix     { kind: weight } over `choices`          metres  another spot along the same road
//             object  { settings }                              list    [{ settings }] or (item) [value]
//             json    anything (the editor shows it as JSON)
//           and  required: true (it must be there)  init: what a new entry is given  default: what the game
//           takes it as when it is left out (shown greyed)  when: (entry) => whether it applies  help
// ============================================================================
import { CONFIG } from './config.js';
import { THEMES } from './themes.js';
import { CARS, LEVEL_CARS } from './cars.js';
import { CARGO } from './cargo.js';

// ---- the kinds the game has no table of its own for: these are the lists (render/pickupModels.js has a colour
// and a model for every pickup type: scripts/.schema-check.mjs checks the two agree)
export const PICKUP_TYPES = ['turbo', 'ghost', 'wrench', 'passenger', 'mystery', 'radarDetector', 'siren', 'badGas', 'heavyMass', 'timePlus', 'timeMinus',
  'cash5', 'cash10', 'cash20', 'armour', 'bigSplash', 'butterfingers'];
export const DRIFT_PATTERNS = ['circle', 'zigzag', 'sweep', 'figure8', 'dart'];
export const POTTY_DANCES = ['hop', 'wave', 'slide', 'shuffle', 'stomp', 'spin'];
export const HERD_KINDS = ['cow', 'kangaroo'];
export const MIGRATION_KINDS = ['wildebeest', 'zebra'];
export const MACHINERY_KINDS = ['bulldozer', 'excavator', 'dumpTruck', 'roller', 'forklift'];
export const SITE_KINDS = ['trench', 'excavator', 'workers', 'pipes'];
export const BRIDGE_STYLES = ['harbour', 'seacliff'];
export const ZONE_SCENERY = ['sydney', 'bush', 'ousley', 'seacliff', 'wollongong', 'shellharbour', 'kiama', 'marais', 'gois', 'noirmoutier', 'savanna', 'kopjes', 'river', 'plains'];
ZONE_SCENERY.push(...Object.values(THEMES).flatMap(theme => theme.sets || [])); // (and the sets of a theme with a file of its own: its "sets" in themes.js)
export const LANDMARK_KINDS = ['bay', 'flyer', 'mbs', 'esplanade', 'fullerton', 'merlion', 'padang', 'gardens', 'artscience', 'helix', 'float', 'cbd', 'suntec', 'gallery', 'domes',
  'river', 'basin', 'casino', 'biosphere', 'skyline', 'lake', 'oldStraight', 'stream', 'banking', 'hotel'];
// ...and the ones it has: read from its own tables, never copied
export const OBSTACLE_KINDS = Object.keys(CONFIG.obstacleKinds);
export const VEHICLE_KINDS = Object.keys(CONFIG.vehicles);
export const WRECKAGE_KINDS = Object.keys(CONFIG.wreckage.kinds);
export const THEME_NAMES = Object.keys(THEMES);
export const CAR_IDS = [...Object.keys(LEVEL_CARS), ...CARS.map(c => c.id)];
export const RACE_KINDS = ['f1', 'gt', 'lmp'].filter(k => LEVEL_CARS[k]);
const SIDES = ['left', 'right'];

// ---- how settings are written ----------------------------------------------------------------------
const num = (label, o = {}) => ({ type: 'number', label, ...o });
const int = (label, o = {}) => ({ type: 'number', int: true, step: 1, label, ...o });
const pick = (label, choices, o = {}) => ({ type: 'choice', label, choices, ...o });
const flag = (label, o = {}) => ({ type: 'flag', label, ...o });
const text = (label, o = {}) => ({ type: 'text', label, ...o });
const range = (label, o = {}) => ({ type: 'range', label, ...o });
const lane = (label = 'Lane', o = {}) => ({ type: 'lane', label, ...o });
const lanes = (label = 'Lanes', o = {}) => ({ type: 'lanes', label, ...o });
const side = (o = {}) => pick('Side', SIDES, { required: true, init: 'right', ...o });
const count = (init, o = {}) => int('How many', { min: 1, max: 400, required: true, init, ...o });
const every = (init, o = {}) => range('Every (s)', { min: 0.5, max: 600, step: 0.5, init, ...o });
const segmentSettings = {
  length: int('Length (m)', { min: 1, max: 20000, required: true, init: 300 }),
  curve: num('Curve (rad/m, + right)', { min: -0.2, max: 0.2, step: 0.0005, init: 0 }),
  grade: num('Slope (rise per m)', { min: -1, max: 1, step: 0.005 }),
  ease: num('Ease (m: a short one makes a crest)', { min: 2, max: 200, step: 1, default: CONFIG.gradeEase, help: 'How sharply this slope blends into the next. A steep climb and drop with 6 or so: a fast car flies over the top.' }),
};

// ---- the groups the editor lists fields in -----------------------------------------------------------
export const GROUPS = {
  basics: 'Level', road: 'Road', traffic: 'Traffic', events: 'Timed events', modes: 'Mode switches', race: 'Race and rivals', look: 'Weather and look',
  items: 'Pickups, obstacles and targets', shape: 'Stretches that change the road', sideRoads: 'Side roads and crossroads', zones: 'Zones',
  hazards: 'Hazards on the road', animals: 'Animals', works: 'Roadworks and machinery', police: 'Police and stops', scripted: 'Scripted events', scenery: 'Scenery and sights',
};

// ---- the rules -------------------------------------------------------------------------------------
// each: text (what the rule is) and broken(facts, entry, span): true if that entry, there, breaks it.
// facts: see roadFacts; span: [from, to] m along the expressway the entry takes up
export const RULES = {
  straight: { text: 'On straight road only', broken: (f, e, [a, b]) => e.road !== 'side' && !f.straight(a, b) },
  level: { text: 'On level road only (no hills)', broken: (f, e, [a, b]) => f.sloped(a, b) },
  twoWay: { text: 'Only on a two-way road', broken: (f) => f.oneWay },
  oneEachWay: { text: 'Only on a two-way road of one lane each way, with no median', broken: (f) => f.oneWay || f.left !== 1 || f.right !== 1 || f.median > 0 },
  noExits: { text: 'Not on a level with side roads (exits)', broken: (f) => f.exits > 0 },
  playerSide: { text: 'Needs a side of the road going the player\'s way', broken: (f) => f.flow === 'south' },
  twoLanes: { text: 'The player\'s side needs two lanes or more', broken: (f) => f.playerLanes < 2 },
  needsMedian: { text: 'Needs a median ("median")', broken: (f) => !(f.median > 0) },
  medianTwoWay: { text: 'Only a two-way road can have a median', broken: (f) => f.oneWay && f.median > 0 },
  amphibious: { text: 'Only on an amphibious level ("amphibious")', broken: (f) => !f.level.amphibious },
  noRailway: { text: 'Not on a level with a railway', broken: (f) => !!f.level.railway },
  clearOfExits: { text: 'Clear of every exit\'s ramps', broken: (f, e, [a, b]) => f.ramps.some(([c, d]) => a - 20 < d && c < b + 20) },
  clearOfEnds: { text: 'Clear of the start and the finish', broken: (f, e, [a, b]) => a < 20 || b > f.length - 20 },
  noBridge: { text: 'Not on a bridge (no shoulder there)', broken: (f, e, [a]) => (f.level.bridges || []).some(z => a >= z.from && a <= z.to) },
  noTide: { text: 'Not on a level with a tide', broken: (f) => !!f.level.tide },
  noFlyovers: { text: 'A one-way level\'s exits cannot have flyovers', broken: (f, e) => f.oneWay && !!e.flyovers },
  closedLoop: { text: 'The road must come back round to where it starts (a closed loop)', broken: (f) => !f.closed },
  battle: { text: 'Only with "battle"', broken: (f) => !f.level.battle },
  notRace: { text: 'Not on a race, nor the Battlefield', broken: (f) => !!(f.level.laps || f.level.battle || (f.level.grid && !f.level.grid.rival)) },
  zonesTheme: { text: 'Shown on a level whose theme is in zones (coast, safari)', broken: () => false },
};

// ---- the fields -------------------------------------------------------------------------------------
const C = CONFIG;
export const FIELDS = {
  // ---- the level ----
  id: { shape: 'text', group: 'basics', label: 'Id', required: true, help: 'Unique name: the level\'s key in saved progress. Keep it short.' },
  name: { shape: 'text', group: 'basics', label: 'Name', required: true, help: 'The level\'s name on the menu. (A built-in level keeps its name and description in levelText.json; the editor opens it with them, and a level downloaded from here carries its own.)' },
  // (required of a level as the editor holds it: one opened through levelText.js withWords. A built-in level's own file may leave name and description to levelText.json)
  description: { shape: 'object', group: 'basics', label: 'Description', help: 'A sentence or two about the level for the menu, one for each side (160 characters each at most). Good: a cheerful, careful courier\'s briefing. Evil: the same job, relished.',
    settings: { good: text('Good'), evil: text('Evil (left out on a level that is always Good)') } },
  clock: { shape: 'object', group: 'basics', label: 'Clock', required: true, help: 'Seconds on the clock for each side (scripts/level-clocks.mjs works them out from a clean run).',
    settings: { good: num('Good (s)', { min: 1, max: 100000, required: true, init: 150 }), evil: num('Evil (s)', { min: 1, max: 100000, required: true, init: 115 }) } },
  tip: { shape: 'number', group: 'basics', label: 'Tip ($)', min: 0, max: 100000, init: 50, help: 'The money earned for finishing before the clock reaches zero.' },
  theme: { shape: 'choice', group: 'look', label: 'Theme', choices: THEME_NAMES, default: 'city', help: 'The look of the ground, sky and roadside (themes.js). Rain, snow, night and an elevated road come with the theme.' },
  car: { shape: 'choice', group: 'basics', label: 'Car', choices: CAR_IDS, help: 'A vehicle the level is driven in whatever is in the garage. Left out: the garage\'s.' },
  cargo: { shape: 'object', group: 'basics', label: 'Cargo', help: 'What the player is delivering, for each side (only a sight). Left out, the level\'s place on the menu picks one.',
    settings: { good: pick('Good', CARGO.good.map(c => ({ value: c.id, label: c.name }))), evil: pick('Evil', CARGO.evil.map(c => ({ value: c.id, label: c.name }))) } },

  // ---- the road ----
  segments: { shape: 'list', group: 'road', label: 'Segments', required: true, custom: 'segments', help: 'The expressway\'s shape: each a length, a curve and a slope.', settings: segmentSettings },
  drive: { shape: 'choice', group: 'road', label: 'Drive on the', choices: ['right', 'left'], default: 'right', help: 'The side the traffic keeps to. The level is written as if driving on the right; a left-hand level is shown as its mirror image.' },
  lanes: { shape: 'number', group: 'road', label: 'Lanes', custom: 'lanes', int: true, min: 1, max: 12, default: C.laneCount,
    help: 'A number (half each side, an odd one over on the right), or how many go the player\'s way (north) and how many come the other way (south).',
    alt: { settings: { north: int('The player\'s way', { min: 0, max: 8, required: true, init: 2 }), south: int('Oncoming', { min: 0, max: 8, required: true, init: 2 }) } } },
  median: { shape: 'number', group: 'road', label: 'Median (lanes wide)', int: true, min: 0, max: 4, default: 0, rules: ['medianTwoWay'], help: 'Neutral lanes down the middle of a two-way road, which no traffic uses.' },
  shoulder: { shape: 'number', group: 'road', label: 'Shoulder (m)', min: 0, max: 20, step: 0.5, default: C.shoulder, help: 'Metres of shoulder each side (a street circuit\'s walls close by).' },
  shoulderTimer: { shape: 'choice', group: 'road', label: 'Shoulder danger timer', choices: [{ value: false, label: 'off: drive on it freely' }, { value: 'mud', label: 'off in mud only' }], default: true, defaultLabel: 'on',
    help: 'Off: the shoulders can be driven on freely, and the police don\'t bust for it.' },
  speedLimit: { shape: 'number', group: 'road', label: 'Speed limit (km/h)', min: 10, max: 400, step: 5, default: C.speedCamera.limit, help: 'The limit at the level\'s speed cameras, where a camera doesn\'t say.' },
  laps: { shape: 'number', group: 'race', label: 'Laps', int: true, min: 1, max: 99, rules: ['closedLoop'], help: 'A race round a circuit: the road must come back round to where it starts, facing the same way.' },
  flow: { shape: 'choice', group: 'traffic', label: 'Traffic flow', choices: [{ value: 'north', label: 'all the player\'s way' }, { value: 'south', label: 'all oncoming' }, { value: 'mixed', label: 'mixed: both ways in every lane' }],
    defaultLabel: 'two-way', help: 'Left out, the left half of the road is oncoming.' },

  // ---- traffic ----
  traffic: { shape: 'mix', group: 'traffic', label: 'Traffic mix', choices: VEHICLE_KINDS, required: true, help: 'Which vehicles turn up and how often, relative to each other. None at all: no traffic. Keep the police light (about 0.03 to 0.04).' },
  trafficCount: { shape: 'number', group: 'traffic', label: 'Vehicles the player\'s way', int: true, min: 0, max: C.trafficPool, default: C.trafficCount, help: 'How many are about at once (with the oncoming ones, no more than ' + C.trafficPool + ').' },
  oncomingCount: { shape: 'number', group: 'traffic', label: 'Vehicles oncoming', int: true, min: 0, max: C.trafficPool, default: C.oncomingCount, help: 'How many are about at once, the other way.' },
  trafficSpeed: { shape: 'object', group: 'traffic', label: 'Traffic speed (m/s)', help: 'The speeds the traffic cruises at.',
    settings: { min: num('Slowest', { min: 1, max: 120, required: true, init: C.trafficMinSpeed ?? 14 }), max: num('Fastest', { min: 1, max: 120, required: true, init: C.trafficMaxSpeed ?? 22 }) } },
  drivers: { shape: 'object', group: 'traffic', label: 'Drivers', help: 'The share of drivers that are evil, and the chance a driver starts out happy or angry.',
    settings: { evil: num('Evil (share)', { min: 0, max: 1, step: 0.05, default: C.evilShare }), happy: num('Happy (chance)', { min: 0, max: 1, step: 0.05 }), angry: num('Angry (chance)', { min: 0, max: 1, step: 0.05 }),
      goodMood: { type: 'object', label: 'Good drivers\' moods', settings: { happy: num('Happy', { min: 0, max: 1, step: 0.05 }), angry: num('Angry', { min: 0, max: 1, step: 0.05 }) } },
      evilMood: { type: 'object', label: 'Evil drivers\' moods', settings: { happy: num('Happy', { min: 0, max: 1, step: 0.05 }), angry: num('Angry', { min: 0, max: 1, step: 0.05 }) } } } },
  hesitation: { shape: 'flag', group: 'traffic', label: 'Traffic hesitates', default: true, help: 'Off: traffic too fast for the player never hesitates, and none comes up from behind.' },

  // ---- timed events ----
  emergencies: { shape: 'timed', group: 'events', label: 'Ambulances', help: 'Now and then an ambulance comes through, siren going, either way. Not on a level with water.', settings: { every: every({ min: 30, max: 60 }, { required: true }) } },
  processions: { shape: 'timed', group: 'events', label: 'Funeral processions', help: 'Now and then a hearse and its cars, slow, nose to tail. Not on a level with water.', settings: { every: every({ min: 40, max: 70 }, { required: true }) } },
  convoys: { shape: 'timed', group: 'events', label: 'Convoys', help: 'Now and then a convoy of one kind nose to tail in one lane, shutting their gaps in the player\'s face. Not on a level with water.',
    settings: { every: every({ min: 20, max: 35 }, { required: true }), size: int('Vehicles', { min: 2, max: 20, default: C.convoy?.size }), kind: pick('Kind', VEHICLE_KINDS, { default: C.convoy?.kind }) } },
  pursuits: { shape: 'timed', group: 'events', label: 'Police pursuits', rules: ['playerSide', 'notRace'], help: 'Now and then a getaway car comes through from behind flat out, an interceptor after it, siren going; the traffic pulls aside and the two drive on.',
    settings: { every: every({ min: 30, max: 60 }, { required: true }) } },
  railway: { shape: 'timed', group: 'events', label: 'Railway down the median', rules: ['needsMedian'], help: 'A bullet train comes through, against the player, every so often.', settings: { every: every({ min: 14, max: 24 }, { required: true }) } },

  // ---- mode switches ----
  alwaysGood: { shape: 'flag', group: 'modes', label: 'Always Good', help: 'The player is Good on it, whatever the side picked on the menu.' },
  amphibious: { shape: 'flag', group: 'modes', label: 'Amphibious level', help: 'It can only be started in an amphibious car. Water stages need it.' },
  noPackages: { shape: 'flag', group: 'modes', label: 'No packages', help: 'Nobody throws packages.' },
  understeer: { shape: 'flag', group: 'modes', label: 'Understeer', help: 'Every car understeers in bends as on ice (and none slows for a bend by itself).' },
  wallDamage: { shape: 'flag', group: 'modes', label: 'Wall damage', help: 'A car going sideways into the road\'s edge takes damage.' },
  nudge: { shape: 'flag', group: 'modes', label: 'Nudging', help: 'A car steering into another\'s side knocks it aside.' },
  helicopter: { shape: 'flag', group: 'modes', label: 'Helicopters drawn', default: true, help: 'Off: the rescue and police helicopters are not drawn (they still act).' },
  battle: { shape: 'flag', group: 'modes', label: 'Battlefield', help: 'Two armies at war down the road. Best with the flow "mixed".' },
  pillboxes: { shape: 'flag', group: 'modes', label: 'Pillboxes', rules: ['battle'], help: 'Pillboxes beside the road, half each army\'s, firing at the other\'s vehicles.' },

  // ---- race and rivals ----
  grid: { shape: 'object', group: 'race', label: 'Starting grid', help: 'A race: that many cars on a grid ahead of the player, each at its own share of the player\'s top speed.',
    settings: { count: int('Cars', { min: 1, max: 40, required: true, init: 11 }), kind: pick('Kind', [...new Set([...RACE_KINDS, ...VEHICLE_KINDS])], { required: true, init: 'f1' }),
      gap: num('Gap (m)', { min: 2, max: 100, required: true, init: 9 }), pace: range('Pace (share of top speed)', { min: 0.1, max: 2, step: 0.01, required: true, init: { min: 0.9, max: 1 } }),
      from: num('First row (m ahead)', { min: 0, max: 1000, default: 14 }) } },
  rival: { shape: 'choice', group: 'race', label: 'Rival courier', choices: ['opposite', 'evil', 'good'], help: 'A rival courier races the player to the drop, on that side.' },
  rivals: { shape: 'list', group: 'race', label: 'Rivals', max: C.rival?.most ?? 3, help: 'Up to three rival couriers, with names, cars and colours of their own.',
    settings: { name: text('Name', { init: 'Rival' }), car: pick('Car', [...new Set([...CAR_IDS, ...VEHICLE_KINDS])]), colors: { type: 'list', label: 'Colours (body, stripe)', item: { type: 'colour' }, length: 2 }, mark: { type: 'colour', label: 'Marker' } } },

  // ---- pickups, obstacles and targets ----
  pickups: { shape: 'point', group: 'items', label: 'Pickup', road: 'both', sub: 'type', help: 'A pickup in a lane (or on a shoulder).',
    settings: { type: pick('Type', PICKUP_TYPES, { required: true, init: 'turbo' }), lane: lane('Lane', { shoulders: true, required: true }) } },
  obstacles: { shape: 'point', group: 'items', label: 'Obstacle', road: 'both', sub: 'kind', help: 'Something on the road that explodes when hit.',
    settings: { lane: lane('Lane', { shoulders: true, required: true }), kind: pick('Kind', OBSTACLE_KINDS, { default: 'barrier' }), drift: pick('Darts about', ['dart'], { help: 'It darts about its spot at random.' }) } },
  targets: { shape: 'point', group: 'items', label: 'TANK RAGE target', road: 'both', help: 'A target beside the road. How it stands is the theme\'s, unless set here.',
    settings: { side: side(), offset: num('Beyond the pavement (m)', { min: -4, max: 30, step: 0.1 }), height: num('Ring height (m)', { min: 1.5, max: 14, step: 0.1 }),
      style: pick('Style', C.target.styles), base: num('Wall top (m)', { min: 0, max: 12, step: 0.1 }), arm: num('Gantry arm (m)', { min: 0.5, max: 8, step: 0.1 }), beam: flag('Beam of light') } },

  // ---- stretches that change the road ----
  narrows: { shape: 'stretch', group: 'shape', label: 'Narrowing', help: 'Each side of the expressway drops to that many lanes (or only one side).',
    settings: { lanesPerSide: int('Lanes each side', { min: 1, max: 6, required: true, init: 1 }), side: pick('Only this side', SIDES) } },
  splits: { shape: 'stretch', group: 'shape', label: 'Split', span: 900, minSpan: 200, rules: ['twoWay', 'clearOfEnds'], help: 'The two ways part: the oncoming side swings away to the left and comes back in.',
    settings: { apart: num('Apart (m)', { min: 5, max: 400, default: C.split?.apart }) } },
  bridges: { shape: 'stretch', group: 'shape', label: 'Bridge', rules: ['level'], help: 'A bridge\'s structure stands on both shoulders.', settings: { style: pick('Style', BRIDGE_STYLES) } },
  tunnels: { shape: 'stretch', group: 'shape', label: 'Tunnel', minSpan: 60, rules: ['clearOfExits'], help: 'The road under cover, dark but for its lamps.' },
  runoff: { shape: 'stretch', group: 'shape', label: 'Run-off', help: 'The shoulder on that side wider over that stretch, easing in and out; with an "end" it tapers in a straight line from the width to the end.',
    settings: { side: side(), width: num('Width (m)', { min: 0, max: 1000, step: 0.5, required: true, init: 8 }), end: num('Tapers to (m)', { min: 0, max: 1000, step: 0.5, help: 'Left out: no taper, easing in and out.' }) } },
  gravel: { shape: 'stretch', group: 'shape', label: 'Gravel trap', help: 'That side\'s shoulder and run-off is a bed of gravel. Usually with a run-off of the same stretch.',
    settings: { side: side(), inner: num('Inner edge (m out)', { min: 0, max: 1000, step: 0.5, default: C.gravel?.inner }), outer: num('Outer edge (m out)', { min: 0, max: 1000, step: 0.5, help: 'Left out: to the wall.' }),
      innerEnd: num('Inner edge at the end', { min: 0, max: 1000, step: 0.5 }), outerEnd: num('Outer edge at the end', { min: 0, max: 1000, step: 0.5 }) } },
  stands: { shape: 'stretch', group: 'shape', label: 'Grandstand', help: 'Grandstands along that stretch (or the pit garages).', settings: { side: side(), pits: flag('Pit garages instead') } },
  runway: { shape: 'point', single: true, pos: 'from', group: 'shape', label: 'Runway', help: 'From there on the road is a runway, with its markings in place of lanes.',
    settings: { width: num('Concrete beyond each edge (m)', { min: 0, max: 200, required: true, init: 30 }) } },
  reversible: { shape: 'stretch', group: 'shape', label: 'Reversible lane', rules: ['twoWay', 'twoLanes'], trigger: { setting: 'flipAt', default: () => C.reversible?.flipAt },
    help: 'A lane on the player\'s side that turns oncoming as the player comes near.',
    settings: { lane: lane('Lane', { player: true, required: true }), flipAt: num('Flips when the player is within (m)', { min: 0, max: 2000, default: C.reversible?.flipAt }) } },
  water: { shape: 'stretch', group: 'shape', label: 'Water stage', span: 350, minSpan: (C.water?.slipway ?? 26) * 3, rules: ['amphibious', 'level', 'clearOfExits', 'noRailway'], beyond: true,
    help: 'The road IS water over that stretch: a slipway down into a channel and back up. From below 0 or to beyond the finish: a level that starts, or ends, afloat.',
    settings: { current: num('Current (m/s², + to the right)', { min: -10, max: 10, step: 0.1 }) } },
  tide: { shape: 'stretch', single: true, group: 'shape', label: 'Tide', span: 600, rules: ['twoWay', 'noExits'],
    help: 'A causeway the sea comes in over, on the player\'s side, from the kerb in, rising as the clock runs down, with waves.',
    settings: { start: num('Flooded at the start (lanes)', { min: 0, max: 12, step: 0.1, required: true, init: 0.5 }), end: num('Flooded at the end (lanes)', { min: 0, max: 12, step: 0.1, required: true, init: 2 }),
      waves: { type: 'object', label: 'Waves', required: true, settings: { every: every({ min: 8, max: 14 }, { required: true }), reach: range('Reach (lanes further)', { min: 0, max: 12, step: 0.1, required: true, init: { min: 0.8, max: 1.4 } }) } },
      washUp: { type: 'object', label: 'Washed up by each wave', settings: { types: { type: 'mix', label: 'Pickups', choices: PICKUP_TYPES, required: true, init: { wrench: 1 } }, count: range('How many', { min: 0, max: 20, step: 1, required: true, init: { min: 0, max: 2 } }) } } } },

  // ---- side roads and crossroads ----
  exits: { shape: 'stretch', ends: ['exitAt', 'mergeAt'], group: 'sideRoads', label: 'Side road (exit)', custom: 'exits', span: 900, minSpan: 2 * (C.ramps?.ramp ?? 60) + 100, rules: ['noTide', 'noFlyovers'],
    help: 'An exit lane opens before the fork; the side road comes back as a merge lane. The expressway has to swing away in between.',
    settings: { out: num('Pushed out (m)', { min: -500, max: 2000, help: 'How far its middle is pushed out, away from the expressway.' }),
      bends: { type: 'object', label: 'Bends', settings: { count: int('How many', { min: 1, max: 40, required: true, init: 2 }), size: num('Each off its line (m)', { min: 1, max: 200, required: true, init: 12 }) } },
      segments: { type: 'list', label: 'Its own segments (from the exit on)', settings: { length: segmentSettings.length, curve: segmentSettings.curve } },
      lanes: { type: 'number', int: true, label: 'Lanes', min: 1, max: 4, default: 2,
        alt: { type: 'list', label: 'Lanes along the way', settings: { at: num('From (m along it)', { min: 0, max: 9000, required: true, init: 0 }), count: int('Lanes', { min: 1, max: 4, required: true, init: 2 }) } } },
      oncoming: flag('Traffic coming the other way', { tri: true, help: 'Left out: on a two-way level it does, on a one-way one it doesn\'t.' }),
      oncomingFrom: num('Lane 0 oncoming from (m along it)', { min: 0, max: 9000 }),
      flyovers: flag('Flyovers', { help: 'A flyover at each end carries the oncoming traffic over. The expressway must be straight for 250 m before the exit and after the merge.' }) } },
  junctions: { shape: 'point', group: 'sideRoads', label: 'Crossroads', rules: [], help: 'A crossroads, its bend (or box) starting there. With a turn, the level\'s segments must have the quarter bend.',
    settings: { turn: pick('The route', ['left', 'right', 'straight'], { required: true, init: 'straight' }), forward: num('Share carrying straight on', { min: 0, max: 1, step: 0.05, default: C.junction?.forward }),
      turnOff: num('Share turning off', { min: 0, max: 1, step: 0.05, default: C.junction?.turnOff }) } },

  // ---- zones ----
  zones: { shape: 'stretch', group: 'zones', label: 'Zone (a look of its own)', span: 800, rules: ['zonesTheme'], help: 'A stretch with a look of its own; the player is welcomed into each (messages.json: zones, by id).',
    settings: { id: text('Id', { init: 'zone' }), scenery: pick('Scenery', ZONE_SCENERY, { required: true, init: 'bush' }), ground: { type: 'colour', label: 'Ground', numeric: true }, sky: { type: 'colour', label: 'Sky', numeric: true },
      sea: num('Sea (m off the road)', { min: 0, max: 500 }) } },
  quietZones: { shape: 'stretch', group: 'zones', label: 'Quiet zone', help: 'Less traffic: only that share of the cars that would turn up there do.',
    settings: { density: num('Density (0 to 1)', { min: 0, max: 1, step: 0.05, required: true, init: 0.4 }) } },
  trafficZones: { shape: 'stretch', group: 'zones', label: 'Traffic zone', span: 600, help: 'The traffic turning up is different: it sets the weights of the kinds it names over the level\'s (0 takes a kind away).',
    settings: { traffic: { type: 'mix', label: 'Traffic here', choices: VEHICLE_KINDS, required: true, init: { police: 0.05 } } } },

  // ---- hazards on the road ----
  ice: { shape: 'stretch', group: 'hazards', label: 'Ice', help: 'An ice patch on that lane (no lane: across the road). On it the car brakes with a share of its brakes and changes lane more slowly.', settings: { lane: lane('Lane', { help: 'Left out: across the road.' }) } },
  crosswinds: { shape: 'stretch', group: 'hazards', label: 'Crosswind', span: 500, help: 'An exposed stretch with a gusting wind across it: tall cars are pushed harder, a tall vehicle alongside gives shelter.',
    settings: { dir: pick('Blows to the', SIDES, { required: true, init: 'left' }), strength: num('Strength (m/s²)', { min: 0.5, max: 50, step: 0.5, default: C.crosswind?.strength }),
      every: num('A gust every (s)', { min: 1, max: 60, step: 0.5, default: C.crosswind?.every }), length: num('A gust lasts (s)', { min: 0.5, max: 60, step: 0.1, default: C.crosswind?.length }) } },
  lowBridges: { shape: 'point', group: 'hazards', label: 'Low bridge', help: 'A height bar over the side the player drives on, between an exit and its merge: a car that fits goes under, a taller one takes the side road or the knock.',
    settings: { clearance: num('Clearance (m)', { min: 1, max: 5, step: 0.1, default: C.lowBridge?.clearance }), first: pick('First bar over', ['left', 'right'], { init: 'left' }) } },
  fords: { shape: 'stretch', group: 'hazards', label: 'Ford', span: 70, help: 'The road through a river, between an exit and its merge (the side road is the bridge): a car is slowed by how well it wades, and one out of its depth crawls and is damaged.',
    settings: { depth: num('Depth (m)', { min: 0.1, max: 1.5, step: 0.05, default: C.ford?.depth }),
      fills: { type: 'object', label: 'Fills (a flooded underpass)', settings: { to: num('Up to (m)', { min: 0.1, max: 1.5, step: 0.05, required: true, init: 0.9 }), over: num('Over (s)', { min: 1, max: 900, step: 5, required: true, init: 180 }) } },
      underpass: flag('A railway bridge over it') } },
  cushions: { shape: 'stretch', group: 'hazards', label: 'Speed cushions', span: 180, help: 'Rows of speed cushions, one in each lane with gaps on the lane lines: thread a gap, crawl over, or be thrown up and knocked.',
    settings: { every: num('A row every (m)', { min: 15, max: 200, step: 5, default: C.cushion?.every }) } },
  shade: { shape: 'stretch', group: 'hazards', label: 'Black ice in the shade', span: 200, help: 'Trees on one side shade the nearest lanes, and the shade is black ice: nothing shows but the shadow. Traffic keeps to the sun.',
    settings: { side: pick('Shaded from the', SIDES, { required: true, init: 'right' }), lanes: int('Lanes in the shade', { min: 1, max: 8, default: C.shade?.lanes }) } },
  ruts: { shape: 'stretch', group: 'hazards', label: 'Ruts', span: 250, help: 'Deep mud with a rut down each lane: fast and held to it in a rut, a jolt to climb out, slow in the mud between.' },
  tarmac: { shape: 'stretch', group: 'hazards', label: 'Fresh tarmac', span: 300, help: 'A coned-off lane of new tar beside a crawling queue: empty and sticky, slowing a car the longer it stays on and for a while after.',
    settings: { lane: lane('Its lane', { required: true, player: true }) } },
  radiation: { shape: 'stretch', group: 'hazards', label: 'Radiated area', span: 200, help: 'A radiated stretch of some lanes: in it the player\'s health ticks down and the radiation meter rises; a full meter infects for the rest of the run. Armour keeps it out. Leave a clean line round it, or an armour before it.',
    settings: { lanes: lanes('Lanes it covers', { span: true, help: 'Left out: the whole road, shoulders and all.' }), side: pick('Reaches the shoulder on the', SIDES, { help: 'With lanes: it also covers the road out to its edge on that side.' }) } },
  infectedTraffic: { shape: 'number', group: 'hazards', label: 'Infected traffic (share)', min: 0, max: 1, step: 0.01, help: 'The share of the traffic dealt out infected: a ring round each doses the player as a radiated area does, and touching one infects at once. Left out: ' + (C.radiation?.share ?? 0) + ' on a level with a radiated area, none on any other.' },
  spray: { shape: 'stretch', group: 'hazards', label: 'Truck spray', span: 400, help: 'A wet stretch: every tall vehicle drags a cloud of spray, and in it next to nothing can be seen.' },
  lowSun: { shape: 'stretch', group: 'hazards', label: 'Low sun', span: 400, help: 'The road runs straight into a low sun: the picture washes out, except in the shadow of a tall vehicle ahead, a bridge, a tunnel or a shade.' },
  dust: { shape: 'stretch', group: 'hazards', label: 'Dust trail', span: 400, help: 'A dry dirt stretch: every vehicle throws a plume the wind carries to one side. Blind in it, clear a lane upwind.',
    settings: { wind: pick('The wind blows to the', SIDES, { required: true, init: 'right' }) } },
  washboards: { shape: 'stretch', group: 'hazards', label: 'Washboard dirt', span: 400, help: 'Corrugations right across: at any speed the steering shakes and the car wanders (the faster, the worse), and it is held to a top speed. Never stopped. Leave a lane or shoulder free of it, or something in it to steer round.' },
  jamRamps: { shape: 'point', group: 'hazards', label: 'Ramp over the jam', rules: ['straight', 'level'], reach: () => (C.jamRamp?.run ?? 15) + 60, help: 'A car transporter with its ramps down at the back of a queue of stopped traffic: fast enough, the car flies the queue.',
    settings: { lane: lane('Its lane', { required: true, player: true }), queue: int('Cars in the queue', { min: 1, max: 10, default: C.jamRamp?.queue }), lanes: lanes('Lanes the queue fills', { span: true, help: 'Left out: the player\'s whole side.' }) } },
  mud: { shape: 'stretch', group: 'hazards', label: 'Mud', help: 'The road gives way to mud: a car is slowed in it by how well it crosses.' },
  fog: { shape: 'stretch', group: 'hazards', label: 'Fog bank', span: 300, help: 'The fog closes right in, and the police see less.' },
  potholes: { shape: 'point', group: 'hazards', label: 'Pothole', road: 'both', help: 'A jolt, and maybe a flat tyre.', settings: { lane: lane('Lane', { required: true }), r: num('Radius (m)', { min: 0.2, max: 5, step: 0.1, default: C.site?.potholeR }) } },
  waterMains: { shape: 'point', group: 'hazards', label: 'Burst water main', road: 'both', help: 'A fountain out of its lane, on and off; while it sprays that stretch of the lane is as slippery as ice: weaker brakes and slower lane changes on its water.',
    settings: { lane: lane('Lane', { required: true, init: 0 }), length: num('Slippery for (m)', { min: 1, max: 500, default: C.waterMain?.length }) } },
  landmines: { shape: 'stretch', group: 'hazards', label: 'Landmines', road: 'both', help: 'Scattered down the lanes: whatever touches one is destroyed outright.', settings: { count: count(8) } },
  rockfall: { shape: 'stretch', group: 'hazards', label: 'Rockfall', road: 'both', help: 'Rocks tumbling down onto the road from that side as the player comes near.',
    settings: { count: count(5), side: side(), out: num('Waiting (m off the edge)', { min: 0, max: 200, default: C.rockfall?.out }), height: num('Waiting (m up)', { min: 0, max: 200, default: C.rockfall?.height }) } },
  asteroidFields: { shape: 'stretch', group: 'hazards', label: 'Asteroid field', span: 600, help: 'Asteroids of assorted sizes scattered over that stretch, the same every run for a given seed.',
    settings: { count: count(30, { max: 2000 }), moving: num('Share that drift', { min: 0, max: 1, step: 0.05, init: 0.3 }), seed: int('Seed', { min: 0, max: 1e9, init: 1 }) } },
  drifters: { shape: 'stretch', group: 'hazards', label: 'Drifting obstacles', help: 'Obstacles of that kind moving about the road in a pattern.',
    settings: { kind: pick('Kind', OBSTACLE_KINDS, { required: true, init: 'cone' }), count: count(6), pattern: pick('Pattern', DRIFT_PATTERNS, { default: 'circle', init: 'circle' }) } },
  shoulderRows: { shape: 'stretch', group: 'hazards', label: 'Row on the shoulder', help: 'A row of obstacles standing on the shoulder. Exit and merge lanes are left clear.',
    settings: { kind: pick('Kind', OBSTACLE_KINDS, { required: true, init: 'cone' }), every: num('One every (m)', { min: 1, max: 500, required: true, init: 12 }), side: pick('Side', ['left', 'right', 'both'], { default: 'both' }) } },
  trolleys: { shape: 'stretch', group: 'hazards', label: 'Shopping trolleys', road: 'both', help: 'Rolling across the road with its camber.', settings: { count: count(6) } },
  balloons: { shape: 'point', group: 'hazards', label: 'Hot-air balloon', road: 'both', help: 'Comes down on those lanes, sits, and lifts off again.', settings: { lanes: lanes('Lanes (first, last)', { span: true, required: true }) } },
  drawbridges: { shape: 'point', group: 'hazards', label: 'Drawbridge', road: 'both', rules: ['straight'], reach: () => (C.drawbridge?.stopLine ?? 20) + 10, help: 'Two leaves that lift: jump the gap if you came fast enough, or stop short, or drop in.' },
  wideLoads: { shape: 'point', group: 'hazards', label: 'Wide load', road: 'both', trigger: { default: () => C.wideLoad?.trigger }, help: 'A load two lanes wide crawling along, swinging from side to side.',
    settings: { lanes: lanes('Lanes (n, n + 1)', { span: true, width: 2, required: true }) } },
  potties: { shape: 'point', group: 'hazards', label: 'Dancing portaloos', help: 'A row of portaloos across those lanes, dancing together.',
    settings: { pattern: pick('Dance', POTTY_DANCES, { required: true, init: 'hop' }), lanes: lanes('Lanes', { required: true }), period: num('Step (s)', { min: 0.1, max: 10, step: 0.1 }), phase: num('Phase', { min: 0, max: 10, step: 0.1 }) } },

  // ---- animals ----
  frogs: { shape: 'stretch', group: 'animals', label: 'Frog', road: 'both', help: 'A stretch of road that a large frog roams all over.' },
  herds: { shape: 'stretch', group: 'animals', label: 'Herd', road: 'both', help: 'Animals wandering back and forth across that stretch: cows, or kangaroos bounding across.',
    settings: { count: count(6), kind: pick('Kind', HERD_KINDS, { default: 'cow' }), stay: flag('Never leaves the road') } },
  dropBears: { shape: 'stretch', group: 'animals', label: 'Drop bears', road: 'both', help: 'Up in the trees, dropping onto the road as the player comes near.', settings: { count: count(4) } },
  hippos: { shape: 'stretch', group: 'animals', label: 'Hippos', span: 300, help: 'A river beside the road (on the right), out of which a hippo charges across every so often.', settings: { every: every({ min: 6, max: 10 }, { required: true }) } },
  elephants: { shape: 'stretch', group: 'animals', label: 'Elephants', span: 300, help: 'Plodding across the road and back: whatever one walks into is destroyed.', settings: { count: count(3) } },
  migration: { shape: 'stretch', group: 'animals', label: 'Migration', road: 'both', span: 300, help: 'A great herd streaming across the road, one way, and round again.',
    settings: { count: count(40), kinds: { type: 'mix', label: 'Kinds', choices: MIGRATION_KINDS, required: true, init: { wildebeest: 0.75, zebra: 0.25 } }, dir: pick('Direction', [{ value: 1, label: 'to the right' }, { value: -1, label: 'to the left' }], { default: 1 }) } },
  stampedes: { shape: 'stretch', group: 'animals', label: 'Stampede', road: 'both', trigger: { default: () => C.stampede?.trigger }, help: 'Animals charging down the road at the player.',
    settings: { count: count(8), kind: pick('Kind', HERD_KINDS, { default: 'cow' }) } },

  // ---- roadworks and machinery ----
  stopGo: { shape: 'stretch', group: 'works', label: 'Stop / go roadworks', span: 200, rules: ['oneEachWay', 'straight'], help: 'The oncoming side dug up, both ways taking turns through the lane left.',
    settings: { go: num('GO each way (s)', { min: 1, max: 120, default: C.stopGo?.go }), clear: num('Clearing time between (s)', { min: 0, max: 120, default: C.stopGo?.clear }) } },
  machinery: { shape: 'point', group: 'works', label: 'Machinery', sub: 'kind', help: 'A bulldozer, excavator or dump truck trundling across the road; a roller crawling along a shoulder (from, to); or a forklift backing out onto one.',
    make: (kind, s) => kind === 'roller' ? { kind, from: s, to: s + 150, side: 'right' } : kind === 'forklift' ? { kind, s, side: 'right' } : { s, kind: kind || 'bulldozer' },
    settings: { kind: pick('Kind', MACHINERY_KINDS, { required: true, init: 'bulldozer' }), side: pick('Side', SIDES, { when: (e) => e.kind === 'roller' || e.kind === 'forklift' }) } },
  siteWorks: { shape: 'point', group: 'works', label: 'Site works', sub: 'kind', help: 'The work on a construction site\'s shoulders: trenches, swinging excavators, workers with barrows, stacks of pipes.',
    make: (kind, s) => kind === 'trench' || kind === 'workers' ? { kind, from: s, to: s + 150, side: 'right', ...(kind === 'workers' ? { count: 3 } : {}) } : { kind: kind || 'excavator', s, side: 'right' },
    settings: { kind: pick('Kind', SITE_KINDS, { required: true, init: 'excavator' }), side: side(), count: int('Workers', { min: 1, max: 50, when: (e) => e.kind === 'workers' }),
      every: every(undefined, { when: (e) => e.kind === 'pipes' }) } },
  quarries: { shape: 'stretch', group: 'works', label: 'Quarry', span: 400, help: 'A quarry beside the road: its floor, rock face, crusher, heaps and trucks (only scenery).',
    settings: { side: side(), floor: num('Face starts (m off the road)', { min: 0, max: 500, default: C.quarry?.floorTo }) } },
  tractors: { shape: 'point', group: 'works', label: 'Tractor', road: 'both', help: 'Slow traffic that starts from that spot every run.', settings: { lane: lane('Lane', { required: true }) } },
  parked: { shape: 'point', group: 'works', label: 'Parked car', rules: ['noBridge'], help: 'A car parked on that shoulder, hazards on, every run.', settings: { side: side() } },

  // ---- police and stops ----
  cameras: { shape: 'point', group: 'police', label: 'Speed camera', road: 'both', help: 'Passing it faster than its limit is a fine the first time in a run, a bust after.',
    settings: { side: pick('Side', ['left', 'right', 'centre'], { required: true, init: 'right' }), limit: num('Limit (km/h)', { min: 10, max: 400, step: 5, help: 'Left out: the level\'s speed limit.' }) } },
  roadblocks: { shape: 'point', group: 'police', label: 'Police roadblock', rules: ['twoLanes'], help: 'Police cars across every lane of the player\'s side but one.',
    settings: { gap: lane('The gap', { player: true, help: 'Left out: any lane, each run.' }) } },
  schoolCrossings: { shape: 'point', group: 'police', label: 'School crossing', road: 'both', rules: ['straight'], reach: () => (C.schoolCrossing?.stopLine ?? 20) + 10, help: 'A lollipop person stops the traffic for the children; running it is a bust.' },
  crossings: { shape: 'point', group: 'police', label: 'Level crossing', road: 'both', rules: ['straight'], reach: () => C.crossing?.clear ?? 30, trigger: { setting: 'trigger' },
    help: 'Lights, booms, and a short fast train across the road, timed to the player (or set off by a trigger).',
    settings: { trigger: num('Set off within (m)', { min: 0, max: 3000, help: 'Left out: timed so the train gets there about as the player would.' }), every: num('Every (s)', { min: 1, max: 600 }),
      train: pick('Train', C.crossing?.trains ?? ['bullet', 'steam'], { help: 'Left out: the theme\'s train (the Wild West\'s is a steam train), else the bullet train\'s carriages.' }) } },
  iceCreamStops: { shape: 'point', group: 'police', label: 'Ice-cream van', trigger: { default: () => C.iceCream?.trigger }, help: 'Stopped in that lane, its jingle going; the traffic behind it queues until it drives off.',
    settings: { lane: lane('Lane', { player: true, required: true }), wait: num('Waits (s)', { min: 0, max: 600, default: C.iceCream?.wait }) } },
  parades: { shape: 'point', group: 'police', label: 'Street parade', rules: ['playerSide'], trigger: { default: () => C.parade?.trigger }, help: 'A float in every lane of the player\'s side and a marching band behind, off at a crawl as the player comes near.',
    settings: { speed: num('Speed (m/s)', { min: 0.5, max: 30, step: 0.5, default: C.parade?.speed }) } },
  marathons: { shape: 'point', group: 'police', label: 'Marathon', road: 'both', trigger: { default: () => C.marathon?.trigger }, help: 'Runners in one lane behind a pace car.',
    settings: { lane: lane('Lane', { required: true }), count: count(12), water: { type: 'metres', label: 'Water station at (m)' } } },
  pelotons: { shape: 'point', group: 'police', label: 'Cyclist peloton', road: 'both', trigger: { setting: 'trigger', default: () => C.peloton?.trigger }, help: 'Cyclists two abreast by the kerb, setting off as the player comes near.',
    settings: { count: count(10), speed: num('Speed (m/s)', { min: 1, max: 40, default: C.peloton?.speed }), trigger: num('Set off within (m)', { min: 0, max: 3000, default: C.peloton?.trigger }),
      dir: pick('Riding', [{ value: 1, label: 'the player\'s way' }, { value: -1, label: 'towards the player, on the far side' }], { default: 1 }) } },

  // ---- scripted events ----
  wreckage: { shape: 'point', pos: 'at', group: 'scripted', label: 'Wreckage', sub: 'kind', trigger: { setting: 'trigger', default: () => C.wreckage.trigger }, help: 'Scripted destruction set off as the player comes near: its wreckage lands across those lanes and blocks them for good. It must leave a lane open (a blast leaves the road clear).',
    settings: { kind: pick('Kind', WRECKAGE_KINDS, { required: true, init: 'tanker' }), lanes: lanes('Lanes (first, last)', { span: true, required: true }), from: pick('From', ['left', 'right', 'sky'], { init: 'right' }),
      trigger: num('Set off within (m)', { min: 0, max: 3000, default: C.wreckage.trigger, when: (e) => e.kind !== 'blast' }), slide: num('Slides back (m)', { min: 0, max: 2000, when: (e) => e.kind === 'airliner' }),
      distance: num('Building off the road (m)', { min: 0, max: 500, default: C.wreckage.blastBuilding, when: (e) => e.kind === 'blast' }), ahead: num('Sooner by (s)', { min: 0, max: 60, step: 0.1, when: (e) => e.kind === 'blast' }),
      rock: flag('A quarry\'s rock face', { when: (e) => e.kind === 'blast' }) } },
  tower: { shape: 'point', single: true, pos: 'at', group: 'scripted', label: 'Control tower', trigger: { setting: 'trigger' }, help: 'Beside the old road carrying straight on where the route turns off: it comes crashing down across that road (only a sight).',
    settings: { trigger: num('Set off within (m)', { min: 0, max: 3000, required: true, init: 300 }), distance: num('Off the road (m)', { min: 0, max: 1000, required: true, init: 60 }), stub: num('Old road carried on (m)', { min: 0, max: 2000, required: true, init: 200 }) } },
  gunfire: { shape: 'stretch', group: 'scripted', label: 'Gang turf (gunfire)', span: 300, help: 'The houses beside the road shoot.', settings: { every: every(undefined, { default: C.gunfire?.every }) } },
  storm: { shape: 'stretch', single: true, group: 'scripted', label: 'Storm', span: 1000, help: 'Vehicles blown through the air above that stretch, tumbling. Only a sight.',
    settings: { count: count(12), seed: int('Seed', { min: 0, max: 1e9, init: 1 }) } },

  // ---- scenery and sights ----
  parkedPlanes: { shape: 'point', group: 'scenery', label: 'Parked airliner', help: 'An airliner parked off the road on the left, turned a little.',
    settings: { d: num('Off the road (m)', { min: 0, max: 1000, required: true, init: 60 }), turn: num('Turned (rad)', { min: -7, max: 7, step: 0.05, init: 0 }) } },
  landmarks: { shape: 'world', group: 'scenery', label: 'Landmark', sub: 'kind', help: 'A landmark where it really is, in the world; r m round it is kept clear of the town. (A circuit\'s lakes and streams are drawn from "paths".)',
    settings: { kind: pick('Kind', LANDMARK_KINDS, { required: true, init: 'flyer' }), x: num('x (m)', { min: -1e5, max: 1e5 }), z: num('z (m)', { min: -1e5, max: 1e5 }),
      s: { type: 'metres', label: 'Or beside the road at (m)' }, off: num('...that far off it (m)', { min: -5000, max: 5000 }),
      r: num('Radius kept clear (m)', { min: 0, max: 5000 }), rot: num('Faces (rad)', { min: -7, max: 7, step: 0.05 }), w: num('Half its width (m)', { min: 0, max: 5000 }),
      paths: { type: 'json', label: 'Paths ([[x, z], ...] each)' } } },
};

// ---- reading the schema ---------------------------------------------------------------------------
export const fieldNames = () => Object.keys(FIELDS);
export const isPlaced = (def) => def.shape === 'stretch' || def.shape === 'point' || def.shape === 'world';
export const isList = (def) => (isPlaced(def) && !def.single) || def.shape === 'list';
export const choiceValue = (c) => (c !== null && typeof c === 'object' ? c.value : c);
export const choiceLabel = (c) => (c !== null && typeof c === 'object' ? c.label ?? String(c.value) : String(c));
// a field's entries in a level: [] if it has none; a single one as a list of one
export const entriesOf = (level, key) => {
  const v = level[key];
  return v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];
};
// where an entry is: { type: 'stretch', a, b } (its two keys) | { type: 'point', p } | { type: 'world' } | { type: 'paths' }
// (a landmark drawn from its own lines in the world) | null.
// By what the entry has as much as by its field's shape: machinery and site works are a point or a stretch by kind
export const placeOf = (def, e) => {
  if (!e || typeof e !== 'object') return null;
  const n = Number.isFinite;
  if (def.ends) return n(e[def.ends[0]]) && n(e[def.ends[1]]) ? { type: 'stretch', a: def.ends[0], b: def.ends[1] } : null;
  if (def.shape === 'world') return n(e.x) && n(e.z) ? { type: 'world' } : n(e.s) ? { type: 'point', p: 's' } : Array.isArray(e.paths) ? { type: 'paths' } : null;
  if (!isPlaced(def)) return null;
  if (def.pos && n(e[def.pos])) return { type: 'point', p: def.pos };
  if (n(e.from) && n(e.to)) return { type: 'stretch', a: 'from', b: 'to' };
  if (n(e.s)) return { type: 'point', p: 's' };
  if (n(e.at)) return { type: 'point', p: 'at' };
  return null;
};
// the m along its road an entry takes up: [from, to] (a point: its reach either side, if its field has one)
export const spanOf = (def, e) => {
  const place = placeOf(def, e);
  if (!place || place.type === 'world' || place.type === 'paths') return null;
  if (place.type === 'stretch') return [e[place.a], e[place.b]];
  const reach = def.reach ? def.reach() : 0;
  return [e[place.p] - reach, e[place.p] + reach];
};
// where the player sets an entry off (m along its road), or null: `trigger` m short of where it is
export const triggerOf = (def, e) => {
  const span = def.trigger && spanOf(def, e);
  if (!span) return null;
  const d = (def.trigger.setting && e[def.trigger.setting]) ?? (def.trigger.default ? def.trigger.default() : undefined);
  return Number.isFinite(d) ? span[0] - d : null;
};
// a setting's value for a new entry
const initial = (S) => {
  if (S.init !== undefined) return structuredClone(S.init);
  if (S.type === 'object') return Object.fromEntries(Object.entries(S.settings).filter(([, T]) => T.required).map(([k, T]) => [k, initial(T)]));
  return S.type === 'number' ? S.min ?? 0 : S.type === 'choice' ? choiceValue(S.choices[0]) : S.type === 'flag' ? true : S.type === 'range' ? { min: S.min ?? 0, max: S.max ?? 1 }
    : S.type === 'mix' ? {} : S.type === 'list' || S.type === 'lanes' ? [] : S.type === 'text' ? '' : S.type === 'colour' ? '#ffffff' : 0;
};
// a new entry of a field, with every required setting (and those with an `init`) filled in. at: where
// ({ s } for a point or the start of a stretch, { x, z } in the world); o: { road, exit, lane, lanes, side, sub, length }
export const makeEntry = (key, at = {}, o = {}) => {
  const def = FIELDS[key];
  let e = {};
  const s = Math.round(at.s ?? 0);
  if (def.make) e = def.make(o.sub, s);
  else if (def.shape === 'stretch') {
    const [a, b] = def.ends || ['from', 'to'];
    e[a] = s;
    e[b] = Math.round(o.length !== undefined ? Math.min(o.length, s + (def.span || 150)) : s + (def.span || 150));
    if (e[b] - e[a] < (def.minSpan || 10)) e[b] = e[a] + (def.minSpan || 10);
  } else if (def.shape === 'point') e[def.pos || 's'] = s;
  else if (def.shape === 'world') { e.x = Math.round(at.x ?? 0); e.z = Math.round(at.z ?? 0); }
  for (const [k, S] of Object.entries(def.settings || {})) {
    if (e[k] !== undefined || (S.when && !S.when(e))) continue;
    if (S.type === 'lane' && (S.required || o.lane !== undefined)) { if (o.lane !== undefined && (S.shoulders || typeof o.lane === 'number')) e[k] = o.lane; else if (S.required) e[k] = o.laneNumber ?? 0; continue; }
    if (S.type === 'lanes' && S.required) { const l = o.laneNumber ?? 0; e[k] = S.width ? [l, l + S.width - 1] : S.span ? [l, l] : [l]; continue; }
    if (k === 'side' && (o.side === 'left' || o.side === 'right') && (S.required || S.init !== undefined)) { e[k] = o.side; continue; }
    if (def.sub === k && o.sub !== undefined) { e[k] = o.sub; continue; }
    if (S.required || S.init !== undefined) e[k] = initial(S);
  }
  if (def.sub && o.sub !== undefined && def.settings[def.sub] && e[def.sub] === undefined) e[def.sub] = o.sub;
  if (o.road === 'side' && def.road === 'both') { e.road = 'side'; if (o.exit) e.exit = o.exit; }
  return e;
};
// a level-wide field's value when it is first switched on
export const makeValue = (key) => {
  const def = FIELDS[key];
  if (def.init !== undefined) return structuredClone(def.init);
  if (def.shape === 'flag') return !(def.default === true);
  if (def.shape === 'number') return def.default ?? def.min ?? 0;
  if (def.shape === 'choice') return choiceValue(def.choices[0]);
  if (def.shape === 'text') return '';
  if (def.shape === 'mix') return {};
  if (def.shape === 'object' || def.shape === 'timed') return Object.fromEntries(Object.entries(def.settings).filter(([, S]) => S.required).map(([k, S]) => [k, initial(S)]));
  return isList(def) ? [] : makeEntry(key);
};

// ---- a lapped road closed: the segments changed as little as will bring the road back to where it starts ----
// Where a road of these segments ends, as the game lays it out (track.js: the bend looked up by the metre, the
// road stepped 2 m at a time, the last point read off at the road's length): { x, y, h }, from a start at
// 0, 0 facing h = 0. The game calls a loop closed when that is within 1 m and 0.01 rad of the start
export const roadEnd = (segments) => {
  const length = segments.reduce((sum, seg) => sum + seg.length, 0), curves = new Float64Array(Math.max(1, Math.ceil(length)));
  { let at = 0; for (const seg of segments) { for (let i = 0; i < seg.length; i++) curves[at + i] = seg.curve || 0; at += seg.length; } }
  const curveAt = (s) => (s < 0 || s >= length ? 0 : curves[Math.floor(s)]);
  let x = 0, y = 0, h = 0, px = 0, py = 0, last = 0;
  for (let s = 0; s + 2 <= length; s += 2) {
    px = x; py = y; last = s + 2;
    h -= curveAt(s + 1) * 2;
    x += Math.sin(h) * 2;
    y += Math.cos(h) * 2;
  }
  const t = (length - (last - 2)) / 2; // (a length that is not even: read off past the last point, on the line of the last step)
  return last ? { x: px + (x - px) * t, y: py + (y - py) * t, h } : { x: 0, y: 0, h: 0 };
};
// The segments of a loop that closes, or { problem }. Two things are put right, turn and turn about:
//   the turn: the road must come round a whole number of times (the nearest to what it does now). What it is
//             out by is taken off every bend, each by its share of the bending: no bend changes much
//   the gap:  a segment made longer or shorter, bending as far as it did, moves the end of the road along that
//             segment's own line (its chord), so two that run different ways can bring the end back to the
//             start. Lengths are whole metres, so of the longest segments' pairs and their roundings the one
//             that leaves the smallest gap, as the game will measure it, is taken
// Returns { segments (copies), gap (m), turned (rad taken off the bends), moved: [{ i, from, to }] }
export const closeLoop = (segments) => {
  const S = segments.map(seg => ({ ...seg })), TURN = 2 * Math.PI;
  if (!S.some(seg => seg.curve)) return { problem: 'the road has no bends to come round by' };
  const offBy = (h) => h - (Math.round(h / TURN) || (h < 0 ? -1 : 1)) * TURN;
  let turned = 0;
  const squareUp = () => { // (the turn; twice, as the game's stepping makes it not quite the sum of the bends)
    for (let pass = 0; pass < 3; pass++) {
      const off = offBy(-roadEnd(S).h), bending = S.reduce((sum, seg) => sum + Math.abs((seg.curve || 0) * seg.length), 0);
      if (Math.abs(off) < 1e-9) break;
      turned += off;
      for (const seg of S) if (seg.curve) seg.curve -= off * Math.abs(seg.curve * seg.length) / bending / seg.length;
    }
  };
  const resized = (seg, to) => ({ ...seg, length: to, curve: (seg.curve || 0) * seg.length / to || 0 }); // (bending as far as it did)
  const first = S.map(seg => seg.length);
  squareUp();
  for (let round = 0; round < 3; round++) {
    const end = roadEnd(S);
    if (Math.hypot(end.x, end.y) < 0.3) break;
    // each candidate: the longest segments, with the line its end moves along as it grows, a metre for a metre
    const lines = [];
    { let h = 0; S.forEach((seg, i) => { const bend = (seg.curve || 0) * seg.length, mid = h - bend / 2, k = bend ? Math.sin(bend / 2) / (bend / 2) : 1; lines.push({ i, length: seg.length, x: Math.sin(mid) * k, y: Math.cos(mid) * k }); h -= bend; }); }
    const longest = lines.filter(l => l.length >= 12).sort((p, q) => q.length - p.length).slice(0, 14), pairs = [];
    for (let a = 0; a < longest.length; a++) for (let b = a + 1; b < longest.length; b++) {
      const A = longest[a], B = longest[b], det = A.x * B.y - A.y * B.x;
      if (Math.abs(det) < 0.25) continue; // (too nearly parallel: a small gap would take a great length)
      const da = (-end.x * B.y + end.y * B.x) / det, db = (-A.x * end.y + A.y * end.x) / det;
      if (A.length + da < 6 || B.length + db < 6) continue;
      pairs.push({ A, B, da, db, change: Math.abs(da) + Math.abs(db) });
    }
    if (!pairs.length) return { problem: 'closing it needs two long segments that run different ways' };
    let best = null;
    for (const { A, B, da, db } of pairs.sort((p, q) => p.change - q.change).slice(0, 10)) {
      for (let ra = Math.floor(da) - 1; ra <= Math.ceil(da) + 1; ra++) for (let rb = Math.floor(db) - 1; rb <= Math.ceil(db) + 1; rb++) {
        if (A.length + ra < 4 || B.length + rb < 4) continue;
        const tried = S.map((seg, i) => (i === A.i ? resized(seg, A.length + ra) : i === B.i ? resized(seg, B.length + rb) : seg)), at = roadEnd(tried), gap = Math.hypot(at.x, at.y);
        if (!best || gap < best.gap - 0.02 || (Math.abs(gap - best.gap) <= 0.02 && Math.abs(ra) + Math.abs(rb) < best.change)) best = { gap, change: Math.abs(ra) + Math.abs(rb), tried };
      }
    }
    if (!best) return { problem: 'closing it needs two long segments that run different ways' };
    best.tried.forEach((seg, i) => { S[i] = seg; });
    squareUp();
  }
  const after = roadEnd(S), gap = Math.hypot(after.x, after.y);
  if (gap > 1 || Math.abs(offBy(-after.h)) > 0.01) return { problem: 'it could not be brought within a metre (' + gap.toFixed(1) + ' m left): move a segment by hand first' };
  return { segments: S, gap, turned, moved: S.map((seg, i) => ({ i, from: first[i], to: seg.length })).filter(m => m.to !== m.from) };
};

// ---- the facts of a level's road, from its own data (as track.js works them out), for the rules -------------
export const roadFacts = (level) => {
  const segments = Array.isArray(level.segments) ? level.segments : [];
  const length = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
  const starts = [];
  let at = 0, heading = 0, x = 0, z = 0;
  for (const seg of segments) {
    starts.push(at);
    at += seg.length || 0;
    // (where the road ends up: for a closed loop)
    const c = seg.curve || 0, L = seg.length || 0;
    if (c) { x += (Math.cos(heading) - Math.cos(heading + c * L)) / c; z += (Math.sin(heading + c * L) - Math.sin(heading)) / c; } else { x += Math.sin(heading) * L; z += Math.cos(heading) * L; }
    heading += c * L;
  }
  const segAt = (s) => { for (let i = segments.length - 1; i >= 0; i--) if (s >= starts[i]) return segments[i]; return segments[0]; };
  const some = (a, b, test) => {
    for (let i = 0; i < segments.length; i++) if (starts[i] < b && starts[i] + segments[i].length > a && test(segments[i])) return true;
    return false;
  };
  const L = level.lanes ?? CONFIG.laneCount, flow = level.flow;
  const oneWay = flow === 'north' || flow === 'south';
  const total = typeof L === 'object' && L ? (L.north || 0) + (L.south || 0) : L;
  const left = oneWay ? (flow === 'south' ? total : 0) : typeof L === 'object' && L ? L.south || 0 : Math.floor(L / 2);
  const right = oneWay ? (flow === 'north' ? total : 0) : total - left;
  const median = level.median || 0, R = CONFIG.ramps || {};
  const turns = Math.abs(heading) / (Math.PI * 2);
  return {
    level, length, segments, starts, flow, oneWay, left, right, median, lanes: total + median,
    // (the lanes going the player's way: all of them on a one-way or a mixed level)
    playerLanes: flow === 'north' || flow === 'mixed' ? total : flow === 'south' ? 0 : right,
    playerFirst: flow === 'north' || flow === 'mixed' || flow === 'south' ? 0 : left + median,
    exits: (level.exits || []).length,
    ramps: (level.exits || []).map(x => [x.exitAt - (R.laneZone ?? 0), x.mergeAt + (R.laneZone ?? 0)]),
    segAt, curveAt: (s) => (s < 0 || s >= length ? 0 : segAt(s).curve || 0), gradeAt: (s) => (s < 0 || s >= length ? 0 : segAt(s).grade || 0),
    straight: (a, b) => !some(Math.max(0, a), Math.min(length, b) + 0.001, seg => !!seg.curve),
    sloped: (a, b) => some(Math.max(0, a), Math.min(length, b) + 0.001, seg => Math.abs(seg.grade || 0) > 0.002),
    // (as the game measures it, stepping the road as track.js does: the exact arcs above can differ from that by a
    // metre on a long circuit, and it is the game's word that counts)
    closed: (() => { const end = roadEnd(segments.filter(seg => seg && seg.length > 0)), round = end.h / (2 * Math.PI); return Math.hypot(end.x, end.y) <= 1 && Math.abs(round - Math.round(round)) * 2 * Math.PI <= 0.01 && Math.abs(Math.round(round)) >= 1; })(),
  };
};
// the rules an entry (or a level-wide field) breaks: [text]
export const brokenRules = (key, e, facts) => {
  const def = FIELDS[key], out = [];
  const span = (isPlaced(def) && spanOf(def, e)) || [0, 0];
  for (const id of def.rules || []) {
    if (e && e.road === 'side' && ['straight', 'level', 'clearOfExits', 'clearOfEnds', 'noBridge'].includes(id)) continue; // (the expressway's)
    if (RULES[id].broken(facts, e || {}, span)) out.push(RULES[id].text);
  }
  return out;
};

// ---- checking a level against the schema -----------------------------------------------------------
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// what is wrong with a setting's value: [text]
const wrongNumber = (S, v) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'a number';
  if (S.int && !Number.isInteger(v)) return 'a whole number';
  if (S.min !== undefined && v < S.min) return 'at least ' + S.min;
  if (S.max !== undefined && v > S.max) return 'at most ' + S.max;
  return null;
};
export const checkSetting = (S, v, name, out = []) => {
  const bad = (text) => { out.push(name + ': ' + text); return out; };
  if (S.alt && (S.alt.type === 'list' ? Array.isArray(v) : isObject(v))) return checkSetting({ type: S.alt.type || 'object', ...S.alt }, v, name, out);
  switch (S.type) {
    case 'number': case 'metres': { const w = wrongNumber(S.type === 'metres' ? {} : S, v); if (w) bad(w + ' (it is ' + JSON.stringify(v) + ')'); break; }
    case 'flag': if (typeof v !== 'boolean') bad('true or false'); break;
    case 'text': if (typeof v !== 'string') bad('text'); break;
    case 'colour': if (S.numeric ? !(Number.isInteger(v) && v >= 0 && v <= 0xffffff) : !(typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v))) bad(S.numeric ? 'a colour, as a number' : 'a colour, as #rrggbb'); break;
    case 'choice': if (!S.choices.some(c => choiceValue(c) === v)) bad('"' + v + '" is not one of ' + S.choices.map(choiceValue).join(', ')); break;
    case 'lane': if (!(Number.isInteger(v) && v >= 0 && v < 16) && !(S.shoulders && (v === 'left' || v === 'right'))) bad('a lane number' + (S.shoulders ? ', or left / right (a shoulder)' : '')); break;
    case 'lanes':
      if (!Array.isArray(v) || !v.length || !v.every(l => Number.isInteger(l) && l >= 0 && l < 16)) bad('a list of lane numbers');
      else if (S.span && (v.length !== 2 || v[0] > v[1])) bad('[first, last]');
      else if (S.width && v[1] !== v[0] + S.width - 1) bad(S.width + ' lanes wide: [n, n + ' + (S.width - 1) + ']');
      break;
    case 'range':
      if (!isObject(v) || wrongNumber(S, v.min) || wrongNumber(S, v.max)) bad('{ min, max }' + (S.min !== undefined ? ', each from ' + S.min + ' to ' + S.max : ''));
      else if (v.max < v.min) bad('max no less than min');
      break;
    case 'mix':
      if (!isObject(v)) { bad('{ kind: weight }'); break; }
      for (const [kind, w] of Object.entries(v)) {
        if (!S.choices.includes(kind)) bad('there is no kind called "' + kind + '"');
        else if (!(typeof w === 'number' && w >= 0)) bad(kind + ': a weight of 0 or more');
      }
      break;
    case 'object':
      if (!isObject(v)) { bad('a { } of settings'); break; }
      checkSettings(S.settings, v, name, out);
      break;
    case 'list':
      if (!Array.isArray(v)) { bad('a list'); break; }
      if (S.length && v.length !== S.length) bad(S.length + ' of them');
      v.forEach((item, i) => (S.item ? checkSetting(S.item, item, name + '[' + i + ']', out) : isObject(item) ? checkSettings(S.settings, item, name + '[' + i + ']', out) : bad('[' + i + ']: a { } of settings')));
      break;
    default: break; // (json: anything)
  }
  return out;
};
// ...and with an object of settings: each one there checked, each required one there, none unknown
const PLACE_KEYS = ['road', 'exit'];
export const checkSettings = (settings, e, name, out = [], known = []) => {
  for (const [k, S] of Object.entries(settings || {})) {
    if (e[k] === undefined) { if (S.required && (!S.when || S.when(e))) out.push(name + ': needs "' + k + '"'); } else checkSetting(S, e[k], name + '.' + k, out);
  }
  for (const k of Object.keys(e)) if (!(settings && settings[k]) && !known.includes(k)) out.push(name + ': the schema knows no "' + k + '" here');
  return out;
};
// everything the schema finds wrong with a level: [{ key, i, text }] (i: which entry, -1 for the field itself).
// rules: false leaves the rules out (only shapes, types, ranges and choices)
export const checkLevel = (level, { rules = true } = {}) => {
  const out = [], facts = rules ? roadFacts(level) : null;
  const say = (key, i, texts) => { for (const text of texts) out.push({ key, i, text }); };
  for (const [key, def] of Object.entries(FIELDS)) if (def.required && level[key] === undefined) say(key, -1, [key + ': every level needs one']);
  for (const [key, v] of Object.entries(level)) {
    const def = FIELDS[key];
    if (!def) { say(key, -1, [key + ': the schema knows no such field']); continue; }
    if (def.alt && isObject(v)) { say(key, -1, checkSettings(def.alt.settings, v, key)); continue; }
    if (def.shape === 'flag') { if (typeof v !== 'boolean') say(key, -1, [key + ': true or false']); }
    else if (def.shape === 'number' || def.shape === 'text' || def.shape === 'choice' || def.shape === 'mix') say(key, -1, checkSetting({ ...def, type: def.shape }, v, key));
    else if (def.shape === 'object' || def.shape === 'timed') say(key, -1, isObject(v) ? checkSettings(def.settings, v, key) : [key + ': a { } of settings']);
    else if (isList(def) !== Array.isArray(v)) say(key, -1, [key + (isList(def) ? ': a list [ ]' : ': one { }, not a list')]);
    else {
      const list = entriesOf(level, key);
      if (def.max && list.length > def.max) say(key, -1, [key + ': ' + def.max + ' at most']);
      list.forEach((e, n) => {
        const i = isList(def) ? n : -1, name = key + (i >= 0 ? ' #' + (n + 1) : '');
        if (!isObject(e)) { say(key, i, [name + ': a { } of settings']); return; }
        const place = placeOf(def, e), keys = [...PLACE_KEYS];
        if (isPlaced(def)) {
          if (!place) { say(key, i, [name + ': it has no place (' + (def.ends || (def.shape === 'stretch' ? ['from', 'to'] : def.shape === 'world' ? ['x', 'z'] : [def.pos || 's'])).join(', ') + ')']); return; }
          if (place.type === 'stretch') { keys.push(place.a, place.b); if (!(e[place.a] < e[place.b])) say(key, i, [name + ': ' + place.a + ' before ' + place.b]); }
          if (place.type === 'point') keys.push(place.p);
          if (e.road !== undefined && e.road !== 'side') say(key, i, [name + ': road is "side", or left out']);
          if (e.road === 'side' && def.road !== 'both') say(key, i, [name + ': there are none on a side road (only on the expressway)']);
          if (e.exit !== undefined && !(Number.isInteger(e.exit) && e.exit >= 0)) say(key, i, [name + ': exit is which exit, from 0']);
        }
        say(key, i, checkSettings(def.settings, e, name, [], keys));
        if (facts) say(key, i, brokenRules(key, e, facts).map(text => name + ': ' + text));
      });
      continue;
    }
    if (facts && (def.rules || []).length) say(key, -1, brokenRules(key, null, facts).map(text => key + ': ' + text));
  }
  return out;
};

// ---- loading and saving, as the editor does ---------------------------------------------------------------
// loadLevel: the editor's working copy of a level (a copy: the game's own is never touched). saveLevel: what
// the editor writes out: the working copy with what the editing left empty taken out again (a list with nothing
// in it that the level did not start with, a setting cleared). A level that is opened and saved comes out as it
// went in: scripts/.schema-check.mjs holds every level in ./levels to that.
export const loadLevel = (raw) => {
  const level = structuredClone(raw);
  Object.defineProperty(level, '__empties', { value: new Set(Object.keys(level).filter(k => Array.isArray(level[k]) && !level[k].length || (isObject(level[k]) && !Object.keys(level[k]).length))), enumerable: false });
  return level;
};
export const saveLevel = (level) => {
  const out = {}, kept = level.__empties || new Set();
  for (const [k, v] of Object.entries(level)) {
    if (v === undefined || v === null) continue;
    const empty = (Array.isArray(v) && !v.length) || (isObject(v) && !Object.keys(v).length);
    if (empty && !kept.has(k) && !(FIELDS[k] && FIELDS[k].required)) continue; // (emptied by the editing)
    out[k] = structuredClone(v);
  }
  return out;
};
// reading and writing one setting of an entry, as the editor's forms do: writing back what was read changes nothing
export const readSetting = (e, k) => e[k];
export const writeSetting = (e, k, S, v) => {
  const empty = v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));
  if (empty && !S.required) delete e[k];
  else if (!empty) e[k] = S.type === 'number' && S.int ? Math.round(v) : v;
  return e;
};
export const initialValue = initial;
// a level-wide field, as a setting (for the editor's forms: a "timed" field is an object of settings)
export const asSetting = (def) => ({ ...def, type: def.shape === 'timed' ? 'object' : def.shape });
