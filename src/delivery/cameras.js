// ============================================================================
// SPEED CAMERAS - a level's "cameras" (see levels.js and CONFIG.speedCamera): each stands on its
// pole on a shoulder or on the centre line (an obstacle: see Collision). The player passing one
// faster than its limit is caught: the first time in a run it is a fine, taken off what the run
// banks (Game.fines); every time after that, a bust. Running one over is no offence: it is gone,
// and so is its film. A radar detector keeps the car from being caught at all, and nobody fines a tank.
// This is what they do; render/roadside.js draws the camera's lamp and the flash across the screen.
// ============================================================================
import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { Track } from './track.js';
import { Player } from './player.js';
import { Collision } from './collision.js';
import { Message } from './messages.js';
import { sfx } from './physics.js';
import { Game } from './game.js';

export const SpeedCameras = {
  // { s, limit (m/s), obstacle, passed, flash (s left of its flash) }
  list: [],
  caught: 0, // offences this run
  lastS: 0,  // where the player was last step (to see it pass a camera)

  reset() {
    const C = CONFIG.speedCamera;
    this.list = (LEVEL.cameras || []).map((c, i) => ({
      s: Track.place(c), limit: (c.limit ?? LEVEL.speedLimit ?? C.limit) / 3.6,
      obstacle: Collision.obstacles.find(o => o.camera === i), passed: false, warned: false, flash: 0,
    }));
    this.caught = 0;
    this.lastS = Player.s;
  },

  update(dt) {
    for (const cam of this.list) cam.flash = Math.max(0, cam.flash - dt);
    const from = this.lastS, to = Player.s;
    this.lastS = to;
    if (!Player.active || Game.state !== 'playing' || to - from > 30) return; // (not a car set down further on)
    // a warning of one coming up, radar detector or not (CONFIG.speedCamera.warn): the limit, and how fast the car is going
    for (const cam of this.list) {
      if (cam.warned || cam.passed || cam.obstacle?.gone || cam.s - to > CONFIG.speedCamera.warn || cam.s < to) continue;
      cam.warned = true;
      const line = Message.say('events', 'speedCameraAhead');
      if (line) line.text = line.text.replace('${limit}', Math.round(cam.limit * 3.6));
    }
    for (const cam of this.list) {
      if (cam.passed || !(from < cam.s && to >= cam.s)) continue;
      cam.passed = true;
      if (cam.obstacle?.gone) continue; // (run over: no camera, no offence)
      if (Player.speed <= cam.limit || Player.radar > 0 || Player.tank > 0) continue;
      cam.flash = CONFIG.speedCamera.flash;
      sfx('camera');
      this.caught++;
      const kmh = Math.round(Player.speed * 3.6), limit = Math.round(cam.limit * 3.6);
      if (this.caught === 1) {
        const fine = this.fineFor((Player.speed - cam.limit) * 3.6);
        Game.fines += fine;
        const line = Message.say('events', 'speedFine');
        if (line) line.text = line.text.replace('${speed}', kmh).replace('${limit}', limit).replace('${fine}', '$' + fine);
      } else Player.bust('speeding');
    }
  },
  // the fine for being `over` km/h over the limit: the step it reached (CONFIG.speedCamera.fines)
  fineFor(over) {
    let fine = 0;
    for (const step of CONFIG.speedCamera.fines) if (over > step.over) fine = step.fine;
    return fine;
  },
  // the brightest flash going just now, 0..1 (for the screen's flash)
  get flash() { return Math.max(0, ...this.list.map(c => c.flash)) / CONFIG.speedCamera.flash; },
};
