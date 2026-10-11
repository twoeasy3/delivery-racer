# Delivery Racer: live checklist, 10-Oct (2026-10-10)

Kept by the orchestrator; updated whenever an agent commits or the owner adds something.
`[x]` committed, `[~]` in progress, `[ ]` not started, `[-]` removed or dropped. A hash is the commit;
the branch is in brackets where it is not yet on `main`. Detail is in `SCRATCHPAD-10-Oct.md`.

**Nothing below has been seen by a person in a browser, and the smoke test has not been run.**
**Pushed on the owner's word on 10-Oct: `main` up to `8a0bd79` is on the remote and deploying** (the production build of that commit passed; the smoke test was not run). Later commits are local until pushed.

**Pushed again on the owner's word ("Push the new menu please"): `main` at `b132c15` is on the remote and deploying.** The production build passed; 23 of 25 headless checks pass; the smoke test was not run. Known when pushed: the police pursuit misbehaves (below).

Last updated: after `b132c15` (main, pushed). 60 levels on the menu. Running: agent 19 (the pursuit regression, then road gimmicks from H17), 24 (the UFO check, the save cookie's cap, the editor's leftovers). Everything else is merged.

**Two checks fail on `main` right now:**
- `.pursuit-check.mjs` (3 failures: the chase no longer gets past and away, and the player is hit). It passed before the road gimmicks were merged; agent 19 is finding which of its gimmicks did it. **This is live.**
- `.ufo-check.mjs` dies with a Node error before any check runs, as it has all day. Agent 24 has it.

**Merged in the last round:**
- Theme levels D (agent 26): **41 High Noon** (the Wild West: false-front towns, a railway, mesas), **42 Favela Heights** (a hillside of stacked houses, hairpins, a cable car), **43 Emerald Steps** (rice terraces, palms, gates). 35 to 37 cash pickups, 13 to 15 rows each. Seen as their menu pictures. Not played.
- Known problems, second lot (`172d923`): the Gimmicks page's console error (the bullet train's card); HANDOVER and README up to date; a menu picture for every level (seven had none); cargo dealt so that all 50 items turn up (33 levels changed cargo; none that names its own).
- The save cookie was 3882 of 4096 bytes with 60 levels. **Fixed, merged as `d58ce08`, NOT yet pushed:** local storage holds the whole save with no cap; the cookie keeps only money, levels open, cars, the car in use, tank pieces and switches (956 bytes now; 100 levels and 80 cars checked). An old cookie holding everything is still read. Consequence: if a browser's local storage is lost, best times (so medals and earned 6-star cars) and milestone counters go with it; what is open, the bank and the cars come back from the cookie. Headless only: not tried in a browser.
- The UFO check runs again (`3a7b1da`): the check was at fault, not the game.

**Merged since the last update:**
- Known problems, first ten commits (`4b7421e`): audit C4 (the editor never writes a level's values into the page as HTML: the script injection is closed), C6 (a pasted save code keeps only a save's fields), C2 (a visit with an address switch, plain `?autostart` included, never writes the save), C5 (a bad edited level is refused with a reason; one that makes the track builder loop for ever still hangs), C3 (a traffic slot is wiped when dealt out), pickups and obstacles allowed on the main road's shoulders (the check was wrong, the docs right), duplicate config keys removed. **Replay: 53 of 53 levels replay exactly from a seed (it was 31 of 53).** Behaviour changes from the duplicate keys: traffic honks less (70 m, 5 s apart, as first written), and the ice-cream van is its own model with its tune again (a later duplicate had made it a pink delivery van and silenced it).
- Road gimmicks, second lot (`29e78ba`): H9 ruts (Farm, Outback Express), H16 fresh tarmac (Hong Kong, Tokyo); the drawbridge's river takes the theme's colour (lava on Cinder Island, lagoon green on Venice, a blue ribbon on the toy carpet); rocks and asteroids put out as plain obstacles or drifters were built with no size (an error in the browser on Cinder Island): fixed.

## Agent 1: port from the discarded city-levels work (`main`, finished)

- [x] Eight new mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, souped up. `e05ed11`
- [x] Super cars (livery, body kit), lent by "souped up" or `?car=super-<id>`. `e05ed11`
- [x] Six-star tier: a car earned on each special level. `37eb71c`
- [x] Visible damage: dents on the player's car and scorched paint. `fda617c`
- [x] A horn for each car. `e9ebe12`
- [x] Postcards album. `e8ccc6c`
- [x] Milestones wall. `8c0d76e`
- [x] Garage filter put right after the merges (earned cars out of "Gold stars", a "6 stars" choice once one is earned); `HANDOVER-batch.md` brought up to date. `8c5ead6`
- [ ] Never run, even headless: the album and the milestones wall (they need WebGL). Try `?album&unlock` and `?milestones&unlock`
- [ ] Never seen: the Super body kit on each model, dents, blackout, the giant, the garage with 6-star cars; no horn heard
- [-] `gimmick-road-3` and the rest of the duplicate work: discarded on the owner's word

## Agent 2: real circuits (`delivery-circuits`, finished, merged into `main` as `e358d98`)

- [x] `main` merged into the branch. `a401d13`
- [x] Headless check that all 47 levels build and every race starts; smoke test's labels know `R1..` (test not run). `b256615`
- [x] `scripts/circuit-from-osm.mjs`: OSM loop, SRTM grades, run-off measured per side. `a21b6fc`
- [x] Monza: 5800 m (real 5793), 105 run-off stretches. `a21b6fc`
- [x] Spa-Francorchamps: 7004 m (real 7004), 102 m of climb, run-off from mapped barriers. `e75d82d`
- [x] Albert Park: 5312 m (real 5278). No run-off is mapped there, so none is drawn. `b111bd7`
- [x] Clocks for Monza and Spa. `e75d82d`
- [x] Landmarks: Monza's old banking and park, Spa's forest, stream and hotel, Albert Park's lake and skyline. `856ab1e`
- [x] Clock for Albert Park (335 / 260 s, timed before it was made flat and not re-timed); handover rewritten. `bb4a64b`
- [x] Seen in headless screenshots by the agent (not kept): all three circuits load and draw
- [ ] Albert Park's gravel traps and walls: not in OpenStreetMap, need another source
- [ ] Menu pictures for the three circuits (Spa's cine shot came out blocked)
- [ ] A whole lap of any circuit watched
- [ ] Races tab opened and checked by eye (needs a browser)

## Agent 3: menus, save data, removals (`worktree-delivery-batch`, finished, merged into `main` as `6344152`)

- [x] 52. Save data: cookie measured (4013 of 4096 bytes, now 2931), local storage first, export / import a save code. `5e53e1a`
- [x] 38. Level select: medals, best times, gimmick chips. `5e53e1a`
- [x] 35. Sort and filter the garage. `865d59f`
- [x] 36. Car comparison card. `865d59f`
- [x] Toll plazas and average-speed cameras removed (owner's request). `62c2bdb`
- [x] Gimmicks page: eight "City streets" cards. `45369f1`
- [x] 30. Full 1:1 replay: investigated, written up in `REPLAY-NOTES.md`. Recommends recording inputs and a seed at a fixed step (1 to 2 KB a minute). `4a66a80`
- [x] First step built: `scripts/.replay-check.mjs`; 41 of 43 levels replay exactly from a seed. A `traffic.js` timer bug that broke it is fixed. `3731c60`
- [ ] Grand Prix and Market Town still part after 2 s (both have crossroads): not hunted
- [ ] Replay in the browser: a seeded generator for logic alone, a fixed step in `main.js`, recording and playing inputs: not started
- [ ] **That worktree is left in a mess** (see the Orchestrator section)

## Orchestrator

- [x] Scratchpads read, worktrees compared with `main`, the lists gathered. `9c0befb`
- [x] Uncommitted city-levels work stashed (`0201824`), to be dropped once agent 1's port lands
- [x] Stale Vite server on port 5199 stopped
- [x] Merge `worktree-delivery-batch` into `main`. `6344152` (four conflicts, both sides kept; the levels, save, hazards, milestones and mysteries checks all pass on the result; the save cookie is 3086 of 4096 bytes)
- [x] Tide: a wave's crest no longer jumps the last metres as it breaks (it was drawn 4 m out to sea, then at the water's edge). `8c515fd`. Not seen in a browser
- [x] "No way to reach the circuits": checked in a screenshot of `main`: the Races tab on the start screen lists R1 to R6, Monza, Spa and Albert Park among them. `?tab=races` opens the menu there. `6fc7b94`. Monza, Spa and Albert Park have no menu pictures yet
- [ ] **Owner to decide:** the worktree `.claude/worktrees/delivery-batch` has the stash applied on top of it by accident (agent 3 ran `git stash pop`): 15 conflicted files, 21 untracked. Nothing is lost (its branch is merged; the stash is intact). Cleaning it needs `git reset --hard 4a66a80` there and deleting the 21 untracked files; the agent was refused that and so the orchestrator has not done it either
- [x] Merge `delivery-circuits` into `main`. `e358d98` (one conflict, the level card in `render/menu.js`, both sides kept; `delivery-levels-check.mjs` passes on the result: 47 levels build, six races start)
- [ ] Drop the stash (the port has landed; held until the worktree above is cleaned)

## Running and queued (three at a time)

1. Side roads cleanup: **finished**, agent 4, merged into `main` as `a22cab5` (no conflicts; levels, hazards and save checks pass)
   - [x] Polygons flickering on side roads on hills: the side road sat up to 4 cm (18 cm at worst) below the expressway's ground; now exactly level with it, slope capped at 6%. `3a2fefe`. Checked by numbers and stills, not by watching it move
   - [x] Fork and merge markings: lane-drop dashes, a nose where the solid lines meet, chevrons in the wedge, edge lines carried onto the side road. Side roads now part from the expressway by 14 m. `249424f`
   - [x] Decor beside the main road prunes by real distance to every other road, in every theme. `7ae100d`
   - [x] More allowed: hills with flyovers, exits on an all-oncoming level, pickups and obstacles in any side-road lane, six more gimmick kinds, a full left shoulder. `c01a8ee`
   - [~] Every theme: shot in 25 of 28, about a third of the pictures opened. Not looked at: singaporeNight, canberra, suburb, battlefield, bathurst, panorama, montreal, sea, night, hongkong, christmas, monza
   - [ ] Still not allowed: flyovers on a one-way level; 17 gimmick kinds on a side road (ice, mud, fog, roadblocks, tunnels and others: now reported when the level loads)
   - [ ] Scenery along a side road's own roadside in themes other than the city
2. Amphibious cars and levels: **finished**, agent 5, merged into `main` as `2f30028` (no conflicts into main; levels, water, save, mysteries, earned and bundle checks pass; the save cookie is 3382 of 4096 bytes)
   - [x] Five amphibious cars, one per star level: Sailing Herald, Float Van, Toybota, Dampervan, Nissank. `43e77e2`
   - [x] Amphibious section in the garage, open from the start, with a Show: Amphibious filter. `43e77e2`
   - [x] Water stages (`water: [{ from, to, current? }]`): driven into at speed, 74% top speed afloat; traffic that cannot float queues on the shoulder, leaving every lane open; amphibious traffic drives through. `e459b4c`
   - [x] Boat traffic: dinghy, barge, ferry, pedal boat; their wakes push the car sideways. `e459b4c`
   - [x] Amphibious-only levels: refused without an amphibious car (the garage opens at the cheapest). `0ea67a1`
   - [x] Five levels, A1 to A5: Slipway Beach, Harbour Lights, High Water (a new `flooded` theme), Hippo Ford, Fjord Crossing. `75f5769`, `3bf3f0e`
   - [x] Gimmicks cards, menu pictures, README and HANDOVER. `3e9af79`
   - [x] Super liveries for the five (they were missing and failed the mysteries check after the merge). `d0c4ec1`
   - [ ] Never played by hand: afloat handling, wakes and currents, prices, clocks
   - [ ] The slipway is faked (water 0.32 m over a flat road); boats tie up at the far bank and do not turn back
   - [ ] For the owner to overrule: section open from the start, A1-A5 numbering, prices, sea-green stars, 74% afloat
3. Gimmick fixes and circuit run-off: **finished**, agent 6, on `main` (levels, hazards and gravel checks pass)
$1. Seen in a still: the car on the raised leaf. A "JUMP 70+" board stands before it; every garage car clears it at top speed. A car that rolls back waits at the foot until the leaves come down (the cost of a miss: owner may overrule)
$1. Seen in a still: the load over on the shoulder with its arrows lit. On an unlucky phase neither side is open on arrival at one fixed speed
   - [x] Burst water mains: irregular, soft-edged pools and a fountain. `39ac540`. Not yet seen by the orchestrator
$1. Largest step between neighbouring widths: Monza 47.5 m to 0, Spa 27.5 m to 0. The stretch count went up (105 to 230, 95 to 190), each now a taper. Seen in a still of Spa
   - [x] Gravel traps (`gravel: [{ from, to, side, inner?, outer? }]`): heavy drag, 35% steering, a car that stops is beached for 1.6 s; from 144 km/h one second in gravel leaves 43 km/h. On Monza and Spa from the map's sand and gravel; none on Albert Park (none mapped). `70ef5dc`. Seen in a still of Spa; a car in the gravel never seen, the sound never heard
   - [x] Found on the way: a negative first frame after `?ff` threw the camera off the road in screenshots; fixed in `main.js`. `39ac540`
4. The cargo: **finished**, agent 7, merged into `main` as `558f5c4` (no conflicts into main; levels, cargo, save and bundle checks pass)
   - [x] Five normal things: tower of pizzas, wedding cake, goldfish, gift-wrapped cactus, grandfather clock. `9b2aebb`
   - [x] Five odd things for Evil, animated, three states each: ticking parcel, porcupine, crate of bees, cursed doll, specimen jar. `9b2aebb`
   - [x] Shown in a corner of the screen; Evil's state follows the time left (agitated at 50% of the clock, furious at 20%). `cd3b18d`
   - [x] New ending: the car pulls in at the kerb, the camera pans round, the cargo is set down, then the results (4.9 s, skippable; results fixed at the line). `8255e1f`, `cd3b18d`
   - [x] A Cargo page showing all ten, linked from the menu and the Gimmicks page. `9b2aebb`, `9d018de`
   - [ ] Never seen moving or heard; not on a real phone; the kerb camera looked at on six levels only
   - [ ] For the owner to overrule: a late delivery also gets the ending; the thresholds; the length; the HUD behind the results reads "GHOST"
   - [ ] `.replay-check` fails on Expressway (runs part at 7 s); the agent says it fails the same without its work
   - [ ] `.hazards-check` sometimes throws when run straight after other checks, and passes by itself

## Round 2: running and queued (three at a time)

The owner's standing instruction (10-Oct): assign the unassigned lists, and give any new task to
whichever agent is free, without asking first.

5. Level editor, full control: **finished**, agent 8, merged into `main` as `5fe99da` (no conflicts). A schema of 99 level fields (`levelSchema.js`); the editor builds every form, place-button and its map from it; all level files load and save through it unchanged. Not started: E1.4 (the game validating with the schema), E6.2 (clock button). Partly: E2.6, E3.5, E5.3, E6.1. Nothing clicked by hand. The item ticks are in the editor section below
6. Police pursuit: **redone and merged** into `main` as `65478c1` (agent 12; `f2404a4`, `cab1580`, `dcaa98c`, `b64201e`). Now 152 lines of logic where it was 402. The owner's verdict on the first version: "It is supposed to just be a simple traffic event." So: a getaway car and the interceptor (a model of its own) come through from behind like an ambulance does and drive on; no endings, rewards or gambles. The bank robber wanting a lift (P2, the orchestrator's idea, never asked for) is removed. The other road characters (P3 to P13) are NOT being built. First version, stopped at 09:21: `881f429`, `ee6dde8`, `bcd6b25`
7. Road gimmicks: **stopped at 09:21**, agent 10, on `main`. Unfinished ramp-over-the-jam work is sitting uncommitted in the main checkout (17 files). Nobody is on it. Done so far: G16 crosswinds (`1d48924`: on Grand Pacific, Hurricane, Tokyo) and H1 crest jumps (`9d7711b`: on Rival Run, Mystery Meadows), both on the hidden Gimmick Road 3. It re-timed two clocks by a lot; told to put them back. A hidden Gimmick Road 3, then G16 crosswind, H1 crest jumps, H2 ramp over the jam, H8 washboard, H4 low bridge, H5 ford, then the rest of the kept G and H lists; each also put on two or three real levels
8. New themes: **stopped at 09:21**, agent 11, branch `delivery-themes` (in the city-levels worktree). The toy room's look is committed (`14e3c56`); its gimmick is uncommitted in that worktree. Nobody is on it. In the owner's order (most unlike the game first): T14 toy room, T15 underwater tunnel, T18 moon base, T13 film studio backlot, T1 Venice, T4 ice road, then on down the ranking; a level for each
9. Queued after that, as slots free: menu pictures and clocks (the three circuits, the five themed levels, Super and 6-star cars); 28 liveries; 31 endless mode; the replay system's next step (`REPLAY-NOTES.md`); 51 performance on phones; 49 and 50 (test speed, lint and CI)

- [x] Super cars screenshotted: all 35, Good and Evil (70 pictures, two contact sheets, sent to the owner). Every one has its livery, stripe and kit. To look at closer: the Super of the Super Lowrider (caught mid-hop, parts apart), the Dampervan (too big for the frame), the Tow Truck's wing beside its crane
- [x] Super cars: the stripe stops at every screen and window; the kit rides the body's animation; an underglow under every Super car; vans and off-roaders get a wing, a bull bar, a snorkel and roof lamps. `136c0d5`, `35e0ac3`
- [x] Menu pictures of the 35 Super cars, Good and Evil, in `carshots/` as `super-<id>-good.jpg` / `-evil.jpg`. `8d7ab8f`. Nothing shows them yet
- [x] A car picked in the garage takes the side whose livery is showing; the garage opens in the livery of the side being played. `8a0bd79`. Seen in one screenshot ("Drive it as Evil"); not clicked

## Round 3: clearing the list (owner, 10-Oct: "Delegate agents to properly clear the list")

Three agents at a time; the next item starts as each one finishes.

- [x] **Stelvio and Market Town**: agent 14, merged into `main` as `f9303ee` (`2050f4e`, `1d787fa`, `c513726`, `ff83536`); levels, schema, bundle, hazards and HUD checks pass. Seen: Stelvio's hairpin and Market Town's crossroads, before and after, sent to the owner
  - [x] Boulders: a rock's waiting place and fall were measured from the road's plane, not the land, so it hung in the sky. Now each waits on the land and lands a little sunk, on every level
  - [x] Markings: a crossroads' arms were not counted as roads, so houses and lawns lay over the cross road and hid its lines. Arms are roads now, for every theme; the suburb gets pavements, lots and trees along side roads and cross roads
  - [x] Stelvio: stone walls and red and white bands round the hairpins, snow poles, a summit hut and sign, a crosswind over the top, 20 cash pickups in 8 rows
  - [x] Market Town: a calmer side road, market umbrellas, a burst main, 25 cash pickups in 10 rows
  - [ ] Still wrong: the face between Stelvio's legs is a ramp on a coarse grid; no valley view; Market Town's railway is a flat band; the cross road has no houses; a pickup on a shoulder of the main road fails the level check (so rows are two across at most on a two-lane road)
