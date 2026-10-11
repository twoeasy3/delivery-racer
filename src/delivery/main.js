// Entry point: loads the game logic, then the rendering, and runs the frame loop.
// Game logic (src/*.js) never imports rendering (src/render/*.js), so it can run headless.
import './style.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Track } from './track.js';
import { LEVEL, LEVELS, selectLevel, selectSpecial, HIDDEN_LEVELS, setRaceClass } from './levels.js';
import { standsAlone } from './levelText.js';
import { THEMES } from './themes.js';
import { Progress } from './progress.js';
import './render/demo.js'; // (?demo: before the menu)
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { cleanRun } from './cleanrun.js';
import { Collision } from './collision.js';
import { renderer, scene, camera, tmp, updateCamera, Cinematic } from './render/scene.js';
import { syncZones } from './render/road.js';
import { carMesh, syncTraffic } from './render/cars.js';
import { emitVehicleSmoke, updateEffects } from './render/effects.js';
import { syncPackages } from './render/packages.js';
import { syncEmotes } from './render/emotes.js';
import { syncPickups, syncTargets, syncToads } from './render/items.js';
import { syncHelicopter, syncArrests } from './render/helicopter.js';
import { syncHeadlights, syncTrafficBeams } from './render/headlights.js';
import { syncUfoStrike } from './render/ufostrike.js';
import { syncBulletTrain } from './render/bullettrain.js';
import { syncJunctions } from './render/junctions.js';
import { syncTide } from './render/tide.js';
import { syncWater } from './render/water.js';
import { syncHippos } from './render/hippos.js';
import { syncElephants } from './render/elephants.js';
import { syncWreckage } from './render/wreckage.js';
import { syncMachinery } from './render/machinery.js';
import { syncGunfire } from './render/gunfire.js';
import { syncSite } from './render/site.js';
import { syncRoadside } from './render/roadside.js';
import { syncHazards } from './render/hazards.js';
import { syncGambles } from './render/gambles.js';
import { syncRadiation } from './render/radiation.js';
import { Radiation } from './radiation.js';
import { syncBattle } from './render/battle.js';
import { raceCamera, raceAudio, syncRaceWatch, auditCameras } from './render/racewatch.js';
import { Fly, startFly, flyCamera } from './render/fly.js';
import { Photo, syncPhoto, photoCamera, startPhoto } from './render/photo.js';
import { syncTankCorner } from './render/tankcorner.js';
import { syncCargo, drawCargoCorner, deliveryOn, deliveryCamera } from './render/cargo.js';
import { UfoStrike } from './ufostrike.js';
import { syncStorm } from './render/storm.js';
import { syncMovers } from './render/movers.js';
import { syncTunnel } from './render/tunnel.js';
import { syncReversible } from './render/reversible.js';
import { syncMysteries } from './render/mysteries.js';
import './render/pursuit.js';
import { Mysteries } from './mysteries.js';
import { updateHud } from './render/hud.js';
import './render/menu.js';
import './render/touch.js';
import './render/album.js';
import './render/milestones.js';
import './render/savecode.js';
import './horn.js';
import { Garage } from './render/garage.js';
import { Sound } from './render/audio.js';
import { Social } from './social.js';
import { CAR, lendCar, superOf, ownedAmphibious } from './cars.js';
import { Message } from './messages.js';

