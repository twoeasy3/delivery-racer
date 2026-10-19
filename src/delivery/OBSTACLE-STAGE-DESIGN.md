# Obstacle stage design: formations built from one standard obstacle (DRAFT, 16-Oct)

The owner asked for "better obstacle stage design that isn't just 'random small junk on the middle of the lane in
northbound'", using only the standard exploding obstacle. This is a draft design language with numbers, two tools that
lay and check it, and a hidden lab level that shows every pattern: `?hidden=obstacle-lab` (not `?level=`, which takes a
menu number). Nothing in the existing levels was changed by the draft itself. **17-Oct additions:** rule 8 now says traffic everywhere except a
short quiet zone round each formation, rule 9 says both sides of a two-way road carry obstacles, cash is no longer laid round
formations (§5, CASH), and two opt-in experiments were added: FREE-POSITION SLOTS (§5c, the way through is a slot centred anywhere) and MOVERS (§5d).

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
   The audit flags `SQUEEZE`. The exception is a deliberate SLOT wall (§5c, free-position obstacles), whose gaps are slots of 2.2 to 2.7 m
   judged by width against the car (`SLOT_TOO_NARROW`).
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
8. **Traffic: everywhere, except a short quiet zone round each formation** (the owner, 17-Oct: "a lively road"). Traffic
   drives through obstacles (it slows to 0.6 of its speed as it passes through one), and a car parked in a gap would make a
   fair formation unfair. So the road keeps its traffic, and each FORMATION (2 or more obstacles within 30 m) gets a
   `quietZones` entry `{ from, to, density: 0 }` from **28 m before its first row to 10 m past its last**; nothing else is
   quiet (no zone over a whole straight, no level-long quiet). A single obstacle needs no zone. Oncoming formations
   (rule 9) get theirs too (a zone covers both ways). `obstacle-patterns.mjs <pattern> --quiet` prints the zones; the audit
   flags `TRAFFIC` (out of place, `--strict` fails) a formation on a level with traffic that is not covered from 25 m
   before to 7 m after. The lab, which has no traffic, is exempt.
