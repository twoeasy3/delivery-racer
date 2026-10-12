// A check of the card packs (src/delivery/packs.js, packs.json; BLUEPRINTS-NOTES.md "Card packs"): the pools by rarity
// (the ladder by star tier, a car's own `rarity` first, event cars never in the pool, keys only for cars not owned),
// a 10-pack always has an Epic or better, a special pack's last slot is a featured card and Epic or better, career
// packs hold only evergreen cards, the odds come out about as packs.json has them (seeded dice, many packs), the
// featured upgrade rate, and the packs held and the log in the save (a save code out and back, an old save).
//   node scripts/.packs-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const P = await g.load('packs.js');
const { Packs, RARITIES, rarityOf, pools, draw, careerLevels, featuredFor } = P;
const { Progress } = await g.load('progress.js');
const { Ecu } = await g.load('ecu.js');
const { CARS, EVENT_CARS, EARNED_CARS, carById } = g.cars;
const rank = (r) => RARITIES.indexOf(r);
// seeded dice (mulberry32), so a run of the check is the same every time
const dice = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

try {
  Progress.reset(); Progress.noSave = true;
  // ---- the pools, by the spec's ladder ----
  const by = (id) => carById(id);
  const expect = { commuter: null, junker: null, darkvan: null, lovebus: 'common', hearse: 'common', taxi: 'common', muscle: 'uncommon',
    postvan: 'uncommon', hothatch: 'uncommon', sleeper: 'uncommon', gullwing: 'epic', classicgt: 'epic' };
  const wrong = Object.entries(expect).filter(([id, r]) => rarityOf(by(id)) !== r).map(([id, r]) => id + ' ' + rarityOf(by(id)) + ' (wanted ' + r + ')');
  check(!wrong.length, 'the ladder: 1 gold none, 2-4 gold common, 5 gold and 1-3 blue uncommon, 4-5 blue epic' + (wrong.length ? ': ' + wrong.join(', ') : ''));
  check(EARNED_CARS.every(c => rarityOf(c) === null), 'the earned (6-star) cars have no cards');
  const real = pools();
  const inPool = Object.values(real.evergreen).flat();
  check(EVENT_CARS.every(c => !inPool.includes(c)) && EARNED_CARS.every(c => !inPool.includes(c)), 'no event car and no earned car in the evergreen pool (event cars come as featured cards)');
  check(!real.keys.some(c => c.id === 'commuter') && real.keys.some(c => c.id === 'lovebus') && real.keys.every(c => !c.evergreen && CARS.includes(c)), 'the keys (Bespoke): garage cars not owned (' + real.keys.length + ')');
  for (const r of RARITIES.filter(r => r !== 'bespoke')) console.log('        ' + r.padEnd(10) + (real.evergreen[r] || []).map(c => c.id).join(' '));
  // a car's own rarity first; a 1-gold blueprint car is common; the roster read when drawn
  const fakes = [
    { id: 'fake-bubble', name: 'Bubble', tier: 1, evergreen: true, price: 0 },
    { id: 'fake-jet', name: 'Jet', tier: 5, evergreen: true, rarity: 'legendary', price: 0 },
    { id: 'fake-coupe', name: 'Coupe', tier: 3, evergreen: true, rarity: 'epic', price: 0 },
  ];
  check(rarityOf(fakes[0]) === 'common' && rarityOf(fakes[1]) === 'legendary' && rarityOf(fakes[2]) === 'epic', 'a car\'s own rarity is read first; a 1-gold blueprint car is common');
  const withFakes = [...CARS, ...fakes];
  const fp = pools({ cars: withFakes, owned: (id) => id === 'commuter' });
  check(fp.evergreen.legendary.includes(fakes[1]) && fp.evergreen.common.includes(fakes[0]) && !fp.keys.some(c => c.evergreen), 'cars added to the roster are in the pool, never as keys');

  // ---- packs drawn, many times, with seeded dice ----
  const N = 4000, opts = (seed, more = {}) => ({ random: dice(seed), cars: withFakes, owned: (id) => id === 'commuter', ...more });
  let tenOk = 0, tenSize = true;
  for (let i = 0; i < N; i++) { const cards = draw('ten', opts(i)); if (cards.length !== 10) tenSize = false; if (cards.some(c => rank(c.rarity) >= rank('epic'))) tenOk++; }
  check(tenOk === N && tenSize, 'a 10-pack: 10 cards, an Epic or better in every one (' + tenOk + ' of ' + N + ')');
  let stdOk = 0;
  for (let i = 0; i < N; i++) { const cards = draw('standard', opts(1e6 + i)); if (cards.length === 5 && cards.some(c => rank(c.rarity) >= rank('uncommon'))) stdOk++; }
  check(stdOk === N, 'a standard pack: 5 cards, an Uncommon or better in every one');
  const evergreenIds = new Set(Object.values(fp.evergreen).flat().map(c => c.id));
  let careerOk = 0;
  for (let i = 0; i < N; i++) { const cards = draw('career', opts(2e6 + i)); if (cards.length === 5 && cards.every(c => !c.key && !c.featured && evergreenIds.has(c.car))) careerOk++; }
  check(careerOk === N, 'career packs hold only evergreen cards (no keys, no featured, no event cars): ' + careerOk + ' of ' + N);
  // special: the last slot featured and Epic or better; featured cards only from the list; one card a slot
  const comet = EVENT_CARS[0], feats = [comet, by('classicgt')];
  let lastOk = 0, featuredSlots = 0, upgraded = 0, slots = 0, foreign = 0, higherOk = true;
  for (let i = 0; i < N; i++) {
    const cards = draw('special', opts(3e6 + i, { featured: feats }));
    const last = cards.at(-1);
    if (cards.length === 5 && last.featured && feats.some(c => c.id === last.car) && rank(last.rarity) >= rank('epic')) lastOk++;
    for (const c of cards.slice(0, -1)) {
      slots++;
      if (c.featured) { featuredSlots++; if (!feats.some(f => f.id === c.car)) foreign++; }
      if (c.upgraded) upgraded++;
      if (c.upgraded && !c.featured && rank(c.rarity) < rank('uncommon')) higherOk = false; // (an upgraded filler is at least one rarity up from common)
    }
  }
  check(lastOk === N, 'a special pack: its last slot is a featured card, Epic or better (' + lastOk + ' of ' + N + ')');
  check(foreign === 0, 'featured cards only from the featured list');
  const spec = Packs.data.kinds.special.featured, wantUp = spec.upgradeChance, wantFeat = spec.upgradeChance * (1 - (1 - spec.featuredChance) ** feats.length);
  check(Math.abs(upgraded / slots - wantUp) < 0.02, 'slots upgraded: ' + (upgraded / slots * 100).toFixed(1) + '% (packs.json ' + wantUp * 100 + '%)');
  check(Math.abs(featuredSlots / slots - wantFeat) < 0.015, 'slots that turned featured (2 featured cars, 20% each when a slot upgrades): ' + (featuredSlots / slots * 100).toFixed(1) + '% (wanted ' + (wantFeat * 100).toFixed(1) + '%)');
  check(higherOk, 'an upgraded slot with no featured hit is a higher-rarity filler card');
  const noFeat = draw('special', opts(42, { featured: [] }));
  check(noFeat.length === 5 && rank(noFeat.at(-1).rarity) >= rank('epic') && !noFeat.at(-1).featured, 'a special pack with no featured cars: its last slot is an Epic-or-better filler');
  // the odds: a standard pack's first slot (never rolled again by a guarantee) against packs.json, over the rarities the pool has
  const M = 40000, seen = Object.fromEntries(RARITIES.map(r => [r, 0]));
  for (let i = 0; i < M; i++) seen[draw('standard', opts(4e6 + i))[0].rarity]++;
  const total = RARITIES.reduce((n, r) => n + Packs.data.odds[r], 0);
  const off = RARITIES.filter(r => Math.abs(seen[r] / M - Packs.data.odds[r] / total) > Math.max(0.006, Packs.data.odds[r] / total * 0.12));
  check(!off.length, 'the odds of a slot, ' + M + ' packs: ' + RARITIES.map(r => r + ' ' + (seen[r] / M * 100).toFixed(1) + '% (' + (Packs.data.odds[r] / total * 100).toFixed(1) + ')').join(', '));
  // a key once a pack
  let twice = 0;
  for (let i = 0; i < 2000; i++) { const keys = draw('ten', opts(5e6 + i)).filter(c => c.key).map(c => c.car); if (new Set(keys).size !== keys.length) twice++; }
  check(twice === 0, 'no key twice in one pack');

  // ---- given and opened, in the save ----
  Progress.reset(); Progress.noSave = true;
  check(Packs.grant('career') === 'Career pack' && Packs.grant('special', { from: 'comet-hunt' }) && Packs.grant('ten', { n: 2 }) && Packs.grant('nonsense') === '', 'packs granted (and an unknown kind refused)');
  check(Packs.count('career') === 1 && Packs.count('special') === 1 && Packs.count('ten') === 2 && Packs.total() === 4 && Packs.held().length === 3, 'held: ' + JSON.stringify(Progress.data.packs));
  check(featuredFor('comet-hunt').map(c => c.id).join() === 'silvercomet', 'the Comet Hunt\'s featured cards: events.json featured (' + featuredFor('comet-hunt').map(c => c.id) + ')');
  const before = { ...(Progress.data.blueprints || {}) };
  const res = Packs.open('special', { from: 'comet-hunt', random: dice(7) });
  const added = {};
  for (const c of res?.cards || []) if (!c.key) added[c.car] = (added[c.car] || 0) + 1;
  check(!!res && Object.entries(added).every(([id, n]) => Ecu.blueprints(id) === (before[id] || 0) + n) && res.cards.at(-1).car === 'silvercomet', 'a special pack opened: each card a blueprint (Ecu.addBlueprints), its last the Silver Comet: ' + res?.cards.map(c => c.car + '/' + c.rarity).join(' '));
  check(Packs.count('special') === 0 && Packs.open('special', { from: 'comet-hunt' }) === null, 'opened, it is gone; none left to open');
  check(Progress.data.packLog.length === 1 && Progress.data.packLog[0].cards.length === 5, 'the opened pack is in the log');
  // a Bespoke key: the car is owned
  const keyRun = (() => { for (let s = 0; s < 500; s++) { const d = dice(9e6 + s), probe = draw('ten', { random: dice(9e6 + s) }); if (probe.some(c => c.key)) return d; } return null; })();
  if (keyRun) {
    const r = Packs.open('ten', { random: keyRun }), key = r.cards.find(c => c.key);
    check(!!key && Progress.owns(key.car), 'a Bespoke card gives the car\'s key (' + key?.car + ' owned)');
  } else check(false, 'no 10-pack with a key in 500 seeds');
  // the save code, out and back
  const kept = JSON.stringify({ packs: Progress.data.packs, packLog: Progress.data.packLog });
  const code = Progress.exportCode();
  Progress.reset(); Progress.noSave = true;
  check(Packs.total() === 0 && Progress.data.packLog.length === 0, 'reset: no packs');
  Progress.importCode(code); Progress.noSave = true;
  check(JSON.stringify({ packs: Progress.data.packs, packLog: Progress.data.packLog }) === kept, 'a save code out and back keeps the packs held and the log');
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['commuter'], packs: { career: 2, 'bad key!': 3, ten: -1, special: 1.5 }, packLog: [{ kind: 'career', cards: [{ car: 'lovebus', rarity: 'common', x: 1 }, 7] }, 'junk'] })));
  Progress.noSave = true;
  check(JSON.stringify(Progress.data.packs) === '{"career":2}' && JSON.stringify(Progress.data.packLog) === '[{"kind":"career","cards":[{"car":"lovebus","rarity":"common"}]}]', 'a code with junk packs is tidied: ' + JSON.stringify(Progress.data.packs));
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['commuter'] }))); Progress.noSave = true;
  check(JSON.stringify(Progress.data.packs) === '{}' && Array.isArray(Progress.data.packLog), 'a save from before packs: none held');

  // ---- where packs come from ----
  const list = careerLevels();
  check(list.length >= 10 && list.includes('hurricane') && list.includes('erupt'), 'career packs on every 5th level of the main list (' + list.length + ': ' + list.slice(0, 4).join(', ') + '...)');
  const lvl = g.levels.LEVELS.find(l => l.id === 'hurricane'), other = g.levels.LEVELS.find(l => l.id === 'expressway');
  check(Packs.levelDone(lvl, true) === 'Career pack' && Packs.levelDone(lvl, true) === '' && Packs.levelDone(other, true) === '' && Packs.levelDone(g.levels.LEVELS.find(l => l.id === 'erupt'), false) === '', 'a Career pack once, on a listed level\'s first delivery only');
  const g0 = Packs.count('special');
  check(Packs.eventDone('comet-hunt', true, false).length === 1 && Packs.eventDone('comet-hunt', false, false).length === 0 && Packs.eventDone('comet-hunt', false, true).length === 1 && Packs.count('special', 'comet-hunt') === g0 + 2, 'a special event: a pack for a stage done the first time, one with the prize');
  // the game's own path: a Career level delivered for the first time gives its pack, and says so
  Progress.reset(); Progress.noSave = true; Progress.data.unlocked = 99; Progress.data.tierBase = 99;
  Progress.data.cars.push(...CARS.filter(c => c.tier === 1 && !c.blue && !c.amphibious).map(c => c.id));
  g.select('hurricane');
  g.cars.useLevelCar(lvl.car, lvl.amphibious);
  g.Game.evil = false;
  if (g.Game.canStart) {
    g.Game.start(); g.Game.finish('delivered'); g.Game.toMenu();
    check(Packs.count('career') === 1, 'Hurricane delivered for the first time (Game.finish): a Career pack held');
  } else check(false, 'Hurricane would not start (' + g.cars.CAR.id + ')');

  // ---- "What's inside" (contents(), the Shop's contents sheet): every card of the pool listed, no more, no fewer; a
  // rarity's cards add up to its share of the odds; the shares add to 1; a special pack's featured cards at the top ----
  const { contents } = P;
  Progress.reset(); Progress.noSave = true;
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  for (const kind of Object.keys(Packs.data.kinds)) {
    const feats = kind === 'special' ? featuredFor('comet-hunt') : [];
    const c = contents(kind, { featured: feats }), pool = pools(), spec = Packs.data.kinds[kind];
    const want = { ...pool.evergreen, ...(spec.pool === 'all' ? { bespoke: pool.keys } : {}) };
    const listed = Object.fromEntries(c.groups.map(gr => [gr.rarity, gr.cards.map(x => x.car.id).sort()]));
    const exact = RARITIES.every(r => JSON.stringify(listed[r] || []) === JSON.stringify((want[r] || []).map(x => x.id).sort()));
    const sums = c.groups.map(gr => [gr.rarity, gr.cards.reduce((n, x) => n + x.chance, 0), gr.share]);
    const present = RARITIES.filter(r => want[r]?.length), weight = present.reduce((n, r) => n + Packs.data.odds[r], 0);
    const shares = c.odds.every(o => near(o.share, Packs.data.odds[o.rarity] / weight)) && c.odds.length === present.length;
    check(exact, kind + ': the cards listed are the pool exactly (' + c.total + ' cards: ' + c.groups.map(gr => gr.rarity + ' ' + gr.cards.length).join(', ') + ')');
    check(sums.every(([, sum, share]) => near(sum, share)) && near(c.odds.reduce((n, o) => n + o.share, 0), 1) && shares,
      kind + ': each rarity\'s cards add up to its share of the odds (' + sums.map(([r, sum]) => r + ' ' + (sum * 100).toFixed(2) + '%').join(', ') + ')');
    check(kind === 'special' ? c.featured.length === feats.length && feats.length > 0 && c.featured.every(f => f.chance >= f.lastSlot && f.chance <= 1 && rank(f.rarity) >= rank('epic'))
      : c.featured.length === 0, kind + ': featured cards ' + (kind === 'special' ? c.featured.map(f => f.car.id + ' ' + (f.chance * 100).toFixed(1) + '% a pack').join(', ') : 'none'));
  }
  // the featured chance, against packs drawn: about what contents() says
  {
    const feats = featuredFor('comet-hunt'), c = contents('special', { featured: feats }), roll = dice(77), N = 4000;
    const seen = Object.fromEntries(feats.map(f => [f.id, 0]));
    for (let i = 0; i < N; i++) { const ids = new Set(draw('special', { random: roll, featured: feats }).filter(x => x.featured).map(x => x.car)); for (const id of ids) seen[id]++; }
    const ok = c.featured.every(f => Math.abs(seen[f.car.id] / N - f.chance) < 0.03);
    check(ok, 'special: a featured card is in about the share of packs the sheet says (' + c.featured.map(f => f.car.id + ' ' + (seen[f.car.id] / N * 100).toFixed(1) + '% drawn, ' + (f.chance * 100).toFixed(1) + '% said').join('; ') + ')');
  }
  // a car added to the roster is listed with no edit (contents reads the roster when called)
  const extra = { id: 'fake-new', name: 'New One', tier: 3, evergreen: true, rarity: 'epic', price: 0 };
  const withExtra = contents('career', { cars: [...P.roster(), extra] });
  check(withExtra.groups.find(gr => gr.rarity === 'epic').cards.some(x => x.car.id === 'fake-new') && withExtra.total === contents('career').total + 1, 'a car added to the roster is listed at once');
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
