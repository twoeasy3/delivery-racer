# Delivery Racer

A lane-based 3D delivery racer, built with three.js and Vite. Drive a parcel to the drop before
the clock runs out, as Good or as Evil, through traffic that has moods and holds grudges. It has
57 levels on the menu (51 deliveries and 6 races), 37 cars in the garage (five of them amphibious), nine more to be
earned, two screensavers and a level editor.

`HANDOVER.md` beside this file covers how the game is put together, how the owner likes changes
made, and what is not verified. `CHECKLIST.md` is the working list of ideas.

## Running it

The game is a second page of this site, served at `/delivery/`. Its pages are in `delivery/` at
the top of the repo; the code is here in `src/delivery/`.

```
npm run dev                  # then open http://localhost:5173/delivery/
npx vite                     # Vite alone is enough for the game (it uses no /api)
npm run build                # builds it along with the rest of the site
npm run test:delivery        # headless check of the game logic on every level (about 18 min)
npm run test:delivery:quick  # the same, without driving every level to the finish (about 8 min)
```

The test is seeded, so a run is repeatable (`--seed=n` for another run of the dice). It loads the
game's source live through Vite: don't edit `src/delivery` while it is going.

Quicker checks, each of one thing, are `scripts/delivery-levels-check.mjs` (every level builds and starts) and
the `scripts/.*-check.mjs` files (`ls -a scripts`): run one with `node`. They are all built on
`scripts/delivery-headless.mjs`, and any number can run at once, from any worktree.

Controls: arrows or W A S D to steer, accelerate and brake, Space to throw a package, P to pause,
Enter to confirm. On a phone or tablet the on-screen controls come on by themselves.

## The pages

| Page | What it is |
|---|---|
| `delivery/index.html` | The game: start screen, garage, HUD |
| `delivery/powerups.html` | Every pickup, its model and what it does |
| `delivery/gimmicks.html` | Everything the levels throw at the player, and where |
| `delivery/cargo.html` | What is being delivered: the ten items, the Evil ones in their three states, and which levels carry what |
| `delivery/sides.html` | Good and Evil: what the side changes, how drivers take you |
| `delivery/police.html` | What gets the player busted and what it costs |
| `delivery/editor.html` | The level editor |

The five reference pages read their numbers from `config.js` and their wording from
`messages.json`, so they stay true as those change. A new page needs an entry in the client
`input` in `vite.config.js`.

## Address-bar shortcuts

All on `/delivery/`. Nothing below saves progress: a visit with `?autostart`, `?hidden`, `?test`, `?edited`,
`?pick`, `?car`, `?ghost`, `?mystery` or `?theme` in its address writes nothing to the save at all, whatever is
delivered, bought or counted in it (`Progress.noSave`).

