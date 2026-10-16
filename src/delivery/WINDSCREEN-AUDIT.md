# Windscreen and rear window audit (16-Oct)

The owner: "Are all front screens tagged properly on all cars? Agent audit." Branch `claude/cracked-glass` (from main v1.1.146), CHECKLIST 396.

**Measured, not guessed.** `node scripts/windscreen-audit.mjs` builds every vehicle the game builds headless (276 vehicles, 184 models: the
roster, supers, fillers, bespoke / event / earned / Legendary / secret / level cars, the car ideas and the traffic kinds, through
`render/showcar.js makeShowCar` as `scripts/audit-windows.mjs buildAll` does) and, for each, finds the windscreen and the rear window **the way
the model editor and the tools do** (`render/modelpatch.js extractParts`: cabinGlass's named panes, else a hand-built window's panels named by
`windowPanes`; the words through `render/glassnames.js`), then **measures the glass itself** (`render/screens.js paneFacing`: each triangle's
normal turned out of the cabin and summed by area into front / rear / side / roof / floor shares). Per vehicle it reports: windscreen found? rear
window found?, the candidate count, split or single, the tilt, the area, the centre (z / y relative to the car), mirrored (centred / one side),
whether it is addressable on its own at run time (a vertex range of cabinGlass's mesh, a vertex range of a hand-built mesh, or its own mesh),
merged with the side windows (the shares), stale or wrong names, hidden behind the body, and the reason when there is none.
CSV: `node scripts/windscreen-audit.mjs --csv=<file>`; the table below: `--md`; one vehicle with every pane: `node scripts/windscreen-audit.mjs <id>`.

## The verdicts

| verdict | means |
|---|---|
| found | ONE pane faces that way (at least 70 % of its area) and is named for it (`windscreen`, `windscreen 2` / `windscreen L R` for a second deck or a split screen, `rear window`), or a model tags it |
| wrong | the glass facing that way is a pane of its own but named otherwise (`roof window`, `window 1 R`...), or a pane so named faces another way |
| ambiguous | the glass facing that way is only part of a pane that faces several ways (a bubble canopy, a rounded glasshouse shared-vertex shape): no pane of its own to address |
| missing | glass faces that way but no window part or pane covers it |
| none | no visible glass faces that way (no glass at all, an open car, a van's solid back, or only glass hidden behind the body) |

## Totals: before and after the fix (the same measurement; only the names differ)

| | found | wrong | ambiguous | missing | none |
|---|---|---|---|---|---|
| windscreen, BEFORE (main's pane names) | 173 | 13 | 43 | 0 | 47 |
| windscreen, AFTER | **227** | **0** | 21 | 0 | 28 |
| rear window, BEFORE | 95 | 12 | 56 | 1 | 112 |
| rear window, AFTER | **158** | **0** | 13 | 1 | 104 |

Both windows found: 89 before, **155** after. A windscreen addressable as a pane of its own: 227 (26 cabinGlass, 201 hand-built). Split
windscreens 8, two-deck 14. No model faces -z (red lamps never ahead of white ones). The audit takes about 6 ms a vehicle (10 s in all).

Honest caveat: AFTER, the names come from the same facing measurement the audit uses, so "wrong 0" for hand-built windows is partly by
construction; what is independent is (a) cabinGlass's own names (26 cars) agree with the measurement, (b) the stills (CRACKED-GLASS-NOTES.md:
six cars' windscreens and rear windows picked right by eye), (c) the "hidden" and "ambiguous" lists below, which name what the rule cannot settle.

## What was wrong (BEFORE), the worst offenders

The hand-built panes were named by **where their box stood** (front of the car's middle = windscreen), never by which way they face, and a
glass box (a glasshouse: one box for the whole cabin's glass) was one pane:

- **Glasshouse boxes were one pane** (most "ambiguous" before): the Mini, Hot Hatch, Ute, Lifted Truck, Toybota, Nissank, Monster, Pony,
  Goddess, Midnight, Split Window, Hard Top, City EV, Coupe Cross, Yellow Cab, Safari, Two-Stroke... (their windscreen, rear window, flanks and
  top in ONE pane named `roof window` or `side windows`).
- **Split screens named as side windows**: Love Bus (`window 1 R` is half its windscreen), Blower and Sidecar (`side window R / L`), Classic GT.
- **Rear windows named windscreen or roof window** (in front of the car's middle, or raked): Sportscompact (`roof window`), Gullwing, Snake,
  Kei Roadster, Midsummer, Tin Snail, Food Truck, Hearse (`windscreen 2`), Swan Car, Earned GT / GT (`roof window 5`), Police Wagon (`window 4 R`).
- **Windscreens named roof window** (steeply raked): Tow Truck, Poly Truck, EV Saloon, Herald.
- **Reverse-rake rear window** (the Slant-Back Saloon's, an Ami's: it faces up and FORWARD): read as a second windscreen.
- **Glass outside every pane**: the Glass-Hatch Brake's full-glass hatch (two slopeGlass pieces merged into the cabinGlass mesh) has no pane
  at all (still "missing" after: see the hand list).
- **Hidden glass**: cab rear windows behind a box body (Post Van, Poly Truck, Ambulance, Road Sweeper, Cable Drum, Motorhome, Funeral Coach)
  were counted as rear windows though nobody can see them.

## What was fixed (shared helpers only; no model file edited; render / tools only)

- `render/screens.js` (new, pure): `paneFacing` (outward normals: up for a sloped face, away from the cabin's middle for an upright one, away
  from the pane's own middle for the faces of a glass VOLUME more than 8 cm across), `splitByFacing`, `cabinMiddle` / `zRefOf` (the cabin's
  middle along the car: the window part's own where it spans 40 cm or more, so a cab-forward lorry's rear window is behind it), `screenShares`
  (reverse rake), `paneHidden` (rays cast back to the pane from 6 m out, along its normal and level along the car: hidden when all five meet
  the body both ways).
- `render/modelpatch.js` `faceHandPanes` (called by `extractParts` before the names): every hand-built pane named by **which way it faces**;
  a pane facing several ways (a glasshouse box) **cut into per-face panes** (vertex runs: up to 16; a rounded shape with more is left whole);
  the **biggest** of each kind takes the plain name (`windscreen` is the car's windscreen; a hidden box face behind it is `windscreen 2`);
  half of a split screen is `windscreen L / R`; the underside of a glass box is `window underside`; a reverse-rake pane is a `rear window`;
  a model's tag `userData.window` wins. cabinGlass's panes are untouched (their names were right). The game draws nothing differently: pane
  names are read by the model editor and the tools only (`.editor-mirror-check`, `.modelpatch-check` and `.glass-window-check`'s pane checks pass).
- `scripts/.windscreen-audit-check.mjs` (render group candidate): the audit on all 276, no vehicle worse than `scripts/.windscreen-audit-baseline.json`,
  no wrong name, plus the crack overlay's checks.

## What "properly tagged" should mean (proposal)

**`userData.window = 'windscreen' | 'rear'`** on the glass mesh (hand-built) or **`window: 'windscreen' | 'rear'`** on the pane (cabinGlass's
`kind: 'screen'` panes are already tagged by their names `windscreen` / `rear window`), set at BUILD time by the builder, read first by
`faceHandPanes` and `render/cracks.js` (already wired: a tag wins over the measurement). A hand-built window should be its own mesh or its own
vertex run (not a face of a glasshouse box nor a rounded canopy shared with the flanks), outward-facing, and visible. Until then, the
measured rule above stands in, and a TABLE fallback (`{ carId: { windscreen: '<pane>', rear: '<pane>' | null } }`) is the cheap way to settle
the cars it cannot.

## Cars that need a hand tag or a look (not edited here)

- **Ambiguous (a rounded / shared-vertex canopy: no pane of its own; a tag cannot help without splitting the glass)**: rotary, evsaloon,
  bubble, jetcar, rocketfin, solarracer, horseshoe, fishbowl, sixteen, quadturbo, knifeedge, windsong, silvercomet, ufo / earned-ufo,
  centreseat, rallywedge, cigar, circuswagon (and the supers of rotary, evsaloon).
- **Missing**: glassbrake (the hatch: give its two slopeGlass pieces a pane, `window: 'rear'`).
- **Windscreen hidden or odd, LOOK**: hovercraft, boathauler, snailcamper, hotdog, traffic:ferry, coupecross (the ray test calls their
  front glass hidden behind the body); duckwagon (its front glass lies behind the cabin's middle and reads as a reverse-rake rear window);
  floatvan (only flat roof glass); herald (its windscreen at 20 % of the car's height: a tall part over it?); bathtub, mower (glass faces every way).
- **Rear window hidden behind the body** (right for a cab behind a box; LOOK for the others): postvan, polytruck, ambulance, roadsweeper,
  cabledrum, motorhome, funeralcoach (cab windows behind a body: right); cityev, yellowcab (looked: no rear glass shows from behind; right),
  classicgt, coupecross, teardrop, flyingcar, wedge, lmp / earned-lmp, gyrocar, getaway, pedalo, l-junker, finlandyacht (LOOK).
- **No rear glass at all** (vans, roadsters, open cars, lorries: 104 vehicles, mostly right): e.g. darkvan, dampervan, keitruck, hearse,
  snake, gullwing, keiroadster, moke, dunebuggy, foodtruck, mixer, tipper, wrecker, refuselorry, talltourer, tinsnail, armoured...
- **No windscreen, legitimately** (28): no glass at all: buggy, tank, dragster, farmtractor, moonrover, f1 / earned-f1, apc / earned-apc,
  amphibioustank, monowheel, dodgem, traffic tank / f1 / apc / dinghy / float (open cars, tanks, boats, a monowheel); the others above.

## The table (AFTER; `node scripts/windscreen-audit.mjs --md`)

| vehicle | group | windscreen | its pane | tilt | rear window | its pane | note |
|---|---|---|---|---|---|---|---|
| commuter (Commuter) | garage | found | windscreen [hand] | 53 | found | rear window [hand] |  |
| junker (Junker) | garage | found | windscreen [hand] | 30 | found | rear window 2 [hand] | 2 decks |
| darkvan (Darkvan) | garage | found | windscreen [hand] | 37 | none | - |  |
| postvan (Post Van) | garage | found | windscreen [hand] | 30 | none | - |  |
| keitruck (Kei Truck) | garage | found | windscreen [hand] | 0 | none | - |  |
| mini (Mini) | garage | found | windscreen [hand] | 38 | found | rear window [hand] |  |
| lovebus (Love Bus) | garage | found | windscreen R [hand] | 10 | found | rear window [hand] | split screen |
| wagon (Family Wagon) | garage | found | windscreen [hand] | 44 | found | rear window [hand] |  |
| sport (Sportscompact) | garage | found | windscreen [hand] | 64 | found | rear window [hand] |  |
| lowrider (Lowrider) | garage | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| hothatch (Hot Hatch) | garage | found | windscreen [hand] | 56 | found | rear window [hand] |  |
| ute (Ute) | garage | found | windscreen [hand] | 54 | found | rear window [hand] |  |
| buggy (Beach Buggy) | garage | none | - | - | none | - | an open car / cockpit; no glass at all |
| liftedtruck (Lifted Truck) | garage | found | windscreen [hand] | 50 | found | rear window 2 [hand] |  |
| hearse (Hearse) | garage | found | windscreen [hand] | 49 | none | - |  |
| minivan (Minivan) | garage | found | windscreen [hand] | 48 | found | rear window [hand] |  |
| pickup (Pick-Up) | garage | found | windscreen [hand] | 38 | found | rear window [hand] | 2 decks |
| hotrod (Hot Rod) | garage | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| sleeper (Sleeper Wagon) | garage | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| rally (Rally Car) | garage | found | windscreen [hand] | 56 | found | rear window [hand] |  |
| towtruck (Tow Truck) | garage | found | windscreen [hand] | 73 | found | rear window [hand] |  |
| rotary (Rotary Coupe) | garage | ambiguous | side windows [hand] | 90 | none | - | front: the front-facing glass is part of "side windows" (front 14%, side 18%, roof 17%, floor 40%): no pane of its own |
| taxi (Taxi) | garage | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| suv (SUV) | garage | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| miata (Sportscar) | garage | found | windscreen [hand] | 62 | found | rear window [hand] |  |
| gullwing (Stainless Gullwing) | garage | found | windscreen [hand] | 62 | none | - |  |
| rearengine (Rear-Engine Coupe) | garage | found | windscreen [hand] | 49 | found | rear window 2 [hand] |  |
| snake (Snake Roadster) | garage | found | windscreen [hand] | 29 | none | - |  |
| polytruck (Polygon Truck) | garage | found | windscreen [hand] | 73 | none | - |  |
| muscle (Muscle Car) | garage | found | windscreen [hand] | 47 | found | rear window [hand] |  |
| fullsize (Full-Size) | garage | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| evsaloon (EV Saloon) | garage | ambiguous | side windows [hand] | 1 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 14%, rear 12%, side 17%, roof 16%, floor 41%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 14%, rear 12%, side 17%, roof 16%, floor 41%): no pane of its own |
| superlowrider (Super Lowrider) | garage | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| classicgt (Classic GT) | garage | found | windscreen R [hand] | 0 | none | - | split screen |
| sixbysix (6x6) | garage | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| herald (Sailing Herald) | garage | found | windscreen [hand] | 70 | found | rear window [hand] |  |
| floatvan (Float Van) | garage | none | - | - | none | - | an open car / cockpit; no glass faces front (roof, side only) |
| toybota (Toybota) | garage | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| dampervan (Dampervan) | garage | found | windscreen [hand] | 0 | none | - |  |
| nissank (Nissank) | garage | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| tank (Tank) | garage | none | - | - | none | - | a tank; no glass at all |
| super-commuter (Super Commuter) | super | found | windscreen [hand] | 53 | found | rear window [hand] |  |
| super-junker (Super Junker) | super | found | windscreen [hand] | 30 | found | rear window 2 [hand] | 2 decks |
| super-darkvan (Super Darkvan) | super | found | windscreen [hand] | 37 | none | - |  |
| super-postvan (Super Post Van) | super | found | windscreen [hand] | 30 | none | - |  |
| super-keitruck (Super Kei Truck) | super | found | windscreen [hand] | 0 | none | - |  |
| super-mini (Super Mini) | super | found | windscreen [hand] | 38 | found | rear window [hand] |  |
| super-lovebus (Super Love Bus) | super | found | windscreen R [hand] | 10 | found | rear window [hand] | split screen; 2 decks |
| super-wagon (Super Family Wagon) | super | found | windscreen [hand] | 44 | found | rear window [hand] |  |
| super-sport (Super Sportscompact) | super | found | windscreen [hand] | 64 | found | rear window [hand] |  |
| super-lowrider (Super Lowrider) | super | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| super-hothatch (Super Hot Hatch) | super | found | windscreen [hand] | 56 | found | rear window [hand] |  |
| super-ute (Super Ute) | super | found | windscreen [hand] | 54 | found | rear window [hand] |  |
| super-buggy (Super Beach Buggy) | super | found | windscreen [hand] | 0 | none | - |  |
| super-liftedtruck (Super Lifted Truck) | super | found | windscreen [hand] | 50 | found | rear window 2 [hand] |  |
| super-hearse (Super Hearse) | super | found | windscreen [hand] | 49 | none | - |  |
| super-minivan (Super Minivan) | super | found | windscreen [hand] | 48 | found | rear window [hand] |  |
| super-pickup (Super Pick-Up) | super | found | windscreen [hand] | 38 | found | rear window [hand] | 2 decks |
| super-hotrod (Super Hot Rod) | super | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| super-sleeper (Super Sleeper Wagon) | super | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| super-rally (Super Rally Car) | super | found | windscreen [hand] | 56 | found | rear window [hand] |  |
| super-towtruck (Super Tow Truck) | super | found | windscreen [hand] | 73 | found | rear window [hand] |  |
| super-rotary (Super Rotary Coupe) | super | ambiguous | side windows [hand] | 90 | none | - | front: the front-facing glass is part of "side windows" (front 14%, side 18%, roof 17%, floor 40%): no pane of its own |
| super-taxi (Super Taxi) | super | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| super-suv (Super SUV) | super | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| super-miata (Super Sportscar) | super | found | windscreen [hand] | 62 | found | rear window [hand] |  |
| super-gullwing (Super Stainless Gullwing) | super | found | windscreen [hand] | 62 | none | - |  |
| super-rearengine (Super Rear-Engine Coupe) | super | found | windscreen [hand] | 49 | found | rear window 2 [hand] |  |
| super-snake (Super Snake Roadster) | super | found | windscreen [hand] | 29 | none | - |  |
| super-polytruck (Super Polygon Truck) | super | found | windscreen [hand] | 73 | none | - |  |
| super-muscle (Super Muscle Car) | super | found | windscreen [hand] | 47 | found | rear window [hand] |  |
| super-fullsize (Super Full-Size) | super | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| super-evsaloon (Super EV Saloon) | super | ambiguous | side windows [hand] | 1 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 14%, rear 12%, side 17%, roof 16%, floor 41%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 14%, rear 12%, side 17%, roof 16%, floor 41%): no pane of its own |
| super-superlowrider (Super Super Lowrider) | super | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| super-classicgt (Super Classic GT) | super | found | windscreen R [hand] | 0 | none | - | split screen |
| super-sixbysix (Super 6x6) | super | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| super-herald (Super Sailing Herald) | super | found | windscreen [hand] | 70 | found | rear window [hand] |  |
| super-floatvan (Super Float Van) | super | found | windscreen [hand] | 0 | none | - |  |
| super-toybota (Super Toybota) | super | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| super-dampervan (Super Dampervan) | super | found | windscreen [hand] | 0 | none | - |  |
| super-nissank (Super Nissank) | super | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| bubble (Bubble Car) | filler | ambiguous | side windows [hand] | 85 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 21%, rear 19%, side 39%, floor 15%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 21%, rear 19%, side 39%, floor 15%): no pane of its own |
| milkfloat (Milk Float) | filler | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| tuktuk (Tuk-Tuk) | filler | found | windscreen [hand] | -11 | none | - |  |
| woody (Woody Wagon) | filler | found | windscreen [hand] | 54 | found | rear window [hand] |  |
| pandacoupe (Panda Coupe) | filler | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| keiroadster (Kei Roadster) | filler | found | windscreen [hand] | 40 | none | - |  |
| fireengine (Fire Engine) | filler | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| fieldscout (Field Scout) | filler | found | windscreen [hand] | 0 | none | - |  |
| monster (Monster Truck) | filler | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| stately (Stately Saloon) | filler | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| teardrop (Teardrop Streamliner) | filler | found | windscreen [hand] | 44 | none | - |  |
| pony (Pony Car) | filler | found | windscreen [hand] | 50 | found | rear window [hand] |  |
| goddess (Goddess Saloon) | filler | found | windscreen [hand] | 49 | found | rear window [hand] |  |
| hardtop (Fifties Hardtop) | filler | found | windscreen [hand] | 47 | found | rear window [hand] |  |
| midnight (Midnight Coupe) | filler | found | windscreen [hand] | 52 | found | rear window [hand] |  |
| splitwindow (Split-Window Coupe) | filler | found | windscreen [hand] | 51 | found | rear window R [hand] |  |
| wedge (Wedge Supercar) | filler | found | windscreen [hand] | 62 | none | - |  |
| jetcar (Jet Land-Speed Car) | filler | ambiguous | side windows [hand] | 75 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 15%, rear 15%, side 49%, floor 15%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 15%, rear 15%, side 49%, floor 15%): no pane of its own |
| dragster (Slingshot Dragster) | filler | none | - | - | none | - | an open car / cockpit; no glass at all |
| flyingcar (Flying Car) | filler | found | windscreen [hand] | 58 | none | - |  |
| blower (Blower Tourer) | filler | found | windscreen R [hand] | 20 | none | - | split screen |
| coach (Highway Coach) | filler | found | windscreen [hand] | 38 | found | rear window [hand] | 3 decks |
| cityev (City EV) | filler | found | windscreen [hand] | 53 | none | - |  |
| coupecross (Coupe Crossover) | filler | none | - | - | none | - | unclassified: LOOK; only hidden glass faces front ("side windows", behind the body) |
| keivan (Kei Van) | filler | found | windscreen [cabin] | 33 | found | rear window [cabin] |  |
| supermini (Boxy Supermini) | filler | found | windscreen [cabin] | 41 | found | rear window [cabin] |  |
| wedgemicro (Wedge Microcar) | filler | found | windscreen [cabin] | 39 | found | rear window [cabin] |  |
| farmtractor (Farm Tractor) | filler | none | - | - | none | - | an open car / cockpit; no glass at all |
| minibus (Shuttle Minibus) | filler | found | windscreen [cabin] | 19 | found | rear window [cabin] |  |
| flatbed (Flatbed Truck) | filler | found | windscreen [cabin] | 30 | found | rear window [cabin] |  |
| moke (Utility Moke) | filler | found | windscreen [hand] | 7 | none | - |  |
| moorrover (Moor Rover) | filler | found | windscreen [cabin] | 26 | found | rear window [cabin] |  |
| sprinthatch (Sprint Hatch) | filler | found | windscreen [cabin] | 59 | found | rear window [cabin] |  |
| halftrack (Half-Track) | filler | found | windscreen [cabin] | 25 | none | - |  |
| cranelorry (Crane Lorry) | filler | found | windscreen [cabin] | 15 | found | rear window [cabin] |  |
| touringcar (Touring Car) | filler | found | windscreen [cabin] | 62 | found | rear window [cabin] |  |
| sporttruck (Sport Truck) | filler | found | windscreen [cabin] | 48 | found | rear window [cabin] |  |
| pixelev (Pixel EV) | filler | found | windscreen [cabin] | 57 | found | rear window [cabin] |  |
| autobahnestate (Autobahn Estate) | filler | found | windscreen [cabin] | 58 | found | rear window [cabin] |  |
| finlandyacht (Fin Land Yacht) | filler | found | windscreen [cabin] | 58 | found | rear window [cabin] |  |
| trophytruck (Trophy Truck) | filler | found | windscreen [cabin] | 49 | found | rear window [cabin] |  |
| hillclimb (Hill-Climb Special) | filler | found | windscreen [cabin] | 61 | found | rear window [cabin] |  |
| armouredlimo (Armoured Limo) | filler | found | windscreen [cabin] | 48 | found | rear window [cabin] |  |
| rocketfin (Rocket Fin Coupe) | bespoke | ambiguous | side windows 2 [hand] | -34 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows 2" (front 15%, rear 15%, side 50%, floor 14%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 15%, rear 15%, side 50%, floor 14%): no pane of its own; split screen |
| swancar (Swan Car) | bespoke | found | windscreen [hand] | 57 | found | rear window [hand] |  |
| solarracer (Solar Racer) | bespoke | ambiguous | side windows [hand] | -82 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 15%, rear 15%, side 58%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 15%, rear 15%, side 58%): no pane of its own |
| moonrover (Moon Rover) | bespoke | none | - | - | none | - | unclassified: LOOK; no glass at all |
| sixwheeler (Six-Wheel Supercar) | bespoke | found | windscreen [cabin] | 66 | found | rear window [cabin] |  |
| paddleduck (Paddle-Wheel Amphibian) | bespoke | found | windscreen [cabin] | 17 | found | rear window [cabin] |  |
| snocat (Snowcat) | bespoke | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| hotdog (Hot Dog Car) | bespoke | none | - | - | none | - | unclassified: LOOK; only hidden glass faces front ("windscreen", behind the body) |
| horseshoe (Horseshoe Hypercar) | bespoke | ambiguous | windscreen [hand] | 90 | ambiguous | rear window [hand] | front: the front-facing glass is part of "windscreen" (front 18%, side 17%, roof 14%, floor 41%): no pane of its own; rear: the rear-facing glass is part of "rear window" (front 15%, rear 29%, roof 49%): no pane of its own |
| fishbowl (Fishbowl Runabout) | bespoke | ambiguous | side windows [hand] | 65 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 14%, rear 17%, side 35%, floor 31%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 14%, rear 17%, side 35%, floor 31%): no pane of its own |
| midsummer (Midsummer Roadster) | bespoke | found | windscreen [hand] | 52 | none | - |  |
| sixteen (Sixteen-Cylinder Coupe) | bespoke | ambiguous | side windows [hand] | 0 | none | - | front: the front-facing glass is part of "side windows" (front 18%, side 21%, roof 16%, floor 38%): no pane of its own |
| quadturbo (Quad-Turbo Supercar) | bespoke | ambiguous | side windows [hand] | 90 | none | - | front: the front-facing glass is part of "side windows" (front 17%, side 18%, roof 14%, floor 41%): no pane of its own |
| knifeedge (Knife-Edge Supercar) | bespoke | ambiguous | windscreen [hand] | 90 | none | - | front: the front-facing glass is part of "windscreen" (front 23%, side 18%, roof 13%, floor 38%): no pane of its own |
| windsong (Wind-Song Racer) | bespoke | ambiguous | side windows [hand] | 90 | none | - | front: the front-facing glass is part of "side windows" (front 12%, side 41%, floor 32%): no pane of its own |
| silvercomet (Silver Comet) | event | ambiguous | side windows [hand] | 23 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 24%, rear 24%, side 35%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 24%, rear 24%, side 35%): no pane of its own |
| hellrod (Hell Rod) | earned | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| earned-ufo (Saucer) | earned | ambiguous | side windows [hand] | 90 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 27%, rear 27%, side 41%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 27%, rear 27%, side 41%): no pane of its own |
| earned-gt (GT Racer) | earned | found | windscreen [hand] | 63 | found | rear window [hand] |  |
| earned-jetboat (Land Jetboat) | earned | found | windscreen [hand] | 36 | found | rear window [hand] |  |
| earned-f1 (Road F1) | earned | none | - | - | none | - | an open car / cockpit; no glass at all |
| earned-lmp (Road Prototype) | earned | found | windscreen [hand] | 57 | none | - |  |
| courier (Courier Special) | earned | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| showdown (Showdown Muscle) | earned | found | windscreen [hand] | 47 | found | rear window [hand] |  |
| earned-apc (Road 8x8) | earned | none | - | - | none | - | unclassified: LOOK; no glass at all |
| l-commuter (Legendary Commuter) | legendary | found | windscreen [hand] | 53 | found | rear window [hand] |  |
| l-sport (Legendary Sportscompact) | legendary | found | windscreen [hand] | 64 | found | rear window [hand] |  |
| l-miata (Legendary Sportscar) | legendary | found | windscreen [hand] | 62 | found | rear window [hand] |  |
| l-lowrider (Legendary Lowrider) | legendary | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| l-wagon (Legendary Family Wagon) | legendary | found | windscreen [hand] | 44 | found | rear window [hand] |  |
| l-lovebus (Legendary Love Bus) | legendary | found | windscreen R [hand] | 10 | found | rear window [hand] | split screen |
| l-darkvan (Legendary Darkvan) | legendary | found | windscreen [hand] | 37 | none | - |  |
| l-hearse (Legendary Hearse) | legendary | found | windscreen [hand] | 49 | none | - |  |
| l-hotrod (Legendary Hot Rod) | legendary | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| l-minivan (Legendary Minivan) | legendary | found | windscreen [hand] | 48 | found | rear window [hand] |  |
| l-pickup (Legendary Pick-Up) | legendary | found | windscreen [hand] | 38 | found | rear window [hand] |  |
| l-junker (Legendary Junker) | legendary | found | windscreen [hand] | 30 | none | - | 2 decks |
| l-taxi (Legendary Taxi) | legendary | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| l-suv (Legendary SUV) | legendary | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| bus (City Bus) | secret | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| ufo (UFO) | level | ambiguous | side windows [hand] | 90 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 27%, rear 27%, side 41%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 27%, rear 27%, side 41%): no pane of its own |
| f1 (F1 Car) | level | none | - | - | none | - | an open car / cockpit; no glass at all |
| gt (GT Car) | level | found | windscreen [hand] | 63 | found | rear window [hand] |  |
| lmp (LMP Prototype) | level | found | windscreen [hand] | 57 | none | - |  |
| jetboat (Jetboat) | level | found | windscreen [hand] | 36 | found | rear window [hand] |  |
| apc (8x8) | level | none | - | - | none | - | unclassified: LOOK; no glass at all |
| amphibioustank (Amphibious Tank) | level | none | - | - | none | - | a boat / hovercraft; no glass at all |
| threewheeler (Three-Wheeler) | idea | found | windscreen [hand] | 42 | found | rear window [hand] |  |
| tinsnail (Tin Snail) | idea | found | windscreen [hand] | 14 | none | - |  |
| bug (People's Bug) | idea | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| twostroke (Two-Stroke Saloon) | idea | found | windscreen [hand] | 33 | found | rear window [hand] |  |
| brickestate (Brick Estate) | idea | found | windscreen [hand] | 54 | found | rear window [hand] |  |
| limo (Stretch Limo) | idea | found | windscreen [hand] | 58 | found | rear window [hand] |  |
| centreseat (Centre-Seat Hypercar) | idea | ambiguous | side windows [hand] | 23 | ambiguous | side windows [hand] | front: the front-facing glass is part of "side windows" (front 24%, rear 24%, side 35%): no pane of its own; rear: the rear-facing glass is part of "side windows" (front 24%, rear 24%, side 35%): no pane of its own |
| rallywedge (Rally Wedge) | idea | ambiguous | windscreen [hand] | 57 | none | - | front: the front-facing glass is part of "windscreen" (front 56%, side 44%): no pane of its own |
| safari (Safari Wagon) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| widetruck (Wide Truck) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| corrugated (Corrugated Van) | idea | found | windscreen [hand] | 0 | none | - |  |
| foodtruck (Food Truck) | idea | found | windscreen [hand] | 29 | none | - |  |
| motorhome (Motorhome) | idea | found | windscreen [hand] | 18 | none | - |  |
| schoolbus (School Bus) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| doubledecker (Double Decker) | idea | found | windscreen [hand] | 0 | found | rear window [hand] | 2 decks |
| funeralcoach (Funeral Coach) | idea | found | windscreen [hand] | 0 | none | - |  |
| golfcart (Golf Cart) | idea | found | windscreen [hand] | -7 | none | - |  |
| hovercraft (Hovercraft) | idea | none | - | - | found | rear window [hand] | a boat / hovercraft; only hidden glass faces front ("windscreen", behind the body) |
| steamwagon (Steam Wagon) | idea | found | windscreen [hand] | 9 | none | - |  |
| tipper (Tipper Truck) | idea | found | windscreen [hand] | 0 | none | - |  |
| dunebuggy (Dune Buggy) | idea | found | windscreen [hand] | 26 | none | - |  |
| creamvan (Ice-Cream Van) | idea | found | windscreen [hand] | 0 | none | - |  |
| yellowcab (Yellow Cab) | idea | found | windscreen [hand] | 0 | none | - |  |
| mixer (Cement Mixer) | idea | found | windscreen [hand] | 0 | none | - |  |
| wrecker (Wrecker) | idea | found | windscreen [hand] | 0 | none | - |  |
| policewagon (Police Wagon) | idea | found | windscreen [hand] | 0 | found | rear window R [hand] |  |
| camper (Camper Van) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| boathauler (Boat Hauler) | idea | none | - | - | found | rear window 2 [hand] | a boat / hovercraft; only hidden glass faces front ("windscreen", behind the body) |
| armoured (Armoured Van) | idea | found | windscreen [hand] | 0 | none | - |  |
| cigar (Cigar Racer) | idea | ambiguous | windscreen [hand] | 90 | ambiguous | windscreen [hand] | front: the front-facing glass is part of "windscreen" (front 25%, rear 25%, side 16%, roof 14%, floor 19%): no pane of its own; rear: the rear-facing glass is part of "windscreen" (front 25%, rear 25%, side 16%, roof 14%, floor 19%): no pane of its own |
| sidecar (Scooter and Sidecar) | idea | found | windscreen L [hand] | 29 | none | - |  |
| monowheel (Monowheel) | idea | none | - | - | none | - | a bike / rider vehicle; no glass at all |
| bathtub (Bathtub Racer) | idea | none | - | - | none | - | an open car / cockpit; no glass faces front (side, roof, front, rear only) |
| circuswagon (Circus Wagon) | idea | ambiguous | side window L [hand] | 0 | none | - | front: the front-facing glass is part of "side window L" (front 30%, side 45%, roof 13%, floor 13%): no pane of its own |
| gyrocar (Gyro Car) | idea | found | windscreen 2 [hand] | 68 | none | - |  |
| mower (Mower Racer) | idea | none | - | - | none | - | an open car / cockpit; no glass faces front (side, roof, rear only) |
| snailcamper (Snail Camper) | idea | none | - | - | none | - | unclassified: LOOK; only hidden glass faces front ("windscreen", behind the body) |
| duckwagon (Duck Lorry) | idea | none | - | - | found | rear window [hand] | a boat / hovercraft; no glass faces front (rear only) |
| pushbacktug (Pushback Tug) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| roadsweeper (Street Sweeper) | idea | found | windscreen [hand] | 0 | none | - |  |
| cabledrum (Cable Drum Lorry) | idea | found | windscreen [hand] | 0 | none | - |  |
| gameviewer (Game-Drive Truck) | idea | found | windscreen [hand] | -9 | none | - |  |
| slantback (Slant-Back Saloon) | idea | found | windscreen [cabin] | 43 | found | rear window [cabin] |  |
| glassbrake (Glass-Hatch Brake) | idea | found | windscreen [cabin] | 55 | missing | - | rear: glass in the cabinGlass mesh 2 outside every pane (1.24 m2) faces rear: no pane names it |
| sevenroadster (Seven Roadster) | idea | found | windscreen [hand] | 20 | none | - |  |
| talltourer (Tall Tourer) | idea | found | windscreen [hand] | 0 | none | - |  |
| removalsvan (Removals Van) | idea | found | windscreen [hand] | 18 | found | rear window [hand] | 2 decks |
| refuselorry (Bin Lorry) | idea | found | windscreen [hand] | 6 | none | - |  |
| jeepney (Jeepney) | idea | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| pocket4x4 (Pocket 4x4) | idea | found | windscreen [cabin] | 12 | found | rear window [cabin] |  |
| dodgem (Dodgem) | idea | none | - | - | none | - | unclassified: LOOK; no glass at all |
| iceresurfacer (Ice Resurfacer) | idea | found | windscreen [cabin] | 7 | found | rear window [cabin] |  |
| smileyhatch (Smiley Hatch) | idea | found | windscreen [cabin] | 62 | found | rear window [cabin] |  |
| eightieshatch (Eighties Hatch) | idea | found | windscreen [cabin] | 51 | found | rear window [cabin] |  |
| pebble (Pebble) | idea | found | windscreen [cabin] | 60 | found | rear window [cabin] |  |
| traffic:van (van) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:bus (bus) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:tractor (tractor) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:police (police) | traffic | found | windscreen [hand] | 56 | found | rear window [hand] |  |
| traffic:semi (semi) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:f1 (f1) | traffic | none | - | - | none | - | an open car / cockpit; no glass at all |
| traffic:gt (gt) | traffic | found | windscreen [hand] | 63 | found | rear window [hand] |  |
| traffic:lmp (lmp) | traffic | found | windscreen [hand] | 57 | none | - |  |
| traffic:ambulance (ambulance) | traffic | found | windscreen [hand] | 70 | none | - |  |
| traffic:commuter (commuter) | traffic | found | windscreen [hand] | 53 | found | rear window [hand] |  |
| traffic:darkvan (darkvan) | traffic | found | windscreen [hand] | 37 | none | - |  |
| traffic:junker (junker) | traffic | found | windscreen [hand] | 30 | found | rear window 2 [hand] | 2 decks |
| traffic:sport (sport) | traffic | found | windscreen [hand] | 64 | found | rear window [hand] |  |
| traffic:wagon (wagon) | traffic | found | windscreen [hand] | 44 | found | rear window [hand] |  |
| traffic:lovebus (lovebus) | traffic | found | windscreen R [hand] | 10 | found | rear window [hand] | split screen |
| traffic:lowrider (lowrider) | traffic | found | windscreen [hand] | 68 | found | rear window [hand] |  |
| traffic:taxi (taxi) | traffic | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| traffic:suv (suv) | traffic | found | windscreen [hand] | 46 | found | rear window [hand] |  |
| traffic:hotrod (hotrod) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:minivan (minivan) | traffic | found | windscreen [hand] | 48 | found | rear window [hand] |  |
| traffic:hearse (hearse) | traffic | found | windscreen [hand] | 49 | none | - |  |
| traffic:jeep (jeep) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:apc (apc) | traffic | none | - | - | none | - | unclassified: LOOK; no glass at all |
| traffic:tank (tank) | traffic | none | - | - | none | - | a tank; no glass at all |
| traffic:pickup (pickup) | traffic | found | windscreen [hand] | 38 | found | rear window [hand] | 2 decks |
| traffic:miata (miata) | traffic | found | windscreen [hand] | 62 | found | rear window [hand] |  |
| traffic:boat (boat) | traffic | found | windscreen [hand] | 36 | found | rear window [hand] |  |
| traffic:trawler (trawler) | traffic | found | windscreen 2 [hand] | 60 | found | rear window 2 [hand] | 3 decks |
| traffic:dinghy (dinghy) | traffic | none | - | - | none | - | unclassified: LOOK; no glass at all |
| traffic:barge (barge) | traffic | found | windscreen 2 [hand] | 0 | found | rear window 2 [hand] |  |
| traffic:ferry (ferry) | traffic | none | - | - | none | - | unclassified: LOOK; only hidden glass faces front ("windscreen + windscreen 2", behind the body) |
| traffic:pedalo (pedalo) | traffic | found | windscreen R [hand] | 0 | none | - |  |
| traffic:herald (herald) | traffic | found | windscreen [hand] | 70 | found | rear window [hand] |  |
| traffic:floatvan (floatvan) | traffic | none | - | - | none | - | an open car / cockpit; no glass faces front (roof, side only) |
| traffic:toybota (toybota) | traffic | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| traffic:dampervan (dampervan) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:nissank (nissank) | traffic | found | windscreen [hand] | 61 | found | rear window [hand] |  |
| traffic:icecream (icecream) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:binlorry (binlorry) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] | 2 decks |
| traffic:learner (learner) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:boyracer (boyracer) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
| traffic:caravan (caravan) | traffic | found | windscreen 2 [hand] | 0 | found | rear window [hand] |  |
| traffic:driveby (driveby) | traffic | found | windscreen [hand] | 47 | found | rear window [hand] |  |
| traffic:keitruck (keitruck) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:postvan (postvan) | traffic | found | windscreen [hand] | 30 | none | - |  |
| traffic:rickshaw (rickshaw) | traffic | found | windscreen [hand] | 76 | found | rear window [hand] |  |
| traffic:float (float) | traffic | none | - | - | none | - | unclassified: LOOK; no glass at all |
| traffic:cargotruck (cargotruck) | traffic | found | windscreen [hand] | 0 | none | - |  |
| traffic:getaway (getaway) | traffic | found | windscreen [hand] | 0 | none | - | 2 decks |
| traffic:interceptor (interceptor) | traffic | found | windscreen [hand] | 0 | found | rear window [hand] |  |