9. **Both sides of a two-way road carry obstacles** (the owner, 17-Oct: the oncoming side looked bare and odd). The player is
   rarely in the oncoming lanes, but a road with nothing on one side does not look lived in, and a player who does swerve
   over finds it as real as his own. So a two-way level lays on the oncoming lanes a plain subset of what the player's side
   has: a gate or two, a chicane, a slalom, in the standard `barrier` (the theme's own swap is automatic), at SHIFTED positions
   (about 60 to 80 m along, so the two sides are not a mirror image), plus a few plain cones, bales or crates where the
   level uses that kind. The oncoming lanes are numbered 0 .. N-1 from the left (the road's far edge), the player's follow
   (`--first` is N): `<pattern> ... --oncoming N --shift 70` lays the same pattern on the N oncoming lanes too. The audit judges the
   oncoming side as its own side (a car in those lanes, driving the same way): a clean line from every oncoming lane, the
   reaction time, the squeezes; a one-lane oncoming side cannot hold a wall, only a single barrier the car swings round
   (it counts as the way round, not as off the lanes). Oncoming obstacles never sit in the player's lanes or the centre line
   gap, so they cannot make the player's own lanes unfair. Keep them out of narrowings (they close the oncoming lanes first)
   and 60 m clear of a tunnel mouth, the start and the drop, as on the player's side.

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
A block in the middle with lanes either side: commit early.
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
Two walls with a safe pocket between them (3 s at the speed, at least the swing). It stays empty of cash (§5, CASH).
**Parameters:** `in`, `out`, `pocket`. **Fits:** the last word of a section; near the drop (but 60 m clear of it).

### LANE-SPANNING / BETWEEN LANES (CHECKLIST 93): see §5b
CHECKLIST 93 was left on 13-Oct as "not small". Between lanes was close: a fractional `lane` already gives a sensible lat
through `Track.laneOffset`, but `Track.problems` refused it. Spanning lanes needed "a width per obstacle (hitbox) and models
drawn that wide". §5b does the spanning part for the barrier only, and lets a wide barrier start on a lane line. A plain
barrier on a lane line (span 1 at lane 1.5) is still refused: it leaves each lane beside it 2.3 m, a SQUEEZE.

### CASH: NOT round formations (changed 17-Oct)
The owner's complaint: formations were surrounded with cash lines and rows. The rule now: **no cash through, beside or in
a formation.** At most ONE small pickup (`cash5`) well clear of it (45 m past its last row, `--cash`), or none. Cash belongs
spread along the road on its own rhythm, in pairs side by side, every 60 to 80 m, drifting from lane to lane, each pair at
least 45 m from any obstacle (`node scripts/obstacle-patterns.mjs rhythm --from 200 --to 3400 --every 70 --lanes 3 --first 2
--avoid 520,1400`). The old lure (`cashLine`, `--cashline`) is kept for a deliberate choice, never the default; a formation
that wants a lure (an island: cash on one side) is the owner's call. The lab no longer ringed its patterns with cash.

## 5b. WIDE obstacles: the barrier more than a lane wide (round 2, the owner 16-Oct)

**Today every obstacle a level places is at most a lane wide.** Counted over all 98 levels: 1,231 obstacle entries, none wider
than 3.5 m; the widest is the construction site's `beam` (3.3 m). Only gimmicks are wider: the wide load (6.4 m, a vehicle) and
the bigger asteroids (sized by radius). How the game handles width: `SIZE` in collision.js is ONE box per kind (barrier
2.4 x 1.2 m). A level entry has only `s`, `lane` (an integer: `Track.problems` refused anything else) and `kind`.
`Collision.loadLevel` sets `lat = Track.laneOffset(lane)` and takes the kind's box.

**Two routes, both measured:**

- **(a) No code: barriers side by side.** Two in neighbouring lanes make a 5.9 m block with a 1.1 m seam, and three make
  9.4 m. Seen from the chase camera it reads as a wall with seams. But **the seam doubles the hit**, measured headless: a car
  on the lane line between two side-by-side barriers touches both, both explode, and it loses **68 health and 0.36 of its
  speed**. One barrier costs 34 and 0.6. Where the car is fully in one lane, only that segment goes and the rest of the wall
  stands beside it (harmless: the car is already past). Widths can only be whole lanes: the placement rule refuses items
  closer than 2 m across within 8 m along, and half lanes need fractional lanes. Verdict: usable for whole-lane walls, but
  the seam penalty is a trap that looks like one wall and costs two.
- **(b) A width on the level entry: `span` (PROTOTYPED, this branch).** `{ s, lane, span }`, where `span` is 1 to 4 lanes in
  halves, laid from `lane` rightwards; `lane` may be a lane line (x.5) for a wide one. It is ONE box: as wide as `span` lanes
  less 0.55 m at each outer line, as a barrier sits in its lane. That is 2.4 m at 1 lane, 4.15 m at 1.5, 5.9 m at 2, 7.65 m
  at 2.5 and 9.4 m at 3. Its cost is a barrier's (34, x0.6), **one hit however wide**, it is blown away whole, and its blast
  is scaled by sqrt(width / 2.4). It is drawn as the plain barrier's model, which already builds itself to its box
  (render/obstacleModels.js): one stretched block, continuous. It stands square to the road at its s with its centre on the
  lanes' own lat, so on a bend it follows the lanes with no staircase (seen in the wide chicane's stills).
  Files changed: `track.js` (`spanOffset`, the span checks in `problems`: barrier only, 1 to 4, its lanes open, the "on top"
  test widened), `collision.js` (`loadLevel`: the wide box and `wide`; the blast's scale), `levelSchema.js` (the `span`
  setting, so the editor shows "Lanes wide", and the lane may be x.5 on an obstacle; the editor's lane picker does not offer
  half lanes yet: it shows "2.5 (no such lane here)" and keeps it), `levels.js` (the doc), `scripts/obstacle-audit.mjs` and
  `scripts/obstacle-patterns.mjs`. No change was needed in render (the model scales itself), in traffic.js (traffic slows
  through and rivals steer round any obstacle by its `hw`), or in themes. **A wide barrier is never the theme's swap:** half
  the swaps' models are not built to their box. **These are logic files: the replay rules fingerprint changes.**

Seen in stills: a wide block is one long low slab, orange with the white band. Close up it reads as a jersey-barrier run.
From 75 m at chase height a 9.4 m slab reads as a thin line, harder to see than three separate barriers. Not seen: the blast
of a wide one (a still cannot show it) and a hit in play.

**Recommendation: (b).** It gives true widths (half lanes too), one hit, one continuous block and one entry in the level, and
it is small (about 40 lines of game code).

### The wide patterns (laid for 40 m/s; `[####]` a wide block, `[#` / `#]` a block's half lane)
Open widths are between the blocks inside the lanes (each edge's 0.55 m strip runs on into the 3.5 m shoulder).
- **WALL (one lane open, with a lead-in):** every lane but one shut, each closed run ONE block (lanes 0-2: a 9.4 m block).
  The lead-in is a diagonal of single barriers sweeping toward the gap, ending 40 m short. Open: 4.05 m at an edge lane
  (3.5 m + 0.55 m), 4.6 m between blocks. Sight needed: 101 m at 40 m/s and 150 m at 60 m/s for the farthest lane (3 lanes
  over). The lab's audit: 3.06 s to spare.
  ```
  2700  [##] ..  ..  ..   lead-in
  2720   .. [##] ..  ..
  2740   ..  .. [##] ..
  2780  [##########] ..   wall, gap 3  [open 4.05 m]
  ```
- **WIDE GATE:** the wall with the gap inside: a barrier, the gap, a 2-lane block (`wall --gap 1`). Open 4.6 m.
- **WIDE ISLAND:** a 2-lane block (5.9 m) in the middle, two rows 10 m apart; 4.05 m open each side. No reaction rule beyond
  a one-lane move (70 m in sight at 40 m/s).
- **HALF STEP:** walls whose gap moves half a lane at a time (lane 1, the line 1|2, lane 2), built from 1.5-lane blocks.
  Measured, **it is a drift, not a forcing move**: consecutive gaps overlap by more than a car, so shift 0 and 23 m apart.
  It guides the line gently; it never forces a lane change.
- **ZIGZAG (the two-lane swing):** blocks 2.5 lanes wide (7.65 m) against alternate edges. Each leaves 5.8 m at the other
  side, and the car must move **4.3 m** between them (0.78 s). They are 47 m apart at 40 m/s (67 m at 60). Narrower blocks
  (2 lanes on 4) only ask a 0.8 m nudge, like gates one lane apart. On 3 lanes the zigzag is 2-lane blocks.
- **WIDE CHICANE (on a bend):** two 3-lane blocks (9.4 m), open at the outside edge, then the inside. The full **7.8 m**
  swing (1.16 s) needs 62 m at 40 m/s and 90 m at 60. On the lab's left-hand bend each block stands square across the
  curving road (seen).

Fairness for all: never fully blocked (the generator refuses a row without a way through for the widest car, 2.1 m + 0.6 m);
the narrowest designed opening is 4.05 m against a 1.7 m car (2.35 m spare). A **1.5-lane block beside a lane line** leaves
2.3 m: a squeeze, flagged; don't.

## 5c. FREE-POSITION SLOTS: the way through is a gap, not a lane (OPT-IN, 17-Oct, redone 19-Oct)

The first try (single barriers on a lane line, "thread") was wrong, and the owner said so: it judged paths by LANE CENTRES, but the
player steers continuously and can sit ANYWHERE across the road, on a lane line, a quarter lane off it. A barrier on a line is just
a solo obstacle moved sideways. It was removed. What replaces it: **the way through is a SLOT between obstacles, centred at any
lateral position, only a little wider than the car, and its position changes from wall to wall, so the player steers the car to a
specific lateral position, not to a lane.** Opt-in: no formation of the existing levels was replaced.

**Rules code changed (twice):** `Track.problems` (track.js) now lets a plain obstacle stand at ANY lane position between two open
lanes (`{ s, lane: 1.25, kind: 'barrier' }`; 3 decimals; the first round allowed only x.5; a wide barrier still starts on a line),
and the level schema (levelSchema.js, `halves: true`) takes any such number, not only x.5. `Track.laneOffset` already placed a
fractional lane by a straight line between lane centres, on a bend too. **The replay rules fingerprint moved with it: 99ec8ffa44 /
c844ce1038 (x.5 only) -> 0092ac352b / a24b118efc (any fraction + schema); main was 756d432419 / 0da7e18857.** Level JSON moves nothing.

**The slot a car needs** = 2 x its half width + a margin each side (0.25 m; 0.30 m for the widest). The audit car is the Sportscompact:

| car class | half width | slot it needs |
|---|---|---|
| narrow car | 0.75 m | 2.0 m |
| reference car (Sportscompact) | 0.85 m | **2.2 m** |
| wide car | 0.95 m | 2.5 m |
| widest garage car | 1.05 m | **2.7 m** |

The patterns default to 2.7 m (every car); the audit says which classes a slot fits. **2.2 m is the floor and has no play at all** (the
reference car with exactly its 0.25 m a side): the audit's simulated driver, which steers full, none or full, cannot thread it and
falls back to the shoulder (`OFF_LANES`), so a person cannot be asked to. **Tight slots are 2.4 m** (0.1 m of play a side; reference and
narrow cars), which the simulation threads from every lane: that is what the lab shows.

**How a wall is built** (`slotRow`): obstacles of one kind either side of the slot, their edges at the slot's edges, then one every
(2 x half width + 1.0 m) outward (a 1.0 m gap reads as closed; no car is under 1.48 m), out to the first and last lane's centre. A box
cannot stand outside lane 0 .. n-1 (a lane below 0 is the shoulder), so **what a road can hold is limited**: 4 lanes hold a 2.7 m slot
centred from -2.7 to +2.7 m of the road's middle (lane 0.73 to 2.27); 3 lanes only +-0.95 m (lane 0.73 to 1.27); 2 lanes none
(fjord-road: no slot). Crates (hw 0.6) hold a little more. The generator says so and refuses.

**The patterns** (`node scripts/obstacle-patterns.mjs <name> --lanes 4 --s 300 --meta`; `kind` any plain kind: `--kind crate` for finer
control, more boxes, same slots):
- **`slot`**: one wall, one slot, centred at `--at` (lane units, default the middle lane line; `--at 1.25` a quarter lane off it).
- **`slotrun`**: a run of walls whose slot drifts `--step` lanes each row (default 0.4 = 1.4 m), bouncing between the edges the road
  can hold: a continuous weave, hand-steered, never a lane change.
- **`slotstagger`**: walls leaving their slot alternately either side of a line (`--offset` 0.35 lane = 1.2 m each way).
- **`needle`**: the same slot `--rows` walls deep, 10 m apart (4 = 30 m): the car holds one lateral position.
```
 slotrun, 4 lanes, 2.7 m slots (# = a box, 8 columns a lane):  300 .######. .....### ##...... ######..   slot lane 0.729
                                                                330 ....#### ##...... ######.. #####...   + 30 m, shift 0.9 m   slot lane 1.129
```
**Spacing from the real steering:** a slot's usable centre range is its width less the car and its margins (2.7 m for the 0.85 car:
+-0.25 m); the shift is the distance between two slots' centres less both ranges; the road between walls is
`speed x (shiftChange(shift) + 0.25 s) + the boxes' lengths + the car's` (`slotGap`), at least 30 m so a wall reads. At 40 m/s a
0.9 m shift is 29 m, a 1.9 m shift (stagger) 36 m, a 1.7 m shift 35 m. `kinematics` prints `shiftChange` for any distance.

**The audit** judges by CONTINUOUS lateral clearance: boxes are read at their real lat and width, each gap between two boxes in a
slot wall is a slot, and the real-steering simulation (the yawed car, 0.25 m margin, 0.75 s reaction) proves a clean line from every
lane. Flags (unfair, `--strict` fails): `SLOT_TOO_NARROW` (a gap between 1.2 m and the audit car's slot), `NO_PATH` (no slot of the
car's width in a wall), `UNREACHABLE` (the shift to the next slot does not fit in the road between, at the design speed). Each slot is
printed: its centre in lane units and metres from the first lane's centre, its width and the car classes it fits, the shift to the
next and the road it has against what it needs. Pictures: `node scripts/obstacle-picture.mjs <dir>` draws each pattern top-down
with the slot centre marked, the widest car that fits drawn in it and the width written.

**In the lab** (`?hidden=obstacle-lab`, from 3,980 m): a slot on the middle line, one a quarter lane off it (2.4 m), a six-wall weave, a
stagger, a needle, and a weave in crates (2.4 m). In `neon-grid` (4 lanes, a slotrun at 2,150 m), `castle-town` (3 lanes, a small slotrun at
2,270 m), `apron-run` (a needle at 1,510 m, in place of the trolleys there) and `oil-patch` (a slotrun at 330 m); each with a quiet zone (rule 8).

**Not verified:** nobody has driven a slot by hand; the audit's driver is perfect and knows where the slot is; the barrier model and
its blast beside another box at 1.0 m pitch are seen only in stills; the editor's lane picker for fractions.

## 5d. MOVERS: what can move, from the level's data (OPT-IN, 17-Oct)

**Found by reading the code** (no rules code was added for this): the game has **no obstacle that moves on a timer the level sets.**
What a level's JSON can move: `drifters` (obstacles of a kind that sweep, circle, zigzag or figure-eight about a stretch,
collision.js `driftTo`), `tractors` (slow traffic), `herds` (cows, kangaroos), `crossings` (a train), `trolleys`, `wideLoads`,
`marathons`, `balloons`, `stampedes`, `rockfall`. The pattern vocabulary covers the two a formation can be built from and an audit
can judge; the rest are gimmicks with their own rules.

- **A drifter's clock is not the level's to set.** Its phase and pace come from a seeded sequence (`driftDraws` in the patterns file repeats
  it: the first drifter of a level has pace 0.85 and phase 3.43, the second pace 0.96...), and it runs on the LEVEL'S time from the start,
  so where it is when a player arrives depends on how fast that player drove there. Nothing in the data places it in time.
- **A tractor** is parked where the level puts it until the player is within `CONFIG.spawnMax` (640 m), then goes 7 m/s in its lane. A
  car at 40 m/s meets it 7 x 640 / 33 = 136 m on from where it stood; `meetShift`. It takes a car from the traffic pool.

**What new engine support a TIMED crossing would need** (not built): an obstacle entry with a path and a period it keeps by the level
clock from the player's own position (like a `crossings` train, which is set off by the player's approach), or a drifter with a
`phase` / `period` and a trigger distance.

