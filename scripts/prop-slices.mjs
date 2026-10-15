// The PROP AUDIT'S SLICES (PROP-AUDIT-GUIDE.md): the in-scope cars (scripts/prop-roster.mjs: every car a player can drive or own) split into
// FIVE near-equal slices, one sweeping agent each, so that nobody edits another's data file (render/propanchors/slice-<n>.json).
//   1  garage T1-T3 and their Supers            2  garage T4-T5, the amphibious five, the Tank, their Supers, the first idea cars
//   3  the filler cars and more idea cars        4  earned, Legendary, Bespoke / concept, the event car, the City Bus, the level vehicles
//   5  the rest of the idea lot
//   node scripts/prop-slices.mjs            print the slices (counts and ids) and every car's kind; cars with no kind are listed
//   import { slicesOf } from './prop-slices.mjs'   slicesOf(cars) -> [[{ group, car }...] x 5]   (cars = roster(C, IDEA_CARS))
import { startModels } from './modelpatch-load.mjs';
import { roster } from './prop-roster.mjs';

export const SLICE_COUNT = 5;
export const slicesOf = (cars) => {
  const tier = (c) => c.car.tier || 0;
  const garage = cars.filter(c => c.group === 'garage'), supers = cars.filter(c => c.group === 'super');
  const superOf = (c) => supers.find(s => s.car.model === (c.car.model || c.car.id) && s.car.id === 'super-' + c.car.id) || supers.find(s => s.car.id === 'super-' + c.car.id);
  const low = garage.filter(c => tier(c) >= 1 && tier(c) <= 3 && !c.car.amphibious && !c.car.tank);
  const high = garage.filter(c => !low.includes(c));
  const ideas = cars.filter(c => c.group === 'idea');
  const s1 = [...low, ...low.map(superOf).filter(Boolean)];
  const s2 = [...high, ...high.map(superOf).filter(Boolean)];
  const s3 = cars.filter(c => c.group === 'filler');
  const s4 = cars.filter(c => ['earned', 'legendary', 'bespoke', 'event', 'secret', 'level'].includes(c.group));
  // the idea lot tops slices 2 and 3 up to about a fifth each, the rest is slice 5
  const target = Math.ceil(cars.length / SLICE_COUNT);
  let i = 0;
  while (s2.length < target && i < ideas.length) s2.push(ideas[i++]);
  while (s3.length < target && i < ideas.length) s3.push(ideas[i++]);
  const s5 = ideas.slice(i);
  const out = [s1, s2, s3, s4, s5];
  const seen = new Set();
  for (const s of out) for (const c of s) { if (seen.has(c.car.id)) throw new Error('twice in the slices: ' + c.car.id); seen.add(c.car.id); }
  if (seen.size !== cars.length) throw new Error('the slices hold ' + seen.size + ' of ' + cars.length + ' cars');
  return out;
};
export const sliceOfCar = (cars, id) => slicesOf(cars).findIndex(s => s.some(c => c.car.id === id)) + 1;

if (process.argv[1] && /prop-slices\.mjs$/.test(process.argv[1])) {
  const { load, close } = await startModels();
  try {
    const C = await load('cars.js');
    const { IDEA_CARS } = await load('ideas.js');
    const P = await load('render/propanchors.js');
    const cars = roster(C, IDEA_CARS), slices = slicesOf(cars);
    console.log(cars.length + ' cars in scope, ' + slices.length + ' slices');
    slices.forEach((s, n) => console.log('slice ' + (n + 1) + ' (' + s.length + '): ' + s.map(c => c.car.id + ':' + P.kindOf(c.car)).join(' ')));
    const missing = cars.filter(c => !P.KINDS[c.car.id] && !P.KINDS[c.car.model || c.car.id]);
    console.log('cars with no KIND (render/propanchors.js KINDS; they fall back to \'car\'): ' + (missing.map(c => c.car.id).join(', ') || 'none'));
  } finally { await close(); }
}
