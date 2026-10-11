// A headless check of what the menu's "what's on this road" card lists (render/levelcard3d.js), in seconds: for
// every level on the menu, every pickup type laid out on it has a card on the power-ups page (powerups.js) and a
// model (render/pickupModels.js), and every vehicle on it has a name, a line of its own and a model (levelinfo.js,
// CONFIG.vehicles, render/models.js). The gimmick tiles are the Gimmicks page's own cards (gimmicks.js: each card's
// own "has"), so they need no check. No drawing: the tiles themselves are only seen in a browser.
//   node scripts/.roadcard-check.mjs [--list] [id ...]      (--list: each level's three groups, by name)
import { boot } from './delivery-headless.mjs';

const g = await boot();
let failed = 0;
const fail = (text) => { failed++; console.log('FAIL ' + text); };
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
try {
  const { LEVELS, levelLabel } = g.levels;
  const info = await g.load('levelinfo.js');
  const { GROUPS } = await g.load('gimmicks.js');
  const { CARDS } = await g.load('powerups.js');
  const { MODELS } = await g.load('render/models.js');
  const { PICKUP_MODELS } = await g.load('render/pickupModels.js');
  const { CONFIG } = g;
  const cars = g.cars;
  const cards = GROUPS.flatMap(group => group.cards);
  LEVELS.forEach((level, i) => {
    if (only.length && !only.includes(level.id)) return;
    const has = cards.filter(card => card.has(level)).map(card => card.name);
    const pickups = info.levelPickups(level), traffic = info.levelTraffic(level), notes = info.levelNotes(level);
    for (const type of pickups) {
      if (!CARDS.find(card => card.type === type)) fail(level.id + ': pickup "' + type + '" has no card in powerups.js');
      if (type !== 'target' && !PICKUP_MODELS[type]) fail(level.id + ': pickup "' + type + '" has no model');
    }
    for (const { kind, role } of traffic) {
      const v = info.vehicleInfo(kind, role), car = cars.LEVEL_CARS[kind] || cars.CARS.find(c => c.id === kind), type = CONFIG.vehicles[kind] || car;
      if (!v.name || !v.line || v.line === 'Traffic.') fail(level.id + ': vehicle "' + kind + '" has no line of its own in levelinfo.js');
      if (kind !== 'ufo' && kind !== 'tractor' && !MODELS[type?.model || car?.model]) fail(level.id + ': vehicle "' + kind + '" has no model');
    }
    if (!has.length && !pickups.length && !traffic.length) fail(level.id + ': nothing at all on its road');
    if (process.argv.includes('--list')) {
      console.log('\n' + levelLabel(i) + ' ' + g.levels.levelName(level) + (notes.length ? '   [' + notes.join(', ') + ']' : ''));
      console.log('  gimmicks, traffic cards: ' + (has.join(', ') || '-'));
      console.log('  pickups: ' + (pickups.join(', ') || '-'));
      console.log('  vehicles: ' + (traffic.map(({ kind, role }) => info.vehicleInfo(kind, role).name + (role === 'traffic' ? '' : ' (' + role + ')')).join(', ') || '-'));
    }
  });
  // A vehicle the game always paints one way (a police car, an ambulance: white; a drive-by car) is in that paint
  // on its tile wherever it comes in the level's traffic (its place used to pick its paint, and so its tile's
  // glow), and a police car and an ambulance have the game's light bar on the roof, flashing
  const card = await g.load('render/levelcard3d.js');
  const { FIXED_PAINT } = await g.load('render/models.js');
  const hex = (n) => '0x' + n.toString(16).padStart(6, '0');
  for (const kind of Object.keys(FIXED_PAINT)) {
    const bodies = new Set(), paints = new Set();
    for (let n = 0; n < 7; n++) {
      const paint = card.vehiclePaint({}, kind, n), model = card.vehicleModel(kind, paint);
      paints.add(hex(paint)); bodies.add(hex(model.userData.body.material.color.getHex()));
    }
    if (paints.size !== 1 || bodies.size !== 1 || !bodies.has(hex(FIXED_PAINT[kind]))) fail(kind + ': its body is ' + [...bodies].join(' / ') + ' by its place on the card, not always ' + hex(FIXED_PAINT[kind]));
    else console.log(kind + ': body ' + [...bodies][0] + ' at every place on the card');
  }
  for (const kind of ['police', 'ambulance']) {
    const model = card.vehicleModel(kind, FIXED_PAINT[kind]), bar = model.userData.bar, seen = new Set();
    for (let t = 0; t < 1; t += 0.05) { model.userData.animate(t); seen.add(hex(bar?.material.color.getHex() ?? 0)); }
    if (!bar || !bar.visible || bar.parent !== model || bar.position.y < CONFIG.vehicles[kind].height || seen.size !== 2) fail(kind + ': no light bar flashing on its roof');
    else console.log(kind + ': light bar on the roof (y ' + bar.position.y.toFixed(2) + '), flashing ' + [...seen].join(' / '));
  }
  if (process.argv.includes('--police')) LEVELS.forEach((level, i) => { // (--police: the levels with a police car in their traffic, for a look: index.html?demo&cursor=<n>&road)
    if (info.levelTraffic(level).some(({ kind }) => kind === 'police')) console.log('  police: cursor=' + (i + 1) + '  ' + levelLabel(i) + ' ' + g.levels.levelName(level));
  });
  console.log(failed ? failed + ' FAILED' : LEVELS.length + ' levels: every pickup and vehicle on them has its card, its line and its model');
} finally {
  await g.close();
}
process.exit(failed ? 1 : 0);
