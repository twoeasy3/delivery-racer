// ---- start screen: the options and extras, and what happens round the menu -------------------------------
// The start screen is only a menu. Picking a level just marks it; the level is built when
// a run starts (Game.start). Nothing here reloads the page.
// The level select, the car and the side are render/menustage.js (which draws them: `draw`); this file has the
// switches and buttons of the options sheet, the race controls, the secret bus, and the results screen's buttons.
import { CONFIG } from '../config.js';
import { LEVELS, LEVEL_INDEX, LEVEL, selectLevel, nextOnTab, setRaceClass, RACE_CLASSES } from '../levels.js';
import { levelName } from '../levelText.js';
import { CARS, SECRET_CARS, useLevelCar, selectCar, amphibiousCars, restrictedTier } from '../cars.js';
import { Tiers } from '../tiers.js';
import { Progress } from '../progress.js';
import { Game } from '../game.js';
import { Garage } from './garage.js';
import { Sound } from './audio.js';
import './menuclick.js'; // (every click on a menu plays one sound)
import { ask } from './dialog.js';
import { Input } from '../input.js';
import { draw, MenuStage } from './menustage.js';
export { LEVEL_SHOTS } from './menustage.js'; // (the postcard album's pictures: render/album.js)

draw();
// a car picked in the garage shows on its card (unless the level has a vehicle of its own; and on an amphibious
// level only if it is an amphibious one: otherwise the player's amphibious car stays)
window.addEventListener('carchange', () => { useLevelCar(LEVEL.car, LEVEL.amphibious); draw(); });
// Start on an amphibious level with no amphibious car owned (see Game.start): nothing starts, and the
// garage opens at the one to get, to look at and buy (still a menu: no level is built, nothing reloads)
Game.onRefused.push(() => {
  draw();
  Garage.open();
  const tier = restrictedTier(); // (a level whose tier rule allows only cars the player has none of: the cheapest of the tier)
  const wanted = tier !== null ? Tiers.carsOfTier(tier) : amphibiousCars();
  Garage.look(wanted.sort((a, b) => a.price - b.price)[0].id); // (the cheapest)
});

// sound on / off: this button, or the M key at any time
const muteBtn = document.getElementById('muteBtn');
const showMute = () => { muteBtn.textContent = 'Sound: ' + (Sound.muted ? 'off' : 'on'); };
const toggleMute = () => { Sound.toggleMute(); showMute(); };
muteBtn.addEventListener('click', toggleMute);
window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat) toggleMute(); });
showMute();

// auto accelerate on / off: the accelerator is held down by itself, and braking overrides it
const autoGasBtn = document.getElementById('autoGasBtn');
const showAutoGas = () => {
  Input.autoGas = !!Progress.data.autoGas;
  autoGasBtn.textContent = 'Auto accelerate: ' + (Input.autoGas ? 'on' : 'off');
};
autoGasBtn.addEventListener('click', () => {
  Progress.data.autoGas = !Progress.data.autoGas;
  Progress.save();
  showAutoGas();
});
showAutoGas();

// the race class: every race (and the race screensaver) in F1 cars, or in GT road cars
const raceClassBtn = document.getElementById('raceClassBtn');
const showRaceClass = () => {
  const kind = RACE_CLASSES[Progress.data.raceClass] ? Progress.data.raceClass : 'f1';
  setRaceClass(kind);
  useLevelCar(LEVEL.car, LEVEL.amphibious); // (a race level picked: its car is the class's)
  raceClassBtn.textContent = 'Race cars: ' + RACE_CLASSES[kind];
};
// the race screensaver's circuit: one of the lapped levels, or each of them in turn
const raceTrackBtn = document.getElementById('raceTrackBtn');
const raceTracks = () => [...LEVELS.filter(l => l.laps).map(l => l.id), 'all'];
const showRaceTrack = () => {
  const level = LEVELS.find(l => l.laps && l.id === Progress.data.raceTrack);
  raceTrackBtn.textContent = 'Race track: ' + (level ? levelName(level) : 'All in turn');
};
raceTrackBtn.addEventListener('click', () => {
  const tracks = raceTracks(), at = tracks.indexOf(Progress.data.raceTrack);
  Progress.data.raceTrack = tracks[(at < 0 ? tracks.length - 1 : at + 1) % tracks.length]; // (an unknown one counts as 'all')
  Progress.save();
  showRaceTrack();
});
showRaceTrack();
raceClassBtn.addEventListener('click', () => {
  const kinds = Object.keys(RACE_CLASSES);
  Progress.data.raceClass = kinds[(kinds.indexOf(Progress.data.raceClass) + 1) % kinds.length];
  Progress.save();
  showRaceClass();
  draw();
});
showRaceClass();
draw();

