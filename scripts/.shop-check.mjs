// A check of the Shop (src/delivery/shop.js, shop.json; CHECKLIST item 115), headless: the offers are sound (each
// names a pack kind, a price, a section; a special pack's event is real, and the offer is off the list outside it),
// buying takes the price and gives the packs (through Packs.grant, a stand-in here so the check does not hang on
// packs.js) and asks the reveal to open them at once (Packs.revealNow), nothing is bought without the balance (nothing taken, nothing given), and the placeholder balance goes
// through the save and a save code and comes back. The screen (render/shop.js) is only seen in a browser.
//   node scripts/.shop-check.mjs
import { boot } from './delivery-headless.mjs';
import { readFileSync, existsSync } from 'node:fs';

const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Shop, CURRENCY, SECTIONS } = await g.load('shop.js');
  const { Events } = await g.load('events.js');
  const { Progress } = await g.load('progress.js');
  const data = Shop.data;
  // the pack kinds there are: packs.json's when it is in the tree, else the four the spec names
  const packsJson = new URL('../src/delivery/packs.json', import.meta.url);
  const kinds = existsSync(packsJson) ? Object.keys(JSON.parse(readFileSync(packsJson, 'utf8')).kinds) : ['standard', 'ten', 'career', 'special'];

  // ---- the offers
  check(CURRENCY.placeholder === true && /\S/.test(CURRENCY.name), 'the currency is marked a placeholder (' + CURRENCY.name + ')');
  const ids = data.offers.map(o => o.id);
  check(new Set(ids).size === ids.length, 'every offer has an id of its own (' + ids.length + ')');
  for (const o of data.offers) {
    const problems = [];
    if (!kinds.includes(o.kind)) problems.push('kind ' + o.kind + ' is not a pack kind');
    if (!(Number.isInteger(o.price) && o.price > 0)) problems.push('price');
    if (o.was !== null && o.was !== undefined && !(o.was > o.price)) problems.push('an old price not above the price');
    if (o.ribbon === 'sale' && !(o.was > o.price)) problems.push('a sale with no old price');
    if (!SECTIONS.some(s => s.id === o.section)) problems.push('section ' + o.section);
    if (o.count !== undefined && !(Number.isInteger(o.count) && o.count >= 1)) problems.push('count');
    if (o.from && !Events.specials.some(e => e.id === o.from)) problems.push('event ' + o.from + ' is not a special event');
    if (o.kind !== 'special' && o.from) problems.push('an event on a pack that is not special');
    if (!o.name || !o.blurb) problems.push('words');
    check(!problems.length, 'offer ' + o.id + (problems.length ? ': ' + problems.join(', ') : ': sound'));
  }
  const special = data.offers.find(o => o.from);
  if (special) {
    const event = Events.specials.find(e => e.id === special.from);
    const during = event.from ?? Date.now(), after = event.to;
    check(Shop.offers(during + 1000).some(o => o.id === special.id), 'the ' + special.id + ' offer is on while its event is');
    check(after === null || !Shop.offers(after + 1000).some(o => o.id === special.id), '...and off once it is over');
    check(after === null || Shop.canBuy(special.id, after + 1000).why === 'over', '...and cannot be bought then');
    check(Shop.offer(special.id).featured.length >= 1, '...and shows its featured car(s): ' + Shop.offer(special.id).featured.map(c => c.name).join(', '));
  }

  // ---- buying (a stand-in for Packs.grant: what it was asked to give)
  const given = [];
  let revealed = 0; // (Packs.revealNow: the reveal asked to open what was just bought)
  const stub = { grant: (kind, { from = null, n = 1 } = {}) => (kinds.includes(kind) ? (given.push({ kind, from, n }), kind + ' pack') : ''), revealNow: () => { revealed++; } };
  Progress.reset();
  Shop.usePacks(null);
  Progress.data.shopCash = 5000;
  check(Shop.canBuy('standard').why === 'packs' && !Shop.buy('standard').ok && Shop.balance() === 5000, 'with no packs in the build nothing is bought, and nothing taken');
  Shop.usePacks(stub);
  check(Shop.balance() === 5000, 'a balance of 5000 to spend');
  const ten = Shop.offer('ten');
  const r = Shop.buy('ten');
  check(r.ok && Shop.balance() === 5000 - ten.price && given.length === 1 && given[0].kind === 'ten' && given[0].n === 1, 'the 10-pack bought: ' + ten.price + ' taken, one 10-pack given');
  check(revealed === 1, 'bought, it is opened at once: the reveal asked once (Packs.revealNow), not left for a Packs page');
  const bundle = data.offers.find(o => o.count > 1);
  if (bundle) {
    const before = Shop.balance();
    check(Shop.buy(bundle.id).ok && Shop.balance() === before - bundle.price && given.at(-1).n === bundle.count && given.at(-1).kind === bundle.kind, 'a bundle (' + bundle.id + '): ' + bundle.count + ' packs given in one');
  }
  if (special) {
    const t = (Events.specials.find(e => e.id === special.from).from ?? Date.now()) + 1000;
    check(Shop.buy(special.id, t).ok && given.at(-1).kind === 'special' && given.at(-1).from === special.from, 'the special pack is given as its event\'s (' + special.from + ')');
  }
  // ---- not without the balance
  Progress.data.shopCash = ten.price - 1;
  const asked = revealed, n = given.length, short = Shop.buy('ten');
  check(!short.ok && short.why === 'short' && short.need === 1 && Shop.balance() === ten.price - 1 && given.length === n, 'one short of the price: not bought, nothing taken, nothing given');
  check(revealed === asked, '...and nothing is revealed for a buy that failed');
  Progress.data.shopCash = 0;
  check(data.offers.every(o => !Shop.canBuy(o.id, Date.now()).ok), 'with nothing: no offer can be bought');
  check(Shop.buy('no-such-offer').why === 'unknown', 'an offer there is not: refused');
  // a kind the packs do not know: the price comes back
  data.offers.push({ id: 'odd', section: 'packs', kind: 'nonsense', price: 10, name: 'Odd', blurb: 'x' });
  Progress.data.shopCash = 50;
  check(!Shop.buy('odd').ok && Shop.balance() === 50, 'a pack kind the packs do not know: refused, the price given back');
  data.offers.pop();
  check(Progress.data.money === 0, 'the bank (the tips) is never touched by the Shop');

  // ---- the save
  Progress.reset();
  check(Progress.data.shopCash === 0, 'a new save has none of it');
  Progress.data.shopCash = 1234;
  Progress.save();
  Progress.reload();
  check(Progress.data.shopCash === 1234, 'the balance is saved and read back (1234)');
  const code = Progress.exportCode();
  Progress.data.shopCash = 7;
  check(Progress.importCode(code) && Progress.data.shopCash === 1234, '...and goes through a save code');
  const bad = 'DR1.' + btoa(JSON.stringify({ unlocked: 1, cars: ['commuter'], shopCash: -50 }));
  check(Progress.importCode(bad) && Progress.data.shopCash === 0, 'a code with a balance below nothing: none');
  const old = 'DR1.' + btoa(JSON.stringify({ unlocked: 1, cars: ['commuter'] }));
  check(Progress.importCode(old) && Progress.data.shopCash === 0, 'a code from before the Shop: none');
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
