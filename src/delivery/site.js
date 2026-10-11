// ============================================================================
// SITE WORKS - a level's "siteWorks" (see levels.js): the work going on along a construction
// site's shoulders, so that driving there is no way round it all:
//   trench     { from, to, side }  the shoulder dug up, steel plates laid across it here and there:
//                                  a wheel dropping into a gap between plates is a jolt (damage, speed)
//   excavator  { s, side }         an excavator just off the road swinging its long arm out over the
//                                  shoulder and the outer lane and back: its bucket is an obstacle
//                                  (the player touching it blows the excavator up)
//   workers    { from, to, side, count }  workers pushing wheelbarrows along the shoulder: one with the
//                                  player bearing down on it dives over the fence, leaving its
//                                  barrow where it was (an obstacle: see Collision)
//   pipes      { s, side, every }  a stack of concrete pipes by the fence: as the player comes up to
//                                  it (no more often than every min-max s), one rolls off, with a
//                                  rumble, across the shoulder and on across the road (an obstacle)
// (rollers and forklifts on the shoulder are machinery: see machinery.js)
// A level's "potholes" ({ s, lane, r }) are the same idea in the lanes: a wheel dropping into one is
// a jolt. Either can give the car a flat tyre (CONFIG.site.trenchPuncture, potholePuncture).
// This is what they do; render/site.js draws them (the barrows and pipes are drawn as obstacles).
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { hurt, sfx, sfxAt, FxQueue } from './physics.js';
import { Game } from './game.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);
const sideOf = (w) => w.side === 'left' ? -1 : 1;
const box = { s: 0, lat: 0, yaw: 0, hl: 0, hw: 0 };

