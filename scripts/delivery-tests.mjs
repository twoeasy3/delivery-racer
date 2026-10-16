// Runs Delivery Racer's tests by group, so an agent runs the set that is relevant to what it changed and not the lot.
//   node scripts/delivery-tests.mjs --list                  the groups: what each covers, how long it takes, which are heavy
//   node scripts/delivery-tests.mjs --group words,tiers      run those groups (a heavy one takes a heavy lock first, see below)
//   node scripts/delivery-tests.mjs --changed                the groups for the files changed against main (and in the working tree), run
//   node scripts/delivery-tests.mjs --changed --dry          ...only said, not run (which groups, which levels)
//   node scripts/delivery-tests.mjs --fast                   every light group (a few minutes in all)
//   node scripts/delivery-tests.mjs --group smoke-levels --levels=quarry-run,toys   the smoke's per-level checks for those levels
// Add --dry to any of them to see what would run. Exit code 1 if any test failed. See src/delivery/TESTS.md.
//
// Heavy tests (a minute or more and a lot of memory: the quick smoke, the replay and ideas checks, the level lists) take one of the
// two heavy locks (Temp/delivery-heavy.lock, Temp/delivery-heavy-2.lock; a directory made atomically) so that no more than two run
// at once across all agents; the runner waits for a free one and removes it when the test ends. A lock older than 25 minutes is
// taken to be left behind and removed. --no-lock skips this (only if nothing else is running).
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmdirSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const t = (file, extra = {}) => ({ file: 'scripts/' + file, ...extra });

