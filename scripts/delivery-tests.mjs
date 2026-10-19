// Runs Delivery Racer's tests by group, so an agent runs the set that is relevant to what it changed and not the lot.
//   node scripts/delivery-tests.mjs --list                  the groups: what each covers, how long it takes, which are heavy
//   node scripts/delivery-tests.mjs --group words,tiers      run those groups (a heavy one takes a heavy lock first, see below)
//   node scripts/delivery-tests.mjs --changed                the groups for the files changed against main (and in the working tree), run
//   node scripts/delivery-tests.mjs --changed --dry          ...only said, not run (which groups, which levels)
//   node scripts/delivery-tests.mjs --fast                   every light group (a few minutes in all)
//   node scripts/delivery-tests.mjs --group smoke-levels --levels=quarry-run,toys   the smoke's per-level checks for those levels
// Add --dry to any of them to see what would run. Exit code 1 if any test failed. See src/delivery/TESTS.md.
//
// Heavy tests (a minute or more and a lot of memory: the quick smoke, the replay and ideas checks, the level lists) take one of the
// two heavy locks (Temp/delivery-heavy.lock, Temp/delivery-heavy-2.lock; a directory made atomically) so that no more than two run
// at once across all agents; the runner waits for a free one and removes it when the test ends. A lock older than 25 minutes is
// taken to be left behind and removed. --no-lock skips this (only if nothing else is running).
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmdirSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const t = (file, extra = {}) => ({ file: 'scripts/' + file, ...extra });