| pattern | what | window |
|---|---|---|
| **`sweeper`** | a barrier (a drifter, pattern sweep) crossing the road edge to edge, `--count 2` a pair | at 40 m/s a crossing takes 3 s; per lane the clear windows are printed by `sweeper ... --meta` (inner lanes 83% clear in windows of 2.1 to 3.8 s at pace 0.85; the edge lanes are clear in windows of 0.3 s up to 4.5 s) against the lane change 0.68 s + 0.5 s margin |
| **`rollgate`** | tractors abreast in all lanes but one: a moving wall with a fixed gap | closing at 33 m/s: 150 m of sight is 4.5 s against the 2.46 s a two-lane move and its reaction need |

**The audit judges them**: a sweeper over a whole cycle of arrival phases (16 samples 0.6 s apart: the arrival time is not known) and wants
a clean line from every lane for EVERY phase with 0.75 s to spare; a tractor where the car would meet it, closing at speed minus 7.
A phase with no line, or less than REACT, is `NO_LINE` / `NO_REACTION` (unfair, `--strict` fails). It is an oracle driver: it knows the
sweeper's path in advance, a person has to read it. Not simulated: the sweeper's wobble beyond what `driftAt` copies, traffic round a
tractor, the tractor being held up. Opt-in; a quiet zone covers each (rule 8). In the lab from 5,300 m; in `apron-run` (a rollgate
of tugs at 2,000 m) and `neon-grid` (a sweeping holo barrier at 1,930 m).

