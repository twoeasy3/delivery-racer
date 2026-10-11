// The cargo page (delivery/cargo.html): the things there are to deliver, the Evil ones in each of
// their three states, and which levels carry what. The names and the levels come from cargo.js and the
// numbers from config.js, so the page stays true as those change.
// As the power-ups page: one renderer draws every picture, each into a small canvas of its own in its
// .view, so it scrolls with the page (render/modelviews.js).
// ?side=good (or evil) shows only that side's. ?still freezes every model at one moment (&t=<s>: which), for a picture of the page.
// &turn=<rad> turns every model to that side (0.5 unless asked), for a look at it from another side.
import * as THREE from 'three';
import './powerups.css';
import './gimmicks.css';
import './cargo.css';
import { CONFIG } from './config.js';
import { LEVELS, levelLabel } from './levels.js';
import { levelName } from './levelText.js';
import { CARGO, CARGO_STATES, cargoFor } from './cargo.js';
import { makeCargoModel } from './render/cargoModels.js';
import { lit, viewRenderer, drawViews } from './render/modelviews.js';

const params = new URLSearchParams(location.search);
const still = params.get('still') !== null ? Number(params.get('t') || 2.4) : null;
const pct = (share) => Math.round(share * 100) + '%';
const C = CONFIG.consignment;
const STATE_WHEN = [
  'more than ' + pct(C.agitated) + ' of the clock left',
  pct(C.agitated) + ' of the clock left, or less',
  pct(C.furious) + ' or less, and all through the tip countdown',
];
const STATE_COLOR = ['#8fd3ff', '#ffb02e', '#ff4a3a'];

document.getElementById('rules').innerHTML = `
  <h2>How it works</h2>
  <ul>
    <li>Every delivery level carries <strong>one thing for Good and another for Evil</strong>, the same every run. Races and the Battlefield carry nothing.</li>
    <li>It sits in a <strong>corner of the screen</strong> while you drive. It is only a sight: it costs nothing and gives nothing.</li>
    <li>An Evil item <strong>follows the clock</strong>: calm with ${STATE_WHEN[0]}, agitated at ${STATE_WHEN[1]}, furious at ${STATE_WHEN[2]}.</li>
    <li>Cross the line and the car <strong>pulls in at the kerb and sets it down</strong>, in whatever state it has got to, before the results. Any key, tap or click skips that.</li>
  </ul>`;

// the levels that carry an item, as their numbers on the menu
const where = (side, id) => LEVELS.map((level, i) => cargoFor(level, side === 'evil')?.id === id ? `<span title="${levelName(level)}">${levelLabel(i)}</span>` : '').filter(Boolean);

const cardBox = document.getElementById('cards');
const views = [];
const makeView = (el, id, state) => {
  const scene = lit();
  const model = makeCargoModel(id);
  model.userData.setState?.(state, true);
  const turn = new THREE.Group();
  turn.add(model);
  turn.rotation.y = Number(params.get('turn') ?? 0.5); // (&turn=<rad>: seen from another side, with ?still)
  scene.add(turn);
  // every picture of an item is framed alike (on the most it ever takes up, furious), so its states compare
  const camera = new THREE.PerspectiveCamera(30, 1.4, 0.1, 50);
  // (a frame of it: it turns, and moves as its state has it; ?still holds it at one moment)
  views.push({ el, scene, camera, step(t, dt) {
    if (still === null) turn.rotation.y += dt * 0.4;
    model.userData.animate(still ?? t);
  } });
};
const frameOf = (id) => {
  const model = makeCargoModel(id);
  model.userData.setState?.(2, true);
  const bounds = new THREE.Box3();
  for (let t = 0; t < 6; t += 0.07) { model.userData.animate(t); model.updateMatrixWorld(true); bounds.union(new THREE.Box3().setFromObject(model)); }
  return bounds;
};
const section = (title, id) => {
  const heading = document.createElement('h2');
  heading.className = 'group';
  heading.id = id;
  heading.textContent = title;
  cardBox.append(heading);
};
for (const side of ['good', 'evil']) {
  if (params.get('side') && params.get('side') !== side) continue; // (?side=evil: only that side's)
  section((side === 'good' ? 'Good: # things worth getting there in one piece' : 'Evil: # things nobody should be driving about with').replace('#', CARGO[side].length), side);
  for (const item of CARGO[side]) {
    if (params.get('only') && !params.get('only').split(',').includes(item.id)) continue; // (?only=doll,bees: only those)
    const levels = where(side, item.id);
    const el = document.createElement('article');
    el.className = 'card cargo ' + side;
    el.style.setProperty('--glow', side === 'good' ? '#ffd23f44' : '#ff3b3044');
    el.style.setProperty('--swatch', side === 'good' ? '#ffd23f' : '#ff6a5a');
    const states = item.states ? item.states.map((name, k) => `
        <figure><div class="view"></div><figcaption><strong style="color:${STATE_COLOR[k]}">${name}</strong><small>${CARGO_STATES[k]}: ${STATE_WHEN[k]}</small></figcaption></figure>`).join('')
      : '<figure><div class="view"></div></figure>';
    el.innerHTML = `
      <div class="states">${states}</div>
      <div class="body">
        <h2>${item.name}</h2>
        <p class="levels">${levels.length ? 'On ' + levels.join(' ') : 'On no level yet'}</p>
      </div>`;
    cardBox.append(el);
    const bounds = frameOf(item.id);
    const from = views.length;
    el.querySelectorAll('.view').forEach((view, k) => makeView(view, item.id, k));
    const size = bounds.getSize(new THREE.Vector3()), mid = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.y, size.x, size.z) * 0.5, far = radius / Math.sin(THREE.MathUtils.degToRad(15));
    for (const v of views.slice(from)) {
      v.camera.position.set(0, mid.y + far * 0.3, far * 0.95);
      v.camera.lookAt(0, mid.y, 0);
    }
  }
}

const renderer = viewRenderer(); // (null if none can be had: the page is its words alone)
let last = performance.now();
const frame = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  drawViews(renderer, views, now / 1000, dt);
  requestAnimationFrame(frame);
};
if (renderer) requestAnimationFrame(frame);
