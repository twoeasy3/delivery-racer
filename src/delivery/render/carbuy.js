// ---- buying a car: the ONE purchase path (CHECKLIST 440, the owner, 17-Oct: "Cars will just be purchaseable in the showroom itself") ----
// Crazey Jim's car lot is retired as the place to buy cars: the showroom's full view has the Buy button, and the results'
// "Better ride" card and the Garage (now under Options) buy through this same function. What it does is what the lot's
// buy did (render/garage.js before v1.1.153): the rules are the lot's (cars.js forSale: tiers / lock rules unchanged),
// the money and the save are Progress.buy's (progress.js, unchanged), and a car bought plays the sale cutscene
// (render/cinequeue.js purchased: the 'jim' cine). Render only: nothing a run reads.
//   confirm: true (the showroom, the Garage): the game's own sheet asks first (render/dialog.js), terse;
//            false (the results' Better ride button, which already says the car and its price): bought on the tap
// Resolves true when the car is owned after it (bought now, or already owned).
import { CARS, forSale, carRule, ruleAllows, amphibiousCars } from '../cars.js';
import { Progress } from '../progress.js';
import { ask, tell } from './dialog.js';
import { bankWhole } from './bank.js';
import { purchased } from './cinequeue.js';

export const priceText = (price) => '$' + (Number.isInteger(price) ? String(price) : price.toFixed(2));
// can this car be bought now (not owned, on sale under the tiers), and can the bank pay for it
export const buyable = (car) => !!car && !Progress.owns(car.id) && forSale(car);
export const affordable = (car) => !!car && Progress.data.money >= car.price;

// the car to buy when the level picked allows none the player owns (its car rule; else an amphibious level): the cheapest it
// allows (was the car lot's look, render/menu.js; now the showroom's full view opens on it)
export const cheapestWanted = () => {
  const rule = carRule();
  const wanted = rule ? CARS.filter(car => ruleAllows(rule, car)) : amphibiousCars();
  return wanted.sort((a, b) => a.price - b.price)[0] || null;
};

export const buyCar = async (car, { confirm = true } = {}) => {
  if (!car) return false;
  if (Progress.owns(car.id)) return true;
  if (!forSale(car)) return false; // (an earned car, an event's, a tier not open: never sold)
  if (!affordable(car)) {
    if (confirm) await tell({ title: 'Not enough money', ok: 'OK', lines: [priceText(car.price) + ' · bank $' + bankWhole(Progress.data.money)] });
    return false;
  }
  if (confirm && !await ask({ title: 'Buy the ' + car.name + '?', ok: 'Buy ' + priceText(car.price), cancel: 'Cancel' })) return false;
  let bought = false;
  try { bought = Progress.buy(car) && Progress.owns(car.id); } catch { /* (said below) */ }
  if (!bought) {
    if (confirm) await tell({ title: 'Not bought', lines: ['No money was taken.'] });
    return false;
  }
  purchased(car); // (bought and saved: the sale cutscene, render/cinequeue.js)
  return true;
};
