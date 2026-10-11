// ============================================================================
// TIDE - a level's "tide" (see levels.js): a causeway the sea comes in over, on the player's side
// of the road only, from the kerb in. The oncoming side stays dry.
// How far in the water reaches is its flood: in lane widths from the outer edge of the pavement
// (the shoulder counts as the first). It rises from the level's `start` to its `end` over the
// clock, so the slower the run, the less road is left; and every so often a wave comes in (with a
// warning) and floods a stretch of road further still for a few seconds. Then it drains away, and
// the sea with it, right out until the road there is bare, before the tide comes back in. A wave
// washes things up (a level's tide.washUp): pickups left in the water as it comes in, there for
// the taking while the road is bare, or by wading in after them.
// Past the water's edge the water deepens over CONFIG.tide.ramp metres to full depth. What it does
// to cars: see Player (slowed by how badly the car wades, and damaged in deep water) and Traffic
// (good drivers move out of its way, and a car a wave catches in deep water stalls).
// This is the water itself; render/tide.js draws it.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';
import { Player } from './player.js';
import { Game } from './game.js';
import { Pickups } from './pickups.js';

const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const between = (range) => range.min + Math.random() * (range.max - range.min);
const W = () => CONFIG.tide;
// one of a list's keys, by the shares its values give them
const pick = (shares) => {
  const all = Object.entries(shares);
  let r = Math.random() * all.reduce((sum, [, share]) => sum + share, 0);
  for (const [key, share] of all) if ((r -= share) < 0) return key;
  return all[0][0];
};

// how much of a wave there is at `t` s after it arrives (before that, during its warning: none):
// 1 at its height; then down past nothing to -1, the sea gone right out, and back up to nothing
const envelope = (t) => {
  const { rise, hold, fall, low, back } = W();
  if (t <= 0) return 0;
  if (t < rise) return 1 - (1 - t / rise) ** 2; // (it comes in at speed, as its crest did, and slows to its height)
  if ((t -= rise) < hold) return 1;
  if ((t -= hold) < fall) return 1 - 2 * smooth(t / fall);
  if ((t -= fall) < low) return -1;
  return -1 + smooth((t - low) / back);
};

