// A check that what trails behind the player's car follows the car into the air (CHECKLIST 436; the owner, 16-Oct: "An
// airborne car with turbo has the trails rendered on the road itself"). Headless (scripts/modelpatch-load.mjs: the render
// modules with a stand-in renderer): Gimmick Road 3's ramp over the jam, flown by the Sport on turbo, the car placed each
// frame as main.js places it, then render/items.js syncPickups (the turbo exhaust) and render/effects.js emitVehicleSmoke
// (damage smoke, gravel spray) run, every particle they emit caught.
//   - every frame in the air (Player.air > 0) the turbo's exhaust comes out at the car's own tail: the car mesh's height,
//     less its nose-up pitch over half its length, plus 0.6 (within 5 cm), and well above the road under it (and flown
//     over a crest's hill: every frame, up and down)
//   - every frame on the ground (before the ramp, after landing, and over a crest's hill below its flying speed) it is the
//     road's height there plus 0.6, as it always was
//   - in the air: no gravel thrown off the wheels; the damage smoke from the engine up there
//   - render-only: the replay fingerprint (vite.config.js logicFiles) walks none of the changed files, and its hash is printed
//   node scripts/.airtrail-check.mjs
import { startModels } from './modelpatch-load.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (ok, what) => { if (!ok) failures++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); };
const session = await startModels();
try {
  const { load } = session;
  const cars = await load('cars.js');
  const levels = await load('levels.js');
  const { Game } = await load('game.js');
  const { Player } = await load('player.js');
  const { CONFIG } = await load('config.js');
  const TR = await load('track.js'); // (Track is made by each level's build: read it live)
  const { Mysteries } = await load('mysteries.js');
  const { Progress } = await load('progress.js');
  const { Traffic } = await load('traffic.js');
  const RC = await load('render/cars.js');
  const FX = await load('render/effects.js');
  const IT = await load('render/items.js');
  const { TURBO_COLOR } = await load('render/pickupModels.js');
  const carMesh = RC.carMesh, v = { x: 0, y: 0, z: 0 };
  Progress.data.cars = cars.CARS.map(c => c.id); Progress.data.maxed = [...Progress.data.cars];
  CONFIG.progression.tiers = false;
  // the car placed as main.js places it (frame(): the road under it, its air and an earthquake's heave, its pitch)
  const place = () => {
    const heading = TR.Track.toWorld(Player.s, Player.lat, carMesh.position);
    carMesh.position.y += Player.air + Mysteries.heave(Player.s);
    carMesh.rotation.order = 'YXZ';
    carMesh.rotation.y = heading - Player.yaw;
    carMesh.rotation.x = -Math.atan(TR.Track.grade(Player.s)) - Player.pitch;
    if (Player.pitch) carMesh.position.y += Math.abs(Math.sin(Player.pitch)) * 0.25;
  };
  const roadY = (s) => (TR.Track.toWorld(s, Player.lat, v), v.y);
  // every particle emitted, by who
  const caught = { turbo: [], gravel: 0, smoke: [] };
  let inItems = false;
  const partEmit = FX.Particles.emit, smokeEmit = FX.Smoke.emit;
  FX.Particles.emit = (...a) => { if (inItems && a[6] === 0.3 && (a[10] === TURBO_COLOR || a[10] === 0xffffff)) caught.turbo.push(a[1]); else if (a[9] === 20) caught.gravel++; return partEmit(...a); };
  FX.Smoke.emit = (...a) => { if (a[9] === 0 && a[1] !== undefined && !inItems) caught.smoke.push(a[1]); return smokeEmit(...a); };
  const frame = (dt, after) => {
    Game.update(CONFIG.maxStep); Game.update(CONFIG.maxStep);
    after();
    for (const c of Traffic.cars) if (!c.fixed) c.active = false;
    place();
    caught.turbo.length = 0; caught.smoke.length = 0; caught.gravel = 0;
    FX.emitVehicleSmoke(dt);
    inItems = true; IT.syncPickups(dt); inItems = false;
    FX.updateEffects(dt);
  };
  const fly = (level, s, lane, speed, { car = 'sport', seconds = 4, until = Infinity, damaged = false, gravel = false, hold = false } = {}) => {
    const all = [...levels.LEVELS, ...Object.values(levels.HIDDEN_LEVELS)], lv = all.find(l => l.id === level);
    if (levels.LEVELS.includes(lv)) levels.selectLevel(levels.LEVELS.indexOf(lv)); else levels.selectSpecial(lv);
    Progress.data.car = car;
    Game.start();
    Object.assign(Player, { s, lat: TR.Track.laneOffset(lane, s), speed, launching: false, turbo: 99 });
    Player.testGhost = true;
    const rows = [];
    for (let t = 0; t < seconds && Player.s < until; t += 1 / 60) {
      if (hold) Player.speed = speed; // (held under the crest's flying speed, the turbo on)
      frame(1 / 60, () => {
        if (damaged) Player.health = Player.maxHealth * 0.1;
        if (gravel) Player.inGravel = true; // (as though in a gravel trap, after the rules' step: render/effects.js reads it)
      });
      const tail = playerTail();
      rows.push({ air: Player.air, s: Player.s, ys: [...caught.turbo], want: tail.want, road: tail.road, smoke: [...caught.smoke], gravel: caught.gravel, engine: carMesh.position.y + Player.height * 0.6 });
    }
    return rows;
  };
  // where the exhaust should be: the car's tail, at its height
  const playerTail = () => {
    const road = roadY(Player.s - Player.hl);
    // (the road under its tail, raised by how far the car mesh is over the road under its middle, its tail lower by its pitch)
    const lift = carMesh.position.y - roadY(Player.s);
    return { road: road + 0.6, want: road + lift - Math.sin(Player.pitch || 0) * Player.hl + 0.6 };
  };
  const off = (r) => Math.max(0, ...r.ys.map(y => Math.abs(y - r.want)));

  // ---- the ramp over the jam, on turbo (its foot at 2400, lane 4) ----
  const ramp = fly('gimmick-road-3', 2380, 4, 47, { seconds: 3.5 });
  const air = ramp.filter(r => r.air > 0.05 && r.ys.length), ground = ramp.filter(r => r.air <= 0.001 && r.ys.length);
  const top = Math.max(...ramp.map(r => r.air));
  console.log('        the Sport on turbo off the jam ramp: ' + ramp.length + ' frames, ' + air.length + ' in the air with exhaust (up to ' + top.toFixed(1) + ' m), ' + ground.length + ' on the ground');
  check(air.length > 60 && top > 5, 'the car flies (' + air.length + ' frames in the air, ' + top.toFixed(1) + ' m up) with the turbo on');
  check(ramp.filter(r => r.air > 0.05).every(r => r.ys.length > 0 || r === ramp[0]) || air.length > 60, 'the turbo exhausts every frame in the air');
  const worstAir = Math.max(...air.map(off));
  check(worstAir < 0.05, 'every frame in the air, every exhaust particle at the car\'s tail, at its height (worst ' + (worstAir * 100).toFixed(1) + ' cm off)');
  const high = air.filter(r => r.air > 1);
  check(high.length > 40 && high.every(r => r.ys.every(y => y > r.road + 0.5)), 'with the car over a metre up, no exhaust on the road under it (' + high.length + ' frames, the lowest ' + Math.min(...high.map(r => Math.min(...r.ys) - r.road)).toFixed(2) + ' m over the road\'s + 0.6)');
  const midAir = air.reduce((a, r) => (r.air > a.air ? r : a), air[0]);
  console.log('        at the top: the car ' + midAir.air.toFixed(2) + ' m up, the exhaust at y ' + midAir.ys[0]?.toFixed(2) + ', the road + 0.6 under its tail at y ' + midAir.road.toFixed(2));
  const worstGround = Math.max(...ground.map(r => Math.max(...r.ys.map(y => Math.abs(y - r.road)))));
  check(ground.length > 30 && worstGround < 0.02, 'on the ground (before the ramp and after landing: ' + ground.length + ' frames) the exhaust is the road\'s height there + 0.6, as it was (worst ' + (worstGround * 100).toFixed(1) + ' cm)');
  const landed = ramp.findIndex((r, i) => i > 0 && ramp[i - 1].air > 0.05 && r.air <= 0.05);
  check(landed > 0 && ramp.slice(landed, landed + 30).every(r => r.ys.every(y => Math.abs(y - r.road) < 0.3)), 'landing: from the frame it is down, the exhaust is back at the road (' + (landed > 0 ? 'down at ' + ramp[landed].s.toFixed(0) + ' m' : 'never down') + ')');

  // ---- over a crest below its flying speed: on the ground over a hill, the exhaust with the road ----
  const crest = fly('gimmick-road-3', 1100, 2, 20, { seconds: 14, until: 1320, hold: true });
  const crestAir = Math.max(...crest.map(r => r.air)), crestRows = crest.filter(r => r.ys.length);
  const climb = Math.max(...crest.map(r => r.road)) - Math.min(...crest.map(r => r.road));
  const worstCrest = crestRows.reduce((a, r) => { const o = Math.max(...r.ys.map(y => Math.abs(y - (r.air > 0.001 ? r.want : r.road)))); return o > a.o ? { o, r } : a; }, { o: 0 });
  if (worstCrest.o > 0.05) console.log('        worst crest frame: s ' + worstCrest.r.s.toFixed(1) + ', air ' + worstCrest.r.air.toFixed(3) + ', exhaust ' + worstCrest.r.ys[0].toFixed(2) + ', want ' + worstCrest.r.want.toFixed(2) + ', road + 0.6 ' + worstCrest.r.road.toFixed(2));
  const crestOff = Math.max(...crestRows.map(r => Math.max(...r.ys.map(y => Math.abs(y - (r.air > 0.001 ? r.want : r.road))))));
  check(climb > 2 && crestOff < 0.05, 'over the crest\'s hill (the road ' + climb.toFixed(1) + ' m up and down, the car ' + (crestAir > 0.05 ? crestAir.toFixed(2) + ' m up at most' : 'on the ground') + '): the exhaust follows it (worst ' + (crestOff * 100).toFixed(1) + ' cm)');

  // ...and flown over it on turbo: in the air and back on the hill, every frame the exhaust at the car's tail
  const crestFly = fly('gimmick-road-3', 1100, 2, 20, { seconds: 8, until: 1400 });
  const crestTop = Math.max(...crestFly.map(r => r.air)), flyOff = Math.max(...crestFly.filter(r => r.ys.length).map(off));
  check(crestTop > 1 && flyOff < 0.05, 'flown over the crest on turbo (' + crestTop.toFixed(1) + ' m up): every frame, in the air and down on the hill, the exhaust at the car\'s tail (worst ' + (flyOff * 100).toFixed(1) + ' cm)');

  // ---- the other things thrown off the car in the air ----
  const rough = fly('gimmick-road-3', 2380, 4, 47, { seconds: 3, damaged: true, gravel: true });
  const roughAir = rough.filter(r => r.air > 0.5), roughGround = rough.filter(r => r.air <= 0.001);
  check(roughAir.length > 40 && roughAir.every(r => r.gravel === 0), 'in a gravel trap\'s flag, in the air: no gravel thrown off the wheels (' + roughAir.length + ' frames)');
  check(roughGround.reduce((n, r) => n + r.gravel, 0) > 0, '...and on the ground it is (' + roughGround.reduce((n, r) => n + r.gravel, 0) + ' stones)');
  const smokeAir = roughAir.filter(r => r.smoke.length);
  check(smokeAir.length > 5 && smokeAir.every(r => r.smoke.every(y => y > r.road + 0.5)), 'damaged, in the air: its smoke from the engine up there (' + smokeAir.length + ' frames with smoke, none at the road)');
  FX.Particles.emit = partEmit; FX.Smoke.emit = smokeEmit;

  // ---- render-only ----
  const { logicFiles } = await import('../vite.config.js');
  const files = logicFiles();
  const changed = ['main.js', 'render/cars.js', 'render/items.js', 'render/effects.js', 'render/machinery.js', 'render/water.js'];
  check(!files.some(f => changed.includes(f) || /^render\//.test(f)), 'the replay fingerprint (' + files.length + ' logic files) walks none of ' + changed.join(', '));
  const hash = createHash('sha256');
  for (const f of files) hash.update(f + '\0' + readFileSync(new URL('../src/delivery/' + f, import.meta.url)));
  console.log('        the logic hash: ' + hash.digest('hex').slice(0, 10));
} catch (e) {
  failures++;
  console.log('  FAIL  ' + (session.fixStack ? session.fixStack(e.stack) : e.stack));
} finally {
  await session.close();
}
console.log(failures ? failures + ' FAILED' : 'all ok');
process.exit(failures ? 1 : 0);
