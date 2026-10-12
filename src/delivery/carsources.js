// ============================================================================
// CAR SOURCES - where a car's KEY and its BLUEPRINTS can be had, worked out LIVE from the game's own data (never
// written by hand per car): cars.js (the car lot: forSale, the tiers), the earned cars' pars, events.json (a special
// event's prize, by Events.live and its dates; a one-level event's reward), packs.js (which pack kinds can hold the card,
// and the chance: contents()), shop.json (the offers that sell those packs; a special offer only while its event is on;
// the Shop's currency is a PLACEHOLDER), the Career packs (packs.js careerLevels(): the levels not yet delivered) and
// the special events' packs (a pack a stage, one with the prize, while the event is on). The owner, 12-Oct: "When the
// car is viewed in the garage, it should tell you sources of its blueprints or keys. Correctly identify if blueprints or
// keys are not currently obtainable." The showroom shows it (render/carsources.js renderSources).
//   sourcesOf(car, { t }) -> { car, keys, blueprints, keyOwned, keyless, noBlueprints, obtainable: { key, blueprints } }
// Each source: { what: 'key' | 'blueprints', how: 'lot' | 'level' | 'event' | 'pack', where, available, why, detail,
// rarity, kind, chance, ways: [{ how: 'shop' | 'career' | 'event' | 'held', where, available, why, detail,
// placeholder }] }. `why` (when not available) is plain words; a tier is the token {tier:n} (tiers.js richTiers draws it).
// keyless: why it has no key (a blueprint car), or null; noBlueprints: why it has no blueprints, or null.
// ============================================================================
import { CARS, EARNED_CARS, carTier, forSale } from './cars.js';
import { Progress } from './progress.js';
import { Ecu } from './ecu.js';
import { Events, PLAIN_EVENTS, when } from './events.js';
import { LEVELS, levelName } from './levels.js';
import { Tiers } from './tiers.js';
import { KINDS, contents, careerLevels, featuredFor, kindName, isBespokeCar, rarityOf, Packs } from './packs.js';
import shopData from './shop.json';

const day = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const money = (n) => '$' + Number(n).toFixed(2);
const pct = (p) => (p >= 0.995 ? '100%' : p >= 0.1 ? Math.round(p * 100) + '%' : p >= 0.001 ? (Math.round(p * 1000) / 10) + '%' : p > 0 ? '<0.1%' : '0%');
const CURRENCY = shopData.currency || { name: 'Crazey Cash', sign: '◆' };
const CASH = 'bought with ' + CURRENCY.name + (CURRENCY.placeholder ? ' (placeholder: nothing gives it yet)' : '');
const levelById = (id) => LEVELS.find(l => l.id === id) || null;

// an event's state now, in words: { live, why } (why: 'Event over: ended 1 Nov', 'Not yet open: starts 1 Dec')
const eventState = (from, to, t) => {
  if (to !== null && Number.isFinite(to) && !(t < to)) return { live: false, why: 'Event over (ended ' + day(to) + ')' };
  if (from !== null && Number.isFinite(from) && t < from) return { live: false, why: 'Not yet open: starts ' + day(from) };
  return { live: true, why: null };
};
const endsWords = (to) => (to !== null && Number.isFinite(to) ? ', ends ' + day(to) : '');

// the Career levels whose first delivery still gives a pack (not delivered on either side, the pack not claimed)
export const careerLeft = () => careerLevels().filter(id => Progress.bestTime(id, false) === undefined && Progress.bestTime(id, true) === undefined
  && !(Progress.data.claimed || []).includes('pack-' + id));

// a card's chance in one pack of a kind: { chance (a pack), slot (a plain slot) } or null: the kind cannot hold it.
// key: the car's key card (Bespoke); featured: the special pack's featured cars (packs.js featuredFor)
const chanceIn = (kind, car, { key = false, featured = [] } = {}) => {
  // (a key is listed only while not owned: ask as if it were not, so a pack that CAN hold it says so)
  const c = contents(kind, { featured, owned: key ? (id) => id !== car.id && Progress.owns(id) : undefined });
  if (!c) return null;
  if (!key) {
    const f = c.featured.find(x => x.car.id === car.id);
    if (f) return { chance: f.chance, slot: null, featured: true, rarity: f.rarity };
  }
  for (const group of c.groups) {
    const card = group.cards.find(x => x.car.id === car.id && !!x.key === key);
    if (card) return { chance: 1 - (1 - card.chance) ** c.size, slot: card.chance, featured: false, rarity: group.rarity };
  }
  return null;
};

