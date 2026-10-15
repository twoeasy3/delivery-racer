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
- BEFORE drafting, grep CARS-CATALOGUE.md (repo root) for each vehicle you have in mind AND for its real-world inspiration (maker, model,
  nickname; also a different car of the same real vehicle is a duplicate). It lists every car in the game and the ten in progress on other
  branches. Set `basedOn` (the real vehicle) on every idea entry you add. Do NOT edit CARS-CATALOGUE.md yourself (parallel branches
  would conflict): the orchestrator adds your rows at merge, from your `basedOn` and `note`.
- No weird cars: believable, recognisable road vehicles, classic or real-world inspired. No gimmicks.
- Draft your {N} ideas first (name, real-world inspiration, Good colour, Evil colour) and send them to me with
  SendMessage before modelling. Then carry on without waiting.
- Colours: an evocative colour for Good (`color`), an alternative colour for Evil (`evilColor`), as the existing idea
  cars do. Do not mention a colour or livery in the car's note unless its name denotes one specific real vehicle.
- Convertible or open-top: do NOT render a person/driver.
- **STANDING RULE (the owner, 15-Oct): NO bikes, NO flying objects, and nothing driven by a rider instead of a driver.** A car has a
  DRIVER sitting in it: no motorcycles, scooters, mopeds, trikes or bicycles with a rider astride, no one-wheelers or standing
  vehicles, no aircraft, drones, balloons or craft that fly (hovering is not flying for the existing cars, but do not propose new
  ones). Road vehicles with wheels and a driver's seat only. Existing cars that already break this rule (for the owner's call, do not
  change them): sidecar (scooter and sidecar), gyrocar, monowheel (now an idea car), flyingcar, ufo and earned-ufo, hovercraft.

## The benchmark is the JUNKER (the owner, 14-Oct: "Use the Junker as the benchmark")
Wherever this file or an older brief says the approved Commuter is the detail benchmark, use the JUNKER instead
(`junker` in render/modelsOrig3.js: 21 meshes, about 2,146 triangles, 15 draw calls; the Legendary variants and the original
roster rebuilds sit beside it). What it sets: a SHAPED front end (a real grille, bonnet and wings, never a flat slab), a chunky
silhouette that reads at card size, and character through surface treatment: soft-edged weathering and small drawn-in-code
textures (rust decals that fade out with NO hard rectangular edges, a 256 x 256 cloth picture, vertex-colour shading low down,
a lumpy load shape). Everything else in the rules below still holds: no panel lines, plain chunky wheels, silhouette first,
12 to 25 shapes, 1,000 to 2,200 triangles (3,000 is the hard cap), textures only drawn in code and no bigger than 256 x 256,
lamp placements, no humans.

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

## Proportions: not narrow (the owner, 14-Oct: "all of these recent idea models look narrow... fix them to be more like the median")
Measured over the roster (full model box, wheels and mirrors included): the median car is 2.09 m wide, 80% are between 1.62 and
2.72 m, and the median width / length ratio is 0.44 (80% between 0.35 and 0.54). The first idea cars of 14-Oct came out thin
(widths of 1.07 to 2.06 m on 1.65 to 6.6 m lengths) and had to be widened. So: for the real car you copy, take its real length,
then make the model's overall width (wheels and mirrors included) about 0.44 to 0.50 of its length (err WIDE: the owner keeps finding the new models narrow even at 0.44 beside the roster) unless it is a deliberately
narrow vehicle, and compare with existing cars of similar length (measure a few with a Box3.setFromObject script like the one in
scripts/.suspension-check.mjs). The cap on an idea's width is 3 m (hw 1.5; scripts/.ideas-check.mjs). Set `hw`, `hl`, `height` in
the entry to match the model, and re-measure the lamp placements if you change the width later.

## Windows follow the body contour (the owner, 14-Oct: "The agents have this quirk of not being able to generate the correct shape of windows for the contour")
A window is NOT drawn by eye. Its outline is DERIVED from the body's own side profile: take the roofline and pillar edges of the
body outline (the pink line in the owner's mark-up: the chassis contour from the rear deck over the roof and down the A-pillar to
the windscreen base) and inset them by a constant margin (pillar width: about 6 to 9 cm at the A- and C-pillars, about 5 cm at the roof
rail, a little more at the sill/beltline). The glass edge (the purple line) then runs PARALLEL to the contour: same rake, same
curve, same kinks. Never a free-standing dome or arch that ignores the roofline. Use one inset helper for every window of a car (side
glass, windscreen, rear glass, both sides), build side glass as a flat polygon from the inset outline, and check by rendering the side
and front three-quarter views and asking: does the window's top edge follow the roof contour at an even distance? Same for a
windscreen against the roof and A-pillar rake and a rear window against the tail.

