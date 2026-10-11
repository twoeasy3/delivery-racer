// ---- the garage's lot, sorted and filtered ---------------------------------------------------------
// Two buttons on the garage's bar: Sort (the order the cars are parked in, column by column) and Show (which
// of them are parked at all). Each press moves on to the next choice and the lot is built again
// (render/garage.js: buildLot asks arrange() for its cars). Neither choice is saved: the garage opens as
// it always has, every car in order of its stars.
import '../menus.css';
import { Progress } from '../progress.js';
import { blueStarsOpen, EARNED_CARS, carTier } from '../cars.js';

// (by: how two cars compare; none: as the garage has them, by stars and then price)
const SORTS = [
  { id: 'stars', name: 'Stars' },
  { id: 'price', name: 'Price', by: (a, b) => a.price - b.price },
  { id: 'speed', name: 'Top speed', by: (a, b) => b.maxSpeed - a.maxSpeed },
  { id: 'accel', name: 'Acceleration', by: (a, b) => b.accel - a.accel },
  { id: 'health', name: 'Health', by: (a, b) => b.health - a.health },
];
// (when: whether the choice is offered at all)
const SHOWS = [
  { id: 'all', name: 'All', has: () => true },
  { id: 'owned', name: 'Owned', has: (car) => Progress.owns(car.id) },
  { id: 'sale', name: 'For sale', has: (car) => !Progress.owns(car.id) },
  { id: 'afford', name: 'Can afford', has: (car) => !Progress.owns(car.id) && Progress.data.money >= car.price },
  { id: 'amphibious', name: 'Amphibious', has: (car) => !!car.amphibious },
  { id: 'gold', name: 'Gold stars', has: (car) => !!car.tier && !car.blue && !car.amphibious && !car.earned, when: blueStarsOpen },
  { id: 'blue', name: 'Blue stars', has: (car) => !!car.blue, when: blueStarsOpen },
  // (the 6-star cars, each earned on a special level: offered once there is one. See cars.js EARNED_CARS)
  { id: 'earned', name: '6 stars', has: (car) => !!car.earned, when: () => EARNED_CARS.some(car => Progress.earned(car)) },
];

export const GarageView = {
  sort: SORTS[0],
  restrictTier: null, // a tier number: only the cars of that tier are parked (a level that restricts the car: see tiers.js)
  show: SHOWS[0],
  // true: parked as the garage always has them (so in each column the biggest goes at the back)
  get usual() { return this.sort === SORTS[0]; },
};
// ?sort=price and ?show=owned in the address (with ?garage) start it that way, for a check
{
  const params = new URLSearchParams(location.search);
  GarageView.sort = SORTS.find(s => s.id === params.get('sort')) || GarageView.sort;
  GarageView.show = SHOWS.find(s => s.id === params.get('show')) || GarageView.show;
}
// the cars to park, in order, out of the garage's own list (already in order of stars and price)
export const arrange = (cars) => {
  const shown = cars.filter(GarageView.show.has).filter(car => GarageView.restrictTier === null || carTier(car) === GarageView.restrictTier);
  return GarageView.sort.by ? shown.sort(GarageView.sort.by) : shown; // (a stable sort: ties stay in star order)
};

// How many cars an option parks (out of the garage's own list, under the tier a level restricts to)
let carsOf = () => [];
const countOf = (choice) => carsOf().filter(car => (GarageView.restrictTier === null || carTier(car) === GarageView.restrictTier) && (!choice.has || choice.has(car))).length;
// The Show choices on offer: those the game has opened and that park at least one car (an option that returns no
// cars is not listed; the one in use is, so long as it parks some)
export const offered = () => SHOWS.filter(choice => (!choice.when || choice.when()) && countOf(choice) > 0);
// the choice in use fell empty (the last car for sale bought, the bank spent): back to All. True when it moved
GarageView.settle = () => {
  if (offered().includes(GarageView.show)) return false;
  GarageView.show = SHOWS[0];
  return true;
};
GarageView.count = countOf;

// the two controls, put on the bar ahead of its Good / Evil pair: each a button that opens a short list of every
// choice (the one in use marked), not one that cycles through them. cars: the garage's whole list (to count what
// each Show choice would park); onChange: the lot is to be built again
export const mountGarageView = (cars, onChange) => {
  carsOf = cars;
  GarageView.rebuild = onChange;
  const bar = document.querySelector('#garageUi .bar'), before = document.getElementById('liveryBtn');
  const closers = [];
  const closeAll = (except) => closers.forEach(close => close !== except && close());
  const control = (key, label, choices) => {
    const wrap = document.createElement('span'), b = document.createElement('button'), list = document.createElement('div');
    wrap.className = 'view-pick';
    b.className = 'view-btn';
    b.type = 'button';
    b.setAttribute('aria-haspopup', 'listbox');
    list.className = 'view-list hidden';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label);
    wrap.append(b, list);
    const options = () => choices();
    const say = () => {
      b.textContent = label + ': ' + GarageView[key].name + ' ▾';
      wrap.style.display = key === 'show' && offered().length < 2 ? 'none' : ''; // (nothing to choose between)
    };
    const close = () => { list.classList.add('hidden'); b.setAttribute('aria-expanded', 'false'); };
    const fill = () => {
      list.replaceChildren(...options().map((choice) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'option');
        const on = choice === GarageView[key];
        item.setAttribute('aria-selected', on);
        item.className = 'view-item' + (on ? ' on' : '');
        const name = document.createElement('span'), n = key === 'show' ? countOf(choice) : null;
        name.textContent = choice.name;
        const tick = document.createElement('span');
        tick.textContent = on ? '✓' : '';
        item.append(tick, name);
        if (n !== null) { const count = document.createElement('small'); count.textContent = String(n); item.append(count); }
        item.addEventListener('click', () => {
          close();
          b.focus({ preventScroll: true });
          if (choice === GarageView[key]) return;
          GarageView[key] = choice;
          say();
          onChange();
        });
        return item;
      }));
    };
    b.addEventListener('click', () => {
      const wasOpen = !list.classList.contains('hidden');
      closeAll();
      if (wasOpen) return;
      fill();
      list.classList.remove('hidden');
      b.setAttribute('aria-expanded', 'true');
      (list.querySelector('.on') || list.firstChild)?.focus({ preventScroll: true });
    });
    list.addEventListener('keydown', (event) => {
      const items = [...list.children], at = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        items[(at + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      } else if (event.key === 'Escape') { close(); b.focus(); } else return;
      event.preventDefault();
      event.stopPropagation(); // (the lot's arrow keys scroll it: not while a list is up)
    });
    closers.push(close);
    GarageView[key + 'Say'] = say;
    say();
    bar.insertBefore(wrap, before);
  };
  control('sort', 'Sort', () => SORTS);
  control('show', 'Show', offered);
  // a tap anywhere else closes a list
  document.addEventListener('pointerdown', (event) => { if (!event.target.closest?.('.view-pick')) closeAll(); });
  GarageView.refreshControls = () => { GarageView.sortSay?.(); GarageView.showSay?.(); };
};
