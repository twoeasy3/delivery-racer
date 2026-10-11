// The game's logic, loaded without a browser (as scripts/delivery-smoke.mjs and level-clocks.mjs do), for a
// quick look at one thing: a probe of a level, a new gimmick tried out. Not a test suite: see delivery-probe.mjs.
//   const g = await boot();  ...  await g.close();
import { createServer } from 'vite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A Vite server that only loads the game's logic (ssrLoadModule). It shares nothing with any other run:
// every worktree's node_modules is a junction to one folder, so they all had one cache at
// node_modules/.vite, and since a server's root is part of that cache's key, each start from another
// worktree deleted it and bundled the site's dependencies (React, Leaflet, three) again, none of which the
// logic uses: two starts close together and one died with EPERM, unlinking a file the other had open. So:
// no config file (the site's plugins are not wanted here), no dependency bundling, a cache folder to
// itself (never written, as nothing is bundled), and no websocket (its one fixed port was fought over too)
// or file watcher.
export const logicServer = () => createServer({
  configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, ws: false, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  cacheDir: join(tmpdir(), 'delivery-vite-' + process.pid + '-' + Date.now().toString(36)),
});

// ownAll: the player owns every car (the tiers are on by default: a tier level starts only in a car of its tier, and Game.start
// refuses, building nothing, where none is owned; a check that drives levels headlessly owns them all, as a player's garage would).
// tiers: false = the tiers off (as ?tiers=0), for a check of what a car does on a tier level, where the tier's car would be put in instead
export const boot = async ({ cars = ['commuter', 'sport', 'floatvan'], ownAll = false, tiers = true } = {}) => { // (floatvan: an amphibious car, for the amphibious levels)
  // the game logic touches the DOM only to show / hide screens
  const element = () => ({ classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, style: {}, textContent: '' });
  globalThis.window = globalThis.window || { addEventListener() {}, dispatchEvent() {} };
  const allOpen = encodeURIComponent(JSON.stringify({ unlocked: 99, cars }));
  globalThis.document = { getElementById: element, querySelectorAll: () => [], body: element(), cookie: 'delivery_racer_progress=' + allOpen };
  // (local storage, where the save is kept: a stand-in that lasts as long as the script)
  const stored = new Map();
  globalThis.localStorage = globalThis.localStorage || { getItem: (key) => (stored.has(key) ? stored.get(key) : null), setItem: (key, value) => { stored.set(key, String(value)); }, removeItem: (key) => { stored.delete(key); } };
  const server = await logicServer();
  const load = (path) => server.ssrLoadModule('/src/delivery/' + path);
  const levels = await load('levels.js');
  const g = {
    load, levels,
    track: await load('track.js'),
    ...(await load('game.js')),
    ...(await load('player.js')),
    ...(await load('traffic.js')),
    ...(await load('collision.js')),
    ...(await load('input.js')),
    ...(await load('physics.js')),
    ...(await load('config.js')),
    ...(await load('messages.js')),
    cars: await load('cars.js'),
    progress: (await load('progress.js')).Progress,
    close: () => server.close(),
    // pick a level by id (on the menu or hidden), or take a level object as it is
    select(level) {
      const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)];
      const found = typeof level === 'string' ? all.find(l => l.id === level) : level;
      if (!found) throw new Error('no such level: ' + level);
      if (levels.LEVELS.includes(found)) levels.selectLevel(levels.LEVELS.indexOf(found));
      else levels.selectSpecial(found);
      return found;
    },
    // hold the accelerator down (1), brake (-1) or neither (0); and steer (-1 .. 1)
    drive(throttle = 1, steer = 0) {
      Object.defineProperty(g.Input, 'throttle', { get: () => throttle, configurable: true });
      Object.defineProperty(g.Input, 'steer', { get: () => steer, configurable: true });
    },
    // run the game for `seconds`, calling each(t) after every step (return true to stop). Messages said on
    // the way are gathered in g.said
    said: [],
    run(seconds, each) {
      const step = 1 / 60;
      for (let t = 0; t < seconds; t += step) {
        g.Game.update(step);
        g.FxQueue.length = 0;
        for (const line of g.Message.lines) if (line.text && !g.said.includes(line.text)) g.said.push(line.text);
        if (each && each(t)) return t;
      }
      return seconds;
    },
  };
  if (!tiers) g.CONFIG.progression.tiers = false;
  if (ownAll) g.progress.data.cars = g.cars.CARS.map(c => c.id);
  return g;
};
