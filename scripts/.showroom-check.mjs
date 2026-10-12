// A check of the showroom's cards (src/delivery/showroomData.js; drawn by render/showroom.js): every car is on the
// floor once, the ECU pips are within the car's maximum, the blueprint bar within its step, and a car that cannot be
// driven says why in the owner's words ("You need the key to drive this car", "Purchase this car from the car lot"), and
// each locked card wears one overlay of its kind (key, earned, unpurchased, tier, blueprint: overlays() at the end).
// It reads ecu.js (Ecu) through the cards, so it holds for the real tables, not a copy of them.
//   node scripts/.showroom-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot(); // (owns the Commuter, the Sportscompact and the Float Van)
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { showroomCars, carCard, LOCKED_WORDS, RARITIES, rarityOf } = await g.load('showroomData.js');
  const { Ecu } = await g.load('ecu.js');
  const { Progress } = await g.load('progress.js');
  const { CARS, EARNED_CARS, EVENT_CARS, carById } = g.cars;
  check(LOCKED_WORDS.key === 'You need the key to drive this car' && LOCKED_WORDS.lot === 'Purchase this car from the car lot', 'the locked words are the owner\'s');
  const floor = showroomCars(), ids = floor.map(car => car.id);
  check(new Set(ids).size === ids.length, 'every car on the floor once (' + ids.length + ')');
  check(CARS.every(car => ids.includes(car.id)) && EVENT_CARS.every(car => ids.includes(car.id)), 'every garage car and event car is there');
  check(EARNED_CARS.every(car => ids.includes(car.id) === !car.off), 'the earned cars, but not one that is off (the Courier Special)');
  // every card: pips within the maximum, blueprints within the step, a reason exactly when it is locked
  const cards = floor.map(car => carCard(car));
  const bad = cards.filter(c => !(c.max >= 1 && c.ecu >= 0 && c.ecu <= c.max && c.have >= 0 && c.have <= c.toNext && c.toNext >= 1)
    || (c.state === 'locked') !== !!c.reason || !RARITIES[c.rarity] || !(c.stats.maxSpeed > 0 && c.stats.respawn > 0 && c.maxStats.maxSpeed >= c.stats.maxSpeed - 1e-9));
  check(!bad.length, 'every card in range: ECU 0..max, blueprints 0..step, figures, a rarity, a reason only when locked' + (bad.length ? ' (not: ' + bad.map(c => c.id).join(', ') + ')' : ''));
  check(cards.every(c => !c.unlocked || c.ecu >= 1), 'a car that can be driven is at ECU1 or more');
  const say = (c) => c.id + ': ECU ' + c.ecu + '/' + c.max + ', blueprints ' + c.have + '/' + c.toNext + ', ' + c.state + (c.reason ? ' ("' + c.reason + '")' : '') + ', ' + c.rarity;
  // a few cars, said out
  const commuter = carCard(carById('commuter')), sport = carCard(carById('sport')), hotrod = carCard(carById('hotrod'));
  console.log('        ' + say(commuter) + '\n        ' + say(sport) + '\n        ' + say(hotrod));
  check(commuter.unlocked && commuter.state === 'ready' && commuter.ecu === commuter.max, 'the Commuter (a starter, owned): ready, maxed');
  check(!hotrod.unlocked && hotrod.reason === LOCKED_WORDS.lot, 'the Hot Rod (a car lot car not bought): "' + LOCKED_WORDS.lot + '"');
  const hellrod = carCard(carById('hellrod'));
  console.log('        ' + say(hellrod));
  check(!hellrod.unlocked && hellrod.reason === LOCKED_WORDS.key && hellrod.max === 1 && !hellrod.upgradable && hellrod.rarity === 'special', 'the Hell Rod (a special car, not earned): "' + LOCKED_WORDS.key + '", ECU1 at most, no blueprints');
  // blueprints for a locked car lot car count before its key (the owner, 12-Oct): the bar moves, the car stays locked
  (Progress.data.blueprints ||= {}).hotrod = 1;
  const hotrod1 = carCard(carById('hotrod'));
  check(Ecu.blueprints('hotrod') === 1 && (hotrod1.have > hotrod.have || hotrod1.ecu > hotrod.ecu) && hotrod1.state === 'locked', 'a blueprint for the locked Hot Rod moves its bar, and it stays locked (' + say(hotrod1) + ')');
  // a blueprint car (a filler, `evergreen`), if the roster has one: locked until its first step of blueprints, then ECU1
  const filler = floor.find(car => car.evergreen);
  if (filler) {
    Progress.data.blueprints[filler.id] = 0;
    const before = carCard(filler);
    Progress.data.blueprints[filler.id] = before.perEcu;
    const after = carCard(filler);
    console.log('        ' + say(before) + '\n        ' + say(after));
    check(before.blueprint && before.state === 'locked' && /blueprint/.test(before.reason) && before.ecu === 0, 'the ' + filler.name + ' (a blueprint car) with none: locked, ECU0, and says how many blueprints');
    check(after.unlocked && after.ecu === 1, 'with its first step of blueprints: unlocked at ECU1');
  } else console.log('  (no blueprint car on the floor yet: the filler cars are not in this tree)');
  // rarity by the ladder (where a car says none of its own)
  const gold5 = CARS.find(car => car.tier === 5 && !car.blue && !car.amphibious && !car.rarity), blue5 = CARS.find(car => car.tier === 5 && car.blue && !car.rarity);
  check((!gold5 || rarityOf(gold5) === 'uncommon') && (!blue5 || rarityOf(blue5) === 'epic') && ['epic', 'legendary'].includes(rarityOf(EVENT_CARS[0])), 'rarity by the ladder: 5 gold uncommon, 5 blue epic, an event car epic or better');
  // ---- the side (Good / Evil, one choice in the header and the detail): the cards' car rule is that side's, the
  // button says the side, and DRIVE sets the car AND the side, as the car lot's "Drive it as Evil" does
  const { driveWords, barredWhy, driveAs, sideName } = await g.load('showroomData.js');
  const { Tiers } = await g.load('tiers.js');
  const { Game } = g;
  g.CONFIG.progression.tiers = true;
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1;
  Progress.data.cars.push('sport');
  const first = Tiers.tiers[0][0];
  g.select(first.id);
  Progress.data.bestTime.good[first.id] = 5; // (Good's medal earned there: Good free, Evil still held to a tier 1 car)
  Game.evil = false;
  const sportCar = carById('sport'), commuterCar = carById('commuter');
  const onGood = carCard(sportCar, false), onEvil = carCard(sportCar, true);
  console.log('        ' + first.id + ': sport on Good ' + onGood.state + ' ("' + driveWords(onGood, false) + '"), on Evil ' + onEvil.state + ' ("' + driveWords(onEvil, true) + '")');
  check(sideName(false) === 'Good' && sideName(true) === 'Evil', 'the sides are called Good and Evil');
  check(onGood.state === 'ready' && driveWords(onGood, false) === 'Drive as Good', 'Good free: the Sportscompact is ready, the button says "Drive as Good"');
  check(onEvil.state === 'barred' && onEvil.rule?.tier === 1 && driveWords(onEvil, true) === 'Not on this level as Evil', 'Evil held to tier 1: the same car is barred on Evil, "Not on this level as Evil"');
  const why = barredWhy(onEvil, true);
  console.log('        why: ' + why.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join(''));
  check(/^As Evil, the level picked needs a /.test(why[0]) && why[1]?.tier === 1, 'the barred words name the side and the tier wanted');
  check(driveAs(onEvil, true) === false && Game.evil === false, 'DRIVE on the barred side does nothing (the side played stays Good)');
  const commuterEvil = carCard(commuterCar, true);
  check(commuterEvil.state === 'ready' && driveWords(commuterEvil, true) === 'Drive as Evil', 'the Commuter (tier 1) on Evil: ready, "Drive as Evil"');
  check(driveAs(commuterEvil, true) === true && Game.evil === true && Progress.data.evil === true && g.cars.carInUse().id === 'commuter', 'DRIVE as Evil: the side played is Evil (and saved), the Commuter in use');
  const sportGood = carCard(sportCar, false);
  check(driveAs(sportGood, false) === true && Game.evil === false && Progress.data.evil === false && g.cars.carInUse().id === 'sport', 'DRIVE as Good: back to Good, the Sportscompact in use');
  const lockedCard = carCard(carById('hotrod'), false);
  check(lockedCard.state === 'locked' && driveAs(lockedCard, false) === false && /^(Buy at|Locked)/.test(driveWords(lockedCard, false)), 'a locked car: DRIVE does nothing, the button says buy or locked ("' + driveWords(lockedCard, false) + '")');
  // ---- a click on a Good / Evil switch: the other half picks it, the half already on flips it (the owner, 12-Oct)
  const { sideClick } = await g.load('showroomData.js');
  check(sideClick(false, true) === true && sideClick(true, false) === false && sideClick(false, false) === true && sideClick(true, true) === false,
    'Good / Evil switch: a click on the other half picks it; a click on the half already on flips to the other');
  // ---- the FILTERS and the SORT (render/showroom.js draws them; the logic is showroomData.js's)
  await filters(g, check);
  // ---- the PHONE showroom (render/showroomphone.js): two columns, and the single-car screen's vertical swipe
  await phone(g, check);
  // ---- the LOCKED-CARD OVERLAYS (showroomData.js overlayOf, render/lockoverlay.js): one kind per locked card, none on a playable one
  await overlays(g, check);
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await g.close?.();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);

