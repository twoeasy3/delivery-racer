// ============================================================================
// PROGRESSIVE UNLOCK, ON THE SCREEN (the table is featuregates.js; PROGRESSIVE-UNLOCK.md). OFF unless asked: ?progress=new (a visit),
// ?progress=new:on (remembered), ?progress=off (forgotten), ?progress=all (everything, a visit). Off, this module does nothing at all.
// On:
//  - a shut gate's things are not drawn (a class on <body>, pg-off-<id>, and one CSS rule per selector of the table): no "Locked" rows
//  - a gate just opened: its thing gets a pulsing outline, and a small card says what it is in one line (OK, or using the thing, and it
//    is seen: Progress.data.seen). Three or more opening at once (Unlock everything) are taken as seen without a card
//  - Options > Save gets "Show all menus" while anything is shut (a returning player's way out: every gate seen, kept)
//  - Evil shut: the Good half alone, and neither it (a toggle) nor E flips the side; T does not cycle onto a shut tab
// Render only: imported early by main.js (its key guard must come before the menu's own, render/menustage.js). Progress.data.evil is never
// written here; nothing a run does is touched (vite.config.js NOT_RULES: featuregates.js).
// ============================================================================
import { Progress } from '../progress.js';
import { GATES, gatesMode, openGates, pendingIntros, adopt, markSeen, cleanSeen, gateOf } from '../featuregates.js';

const mode = typeof document !== 'undefined' && typeof document.createElement === 'function' ? gatesMode() : 'off';
const css = () => GATES.map(g => g.hides.length ? g.hides.map(s => 'body.pg-off-' + g.id + ' ' + s).join(',\n') + ' { display: none !important; }' : '').join('\n') + `
.pg-new { outline: 3px solid #ffd23f !important; outline-offset: 2px; animation: pgPulse 1.1s ease-in-out infinite alternate; }
@keyframes pgPulse { from { outline-color: rgba(255, 210, 63, .35); } to { outline-color: #ffd23f; } }
#pgIntro { position: fixed; left: 50%; top: 128px; transform: translateX(-50%); z-index: 60; width: min(340px, calc(100vw - 32px)); box-sizing: border-box;
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 12px; padding: 10px 12px; border-radius: 12px;
  background: rgba(14, 20, 30, .94); border: 2px solid #ffd23f; color: #fff; font: 600 14px/1.25 system-ui, sans-serif; box-shadow: 0 6px 24px rgba(0, 0, 0, .45); }
#pgIntro small { grid-column: 1; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #ffd23f; }
#pgIntro b { grid-column: 1; font-size: 17px; font-weight: 800; }
#pgIntro span { grid-column: 1; font-size: 13px; color: #d7dde8; }
#pgIntro button { grid-column: 2; grid-row: 1 / span 3; min-width: 64px; padding: 10px 14px; border: 0; border-radius: 10px; background: #ffd23f; color: #141414; font: 800 15px system-ui, sans-serif; cursor: pointer; }
#pgIntro.hidden, #pgAllBtn.hidden { display: none; }`;

if (mode !== 'off') {
  const d = () => Progress.data;
  const style = document.createElement('style');
  style.textContent = css();
  document.head.appendChild(style);
  document.getElementById('albumBtn')?.closest('section')?.classList.add('pg-extras'); // (Options > Extras: the section has no class of its own)
  const card = document.createElement('div');
  card.id = 'pgIntro';
  card.className = 'hidden';
  card.setAttribute('role', 'status');
  document.body.append(card);
  const all = document.createElement('button');
  all.id = 'pgAllBtn';
  all.className = 'menu-chip hidden';
  all.textContent = 'Show all menus';
  all.title = 'Everything the game has, now';
  document.getElementById('completeBtn')?.before(all);
  let open = new Set(GATES.map(g => g.id)), shown = null;
  const save = () => Progress.save();
  const menuUp = () => !document.getElementById('startScreen')?.classList.contains('hidden');
  const apply = () => {
    if (mode === 'on') { cleanSeen(d()); if (adopt(d())) save(); } // (a brand-new save starts the ladder; an existing one is never written)
    let pending = pendingIntros(d(), mode);
    if (pending.length >= 3 && markSeen(d(), pending.map(g => g.id))) { save(); pending = []; } // (a jump, not a step: no wall of cards)
    open = openGates(d(), mode);
    for (const g of GATES) document.body.classList.toggle('pg-off-' + g.id, !open.has(g.id));
    for (const el of document.querySelectorAll('.pg-new')) el.classList.remove('pg-new');
    for (const g of pending) if (g.mark) document.querySelector(g.mark)?.classList.add('pg-new');
    all.classList.toggle('hidden', open.size === GATES.length);
    const first = menuUp() ? pending[0] : null;
    if (first?.id !== shown) {
      shown = first?.id || null;
      card.replaceChildren();
      if (first) {
        const ok = document.createElement('button');
        ok.textContent = 'OK';
        ok.addEventListener('click', () => seen(first.id));
        const tag = document.createElement('small'), name = document.createElement('b'), line = document.createElement('span');
        tag.textContent = 'New';
        name.textContent = first.label;
        line.textContent = first.intro;
        card.append(tag, name, line, ok);
      }
    }
    card.classList.toggle('hidden', !shown);
  };
  const seen = (ids) => { if (markSeen(d(), ids)) save(); apply(); };
  all.addEventListener('click', () => seen(GATES.map(g => g.id)));
  // (using a thing that is being introduced is seeing it)
  document.addEventListener('click', (e) => {
    for (const g of pendingIntros(d(), mode)) if (g.mark && e.target?.closest?.(g.mark)) seen(g.id);
  }, true);
  // (Evil shut: the Good half is a toggle elsewhere: here it stays Good)
  document.addEventListener('click', (e) => {
    if (open.has('evil') || !e.target?.closest?.('[data-side]') || !e.target.closest('#sideBtn, #showroom .sr-side, #liveryBtn')) return;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  window.addEventListener('keydown', (e) => {
    const up = menuUp() || !document.getElementById('showroom')?.classList.contains('hidden');
    if (!up || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.code === 'KeyE' && !open.has('evil')) || (e.code === 'KeyT' && menuUp() && (!open.has('races') || !open.has('events')))) e.stopImmediatePropagation();
  }, true);
  for (const type of ['progresschange', 'carchange', 'packschange', 'shopchange']) window.addEventListener(type, apply);
  setInterval(apply, 700); // (a delivery, a purchase, a pack: the save changes in many places; the table is cheap to read)
  apply();
  if (typeof window !== 'undefined') window.featureGates = { mode, open: () => [...open], pending: () => pendingIntros(d(), mode).map(g => g.id), gate: gateOf }; // (for a check or a console)
}
