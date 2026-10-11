# Moon airtime and a low-gravity gimmick: a proposal (11-Oct). Nothing built.

The owner's question: "Could we look into a special gimmick where Moon levels get more airtime on crests? UFOs too."
Numbers below come from `scripts/moon-airtime.mjs` (headless, seconds: it holds a car at a speed down a level's
crest and lets the real flight code, `Gambles.updateFlight`, carry it with `CONFIG.crest.gravity` set to each figure).

## How it works today

- **One gravity, `CONFIG.crest.gravity = 20` m/s^2** ("the game's, not the world's"; the drawbridge has its own
  `CONFIG.drawbridge.gravity`, same meaning). Real Moon gravity would be 1.6 on the same scale as Earth's 9.8: the
  game's 20 is about double Earth's, to keep flights short.
- **Crests are found from the road's own profile** (`Gambles.buildCrests`, gambles.js): any place where the slope
  falls away faster than `gravity / fastest^2` (fastest = 65 m/s). Each crest has `speed = sqrt(gravity / bend)`:
  faster than that the car leaves the ground. A segment's `grade` plus a short `ease` (6 m) makes one.
- **Launch** (`updateFlight`): the car leaves when the slope drops by more than gravity makes up for in one step,
  keeping the vertical speed `speed * slope` it left on, and its along-road speed. In the air there is no throttle,
  brake or steering (`F.vx`, `F.latVel` held). It flies `vy -= gravity * dt` until it meets the ground again.
- **Landing**: `into = speed * slope - vy` m/s into the surface; more than `landSoft` (7) costs
  `(into - 7) * landDamage` (2) health (scaled by `damageScale`, none under shield / ghost / tank). Every flight
  higher than `hop` (0.25 m) shakes the screen and plays the thud.
- **In the air**: `Player.air` is the height above the road. The car clears a low obstacle if `air > o.h + o.height`
  (collision.js 743: a 0.6 m barrier needs under a metre of air at that s) and traffic if `air > b.height`.
  Pickups have no air check at all (pickups.js): a car in the air collects what it passes through. The camera
  comes down and in for 90 m before a crest a garage car can fly (`Gambles.blind`, "the far side is hidden").
- **Boards**: `CREST nn+ FLIES` is painted by render/gambles.js 110 m before every crest that flies at 45 m/s
  (162 km/h) or less. Nothing is placed in a level for it.
- **Moon levels**: `moon` (Tranquility Base) has four crests (tops at s 410, 2610, 4110, 4370: grade 0.14 / 0.2 with ease 6), the first flying at
  114 km/h (31.7 m/s) with a barrier in lane 3 at s 470, the others at 95 km/h. `farside` (the other
  `moon`-theme level) has four too (970 at 106 km/h, then 2938, 4906, 5146 at 95).
- **UFO**: the Saucer (`LEVEL_CARS.ufo`, `noWheels`, level `ufo`, theme `space`) never runs `updateFlight`
  (`!CAR.noWheels` guard): it has no wheels to leave the ground with, and just follows the road's height. Its level
  has grades up to 0.7 and asteroid fields; its slopes would make four crests that fly at 213 to 230 km/h, above
  the Saucer's own 209 km/h top speed, so even with the guard lifted it would not leave the road today. (The UFO AIR STRIKE mystery in ufostrike.js is a cutscene
  and has no physics.)
- **What pins it**: `scripts/.gimmicks3-check.mjs` section `crest` (gimmick-road-3: 2 crests found from the profile,
  31 m/s flies unhurt in a clear lane, wrong lane lands in the barrier, steering does nothing in the air, 42 m/s
  costs under 40 health, the Commuter flat out never flies, no level without an "ease" has a crest a car could
  fly); `.hazards-check.mjs` for the drawbridge; `delivery-smoke.mjs` (never run unasked). All use the shared
  `CONFIG.crest` and would stay green only if a gimmick leaves the default gravity alone elsewhere.

## Numbers: Tranquility Base's first crest (s 410), car held at the speed to the lip

| gravity | flies at | 25 m/s (90 km/h) | 36 m/s (130 km/h) | 40 m/s (144 km/h) |
|---|---|---|---|---|
| 20 (today) | 114 km/h | no flight | 0.38 s, 14 m, 0.5 m up | 0.62 s, 25 m, 1.0 m up |
| 12 (0.6x) | 88 km/h | no flight | 1.17 s, 42 m, 1.9 m up | 1.42 s, 56 m, 2.9 m up |
| 8 (0.4x) | 72 km/h | 0.95 s, 24 m, 0.9 m up | 1.92 s, 69 m, 4.0 m up | 2.05 s, 81 m, 5.5 m up |
| 5 (0.25x) | 57 km/h | 2.03 s, 50 m, 2.5 m up | 2.80 s, 100 m, 7.7 m up | 2.98 s, 119 m, 9.2 m up |

