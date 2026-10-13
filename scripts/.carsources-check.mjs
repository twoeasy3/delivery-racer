// A check of where a car's key and blueprints come from (src/delivery/carsources.js sourcesOf, the showroom's "Where to
// get it": render/carsources.js), worked out live from the game's data: a garage car (bought at the car lot once its
// tier is open; blueprints from packs, the Career ones counting down as their levels are delivered), the Silver Comet
// (its key the Comet Hunt's prize while the event is on, and not after; a Bespoke key card in packs; Legendary
// blueprints, its special pack only while the event is on), a Bespoke key car from the idea lot (its key from packs
// only), the free Daily pack (a Shop way; claimed today, "Come back tomorrow"), a filler (blueprints only, no key), an earned car (no blueprints), a key owned, a car maxed, and a car with
// nothing to be had now.
//   node scripts/.carsources-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { sourcesOf, sourcesLine, careerLeft } = await g.load('carsources.js');
  const { Progress } = await g.load('progress.js');
  const { Events, when } = await g.load('events.js');
  const { careerLevels } = await g.load('packs.js');
  const { Ecu } = await g.load('ecu.js');
  const by = (id) => g.cars.carById(id);
  const DURING = when('2026-10-12'), AFTER = when('2026-11-05'), BEFORE = when('2026-09-20');
  const at = (t) => { Events.now = () => t; };
  const fresh = () => { Progress.reset(); Progress.noSave = true; };
  const say = (s) => [...s.keys, ...s.blueprints].map(x => (x.available ? '+' : '-') + x.what[0] + ':' + x.where).join(', ');
  const ofHow = (list, how) => list.filter(x => x.how === how);

  // ---- a garage car: bought at the car lot (once its tier is open); blueprints from packs ----
  fresh(); at(DURING);
  let s = sourcesOf(by('lovebus'));
  const lot0 = ofHow(s.keys, 'lot')[0];
  check(lot0 && !lot0.available && /Not for sale yet/.test(lot0.why), 'a garage car of a tier not open: the car lot, not for sale yet (' + lot0?.why + ')');
  Progress.data.unlocked = 99; Progress.data.tierBase = 99;
  s = sourcesOf(by('lovebus'));
  const lot = ofHow(s.keys, 'lot')[0];
  check(lot?.available && lot.where.includes('Crazey Jim') && lot.detail.includes('$130') && s.keys.length === 1, 'its tier open: bought at Crazey Jim\'s (' + lot?.detail + '), its only key source');
  const kinds = s.blueprints.filter(x => x.available).map(x => x.kind);
  check(s.blueprints.every(x => x.how === 'pack') && ['standard', 'ten', 'career'].every(k => kinds.includes(k)) && s.blueprints.every(x => x.rarity === null || x.rarity === 'common'),
    'its blueprints: Common cards in packs (' + s.blueprints.filter(x => x.available).map(x => x.where + ' ' + x.detail.split(':')[0]).join('; ') + ')');
  const shop = s.blueprints.find(x => x.kind === 'standard').ways.find(w => w.how === 'shop');
  check(shop?.available && shop.placeholder && /Crazey Cash \(placeholder: nothing gives it yet\)/.test(shop.detail), 'a Shop offer: on sale, flagged a placeholder (' + shop?.detail + ')');
  // the Career packs: the levels not yet delivered, counting down
  const career = () => sourcesOf(by('lovebus')).blueprints.find(x => x.kind === 'career').ways.find(w => w.how === 'career');
  const all = careerLevels().length, left0 = careerLeft().length;
  check(left0 === all && career().available && career().detail.endsWith(all + ' left'), 'Career packs: ' + career().detail);
  Progress.data.bestTime.good[careerLevels()[0]] = 30;
  Progress.data.bestTime.evil[careerLevels()[1]] = 30;
  check(careerLeft().length === all - 2 && career().detail.endsWith((all - 2) + ' left'), 'two of those levels delivered: ' + career().detail);
  for (const id of careerLevels()) Progress.data.bestTime.good[id] = 30;
  check(!career().available && /already/.test(career().why), 'all delivered: not available (' + career().why + ')');

  // ---- the free Daily pack (CHECKLIST 159): a Shop way, free, one a day; claimed today it is not to be had ("Come back
  // tomorrow"), and the next local day it is again ----
  fresh(); at(DURING);
  const { Shop } = await g.load('shop.js');
  const dailyWay = () => sourcesOf(by('lovebus')).blueprints.find(x => x.kind === 'daily')?.ways.find(w => w.how === 'shop');
  const w0 = dailyWay();
  check(w0?.available && w0.price === 0 && /^free, 1 a day/.test(w0.detail) && !w0.placeholder, 'the Daily pack: a Shop way, free (' + w0?.detail + ')');
  const claimed = Shop.buy('daily', DURING);
  const w1 = dailyWay();
  check(claimed.ok && w1 && !w1.available && w1.why === 'Come back tomorrow', '...claimed today: not to be had (' + w1?.why + ')');
  at(DURING + 86400e3);
  check(dailyWay()?.available, '...the next day: to be had again');
  at(DURING);

  // ---- the Silver Comet: the first Bespoke key car ----
  fresh(); at(DURING);
  const comet = by('silvercomet');
  check(comet.bespoke && Ecu.rarity(comet) === 'legendary' && Ecu.max(comet) === 5 && comet.model === 'centreseat', 'the Silver Comet: Bespoke, Legendary blueprints, ECU max 5, still on the Centre-Seat Hypercar model');
  s = sourcesOf(comet);
  const hunt = ofHow(s.keys, 'event')[0];
  check(hunt?.available && hunt.where === 'The Comet Hunt' && /ends 1 Nov/.test(hunt.detail), 'while the Comet Hunt is on: its key is the grand prize (' + hunt?.detail + ')');
  const keyPacks = ofHow(s.keys, 'pack');
  check(keyPacks.every(x => x.kind === 'comet-special') && keyPacks.some(x => x.kind === 'comet-special' && x.chance > 0.004 && x.chance < 0.006), 'no regular pack holds its key (noPacks): only the Comet Hunt special, about 0.5% a pack (' + (keyPacks.map(x => x.where + ' ' + (x.chance * 100).toFixed(2) + '%').join('; ') || 'none listed') + ')');
  const rf = sourcesOf(by('rocketfin')), rfKeys = ofHow(rf.keys, 'pack');
  check(rfKeys.length >= 1 && rfKeys.every(x => x.rarity === 'bespoke' && x.chance > 0 && x.available) && rfKeys.map(x => x.kind).sort().join() === 'daily,standard,ten',
    'another Bespoke key car (the Rocket Fin Coupe): its key in the packs with keys: ' + rfKeys.map(x => x.where + ' ' + x.detail.split(':')[0]).join('; '));
  const legendary = s.blueprints.filter(x => x.chance > 0);
  check(legendary.length === 1 && legendary[0].kind === 'comet-special' && legendary.every(x => x.rarity === 'legendary'), 'its blueprints are Legendary, in the Comet Hunt special pack only: ' + legendary.map(x => x.where).join(', '));
  const special = s.blueprints.find(x => x.kind === 'comet-special');
  check(special?.available && special.chance > 0.99 && special.ways.some(w => w.how === 'event' && w.available) && special.ways.some(w => w.how === 'shop' && w.available),
    'the Comet Hunt\'s special pack: a featured card in every one, from the stages and the Shop (' + special?.detail + ')');
  check(s.blueprints.find(x => x.kind === 'career')?.available === false && /Cannot hold it/.test(s.blueprints.find(x => x.kind === 'career').why), 'never in a Career pack (' + s.blueprints.find(x => x.kind === 'career')?.why + ')');
  at(AFTER);
  s = sourcesOf(comet);
  const over = ofHow(s.keys, 'event')[0], spOver = s.blueprints.find(x => x.kind === 'comet-special');
  check(over && !over.available && /^Event over \(ended 1 Nov\)/.test(over.why), 'the event over: the prize is not obtainable (' + over?.why + ')');
  check(spOver && !spOver.available && spOver.ways.every(w => !w.available) && /Event over/.test(spOver.why), '...nor its special pack, from the stages or the Shop (' + spOver?.why + ')');
  check(ofHow(s.keys, 'pack').every(x => !x.available), '...and the key from its special pack goes with the event');
  at(BEFORE);
  s = sourcesOf(comet);
  check(/^Not yet open: starts 1 Oct/.test(ofHow(s.keys, 'event')[0]?.why || ''), 'before the event: "' + ofHow(s.keys, 'event')[0]?.why + '"');
  at(DURING);
  Progress.data.claimed = ['event-comet-hunt'];
  check(/Prize already won/.test(ofHow(sourcesOf(comet).keys, 'event')[0]?.why || ''), 'its prize won: "Prize already won"');
  Progress.data.cars.push('silvercomet');
  s = sourcesOf(comet);
  check(s.keyOwned && s.keys.every(x => !x.available && x.why === 'You have its key already') && s.obtainable.blueprints, 'the key owned: every key source says so; its blueprints still to be had');
  Progress.data.blueprints = { silvercomet: 99 };
  s = sourcesOf(comet);
  check(s.maxed && s.blueprints.every(x => !x.available && /max ECU/.test(x.why)), 'at its max ECU: no blueprints needed (' + s.blueprints[0]?.why + ')');

  // ---- a Bespoke key car from the idea lot: its key from packs only ----
  fresh(); at(DURING);
  s = sourcesOf(by('rocketfin'));
  check(s.keys.length >= 1 && s.keys.every(x => x.how === 'pack' && x.rarity === 'bespoke') && s.blueprints.filter(x => x.chance > 0).every(x => x.rarity === 'legendary') && !s.blueprints.find(x => x.kind === 'comet-special').chance,
    'the Rocket Fin Coupe: its key only a Bespoke card in packs, its blueprints Legendary, in no special pack (' + say(s) + ')');

  // ---- a filler: blueprints only ----
  s = sourcesOf(by('bubble'));
  check(s.keyless && s.keys.length === 0 && s.obtainable.blueprints && s.blueprints.filter(x => x.available).length >= 3, 'a filler (the Bubble Car): no key, ' + s.keyless + '; blueprints: ' + s.blueprints.filter(x => x.available).map(x => x.where).join(', '));

  // ---- an earned car: no blueprints; its key a level's par; not obtainable while the level is shut ----
  s = sourcesOf(by('hellrod'));
  check(s.noBlueprints && /special car/.test(s.noBlueprints) && s.blueprints.length === 0, 'an earned car (the Hell Rod): ' + s.noBlueprints);
  const par = ofHow(s.keys, 'level')[0];
  check(par && !par.available && /Level not open yet/.test(par.why) && !s.obtainable.key, 'its key: beat the par on ' + par?.where + ', not open yet (' + par?.why + ')');
  // (a Garage car has no key: its first way in is Purchase; a Key car's is Key; an earned car's is Earn)
  const lotWord = (await g.load('carsources.js')).ownWord;
  check(lotWord(by('hotrod')).label === 'Purchase' && lotWord(by('silvercomet')).label === 'Key' && lotWord(by('hellrod')).label === 'Earn' && !/Key/.test(sourcesLine(by('hotrod'))), 'a Garage car says Purchase (never Key), a Key car Key, an earned car Earn: "' + sourcesLine(by('hotrod')) + '"');
  check(/Earn: not obtainable right now/.test(sourcesLine(by('hellrod'))) && /No blueprints/.test(sourcesLine(by('hellrod'))), 'nothing to be had now, said plainly: "' + sourcesLine(by('hellrod')) + '"');
  // a 1-gold starter
  s = sourcesOf(by('commuter'));
  check(s.keyOwned && /1-gold starter/.test(s.noBlueprints || ''), 'a 1-gold starter: owned, ' + s.noBlueprints);
  // ---- the Blower Tourer (the owner, 13-Oct): a blueprint car in no regular pack whose ONLY source is the Car Hunt's pack
  // (one for every Car Hunt delivery while it is on); between runs said plainly, with when it is back; the other noPacks
  // cars still have none ----
  {
    const { huntEventFor } = await g.load('carsources.js');
    const hunt = Events.specials.find(e => e.id === 'car-hunt');
    fresh(); at(hunt.from + 3600e3);
    s = sourcesOf(by('blower'));
    const live = s.blueprints.filter(x => x.chance > 0);
    const way = live[0]?.ways.find(w => w.how === 'event');
    check(live.length === 2 && live.some(x => x.kind === 'car-hunt-special' && x.available && Math.abs(x.chance - 1) < 1e-9) && live.some(x => x.kind === 'car-hunt-5' && x.available) && way?.where === 'Car Hunt' && way.available && /every delivery/.test(way.detail),
      'the Blower Tourer\'s blueprints: the Car Hunt pack and the Car Hunt 5-pack (' + live.map(x => x.where + ' ' + x.detail).join('; ') + '; ' + way?.detail + ')');
    check(s.keyless && s.obtainable.blueprints && /Car Hunt pack/.test(sourcesLine(by('blower'))) && huntEventFor(by('blower'))?.live, 'while the Car Hunt is on: obtainable, "' + sourcesLine(by('blower')) + '"');
    at(hunt.from + 4 * 86400e3);
    s = sourcesOf(by('blower'));
    const off = s.blueprints.find(x => x.kind === 'car-hunt-special');
    check(off && !off.available && /Between runs: back/.test(off.why) && s.obtainable.blueprints && s.blueprints.some(x => x.kind === 'car-hunt-5' && x.available) && huntEventFor(by('blower')) && !huntEventFor(by('blower')).live, 'between runs: "' + off?.why + '"');
    at(hunt.from + 3600e3);
    const none = ['coach', 'cityev', 'coupecross'].map(id => sourcesOf(by(id)));
    check(none.every(x => !x.obtainable.blueprints && x.blueprints.every(b => !(b.chance > 0))) && !huntEventFor(by('coach')), 'the Highway Coach, City EV and Coupe Crossover: still no blueprints anywhere');
  }
  // ---- the six concept key cars (CHECKLIST 211): their blueprints only in their day's Concept Strike pack, their key only for
  // delivering them at their max ECU on their day; on that day obtainable, on another (Sunday too) "back <its day>" ----
  {
    const { huntEventFor } = await g.load('carsources.js');
    const strike = Events.specials.find(e => e.id === 'concept-strike'), D = 86400e3;
    const ids = ['fishbowl', 'midsummer', 'sixteen', 'quadturbo', 'knifeedge', 'windsong'];
    fresh();
    let good = 0;
    const lines = [];
    ids.forEach((id, d) => {
      at(strike.from + 14 * D + d * D + 5 * 3600e3); // (its day, in the third run)
      const on = sourcesOf(by(id)), bp = on.blueprints.filter(x => x.chance > 0);
      const ok1 = bp.length === 1 && bp[0].kind === 'concept-strike-' + (d + 1) && bp[0].available && Math.abs(bp[0].chance - 1) < 1e-9 && on.keys.length === 1 && on.keys[0].where === 'Concept Strike' && on.keys[0].available && huntEventFor(by(id))?.live;
      at(strike.from + 14 * D + ((d + 1) % 7) * D + 5 * 3600e3); // (the next day: another car's)
      const off = sourcesOf(by(id));
      const wd = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d], packOff = off.blueprints.find(x => x.chance > 0);
      const ok2 = !off.obtainable.key && !off.obtainable.blueprints && off.keys[0]?.why === 'Its day: ' + wd && packOff?.ways.find(w => w.how === 'event')?.why === 'Its day: ' + wd
        && huntEventFor(by(id)) && !huntEventFor(by(id)).live; // (its WEEKDAY, never a date: the owner, 13-Oct)
      if (ok1 && ok2) good++;
      lines.push(id + ' (' + sourcesLine(by(id)) + ' / next day: ' + off.keys[0]?.why + ')');
    });
    check(good === 6, 'each concept car: on its day its key (the Concept Strike) and its blueprints (its day\'s pack only) obtainable; on another day "Its day: <weekday>" (no date): ' + lines.join('; '));
    at(strike.from + 20 * D + 5 * 3600e3); // (a Sunday)
    check(ids.every(id => !sourcesOf(by(id)).obtainable.key), 'Sunday: no concept car\'s key to be had (' + sourcesOf(by('fishbowl')).keys[0]?.why + ')');
    check(ids.every((id, d) => sourcesOf(by(id)).keys[0]?.why === 'Its day: ' + ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]),
      'Sunday: each concept car names its weekday, not a date (' + ids.map(id => sourcesOf(by(id)).keys[0]?.why).join('; ') + ')');
  }
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
