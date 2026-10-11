# Delivery Racer: handover

Updated on 2026-10-10 for whoever picks up the game in this repo. It covers where the game
stands, how it is put together, how the owner likes changes made, and what is not verified.
`README.md` beside this file has the file map, the address-bar shortcuts and the "adding content"
recipes; read that too. `CHECKLIST.md` is the working list of ideas not yet built, and `CHECKLIST-10-Oct.md`
with `SCRATCHPAD-10-Oct.md` the record of the day most of what is below was added. `AUDIT-10-Oct.md` is a
reading of the whole code for faults and waste, with a plan; `CIRCUITS-HANDOVER.md` and `REPLAY-NOTES.md`
cover the real circuits and replays.

## Where it stands

Delivery Racer is a 3D lane-based delivery racing game (three.js, no framework). It was written
in a separate sandbox folder and copied into this repo on 2026-10-04 as a second page of the
site. This repo is the only copy to edit.

| In this repo | What it is |
|---|---|
| `delivery/*.html` | The game's page and six others (power-ups, gimmicks, cargo, good and evil, police, level editor) |
| `src/delivery/` | All game code, levels, CSS, sounds and menu pictures |
| `scripts/delivery-smoke.mjs` | Headless test of the game logic |
| `scripts/delivery-headless.mjs`, `scripts/.*-check.mjs` | The logic loaded without a browser, and two dozen quick checks built on it, each of one thing |
| `scripts/shots.mjs` | Screenshots through a headless browser |
| `scripts/level-clocks.mjs` | Works out a level's clock from a clean run |
| `scripts/circuit-from-osm.mjs` | Makes a circuit's level from its OpenStreetMap loop |
| `vite.config.js` | `environments.client.build.rollupOptions.input` lists every page |

- **It is committed and live.** Pushing to `main` deploys the site, the game with it, through
  Cloudflare's Git integration. There is no staging step.
- **Nothing on the site links to `/delivery/`.** The owner has not said where a link should go.
- **About 56,000 lines** of code, level data and CSS, written between 2026-10-04 and 2026-10-10, much of it
  by several agents at once in git worktrees (`.claude/worktrees/`), merged into `main` one branch at a time.

Content now:

- **57 levels on the menu**, on two tabs. Deliveries: 40 numbered levels (the last nine, ordinary levels
  like the rest though kept in a list of their own, `THEME_LEVELS`, each in a theme built for it: a toy room, an undersea tunnel, the Moon, a film studio, Venice, an ice road, a theme park,
  a volcano island, a container port), 6 special ones (S1 to S6) and 5 amphibious ones (A1 to A5). Races:
  6 (R1 to R6), three of them traced from real circuits (Monza, Spa-Francorchamps, Albert Park), always
  open. All are listed in the README. Five more are hidden (`testbed`, `grand-prix`, `gimmick-road`,
  `gimmick-road-2`, `gimmick-road-3`) and one is the screensaver's.
- **41 garage cars:** 17 gold-star cars in five tiers, 18 Blue Star cars (four at four stars since 2026-10-10:
  the Stainless Gullwing, Rear-Engine Coupe, Snake Roadster and Polygon Truck, which were car ideas; a second season, open
  once level 20 is delivered), 5 amphibious cars, and the Tank.
- **9 earned cars, the 6-star tier:** one for each special level and each of the first three races, owned
  once its level is delivered with enough time to spare (`EARNED_CARS` in `cars.js`; never bought).
- **Super cars:** any garage car in a livery and body kit of its own, lent by the "souped up" mystery
  effect (or `?car=super-<id>`); never owned.
- **Vehicles that belong to levels:** UFO, F1 car, GT car, LMP prototype, jetboat and the
  Battlefield's 8x8. One secret car, the City Bus. On an amphibious level TANK RAGE gives the Amphibious Tank.
