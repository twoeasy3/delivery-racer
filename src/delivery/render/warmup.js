// ---- IDLE WARM-UP (the owner, 14-Oct: opening the showroom the first time stuttered): once the menu has come up and the page is
// idle, a few cars are built the way the showroom builds them (the player's own first), the shared view renderer is asked to
// compile what they use (renderer.compile) and to draw them once (which uploads their buffers and links the programs), a slice
// at a time and only in idle time, so the first opening of the showroom, the first car card and the first car switch find the
// shader programs and the JavaScript already warm. Measured in scripts/perf-menu.mjs entry (software GL: what a real GPU
// saves is not known): the first showroom opening's worst frame 417 -> 164 ms.
// The geometries are given back at once; the MATERIALS are kept (disposing one releases the compiled program, which is what this
// is for): a handful of them, a few KB. Nothing here is read by the game's rules, nothing is drawn on screen, nothing is saved.
import * as THREE from 'three';
import { Game } from '../game.js';
import { CARS, CAR } from '../cars.js';
import { makeShowCar, paintShowCar } from './showcar.js';
import { sharedRenderer, lit } from './modelviews.js';

const CARS_WARMED = 3; // (besides the player's own)
const kept = []; // (scenes whose materials, and so whose programs, stay)
let started = false;

const idle = (fn) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2500 });
  else setTimeout(() => fn({ timeRemaining: () => 8 }), 400);
};

export const warmUp = () => {
  if (started) return;
  started = true;
  const picks = [CAR, ...CARS.filter(c => !c.idea && !c.tank && !c.ufo && c.id !== CAR.id).slice(0, CARS_WARMED)];
  const step = (deadline) => {
    // (a run began, or the tab is hidden: nothing more; the showroom's own work is not to be competed with)
    if (Game.state !== 'start' || document.hidden) return;
    if (deadline?.timeRemaining && deadline.timeRemaining() < 6 && !deadline.didTimeout) return idle(step);
    const car = picks.shift();
    if (!car) return;
    const renderer = sharedRenderer();
    if (!renderer) return;
    try {
      const model = makeShowCar(car);
      paintShowCar(model, car, false);
      const scene = lit();
      scene.add(model);
      const camera = new THREE.PerspectiveCamera(30, 1.6, 0.1, 400);
      camera.position.set(0, 3, 9);
      camera.lookAt(0, 1, 0);
      renderer.compile(scene, camera);
      renderer.setViewport(0, 0, 2, 2);
      renderer.setScissor(0, 0, 2, 2);
      renderer.render(scene, camera);
      scene.traverse((node) => { node.geometry?.dispose(); });
      kept.push(scene);
    } catch (error) { console.warn('warm-up: ' + (error?.message || error)); }
    if (picks.length) idle(step);
  };
  idle(step);
};

// after the page has loaded and the menu has had a moment to settle
export const warmUpWhenSettled = () => {
  const go = () => setTimeout(warmUp, 1200);
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
};
