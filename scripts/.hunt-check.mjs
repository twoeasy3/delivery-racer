// A check of the CAR HUNT's calendar (the owner, 15-Oct: "Do all [the feature roster cars], shuffle the order, and they cycle. A
// car hunt is to be active at all times. The events tab should always have a Car Hunt; they last three days each and cycle. The
// Car Hunt pack in the shop should always correspond to the current car hunt"; then 23 cars: the 19 and the four Legendary
// blueprint fillers; CHECKLIST 345). events.json car-hunt `hunt`, src/delivery/hunt.js, events.js, packs.js featuredOf.
// Over a year of days (by the events' clock, Events.now, as ?eventsnow= moves it), in two time zones across their clock changes:
// a hunt is live every day, at midnight, noon and a second before midnight; each window is 3 whole local days, back to back;
// every car once a cycle (69 days), never the same car or the same stars twice running (the seam too); the Car Hunt pack, the
// Shop's Car Hunt 5-pack and their What's inside feature the event's car every day; the order is shuffled but FIXED (written
// out below: an edit of events.json's order fails here on purpose); and the featured cards at each car's TRUE rarity.
//   node scripts/.hunt-check.mjs
import { boot } from './delivery-headless.mjs';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// the year is walked in a time zone of its own, a run of this script with TZ set (the device's zone is fixed while the game runs:
// events.js reads its dates once): `--zone` is that run, printing its lines and the windows' cars
const ZONES = ['Europe/London', 'America/Los_Angeles'];
const zoneRun = process.argv.includes('--zone');
let bad = 0;
if (!zoneRun) {
  const out = {};
  for (const tz of ZONES) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--zone'], { env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 600e3 });
    const lines = String(r.stdout || '').split('\n');
    for (const line of lines) if (/^ {2}(ok|FAIL)/.test(line)) console.log(line.replace(/^( {2}\S+ +)/, '$1' + tz + ': '));
    bad += lines.filter(l => /^ {2}FAIL/.test(l)).length + (r.status === 0 ? 0 : 1);
    out[tz] = (lines.find(l => l.startsWith('SEQ ')) || '').slice(4);
    if (r.status !== 0 && r.stderr) console.log(String(r.stderr).slice(-2000));
  }
  if (!out[ZONES[0]] || out[ZONES[0]] !== out[ZONES[1]]) bad++;
  console.log((out[ZONES[0]] && out[ZONES[0]] === out[ZONES[1]] ? '  ok    ' : '  FAIL  ') + 'the same car on the same calendar day in both zones (no server: every device works it out alike)');
}

const g = await boot({ cars: ['commuter'] });
let failures = bad;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const { Progress } = await g.load('progress.js');
const { Events } = await g.load('events.js');
const P = await g.load('packs.js');
const { Shop } = await g.load('shop.js');
const { huntEventFor, sourcesOf } = await g.load('carsources.js');
const { Ecu } = await g.load('ecu.js');
const H = await g.load('hunt.js');
const cars = g.cars;
// the order as it was written on 15-Oct (scripts/events.mjs hunt-order 127): FIXED. Changing it is a decision: change it here too
const ORDER = ['coach', 'keivan', 'blower', 'finlandyacht', 'cranelorry', 'sporttruck', 'farmtractor', 'coupecross', 'cityev', 'armouredlimo', 'sprinthatch',
  'trophytruck', 'flatbed', 'halftrack', 'pixelev', 'wedgemicro', 'moorrover', 'minibus', 'touringcar', 'moke', 'autobahnestate', 'hillclimb', 'supermini'];
const FOUR = ['blower', 'coach', 'cityev', 'coupecross'];

