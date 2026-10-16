# Obstacle stage design: formations built from one standard obstacle (DRAFT, 16-Oct)

The owner asked for "better obstacle stage design that isn't just 'random small junk on the middle of the lane in
northbound'", using only the standard exploding obstacle. This is a draft design language with numbers, two tools that
lay and check it, and a hidden lab level that shows every pattern: `?hidden=obstacle-lab` (not `?level=`, which takes a
menu number). Nothing in the existing levels was changed.

Everything below about fairness comes from **simulation**, not from play. Nobody has driven these layouts by hand.

## 1. The standard obstacle: `barrier`

`barrier` (config.js `obstacleKinds.barrier`: 34 damage, keeps 0.6 of the speed; collision.js `SIZE.barrier`: 2.4 m wide,
1.2 m long, 1.2 m tall). Why this one:

- **It is the game's default.** `Collision.loadLevel` uses `o.kind || 'barrier'`. The schema and the editor default to it too.
- **It makes walls.** A lane is 3.5 m wide, so two barriers in neighbouring lanes leave 1.1 m between them, and no car fits
  (the narrowest car is 1.48 m wide). A row of barriers reads as a wall. Crates are 1.2 m wide and leave 2.3 m between
  neighbours, which a car could squeeze through. That gap would be a puzzle about the gap instead of about the lane.
- **A hit hurts.** It costs a third of the speed and a third of a car's health, and it stuns the steering for 0.6 s
  (`stunTime` x 0.5). A cone (3 damage) is not an obstacle in this sense.
- **Theme swaps cost the same.** `barrierBlock` (roadworks), `rebarBundle` (steelworks), `velvetRope` (Vegas) and
  `snowBlock` (alpine) have the barrier's box and its cost (`.obstacles-check` holds them to it). A formation laid in
  `barrier` keeps its geometry on those themes.

**Allowed variants:** none of the other plain kinds cost the same. Bale is 38 / 0.75 and 2.2 m wide; crate is 31 / 0.75
and 1.2 m wide; cone is light. So the design uses `barrier` and nothing else. Theme swaps of it are an open question (§9).

## 2. The numbers everything is built on

Measured from the code, not assumed:

- **Steering** (player.js; numbers in config.js): sideways speed heads for `steer x steerSpeed (9 m/s) x agility` at
  `steerResponse (10/s) x sqrt(agility)`. The car is yawed by `atan2(latVel, speed) x yawGain 1.3` (at most 25°).
  `scripts/obstacle-patterns.mjs stepLateral` repeats this step for step, and both tools use it.
- **Lane change** for the reference car (the Sportscompact, 1.7 m wide, agility 1), from steering until settled in the new
  lane. **The times do not depend on speed** (above 4 m/s). The road used does:

  | shift | time | road used at 25 / 40 / 60 m/s |
  |---|---|---|
  | nudge 0.8 m (a lane line straddled) | 0.33 s | 8 / 13 / 20 m |
  | 1 lane (3.5 m) | 0.68 s | 17 / 27 / 41 m |
  | 2 lanes / gate to gate two apart (4.3 m between openings) | 0.78 s (4.3 m) / 1.08 s (7 m) | 27 / 43 / 65 m |
  | full swing across 4 lanes (7.8 m between openings) | 1.16 s | 29 / 46 / 70 m |
- **Mid lane change the car is 2.64 m across** (yawed, at 40 m/s), not 1.7 m.
- **A one-lane step is a nudge, not a lane change.** Take two gates whose gaps are in neighbouring lanes. Their openings
  overlap by 1.1 m, one lane line's width either side. A car sitting on the line gets through both with a 0.8 m nudge.
  The same holds for single obstacles alternating between the two lanes of a two-lane side, which is today's usual layout.
  **To force a real lane change, consecutive openings must be two lanes apart.** The tool works this out (`shiftBetween`).
- **Placement rule in the code:** `Track.problems` calls two items closer than 8 m along the road AND 2 m across "on top of
  another item". So a lane is never used twice within 8 m, and a line of barriers down a lane is one every 10 m (`LINE_STEP`).
  At 40 m/s, 8.8 m of road between barriers is 0.22 s, and in that time a car moves about 1 m sideways, so it cannot slip in.

