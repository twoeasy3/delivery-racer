# Replay system: findings

Written 2026-10-10 on `worktree-delivery-batch`. The question: can a whole run be replayed 1:1
(traffic, rivals, gimmicks and all, on delivery levels and race levels), and what would it take?
This replaces checklist 30's simple translucent ghost, which was not built.

## The short answer

- **Yes, by recording inputs.** With `Math.random` seeded, a fixed timestep and the same inputs,
  the game's logic already replays exactly, headless, on every level tried (list below). One bug
  stood in the way and is fixed (`3731c60`).
- **Not yet in the browser.** Three things there break it, all fixable and all small: the frame
  loop's variable timestep, the rendering drawing from the same `Math.random` as the logic, and
  inputs read live from the keyboard.
- **Recommended first step is done:** `scripts/.replay-check.mjs` proves it, run after run.
  The next step (a fixed step and a seeded generator of the logic's own in the browser) is the
  first one that touches the game itself; it is not started.

## (a) Is the simulation deterministic?

Measured with `node scripts/.replay-check.mjs`: each level is played three times from a script of
inputs (weaving, braking, a package every 2.3 s) at a fixed 1/120 s step, twice from one seed and
once from another. Everything is hashed once a second of game time: the clock, the player, every
vehicle's place, lane, health and kind, every obstacle, and the next number the dice would give
(so one draw more or fewer anywhere shows at once).

- Before the fix: Tokyo and Safari replayed; Expressway, Marina Bay, Bathurst, Mumbai, The Hood,
  Battlefield and Showdown did not.
- After it: all nine replay, hash for hash, and another seed gives another run. The other levels
  are in "Checked levels" below.

Every source of nondeterminism found:

| Source | Where | State |
|---|---|---|
| `Math.random` | 126 lines in 20 logic files (50 in `traffic.js`, 21 in `collision.js`, 8 in `gunfire.js`, 5 each in `packages.js`, `physics.js`, `site.js`, `racewatch.js`) | Seeding the global is enough headless. The smoke test does the same (mulberry32, reseeded per section and per check from an FNV-1a hash) |
| The level build draws from it too | `Game.load` (`track.js`, `Collision.loadLevel`, pickups) runs only the first time a level is started, so a second run on a loaded level started with the dice somewhere else | The check rebuilds the level from the seed each run (`Game.loaded = null`). A replay must do the same, or seed after loading; `--keep-level` shows the difference |
| Timers left over on pooled cars | `traffic.js`: `seek`, `overtake`, `feint`, `attack`, `passFor`, `dodge`, `slingLeft`, `blockWait`, `yieldWait`, `quietWait`, `aheadGap`, `shield`, `laps`, and `packages.js`'s `peltWait`, `pelts`, were only ever set as first used (`car.seek = (car.seek || 0) - dt`), so a car object picked up again carried on from its last use | **Fixed** in `outfit()` (`3731c60`). This was the one real bug; it also meant a second race in a session never started quite like the first |
| Rendering shares the dice | About 300 `Math.random` calls in `render/` (175 in `road.js`, 59 in `wreckage.js`, 26 in `effects.js`), interleaved with the logic's every frame | **Open.** The logic needs a generator of its own (`util.js`: `random()`), and those 126 lines pointed at it. Mechanical, but it touches 20 files |
| Variable timestep | `main.js`: `steps = ceil(dt / CONFIG.maxStep)`, each `dt / steps` long, `dt` being the frame's wall-clock time capped at 0.05 s | **Open.** Wants an accumulator: whole steps of exactly `maxStep` (1/120 s), the remainder carried over |
| Wall clock | `messages.js` reads `performance.now()` to time its two lines. Nothing in the logic reads the result back except to pick a free line, and `Message.pick` draws a random number whether or not the line is shown | Harmless to the simulation. No `Date.now` anywhere in the logic |
| Inputs | `Input.steer` / `Input.throttle` are read from the live key set once a step; `throw`, `horn` and `pause` are events that fire between frames. Touch steering is an analogue value | **Open.** A replay feeds them by step number (see b) |
| `?ff` | Runs `Game.update(CONFIG.maxStep)` in a loop: already fixed-step | Fine |
| What is in the garage | The run depends on the car, the side, `Progress.data.tankPieces`, `Game.rival`, the race class, `?mystery`, and the standing `Social` starts from | Not random, but a recording must carry them (the header in b) |
| Load order, render state | The logic imports nothing from `render/`; the one thing it gets from the page is `document.getElementById` for the screens | None found |
| The level and the tuning | A recording made before a level or `config.js` changed will not replay | Inherent to input recording: stamp recordings with a version and refuse old ones |

## (b) The two designs

**Input recording** = seed + header + inputs + fixed step.

- Header: level id, side, car, tank pieces, race class, rival setting, seed, a version stamp.
- Inputs: one record each time anything changes: the step number (as a delta), steer and throttle
  (a byte each: the touch stick is analogue), and a bit each for throw and horn.
- Measured: the scripted run changes inputs about 70 times a minute, about **0.2 KB a minute**. A
  person steers more: allow 300 to 600 changes, **1 to 2 KB a minute**. A three-minute level is
  under 6 KB, about 8 KB as text.
- Cost: needs the determinism above, in the browser too; replays die when a level or the tuning
  changes; seeking means re-simulating from the start (cheap: the headless check runs the game at
  about ten times real speed).
- Gain: everything is in it for nothing: traffic, moods, packages, gimmicks, rivals, wreckage.

**State recording** = sampled positions of everything.

- Per sample: the player and every active vehicle at 13 bytes (`s`, `lat`, speed as 4-byte floats
  and a byte of state), obstacles near the player at 3. At ten samples a second, measured:

  | Level | Vehicles at once | A minute |
  |---|---|---|
  | Expressway | 19 | about 158 KB |
  | Tokyo Expressway | 27 | about 188 KB |
  | Marina Bay (full grid) | 39 | about 289 KB |

- That is with no heading, no mood, no gimmick state, no packages and no effects; adding them
  roughly doubles it. A three-minute race is about 1 to 2 MB before compression (delta coding
  and deflate would likely bring it to a fifth).
- Cost: every gimmick module must expose what it shows (list in c) and be drivable from a sample
  instead of from `update`; sounds and effects come from `FxQueue`, which would have to be recorded
  too; interpolation across road transfers (`Track.transfer`) and lap wraps needs care.
- Gain: survives changes to levels and tuning; seeking is instant; no determinism needed.

## (c) What race levels add, and what the gimmicks would need

- **Races** (`laps`, `grid`): the grid is dealt by `Traffic.reset` (`placeFixed` / `addRacer`), each
  racer's pace, mood and paint drawn from the dice; laps wrap `Player.s` and `car.laps`; nudges,
  tows, slingshots and wall damage are all inside `Traffic.update` and `Collision.check`. With
  input recording none of it needs anything: Marina Bay and Bathurst replay exactly now. The
  leftover timers above were all race state, which is why races were the ones that failed.
- **Rivals** (`rival`, `rivals`, `?rival`): `Game.start` rewrites `LEVEL.grid` from `Game.rival`,
  so the header must carry it. Showdown replays.
- **`racewatch.js`** (the race screensaver) has no player: a recording of it is a seed and nothing
  else. Its cameras (`render/racewatch.js`) are a ready-made way to watch any replayed race.
- **For state recording only**, each module would need a `snapshot()` / `restore()`:
  `Crossings` (lights, booms, train), `StopGo` (phase), `WaterMains` and `Hazards` (school
  crossing state, balloon, drawbridge leaves, wide load, runners, trolleys, stampede), `Tide`
  (level and waves), `Hippos`, `Elephants`, `Machinery`, `Site`, `Wreckage` (each event's stage
  and its landed pieces), `Gunfire`, `SpeedCameras` (flashes), `BulletTrain`, `UfoStrike`,
  `Packages` (every package in flight), `Pickups` / `Targets`, `Social`, and `Collision.obstacles`
  (moved ones: herds, drifters, potties, cargo). That is about twenty modules, and it is the bulk
  of the work in that design.

## (d) Storage and playback

- **Where:** local storage, a key per level and side (`delivery_replay_<id>_<side>`), never the
  progress cookie (4096 bytes: see checklist 52) and not inside the save code. Local storage allows
  about 5 MB an origin, shared with the main site: input recordings for all 40 levels on both sides
  are about 0.6 MB as text; state recordings would not fit (one race is 1 to 2 MB) and would want
  IndexedDB.
- **Sharing:** an input recording is small enough to go out as a code the way a save does
  (`Progress.exportCode` is the pattern: `DR1.` + base64), or in a link.
- **Camera:** playback is an ordinary run with the inputs fed in, so every camera works as it is:
  the chase camera, `?fly` (`render/fly.js`, which freezes the level now and would need to let it
  run), photo mode (`render/photo.js`, on pause), `?cine`, and the race screensaver's trackside
  cameras (`render/racewatch.js`) for races.
- **Ghost:** the translucent best-run car falls out of this for free: play the recording in a
  second, hidden simulation and draw only its player. Not needed as a separate feature.

## (e) Recommendation and plan

Input recording. It is two orders of magnitude smaller, it asks nothing of the twenty gimmick
modules, and the hard part (is the logic deterministic?) is now answered and checked.

1. **Done:** `scripts/.replay-check.mjs` (and `.replay-trace.mjs`, which names the call where two
   runs first part). Run it after any change to the logic: a new lazily set timer on a pooled
   object is exactly what it catches.
2. **Next, small:** a `random()` in `util.js` with `seedRandom(n)`, and the logic's 126 lines that call `Math.random`
   moved to it (rendering keeps `Math.random`). Then a fixed-step accumulator in `main.js`. The
   check moves to seeding that instead of the global. No visible change to the game.
3. **Recorder and player** (`replay.js`, logic): `Game.start` takes a seed (drawn, or a
   recording's) and rebuilds the level from it; the recorder notes input changes by step; the
   player overrides `Input` by step. A headless check: record a scripted run, play it back, same
   hashes.
4. **In the game:** keep the best delivery's recording per level and side; a "Watch best run"
   button on the level card; exit and pause as in the screensavers.
5. **Then:** the ghost (a second simulation), export of a recording as a code, a free camera
   during playback.

Risks to know: floating point is the same across browsers for `+ - * /` and `Math.sqrt`, but
`Math.sin`, `Math.cos`, `Math.atan`, `Math.pow` and `Math.exp` are not guaranteed bit-identical
between engines, so a recording made in Chrome may drift in Safari or Firefox. Replays on the
machine that made them are safe; shared ones need testing, or a sampled-state check every few
seconds to detect drift.

## Checked levels

`node scripts/.replay-check.mjs <ids>`: the same seed and inputs give the same run, 2026-10-10.

- Expressway, Tokyo Expressway, Marina Bay, Mount Panorama, Mumbai Monsoon, Safari, The Hood,
  Battlefield, Showdown: all pass (60 s of game time each, or to the end of the run: the script's
  weaving gets the car busted out on some levels inside a minute).

### Every level, later on 2026-10-10

The check run over all 53 levels (48 on the menu, 5 hidden), 60 s each: 31 replayed exactly, 17 did not, and
the 5 amphibious levels never started (the check owned no amphibious car). Four causes, all of the same
kind, state that outlives a run:

| Source | Where | State |
|---|---|---|
| The save | `Progress.data.stats` carries on from the run before, and a milestone reached says so with a line picked by the dice (`milestones.js` through `Message.pick`): one draw more in one run than the other. `tankPieces` is kept too | Not a fault: it is "what is in the garage" above, and a recording's header must hold it. The check now puts the save back before each run. With it, 13 of the 17 replay (and Ford, once it could start) |
| Everything else on a pooled car | `hunt`, `huntRole`, `shoulderRun`, `oncoming`, `boosts`, `damageScale`, `spinIce`, `hitBy`, `hitAt`, `sideTick`, `checkWait`, `squeeze`, `passSide`, `inGravel`, `wrongHorn`, a pursuit's `aimLat`... set as first used, in six files, and never put back | **Fixed**: `blank()` in `traffic.js` puts back every field a slot carries, whoever set it, when the slot is dealt out and when a run starts. No list to keep. Market Town, Spa, the test track and Gimmick Road |
| The queues at the water's edge | `Water.queues`, counted on the last step of the run before, read by `Water.allows` as the first traffic is dealt out | **Fixed**: `Water.reset()`, from `Traffic.reset`. Slipway and Harbour |
| The last contacts | `Collision`'s `tick` never went back to 0, and the player kept `sideTick`, `hitBy`, `hitAt` | **Fixed** in `Collision.resetObstacles` (it parted no run in the check, but it is the same fault) |

After: all 53 replay exactly, and another seed gives another run on each.
