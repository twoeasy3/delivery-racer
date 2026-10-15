# Brief: fix ONE car's glass (windows follow the body, level tops, a proper A-pillar, clean edges)

Reusable. Fill in `<CAR>` (id and name) and the branch to start from. One car per agent (or one agent working through a list, one
commit per car, pushing after each). Read `CLOUD-AGENT-README.md` and `CAR-AGENT-PROMPT.md` ("Windows follow the body contour")
first. Work in your own git worktree under `.claude/worktrees/` (symlink `node_modules` from any worktree that has one, e.g.
`.claude/worktrees/glass-touring-proportions/node_modules`). Push your branch. NEVER merge to `main`. Touch only `<CAR>`'s own
model code (plus the shared helper only if told to). Last updated 15-Oct, after the Touring Car, the 5 first cars and the 15
follow-up cars (state of `main` v1.1.136).

## Process rules (learnt the hard way)

- **No `git stash`, ever.** The stash stack is shared by every worktree: one agent's `stash pop` took another agent's change and
  left a branch carrying the wrong car's edit. Set work aside with a WIP commit. Do not force-push; add a corrective commit.
- **Never `pkill -f`** (it kills your own shell). Kill only your own pids.
- **Screenshots: use `scripts/shots.mjs` only**, with `--browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, pointed at a
  TEMPORARY page `delivery/zglassview.html` (untracked, never committed: add it to `.git/info/exclude`) that builds ONE car model
  (`makeIdeaModel`) with an orthographic or perspective camera, takes `?view=side|front|rear|apillar&car=<id>&w=&h=`, draws one
  frame and sets a ready flag. A shot takes 0.4 to 1.6 s. Do NOT build your own Vite server + `chrome --virtual-time-budget`
  harness: it never produced an image (4 minutes, twice) and starved the machine. The machine has 4 cores: one shot at a time,
  never eight in parallel. If a single shot takes more than 3 minutes, stop and report the timing.
- Take **before and after** with the same views, read every still, and say what you see.

## What the owner wants (14 to 15-Oct), in his words

- The side window's outline follows the car's **body contour** (the chassis outline dictates the window outline) at a
  fixed inset: ~5 cm roof rail, ~9 cm C-pillar, and a **chunky A-pillar** (see below). No eyeballed arch, no free-standing quad.
- The **A-pillar is not thin** (owner, 15-Oct: "the front side windows are too close to the edge, the A pillar is extremely thin on the
  door side"): 14 cm across in side view (the helper's default `A_PILLAR` 0.135 plus the 6 mm proud) and the windscreen's side
  edges 12 cm in from the flank (`A_SIDE`). A real car's pillar is 12 to 16 cm. The check fails a pillar under 12 cm.
- The windscreen's top and the side window's top are **LEVEL**: one shared top line. **Level, not artificially lowered**:
  lowering the screen to the window left a solid body-coloured "sun visor strip" above it, and the owner rejected that. A screen
  tucked under the body face has the same fault. The lower glass is raised up the pillar to meet the higher; the screen is never
  lowered.
- The windscreen's **foot meets the bonnet or cowl** (it must not float above the body with a strip of body under it: the
  Glass-Hatch Brake's screen floated 11 cm above the bonnet). Build the screen from a second `cabinGlass` call with `belt` down at
  the bonnet height and take only `.front` (the side windows keep the higher belt).
- Windows have **exactly as many edges as the body's cabin outline has corners** there: a plain side window is a clean 4-edge
  shape (belt, A-pillar edge, roof rail, C- or B-pillar edge). No 5th edge from a roof bump, an inset corner or a clip. No
  segments under ~3 cm unless the body has a corner there.
- **Front and rear window PROPORTION.** After the outline, level tops and edge count are right, judge the LENGTHS of the side
  windows against each other in the side profile. On a saloon or hatch the door (front) glass is the longest glass and the
  B-pillar sits near mid-cabin; the rear quarter window is the shorter one (the Touring Car went from 1 : 1.9 to about 1.3 : 1 by
  area: door 108 cm / 0.27 m2, rear 87 cm / 0.19 m2). The split is `windows: [[zRear, zFront], ...]` (the gap is the B-pillar,
  10 to 16 cm). Measure both windows (bottom length, area) before and after, report the ratio, judge it in the picture and against
  the real vehicle (`CARS-CATALOGUE.md`). Vans, trucks, estates and 6-light cars have their own right proportions: say what you
  chose and why. A wider A-pillar shortens the door window: re-check the split.
- **Do not alter a car's deliberate glass gimmick.** The Glass-Hatch Brake's full-glass hatch is ONE panel (two `slopeGlass` pieces
  from the roof's end over the bend to the tail); a first fix split it and the owner had it put back.
- **Keep BODY changes to the minimum, and list every one** in your report (bevel, roofline, belt). Squaring a car's rounded roof
  corners to satisfy the edge-count rule was NOT what the owner wanted ("are we not able to do rounded edges with a proper
  window?"; then "rounded body, sharp windows"). Prefer keeping the original rounded roof and giving the window sharp corners
  on the body's virtual (tangent) corners, inset inside the rounded surface. That treatment (`sharp: true`, `virtualCorners`,
  `fillet`, `levelTops`, `userData.glassVirtual`) was tried on the Minibus, Supermini and Pixel EV on branches
  `claude/glass-minibus-round`, `claude/glass-supermini-round` and `claude/glass-pixelev-round` (NOT on `main` yet: check before
  you rely on it). The 15 follow-up cars on `main` still have squared roof corners.
- Judge by the **picture, not the numbers**. A past attempt passed its own numbers while the render showed the strip.
- Do not reuse the old d-/e-series glass attempts (an older helper, lopsided windows): the owner discarded them.

## How (the helper in `src/delivery/render/ideaModelsDkit.js`)

`cabinGlass(outline, { from, to, belt, half, taper, grow, inset: { aPillar, roof, cPillar }, lift, topLift, sideLift, windows,
aPillarMin, frontSideInset })` builds the side windows, windscreen and rear glass from ONE inset outline. Working example: the
Touring Car in `ideaModelsBatchE5.js`:

```js
const glass = cabinGlass(outline, { from: outline.indexOf(WSF), to: outline.indexOf(RW1), belt: BELT, half: HALF, taper: TAPER,
  grow: BEV, inset: { aPillar: 0.07, roof: 0.05, cPillar: 0.09 }, lift: BEV + 0.006, sideLift: LIFT, windows: [[-0.50, 9], [-9, -0.66]] });
