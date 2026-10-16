// ---- the LOADOUT SIGNATURE: everything cosmetic that dresses a car, as one short string (the owner, 15-Oct: "The showroom
// caches the player's car on load. It should re-render after customisation. I intend to make this per-car in a few updates").
// loadoutKey(car) -> e.g. 'w=whitewall.silver.spoke5.spoke5|p=yellow.HELLO|roof=roofbox.match|cargo=-|wing=-' (+ '|d=stripes.match' when a
// decal is worn, render/decalcosmetic.js: only then, so every key from before it stays as it was)
//   car: a car object or its id. It reads each cosmetic through the SAME readers the dressing uses (render/showcar.js
//   dressCosmetics -> wheelcosmetic.js dressWheels: wheelDesign, wheelColour, and the rim per axle via rims.js resolveRim;
//   platecosmetic.js dressPlates: shownDesign, plateText, the raw "existing plates off" switch; propdress.js dressProps: shownProp and
//   propPaintChoice per slot), so two cars, or one car before and after a change, dress alike exactly when their keys are equal.
//   A Legendary car is not dressed (its own black-and-gold wheels, plates and props) except by the raw plates switch: 'legend'.
// Whoever KEEPS a picture or a model of a dressed car keys it by car id + pose + size + loadoutKey(car) (render/carstill.js), or
// compares the key it was built with (render/showroomview.js, render/menustage.js), and onLoadout(fn) tells it that something changed.
// A STOCK picture (a pack's, the Shop's, a blueprint card's: dressCosmetics { stock: true }) is never keyed by this: it is 'stock'.
// PER CAR (15-Oct): every reader below takes the car's id and gives the car's OWN choice or, where it has none, the DEFAULT's
// (render/loadoutstore.js). So the key is the car's resolved loadout: changing car A's look moves only A's key; changing the default
// moves the key of every car that follows the default and of no car that has its own for that slot. Every cache is keyed per car id.
// Render-only (no rules module imports it; not in the replay fingerprint).
import { carById } from '../cars.js';
import { wheelDesign, wheelColour, wornRim, wornTread, onWheelColour } from './wheelcosmetic.js';
import { shownDesign, plateText, platesEquipped, onPlate, onPlatesEquipped } from './platecosmetic.js';
import { SLOTS, shownProp, propPaintChoice, onProp } from './propdress.js';
import { shownDecal, decalSupported, designById as decalById, onDecal } from './decalcosmetic.js';

export const STOCK_KEY = 'stock'; // (the key of a car as it comes: never one loadoutKey returns)
const carOf = (car) => (car && typeof car === 'object' ? car : carById(car) || { id: String(car) });
export const loadoutKey = (car) => {
  const c = carOf(car), id = c.id, raw = platesEquipped() ? '|x' : '';
  if (c.legend) return 'legend' + raw;
  const wheels = 'w=' + wheelDesign(id) + '.' + wheelColour(id) + '.' + wornRim(id, 'front') + '.' + wornRim(id, 'rear') + '.' + wornTread(id, 'front') + '.' + wornTread(id, 'rear');
  const design = shownDesign(id), plate = '|p=' + design + (design !== 'stock' ? '.' + plateText(id) : '');
  const props = SLOTS.map((slot) => { const p = shownProp(slot, id); return '|' + slot + '=' + (p === 'none' ? '-' : p + '.' + propPaintChoice(slot, id)); }).join('');
  const decal = decalSupported(c) ? shownDecal(id) : null, dd = decal && decal.id !== 'none' ? decalById(decal.id) : null;
  return wheels + plate + props + (dd ? '|d=' + dd.id + (dd.colourFrom === 'fixed' ? '' : '.' + decal.colour) : '') + raw;
};

// fn() after ANY cosmetic change (a wheel set or rim, a plate design or its text, the raw plates switch, a prop or its paint; a new
// cosmetic's module adds its own notice here). Returns a function that stops it.
const listeners = new Set();
const tell = () => { for (const fn of [...listeners]) { try { fn(); } catch (error) { console.warn('loadout listener: ' + (error?.message || error)); } } };
onWheelColour(tell); onPlate(tell); onPlatesEquipped(tell); onProp(tell); onDecal(tell);
export const onLoadout = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
