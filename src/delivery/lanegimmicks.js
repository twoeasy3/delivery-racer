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
//   ladles     { s, lanes: [first, last] }: a SCRIPTED EVENT (the steelworks'), by the player's distance, the same every run: with
//              CONFIG.ladle.warn m to go a crane's trolley brings a ladle of molten metal out over those lanes (beacons, a bell,
//              "LADLE OVERHEAD! Keep left/right!", a MOLTEN METAL sign before it); with `pourAt` m to go it tips and pours onto
//              the road: the stream, then a pool spreading over the lanes. While it falls and the pool is molten it is an
//              INSTAKILL (Collision.hitObstacles, through Collision.instakills: the dead end's wreck): whatever protects the car
//              (shield, tank, armour, an invincible mystery) but the Ghost, which passes through. Then it crusts over, harmless.
//              A lane of the player's side is always left free (the level reports one that is not); a car wrecked by a pool is
//              set in it, and the helicopter sets the next car down in it (Player.prepareDrop: ladleDrop). Traffic: untouched
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
  ladles: [], // { s, first, last, lat, hw, hl, free, way, t, pour, now }: t s since its warning, pour s since it tipped (-1: not yet)
  ladleNow: false, // (a test address, ?ladle=1: the next ladle ahead comes out now and pours as soon as it is there: main.js)

  attach() {
    if (attached) return;
    attached = true;
    Collision.loaders.push((add) => this.load(add));
    Collision.instakills.push((car) => this.moltenAt(car)); // (a molten pool: wrecks the player as a dead end's wall does)
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
    const L = CONFIG.ladle;
    this.ladles = (LEVEL.ladles || []).map((d) => {
      const s = Track.place(d), first = Math.min(...d.lanes), last = Math.max(...d.lanes), lat = (Track.laneOffset(first, s) + Track.laneOffset(last, s)) / 2;
      const [p0, p1] = Track.laneRange(1, s), free = [];
      for (let k = p0; k <= p1; k++) if (k < first || k > last) free.push(k);
      free.sort((a, b) => Math.min(Math.abs(a - first), Math.abs(a - last)) - Math.min(Math.abs(b - first), Math.abs(b - last))); // (the nearest first)
      if (!free.length) Track.problems.push('ladle at ' + d.s + ': it pours on every lane of the player\'s side: leave one free');
      if ((LEVEL.tunnels || []).some(t => !t.road && s > t.from - 20 && s < t.to + 20)) Track.problems.push('ladle at ' + d.s + ': out in the open, 20 m clear of a tunnel');
      const way = free.length ? Math.sign(Track.laneOffset(free[0], s) - lat) : 1; // (+: the free lane is to the right)
      return { s, first, last, lat, hw: (last - first + 1) * LW / 2 - L.edge, hl: L.length / 2, free, way, t: -1, pour: -1, now: false };
    });
  },
  // a ladle's pool now: { k: how far it has spread (0..1), hot: an instakill, cool: 0..1 crusted over }, or null before it pours
  pool(l) {
    const L = CONFIG.ladle, p = l.pour;
    if (p < 0) return null;
    const touch = L.fall * 0.8; // (the stream's tip down to a car's roof)
    return { k: Math.max(0, Math.min(1, (p - touch) / L.spread)), hot: p >= touch && p < L.pour + L.molten, cool: Math.max(0, Math.min(1, (p - L.pour - L.molten) / L.cool)) };
  },
  // the molten pool (or the falling stream) `car` is in, as { message, at: { s, lat }, openLat }, or null
  moltenAt(car) {
    for (const l of this.ladles) {
      const q = this.pool(l);
      if (!q || !q.hot || Math.abs(car.s - l.s) > l.hl + car.hl + 2) continue;
      const zone = { s: l.s, lat: l.lat, yaw: 0, hw: Math.max(0.5, l.hw * q.k), hl: Math.max(0.5, l.hl * q.k) };
      if (Collision.overlap(car, zone)) return { message: 'ladleHit', at: zone, openLat: Track.laneOffset(l.free[0] ?? l.first, car.s) };
    }
    return null;
  },
  // where the helicopter sets a car down that was wrecked at or near a ladle's pool (Player.prepareDrop): the free lane nearest
  // `lane` if `lane` is under the pour and s within CONFIG.ladle.clear m of the pool, else null (as on any level)
  ladleDrop(s, lane) {
    const C = CONFIG.ladle.clear;
    for (const l of this.ladles) {
      if (Math.abs(s - l.s) > l.hl + C || lane < l.first || lane > l.last || !l.free.length) continue;
      return [...l.free].sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane))[0];
    }
    return null;
  },
  // the pillar group the player is coming up to or passing (from `warn` m before its first to its last), or null
  pillarsAt(s) {
    const W = CONFIG.pillar.warn;
    return this.groups.find(g => s >= g.from - W && s <= g.to + 2) || null;
  },
  // where the helicopter sets a car down that was wrecked at or among a group of PILLARS (Player.prepareDrop): never at them, nor
  // between a group's columns: the s moved clear of the group, behind it or past it, whichever is nearer (CONFIG.pillar.clear m
  // from its first or last), and the lane the lane beside the pillars' that `busy(lane)` (a train on that track: bullettrain.js)
  // does not rule out, the one nearer `lat` if both are free. Null where no group is near s (the drop as on any level)
  pillarDrop(s, lat, busy = () => false) {
    const C = CONFIG.pillar.clear, g = this.groups.find(q => s > q.from - C && s < q.to + C);
    if (!g) return null;
    const to = s - (g.from - C) <= (g.to + C) - s ? g.from - C : g.to + C;
    const lanes = [g.lane - 1, g.lane + 1].filter(l => l >= 0 && l < Track.laneCount);
    lanes.sort((a, b) => (busy(a) - busy(b)) || Math.abs(Track.laneOffset(a, to) - lat) - Math.abs(Track.laneOffset(b, to) - lat));
    return { s: to, lane: lanes[0] ?? g.lane };
  },
  // whether a train on an edge railway is held back now (bullettrain.js): the player is at a group of pillars (the tracks are the
  // way past: none sets off), or coming up to one within CONFIG.pillar.hold m while `other` (the other track's train) is about
  pillarHold(s, other) {
    if (!this.groups.length) return false;
    if (this.pillarsAt(s)) return true;
    return !!other && this.groups.some(g => s <= g.to + 2 && g.from - s < CONFIG.pillar.hold);
  },
  say(l) { // (a ladle's warning: to a player still coming, once)
    if (!Player.active || Player.s > l.s + l.hl) return;
    Message.say('events', 'ladle', l.way > 0 ? 'right' : 'left');
    sfxAt('bell', l.s, 1);
  },
  reset() {
    for (const e of this.ends) e.warned = false;
    for (const g of this.groups) g.warned = false;
    for (const l of this.ladles) { l.t = l.pour = -1; l.now = false; }
  },
  // the dead end whose lane the player is driving down (between its start and its wall), or null
  inDeadLane(s, lat) {
    const LW = CONFIG.laneWidth;
    for (const e of this.ends) if (s >= e.from && s <= e.s && Math.abs(lat - Track.laneOffset(e.lane, s)) <= LW / 2) return e;
    return null;
  },
  update(dt = 0) {
    // the ladles: out over the lanes with `warn` m to go (or at once for ?ladle=1), tipped with `pourAt` m to go once there
    const L = CONFIG.ladle;
    if (this.ladleNow) { const next = this.ladles.find(l => l.t < 0 && l.s + l.hl > Player.s); if (next) { next.t = 0; next.now = true; this.say(next); } this.ladleNow = false; }
    for (const l of this.ladles) {
      if (l.t < 0) { if (Player.s >= l.s - L.warn) { l.t = 0; this.say(l); } } else l.t += dt;
      if (l.pour < 0) { if (l.t >= L.arrive && (l.now || Player.s >= l.s - L.pourAt)) { l.pour = 0; sfxAt('rumble', l.s, 1); sfxAt('burst', l.s, 0.8); } } else l.pour += dt;
    }
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
