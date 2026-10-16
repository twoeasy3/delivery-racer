# Level archetypes: how to plan a level (a reference, nothing built)

The owner (16-Oct): "All of our levels have been quite samey without a true plan." And, on the first draft: "I'm
not asking for new gimmicks but new ways to plan out the levels."

So this doc is about PLANNING. An archetype here is a recipe for laying out a level from what the game already has:
the clock and time pluses, length, lanes, traffic, obstacle layout, pickup layout, zones, speed limits, and a few of
the existing gimmicks used sparingly. Ideas that need NEW gimmicks or code are kept, but parked in section 4.

**A document only.** No game code or level was changed; nothing was built or played. Numbers were read from the level
files, `scripts/level-clocks.mjs` and `scripts/obstacle-audit.mjs` on 16-Oct, on main v1.1.149-alpha.

It is a REFERENCE: archetypes and instructions. It proposes no rework of any level (the owner: "Don't rework levels
yet, just have a set of instructions and archetypes").

Contents: 1 Audit (why a plan is needed). 2 The planning knobs. 3 Archetypes (12 recipes). 4 Parked ideas: need new
gimmicks. 5 How to use this, and a template. 6 Questions for the owner. Appendix: levels that already look like an
archetype (facts only).

## 1. Audit: what the levels ask of the player today

### 1.1 What was counted, and how

- Every level file in `src/delivery/levels/` (100 files). The menu holds 56 numbered levels, 9 specials (S), 5
  amphibious (A) and 3 races (R) (`levels.js`). 21 more are hidden or event maps (h). Test tracks (including the new
  Obstacle Lab), the Gimmick Roads and the screensaver are left out.
- **Clock G / E**: the written clock, Good / Evil, in s. **Clean**: the clean run worked out by
  `node scripts/level-clocks.mjs` (a ghost in the Sportscompact, flat out, nothing in the way; a level's own car if it
  has one). **G ÷ clean**: how many clean runs the Good clock gives (under 1 = you need time pluses). **n/c** = not
  checked: the tool did not finish that level (1.4).
- **+T / −T**: time pluses / minuses. **$**: cash pickups. **Kinds**: kinds of gimmick in the file, traffic events
  included (pursuits, convoys, emergencies); side roads, tunnels and parked cars not counted.
- **Beats /km**: things on the road per km (each gimmick placement and obstacle; within 40 m counts as one).
  **Obst /km**: plain obstacles per km. **Cars**: traffic at once, player's way / oncoming (`trafficCount` /
  `oncomingCount`; default 16 / 12; "-" on a one-way road). **Lanes**: player's way / oncoming, or all on a one-way road.
- Counted by a throwaway script over the JSON (not committed). Not measured: how anything plays, the traffic a real run
  meets, the side roads' own contents.

### 1.2 Table

