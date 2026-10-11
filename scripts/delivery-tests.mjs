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
import { mkdirSync, rmdirSync, statSync, readdirSync, readFileSync } from 'node:fs';
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
    about: 'Level data: the schema, every level builds with no problems, lapped levels close their loop, every import resolves',
    seconds: 90,
    tests: [t('.schema-check.mjs'), t('.loop-check.mjs'), t('.bundle-check.mjs'), t('delivery-levels-check.mjs', { heavy: true }), t('tiers.mjs', { args: ['check'] })],
    files: [/src\/delivery\/levels\//, /levels\.js$/, /levelSchema|track\.js|editor/, /tiers\.json/],
  },
  'smoke-levels': {
    about: 'The smoke test\'s per-level section only, for the levels named with --levels=id,id (with --changed, the levels whose files changed): '
      + 'hills, obstacles and what hitting each costs, drifters, tractors, shoulders, level problems. Seconds.',
    seconds: 15,
    tests: [t('delivery-smoke.mjs', { args: ['--quick'], levels: true })],
    files: [/src\/delivery\/levels\/.*\.json$/],
  },
  tiers: {
    about: 'Level tiers and progression: what opens and when, the car rule, medals, saves, milestones, the Blue Star and earned cars\' figures',
    seconds: 100,
    tests: [t('.tiers-check.mjs'), t('.earned-check.mjs'), t('.balance-check.mjs'), t('.save-check.mjs'), t('.milestones-check.mjs')],
    files: [/tiers|progress\.js|milestones|menus|menu2|garage/],
  },
  cars: {
    about: 'The cars: traits, the tank, the ideas as cars (thirty placeholders), mystery effects on the Super cars',
    seconds: 150,
    tests: [t('.traits-check.mjs'), t('.tank-check.mjs'), t('.mysteries-check.mjs'), t('.ideas-check.mjs', { heavy: true })],
    files: [/cars\.js|ideas\.js|carText|player\.js/],
  },
  cargo: {
    about: 'Cargo and the delivery at the kerb: every level\'s item, the Evil thresholds, the ending',
    seconds: 20,
    tests: [t('.cargo-check.mjs')],
    files: [/cargo|delivery\.js|packages/],
  },
  gimmicks: {
    about: 'The gimmicks: Gimmick Road 2 and 3 (hazards, gambles, crests), gravel, police pursuit, radiation, the UFO strike, traffic with quirks',
    seconds: 200,
    tests: [t('.hazards-check.mjs'), t('.gimmicks3-check.mjs'), t('.gravel-check.mjs'), t('.pursuit-check.mjs'), t('.radiation-check.mjs'), t('.ufo-check.mjs'), t('.traffic-quirks-check.mjs')],
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
    about: 'Drawing, without a browser: the shared model views (a stand-in renderer), dents',
    seconds: 10,
    tests: [t('.modelviews-check.mjs'), t('.dents-check.mjs')],
    files: [/src\/delivery\/render\//, /\.css$/],
  },
  replay: {
    about: 'Determinism: every level replays exactly from a seed (a run hashed each second, twice the same, once another). Heavy.',
    seconds: 300,
    tests: [t('.replay-check.mjs', { heavy: true })],
    files: [/game\.js|physics\.js|traffic\.js|config\.js|player\.js|collision\.js|track\.js|Math\.random/],
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
