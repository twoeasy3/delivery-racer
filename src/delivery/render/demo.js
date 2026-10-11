// ?demo in the address: a made-up save for this visit, to look at the menus with (every level open, a best
// time on most, every other car owned, a full bank). Nothing of it is kept: saving is switched off until
// the page is left. Brought in by main.js ahead of the menu, which draws itself from saved progress.
import { CONFIG } from '../config.js';
import { LEVELS } from '../levels.js';
import { CARS } from '../cars.js';
import { Progress } from '../progress.js';

if (new URLSearchParams(location.search).get('demo') !== null) {
  Progress.save = () => {};
  Progress.data.unlocked = LEVELS.length - 2; // (the last two left locked, to see a locked card)
  Progress.data.money = CONFIG.completeBank;
  Progress.data.cars = CARS.filter((car, i) => i % 2 === 0).map(car => car.id);
  LEVELS.forEach((level, i) => {
    // (a spread of medals: the share of the clock left to spare goes up and down the levels; one in four not delivered)
    if (i % 4 !== 3) Progress.data.bestTime.good[level.id] = level.clock.good * (0.04 + (i % 5) * 0.08);
    if (i % 3 !== 2) Progress.data.bestTime.evil[level.id] = level.clock.evil * (0.02 + (i % 4) * 0.04);
  });
}
