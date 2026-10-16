// A check of the two reworked hidden levels, headless (CHECKLIST: Foliage Run without ice, Jungle Highway's crossings).
//   FOLIAGE RUN (autumn): no ice; the level builds with no problems; its harvest traffic: tractor gates (tractors abreast)
//   that always leave a lane, no plain obstacle in a gate's open lane where the player meets it, no fog over a meeting,
//   convoys of shedding cargo trucks; a run in traffic that meets the gates and the shed loads.
//   JUNGLE HIGHWAY (rainforest): its elephant crossings (the elephants as on main, elephants.js untouched): each
//   stretch clear of bridges, fords, exit ramps and fog; how close two elephants can stand along the road (over many
//   starts); the road never closed; an elephant wrecks the car in its way and spares a ghost and a fresh drop; the
//   seconds of warning each crossing gives at speed (seen from SIGHT m: no fog over any).
//   Both: the clean run (the test ghost behind the clocks) delivers.
//   node scripts/.autumn-jungle-check.mjs
import { boot } from './delivery-headless.mjs';

let state = 2026;
const seed = (n) => { state = n >>> 0; };
Math.random = () => {
  state = (state + 0x6D2B79F5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const g = await boot({ cars: ['commuter', 'sport'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const f1 = (x) => Number(x).toFixed(1);
const SIGHT = 250; // m ahead an animal or a tractor in clear air is plainly in view (the chase camera, no fog)
try {
  const { Elephants } = await g.load('elephants.js');
  const { seedRandom } = await g.load('util.js');
  const { cleanRun } = await g.load('cleanrun.js');
  const { CARS } = g.cars;
  const { Game, Player, Traffic, Collision, FxQueue, CONFIG } = g;
  const T = () => g.track.Track;
  const tops = CARS.filter(c => c.maxSpeed).map(c => c.maxSpeed).sort((a, b) => a - b);
  const fast = tops[tops.length - 1];

  // ---------------- FOLIAGE RUN ----------------
  console.log('---- foliage run');
  {
    const L = g.select('foliage-run');
    seed(17); Game.start();
    check(!L.ice && !(T().problems || []).length && Player.active, `no ice (${L.ice ? L.ice.length + ' patches' : 'none'}), no problems, a run starts`);
    // the tractor gates: tractors at the same s, abreast
    const north = [];
    for (let n = T().leftLanes; n < T().laneCount; n++) north.push(n);
    const gates = new Map();
    for (const t of L.tractors) gates.set(t.s, [...(gates.get(t.s) || []), t.lane]);
    // where the player meets one: it sets off as the player comes within CONFIG.spawnMax and trundles at tractorSpeed;
    // the player at v meets it spawnMax * tractorSpeed / (v - tractorSpeed) m on from where it stood
    const meet = (s0, v) => s0 + CONFIG.spawnMax * CONFIG.tractorSpeed / (v - CONFIG.tractorSpeed);
    const run = cleanRun(), avg = T().length / run.time;
    for (const [s0, lanes] of [...gates].sort((a, b) => a[0] - b[0])) {
      const open = north.filter(n => !lanes.includes(n));
      const from = meet(s0, fast), to = meet(s0, avg) + 60;
      const blocked = open.filter(n => L.obstacles.some(o => o.lane === n && o.s > s0 - 10 && o.s < to));
      const fog = (L.fog || []).some(z => z.to + CONFIG.fog.edge > from - 150 && z.from - CONFIG.fog.edge < to);
      check(open.length >= 1 && blocked.length < open.length && !fog,
        `tractors at ${s0} in lane${lanes.length > 1 ? 's' : ''} ${lanes.join(' + ')}: open ${open.join(', ')}; met about ${Math.round(from)} to ${Math.round(meet(s0, avg))} m ` +
        `(at ${f1(fast)} to ${f1(avg)} m/s), nothing in the open lane there, no fog; closing at ${f1(avg - CONFIG.tractorSpeed)} m/s: ${f1(SIGHT / (avg - CONFIG.tractorSpeed))} s from sight`);
    }
    check(L.convoys?.kind === 'cargotruck' && CONFIG.vehicles.cargotruck.sheds && L.traffic.cargotruck > 0,
      `convoys of ${L.convoys.size} cargo trucks every ${L.convoys.every.min}-${L.convoys.every.max} s, shedding (every ${CONFIG.cargo.every.min}-${CONFIG.cargo.every.max} s each, within ${CONFIG.cargo.near} m ahead)`);
    // a run in traffic, flat out down the middle, the car a ghost (so it goes on): what it meets
    seed(21); seedRandom(21); Game.start();
    Player.testGhost = true;
    g.drive(1, 0);
    let shed = 0, tractorsNear = new Set(), convoySeen = new Set();
    const wasGone = new Set(Collision.obstacles.filter(o => o.cargo && o.gone));
    g.run(140, () => {
      for (const o of Collision.obstacles) if (o.cargo && !o.gone && wasGone.has(o)) { shed++; wasGone.delete(o); }
      for (const c of Traffic.cars) {
        if (!c.active) continue;
        if (c.kind === 'tractor' && Math.abs(c.s - Player.s) < 40) tractorsNear.add(c);
        if (c.convoy && Math.abs(c.s - Player.s) < 200) convoySeen.add(c.convoy.id);
      }
      for (const o of Collision.obstacles) if (o.cargo && o.gone) wasGone.add(o);
      return !Player.active || T().finished?.(Player.s);
    });
    check(tractorsNear.size >= 6 && shed >= 3, `a ghost run (${f1(Player.s)} m): passed ${tractorsNear.size} of ${L.tractors.length} tractors, ${convoySeen.size} convoys near, ${shed} loads shed ahead`);
    check(run.delivered, `clean run delivers: ${f1(run.time)} s in the ${run.car} (clock ${L.clock.good} / ${L.clock.evil})`);
  }

  // ---------------- JUNGLE HIGHWAY ----------------
  console.log('---- jungle highway');
  {
    const L = g.select('jungle-highway');
    seed(3); Game.start();
    const E = CONFIG.elephant, zones = L.elephants;
    const count = zones.reduce((n, z) => n + z.count, 0);
    check(Elephants.list.length === count && !(T().problems || []).length, `${count} elephants in ${zones.length} crossings (${zones.map(z => z.from + '-' + z.to + ' x' + z.count).join(', ')}); no problems`);
    // each stretch clear of the bridges, the fords, the exits' ramps and the fog (by 40 m)
    const keep = [...(L.bridges || []), ...(L.fords || []), ...(L.fog || []).map(z => ({ from: z.from - CONFIG.fog.edge, to: z.to + CONFIG.fog.edge })),
      ...(L.exits || []).flatMap(x => [{ from: x.exitAt - 60, to: x.exitAt + 60 }, { from: x.mergeAt - 60, to: x.mergeAt + 60 }])];
    for (const z of zones) {
      const clash = keep.filter(k => k.to + 40 > z.from && k.from - 40 < z.to);
      check(!clash.length, `crossing ${z.from}-${z.to}: clear of bridges, fords, exit ramps, fog by 40 m${clash.length ? ' (NOT: ' + clash.map(k => k.from + '-' + k.to).join(', ') + ')' : ''}`);
    }
    // how close two can stand along the road, over 200 starts; and the road never closed (one at a time across it)
    let closest = Infinity, widest = 0;
    const width = T().hi(0) - T().lo(0);
    for (let k = 0; k < 200; k++) {
      seed(1000 + k); Game.start();
      const ss = Elephants.list.map(e => e.s).sort((a, b) => a - b);
      for (let i = 1; i < ss.length; i++) closest = Math.min(closest, ss[i] - ss[i - 1]);
    }
    // two within this much along the road could stand across each other's way past (a car needs 2 m)
    widest = 2 * E.hw;
    check(closest >= 2 * E.hl + 30 && widest < width - 8,
      `over 200 starts the closest two stand ${f1(closest)} m apart along the road (${f1(closest / fast)} s at ${f1(fast)} m/s, the fastest car); ` +
      `each covers ${f1(widest)} m of the ${f1(width)} m road: ${f1(width - widest)} m to go round`);
    // the warning each crossing gives: seen from SIGHT m in clear air
    seed(3); Game.start();
    const run = cleanRun(), avg = T().length / run.time;
    console.log(`        seen from ${SIGHT} m: ${f1(SIGHT / avg)} s at the clean run's average ${f1(avg)} m/s, ${f1(SIGHT / fast)} s at ${f1(fast)} m/s; ` +
      `a stop from ${f1(fast)} m/s at about 12 m/s/s takes ${f1(fast * fast / 24)} m; across 7 m at ${CONFIG.steerSpeed} m/s steer: ${f1(7 / CONFIG.steerSpeed)} s`);
    check(run.delivered, `clean run delivers through all ${count}: ${f1(run.time)} s in the ${run.car} (clock ${L.clock.good} / ${L.clock.evil})`);
    // in the way of the car: wrecked; a ghost and a fresh drop pass
    const meet = (setup) => {
      seed(5); Game.start();
      for (const c of Traffic.cars) c.active = false;
      const e = Elephants.list[0], lane = T().laneOffset(2, e.s);
      Elephants.list.slice(1).forEach(o => { o.s = -9999; });
      Object.assign(e, { lat: lane + 6, dir: -1, rest: 0 });
      Object.assign(Player, { s: e.s, lat: lane, speed: 0, shield: 0, ghost: 0, active: true });
      setup();
      let wrecked = false;
      for (let i = 0; i < 60 * 10; i++) { setup(); Elephants.update(1 / 60); Collision.check(); FxQueue.length = 0; wrecked ||= !Player.active || Player.health <= 0; }
      return wrecked;
    };
    check(meet(() => {}), `an elephant (${f1(2 * E.hw)} x ${f1(2 * E.hl)} m, ${E.speed} m/s) walking into the stopped car wrecks it`);
    check(!meet(() => { Player.ghost = Math.max(Player.ghost, 1); }), 'a ghost comes through it');
    check(!meet(() => { Player.shield = Math.max(Player.shield, 1); }), 'a car just set down by the helicopter comes through it');
  }
  Game.toMenu();
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