- **A Car ideas lot** in the garage: models that are not garage cars yet (`ideas.js`), each of which can be
  picked there and driven: tierless, free, with placeholder figures nobody has balanced; not in traffic, and
  only the one in use is saved. Checked by `scripts/.ideas-check.mjs` and in stills; never driven by hand.
- **18 mystery effects** (`CONFIG.mystery.effects`, `mysteries.js`), ten things to deliver (`cargo.js`),
  50 kinds of traffic vehicle and 38 themes.
- **Amphibious cars and levels (added 2026-10-10):** five garage cars, one at each star level (Sailing
  Herald, Float Van, Toybota, Dampervan, Nissank: the models `herald`, `transporter`, `toybota`,
  `dampervan`, `nissank`), in a section of the garage of their own, open from the start; and five
  amphibious levels, A1 to A5, with water stages and boat traffic, started only in one of those cars.
  The same five are traffic kinds, and there are four boats (dinghy, barge, ferry, pedal boat).
- **Modes beyond delivery:** circuit races with laps and a grid (F1, GT or LMP), rival couriers,
  the Battlefield, two screensavers.
- **Round the game:** a postcards album and a milestones wall (counters kept in the save), a save code to
  take progress to another browser, and the level editor, which is built from one schema of every level
  field (`levelSchema.js`).

## Running and checking it

```
npm run dev                  # Vite + the Flask server; the game is at http://localhost:5173/delivery/
npx vite                     # Vite alone is enough for the game (it uses no /api)
npm run test:delivery        # headless logic test over every level; ends "all checks passed"
npm run test:delivery:quick  # skips driving every level to the finish on both sides
npm run build                # writes dist/client/delivery/ alongside the site
```

About the test:

- **Do not run it unless the owner asks**, not even before a commit. A syntax check is enough
  otherwise.
- The full run takes about 18 to 20 minutes and the quick one about 8 (measured 2026-10-08).
  Run it in the background and log to a file.
- From the Bash tool `npm run test:delivery` fails ("'node' is not recognized"). Run
  `node scripts/delivery-smoke.mjs` directly, with `--quick` if wanted.
- It seeds `Math.random`, afresh for every section and check, so a failure repeats. `--seed=n`
  gives another run of the dice.
- It loads the game's source live through Vite. Do not edit `src/delivery` while it is going.

The quick checks are the everyday tool. After a change run, each by itself, `node scripts/delivery-levels-check.mjs`
(every level builds and starts), `.schema-check.mjs` (every level against the schema, and the schema against
the docs in `levels.js`), `.bundle-check.mjs` (every import resolves, no duplicate keys) and `.hazards-check.mjs`,
and whichever other `scripts/.*-check.mjs` covers what was touched (`ls -a scripts`). `.replay-check.mjs <ids>`
plays a level twice from one seed and wants the same run: every level passes, and a new field set on a pooled
object and never put back is what it catches. Screenshots: `node scripts/shots.mjs <folder> name=<address> ...`.

Things that bit:

- The pages' `input` must be set on the **client environment only**. Setting it at the top
  level `build.rollupOptions` breaks the build, because the Cloudflare plugin's Worker
  environment inherits it.
- `vite.config.js` has CRLF line endings; multi-line string matching against it fails.
- On the owner's machine, `npm` / `npx` only work from PowerShell, not from Git Bash.
- There is no lint step for the game. ESLint was used in the sandbox and was not brought over.
- Every worktree's `node_modules` is a junction to the main checkout's. Never delete it with the worktree
  (remove the link first), and never let two Vite servers share its cache: `logicServer()` in
  `scripts/delivery-headless.mjs` and `shots.mjs` each keep to themselves for that reason. Before that, two
  checks started close together killed one another (`EPERM` in `node_modules/.vite/deps`).
- A visit with a test switch in its address (`?autostart`, `?car`, `?pick`, `?edited`...) saves nothing
  (`Progress.noSave`). To test saving itself, play from the menu.

