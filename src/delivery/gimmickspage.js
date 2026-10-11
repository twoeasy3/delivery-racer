// ============================================================================
// THE GIMMICKS PAGE (delivery/gimmicks.html): every gimmick in gimmicks.js, by group: its model, what it
// does, and the levels it turns up in. One renderer draws every card's model, each into a small canvas of
// its own in the card's .view, so it scrolls with the page (render/modelviews.js).
// ============================================================================
import './powerups.css';
import './gimmicks.css';
import { GROUPS, DRESSING, where } from './gimmicks.js';
import { standView, viewRenderer, drawViews } from './render/modelviews.js';

// ---- the page: the groups (a row of buttons to jump to each), then the cards -------------------------
const hex = (color) => '#' + color.toString(16).padStart(6, '0');
const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '-');
const ALL = [...GROUPS, DRESSING]; // (the road dressing last: not gimmicks, the themes' own plain obstacles, to see them in one place)
document.getElementById('groups').innerHTML = ALL.map(g => `<a href="#${slug(g.name)}">${g.name}</a>`).join('');
const cardBox = document.getElementById('cards');
const views = [];
// (gimmicks.html?group=vehicles shows that group alone, and &from=5 only its cards from the fifth on: for a look at a card)
const only = new URLSearchParams(location.search).get('group'), fromCard = Number(new URLSearchParams(location.search).get('from') || 1);
for (const g of ALL.filter(g => !only || slug(g.name) === only).map(g => only ? { ...g, cards: g.cards.slice(fromCard - 1) } : g)) {
  const heading = document.createElement('h2');
  heading.className = 'group';
  heading.id = slug(g.name);
  heading.textContent = g.name;
  cardBox.append(heading);
  if (g.about) { const about = document.createElement('p'); about.className = 'levels'; about.style.gridColumn = '1 / -1'; about.textContent = g.about; cardBox.append(about); }
  for (const card of g.cards) {
    const levels = where(card.has);
    const el = document.createElement('article');
    el.className = 'card';
    el.style.setProperty('--glow', hex(card.color) + '55');
    el.style.setProperty('--swatch', hex(card.color));
    el.innerHTML = `
      <div class="view"></div>
      <div class="body">
        <h2>${card.name}</h2>
        <ul>${card.rules.map(r => `<li>${r}</li>`).join('')}</ul>
        <p class="levels">${card.everywhere ? 'On every level' : levels.length ? 'In ' + levels.join(', ') : 'Not in any level yet'}</p>
      </div>`;
    cardBox.append(el);
    views.push({ el: el.querySelector('.view'), ...standView(card.build()) }); // (a little scene per card: the model on its stand)
  }
}

// ---- drawing ------------------------------------------------------------------------------------
const renderer = viewRenderer(); // (null if none can be had: the page is its words alone)
let last = performance.now();
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  drawViews(renderer, views, now / 1000, dt);
  requestAnimationFrame(frame);
};
if (renderer) requestAnimationFrame(frame);
