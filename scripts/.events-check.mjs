// A check of the special events (src/delivery/events.js, events.json; EVENTS-NOTES.md): the test event, The Comet Hunt,
// played through with the clock moved on, day by day: each stage opens on its date and once the one before is done;
// a stage needs its car owned (Love Bus, Tow Truck), or lends it (the Silver Comet, a free try); a car the player cannot
// buy holds them there until they can, or the event is over; a stage is a level of its own (its best time, its
// replay); the last stage done gives the prize once, into the save, kept when the event is over.
//   node scripts/.events-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const { Progress } = await g.load('progress.js');
const { Events, STAGE_LEVELS } = await g.load('events.js');
const { Tiers } = await g.load('tiers.js');
const { Replay } = await g.load('replay.js');
const cars = g.cars, levels = g.levels, Game = g.Game;
const event = Events.specials.find(e => e.id === 'comet-hunt');
const day = (n) => event.from + n * 86400e3 + 3600e3; // (an hour into day n of the event)
const at = (t) => { Events.now = () => t; };
const state = (i) => Events.state(event, i);
// a stage delivered: started (its car as the menu puts it in), and finished on time straight away
const deliver = (i) => {
  const level = event.stages[i].level;
  levels.selectSpecial(level);
  cars.useLevelCar(level.car, level.amphibious);
  Game.evil = false;
  if (!Game.canStart) return 'not started (' + cars.CAR.id + ')';
  Game.start();
  Game.finish('delivered');
  Game.toMenu();
  return cars.CAR.id;
};

try {
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1;
  check(Events.problems().length === 0, 'events.json sound: ' + (Events.problems().join('; ') || 'yes'));
  check(event && event.stages.length === 4 && STAGE_LEVELS.length >= 4, 'The Comet Hunt: 4 stages');
  const [s1, s2, s3] = event.stages;
  check(s1.level.id === 'comet-hunt-1' && s1.level.stage.map === 'farm' && s2.level.clock.good === 150 && s2.level.allowedCars?.cars[0] === 'lovebus' && !s2.level.car
    && s3.level.car === 'silvercomet' && !s3.level.allowedCars, 'each stage a level of its own: its id, its map, its clock, its car (needed: a list; lent: a lock)');
  check(levels.levelName(s2.level) === levels.levelName(levels.LEVELS.find(l => l.id === 'suburbs')), "...with its map's name (" + levels.levelName(s2.level) + ')');

  // before the event, and day by day
  at(event.from - 3600e3);
  check(!Events.live(event) && !state(0).open && /Starts/.test(state(0).why), 'an hour before the event: nothing open (' + state(0).why + ')');
  at(day(0));
  check(state(0).open && !state(1).open && /Opens/.test(state(1).why), 'day 1: stage 1 open; stage 2 not yet (' + state(1).why + ')');
  at(day(1));
  check(!state(1).open && /Finish stage 1/.test(state(1).why), 'day 2, stage 1 not done: stage 2 waits for it (' + state(1).why + ')');
  const bank = Progress.data.money;
  check(deliver(0) === 'commuter' && Events.done(event) === 1 && Progress.data.money > bank && Progress.bestTime('comet-hunt-1', false) !== undefined && Progress.bestTime('farm', false) === undefined,
    'stage 1 delivered in any car (the Commuter): done, its tip banked, its best time its own (not the Farm\'s)');
  check(deliver(0) === 'commuter' && Events.done(event) === 1, '...delivered again: still one done (its tip paid again, as any level\'s)');
  // TANK RAGE is off in a stage: no targets, no pieces, the player's own neither used nor lost
  const { Targets } = await g.load('pickups.js');
  Progress.data.tankPieces = 3;
  levels.selectSpecial(s1.level); cars.useLevelCar(null, false);
  Game.start();
  const offInRun = s1.level.noTankRage && Targets.items.length === 0 && Game.tankPieces === 0;
  Game.finish('delivered'); Game.toMenu();
  check(offInRun && Progress.data.tankPieces === 3 && (levels.LEVELS.find(l => l.id === 'farm').targets || []).length > 0,
    'no TANK RAGE in a stage: no targets (the Farm has them), the run starts with no pieces, the save\'s 3 untouched after it');
  // stage 2 needs the Love Bus, owned
  check(state(1).open && state(1).needs?.id === 'lovebus' && deliver(1).startsWith('not started'), 'stage 2 needs the Love Bus: open, but no car to start in (' + state(1).why + ')');
  Progress.data.cars.push('lovebus');
  check(!state(1).needs && deliver(1) === 'lovebus' && Events.done(event) === 2, 'the Love Bus owned: stage 2 driven in it, done');
  // stage 3 lends the Silver Comet, not owned: a free try
  at(day(2));
  check(state(2).open && !Progress.owns('silvercomet') && deliver(2) === 'silvercomet' && Events.done(event) === 3, 'day 3: stage 3 a free try in the Silver Comet, not owned: done');
  // stage 4 needs the Tow Truck: a blue tier the player has not reached, not for sale
  at(day(3));
  check(state(3).open && state(3).needs?.id === 'towtruck' && !cars.forSale(cars.carById('towtruck')) && deliver(3).startsWith('not started'),
    'day 4: stage 4 needs the Tow Truck, not for sale to this player: stopped there (' + state(3).why + ')');
  at(day(10));
  check(state(3).open && Events.done(event) === 3 && !Progress.owns('silvercomet'), 'a week on: still stopped there, the event still on, no prize');
  // got it later (here, given): on from there, and the prize, once
  Progress.data.cars.push('towtruck');
  check(deliver(3) === 'towtruck' && Events.done(event) === 4 && Events.prizeWon(event) && Progress.owns('silvercomet'), 'the Tow Truck got before the end: stage 4 done, and the Silver Comet won');
  const owned = Progress.data.cars.length, claims = Progress.data.claimed.length;
  deliver(3);
  check(Progress.data.cars.length === owned && Progress.data.claimed.length === claims, 'delivered again: no second prize');
  check(Progress.importCode(Progress.exportCode()) && Progress.data.events['comet-hunt'] === 4 && Progress.owns('silvercomet'), 'the save code keeps the stages done and the prize');
  Progress.noSave = true;
  // the event over
  at(event.to + 1);
  check(!Events.live(event) && [0, 1, 2, 3].every(i => !state(i).open && /over/.test(state(i).why)) && Events.done(event) === 4 && Progress.owns('silvercomet'),
    'the event over: every stage shut ("' + state(0).why + '"), what was done kept, the Silver Comet kept');
  check(!Events.liveSpecials().length && !Tiers.isOpen(s1.level), '...and off the menu');
  // a stage is recorded, and plays back, as a level of its own
  at(day(5));
  levels.selectSpecial(s1.level); cars.useLevelCar(null, false);
  Game.start();
  for (let i = 0; i < 600; i++) Game.update(1 / 120);
  Game.toMenu();
  const rec = Replay.last;
  check(rec?.header.level === 'comet-hunt-1' && Replay.check(rec).ok && Replay.watch(rec).ok && levels.LEVEL === s1.level, 'a stage\'s run recorded as the stage, and played back on it');
  Game.toMenu();
  // a player who never got the Tow Truck: their event is over when the clock is
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1; Progress.data.cars.push('lovebus');
  at(day(3));
  for (const i of [0, 1, 2]) deliver(i);
  at(event.to + 1);
  check(Events.done(event) === 3 && !Events.prizeWon(event) && !Progress.owns('silvercomet'), 'another player, stopped at stage 4 to the end: three done, no prize');
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);
