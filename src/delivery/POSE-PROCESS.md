# Blueprint card poses: how they were made and judged (hand-off)

## Where the poses live
- `src/delivery/carposes.js`: the pose NAMES (`POSE_NAMES`) and which car gets which pose. `posePick(id)` is a
  stable FNV hash of the car id. `variedPoses(ids)` is the same pick, stepped round so that neighbours in a pack
  never share a pose. There is no three.js in this file, so `.packs-check` reads it headless.
- `src/delivery/render/carstill.js` `POSES`: the numbers for each pose. `STILL_POSE` is the showroom/shop/event
  pose; leave it alone, because the poses are for blueprint cards ONLY (the owner, item 123).
- `src/delivery/render/modelviews.js` `poseView` / `drawStill`: the framing (below). Stills are cached by car,
  side, pose name and size in 20 px steps, so a changed number needs a page reload, not just a redraw.
- Card overlays (`blueprintcard.css`): the BLUEPRINT tab and the xN badge at top right (about the top 11% of the
  picture), the rarity word at bottom left and the stars at bottom right (about the bottom 17%). The picture is
  `aspect-ratio 1/.9` in the reveal and 4/3 compact in What's inside. No CSS is keyed on `pose-<name>`.

## The numbers, and how to choose them
A pose is `{ lift, angle, fov, margin | marginX + marginY, shiftY }`.
- `lift`: the camera's elevation in radians from level (0.035 is the bumper, 0.24 is eye height, 1.08 is high,
  1.36 is nearly straight down). Never use PI/2: lookAt degenerates.
- `angle`: how the car is turned. The model's nose is +z. 0 = nose at the camera, + turns the nose to the right,
  PI = tail at the camera, -PI/2 = a profile with the nose to the left. A three-quarter view is about +-0.6..0.8;
  a rear three-quarter is PI +- 0.7.
- `fov`: the lens. Wide (40 to 54) exaggerates the near end; this is the "hero"/"low" feel. Long (13 to 18)
  flattens the car into a catalogue/profile look. 28 to 30 is neutral.
- `margin`: the share of the picture's HALF width and height the turned box may fill (0.88 = tight). The new poses
  use `marginX` / `marginY` separately plus `shiftY` (the box's middle moved up by that share of the half height)
  to keep the car in the free band between the badges. The band is NDC y -0.66..0.78, so marginY 0.66..0.72 with
  shiftY 0.04..0.06.
- Method: start from a photo idea (Asphalt 9 cards). Set lift and angle first, then fov for the feel, then the
  margins last. Change one number at a time and redraw the whole contact sheet; never judge from one car.

## Framing by the turned bounding box (why nothing is ever cropped)
`poseView`: Box3 of the model (after `userData.animate`), seated on y=0 and centred in x/z. Its 8 corners are
rotated by `angle` about y. The camera aims at mid-height along `(0, sin lift, cos lift)`, and the distance is
BISECTED (28 steps) until every projected corner fits inside +-marginX / +-marginY in NDC. Then
`camera.setViewOffset` slides the view so the box's projected middle sits at (0, shiftY). The box is conservative
(the car is always smaller than its box), so every car, from the bubble car to the dragster, the bus or the
Monster Truck, comes out whole. The cost: a long low car in profile is limited by WIDTH and becomes a thin strip.

## Rendering real cards to look at
- Use the browser via `scripts/shots.mjs` with
  `--browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. It starts its own Vite server; each shot takes
  10 to 50 s. Use `--wait=12000` or more, because the stills are drawn lazily a few per frame.
- Real screens (no lab needed):
  - pack reveal: `index.html?pack=ten&reveal=all`
  - What's inside: `index.html?shop&inside=ten`
  - Comet Hunt: `?pack=special&featured=...`
  - Desktop `--size=1280x800`; phone `--size=390x844`.
- POSE LAB (branch `claude/blueprint-pose-lab`, `src/delivery/render/poselab.js`, loaded from main.js only with
  `?poselab`): real `blueprintCard` cards with one row per car and one card per pose, the originals always first.
  `index.html?poselab&poses=a|b|all|original|wide,rear` and `&cars=id,id,...`, `&compact` for the 4:3 card. Card
  width is `(innerWidth-150)/poses`, clamped 110..190 px. `?poses=` also switched the real cards' pick for a visit.
  The owner did NOT want this kind of switch in the game: show the sheets, let them pick, then wire only the chosen.
- Good test cars: short `bubble`, long `limo`/`bus`/`dragster`/`jetcar`, tall `doubledecker`/`monster`,
  `rocketfin` (fins, a long nose), trucks `tipper`/`cabledrum`, odd shapes `monowheel`/`snocat`. Rarity varies by
  row, so the backgrounds vary too.

## Contact sheets
The lab page IS the contact sheet: one screenshot per set at `--size=1450x1420` (6 columns, 6 cars) or 1700 wide
for 9 columns. Name the files by set (set-original, set-a, set-b, set-all-more-cars). READ every one.

## Pitfalls hit
- `--scale=2` in shots.mjs drew the page FOUR TIMES (2x2 tiled, the bottom row cut off). Use scale 1 and a bigger
  `--size` instead.
- The page needs height for every row; otherwise the last row is cut off (that is the screenshot, not the framing).
- Importing `render/garage.js` headless fails (scene.js needs `window.matchMedia` and a renderer). To MEASURE models,
  run in the browser: a throwaway copy of `delivery/index.html` with a module appended that builds `makeShowCar` for
  each `packs.js roster()` car and prints the Box3 sizes in a fixed `<pre>`. Shoot it, read it, delete the file.
- eslint `no-useless-assignment` flagged `let x = null` that was reassigned in a try.
- Badges: at phone width the badges have a minimum font size, so they cover more of a small card. A tall car in
  `hero` or a truck in `side` can touch the bottom strip there even when desktop is clean.
- The owner rejected an earlier set (roof, three-quarter, tail-lamp close-up) as "too close" to the originals.
  `overhead` read close to `top` for the same reason. Make each candidate obviously different from the originals.

## What worked / what did not
- Worked: a lab with the originals beside the candidates for several varied cars in one picture; the owner chose
  from it quickly (top, hero, front, rear, side; hero replaced low).
- Worked: per-axis margins and shiftY to keep the car clear of the badges.
- Did not: `side` for long low cars. By length/height: solarracer 6.4, jetcar 4.9, superlowrider 4.8, dragster 4.7,
  lowrider 4.5, rocketfin 4.3 and classicgt 4.2 fill only about 16 to 24% of the picture's height. Open question
  for the owner: skip `side` when length/height > 4.
- Did not: `overhead` (too like `top`); `tele` and `wide` were fine but not picked.

## Checks after changing poses
`node --check` and eslint on the changed files, `scripts/.packs-check.mjs` (it asserts the pose names, that each is
used by some roster cars, and that neighbours differ), `.shop-check`, `.carsources-check`, `.showroom-check`, and
`node node_modules/vite/bin/vite.js build`. Then stills of a real reveal and What's inside, desktop and phone, and
READ them.