// name: what it covers, tests (file, args, heavy), and `files`: the changed files (regular expressions, from the repo root) that
// call for it. `seconds`: about how long the group takes alone on this machine.
const GROUPS = {
  words: {
    about: 'The words: level names and descriptions, the per-kind words files, messages, the cards listing what is on a road',
    seconds: 85,
    tests: [t('.words-check.mjs'), t('.descriptions-check.mjs'), t('.hud-check.mjs'), t('.roadcard-check.mjs')],
    files: [/levelText|Text\.json|words\.js|messages|levelinfo|gimmickspage|poweruppage|cargopage/],
  },
  levels: {
    about: 'Level data: the schema, every level builds with no problems, lapped levels close their loop, every import resolves, the Concept Strike\'s levels timed in its cars',
    seconds: 135,
    tests: [t('.schema-check.mjs'), t('.loop-check.mjs'), t('.bundle-check.mjs'), t('.merge-cross-check.mjs'), t('delivery-levels-check.mjs', { heavy: true }), t('tiers.mjs', { args: ['check'] }), t('.strike-levels-check.mjs')],
    files: [/src\/delivery\/levels\//, /levels\.js$/, /events\.json/, /levelSchema|track\.js|physics\.js|editor/, /tiers\.json/],
  },
  'smoke-levels': {
    about: 'The smoke test\'s per-level section only, for the levels named with --levels=id,id (with --changed, the levels whose files changed): '
      + 'hills, obstacles and what hitting each costs, drifters, tractors, shoulders, level problems. Seconds.',
    seconds: 15,
    tests: [t('delivery-smoke.mjs', { args: ['--quick'], levels: true })],
    files: [/src\/delivery\/levels\/.*\.json$/],
  },
  tiers: {
    about: 'Level tiers and progression: what opens and when, the car rule (a tier, a level\'s own list, a car lock), events (their times and rewards), labels, medals, saves, milestones, card packs (pools, odds, awards, the save), the Shop (its offers, buying), the showroom\'s cards (and the cars hidden until available: cars.js hideUnlessAvailable), where a car\'s key and blueprints come from (carsources.js), the Blue Star and earned cars\' figures, who a touch belongs to (the stick in a run, the screens else)',
    seconds: 110,
    tests: [t('.tiers-check.mjs'), t('.levelrules-check.mjs'), t('.events-check.mjs'), t('.hunt-check.mjs'), t('.earned-check.mjs'), t('.balance-check.mjs'), t('.save-check.mjs'), t('.unlockall-check.mjs'), t('.milestones-check.mjs'), t('.packs-check.mjs'), t('.shop-check.mjs'), t('.jimshop-check.mjs'), t('.showroom-check.mjs'), t('.hidden-cars-check.mjs'), t('.carsources-check.mjs'), t('.carsources-dom-check.mjs'), t('.nav-check.mjs'), t('.hiddenlevels-check.mjs'), t('.touch-check.mjs'), t('.extras-hit-check.mjs'), t('.lite-check.mjs'), t('.packcar-check.mjs')],
    files: [/tiers|progress\.js|milestones|menus|menu2|garage|cars\.js|levelSchema|events|packs|ecu|shop|jimshop|showroom|carsources|nav\.js|input\.js|hiddenlevels|hunt/],
  },
  cars: {
    about: 'The cars: traits, the tank, the ideas as cars (43 placeholders), mystery effects on the Super cars, the auto brake strength; the ECUs (ecu.js, ecus.json: the ladder, equal steps, respawn times, key and blueprint unlocking, the save, old saves, replays at an ECU)',
    seconds: 180,
    tests: [t('.traits-check.mjs'), t('.tank-check.mjs'), t('.mysteries-check.mjs'), t('.autobrake-check.mjs'), t('.ideas-check.mjs', { heavy: true }), t('.ecu-check.mjs', { heavy: true })],
    files: [/cars\.js|ideas\.js|carText|player\.js|ecu\.js|ecus\.json|progress\.js|replay\.js/],
  },
  cargo: {
    about: 'Cargo and the delivery at the kerb: every level\'s item, the Evil thresholds, the ending',
    seconds: 20,
    tests: [t('.cargo-check.mjs')],
    files: [/cargo|delivery\.js|packages/],
  },
  gimmicks: {
    about: 'The gimmicks: Gimmick Road 2 and 3 (hazards, gambles, crests), roadworks diversions, the metro (Metro Run), gravel, police pursuit, radiation, the UFO strike, traffic with quirks',
    seconds: 200,
    tests: [t('.hazards-check.mjs'), t('.tunneljunction-check.mjs'), t('.lanegimmicks-check.mjs'), t('.roadworks-check.mjs'), t('.metro-check.mjs'), t('.gimmicks3-check.mjs'), t('.gravel-check.mjs'), t('.pursuit-check.mjs'), t('.radiation-check.mjs'), t('.ufo-check.mjs'), t('.traffic-quirks-check.mjs')],
    files: [/hazards|gambles|gimmicks\.js|gravel|pursuit|radiation|ufostrike|crossing|bullettrain|police/],
  },
  obstacles: {
    about: 'Obstacles, pickups and targets: the themes\' own obstacles, items on the shoulders, TANK RAGE targets, dents',
    seconds: 35,
    tests: [t('.obstacles-check.mjs'), t('.shoulder-items-check.mjs'), t('.targets-check.mjs'), t('.dents-check.mjs')],
    files: [/themes\.js|collision\.js|pickups\.js|powerups\.js|obstacleText|pickupText|dents/],
  },
  water: {
    about: 'The water stages on the amphibious levels: the amphibious car, boats, traffic at the water\'s edge, the amphibious tank',
    seconds: 45,
    tests: [t('.water-check.mjs')],
    files: [/water\.js|amphib|slipway|harbour|flood|ford|fjord/],
  },
  render: {
    about: 'Drawing, without a browser: the shared model views (a stand-in renderer), dents, the car keys (the three models, the key card, the key cards\' pre-rendered PNGs in keyshots/), the showroom landing\'s suspension (every car\'s wheels found and kept on the floor, its body sprung), the model inspector (every idea car built and its triangles counted); the model editor\'s Mirror mode and window panes (.editor-mirror-check: partners found by shape, a mirrored move, cabinGlass panes, a glass edit changes one window only, the plain build unchanged); the model editor\'s SHAPES (.shape-edits-check: every car built with its outlines recorded is the plain build, an outline edit is a build input changing only its mesh, mirror partners and a mirrored edit, the plain cache untouched, the game reads a patch file\'s shapes, a part edit and a shape edit together; --bake adds a dry bake-shapes on the Hearse); GLASS = WINDOW (.glass-window-check: render/glassnames.js, either spelling one key; every see-through part of every car a window part with panes, hand-built ones too; an edit keyed \'door glass\' / \'rear glass\' / \'windshield\' builds what \'door window\' / \'rear window\' / \'windscreen\' builds on every cabinGlass car, one cache entry; a `windows` table read as `glass`; the tools read the rule; the survey misses nothing; --base: every car and old-spelling trial patches vertex for vertex against the code before); the showroom\'s turning key card (.keyspin-check: its source, then in headless Chromium if one is found: a blacked-out key drawn black only, the showroom\'s key card live and stopped); the menu on a phone (.phone-menu-check: in headless Chromium, six phone sizes upright and on their side, the Career, Races and Events tabs and the two event cards, with and without the address bar: the menu no taller than the screen, START, the strip and the build tag on it and on top; the desktop and tablet menu as before; the key unlock cinematic\'s key and fob never snap (.keypose-check: render/keypose.js sampled every 0.01 s); the prop bounds data, tags and models (.propanchors-check, .proptag-check, .propmodels-check: CHECKLIST 302); the model editor\'s Placements written into the build (.placements-bake-check: a row written, read back by fitProp, kept by the generator, undone; the files put back); the loadout signature and the stock pack pictures (.loadout-key-check: render/loadout.js loadoutKey moves with every cosmetic, the still cache keys dressed pictures by it and stock ones apart in Good, every pack / Shop / blueprint-card call site draws stock); the city\'s cost (.city-budget-check: every level drawn as the city laid out headless, its meshes, instances, triangles in sight and its texture held to a budget, CHECKLIST 323); the per-car loadout (.loadout-store-check: render/loadoutstore.js, a car\'s own over the default, the old global keys migrated as the default, Reset car, Copy to all, garbage, no storage, noSave, every car resolves); the steelworks (.steelworks-check: the theme and its two hidden levels, its obstacles hit, its scenery out of the driving area and over the camera, its halls\' ceilings, its cost held to a budget); the Las Vegas Strip (.vegas-check: its two hidden levels build with their gimmicks and cargo, its own obstacles have their kinds\' boxes and costs and collide, cash in rows; its scenery laid out headless on them and on five levels drawn as the Strip keeps off the road and out of bridges\', tunnels\', crossings\' and fords\' clearings, and its meshes, instances, triangles in sight and texture held to a budget); the alpine pass (.alpine-check: its theme, level, obstacles, scenery clear of the roads, the camera, its cost); the level loading screen (.loadscreen-check: render/loadscreen.js out of the replay fingerprint and imported first; in headless Chromium, stub GL: a slowed staged start shows the level\'s name and a bar going forward, then the run on, unpaused, keys reaching it, the load log\'s phases; a restart and a load under 300 ms show no screen); the car stage on the start screen\'s car card (.carstage-check: every theme builds a stage or falls back, the fallback chain, ?stage=off, its cost held to a budget, CHECKLIST 347); the rims (.rims-check: no rim named a spinner, every design turns with the car by distance over radius, still when stopped, idling on show; blade3 / twinspin still resolve; the Pumpkin and Candy cane on a hatch, a truck, a sports car and a bus: tagged children of their tyres, shared geometry and material, no extra draw calls, no z-fight pair; CHECKLIST 451; since CHECKLIST 385 the spinners are their own kind again, at a fixed pace); the tyre treads and the three-part wheel set (.treads-check: five designs under 300 triangles a tyre on a hatch, a truck, a sports car, a coach and the six-wheeler, tagged children of their tyres, shared, no z-fight; a tread turns with its rim by distance over radius, clamped and blurred by its pitch, still when stopped, idling on show; a spinner at its own pace; the directional ones point forward; tread, tyre colour and hub combine; ?wheeltread= / ?wheeltyre= / ?wheelhub=; every design on every rim-wearing car: no z-fight, no poke through bodywork over the tyre; CHECKLIST 385)',
    seconds: 300,
    tests: [t('.modelviews-check.mjs'), t('.dents-check.mjs'), t('.keys-check.mjs'), t('.keyshots-check.mjs'), t('.suspension-check.mjs'), t('.inspector-check.mjs'), t('.mergemodel-check.mjs'), t('.keyspin-check.mjs'), t('.phone-menu-check.mjs'), t('.modelpatch-check.mjs'), t('.editor-mirror-check.mjs'), t('.shape-edits-check.mjs'), t('.glass-window-check.mjs'), t('.placements-bake-check.mjs'), t('.keypose-check.mjs'), t('.propanchors-check.mjs'), t('.proptag-check.mjs'), t('.propmodels-check.mjs'), t('.propmodels-roof-check.mjs'), t('.propmodels-roof2-check.mjs'), t('.propmodels-cargo-check.mjs'), t('.propmodels-cargo2-check.mjs'), t('.propmodels-wing-check.mjs'), t('.propmodels-wingclassic-check.mjs'), t('.propmodels-wing2-check.mjs'), t('.platetag-check.mjs'), t('.propcosmetic-ui-check.mjs'), t('.loadout-key-check.mjs'), t('.city-budget-check.mjs'), t('.loadout-store-check.mjs'), t('.steelworks-check.mjs'), t('.vegas-check.mjs'), t('.alpine-check.mjs'), t('.loadscreen-check.mjs'), t('.carstage-check.mjs'), t('.rims-check.mjs'), t('.treads-check.mjs')],
    files: [/src\/delivery\/render\//, /\.css$/, /keyshots|keyModels|keys-png/],
  },
  replay: {
    about: 'Determinism: every level replays exactly from its seeds (a run hashed each second, twice the same, once another); runs recorded and played back by replay.js (pause, rewind, refusals); kept and watched as the player has them (replaystore.js: the save untouched). Heavy.',
    seconds: 360,
    tests: [t('.replay-check.mjs', { heavy: true }), t('.replay-record-check.mjs', { heavy: true }), t('.replay-store-check.mjs', { heavy: true })],
    files: [/game\.js|physics\.js|traffic\.js|config\.js|player\.js|collision\.js|track\.js|replay\.js|replaystore\.js|replayui\.js|input\.js|util\.js|main\.js|random/],
  },
  'smoke-quick': {
    about: 'The whole quick smoke test: every level\'s checks (no full drive) and ~30 sections of mechanics (traffic, police, railway, tide, '
      + 'wreckage, trains, cars, powerups...). Seeded (20261008). Heavy.',
    seconds: 300,
    tests: [t('delivery-smoke.mjs', { args: ['--quick'], heavy: true })],
    files: [/game\.js|physics\.js|traffic\.js|config\.js|player\.js|collision\.js|track\.js|cars\.js|delivery-smoke/],
  },
};
// (a group is heavy if any test in it is; --fast is every group with none)
for (const g of Object.values(GROUPS)) g.heavy = g.tests.some(x => x.heavy);

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const value = (name) => { const a = args.find(x => x.startsWith('--' + name + '=')); if (a) return a.slice(name.length + 3); const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { return []; } };
const changedFiles = () => [...new Set([...git('diff', '--name-only', 'main...HEAD'), ...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])];
const levelIdsOf = (files) => files.filter(f => /^src\/delivery\/levels\/[^/]+\.json$/.test(f)).map(f => { try { return JSON.parse(readFileSync(join(ROOT, f), 'utf8')).id; } catch { return null; } }).filter(Boolean);

// ---- the heavy locks
const LOCKS = [join(tmpdir(), 'delivery-heavy.lock'), join(tmpdir(), 'delivery-heavy-2.lock')];
let held = null;
const release = () => { if (held) { try { rmdirSync(held); } catch { /* (gone already) */ } held = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
const acquire = async () => {
  for (let waited = 0; ; waited += 20) {
    for (const lock of LOCKS) {
      try { mkdirSync(lock); held = lock; return; } catch {
        try { if (Date.now() - statSync(lock).mtimeMs > 25 * 60 * 1000) { rmdirSync(lock); console.log('removed a lock older than 25 minutes: ' + lock); } } catch { /* (taken by someone else meanwhile) */ }
      }
    }
    if (waited % 60 === 0) console.log(`waiting for a heavy lock (${waited} s so far)...`);
    await new Promise(r => setTimeout(r, 20000));
  }
};

const run = (test, extra = []) => new Promise((resolve) => {
  const started = Date.now(), out = [];
  const child = spawn(process.execPath, [test.file, ...(test.args || []), ...extra], { cwd: ROOT });
  child.stdout.on('data', d => out.push(d)); child.stderr.on('data', d => out.push(d));
  child.on('close', (code) => {
    const text = Buffer.concat(out).toString();
    resolve({ code, seconds: (Date.now() - started) / 1000, fails: text.split('\n').filter(l => /FAIL|MISMATCH|^Error|Error:/.test(l)), text });
  });
});

const main = async () => {
  if (flag('list') || (!flag('group') && !flag('changed') && !flag('fast') && !value('group'))) {
    console.log('group'.padEnd(14) + 'time'.padEnd(8) + 'heavy  covers');
    for (const [name, g] of Object.entries(GROUPS)) console.log(name.padEnd(14) + ('~' + g.seconds + ' s').padEnd(8) + (g.heavy ? 'HEAVY  ' : 'light  ') + g.about);
    console.log('\ntests in each:');
    for (const [name, g] of Object.entries(GROUPS)) console.log('  ' + name.padEnd(13) + g.tests.map(x => x.file.replace('scripts/', '') + (x.heavy ? '*' : '')).join('  '));
    console.log('\n(* = heavy: waits for a heavy lock.) Run: --group <name,name> | --changed | --fast | --dry. Not in any group: scripts/shots.mjs (a browser), delivery-probe.mjs, level-clocks.mjs, tier-money.mjs (tools).');
    return 0;
  }
  let names = [], levelIds = (value('levels') || '').split(',').filter(Boolean);
  if (value('group')) names = value('group').split(',');
  if (flag('fast')) names = Object.keys(GROUPS).filter(n => !GROUPS[n].heavy);
  if (flag('changed')) {
    const files = changedFiles();
    names = Object.entries(GROUPS).filter(([, g]) => files.some(f => g.files.some(re => re.test(f)))).map(([n]) => n);
    if (!levelIds.length) levelIds = levelIdsOf(files);
    // (one level's file changed: its own checks, and the lists; not the whole smoke for that alone)
    if (levelIds.length && files.every(f => /^src\/delivery\/levels\/|levelText|tiers\.json/.test(f) || !/\.(js|mjs)$/.test(f))) names = names.filter(n => n !== 'smoke-quick' && n !== 'replay');
    console.log(`${files.length} changed file(s) -> groups: ${names.join(', ') || '(none)'}${levelIds.length ? '; levels: ' + levelIds.join(', ') : ''}`);
  }
  const bad = names.filter(n => !GROUPS[n]);
  if (bad.length) { console.log('no such group: ' + bad.join(', ') + ' (see --list)'); return 2; }
  if (!names.length) { console.log('nothing to run'); return 0; }
  // (smoke-levels without levels named would run the whole quick smoke: say so)
  if (names.includes('smoke-levels') && !levelIds.length) { console.log('smoke-levels needs --levels=id,id (or --changed with a level file changed)'); names = names.filter(n => n !== 'smoke-levels'); }
  if (names.includes('smoke-quick')) names = names.filter(n => n !== 'smoke-levels'); // (the quick smoke has them)
  const dry = flag('dry');
  let failed = 0;
  const seen = new Set(), results = [];
  for (const name of names) {
    for (const test of GROUPS[name].tests) {
      const extra = test.levels ? ['--levels=' + levelIds.join(',')] : [];
      const key = test.file + (test.args || []).join(' ') + extra.join(' ');
      if (seen.has(key)) continue; // (a test in two groups runs once)
      seen.add(key);
      const label = `${name}: ${test.file.replace('scripts/', '')} ${[...(test.args || []), ...extra].join(' ')}${test.heavy ? ' [heavy]' : ''}`;
      if (dry) { console.log('would run ' + label); continue; }
      if (test.heavy && !flag('no-lock')) await acquire();
      let r;
      try { r = await run(test, extra); } finally { if (test.heavy) release(); }
      const ok = r.code === 0;
      if (!ok) failed++;
      results.push({ label, ok, seconds: r.seconds });
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.seconds.toFixed(0).padStart(4)} s  ${label}`);
      if (!ok) console.log(r.fails.slice(0, 12).map(l => '       ' + l.slice(0, 200)).join('\n') || r.text.split('\n').slice(-8).map(l => '       ' + l).join('\n'));
    }
  }
  if (!dry) console.log(`\n${results.length} test script(s), ${failed} failed, ${results.reduce((n, r) => n + r.seconds, 0).toFixed(0)} s`);
  return failed ? 1 : 0;
};
main().then(code => process.exit(code));
