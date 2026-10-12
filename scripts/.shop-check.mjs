// A check of the Shop (src/delivery/shop.js; its offers are BUILT FROM THE PACKS, packs.json, one definition per pack:
// CHECKLIST items 115 and 151), headless: the offers are sound (each a pack with a shop block or a bundle of one, a
// price, a section, generated words; a pack with an event is off the list outside it), packs.json's own problems (a shop
// block with no price, a bundle of no pack, an event or givenBy that is not there: packs.js packProblems), buying takes
// the price and gives the packs (through Packs.grant, a stand-in here so the check does not hang on packs.js) and asks the
// reveal to open them at once (Packs.revealNow), nothing is bought without the balance (nothing taken, nothing given),
// nor a special pack whose featured cards are all had (why "exhausted"); PURCHASE LIMITS (total and daily: the counters,
// refused with why "limit", the daily one reset at LOCAL midnight with Events.now moved, a bundle counting each pack, a
// limit said before the featured cards); the FREE DAILY PACK (claimed once, refused again the same day, back the next,
// opened through the reveal; the menu chip's "waiting"); the balance and the purchase counters through the save and a
// save code (an old save: empty counters; junk cleaned). The screen (render/shop.js) is only seen in a browser.
//   node scripts/.shop-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Shop, CURRENCY, SECTIONS, localDay, nextMidnight } = await g.load('shop.js');
  const { Events } = await g.load('events.js');
  const { Progress } = await g.load('progress.js');
  const P = await g.load('packs.js');
  const packData = P.Packs.data, PACKS = packData.packs;
  const ids = Object.keys(PACKS);

  // ---- the offers, built from the packs ----
  check(CURRENCY.placeholder === true && /\S/.test(CURRENCY.name) && Object.keys(Shop.data).sort().join() === '_about,currency,debugGrant', 'shop.json holds only the currency (' + CURRENCY.name + ') and its debug grant');
  const raw = Shop.raw, offerIds = raw.map(o => o.id);
  check(new Set(offerIds).size === offerIds.length, 'every offer has an id of its own (' + offerIds.join(', ') + ')');
  const sold = ids.filter(id => PACKS[id].shop);
  check(sold.every(id => raw.some(o => o.id === id && o.pack === id && o.count === 1)) && Object.keys(packData.bundles).every(id => raw.some(o => o.id === id && o.bundle)) && raw.length === sold.length + Object.keys(packData.bundles).length,
    'an offer for every pack with a shop block (' + sold.join(', ') + ') and every bundle (' + Object.keys(packData.bundles).join(', ') + '), nothing else');
  for (const o of raw) {
    const problems = [];
    if (!PACKS[o.pack]) problems.push('pack ' + o.pack + ' is not a pack');
    if (!(Number.isInteger(o.price) && o.price >= 0)) problems.push('price');
    if (o.was !== null && o.was !== undefined && !(o.was > o.price)) problems.push('an old price not above the price');
    if (o.ribbon === 'sale' && !(o.was > o.price)) problems.push('a sale with no old price');
    if (!SECTIONS.some(s => s.id === o.section)) problems.push('section ' + o.section);
    if (!(Number.isInteger(o.count) && o.count >= 1)) problems.push('count');
    if (!o.name || !o.blurb) problems.push('words');
    check(!problems.length, 'offer ' + o.id + (problems.length ? ': ' + problems.join(', ') : ': ' + o.name + ', ' + (o.price ? o.price : 'free') + ' (' + o.section + '): "' + o.blurb + '"'));
  }
  check(P.packProblems().length === 0 && Events.problems().length === 0, 'packs.json is sound (packProblems): ' + (P.packProblems().join('; ') || 'yes'));
  check(Shop.offer('ten').price === 210 && Shop.offer('ten').was === 260 && Shop.offer('ten-3').price === 560 && Shop.offer('ten-3').was === 630 && Shop.offer('standard').price === 100,
    'the balance fix: the 10-pack 210 (was 260), three 10-packs 560 (was 630), the Standard pack 100');
  check(SECTIONS[0].id === 'daily' && Shop.offer('daily').section === 'daily' && Shop.offer('daily').free && Shop.offer('daily').price === 0 && Shop.limitsOf('daily')?.daily === 1 && !Shop.limitsOf('daily').total,
    'the Daily pack: the first section ("' + SECTIONS[0].name + '"), price 0 (free), limits { daily: 1 }');
  // packs.json's problems, each kind of bad reference found (a copy of the data, broken one way at a time)
  {
    const bad = (f) => { const d = JSON.parse(JSON.stringify(packData)); f(d); return P.packProblems(d).join(' | '); };
    const cases = [
      ['a shop block with no price', bad(d => { delete d.packs.standard.shop.price; }), /standard: its shop block has no price/],
      ['a price that is not a whole number', bad(d => { d.packs.ten.shop.price = 'cheap'; }), /ten: its shop block has no price/],
      ['an event that is not there', bad(d => { d.packs['comet-special'].event = 'no-such-event'; }), /comet-special: its event "no-such-event"/],
      ['a givenBy event that is not there', bad(d => { d.packs.career.givenBy.event = { id: 'nope', stage: true }; }), /career: givenBy.event: "nope"/],
      ['a givenBy career level that is not there', bad(d => { d.packs.career.givenBy.career.levels = ['no-level']; }), /givenBy.career names no level "no-level"/],
      ['a bundle of no pack', bad(d => { d.bundles['ten-3'].pack = 'eleven'; }), /bundle ten-3: its pack "eleven" is not a pack/],
      ['a bundle of a pack not sold alone', bad(d => { delete d.packs.ten.shop; }), /bundle ten-3: its pack ten is not sold on its own/],
      ['a section that is not there', bad(d => { d.packs.daily.shop.section = 'nowhere'; }), /daily: its shop section "nowhere"/],
      ['a limit that is not a whole number', bad(d => { d.packs.daily.shop.limits = { daily: 0.5, weekly: 2 }; }), /limits.daily is not a whole number.*limits: unknown weekly|limits: unknown weekly.*limits.daily/],
      ['a bad featured entry on a pack', bad(d => { d.packs['comet-special'].featured.entries = [{ car: 'silvercomet', weight: 0 }]; }), /comet-special: featured entry 1/],
      ['the old shape', bad(d => { d.kinds = {}; }), /"kinds" is the old shape/],
    ];
    const missed = cases.filter(([, lines, re]) => !re.test(lines));
    check(!missed.length, 'packProblems reports: ' + cases.map(([w]) => w).join(', ') + (missed.length ? ' -- MISSED: ' + missed.map(([w, l]) => w + ' (' + l + ')').join('; ') : ''));
  }
  const special = raw.find(o => PACKS[o.pack].event && !o.bundle);
  if (special) {
    const event = Events.specials.find(e => e.id === PACKS[special.pack].event);
    const during = event.from ?? Date.now(), after = event.to;
    check(special.id === 'comet-special' && Shop.offers(during + 1000).some(o => o.id === special.id), 'the ' + special.id + ' offer (its pack\'s event ' + event.id + ') is on while its event is');
    check(after === null || !Shop.offers(after + 1000).some(o => o.id === special.id), '...and off once it is over');
    check(after === null || Shop.canBuy(special.id, after + 1000).why === 'over', '...and cannot be bought then');
    check(Shop.offer(special.id).featured.length >= 1, '...and shows its featured car(s), the pack\'s own entries: ' + Shop.offer(special.id).featured.map(f => f.car.name + (f.amount ? ' x' + f.amount : '') + ' (weight ' + f.weight + ')').join(', '));
  }

  // ---- buying (a stand-in for Packs.grant: what it was asked to give)
  const given = [];
  let revealed = 0, refuse = false; // (Packs.revealNow: the reveal asked to open what was just bought; refuse: grant gives nothing once)
  const stub = { grant: (id, { n = 1 } = {}) => (!refuse && ids.includes(id) ? (given.push({ id, n }), id + ' pack') : ''), revealNow: () => { revealed++; } };
  const T0 = new Date(2026, 9, 12, 15, 0).getTime(); // (a local afternoon, during the Comet Hunt)
  Events.now = () => T0;
  Progress.reset();
  Shop.usePacks(null);
  Progress.data.shopCash = 5000;
  check(Shop.canBuy('standard').why === 'packs' && !Shop.buy('standard').ok && Shop.balance() === 5000, 'with no packs in the build nothing is bought, and nothing taken');
  Shop.usePacks(stub);
  check(Shop.balance() === 5000, 'a balance of 5000 to spend');
  const ten = Shop.offer('ten');
  const r = Shop.buy('ten');
  check(r.ok && Shop.balance() === 5000 - ten.price && given.length === 1 && given[0].id === 'ten' && given[0].n === 1, 'the 10-pack bought: ' + ten.price + ' taken, one 10-pack given');
  check(revealed === 1, 'bought, it is opened at once: the reveal asked once (Packs.revealNow), not left for a Packs page');
  {
    const before = Shop.balance(), bundle = Shop.offer('standard-3');
    check(Shop.buy('standard-3').ok && Shop.balance() === before - bundle.price && given.at(-1).n === 3 && given.at(-1).id === 'standard', 'a bundle (standard-3): 3 Standard packs given in one, ' + bundle.price + ' taken');
  }
  if (special) check(Shop.buy(special.id).ok && given.at(-1).id === 'comet-special', 'the special pack is given as its own pack (comet-special)');
  // ---- a special pack whose featured cards the player has all (every car maxed, every key owned) is not for sale (the
  // owner, 12-Oct); an event still gives one (Packs.grant)
  if (special) {
    const real = P.Packs;
    stub.featuredExhausted = (id, list) => real.featuredExhausted(id, list);
    Progress.data.shopCash = 5000;
    const n0 = given.length, asked0 = revealed;
    real.markMaxed = new Set(Shop.offer(special.id).featured.filter(f => !f.key).map(f => f.car.id));
    real.markOwned = new Set(Shop.offer(special.id).featured.filter(f => f.key).map(f => f.car.id));
    const r2 = Shop.buy(special.id);
    check(!r2.ok && r2.why === 'exhausted' && Shop.canBuy(special.id).why === 'exhausted' && Shop.balance() === 5000 && given.length === n0 && revealed === asked0,
      'every featured card of ' + special.id + ' maxed / owned: buying refused (why "exhausted"), nothing taken, nothing given, no reveal');
    check(Shop.canBuy('ten').ok && Shop.canBuy('standard').ok, '...the other packs are not affected');
    check(real.featuredExhausted('comet-special') && !!real.grant('comet-special') && real.count('comet-special') >= 1, '...and an event still GIVES the special pack (Packs.grant is not blocked)');
    // a limit is said before the featured cards (one reason at a time)
    Shop.limitsOverride = { 'comet-special': { total: 1 } };
    check(Shop.canBuy(special.id).why === 'limit' && Shop.canBuy(special.id).words === 'Sold out', '...with a total limit used up too: the limit is said first ("Sold out"), not the featured cards');
    Shop.limitsOverride = null;
    real.markMaxed = null; real.markOwned = null;
    check(Shop.canBuy(special.id).ok && Shop.buy(special.id).ok && given.length === n0 + 1, 'with a featured card in play again: bought');
    delete Progress.data.packs;
  }
  // ---- not without the balance
  Progress.data.shopCash = ten.price - 1;
  const asked = revealed, n = given.length, short = Shop.buy('ten');
  check(!short.ok && short.why === 'short' && short.need === 1 && Shop.balance() === ten.price - 1 && given.length === n, 'one short of the price: not bought, nothing taken, nothing given');
  check(revealed === asked, '...and nothing is revealed for a buy that failed');
  Progress.data.shopCash = 0;
  check(raw.filter(o => o.price > 0).every(o => !Shop.canBuy(o.id).ok), 'with nothing: no offer with a price can be bought');
  check(Shop.buy('no-such-offer').why === 'unknown', 'an offer there is not: refused');
  // a pack the packs cannot give: the price comes back, nothing counted
  Progress.data.shopCash = 500;
  refuse = true;
  const buys0 = JSON.stringify(Progress.data.packBuys);
  check(!Shop.buy('standard').ok && Shop.balance() === 500 && JSON.stringify(Progress.data.packBuys) === buys0, 'a pack the packs cannot give: refused, the price given back, nothing counted toward its limits');
  refuse = false;
  check(Progress.data.money === 0, 'the bank (the tips) is never touched by the Shop');

  // ---- PURCHASE LIMITS (the owner, 12-Oct: "limited packs with total purchase limits", "daily purchase limits too") ----
  Progress.reset(); Progress.noSave = true;
  Events.now = () => T0;
  Progress.data.shopCash = 100000;
  check(Shop.left('ten').total === null && Shop.left('ten').today === null && Shop.limitsOf('ten') === null, 'a pack with no limits: none left to count (unlimited)');
  // TOTAL: 3 ever
  Shop.limitsOverride = { ten: { total: 3 } };
  check(Shop.buy('ten').ok && Shop.left('ten').total === 2 && Shop.bought('ten').total === 1 && Progress.data.packBuys.ten.total === 1, 'a total limit of 3: one bought, 2 left (the counter in the save: ' + JSON.stringify(Progress.data.packBuys.ten) + ')');
  {
    const cash0 = Shop.balance(), n0 = given.length, b = Shop.buy('ten-3');
    check(!b.ok && b.why === 'limit' && b.limit === 'total' && b.left === 2 && b.words === 'Only 2 left' && Shop.balance() === cash0 && given.length === n0, 'a bundle of 3 with 2 left: refused (why "limit", "Only 2 left"), nothing taken, nothing given');
  }
  check(Shop.buy('ten').ok && Shop.buy('ten').ok && Shop.left('ten').total === 0, 'two more bought: none left');
  {
    const c = Shop.canBuy('ten');
    check(c.why === 'limit' && c.limit === 'total' && c.words === 'Sold out' && !Shop.buy('ten').ok, 'the fourth: refused, "Sold out" (why "limit", limit "total")');
    Events.now = () => T0 + 5 * 86400e3;
    check(Shop.canBuy('ten').words === 'Sold out', '...and still sold out days later (a total limit never resets)');
    Events.now = () => T0;
  }
  // DAILY: a bundle counts each pack; the day is the player's LOCAL day, reset at local midnight
  Shop.limitsOverride = { standard: { daily: 4 } };
  check(Shop.buy('standard-3').ok && Shop.bought('standard').today === 3 && Shop.left('standard').today === 1, 'a daily limit of 4: a bundle of 3 counts 3 (1 left today)');
  check(Shop.buy('standard').ok && Shop.left('standard').today === 0, '...one more: none left today');
  {
    const c = Shop.canBuy('standard'), mid = nextMidnight(T0);
    check(c.why === 'limit' && c.limit === 'daily' && c.words === 'Come back tomorrow' && c.next === mid, 'the fifth today: refused, "Come back tomorrow" (why "limit", limit "daily", next at local midnight)');
    check(!Shop.canBuy('standard', mid - 1).ok, '...one millisecond before local midnight: still refused (' + localDay(mid - 1) + ')');
    check(Shop.canBuy('standard', mid).ok && localDay(mid) !== localDay(T0) && new Date(mid).getHours() === 0 && new Date(mid).getMinutes() === 0, '...at local midnight (' + localDay(mid) + ' 00:00): on sale again');
    Events.now = () => mid + 3600e3;
    check(Shop.buy('standard').ok && Shop.bought('standard').today === 1 && Shop.bought('standard').total === 5 && Progress.data.packBuys.standard.day === localDay(mid), '...bought the next day: today 1, total 5 (the day in the save: ' + Progress.data.packBuys.standard.day + ')');
    Events.now = () => T0;
  }
  // both limits at once
  Shop.limitsOverride = { career: { total: 2, daily: 1 } };
  check(Shop.buy('career').ok && Shop.canBuy('career').words === 'Come back tomorrow' && Shop.canBuy('career', nextMidnight(T0)).ok, 'total 2 and daily 1: one today, then come back tomorrow');
  Progress.data.packBuys.career = { total: 2, day: localDay(T0), today: 1 };
  check(Shop.canBuy('career', nextMidnight(T0)).words === 'Sold out', '...the total used up: sold out, the next day too (the total said first)');
  Shop.limitsOverride = null;

  // ---- THE FREE DAILY PACK (the owner, 12-Oct: "I want a free daily pack") ----
  {
    const { debugLimits, debugBuys } = await g.load('shop.js');
    Progress.reset(); Progress.noSave = true;
    Events.now = () => T0;
    let opened = 0;
    const real = P.Packs;
    Shop.usePacks(real);
    real.revealer = () => { while (real.next()) opened++; }; // (as the reveal does: opens what is held)
    check(Shop.balance() === 0 && Shop.canBuy('daily').ok && Shop.claimable().map(o => o.id).join() === 'daily', 'with nothing to spend, the Daily pack can be claimed (free); it is waiting (the menu chip\'s dot)');
    const bp0 = JSON.stringify(Progress.data.blueprints || {});
    const c1 = Shop.buy('daily');
    check(c1.ok && Shop.balance() === 0 && opened === 1 && real.total() === 0 && JSON.stringify(Progress.data.blueprints) !== bp0 && Progress.data.packLog[0]?.kind === 'daily',
      'claimed: nothing taken, the pack given and opened at once through the reveal (' + Progress.data.packLog[0]?.cards.length + ' cards, in the log as "daily")');
    const c2 = Shop.buy('daily');
    check(!c2.ok && c2.why === 'limit' && c2.limit === 'daily' && c2.left === 0 && c2.next === nextMidnight(T0) && opened === 1 && !Shop.claimable().length, 'claimed again the same day: refused (why "limit", next at local midnight), nothing opened, nothing waiting');
    check(!Shop.canBuy('daily', nextMidnight(T0) - 1000).ok, '...a second before local midnight: still claimed');
    Events.now = () => nextMidnight(T0) + 60e3;
    check(Shop.canBuy('daily').ok && Shop.claimable().length === 1 && Shop.buy('daily').ok && opened === 2 && Shop.bought('daily').total === 2, 'the next day: waiting again, claimed and opened (2 in all)');
    Events.now = () => T0;
    check(JSON.stringify(debugLimits('ten:t3,standard:d2,career:t5d1')) === '{"ten":{"total":3},"standard":{"daily":2},"career":{"total":5,"daily":1}}', 'the debug ?limits=ten:t3,standard:d2,career:t5d1 reads as three limits');
    Progress.reset(); Progress.noSave = true;
    debugBuys('daily:1');
    check(!Shop.canBuy('daily').ok && Shop.canBuy('daily').why === 'limit', 'the debug ?shopbuys=daily:1: the Daily pack claimed for the visit');
    real.revealer = null;
    Shop.usePacks(stub);
  }

  // ---- the save: the balance and the purchase counters ----
  Progress.reset();
  check(Progress.data.shopCash === 0 && JSON.stringify(Progress.data.packBuys) === '{}', 'a new save has none of the currency, and no purchase counters');
  Progress.data.shopCash = 1234;
  Progress.data.packBuys = { daily: { total: 7, day: '2026-10-12', today: 1 }, ten: { total: 2, day: '2026-10-01', today: 2 } };
  Progress.save();
  Progress.reload();
  check(Progress.data.shopCash === 1234 && Progress.data.packBuys.daily.total === 7 && Progress.data.packBuys.ten.day === '2026-10-01', 'the balance and the counters are saved and read back');
  const code = Progress.exportCode();
  Progress.data.shopCash = 7; Progress.data.packBuys = {};
  check(Progress.importCode(code) && Progress.data.shopCash === 1234 && JSON.stringify(Progress.data.packBuys) === '{"daily":{"total":7,"day":"2026-10-12","today":1},"ten":{"total":2,"day":"2026-10-01","today":2}}', '...and go through a save code');
  const bad = 'DR1.' + btoa(JSON.stringify({ unlocked: 1, cars: ['commuter'], shopCash: -50, packBuys: { daily: { total: -1 }, ten: { total: 3, day: 'yesterday', today: 9 }, 'Bad Id!': { total: 1 }, career: 'x' } }));
  check(Progress.importCode(bad) && Progress.data.shopCash === 0 && JSON.stringify(Progress.data.packBuys) === '{"ten":{"total":3,"day":"","today":0}}', 'a code with junk: a balance below nothing is none; the counters cleaned (' + JSON.stringify(Progress.data.packBuys) + ')');
  const old = 'DR1.' + btoa(JSON.stringify({ unlocked: 1, cars: ['commuter'] }));
  check(Progress.importCode(old) && Progress.data.shopCash === 0 && JSON.stringify(Progress.data.packBuys) === '{}', 'a code from before the Shop (and before the limits): none, empty counters');
  Shop.addCash(100);
  check(Shop.balance() === 100, 'the debug grant adds to it (100)');
  Progress.reset();
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await g.close();
console.log(failures ? failures + ' failed' : 'all passed');
process.exit(failures ? 1 : 0);
