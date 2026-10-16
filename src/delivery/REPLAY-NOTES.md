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

## The plan, with the owner's decisions (11-Oct)

Design as (b) above: a recording is the run's seed and set-up plus the player's inputs, each tagged with the logic
STEP it happened on (not the clock). About 0.2 KB a minute.

The owner's decisions:
1. A recording made before a level or the game changed is not played: it says so (a version stamp in its header). OK.
2. Replays are kept when the player wants them: a "Save replay" on the results screen keeps the run (a list of saved
   replays per level, each one deletable), besides the last run. The best run (most time to spare) is kept for the
   ghost. Ghost trials are an extension of the replays, not a separate system.
3. A ghost trial and the rewind mystery: the ghost follows the CLOCK (Game.time), and the best run's path is kept as
   its clock had it: where that run was rewound, the ten seconds it undid are discarded, so a rewind never adds ten
   seconds to the ghost's run. The player rewound in a trial goes back on the clock, and the ghost with it.

Two quirks:
- **Pause:** `Game.update` is not called while paused, so no step passes and nothing is recorded: a pause of any
  length is not in the recording, and playback runs straight through it. The viewer may pause the playback.
- **The rewind mystery** (mysteries.js: a ring of snapshots every 0.5 s, the oldest put back): logic, so it plays back
  by itself from the same seed and inputs. It turns `Game.time` back but not the step count, which is why the inputs are
  keyed by step. It does not restore the random stream, packages or gimmicks: no matter for a replay (the same partial
  restore happens again); the ghost path, which is keyed by the clock, drops the undone samples (decision 3).

### Phase A: the foundation (nothing for the player to see)
1. The logic's own seeded random (`util.js` random / seedRandom): the 133 `Math.random` calls in 23 logic modules
   use it; rendering keeps `Math.random`, so nothing drawn can change what happens. (Words picked for a message:
   cosmetic, kept off the logic stream.)
2. A fixed step in `main.js`: the logic in equal steps of CONFIG.maxStep with an accumulator (today a frame's time is cut
   into unequal steps). It changes the feel of every run a little: the owner tries it on a phone; if it judders,
   rendering interpolates between steps.
3. No clock but the step: the logic checked for `Date.now` / `performance.now` and anything hanging on load timing.
4. `replay.js`: a recorder (steer and throttle quantised, throws, skips; by step) and a player that feeds them back;
   the header: level, side, car, tank pieces, social standing, rival, race class, the seed, the version stamp; a hash
   of the state every 10 s, to tell a recording that has drifted (another browser's maths, say) and stop it kindly.
5. Checks: headless, record through the real recorder and play back to the same state; in a browser, a run with a pause
   and a forced rewind (`?mystery=rewind`) recorded and played back in the page to the same state.

**Phase A: done (11-Oct).** What it came to:
- `util.js` random / seedRandom (mulberry32): 112 calls in 21 logic files use it (`messages.js` keeps `Math.random`:
  which words a message picks; `cleanrun.js` swaps both for its trial runs: swapDice). Two seeds: the level load's
  (`Game.loadSeed`, what the track and its set pieces are dealt with) and the run's (`Game.seed`); a recording holds both.
- `main.js` runs the logic in fixed steps of CONFIG.maxStep (1/120 s) from an accumulator (a frame's time carried, at
  most 0.1 s; nothing carried over a pause). Not yet tried on a phone for judder.
- No logic reads a clock (only the save's counter timing in progress.js, rendering, and the reference pages).
- A run on a level already loaded starts as a fresh load would: obstacles back to their start (`collision.js` o.start /
  restart), the cargo pool's places reset. Every level passes `.replay-check --keep-level`.
- The controls are rounded to 1/64 as they are read (`input.js`), so what is recorded is what was driven; while a
  replay plays, the player's own controls and throws are not heard (`Input.fed`).
- `replay.js` as described in its head. The fingerprints: the build's logic (`__BUILD__.logic`: a hash of the logic
  source files and whatever they import, followed through: vite.config.js logicFiles; a change to words, menus, pages
  or a model that is only drawn leaves it alone; a model a rule measured would be in it), the level's data as loaded, the
  car's figures; and the state every 1200 steps, played back against them (a recording that drifts stops: onDrift).
- Since CHECKLIST 167 (16-Oct): the build's logic is taken by `scripts/logic-hash.mjs` as code (comments and layout
  never count), with each car's own rows and entries and each level's filing left out, so adding a car or a level
  refuses no replay; the header (`prints: 2`) records the car's `figures` (its row, ECU rows, tables by its id, its
  Super version) and the garage's `roster` instead. A header without `prints` plays only under `BUILD.legacy` (the old
  whole-text hash) and is given the prints as the kept replays are read. Check: `scripts/.replay-stable-check.mjs`.