// ?autostart (or ?autostart=evil) in the address skips the start screen: handy when testing.
// ?test (or ?hidden=testbed) starts the hidden test track straight away (?test&evil: as Evil).
// ?edited plays the level as the level editor (editor.html) left it, as a hidden level (nothing saved).
// With any of those, ?fly freezes the level and gives a free camera to fly round it (render/fly.js).
// With it, ?level=3 picks the level (locked or not), ?at=1650 starts that many metres along
// the expressway and ?ff=5 runs the game for that many seconds before the first frame is drawn.
const params = new URLSearchParams(location.search);
// A visit with any of these is a test, not play: it lends cars and opens levels, so none of it is saved
// (Progress.noSave: the save stays as it was before the visit, whatever is delivered, bought or counted in it)
if (['autostart', 'hidden', 'test', 'edited', 'pick', 'car', 'ghost', 'mystery', 'theme', 'beaten', 'owns'].some(key => params.get(key) !== null)) Progress.noSave = true;
// ?beaten=expressway,back-roads:evil,farm:both and ?owns=lovebus,wagon&money=500: a state to look at (the level tiers:
// medals are best times; nothing is saved). A level listed alone is a Good medal.
if (params.get('beaten')) {
  for (const token of params.get('beaten').split(',')) {
    const [id, side = 'good'] = token.split(':');
    for (const s of side === 'both' ? ['good', 'evil'] : [side]) Progress.data.bestTime[s][id] = 10;
  }
}
if (params.get('owns')) for (const id of params.get('owns').split(',')) if (!Progress.data.cars.includes(id)) Progress.data.cars.push(id);
if (params.get('money')) Progress.data.money = Number(params.get('money')) || 0;
if (params.get('beaten') || params.get('owns') || params.get('money')) window.dispatchEvent(new Event('carchange')); // (the menu draws itself again)
// (before ?garage, so a garage opened with &pick is the picked level's) ?pick=41 shows the menu with that level picked, open or not (for a look at its card: nothing starts; the levels
// are all open for this visit); with &start, Start Game is pressed too (an amphibious level with no amphibious car)
if (params.get('pick')) {
  Progress.data.unlocked = Math.max(Progress.data.unlocked, LEVELS.length);
  Progress.data.tierBase = Math.max(Progress.data.tierBase || 0, LEVELS.length); // (the tiers, tiers.js: all open too)
  selectLevel(Number(params.get('pick')) - 1);
  window.dispatchEvent(new Event('carchange')); // (the menu draws itself again)
  if (params.get('start') !== null) Game.start();
}
// ?garage (or ?garage=evil) opens the garage; with it, ?hover=darkvan shows that car's tooltip.
if (params.get('garage') !== null) {
  Garage.open(params.get('garage') === 'evil');
  if (params.get('tab')) Garage.tab(params.get('tab')); // (&tab=ideas: its Car ideas lot, where &look and &hover name an idea)
  if (params.get('hover')) Garage.hover(params.get('hover'));
  if (params.get('look')) Garage.look(params.get('look')); // (&look=sport: that car looked at, for its comparison card)
  // &click=<selector>: that control pressed once the garage is up (&click=%23garageAction on an unowned car: its buy
  // sheet; &click=.view-pick%20.view-btn: the Sort list), for a picture of what it opens
  if (params.get('click')) params.get('click').split('|').forEach((selector, i) => setTimeout(() => document.querySelector(selector)?.click(), 50 + i * 50)); // (several, with | between)
}
// ?screensaver starts the screensaver straight away (with ?ff=5 as above); ?racewatch the race one
const autostart = params.get('autostart');
// ?car=bubble with no run started: the menu with that car in use for this visit, owned or not (a look at its card:
// nothing is saved). With ?autostart it is driven: see below
if (params.get('car') && autostart === null && !['hidden', 'test', 'edited', 'racewatch', 'screensaver'].some(key => params.get(key) !== null)) {
  Progress.data.cars.push(params.get('car'));
  Progress.data.car = params.get('car');
  window.dispatchEvent(new Event('carchange')); // (the menu puts the player in it, and draws itself again)
}
const hidden = params.get('hidden') || (params.get('test') !== null ? 'testbed' : params.get('edited') !== null ? 'edited' : null); // (a hidden level: see levels.js)
if (params.get('rival') !== null) Game.rival = params.get('rival') || 'opposite'; // ?rival[=evil|good]: a rival courier on every delivery level
if (params.get('gt') !== null) setRaceClass('gt'); // ?gt: every race in GT road cars, whatever the menu says
if (params.get('lmp') !== null) setRaceClass('lmp'); // (?lmp: in Le Mans prototypes)
if (params.get('ghost') !== null) Player.testGhost = true; // ?ghost: the car is a ghost for the whole run (nothing wrecks it: for screenshots and tests)
if (params.get('mystery')) Player.nextMystery = params.get('mystery'); // ?mystery=toad: every mystery pickup is that one
// ?edited: the level the editor left in local storage. It is not trusted: one that is no level, has no road, or
// cannot be built is not started (that used to stop the page dead, with nothing to say why): the menu, and why
const EDITED_LONGEST = 200000; // m of road, at most
const editedLevel = () => {
  let level = null;
  try { level = JSON.parse(localStorage.getItem('delivery_editor_level')); } catch { /* (no level handed over) */ }
  if (level === null) return { level }; // (none handed over: the test track)
  standsAlone(level); // (its name and description are its own, whatever its id: see levelText.js)
  const menuLevel = LEVELS.indexOf(LEVEL), road = level.segments;
  let problem = '';
  if (typeof level !== 'object' || Array.isArray(level)) problem = 'it is not a level';
  else if (!Array.isArray(road) || !road.length) problem = 'it has no road (no segments)';
  else if (road.some(seg => !seg || typeof seg.length !== 'number' || !(seg.length > 0) || !isFinite(seg.length))) problem = 'a segment of its road has no length';
  else if (road.reduce((sum, seg) => sum + seg.length, 0) > EDITED_LONGEST) problem = 'its road is over ' + EDITED_LONGEST / 1000 + ' km long';
  else {
    try { selectSpecial(level); Game.load(); } catch (e) { problem = 'it could not be built (' + (e && e.message || e) + ')'; }
    Game.loaded = null; // (a run builds it again, in its own order)
  }
  if (problem) selectLevel(Math.max(0, menuLevel));
  return { level, problem };
};
const edited = hidden === 'edited' ? editedLevel() : null;
if (params.get('racewatch') !== null) {
  Game.startRaceWatch();
  if (params.get('camcheck') !== null) { // (a check of every trackside camera)
    const t0 = performance.now(), r = auditCameras();
    console.log('camcheck ' + JSON.stringify(r) + ' ms ' + Math.round(performance.now() - t0));
  }
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
} else if (params.get('screensaver') !== null) {
  Game.startScreensaver();
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
} else if (edited && params.get('clock') !== null) {
  // ?edited&clock: the level editor's "Work out the clock" (editor.js loads this page out of sight): the level's
  // clean run is driven here, at once, and the page that asked is told what clock it gives (cleanrun.js)
  let told = { problem: edited.problem || (edited.level ? '' : 'no level was handed over') };
  if (!told.problem) {
    try { selectSpecial(edited.level); told = cleanRun(); } catch (e) { told = { problem: 'it could not be driven (' + (e && e.message || e) + ')' }; }
  }
  if (window.parent !== window) window.parent.postMessage({ type: 'clock', ...told }, '*');
} else if (edited && edited.problem) { // (nothing starts: the menu, with a line across the top of the page)
  const note = document.createElement('div');
  note.textContent = 'The edited level was not started: ' + edited.problem + '. Open it in the level editor to put it right.';
  note.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99;padding:8px 12px;background:#7a1f16;color:#fff;font:600 14px system-ui,sans-serif;text-align:center';
  document.body.appendChild(note);
  console.warn(note.textContent);
} else if (autostart !== null || hidden) {
  Game.evil = autostart === 'evil' || params.get('evil') !== null;
  if (hidden === 'edited') selectSpecial(edited.level || HIDDEN_LEVELS.testbed);
  else if (hidden) selectSpecial(HIDDEN_LEVELS[hidden] || HIDDEN_LEVELS.testbed);
  else selectLevel((Number(params.get('level')) || 1) - 1);
  // ?theme=snow: the level in that theme, whatever its own (a copy of it: nothing of the run is saved)
  if (params.get('theme') && THEMES[params.get('theme')]) selectSpecial({ ...LEVEL, theme: params.get('theme') });
  // ?rad=300-500 (or &rad=300-500:2, that lane only): a radiated area over that stretch on top of the level's own;
  // ?radcar=0.5: that share of its traffic dealt out infected (bare ?radcar: half). Tests of radiation.js on any level
  if (/^\d+-\d+(:\d+)?$/.test(params.get('rad') || '')) {
    const [from, to, lane] = params.get('rad').split(/[-:]/).map(Number);
    selectSpecial({ ...LEVEL, radiation: [...(LEVEL.radiation || []), lane >= 0 ? { from, to, lanes: [lane, lane] } : { from, to }] });
  }
  if (params.get('radcar') !== null) selectSpecial({ ...LEVEL, infectedTraffic: Math.min(1, Math.max(0, Number(params.get('radcar')) || 0.5)) });
  if (params.get('car')) { // ?car=lowrider: drive that car for this visit, owned or not (nothing is saved); ?car=super-sport: its Super version (cars.js superOf)
    Progress.data.cars.push(params.get('car').replace(/^super-/, ''));
    Progress.data.car = params.get('car').replace(/^super-/, '');
  }
  // (an amphibious level straight from the address, with no amphibious car owned: one for this visit, as ?car gives)
  if (LEVEL.amphibious && !ownedAmphibious()) Progress.data.cars.push(CONFIG.clock.amphibious);
  Game.start();
  if (params.get('car')?.startsWith('super-') && superOf(CAR)) Player.takeCar(() => lendCar(superOf(CAR)));
  if (params.get('at')) Player.s = Number(params.get('at'));
  // ?infected: the player infected from the start (a picture of its glow; with ?infected=armour, under the armour too)
  if (params.get('infected') !== null) { Radiation.infect(); if (params.get('infected') === 'armour') Player.armour = 600; }
  if (params.get('speed')) Object.assign(Player, { speed: Number(params.get('speed')), launching: false }); // ?speed=31: doing that many m/s from the start (with ?ff: hands off, the speed holds)
  if (params.get('lane')) Player.lat = Track.laneOffset(Number(params.get('lane')), Player.s); // ?lane=4: in that lane
  if (params.get('pieces')) Game.tankPieces = Math.min(CONFIG.tankPieces - 1, Number(params.get('pieces')) || 0); // ?pieces=3: that many pieces of the tank found already
  if (params.get('rage') !== null) { Game.tankPieces = CONFIG.tankPieces; Player.startTank(); } // ?rage: in TANK RAGE from the start (a check, a picture: on an amphibious level, the Amphibious Tank)
  if (params.get('fly') !== null) startFly();
  const photo = params.get('photo') !== null; // ?photo: paused, in photo mode, once ?ff has run (a check of render/photo.js)
  // ?cine: a still for the level select. The traffic is dealt out afresh around the car, ?ff lets
  // it settle, then everything stops: no HUD, and the camera off to one side (render/scene.js)
  const cine = params.get('cine') !== null;
  if (cine) Traffic.reset();
  for (let t = 0; t < Number(params.get('ff') || 0); t += CONFIG.maxStep) Game.update(CONFIG.maxStep);
  if (photo) { Game.paused = true; startPhoto(); }
  if (cine) {
    Cinematic.on = true;
    Cinematic.studio = params.get('cine') === 'car'; // (?cine=car: the car alone, on white)
    Cinematic.turn = Number(params.get('turn')) || 0; // (&turn=120: the studio's camera that many degrees round the car, for its other sides)
    // (the level's still: &cineside=left puts the camera on the other side of the road, &cineout=2 that many m
    // beyond the road's edge (9; below 0, over the road), &cineup=12 that high (7.5), &cineback=40 that far behind (22))
    if (params.get('cineside') === 'left') Cinematic.side = -1;
    for (const key of ['out', 'up', 'back']) if (params.get('cine' + key) !== null && isFinite(Number(params.get('cine' + key)))) Cinematic[key] = Number(params.get('cine' + key));
    Player.testGhost = false; Player.ghost = 0; // (a car kept whole by ?ghost while ?ff ran is not drawn as a ghost in its picture)
    Game.paused = true;
    document.body.classList.add('cinematic');
    if (Cinematic.studio) {
      for (const car of Traffic.cars) car.active = false;
      scene.background.set(0xffffff);
      scene.fog.near = 5000;
      scene.fog.far = 6000;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      floor.rotation.x = -Math.PI / 2;
      Track.toWorld(Player.s, Player.lat, tmp);
      floor.position.set(tmp.x, tmp.y - 0.01, tmp.z);
      floor.userData.studio = true;
      scene.add(floor);
    }
  }
}