## 3. Evidence: today's levels

`node scripts/obstacle-audit.mjs --all` (40 m/s, the Sportscompact, only the plain stationary obstacles of each level's
"obstacles"; light ones such as cones and drifting ones are counted but not judged):

- **72 levels have obstacles: 1,231 in all, 641 of them real (non-light) ones.**
- **68% stand alone**: no other obstacle within 30 m. 49% are in the inner lane (the lane by the centre line on a
  two-way road, the middle lanes on a one-way one).
- **76 "formations" in the whole game** (2+ within 30 m). Almost all are in Canberra (11), the construction level (20),
  Mall Dash (7), Turbo Quay and Chianti Run (4 each). Most levels have none.
- Per level (judged / all):

  | level | obstacles | per km | alone | inner lane | formations | at 40 m/s |
  |---|---|---|---|---|---|---|
  | expressway | 5 / 5 | 2.5 | 100% | 40% | 0 | all fair (3.4 s to spare each) |
  | hurricane | 18 / 24 | 7.5 | 100% | 28% | 0 | fair; 1 out of place |
  | steelworks-run | 23 / 33 | 6.6 | 100% | 48% | 0 | fair; 1 seen late (bend) |
  | vegas-strip | 14 / 20 | 3.9 | 100% | 29% | 0 | fair |
  | alpine-pass | 14 / 21 | 4.0 | 71% | 50% | 2 | fair; 6 seen late (bends, crests) |
  | roadworks | 14 / 20 | 4.1 | 71% | 30% | 2 | fair |
  | mall-dash | 35 / 60 | 11.7 | 54% | 0% | 7 | 3 unfair: seen 20 m ahead round a hall's bend, 0.27 s to react |
  | metro-run | 16 / 16 | 4.6 | 100% | - | 0 | 1 unfair: a track barrier seen 30 m ahead in a tunnel bend |
  | gimmick-road-3 | 10 / 10 | 1.3 | 60% | 20% | 2 | 2 unfair: just past crests, 0.63 s |
- **Whole game** (the lab left out) at 40 m/s: 7 unfair groups in 4 levels (Mall Dash 3, Gimmick Road 3 2, Rival Run 1,
  Metro Run 1). 26 groups are passable only by leaving the lanes; these are on one-lane sides (Canberra, Rival Run,
  construction, farm, Mystery Meadows, Chianti Run, Showdown...), where an obstacle in the only lane sends the player onto
  the shoulder (3 s allowed) or into the oncoming lanes. 13 groups are out of place: at the start, at the drop, a boost pad's
  run-out, a tunnel mouth (Erupt 3, construction 2, and one each elsewhere). At 60 m/s: 9 unfair groups (crests and bends on
  Thaw, Jungle Highway, Haunted Hollow, Foliage Run join the list), 23 off the lanes, 11 out of place.
- **What this says:** today's obstacles are fair but ask almost nothing. A single obstacle in one of two lanes, seen 150 m
  off, leaves 3.4 s to react, and the answer is a 0.8 m nudge or one lane change. Alternating singles never ask more than a
  nudge, because the car straddles the lane line. Nothing asks for a plan of more than one move. The few unfair spots come
  from sight lines (bends inside tunnels and halls, crests), not from the obstacles themselves.

Steelworks Run as the example: 33 obstacles, 23 judged; 100% alone; 48% in the lane by the centre line; 0 formations;
gaps 60 to 250 m, median 140 m; no unfair spot at 40 m/s.

## 4. Fairness rules (in numbers)

At the level's DESIGN SPEED `v`: the top speed of the tier's cars, since top speed is the stat that matters. A layout fair at
`v` is fair for slower cars (every spacing grows with `v`). A faster car than designed for has to brake (the brake gives
20 m/s²), so layouts should be laid for the fastest car the tier allows.