The windscreen and the side windows share ONE top line (the owner, 14-Oct: "Almost every car's windscreen is higher than the side window"):
the windscreen's top edge and the side window's top edge are at the SAME height where they meet at the A-pillar (both are the roof
contour inset by the same roof-rail margin), the windscreen's side edge and the side window's front edge are the two sides of ONE
pillar of constant width, and the rear glass meets the side window's rear edge the same way at the C-pillar. Build windscreen, side glass
and rear glass from the same inset outline and one roof-top height per car, never each with a height of its own.

Crisp glass edges: three faults found on the Commuter (15-Oct, CHECKLIST 345) that make a window's edge ragged; check every pane for them.
- **A pane polygon's points must go IN ORDER round the outline.** The old Commuter listed its roof samples front-to-back AFTER the
  back-top corner, so the polygon zig-zagged and its triangle fan (`panel`, fanned from the first point) overlapped itself: a
  sawtooth along the window's top. Sample the top edge from the back corner to the front corner (or the reverse), then close.
- **A pane must stand clear of the body's bevels.** A flat pane lifted a few mm off a bevelled flank is cut by the rounded shoulder
  under its foot (the body outline grows by the bevel size, so the real shoulder sits that much above the waist line) and by the
  roof's rounded edge above its top. Put the pane's foot above the shoulder (waist + bevel + a margin), its top a few cm under the
  roof line, and lift it 1 to 2 cm, not 6 mm; inset a windscreen or rear glass further from the pillars than the bevel's size.
- **Where a surface bends, flat parts cut it raggedly.** Any flat or thin part laid on a curved corner (a lens, a badge, a pane)
  meets the faceted body in a kinked line. Either put the part on a flat face, or give it a steep wall (a ring, a block, a fat
  shape) so its visible outline is its own rim and not the intersection.
Look at the side AND a steep three-quarter view at 2x (`scripts/shots.mjs ... --scale=2`, then crop) before calling a window done.

## No panel lines, and do not try too hard (the owner, 13-Oct)
- NO PANEL LINES. Do not model door shut lines, bonnet / boot / tailgate / fuel-flap lines, panel gaps, seams, or thin
  strips of any kind that only fake a join. They never read at card size, they cost triangles and shapes, and they made
  the original cars look fussy and ugly. Leave the body surface clean: big smooth forms and clear colour blocking.
- Silhouette and proportion first. Judge the car at CARD size (about 120 to 200 px wide) next to its reference and keep
  only the detail that survives there: lamps, grille, glass, bumpers, wheels with hubs, one or two strong colour breaks.
  Skip the clutter (door handles, wipers, tiny trim, plates on every face) unless it clearly reads. A simple, charming,
  bold shape beats a busy one: 'trying too hard' is a defect.

## No scooped wheel wells (the owner, 14-Oct)
Do NOT carve wheel wells into the body like ice-cream scoops out of a tub. It is trying too hard and wastes polygons. Use a
plain body with the wheel sitting against (or slightly under) the body side, or a simple flat arch cap / fender only where it
truly reads at card size. A rework that removes scooped arches should get cheaper, not dearer.

## STANDING RULE: NOT EVERYTHING NEEDS A TEXTURE (the owner, 14-Oct: "trying too hard with the textures")
Default to NO texture. Flat colours, clean shapes, colour blocking and (sparingly) vertex shading are the baseline; most cars should
have none at all. Add a texture ONLY when the car cannot read as itself without it (a tarpaulin, a grille mesh, a race roundel on a
racing car) and then use ONE small one (128 x 128 or less). Never add texture for its own sake: not weathering on every panel, not
grime or dust decals on clean modern cars, not a texture on each car in a batch because the last batch had one. If you can drop a
texture and the car still reads at card size, drop it. Say in your report which cars have none (that is the good outcome).

