// ============================================================================
// GUNFIRE - a level's gang war (The Hood: see levels.js "gunfire" and CONFIG.gunfire). In its stretches
// of turf, bursts of fire come from the houses beside the road, mostly at the player; a drive-by car
// (see Traffic) fires out of its window at whoever it has pulled up beside. Every bullet flies straight
// and stops in the first vehicle in its way (so a car between the player and the shooter is a shield),
// doing a little damage, and now and then puncturing a tyre: traffic pulls over onto the shoulder and
// stops; the player limps on (see Player.puncture) until it stops to change it.
// On the Battlefield (a level's "battle" with "pillboxes") the houses are pillboxes beside the road, half of
// them each army's, and each fires its bursts only at the other army's vehicles (the player is in the green).
// This is the shooting; render/gunfire.js draws the tracers and the muzzle flashes (render/battle.js the pillboxes).
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { hurt, sfxAt } from './physics.js';
import { Message } from './messages.js';

const between = (range) => range.min + Math.random() * (range.max - range.min);

// The suburb's lots (see render/road.js: the suburb scenery), the same every run: on each side, one
// every LOT m, and on most a house; where its front windows are, m out from the road's edge, or null
// for a little park. (A lot's odds come from its side and number, so the scenery and the shooters agree)
export const LOT = 26;
const lotRand = (side, k, salt) => {
  let x = Math.imul(k * 2654435761 + (side > 0 ? 97 : 31) + salt * 7919, 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
export const houseAt = (side, k) => {
  if (lotRand(side, k, 1) < 0.12) return null; // (a little park)
  const s = Track.start + (side > 0 ? 0 : LOT / 2) + k * LOT + LOT / 2;
  return { s, front: 9 + lotRand(side, k, 2) * 3, along: 9 + lotRand(side, k, 3) * 4, across: 8 + lotRand(side, k, 4) * 3, tall: lotRand(side, k, 5) < 0.4 };
};

// a gang house: one of the houses in a stretch of turf (a level's "gunfire") the gang shoots from, the
// same every run, marked out for all to see (see render/road.js); or null
export const gangHouse = (side, k) => {
  const house = houseAt(side, k);
  if (!house || !(LEVEL.gunfire || []).some(z => house.s > z.from && house.s < z.to)) return null;
  return lotRand(side, k, 6) < CONFIG.gunfire.gangShare ? house : null;
};
// where a house's front windows are on the road's map: { s, lat }, and which way across the road they face
const windowOf = (side, house) => ({ s: house.s, lat: side < 0 ? Track.lo(house.s) - house.front : Track.hi(house.s) + house.front, facing: -side });

export const Gunfire = {
  bullets: [],  // { s, lat, y, vs, vl, vy, life, owner, s0, lat0, y0 }
  flashes: [],  // muzzle flashes: { s, lat, y, t }
  bursts: [],   // a house's burst under way: { s, lat, y, facing, left, wait }
  cool: new Map(), // each gang house's s to wait before its next burst, by lot ('side:k')
  zone: null,   // the stretch of turf the player is in
  // the Battlefield's pillboxes: { s, side, team (1: the green army's, going the player's way; -1: the red's), lat, facing }
  pillboxes: [],

  reset() {
    const B = CONFIG.battle;
    this.pillboxes = [];
    if (LEVEL.battle && LEVEL.pillboxes) {
      for (const side of [-1, 1]) {
        for (let s = Track.start + 80 + (side > 0 ? 0 : B.pillboxEvery / 2), k = 0; s < Track.end - 40; s += B.pillboxEvery, k++) {
          this.pillboxes.push({ s, side, team: (k + (side > 0 ? 0 : 1)) % 2 ? 1 : -1, lat: side < 0 ? Track.lo(s) - B.pillboxOut : Track.hi(s) + B.pillboxOut, facing: -side });
        }
      }
    }
    this.bullets.length = 0;
    this.flashes.length = 0;
    this.bursts.length = 0;
    this.cool.clear();
    this.zone = null;
  },

  // one shot from (s, lat, y) at a vehicle, led for its speed, a little off true; from a house window
  // (from.facing), never further round than CONFIG.gunfire.arc from straight out across the road
  shoot(from, target, owner) {
    const G = CONFIG.gunfire;
    const tv = target.isPlayer ? Player.speed * Player.dir : target.vs;
    const far = Math.hypot(target.s - from.s, target.lat - from.lat);
    const flight = far / G.speed;
    let aimS = target.s + tv * flight + (Math.random() - 0.5) * 2 * G.spread;
    const aimLat = target.lat + (Math.random() - 0.5) * 2 * G.spread;
    if (from.facing) { // (out of a window: within its arc)
      const most = Math.abs(aimLat - from.lat) * Math.tan(G.arc);
      aimS = from.s + Math.max(-most, Math.min(most, aimS - from.s));
    }
    const aimY = 0.7 + Math.random() * 0.5;
    const ds = aimS - from.s, dl = aimLat - from.lat, dy = aimY - from.y, len = Math.hypot(ds, dl, dy) || 1;
    this.bullets.push({ s: from.s, lat: from.lat, y: from.y, vs: ds / len * G.speed, vl: dl / len * G.speed, vy: dy / len * G.speed,
      life: G.range / G.speed, owner, s0: from.s, lat0: from.lat, y0: from.y });
    this.flashes.push({ s: from.s, lat: from.lat, y: from.y, t: G.flashTime });
    sfxAt('gunshot', from.s, 0.7);
  },

  // a vehicle a bullet has stopped in: a little damage, and perhaps a puncture
  hit(v) {
    const G = CONFIG.gunfire;
    if (v.isPlayer) {
      if (Player.shield > 0 || Player.ghost > 0) return false; // (it passes through: see the shield after a respawn, and the ghost)
      if (Player.tank <= 0) hurt(Player, G.damage);
      if (Player.tank <= 0 && Math.random() < G.puncture) Player.punctureTyre(Math.random() < 0.5 ? -1 : 1);
    } else {
      hurt(v, G.damage);
      v.showMood = true;
      // (nothing without tyres; a tank's tracks only a blast breaks: see CONFIG.brokenTracks)
      if (!v.courier && !v.racer && !CONFIG.vehicles[v.kind]?.noWheels && v.kind !== 'tank' && Math.random() < G.puncture) v.punctured = true;
    }
    return true;
  },

  update(dt) {
    const G = CONFIG.gunfire;
    // the turf: where the houses shoot (and the player is told so, on coming into it); the houses only fire
    // within `seen` m beyond their range of the player (see CONFIG.gunfire)
    const zone = Player.active ? (LEVEL.gunfire || []).find(z => Player.s >= z.from && Player.s <= z.to) || null : null;
    if (zone && zone !== this.zone) Message.say('events', 'turf');
    this.zone = zone;
    // a gang house (near the player, where it can be seen) fires a burst at whatever is passing through
    // its arc (a narrow one, out across the road from its windows) within range: any car, the player's no
    // more than the rest, picked at random; and then it waits a while before the next
    for (const [key, t] of this.cool) this.cool.set(key, t - dt);
    if (Player.active) {
      const near = G.range + G.seen;
      for (const side of [-1, 1]) {
        const k0 = Math.floor((Player.s - near - Track.start - (side > 0 ? 0 : LOT / 2)) / LOT);
        const k1 = Math.floor((Player.s + near - Track.start - (side > 0 ? 0 : LOT / 2)) / LOT);
        for (let k = k0; k <= k1; k++) {
          const house = gangHouse(side, k), key = side + ':' + k;
          if (!house || (this.cool.get(key) ?? 0) > 0) continue;
          const w = windowOf(side, house);
          const inArc = Collision.bodies.filter(v => {
            if (!v.active || v.junction || v.parked) return false;
            const ds = v.s - w.s, dl = v.lat - w.lat;
            return Math.hypot(ds, dl) <= G.range && Math.atan2(Math.abs(ds), Math.abs(dl)) <= G.arc;
          });
          if (!inArc.length) continue;
          this.cool.set(key, between(zone?.every || G.every));
          this.bursts.push({ ...w, target: inArc[Math.floor(Math.random() * inArc.length)], y: house.tall && Math.random() < 0.5 ? 4.4 : 1.6,
            left: Math.round(between(G.shots)), wait: 0 });
        }
      }
    }
    // the Battlefield's pillboxes: the same, but each only at the other army's vehicles
    if (Player.active) {
      const near = G.range + G.seen;
      this.pillboxes.forEach((box, i) => {
        const key = 'pb:' + i;
        if (Math.abs(box.s - Player.s) > near || (this.cool.get(key) ?? 0) > 0) return;
        const inArc = Collision.bodies.filter(v => {
          if (!v.active || v.junction || (v.isPlayer ? 1 : v.dir) === box.team || (v.isPlayer && Player.ghost > 0)) return false;
          const ds = v.s - box.s, dl = v.lat - box.lat;
          return Math.hypot(ds, dl) <= G.range && Math.atan2(Math.abs(ds), Math.abs(dl)) <= G.arc;
        });
        if (!inArc.length) return;
        this.cool.set(key, between(G.every));
        this.bursts.push({ s: box.s, lat: box.lat, facing: box.facing, target: inArc[Math.floor(Math.random() * inArc.length)], y: 1.15 * CONFIG.battle.pillboxScale, // (out of its slit)
          left: Math.round(between(G.shots)), wait: 0 });
      });
    }
    for (const b of this.bursts) {
      if ((b.wait -= dt) > 0 || b.left <= 0) continue;
      b.wait = G.shotGap;
      b.left--;
      if (b.target.active) this.shoot(b, b.target, null);
    }
    this.bursts = this.bursts.filter(b => b.left > 0);
    // the bullets: straight on until they stop in something, or are spent
    const bodies = Collision.bodies;
    for (const p of this.bullets) {
      p.s += p.vs * dt;
      p.lat += p.vl * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.y < 0) p.life = 0; // (into the road)
      if (p.life <= 0) continue;
      for (const v of bodies) {
        if (!v.active || v === p.owner || v.junction || p.y > v.height + 0.2) continue;
        if (Math.abs(v.s - p.s) > v.hl || Math.abs(v.lat - p.lat) > v.hw) continue;
        if (this.hit(v)) { p.life = 0; break; }
      }
    }
    this.bullets = this.bullets.filter(p => p.life > 0);
    for (const f of this.flashes) f.t -= dt;
    this.flashes = this.flashes.filter(f => f.t > 0);
  },
};
