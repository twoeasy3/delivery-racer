// ============================================================================
// HORN - the player's horn (H: see Input). It sounds the car's horn
// and traffic ahead reacts to it: a calm good driver moves over, an angry or
// evil driver honks back (Traffic.hornedAt).
// ============================================================================
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { CAR } from './cars.js';
import { sfx } from './physics.js';

export const Horn = {
  next: 0,
  reset() { this.next = 0; },
  press() {
    if (Game.state !== 'playing' || Game.paused || Game.screensaver || !Player.active || Game.time < this.next) return;
    this.next = Game.time + (CONFIG.horn?.wait || 0.6);
    // (each car has a horn of its own: a sound named 'horn:<car id>', see HORNS in render/audio.js. A Super
    // car, and a level's vehicle earned for the garage, sound their base car's; a car idea borrows the horn of
    // the garage car its `sound` names: ideas.js)
    sfx('horn:' + (Player.tank > 0 ? 'tank' : CAR.sound || CAR.base?.id || CAR.id));
    Traffic.hornedAt();
  },
};
Input.on('horn', () => Horn.press());