// name: what it covers, tests (file, args, heavy), and `files`: the changed files (regular expressions, from the repo root) that
// call for it. `seconds`: about how long the group takes alone on this machine.
const GROUPS = {
  words: {
    about: 'The words: level names and descriptions, the per-kind words files, messages, the cards listing what is on a road',
    seconds: 85,
    tests: [t('.words-check.mjs'), t('.descriptions-check.mjs'), t('.hud-check.mjs'), t('.roadcard-check.mjs')],
    files: [/levelText|Text\.json|words\.js|messages|levelinfo|gimmickspage|poweruppage|cargopage/],
  },
  levels: {
    about: 'Level data: the schema, every level builds with no problems, the Driving Lesson (its lessons, a Commuter delivers it), lapped levels close their loop, every import resolves, the Concept Strike\'s levels timed in its cars, tier traffic (.tiertraffic-check: a tiered level\'s traffic only exclusive kinds and garage cars of its tier and below, the kind table complete, never empty, the untiered levels untouched; about 10 min), the level tools (level-clocks, obstacle-audit) driving off-tier levels in the reference car (.level-clocks-check)',
    seconds: 735,
    tests: [t('.schema-check.mjs'), t('.loop-check.mjs'), t('.bundle-check.mjs'), t('.merge-cross-check.mjs'), t('delivery-levels-check.mjs', { heavy: true }), t('tiers.mjs', { args: ['check'] }), t('.strike-levels-check.mjs'), t('.tiertraffic-check.mjs', { heavy: true }), t('.level-clocks-check.mjs', { heavy: true }), t('.tutorial-check.mjs')],
    files: [/src\/delivery\/levels\//, /levels\.js$/, /events\.json/, /levelSchema|track\.js|physics\.js|editor/, /tiers\.json/, /lessoncue/, /tiertraffic|traffic\.js/],
  },
  'smoke-levels': {
    about: 'The smoke test\'s per-level section only, for the levels named with --levels=id,id (with --changed, the levels whose files changed): '
      + 'hills, obstacles and what hitting each costs, drifters, tractors, shoulders, level problems. Seconds.',
    seconds: 15,
    tests: [t('delivery-smoke.mjs', { args: ['--quick'], levels: true })],
    files: [/src\/delivery\/levels\/.*\.json$/],
  },
  tiers: {
    about: 'Level tiers and progression: what opens and when, the car rule (a tier, a level\'s own list, a car lock), events (their times and rewards), labels, medals, saves, milestones, card packs (pools, odds, awards, the save), the Shop (its offers, buying), the showroom\'s cards (and the cars hidden until available: cars.js hideUnlessAvailable), where a car\'s key and blueprints come from (carsources.js), the Blue Star and earned cars\' figures, who a touch belongs to (the stick in a run, the screens else), the first visit\'s device defaults, Verbosity and the one-pedal controls (.device-defaults-check: CHECKLIST 468, 469)',
    seconds: 110,
    tests: [t('.tiers-check.mjs'), t('.levelrules-check.mjs'), t('.events-check.mjs'), t('.hunt-check.mjs'), t('.earned-check.mjs'), t('.balance-check.mjs'), t('.save-check.mjs'), t('.unlockall-check.mjs'), t('.milestones-check.mjs'), t('.packs-check.mjs'), t('.poseassign-check.mjs'), t('.shop-check.mjs'), t('.jimshop-check.mjs'), t('.showroom-check.mjs'), t('.hidden-cars-check.mjs'), t('.carsources-check.mjs'), t('.carsources-dom-check.mjs'), t('.nav-check.mjs'), t('.hiddenlevels-check.mjs'), t('.hidden-car-check.mjs'), t('.ridenudge-check.mjs'), t('.featuregates-check.mjs'), t('.touch-check.mjs'), t('.device-defaults-check.mjs'), t('.extras-hit-check.mjs'), t('.lite-check.mjs'), t('.packcar-check.mjs')],
    files: [/tiers|progress\.js|milestones|menus|menu2|garage|cars\.js|levelSchema|events|packs|ecu|shop|jimshop|showroom|carsources|nav\.js|input\.js|hiddenlevels|hunt|rides|ridenudge|featuregates|progressui|poseassign|carposes/],
  },
  cars: {
    about: 'The cars: traits, the tank, the ideas as cars (43 placeholders), mystery effects on the Super cars, the auto brake strength, the lane-change scrub (held flat out against off); the ECUs (ecu.js, ecus.json: the ladder, equal steps, respawn times, key and blueprint unlocking, the save, old saves, replays at an ECU)',
    seconds: 205,
    tests: [t('.traits-check.mjs'), t('.tank-check.mjs'), t('.mysteries-check.mjs'), t('.autobrake-check.mjs'), t('.lanescrub-check.mjs'), t('.ideas-check.mjs', { heavy: true }), t('.ecu-check.mjs', { heavy: true })],
    files: [/cars\.js|ideas\.js|carText|player\.js|ecu\.js|ecus\.json|progress\.js|replay\.js/],
  },
  cargo: {
    about: 'Cargo and the delivery at the kerb: every level\'s item, the Evil thresholds, the ending',
    seconds: 20,
    tests: [t('.cargo-check.mjs')],
    files: [/cargo|delivery\.js|packages/],
  },
  gimmicks: {
    about: 'The gimmicks: Gimmick Road 2 and 3 (hazards, gambles, crests; no pickup collected in the air: .airpickup-check, CHECKLIST 470), the slow pads (.slowpad-check: Slow Pad Lab, the drain per car class held and coasting, the floor, turbo / tank / ghost / boost, the reports, every skin built), roadworks diversions, the metro (Metro Run), gravel, police pursuit, radiation, the UFO strike, traffic with quirks',
    seconds: 200,
    tests: [t('.hazards-check.mjs'), t('.airpickup-check.mjs'), t('.tunneljunction-check.mjs'), t('.lanegimmicks-check.mjs'), t('.slowpad-check.mjs'), t('.roadworks-check.mjs'), t('.metro-check.mjs'), t('.gimmicks3-check.mjs'), t('.gravel-check.mjs'), t('.pursuit-check.mjs'), t('.radiation-check.mjs'), t('.ufo-check.mjs'), t('.traffic-quirks-check.mjs')],
    files: [/hazards|gambles|pickups\.js|gimmicks\.js|gravel|pursuit|radiation|ufostrike|crossing|bullettrain|police|slowpads|slow-pad/],
  },
  obstacles: {
    about: 'Obstacles, pickups and targets: the themes\' own obstacles, items on the shoulders, TANK RAGE targets, dents, the animals\' idle and gait animation (.animals-anim-check: rest as built, moving, back to rest, still paused, not in step; CHECKLIST 514)',
    seconds: 40,
    tests: [t('.obstacles-check.mjs'), t('.shoulder-items-check.mjs'), t('.targets-check.mjs'), t('.dents-check.mjs'), t('.animals-anim-check.mjs')],
    files: [/themes\.js|collision\.js|pickups\.js|powerups\.js|obstacleText|pickupText|dents|obstacleModels|animalanim/],
  },
  water: {
    about: 'The water stages on the amphibious levels: the amphibious car, boats, traffic at the water\'s edge, the amphibious tank',
    seconds: 45,
    tests: [t('.water-check.mjs')],
    files: [/water\.js|amphib|slipway|harbour|flood|ford|fjord/],
  },
  render: {
    about: 'Drawing, without a browser: the GIANT\'s silence (.giantsound-check: a 12 s giant through piles of traffic, no footstep or crush sound, every crushed car still drawn, other sounds untouched; render-only; CHECKLIST 386); the shared model views (a stand-in renderer), dents, the flank decal prototype (.decal-zones-check: its zone table well formed, nothing added without ?decaltest, with it one mesh a car within budget, the number reading on both flanks, hidden in a blackout; CHECKLIST 414), the car keys (the three models, the key card, the key cards\' pre-rendered PNGs in keyshots/), the showroom landing\'s suspension (every car\'s wheels found and kept on the floor, its body sprung), the model inspector (every idea car built and its triangles counted); the model editor\'s Mirror mode and window panes (.editor-mirror-check: partners found by shape, a mirrored move, cabinGlass panes, a glass edit changes one window only, the plain build unchanged); the model editor\'s SHAPES (.shape-edits-check: every car built with its outlines recorded is the plain build, an outline edit is a build input changing only its mesh, mirror partners and a mirrored edit, the plain cache untouched, the game reads a patch file\'s shapes, a part edit and a shape edit together; --bake adds a dry bake-shapes on the Hearse); GLASS = WINDOW (.glass-window-check: render/glassnames.js, either spelling one key; every see-through part of every car a window part with panes, hand-built ones too; an edit keyed \'door glass\' / \'rear glass\' / \'windshield\' builds what \'door window\' / \'rear window\' / \'windscreen\' builds on every cabinGlass car, one cache entry; a `windows` table read as `glass`; the tools read the rule; the survey misses nothing; --base: every car and old-spelling trial patches vertex for vertex against the code before); the model editor\'s WINDOW CORNERS (.window-corners-check: every cabinGlass car\'s side windows\' corners named once as drawn, front-top / rear-top / rear-bottom / front-bottom, +z the nose; a nudge by its step, a screen\'s along its pillar; a nudged corner stored as \'door window\' builds both flanks; render/panecorners.js outside the fingerprint; in headless Chromium as a phone: numbered named handles, a tap 17 px off a corner picks it and 30 px off none, 44 px nudges, the roof line stopping a nudge said, Reset corner, Undo, a touch drag read out live, Mirror off stores one flank, the windscreen\'s top on its pillar; CHECKLIST 336); ONE PANE edited on its own (.window-edit-check: on three cars with a windscreen part of its own and one with merged glass, a pane moved and turned by value, undone, floated and snapped back to the body under 1 mm, saved and read back by the game, Evil and Super the same, a cabinGlass side pane mirrored; in headless Chromium as a phone: picked from the Windows row, the gizmo on the pane, typed, Undo, Snap, kept over a reload; CHECKLIST 462); a pane\'s CONTOUR (.window-contour-check: Commuter / Sportscompact / Sportscar windscreens and Hot Rod / Pick-Up rear windows bent onto the body, measured on the built mesh closer than Snap, the bend entering no body face, a whole sheet, the Kei Roadster\'s free screen turned 8 degrees at most, saved v 2 and read back by the game, Evil, Super, Undo, Reset, an old v 1 entry, Mirror, the runs after a bent pane in one mesh; in headless Chromium as a phone: Contour, its line, Undo, Redo, Reset; CHECKLIST 474); the showroom\'s turning key card (.keyspin-check: its source, then in headless Chromium if one is found: a blacked-out key drawn black only, the showroom\'s key card live and stopped); the menu on a phone (.phone-menu-check: in headless Chromium, six phone sizes upright and on their side, the Career, Races and Events tabs and the two event cards, with and without the address bar: the menu no taller than the screen, START, the strip and the build tag on it and on top; the desktop and tablet menu as before; the key unlock cinematic\'s key and fob never snap (.keypose-check: render/keypose.js sampled every 0.01 s); the Cosmetics screen\'s tabs (.cosmetics-tabs-check: only the slots a car supports and that have items, no Locked / Coming later, the open tab falling back, ?cosmetics=all shows 8); the prop bounds data, tags and models (.propanchors-check, .proptag-check, .propmodels-check: CHECKLIST 302); the model editor\'s Placements written into the build (.placements-bake-check: a row written, read back by fitProp, kept by the generator, undone; the files put back); the loadout signature and the stock pack pictures (.loadout-key-check: render/loadout.js loadoutKey moves with every cosmetic, the still cache keys dressed pictures by it and stock ones apart in Good, every pack / Shop / blueprint-card call site draws stock); the city\'s cost (.city-budget-check: every level drawn as the city laid out headless, its meshes, instances, triangles in sight and its texture held to a budget, CHECKLIST 323); the per-car loadout (.loadout-store-check: render/loadoutstore.js, a car\'s own over the default, the old global keys migrated as the default, Reset car, Copy to all, garbage, no storage, noSave, every car resolves); the steelworks (.steelworks-check: the theme and its two hidden levels, its obstacles hit, its scenery out of the driving area and over the camera, its halls\' ceilings, its cost held to a budget); the Las Vegas Strip (.vegas-check: its two hidden levels build with their gimmicks and cargo, its own obstacles have their kinds\' boxes and costs and collide, cash in rows; its scenery laid out headless on them and on five levels drawn as the Strip keeps off the road and out of bridges\', tunnels\', crossings\' and fords\' clearings, and its meshes, instances, triangles in sight and texture held to a budget); the alpine pass (.alpine-check: its theme, level, obstacles, scenery clear of the roads, the camera, its cost); the level loading screen (.loadscreen-check: render/loadscreen.js out of the replay fingerprint and imported first; in headless Chromium, stub GL: a slowed staged start shows the level\'s name and a bar going forward, then the run on, unpaused, keys reaching it, the load log\'s phases; a restart and a load under 300 ms show no screen); the car stage on the start screen\'s car card (.carstage-check: every theme builds a stage or falls back, the fallback chain, ?stage=off, its cost held to a budget, CHECKLIST 347); the underglow cosmetic (.underglow-check: every look one flat planted mesh under the sample cars, the Super glow swapped, blackout, store migration, loadout key, allocation-free animation, the Glow tab and its exclusions, outside the replay fingerprint); the ice patches (.icepatch-check: render/icepatch.js, one geometry per level, triangles to a budget, the same seed the same outline, the sheet on the road over bends and crests, covering its slippery part); the KILL EFFECTS (.killfx-more-check (CHECKLIST 426): the eight more kill effects registered and shipped, 200 spawns each under the caps with nothing growing and nothing left in the scene after, the engine\'s turn / jelly / topple fields; .killfx-check: every effect small / big / shell / package hit and its trail spawn, their cost, 200 explosions a second under the caps, no growth over 1000, Classic call for call main\'s code, the choice per car over the default with Classic for absent / unknown, every explode of a headless run in the chosen effect, the logic hash the merge-base\'s; CHECKLIST 405); the rims (.rims-check: no rim named a spinner, every design turns with the car by distance over radius, still when stopped, idling on show; blade3 / twinspin still resolve; the Pumpkin and Candy cane on a hatch, a truck, a sports car and a bus: tagged children of their tyres, shared geometry and material, no extra draw calls, no z-fight pair; CHECKLIST 398; since CHECKLIST 399 the spinners are their own kind again, at a fixed pace); the tyre treads and the three-part wheel set (.treads-check: five designs under 300 triangles a tyre on a hatch, a truck, a sports car, a coach and the six-wheeler, tagged children of their tyres, shared, no z-fight; a tread turns with its rim by distance over radius, clamped and blurred by its pitch, still when stopped, idling on show; a spinner at its own pace; the directional ones point forward; tread, tyre colour and hub combine; ?wheeltread= / ?wheeltyre= / ?wheelhub=; every design on every rim-wearing car: no z-fight, no poke through bodywork over the tyre; CHECKLIST 399); the treads on the Cosmetics screen\'s path (.tread-screen-check: a car built stock with its suspension mid-bounce, as the screen\'s live model, changes with every design picked for it: tread meshes on its tyres with the design\'s own texture and geometry, the loadout key moving, Stock taking it off; footprints distinct per design; the Tread row hidden on Legendary, RIM_SKIP and tyre-less cars; presets, Reset car, Copy to all on live models; the cars that can show no tread listed; the replay fingerprint walks no render/ file; CHECKLIST 431); what trails the car in the air (.airtrail-check: the Sport on turbo off Gimmick Road 3\'s jam ramp and over its crest, placed as main.js places it: every frame in the air the turbo\'s exhaust at the car\'s tail at its height, none on the road under it, on the ground the road\'s + 0.6 as before; no gravel off the wheels in the air, damage smoke from the engine up there; outside the replay fingerprint; CHECKLIST 429); the tunnel themes (.tunnelthemes-check: render/tunneldress.js, the looks of the city, port, snow, Hong Kong and Tokyo tunnels, each for a theme with no tunnel of its own, built on their levels and on others, nothing in the lanes, through the ceiling or a wall, their cost per 100 m held to a budget, render-only; CHECKLIST 424); the DECAL cosmetic trial (.decalcosmetic-check: every design on the six zone-table cars one mesh with a piece on each flank inside the shared zones, 2 to 8 mm proud of the paint, scaled, the store and loadout key, the tab on zone cars only, crumpled by the dents, never Legendary, blackout and ghost hidden, the replay fingerprint unchanged); the CUTSCENES in the game (.cine-wire-check: in headless Chromium as a phone, on real saves: a car bought on the lot plays Crazey Jim\'s sale once, the save already stored, tap to the held end, tap to close; an ECU bought ECU UP, the max MAX ECU (not both); a pack\'s unlock after its reveal closes, the next pack after the cutscene; a key and two cars queued in order, never two at once; the Cutscenes setting On / Short / Off in localStorage only; the fade-only version on ?cinelite; no WebGL and the 12 s failsafe close and go on; none headless without ?cineplay or for Unlock everything; the replay fingerprint main\'s; CHECKLIST 438); every cosmetic where it belongs on every car, animated ones too (.dressing-bounds-check: each car animated to its hop and dressed in place as the Cosmetics screen does = dressed at build; at rest, mid, peak and trough every rim / ring within 1.15 x its tyre\'s own radius (a tread 1.25), plates / props / decals within the body, each part keeping its offset from its tyre or body; a car with its own glow shows exactly one with a Glow worn, its own back with None; CHECKLIST 458); the trails on their PARENT\'S GAME CLOCK (.trail-clock-check: render/gameclock.js stepGame as main.js steps; paused, the Sport on turbo, damaged and in gravel: no particle moves, comes or goes, the car frozen; at a time scale of 0.5 the turbo\'s, the smoke\'s and the gravel\'s particles go half as far a frame and the turbo trail behind the car is as long; each ?turbotrail= style the same and gone with the turbo; outside the replay fingerprint; CHECKLIST 456); the Stolen Maple Syrup (.syrup-check: no z-fight pair in any state or mid-change, its furious jet shown only furious, beside the tin and never in it, written in place; CHECKLIST 463)',
    seconds: 360,
    tests: [t('.modelviews-check.mjs'), t('.dents-check.mjs'), t('.decal-zones-check.mjs'), t('.keys-check.mjs'), t('.keyshots-check.mjs'), t('.suspension-check.mjs'), t('.inspector-check.mjs'), t('.mergemodel-check.mjs'), t('.keyspin-check.mjs'), t('.phone-menu-check.mjs'), t('.modelpatch-check.mjs'), t('.editor-mirror-check.mjs'), t('.shape-edits-check.mjs'), t('.glass-window-check.mjs'), t('.window-corners-check.mjs'), t('.window-edit-check.mjs'), t('.window-contour-check.mjs'), t('.placements-bake-check.mjs'), t('.keypose-check.mjs'), t('.propanchors-check.mjs'), t('.proptag-check.mjs'), t('.propmodels-check.mjs'), t('.propmodels-roof-check.mjs'), t('.propmodels-roof2-check.mjs'), t('.propmodels-roof3-check.mjs'), t('.propmodels-cargo-check.mjs'), t('.propmodels-cargo2-check.mjs'), t('.propmodels-wing-check.mjs'), t('.propmodels-wingclassic-check.mjs'), t('.propmodels-wing2-check.mjs'), t('.platetag-check.mjs'), t('.propcosmetic-ui-check.mjs'), t('.cosmetics-tabs-check.mjs'), t('.loadout-key-check.mjs'), t('.city-budget-check.mjs'), t('.loadout-store-check.mjs'), t('.steelworks-check.mjs'), t('.vegas-check.mjs'), t('.alpine-check.mjs'), t('.loadscreen-check.mjs'), t('.carstage-check.mjs'), t('.underglow-check.mjs'), t('.icepatch-check.mjs'), t('.windscreen-audit-check.mjs'), t('.killfx-check.mjs'), t('.killfx-more-check.mjs'), t('.rims-check.mjs'), t('.treads-check.mjs'), t('.tread-screen-check.mjs'), t('.airtrail-check.mjs'), t('.tunnelthemes-check.mjs'), t('.decalcosmetic-check.mjs'), t('.giantsound-check.mjs'), t('.cine-wire-check.mjs'), t('.dressing-bounds-check.mjs'), t('.trail-clock-check.mjs'), t('.syrup-check.mjs')],
    files: [/src\/delivery\/render\//, /\.css$/, /keyshots|keyModels|keys-png/, /mysteries\.js/],
    // (more tests and words for the group, on lines of their own: branches that add to the long lines above merge without a conflict)
    more: [[t('.editor-camera-check.mjs'), 'the model editor\'s camera in edit mode (.editor-camera-check: in headless Chromium as a touch phone, a touch tablet and a mouse, a part selected in Move / Rotate / Scale: one finger or the left button on the view turns the camera, two fingers or the right button pan, a pinch or the wheel zoom, a handle drag edits and never moves the camera, a second finger during it is ignored, the camera on again after, the view buttons hold, Fit / double tap / Reset, no page scroll, the toggles folded under More on a phone; CHECKLIST 430)'],
      [t('.killfx-sync-check.mjs'), 'a kill effect\'s landing and the car\'s explosion on one frame (.killfx-sync-check: every effect at 60 and 30 fps, in a run and in the Cosmetics preview, the package\'s landing, the car\'s explosion (some of it drawn that frame), its hiding and the sound on one frame, one impact time read by the flight and the impact, the preview the same as the run; CHECKLIST 457)'],
      [t('.ghost-model-check.mjs'), 'the best run\'s GHOST as its car\'s own model (.ghost-model-check: about 25 cars, box-sized, Super, Legendary, ideas, amphibious, tall and odd: the car\'s own model, never the box car unless it has none, one mesh in the shared pale see-through material, the stock model\'s triangles and bounds, nothing of the worn loadout, rebuilt only on a car or side change with the last geometry disposed and nothing left in the scene; CHECKLIST 459)'],
      [t('.events-ui-check.mjs'), 'the Events tab\'s modes (.events-ui-check: in headless Chromium as a 390x844 phone on a real save: a tab per event with an icon and one word, one filled, one event on the screen at a time, no level strip, the menu not scrolling, a tap and a swipe change the event, the tab remembered in localStorage only, the dot on a tab with something to play and none once done, Details folding the figures, the Comet Hunt\'s stepper; at 1100x650 the strip beside the card and the figures shown; the replay fingerprint main\'s; CHECKLIST 460)'],
      [t('.trail-slot-check.mjs'), 'the TRAIL cosmetic (.trail-slot-check: render/trailcosmetic.js, Classic free and the seven turbo trail styles earned and Uncommon; per car only, a store from before Classic, Reset car; equip takes one from the hand and taking it off gives it back; Unlock everything 999 of each; the Trail tab hidden on the Tank and the Saucer; the car\'s turbo wears its trail in a run, ?turbotrail= pins one; never under the car (Ghost power-up, blackout), none on the replay ghost; the Cosmetics preview of every style and lite behind a car standing still, in the showroom\'s scene, no renderer of its own; the replay fingerprint unchanged; CHECKLIST 466)'],
      [t('.preview-spin-check.mjs'), 'the PREVIEW SPIN RULE (.preview-spin-check: a car on show, every vehicle preview, has its rims, treads and self-turning tyres standing still and only a spinner turning; in a run rims and treads roll with the distance and a spinner keeps its pace; every preview builds through makeShowCar; CHECKLIST 466)'],
      [t('.stage-card-check.mjs'), 'the END-OF-STAGE CARD (.stage-card-check: render/stagecard.js in headless Chromium at 390x844, 844x390 and 1100x650, won, failed, late, busted, Evil, with rewards: fits the screen, no Look around / Next level, one primary (Continue on a delivery, Retry on a fail), Retry / Continue / Enter work; a playback\'s card on a menu level and on a hidden one (replays on hidden levels: STAGE-CARD.md); CHECKLIST 473)'],
      [t('.cargo-contain-check.mjs'), 'the CARGO RULES (.cargo-contain-check: every cargo model posed every 0.04 s in each state and through each change of state against its rules in render/cargoRules.js (keepOut by GJK, inside a container but at its exits, anchors: nothing floats); no flicker-class z-fight on any cargo item beyond the known ones; an item with no rules fails unless static or on the frozen pending list; CHECKLIST 465)'],
      [t('.zfight-check.mjs'), 'Z-FIGHTING on the CARS (.zfight-check: every car and its Super version, Good and Evil, built headless; render/zfight.js finds coplanar overlapping surfaces a camera outside the car could see together; none left but one-colour pairs lit alike, polygon-offset decals and the short allowlist in the script, each with its reason; about 80 s; CHECKLIST 510)'],
      [t('.replay-cam-check.mjs', { heavy: true }), 'the SCENERY FADE in the replay (orbit) camera (.replay-cam-check: in headless Chromium at 390x844, one level of each theme: never run with the chase camera in play; at a pose where set dressing blocks the line to the car the prop fades past 0.9 and nothing unfaded is left on the line, nothing away from the shot faded, the clusters tested a frame stated and bounded, all put back once the orbit is off, photo mode too; render-only, the replay fingerprint main\'s; about 20 min; CHECKLIST 472)']],
  },
  replay: {
    about: 'Determinism: every level replays exactly from its seeds (a run hashed each second, twice the same, once another); runs recorded and played back by replay.js (pause, rewind, refusals); kept and watched as the player has them (replaystore.js: the save untouched); the replay fingerprint (.replay-stable-check: adding a car or a level refuses no replay, changing the car, level or rules it used does; scripts/logic-hash.mjs). Heavy.',
    seconds: 420,
    tests: [t('.replay-check.mjs', { heavy: true }), t('.replay-record-check.mjs', { heavy: true }), t('.replay-store-check.mjs', { heavy: true }), t('.replay-stable-check.mjs', { heavy: true })],
    files: [/game\.js|physics\.js|traffic\.js|config\.js|player\.js|collision\.js|track\.js|replay\.js|replaystore\.js|replayui\.js|input\.js|util\.js|main\.js|random|logic-hash|vite\.config|cars\.js|ecus?\.js|levels\.js/],
  },
  'smoke-quick': {
    about: 'The whole quick smoke test: every level\'s checks (no full drive) and ~30 sections of mechanics (traffic, police, railway, tide, '
      + 'wreckage, trains, cars, powerups...). Seeded (20261008). Heavy.',
    seconds: 300,
    tests: [t('delivery-smoke.mjs', { args: ['--quick'], heavy: true })],
    files: [/game\.js|physics\.js|traffic\.js|config\.js|player\.js|collision\.js|track\.js|cars\.js|delivery-smoke/],
  },
};
// (a group is heavy if any test in it is; --fast is every group with none)
for (const g of Object.values(GROUPS)) for (const [test, words] of g.more || []) { g.tests.push(test); g.about += '; ' + words; }
for (const g of Object.values(GROUPS)) g.heavy = g.tests.some(x => x.heavy);

const args = process.argv.slice(2);
const flag = (name) => args.includes('--' + name);
const value = (name) => { const a = args.find(x => x.startsWith('--' + name + '=')); if (a) return a.slice(name.length + 3); const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean); } catch { return []; } };
const changedFiles = () => [...new Set([...git('diff', '--name-only', 'main...HEAD'), ...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '--others', '--exclude-standard')])];
const levelIdsOf = (files) => files.filter(f => /^src\/delivery\/levels\/[^/]+\.json$/.test(f)).map(f => { try { return JSON.parse(readFileSync(join(ROOT, f), 'utf8')).id; } catch { return null; } }).filter(Boolean);

