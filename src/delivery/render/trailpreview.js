// ---- the TURBO TRAIL's preview on the Cosmetics screen (render/cosmeticsui.js, the Trail tab; CHECKLIST 452): while the tab is open the car
// on show stands still and its trail streams back from its tail at its own height, looping, as if it drove at 30 m/s: the game's own trail
// code (render/turbotrails.js createTrailPreview, the car's frame), drawn in the showroom view's scene (render/showroomview.js overlay: its
// renderer, no WebGL context of its own), one small pool kept for the visit. Tab closed (clear): nothing drawn, nothing stepped.
// Lite on a low-end device (turbotrails.js trailLite), as in a run. ?trailtest=<s> (with ?cosmetics&slot=trail): the preview's clock held
// <s> s after it starts (for a still).
import { ShowroomView } from './showroomview.js';
import { createTrailPreview, trailLite } from './turbotrails.js';

let preview = null, want = null, t = 0, hold = -1;
try { const v = new URLSearchParams(location.search).get('trailtest'); if (v !== null) hold = Math.max(0, Number(v) || 0); } catch { /* (headless) */ }

ShowroomView.overlay((scene, dt) => {
  if (!want) return;
  const model = ShowroomView.model, turn = ShowroomView.turn;
  if (!model || !turn || ShowroomView.carHidden) { preview?.hide(); return; }
  preview ||= createTrailPreview();
  preview.show(want + (trailLite() ? '-lite' : ''));
  if (hold >= 0 && t >= hold) dt = 0; // (held for a still)
  t += dt;
  preview.frame(dt, model, turn, ShowroomView.car);
});

export const TrailPreview = {
  // the style to stream behind the car on show ('classic', 'flame'...); a new one starts afresh
  show(id) { if (id !== want) { want = id || null; t = 0; preview?.hide(); } },
  clear() { want = null; t = 0; preview?.hide(); },
  get hold() { return hold; },
  // for a check or a picture
  get state() { return { style: want, drawn: preview?.style || null, live: preview?.live || 0, visible: !!preview?.mesh?.visible, t }; },
  // (for a check with no showroom: one step of the preview on any model in any parent)
  step(dt, model, parent, car = null) { preview ||= createTrailPreview(); preview.show((want || 'classic') + (trailLite() ? '-lite' : '')); preview.frame(dt, model, parent, car); return preview; },
};
