// ============================================================================
// CONFIG
// ============================================================================
export const CONFIG = {
  // road
  laneCount: 4,            // lanes on the expressway, half each way (a level can set its own with "lanes",
                           // and have a "median": see levels.js)
  laneWidth: 3.5,          // metres
  shoulder: 3.5,           // driveable shoulder outside the outer lanes, no traffic there

  // road features: sizes shared by every level (where they are is in LEVELS)
  taper: 90,               // length of each narrowing / widening
  runoffEase: 25,          // m a stretch of run-off (a level's "runoff") eases in and out over
  gradeEase: 60,           // m each way over which one slope is blended into the next (crests and dips)
  bridgeWallInset: 0.4,    // gap between the outer lane line and a bridge's structure
  ramps: {                 // exits, merges and their flyovers (an exit's "flyovers": true)
    laneZone: 180,         // m of exit lane before an exit / merge lane after a merge: an extra lane
                           // outside the expressway's right-hand lane, with the shoulder beyond it
    gore: 50,              // m over which that lane opens at the start of the exit zone, and over which
                           // the expressway's pavement blends with the side road's at each fork
    ramp: 110,             // m at each end of a side road that is a single-lane ramp
    apart: 14,             // m between the expressway's lanes and a side road's, at the least, once they have parted...
    part: 120,             // ... which they do over this many m from the fork (and to the merge)
    partEase: 25,          // m each way over which whatever moves a side road out to keep that gap is evened out
    dropLine: {            // the lane-drop line between the through lane and an exit or merge lane:
      length: 1.5,         // m each of its dashes is long (a lane line's are CONFIG.dashLength) ...
      spacing: 3.5,        // ... one every this many m ...
      width: 0.3,          // ... and this wide: short, fat and close together
      from: 0.12,          // drawn where that much of the lane's width is open (0 .. 1)
    },
    nose: {                // the hatched wedge between the two roads' solid lines at a fork (and a merge):
      reach: 90,           // m from its tip it is looked for over
      from: 0.9,           // m apart the lines are where the first chevron stands
      every: 4.5,          // m from one chevron to the next
      thick: 0.9,          // m thick each chevron's arms are, along the road
      sweep: 1.6,          // how far its arms sweep back: this many times half the wedge's width
      inset: 0.3,          // m its arms stop short of the solid lines
    },
    laneTaper: 60,         // m over which a side road widens or narrows by its exit's "lanes"
    shapeLead: 130,        // m at each end of a side road an exit's own shape ("out", "bends") leaves alone...
    shapeEase: 120,        // ...and m beyond that it eases in over
    tightest: 35,          // m: the tightest a side road's bend may be (its radius)
    gradeEase: 30,         // m over which a side road's slope is evened out, where it has left the expressway (on hills)
    level: 30,             // m out from the expressway's pavement within which a side road is exactly as high as it
    steepest: 0.06,        // the steepest a side road climbs or falls where it has left the expressway (rise per metre)
    verge: 4,              // m of land of its own along a side road's left edge on hills, and (up to) ...
    land: 130,             // ... along its right: the land beside it, at its height, with a bank down to the ground
    clear: 1.5,            // m of verge beside every road's pavement that another road's scenery is kept off, whatever it is...
    clearBuilding: 2,      // ...and m more for a building
    flyoverLength: 360,
    flyoverHeight: 7,
    trafficShare: 0.45,    // share of traffic that takes a side road
    sideOncoming: 4,       // on a one-way level, the cars coming the other way along a side road that has oncoming traffic
  },

  // shoulder policing
  dangerTime: 3,           // s of shoulder driving allowed before the police step in
  dangerCooldown: 0.75,    // s of allowance regained per second back in the lanes
  dangerBeepSlow: 0.45,    // s between the meter's beeps on first touching the shoulder...
  dangerBeepFast: 0.06,    // ...and just before the bust (the beeps speed up in between)
  dangerBeepPitch: 330,    // Hz of the beep (only until the Danger Timer WAV has loaded)
  policeApproachTime: 2.5, // s a busted car keeps driving, slowing, before it is grabbed
  policeCrawlSpeed: 8,     // m/s it is slowed to in that time
  policeHoldTime: 4,       // s from being grabbed to being dropped back in a lane

  // speed (m/s): hold accelerate / brake to change it, release and it holds. minSpeed: the slowest it rolls
  // along by itself; held, the brake brings it to a stop, but not on a lapped circuit (see Player.updateSpeed)
  minSpeed: 7,

  // turbocharger pickups: fixed spots on the track that raise the top speed for a while
  turboBoost: 16,          // m/s added to the car's own top speed (the same for every car)
  turboAccel: 22,          // m/s^2, the turbo pulls up to its top speed on its own
  turboTime: 10,           // s
  ghostTime: 10,           // s the car is see-through and passes through cars and barriers
                           // (the bridge structure and package splashes still get you)
  wrenchRepair: 0.25,      // share of full health restored
  passengerTime: 12,       // s of shoulder driving without running the police meter down
  // the siren: traffic ahead in the player's lane pulls over to its right: a lane over, or onto
  // the shoulder (the only time traffic uses one), never into the oncoming lanes
  sirenPickup: { time: 15, range: 80, pulledOverPace: 0.5, // s; m ahead; share of its speed a car keeps on the shoulder
    arrestTime: 4 },       // s a police helicopter takes to carry off a car that hurt the player under a siren
  radarTime: 15,           // s of a radar detector: no bust can start (the shoulder meter still runs,
                           // and if it is full when the detector stops, that is a bust)
  // bad gas: a can of cheap fuel that leaves the car crawling
  badGas: { time: 10, topSpeed: 0.5, accel: 0.25 }, // s; shares of the car's own top speed and acceleration
  // a 1000 lb weight in the boot: slower, duller and harder to steer, but it wins every shove.
  // Its mass is the player's in collisions (a car is 1, a bus 4): the damage of a crash is split
  // by mass, and the player is knocked about (stunned) that much less
  heavyMass: { time: 12, mass: 5, topSpeed: 0.75, accel: 0.4, agility: 0.55,
    pushShare: 0.04 },     // share of any push the player takes, even running into the back of something
  armour: { time: 12, damage: 0.5 },       // s; the share of any damage the car takes while armoured
  // Big Splash: for `time` s the player's packages catch every car within `radius` m of where they hit
  // or land, and hit harder: a flaming one does fireDamage; a gift giftDamage, or, to an evil driver,
  // 1 damage giftDamage times over, one every peltEvery s (each a chance of a critical hit)
  bigSplash: { time: 12, radius: 8, fireDamage: 45, giftDamage: 7, peltEvery: 0.05,
    gun: { damage: 2, splash: 1.6, scale: 1.4 } }, // (and a gun's shell, the Battlefield 8x8's: times the damage, the splash's reach, the blast's size)
  butterfingers: { time: 10 },             // s the player can't throw
  cashPickup: { cash5: 5, cash10: 10, cash20: 20 }, // $ a cash pickup is worth: banked with the tip on delivery
  timePickup: 10,          // s a stopwatch puts on the clock (time plus) or takes off it (time minus);
                           // in the tip countdown it moves that too. Instant: the powerup running carries on
  powerUpWarning: 4,       // s before a turbo, ghost, passenger or mystery runs out that its warning sound
                           // starts, and the sign of it on the car starts to blink
                           // (only one of those runs at a time: a new one replaces it)
  // the mystery pickup: one of these effects at random (see Player.startMystery); the wording
  // is in messages.json, under powerups.mystery
  mystery: {
    // (the last eight are the second batch: see mysteries.js, and below)
    effects: ['rickety', 'toad', 'angel', 'jerk', 'invincible', 'noBrakes', 'insuranceUp', 'insuranceDown', 'ufo', 'bulletTrain',
      'soupedUp', 'earthquake', 'rewind', 'giant', 'swapSides', 'magnet', 'blackout', 'trafficFreeze'],
    //   soupedUp       the player's car is swapped for its Super version (cars.js superOf) for soupedUp.time s
    //   earthquake     the road ripples: everything bobs, and every car is bounced into the lane beside it
    //   rewind         ten seconds back, clock and all (over at once)
    //   giant          the car twice its size, crushing any traffic it touches
    //   swapSides      Good turns Evil, or Evil Good, for a while
    //   magnet         pickups ahead drift toward the car
    //   blackout       every light off but the headlights
    //   trafficFreeze  everything but the player stops dead
    // (one with a `time` of its own lasts that long instead of `time` below. One that doesn't suit the level is `fallback`
    // instead. Souped up, in a car with no Super version, upgrades nothing and says so: messages.json soupedUpNone)
    fallback: 'invincible',
    soupedUp: { time: 15 },
    earthquake: { time: 10, every: 3, amp: 0.35, wavelength: 24, speed: 9, shake: 0.35, kick: 3 }, // s; s between bounces; m the road heaves; m of the wave; rad/s; camera shake kept up; m/s a bounced car is shoved
    rewind: { seconds: 10, every: 0.5, flash: 0.6 }, // s back; s between snapshots; s the screen flashes
    giant: { time: 12, scale: 2, step: 6 },  // s; times the car's size; m between footsteps
    magnet: { range: 120, speed: 25 },      // m ahead a pickup is drawn from; m/s it comes at
    blackout: { fog: [3, 42], light: { sky: 0x1a1a28, ground: 0x000000, ambient: 0.3, sun: 0x000000, sunlight: 0 } }, // m the fog starts and ends at; the light left (see render/scene.js applyLight)
    trafficFreeze: { time: 8 },
    // a second pool, not drawn for now: only ?mystery= in the address picks one of these
    //   sundayDrivers  every driver potters along at sundayPace of its speed (not an ambulance, nor a racer)
    //   rushHour       rushHour times the traffic, each way, as far as the pool allows; the extra cars
    //                  turn up at once, and once it is over, each one that goes isn't replaced
    //   carSwap        the player is put in another of the garage's cars at random, and given its own back after
    //   moodSwing      every driver that can be evil swaps sides: good turns evil, evil turns good, and back after
    extraEffects: ['sundayDrivers', 'rushHour', 'carSwap', 'moodSwing'],
    sundayPace: 0.5,
    rushHour: 2,
    time: 12,              // s the lasting ones last (insuranceUp / insuranceDown, ufo and bulletTrain are over at once)
    rickety: 1.5,          // damage the car takes while rickety, against the usual
    toadSpeed: 20 / 3.6,   // m/s every toad goes along at in TOAD RAGE
    toad: { hw: 1.2, hl: 1.4, height: 1.8, mass: 1 }, // a toad's hitbox
    // noBrakes: the car no longer slows for a bend by itself. Taken too fast (past cornering.grip),
    // it understeers wide as on ice (ice.understeer, ice.steerGrip), scrubbing off `scrub` m/s^2 for
    // every m/s^2 of the slide. Holding brake lifts off: it coasts down at `coast` m/s^2. Steering
    // scrubs a little too, up to `steerScrub` m/s^2 at full sideways speed: something to feel
    // before a bend, never a way to stop (far less than lifting off)
    noBrakes: { coast: 3, scrub: 0.3, steerScrub: 0.5 },
  },
  // A Super car (cars.js superOf: the "souped up" mystery, ?car=super-<id>): what it adds to its base car,
  // about two tiers' worth (in CARS a tier adds on average 5.5 m/s, 2 m/s^2 and a fifth more health)
  superCar: { maxSpeed: 10, accel: 4, health: 1.3, agility: 0.15, crossing: 0.1 }, // (health: times; crossing: added, up to 1)
  // UFO AIR STRIKE (a mystery): the saucer's visit, and the burn that follows it
  // Emergency vehicles (a level's "emergencies"): now and then an ambulance comes through with its
  // siren going, either way. One going the player's way sets off behind the player, with a
  // message; one coming the other way just appears up the road. Traffic ahead of it in its lane
  // gives way as it does to the player's siren (a few evil drivers won't). It never runs into
  // anything: it closes up behind whatever is in its way, which then has `giveWay` s to get fully
  // out of its lane, or is arrested (the player is busted). It is traffic like any other (it can
  // be hit, and hit back), except that packages pass over it.
  emergency: {
    speed: 95,             // m/s (342 km/h): second only to the bullet train
    behind: 220,           // m behind the player one going the player's way sets off
    range: 220,            // m ahead of it that traffic in its lane gives way
    reach: 35,             // m: something in its lane this close ahead...
    giveWay: 3,            // ...has this long to get fully out of it
    followGap: 6,          // m it closes up to behind something in its way
    brake: 30,             // m/s^2 it slows at for something in its way
    defiance: 0.05,        // chance an evil driver refuses to give way to it
  },
  // Cornering: in a bend, every car (the player's too) has a lower top speed, the sharper the bend,
  // the heavier the car and the less agile: sqrt(grip x agility / (weight x curvature)). A gentle
  // bend is taken flat out, a hairpin at a crawl. (weight: as on ice, see CONFIG.ice.weightRef)
  cornering: { grip: 22 },   // m/s^2 of cornering a car of weight 1 and agility 1 holds
  // A race (a level's "grid", "understeer", "wallDamage", "nudge": see levels.js). Its understeer is
  // `understeer` times as hard as on ice, and sliding wide scrubs off speed: `scrub` m/s^2 for every
  // m/s^2 of the slide. The cars of the grid take the bends as fast as their nerve
  // allows (the ice's grip x aiGrip: well past the point of sliding wide), slowing late, for the
  // sharpest bend within aiLookout m; their tyres hold aiTyres times the grip before they slide, and
  // they pull away aiPickup times as hard as ordinary traffic; and a car going into a wall at more than wallFrom m/s
  // sideways takes wallDamage health per m/s of it, as it hits
  // A racer wrecked is set back down where it was wrecked respawnTime s later, untouchable for respawnShield s.
  // The slipstream: a car (a racer, or the player) right behind another, within towReach m and
  // overlapping it, has its top speed raised by up to `draft` of it, the more the closer it is; so
  // it can outdrag the car it follows. A racer on a straight with a car up to seekReach m ahead in
  // the lane beside moves over into its tow (every seekEvery s at most), then pulls out to pass.
  // the arrow at the foot of the screen for whoever is behind the player in a race (within raceRange m),
  // or a rival courier (within rivalRange m): slid slidePerM px to the side for every m across, up to
  // slide px; orange when it is within close m
  behind: { raceRange: 150, rivalRange: 400, slidePerM: 14, slide: 140, close: 15 },
  // the marker over a rival courier (see render/emotes.js): its tip `above` m over the car's roof (the mood
  // face pops up from 0.5 to 1.6 m over it), growing in proportion beyond growFrom m from the camera
  rivalMark: { above: 2.1, growFrom: 35 },
  // a level's gang war (see gunfire.js): in its turf, gangShare of the houses are the gang's (marked out:
  // see render/road.js). Each fires across the road from its windows, only within `arc` radians of straight
  // out, at whatever is in that arc within range m (picked at random; only houses within range + seen m
  // of the player fire): `shots` shots, shotGap s apart, at speed
  // m/s, off true by up to spread m; then it waits `every` s. Each hit does `damage`, and punctures a tyre
  // with a chance of `puncture`. A muzzle flash shows for flashTime s
  gunfire: { gangShare: 0.35, arc: 0.52, seen: 80, every: { min: 3, max: 6 }, shots: { min: 4, max: 8 }, shotGap: 0.09, speed: 110,
    spread: 1.4, range: 60, damage: 2, puncture: 0.06, flashTime: 0.06 },
  // a drive-by car (traffic kind 'driveby'): every `every` s, within range m of the player, it picks a target
  // (the player, or a car near it), pulls up alongside it (within alongside m), fires `shots` shots shotGap s
  // apart, then makes its getaway for good at fleePace times its pace, pushing through traffic as a rival courier does
  // (see CONFIG.rival), until it is gone from the road; it gives up the chase after giveUp s
  driveBy: { every: { min: 3, max: 7 }, range: 120, alongside: 2.5, shots: 9, shotGap: 0.11, fleePace: 1.6, giveUp: 14 },
  // a punctured tyre (the player's: see Player.punctureTyre): topSpeed and accel are shares of the car's
  // own; the car pulls to that side at up to pull m/s; stopped for fixTime s in all, the tyre is changed; and for
  // grace s afterwards (as while punctured) the shoulder meter doesn't run down
  // (and braking with a flat, the car brakes brake times as hard, right down to a stop, and stays stopped)
  puncture: { topSpeed: 0.5, accel: 0.5, pull: 1.6, fixTime: 4, grace: 6, brake: 2 },
  // a rival courier (a level's "rival", or ?rival: see Game.start): its pace, a share of the player's car's
  // top speed; its health; and s before an evil one's first throw at
  // the player (then as any evil car's: enemyThrowMin..Max)
  // Behind the player, it is faster, from catchUp.from m behind up to catchUp.pace times its pace at
  // catchUp.full m. It looks lookAhead m (and lookTime s at its speed) ahead for obstacles, steering
  // round any within obstacleRoom m of its line (and round a pickup that would do it harm); one that would do
  // it good, it moves over for, within pickupReach m (and lookTime s at its speed). A pickup it gets that is
  // heard of within heard m is said
  // (up to `most` of them: see a level's "rivals"; each one ahead at the drop takes its share of the tip.
  // No package is ever aimed at one, nor lands on one: it is beaten by driving, not bombing)
  rival: { most: 3, pace: { min: 0.96, max: 1.0 }, health: 4000, firstThrow: 6, catchUp: { from: 15, full: 150, pace: 1.15 },
    lookAhead: 20, lookTime: 2.2, obstacleRoom: 0.5, pickupReach: 40, heard: 150,
    // It is no stickler for the rules: boxed in, it overtakes up the shoulder (as long as it is wide
    // enough for it, by shoulderRoom m) or out in the oncoming lane, with only oncomingEdge m/s more
    // pace than what holds it up (an ordinary racer wants race.oncoming.edge)
    // (but with a police car within policeRange m, it keeps to its own lanes: it can't be busted, but it plays it safe)
    shoulderRoom: 0.3, oncomingEdge: 1.5, policeRange: 55,
    // and in traffic it takes a gap laneGap m clear either side (traffic wants laneChangeGap), counts only
    // what is within passRoom m past the car it is passing in that lane, and shakes off a knock recovery times as quickly
    laneGap: 6, passRoom: 12, recovery: 3,
    // the slipstream on a rival stage (for the rivals and the player alike): within reach m of the car ahead,
    // and share as strong as a race's (see CONFIG.race: draft, and the slingshot that comes of it)
    tow: { reach: 45, share: 0.4 },
    // Against ordinary traffic it has the better of every knock: it takes `share` of any push, damage and
    // stun (an even match is 0.5), its hits do `damage` times as much to the other, and side by side it
    // shoves the other car aside at `shove` m/s a step; a head-on wrecks the other car, costing it headOn
    // health and all but headOnSpeed of its speed. Stuck behind a car with no way by for `after` s, it
    // rams it, closing at `closing` m/s, and an evil one throws at it every throwEvery s
    ram: { share: 0.15, damage: 4, shove: 0.25, headOn: 600, headOnSpeed: 0.35, after: 0.3, closing: 6, throwEvery: 1.5 } },
  race: { respawnTime: 4.5, respawnShield: 1.5, understeer: 6, scrub: 0.3, aiTyres: 1.6, aiGrip: 2.2, aiPickup: 2.4, aiLookout: 35, wallFrom: 1.5, wallDamage: 5,
    towReach: 130, draft: 0.2, seekReach: 160, seekEvery: 1.5,
    // Racecraft: each driver's nerve in the bends is its own, from nerve.min to nerve.max times the
    // field's (so some are quicker through them, and catch the one ahead). A racer that pulls out to
    // pass is on the attack for attackTime s (or, still alongside it, up to passMax s): the tow it pulled out of carries it on (its slingshot,
    // fading as it goes), and it brakes later, with attackNerve times its nerve
    nerve: { min: 0.92, max: 1.06 }, attackTime: 3, attackNerve: 1.12,
    // Passing into a corner: a racer on the attack brakes later (looking diveLookout as far ahead
    // for the bend), and a racer with one alongside on the attack as a bend comes gives it the
    // corner, easing to cede of its pace (an evil one, evilCede: it gives up as little as it can)
    diveLookout: 0.55, cede: 0.9, evilCede: 0.97, passMax: 8,
    // Overtaking on the wrong side of a two-way road (with no lane of its own to pass in): only with
    // `edge` m/s more pace than the car holding it up; past the whole queue (cars within queueGap m of
    // the next) and margin m more; with nothing coming that could reach it in that time, and spare m
    // to spare. It pulls back in at the first gap (room for it and cutIn m behind it), at once with
    // anything coming within panic s, and after longest s regardless
    oncoming: { edge: 4, queueGap: 22, margin: 14, spare: 60, cutIn: 4, panic: 2.2, longest: 12 },
    // Going by the player, a racer picks a side and keeps to it; shut out, it switches to the other,
    // if that is open (a dummy), at most every feintEvery s; and on the attack it moves across
    // passSharp times as sharply
    feintEvery: 0.8, passSharp: 1.6,
    // The slingshot: a car (a racer, or the player) pulling out of a tow at least slingFrom deep is
    // flung on: a kick of slingKick of its top speed (by how deep in the tow it was) on top of the
    // tow's own, both fading away: over slingPerGain s for every m/s the tow had it going above its
    // own top speed as it pulled out (at most slingMax s), so a long, deep tow flings it on furthest
    slingFrom: 0.25, slingKick: 0, slingPerGain: 0.25, slingMax: 4,
    // An evil racer's feud (a good one races clean): with a rival ahead of it or alongside, it
    // chases it down and rams it, as anywhere; but it never drops back for one behind it, it only
    // blocks it, moving across into its lane (at most every blockEvery s) without lifting off
    blockEvery: 0.8,
    blocking: { min: 3, headway: 0.3, window: 20 }, // (on a circuit, racing close: the room it needs to block, as CONFIG.blocking)
    // ...and a rival ahead is rammed with a nudge, not at full tilt: it closes right up, nudge m/s
    // faster than its rival, and shoves. An evil racer that is angry races in a fury: fury.pace
    // times its top speed, fury.nerve times its nerve in the bends
    nudge: 1.5, fury: { pace: 1.05, nerve: 1.08 },
    // An evil racer left behind by the car in front of it (more than chase.from m back) chases it
    // down hard: up to chase.pace times its top speed and chase.nerve times its nerve in the bends,
    // all of it by chase.full m back. And it bullies good racers, who race clean: alongside one, it
    // leans bully.squeeze m into it, and the good one (with an evil one alongside, within
    // bully.room m) lifts to bully.lift of its speed to keep out of trouble, and with an evil one
    // within bully.behind m of its gearbox, moves over to let it by (every bully.yieldEvery s at
    // most). A good racer bullied loses bully.mood a second; the evil one gains it
    chase: { from: 40, full: 120, pace: 1.06, nerve: 1.1 },
    bully: { room: 1.2, lift: 0.9, behind: 4, squeeze: 0.7, yieldEvery: 1, mood: 0.025 },
    // A racer's mood: in the front half, with clear road behind it, it cheers up as the race goes
    // on, up to leadMood a second for the leader; but with a car within pressure m behind it, it
    // frets instead, up to pressureMood a second for the leader (and much less a few places back,
    // where it falls away as the square of how far up front it is). It gains passMood for every car
    // it gets past, and loses passedMood for every car that gets past it; up to frontSwing times
    // that for the leader (a place up front matters more), and so much more at the very front
    // (so the knocks of the race don't leave the whole field furious, nor the front of it serene).
    // A racer wrecked within killWindow s of another hitting it is that one's doing; an evil
    // racer that does it gains killMood
    leadMood: 0.03, pressure: 15, pressureMood: 0.05, passMood: 0.15, passedMood: 0.1, frontSwing: 3,
    killWindow: 3, killMood: 0.5 },
  // Ice (a level's "ice": patches on the road). On it the player's car slews round as it arrives
  // (only the look of it: yaw never changes where a car goes), brakes and steers with less grip,
  // and in a bend it understeers: it slides to the outside, the more so the faster, heavier and
  // less agile it is. A traffic car hitting it may spin out (and blow up), the likelier the faster.
  // (The brakes and the steering are the player's car's only: traffic on ice brakes and changes lane as ever.
  // A burst main's water is ice in every way but those two and laneSpeed, which it has of its own: see waterMain.)
  ice: {
    brakeGrip: 0.35,       // share of its braking (or braking by itself for a car ahead) that works on ice
    steerGrip: 0.3,        // share of its steering's grip: of how quickly the car takes up the way it is steered...
    laneSpeed: 0.55,       // ...and share of the speed it moves across the road at, steered (so a lane change takes about twice as long)
    grip: 6,               // m/s^2 of cornering the tyres still hold on ice; beyond it...
    understeer: 0.4,       // ...this share of the rest pushes the car to the outside of the bend
    weightRef: 2.28,       // hw x hl x height of a car that weighs 1 (the Commuter); a car's weight goes
                           // with the square root of its own, times its mass (the 1000 lb weight)
    yawKick: 2.5,          // rad/s it slews round as it hits the ice, at speed
    spinPerSpeed: 0.02,    // chance, per m/s of its speed, that a traffic car hitting the ice spins out
  },
  // The tide (a level's "tide": see tide.js): the sea coming in over the player's side of the road.
  // In the water a car is slowed by how badly it wades: `crossing` times what a railway track costs
  // it (see railCrossing, and a car's "crossing" in cars.js), and steers with less grip; in deep
  // water it is damaged as well, the more so the worse it wades. Good drivers move out of the
  // water's way; evil ones plough on through, and a wave that catches a car in deep water stalls it.
  tide: {
    ramp: 3.5,             // m past the water's edge to full depth
    wet: 0.08,             // depth (0 = dry .. 1 = full) up to which the road is only wet
    deep: 0.5,             // depth from which it is deep water
    crossing: 2,           // times the railway track's slowing that the water costs a car
    slowest: 0.12,         // share of its top speed even a car that wades worst of all keeps
    damage: 30,            // health a second deep water costs a car, x (1 - its crossing)
    steerGrip: 0.6,        // share of its steering's grip a car keeps in the water
    trafficPace: 0.45,     // share of its speed a traffic car keeps in deep water
    warning: 3,            // s from a wave being warned of to its coming in over the road...
    rise: 0.8,             // ...s it takes to rush in...
    hold: 1.6,             // ...it stays...
    fall: 3,               // ...it takes to drain away, and the sea with it, right out off the road...
    low: 3,                // ...the road stays bare...
    back: 3,               // ...and the tide takes to come back in
    stretch: 240,          // m of road a wave floods, centred where the player will be when it comes in
    shove: 6,              // m/s^2 a wave rushing in pushes a car in the water towards the centre line
    overtime: 1.3,         // the tide rises on past the level's `end` into the tip countdown, up to this share of the clock
    oncomingShield: 4,     // extra s of shield for a car the helicopter can only set down on the oncoming side
    washedEach: 3,         // washed-up pickups there can be of each type at once (see Tide.washUp)
  },
  // Water stages (a level's "water": [{ from, to }]; see water.js, and render/water.js for the look). Over each
  // stretch the road IS water: the pavement runs down a slipway into a channel as wide as the road, shoulders
  // and all, and comes back up one at the far end; its lanes carry on as lanes, marked by buoys. A car that
  // floats (a car's "amphibious") drives in and carries on across as a boat: slower, softer to steer and to
  // stop, bobbing, a bow wave and a wake. Traffic that doesn't float pulls onto its shoulder short of the
  // slipway and waits there in a queue (the lanes all stay open); amphibious traffic drives in and out; boats
  // (a vehicle's "boat") live on the water only, and tie up at its bank short of the slipway at its far end.
  water: {
    slipway: 26,           // m of slipway at each end of a stage, over which the water deepens to the channel's depth
    afloat: 0.5,           // depth (0 = dry .. 1 = the channel's) from which a car is afloat, no longer wading
    topSpeed: 0.74,        // share of its top speed an amphibious car keeps afloat
    accel: 0.8,            // ...and of its acceleration
    brake: 0.55,           // ...and of its braking (it drifts on)
    drag: 9,               // m/s^2 the water slows a car that drives in faster than it can go afloat
    steer: 0.85,           // share of its sideways speed it keeps afloat...
    steerGrip: 0.38,       // ...and of how quickly its steering takes (it slides on)
    sunkSpeed: 0.2,        // share of its top speed a car that doesn't float keeps in the channel...
    sunkDamage: 30,        // ...and the health a second it costs it
    trafficPace: 0.7,      // share of its cruising speed an amphibious traffic car keeps afloat
    // the queue of traffic that can't cross, on its own shoulder: each car starts pulling over `from` m short of
    // its place in it; the first stops `edge` m short of the slipway, each of the rest `gap` m behind the one
    // before. Once `most` are waiting there, no more that can't cross turn up on that side of the water until
    // the queue is gone by; and none turns up within `clear` m of where the queue starts (reach: m back from
    // there a queue is looked for: longer than any queue gets)
    queue: { from: 170, edge: 13, gap: 2.2, most: 6, clear: 60, reach: 120 },
    // a boat coming to the end of its water ties up at the bank (the channel's shoulder), the same way: `edge` m
    // short of the slipway's foot
    moor: { from: 130, edge: 6, gap: 3, most: 12, clear: 130, reach: 260 },
    // a boat's wake (a traffic vehicle with "boat", under way faster than `from` m/s): for `length` m astern of it
    // and `width` m either side of its line, it shoves a car afloat away from that line, by up to `shove` m/s^2
    // close astern (fading with distance): something to steer against, or round, never a wall
    wake: { from: 4, length: 30, width: 3.4, shove: 9 },
    // (and a stage can have a current, its "current": m/s^2 it carries a car afloat sideways, + = to the right)
    // the look (render/water.js)
    surface: 0.32,         // m the water stands over the road, in the channel (the road under it is not drawn deeper)
    draft: 0.62,           // m of an amphibious car under the water afloat, if it has no "draft" of its own
    boatDraft: 0.12,       // ...and of a boat
    bob: { height: 0.06, period: 2.1, roll: 0.035, pitch: 0.02 }, // m up and down; s; rad of roll and of pitch
    bank: 0.9,             // m the water runs on past the pavement's edge, to its quay
    buoyEvery: 14,         // m between the buoys along each lane line
    wakeFrom: 3,           // m/s from which a car afloat leaves a wake
    colours: { shallow: 0x8fc7cf, deep: 0x2a7f9c, glint: 0x49a3bd, foam: 0xf2fafd, slip: 0xa9a79d, rib: 0x8a887f, quay: 0xc9c5b6 },
  },
  // Junctions (a level's "junctions"): crossroads where the road turns right or left, or goes
  // straight on. There is only ever the one route: the arms it doesn't take are barred to the
  // player by glowing arrows, but traffic leaves the road down them, through the arrows, and is
  // gone. At a turn, some of the traffic going the player's way carries straight on (unless an
  // oncoming car is in the box); at a junction straight on, some of that in the outside lane turns
  // off down the arm on its side. Nothing comes out of an arm, and while a car is leaving across a
  // box, traffic on the road waits at its edge.
  junction: {
    forward: 0.35,         // share of the traffic going the player's way that carries straight on at a turn
    turnOff: 0.3,          // share of that in the outside lane that turns off at a junction straight on
    clearBehind: 16,       // a car only carries straight on at a turn with nothing going its way beside it on the outside of
    clearAhead: 30,        // the bend, from this many m behind it to this many ahead, where one slowing for the bend still is (it would cut across it: see Traffic)
    crossing: 2,           // s it takes to get across, more or less: what is closing on it in that time counts as beside it
    stopping: 8,           // m/s^2 traffic slows at, giving way
  },
  // A railway track (a level's "railway", down its median) slows a car crossing it, by the car's
  // "crossing" (see cars.js): while any of it is over the track, its top speed there is its own
  // x (slowest + (1 - slowest) x crossing), and it is slowed to that at `bite`; the worse it
  // crosses, the more it rattles
  railCrossing: {
    width: 3.2,            // m of track bed (the ballast), centred on the centre line
    slowest: 0.3,          // share of its top speed a car that crosses worst of all (0) keeps
    bite: 25,              // m/s^2 it is slowed at, down to that
    usual: 0.6,            // a car's crossing if it doesn't say
  },
  // hippos (a level's "hippos": see hippos.js), charging out of the river across the road
  hippo: {
    out: 14,               // m beyond the road's edge it surfaces, in the river...
    bank: 5,               // ...which starts this far out (a muddy bank between it and the road)
    surface: 1,            // s it takes to come up and get going
    speed: 12,             // m/s it charges at
    hl: 0.95,              // m, half its width (along the road)
    hw: 2.1,               // m, half its length (it charges across the road)
    height: 1.7,           // m, its height (how far under the water it starts)
    lead: { min: -6, max: 22 }, // m off where the player will be when it reaches the player's lane
    beyond: 25,            // m into the grass on the far side it is gone
    most: 6,               // hippos there can be at once
  },
  // elephants (a level's "elephants": see elephants.js), plodding across the road and back
  elephant: {
    speed: 1.6,            // m/s it walks at
    hl: 1.4,               // m, half its width (along the road)
    hw: 2.9,               // m, half its length (it walks across the road)
    beyond: 12,            // m out into the grass it walks before turning back...
    rest: { min: 2, max: 6 }, // ...after standing there this many s
  },
  // the dancing portaloos (a level's "potties": see Collision): rows of them moving together, in step
  potties: {
    hop: 3.6,              // m up they jump (above a car's roof, it passes underneath)
    period: 1.8,           // s a step of their dance takes, unless the row says otherwise
    slide: 3.5,            // m to each side they slide
  },
  // mud (a level's "mud": stretches where the road gives way to mud): a car in it is slowed as on a
  // railway track (see railCrossing: by how well it crosses), and steers with less grip
  mud: { steerGrip: 0.7, trafficPace: 0.6 },
  // a gravel trap (a level's "gravel": part of a shoulder or run-off, see Track.gravelAt): a car in it is
  // slowed far harder than on plain run-off
  gravel: {
    inner: 1.5,            // m of asphalt between the lane's edge and the gravel, where a trap doesn't say
    wall: 0.6,             // m short of the wall the bed stops
    drag: 9,               // m/s^2 it takes off a car, whatever its speed...
    dragPerSpeed: 0.55,    // ...and this much more per m/s it is doing (at 40 m/s: 31 m/s^2)
    top: 0.35,             // the share of its top speed it can hold...
    most: 12,              // ...and never more than this, m/s, however fast the car
    steerGrip: 0.35,       // the share of its steering it keeps
    beachBelow: 2,         // m/s: slower than this in the gravel, it is beached...
    beachTime: 1.6,        // ...and sits there this long before it can dig itself out
    crawl: 4,              // m/s it is given as it digs out
    trafficPace: 0.3,      // the share of its speed a traffic or race car keeps in it
    trafficOut: 5,         // m/s sideways a race car steers back out of it at
    sprayFrom: 4,          // m/s above which the wheels throw stones
    soundEvery: 0.22,      // s between the crunches, at speed
  },
  // construction machinery (a level's "machinery": see machinery.js), trundling across the road and back
  machinery: {
    speed: 2.6,            // m/s it trundles at
    hl: 1.8,               // m, half its width (along the road)
    hw: 3.6,               // m, half its length (it crosses the road)
    beyond: 9,             // m off the road it goes before turning back...
    rest: { min: 1, max: 3 }, // ...after waiting there this many s
    damage: 70,            // health the player's car loses running into one (and blowing it up): a bulldozer, an excavator, a dump truck...
    damages: { roller: 49, forklift: 42 }, // ...a roller and a forklift are smaller (damage is by size: 25 + 4.9 x the square root of the box's volume in m3, as the obstacles'; the roller 2.3x4.8x2.2 m, the forklift 2x2.8x2.2, the big three about 3.6x7.2x3.3)
    speedKept: 0.6,        // ...and the share of its speed it keeps
    rollerSpeed: 1.5,      // m/s a road roller crawls along its shoulder
    pokeOut: 7,            // m off the road a forklift backs off to
    sizes: { roller: { hl: 2.4, hw: 1.15 }, forklift: { hl: 1.4, hw: 1.0 } }, // (the rest: hl / hw above)
  },
  // the work on a construction site's shoulders (a level's "siteWorks": see site.js)
  site: {
    trenchIn: 0.6,         // m out onto the shoulder the car's middle must be to drop a wheel in a trench
    plateEvery: 9,         // m from one steel plate across a trench to the next...
    plateLength: 4,        // ...each this long
    trenchDamage: 8,       // health a wheel in a gap costs...
    trenchKept: 0.7,       // ...and the share of its speed the car keeps
    trenchPuncture: 0.15,  // ...and the chance it gives the car a flat tyre (on that side)
    // potholes (a level's "potholes": { s, lane, r }): a wheel dropping into one is the same jolt
    potholeR: 0.9,         // m, a pothole's radius (a level can give each its own: r)
    potholeDamage: 6,      // health it costs...
    potholeKept: 0.8,      // ...the share of its speed the car keeps...
    potholePuncture: 0.25, // ...and the chance of a flat tyre (on the side of the car it hit)
    digOut: 4,             // m off the road an excavator stands...
    reach: 9.5,            // ...its bucket this far from it...
    swingPeriod: 5,        // ...swinging out and back in this many s
    bucket: 1.2,           // m, half the bucket's size
    bucketDamage: 50,      // health its bucket costs the player (blowing the excavator up; the bucket alone is 2.4 m of a big machine)...
    bucketKept: 0.6,       // ...and the share of speed kept
    walkSpeed: 1.2,        // m/s a worker pushes a barrow at...
    diveNear: 28,          // ...diving clear with the player this near behind...
    diveWide: 4,           // ...and this near across
    stackOut: 3,           // m off the road a pipe stack stands...
    pipeNear: { min: 35, max: 110 }, // ...a pipe rolling off with the player this far short of it...
    pipeEvery: { min: 5, max: 9 },   // ...no more often than every min-max s...
    pipeSpeed: 5.5,        // ...rolling at this m/s
  },
  // the migration (a level's "migration"): a great herd streaming across the road, at these m/s
  // each, out to `beyond` m either side and round again; galloping, bobbing up to `hop` m, `hops` times a second
  migration: { speed: { min: 4, max: 7 }, beyond: 35, hop: 0.2, hops: 2.5 },
  // wreckage (a level's "wreckage" and "tower": see wreckage.js), the scripted destruction
  // a level's quarries (render/road.js: LEVEL.quarries): the floor from floorFrom to floorTo m off the
  // road, then `benches` benches of the rock face, each benchDepth m deep and benchHeight m higher than the last
  // (hill: the land the face is cut into: level with the top bench for `top` m back from it, falling away over
  // `back` m beyond that, and sloping down to the ground over `ends` m past each end of the quarry)
  quarry: { floorFrom: 14, floorTo: 48, benches: 4, benchDepth: 12, benchHeight: 6, hill: { top: 60, back: 120, ends: 70, colour: 0x8f7d5e } },
  wreckage: {
    trigger: 110,          // m short of it the player is when it is set off (a level's can say otherwise)
    flight: 1.6,           // s it takes to fly in and land
    blast: 3,              // m beyond it, along the road, that its landing (or an airliner sliding) also wrecks
    lookout: 140,          // m ahead traffic sees its lane blocked, and pulls over
    towAfter: 0.6,         // s after it lands that a Tow Truck can clear it (see CARS: trait 'tow')...
    towKept: 0.35,         // ...keeping this share of its speed as it does
    approach: 420,         // m out an airliner comes in from, beyond where it touches down...
    approachHeight: 55,    // ...this high...
    approachTime: 3,       // ...taking this long to touch down...
    slideTime: 4,          // ...then sliding (its "slide" m) for this long, to rest
    blastWarn: 1.4,        // s a building's red box flashes before it blows (set off that many s ahead of the player)...
    blastNear: 25,         // ...or when the player is this many m short of it, if nearer...
    blastAim: 4,           // ...so that, keeping on, the player's nose is this many m short of the box as it blows...
    blastTime: 0.45,       // ...and s the fire takes to sweep across the road, wrecking what is in the box...
    blastBalls: 7,         // ...in this many fireballs, out from the building's front
    blastBuilding: 10,     // m from the road's edge to the front of a building that blows (a level's can say otherwise)
    towerFall: 2.6,        // s the control tower takes to come down...
    towerScale: 1.6,       // ...a tower this many times the usual size (some 85 m tall)
    kinds: {               // m each kind covers along the road (it covers its lanes across)
      // (roadtrain: a road train jackknifing: its trailers swing across its lanes, no fire: see render/wreckage.js)
      roadtrain: { depth: 9 },
      tanker: { depth: 3.5 }, containers: { depth: 5 }, boulders: { depth: 6 }, hangar: { depth: 5 }, plane: { depth: 7 }, airliner: { depth: 34 }, blast: { depth: 18 },
    },
  },
  // the bullet train (a mystery: see bullettrain.js), far faster than anything else in the game
  bulletTrain: {
    speed: 150,            // m/s (540 km/h)
    warning: 3,            // s from appearing up the road to reaching where the player was
    cars: 8,               // carriages...
    carLength: 25,         // ...each this long (m)
    hw: 1.6,               // m, half its width
    height: 3.6,           // m
    dangerMercy: 0.5,      // while it is about, the shoulder's danger meter runs down at this share of its usual rate,
    mercyAfter: 3,         // and nobody is busted for being on the shoulder, until this many s after it has gone
  },
  ufoStrike: {
    arrive: 1.5,           // s to fly in...
    hover: 4,              // ...over the player's car (the burn starts as it begins)...
    leave: 2,              // ...and away again
    height: 14,            // m above the car it hovers (clear of the chase camera's view of the car)...
    ahead: 8,              // ...and this far ahead of it, so it sits near the top of the screen
    burnRate: 7,           // health a second every vehicle loses from the moment the saucer starts to hover...
    burnGrowth: 0.5,       // ...growing by e^(this x seconds): smoking within a second or so, gone 2.5-5 s later
  },

  // stationary barriers: they explode when the player touches them, traffic drives through
  // frogs: large moving obstacles that hop all over the road within their stretch of it;
  // hitting one is the same as hitting a barrier
  frogHopTime: 0.7,        // s in the air per hop
  frogHopMax: 14,          // m along the road a single hop can cover (sideways it can cross the whole road)
  frogHopHeight: 2.5,      // m
  frogRestMin: 0.3,        // s it sits between hops, random between min and max
  frogRestMax: 1.2,
  frogHearing: 120,        // m from a frog within which its croaking is heard
  // what hitting each kind costs: health, and the share of the player's speed left afterwards
  obstacleKinds: {
    barrier: { damage: 34, speedKept: 0.6 },
    // (trainProof: the bullet train goes straight through it, and leaves it standing)
    railBarrier: { damage: 33, speedKept: 0.6, trainProof: true },
    bale: { damage: 38, speedKept: 0.75 },
    frog: { damage: 42, speedKept: 0.6 },
    cow: { damage: 36, speedKept: 0.6 },
    kangaroo: { damage: 33, speedKept: 0.7 },
    dropBear: { damage: 31, speedKept: 0.75 },
    wildebeest: { damage: 34, speedKept: 0.7 },
    // the construction site's
    potty: { damage: 36, speedKept: 0.7 },
    sewage: { damage: 35, speedKept: 0.55 },
    pile: { damage: 42, speedKept: 0.6 },
    beam: { damage: 35, speedKept: 0.5 },
    barrow: { damage: 10, speedKept: 0.85, light: true },
    pipe: { damage: 39, speedKept: 0.55 },
    zebra: { damage: 34, speedKept: 0.7 },
    asteroid: { damage: 14, maxDamage: 70, speedKept: 0.7 }, // damage is per metre of radius, up to maxDamage
    // (light: true = a small thing: it doesn't knock the steering, and barely shakes the camera)
    cone: { damage: 3, speedKept: 0.94, light: true },
    mine: { damage: 30, speedKept: 0.55 }, // a sea mine (Oh Mine!)
    sign: { damage: 32, speedKept: 0.8 },
    limitSign: { damage: 30, speedKept: 0.85 }, // (a speed camera's limit sign: see CONFIG.speedCamera)
    // the beach's junk (Hurricane)
    umbrella: { damage: 45, speedKept: 0.85 },
    surfboard: { damage: 31, speedKept: 0.8 },
    cooler: { damage: 6, speedKept: 0.92, light: true },
    chair: { damage: 43, speedKept: 0.6 },
    wreck: { damage: 42, speedKept: 0.5 },
    // the hidden gimmicks level's
    camera: { damage: 8, speedKept: 0.85, light: true }, // a speed camera on its pole
    rock: { damage: 39, speedKept: 0.6 },
    cyclist: { damage: 12, speedKept: 0.85, light: true },
    landmine: { damage: 0, speedKept: 1 }, // (no ordinary knock: it destroys whatever touches it outright, see Collision)
    // Gimmick Road 2's (see hazards.js)
    trolley: { damage: 8, speedKept: 0.88, light: true },
    runner: { damage: 10, speedKept: 0.88, light: true },
    waterTable: { damage: 6, speedKept: 0.9, light: true },
    paceCar: { damage: 42, speedKept: 0.5 },
    wideLoad: { damage: 12, speedKept: 0.6, sideDamage: 6, sideKept: 0.85 }, // (a knock: see CONFIG.wideLoad)
    escort: { damage: 8, speedKept: 0.6, sideDamage: 4, sideKept: 0.9 },
    marcher: { damage: 10, speedKept: 0.88, light: true }, // a bandsman in a parade (knocked down in front of the police: a bust)
    // falling cargo (a shedding truck's load: see CONFIG.cargo): bales and crates
    crate: { damage: 31, speedKept: 0.75 },
    // the themes' own (a theme's `obstacles` in themes.js): each a plain kind in another shape, so each costs
    // exactly what the kind it stands in for costs (scripts/.obstacles-check.mjs holds them to it). For a crate:
    toyBlock: { damage: 31, speedKept: 0.75 },      // the toy room's: alphabet blocks
    divingHelmet: { damage: 31, speedKept: 0.75 },  // the sea bed's: a brass diving helmet
    supplyPod: { damage: 31, speedKept: 0.75 },     // the Moon's: a supply pod on its legs
    directorChair: { damage: 31, speedKept: 0.75 }, // the film studio's
    mooringPosts: { damage: 31, speedKept: 0.75 },  // Venice's: three striped mooring posts
    fuelDrum: { damage: 31, speedKept: 0.75 },      // the ice road's: a red drum under a cap of snow
    popcornCart: { damage: 31, speedKept: 0.75 },   // the theme park's
    barrel: { damage: 31, speedKept: 0.75 },        // the Wild West's
    chairStack: { damage: 31, speedKept: 0.75 },    // the favela's: a stack of plastic chairs
    riceBasket: { damage: 31, speedKept: 0.75 },    // the rice terraces': a basket heaped with rice
    wasteDrum: { damage: 31, speedKept: 0.75 },     // the fallout zone's: a yellow drum of waste, the trefoil on it
    hawkerCart: { damage: 31, speedKept: 0.75 },    // Hong Kong's: a hawker's cart under its striped awning, a red lamp lit
    // ...for a bale:
    bagStack: { damage: 38, speedKept: 0.75 },      // Hong Kong's: a heap of red-white-blue nylon bags, strapped
    cameraDolly: { damage: 38, speedKept: 0.75 },   // the film studio's: a camera on its dolly
    present: { damage: 38, speedKept: 0.75 },       // Christmas Eve's: a wrapped present
    toyDrum: { damage: 38, speedKept: 0.75 },       // the toy room's: a toy drum
    sackStack: { damage: 38, speedKept: 0.75 },     // Mumbai's: a stack of jute sacks
    beachBall: { damage: 38, speedKept: 0.75 },     // the beach's: a great beach ball (it rolls, as a bale does)
    tumbleweed: { damage: 38, speedKept: 0.75 },    // the Wild West's, for a bale that drifts (it rolls too)
    // ...for a cone:
    skittle: { damage: 3, speedKept: 0.94, light: true }, // the toy room's (an orange cone is lost on its orange track)
    cafeTable: { damage: 3, speedKept: 0.94, light: true },  // Venice's: a cafe table under its shut parasol
    wheelieBin: { damage: 3, speedKept: 0.94, light: true }, // the hood's
    snowdrift: { damage: 3, speedKept: 0.94, light: true },  // the snow's and the ice road's: a heap of snow with a stake in it
    brimstone: { damage: 3, speedKept: 0.94, light: true },  // hell's: a glowing spike
    flagStand: { damage: 3, speedKept: 0.94, light: true },  // the Moon's, for a cone that drifts: a flag on a stand
    // ...for a rock (sized by its radius, as a rock is):
    lavaRock: { damage: 39, speedKept: 0.6 },       // the volcano's: cooled lava, glowing in its cracks
  },
  // drifters: obstacles moving about the road in patterns (a level's "drifters")
  drifters: {
    rock: { min: 0.8, max: 1.3 }, // m: the radius of a drifter of a kind sized by its radius (a rock, an asteroid)
    across: 0.85,          // share of the road's half-width a pattern reaches out to from the centre
    circleRadius: 25,      // m along the road a circle spans either side of its centre
    circleRate: 0.9,       // radians/s round the circle
    zigzagSpeed: 12,       // m/s along the road (looping round the stretch), weaving as it goes
    zigzagRate: 1.4,       // radians/s of weave
    sweepRate: 1.1,        // radians/s across the road and back
    eightLength: 30,       // m along the road a figure of eight spans either side of its centre
    eightRate: 0.7,        // radians/s round the eight
    wobble: 0.3,           // how much of each pattern is an unrelated, slower wobble (0 = clean, predictable sine waves)
    wreckSpin: 2.5,        // radians/s a drifting wreck spins on the spot (each has its own share of this, either way)
    // 'dart': no pattern at all. It sits a while (dartRest s, at random), shivers for dartShiver s
    // (the only warning), then darts off to anywhere within its reach of its home, at dartSpeed
    // m/s (at random; dartMin m at least), and sits again. Differently every run. An obstacle with "drift": "dart"
    // reaches dartAlong m up or down the road and dartAcross m across it; a drifter, its whole stretch across
    dartRest: { min: 0.3, max: 1.6 }, dartShiver: 0.35, dartSpeed: { min: 4, max: 14 }, dartAlong: 8, dartAcross: 4, dartReach: 22, dartMin: 2,
  },
  cowSpeed: 2.2,           // m/s a cow ambles across the road
  kangarooSpeed: 6,        // m/s a kangaroo bounds across it (a herd of kind 'kangaroo'), hopping...
  kangarooHop: 0.9,        // ...this high...
  kangarooHops: 2.2,       // ...this many times a second (and it rests at each side like a cow)
  // drop bears (a level's "dropBears"): up in the trees over the road until the player comes within
  // `near` m (a different distance for each) plus the distance the car covers while a bear falls (about 2.2 s of
  // its speed: a fast car is dropped on from further back, so it can't just outrun one), then down they drop, and there they stay
  dropBear: { height: 24, near: { min: 50, max: 110 } },
  cowRestMin: 0.5,         // s it stands at each side before turning back, random between min and max
  cowRestMax: 2.5,
  tractorSpeed: 7,         // m/s a tractor trundles along at (it is traffic: see vehicles)

  startSpeed: 20,          // a fresh car pulls away to this on its own
  brake: 20,               // m/s^2 while brake is held
  autoBrake: 28,           // m/s^2, automatic braking behind a slower car (off the accelerator only)
  autoBrakeGap: 5,         // m, gap it tries to keep
  autoBrakeTime: 0.7,      // s of closing speed added to that gap
  brakeScreech: 8,         // m/s of closing speed from which that braking squeals the tyres

  // steering: free lateral movement, with a soft pull to the nearest lane centre
  steerSpeed: 9,           // m/s sideways at full steer
  steerResponse: 10,       // 1/s, how quickly sideways speed builds / dies
  edgeBrake: 6,            // 1/s, how firmly sideways speed is cut near the road's sides
  laneAssist: 0.4,         // 1/s: a faint pull back toward the lane when not steering, 0 = none
  laneAssistFree: 1.0,     // m either side of a lane's centre with no pull at all: drive off-centre freely
  // A car points the way it is actually travelling: the angle between its sideways speed and
  // its forward speed. So the faster it goes, the less the same swerve turns its nose.
  yawGain: 1.3,            // that angle is exaggerated by this much, so swerves read on screen (1 = true to life)
  yawMinSpeed: 18,         // m/s: below this the angle is worked out as if the car were doing this speed
  maxYawDeg: 25,           // clamped to 45 regardless
  yawSmoothing: 12,        // 1/s

  // traffic: the right-hand half of the lanes travels with the player, the left half comes at you
  trafficPool: 80,         // vehicles there are meshes for; a level's counts can't add up to more
  trafficCount: 16,        // same-direction cars alive at once (density; a level can set "trafficCount")
  oncomingCount: 12,       // oncoming cars alive at once (a level can set "oncomingCount")
  trafficMinSpeed: 9,      // m/s (a level can set its own with "trafficSpeed": { "min", "max" })
  trafficMaxSpeed: 18,
  spawnMin: 480,           // spawn window ahead of the player, metres (inside the fog)
  spawnMax: 640,
  despawnBehind: 80,
  quietCull: 250,          // m from the player beyond which a car going into a quiet stretch may be taken off (unseen)
  quietRetry: 3,           // s a car kept from turning up near a quiet stretch waits before it tries again (see quietZones)
  trafficLaneChangeRate: 2.5, // 1/s
  laneChangeChance: 0.3,   // per decision (every 1-3 s) for a random lane change
  signalTime: 1.5,         // s a calm (happy or neutral), good driver signals before changing lane;
                           // evil and angry drivers just go
  // Hesitation: a car going the player's way that turns up ahead cruising faster than `above`
  // would only run away from the player, so it hesitates instead: it dawdles, drifts about in
  // its lane and keeps touching its brakes. (A fixed speed: it doesn't depend on the player's car.)
  // While a hesitant car is ahead, some of the traffic going the player's way comes up from
  // behind instead, near full speed, to pass the player. A level can turn it off: "hesitation": false
  hesitation: {
    above: 22,                        // m/s
    pace: { min: 11, max: 17 },       // m/s a hesitant car dawdles at
    tapEvery: { min: 1.2, max: 3.5 }, // s between touches of the brakes...
    tapTime: 0.5,                     // ...each lasting this long...
    tapPace: 0.45,                    // ...slowing it to this share of its pace
    wander: 0.35,                     // m it drifts about in its lane
    behindChance: 0.5,                // chance a new car going the player's way comes from behind
    behind: { min: 45, max: 75 },     // m behind the player it turns up (inside despawnBehind)
    behindPace: { min: 0.9, max: 1 }, // share of full speed it drives at: a garage car's own
                                      // top speed, anything else the level's top traffic speed
  },
  // horns: a driver honks on turning angry, and while held up behind the player
  hornRange: 70,           // m from the player within which drivers bother
  hornWait: 5,             // s before the same driver honks again
  passByRange: 5,          // m to the side within which an oncoming car passing the player...
  passByChance: 0.3,       // ...may honk as it goes by
  laneChangeGap: 10,       // m of clear road a car wants before changing lane (smaller = more careless)
  // rivalries: a car that another car has hit, or that is simply angry, picks a nearby car to
  // bully: it chases it, crowds it sideways and won't brake for it
  rivalryChance: 0.35,    // chance that a collision between two traffic cars starts one, each way
  rivalryPickChance: 0.12, // chance per decision that an angry car picks on its nearest neighbour
  rivalryRange: 45,        // m
  rivalryTime: 5,          // s before it loses interest
  // traffic vehicle types (which of them a level has, and how often, is in the level's
  // "traffic" list). hw / hl = hitbox half width / half length (m);
  // speed scales the car's cruising speed. special: true = a special vehicle, never evil.
  // crit / spin: its own odds of a critical hit / of spinning out, as a multiple of the usual (default 1; 0 = never)
  vehicles: {
    // (a vintage delivery van, in the one livery: livery is its paint, whatever the driver)
    van:     { hw: 1.1,  hl: 2.7, height: 2.3, mass: 1.8, health: 90,  speed: 0.95, special: true, model: 'deliveryvan', livery: 0x1e5b3f }, // (special: never evil, as a bus)
    bus:     { hw: 1.3,  hl: 5.5, height: 3.1, mass: 4,   health: 180, speed: 0.8, special: true, model: 'citybus' },
    tractor: { hw: 1.2,  hl: 2.0, height: 2.4, mass: 2.5, health: 150, speed: 1, special: true },
    police:  { hw: 0.95, hl: 2.1, height: 1.4, mass: 1.2, health: 80,  speed: 1.1, special: true, model: 'police' },
    // an 18-wheeler: a prime mover and a long trailer. kerb: it keeps to the lane by the kerb
    // (rejoining it after a narrowing), never changing lanes of its own or picking a fight;
    // cruise: m/s it runs at, fast, whatever the level's pace, and it never hesitates
    // noSpin: it never spins out (not from damage, nor on ice): a critical hit makes it wobble, then blow up
    semi:    { hw: 1.25, hl: 8.2, height: 4.0, mass: 6, health: 320, speed: 1, model: 'semi', kerb: true, cruise: { min: 26, max: 31 }, noSpin: true },
    // a Formula 1 car (a level's "grid": see Traffic), its speed set by the race
    f1:      { hw: 0.95, hl: 2.6, height: 1.0, mass: 0.8, health: 220, model: 'f1', agility: 1.5 },
    // a GT road car, raced (as f1)
    gt:      { hw: 1.0, hl: 2.3, height: 1.25, mass: 1.3, health: 300, model: 'gt', agility: 1.2 },
    // a Le Mans prototype (as f1, and as nimble): built for endurance, the toughest of the three, and it never spins out or takes a critical hit
    lmp:     { hw: 1.0, hl: 2.35, height: 1.05, mass: 1.0, health: 380, model: 'lmp', agility: 1.5, crit: 0, spin: 0 },
    // (only ever an emergency vehicle: see CONFIG.emergency; never in a level's traffic list)
    ambulance: { hw: 1.1, hl: 2.9, height: 2.6, mass: 2, health: 150, speed: 1, special: true, model: 'ambulance' },
    // the garage's cars as traffic (each id is the garage car's, in src/cars.js). They have no
    // speed: they cruise near that car's own top speed (garagePace, below). model: which of the
    // models in render/models.js it is drawn as
    // (the everyday traffic: these two run at the level's own pace, as the cars they replaced did)
    commuter: { hw: 0.85, hl: 1.85, height: 1.45, mass: 0.8, health: 45, model: 'commuter', speed: 1.05 },
    darkvan: { hw: 1.05, hl: 2.45, height: 2.4, mass: 1.5, health: 60,  model: 'darkvan', speed: 1 },
    junker:  { hw: 1.0,  hl: 2.5, height: 1.95, mass: 1.3, health: 70,  model: 'junker' },
    sport:   { hw: 0.85, hl: 1.9, height: 1.1, mass: 0.8, health: 45,  model: 'sport' },
    wagon:   { hw: 1.05, hl: 2.4, height: 1.9, mass: 1.6, health: 90,  model: 'wagon' },
    lovebus: { hw: 1.0,  hl: 2.3, height: 2.1, mass: 1.5, health: 100, model: 'lovebus' },
    lowrider: { hw: 1.0, hl: 2.5, height: 1.1, mass: 1.3, health: 85,  model: 'lowrider' },
    taxi:    { hw: 1.0,  hl: 2.55, height: 1.6, mass: 1.4, health: 90,  model: 'taxi' },
    suv:     { hw: 1.0,  hl: 2.25, height: 1.8, mass: 1.6, health: 110, model: 'suv' },
    hotrod:  { hw: 0.9,  hl: 2.1, height: 1.2, mass: 1,   health: 55,  model: 'hotrod' },
    minivan: { hw: 1.05, hl: 2.45, height: 2.0, mass: 1.7, health: 110, model: 'minivan' },
    hearse:  { hw: 1.0,  hl: 2.8, height: 1.65, mass: 1.6, health: 100, model: 'hearse' },
    // the Battlefield's armies (a level's "battle": see CONFIG.battle). rank: who wins a head-on (see Collision)
    jeep:    { hw: 0.95, hl: 2.0, height: 1.8, mass: 1.2, health: 60,  speed: 1.1, model: 'jeep', rank: 1 },
    apc:     { hw: 1.35, hl: 3.4, height: 2.5, mass: 4,   health: 160, speed: 0.9, model: 'apc', rank: 2, noSpin: true },
    tank:    { hw: 1.6,  hl: 3.3, height: 2.4, mass: 6,   health: 260, speed: 0.75, model: 'armytank', rank: 3, noSpin: true, crit: 0 }, // (no critical hits: only its health, or a mine, finishes it)
    pickup:  { hw: 1.05, hl: 2.6, height: 2.1, mass: 1.8, health: 120, model: 'pickup' },
    miata:   { hw: 0.85, hl: 1.95, height: 1.1, mass: 0.8, health: 50, model: 'miata' },
    // boats, the traffic of a level on the water (boat: it leaves a wake, has no tyres to puncture, shows no
    // brake lights or indicators, and never spins out or takes a critical hit): a cruiser as the player's jetboat, and a fishing trawler, big and slow
    boat:    { hw: 1.0, hl: 2.7, height: 1.6, mass: 1.2, health: 90, model: 'jetboat', speed: 1, boat: true, noWheels: true, crit: 0, spin: 0 },
    trawler: { hw: 1.5, hl: 4.6, height: 3.2, mass: 3.5, health: 200, model: 'trawler', speed: 0.6, boat: true, noWheels: true, crit: 0, spin: 0 },
    // ...and the boats of a water stage (a level's "water": see CONFIG.water and water.js), which turn up on the
    // water only: a dinghy with an outboard, quick and light; a barge, long, wide, heavy and slow, to slip round;
    // a ferry, big and steady; and a pedal boat, hardly moving. (cruise: m/s, whatever the level's pace)
    dinghy:  { hw: 0.8, hl: 1.7, height: 1.0, mass: 0.6, health: 50, model: 'dinghy', cruise: { min: 9, max: 13 }, boat: true, noWheels: true, crit: 0, spin: 0 },
    barge:   { hw: 1.5, hl: 7.5, height: 2.2, mass: 7, health: 400, model: 'barge', livery: 0x3a4a5e, cruise: { min: 4.5, max: 6.5 }, boat: true, noWheels: true, special: true, crit: 0, spin: 0, noSpin: true },
    ferry:   { hw: 1.6, hl: 5.5, height: 3.6, mass: 6, health: 320, model: 'ferry', livery: 0x1f6f5c, cruise: { min: 7, max: 9 }, boat: true, noWheels: true, special: true, crit: 0, spin: 0, noSpin: true },
    pedalo:  { hw: 0.9, hl: 1.4, height: 1.3, mass: 0.5, health: 40, model: 'pedalo', cruise: { min: 2, max: 3.2 }, boat: true, noWheels: true, special: true, crit: 0, spin: 0 },
    // the amphibious cars as traffic (each id is the garage car's, so it wears that car's two liveries): they drive
    // down the slipway into a water stage and out again at the far end, slower afloat (amphibious; draft: m of it
    // under the water afloat). They run at the level's own pace (speed), not their top speed
    herald:   { hw: 0.8, hl: 1.95, height: 1.0, mass: 0.8, health: 50, model: 'herald', speed: 0.9, amphibious: true, draft: 0.5 },
    floatvan: { hw: 1.3, hl: 2.3, height: 2.0, mass: 1.6, health: 100, model: 'transporter', speed: 0.9, amphibious: true, draft: 0.85 },
    toybota:  { hw: 1.0, hl: 2.5, height: 1.6, mass: 1.5, health: 100, model: 'toybota', speed: 1.05, amphibious: true, draft: 0.62 },
    dampervan: { hw: 1.0, hl: 2.3, height: 2.7, mass: 1.7, health: 120, model: 'dampervan', speed: 0.95, amphibious: true, draft: 0.72 },
    nissank:  { hw: 1.35, hl: 2.6, height: 1.7, mass: 2, health: 130, model: 'nissank', speed: 1.1, amphibious: true, draft: 0.85 },
    // traffic with quirks of its own (see Traffic: quirks). jingle: an ice cream van's tune, heard near it (every
    // jingle s); stops: a bin lorry pulls up where it is every every s, for time s, hazards on; learner: it
    // hesitates all the time (as CONFIG.hesitation: dabs of the brakes, drifting about its lane); tailgates: a boy
    // racer sits on the player's bumper, as a sulky driver does; sway: m a caravan swings about behind its car
    icecream: { hw: 1.05, hl: 2.6, height: 2.4, mass: 1.6, health: 80, speed: 0.6, special: true, model: 'icecream', livery: 0xff9ec4, jingle: 2.6 },
    binlorry: { hw: 1.25, hl: 4.2, height: 3.2, mass: 4, health: 200, speed: 0.75, special: true, model: 'binlorry', livery: 0x2f8a4a, noSpin: true,
      stops: { every: { min: 7, max: 13 }, time: { min: 2.5, max: 4.5 } } },
    learner: { hw: 0.85, hl: 1.9, height: 1.45, mass: 0.8, health: 45, speed: 0.6, special: true, model: 'learner', livery: 0xf4f4f4, learner: true },
    boyracer: { hw: 0.9, hl: 1.95, height: 1.15, mass: 0.8, health: 45, speed: 1.35, model: 'boyracer', tailgates: true },
    caravan: { hw: 1.1, hl: 5.2, height: 2.6, mass: 2.2, health: 110, speed: 0.75, special: true, model: 'caravan', sway: 0.45 },
    // a drive-by car (The Hood): only ever evil (evilOnly), out for trouble: see CONFIG.driveBy
    driveby: { hw: 1.0, hl: 2.65, height: 1.45, mass: 1.5, health: 120, model: 'driveby', speed: 1.1, evilOnly: true },
    // the kei truck (Tokyo's traffic) and the post van (Christmas Eve's): the garage's, so each cruises near its own top speed
    keitruck: { hw: 0.74, hl: 1.7, height: 1.75, mass: 0.9, health: 60, model: 'keitruck' },
    postvan: { hw: 0.9, hl: 2.1, height: 1.85, mass: 1.2, health: 90, model: 'postvan' },
    // an auto-rickshaw (Mumbai's): small, slow, nimble and flimsy, and painted the one way (livery)
    rickshaw: { hw: 0.65, hl: 1.25, height: 1.75, mass: 0.5, health: 35, speed: 0.75, model: 'rickshaw', agility: 1.6, livery: 0xf2c418 },
    // a parade float (a level's "parades": see CONFIG.parade): a long flatbed under a tower of colour, at a
    // crawl, keeping its lane; never evil, never spun
    float:   { hw: 1.3,  hl: 4.2, height: 3.4, mass: 3.5, health: 240, speed: 1, special: true, model: 'float', noSpin: true, crit: 0 },
    // a cargo truck (an 18-wheeler with an open load) that sheds its load as it goes: see CONFIG.cargo
    cargotruck: { hw: 1.25, hl: 8.2, height: 4.0, mass: 6, health: 320, speed: 1, model: 'semi', kerb: true, cruise: { min: 20, max: 24 }, noSpin: true, sheds: true, special: true },
    // (the ice-cream van at a level's "iceCreamStops" is the icecream kind above: see CONFIG.iceCream)
    // a police pursuit's two cars (a level's "pursuits": see CONFIG.pursuit and pursuit.js), never in a level's traffic list:
    // the getaway car, and the interceptor, a model seen nowhere else (low and wide, a light bar, a push bar)
    getaway: { hw: 0.95, hl: 2.3, height: 1.3, mass: 1.3, health: 220, speed: 1, special: true, model: 'getaway', livery: 0x7a1420, crit: 0.5 },
    interceptor: { hw: 1.05, hl: 2.45, height: 1.15, mass: 1.7, health: 400, speed: 1, special: true, model: 'interceptor', livery: 0x1a2236, crit: 0, spin: 0 },
  },
  // an ice-cream van's stop (a level's "iceCreamStops": { s, lane, wait? }): the van stopped in its lane, its
  // jingle going, and the traffic behind it in a residential street brakes to a halt and waits, nobody
  // pulling out round it; `wait` s after the player comes within `trigger` m, it drives off
  iceCream: {
    wait: 14,              // s it stays, once the player is near (a stop can set its own: "wait")
    trigger: 220,          // m short of it the player's coming sets its clock going
    queue: 140,            // m behind it that traffic going its way queues, making no lane changes
    jingleEvery: 2.6,      // s between the jingle's phrases...
    heard: 200,            // ...heard from this far
  },
  // a reversible lane (a level's "reversible": { from, to, lane, flipAt? }): a lane on the player's side,
  // under overhead signs along its stretch, that flips to oncoming as the player comes within flipAt m of
  // it: the signs go from a green arrow to a red cross, the traffic in it moves out, and oncoming cars
  // come down it the wrong way
  reversible: {
    flipAt: 170,           // m short of the stretch it flips (a stretch can set its own: "flipAt")
    every: { min: 2.5, max: 5 }, // s between oncoming cars down it, while the player is on the stretch
    ahead: { min: 180, max: 280 }, // m ahead of the player each one appears
    signEvery: 150,        // m between the overhead signs
  },
  // convoys (a level's "convoys": { every: { min, max }, size?, kind? }): three or four vehicles nose to tail
  // in one lane, moving as one; a follower closes the gap to the one ahead, and shuts it in the player's
  // face when the player tries to merge in
  convoy: {
    size: 4,
    gap: 3.5,              // m nose to tail they keep
    close: 1.6,            // how hard a follower closes a gap (m/s of speed per m of gap)
    shut: 5,               // m/s a follower puts on to shut a gap the player is aiming for
  },
  // rubberneckers: traffic slows to look at a wreck, so the jam comes after the crash; and some evil drivers
  // lose patience with a jam, and go up the shoulder, and are arrested for it if the police see
  rubberneck: {
    linger: 25,            // s a wreck is worth a look
    range: 70,             // m short of it they slow
    pace: 0.35,            // share of their speed they slow to
    slowBelow: 0.4,        // share of its speed an evil driver counts as a jam...
    patience: 3.5,         // ...for this many s before it takes to the shoulder
    policeSight: 90,       // m a police car sees a shoulder-runner from
    longest: 12,           // s at most up the shoulder
  },
  // a street parade (a level's "parades": { s }): floats abreast in every lane of the player's side at s,
  // a marching band behind them, all going the player's way at a crawl, taking the whole road; set off as
  // the player comes within `trigger` m, and never pulling over. The band's drum is heard from `heard` m
  parade: {
    speed: 3.5,            // m/s
    trigger: 260,          // m short of it the parade sets off
    rows: 3,               // rows of marchers behind the floats...
    spacing: 2.2,          // ...this far apart
    gapBehind: 9,          // m from the floats' tails to the first row
    drumEvery: 0.55,       // s between beats
    heard: 220,            // m
  },
  // falling cargo: a truck that sheds its load (a traffic kind with sheds: true, the cargo truck) drops a crate
  // or a bale off the back now and then, anywhere across its lane and a little either side, which
  // slides on down the road a way and stops: an obstacle, the player's to hit (see Collision)
  cargo: {
    pool: 14,              // loads a level has to drop, all told, out of play until dropped (reused once well behind the player)
    kinds: ['crate', 'bale'],
    every: { min: 3, max: 7 }, // s between drops, while a truck is within `near` m ahead of the player
    near: 180,
    drag: 6,               // m/s^2 a dropped load slows at (it comes off at the truck's speed, less a little)
  },
  // a police roadblock (a level's "roadblocks": { s, gap? }): police cars parked across every lane of the
  // player's side but one (gap: that lane; left out, one at random each run). Touching one is a bust (not
  // with a radar detector); with a siren going, the player is waved through: the cars pull aside
  roadblock: {
    wave: 160,             // m short of it a siren has the cars pulling aside
    aside: 3,              // m/s they move
    warn: 220,             // m short of it the player is warned
  },
  // a police pursuit (a level's "pursuits": { every: { min, max } }; pursuit.js), a traffic event: a getaway car and,
  // `gap` m behind it (closing on that at `closing` m/s per m out), an interceptor, set off `behind` m behind the
  // player, the interceptor's siren heard from `heard` m. The getaway car runs at `pace` times the player's car's
  // top speed (between speed.min and speed.max), and `rush` m/s more while it is over `near` m from the player
  // (so it comes up quickly, is a few seconds going by, and is gone).
  pursuit: {
    behind: 260, gap: 30, closing: 0.8, heard: 420,
    pace: 1.3, speed: { min: 30, max: 75 }, rush: 24, near: 40,
    clearOfEnd: 700,       // m short of the finish beyond which none sets off
    retry: 2,              // s before it tries again, with no room for it
    leftBehind: 450,       // m behind the player at which one that never got by is taken off
    // how the two are driven: every `rethink` s, into the lane with the most clear road ahead (looking `look` s
    // on; a car within `margin` m of its side is in the way; each metre across the road costs `drift` m of clear
    // road, and the lane it is in already is worth `stick` m); `swerve` m/s sideways; and brakes that are not
    // always enough (`brake` m/s^2, to `followGap` m behind what is in the way)
    driving: { look: 3, rethink: 0.2, margin: 0.35, drift: 1.5, stick: 12, swerve: 8, accel: 9, brake: 15, followGap: 3 },
  },
  garagePace: { min: 0.75, max: 0.95 }, // share of its own top speed a garage car cruises at in traffic
  sirenRange: 160,         // m from a police car within which its siren is heard (louder the nearer)
  lowriderHearing: 90,     // m from a lowrider in traffic within which its music is heard (the same way)
  policeSightRange: 45,    // m along the road within which a police car witnesses what you do
  copGlowMargin: 12,       // m further out than that the screen's edges start flashing red and blue: a warning
  // a wrong-way driver (an oncoming car off a side road with no flyover, carrying on down the
  // expressway's right-hand lane: see Track.transfer): cars coming at it look look m ahead, and
  // lookTime s at their closing speed, to move over a lane or stop stopShort m off it; it keeps to its
  // lane, swerving over (into a lane clear `room` m round it) only within swerve m of something in it
  // (for the player: a warning as one comes within warn m ahead, and its horn every horn s from there on)
  wrongWay: { look: 30, lookTime: 2, stopShort: 6, swerve: 40, room: 10, warn: 320, horn: 1.1 },
  horn: { range: 60, wait: 0.6 },
  // dents and scorch on a damaged car (render/dents.js): at each `steps` share of damage the body's
  // geometry is swapped for a more crumpled one (vertices shoved `amount` of the body's size per step,
  // the same way every time); the paint darkens toward black by `scorch` at full damage
  dents: { steps: [0.25, 0.5, 0.75], amount: 0.06, scorch: 0.35 },
  // milestones (milestones.js): the thresholds each counter in the save's stats has a title for
  // (messages.json: milestones). A police car is outrun once it is `outrun` m behind the player (having been
  // near enough to see it) without a bust; a hippo survived is one that crossed within hippoNear m of the player
  milestones: { packagesLanded: [10, 100, 1000], copsOutrun: [5, 50, 500], hipposSurvived: [1, 10, 100], levelsDelivered: [1, 10, 35],
    wrecks: [1, 25, 250], busts: [1, 25, 250], trainsDodged: [1, 10, 100], kmDriven: [10, 100, 1000], outrun: 60, hippoNear: 120 },
  // a police car on station at the edge of its stretch (see Traffic: policeOnStation) stops this many m
  // short of the edge, braking at no more than stationBrake m/s^2 to do it
  stationShort: 3,
  stationBrake: 5,
  // A good player's social standing (see social.js), in points out of 100: gift points for each gift
  // that lands on a good driver (copGift on a police car), decay lost a second. With it, from none to
  // full: the police see policeSight.empty to policeSight.full times as far; the share of evil
  // drivers falls towards evilFloor; new drivers start up to moodLift happier (evil ones too); the
  // shoulder allowance grows by up to `danger` of itself; good powerups (and good mysteries) last up
  // to powerUpShift s longer, bad ones that much shorter; the good mysteries are up to `luck` more
  // likely again. From regen.from up, the car mends regen.min to regen.max of its health a second;
  // from protectFrom up, a car that assaults the player with a police car about is arrested.
  // A bust costs bust points of it, always; and above cautionFrom, the police let the player off
  // with a caution instead of the bust (for the shoulder: with grace s to get back in a lane).
  social: {
    gift: 4, copGift: 10, decay: 1, bust: 75, cautionFrom: 0.75, grace: 4,
    policeSight: { empty: 1.15, full: 0.85 }, evilFloor: 0.15, moodLift: 0.5, danger: 1, powerUpShift: 2.5, luck: 1,
    regen: { from: 0.5, min: 0.01, max: 0.03 }, protectFrom: 0.85,
  },
  maxBusts: 3,             // the run ends on this many busts
  evilShare: 0.35,         // share of traffic that is evil; the rest are good. A car never switches.
  startMood: {             // chance of each starting emotion (the remainder start neutral)
    good: { happy: 0.45, angry: 0.15 },
    evil: { happy: 0.1, angry: 0.6 },
  },                       // (a level can override both: "drivers": { "evil", "happy", "angry" }, or each side's: "goodMood" / "evilMood": { "happy", "angry" })

  // the screensaver: no player car, just a point gliding along the road that the camera follows
  screensaver: {
    speed: 20,             // m/s it glides at (slower than most traffic, so the traffic passes by)
    swayCentre: 0,         // lat it holds: 0 is the centre line of the road, between the two directions
    sway: 0,               // m it sways either side of that (0 = dead straight)
    swayPeriod: 18,        // s for one sway there and back
    camBack: 18,           // the camera stands further back and higher than the chase camera
    camHeight: 14,
    camLookAhead: 16,
    fadeDistance: 25,      // m either side of the join between laps over which the picture fades to black
    soundRange: 110,       // m within which traffic crashes are heard (in a run only the player's are)
  },

  // evil cars lob packages at the road where another vehicle (or the player) will be; the splash does the damage
  enemyThrowRange: 60,     // m from the player within which they bother
  enemyThrowMin: 2,        // s between throws, random between min and max
  enemyThrowMax: 5,
  enemyThrowScatter: 3,    // m, how far from its victim (the player, or another vehicle) a package may land
  enemyThrowCarRange: 45,  // m: the furthest away another vehicle can be for an evil car to throw at it
  splashRadius: 4,         // m
  splashDamage: 6,
  attitudeRange: 50,       // metres behind a car at which it reacts to the player
  grudgeTime: 7,           // s a driver the player has upset holds its grudge (throwing at the player), from the last upset
  // a car moving over in front of another to block it (an angry or smug driver in the player's way, a hunter,
  // a racer): only with this much room ahead of it, the more the faster the one blocked is going. The gap
  // must be at least `min` m and `headway` s at the target's speed, and no more than `window` m beyond that
  blocking: { min: 15, headway: 1.5, window: 40 },
  // How a traffic driver treats the player: by its side, its mood, and the player's side.
  //   good driver, good player: happy, friendly (moves aside, and eases off, letIn of its pace, to
  //     let the player in from the lane beside); angry, sulky (tailgates, within tailgate m, honks,
  //     holds its lane and won't let the player in)
  //   good driver, evil player: happy, wary (out of the player's lane, ahead or behind); neutral,
  //     distant (holds back, to distantPace, within distance m behind); angry, vigilante (blocks
  //     the player's lane ahead, tailgates, won't let the player in). A good driver never rams.
  //   evil driver, good player: happy, smug (gets in the player's lane ahead, dawdles at dawdle of
  //     its pace, brake-checks the player within brakeCheckRange m behind it every brakeCheckEvery
  //     s); angry, road rage (blocks, rams, feuds, throws rageThrowRate times as often: at the
  //     player if it holds a grudge, otherwise at whoever is nearest)
  //   evil driver, evil player: happy, a wingman (moves aside, and throws only at the cars about
  //     the player); angry, a turf war: it hunts the player (see hunt: a hunter holds a grudge, so
  //     it throws at the player), turfThrowRate times as often. No evil driver ever throws at the police.
  // An evil player who wrecks a car cheers the evil drivers within wreckCheer.range m by wreckCheer.mood.
  attitude: {
    letIn: 0.85, tailgate: 2.5, distance: 25, distantPace: 0.85, dawdle: 0.8,
    brakeCheckRange: 15, brakeCheckEvery: { min: 2.5, max: 5 }, rageThrowRate: 1.2, turfThrowRate: 1.8,
    // the turf war: the driver doesn't drop away: it keeps coming, catchUp m/s faster than the
    // player, for `time` s (or until it is lost lost m behind). Two or more hunting the player at
    // once box it in: the nearest ahead blocks its lane at blockPace of its speed and brake-checks
    // it, the nearest behind tailgates and rams, and the rest come up alongside and lean on it.
    hunt: { time: 25, catchUp: 6, lost: 250, blockPace: 0.92 },
    wreckCheer: { range: 60, mood: 0.4 },
  },

  // collision physics
  maxStep: 1 / 120,        // s, simulation sub-step so fast head-ons can't tunnel
  broadPhaseDistance: 12,  // only test pairs within this distance along the track
  policeTurnIn: 0.5,       // m/s sideways towards the player a police car must be moving, and faster
                           // than the player towards it, for a touch to be its doing: no bust
  playerPushShare: 0.1,    // share of any push the player takes when it hits traffic (the traffic takes
                           // the rest): small, so the player barely loses speed. 0.5 would be an even match
  playerRearEndShare: 0.6, // ...except when the player runs into the back of a traffic vehicle: the one
                           // case the traffic wins. The player takes this share of the push instead
  pushStep: 0.15,          // m per simulation step that overlapping cars are slid apart along the road
  bounce: 0.25,            // restitution, 0 = dead stop, 1 = full bounce
  scrape: 0.15,            // share of the speed difference traded in a side impact
  spinKick: 0.5,           // rad/s of spin per m/s of off-centre impact
  stunTime: 1.2,           // s a knocked car is out of control (no lane keeping)
  stunDrag: 0.5,           // 1/s speed loss while stunned
  stunGrip: 2.5,           // 1/s sideways speed loss while stunned
  minImpact: 1.0,          // m/s, gentler contact pushes but does no damage
  hardCrash: 14,           // m/s of impact from which a crash sounds like a bad one

  // damage
  damagePerSpeed: 1.5,     // health lost per m/s of impact (split by mass)
  // (a car-on-car hit takes at most this share of the victim's full health, by the MASS of what hit it: speed alone cannot
  // wreck a weak car, but a heavy vehicle can. frac = clamp(base + perMass x (mass - 1), base, most): a light car (mass 1 or less)
  // does at most `base` of it, so it takes two hits to wreck a commuter; a bus (4) 1.8x: it can wreck anything at speed)
  damageCap: { base: 0.75, perMass: 0.35, most: 3 },
  // spin-outs: a traffic car that takes damage may lose control, arc away and blow up.
  // chance per hit = spinPerDamage x (share of full health this hit took)
  //                  x (1 + spinRamp x (share of health now gone) squared)
  critChance: 0.05,        // chance that a hit on a traffic vehicle is a critical one: it wobbles, then spins out
  critWobbleTime: 1.1,     // s of wobbling before it goes
  spinPerDamage: 0.16,
  spinRamp: 12,            // how much likelier a nearly wrecked car is to spin than a fresh one
  packageSpinScale: 0.23,  // packages: scaled so about 1 car in 8 pelted to destruction spins out
  spinTime: 2,             // s of spinning before it explodes
  spinTurnMin: 0.25,       // rad/s its direction of travel swings round, random between min and max
  spinTurnMax: 0.8,
  spinDrag: 0.15,          // 1/s speed loss while spinning
  smokeStart: 0.75,        // health fraction below which a car starts smoking
  smokeRate: 35,           // particles per second at zero health
  shakeTime: 0.4,          // s
  hitShake: 0.5,           // camera shake, metres
  respawnTime: 4.5,        // s for the helicopter to deliver a new car (the time penalty)
  respawnShield: 2.5,      // s the new car can't be hit while it gets going

  // mood: -1 (furious) .. +1 (cheerful); angry below -1/3, happy above +1/3, neutral between.
  // Mood is an emotion and is separate from whether a car is good or evil.
  moodPerDamage: 0.02,     // mood lost per point of damage taken
  moodHoldUp: 0.15,        // mood lost per second stuck behind the player
  emoteEvery: 6,           // s, roughly, between mood faces popping up over a car
  emoteTime: 2,            // s a mood face stays up

  // packages
  throwRange: 70,          // m, max distance to a target
  throwBehind: 2,          // a car behind the player counts as this many times as far off as it is (one ahead is preferred)
  throwBlind: 30,          // m ahead of the car a package lands on the road when nothing is in range
  throwSpeed: 100,         // m/s, sets the flight time...
  throwFlightMin: 0.175,   // ...within these limits (s)
  throwFlightMax: 0.75,
  throwArc: 3,             // m, peak height of the arc
  throwCooldown: 0.6,      // s
  packageDamage: 4,        // a care package barely scratches what it hits
  evilPackageDamage: 25,   // an Evil player's flaming package: real damage, and it makes enemies
  completeBank: 10000,     // $ in the bank after "Unlock everything" on the menu
  // the Blue Star cars (the garage's second season) stay out of the garage, lot and all, until this
  // numbered level has been delivered
  blueStarsAfter: 20,
  // The level progression rework (tiers.js, tiers.json): levels in tiers of five, a medal for each side on each, and
  // exactly that tier's cars on a half not yet earned. true (the default) = the tiers; false = the old rule (each level opens by delivering the one
  // before it; the Blue Stars after level 20). ?tiers=1 / ?tiers=0 in the address overrides it for a visit.
  progression: { tiers: true },
  // the clock: each level has its own, for each side ("clock": { good, evil }), worked out by
  // scripts/level-clocks.mjs from a clean run (a ghost, flat out) in the reference car: that run's time
  // times good or evil, to the nearest `round` s, less `timePlus` s for each time plus on the level (the time
  // it gives back)
  clock: { car: 'sport', amphibious: 'floatvan', good: 1.5, evil: 1.15, round: 5, timePlus: 5 }, // (amphibious: the reference car on an amphibious level, a two-star car as the Sportscompact is)
  tipCountdown: 10,        // s past zero over which the level's tip drains away to nothing
  // medals on the menu's level cards (levelinfo.js): a delivery on time is a bronze; silver and gold are for
  // this share of the time to spare a clean run in the reference car leaves (1 = as good as that run).
  // gimmicks: how many of a level's gimmicks its card names before "+ n more"
  medals: { silver: 0.45, gold: 0.85, gimmicks: 5 },
  packageMoodBoost: 0.5,   // mood gained by a good car that gets one
  giftOffence: 15,         // s an evil car that gets one is offended: furious, but it drives no differently
                           // (no road rage), and all its throws are at the player; and after that...
  giftSpite: 0.35,         // ...it is only put out: this share of its throws come the player's way

  // TANK RAGE: pieced together from five targets: a package landed on a green target beside
  // the road finds the next piece of the tank, and the fifth starts TANK RAGE. The pieces
  // carry over from level to level (see Game.settleTank)
  tankPieces: 5,
  tankParts: ['rearBody', 'turretHull', 'gunTurret', 'gunBarrel'], // the first four, in order (messages.json: tankParts)
  targetOffset: 5,         // m beyond the pavement the targets stand, out of the car's reach
  // How a target stands, unless the level's theme (its "target": see themes.js) or the target itself (see
  // levels.js) says otherwise: where a wall, a parapet or a row of buildings stands close to the road, the marker
  // moves in front of it or on top of it. Targets (pickups.js) works out where each one is; rendering draws it there.
  //   offset   m beyond the pavement's edge its ring is (the usual: targetOffset; less than 0: in over the shoulder)
  //   height   m above the road the middle of its ring is
  //   style    'post' (on a post from the ground), 'wall' (on a short stalk standing on a wall's or a parapet's
  //            top, `base` m above the road) or 'gantry' (hung from an arm, from a mast `arm` m further out)
  //   beam     true = a beam of light stands over it, to be seen from a distance
  // A ring nearer the pavement than `clear` m could be driven through: it is carried at least `headroom` m up,
  // over the tallest car (whatever the theme or the level asks for). hit: m from its middle, along the road and
  // across it, within which a package has landed on it
  target: { height: 2.7, style: 'post', base: 0, arm: 2.4, beam: false, clear: 1.8, headroom: 4.5, hit: 2.5, styles: ['post', 'wall', 'gantry'] },
  tankRamSlow: 0.15,       // share of its speed the tank loses per unit of mass it rams (a car is 1)
  tankMaxSpeed: 46,        // m/s: a tank is faster than any car in the garage
  tankHeadOnDamage: 0.2,   // share of full health a head-on costs the tank; nothing else hurts it
  cannonRange: 26,         // m ahead of the tank the shell lands
  cannonCooldown: 0.64,    // s
  cannonDirectRadius: 4.5, // m: anything this close to the blast is destroyed outright
  cannonSplashRadius: 11,  // m
  cannonSplashDamage: 63,
  cannonCrit: 3,           // times likelier than usual that a car the splash catches takes a critical hit
  cannonBlastScale: 1.4,   // size of the shell's explosion (fire and debris) against a big wreck's
  cannonSmoke: 0.3,        // and of its smoke: kept light, as the tank drives straight into it
  // broken tracks: a traffic tank's puncture, only ever from a shell's blast or a package's splash. Chance
  // a direct hit, or the splash, breaks a track; then it grinds to a halt (m/s²) and goes nowhere again
  brokenTracks: { direct: 0.35, splash: 0.15, stopping: 18 },

  // chase camera
  camBack: 14,
  camHeight: 11,           // m above the road
  camLookAhead: 10,        // m ahead of the car that the camera aims at: shorter = tilted further down
  camLateralLag: 3.5,      // 1/s, lower = more lag on lane changes
  camFov: 75,
  camFovPortrait: 88,
  camFovSpeedBoost: 10,    // extra degrees at max speed
  camFovFullSpeed: 45,     // m/s that counts as max speed for that


  // messages (the wording is in messages.json)
  // Every time a message spends on the screen is in this one table (messages.js timeFor reads it; nothing
  // else holds a time). A message's time is the first of these that names it: `keys` (its own path in
  // messages.json: 'events.speedFine'), `groups` (its group there: 'zones'), `kinds` (its kind, which is
  // also its colour: see messages.js kindOf), then `default`
  messageTimes: {
    default: 4,            // s a message stays up, where nothing below says otherwise...
    fade: 0.4,             // ...the last of which it spends fading away
    kinds: { reaction: 2, pickup: 4, rage: 4, bust: 7 }, // s, by kind: a driver's reaction, a pickup or an event, TANK RAGE and a car destroyed, a bust
    groups: {},            // s, by group in messages.json, e.g. zones: 3, milestones: 6
    keys: {},              // s, by the message's own path, e.g. 'events.speedFine': 6
    // The sticky ones: a message about something that is still true of the player's car. It is said as any
    // other, on the message lines and for its time above, and then a small icon for it stays under the
    // gauges (`stickyIcons` below; its picture is in render/hudIcons.js, its name in messages.json's
    // stickyNames or mysteryNames) until the condition named here ends, or the car is wrecked or busted, or
    // the run is over. path in messages.json: the condition it lasts for (see the foot of player.js:
    // 'mystery' is "the mystery effect this message is for is running"). Take a line out and that message
    // is an ordinary one again; add one, with a condition that player.js has
    sticky: {
      'events.puncture': 'puncture',                 // a flat tyre, until it is changed (its icon shows the change going on)
      'events.beached': 'beached',                   // stuck in the gravel, until the car digs itself out
      'powerups.badGas': 'badGas',                   // the bad powerups: cheap fuel, for as long as it lasts
      'powerups.heavyMass': 'heavy',                 // ...the extra weight
      'powerups.butterfingers': 'butterfingers',     // ...and no throwing
      'powerups.mystery.noBrakes': 'mystery',        // the mystery effects that are bad news, or change the rules: no brakes
      'powerups.mystery.rickety': 'mystery',         // ...more damage from every knock
      'powerups.mystery.jerk': 'mystery',            // ...every driver against the player
      'powerups.mystery.swapSides': 'mystery',       // ...on the other side: the packages do something else
      'powerups.mystery.blackout': 'mystery',        // ...the lights out
      'powerups.mystery.earthquake': 'mystery',      // ...the road heaving
      'events.infected': 'infected',                 // infected with radiation (a full meter, or an infected car touched): for the rest of the run (radiation.js)
      // (the good ones are left to the pickup status, which names them while they run: toad, angel,
      // invincible, soupedUp, giant, magnet, trafficFreeze; and sundayDrivers, rushHour, carSwap, moodSwing)
    },
    recall: 3,             // s a sticky message's words show again for, when its icon is touched (or the pointer goes over it)
    // the sticky messages' icons: a round badge each, in rows under the two gauges (beside them on a phone
    // held upright, where under them is the road), the oldest first. By the
    // screen's shape: `wide` (a desktop, a tablet), `portrait` (a phone held upright), `short` (a phone on its
    // side: under 480 px high). The ring round an icon drains as its condition runs out. (In play there are
    // three at most: a flat tyre, the gravel, and the one powerup or mystery running)
    stickyIcons: {
      size: { wide: 30, portrait: 28, short: 26 },   // px across
      gap: { wide: 5, portrait: 4, short: 4 },       // px between two, and between rows
      across: { wide: 4, portrait: 3, short: 3 },    // icons in a row before the next row starts (four: the gauges' width; three: short of the TANK RAGE corner, or of the camera's warning)
      shift: { wide: [0, 0], portrait: [0, 0], short: [0, 0] }, // px [right, down] from that place, to move the lot
    },
  },

  // night levels (theme "night"): the player's headlights, two spotlights riding on the car
  headlights: {
    color: 0xfff1d0,
    intensity: 36,         // each
    range: 85,             // m, where the light runs out altogether
    decay: 0.7,            // how fast it fades with distance (0 = not at all, 2 = true to life)
    angle: 0.55,           // rad, half the width of the beam
    penumbra: 0.6,         // share of the beam's edge that is soft
    height: 2.2,           // m above the road they shine from (a little higher than real lamps, so
                           // the light reaches on down the road instead of only skimming it)
    aim: 40,               // m ahead of the car the beams are centred on
    spread: 0.7,           // m either side of the car's centre line
  },
  // ...and every traffic vehicle's: not real lights (too many), a glow laid on the road ahead of it
  trafficBeam: {
    color: 0xffe6b0,
    length: 15,            // m ahead of the vehicle's nose
    width: 6,              // m across at its widest
    strength: 0.5,         // how bright, 0..1
  },

  // ---- the hidden gimmicks level's new things (see levels.js) ----
  // speed cameras (a level's "cameras": cameras.js): passing one faster than its limit is caught
  // on camera. The first time in a run is a fine (off what the run banks), every one after it a
  // bust. Running one over (it is an obstacle) is no offence. A radar detector warns of them: it
  // keeps the car from being caught at all
  speedCamera: {
    limit: 100,            // km/h, unless the level ("speedLimit") or the camera ("limit") says otherwise
    warn: 180,             // m short of a camera the player is warned of it (radar detector or not)
    signAhead: 70,         // m short of a camera its speed limit sign stands, on the shoulder on its side
    // $ the first offence costs, by how far over the limit (km/h) the car was: the last step it reached
    fines: [{ over: 0, fine: 20 }, { over: 10, fine: 50 }, { over: 20, fine: 80 }, { over: 30, fine: 120 }],
    flash: 0.35,           // s the flash lasts
  },
  // a funeral procession (a level's "processions": see Traffic.startProcession): a hearse and its
  // cars, nose to tail, slow, in one lane; no lane changes, no throwing. Crash into any of them and
  // the whole procession is angry with you, and the Jerk mechanic is on the player for jerkTime
  procession: {
    cars: 3,               // cars following the hearse
    kinds: ['commuter', 'wagon', 'minivan', 'suv'], // what they are (all in black)
    paint: 0x151515,
    speed: 11,             // m/s
    gap: 4,                // m nose to tail
    jerkTime: 10,          // s the player is a jerk (the Jerk mystery's effect: everyone hates them) after crashing into one
  },
  // a level crossing (a level's "crossings": crossing.js): as the player comes near (or every so often
  // after), its lights flash and its booms come down across the lanes coming up to it, and a short
  // fast train shoots across the road. Traffic waits at the booms; whatever is on the line is wrecked
  crossing: {
    // set off by when the player will get there, at the speed it is going: so that the train reaches the road
    // this many s after the player would (below 0, before), at random each time: ease off, or put your foot down
    timing: { min: -0.4, max: 1.2 },
    warn: 2.6,             // s of flashing lights before the train reaches the road...
    lower: 1.2,            // ...the booms coming down over the first this many
    raise: 1.0,            // s they take to go back up once the train is clear
    every: { min: 14, max: 24 }, // s between trains after that, while the player hasn't gone by...
    again: 300,            // ...and is within this many m of it
    speed: 80,             // m/s the train goes at...
    cars: 3,               // ...carriages (the hit boxes, whatever train is drawn: see `train`)...
    carLength: 18,         // ...each this long...
    hw: 1.6,               // ...and half this wide
    reach: 300,            // m either side of the road the line runs out to (the train comes from that far, seen coming)
    stopLine: 6,           // m short of the line traffic stops at (the booms stand there)
    boomDamage: 10,        // health a lowered boom costs the player driving through it (it costs no speed: the train is the danger)
    // the train drawn (a crossing's "train", or its theme's; else `usual`): 'bullet', the bullet train's carriages
    // cut down, or 'steam', the Wild West's locomotive, tender, boxcar, two passenger cars and caboose, the
    // same cars x carLength long in all (render/roadside.js draws them)
    trains: ['bullet', 'steam'],
    usual: 'bullet',
  },
  // stop / go roadworks (a level's "stopGo": stopgo.js): the oncoming side dug up, so both ways take
  // turns through the one lane left, a worker at each end turning a STOP / GO sign. Evil drivers
  // may run the STOP
  stopGo: {
    go: 9,                 // s each way gets the GO...
    clear: 5,              // ...with this long between, for the last through to clear (a works can set its own: "go", "clear")
    runChance: 0.35,       // chance an evil driver runs the STOP
    stopLine: 4,           // m short of the works traffic waits at
    coneEvery: 5,          // m between the cones down the middle
  },
  // split carriageways (a level's "splits": see track.js): the oncoming side of the road parts from the
  // player's, runs on by itself, and comes back
  split: {
    apart: 70,             // m the two ways are apart, unless the split says ("apart")
    ease: 320,             // m over which they part, and come back together
  },
  // a fog bank (a level's "fog": { from, to }): the fog closes right in, easing in and out over its edges
  fog: {
    near: 4,               // m the fog starts at, at its thickest (the usual: 120)...
    far: 70,               // ...and where it is solid (the usual: 520)
    edge: 60,              // m it thickens over, at each end
    policeSight: 0.4,      // share of their usual sight the police have in it
    color: 0xc4c9ce,       // its colour under a bright sky. Under a dark one it is mostly the sky's own colour (see
                           // render/roadside.js; a theme can name a "fogColor" of its own instead):
    bright: 0.5,           // how bright a sky (0 .. 1) has fog of that colour and no other...
    dark: 0.3,             // ...and how dark a one has fog that is only...
    lit: 0.25,             // ...this share that colour, the rest the sky's
  },
  // a tunnel (a level's "tunnels": { from, to }): the road goes under cover: the sky and the ground gone, the
  // fog closed in to the tunnel's lamps, the player's headlights on, the engine echoing off the walls
  tunnel: {
    edge: 40,              // m over which the dark closes in at a portal, and opens out again
    near: 10,              // m the fog starts at, inside (the usual: 120)...
    far: 140,              // ...and where it is solid (the usual: 520)
    color: 0x0c0c10,       // the dark of it
    height: 8.5,           // m from the road to the ceiling (raised from 5.6)
    camHeight: 5.5,        // m camera height inside the tunnel (lowered so player views inside)
    camBack: 12,           // m behind the car inside the tunnel
    camEase: 35,           // m over which camera dips before portal and rises after
    lampEvery: 12,         // m between the ceiling lamps
    echo: 0.45,            // how much of the engine comes back off the walls, well inside (0 = none)
  },
  // a burst water main (a level's "waterMains": { s, lane, length? }, see Hazards): a fountain out of its lane for
  // `on` s, then nothing for `off` s, over and over; while it sprays, `length` m of that lane beyond it is under
  // water and as slippery as ice, and dry again as soon as it stops
  waterMain: {
    on: 5, off: 4,         // s it sprays, and s between
    length: 28,            // m of its lane the water covers (a main can set its own: "length")
    warn: 150,             // m short of one ahead that the player is warned
    spread: 1.4,           // s the pools take to spread down the lane as it begins to spray...
    dry: 1.6,              // ...and to shrink away when it stops (the look of it only)
    // on its water the player's car brakes and steers with less grip, as on ice (CONFIG.ice) but by numbers of its own:
    brakeGrip: 0.35,       // share of its braking (or braking by itself for a car ahead) that works on the water
    steerGrip: 0.3,        // share of its steering's grip: of how quickly the car takes up the way it is steered...
    laneSpeed: 0.55,       // ...and share of the speed it moves across the road at, steered
    wetAfter: 45,          // m past its water the tyres stay wet: those three numbers fade back to normal over this distance (ice has no such tail: it lets go the moment the car is off it)
  },
  // rockfall (a level's "rockfall": { from, to, count, side }): rocks tumbling down from that side
  // onto the road as the player comes near. Obstacles: only the player can hit them
  rockfall: {
    height: 22,            // m up the hillside a rock starts...
    out: 14,               // ...this far off the road's edge
    near: { min: 60, max: 130 }, // m short of it the player sets one off
    size: { min: 0.6, max: 1.4 }, // m, a rock's radius
    // (the look of it, render/items.js: a rock waits on the land, and comes down over the land)
    hill: 3,               // m above the road the land must stand, where a rock would wait, to be a hillside: on a level
                           // whose land has none on the side its rockfall names, the rocks wait on the other side's;
                           // with none on either (flat land), each waits on a crag of its own, `height` m tall
    hop: 2.2,              // m high a rock's first bound is, each one after it lower...
    bounds: 4,             // ...this many of them on its way down
  },
  // THE BATTLEFIELD (a level's "battle": see levels.js). Two armies drive at each other down every lane
  // of the road: the player's (good, green), all of it going the player's way, and the enemy's (evil, red),
  // all coming the other way. Each goes after the other's vehicles: the guns (an 8x8's, a tank's) turn and
  // fire on the nearest enemy in range, a jeep lobs packages at one, and each steers for a head-on with an
  // enemy it beats (rank in CONFIG.vehicles: a tank beats an 8x8, an 8x8 a jeep, the player's 8x8 too),
  // which that one tries to dodge (dodge of the time; one it can't beat, and won't wreck by meeting, it always
  // steers clear of). A head-on won costs the winner `win` of its full health; anything else, a jeep against
  // a tank or two of a kind, wrecks both, as usual. Pillboxes beside the road fire bursts (as The Hood's gang
  // houses: CONFIG.gunfire) at the other army, the player included if they are red
  battle: {
    // each army's colours, a shade for each kind so they tell apart at a glance: jeeps light, 8x8s mid, tanks dark
    colors: { good: { jeep: 0x86c95e, apc: 0x3f7a2e, tank: 0x1f4418 }, evil: { jeep: 0xec7a5c, apc: 0xa8281f, tank: 0x5a120e } },
    win: 0.5,              // share of its full health a head-on win costs
    dodge: 0.5,            // chance a vehicle a hunter is after tries to get out of its way
    hunt: 90,              // m ahead a hunter looks for one to run into...
    look: 55,              // ...and a vehicle looks out for one coming at it
    tank: { hunt: 35, laneWait: { min: 7, max: 11 } }, // a tank lumbers: it hunts only this close, and waits this
                           // long (s) between lane changes of its own (hunting, dodging); none on a whim
    goodArmy: { pace: { min: 24, max: 34 }, tankPace: 0.85, overtake: { min: 2, max: 6 } },
                           // the green army advances with the player: its pace (m/s; a tank's this share of it). All of it
                           // comes up from behind the player (as CONFIG.hesitation.behind), this much (m/s) faster than the
                           // player, so as to come by
    evilBehind: 20,        // m behind the player a red vehicle goes up, on its own: past the player it is spent, and
                           // would only thin out the green army coming up from behind
    evilPace: 0.6,         // the red army goes at this share of its usual pace (as CONFIG.vehicles' speed): slower
                           // coming at the player, so there is longer to shoot at it
    goodFire: { reach: 90, behind: 30, rate: 0.6 }, // the green army's override: it fires on any red within reach
                           // (m ahead, or behind), its turret snapping straight to it, rate times as long between shots
    reach: 70,             // m a gun reaches (the player's 8x8's: CAR.cannon)
    near: 12,              // m: no closer than this does a gun fire
    guns: {                // each kind's gun: s between shots, and what its shell does (as CONFIG.cannon*)
      apc: { every: { min: 2.2, max: 3.6 }, direct: 2.8, splash: 7, damage: 45, scale: 0.8 },
      tank: { every: { min: 3, max: 4.5 }, direct: 4.5, splash: 11, damage: 63, scale: 1.4 },
    },
    turn: 2.5,             // rad/s a turret turns
    shellSpeed: 110,       // m/s an army gun's shell flies
    throwEvery: { min: 1.6, max: 3 }, // s between a jeep's packages (at an enemy within CONFIG.enemyThrowCarRange)
    shellOnPlayer: { direct: 50, splash: 20 }, // health an enemy shell costs the player: a direct hit, or near it
    pillboxEvery: 130,     // m between pillboxes, on each side
    mineFlash: { period: 0.9, on: 0.35 }, // s a landmine's light takes to flash round, and the share of it lit
    mineRise: { ahead: 120, time: 0.4 }, // a landmine lies buried (harmless, unseen) until the player is this many m
                           // from it, then pops up out of the dirt over this many s
    pillboxOut: 10,        // m off the road's edge...
    pillboxScale: 1.8,     // ...each this much bigger than its model (a bunker the size of a small house)
    // airstrikes: only a sight (render/battle.js). Every `every` s a pair of jets comes over from behind the
    // player, low (height m) and fast (speed m/s), down one side of the road, dropping a stick of bombs that
    // walk across the fields there: never nearer the road than `out` m beyond its edge, nor further than out + spread
    airstrike: { every: { min: 8, max: 16 }, height: 32, speed: 95, bombs: { min: 5, max: 8 }, out: 14, spread: 45, from: 160, to: 520 },
  },
  // a cyclist peloton (a level's "pelotons": { s, count, speed, trigger, dir }): cyclists riding two abreast
  // along the kerb of the player's side (or, dir -1, the far side, towards the player), setting off as the
  // player comes within trigger m. Obstacles:
  // only the player can hit them, and knocking one off with a police car watching is a bust
  peloton: {
    speed: 9,              // m/s
    trigger: 300,
    spacing: 2.6,          // m between rows
    wobble: 0.18,          // m they weave
    // a good driver gives them room: it eases out past them, room m clear, if nothing is in the way
    // (looking lookout m ahead for them); otherwise it waits behind them. Done once passRoom m past them
    room: 0.5, lookout: 45, passRoom: 4,
  },
  // ---- Gimmick Road 2's (hazards.js; each a list in the level of the same name) ----
  // a school crossing ("schoolCrossings": { s }): as the player comes within `notice` s of it, a lollipop
  // person steps out and holds up a STOP for `hold` s while the children cross. Traffic waits at the
  // line; the player driving over it meanwhile is busted. Then every `every` s, with the player within `again` m
  schoolCrossing: { notice: 4.5, hold: 6, stopLine: 5, every: { min: 14, max: 22 }, again: 260, children: 5 },
  // a hot-air balloon ("balloons": { s, lanes: [first, last] }): set off `notice` s before the player
  // would get there, it comes down from `height` m over `descend` s, sits on its lanes for `sit` s, and
  // lifts off again over `rise` s. On the ground its basket is solid (damage, speedKept: once a landing);
  // traffic in its lanes waits `stopLine` m short of it
  balloon: { notice: 7, height: 40, descend: 5, sit: 7, rise: 3, hl: 2.2, stopLine: 8, damage: 25, speedKept: 0.4 },
  // a drawbridge ("drawbridges": { s }): set off `notice` s before the player would get there: bells for
  // `warn` s (the booms come down), then its two leaves lift over `raise` s, stand open until `open` s
  // after they began, and come down over `close` s. Open, there is a gap between the lips: fast enough,
  // the car goes up the leaf and jumps it; slower, it stops short on the leaf or drops in and is
  // wrecked. Traffic waits `stopLine` m short. Again every `every` s with the player within `again` m
  // (its deck: two leaves `leaf` m long, hinged `leaf` m either side of s and meeting there when down;
  // right up they stand at `angle` rad, each lip leaf * sin(angle) up and drawn back leaf * (1 - cos(angle))
  // from the middle: that is the gap. The car follows the leaf under it, height and pitch: `gravity`
  // m/s^2 (the game's, not the world's) pulls it back down the slope, so too slow it stops short and
  // rolls back at rollBack m/s; off the lip it flies an arc under the same gravity, and comes down on the
  // far leaf or the road beyond (never thrown up faster than `launch` m/s), with landDamage if it lands harder than landSoft m/s into the surface;
  // short of the far lip by more than lipGrace m it goes into the river, `depth` m down. A gap narrower
  // than `step` m is driven over. The booms stand `boom` m out, traffic waits `stopLine` m out. A board
  // `sign` m short gives the speed that clears it hands off (Hazards.bridgeJumpSpeed: every car's top
  // speed is more), so it can always be taken at speed)
  drawbridge: { notice: 6, warn: 2.5, raise: 2, open: 9, close: 2, leaf: 15, angle: 0.5, gravity: 20, rollBack: 5,
    landDamage: 8, landSoft: 7, lipGrace: 1, depth: 1.6, step: 0.6, launch: 12, boom: 19, sign: 150,
    stopLine: 22, every: { min: 16, max: 26 }, again: 320 },
  // a wide load ("wideLoads": { s, lanes: [a, b] }): a load two lanes wide crawling along at `speed`,
  // setting off as the player comes within `trigger` m, its escort `behind` m behind it. It is passed at
  // speed, by timing: the load swings from one side of its lanes to the other and back, `dwell` s at each
  // end and `shift` s between, `swing` m across (or as far as `kerb` m short of the road's edge; never
  // opening less than `gap` m). Left, the way past is on its right (out onto the shoulder: the shoulder's
  // rules apply); right, on its left, in the lane. The arrow board on its tail points to the open side,
  // flashing for the last `warn` s before it shuts. The escort is no policeman: it moves over at
  // escortSteer m/s to stay in front of a car coming up within `sight` m behind it, and holds its line once
  // that car is `commit` s from reaching it: come up on one side of it and jink late.
  // Running into either is a knock (obstacleKinds: damage and speedKept from behind, sideDamage and
  // sideKept alongside), not a wreck: they stay where they are, and there is no bust
  wideLoad: { speed: 9, trigger: 280, behind: 22, dwell: 5, shift: 1.5, warn: 1.2, swing: 3.8, gap: 2.8, kerb: 0.3, escortSteer: 1.2, sight: 70, commit: 1.1 },
  // shopping trolleys ("trolleys": { from, to, count }): rolling across the road with its camber: down
  // from the crown on the straight (accel m/s^2), to the inside of a bend (up to `bend` times that),
  // bouncing back off the kerb with `bounce` of their speed (or a shove of `kick` m/s if they have stopped)
  trolley: { accel: 1.6, bend: 3, bounce: 0.85, kick: 2.2, top: 6 },
  // a marathon ("marathons": { s, lane, count, water? }): runners two abreast in one lane at `speed`,
  // setting off as the player comes within `trigger` m, a pace car `lead` m ahead of them, and (water: s)
  // a water station's tables standing in that lane. Knock a runner down with the police watching: a bust
  marathon: { speed: 4.2, trigger: 300, spacing: 3.2, lead: 14, wobble: 0.12 },
  // a stampede ("stampedes": { from, to, count, kind, road?, exit? }): animals waiting along that
  // stretch (a side road's, usually), which come charging down the road at the player once it is
  // within `trigger` m of the stretch, each at its own `speed`, weaving `weave` m
  // (gone `past` m behind the player, or `run` m down the road from where they waited)
  stampede: { trigger: 240, speed: { min: 9, max: 14 }, weave: 0.8, past: 70, run: 400 },
  // ---- Gimmick Road 3's: the road gambles (gambles.js; each a field in the level, named below) ----
  // a crosswind ("crosswinds": { from, to, dir, strength?, every?, length? }): over the stretch a car is pushed
  // sideways at `strength` m/s^2 times (its height / heightRef) ^ heightPower: `lull` of that all the time, all of
  // it in a gust: every `every` s, for `length` s, building and dying over `rise` s. (The steering answers at
  // CONFIG.steerResponse, so a steady push of a m/s^2 is a drift of about a / steerResponse m/s: a tap now and then
  // holds the lane.) Beside a vehicle at least leeHeight m tall (and no shorter than the car), on the windward side
  // and within leeReach m, the car feels only `lee` of it; as it clears that vehicle the wind is back at once, with
  // a shove of `shove` m/s on top. Traffic feels `traffic` of the push (it drifts in its lane, and leans `lean`
  // rad per m/s^2). Windsocks stand `ahead` m before the stretch and every sockEvery m along it
  crosswind: { strength: 11, lull: 0.4, every: 5, length: 3, rise: 0.6, heightRef: 1.45, heightPower: 1.5, leeHeight: 2, leeReach: 5.5, lee: 0.1, shove: 2.4,
    traffic: 0.35, lean: 0.006, ahead: 90, sockEvery: 150 },
  // crests (no field of their own: a level's segments, their "grade" and "ease"): where the road falls away under
  // the car faster than `gravity` m/s^2 (the game's, as the drawbridge's) can pull the car down after it, the car
  // leaves the ground (by more than `slack` m/s in a step), flies the arc it left on with no throttle, brake or
  // steering, and lands on what is there: harder than landSoft m/s into the ground costs landDamage a m/s over.
  // (A hop lower than `hop` m is not felt.) A crest counts as one where a car at `fastest` m/s or less would fly;
  // one that flies at signUnder m/s or less gets a board with that speed `sign` m before it, and from camFrom m
  // before it to its top the camera comes down to camHeight m and in to camBack m behind the car (easing over
  // camEase m), so the far side is hidden until the car is over. "Airborne" is said after sayAfter s in the air
  // a ramp over the jam ("jamRamps": { s, lane, queue?, lanes? }): a car transporter stopped in that lane, the foot
  // of its ramps at s, its deck a slope `run` m long at `angle` rad up to its lip, with a queue of stopped traffic
  // from there on: `queue` cars in its own lane beyond its cab (the first `gap` m past the lip, then one every
  // `spacing` m), and in each of the level's `lanes` ([first, last]; the player's whole side if not said) from
  // beside its ramps to as far. In line with the ramps (within `half` m) at their foot (the first `foot` m), the
  // car goes up them (the climb takes speed, as up a drawbridge's leaf) and off the lip, on the arc of a crest's
  // flight: over the queue if it came fast enough, landing `margin` m or more past the last car (a board `sign` m
  // before gives the speed that does it hands off), or down into the queue. Beside it the car is kept out of the
  // trailer and its cab (`cab` m past the lip). Traffic coming up its lane moves over from keepClear m before.
  // (A siren within `release` m of its back clears the jam: the queue drives off, and the transporter stays.)
  // (From `commit` m before its foot, in line with it, the car no longer brakes by itself for the queue beyond;
  // on the ramps it is never slower than `crawl` m/s, so nothing comes to a stand on them)
  // (The queue is the level's ordinary traffic no longer than `longest` m (half its length) or taller than `tallest` m)
  jamRamp: { release: 320, crawl: 4, longest: 2.6, tallest: 2.45, run: 15, angle: 0.27, half: 1.5, foot: 3, cab: 3, gap: 6, spacing: 7.5, queue: 4, margin: 5, sign: 170, keepClear: 160, commit: 90 },
  // a low bridge ("lowBridges": { s, clearance? }): a height bar across the player's side and its shoulder, `clearance`
  // m off the road (the bridge's own, or this), between an exit and its merge. A car taller than that which goes at
  // it loses `damage` health (a great deal) and perMetre more for each m too tall, keeps `keep` of its speed, and is through. A bridge is
  // two bars, one over each half of the player's side, the second `stagger` m on from the first, to slalom round. Said
  // from `warn` m before the exit; boards `sign` m before the exit and at it. Tall traffic goes through them without a scratch
  lowBridge: { clearance: 2, damage: 100, perMetre: 40, keep: 0.4, stagger: 60, warn: 260, sign: 200 },
  // a ford ("fords": { from, to, depth? }): the road through a river `depth` m deep (the ford's own, or this), between
  // an exit and its merge: the side road is the bridge. A car wades `shallow` m (crossing 0) to `deepest` m (crossing
  // 1). In water no deeper than it wades it is slowed, to `fast` m/s in next to none and `slow` m/s at its limit;
  // in deeper it crawls at `crawl` m/s and loses `damage` health a second for each m out of its depth. (`bite`: m/s^2
  // the water takes speed off at.) Traffic goes through at `traffic` m/s. Said from `warn` m before the exit;
  // boards `sign` m before the exit and at it. A ford with "fills": { to, over } is a flooded underpass: `depth` m
  // deep as the run starts, rising to `to` m over `over` s; with "underpass": true a railway bridge is drawn over it
  ford: { depth: 0.5, shallow: 0.25, deepest: 1.0, fast: 30, slow: 13, crawl: 4.5, damage: 10, bite: 34, traffic: 8, warn: 260, sign: 200 },
  // speed cushions ("cushions": { from, to, every? }): a row across the road every `every` m (the stretch's own, or
  // this), a cushion `width` m wide and `long` m long in the middle of each lane, a gap on each lane line. A car
  // whose middle is within `line` m of a lane line goes between two and feels nothing (less by each m its half
  // width is over hwRef, never less than `least`). Over one at `soft` m/s or less it is a bump; faster, the car
  // loses `damage` health and perSpeed more for each m/s over, keeps `keep` of its speed, and is thrown up at
  // `throw` m/s for each m/s over (throwMost at most). Traffic takes the stretch at `traffic` m/s.
  // Boards `sign` m before
  cushion: { every: 45, width: 2.3, long: 3, line: 0.45, hwRef: 0.85, least: 0.2, soft: 8.3, damage: 3, perSpeed: 0.25, keep: 0.85, throw: 0.3, throwMost: 6, traffic: 8, sign: 110 },
  // black ice in the shade ("shade": { from, to, side, lanes? }): over the stretch something tall on that side of the
  // road shades the `lanes` lanes of the player's side nearest it (the stretch's own, or this; and the shoulder
  // beyond, on the right), and they are black ice (CONFIG.ice: nothing of it drawn but the shadow). Traffic
  // moves out of them from keepClear m before. Said from `warn` m before; a tree every `tree` m casts it
  // (On black ice steerLoss more of the steering's bite is gone, on top of what ice takes)
  shade: { lanes: 1, steerLoss: 0.9, keepClear: 150, warn: 160, tree: 11 },
  // ruts ("ruts": { from, to }): deep mud over the stretch with a rut down the middle of each lane, `half` m either
  // side of it. In one the car is held (drawn back to its middle at `hold` a second) until it has been steered
  // against for `climb` s: then it is out, `damage` health and 1 - `keep` of its speed the worse, lurching that way
  // at `lurch` m/s (`yaw`: rad/s its tail swings). Between ruts it is slowed to `mud` m/s (crossing 0) .. mudBest
  // m/s (crossing 1), at `bite` m/s^2. Traffic keeps its lane, at `traffic` m/s. A board `sign` m before
  rut: { half: 0.7, hold: 6, climb: 0.45, damage: 8, keep: 0.8, lurch: 2.5, yaw: 1.5, mud: 7, mudBest: 15, bite: 30, traffic: 10, sign: 110 },
  // fresh tarmac ("tarmac": { from, to, lane }): that lane of the player's side is new tar over the stretch, coned
  // off. Traffic moves out of it from keepClear m before and, to its end, goes at `queue`
  // m/s at most. On it, tar builds on the player's tyres, all they hold in `fill` s;
  // off it, it wears off in `clean` s. With the tyres full the car's top speed is down by `slow` of itself (in
  // proportion with less), brought down at `bite` m/s^2. A board `sign` m before; a cone every `cone` m
  tarmac: { fill: 4, clean: 3, slow: 0.9, bite: 45, queue: 8, keepClear: 160, sign: 120, cone: 14 },
  // radiation ("radiation": [{ from, to, lanes?, side? }] and "infectedTraffic": radiation.js). In a radiated area,
  // or within `radius` m of an infected car, the player's car loses `tick` of its FULL health a second and its
  // radiation meter fills in `meterTime` s; out of both, the meter empties again in `meterFall` s (Infinity: it
  // never falls). At `high` of the meter a warning is said; full, the player is infected for the rest of the
  // run and loses `infectedTick` of its full health a second everywhere (in a dose, the greater of the two, not
  // both). Touching an infected car infects at once. The Armour pickup (and a helicopter drop's shield, the
  // SuperCar, a ghost, a tank) keeps all of it out, and stops an infected car's ticking while it lasts.
  // `share` of a radiated level's traffic is dealt out infected (a level's "infectedTraffic" says otherwise) and
  // a clean vehicle driving in an area has `catch` chance a second of catching it, `most` infected about at
  // once; never the kinds in `immune` (nor an emergency, a pursuit, a racer, a convoy...: see Radiation.can).
  // wreckCures: a car wrecked comes back clean (false: infected is for the run). click: s between the counter's
  // clicks with the meter empty (slow) and full (fast). sign: m before an area its warning board stands
  // (At 25 m/s a 200 m area is 8 s: 15% of the car's health and 60% of the meter, so two in a row infect; 13 s
  // in one does it alone. Infected, the whole car lasts 90 s, less what its wrenches give back: a quarter each,
  // 23 s, and what an armour's 12 s stops)
  radiation: { tick: 0.019, meterTime: 13, meterFall: 120, high: 0.75, infectedTick: 0.011, radius: 7, share: 0.12, catch: 0.08, most: 5,
    immune: ['police', 'ambulance', 'tank', 'interceptor', 'getaway'], wreckCures: false, click: { slow: 0.45, fast: 0.07, volume: 0.5 }, sign: 110 },
  // (traffic that one of these slows comes down to its pace over the `reach` m before: perMetre m/s more for each m short of it)
  gambleApproach: { reach: 60, perMetre: 0.25 },
  // the veil over the picture when something takes the view (spray, the sun, dust: see Gambles.veil): it closes
  // at `close` a second and clears at `clear`; the car and what is within `hole` of the picture's height round
  // it are always seen, the veil full from `full` of it out
  veil: { close: 6, clear: 2.5, hole: 0.13, full: 0.42 },
  // truck spray ("spray": { from, to }): a wet stretch. Every moving vehicle `height` m tall or more (faster than
  // `slowest` m/s) drags a cloud `length` m long at fullAt m/s or more (shorter in proportion slower), its own
  // width and `spread` m more either side, widening by a metre to its far end. In it `most` of the view is gone
  // at its tail, less in proportion further back. A board `sign` m before
  spray: { height: 2.2, slowest: 4, length: 45, fullAt: 18, spread: 3.6, most: 0.92, sign: 120 },
  // the low sun ("lowSun": { from, to }): over the stretch the sun is low and dead ahead: `most` of the view is gone
  // (easing in and out over `edge` m at its ends), except in shadow: `shadow` m behind a vehicle for each m of its
  // height, if it is `height` m tall or more and within its own width and `beside` m of the car's line; or under a
  // bridge, in a tunnel, or under a shade's trees. A board `sign` m before; the sun is drawn `far` m ahead of the car, `up` m up
  lowSun: { most: 0.88, edge: 40, height: 2.2, shadow: 9, beside: 0.5, sign: 120, far: 560, up: 46 },
  // a dust trail ("dust": { from, to, wind }): a dry dirt stretch. Every vehicle moving on it (faster than `slowest`
  // m/s) throws a plume `length` m long at fullAt m/s or more (shorter in proportion slower), its own width and
  // `spread` m more either side, carried `drift` m to the side the wind blows to by its far end. In it `most` of
  // the view is gone at its head, less in proportion further back. A board and a windsock `sign` m before
  dust: { slowest: 4, length: 60, fullAt: 16, spread: 0.9, drift: 4.5, most: 0.9, sign: 120 },
  // washboard dirt ("washboards": { from, to }): corrugations right across the road. On them the wheels hop at any
  // speed: the roughness grows with the speed (speed / `full`, to the power `shape`: all of it at `full` m/s or more),
  // and with it steerLoss of the steering's bite is gone, the car wanders (`wander` m/s^2 sideways, to and fro), in a
  // bend it is carried to the outside (`slide` of what the bend asks, speed^2 x curvature, up to slideMost m/s^2), the
  // screen shakes (`shake`) and the wheels rattle (a sound every soundEvery s). And it slows the car: on it there is no
  // going faster than `most` m/s, and one on it faster is dragged down to that at `drag` m/s^2 (never stopped: a car
  // under `most` keeps its speed, and can pull up to it). Boards `sign` m before it; ripples every `ripple` m are
  // drawn across it, in the stuff the theme makes them of (themes.js, WASHBOARDS)
  washboard: { full: 14, shape: 0.6, steerLoss: 0.55, wander: 5, slide: 1.2, slideMost: 10, shake: 0.35, soundEvery: 0.22, most: 18, drag: 4, sign: 120, ripple: 2.4 },
  crest: { gravity: 20, slack: 0.02, landSoft: 7, landDamage: 2, hop: 0.25, fastest: 65, signUnder: 45, sign: 110, camFrom: 90, camEase: 40, camHeight: 6, camBack: 11, sayAfter: 0.35 },

  // photo mode (render/photo.js): the camera starts start.far m from the car, start.yaw round from dead ahead of it
  // and start.pitch up (rad); it comes no nearer than `near` nor goes further than `far`, between `low` and `high`
  // (rad) over the car; turn: rad a pixel of dragging; step: how much a notch of the wheel moves it in or out;
  // aim: m above the road it looks at
  photo: { start: { yaw: 2.5, pitch: 0.32, far: 13 }, near: 4, far: 70, low: 0.03, high: 1.45, turn: 0.006, step: 1.15, aim: 1, fov: 45 },

  // the cargo (cargo.js: what the player is delivering; only a sight) and the delivery at the kerb (delivery.js).
  // An Evil item is agitated with `agitated` of the clock left or less, and furious with `furious` or less
  // (and all through the tip countdown). corner: the picture of it in the HUD: `fov` degrees, turning at
  // `spin` rad/s, and `pulse` s of a flash round it as its state changes.
  // ending: a level delivered (on time or late), the car pulls in and sets it down before the results:
  //   park     s to brake to a stop at the kerb, `least` to `reach` m on from the line,
  //   unload   s for the cargo to come out and be set down, `inset` m in from the road's edge on the car's own
  //            side, the car stopped with its side `beside` m from it,
  //   moment   s of its own there (the furious one misbehaves), then `beat` s more before the results;
  //   skipAfter  s before a key, tap or click skips it (so the key held over the line doesn't);
  //   pan      { from, to }: when (s) the camera leaves the chase view and when it has come round to the kerb;
  //   camera   where it ends up, from the car: m `ahead`, m `out` beyond the cargo (kept short: still over the road, inside any wall or fence), m `up`, and its `fov` (fovPortrait: on an upright screen);
  //   scale    the cargo's size at the kerb (the models are about a metre tall).
  // noEnding: the vehicles that set nothing down (no kerb in space or at sea)
  // (CONFIG.cargo is something else: the load a truck sheds)
  consignment: {
    agitated: 0.5, furious: 0.2,
    corner: { fov: 30, spin: 0.5, pulse: 0.7 },
    ending: { park: 1.7, unload: 1.1, moment: 1.6, beat: 0.5, skipAfter: 0.35, least: 8, reach: 60, inset: 0.8, beside: 1.3,
      pan: { from: 0.25, to: 2.1 }, camera: { ahead: 8, out: 0.4, up: 2.3, fov: 46, fovPortrait: 72 }, scale: 1.5 },
    noEnding: ['ufo', 'jetboat'],
  },

  // scenery
  poleSpacing: 25,
  buildingSpacing: 30,
  dashLength: 3,
  dashSpacing: 9,
};
