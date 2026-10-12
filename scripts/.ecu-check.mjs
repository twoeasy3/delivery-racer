// A check of the ECUs (src/delivery/ecu.js, ecus.json; BLUEPRINTS-NOTES.md, CHECKLIST item 115): the ladder's max ECU of
// each car, the equal steps from the maxed figures, the respawn time of each ECU, the unlock rules (a key car: its key; a
// blueprint car: X blueprints), the save round trip (the save code and the stored save), an old save's defaults (every
// car it owns at its max ECU, a blueprint car it does not own locked), the figures a run drives with and its respawn
// time, races and Car Swap untouched, and a replay recorded at an ECU played back identically (at that ECU, whatever the
// save says by then), an old one (no ECU in its header) at the max. The second set (CHECKLIST item 125): agility, delivery,
// cool and crossing by the same equal steps (a higher ECU never worse; the max = today's figures), weight flat; the
// player's car takes them at its ECU (Player.agility / crossing / mass / delivery / cool, Social.dangerTime); a flaming
// package's damage and a gift's standing scale with delivery; a shoulder run busts sooner at ECU1 than at the max.
//   node scripts/.ecu-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ tiers: false }); // (tiers off: a tier level would put the player in its tier's car)
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Ecu, LADDER, STEPS, RESPAWN, NEW_STATS, DELIVERY } = await g.load('ecu.js');
  const { Social } = await g.load('social.js');
  const { Packages } = await g.load('packages.js');
  const { Replay } = await g.load('replay.js');
  const ECUS = Ecu.table;
  const { Progress } = await g.load('progress.js');
  const { CARS, EARNED_CARS, EVENT_CARS, FILLER_CARS, carById, selectCar, garageCars, carStats } = g.cars;
  const { Game, Player, Input, CONFIG: C } = g;
  const { LEVELS } = g.levels;
  const car = (id) => carById(id);

  // ---- the ladder
  const roster = [...CARS, ...FILLER_CARS, ...EVENT_CARS, ...(g.cars.BESPOKE_CARS || []), ...EARNED_CARS];
  check(roster.every(c => ECUS[c.id]), 'every roster car has its ECUs in ecus.json (' + roster.length + ' cars; ' + Object.keys(ECUS).length + ' entries)');
  const off = roster.filter(c => Ecu.max(c) !== Ecu.ladder(c));
  check(!off.length, 'each car\'s max ECU in the file is the ladder\'s' + (off.length ? ': NOT ' + off.map(c => c.id).join(', ') : ''));
  const want = { commuter: 1, junker: 1, darkvan: 1, lovebus: 2, sport: 2, hearse: 3, hotrod: 3, taxi: 4, miata: 4, muscle: 5, evsaloon: 5,
    postvan: 3, mini: 3, hothatch: 4, ute: 4, sleeper: 5, rally: 5, gullwing: 5, snake: 5, classicgt: 5, sixbysix: 5,
    hellrod: 1, 'earned-ufo': 1, showdown: 1, bubble: 1, milkfloat: 1, woody: 2, pony: 4, midnight: 5, jetcar: 5, silvercomet: 5, tank: 1 };
  const wrong = Object.entries(want).filter(([id, n]) => Ecu.max(car(id)) !== n);
  check(!wrong.length, 'the ladder: gold 1 to 5 stars max ECU1 to ECU5, blue 1 to 5: 3, 4, 5, 5, 5; special (earned) cars 1; a 1-gold blueprint car 1' +
    (wrong.length ? ': NOT ' + wrong.map(([id, n]) => id + ' ' + Ecu.max(car(id)) + ' (want ' + n + ')').join(', ') : ''));
  check(JSON.stringify(LADDER.gold) === '{"1":1,"2":2,"3":3,"4":4,"5":5}' && JSON.stringify(LADDER.blue) === '{"1":3,"2":4,"3":5,"4":5,"5":5}', 'the ladder table as decided');
  check(Ecu.rarity(car('commuter')) === null && Ecu.rarity(car('sport')) === 'common' && Ecu.rarity(car('muscle')) === 'uncommon' && Ecu.rarity(car('postvan')) === 'uncommon' &&
    Ecu.rarity(car('gullwing')) === 'epic' && Ecu.rarity(car('pony')) === 'epic' && Ecu.rarity(car('jetcar')) === 'legendary' && Ecu.rarity(car('hellrod')) === null,
  'card rarity: none for a 1-gold key car or a special car, common 2-4 gold, uncommon 5 gold and 1-3 blue, epic 4-5 blue, the evergreen cars their own (epic; legendary for three)');

  // ---- equal steps from the maxed figures, and the respawn of each ECU
  const bad = [], respawnBad = [];
  for (const c of roster) {
    const list = ECUS[c.id].ecus, n = list.length, f = CARS.includes(c) ? STEPS.lot : STEPS.blueprint;
    const top = list[n - 1];
    if (top.maxSpeed !== c.maxSpeed || top.accel !== c.accel || top.health !== c.health) bad.push(c.id + ' max ECU is not its figures');
    list.forEach((e, i) => {
      const m = 1 - f * (n - (i + 1));
      if (Math.abs(e.maxSpeed - c.maxSpeed * m) > 0.051 || Math.abs(e.accel - c.accel * m) > 0.051 || Math.abs(e.health - c.health * m) > 0.51) bad.push(c.id + ' ECU' + (i + 1));
      if (e.respawn !== RESPAWN.first - RESPAWN.step * i) respawnBad.push(c.id + ' ECU' + (i + 1) + ' ' + e.respawn);
      if (i && !(e.maxSpeed > list[i - 1].maxSpeed && e.respawn < list[i - 1].respawn)) bad.push(c.id + ' ECU' + (i + 1) + ' not above ECU' + i);
    });
  }
  check(!bad.length, 'equal steps: ECU k of N = max x (1 - f (N - k)), f ' + STEPS.lot + ' (car lot) / ' + STEPS.blueprint + ' (blueprint, event); the max ECU = today\'s figures; each ECU above the last' + (bad.length ? ': NOT ' + bad.slice(0, 8).join(', ') : ''));
  check(!respawnBad.length && Ecu.respawnTime(car('muscle'), 1) === 5.5 && Ecu.respawnTime(car('muscle'), 5) === 3.5 && Ecu.respawnTime(car('sport'), 2) === 5,
    'respawn: ECU1 5.5 s, 0.5 s less each ECU above (ECU5 3.5 s)' + (respawnBad.length ? ': NOT ' + respawnBad.slice(0, 6).join(', ') : ''));
  check(Ecu.stats(car('sleeper'), 1).maxSpeed < Ecu.stats(car('sleeper'), 5).maxSpeed && Ecu.stats(car('bubble'), 1).maxSpeed === car('bubble').maxSpeed,
    'a sleeper wagon ECU1 ' + Ecu.stats(car('sleeper'), 1).maxSpeed + ' m/s, ECU5 ' + Ecu.stats(car('sleeper'), 5).maxSpeed + '; a Bubble Car (ECU1 only) at its figures');

  // ---- the second set: agility, delivery, cool, crossing (by the ECU), weight (flat)
  const today = { agility: c => c.agility ?? 1, delivery: c => c.delivery ?? DELIVERY[c.id] ?? 1, cool: () => 1, crossing: c => c.crossing ?? C.railCrossing.usual, weight: c => c.mass ?? 1 };
  const bad2 = [];
  for (const c of roster) {
    const list = ECUS[c.id].ecus, n = list.length, f = CARS.includes(c) ? STEPS.lot : STEPS.blueprint;
    for (const [key, of] of Object.entries(today)) {
      if (list[n - 1][key] !== of(c)) bad2.push(c.id + ' max ECU ' + key + ' ' + list[n - 1][key] + ' (today ' + of(c) + ')');
      list.forEach((e, i) => {
        if (typeof e[key] !== 'number') bad2.push(c.id + ' ECU' + (i + 1) + ' has no ' + key);
        else if (key === 'weight' ? e[key] !== of(c) : Math.abs(e[key] - of(c) * (1 - f * (n - i - 1))) > 0.0006) bad2.push(c.id + ' ECU' + (i + 1) + ' ' + key + ' ' + e[key]);
        if (i && key !== 'weight' && !(e[key] > list[i - 1][key])) bad2.push(c.id + ' ECU' + (i + 1) + ' ' + key + ' not above ECU' + i);
      });
    }
  }
  check(!bad2.length && Object.keys(NEW_STATS).join() === 'agility,delivery,cool,crossing,weight' && !NEW_STATS.weight.scales,
    'the second set: agility, delivery, cool, crossing by equal steps, each ECU above the last, the max = the car\'s (agility, crossing, its DELIVERY figure, cool 1); weight (mass) the same at every ECU' +
    (bad2.length ? ': NOT ' + bad2.slice(0, 8).join(', ') : ''));
  const noDelivery = roster.filter(c => c.delivery == null && DELIVERY[c.id] == null);
  const deliveries = roster.map(c => NEW_STATS.delivery.of(c));
  check(!noDelivery.length && Math.min(...deliveries) >= 0.6 && Math.max(...deliveries) <= 1.6 && DELIVERY.postvan > DELIVERY.sport && DELIVERY.milkfloat > DELIVERY['earned-f1'],
    'every roster car has a delivery figure of its own (ecu.js DELIVERY), 0.6 to 1.6 (vans best, racers worst)' + (noDelivery.length ? ': NOT ' + noDelivery.map(c => c.id).join(', ') : ''));
  const mid1 = Ecu.stats(car('midnight'), 1), mid5 = Ecu.stats(car('midnight'), 5);
  console.log('        (the Midnight Coupe, a 5-ECU blueprint car: ECU1 agility ' + mid1.agility + ' delivery ' + mid1.delivery + ' cool ' + mid1.cool + ' crossing ' + mid1.crossing + ' weight ' + mid1.weight +
    '; ECU5 ' + mid5.agility + ' / ' + mid5.delivery + ' / ' + mid5.cool + ' / ' + mid5.crossing + ' / ' + mid5.weight + ')');
  const bus = car('bus');
  check(bus && Ecu.stats(bus).agility === (bus.agility ?? 1) && Ecu.stats(bus).weight === (bus.mass ?? 1) && Ecu.stats(bus).delivery === 1 && Ecu.stats(bus).cool === 1,
    'a car with no ECU (the City Bus): its own agility and weight, delivery and cool 1');

  // ---- the unlock rules
  Progress.reset();
  const sport = car('sport'), bubble = car('bubble'), hellrod = car('hellrod');
  check(Ecu.isKey(car('commuter')) && Ecu.isKey(sport) && Ecu.isKey(hellrod) && Ecu.isKey(car('silvercomet')) && Ecu.isBlueprint(bubble) && FILLER_CARS.every(c => Ecu.isBlueprint(c)) &&
    Ecu.kind(car('bus')) === null && Ecu.kind(car('golfcart')) === null, 'kinds: garage, earned and event cars are key cars; the 18 evergreen cars blueprint cars; the bus and the ideas neither');
  check(Ecu.level(car('commuter')) === 1 && Ecu.unlocked(car('commuter')) && Ecu.maxed(car('commuter')), 'a new save: the starter (Commuter) is unlocked, maxed (ECU1 of 1)');
  check(Ecu.level(sport) === 0 && !Ecu.unlocked(sport) && Ecu.lockedWords(sport) === 'Purchase this car from the car lot', 'a car lot car not bought: ECU0, locked, "' + Ecu.lockedWords(sport) + '"');
  check(Ecu.level(hellrod) === 0 && Ecu.lockedWords(hellrod) === 'You need the key to drive this car', 'an earned car not earned: locked, "' + Ecu.lockedWords(hellrod) + '"');
  check(Ecu.addBlueprints('sport', 5) === 2 && Ecu.level(sport) === 0 && !Progress.owns('sport'), 'a locked key car CAN be upgraded: 5 blueprints, ECU2 reached, still locked (no key)');
  selectCar('sport');
  check(g.cars.CAR.id !== 'sport', '...and not selectable without its key');
  Progress.data.money = 1000;
  Progress.buy(sport);
  check(Ecu.level(sport) === 2 && Ecu.unlocked(sport), '...bought (its key): plays at the ECU reached, 2');
  check(Ecu.addBlueprints('sport', 50) === 2 && Ecu.blueprints('sport') === 55, 'blueprints past the max are kept as a count, the ECU stays at its max');
  check(Ecu.level(bubble) === 0 && !Progress.owns('bubble') && !garageCars().includes(bubble), 'a blueprint car with no blueprints: ECU0, locked, not owned, not parked');
  selectCar('bubble');
  check(g.cars.CAR.id !== 'bubble', '...and not selectable (not driveable at ECU0)');
  check(Ecu.addBlueprints('bubble', 4) === 0 && Ecu.level(bubble) === 0 && !Progress.owns('bubble'), '4 of its 5 blueprints: still locked');
  check(Ecu.addBlueprints('bubble', 1) === 1 && Ecu.level(bubble) === 1 && Progress.owns('bubble') && garageCars().includes(bubble), 'the 5th: unlocked at ECU1, owned, parked');
  selectCar('bubble');
  check(g.cars.CAR.id === 'bubble' && !Progress.data.cars.includes('bubble'), '...selectable, and not written into the save\'s list of cars');
  check(Ecu.addBlueprints('woody', 9) === 1 && Ecu.addBlueprints('woody', 1) === 2 && Ecu.addBlueprints('woody', 100) === 2, 'the Woody Wagon: ECU1 at 5, ECU2 at 10, no further (its max)');
  check(Ecu.max(hellrod) === 1 && Ecu.reached(hellrod) === 1 && Ecu.rarity(hellrod) === null, 'a special car: ECU1 only, no cards');

  // ---- the save round trip
  const code = Progress.exportCode(), stored = Progress.saved();
  Progress.reload();
  check(Progress.saved() === stored && Ecu.blueprints('sport') === 55 && Ecu.level(bubble) === 1, 'the stored save read again: blueprints and ECUs kept');
  Progress.reset();
  check(Progress.importCode(code) && Ecu.blueprints('sport') === 55 && Ecu.blueprints('bubble') === 5 && Ecu.level(sport) === 2 && Ecu.level(bubble) === 1 && !Ecu.maxed(sport),
    'the save code round trip: blueprints and ECUs kept (sport ECU2, not maxed; bubble unlocked)');

  // ---- an old save: every car it owns at its max ECU; a blueprint car it does not own, locked
  const old = { unlocked: 9, cars: ['commuter', 'sport', 'hotrod', 'sleeper'], car: 'sleeper', money: 12, bestTime: { good: {}, evil: {} } };
  const oldCode = 'DR1.' + Buffer.from(JSON.stringify(old)).toString('base64');
  check(Progress.importCode(oldCode) && ['sport', 'hotrod', 'sleeper'].every(id => Ecu.maxed(car(id)) && Ecu.level(car(id)) === Ecu.max(car(id))) &&
    Ecu.level(car('sleeper')) === 5 && Ecu.level(bubble) === 0 && Ecu.level(car('miata')) === 0,
  'an old save code (no blueprints): Sportscompact, Hot Rod, Sleeper Wagon at their max (2, 3, 5); the Bubble Car locked; a car not owned locked');
  localStorage.setItem('delivery_racer_progress_backup', JSON.stringify(old));
  Progress.reload();
  check(Ecu.level(car('sleeper')) === 5 && Ecu.level(car('hotrod')) === 3 && Ecu.level(bubble) === 0 && JSON.stringify(Progress.data.blueprints) === '{}',
    'an old stored save, read: the same (nobody loses power)');
  Progress.data.money = 5000;
  Progress.buy(car('miata'));
  check(Ecu.level(car('miata')) === 1, '...and a car bought after: ECU1 (of 4)');
  Progress.complete({ levels: LEVELS.length, cars: CARS.map(c => c.id), money: 0 });
  check(CARS.every(c => Ecu.level(c) === Ecu.max(c)) && FILLER_CARS.every(c => Ecu.level(c) === 0) && !Progress.data.cars.some(id => FILLER_CARS.some(c => c.id === id)),
    '"Unlock everything": every garage car at its max ECU; no blueprint car dealt (still locked)');

  // ---- driven: the figures and the respawn time a run uses
  Progress.reset();
  Progress.noSave = true;
  Progress.data.money = 1000;
  Progress.buy(sport); // (ECU1 of 2)
  const level = LEVELS[0];
  const drive = (id, seconds) => {
    g.select(level.id);
    selectCar(id);
    Game.evil = false;
    Player.testGhost = true;
    Game.start();
    g.drive(1, 0);
    let top = 0;
    g.run(seconds, () => { top = Math.max(top, Player.speed); });
    return top;
  };
  const e1 = Ecu.stats(sport, 1);
  let top = drive('sport', 25);
  check(carStats().ecu === 1 && Player.maxHealth === e1.health && top <= e1.maxSpeed + 1e-6 && top > e1.maxSpeed * 0.95,
    'the Sportscompact at ECU1: health ' + Player.maxHealth + ' (' + e1.health + '), top ' + top.toFixed(2) + ' of ECU1\'s ' + e1.maxSpeed + ' (its max ECU: ' + sport.maxSpeed + ')');
  Player.active = false;
  Game.respawn = -1;
  Game.update(1 / 120);
  check(Game.respawnTotal === 5.5 && Math.abs(Game.respawn - 5.5) < 1e-9, 'wrecked at ECU1: the helicopter takes 5.5 s (' + Game.respawnTotal + ')');
  Game.toMenu();
  Ecu.addBlueprints('sport', 5);
  top = drive('sport', 25);
  Player.active = false;
  Game.respawn = -1;
  Game.update(1 / 120);
  check(carStats().ecu === 2 && Player.maxHealth === sport.health && top > e1.maxSpeed + 0.5 && Game.respawnTotal === 5, 'at ECU2 (its max): its own figures (top ' + top.toFixed(2) + '), respawn 5 s');
  Game.toMenu();
  // (a race: its own car and the race rules' respawn, untouched)
  const race = LEVELS.find(l => l.laps);
  g.select(race.id);
  Game.start();
  check(carStats().ecu === null && carStats().respawn === C.respawnTime && carStats().maxSpeed === g.cars.CAR.maxSpeed, 'a race (' + race.id + '): no ECU, its car\'s own figures, CONFIG.respawnTime');
  Game.toMenu();
  // (Car Swap: a lent car drives at its max ECU, as before the ECUs)
  g.select(level.id);
  selectCar('sport');
  Game.start();
  Player.takeCar(() => g.cars.lendCar(car('hotrod')));
  check(carStats().ecu === 3 && Player.maxHealth === car('hotrod').health, 'Car Swap: a lent Hot Rod (not owned) drives at its max ECU (' + carStats().ecu + ')');
  Player.endMystery();
  g.cars.returnCar();
  Game.toMenu();

  // ---- the second set, driven: the player's car takes them at its ECU; delivery scales a package, cool the shoulder
  Progress.reset();
  Progress.noSave = true;
  const mid = car('midnight');
  const { Traffic, track: { Track } } = g;
  Ecu.addBlueprints('midnight', 5); // (ECU1 of 5)
  const at = {};
  const measure = (ecu) => {
    const want = Ecu.stats(mid, ecu);
    g.select(level.id);
    selectCar('midnight');
    Game.evil = true; // (no standing: the shoulder's time is the car's alone)
    Player.testGhost = true;
    Game.start();
    g.drive(1, 0);
    g.run(4);
    const got = { ecu: carStats().ecu, agility: Player.agility, crossing: Player.crossing, mass: Player.mass, delivery: Player.delivery, cool: Player.cool, fuse: Social.dangerTime };
    const same = got.ecu === ecu && got.agility === want.agility && got.crossing === want.crossing && got.mass === mid.mass && got.delivery === want.delivery && got.cool === want.cool &&
      Math.abs(got.fuse - C.dangerTime * Math.max(C.coolFloor, want.cool)) < 1e-9;
    // an Evil flaming package landing on a car (not a police car): its damage
    const hit = (kind) => {
      const victim = Traffic.cars.find(v => v.active && v.kind !== 'police' && v.kind !== 'interceptor' && !v.emergency && !v.junction && !v.courier && !(v.arrest >= 0) && !v.toad && v.health > 40 && (kind === 'gift' ? !v.evil : true));
      if (!victim) return null;
      Player.bigSplash = 0;
      Game.evil = Player.evil = kind === 'fire';
      Social.standing = 0;
      const p = Packages.list.find(q => !q.active);
      Object.assign(p, { active: true, owner: Player, kind, s: victim.s, lat: victim.lat, h: 1, endH: 0.6, arc: 0, vs: 0, vlat: 0, t: 0, flight: 1, hw: 0.35, hl: 0.35 });
      const before = victim.health;
      Packages.update(1e-6);
      const out = kind === 'fire' ? before - victim.health : Social.standing * 100;
      p.active = false;
      return out;
    };
    got.fire = hit('fire');
    got.gift = hit('gift');
    Game.evil = Player.evil = true;
    // on the shoulder until its meter runs out (held there; the test's ghost is never busted, so the meter's empty moment
    // is the bust's: Player.update busts at danger 0)
    Social.standing = 0;
    g.drive(0.4, 0);
    let t = null;
    g.run(15, (time) => {
      Player.lat = Track.shoulderOffset(1, Player.s);
      Player.latVel = 0;
      if (Player.onShoulder && Player.danger === 0) { t = time; return true; }
      return false;
    });
    got.bust = t;
    Game.toMenu();
    at[ecu] = got;
    return same;
  };
  const ok1 = measure(1);
  Ecu.addBlueprints('midnight', 20); // (ECU5, its max)
  const ok5 = measure(5);
  check(ok1 && ok5, 'the Midnight Coupe driven at ECU1 and ECU5: Player.agility, crossing, delivery, cool, Social.dangerTime are its ECU\'s, its mass the same (ECU1 agility ' +
    at[1].agility + ', crossing ' + at[1].crossing + ', delivery ' + at[1].delivery + ', shoulder ' + at[1].fuse.toFixed(2) + ' s; ECU5 ' + at[5].agility + ', ' + at[5].crossing + ', ' + at[5].delivery + ', ' + at[5].fuse.toFixed(2) + ' s)');
  check(at[1].fire != null && at[5].fire != null && Math.abs(at[5].fire - C.evilPackageDamage * DELIVERY.midnight) < 1e-9 && Math.abs(at[1].fire - C.evilPackageDamage * at[1].delivery) < 1e-9,
    'delivery scales an Evil flaming package\'s damage: ECU1 ' + at[1].fire?.toFixed(2) + ', ECU5 ' + at[5].fire?.toFixed(2) + ' (x its delivery ' + at[1].delivery + ' / ' + at[5].delivery + ' of ' + C.evilPackageDamage + ')');
  check(at[1].gift != null && at[5].gift != null && Math.abs(at[5].gift - C.social.gift * DELIVERY.midnight) < 1e-9 && Math.abs(at[1].gift - C.social.gift * at[1].delivery) < 1e-9,
    '...and a Good gift\'s standing: ECU1 +' + at[1].gift?.toFixed(2) + '%, ECU5 +' + at[5].gift?.toFixed(2) + '% (x its delivery, of ' + C.social.gift + ')');
  check(at[1].bust > 0 && at[5].bust > 0 && at[1].bust < at[5].bust && Math.abs(at[5].bust - C.dangerTime) < 0.1 && Math.abs(at[1].bust - at[1].fuse) < 0.1,
    'cool: held on the shoulder, its meter empty (the bust) after ' + at[1].bust?.toFixed(2) + ' s at ECU1, ' + at[5].bust?.toFixed(2) + ' s at ECU5 (today ' + C.dangerTime + ' s)');

  // ---- replays: recorded at an ECU, played back identically at it (whatever the save says by then)
  Progress.reset();
  Progress.noSave = true;
  Progress.data.money = 1000;
  Progress.buy(car('hotrod')); // (ECU1 of 3)
  const STEP = 1 / 120;
  let live = { steer: 0, throttle: 0 };
  Object.defineProperty(Input, 'steer', { get() { return this.fed ? this.fed.steer : live.steer; }, configurable: true });
  Object.defineProperty(Input, 'throttle', { get() { return this.fed ? this.fed.throttle : live.throttle; }, configurable: true });
  const where = () => [Game.state, Game.step, Game.time.toFixed(3), Player.s.toFixed(3), Player.lat.toFixed(3), Player.speed.toFixed(3), Player.health.toFixed(2), Player.maxHealth].join(' ');
  g.select('suburbs');
  selectCar('hotrod');
  Game.evil = false;
  Player.testGhost = false;
  Game.start();
  const ecuRun = carStats().ecu, healthRun = Player.maxHealth, secondRun = [Player.agility, Player.crossing, Player.mass, Player.delivery, Player.cool, Social.dangerTime].join(' ');
  for (let i = 0; i < 30 / STEP && Game.state === 'playing'; i++) {
    live = { throttle: 1, steer: Math.sin(i / 90) > 0.8 ? 0.5 : Math.sin(i / 90) < -0.8 ? -0.5 : 0 };
    Game.update(STEP);
    g.FxQueue.length = 0;
  }
  const recorded = where(), steps = Game.step;
  Game.toMenu();
  const rec = Replay.last;
  check(rec && rec.header.ecu === 1 && ecuRun === 1 && healthRun === Ecu.stats(car('hotrod'), 1).health, 'a run in the Hot Rod at ECU1: the header records ecu ' + rec?.header.ecu);
  Ecu.addBlueprints('hotrod', 10); // (by the time it is watched, the car is at ECU3)
  check(Ecu.level(car('hotrod')) === 3, '...the car since raised to ECU3');
  const play = (r) => {
    live = { throttle: -1, steer: 1 }; // (the player's own hands, not heard while it plays)
    const ok = Replay.play(r);
    const health = Player.maxHealth, second = [Player.agility, Player.crossing, Player.mass, Player.delivery, Player.cool, Social.dangerTime].join(' ');
    for (let i = 0; i < steps && Game.state === 'playing' && Replay.playing && !Replay.playing.over; i++) { Game.update(STEP); g.FxQueue.length = 0; }
    const out = where(), drifted = Replay.playing?.drifted;
    Game.toMenu();
    Replay.stop();
    return { ok, health, out, drifted, second };
  };
  const back = play(rec);
  check(back.ok && back.out === recorded && !back.drifted && back.health === healthRun, 'played back at ECU1, identically: ' + back.out + (back.out === recorded ? '' : ' (recorded ' + recorded + ')'));
  check(back.second === secondRun && Ecu.stats(car('hotrod'), 1).agility < Ecu.stats(car('hotrod'), 3).agility, '...with the second set at ECU1 too (agility, crossing, mass, delivery, cool, shoulder s: ' + back.second + ')');
  check(Ecu.pinned === null && carStats(car('hotrod')).ecu === 3, '...and after it, the car is at its own ECU again (3)');
  const oldRec = JSON.parse(JSON.stringify(rec));
  delete oldRec.header.ecu;
  const oldBack = play(oldRec);
  const hr = car('hotrod'), todayHr = [hr.agility ?? 1, hr.crossing ?? C.railCrossing.usual, hr.mass ?? 1, DELIVERY.hotrod, 1, C.dangerTime].join(' ');
  check(oldBack.ok && oldBack.health === car('hotrod').health && oldBack.second === todayHr, 'an old replay (no ECU in its header) plays at the max ECU (health ' + oldBack.health + ' of ' + car('hotrod').health + '; the second set its maxed: ' + oldBack.second + ')');
} catch (e) {
  failures++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
