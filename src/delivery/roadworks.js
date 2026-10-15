// ============================================================================
// ROADWORKS DIVERSIONS (a level's "diversions": { from, to, kind: 'merge' | 'shift' | 'cross', by?, limit? }; CONFIG.diversion;
// drawn by render/roadworks.js). Where the lanes go is Track's (its lateral-offset layer: Track.divert, works, bounds): this is
// what stands in the road and what is said. Along every TAPER (where a works zone's line moves across a lane) a cone every
// CONFIG.diversion.coneEvery m: ordinary obstacles of kind `cone` (a cone's box and cost), standing just over the line, so a car
// left in a closing lane, squeezed across by the line (keepOnRoad holds it at the line), knocks them over one by one: the cost of
// cutting it fine, never a stop. Along the run the line is a row of barriers (drawn: no car can reach them, the line holds it).
// The temporary limit is for the traffic (Traffic); the player is told the works are coming, once each.
//   merge  the kerb lane closes: everyone zips into the lane beside
//   shift  the player's lanes move `by` m out, onto a widened shoulder, the works between the two ways
//   cross  a contraflow: the oncoming side gives up its inner lane and the player's lanes cross over into it (works on the kerb side),
//          oncoming traffic beside it behind a line of water-filled barriers
// ============================================================================
import { CONFIG } from './config.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';

let attached = false;
const DV = () => CONFIG.diversion;

// the lines of the works zones at s: { lat, into (+1 / -1: the side the zone is on), zone: 'mid' | 'right' | 'left', width }
const LINES = [];
export const zoneLines = (s, out = LINES) => {
  out.length = 0;
  const zs = Track.works(s);
  for (let i = 0; i < zs.n; i++) {
    const [a, b] = zs[i];
    if (a === -Infinity) out.push({ lat: b, into: -1, zone: 'left', width: b - Track.lo(s) });
    else if (b === Infinity) out.push({ lat: a, into: 1, zone: 'right', width: Track.hi(s) - a });
    else { out.push({ lat: a, into: 1, zone: 'mid', width: b - a }, { lat: b, into: -1, zone: 'mid', width: b - a }); }
  }
  return out;
};
// how fast a zone's line is moving across at s (m across per m along): a taper's, or 0 along the run
export const lineSlope = (s, zone, into) => {
  const a = zoneLines(s - 0.5, []).find(l => l.zone === zone && l.into === into), b = zoneLines(s + 0.5, []).find(l => l.zone === zone && l.into === into);
  return a && b ? b.lat - a.lat : 0;
};

export const Roadworks = {
  list: [],   // the level's diversions: { from, to, kind, limit (m/s), said }
  cones: [],  // the taper cones (obstacles), for the drawing and the checks

  attach() {
    if (attached) return;
    attached = true;
    Collision.loaders.push((add) => this.load(add));
  },
  load(add) {
    const D = DV();
    this.list = Track.diversions.map(d => ({ ...d, said: false }));
    this.cones = [];
    for (const d of this.list) {
      for (let s = d.from + 1; s < d.to; s += D.coneEvery) {
        const seen = new Set();
        for (const l of zoneLines(s, [])) {
          const slope = lineSlope(s, l.zone, l.into);
          if (Math.abs(slope) < 0.01) continue; // (along the run: barriers, drawn)
          // a narrow strip between the two ways: one cone in its middle; a wider one: a cone over its moving line, its middle 0.35 m
          // into the zone where the line comes across the lane beside it (the way that lane's traffic goes: a car held at the
          // line touches it, a car in its lane, at the lane's middle, never does), 0.5 m where the line draws back (out of reach)
          const way = l.into > 0 ? (l.zone === 'right' ? 1 : -1) : (l.zone === 'left' ? -1 : 1); // (the way the traffic beside it goes)
          const lat = l.zone === 'mid' && l.width < 1.6 ? l.lat + l.into * l.width / 2 : l.lat + l.into * (slope * l.into * way < 0 ? 0.35 : 0.5);
          if (l.zone === 'mid' && l.width < 0.9) continue; // (too narrow yet for a cone that keeps out of both lanes: the taper's first metres)
          const key = Math.round(lat * 10);
          if (seen.has(key)) continue;
          seen.add(key);
          add('cone', s, lat, { roadworks: true });
          this.cones.push({ s, lat });
        }
      }
    }
  },
  reset() {
    for (const d of this.list) d.said = false;
  },
  // the diversion coming up to the player, said once as it comes within the first sign
  update() {
    const D = DV();
    for (const d of this.list) {
      const ahead = d.from - Player.s;
      if (!d.said && Player.active && ahead > 0 && ahead < Math.max(...D.signs)) {
        d.said = true;
        Message.say('events', d.kind === 'cross' ? 'contraflow' : d.kind === 'merge' ? 'laneClosed' : 'laneShift');
      }
    }
  },
  // the temporary limit at s for a car going way dir (m/s), Infinity where there is none: from CONFIG.diversion.slow m before its
  // first cone (as that car comes to it) to its last
  limitAt(s, dir) {
    const D = DV();
    for (const d of this.list) if (dir > 0 ? s > d.from - D.slow && s < d.to : s < d.to + D.slow && s > d.from) return d.limit;
    return Infinity;
  },
};