parts(group, k + 'glass', GLASS, () => [...glass.sides, glass.front, glass.rear]);
```

- `grow: BEV` (the body's bevel) measures the insets from the body's SILHOUETTE; without it the real inset is 2 to 3 cm too big.
  The bevel must not be bigger than the roof inset (a 7 cm bevel cannot give a 5 cm roof rail): cut it to 5 cm if needed.
- `lift: BEV + 0.006` and **no `topLift`**: the screen stands 6 mm proud of the body all the way up. A `topLift` below `BEV`
  tucks the screen's top under the body and leaves the strip. Remove any such `topLift`, and any custom `foot` that fights it.
- The effective A-pillar inset is `max(requested, aPillarMin)`; `aPillarMin` defaults to `A_PILLAR` and the screen's side edges to
  `A_SIDE` (`frontSideInset`). Cars with a bigger inset (the Armoured Limo's 20 cm) keep it.
- `windows: [[zRear, zFront], ...]` one entry per side window (a B-pillar splits them).
- A backward-leaning rear screen (an overhang) needs a second `cabinGlass` call with the lifts negated, using only `.rear`
  (Slant-Back, Fin Land Yacht).
- Cars with their own glass code (a free-standing windscreen frame, a canopy, a dome, an open car, an armoured limo's small
  windows) need a judgement call: say so in the report instead of forcing `cabinGlass` onto them.
- The helper already merges near-straight points and 3 cm stubs (`dropFlat`, `oneMitre`, `tidyGlass`).
- Known remaining check lines, judged and accepted: Slant-Back (the backward-leaning rear edge reads as an A edge), Glass-Hatch
  Brake (the deliberate full-glass hatch: rear-glass top 5.3 cm from the window top), Sprint Hatch (fastback roof into the hatch
  glass: no C-pillar), Fin Land Yacht (curved roof, clipped window), Armoured Limo (its own 15 cm armour roof rail).

## Verify, and look yourself

1. `node scripts/.glass-contour-check.mjs <car id>` passes: insets steady, screen top = window top (0.0 cm), pillar width
   steady and at least 12 cm at the A-pillar, screen top not under the roof/body, and each window's edge count as expected
   (it states the expected count). Run it twice: if the outputs differ, find out why before trusting either.
2. **Render and read the images** (see Process rules): a LEVEL orthographic side view, a 3/4 front, a close-up of the
   A-pillar/screen-top corner, the rear 3/4, before and after. Compare the pixel row of the screen top and the side-window top
   (they must be the same row). Count each window's corners in the image. Check the screen's foot against the bonnet. Do not
   report success unless your own pixel and corner check confirms it.
3. Other checks: `.ideas-check --quick`, `.bundle-check`, `.modelpatch-check`, `.suspension-check <car>`, eslint on changed files,
   `.platetag-check` (the triangle baseline will change: say by how much and do not edit the baseline file; the orchestrator
   re-records only the glass cars' entries at merge), lamps unchanged. If you change the shared helper, prove every other car's
   output is unchanged (a geometry hash of the 70 idea models before and after: only the cars you meant to change may differ).
4. Add a line to `CHECKLIST.md` (what was and was not verified).

## Report (short, honest)

A table row per car: fixed / judged / left alone; the front-vs-rear window proportion before and after (bottom length and area);
the BODY changes made; the check result; the sheet path. Also: measured gap before and after in cm and in px; edge count per
window; anything still not level or not clean; anything you could not verify (garage view, Evil paint, the game camera, lamps).
Save the before/after images, one labelled sheet (side, level ortho, 3/4 front, A-pillar close-up, rear) in
`/tmp/glass-<car>/sheet.png` and list the full paths so the orchestrator can forward them. Do not claim "done" on numbers alone,
and compare honestly: if the new version looks no better than the old one, say so.
