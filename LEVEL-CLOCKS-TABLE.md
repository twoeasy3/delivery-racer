# Level clocks against the clean run (16-Oct, v1.1.149-alpha, logic 33a7d9d56d)

REPORT ONLY: no level was retimed (CHECKLIST 80 / 261 are the retiming items; the owner decides).

Made with `node scripts/level-clocks.mjs --all --table` (CHECKLIST 344, after the tool was fixed to drive every level in
the reference car with the garage's car rule off). The clean run is a ghost flat out from the start to the drop, nothing
in its way, seeded from the level's id (the same every time; checked: the same figure alone and after other levels).
The car is the Sportscompact (`sport`, CONFIG.clock.car), the Float Van on amphibious levels, or the level's own car.

The formula (CONFIG.clock): Good = clean run x 1.5, Evil = clean run x 1.15, each rounded to 5 s, then less 5 s for each
time plus on the level.

Columns:
- **good / clean, evil / clean**: the written clock over the clean run, as written.
- **where**: `menu n` is the level's place in the menu list (`?level=n`); `(laps)` a circuit; `hidden` a hidden or special level.
- **eff. good, eff. evil**: (written clock + 5 s x time pluses) / clean run. This is the one to set against the formula's
  1.5 and 1.15, because the time pluses give the player that time back.
- **formula**: the clock the formula gives today. **off** marks a written clock more than 5 s from it.

## Headline

- 99 levels timed (73 on the menu, 26 hidden), every one delivered. Before the fix about 37 off-tier levels gave no
  time, a 0.0 s run, or a time in the wrong car (see CHECKLIST 344).
- Menu levels, effective ratio: Good median 1.52 (from 0.86 to 2.63), Evil median 1.17 (from 0.77 to 1.86).
- 41 of 73 menu clocks are more than 5 s from the formula. 54 of 99 are off counting the hidden levels.
- **Generous (Good about 1.8 to 2.2 x):** levels 1 to 7, 9, 11, 14 to 20, 24, 27, 29, 30 (Stelvio 2.05 / 1.60),
  Oh Mine, Bathurst, Battlefield, and UFO (2.63 / 1.86). These look written by hand before the formula, or for an
  older, slower clean run.
- **Tight (under the formula):** Suburbs (11 time pluses, written 35 / 25: effective 0.86 / 0.77, below the clean
  run itself) and Monte Carlo (1.34 / 0.96). The circuits Monza, Spa, Albert Park (menu) and Grand Prix (hidden) are
  5 to 27 s short, since true speed made their clean runs slower (CHECKLIST 261). Hidden: Turbo Quay, Neon Edge and
  Endurance Road (about 1.2 / 0.93), and Grand Boulevard.
- **On the formula:** levels 22 (Outback Express) to 56 (Monsoon), except 24, 25, 27, 29 to 31, 35 (Backlot, 1.62 /
  1.23) and 51 (Cattle, written 15 s over the formula on both sides). Also the amphibious levels, and the newer
  hidden themes (Steelworks, Vegas, Alpine, Chianti, Jungle, Dakar, Mall, Haunted, Foliage).
- **Rival levels:** Rival Run (300 / 285) and Showdown (200 / 190) have an Evil clock close to the Good one, about
  1.7 x the clean run. It may be deliberate (a race of rivals): a question for the owner.
- **Odd clocks:** testbed (1080 / 765) and gimmick-road (504 / 357) are test roads with very long clocks.

## Table

| level | where | car | clean run s | time pluses | written good / evil | good / clean | evil / clean | eff. good | eff. evil | formula good / evil |
|---|---|---|---|---|---|---|---|---|---|---|
| expressway | menu 1 | sport | 58.2 | 0 | 110 / 85 | 1.89 | 1.46 | 1.89 | 1.46 | 85 / 65 **off** |
| back-roads | menu 2 | sport | 59.3 | 0 | 115 / 90 | 1.94 | 1.52 | 1.94 | 1.52 | 90 / 70 **off** |
| farm | menu 3 | sport | 55.0 | 0 | 105 / 80 | 1.91 | 1.45 | 1.91 | 1.45 | 80 / 65 **off** |
| big-business | menu 4 | sport | 64.4 | 0 | 125 / 95 | 1.94 | 1.48 | 1.94 | 1.48 | 95 / 75 **off** |
| hurricane | menu 5 | sport | 67.9 | 0 | 130 / 100 | 1.91 | 1.47 | 1.91 | 1.47 | 100 / 80 **off** |
| night | menu 6 | sport | 78.1 | 0 | 168 / 119 | 2.15 | 1.52 | 2.15 | 1.52 | 115 / 90 **off** |
| mystery-meadows | menu 7 | sport | 108.4 | 0 | 234 / 166 | 2.16 | 1.53 | 2.16 | 1.53 | 165 / 125 **off** |
| suburbs | menu 8 | sport | 104.4 | 11 | 35 / 25 | 0.34 | 0.24 | 0.86 | 0.77 | 100 / 65 **off** |
| canberra | menu 9 | sport | 91.2 | 2 | 180 / 128 | 1.97 | 1.40 | 2.08 | 1.51 | 125 / 95 **off** |
| monte-carlo | menu 10 | sport | 133.5 | 1 | 174 / 123 | 1.30 | 0.92 | 1.34 | 0.96 | 195 / 150 **off** |
| singapore | menu 11 | sport | 64.2 | 0 | 132 / 94 | 2.06 | 1.46 | 2.06 | 1.46 | 95 / 75 **off** |
| singapore-night | menu 12 | sport | 128.7 | 1 | 210 / 149 | 1.63 | 1.16 | 1.67 | 1.20 | 190 / 145 **off** |
| grand-pacific | menu 13 | sport | 329.1 | 2 | 480 / 340 | 1.46 | 1.03 | 1.49 | 1.06 | 485 / 370 **off** |
| passage-du-gois | menu 14 | sport | 187.0 | 4 | 348 / 247 | 1.86 | 1.32 | 1.97 | 1.43 | 260 / 195 **off** |
| safari | menu 15 | sport | 137.8 | 3 | 252 / 179 | 1.83 | 1.30 | 1.94 | 1.41 | 190 / 145 **off** |
| airport | menu 16 | sport | 120.6 | 2 | 210 / 149 | 1.74 | 1.24 | 1.82 | 1.32 | 170 / 130 **off** |
| construction | menu 17 | sport | 139.9 | 2 | 246 / 174 | 1.76 | 1.24 | 1.83 | 1.32 | 200 / 150 **off** |
| the-hood | menu 18 | sport | 156.0 | 1 | 304 / 215 | 1.95 | 1.38 | 1.98 | 1.41 | 230 / 175 **off** |
| panorama-avenue | menu 19 | sport | 177.6 | 1 | 360 / 255 | 2.03 | 1.44 | 2.06 | 1.46 | 260 / 200 **off** |
| speed-trap-alley | menu 20 | sport | 123.2 | 3 | 240 / 180 | 1.95 | 1.46 | 2.07 | 1.58 | 170 / 125 **off** |
| mountain-pass | menu 21 | sport | 111.4 | 1 | 195 / 155 | 1.75 | 1.39 | 1.80 | 1.44 | 160 / 125 **off** |
| outback-express | menu 22 | sport | 155.4 | 2 | 225 / 170 | 1.45 | 1.09 | 1.51 | 1.16 | 225 / 170 |
| tour-de-coast | menu 23 | sport | 145.3 | 2 | 210 / 160 | 1.45 | 1.10 | 1.51 | 1.17 | 210 / 155 |
| ring-road | menu 24 | sport | 138.8 | 2 | 265 / 200 | 1.91 | 1.44 | 1.98 | 1.51 | 200 / 150 **off** |
| market-town | menu 25 | sport | 124.9 | 2 | 185 / 140 | 1.48 | 1.12 | 1.56 | 1.20 | 175 / 135 **off** |
| quarry-run | menu 26 | sport | 150.7 | 2 | 215 / 165 | 1.43 | 1.09 | 1.49 | 1.16 | 215 / 165 |
| hong-kong | menu 27 | sport | 109.8 | 2 | 225 / 165 | 2.05 | 1.50 | 2.14 | 1.59 | 155 / 115 **off** |
| tokyo | menu 28 | sport | 132.3 | 1 | 190 / 140 | 1.44 | 1.06 | 1.47 | 1.10 | 195 / 145 |
| mumbai | menu 29 | sport | 110.9 | 1 | 230 / 170 | 2.07 | 1.53 | 2.12 | 1.58 | 160 / 120 **off** |
| stelvio | menu 30 | sport | 156.3 | 4 | 300 / 230 | 1.92 | 1.47 | 2.05 | 1.60 | 215 / 160 **off** |
| christmas | menu 31 | sport | 107.6 | 1 | 180 / 135 | 1.67 | 1.25 | 1.72 | 1.30 | 155 / 120 **off** |
| toys | menu 32 | sport | 150.2 | 2 | 215 / 165 | 1.43 | 1.10 | 1.50 | 1.17 | 215 / 165 |
| leaks | menu 33 | sport | 146.3 | 2 | 210 / 160 | 1.44 | 1.09 | 1.50 | 1.16 | 210 / 160 |
| moon | menu 34 | sport | 160.2 | 2 | 230 / 175 | 1.44 | 1.09 | 1.50 | 1.15 | 230 / 175 |
| backlot | menu 35 | sport | 129.7 | 2 | 200 / 150 | 1.54 | 1.16 | 1.62 | 1.23 | 185 / 140 **off** |
| venice | menu 36 | sport | 130.7 | 2 | 185 / 140 | 1.42 | 1.07 | 1.49 | 1.15 | 185 / 140 |
| iceroad | menu 37 | sport | 138.8 | 2 | 200 / 150 | 1.44 | 1.08 | 1.51 | 1.15 | 200 / 150 |
| park | menu 38 | sport | 160.9 | 3 | 225 / 170 | 1.40 | 1.06 | 1.49 | 1.15 | 225 / 170 |
| cinder | menu 39 | sport | 161.4 | 3 | 225 / 170 | 1.39 | 1.05 | 1.49 | 1.15 | 225 / 170 |
| docks | menu 40 | sport | 153.4 | 2 | 215 / 160 | 1.40 | 1.04 | 1.47 | 1.11 | 220 / 165 |
| noon | menu 41 | sport | 147.2 | 3 | 205 / 155 | 1.39 | 1.05 | 1.49 | 1.15 | 205 / 155 |
| morro | menu 42 | sport | 156.1 | 3 | 220 / 165 | 1.41 | 1.06 | 1.51 | 1.15 | 220 / 165 |
| rice | menu 43 | sport | 147.8 | 3 | 205 / 155 | 1.39 | 1.05 | 1.49 | 1.15 | 205 / 155 |
| derby | menu 44 | sport | 111.0 | 2 | 155 / 120 | 1.40 | 1.08 | 1.49 | 1.17 | 155 / 120 |
| seaquake | menu 45 | sport | 115.1 | 2 | 165 / 120 | 1.43 | 1.04 | 1.52 | 1.13 | 165 / 120 |
| farside | menu 46 | sport | 184.2 | 2 | 265 / 200 | 1.44 | 1.09 | 1.49 | 1.14 | 265 / 200 |
| stunts | menu 47 | sport | 107.9 | 2 | 150 / 115 | 1.39 | 1.07 | 1.48 | 1.16 | 150 / 115 |
| ponti | menu 48 | sport | 124.6 | 2 | 175 / 135 | 1.40 | 1.08 | 1.48 | 1.16 | 175 / 135 |
| glow | menu 49 | sport | 108.2 | 3 | 150 / 110 | 1.39 | 1.02 | 1.52 | 1.16 | 145 / 110 |
| erupt | menu 50 | sport | 178.2 | 3 | 250 / 190 | 1.40 | 1.07 | 1.49 | 1.15 | 250 / 190 |
| cattle | menu 51 | sport | 170.4 | 3 | 255 / 195 | 1.50 | 1.14 | 1.58 | 1.23 | 240 / 180 **off** |
| thaw | menu 52 | sport | 184.9 | 2 | 265 / 205 | 1.43 | 1.11 | 1.49 | 1.16 | 265 / 205 |
| fallout | menu 53 | sport | 137.5 | 2 | 195 / 150 | 1.42 | 1.09 | 1.49 | 1.16 | 195 / 150 |
| shift | menu 54 | sport | 118.0 | 3 | 160 / 120 | 1.36 | 1.02 | 1.48 | 1.14 | 160 / 120 |
| descent | menu 55 | sport | 118.9 | 2 | 170 / 125 | 1.43 | 1.05 | 1.51 | 1.14 | 170 / 125 |
| monsoon | menu 56 | sport | 170.0 | 4 | 235 / 175 | 1.38 | 1.03 | 1.50 | 1.15 | 235 / 175 |
| all-heck | menu 57 | hearse | 83.5 | 0 | 156 / 111 | 1.87 | 1.33 | 1.87 | 1.33 | 125 / 95 **off** |
| ufo | menu 58 | ufo | 54.7 | 0 | 144 / 102 | 2.63 | 1.86 | 2.63 | 1.86 | 80 / 65 **off** |
| marina-bay | menu 59 (laps) | f1 | 229.1 | 0 | 396 / 281 | 1.73 | 1.23 | 1.73 | 1.23 | 345 / 265 **off** |
| oh-mine | menu 60 | jetboat | 124.8 | 0 | 264 / 187 | 2.12 | 1.50 | 2.12 | 1.50 | 185 / 145 **off** |
| montreal | menu 61 (laps) | f1 | 201.8 | 0 | 348 / 247 | 1.72 | 1.22 | 1.72 | 1.22 | 305 / 230 **off** |
| bathurst | menu 62 (laps) | f1 | 176.4 | 0 | 360 / 255 | 2.04 | 1.45 | 2.04 | 1.45 | 265 / 205 **off** |
| rival-run | menu 63 | sport | 172.9 | 1 | 300 / 285 | 1.74 | 1.65 | 1.76 | 1.68 | 255 / 195 **off** |
| showdown | menu 64 | miata | 117.5 | 0 | 200 / 190 | 1.70 | 1.62 | 1.70 | 1.62 | 175 / 135 **off** |
| battlefield | menu 65 | apc | 142.4 | 0 | 312 / 221 | 2.19 | 1.55 | 2.19 | 1.55 | 215 / 165 **off** |
| slipway | menu 66 | floatvan | 112.8 | 1 | 165 / 125 | 1.46 | 1.11 | 1.51 | 1.15 | 165 / 125 |
| harbour | menu 67 | floatvan | 161.9 | 2 | 235 / 175 | 1.45 | 1.08 | 1.51 | 1.14 | 235 / 175 |
| flood | menu 68 | floatvan | 157.1 | 2 | 225 / 170 | 1.43 | 1.08 | 1.50 | 1.15 | 225 / 170 |
| ford | menu 69 | floatvan | 149.9 | 2 | 215 / 160 | 1.43 | 1.07 | 1.50 | 1.13 | 215 / 160 |
| fjord | menu 70 | floatvan | 146.0 | 2 | 210 / 160 | 1.44 | 1.10 | 1.51 | 1.16 | 210 / 160 |
| monza | menu 71 (laps) | f1 | 248.9 | 0 | 365 / 280 | 1.47 | 1.12 | 1.47 | 1.12 | 375 / 285 **off** |
| spa | menu 72 (laps) | f1 | 207.4 | 0 | 300 / 230 | 1.45 | 1.11 | 1.45 | 1.11 | 310 / 240 **off** |
| albert-park | menu 73 (laps) | f1 | 229.3 | 0 | 335 / 260 | 1.46 | 1.13 | 1.46 | 1.13 | 345 / 265 **off** |
| testbed | hidden | sport | 184.3 | 2 | 1080 / 765 | 5.86 | 4.15 | 5.91 | 4.21 | 265 / 200 **off** |
| grand-prix | hidden | f1 | 230.6 | 0 | 336 / 238 | 1.46 | 1.03 | 1.46 | 1.03 | 345 / 265 **off** |
| gimmick-road | hidden | miata | 116.4 | 0 | 504 / 357 | 4.33 | 3.07 | 4.33 | 3.07 | 175 / 135 **off** |
| gimmick-road-2 | hidden | miata | 166.6 | 0 | 420 / 320 | 2.52 | 1.92 | 2.52 | 1.92 | 250 / 190 **off** |
| gimmick-road-3 | hidden | sport | 256.0 | 0 | 480 / 370 | 1.88 | 1.45 | 1.88 | 1.45 | 385 / 295 **off** |
| chianti-run | hidden | sport | 132.8 | 2 | 190 / 145 | 1.43 | 1.09 | 1.51 | 1.17 | 190 / 145 |
| jungle-highway | hidden | sport | 178.0 | 4 | 245 / 185 | 1.38 | 1.04 | 1.49 | 1.15 | 245 / 185 |
| pocket-town | hidden | sport | 51.3 | 0 | 95 / 75 | 1.85 | 1.46 | 1.85 | 1.46 | 75 / 60 **off** |
| solstice-cliffs | hidden | sport | 59.0 | 0 | 90 / 70 | 1.53 | 1.19 | 1.53 | 1.19 | 90 / 70 |
| grand-boulevard | hidden | sport | 70.5 | 0 | 95 / 75 | 1.35 | 1.06 | 1.35 | 1.06 | 105 / 80 **off** |
| turbo-quay | hidden | sport | 78.6 | 0 | 95 / 75 | 1.21 | 0.95 | 1.21 | 0.95 | 120 / 90 **off** |
| neon-edge | hidden | sport | 76.4 | 0 | 90 / 70 | 1.18 | 0.92 | 1.18 | 0.92 | 115 / 90 **off** |
| endurance-road | hidden | sport | 76.2 | 0 | 90 / 70 | 1.18 | 0.92 | 1.18 | 0.92 | 115 / 90 **off** |
| dakar-dash | hidden | sport | 177.6 | 2 | 255 / 195 | 1.44 | 1.10 | 1.49 | 1.15 | 255 / 195 |
| mall-dash | hidden | sport | 90.9 | 2 | 125 / 95 | 1.38 | 1.05 | 1.49 | 1.16 | 125 / 95 |
| haunted-hollow | hidden | sport | 128.3 | 3 | 175 / 135 | 1.36 | 1.05 | 1.48 | 1.17 | 175 / 135 |
| foliage-run | hidden | sport | 129.6 | 2 | 185 / 140 | 1.43 | 1.08 | 1.50 | 1.16 | 185 / 140 |
| roadworks | hidden | sport | 105.5 | 1 | 215 / 155 | 2.04 | 1.47 | 2.09 | 1.52 | 155 / 115 **off** |
| roadworks-night | hidden | sport | 105.5 | 1 | 215 / 155 | 2.04 | 1.47 | 2.09 | 1.52 | 155 / 115 **off** |
| steelworks-run | hidden | sport | 107.3 | 2 | 150 / 115 | 1.40 | 1.07 | 1.49 | 1.16 | 150 / 115 |
| steelworks-night | hidden | sport | 107.3 | 2 | 150 / 115 | 1.40 | 1.07 | 1.49 | 1.16 | 150 / 115 |
| vegas-strip | hidden | sport | 114.0 | 2 | 160 / 120 | 1.40 | 1.05 | 1.49 | 1.14 | 160 / 120 |
| vegas-night | hidden | sport | 114.0 | 2 | 160 / 120 | 1.40 | 1.05 | 1.49 | 1.14 | 160 / 120 |
| alpine-pass | hidden | sport | 116.4 | 2 | 165 / 125 | 1.42 | 1.07 | 1.50 | 1.16 | 165 / 125 |
| metro-run | hidden | sport | 95.9 | 2 | 160 / 120 | 1.67 | 1.25 | 1.77 | 1.36 | 135 / 100 **off** |
| obstacle-lab | hidden | sport | 135.1 | 0 | 205 / 155 | 1.52 | 1.15 | 1.52 | 1.15 | 205 / 155 |