// The showroom's filters and sort (showroomData.js filterCards; the owner, 12-Oct): every chip gives exactly the cars it
// names (worked out here from the cars' own fields, not by the same code), the chips of a group are OR'd and the groups
// AND'd, each group's chips share out the whole floor, every sort is in order, an address's filter is read, and the full
// view's next / previous walks the filtered list and goes round
async function filters(g, check) {
  const D = await g.load('showroomData.js');
  const { EVENT_CARS, SECRET_CARS } = g.cars;
  const inUse = g.cars.carInUse().id;
  const all = D.showroomCars().map(car => D.carCard(car, false));
  const secret = (car) => Object.values(SECRET_CARS).includes(car);
  // what each chip means, said again from the cars
  const bespokeCar = (car) => !!car.bespoke || EVENT_CARS.includes(car);
  const MEANS = {
    stars: (id) => (c) => (c.car.tier >= 1 ? c.car.tier : 0) === Number(id),
    colour: (id) => (c) => {
      const car = c.car, mag = !!car.earned || !!car.evergreen || bespokeCar(car);
      return id === 'magenta' ? mag : id === 'green' ? !mag && !!car.amphibious : id === 'blue' ? !mag && !car.amphibious && !!car.blue : !mag && !car.amphibious && !car.blue;
    },
    rarity: (id) => (c) => c.rarity === id,
    kind: (id) => (c) => id === 'key' ? bespokeCar(c.car) : id === 'special' ? !bespokeCar(c.car) && (!!c.car.earned || secret(c.car))
      : !bespokeCar(c.car) && !c.car.earned && !secret(c.car) && (id === 'blueprint') === !!c.blueprint,
    state: (id) => (c) => id === 'ready' ? c.state === 'ready' : id === 'locked' ? !c.unlocked : id === 'barred' ? c.state === 'barred'
      : id === 'upgradable' ? c.upgradable && c.ecu < c.max : id === 'maxed' ? c.ecu >= c.max && c.ecu >= 1 : id === 'inuse' ? c.id === inUse : false,
  };
  const ids = (cards) => cards.map(c => c.id).join(',');
  const none = D.filterCards(all, D.noFilter(), inUse);
  check(ids(none) === ids(all), 'no filter: every car (' + all.length + '), in the floor\'s order');
  const said = [];
  for (const group of D.FILTER_GROUPS) {
    const wrong = [], counts = [];
    let covered = 0;
    for (const [id] of group.chips) {
      const f = D.noFilter(); f[group.id] = [id];
      const got = D.filterCards(all, f, inUse), want = all.filter(MEANS[group.id](id));
      if (ids(got) !== ids(want)) wrong.push(id + ' (gave ' + got.length + ', wanted ' + want.length + ')');
      counts.push(id + ' ' + got.length);
      covered += got.length;
    }
    said.push(group.id + ': ' + counts.join(', '));
    check(!wrong.length, 'every ' + group.name.toLowerCase() + ' chip gives exactly its cards' + (wrong.length ? ' (not: ' + wrong.join('; ') + ')' : ''));
    if (!['state', 'rarity', 'stars'].includes(group.id)) check(covered === all.length, 'the ' + group.name.toLowerCase() + ' chips share out the whole floor, each car once (' + covered + ' of ' + all.length + ')');
  }
  console.log('        ' + said.join('\n        '));
  // OR within a group, AND across groups
  const f1 = D.noFilter(); f1.stars = ['2', '3']; f1.colour = ['gold'];
  check(ids(D.filterCards(all, f1, inUse)) === ids(all.filter(c => (MEANS.stars('2')(c) || MEANS.stars('3')(c)) && MEANS.colour('gold')(c))), 'stars 2 or 3 AND the gold colour: the star colour adds to the star filter');
  const f2 = D.noFilter(); f2.stars = ['2', '3', '4']; f2.state = ['locked']; f2.kind = ['garage'];
  const want2 = all.filter(c => ['2', '3', '4'].some(t => MEANS.stars(t)(c)) && MEANS.state('locked')(c) && MEANS.kind('garage')(c));
  check(ids(D.filterCards(all, f2, inUse)) === ids(want2) && want2.length > 0, 'groups together: gold 2-4 AND locked AND key cars (' + want2.length + ')');
  const f3 = D.noFilter(); f3.rarity = ['legendary']; f3.state = ['inuse'];
  check(D.filterCards(all, f3, inUse).every(c => c.rarity === 'legendary' && c.id === inUse), 'a filter nothing matches gives nothing, not everything');
  // the sorts
  const sorted = (sort) => { const f = D.noFilter(); f.sort = sort; return D.filterCards(all, f, inUse); };
  const inOrder = (list, ok) => list.every((c, i) => i === 0 || ok(list[i - 1], c));
  check(ids(sorted('tier')) === ids(all), 'sort by tier: the floor\'s order');
  check(sorted('name').length === all.length && inOrder(sorted('name'), (a, b) => a.name.localeCompare(b.name) <= 0), 'sort by name: A to Z');
  check(inOrder(sorted('speed'), (a, b) => (a.hidden ? -1 : a.stats.maxSpeed) >= (b.hidden ? -1 : b.stats.maxSpeed)), 'sort by top speed: fastest first (a hidden car last)');
  check(inOrder(sorted('ecu'), (a, b) => a.ecu > b.ecu || (a.ecu === b.ecu && a.max >= b.max)), 'sort by ECU: highest first');
  check(inOrder(sorted('rarity'), (a, b) => D.RARITY_ORDER.indexOf(a.rarity) >= D.RARITY_ORDER.indexOf(b.rarity)), 'sort by rarity: rarest first');
  const f4 = D.noFilter(); f4.state = ['ready']; f4.sort = 'speed';
  const r4 = D.filterCards(all, f4, inUse);
  check(r4.every(c => c.state === 'ready') && inOrder(r4, (a, b) => a.stats.maxSpeed >= b.stats.maxSpeed), 'a filter and a sort together: the ready cars, fastest first');
  // the address's &filter=, and a remembered filter that names chips no longer there
  const parsed = D.parseFilter('stars:3,4;colour:gold;rarity:epic;state:ready;sort:speed');
  check(JSON.stringify(parsed) === JSON.stringify({ stars: ['3', '4'], colour: ['gold'], rarity: ['epic'], kind: [], state: ['ready'], sort: 'speed' }), '&filter=stars:3,4;colour:gold;rarity:epic;state:ready;sort:speed is read');
  const cleaned = D.cleanFilter({ stars: ['9', '1'], rarity: 'epic', state: ['nope'], sort: 'colour' });
  check(JSON.stringify(cleaned) === JSON.stringify({ stars: ['1'], colour: [], rarity: [], kind: [], state: [], sort: 'tier' }) && D.filterCount(parsed) === 5, 'a stale or broken filter keeps only what exists; the count of chips on');
  // next / previous in the full view: along the list AS FILTERED, round from the end
  const f5 = D.noFilter(); f5.stars = ['2', '3']; f5.colour = ['gold']; f5.sort = 'name';
  const list = D.filterCards(all, f5, inUse);
  let at = list[0].id;
  const seen = [at];
  for (let i = 1; i < list.length; i++) seen.push(at = D.stepIn(list, at, 1).id);
  check(seen.join(',') === ids(list) && D.stepIn(list, at, 1).id === list[0].id, 'next walks the filtered list in its order and goes round from the last to the first (' + list.length + ' cars)');
  check(D.stepIn(list, list[0].id, -1).id === list[list.length - 1].id && D.stepIn(list, list[2].id, -1).id === list[1].id, 'previous goes back, and from the first round to the last');
  check(list.every(c => (MEANS.stars('2')(c) || MEANS.stars('3')(c)) && MEANS.colour('gold')(c)), 'next / previous never leave the filter');
  check(D.stepIn([], 'x', 1) === null && D.stepIn([list[0]], list[0].id, 1).id === list[0].id, 'an empty list: nothing; one car: itself');
}

