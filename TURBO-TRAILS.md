# Turbo trail styles (an experiment, CHECKLIST 456 part 2)

The owner: "Let's experiment with a few turbo trail effects." Seven styles for the player's turbo, behind the address only:
`?turbotrail=<name>` (`<name>-lite` for the lite variant; `?turbotrail=list` logs the names). No address, or `classic`, is
the game as it was (render/items.js: cyan and white cubes in the shared Particles pool). There is NO player-facing switch.
Code: `src/delivery/render/turbotrails.js` (one file, render-only: the replay fingerprint 33a0394c26 / dd565f56b3 unchanged).

Every style:
- geometry, lines or points only (no texture, no canvas), its own small fixed pool, ONE draw call, built when chosen;
- hidden (and not updated) once the turbo is off and its last piece has died;
- comes from the car's tail at the car's own height (render/cars.js `playerPointY`: up in the air with a jumping car);
- is carried by its PARENT's velocity (render/gameclock.js `parentVelocity`: along the road and across it, so a lane change
  bends it) on the PARENT GAME CLOCK: paused nothing moves or comes, in a 0.5x replay it goes half as far a frame;
- grows with the car's actual speed (k = speed / 35 m/s, at most 1.3): more pieces, longer flames and streaks, wider ribbons;
- flickers off with the turbo's last-second warning, as the classic one does.

| Name | Look | Pool (full / lite) | Drawn at most (full) | Headless ms a frame |
|---|---|---|---|---|
| `flame` | a short jet of flame from two nozzles, white-hot at the pipe, yellow, orange, red, gone; longer with speed (open cones, additive) | 40 / 20 cones | 480 / 240 triangles | 0.01 to 0.18 |
| `twin` | two cyan ribbons from the tail corners, flat, tapering and fading over about 4 m at 30 m/s; they bend with a lane change (lite: one ribbon down the middle) | 2 x 28 / 1 x 16 nodes | 112 / 32 triangles | 0.01 to 0.06 |
| `speedlines` | thin white streaks rushing back past the body's sides, more and longer the faster (lines) | 36 / 16 | 36 / 16 lines | 0.03 to 0.06 |
| `afterimage` | cyan ghosts of the car's body shell left behind it every 0.075 s, fading (the body merged once into one geometry, positions only; 4 instances) | 4 / 2 | 4 x the body's triangles (the Sport: 1,040 / 520) | 0.01 |
| `embers` | sparks shed from the tail, thrown up, falling and bouncing on the road, yellow to orange to dark red (points) | 64 / 28 | 64 / 28 points | 0.01 |
| `shockwave` | cyan rings pulsing out of the tail every 0.2 to 0.3 s, widening as they fall back (thin tori) | 5 / 3 | 840 / 504 triangles | 0.01 |
| `rarity` | one wide ribbon in the colour of the car's card rarity (showroomData.js RARITIES: Common grey-blue, Uncommon green, Epic violet, Legendary orange, Bespoke pink, Special magenta) | 30 / 18 nodes | 60 / 36 triangles | 0.01 to 0.08 |

The classic trail: up to 120 live cubes in the shared 500-cube Particles pool (no extra draw call: the pool is drawn anyway).

## Checked

- `scripts/.trail-clock-check.mjs` (render group): every style and its lite variant draws with the turbo on; paused 30 frames
  nothing moves or comes (bit for bit); at a time scale of 0.5 each piece goes 0.50x as far a frame; 3 m up in the air it
  leaves the tail 3.0 to 3.8 m over the road; with the turbo off, nothing alive and the mesh hidden. It prints the costs above.
- Stills (390 x 844, software GL, read): every style on the ground and mid-air off Gimmick Road 3's jam ramp, in one contact
  sheet, and a 3-frame strip of `twin` and `flame` (0.15 s of game time apart). Address:
  `?hidden=gimmick-road-3&car=sport&at=2380&lane=4&speed=47&turbo&pauseafter=0.45&turbotrail=<name>` (mid-air: `&ff=1&pauseafter=0.4`).

## Not checked

Nothing was seen MOVING (stills and numbers only); no real phone or GPU (frame time on a phone unknown: the headless ms above is
the CPU side only); the lite variants were not shot; only the Sport (the afterimage's shape and cost depend on the car's body
shell; a car whose body is a group of many parts costs more); not at night, in a tunnel, on water, or with the helicopter.

## Seen in the stills (what to look at)

- `twin` and `flame` read best from the chase camera: the ribbons are clean lines behind the car, the flame two short jets.
- `speedlines` are faint (1-pixel lines) and read as speed, not as the turbo.
- `afterimage`: the Sport's body shell is boxy, so its ghosts read as fading blocks of cyan light rather than the car's shape;
  at first (all the car's parts, both sides) it was a solid block of light, now the body only, front faces, faded in.
- `embers` read as small square sparks (points have no texture, so they are squares).
- `shockwave`: the ring's lower half is under the road on the ground (an arch), whole in the air.
- `rarity`: the Sport is Common, so its ribbon is a pale grey-blue.

## Open questions for the owner

1. Which (if any) to keep, and as what: a cosmetic slot (a "Turbo trail" tab beside Kill FX?), tied to the car's rarity, or a
   free choice?
2. Should a style be the default for every car, replacing the cubes?
3. Lite: should a phone use the lite variant by itself (there is no auto-detection; only the address picks it)?
4. The ring: lift it so its lower half clears the road, or leave the arch?
5. Boost pads push the car too: should the chosen trail also show on a boost pad's push (today only the turbo pickup has a trail)?
