// A headless check of the cargo (src/delivery/cargo.js) and the delivery at the kerb (delivery.js): every
// level's item, where it is named (levelText.json, with the level's own file as the fallback: an id there is
// not fails the level, and the failsafe that carries on without it is tested), the Evil states' thresholds, and
// the ending's sequence, skip and exceptions.
//   node scripts/.cargo-check.mjs
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failed = 0;
const ok = (what, pass, more = '') => { if (!pass) failed++; console.log((pass ? '  ok    ' : '  FAIL  ') + what + (more ? '  ' + more : '')); };
try {
  const { CARGO, cargoFor, cargoProblems, cargoState, carriesCargo } = await g.load('cargo.js');
  const { Delivery } = await g.load('delivery.js');
  const { LEVEL_TEXT, levelCargoNames, levelCargo, withWords } = await g.load('levelText.js');
  const { CONFIG, Game, Player } = g, C = CONFIG.consignment, E = C.ending;
  const all = [...g.levels.LEVELS, ...Object.values(g.levels.HIDDEN_LEVELS)];

  console.log('what each level carries (good / evil):');
  const seen = { good: new Set(), evil: new Set() };
  let bad = [];
  for (const level of all) {
    bad.push(...cargoProblems(level).map(p => level.id + ': ' + p));
    const good = cargoFor(level, false), evil = cargoFor(level, true);
    if (carriesCargo(level) !== !!good || !!good !== !!evil) bad.push(level.id + ': carries / does not carry, mixed up');
    if (good) { seen.good.add(good.id); seen.evil.add(evil.id); }
    console.log('  ' + level.id.padEnd(18) + (good ? good.id.padEnd(10) + evil.id + (level.cargo ? '   (its own)' : '') : '-'));
  }
  ok('every level\'s "cargo" names items there are', !bad.length, bad.join(' | '));
  // the prank cargo, available but not dealt to a level (owner, 12-Oct): every unnamed level already carries one of the
  // older items, so these turn up only where a level names one in levelText.json. Every other test here covers them
  const UNASSIGNED = ['whoopee', 'bucket', 'squirter', 'teeth', 'piecatapult', 'airhorn', 'ghost', 'nestedboxes', 'spider', 'ink'];
  const missing = (side) => CARGO[side].filter(item => !seen[side].has(item.id) && !UNASSIGNED.includes(item.id)).map(item => item.id);
  ok('every item turns up (but the unassigned pranks)', !missing('good').length && !missing('evil').length, [...seen.good, ...seen.evil].join(' ') + (missing('good').length + missing('evil').length ? '  MISSING ' + [...missing('good'), ...missing('evil')].join(' ') : ''));
  // ---- where the cargo is named: levelText.json, then the level's own file
  const filed = [], shape = [], differ = [], dealtToday = [];
  for (const [id, words] of Object.entries(LEVEL_TEXT)) {
    if (words.cargo === undefined) continue;
    filed.push(id);
    const c = words.cargo;
    if (!c || typeof c !== 'object' || Array.isArray(c)) { shape.push(id + ': "cargo" is not { good, evil }'); continue; }
    for (const key of Object.keys(c)) if (key !== 'good' && key !== 'evil') shape.push(id + ': cargo.' + key + '?');
    const own = all.find(l => l.id === id);
    for (const side of ['good', 'evil']) if (own?.cargo?.[side] !== undefined && c[side] !== undefined && own.cargo[side] !== c[side])
      differ.push(id + ': its ' + side + ' cargo is "' + c[side] + '" in levelText.json and "' + own.cargo[side] + '" in its own file');
  }
  for (const level of g.levels.LEVELS) if (carriesCargo(level) && !levelCargoNames(level, 'good').length && !levelCargoNames(level, 'evil').length) dealtToday.push(level.id);
  ok('levelText.json: "cargo" is { good, evil } and nothing else', !shape.length, shape.join(' | '));
  ok('levelText.json and the level\'s own file do not name different cargo', !differ.length, differ.join(' | '));
  ok('levelText.json names the cargo of the levels (any left over are dealt one)', filed.length > 0, filed.length + ' named there' + (dealtToday.length ? '; dealt: ' + dealtToday.join(' ') : ''));

  // ---- the failsafe: a cargo id that is no item (a typo, an item taken out) never crashes and never shows
  // nothing: the level's own file's id, then the dealt item. Tried on levels made up for it
  const real = (item, side) => !!item && CARGO[side].some(c => c.id === item.id);
  try {
    LEVEL_TEXT.__failsafe_a = { cargo: { good: 'no-such-item', evil: 'nor-this' } };
    LEVEL_TEXT.__failsafe_b = { cargo: { good: 'no-such-item', evil: 'skunk' } };
    LEVEL_TEXT.__failsafe_c = { cargo: { good: 'trophy', evil: 'bats' } };
    LEVEL_TEXT.__failsafe_d = { cargo: { good: 7, evil: null } };
    const withOwn = { id: '__failsafe_a', cargo: { good: 'coffee', evil: 'parcel' } };
    const noOwn = { id: '__failsafe_b' };
    const goodFile = { id: '__failsafe_c', cargo: { good: 'coffee', evil: 'parcel' } };
    const odd = { id: '__failsafe_d' };
    const bothBad = { id: '__failsafe_a', cargo: { good: 'also-wrong', evil: 'worse' } };
    const nothing = { id: '__failsafe_none' };
    ok('failsafe: a bad id in levelText.json falls back to the level\'s own file\'s', cargoFor(withOwn, false)?.id === 'coffee' && cargoFor(withOwn, true)?.id === 'parcel');
    ok('failsafe: a bad id in both places is dealt an item, on both sides', real(cargoFor(bothBad, false), 'good') && real(cargoFor(bothBad, true), 'evil'));
    ok('failsafe: a bad id and no own file\'s: dealt an item; a good id on the other side stands', real(cargoFor(noOwn, false), 'good') && cargoFor(noOwn, true)?.id === 'skunk');
    ok('failsafe: an id that is not even a word does not crash, and an item is carried', real(cargoFor(odd, false), 'good') && real(cargoFor(odd, true), 'evil'));
    ok('failsafe: a level that names nothing anywhere is dealt an item', real(cargoFor(nothing, false), 'good') && real(cargoFor(nothing, true), 'evil'));
    ok('levelText.json comes before the level\'s own file, a side at a time', cargoFor(goodFile, false)?.id === 'trophy' && cargoFor(goodFile, true)?.id === 'bats');
    ok('cargoProblems finds the bad ids and says where they are', cargoProblems(withOwn).length === 2 && cargoProblems(withOwn).every(p => p.includes('levelText.json')) && cargoProblems(bothBad).length === 4 && !cargoProblems(goodFile).length && cargoProblems(odd).length === 1,
      cargoProblems(withOwn).concat(cargoProblems(odd)).join(' | '));
    const kept = withWords({ id: '__failsafe_c', cargo: { good: 'coffee' } });
    ok('withWords: the level for the editor carries the file\'s cargo, a side at a time', kept.cargo?.good === 'trophy' && kept.cargo?.evil === 'bats' && levelCargo({ id: '__failsafe_none' }) === undefined);
  } finally {
    for (const k of ['a', 'b', 'c', 'd']) delete LEVEL_TEXT['__failsafe_' + k];
  }
  ok('races and the Battlefield carry nothing', all.filter(l => l.laps || l.battle).every(l => !cargoFor(l, false)));

  ok('state: calm with most of the clock left', cargoState(100, 100) === 0 && cargoState(100 * C.agitated + 0.1, 100) === 0);
  ok('state: agitated at the threshold', cargoState(100 * C.agitated, 100) === 1 && cargoState(100 * C.furious + 0.1, 100) === 1);
  ok('state: furious in the last stretch and the tip countdown', cargoState(100 * C.furious, 100) === 2 && cargoState(0, 100) === 2 && cargoState(-5, 100) === 2);

  // a run to the line, from a little short of it
  const toLine = (id, evil, late = false) => {
    g.select(id);
    Game.evil = evil;
    Player.testGhost = true;
    Game.start();
    Player.s = g.track.Track.length - 150;
    if (late) Game.time = Game.allowed + 2; // (into the tip countdown)
    g.drive(1, 0);
    g.run(30, () => Game.state !== 'playing');
  };
  Delivery.staged = false;
  toLine('expressway', false);
  ok('headless (nothing to show it): finished, no delivery sequence', Game.state === 'finished' && Game.outcome === 'delivered' && !Delivery.active);

  Delivery.staged = true;
  toLine('expressway', false);
  const fixed = { time: Game.time, outcome: Game.outcome, s: Player.s };
  ok('staged: finished at once, the sequence going', Game.state === 'finished' && Game.outcome === 'delivered' && Delivery.active && Delivery.cargo.id === 'pizza' && Delivery.state === 0);
  ok('skip refused in the first moment', Delivery.skip() === false && Delivery.active);
  const phases = [];
  const lasted = g.run(20, () => { if (Delivery.phase && phases.at(-1) !== Delivery.phase) phases.push(Delivery.phase); return !Delivery.active; });
  const total = E.park + E.unload + E.moment + E.beat;
  ok('phases in order', phases.join(' ') === 'park unload moment beat', phases.join(' '));
  ok('it lasts what the config says', Math.abs(lasted - total) < 0.1, lasted.toFixed(2) + ' s of ' + total.toFixed(2));
  ok('the run was fixed at the line', Game.time === fixed.time && Game.outcome === fixed.outcome && Game.state === 'finished');
  const T = g.track.Track;
  ok('the car stopped at the kerb, on the road, past the line', Player.speed === 0 && Math.abs(Player.lat - Delivery.to.lat) < 1e-6 && Player.s > fixed.s && Player.s < T.end - 20 &&
    Delivery.spot.lat < T.hi(Player.s) && Delivery.spot.lat > T.laneHi(Player.s), `s +${(Player.s - fixed.s).toFixed(1)} m, lat ${Player.lat.toFixed(2)}, cargo ${Delivery.spot.lat.toFixed(2)}, edge ${T.hi(Player.s).toFixed(2)}`);

  toLine('expressway', true, true);
  ok('Evil and late: still delivered to the kerb, furious', Game.outcome === 'late' && Delivery.active && Delivery.cargo.id === 'parcel' && Delivery.state === 2);
  g.run(E.skipAfter + 0.1);
  ok('skip: straight to the results', Delivery.skip() === true && !Delivery.active && Game.state === 'finished');
  g.run(2);
  ok('...with the car put at the kerb and the cargo down', Game.state === 'finished' && Delivery.delivered && Delivery.landed && Player.speed === 0 && Player.lat === Delivery.to.lat && Player.s === Delivery.to.s);

  toLine('expressway', true);
  ok('Evil on time, from near the line: calm (the whole clock left)', Delivery.active && Delivery.state === 0);
  g.Input.emit('confirm');
  ok('Enter in the first moment does not restart the level', Game.state === 'finished' && Delivery.active);
  g.run(E.skipAfter + 0.1);
  g.Input.emit('confirm');
  ok('Enter after it skips, and does not restart', Game.state === 'finished' && !Delivery.active);

  // endings that keep their own
  g.select('expressway'); Game.evil = false; Player.testGhost = true; Game.start(); g.drive(0, 0);
  Game.time = Game.allowed + CONFIG.tipCountdown - 0.5;
  g.run(5, () => Game.state !== 'playing');
  ok('out of time: no delivery', Game.outcome === 'timeout' && !Delivery.active);
  g.select('expressway'); Game.start(); Game.busts = CONFIG.maxBusts - 1; Game.bust();
  ok('busted out: no delivery', Game.outcome === 'busted' && !Delivery.active);
  const none = [];
  for (const level of all) {
    g.select(level.id); Game.evil = false; Game.start();
    if (!Delivery.wanted('delivered')) none.push(level.id);
  }
  console.log('  no ending on: ' + none.join(', '));
  ok('no ending on races, the Battlefield, the UFO and the jetboat', none.length === all.filter(l => l.laps || l.battle || C.noEnding.includes(l.car)).length);
} catch (e) {
  failed++;
  console.log('THREW ' + (e.stack || e));
} finally {
  await g.close();
}
console.log(failed ? failed + ' FAILED' : 'all good');
process.exit(failed ? 1 : 0);