| # | Level | km | Clock G / E | Clean | G ÷ clean | +T / −T | $ | Kinds | Beats /km | Obst /km | Cars same / onc | Lanes | Flow |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Expressway | 2.0 | 110 / 85 | 74 | 1.48 | 0 / 0 | 13 | 0 | 2.5 | 2.5 | 11 / 8 | 2/2 | two-way |
| 2 | Back Roads | 1.8 | 115 / 90 | 76 | 1.51 | 0 / 0 | 16 | 0 | 2.8 | 3.9 | 11 / 8 | 2/2 | two-way |
| 3 | Farm Lanes | 2.0 | 105 / 80 | 71 | 1.49 | 0 / 0 | 12 | 2 | 5.5 | 3.5 | 11 / 8 | 2/2 | two-way |
| 4 | Big Business | 2.4 | 125 / 95 | 82 | 1.52 | 0 / 0 | 19 | 0 | 2.1 | 2.5 | 16 / - | 4 | one way |
| 5 | Hurricane | 2.4 | 130 / 100 | 87 | 1.49 | 0 / 0 | 15 | 2 | 10.4 | 10 | 7 / - | 4 | one way |
| 6 | Night Drive | 2.5 | 168 / 119 | 78 | 2.15 | 0 / 0 | 3 | 2 | 1.2 | 1.2 | 10 / 8 | 2/2 | two-way |
| 7 | Mystery Meadows | 3.0 | 234 / 166 | 108 | 2.16 | 0 / 0 | 0 | 3 | 5.7 | 1.7 | 16 / 13 | 2/2 | two-way |
| 8 | City Suburbs | 3.2 | 35 / 25 | 104 | 0.34 | 11 / 3 | 3 | 2 | 1.6 | 1.3 | 8 / 6 | 2/2 | two-way |
| 9 | Australian Capital Territory | 3.0 | 180 / 128 | 115 | 1.57 | 2 / 0 | 0 | 1 | 3.7 | 10 | 7 / 8 | 1/1 | two-way |
| 10 | Monte Carlo | 3.3 | 174 / 123 | 134 | 1.30 | 1 / 0 | 0 | 1 | 6.9 | 0 | 6 / 7 | 1/1 | two-way |
| 11 | Garden City | 1.9 | 132 / 94 | 61 | 2.17 | 0 / 0 | 0 | 0 | 0 | 0 | 10 / 9 | 2/2 | two-way |
| 12 | Jewel of the East | 3.9 | 210 / 149 | n/c | ? | 1 / 0 | 0 | 0 | 0 | 0 | 12 / 11 | 2/2 | two-way |
| 13 | Sydney to Kiama | 10.5 | 480 / 340 | n/c | ? | 2 / 0 | 3 | 4 | 0.8 | 0 | 12 / 10 | 2/2 | two-way |
| 14 | Passage du Gois | 5.6 | 348 / 247 | n/c | ? | 4 / 0 | 2 | 2 | 0.7 | 0 | 10 / 9 | 3/2 | two-way |
| 15 | Safari | 4.4 | 252 / 179 | n/c | ? | 3 / 0 | 6 | 5 | 1.4 | 0 | 12 / - | 3 | one way |
| 16 | Airport Apocalypse | 3.7 | 210 / 149 | n/c | ? | 2 / 0 | 0 | 1 | 0 | 0 | 14 / - | 4 | one way |
| 17 | Construction Site | 3.2 | 246 / 174 | n/c | ? | 2 / 0 | 0 | 4 | 16.6 | 33.4 | 4 / - | 3 | one way |
| 18 | The Hood | 4.8 | 304 / 215 | n/c | ? | 1 / 0 | 3 | 2 | 1.7 | 1.7 | 10 / 8 | 2/2 | two-way |
| 19 | Panorama Avenue | 5.6 | 360 / 255 | n/c | ? | 1 / 0 | 0 | 2 | 1.4 | 0 | 12 / 10 | 2/2 | two-way |
| 20 | Speed Trap Alley | 4.2 | 240 / 180 | n/c | ? | 3 / 1 | 34 | 4 | 4 | 0 | 9 / 7 | 2/2 | two-way |
| 21 | Mountain Pass | 3.6 | 195 / 155 | n/c | ? | 1 / 0 | 32 | 5 | 5 | 0 | 5 / 6 | 1/1 | two-way |
| 22 | Outback Express | 5.2 | 225 / 170 | n/c | ? | 2 / 0 | 36 | 6 | 3.3 | 0 | 8 / 8 | 2/2 | two-way |
| 23 | Tour de Coast | 4.8 | 210 / 160 | n/c | ? | 2 / 0 | 36 | 3 | 2.5 | 0 | 9 / 7 | 2/2 | two-way |
| 24 | Ring Road | 4.6 | 265 / 200 | n/c | ? | 2 / 0 | 37 | 4 | 2.6 | 1.7 | 10 / 8 | 2/2 | two-way |
| 25 | Market Town | 4.0 | 185 / 140 | n/c | ? | 2 / 0 | 36 | 6 | 5 | 0.8 | 7 / 6 | 1/1 | two-way |
| 26 | Quarry Run | 4.4 | 215 / 165 | n/c | ? | 2 / 0 | 36 | 10 | 5.7 | 1.1 | 8 / 6 | 1/1 | two-way |
| 27 | Hong Kong Harbour | 3.7 | 225 / 165 | n/c | ? | 2 / 0 | 36 | 4 | 3.8 | 4.9 | 11 / 9 | 2/2 | two-way |
| 28 | Tokyo Expressway | 4.2 | 190 / 140 | n/c | ? | 1 / 0 | 3 | 7 | 2.4 | 1.4 | 12 / 10 | 2/2 | two-way |
| 29 | Mumbai Monsoon | 3.4 | 230 / 170 | 111 | 2.07 | 1 / 0 | 2 | 5 | 5.3 | 1.5 | 12 / 10 | 2/2 | two-way |
| 30 | Stelvio Pass | 4.2 | 300 / 230 | 191 | 1.57 | 4 / 0 | 20 | 4 | 2.6 | 0 | 5 / 6 | 1/1 | two-way |
| 31 | Christmas Eve | 3.3 | 180 / 135 | 108 | 1.67 | 1 / 0 | 3 | 4 | 4.2 | 0.9 | 9 / 8 | 2/2 | two-way |
| 32 | Toy Room | 4.6 | 215 / 165 | n/c | ? | 2 / 0 | 27 | 12 | 3.5 | 1.3 | 13 / 8 | 3/2 | two-way |
| 33 | Twenty Thousand Leaks | 4.5 | 210 / 160 | n/c | ? | 2 / 0 | 32 | 8 | 2 | 0.7 | 11 / 5 | 3/1 | two-way |
| 34 | Tranquility Base | 4.9 | 230 / 175 | n/c | ? | 2 / 0 | 36 | 10 | 5.1 | 1.4 | 12 / 7 | 3/2 | two-way |
| 35 | Quiet on Set | 4.2 | 200 / 150 | n/c | ? | 2 / 0 | 29 | 12 | 4.6 | 2.4 | 12 / 8 | 3/2 | two-way |
| 36 | Acqua Alta | 4.5 | 185 / 140 | n/c | ? | 2 / 0 | 35 | 10 | 3.6 | 1.6 | 9 / 8 | 2/2 | two-way |
| 37 | Northern Lights | 4.6 | 200 / 150 | n/c | ? | 2 / 0 | 37 | 8 | 5.2 | 1.1 | 9 / 7 | 3/2 | two-way |
| 38 | Thrill Park | 5.0 | 225 / 170 | n/c | ? | 3 / 0 | 31 | 11 | 2.6 | 1 | 12 / 8 | 3/2 | two-way |
| 39 | Cinder Island | 5.0 | 225 / 170 | n/c | ? | 3 / 0 | 29 | 10 | 2.6 | 0.8 | 11 / 8 | 3/2 | two-way |
| 40 | Dock Run | 4.7 | 215 / 160 | n/c | ? | 2 / 0 | 27 | 14 | 4.5 | 0.9 | 12 / 9 | 3/3 | two-way |
| 41 | High Noon | 4.8 | 205 / 155 | n/c | ? | 3 / 0 | 37 | 12 | 5.4 | 1.7 | 11 / 8 | 2/2 | two-way |
| 42 | Favela Heights | 4.9 | 220 / 165 | n/c | ? | 3 / 0 | 37 | 12 | 4.5 | 0.6 | 9 / 6 | 2/1 | two-way |
| 43 | Emerald Steps | 4.6 | 205 / 155 | n/c | ? | 3 / 0 | 35 | 13 | 5.2 | 0.7 | 8 / 6 | 2/1 | two-way |
| 44 | Toy Box Derby | 3.8 | 155 / 120 | n/c | ? | 2 / 0 | 37 | 10 | 5.3 | 1.9 | 14 / - | 4 | one way |
| 45 | Seaquake | 3.7 | 165 / 120 | n/c | ? | 2 / 0 | 35 | 12 | 5.4 | 1.6 | 10 / 8 | 2/2 | two-way |
| 46 | Far Side | 5.6 | 265 / 200 | n/c | ? | 2 / 0 | 37 | 10 | 4.8 | 1.1 | 10 / 6 | 2/1 | two-way |
| 47 | Stunt Double | 3.6 | 150 / 115 | n/c | ? | 2 / 0 | 37 | 11 | 3.9 | 1.9 | 14 / - | 4 | one way |
| 48 | Seven Bridges | 4.0 | 175 / 135 | n/c | ? | 2 / 0 | 34 | 7 | 4.5 | 2.5 | 8 / 5 | 2/1 | two-way |
| 49 | After Hours | 3.8 | 150 / 110 | n/c | ? | 3 / 0 | 34 | 11 | 5.3 | 2.4 | 13 / - | 4 | one way |
| 50 | Eruption Day | 5.5 | 250 / 190 | n/c | ? | 3 / 0 | 37 | 12 | 4.7 | 3.1 | 14 / 3 | 3/1 | two-way |
| 51 | Cattle Drive | 5.6 | 255 / 195 | 170 | 1.50 | 3 / 0 | 36 | 13 | 5.7 | 1.8 | 9 / 5 | 2/1 | two-way |
| 52 | Spring Thaw | 5.5 | 265 / 205 | 185 | 1.43 | 2 / 0 | 35 | 11 | 4.1 | 1.8 | 9 / 6 | 2/2 | two-way |
| 53 | Hot Zone | 4.7 | 195 / 150 | 138 | 1.42 | 2 / 0 | 37 | 3 | 3.7 | 1.9 | 10 / 7 | 2/2 | two-way |
| 54 | Night Shift | 3.6 | 160 / 120 | 118 | 1.36 | 3 / 0 | 48 | 12 | 4.1 | 1.1 | 12 / 7 | 3/2 | two-way |
| 55 | Mudslide | 3.4 | 170 / 125 | 119 | 1.43 | 2 / 0 | 39 | 8 | 3.6 | 0.9 | 9 / 6 | 2/1 | two-way |
| 56 | Monsoon | 5.3 | 235 / 175 | 170 | 1.38 | 4 / 0 | 77 | 13 | 6.8 | 2.8 | 9 / 6 | 2/1 | two-way |
| S1 | All Heck | 2.7 | 156 / 111 | 84 | 1.87 | 0 / 0 | 0 | 0 | 3.3 | 3.3 | 16 / - | 8 | all oncoming |
| S2 | Mother Ship | 3.2 | 144 / 102 | 55 | 2.63 | 0 / 0 | 0 | 1 | 0.9 | 0 | 16 / 12 | 4/4 | two-way |
| S3 | Marina Bay | 4.9 x3 | 396 / 281 | 229 | 1.73 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| S4 | Oh Mine! | 4.2 | 264 / 187 | 125 | 2.12 | 0 / 0 | 0 | 1 | 18.3 | 86.2 | 9 / - | 8 | one way |
| S5 | Montreal | 4.3 x3 | 348 / 247 | 202 | 1.72 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| S6 | Mount Panorama | 6.2 x2 | 360 / 255 | 176 | 2.04 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| S7 | Rival Run | 5.5 | 300 / 285 | 167 | 1.79 | 1 / 0 | 0 | 1 | 3.8 | 3.1 | 10 / 9 | 2/2 | two-way |
| S8 | Showdown | 5.2 | 200 / 190 | n/c | ? | 0 / 0 | 0 | 0 | 1.5 | 2.3 | 11 / 9 | 2/2 | two-way |
| S9 | Battlefield | 4.5 | 312 / 221 | 142 | 2.19 | 0 / 0 | 2 | 4 | 0.4 | 0 | 7 / 18 | 3/3 | mixed |
| A1 | Slipway Beach | 2.8 | 165 / 125 | 113 | 1.46 | 1 / 0 | 3 | 2 | 3.9 | 2.9 | 12 / 10 | 2/2 | two-way |
| A2 | Harbour Lights | 3.5 | 235 / 175 | 162 | 1.45 | 2 / 0 | 4 | 2 | 2.6 | 1.1 | 12 / 11 | 2/2 | two-way |
| A3 | High Water | 3.3 | 225 / 170 | 157 | 1.43 | 2 / 0 | 4 | 5 | 4.8 | 1.5 | 16 / - | 3 | one way |
| A4 | Hippo Ford | 3.6 | 215 / 160 | 150 | 1.43 | 2 / 0 | 4 | 4 | 2.2 | 0 | 13 / - | 3 | one way |
| A5 | Fjord Crossing | 3.6 | 210 / 160 | 146 | 1.44 | 2 / 0 | 6 | 5 | 3.3 | 0.8 | 10 / 10 | 2/2 | two-way |
| R1 | Monza | 5.8 x3 | 365 / 280 | 249 | 1.47 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| R2 | Spa-Francorchamps | 7.0 x2 | 300 / 230 | 207 | 1.45 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| R3 | Albert Park | 5.3 x3 | 335 / 260 | 229 | 1.46 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 2 | one way |
| h | Alpine Pass | 3.5 | 165 / 125 | 116 | 1.42 | 2 / 0 | 24 | 3 | 4.5 | 6 | 5 / 5 | 2/1 | two-way |
| h | Chianti Run | 4.4 | 190 / 145 | 133 | 1.43 | 2 / 0 | 45 | 5 | 3.7 | 2.5 | 6 / 6 | 1/1 | two-way |
| h | Dakar Dash | 5.7 | 255 / 195 | 178 | 1.44 | 2 / 0 | 67 | 3 | 4.1 | 3.5 | 11 / - | 4 | one way |
| h | Endurance Road | 2.5 | 90 / 70 | 76 | 1.18 | 0 / 0 | 22 | 1 | 2.8 | 2.4 | 9 / 7 | 2/2 | two-way |
| h | Foliage Run | 4.2 | 185 / 140 | 130 | 1.43 | 2 / 0 | 66 | 4 | 4.6 | 3.4 | 16 / 7 | 3/2 | two-way |
| h | Grand Boulevard | 2.1 | 95 / 75 | 71 | 1.35 | 0 / 0 | 24 | 5 | 3.7 | 2.3 | 10 / 9 | 3/3 | two-way |
| h | Singapore Grand Prix | 4.2 x3 | 336 / 238 | 231 | 1.46 | 0 / 0 | 0 | 0 | 0 | 0 | 0 / - | 4 | one way |
| h | Haunted Hollow | 4.4 | 175 / 135 | 128 | 1.36 | 3 / 0 | 37 | 4 | 6.1 | 5.2 | 8 / 7 | 2/2 | two-way |
| h | Jungle Highway | 5.7 | 245 / 185 | 178 | 1.38 | 4 / 0 | 62 | 6 | 6.4 | 3.7 | 10 / 7 | 2/2 | two-way |
| h | Mall Dash | 3.0 | 125 / 95 | 91 | 1.38 | 2 / 0 | 45 | 6 | 13 | 20 | 0 / - | 2 | one way |
| h | Metro Run | 3.5 | 160 / 120 | 96 | 1.67 | 2 / 0 | 105 | 4 | 7.4 | 4.6 | 0 / - | 3 | one way |
| h | Neon Edge | 2.5 | 90 / 70 | 76 | 1.18 | 0 / 0 | 25 | 6 | 3.6 | 2 | 11 / 9 | 2/2 | two-way |
| h | Pocket Town | 1.7 | 95 / 75 | 51 | 1.85 | 0 / 0 | 26 | 7 | 8.7 | 3.5 | 7 / 6 | 2/2 | two-way |
| h | Roadworks by Night | 3.4 | 215 / 155 | 106 | 2.04 | 1 / 0 | 52 | 4 | 6.5 | 5.9 | 8 / 6 | 2/2 | two-way |
| h | Roadworks | 3.4 | 215 / 155 | 106 | 2.04 | 1 / 0 | 52 | 4 | 6.5 | 5.9 | 10 / 8 | 2/2 | two-way |
| h | Solstice Cliffs | 2.0 | 90 / 70 | 59 | 1.53 | 0 / 0 | 24 | 4 | 4.6 | 2.6 | 8 / 7 | 2/2 | two-way |
| h | Steelworks by Night | 3.5 | 150 / 115 | 107 | 1.40 | 2 / 0 | 72 | 4 | 10.9 | 9.4 | 8 / 6 | 2/2 | two-way |
| h | Steelworks Run | 3.5 | 150 / 115 | 107 | 1.40 | 2 / 0 | 72 | 4 | 10.9 | 9.4 | 8 / 6 | 2/2 | two-way |
| h | Turbo Quay | 2.4 | 95 / 75 | 79 | 1.21 | 0 / 0 | 24 | 6 | 4.2 | 4.2 | 11 / 8 | 3/3 | two-way |
| h | Vegas by Night | 3.5 | 160 / 120 | 114 | 1.40 | 2 / 0 | 60 | 3 | 8.2 | 5.6 | 8 / 6 | 3/3 | two-way |
| h | Vegas Strip | 3.5 | 160 / 120 | 114 | 1.40 | 2 / 0 | 60 | 3 | 8.2 | 5.6 | 10 / 8 | 3/3 | two-way |

