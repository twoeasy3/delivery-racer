// A check of crossing the chevrons at a merge (Track.crossable, physics.js keepOnRoad, Track.transfer): on Back
// Roads' side road the player, steering left, goes over the hatched wedge on to the expressway before the side
// road's end, only where the two pavements meet (not over the grass further back), with no jump in where it is;
// and traffic still merges at the end.
//   node scripts/.merge-cross-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
g.select('back-roads'); g.cars.selectCar('commuter'); g.Game.evil = false;
const T = () => g.track.Track, P = g.Player;
const x = () => T().exits[0];
g.Game.start();
const open = [5, 20, 40].every(q => T().crossable(x().sideEnd - q) !== null), grass = [60, 90].every(q => T().crossable(x().sideEnd - q) === null);
check(open && grass, 'crossable on the last 40 m of the side road, where the pavements meet; not 60 or 90 m back, over the grass');
check(T().crossable(x().exitAt) === null && T().crossable(x().side0 + 10) === null, 'not on the expressway, nor at the start of the side road');
for (const start of [40, 15]) {
  g.Game.start();
  for (const c of g.Traffic.cars) c.active = false;
  Object.assign(P, { s: x().sideEnd - start, lat: 1.8, speed: 20, latVel: 0, ghost: 0, shield: 9 });
  const w = {}, prev = {};
  let jump = 0, crossedAt = null, first = true;
  g.drive(0.5, -1);
  g.run(4, () => {
    T().toWorld(P.s, P.lat, w);
    if (!first) jump = Math.max(jump, Math.hypot(w.x - prev.x, w.z - prev.z) - P.speed / 60);
    first = false;
    Object.assign(prev, { x: w.x, z: w.z });
    if (crossedAt === null && T().isMain(P.s)) crossedAt = P.s;
    return crossedAt !== null && P.s > crossedAt + 20;
  });
  check(crossedAt !== null && crossedAt < x().mergeAt - 3 && jump < 0.2 && P.health > 0,
    `steering left ${start} m before the side road ends: on the expressway at ${crossedAt?.toFixed(0)} (the merge at ${x().mergeAt}), never jumping (${jump.toFixed(2)} m)`);
}
g.drive(0, 0);
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
