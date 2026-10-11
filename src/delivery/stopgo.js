// ============================================================================
// STOP / GO ROADWORKS - a level's "stopGo" (see levels.js and CONFIG.stopGo): on a two-way road of
// one lane each way, the oncoming side dug up over a stretch, so both ways take turns through the
// one lane left, the player's. A worker at each end turns a STOP / GO sign: GO the player's way,
// a pause for the last through to clear, GO the other way (coming down the player's lane), a pause,
// and round again. Traffic waits at its STOP (an evil driver may run it); the player may wait there
// too (holding the brake), or chance it and meet what comes the other way. Cones down the middle and
// across the dug-up lane are obstacles (see Collision). How long the works are is the level's (from, to),
// and how long each turn lasts can be too (go, clear: or CONFIG.stopGo's).
// This is what they do; render/stopgo.js draws them.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';

// m either end of the works over which the traffic coming the other way moves over into the open lane, and back
// out of it (traffic waits beyond it, both ways, so as not to meet the last coming through)
const TAPER = 18;

export const StopGo = {
  // { from, to, go, clear (s each lasts), phase: 0 GO the player's way, 1 clearing, 2 GO the other way, 3 clearing; t (s into it) }
  list: [],
  taper: TAPER,

  reset() {
    const G = CONFIG.stopGo;
    this.list = (LEVEL.stopGo || []).map((z, i) => ({ from: Track.place({ s: z.from }), to: Track.place({ s: z.from }) + (z.to - z.from),
      go: z.go ?? G.go, clear: z.clear ?? G.clear, phase: i % 2 ? 2 : 0, t: 0 }));
  },
  update(dt) {
    for (const z of this.list) {
      z.t += dt;
      if (z.t >= (z.phase % 2 ? z.clear : z.go)) {
        z.phase = (z.phase + 1) % 4;
        z.t = 0;
      }
    }
  },
  // what the sign facing traffic going way dir shows
  go: (z, dir) => z.phase === (dir > 0 ? 0 : 2),
  // the lane the works leave open (the player's)
  openLat: (s) => Track.laneOffset(Track.leftLanes + Track.medianLanes, s),
  // the works at s, if any (with `margin` m either end)
  at(s, margin = 0) { return this.list.find(z => s > z.from - margin && s < z.to + margin) || null; },

  // how fast a traffic car may go, coming up to the works with its sign at STOP: it waits at the
  // stop line (unless it is an evil driver running it, or too close to stop as it changed)
  holdFor(car) {
    const G = CONFIG.stopGo;
    let most = Infinity;
    for (const z of this.list) {
      if (this.go(z, car.dir)) continue;
      const line = car.dir > 0 ? z.from - TAPER - G.stopLine - car.hl : z.to + TAPER + G.stopLine + car.hl;
      const d = (line - car.s) * car.dir;
      if (d < -0.5 || d > 80) continue;
      if (car.stopGoFor !== z) { // (whether this driver runs the STOP, decided once as it comes up to the works)
        car.stopGoFor = z;
        car.stopGoRuns = car.evil && Math.random() < G.runChance;
      }
      if (car.stopGoRuns) continue;
      if (z.t < 0.3 && car.vs * car.vs / (2 * CONFIG.junction.stopping) > d + 4) continue; // (too close to stop as it changed)
      most = Math.min(most, Math.sqrt(2 * CONFIG.junction.stopping * Math.max(0, d - 0.5)));
    }
    return most;
  },
  // where a car coming the other way steers to through the works (the open lane), or null
  // (into it over the taper before the works; back out of it as soon as they are through, with the
  // whole taper to do it in before the traffic waiting the other way)
  detour(car) {
    if (car.dir > 0 || !this.list.some(z => car.s > z.from && car.s < z.to + TAPER)) return null;
    return this.openLat(car.s);
  },
};