// every looping sound off: in the garage and on the menu
const silence = () => {
  Sound.engine(-1);
  Sound.pack(0);
  Sound.siren(0);
  Sound.helicopter(false);
  Sound.frog(0);
  Sound.powerWarning(false);
  Sound.ufoStrike(false);
  Sound.lowriders(0);
};

// ?hudcheck (with ?autostart): every part of the HUD showing at once and held there, for a picture of it:
// the shoulder's danger most of the way up, a flat tyre, a mystery running (?mystery= names it, or the
// earthquake), half a tank found, and two ordinary messages kept up (a long one and a bust's).
// ?hudcheck=many: bad gas, the extra weight, butterfingers and the gravel as well, so six sticky icons.
// ?hudcheck=one: only the flat tyre, its message held as it is when just said; ?hudcheck=later: the same, said
// the once and left to go as any message does (so a picture some seconds on has the icon alone);
// ?hudcheck=icons: all the sticky messages there are, for their icons
const hudCheck = params.get('hudcheck') === null ? null : () => {
  if (Game.state !== 'playing' || !Player.active || Game.screensaver) return;
  const mode = params.get('hudcheck'), held = (path) => Message.sticky.some(h => h.path === path);
  if (mode === 'one' || mode === 'later') {
    if (!Player.puncture) Player.punctureTyre(1);
    if (mode === 'one') for (const h of Message.sticky) h.line.at = performance.now();
    return;
  }
  if (!Player.mystery) { Player.nextMystery = params.get('mystery') || 'earthquake'; Player.collect('mystery'); }
  if (!Player.puncture) Player.punctureTyre(1);
  if (mode === 'many' || mode === 'icons') {
    // (in play only one powerup runs at a time, so never more than three icons: these are put on by hand)
    for (const [type, timer] of [['badGas', 'badGas'], ['heavyMass', 'heavy'], ['butterfingers', 'butterfingers']]) {
      if (!(Player[timer] > 0)) Player[timer] = CONFIG[type].time;
      if (!held('powerups.' + type)) Message.say('powerups', type);
    }
    if (!(Player.beached > 0.5)) Player.beached = CONFIG.gravel.beachTime;
    if (!held('events.beached')) Message.say('events', 'beached');
  }
  if (mode === 'icons') { // (only one mystery runs at a time: the others' messages are held here for the picture)
    Message.conditions.mystery.on = () => true;
    for (const [path, condition] of Object.entries(CONFIG.messageTimes.sticky)) if (condition === 'mystery' && !held(path)) Message.say(...path.split('.'));
  }
  Player.danger = Social.dangerTime * 0.3;
  Game.tankPieces = 2;
  if (!Message.lines.some(line => line.kind === 'bust')) { Message.say('events', 'wideLoad'); Message.say('busts', 'seen'); }
  for (const line of Message.lines) line.at = performance.now();
};

