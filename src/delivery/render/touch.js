// ---- on-screen controls ----------------------------------------------------------------------
// Two big translucent zones along the bottom of the screen, steering on the left and the
// pedals on the right (and a THROW button above each), over the game. They are on by
// default on a phone or tablet (a touch screen as the main pointer, or as soon as the screen
// is touched), and the button on the menu switches them on or off for good: that choice is
// saved. ?touch in the address shows them too, for testing.
import { Input } from '../input.js';
import { Progress } from '../progress.js';
import './device.js'; // (a first visit's defaults for the device, before the choice is read)

let auto = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
  new URLSearchParams(location.search).get('touch') !== null;
const enabled = () => typeof Progress.data.touch === 'boolean' ? Progress.data.touch : auto;

const button = document.getElementById('touchBtn');
// ONE PEDAL (the owner, 17-Oct): with auto accelerate on and the auto brake off, the accelerator is dropped and the brake
// is the whole pedals pad, double wide (style.css body.one-pedal)
const onePedal = () => !!Progress.data.autoGas && Progress.data.autoBrake === 0;
const apply = () => {
  document.body.classList.toggle('touch-controls', enabled());
  document.body.classList.toggle('one-pedal', onePedal());
  button.textContent = 'On-screen controls: ' + (enabled() ? 'on' : 'off');
};
button.addEventListener('click', () => {
  Progress.data.touch = !enabled();
  Progress.save();
  apply();
});
window.addEventListener('touchstart', () => { if (!auto) { auto = true; apply(); } }, { passive: true });
document.getElementById('resetBtn').addEventListener('click', apply); // (a reset forgets the choice)
window.addEventListener('progresschange', apply);
window.addEventListener('controlschange', apply); // (auto accelerate or the auto brake changed: render/menu.js) // (a save brought in has a choice of its own: see render/savecode.js)
apply();

// Each pad is a pair of buttons worked by one thumb: whichever half the thumb is on is held,
// so sliding across swaps from one to the other without lifting.
for (const pad of document.querySelectorAll('#touchControls .pad')) {
  const names = pad.dataset.hold.split(',');
  const buttons = pad.querySelectorAll('button');
  const set = (which) => names.forEach((name, i) => {
    Input.hold(name, i === which);
    buttons[i].classList.toggle('down', i === which);
  });
  const half = (e) => {
    if (pad.classList.contains('pedals') && document.body.classList.contains('one-pedal')) return 0; // (the brake alone: all of it)
    const box = pad.getBoundingClientRect();
    return e.clientX < box.left + box.width / 2 ? 0 : 1;
  };
  let pointer = null;
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointer = e.pointerId;
    pad.setPointerCapture(pointer);
    set(half(e));
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === pointer) set(half(e)); });
  const release = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    set(-1);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(type, release);
}
