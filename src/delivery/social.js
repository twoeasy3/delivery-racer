// ============================================================================
// SOCIAL STANDING - a good player's standing with the public, from 0 to 1 (an evil player has none).
// It is won only by gifts that land (on a good driver, or more on a police car) and it drains away
// all the time. The higher it is, the kinder the road (see CONFIG.social): the police see less
// far, fewer drivers are evil (down to a floor) and every new driver arrives happier, the shoulder
// allowance is longer, good powerups (and good mysteries) last longer and bad ones shorter, the
// good mysteries come up more often; past a point the car mends itself a little, and past another,
// a car that assaults the player with a police car about is arrested. A bust costs it dearly, and
// in high standing the police let the player off with a caution instead (see Player.bust).
// ============================================================================
import { CONFIG } from './config.js';
import { Player } from './player.js';

const C = CONFIG.social;
// the mysteries that are good for the player, and those that are bad (the rest are neither)
const GOOD_MYSTERIES = ['toad', 'invincible', 'angel', 'ufo', 'sundayDrivers', 'soupedUp', 'giant', 'magnet', 'trafficFreeze', 'rewind'],
  BAD_MYSTERIES = ['rickety', 'jerk', 'noBrakes', 'rushHour', 'earthquake', 'blackout'];

export const Social = {
  standing: 0,
  get level() { return this.standing; },
  // (the shoulder allowance goes with it, and the meter keeps its share as that grows or shrinks:
  // a full meter stays full)
  set level(v) {
    const before = this.dangerTime;
    this.standing = v;
    if (before > 0) Player.danger *= this.dangerTime / before;
  },
  reset() { this.level = 0; },
  // only a good player has a standing (and only with packages to give)
  get on() { return !Player.evil; },
  // a bust (or a caution instead of one): it costs the standing dearly. True: let off with a caution
  busted() {
    if (!this.on) return false;
    const caution = this.level > C.cautionFrom;
    this.level = Math.max(0, this.level - C.bust / 100);
    return caution;
  },
  // a gift landed: on a police car, or another good driver
  gift(cop) {
    if (this.on) this.level = Math.min(1, this.level + (cop ? C.copGift : C.gift) / 100);
  },
  update(dt) {
    if (!this.on) { this.level = 0; return; }
    this.level = Math.max(0, this.level - C.decay / 100 * dt);
    // (past regen.from, the car mends itself, a touch faster the higher the standing)
    const R = C.regen;
    if (Player.active && Player.health > 0 && this.level >= R.from) {
      const share = R.min + (R.max - R.min) * (this.level - R.from) / (1 - R.from);
      Player.health = Math.min(Player.maxHealth, Player.health + Player.maxHealth * share * dt);
    }
  },
  // how far a police car sees (m along the road): further than usual with no standing, less with more
  get policeSight() {
    if (!this.on) return CONFIG.policeSightRange;
    return CONFIG.policeSightRange * (C.policeSight.empty + (C.policeSight.full - C.policeSight.empty) * this.level);
  },
  // the share of new traffic that is evil, from the level's own share down towards the floor
  evilShare(base) {
    return base - (base - Math.min(base, C.evilFloor)) * (this.on ? this.level : 0);
  },
  // how much happier every new driver starts
  get moodLift() { return this.on ? C.moodLift * this.level : 0; },
  // s of shoulder driving allowed before the police step in
  get dangerTime() { return CONFIG.dangerTime * (1 + (this.on ? C.danger * this.level : 0)); },
  // s more (good) or less (bad) a powerup or mystery effect lasts
  powerUpShift(type) {
    const good = ['turbo', 'radarDetector', 'siren', 'ghost', 'passenger', 'armour', 'bigSplash', ...GOOD_MYSTERIES].includes(type);
    const bad = ['badGas', 'heavyMass', 'butterfingers', ...BAD_MYSTERIES].includes(type);
    const shift = this.on ? C.powerUpShift * this.level : 0;
    return good ? shift : bad ? -shift : 0;
  },
  // how likely a mystery effect is, against the rest: the good ones come up more often
  mysteryWeight(effect) { return GOOD_MYSTERIES.includes(effect) && this.on ? 1 + C.luck * this.level : 1; },
  // a car that assaults the player with a police car about is arrested (see Traffic.arrest)
  get protected() { return this.on && this.level >= C.protectFrom; },
};
