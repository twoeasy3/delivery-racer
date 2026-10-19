// THE LAST CAR PICKED in the garage (and the better-ride card), whatever level was selected when it was picked.
// Why: on a level with a car rule (a tier's, or its own list) a pick is kept apart from the player's own car
// (cars.js selectCar -> Progress.data.tierCars[rule.key]; Progress.data.car follows only if the rule allows the car already in use).
// A level with no rule and no lock of its own (every ?hidden=<id> level) drives Progress.data.car, which was therefore often an OLDER
// pick than the one the player just made. The hidden-level start (main.js) puts the player in this car instead.
// RENDER-ONLY: not a rules module, not in the replay fingerprint, not in the save or its cookie (as render/loadoutstore.js).
// One localStorage key, every access in try/catch (no storage: nothing is remembered and data.car is used as before).
export const KEY = 'delivery.lastpick';
const ID = /^[A-Za-z0-9_-]{1,40}$/;
export const recordPick = (id) => {
  try { if (typeof id === 'string' && ID.test(id)) localStorage.setItem(KEY, id); } catch { /* (no storage) */ }
};
export const lastPick = () => {
  try { const id = localStorage.getItem(KEY); return id && ID.test(id) ? id : null; } catch { return null; }
};
// a hidden-level start (main.js): put Progress.data.car on the last pick if it is still owned. True if it did. The caller has Progress.noSave
// set (a ?hidden visit saves nothing); a level's own car lock (grand-prix: f1) is applied later, by cars.js useLevelCar, and still wins
export const driveLastPick = (Progress) => {
  const id = lastPick();
  if (!id || !Progress.owns(id)) return false;
  Progress.data.car = id;
  return true;
};
