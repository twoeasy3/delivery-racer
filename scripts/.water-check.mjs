// A check of the water stages (src/delivery/water.js) on the amphibious levels: the player's amphibious car
// crosses without ever stopping; traffic that can't float stops short of the water on its shoulder and never
// gets in; amphibious traffic gets across; boats stay on the water; and an amphibious level won't start
// in a car that doesn't float.
//   node scripts/.water-check.mjs [id ...]      (the levels to drive: every amphibious one if none is named)
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport', 'floatvan'] });
const { Water } = await g.load('water.js');
const { Progress } = await g.load('progress.js');
const { AMPHIBIOUS_LEVELS } = g.levels;
const CONFIG = g.CONFIG;
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const classOf = (kind) => CONFIG.vehicles[kind].boat ? 'boat' : CONFIG.vehicles[kind].amphibious ? 'amphibious' : 'land';

const named = process.argv.slice(2);
for (const level of AMPHIBIOUS_LEVELS.filter(l => !named.length || named.includes(l.id))) {
  console.log(level.id + ' (' + g.levels.levelName(level) + ')');
  let seed = 12345;
  Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  g.select(level);
  g.cars.selectCar('floatvan');
  g.Game.evil = false;
  g.Game.start();
  const Track = g.track.Track, Player = g.Player, cars = g.Traffic.cars;
  check(g.Game.state === 'playing' && g.cars.CAR.amphibious, 'starts in an amphibious car (' + g.cars.CAR.name + ')');
  g.drive(1, 0);
  const tally = { landInWater: 0, boatOnLand: 0, crossedIn: new Set(), crossedOut: new Set(), queued: new Set(), moored: new Set(), slowest: Infinity, afloatFor: 0, waitLat: 0, seen: { land: 0, boat: 0, amphibious: 0 } };
  const was = new Map(); // each car's depth last step
  let t = 0, minAfloatSpeed = Infinity, floated = 0, landed = 0, wasAfloat = false, worstQueueLane = 0;
  while (g.Game.state === 'playing' && t < 600) {
    Object.assign(Player, { ghost: 99, health: Player.maxHealth });
    // (holding its lane, as a driver would against a current)
    const [first] = Track.laneRange(1, Player.s), off = Track.laneOffset(first, Player.s) - Player.lat;
    g.drive(1, Math.max(-1, Math.min(1, off * 0.6)) * (Track.mirrored ? -1 : 1));
    g.Game.busts = 0;
    g.Game.time = 0;
    g.Game.update(1 / 60);
    g.FxQueue.length = 0;
    t += 1 / 60;
    if (Player.afloat !== wasAfloat) { wasAfloat = Player.afloat; if (wasAfloat) floated++; else landed++; }
    if (t > 3 && Player.speed < tally.slowest) { tally.slowest = Player.speed; tally.slowestAt = Math.round(Player.s) + ' m, ' + g.Game.state + (Player.active ? '' : ', no car'); }
    if (Player.afloat) { tally.afloatFor += 1 / 60; minAfloatSpeed = Math.min(minAfloatSpeed, Player.speed); }
    for (const car of cars) {
      if (!car.active || car.junction || !Track.isMain(car.s)) { was.delete(car); continue; }
      const cls = classOf(car.kind), d = Track.water(car.s);
      tally.seen[cls]++;
      if (cls === 'land' && d > 0.15) tally.landInWater++;
      if (cls === 'boat' && d < 0.5) tally.boatOnLand++;
      if (cls === 'amphibious') {
        const before = was.get(car);
        if (before !== undefined && before.kind === car.kind && Math.abs(before.s - car.s) < 2) {
          if (before.d === 0 && d > 0) tally.crossedIn.add(car);
          if (before.d > 0 && d === 0) tally.crossedOut.add(car);
        }
      }
      was.set(car, { d, s: car.s, kind: car.kind });
      if (car.waterWait != null && Math.abs(car.vs) < 0.2) {
        (cls === 'boat' ? tally.moored : tally.queued).add(car.kind + '@' + Math.round(car.waterWait));
        // (how far into the lanes a waiting vehicle reaches: it should be out on the shoulder)
        const into = car.dir > 0 ? Track.laneHi(car.s) - (car.lat - car.hw) : (car.lat + car.hw) - Track.laneLo(car.s);
        if (into > worstQueueLane) { worstQueueLane = into; tally.worst = car.kind + ' at ' + Math.round(car.s) + ' m, lat ' + car.lat.toFixed(1) + ' (lanes to ' + Track.laneHi(car.s).toFixed(1) + ', road to ' + Track.hi(car.s).toFixed(1) + '), dir ' + car.dir + ', t ' + t.toFixed(0) + ', player at ' + Math.round(Player.s); }
      }
    }
  }
  check(g.Game.outcome === 'delivered', 'the amphibious car gets to the end (' + (g.Game.outcome || 'still driving') + ' after ' + t.toFixed(0) + ' s)');
  check(floated >= 1, 'it floated ' + floated + ' time(s), landed ' + landed + ', afloat for ' + tally.afloatFor.toFixed(0) + ' s');
  check(tally.slowest > 5, 'it never stopped: slowest ' + tally.slowest.toFixed(1) + ' m/s at ' + tally.slowestAt + ' (afloat, ' + minAfloatSpeed.toFixed(1) + ' at least; top speed ' + g.cars.CAR.maxSpeed + ')');
  check(tally.landInWater === 0, 'no vehicle that can\'t float was ever in the water (' + tally.landInWater + ' car-steps; ' + tally.seen.land + ' seen on land)');
  check(tally.boatOnLand === 0, 'no boat was ever out of the water (' + tally.boatOnLand + ' boat-steps; ' + tally.seen.boat + ' seen)');
  console.log('        queued at the water: ' + tally.queued.size + ' (' + [...tally.queued].slice(0, 6).join(', ') + '); boats tied up: ' + tally.moored.size);
  if (tally.seen.land) check(tally.queued.size > 0, 'traffic that can\'t float stopped and waited at the water\'s edge');
  check(worstQueueLane < 1.2, 'the waiting traffic keeps out of the lanes (reaching ' + worstQueueLane.toFixed(2) + ' m into the kerb lane at most' + (tally.worst ? ': ' + tally.worst : '') + ')');
  if (tally.seen.amphibious) check(tally.crossedIn.size > 0 || tally.crossedOut.size > 0, 'amphibious traffic drove into the water (' + tally.crossedIn.size + ') and out of it (' + tally.crossedOut.size + ')');
}

