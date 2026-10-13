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
  if (i > 3) at(day(i)); // (each later stage on its own day)
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
  check(event && event.stages.length === 8 && STAGE_LEVELS.length >= 8, 'The Comet Hunt: 8 stages');
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
  check(deliver(3) === 'towtruck' && Events.done(event) === 4 && !Events.prizeWon(event), 'the Tow Truck got before the end: stage 4 done, on from there');
  // the rest: 5 needs the Sportscompact, 6 lends the Hell Rod, 7 any car, 8 needs the Junker
  Progress.data.cars.push('sport', 'junker');
  check([4, 5, 6, 7].map(deliver).join() === 'sport,hellrod,commuter,junker' && Events.done(event) === 8 && Events.prizeWon(event) && Progress.owns('silvercomet'),
    'stages 5 to 8 (the Sportscompact, the Hell Rod lent, any car, the Junker): all done, and the Silver Comet won');
  const owned = Progress.data.cars.length, claims = Progress.data.claimed.length;
  deliver(3);
  check(Progress.data.cars.length === owned && Progress.data.claimed.length === claims, 'delivered again: no second prize');
  check(Progress.importCode(Progress.exportCode()) && Progress.data.events['comet-hunt'] === 8 && Progress.owns('silvercomet'), 'the save code keeps the stages done and the prize');
  Progress.noSave = true;
  // the event over
  at(event.to + 1);
  check(!Events.live(event) && [0, 1, 2, 3, 7].every(i => !state(i).open && /over/.test(state(i).why)) && Events.done(event) === 8 && Progress.owns('silvercomet'),
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
  carHunt();
  await conceptStrike();
} catch (error) {
  failures++;
  console.log(error.stack);
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
await g.close();
process.exit(failures ? 1 : 0);

// THE CAR HUNT (the owner, 13-Oct): a RECURRING event (events.json repeat { every: 7, live: 3 }: on 3 days of every 7 from
// its `from`), listed between its runs ("Next in"), its one stage Back Roads on a 300 s TEST clock both sides, driven only
// in a 3-star car (allowedCars tiers [3], both sides); EVERY delivery while it is on, Good or Evil, gives one Car Hunt pack
// (no first-time rule, no cap, no claimed-once mark); none between runs; its runs recorded as replays of the stage
function carHunt() {
  const hunt = Events.specials.find(e => e.id === 'car-hunt');
  check(!!hunt && hunt.repeat?.every === 7 && hunt.repeat?.live === 3 && hunt.stages.length === 1 && hunt.to === null, 'the Car Hunt: recurring, on 3 days every 7, one stage, no end');
  if (!hunt) return;
  const H = 3600e3, D = 86400e3, from = hunt.from;
  const comet = Events.specials.find(e => e.id === 'comet-hunt');
  // the windows, by a fake clock
  const W = (t) => Events.window(hunt, t);
  const runs = [0, 7, 14, 70].map(k => from + k * D);
  check(runs.every(t => Events.live(hunt, t + H) && Events.live(hunt, t + 3 * D - H)) && runs.every(t => !Events.live(hunt, t + 3 * D + H) && !Events.live(hunt, t + 7 * D - H)),
    'on from its start for 3 days, off for 4, again every 7 days (runs 1, 2, 3 and 11 tried)');
  const day2 = from + D + 5 * H, c1 = Events.countdownOf(hunt, day2);
  check(c1?.words === 'Ends in' && Math.abs(c1.at - (from + 3 * D)) < 2 * H && W(day2).live, 'live: "Ends in", counting to the end of the run (' + new Date(c1?.at).toString().slice(0, 21) + ')');
  const day5 = from + 4 * D + 5 * H, c2 = Events.countdownOf(hunt, day5);
  check(c2?.words === 'Next in' && Math.abs(c2.at - (from + 7 * D)) < 2 * H && !W(day5).live, 'between runs: "Next in", counting to the next run (' + new Date(c2?.at).toString().slice(0, 21) + ')');
  const before = Events.countdownOf(hunt, from - D);
  check(before?.words === 'Next in' && before.at === from && !Events.live(hunt, from - D), 'before its first run: "Next in" its first run');
  check(Events.shownSpecials(day5).includes(hunt) && !Events.liveSpecials(day5).includes(hunt) && Events.liveSpecials(day2).includes(hunt), 'between runs it is still listed on the menu (shownSpecials), not live');
  check(!Events.state(hunt, 0, day5).open && /^Back /.test(Events.state(hunt, 0, day5).why) && Events.state(hunt, 0, day2).open, 'its stage is shut between runs ("' + Events.state(hunt, 0, day5).why + '"), open in one');
  check(Events.live(comet, comet.from + H) && !Events.live(comet, comet.to + H) && Events.countdownOf(comet, comet.from + H)?.at === comet.to && Events.window(comet) === null,
    'the Comet Hunt (one-off) keeps its window rules: on from its from to its to, "Ends in" its end, no runs');
  // the stage: Back Roads, 300 s both sides (a test cap), 3-star cars only, both sides
  const level = hunt.stages[0].level;
  check(level.id === 'car-hunt-1' && level.stage.map === 'back-roads' && level.clock.good === 300 && level.clock.evil === 300, 'its stage: Back Roads as car-hunt-1, on a 300 s clock both sides (the TEST cap)');
  levels.selectSpecial(level);
  const rules = [false, true].map(evil => cars.carRule(evil));
  const blower = cars.carById('blower'), three = cars.CARS.find(c => cars.carTier(c) === 3), two = cars.CARS.find(c => cars.carTier(c) === 2), blue3 = cars.CARS.find(c => cars.carTier(c) === 8);
  check(rules.every(r => r?.list && cars.ruleAllows(r, blower) && cars.ruleAllows(r, three) && !cars.ruleAllows(r, two) && (!blue3 || !cars.ruleAllows(r, blue3))),
    'its car rule, both sides: 3 gold-star cars (and 3-star blueprint cars: the Blower), not 2-star, not 3 blue (' + rules[0]?.label + ')');
  // every delivery while it is on gives a pack, Good or Evil, again and again
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1; Progress.data.cars.push(three.id);
  const P = Progress, run = (evil) => {
    levels.selectSpecial(level);
    Game.evil = evil;
    cars.useLevelCar(level.car, level.amphibious);
    if (!Game.canStart) return 'no start (' + cars.CAR.id + ')';
    Game.start();
    const clock = Game.allowed;
    Game.finish('delivered');
    Game.toMenu();
    return clock;
  };
  at(day2);
  const clocks = [false, false, false, true, true].map(run);
  const held = () => (P.data.packs || {})['car-hunt-special'] || 0;
  check(clocks.every(c => c === 300) && held() === 5, 'five deliveries in a run (three Good, two Evil), each on a 300 s clock: five Car Hunt packs (' + held() + ', clocks ' + clocks.join(' ') + ')');
  check(!(P.data.claimed || []).some(k => /car-hunt/.test(k)) && Events.done(hunt) === 1, 'no claimed-once mark for it; the stage counts as done once, and stays open');
  const rec = Replay.last;
  check(rec?.header.level === 'car-hunt-1' && Replay.check(rec).ok, 'a run recorded as the stage (car-hunt-1), its replay sound');
  const direct = Events.delivered(level);
  check(direct?.repeat && direct.packs.join() === 'Car Hunt pack' && held() === 6, 'Events.delivered says it: a recurring run, "Car Hunt pack" given (the results: "A Car Hunt pack!")');
  at(day5);
  run(false);
  check(held() === 6 && Events.delivered(level) === null, 'between runs: a delivery gives nothing (the menu shuts the stage: Events.isOpen ' + Events.isOpen(level) + ')');
  at(from + 7 * D + H);
  run(true);
  check(held() === 7, 'the next run: a pack again (' + held() + ')');
}

// THE CONCEPT STRIKE (the owner, 13-Oct; CHECKLIST 211): a ROTATING event, Monday to Saturday (repeat { every: 7, live: 6 }
// from Monday 12 Oct 2026, `days`), each day its own run: its featured concept car (a free try at the player's own ECU),
// its tasks (each paid up to its limit a day, the counters starting again the next day), its pack (packs.json
// concept-strike-<day>, featuring the day's car); the featured car delivered at its max ECU gives its key. Every weekday
// tried by a fake clock, Sunday too, in the first run and a later one.
async function conceptStrike() {
  const strike = Events.specials.find(e => e.id === 'concept-strike');
  const { Ecu } = await g.load('ecu.js');
  const { featuredOf } = await g.load('packs.js');
  check(!!strike && strike.repeat?.every === 7 && strike.repeat?.live === 6 && strike.days?.length === 6 && strike.stages.length === 1 && strike.to === null,
    'the Concept Strike: rotating, 6 days of every 7, one stage, no end');
  if (!strike) return;
  const H = 3600e3, D = 86400e3, from = strike.from;
  check(new Date(from).getDay() === 1 && new Date(from).getHours() === 0, 'its first run starts on a Monday, at midnight on the device (' + new Date(from).toString().slice(0, 24) + ')');
  const level = strike.stages[0].level;
  const firstTry = Events.freeTry(strike, from + 2 * D + 5 * H); // (before anything has set it: as a fresh visit has it)
  check(firstTry?.on === true && firstTry.car.id === 'sixteen' && firstTry.ecu === 1, 'the free try is ON by default while a day is live (the owner, 13-Oct): Wednesday the Sixteen, ECU ' + firstTry?.ecu);
  check(level.id === 'concept-strike-1' && level.stage.map === 'back-roads' && level.clock.good === 300 && level.clock.evil === 300 && !level.allowedCars && !level.car,
    'its stage: Back Roads as concept-strike-1, a 300 s TEST clock both sides, any car (no car rule, no lock)');
  const want = [['fishbowl', 2, 4, 'Mon', 2], ['midsummer', 3, 3, 'Tue', 2], ['sixteen', 4, 3, 'Wed', 3], ['quadturbo', 5, 3, 'Thu', 4], ['knifeedge', 5, 3, 'Fri', 5], ['windsong', 5, 3, 'Sat', 5]] // (the last: task 1's stars; the owner, 13-Oct, Tue, Wed, Thu one star below the day's car);
  const prev = [null, 'fishbowl', 'midsummer', 'sixteen', 'quadturbo', 'knifeedge'];
  for (const week of [0, 3]) for (let d = 0; d < 7; d++) {
    const t = from + (week * 7 + d) * D + 5 * H, name = new Date(t).toString().slice(0, 3), day = Events.dayOf(strike, t), c = Events.countdownOf(strike, t);
    if (d === 6) {
      check(name === 'Sun' && !Events.live(strike, t) && !day.live && day.car === 'fishbowl' && c?.words === 'Next in' && new Date(c.at).getDay() === 1 && Math.abs(c.at - (t + D - 5 * H)) < 2 * H
        && Events.shownSpecials(t).includes(strike) && Events.state(strike, 0, t).why === 'Back Monday' && Events.tasksLeft(strike, t) === 0,
        'week ' + (week + 1) + ' Sun: no event (listed, shut, "' + Events.state(strike, 0, t).why + '"), Next in Monday (the Fishbowl)');
      continue;
    }
    const [car, stars, n, wd, task1] = want[d], tasks = Events.tasks(strike, t), C = g.cars.carById(car);
    const shape = tasks.length === n && tasks[0].task.stars === task1 && tasks[0].task.packs === 1 && tasks[0].limit === 3
      && (d === 0 ? tasks[1].task.side === 'good' && tasks[2].task.side === 'evil' && tasks[1].task.stars === 2 && tasks[2].task.stars === 2 : tasks[1].task.car === prev[d] && tasks[1].task.packs === 2 && tasks[1].limit === 3)
      && tasks[n - 1].task.key && tasks[n - 1].task.maxed && tasks[n - 1].task.featured && tasks[n - 1].limit === 1;
    check(name === wd && Events.live(strike, t) && day.live && day.car === car && C?.concept && C.rating === stars && day.pack === 'concept-strike-' + (d + 1)
      && featuredOf(day.pack).every(f => f.car.id === car) && c?.words === 'Ends in' && Math.abs(c.at - (t + D - 5 * H)) < 2 * H && Events.state(strike, 0, t).open && shape,
      'week ' + (week + 1) + ' ' + wd + ': ' + C?.name + ' (' + stars + ' stars), its pack ' + day.pack + ', Ends in at midnight, ' + tasks.map(x => x.words + ' (' + x.reward + ' x' + x.limit + ')').join('; '));
  }
  // playing it: Monday of the third run
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1;
  const two = g.cars.CARS.find(c => g.cars.carTier(c) === 2), three = g.cars.CARS.find(c => g.cars.carTier(c) === 3);
  Progress.data.cars.push(two.id, three.id);
  const P = Progress, held = (k) => (P.data.packs || {})['concept-strike-' + k] || 0;
  const run = (evil, carId = null) => {
    if (carId) { P.data.car = carId; Events.pickFor(level, carId); } // (a car picked: the showroom's Drive, which turns the free try off for another car)
    Events.syncTry(strike);
    levels.selectSpecial(level);
    Game.evil = evil;
    g.cars.useLevelCar(level.car, level.amphibious);
    if (!Game.canStart) return 'no start';
    Game.start();
    const clock = Game.allowed, driven = g.cars.CAR.id, ecu = g.cars.carStats(g.cars.CAR)?.ecu;
    Game.finish('delivered');
    Game.toMenu();
    return { clock, driven, ecu };
  };
  const mon = from + 14 * D + 5 * H;
  at(mon);
  const goods = [1, 2, 3].map(() => { run(false, two.id); return held(1); });
  check(goods.join() === '2,4,6', 'Monday, a 2-star car as Good: tasks 1 and 2 pay a pack each (' + goods.join(', ') + ' held)');
  const evils = [1, 2, 3].map(() => { run(true, two.id); return held(1); });
  check(evils.join() === '7,8,9', '...as Evil: task 3 only, task 1 at its limit of 3 (' + evils.join(', ') + ')');
  run(false, two.id); run(true, two.id);
  check(held(1) === 9 && Events.tasks(strike).slice(0, 3).every(x => x.done && x.count === 3), 'every pack task at its limit: nothing more this run (9 packs)');
  run(false, three.id);
  check(held(1) === 9, 'a 3-star car on Monday pays nothing');
  // the free try: the Fishbowl lent at the player's own ECU (none: ECU1); not maxed, so no key
  Events.setFreeTry(strike, true);
  const tryRun = run(false);
  check(tryRun.driven === 'fishbowl' && tryRun.ecu === 1 && !P.owns('fishbowl') && Events.freeTry(strike)?.ecu === 1, 'the free try: the Fishbowl lent, driven at ECU1 (no blueprints), no key (' + JSON.stringify(tryRun) + ')');
  Ecu.addBlueprints('fishbowl', 10);
  check(run(false).ecu === 3 && !P.owns('fishbowl'), '10 blueprints: the free try drives at ECU3; still no key');
  Ecu.addBlueprints('fishbowl', 10);
  const maxed = run(true);
  check(maxed.ecu === Ecu.max(g.cars.carById('fishbowl')) && P.owns('fishbowl') && Events.tasks(strike)[3].done, '20 blueprints: at its max ECU (' + maxed.ecu + ') the free try delivered gives the Fishbowl\'s KEY');
  Events.setFreeTry(strike, false);
  check(!level.car && !level.ownEcu, 'the free try off: no car lock again');
  // Tuesday: the counters start again; the Fishbowl (now owned) pays 2 packs, 3 times
  at(mon + D);
  check(Events.tasks(strike).every(x => x.count === 0) && Events.dayOf(strike).car === 'midsummer', 'Tuesday: a new run, every counter at 0, the Midsummer Roadster featured');
  run(false, two.id);
  const fish = [1, 2, 3, 4].map(() => { run(false, 'fishbowl'); return held(2); });
  check(held(1) === 9 && fish.join() === '4,7,9,9', 'Tuesday: a 2-star car 1 pack; the Fishbowl (2 stars too) 2 packs a time, 3 times, and 1 more from task 1 while it has room (' + fish.join(', ') + ' Midsummer packs held)');
  check(JSON.stringify(P.data.eventRuns['concept-strike']) === JSON.stringify({ day: new Date(mon + D - 5 * H).toISOString().length && Events.window(strike).start && (() => { const x = new Date(Events.window(strike).start); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })(), n: [3, 3, 0] }),
    'the save holds the run\'s counters: ' + JSON.stringify(P.data.eventRuns['concept-strike']));
  // a 5-star day (Saturday): any 5-star car, the Knife-Edge, the Wind-Song's key
  at(mon + 5 * D);
  check(Events.dayOf(strike).car === 'windsong' && Events.tasks(strike)[1].task.car === 'knifeedge', 'Saturday: the Wind-Song Racer, task 2 the Knife-Edge');
  Events.setFreeTry(strike, true);
  const sat = run(false);
  check(sat.driven === 'windsong' && held(6) === 1 && !P.owns('windsong'), 'Saturday: the free try (5 stars) pays task 1: a Wind-Song Strike pack');
  Events.setFreeTry(strike, false);
  // Sunday: nothing
  at(mon + 6 * D);
  const before = JSON.stringify(P.data.packs);
  run(false, two.id);
  check(JSON.stringify(P.data.packs) === before && Events.delivered(level, { car: two, ecu: 1, evil: false }) === null, 'Sunday: a delivery pays nothing (no run on)');
  // the counters survive a save code
  at(mon + 5 * D); // (Saturday's run: its counters are the save's now, Tuesday's gone)
  P.noSave = false; P.save(); const code = P.exportCode(); P.data.eventRuns = {}; P.importCode(code);
  check(P.data.eventRuns?.['concept-strike']?.n?.join() === '1,0,0' && Events.tasks(strike)[0].count === 1, 'the counters come back through a save code (Export / Import save): ' + JSON.stringify(P.data.eventRuns));
  await strikeShowroom(strike, level, from);
  await strikeFreeTry(strike, level, from);
}

// THE CONCEPT STRIKE IN THE SHOWROOM (the owner, 13-Oct: "Concept Strike should filter the showroom to the stars requirement
// AND the free try car"): clicking in from the stage, the showroom's imposed filter lets by EXACTLY the cars of task 1's
// stars (events.js starsOf: gold tier and Blueprint cars, key cars by rating), the day's featured car (owned or not: lent),
// and task 2's car (the day before's) if owned (else only by its stars); every weekday of a later run, by the fake clock; Sunday nothing.
// A VIEW: the stage's car rule stays none (any car the player owns may still be driven)
async function strikeShowroom(strike, level, from) {
  const { showroomCars, carCard, imposedFilter, filterCards } = await g.load('showroomData.js');
  const { starsOf } = await g.load('events.js');
  const D = 86400e3, mon = from + 21 * D + 5 * 3600e3;
  levels.selectSpecial(level);
  Events.setFreeTry(strike, false);
  const owned = (id) => Progress.owns(id);
  for (let d = 0; d < 7; d++) {
    at(mon + d * D);
    const name = new Date(Events.now()).toString().slice(0, 3), day = Events.dayOf(strike), focus = g.cars.carFocus();
    if (d === 6) {
      check(name === 'Sun' && focus === null && g.cars.carRule(false) === null, 'showroom, Sun: nothing imposed (no run on)');
      continue;
    }
    const stars = day.tasks[0].stars, prevCar = day.tasks.find(x => x.car)?.car || null;
    const floor = showroomCars().map(car => carCard(car, false));
    const forced = focus && imposedFilter({ list: true, test: focus.test }, floor, 'event');
    const got = forced ? filterCards(floor, forced, null).map(c => c.id) : [];
    const want = floor.filter(c => starsOf(c.car) === stars || c.id === day.car || (c.id === prevCar && owned(prevCar))).map(c => c.id);
    const nStar = floor.filter(c => starsOf(c.car) === stars).length, bp = floor.filter(c => c.blueprint && starsOf(c.car) === stars).length;
    check(name === ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] && got.length === want.length && want.every(id => got.includes(id)) && got.includes(day.car)
      && (!prevCar || got.includes(prevCar) === (owned(prevCar) || starsOf(g.cars.carById(prevCar)) === stars)) && g.cars.carRule(false) === null && g.cars.carRule(true) === null,
      'showroom, ' + name + ': exactly ' + got.length + ' cars (' + nStar + ' of ' + stars + ' stars, ' + bp + ' of them Blueprint cars; the ' + day.car + ' free try'
      + (prevCar ? '; the ' + prevCar + (owned(prevCar) ? ' owned: in' : starsOf(g.cars.carById(prevCar)) === stars ? ' not owned, in by its stars' : ' not owned: out') : '') + '), filter ' + JSON.stringify({ stars: forced?.stars, colour: forced?.colour, state: forced?.state })
      + ', "' + focus?.label + '"; no car rule (any car still drivable)');
  }
}

