// ============================================================================
// HAZARDS - Gimmick Road 2's gimmicks (see levels.js and CONFIG, each under its own name): school
// crossings, burst water mains, hot-air balloons, drawbridges, wide loads with an escort, shopping
// trolleys, marathons and stampedes. Each is a list in the level, barebones: what it
// does is here, render/hazards.js draws it (the things that can be run into are obstacles, drawn
// as obstacles: see Collision, which this adds them to, and render/obstacleModels.js).
// As with every obstacle, traffic drives straight through the moving ones (trolleys, runners, a wide
// load, a stampede); it does wait at a school crossing, a balloon and a drawbridge.
// (A road train jackknifing is wreckage.js's.)
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { hurt, sfx, sfxAt } from './physics.js';
import { Game } from './game.js';

const between = (r) => r.min + Math.random() * (r.max - r.min);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
// how fast a car may go so as to stop at `line` (Infinity if it is past it, or far off)
const stopAt = (car, line) => {
  const d = (line - car.s) * car.dir;
  return d < -0.5 || d > 80 ? Infinity : Math.sqrt(2 * CONFIG.junction.stopping * Math.max(0, d - 0.5));
};
// is the player `seconds` or less from s, at the speed it is going? (ahead of it, on the same road)
const within = (s, seconds) => {
  const ahead = s - Player.s;
  return Player.active && ahead > 0 && ahead < 2000 && ahead / Math.max(Player.speed, 8) <= seconds;
};
// did the player go over s this step?
const crossed = (s, from) => from < s && Player.s >= s && Player.s - from < 30;
// (seeded: everything is laid out the same way every run)
let seed = 1;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

let attached = false;

