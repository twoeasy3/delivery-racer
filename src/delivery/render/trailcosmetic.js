// ---- the TRAIL cosmetic (CHECKLIST 452; the owner, 17-Oct: "build the trail FX tab on the cosmetics"): the look of a car's TURBO TRAIL, one of
// render/turbotrails.js's styles, chosen PER CAR on the Cosmetics screen's 'Trail' tab and worn by that car's turbo in a run.
//   Items: 'classic' (the turbo as it always was: the free look, never counted) and the seven styles (flame, twin, speedlines, afterimage,
//   embers, shockwave, rarity), EARNED like every earned cosmetic (render/cosmetics.js EARNED_SLOTS: a count each, given only through
//   awardCosmetic; one taken from the hand by each car wearing it; no cash price). Rarity: cosmetics.js COSMETIC_RARITY (Uncommon).
//   Storage: render/loadoutstore.js slot 'trail' { id }, per car only (PER_CAR: never the All-cars default's); a store from before has none
//   (absent = Classic: nothing to migrate). Not a model's dressing (nothing on the car's model changes), so NOT in render/loadout.js
//   loadoutKey, as the kill effect is not: a still or a live model is never rebuilt for it.
//   Cars: every car but those with no wheels of their own to dress (the wheels' rule, render/cosmeticslots.js: the Tank and the
//   amphibious tank, car.tank, and the Saucer, car.ufo): no Trail tab on them, and their turbo stays Classic.
//   In a run: render/turbotrails.js asks shownTrail(CAR.id) at every level load (?turbotrail=<name> still overrides it, for tests).
// Render-only: no rules module imports this; it is not in the replay fingerprint.
import { registerCosmetics, ownsCosmetic } from './cosmetics.js';
import * as Store from './loadoutstore.js';
import { TRAIL_IDS, TRAIL_NAMES } from './trailstyles.js';

export { TRAIL_IDS, TRAIL_NAMES };
export const TRAILS = TRAIL_IDS.map(id => ({ id, name: TRAIL_NAMES[id] || id }));
registerCosmetics(TRAILS.map(t => ({ slot: 'trail', id: t.id, name: t.name })));

export const trailValid = (id) => typeof id === 'string' && TRAIL_IDS.includes(id);
// the support rule: the wheels' (render/cosmeticslots.js): not the Tank(s) or the Saucer
export const trailSupported = (car) => !!car && !car.tank && !car.ufo;
// the trail a car has chosen (Classic: absent, unknown); worn only when owned (or tried on, on the Cosmetics screen)
export const trailChoice = (carId) => { const id = Store.get(carId, 'trail').id; return trailValid(id) ? id : 'classic'; };
export const shownTrail = (carId) => { const id = trailChoice(carId); return id === 'classic' || ownsCosmetic('trail', id) ? id : 'classic'; };
export const setTrail = (id, target) => (trailValid(id) && target != null ? Store.setSlot(target, 'trail', { id }) : false);