Screenshots are taken by `scripts/shots.mjs`, which starts a server of its own and drives ONE headless Edge
(or Chrome) for the whole list over the DevTools protocol: `node scripts/shots.mjs out
"bridge=?level=4&ghost&at=1600&ff=4"`. Any size (`--size=390x844` for a phone, with `--scale=3` for its pixel
ratio). An address starting with `?` gets `autostart` added, so the menu is `index.html`. `&cine` gives the
still used for a level's menu picture and `&cine=car` the one for a car's; `--levels=<id> --write` makes the
menu's two sizes of a level's picture (README, "Adding content"). Each line gives the seconds the picture took,
and under it the page's console errors and warnings. The first picture of a run waits for Vite to bundle (ten
seconds on a quiet machine, a minute or two on a busy one); the rest take a few seconds each. At most two runs
take pictures at once on the machine: a third says it is waiting, and waits. A run keeps everything it writes
(the browser's profile and TEMP, Vite's cache) in `%LOCALAPPDATA%\Temp\delivery-shots-run-<pid>-<when>` and
removes it however it ends; a run that was killed outright leaves that folder, and the next run removes it. The
header of the script has the commands for the common jobs.

## How the game is built

- **Logic and rendering are separate.** `src/delivery/*.js` is game logic and never imports
  from `src/delivery/render/`. That is why the test can run without a browser. Logic talks to
  rendering through `FxQueue` (visual effects and sounds) and the `Game.onLoad` /
  `Game.onFinish` hook arrays; car swaps raise a `carchange` window event.
- **A gimmick is a pair of files.** `hippos.js` moves the hippos and does the damage;
  `render/hippos.js` draws them, from a `sync...` call in the frame loop in `main.js`. The
  level field that switches it on is documented at the top of `levels.js`, and its tuning is in
  `config.js`.
