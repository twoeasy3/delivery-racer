# Brief: fix ONE car's glass (windows follow the body, level tops, clean edges)

Reusable. Fill in `<CAR>` (id and name) and the branch to start from. One car per agent. Read `CLOUD-AGENT-README.md` and
`CAR-AGENT-PROMPT.md` ("Windows follow the body contour") first. Work in your own git worktree under `.claude/worktrees/`
(symlink `node_modules` from `.claude/worktrees/agent-a7f05d0f2251f4f07`). Push your branch. NEVER merge to `main`.
Touch only `<CAR>`'s own model code (plus the shared helper only if told to).

## What the owner wants (14-Oct), in his words

- The side window's outline follows the car's **body contour** (the chassis outline dictates the window outline) at a
  fixed inset: ~7 cm at the A-pillar, ~9 cm at the C-pillar, ~5 cm roof rail. No eyeballed arch, no free-standing quad.
- The windscreen's top and the side window's top are **LEVEL**: one shared top line. Almost every car had the windscreen
  higher than the side window. **Level, not artificially lowered**: lowering the screen to the window left a solid
  body-coloured "sun visor strip" above it, and the owner rejected that. A screen tucked under the body face has the same
  fault. The lower glass is raised up the pillar to meet the higher; the screen is never lowered.
- Windows have **exactly as many edges as the body's cabin outline has corners** there: a plain side window is a clean
  4-edge shape (belt, A-pillar edge, roof rail, C- or B-pillar edge). No 5th edge from a roof bump, an inset corner or a
  clip. No segments under ~3 cm unless the body has a corner there.
- Judge by the **picture, not the numbers**. A past attempt passed its own numbers while the render showed the strip.

## How (the helper, on branch `claude/glass-touring-proportions`, which includes `claude/glass-touring` at `eed235c`)

Start your branch from `origin/claude/glass-touring-proportions` (the helper plus the Touring Car as the finished example).

`cabinGlass(outline, { from, to, belt, half, taper, grow, inset: { aPillar, roof, cPillar }, lift, topLift, sideLift, windows })`
in `src/delivery/render/ideaModelsDkit.js` builds the side windows, windscreen and rear glass from ONE inset outline.
Working example: the Touring Car in `ideaModelsBatchE5.js`:

```js
const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1), belt: BELT, half: HALF, taper: TAPER,
  grow: BEV, inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: LIFT, windows: [[-0.1, 9], [-9, -0.26]] });
parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
```

- `grow: BEV` (the body's bevel) measures the insets from the body's SILHOUETTE; without it the real inset is 2 to 3 cm too big.
- `lift: BEV + 0.006` and **no `topLift`**: the screen stands 6 mm proud of the body all the way up. A `topLift` below `BEV`
  tucks the screen's top under the body and leaves the strip. Remove any such `topLift`, and any custom `foot` that fights it.
- `windows: [[zRear, zFront], ...]` one entry per side window (a B-pillar splits them).
- Cars with their own glass code (a free-standing windscreen frame, a canopy, a dome, an open car) need a judgement call:
  say so in the report instead of forcing `cabinGlass` onto them.
- The helper already merges near-straight points and 3 cm stubs (`dropFlat`, `oneMitre`, `tidyGlass`).
- **Front and rear window PROPORTION (the owner, 14-Oct, learnt on the Touring Car).** After the outline, level tops and
  edge count are right, look at the side profile and judge the LENGTHS of the side windows against each other. On a saloon
  or hatch the door (front) glass is the longest glass and the B-pillar sits near mid-cabin; the rear quarter window is the
  shorter one. The Touring Car's door window was a small raked triangle (81 cm along the bottom, 0.17 m2) beside a rear
  window of 127 cm (0.33 m2), 1 : 1.9 by area, and it looked wrong; moving the split so they became 113 cm / 0.29 m2 and
  95 cm / 0.22 m2 (about 1.3 : 1 by area, 1.2 : 1 by bottom length) fixed it. The split is the `windows: [[zRear, zFront], ...]`
  numbers (the Touring Car went from `[[-0.1, 9], [-9, -0.26]]` to `[[-0.42, 9], [-9, -0.58]]`; the gap is the B-pillar,
  16 cm there). Measure both windows (bottom length, area) before and after, report the ratio, and judge it in the picture
  and against the real vehicle the car is inspired by (CARS-CATALOGUE.md). Vans, trucks, estates and 6-light cars have
  their own right proportions: say what you chose and why. A split that changes the edge count or the shared top is wrong.

## Verify, and look yourself

1. `node scripts/.glass-contour-check.mjs <car id>` passes: insets steady, screen top = window top (0.0 cm), pillar width
   steady, screen top not under the roof/body, and each window's edge count as expected (it states the expected count).
   If two runs print different numbers, find out why before trusting either.
2. **Render and read the images** (including the window proportion above) (`scripts/shots.mjs`, 2 slots shared with other agents: batch, be patient): a LEVEL
   orthographic side view, a 3/4 front, a close-up of the A-pillar/screen-top corner, the rear 3/4. Compare the pixel row of
   the screen top and the side-window top (they must be the same row). Count each window's corners in the image. Mark them.
   Do not report success unless your own pixel and corner check confirms it.
3. Other checks: `.ideas-check --quick`, `.bundle-check`, `.platetag-check` (the triangle baseline will change: say by how
   much, do not edit the baseline file), `.modelpatch-check`, `.suspension-check <car>`, lamps unchanged.
4. Add a line to `CHECKLIST.md` (what was and was not verified).

## Report (short, honest)

What changed (a line or two); measured gap before and after in cm and in px; edge count per window before and after;
anything still not level or not clean; anything you could not verify (garage view, Evil paint, other cars). Save the
before/after images, one labelled sheet (side, level ortho, 3/4 front, A-pillar close-up, rear) in `/tmp/glass-<car>/`
and list the paths so the orchestrator can forward them. Do not claim "done" on numbers alone.
