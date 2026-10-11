// A check of the messages' times and the sticky messages (CONFIG.messageTimes, src/delivery/messages.js) and of
// the mystery effect's name in the pickup status (Player.mysteryName), headless.
//   node scripts/.hud-check.mjs
import { readFileSync } from 'node:fs';
import { boot } from './delivery-headless.mjs';

const g = await boot({ cars: ['commuter', 'sport', 'lowrider'] });
let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
try {
  const { Message, timeFor } = await g.load('messages.js');
  const { Pickups } = await g.load('pickups.js');
  const { Radiation } = await g.load('radiation.js');
  const MESSAGES = JSON.parse(readFileSync(new URL('../src/delivery/messages.json', import.meta.url), 'utf8'));
  const P = g.Player, G = g.Game, T = g.CONFIG.messageTimes, M = g.CONFIG.mystery;

  // ---- every message has a time, from the table
  const paths = [];
  const walk = (node, path) => Array.isArray(node) ? paths.push(path) : Object.keys(node).forEach(k => walk(node[k], [...path, k]));
  walk(MESSAGES, []);
  const said = paths.filter(p => p[0] !== 'bustCount' && p[0] !== 'mysteryNames' && p[0] !== 'stickyNames'); // (those three are words put into a message, the status or an icon's label, never said)
  const timeless = said.filter(p => !(timeFor(...p) > 0 && Number.isFinite(timeFor(...p))));
  check(!timeless.length, `${said.length} messages in messages.json, each with a time from CONFIG.messageTimes` + (timeless.length ? ': none for ' + timeless.map(p => p.join('.')).join(', ') : ''));
  check(T.default > 0 && T.fade > 0 && ['reaction', 'pickup', 'rage', 'bust'].every(k => T.kinds[k] > 0), 'a default, a fade and a time for each kind (reaction, pickup, rage, bust)');
  check(g.CONFIG.messageTime === undefined && g.CONFIG.messageExtra === undefined && g.CONFIG.messageFade === undefined, 'the old messageTime / messageExtra / messageFade are gone');
  const sources = ['messages.js', 'render/hud.js'].map(f => readFileSync(new URL('../src/delivery/' + f, import.meta.url), 'utf8'));
  check(!sources.some(s => /\btime\s*[:=]\s*\d/.test(s.replace(/time: 0/g, ''))), 'no time written as a number in messages.js or render/hud.js');
  // (the table's order: its own path, then its group, then its kind)
  T.keys['events.fog'] = 9; T.groups.zones = 8;
  check(timeFor('events', 'fog') === 9 && timeFor('zones', 'sydney') === 8 && timeFor('events', 'tunnel') === T.kinds.pickup && timeFor('busts', 'seen') === T.kinds.bust,
    'a time by path beats one by group, which beats one by kind');
  delete T.keys['events.fog']; delete T.groups.zones;

  // ---- the sticky table: every path is a message, every condition one player.js has
  const known = new Set(paths.map(p => p.join('.')));
  for (const [path, condition] of Object.entries(T.sticky)) {
    check(known.has(path) && !!Message.conditions[condition]?.on, `sticky ${path}: a message in messages.json ("${Message.pick(...path.split('.'))}"), lasting for "${condition}"`);
  }

  const start = () => {
    g.select('suburbs');
    g.cars.selectCar('sport');
    G.evil = false;
    P.testGhost = false;
    G.start();
    g.drive(1, 0);
    g.run(3);
    P.testGhost = true;
    for (const p of Pickups.items) p.taken = true;
  };
  const sticky = (path) => Message.sticky.find(h => h.path === path);
  // (the messages' clock, in this check's hands from here: a message's time passes when `clock` is moved on)
  let clock = performance.now();
  Object.defineProperty(performance, 'now', { value: () => clock, configurable: true });
  const showing = (text) => Message.lines.some(l => l.text === text && clock - l.at < l.time * 1000);
  // (what the HUD draws an icon for: every message held, by its path)
  const icons = () => Message.sticky.map(h => h.path);
  const mystery = (effect) => { P.nextMystery = effect; P.collect('mystery'); P.nextMystery = ''; };

  // ---- each sticky message comes with its condition and goes with it
  // (what starts each one, and what ends it)
  const cases = {
    'events.puncture': [() => P.punctureTyre(1), () => { P.puncture = 0; }],
    'events.beached': [() => { P.beached = 1.5; Message.say('events', 'beached'); }, () => { P.beached = 0; }],
    'powerups.badGas': [() => { P.collect('badGas'); Message.say('powerups', 'badGas'); }, () => { P.badGas = 0; }],
    'powerups.heavyMass': [() => { P.collect('heavyMass'); Message.say('powerups', 'heavyMass'); }, () => { P.heavy = 0; }],
    'powerups.butterfingers': [() => { P.collect('butterfingers'); Message.say('powerups', 'butterfingers'); }, () => { P.butterfingers = 0; }],
    'events.infected': [() => Radiation.infect(), () => { Radiation.infected = false; }], // (radiation.js: a full meter, or an infected car touched)
  };
  for (const path of Object.keys(T.sticky)) {
    const effect = path.startsWith('powerups.mystery.') ? path.split('.')[2] : null;
    const [begin, end] = effect ? [() => mystery(effect), () => P.endMystery()] : cases[path] || [];
    if (!begin) { check(false, `sticky ${path}: this check has no way to start it`); continue; }
    start();
    begin();
    g.run(0.5);
    const up = sticky(path), text = up?.line.text;
    // (its words are an ordinary message: up now, for the time the table gives any message of its kind...)
    const said = !!up && showing(text) && up.line.time === timeFor(...path.split('.'));
    // (...and gone after that time, the condition still on and its icon with it)
    clock += up ? up.line.time * 1000 + 50 : 0;
    g.run(0.2);
    const wordsGone = !showing(text), iconStays = !!sticky(path) && icons().length === 1;
    // (ordinary messages don't push it out: four more said, and it is still held)
    Message.say('events', 'fog'); Message.say('busts', 'seen'); Message.say('wrecks', 'byPlayer'); Message.say('events', 'tunnel');
    g.run(0.2);
    const kept = !!sticky(path) && !Message.lines.some(l => l.text === text);
    end();
    g.run(0.1);
    const ok = said && wordsGone && iconStays && kept && !sticky(path) && !icons().length;
    check(ok, `sticky ${path}: said as a message ("${text}", ${up?.line.time} s), its words gone after that with the condition still on and its icon up, the icon gone when it ends` +
      (ok ? '' : ` [said ${said}, words gone ${wordsGone}, icon stays ${iconStays}, kept ${kept}, gone ${!sticky(path)}]`));
  }
  // ---- several at once: an icon each, and no words left once their messages have had their time
  start();
  P.punctureTyre(1); mystery('noBrakes');
  // (in play one powerup cuts short the one before, so three icons is the most: the timers are set by hand here)
  for (const [type, timer] of [['badGas', 'badGas'], ['heavyMass', 'heavy'], ['butterfingers', 'butterfingers']]) { P[timer] = g.CONFIG[type].time; Message.say('powerups', type); }
  g.run(0.3);
  const five = Message.sticky.map(h => h.line.text), wordsUp = five.filter(showing).length;
  clock += Math.max(...Message.sticky.map(h => h.line.time)) * 1000 + 50;
  g.run(0.2);
  check(five.length === 5 && wordsUp <= Message.lines.length && icons().length === 5 && new Set(icons()).size === 5 && !five.some(showing),
    `five conditions at once: five icons, each its own; never more words than the ${Message.lines.length} message lines (${wordsUp} at first), none after their time`);
  // (the icon of one with time left drains: half way through the bad gas, about half its ring)
  g.run(g.CONFIG.badGas.time / 2 - 0.5);
  const half = sticky('powerups.badGas')?.progress;
  check(half > 0.4 && half < 0.6 && sticky('powerups.mystery.noBrakes')?.progress > 0.3, `an icon's ring drains with the time left (bad gas ${(half * 100 || 0).toFixed(0)}% gone half way through)`);
  // (touched, an icon says its message again, for the recall time, as an ordinary message)
  const again = Message.recall('powerups.badGas'), badGasText = sticky('powerups.badGas')?.line.text;
  check(!!again && showing(badGasText) && again.time === T.recall && Message.lines.includes(again) && Message.recall('events.fog') === null,
    `an icon touched: its message again for ${T.recall} s ("${badGasText}"), on a message line; nothing for a message not held`);
  clock += T.recall * 1000 + 50;
  check(!showing(badGasText) && !!sticky('powerups.badGas'), '...and gone again after that, the icon still there');
  // (each has a picture of its own and a name; the HUD draws icons, and no rows of words)
  const { STICKY_ICONS, stickyIcon } = await g.load('render/hudIcons.js');
  const drawn = Object.entries(T.sticky).map(([path, condition]) => {
    const key = path.split('.').pop(), h = { condition, key };
    return { path, art: stickyIcon(h), name: Message.pick(condition === 'mystery' ? 'mysteryNames' : 'stickyNames', condition === 'mystery' ? key : condition) };
  });
  const bare = drawn.filter(d => !d.name || d.art === STICKY_ICONS.other || !d.art.startsWith('<'));
  check(!bare.length && new Set(drawn.map(d => d.art)).size === drawn.length && new Set(drawn.map(d => d.name)).size === drawn.length,
    `${drawn.length} sticky messages, each with an icon and a name of its own (${drawn.map(d => d.name).join(', ')})` + (bare.length ? ': none for ' + bare.map(d => d.path).join(', ') : ''));
  const hudSource = readFileSync(new URL('../src/delivery/render/hud.js', import.meta.url), 'utf8'), css = readFileSync(new URL('../src/delivery/style.css', import.meta.url), 'utf8');
  check(hudSource.includes('stickyIcon(h)') && hudSource.includes("setAttribute('aria-label'") && !/line\.text;\s*\n?\s*row/.test(hudSource) && !hudSource.includes("className = 'row'") && !css.includes('#sticky .row') && T.stickyRows === undefined,
    'render/hud.js draws an icon for each (labelled), and no row of words: #sticky .row and stickyRows are gone');
  const I = T.stickyIcons;
  check(['size', 'gap', 'across', 'shift'].every(k => ['wide', 'portrait', 'short'].every(shape => I?.[k]?.[shape] !== undefined)) && T.recall > 0 && !/#sticky[^}]*[\s{;](width|height|gap):\s*\d+px/.test(css),
    'the icons\' size, gap, row and place are in CONFIG.messageTimes.stickyIcons for each screen shape, not written into style.css');
  // (the puncture's progress: the tyre being changed, stopped)
  start();
  P.punctureTyre(1);
  g.drive(-1, 0);
  g.run(8, () => P.speed < 0.3 && P.fixing > 1);
  const mid = sticky('events.puncture')?.progress;
  g.run(g.CONFIG.puncture.fixTime + 1, () => !P.puncture);
  g.run(0.1);
  check(mid > 0.2 && mid < 1 && !sticky('events.puncture'), `the puncture's message shows the tyre being changed (${(mid * 100 || 0).toFixed(0)}% when looked at), and goes once it is`);

  // ---- a sticky message clears at a wreck, a bust and the end of the run
  start(); P.punctureTyre(1); mystery('noBrakes'); g.run(0.3);
  const two = Message.sticky.length;
  P.testGhost = false; P.health = 0; g.run(0.5);
  check(two === 2 && !Message.sticky.length && !P.active, 'a wreck clears them (two up before, none after)');
  start(); mystery('noBrakes'); g.run(0.3);
  const before = Message.sticky.length;
  P.testGhost = false; P.bust('shoulder'); g.run(0.2);
  check(before === 1 && !Message.sticky.length, 'a bust clears them (' + (P.busted || !P.active ? 'busted' : 'NOT busted') + ')');
  start(); mystery('rickety'); g.run(0.3);
  const atEnd = Message.sticky.length;
  G.finish('timeout'); g.run(0.1); Message.settle();
  check(atEnd === 1 && !Message.sticky.length, 'the end of the run clears them');
  start(); mystery('rickety'); g.run(0.3); G.start();
  check(!Message.sticky.length, 'a new run starts with none');
  // (an ordinary message is never held)
  start(); Message.say('events', 'fog'); P.collect('turbo'); Message.say('powerups', 'turbo'); mystery('giant'); g.run(0.2);
  check(!Message.sticky.length && P.mystery === 'giant', 'an ordinary message, and a mystery not in the table (giant), are not held');

  // ---- the pickup status names the mystery effect, for as long as it lasts
  const lasting = [...new Set([...M.effects, ...M.extraEffects, M.fallback])];
  for (const effect of lasting) {
    const name = Message.pick('mysteryNames', effect);
    start();
    g.select('suburbs');
    mystery(effect);
    g.run(0.2);
    if (!P.mystery) { // (over at once: the insurance ones, the air strike, the train, the rewind)
      check(!!name && P.mysteryName === '', `${effect}: over at once, no status (its name, should it ever need one: "${name}")`);
      continue;
    }
    const ran = P.mystery, shown = P.mysteryName, total = P.mysteryTime;
    g.run(Math.max(0, total - 1.5));
    const late = P.mysteryName, left = P.mysteryTime;
    g.run(3);
    check(!!name && name.toLowerCase() !== 'mystery' && shown === Message.pick('mysteryNames', ran) && late === shown && left > 0 && P.mysteryName === '' && (ran === effect || ran === M.fallback),
      `${effect}: the status reads "${shown.toUpperCase()} ${total.toFixed(1)}" and still "${late.toUpperCase()} ${left.toFixed(1)}" near its end, then nothing` + (ran === effect ? '' : ` (given as ${ran}: it doesn't suit this car or level)`));
  }
  // (the fallback, where the effect doesn't fit: a rewind in a race)
  check(!!Message.pick('mysteryNames', M.fallback), `the fallback (${M.fallback}) has a name: "${Message.pick('mysteryNames', M.fallback)}"`);
  const hud = readFileSync(new URL('../src/delivery/render/hud.js', import.meta.url), 'utf8');
  check(hud.includes('Player.mysteryName') && !hud.includes("'MYSTERY '"), 'render/hud.js writes the name, not "MYSTERY"');
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (e.stack || e));
}
await g.close();
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
