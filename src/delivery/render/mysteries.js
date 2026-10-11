// The look of the mystery pickup's second batch of effects (see src/delivery/mysteries.js): the giant's
// car at twice its size, the blackout (sky and lights off, the fog closed right in, the headlights on),
// the earthquake's camera bob (the vehicles bob in main.js and cars.js, by Mysteries.heave) and the
// rewind's screen flash. Called every frame from main.js, after the camera is placed.
import { CONFIG } from '../config.js';
import { LEVEL } from '../levels.js';
import { THEMES } from '../themes.js';
import { Player } from '../player.js';
import { Game } from '../game.js';
import { Mysteries } from '../mysteries.js';
import { scene, camera, applySky, applyLight } from './scene.js';
import { carMesh } from './cars.js';
import { setHeadlights } from './headlights.js';

// the rewind's flash: a pale sheet over everything, gone in a moment
const flashEl = document.createElement('div');
flashEl.id = 'mysteryFlash';
flashEl.style.cssText = 'position:fixed;inset:0;background:#dfe9ff;pointer-events:none;opacity:0;z-index:5';
document.body.appendChild(flashEl);

let dark = false;            // the blackout is on screen
const usualFog = { near: 0, far: 0 }; // the fog as it was before the blackout, to put back

const lightsOut = () => {
  const B = CONFIG.mystery.blackout;
  usualFog.near = scene.fog.near;
  usualFog.far = scene.fog.far;
  applyLight(B.light);
  setHeadlights(true);
  dark = true;
};
const lightsBack = () => {
  const theme = THEMES[LEVEL.theme] || THEMES.city;
  applySky(theme.sky);
  applyLight(theme.light);
  setHeadlights(!!theme.headlights);
  scene.fog.near = usualFog.near;
  scene.fog.far = usualFog.far;
  dark = false;
};
Game.onLoad.push(() => { dark = false; }); // (a level loads with its own sky and lights: see buildRoad)

export const syncMysteries = (dt) => {
  // the giant: the car at twice its size (its hitbox is already: see Mysteries)
  const scale = Player.giant ? CONFIG.mystery.giant.scale : 1;
  if (carMesh.scale.x !== scale) carMesh.scale.setScalar(scale);
  // the blackout: black sky and fog, closed right in, every frame (a level in zones puts its sky up each frame)
  const blackout = Mysteries.blackout && Game.state !== 'start';
  if (blackout && !dark) lightsOut();
  else if (!blackout && dark) lightsBack();
  if (dark) {
    const B = CONFIG.mystery.blackout;
    applySky(0x000000);
    scene.fog.near = B.fog[0];
    scene.fog.far = B.fog[1];
  }
  // the earthquake: the camera rides the wave too (a little behind the car, where it sits)
  if (Mysteries.quake) camera.position.y += Mysteries.heave(Player.s - 6);
  // the rewind's flash
  const flash = Mysteries.flash;
  flashEl.style.opacity = flash > 0 ? Math.min(1, flash / CONFIG.mystery.rewind.flash * 1.5).toFixed(2) : 0;
};
