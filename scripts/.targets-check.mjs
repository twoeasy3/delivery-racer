// A check of the TANK RAGE targets (Targets in src/delivery/pickups.js; how one stands: CONFIG.target, a theme's
// "target", a target's own). On every level that has any, and on the testbed in every theme:
//   - each target is where its settings say (the pavement's edge and its offset), and rendering draws it from
//     that alone (render/items.js reads the target's lat and look: no offset or height of its own);
//   - it is clear of the road (beyond the pavement by more than the ring, or carried over the tallest car; never
//     over a lane), of every other road (a side road, another stretch of the expressway, a junction's arms), and
//     not in a tunnel, on a bridge or beside a water stage;
//   - a package thrown from the nearest lane, 35 m short of it at 30 m/s, lands on it.
//   node scripts/.targets-check.mjs [id ...]      (the levels to check: all of them if none is named)
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ ownAll: true });
const { Targets } = await g.load('pickups.js');
const { Packages } = await g.load('packages.js');
const { THEMES } = await g.load('themes.js');
const { CARS } = g.cars;
const CONFIG = g.CONFIG, T = CONFIG.target;
let failures = 0, count = 0;
const fail = (what) => { failures++; console.log('  FAIL  ' + what); };
const tallest = Math.max(...CARS.map(c => c.height));
const RING = 1.3 + 0.22; // (the ring's radius, out to its rim: render/pickupModels.js)

// rendering takes the position from logic: nothing in render/ works a target's place out for itself
const drawn = readFileSync(new URL('../src/delivery/render/items.js', import.meta.url), 'utf8');
const maker = drawn.slice(drawn.indexOf('const makeTarget'), drawn.indexOf('// a bridge: a truss'));
if (!/Track\.toWorld\(t\.s, t\.lat, tmp\)/.test(maker) || !/look\.height/.test(maker) || /targetOffset|2\.7/.test(maker)) fail('render/items.js makeTarget does not draw the target where Targets says');
else console.log('  ok    render/items.js draws each target at its (s, lat) and height from Targets');
console.log('  (the tallest garage car is ' + tallest + ' m; a ring nearer than ' + T.clear + ' m to the pavement is carried at ' + T.headroom + ' m or more)');
if (T.headroom - RING < tallest + 0.2) fail('CONFIG.target.headroom does not clear the tallest car');