try {
  Progress.reset(); Progress.noSave = true;
  const hunt = Events.specials.find(e => e.id === 'car-hunt');
  check(Events.problems().length === 0, 'events.json and packs.json sound: ' + (Events.problems().join('; ') || 'yes'));
  const ids = hunt.hunt.cars, roster = cars.FEATURE_ROSTER.map(c => c.id);
  check(ids.length === 23 && new Set(ids).size === 23 && roster.length === 19 && roster.every(id => ids.includes(id)) && FOUR.every(id => ids.includes(id))
    && ids.every(id => roster.includes(id) || FOUR.includes(id)), 'the hunt: 23 cars, each once: the 19 feature-roster cars and the Blower Tourer, Highway Coach, City EV and Coupe Crossover');
  check(JSON.stringify(ids) === JSON.stringify(ORDER), 'the order is the fixed one written on 15-Oct (' + ids.join(' ') + ')');
  const plain = [...roster, ...FOUR];
  const same = ids.filter((id, i) => id === plain[i]).length;
  check(same <= 3 && JSON.stringify(ids) !== JSON.stringify(plain), 'it is shuffled: ' + same + ' of 23 in the place cars.js lists them');
  const tier = (id) => cars.carTier(cars.carById(id));
  check(ids.every((id, i) => tier(id) !== tier(ids[(i + 1) % ids.length])), 'no two cars of the same stars side by side, the last to the first included (' + ids.map(tier).join('') + ')');
  check(ids.every(id => { const c = cars.carById(id); return c.evergreen && c.noPacks && P.rarityOf(c); }), 'every one a blueprint car in no regular pack, with a blueprint card');

  // a year of days, in this run's time zone (each zone tried has a clock change in the year); the calendar is local
  const midnightOf = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const localDays = (a, b) => Math.round((b - a) / 86400e3); // (local midnights: 23 or 25 hours apart on a clock change)
  if (zoneRun) {
        const from = new Date(2026, 9, 12).getTime(); // (12 Oct 2026, local midnight: the hunt's `from` as hunt.js reads it in this zone)
    const bad = { live: [], len: [], pack: [], five: [], shop: [], inside: [], hunted: [], seq: [], src: [] };
    const seq = [];
    let lastStart = null;
    for (let day = 0; day < 366; day++) {
      const d0 = new Date(2026, 9, 12 + day).getTime();
      for (const t of [d0 + 1000, d0 + 12 * 3600e3, new Date(2026, 9, 13 + day).getTime() - 1000]) {
        Events.now = () => t;
        const h = Events.huntOf(hunt), c = Events.countdownOf(hunt), st = Events.state(hunt, 0);
        if (!(Events.live(hunt) && st.open && c?.words === 'Ends in' && Events.shownSpecials().includes(hunt) && h && h.start <= t && t < h.end && c.at === h.end)) bad.live.push(day);
        if (!(h.start === midnightOf(h.start) && localDays(h.start, h.end) === 3 && localDays(from, h.start) % 3 === 0)) bad.len.push(day);
        const f1 = P.featuredOf('car-hunt-special'), f5 = P.featuredOf('car-hunt-5');
        if (!(f1.length === 2 && f1.every(f => f.car === h.car && !f.key))) bad.pack.push(day);
        if (!(f5.length === 2 && f5.every(f => f.car === h.car))) bad.five.push(day);
        const offer = Shop.offers().find(o => o.pack === 'car-hunt-5');
        if (!(offer && (offer.featured || []).every(f => f.car === h.car) && H.huntCarOfPack('car-hunt-5') === h.car.id && H.huntCarOfPack('car-hunt-special') === h.car.id)) bad.shop.push(day);
        if (t === d0 + 12 * 3600e3) {
          const inside = P.contents('car-hunt-special', { featured: f1, maxed: () => false, owned: () => false });
          if (!(inside.featured.length === 2 && inside.featured.every(x => x.car === h.car && x.rarity === P.rarityOf(h.car)) && Math.abs(inside.featured[0].lastSlot - 0.9) < 1e-9)) bad.inside.push(day);
          const hv = huntEventFor(h.car), other = cars.carById(h.next.id), ho = huntEventFor(other);
          if (!(hv?.live && hv.event === hunt && ho && !ho.live && ho.next === h.end)) bad.hunted.push(day);
        }
        if (t === d0 + 1000 && day % 23 === 0) { // (Where to get it: the car hunted now obtainable from both packs; the next car not yet, with its date)
          const s = sourcesOf(h.car), n = sourcesOf(h.next);
          const now1 = s.blueprints.find(x => x.kind === 'car-hunt-special'), next1 = n.blueprints.find(x => x.kind === 'car-hunt-special');
          if (!(now1?.available && s.blueprints.find(x => x.kind === 'car-hunt-5')?.available && next1 && !next1.available && /^Its hunt: /.test(next1.why) && next1.chance > 0)) bad.src.push(day);
        }
      }
      Events.now = () => d0 + 12 * 3600e3;
      const h = Events.huntOf(hunt);
      if (h.start !== lastStart) { seq.push(h.car.id); lastStart = h.start; }
    }
    // the windows in turn: the order, round and round
    const cycles = Math.floor(seq.length / 23);
    const okSeq = seq.every((id, i) => id === ORDER[i % 23]) && seq.every((id, i) => i === 0 || id !== seq[i - 1]);
    for (let k = 0; k < cycles; k++) if (new Set(seq.slice(k * 23, k * 23 + 23)).size !== 23) bad.seq.push(k);
    if (!okSeq) bad.seq.push('order');
    const say = (list) => (list.length ? 'FAILED on ' + [...new Set(list)].slice(0, 8).join(', ') : 'every day');
    check(!bad.live.length, 'the Car Hunt live, its stage open, "Ends in" its car\'s end, at 00:00:01, 12:00 and 23:59:59 of 366 days from 12 Oct 2026 (' + say(bad.live) + ')');
    check(!bad.len.length, 'each window starts at local midnight and is 3 whole local days, back to back from 12 Oct (clock change included: ' + say(bad.len) + ')');
    check(!bad.pack.length && !bad.five.length, 'the Car Hunt pack and the Car Hunt 5-pack feature the event\'s car (' + say([...bad.pack, ...bad.five]) + ')');
    check(!bad.shop.length, 'the Shop\'s Car Hunt 5-pack offer, and the pack art\'s car (hunt.js huntCarOfPack), the event\'s car (' + say(bad.shop) + ')');
    check(!bad.inside.length, 'What\'s inside the Car Hunt pack: the event\'s car x1 90% / x3 10%, at its TRUE rarity (' + say(bad.inside) + ')');
    check(!bad.hunted.length && !bad.src.length, 'huntEventFor and Where to get it: the car hunted now live, the next car "Its hunt: <date>" (' + say([...bad.hunted, ...bad.src]) + ')');
    check(!bad.seq.length && seq.length === 122, seq.length + ' windows in the year, in the fixed order, ' + cycles + ' whole cycles of 23 (69 days) each with every car once, never a car twice running');
    console.log('SEQ ' + seq.join());
  }
  if (!zoneRun) {

  // the reveal / held packs: a pack keeps the car it was given for (also in .events-check.mjs, played)
  const from = hunt.from;
  Events.now = () => from + 5 * 3600e3;
  const first = Events.huntOf(hunt).car.id;
  P.Packs.grant('car-hunt-5');
  Events.now = () => from + 3 * 86400e3 + 5 * 3600e3;
  const second = Events.huntOf(hunt).car.id;
  P.Packs.grant('car-hunt-5');
  const a = P.Packs.open('car-hunt-5'), b = P.Packs.open('car-hunt-5');
  check(first !== second && a.car === first && a.cards.some(c => c.featured && c.car === first) && b.car === second && b.cards.some(c => c.featured && c.car === second) && !Progress.data.packCars['car-hunt-5'],
    'two 5-packs bought in two windows, opened later: each deals the car of its own window (' + first + ', ' + second + '), the queue empty after');
  const free = P.Packs.open('car-hunt-special', { free: true });
  check(free.car === second && free.cards.at(-1).car === second, 'a pack opened for a look (?pack=): the car hunted now');

  // TIERS: the stage the same for every car; the featured cards at each car's TRUE rarity; x1 / x3 (the hunt pack), x3 / x15 (the 5-pack)
  console.log('  the cars, in order: car, stars, card rarity, blueprints an ECU step (Ecu.x), max ECU, blueprints to max; the hunt pack 90% x1 / 10% x3, the 5-pack 90% x3 / 10% x15');
  const rows = ids.map(id => { const c = cars.carById(id), x = Ecu.x(c), m = Ecu.max(c); return { id, t: tier(id), r: P.rarityOf(c), x, m, all: x * m }; });
  for (const r of rows) console.log('        ' + r.id.padEnd(15) + ' ' + r.t + '*  ' + String(r.r).padEnd(10) + ' x=' + r.x + '  max ECU ' + r.m + '  to max ' + r.all
    + '  = ' + Math.ceil(r.all / 1.2) + ' hunt packs / ' + Math.ceil(r.all / 4.2) + ' 5-packs (expected values)');
  check(rows.every(r => r.r && r.x >= 1 && r.m >= 1), 'every car has a card rarity, an ECU ladder and a blueprint step (the featured cards give real blueprints)');
  const src = readFileSync(new URL('../src/delivery/render/packart.js', import.meta.url), 'utf8');
  check(/huntCarOfPack\(id\)/.test(src) && /packArt = \(id, count = 1, car = null\)/.test(src) && /packArt\(result\.kind, 1, result\.car\)/.test(readFileSync(new URL('../src/delivery/render/packs.js', import.meta.url), 'utf8')),
    'the pack art: a hunt pack draws the car hunted (the Shop tile, the event card), the reveal the car its pack was given for');
  }
} catch (error) {
  failures++;
  console.log('  FAIL  ' + (error?.stack || error));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all checks passed');
process.exit(failures ? 1 : 0);