// ---- the heavy locks
const LOCKS = [join(tmpdir(), 'delivery-heavy.lock'), join(tmpdir(), 'delivery-heavy-2.lock')];
let held = null;
const release = () => { if (held) { try { rmdirSync(held); } catch { /* (gone already) */ } held = null; } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
const acquire = async () => {
  for (let waited = 0; ; waited += 20) {
    for (const lock of LOCKS) {
      try { mkdirSync(lock); held = lock; return; } catch {
        try { if (Date.now() - statSync(lock).mtimeMs > 25 * 60 * 1000) { rmdirSync(lock); console.log('removed a lock older than 25 minutes: ' + lock); } } catch { /* (taken by someone else meanwhile) */ }
      }
    }
    if (waited % 60 === 0) console.log(`waiting for a heavy lock (${waited} s so far)...`);
    await new Promise(r => setTimeout(r, 20000));
  }
};

const run = (test, extra = []) => new Promise((resolve) => {
  const started = Date.now(), out = [];
  const child = spawn(process.execPath, [test.file, ...(test.args || []), ...extra], { cwd: ROOT });
  child.stdout.on('data', d => out.push(d)); child.stderr.on('data', d => out.push(d));
  child.on('close', (code) => {
    const text = Buffer.concat(out).toString();
    resolve({ code, seconds: (Date.now() - started) / 1000, fails: text.split('\n').filter(l => /FAIL|MISMATCH|^Error|Error:/.test(l)), text });
  });
});

const main = async () => {
  if (flag('list') || (!flag('group') && !flag('changed') && !flag('fast') && !value('group'))) {
    console.log('group'.padEnd(14) + 'time'.padEnd(8) + 'heavy  covers');
    for (const [name, g] of Object.entries(GROUPS)) console.log(name.padEnd(14) + ('~' + g.seconds + ' s').padEnd(8) + (g.heavy ? 'HEAVY  ' : 'light  ') + g.about);
    console.log('\ntests in each:');
    for (const [name, g] of Object.entries(GROUPS)) console.log('  ' + name.padEnd(13) + g.tests.map(x => x.file.replace('scripts/', '') + (x.heavy ? '*' : '')).join('  '));
    console.log('\n(* = heavy: waits for a heavy lock.) Run: --group <name,name> | --changed | --fast | --dry. Not in any group: scripts/shots.mjs (a browser), delivery-probe.mjs, level-clocks.mjs, tier-money.mjs (tools).');
    return 0;
  }
  let names = [], levelIds = (value('levels') || '').split(',').filter(Boolean);
  if (value('group')) names = value('group').split(',');
  if (flag('fast')) names = Object.keys(GROUPS).filter(n => !GROUPS[n].heavy);
  if (flag('changed')) {
    const files = changedFiles();
    names = Object.entries(GROUPS).filter(([, g]) => files.some(f => g.files.some(re => re.test(f)))).map(([n]) => n);
    if (!levelIds.length) levelIds = levelIdsOf(files);
    // (one level's file changed: its own checks, and the lists; not the whole smoke for that alone)
    if (levelIds.length && files.every(f => /^src\/delivery\/levels\/|levelText|tiers\.json/.test(f) || !/\.(js|mjs)$/.test(f))) names = names.filter(n => n !== 'smoke-quick' && n !== 'replay');
    console.log(`${files.length} changed file(s) -> groups: ${names.join(', ') || '(none)'}${levelIds.length ? '; levels: ' + levelIds.join(', ') : ''}`);
  }
  const bad = names.filter(n => !GROUPS[n]);
  if (bad.length) { console.log('no such group: ' + bad.join(', ') + ' (see --list)'); return 2; }
  if (!names.length) { console.log('nothing to run'); return 0; }
  // (smoke-levels without levels named would run the whole quick smoke: say so)
  if (names.includes('smoke-levels') && !levelIds.length) { console.log('smoke-levels needs --levels=id,id (or --changed with a level file changed)'); names = names.filter(n => n !== 'smoke-levels'); }
  if (names.includes('smoke-quick')) names = names.filter(n => n !== 'smoke-levels'); // (the quick smoke has them)
  const dry = flag('dry');
  let failed = 0;
  const seen = new Set(), results = [];
  for (const name of names) {
    for (const test of GROUPS[name].tests) {
      const extra = test.levels ? ['--levels=' + levelIds.join(',')] : [];
      const key = test.file + (test.args || []).join(' ') + extra.join(' ');
      if (seen.has(key)) continue; // (a test in two groups runs once)
      seen.add(key);
      const label = `${name}: ${test.file.replace('scripts/', '')} ${[...(test.args || []), ...extra].join(' ')}${test.heavy ? ' [heavy]' : ''}`;
      if (dry) { console.log('would run ' + label); continue; }
      if (test.heavy && !flag('no-lock')) await acquire();
      let r;
      try { r = await run(test, extra); } finally { if (test.heavy) release(); }
      const ok = r.code === 0;
      if (!ok) failed++;
      results.push({ label, ok, seconds: r.seconds });
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.seconds.toFixed(0).padStart(4)} s  ${label}`);
      if (!ok) console.log(r.fails.slice(0, 12).map(l => '       ' + l.slice(0, 200)).join('\n') || r.text.split('\n').slice(-8).map(l => '       ' + l).join('\n'));
    }
  }
  if (!dry) console.log(`\n${results.length} test script(s), ${failed} failed, ${results.reduce((n, r) => n + r.seconds, 0).toFixed(0)} s`);
  return failed ? 1 : 0;
};
main().then(code => process.exit(code));