// a complete savegame, written to the progress cookie like any other progress
document.getElementById('completeBtn').addEventListener('click', async () => {
  if (!await ask({ title: 'Complete save', lines: ['Open every level, buy every car and fill the bank?'], ok: 'Do it' })) return;
  Progress.complete({
    levels: LEVELS.length,
    cars: CARS.map(car => car.id),
    money: CONFIG.completeBank,
  });
  draw();
});

// a secret: typing B U S on the start screen puts you in a city bus. It is yours from then
// on (pick another car in the garage to get out of it; Reset progress takes it away).
{
  let typed = '';
  window.addEventListener('keydown', (e) => {
    if (Game.state !== 'start' || Game.inMenu || e.repeat || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-3);
    if (typed !== 'bus') return;
    typed = '';
    Progress.buy(SECRET_CARS.bus);
    selectCar('bus');
    Sound.play('mystery');
    window.dispatchEvent(new Event('carchange'));
  });
}

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!await ask({ title: 'Reset progress', lines: ['Erase your bank, unlocked levels and cars?'], ok: 'Erase', danger: true })) return;
  Progress.reset();
  selectLevel(0);
  window.dispatchEvent(new Event('carchange')); // (the car in use may have been one that was bought)
  showAutoGas(); // (a reset forgets the choice)
  showRaceClass();
  MenuStage.follow();
});

// a save brought in by its code (render/savecode.js): everything the menu shows is the new save's
window.addEventListener('progresschange', () => {
  Game.evil = !!Progress.data.evil;
  // (never left on a level it has not opened)
  if (Tiers.on()) selectLevel(Tiers.isOpen(LEVELS[Math.max(0, LEVEL_INDEX)]) ? Math.max(0, LEVEL_INDEX) : 0);
  else selectLevel(Math.min(Math.max(0, LEVEL_INDEX), Progress.data.unlocked - 1));
  selectCar(Progress.data.car);
  window.dispatchEvent(new Event('carchange'));
  Sound.toggleMute(); toggleMute(); // (twice, so as it was saved: this sets the volume by it, and the button's words)
  showAutoGas();
  showRaceClass();
  showRaceTrack();
  MenuStage.follow();
});

// the screensaver: the chaos level with no player car, round and round until Exit
document.getElementById('screensaverBtn').addEventListener('click', () => Game.startScreensaver());
// ...and the race screensaver: a race round a circuit, watched (a button beside the race controls, and one among the extras)
for (const id of ['raceWatchBtn', 'raceWatchBtn2']) document.getElementById(id).addEventListener('click', () => Game.startRaceWatch());
// pause and exit, during a run or the screensaver
document.getElementById('pauseBtn').addEventListener('click', () => Game.togglePause());
document.getElementById('exitBtn').addEventListener('click', () => Game.exit());

// results screen buttons
const next = document.getElementById('nextBtn');
document.getElementById('menuBtn').addEventListener('click', () => { Game.toMenu(); MenuStage.follow(); });
next.addEventListener('click', () => Game.nextLevel());
// when a run ends: the bank and the unlocked levels may have changed, and "Next level"
// is only offered if there is one. (The menu comes back on the level just run, and so on its tab)
Game.onFinish.push(() => {
  next.style.display = LEVEL_INDEX >= 0 && nextOnTab(LEVEL) ? '' : 'none';
  if (LEVEL_INDEX >= 0) MenuStage.follow();
  else draw();
});
