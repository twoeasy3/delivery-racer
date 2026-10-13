// Times a level (any id: on the menu, hidden, or an event's) in the cars and ECUs named: a clean run, flat out as a ghost
// down the starting lane, nothing in its way (as scripts/level-clocks.mjs times a level's clock, cleanrun.js), the car
// driven at that ECU as a free try at the player's own ECU is (the level's `ownEcu`). The Concept Strike's levels
// (CHECKLIST 224) were sized by it.
//   node scripts/strike-times.mjs back-roads fishbowl:1 fishbowl:5 windsong:5
import { boot } from './delivery-headless.mjs';

const args = process.argv.slice(2), id = args[0], runs = args.slice(1).map(a => a.split(':'));
const g = await boot({ ownAll: true });
try {
  const { Progress } = await g.load('progress.js');
  const { cleanRun } = await g.load('cleanrun.js');
  const { STAGE_LEVELS } = await g.load('events.js');
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS), ...STAGE_LEVELS];
  const level = all.find(l => l.id === id);
  if (!level) throw new Error('no such level: ' + id);
  for (const [car, ecu] of runs) {
    const was = { car: level.car, ownEcu: level.ownEcu };
    Progress.data.maxed = []; (Progress.data.blueprints ||= {})[car] = (Number(ecu) - 1) * 5;
    Object.assign(level, { car, ownEcu: true });
    g.select(level);
    let air = 0, airAt = 0, hurt = 0; const marks = []; const upd = g.Game.update.bind(g.Game); let tt = 0, next = 0;
    g.Game.update = (dt) => { upd(dt); tt += dt; if (g.Player.health < g.Player.maxHealth - 0.01 && !hurt) hurt = Math.round(g.Player.s); if ((g.Player.air || 0) > air) { air = g.Player.air; airAt = g.Player.s; } if (g.Player.s >= next) { if (process.env.TRACE) marks.push(Math.round(g.Player.s) + 'm@' + tt.toFixed(1) + 's ' + g.Player.speed.toFixed(0)); next += (g.Player.s > 540 && g.Player.s < 720 ? 10 : 100); } };
    if (process.env.SOLID) { // (a solid car, no traffic and no obstacles: where it leaves the ground, lands, and is hurt)
      const bare = { ...level, traffic: {}, obstacles: [], id: level.id };
      g.select(bare); g.cars.selectCar(car); g.Game.evil = false; g.Player.testGhost = false; g.Game.start(); g.drive(1, 0);
      let up = null, flights = [], last = g.Player.health, hits = [];
      const t = g.run(400, () => {
        const P = g.Player;
        if ((P.air || 0) > 0.3 && !up) up = { from: Math.round(P.s), top: 0 };
        if (up) { up.top = Math.max(up.top, P.air); if (!(P.air > 0.05)) { flights.push(up.from + '-' + Math.round(P.s) + ' m, ' + up.top.toFixed(1) + ' m up'); up = null; } }
        if (P.health < last - 0.5) hits.push(Math.round(P.s) + ' m: -' + Math.round(last - P.health));
        last = P.health;
        return g.Game.state !== 'playing';
      });
      console.log(`${id}  ${car} ECU${ecu} SOLID, no traffic: ${g.Game.outcome || 'still driving'} after ${t.toFixed(1)} s; flights ${flights.join('; ') || 'none'}; hurt ${hits.join(', ') || 'never'}; health ${Math.round(g.Player.health)}/${Math.round(g.Player.maxHealth)}`);
      Object.assign(level, was);
      continue;
    }
    const run = cleanRun();
    g.Game.update = upd;
    if (marks.length) console.log('   ' + marks.join(' | '));
    Object.assign(level, was);
    console.log(`${id}  ${car} ECU${ecu}: ${run.delivered ? run.time.toFixed(1) + ' s' : 'NOT DELIVERED (' + run.outcome + ')'}` + (air > 0.3 ? `  (highest in the air ${air.toFixed(1)} m at ${Math.round(airAt)} m)` : ''));
  }
} finally { await g.close(); }
process.exit(0);