- The build on the front screen, bottom right (under START on a phone): "v1.0.0 · <commit>" (`version.js`).
- Checks: `scripts/.replay-record-check.mjs` (replay group): runs on expressway, tokyo, noon; night and Mystery Meadows
  paused 3 s with keys held and a throw tried, and a forced rewind; a second run on a loaded level; recordings of
  other rules, a changed level, a changed car refused. In a browser (once, Playwright, not a kept script): Mystery
  Meadows driven with the keys, paused 2 s, rewound once, played back with the keys mashed: the same state at steps
  600, 1200, 1800, no drift, no errors.

### Phase B: in the game
6. The last run kept per level and side; "Save replay" on the results screen keeps it in a list (local storage, never
   the save code: a few hundred bytes a minute each); the best run kept for the ghost.
7. "Watch replay" (results) and "Replays" on the level card: playback with a REPLAY badge, pause, exit, 2x / 4x.
   No seeking yet (it means simulating from the start).
8. Playback changes nothing: no tip, medal, milestone, counter or save; the finish is held back.
9. An out-of-date recording says so and is not played.

**Phase B: done (11-Oct).** What it came to:
- `replaystore.js`: local storage, key `delivery_replays` (never the save, its cookie or its code). Per level and side
  the last run (one left in under 5 s is not kept) and the best (delivered, most time to spare; a best made under other
  rules is replaced by the next delivery); up to 40 saved, the oldest going first. Nothing kept on a visit that saves
  nothing (Progress.noSave).
- The results screen: Watch replay, Save replay (then "Replay saved"). After a playback: Watch again, Menu; no
  Restart or Next (Enter still starts a run of the player's own: the playback is ended first, the save as it was).
- The level card: a Replays chip beside "What's on this road" when the level has any; the sheet lists the best and
  last on each side and the saved, newest first: Watch, Save (Saved) / Delete (asked first). One out of date is
  listed, saying why, its Watch off.
- Playing: the REPLAY badge, a speed button beside Pause (1x, 2x, 4x: main.js takes that many steps), Pause, Exit;
  no throw buttons or touch pads (the player's controls are not heard). At its finish the controls come back (to
  skip the delivery at the kerb). A run left part way plays to its last step and is held there ("End of the
  replay"); one that drifts is held where it does ("Replay stopped"); Pause cannot set either going again.
- Nothing is changed by a playback: it plays with the run's own set-up, its TANK RAGE pieces included, and when it
  ends the save is put back exactly as it was (the bank, bests, medals, counters, the pieces), nothing written while
  it played.
- Checks: `scripts/.replay-store-check.mjs` (replay group). In a browser: a run left at 6.6 s, the Replays sheet,
  watched at 4x with its badge, held at its last step, the save untouched after; a delivered run's results buttons,
  Save replay, the sheet with the best and the saved, at 1000x620 and 390x760.

### Phase C: extensions
**The ghost: done (11-Oct)** (render/ghostcar.js, CHECKLIST 76): the best run's path by the clock, the rewound seconds
dropped (decision 3), drawn as a see-through car, with how far ahead or behind; off in the options.
- Ghost time trials (CHECKLIST 30): the best run's path by the clock (decision 3), drawn as a see-through car.
- A replay as a code to share (it may drift in another browser: the hashes catch it).
- Seeking (checkpoints), more cameras.
