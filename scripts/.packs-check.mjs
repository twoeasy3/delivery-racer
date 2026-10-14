// A check of the card packs (src/delivery/packs.js, packs.json; BLUEPRINTS-NOTES.md "Card packs"): the pools by rarity
// (the ladder by star tier, a car's own `rarity` first, event cars never in the pool, keys only for cars not owned),
// a 10-pack always has an Epic or better, a special pack's last slot is a featured card (its true rarity), career
// packs hold only evergreen cards, the odds come out about as packs.json has them (seeded dice, many packs), the
// featured upgrade rate, and the packs held and the log in the save (a save code out and back, an old save); a pack given
// is opened at once in the flows (Packs.revealer), a pending one once; the reveal's cards (each its own, x1), its order (the
// best last), each card's progress bar before/after with the unlock and ECU-up flags; the four poses (carposes.js);
// FEATURED WEIGHTS (CHECKLIST 150): the last slot by weight, keys once and never owned, amounts per entry (x3 / x15),
// exhausted entries out with the weights shifted, the sheet's exact chances against seeded packs, the packs' featured lists
// checked (packProblems, through events.js problems()). ONE DEFINITION PER PACK (CHECKLIST 159): the packs by id
// (comet-special the Comet Hunt's), an old save's 'special:<event>' packs migrated, givenBy (career, event), the
// GENERATED words naming every guarantee (and a blurb over them), the free Daily pack's draw.
//   node scripts/.packs-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const P = await g.load('packs.js');
const { Packs, RARITIES, rarityOf, pools, draw, careerLevels, featuredOf, featuredRarity } = P;
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
  // (the Bespoke pool, 12-Oct: the keys of the Bespoke key cars not owned, never a garage car; their blueprints Legendary, never evergreen)
  const ALLBESPOKE = [...EVENT_CARS, ...(g.cars.BESPOKE_CARS || [])].filter(c => c.bespoke);
  const BESPOKE = ALLBESPOKE.filter(c => !c.noPacks); // (noPacks: the Silver Comet, Snowcat, Hot Dog Car: in no regular pack, key or blueprints; the owner, 12-Oct)
  check(BESPOKE.length >= 2 && ALLBESPOKE.some(c => c.id === 'silvercomet') && real.keys.length === BESPOKE.filter(c => c.keyAvailable !== false).length && real.keys.every(c => c.bespoke && !CARS.includes(c) && c.keyAvailable !== false),
    'the keys (Bespoke): exactly the Bespoke key cars with a key to be had (not the Snowcat and Hot Dog Car: keyAvailable false) not owned, no garage car (' + real.keys.map(c => c.id).join(' ') + ')');
  check(BESPOKE.every(c => rarityOf(c) === 'legendary' && Ecu.rarity(c) === 'legendary' && real.bespoke.legendary.includes(c) && !inPool.includes(c)),
    'a Bespoke key car\'s blueprints are Legendary cards, in the bespoke pool and never the evergreen one');
  check(['silvercomet', 'snocat', 'hotdog'].every(id => ALLBESPOKE.find(c => c.id === id)?.noPacks) && Object.values(P.poolOf(Packs.data.packs.standard)).flat().every(c => !c.noPacks) && Object.values(P.poolOf(Packs.data.packs.ten)).flat().every(c => !c.noPacks), 'the Silver Comet, the Snowcat and the Hot Dog Car are in no regular pack: no key, no blueprints (the Comet Hunt still features the Comet)');
  const owned1 = BESPOKE.find(c => c.keyAvailable !== false);
  const ownsComet = pools({ owned: (id) => id === owned1.id || id === 'commuter' });
  check(!ownsComet.keys.some(c => c.id === owned1.id) && ownsComet.keys.length === BESPOKE.filter(c => c.keyAvailable !== false).length - 1, 'a key owned is out of the Bespoke pool');
  {
    const std = P.poolOf(Packs.data.packs.standard), car = P.poolOf(Packs.data.packs.career), spc = P.poolOf(Packs.data.packs['comet-special']);
    const where = Object.keys(Packs.data.packs).filter(k => Packs.data.packs[k].bespokeBlueprints);
    check(BESPOKE.every(c => std.legendary.includes(c) && (c.keyAvailable === false ? !std.bespoke.includes(c) : std.bespoke.includes(c))) && BESPOKE.every(c => !car.legendary.includes(c) && !spc.legendary.includes(c)) && !car.bespoke && !spc.bespoke,
      'the standard pack holds their keys and blueprints; career and special packs neither (packs.json bespokeBlueprints: ' + where.join(', ') + ')');
  }
  for (const r of RARITIES.filter(r => r !== 'bespoke')) console.log('        ' + r.padEnd(10) + (real.evergreen[r] || []).map(c => c.id).join(' '));
  // a car's own rarity first; a 1-gold blueprint car is common; the roster read when drawn
  const fakes = [
    { id: 'fake-bubble', name: 'Bubble', tier: 1, evergreen: true, price: 0 },
    { id: 'fake-jet', name: 'Jet', tier: 5, evergreen: true, rarity: 'legendary', price: 0 },
    { id: 'fake-coupe', name: 'Coupe', tier: 3, evergreen: true, rarity: 'epic', price: 0 },
  ];
  check(rarityOf(fakes[0]) === 'common' && rarityOf(fakes[1]) === 'legendary' && rarityOf(fakes[2]) === 'epic', 'a car\'s own rarity is read first; a 1-gold blueprint car is common');
  const withFakes = [...CARS, ...BESPOKE, ...fakes]; // (the Bespoke key cars too: their keys are the Bespoke rarity's cards)
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
  // special: the last slot featured, of its true rarity (no Epic-or-better promise, the owner 12-Oct); featured cards only from the list; one card a slot
  const comet = EVENT_CARS[0], feats = [comet, by('classicgt')];
  let lastOk = 0, featuredSlots = 0, upgraded = 0, slots = 0, foreign = 0, higherOk = true;
  for (let i = 0; i < N; i++) {
    const cards = draw('comet-special', opts(3e6 + i, { featured: feats }));
    const last = cards.at(-1);
    if (cards.length === 5 && last.featured && feats.some(c => c.id === last.car && last.rarity === featuredRarity(c))) lastOk++;
    for (const c of cards.slice(0, -1)) {
      slots++;
      if (c.featured) { featuredSlots++; if (!feats.some(f => f.id === c.car)) foreign++; }
      if (c.upgraded) upgraded++;
      if (c.upgraded && !c.featured && rank(c.rarity) < rank('uncommon')) higherOk = false; // (an upgraded filler is at least one rarity up from common)
    }
  }
  check(lastOk === N, 'a special pack: its last slot is a featured card, of its true rarity (' + lastOk + ' of ' + N + ')');
  check(foreign === 0, 'featured cards only from the featured list');
  const spec = Packs.data.packs['comet-special'].featured, wantUp = spec.upgradeChance, wantFeat = spec.upgradeChance * (1 - (1 - spec.featuredChance) ** feats.length);
  check(Math.abs(upgraded / slots - wantUp) < 0.02, 'slots upgraded: ' + (upgraded / slots * 100).toFixed(1) + '% (packs.json ' + wantUp * 100 + '%)');
  check(Math.abs(featuredSlots / slots - wantFeat) < 0.015, 'slots that turned featured (2 featured cars, 20% each when a slot upgrades): ' + (featuredSlots / slots * 100).toFixed(1) + '% (wanted ' + (wantFeat * 100).toFixed(1) + '%)');
  check(higherOk, 'an upgraded slot with no featured hit is a higher-rarity filler card');
  const noFeat = draw('comet-special', opts(42, { featured: [] }));
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
  check(Packs.grant('career') === 'Career pack' && Packs.grant('comet-special') && Packs.grant('ten', { n: 2 }) && Packs.grant('nonsense') === '', 'packs granted (and an unknown kind refused)');
  check(Packs.count('career') === 1 && Packs.count('comet-special') === 1 && Packs.count('ten') === 2 && Packs.total() === 4 && Packs.held().length === 3, 'held: ' + JSON.stringify(Progress.data.packs));
  check(featuredOf('comet-special').map(f => f.car.id + (f.key ? ' key' : ' x' + f.amount) + ' w' + f.weight).join() === 'silvercomet x3 w9,silvercomet x15 w1,silvercomet key w0.0503', 'the Comet Hunt\'s featured entries: the pack\'s own featured.entries (' + featuredOf('comet-special').map(f => f.car.id + ' x' + f.amount + ' w' + f.weight) + ')');
  const before = { ...(Progress.data.blueprints || {}) };
  const res = Packs.open('comet-special', { random: dice(7) });
  const added = {};
  for (const c of res?.cards || []) if (!c.key) added[c.car] = (added[c.car] || 0) + c.n;
  check(!!res && Object.entries(added).every(([id, n]) => Ecu.blueprints(id) === (before[id] || 0) + n) && res.cards.at(-1).car === 'silvercomet', 'a special pack opened: each card a blueprint (Ecu.addBlueprints), its last the Silver Comet: ' + res?.cards.map(c => c.car + '/' + c.rarity).join(' '));
  check(Packs.count('comet-special') === 0 && Packs.open('comet-special') === null, 'opened, it is gone; none left to open');
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
  // a save from before ONE DEFINITION PER PACK (v1.1.53: packs held by kind, a special pack as 'special:<event>'): its
  // packs are migrated to today's ids (packid.js), the old log kept, and the purchase counters empty
  Progress.importCode('DR1.' + btoa(JSON.stringify({ unlocked: 3, cars: ['commuter'], packs: { 'special:comet-hunt': 2, special: 1, 'special:an-old-event': 1, career: 1, ten: 2 },
    packLog: [{ kind: 'special', from: 'comet-hunt', cards: [{ car: 'silvercomet', rarity: 'legendary', featured: true }] }] })));
  Progress.noSave = true;
  check(JSON.stringify(Progress.data.packs) === '{"comet-special":4,"career":1,"ten":2}' && Progress.data.packLog[0]?.kind === 'special' && JSON.stringify(Progress.data.packBuys) === '{}',
    'an old save\'s packs (special:comet-hunt 2, special 1, special:an-old-event 1, career 1, ten 2) load as ' + JSON.stringify(Progress.data.packs) + ', its log kept, no purchase counters');
  check(Packs.total() === 7 && Packs.held().map(h => h.id + ':' + h.count + (h.from ? '@' + h.from : '')).join() === 'ten:2,career:1,comet-special:4@comet-hunt' && !!Packs.next() && Packs.count('comet-special') + Packs.count('ten') + Packs.count('career') === 6,
    '...held in packs.json\'s order (' + Packs.held().map(h => h.id + ':' + h.count).join(', ') + '), and they open');
  Progress.reset(); Progress.noSave = true;
  Progress.data.packs = { 'special:comet-hunt': 1 }; // (written straight in, as an old copy of the save could be)
  check(Packs.count('comet-special') === 1 && Packs.count('special', 'comet-hunt') === 1 && Packs.grant('special', { from: 'comet-hunt' }) === 'Comet Hunt Special' && JSON.stringify(Progress.data.packs) === '{"comet-special":2}'
    && P.packIdOf('special') === 'comet-special' && P.packIdOf('nonsense') === null,
    'an old key read straight from the save is migrated; the old Packs.grant(\'special\', { from: event }) gives its pack (the debug ?pack=special too)');
  Progress.reset(); Progress.noSave = true;

  // ---- where packs come from ----
  const list = careerLevels();
  check(list.length >= 10 && list.includes('hurricane') && list.includes('erupt'), 'career packs on every 5th level of the main list (' + list.length + ': ' + list.slice(0, 4).join(', ') + '...)');
  const lvl = g.levels.LEVELS.find(l => l.id === 'hurricane'), other = g.levels.LEVELS.find(l => l.id === 'expressway');
  check(Packs.levelDone(lvl, true) === 'Career pack' && Packs.levelDone(lvl, true) === '' && Packs.levelDone(other, true) === '' && Packs.levelDone(g.levels.LEVELS.find(l => l.id === 'erupt'), false) === '', 'a Career pack once, on a listed level\'s first delivery only');
  const g0 = Packs.count('comet-special');
  check(Packs.eventDone('comet-hunt', true, false).length === 1 && Packs.eventDone('comet-hunt', false, false).length === 0 && Packs.eventDone('comet-hunt', false, true).length === 1 && Packs.count('comet-special') === g0 + 2, 'a special event: a pack for a stage done the first time, one with the prize');
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

  // ---- opened at once (the owner, 12-Oct: no Packs page; a pack bought or earned opens immediately) ----
  // with a reveal (the screen's Packs.revealer; here a stand-in that opens what is held, as the screen does), a pack a
  // flow gives is opened in the flow itself; with none (the page closed in between), it is held, and opened once later
  Progress.reset(); Progress.noSave = true;
  const opened = [];
  Packs.revealer = () => { let r; while ((r = Packs.next())) opened.push(r); };
  const log0 = (Progress.data.packLog || []).length;
  check(Packs.levelDone(lvl, true) === 'Career pack' && Packs.total() === 0 && opened.length === 1 && opened[0].kind === 'career' && Progress.data.packLog.length === log0 + 1,
    'a Career level\'s first delivery: its pack opened at once (none left held; ' + (opened[0]?.cards.length || 0) + ' cards given)');
  opened.length = 0;
  check(Packs.eventDone('comet-hunt', true, true).length === 2 && Packs.total() === 0 && opened.length === 2 && opened.every(r => r.kind === 'comet-special' && r.from === 'comet-hunt'),
    'a special event\'s stage and prize: both packs opened at once');
  Packs.revealer = null;
  Packs.grant('standard');
  check(Packs.total() === 1, 'no reveal to hand (the page closed): the pack is held in the save, pending');
  const bpBefore = JSON.stringify(Progress.data.blueprints || {});
  const once = Packs.next(), again = Packs.next();
  check(!!once && once.kind === 'standard' && again === null && Packs.total() === 0 && JSON.stringify(Progress.data.blueprints) !== bpBefore,
    'a pending pack is opened ONCE: a second open (a double tap) finds none, and gives nothing');
  // every card its own in the reveal (no stacking today): each shows x1
  const twin = [{ car: 'lovebus', rarity: 'common' }, { car: 'lovebus', rarity: 'common' }, { car: 'hearse', rarity: 'common' }];
  const rc = P.revealCards(twin);
  check(rc.length === 3 && rc.every(c => c.n === 1), 'the reveal: identical cards are NOT stacked, each its own card with x1 (' + rc.map(c => c.car + ' x' + c.n).join(', ') + ')');
  // the best card last: a featured card last unless a card of a HIGHER rarity came up; with no featured card, the best
  const ids = (list) => P.revealOrder(list).map(c => c.car).join(' ');
  check(ids([{ car: 'a', rarity: 'epic', featured: true }, { car: 'b', rarity: 'common' }, { car: 'c', rarity: 'uncommon' }]) === 'b c a'
    && ids([{ car: 'b', rarity: 'common' }, { car: 'f', rarity: 'legendary', featured: true }, { car: 'c', rarity: 'epic' }]) === 'b c f'
    && ids([{ car: 'u', rarity: 'legendary', upgraded: true }, { car: 'b', rarity: 'common' }, { car: 'f', rarity: 'epic', featured: true }]) === 'b f u'
    && ids([{ car: 'x', rarity: 'common' }, { car: 'y', rarity: 'epic' }, { car: 'z', rarity: 'uncommon' }]) === 'x z y',
  'the reveal order: the featured card last, unless a card upgraded above it (then that one); else the best card last');
  {
    let all = 0, ok = 0;
    for (let i = 0; i < 300; i++) {
      const cards = P.revealOrder(draw('comet-special', { random: dice(8e6 + i), featured: featuredOf('comet-special') }));
      const top = Math.max(...cards.map(c => rank(c.rarity))), last = cards.at(-1);
      all++; if (rank(last.rarity) === top && (last.featured || !cards.some(c => c.featured && rank(c.rarity) === top))) ok++;
    }
    check(ok === all, 'special packs drawn: the last card turned is always the best (featured where it ties): ' + ok + ' of ' + all);
  }
  // each card's progress bar, before and after it, in the order turned: a later card of the same car starts where the
  // earlier left it; the flags for an unlock and an ECU up
  {
    Progress.reset(); Progress.noSave = true;
    const filler = (g.cars.FILLER_CARS || []).find(c => Ecu.max(c) >= 2) || (g.cars.FILLER_CARS || [])[0];
    const keyCar = CARS.find(c => c.id === 'lovebus');
    const x = Ecu.x(filler), xk = Ecu.x(keyCar);
    Progress.data.blueprints = { [filler.id]: x - 2, [keyCar.id]: xk - 1 };
    const pack = [{ car: filler.id, rarity: 'common' }, { car: keyCar.id, rarity: 'common' }, { car: filler.id, rarity: 'common' }, { car: filler.id, rarity: 'common' }];
    for (const c of pack) Ecu.addBlueprints(c.car, 1); // (as open() gives them)
    const pr = P.revealProgress(pack);
    const chain = pr[0].after.bp === pr[2].before.bp && pr[2].after.bp === pr[3].before.bp && pr[0].before.bp === x - 2 && pr[3].after.bp === x + 1;
    check(chain, 'progress per card in order: ' + filler.id + ' ' + pr.filter((_, i) => i !== 1).map(p => p.before.bp + '>' + p.after.bp).join(', ') + ' (X ' + x + ')');
    check(!pr[0].unlocks && pr[2].unlocks && pr[2].ecuUp && pr[2].before.ecu === 0 && pr[2].after.ecu === 1 && !pr[3].unlocks && !pr[3].ecuUp && pr[3].after.have === 1,
      'a blueprint car: the card that reaches X blueprints UNLOCKS it (ECU 0 to 1, the bar glows); the next does not');
    check(pr[1].ecuUp && !pr[1].unlocks && pr[1].before.ecu === 1 && pr[1].after.ecu === 2 && !pr[1].after.unlocked,
      'a key car without its key: its blueprints take it up an ECU (1 to 2: ECU up), still locked (no key)');
    Packs.revealer = null;
  }
  // the four poses (top, hero, front, rear; no low, no side): a stable pick by car id, and a pack's cards varied so neighbours differ
  {
    const { POSE_NAMES, posePick, variedPoses } = await g.load('carposes.js');
    const roster = P.roster().map(c => c.id);
    const stable = roster.every(id => posePick(id) === posePick(id) && POSE_NAMES.includes(posePick(id)));
    const counts = Object.fromEntries(POSE_NAMES.map(p => [p, roster.filter(id => posePick(id) === p).length]));
    check(stable && POSE_NAMES.join() === 'top,hero,front,rear' && Object.values(counts).every(n => n > 0), 'a car\'s pose is a stable pick by its id: ' + JSON.stringify(counts));
    let differ = true;
    for (let i = 0; i < 200; i++) { const ids2 = draw('ten', { random: dice(6e6 + i) }).map(c => c.car), v = variedPoses(ids2); if (v.some((p, j) => j > 0 && p === v[j - 1])) differ = false; }
    const same = variedPoses(['lovebus', 'lovebus', 'lovebus', 'lovebus', 'lovebus', 'lovebus']);
    check(differ && same.every((p, j) => POSE_NAMES.includes(p) && (j === 0 || p !== same[j - 1])), 'a pack\'s cards: neighbouring cards never share a pose (200 10-packs; six of one car: ' + same.join(', ') + ')');
  }

  // the pack screens' pictures: every one asked for in the GOOD livery, never a side that follows the player (the
  // owner, 12-Oct), and never the old carshots photos (a reading of the source: the screens are only seen in a browser)
  {
    const { readFileSync } = await import('node:fs');
    const bad = [];
    for (const f of ['render/packs.js', 'render/packcontents.js', 'render/shop.js']) {
      const src = readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8');
      const calls = [...src.matchAll(/\b(drawSoon|stillSoon|observer\.watch|stillCar|stillReady)\(([^)\n][^\n]*)/g)]; // (not the Shop's own drawSoon(): its redraw)
      if (!calls.length && f !== 'render/shop.js') bad.push(f + ': no picture asked for');
      for (const [, fn, rest] of calls) if (!/side: 'good'/.test(rest)) bad.push(f + ': ' + fn + '(' + rest.slice(0, 50));
      if (/carshots/.test(src.replace(/\/\/.*$/gm, ''))) bad.push(f + ': uses carshots');
    }
    check(!bad.length, 'the pack screens (the reveal, What\'s inside, the Shop) ask for every picture in the Good livery, no old photos' + (bad.length ? ': ' + bad.join('; ') : ''));
  }

  // ---- "What's inside" (contents(), the Shop's contents sheet): every card of the pool listed, no more, no fewer; a
  // rarity's cards add up to its share of the odds; the shares add to 1; a special pack's featured cards at the top ----
  const { contents } = P;
  Progress.reset(); Progress.noSave = true;
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  for (const kind of Object.keys(Packs.data.packs)) {
    const feats = featuredOf(kind); // (the pack's own featured entries: [] for a pack with none)
    const c = contents(kind, { featured: feats }), pool = pools(), spec = Packs.data.packs[kind];
    const want = Object.fromEntries(RARITIES.map(r => [r, [...(pool.evergreen[r] || []), ...(spec.bespokeBlueprints ? pool.bespoke[r] || [] : []), ...(r === 'bespoke' && spec.pool === 'all' ? pool.keys : [])]]));
    const listed = Object.fromEntries(c.groups.map(gr => [gr.rarity, gr.cards.map(x => x.car.id).sort()]));
    const exact = RARITIES.every(r => JSON.stringify(listed[r] || []) === JSON.stringify((want[r] || []).map(x => x.id).sort()));
    const sums = c.groups.map(gr => [gr.rarity, gr.cards.reduce((n, x) => n + x.chance, 0), gr.share]);
    const present = RARITIES.filter(r => want[r]?.length), weight = present.reduce((n, r) => n + Packs.data.odds[r], 0);
    const shares = c.odds.every(o => near(o.share, Packs.data.odds[o.rarity] / weight)) && c.odds.length === present.length;
    check(exact, kind + ': the cards listed are the pool exactly (' + c.total + ' cards: ' + c.groups.map(gr => gr.rarity + ' ' + gr.cards.length).join(', ') + ')');
    check(sums.every(([, sum, share]) => near(sum, share)) && near(c.odds.reduce((n, o) => n + o.share, 0), 1) && shares,
      kind + ': each rarity\'s cards add up to its share of the odds (' + sums.map(([r, sum]) => r + ' ' + (sum * 100).toFixed(2) + '%').join(', ') + ')');
    check(Packs.data.packs[kind].featured ? c.featured.length === feats.length && feats.length > 0 && c.featured.every(f => f.chance >= f.lastSlot - 1e-9 && f.chance <= 1 + 1e-12 && f.rarity === (f.key ? 'bespoke' : featuredRarity(f.car)))
      : c.featured.length === 0, kind + ': featured cards ' + (Packs.data.packs[kind].featured ? c.featured.map(f => f.car.id + ' ' + (f.chance * 100).toFixed(1) + '% a pack').join(', ') : 'none'));
  }
  // the featured chance, against packs drawn: about what contents() says
  {
    const feats = featuredOf('comet-special'), c = contents('comet-special', { featured: feats }), roll = dice(77), N = 4000;
    const seen = c.featured.map(() => 0); // (by entry: the x3 and the x15 of the same car apart, by the slot's n)
    for (let i = 0; i < N; i++) {
      const cards = draw('comet-special', { random: roll, featured: feats }).filter(x => x.featured);
      c.featured.forEach((f, j) => { if (cards.some(x => x.car === f.car.id && x.n === f.amount)) seen[j]++; });
    }
    const ok = c.featured.every((f, j) => Math.abs(seen[j] / N - f.chance) < 0.03);
    check(ok, 'special: a featured entry is in about the share of packs the sheet says (' + c.featured.map((f, j) => f.car.id + ' x' + f.amount + ' ' + (seen[j] / N * 100).toFixed(1) + '% drawn, ' + (f.chance * 100).toFixed(1) + '% said').join('; ') + ')');
  }
  // a car added to the roster is listed with no edit (contents reads the roster when called)
  const extra = { id: 'fake-new', name: 'New One', tier: 3, evergreen: true, rarity: 'epic', price: 0 };
  const withExtra = contents('career', { cars: [...P.roster(), extra] });
  check(withExtra.groups.find(gr => gr.rarity === 'epic').cards.some(x => x.car.id === 'fake-new') && withExtra.total === contents('career').total + 1, 'a car added to the roster is listed at once');
  // the count a slot gives is data (packs.json `amount` / `amounts`), never fixed: a number, or [min, max]; a key card is always one
  const Pk = await g.load('packs.js');
  check(Pk.amountFor({ amount: 3 }, 'common') === 3 && Pk.amountFor({ amount: 2, amounts: { epic: 5 } }, 'epic') === 5 && Pk.amountFor({}, 'common') === 1,
    'a slot\'s amount comes from the kind: its `amount`, a rarity\'s `amounts`, else 1');
  const spread = new Set(Array.from({ length: 200 }, () => Pk.amountFor({ amount: [2, 4] }, 'common')));
  check([...spread].every(n => n >= 2 && n <= 4) && spread.size === 3, 'an amount [2, 4] gives 2, 3 or 4 (all three seen)');
  const drawn = Pk.draw('standard', { spec: { ...Pk.draw ? {} : {}, size: 5, pool: 'all', baseAmount: 3, doubleChance: 0 } });
  check(drawn.every(c => c.key ? c.n === 1 : c.n === 3), 'a drawn pack carries each card\'s amount (3 here; a key is 1)');

  // ---- a slot of many copies (the owner, 12-Oct: "the extra cards need to animate and flick onto the pile. Each card that
  // flicks on, increases the badge by 1"): flickPlan's schedule, a tap's complete state, reduced motion ----
  {
    const { flickPlan, flickState, FLICK } = Pk;
    const one = flickPlan(1);
    check(one.copies.length === 0 && one.total === 0 && flickState(one, Infinity).badge === 1, 'flicks: one copy (or a key) has none, the badge stays x1');
    for (const n of [2, 3, 15, 40]) {
      const p = flickPlan(n, { seed: 42 });
      const c = p.copies, gaps = c.slice(1).map((x, i) => x.launch - c[i].launch);
      const mono = c.every((x, i) => x.launch < x.land && (!i || (x.land > c[i - 1].land && x.launch > c[i - 1].launch)));
      const badges = c.map(x => x.badge).join(',') === Array.from({ length: n - 1 }, (_, i) => i + 2).join(',');
      const fresh = c.filter(x => x.fresh), layersOk = fresh.length === Math.min(n - 1, FLICK.layers) && new Set(fresh.map(x => x.layer)).size === fresh.length && c.every(x => x.layer < FLICK.layers);
      const air = Math.max(0, ...Array.from({ length: Math.ceil(p.total / 5) }, (_, k) => flickState(p, k * 5).flying.length)); // (at most two copies in the air: two thrown clones)
      check(mono && badges && layersOk && p.total < 2000 && air <= 2 && (n > 15 || gaps.every(gp => gp >= 80 && gp <= (n <= 4 ? 345 : 345 - (n - 4) * 20))),
        'flicks: ' + n + ' copies: landings in order, the badge 2..' + n + ', at most ' + FLICK.layers + ' pile layers (' + fresh.length + '), at most two in the air (' + air + '), done in '
        + p.total + ' ms' + (gaps.length ? ' (gaps ' + gaps[0] + ' down to ' + gaps.at(-1) + ' ms)' : ''));
      const st = flickState(p, Infinity);
      check(st.badge === n && st.landed === n - 1 && st.flying.length === 0, 'flicks: ' + n + ': a tap completes it: every copy landed, the badge x' + n);
    }
    const big = flickPlan(15, { seed: 3 });
    check(big.total >= 1200 && big.total <= 1800, 'flicks: 15 copies take ' + big.total + ' ms (wanted about 1.2 to 1.8 s)');
    const mid = flickState(big, 450);
    check(mid.badge >= 3 && mid.badge <= 5 && mid.flying.length >= 1, 'flicks: 0.45 s in (the debug &flick=0.45 still): badge x' + mid.badge + ', ' + mid.flying.length + ' in the air');
    check(JSON.stringify(flickPlan(15, { seed: 9 })) === JSON.stringify(flickPlan(15, { seed: 9 })), 'flicks: a slot\'s scatter is stable for its seed');
    const still = flickPlan(15, { reduced: true });
    check(still.total === 0 && still.copies.every(x => x.launch === 0 && x.land === 0) && flickState(still, 0).badge === 15, 'flicks: reduced motion: nothing thrown, the badge x15 at once');
    // the reveal's source: transforms and opacity only, no layout read in the flicks
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/delivery/render/flick.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
    check(!/offset(Width|Height|Top|Left)|getBoundingClientRect|getComputedStyle|requestAnimationFrame/.test(src), 'flicks: render/flick.js reads no layout and runs no per-frame script');
  }
  // the debug amounts (?pack=ten&amount=3 ...): every non-key slot that many; alternating; by rarity
  {
    const { debugAmounts } = Pk, q = (s) => debugAmounts(new URLSearchParams(s));
    const alt = q('amounts=3,15'), by = q('amounts=common:3,epic:15');
    check(q('') === null && q('amount=3')({ rarity: 'epic' }, 4) === 3 && [0, 1, 2, 3].map(i => alt({}, i)).join() === '3,15,3,15'
      && by({ rarity: 'common' }, 0) === 3 && by({ rarity: 'epic' }, 0) === 15 && by({ rarity: 'uncommon' }, 0) == null,
    'debug amounts: &amount=3, &amounts=3,15 alternating, &amounts=common:3,epic:15 by rarity');
  }
  // opened for real: the amounts given through Ecu.addBlueprints, n each; a key is one; the reveal's bar steps copy by copy
  {
    Progress.reset(); Progress.noSave = true;
    const kinds = Packs.data.packs, keep = JSON.stringify(kinds.ten);
    const sumBy = (cards) => cards.filter(c => !c.key).reduce((m, c) => ({ ...m, [c.car]: (m[c.car] || 0) + (c.given ?? c.n) }), {}); // (given: what the save took; the cap of 14-Oct can cut a stack: c.cut is the stack as dealt)
    let ok = true, steps = true, seenN = new Set();
    try {
      kinds.ten.baseAmount = [2, 4]; kinds.ten.doubleChance = 0; kinds.ten.amounts = { common: 3, epic: 15 };
      for (let i = 0; i < 30; i++) {
        const before = {}; for (const id of new Set([...P.roster(), ...EVENT_CARS, ...(g.cars.BESPOKE_CARS || [])].map(c => c.id))) before[id] = Ecu.blueprints(id) || 0;
        const r = Packs.open('ten', { free: true, random: dice(900 + i) });
        for (const c of r.cards) {
          const dealt = c.cut ?? c.n;
          seenN.add(dealt);
          if (c.key ? dealt !== 1 : c.rarity === 'common' ? dealt !== 3 : c.rarity === 'epic' ? dealt !== 15 : !(dealt >= 2 && dealt <= 4)) ok = false;
        }
        for (const [id, n] of Object.entries(sumBy(r.cards))) if ((Ecu.blueprints(id) || 0) - (before[id] || 0) !== n) ok = false;
        const cards = P.revealOrder(P.revealCards(r.cards)), prog = P.revealProgress(cards);
        prog.forEach((p, j) => {
          if (!p.before) return;
          const c = cards[j], s = p.steps;
          if (c.key ? s.length !== 1 : s.length !== (c.given ?? c.n) || s.some((x, k) => x.bp !== p.before.bp + k + 1)) steps = false;
          if (s.length && JSON.stringify(s.at(-1)) !== JSON.stringify(p.after)) steps = false;
        });
      }
    } finally { kinds.ten = JSON.parse(keep); }
    check(ok, 'opened with packs.json "baseAmount": [2, 4] (no doubling), "amounts": { common: 3, epic: 15 }: each card that many (' + [...seenN].sort((a, b) => a - b).join(' ') + ' seen), given through Ecu.addBlueprints; keys one');
    check(steps, 'the reveal\'s bar: one step a copy, each a blueprint more, the last where the slot leaves the car');
    Progress.reset(); Progress.noSave = true;
    const r = Packs.open('ten', { free: true, random: dice(5), amountOf: (c, i) => (i % 2 ? 15 : 3) });
    check(r.cards.every((c, i) => c.key ? c.n === 1 : (c.cut ?? c.n) === (i % 2 ? 15 : 3)), 'an amount put over the kind\'s (the debug route\'s amountOf): 3 and 15 by slot, a key still one');
  }
  // ---- FEATURED WEIGHTS (the owner, 12-Oct; CHECKLIST 150): entries { car, weight, amount, key }, the last slot by
  // weight, keys once and never owned, amounts per entry, exhausted entries out with the weights shifted, the sheet's
  // exact chances against seeded packs, and events.js's check of the list ----
  {
    const { featuredEntries, featuredChances, contents: sheet } = P;
    const NW = 6000, none = () => false;
    const tally = (list, seed, { owned = none, maxed = none, kind = 'comet-special' } = {}) => {
      const last = {}, inPack = {}, keyTwice = { n: 0 }, ns = new Set(), all = [];
      for (let i = 0; i < NW; i++) {
        const cards = draw(kind, { random: dice(seed + i), featured: list, owned, maxed });
        all.push(cards);
        const l = cards.at(-1), id = (c) => (c.key ? 'key:' : '') + c.car + (c.featured && !c.key && c.n !== Packs.data.packs['comet-special'].baseAmount ? ':' + c.n : '');
        if (l.featured) last[id(l)] = (last[id(l)] || 0) + 1; else last.filler = (last.filler || 0) + 1;
        for (const k of new Set(cards.filter(c => c.featured).map(id))) inPack[k] = (inPack[k] || 0) + 1;
        const keys = cards.filter(c => c.key).map(c => c.car);
        if (new Set(keys).size !== keys.length) keyTwice.n++;
        for (const c of cards.filter(c => c.featured)) ns.add(c.n);
      }
      return { last, inPack, keyTwice: keyTwice.n, ns, all };
    };
    const share = (t, k) => (t.last[k] || 0) / NW;
    const pctS = (x) => (x * 100).toFixed(1) + '%';
    // (a) Epic, Legendary, Legendary declared 1:1:1: each a third of the last slots, by weight not by rarity
    const ell = [{ car: 'gullwing', weight: 1 }, { car: 'jetcar', weight: 1 }, { car: 'dragster', weight: 1 }];
    const t1 = tally(ell, 11e6);
    check(['gullwing', 'jetcar', 'dragster'].every(id => Math.abs(share(t1, id) - 1 / 3) < 0.025),
      '1:1:1 (Epic gullwing, Legendary jetcar, dragster): each about a third of the last slots over ' + NW + ' packs (' + ['gullwing', 'jetcar', 'dragster'].map(id => id + ' ' + pctS(share(t1, id))).join(', ') + ')');
    check(t1.all.every(cards => cards.filter(c => c.featured).every(c => c.rarity === (c.car === 'gullwing' ? 'epic' : 'legendary'))),
      'a featured card keeps its true rarity (gullwing Epic, jetcar/dragster Legendary)');
    // a featured Uncommon is Uncommon (no lift to Epic: the owner, 12-Oct)
    const unc = draw('comet-special', { random: dice(5), featured: ['postvan'] }).at(-1);
    check(unc.featured && unc.car === 'postvan' && unc.rarity === 'uncommon', 'a featured Uncommon (postvan) is shown as Uncommon, featured (' + unc.rarity + ')');
    // (b) Legendary x3 + a Bespoke key, 3:3:3:1: the key about a tenth of the last slots; a key never twice; an owned key never
    const llb = [{ car: 'rocketfin', weight: 3 }, { car: 'swancar', weight: 3 }, { car: 'solarracer', weight: 3 }, { car: 'monowheel', weight: 1, key: true }];
    const t2 = tally(llb, 12e6);
    check(Math.abs(share(t2, 'key:monowheel') - 0.1) < 0.012 && ['rocketfin', 'swancar', 'solarracer'].every(id => Math.abs(share(t2, id) - 0.3) < 0.025),
      '3:3:3:1 with a Bespoke key: the key about 1/10 of the last slots (' + pctS(share(t2, 'key:monowheel')) + '), each Legendary about 3/10 (' + ['rocketfin', 'swancar', 'solarracer'].map(id => pctS(share(t2, id))).join(', ') + ')');
    check(t2.all.every(cards => cards.filter(c => c.key).every(c => c.rarity === 'bespoke' && c.n === 1 && c.featured)), 'a featured key card is Bespoke, x1');
    const heavyKey = [{ car: 'rocketfin', weight: 1 }, { car: 'monowheel', weight: 20, key: true }];
    const t3 = tally(heavyKey, 13e6);
    check(t2.keyTwice === 0 && t3.keyTwice === 0 && (t3.inPack['key:monowheel'] || 0) > NW * 0.9, 'a key is never given twice in one pack (a key weighted 20:1 too: in ' + pctS((t3.inPack['key:monowheel'] || 0) / NW) + ' of packs, never twice)');
    const ownedKey = (id) => id === 'monowheel';
    const t4 = tally(llb, 14e6, { owned: ownedKey });
    check(!t4.all.some(cards => cards.some(c => c.key)) && ['rocketfin', 'swancar', 'solarracer'].every(id => Math.abs(share(t4, id) - 1 / 3) < 0.025),
      'a key already owned never drops; the weights shift to 3:3:3 (' + ['rocketfin', 'swancar', 'solarracer'].map(id => pctS(share(t4, id))).join(', ') + ')');
    // (c) the sheet's chances (worked out exactly) against the simulation: the last slot's share and the chance a pack
    const agree = (list, t, marks = {}) => {
      const c = sheet('comet-special', { featured: list, owned: marks.owned || none, maxed: marks.maxed || none });
      const bad = [];
      for (const f of c.featured) {
        const k = (f.key ? 'key:' : '') + f.car.id + (f.key || !f.amount ? '' : ':' + f.amount);
        const drawnLast = (t.last[k] || 0) / NW, drawnPack = (t.inPack[k] || 0) / NW;
        if (Math.abs(drawnLast - f.lastSlot) > 0.02 || Math.abs(drawnPack - f.chance) > 0.025) bad.push(k + ' last ' + pctS(drawnLast) + '/' + pctS(f.lastSlot) + ' pack ' + pctS(drawnPack) + '/' + pctS(f.chance));
      }
      return { ok: !bad.length, c, bad, line: c.featured.map(f => (f.key ? 'key:' : '') + f.car.id + (f.amount ? ' x' + f.amount : '') + ' ' + pctS(f.lastSlot) + ' last, ' + pctS(f.chance) + ' a pack').join('; ') };
    };
    for (const [name, list, t, marks] of [['1:1:1', ell, t1], ['3:3:3:1 key', llb, t2], ['20:1 key', heavyKey, t3], ['3:3:3:1, key owned', llb, t4, { owned: ownedKey }]]) {
      const a = agree(list, t, marks);
      check(a.ok, 'the sheet\'s chances match ' + NW + ' seeded packs (' + name + '): ' + (a.ok ? a.line : a.bad.join('; ')));
    }
    {
      const c = sheet('comet-special', { featured: llb, owned: ownedKey, maxed: none }), k = c.featured.find(f => f.key);
      check(k.exhausted === 'owned' && k.chance === 0 && !k.inPlay && c.shifted.length === 1 && c.weights.join(':') === '3:3:3:1', 'the sheet: an owned key entry listed as obtained, chance 0, the declared ratio kept 3:3:3:1, the shift named');
      const tidy = sheet('comet-special', { featured: [{ car: 'jetcar', weight: 2 }, { car: 'dragster', weight: 2 }, { car: 'gullwing', weight: 2 }], owned: none, maxed: none });
      check(tidy.weights.join(':') === '1:1:1', 'the declared ratio is tidied where it can be: 2:2:2 reads 1:1:1');
      // the formula with no key: 1 - (1 - w/W)(1 - q)^(size - 1)
      const live = featuredEntries(ell), fc = featuredChances(live, { size: 5, upgradeChance: 0.25, featuredChance: 0.2 });
      check(fc.every(o => Math.abs(o.chance - (1 - (1 - o.lastSlot) * (1 - o.slot) ** 4)) < 1e-12), 'with no key the exact chance is 1 - (1 - w/W)(1 - q)^(size - 1)');
    }
    // amounts: the Comet Hunt's x3 at 9 and x15 at 1: the last slots about 9:1, the slot's n 3 or 15
    const comet = featuredOf('comet-special').filter(f => !f.key); // (the key entry, 0.5% of the spread, is checked on its own below)
    const t5 = tally(comet, 15e6);
    const r = (t5.last['silvercomet:3'] || 0) / Math.max(1, t5.last['silvercomet:15'] || 0);
    check(Math.abs(share(t5, 'silvercomet:3') - 0.9) < 0.015 && r > 7.5 && r < 11 && [...t5.ns].every(n => n === 3 || n === 15),
      'the Comet Hunt (silvercomet x3 weight 9, x15 weight 1): last slots ' + pctS(share(t5, 'silvercomet:3')) + ' x3, ' + pctS(share(t5, 'silvercomet:15')) + ' x15 (' + r.toFixed(1) + ':1), a featured slot\'s n only 3 or 15');
    { const cc = sheet('comet-special', { featured: comet, owned: none, maxed: none }); check(cc.featured.every(f => near(f.carChance, 1)), 'the Silver Comet (any of its x3 / x15 entries) is in every Comet Hunt pack: carChance 1'); }
    { const a = agree(comet, t5); check(a.ok, 'the sheet\'s chances match ' + NW + ' seeded packs (Comet Hunt x3/x15): ' + (a.ok ? a.line : a.bad.join('; '))); }
    // exhausted: a car maxed takes ALL its entries out (x3 and x15), the others shift; the regular slots still give it
    const mixed = [...comet, { car: 'jetcar', weight: 1 }, { car: 'dragster', weight: 1 }];
    const maxComet = (car) => car.id === 'silvercomet';
    const t6 = tally(mixed, 16e6, { maxed: maxComet });
    check(!t6.all.some(cards => cards.some(c => c.featured && c.car === 'silvercomet')) && ['jetcar', 'dragster'].every(id => Math.abs(share(t6, id) - 0.5) < 0.025),
      'a featured car maxed: both its entries (x3, x15) out, the others shift to 1:1 (' + ['jetcar', 'dragster'].map(id => pctS(share(t6, id))).join(', ') + ')');
    { const a = agree(mixed, t6, { maxed: maxComet }); check(a.ok, 'the sheet\'s chances match with a car maxed: ' + (a.ok ? a.line : a.bad.join('; '))); }
    const maxJet = (car) => car.id === 'jetcar';
    const t7 = tally(ell, 17e6, { maxed: maxJet });
    const plainJet = t7.all.reduce((n, cards) => n + cards.filter(c => c.car === 'jetcar' && !c.featured).length, 0);
    check(!t7.all.some(cards => cards.some(c => c.featured && c.car === 'jetcar')) && plainJet === 0,
      'a maxed car is out of the featured slots AND (14-Oct, the blueprint cap) out of the regular ones: no blueprint of it dealt in ' + NW + ' packs (' + plainJet + ' seen)');
    // every one exhausted: nothing featured drops (no duplicates, no key); the last slot is an ordinary filler
    const allMax = () => true;
    const t8 = tally(ell, 18e6, { maxed: allMax });
    check(t8.last.filler === NW && !t8.all.some(cards => cards.some(c => c.featured)),
      'every featured car maxed: nothing featured drops (no duplicates); the last slot is an ordinary filler');
    const t9 = tally(llb, 19e6, { maxed: allMax, owned: ownedKey });
    check(t9.last.filler === NW && !t9.all.some(cards => cards.some(c => c.key || c.featured)), 'every entry exhausted, a key among them: no featured card, no key; the last slot a filler');
    const keysOnly = [{ car: 'monowheel', key: true }, { car: 'swancar', key: true, weight: 2 }];
    const t10 = tally(keysOnly, 20e6, { owned: () => true });
    check(t10.last.filler === NW && !t10.all.some(cards => cards.some(c => c.key || c.featured)) && t10.all.every(cards => rank(cards.at(-1).rarity) >= rank('epic')),
      'all keys and all owned: nothing to feature, the last slot an Epic-or-better filler, no key');
    check(Packs.featuredExhausted(null, ell, { maxed: allMax }) && !Packs.featuredExhausted(null, ell, { maxed: maxJet }) && Packs.featuredExhausted(null, keysOnly, { owned: () => true })
      && !Packs.featuredExhausted(null, []) && Packs.featuredExhausted(null, comet, { maxed: maxComet, owned: none }),
      'Packs.featuredExhausted: true only when every entry is exhausted (a list with none: false)');
    // the debug marks (?maxed= / ?owned=) count, for the visit
    P.debugMarks(new URLSearchParams('maxed=silvercomet&owned=rocketfin,silvercomet')); // (the Comet Hunt pack also has the Silver Comet's key: exhausted once that is owned too)
    check(Packs.featuredExhausted('comet-special') && P.ownsNow('rocketfin') && P.maxedNow(by('silvercomet')), 'the debug marks (&maxed=silvercomet&owned=rocketfin) count as maxed / owned');
    P.debugMarks(new URLSearchParams(''));
    check(!Packs.featuredExhausted('comet-special') && !P.ownsNow('rocketfin'), '...and are gone when cleared');
    { const spec = featuredOf('comet-special'), key = spec.find(f => f.key), total = spec.reduce((n, f) => n + f.weight, 0), cf = contents('comet-special', { featured: spec }).featured.find(f => f.key);
      check(!!key && key.car.id === 'silvercomet' && key.slotChance === 0 && Math.abs(key.weight / total - 0.005) < 1e-4 && !!cf && Math.abs(cf.chance - 0.005) < 2e-4,
        'the Comet Hunt pack: the Silver Comet KEY is 0.5% of the featured spread (' + (key ? (100 * key.weight / total).toFixed(3) : '?') + '%), never rolled on an upgraded slot, so about 0.5% a pack (' + (cf ? (cf.chance * 100).toFixed(3) : '?') + '%)'); }
    // the debug list: id[!key][:weight[xamount]]
    const dbg = P.debugFeatured(new URLSearchParams('featured=silvercomet:9x3,silvercomet:1x15,rocketfin:1,rocketfin!key:2'));
    check(dbg.map(f => (f.key ? 'key:' : '') + f.car.id + ':' + f.weight + (f.amount ? 'x' + f.amount : '')).join() === 'silvercomet:9x3,silvercomet:1x15,rocketfin:1,key:rocketfin:2',
      'the debug list ?featured=silvercomet:9x3,silvercomet:1x15,rocketfin:1,rocketfin!key:2 reads as four entries');
    // (d) old plain-id lists are weight 1, the kind's amount: the same draws as { car, weight: 1 }
    const same = Array.from({ length: 300 }, (_, i) => JSON.stringify(draw('comet-special', { random: dice(21e6 + i), featured: ['silvercomet'] })) === JSON.stringify(draw('comet-special', { random: dice(21e6 + i), featured: [{ car: 'silvercomet', weight: 1 }] }))).every(Boolean);
    const plain = featuredEntries(['silvercomet']);
    check(same && plain.length === 1 && plain[0].weight === 1 && plain[0].amount === undefined && draw('comet-special', { random: dice(3), featured: ['silvercomet'] }).at(-1).n === Packs.data.packs['comet-special'].baseAmount,
      'a plain car id is weight 1 and the kind\'s base amount (the limited special: x2, never doubled): the same packs as { car, weight: 1 }');
    // the regular packs' keys: an owned key listed as obtained (chance 0), the others' chances as the pool is (a simulation)
    {
      const odds = Packs.data.odds, keep = odds.bespoke;
      try {
        odds.bespoke = 60; // (keys made common for the simulation)
        const own = (id) => id === 'rocketfin' || id === 'commuter';
        const c = sheet('standard', { owned: own });
        const g2 = c.groups.find(gr => gr.rarity === 'bespoke'), ownedRow = g2.cards.find(x => x.car.id === 'rocketfin');
        const M2 = 20000, seenK = {};
        for (let i = 0; i < M2; i++) { const x = draw('standard', { random: dice(22e6 + i), owned: own })[0]; if (x.key) seenK[x.car] = (seenK[x.car] || 0) + 1; }
        const liveKeys = g2.cards.filter(x => !x.exhausted);
        const ok = liveKeys.every(x => Math.abs((seenK[x.car.id] || 0) / M2 - x.chance) < 0.012);
        check(ownedRow?.exhausted === 'owned' && ownedRow.chance === 0 && !seenK.rocketfin && ok && near(liveKeys.reduce((n, x) => n + x.chance, 0), g2.share),
          'a regular pack\'s key owned: listed as obtained, chance 0, never drawn; the other keys\' chances match ' + M2 + ' seeded first slots (' + liveKeys.map(x => x.car.id + ' ' + pctS((seenK[x.car.id] || 0) / M2) + '/' + pctS(x.chance)).join(', ') + ')');
      } finally { odds.bespoke = keep; }
    }
    // (e) a bad featured list is reported (the list is the PACK's now: packs.json comet-special featured.entries; packs.js
    // packProblems, which events.js problems() reports too); events.json naming featured cards is reported
    const { Events } = await g.load('events.js');
    const fe = Packs.data.packs['comet-special'].featured, keepF = fe.entries;
    const ev = Events.specials.find(e => e.id === 'comet-hunt');
    try {
      const bad = [{ car: 'silvercomet', weight: 0 }, { car: 'jetcar', weight: -2 }, { car: 'dragster', weight: 'x' }, { car: 'nocar' }, { car: 'gullwing', key: true },
        { car: 'swancar', amount: 0 }, { car: 'swancar', amount: [5, 2] }, { car: 'rocketfin', amount: 2.5 }];
      const lines = bad.map(x => { fe.entries = [x]; return Events.problems().join(' | '); });
      fe.entries = [{ car: 'silvercomet', weight: 9, amount: 3 }, { car: 'silvercomet', weight: 1, amount: [10, 15] }, { car: 'monowheel', key: true, weight: 0.5 }];
      const good = Events.problems();
      check(lines.every(l => /pack comet-special: featured entry 1/.test(l)) && !good.length, 'events.js (through packProblems) reports each bad featured entry of a pack (weight 0, -2, "x", no car, a key of a non-Bespoke car, amount 0, [5, 2], 2.5), and a sound list passes: ' + lines.map(l => l.replace(/^packs\.json: pack comet-special: /, '').replace(/ \(a car id.*$/, '')).join('; '));
      ev.raw.featured = ['silvercomet'];
      check(/event comet-hunt: "featured" belongs on its pack now/.test(Events.problems().join(' | ')), 'an event that still names featured cards (the old events.json shape) is reported: they belong on its pack');
    } finally { fe.entries = keepF; delete ev.raw.featured; }
    check(Events.problems().length === 0, 'events.json and packs.json as shipped are sound');
  }
  // ---- ONE DEFINITION PER PACK (CHECKLIST 159): what gives a pack is the pack's own givenBy; the GENERATED words name
  // every guarantee of every pack and bundle (its size, each at-least rule not already made true by a higher one, a
  // featured card, an event's end); a `blurb` overrides them ----
  {
    const PK = Packs.data.packs;
    check(P.careerPack() === 'career' && JSON.stringify(P.eventPacks('comet-hunt')) === '[{"id":"comet-special","stage":true,"prize":true,"every":false,"day":0}]'
      && JSON.stringify(P.eventPacks('car-hunt')) === '[{"id":"car-hunt-special","stage":false,"prize":false,"every":true,"day":0}]' && P.eventPacks('no-such-event').length === 0,
      'givenBy: the Career levels give the career pack; the Comet Hunt\'s stages and prize give comet-special; EVERY Car Hunt delivery gives car-hunt-special (and nothing names another event)');
    check(Object.keys(PK).every(id => !PK[id].featured || P.featuredOf(id).length > 0) && P.featuredOf('standard').length === 0 && P.eventOf('comet-special')?.id === 'comet-hunt' && P.eventOf('ten') === null,
      'the featured entries and the event live on the pack (featuredOf, eventOf)');
    const names = (spec, text) => {
      const miss = [];
      if (!text.includes(String(spec.size))) miss.push('size ' + spec.size);
      const rules = Object.entries(spec.atLeast || {});
      for (const [r, n] of rules) {
        const said = new RegExp('at least ' + (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : String(n)) + ' ' + P.rarityName(r) + ' or better', 'i').test(text);
        const implied = rules.some(([r2, m]) => RARITIES.indexOf(r2) > RARITIES.indexOf(r) && m >= n && new RegExp(P.rarityName(r2) + ' or better', 'i').test(text));
        if (!said && !implied) miss.push('at least ' + n + ' ' + r);
      }
      if (!!spec.featured !== /Guaranteed featured card|A featured card in each/.test(text)) miss.push('featured');
      if (spec.baseAmount > 1 && !text.includes('x' + spec.baseAmount)) miss.push('x' + spec.baseAmount);
      return miss;
    };
    const bad = [];
    for (const id of Object.keys(PK)) {
      const text = P.describePack(id), miss = names(PK[id], text);
      if (P.eventOf(id)?.to && !/Limited: ends \d+ \w{3}/.test(text)) miss.push('its event\'s end');
      if (P.eventOf(id)?.repeat && PK[id].givenBy?.event?.every && !text.includes('One for every ' + P.eventOf(id).name + ' run')) miss.push('its recurring event');
      if (miss.length || !text) bad.push(id + ' (' + miss.join(', ') + '): ' + text);
    }
    for (const b of Object.values(Packs.data.bundles)) {
      const text = P.describeBundle(b), spec = PK[b.pack], miss = names({ ...spec, size: b.count * spec.size, baseAmount: 1 }, text);
      if (!text.includes(b.count + ' packs')) miss.push(b.count + ' packs');
      if (miss.length) bad.push(b.pack + ' x' + b.count + ' (' + miss.join(', ') + '): ' + text);
    }
    check(!bad.length, 'every generated blurb names every guarantee: ' + (bad.length ? bad.join(' | ') : Object.keys(PK).map(id => id + ' "' + P.describePack(id) + '"').join('; ')));
    const keep = JSON.stringify(PK.career);
    try {
      PK.career.atLeast = { uncommon: 3, epic: 2 }; PK.career.size = 7; PK.career.baseAmount = 2;
      const t = P.describePack('career');
      check(!names(PK.career, t).length && /At least two Epic or better/.test(t) && /At least three Uncommon or better/.test(t) && /^7 evergreen cards, x2 each/.test(t),
        'the words follow the rules when they change (7 cards, x2, at least three Uncommon and two Epic: both said): "' + t + '"');
      PK.career.blurb = 'The owner\'s own words';
      check(P.describePack('career') === 'The owner\'s own words', 'a pack\'s `blurb` overrides the generated words');
    } finally { PK.career = JSON.parse(keep); }
    check(P.describePack('ten') === '10 cards from every car with blueprints. At least one Epic or better. A key, now and then' && P.bundleName(Packs.data.bundles['ten-3']) === '3 10-packs',
      'the 10-pack\'s words (the Uncommon rule made true by the Epic one, not said twice): "' + P.describePack('ten') + '"; its bundle "' + P.bundleName(Packs.data.bundles['ten-3']) + '"');
    // the free Daily pack draws as its rules say: 5 evergreen cards, an Uncommon or better, no keys, no featured
    let dailyOk = 0;
    for (let i = 0; i < 2000; i++) { const cards = draw('daily', opts(44e6 + i)); if (cards.length === 5 && cards.every(c => !c.featured && c.n === 1) && cards.some(c => rank(c.rarity) >= rank('uncommon'))) dailyOk++; }
    check(dailyOk === 2000, 'the Daily pack is a Standard pack: 5 cards, every stack x1, an Uncommon or better, no featured, and no Epic guarantee (' + dailyOk + ' of 2000)');
  }
  // ---- the sheet's one format for a chance (the owner, 12-Oct): at most two decimals, "<0.01%", "0%" ----
  {
    const cases = [[0.0041, '0.41%'], [0.000612, '0.06%'], [0.00004, '<0.01%'], [0, '0%'], [0.33333, '33.33%'], [1, '100%']];
    const got = cases.map(([p]) => P.percent(p));
    check(cases.every(([, w], i) => got[i] === w), 'the sheet\'s chance format: ' + cases.map(([p, w], i) => (p * 100) + ' -> ' + got[i] + (got[i] === w ? '' : ' (wanted ' + w + ')')).join(', '));
  }
  // ---- BASE AMOUNTS and DOUBLING (the owner, 12-Oct): every non-featured card the kind's baseAmount (1; a LIMITED pack
  // 2), doubled at doubleChance (0.15, a kind may override); featured cards their own amount, never doubled; keys 1 ----
  {
    const NB = 6000, d = Packs.data.doubleChance;
    const tallyN = (kind, seed, more = {}) => {
      let slots = 0, doubled = 0, featuredDoubled = 0, keysOff = 0;
      const ns = new Set(), fns = new Set();
      for (let i = 0; i < NB; i++) {
        for (const c of draw(kind, { random: dice(seed + i), ...more })) {
          if (c.key) { if (c.n !== 1 || c.doubled) keysOff++; continue; }
          if (c.featured) { fns.add(c.n); if (c.doubled) featuredDoubled++; continue; }
          slots++; ns.add(c.n); if (c.doubled) doubled++;
        }
      }
      return { share: doubled / slots, ns: [...ns].sort((a, b) => a - b), fns: [...fns].sort((a, b) => a - b), featuredDoubled, keysOff };
    };
    check(d === 0.15 && Packs.data.packs['comet-special'].limited && Packs.data.packs['comet-special'].baseAmount === 2 && ['standard', 'ten', 'career'].every(k => Packs.data.packs[k].baseAmount === 1),
      'packs.json: doubleChance 0.15; baseAmount 1 for standard, ten and career; the special pack LIMITED with baseAmount 2');
    const s1 = tallyN('standard', 30e6);
    check(Math.abs(s1.share - d) < 0.012 && s1.ns.join() === '1,2', 'a standard pack: ' + (s1.share * 100).toFixed(1) + '% of its cards doubled (wanted ' + d * 100 + '%), n only 1 or 2 (' + s1.ns + ')');
    const t1 = tallyN('ten', 31e6);
    check(t1.keysOff === 0 && t1.ns.join() === '1,2', 'a 10-pack: keys always 1, never doubled; the other cards 1 or 2');
    const o1 = tallyN('career', 32e6, { spec: { ...Packs.data.packs.career, doubleChance: 0.4 } });
    check(Math.abs(o1.share - 0.4) < 0.015, 'a kind\'s own doubleChance (0.4) is used over packs.json\'s: ' + (o1.share * 100).toFixed(1) + '% doubled');
    const l1 = tallyN('comet-special', 33e6, { featured: featuredOf('comet-special') });
    check(l1.ns.join() === '2,4' && Math.abs(l1.share - d) < 0.012 && l1.featuredDoubled === 0 && l1.fns.join() === '3,15',
      'a LIMITED (special) pack: its other cards give 2 or 4 (' + l1.ns + ', ' + (l1.share * 100).toFixed(1) + '% doubled); featured cards never doubled, their own amounts (' + l1.fns + ')');
    const l2 = tallyN('comet-special', 34e6, { featured: ['jetcar'] });
    check(l2.fns.join() === '2' && l2.featuredDoubled === 0, 'a featured entry with no amount of its own: the base (2), never doubled');
    // the blueprints given equal n (opened for real)
    Progress.reset(); Progress.noSave = true;
    let given = true;
    for (let i = 0; i < 40; i++) {
      const before = {}; for (const c of [...P.roster(), ...EVENT_CARS]) before[c.id] = Ecu.blueprints(c.id) || 0;
      const r = Packs.open(i % 2 ? 'comet-special' : 'standard', { free: true, random: dice(35e6 + i) });
      const sum = {}; for (const c of r.cards) if (!c.key) sum[c.car] = (sum[c.car] || 0) + c.n;
      for (const [id, n] of Object.entries(sum)) if ((Ecu.blueprints(id) || 0) - (before[id] || 0) !== n) given = false;
    }
    check(given, 'opened packs (standard and limited special, doubled stacks among them): the blueprints given equal each slot\'s n');
    // the sheet: each card's stacks (x base, x base*2), each its TOTAL chance, adding up to the card's; a simulation
    Progress.reset(); Progress.noSave = true; // (the packs opened above filled some cars to their cap: those are listed 'maxed', chance 0, one stack)
    const c = P.contents('standard', { owned: (id) => id === 'commuter' });
    const plainCards = c.groups.flatMap(gr => gr.cards.filter(x => !x.key));
    check(plainCards.every(x => x.stacks.length === 2 && x.stacks[0].n === 1 && x.stacks[1].n === 2 && near(x.stacks[0].chance + x.stacks[1].chance, x.chance) && near(x.stacks[1].chance, x.chance * d))
      && c.groups.flatMap(gr => gr.cards.filter(x => x.key)).every(x => x.stacks.length === 1 && x.stacks[0].n === 1),
    'the sheet: each card\'s stacks x1 and x2, their total chances adding up to the card\'s (x2 = its chance x ' + d + '); a key one stack of 1');
    const lim = P.contents('comet-special', { featured: featuredOf('comet-special') });
    check(lim.limited && lim.baseAmount === 2 && lim.groups.flatMap(gr => gr.cards).every(x => x.stacks[0].n === 2 && x.stacks[1].n === 4), 'a limited pack\'s sheet: stacks x2 and x4');
    const M3 = 30000, seenS = {};
    for (let i = 0; i < M3; i++) { const x = draw('standard', { random: dice(36e6 + i), owned: (id) => id === 'commuter' })[0]; seenS[x.rarity + ':' + x.n] = (seenS[x.rarity + ':' + x.n] || 0) + 1; }
    const bad = [];
    for (const gr of c.groups.filter(gr => gr.rarity !== 'bespoke')) for (const k of [0, 1]) {
      const said = gr.cards.reduce((n, x) => n + x.stacks[k].chance, 0), drawn = (seenS[gr.rarity + ':' + (k + 1)] || 0) / M3;
      if (Math.abs(said - drawn) > Math.max(0.006, said * 0.12)) bad.push(gr.rarity + ' x' + (k + 1) + ' ' + (drawn * 100).toFixed(2) + '/' + (said * 100).toFixed(2));
    }
    check(!bad.length, 'the sheet\'s stack chances match ' + M3 + ' seeded first slots, by rarity and stack' + (bad.length ? ': ' + bad.join(', ') : ''));
    // the debug doubling (&double=0.5&base=2), for a visit
    P.debugDouble(new URLSearchParams('double=0.5&base=2'));
    const dd = tallyN('standard', 37e6);
    P.debugDouble(new URLSearchParams(''));
    check(Math.abs(dd.share - 0.5) < 0.02 && dd.ns.join() === '2,4' && Packs.doubleOverride === null, 'the debug &double=0.5&base=2: half the cards doubled, 2 or 4 (' + dd.ns + '); cleared after');
  }
  // ---- the exhausted state is a SNAPSHOT taken once when a pack is opened (the owner, 12-Oct): a card of the pack
  // that maxes the featured car does not take it out of the pack's last slot (the duplicate is kept as the count) ----
  {
    let asked = 0;
    const later = (car) => car.id === 'jetcar' && asked++ > 0; // (not maxed when first asked; maxed from then on, as if the pack's own cards had maxed it; the pools ask for every car, the featured entry for jetcar: one snapshot, asked once)
    const one = draw('comet-special', { random: dice(41), featured: ['jetcar'], maxed: later, owned: () => false });
    check(asked === 1 && one.at(-1).featured && one.at(-1).car === 'jetcar', 'draw() reads the maxed state once, before any card (asked ' + asked + ' time): the last slot keeps the featured car');
    const jet = by('jetcar'), full = Ecu.max(jet) * Ecu.x(jet);
    Packs.featuredOverride = P.featuredEntries(['jetcar']);
    let found = null;
    try {
      for (let s = 0; s < 3000 && !found; s++) {
        Progress.reset(); Progress.noSave = true;
        (Progress.data.blueprints ||= {}).jetcar = full - 1; // (one short of its max: the first jetcar card maxes it)
        const r = Packs.open('comet-special', { free: true, random: dice(42e6 + s) });
        const jets = r.cards.filter(c => c.featured && c.car === 'jetcar');
        if (jets.length >= 2) found = { r, jets, given: Ecu.blueprints('jetcar') - (full - 1), sum: r.cards.filter(c => c.car === 'jetcar').reduce((n, c) => n + (c.given ?? c.n), 0) };
      }
    } finally { Packs.featuredOverride = null; Progress.reset(); Progress.noSave = true; }
    check(!!found && found.r.cards.at(-1).car === 'jetcar' && found.given === found.sum && P.maxedNow(jet) === false,
      'a pack whose earlier featured slot maxes the car still has it in the last slot (' + (found ? found.jets.length + ' jetcar cards, ' + found.given + ' blueprints given = the slots\' n' : 'no such pack found') + ')');
  }
  // ---- THE BLUEPRINT CAP (the owner, 14-Oct; CHECKLIST 286): a car with every blueprint it can use is dealt no more; a pack that would deal it
  // deals another car of the pool; a whole pool capped keeps the pool (no empty pack); open() gives no more than the room ----
  {
    Progress.reset(); Progress.noSave = true;
    const woody = by('woody');
    Progress.data.blueprints = { woody: Ecu.cap(woody) };
    let seenWoody = 0, packs = 0, empty = 0;
    for (let i = 0; i < 2000; i++) { const cards = draw('standard', { random: dice(61e6 + i), owned: () => false }); packs++; if (!cards.length) empty++; seenWoody += cards.filter(c => c.car === 'woody').length; }
    check(Ecu.capped(woody) && seenWoody === 0 && empty === 0, 'a capped car (woody, 10 of 10) is dealt in none of ' + packs + ' standard packs (' + seenWoody + ' seen), no pack empty');
    const sheet = P.contents('standard', { owned: () => false }), wc = sheet.groups.flatMap(gr => gr.cards).find(x => x.car.id === 'woody');
    check(wc && wc.exhausted === 'maxed' && wc.chance === 0, 'the sheet lists the capped car out of the pool: exhausted "maxed", chance 0');
    const rate = (id) => { let n = 0; for (let i = 0; i < 2000; i++) n += draw('standard', { random: dice(62e6 + i), owned: () => false }).filter(c => c.car === id).length; return n; };
    Progress.reset(); Progress.noSave = true;
    check(rate('woody') > 0, '...and an uncapped woody is dealt (' + rate('woody') + ' in 2000 packs)');
    // a pack dealt a car twice, the room for one: the second slot is dealt another car
    Progress.reset(); Progress.noSave = true;
    // every car in the pools capped but woody (1 blueprint short): the pool is woody alone; the pack still comes out whole
    for (const car of P.roster()) if (P.rarityOf(car) && Ecu.kind(car)) Progress.data.blueprints[car.id] = Ecu.cap(car);
    Progress.data.blueprints.woody = Ecu.cap(woody) - 1;
    const r = Packs.open('standard', { free: true, random: dice(63e6), amountOf: () => 3 });
    const plain = r.cards.filter(c => !c.key);
    check(r.cards.length === 5 && plain.length > 0 && plain.every(c => c.car === 'woody') && Ecu.blueprints('woody') === Ecu.cap(woody), 'only woody left with room (1): the pack is five cards, every blueprint card of it (a Bespoke key may come too), and the save takes just that one (' + Ecu.blueprints('woody') + ' of ' + Ecu.cap(woody) + ')');
    check(plain[0].given === 1 && plain[0].cut === 3 && plain[0].n === 1 && plain.slice(1).every(c => c.given === 0 && c.maxed), 'the first card x3 is cut to what was taken (given 1, cut 3), the rest are shown as already maxed (given 0)');
    Progress.reset(); Progress.noSave = true;
    // every blueprint car capped: the whole pool is kept (a finished collection), the pack is whole and nothing is added
    for (const car of P.roster()) if (P.rarityOf(car) && Ecu.kind(car)) Progress.data.blueprints[car.id] = Ecu.cap(car);
    const snap = JSON.stringify(Progress.data.blueprints);
    const done = Packs.open('standard', { free: true, random: dice(64e6) });
    check(done.cards.length === 5 && JSON.stringify(Progress.data.blueprints) === snap && done.cards.every(c => c.maxed || c.key), 'a finished collection: five cards still dealt (the pool kept), every one shown maxed, no blueprint added');
    Progress.reset(); Progress.noSave = true;
  }
  // ---- THE CAR HUNT PACK (the owner, 13-Oct: "A car hunt pack has 3 slots, all 1x. It has one featured item slot. The
  // featured item is 1x of the car hunt car, or 3x of the car at low chances"): car-hunt-special, size 3, base 1, never
  // doubled, exactly ONE featured slot (the last: upgradeChance 0), the Blower Tourer x1 at weight 9 and x3 at weight 1
  // (90% / 10% of the featured slot), no shop block (given only), the Blower in no regular pack's pool; the Blower maxed:
  // nothing featured, the last slot an ordinary (Epic-or-better) card ----
  {
    const spec = Packs.data.packs['car-hunt-special'];
    check(!!spec && spec.size === 3 && spec.baseAmount === 1 && spec.doubleChance === 0 && !spec.shop && spec.featured?.upgradeChance === 0 && spec.givenBy?.event?.every === true,
      'the Car Hunt pack: 3 cards, x1 each, never doubled, one featured slot (upgradeChance 0), given by every Car Hunt delivery, not sold (no shop block)');
    const blower = by('blower');
    const regular = Object.keys(Packs.data.packs).filter(k => k !== 'car-hunt-special' && k !== 'car-hunt-5');
    check(blower?.noPacks && regular.every(k => Object.values(P.poolOf(Packs.data.packs[k])).flat().every(c => c.id !== 'blower')) && regular.every(k => !P.featuredOf(k).some(f => f.car.id === 'blower')),
      'the Blower Tourer (noPacks) is in no other pack but the Car Hunt pack and the Car Hunt 5-pack: no pool, no featured list (' + regular.length + ' packs)');
    const five = Packs.data.packs['car-hunt-5'], fe = P.featuredOf('car-hunt-5');
    check(!!five && five.size === 5 && five.baseAmount === 1 && five.shop?.section === 'packs' && five.shop.price > 0 && !five.event && !five.limited && fe.length === 2 && fe.every(f => f.car.id === 'blower') && fe.some(f => f.amount === 3) && fe.some(f => f.amount === 15) && five.featured.upgradeChance === 0,
      'the Car Hunt 5-pack: bought in the Shop beside the regular packs (section packs, ' + five?.shop?.price + '), 5 cards, one featured slot: the Blower x3 or x15');
    check(five?.featured?.sameCarAs === 'car-hunt-special' && P.featuredOf('car-hunt-5').every(f => f.car.id === P.featuredOf('car-hunt-special')[0].car.id), 'the 5-pack is tied to the Car Hunt: its featured car is whatever the Car Hunt pack hunts (' + P.featuredOf('car-hunt-5')[0]?.car.id + ')');
    Progress.reset(); Progress.noSave = true;
    let x1 = 0, x3 = 0, other = 0, featuredSlots = 0, plainNotOne = 0, blowerPlain = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const cards = draw('car-hunt-special', { random: dice(9100 + i), featured: P.featuredOf('car-hunt-special'), maxed: () => false, owned: () => false });
      if (cards.length !== 3) other++;
      featuredSlots += cards.filter(c => c.featured).length;
      const last = cards.at(-1);
      if (last.featured && last.car === 'blower') { if (last.n === 1) x1++; else if (last.n === 3) x3++; else other++; } else other++;
      plainNotOne += cards.slice(0, 2).filter(c => c.n !== 1 || c.featured).length;
      blowerPlain += cards.slice(0, 2).filter(c => c.car === 'blower').length;
    }
    check(other === 0 && featuredSlots === N && plainNotOne === 0 && blowerPlain === 0,
      'every Car Hunt pack (' + N + ' seeded): 3 cards, exactly one featured (the last: the Blower), the other two ordinary x1 cards, never the Blower');
    check(Math.abs(x1 / N - 0.9) < 0.01 && Math.abs(x3 / N - 0.1) < 0.01, 'the featured Blower: x1 ' + (x1 / N * 100).toFixed(1) + '% (weight 9: 90%), x3 ' + (x3 / N * 100).toFixed(1) + '% (weight 1: 10%)');
    const c = contents('car-hunt-special', { featured: P.featuredOf('car-hunt-special'), maxed: () => false, owned: () => false });
    check(c.featured.length === 2 && near(c.featured[0].lastSlot, 0.9) && near(c.featured[1].lastSlot, 0.1) && c.featured[0].amount === 1 && c.featured[1].amount === 3 && c.doubleChance === 0 && c.baseAmount === 1,
      'What\'s inside: the Blower x1 ' + P.percent(c.featured[0]?.lastSlot) + ', x3 ' + P.percent(c.featured[1]?.lastSlot) + '; x1 a card, no doubling');
    const maxedPack = draw('car-hunt-special', { random: dice(77), featured: P.featuredOf('car-hunt-special'), maxed: (car) => car.id === 'blower', owned: () => false });
    const cm = contents('car-hunt-special', { featured: P.featuredOf('car-hunt-special'), maxed: (car) => car.id === 'blower', owned: () => false });
    check(maxedPack.length === 3 && !maxedPack.some(x => x.featured) && maxedPack.every(x => x.car !== 'blower') && RARITIES.indexOf(maxedPack.at(-1).rarity) >= RARITIES.indexOf('epic') && cm.featured.every(f => f.exhausted === 'maxed' && f.chance === 0),
      'the Blower maxed: nothing featured drops (the last slot an ordinary ' + maxedPack.at(-1).rarity + ' card, the existing rule), the sheet shows it Car Maxed at 0%');
  }
  // ---- THE CONCEPT STRIKE PACKS (the owner, 13-Oct; CHECKLIST 211): concept-strike-1 to -6, one for each day of the
  // rotating event (givenBy.event.day: the day's tasks give them, events.js payTasks; never eventDone), each a Car Hunt
  // pack's shape (3 cards, x1, never doubled, one featured slot) featuring that day's concept car x1 90% / x3 10%; not
  // sold; the six concept cars in no other pack (no pool, no featured list, no key in the Bespoke pool) ----
  {
    const CC = g.cars.CONCEPT_CARS || [];
    const ids = [1, 2, 3, 4, 5, 6].map(d => 'concept-strike-' + d);
    check(CC.length === 6 && ids.every((id, i) => P.dayPack('concept-strike', i + 1) === id && Packs.data.packs[id]?.event === 'concept-strike'),
      'six Concept Strike packs, one a day (dayPack): ' + ids.map((id, i) => id + ' ' + CC[i]?.id).join(', '));
    check(ids.every((id, i) => { const sp = Packs.data.packs[id], fe = P.featuredOf(id); return sp.size === 3 && sp.baseAmount === 1 && sp.doubleChance === 0 && !sp.shop && sp.featured.upgradeChance === 0
      && fe.length === 2 && fe.every(f => f.car.id === CC[i].id && !f.key) && fe[0].amount === 1 && fe[1].amount === 3; }),
      'each: 3 cards, x1, never doubled, not sold, one featured slot: the day\'s concept car x1 or x3');
    check(JSON.stringify(P.eventPacks('concept-strike').map(p => p.day)) === '[1,2,3,4,5,6]' && P.eventPacks('concept-strike').every(p => !p.every && !p.stage && !p.prize),
      'givenBy.event.day only: no pack for every delivery, a stage or a prize (the tasks pay them)');
    const c = contents('concept-strike-1', { featured: P.featuredOf('concept-strike-1'), maxed: () => false, owned: () => false });
    check(c.featured.length === 2 && near(c.featured[0].lastSlot, 0.9) && near(c.featured[1].lastSlot, 0.1), 'What\'s inside the Fishbowl Strike pack: x1 ' + P.percent(c.featured[0]?.lastSlot) + ', x3 ' + P.percent(c.featured[1]?.lastSlot));
    const others = Object.keys(Packs.data.packs).filter(k => !ids.includes(k));
    check(CC.every(car => car.noPacks && car.concept && car.bespoke) && others.every(k => Object.values(P.poolOf(Packs.data.packs[k])).flat().every(x => !x.concept) && !P.featuredOf(k).some(f => f.car.concept))
      && !P.pools().keys?.some(x => x.concept), 'the six concept cars (noPacks) are in no other pack: no pool, no featured list, no key among the Bespoke keys (' + others.length + ' packs)');
    check(/Concept Strike's tasks/.test(P.describePack('concept-strike-1')), 'its line: ' + P.describePack('concept-strike-1'));
  }
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all passed');
process.exit(failures ? 1 : 0);