1. **Never all lanes shut.** Every row leaves at least one opening of at least `2 x widest half width + 0.6 m` = 2.7 m (the
   widest garage car is about 2.1 m). Barriers are 2.4 m wide, so any opening is a whole lane (3.5 m) or more.
2. **No squeezes.** A gap between two boxes is either a wall (under 1.2 m) or a way through (2.7 m or more), never in between.
   The audit flags `SQUEEZE`.
3. **A clean line from every lane, kept to the player's own lanes.** It is simulated with the real steering, the yawed car
   and 0.25 m of human margin each side. The shoulder (3 s of meter) and the oncoming lanes are escapes, not the designed line.
   The audit flags `OFF_LANES` where they are the only way.
4. **Reaction:** at least **REACT = 0.75 s** from the first row coming into sight (the chase camera's line of sight, over
   crests and round bends, capped at 150 m reading distance) to the last moment steering still finds a line. Laid out, that
   means the first row is in plain sight at least `v x (0.75 + shift time + 0.25)` + lengths: **70 m for a one-lane move and
   101 m for a three-lane one at 40 m/s; 104 / 150 m at 60 m/s.**
5. **Between rows of one formation** (planned together once seen): `v x (shift time + 0.25 s) + 2 x 0.6 + 2 x 1.9 m`.
   At 40 m/s that is 29 m for a nudge, 47 m for a two-lane step and 62 m for the full swing (at 60 m/s: 41 / 67 / 90 m).
   The generator lays every pair of rows to this rule (`gapFor`).
6. **Breathers:** at least 3 s of open road (120 m at 40 m/s) between formations. The audit treats anything closer as one
   group. After a group a player may have hit, allow the 0.6 s stun plus a lane change before the next.
7. **Out of place:** nothing within 150 m of the start or 60 m of the drop. Nothing from 30 m before a tunnel mouth to 60 m
   inside it (the dark closing in). Nothing on a boost pad's lane or within 1.5 s of its end (the car is over its top speed).
   No line of barriers closer than 4 m apart on a bend: obstacles are placed on the lane's lat and turned to the road, so they
   follow a curve without steps. A continuous wall would need continuous geometry.
8. **Traffic:** traffic drives through obstacles, and a car parked in the gap would make a fair formation unfair. Formations
   go where there is no traffic (a quiet zone, `quietZones` density 0, or a level without traffic like the lab). This is a
   rule for the owner to confirm (§9).

## 5. The pattern catalogue