// The phone showroom held upright (render/showroomphone.js, showroom-phone.css; the owner, 12-Oct: "Two columns of
// cards, then a screen when clicking in. Swipe/tap up or down to switch cars"): the list's columns, which finger moves
// switch car and which way, and a run of swipes along a filtered list going round its ends (through stepIn, the one
// switch the desktop's arrows use too). The layout and the touches themselves are seen in a browser, not here.
async function phone(g, check) {
  const P = await g.load('render/showroomphone.js');
  const D = await g.load('showroomData.js');
  check(P.PHONE_COLUMNS === 2, 'the phone\'s list: two columns of cards');
  const { min, ratio, time } = P.SWIPE;
  check(P.swipeOffset(0, -min - 10, 200) === 1 && P.swipeOffset(5, min + 10, 200) === -1, 'a swipe UP: the next car; a swipe DOWN: the one before');
  check(P.swipeOffset(0, -(min - 5), 200) === 0 && P.swipeOffset(0, 0, 50) === 0, 'a short move or a tap: no switch');
  check(P.swipeOffset(-(min + 40) * ratio, -(min + 40), 200) === 0 && P.swipeOffset(200, -60, 200) === 0, 'a move as much sideways as up: no switch (a sideways one is the car\'s or the page\'s)');
  check(P.swipeOffset(0, -200, time + 50) === 0, 'a slow drag (over ' + time + ' ms): no switch');
  // swipes along a filtered list: up the whole list comes round to the start; down from the first goes to the last
  const all = D.showroomCars().map(car => D.carCard(car, false));
  const f = D.noFilter(); f.state = ['locked'];
  const list = D.filterCards(all, f, g.cars.carInUse().id);
  let at = list[0].id;
  for (let i = 0; i < list.length; i++) at = D.stepIn(list, at, P.swipeOffset(0, -120, 150)).id;
  const down = D.stepIn(list, list[0].id, P.swipeOffset(0, 120, 150)).id;
  check(list.length > 2 && at === list[0].id && down === list[list.length - 1].id, list.length + ' swipes up go round the filtered list (' + list.length + ' locked cars) to the first again; a swipe down from the first: the last');
}

