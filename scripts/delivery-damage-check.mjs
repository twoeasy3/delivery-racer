// Headless measure of crash damage: an attacker (the player's car, given the mass of each kind below) rear-ends a
// traffic car at several closing speeds, through the real Collision.check(). Each cell: damage to the victim as
// raw (no limit) / the old flat 15 m/s clamp / now (the mass-aware cap, CONFIG.damageCap), then "p" the damage the
// attacker (the player) takes now. A victim is wrecked when the damage reaches its health.
//   node scripts/delivery-damage-check.mjs
import { boot } from './delivery-headless.mjs';
const g = await boot();
try {
  g.select('quarry-run'); g.cars.selectCar('commuter'); Object.defineProperty(g.Game, 'canStart', { get: () => true });
  g.Game.load(); g.Game.start(); g.drive(0, 0); g.run(0.2);
  const { Player, Traffic, CONFIG } = g, CAR = g.cars.CAR, V = CONFIG.vehicles;
  console.log('damagePerSpeed', CONFIG.damagePerSpeed, 'damageCap', JSON.stringify(CONFIG.damageCap));
  const attackers = ['sport', 'commuter', 'wagon', 'suv', 'bus', 'semi', 'tank'], victims = ['commuter', 'wagon', 'suv', 'bus'], speeds = [15, 30, 40, 55];
  const per = CONFIG.damagePerSpeed;
  for (const att of attackers) {
    CAR.mass = V[att].mass;
    console.log(`\nattacker ${att} (mass ${V[att].mass})   cells: raw / flat15 / now   [p = what the attacker takes now]`);
    console.log('closing | ' + victims.map(v => `${v}(${V[v].health})`.padEnd(26)).join(' | '));
    for (const closing of speeds) {
      const row = [];
      for (const kind of victims) {
        const t = V[kind], car = Traffic.cars.find(c => c.dir > 0);
        for (const c of Traffic.cars) c.active = false;
        Object.assign(car, { active: true, kind, arrest: -1, shield: 0, ghost: 0, junction: false, stun: 0, hw: t.hw, hl: t.hl, mass: t.mass, health: 1e6, maxHealth: t.health, vs: 20, lat: Player.lat, yaw: 0, yawVel: 0, latVel: 0 });
        car.s = Player.s + Player.hl + car.hl - 0.3;
        Object.assign(Player, { health: 1e6, maxHealth: 1e6, speed: 20 + closing, ghost: 0, shield: 0, active: true, stun: 0, yaw: 0, yawVel: 0, latVel: 0, air: 0 });
        const s0 = Player.s;
        g.Collision.check();
        const now = 1e6 - car.health, p = 1e6 - Player.health, share = V[att].mass / (V[att].mass + t.mass);
        const raw = closing * per * share * 2, flat = Math.min(closing, 15) * per * share * 2;
        row.push(`${raw.toFixed(0)}/${flat.toFixed(0)}/${now.toFixed(0)}${now >= t.health ? ' WRECK' : ''} p${p.toFixed(0)}`.padEnd(26));
        Player.s = s0;
      }
      console.log(String(closing).padStart(7) + ' | ' + row.join(' | '));
    }
  }
} finally { await g.close(); }
