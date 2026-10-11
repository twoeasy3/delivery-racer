// What a crest's flight is, in numbers, and what a lower gravity would make of it (a proposal's measurement:
// src/delivery/IDEAS-moon-airtime-11-Oct.md). Headless, seconds. Holds the car at each speed down a level's
// crest, lets the real flight code (Gambles.updateFlight) carry it with CONFIG.crest.gravity set to each
// figure, and prints the airtime, the distance flown, the height and the landing damage.
//   node scripts/moon-airtime.mjs [level=moon] [crest index=0] [--g=20,12,8,5] [--v=25,40]
import { boot } from './delivery-headless.mjs';
const arg = (name, fallback) => { const a = process.argv.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : fallback; };
const pos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ID = pos[0] || 'moon', INDEX = Number(pos[1] || 0);
const GS = arg('g', '20,12,8,5').split(',').map(Number), VS = arg('v', '25,40').split(',').map(Number);
const g = await boot();
const { Gambles } = await g.load('gambles.js');
const base = g.CONFIG.crest.gravity;
try {
  for (const grav of GS) for (const v of VS) {
    g.CONFIG.crest.gravity = grav;
    g.select(ID);
    g.cars.selectCar('commuter');
    g.Game.evil = false;
    g.Game.start();
    const c = Gambles.crests[INDEX];
    if (!c) { console.log(`${ID}: no crest ${INDEX} at gravity ${grav} (it flies at nothing up to ${g.CONFIG.crest.fastest} m/s)`); continue; }
    g.drive(0, 0);
    const P = g.Player;
    P.s = c.from - 120; P.speed = v; P.health = 100;
    let took = null, landed = null, vy = 0;
    for (let t = 0; t < 12 && !landed; t += 1 / 60) {
      if (!Gambles.fly) P.speed = v; // (held at v up to the lip, as a car at its pace)
      if (Gambles.fly) vy = Gambles.fly.vy;
      g.Game.update(1 / 60);
      if (!took && Gambles.fly && Gambles.fly.top > g.CONFIG.crest.hop) took = { t: 0, s: P.s, f: Gambles.fly };
      if (took && Gambles.fly) { took.t += 1 / 60; took.top = Math.max(took.top || 0, Gambles.fly.top); }
      if (took && !Gambles.fly) landed = { s: P.s, into: v * Gambles.slope - (vy - g.CONFIG.crest.gravity / 60) }; // (the landing rule: damage = (into - landSoft) * landDamage, as Gambles.updateFlight)
    }
    console.log(`g=${grav} v=${v} (${Math.round(v * 3.6)} km/h) crest@${Math.round(c.s)} flies at ${Math.round(c.speed * 3.6)} km/h: ` +
      (took && landed ? `air ${took.t.toFixed(2)} s, ${(landed.s - took.s).toFixed(0)} m, ${took.top.toFixed(1)} m high, lands at ${landed.into.toFixed(1)} m/s into the road = ${Math.max(0, (landed.into - g.CONFIG.crest.landSoft) * g.CONFIG.crest.landDamage).toFixed(0)} health` : 'no flight'));
  }
} finally { g.CONFIG.crest.gravity = base; await g.close(); }
