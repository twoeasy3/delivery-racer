# Real circuits: handover (as of 2026-10-10)

Branch `delivery-circuits` (worktree `.claude/worktrees/delivery-circuits`), with `main` merged in at
`a401d13`. Monza, Spa-Francorchamps and Albert Park are built from OpenStreetMap and SRTM data and
are on the menu's Races tab as R4, R5 and R6. Not pushed, not merged into `main`.

## The request

Build real circuits from GPS / OpenStreetMap data the way Marina Bay and Mount Panorama were:
**Monza, Spa-Francorchamps, Albert Park** (the original list also had Baku, Brands Hatch, Caesars
Palace, Monaco, Donington, Sepang, Suzuka: not started). Priorities, in the owner's words: capture
the track correctly, add landmarks and elevation, and above all **reproduce the run-off areas
accurately**. Also: move all race stuff to a separate tab on the start screen.

## What is true now

| | Monza | Spa-Francorchamps | Albert Park |
|---|---|---|---|
| OSM source | relation 284565 | relation 284560 | relation 280443 (public roads) |
| Lap in the level / real | 5800 m / 5793 m | 7004 m / 7004 m | 5312 m / 5278 m (+0.64%) |
| Closes within | 0.03 m, 0 rad | 0.03 m, 0 rad | 0.002 m, 0 rad |
| Level's lap drifts from the map's by at most | 9.6 m | 5.1 m | 10.7 m |
| Heights | SRTM 178-198 m; the level climbs 14.1 m, steepest 1.8% (real: about 13 m) | SRTM 363-469 m; climbs 102 m, steepest 13% (real: 102 m) | flat (see below) |
| Run-off stretches | 230 tapers (was 105 steps) | 190 tapers (was 95 steps) | 0 (see below) |
| Gravel traps from the map | 109 pieces, 2076 m of the lap's two sides | 172 pieces, 3352 m | none mapped |
| What set the limit (left / right side) | tree line 58 / 61%, barriers 18 / 11%, old track and pit lane 7 / 17%, buildings 6 / 8%, gravel trap's far edge 5 / 1%, nothing mapped 5 / 2% | mapped barriers 95 / 88%, other track 3 / 9%, pit lane 0 / 2% | none: nothing is mapped |
| Stands from the map | 30 (2 the pits) | 7 (2 the pits) | 3 (2 the pits) |
| Laps, clock (good / evil) | 3, 365 / 280 s | 2, 300 / 230 s | 3, 335 / 260 s |
| Landmarks drawn | the old banking (Sopraelevata Nord and Sud) and the oval's back straight where they stand; park trees | the Eau Rouge stream, the hotel at Francorchamps, pine forest on the theme's terrain | the lake's real shoreline, the city's towers to the north, gums and palms |

Things to know about those numbers:

- **Albert Park has no run-off, and that is not accurate.** It is a street circuit: OSM maps neither
  the walls put up for the race nor its gravel traps (the `natural=sand` in the box is golf bunkers).
  Measured the ordinary way the limit came out as the lake shore and park fences, tens of metres off,
  which is wrong the other way. So its config sets `runoff.street`, which puts the wall at the road's
  edge unless a trap or apron is mapped, and none is. The real circuit has gravel traps at several of its
  corners: these would have to come from another source (aerial imagery, an FIA circuit map).
- **Albert Park is flat** (`"elevation": false`): SRTM gave 1-17 m of noise (buildings, trees) against
  a real rise and fall of about 2.6 m.
- **Monza's limit is the tree line for most of the lap**, because few of its guard rails are mapped: the
  real rails stand a few metres inside the trees, so widths on its straights are a little generous.
  Monza's heights are SRTM smoothed over 150 m for the same reason (the canopy shows in SRTM).
- **Gravel is drawn and slows cars (2026-10-10).** A level's `gravel` (see `levels.js`,
  `Track.gravelAt`, `CONFIG.gravel`): the tool writes it where the map has `natural=sand` or
  `surface=gravel / sand` beside the track, as 20 m pieces whose near and far edges run straight
  between measured points. Not checked against aerial pictures: Monza's long left bed at 1004-1624
  in particular is whatever OSM has there.
- **The wall line is smooth (2026-10-10).** The measured widths are narrowed to a line that changes
  by at most 1 m per m, smoothed on the narrow side (never beyond what was measured) and written as
  tapers (`{ from, to, side, width, end }`) that join at the same width: no steps. That costs width:
  the level's run-off is narrower than measured by 2.1-2.6 m on average at Monza and 0.9-1.2 m at
  Spa (the old stepped version: 1.5 and 1.3). `runoff.smooth` / `taper` / `fit` / `over` in the config.

## How run-off works in this engine

- A level's `shoulder` (m) is the driveable asphalt outside the outer lane on each side. The wall and
  catch fence are drawn at the shoulder's outer edge (`render/road.js`, `circuitTrackside`).
- `runoff: [{ from, to, side, width }]` widens that side's shoulder by `width` m over s = from..to,
  eased over `CONFIG.runoffEase` (25 m) at each end (`track.js`, `shoulderOn`). So **width is the
  distance from the level's own wall line (6 m from the centre line) to the real barrier**.
