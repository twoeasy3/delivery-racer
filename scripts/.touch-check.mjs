// A check of who a touch belongs to (src/delivery/input.js), headless, with a stand-in window: the driving stick takes a
// touch ONLY while a level is played (Input.inPlay, told by game.js) and the touch began off the controls and screens;
// then it steers / accelerates and its moves are stopped (no page scroll or pinch during play). Any other touch (every
// menu, the showroom, the Shop, a sheet, before or after a run) is left alone: no preventDefault, no stick, so every screen
// scrolls and swipes on a tablet (the owner, 13-Oct: "just allow all UI screens to swipe"). Covers: a menu touch; a run's
// touch on the road; a run's touch on a button; a touch begun in the menu that is still down when the run starts; a run's
// touch still down when the run ends; a pinch (gesturestart) in and out of play.
//   node scripts/.touch-check.mjs
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };

const handlers = {};
globalThis.window = { addEventListener: (type, fn) => (handlers[type] ||= []).push(fn) };
const { Input } = await import(pathToFileURL(resolve('src/delivery/input.js')).href);

let playing = false;
Input.inPlay = () => playing;
const road = { closest: () => null }; // (the game's canvas: no control or screen round it)
const button = { closest: () => ({}) }; // (a button, a menu, the showroom: a screen's)
const send = (type, target, touches) => {
  let stopped = false;
  const e = { type, target, changedTouches: touches, touches, preventDefault: () => { stopped = true; } };
  for (const fn of handlers[type] || []) fn(e);
  return stopped;
};
const t = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
const drag = (target, id) => {
  send('touchstart', target, [t(id, 100, 300)]);
  const stopped = send('touchmove', target, [t(id, 200, 200)]);
  const axes = [Input.steer, Input.throttle];
  send('touchend', target, [t(id, 200, 200)]);
  return { stopped, axes };
};

// the menu (no run): a drag on anything, the canvas behind the menu included
let r = drag(road, 1);
check(!r.stopped && r.axes[0] === 0 && r.axes[1] === 0, 'no run: a drag on the canvas is left alone (not stopped, no stick)');
r = drag(button, 2);
check(!r.stopped && r.axes[0] === 0, 'no run: a drag on a screen is left alone');
check(!send('gesturestart', road, []), 'no run: a pinch is not stopped');

// a run
playing = true;
r = drag(road, 3);
check(r.stopped && r.axes[0] === 1 && r.axes[1] === 1, 'a run: a drag on the road steers and accelerates, and is stopped (no scroll / pinch)');
check(Input.steer === 0 && Input.throttle === 0, 'a run: the finger lifted, the stick is let go');
r = drag(button, 4);
check(!r.stopped && r.axes[0] === 0, 'a run: a drag begun on a button or screen (the pause) is left alone');
check(send('gesturestart', road, []), 'a run: a pinch is stopped');

// a touch across the change
playing = false;
send('touchstart', road, [t(5, 100, 300)]);
playing = true;
const crossed = send('touchmove', road, [t(5, 200, 200)]);
check(!crossed && Input.steer === 0, 'a touch begun in the menu, still down as the run starts, stays the menu\'s');
send('touchend', road, [t(5, 200, 200)]);
send('touchstart', road, [t(6, 100, 300)]);
playing = false;
const after = send('touchmove', road, [t(6, 200, 200)]);
check(after, 'a stick touch still down as the run ends is still stopped until it lifts');
send('touchend', road, [t(6, 200, 200)]);
check(!send('touchmove', road, [t(7, 0, 0)]), 'after it: a move of a touch never seen is left alone out of a run');

console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exit(failures ? 1 : 0);
