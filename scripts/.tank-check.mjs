// A check of TANK RAGE's two tanks (src/delivery/cars.js AMPHIBIOUS_TANK; Player.startTank, Player.rageTank):
//   - on each amphibious level, five targets hit (the level's own, round again: the pieces carry over as they do
//     from level to level) start the rage in the Amphibious Tank; it drives every water stage, in and out, without
//     stopping or sinking, slower afloat than ashore, and crushes a boat in its way as the Tank crushes a car;
//   - on an ordinary level the same five start the rage in the Tank, as ever;
//   - the Amphibious Tank is no garage car: not for sale, not owned, nothing of it in saved progress, and a new
//     run starts without it.
//   node scripts/.tank-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
const { Targets } = await g.load('pickups.js');
const { Packages } = await g.load('packages.js');
const { Progress } = await g.load('progress.js');
const { AMPHIBIOUS_TANK, CARS, EARNED_CARS, SECRET_CARS, LEVEL_CARS, garageCars, rageTankFor } = g.cars;
const CONFIG = g.CONFIG;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const seed = () => { let n = 12345; Math.random = () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296; };

// throw a package at each of the level's targets in turn until `want` pieces are found (the targets set up
// again when they run out, as a new run would); returns how many throws landed
const hitTargets = (want) => {
  const Track = g.track.Track, Player = g.Player;
  let hits = 0;
  while (g.Game.tankPieces < want) {
    const i = Targets.items.findIndex(t => !t.used);
    if (i < 0) { Targets.reset(); continue; }
    const t = Targets.items[i], [first, last] = Track.laneRange(1, t.s - 35);
    for (const car of g.Traffic.cars) car.active = false;
    Object.assign(Player, { s: t.s - 35, lat: Track.laneOffset(t.side < 0 ? first : last, t.s - 35), speed: 30, launching: false });
    Packages.reset();
    Packages.throwOne();
    for (let n = 0; n < 90 && !t.used; n++) { Player.s += 0.5; Packages.update(1 / 60); }
    g.FxQueue.length = 0;
    if (!t.used) return -1;
    hits++;
  }
  return hits;
};
const begin = (level) => {
  seed();
  g.select(level);
  if (level.amphibious) g.cars.selectCar('floatvan');
  else g.cars.selectCar('commuter');
  Progress.data.tankPieces = 0;
  g.Game.evil = false;
  g.Game.start();
};

