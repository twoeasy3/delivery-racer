// ============================================================================
// MACHINERY - a level's "machinery" (see levels.js): the machines working a construction site.
// Bulldozers, excavators and dump trucks trundle right across the road and back, waiting a moment
// off it at each side; a road roller (kind 'roller', with from / to / side) crawls up and down a
// stretch of shoulder; a forklift (kind 'forklift', with side) backs out onto the shoulder and off
// it again. Each is an obstacle like any other: the player's car touching one blows it up, at a
// cost (see CONFIG.machinery), and it is gone for the run; traffic passes through them.
// This is the movement; render/machinery.js draws them.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { hurt, FxQueue } from './physics.js';
import { Game } from './game.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);
const box = { s: 0, lat: 0, yaw: 0, hl: 0, hw: 0 };
// how each kind moves: across the road (the default), along a shoulder, or out onto one and back
const MODE = { roller: 'along', forklift: 'poke' };
// where a shoulder's middle is, and where off the road on that side is, at s
const shoulder = (side, s) => Track.shoulderOffset(side, s);
const offRoad = (side, s, d) => side < 0 ? Track.lo(s) - d : Track.hi(s) + d;

export const Machinery = {
  // { kind, mode, s, lat, side, from, to, dir (1 = towards +lat, or +s along a shoulder), rest
  //   (s left waiting), gone (blown up), hl, hw, tracks }
  list: [],

  reset() {
    const M = CONFIG.machinery;
    this.list = (LEVEL.machinery || []).map(m => {
      const mode = MODE[m.kind] || 'cross', size = M.sizes[m.kind] || { hl: M.hl, hw: M.hw }, side = m.side === 'left' ? -1 : 1;
      const it = { kind: m.kind, mode, side, from: m.from, to: m.to, dir: Math.random() < 0.5 ? 1 : -1, rest: 0, gone: false, tracks: 0, ...size };
      if (mode === 'along') Object.assign(it, { s: m.from + Math.random() * (m.to - m.from), lat: shoulder(side, m.from) });
      else if (mode === 'poke') Object.assign(it, { s: m.s, lat: offRoad(side, m.s, M.pokeOut), dir: -side, rest: between(M.rest) });
      else {
        const lo = Track.lo(m.s) - M.beyond, hi = Track.hi(m.s) + M.beyond;
        Object.assign(it, { s: m.s, lat: lo + Math.random() * (hi - lo) });
      }
      return it;
    });
  },
  update(dt) {
    const M = CONFIG.machinery;
    for (const m of this.list) {
      if (m.gone) continue;
      if (m.rest > 0) m.rest -= dt;
      else if (m.mode === 'along') { // up and down its stretch of shoulder
        m.s += m.dir * M.rollerSpeed * dt;
        m.tracks += dt * M.rollerSpeed;
        if (m.s > m.to || m.s < m.from) {
          m.s = Math.max(m.from, Math.min(m.to, m.s));
          m.dir = -m.dir;
          m.rest = between(M.rest);
        }
        m.lat = shoulder(m.side, m.s);
      } else if (m.mode === 'poke') { // out onto the shoulder (dir: towards the road), and back off it
        m.lat += m.dir * M.speed * dt;
        m.tracks += dt * M.speed;
        const out = offRoad(m.side, m.s, M.pokeOut), inn = shoulder(m.side, m.s);
        if ((m.lat - inn) * m.side < 0 || (m.lat - out) * m.side > 0) {
          m.lat = (m.lat - inn) * m.side < 0 ? inn : out;
          m.dir = -m.dir;
          m.rest = between(M.rest);
        }
      } else { // right across the road
        m.lat += m.dir * M.speed * dt;
        m.tracks += dt * M.speed;
        const lo = Track.lo(m.s) - M.beyond, hi = Track.hi(m.s) + M.beyond;
        if (m.lat > hi || m.lat < lo) { // across: a wait, then back the other way
          m.lat = Math.max(lo, Math.min(hi, m.lat));
          m.dir = -m.dir;
          m.rest = between(M.rest);
        }
      }
      // like any obstacle, it blows up as the player's car touches it, and is gone (traffic passes
      // through it); a ghost goes through, a tank flattens it unharmed
      if (m.gone || !Player.active || Player.shield > 0 || Player.ghost > 0 || Math.abs(Player.s - m.s) > 12) continue;
      Object.assign(box, { s: m.s, lat: m.lat, hl: m.hl, hw: m.hw });
      if (!Collision.overlap(box, Player)) continue;
      m.gone = true;
      if (Player.tank <= 0) {
        hurt(Player, M.damages[m.kind] ?? M.damage);
        Player.speed *= M.speedKept;
        Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5);
      }
      Game.shake = 1;
      FxQueue.push({ type: 'explode', s: m.s, lat: m.lat, vs: Player.speed, big: true });
    }
  },
};