### 1.3 Where they are samey (the headline)

1. **One clock model for every level.** Clock = 1.5 clean runs (Good) and 1.15 (Evil), less 5 s per time plus
   (`CONFIG.clock`, `cleanrun.js`); a plus gives 10 s (`CONFIG.timePickup`). Of the 57 levels the tool timed, 27 sit
   at 1.40 to 1.60 clean runs. Most others are LOOSER, not different: old clocks never re-timed (Night Drive 2.15,
   Mystery Meadows 2.16, Garden City 2.17, Mumbai 2.07, Roadworks 2.04) and the specials. Only **City Suburbs** is a
   different clock: 35 s against a 104 s clean run (0.34), with 11 time pluses and 3 minuses. Set by hand; no note
   says why. It is the owner's Time Upkeep already.
2. **Same time plus habit.** Levels 20 to 56: 1 to 4 time pluses each, almost all 2 or 3, about a third and two thirds
   of the way. In the whole career only Suburbs (3) and Speed Trap Alley (1) have time minuses.
3. **Same size.** Levels 20 to 56: 3.3 to 5.6 km (median 4.5), Good clock 150 to 300 s (median 210). Only Sydney to
   Kiama is long (10.5 km). Nothing short after tier 1 (the short ones are event maps).
4. **One of everything.** Levels 32 to 56 carry 3 to 14 kinds of gimmick (median 11), against the owner's rule ("one
   idea and a few thematic gimmicks"). Levels 1 to 19: median 2. The same filler everywhere: pursuits (21 of 56
   numbered levels), convoys (21), fog (19), drifters (16), potholes (15), emergencies (13), cushions (13). Cause: the
   10-Oct "standard" (10 to 16 kinds, something every 150 to 300 m, `SCRATCHPAD-10-Oct-dropped.md`).
