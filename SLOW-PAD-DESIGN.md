# Slow pads: the boost pad's opposite (design)

The owner (16-Oct): "Let's add a new gimmick, except it is the opposite flow of a boost pad." Built on `claude/slow-pad`
(CHECKLIST 435, placeholder). The boost pad is `boostPads` (CHECKLIST 298, 411): a lane-wide patch of road that pulls the
car on over its top speed. A SLOW PAD is that patch in reverse: it drains speed while the car is on it.

## Name

**Slow pad** (cards, editor, messages). Plain, a phone reader gets it at once, and it pairs with "Boost pad". Rejected:
"Drag strip" (reads as a drag race, the opposite meaning), "Sticky strip" (the game already has Fresh tarmac, `tarmac`,
which is the sticky one).

## The rules (mirrored from the boost pad)

| | Boost pad | Slow pad |
|---|---|---|
| Data | `boostPads: [{ from, to, lane, rails? }]` | `slowPads: [{ from, to, lane }]` |
| Scope | one lane | one lane (never every lane at one spot: the level reports it) |
| On it | top speed lifted 12 m/s, pulled on at turboAccel | speed drained, the engine cannot win it back |
| After it | the push lasts 2.5 s more, then eases back | nothing: the car simply drives back up to speed |
| Ghost | pushed (it is the floor) | slowed (it is the floor) |
| Turbo pickup | adds to it | IMMUNE: a turbo rides over a slow pad untouched |
| Boost pad's push | - | cancelled when the car touches a slow pad |
| Tank | pushed | IMMUNE (tracks, as on rails and gravel) |
| Traffic, racers | not pushed | not slowed; and never in a race (the level reports it) |

**How much.** The drain grows with the square of the speed (drag, not a brake), so every car loses the same SHARE of its
speed over the same length of pad, whatever its top speed (top speed is the owner's most important stat: a slow car is not
punished twice). `CONFIG.slowPad`:

- `held: 0.02` with the accelerator held, 2% of the speed for every 10 m of pad: an 80 m pad takes about 15%
  (a 42 m/s car: about 6 m/s, at worst about 3.5 m/s^2 of deceleration: a lift, not a wall).
- `coast: 0.035` off the accelerator (hands off, which in this game holds the speed): 3.5% per 10 m, about 25% over 80 m.
- `most: 0.3`: one pad never takes more than 30% of the speed the car came onto it with.
- `CONFIG.minSpeed` (7 m/s) is the floor: the car NEVER stops.
- On the pad the engine cannot add speed back (the pad beats the accelerator), but braking still brakes.
- `tune: 1` multiplies the drain (0: pads do nothing); `?slowpad=<x>` sets it for a visit (nothing saved, no replay
  recorded), as `?lanescrub=` does.

So: holding the accelerator through a pad is the counterplay that halves the cost; coasting costs the most.

**Lane changes.** The 421 lane scrub with the accelerator held (`trueSpeed.driven`) is OFF while the car is on a slow pad
(the pad is the cost: a lane change off it must not stack into a brake). The plain `laneScrub` (a few tenths) stays.

**Other floors.** Ice, standing water, gravel, mud: never on a slow pad (the level reports overlap with ice and standing
water). After a pad the car climbs back at its own acceleration, so on wet tyres (`accelGrip`) the climb is slower, as
after any slow-down. Afloat: pads are on the road only (`Track.isMain`). Giant: slowed as normal (a size, not a power).

**Obstacles and ramps.** Nothing placed ON a slow pad (one thing at a time: `obstacle-audit.mjs` flags it as it does
for boost pads). No slow pad within `CONFIG.slowPad.clear` (170 m) before a jam ramp or a drawbridge (a speed-gated
gimmick must not be spoiled by a hidden tax: the level reports it).

## Counterplay and the read

- Always a clear lane beside it (the level reports a spot where every lane of the player's side is padded).
- Telegraph: flat paint, visible from as far as the road is (well over 60 m); a sound as the car goes on (the turbo's
  rising sweep turned round: a falling one); a short message the first time in a run ("Slow pad! Keep your foot down.").
- The look is the boost pad's turned round, so the two are read as a pair: the same lane-wide belt, but DULL (rust brown
  instead of bright blue), HATCHED, with CHEVRONS POINTING BACK at the player and the picture creeping TOWARD the car;
  amber edges instead of cyan. Flat and edged like a boost pad, so it reads as something to drive over or round, never as an
  obstacle to dodge (it does not collide, and nothing stands up out of it).

## Themes

The theme's `pad` already skins the boost pad; the slow pad follows it, turned round:

- default (`plain`): rust-brown hatched strip, cream chevrons pointing back, amber edges.
- `travelator` (the mall, Metro, Las Vegas): a REVERSE TRAVELATOR, the walkway running against you, red chevrons pointing back.
- `conveyor` (the steelworks): a REVERSE CONVEYOR, the belt running back, red chevrons, the yellow frame and drums kept.
- `sand` (the desert, Wild West, beach: `slowPad: 'sand'` in themes.js): a drift of soft sand across the lane, ripples and
  wind lines, darker than the road, no lit edges.

Ideas, not built: snow drift (snow, alpine), mud wallow (farm, rainforest), rumble strips (city expressway), wet
cement (roadworks, but Fresh tarmac already does this), sticky soda spill (the theme park), seaweed mat (seabed),
regolith (moon), a down escalator (the metro's own).

## Where it fits (LEVEL-ARCHETYPES.md, on claude/level-archetypes)

- **Top Speed (3.6)**: its natural partner. Boost pads chained along the fast line, slow pads on the tempting short
  line (the inside of a bend, the lane with the cash): a fast car stays fast only on the right line.
- **Time Upkeep (3.1)**: a time plus or a cash row on a slow pad is a priced grab (pay a share of speed for it).
- **Speed Trap (3.12)**: no. The police already make the player slow down; a slow pad there would only help.

A level with slow pads makes them a thematic gimmick or the one idea; never with every other floor gimmick.

## The demo

`?hidden=slow-pad` (Slow Pad Lab: HIDDEN_LEVELS and TEST_LEVELS, never on a menu), 1.8 km, city, 3 lanes, little traffic:
slow pads on tempting lines (cash rows on them, the inside of two bends), three boost pads as contrast, nothing else.