| In the address | What it does |
|---|---|
| `?autostart`, `?autostart=evil` | Skips the start screen and starts a run |
| `&level=3` | Picks that level (by its position on the menu), locked or not |
| `&at=1650` | Starts that many metres along |
| `&ff=5` | Runs the game five seconds before the first frame |
| `&speed=31`, `&lane=4` | Starts doing that many m/s (hands off, it holds), and in that lane: for pictures |
| `&car=lowrider` | Drives that car, owned or not |
| `&theme=snow` | The level in that theme, whatever its own |
| `&rival`, `&rival=evil`, `&rival=good` | A rival courier on any delivery level |
| `&mystery=toad` | Every mystery pickup is that one |
| `&gt`, `&lmp` | Every race in GT cars or Le Mans prototypes |
| `&fly` | Freezes the level and gives a free camera (`render/fly.js`) |
| `&cine`, `&cine=car` | A still for the menu: the level, or the car alone on white. The level's camera can be moved: `&cineside=left`, `&cineout=2` (m beyond the road's edge; below 0, over the road), `&cineup=12`, `&cineback=40` |
| `?hidden=gimmick-road` | A hidden level, by id (see below); `&evil` plays it as Evil |
| `?test` | The hidden test track (`?hidden=testbed`) |
| `?edited` | The level as the editor left it (one that cannot be built is not started: the menu, with a line saying why) |
| `?garage`, `?garage=evil` | Opens the garage; `&hover=tank` shows that car's stats |
| `?garage&tab=ideas` | The garage on its Car ideas tab; `&look=bug` looks at one, `&studio=bug,limo` (or `all`) shows those alone on a plain floor, for pictures (`&views=3` adds a side view) |
| `?screensaver` | The traffic screensaver |
| `?racewatch` | The race screensaver; `&camcheck` logs a check of its cameras |
| `&touch` | Shows the on-screen controls on a desktop |
| `&cargostate=2` | An Evil run's cargo in that state (0 calm, 1 agitated, 2 furious) whatever the clock says |
| `&hudcheck` | Every part of the HUD showing at once and held there, for a picture: the shoulder's dial most of the way up, a flat tyre, a mystery running (`&mystery=` names it), two messages. With `&touch` and a level with a speed camera just ahead (`&level=20&at=760`) nothing is left out. `&hudcheck=many`: six sticky icons at once (in play three is the most); `=one`: a flat tyre just had, its message up with its icon; `=later`: the same left to run, so the icon alone; `=icons`: all eleven icons |
| `&rage`, `&pieces=3` | In TANK RAGE from the start (on an amphibious level: in the Amphibious Tank, which is only ever that level's rage vehicle, never a garage car); that many pieces of the tank found already. `&cine=car&turn=120` turns the studio camera that many degrees round the car |
| `&deliver=3.5` | Stops the delivery at the kerb that many seconds in, for a picture (with `&at=` just short of the finish and `&ff=14`) |
| `&pursuit=3` | A police pursuit set off 3 s into the run, on any delivery level; `&pursuitbehind=60` starts it that far behind |
| `?pick=41` | The menu with that level picked, every level open for the visit (a look at its card); `&start` presses Start Game too |
| `?cursor=47` | The menu with that level on its stage, open or not (a locked one stays locked) |
| `?side=evil` | The menu as Evil for the visit (not saved) |
| `?options`, `?road` | The menu with its options sheet open; with the "what's on this road" card open on the level picked |
| `?do=key:ArrowRight,key:KeyE,click:%23startBtn,swipe:left` | Works the menu from the address, a step every 150 ms: for checking its controls |

An amphibious level started from the address with no amphibious car owned is driven in the Float Van for
that visit (or `&car=toybota`). On `gimmicks.html`, `?group=vehicles` shows that group alone, and
`&from=6` only its cards from the sixth on.

## Where things are

Game logic lives in `src/delivery/*.js` and never imports from `src/delivery/render/`, so it runs
without a browser (that is what the test does). Everything positions itself in track space:
distance along a road (`s`) plus a sideways offset (`lat`).

The core:

| File | What it holds |
|---|---|
| `config.js` | Every tuning value: how things behave. Traffic vehicles are `CONFIG.vehicles` |
| `levels.js`, `levels/*.json` | One JSON file per level: where things are. The format is documented at the top of `levels.js` |
| `themes.js` | The looks a level can have: colours and scenery, as data |
| `cars.js` | The garage's cars, the levels' own vehicles, the secret ones |
| `progress.js` | Saved progress: the whole of it in local storage, and the short of it (what is open, the bank, the cars) in a cookie as a fallback |
| `messages.js`, `messages.json` | The lines that pop up during a run |
| `levelText.js`, `levelText.json` | Every level's name and its description for Good and for Evil, by level id, in one file; `levelName(level)` and `levelDescription(level, evil)` read it, falling back to the level's own `name` and `description` |
| `input.js` | Keys and touch turned into named actions and axes |
| `track.js` | Builds the level's roads, lanes, ramps, flyovers and junctions; checks the level data |
| `physics.js` | Helpers shared by all vehicles: damage, spin-outs, road limits, the effects queue |
| `player.js` | The player's car |
| `traffic.js` | Traffic: spawning, lane keeping, moods, grudges, police, races |
| `collision.js` | Hitboxes, crashes, obstacles and animals |
| `packages.js` | Thrown packages and cannon shells |
| `pickups.js` | Pickups and TANK RAGE targets |
| `social.js` | A good player's standing with the public |
| `game.js` | Game state, countdown clock, tip, results |
| `cargo.js` | What each level's player is delivering, for each side (a level's `cargo`), and an Evil item's state by the clock |
| `delivery.js` | The ending of a delivered level: the car pulls in and the cargo is set down at the kerb, then the results |
| `main.js` | Entry point, address-bar shortcuts and the frame loop |

