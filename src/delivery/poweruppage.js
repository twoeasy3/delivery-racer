// ============================================================================
// THE POWER-UPS PAGE (delivery/powerups.html): every pickup in powerups.js, its own model spinning over its
// pad, with what it does. One renderer draws every card's model, each into a small canvas of its own in the
// card's .view, so it scrolls with the page (render/modelviews.js).
// ============================================================================
import './powerups.css';
import { CONFIG } from './config.js';
import { Progress } from './progress.js';
import { CARDS, says } from './powerups.js';
import { PICKUP_COLOR } from './render/pickupModels.js';
import { pickupView, viewRenderer, drawViews } from './render/modelviews.js';

const hex = (color) => '#' + color.toString(16).padStart(6, '0');

// ---- the cards ----------------------------------------------------------------------------------
document.getElementById('rules').innerHTML = `
  <h2>How power-ups work</h2>
  <ul>
    <li><strong>One at a time.</strong> Picking one up replaces the one running (the wrench, the stopwatches and cash excepted).</li>
    <li>The time left shows under your speed, and the power-up's sign rides on or over your car.</li>
    <li>In the last <strong>${CONFIG.powerUpWarning} s</strong> a warning sound loops and the sign blinks.</li>
    <li>Each one announces itself in yellow as you pick it up; TANK RAGE in red.</li>
  </ul>`;
const cardBox = document.getElementById('cards');
const views = [];
for (const card of CARDS) {
  const color = card.color ?? PICKUP_COLOR[card.type];
  const el = document.createElement('article');
  el.className = 'card' + (card.wide ? ' wide' : '');
  el.style.setProperty('--glow', hex(color) + '55');
  el.style.setProperty('--swatch', hex(color));
  if (card.saysColor) el.style.setProperty('--says', card.saysColor);
  el.innerHTML = `
    <div class="view"></div>
    <div class="body">
      <h2>${card.name}${card.time ? `<span class="time">${card.time} s</span>` : ''}</h2>
      ${card.says ? `<p class="says">${card.says}</p>` : ''}
      <ul>${card.rules.map(r => `<li>${r}</li>`).join('')}</ul>
      ${card.effects ? `<ul class="effects">${card.effects.map(([key, text]) =>
        `<li><strong>${says('powerups', 'mystery', key) || key}</strong><br>${text}</li>`).join('')}</ul>` : ''}
    </div>`;
  cardBox.append(el);
  // (a little scene per card: the model turning and bobbing over its pad, in the look for the side picked on the menu)
  views.push({ el: el.querySelector('.view'), ...pickupView(card.type, color, !!Progress.data.evil) });
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