- [x] Police pursuit redone as a plain traffic event: a getaway car and its interceptor come through from behind and drive on; nothing gained or lost by the player. Merged, `65478c1`; levels, schema, pursuit and hazards checks pass. Seen as two small stills and its Gimmicks card. For the owner: the pair now pass at 130% of the player's top speed; the getaway car is no longer an "evil" car; the helicopter was removed
- [x] Car ideas lot: all 30 models, the table and the garage's "Car ideas" tab, on `main` (`18125cb`, `9ce0665`, `657beea`, `303bdb7`). Contact sheet sent to the owner. Weakest: Split-Window Coupe, Midnight Coupe, Two-Stroke Saloon. Nothing clicked by hand
- [x] Twenty more Good cargo items (C1 to C20): agent 15, merged into `main` (`cc34343`, `533d5a2`); cargo, bundle and levels checks pass; seen on the Cargo page's contact sheet, sent to the owner. Weakest: sushi boat, tea set, globe. Nothing seen moving
- [x] Twenty more Evil cargo items (C21 to C40), three states each: agent 16, merged into `main` as `6fc32e2` (`c8ba744`, `269134e`; two small conflicts with the Good branch, both sides kept); cargo, bundle and levels checks pass; 50 items in all now. Seen on two contact sheets, sent to the owner. Weakest: the teddy bear's middle state, the cannonball's first two states, the reactor's last, the skunk asleep. Nothing seen moving
- [ ] Cargo picked by hand for more levels (the pairs suggested under "More cargo"): not done; every level gets one by its place on the menu
- [x] Menu UI rework (M1 to M3): agent 18, merged into `main` as `59ffd04` (`1eb9ece`, `f6fa1bc`, `0c54493`, `6ffb4fd`); bundle, levels, schema, descriptions, road-card and HUD checks pass. One screen with no scrolling: a level stage, a strip, the car and side beside it, one START; a description of every level for each side (in each level's JSON); "What's on this road" opens a card of the level's gimmicks, pickups and traffic with their 3D models. The orchestrator added the themed-level group and descriptions for T1 to T3 at the merge (`087fb40`). Seen at desktop size after the merge and in the agent's phone still; sent to the owner. Nothing clicked, tapped or heard. Eight levels still have no menu picture
- [x] In-game UI improvements (U1 to U5): agent 17, merged into `main` as `1d94f0e` (`8cb5d78`, `5eb974f`); levels, bundle and HUD checks pass. A ring with the distance to go and a shoulder dial in the meters' corner; messages along the top edge in landscape and at the foot in portrait; `CONFIG.messageTimes`; eleven sticky messages (puncture, beached, bad gas, heavy, butterfingers, and six bad mystery effects); the mystery's name in the status. Seen at desktop and phone size, sent to the owner. Weak spots: wrapped messages and sticky rows push the camera warning toward the horizon on desktop; in portrait a long message reaches the car. Nothing seen moving
- [~] Road gimmicks: agent 19, branch `delivery-gimmicks`. **Merged so far** (f6e0648): H2 the ramp over the jam (Night Drive, Speed Trap Alley), H8 washboard dirt (Safari, Outback Express), H4 the low bridge (Ring Road, Quarry Run), H5 the ford (Back Roads, Quarry Run), H19 speed cushions (Suburbs, The Hood, Christmas Eve), H10 black ice in the shade (Mountain Pass, Fjord Crossing); all on the hidden Gimmick Road 3; no clock changed. Carrying on from H9 ruts, plus the drawbridge's river colour and an asteroid-drifter error
- [~] New levels on new themes, built from the gimmicks the game has now (owner, 10-Oct: "Let's get some agents going making new levels with the new themes and the gimmicks we have right now"). No new gimmick per theme. Three agents, three themes each, a level on each:
  - [x] A (agent 20), merged into `main` as `6e327af`; levels, schema, bundle, save and targets checks pass. A group of their own on the menu (T1...), saved progress undisturbed. **T1 Toy Room**, **T2 Twenty Thousand Leaks** (a new sea-bed theme: the road in a glass tube), **T3 Tranquility Base** (a new moon theme). 22 to 28 cash pickups and 8 to 11 side-by-side rows each. Seen in one still each, sent to the owner. Not played. The stopped agent's toy gimmicks and low gravity were cut and kept on `delivery-themes-toys-wip`
  - [~] D (agent 26, `delivery-themes-d`): T16 old Wild West, T9 favela hillside, T17 rice terraces
  - [x] B (agent 21), merged into `main`: **Quiet on Set** (a film studio backlot: five sets in turn), **Acqua Alta** (Venice: the road a quay on the lagoon), **Northern Lights** (an ice road at night under an aurora). 29, 35 and 37 cash pickups; 9, 13 and 11 rows. Seen in one still each. Not played
    - [x] T13 film studio backlot: theme `backlot` (`29d651b`), level `backlot` "Quiet on Set" (`65e69cf`): 4150 m in five sets (the lot, a Western town, a soundstage tunnel with a spaceship corridor, a New York street of flats, painted skies), 29 cash pickups, nine rows side by side. Verified: the levels, schema, bundle and save checks; a ghost driven to the finish; each row takes only the pickup in the car's lane (a headless check); 30 stills along the level looked at. Not verified: nothing played by hand, nothing seen moving (the wind machines' fans, the gimmicks in action), no sound
    - [x] T1 Venice: theme `venice` (`4efb9c8`), level `venice` "Acqua Alta" (`bf2c77d`): 4500 m of quay, an ordinary road level (the water is beside the road; acqua alta is the tide the game has, no new gimmick): three humped bridges that are crest jumps, a drawbridge, a carnival parade, a sotoportego (tunnel), fog, the tide, a balloon, a reversible lane; 35 cash pickups, thirteen rows of two. Verified as the backlot was (checks, ghost to the finish, rows, 24 stills). Not verified: nothing played by hand; the boats are scenery and do not move; the drawbridge's own river is the gimmick's blue, not the lagoon's green
    - [x] T4 ice road: theme `iceroad` (`4b41285`), level `iceroad` "Northern Lights" (`45b99b9`): 4600 m across a frozen lake at night under the aurora, an ordinary road level (no breaking ice: the ice patches, crosswinds, fog and burst mains the game has): eight ice patches, two crosswinds, a pressure ridge that is a crest jump, a side road, sliding crates, a whiteout, a wide load, truck convoys; 37 cash pickups, eleven rows side by side (two of them on the side road). Verified as the others (checks, ghost to the finish, 21 stills; the rows on the expressway by a headless check, the two on the side road only by the level check). Not verified: nothing played by hand; the aurora's drift not seen moving
  - [x] C (agent 22), merged into `main`: **Thrill Park** (a theme park with a rollercoaster over the road), **Cinder Island** (a volcano island with rivers of lava), **Dock Run** (a container port). 31, 29 and 27 cash pickups; 11, 9 and 8 rows. Seen in one still each. Not played. Known flaw: the drawbridge draws a blue river on any theme (given to agent 19)
  - [x] **"The themed levels are just normal levels"** (owner): no T group; they are numbered levels 32 to 40, ahead of the specials; saved progress counts them in. `9335812`, `3f75184`, `88e87aa`. All checks pass; the save cookie is 3760 of 4096 bytes with 57 levels
