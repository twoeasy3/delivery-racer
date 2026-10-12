// ============================================================================
// INPUT - raw keys / touches become named actions
// ============================================================================
export const Input = (() => {
  const listeners = {};
  const on = (action, fn) => (listeners[action] ||= []).push(fn);
  // (fromReplay: an event a replay plays back. While one plays, the player's own throws, horn and skips are not
  // passed on, only the replay's; pausing still is. `tap` hears every event passed on: the recorder, replay.js)
  const LOGIC = new Set(['throw', 'horn', 'confirm']);
  const emit = (action, fromReplay = false) => {
    if (Input.fed && !fromReplay && LOGIC.has(action)) return;
    Input.tap?.(action);
    (listeners[action] || []).forEach(fn => fn());
  };

  const KEYS = { Enter: 'confirm', Space: 'throw', KeyP: 'pause', KeyH: 'horn' };
  // steer and throttle are held axes (-1 .. +1), not one-shot actions
  const STEER_KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
  const THROTTLE_KEYS = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1 };
  const held = new Set();
  let touchSteer = 0, touchThrottle = 0;
  // on-screen buttons (see render/touch.js): held down or not
  const pressed = { left: false, right: false, gas: false, brake: false };
  const hold = (name, on) => { pressed[name] = on; };

  window.addEventListener('keydown', (e) => {
    if (STEER_KEYS[e.code] || THROTTLE_KEYS[e.code]) { e.preventDefault(); held.add(e.code); return; }
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat) emit(action);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  const keyAxis = (map) => {
    let k = 0;
    for (const code of held) k += map[code] || 0;
    return k;
  };

  // touch: the screen is a virtual stick anchored where the finger lands.
  // Sideways steers, up / down accelerates / brakes, for as long as the finger is down.
  const DEAD_PX = 14, FULL_PX = 60;
  const stick = (d) => Math.abs(d) < DEAD_PX ? 0
    : Math.max(-1, Math.min(1, (d - Math.sign(d) * DEAD_PX) / (FULL_PX - DEAD_PX)));
  let touchId = null, startX = 0, startY = 0;
  // (the menus are left alone, so their lists can be scrolled. A touch is a menu's if it BEGAN on one: judged once, at its
  // start, and kept by the finger's id: a menu drawn again under a finger (its element gone, so `closest` finds no menu) must
  // not turn the rest of that touch into the driving stick, whose preventDefault would end the scroll and the touch)
  const isUi = (e) => e.target.closest && e.target.closest('button, .pad, .overlay, .shop-screen, #showroom, #packs');
  const uiTouches = new Set();
  window.addEventListener('touchstart', (e) => {
    if (isUi(e)) { for (const t of e.changedTouches) uiTouches.add(t.identifier); return; }
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier; startX = t.clientX; startY = t.clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if ([...e.changedTouches].every(t => uiTouches.has(t.identifier))) return;
    e.preventDefault(); // no page scroll / pinch zoom during play
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      touchSteer = stick(t.clientX - startX);
      touchThrottle = stick(startY - t.clientY);
    }
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      uiTouches.delete(t.identifier);
      if (t.identifier === touchId) { touchId = null; touchSteer = 0; touchThrottle = 0; }
    }
  };
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);
  window.addEventListener('gesturestart', (e) => e.preventDefault());

  const clampAxis = (v) => Math.max(-1, Math.min(1, v));
  // (read as whole 64ths: what a replay records is exactly what was driven, replay.js)
  const q = (v) => Math.round(v * 64) / 64;
  return {
    on, emit, hold,
    tap: null,  // told of every event passed on (replay.js records them)
    fed: null,  // { steer, throttle, auto }: a replay's controls, in place of the player's while it plays
    autoGas: false, // the accelerator held down by itself; braking still overrides it (a menu option)
    get steer() { return this.fed ? this.fed.steer : q(clampAxis(keyAxis(STEER_KEYS) + touchSteer + pressed.right - pressed.left)); },
    get throttle() {
      if (this.fed) return this.fed.throttle;
      const throttle = q(clampAxis(keyAxis(THROTTLE_KEYS) + touchThrottle + pressed.gas - pressed.brake));
      return this.autoGas && throttle >= 0 ? 1 : throttle;
    },
    // the accelerator is held down by auto accelerate alone: the player is not pressing it (the auto brake may then act,
    // player.js: with the accelerator held by the player it never does). A replay is fed it too (replay.js)
    get auto() {
      if (this.fed) return !!this.fed.auto;
      return this.autoGas && q(clampAxis(keyAxis(THROTTLE_KEYS) + touchThrottle + pressed.gas - pressed.brake)) === 0;
    },
  };
})();