// The locked-card overlays (the owner, 12-Oct, after an Asphalt 9 locked card): every card that cannot be driven wears
// exactly one kind (key, earned, unpurchased, tier, blueprint), worked out here again from the card's own fields; a card
// that can be driven wears none; an EARNED (special) car's overlay and tooltip never speak of a key, nor use the key icon
// (the owner: earned cars are earned on a level; only a Key car's needs its key); a Key car's keeps the key. With the
// tiers on and a fresh save, so every kind is on the floor. The look is seen in stills, not here.
async function overlays(g, check) {
  const D = await g.load('showroomData.js');
  const L = await g.load('render/lockoverlay.js');
  const { Progress } = await g.load('progress.js');
  const { CARS, EVENT_CARS, SECRET_CARS } = g.cars;
  g.CONFIG.progression.tiers = true;
  Progress.reset(); Progress.noSave = true; Progress.data.tierBase = 1;
  const filler = D.showroomCars().find(car => car.evergreen && !D.carCard(car).hidden);
  if (filler) (Progress.data.blueprints ||= {})[filler.id] = 2; // (a blueprint car part-way: its bar on the overlay)
  const cards = D.showroomCars().map(car => D.carCard(car, false));
  const want = (c) => c.unlocked ? null : c.hidden ? 'tier' : c.blueprint ? 'blueprint'
    : CARS.includes(c.car) && !c.car.evergreen ? (c.forSale ? 'unpurchased' : 'tier')
      : c.car.earned || Object.values(SECRET_CARS).includes(c.car) ? 'earned' : 'key';
  const kindOf = (c) => D.overlayOf(c)?.kind ?? null;
  const wrong = cards.filter(c => kindOf(c) !== want(c) || (kindOf(c) && !D.OVERLAY_KINDS.includes(kindOf(c))));
  check(!wrong.length, 'every card has exactly its one overlay kind (none when it can be driven)' + (wrong.length ? ' (not: ' + wrong.map(c => c.id + ' ' + kindOf(c) + '/' + want(c)).join(', ') + ')' : ''));
  const counts = {};
  for (const c of cards) { const k = kindOf(c) || 'none'; counts[k] = (counts[k] || 0) + 1; }
  console.log('        overlays: ' + Object.entries(counts).map(([k, n]) => k + ' ' + n).join(', '));
  check([...D.OVERLAY_KINDS, 'none'].every(k => counts[k] > 0), 'all five kinds and "none" are on a fresh floor with the tiers on');
  const say = (ov) => ov ? ov.title + ' / ' + ov.line : '';
  const earned = cards.filter(c => kindOf(c) === 'earned');
  check(earned.length > 0 && earned.every(c => !/\bkey/i.test(say(D.overlayOf(c)) + ' ' + D.cardTip(c))), 'an earned car\'s overlay and tooltip never say key (' + earned.slice(0, 2).map(c => '"' + say(D.overlayOf(c)) + '"').join(', ') + ')');
  check(earned.every(c => !c.car.earned || /^Beat par on /.test(D.overlayOf(c).line)), 'an earned car names the level it is earned on');
  check(L.ICONS.earned !== L.ICONS.key && Object.keys(L.ICONS).sort().join() === [...D.OVERLAY_KINDS].sort().join(), 'each kind its own icon; the earned one (a trophy) is not the key');
  const keys = cards.filter(c => kindOf(c) === 'key');
  check(keys.length > 0 && keys.every(c => (c.car.bespoke || EVENT_CARS.includes(c.car)) && /key/i.test(say(D.overlayOf(c)))), 'a Key car (Bespoke, event) keeps the key theme ("' + say(D.overlayOf(keys[0])) + '")');
  const forSale = cards.filter(c => kindOf(c) === 'unpurchased');
  check(forSale.every(c => D.overlayOf(c).title === '$' + (Number.isInteger(c.car.price) ? c.car.price : c.car.price.toFixed(2)) && /Crazey Jim/.test(D.overlayOf(c).line)), 'a car lot car not bought shows its price at Crazey Jim\'s ("' + say(D.overlayOf(forSale[0])) + '")');
  const tier = cards.filter(c => kindOf(c) === 'tier');
  check(tier.every(c => /\{tier:\d+\}|later tier|Not for sale/.test(D.overlayOf(c).line)) && tier.every(c => !c.hidden || c.name === 'Locked car'), 'a tier-locked card says which tier opens it, and a silhouette keeps its name hidden ("' + say(D.overlayOf(tier[0])) + '")');
  const bp = cards.filter(c => kindOf(c) === 'blueprint');
  check(bp.every(c => { const o = D.overlayOf(c); return o.have >= 0 && o.have <= o.need && o.title === o.have + '/' + o.need + ' blueprints'; }), 'a blueprint-locked card shows its blueprints toward unlocking ("' + say(D.overlayOf(bp.find(c => c.id === filler?.id) || bp[0])) + '")');
  check(cards.every(c => !D.overlayOf(c) || !/You need the key|Purchase this car/.test(say(D.overlayOf(c)))), 'the overlays\' words are short, not the spec\'s sentences (those stay in the panel and the tooltip)');
}