// the ways to come by packs of a kind (from: a special pack's event id): shop offers, the Career levels left, an
// event's stages and prize, the packs held
const waysFor = (kind, from, t) => {
  const ways = [];
  const held = Packs.count(kind, from ?? undefined);
  if (held > 0) ways.push({ how: 'held', where: 'In your packs', available: true, why: null, detail: held + ' unopened' });
  for (const offer of shopData.offers || []) {
    if (offer.kind !== kind || (from && String(offer.from) !== String(from)) || (!from && offer.from)) continue;
    const event = offer.from ? Events.specials.find(e => e.id === String(offer.from)) : null;
    const state = offer.from ? (event ? eventState(event.from, event.to, t) : { live: false, why: 'Its event is not in the game' }) : { live: true, why: null };
    ways.push({ how: 'shop', where: 'Shop: ' + offer.name, available: state.live, why: state.live ? null : 'Not on sale: ' + state.why.replace(/^./, c => c.toLowerCase()),
      detail: CURRENCY.sign + ' ' + offer.price + ', ' + CASH + (event ? endsWords(event.to) : ''), placeholder: !!CURRENCY.placeholder });
  }
  if (kind === 'career') {
    const all = careerLevels(), left = careerLeft();
    ways.push({ how: 'career', where: 'Career levels', available: left.length > 0,
      why: left.length ? null : 'Every Career level that gives a pack is delivered already',
      detail: 'a pack on the first delivery of ' + all.length + ' levels: ' + left.length + ' left' });
  }
  const give = Packs.data.events || {};
  if (kind === 'special' || give.stage === kind || give.prize === kind) {
    for (const event of Events.specials) {
      if (from && event.id !== from) continue;
      const stage = give.stage === kind, prize = give.prize === kind && !!event.prize;
      if (!stage && !prize) continue;
      const state = eventState(event.from, event.to, t), done = Events.done(event), left = event.stages.length - done;
      const more = (stage && left > 0) || (prize && !Events.prizeWon(event));
      ways.push({ how: 'event', where: event.name, available: state.live && more,
        why: !state.live ? state.why : more ? null : 'Every stage done and its prize won',
        detail: [stage ? 'a pack for each stage done the first time (' + done + ' of ' + event.stages.length + ' done)' : '', prize ? 'one with the grand prize' : ''].filter(Boolean).join(', ') + endsWords(event.to) });
    }
  }
  return ways;
};

// one source a pack kind (a special pack: one an event), for a key card or a blueprint card
const packSources = (car, what, t) => {
  const key = what === 'key', out = [];
  for (const kind of KINDS) {
    const spec = Packs.data.kinds[kind];
    const froms = spec.featured ? Events.specials.map(e => e.id) : [null];
    for (const from of froms) {
      const featured = spec.featured ? featuredFor(from) : [];
      const hit = chanceIn(kind, car, { key, featured });
      const name = kindName(kind) + (from ? ': ' + (Events.specials.find(e => e.id === from)?.short || from) : '');
      if (!hit) {
        out.push({ what, how: 'pack', kind, from, where: name, available: false, chance: 0, rarity: null, ways: [], detail: '',
          why: 'Cannot hold it: ' + (key ? (spec.pool === 'all' ? 'not in its pool' : 'no keys in it')
            : spec.pool !== 'all' && !spec.featured ? 'evergreen cards only' : spec.featured ? 'evergreen cards and its featured cars only' : 'not in its pool') });
        continue;
      }
      const ways = waysFor(kind, from, t), open = ways.filter(w => w.available);
      out.push({ what, how: 'pack', kind, from, where: name, rarity: hit.rarity, chance: hit.chance,
        available: open.length > 0, ways,
        why: open.length ? null : (ways.find(w => w.how !== 'shop' && w.why) || ways.find(w => w.why))?.why || 'No way to get one', // (an event's or the Career's reason before the Shop's)
        detail: 'about ' + pct(hit.chance) + ' a pack' + (hit.featured ? ' (a featured card)' : '') + (open.length ? ': ' + open.map(w => w.where).join(', ') : '') });
    }
  }
  return out;
};

// why a car has no blueprints (null: it has them)
const noBlueprintsWhy = (car) => {
  if (!Ecu.kind(car)) return 'It has no ECU: no blueprints';
  if (Ecu.isSpecial(car)) return 'A special car: it stays at ECU1, no blueprints';
  if (!Ecu.rarity(car) || !rarityOf(car)) return car.tier === 1 && !car.blue ? 'A 1-gold starter: it comes maxed, no blueprints' : 'No blueprint cards for it';
  return null;
};

// what getting the car itself is called (the owner, 12-Oct: a Garage car has no key): a Garage car is PURCHASED (Crazey Jim's), an earned
// car EARNED, and only a Key car (Bespoke, event) has a KEY
export const ownWord = (car) => car.evergreen ? { label: 'Unlock', have: 'You have unlocked it', none: 'No way to unlock it', again: 'You have unlocked it already', owned: 'unlocked' }
  : car.bespoke || car.event ? { label: 'Key', have: 'You have its key', none: 'No way to get its key', again: 'You have its key already', owned: 'owned' }
  : car.earned ? { label: 'Earn', have: 'You have earned it', none: 'No way to earn it', again: 'You have earned it already', owned: 'earned' }
    : { label: 'Purchase', have: 'You own it', none: 'No way to buy it', again: 'You own it already', owned: 'owned' };