export const Site = {
  // the excavators: { s, side, base (lat), angle (0 = arm along the road, PI/2 = right across it), t, gone (blown up) }
  diggers: [],
  // the pipe stacks: { s, side, wait (s before another can roll) }
  stacks: [],
  lastGap: null, // the trench gap the player's wheel last dropped into (one jolt a gap)
  // the potholes: { s, lat, r }
  holes: [],
  lastHole: null, // the pothole the player's wheel last dropped into (one jolt each)

  reset() {
    const W = CONFIG.site;
    const works = LEVEL.siteWorks || [];
    this.diggers = works.filter(w => w.kind === 'excavator').map(w => {
      const side = sideOf(w);
      return { s: w.s, side, base: side < 0 ? Track.lo(w.s) - W.digOut : Track.hi(w.s) + W.digOut, t: Math.random() * W.swingPeriod, angle: 0, gone: false };
    });
    this.stacks = works.filter(w => w.kind === 'pipes').map(w => ({ s: w.s, side: sideOf(w), every: w.every || W.pipeEvery, wait: 0 }));
    for (const o of Collision.obstacles) if (o.roll) o.roll.stack = this.stacks.find(st => st.s === o.roll.at) || null;
    this.lastGap = null;
    this.holes = (LEVEL.potholes || []).map(h => {
      const s = Track.place(h);
      return { s, lat: Track.laneOffset(h.lane, s) + (h.off || 0), r: h.r || W.potholeR };
    });
    this.lastHole = null;
  },
  // the pothole a wheel of the player's car (one each side, inset from its sides) is in, if any
  pothole(s, lat) {
    const wheel = Math.max(0.3, Player.hw - 0.3);
    return this.holes.find(h => Math.abs(s - h.s) < h.r && (Math.abs(lat - wheel - h.lat) < h.r || Math.abs(lat + wheel - h.lat) < h.r)) || null;
  },
  // the bucket of an excavator: where it is (s, lat) and how high (it is low only over the road)
  bucket(d) {
    const R = CONFIG.site.reach;
    return { s: d.s + R * Math.cos(d.angle), lat: d.base - d.side * R * Math.sin(d.angle) };
  },
  // is the player's car in a trench at s, on its side's shoulder, over a gap between its plates?
  // (returns which gap, to count each once; or null)
  trenchGap(s, lat) {
    const W = CONFIG.site;
    for (const w of LEVEL.siteWorks || []) {
      if (w.kind !== 'trench' || s < w.from || s > w.to) continue;
      const side = sideOf(w), edge = side < 0 ? Track.laneLo(s) : Track.laneHi(s);
      if ((lat - edge) * side < W.trenchIn) continue; // (not that far out onto the shoulder)
      const u = (s - w.from) % W.plateEvery;
      if (u < W.plateLength) continue; // (on a plate)
      return w.from + Math.floor((s - w.from) / W.plateEvery);
    }
    return null;
  },

  update(dt) {
    const W = CONFIG.site;
    // trenches: a wheel in a gap between the plates
    if (Player.active && Player.ghost <= 0) {
      const gap = this.trenchGap(Player.s, Player.lat);
      if (gap !== null && gap !== this.lastGap && Player.shield <= 0 && Player.tank <= 0) {
        hurt(Player, W.trenchDamage);
        Player.speed *= W.trenchKept;
        Player.stun = Math.max(Player.stun, 0.3);
        Game.shake = Math.max(Game.shake, 0.7);
        sfx('crash', 0.8);
        // (and maybe a flat tyre, on the trench's side)
        const trench = (LEVEL.siteWorks || []).find(w => w.kind === 'trench' && Player.s >= w.from && Player.s <= w.to);
        if (trench && Math.random() < W.trenchPuncture) Player.punctureTyre(sideOf(trench));
      }
      this.lastGap = gap;
      // potholes: the same jolt, a little less, and maybe a flat on the side that hit it
      const hole = this.pothole(Player.s, Player.lat);
      if (hole && hole !== this.lastHole && Player.shield <= 0 && Player.tank <= 0) {
        hurt(Player, W.potholeDamage);
        Player.speed *= W.potholeKept;
        Player.stun = Math.max(Player.stun, 0.2);
        Game.shake = Math.max(Game.shake, 0.5);
        sfx('crash', 0.6);
        if (Math.random() < W.potholePuncture) Player.punctureTyre(hole.lat < Player.lat ? -1 : 1);
      }
      this.lastHole = hole;
    }
    // excavators swinging their arms out over the road and back
    for (const d of this.diggers) {
      if (d.gone) continue;
      d.t += dt;
      d.angle = Math.PI / 4 * (1 - Math.cos(Math.PI * 2 * d.t / W.swingPeriod)); // (0 .. PI/2 .. 0)
      // its bucket is an obstacle like any other: touched by the player's car, the excavator blows up
      const b = this.bucket(d);
      if (!Player.active || Player.shield > 0 || Player.ghost > 0 || Math.abs(Player.s - b.s) > 8) continue;
      Object.assign(box, { s: b.s, lat: b.lat, hl: W.bucket, hw: W.bucket });
      if (!Collision.overlap(box, Player)) continue;
      d.gone = true;
      if (Player.tank <= 0) {
        hurt(Player, W.bucketDamage);
        Player.speed *= W.bucketKept;
        Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5);
      }
      Game.shake = 1;
      FxQueue.push({ type: 'explode', s: b.s, lat: b.lat, vs: Player.speed, big: true });
      FxQueue.push({ type: 'explode', s: d.s, lat: d.base, vs: 0, big: true, sound: 'none' });
    }
    // the workers with their barrows, and the pipes rolling off their stacks: obstacles (see Collision)
    for (const o of Collision.obstacles) {
      if (o.walk) this.walk(o, dt);
      else if (o.roll) this.rollPipe(o, dt);
    }
    for (const st of this.stacks) {
      st.wait = Math.max(0, st.wait - dt);
      const ahead = st.s - Player.s;
      if (st.wait > 0 || !Player.active || ahead < W.pipeNear.min || ahead > W.pipeNear.max) continue;
      const pipe = Collision.obstacles.find(o => o.roll && o.roll.stack === st && o.gone);
      if (!pipe) continue;
      // off it rolls
      Object.assign(pipe, { gone: false, s: st.s + (Math.random() - 0.5) * 6, h: 0 });
      pipe.lat = st.side < 0 ? Track.lo(pipe.s) - W.stackOut : Track.hi(pipe.s) + W.stackOut;
      pipe.roll.dir = -st.side;
      st.wait = between(st.every);
      sfxAt('rumble', st.s);
    }
  },
  // a worker pushing a barrow up and down the shoulder; with the player bearing down, it dives clear
  walk(o, dt) {
    const W = CONFIG.site, w = o.walk;
    if (o.gone) return;
    if (w.dive < 0) {
      const behind = o.s - Player.s;
      if (Player.active && behind > 0 && behind < W.diveNear && Math.abs(Player.lat - o.lat) < W.diveWide) {
        w.dive = 0; // (the barrow is left where it is)
        sfxAt('hornSmall', o.s, 0.01); // (a yelp: nothing much)
        return;
      }
      o.s += w.dir * W.walkSpeed * dt;
      if (o.s > w.to || o.s < w.from) {
        o.s = Math.max(w.from, Math.min(w.to, o.s));
        w.dir = -w.dir;
      }
      o.lat = Track.shoulderOffset(w.side, o.s);
      o.face = w.dir > 0 ? 0 : Math.PI;
    } else w.dive += dt;
  },
  // a pipe rolling across the road, and gone off the far side
  rollPipe(o, dt) {
    if (o.gone) return;
    o.lat += o.roll.dir * CONFIG.site.pipeSpeed * dt;
    o.spun = (o.spun || 0) + CONFIG.site.pipeSpeed * dt / 0.9;
    if (o.lat > Track.hi(o.s) + 6 || o.lat < Track.lo(o.s) - 6) o.gone = true;
  },
};