- New in `track.js`: on a lapped level a stretch from 0, or to the lap's end, is **not** eased at the
  line, so run-off carries on across the start line (the tool writes such a run as two stretches of
  one width). No older level has a stretch touching the line, so none changes.
- Half road width = lanes/2 x 3.5 + shoulder; a bend needs radius >= that + 3 m (9 m for the circuits).
  Geometry: the road starts at the origin heading +z, `h -= curve * step` in 2 m steps, +curve = right
  turn, right = -x. A lapped level must close within 1 m and 0.01 rad.

## The tool: `scripts/circuit-from-osm.mjs`

`node scripts/circuit-from-osm.mjs <id>` (`--dry` to not write the level, `--refetch`, `--ways` to list
a box's raceway ways and circuit relations). Its header documents the config, `scripts/circuits/<id>.json`.
Downloads are cached in `scripts/circuits/cache/` (committed); a picture of what it measured goes to
`scripts/circuits/out/<id>.svg` (git-ignored): barriers red, the limit measured on each side blue, what
the level's stretches make of it orange.

What it does: OSM map call for the box (split into tiles if too big; Overpass is not used) -> the
relation's ways chained end to end -> a centripetal Catmull-Rom spline walked every 0.5 m -> heading
smoothed (`smooth`, 4 m; 8 for Albert Park's road junctions) -> a curve per 4 m, straights merged,
bends tighter than 9.5 m held there with their turning passed to the segments either side -> closed
by Newton's method on the engine's own sum -> SRTM heights every 40 m from opentopodata, smoothed,
as a grade per 20 m -> at every 4 m on each side a ray out from the centre line: the nearest of a
mapped barrier, a building, the tree line or water, the pit lane, another track, the lap itself (half
the gap), or failing those the far edge of a mapped gravel trap / apron -> a median of five, gaps
under 40 m shut, the inside of a bend held to what the bend allows -> narrowed to a gradual line, smoothed and
simplified into tapers; the mapped gravel's edges along the same rays as the level's `gravel` -> grandstands (`building=grandstand`, `leisure=bleachers`) and the pit
lane as the level's `stands` -> the config's landmarks put into the level's world coordinates by
where they are from the nearest part of the lap -> the level file (what it already has is kept, but
for `segments`, `runoff`, `stands`, `landmarks`, `pickups` and the config's `level` fields).

## Everything else in the branch

- `levels.js`: `CIRCUIT_LEVELS` last in `LEVELS` (saved progress counts by position), `isRace`,
  `RACE_LEVELS`, `DELIVERY_LEVELS`, `nextOnTab`, `levelLabel` (`1..`, `S1..`, `R1..`).
- The Races tab: `progress.js` (races always open, `pastRaces`), `game.js` (`nextLevel` uses
  `nextOnTab`), `delivery/index.html` (`#tabDelivery` / `#tabRaces`, `#raceMenu`), `style.css`,
  `render/menu.js` (`TABS`).
- `render/circuits/`: `index.js` (the registry and the `ctx` bag), `kit.js` (shared: `ground`, `clear`
  of the track and its run-off, `scatter`, `besideTrack`, `ribbon`, `trees`, ...), and one file per
  circuit. `render/road.js`: the `theme.scenery === 'circuit'` branch. `themes.js`: `monza` (now with
  terrain, for its few metres of height), `spa` (terrain), `albert-park`.
- `scripts/delivery-levels-check.mjs`: a headless check, in seconds: every level builds with no
  `Track.problems`, the labels are right, every race starts and is driven.
- `scripts/delivery-smoke.mjs`: its levels-list assertion now expects `S` and `R` labels (edited, not run).

## Verified, and not

- Headless (`node scripts/delivery-levels-check.mjs`): all 47 levels build with no problems; R1 Marina
  Bay .. R6 Albert Park; all six races start and drive. `level-clocks.mjs` drove all three new
  circuits to the finish (their clocks are from it).
- In a browser (headless Edge via `scripts/shots.mjs`, screenshots looked at, not kept): all three
  circuits load and draw: Monza's start straight with its stands and the Parabolica with the banking
  beside it, Spa's hills and forest on the run to Eau Rouge, Albert Park with the lake.
- **Never seen:** the start screen's Deliveries / Races tabs (locked groups, the R labels on cards,
  Next level after a race); Spa's hotel and stream, Albert Park's skyline, Monza's north banking, up
  close; a whole lap of any of them by eye; anything on a phone. The smoke test was not run.

## Next steps

1. Open the game and look at the Races tab and a lap of each circuit.
2. Albert Park's run-off, from a source that has it (see above); then `runoff.street` can go.
3. Menu pictures `levelshots/<id>.jpg` for the three (`node scripts/shots.mjs shots
   --levels=monza,spa,albert-park` gives PNGs; Spa's came out blocked by something right in front
   of the camera, not looked into, so that one needs another spot).
4. Look at each gravel bed against an aerial picture; Albert Park's traps from another source.
5. More circuits: write a config, `--ways` to find the relation, run the tool.
