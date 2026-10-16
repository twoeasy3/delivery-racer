# Level archetypes (plan only)

WIP: the audit (section 1) is being written.

## 2. Archetype briefs

Fifteen archetypes: Time Rush first (the owner's), then fourteen more. Each one is a different thing the player is
asked to do, not a different look. A level picks ONE archetype as its idea and keeps a few gimmicks of its theme
that serve it.

Words used below:
- **Clean run**: the ghost's time, flat out with nothing in the way, in the Sportscompact (`cleanrun.js`).
- **Beat**: one thing on the road (a gimmick, an obstacle group); beats closer than 40 m count as one.
- **Cheap** = data and clock only (level JSON, `level-clocks.mjs`). **Small / medium / large** = new code, roughly
  under a day / a few days / a week or more for one agent, before checks and stills.

### 2.1 TIME RUSH (the owner's)

- **Promise:** "You never have enough time, but the road keeps giving you some."
- **The one idea:** the clock starts short of what the road needs. Time pluses keep it alive. The player is always
  chasing the clock and is paid for every risky grab.
- **What the player feels:** the clock is the main enemy, in the corner of the eye all run. Every time plus is a small
  win. A missed plus hurts, but the next one is coming. The car is always flat out.
- **Pacing (by distance):** a short calm start (one easy plus in the first 200 m so the player learns the deal), then
  a plus every 200 to 350 m. Every third or fourth plus is a risky one (a far lane, a gap in traffic, beside a time
  minus). A rest stretch of easy pluses before the last third. The final 400 m: two pluses in a row, then the drop.
- **Clock model:** the start clock is 0.35 to 0.7 of the clean run (Good) and less for Evil. Pluses give 10 s each
  (`CONFIG.timePickup`, `player.js` line 232). Rule of thumb: a good run that gets about 70% of the pluses arrives
  with 5 to 15 s to spare; one that gets under half arrives in the tip countdown (10 s of draining tip, `game.js`
  `tip` getter, `CONFIG.tipCountdown`), and under a third times out. Today's rule (`CONFIG.clock`: 1.5 x clean run,
  less 5 s a plus) does NOT make a Time Rush: it hands back half of every plus up front. Time Rush needs its own rule.
- **Traffic and obstacles:** medium traffic (it is what makes the far-lane plus risky). Few obstacles; they stand
  beside pluses, never on the only way to one. No gimmick that holds the car (no stop/go, no school crossing, no
  drawbridge wait, no ice-cream queue).
- **Pickups and reward:** time pluses are the main pickup, in pairs across two lanes now and then. Time minuses
  (`timeMinus`) stand beside some pluses as the trap, readable at a glance. Cash in rows on the risky line. Silver and
  gold follow time to spare as today (`CONFIG.medals`).
- **Existing mechanics:** `timePlus` / `timeMinus` pickups (`powerups.js`, `player.js`); the clock and tip countdown
  (`game.js`); `level-clocks.mjs` / `cleanrun.js`; exits as short cuts (`track.js`); turbo pickups; boost pads
  (`lanegimmicks.js`) as a speed reward on the plus line.
- **New mechanics needed:** (a) SMALL: a clock rule for the level, for example `"clockRule": { "kind": "rush",
  "good": 0.5, "evil": 0.4 }`, so `cleanrun.js` and `level-clocks.mjs` work it out (share of clean run, no deduction
  for pluses) instead of the level being set by hand. (b) SMALL, optional: a "+10" flash at the clock and a short
  tick-up sound, so each grab is felt. (c) Optional: the medal shares might need their own numbers for a rush level
  (gold means many pluses, not a fast clean line).
- **Fits today:** **City Suburbs (8)** already IS a Time Rush in its data: clock 35 / 25 s (set by hand) against a
  clean run of 104 s; 11 time pluses and 3 time minuses, two of the minuses at the same spot as a plus in the next
  lane. Whether it plays well was not checked (nobody here played it). Pocket Town (event map, suburb) is the next
  candidate.