5. **Same rhythm.** Levels 32 to 56: 2 to 6.8 beats a km (median 4.5), something every 150 to 250 m, all the way. Few
   have a long calm stretch or a real climax.
6. **Same pickups.** Levels 20 to 56: 34 to 37 cash in 23 of 37 levels, in 8 to 16 side-by-side rows. The pickups
   never change what the player is chasing.
7. **Same road.** 48 of the 56 numbered levels are two-way; traffic 8 to 14 cars each way on most; lanes 2/1, 3/2 or 4.
8. **Obstacles ask almost nothing** (from `OBSTACLE-STAGE-DESIGN.md` §3, `obstacle-audit.mjs --all`): 68% of obstacles
   stand alone, 76 formations in the whole game (Canberra, Construction Site and Mall Dash hold most), and alternating
   singles never ask more than a 0.8 m nudge. Only Construction Site (33 a km) and Oh Mine! (86 a km) are dense.
9. **Levels that already have a clear plan**: City Suburbs (Time Upkeep), Big Business (Rush),
   Construction Site and Mall Dash (Obstacle Course), Roadworks (Lane Reader), Sydney to Kiama (Long Haul), the
   mountain roads (Climb), Rival Run / Showdown / Toy Box Derby (Rival), Speed Trap Alley (Speed Trap).

### 1.4 What could not be checked

- **The clock tool did not finish 37 levels.** `level-clocks.mjs --all` printed a 0.0 s "clean run" for most of levels
  10 to 50; one at a time, Tokyo, Toy Room and Sydney to Kiama come back "NOT DELIVERED (still driving)" after 900 s.
  Monte Carlo, Garden City and Christmas Eve timed fine alone; Showdown gives 0.0 s even alone. These clocks were NOT
  re-checked; why the ghost stalls was not looked into (maybe a regression worth its own item).
- `obstacle-audit.mjs construction` crashes (a TypeError at line 57) on main today, so Construction Site's layout was
  read straight from its JSON instead.
- Nobody played anything for this doc. "Samey" is read from the data, not felt in a run.

## 2. The planning knobs (all exist today)

A plan sets these, in this order. Every one is level data (`levels.js` documents each field).

| Knob | Level field(s) | What it plans |
|---|---|---|
| Length | `segments` (length, curve, grade) | how long the effort lasts; bends and crests |
| Lanes | `lanes`, `narrows`, `median`, `splits` | how much room to choose; where it pinches |
| Direction | `flow` (two-way, one way, all oncoming) | whether the oncoming side is an escape or a danger |
| Clock | `clock` { good, evil } | the pressure (worked out by `level-clocks.mjs`, or set by hand) |
| Time pickups | `pickups` timePlus / timeMinus | whether the clock can be won back |
| Traffic | `traffic`, `trafficCount`, `oncomingCount`, `trafficSpeed`, `drivers` | how full the road is, how fast, how angry |
| Where traffic is | `trafficZones`, `quietZones` | busy and empty stretches (the pacing of traffic) |
| Obstacles | `obstacles`, `shoulderRows` | formations, density, the clean line (`obstacle-patterns.mjs`) |
| Cash and power-ups | `pickups` cash5/10/20, turbo, ghost, siren, wrench... | the reward line, and the risk it lures to |
| Look and stretches | `theme`, `zones` | where one section ends and the next begins |
| Limits | `speedLimit`, `cameras` | where speed is punished |
| Short cuts | `exits` (side roads) | a second route |
| A few gimmicks | any existing one | at most 2 or 3 kinds, chosen for the archetype |

**Replays:** changing a level's data changes that level's own fingerprint, so its saved replays and ghosts no longer
play (`vite.config.js`: level files are fingerprinted per level). Retuning a level later costs its replays.

## 3. Archetypes: twelve recipes from existing mechanics

Each archetype is ONE idea and a way to lay a level out around it. The first four are the owner's. Each recipe has:
the promise, the plan (pacing by distance), the clock, traffic, obstacles, pickups, the few gimmicks it may use, do and don't,
which levels already look like it (facts only), a sketch and the risks. All of it is level data unless a line says otherwise.

Words: **clean run** = the ghost's time (`cleanrun.js`). **Beat** = one thing on the road. **Design speed** = the top
speed of the tier's fastest car (the obstacle doc's rule: lay for the fastest, it is fair for the slower).

### 3.1 TIME UPKEEP (the owner's; was "Time Rush" in the first draft)

- **Promise:** "You never have enough time, but the road keeps giving you some."
- **The idea:** the clock starts short of what the road needs and is kept up by time pluses. The player is always
  chasing the clock and is paid for every risky grab. The car is always flat out.
- **Plan:**

  | Stretch | What happens | Time pluses |
  |---|---|---|
  | 0 to 10% | calm, one easy plus in the first 200 m (the player learns the deal) | 1, easy |
  | 10 to 60% | a plus every 200 to 350 m; every third or fourth one risky (far lane, oncoming lane, beside a minus) | the bulk |
  | 60 to 75% | rest: easy pluses in pairs across two lanes | 2 to 3, easy |
  | 75 to 95% | the hardest grabs | 2 to 3, risky |
  | last 400 m | two pluses in a row, then the drop | 2 |

- **Clock:** the start clock is 0.35 to 0.7 clean runs (Good), less for Evil. Each plus is +10 s. Rule of thumb: a good
  run that gets about 70% of the pluses arrives with 5 to 15 s to spare; under half lands in the tip countdown (10 s of
  draining tip, `game.js`); under a third times out. **City Suburbs today:** 35 s Good for a 104 s clean run, so even a
  perfect ghost needs 7 of its 11 pluses (6 with the countdown); Evil (25 s) needs 8 (7). A real run with traffic needs
  more.
- **The clock rule (the only code piece, and optional):** today's rule (1.5 clean runs, less 5 s a plus) does NOT make a
  Time Upkeep: it hands back half of every plus up front. A hand-set clock works today, as City Suburbs shows. Later, a
  SMALL change could let a level say `"clockRule": { "kind": "upkeep", "good": 0.5, "evil": 0.4 }` so `cleanrun.js` /
  `level-clocks.mjs` work it out (share of clean run, no deduction). `cleanrun.js` is replay logic (fingerprint
  changes).
