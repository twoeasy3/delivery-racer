// ---- ?lite=<list>: a BISECT switch for the What's inside flicker on the owner's tablet (CHECKLIST 213) ----------------
// Each name turns ONE suspect off, for this visit only, by a class on <html> (`lite-<name>`) that lite.css acts on; with
// no ?lite nothing changes (no class, no badge). Comma separated, e.g. ?lite=glow,twinkle or ?lite=all:
//   glow     the Legendary-key / Bespoke cards' pulsing glow (bp-glow-gold, bp-glow-rainbow: a `filter` animated on the whole card)
//   twinkle  the glints over Legendary-key / Bespoke art (bp-twinkle: an opacity animation on .bp-art::after)
//   shine    every card shine: .bp-art::before (bp-sweep / bp-holo, with its mix-blend-mode) and the Legendary blueprint's bp-shine
//   blend    only the shine's mix-blend-mode (the shine keeps moving, drawn normally)
//   drift    the menu stage picture's slow zoom (stage-drift)
//   menu     every animation on the menu (stage-drift, the backdrop's light sweep, the START pulse, the LIVE dot)
//   scene    nothing under a sheet is drawn at all while What's inside / the pack reveal is up (menu and Shop hidden; the
//            menu's 3D car is never drawn under a sheet anyway, see menustage.js)
//   blur     every backdrop-filter (the Shop's top bar)
//   shadow   the cards' box-shadows, the pictures' drop-shadow filters and the stars' glow
//   pics     the cars' and keys' pictures on the cards (are 66 images at DPR 3 being dropped and re-decoded?)
//   stacks   the x1/x2 chance fades and the bubble's x3/x15 cycle (and the sheet's 1.6 s timer on a mouse device)
//   anim     EVERY animation and transition inside the sheet and the reveal
//   all      every one of the above
// A small badge in the bottom left corner names what is off, so the owner can see the address took.
import './lite.css';

export const LITE_NAMES = ['glow', 'twinkle', 'shine', 'blend', 'drift', 'menu', 'scene', 'blur', 'shadow', 'pics', 'stacks', 'anim'];
export const LITE = new Set();
try {
  const raw = new URLSearchParams(location.search).get('lite');
  for (const w of (raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
    if (w === 'all') LITE_NAMES.forEach(n => LITE.add(n));
    else if (LITE_NAMES.includes(w)) LITE.add(w);
  }
} catch { /* (no location: a headless check) */ }
export const lite = (name) => LITE.has(name);
if (LITE.size && typeof document !== 'undefined') {
  for (const n of LITE) document.documentElement.classList.add('lite-' + n);
  const badge = () => {
    const b = document.createElement('div');
    b.className = 'lite-badge';
    b.textContent = 'lite: ' + [...LITE].join(',');
    document.body.append(b);
  };
  if (document.body) badge(); else addEventListener('DOMContentLoaded', badge, { once: true });
}

// A SHEET COVERS THE MENU (What's inside, the pack reveal): <html> gets `sheet-up`, and lite.css pauses the menu's and the
// Shop's animations under it; the menu stage's 3D car stops drawing (menustage.js asks sheetUp()). Not a lite switch:
// always on (nothing under the sheet's dim moves for nobody to see; it all carries on where it was once the sheet closes).
let up = false;
export const sheetUp = () => {
  const now = !!document.querySelector('.pack-contents, .pack-reveal:not(.hidden)');
  if (now !== up) document.documentElement.classList.toggle('sheet-up', up = now);
  return now;
};