One file per gimmick, each the logic for a level field of the same name:

| File | What it holds |
|---|---|
| `cameras.js` | Speed cameras: fines and busts |
| `crossing.js` | Level crossings: lights, booms, the train |
| `stopgo.js` | Stop / go roadworks |
| `tide.js` | The sea coming in over a causeway |
| `water.js` | Water stages: the road as a channel to float across, the queue at its edge, boats |
| `hippos.js`, `elephants.js` | Animals that destroy whatever they touch |
| `machinery.js`, `site.js` | A construction site's machines and shoulder works |
| `wreckage.js` | Scripted destruction: tankers, airliners, quarry blasts |
| `gunfire.js` | Gang houses, drive-bys, and the Battlefield's pillboxes |
| `bullettrain.js`, `ufostrike.js` | Two of the mystery pickup's effects |
| `racewatch.js` | The race screensaver: the race and its timing |

Rendering and the rest:

| File | What it holds |
|---|---|
| `render/scene.js` | Renderer, camera, lights |
| `render/road.js` | Road, ground, sky and every theme's scenery |
| `render/models.js` | The animated vehicle models |
| `render/cars.js`, `render/items.js` | Vehicle and obstacle meshes kept in step with the logic |
| `render/*Models.js`, `render/carExtras.js` | Models with no game state, shared with the reference pages (`boatModels.js`: the water stages' boats) |
| `render/<gimmick>.js` | Draws the gimmick of the same name |
| `render/audio.js` | Sound: the WAVs in `sounds/`, with synthesised stand-ins |
| `render/cargoModels.js`, `render/cargo.js` | The cargo's models; and the cargo drawn, in its corner of the HUD and at the kerb |
| `render/hud.js`, `render/garage.js`, `render/touch.js` | HUD, garage, on-screen controls |
| `render/menustage.js`, `render/menu.js`, `menu2.css` | The start screen: the level stage, strip, car, side and keys; its options and the results buttons; its look |
| `levelinfo.js`, `render/levelcard3d.js` | What the menu says of a level (medals, what is on its road); and the "what's on this road" card |
| `powerups.js`, `gimmicks.js` | The catalogues of pickups and gimmicks: wording, and each gimmick's model. Shown by their pages and by the road card |
| `render/modelviews.js` | A model turning in a small canvas of its own, all drawn by one renderer off the page: how the pages and the road card draw their models |
| `editor.js`, `poweruppage.js`, `gimmickspage.js`, `sides.js`, `police.js`, `cargopage.js` | The other pages' scripts |
| `levelSchema.js`, `editorForms.js` | Every level field's shape, settings, rules and help (what the editor is built from, and `scripts/.schema-check.mjs` checks levels against); the editor's form controls |
| `sounds/`, `levelshots/`, `carshots/` | WAVs, and the menu's pictures of levels and cars |
| `scripts/delivery-smoke.mjs` | The headless test |
| `scripts/delivery-headless.mjs` | The game's logic loaded without a browser, for a check or a probe (`boot()`); `logicServer()` is its Vite server, which shares nothing with any other run |
| `scripts/shots.mjs` | Screenshots through headless Edge or Chrome: of any address, of every level's menu picture (`--levels`), of every car's (`--cars`) |
| `scripts/level-clocks.mjs` | Works out a level's clock from a clean run |

## The levels

Levels unlock in menu order, each by delivering the one before.

The menu has two tabs. Deliveries holds the numbered, special and amphibious levels; Races holds the lapped
ones, which are always open and open nothing.

- **Main levels (1 to 40):** Expressway, Back Roads, Farm Lanes, Big Business, Hurricane, Night
  Drive, Mystery Meadows, Suburbia, Canberra, Monte Carlo, Singapore, Singapore II, Sydney to
  Kiama, Passage du Gois, Safari, Airport Apocalypse, Construction Site, The Hood, Panorama
  Avenue, Speed Trap Alley, Mountain Pass, Outback Express, Tour de Coast, Ring Road, Market
  Town, Quarry Run, Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass, Christmas Eve; and the
  levels kept in `THEME_LEVELS`, each in a theme built for it (they are ordinary numbered levels like the
  rest, opened in order: only the list they are kept in is their own): Toy Room, Twenty Thousand Leaks, Tranquility
  Base, Quiet on Set, Acqua Alta, Northern Lights, Thrill Park, Cinder Island, Dock Run.
- **Special levels (S1 to S6):** All Heck, Asteroid Run, Oh Mine!, Rival Run, Showdown, Battlefield: some driven
  in a vehicle of their own (UFO, jetboat, 8x8). Delivering one well enough earns a 6-star car (`EARNED_CARS`).
- **Races (R1 to R6):** Marina Bay, Montreal, Mount Panorama (in `SPECIAL_LEVELS` with the six above, by their
  place in the list), and the circuits traced from the real ones, Monza, Spa-Francorchamps and Albert Park
  (`CIRCUIT_LEVELS`; `CIRCUITS-HANDOVER.md` has how they were made).
- **Amphibious levels (A1 to A5):** Slipway Beach, Harbour Lights, High Water, Hippo Ford, Fjord Crossing.
  Each has water stages (its `water`) and is only started in an amphibious car (its `amphibious`). They
  are `AMPHIBIOUS_LEVELS` in `levels.js`, after the special levels and before the circuits, and open
  in order like the rest, the first by delivering the last special level.
- **Hidden levels** (`?hidden=<id>`): `testbed`, `grand-prix`, and three that try gimmicks out before a real
  level has them: `gimmick-road`, `gimmick-road-2`, `gimmick-road-3`. A run on one banks nothing.
- **The screensaver's level** is `chaos.json` (Pile-Up Parade), which is not on the menu.

## Adding content

- **A level:** copy a file in `levels/`, give it a new `id`, import it in `levels.js` and add it
  to `MAIN_LEVELS` or `SPECIAL_LEVELS`. Problems with the data are shown in the HUD when the
  level loads. Then:
  - Saved progress counts unlocked levels by position. A level put in among those already there
    needs its position added to `INSERTED_AT` in `progress.js` (so does every level added to `THEME_LEVELS`,
    which sits ahead of the special levels), so returning players keep what
    they had open.
  - `node scripts/level-clocks.mjs <id> --write` works out its clock and writes it into the file (an
    amphibious level is timed in `CONFIG.clock.amphibious`, the Float Van, holding its lane).
  - An amphibious level goes at the end of `AMPHIBIOUS_LEVELS`, which needs no entry in `INSERTED_AT`
    (the circuits after it are races, always open). `node scripts/.water-check.mjs` drives every
    amphibious level and checks the water's rules on it. The save has room for any number of levels: it is kept in local
    storage, and the cookie beside it holds no best times (`node scripts/.save-check.mjs` saves and loads 100
    levels and 80 cars).
  - Its words (its name, and a description for Good and one for Evil, 160 characters each at most) go in
    `levelText.json` under its id, in the menu's order, not in the level's file. A level whose file still has
    `name` and `description` works too (that is the fallback, and what a level downloaded from the editor
    carries); when moving them into `levelText.json`, take them out of the level's file.
    `node scripts/.descriptions-check.mjs` checks both places.
  - Its picture on the menu comes in two sizes, both from one `?cine` frame: `levelshots/<id>.jpg` (600x267:
    the strip, the album, a phone) and `levelshots/large/<id>.jpg` (1920x854: the stage on a desktop).
    `node scripts/shots.mjs --levels=<id> --write` makes both; `--write=<folder>` puts them in a folder to be
    looked at first, and `node scripts/shots.mjs <folder> --levels=<id>` only saves a PNG there. A level with
    none shows a plate of stripes (every level on the menu has one now). Six seconds from the start is seldom
    the best view: give the level a place of its own in `CINE` in `shots.mjs` (`&at=<m>` a little short of its
    landmark; `&cineside=left`, `&cineout`, `&cineup`, `&cineback` where a building, a stand or a tree is in the
    way), and look at both pictures before they are committed.
  - Its `description`: a sentence or two for the menu's stage, one as Good and one as Evil, 160 characters each at
    most (`node scripts/.descriptions-check.mjs`; `--list` prints them all).
  - `node scripts/.roadcard-check.mjs --list` prints what the menu's "what's on this road" card will list for it.
- **A row of pickups:** pickups with the same `s`, one a lane. A pickup's (or an obstacle's) `lane` can also be
  `'left'` or `'right'`, a shoulder, so a row can be four across on a two-lane road
  (`node scripts/.shoulder-items-check.mjs`).
