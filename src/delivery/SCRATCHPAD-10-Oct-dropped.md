# Delivery Racer: work dropped on the evening of 10-Oct, for another session to resume

Written by the orchestrator when the owner halved the number of agents ("Halve the number of agents please.
Don't assign new tasks to the ones that finish now"). Each item below was briefed and then cancelled or
parked before it was finished. Nothing here is urgent and none of it is live. What was asked for all day and
what landed is in `CHECKLIST-10-Oct.md`; questions waiting on the owner are in `OPEN-QUESTIONS-10-Oct.md`;
the morning's handover (architecture pointers, the earlier agents' notes and traps) is `SCRATCHPAD-10-Oct.md`.

## Read this first: the rules that bind all of it

- **The owner's standing rules:** never run the smoke test (`scripts/delivery-smoke.mjs`) unless asked;
  pushing `main` deploys the live site, so push only on the owner's word; the orchestrator's window only
  edits the checklist, merges, messages agents and starts or ends agents; an unlabelled request waits for a
  free agent, one the owner labels (high priority, jump the queue) starts at once; agents commit each whole
  piece as soon as it works ("WIP" in the message if stopped mid-piece), on their own branch, own files by
  name, no push; nothing unseen is merged into `main`: a branch is looked at in stills by its agent first.
- **Where to work:** never in the main checkout. Each branch below names its worktree under
  `.claude/worktrees/`. Every worktree's `node_modules` is a junction to the main checkout's: never delete
  it (remove the link with `rmdir` before deleting a worktree folder, never recursively). `git merge main`
  into a branch before resuming it: `main` moved a great deal on 10-Oct.