## 6. Rhythm: how a level uses them

A level has ONE idea; formations are its vocabulary, not a second idea. Call and response:
1. **Call:** a single GATE (one decision), after at least 150 m of open road from the start.
2. **Response:** a two-row formation (ZIPPER or a short GATE RUN).
3. **Breather:** at least 3 s (120 m at 40 m/s); cash in pairs on its own rhythm, 45 m clear of the formation.
4. **Bigger set:** a GATE RUN or a CHICANE on the level's bend.
5. **Breather, then a guide:** DIAGONAL into a TAPER where the road narrows.
6. **Feature:** the formation that belongs to the level's geography (BLIND CREST on its hill, CHICANE on its bend).
7. **Climax:** a SLALOM.
8. **Last word:** a BOOKEND, at least 60 m short of the drop.

The lab, audited (both halves, 105 barriers, 14 of them wide): 15 groups at 40 m/s and 6 at 60 m/s, none unfair, none off
the lanes, none out of place; every group fair in the lanes up to 71 m/s (`obstacle-audit obstacle-lab --fairup --strict`
passes). It is 4,150 m: the first 2,750 m hold the ten one-lane patterns, the rest the wide ones (§5b), on a second,
left-hand bend. The clock from level-clocks is 205 / 155. Its crest (6% up, 6% down, the default 60 m ease) is
NOT blind to the chase camera (11 m up): the echo is in sight from before the crest, seen in a still. A truly blind crest
wants a sharper hill, which the gambles turn into a jump: a level-by-level choice.