let last = performance.now();
let prevState = Game.state;
const frame = (now) => {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) || 0.001; // (never less than nothing: a first frame's `now` can be before `last`, after ?ff)
  last = now;

  if (Garage.isOpen) {
    Garage.render(now); // the garage has a scene of its own
    silence();
  } else if (Game.state !== 'start') { // (on the start screen there is no level: it is only a menu)
    // game logic, in small fixed-size steps so fast head-ons can't tunnel (frozen while paused)
    const steps = Game.paused ? 0 : Math.ceil(dt / CONFIG.maxStep);
    for (let i = 0; i < steps; i++) Game.update(dt / steps);

    // then bring the scene up to date with it
    const heading = Track.toWorld(Player.s, Player.lat, tmp);
    carMesh.position.copy(tmp);
    carMesh.position.y += Player.air + Mysteries.heave(Player.s); // (on a drawbridge's leaf, or jumping it; riding an earthquake's wave)
    carMesh.rotation.order = 'YXZ'; // (heading first, then the pitch about the car's own axle line)
    carMesh.rotation.y = heading - Player.yaw; // swerving right turns the nose toward +lat
    carMesh.rotation.x = -Math.atan(Track.grade(Player.s)) - Player.pitch; // nose up on a climb (and up a drawbridge's leaf)
    if (Player.pitch) carMesh.position.y += Math.abs(Math.sin(Player.pitch)) * 0.25; // (so its low end doesn't sink into the slope)
    syncHelicopter(dt, now); // (decides whether the car is shown: blinking under a shield, dangling from the helicopter)
    // The screensaver has no player car: the mesh, and everything attached to it (the garage
    // models, the tank, the UFO, the passenger), is hidden. This comes after the helicopter,
    // which otherwise shows it again.
    if (Game.screensaver || Fly.on) carMesh.visible = false;
    syncHeadlights();
    syncTraffic();
    syncToads(now);
    syncArrests(dt, now);
    syncTrafficBeams();
    syncUfoStrike(dt);
    syncBulletTrain();
    syncJunctions(now);
    syncTide(now);
    syncWater(now, dt); // (after the car and the traffic are placed: it floats them)
    syncHippos();
    syncElephants(now);
    syncWreckage(now);
    syncMachinery(now);
    syncGunfire();
    syncSite();
    syncRoadside(dt);
    syncHazards(now);
    syncGambles(now, dt); // (after the car and the traffic are placed: it leans and shakes them)
    syncRadiation(now, dt); // (after the traffic is placed: the infected cars' rings go with them)
    syncTunnel(); // (after the roadside's fog bank: a tunnel only ever closes the fog in further)
    syncReversible();
    syncBattle(dt);
    syncZones(dt);
    syncStorm(dt);
    syncMovers(dt);
    emitVehicleSmoke(dt);
    syncPackages(dt);
    syncPickups(dt);
    syncTargets(dt);
    updateEffects(dt);

    syncCargo(dt, now); // (the cargo set down at the kerb, at the end: after the car is placed, before the camera)
    syncPhoto();
    if (Fly.on) flyCamera(dt); // (flying round a level: see render/fly.js)
    else if (Photo.on) photoCamera(); // (photo mode, while paused: see render/photo.js)
    else if (Game.raceWatch) raceCamera(dt); // (the race screensaver's cameras)
    else if (deliveryOn()) deliveryCamera(); // (a level delivered: round to the kerb, see render/cargo.js)
    else updateCamera(dt, prevState !== 'playing' && Game.state === 'playing');
    syncMysteries(dt); // (after the camera: the earthquake bobs it)
    syncRaceWatch(now);
    syncEmotes(dt, now);
    if (hudCheck) hudCheck();
    updateHud();
    // the engine note follows the speed; silent once the run is over or the car is gone
    // (and in the screensaver, where there is no car, or while paused)
    const live = Game.state === 'playing' && Player.active && !Game.paused && !Game.screensaver;
    // (in the race screensaver: the watched car, and the rest of the field, as the camera hears them)
    const heard = Game.raceWatch && Game.state === 'playing' && !Game.paused ? raceAudio(dt) : null;
    if (heard) Sound.engine(heard.speed, CAR.id, CAR.maxSpeed, heard.gain, heard.pitch);
    else Sound.engine(live ? Player.speed : -1, Player.tank > 0 ? 'tank' : Player.afloat ? 'jetboat' : CAR.sound || CAR.base?.id || CAR.id, // (a Super car: its base car's engine, wound higher; a car idea: the engine of the car its `sound` names; afloat on a water stage, a boat's)
      Player.tank > 0 ? Player.rageTank?.maxSpeed ?? CONFIG.tankMaxSpeed : CAR.maxSpeed);
    Sound.pack(heard ? heard.pack : 0);
    // the siren, louder the nearer the nearest police car or ambulance (the screensaver's too), and a radar
    // ping as one comes near enough to bust you (nobody busts a tank)
    let copFar = Infinity;
    for (const c of Traffic.cars) {
      if (!c.active || (c.kind !== 'police' && c.kind !== 'ambulance' && !c.sirenOn) || c.toad || c.junction) continue;
      // (a pursuit's interceptor is heard from further off: before it is seen)
      copFar = Math.min(copFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat) * (c.sirenOn ? CONFIG.sirenRange / CONFIG.pursuit.heard : 1));
    }
    const siren = Game.state === 'playing' && !Game.paused ? Math.max(0, 1 - copFar / CONFIG.sirenRange) : 0;
    // (the player's own siren, a pickup, at full blast)
    Sound.siren(live && Player.siren > 0 ? 1 : siren * siren, live && Player.tank <= 0 && Traffic.policeNear());
    // the lowriders' music, the same way: from the nearest one in traffic
    let lowriderFar = Infinity;
    for (const c of Traffic.cars) {
      if (!c.active || c.kind !== 'lowrider' || c.toad || c.junction) continue;
      lowriderFar = Math.min(lowriderFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat));
    }
    const lowrider = Game.state === 'playing' && !Game.paused ? Math.max(0, 1 - lowriderFar / CONFIG.lowriderHearing) : 0;
    Sound.lowriders(lowrider * lowrider);
    // beeps while on the shoulder with the danger meter running down, faster the nearer the bust
    Sound.danger(live && Player.onShoulder ? 1 - Player.danger / Social.dangerTime : -1);
    // a powerup about to run out
    Sound.powerWarning(live && Player.powerLeft > 0 && Player.powerLeft <= CONFIG.powerUpWarning);
    // the UFO AIR STRIKE's saucer, for as long as it is about
    Sound.ufoStrike(!!UfoStrike.phase && !Game.paused && Game.state === 'playing');
    // the helicopter while it comes for the car (wrecked or busted), and keeps it at game over
    Sound.helicopter(!Game.paused && !Game.screensaver &&
      ((Game.state === 'playing' && (!Player.active || Player.busted || Traffic.cars.some(c => c.active && c.arrest >= 0))) || Game.over));
    // a frog croaks louder the nearer it is (and so does a toad, in TOAD RAGE)
    let frogFar = Infinity;
    for (const o of Collision.obstacles) {
      if (o.kind === 'frog' && !o.gone) frogFar = Math.min(frogFar, Math.abs(Track.along(o.s) - Track.along(Player.s)));
    }
    for (const c of Traffic.cars) {
      if (c.active && c.toad) frogFar = Math.min(frogFar, Math.hypot(Track.along(c.s) - Track.along(Player.s), c.lat - Player.lat));
    }
    Sound.frog(Game.paused || Game.state !== 'playing' ? 0 : Math.max(0, 1 - frogFar / CONFIG.frogHearing));
    renderer.render(scene, camera);
    drawCargoCorner(dt, now); // (the cargo, in its corner of the HUD: over that patch of the frame)
  }
  if (Game.state === 'start') silence(); // (back on the menu)
  syncTankCorner(dt); // (it hides itself when there is no run)
  // the studio (?cine=car): nothing but the car, its floor and the lights
  if (Cinematic.studio) for (const o of scene.children) o.visible = o === carMesh || o.isLight || !!o.userData.studio;
  prevState = Game.state;
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
