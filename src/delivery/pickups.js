import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { THEMES } from './themes.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { sfx } from './physics.js';
import { Message } from './messages.js';

// ============================================================================
// PICKUPS - fixed positions on the track, collected by driving through them.
// The lists are filled by load() when a level is loaded (see Game.load). A level with a tide that
// washes things up (see Tide.washUp) also gets a pool of washed-up ones, a few of each type it
// can wash up, hidden (taken) until a wave puts one somewhere.
// ============================================================================
export const Pickups = (() => {
  const items = [];

  const load = () => {
    items.length = 0;
    for (const p of LEVEL.pickups || []) {
      const s = Track.place(p);
      items.push({ type: p.type, s, lat: Track.laneOffset(p.lane, s), taken: false });
    }
    for (const type of Object.keys(LEVEL.tide?.washUp?.types || {})) {
      for (let i = 0; i < CONFIG.tide.washedEach; i++) items.push({ type, s: 0, lat: 0, taken: true, washed: true });
    }
  };

  const reset = () => {
    for (const p of items) {
      p.taken = !!p.washed;
      p.pending = false;
      p.rivalHad = false; // (a rival courier has had its good of it: see Traffic)
    }
  };
  // a washed-up pickup of that type that isn't in use (one already behind the player will do), or null
  const washed = (type) => items.find(p => p.washed && !p.pending && p.type === type && (p.taken || p.s < Player.s - 60)) || null;

  const update = () => {
    if (!Player.active) return;
    for (const p of items) {
      if (p.taken || Math.abs(p.s - Player.s) > Player.hl + 1 ||
          Math.abs(p.lat - Player.lat) > Player.hw + 1) continue;
      p.taken = true;
      Player.collect(p.type);
      // (cash says how much: powerups.cashBonus, its ${dollar} filled in)
      const cash = CONFIG.cashPickup[p.type];
      const line = Message.say('powerups', cash ? 'cashBonus' : p.type);
      if (cash && line) line.text = line.text.replace('${dollar}', '$' + cash);
      sfx(p.type); // (each type has a sound of its own)
    }
  };

  return { items, load, reset, update, washed };
})();

// TANK RAGE targets: fixed spots beside the road, out of the car's reach but not a package's
export const Targets = (() => {
  const items = [];
  const load = () => {
    items.length = 0;
    for (const t of LEVEL.targets || []) {
      const s = Track.place(t), side = t.side === 'left' ? -1 : 1, look = standing(t);
      const lat = side < 0 ? Track.lo(s) - look.offset : Track.hi(s) + look.offset;
      // (height: what a package is thrown at, a little under the ring's middle, as it was; look: how it is drawn)
      items.push({ s, lat, side, vs: 0, latVel: 0, height: look.height - 0.7, look, used: false });
    }
  };
  // how a target stands: the usual (CONFIG.target), as the level's theme has it (its "target"), as the target
  // itself has it ({ offset, height, style, base, arm, beam }). One close enough to the pavement to be driven
  // through is carried up over the tallest car
  const standing = (t) => {
    const T = CONFIG.target, theme = (THEMES[LEVEL.theme] || THEMES.city).target || {}, look = { offset: CONFIG.targetOffset };
    for (const key of ['offset', 'height', 'style', 'base', 'arm', 'beam']) look[key] = t[key] ?? theme[key] ?? T[key] ?? look[key];
    if (!T.styles.includes(look.style)) look.style = T.style;
    if (look.offset < T.clear) look.height = Math.max(look.height, T.headroom);
    return look;
  };
  const reset = () => { for (const t of items) t.used = false; };
  return { items, load, reset };
})();
