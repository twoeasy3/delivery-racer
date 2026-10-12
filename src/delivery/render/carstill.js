// ---- a car's still: its real model, in a side's livery, drawn ONCE at one pose and kept as a picture ----------------
// The special event's cards (render/menustage.js) and the showroom's (render/showroom.js) show their cars this way:
// drawStill (render/modelviews.js) renders the model into the element's own size by the menu's one renderer, the
// picture is kept as a data URL, and the element shows it as its background. Kept by car, side AND size (in steps of
// 20 px): a picture drawn small (the event's grand prize) is never stretched over a bigger card, where it was blurry.
import { makeShowCar, paintShowCar } from './garage.js';
import { sharedRenderer, drawStill } from './modelviews.js';

export const STILL_POSE = { lift: 0.3, angle: -0.64, close: 1 }; // (from a little above, in front, three-quarters on, the nose to the left: every card the same)
const stills = new Map(); // car id + side + size -> the picture of it, once drawn
const keyOf = (el, car, evil) => {
  const r = el.getBoundingClientRect();
  return car.id + (evil ? '/evil' : '/good') + '/' + Math.round(r.width / 20) + 'x' + Math.round(r.height / 20);
};
// already drawn for this element's size: shown at once (true); false: it is still to be drawn
export const stillReady = (el, car, evil) => {
  const url = stills.get(keyOf(el, car, evil));
  if (url) el.style.backgroundImage = `url("${url}")`;
  return !!url;
};
// drawn now if it is not yet (a model built, painted, rendered, and given back). False: nothing could be drawn (no
// renderer, no size yet, no model for the car)
export const stillCar = (el, car, evil) => {
  if (stillReady(el, car, evil)) return true;
  const key = keyOf(el, car, evil);
  try {
    const model = makeShowCar(car);
    paintShowCar(model, car, evil);
    if (!drawStill(sharedRenderer(), el, model, STILL_POSE)) return false;
    const canvas = el.querySelector('canvas');
    stills.set(key, canvas.toDataURL('image/png'));
    canvas.remove();
    el.style.backgroundImage = `url("${stills.get(key)}")`;
    return true;
  } catch (error) { console.warn('No model for the card: ' + (error?.message || error)); return false; }
};