## Textures: allowed, drawn in code (the owner, 14-Oct, relaxing his earlier "no new textures")
Textures are fine where they make a car read better (curtains, flames, grilles, rust, a tarpaulin, banners...), as long as they
are DRAWN IN CODE on a canvas (the `texture()` helpers in render/modelsOrig*.js: made once, cached, shared) and never image files:
a drawn texture costs no download (only a few KB of drawing code) and about 4 bytes a pixel of memory. Keep them modest: 256 x 256
is the biggest in the game today (the Junker's tarpaulin), so use 128 or less where it will do and say why if you go larger.
Prefer flat colours, shape and vertex colours first (the approved Junker's and Commuter's way), and no panel-line drawing in textures
either (see the section above). Report each texture's size.

## Lamp placements: every new car needs them (the owner, 14-Oct)
Every car created from now on (a new car, a rebuilt model, a variant that gets its own model) must come with its own HEADLIGHT,
TAILLIGHT (brake lamp) and BLINKER placements, defined in the per-car lamp table (render/carlights.js `CAR_LAMPS`, keyed by model
name: positions, sizes, round or square, mirrored pairs, which tail lamp brakes, where the indicator flash sits) so the game's
night beams, brake lights and indicators sit on the model's own lamp shapes instead of the generic hitbox guess. A variant that
reuses a base car's model (e.g. the Legendary variants) uses the base model's entry. Part of "done" for a car: the entry, the
before/after stills (`?lamps=show`), and a line in the CHECKLIST item. How to do it: LAMP-PLACEMENT-GUIDE.md.
(The lamp code and the guide are on main now; the per-car table is spread from render/carlights-batch*.js files: add your own new file, carlights-batch<yours>.js, and one import + spread line in render/carlights.js.)

## Defects that are NOT allowed
- No unconnected parts and no floating parts (a lamp, mirror, trim strip, spat, plate or stalk must touch/sit in the
  body, including on ROUNDED edges where an extrusion's bevel pulls the surface in).
- No Z-fighting (coplanar faces: offset or inset trim by a few mm, never leave two faces on the same plane).
- No missing windscreens or windows (front, rear and sides all glazed; pillars must follow the glass).
- No missing lights: headlamps at the front, tail lamps AND brake lamps at the rear (and indicators/reversing lamps where
  the real car has them), all visibly seated in the body.
- Lamp EFFECTS (brake glow, indicators, night glow) for a new car: see LAMP-PLACEMENT-GUIDE.md.
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
- Follow the ideas.js conventions (entry fields, `model` name, the note/tooltip rules in the README). Put your entries in your own
  new file ideasBatch<yours>.js and models in render/ideaModelsBatch<yours>.js with one-line registrations in ideas.js and
  render/ideaModels.js (the one-liners conflict at merge; the orchestrator keeps both). The ideas-check no longer has a fixed count:
  do not edit it; add a line to the ideas.js header only if the file asks for it.
- Run: node --check and eslint on changed files, node scripts/.ideas-check.mjs, .suspension-check, .descriptions-check,
  .words-check, vite build.
- Add a CHECKLIST.md item (next free number on main) saying what was and was NOT verified, with shapes/triangles per car.

## Report
You cannot send images to the owner (no SendUserFile): save the final stills as PNGs in your own folder under /tmp and
SendMessage "main" the absolute paths AS EACH CAR IS FINISHED (the owner, 14-Oct), not at the end. SEND FEWER ANGLES (the
owner, 14-Oct): per car, Good only unless Evil differs in more than colour, as ONE contact sheet of at most four views (front
three-quarter, rear three-quarter, side, top-down only if the roof matters) plus ONE LAMPS image: the same car in the game's
`?lamps=show` view with the headlamp, tail / brake lamp and indicator placements marked (or at night with brake and hazards
on), so the lamp definitions can be judged. Do not send the nine-view sheets, the Evil sheet, nose and tail close-ups unless
asked (still render and READ them yourself while inspecting: see "How to inspect"). Report: branch, commit, car names/ids,
shapes and triangles per car, defects found and fixed, what is still wrong, what you did not see. Then STAND BY for
follow-up changes.

## Number plate anchors: every new car gets one, or an explicit 'none' (the owner, 14-Oct; not a hard check)
The equippable number plate (render/platecosmetic.js) stands on each car's rear and front at a place in the plate table (render/plateanchorstable.js,
GENERATED, keyed by model name, read by render/plateanchors.js). A new car (or a rebuilt model) should get its entry: run
`node scripts/plate-anchors.mjs <car id> --write` (it builds the model, shoots rays at its back and front, fits a flat place and writes the entry; a
craft, bike or open-wheeler goes on the none list), then look at it (`?cosmetics&car=<id>&platedesign=classic&slot=plate&closeup=rear` and `=front`
with scripts/shots.mjs) and, if a place is wrong, put a hand fix in `HAND` in render/plateanchors.js (or the model in `HAND_NONE`). Give a plate a flat
place about 0.52 x 0.13 m (0.40 or 0.30 wide will do) at the car's centre line, clear of lamps and glass. A car with no entry is "unplaced": the plate
cosmetic does nothing on it, its own plates stay. Legendary variants are never dressed. Say in your report which cars got a plate place and which 'none'.

## Prop spaces: every new car gets a ROOF, a CARGO and a REAR WING decision (the owner, 15-Oct; not a hard check yet)
Future cosmetics (render/propmodels.js: roof props, cargo props, rear wings) are fitted to each car inside canonical BOUNDS: for each of the three slots a
BOX and a CYLINDER of one fixed aspect ratio, scaled uniformly and placed per car (render/propanchors.js `propSlots(carId)`, `fitProp(carId, slot, shape)`;
the per-car data is GENERATED by `scripts/prop-anchors.mjs`; the tooling, `PROP-AUDIT-GUIDE.md` and the canonical shapes are on branch
`claude/prop-bounds` until it merges: read them there). A new car (or a rebuilt model) must say, for EACH of the three slots, SUPPORTED or NOT, with a reason:
- ROOF: a flat-enough roof area (about 0.5 x 0.4 m, slope under ~12 degrees). Supported on almost every closed car; NOT on open cars (convertibles, mokes,
  roadsters, tractors), dome or canopy roofs, tracks, boats, hovercraft, aircraft, the tank, tiny microcars: only a select few.
- CARGO: a real load area a load can sit in or on: a pickup or flatbed bed, an open back, a tailgate deck, a rear rack zone on a van or estate, a half-track
  bed. NOT on most saloons, coupes or supercars (they have no cargo space): say so rather than invent one.
- REAR WING: a rear deck, boot lid or tail where a wing or spoiler can stand, AND the roof's rear edge on vans, buses, hatches and pickup cabs (the wing stands at
  the roof's actual rear edge, not mid-roof). NOT on boats, the tank, tracked or open vehicles with no rear structure.
Do this: run `node scripts/prop-anchors.mjs <car id>` (it measures the built model and writes the car's entry: three slots, each supported or not with a reason,
box and cylinder scale/centre/yaw), look at the review render (`node scripts/prop-sheet.mjs`: the box and cylinder drawn on the car in blue for roof, green
for cargo, red for wing), and fix a wrong place with a hand fix. TAG every decorative prop the car already carries (roof rack, roof box, light bar, beacon,
taxi sign, antenna ornaments, a load in a bed, crates, barrels, tarps, ladders, a spoiler or wing, rear fins that are a wing) in the model code as
`userData.prop = 'roof' | 'cargo' | 'wing'` so a chosen cosmetic can hide it (geometry unchanged: render/propcosmetic.js `hideProps(model, slot)`; a prop merged
into a body mesh cannot be tagged: keep decorative props as their own meshes when you model them, so they can be hidden). Design so the slots work: keep a
flat roof area clear of vents, a bed or deck that is a real flat surface, and a rear edge or deck for the wing. Say in your report, per car, the three slots
(supported or not, with the reason) and which of the car's own props you tagged.
- A decorative item that sits in a slot (a TAXI SIGN, a police light bar, a roof lamp or rack) may be tagged as a prop to hide when a cosmetic is equipped
  (the owner, 15-Oct: "for cars like the Taxi, mark the taxi sign as a prop to hide when equipping"): decide per car and say which items you tagged and why. Do
  not tag what is part of the vehicle's function (a fire engine's ladder, a crane) unless it is clearly decorative.
- A roof with NO FLAT SPOT (curved, domed or tapering) is not automatically unsupported: INSET the roof prop's bounding box (and cylinder) into the roof (the
  owner, 15-Oct) so its base has several points of contact with the curved surface: record the depth as `inset` (metres, at most about 8 cm, never through glass
  or into the cabin) in the car's table entry; `fitProp` lowers the prop by it. Only roofs still too curved or small after a maximum inset, and the open and
  dome cases above, are unsupported (with the reason). The same inset may be used for a rounded boot deck (wing) or load area (cargo).
