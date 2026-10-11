// Headless: drives a level with burst water mains in a ghost car and reports the player's wetness at each step
// along the first main: on its water, then the wet tyres after it, then dry.
//   node scripts/delivery-wet-check.mjs [level]
import { boot } from './delivery-headless.mjs';
const id = process.argv[2] || 'backlot';
const g = await boot(); const { Hazards } = await g.load('hazards.js');
try {
  const level = g.select(id);
  g.cars.selectCar("commuter"); Object.defineProperty(g.Game, "canStart", { get: () => true }); g.Game.load(); g.Game.start(); g.Player.testGhost = true; g.drive(1, 0); g.run(0.1);
  const main = Hazards.mains[0]; const W = g.CONFIG.waterMain; W.on = 1e9; W.off = 0;
  console.log(`${id}: first main ${main.from.toFixed(0)}..${main.to.toFixed(0)} m, wetAfter ${W.wetAfter}`);
  let last = '';
  g.run(120, () => {
    const P = g.Player;
    if (P.s > main.to + W.wetAfter + 30) return true;
    if (P.s < main.from - 20) return false;
    P.lat = g.track.Track.laneOffset(main.lane, P.s); // keep it in the main's lane
    const row = `onWater ${P.onWater} wet ${P.wetTyres.toFixed(2)}`;
    if (Math.floor(P.s / 8) !== Math.floor((P._ls ?? -1) / 8)) console.log(`s=${P.s.toFixed(0)} on=${main.on} ${row}`);
    P._ls = P.s; last = row;
    return false;
  });
} finally { await g.close(); }