// the key sources of a car (a key car): the car lot, a level's par, an event's prize, a Bespoke key card in packs
const keySources = (car, t) => {
  const out = [];
  if (CARS.includes(car) && !car.tank) {
    const ok = forSale(car), tier = carTier(car);
    out.push({ what: 'key', how: 'lot', where: 'Crazey Jim\'s Used Cars', rarity: null, ways: [], available: ok,
      why: ok ? null : 'Not for sale yet: ' + (tier ? Tiers.tierName(tier) + ' is not open' : 'its tier is not open'),
      detail: 'bought for ' + money(car.price) + (ok && Progress.data.money < car.price ? ' (you have ' + money(Progress.data.money) + ')' : '') });
  }
  if (car.earned && EARNED_CARS.includes(car)) {
    const level = levelById(car.earned.level), open = !!level && Tiers.isOpen(level);
    const par = car.earned.par;
    out.push({ what: 'key', how: 'level', where: level ? levelName(level) : car.earned.level, rarity: null, ways: [],
      available: !car.off && open,
      why: car.off ? 'Not to be had for now' : !level ? 'Its level is not in the game' : open ? null : 'Level not open yet: ' + Tiers.lockedBecause(level),
      detail: 'won by delivering with ' + par.good + ' s to spare as Good' + (par.evil !== undefined ? ' and ' + par.evil + ' s as Evil' : '') });
  }
  for (const event of Events.specials) {
    if (event.prize?.car !== car.id) continue;
    const state = eventState(event.from, event.to, t), won = Events.prizeWon(event);
    out.push({ what: 'key', how: 'event', where: event.name, rarity: null, ways: [], available: state.live && !won,
      why: won ? 'Prize already won' : state.why,
      detail: 'the grand prize for all ' + event.stages.length + ' stages' + endsWords(event.to) });
  }
  for (const entry of PLAIN_EVENTS) {
    if (!entry || typeof entry !== 'object' || entry.reward?.car !== car.id) continue;
    const level = levelById(entry.id), state = eventState(when(entry.from), when(entry.to), t);
    out.push({ what: 'key', how: 'event', where: level ? levelName(level) : String(entry.id), rarity: null, ways: [], available: state.live,
      why: state.why, detail: 'an event\'s reward' + endsWords(when(entry.to)) });
  }
  if (isBespokeCar(car)) out.push(...packSources(car, 'key', t).filter(s => s.chance > 0)); // (a Bespoke key card: only the kinds that can hold one)
  return out;
};

export const sourcesOf = (car, { t = Events.now() } = {}) => {
  if (!car) return null;
  const kind = Ecu.kind(car);
  const keyOwned = kind === 'key' && Ecu.hasKey(car);
  const keyless = kind === 'blueprint' ? 'A blueprint car: no key, its first ' + Ecu.x(car) + ' blueprints unlock it' : kind ? null : 'Not a car of the roster';
  let keys = kind === 'key' ? keySources(car, t) : [];
  if (keyOwned) keys = keys.map(s => ({ ...s, available: false, why: ownWord(car).again }));
  const noBlueprints = noBlueprintsWhy(car);
  let blueprints = noBlueprints ? [] : packSources(car, 'blueprints', t);
  const maxed = !noBlueprints && Ecu.reached(car) >= Ecu.max(car);
  if (maxed) blueprints = blueprints.map(s => ({ ...s, available: false, why: 'At its max ECU (' + Ecu.max(car) + '): no more blueprints needed' }));
  return { car, keys, blueprints, keyOwned, keyless, noBlueprints, maxed,
    obtainable: { key: keys.some(s => s.available), blueprints: blueprints.some(s => s.available) } };
};

// one line for a car (the car lot's tooltip): 'Key: ... · Blueprints: ...', or 'Not obtainable right now'
export const sourcesLine = (car, opts) => {
  const s = sourcesOf(car, opts);
  if (!s) return '';
  const list = (items) => [...new Set(items.filter(x => x.available).map(x => x.where))].join(', ');
  const w = ownWord(car).label, key = s.keyOwned ? w + ': owned' : s.keyless ? '' : s.obtainable.key ? w + ': ' + list(s.keys) : w + ': not obtainable right now';
  const bp = s.noBlueprints ? 'No blueprints' : s.maxed ? 'Blueprints: maxed' : s.obtainable.blueprints ? 'Blueprints: ' + list(s.blueprints) : 'Blueprints: not obtainable right now';
  return [key, bp].filter(Boolean).join(' · ');
};