- **The cargo is only a sight** (added 2026-10-10). Every delivery level carries one thing for Good and
  one for Evil (`cargo.js`; a level's `cargo`, or dealt from the items no level names, down the menu, so
  every item turns up somewhere). It turns in a round window
  on the right of the HUD, drawn by the game's own renderer into that patch of the canvas
  (`render/cargo.js`: a scissor, no extra WebGL context); an Evil item's state follows the share of the
  clock left. Its tuning is `CONFIG.consignment` (`CONFIG.cargo` is the shedding truck's load).
- **A delivered level ends at the kerb** (`delivery.js`). `Game.finish` fixes the run exactly as
  before and the state is `finished` at once; only the results screen waits (about 5 s, skipped by any
  key, tap or click) while the car, driven by `Delivery.update` in place of `Player.update`, pulls in
  and the cargo is set down. It happens only when rendering has set `Delivery.staged`, so every
  headless script goes straight to the results. Not after a bust, a wreck-out or running out of time;
  not on races, the Battlefield, or in the UFO and the jetboat (`CONFIG.consignment.noEnding`).
- **Models with no game state are kept apart** (`render/*Models.js`, `render/carExtras.js`), so
  the reference pages can show them without loading the game.
- **Everything is in track space.** A position is `(s, lat)`: metres along a road and metres
  sideways. `Track.toWorld(s, lat, out)` turns that into world coordinates and returns the
  heading.
- **Several roads share the `s` number line.** The main road is `-100 .. length + 200`; each
  exit's side road and flyovers live in their own high ranges (from 10000 up).
  `Track.transfer(v)` moves a vehicle between roads at a junction and `Track.along(s)` gives
  a common course distance.
- **Live bindings.** `CAR`, `LEVEL`, `LEVEL_INDEX` and `Track` are `export let`. Importers see
  the new value after `selectCar` / `selectLevel` / `buildTrack`; never cache them at module
  load.
- **Levels are JSON** in `src/delivery/levels/`, documented at the top of `levels.js`, and
  validated when loaded (problems show in the HUD and fail the test). A level is only built
  when a run starts (`Game.load`); the start screen is purely a menu.
- **A level is written as if driving on the right.** `"drive": "left"` shows it as its mirror
  image.
- **Themes are data** in `themes.js`, read by the game and the editor alike; `render/road.js`
  draws their scenery. Any theme can go on any level.
- **Tuning lives in `config.js`.** Car stats are in `cars.js`.
- **Vehicles carry a `bound` tag**, `north` (the player's way) or `south`. Any contact
  between opposite bounds is a head-on that wrecks both. A level's `flow` can make all
  traffic one way, or `mixed`.
- **Collisions only push cars along the road**, never sideways, and the player takes a
  small share of any push (`playerPushShare`). A race level's `nudge` is the exception.
- **Vehicle models** are in `render/models.js`; each returns a group facing +z with
  `userData.body` (the mesh whose material is the paint) and `userData.animate(t)`. Traffic
  kinds with a `model` in `CONFIG.vehicles` reuse them.
- **Saved progress** is kept in local storage (`delivery_racer_progress_backup`: the whole save, the store of
  record, read first). A cookie, `delivery_racer_progress` (`path=/`, so shared across the whole site's
  origin), is the fallback should local storage go: it holds only what is open, the bank, the cars and the
  switches, so it cannot outgrow a cookie's 4096 bytes however many levels there are. Best times and the
  milestone counters are in local storage alone. Level unlocks are counted by position in `LEVELS` (a level added to `THEME_LEVELS` goes in ahead of the
  special levels, so it needs its place in `INSERTED_AT` too). `INSERTED_AT` in `progress.js`
  records every position a level has been put in at, so an older save opens the right levels:
  add to it whenever a level goes in among the others.
- **Sound** is WAV files in `sounds/`, loaded by `render/audio.js`, with synthesised WebAudio
  stand-ins until a file has loaded and for the few sounds that have no file.
- **A water stage does not dig the road out.** A level's `water` stretch keeps the road's geometry:
  `render/water.js` lays a sheet of water 0.32 m over it from bank to bank, with a slipway's concrete
  at each end, and sits whatever floats down into it by its draft. The logic (`water.js`) only ever
  asks `Track.water(s)`, 0 on dry road to 1 in the channel. The player is never stopped by water;
  traffic that cannot float queues on its own shoulder, so the lanes stay open; boats tie up at the
  bank at the end of their reach (a vehicle's direction never changes in this engine, so they do not
  turn back).
- **Level clocks are worked out, not guessed.** `scripts/level-clocks.mjs` times a clean run in
  the reference car and writes `clock: { good, evil }` into the level file.
- **The level editor** (`editor.js`, `editorForms.js`) is built from `levelSchema.js`: one entry there for a
  level field gives it its place-button, form, map drawing and rules. It hands its level to the game through
  local storage (`delivery_editor_level`), played with `?edited`, and uses `?fly` as its 3D view. A level
  from a file or from storage is not trusted: the editor puts its values into the page as text, never as
  HTML, and the game refuses one it cannot build.
- **The traffic is a pool of slots** (`CONFIG.trafficPool`), dealt out again and again. `blank()` in
  `traffic.js` puts back every field a slot carries when it is dealt out and when a run starts, so a new
  field needs no reset of its own; the dealer sets only where the vehicle is and which way it goes.
- **A run is the same twice** given the same seed for `Math.random`, the same inputs, a fixed step and the
  same save (`REPLAY-NOTES.md`). Headless only: in the browser the step varies and rendering shares the dice.
- **Side roads** leave at an exit and rejoin at a merge, or are laid out freely (an exit's own `segments`,
  `out`, `bends`); a crossroads (`junctions`) turns the road a quarter. Most of what a level places can go
  on a side road with `road: 'side'`; the top of `levels.js` says what cannot.
- **Races** are levels with `laps` and a `grid`: a closed loop (`Track` wraps `s`), run-off and gravel traps,
  a results order. The three real circuits come from `scripts/circuit-from-osm.mjs`.
- **Road gambles** (`gambles.js`, tried out on `gimmick-road-3`): crosswinds, crests sharp enough to leave the
  ground over, a transporter's ramps over a queue, low bridges, fords. Each has a fast line that pays and a
  slow one that always works. A police pursuit (`pursuit.js`) is a chase that comes through from behind.
- **The HUD** (`render/hud.js`): a ring for the level's distance, a dial for the shoulder's danger, messages
  kept off the horizon with their times in `CONFIG.messageTimes`, sticky ones that are said as any other and then stay as a small icon by the gauges until what they warn
  of is over (`render/hudIcons.js`), and the running mystery's name in the pickup status.
- **The start screen** is `render/menustage.js` and `render/menu.js`: a stage for the level picked, a strip
  of its group, the car, the side and START; the README describes it.

## How the owner likes changes made

- **Start small.** When a request is large, do the barebones version first and build up.
- **Timebox.** Land a working version and report within about 20 to 30 minutes rather than
  chasing a metric for an hour.
- **A sentence describing how things are now, among requests, is usually the reason** for a
  request, not a new feature to build.
- **Tuning values go in config**, not inline.
- **Level content sits at fixed positions**, the same every run (pickups, obstacles, tractors,
  seeded asteroid fields).
- **No page reloads** for changing car or level.
- **The start screen is strictly a menu.**
- **Screenshot new visual features** and send the images.
- **Report plainly what was and was not verified.**
- **Do not run the smoke test unless asked** (see above).
- Requests arrive as short feature lists; implement each item, then report.

## What is not verified

Gone through on 2026-10-10. The short of it: **nothing added since 2026-10-04 has been played by a person
with this list in hand, and the smoke test has not been run since the day's merges.** What has been done is
headless checks (which all pass) and still pictures from a headless browser, looked at by the agent that
made the thing. So:

- **Audio**: the WAVs replaced the synthesised sounds after this was written; nobody has
  recorded a listen-through.
- **Animations**: the Lowrider's hop, the Junker's shudder, the Love Bus's sway, spin-outs,
  flying tyres, helicopters on slopes, speed-dependent yaw.
- **Touch**: the on-screen buttons and the phone garage on a real device.
- **The amphibious levels (2026-10-10)**: driven only by scripts (`.water-check.mjs`, the clocks)
  and looked at in screenshots. Nobody has played one: how the car feels afloat, whether a wake's
  shove and the currents are too much or too little, prices, tips and clocks are all untested by hand.
  The boat's engine note afloat has not been heard.
- **Balance**: clocks now come from `level-clocks.mjs`, but tips, traffic mixes and pickup
  placement on most levels were not play-tested. The nine themed levels (32 to 40) and the cash rows on
  Stelvio and Market Town were driven only by a ghost probe.
- **The circuits**: no whole lap of Monza, Spa or Albert Park has been watched; the Races tab has not been
  opened by a person. Albert Park has no run-off (none is mapped). Its clock was timed before it was made flat.
- **The menu, the HUD, the garage's tabs, the album and the milestones wall**: seen in stills only. Nothing
  clicked, tapped or swiped by hand; the album and the wall need WebGL and were never run headless.
- **Mystery effects, Super cars, dents, the 6-star cars, horns**: the eight newer effects, the body kit on
  each model, the giant and the blackout have not been seen moving, and no horn has been heard.
- **The road gambles and the police pursuit**: checked by script (`.gimmicks3-check.mjs`,
  `.pursuit-check.mjs`) and in stills.
- **The level editor**: its forms and map were checked by `.schema-check.mjs` and in stills; no level has
  been made in it from nothing by a person.
- **Replays**: exact headless on every level; nothing of it is in the browser.
- **The save**: `.save-check.mjs` saves and loads 100 levels and 80 cars headless, with a stand-in for local
  storage. Not tried in a browser: a save made before the change loading after it, private windows, a phone.
- **The cargo and the delivery at the kerb** (2026-10-10): seen only in headless-browser stills
  (the corner at 1100x650 and 520x900; the ending on Farm Lanes, Expressway, Night Drive, Singapore,
  Tokyo and All Heck). Not seen moving, not heard (the tick as an Evil item changes state, the thump
  as it lands), not tried on a real phone, and the kerb camera was not looked at on every level: a
  finish inside a tunnel, on a bridge, or with something standing on the shoulder may sit badly.
- **The start screen as a game's menu** (2026-10-10; `render/menustage.js`, `menu2.css`, the road card
  `render/levelcard3d.js`): seen only in headless-browser stills at 1100x650, 1400x900, 520x900 and 900x420,
  and worked only by made-up key presses, clicks and one swipe from the address (`?do=`). Nobody has clicked,
  tapped or swiped it by hand, on a desktop or a phone; its two sounds (a step, a choice) have not been heard;
  its animations (the stage sliding in, the backdrop, START's pulse) have not been seen moving. The level
  descriptions were written from the level files, not from playing the levels.
- **Performance on phones**: the heavy levels (Asteroid Run's asteroids, All Heck's cones, the
  long JSON of Oh Mine!).

Known limits:

- Bridges must be on level road. (Hills and exits can be combined, flyovers and all: a side
  road follows the land, no steeper than `CONFIG.ramps.steepest` away from the expressway.)
- A one-way level's exits cannot have flyovers. On a `"flow": "south"` level only the player
  takes an exit.
- Not everything a level places can go on a side road (`road: 'side'`): the top of `levels.js`
  lists what can and what cannot, and the level reports the ones that cannot.
- Only the city theme and an elevated road (Tokyo) dress a side road's own roadside (poles and
  blocks; parapets and piers). Other themes keep their scenery off a side road but put none along it.
- Level crossings and stop / go roadworks must be on straight road.
- Water stages must be on level road, clear of exits, junctions, splits and tunnels, and only on an
  amphibious level. Ambulances, funeral processions and convoys know nothing of the water: do not put
  them on a level that has it. A level's obstacles, potholes and ice patches under a water stage are
  hidden by the water but still there: keep them on the dry stretches.
- On an amphibious level the player drives the best amphibious car owned unless the car in use is
  amphibious: there is no memory of which amphibious car was picked last.
- `scripts/shots.mjs` with `&ff` over about 15 s leaves the camera off the road, on any level.
- Traffic drives straight through most obstacles by design; only the player hits them.
- Two burst-water-main systems read the one level field `waterMains` (`watermains.js` and `hazards.js`), and
  one is never drawn (`AUDIT-10-Oct.md`, C1). The owner has to say which is the game's.
- A level handed over with `?edited` is refused if it has no road or cannot be built, but one whose other
  fields send the track builder round for ever (an exit with no place) still hangs the page: the game does
  not load the schema to check it.
- A level's menu picture is taken from 9 m off the road's right-hand edge. Where a building, a wall or a stand
  is there the picture is of its back, and six seconds from the start is often not where the level's landmark
  is: `scripts/shots.mjs` keeps a place for the camera for such a level (`CINE`: about thirty of them). A
  retake shows other traffic: the frame is never the same twice.
- Never start a headless Edge for each picture, or without a TEMP of its own: every start left a `scoped_dir`
  (up to 394 MB) and a 74 MB `.tmp` in the machine's temp folder for good, which filled the disk on 10-Oct.
  `scripts/shots.mjs` is the pattern to copy (one browser, closed with `Browser.close`, its TEMP and profile in
  a folder that is removed).

## Likely next steps

- The ideas in `CHECKLIST.md`, and what is open in `CHECKLIST-10-Oct.md` (the level progression rework is
  specified there and waits on the owner's answers).
- The findings in `AUDIT-10-Oct.md`: draw calls and what loads before the first run are the large ones.
- Replay in the browser: a generator for the logic alone, a fixed step, recording inputs (`REPLAY-NOTES.md`).
- Add a link to `/delivery/` from the site, once the owner says where.
- Decide whether to bring ESLint over for `src/delivery`.
