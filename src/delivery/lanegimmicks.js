// ============================================================================
// LANE GIMMICKS: boost pads, dead-end lanes and pillars (each a list in the level, barebones; CONFIG.boostPad, CONFIG.deadEnd, CONFIG.pillar;
// drawn by render/lanegimmicks.js; the handrails and the end walls are obstacles, drawn as obstacles).
//   boostPads { from, to, lane, rails? }: a pad in that lane (a travelator in the mall): a car on it is pulled on for a while
//              over its own top speed (Player.update reads Track.padAt). Flush with the road unless it says rails: true
//              (the mall's travelators): then along both edges stand its HANDRAILS, ordinary obstacles of kind `handrail`
//              (a cone's box and cost), blown away on contact like any obstacle. (Off by default: the owner, 16-Oct)
//   deadEnds   { s, lane, kind: 'shutter' | 'wall', length? }: the lane runs on as usual for `length` m and ENDS at s
//              (obstacle kind `laneEnd`). A SHUTTER has road behind it: a Ghost passes through, a tank or an armoured car
//              smashes through, any other car is wrecked. A WALL has nothing behind it: a SUPER INSTAKILL, the car wrecked
//              whatever protects it (Collision.hitObstacles). The counterplay is the
//              telegraph: the lane's floor coloured, a DEAD END sign over it CONFIG.deadEnd.sign m before, beacons and a bell
//              `warn` m before, hazard stripes, and another lane always open beside it (Track reports a level otherwise).
//   pillars    { s, lane, count?, gap? }: `count` solid columns `gap` m apart in that lane (obstacle kind `pillar`, laneEnd
//              'pillar': a wreck as at a dead end's wall, whatever protects the car but the Ghost, which passes through). The
//              telegraph a dead end's: a PILLARS sign over the lane, beacons, a bell and a warning; the way past is the lane
//              beside (the metro's: a track, kept clear of trains past them: bullettrain.js reads pillarHold).
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { sfxAt } from './physics.js';

let attached = false;

export const LaneGimmicks = {
  pads: [],  // { from, to, lane }
  ends: [],  // { s, from, lane, warned }
  groups: [], // pillars: { from, to, lane, warned }

  attach() {
    if (attached) return;
    attached = true;
    Collision.loaders.push((add) => this.load(add));
  },
  load(add) {
    const LW = CONFIG.laneWidth, B = CONFIG.boostPad, D = CONFIG.deadEnd;
    this.pads = (LEVEL.boostPads || []).map((p) => {
      const from = Track.place({ s: p.from, road: p.road, exit: p.exit }), to = from + (p.to - p.from);
      // the handrails: a section every `rail` m along both edges of the pad, `railGap` m short of each end
      for (let s = from + B.railGap + B.rail / 2; p.rails === true && s <= to - B.railGap - B.rail / 2 + 0.01; s += B.rail) {
        for (const side of [-1, 1]) add('handrail', s, Track.laneOffset(p.lane, s) + side * (LW / 2 - 0.25), { face: 0 }); // (0.13 m inside the lane's edge: nothing of it in the lane beside)
      }
      return { from, to, lane: p.lane };
    });
    this.ends = (LEVEL.deadEnds || []).map((d) => {
      const s = Track.place(d), len = d.length ?? D.length, lat = Track.laneOffset(d.lane, s);
      const beside = d.lane > 0 ? d.lane - 1 : d.lane + 1, openLat = Track.laneOffset(beside, s);
      const kind = d.kind === 'wall' ? 'wall' : 'shutter';
      add('laneEnd', s, lat, { laneEnd: kind, openSide: Math.sign(openLat - lat) || 1, openLat });
      return { s, from: s - len, lane: d.lane, kind, warned: false };
    });
    const P = CONFIG.pillar;
    this.groups = (LEVEL.pillars || []).map((g) => {
      const from = Track.place(g), n = g.count ?? P.count, gap = g.gap ?? P.gap;
      for (let k = 0; k < n; k++) {
        const s = from + k * gap, lat = Track.laneOffset(g.lane, s);
        // (where a car is set after hitting one, as at a dead end: the lane beside, the left one unless there is none)
        const beside = Track.laneOffset(g.lane > 0 ? g.lane - 1 : g.lane + 1, s);
        add('pillar', s, lat, { laneEnd: 'pillar', openSide: Math.sign(beside - lat) || 1, openLat: beside, face: 0 });
      }
      return { from, to: from + (n - 1) * gap, lane: g.lane, warned: false };
    });
  },
  // the pillar group the player is coming up to or passing (from `warn` m before its first to its last), or null
  pillarsAt(s) {
    const W = CONFIG.pillar.warn;
    return this.groups.find(g => s >= g.from - W && s <= g.to + 2) || null;
  },
  // whether a train on an edge railway is held back now (bullettrain.js): the player is at a group of pillars (the tracks are the
  // way past: none sets off), or coming up to one within CONFIG.pillar.hold m while `other` (the other track's train) is about
  pillarHold(s, other) {
    if (!this.groups.length) return false;
    if (this.pillarsAt(s)) return true;
    return !!other && this.groups.some(g => s <= g.to + 2 && g.from - s < CONFIG.pillar.hold);
  },
  reset() {
    for (const e of this.ends) e.warned = false;
    for (const g of this.groups) g.warned = false;
  },
  // the dead end whose lane the player is driving down (between its start and its wall), or null
  inDeadLane(s, lat) {
    const LW = CONFIG.laneWidth;
    for (const e of this.ends) if (s >= e.from && s <= e.s && Math.abs(lat - Track.laneOffset(e.lane, s)) <= LW / 2) return e;
    return null;
  },
  update() {
    for (const g of this.groups) { // (the pillars' warning: once a group, to a player in its lane or not)
      const ahead = g.from - Player.s;
      if (ahead > CONFIG.pillar.warn + 20 || ahead < -(g.to - g.from) - 20) { g.warned = false; continue; }
      if (!g.warned && Player.active && ahead > 0 && ahead <= CONFIG.pillar.warn) {
        g.warned = true;
        Message.say('events', 'pillars');
        sfxAt('bell', g.from, 1);
      }
    }
    const D = CONFIG.deadEnd;
    for (const e of this.ends) {
      const ahead = e.s - Player.s;
      if (ahead > D.warn + 20 || ahead < -20) { e.warned = false; continue; }
      if (!e.warned && Player.active && ahead > 0 && ahead <= D.warn && this.inDeadLane(Player.s, Player.lat) === e) {
        e.warned = true;
        Message.say('events', 'deadEnd');
        sfxAt('bell', e.s, 1);
      }
    }
  },
};