// ---- a trail's CARD ART (the Cosmetics screen's Trail cards, render/cosmeticsui.js): a small pictogram drawn in code on a canvas (no image
// file): the car's tail at the right, seen from the side, and the trail streaming back from it to the left. g: a 2D context, s: its size (px).
const CYAN = '#3fe0ff';
const carTail = (g, s) => { // (a little side-on car, nose to the right)
  g.fillStyle = '#d9dee6';
  g.beginPath(); g.moveTo(s * 0.62, s * 0.66); g.lineTo(s * 0.62, s * 0.5); g.lineTo(s * 0.7, s * 0.5); g.lineTo(s * 0.76, s * 0.4); g.lineTo(s * 0.88, s * 0.4); g.lineTo(s * 0.94, s * 0.52); g.lineTo(s * 0.98, s * 0.54); g.lineTo(s * 0.98, s * 0.66); g.closePath(); g.fill();
  g.fillStyle = '#16181c';
  for (const x of [0.69, 0.9]) { g.beginPath(); g.arc(s * x, s * 0.67, s * 0.055, 0, Math.PI * 2); g.fill(); }
};
const ART = {
  classic: (g, s) => { for (let i = 0; i < 14; i++) { const x = s * (0.08 + 0.52 * ((i * 37) % 14) / 14), y = s * (0.5 + 0.12 * Math.sin(i * 2.3)), w = s * (0.03 + 0.04 * (x / s)); g.fillStyle = i % 2 ? '#ffffff' : CYAN; g.fillRect(x, y, w, w); } },
  flame: (g, s) => { const L = [['#ffffff', 0.12], ['#ffe27a', 0.22], ['#ff8a1f', 0.34], ['#d8270c', 0.48]]; for (let k = L.length - 1; k >= 0; k--) { const [c, len] = L[k]; g.fillStyle = c; for (const y of [0.52, 0.6]) { g.beginPath(); g.moveTo(s * 0.62, s * (y - 0.035 - 0.01 * k)); g.lineTo(s * (0.62 - len - 0.04), s * y); g.lineTo(s * 0.62, s * (y + 0.035 + 0.01 * k)); g.closePath(); g.fill(); } } },
  twin: (g, s) => { g.strokeStyle = CYAN; g.lineCap = 'round'; for (const [y, b] of [[0.5, -1], [0.6, 1]]) { const grad = g.createLinearGradient(s * 0.62, 0, s * 0.04, 0); grad.addColorStop(0, CYAN); grad.addColorStop(1, 'rgba(63,224,255,0)'); g.strokeStyle = grad; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(s * 0.62, s * y); g.bezierCurveTo(s * 0.45, s * y, s * 0.3, s * (y + b * 0.1), s * 0.04, s * (y + b * 0.06)); g.stroke(); } },
  speedlines: (g, s) => { g.strokeStyle = '#ffffff'; g.lineCap = 'round'; for (const [y, x0, x1, w] of [[0.3, 0.2, 0.7, 0.025], [0.38, 0.05, 0.5, 0.02], [0.76, 0.12, 0.66, 0.025], [0.84, 0.3, 0.86, 0.02], [0.22, 0.4, 0.8, 0.015]]) { g.globalAlpha = 0.9; g.lineWidth = s * w; g.beginPath(); g.moveTo(s * x0, s * y); g.lineTo(s * x1, s * y); g.stroke(); } g.globalAlpha = 1; },
  afterimage: (g, s) => { for (const [dx, a] of [[-0.48, 0.25], [-0.32, 0.45], [-0.16, 0.7]]) { g.save(); g.globalAlpha = a; g.translate(s * dx, 0); g.fillStyle = CYAN; g.beginPath(); g.moveTo(s * 0.62, s * 0.66); g.lineTo(s * 0.62, s * 0.5); g.lineTo(s * 0.7, s * 0.5); g.lineTo(s * 0.76, s * 0.4); g.lineTo(s * 0.88, s * 0.4); g.lineTo(s * 0.94, s * 0.52); g.lineTo(s * 0.98, s * 0.54); g.lineTo(s * 0.98, s * 0.66); g.closePath(); g.fill(); g.restore(); } },
  embers: (g, s) => { const C = ['#fff2a8', '#ffb347', '#ff6a10', '#9a1500']; for (let i = 0; i < 16; i++) { const u = i / 15, x = s * (0.6 - 0.52 * u), y = s * (0.56 + 0.26 * u * u - 0.08 * Math.sin(i * 1.7) * (1 - u)); g.fillStyle = C[Math.min(3, Math.floor(u * 4))]; g.beginPath(); g.arc(x, y, s * (0.03 - 0.012 * u), 0, Math.PI * 2); g.fill(); } g.fillStyle = '#3a3c42'; g.fillRect(0, s * 0.86, s, s * 0.02); },
  shockwave: (g, s) => { g.strokeStyle = CYAN; for (const [x, r, a] of [[0.56, 0.08, 1], [0.4, 0.15, 0.7], [0.2, 0.23, 0.4]]) { g.globalAlpha = a; g.lineWidth = s * 0.03; g.beginPath(); g.ellipse(s * x, s * 0.55, s * r * 0.35, s * r, 0, 0, Math.PI * 2); g.stroke(); } g.globalAlpha = 1; },
  rarity: (g, s) => { const grad = g.createLinearGradient(s * 0.04, 0, s * 0.62, 0); for (const [at, c] of [[0, 'rgba(255,155,40,0)'], [0.25, '#ff9b28'], [0.5, '#b45cff'], [0.75, '#3d8bff'], [1, '#4fd06a']]) grad.addColorStop(at, c); g.fillStyle = grad; g.beginPath(); g.moveTo(s * 0.62, s * 0.47); g.lineTo(s * 0.04, s * 0.53); g.lineTo(s * 0.04, s * 0.57); g.lineTo(s * 0.62, s * 0.63); g.closePath(); g.fill(); },
};
export const drawTrailIcon = (g, id, s = 48) => {
  g.fillStyle = '#101218'; g.fillRect(0, 0, s, s);
  (ART[id] || ART.classic)(g, s);
  carTail(g, s);
};