Density: the lab has 105 barriers in 4.15 km (25 per km) because it shows everything. A real level should use 3 to 6
formations, about 10 to 15 barriers per km, plus its themed singles.

## 7. The tools

- `node scripts/obstacle-patterns.mjs list`: the patterns (and the opt-in slot and mover patterns) and their parameters.
- `node scripts/obstacle-picture.mjs <dir> [names]`: top-down pictures (SVG, then PNG by headless Chromium) of the slot and mover patterns.
- `node scripts/obstacle-patterns.mjs kinematics [--speed V] [--agility A]`: the lane-change table above.
- `node scripts/obstacle-patterns.mjs gate --lanes 4 --s 500 --gap 2 [--first 2] [--speed 40] [--meta] [--cash]`: the level
  JSON obstacle entries (`{ s, lane, kind: 'barrier' }`). `--first` is the level's lane number of the player's leftmost lane
  (2 on a two-way 4-lane road). `--meta` prints the diagram; `--cash` adds ONE small pickup 45 m clear (not a line; `--cashline`
  is the old lure); `--oncoming N [--shift 70]` also lays it on the N oncoming lanes (rule 9); `--quiet` adds the `quietZones`
  it wants (rule 8, 28 m before to 10 m after); `--kind crate` for the slot patterns (§5c).
