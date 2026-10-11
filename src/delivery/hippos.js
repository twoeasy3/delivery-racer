// ============================================================================
// HIPPOS - a level's "hippos" (see levels.js): a river beside the road, on the right, out of which
// a hippo now and then charges straight across the road. It surfaces in the water (with a splash
// and a bellow: the river's welcome is the only warning) and comes up the bank aimed at where the
// player will be, then charges across and on into the grass on the far side. Like the bullet
// train, whatever it touches is destroyed:
// traffic, obstacles, and the player's car, outright, whatever it is (only a ghost, or a car just
// set down by the helicopter, comes through it); and the hippo itself carries on, unharmed.
// This is the movement and the damage; render/hippos.js draws it.
// ============================================================================
import { CONFIG } from './config.js';
import { Progress } from './progress.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { FxQueue, sfxAt } from './physics.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const box = { s: 0, lat: 0, yaw: 0, hl: 0, hw: 0 }; // the trampler's hitbox, for Collision.overlap

// a big animal at (s, lat), hl x hw either way (along and across the road), destroys everything
// in its way (but not itself): traffic and obstacles, and the player's car outright, but for a
// ghost (kept one until it is clear, as inside a car) and one freshly dropped. (Elephants too.)
export const trample = (s, lat, hl, hw) => {
  Object.assign(box, { s, lat, hl, hw });
  const near = (o) => Math.abs(o.s - box.s) < box.hl + 12 && Math.abs(o.lat - box.lat) < box.hw + 6;
  for (const car of Traffic.cars) {
    if (car.active && !car.junction && car.health > 0 && near(car) && Collision.overlap(box, car)) car.health = 0; // (it blows up: Collision.check)
  }
  for (const o of Collision.obstacles) {
    if (o.gone || !near(o) || !Collision.overlap(box, o)) continue;
    o.gone = true;
    FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: 0, big: false });
  }
  if (!Player.active || Player.shield > 0 || Player.health <= 0 || !near(Player) || !Collision.overlap(box, Player)) return;
  if (Player.ghost > 0) Player.ghost = Math.max(Player.ghost, 0.2);
  else Player.health = 0;
};

export const Hippos = {
  list: [],   // { s, lat, y (height: under water as it surfaces), t (s since it surfaced), id }
  next: Infinity, // s to the next one, while the player is by the river
  count: 0,   // how many have charged this run (each has an id of its own, for the drawing)

  reset() {
    this.list = [];
    this.count = 0;
    this.next = LEVEL.hippos ? 1 : Infinity;
  },
  // the stretch of river at s, if any
  riverAt(s) {
    return (LEVEL.hippos || []).find(r => s >= r.from && s <= r.to) || null;
  },
  // is it charging (out of the water and running), rather than still coming up?
  charging(h) { return h.t >= CONFIG.hippo.surface; },

  update(dt) {
    if (!LEVEL.hippos) return;
    const H = CONFIG.hippo;
    // the next one: aimed at where the player will be by the time it reaches the player's lane
    // (give or take: see H.lead), if that is by the river
    if ((this.next -= dt) <= 0) {
      this.next = 1; // (if not now, it tries again in a second)
      const reach = H.surface + (Track.hi(Player.s) + H.out - Player.lat) / H.speed;
      const s = Player.s + Math.max(0, Player.speed) * reach + between(H.lead);
      const river = this.riverAt(s);
      if (Player.active && Track.isMain(Player.s) && river && this.list.length < H.most && !this.list.some(h => Math.abs(h.s - s) < 40)) {
        this.start(s);
        this.next = between(river.every);
      }
    }
    for (const h of this.list) {
      h.t += dt;
      const shore = Track.hi(h.s) + H.bank; // (where the water stops)
      if (!this.charging(h)) {
        h.y = -H.height + H.height * 0.7 * smooth(h.t / H.surface); // coming up for air
        continue;
      }
      h.lat -= H.speed * dt;
      h.y = -H.height * 0.3 * (1 - smooth((shore - h.lat) / 2.5)); // (out of the water and up the bank)
      h.legs = (h.legs || 0) + dt * H.speed;
      trample(h.s, h.lat, H.hl, H.hw);
    }
    // gone once it is well into the grass on the far side, or left behind
    // (one across and into the grass near the player, which is still in one piece: survived, a milestone counter: see milestones.js)
    for (const h of this.list) if (!h.counted && h.lat <= Track.lo(h.s) && Player.active && Player.health > 0 && Math.abs(h.s - Player.s) < CONFIG.milestones.hippoNear) { h.counted = true; Progress.count('hipposSurvived'); }
    this.list = this.list.filter(h => h.lat > Track.lo(h.s) - H.beyond && h.s > Player.s - CONFIG.despawnBehind);
  },
  // one surfacing in the river beside the road at s
  start(s) {
    const H = CONFIG.hippo;
    this.list.push({ s, lat: Track.hi(s) + H.out, y: -H.height, t: 0, legs: 0, id: this.count++ });
    sfxAt('hippo', s);
  },
};

