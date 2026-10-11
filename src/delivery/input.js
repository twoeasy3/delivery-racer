// ============================================================================
// INPUT - raw keys / touches become named actions
// ============================================================================
export const Input = (() => {
  const listeners = {};
  const on = (action, fn) => (listeners[action] ||= []).push(fn);
  const emit = (action) => (listeners[action] || []).forEach(fn => fn());

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
  // (the menus are left alone, so their lists can be scrolled)
  const isUi = (e) => e.target.closest && e.target.closest('button, .pad, .overlay');
  window.addEventListener('touchstart', (e) => {
    if (isUi(e) || touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier; startX = t.clientX; startY = t.clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (isUi(e)) return;
    e.preventDefault(); // no page scroll / pinch zoom during play
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      touchSteer = stick(t.clientX - startX);
      touchThrottle = stick(startY - t.clientY);
    }
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchId = null; touchSteer = 0; touchThrottle = 0; }
    }
  };
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);
  window.addEventListener('gesturestart', (e) => e.preventDefault());

  const clampAxis = (v) => Math.max(-1, Math.min(1, v));
  return {
    on, emit, hold,
    autoGas: false, // the accelerator held down by itself; braking still overrides it (a menu option)
    get steer() { return clampAxis(keyAxis(STEER_KEYS) + touchSteer + pressed.right - pressed.left); },
    get throttle() {
      const throttle = clampAxis(keyAxis(THROTTLE_KEYS) + touchThrottle + pressed.gas - pressed.brake);
      return this.autoGas && throttle >= 0 ? 1 : throttle;
    },
  };
})();
