import { CONFIG } from './config.js';
import { Progress } from './progress.js';
import { LEVEL } from './levels.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { FxQueue, maybeSpinOut, startRivalry, hurt, sfx, sfxAt } from './physics.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Collision } from './collision.js';
import { Targets } from './pickups.js';
import { Game } from './game.js';
import { Message } from './messages.js';
import { Social } from './social.js';
import { CAR } from './cars.js';

// ============================================================================
// PACKAGES - thrown at the nearest car ahead within range; each flies an arc in
// track space and uses its own small hitbox, so a swerving target can dodge it
// ============================================================================
export const Packages = (() => {
  // kind: 'gift' (a Good player's care package), 'fire' (an Evil player's flaming one),
  // 'bomb' (an evil traffic car's, aimed at the road),
  // 'shell' (the tank's cannon; or a gun's on the Battlefield, the player's 8x8's or an army's: p.gun)
  const list = [];
  for (let i = 0; i < 64; i++) {
    list.push({ active: false, owner: null, kind: 'gift', s: 0, lat: 0, h: 0, endH: 0.6, arc: 0,
      vs: 0, vlat: 0, t: 0, flight: 1, yaw: 0, hw: 0.35, hl: 0.35 });
  }
  let cooldown = 0;
  const spread = (range) => (Math.random() - 0.5) * 2 * range;
  // how far apart two things { s, lat } are, in the world: not along the road and across it, by which what
  // is on the other side of a split (a level's "splits") or on another road at a fork would seem close by
  const pointA = {}, pointB = {};
  const distance = (a, b) => {
    Track.toWorld(a.s, a.lat, pointA);
    Track.toWorld(b.s, b.lat, pointB);
    return Math.hypot(pointB.x - pointA.x, pointB.z - pointA.z);
  };

  const reset = () => {
    cooldown = 0;
    for (const p of list) p.active = false;
    Player.turret = 0;
    Player.gunTarget = null;
  };
  // the way round from the player's nose to a vehicle (rad, + = to its right), in the world, not along the
  // road: the gun sits on a hull that swerves (Player.yaw), on a road that bends away under its target
  const here = {}, there = {};
  const bearing = (foe) => {
    const nose = Track.toWorld(Player.s, Player.lat, here) - Player.yaw;
    Track.toWorld(foe.s, foe.lat, there);
    return nose - Math.atan2(there.x - here.x, there.z - here.z);
  };
  // the way the player's 8x8's gun is turned (rad from straight ahead, + = to its right): to the target it would
  // fire at (see gunTarget), turning at twice an army turret's rate, or back to straight ahead with none
  const aimTurret = (dt) => {
    const gun = Player.tank > 0 ? null : CAR.cannon;
    const foe = gun && Player.active ? gunTarget(gun) : null;
    Player.gunTarget = foe;
    const want = foe ? bearing(foe) : 0;
    const turn = 2 * CONFIG.battle.turn * dt, now = Player.turret || 0;
    Player.turret = now + clamp(Math.atan2(Math.sin(want - now), Math.cos(want - now)), -turn, turn);
  };

  // aim is a point { s, lat, vs, latVel }; the throw leads it by the flight time
  const launch = (owner, aim, kind, flight) => {
    const p = list.find(q => !q.active);
    if (!p) return false;
    p.owner = owner;
    p.kind = kind;
    p.s = owner.s + owner.dir * owner.hl;
    p.lat = owner.lat;
    p.t = 0;
    p.h = 1.2;
    p.endH = aim.height || 0.6;
    p.arc = kind === 'shell' ? 0.4 : CONFIG.throwArc;
    p.flight = flight || clamp(distance(aim, p) / CONFIG.throwSpeed,
      CONFIG.throwFlightMin, CONFIG.throwFlightMax);
    p.vs = (aim.s + aim.vs * p.flight - p.s) / p.flight;
    p.vlat = (aim.lat + aim.latVel * p.flight - p.lat) / p.flight;
    p.from = p.to = null; // (see the cannon)
    // (thrown over to the other side of a split: it flies straight across the gap, as the cannon's shell does,
    // not along the road, on which there is no gap for it to cross)
    const centre = -Track.medianHalf, landS = p.s + p.vs * p.flight, landLat = p.lat + p.vlat * p.flight;
    if (Track.isMain(p.s) && (p.lat < centre) !== (landLat < centre) && (Track.apart(p.s) > 0 || Track.apart(landS) > 0)) {
      p.from = {};
      Track.toWorld(p.s, p.lat, p.from);
      p.to = {};
      Track.toWorld(landS, landLat, p.to);
    }
    p.gun = null;         // (a Battlefield gun's shell: how hard it hits, see blast)
    p.active = true;
    return p;
  };

  // the player throws at the nearest car within range, or at a TANK RAGE target if one is (null if
  // there is nothing to throw at). A car behind counts too, but as throwBehind times as far off
  const findTarget = () => {
    let best = null, bestDist = CONFIG.throwRange;
    for (const t of Targets.items) {
      if (t.used || t.s - Player.s <= Player.hl) continue;
      const dist = distance(t, Player);
      if (dist < bestDist) { best = t; bestDist = dist; }
    }
    if (best) return best;
    for (const car of Traffic.cars) {
      if (!car.active || car.courier) continue; // (a rival courier is no target: see CONFIG.rival)
      const dist = distance(car, Player) * (car.s < Player.s ? CONFIG.throwBehind : 1);
      if (dist < bestDist) { best = car; bestDist = dist; }
    }
    return best;
  };
  const gunTarget = (gun) => {
    let best = null, bestDist = gun.range;
    for (const car of Traffic.cars) {
      if (!car.active || car.courier || car.health <= 0 || sameSide(car, Player) || (!LEVEL.battle && !car.evil)) continue; // (not Good)
      const dist = distance(car, Player) * (car.s < Player.s ? CONFIG.throwBehind : 1);
      if (dist < bestDist) { best = car; bestDist = dist; }
    }
    return best;
  };
  const throwOne = () => {
    if (!Player.active || Player.busted || cooldown > 0) return; // (no throwing while being busted)
    if (Player.butterfingers > 0) return; // (butterfingers: it slips through them)
    let gun = Player.tank > 0 ? null : CAR.cannon; // (the Battlefield's 8x8: a gun of its own, smaller)
    if (LEVEL.noPackages && !gun) return false; // (a level where nobody throws anything)
    // the 8x8's gun picks its target as a package does (the nearest, one behind counting as throwBehind
    // times as far off), within its range, but never a vehicle of the green army; with none, it fires straight
    const foe = gun && gunTarget(gun);
    // (Big Splash: the shell hits harder and its blast reaches further, catching the enemies about the target too)
    const S = CONFIG.bigSplash.gun;
    if (gun && Player.bigSplash > 0) gun = { ...gun, damage: gun.damage * S.damage, splash: gun.splash * S.splash, scale: gun.scale * S.scale };
    if (foe) {
      if (fireShell(Player, foe, gun)) {
        cooldown = gun.cooldown;
        Player.turret = bearing(foe); // (it fires where it points)
      }
      return;
    }
    if (Player.tank > 0 || gun) {
      // The cannon isn't aimed: the shell flies dead straight the way the tank is pointing, not
      // round a bend with the road, and lands cannonRange ahead of where the tank will be by
      // then. It is drawn flying between the two world points (from, to); where it lands is
      // that point's place on the road.
      const flight = 0.3, centre = {};
      const h = Track.toWorld(Player.s, Player.lat, centre) - Player.yaw; // (the way the nose points)
      const reach = (gun ? gun.range : CONFIG.cannonRange) + Player.speed * flight;
      const to = { x: centre.x + Math.sin(h) * reach, z: centre.z + Math.cos(h) * reach };
      const land = Track.fromWorld(to.x, to.z, Player.s + reach);
      Track.toWorld(land.s, land.lat, to); // (and its height there)
      const p = launch(Player, { s: land.s, lat: land.lat, vs: 0, latVel: 0 }, 'shell', flight);
      if (p) {
        p.from = {};
        Track.toWorld(p.s, p.lat, p.from); // (the muzzle)
        p.to = to;
        p.gun = gun;
        cooldown = gun ? gun.cooldown : CONFIG.cannonCooldown;
        sfx('cannon');
      }
      return;
    }
    // (with nothing in range it is thrown anyway, to land on the road ahead of the car)
    const target = findTarget() ||
      { s: Player.s + CONFIG.throwBlind, lat: Player.lat, vs: Player.speed, latVel: 0 };
    if (launch(Player, target, Player.evil ? 'fire' : 'gift')) {
      cooldown = CONFIG.throwCooldown;
      sfx('throw');
    }
  };

  // a Battlefield gun firing (an 8x8's or a tank's, gun: CONFIG.battle.guns): a shell flying straight from
  // its muzzle to where the target will be, quickly
  const fireShell = (car, target, gun) => {
    const tv = target.isPlayer ? Player.speed : target.vs;
    const far = distance(target, car), flight = Math.max(0.2, far / CONFIG.battle.shellSpeed);
    const p = launch(car, { s: target.s, lat: target.lat, vs: tv, latVel: target.latVel || 0 }, 'shell', flight);
    if (!p) return false;
    p.gun = gun;
    p.from = {};
    Track.toWorld(p.s, p.lat, p.from);
    p.from.y += car.height * 0.8;
    p.to = {};
    Track.toWorld(p.s + p.vs * flight, p.lat + p.vlat * flight, p.to);
    sfxAt('cannon', car.s, 0.7);
    return true;
  };
  // (on the Battlefield nobody's shell or package hurts its own side: an army's going the way it does,
  // the player's going the player's way)
  const sameSide = (v, owner) => LEVEL.battle && !!owner && (v.isPlayer ? 1 : v.dir) === (owner.isPlayer ? 1 : owner.dir);

  // an evil car's throw, aimed at the road where its victim will be (the splash does the
  // damage): near the player if the player has upset this driver (or, now and then, given it a gift), otherwise at
  // its rival or the nearest other vehicle within range, and with nobody about, a random spot ahead
  // of itself. (aim 'escort': a wingman's, never at the player, at whatever is nearest the player.)
  // Never at a police car: not even the angriest driver picks on the police
  const throwAtGround = (car, aim = null) => {
    const scatter = CONFIG.enemyThrowScatter;
    // (aim: 'escort', or a particular car to throw at: a rival courier clearing its way)
    let victim = aim && typeof aim === 'object' ? aim
      : (car.grudge > 0 || car.offended > 0 || (car.spite && Math.random() < CONFIG.giftSpite)) && aim !== 'escort' ? Player : null;
    if (!victim && aim === 'escort') {
      let best = CONFIG.enemyThrowCarRange;
      for (const o of Traffic.cars) {
        if (o === car || !o.active || o.kind === 'police' || o.courier) continue;
        const dist = distance(o, Player);
        if (dist < best) { best = dist; victim = o; }
      }
    } else if (!victim) {
      let best = CONFIG.enemyThrowCarRange;
      const rival = car.rival && car.rival.active && car.rival.kind !== 'police' ? car.rival : null;
      for (const o of rival ? [rival] : Traffic.cars) {
        if (o === car || !o.active || o.kind === 'police' || o.courier) continue;
        const dist = distance(o, car);
        if (dist < best) { best = dist; victim = o; }
      }
    }
    if (victim) {
      launch(car, { s: victim.s + spread(scatter), lat: victim.lat + spread(scatter),
        vs: victim.vs, latVel: victim.latVel }, 'bomb');
    } else {
      const s = car.s + car.dir * (10 + Math.random() * 30);
      const lat = Track.laneLo(s) + Math.random() * (Track.laneHi(s) - Track.laneLo(s));
      launch(car, { s, lat, vs: 0, latVel: 0 }, 'bomb');
    }
  };

  // a blast breaking a traffic tank's track, chance of the time (see CONFIG.brokenTracks): it grinds to a halt
  const breakTrack = (v, chance) => {
    if (v.isPlayer || v.kind !== 'tank' || v.tracksBroken || v.health <= 0 || Math.random() >= chance) return;
    v.tracksBroken = true;
    sfxAt('sideswipe', v.s); // (the track snapping)
  };

  // an evil car's package going off on the road
  const splash = (p) => {
    for (const v of Collision.bodies) {
      if (!v.active || v === p.owner || v.shield > 0 || v.tank > 0 || v.courier || sameSide(v, p.owner)) continue; // (nor a rival courier)
      if (distance(v, p) > CONFIG.splashRadius) continue;
      hurt(v, CONFIG.splashDamage);
      breakTrack(v, CONFIG.brokenTracks.splash);
      if (v.isPlayer) {
        Game.shake = Math.max(Game.shake, 0.4);
        Traffic.arrest(p.owner); // (under the player's siren, the thrower is taken away)
      }
      else {
        v.showMood = true;
        startRivalry(v, p.owner); // traffic caught in another car's blast holds it against them
      }
    }
  };

  // a car that is done for: out of health, spinning out, or wobbling before it does. One the
  // player's thrown package dooms is marked, so its explosion can be put down to the player (see
  // Collision); the tank's shells don't count
  const doomed = (car) => car.health <= 0 || car.spin > 0 || car.wobble > 0;

  // the cannon shell going off: destroys what it lands on, badly damages what is near
  // (it goes off with the lighter 'burst' sound, not a full explosion's)
  // (a Battlefield gun's shell hits as its gun says, p.gun: a direct hit only destroys a vehicle outright
  // if the gun's damage would; the rest of its splash, in proportion. Never its own side)
  const blast = (p) => {
    const G = p.gun, direct = G ? G.direct : CONFIG.cannonDirectRadius, reach = G ? G.splash : CONFIG.cannonSplashRadius;
    for (const car of Traffic.cars) {
      if (!car.active || car.courier || car === p.owner || sameSide(car, p.owner)) continue;
      const dist = distance(car, p);
      if (dist < direct + car.hl * 0.5) {
        if (G) hurt(car, G.damage * 2, CONFIG.cannonCrit);
        else car.health = 0;
        breakTrack(car, CONFIG.brokenTracks.direct);
      } else if (dist < reach) {
        hurt(car, G ? G.damage * (1 - dist / reach) : CONFIG.cannonSplashDamage, CONFIG.cannonCrit);
        breakTrack(car, CONFIG.brokenTracks.splash);
      }
      if (G && car.health <= 0 && p.owner === Player) car.wreckedByPlayer = true;
    }
    // (an army's shell, on the player: see CONFIG.battle.shellOnPlayer)
    if (p.owner !== Player && Player.active && Player.shield <= 0 && Player.ghost <= 0 && !sameSide(Player, p.owner)) {
      const dist = distance(Player, p), S = CONFIG.battle.shellOnPlayer;
      if (dist < direct + Player.hl * 0.5) hurt(Player, S.direct);
      else if (dist < reach) hurt(Player, S.splash * (1 - dist / reach));
      if (dist < reach) Game.shake = Math.max(Game.shake, 0.8);
    }
    for (const o of Collision.obstacles) {
      if (o.gone || o.kind === 'landmine' || distance(o, p) > reach) continue; // (a blast sets off no landmine)
      o.gone = true;
      FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: 0, big: false });
    }
    if (p.owner === Player) Game.shake = Math.max(Game.shake, 0.7);
    FxQueue.push({ type: 'explode', s: p.s, lat: p.lat, vs: 0, big: true,
      scale: G ? G.scale : CONFIG.cannonBlastScale, smoke: CONFIG.cannonSmoke, sound: 'burst' });
  };

  // a police car (not one turned into a toad in TOAD RAGE): it has reactions of its own
  const cop = (car) => (car.kind === 'police' || car.kind === 'interceptor') && !car.toad; // (a pursuit's interceptor too: assaulting it is a bust; it sees nothing else, being busy: see Traffic.policeNear)
  // the player's care package arriving
  const deliver = (p, car) => {
    Progress.count('packagesLanded'); // (a milestone counter: see milestones.js)
    const boosted = Player.bigSplash > 0, B = CONFIG.bigSplash; // (Big Splash: harder hits)
    if (p.kind === 'fire') { // an Evil player's package: real damage, and it makes enemies
      const damage = boosted ? B.fireDamage : CONFIG.evilPackageDamage;
      car.health -= damage;
      car.mood = Math.max(-1, car.mood - damage * CONFIG.moodPerDamage);
      maybeSpinOut(car, damage, CONFIG.packageSpinScale);
      car.grudge = CONFIG.grudgeTime;
      car.showMood = true;
      // attacking a police car, or anyone while a police car is watching, is a bust
      // (a police car turned into a toad in TOAD RAGE is just a toad)
      if (cop(car)) Player.bust('assaultCop');
      else if (Traffic.policeNear()) Player.bust('assault');
      // (the driver's reaction, unless the package has destroyed the car outright: a spin-out or a
      // critical hit still gets one. A police officer only has one when there is no bust for it,
      // the player's radar detector running; otherwise the bust says it all)
      if (car.health > 0) {
        if (!cop(car)) Message.say('reactions', car.evil ? 'anyOnEvil' : 'evilOnGood');
        else if (Player.radar > 0) Message.say('reactions', 'evilOnPolice');
      }
      FxQueue.push({ type: 'burst', s: p.s, lat: p.lat, vs: car.vs });
      return;
    }
    // (a boosted gift to an evil driver: a pelting, a point of damage at a time in quick succession,
    // each a chance of a critical hit: see update; to anyone else, a harder knock)
    if (boosted && car.evil) car.pelts = (car.pelts || 0) + B.giftDamage;
    else {
      const damage = boosted ? B.giftDamage : CONFIG.packageDamage;
      car.health -= damage;
      maybeSpinOut(car, damage, CONFIG.packageSpinScale);
    }
    if (car.evil) { // evil drivers take a gift as an insult: furious, though it shows only in a while of
      // throwing at you, then a throw at you now and then (no road rage: see Traffic's attitude)
      car.mood = -1;
      car.offended = CONFIG.giftOffence;
      car.spite = true;
      car.showMood = true;
    } else {
      car.mood = Math.min(1, car.mood + CONFIG.packageMoodBoost);
      Social.gift(cop(car)); // (a good deed: the player's standing goes up, the more for a police car)
    }
    // (the driver's reaction, unless the package has destroyed the car outright: a spin-out or a
    // critical hit still gets one)
    if (car.health > 0) Message.say('reactions', cop(car) ? 'goodOnPolice' : car.evil ? 'anyOnEvil' : 'goodOnGood');
    car.showMood = true;
    FxQueue.push({ type: 'gift', s: p.s, lat: p.lat, vs: car.vs });
  };

  // Big Splash (a pickup): the player's package catches every car within CONFIG.bigSplash.radius m
  // of where it hits a car (or lands), as if it had hit each of them
  const splashAround = (p, hit) => {
    if (!(Player.bigSplash > 0) || (p.kind !== 'gift' && p.kind !== 'fire')) return;
    for (const car of Traffic.cars) {
      if (car === hit || !car.active || car.arrest >= 0 || car.emergency || car.junction || car.courier) continue;
      if (distance(car, p) > CONFIG.bigSplash.radius) continue;
      const was = doomed(car);
      deliver(p, car);
      if (!was && doomed(car)) car.wreckedByPlayer = true;
    }
  };
  const update = (dt) => {
    cooldown = Math.max(0, cooldown - dt);
    aimTurret(dt);
    // a boosted gift's pelting of an evil driver, a point of damage at a time (see deliver)
    for (const car of Traffic.cars) {
      if (!(car.pelts > 0)) continue;
      if (!car.active) { car.pelts = 0; continue; }
      if ((car.peltWait = (car.peltWait || 0) - dt) > 0) continue;
      car.peltWait = CONFIG.bigSplash.peltEvery;
      car.pelts--;
      const was = doomed(car);
      car.health -= 1;
      maybeSpinOut(car, 1, CONFIG.packageSpinScale);
      if (!was && doomed(car)) car.wreckedByPlayer = true;
    }
    for (const p of list) {
      if (!p.active) continue;
      p.t += dt;
      p.s += p.vs * dt;
      p.lat += p.vlat * dt;
      const u = p.t / p.flight;
      p.h = 1.2 + (p.endH - 1.2) * u + p.arc * 4 * u * (1 - u);

      if (p.kind === 'gift' || p.kind === 'fire') {
        for (const t of Targets.items) {
          if (t.used || Math.abs(t.s - p.s) > 2.5 || Math.abs(t.lat - p.lat) > 2.5) continue;
          t.used = true;
          // the next piece of the tank; the fifth completes it, and TANK RAGE begins
          Game.tankPieces = Math.min(CONFIG.tankPieces, Game.tankPieces + 1);
          if (Game.tankPieces >= CONFIG.tankPieces) {
            Player.startTank();
            sfx('tank');
            Message.say('powerups', 'tankRage');
          } else {
            sfx('tankPiece');
            Message.say('tankParts', CONFIG.tankParts[Game.tankPieces - 1]);
          }
          FxQueue.push({ type: 'gift', s: t.s, lat: t.lat, vs: 0, green: true });
          p.active = false;
          break;
        }
        for (const car of Traffic.cars) {
          if (!p.active) break;
          if (!car.active || car.arrest >= 0 || car.emergency || car.junction || car.courier || p.h > car.height + 0.6) continue; // (a package goes straight past a rival courier)
          if (Math.abs(car.s - p.s) > car.hl + 1 || !Collision.overlap(p, car)) continue;
          const was = doomed(car);
          deliver(p, car);
          if (!was && doomed(car)) car.wreckedByPlayer = true;
          splashAround(p, car);
          p.active = false;
        }
      }
      if (p.active && u >= 1) { // landed
        if (p.kind === 'shell') blast(p);
        else if (p.kind === 'bomb') splash(p);
        else splashAround(p, null);
        if (p.kind !== 'shell') FxQueue.push({ type: p.kind === 'gift' ? 'gift' : 'burst', s: p.s, lat: p.lat, vs: 0 });
        p.active = false;
      }
    }
  };

  // the screensaver going round again: packages in the air move back a lap with the road
  const lap = (length) => { for (const p of list) if (p.active) p.s -= length; };

  return { list, reset, update, lap, throwOne, throwAtGround, fireShell,
    get ready() { return cooldown <= 0 && !Player.busted; } };
})();