- **Traffic:** medium (it is what makes the far-lane plus risky); two-way, so the oncoming lane is a real risk.
- **Obstacles:** few; beside pluses, never on the only way to one.
- **Pickups:** time pluses are the main pickup; a time minus beside some pluses as the trap (Suburbs puts two minuses
  at the same spot as a plus in the next lane). Cash rows on the risky line.
- **Gimmicks:** none needed; at most cushions or a side road short cut with pluses on it. Never one that holds the car
  (no stop/go, school crossing, drawbridge wait, ice-cream queue).
- **Looks like this today:** **City Suburbs (8)** (unplayed here). Roadworks is not one: its idea is the diversions
  (3.7).
- **Must not:** the car never stops; no unavoidable bust; no plus only reachable through an unmissable hit; the clock
  never runs out before the first plus; a minus never alone in a lane the player is forced into.
- **Risks:** too tight is a fail screen; traffic can block a plus (put pairs on long levels); tune with a real run, not
  only the ghost.
- **Sketch:** "Paper Round". Suburb, 3 km, two-way 2 + 2. Clock 50 / 40 s; 14 pluses, every third in the oncoming lane
  or beside a minus; cushions by the school; one side road with two pluses.

### 3.2 OBSTACLE COURSE (the owner's: Construction Site, the Mall)

- **Promise:** "Thread the course flat out."
- **The idea:** the still obstacles ARE the level. Little or no traffic, so the course is the same every run and can be
  learned. One clean line always exists.