// an amphibious level won't start in a car that doesn't float, with no amphibious car owned
{
  const level = AMPHIBIOUS_LEVELS[0];
  Progress.data.cars = ['commuter', 'sport'];
  Progress.data.car = 'sport';
  g.cars.selectCar('sport');
  g.Game.toMenu();
  g.select(level);
  g.Game.start();
  check(g.Game.state !== 'playing', 'with no amphibious car owned, ' + g.levels.levelName(level) + ' does not start (state: ' + g.Game.state + ')');
  // ...and with one owned but another car in use, it starts in the amphibious one
  Progress.data.cars = ['commuter', 'sport', 'herald'];
  g.Game.start();
  check(g.Game.state === 'playing' && g.cars.CAR.id === 'herald', 'with the Sailing Herald owned and the Sportscompact in use, it starts in the ' + g.cars.CAR.name);
  g.Game.toMenu();
}
// a save from before the amphibious levels (level order 25): one that had delivered everything has the first
// amphibious level open and no more; one part-way through is as it was
{
  const first = g.levels.LEVELS.indexOf(AMPHIBIOUS_LEVELS[0]) + 1; // (levels open, with the first amphibious one)
  const old = (unlocked) => 'DR1.' + btoa(JSON.stringify({ unlocked, levelOrder: 25, cars: ['commuter'], car: 'commuter', money: 5, bestTime: { good: {}, evil: {} } }));
  Progress.importCode(old(43));
  check(Progress.data.unlocked === first, 'an old save with every level open: ' + Progress.data.unlocked + ' open now (the first amphibious level is number ' + first + ')');
  Progress.importCode(old(40));
  check(Progress.data.unlocked === first - 1, 'an old save with the last special level open but not delivered: ' + Progress.data.unlocked + ' open (levels added among the numbered ones since count too)');
  Progress.importCode(old(12));
  check(Progress.data.unlocked === 12, 'an old save part-way through: ' + Progress.data.unlocked + ' open');
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
