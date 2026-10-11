// Headless: the player (made 2.6 m tall) goes at each half of a low bridge, and through the slalom.
//   node scripts/delivery-lowbridge-check.mjs [level]
import { boot } from './delivery-headless.mjs';
const id = process.argv[2] || 'cattle';
const g = await boot(); const { Gambles } = await g.load('gambles.js');
try {
  g.select(id); g.cars.selectCar('commuter');
  Object.defineProperty(g.Game, 'canStart', { get: () => true });
  g.Game.load(); g.Game.start(); g.drive(0, 0); g.run(0.2);
  const P = g.Player, bars = Gambles.bars.slice(0, 2);
  console.log(id, 'bars', bars.map(b => `s=${b.s} lat ${b.lo.toFixed(1)}..${b.hi.toFixed(1)}`).join(' | '), 'clearance', bars[0].clearance);
  const trial = (name, latFor) => {
    P.height = 2.6; P.maxHealth = P.health = 1000; P.ghost = 0; P.testGhost = false; P.speed = 30; P.launching = false;
    for (const b of bars) b.hits = 0;
    P.s = bars[0].s - 15; P.lat = latFor(0);
    for (let i = 0; i < 60 * 4; i++) {
      for (const c of g.Traffic.cars) c.active = false;
      P.lat = P.s < bars[0].s + 30 ? latFor(0) : latFor(1); P.latVel = 0; P.speed = 30; P.ghost = 0;
      g.Game.update(1 / 60);
      if (P.s > bars[1].s + 10) break;
    }
    console.log(name.padEnd(22), 'health lost', (1000 - P.health).toFixed(0), 'hits', bars.map(b => b.hits).join('/'));
  };
  const mid = bars[0].hi;
  trial('straight into bar A', () => (bars[0].lo + bars[0].hi) / 2);
  trial('straight into bar B', () => (bars[1].lo + bars[1].hi) / 2);
  trial('slalom (A clear, B clear)', (k) => { const c = bars[k].lo === bars[0].lo ? bars[1] : bars[0]; return (c.lo + c.hi) / 2; });
} finally { await g.close(); }
