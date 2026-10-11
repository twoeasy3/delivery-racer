// ============================================================================
// UFO AIR STRIKE - one of the mystery pickup's effects. A flying saucer comes down over the
// player's car and hovers there; as it settles, every vehicle on the road at that moment starts
// to burn up (while it hovers, not after it has gone), losing health faster and faster until it blows (most within 3-5 s).
// This is only the timeline and the damage; render/ufostrike.js draws the saucer.
// ============================================================================
import { CONFIG } from './config.js';
import { hurt } from './physics.js';
import { Traffic } from './traffic.js';

const NEXT = { arrive: 'hover', hover: 'leave', leave: '' };

export const UfoStrike = {
  phase: '', // '' (not here) | 'arrive' | 'hover' | 'leave'
  t: 0,      // s into the phase
  burn: -1,  // s since the burn began, -1 = no burn
  start() {
    this.phase = 'arrive';
    this.t = 0;
  },
  reset() {
    this.phase = '';
    this.burn = -1;
    for (const car of Traffic.cars) car.ufoBurning = false;
  },
  update(dt) {
    const U = CONFIG.ufoStrike;
    if (this.phase) {
      this.t += dt;
      if (this.t >= U[this.phase]) {
        if (this.phase === 'arrive') { // hovering over the car now: everything on the road is doomed, and starts to burn at once
          for (const car of Traffic.cars) if (car.active && !car.junction) car.ufoBurning = true;
          this.burn = 0;
        }
        this.phase = NEXT[this.phase];
        this.t = 0;
      }
    }
    if (this.burn < 0) return;
    this.burn += dt;
    const rate = U.burnRate * Math.exp(U.burnGrowth * this.burn);
    let burning = false;
    for (const car of Traffic.cars) {
      if (!car.active || !car.ufoBurning) continue;
      // the usual damage, so cars sour and may spin out as they burn, but with no critical hits
      // (a critical hit is a fixed chance per hit, and this is a hit every frame)
      hurt(car, rate * dt, 0);
      burning = true;
    }
    if (!burning) this.burn = -1; // (all gone)
  },
};