- **A theme:** add it to `themes.js`; its scenery is drawn in `render/road.js`, or in a file of its own in
  `render/themes/` for the themed levels' themes.
- **A traffic vehicle:** add it to `vehicles` in `config.js` (give it a `model` to draw it as one
  of the models in `render/models.js`), then list it in a level's `traffic`. On a level with water
  stages, `amphibious: true` lets it drive into the water and out; `boat: true` keeps it on the water;
  anything else queues on its shoulder at the water's edge.
- **A water stage:** `"water": [{ "from": 700, "to": 1050, "current": 1.5 }]` in an amphibious level
  (below 0 or beyond the finish to start or end afloat). Its tuning is `CONFIG.water`; a theme can
  give the water its colours (`channel` in `themes.js`).
- **An obstacle kind:** give it a size and behaviour in `collision.js`, a cost in `obstacleKinds`
  in `config.js`, and a model in `render/obstacleModels.js`.
- **A theme's own obstacle** (a barrel where the Wild West's levels say `crate`): the plain obstacles are not
  gimmicks, and a level goes on naming the plain kind. Give the new kind the cost of the kind it stands in for
  in `obstacleKinds`, that kind's box in `collision.js` (the list under `SIZE`), a model in
  `render/obstacleModels.js` that reads on that theme's road from the chase camera (tall, a colour that stands
  off the road, a dark patch under it), and name it in the theme's line of `OBSTACLES` at the foot of
  `themes.js` (`DRIFTING` beside it: what the kind is there when it is one of a level's drifters, if another
  thing again: a bale that drifts in the Wild West is a tumbleweed). A cone that is roadworks stays a cone.
  Add its line to `DRESS` at the foot of `gimmicks.js`, and it is on the Gimmicks page under Road dressing
  (`gimmicks.html?group=road-dressing`: every one of them, to look at).
  `node scripts/.obstacles-check.mjs` holds each to costing and measuring what it replaces.
