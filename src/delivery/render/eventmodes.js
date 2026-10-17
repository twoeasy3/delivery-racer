// THE EVENTS TAB'S MODE STRIP (CHECKLIST 446; EVENTS-UI.md; the owner, 17-Oct: "Car Hunt and Concept Strike vertically on a
// phone. I don't want this ... Maybe some other toggles to flick through screens"). One segmented strip over the Events tab, a
// button per mode (each single-level event, the Car Hunt, the Concept Strike; each special event of more stages, the Comet
// Hunt): an icon and one short word, the one shown filled, a dot on one with something waiting. One mode on the screen at a
// time; the last one picked is remembered for this browser (localStorage, never the save). Render only: what a mode is and
// what picking one does are render/menustage.js's (the level it shows, as the group chips and the strip did).
import '../events-ui.css';

const KEY = 'delivery_events_mode';
// the mode last picked (an event's id, or a one-level event's level id), or null (no storage, a private window)
export const rememberedMode = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const rememberMode = (id) => { try { if (id) localStorage.setItem(KEY, id); } catch { /* (no storage: forgotten) */ } };

// (a few lines of SVG each, drawn in the text's colour: no picture files, nothing to load)
const ICONS = {
  hunt: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  bolt: '<path d="M13.5 2.5 5 13.5h6l-1.5 8 8.5-11h-6z" fill="currentColor" stroke-linejoin="round"/>',
  comet: '<circle cx="15.5" cy="8.5" r="4" fill="currentColor"/><path d="M12.5 11.5 3 21M10.5 8 4.5 14M16 12.5l-6 6"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M2.5 9h19M12 9v11.5M12 9c-1.5-4-6-5-6-2.2C6 8.6 9 9 12 9c3 0 6-.4 6-2.2C18 4 13.5 5 12 9z"/>',
  flag: '<path d="M5 21.5V3M5 4h12l-2.5 4 2.5 4H5"/>',
  trophy: '<path d="M7 3.5h10v5a5 5 0 0 1-10 0zM7 5.5H3.5c0 3 1.5 4.5 3.8 4.6M17 5.5h3.5c0 3-1.5 4.5-3.8 4.6M12 13.5v3.5M8 20.5h8M9.5 17h5v3.5h-5z"/>',
};
const WORDS = { 'car-hunt': ['hunt', 'Hunt'], 'concept-strike': ['bolt', 'Strike'], 'comet-hunt': ['comet', 'Comet'], christmas: ['gift', 'Xmas'] };
// a mode's icon and word: its own, or, for an event not named above, a flag (a special event) or a gift (a one-level event)
// and the first word of its name
export const modeLook = (id, name, special) => WORDS[id] ? { icon: WORDS[id][0], word: WORDS[id][1] } : { icon: special ? 'flag' : 'gift', word: String(name || id).split(/[\s:]+/)[0] };
export const icon = (name) => {
  const span = document.createElement('span');
  span.className = 'ev-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${ICONS[name] || ICONS.flag}</svg>`;
  return span;
};

// the strip: modes [{ id, name, special, waiting }], the one shown, and what a tap does (pick(id)). role=tablist; the arrow
// keys move along it when one of its buttons has the focus (as the Cosmetics screen's tabs)
export const modeStrip = (modes, current, pick) => {
  const nav = document.createElement('div');
  nav.className = 'ev-modes';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Events');
  for (const m of modes) {
    const { icon: ic, word } = modeLook(m.id, m.name, m.special);
    const b = document.createElement('button');
    b.className = 'ev-mode' + (m.id === current ? ' on' : '');
    b.dataset.mode = m.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(m.id === current));
    b.setAttribute('aria-label', m.name + (m.waiting ? ': something to play' : ''));
    b.title = m.name;
    b.tabIndex = m.id === current ? 0 : -1;
    const w = document.createElement('span');
    w.className = 'ev-word';
    w.textContent = word;
    const dot = document.createElement('i');
    dot.className = 'ev-dot';
    dot.hidden = !m.waiting;
    b.append(icon(ic), w, dot);
    b.addEventListener('click', () => pick(m.id));
    b.addEventListener('keydown', (e) => {
      if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return;
      e.stopPropagation(); e.preventDefault(); // (the menu's own arrows step the levels: here they step the tabs)
      const at = modes.findIndex(x => x.id === m.id), to = modes[at + (e.code === 'ArrowLeft' ? -1 : 1)];
      if (to) { pick(to.id); requestAnimationFrame(() => document.querySelector(`.ev-mode[data-mode="${to.id}"]`)?.focus()); }
    });
    nav.append(b);
  }
  return nav;
};

// a 'Details' button (a phone's: the secondary words folded away; menu2.css / events-ui.css show it only there). The open state is
// the caller's, kept across redraws; aria-expanded says it
export const detailsButton = (open, toggle) => {
  const b = document.createElement('button');
  b.className = 'menu-chip ev-more-btn';
  b.setAttribute('aria-expanded', String(open));
  b.textContent = 'Details';
  b.addEventListener('click', () => {
    toggle();
    if (b.getAttribute('aria-expanded') !== 'true') return;
    // (opened: what it unfolded brought up into the card's view, the button at its top)
    const box = b.closest('.event-panel') || b.closest('.menu-stage');
    if (box && box.scrollHeight > box.clientHeight) {
      const top = b.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
      box.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  });
  return b;
};