- **Level rules (the owner's):** 27 to 37 cash pickups with 8 to 15 rows of two or more side by side;
  pickups may go on the shoulders, so some rows reach onto one with the bigger cash out there, never a
  pickup the player must take; every hazard a gamble with a fast line that pays and a slow one that works;
  nothing that makes the car stop without a choice, nothing without counterplay; no new moving things on
  the road that explode when hit; no tyres as obstacles (the kind is gone); one jam ramp a level at most;
  content at fixed positions; segment lengths whole numbers. For the older levels 20 to 30: "update them to
  this standard without changing the list of gimmicks in the level" (`scripts/.gimmick-kinds-b.mjs <id>
  --diff=main` must say the kinds are the same).
- **Do not cram gimmicks into a level (the owner, late on 10-Oct, of the day's levels).** "The agents that
  build levels really need to know that they should not aim to cram every gimmick into every level." And:
  "Burst water mains and potholes and tunnels appear almost every level. It should be thematic." A level
  has one idea and a few kinds that belong to its place. The "standard" below was read off the newest levels
  and its counts of kinds (10 to 16 a level, something every 150 to 300 m) are what caused this: treat them
  as an upper bound on busyness, never a target, and never quote a number of kinds in a brief.
- **Rockfall only under a real rock face.** "The rockfall gimmick keeps getting added to places where they
  float in mid air." Place `rockfall` (and boulder `wreckage`) only where a face or steep slope stands above
  the road on that side, and look at each one in a still before the level is called done.
- **Plain obstacles are dressing, not gimmicks.** Place generic kinds (crate, cone, barrier, bale); the
  theme's mapping at the foot of `themes.js` (`OBSTACLES`, `DRIFTING`, `themedKind`) draws each as a thing
  of its place. Build no obstacle models inside a level's work. Every obstacle must read at a glance
  against its road from the chase camera.
- **The standard a level is held to** is written out twice in `SCRATCHPAD-10-Oct.md` ("Levels 20 to 25"
  has ten points, "Levels 26 to 30" six). Models to read: `levels/quarry-run.json`, `levels/noon.json`,
  `levels/outback-express.json` (all reworked or written to it and seen in pictures). Scenery ADDED to an
  old theme goes in `render/themes/extras.js` (`makeKit`, `offRoads`, `setsOf(theme)`; `construction` and
  `bathurst` are the examples), not in `render/road.js`; a level asks for a set through its `zones`.
- **Order for a level rework, a commit each:** before-stills every 300 m FIRST (the screenshot script
  serves the source live, so a "before" taken after a theme file is edited is not one); the level file,
  loading and probed to the finish (`node scripts/delivery-probe.mjs <id> --secs=500`); scenery;
  after-stills along the whole length, looked at, fixes; the clock printed before and after with `node
  scripts/level-clocks.mjs <id>` (never `--write`) and the written clock changed by hand only by the road's
  own difference; cargo pair, descriptions (160 characters each), four targets; the menu picture; every
  check script one at a time; `.replay-check.mjs <id>`.
- **Screenshots:** `node scripts/shots.mjs <out-dir> "name=?level=<n>&ghost&at=<s>&ff=1" --size=880x520`
  (its header has the how-to). An address starting with `?` is a run; a menu page is `index.html?...`;
  `--levels=<ids> --write` writes `levelshots/<id>.jpg` (600x267) and `levelshots/large/<id>.jpg`
  (1920x854); `--scale=2` for a phone's density. One run at a time per agent, six pictures a run; two runs
  at most go at once on the machine. The first picture of a run takes 15 s to two minutes and can come out
  captured mid-resize (re-shoot it); a picture that took over 30 s has run past its moment. A run may say
  it could not remove its folder yet (EPERM): the next run sweeps it. The script's `CINE` table holds each
  level's menu camera; give a new address to whoever owns the script that day, or change one entry in a
  commit of its own.
- **Checks:** about 30 scripts, `scripts/.*-check.mjs` and `scripts/delivery-levels-check.mjs`, each run by
  itself with `node` (`npm` / `npx` work only from PowerShell). `.ideas-check.mjs` takes four minutes
  (`--quick`); `.replay-check.mjs` with no arguments plays three levels. The gimmicks check on `main` is
  unseeded until `delivery-gapfill` is merged: three of its lines fail at random (a bus at the low bridge, a
  semi in the crosswind, a van at the shade).
- **Level words:** names and descriptions are moving to a JSON of their own (`delivery-level-text`, in
  progress when this was written), with the level's own file as the fallback. A level rewritten on a
  branch keeps its words in its file until it lands; then they move.

## A. Nuclear fallout: theme, level and gimmicks. The owner's HIGH PRIORITY. STOPPED with one piece of four done

- **Where:** branch `delivery-fallout`, worktree `.claude/worktrees/delivery-levelfix`, fast-forwarded to
  `main` at `36517ff`, tree clean, not merged. Safe to merge but pointless until it can be seen.
- **The owner's words:** "New theme, level and gimmick. Nuclear fallout level, near a powerplant/industrial
  area. Green skies. Gimmick 1 is radiation areas, driving into radiated areas causes health to tick down
  slowly. A unique radiation meter ticks up, and at full the player is permanently infected and the health
  ticks down regardless. Gimmick 2 is infected cars. Traffic cars can spawn infected, or have a chance to
  get infected while driving in radiation. An infected car will have a radius where they have the same
  radiation gimmick. Infected cars don't tick down other infected cars. Contact with an infected car will
  infect you. The shield will prevent radiation damage, and will prevent the player from getting infected."
- **Piece 1, the logic and its check: DONE (`ae29ceb`).** `src/delivery/radiation.js`; wired in `game.js`
  (build / reset / update / wrecked) and `traffic.js` (`Radiation.deal` in `placeAt`); `CONFIG.radiation`;
  the lasting-condition entry `events.infected` with a trefoil icon in `render/hudIcons.js`; five messages
  and a sticky name in `messages.json`; field docs in `levels.js`; two schema entries;
  `scripts/.radiation-check.mjs` (passes on seeds 2026 and 7); a case in `.hud-check.mjs` (no FAIL line
  seen, its closing line not seen). Schema, bundle, hazards, levels and replay (testbed, noon) pass; the
  other 25 or so checks were not run.
- **Level fields:** `radiation: [{ from, to, lanes?, side? }]` (no `lanes` means the whole road and its
  shoulders; `side` reaches out over that shoulder) and `infectedTraffic` (a share; left out, it is
  `CONFIG.radiation.share` on a level with an area, else none).
- **`CONFIG.radiation`:** tick 0.008 of full health a second; meterTime 40 s; meterFall 120 s; high 0.75;
  infectedTick 0.006; radius 7 m; share 0.12; catch 0.08 a second; most 5 infected at once; Geiger click
  slow 0.45 s / fast 0.07 s, volume 0.5; sign 110 m. Measured: a 200 m area at 25 m/s costs 6.3% health
  and 19% of the meter; an infected car lasts 167 s, each wrench adding 42 s.
- **Decisions made where the owner's words left a gap (the owner has not seen these):** "the shield" is the
  Armour pickup (a helicopter drop's shield, the SuperCar mystery, a ghost and a tank keep radiation out
  too); already infected then armoured: the tick stops while it lasts and resumes, no cure; a wreck or a
  bust does not cure (`wreckCures: false`); infected AND in a dose: the greater of the two rates, not both;
  ticks are a share of the car's full health, so every car lasts as long; it is the car's centre that
  counts, so the lane beside an area is clean; the meter falls slowly outside radiation; infected traffic
  takes no damage and drives as usual; never infected: police, ambulance, tank, interceptor, getaway,
  emergencies, pursuit cars, racers and couriers, processions, parades, roadblocks, convoys, fixed or
  parked vehicles, boats; contact is tested before collisions resolve, and a ghost or a car in the air
  over it does not touch.
- **Piece 2, how it is seen: about a tenth done (`8ab9bf2`, WIP).** `src/delivery/render/radiationModels.js`
  exists (trefoil plate, hazard stripes, warning board, an infected car's shell, ring and badge, an area
  patch for cards) but nothing imports it and it has never been run. **Left:** `render/radiation.js` on the
  pattern of `render/gambles.js` (`Game.onLoad`, `buildStrip`, `at()`): the haze, hard edges and chevron
  bands, the board un-mirrored on `drive: left`, the infected car's aura from `trafficMeshes`, a green
  vignette while dosed; `syncRadiation(now, dt)` after `syncGambles` in `main.js`; the HUD gauge
  (`delivery/index.html`, `style.css`, `render/hud.js`); sounds `geiger` and `infected` in
  `render/audio.js` (`radiation.js` asks for them and they do not exist: silence is expected, not an error,
  but that was never run in a browser); two cards in `gimmicks.js` with "Infected cars" in `TRAFFIC_CARDS`;
  a `?rad=` / `?radcar=` test switch; every still. No picture of any of it exists.
- **Broken right now:** a level using `radiation` works but shows nothing (no haze, no ring, no gauge:
  only the infected icon and the messages). No level uses the fields, so `main` is unaffected.
- **Piece 3, the theme `fallout`: NOT STARTED. Piece 4, the level: NOT STARTED.** The full brief for both
  (green sky and haze, cooling towers, a reactor dome, pylons, pipe racks, tank farms, fences with
  trefoils, abandoned checkpoints; its own obstacles through the theme mapping, e.g. a yellow waste drum;
  the level to the standard, every radiated stretch with a clean line or a shield before it and the bigger
  cash inside it) is in the orchestrator's brief, summarised in `CHECKLIST-10-Oct.md`. The level's words go
  in `levelText.json`; a water main is `{ s, lane, length? }`.
- **Very next step:** write `render/radiation.js`, call `syncRadiation` in `main.js`, add the HUD gauge,
  and shoot it with a `?rad=` switch. Two throwaway scripts of the agent's are in `%TEMP%` (`rad_patch.py`,
  `p.py`): harmless.

## B. "Spring Thaw", the ice road's second level: STOPPED as WIP, most of the way there

- **Where:** branch `delivery-themes-e2`, worktree `.claude/worktrees/delivery-city-levels`, tree clean,
  `main` merged in once (`a31b8f7`); not merged into `main`.
- **No stray process is left.** A hung `node scripts/.bundle-check.mjs` (PID 26760) was ended by the
  orchestrator on the owner's explicit word; the agent's waiting shell then took six pictures (640, 1060,
  4200, 2180, 3660, 5200, over the earlier files of those names) and finished cleanly. Nothing in the repo
  changed.
- **Commits:** `f4acf3b` WIP: `levels/thaw.json`, the day theme `iceroadThaw` in `themes.js`, the stars,
  moon and aurora drawn only at night in `render/themes/iceroad.js`, its place in `levels.js` (last in
  `THEME_LEVELS`, level 52) and `INSERTED_AT` entry 52 in `progress.js`. `c19807d`: a theme can set `soft`
  colours for mud, ruts and washboards (`render/road.js`, `render/gambles.js`): grey slush and rippled ice
  on the thaw, other themes unchanged (this is also the hook for the washboard's brown planks on the Moon
  and the sea bed, question 5b). `2a789c9` WIP: the words in `levelText.json`, clock 265 / 205.
- **The level:** the lake road by day, 5.55 km, 2 + 2 lanes, two pressure ridges, one side road (exit 2760,
  merge 3560) as the bridge round a meltwater ford at 3125. Kinds Northern Lights lacks: ruts, mud, spray,
  washboards, fords, a jam ramp (1420), pursuits, emergencies; also potholes, fog, a crosswind. No
  drifters; fixed crates and cones only. 35 cash, 15 rows, six using the right shoulder (120, 1100, 3760,
  4460, 5340, 5500), four targets, cargo puppy / piranhas.
- **How far:** it loads; levels and descriptions checks pass after the merge; a ghost probe delivered in
  231.7 s BEFORE the merge and the clock change (not re-run). Seen in 12 stills at 80, 640, 1060, 1380,
  2180, 3080, 3660, 4200, 5200: the day theme, the shoulder beside the snowbanks, the ramp, the ford and
  the slush colours look right. NOT seen: 1500 to 2100, 2400 to 3000, the side road, 3200 to 3600, 4300 to
  5100, the finish. No menu picture. The full checks, the replay check and the shoulder-items check not run.
- **Next step:** `node scripts/delivery-probe.mjs thaw --secs=500`; shoot the unseen stretches; `--levels=thaw
  --write`; every check; then it can merge. Pictures in `...\scratchpad\shots-second\thaw\`; the generator is
  `...\scratchpad\disc\thaw.cjs` with `thaw-data.cjs` (re-running it rewrites `thaw.json`).

## 0. Level 24, Ring Road: FINISHED and judged fit, but NOT MERGED: the merge conflicts

- **Where:** branch `delivery-rework-e` (three commits on `main` at `9c3dfdc`, tip `f0dc0ee`), worktree
  `.claude/worktrees/delivery-gimmicks`, tree clean. Its agent has stopped.
- **Why not merged:** `git merge delivery-rework-e` into `main` (`7a90971`) conflicts in three files:
  `src/delivery/render/themes/extras.js` (it adds a `city` entry; `main` has since gained `bathurst` for
  Outback Express and others), `src/delivery/render/road.js` (one import and a four-line skip in the city's
  block loop; Market Town's and Outback Express's reworks touched the same file) and
  `src/delivery/messages.json` (six zone welcome lines; other levels added theirs). The orchestrator
  aborted the merge and changed nothing. **Next step:** in that worktree `git merge main`, keep BOTH sides
  in all three files (they are additions beside additions), run every check, then merge into `main`.
- **What it is:** still 4600 m with its four exits; longest straight 250 m for 450; cameras 7 to 9, each
  with a `cash20` just past it; low bridges 1 to 3 (1100, 2330, 3430), each between an exit and its merge
  with cash under it; cash 2 to 37 in 15 rows, eight reaching the right shoulder; cargo coffees / skunk;
  four targets; six zones (Northfield estate, Ringway Retail Park, City Stadium, Ringway Services,
  Eastgate towers, City centre) drawn from new `sets` on the `city` theme; kinds the same; clock 265 / 200
  unchanged; every check passed on the branch; probed to the finish in 178.9 s.
- **Left:** its menu picture was made from the default camera; a better frame is `'ring-road':
  '&at=4330&ff=1'` for the script's `CINE` table (the centre's glass towers, the last gantry, a row of
  cash). Plain stretches at 2165 to 2450 and 3005 to 3300 are still only the old grey blocks. Naming its
  cargo shifts what unnamed levels are dealt (Big Business now carries ramen). Its words are in its level
  file: move them into `levelText.json` when it lands. Not seen: a target moved to 4150; the three low
  bridges with a tall car; the level as Evil.
- **Pictures** (`...\scratchpad\shots-rework\ring-road\`): for the owner `before\b1200.png` against
  `after\a300.png`, `after\fix-1050.png`, `after\a1800.png`, `after\a4500.png`, `after\cine-centre.png`.

## 1. Level 27, Hong Kong: PARKED, half done

- **Where:** branch `delivery-rework-b`, worktree `.claude/worktrees/delivery-themes-c`, tip `97d52c9` (a
  clean merge of `main` over the WIP commit `1b3a207`). Tree clean.
- **Done:** `levels/hong-kong.json` re-laid: 3.7 km in 14 segments (was 9), longest straight 400 m, an
  S-bend; tunnels at 1800 to 2160 and 2960 to 3140; four cameras; four stretches of fresh tar, one inside
  the tide (2260 to 2860); seven cone, barrier and sign chicanes each leaving the other lane free; taxi
  convoys; 51 pickups, cash 36 (5 / 10 / 20: 2 / 23 / 11) in 16 rows, four reaching the shoulder, four
  `cash20` in the tram median (lane 2 is the tram median: nothing drives there); traffic of 10 kinds;
  cargo canary / genie; four targets; clock 225 / 165 (the tool's figure went from 155 / 120 to 180 / 135,
  so the written 200 / 150 moved by that). Kinds unchanged (a bin lorry in the traffic counted as a new
  kind and came out). Probed to the finish in 141.4 s. Levels, schema, descriptions, targets,
  shoulder-items and cargo checks passed; the rest were not run.
- **Its generator:** `...\43873e55-5ad9-41fd-b1fd-d25a87717463\scratchpad\visfix\hong-kong-gen.py`
  (re-running it rewrites the level file; the scratch folder may be gone in a later session).
- **Pictures** (`...\scratchpad\shots-rework\hong-kong\`): twelve before-pictures (`before\s40.png` to
  `s3340.png`, true befores, NOT yet looked at); after-pictures `s300`, `s2380`, `s2880`, `s3520`, `m400`,
  `m1260` looked at (road, rows, tar lane, tide, second tunnel's mouth, finish row all right); `s980`,
  `s1660`, `m3230` taken and not looked at.
- **Not done:** the scenery (nothing written: no `sets` on the theme, nothing in `extras.js`, no `zones`
  on the level); the mirrored FRESH TAR board (on this `drive: left` level its lettering is mirrored: fix
  it in the board's code so every left-drive level is right, and check Tokyo's); the menu picture; the
  full checks; the commit that drops "WIP".
- **The scenery as planned:** sets `neon` / `peak` / `shelter` / `scaffold`: shop fronts and vertical neon
  signs on the city side, the Peak and its tram behind the towers, a typhoon shelter of moored junks along
  the tide's stretch, bamboo scaffolding, a clock tower at each ferry pier. **Where each fits** (worked out
  from `render/road.js` and `render/movers.js`): towers begin 6 m off the city side and the pavement ends
  at 3.2 m, so shop fronts and hanging signs fit between them with no building removed; ferry piers stand
  at s 500, 1700 and 2900, where the clock towers go, on the promenade; junks along the tide (2260 to
  2860) on the sea side, beyond 14 m; the Peak about 330 m off the city side.

## 2. Level 30, Stelvio: CANCELLED, never started (confirmed: no branch exists)

- **Where:** make branch `delivery-rework-g` from `main`; the worktree `.claude/worktrees/delivery-circuits`
  is free.
- **The brief:** a LIGHT touch. Kinds: crosswinds, fog, ice, rockfall, police only in stretches. Take cash
  from 20 in 8 rows to 27 or more in 8 to 15 rows (a shoulder 20 only where a hairpin has shoulder to drive
  on), a second fog bank and a second crosswind on the way down, rocks on the steep ground between the
  hairpin legs, and something to see on the valley floor (a village, a river, the road's lower legs seen
  from above). Noted on 9-Oct as still wrong: "the face between Stelvio's legs is a ramp on a coarse grid;
  no valley view". Hairpin segments must be whole numbers (`length: 56, curve: 0.0560999`). Mountain Pass,
  Monte Carlo and Fjord Crossing share the alpine theme: shoot one place on each so nothing lands on their
  roads; Mountain Pass, re-laid on 10-Oct (`a29522e`), is the model. Cargo: snow globe and the ice block
  were suggested and both exist. Its written clock is 300 / 230 against the tool's 200 / 145: leave it
  unless the road's own time changes. The script's `CINE` has `stelvio: '&at=250'`.

## 3. Level 23, Tour de Coast: STOPPED as WIP, the level done, the scenery part done. NOT fit to merge

- **Where:** branch `delivery-rework-d` (two commits on `main` at `3cb4f2d`), worktree
  `.claude/worktrees/delivery-cargo-good`, tree clean.
- **`855fee4`, the level file, re-laid and working:** kinds the same four (dropBears, narrows, pelotons,
  tide); still 4800 m, 20 segments for 9 (an S on the headland, a gentle rise, the cliff road winding, an S
  into the harbour; longest straight 450 m for 1000); narrows 1 to 3, drop-bear stretches 1 to 2, pelotons
  still 12 (7 the player's way, 5 oncoming), the tide unchanged; pickups 13 to 51, cash 0 to 36 (14 of them
  20s) in 12 rows, 5 reaching a shoulder; traffic 7 kinds to 10; cargo surfboard / skunk; targets 2 to 4;
  both descriptions rewritten. Levels, schema, descriptions, targets and cargo checks pass; probed to the
  finish in 187.3 s. Clock: the clean run 146.0 s before and 145.3 s after; the tool prints 210 / 155
  where it printed 210 / 160; the written 210 / 160 was left (0.7 s crossing a rounding step).
- **`8e2b28b`, the scenery, WIP:** a `zones` entry in `render/themes/extras.js`, drawn only on a level that
  has pelotons (Grand Pacific and Passage du Gois shot: nothing added there). Four arches over the road,
  crowd barriers with banners and a crowd where each player-side bunch sets off and down the last 420 m,
  tents and camper vans on the headland, flags through the harbour, fishing boats off the causeway, a jetty
  of yachts, two lighthouses. Seen and fine: arches, barriers and crowds, tents, campers, flags, yachts, the
  narrows.
- **To do:** the headland lighthouse leans visibly (still `c1080`): fix; the causeway boats are tiny and
  some lie on the sand near the zone's start; the cliffs zone got nothing new; the start arch's banner and
  the harbour light were not clearly seen; the menu picture (the script's `CINE` has `'tour-de-coast':
  '&at=1600'`, the cliff road); the full set of checks and the replay check; a look as Evil.
- **Pictures** (`...\scratchpad\shots-rework\tour-de-coast\`): 16 before stills and 24 after, with sheets;
  `before-2.jpg` against `after-3.jpg` (the harbour and finishing straight) is the pair for the owner.

## 4. "Night Shift", a second level on the container port: CANCELLED before it began

- **Where:** it was to go on branch `delivery-themes-f2`, worktree `.claude/worktrees/delivery-menu`, after
  that branch's fog-colour piece. Read the branch's last commit for a WIP.
- **The brief:** theme `portNight` (in `themes.js` already: night, lit, headlights; never looked at): the
  terminal at night, wet, in fog between the stacks. About 3.6 km, sharper with quarter bends, `drive:
  'left'` or a `median`. Kinds new against Dock Run (`levels/docks.json`): spray, one jam ramp (a car
  transporter), cushions, a low bridge (a gantry's height bar) with a side road round, fresh tar, narrows,
  emergencies, shoulder rows; shared: machinery, fog, wreckage as containers. NO drifters. Cargo coffee /
  reactor (check they are still free). The port theme probably needs its floodlights and crane lamps made
  to glow at night. The port keeps crates and drums as its plain obstacles. Its `INSERTED_AT` entry in
  `progress.js` goes after the last one there (After Hours 49, Eruption Day 50, Cattle Drive 51 on
  10-Oct; Spring Thaw and the fallout level may land before it).
- **Two more second levels were never started** (ideas in `SCRATCHPAD-10-Oct.md`, "Agent 30"): the favela
  descent on `favelaRain`, and "Monsoon" on `riceMonsoon`.

## 5. Docs that describe the old screenshot script: DONE after all (`d5b157e`, committed before the cancel reached its agent)

The README's level-picture paragraph and HANDOVER's screenshot paragraph and two "Things that bit" lines
are up to date. Also new in the script: `--dist=<dist/client>` shoots the BUILT site with no Vite
(`50af06e`), and an address may name its level by id, `"a=@monza&ghost&cine&ff=6&at=300"` (`6409bb9`),
since level numbers shift as levels are merged. What this section used to ask for, kept for reference:
`src/delivery/README.md` about lines 208 to 210 still say `--levels` saves a PNG to be scaled by hand;
`HANDOVER.md`'s paragraph "Screenshots are taken by ..." and its "Things that bit" lines still describe the
old leak and Edge's 500 px limit. To be brought up to date with the script as it is (`5929c09`, `a175592`,
`199e090`, `aed731b`, `57c1d54`): one browser a run over the DevTools protocol, its own folder, two runs at
a time, `--size` exact, `--scale`, `--levels --write` writing both sizes, the `CINE` table.

## 6. Menu pictures: five weak ones, and the large ones barely looked at: CANCELLED

- Weaker than the rest, each wanting a better place or camera in `CINE` (`&at`, `&cineside`, `&cineup`,
  `&cineout`, `&cineback`): `marina-bay` (a stand's wall over the right third), `montreal` (a large tree
  on the left), `monza` (a tree upper left), `singapore-night` (a tree mid-frame where the old picture had
  a bridge), `battlefield` (an explosion over the left of the frame).
- Trial frames from the cancelled attempt are in `...\scratchpad\shots-test\weak`: for `singapore-night`,
  `&at=2450&cineside=left` gives a good frame with both bridges; the second set of trial frames for the
  other four exists and was not looked at (the first set under those names was of the wrong levels).
- Only a handful of the 65 large pictures were looked at full size. Look at ten across themes (a night
  one, a snowy one, a busy city one): sharp, no banding in skies at JPEG quality 80, no HUD or debug text.
- Levels whose menu picture is missing or stale: `stunts` and `outback-express` were given `CINE` entries
  to the script's agent late on 10-Oct (confirm both pictures exist in both sizes); `glow` (After Hours)
  had only the small one; `hong-kong` when it is finished.

## Also waiting, not dropped by the halving (see the checklist for each)

- **`delivery-stats`** (`0161d71`, worktree `.claude/worktrees/delivery-city-levels`): the Delivery and
  Nerve car stats, built and HELD for the owner (question 5c2 in `OPEN-QUESTIONS-10-Oct.md`): packages
  only ever wreck traffic, whose health does not rise by tier, so Delivery rising by tier does the opposite
  of what was asked. Do not merge without the owner's answer.
- **Levels 28 Tokyo and 29 Mumbai** to the standard: never started; the plans are in
  `SCRATCHPAD-10-Oct.md` ("Levels 26 to 30").
- **Nine levels' words** (`hong-kong`, `tour-de-coast`, `ring-road`, `market-town`, `stelvio`, `toys`,
  `leaks`, `moon`, `morro`) stay in their level files until their branches land; then move them into the
  level-text JSON.
- **The washboard's look** (brown planks on every theme), **the audit's performance and bloat findings**,
  **the level progression rework**: all with the owner.
- **Old Edge leftovers in `%LOCALAPPDATA%\Temp`** from before the screenshot fix (about 710 `scoped_dir*`
  folders, 181 `msedge_*`, 24 files of 74 MB): the owner's leave covered only the `delivery-shots-*`
  folders. Ask before deleting anything on the machine.
- **The `delivery-batch` worktree** (a stash applied on top by accident) and the stash itself: untouched,
  the owner's to decide.