Diagrams: lanes left to right (the player's own lanes; on a two-way road they start at the centre line), `[##]` a barrier,
`..` open; s in metres from the formation's start; laid for 40 m/s by `node scripts/obstacle-patterns.mjs <name> --lanes 4 --meta`.
"Shift" is the least sideways move between consecutive rows (§2).

### GATE: one decision
```
     0  [##][##] .. [##]  gate, gap 2
```
A wall with one gap: find it, be in it. **Parameters:** `gap`. **Fair:** the gap is in plain sight 101 m ahead at 40 m/s
(the farthest lane is three lanes from it). **Fits:** the first formation of a level (it teaches walls), long straights,
after a pad's run-out. On a two-lane side a gate is one barrier, today's single obstacle, but placed as a decision.

### GATE RUN: the gap jumps
```
     0   .. [##][##][##]  gate 1, gap 0
    47  [##][##] .. [##]  + 47 m, shift 4.3 m  gate 2, gap 2
    76  [##] .. [##][##]  + 29 m, shift 0.8 m  gate 3, gap 1
   123  [##][##][##] ..   + 47 m, shift 4.3 m  gate 4, gap 3
```
Gates in a row, each spaced for the shift it asks. Two-lane jumps are lane changes; a one-lane step in between is a breath
(a nudge). **Parameters:** `gaps` (list), `spacing`. **Fair:** each pair at `gapFor`; the whole run is in sight before its
first gate. **Fits:** city straights, the "bigger set" of a rhythm (§6).

### SLALOM: the weave
```
     0   .. [##][##][##]  slalom 1, open 0
    47  [##][##] .. [##]  + 47 m, shift 4.3 m  slalom 2, open 2
    94   .. [##][##][##]  + 47 m, shift 4.3 m  slalom 3, open 0   ...
```
A one-lane way swinging between two lanes TWO apart, in a steady beat: a full lane change each row. (Swinging between
neighbouring lanes would only be a nudge, §2.) **Parameters:** `a`, `b` (default a + 2), `count`, `spacing`. **Fair:**
47 m between rows at 40 m/s (0.78 s shift + 0.25 s). It needs 3 lanes or more. **Fits:** a climax; a long straight.

### ZIPPER: the thread
```
     0  [##] .. [##] ..   zipper, row 1
    29   .. [##] .. [##]  + 29 m, shift 0.8 m  zipper, row 2
```
Two staggered rows: whatever lane you are in, one row has a barrier in it. The way through is to sit ON a lane line and
nudge 0.8 m. A precision pattern, not a lane change. It makes today's "alternating singles" deliberate. **Parameters:**
`spacing`, `start`. **Fair:** 29 m at 40 m/s; it reads as two rows only if the rows are under about 40 m apart. **Fits:**
anywhere a breather would be dull; two-lane sides (one barrier a row there).

### TAPER / FUNNEL: lanes close one by one
```
     0   ..  ..  .. [##]  lane 3 closes      (then a barrier every 10 m down each closed lane)
    30   ..  .. [##][##]  lane 2 closes
    60   .. [##][##][##]  lane 1 closes  ... held 40 m
```
Roadworks without cones. The diagonal shows the open lane well before it narrows to it. **Parameters:** `side`, `open`,
`hold`, `step` (30 m). **Fair:** the open lane is never shut; the diagonal moves one lane every 30 m (0.75 s at 40 m/s),
slower than any car crosses. **Cost:** 24 barriers, a mesh each (render/items.js): use sparingly. **Fits:** before a
narrowing, a bridge, a tunnel; works levels.

### DIAGONAL / ROLLING LINE: a sweep
```
     0   ..  ..  .. [##]
    20   ..  .. [##] ..
    40   .. [##] ..  ..
```
One barrier a lane, stepping across the road: it sweeps the player to one side without closing the road. **Parameters:**
`side`, `stop`, `step` (20 m). **Fair:** trivially (two lanes are always open). **Fits:** a lead-in to a taper or a gate
whose gap is on the swept-to side; it guides without words.

### CHICANE (on a bend): the full swing
```
     0  [##][##][##] ..   chicane in, open 3
    62   .. [##][##][##]  + 62 m, shift 7.8 m  chicane out, open 0
```
Two walls open at opposite edges. On a bend, open on the OUTSIDE first and the inside (the apex) second, the racing line.
The barriers stand on the lanes' own lat, so the formation follows the curve exactly (no staircase). **Parameters:**
`first`, `spacing`. **Fair:** 62 m at 40 m/s (1.16 s swing). On a bend the corner speed caps the car
(`cornerSpeed`, 60 m/s on the lab's 0.006 rad/m), and the audit takes that into account. **Fits:** bends of 0.004 to 0.008 rad/m.

### ISLAND: pick a side
```
     0   .. [##][##] ..   (three rows, 10 m apart: a block 2 lanes x 20 m)
```
A block in the middle with lanes either side: commit early. Cash on one side makes it a choice of greed, not survival.
**Parameters:** `at`, `width`, `length`. **Fair:** two lanes always open. **Fits:** before a fork or exit, a split, a
junction; on 4+ lanes.

### BLIND CREST: trust the gate
```
   -60  [##][##] .. [##]  lead-in gate, gap 2   (in plain sight, before the crest)
    40  [##][##] .. [##]  echo past the crest, gap 2  (hidden until close)
```
A gate in plain sight BEFORE the crest and its echo just past it with the SAME gap. The player who stays in the gate's lane
is safe without seeing the echo. Nothing new is ever hidden. **Parameters:** `crest`, `gap`, `before`, `after`. **Fair:**
the lead-in follows rule 4 for itself; the echo needs no reaction from its gap. The audit checks the echo too, from the
camera's actual line of sight over the hill. **Fits:** hills, humpback bridges, the top of ramps.

### BOOKEND: in, cross the pocket, out
```
     0   .. [##][##][##]  bookend in, gap 0
   120  [##][##][##] ..   +120 m, shift 7.8 m  bookend out, gap 3
```
Two walls with a safe pocket between them (3 s at the speed, at least the swing). It holds a cash line that crosses it.
**Parameters:** `in`, `out`, `pocket`. **Fits:** the last word of a section; near the drop (but 60 m clear of it).

### LANE-SPANNING / BETWEEN LANES (CHECKLIST 93): not possible today
`Track.laneOffset` gives a sensible lat for a fractional lane (lane 1.5 = on the line between 1 and 2), but
**`Track.problems` refuses a non-integer lane** ("its lane is a number, or left or right"), so a level with one fails the
level checks. Allowing it is a one-line change in track.js, a logic file: a replay-rules change with a version bump, plus
the editor's lane picker. What it would give is a barrier on the line between two lanes, spanning lat ±1.2 m around the line.
That leaves each neighbouring lane 2.3 m clear, a SQUEEZE (0.3 m each side of a 1.7 m car). It would also kill the
lane-line straddle, which is the one thing the two-lane sides of today's roads need for real lane-change formations. A
barrier that SPANS two lanes needs its own box and model (`SIZE` per kind), not a stretched one. Not drafted further here.

### CASH LINES: the lure
Cash goes ON the line the formation wants: in each gap, and between rows along the way the car takes
(`cashLine` in the tool, one every 12 m, never within 9 m of a barrier in its lane). On an island it goes on one side only,
the riskier one if anything. Cash never sits where the only way to it is through a barrier.

## 6. Rhythm: how a level uses them

A level has ONE idea; formations are its vocabulary, not a second idea. Call and response:
1. **Call:** a single GATE (one decision), after at least 150 m of open road from the start.
2. **Response:** a two-row formation (ZIPPER or a short GATE RUN).
3. **Breather:** at least 3 s (120 m at 40 m/s), cash in rows.
4. **Bigger set:** a GATE RUN or a CHICANE on the level's bend.
5. **Breather, then a guide:** DIAGONAL into a TAPER where the road narrows.
6. **Feature:** the formation that belongs to the level's geography (BLIND CREST on its hill, CHICANE on its bend).
7. **Climax:** a SLALOM.
8. **Last word:** a BOOKEND, at least 60 m short of the drop.

The lab, audited: 10 groups at 40 m/s, none unfair, none off the lanes, none out of place; every group fair in the lanes up
to 71 m/s (`obstacle-audit obstacle-lab --fairup --strict` passes). Its crest (6% up, 6% down, the default 60 m ease) is
NOT blind to the chase camera (11 m up): the echo is in sight from before the crest, seen in a still. A truly blind crest
wants a sharper hill, which the gambles turn into a jump: a level-by-level choice.

Density: the lab has 85 barriers in 2.75 km (31 per km) because it shows everything. A real level should use 3 to 6
formations, about 10 to 15 barriers per km, plus its themed singles.

## 7. The tools

- `node scripts/obstacle-patterns.mjs list`: the patterns and their parameters.
- `node scripts/obstacle-patterns.mjs kinematics [--speed V] [--agility A]`: the lane-change table above.
- `node scripts/obstacle-patterns.mjs gate --lanes 4 --s 500 --gap 2 [--first 2] [--speed 40] [--meta] [--cash]`: the level
  JSON obstacle entries (`{ s, lane, kind: 'barrier' }`). `--first` is the level's lane number of the player's leftmost lane
  (2 on a two-way 4-lane road). `--meta` prints the diagram; `--cash` adds a cash line.
- `node scripts/obstacle-patterns.mjs lab [--meta]`: the lab level's obstacles and pickups (`LAB` in the file).
- `node scripts/obstacle-audit.mjs <level ids> [--speed 40] [--car sport] [--margin 0.25] [--verbose] [--fairup] [--strict]`:
  the evidence and the fairness of each group. `--verbose` draws each group; `--fairup` finds the highest speed at which
  every group is fair in the lanes; `--strict` exits 1 on any unfair or misplaced group. `--all` gives one line per level.
  `--pattern out.json --lanes 4` audits a generator output on a plain straight one-way road.

How the audit simulates: for each group, from the moment its first row is in sight (or right after the group before), from
EVERY lane of the player's side, the car holds its lane hands-off for `t` s and then steers freely. Each step it tries full
left, none and full right and keeps every line that does not overlap a barrier (the game's separating-axis test, with the
yawed car and the margin). Bisection on `t` finds the latest moment that still works. The car's speed is the design speed,
capped by the bend's corner speed. **It is a perfect driver with 0.25 m of margin and a 0.75 s reaction, not a person.**
It does not model traffic, the shoulder meter's 3 s, the stun after a hit, or touch steering.

Its sight model is approximate. The camera stands 14 m behind and 11 m above the car; a barrier is seen if the line to its
top clears the road surface (crests) and stays within 6 m of the road's edge (beyond that stand the city's buildings; in a
tunnel, 0.3 m: its walls). The cap is 150 m (120 m in a tunnel, 60 m in fog).

## 8. Applying it to existing levels (a follow-up plan: nothing changed now)

1. **Expressway (level 1, the tutorial).** Today it has 5 single barriers 300 to 400 m apart. Re-lay as: a GATE at 350
   (gap lane 3), a ZIPPER at 750 (one barrier a row on its 2 northbound lanes: the line straddle taught), and a GATE at 1400
   (gap lane 2), plus a cash line through each. It stays easy and starts teaching walls and the thread.
2. **Steelworks Run** (4 lanes two-way: only 2 northbound, so no real lane-change formations without the shoulder or
   between-lane placement). Keep its themed singles but group them. ZIPPERS of `ingotStack` (the theme's crate) at the yard,
   a BLIND CREST-style lead-in before each hall's tunnel mouth (60 m outside, never in the mouth), and a GATE pair through the
   rolling mill. Its 10 cones become a DIAGONAL guiding to the pad lane before each conveyor pad (not in the pad's lane).
3. **Vegas Strip** (6 lanes two-way: 3 northbound). Every pattern works on 3 lanes: a GATE RUN (0,2,1) down the Strip, a
   SLALOM (0 to 2) past the fountains, an ISLAND (1 lane) before the ramps, a BOOKEND before the drop. All in `barrier`,
   which Vegas shows as `velvetRope`: the swap keeps the box and the cost.

Each re-lay: generate with the tool, check `obstacle-audit --strict` at the tier's top speed, take stills, then the owner
plays it.

## 9. Open questions for the owner

1. **Difficulty per tier:** lay each level for its tier's top car (fair at that speed), or for the median car and let fast
   cars brake? The spacing grows with speed: a slalom laid at 40 m/s needs 47 m between rows, at 60 m/s 67 m.
2. **Two-lane sides** (most levels): real lane-change formations need 3+ lanes. On two lanes the options are the zipper
   (a nudge), using the shoulder as part of the line (3 s meter), or allowing barriers ON the lane line (CHECKLIST 93: a
   logic change with a version bump). Which?
3. **Shoulders:** should formations close the shoulders (barriers at lane 'left'/'right') so the shoulder is not a way
   round a gate? Above about 71 m/s the lab's formations are no longer fair in the lanes (`--fairup`); at 90 m/s the simulated
   line goes round them on the shoulder.
4. **Theme swaps:** may formations use the theme's barrier swap (`rebarBundle`, `velvetRope`, `snowBlock`, `barrierBlock`)?
   It is the same box and cost, and "obstacles fit the level" says yes. And on themes without one, is a plain barrier right?
5. **Traffic in formations:** quiet zones over every formation, or traffic that avoids barrier lanes (traffic.js would need
   to read the obstacles: a logic change)?
6. **Sizes:** is a 2.4 m barrier (two make a wall) the right standard, or should a formation kind be a full lane wide
   (3.5 m, its own model) so a wall has no seams?
7. **How many per level:** 3 to 6 formations (10 to 15 barriers per km) as proposed?