- `node scripts/obstacle-patterns.mjs rhythm --from 200 --to 3400 --every 70 --lanes 3 --first 2 [--avoid s,s]`: sparse cash pairs
  along the road, 45 m clear of the `avoid` positions.
- `node scripts/obstacle-patterns.mjs lab [--meta]`: the lab level's obstacles and pickups (`LAB` in the file).
- The wide patterns (`wall`, `wideisland`, `halfstep`, `zigzag`, `widechicane`) write `{ s, lane, kind: 'barrier', span }`
  entries. `--meta` shows each row's open widths in metres; the generator refuses a row with no way through for the widest
  car. The audit reads `span` with the game's own sums (`Track.spanOffset`) and prints the widest obstacle of each level.
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
   (gap lane 2). It stays easy and starts teaching walls and the thread.
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
5. **Traffic in formations:** ANSWERED 17-Oct (rule 8): traffic everywhere, a quiet zone only from 28 m before a formation to 10 m after it.
6. **Sizes:** is a 2.4 m barrier (two make a wall) the right standard, or should a formation kind be a full lane wide
   (3.5 m, its own model) so a wall has no seams?
7. **How many per level:** 3 to 6 formations (10 to 15 barriers per km) as proposed?
8. **Wide barriers (§5b):** take route (b), `span`? It is a logic change (replay fingerprint, version bump at merge).
   Should wide ones be themed (each theme drawing its own long block, e.g. a long rebar rack or a velvet-rope run), or always
   the plain barrier? Should a wide hit cost more than a barrier's (today: the same, one hit)? Should a 1.5-lane block,
   which only makes squeezes, be allowed at all?