const a = {}, b = {};
const checkLevel = (level, label) => {
  g.select(level);
  g.Game.evil = false;
  g.Game.start();
  const Track = g.track.Track, Player = g.Player, theme = THEMES[level.theme] || THEMES.city;
  const bad = [];
  for (const problem of Track.problems) if (/^target/.test(problem)) bad.push(problem);
  (level.targets || []).forEach((spec, i) => {
    const t = Targets.items[i], name = 'target at ' + spec.s + ' ' + spec.side + (spec.road === 'side' ? ' (side road)' : '');
    const s = Track.place(spec), side = spec.side === 'left' ? -1 : 1, look = t.look;
    count++;
    // where its settings say
    const want = { offset: CONFIG.targetOffset, ...T, ...(theme.target || {}), ...Object.fromEntries(Object.entries(spec).filter(([k]) => ['offset', 'height', 'style', 'base', 'arm', 'beam'].includes(k))) };
    const edge = side < 0 ? Track.lo(s) : Track.hi(s);
    if (Math.abs(t.lat - (edge + side * want.offset)) > 1e-6 || t.s !== s) bad.push(name + ': not at its offset from the pavement (' + t.lat.toFixed(2) + ')');
    if (look.style !== want.style || look.height < want.height) bad.push(name + ': not standing as set (' + JSON.stringify(look) + ')');
    // clear of the road
    const laneEdge = side < 0 ? Track.laneLo(s) : Track.laneHi(s);
    if ((t.lat - laneEdge) * side < RING - 0.4) bad.push(name + ': over a lane');
    if (look.offset < T.clear && look.height - RING < tallest + 0.2) bad.push(name + ': within the car\'s reach (' + look.offset + ' m off, ' + look.height + ' m up)');
    if (look.style === 'gantry' && look.offset + look.arm < 0.3) bad.push(name + ': its mast stands on the shoulder');
    if (look.style === 'wall' && look.base > look.height - RING + 0.05) bad.push(name + ': its wall is taller than it is');
    // not in a tunnel, on a bridge, at a junction, or beside the water
    if (Track.tunnel(s) > 0) bad.push(name + ': in a tunnel');
    if (Track.onBridge(s)) bad.push(name + ': on a bridge');
    if (Track.water(s) > 0) bad.push(name + ': beside a water stage');
    // clear of every other road: the ring, and a gantry's mast
    const spots = [[t.lat, RING]];
    if (look.style === 'gantry') spots.push([t.lat + side * look.arm, 0.4]);
    for (const [lat, r] of spots) {
      Track.toWorld(s, lat, a);
      const own = Math.abs(lat), main = Track.mainDistance(a.x, a.z), sideRoad = Track.sideDistance(a.x, a.z);
      const mainHalf = Math.max(Track.hi(0), -Track.lo(0)) + CONFIG.laneWidth, sideHalf = CONFIG.laneWidth * 2 + Track.shoulder;
      if (Track.isMain(s)) {
        if (main < own - 3) bad.push(name + ': nearer another stretch of the road than its own (' + main.toFixed(1) + ' m)');
        if (sideRoad < sideHalf + r) bad.push(name + ': on a side road (' + sideRoad.toFixed(1) + ' m from its middle)');
      } else if (main < mainHalf + r) bad.push(name + ': on the expressway (' + main.toFixed(1) + ' m from its middle)');
      for (const j of Track.junctions) {
        for (const arm of j.arms) {
          const dx = a.x - j.centre.x, dz = a.z - j.centre.z, along = dx * arm.dir.x + dz * arm.dir.z, across = Math.abs(dx * arm.dir.z - dz * arm.dir.x);
          if (along > 0 && along < arm.length && across < j.half + r) bad.push(name + ': on a junction\'s arm');
        }
      }
    }
    // a fair throw: from the nearest lane going our way
    g.Game.start();
    for (const car of g.Traffic.cars) car.active = false;
    const [first, last] = Track.laneRange(1, s - 35), lane = side < 0 ? first : last;
    Object.assign(Player, { s: s - 35, lat: Track.laneOffset(lane, s - 35), speed: 30, ghost: 99, launching: false });
    Track.toWorld(Player.s, Player.lat, a);
    Track.toWorld(t.s, t.lat, b);
    const far = Math.hypot(b.x - a.x, b.z - a.z);
    g.Game.tankPieces = 0;
    Packages.reset();
    Packages.throwOne();
    for (let n = 0; n < 90 && !Targets.items[i].used; n++) { Player.s += 30 / 60; Packages.update(1 / 60); }
    g.FxQueue.length = 0;
    if (!Targets.items[i].used) bad.push(name + ': a package thrown from lane ' + lane + ', ' + far.toFixed(0) + ' m off, does not land on it');
    else if (g.Game.tankPieces !== 1) bad.push(name + ': hit, but no piece of the tank found');
    if (far > CONFIG.throwRange * 0.75) bad.push(name + ': a long throw from the nearest lane (' + far.toFixed(0) + ' m)');
  });
  const stands = [...new Set(Targets.items.map(t => t.look.style + ' ' + t.look.offset + ' m off, ' + t.look.height + ' m up' + (t.look.beam ? ', beam' : '')))].join('; ');
  if (bad.length) { for (const line of bad) fail(label + ': ' + line); } else console.log('  ok    ' + label + ': ' + Targets.items.length + ' target' + (Targets.items.length === 1 ? '' : 's') + ' (' + stands + ')');
};

const named = process.argv.slice(2);
const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)].filter(l => (l.targets || []).length);
console.log('Every level with targets');
for (const level of all.filter(l => !named.length || named.includes(l.id))) checkLevel(level, level.id + ' (' + (level.theme || 'city') + ')');
if (!named.length) {
  console.log('The testbed in every theme');
  for (const theme of Object.keys(THEMES)) checkLevel({ ...g.levels.HIDDEN_LEVELS.testbed, theme }, 'testbed as ' + theme);
}
console.log(failures ? failures + ' FAILED' : 'all ' + count + ' targets pass');
await g.close();
process.exit(failures ? 1 : 0);