- **A gimmick:** a level field documented in `levels.js`, its logic in a file of its own here,
  its tuning in `config.js`, and its drawing in `render/`, called from the frame loop in
  `main.js`. Add it to `gimmicks.js` so it shows on the gimmicks page, and on the menu's road card for
  every level that has it (a card about a vehicle goes in `TRAFFIC_CARDS` in `render/levelcard3d.js` too).
  A new traffic kind wants a name and a line in `VEHICLES` in `levelinfo.js`.
- **A level field** (a gimmick's, or any other): besides its lines at the top of `levels.js`, one
  entry in `FIELDS` in `levelSchema.js`: its `shape` (`stretch`, `point`, `flag`, `timed`...), `group`,
  `label`, `help`, its `settings` (type, range, default), `road: 'both'` if it can be on a side road, and
  its `rules`. The level editor builds its place-button, form and map drawing from that entry and
  nothing else. `node scripts/.schema-check.mjs` fails until a field a level uses, or `levels.js`
  documents, is in the schema, and checks every level's values against it.
- **A car:** add an entry to `CARS` in `cars.js`, with a `tier` (its stars) and a `model` from
  `render/models.js`. `blue: true` makes it a Blue Star car, which the garage shows once level
  `CONFIG.blueStarsAfter` is delivered. `amphibious: true` makes it an amphibious car: it floats on a
  water stage, has sea-green stars, and parks in the garage's Amphibious section (there from the start). Its pictures are `carshots/<id>-good.jpg` and
  `carshots/<id>-evil.jpg`, taken with `?cine=car`. A vehicle that belongs to a level goes in
  `LEVEL_CARS`; one that should stay out of the garage goes in `SECRET_CARS`, with its own way
  in (the City Bus: type B U S on the start screen, or `?autostart&car=bus`).
- **Car ideas lot:** the garage has a second tab, "Car ideas": a lot of vehicles (twenty-six) that are ideas
  on show, not cars. Each is drawn after a real vehicle and has a generic name (the Bubble Car after the
  BMW Isetta, the Double Decker after the AEC Routemaster...); hovering or tapping one shows its name,
  what it is based on, its size and a line about it, and the Livery button shows its Good and Evil
  paint. They are listed in `IDEA_CARS` in `ideas.js` and built by `IDEA_MODELS` in
  `render/ideaModels.js`; the lot is `render/ideaslot.js`. An idea can be driven: its button in the lot
  reads "Drive it" (or `?car=<id>`), and it is then the car in use as a garage car is, on any level a
  garage car may drive. But it is tierless (no stars, no price: free, always open, never written into the
  save's list of cars: `Progress.freeCars`) and its figures are placeholders (`placeholder: true` on every
  entry, not balanced). None is in `CARS` or `CONFIG.vehicles`: not in traffic, Car Swap, the garage's own
  lot or any balance table; `cars.js` looks in `IDEA_CARS` only for the car in use. It borrows a garage
  car's horn and engine (`sound`), has no Super version, and `scripts/.ideas-check.mjs` drives every one. To
  make one a real car, give it an entry in `CARS` and move its builder into `MODELS`.
- **A thing to deliver:** a model in `render/cargoModels.js` (a group about a metre tall with
  `userData.animate(t)`; an Evil one built with `stated`, which gives it `setState(0 | 1 | 2)`), its id
  and name in `CARGO` in `cargo.js`, and a level's `"cargo": { "good": id, "evil": id }` to carry it.
  `node scripts/.cargo-check.mjs` lists what every level carries and checks the ending.
- **A sound:** drop a WAV in `sounds/` and name it in `SAMPLES` in `render/audio.js`. Game logic
  asks for it with `sfx()` or `sfxAt()` from `physics.js`.
- **A message:** add its wording to `messages.json`. How long it stays up is in `CONFIG.messageTimes` (by its kind, its group or its own path), and so is the list of sticky ones: said as any message, then a small icon under the gauges until what they warn of is over (a new one needs its picture in `render/hudIcons.js` and its name in `stickyNames`; the icons' size and rows are `CONFIG.messageTimes.stickyIcons`); `node scripts/.hud-check.mjs` checks both, and the mystery effect's name in the pickup status (`mysteryNames` in `messages.json`).

## The start screen

It is only a menu: a level is built when a run on it starts (`Game.load`), and nothing reloads
the page. It is one screen that fits the window (nothing scrolls), laid out as a game's front end:

- **The stage:** the level picked, large: its picture, number and name, its description for the side picked,
  its clock, tip and best time, its two medals (Good's grade and best time on the left, Evil's on the
  right), a line for what the level needs (an amphibious car, its own vehicle, the level before it), and
  **What's on this road**: a card of the level's gimmicks, pickups and traffic, each with its model turning.
- **The strip** under it: the levels of its group (five at a time); over it the **groups**, and over those the
  **tabs** (Deliveries, Races). A level not open yet can be looked at, but not started.
- **The car** (a tap opens the garage), **Good / Evil** (Evil turns the screen red), and **START**.
- **Options** (a sheet): sound, auto accelerate, on-screen controls; postcards, milestones, the screensavers;
  the reference pages; save codes, unlock everything, reset; how to play.
- **Keys:** left / right (A / D) a level, up / down a group, T the other tab, E the other side, G the garage,
  I what's on this road, O the options, Enter start, Escape closes a sheet, M sound. Touch: swipe the stage.

In the options and beside the race controls:

- **Sound, auto accelerate, on-screen controls:** switches, saved with progress.
- **Race cars and race track:** the class every race is run in (F1, GT, LMP) and the race
  screensaver's circuit.
- **Unlock everything** writes a complete game to saved progress; **Reset progress** wipes it.
- **Screensaver** runs `chaos.json` with no player car: a ghost dolly glides along for the
  camera to follow, and at the end of the road everything goes round again. Its tuning is
  `CONFIG.screensaver`. **Race screensaver** shows a circuit race as on TV, with a leaderboard.
  Each has a link beside it, for bookmarking.

**Pause** and **Exit level** buttons sit at the bottom of the screen during a run and the
screensavers.