- **Themes that suit it:** suburb (the owner's pick), market town, theme park, Vegas, city at night.
- **Must NOT happen:** the car is never stopped or held (no gimmick that makes it wait). No bust that the player could
  not avoid. No plus that can only be reached through an unmissable hit. The clock never runs out before the first
  plus can be reached. A minus is never alone in a lane the player is forced into.
- **Risks:** too tight and it is a fail screen; too loose and it is today's clock. Traffic is random, so a plus can be
  blocked: put pluses in pairs on long levels. Real runs are slower than the clean run: tune with a real run, not
  only the ghost.
- **Sketch:** "Paper Round". Suburb, 3 km, two-way, 2 + 2 lanes. Clock 50 s Good / 40 s Evil; 14 pluses, every
  third one in the oncoming lane or beside a minus; speed cushions at the school, one exit short cut with two pluses.

### 2.2 LONG HAUL (endurance)

- **Promise:** "A long road. Stay sharp to the end."
- **The one idea:** distance. The danger is losing focus over a long run, not one big set piece.
- **Pacing:** long calm stretches (800 to 1500 m) with one beat each; three or four "towns" where it gets busy; the
  last town the busiest.
- **Clock:** today's rule (1.5 x clean run) is fine; maybe 1.4. Two or three time pluses at the towns.
- **Traffic and obstacles:** light traffic on the open road, heavier in towns; few obstacles. Tall slow vehicles
  (convoys, wide loads) to pass on the open road.
- **Pickups and reward:** wrenches before the towns (damage piles up over a long run); cash in the towns; a bigger
  tip than usual for the length.
- **Existing mechanics:** `zones` (welcome to each stretch), `trafficZones` / `quietZones` for busy and empty
  stretches, `crosswinds` and `lowSun` (`gambles.js`), `convoys`, `wideLoads` (`hazards.js`), `exits`.
- **New mechanics:** none needed. Optional SMALL: a distance board on the HUD ("12 km to go").
- **Fits today:** Sydney to Kiama (13, 10.5 km, the only long one); Passage du Gois (14, 5.6 km). Endurance Road (an
  event map) is NOT one: it is 2.5 km with a rival.
- **Themes:** coast, outback, desert, ice road, alpine.
- **Risks:** boring if the calm stretches have nothing to look at; level load time and memory on a long road
  (not measured here).
- **Sketch:** "Coast to Coast". 12 km, coast and outback zones, 2 + 2 lanes. Three towns at 3, 7 and 11 km each with
  a time plus and a wrench; low sun on the long straight at 8 km; one crosswind bridge.

### 2.3 ATTRITION (health is the clock)

- **Promise:** "The road wears your car down. Get there in one piece."
- **The one idea:** health, not time, runs out. The clock is loose; damage is what you manage.
- **Pacing:** a steady drain through the middle, with clean "repair" stretches after each harm zone.
- **Clock:** generous (1.6 to 1.8 x clean run, Good). The pressure comes from health.
- **Traffic and obstacles:** things that hurt but never stop: radiation areas, deep fords, gunfire, machinery. Always a
  clean line (another lane, a side road) at a cost in time.
- **Pickups:** wrenches are the "time plus" of this archetype; armour (it keeps radiation out, `radiation.js`).
- **Existing mechanics:** `radiation` and `infectedTraffic` (`radiation.js`), `fords` damage (`gambles.js`),
  `gunfire` (`gunfire.js`), `machinery` (`machinery.js`), wrench and armour pickups.
- **New mechanics:** MEDIUM: today a wreck is a 4.5 s respawn (`CONFIG.respawnTime`), so health does not really
  matter. An attrition level needs a level setting that makes a wreck cost more (for example a share of the tip, or
  a lost cash pile), and a clear health bar. Never "run over" on a wreck.
- **Fits today:** Hot Zone (53, radiation), The Hood (18, gunfire), Battlefield (S9).
- **Themes:** fallout, battlefield, volcano erupting, steelworks.
- **Risks:** players may not read health well; damage must be visible on the car.
- **Sketch:** "Half-Life". Fallout, 4 km. Three radiation areas, each with a clean lane that is slower (washboards).
  Armour before the worst one. Clock 1.7 x clean.

### 2.4 SLALOM (precision)

- **Promise:** "Thread the needle, flat out."
- **The one idea:** obstacles, many of them, all still and all readable. The skill is the line.
- **Pacing:** sections of slalom (200 to 400 m) with short straights to breathe; each section a bit tighter.
- **Clock:** a little tight (1.3 to 1.4 x clean run). Hits cost speed, not time directly.
- **Traffic and obstacles:** little or no traffic. Obstacles themed to the level, in patterns: gates, chicanes,
  zig-zags. Pillars and dead-end lanes as the hard pieces, always signed (`lanegimmicks.js`).
- **Pickups:** cash on the tight line; turbo after a clean section.
- **Existing mechanics:** `obstacles`, `shoulderRows`, `narrows`, `pillars`, `deadEnds`, `boostPads` with handrails
  (`lanegimmicks.js`).
- **New mechanics:** none to start. Optional SMALL: a "clean section" call-out (no hit) with a cash bonus.
- **Fits today:** Construction Site (17, 33 obstacles a km), Oh Mine! (S4, 86 a km), Mall Dash (hidden, 20 a km),
  Steelworks (hidden, 9.4 a km).
- **Themes:** construction, steelworks, mall, toy room, port.
- **Must NOT:** no new MOVING explodable obstacles (the owner's rule). Every obstacle reads at a glance.
- **Risks:** frustrating if the patterns are unreadable at top speed; check the chase camera's view distance.
- **Sketch:** "Yard Run". Port, 3 km, 3 lanes one way, no traffic. Six slalom sections of container stacks and
  mooring posts, a pillar gate in the fifth, a boost pad after each clean section.

### 2.5 TOP SPEED (boost chain)

- **Promise:** "How fast can your car really go?"
- **The one idea:** keeping top speed. The level is built to let a fast car stay fast, and to punish a slow line.
- **Pacing:** long straights, sweeping bends, boost pads in chains, one jump over a jam.
- **Clock:** tight (1.25 to 1.35 x clean run), because the level gives speed back.
- **Traffic and obstacles:** light traffic, spaced so that weaving at speed is possible; few obstacles.
- **Pickups:** turbo pickups and boost pads on the fast line; cash rows that sit on that line.
- **Existing mechanics:** `boostPads` (`lanegimmicks.js`), `jamRamps`, crests (`gambles.js`, a segment's
  `grade` and `ease`), turbo pickup.
- **New mechanics:** SMALL: a boost CHAIN (a second pad within a few seconds adds to the first). Optional SMALL: a top
  speed readout at the drop.
- **Fits today:** Vegas Strip (hidden, three ramps and walkways), Stunt Double (47), Turbo Quay (event map),
  Expressway (1).
- **Themes:** Vegas, airport runway, salt flat, expressway, moon.
- **Note:** top speed is the most important stat. This archetype shows it off, so its numbers need care (a boost
  pad's +12 m/s, `CONFIG.boostPad`).
- **Risks:** a slow car feels hopeless; tier gating must match.
- **Sketch:** "Runway". Airport, 4 km of runway, 4 lanes. Five boost pads in two chains, one jam ramp, a crest. Clock
  1.3 x clean.

### 2.6 HEAT (police gauntlet)

- **Promise:** "Every cop in town is out. Get through."
- **The one idea:** the police. Cameras, roadblocks and patrol cars are the obstacles.
- **Pacing:** quiet streets, then a camera zone, then a roadblock, then a rest; three rounds, each harder.
- **Clock:** normal (1.5 x clean run).
- **Traffic and obstacles:** police in the traffic (more than the usual 0.03 to 0.04 share), cameras, roadblocks with
  a gap always open.
- **Pickups:** siren (the police pull aside), radar detector (through a roadblock), ghost.
- **Existing mechanics:** `cameras` and `speedLimit` (`cameras.js`), `roadblocks` (`traffic.js`), police in
  `traffic`, `trafficZones`, siren and radar pickups, `pursuits` (`pursuit.js`, only a sight today).
- **New mechanics:** none for the gauntlet. LARGE for a real chase (a police car that follows the player): it must
  never bust without a way out.
- **Fits today:** Speed Trap Alley (20), Tokyo Expressway (28), Neon Edge (event map).
- **Themes:** city, Tokyo, Vegas at night, suburb.
- **Must NOT:** no roadblock without a gap or a pickup before it; no camera bust on the first offence (today: a fine
  first, `cameras.js`).
- **Sketch:** "Dragnet". City at night, 4 km. Three camera zones with a radar detector before the last; two
  roadblocks, each with a siren pickup 300 m before.

### 2.7 RUSH HOUR (traffic weave)

- **Promise:** "The road is full. Find the gaps."
- **The one idea:** traffic itself. Few gimmicks, few obstacles, a lot of cars.
- **Pacing:** waves of traffic: thick, then a gap, then thicker.
- **Clock:** normal to a little tight.
- **Traffic and obstacles:** high `trafficCount` (16 is the default; up to the pool of 80 together with oncoming),
  convoys, slow lorries, learner drivers, cars changing lanes. Almost no obstacles.
- **Pickups:** siren (clears a lane), ghost (through everything), cash in gaps.
- **Existing mechanics:** `traffic` mixes, `trafficCount`, `convoys`, `drivers` moods, traffic quirks (learner, boy
  racer, bin lorry), `reversible`, `processions`.
- **New mechanics:** none. Optional SMALL: a near-miss bonus (no such thing today; a search found none).
- **Fits today:** Big Business (4), Ring Road (24), Airport (16 with 14 cars one way).
- **Themes:** city, Mumbai, Hong Kong, Tokyo.
- **Risks:** frame rate with many cars on phones (not measured here).
- **Sketch:** "Gridlock". Mumbai, 3.5 km, 4 lanes. Traffic 30 the player's way, 10 oncoming, two convoys, a
  procession; a siren every 800 m.

### 2.8 BLIND RUN (weather and visibility)

- **Promise:** "You can't see far. Read the road."
- **The one idea:** seeing. Fog, spray, dust, low sun or night hide what is ahead.
- **Pacing:** clear stretches, then a blind patch, then clear: the clear bits show what to expect.
- **Clock:** a little loose (1.6 x clean run): the player will lift.
- **Traffic and obstacles:** medium traffic; obstacles only where there is a tell (a sign, a shadow, a sound).
- **Pickups:** cash behind the tall vehicle whose shadow you sit in (low sun) or upwind (dust).
- **Existing mechanics:** `fog`, `spray`, `lowSun`, `dust` (`gambles.js`, `CONFIG.fog`, `spray`, `lowSun`, `dust`),
  night themes, `tunnels`.
- **New mechanics:** none. Optional SMALL: a horn from cars hidden in fog.
- **Fits today:** Monsoon (56), Mudslide (55), Night Drive (6), Spring Thaw (52).
- **Themes:** monsoon, fjord, desert (dust), coast at dusk, ice road.
- **Must NOT:** never put a hard hit inside a blind patch with no warning.
- **Sketch:** "Pea Souper". Coast at dawn, 4 km. Three fog banks, low sun between them, spray from lorries in the
  last. Cushions before each fog bank as the warning rhythm.

### 2.9 FORK (split route, gamble)

- **Promise:** "Left or right? Choose, and live with it."
- **The one idea:** route choice. The road splits; each branch is a different bet.
- **The owner's version:** a one-way level with forks where, each run, the game makes one branch very good (a short
  cut, time pluses, cash) and the other very bad (longer, washboards, a jam). The player sees it only as the fork
  comes up, or reads a tell (a board, smoke, traffic turning off).
- **Pacing:** a fork every 800 to 1200 m; the branches 400 to 700 m; a calm merge after each.
- **Clock:** set for the bad branch at every fork, so the good branch is the medal and the bad one is still on time.
- **Traffic and obstacles:** light on the good branch, heavy or slow on the bad one.
- **Pickups:** the good branch's reward is visible from the fork if possible.
- **Existing mechanics:** `exits` (side roads that rejoin, `track.js`), `lowBridges` and `fords` (a branch for the
  car you have), `jamRamps`, `washboards`, `quietZones`.
- **New mechanics:** MEDIUM: a fork whose branch content is rolled each run (`exits[n].roll` with two content sets).
  It must use the run's seeded dice so replays still match (`util.js` dice, `replay.js`). A tell: SMALL (a board).
  Note: an exit today is always on the right; a true left/right fork is MEDIUM to LARGE in `track.js`.
- **Fits today:** Market Town (25, side roads), Quarry Run (26, ford and low bridge), Ring Road (24).
- **Themes:** countryside, Wild West, rice terraces, city.
- **Must NOT:** the bad branch is never a dead end, never a stop, never a bust.
- **Risks:** pure luck feels unfair: give a tell, or let the gold medal need the good branch only some of the time.
- **Sketch:** "Crossroads". Countryside, one way, 4 km, three forks. Each run one branch has a short cut and two
  pluses, the other a tractor and washboards. A farm board at the fork shows a clue.

### 2.10 LANE READER (puzzle-ish)

- **Promise:** "One lane is right. Read it in time."
- **The one idea:** lanes close, end or change, and the signs tell you which. The puzzle is solved at speed.
- **Pacing:** a sign, 150 to 250 m to think, the choice, a short rest.
- **Clock:** normal; a wrong choice costs a few seconds, not the run.
- **Traffic and obstacles:** light traffic. Dead ends (shutter or wall), pillars, ruts, low bridges, diversions,
  reversible lanes.
- **Pickups:** cash in the lane that is hard to read; a ghost that lets you through a shutter.
- **Existing mechanics:** `deadEnds`, `pillars` (`lanegimmicks.js`), `diversions` (`roadworks.js`), `ruts`, `lowBridges`
  (`gambles.js`), `reversible` (`traffic.js`), `tarmac`.
- **New mechanics:** none.
- **Fits today:** Mall Dash and Roadworks (both hidden), Metro Run (hidden).
- **Themes:** mall, metro, roadworks, port.
- **Must NOT:** a wall dead end only with a clear sign and bell, always another lane open (the level check already
  reports one that would close the road).
- **Sketch:** "Diversion". Roadworks, 3.4 km. Five lane shifts and two contraflows; one shutter dead end with a ghost
  before it. No other gimmicks.

### 2.11 FRAGILE (careful delivery)

- **Promise:** "Fast, but don't break it."
- **The one idea:** the cargo can be hurt. Bumps, jumps and hits cost the tip.
- **Pacing:** smooth fast stretches, then bumpy ones (cushions, crests, potholes) where you choose to lift or not.
- **Clock:** loose (1.6 x clean run). The pressure is on the cargo, not the clock.
- **Traffic and obstacles:** medium traffic; things that jolt (cushions, potholes, crests, washboards).
- **Pickups:** a "wrench for the cargo" would be new; cash on the smooth line.
- **Existing mechanics:** cargo is shown in the HUD (`cargo.js`, `cargohud.css`) but is only a sight today;
  `cushions`, `potholes`, crests, `washboards`.
- **New mechanics:** MEDIUM: a cargo condition (0 to 100%), hit by knocks and landings, that scales the tip, shown in
  the cargo corner. Never ends the run. The owner has said "no delivery variants" for gimmicks: check this does not
  break that rule (question 6).
- **Fits today:** Christmas Eve (31, presents), Market Town (25), Suburbs (8, cushions).
- **Themes:** Christmas, suburb, Tuscany (wine), rice terraces.
- **Sketch:** "Wedding Cake". Tuscany, 4 km, 2 + 1 lanes. Three cushion runs and two crests on the fast line, a
  smooth but slow side road round each.

### 2.12 RIVAL (head to head)

- **Promise:** "Beat them to the door."
- **The one idea:** another courier. The rival is the clock.
- **Pacing:** the rival starts ahead; mid-level a short cut lets the player pass; the last km is a straight fight.
- **Clock:** loose; the tip goes to whoever is first (`game.js` `tip`: each rival in first takes its share).
- **Traffic and obstacles:** normal; the rival throws packages (`CONFIG.rival`).
- **Existing mechanics:** `rival` and `rivals` in the level, `CONFIG.rival` (pace 0.96 to 1.0 of the player's top
  speed, catch-up), races' grid.
- **New mechanics:** none.
- **Fits today:** Rival Run (S7), Showdown (S8), Toy Box Derby (44), Endurance Road and Dakar Dash (hidden).
- **Themes:** any; best where a short cut exists (an exit).
- **Risks:** the rival's pace ties to the player's top speed, so a fast car is no advantage: the owner may want that
  changed (question 9).
- **Sketch:** "Last Drop". Night city, 4 km. One rival, a side road short cut at 2 km, a jam ramp in the last km.

### 2.13 CLIMB (elevation)

- **Promise:** "Up the mountain and back down, faster than is wise."
- **The one idea:** the road's height. Climbs slow you, crests throw you, descents tempt you.
- **Pacing:** a long climb (calm, switchbacks), the summit (one set piece), a fast descent with crests.
- **Clock:** normal.
- **Traffic and obstacles:** light; slow lorries on the climb to pass; rockfall only under rock faces (the owner's
  rule); ice in the shade on the descent.
- **Existing mechanics:** a segment's `grade` and `ease`, crests (`gambles.js`, `CONFIG.crest`), `rockfall`, `shade`,
  `ice`, the snow and alpine themes' terrain.
- **New mechanics:** none.
- **Fits today:** Mountain Pass (21), Stelvio Pass (30), Panorama Avenue (19), Alpine Pass (hidden), Mudslide (55).
- **Themes:** snow, alpine, favela, Bathurst.
- **Sketch:** "Col". Alpine, 4 km: 2 km of switchbacks up, a tunnel at the top, 2 km down with three crests and shade
  ice in two bends.

### 2.14 RHYTHM ROAD

- **Promise:** "Feel the beat. Drive to it."
- **The one idea:** timing. Obstacles and timed gimmicks come in patterns, like a song.
- **Pacing:** verse (a simple pattern), chorus (the same pattern, faster or doubled), a bridge (a rest), a final
  chorus.
- **Clock:** normal.
- **Traffic and obstacles:** no or little traffic (it breaks the rhythm). Obstacles spaced by speed x beat. Timed
  gimmicks on cycles: portaloos that dance (`potties`: hop, wave, slide... with `period` and `phase`), water mains
  on/off, level crossings, train every few seconds.
- **Existing mechanics:** `potties` (`collision.js`), `waterMains` (`hazards.js`), `crossings` (`crossing.js`),
  `railway` (`bullettrain.js`), `drifters` patterns (existing ones only).
- **New mechanics:** CHEAP version: lay it out by hand at fixed spacing. LARGE version: a level tempo that sets every
  timed gimmick and the music in step.
- **Fits today:** none really. Construction Site (17) has dancing portaloos.
- **Themes:** theme park at night, Vegas at night, toy room, neon city.
- **Must NOT:** no new moving explodable obstacles; timed things are fixed in place.
- **Sketch:** "Disco Lane". Theme park at night, 3 km, 3 lanes one way. Four portaloo rows dancing in step, a water
  main pair, a boost pad on each down beat.

### 2.15 ESCAPE (the threat behind)

- **Promise:** "Something is coming. Keep ahead of it."
- **The one idea:** the world gets worse while you drive: the tide comes in, the volcano goes up, the water rises.
- **Pacing:** it starts mild; set pieces go off at the player's pace (blasts "ahead" of the player); the last third is
  the worst.
- **Clock:** a little tight; the threat is the second clock.
- **Traffic and obstacles:** traffic fleeing too (one way); wreckage across lanes as set pieces.
- **Existing mechanics:** `tide` (rising over the run, `tide.js`), `fords` with `fills` (rising water), `wreckage`
  blasts with `ahead` (`wreckage.js`), `rockfall`, `storm` (sight), `stampedes`.
- **New mechanics:** none for a first one. MEDIUM: a visible wall of threat behind the car (lava, a wave) that slows
  the player if caught, never stops them.
- **Fits today:** Eruption Day (50), Airport Apocalypse (16), Hurricane (5), Passage du Gois (14, the tide).
- **Themes:** volcano, coast, flood, airport.
- **Sketch:** "Last Ferry". Coast, one way, 4 km. The tide rises over the run; two blasts of sea wall ahead of the
  player; the last km on a causeway half under water.

### Parked ideas (not briefed)

- **Escort / convoy pace** (stay near a slow vehicle): needs a new follow-and-protect system (LARGE) and fights the
  "top speed matters most" rule. Parked.
- **Collector / payday** (cash everywhere, small tip): a variant of Slalom or Time Rush rewards; not its own idea.

## 3. Mapping

### 3.1 Every level against an archetype

Actions: **Keep** = leave it. **Retune** = clock, traffic or pickups only (data). **Trim** = take out gimmicks that do
not serve the idea (data). **Rework** = needs new code first. A proposal, not a decision: the owner picks.

| # | Level | Archetype | Action |
|---|---|---|---|
| 1 | Expressway | Top Speed (first taste) | Keep (beginner) |
| 2 | Back Roads | (beginner: side road) | Keep |
| 3 | Farm Lanes | (beginner: animals) | Keep |
| 4 | Big Business | Rush Hour | Retune (more traffic) |
| 5 | Hurricane | Escape | Keep |
| 6 | Night Drive | Blind Run | Retune (clock: see 1.3) |
| 7 | Mystery Meadows | (its own: the mystery pickup) | Keep |
| 8 | City Suburbs | **Time Rush** | Retune: give it the rush clock rule, play it |
| 9 | Australian Capital Territory | Slalom (the train's barriers) | Keep |
| 10 | Monte Carlo | Climb | Retune |
| 11 | Garden City | Rush Hour | Retune (it has no gimmicks at all) |
| 12 | Jewel of the East | Blind Run (night) | Retune |
| 13 | Sydney to Kiama | Long Haul | Keep, trim to wind and sun |
| 14 | Passage du Gois | Escape (the tide) | Keep |
| 15 | Safari | (its own: the animals) | Trim (5 kinds) |
| 16 | Airport Apocalypse | Escape | Keep |
| 17 | Construction Site | Slalom | Trim |
| 18 | The Hood | Attrition (gunfire) | Rework (wreck cost) |
| 19 | Panorama Avenue | Climb | Keep |
| 20 | Speed Trap Alley | Heat | Trim (keep cameras, jam ramp) |
| 21 | Mountain Pass | Climb | Trim |
| 22 | Outback Express | Long Haul | Retune (longer, calmer) |
| 23 | Tour de Coast | Long Haul | Trim |
| 24 | Ring Road | Fork | Trim (keep exits, low bridge) |
| 25 | Market Town | Fragile (or Fork) | Rework (cargo condition) |
| 26 | Quarry Run | Fork (low bridge, ford) | Trim (11 kinds) |
| 27 | Hong Kong Harbour | Rush Hour | Trim |
| 28 | Tokyo Expressway | Heat | Trim |
| 29 | Mumbai Monsoon | Rush Hour | Trim |
| 30 | Stelvio Pass | Climb | Keep |
| 31 | Christmas Eve | Fragile | Rework (cargo condition) |
| 32 | Toy Room | Rhythm Road | Trim (13 kinds) |
| 33 | Twenty Thousand Leaks | Escape (the leaks) | Trim |
| 34 | Tranquility Base | Top Speed (crests) | Trim (13 kinds) |
| 35 | Quiet on Set | Rhythm Road (cues) | Trim (13 kinds) |
| 36 | Acqua Alta | Escape (the tide) | Trim (11 kinds) |
| 37 | Northern Lights | Long Haul | Trim |
| 38 | Thrill Park | **Time Rush** | Retune (rush clock) and trim |
| 39 | Cinder Island | Climb | Trim |
| 40 | Dock Run | Slalom | Trim (14 kinds) |
| 41 | High Noon | Rival (a duel) | Retune (add a rival) and trim |
| 42 | Favela Heights | Climb | Trim |
| 43 | Emerald Steps | Fork (ruts, fords) | Trim |
| 44 | Toy Box Derby | Rival | Trim |
| 45 | Seaquake | Escape | Trim |
| 46 | Far Side | Long Haul | Trim |
| 47 | Stunt Double | Top Speed | Trim |
| 48 | Seven Bridges | Slalom | Keep (already fewer kinds) |
| 49 | After Hours | Rhythm Road | Trim |
| 50 | Eruption Day | Escape | Trim (12 kinds) |
| 51 | Cattle Drive | Long Haul | Trim (14 kinds) |
| 52 | Spring Thaw | Blind Run | Trim |
| 53 | Hot Zone | Attrition | Keep; Rework later (wreck cost) |
| 54 | Night Shift | Lane Reader | Trim |
| 55 | Mudslide | Climb (downhill) | Keep |
| 56 | Monsoon | Blind Run | Trim (14 kinds) |
| S1 | All Heck | Rush Hour (all oncoming) | Keep |
| S2 | Mother Ship | Slalom (asteroids) | Keep |
| S4 | Oh Mine! | Slalom | Keep |
| S7 | Rival Run | Rival | Keep |
| S8 | Showdown | Rival | Keep |
| S9 | Battlefield | Attrition | Keep |
| A1 to A5 | Amphibious | (their idea is the water) | Keep |
| S3, S5, S6, R1 to R3 | Races | (races) | Out of scope |
| hidden | Pocket Town | **Time Rush** | Retune (event map) |
| hidden | Solstice Cliffs | Blind Run (low sun) | Keep |
| hidden | Grand Boulevard | Rush Hour | Keep |
| hidden | Turbo Quay, Vegas Strip / Night | Top Speed | Keep (Vegas: add boost chain later) |
| hidden | Neon Edge | Heat | Keep |
| hidden | Endurance Road | Rival (the name says Long Haul) | Rename or lengthen |
| hidden | Alpine Pass | Climb | Keep |
| hidden | Chianti Run | Fragile | Rework later |
| hidden | Dakar Dash | Long Haul (with a rival) | Keep |
| hidden | Foliage Run | Long Haul | Retune |
| hidden | Haunted Hollow | Blind Run (fog, ghost cars) | Keep |
| hidden | Jungle Highway | Fork (fords, side roads) | Trim |
| hidden | Mall Dash, Metro Run, Roadworks (+ night) | Lane Reader | Keep |
| hidden | Steelworks Run / Night | Slalom | Keep |
| hidden | Test Track, Gimmick Roads 1 to 3, Pile-Up Parade, Singapore GP | (test, screensaver, race) | Out of scope |

### 3.2 New levels to commission

1. **Paper Round** (Time Rush, suburb): the clean Time Rush model, built after Suburbs is retuned and played.
2. **Disco Lane** (Rhythm Road, theme park at night): nothing in the game is a Rhythm Road today.
3. **Crossroads** (Fork, countryside): after the rolled-branch code exists.
4. **Wedding Cake** (Fragile, Tuscany): after the cargo condition exists.
5. **Coast to Coast** (Long Haul, 12 km): the only long level today is Sydney to Kiama.

### 3.3 Cheap (data and clock only) against needs code

| Archetype | Cheap? | Code needed (size) |
|---|---|---|
| Time Rush | Yes to try (a hand-set clock, as Suburbs) | SMALL: a rush clock rule in `cleanrun.js` / `level-clocks.mjs`; optional "+10" flash |
| Long Haul | Yes | optional SMALL: distance to go |
| Attrition | No | MEDIUM: a wreck that costs more than 4.5 s on such a level; a clear health bar |
| Slalom | Yes | optional SMALL: clean-section bonus |
| Top Speed | Yes | SMALL: boost pad chain |
| Heat (gauntlet) | Yes | LARGE only for a real chase |
| Rush Hour | Yes | optional SMALL: near-miss bonus |
| Blind Run | Yes | none |
| Fork | Partly (fixed side roads) | MEDIUM: branch content rolled each run, replay-safe; true left/right fork MEDIUM to LARGE |
| Lane Reader | Yes | none |
| Fragile | No | MEDIUM: cargo condition that scales the tip |
| Rival | Yes | none |
| Climb | Yes | none |
| Rhythm Road | Yes, laid out by hand | LARGE: a level tempo in step with the music |
| Escape | Yes | optional MEDIUM: a visible threat behind the car |

### 3.4 Suggested order of work

1. **Time Rush first** (the owner's ask): the SMALL clock rule, then retune City Suburbs with it, then a real play on
   a phone. Then Pocket Town and Thrill Park.
2. **One cheap pilot per archetype, data only**: Stelvio (Climb), Monsoon trimmed (Blind Run), Construction Site
   trimmed (Slalom), High Noon with a rival (Rival), Sydney to Kiama (Long Haul). Each trimmed to one idea.
3. **Trim the theme levels 32 to 56** to their archetype (data only, a few a batch, each played).
4. **Small code**: boost chain (Top Speed).
5. **Medium code**: Fork rolls, Fragile cargo, Attrition wreck cost; then their new levels.
6. **Large**: Rhythm tempo, Heat chase, only if the owner wants them after the rest.

Every level that changes gets its clock worked out again (`node scripts/level-clocks.mjs <id>`), and a version bump
when merged.

## 4. How to use this doc

1. The owner picks which archetypes he wants (questions 1 and 2 below).
2. For each level to rework or build, pick ONE archetype from section 2. That is the level's idea. Write it in the
   brief as one sentence ("This level is a Time Rush on a suburb").
3. Copy the template below into the level's brief. Fill it in BEFORE touching the level file.
4. Keep only the gimmicks that serve the idea and fit the theme. A level that needs more than three or four kinds of
   gimmick probably has two ideas: split it.
5. The clock comes from the archetype (section 2's "Clock" line), not from the default rule, and is worked out with
   `node scripts/level-clocks.mjs <id>` once the level loads (never `--write` without the owner).
6. In the CHECKLIST item, say which archetype the level is, and what was and was not played.

### Archetype template (one page)

```
ARCHETYPE: <name>
PROMISE (one sentence, to the player): ...
THE ONE IDEA: ...
WHAT THE PLAYER FEELS: ...
PACING BY DISTANCE: start ... / middle ... / last third ... / the drop ...
CLOCK: <share> x clean run (Good), <share> (Evil); time pluses: how many, where
TRAFFIC: how many each way, which kinds, one way or two
OBSTACLES: how many a km, which themed kinds, patterns
PICKUPS AND REWARD: cash rows, pluses, power-ups; what gold means
EXISTING MECHANICS USED: <field names and files>
NEW MECHANICS: <none / small / medium / large: what>
FITS TODAY: <levels>
THEMES THAT SUIT IT: ...
MUST NOT: car never stopped; no bust without counterplay; no new moving explodable obstacles; ...
RISKS: ...
SKETCH (3 lines): name, theme, length, lanes / the set pieces / the clock
```

## 5. Questions for the owner

1. Which archetypes do you want? Strike out any you don't (the 15 in section 2).
2. Time Rush: start the clock at about half the clean run, with a time plus every 200 to 350 m. Too tight, or right?
3. City Suburbs is already a Time Rush in its numbers (35 s for a 104 s road, 11 time pluses). Was that on purpose?
   Keep it as the model?
4. The theme levels (32 to 56) have 10 to 14 kinds of gimmick each. OK to trim each to one idea (data only)?
5. Fork: random each run, or with a clue at the fork (a board, traffic turning off)?
6. Fork: is a side road on the right enough, or do you want a true left / right split (more code)?
7. Fragile cargo (knocks cost the tip): does that break your "no delivery variants" rule?
8. Attrition: may a wreck cost tip or cash on those levels (never stop the car)?
9. Rival pace follows your car's top speed today, so a fast car gains nothing on a rival. Keep that?
10. Show the archetype on the level card (a short tag like "Time Rush")?
11. Medals: same rule for every archetype, or per archetype (gold on a Time Rush = most pluses)?
12. A police car that chases you (Heat): wanted, if it can never bust you without a way out?
13. Should every level's clock be worked out again? Many written clocks are far from what the tool works out (1.3).
