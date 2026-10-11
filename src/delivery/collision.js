import { CONFIG } from './config.js';
import { LEVEL } from './levels.js';
import { themedKind } from './themes.js';
import { clamp } from './util.js';
import { Track } from './track.js';
import { FxQueue, startRivalry, hurt, sfx, sfxAt } from './physics.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Game } from './game.js';
import { Message } from './messages.js';
import { CAR } from './cars.js';

// where a cyclist rides: by the kerb of the side its peloton rides along (dir 1: the player's side, its
// inner row further out; dir -1: the far side, mirrored)
const kerbLat = (ride, s) => ride.dir < 0 ? Track.laneLo(s) + 0.55 + ride.row * 0.9 : Track.laneHi(s) - 0.55 - ride.row * 0.9;

// ============================================================================
// COLLISION - oriented boxes in track space: x = distance along track, y = lateral
// All vehicles are bodies that trade momentum; damage scales with impact speed.
// ============================================================================
export const Collision = (() => {
  // built on first use: this module, the player and the traffic import one another
  let allBodies = null;
  const getBodies = () => allBodies || (allBodies = [Player, ...Traffic.cars]);

  // separating axis test; a car's long axis is (cos yaw, sin yaw) in (s, lat)
  const overlap = (a, b) => {
    const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw);
    const cb = Math.cos(b.yaw), sb = Math.sin(b.yaw);
    const dx = b.s - a.s, dy = b.lat - a.lat;
    const axes = [ca, sa, -sa, ca, cb, sb, -sb, cb];
    for (let i = 0; i < 8; i += 2) {
      const ux = axes[i], uy = axes[i + 1];
      const ra = a.hl * Math.abs(ux * ca + uy * sa) + a.hw * Math.abs(uy * ca - ux * sa);
      const rb = b.hl * Math.abs(ux * cb + uy * sb) + b.hw * Math.abs(uy * cb - ux * sb);
      if (Math.abs(dx * ux + dy * uy) > ra + rb) return false;
    }
    return true;
  };

  let tick = 0; // counts calls to check(), to space out repeated damage from one long contact

  // is a crash between these two heard? The player's always; in the screensaver, any near the camera
  const heard = (a, b) => a.isPlayer || b.isPlayer ||
    (Game.screensaver && Math.abs(a.s - Player.s) < CONFIG.screensaver.soundRange);

  const resolve = (a, b) => {
    if (Player.giant && (a.isPlayer || b.isPlayer)) { // GIANT (a mystery): whatever the car touches is crushed, and it feels nothing (see mysteries.js)
      const other = a.isPlayer ? b : a;
      other.health = 0; other.hitBy = Player; other.hitAt = Game.time;
      Game.shake = Math.max(Game.shake, 0.6);
      sfx('heavy');
      return;
    }
    // TOAD RAGE: a toad bursts on touching anything, and the player's car takes it like a
    // frog in the road (never a head-on, nor a bust)
    if (a.toad || b.toad) {
      for (const v of [a, b]) if (v.toad) v.health = 0;
      const player = a.isPlayer ? a : b.isPlayer ? b : null;
      if (player && player.tank <= 0) {
        const cost = CONFIG.obstacleKinds.frog;
        hurt(player, cost.damage);
        player.speed *= cost.speedKept;
        player.stun = Math.max(player.stun, CONFIG.stunTime * 0.5);
        Game.shake = Math.max(Game.shake, 1);
      }
      if (heard(a, b)) sfx('crash');
      return;
    }
    const ds = b.s - a.s, dl = b.lat - a.lat;
    const penS = Math.max(0.02, a.hl + b.hl - Math.abs(ds));
    const penLat = Math.max(0.02, a.hw + b.hw - Math.abs(dl));
    const sideOn = penLat < penS;           // they came together sideways, not nose to tail
    const headOn = a.bound !== b.bound;     // one northbound, one southbound
    // a rival courier against ordinary traffic (not the player, nor another rival): it has much the
    // better of it (see CONFIG.rival.ram)
    const strong = (v) => v.courier || v.escaping; // (a rival courier, or a drive-by making its getaway)
    const courier = strong(a) && !strong(b) && !b.isPlayer ? a : strong(b) && !strong(a) && !a.isPlayer ? b : null;
    const R = CONFIG.rival.ram, struck = courier === a ? b : a;

    // Contact with a police car is a bust, unless it wasn't the player's doing: the police car
    // ran into the back of the player, sideswiped it or turned into it (it was the one moving
    // sideways towards the other, and faster), it was out of control, or it was oncoming.
    // (a pursuit's interceptor is a police car for this: it is too busy to see anything else, but hitting it is a bust)
    const isCop = (v) => v.kind === 'police' || v.kind === 'interceptor';
    const police = a.isPlayer && isCop(b) ? b : b.isPlayer && isCop(a) ? a : null;
    if (police) {
      const behind = (police.s - Player.s) * Player.dir < 0;
      const closing = (police.vs - Player.speed) * Player.dir > 0;
      const rearEnded = !sideOn && behind && closing;
      const toPlayer = Math.sign(Player.lat - police.lat); // (the way the player is from the police car)
      const turnedIn = police.latVel * toPlayer > Math.max(CONFIG.policeTurnIn, -Player.latVel * toPlayer);
      const outOfControl = police.spin > 0 || police.wobble > 0;
      if (!rearEnded && !turnedIn && !outOfControl && !headOn) Player.bust('bump');
    }
    if (a.isPlayer && a.tank > 0) {
      // TANK RAGE: whatever it touches is wrecked. Only a head-on costs the tank any health.
      b.health = 0;
      if (headOn) a.health -= a.maxHealth * CONFIG.tankHeadOnDamage;
      a.speed *= Math.max(0.35, 1 - CONFIG.tankRamSlow * b.mass); // ramming does slow it
      Game.shake = Math.max(Game.shake, 0.6);
      sfx('heavy');
      return;
    }
    // the Battlefield: a head-on between an army's vehicle (or the player's 8x8) and one a rank below goes
    // to the bigger one, at a cost of CONFIG.battle.win of its full health (a tank against an 8x8, an 8x8
    // against a jeep); anything else, as anywhere: both wrecked
    const rank = (v) => v.isPlayer ? CAR.rank || 0 : CONFIG.vehicles[v.kind]?.rank || 0;
    if (headOn && LEVEL.battle && rank(a) && rank(b) && Math.abs(rank(a) - rank(b)) === 1) {
      const [winner, loser] = rank(a) > rank(b) ? [a, b] : [b, a];
      if (loser.mystery !== 'invincible') loser.health = 0;
      if (winner.mystery !== 'invincible' && !(winner.isPlayer && winner.shield > 0)) winner.health -= winner.maxHealth * CONFIG.battle.win;
      if (heard(a, b)) {
        if (a.isPlayer || b.isPlayer) Game.shake = 1;
        sfx('headOn');
      }
      return;
    }
    if (headOn && courier) { // (the oncoming car is wrecked; the courier takes a hard knock, and slows right down)
      struck.health = 0;
      hurt(courier, R.headOn);
      courier.vs *= R.headOnSpeed;
      courier.stun = Math.max(courier.stun, CONFIG.stunTime * R.share);
      if (heard(a, b)) sfx('headOn');
      return;
    }
    if (headOn) {
      // a northbound and a southbound vehicle touching, however they touch, is a head-on:
      // both are wrecked outright (but an invincible player's car comes off unharmed: a mystery)
      if ((a.isPlayer && b.procession) || (b.isPlayer && a.procession)) Traffic.mourn(a.procession || b.procession);
      if (a.mystery !== 'invincible') a.health = 0;
      if (b.mystery !== 'invincible') b.health = 0;
      if (heard(a, b)) {
        if (a.isPlayer || b.isPlayer) Game.shake = 1;
        sfx('headOn');
      }
      return;
    }

    // Cars are only ever pushed along the road, never sideways. Overlapping cars are slid
    // apart nose to tail, a little each step, and trade momentum along the road.
    // (between traffic, the lighter body takes the bigger share of any push)
    const shareA = b.mass / (a.mass + b.mass), shareB = 1 - shareA;
    // The player always wins a shoving match with traffic, whatever the two weigh: the
    // player takes only a small share of any push, the traffic vehicle the rest. The one
    // exception is the player running into the back of a traffic vehicle: then it is the
    // traffic that has the better of it, and the player who loses the speed.
    const player = a.isPlayer ? a : b.isPlayer ? b : null, other = a.isPlayer ? b : a;
    if (player && other.procession) Traffic.mourn(other.procession);
    const rearEnd = player && !sideOn && (other.s - player.s) * player.dir > 0 && (player.vs - other.vs) * player.dir > 0;
    // (under the 1000 lb weight the player wins every shove, rear-ends included)
    const playerShare = player && player.heavy > 0 ? CONFIG.heavyMass.pushShare
      : rearEnd ? CONFIG.playerRearEndShare : CONFIG.playerPushShare;
    const pushA = a.isPlayer ? playerShare : b.isPlayer ? 1 - playerShare : courier ? (courier === a ? R.share : 1 - R.share) : shareA;
    const pushB = 1 - pushA;
    const n = ds >= 0 ? 1 : -1; // b is the one in front
    const slide = Math.min(penS, CONFIG.pushStep);
    a.s -= n * slide * pushA;
    b.s += n * slide * pushB;

    let impact = 0, scraped = false;
    const closing = (a.vs - b.vs) * n;
    if (closing > 0) {
      const j = (1 + CONFIG.bounce) * closing;
      a.vs -= n * j * pushA;
      b.vs += n * j * pushB;
      // (a rear-end swings nobody round: only a side-on contact that is also closing along
      // the road turns the cars, by how far off-centre it is)
      if (sideOn) {
        const spin = n * clamp(dl / (a.hw + b.hw), -1, 1) * CONFIG.spinKick * closing * 0.5;
        a.yawVel += spin * pushA * 2;
        b.yawVel += spin * pushB * 2;
      }
      impact = closing;
    }
    if (sideOn) {
      // steering into the side of another car: it hurts, but neither is shoved sideways (but on a
      // level with "nudge": each is knocked aside, the lighter the further). One long scrape counts
      // as one hit, not one per step.
      const sideways = (a.latVel - b.latVel) * (dl > 0 ? 1 : -1);
      // (a rival courier side by side with a car shoves it out of its way)
      if (courier) struck.latVel += Math.sign(struck.lat - courier.lat || 1) * R.shove * CONFIG.maxStep * 60;
      if (LEVEL.nudge && sideways > 0) {
        const j = (1 + CONFIG.bounce) * sideways * (dl > 0 ? 1 : -1);
        a.latVel -= j * pushA;
        b.latVel += j * pushB;
        a.lat -= Math.sign(dl) * slide * pushA; // (and slid apart, a little each step)
        b.lat += Math.sign(dl) * slide * pushB;
      }
      if (sideways > CONFIG.minImpact && tick - (a.sideTick || -99) > 60 && tick - (b.sideTick || -99) > 60) {
        a.sideTick = b.sideTick = tick;
        const turn = -(dl > 0 ? 1 : -1) * clamp(ds / (a.hl + b.hl), -1, 1) * CONFIG.spinKick * sideways;
        a.yawVel += turn * pushA * 2;
        b.yawVel += turn * pushB * 2;
        const scrape = sideways + Math.abs(a.vs - b.vs) * CONFIG.scrape;
        scraped = scrape >= impact; // (mostly a scrape down the side, not a knock along the road)
        impact = Math.max(impact, scrape);
      }
    }

    if (impact > CONFIG.minImpact) {
      // (each remembers who hit it, and when: a wreck soon after is that one's doing, see RaceWatch)
      a.hitBy = b; b.hitBy = a;
      a.hitAt = b.hitAt = Game.time;
      const damage = impact * CONFIG.damagePerSpeed;
      // (what a hit can take of a victim's health goes by the mass of what hit it: see CONFIG.damageCap)
      const DC = CONFIG.damageCap, cap = (victim, by) => victim.maxHealth * clamp(DC.base + DC.perMass * ((by.mass || 1) - 1), DC.base, DC.most);
      // (a rival courier takes little of it, and dishes out more: see CONFIG.rival.ram)
      const hit = (v, share) => v === courier ? share * R.share / 0.5 : courier ? share * R.damage : share;
      // (a Mini slips through the gap: a scrape down another car's side costs it nothing: CARS' trait 'slim')
      const slips = (v) => v.isPlayer && scraped && CAR.trait === 'slim' && v.tank <= 0;
      if (!slips(a)) hurt(a, Math.min(damage * hit(a, shareA) * 2, cap(a, b)));
      if (!slips(b)) hurt(b, Math.min(damage * hit(b, shareB) * 2, cap(b, a)));
      if (a.isPlayer || b.isPlayer) Traffic.arrest(a.isPlayer ? b : a); // (under the player's siren)
      if (a.isPlayer) b.grudge = CONFIG.grudgeTime;
      if (b.isPlayer) a.grudge = CONFIG.grudgeTime;
      // traffic that collides with traffic tends to take it personally
      if (Math.random() < CONFIG.rivalryChance) startRivalry(a, b);
      if (Math.random() < CONFIG.rivalryChance) startRivalry(b, a);
      // (the player's car is knocked about less the heavier it is: see Player.mass)
      const stun = CONFIG.stunTime * clamp(impact / 10, 0.3, 1);
      a.stun = Math.max(a.stun, a.isPlayer ? stun / a.mass : a === courier ? stun * R.share : stun);
      b.stun = Math.max(b.stun, b.isPlayer ? stun / b.mass : b === courier ? stun * R.share : stun);
      if (heard(a, b)) {
        if (a.isPlayer || b.isPlayer) Game.shake = Math.max(Game.shake, clamp(impact / 15, 0.25, 1));
        sfx(impact >= CONFIG.hardCrash ? 'crashHard' : scraped ? 'sideswipe' : 'crash', clamp(impact / 18, 0.3, 1));
      }
    }
  };

  // ---- obstacles: they exist only for the player; traffic drives straight through them ----
  //   barrier, bale, cone, sign  stay where they are put
  //   frog           hops all over the road within its stretch
  //   cow            ambles across the road, stands a while, ambles back
  //   kangaroo       the same, but bounding across, quickly, in hops
  //   dropBear       up in a tree over the road until the player is near, then it drops onto the
  //                  road (it can only be hit once it is down there) and stays
  //   asteroid       a rock of radius r whose centre is h above the road. Some sit at road
  //                  level; some pass just under or over it and can't be hit, and nothing
  //                  marks which. The moving ones drift across the road or bob through it
  // The list is filled by loadLevel() when a level is loaded (see Game.load).
  const SIZE = { // hw, hl, height
    barrier: [1.2, 0.6, 1.2],
    // a railway barrier: low and narrow enough to sit wholly inside a passing bullet train
    railBarrier: [1.2, 0.6, 0.95],
    bale: [1.1, 1.1, 1.5], frog: [1.4, 1.4, 1.6], cow: [0.7, 1.3, 1.5], kangaroo: [0.5, 0.8, 1.8], dropBear: [0.6, 0.6, 1.0],
    wildebeest: [0.55, 1.1, 1.5], zebra: [0.5, 1.1, 1.5],
    // the construction site's: a portaloo, a heap of sewage, a heap of dirt, a steel beam across a lane
    potty: [0.7, 0.7, 2.4], sewage: [1.2, 1.1, 0.8], pile: [1.4, 1.3, 1.7], beam: [1.65, 0.3, 0.6],
    // ...and its site works': a wheelbarrow, a concrete pipe rolling across the road (see site.js)
    barrow: [0.45, 0.8, 0.8], pipe: [0.9, 1.3, 1.8],
    asteroid: [1, 1, 2], // replaced by each asteroid's own radius
    cone: [0.42, 0.42, 1.12], sign: [1.1, 0.15, 3.0], limitSign: [0.5, 0.15, 3.0], // (cones are 1.4 times life size: easier to see on a phone)
    mine: [0.58, 0.58, 1.05], // a sea mine, afloat: a little bigger than a cone
    // the beach's own junk (Hurricane): a beach umbrella, a surfboard stuck upright, an ice
    // box, a lifeguard chair, and a wrecked car (which spins on the spot as it drifts)
    umbrella: [1.2, 1.2, 3.0], surfboard: [0.6, 0.25, 2.6], cooler: [0.8, 0.6, 1.2], chair: [1.0, 1.0, 3.4],
    wreck: [1.0, 2.1, 1.4],
    // the hidden gimmicks level's: a speed camera on its pole, a rock come down the hillside (its
    // size replaced by its own radius), a cyclist on its bike
    camera: [0.3, 0.3, 4.2], rock: [1, 1, 2], cyclist: [0.35, 0.95, 2.1],
    // the Battlefield's: a landmine in a lane (see landmines below)
    landmine: [0.75, 0.75, 0.4],
    // Gimmick Road 2's (see hazards.js, which adds and moves them): a shopping trolley, a marathon runner, a
    // water station's table, the marathon's pace car, a wide load and its escort
    trolley: [0.45, 0.6, 1.1], runner: [0.3, 0.3, 1.8], waterTable: [0.9, 0.5, 1.0], paceCar: [0.9, 2.0, 1.6],
    wideLoad: [3.2, 6.5, 3.6], escort: [0.95, 2.2, 1.7],
    // a parade's bandsman (see parades below); and falling cargo, shed off a truck (see Cargo)
    marcher: [0.35, 0.35, 2.3], crate: [0.6, 0.6, 1.1],
  };
  // the themes' own obstacles (a theme's `obstacles`: see themes.js): each is the kind it stands in for in another
  // shape, so it has that kind's box, its height too (what the car clears in the air), whatever its model's
  for (const [kind, like] of Object.entries({ toyBlock: 'crate', divingHelmet: 'crate', supplyPod: 'crate', directorChair: 'crate', mooringPosts: 'crate',
    fuelDrum: 'crate', popcornCart: 'crate', barrel: 'crate', chairStack: 'crate', riceBasket: 'crate', wasteDrum: 'crate', hawkerCart: 'crate', cameraDolly: 'bale', present: 'bale', toyDrum: 'bale', sackStack: 'bale', bagStack: 'bale',
    beachBall: 'bale', tumbleweed: 'bale', skittle: 'cone', cafeTable: 'cone', wheelieBin: 'cone', snowdrift: 'cone', brimstone: 'cone', flagStand: 'cone', lavaRock: 'rock' })) SIZE[kind] = SIZE[like];
  // what a level's own obstacle of that kind is on its theme (its "obstacles", "shoulderRows" and "drifters"
  // only: what a gimmick puts out, a cargo truck's load among it, is what it always was)
  // (drifting: one of its "drifters", where a theme can have another thing again: a bale that drifts is a tumbleweed)
  const themed = (kind, drifting) => themedKind(LEVEL.theme, kind, drifting);
  const obstacles = [];
  const loaders = []; // (others adding obstacles of their own as a level loads: each is called with add)
  // a rock or an asteroid is sized by its radius, which a rockfall or an asteroid field gives it with the rest of
  // what it does there. One put out any other way (a level's "obstacles", its "drifters") is `loose`: given a
  // radius here (the same every run), it sits on the road like any other obstacle, with none of those doings.
  // (Without a radius its model was built of NaNs)
  const loose = (kind, s) => {
    const R = CONFIG.drifters.rock, u = Math.abs(Math.sin(s * 12.9898) * 43758.5453) % 1, r = R.min + u * (R.max - R.min), h = kind === 'asteroid' ? r * 0.6 : 0;
    return { loose: true, r, hw: r * 0.9, hl: r * 0.9, height: 2 * r, h0: h, h, vLat: 0, bob: 0, period: 1, phase: 0, time: 0, spin: 0.5 };
  };
  const add = (kind, s, lat, extra) => {
    if ((kind === 'rock' || kind === 'lavaRock' || kind === 'asteroid') && !(extra && extra.r > 0)) // (lavaRock: the volcano's rock, the same in all but looks)
      extra = { ...loose(kind, s), lat0: lat, ...extra };
    const [hw, hl, height] = SIZE[kind];
    // h = height off the ground (frogs), face = which way the model points, in track space
    obstacles.push({ kind, s, lat, h: 0, yaw: 0, face: 0, hw, hl, height, gone: false, ...extra });
  };
  const stretch = (z) => {
    const from = Track.place({ s: z.from, road: z.road, exit: z.exit });
    return { from, to: from + (z.to - z.from) };
  };
  const loadLevel = () => {
    obstacles.length = 0;
    for (const load of loaders) load(add);
    for (const o of LEVEL.obstacles || []) {
      const s = Track.place(o), lat = Track.laneOffset(o.lane, s), D = CONFIG.drifters;
      add(themed(o.kind || 'barrier'), s, lat, o.drift === 'dart' ? { drift: 'dart', time: 0, homeS: s, homeLat: lat, along: D.dartAlong, across: D.dartAcross } : undefined);
    }
    // rows of things standing on the shoulders (not beside an exit or merge lane, where a
    // side road's pavement runs over the shoulder as it forks off, nor on a bridge)
    const spot = {};
    for (const row of LEVEL.shoulderRows || []) {
      const sides = row.side === 'left' ? [-1] : row.side === 'right' ? [1] : [-1, 1];
      for (let s = row.from; s <= row.to; s += row.every || 10) {
        if (Track.onBridge(s)) continue;
        for (const side of sides) {
          if (side > 0 && Track.rampLaneZone(s)) continue;
          const lat = Track.shoulderOffset(side, s);
          Track.toWorld(s, lat, spot);
          if (Track.sideDistance(spot.x, spot.z) < CONFIG.laneWidth * 2) continue;
          add(themed(row.kind || 'cone'), s, lat);
        }
      }
    }
    for (const z of LEVEL.frogs || []) add('frog', 0, 0, { ...stretch(z), fromS: 0, fromLat: 0, toS: 0, toLat: 0, t: 1, rest: 0 });
    // stop / go roadworks: cones down the centre line, and across the dug-up lane and its shoulder at each end (see StopGo)
    for (const z of LEVEL.stopGo || []) {
      const from = Track.place({ s: z.from }), to = from + (z.to - z.from);
      for (let s = from; s <= to; s += CONFIG.stopGo.coneEvery) add('cone', s, -0.55);
      for (const s of [from - 2, to + 2]) {
        const lo = Track.lo(s) + 0.6, n = Math.max(3, Math.round((-0.55 - lo) / 1.6) + 1); // (a cone every metre and a half or so)
        for (let k = 0; k < n; k++) add('cone', s, lo + (-0.55 - lo) * k / (n - 1));
      }
    }
    // speed cameras on their poles: on a shoulder, or on the centre line (see SpeedCameras)
    (LEVEL.cameras || []).forEach((c, i) => {
      const s = Track.place(c);
      add('camera', s, c.side === 'centre' ? 0 : Track.shoulderOffset(c.side === 'left' ? -1 : 1, s), { camera: i });
      // (and its speed limit sign on the shoulder on its side, a little short of it: one on the centre line, on the right)
      let at = s - CONFIG.speedCamera.signAhead;
      for (const jn of Track.junctions) if (Track.isMain(at) && at > jn.s - 9 && at < jn.end + 9) at = jn.s - 9; // (not in the mouth of a crossroads: short of it)
      if (Track.inBounds(at)) add('limitSign', at, Track.shoulderOffset(c.side === 'left' ? -1 : 1, at), { limit: c.limit ?? LEVEL.speedLimit ?? CONFIG.speedCamera.limit });
    });
    // rockfall: each rock somewhere in its stretch, landing anywhere across the road, up the hillside
    // on its side until the player is near (see CONFIG.rockfall). Seeded: the same rocks every run
    let rockSeed = 97531;
    const rockRand = () => ((rockSeed = (rockSeed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (const z of LEVEL.rockfall || []) {
      const R = CONFIG.rockfall, side = z.side === 'left' ? -1 : 1;
      for (let i = 0; i < (z.count || 5); i++) {
        const s = Track.place({ s: z.from + (z.to - z.from) * (i + rockRand()) / (z.count || 5), road: z.road, exit: z.exit });
        const r = R.size.min + rockRand() * (R.size.max - R.size.min);
        const lat = Track.lo(s) + r + rockRand() * (Track.hi(s) - Track.lo(s) - 2 * r);
        add('rock', s, lat, { r, hw: r * 0.9, hl: r * 0.9, height: 2 * r, side, land: lat, nearAt: R.near.min + rockRand() * (R.near.max - R.near.min),
          up: z.height ?? R.height, out: z.out ?? R.out, // (where it waits: the level's, or the hillside's)
          ledge: z.height !== undefined }); // (the level says how high: something stands there for it to wait on, a quarry's bench)
      }
    }
    // landmines: scattered down the lanes over their stretch, in the middle of a lane, each with its light
    // flashing in its own time. Seeded: the same mines every run
    let mineSeed = 424243;
    const mineRand = () => ((mineSeed = (mineSeed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (const z of LEVEL.landmines || []) {
      for (let i = 0; i < z.count; i++) {
        const s = Track.place({ s: z.from + (z.to - z.from) * (i + mineRand()) / z.count, road: z.road, exit: z.exit });
        const [first, last] = Track.laneRange(1, s), lane = first + Math.floor(mineRand() * (last - first + 1));
        add('landmine', s, Track.laneOffset(lane, s), { phase: mineRand(), buried: true, rise: 0 }); // (see CONFIG.battle.mineRise)
      }
    }
    // pelotons: cyclists two abreast along the kerb of the player's side, waiting to set off (or, dir -1,
    // along the far kerb, to ride towards the player)
    for (const p of LEVEL.pelotons || []) {
      const P = CONFIG.peloton, dir = p.dir === -1 ? -1 : 1;
      for (let i = 0; i < p.count; i++) {
        const s = Track.place(p) - dir * Math.floor(i / 2) * P.spacing, row = i % 2; // (the bunch trailing back the way it rides from)
        const ride = { s0: s, row, dir, speed: p.speed || P.speed, trigger: p.trigger || P.trigger, on: false, t: Math.random() * 9 };
        add('cyclist', s, kerbLat(ride, s), { ride, face: dir < 0 ? Math.PI : 0 });
      }
    }
    // a parade's marching band: rows of bandsmen across the player's lanes, behind the floats (Traffic puts the
    // floats out: see placeFixed), waiting to step off as the parade does (see CONFIG.parade)
    (LEVEL.parades || []).forEach((p, id) => {
      const P = CONFIG.parade, s0 = Track.place(p), [first, last] = Track.laneRange(1, s0);
      const lo = Track.laneOffset(first, s0) - CONFIG.laneWidth / 2 + 0.6, hi = Track.laneOffset(last, s0) + CONFIG.laneWidth / 2 - 0.6;
      const across = Math.max(2, Math.round((hi - lo) / 1.4) + 1);
      for (let row = 0; row < P.rows; row++) {
        for (let k = 0; k < across; k++) {
          const s = s0 - CONFIG.vehicles.float.hl - P.gapBehind - row * P.spacing;
          add('marcher', s, lo + (hi - lo) * k / (across - 1), { march: { id, s0: s, start: s0 - P.trigger, speed: p.speed || P.speed, on: false, t: Math.random() * 9 } });
        }
      }
    });
    // falling cargo: a pool of loose loads, out of play ("gone") until a shedding truck drops one (see Cargo)
    if (Object.keys(LEVEL.traffic || {}).some(k => CONFIG.vehicles[k]?.sheds) || (LEVEL.trafficZones || []).some(z => Object.keys(z.traffic).some(k => CONFIG.vehicles[k]?.sheds))) {
      const kinds = CONFIG.cargo.kinds;
      for (let i = 0; i < CONFIG.cargo.pool; i++) add(kinds[i % kinds.length], 0, 0, { cargo: true, gone: true, slide: 0 });
    }
    for (const z of LEVEL.dropBears || []) { // (each somewhere in its stretch, anywhere across the road)
      for (let i = 0; i < (z.count || 3); i++) {
        const s = Track.place({ s: z.from + Math.random() * (z.to - z.from), road: z.road, exit: z.exit });
        const o = { s, hw: 0.6, hl: 0.6, height: 1, kind: 'dropBear' };
        add('dropBear', s, anywhereAcross(o, s), { h: CONFIG.dropBear.height, fall: 0, near: 0 });
      }
    }
    // the migration: a great herd spread over its stretch and out either side, all streaming across
    // the road one way (dir, -1 or 1: towards +lat), each at its own pace, and round again
    // the dancing portaloos: rows of them across the road, moving together in one of their dances
    // (pattern), each a step of `period` s: 'hop' (all up and down together), 'wave' (up and down
    // in turn, across the row), 'slide' (the row sliding side to side), 'shuffle' (every other one
    // sliding the other way, through its neighbours), 'stomp' (hopping a lane over at every hop,
    // and back), 'spin' (the row turning round its middle like a propeller)
    (LEVEL.potties || []).forEach((row, r) => {
      const s = Track.place(row);
      row.lanes.forEach((lane, k) => {
        add('potty', s, Track.laneOffset(lane, s), { dance: row.pattern, row: r, k, count: row.lanes.length, s0: s,
          lat0: Track.laneOffset(lane, s), mid: (Track.laneOffset(row.lanes[0], s) + Track.laneOffset(row.lanes[row.lanes.length - 1], s)) / 2,
          period: row.period || CONFIG.potties.period, phase: row.phase || 0 });
      });
    });
    // the site works' moving obstacles: a barrow for each worker, and pipes waiting on each stack
    // (out of play, "gone", until one rolls off: see Site)
    for (const w of LEVEL.siteWorks || []) {
      const side = w.side === 'left' ? -1 : 1;
      if (w.kind === 'workers') {
        for (let i = 0; i < (w.count || 1); i++) {
          const s = w.from + (w.to - w.from) * (i + 0.5) / (w.count || 1);
          add('barrow', s, Track.shoulderOffset(side, s), { walk: { from: w.from, to: w.to, side, dir: 1, dive: -1, s0: s } });
        }
      } else if (w.kind === 'pipes') {
        for (let i = 0; i < 2; i++) add('pipe', w.s, 0, { roll: { stack: null, at: w.s, side, dir: -side } });
      }
    }
    for (const z of LEVEL.migration || []) {
      const kinds = Object.entries(z.kinds || { wildebeest: 1 });
      const total = kinds.reduce((sum, [, share]) => sum + share, 0);
      for (let i = 0; i < z.count; i++) {
        let r = Math.random() * total, kind = kinds[0][0];
        for (const [k, share] of kinds) if ((r -= share) < 0) { kind = k; break; }
        const s = Track.place({ s: z.from + Math.random() * (z.to - z.from), road: z.road, exit: z.exit }), M = CONFIG.migration;
        const lat0 = Track.lo(s) - M.beyond + Math.random() * (Track.hi(s) - Track.lo(s) + 2 * M.beyond);
        add(kind, s, lat0, { yaw: Math.PI / 2, migrate: z.dir || 1, lat0, speed: M.speed.min + Math.random() * (M.speed.max - M.speed.min), hop: Math.random() * 9 });
      }
    }
    for (const z of LEVEL.herds || []) {
      // a cow walks across the road, so its hitbox lies across it too
      // (stay: true, a herd that never leaves the road: it turns back at the lane lines, and never rests)
      for (let i = 0; i < (z.count || 3); i++) add(z.kind || 'cow', 0, 0, { ...stretch(z), yaw: Math.PI / 2, dir: 1, rest: 0, stay: !!z.stay });
    }
    // (seeded, so every drifter moves the same way every run)
    let driftSeed = 2654435761;
    const driftRand = () => {
      driftSeed = (driftSeed + 0x6D2B79F5) >>> 0;
      let x = Math.imul(driftSeed ^ (driftSeed >>> 15), 1 | driftSeed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    for (const z of LEVEL.drifters || []) {
      // each has a centre of its own along the stretch, spaced out, with the pattern's
      // reach along the road kept inside the stretch, and a rhythm of its own: its own
      // pace, and a second, unrelated wobble on top, so no two move quite alike
      const { from, to } = stretch(z), count = z.count || 4, kind = themed(z.kind || 'cone', true);
      const reach = Math.max(CONFIG.drifters.circleRadius, CONFIG.drifters.eightLength) + 5;
      for (let i = 0; i < count; i++) {
        const centre = from + reach + (count > 1 ? i / (count - 1) : 0.5) * (to - from - 2 * reach);
        if (z.pattern === 'dart') { // (anywhere across, roaming its share of the stretch)
          const D = CONFIG.drifters, s = clamp(centre, from + D.dartReach, to - D.dartReach);
          add(kind, s, 0, { drift: 'dart', time: 0, homeS: s, homeLat: 0, along: D.dartReach, across: Infinity, from, to });
          continue;
        }
        add(kind, centre, 0, { from, to, drift: z.pattern || 'circle', centre, time: 0,
          phase: driftRand() * Math.PI * 2, phase2: driftRand() * Math.PI * 2,
          pace: 0.7 + driftRand() * 0.6, pace2: 1.37 + driftRand() * 0.9, // (the second never a multiple of the first)
          spin: kind === 'wreck' ? CONFIG.drifters.wreckSpin * (driftRand() < 0.5 ? -1 : 1) * (0.6 + driftRand() * 0.8) : 0 });
      }
    }
    (LEVEL.asteroidFields || []).forEach((z, k) => {
      // seeded, so a field is laid out the same way every run
      let seed = ((z.seed || 1) * 7919 + k * 104729) >>> 0;
      const rand = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
      const { from, to } = stretch(z);
      const resting = []; // rocks sitting still on the road
      // would a rock here still leave a car-sized gap across the road, shoulders included?
      const leavesGap = (s, lat, r) => {
        const spans = [[lat - r, lat + r]];
        for (const o of resting) if (Math.abs(o.s - s) < o.r + r + 8) spans.push([o.lat - o.r, o.lat + o.r]);
        spans.sort((a, b) => a[0] - b[0]);
        let edge = Track.lo(s), widest = 0;
        for (const [a, b] of spans) {
          widest = Math.max(widest, a - edge);
          edge = Math.max(edge, b);
        }
        return Math.max(widest, Track.hi(s) - edge) >= 5;
      };
      for (let i = 0; i < z.count; i++) {
        const s = from + rand() * (to - from);
        // mostly small, but some are massive: up to five lanes across
        const r = 0.8 + Math.pow(rand(), 2.5) * (CONFIG.laneWidth * 2.5 - 0.8);
        const lat = Track.lo(s) + rand() * (Track.hi(s) - Track.lo(s));
        const moves = rand() < (z.moving === undefined ? 0.5 : z.moving);
        // on the road, or just off its level. One that would leave no way past the rocks
        // already sitting there is put off the road's level instead.
        const onRoad = rand() < (z.onRoad === undefined ? 0.55 : z.onRoad) && (moves || leavesGap(s, lat, r));
        // Telling which is which is meant to be hard. A rock on the road sits anywhere from
        // mostly sunk below it to mostly proud of it; one off the road only just clears it,
        // usually skimming under the track, sometimes passing just over the car.
        const clear = 0.3 + rand() * 2.2;
        const h0 = onRoad ? r * (-0.6 + rand() * 1.4) : rand() < 0.7 ? -r - clear : 2.2 + r + clear;
        const extra = { r, hw: r * 0.85, hl: r * 0.85, height: r * 2, lat0: lat, h0, h: h0,
          vLat: 0, bob: 0, period: 1, phase: 0, time: 0, spin: 0.2 + rand() * 0.8 };
        if (moves) {
          if (rand() < 0.5) extra.vLat = (rand() < 0.5 ? -1 : 1) * (2 + rand() * 4); // drifts across
          else { // bobs up and down, through road level
            extra.bob = 3 + rand() * 5;
            extra.period = 3 + rand() * 3;
            extra.phase = rand() * Math.PI * 2;
          }
        }
        add('asteroid', s, lat, extra);
        if (onRoad && !moves) resting.push({ s, lat, r });
      }
    });
    resetObstacles();
  };
  const anywhereAcross = (o, s) => {
    const lo = Track.lo(s) + o.hl, hi = Track.hi(s) - o.hl;
    return lo + Math.random() * (hi - lo);
  };
  // puts a drifter where its pattern has it at o.time, facing the way it is moving. The
  // pattern runs at the drifter's own pace, with its own slower wobble laid over it, both
  // along and across the road, so the path never quite repeats.
  // a darting drifter (see CONFIG.drifters): sitting, shivering, or darting, `dt` s on
  const between = (r) => r.min + Math.random() * (r.max - r.min);
  const dartOn = (o, dt) => {
    const D = CONFIG.drifters, ease = (u) => u * u * (3 - 2 * u);
    const lo = (s) => Track.lo(s) + o.hw, hi = (s) => Track.hi(s) - o.hw;
    if (o.time === 0 || o.wait === undefined) { // (at the start: at home, sitting, each for its own while)
      o.restS = o.s = o.homeS;
      o.restLat = o.lat = clamp(o.homeLat, lo(o.s), hi(o.s));
      o.wait = between(D.dartRest) * (0.3 + Math.random());
      o.dart = null;
      return;
    }
    if (o.dart) { // darting: quick off the mark, slowing into where it stops
      const d = o.dart;
      d.u = Math.min(1, d.u + dt / d.time);
      o.s = d.s0 + (d.s1 - d.s0) * ease(d.u);
      o.lat = clamp(d.lat0 + (d.lat1 - d.lat0) * ease(d.u), lo(o.s), hi(o.s));
      if (d.u >= 1) {
        o.dart = null;
        o.restS = o.s;
        o.restLat = o.lat;
        o.wait = between(D.dartRest);
      }
      return;
    }
    o.wait -= dt;
    // the shiver, just before it goes
    o.lat = clamp(o.restLat + (o.wait < D.dartShiver ? 0.15 * Math.sin(o.time * 60) : 0), lo(o.s), hi(o.s));
    if (o.wait > 0) return;
    // off: anywhere within its reach of home, a long way or a short one (but never just a twitch)
    let s1, lat1, far = 0;
    for (let k = 0; k < 8 && far < D.dartMin; k++) {
      s1 = o.homeS + (Math.random() * 2 - 1) * o.along;
      if (o.from !== undefined) s1 = clamp(s1, o.from + o.hl, o.to - o.hl);
      lat1 = clamp(o.across === Infinity ? lo(s1) + Math.random() * (hi(s1) - lo(s1)) : o.homeLat + (Math.random() * 2 - 1) * o.across, lo(s1), hi(s1));
      far = Math.hypot(s1 - o.restS, lat1 - o.restLat);
    }
    o.dart = { s0: o.restS, lat0: o.restLat, s1, lat1, u: 0, time: Math.max(0.2, 1.5 * far / between(D.dartSpeed)) };
    if (far > 0.5) o.face = Math.atan2(lat1 - o.restLat, s1 - o.restS);
  };
  const driftTo = (o) => {
    const D = CONFIG.drifters, t = o.time * o.pace, p = o.phase;
    const wobble = D.wobble * Math.sin(o.time * o.pace2 + o.phase2);     // -wobble .. wobble
    const wobbleS = D.wobble * Math.sin(o.time * o.pace2 * 0.61 + o.phase2);
    let s = o.centre, across = 0; // across: -1 .. 1 of the road's reach either side of the centre
    if (o.drift === 'circle') {
      s += D.circleRadius * (1 - D.wobble + wobbleS) * Math.cos(t * D.circleRate + p);
      across = Math.sin(t * D.circleRate + p) + wobble;
    } else if (o.drift === 'zigzag') { // up and down the stretch, turning back at each end, weaving
      const span = o.to - o.from, u = (o.centre - o.from + D.zigzagSpeed * t) % (2 * span);
      s = o.from + (u < span ? u : 2 * span - u);
      across = Math.sin(t * D.zigzagRate + p) + wobble;
    } else if (o.drift === 'sweep') {
      across = Math.sin(t * D.sweepRate + p) + wobble;
      s += D.circleRadius * wobbleS;
    } else if (o.drift === 'figure8') {
      s += D.eightLength * (1 - D.wobble + wobbleS) * Math.sin(t * D.eightRate + p);
      across = Math.sin(2 * (t * D.eightRate + p)) + wobble;
    }
    s = clamp(s, o.from + o.hl, o.to - o.hl);
    const lo = Track.lo(s) + o.hl, hi = Track.hi(s) - o.hl;
    const lat = (lo + hi) / 2 + clamp(across, -1, 1) * (hi - lo) / 2 * D.across;
    if (o.time > 0 && !o.spin) o.face = Math.atan2(lat - o.lat, s - o.s);
    if (o.spin) o.face = o.yaw = o.time * o.spin; // (a wreck spins on the spot, hitbox and all)
    o.s = s;
    o.lat = lat;
  };
  const updateObstacles = (dt) => {
    if (Traffic.frozen) return; // (TRAFFIC FREEZE, a mystery: nothing moves but the player; see mysteries.js)
    for (const o of obstacles) {
      if (o.gone || o.hazard) continue; // (a hazard's is moved by Hazards)
      if (o.kind === 'landmine') { // (buried until the player is near, then popping up out of the dirt)
        const R = CONFIG.battle.mineRise;
        if (o.buried && (o.s - Player.s) * Player.dir < R.ahead) o.buried = false;
        if (!o.buried) o.rise = Math.min(1, o.rise + dt / R.time);
        continue;
      }
      if (o.kind === 'frog') {
        if (o.t < 1) { // mid-hop
          o.t = Math.min(1, o.t + dt / CONFIG.frogHopTime);
          o.s = o.fromS + (o.toS - o.fromS) * o.t;
          o.lat = o.fromLat + (o.toLat - o.fromLat) * o.t;
          o.h = CONFIG.frogHopHeight * 4 * o.t * (1 - o.t);
        } else if ((o.rest -= dt) <= 0) { // sat long enough: hop to anywhere on the road nearby
          o.rest = CONFIG.frogRestMin + Math.random() * (CONFIG.frogRestMax - CONFIG.frogRestMin);
          o.fromS = o.s;
          o.fromLat = o.lat;
          o.toS = clamp(o.s + (Math.random() - 0.5) * 2 * CONFIG.frogHopMax, o.from, o.to);
          o.toLat = anywhereAcross(o, o.toS);
          o.face = Math.atan2(o.toLat - o.fromLat, o.toS - o.fromS);
          o.t = 0;
        }
      } else if (o.kind === 'dropBear') {
        if (o.h <= 0) continue; // (down, and staying there)
        // the player is near: down it comes. Near is reckoned in time as well as metres: the car covers the fall's
        // distance while the bear is in the air, so a fast car is dropped on from that much further back
        if (!o.fall && o.s - Player.s > 0 && o.s - Player.s < o.near + Math.max(0, Player.speed) * Math.sqrt(2 * CONFIG.dropBear.height / 9.8)) o.fall = 0.01;
        if (o.fall) {
          o.fall += 9.8 * dt;
          o.h = Math.max(0, o.h - o.fall * dt);
          if (o.h === 0) sfxAt('crash', o.s, 0.6); // (thud)
        }
      } else if (o.kind === 'rock' && !o.loose) { // (a rockfall's: a loose one sits still, or moves as drifters do, below)
        // up the hillside until the player is near: then it tumbles down onto the road, bounding
        // out across it to where it lands (it can only be hit once it is down)
        if (o.h <= 0) continue;
        if (!o.fall && o.s - Player.s > 0 && o.s - Player.s < o.nearAt) {
          o.fall = 0.01;
          sfxAt('crash', o.s, 0.4); // (the crack as it comes away)
        }
        if (o.fall) {
          o.fall += 9.8 * dt;
          o.h = Math.max(0, o.h - o.fall * dt);
          const u = 1 - o.h / o.up, edge = o.side < 0 ? Track.lo(o.s) - o.out : Track.hi(o.s) + o.out;
          o.lat = edge + (o.land - edge) * Math.min(1, u * 1.25);
          o.spin = (o.spin || 0) + dt * 6;
          if (o.h === 0) {
            o.lat = o.land;
            sfxAt('crash', o.s, 0.8); // (thud)
            if (Math.abs(o.s - Player.s) < 40) Game.shake = Math.max(Game.shake, 0.5);
          }
        }
      } else if (o.march) { // a bandsman: waiting until the parade steps off, then marching behind the floats
        const m = o.march;
        if (!m.on && Player.s > m.start) m.on = true;
        m.t += dt;
        if (m.on) o.s += m.speed * dt;
        o.h = m.on ? Math.abs(Math.sin(m.t * 5)) * 0.08 : 0; // (the step)
      } else if (o.cargo) { // a load off a truck: sliding on down the road, slowing, until it stops
        if (o.slide > 0.1) {
          o.s += o.slide * dt;
          o.slide = Math.max(0, o.slide - CONFIG.cargo.drag * dt);
          o.face += dt * o.slide * 0.3;
        }
      } else if (o.ride) { // a cyclist: waiting until the player comes near, then riding along by the kerb
        const P = CONFIG.peloton, w = o.ride;
        if (!w.on && w.s0 - Player.s < w.trigger) w.on = true;
        w.t += dt;
        if (w.on) o.s += w.dir * w.speed * dt;
        o.lat = kerbLat(w, o.s) + Math.sin(w.t * 1.7 + w.row) * P.wobble;
        o.face = (w.dir < 0 ? Math.PI : 0) + Math.cos(w.t * 1.7 + w.row) * 0.05;
      } else if (o.kind === 'cow' || o.kind === 'kangaroo') {
        const roo = o.kind === 'kangaroo';
        if (o.rest > 0) { o.rest -= dt; o.h = 0; continue; } // standing at the roadside
        o.lat += o.dir * (roo ? CONFIG.kangarooSpeed : CONFIG.cowSpeed) * dt;
        if (roo) { // (bounding along: up and down, hop after hop)
          o.hop = (o.hop || 0) + dt * CONFIG.kangarooHops;
          o.h = CONFIG.kangarooHop * Math.abs(Math.sin(o.hop * Math.PI));
        }
        o.face = o.dir * Math.PI / 2;
        // (a herd that stays on the road turns back at the lane lines, and doesn't stand about)
        const lo = (o.stay ? Track.laneLo(o.s) : Track.lo(o.s)) + o.hl, hi = (o.stay ? Track.laneHi(o.s) : Track.hi(o.s)) - o.hl;
        if (o.lat > hi || o.lat < lo) { // reached the far side: stand, then head back
          o.lat = clamp(o.lat, lo, hi);
          o.dir = -o.dir;
          o.rest = o.stay ? 0 : CONFIG.cowRestMin + Math.random() * (CONFIG.cowRestMax - CONFIG.cowRestMin);
        }
      } else if (o.dance) {
        danceTo(o, (o.time = (o.time || 0) + dt));
      } else if (o.migrate) { // streaming across with the herd, galloping, and round again
        const M = CONFIG.migration;
        o.lat += o.migrate * o.speed * dt;
        o.hop += dt * M.hops;
        o.h = M.hop * Math.abs(Math.sin(o.hop * Math.PI));
        o.face = o.migrate * Math.PI / 2;
        const lo = Track.lo(o.s) - M.beyond, hi = Track.hi(o.s) + M.beyond;
        if (o.lat > hi) o.lat -= hi - lo;
        if (o.lat < lo) o.lat += hi - lo;
      } else if (o.drift === 'dart') {
        o.time += dt;
        dartOn(o, dt);
      } else if (o.drift) {
        o.time += dt;
        driftTo(o);
      } else if (o.kind === 'asteroid') {
        o.time += dt;
        o.h = o.h0 + o.bob * Math.sin(o.time / o.period * Math.PI * 2 + o.phase);
        if (o.vLat) { // drifts across the road and a little beyond, then back
          o.lat += o.dir * o.vLat * dt;
          const lo = Track.lo(o.s) - 4, hi = Track.hi(o.s) + 4;
          if (o.lat > hi || o.lat < lo) {
            o.lat = clamp(o.lat, lo, hi);
            o.dir = -o.dir;
          }
        }
      }
    }
  };

  // landmines: traffic pays them no heed (it never steers round one), and one that drives onto a mine is
  // destroyed outright, as the player's car is, and the mine with it
  const trafficMines = () => {
    for (const o of obstacles) {
      if (o.gone || o.kind !== 'landmine' || o.buried) continue;
      for (const car of Traffic.cars) {
        if (!car.active || car.junction || car.health <= 0 || Math.abs(car.s - o.s) > car.hl + o.hl || !overlap(car, o)) continue;
        car.health = 0;
        o.gone = true;
        FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: 0, big: false, sound: 'none' });
        break;
      }
    }
  };
  // an asteroid can only be hit while some of it is at the height of the car
  const atRoadLevel = (o) => o.h - o.r < Player.height && o.h + o.r > 0;

  const hitObstacles = () => {
    if (!Player.active || Player.shield > 0 || Player.ghost > 0) return;
    for (const o of obstacles) {
      if (o.gone || Math.abs(o.s - Player.s) > CONFIG.broadPhaseDistance) continue;
      if (o.kind === 'asteroid' && !atRoadLevel(o)) continue; // it passes over or under the car
      if ((o.kind === 'dropBear' || o.kind === 'rock') && o.h > Player.height) continue; // (still up in its tree, or falling)
      if (o.dance && o.h > Player.height) continue; // (a portaloo up in the air: the car goes underneath)
      if (o.buried) continue; // (a landmine not yet up out of the dirt)
      if (Player.air > o.h + o.height) continue; // (the car in the air, clear over the top of it: see Gambles)
      if (!overlap(Player, o)) continue;
      if (o.kind === 'landmine') { // (a landmine: the car is destroyed outright, whatever it is, and the mine is gone)
        o.gone = true;
        Player.health = 0;
        FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: 0, big: true });
        continue;
      }
      if (o.knock) { // (a wide load or its escort: a knock, not a wreck. It is still there, and the car is put clear of it)
        const cost = CONFIG.obstacleKinds[o.kind], side = Player.lat < o.lat ? -1 : 1, beside = o.lat + side * (o.hw + Player.hw + 0.05);
        const behind = Player.s < o.s - o.hl + 0.5 || beside < Track.lo(Player.s) + Player.hw || beside > Track.hi(Player.s) - Player.hw; // (run into its tail; or no room beside it)
        if (behind) {
          Player.s = Math.min(Player.s, o.s - o.hl - Player.hl - 0.05);
          Player.speed = Math.min(Player.speed * cost.speedKept, o.vs ?? 0);
        } else { // (alongside: shoved out sideways)
          Player.lat = beside;
          Player.latVel = side * 2;
          Player.speed *= o.knocked > 0 ? 1 : cost.sideKept;
        }
        if (!(o.knocked > 0)) {
          if (Player.tank <= 0) { hurt(Player, behind ? cost.damage : cost.sideDamage); Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.3); }
          Game.shake = Math.max(Game.shake, behind ? 0.8 : 0.4);
          sfx(behind ? 'crash' : 'sideswipe', 0.8);
        }
        o.knocked = 0.8; // (s before another knock from it costs anything: Hazards counts it down)
        continue;
      }
      // any touch blows the obstacle up: the car is damaged and loses speed, but drives on
      o.gone = true;
      if ((o.kind === 'rock' || o.kind === 'lavaRock') && CAR.trait === 'rocks') { // (the 6x6 ignores rockfall: the rock is smashed aside, at no cost)
        Game.shake = Math.max(Game.shake, 0.3);
        FxQueue.push({ type: 'explode', s: o.s, lat: o.lat, vs: Player.speed, big: false, scale: 0.6, smoke: 0.4 });
        continue;
      }
      const cost = CONFIG.obstacleKinds[o.kind];
      if (Player.tank <= 0) { // a tank just flattens it
        // (a bigger rock hurts more, up to a limit)
        hurt(Player, o.kind === 'asteroid' ? Math.min(cost.maxDamage, cost.damage * o.r) : cost.damage);
        Player.speed *= cost.speedKept;
        if (!cost.light) Player.stun = Math.max(Player.stun, CONFIG.stunTime * 0.5);
      }
      Game.shake = Math.max(Game.shake, cost.light ? 0.3 : 1);
      // (a cyclist goes up on its own, small, its wheels flying: the rest of the bunch rides on)
      FxQueue.push(o.ride ? { type: 'explode', s: o.s, lat: o.lat, vs: Player.speed, big: false, scale: 0.55, smoke: 0.5, tyres: true }
        : { type: 'explode', s: o.s, lat: o.lat, vs: Player.speed, big: false });
      if ((o.kind === 'cyclist' || o.kind === 'runner' || o.kind === 'marcher') && Traffic.policeNear()) Player.bust(o.kind === 'marcher' ? 'cyclist' : o.kind); // (knocking a cyclist off, or a runner/bandsman down, in front of the police)
    }
  };
  // a dancing portaloo, `t` s into its row's dance (every one in a row keeps time with the rest)
  const smooth01 = (u) => u * u * (3 - 2 * u);
  const danceTo = (o, t) => {
    const P = CONFIG.potties, step = (t / o.period + o.phase), u = step - Math.floor(step), n = o.count;
    const up = (w) => P.hop * Math.max(0, Math.sin(Math.PI * 2 * w)); // (in the air half of each step)
    o.h = 0; o.s = o.s0; o.lat = o.lat0; o.face = 0;
    if (o.dance === 'hop') o.h = up(step);
    else if (o.dance === 'wave') o.h = up(step - o.k / n * 0.5);
    else if (o.dance === 'slide') o.lat = o.lat0 + P.slide * Math.sin(Math.PI * 2 * step);
    else if (o.dance === 'shuffle') o.lat = o.lat0 + (o.k % 2 ? -1 : 1) * P.slide * Math.sin(Math.PI * 2 * step);
    else if (o.dance === 'stomp') { // a hop a step, landing a lane over, then back the other way
      const lanes = [-1, 0, 1, 0], at = Math.floor(step) % 4, next = (at + 1) % 4;
      o.h = P.hop * 0.7 * Math.sin(Math.PI * u);
      o.lat = o.lat0 + P.slide * (lanes[at] + (lanes[next] - lanes[at]) * smooth01(u));
    } else if (o.dance === 'spin') { // the row turning round its middle
      const a = Math.PI * 2 * step / 4, r = o.lat0 - o.mid;
      o.lat = o.mid + r * Math.cos(a);
      o.s = o.s0 + r * Math.sin(a);
      o.face = -a;
    }
    // (it lands with a thud, near the player)
    const landed = o.h === 0 && (o.wasUp || 0) > 0.5;
    o.wasUp = o.h;
    if (landed && o.k === 0 && Math.abs(o.s - Player.s) < 80) sfxAt('crash', o.s, 0.4);
  };
  // back to how the level starts: everything standing, the movers somewhere in their stretches
  const resetObstacles = () => {
    // (and the contacts of the run before forgotten: check() leaves these on whatever it touched, the player too)
    tick = 0;
    Player.sideTick = Player.hitBy = Player.hitAt = undefined;
    for (const o of obstacles) {
      o.gone = false;
      if (o.dance) { // back to the start of its dance
        o.time = 0;
        danceTo(o, 0);
        continue;
      }
      if (o.walk) { // a worker back at work with its barrow
        Object.assign(o.walk, { dive: -1, dir: 1 });
        o.s = o.walk.s0;
        o.lat = Track.shoulderOffset(o.walk.side, o.s);
        continue;
      }
      if (o.roll) { // a pipe back on its stack
        o.gone = true;
        continue;
      }
      if (o.kind === 'dropBear') { // back up its tree, to drop when the player is near (somewhere new each time)
        o.h = CONFIG.dropBear.height;
        o.fall = 0;
        o.near = CONFIG.dropBear.near.min + Math.random() * (CONFIG.dropBear.near.max - CONFIG.dropBear.near.min);
        continue;
      }
      if (o.kind === 'rock' && !o.loose) { // back up the hillside (or wherever its stretch has it wait)
        o.h = o.up;
        o.fall = 0;
        o.spin = 0;
        o.lat = o.side < 0 ? Track.lo(o.s) - o.out : Track.hi(o.s) + o.out;
        continue;
      }
      if (o.ride) { // a cyclist back where its peloton waits
        o.s = o.ride.s0;
        o.ride.on = false;
        o.lat = kerbLat(o.ride, o.s);
        continue;
      }
      if (o.march) { // a bandsman back in his row behind the floats
        o.s = o.march.s0;
        o.march.on = false;
        o.h = 0;
        continue;
      }
      if (o.cargo) { // a load back on its truck, so to speak
        o.gone = true;
        o.slide = 0;
        continue;
      }
      if (o.migrate) { // back to where it started out in the herd
        o.lat = o.lat0;
        continue;
      }
      if (o.kind === 'asteroid' && !o.loose) { // back to where the field put it
        o.lat = o.lat0;
        o.h = o.h0;
        o.time = 0;
        o.dir = 1;
        continue;
      }
      if (o.drift) { // back to the start of its pattern
        o.time = 0;
        o.face = 0;
        if (o.drift === 'dart') dartOn(o, 0);
        else driftTo(o);
        continue;
      }
      if (o.from === undefined || o.hazard) continue; // barriers and bales stay where they were put (a hazard's: see Hazards.reset)
      o.s = o.from + Math.random() * (o.to - o.from);
      o.dir = Math.random() < 0.5 ? 1 : -1;
      o.h = 0;
      o.lat = anywhereAcross(o, o.s);
      o.rest = Math.random() * 1.2;
      o.t = 1;
    }
  };

  const check = () => {
    tick++;
    const bodies = getBodies();
    // a ghost only turns solid again once it is clear of every car
    if (Player.active && Player.ghost > 0 && Player.ghost < 0.2) {
      for (const car of Traffic.cars) {
        if (car.active && Math.abs(car.s - Player.s) < CONFIG.broadPhaseDistance && overlap(Player, car)) {
          Player.ghost = 0.2;
          break;
        }
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      // (a freshly dropped or ghosted player, a car being arrested, or one off the road at a junction)
      if (!a.active || a.shield > 0 || a.ghost > 0 || a.arrest >= 0 || a.junction) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.active || b.shield > 0 || b.arrest >= 0 || b.junction) continue; // (a racer just set down: untouchable)
        // broad phase: nearby along the track and within neighbouring lanes
        if (Math.abs(b.s - a.s) > CONFIG.broadPhaseDistance ||
            Math.abs(b.lat - a.lat) > CONFIG.laneWidth * 1.5) continue;
        if (a.isPlayer && a.air > b.height) continue; // (the player's car in the air, clear over the top of it: see Gambles)
        if (overlap(a, b)) {
          resolve(a, b);
          // (the player crashing into a funeral procession: all of it is furious: see Traffic.mourn)
          if (a.isPlayer && b.procession) Traffic.mourn(b.procession);
          else if (b.isPlayer && a.procession) Traffic.mourn(a.procession);
        }
      }
    }
    hitObstacles();
    trafficMines();
    // anything out of health blows up (the explosion itself hurts nobody)
    for (const v of bodies) {
      if (!v.active || v.health > 0) continue;
      v.active = false;
      FxQueue.push({ type: 'explode', s: v.s, lat: v.lat, vs: v.vs, big: v.mass > 1, tyres: !v.toad });
      Traffic.noteWreck(v); // (the traffic slows to look: see Traffic's rubbernecking)
      if (v.wreckedByPlayer) Message.say('wrecks', 'byPlayer'); // (one of the player's packages did it)
      // (the player's doing, by a package or by a hit just now: the evil drivers about may cheer)
      if (!v.isPlayer && (v.wreckedByPlayer || (v.hitBy && v.hitBy.isPlayer && Game.time - v.hitAt < 3))) Traffic.wreckedByPlayer(v);
    }
  };

  return { get bodies() { return getBodies(); }, obstacles, loaders, loadLevel, resetObstacles, updateObstacles, atRoadLevel, check, overlap, size: SIZE };
})();