- **What the examples are today (read from their files):**
  - **Construction Site (17, `construction`):** a road being built through a site. 3.2 km, 3 lanes one way, traffic 4
    (pickups and minivans). 107 obstacles, about 3.3 a 100 m (12 to 22 per 500 m), median gap 21 m: portaloos 26,
    sewage 21, piles 19, cones 16, beams 16, barriers 9; spread over all three lanes (44 / 25 / 38). Gimmicks: 10 rows
    of dancing portaloos (`potties`, every 250 to 350 m), 7 mud stretches, 11 machines crossing, 19 site works on the
    shoulders. No cash at all; 2 time pluses, wrenches, ghosts, bad petrol. Clock 246 / 174 (an older shape than the 1.5
    / 1.15 rule; not re-checked: the tool stalls). It is dense but busy with everything at once.
  - **Mall Dash (hidden, `mall-dash`):** a sprint through mall halls. 3.0 km, 2 lanes one way, NO traffic. 60 obstacles
    (35 solid: planters, benches, kiosks, play blocks...), 2 a 100 m, median gap 40 m, 7 formations. Gimmicks: wet floor
    patches, 3 travelator boost pads (with handrails), 3 dead-end lanes, 3 tug crossings, rolling trolleys. 45 cash.
    Clock 125 / 95 (1.38 clean runs). The audit finds 3 unfair groups (seen 10 to 20 m ahead round a hall's bend).
- **Plan (by section, the obstacle doc's "call and response", `OBSTACLE-STAGE-DESIGN.md` §6):**

  | Stretch | Formation (from the pattern catalogue) | Barriers per 100 m |
  |---|---|---|
  | 0 to 150 m | nothing (the start rule) | 0 |
  | first 15% | a single GATE (one decision) | 0.5 |
  | then | a ZIPPER or short GATE RUN (two rows) | 1 to 2 |
  | breather | 3 s open road (120 m at 40 m/s), a cash row | 0 |
  | middle | a GATE RUN or a CHICANE on the level's bend | 2 to 3 |
  | breather, then a guide | DIAGONAL into a TAPER where the road narrows | 1 to 2 |
  | feature | the formation of its geography (BLIND CREST on a hill, CHICANE on a bend) | 2 to 3 |
  | climax | a SLALOM | 3 |
  | last word | a BOOKEND, at least 60 m short of the drop | 1 |

  Average: 3 to 6 formations a level, 10 to 15 barriers a km plus themed singles (the doc's figure). Construction
  Site's 33 a km is the ceiling, not the target.
- **Spacing (measured, `obstacle-patterns.mjs kinematics`):** a lane change takes 0.68 s; between rows of one formation
  at 40 m/s leave 29 m for a nudge, 47 m for a two-lane step, 62 m for the full swing; the first row in plain sight 70 to
  101 m ahead. **A one-lane step is only a nudge:** to make the player really change lane, consecutive openings must be
  two lanes apart. Lay patterns with `node scripts/obstacle-patterns.mjs <pattern> --lanes n --s m` and check with
  `node scripts/obstacle-audit.mjs <id> --strict`.
- **Width:** 3 or 4 lanes one way is the best canvas (room for gates and swings). On 2 lanes (the mall) only gates,
  islands and dead ends work. One lane at a time (a narrows) is for the taper and the climax only.
- **Clock:** 1.3 to 1.4 clean runs: a clean line is fast, each hit costs speed (34 health and 40% of speed for a
  barrier).
- **Traffic:** none or very light (traffic drives through obstacles and can park in a gap: the doc's rule 8). Use
  `quietZones` density 0 over formations if the level has traffic.
- **Pickups:** cash as the REWARD LINE: a row through each formation's hardest opening, and a cash row in every
  breather. A turbo after the climax. Two time pluses at most.
- **Gimmicks:** at most two, in theme: portaloos and mud (Construction Site), wet floor and dead ends (the mall). Not
  machinery and site works and mud and portaloos all at once.
- **Obstacles themed and readable:** the theme's swap of the plain kinds (`themes.js`); the standard `barrier` for
  walls. No new moving explodable obstacles.
- **Slalom** (from the first draft) is not a separate archetype: it is this recipe's climax, or the whole level on a
  narrow road.
- **Looks like this today:** Construction Site and Mall Dash (above); Oh Mine! (S4, 86 obstacles a km, on water);
  Steelworks Run (hidden, 33 obstacles, but all singles, no formations).
- **Risks:** unreadable at top speed; obstacles hidden by bends and crests (the cause of every unfair group found).
- **Sketch:** "Footings". Construction theme, 3 km, 4 lanes one way, no traffic. Gate, zipper, gate run on the
  bend, taper into a narrows, portaloo row as the climax, bookend. 12 barriers a km, cash through every hard gap.

### 3.3 RUSH (the owner's: Big Business)

- **Promise:** "Short, fast, flat out through a full road."
- **What Big Business (4) is today:** 2.4 km of downtown, one way, 4 lanes all the player's way, default traffic (16
  cars at once, 9 kinds, police 0.08), 13 turbos "lined up like parking meters", 19 cash in rows, 5 single barriers,
  one side road round a jam. No gimmick kinds. Clock 125 / 95 (1.52 clean runs: the default rule).
- **The idea:** a sprint. Short, one clear direction, a full road you blast through with turbos. No set pieces.
- **Plan:**

  | Stretch | What happens |
  |---|---|
  | 0 to 15% | launch: a turbo in each of two lanes, light traffic |
  | 15 to 70% | dense traffic, a turbo every 150 to 250 m on alternating lanes, cash rows between |
  | 70 to 85% | the one short cut (a side road) or the one jam to go round |
  | last 15% | the run-in: a last turbo, the drop |

- **Clock:** hard: 1.2 to 1.3 clean runs (today's Big Business has 1.52, so it is a Rush in layout but not in clock).
  No time pluses: the turbos are the way to beat it.
- **Traffic:** dense, one way: `trafficCount` 16 to 24, mixed speeds (slow vans and buses as moving blockers).
- **Obstacles:** almost none (the traffic is the obstacle).
- **Pickups:** turbos on risky lines (between two slow vehicles, in the lane about to close); cash in rows behind them.
- **Gimmicks:** none, or one side road.
- **Length:** 1.5 to 2.5 km, 60 to 90 s.
- **Looks like this today:** Big Business in layout (its clock is the default 1.52); Turbo Quay and Neon Edge (event
  maps, 1.2 clean runs); Pocket Town (event map, 1.7 km).
- **Risks:** a turbo into a van's back is a wreck: lines must be readable. Tier 1 cars may be too slow for a hard clock.
- **Sketch:** "Lunch Hour". City, 2 km, 4 lanes one way, 20 cars. Ten turbos, a side road at 1.4 km, clock 1.25
  clean runs.

### 3.4 RUSH HOUR (the traffic is the idea)

- **Promise:** "The road is full. Find the gaps."
- **The idea:** traffic itself, slow and thick, with moods. The skill is reading gaps, not going fast in a straight line.
  Different from Rush: longer, slower, two-way, and the clock is normal.
- **Plan:**

  | Stretch | Traffic | What happens |
  |---|---|---|
  | 0 to 20% | medium | learn the flow |
  | 20 to 45% | thick | first jam; a siren pickup before it |
  | 45 to 55% | light (`quietZones`) | rest, cash |
  | 55 to 85% | thickest, angry drivers | convoys, a lane closing (`narrows`) |
  | last 15% | medium | the run-in |

- **Clock:** normal (1.5 clean runs: the clean run ignores traffic, so the traffic is the pressure).
- **Traffic:** `trafficCount` 20 to 30 and `oncomingCount` 10 to 15 (pool of 80), `trafficZones` for the waves, `drivers`
  with more angry ones, slow kinds (buses, vans, learner drivers), `convoys` once or twice.
- **Obstacles:** almost none.
- **Pickups:** siren (traffic pulls over), ghost (through everything), cash in the gaps.
- **Gimmicks:** at most one in theme (a `processions` funeral, a parade in Mumbai).
- **Looks like this today:** Garden City (11, no gimmicks today), Mumbai (29), Hong Kong Harbour (27), Ring Road (24), All Heck (S1,
  all oncoming), Grand Boulevard (event map).
- **Risks:** frame rate with many cars on a phone (not measured); unfair if the jam leaves no gap.
- **Sketch:** "Gridlock". Mumbai, 3.5 km, two-way 2 + 2, 26 / 12 cars. Two thick waves with a siren before each, a
  quiet market stretch with cash, a convoy at 70%.

### 3.5 LONG HAUL (endurance)

- **Promise:** "A long road. Stay sharp to the end."
- **The idea:** distance. Long calm stretches with something to pass; busy "towns" now and then.
- **Plan:** open road (800 to 1500 m, one beat each), a town (400 m, busy), repeated 3 or 4 times; the last town the
  busiest. Use `zones` for each stretch and `trafficZones` / `quietZones` for town and country.
- **Clock:** 1.4 to 1.5 clean runs; 2 or 3 pluses at the towns.
- **Traffic:** light in the country, heavier in towns; slow tall vehicles to pass on the open road.
- **Pickups:** a wrench before each town (damage piles up); cash in towns; a bigger tip.
- **Gimmicks:** one or two in theme (`crosswinds`, `lowSun`).
- **Looks like this today:** Sydney to Kiama (13, the only long one), Northern Lights (37), Cattle Drive (51), Dakar Dash (hidden). Not
  Endurance Road (event map): it is 2.5 km with a rival.
- **Risks:** boring if the country has nothing to see; load time and memory on a long road (not measured).
- **Sketch:** "Coast to Coast". 12 km, coast and outback zones, 2 + 2. Towns at 3, 7 and 11 km, each with a plus and a
  wrench; low sun on the long straight; one crosswind bridge.

### 3.6 TOP SPEED (boost chain, existing pads and ramps)

- **Promise:** "How fast can your car really go?"
- **The idea:** keeping top speed. Built so a fast car stays fast, and a slow line is punished. The owner's most
  important stat on show.
- **Plan:** long straights and sweeping bends; boost pads (`boostPads`, +12 m/s for 2.5 s) laid so the next starts as
  the last ends; a jam ramp (`jamRamps`) mid-level; crests (a segment's `grade` / `ease`) for airtime near the end.
- **Clock:** tight: 1.25 to 1.35 clean runs (the level gives speed back).
- **Traffic:** light, spaced (`trafficCount` 6 to 10), one way.
- **Obstacles:** few, never on a pad's lane or within 1.5 s of its end (the obstacle doc's rule 7).
- **Pickups:** turbos on the fast line; cash that sits on it.
- **Gimmicks:** pads, one jam ramp, crests. Nothing that slows.
- **Looks like this today:** Vegas Strip / by Night (hidden: pads and ramps), Stunt Double (47), Turbo Quay (event map).
- **Risks:** a slow car feels hopeless: tier gating must match. Pads chained by hand only (a real chain bonus is parked,
  4.8).
- **Sketch:** "Runway". Airport, 4 km of runway, 4 lanes. Five pads in two strings, one jam ramp, a crest at 3.2 km.
  Clock 1.3.

### 3.7 LANE READER (existing dead ends, pillars, diversions)

- **Promise:** "One lane is right. Read it in time."
- **The idea:** lanes close, shift, end or turn against you; signs say which. A puzzle solved at speed.
- **Plan:** a sign, 150 to 250 m to think, the move, a short rest; 5 to 8 such moves, each a little harder.
- **Clock:** normal; a wrong choice costs seconds, not the run.
- **Traffic:** light; it follows the diversions (`roadworks.js`).
- **Pickups:** cash in the lane that is hard to read; a ghost before a shutter dead end.
- **Gimmicks (pick two):** `diversions` (merge, shift, contraflow), `deadEnds`, `pillars`, `reversible`, `tarmac`,
  `lowBridges` (`lanegimmicks.js`, `roadworks.js`, `gambles.js`).
- **Looks like this today:** **Roadworks / Roadworks by Night (hidden)**: a lane closed, lanes shifted, a
  contraflow, fresh tarmac, keep to the limit (their clock is loose: 2.04 clean runs). Metro Run (hidden), Night Shift (54).
- **Must not:** a wall dead end only with a sign and bell, another lane always open (the level check reports one that
  would close the road).
- **Sketch:** "Diversion". Roadworks, 3.4 km. Five shifts and two contraflows, one shutter dead end with a ghost
  before it, clock 1.5.

### 3.8 BLIND RUN (existing fog, night, spray, dust, low sun)

- **Promise:** "You can't see far. Read the road."
- **Plan:** clear, blind, clear: each clear stretch shows what the blind one will hold. Three or four blind patches.
- **Clock:** a little loose (1.6): the player will lift.
- **Traffic:** medium; in spray and dust it is what hides the road.
- **Obstacles:** only where there is a tell (a sign, cushions before the fog bank, a tall vehicle's shadow).
- **Gimmicks (pick one or two):** `fog`, `spray`, `dust`, `lowSun`, a night theme, `tunnels`.
- **Looks like this today:** Night Drive (6), Monsoon (56), Spring Thaw (52), Haunted Hollow (hidden), Solstice Cliffs (event map).
- **Must not:** no hard hit inside a blind patch without warning.
- **Sketch:** "Pea Souper". Coast at dawn, 4 km, three fog banks, low sun between, lorry spray in the last.

### 3.9 RIVAL (pace)

- **Promise:** "Beat them to the door."
- **The idea:** another courier is the clock. The tip goes to whoever is first (`game.js` tip; `CONFIG.rival`).
- **Plan:** the rival starts ahead; a short cut (a side road) at mid-level lets the player pass; the last km a straight
  fight with traffic.
- **Clock:** loose (1.6 or more); the rival is the pressure.
- **Traffic:** normal; the rival throws packages.
- **Gimmicks:** `rival` / `rivals` in the level; one side road.
- **Looks like this today:** Rival Run (S7), Showdown (S8), Toy Box Derby (44), Endurance Road and Dakar Dash (hidden). 
- **Risks:** the rival's pace follows the player's top speed (0.96 to 1.0 of it), so a fast car gains nothing.
- **Sketch:** "Last Drop". Night city, 4 km, one rival, side road at 2 km, a jam ramp in the last km.

### 3.10 CLIMB (existing grades and crests)

- **Promise:** "Up the mountain and back down, faster than is wise."
- **Plan:** a long climb (calm, switchbacks, slow lorries to pass), the summit (one set piece: a tunnel or a view), a
  fast descent with crests and shade ice in two bends.
- **Clock:** 1.5.
- **Traffic:** light, slow on the climb.
- **Gimmicks (pick two):** crests (`grade`, `ease`; `CONFIG.crest`), `rockfall` only under a rock face, `shade`, `ice`.
- **Looks like this today:** Mountain Pass (21), Stelvio (30), Panorama Avenue (19), Alpine Pass (hidden), Mudslide (55, downhill),
  Favela Heights (42), Cinder Island (39).
- **Sketch:** "Col". Alpine, 4 km: 2 km of switchbacks up, a tunnel at the top, 2 km down with three crests.

### 3.11 SHORT CUT (fixed side roads; the data-only fork)

- **Promise:** "The long way or the quick way?"
- **The idea:** route choice with what exists: side roads (`exits`, always on the right) that rejoin. Each fork is a
  FIXED bet: the side road is shorter but rough (washboards, a ford, a low bridge for tall cars), or longer but clear
  with pluses on it. The random version (left or right, good or bad each run) is the owner's idea and needs code: 4.1.
- **Plan:** a fork every 800 to 1200 m, branches 400 to 700 m, a calm merge after each; 3 forks.
- **Clock:** set for the slow branch, so the fast branch is the medal.
- **Gimmicks:** `exits`, `lowBridges`, `fords`, `washboards`, `jamRamps` (`gambles.js`).
- **Looks like this today:** Quarry Run (26), Market Town (25), Ring Road (24), Emerald Steps (43), Jungle Highway (hidden).
- **Sketch:** "Crossroads". Countryside, one way, 4 km, three side roads: a ford, a low bridge, a clear one with two
  pluses.

### 3.12 SPEED TRAP (police gauntlet, existing cameras and roadblocks)

- **Promise:** "Every cop in town is out. Get through."
- **Plan:** quiet streets, a camera zone, a roadblock, a rest; three rounds, each harder.
- **Clock:** 1.5.
- **Traffic:** police share above the usual 0.03 to 0.04 in `trafficZones` (none elsewhere), `speedLimit`.
- **Gimmicks:** `cameras` (a fine first, a bust after), `roadblocks` (always a gap), siren and radar pickups before them.
- **Looks like this today:** Speed Trap Alley (20), Tokyo Expressway (28), Neon Edge (event map).
- **Must not:** no roadblock without a gap or a pickup before it.
- **Sketch:** "Dragnet". City at night, 4 km, three camera zones, two roadblocks each with a siren 300 m before.

## 4. Parked ideas: need new gimmicks

Not for now (the owner: plan levels with what exists). Kept because they are interesting and worth revisiting. Each:
the idea, why it is interesting, what it needs, and which archetype it would unlock.

**Replay note for all of them:** any change to a rules file (`game.js`, `player.js`, `track.js`, `collision.js`,
`traffic.js`, `cleanrun.js`, `lanegimmicks.js`, `hazards.js`... everything `vite.config.js` `logicFiles()` follows)
changes the game's rules fingerprint, and every saved replay and ghost made before stops playing. A version bump and the
owner's OK each time. Anything random must use the run's seeded dice (`util.js` `random` / `swapDice`) so a replay rolls
the same.

### 4.1 THE FORK: left or right, very good or very bad (the owner's idea; also a Vegas level concept)

- **Idea:** a one-way level where the road splits LEFT and RIGHT. Each run the game makes one branch very good (short,
  clear, time pluses, cash) and the other very bad (longer, washboards, a jam, a slow convoy). The player sees it only as
  the fork comes up, or reads a tell (a board, traffic turning off, smoke). On a Vegas level it is the casino bet: red or
  black, double or nothing.
- **Why:** real choice under pressure, a new run every time, and it is the owner's own idea.
- **Needs:** (a) MEDIUM: branch contents rolled each run on today's right-hand side roads (`exits` with two content sets,
  rolled with the seeded dice), plus a tell (a board, SMALL). (b) LARGE for a true LEFT / RIGHT split: today a side road
  only forks off the right (`track.js` exits), and a `split` only moves the oncoming side away. A two-branch road needs
  `track.js` geometry, `render/road.js`, traffic routing and the ramps. The clock tool times one roll (seeded by the
  level id): the clock must be set for the bad branch. Rules files: replays change.
- **Unlocks:** the random version of SHORT CUT (3.11); a Vegas "bet" level; Time Upkeep variants (pluses on the good side).
- **Must not:** the bad branch is never a dead end, a stop or a bust.

### 4.2 Slot-machine gantry (Vegas)

- **Idea:** one gantry across all lanes. As the player comes near its reels spin, then settle well ahead (at least the
  70 to 100 m a lane change needs at speed); each lane shows a symbol: cash, boost, nothing, or a small hazard (a cone's
  knock). What the lane shows is what that lane gets just past the gantry.
- **Why:** a split-second lane choice that fits Vegas exactly; a reward line that changes every run.
- **Needs:** a new gimmick (a list in the level, logic like `lanegimmicks.js`, a model in `render/`), seeded rolls, a
  settle time tied to the player's speed. MEDIUM. Rules files: replays change.
- **Unlocks:** a Vegas Time Upkeep or Top Speed level with a gamble in each lane; SHORT CUT without side roads.

### 4.3 Heat: a police car that chases you

- **Idea:** an interceptor follows the player for a stretch; shake it off with speed, a siren, a ghost, a side road.
- **Why:** a real pursuit; the existing `pursuits` are only a sight (`pursuit.js`).
- **Needs:** a following driver for a police car, rules for what it does on contact (never a bust without a way out).
  LARGE. Rules files.
- **Unlocks:** a stronger SPEED TRAP (3.12).

### 4.4 Rhythm Road: everything in time with the music

- **Idea:** obstacles and timed gimmicks laid to a beat (verse, chorus, bridge); the portaloos, water mains and crossings
  on one tempo with the music.
- **Why:** a level that feels like a song. Today it can only be laid by hand at fixed spacing (speed x beat).
- **Needs:** a level tempo that sets every timed gimmick's period and phase, and the music started in step. LARGE.
  Rules files (timings) and sound.
- **Unlocks:** a Rhythm archetype; an OBSTACLE COURSE with a beat.

### 4.5 Fragile cargo

- **Idea:** the cargo has a condition; knocks, jumps and cushions hurt it; the tip scales with it.
- **Why:** "fast but careful" is a new tension. Cargo is only a sight today (`cargo.js`, HUD corner).
- **Needs:** a condition (0 to 100%), what hurts it, the tip, the HUD. MEDIUM. Rules files. Check against the owner's
  "no delivery variants" rule.
- **Unlocks:** a Fragile archetype (Christmas presents, wine, a cake).

### 4.6 Attrition: a wreck that costs more

- **Idea:** health is the clock: radiation, fords, gunfire wear the car down; a wreck costs tip or cash on such a level.
- **Why:** today a wreck is a 4.5 s respawn (`CONFIG.respawnTime`), so health hardly matters.
- **Needs:** a level setting for the wreck's cost, a clearer health bar. MEDIUM. Rules files.
- **Unlocks:** an Attrition archetype (Hot Zone, The Hood, the Battlefield).

### 4.7 Escape: the threat behind you

- **Idea:** a visible wall (lava, a wave) follows the car; caught, the car is slowed, never stopped.
- **Why:** a second clock you can see in the mirror. Today the tide (`tide.js`), filling fords and blasts "ahead"
  (`wreckage.js`) give a taste of it.
- **Needs:** the threat, its pace (tied to the player's), its effect, its model. MEDIUM. Rules files.
- **Unlocks:** an Escape archetype (Eruption Day, Airport Apocalypse, Passage du Gois).

### 4.8 Smaller helpers (each SMALL)

- **Time Upkeep clock rule:** `"clockRule": { "kind": "upkeep", "good": 0.5, "evil": 0.4 }` worked out by
  `cleanrun.js` / `level-clocks.mjs` (rules file). Optional: a hand-set clock works today. Plus a "+10" flash at the
  clock (render only).
- **Boost chain:** a second pad within a few seconds adds to the first (`lanegimmicks.js`, rules). For TOP SPEED.
- **Near-miss bonus:** cash for passing close to traffic (none exists today). For RUSH and RUSH HOUR.
- **Clean-section bonus:** a call-out and cash for a formation passed without a hit. For OBSTACLE COURSE.
- **Distance to go** on the HUD (render only). For LONG HAUL.

### 4.9 Escort / convoy pace

- **Idea:** stay near a slow vehicle and protect it.
- **Why parked:** a large follow-and-protect system, and it fights "top speed matters most". LARGE.

## 5. How to use this, and a template

**This is a reference, not a rework plan.** No level is to be changed because of it (the owner, 16-Oct: "Don't rework
levels yet, just have a set of instructions and archetypes").

When a NEW level is planned (or, later, when the owner asks for one to be retuned):

1. Pick ONE archetype from section 3. Write it as one sentence: "A Time Upkeep on a suburb."
2. Copy the template below and fill it in BEFORE writing the level file.
3. Follow the recipe's pacing table: lay the road, then the traffic, then the obstacles, then the pickups.
4. Use only the gimmicks the recipe names, two or three kinds at most, in the level's theme. If it needs more, it has
   two ideas: drop one.
5. Obstacles: lay them with `node scripts/obstacle-patterns.mjs`, check with `node scripts/obstacle-audit.mjs <id>
   --strict`. Themed kinds, readable at a glance; no new moving explodable obstacles.
6. Clock: from the recipe. Work it out with `node scripts/level-clocks.mjs <id>` (never `--write` without the owner),
   or set it by hand where the recipe says so (Time Upkeep).
7. In the CHECKLIST item: the archetype, and what was and was not played.

Always: the car is never stopped or held; no bust without counterplay; top speed is the stat that matters.

### Template (one page)

```
LEVEL: <name>    THEME: <theme>    ARCHETYPE: <one of section 3>
ONE SENTENCE: ...
PROMISE TO THE PLAYER: ...
ROAD: length __ km; lanes __ / __; one way or two-way; bends, hills, narrows
PACING TABLE:
  0-__%   ...
  __-__%  ...
  last __% ...
CLOCK: __ x clean run (Good), __ (Evil), or by hand: __ / __ s; time pluses: __, where
TRAFFIC: __ cars your way, __ oncoming; kinds; busy and quiet zones
OBSTACLES: __ per km; formations (gate, zipper, slalom...); themed kinds; the clean line
PICKUPS: cash rows (the reward line), power-ups, pluses / minuses
GIMMICKS (2 or 3 at most): ...
MUST NOT: never stop the car; no bust without counterplay; ...
RISKS: ...
CHECKS: level-clocks; obstacle-audit --strict; what was played by hand
```

## 6. Questions for the owner

1. Are these 12 archetypes the right set? Strike any out, or add one.
2. Time Upkeep: start the clock at about half a clean run, a plus every 200 to 350 m. Right?
3. City Suburbs is already a Time Upkeep (35 s for a 104 s road). Was that on purpose?
4. Obstacle Course: lay courses as formations (gates, zippers, slaloms) from the obstacle doc, no traffic. OK?
5. Rush: a clock as hard as 1.2 to 1.3 clean runs, with no time pluses. Too hard?
6. Rush vs Rush Hour: Rush = short and fast with turbos; Rush Hour = long, slow, full road. Is that the split you mean?
7. A level's gimmicks: two or three kinds at most. Agreed?
8. Which parked idea (section 4) first, when the time comes? The Fork?
9. The clock tool stalls on 37 levels today. Fix that first?

## Appendix: levels that already look like an archetype (facts only)

No rework is proposed here. These are the levels whose data already follows a recipe, as read on 16-Oct.

| Archetype | Levels that look like it today |
|---|---|
| Time Upkeep | City Suburbs (8) |
| Obstacle Course | Construction Site (17), Mall Dash (hidden), Oh Mine! (S4) |
| Rush | Big Business (4, layout), Turbo Quay and Neon Edge (event maps) |
| Rush Hour | Garden City (11), Mumbai (29), Grand Boulevard (event map) |
| Long Haul | Sydney to Kiama (13) |
| Top Speed | Vegas Strip / by Night (hidden), Stunt Double (47) |
| Lane Reader | Roadworks / by Night (hidden), Metro Run (hidden) |
| Blind Run | Night Drive (6), Monsoon (56) |
| Rival | Rival Run (S7), Showdown (S8), Toy Box Derby (44) |
| Climb | Mountain Pass (21), Stelvio (30), Panorama Avenue (19), Alpine Pass (hidden) |
| Short Cut | Quarry Run (26), Ring Road (24) |
| Speed Trap | Speed Trap Alley (20), Tokyo Expressway (28) |