// THE FREE TRY, END TO END (the owner, 13-Oct: "Concept Strike doesn't actually give the Free Try car"; "the idea is that
// players ECU up the car they don't own, and only get the key when they max it out"): on every weekday of a later run, from a
// fresh save (the starter only, no blueprints), the day's car is lent by default: the stage's car lock, the showroom's card
// drivable ('Free try · ECU 1/5', no lock overlay), its Drive keeps it lent (nothing owned, nothing saved as the pick), and
// the run starts in it at ECU1; Drive on the player's own car turns the try off (the run in their car), the day's car's
// Drive back on. Then the chain on a Monday: the day's packs' blueprints raise the ECU of the car not owned (1 + a step
// each 5), each step driven as the free try; below the max no key; delivered at ECU5 its key, the car owned, its card no
// longer lent but the player's own (driven at its own ECU5). The Car Hunt is untouched (its stage never lent).
async function strikeFreeTry(strike, level, from) {
  const { showroomCars, carCard, driveAs, driveWords, overlayOf, imposedFilter, filterCards } = await g.load('showroomData.js');
  const { Ecu } = await g.load('ecu.js');
  const { Packs } = await g.load('packs.js');
  const D = 86400e3, mon = from + 28 * D + 5 * 3600e3, P = Progress;
  // a run started as the menu's Start does (the car lock as the menu draws it), finished delivered
  const start = (evil = false) => {
    Events.syncTry(strike);
    levels.selectSpecial(level);
    Game.evil = evil;
    g.cars.useLevelCar(level.car, level.amphibious);
    if (!Game.canStart) return { driven: 'no start' };
    Game.start();
    const out = { driven: g.cars.CAR.id, ecu: g.cars.carStats(g.cars.CAR)?.ecu, speed: g.cars.carStats(g.cars.CAR)?.maxSpeed };
    Game.finish('delivered');
    Game.toMenu();
    return out;
  };
  for (let d = 0; d < 6; d++) {
    at(mon + d * D);
    P.reset(); P.noSave = true; P.data.tierBase = 1;
    Events.setFreeTry(strike, true); // (a fresh visit: the default, checked above)
    levels.selectSpecial(level);
    Events.syncTry(strike);
    const day = Events.dayOf(strike), car = g.cars.carById(day.car), wd = new Date(Events.now()).toString().slice(0, 3);
    const card = carCard(car, false), focus = g.cars.carFocus();
    const shown = focus ? filterCards(showroomCars().map(c => carCard(c, false)), imposedFilter({ list: true, test: focus.test }, showroomCars().map(c => carCard(c, false)), 'event'), null).map(c => c.id) : [];
    check(level.car === day.car && level.ownEcu && !P.owns(day.car) && card.state === 'ready' && card.lent?.ecu === 1 && card.lent.max === 5 && !card.unlocked && overlayOf(card) === null
      && /Free try/.test(driveWords(card, false)) && shown.includes(day.car),
      wd + ' (fresh save): the ' + car.name + ' lent by default (the stage’s lock), its showroom card drivable "' + driveWords(card, false) + '" at ECU ' + card.lent?.ecu + '/' + card.lent?.max + ', no lock overlay, in the day’s view');
    const picked = driveAs(card, false);
    const r = start();
    check(picked && !P.owns(day.car) && P.data.car === 'commuter' && r.driven === day.car && r.ecu === 1 && Math.abs(r.speed - Ecu.stats(car, 1).maxSpeed) < 1e-9 && !P.owns(day.car),
      wd + ': its Drive keeps it lent (not owned, the pick still the commuter) and Start drives the ' + car.name + ' at ECU1 (' + r.speed + ' m/s, maxed ' + Ecu.stats(car, 5).maxSpeed + '); delivered, no key');
    driveAs(carCard(g.cars.carById('commuter'), false), false);
    const own = start();
    check(own.driven === 'commuter' && !level.car && !Events.freeTry(strike).on, wd + ': Drive on the commuter turns the free try off: the run in the commuter, no car lock');
    driveAs(carCard(car, false), false);
    check(Events.freeTry(strike).on && level.car === day.car && start().driven === day.car, wd + ': Drive on the ' + car.name + ' again: the free try back on, the run in it');
  }
  // THE CHAIN, a Monday (the Fishbowl): blueprints from its packs -> ECU of a car not owned -> driven at it -> key at ECU5
  at(mon + 7 * D);
  P.reset(); P.noSave = true; P.data.tierBase = 1;
  Events.setFreeTry(strike, true);
  const fish = g.cars.carById('fishbowl');
  const seen = [];
  let opened = 0, seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  while (Ecu.blueprints('fishbowl') < 20 && opened < 400) {
    Packs.open('concept-strike-1', { free: true, random });
    opened++;
    const ecu = Ecu.reached(fish);
    if (!seen.length || seen[seen.length - 1].ecu !== ecu) {
      const r = start(), c = carCard(fish, false);
      seen.push({ ecu, bp: Ecu.blueprints('fishbowl'), driven: r.ecu, card: c.lent?.ecu, owned: P.owns('fishbowl') });
    }
  }
  const below = seen.filter(x => x.ecu < 5);
  check(seen.length >= 5 && seen.map(x => x.ecu).join() === '1,2,3,4,5'.slice(0, seen.length * 2 - 1) && seen.every(x => x.driven === x.ecu && (x.ecu === 5 || x.card === x.ecu)) && below.every(x => !x.owned),
    'the chain: the Fishbowl Strike packs’ blueprints raise the ECU of the Fishbowl NOT owned (' + seen.map(x => 'ECU' + x.ecu + ' at ' + x.bp + ' bp').join(', ') + ', ' + opened + ' packs), each step driven as the free try and shown lent at it; below ECU5 no key');
  const top = seen[seen.length - 1];
  check(top?.ecu === 5 && top.owned && P.owns('fishbowl') && Events.tasks(strike)[3].done, 'delivered at ECU5 (maxed by blueprints) the free try gives the Fishbowl’s KEY: the car owned');
  const ownCard = carCard(fish, false);
  driveAs(ownCard, false);
  const after = start();
  check(ownCard.unlocked && !ownCard.lent && ownCard.state === 'ready' && after.driven === 'fishbowl' && after.ecu === 5 && P.owns('fishbowl'),
    'after the key: its card the player’s own (not lent), driven at its own ECU5');
  // the Car Hunt: its stage never lent (no free try), the showroom's cards as ever
  const hunt = Events.specials.find(e => e.id === 'car-hunt'), hl = hunt?.stages[0].level;
  if (hl) {
    levels.selectSpecial(hl);
    const blower = g.cars.carById('blower');
    check(Events.lentFor(hl, blower) === null && Events.freeTry(hunt) === null && !hl.car && carCard(blower, false).lent === null,
      'the Car Hunt: no free try, its stage never lent, the Blower’s card not lent');
    Events.pickFor(hl, 'commuter');
    check(Events.freeTry(strike).on, '...and a pick on the Car Hunt’s stage leaves the Concept Strike’s free try alone');
  }
  levels.selectSpecial(level);
}