export const Hazards = {
  schools: [],   // { s, state: 'idle' | 'stop', t, next, started }
  mains: [],     // { from, to, lane, lat, on, t, warned }: its patch of ice is Track.sprays' (same order)
  balloons: [],  // { s, lat0, lat1, state: 'idle' | 'descend' | 'sit' | 'rise' | 'gone', t, hit }
  bridges: [],   // { s, state: 'idle' | 'warn' | 'open' | 'close', t, next, started, bell }
  loads: [],     // { s0, ends(s) (the two places it swings between), load, escort (obstacles), on, t, passed, done }
  trolleys: [],  // obstacles, each with cart: { lat0, vel0, vel }
  marathons: [], // { s0, lane, on, members: obstacles with run: { s0, off } }
  stampedes: [], // { from, to, on, animals: obstacles with charge: { s0, lat0, speed, phase } }
  jump: null,    // the player in the air off a drawbridge's leaf: { bridge, vy (m/s up), vx (along the road), over (been over the gap), sunk (into the far leaf's end) }
  lastS: 0,

  // adds this level's obstacles to Collision's as it loads a level (Game.load attaches it, once)
  attach() {
    if (attached) return;
    attached = true;
    Collision.loaders.push((add) => this.load(add));
  },
  load(add) {
    const put = (kind, s, lat, extra) => {
      add(kind, s, lat, { hazard: true, ...extra });
      return Collision.obstacles[Collision.obstacles.length - 1];
    };
    seed = 24680;
    this.trolleys = [];
    for (const z of LEVEL.trolleys || []) {
      for (let i = 0; i < (z.count || 4); i++) {
        const s = Track.place({ s: z.from + (z.to - z.from) * (i + rand()) / (z.count || 4), road: z.road, exit: z.exit });
        const lat0 = Track.lo(s) + 0.6 + rand() * (Track.hi(s) - Track.lo(s) - 1.2);
        this.trolleys.push(put('trolley', s, lat0, { cart: { lat0, vel0: (rand() - 0.5) * 4, vel: 0 } }));
      }
    }
    this.marathons = (LEVEL.marathons || []).map((m) => {
      const M = CONFIG.marathon, s0 = Track.place(m), members = [];
      for (let i = 0; i < (m.count || 8); i++) {
        const s = s0 - Math.floor(i / 2) * M.spacing, off = i % 2 ? 0.7 : -0.7;
        members.push(put('runner', s, Track.laneOffset(m.lane, s) + off, { run: { s0: s, off, k: i } }));
      }
      members.push(put('paceCar', s0 + M.lead, Track.laneOffset(m.lane, s0 + M.lead), { run: { s0: s0 + M.lead, off: 0, k: 0 } }));
      if (m.water !== undefined) { // (the water station: two tables standing in the lane, to its outer side)
        for (const d of [0, 7]) { const s = Track.place({ s: m.water + d }); put('waterTable', s, Track.laneOffset(m.lane, s) + 1.05); }
      }
      return { s0, lane: m.lane, on: false, members };
    });
    this.loads = (LEVEL.wideLoads || []).map((w) => {
      const s0 = Track.place(w), [a] = w.lanes, W = CONFIG.wideLoad;
      const load = put('wideLoad', s0, 0, { knock: true, vs: W.speed }), back = s0 - load.hl - W.behind;
      // the two places it swings between at s: [left, right]. Left, its left side on the left edge of lane a;
      // right, `swing` m over, or as far as the edge of the shoulder lets it. Where that would open less than
      // `gap` m (no shoulder to speak of), left is further left instead, over the line, so the right side still opens
      const ends = (s) => {
        const left = Track.laneOffset(a, s) - CONFIG.laneWidth / 2 + load.hw, right = Math.min(left + W.swing, Track.hi(s) - W.kerb - load.hw);
        return right - left >= W.gap ? [left, right] : [Math.max(Track.lo(s) + load.hw, right - W.gap), right];
      };
      load.lat = ends(s0)[0];
      return { s0, ends, lo: (s) => Track.laneOffset(a, s), load, escort: put('escort', back, load.lat, { knock: true, vs: W.speed }), on: false, t: 0, passed: false, done: false };
    });
    this.stampedes = (LEVEL.stampedes || []).map((z) => {
      const from = Track.place({ s: z.from, road: z.road, exit: z.exit }), to = from + (z.to - z.from), animals = [];
      for (let i = 0; i < (z.count || 8); i++) {
        const s = from + (to - from) * (i + rand()) / (z.count || 8), lat0 = Track.lo(s) + 1 + rand() * (Track.hi(s) - Track.lo(s) - 2);
        const S = CONFIG.stampede.speed;
        animals.push(put(z.kind || 'cow', s, lat0, { face: Math.PI, charge: { s0: s, lat0, speed: S.min + rand() * (S.max - S.min), phase: rand() * 6 } }));
      }
      // (they run `run` m down the road from where they waited, no further than the start of their road)
      return { from, to, on: false, animals, floor: Math.max(from - CONFIG.stampede.run, Track.place({ s: 5, road: z.road, exit: z.exit })) };
    });
  },

  reset() {
    const place = (c) => Track.place(c);
    this.schools = (LEVEL.schoolCrossings || []).map(c => ({ s: place(c), state: 'idle', t: 0, next: 0, started: false }));
    this.mains = (LEVEL.waterMains || []).map((m) => {
      const from = place(m), to = from + (m.length ?? CONFIG.waterMain.length);
      return { from, to, lane: m.lane, lat: Track.laneOffset(m.lane, from), on: false, t: 0, warned: false };
    });
    Track.sprays.length = 0;
    for (const m of this.mains) Track.sprays.push({ from: m.from, to: m.to, lane: m.lane, on: false, water: true }); // (water: see Player.onWater)
    this.balloons = (LEVEL.balloons || []).map((b) => {
      const s = place(b), LW = CONFIG.laneWidth;
      return { s, lat0: Track.laneOffset(b.lanes[0], s) - LW / 2, lat1: Track.laneOffset(b.lanes[1], s) + LW / 2, state: 'idle', t: 0, hit: false };
    });
    this.bridges = (LEVEL.drawbridges || []).map(c => ({ s: place(c), state: 'idle', t: 0, next: 0, started: false, bell: 0, rolled: false, climb: null }));
    for (const w of this.loads) {
      Object.assign(w, { on: false, t: 0, passed: false, done: false });
      w.load.s = w.s0; w.load.lat = w.ends(w.s0)[0];
      w.escort.s = w.s0 - w.load.hl - CONFIG.wideLoad.behind; w.escort.lat = w.load.lat;
      w.load.knocked = w.escort.knocked = 0;
    }
    for (const o of this.trolleys) { o.lat = o.cart.lat0; o.cart.vel = o.cart.vel0; }
    for (const m of this.marathons) {
      m.on = false;
      for (const o of m.members) { o.s = o.run.s0; o.lat = Track.laneOffset(m.lane, o.s) + o.run.off; o.run.t = 0; }
    }
    for (const z of this.stampedes) {
      z.on = false;
      for (const o of z.animals) { o.s = o.charge.s0; o.lat = o.charge.lat0; o.h = 0; }
    }
    this.jump = null;
    Player.air = Player.pitch = 0;
    this.lastS = Player.s;
  },

  // ---- what each is doing, for the drawing (and the rules below) --------------------------------------
  // a school crossing's children: how far across the road they are, 0 (one kerb) .. 1 (the other)
  childrenAcross: (c) => c.state === 'stop' ? clamp01((c.t - 0.8) / (CONFIG.schoolCrossing.hold - 1.6)) : 0,
  // how high a balloon's basket is off the road (m)
  balloonHeight(b) {
    const B = CONFIG.balloon;
    return b.state === 'descend' ? B.height * (1 - clamp01(b.t / B.descend)) ** 2 : b.state === 'sit' ? 0
      : b.state === 'rise' ? B.height * clamp01(b.t / B.rise) ** 2 : B.height;
  },
  // how far up a drawbridge's leaves are, 0 (down) .. 1 (right up); and its booms, 0 (up) .. 1 (down)
  bridgeOpen(c) {
    const D = CONFIG.drawbridge;
    return c.state === 'open' ? clamp01(c.t / D.raise) : c.state === 'close' ? 1 - clamp01(c.t / D.close) : 0;
  },
  bridgeBooms: (c) => c.state === 'idle' ? 0 : c.state === 'warn' ? clamp01(c.t / 1.2) : 1,
  // how far a burst main's water has spread along its lane (0 .. 1), for the drawing: out as it starts to
  // spray, shrinking away over `dry` s once it stops (the lane is only slippery while it sprays)
  mainSpread: (m) => m.on ? clamp01(0.15 + m.t / CONFIG.waterMain.spread) : clamp01(1 - m.t / CONFIG.waterMain.dry),
  // the angle its leaves stand at (rad); and the gap between their lips (m)
  bridgeAngle(c) { return this.bridgeOpen(c) * CONFIG.drawbridge.angle; },
  bridgeGap(c) { return 2 * CONFIG.drawbridge.leaf * (1 - Math.cos(this.bridgeAngle(c))); },
  // the speed (m/s) that, hands off at the foot of a leaf right up, takes the car up it and over the gap
  bridgeJumpSpeed() {
    const D = CONFIG.drawbridge, gap = 2 * D.leaf * (1 - Math.cos(D.angle));
    return Math.sqrt(2 * D.gravity * Math.sin(D.angle) * D.leaf + gap * D.gravity / Math.sin(2 * D.angle));
  },
  // a drawbridge's deck under s: { y: m above the road, slope: its rise per m along the road (+ a climb,
  // the player's way) }; null over the gap between the lips; undefined off the bridge. (Each leaf is a
  // straight line from its hinge, leaf m from the middle, up to its lip: what render/hazards.js draws)
  deck(c, s) {
    const D = CONFIG.drawbridge, d = s - c.s, a = this.bridgeAngle(c);
    if (Math.abs(d) >= D.leaf) return undefined;
    if (a <= 0) return { y: 0, slope: 0 };
    const out = D.leaf - Math.abs(d), reach = D.leaf * Math.cos(a); // (m from the hinge; and as far as the lip reaches)
    if (out <= reach) return { y: out * Math.tan(a), slope: -Math.sign(d) * Math.tan(a) };
    return this.bridgeGap(c) < D.step ? { y: D.leaf * Math.sin(a), slope: 0 } : null; // (a crack: driven over)
  },
  // the road's surface at s, drawbridges and all: { y, slope } (y -depth over an open gap: the river)
  surface(s) {
    for (const c of this.bridges) {
      const deck = this.deck(c, s);
      if (deck !== undefined) return deck || { y: -CONFIG.drawbridge.depth, slope: 0 };
    }
    return { y: 0, slope: 0 };
  },
  // the player on a drawbridge's deck: up the near leaf (slowed by the climb), off its lip and through the
  // air, and down onto the far leaf, the road beyond or into the river. Sets Player.air and Player.pitch
  ride(c, dt, live, was) {
    const D = CONFIG.drawbridge, P = Player, J = this.jump;
    if (J) {
      if (J.bridge !== c) return;
      if (!J.sunk) { P.s -= (P.speed - J.vx) * dt; P.speed = J.vx; } // (in the air there is nothing to push against, or brake on)
      J.vy -= D.gravity * dt;
      P.air += J.vy * dt;
      P.pitch = Math.atan2(J.vy, Math.max(P.speed, 6));
      const d = P.s - c.s, lip = D.leaf * Math.sin(this.bridgeAngle(c));
      let deck = this.deck(c, P.s);
      if (d > 0) J.over = true;
      // (short of the far lip: into the end of the leaf, and down. A ghost, a tank or a car just set down skims over)
      if (!J.sunk && deck && d > 0 && deck.slope < 0 && P.air < deck.y - D.lipGrace && D.leaf - d > D.leaf * Math.cos(this.bridgeAngle(c)) - 2) {
        if (live) { J.sunk = true; P.speed = 0; sfx('crash', 0.8); Game.shake = 1; } else P.air = deck.y;
      }
      if (J.sunk) { deck = null; P.speed = 0; }
      if (deck === null && !live && P.air < lip) { P.air = lip; J.vy = Math.max(J.vy, 0); }
      if (deck === null) { // over the gap: down to the water
        if (P.air > -D.depth) return;
        P.air = -D.depth;
        P.pitch = 0;
        this.jump = null;
        if (P.health > 0) { P.health = 0; Message.say('events', 'drawbridgeFall'); } // (into the water: wrecked, see Collision.check)
        return;
      }
      const ground = deck || { y: 0, slope: 0 };
      if (P.air > ground.y) return;
      // down: hard, if it came down into the surface faster than landSoft
      const into = P.speed * ground.slope - J.vy;
      if (live && into > D.landSoft && P.tank <= 0) hurt(P, D.landDamage);
      Game.shake = Math.max(Game.shake, Math.min(1, into / 14));
      sfx('drop');
      if (J.over) Message.say('events', 'drawbridgeJump');
      this.jump = null;
      P.air = ground.y;
      P.pitch = Math.atan(ground.slope);
      return;
    }
    const deck = this.deck(c, P.s), foot = c.s - D.leaf;
    if (this.bridgeAngle(c) < 0.05) c.rolled = false;
    if (!deck || !(deck.slope > 0)) c.climb = null;
    else if (c.rolled && P.s <= foot && P.s > foot - 4) P.speed = 0; // (rolled back to the foot of it: held there until it is down)
    if (deck === undefined || !P.active) return;
    if (deck === null) { // off the end of a leaf: into the air, the way it was going
      this.jump = { bridge: c, vy: Math.min(D.launch, Math.max(0, P.speed * Math.sin(was.pitch))), over: false, sunk: false };
      P.speed *= Math.cos(was.pitch);
      this.jump.vx = P.speed;
      P.air = was.air;
      P.pitch = was.pitch;
      if (P.speed > 8) sfx('turbo', 0.5);
      return;
    }
    P.air = deck.y;
    P.pitch = Math.atan(deck.slope);
    if (!deck.slope) return;
    // on a raised leaf: the climb takes its speed (and the far leaf's slope gives some back); it covers less road
    // (up it, the engine adds nothing: the speed it came to the foot with is what it has)
    const sin = Math.sin(P.pitch), before = sin > 0 && c.climb !== null ? Math.min(P.speed, c.climb) : P.speed;
    P.speed = Math.max(0, before - D.gravity * sin * dt);
    c.climb = sin > 0 ? P.speed : null;
    P.s -= before * (1 - Math.cos(P.pitch)) * dt;
    P.air = (this.deck(c, P.s) || deck).y;
    if (sin > 0.05 && (c.rolled || P.speed < 1)) { // (stopped short: it rolls back down, and no engine will take it up from there)
      c.rolled = true;
      P.speed = 0;
      P.s = Math.max(foot - 0.05, P.s - D.rollBack * dt);
    }
  },
  // a wide load's swing: how far over it is, 0 (left) .. 1 (right): `dwell` s at each end, `shift` s between
  loadSwing(w) {
    const W = CONFIG.wideLoad, u = w.t % (2 * (W.dwell + W.shift));
    const ease = (x) => x * x * (3 - 2 * x);
    return u < W.dwell ? 0 : u < W.dwell + W.shift ? ease((u - W.dwell) / W.shift) : u < 2 * W.dwell + W.shift ? 1 : 1 - ease((u - 2 * W.dwell - W.shift) / W.shift);
  },
  // ...and what its arrow board shows: { side: -1 (pass on its left) | 1 (on its right) | 0 (swinging: neither),
  // closing: that side is about to shut (the last `warn` s of it) }
  loadSignal(w) {
    const W = CONFIG.wideLoad, u = w.t % (W.dwell + W.shift), p = this.loadSwing(w);
    return { side: !w.on || w.done ? 0 : p <= 0 ? 1 : p >= 1 ? -1 : 0, closing: u < W.dwell && u > W.dwell - W.warn };
  },
  // is its escort blocking: moving over to stay in front of the player coming up behind it?
  blocking(w) {
    const W = CONFIG.wideLoad, back = w.escort.s - Player.s;
    return w.on && !w.done && !w.escort.gone && Player.active && back > 0 && back < W.sight;
  },

  // how fast a traffic car may go, for the ones it waits at: a school crossing's STOP, a balloon on
  // (or nearly on) its lane, and a drawbridge not down
  holdFor(car) {
    let most = Infinity;
    const S = CONFIG.schoolCrossing, B = CONFIG.balloon, D = CONFIG.drawbridge;
    for (const c of this.schools) if (c.state === 'stop') most = Math.min(most, stopAt(car, c.s - car.dir * (S.stopLine + car.hl)));
    for (const b of this.balloons) {
      if ((b.state === 'sit' || (b.state === 'descend' && b.t > B.descend * 0.4)) && car.lat + car.hw > b.lat0 && car.lat - car.hw < b.lat1) {
        most = Math.min(most, stopAt(car, b.s - car.dir * (B.stopLine + car.hl)));
      }
    }
    // (a car already past the line when the bells start drives on over, while the leaves are still down)
    for (const c of this.bridges) {
      const line = c.s - car.dir * (D.stopLine + car.hl);
      if (c.state !== 'idle' && ((line - car.s) * car.dir > -1 || c.state !== 'warn')) most = Math.min(most, stopAt(car, line));
    }
    return most;
  },

  update(dt) {
    if (Traffic.frozen) { this.lastS = Player.s; return; } // (TRAFFIC FREEZE, a mystery: every hazard stands still, and none is set off; see mysteries.js)
    const from = this.lastS;
    this.lastS = Player.s;
    const live = Player.active && Player.shield <= 0, solid = live && Player.ghost <= 0;

    // ---- school crossings
    const S = CONFIG.schoolCrossing;
    for (const c of this.schools) {
      c.t += dt;
      if (c.state === 'idle') {
        c.next -= dt;
        const ahead = c.s - Player.s;
        if (!c.started ? within(c.s, S.notice) : c.next <= 0 && ahead > 0 && ahead < S.again && Player.active) {
          if (!c.started) Message.say('events', 'schoolCrossing');
          Object.assign(c, { state: 'stop', t: 0, started: true });
          sfxAt('bell', c.s, 1);
        }
      } else if (c.t >= S.hold) Object.assign(c, { state: 'idle', t: 0, next: between(S.every) });
      if (c.state === 'stop' && live && crossed(c.s, from)) Player.bust('school');
    }

    // ---- burst water mains
    const M = CONFIG.waterMain;
    this.mains.forEach((m, i) => {
      m.t += dt;
      if (m.t >= (m.on ? M.on : M.off)) { m.on = !m.on; m.t = 0; if (m.on && Math.abs(m.from - Player.s) < 200) sfxAt('wave', m.from, 0.5); }
      Track.sprays[i].on = m.on;
      if (!m.warned && Player.active && m.from - Player.s > 0 && m.from - Player.s < M.warn) { m.warned = true; Message.say('events', 'waterMain'); }
    });

    // ---- hot-air balloons
    const B = CONFIG.balloon;
    for (const b of this.balloons) {
      b.t += dt;
      if (b.state === 'idle') {
        if (within(b.s, B.notice)) { Object.assign(b, { state: 'descend', t: 0, hit: false }); Message.say('events', 'balloon'); }
      } else if (b.state === 'descend' && b.t >= B.descend) { Object.assign(b, { state: 'sit', t: 0 }); sfxAt('drop', b.s, 0.8); }
      else if (b.state === 'sit' && b.t >= B.sit) Object.assign(b, { state: 'rise', t: 0 });
      else if (b.state === 'rise' && b.t >= B.rise) b.state = 'gone';
      // (its basket, low enough to be run into: once a landing)
      if (b.state !== 'gone' && b.state !== 'idle' && !b.hit && solid && this.balloonHeight(b) < Player.height &&
          Math.abs(Player.s - b.s) < Player.hl + B.hl && Player.lat + Player.hw > b.lat0 && Player.lat - Player.hw < b.lat1) {
        b.hit = true;
        if (Player.tank <= 0) { hurt(Player, B.damage); Player.speed *= B.speedKept; Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5); }
        Game.shake = 1;
        sfx('crash', 0.9);
      }
    }

    // ---- drawbridges
    const D = CONFIG.drawbridge;
    for (const c of this.bridges) {
      c.t += dt;
      const ahead = c.s - Player.s;
      if (c.state === 'idle') {
        c.next -= dt;
        if (!c.started ? within(c.s, D.notice) : c.next <= 0 && ahead > 0 && ahead < D.again && Player.active) {
          if (!c.started) Message.say('events', 'drawbridge');
          Object.assign(c, { state: 'warn', t: 0, started: true });
        }
      } else if (c.state === 'warn' && c.t >= D.warn) Object.assign(c, { state: 'open', t: 0 });
      else if (c.state === 'open' && c.t >= D.open) Object.assign(c, { state: 'close', t: 0 });
      else if (c.state === 'close' && c.t >= D.close) Object.assign(c, { state: 'idle', t: 0, next: between(D.every) });
      if (c.state !== 'idle' && (c.bell -= dt) <= 0) { c.bell = 0.5; if (Math.abs(ahead) < 300) sfxAt('bell', c.s, 1); }
      const open = this.bridgeOpen(c);
      if (open > 0.3) { // (traffic caught on it as it opens goes in)
        for (const car of Traffic.cars) if (car.active && !car.junction && car.health > 0 && Math.abs(car.s - c.s) < D.leaf) car.health = 0;
      }
    }
    // the player on a deck (or in the air off one): see ride
    const was = { air: Player.air, pitch: Player.pitch }; // (what it was on, last step: the way it leaves a lip)
    if (!this.jump) Player.air = Player.pitch = 0;
    else if (!Player.active) this.jump = null;
    for (const c of this.bridges) this.ride(c, dt, live && Player.ghost <= 0 && Player.tank <= 0, was);

    // ---- wide loads
    const W = CONFIG.wideLoad;
    for (const w of this.loads) {
      if (w.done) continue;
      if (!w.on && w.s0 - Player.s < W.trigger && w.s0 - Player.s > -50) { w.on = true; Message.say('events', 'wideLoad'); }
      if (!w.on) continue;
      w.t += dt;
      const { load, escort } = w, was = from - (load.s + load.hl) > 0; // (was the player past its nose already, last step?)
      load.knocked = Math.max(0, (load.knocked || 0) - dt);
      escort.knocked = Math.max(0, (escort.knocked || 0) - dt);
      // the load: crawling along, swinging from one side of its lanes to the other and back
      if (!load.gone) {
        load.s += W.speed * dt;
        const [left, right] = w.ends(load.s);
        load.lat = left + (right - left) * this.loadSwing(w);
      }
      // its escort: behind it, moving over (slowly: escortSteer m/s) to stay in front of the player coming up
      // behind; with nobody behind, back to the middle of the load
      if (!escort.gone) {
        escort.s += W.speed * dt;
        const lo = w.lo(escort.s) - CONFIG.laneWidth / 2 + escort.hw, hi = Track.laneHi(escort.s) - escort.hw;
        const back = escort.s - Player.s; // (with the car `commit` s behind it or less it holds its line: a late jink always beats it)
        const want = back > 0 && back < W.commit * Math.max(4, Player.speed - W.speed) ? escort.lat : Math.max(lo, Math.min(hi, this.blocking(w) ? Player.lat : load.lat));
        escort.lat += Math.max(-W.escortSteer * dt, Math.min(W.escortSteer * dt, want - escort.lat));
      }
      // (past its nose: that is all there is to it)
      if (!w.passed && live && !was && Player.s - (load.s + load.hl) > 0 && Player.s - load.s < 40) w.passed = true;
      if (load.s > Track.length - 60 || Player.s - load.s > 200) { w.done = true; load.gone = escort.gone = true; }
    }

    // ---- shopping trolleys: rolling with the camber, bouncing back off the kerbs
    const T = CONFIG.trolley;
    for (const o of this.trolleys) {
      if (o.gone || Math.abs(o.s - Player.s) > 400) continue;
      const bend = Track.bend(o.s), r = o.cart, mid = (Track.lo(o.s) + Track.hi(o.s)) / 2;
      const pull = Math.abs(bend) > 5e-4 ? Math.sign(bend) * T.accel * Math.min(T.bend, 1 + Math.abs(bend) / 0.002) : Math.sign(o.lat - mid || 1) * T.accel;
      r.vel = Math.max(-T.top, Math.min(T.top, r.vel + pull * dt));
      o.lat += r.vel * dt;
      const lo = Track.lo(o.s) + o.hw, hi = Track.hi(o.s) - o.hw;
      if (o.lat < lo || o.lat > hi) {
        const side = o.lat < lo ? 1 : -1; // (the way back onto the road)
        o.lat = o.lat < lo ? lo : hi;
        r.vel = side * Math.max(T.kick, Math.abs(r.vel) * T.bounce);
      }
      o.face = r.vel > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // ---- marathons
    const R = CONFIG.marathon;
    for (const m of this.marathons) {
      if (!m.on && m.s0 - Player.s < R.trigger) m.on = true;
      if (!m.on) continue;
      for (const o of m.members) {
        if (o.gone) continue;
        o.run.t += dt;
        o.s += R.speed * dt;
        o.lat = Track.laneOffset(m.lane, o.s) + o.run.off + Math.sin(o.run.t * 2.1 + o.run.k) * R.wobble;
        if (o.s > Track.length - 20) o.gone = true;
      }
    }

    // ---- stampedes: charging down the road at the player
    const Z = CONFIG.stampede;
    for (const z of this.stampedes) {
      if (!z.on && Player.active && z.from - Player.s > 0 && z.from - Player.s < Z.trigger) { z.on = true; Message.say('events', 'stampede'); }
      if (!z.on) continue;
      for (const o of z.animals) {
        if (o.gone) continue;
        const c = o.charge;
        o.s -= c.speed * dt;
        c.phase += dt * 2.4;
        const lo = Track.lo(o.s) + o.hw, hi = Track.hi(o.s) - o.hw;
        o.lat = Math.max(lo, Math.min(hi, c.lat0 + Math.sin(c.phase) * Z.weave));
        o.h = o.kind === 'kangaroo' ? CONFIG.kangarooHop * Math.abs(Math.sin(c.phase * 1.4)) : 0;
        if (o.s < Player.s - Z.past || o.s < z.floor) o.gone = true;
      }
    }
  },
};