export const Tide = {
  time: 0,    // s since the run started (the tide's own clock: it rises with it)
  waves: [],  // { s0, s1 (the stretch it floods), reach (lanes further in, at its height), t (s since it arrived;
              //   < 0 = still coming), gifts (the pickups it washes up as it comes in) }
  next: 0,    // s to the next wave
  get on() { return !!LEVEL.tide; },
  get length() { const { rise, hold, fall, low, back } = W(); return rise + hold + fall + low + back; }, // s a wave lasts, once in

  reset() {
    this.time = 0;
    this.waves = [];
    this.next = LEVEL.tide ? between(LEVEL.tide.waves.every) : Infinity;
  },
  // 0 off the causeway, 1 on it, easing in and out at its ends
  causeway(s) {
    const t = LEVEL.tide, ease = 80;
    return smooth((s - t.from) / ease) * (1 - smooth((s - (t.to - ease)) / ease));
  },
  // the rising tide alone, `later` s from now: in lanes from the pavement's edge
  base(later = 0) {
    const t = LEVEL.tide;
    return t.start + (t.end - t.start) * Math.min(W().overtime, (this.time + later) / Math.max(1, Game.allowed));
  },
  // a wave's share of its reach at s (0 beyond its stretch, easing in at its ends)
  stretch(w, s) {
    const ease = 40;
    return smooth((s - w.s0) / ease) * (1 - smooth((s - (w.s1 - ease)) / ease));
  },
  // the flood at s, `later` s from now. ahead: as a driver sees it coming (and the helicopter
  // choosing where to set a car down), a wave that has been warned of counting in full until it
  // starts to drain away, and no trusting the sea to stay out once it has
  flood(s, later = 0, ahead = false) {
    if (!LEVEL.tide || !Track.isMain(s)) return 0;
    const on = this.causeway(s);
    if (on <= 0) return 0;
    const base = this.base(later);
    let more = 0, out = 0; // (lanes further in; and the share of the tide gone out)
    for (const w of this.waves) {
      const t = w.t + later;
      const k = ahead && t < W().rise + W().hold ? 1 : envelope(t);
      if (k > 0) more += w.reach * k * this.stretch(w, s);
      else if (k < 0 && !ahead) out = Math.max(out, -k * this.stretch(w, s));
    }
    return Math.max(0, base * (1 - out) + more) * on;
  },
  // the lat of the water's edge at s (on the player's side: it never comes past the centre line);
  // with no water there, the pavement's edge
  edge(s, later = 0, ahead = false) {
    return Math.max(Track.medianHalf, Track.hi(s) - this.flood(s, later, ahead) * CONFIG.laneWidth);
  },
  // how deep the water is at (s, lat): 0 = dry, 1 = full depth
  depth(s, lat, later = 0, ahead = false) {
    if (!LEVEL.tide || lat <= 0) return 0;
    const f = this.flood(s, later, ahead);
    if (f <= 0) return 0;
    const edge = Math.max(Track.medianHalf, Track.hi(s) - f * CONFIG.laneWidth);
    return lat <= edge ? 0 : Math.min(1, (lat - edge) / W().ramp);
  },
  // the outermost lane going the player's way that is still dry (or as good as) at s, as a driver
  // sees it: with a wave warned of, as it will be. With no tide, there is no limit (Infinity); with
  // the whole side under water, its innermost lane
  dryLane(s) {
    if (!LEVEL.tide) return Infinity;
    const [first, last] = Track.laneRange(1, s);
    for (let lane = last; lane > first; lane--) {
      if (this.depth(s, Track.laneOffset(lane, s), 0, true) <= W().wet) return lane;
    }
    return first;
  },
  // is a wave surging in over s just now (rising, or at its height)? (it shoves, and stalls cars)
  surging(s) {
    return this.waves.some(w => w.t > 0 && w.t < W().rise + W().hold && this.stretch(w, s) > 0.5);
  },
  // is one rushing in over s just now? (what shoves a car in the water)
  rushing(s) {
    return this.waves.some(w => w.t > 0 && w.t < W().rise && this.stretch(w, s) > 0.5);
  },

  update(dt) {
    if (!LEVEL.tide) return;
    this.time += dt;
    for (const w of this.waves) {
      if (w.t <= 0 && w.t + dt > 0) { // it breaks over the road, leaving what it washed up in the water
        sfx('waveCrash');
        for (const p of w.gifts || []) {
          p.taken = false;
          p.pending = false;
        }
      }
      w.t += dt;
    }
    this.waves = this.waves.filter(w => w.t < this.length);
    // the next wave: warned of, and aimed at where the player will be when it comes in (none
    // while the player has no car, or one just set down; and only over the causeway)
    if ((this.next -= dt) > 0) return;
    const T = LEVEL.tide, at = Player.s + Math.max(0, Player.speed) * W().warning;
    if (!Player.active || Player.shield > 0 || at < T.from + 60 || at > T.to - 60) {
      this.next = 1; // (it tries again in a second)
      return;
    }
    this.start(at);
    this.next = between(T.waves.every);
  },
  // a wave coming in over the road at s, W().warning s from now
  start(at) {
    const half = W().stretch / 2, T = LEVEL.tide;
    const wave = { s0: Math.max(T.from, at - half), s1: Math.min(T.to, at + half), reach: between(T.waves.reach), t: -W().warning, gifts: [] };
    this.waves.push(wave);
    this.washUp(wave, at);
    Message.say('events', 'wave');
    sfx('wave');
  },
  // what a wave washes up (a level's tide.washUp: { types: { type: share }, count: { min, max } }):
  // that many pickups, left in the water just beyond where it comes in, in a lane it floods deep
  // (the outer ones, by choice), each taken from Pickups' pool of washed-up ones (see Pickups.load)
  washUp(wave, at) {
    const U = LEVEL.tide.washUp;
    if (!U) return;
    const n = Math.round(between(U.count));
    for (let i = 0; i < n; i++) {
      const p = Pickups.washed(pick(U.types));
      if (!p) continue;
      p.pending = true; // (spoken for, and out of sight, until the wave comes in)
      p.taken = true;
      p.s = Math.min(wave.s1 - 30, at + 20 + Math.random() * 90);
      const [first, last] = Track.laneRange(1, p.s), deep = [];
      for (let lane = last; lane >= first; lane--) {
        if (this.depth(p.s, Track.laneOffset(lane, p.s), W().warning + W().rise, true) >= W().deep) deep.push(lane);
      }
      const lane = deep.length ? deep[Math.floor(Math.random() * Math.min(2, deep.length))] : last;
      p.lat = Track.laneOffset(lane, p.s);
      wave.gifts.push(p);
    }
  },
};
