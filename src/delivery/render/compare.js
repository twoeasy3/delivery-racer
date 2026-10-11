// ---- the garage's comparison card ------------------------------------------------------------------
// With a car other than the one in use being looked at, a card sets the two side by side, stat by stat:
// the car in use, the car looked at, and the difference (green: the car looked at is the better; red: the
// worse). Shown by the garage's refresh (render/garage.js); it draws nothing in 3D.
// On a phone (menus.css, at the garage's own narrow width) the table is far too big: there the card is one short
// strip instead, a cell a stat: its name in a word, a bar (the car looked at's share of the two together: half way is level) and
// the difference. Both are built; the stylesheet shows one.
import '../menus.css';
import { CONFIG } from '../config.js';

// (of: the stat's value for a car; say: how it is written; lower: true = the less the better)
const ROWS = [
  { name: 'Top speed', short: 'Speed', of: (car) => Math.round(car.maxSpeed * 3.6), say: (v) => v + ' km/h' },
  { name: 'Acceleration', short: 'Accel', of: (car) => car.accel },
  { name: 'Health', short: 'Health', of: (car) => car.health },
  { name: 'Handling', short: 'Handle', of: (car) => Math.round((car.agility ?? 1) * 100), say: (v) => v + '%' },
  { name: 'Weight', short: 'Weight', of: (car) => Math.round((car.mass ?? 1) * 100), say: (v) => v + '%' },
  { name: 'Crossing', short: 'Cross', of: (car) => Math.round((car.crossing ?? CONFIG.railCrossing.usual) * 100), say: (v) => v + '%' },
  { name: 'Price', short: 'Price', of: (car) => car.price, say: (v) => '$' + v, lower: true },
];

const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const round = (v) => Math.round(v * 10) / 10;

let card = null;
// inUse against shown (the car looked at); the same car, or none: no card
export const showComparison = (inUse, shown) => {
  if (!card) {
    card = make('div', 'compare');
    card.id = 'garageCompare';
    const pick = document.querySelector('#garageUi .pick');
    pick.insertBefore(card, pick.firstChild);
  }
  if (!shown || !inUse || shown === inUse) { card.style.display = 'none'; return; }
  card.style.display = '';
  const table = make('table'), strip = make('div', 'cells');
  const head = make('tr');
  head.append(make('th'), make('th', '', inUse.name), make('th', '', shown.name), make('th'));
  table.append(head);
  for (const row of ROWS) {
    const a = row.of(inUse), b = row.of(shown), say = row.say || ((v) => String(round(v)));
    const diff = round(b - a), better = row.lower ? diff < 0 : diff > 0;
    const line = make('tr');
    line.append(make('td', 'stat', row.name), make('td', '', say(a)), make('td', '', say(b)),
      make('td', diff === 0 ? 'same' : better ? 'better' : 'worse', diff === 0 ? '=' : (diff > 0 ? '+' : '-') + Math.abs(diff)));
    table.append(line);
    // (the phone's strip: the same row as a cell)
    const cell = make('span', 'cell ' + (diff === 0 ? 'same' : better ? 'better' : 'worse')), fill = make('i');
    fill.style.width = Math.round(Math.max(0.04, Math.min(1, b / Math.max(a + b, 1e-9))) * 100) + '%';
    const track = make('span', 'track');
    track.append(fill);
    cell.append(make('small', '', row.short), track, make('b', '', diff === 0 ? '=' : (diff > 0 ? '+' : '-') + Math.abs(diff)));
    strip.append(cell);
  }
  if (inUse.perk || shown.perk) {
    const line = make('tr');
    line.append(make('td', 'stat', 'Perk'), make('td', 'perk', inUse.perk || '-'), make('td', 'perk', shown.perk || '-'), make('td'));
    table.append(line);
  }
  const mini = make('div', 'mini');
  mini.append(make('em', '', shown.name + ' against ' + inUse.name + ', in use'), strip);
  card.replaceChildren(make('strong', '', 'In use against this car'), table, mini);
};
