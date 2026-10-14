# Prompt for a car-modelling agent (idea cars)

Copy everything below the line into the Agent call. Fill in {N} (how many cars) and {LIST} (the cars we already have; get it
with: grep -ho "name: '[^']*'" src/delivery/cars.js src/delivery/ideas.js | sort -u).

---

Repo /home/user/delivery-racer. Read CLOUD-AGENT-README.md, CLAUDE.md, CHECKLIST.md and the header of src/delivery/ideas.js
first. Work in your own worktree (isolation) on a branch from main; commit WIP often. Do NOT merge to main, do not bump the
version, do not push to main. Task: add {N} new IDEA CARS (src/delivery/ideas.js IDEA_CARS; models in
src/delivery/render/ideaModels*.js, a new ideaModelsN.js spread into IDEA_MODELS; shown in the garage's Car ideas lot).

## Which cars
- Cars we already have (NO duplicates, no near-duplicates, not the same real-world vehicle): {LIST}
- No weird cars: believable, recognisable road vehicles, classic or real-world inspired. No gimmicks.
- Draft your {N} ideas first (name, real-world inspiration, Good colour, Evil colour) and send them to me with
  SendMessage before modelling. Then carry on without waiting.
- Colours: an evocative colour for Good (`color`), an alternative colour for Evil (`evilColor`), as the existing idea
  cars do. Do not mention a colour or livery in the car's note unless its name denotes one specific real vehicle.
- Convertible or open-top: do NOT render a person/driver.

## The quality bar (and the budget)
The two reference cars. READ their models first and match their level of detail, NOT more:
- Split-Window Coupe (`splitwindow`, ideaModels.js): 38 shapes (meshes), 2,156 triangles, biggest single mesh 776.
  Built from 11 boxes, 22 cylinders (wheels, lamps, trim), 2 extrusions (the body) and 3 small custom geometries.
- Silver Comet (`centreseat` model, cars.js): 46 shapes, 4,324 triangles, biggest mesh 1,244 (20 cylinders, 18 boxes,
  6 spheres, 2 extrusions). This is the CEILING for a hero car, not the target.
- For reference: the Commuter is 35 shapes / 764 triangles; the roster's median is about 43 shapes / 1,600 triangles.

THE BUDGET (the owner, 12-Oct: "tone down on the triangles"): aim for 40 to 55 shapes and 1,800 to 3,000 triangles a car;
NEVER above 4,000. The last two idea cars came out at 3,208 and 5,868 triangles, too heavy: do not repeat that. How:
- Spend detail where it is SEEN at card size and in the showroom (nose, tail, lamps, glasshouse, wheels), not on parts
  nobody sees (underside, inside the arches, hidden faces).
- ExtrudeGeometry bevels: few segments (bevelSegments 1, curveSegments 4 to 6). Bevels were what bloated the last bodies.
- Cylinders (wheels, lamps, pipes): 12 to 16 radial segments for wheels, 8 to 10 for small trim; no caps you cannot see.
  Spheres: 8 x 6 for small lamps.
- Share and reuse geometry (one cached geometry for the four wheels, one for mirrored lamps); do not build a new
  geometry per identical part. Merge tiny parts that share a material where it does not break animation/suspension.
- Measure when you are done (a short script like the one in scripts/.suspension-check.mjs: traverse the model, count
  meshes and triangles) and put the numbers in the CHECKLIST item. If over budget, trim before reporting.

## No panel lines, and do not try too hard (the owner, 13-Oct)
- NO PANEL LINES. Do not model door shut lines, bonnet / boot / tailgate / fuel-flap lines, panel gaps, seams, or thin
  strips of any kind that only fake a join. They never read at card size, they cost triangles and shapes, and they made
  the original cars look fussy and ugly. Leave the body surface clean: big smooth forms and clear colour blocking.
- Silhouette and proportion first. Judge the car at CARD size (about 120 to 200 px wide) next to its reference and keep
  only the detail that survives there: lamps, grille, glass, bumpers, wheels with hubs, one or two strong colour breaks.
  Skip the clutter (door handles, wipers, tiny trim, plates on every face) unless it clearly reads. A simple, charming,
  bold shape beats a busy one: 'trying too hard' is a defect.

## Textures: allowed, drawn in code (the owner, 14-Oct, relaxing his earlier "no new textures")
Textures are fine where they make a car read better (curtains, flames, grilles, rust, a tarpaulin, banners...), as long as they
are DRAWN IN CODE on a canvas (the `texture()` helpers in render/modelsOrig*.js: made once, cached, shared) and never image files:
a drawn texture costs no download (only a few KB of drawing code) and about 4 bytes a pixel of memory. Keep them modest: 256 x 256
is the biggest in the game today (the Junker's tarpaulin), so use 128 or less where it will do and say why if you go larger.
Prefer flat colours, shape and vertex colours first (the approved Commuter's way), and no panel-line drawing in textures
either (see the section above). Report each texture's size.

## Lamp placements: every new car needs them (the owner, 14-Oct)
Every car created from now on (a new car, a rebuilt model, a variant that gets its own model) must come with its own HEADLIGHT,
TAILLIGHT (brake lamp) and BLINKER placements, defined in the per-car lamp table (render/carlights.js `CAR_LAMPS`, keyed by model
name: positions, sizes, round or square, mirrored pairs, which tail lamp brakes, where the indicator flash sits) so the game's
night beams, brake lights and indicators sit on the model's own lamp shapes instead of the generic hitbox guess. A variant that
reuses a base car's model (e.g. the Legendary variants) uses the base model's entry. Part of "done" for a car: the entry, the
before/after stills (`?lamps=show`), and a line in the CHECKLIST item. How to do it: LAMP-PLACEMENT-GUIDE.md.
STATUS NOTE: the lamp code and the guide are on branch claude/car-lights until the owner merges it; until then, define the
lamp positions in your report (measured from the model: centre, size, brake lamp, indicator flash place) so they can be entered.

## Defects that are NOT allowed
- No unconnected parts and no floating parts (a lamp, mirror, trim strip, spat, plate or stalk must touch/sit in the
  body, including on ROUNDED edges where an extrusion's bevel pulls the surface in).
- No Z-fighting (coplanar faces: offset or inset trim by a few mm, never leave two faces on the same plane).
- No missing windscreens or windows (front, rear and sides all glazed; pillars must follow the glass).
- No missing lights: headlamps at the front, tail lamps AND brake lamps at the rear (and indicators/reversing lamps where
  the real car has them), all visibly seated in the body.
- Wheels planted on the floor and found by the suspension (node scripts/.suspension-check.mjs <id>).

## How to inspect (do it for EVERY car, before committing it as done)
Render the car from ALL sides (front, rear, both sides, top, four three-quarters; Good AND Evil) with a scratch viewer
page or scripts/shots.mjs (use --browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; do not use --scale=2, the
page draws four times; zoom with the model camera instead). READ every still and zoom into nose, tail, pillars and
wheel arches. A defect you do not look for will be there. Fix, re-render, repeat. Do not commit a scratch viewer page
(delete it before finishing) and keep scratch scripts out of the repo (use a unique name; do not reuse a name another
agent may have used).

A quicker look, and small fixes without code: the MODEL EDITOR (`/delivery/modeleditor.html?car=<id>`) shows any
car's model part by part (shapes, triangles, the draw calls against the budget above, the hitbox, the wheels). Its
edits are a PATCH (`src/delivery/modelpatches/<car id>.json`, applied by the game over your code), NOT a replacement
for modelling: fix a model in its code; when you change a model that has a patch, run
`node scripts/model-patch.mjs --all --check` (a part the patch names that your change removed is reported as
unmatched: tell the owner, do not delete the patch).

## Wiring and checks
- Follow the ideas.js conventions (entry fields, `model` name, the note/tooltip rules in the README); update the idea
  count in scripts/.ideas-check.mjs and the ideas.js header.
- Run: node --check and eslint on changed files, node scripts/.ideas-check.mjs, .suspension-check, .descriptions-check,
  .words-check, vite build.
- Add a CHECKLIST.md item (next free number on main) saying what was and was NOT verified, with shapes/triangles per car.

## Report
You cannot send images to the owner (no SendUserFile): save the final stills as PNGs in
/tmp/claude-0/-home-user/4ab9aa0b-f1e2-5d29-9323-35e61dac4e41/scratchpad/<your-folder>/ and tell me the paths: nine views
per car in Good and Evil, nose and tail close-ups. Report: branch, commit, car names/ids, shapes and triangles per
car, defects found and fixed, what is still wrong, what you did not see. Then STAND BY for follow-up changes.