- **Standing rule for level content (owner, 10-Oct):** "add more Cash bonus pickups on the level from now, and have parts of the level where two or more pickups are side by side." Given to the theme agents, the Stelvio and Market Town agent and the gimmicks agent. Older levels have between none and four cash pickups
- [x] Tank Rage: agent 23, merged into `main` as `d1e6e9d` (`0c72eb6`, `a735f67`, `422f268`); targets (257), tank, water and save checks pass. **Markers:** a theme or a single target can set `target: { offset, height, style, base, arm, beam }`; set for Mumbai (the post stood inside a building), Hong Kong (half in a tower wall), Tokyo, Singapore day and night, Safari and the circuit themes. **Amphibious tank:** a model of its own; a rage on an amphibious level is in it, on land and water; no garage bay. Seen in stills, sent to the owner. For the owner: no garage bay; 46 m/s ashore and 72% afloat; a beam of light only on the configured themes
- [x] Audit (owner: "Audit only", then "Include a plan to cut down on the bloat"): `AUDIT-10-Oct.md`, `11ef1b5`: 32 findings and a ten-stage plan. C4 (script injection in the editor, live), C2, C3, C5, C6 given to agent 24. **C1 needs the owner**: which of the two burst-water-main systems is the game's. Performance findings and the bloat plan are not assigned
- **The level progression rework waits:** the owner will do "a full rebalance later"
- [ ] Next 3: clocks for the five themed levels; Gimmick Road 2's gimmicks into real levels (menu pictures moved to the known-problems agent)
- [~] Known problems: agent 24, branch `delivery-fixes`. Done: the flaky checks (every worktree shared one Vite cache and each run deleted it: `69b8ae1` on `main`); audit C4 (the editor no longer writes level values into the page as HTML), C6 (a pasted save code keeps only a save's fields), C2 (address-bar switches never write the save), C5 (a bad edited level is refused with a reason): committed, not merged yet. To do: C3 with the replay failures, pickups on shoulders, the Gimmicks page's console errors, duplicate keys, stale notes and HANDOVER, the editor's leftovers, the missing menu pictures
- [ ] Next 5: 28 liveries, 31 endless mode, replay in the browser
- [ ] Next 6: 51 phone performance, 49 parallel smoke test, 50 lint and CI
- [ ] Next 7: more circuits (Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka); Albert Park's traps from another source
- Not in the queue unless the owner says: road characters P3 to P13 (the owner wanted the pursuit kept simple); anything needing a person (listening, playing by hand, a real phone)

- [ ] Next 0b: the level progression rework (the owner's spec is in the section "Level progression rework" at the end; nine things in it need the owner's answer before it is built)

## Not assigned

- [ ] 28. Liveries earned for Evil and Good clears
- [ ] 31. Endless mode
- [ ] 49. Smoke test in parallel workers
- [ ] 50. Lint, format and CI
- [ ] 51. Performance on phones
- [ ] Level clocks and menu pictures for Hong Kong, Tokyo, Mumbai, Stelvio, Christmas
- [ ] More circuits: Baku, Brands Hatch, Caesars Palace, Monaco, Donington, Sepang, Suzuka
- [ ] Level editor: full control over every feature and gimmick (itemised below; built on `delivery-editor`: all but E1.4 and E6.2 done or partly done)
- [ ] Gimmick Road 2's gimmicks used in real levels

## Level editor: full control over every feature and gimmick (Agent 8, branch `delivery-editor`)

Asked for by the owner on 10-Oct; investigated by reading `editor.js` (757 lines),
`delivery/editor.html` and the field list at the top of `levels.js`. Built on 10-Oct (see each item):
verified with `.schema-check.mjs`, `.bundle-check.mjs` and headless screenshots, with scripted clicks and
drags from the address bar. **Nothing was clicked by hand.**

**How it is today.** A level has about 90 documented fields. The editor has real controls for 13
(`id`, `name`, `clock`, `tip`, `lanes` as one number, `theme`, `car`, `flow`, `traffic` as typed
text, `segments`, `pickups`, `obstacles`, `targets`). Everything else is typed as raw JSON into the
"Special features" box. Anything in that box with `from`/`to`, `s` or `at` is drawn as a band or a
marker and can be dragged, but its other settings are again raw JSON. Only 12 kinds have a button
that places one (`splits`, `mud`, `ice`, `bridges`, `narrows`, `frogs`, `herds`, `drifters`,
`dropBears`, `hippos`, `tractors`, `parked`). The obstacle list is a hand-written 13 kinds. The
editor knows nothing of what a field's values may be: the only checking is `Track.problems` after
the fact.

### E1. The foundation: one description of every level field

- [x] E1.1 **Done (delivery-editor). `levelSchema.js`: 99 fields, 164 settings; `node scripts/.schema-check.mjs` passes on all 53 levels.** A schema file (`levelSchema.js`, logic side, no rendering): for every field its shape
      (flag, number, choice, stretch `from..to`, point `s`, timed `every {min,max}`, list of
      these, world-placed `x,z`), each setting's type, range, default and choices, which road it
      may be on, and a line of help. About 90 fields; the comments at the top of `levels.js` are
      the source.
- [x] E1.2 **Done (delivery-editor). Seen in screenshots; nothing clicked by hand.** The editor builds its forms, place-buttons, map drawing and default entries from the
      schema, in place of `FEATURE_TEMPLATES`, `EDITED` and the hand-written panels.
- [x] E1.3 **Done (delivery-editor). Obstacles, vehicles, wreckage, themes, cars and cargo from the game's tables; pickup types, herd, drifter, dance, machinery, site, landmark and zone kinds had no table, so the schema is now it (pickups cross-checked with `render/pickupModels.js`).** Lists the editor hard-codes come from the game instead: obstacle kinds from
      `CONFIG.obstacleKinds`, traffic kinds from `CONFIG.vehicles`, herd, drifter, machinery,
      landmark and wreckage kinds from their own tables.
- [ ] E1.4 **NOT DONE: the game does not check levels with the schema (`Game.start` rewrites a rival level's `grid` with keys of its own, and fields arriving from other branches would be reported until their entry is added); `.schema-check.mjs` does it headlessly instead. The README recipe has the step.** The same schema checks a level when the game loads it, so the editor and
      `Track.problems` cannot disagree, and a new gimmick is added to the editor by adding its
      schema entry (add this step to the README's "adding content" recipe).
- [x] E1.5 **Done (delivery-editor). The JSON tab holds the whole level; every selected thing has an "As JSON" box.** The raw JSON box stays, as an "advanced" fallback for anything the schema lacks.

### E2. Level-wide settings that have no control today

- [x] E2.1 **Done (delivery-editor). `laps` is under Race and rivals.** Road: `drive` (left / right), `lanes` as `{ north, south }` and odd counts, `median`,
      `shoulder`, `shoulderTimer`, `speedLimit`, `laps`.
- [x] E2.2 **Done (delivery-editor).** Traffic: the mix as a table with sliders in place of typed text; `trafficCount`,
      `oncomingCount`, `trafficSpeed`, `drivers` (evil, happy, angry), `hesitation`.
- [x] E2.3 **Done (delivery-editor).** Timed events, each a switch with a min and max: `emergencies`, `processions`,
      `convoys` (size, kind), `railway`.
- [x] E2.4 **Done (delivery-editor).** Mode switches: `alwaysGood`, `noPackages`, `understeer`, `wallDamage`, `nudge`,
      `helicopter`, `battle`, `pillboxes`.
- [x] E2.5 **Done (delivery-editor).** Race and rivals: `grid` (count, kind, gap, pace, from), `rival`, `rivals` (name, car,
      colours, marker).
- [ ] E2.6 **PARTLY (delivery-editor): `rain`, `snow`, `festive`, `elevated` are properties of a theme, not level fields: the theme picker says what each theme brings; no switches.** Weather and look, where a theme allows it: `rain`, `snow`, `festive`, `elevated`.

### E3. The road itself

- [x] E3.1 **Done (delivery-editor). On the Road tab each segment's end is a handle: dragged along the road it changes the length, across it the bend (one handle for both); the rise and fall is a strip along the bottom of the map on a road with a slope. Seen through a scripted drag (a blank level's third segment bent 53 degrees) and on Stelvio; not dragged by hand.** Segments: draw and drag the road on the map (handles for a bend's length and angle),
      beside the table; show the gradient profile as a strip under the map.
- [x] E3.2 **Done (delivery-editor). Fork and merge placed by a click and dragged as a band; out, bends, own segments, lanes (a number or along the way), oncoming, oncomingFrom and flyovers in the form. Dragging not tried by hand.** Side roads (`exits`): place the fork and merge by clicking, drag them, and edit `out`,
      the side road's own `segments`, `lanes`, widenings and `flyovers` in a form. Today only
      "oncoming from here" has a tool.
- [x] E3.3 **Done (delivery-editor). From the schema (place, drag, form). The quarter bend still has to be made in the segments table.** Crossroads (`junctions`): place, with `turn`, `forward`, `turnOff`.
- [x] E3.4 **Done (delivery-editor). Also `water`, `gravel`, `tide`; `runoff` with its taper (`end`).** Stretch kinds that change the road, with forms: `narrows`, `splits`, `bridges`,
      `tunnels`, `runoff`, `stands`, `runway`, `reversible`, `quietZones`, `trafficZones`, `zones`
      (scenery, ground, sky, sea).
- [ ] E3.5 **PARTLY (delivery-editor): the Road tab says how far a road is from closing and by what angle; no "close it" button. Run-off and stands per side are in their forms.** Circuits: closing a lapped road (show the gap and heading error, offer to close it),
      and run-off and stands per side.

### E4. Gimmicks: a place-button and a form for each (most have neither)

- [x] E4.1 **Done (delivery-editor).** Stretch gimmicks: `fog`, `gunfire`, `asteroidFields`, `storm`, `migration`,
      `elephants`, `landmines`, `trolleys`, `stampedes`, `rockfall`, `quarries`, `tide` (with its
      waves), plus full forms for the ten that only have a button.
- [x] E4.2 **Done (delivery-editor).** Point gimmicks: `cameras`, `crossings`, `stopGo`, `potholes`, `potties`, `machinery`,
      `siteWorks`, `waterMains`, `parades`, `roadblocks`, `iceCreamStops`, `schoolCrossings`,
      `balloons`, `drawbridges`, `wideLoads`, `marathons`, `pelotons`, `wreckage`, `tower`,
      `shoulderRows`, `parkedPlanes`.
- [x] E4.3 **Done (delivery-editor). Seen: Gimmick Road 2's side-road camera, potholes, crossing and stampede drawn; a stampede placed on Expressway's side road by a scripted click.** Gimmicks on a side road (`{ road: 'side', exit: n }`): the editor leaves these off the
      map entirely today. Draw them, place them and drag them along the side road.
- [x] E4.4 **Done (delivery-editor). Lanes offered are those of the road at that spot (closed ones marked; a side road's own); ranges for wide loads, balloons, wreckage.** Lane pickers that know the road at that spot (a narrowed stretch, an exit lane, a side
      road's own lanes), and lane ranges (`lanes: [first, last]`) for wide loads, balloons and
      wreckage.
- [x] E4.5 **Done (delivery-editor). A hollow arrowhead where the player sets it off, joined to the thing when selected.** Triggers: for anything with `trigger` or `flipAt`, show on the map where the player
      sets it off as well as where it happens.
- [x] E4.6 **Done (delivery-editor). Rings in the world, a tick to turn them by; circuit `paths` drawn. Which way `rot` turns a model was not checked against the 3D view.** World-placed things (`landmarks`: `x, z, r, rot`): place and turn them on the map
      beside the road, not along it.
- [x] E4.7 **Done (delivery-editor). Each form lists its rules with a tick or a cross; where a thing cannot go is tinted red on the road while it is being placed; a button whose level-wide rule fails is marked.** Rules shown while editing, not after: straight road only (crossings, stop / go,
      drawbridges), level road only (bridges), two-way only (stop / go, reversible), what cannot be
      combined with exits. The side roads cleanup in the queue will change some of these.

### E5. Keeping a level whole while it is edited

- [x] E5.1 **Done (delivery-editor). "Move what comes after" (on by default), also when a segment is removed. Seen on Expressway: first segment 600 to 1200 m.** Changing a segment's length moves or stretches everything after it (today "a change to
      the road can leave them out of place").
- [x] E5.2 **Done (delivery-editor). Buttons, Ctrl+Z, Ctrl+Y. Seen through a scripted drag and undo; not by hand.** Undo and redo.
- [ ] E5.3 **PARTLY (delivery-editor): Duplicate (Ctrl+D), copy and paste (Ctrl+C / V) of one thing; no selecting several.** Copy, paste and duplicate; select and move several things at once.
- [x] E5.4 **Done (delivery-editor). Each problem under the map is a button to its cause (the game's problems are traced by their wording: a new wording falls back to the list).** Problems listed under the map link to the thing that causes them.
- [x] E5.5 **Done (delivery-editor). Autosave to local storage (not when the address names a level); Load .json by button or drop. Neither tried by hand.** Autosave of the level being edited, and Load a `.json` file (today only the built-in
      levels can be opened, and only Download saves).

### E6. Seeing and proving it

- [ ] E6.1 **PARTLY (delivery-editor): "Play from here" (a tool, and a button on each thing) opens `?edited&at=`; the 3D view is still updated by its button.** The 3D view updates as you edit, and "Play from here" starts a run at the spot under
      the cursor (`?at=`).
- [ ] E6.2 **NOT DONE: not started.** A "Work out the clock" button, doing what `scripts/level-clocks.mjs` does, in the page.
- [x] E6.3 **Done (delivery-editor).** Filters on the map (show only one kind, hide scenery bands) and a list of everything in
      the level to pick from.
- [x] E6.4 **Done (delivery-editor). `scripts/.schema-check.mjs`.** A headless check that the schema covers every field used by every level in `levels/`,
      and that each level passes through the editor's load and save unchanged.

### E7. To come from today's queue (add their fields once they exist)

- [x] E7.1 **Done (delivery-editor). `water` (place, drag, form, rules), `amphibious`; boats are kinds in the traffic mix.** Water stages, boat traffic and "amphibious only" for the amphibious levels.
- [x] E7.2 **Done (delivery-editor).** The cargo a level carries, for each side.
- [x] E7.3 **Done (delivery-editor). The side-road list of today's `levels.js` (`road: 'both'` on 22 fields).** Whatever the side roads cleanup adds or lifts.

Order that makes sense: E1 first (everything else is built on it), then E4.1 to E4.3 and E2 (they
fall out of the schema almost for free), then E3.2 and E5.1, then the rest. Removed today, so not
listed: tolls and average-speed cameras.

## New themes (ideas, not assigned)

Thought up by the orchestrator on 10-Oct at the owner's request; none is built. The game has 25
themes already: city and night city, suburb, hood, farm, beach, coast, safari, snow (alpine),
construction, airport, Singapore by day and night, Canberra, Hong Kong, Tokyo, Mumbai, Christmas,
Bathurst and Panorama, Montreal, hell, battlefield, sea and space, plus Monza, Spa and Albert Park.
Each idea below is a look the game does not have, with the gimmick that would make it more than
new scenery. "Reuses" is what is already in the engine. A star marks the five that would suit the
amphibious levels in the queue.

Pick the most unique theme from what is already in the game first

**Order to build in, by the owner's rule above** (furthest from anything the game has, first;
orchestrator's ranking):

Build the theme first, then the level. Make sure the theme is reusable

1. T14 Toy room: nothing in the game changes scale or leaves the outdoors.
2. T15 Underwater tunnel: no theme is under water or looks out through glass.
3. T18 Moon base: the only one that changes the physics (low gravity).
4. T13 Film studio backlot: several fake worlds in one street.
5. T1 Venice: the first theme where the road itself is water. Amphibious.
6. T4 Ice road: a road with no land under it, that breaks. Amphibious.
7. T12 Theme park: rides sharing the road.
8. T7 Volcano island: the level loses lanes for good as it goes.
9. T11 Container port: walls and hazards that are machines.
10. T3 Fjord. Amphibious. (Near snow and coast in look; the ferry slip is what is new.)
11. T2 Mangrove delta. Amphibious. (Near safari's river and Mumbai's rain.)
12. T16 Old Wild West. (Near safari's dirt road and the railway.)
13. T9 Favela hillside. (Near Stelvio's hairpins and the hood.)
14. T17 Rice terraces. (Near farm and the terrain themes.)
15. T6 Desert canyon. (Near safari and Bathurst's rock.)
16. T5 Flooded city. Amphibious. (The city theme, wet.)
17. T10 Night market. (Near Hong Kong and Tokyo.)
18. T8 Autumn countryside. (The farm theme in other colours.)

- [ ] T1. **Venice** ★: the road is a quay between palazzi, humped bridges, striped mooring poles,
      and the canal itself for the water stretches. Gimmick: acqua alta, the square floods on a
      timer and the quay becomes water. Boat traffic: gondolas (slow), vaporetti (the bus), water
      taxis. Reuses: `tide.js`, bridges, the sea's water.
- [ ] T2. **Mangrove delta** ★: a causeway on stilts through mangroves, stilt houses, a floating
      market where the road ends and the river begins. Gimmick: market boats drift across the
      channel as herds do; crocodiles in place of hippos. Boat traffic: longtails, rice barges.
      Reuses: `hippos.js`, herds, rain.
- [ ] T3. **Fjord** ★: a road cut into a cliff over dark water, waterfalls, red boathouses, then
      the ferry slip where the road simply goes into the fjord and comes out the other side.
      Gimmick: the ferry crossing as a moving platform, or swim it; icebergs calving. Reuses:
      terrain, tunnels, rockfall, snow.
- [ ] T4. **Ice road** ★: a ploughed road across a frozen lake, snowbanks for kerbs, fishing huts,
      pressure ridges. Gimmick: the ice has a weight limit; cracks spread behind heavy vehicles,
      and thin stretches are open water that only an amphibious car crosses. Aurora at night.
      Reuses: ice, snow, the truck kinds' `mass`.
- [ ] T5. **Flooded city** ★: the city theme after the river broke its banks: water to the door
      handles in the dips, cars abandoned, sandbags, people on roofs. Gimmick: the water level
      rises through the run, so the dry stretches shrink. Boat traffic: rescue boats, a floating
      bus. Reuses: city scenery, water mains, the Mumbai rain.
- [ ] T6. **Desert canyon**: red rock walls, mesas, a dry riverbed for a shoulder, tumbleweed.
      Gimmick: a dust storm that closes visibility like fog but blows cars sideways; a flash flood
      down the wash. Reuses: fog, storm, terrain, rockfall.
- [x] T7. **Built (agent 22, `delivery-themes-c`): theme `volcano`, level `cinder` "Cinder Island" from the gimmicks the game has (the lava bombs and the lost lanes below were not built). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Volcano island**: black sand, palms, steam vents, a lava field across the old road.
      Gimmick: lava bombs landing on the road and cooling into obstacles; lava flows that close a
      lane for good partway through the run. Reuses: quarry blasts and boulders, hell's palette.
- [ ] T8. **Autumn countryside**: orange and red forest, stone walls, covered bridges, a village
      with a harvest fair. Gimmick: wet leaves in the bends (slick only off the racing line),
      a hay-cart convoy, a low sun straight ahead on one stretch. Reuses: farm, ice, convoys.
- [x] T9. **Favela hillside** (done as theme `favela` and level "Favela Heights", `levels/morro.json`, with the game's existing
      gimmicks: a parade for the carnival, burst mains, an ice-cream van, trolleys, a fun run, cyclists, a balloon, a tunnel and a
      crest on the ridge. NO bouncing balls or filtering motorbike taxis of its own. Verified: the checks, a ghost probe to the
      end, screenshots along it. Not played by hand): a steep switchback road between stacked houses in every colour,
      stairs, cable cars overhead, a football pitch on a roof. Gimmick: balls bouncing down the
      stairs onto the road, motorbike taxis that filter between lanes. Reuses: Stelvio's
      hairpins, drifters, the rickshaw's agility.
- [ ] T10. **Night market**: a street closed down to two lanes by stalls, lanterns, steam,
      neon signs in the rain. Gimmick: the stalls creep outward as the evening goes on, and
      pedestrians cross anywhere. Reuses: narrows, parades, the lit themes, school crossing's
      walkers.
- [x] T11. **Built (agent 22, `delivery-themes-c`): theme `port`, level `docks` "Dock Run" from the gimmicks the game has (the cranes lowering boxes into lanes below were not built: the cranes are scenery). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Container port**: stacks of containers for walls, gantry cranes, straddle carriers,
      rail lines in the road. Gimmick: cranes lower containers into lanes on a rhythm; straddle
      carriers drive over you if you are low enough. Reuses: machinery, level crossings, falling
      cargo, potties' patterns.
- [x] T12. **Built (agent 22, `delivery-themes-c`): theme `themepark`, level `park` "Thrill Park" from the gimmicks the game has (the coaster sharing the road and the bumper cars below were not built: the coaster is scenery). Verified: levels, schema, bundle, save, descriptions and targets checks; a ghost driven to the end; each pickup of a row taken only from its own lane; screenshots along the whole level and of a target. Not verified: nothing played by hand, nothing seen moving (the scenery that moves was seen only in stills), nothing heard.** **Theme park**: the road runs through the park: a rollercoaster looping over it,
      a Ferris wheel, a log flume that crosses as a water stretch, a parade route. Gimmick: the
      coaster's train shares the road for a stretch; bumper cars as traffic. Reuses: parades,
      bullet train, balloons.
- [ ] T13. **Film studio backlot**: one street that is a Western town, then a spaceship set, then
      a painted sky on a flat, with cameras on cranes and a director's chair. Gimmick: stunt
      cars that crash on cue (scripted wreckage) and a "cut!" that freezes traffic. Reuses:
      zones (a look per stretch), wreckage, the traffic-freeze mystery.
- [x] T14. **Toy room** (done as level T1 "Toy Room", `levels/toys.json`, with the game's existing gimmicks, not the
      three below: those are unfinished on branch `delivery-themes-toys-wip`. Verified: the level's checks, a ghost
      probe to the end, screenshots along it. Not played by hand): the whole level at toy scale: a road of plastic track across a carpet,
      building blocks, a train set, a sleeping cat. Gimmick: marbles rolling down the track, the
      cat's paw as a hazard, a ramp-and-loop jump. Reuses: drifters, drawbridge jump, the models
      are already toy-like.
- [x] T15. **Underwater tunnel** (done as theme `seabed` and level T2 "Twenty Thousand Leaks", `levels/leaks.json`, with
      the game's existing gimmicks: burst mains for the leaks, two tunnels for the dark stretches. No pump, no gimmick
      of its own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a glass tube on the sea bed: whales and shoals outside, a
      leaking stretch, an air-lock at each end. Gimmick: leaks that flood a lane until a pump
      catches up; a section with the lights out. Reuses: tunnels, water mains, blackout.
- [x] T16. **Old Wild West** (done as theme `wildwest` and level "High Noon", `levels/noon.json`, with the game's existing
      gimmicks: stampedes for the cattle drive, a level crossing, a mine tunnel, three crests, pursuits for the posse. NO train
      robbery or duel of its own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a dirt main street, saloon, water tower, a steam railway beside the
      road, cactus. Gimmick: a train robbery (riders alongside the train, across the road), a
      cattle drive, a duel at noon that stops the traffic. Reuses: railway, stampedes, gunfire,
      the safari's unmarked dirt road.
- [x] T17. **Rice terraces** (done as theme `rice` and level "Emerald Steps", `levels/rice.json`, with the game's existing
      gimmicks: a ford with its side road for the bridge, burst mains and mud for the spill, herds for the buffalo, tractors,
      speed cushions, cyclists, fog in the valley, a crest and a crosswind on the ridge. NO flooding terraces or ducks of its
      own. Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): a narrow road stepping down green terraces, water buffalo, a
      temple gate over the road, kites. Gimmick: the terraces flood in turn, spilling across the
      road as moving slick patches; ducks crossing in a line. Reuses: terrain, water mains'
      slicks, herds.
- [x] T18. **Moon base** (done as theme `moon` and level T3 "Tranquility Base", `levels/moon.json`, with the game's
      existing gimmicks: four crests to fly, potholes for craterlets, rockfall and a boulder strike for meteors. NO low
      gravity: the physics are the game's own (the stopped agent's start on it is on `delivery-themes-toys-wip`).
      Verified: the checks, a ghost probe to the end, screenshots along it. Not played by hand): grey regolith, domes, a low black sky with the Earth in it, a road of
      compacted dust. Gimmick: low gravity: every bump is a long jump and braking takes twice as
      far. Different from the space theme, which has no ground. Reuses: space's sky, potholes,
      the jump physics.

The five starred ones go with the amphibious levels in the queue; taken in the order above that is
Venice, ice road, fjord, mangrove delta, flooded city. T8 and T10 are the cheapest to build, being
mostly new colours on existing scenery, which is also why they are last.

## New gimmicks (ideas, not assigned)

Thought up by the orchestrator on 10-Oct at the owner's request, with the owner's rule: **not another
moving thing on the road that explodes when hit.** Each one below changes a rule of the game for a
stretch: what the road is, what the player can see or know, how the car answers, what the traffic
does, or what the run is for. None is built.

**The owner's rules for a gimmick** (10-Oct, after cutting this list from 36 to 11). Not wanted:

1. Having to stop the car, or wait.
2. No counterplay: do as told or get busted.
3. Variants of delivering fast, or to several places: they play exactly as a regular level does.
4. Another moving thing on the road that explodes when hit.

What decides it is counterplay, in the owner's words: "Roundabout and Fuel has counterplay - you can
risk it or not. Red lights, missing the ferry etc has zero counterplay." So stopping is not the
fault in itself: a stop the player can choose to risk skipping (dive into the gap on the roundabout,
run past the pump and hope the tank lasts) is a decision; a stop the game simply imposes (a red
light, a ferry that has gone) is not. Every gimmick should give the player a gamble to take or
leave.

### The road itself changes

- [ ] G3. **Roundabout**: the road goes round an island; traffic already on it has the way. Pick
      a gap or wait. The exit taken can be the short way or the long way round.
- [ ] G4. **Fork with a choice**: the road splits into two real routes that rejoin: a short one
      full of traffic and a long clear one, or a dirt cut-through. Signed ahead.

### What the player can see or know

- [ ] G10. **Whiteout or sandstorm with marker posts**: nothing visible but a line of reflector
      posts and the tail-lights ahead. Follow a truck through or go by the posts.
- [ ] G11. **Power cut**: the street lights, traffic lights and signs go dark over a district;
      junctions become free-for-alls and only headlights show the road.

### How the car answers

- [x] G16. **Crosswind**: a steady push sideways on an exposed stretch (a viaduct, a dam), with
      gusts announced by a windsock. Tall cars are pushed more; passing a truck gives shelter,
      then a shove as you clear it.
      _Built (`1d48924`, `gambles.js`, field `crosswinds`):_ on Gimmick Road 3 (300-900), Grand Pacific's
      sea cliff bridge, Hurricane, Tokyo. Verified by `scripts/.gimmicks3-check.mjs wind` (push by
      height, taps hold the lane, shelter beside a bus and the shove on clearing it, traffic drifts in
      lane, the low car's safe line) and in stills on Gimmick Road 3 (socks, the card). Not verified:
      played by hand; the lean on screen; the three real levels on screen.
- [ ] G18. **Fuel**: a long level where the tank will not make it. Petrol stations are on the
      shoulder: pull in and stop (time lost) or run dry and coast.
- [ ] G20. **Fragile cargo**: on this level the package breaks with bumps, kerbs and hard
      braking, not only with crashes. A meter in the corner; the tip scales with what is left.
      Goes with the cargo models in the queue.
- [ ] G22. **Tow**: the car starts the level towing something (a caravan, a boat on a trailer,
      a broken-down friend). It swings wide in bends and takes two lanes to change lane.

### What the traffic does

- [ ] G24. **Zip merge**: two queues merge into one. Take turns and it flows; push in and the
      drivers behind get angry, close the gap, and the social standing drops.
- [ ] G25. **Rush hour wave**: stop-start traffic with waves of braking moving backwards through
      it. Reading the wave and arriving as it opens is faster than racing to the back of it.
- [ ] G26. **School run**: every car on a stretch is trying to stop at the same kerb. They
      double-park, pull out without looking and reverse.

### Second batch (10-Oct, after the owner's cut): each built on a gimmick the game already has

Written to the counterplay rule: every one is a gamble the player can take or leave, and each
says what the gamble is. All are things that happen on real roads, as the eleven kept ones are.

- [x] H1. **Crest jumps**: a street of steep crests, San Francisco style. Take one fast and the
      car flies: no steering in the air, and it lands on whatever is over the top. _Gamble:_ lift
      and see, or fly blind and gain seconds. _Builds on:_ the drawbridge's jump, hills.
      _Built (`9d7711b`, `gambles.js`, a segment's `ease`: no object placed):_ on Gimmick Road 3 (tops at
      1190 and 1490), Rival Run (4400), Mystery Meadows (2740, the cows over the top). Verified by
      `.gimmicks3-check.mjs crest` (flies in a clear lane unhurt, lands in the barrier in the wrong one,
      no steering in the air, the safe line under the board's speed, faster by 2.4 s, a hard landing
      costs, no other level has a crest by accident) and in stills (the hidden far side, the car in the
      air, the card). Not verified: played by hand; the two real crests on screen; sound.
- [x] H2. **Ramp over the jam**: a car transporter with its ramps down, or a roadworks ramp, sits
      in one lane at the back of a queue. Hit it fast enough and the car clears the queue; too
      slow and it lands in it. _Gamble:_ the jump or the slow way round. _Builds on:_ drawbridge
      jump, rubbernecking queues, convoys.
      _Built (`gambles.js`, field `jamRamps: { s, lane, queue?, lanes? }`):_ on Gimmick Road 3 (2400,
      lane 4, 115 km/h), Night (2250, a queue of 2: 85 km/h, a turbo before it) and Speed Trap Alley
      (2860, a queue of 3: 100 km/h, just past the camera at 2750). The queue is real stopped traffic
      (small vehicles, the same every run); cash beyond it. The way round is the oncoming side or the
      shoulder. Verified by `.gimmicks3-check.mjs ramp` (over at the board's speed, into the queue
      8 m/s under it, round by the oncoming lane unhurt, kept out of the trailer from beside, traffic
      moves over, never stood still on the ramp, both real levels load with their whole queue) and
      in stills (the board, the foot, in the air, the card, Night). Not verified: played by hand;
      Speed Trap Alley on screen; whether the cash beyond is picked up on landing.
- [ ] H3. **Tram lane**: the median's rails are an empty lane, and a tram is coming along them
      somewhere. Fast and clear, slippery in the rain, and the tram does not swerve. _Gamble:_
      how long to stay on the rails. _Builds on:_ the railway median, Hong Kong's trams, ice.
- [x] H4. **Low bridge**: a height limit ahead, signed, with the tall-vehicle route going the
      long way round. A low car goes straight under; a van or the bus must take the detour, or
      lose its roof rack, lights and some health trying. _Gamble:_ made in the garage, and again
      at the sign. _Builds on:_ side roads, tunnels, car heights already in `cars.js`.
      _Built (`gambles.js`, field `lowBridges: { s, clearance? }`, as a height bar over the player's
      side, 2 m unless said):_ it must stand between an exit and its merge (the level reports one
      that does not). A car that fits goes under; a taller one that goes at it loses 30 health and
      25 more per metre too tall, and 60% of its speed, and is through; the player is told on the
      way in what the car measures. Tall traffic takes the exit. On Gimmick Road 3 (4400; its first
      side road pushed out to 150 m so the way round costs 4 s), Ring Road (1100) and Quarry Run
      (1510), cash under each. Clocks not re-timed. Verified by `.gimmicks3-check.mjs bridge` (a low
      car untouched, a 2.65 m truck takes the knock and is never stopped, the same truck round by
      the exit unhurt and 4 s slower, the oncoming side not barred, a bus takes the exit, both real
      levels have an exit round theirs) and in stills (the board, the bar, the card, Ring Road).
      Not verified: played by hand. Known gap: a tall traffic vehicle that
      cannot get over to the exit lane is taken off the road if it is 140 m or more from the
      player, and otherwise drives through the bar. It is a bar, not a bridge: say if a real
      bridge over the whole road is wanted.
- [x] H5. **Ford**: the road dips through a river, with the bridge a little further round. Depth
      posts show how deep it is today (it varies down the level). A car that wades well goes
      through; one that does not is slowed to a crawl or stalls. _Gamble:_ read the posts and
      know the car. _Builds on:_ the tide's wading (`crossing` in `cars.js`), side roads.
      _Built (`gambles.js`, field `fords: { from, to, depth? }`, each ford its own fixed depth: it
      does not change during a run):_ between an exit and its merge (the side road is the bridge;
      the level reports a ford with none). A car wades 0.25 m (crossing 0) to 1 m (crossing 1):
      within that it is slowed (to 47 km/h at its limit), beyond it it crawls at 16 km/h and loses
      10 health a second per metre too deep; never stopped. The player is told the depth and what
      the car wades before the exit. On Gimmick Road 3 (5650-5720, 0.6 m; its second side road
      out to 150 m), Back Roads (1790-1850, 0.45 m) and Quarry Run (4060-4105, 0.7 m), cash in each.
      (The low bridge moved from Back Roads to Quarry Run, 1510, so Back Roads has one of the two.)
      Clocks not re-timed. Verified by `.gimmicks3-check.mjs ford` (a truck through unhurt and 3 s
      quicker than the bridge, a lowrider crawling 13 s and 31 health, the same car over the bridge
      dry and 9 s quicker, a ghost untouched, traffic wading slowly, both real levels) and in stills
      (the board, the bank, in it, Back Roads, Quarry Run). Not verified: played by hand; the road
      does not dip (the water lies on it); the card on screen.
- [x] H6. **Flooded underpass** (_built by agent 19 as a ford that fills: `fords: { from, to, depth,
      fills: { to, over }, underpass: true }`. Its depth rises from `depth` to `fills.to` over
      `fills.over` s of the run; the exit before it is the slip road over; a railway bridge is
      drawn over it (the road is not lowered). On Gimmick Road 3 (7150-7230, 0.2 to 0.9 m over
      240 s; the level 1200 m longer for it, with a third side road), Big Business (1670-1735,
      0.15 to 0.85 m over 140 s) and Expressway (2400-2470, 0.1 to 0.7 m over 180 s: never too
      deep for the first car). Clocks not re-timed. Verified by `.gimmicks3-check.mjs ford`: the
      Lowrider through early unhurt, crawling and 82 health late, over by the slip road dry and
      10 s quicker than that, a truck through it full; told the depth now and that it is rising.
      One still (Big Business). Not verified: played by hand; the water seen rising; Expressway
      on screen_): the same, in town in the rain: the main road dips under a
      railway and fills, and the slip road goes up and over. The water rises through the run.
      _Gamble:_ early on it is passable by anything; later only by some. _Builds on:_ tunnels,
      Mumbai's rain, burst water mains.
- [ ] H7. **Hairpin cut**: a rough track straight down the hill between two legs of a hairpin.
      It saves the whole bend, shakes the car, costs health, and rejoins across the traffic.
      _Gamble:_ seconds against damage and a blind rejoin. _Builds on:_ Stelvio's hairpins, mud,
      side roads.
      _Deferred (agent 19):_ a cut between two legs of a hairpin is not a shape a side road can
      take today (an exit leaves from the right-hand lane and runs alongside), and the levels
      with hairpins are being reworked by others.
- [x] H8. **Washboard dirt**: a corrugated dirt road. Slowly, it shakes the grip away; above a
      certain speed the car skims the tops and it goes smooth. _Gamble:_ commit to the speed
      before the bend, or crawl. _Builds on:_ potholes, mud, the safari's dirt road.
      _Built (`gambles.js`, field `washboards: { from, to, skim? }`):_ smooth at 32 km/h or less and
      at 72 km/h or more; between, 88% of the steering goes, the car wanders and runs wide in bends
      (worst half way). On Gimmick Road 3 (2950-3450, three barriers to steer round), Safari
      (2520-2980) and Outback Express (3960-4380), cash on the lines that need steering. Clocks not
      re-timed (skimming costs no time). Verified by `.gimmicks3-check.mjs washboard` (skimming
      round the barriers unhurt, the same steering at 52 km/h hits one, crawling unhurt and 41 s
      slower, braking on it drops into the rough, every garage car can reach the speed, both real
      levels load) and in stills (the boards, on it, the card, Safari). Not verified: played by
      hand; how it feels behind slow traffic; Outback Express on screen; sound.
- [x] H9. **Ruts**: tractors have left deep ruts in the mud. In a rut the car runs straight and
      fast; changing lane means climbing out, with a jolt and a wobble. _Gamble:_ pick the rut
      early and live with it. _Builds on:_ mud, tractors.
      _Built (`gambles.js`, field `ruts: { from, to }`):_ deep mud with a rut down each lane. In a
      rut the car runs at its own pace and is held to it; 0.45 s of steering against it gets it
      out with a jolt (8 health, a fifth of its speed, a lurch) into the mud between, slow by how
      badly the car crosses rough ground, until it drops into the next rut for nothing. On
      Gimmick Road 3 (4830-5030: lane 4's rut has the big cash and then a barrier), Farm
      (2810-2970, a bale down lane 3's) and Outback Express (2560-2860). Clocks not re-timed.
      Verified by `.gimmicks3-check.mjs ruts` (the right rut held at full speed for nothing, a tap
      of steering does not get out, the wrong rut kept runs into its barrier, out after the cash
      with one jolt and past it, the Lowrider slower than the Lifted Truck in the mud, a ghost not
      held, both real levels) and in stills (Gimmick Road 3, Farm, the card). Not verified: played
      by hand; Outback Express on screen. Changing rut costs little time (0.2 s) as tuned: the
      cost is the health.
- [x] H10. **Black ice in the shade**: ice lies only where a building, a cutting or the trees
      shade the road, so it can be read from the shadows before reaching it. _Gamble:_ brake
      before the shadow, or stay in the sunny lane with the traffic. _Builds on:_ ice, the
      scenery already casting the shade.
      _Built (`gambles.js`, field `shade: { from, to, side, lanes? }`):_ a row of tall trees of its
      own on that side (not the theme's scenery) shades the nearest lane or lanes, and the shadow
      is ice (the game's own, through `Track.slicks`) with 90% more of the steering gone; nothing
      is drawn but the shadow. Traffic moves into the sun before it. On Gimmick Road 3 (6250-6450,
      a barrier in the shade at 6410, the bigger cash in the shade), Mountain Pass (2370-2450, the
      braking for the hairpin) and Fjord (1340-1470, the shaded lane the way past the barriers).
      Not on Christmas: it is a night level, with no sun to be out of. Clocks not re-timed.
      Verified by `.gimmicks3-check.mjs shade` (the sunny lane never ice, out of the shade early
      unhurt, a move 25 m before the barrier hits on the ice and clears with the ice taken away,
      slowly it clears, a van moves into the sun, both real levels) and in stills (Gimmick Road 3,
      Mountain Pass, Fjord). Not verified: played by hand; the card on screen. Weak point: the
      game's ice costs nothing in a straight line, so a shade needs a bend, a hazard or a braking
      point in it to be a gamble at all.
- [x] H11. **Truck spray**: in rain every lorry drags a cloud of spray: nothing can be seen
      behind one. _Gamble:_ hang back and see, or overtake blind. _Builds on:_ rain, fog.
      _Built (`gambles.js`, field `spray: { from, to }`, a wet stretch, not the whole level's
      rain):_ every moving vehicle 2.2 m tall or more drags a cloud up to 45 m long over its lane
      and most of the next each side. In it a veil comes over the picture (`Gambles.veil`, a sheet
      over the canvas with a hole round the car), up to 92% at the lorry's tail. Nothing is done to
      the car. On Gimmick Road 3 (2520-2880, with a tractor at 2640 to throw one up every run),
      Mumbai (1380-1950, over its potholes and water mains) and Hurricane (3110-3490). Clocks not
      re-timed. Verified by `.gimmicks3-check.mjs spray` (76% gone 8 m behind a lorry, clear 10 m
      beyond the cloud, less half way back, gone in the next lane and clear in the one beyond, a
      car throws none, none on the dry road, clear alongside, the car untouched, both real levels)
      and in stills (in the cloud behind the tractor and beside it, the card). Not verified:
      played by hand; a lorry's full cloud on screen (the tractor's is short: it is slow); Mumbai
      and Hurricane with a lorry in view. The cloud is a plain translucent box.
- [x] H12. **Low sun**: one stretch runs straight into the sun and the screen washes out,
      except in the shadow of a lorry, a bridge or a row of trees. _Gamble:_ tuck in behind
      something slow to see, or run in the glare. _Builds on:_ fog, tunnels' light change.
      _Built (`gambles.js`, field `lowSun: { from, to }`):_ in the open 88% of the picture washes
      out (the same veil as the spray's, in the sun's colour); in shadow it is clear: up to 9 m
      behind a vehicle for each metre of its height (2.2 m or taller, in the car's own line),
      under a bridge, in a tunnel, or under a shade's trees. A sun is drawn low ahead. On Gimmick
      Road 3 (6470-6690, a barrier at 6640 behind the cash), Grand Pacific (7020-7560) and Passage
      du Gois (1420-1980). Clocks not re-timed. Verified by `.gimmicks3-check.mjs sun` (88% gone in
      the open, clear 10 m behind a lorry, glare again beyond its shadow and in the next lane, a
      car shades nothing, the car untouched, both real levels) and in stills (the glare; the sun
      and its board, seen on Outback Express before the stretch was moved off that level). Not verified: played by hand; a lorry's shadow on
      screen (no shadow is drawn on the road: the picture just clears); Grand Pacific on screen.
- [x] H13. **Dust trail**: on dirt every car throws a plume that drifts with the wind.
      Following in it is blind; driving a lane upwind of it is clear. _Gamble:_ the clear lane
      may be the oncoming one. _Builds on:_ fog, crosswind (G16), the safari.
      _Built (`gambles.js`, field `dust: { from, to, wind }`):_ a dry dirt stretch where every
      moving vehicle, either way, throws a plume up to 60 m long that the wind carries 4.5 m to
      one side by its far end; in it up to 90% of the picture goes (the spray's veil, in dust's
      colour). A lane upwind is clear. On Gimmick Road 3 (920-1080, blown to the right), Safari
      (3020-3480, to the right: the clear side of a car in the left lane is the oncoming lane)
      and the Battlefield (1750-2000, to the left). Clocks not re-timed. Verified by
      `.gimmicks3-check.mjs dust` (78% gone 8 m behind a car, clear a lane upwind, 45% gone a lane
      downwind and 30 m back, clear beyond the plume, none on the tarmac, the car untouched, both
      real levels) and in stills (the dirt on Gimmick Road 3, plumes on Safari, the card). Not
      verified: played by hand; the Battlefield on screen. The plume is a plain translucent box
      laid along its drift.
- [ ] H14. **Rockfall gallery**: the road forks into a covered gallery, narrow with no
      shoulder and a queue in it, and the open road under the loose face. _Gamble:_ slow and
      safe, or fast under the rocks. _Builds on:_ rockfall, tunnels, the fork (G4).
- [ ] H15. **Thin ice shortcut**: the road goes round the lake; tyre tracks go straight across
      it. Light cars cross; heavy ones crack it, and a crack that catches the car is a cold
      swim. Amphibious cars do not care. _Gamble:_ the car's weight against the distance saved.
      _Builds on:_ ice, `mass` in `cars.js`, the water stages being built, theme T4.
- [x] H16. **Fresh tarmac**: a coned-off lane of new tar beside the roadworks queue. It is
      empty and it is sticky: the longer the car stays on it the slower it gets, and the tyres
      stay slow for a while after. _Gamble:_ short hops along it. _Builds on:_ stop / go
      roadworks, mud, narrows.
      _Built (`gambles.js`, field `tarmac: { from, to, lane }`):_ traffic keeps out of the tar lane
      and crawls past at 29 km/h. On the tar the tyres fill in 4 s and the top speed falls with
      them, by 90% when full (slower than the queue); they clean in 3 s, off it only. On Gimmick
      Road 3 (1750-2050, lane 5), Hong Kong (2620-2920) and Tokyo (860-1140), cash on the tar.
      Clocks not re-timed (measure them if the queue proves slow in play: it is new traffic
      slowing). Verified by `.gimmicks3-check.mjs tarmac` (the queue 42 s, short hops 14 s
      quicker, on it all the way 41 s slower than the queue and never stopped, the tyres' timing,
      a van moves out and crawls past, both real levels) and in stills (Gimmick Road 3, the card,
      Hong Kong). Not verified: played by hand; nothing on screen shows how full the tyres are
      (no HUD was added: the HUD is another branch's); Tokyo on screen; the tar is black on a
      night road in Hong Kong, read by its cones.
- [ ] H17. **Climbing lane**: a hill with a short extra lane for overtaking the lorries, and a
      sign counting down to where it ends. _Gamble:_ one more lorry before the lane runs out.
      _Builds on:_ narrows, convoys, hills.
      _Deferred (agent 19):_ a lane that exists over one stretch means raising the level's
      `lanes` and narrowing it everywhere else, which the level check refuses over an exit's
      ramps and which changes a real level's lane structure. The rule itself (slow lorries in the
      inner lane, boards counting down, the shoulder's own rules beyond the end) is small.
- [ ] H18. **Single track with passing places**: one lane for both ways, with a marked bay
      every so often. Meeting someone between bays, somebody goes onto the verge. _Gamble:_ duck
      into this bay or run for the next. _Builds on:_ narrows, quiet zones, the shoulder timer.
- [x] H19. **Speed cushions**: a suburban street of humps with gaps between them. Straddle a
      gap on exactly the right line and the car does not feel it; clip one at speed and it
      jumps and takes a knock. _Gamble:_ precision at speed against slowing. _Builds on:_
      potholes, the jump.
      _Built (`gambles.js`, field `cushions: { from, to, every? }`):_ a row every 45 m, a cushion in
      the middle of each lane and a gap on each lane line. Within 0.45 m of a lane line (less for a
      wide car) the car goes between two at any speed; over one at 30 km/h or less it is a bump;
      faster it is thrown up (no steering until down) and knocked, 3 health and more the faster.
      Traffic takes them slowly. On Gimmick Road 3 (3520-3700), Suburbs (1460-1600), The Hood
      (1460-1595) and Christmas (1480-1615), cash between the rows. Clocks not re-timed. Verified
      by `.gimmicks3-check.mjs cushions` (the lane line at 108 km/h untouched, the middle of the
      lane at that speed thrown at all five rows and 42 health, braking for each row unhurt and
      11 s slower, 0.7 m off the line is not the gap, a wide car has less room, the three real
      levels) and in stills (the rows, the card, Suburbs). Not verified: played by hand; how it
      is among the slowed traffic; The Hood and Christmas on screen.
- [ ] H20. **Blast window**: the quarry's siren goes and the road under the face is about to
      be showered; the haul road round the back is longer and rough. _Gamble:_ sprint under
      before it goes, or take the haul road. _Builds on:_ quarry blasts, side roads.

The orchestrator's pick of these: H1 crest jumps and H2 the ramp (the jump is already in the
engine and is the most fun thing the drawbridge does), H4 low bridge and H5 ford (they make the
choice of car matter on the road, which little does today), H8 washboard (it rewards going
faster, which nothing else does).

### Third batch (10-Oct): other characters on the road

Not obstacles: road users with something of their own going on, that the player can use, help,
hinder or keep clear of. Each is a random or timed event, as ambulances, funeral processions and
convoys already are (a level's `every: { min, max }`), so any level can have them.

- [x] P1. **Police pursuit** (the owner's idea), built in its simple form: a traffic event, as an ambulance is.
      Now and then (`pursuits: { every: { min, max } }`) a getaway car comes up from behind flat out, weaving
      through the traffic, and after it an interceptor that is **a model of its own, seen only in this event**,
      its siren heard before it is seen; traffic pulls aside as for an ambulance, and the two drive on through
      and away. Nothing in it for the player and nothing against: hitting either is a collision like any other.
      - *Built (10-Oct, `delivery-pursuit`):* `pursuit.js`, `render/pursuitModels.js`, `CONFIG.pursuit`, a Gimmicks
        card, a `levelSchema.js` entry; on Big Business, Night Drive, Speed Trap Alley, Ring Road, Tokyo and Gimmick
        Road 2; never on a race or the Battlefield. *Verified:* `node scripts/.pursuit-check.mjs`; stills of the chase
        going by. *Not verified:* never played by hand, the siren never heard.
      - *Taken out at the owner's word (10-Oct):* the first build's three endings (caught, crashed, away), the Good
        and Evil gambles with their rewards, bag of cash and bust, and the helicopter.
- [-] P2. **Bank robber wants a lift**: dropped at the owner's word (10-Oct). Built once on `delivery-pursuit`
      and reverted: the pursuit is a simple traffic event, and nobody on the road wants a lift from it.
- [ ] P3. **Street racers**: two tuned cars line up beside the player at speed, flash their
      lights, and go: a race through the traffic to a marked point a kilometre on. *Gamble:*
      take it up (cash for winning, and the police take an interest in all three) or let them
      go. They race each other whether or not the player joins. *Builds on:* the boy racer,
      rivals.
- [ ] P4. **Cash van**: an armoured van with a back door not properly shut, shedding banknotes
      into its lane (cash pickups) and a guard car beside it that leans on anything that gets
      close. *Gamble:* sit in its wake collecting, slowly, with the guard car to deal with, or
      get on with the delivery. *Builds on:* cash pickups, falling cargo, convoys.
- [ ] P5. **Snowplough and gritter**: on snow and ice levels a plough works along one lane. The
      lane behind it is clear and gritted: full grip. The lane beside it gets the snow it
      throws: blind and slippery. *Gamble:* follow it in comfort at its speed, or go through the
      plume to get past. *Builds on:* ice, snow, fog.
- [ ] P6. **Leaking tanker**: a tanker dribbling its load (oil, milk, molasses) leaves a slick
      trail down its lane for a long way behind it, and the trail tells the player it is ahead
      before it is seen. *Gamble:* the trail's lane is the empty one. *Builds on:* burst water
      mains' slicks, falling cargo.
- [ ] P7. **Mobile mechanic**: a breakdown truck with its crane out. Hold station close behind
      it for a few seconds and its mechanic leans out and mends the car on the move. *Gamble:*
      seconds spent at its speed, nose to its tail, against health. *Builds on:* the wrench
      pickup, the wide load's escort distance.
- [ ] P8. **Stowaway on a transporter**: a car transporter with an empty top deck and its ramp
      down. Drive up onto it and ride: past a speed camera, a roadblock or a police stretch
      unseen, at the lorry's speed. Drive off the front when ready. *Gamble:* slow and hidden
      against fast and seen. *Builds on:* the ramp (H2), police sight, cameras, roadblocks.
- [ ] P9. **The sleepy lorry**: at night one lorry is drifting across the lanes and back on a
      slow rhythm, its driver nodding. The horn wakes him and he holds his lane for a while.
      *Gamble:* time the pass on the drift, or spend a moment on the horn first. *Builds on:* the
      player's horn (which does little today), the caravan's sway, the night themes.
- [ ] P10. **Unmarked police car**: one ordinary-looking car in the traffic is police, with a
      tell (twin aerials, plain steel wheels, a driver in a cap). Passing it over the limit, or
      doing anything Evil in its sight, starts a chase. *Gamble:* the player who spots the tell
      slows for that one car and no other. *Builds on:* police, cameras' limit, the radar
      detector (which could ping it).
- [ ] P11. **Motorbike couriers**: bikes filtering between the lanes from behind, faster than
      the traffic. Changing lane across one knocks it off (standing lost, a knock). They are
      also the only thing moving in a jam, and they show where the gaps are. *Gamble:* fewer
      lane changes, or look first. *Builds on:* the rickshaw's agility, pelotons.
- [ ] P12. **Wedding convoy**: a line of cars in ribbons, horns going, throwing confetti that
      hangs in the air and hides the road just behind them. Cutting through the convoy costs
      standing; a care package thrown to the lead car earns a good deal of it. *Gamble:* the
      long way round a slow, wide convoy or straight through its confetti. *Builds on:* funeral
      processions, convoys, care packages.
- [ ] P13. **Combine harvester**: on a farm road at harvest a combine fills the road and half
      the shoulders, throwing chaff out of the back. Its driver pulls onto the field at each
      gateway to let the queue by, if there is a queue: with no one behind the player, he does
      not. *Gamble:* through the stubble field beside it (rough, slow, unpoliced) or wait for a
      gateway. *Builds on:* tractors, wide load, mud.

The orchestrator's view (before P1 was cut down to a simple traffic event and P2 dropped, at the
owner's word): P1 was the best of these by some way. P7 and P8
are the freshest: other road users as something to use, not to avoid. P9 gives the horn a job.

## Car ideas lot: 30 models (assigned, agent 13)

Asked for by the owner on 10-Oct: "a list of 30 generic name/car models, and a real life vehicle to
base it off. Then have an agent make them. Add a tab in the garage for the parking lot of car
ideas." The names are generic on purpose (no maker's or model's name); none repeats a car the game
already has. They are ideas on show, not cars for sale: kept out of the garage's own list, so
saved progress and the balance of the tiers are untouched.

| # | Id | Name in the game | Based on | What makes it recognisable |
|---|---|---|---|---|
| 1 | `bubble` | Bubble Car | BMW Isetta | Egg shape, the whole front is the door, narrow rear track |
| 2 | `threewheeler` | Three-Wheeler | Reliant Robin | One front wheel, wedge nose, tall cabin |
| 3 | `tinsnail` | Tin Snail | Citroën 2CV | Arched roofline, roll-back canvas roof, separate round headlamps, skinny wheels |
| 4 | `bug` | People's Bug | Volkswagen Beetle (Type 1) | Dome roof, separate rounded wings, sloping tail with engine vents |
| 5 | `twostroke` | Two-Stroke Saloon | Trabant 601 | Small boxy two-door, little tail fins, pale pastel paint |
| 6 | `brickestate` | Brick Estate | Volvo 240 estate | Square everything, long flat roof, big bumpers |
| 7 | `woody` | Woody Wagon | 1949 Ford "Woody" wagon | Wood-panelled sides, split windscreen, surfboard on the roof |
| 8 | `stately` | Stately Saloon | Rolls-Royce Silver Shadow | Tall upright chrome grille with a mascot, long bonnet, two-tone paint |
| 9 | `limo` | Stretch Limo | Lincoln Town Car stretch limousine | Very long, many side windows, boomerang aerial |
| 10 | `milkfloat` | Milk Float | Smith's / Wales & Edwards electric milk float | Open sides stacked with crates, flat cab, tiny wheels, slow |
| 11 | `pony` | Pony Car | 1965 Ford Mustang fastback | Long bonnet, short deck, fastback roof, triple tail lamps |
| 12 | `splitwindow` | Split-Window Coupe | 1963 Chevrolet Corvette Sting Ray | Pointed nose, pop-up lamps, split rear window, side pipes |
| 13 | `snake` | Snake Roadster | AC Cobra 427 | Open two-seater, fat rear arches, oval mouth, roll hoop, twin stripes |
| 14 | `rearengine` | Rear-Engine Coupe | Porsche 911 (classic) | Round lamps on raised wings, sloping teardrop tail, whale-tail spoiler |
| 15 | `wedge` | Wedge Supercar | Lamborghini Countach | Flat wedge, scissor doors, huge rear wing, wide rear tyres |
| 16 | `gullwing` | Stainless Gullwing | DeLorean DMC-12 | Bare brushed-metal body, gullwing doors, louvred rear window |
| 17 | `centreseat` | Centre-Seat Hypercar | McLaren F1 | Low cab-forward bubble, central driving seat, roof air scoop |
| 18 | `pandacoupe` | Panda Coupe | Toyota Sprinter Trueno AE86 | Two-tone white over black, pop-up lamps, boxy hatch |
| 19 | `midnight` | Midnight Coupe | Nissan Skyline GT-R (R34) | Square shoulders, four round tail lamps, tall rear wing |
| 20 | `rallywedge` | Rally Wedge | Lancia Stratos | Very short, wraparound visor windscreen, roof spoiler, bank of spot lamps |
| 21 | `safari` | Safari Wagon | Land Rover Defender 110 | Flat aluminium panels, roof rack and ladder, spare wheel on the bonnet, snorkel |
| 22 | `widetruck` | Wide Truck | AM General Hummer H1 | Extremely wide and low for a truck, slot grille, flat windscreen |
| 23 | `polytruck` | Polygon Truck | Tesla Cybertruck | One peaked triangle of flat steel, light bar front and back |
| 24 | `monster` | Monster Truck | Bigfoot (Ford F-250) | Pickup body on enormous tyres, visible suspension, flags |
| 25 | `corrugated` | Corrugated Van | Citroën H Van | Ribbed sides, snout of a bonnet, tall square body |
| 26 | `foodtruck` | Food Truck | Grumman Olson step van | Serving hatch with an awning, menu board, roof vent |
| 27 | `motorhome` | Motorhome | Winnebago Brave (1970s) | Slab-sided box with a coloured stripe, big windscreen, roof air-conditioner |
| 28 | `schoolbus` | School Bus | Blue Bird conventional school bus | Yellow, bonnet out front, black stripes, stop sign arm, roof lamps |
| 29 | `doubledecker` | Double Decker | AEC Routemaster | Two decks, open rear platform, half-cab beside the engine |
| 30 | `fireengine` | Fire Engine | American LaFrance pumper | Red, ladder on top, hose reels and pump panel, light bar |

- [x] The 30 models, in a state-free file of their own: `render/ideaModels.js` (`IDEA_MODELS`), in the
      conventions of `render/models.js` (it has helpers of its own: those of `models.js` are not exported).
      Eleven move: the three-wheeler rocks, the tin snail sways, the two-stroke smokes, the milk float's crates
      rattle, the split-window's and the panda's lamps pop up, the wedge's and the gullwing's doors open, the
      monster truck rocks with its flags flying, the food truck's vent spins, the school bus's stop arm swings
      out and its lamps flash, the fire engine's lights flash. Checked: `node --check`, `.bundle-check.mjs`.
- [x] A table of the 30 (name, what it is based on, size, colours for Good and Evil, a line about it):
      `ideas.js` (`IDEA_CARS`), no rendering imports. Sizes are the real vehicle's (the monster truck is 3.1 m
      wide, the school bus 10.8 m long). None is in `CARS` or `CONFIG.vehicles`; no check script counts them.
- [x] A "Car ideas" tab in the garage: a second lot where they are parked, to look at, with the Livery button
      working: `render/ideaslot.js`, with small edits in `render/garage.js`, `main.js` (one line),
      `delivery/index.html` (the "Garage" title is now two tab buttons) and `menus.css`. Three rows of ten
      bays (the ten longest in a deeper back row), each idea's name painted in front of its bay, a hoarding
      and CAR IDEAS signs behind; hover or tap for name, "Based on", size and note; Sort, Show, the bank and
      the comparison card are hidden on this tab; the button reads "An idea, not a car yet" and is disabled.
      The garage always opens on its own lot. `?garage&tab=ideas&look=<id>` / `&hover=<id>`. Seen in stills
      (desktop, Evil livery, a 520 px wide phone shape, and the garage's own lot unchanged). NOT verified:
      nothing clicked, dragged or tapped by hand: the tab buttons, scrolling and the pointer's hover are
      untested beyond their address-bar equivalents.
- [x] A picture of each, looked at and corrected until it reads as what it is based on: every model looked
      at from three sides (`&studio=<ids>&views=3`), then again singly; corrected after looking: the bubble
      car (rebuilt as an egg with a flat door), the bug (wings, lamps, windscreen), the two-stroke (rear
      pillars), the pony car (nose), the split-window (nose and tail drawn to blades), the motorhome (its W
      was an M). Weakest: the Split-Window Coupe (reads as a sixties sports coupe, not unmistakably a Sting
      Ray), the Midnight Coupe (a boxy coupe with a wing until its tail lamps are seen) and the Two-Stroke
      Saloon (a generic little saloon). Evil liveries seen once each, not tuned.

## More cargo: 40 ideas (draft, not assigned)

Drafted by the orchestrator on 10-Oct at the owner's request. None is built. The game has ten now
(Good: tower of pizzas, wedding cake, goldfish, gift-wrapped cactus, grandfather clock; Evil:
ticking parcel, porcupine, crate of bees, cursed doll, specimen jar). The same pattern is kept:
a Good item has some charm and one small idle animation; an Evil item has three states that read
at thumbnail size, calm at the start, agitated at half the clock, furious for the last fifth.
"Fits" is a level or theme it would suit.

### Good: 20 ordinary things, none of them a plain box

| # | Item | Idle animation | Fits |
|---|---|---|---|
| C1 | Tray of coffees | Four cups in a holder; steam curls, one lid rattles | City, Rush hour |
| C2 | Bunch of balloons | Tied to a weight, bobbing and tugging at their strings | Suburbs, Christmas |
| C3 | Birthday present with a huge bow | The bow's tails flutter; something inside makes it hop now and then | Suburbs |
| C4 | Bouquet in a vase | Flowers nod; a petal falls and a new one grows back | Farm, Market Town |
| C5 | Stack of pancakes | Wobbles; syrup drips slowly down the side | Back Roads |
| C6 | Ice-cream sundae | The cherry slides, stops, slides back up; melting drips | Beach, Hurricane |
| C7 | Sushi boat | The little wooden boat rocks; a piece slides and returns | Tokyo, Hong Kong |
| C8 | Tiered tea set | Cups chatter on their saucers; the pot's lid lifts with a puff | Canberra, Market Town |
| C9 | Record player | The record turns, the arm bobs, notes float off | The Hood, Night Drive |
| C10 | Lava lamp | Blobs rise and sink | Night levels |
| C11 | Snow globe | A tiny village inside; the snow swirls and settles | Stelvio, Christmas, Mountain Pass |
| C12 | Potted bonsai | Leaves shiver; a tiny bird hops along a branch | Tokyo, Singapore |
| C13 | Puppy in a basket | Ears flop, tail wags, head tilts | Suburbs, Farm |
| C14 | Canary in a cage | Hops between perches; the cage swings | Oh Mine! (the mine), Hong Kong |
| C15 | Bowl of ramen | Steam rises; the chopsticks lift a noodle and drop it | Tokyo, Night levels |
| C16 | Globe on a stand | Spins slowly, tilts, spins back | Airport, Canberra |
| C17 | Trophy | Gleams; a star of light travels round the rim | Big Business, the circuits' menus |
| C18 | Surfboard with a ribbon | Leans and rocks like a see-saw on its fin | Grand Pacific, Beach |
| C19 | Tool box, open | Spanners rattle in their trays; the lid creaks | Construction, Quarry Run |
| C20 | Telescope on a tripod | Swings round to look at things; the lens glints | Asteroid Run, Mountain Pass |

**Built (Agent 15, branch `delivery-cargo-good`):** all twenty, in `render/cargoModelsGood2.js`, on the cargo page and in the default rotation (no level JSON edited).

- [x] C1 to C20 built: ids `coffee`, `balloons`, `present`, `bouquet`, `pancakes`, `sundae`, `sushi`, `teaset`, `record`, `lavalamp`, `snowglobe`, `bonsai`, `puppy`, `canary`, `ramen`, `globe`, `trophy`, `surfboard`, `toolbox`, `telescope`.
- Looked at: every one as a still on the cargo page (scratchpad `shots-cargo-good/sheet.png`, and `p1` to `p4`, `q1`); pancakes, record player and puppy in the HUD corner; record player and telescope at the kerb. Stills only: none has been seen moving.
- Departures from the table: C18 the surfboard stands on its tail in a heap of sand and rocks from side to side (lying on its fin it was a sliver at thumbnail size); C14 the cage rocks on its base, it does not hang.
- `CARGO.good` was reordered so every item turns up under the default rotation (places 6 and 15 fall on levels that name their own, so goldfish and wedding cake, which levels name, sit there).

### Evil: 20 things nobody should be driving about with

| # | Item | Calm | Agitated (half the clock left) | Furious (a fifth left) | Fits |
|---|---|---|---|---|---|
| C21 | Egg in a nest | A large speckled egg, rocking a little | Cracked, an eye at the crack | Hatched: a furious little dragon (or goose) flapping in the shell | Farm, Safari |
| C22 | Pressure cooker | Hissing gently | Lid rattling, valve whistling, steam jets | Red hot, lid bouncing, about to go | City, Mumbai |
| C23 | Venus flytrap | Jaws shut, swaying | Jaws open, tracking things, drooling | Snapping in every direction, straining out of its pot | Mystery Meadows, Safari |
| C24 | Barrel of toxic waste | Sealed, a soft green glow | Lid bulging, ooze down the side | Lid off, bubbling over, a tentacle of slime | Construction, Oh Mine! |
| C25 | Haunted mirror | An ordinary mirror | A face in it that is not yours | Hands coming out of the glass | Night Drive, All Heck |
| C26 | Skunk in a carrier | Asleep | Awake, tail up through the bars | Stamping, a green cloud | Back Roads, Farm |
| C27 | Cannonball with a fuse | A black ball, fuse unlit | Fuse lit, short sparks | Fuse nearly gone, rolling about by itself | Battlefield, Passage du Gois |
| C28 | Mimic chest | A treasure chest | Lid lifts on a row of teeth, a tongue | Running in circles on stubby legs, snapping | All Heck, Mystery Meadows |
| C29 | Beehive piñata of fireworks | A bundle of rockets, tied | One fizzing | Rockets going off in turn, the bundle spinning | Christmas, Hong Kong |
| C30 | Baby alien in an incubator | Curled up, a slow pulse of light | Awake, hands on the glass, the light quickening | Glass cracked, antennae out, the whole thing levitating | Asteroid Run, Airport |
| C31 | Possessed teddy bear | Sitting, button eyes | Head turned all the way round | Standing, eyes red, holding its own stuffing | Suburbs, Night Drive |
| C32 | Cage of bats | Hanging asleep | A few awake, eyes glowing | All of them battering the bars | Night levels, tunnels |
| C33 | Ice block with something in it | A frosty block, a shape inside | Dripping, the shape has moved | Shattered open: a thawed, cross yeti cub (or caveman's arm) | Stelvio, Mountain Pass |
| C34 | Sack of snakes | A tied sack, shifting | Heads poking through holes | The neck come undone, snakes spilling | Safari, Mumbai |
| C35 | Bottle with a genie | A corked bottle, smoke inside | Cork wobbling, a face in the smoke | Cork out, an arm and a scowl coming out | Mumbai, Hong Kong |
| C36 | Unstable reactor core | A canister, steady blue rings | Rings spinning fast, turning yellow, alarms | White hot, arcs of lightning, humming upward | Big Business, Construction |
| C37 | Angry goose in a crate | A crate with a beak hole, quiet | Head out, hissing | Out of the crate entirely, wings wide | Farm, Canberra |
| C38 | Jack-in-the-box | Closed, the handle turning by itself | Lid twitching, the tune speeding up | Sprung: a leering clown lunging on its spring | Christmas, Suburbs |
| C39 | Thundercloud in a jar | A small grey cloud | Dark, rumbling, flickers of light | Lightning cracking the glass, rain inside | Hurricane, Mumbai |
| C40 | Piranha tank | Fish idling | Circling fast, the water churning | Leaping out, snapping, water everywhere | Passage du Gois, the amphibious levels |

- [x] **C21 to C40 built** (agent 16, branch `delivery-cargo-evil`): all twenty, in
  `render/cargoModelsEvil2.js`, listed in `CARGO.evil` (ids egg, cooker, flytrap, barrel, mirror,
  skunk, cannonball, mimic, fireworks, alien, teddy, bats, ice, snakes, genie, reactor, goose, jack,
  cloud, piranhas). The egg hatches a dragon; the ice holds a yeti cub. No level names one yet: the
  rotation by menu position hands them out. Looked at: every one in all three states as stills of the
  cargo page (two moments each), and the mirror, genie and thundercloud in the HUD corner. Nothing
  was seen moving.

### Notes for whoever builds them

- **Pairs that suit a level** (one Good, one Evil, as each level carries): snow globe and ice block
  (Stelvio); canary and toxic barrel (Oh Mine!); sushi boat and fireworks (Hong Kong); telescope
  and baby alien (Asteroid Run); puppy and skunk (Farm); ramen and cage of bats (Night Drive);
  surfboard and piranha tank (the amphibious levels); tool box and reactor core (Construction).
- **Cheapest to build first** (shapes the game mostly has): pressure cooker, cannonball, toxic
  barrel, jack-in-the-box, lava lamp, snow globe, trophy, tray of coffees.
- **Hardest to make read small:** haunted mirror (a flat thing seen at an angle), genie (smoke),
  thundercloud (soft shapes): each needs a strong colour change between states to carry it.
- **Close to ones the game has** (keep apart if both are used): possessed teddy bear and the
  cursed doll; cage of bats and the crate of bees; pressure cooker and the ticking parcel.
- With 50 items, a level's cargo could be picked from two or three that suit it instead of one,
  the same every run by level and side, so replays of a level are not always the same parcel.

## In-game UI improvements (owner, 10-Oct; queued as "Next 0")

The owner's five, in their words, each with what it comes to. None is started.

- [ ] U1. "The level meter takes up too much of the screen, rework it to different style in the
      same corner as the other meters." The progress bar across the top centre goes; the distance
      through the level becomes a compact meter in the top-left block with the clock, tip, busts
      and social standing, in a style of its own (not another long bar). Pause and Exit level,
      which sit under it now, need a new place that is out of the way.
- [ ] U2. "Have a odometer for the danger/shoulder meter instead, have it sit at 0 danger when not
      active." The shoulder's danger timer becomes a dial (a small gauge with a needle, as a car's
      instrument is): always there, resting at 0 while the car is on the road, climbing while it
      is on the shoulder, falling back when it leaves. No element that appears and disappears.
- [ ] U3. "The messages are right in the way of the horizon in both desktop and mobile." Event and
      status messages move off the horizon line, where the road ahead is read: to a strip clear
      of it (low on the screen above the controls, or the top edge), on desktop and on a phone,
      checked against the on-screen buttons, the cargo window and the tank corner.
- [ ] U4. "Some critical messages should stay indefinitely like punctures. I'll let you have the
      judgement call but extract all message times to a config." Every message's time on screen
      comes out of the code into one table in `config.js` (by kind of message). Messages about a
      condition that is still true stay until it ends: a puncture, no brakes, a stalled engine, a
      wanted level, a mystery effect running, being on fire, the wrong way down a road. Which
      ones are "critical" is the builder's call, written down in the table for the owner to edit.
- [ ] U5. "The mystery effect should be written as the pick up status, so the player can remember
      what it was." While a mystery effect runs, the pickup's status line names the effect
      (Earthquake, Giant, Traffic freeze...) with its time left, as a turbo or ghost shows its
      own name, not just "Mystery".

Files this will touch: `render/hud.js`, `delivery/index.html`, `style.css`, `render/touch.js`
(the phone layout), `messages.js` and `messages.json` (the times), `config.js`, `player.js` or
`mysteries.js` (the effect's name for the status). To be checked in screenshots at 1100x650 and
520x900, in a level with every meter showing at once.

## Level progression rework (owner's spec, 10-Oct; queued, not started)

### The spec, in the owner's words

> Divide levels into groups of 5.
> Each star tier gets 5 levels.
> 1/2/3/4/5 then blue 1/blue 2/ etc
> Each level will have a ribbon for beating it. The left half of the ribbon is Good and the Right half is evil.
> When playing a level without that half of the ribbon earned, the player is only allowed to use cars from EXACTLY that tier. No tiers lower or higher, no tiers from another coloured stars. When beating the level on evil this way, the player can replay it in any (evil) car.
> The progression will be as follows:
> When a tier is unlocked, the first two levels are unlocked
> Level 3 requires 1 ribbon (any two halves)
> Level 4 requires 2 ribbons (any 4 halves)
> Level 5 requires level 4 to be beaten (any half)
> Beating Level 5 unlocks the next tier
> For levels with no good/evil option, it awards a full ribbon

### As a checklist

- [ ] R1. Levels in tiers of five: gold 1, 2, 3, 4, 5, then blue 1, 2, 3, 4, 5. Ten tiers, fifty places. The menu's groups become the tiers, each headed by its stars.
- [ ] R2. A ribbon on every level: the left half earned by beating it as Good, the right half as Evil. A level with no choice of side (the Battlefield, an "always Good" level) gives the whole ribbon at once. Shown on the level's card, and counted per tier.
- [ ] R3. The car rule: on a level whose medal for the side being played is not yet earned, only a car of exactly that tier may be driven: same number of stars, same colour of stars. Once that half is earned, the level can be replayed on that side in any car.
- [ ] R4. Unlocking inside a tier: levels 1 and 2 open with the tier; level 3 needs two medals in the tier; level 4 needs four; level 5 needs level 4 beaten on either side.
- [ ] R5. Beating level 5 on either side opens the next tier (its first two levels).
- [ ] R6. Saved progress carried over: a best time already saved on a side becomes that half of the ribbon; tiers and levels open accordingly, so nobody loses what they had.
- [ ] R7. The menu and garage say why: a locked level says what it needs ("2 more medals in this tier"); a level that restricts the car says which tier, and the garage marks the cars that qualify.
- [ ] R8. Checks: the unlock rules, the car rule on both sides, old saves, and that no player can be left with no way forward.

### What the spec does not settle (to be answered before it is built)

**Answered by the owner (10-Oct): "Leave the Special and Amphibious levels outside of the progression system."** So the tiers are made of the 31 main levels only; specials and amphibious levels keep their own groups and have no ribbon rule or car rule. That settles most of 1 and 2 below. Still open: the races (assumed outside too, on their own tab); 31 levels make six tiers of five and one over, against ten tiers (gold 1 to 5, blue 1 to 5): which levels go in which tier, and what fills the blue tiers; 3 (owning a car of the tier); 4 (Blue 4 has no cars).

1. **Which level goes in which place.** The game has 31 main levels, 9 specials, 5 amphibious
   levels and 6 races: 51 against 50 places. Do the races keep their own tab outside the tiers
   (leaving 45 for 50 places, so five short)? Where do the specials and the amphibious levels go?
2. **Levels that bring their own vehicle** (Asteroid Run's UFO, Oh Mine!'s jetboat, the
   Battlefield's 8x8, the races' F1 / GT / LMP) and the **amphibious-only levels** cannot obey
   "exactly that tier's cars". Are they outside the tiers, or exempt from the car rule?
3. **Having a car of the tier.** The player must own one to play at all. Gold 1 has the free
   Commuter; every other tier's cheapest car costs money (gold 2: $130, blue 1: $270, blue 5:
   $1,200). If the tips from a tier do not cover the next tier's cheapest car, the player is stuck.
   Is the cheapest car of a new tier lent or given, or must the tips be made to cover it?
4. **Blue 4 looks empty.** Reading `cars.js` finds Blue Star cars at 1, 2, 3 and 5 stars and none
   at 4 (to be confirmed by the builder). A tier with no cars cannot be played under the car rule.
5. **Cars with no tier, or their own:** the Tank, the City Bus, the 6-star earned cars, the
   amphibious cars (sea-green stars, 1 to 5), Super cars lent by a mystery. Assumed: none of them
   may start an unribboned level; a mystery may still lend one mid-run.
6. **"Beating" a level:** assumed to mean delivered on time, as "Deliver it on time to open the
   next" means today; a late delivery earns nothing.
7. **The Blue Star season** opens today after level 20. Under this spec it opens by beating gold
   5's fifth level: assumed to replace the old rule.
8. **Medals** (bronze, silver, gold by time to spare, added today) are kept beside the ribbons:
   assumed.
9. **The medals that count** towards levels 3 and 4: assumed to be those earned in that
   tier only, not across the game.

## Menu UI (owner, 10-Oct; agent 18, branch `delivery-menu`)

The owner's words: "Rework the UI to be more game like than a webpage. Have a place for a level
description, unique for both Good and Evil. The gimmicks list should be moved to a button where
clicking it gives you a card showing the 3d models (gimmicks page) of all the gimmicks in the level,
pick ups and traffic."

- [ ] M1. The start screen reworked to feel like a game's menu, not a web page: a composed screen
      (a level-select stage with the picked level shown large, the car and side as part of the
      scene, proper game buttons with states and sound, movement between screens), in place of a
      scrolling page of cards and rows of grey buttons. Works with mouse, keyboard and touch, on
      desktop and on a phone. It stays strictly a menu, with no page reloads.
- [ ] M2. A level description on the menu, written twice for every level: one for Good, one for
      Evil, each in that side's voice, shown for the side picked.
- [ ] M3. The gimmick chips leave the level card; a button opens a card for the level showing the
      3D models (the ones the Gimmicks page draws) of everything in it: its gimmicks, its
      pickups and its traffic, each named, with a line on what it does.
- To keep in mind while building: the level progression rework (the section above) will put
  levels in tiers of five with a two-halved ribbon on each and a car rule per tier; the new menu
  should have a place for those, though the rules themselves are a separate job.

### Added by the owner after the break (10-Oct, evening; not started)

- [ ] M4. "The level screenshots are way too blurry on a desktop. Let's have two versions." Measured: every
      picture in `levelshots/` is 600x267 (about 15 KB) and the stage stretches it to cover the whole level
      stage (`menu2.css`, `.menu-stage .shot`, `background: center / cover`), so on a desktop it is drawn at
      two or three times its size. To do: two pictures a level, the small one as now (the strip's thumbnails,
      the album, a phone's stage) and a large one for the desktop stage, picked by the stage's size; both
      taken by `scripts/shots.mjs --levels` in one go. 61 level pictures to retake, one screenshot run at a
      time. Waits on the screenshot script's fix.
- [ ] M5. "On the car select, let's use the live 3D model rather than a rendered screenshot." The car card on
      the start screen shows `carshots/<id>-<side>.jpg` (`CAR_SHOTS` in `render/menustage.js`, 158 pictures,
      600x267 each). To do: the car's own model, turning, in the livery of the side picked, drawn live. To
      settle while building: a phone may refuse another WebGL context (the road card's failure, bug 2(c) in
      the scratchpad), so draw it with a renderer the menu already has, or keep the picture as the fallback
      when no context can be had; whether `carshots/` is still needed afterwards (the Super cars' pictures
      there are shown nowhere yet).

- [x] Milestones (owner, 10-Oct evening): "Don't show milestone as events in-game." `9465037` on `main`: a
      milestone reached while a level is being driven says and sounds nothing; it is still counted, saved and
      on the wall. The milestones, bundle, levels and HUD checks pass. Left for the owner: the `mystery` sound
      still plays when a milestone is crossed at the moment a run ends (levels delivered, km driven); its
      text was never visible there. Not seen in a browser; the missing sound mid-run rests on the code.
- [x] **`delivery-mobile` merged into `main` as `74f3bfa`, not pushed.** Bundle, HUD, road-card (60 levels),
      levels and earned checks pass. NOTHING in it has been seen on a screen: every size is arithmetic from
      the CSS. Stills wanted at 360x620, 390x700, 430x760 and 740x360 once screenshots work.
  - [x] Garage on a phone (owner: "The stat comparison card on mobile is way way too large and disruptive").
        `9af18d1`: at phone widths one strip 55 px tall (a line naming the two cars, seven cells of a word,
        a bar and the difference) where the table was 200 to 230 px; lets taps through; the perk row left to
        the stats line. Desktop's table untouched. Still: `index.html?garage&look=sport`.
  - [x] Level card squished on a phone. `9ad59d0` (`menu2.css`): the side panel one 44 px row, START a 40 px
        bar, title, bank and Options on one line; the stage gets 323 px at 360x620 (was 65), 403 at 390x700
        (was 145), 463 at 430x760, 223 at 740x360; `100dvh`; a screen too short scrolls. Worst case at
        360x620 (two-line name, a needs line and a prize line) may overhang the top by about 20 px. The
        "What's on this road" button is back inside the stage; the one unexplained failed tap at 390x700
        was not looked into. Stills: `index.html?cursor=33` and `&road`.
  - [x] Wrong-way card's headlights on the tail. `c7c00c5`: only the Gimmicks card was wrong (lamps placed
        in the card's frame, 0.10 m behind the tail); now children of the car, 0.10 m ahead of its nose. The
        game's own wrong-way driver was right.
  - [~] M4 two sizes of level picture, the code side. `6eff165`: `levelshots/large/<id>.jpg`, fetched only
        for the level shown, used when the stage draws the picture more than 15% wider than 600 px (a dense
        phone qualifies too: owner to say), over the small one. NO large pictures exist yet. To take them:
        `shots.mjs --levels` to render once at 1920x854 and write that as `large/<id>.jpg` and a 600x267
        copy as `<id>.jpg`, both JPEG at about 80.
- [x] **Level 26 Quarry Run to the new standard: `delivery-rework-b` merged into `main` as `d96a95c`, not
      pushed.** Seen down its whole length in 22 stills (nothing needed fixing), kinds the same as before,
      36 cash in 14 rows (seven reach a shoulder), clock 215 / 165 unchanged, menu picture in both sizes
      from a chosen frame (the default one had a lamp post dead centre: the screenshot agent is giving it a
      `CINE` entry). All checks passed before the last merge of `main`. Pictures sent to the owner. For the
      owner: the finale's blast takes both lanes; the right shoulder and the merge side are the way round.
      Not seen: the side roads from on them, the level as Evil, anything moving. Next there: 27 Hong Kong
      (before-pictures taken).
- **The owner, late on 10-Oct: "Halve the number of agents please. Don't assign new tasks to the ones that
      finish now."** Ten were running. Five were told to finish only the piece in hand and stop (the
      obstacles tidy-up; the gap fills' stills; the fog's colour and After Hours' picture; the mains
      follow-up; the full checks and the built site looked at). Five carry on, each on one task: the nuclear
      fallout theme, level names and descriptions into their own JSON, Market Town (25), Ring Road (24),
      Spring Thaw. **Cancelled or parked until the owner says:** Stelvio (30), Tour de Coast (23), Night
      Shift, the rest of Hong Kong (27, WIP `1b3a207` on `delivery-rework-b`), the README and HANDOVER
      screenshot paragraphs, the five weak menu pictures. No new task goes to an agent that finishes.
- **The owner, later: "Usage is critical now. Spin down and write handovers for all agents except the ones
      closest to finishing."** Stopped with handovers in `SCRATCHPAD-10-Oct-dropped.md`: the nuclear fallout
      work (section A: the gimmick's logic and check done, `ae29ceb`; nothing drawn; theme and level not
      started) and Spring Thaw (section B: WIP, loads and probes, half seen). Ring Road finished and is fit
      but its merge into `main` conflicts in three files (section 0): NOT merged. Only the full check run
      and the built site's look is still going. `main` is at `7a90971`, ten merges ahead of what is live
      (`8fa45a6`), not pushed. One stray process: `node` PID 26760 (a hung bundle check; the agent's kill
      was refused): for the owner to end.
- [ ] **QUEUED for the next session: the owner's list of 10-Oct, about 9 pm ("Add to the list"). None started,
      none labelled to jump the queue. The owner's words are kept; a note follows only where one is needed.**
  - **Gimmicks: how they play**
    - [ ] Q1. "The washboard gimmick does very little. It's not an interesting obstacle."
    - [ ] Q2. "The truck spray gimmick looks ugly and does even less. What exactly was it meant to do?"
          (Answered in chat: H11: every tall vehicle on a wet stretch drags a cloud nothing can be seen
          through, so the choice is to hang back and see or overtake blind; it does nothing to the car and
          the cloud is a plain translucent box. To rework or drop: the owner's call.)
    - [ ] Q3. "Seaquake has scripted wreckage from the sky, but it is supposed to be indoor."
    - [ ] Q4. "There should be a difference between ice and water - ice only affects you while on it, water
          continues to affect for a set distance after". (Wet tyres after a burst main; mains water already
          has its own numbers in `CONFIG.waterMain`.)
    - [ ] Q5. "Supercharger should increase the car's top speed around bends proportionally".
    - [ ] Q6. "The tram on the Hong Kong level does nothing. It should work like Canberra's, incoming only,
          guranteed destruction except for vehicles that survive a head-on collision (Tank)".
    - [ ] Q7. "Drop bears should take into account player speed. Most 4 or 5 star cars outrun it".
    - [ ] Q8. "Kangaroos are too hard to see on the road. Make them larger and brighter."
    - [ ] Q9. "The blasting gimmick on the airport is mechanically a wreckage, but a Blast in Quarry Run. Move
          all blasts into the blasting gimmick."
    - [ ] Q10. "The puncture gimmick is not updated for new ways to get a puncture."
    - [ ] Q11. "Assaulting the police in pursuit should be a bust, but everything else they will let you go as
          they are busy,"
    - [ ] Q12. "The wrong way driver gimmick warns a player sometimes for a car that doesn't actually affect
          the player at all. This is a complex fix. A lane that becomes oncoming in a side road should not
          spawn a traffic vehicle such that the player will meet one before the oncoming lane starts. This
          wrong way driver gimmick should be used to send a random driver the wrong way like the Bullet
          train gimmick."
    - [ ] Q13. "A convoy and a Funeral Procession are too similar. Make it such that crashing a funeral
          procession triggers the Jerk mechanic for 10s."
    - [ ] Q14. "Crosswinds should be in thematic levels. It has no place in the movie set or a fevela. It also
          is not really relevant most of the time, it needs tuning."
    - [ ] Q15. "Low bridges are very cheap to ignore. It should deal massive damage, and be placed on both
          sides (not at the same level, so players can slalom around them). If a tall traffic car spawns in
          its path it should just go through with no penalty."
    - [ ] Q16. "The learner driver's L should be a flipped writing element, and it is far too slow. It should
          also wobble in its lane."
    - [ ] Q17. "\"Side Road Gimmicks\" is not really a gimmick on its own".
  - **Damage and balance**
    - [ ] Q18. "Speed plays too big of a role in damage dealt in a crash. There should be a cap because fast
          fragile cars are oneshotting low star cars in a rear-end."
    - [ ] Q19. "Rebalance all the obstacles that explode on contact. They should take health away roughly equal
          to how big they are. The construction equipment do not cause nearly enough damage."
  - **Levels**
    - [ ] Q20. "Some amphibious stages don't make sense as the water is just inbetween land. They should either
          be obviously a canal, a river or it should transition into the sea or a river."
    - [ ] Q21. "The level agents are very found of recent gimmicks. Burst water mains and potholes and tunnels
          appear almost every level. It should be thematic." (A rule for every level brief from now on, and
          an audit of the levels written or reworked on 10-Oct.)
    - [ ] Q22. "Show the cargo being delivered on the menu screen per level and the level cargo should be set
          in the same way as the level name and description." (Into `levelText.json` or a file like it,
          with the level's own file as the fallback.)
    - [ ] Q23. "When writing a level or taking a screenshot, note the coordinates where the screenshot was
          taken. It will help with re-taking the shots." (A rule for every brief; the menu pictures' places
          are already in the script's `CINE` table.)
  - **Signs, models and the reference pages**
    - [ ] Q24. "The newer signs do not reverse for flipped levels". (Lettered boards mirrored on `drive: left`
          levels; one was already seen on Hong Kong's FRESH TAR board.)
    - [ ] Q25. "The lanes closing model on the gimmick page is not accurate to what it actually looks like".
    - [ ] Q26. "The reversible lanes model in the gimmick page is showing a reversing car."
    - [ ] Q27. "The low bridge animation's bus crab walks away."
    - [ ] Q28. "All models in the gimmick page should be spinning".
    - [ ] Q29. "The tyres from explosions should gain some upwards velocity and bounce".
    - [ ] Q30. "The Stainless Gullwing's doors should only animate in the garage".
  - **Cars and how they look**
    - [ ] Q31. "The non-normal star cars (blue stars, amphibious etc) have very boring and dark Evil palettes.
          Darker in general, but not every car needs to be black."
    - [ ] Q32. "Think of how we can indicate in-game subtly whether a car is good or evil". (Ideas wanted
          first, for the owner to choose from; nothing to be built before that.)
  - **Menu and garage**
    - [ ] Q33. "Use the Plop Up sound for each click on the menu".
    - [ ] Q34. "Migrate buying the cars from a .alert() to a ingame menu."
    - [ ] Q35. "Change the sort and show toggles to a list rather than a cycle, and hide if the list returns 0
          cars."
    - [ ] Q36. "In the garage, Livery: Good should just be Good/Evil, and \"Use this car as Good\" should be
          \"Switch\" and \"Use\". Switch is current behaviour, Use sets the car and goes to the menu."
    - [ ] Q37. "The stat lines still block the cars in the mobile view." (After the comparison strip of
          `9af18d1`: the garage's stats text, now three lines on a phone with Delivery and Nerve pending.)
  - **Added later the same evening**
    - [ ] Q38. "The UFO should have a floating animation and be off the ground".
    - [ ] Q39. "The six-star cars with a in-game super variant should use the super variant's model." (Of the
          nine earned cars, the ones built on a garage model: Hell Rod on the Hot Rod, Courier Special on
          the Sleeper, Showdown Muscle on the Muscle; the other six are level vehicles: to be confirmed by
          the builder which of them has a Super livery and kit.)
    - [ ] Q40. First: "A car with no super variant should have a clamped 0% chance to get the super upgrade
          mystery effect". **Revised by the owner:** it should go: "We were gonna upgrade your car, but your
          car has no super variant!" So the effect CAN still be drawn by a car with no Super variant (the
          idea cars, the level vehicles, anything `superOf` returns nothing for); when it is, nothing is
          upgraded and that line is said, in those words. The fallback of today (such a car is made
          invincible) goes. The line lives in `messages.json` with the other mystery lines.
    - [ ] Q41. "A variant of the level file, all car names and strings should be compiled in one file. Then,
          all of then needs a short description for the \"What's on this road\" level card". (Read as: as
          `levelText.json` did for level names and descriptions, one words file for every car's name and
          the game's other strings (cars, traffic kinds, pickups, gimmicks, obstacles, cargo), with each
          thing's own table as the fallback; then every entry in it gets a short line for its tile on the
          road card. **The owner's rule for all such files (said of `levelText.json`, "and so will the other
          ones I suggested (like the vehicle one)"): the words file takes priority: where it has an entry
          the game uses it and overrides the text in the level's or the thing's own file.** `levelText.js`
          already does this field by field (checked in the code: `places()` asks the file first); the one
          exception is a level handed over by the level editor (`?edited`, `standsAlone`), whose own words
          come first, and `.descriptions-check.mjs` FAILS a level whose words differ between the two places,
          which under "the file overrides" is stricter than the rule needs: both for the owner to say. `messages.json` already holds the spoken lines. To confirm with the owner: one file
          for everything, or one a kind.)
    - [ ] Q42. "Rendering the volcano theme without a floor makes near objects look floating and the skybox
          erupting volcano overlap the mountains appear through fog banks". (Three faults on the volcano
          theme, Cinder Island and Eruption Day: no ground is drawn beside the road, so things near it look
          afloat; the erupting mountain on the skyline is drawn over the nearer mountains; and it shows
          through a fog bank. The last was already noted when fog was made to take its theme's colour
          (`ff21b9a`): far backdrops drawn with `fog: false`, the volcano and the ice road's aurora among
          them, show through a thick bank. The erupting look is `229dd8d`, `render/themes/volcano.js`.)
    - [ ] Q43. "UFO air strike effect takes too long to happen, maybe it should start ticking damage before the
          UFO leaves".
    - [ ] Q44. "Remove the slowdown for breaking the barrier on a level crossing. It makes it almost impossible
          to get hit by the bullet train. Increase it by one segment too". (Read as: breaking a crossing's
          boom no longer slows the car; and the bullet train gets one more carriage. To confirm with the
          owner if "it" means something else.)
    - [ ] Q45. **For the level progression rework, when it comes in (not before; add to its spec, R1 to R8 in the
          section "Level progression rework" near the end of this file).** The owner: "A player who clicks
          on an incomplete level of a new tier, and has no cars of that tier should select a null_car,
          silhouetted car and not be able to start the level. Clicking into a garage with a car restriction
          should automatically filter out the garage to just cars that can be selected. Keep the player's
          previous pick, so when they choose a different level the car is re-selected". So: (a) on a level
          whose ribbon half is not yet earned, with no car of that exact tier owned, the car card shows a
          silhouette (a `null_car`) and START is disabled; (b) opening the garage from a level that
          restricts the car shows only the cars that may be driven there; (c) the player's own pick is
          remembered apart from the car forced by a restricted level, and comes back when they move to a
          level that allows it.
    - [ ] Q46. "Level 51 has a bridge that narrows. It has jagged steps." (Cattle Drive, `levels/cattle.json`:
          the one-lane bridge at 1280 to 1420 with its `narrows`; the narrowing is drawn in steps where it
          should taper.)
    - [ ] Q47. "Allow level crossings to define a train model. The level crossing in the Wild West should not
          use the bullet train." (A `train` setting on a crossing or on the theme; a steam train for High
          Noon and Cattle Drive.)
    - [ ] Q48. **A STANDING RULE for every level brief:** "The agents that build levels really need to know that
          they should not aim to cram every gimmick into every level." (With Q21: gimmicks suit the theme. A
          level has a few kinds that belong to its place and one idea of its own, not one of everything.)
    - [ ] Q49. **A STANDING RULE, and levels to fix:** "The rockfall gimmick keeps getting added to places where
          they float in mid air. There needs to be some standing memory about this". (Rockfall only where a
          rock face or slope stands above the road on that side, and looked at in a still before the level
          is called done; an audit of every level with `rockfall` or boulder `wreckage` for rocks that hang
          in the air. Saved to the orchestrator's memory.)
    - [ ] Q50. **An audit of every vehicle model**, the owner's three parts:
      - [ ] Q50a. "Define proper headlights, brake light and turn signals to all vvehicles."
      - [ ] Q50b. "Audit all models to not have gaps in their models. For example, the hearse's rear window is not
            connected to its chassis, the Tow Truck's rear bumper is floating."
      - [ ] Q50c. "Audit all damaged models to make sure they don't look silly. The Polygon Truck's damage model
            phases though its windscreen, and keeps its lights hanging."
      - Which models: the garage cars (`render/models.js`), the Blue 4 cars and the idea cars
        (`render/ideaModels.js`), traffic (`render/trafficModels.js`), pursuit, emergency and level
        vehicles, the amphibious cars and boats. Dents and scorching came in with `fda617c`. Each model to
        be looked at in stills from several sides, whole and damaged, lights on.
    - [ ] Q51. "Audit and add more idle animations to vehicles where it makes sense". (Goes with Q50, the same
          pass over every model. Some have one already through `userData.animate`: the Lowrider's hop, the
          Junker's shudder, the Love Bus's sway, eleven of the idea cars. Q30 limits one of them: the
          Gullwing's doors only in the garage.)
    - [ ] Q52. "Remove the top speed clamp and allow Magenta 6-stars to scale as per their model. These are
          supposed to be fun extras". (The nine earned cars: `earnedCar()` in `cars.js:259-260` holds top
          speed to 49 to 52 m/s (`EARNED_SPEED`, `NEXT_TIER_CAPS.maxSpeed`) and acceleration and health to
          `NEXT_TIER_CAPS`, so the Road F1 is slower than the F1 its own level lends. **The owner's
          correction: "Magenta 6-star is not a real tier, just an assignment for cars outside of the tier
          system."** So the six magenta stars are a label, not a rung above gold and blue 5: nothing should
          treat these cars as a sixth tier (`tier: 6`, "next tier" caps, a place in any tier's balance, the
          progression rework's tiers and car rule, Delivery's "next step of the line" on `delivery-stats`,
          the handover's "6-star tier" wording). To do: take the speed clamp off so each drives as its
          vehicle does; with no tier to belong to, the orchestrator reads the acceleration and health caps
          as going too (the owner named only top speed: confirm). The balance and earned checks assert the
          caps and will need to follow.)
      - **Q52, how to do it, from the owner after reading the code:** "The stats are fine in this file. There
        is no reason to calculate these stats instead of defining new stats with existing models." So the
        stats stay in `cars.js` (no move to JSON for this); `earnedCar()` stops computing: no `Math.min` /
        `Math.max` against `EARNED_SPEED` or `NEXT_TIER_CAPS`; each of the nine earned cars is written out
        with its own top speed, acceleration and health beside the model it uses, as the garage cars are.
        That settles the question above: all three are defined, none is clamped.
      - **Q52 and Q53 DONE on `main` by the orchestrator at the owner's word ("Just edit it now, its faster";
        "Also do the unclamping of 6-star cars while you're at it, but nerf the race cars slightly for their
        road versions").** `cars.js`: `earnedCar()` no longer clamps anything and `EARNED_SPEED` is gone;
        each earned car drives by the figures written for it (top speed / acceleration / health): Hell Rod
        50 / 18 / 200, Saucer 58 / 30 / 100, GT Racer 57 / 13 / 240 (the GT is 62 / 14 on its circuit), Land
        Jetboat 34 / 13 / 120, Road F1 68 / 18 / 160 (75 / 20), Road Prototype 68 / 18 / 280 (75 / 20),
        Courier Special 50 / 19 / 220, Showdown Muscle 52 / 17 / 300, Road 8x8 32 / 9 / 450. `tier: 6` is
        still what draws six stars: nothing else was changed to stop treating it as a tier. `superOf`: the
        Lowrider's Super version is the garage's Super Lowrider as it stands (model, colours, 47 / 16 /
        260, no kit). The earned and mysteries checks rewritten to match; earned, mysteries, balance and
        bundle checks pass. NOT run: the other checks. NOT seen or driven: the souped-up Lowrider on
        screen, any earned car at its new speed (the Road F1 at 68 m/s on an ordinary level is untried:
        bends, the jump over a jam, the camera).
    - [x] Q53. "the lowrider gets skipped for an upgrade. That is not correct, its upgrade is the Super Lowrider
          (in the regular garage)." (`superOf` in `cars.js:379-380` returns nothing for `car.id ===
          'lowrider'`, so the "souped up" mystery skips it. To do: a souped-up Lowrider becomes the Super
          Lowrider, the Blue 5 garage car `superlowrider` (`cars.js:168`), for as long as the effect lasts,
          not a livery and kit on its own model. With Q40: a car with no Super variant is told so; the
          Lowrider is not one of those.)
    - [ ] Q54. "The cone of fire on the Egg in a nest cargo is reversed". (Evil cargo `egg`, its furious state:
          the hatched dragon's flame; `render/cargoModelsEvil2.js`. The cone points the wrong way, wide end
          at the mouth.)
    - [ ] Q55. "In the Spa level, the runoffs are really wide. At some points, the car pulls to the middle of the
          runoff (it is a road shoulder) when the proper lanes carry on straight. This should not happen,
          but turning off steering within a shoulder/runoff in races is also not feasible." (Spa's run-off
          is up to 27.5 m wide, tapered since 10-Oct. Something centres the car in whatever strip it is in:
          look at the lane assist with hands off and how it picks a lane where the run-off, treated as a
          shoulder, is far wider than a lane. The fix must leave the player free to steer on run-off: the
          pull should only ever be toward a real lane, or not act at all outside the lanes. Monza has the
          same wide run-off; Albert Park has none.)
- [ ] **QUEUED for the next session (owner, after the stand-down; not labelled to jump the queue): two changes.**
  - **Shelve the Tow Truck's gimmick.** The owner: "That is a useless feature. Let's just shelve the tow
    truck gimmick for now." What it is: the car's trait `tow` (`cars.js:127-129`): driven into fallen
    wreckage that has come to rest, it marks the wreckage cleared (`wreckage.js:163-171`; `towAfter`,
    `towKept` in `CONFIG.wreckage`; message `events.towed`), and the wreckage simply turns invisible that
    frame (`render/wreckage.js:201`): nothing is dragged. To do: take the trait and perk off the Tow Truck
    (it stays a car, wrecked by wreckage like any other), keeping the code path dormant or removing it
    cleanly, with the garage's perk text, `.traits-check.mjs` and the Gimmicks page brought into line. The
    other three traits stay.
  - **Rubbernecking becomes an obstacle-based gimmick.** The owner: "Let's change rubbernecking to an
    obstacle-based gimmick. Randomly on the shoulder we put two cars (in damaged model condition) and on
    fire. Rubbernecking happens at this zone. This should only happen on roads with more than 1 lane per
    direction." Today (`CONFIG.rubberneck`, `traffic.js:540-560`, `Traffic.noteWreck` from
    `collision.js:934`): for 25 s after ANY traffic wreck, traffic slows to 35% from 70 m short of the spot;
    an evil driver held under 40% of its speed for 3.5 s goes up the shoulder for up to 12 s and is arrested
    if police within 90 m see it. To do: the slowing no longer follows wrecks; instead a crash scene of two
    cars with the game's dented, scorched look (the damage models of `fda617c`), burning, stands on a
    shoulder, and traffic rubbernecks past it (the slowing, and the impatient evil driver, kept). Only where
    the road has two or more lanes each way at that spot. **To settle with the owner or in the brief:**
    "randomly" against the standing rule that level content sits at fixed positions, the same every run
    (suggest: the place is picked by a seed from the level, so it is the same every run, on levels that
    qualify, or a level names it); whether the two cars are solid obstacles to anyone using that shoulder
    (shoulder cash and shoulder dodges now exist on many levels: the scene must not sit on one); the
    gamble it gives (the lane beside the scene crawls, the far lane flows: cash in the crawl?); a card on
    the Gimmicks page and the road card; a check; stills.
- **Stood down on the owner's word ("Draft a handover for the next delegation agent, push and stand down").**
      `HANDOVER-orchestrator-10-Oct.md` is the handover for the next orchestrator. `main` pushed with it:
      everything merged on 10-Oct is on the remote and deploying. Not checked on `main` itself before it
      went: the six merges after `6409bb9` (each passed its own checks on its branch).
- [x] **The last agent has stopped: NO agent is running.** Its results:
  - **All 28 checks pass at `a29522e`** (what is live, `8fa45a6`, plus Speed Trap Alley, Mountain Pass and
    the suburb scenery). At `6409bb9` (that plus the themed obstacles, batch F, one burst-main system,
    Outback Express): levels, schema, bundle, hazards, obstacles and road-card checks pass, and the replay
    check passes over ALL 68 levels; the other 22 were not re-run there. **Nothing after `6409bb9` has had
    a check run on `main` itself:** the gap fills and seeded check, the level-text file, fog by theme,
    Market Town, the mains follow-up, the obstacles tidy-up (each passed its own checks on its branch).
  - **The built site was looked at for the first time** (a production build of `a29522e`, stills, no
    console errors or failed requests): the start screen with a sharp large picture and the live car, the
    Car ideas lot, a run on Toy Box Derby at two places, the Gimmicks page. Stills only.
  - Menu pictures for Outback Express (`6409bb9`) and Market Town (`3a65b31`) from their agents' frames,
    both sizes looked at. The README and HANDOVER screenshot paragraphs are up to date (`d5b157e`). The
    script can shoot a built site (`--dist`) and name a level by id (`@id`).
- [x] **Level 25 Market Town to the new standard: `delivery-rework-f` merged into `main` as `7a90971`, not
      pushed; its agent has stopped (four running: fallout, Ring Road, Spring Thaw, the full checks).** 16
      segments for 9 (two S-bends, a hump, a late S; longest straight 650 m through both crossroads); five
      zones (Corn Street, Church Row, the market square, the park, the cattle market: the `market` set is
      drawn at last, a new `livestock` set); a station, signal box, fences and poles at any suburb level
      crossing; houses along a crossroads' arms. Cameras 2 to 4, crossings 1 to 2 (the second 180 m from
      the finish), mains 1 to 4, cash 25 in 10 rows to 36 in 14 (seven reaching a shoulder), cargo puppy /
      goose; kinds the same; clock 185 / 140 unchanged. All 27 checks passed on the branch; 37 stills
      looked at; sheets sent to the owner. Weak: the crossroads' corners are still grass close in; the
      beasts are plain boxes; the town hall repeats along the square; the side road never driven; a main
      never caught spraying. Menu picture made from the default camera (houses only): a better frame
      (`'market-town': '&at=900&ff=2&cineside=left'`) given to the screenshot agent. Its words are still in
      its level file: to move into `levelText.json`. For the owner: the stop / go.
- [x] **`delivery-themes-f2` merged into `main` as `c127d49`, not pushed; its agent has stopped (five running:
      fallout, Market Town, Ring Road, Spring Thaw, and the full checks).** Fog takes its colour from the
      theme's sky (`ff21b9a`, `render/roadside.js`): the same pale grey under a bright sky, three quarters
      the sky's own colour under a dark one (After Hours and Northern Lights dark blue-grey, Eruption Day
      red-brown, Seaquake blue silt); a theme may name a `fogColor`. A second fault fixed with it: a run
      begun inside a bank had a white sky and almost no fog (every still taken with `&at=` inside one).
      Visibility and play unchanged. Bundle, levels, hazards, gimmicks3 and HUD checks pass. Far backdrops
      drawn with `fog: false` (the volcano, the aurora) still show through a bank. After Hours' menu picture
      in both sizes (`f5f74a0`). The side roads of After Hours and Cattle Drive seen from on them: nothing
      to fix (`&at=10000+` puts the car on a level's first side road, `40000+` its second); where Cattle
      Drive's first side road crosses the ford's river was not caught. Night Shift never started.
- [x] **`delivery-gapfill` merged into `main` as `3d4dfcb`, not pushed; its agent has stopped.** The gimmicks
      check on `main` is now seeded and repeats. The four gap fills were looked at in 13 stills: all read
      (the washboard's boards and corrugation on the toy track, the black tar lane with its cones in the
      tube, ruts on moon dust, cushions on the favela street; every shoulder note on drivable shoulder).
      Fixed from the stills: nothing warned of the barrier beyond Tranquility Base's crest, so a cone now
      stands in its lane on the way up (a small cue; a bigger marker or moving the barrier are the
      alternatives); the washboard's message reads the same on every level ("Washboard! Fast and it skims
      smooth, or crawl. Not in between."). The full set of checks was not re-run after the last commit.
      Tour de Coast was begun before the cancellation reached it: WIP on `delivery-rework-d`, written up
      in `SCRATCHPAD-10-Oct-dropped.md`.
- [x] **`delivery-obstacles-2` merged into `main` as `24587fe`, not pushed; its agent has stopped (seven
      running).** A theme variant takes its parent's obstacle mapping; Eruption Day's six stand-in crates
      are rocks again and so lava boulders (a rock costs a little more than a crate: 25 damage and 60%
      speed kept against 18 and 75%); the Moon's flag is a wide striped banner; the snowdrift's stake is
      stout and banded; a level's own card names what darts there (tumbleweeds on High Noon). Seen on their
      roads: After Hours' carts, the lava boulders on the black road, in the tube and on the ruts, Stunt
      Double's dollies, the director's chairs, the chair stack, the rice baskets, the brighter helmets, the
      Derby's blocks. Eight checks pass; probes deliver; clocks unchanged. Stelvio was never started.
- [x] **`delivery-mains-2` merged into `main` as `01c4f19`, not pushed; its agent has stopped (nine running).** The
      eight newer levels' mains all name a lane and carry no `every`; no leftover reference to the removed
      system; six checks pass on 68 levels. A main's whole slippery length is now marked: a thin blue sheet
      across the lane with pale foam edges, under the existing pools (`a90693c`); seen on Leaks, Mumbai and
      the ice road at night from about 50 m, no close-up, the fade not seen. The ghost probe can drive an
      amphibious level (`d53c354`). **Hong Kong parked:** `delivery-rework-b` at `97d52c9` (the level file
      re-laid, WIP; no scenery written; where each set-piece should go is in that agent's last report:
      shop fronts between 3.2 and 6 m on the city side, clock towers at the piers at 500, 1700 and 2900,
      junks along the tide beyond 14 m on the sea side, the Peak about 330 m off the city side).
- [~] **STARTED AT ONCE (the owner: "High priority"), a tenth agent, branch `delivery-fallout`: a new theme,
      level and gimmick: nuclear fallout.** The owner's words: "Nuclear fallout level, near a powerplant/industrial area. Green
      skies. Gimmick 1 is radiation areas, driving into radiated areas causes health to tick down slowly. A
      unique radiation meter ticks up, and at full the player is permanently infected and the health ticks
      down regardless. Gimmick 2 is infected cars. Traffic cars can spawn infected, or have a chance to get
      infected while driving in radiation. An infected car will have a radius where they have the same
      radiation gimmick. Infected cars don't tick down other infected cars. Contact with an infected car
      will infect you. The shield will prevent radiation damage, and will prevent the player from getting
      infected."
  - For the builder to settle and report: how a radiated area and an infected car's radius are SEEN (they
    must read at a glance: a green haze with a hard edge on the road, a glow and a Geiger tick on a car);
    where the meter sits (the HUD's meters' corner; an icon once infected, as lasting conditions now are);
    whether the meter falls again outside radiation before it is full; rates in `config.js`; that every
    radiated stretch has a clean line or a shield before it (the owner's rule: a gamble, never an imposed
    loss); what the shield does while it lasts for a player already infected; traffic health under
    radiation (do infected cars wreck themselves); the level to the standard (27 to 37 cash, 8 to 15 rows,
    themed obstacles through the theme's mapping); the theme reusable.
- [x] **Level 22 Outback Express to the new standard: `delivery-rework-c` merged into `main` as `a57fb69`, not
      pushed.** 21 segments for 9 (an S, a floodway dip, a rise; longest straight 400 m for 1000); crossings
      3 to 4, each with a turbo before and cash past the rails so racing the train pays and easing off
      works; cash 7 in 2 rows to 36 in 15 (five 20s on the right shoulder); eleven named places (roadhouse,
      sidings, homesteads, the pub, the railhead) drawn from new sets in `render/themes/extras.js`, red
      ranges on the skyline; kinds the same; clock 225 / 165 unchanged; cargo puppy / egg. All checks pass.
      19 stills looked at; pictures sent to the owner. Menu picture: its camera's address given to the
      screenshot agent. Not played; not seen as Evil; the Bathurst circuit not shot.
- [x] **Level names and descriptions in a JSON of their own: `0c9d2b0`, merged into `main` as `36517ff`, not
      pushed; its agent has stopped (six running).** `src/delivery/levelText.json`: `{ id: { name,
      description: { good, evil } } }`, in menu order; `levelText.js` gives `levelName(level)` and
      `levelDescription(level, evil)`: the file first, then the level's own file, then the id. 65 levels'
      words moved out of their level files (each file checked to parse to the same object less those two
      keys); 9 stay in their files on the fallback until their branches land (`hong-kong`, `tour-de-coast`,
      `ring-road`, `market-town`, `stelvio`, `toys`, `leaks`, `moon`, `morro`). Every reader goes through
      the function (the stage and strip, the road card, the album, the race leaderboard, the summit sign,
      the reference pages' level lists, the editor's list, the scripts). The editor opens a built-in level
      with its words put in and writes them into a downloaded level. The descriptions check also fails a
      level whose words are in both places with different text. Nine checks pass. Seen in stills: a moved
      level as Good and as Evil, a fallback level, the road card's title. Not seen: the side switched live,
      the editor in a browser, the album's captions. NOT run on the merged `main` (which had gained the gap
      fills and the obstacles tidy-up since the branch was cut).
- The request, for the record: **Level names and descriptions into a JSON of their own (owner, 10-Oct evening):** "Split the level names
      and descriptions into its own JSON. Fallback to the level's file if not available. Descriptions to
      change based on good or evil." Branch `delivery-level-text`, the Outback Express agent. Levels held
      by open branches (Hong Kong, Tour de Coast, Ring Road, Market Town, Stelvio, and the four gap-fill
      levels) keep their words in their files until those branches land.
- [x] **Audit C1 done: `538320f`, `delivery-mains` merged into `main` as `58987d3`, not pushed.** The undrawn
      round slick (`watermains.js`) is deleted with its drawing, config, sound and second doc entry; a
      main's `lane` is now required; `every` dropped from the schema and from Flooded and Mumbai. The wet
      lane, its fountain and pools are unchanged (before / after stills the same). What the player loses is
      only junk: after a change of level, the old system drew another level's mains frozen in the wrong
      places. Hazards, schema, levels, gimmicks3, road-card, descriptions and replay (15 levels) pass. Two
      clean runs got faster and now match their written clocks (Dock Run, Twenty Thousand Leaks). Being
      checked now against the eight levels merged since (`delivery-mains-2`), where the faint pools down
      the lane are also being strengthened.
- [~] **Level 27 Hong Kong (`delivery-rework-b`, WIP `1b3a207`):** the level file re-laid (3.7 km in 14
      segments, two tunnels, four cameras, four tar stretches, seven chicanes, 36 cash in 16 rows, clock
      225 / 165, cargo canary / genie), kinds unchanged, probed to the finish. Not done: its scenery sets,
      menu picture, the full checks.
- [~] **Delivery and Nerve: built on `delivery-stats` (`0161d71`), HELD, not merged, for the owner.** Found: a
      thrown package only ever wrecks TRAFFIC, whose health is fixed by kind (commuter 45 ... semi 320) and
      does not rise with level or tier. So Delivery rising by tier (1 + 0.14 a tier, vans and trucks +0.08,
      two-seaters -0.08) makes higher tiers wreck traffic MORE easily (a semi: 13 packages at tier 1, 9 at
      tier 5), against the owner's "harder to wreck higher tier cars overall". The social meter is a rate
      (4% a gift, 1% a second drain), so it needs no per-level scaling. The danger meter allows 3 s (up to
      double with full standing); a level's `shoulderTimer` is a switch, not a multiplier; Nerve multiplies
      the allowance, band 0.8 to 1.3, cap 8 s, set by character and checked not to follow tier. No trait
      overlapped. Shown in the garage, the comparison table and strip (nine cells fit 360 px), the car
      card. New `.carstats-check.mjs`; balance check extended. Its agent is on Spring Thaw meanwhile.
- The decision, for the record: **Audit C1 decided by the owner: "remove A"** (the undrawn round slick of `watermains.js`; the wet lane
      of `hazards.js` stays). Branch `delivery-mains`, the Quarry Run agent, before Hong Kong.
- [x] **Lasting messages as icons: `06cd661`, merged into `main` as `7b482e0`, not pushed.** A lasting condition
      is said like any message for its normal 4 s, then leaves a round icon with a draining ring (eleven
      icons, inline SVG, `render/hudIcons.js`); a hover or touch says it again for 3 s. Under the gauges on
      desktop and phone landscape, beside them in portrait. HUD, bundle, levels, mysteries, milestones and
      gravel checks pass; stills at the three sizes looked at; before and after sent to the owner. Not seen
      moving or on a real phone; a tap on an icon never fired in a browser; narrower than about 375 px the
      third icon of a row may reach the tank corner. Its agent is now on level 22, Outback Express
      (`delivery-rework-c`).
- [x] **Themed obstacles: `delivery-obstacles` merged into `main` as `9e5e058`, not pushed.** 23 kinds on a
      mapping per theme (and a second mapping for a kind when it is one of a level's drifters); all shown
      close up on the Gimmicks page under "Road dressing" (`gimmicks.html?group=road-dressing`), which says
      they are not gimmicks and is on no level's road card. Corrected after being seen: the director's chair
      (DIRECTOR on its back), the chair stack, the camera dolly (side-on to the road), the rice baskets on a
      carrying pole, the supply pod (legs, hatch, aerial), a brighter diving helmet. Added: a glowing lava
      boulder for the volcano's rock, a toy drum, a café table, tumbleweeds for the Wild West's drifting
      bales, a flag for the Moon's drifting cones, wheelie bins (The Hood), snowdrifts, sacks (Mumbai), a
      beach ball (Hurricane), brimstone for hell's cones (one shared mesh). Cones that are roadworks stay
      cones. Obstacles, levels, schema, bundle, road-card, hazards and replay checks pass; four clocks did
      not move. Pictures sent to the owner. Weak: the Moon's flag and the snowdrift's stake at distance
      (being fixed on `delivery-obstacles-2`); several final models not re-shot on their own roads. Its
      agent then takes level 30, Stelvio (`delivery-rework-g`).
- The first pass, for the record: [x] **`d9f4696` on `delivery-obstacles`** (three of thirteen models
      never seen, none seen close up; the agent is on that now). **The audit:** the crate is only on the
      newest levels (49 on 11 of levels 32 to 43); older levels use barrier, cone, sign and bale and things
      made for their place; 22 menu levels place no plain obstacle. **Mechanism:** a mapping on the theme
      (`OBSTACLES` at the foot of `themes.js`, `themedKind`), applied where a level's `obstacles`,
      `shoulderRows` and `drifters` are loaded, so no level file changes and nobody else has anything to
      replace; each new kind costs and measures exactly what it stands in for; new
      `scripts/.obstacles-check.mjs`. **Built:** toy block and skittle (toy room), diving helmet (sea bed),
      supply pod (moon), director's chair and camera dolly (backlot), mooring posts (Venice), fuel drum (ice
      road), popcorn cart (theme park), barrel (Wild West), chair stack (favela), rice basket (rice), a
      present (Christmas Eve). Port keeps its crates. Checks pass; three clocks did not move. Pictures sent
      to the owner (Venice, the barrel, the drum, the carts). Next there: a sheet of all thirteen close up
      and corrections, a lava boulder for the volcano's too-dark rock, then wheelie bin, tumbleweed,
      snowdrift, sack stack, a flag for the Moon, Hurricane's bales, hell's cones.
- [x] **Every check on the code pushed as `1f05bc5`: all 27 pass** (run on `delivery-gapfill` with `main` merged
      in; that tree differs from `1f05bc5` only by the seeded gimmicks check and four level files).
- [~] **`delivery-gapfill`: built, NOT merged (unseen; its agent is taking the stills).**
  - The gimmicks check is seeded and repeats (`e940af3`): `--seed=n`, `--seeds=k`; two full runs print the
    same bytes. All three flaky lines were the CHECK's faults (a test vehicle put into a used slot kept the
    last driver's quirks; cleared traffic was dealt out again the next step; a lane read after the stretch
    ended): none in 30 seeds now. Today's ice change does not touch traffic.
  - The four gaps (`8156b6e`, `af993a7`): Toy Room a washboard with two crates (440-660); Leaks a fresh-tar
    lane (3560-3860); Tranquility Base a barrier past the crest (470) and ruts (620-820); Favela Heights
    speed cushions (1490-1670); cash re-laid with a 20 on a shoulder at each; descriptions reworded.
    Checks, replay and probes pass; no clock moved.
  - Seen in the game's code and left: a tall vehicle only takes the low bridge's exit if already in the
    kerb lane; Tranquility Base's crest costs 30 health on landing at 130 km/h even in a clear lane.
  - Next for that agent: level 23, Tour de Coast (`delivery-rework-d`).
- [x] **Second levels, batch E: `delivery-themes-e` merged into `main` as `3cb4f2d`, not pushed.** All five seen
      along their whole length (56 stills); three faults found and fixed: a toy-room rug lying over Derby's
      road (`82a73a7`), a wall across the camera at Far Side's second hairpins and a crater rim across its
      road (`88f4297`). All 27 checks pass on the branch; clocks as written. Menu pictures in both sizes for
      four; Stunt Double's waits on a `CINE` entry (given to the screenshot agent). Pictures sent to the
      owner. Not re-shot: Tranquility Base after the crater change. Not started: Spring Thaw (the ice
      road's second level). On `main` the menu now has 65 levels.
- [~] **Two new car stats, Delivery and Nerve: started** by the batch E agent, branch `delivery-stats` (it reports
      first on how packages, the social meter and the danger meter work today). The owner's words follow.
  - **Delivery:** scales package damage / happiness. "Delivery is to be scaled over tiers as health is
    scaled. To keep the number of packages required to destroy a car in control. It should still be harder
    to wreck a higher tier cars with packages overall." And: "We will have to consider if the social meter
    needs to be scaled per level as well" (to be reported on by whoever builds it, before it is designed).
  - **Nerve** (the owner took the name): scales the danger meter's countdown. "Nerve shouldn't scale per
    tier but as a extra balancing knob."
  - To settle while building: both as multipliers in `cars.js` (1 changes nothing); Nerve to multiply the
    level's own shoulder timer; whether either overlaps one of the four car traits; room for nine stats on
    the phone's comparison strip; values for the 41 garage cars and the idea cars.
- **Level progression rework: three more answers from the owner (10-Oct evening; still not being built):**
  - Owning a car of the tier (open question 3): "The player is forced to buy a car of that tier." No loan,
    no gift. (Whether a tier's tips cover the next tier's cheapest car is then a matter for the rebalance.)
  - Amphibious levels: "meant to be locked behind each regular star. A player will have to buy all 5 to play
    them." Read as: A1 to A5 are tied one each to star levels 1 to 5 and each needs the amphibious car of
    that star (Sailing Herald, Float Van, Toybota, Dampervan, Nissank), so all five must be bought to play
    all five. Today the section is open from the start and any amphibious car plays any of them. Exactly
    what opens each (reaching that gold tier, or only owning that car) is still to be confirmed.
  - Blue 4 has no cars (open question 4): four of the idea cars to go there. The orchestrator's suggestion,
    awaiting the owner's word: Rear-Engine Coupe, Snake Roadster, Stainless Gullwing, and the Polygon Truck
    (the owner: "Swap the rally wedge for a non-passenger car model"; other such choices: Wide Truck,
    Monster Truck, Fire Engine). **Approved by the owner.** [~] Being built by the idea-cars agent as a
    further piece on `delivery-idea-cars`: the four become real Blue Star 4-star garage cars (stats and
    prices between Blue 3 and Blue 5, bought and owned); the other twenty-six stay tierless and free. Open questions for the owner are
    now kept in `OPEN-QUESTIONS-10-Oct.md`.
- **Pushed on the owner's word ("Push it"): `main` at `1f05bc5` is on the remote and deploying.** The full set
      of checks on it had not come back when it went; no production build was run here.
- **The owner's rule from here: a request jumps the queue only if the owner labels it so;** unlabelled ones go
      to the next agent that frees up.
- [x] **Idea cars drivable and the Blue 4 tier: `5b78611`, `8dd1dbf`, merged into `main` as `9c3dfdc`, not
      pushed.** 26 ideas stay in their lot, tierless, free, flagged `placeholder`, "Drive it" on the lot's
      button, "Idea" where stars would be; they stay out of `CARS` (only the look-up of the car in use sees
      both lists) and out of the save's owned list (the cookie is 1024 bytes on a full save). Four are now
      real Blue Star 4-star cars with Super liveries: Stainless Gullwing $920, Rear-Engine Coupe $960, Snake
      Roadster $1000, Polygon Truck $1060. A crash on opening the garage with a bay-less car in use was
      found by the stills and fixed. New `scripts/.ideas-check.mjs`; the balance, save, mysteries, gimmicks3
      and other checks pass. Stills looked at; pictures sent to the owner. Not driven by hand; 22 ideas not
      seen in a run; no horn heard. Its agent is now on level 24, Ring Road (`delivery-rework-e`).
- The original entry: [x] **Idea cars drivable (owner, 10-Oct evening; JUMPED THE QUEUE):** "Give all the idea car models placeholder
      values and allow them to be selected. They are tierless for now." The thirty models of the Car ideas
      lot get placeholder stats (flagged as such), no tier, stars or price, a "Drive it" button, and are
      saved as the car in use without joining the owned list; not in traffic. A ninth agent, branch
      `delivery-idea-cars`, stills included.
- [~] **Obstacles to belong to their levels (owner, 10-Oct evening):** "Replace the crates with a better obstacle.
      Please replace the obstacles with things more evocative for their levels. Do an audit. These obstacles
      are not gimmicks." Read as: plain obstacles (crate, cone, barrier, bale...) are dressing, so swapping
      them does not change a level's list of gimmicks, and each replacement behaves exactly as what it
      replaces; the crate goes wherever something better fits; every new one must read at a glance against
      its road (the tyre's fault). An eighth agent, branch `delivery-obstacles`: the audit (every level's
      kinds, a table per theme), a mechanism (likely a mapping on the theme, so level files need not
      change), models for the twelve newest themes first, stills. Level agents told to keep placing generic
      kinds and to list any obstacle that does not read or does not belong. Batch E's crate drifters on
      Derby and Seaquake stay as drifters and take the theme's replacement.
- [x] **`delivery-gimmicks` merged into `main` as `1f05bc5`, not pushed** (it had waited since the morning): the
      low sun (Grand Pacific, Passage du Gois), the dust trail (Safari, the Battlefield), the flooded
      underpass (Big Business, Expressway); Gimmick Road 3 is 1200 m longer. No conflicts. The full set of
      checks on this `main` is being run by the gap-fill agent: NOT yet known to pass.
- [x] Old screenshot folders: the owner said to delete the `delivery-shots-*` leftovers in Temp; given to the
      screenshot agent (only those, and none belonging to a live run).
- [~] HUD (owner, 10-Oct evening): "Permanent messages block too much of the screen. They should show up as
      normal messages and stay there with a icon." The eleven sticky messages (puncture, beached, bad gas,
      heavy, butterfingers, six bad mystery effects) to show for the normal time like any message, then
      leave a small icon each for as long as the condition lasts, clear of the road, the meters, the cargo
      window and the touch buttons. A seventh agent, branch `delivery-hud-sticky`, stills included.
- [x] **Screenshot script fixed: `5929c09`, `a175592` on `main`.** One Edge a run over the DevTools protocol,
      its TEMP, profile and Vite cache in the run's own folder (`delivery-shots-run-<pid>-<when>`), removal
      retried, dead runs swept, two runs at a time on the machine, `--scale`, `--size` exact (under 500 wide
      works), `--wait` counted from the page's load. Shared temp counts did not move over about 20 runs;
      kill, SIGINT and thrown-error tests left nothing. First picture of a run 13 to 113 s on a loaded
      machine, later ones 2 to 9 s. Not verified: a real Ctrl+C, the 15-minute stale rule. **For the owner:
      eight old `delivery-shots-*` folders (about 340 MB together) are left in `%LOCALAPPDATA%\Temp`; nobody
      may delete them without the owner's word.** Its agent is now making `--levels` write both picture
      sizes (M4) and retaking every level's picture.
- [x] **`delivery-menu3d` merged into `main` as `208f8b0`, not pushed**, after 18 stills: no blank tile, models in
      their boxes after scrolling, the car whole on its card at desktop and phone size (Commuter, Hearse,
      the 8x8), the police car black and white with its bar on levels 13, 25 and 33. Pictures sent to the
      owner. TO TRY BY HAND before it goes live: (1) a real phone, the menu then a run (the menu holds one
      more WebGL context for good); (2) traffic with police and an ambulance in a run (the game's light-bar
      code was moved, read only); (3) open and close the road card a few times, then start a run; (4) scroll
      the Gimmicks page on a phone.
- [x] **Second levels, batch F: `delivery-themes-f` merged into `main` as `4953abf`, not pushed.** After Hours
      (49), Eruption Day (50) and Cattle Drive (51) each seen along its whole length; `main`'s menu now has
      68 levels. Changed after looking: Eruption Day's six rocks on the black road could not be seen and
      became crates as a stand-in (the obstacles agent is putting them back as glowing lava boulders); its
      erupting look built (`229dd8d`: a larger mountain, a pulsing fountain, four times the embers; Cinder
      Island unchanged, shown before and after). Menu pictures in both sizes for Eruption Day and Cattle
      Drive; After Hours has only the small one. All 27 checks passed before the last merge of `main`;
      fifteen re-run after it. Pictures sent to the owner. Not seen: either Cattle Drive side road or After
      Hours' from on it. For the owner: Cattle Drive's one-lane bridge; After Hours' two drifters (trolleys,
      crates in the tunnel). Next there (`delivery-themes-f2`): fog that takes its theme's colour (it is
      pale grey everywhere, washing out night and volcano skies), then Night Shift on the port at night.
- The entry as it was while unmerged: **Second levels, batch F (`delivery-themes-f`).**
      `4694b46` (main merged in), `3178fc4`, `3e37c87`, `1e28dc5`, `b5b162a`; all 26 checks pass bar the
      unseeded crosswind line of the gimmicks check. After Hours 34 cash / 15 rows / 150-110; Eruption Day
      37 / 15 / 250-190 (its two rock drifters replaced by fixed rocks); **Cattle Drive** (`cattle`, Wild
      West, new: 5.62 km, two side roads, a ford, a low trestle, three stampedes, two crossings) 36 / 15 /
      255-195. For the owner: Cattle Drive's bridge at 1280 narrows the player's side to one lane for
      190 m (the oncoming lane is the way past).
- **Pushed on the owner's word ("Push what you have"): `main` at `8fa45a6` is on the remote and deploying**
      (Quarry Run, the HUD's icons, batch E's five levels, the idea cars and Blue 4, levels 1 to 30's
      pictures in two sizes). The full set of checks was not run on it first; the screenshot agent is doing
      that now, with a production build looked at.
- [x] **M4, two sizes of level picture: done.** `199e090`, `aed731b`, `b14e662`, `57c1d54`, `5f60de8` on `main`
      (the last two not pushed yet): `--levels --write` takes each cine still once at 1920x854 and writes
      `levelshots/large/<id>.jpg` and a 600x267 `levelshots/<id>.jpg`; all 65 menu levels have both (large
      5.5 MB in all, small 1.05 MB); 29 levels given a camera place of their own in the script's `CINE`
      table, since the old pictures' places were recorded nowhere. Weaker than the rest: marina-bay,
      montreal, monza, singapore-night, battlefield (being retaken). Only a handful of the large ones were
      looked at full size. The built site keeps each as a separate file.
- [x] **Old screenshot folders deleted with the owner's leave:** eight `delivery-shots-*` folders, 342.7 MB.
      The 710 `scoped_dir*`, 181 `msedge_*` and 24 74 MB `.tmp` files from before the fix are still in Temp
      (not covered by that leave). Free disk: 28.4 GB.
- [x] **Levels 20 and 21 to the new standard: `delivery-rework-a` merged into `main` as `a29522e`, not pushed.**
      Sheets sent to the owner. Speed Trap Alley: 12 stills, nothing to fix, 34 cash / 14
      rows, clock 240 / 180, menu picture in both sizes. The suburb scenery seen on Suburbia, The Hood,
      Christmas Eve and Market Town: nothing on a road. Mountain Pass: 12 stills, nothing to fix, 32 cash /
      13 rows; clock 195 / 155 (`33a000f`: the old clean run's 142 s was ice the non-steering test driver
      slid on, not the stop / go light); menu picture from a hairpin under the peaks. All 27 checks pass.
      Not played. Its agent is now on level 25, Market Town (`delivery-rework-f`).
- [x] **Every check on `main` at `74f3bfa` (the code that was pushed as `fc365ba`): all 26 pass**, each run by
      itself; logs in the session scratch folder, `checks-main-a`. Not run since on the later local merges
      (`f3302a9` tyres, `7e0290d` visual fixes).
- [~] **Second levels, batch E (`delivery-themes-e`, NOT merged: no level of it has been seen yet; stills being
      taken).** `69725b1` (main merged in), `8edaac8`, `77bd94a`, `2f8bd7a`; all 26 checks pass on the
      branch; ghost probes deliver all five. Toy Box Derby 37 cash / 15 rows / 155-120; Seaquake 35 / 13 /
      165-120; Far Side 37 / 15 / 265-200; Stunt Double 37 / 15 / 150-115; **Seven Bridges** (`ponti`,
      Venice, new: 3.99 km, seven humps, cobbles, cushions, crosswinds, spray, two tar lanes) 34 / 14 /
      175-135. Where the removed ramps were: a fresh-tar lane with shoulder cash (Derby 2120, Stunt Double
      2700), a washboard with a cone (Derby's finale, Seaquake 3080). `INSERTED_AT` has 44 to 48; it will
      conflict in one line with batch F's at the merge (keep both sides' numbers). For the owner: the four
      older ones keep the moving things they were written with (crate drifters on Derby and Seaquake, cows,
      frogs, portaloos, moving asteroids, runners). The ice road's second level is next.
- [x] **`delivery-visfix` merged into `main` as `7e0290d`, not pushed**, after its agent looked at all three in
      stills (27 pictures; before and after pairs sent to the owner). The tube and the drawbridge needed no
      change after looking; the wrench got a dark rim and brighter steel (`b40d45a`), having been grey on
      grey on the road. The "before" stills confirmed both complaints: a rib across the whole picture at
      camera height; the river drawn over the lowered deck and the raised leaf eaten by lava. Still weak:
      the tube's glass is faint, so it reads from its frame; the raised leaf's lip is not bold. Not seen:
      anything moving, `drive: left`, the wrench at 60 m after the rim. Its agent is now on Quarry Run
      (`delivery-rework-b`).
- Menu agent, further pieces on `delivery-menu3d` (still NOT merged; its stills are being taken now):
      the car framed by its length so a long one is not cropped (`6d98e7e`); reduced motion honoured by all
      the model views (`e764fa5`); the road card opens at once on the tap with "Loading…", and says so if
      it cannot load or draw, in place of a dead button (`177d09e`). The first stills showed no blank tile
      on the Gimmicks, power-ups or cargo pages.
- [~] `delivery-visfix`, as first built by numbers (bundle, schema, hazards, levels, gimmicks3 checks pass):
  - Sea bed tube, `b0ea829` (`render/themes/seabed.js`). Cause: the tube's crown was 11.5 m up and the
    chase camera rides at 11 m: the roof stringer ran 0.5 m over it, every rib's crown crossed at eye
    level, and in the outer lanes the camera was outside the glass. Now a rounded arch 19 m to the crown,
    stringers at 16.5 m and above, slimmer ribs: the nearest member is 4 m from the camera (was 0.3 m).
    To judge in stills: whether it still reads as a tube.
  - Drawbridge, `7f36407` (`render/hazards.js`). Cause: the river is a sheet 0.08 m over the road, and
    the leaf's slab and girders hung 1.4 m below its deck, so the hinge end stood in the water at every
    angle; the sheet's depth offset would also draw it over the lowered deck. Now a thin deck plate with
    its girders standing above it along the edges; nothing below the water through the whole swing. The
    river is still a sheet at road level, not a sunk channel.
  - Wrench, `ba6843c` (`render/pickupModels.js`). Was a box, a disc and a ring, all orange, standing edge
    on to the road (0.21 m wide from behind). Now a steel open-ended spanner with a slot in its jaw, a
    tapered handle with an orange panel and a ring end, facing the road. Nobody has looked at it yet.
- [~] Wrench pickup (owner, 10-Oct evening): "Improve the wrench model." A spanner that reads at a glance
      from the chase camera and as a tile (open jaw, flat handle, ring end), same size and pickup radius.
      Given to the `delivery-visfix` agent; to be looked at in stills and corrected once screenshots work.
- [~] **`delivery-menu3d`: built, five commits, NOT merged** (held until it has been looked at in stills: `main`
      is live as of `fc365ba`). The agent is merging `main` into it and taking the stills itself.
  - [~] Road card's police car (owner: "turns colour if the card glow is not white. It is also missing its
        siren"). `042d5bb`. Cause: the tile's glow and the body paint were one variable, and a police car,
        having no livery, took a paint by its place in the level's traffic (blue on Sydney to Kiama, red on
        Singapore II, green on Market Town). Now `FIXED_PAINT` in `render/models.js` (police, ambulance,
        drive-by), used by the game's traffic too; the light bar moved out of `render/cars.js` into shared
        code and added on the card for police and ambulance. The road-card check asserts both. The
        Gimmicks page did not share the fault. The game's own traffic renderer was refactored and is
        checked by reading only.
  - [~] Models trailing their tiles on the reference pages (bug 4). `6a53b37`, `9fe613d`, `65dc20c`: one
        renderer off the page, each tile its own small canvas, so pictures scroll with the page; no
        renderer means text with empty pictures, never a throw; the road card opens regardless; the cargo
        page on the shared code. New `scripts/.modelviews-check.mjs` (11 ok). Blank tiles are possible until
        seen in a browser.
  - [~] M5 the live 3D car on the car card. `576e927`: the car's model on a turntable in the side's livery,
        sharing the road card's renderer (one extra WebGL context for the whole menu), the picture as the
        fallback, still under reduced motion. Framing numbers are guesses: long vehicles may be cropped.
- [ ] Drawbridge (owner, 10-Oct evening): "The drawbridge, when opened, phases through the water." A raised
      leaf (or its counterweight end as it swings down) cuts through the river's surface. The river was made
      to take the theme's colour on 10-Oct (`29e78ba`: lava on Cinder Island, lagoon green on Venice, a blue
      ribbon on the toy carpet), so look at each. To do: find which part crosses the water sheet and at what
      angle of the leaf; fix by the pivot, the leaf's length or the water's level and banks; stills of the
      leaf fully open and half open on a plain level and on Venice. Waits on the screenshot script's fix.
- [x] **Tyres out as obstacles: `612e59b`, `da40e09`, merged into `main` as `f3302a9`, not pushed.** The four
      drifter entries were the only tyres in any level file. The cargo truck sheds crates and bales, half
      and half (it was half crates, a quarter bales, a quarter tyres: the tyre was the light one, so shed
      cargo hurts more on average). The kind is out of the obstacle table, its hitbox and model, and so
      out of the editor's pickers. Tyres thrown by explosions stay. Levels, schema, bundle, hazards, cargo,
      traffic-quirks, descriptions, road-card and replay checks pass; ghost probes deliver; no clock moved.
      Not seen. Left behind: gaps of 378 m (Toy Room 322-700), 490 m (Leaks 3490-3980), 612 m (Tranquility
      Base 288-900) and 490 m (Favela Heights 1330-1820), being filled on `delivery-gapfill` with fixed
      gambles the game has. Also there: seeding `.gimmicks3-check.mjs`, which fails now and then on three
      unrelated lines (the bus at the low bridge, a semi in the crosswind, a van at the shade).
- [~] A moving black disc on the later numbered levels (owner, 10-Oct evening): "I don't know what this is and
      I never asked for it. It's too hard to spot." Identified, about 80% sure, from the code and a headless
      run (no picture): a loose TYRE used as a drifter, a flat near-black ring 1 m across
      (`render/obstacleModels.js:43`), on Toy Room 520-720, Twenty Thousand Leaks 3630-3870, Tranquility Base
      600-840 and Favela Heights 1506-1656; put there by the level agents, asked for nowhere. Being taken out
      of those four levels on branch `delivery-tyres` (nothing put in its place). Second most likely, if it
      did not really move: potholes. **Widened by the owner: "Remove tyres as obstacles entirely. They are
      hard to read."** So also: no tyre in any level file (a fixed one a stretch was built round becomes a
      cone or barrier), out of the cargo truck's load, and the kind itself out of the obstacle tables, the
      schema, the editor and the reference pages. Tyres thrown by explosions (an effect) stay.
- [x] Ice and burst mains (owner, 10-Oct evening): "lower the braking efficacy AND reduce the lane changing
      efficacy." `1fdf98a`, merged into `main` as `8aedfc9`, not pushed. Found: both ALREADY cut the brakes to
      35% and the steering's response to 30%; braking 30 to 10 m/s takes 20 m dry and 57 m on ice, unchanged.
      New: `laneSpeed: 0.55` (a lane change takes 1.02 s on ice; it was 0.67 s; 0.47 s dry) and mains water
      has its own three numbers (`CONFIG.waterMain`), equal to ice's for now. Nothing exempts a ghost. Both
      burst-main systems (audit C1) get the water numbers: the undrawn one is an invisible patch that is now
      also slower to steer out of. Hazards (13 new assertions), levels, schema, bundle, gimmicks3, pursuit,
      traffic-quirks, water and replay checks pass on the branch; the clocks of five icy levels did not
      move. Not felt by hand. For the owner: say if the brakes should be weaker still (one number each).
- [~] In progress, evening of 10-Oct (six agents; the orchestrator edits this list, merges and briefs only):
      the screenshot script's fix (main checkout); the tyres out (`delivery-tyres`); the drawbridge and the
      tube's struts (`delivery-visfix`); the reference pages' models scrolling with their tiles and the live
      3D car, M5 (`delivery-menu3d`); the wrong-way card's headlights, the level card on a phone and M4's
      code (`delivery-mobile`); batch F's second levels without pictures (`delivery-themes-f`).
- [ ] Sea bed theme (owner, 10-Oct evening): "The struts in the underwater tunnels are exactly at the height
      of the camera." The glass tube's struts on Twenty Thousand Leaks (theme `seabed`, level 33; Seaquake on
      `delivery-themes-e` shares the theme) cross the picture at the chase camera's eye level and hide the
      road ahead. To do: move or reshape them so the view down the road is clear (higher ribs, or only above
      the camera), checked in stills from the chase camera on straights, bends and descents, and in
      `drive: left`. Waits on the screenshot script's fix for its pictures.

## Still more cargo: 20 ideas (draft, not assigned)

Drafted by the orchestrator on 10-Oct at the owner's request ("I LOVE the delivery cargo ideas. Could you
draft 20 more"). None is built. The game has 50 now (C1 to C40 above are built, on top of the first ten).

The owner's new theme for Evil cargo, in their words: "malicious deliveries, like a crate of lawyers where
you only see their hands holding a briefcase. They flail around and documents fly when agitated." So these
are not monsters or bombs: they are deliveries that are bad news for whoever receives them, and mostly people
or paperwork seen only in part: hands, a hat, a megaphone poking out of a box.

### Evil: 14 malicious deliveries, three states each

| # | Item | Calm | Agitated (half the clock left) | Furious (a fifth left) |
|---|---|---|---|---|
| C41 | Crate of lawyers (the owner's) | A slatted crate; three pairs of hands in suit cuffs hold briefcases out through the slats | The hands flail, briefcases bang on the slats, documents start to fly | Briefcases burst open, a blizzard of paper, one hand waving a writ, a gavel hammering on the lid |
| C42 | Box of telemarketers | A cardboard box with headset microphones poking out, a murmur | Hands thrust phone handsets out of the flaps, cords tangling | A forest of ringing phones on springing cords, speech bubbles of "LIMITED OFFER" |
| C43 | Sack of tax inspectors | A mail sack with a bowler hat on top and a calculator tape trailing out | Arms out with clipboards and magnifying glasses, the tape spooling | Rubber stamps hammering "AUDIT" on everything in reach, red tape flying in loops |
| C44 | Crate of bailiffs | A crate with a clipboard chained to it and one sticker: SEIZED | Hands reach out slapping SEIZED stickers on the crate itself | Stickers on everything, a hand dragging the customer's garden gnome into the crate |
| C45 | The in-laws' luggage | A neat stack of floral suitcases | Suitcases bulge; knitting needles, slippers and a framed photo poke out | Burst open: a rocking chair unfolds, a finger wags from behind a newspaper |
| C46 | Marching band in a box | A drum-sized hatbox, a faint oompah | A trombone slide shoots in and out of the side, cymbals clap at the lid | The lid off: tuba bell, drumsticks, a twirling baton, notes pouring out |
| C47 | Parking wardens in a van-shaped box | A tiny box with a peaked cap resting on it | A hand out of each side writing tickets | Tickets fired like confetti, a wheel clamp snapping at the air |
| C48 | Chain letter | One envelope with a wax seal | It has become five, fanned out, shuffling | Dozens orbiting in a swarm, each sprouting another |
| C49 | Glitter bomb | A cheerful gift tube with a bow | Shaking, puffs of glitter at the seams | Erupting like a fountain, glitter settling on the screen's corner |
| C50 | Recorder class | A school satchel with six recorders sticking out | The recorders bob, sour notes drift off | All six shrieking, notes in jagged red, the satchel vibrating across the floor |
| C51 | Crate of consultants | A crate labelled SYNERGY; a laser pointer's dot wanders about | Hands push out flip-charts and sticky notes | Sticky notes plastered over the crate, a pie chart spinning above it, an invoice unrolling |
| C52 | Door-to-door salesman's case | A sample case, shut | The lid opens a crack: a foot wedges it, a hand offers a brush | Wide open: brushes, encyclopaedias and a vacuum hose spilling, the foot tapping |
| C53 | The surprise party | A big plain box that says nothing | It whispers and giggles; a party hat pokes up and ducks | Hands burst out with streamers and a cake, a banner unrolls: SURPRISE |
| C54 | Subpoena | A single long scroll, rolled and sealed | Unrolling by itself, growing | It has coiled round the crate like a snake, the seal for a head, still unrolling |

### Good: 6 more, ordinary and kind

| # | Item | Idle animation |
|---|---|---|
| C55 | Thank-you casserole | A dish under a tea towel; the lid lifts on the steam and settles |
| C56 | Box of kittens | Ears and one paw over the rim; a paw bats at a dangling string |
| C57 | Hand-knitted jumper | Folded on a hanger with one long sleeve; a ball of wool rolls back and forth |
| C58 | Returned library books | A strapped stack; the top one's pages riffle and a bookmark waves |
| C59 | New neighbour's fruit basket | The fruit shuffles; a pineapple's crown sways |
| C60 | Grandad's repaired radio | A wooden wireless; the dial glows, the needle sweeps, a note floats off |

### Notes for whoever builds them

- **How the malicious ones should read:** the comedy is in what is kept out of sight. Show only hands, hats,
  props and paper; never a whole person. Calm is a plain container with one tell; agitated is hands and
  props coming out; furious is the container overwhelmed. Paper, tickets, stickers, notes and glitter are
  the particles, as sparks and bees are for the existing ones.
- **At the kerb**, a furious malicious delivery should do its thing to the customer's doorstep: the bailiffs
  seize the gnome, the wardens ticket the player's own car, the surprise party goes off.
- **Easiest first:** chain letter, glitter bomb, subpoena, recorder class (no hands to model). The hands are
  one shared piece (a cuffed hand that can hold a prop and wave): build it once for C41, C42, C43, C44, C47,
  C51, C52, C53.
- **Pairs for levels:** casserole and in-laws (Suburbia); library books and tax inspectors (Canberra);
  kittens and telemarketers (The Hood); radio and marching band (Christmas Eve); fruit basket and
  door-to-door salesman (Market Town); jumper and surprise party (Back Roads).
- With these the game would have 70: 31 Good and 39 Evil.