for (const level of g.levels.AMPHIBIOUS_LEVELS) {
  console.log(level.id + ' (' + g.levels.levelName(level) + ')');
  begin(level);
  const Track = g.track.Track, Player = g.Player;
  check(g.cars.CAR.amphibious && Player.tank === 0 && !Player.rageTank, 'starts in an amphibious car (' + g.cars.CAR.name + '), no rage');
  check(rageTankFor(level) === AMPHIBIOUS_TANK, 'the level\'s rage tank is the Amphibious Tank');
  const early = hitTargets(CONFIG.tankPieces - 1);
  check(early === CONFIG.tankPieces - 1 && Player.tank === 0, 'four targets hit: four pieces, no rage yet');
  const last = hitTargets(CONFIG.tankPieces);
  check(last === 1 && Player.tank === 1 && Player.rageTank === AMPHIBIOUS_TANK, 'the fifth starts TANK RAGE in the ' + (Player.rageTank ? Player.rageTank.name : 'Tank'));
  check(Player.health === Player.maxHealth, 'fully repaired');
  // every water stage, driven in the rage from the start of the level
  Object.assign(Player, { s: 0, lat: Track.laneOffset(Track.laneRange(1, 0)[0], 0), speed: 0, launching: true });
  g.Game.time = 0;
  for (const t of Targets.items) t.used = true;
  let t = 0, wasAfloat = false, floated = 0, landed = 0, slowest = Infinity, slowestAt = 0, fastestAfloat = 0, fastestAshore = 0, crushed = 0, boatTried = 0, target = null, soaked = 0, sunk = 0, ashore = 0, afloatFor = 0, afloatTime = 0, afloatRun = 0;
  const end = Math.max(...Track.waters.map(w => w.to)) + 60;
  while (g.Game.state === 'playing' && Player.s < Math.min(end, Track.length - 20) && t < 400) {
    const [first] = Track.laneRange(1, Player.s), off = Track.laneOffset(first, Player.s) - Player.lat;
    g.drive(1, Math.max(-1, Math.min(1, off * 0.6)) * (Track.mirrored ? -1 : 1));
    g.Game.busts = 0;
    g.Game.time = 0;
    // (no turbo, so its own pace shows; and whatever it rams head-on on the way, a share of its health each time,
    // is made good: this is a check of the water, which must cost it nothing. The water's own damage is looked at apart)
    Player.turbo = 0;
    const before = Player.health, rams = g.Game.wrecks;
    g.Game.update(1 / 60);
    if (Player.afloat && Player.health < before && Math.abs(before - Player.health - Player.maxHealth * CONFIG.tankHeadOnDamage) > 0.01 && g.Game.wrecks === rams) soaked += before - Player.health;
    Player.health = Player.maxHealth;
    // (a level's own dangers ashore, Hippo Ford's elephants, High Water's falling containers, destroy a tank as they do anything: not the water's doing)
    if (g.Game.wrecks > rams) { if (Track.water(Player.s) > 0) sunk++; else ashore++; }
    g.FxQueue.length = 0;
    t += 1 / 60;
    afloatFor = Player.afloat ? afloatFor + 1 / 60 : 0;
    if (Player.afloat) { afloatTime += 1 / 60; afloatRun += Player.speed / 60; }
    if (Player.afloat !== wasAfloat) { wasAfloat = Player.afloat; if (wasAfloat) floated++; else landed++; }
    if (t > 4 && Player.active && Track.water(Player.s) > 0 && Player.speed < slowest) { slowest = Player.speed; slowestAt = Math.round(Player.s); }
    if (afloatFor > 8 && Track.water(Player.s) >= 1) fastestAfloat = Math.max(fastestAfloat, Player.speed);
    if (Track.water(Player.s) === 0) fastestAshore = Math.max(fastestAshore, Player.speed);
    // a boat put in its way, once it is well afloat: it is crushed, and the tank goes on
    if (!target && Player.afloat && Track.water(Player.s + 40) >= 1 && boatTried < 3) {
      const boat = g.Traffic.cars.find(c => c.active && CONFIG.vehicles[c.kind]?.boat && c.health > 0 && !c.junction);
      if (boat) {
        boatTried++;
        Object.assign(boat, { s: Player.s + 14, lat: Player.lat, waterWait: null });
        target = { boat, kind: boat.kind, until: t + 2.5, health: Player.health };
      }
    }
    if (target && (target.boat.health <= 0 || !target.boat.active || target.boat.kind !== target.kind)) { crushed++; target = null; }
    else if (target && t > target.until) target = null;
  }
  check(floated === Track.waters.filter(w => w.to > 20).length && landed >= floated - 1 && Player.s >= Math.min(end, Track.length - 20) - 1, 'crossed ' + floated + ' water stage' + (floated === 1 ? '' : 's') + ' in the rage (' + t.toFixed(0) + ' s)');
  check(slowest > 3 && afloatRun / afloatTime > 20, 'never stopped in the water (slowest ' + slowest.toFixed(1) + ' m/s at ' + slowestAt + ' m, ramming; ' + (afloatRun / afloatTime).toFixed(1) + ' m/s afloat on average)');
  check(Player.tank === 1 && Player.rageTank === AMPHIBIOUS_TANK && sunk === 0 && soaked === 0, 'still the Amphibious Tank, not sunk (the water cost it ' + soaked.toFixed(1) + ' health' + (ashore ? '; destroyed ' + ashore + ' time' + (ashore === 1 ? '' : 's') + ' ashore by the dangers of the level, and set down again still in the rage' : '') + ')');
  const cap = AMPHIBIOUS_TANK.maxSpeed * AMPHIBIOUS_TANK.afloat;
  check(fastestAfloat <= cap + 0.6 && fastestAfloat > cap - 4 && fastestAshore > fastestAfloat + 3, 'slower afloat (' + fastestAfloat.toFixed(1) + ' m/s, its ' + cap.toFixed(1) + ') than ashore (' + fastestAshore.toFixed(1) + ' m/s)');
  check(crushed > 0, 'a boat in its way is crushed (' + crushed + ' of ' + boatTried + ' put there)');
  // a new run: no rage, no tank
  g.Game.start();
  check(Player.tank === 0 && !Player.rageTank, 'a new run starts without it');
}

for (const id of ['expressway', 'hong-kong']) {
  const level = g.levels.LEVELS.find(l => l.id === id);
  console.log(level.id + ' (' + g.levels.levelName(level) + '): an ordinary level');
  begin(level);
  const Player = g.Player;
  const hits = hitTargets(CONFIG.tankPieces);
  check(hits === CONFIG.tankPieces && Player.tank === 1 && Player.rageTank === null && rageTankFor(level) === null, 'five targets hit start TANK RAGE in the Tank, as ever');
  g.Game.settleTank(true);
  check(Progress.data.tankPieces === 0, 'the pieces are used up');
}

console.log('The garage');
const everyCar = [...CARS, ...EARNED_CARS, ...Object.values(SECRET_CARS), ...Object.values(LEVEL_CARS)];
check(!everyCar.includes(AMPHIBIOUS_TANK) && !everyCar.some(c => c.id === AMPHIBIOUS_TANK.id) && !garageCars().includes(AMPHIBIOUS_TANK), 'the Amphibious Tank is not one of the garage\'s cars, nor a level\'s, nor a secret one');
check(!Progress.owns(AMPHIBIOUS_TANK.id) && !JSON.stringify(Progress.data).includes(AMPHIBIOUS_TANK.id), 'nothing of it is in saved progress');
check(CARS.filter(c => c.tank).length === 1 && CARS.find(c => c.tank).id === 'tank', 'the Tank is still the garage\'s one tank');
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
