// A check of PROGRESSIVE UNLOCK (src/delivery/featuregates.js, drawn by render/progressui.js; a prototype behind ?progress=new:
// PROGRESSIVE-UNLOCK.md), headless: the table is well formed; every menu entry of delivery/index.html (and the Shop's and Jim's chips)
// has a gate or 'always'; the save rules on synthetic saves (an old save with progress: everything; an old save with nothing and a
// brand-new one: the ladder); the ladder in order; `seen` kept through a save and a reload, sticky, cleaned; the switch (?progress=new /
// new:on / off / all); a brand-new save hides exactly the gated entries and a full one none; the save's size (the cookie under its cap,
// `seen` a few dozen bytes); and the replays' rules fingerprint the same as the branch it was built on (origin/claude/new-player).
//   node scripts/.featuregates-check.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { boot } from './delivery-headless.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const g = await boot();
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const F = await g.load('featuregates.js');
  const { GATES, GATE_IDS, SECTIONS, gatesMode, openGates, pendingIntros, adopt, markSeen, cleanSeen, isLegacy, hasProgress, deliveries, KEY } = F;
  const P = g.progress, LEVELS = g.levels.LEVELS;
  const T1 = ['expressway', 'back-roads', 'farm', 'big-business', 'hurricane'], T2 = ['mystery-meadows', 'night', 'monte-carlo', 'suburbs', 'mumbai'];
  const blank = () => ({ money: 0, unlocked: 1, cars: ['commuter'], car: 'commuter', bestTime: { good: {}, evil: {} }, evil: false, events: {}, claimed: [],
    blueprints: {}, packs: {}, packLog: [], shopCash: 0, ecuBought: {}, packBuys: {}, stats: {} });
  const delivered = (ids, d = blank()) => { for (const id of ids) d.bestTime.good[id] = 20; d.unlocked = ids.length + 1; return d; };

  // ---- the table ----
  check(new Set(GATE_IDS).size === GATES.length && GATES.every(x => /^[a-z]{2,12}$/.test(x.id)), 'gate ids unique and short: ' + GATE_IDS.join(', '));
  check(GATES.every(x => x.label && typeof x.trigger === 'function' && typeof x.intro === 'string' && x.intro.length > 0 && x.intro.length <= 44 && Array.isArray(x.hides) && (x.mark === null || typeof x.mark === 'string')),
    'every gate has a label, a trigger, an intro of 44 characters or fewer (longest ' + Math.max(...GATES.map(x => x.intro.length)) + '), hides and a mark');
  check(!GATES.some(x => /\b(he|she|man|woman|people|person|driver)\b/i.test(x.intro + x.label)), 'no intro speaks of people');
  // ---- every menu entry has a gate or 'always' ----
  const html = readFileSync(ROOT + '/delivery/index.html', 'utf8'), menu = html.slice(html.indexOf('id="startScreen"'));
  const ids = [...menu.matchAll(/<(?:button|a)\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]).concat(['shopBtn', 'jimBtn']); // (+ the chips shop.js puts in)
  const named = (id) => SECTIONS.some(([sel]) => sel === '#' + id || sel.startsWith('#' + id + ' '));
  const missing = ids.filter(id => !named(id));
  check(!missing.length, ids.length + ' buttons and links of the menu, the lot and the results each have a gate or always' + (missing.length ? ': MISSING ' + missing.join(', ') : ''));
  check(SECTIONS.every(([, , gate]) => gate === 'always' || GATE_IDS.includes(gate)), 'every section names a real gate or always');
  const unhidden = SECTIONS.filter(([sel, , gate, via]) => gate !== 'always' && !via && !GATES.find(x => x.id === gate).hides.includes(sel));
  check(!unhidden.length, 'every gated section is hidden by its gate (its selector in the gate\'s hides, or a container named)' + (unhidden.length ? ': ' + unhidden.map(s => s[0]).join(', ') : ''));
  check(GATES.every(x => x.hides.length === 0 || SECTIONS.some(s => s[2] === x.id)), 'every gate that hides something has its sections listed');

  // ---- the switch ----
  localStorage.removeItem(KEY);
  check(gatesMode('') === 'off', 'off by default (nothing changes for anyone)');
  check(gatesMode('?progress=new') === 'on' && localStorage.getItem(KEY) === null && gatesMode('') === 'off', '?progress=new: on for the visit, nothing remembered');
  check(gatesMode('?progress=new:on') === 'on' && gatesMode('') === 'on', '?progress=new:on: remembered');
  check(gatesMode('?progress=all') === 'all', '?progress=all: everything for the visit');
  check(gatesMode('?progress=off') === 'off' && gatesMode('') === 'off', '?progress=off: forgotten');

  // ---- the save rules, on synthetic saves ----
  const fresh = blank();
  check(!hasProgress(fresh) && !isLegacy(fresh), 'a brand-new save: no progress, not legacy');
  check(openGates(fresh, 'off').size === GATES.length && openGates(fresh, 'all').size === GATES.length, 'switch off or all: every gate open, even on a brand-new save');
  check(adopt(fresh) && Array.isArray(fresh.seen) && fresh.seen.length === 0 && !adopt(fresh), 'a brand-new save starts the ladder once (seen: [])');
  check(openGates(fresh).size === 0 && pendingIntros(fresh).length === 0, 'a brand-new save on the ladder: every gate shut, nothing to introduce');
  const oldFull = delivered([...T1, ...T2]); oldFull.money = 3120; oldFull.cars.push('junker', 'darkvan', 'sport');
  check(isLegacy(oldFull) && openGates(oldFull).size === GATES.length && pendingIntros(oldFull).length === 0 && !adopt(oldFull) && oldFull.seen === undefined,
    'an old save with progress (10 levels, $3120, 4 cars): LEGACY, every gate open, no intro, nothing written');
  for (const [what, d] of [['one level delivered', delivered(['expressway'])], ['only money', Object.assign(blank(), { money: 5 })], ['only a second car', Object.assign(blank(), { cars: ['commuter', 'junker'] })],
    ['only Evil picked', Object.assign(blank(), { evil: true })], ['only a pack opened', Object.assign(blank(), { packLog: [{ kind: 'daily', cards: [] }] })],
    ['only an event stage', Object.assign(blank(), { events: { comet: 1 } })], ['only a blueprint', Object.assign(blank(), { blueprints: { sport: 2 } })], ['only a level open', Object.assign(blank(), { unlocked: 3 })]]) {
    check(isLegacy(d) && openGates(d).size === GATES.length, 'an old save with ' + what + ': legacy, everything');
  }
  const oldEmpty = blank(); oldEmpty.stats = { kmDriven: 3.2 }; oldEmpty.muted = true; // (played, failed, no delivery: no progress)
  check(!isLegacy(oldEmpty) && adopt(oldEmpty) && openGates(oldEmpty).size === 0, 'an old save with nothing (a failed run, a setting): treated as new, the ladder');

  // ---- the ladder ----
  const order = [];
  const d = blank(); adopt(d);
  for (let n = 1; n <= 10; n++) {
    delivered([...T1, ...T2].slice(0, n), d);
    const now = [...openGates(d)];
    for (const id of now) if (!order.includes(id)) order.push(id);
  }
  check(order.join() === GATE_IDS.join(), 'deliveries 1 to 10 open the gates in the ladder\'s order: ' + order.join(' > '));
  const one = delivered(['expressway']); one.seen = [];
  check([...openGates(one)].join() === 'cars' && pendingIntros(one).map(x => x.id).join() === 'cars', 'after the first delivery: Better cars, introduced');
  one.cars.push('junker');
  check(openGates(one).has('style') && !openGates(one).has('evil'), 'a car bought: Style opens (Evil still shut)');
  const three = delivered(T1.slice(0, 3)); three.seen = ['cars', 'replays', 'style'];
  check(pendingIntros(three).map(x => x.id).join() === 'evil', 'after three deliveries: Evil to introduce');
  const pk = blank(); pk.seen = []; pk.packLog = [{ kind: 'career', cards: [] }]; pk.blueprints = { sport: 1 };
  check(openGates(pk).has('shop') && openGates(pk).has('blueprints') && !openGates(pk).has('events'), 'a first pack opens the Shop, a first blueprint the blueprints, at once');

  // ---- seen: kept, sticky, cleaned ----
  const sticky = blank(); sticky.seen = []; sticky.money = 400;
  check(!openGates(sticky).has('shop') && markSeen(sticky, 'shop') && openGates(sticky).has('shop'), 'a gate seen (Show all menus, an OK) stays open whatever the triggers say');
  check(!markSeen(sticky, 'shop') && !markSeen(sticky, 'nonsense') && sticky.seen.join() === 'shop', 'seen once each, unknown ids refused');
  const dirty = { seen: ['shop', 'shop', 'bogus', 7] }; cleanSeen(dirty);
  const notArr = { seen: 'x' }; cleanSeen(notArr);
  check(dirty.seen.join() === 'shop' && notArr.seen === undefined, 'seen cleaned as read (duplicates, unknown ids, not an array)');
  const evilBefore = sticky.evil; markSeen(sticky, GATE_IDS); adopt(sticky);
  check(sticky.evil === evilBefore && openGates(sticky).size === GATES.length, 'Show all menus: every gate open; the save\'s evil flag untouched');
  // through Progress.save and a reload (local storage, the store of record)
  P.reset();
  adopt(P.data); delivered(['expressway'], P.data); markSeen(P.data, 'cars'); // (adopted new, then a delivery)
  P.save();
  P.reload();
  check(Array.isArray(P.data.seen) && P.data.seen.join() === 'cars' && !isLegacy(P.data), 'seen kept through Progress.save and a reload (local storage)');
  const backup = localStorage.getItem('delivery_racer_progress_backup');
  check(JSON.stringify(P.data.seen).length <= 120 && JSON.stringify(GATE_IDS).length <= 120, '`seen` is tiny: ' + JSON.stringify(P.data.seen).length + ' bytes now, ' + JSON.stringify(GATE_IDS).length + ' with every gate');
  // the cookie alone (local storage lost): it does not carry `seen` (progress.js COOKIE_KEYS is a replay rule file: not changed), so the save
  // reads as LEGACY: everything shown, never anything hidden
  localStorage.removeItem('delivery_racer_progress_backup');
  P.reload();
  check(P.data.seen === undefined && isLegacy(P.data) && openGates(P.data).size === GATES.length, 'the cookie alone (no local storage): no seen, read as legacy, everything shown (the safe way)');
  localStorage.setItem('delivery_racer_progress_backup', backup);
  P.reload();
  // a save code (export / import): it carries no `seen` either: the same, legacy
  const code = P.exportCode(); P.importCode(code);
  check(P.data.seen === undefined && isLegacy(P.data), 'a save code brought in: no seen, legacy (everything shown)');

  // ---- what a brand-new save and a full save hide ----
  const hiddenFor = (save) => { const open = openGates(save); return SECTIONS.filter(([, , gate]) => gate !== 'always' && !open.has(gate)).map(s => s[1]); };
  const nb = blank(); adopt(nb);
  const shownNew = SECTIONS.filter(([, , gate]) => gate === 'always').map(s => s[1]);
  check(hiddenFor(nb).length === SECTIONS.filter(s => s[2] !== 'always').length && shownNew.includes('Start') && shownNew.includes('Car card (Showroom, Crazey Jim’s lot)') && !shownNew.includes('Events tab and its dot'),
    'a brand-new save hides the ' + hiddenFor(nb).length + ' gated entries and shows the ' + shownNew.length + ' always ones (Career, the car card, Good, Start, Options\' settings, guide and save)');
  check(hiddenFor(oldFull).length === 0, 'an old full save hides nothing');
  const every = delivered(LEVELS.filter(l => !g.levels.isRace(l)).map(l => l.id)); every.seen = [];
  check(hiddenFor(every).length === 0 && deliveries(every) >= 10, 'a ladder save with everything delivered (Unlock everything): nothing hidden');

  // ---- the cookie's size ----
  P.reset();
  P.complete({ levels: LEVELS.length, cars: g.cars.CARS.map(c => c.id), money: g.CONFIG.completeBank });
  P.data.seen = [...GATE_IDS];
  P.save();
  const cookie = document.cookie.length, withSeen = cookie + encodeURIComponent(',"seen":' + JSON.stringify(GATE_IDS)).length;
  check(cookie <= 4096 && withSeen <= 3600, 'a full save\'s cookie: ' + cookie + ' bytes (cap 4096); were `seen` added to COOKIE_KEYS (a proposal): about ' + withSeen);
  P.reset();

  // ---- not part of the rules ----
  const { logicFiles } = await import(ROOT + '/vite.config.js');
  const logic = logicFiles();
  check(!logic.some(f => /featuregates|progressui/.test(f)), 'the replays\' rules (' + logic.length + ' files) leave out featuregates.js and render/progressui.js');
  const hash = (rev) => {
    const h = createHash('sha256');
    for (const f of logic) {
      let t;
      try { t = rev ? execSync('git show ' + rev + ':src/delivery/' + f, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 }) : readFileSync(ROOT + '/src/delivery/' + f); } catch { return null; }
      h.update(f + '\0'); h.update(t);
    }
    return h.digest('hex').slice(0, 10);
  };
  let base = null;
  for (const rev of ['origin/claude/new-player', '6b97a47']) { try { execSync('git rev-parse --verify -q ' + rev, { cwd: ROOT, stdio: 'ignore' }); base = rev; break; } catch { /* (the next) */ } }
  const here = hash(null), there = base ? hash(base) : null;
  check(here === there, 'the replays\' rules fingerprint here ' + here + ', on ' + base + ' ' + there + ': the same');
} catch (e) { failures++; console.log('  FAIL  ' + (e && e.stack || e)); }
await g.close();
console.log(failures ? failures + ' failed' : 'all ok');
process.exit(failures ? 1 : 0);