Landing "into the road" (the damage rule applied to the last step's speeds, so an estimate: the script prints it):
today 4 to 6 m/s (no damage); at 8: about 12 m/s, 10 health; at 5: about 10 m/s, 6 health. The longer flight lands
at a steeper angle on the far slope, so landing damage goes UP before it goes down as gravity falls.
(The owner saw 30 health lost at 130 km/h today; the script's figure for a clear lane is lower, so the real number
includes the landing on the far slope or `damageScale`: not reproduced here.)

A second Moon crest (s 2610, grade 0.2) at 8: 1.8 s, 45 m at 25 m/s; 3.1 s, 124 m, 12.5 m up at 40 m/s: it clears a
queue of traffic and anything on the road beyond it.

## Three options

All three are one number on top of the existing flight code: a level (or theme) setting that replaces
`CONFIG.crest.gravity` for the flight and the crest finder alike. Nothing new in the flight model.

**A. "Low gravity" on Moon levels (moon, farside): gravity 20 -> 8, nothing else.** Longer, higher hops: 2 s and
80 m at 144 km/h over the first crest, and a car at 90 km/h now flies where it did not. Crests fly at 72 km/h
instead of 114: every ramp on the level becomes a launch, so the level's whole length is a gimmick, and the
"CREST nn+ FLIES" boards (45 m/s limit) all say 70+. The landing damage rule stays as is, so landings cost
about 10 health: a price for a longer flight. Barriers beyond a crest are cleared by flying, not threaded
(5 m up at the barrier: the barrier stops being a threat above about 50 km/h, which kills the owner's
"barrier just beyond the top" risk and the reason to steer). Cheap: a `gravity` field on the level.

**B. Low gravity plus floaty steering in the air (`airSteer`).** As A, but in the air the car keeps a fraction
(say 0.3) of its steering response, so a 2 s flight can be nudged back into lane. This changes the "no
steering in the air" rule the check pins (`crest: in the air the steering does nothing`), needs a flag so the
default is unchanged, and makes a moon-only second rule to teach. It answers the risk in A: a long flight with
no control over 80 m is a dice roll with a barrier or a wideLoad beyond. Medium.

**C. Low gravity plus landing forgiveness (`landSoft` 7 -> 11).** As A, but with the soft-landing speed raised so
the long flights land clean (the 12 m/s landings above cost 2 health instead of 10). The risk reward becomes
"fly everything, land anywhere": the crest's cost goes away. Use only if A feels punishing in stills; it leans
away from the owner's stated rule that the crest costs something.

**UFOs.** The Saucer has no flight model; it hugs the road's height. Two ways to give it airtime: (1) the same
low gravity lets it use `updateFlight` (the `noWheels` guard lifted for the Saucer: a one-line change; at
gravity 5 its four crests fly at 106 to 115 km/h, so it would launch off every one of its 0.5 to 0.7 grades, and
it would pass over asteroids only if they follow the same `air` rule: unchecked); (2) leave the Saucer alone and make UFO
airtime a pure-cosmetic hover: its height from the road grows with speed. Option 1 would throw the Saucer
up its 0.7 grades at up to 58 m/s: flights of several seconds (not measured: the script is for the moon level
only), too long unless the saucer is allowed to steer in the air (= option B for it; `agility` 2.8 exists).

## Risks

- **Landing damage rule.** At low gravity the landing is on the far slope at a steeper angle, so health lost goes
  up before it goes down (table). A, B keep the rule and raise the price; C removes it.
- **Pickups.** No air check in pickups.js, so a flight does not skip pickups it passes through; but the cash rows
  placed on a crest were laid for 20-gravity flights (0.6 s, 25 m): a 80 m flight carries the car over several
  pickup rows without a way to take lane. Moon level pickups beyond crests need a look (s 470 onwards on moon: a barrier at 470, a parked car at 520).
- **Replay determinism.** None: flight is a pure function of the profile, speed and `dt`; no random draws. A level
  `gravity` is data, so a replay of a Moon run is the same run, provided the game reads the level's value the
  same way at `Game.start` (`Gambles.buildCrests` runs at load: the setting must be applied before it).
- **Checks.** `.gimmicks3-check` crest section pins the default (gravity 20, `signUnder`, "no level without an
  ease has a crest a car could fly", which would now flag any gravity-8 level with its grade profile).
  `.hazards-check` for the drawbridge shares the number if it is a global change; keep it a level / theme
  setting only. The crest board text (`kmh(c.speed)`) and the `Gambles.blind` camera work from the same
  `crests` list and follow automatically.
- **Whole-level gimmick vs one crest.** A makes every ramp on Moon a launch: the level has four crests;
  the owner's "one idea per level" brief wants the airtime to be what the level is about, so do the crests on
  purpose (placing them where there is room to fly) rather than as a side effect.

## Recommendation

Do A (gravity 8 on `moon` and `farside` only, a level field, default unchanged), with C's `landSoft` left alone,
and place the signs and barriers so a flight has a clear landing. Look at the first crest at s 410 in stills at
72 and 144 km/h and move the barrier at 470 (2 s flights now clear it). UFOs: no change until the owner picks it;
the Saucer would need its own air steering first, and its flights would be long.
