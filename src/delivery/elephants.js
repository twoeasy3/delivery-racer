// ============================================================================
// ELEPHANTS - a level's "elephants" (see levels.js): elephants plodding across the road and back,
// from out in the grass on one side to the other, resting a while at each side. Like a hippo,
// whatever one walks into is destroyed: traffic, obstacles, and the player's car, outright (only
// a ghost, or a car just set down by the helicopter, comes through it); and the elephant plods on,
// unharmed. Traffic drives on regardless, and is trampled; the player has to stop, or go round.
// This is the movement and the damage; render/elephants.js draws them.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { trample } from './hippos.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);

export const Elephants = {
  list: [], // { s, lat, dir (1 = walking towards +lat), rest (s left of standing at the side), legs }

  // where each one is when a run starts: somewhere in its stretch, anywhere from one side to the other
  reset() {
    const E = CONFIG.elephant;
    this.list = [];
    for (const z of LEVEL.elephants || []) {
      for (let i = 0; i < (z.count || 1); i++) {
        const s = z.from + (z.to - z.from) * (i + 0.2 + Math.random() * 0.6) / (z.count || 1); // (spread out along it)
        const lo = Track.lo(s) - E.beyond, hi = Track.hi(s) + E.beyond;
        this.list.push({ s, lat: lo + Math.random() * (hi - lo), dir: Math.random() < 0.5 ? 1 : -1, rest: 0, legs: 0 });
      }
    }
  },
  update(dt) {
    const E = CONFIG.elephant;
    for (const e of this.list) {
      trample(e.s, e.lat, E.hl, E.hw); // (walking or standing, there is no getting through it)
      if (e.rest > 0) { e.rest -= dt; continue; } // (standing out in the grass)
      e.lat += e.dir * E.speed * dt;
      e.legs += dt * E.speed;
      const lo = Track.lo(e.s) - E.beyond, hi = Track.hi(e.s) + E.beyond;
      if (e.lat > hi || e.lat < lo) { // across: a rest, then back the other way
        e.lat = Math.max(lo, Math.min(hi, e.lat));
        e.dir = -e.dir;
        e.rest = between(E.rest);
      }
    }
  },
};

