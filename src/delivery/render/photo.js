// ---- PHOTO MODE: with the run paused, a camera to look round the car with, and a picture to save ----
// The Photo button (beside Pause, while paused; or C) hides everything but the scene and starts from
// the menu pictures' view (the cinematic camera's: see scene.js), off to the side of the road. Drag to
// swing the camera round the car, wheel (or + / -) to move in and out; Save picture downloads what is
// on the screen as a PNG; Back (or C, or Escape) returns to the pause. Nothing moves meanwhile: the
// run stays paused. Its numbers are CONFIG.photo.
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { renderer, scene, camera, tmp, tmp2, aim } from './scene.js';

const P = CONFIG.photo;
export const Photo = { on: false, yaw: 0, pitch: 0, far: 0 };

const button = document.getElementById('photoBtn'), bar = document.getElementById('photoBar'), canvas = renderer.domElement;
const canStart = () => Game.state === 'playing' && Game.paused && !Game.screensaver;

export const startPhoto = () => {
  if (!canStart() || Photo.on) return;
  Object.assign(Photo, { on: true, ...P.start });
  document.body.classList.add('photo');
};
const stop = () => {
  Photo.on = false;
  document.body.classList.remove('photo');
};
const zoom = (by) => { Photo.far = Math.max(P.near, Math.min(P.far, Photo.far * by)); };
// what is on the screen, saved as a PNG (drawn afresh first: the canvas keeps nothing between frames)
const save = () => {
  renderer.render(scene, camera);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'delivery-racer-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
};

button?.addEventListener('click', startPhoto);
document.getElementById('photoBackBtn')?.addEventListener('click', stop);
document.getElementById('photoSaveBtn')?.addEventListener('click', save);
document.getElementById('photoInBtn')?.addEventListener('click', () => zoom(1 / P.step));
document.getElementById('photoOutBtn')?.addEventListener('click', () => zoom(P.step));
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC' && !e.repeat) { if (Photo.on) stop(); else startPhoto(); }
  else if (!Photo.on) return;
  else if (e.code === 'Escape') stop();
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoom(1 / P.step);
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoom(P.step);
});
// dragging swings the camera round the car, and up and down over it
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (Photo.on) drag = { x: e.clientX, y: e.clientY }; });
window.addEventListener('pointermove', (e) => {
  if (!Photo.on || !drag) return;
  Photo.yaw -= (e.clientX - drag.x) * P.turn;
  Photo.pitch = Math.max(P.low, Math.min(P.high, Photo.pitch + (e.clientY - drag.y) * P.turn));
  drag = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { if (Photo.on) { zoom(e.deltaY > 0 ? P.step : 1 / P.step); e.preventDefault(); } }, { passive: false });

// every frame (main.js): the button only while there is a pause to take a picture of, and out of
// photo mode as soon as the run goes on (or ends)
export const syncPhoto = () => {
  const can = canStart();
  if (button) button.style.display = can ? '' : 'none';
  if (bar) bar.style.display = Photo.on ? '' : 'none';
  if (Photo.on && !can) stop();
};
// the camera: `far` m from the car, `yaw` round from dead ahead of it (to its left), `pitch` up over it
export const photoCamera = () => {
  const h = Track.toWorld(Player.s, Player.lat, tmp2), a = h + Photo.yaw, flat = Math.cos(Photo.pitch) * Photo.far;
  camera.position.set(tmp2.x + Math.sin(a) * flat, tmp2.y + Player.air + P.aim + Math.sin(Photo.pitch) * Photo.far, tmp2.z + Math.cos(a) * flat);
  tmp.set(tmp2.x, tmp2.y + Player.air + P.aim, tmp2.z);
  aim(tmp);
  camera.fov = P.fov;
  camera.updateProjectionMatrix();
};
