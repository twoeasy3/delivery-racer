# Prop bounds audit: the guide for the sweeping agents (15-Oct)

The owner's request: "Audit every car for roof prop and cargo prop space. Render a Box and a Cylinder for each, and this will be our
bounds for the customisations. Not all cars will support cargo space, and a select few will not support roof space. Do the same for a
Rear Wing. If a car already has props like this, tag the geometry to remove them when a prop is chosen." The shapes are the
CONTAINMENT BOUNDS of future cosmetic props (render/propmodels.js has nine, built to them). Read `CLOUD-AGENT-README.md` first.

## What exists (branch `claude/prop-bounds`)

- `src/delivery/render/propanchors.js`: the canonical shapes (`PROP_BOUNDS`: one box and one cylinder a slot, fixed aspect ratio; a car's
  entry is a UNIFORM scale + centre + yaw), `KINDS` (what each car is), the reader (`propSlots`, `propSupported`, `fitProp`), the merge
  of the slice files. `MIN_SCALE` (the floor), `maxScale(slot, kind)`: NO CAP since CHECKLIST 307 (the owner: "lift the size caps, only keep a size floor").
- `src/delivery/render/propanchors/slice-<n>.json`: ONE FILE PER SLICE, `{ slice, cars, hand }`. `cars` is GENERATED (never edit);
  `hand` is your hand fixes. You edit only your slice's file. (`slice-0.json` holds the five first test cars: minibus, touringcar,
  sporttruck, moke, rally; your slice's row of the same car wins over slice-0's.)
- `scripts/prop-slices.mjs` (`node scripts/prop-slices.mjs`): the five slices, with counts, ids and each car's kind.
- `scripts/prop-anchors.mjs --slice <n>`: measures your cars, prints the table (car, kind, roof / cargo / wing supported + scale, the
  reason when not), writes `slice-<n>.json` (`--dry` to only print; `<car id> --write` re-measures one car into its slice file).
- `scripts/prop-sheet.mjs --slice <n> [--from i --to j]`: the review contact sheets (side + 3/4 rear, the bounds as wireframes:
  roof BLUE, cargo GREEN, wing RED, box solid, cylinder dashed; the car's own tagged props MAGENTA) to `/tmp/prop-bounds/slice-<n>/`,
  12 cars a sheet. One picture at a time through `scripts/shots.mjs` (it finds the browser at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). `delivery/propview.html?car=<id>` is the page (`&view=all|side|top|front|rear`,
  `&focus=<slot>`, `&hide=1`, `&prop=<prop id>&paint=<hex>` to see one of the nine props fitted).
- `scripts/.propanchors-check.mjs`: the data check on whatever slices exist (`--complete` at the very end: every car has an entry).
- `scripts/.proptag-check.mjs`: the tags changed nothing drawn (geometry hash, triangles, boxes against `scripts/.proptag-baseline.json`),
  the hide / show toggle, dents / ghost / blackout. `scripts/.propmodels-check.mjs`: the nine props.
- `scripts/prop-audit-lib.mjs`: how the placement search works (read its header before you judge a result); it replaced the first
  height-map measurer (CHECKLIST 307). `scripts/prop-placement-audit.mjs` audits the merged table on every car (`/tmp/prop-audit/audit.csv`,
  flags ranked worst first; `--nohand` for the generated rows alone, `--table <json>` to try candidate rows) and is the check to run after
  any change to a placement.

## The owner's own placements (CHECKLIST 440)

A hand row with `"by": "editor"` was placed by the OWNER in the model editor (Places tab) and written by scripts/placements-lib.mjs; it
carries `prev` (the row it replaced). NEVER drop, move or edit one, even where the generator now matches or beats it: it is his
decision. The generator keeps it (it rewrites only `cars`) and says so; `.propanchors-check` lists it without testing it.

## The rules

UPDATED (CHECKLIST 307, the placement audit): the generator's search is now `scripts/prop-audit-lib.mjs optimum`: no scale cap (the
MIN_SCALE floor stays), an inset of at most 5 cm and the least that makes the footprint's rim touch (3 cm preferred when it keeps 85 % of the
scale), standing only on the car's own untagged body (never glass, a lamp, the Super kit or another slot's own prop), touching no visible
geometry (another slot's own props included: they stay drawn when only one slot is worn) and no other slot's shapes; a wing at most 95 % of
the width of the surface it stands on, on the rear-most place within 85 % of the best scale (a boot lid before the roof's edge), its rear at
most 5 cm behind the tail; a load right behind the cab, no higher than the cab's roof (or 0.5 m). Where the text below says 0.08 m of inset
or a cap, read the above.

ROOF (slot `roof`): a flat-enough roof area (the generator: the flat band over the glass, slope under 12 degrees, the largest centred
rectangle; the box's footprint fits it at the largest uniform scale, 0.4 to the cap). A roof with NO flat patch (curved, domed,
tapering) is NOT unsupported by itself (the owner, 15-Oct): the generator sits the shapes on the roof's top region and SINKS them by an
INSET (the table's `inset: [box, cyl]`, metres, at most 0.08) so the base's corners / rim all touch or lie within the surface instead of
hovering on one point; the scale shrinks until the inset fits (`lim: 'inset'`, `from: 'roof-curved'`). The same inset settles a wing on a
crowned deck and a load on an uneven bed. UNSUPPORTED only on: open cars (convertibles, roadsters, mokes, buggies, tractors, bikes), a
dome too small or too round for the smallest prop even at the full inset, canopy / bubble cabins, tracks / boats / hovercraft /
aircraft, the tank, tiny microcars, and anything where a prop would clip or poke through glass. "A select few": if your slice has more
than a quarter unsupported, look again. Report each car's inset where it is not 0 (the table prints it: "inset 3cm").
A roof vent, rack, sign or beacon mid-roof is an EXISTING roof prop: tag it (below), and the whole roof is then free.

DECORATIVE ROOF ITEMS (the owner, 15-Oct: "for cars like the Taxi, the agent may choose to mark the taxi sign as a prop to hide when
equipping"): a taxi sign, a police light bar, a roof lamp, a roof rack, a surfboard, an aerial that is an ornament IS tagged
`userData.prop = 'roof'` and hidden when a roof prop is equipped, and the roof slot then uses the area it occupied. YOU decide per car;
list in the report every item you tagged and why, and the ones you left (a fire engine's ladder, a crane's boom, a snorkel, a working
beacon that the model animates for its idea: part of the vehicle's function, not tagged unless clearly decorative).

CARGO (slot `cargo`): only REAL load areas: a pickup / flatbed / truck bed, a van or wagon with an open back, a half-track's bed, an open
back behind the seats (a moke, a jeep), a deck. Measured only for kinds pickup, flatbed, halftrack, truck, open, special; every other
kind is "a closed body: no load deck". A decorative load already there (crates, a tarp, a boat, a drum) is an existing cargo prop: tag it.

REAR WING (slot `wing`): a rear deck / boot lid / tail where a blade can stand (saloons, coupes, sports cars, open cars with a deck),
AND the roof's rear edge on vans, buses, hatches, estates, pickups' cabs, trucks' cabs (the owner, 15-Oct: "rear wings should work on
the buses / vans"; the generator puts the blade on the roof's last 0.6 m-wide row, at most 8 cm of overhang over a sloping window,
never over a bed). UNSUPPORTED only where there is truly no rear edge: the tank, boats, hovercraft, aircraft, bikes, microcars,
canopy cars, open cars with no deck. A car's own spoiler / wing / fin-that-is-a-wing is an existing wing prop: tag it.

KINDS: every car has one in `render/propanchors.js KINDS` (by id, else by model). If a kind is wrong (a "coupe" that is really open),
change it there: it is one line, and the slices never collide on it as long as you only touch your own cars' lines (say so in the report).

## Tagging existing props (geometry unchanged)

In the MODEL CODE (`render/models*.js`, `render/ideaModels*.js`, `render/carExtras.js` for the Super kit), put `userData.prop = 'roof' |
'cargo' | 'wing'` on the mesh that is the prop, exactly as the plate tags do (`userData.plate`): a roof rack, roof box, light bar,
beacon, roof sign, aerial ornament (roof); a decorative load, crates, barrels, ladder-as-load, tarp, a boat in a bed, a trailer load
(cargo: only when decorative, not the vehicle's function: a fire engine's ladder or a crane's boom is NOT a prop); a spoiler, wing, fin
that is a wing (wing). Nothing drawn may change: `node scripts/.proptag-check.mjs` proves it (geometry hash, triangles, boxes equal the
baseline recorded before any tag). A merged mesh that holds a prop AND body parts cannot be tagged: if the split is trivial (its own
`parts(...)` / bucket, as the Minibus's vent and the plates in `mergeByMaterial`), do it and add the model to `SPLIT` in
`.proptag-check.mjs` (+1 mesh allowed); otherwise list the car as NEEDS A SPLIT in your report and leave it. After tagging, re-measure
A tagged mesh split out of a `mergeByMaterial` bucket must get `geometry = geometry.toNonIndexed()` (and join `keep`): the check hashes vertices, so an indexed mesh reads as changed geometry (the Pick-Up's sports bar: SPLIT `pickup: 11`).
the car (`node scripts/prop-anchors.mjs <id> --write`): the generator measures with the car's props hidden and marks `existing: true`.

## The sweep, step by step

1. `git worktree add .claude/worktrees/prop-slice-<n> -b claude/prop-slice-<n> origin/claude/prop-bounds` (your own branch, from
   `claude/prop-bounds`); `node_modules` as a symlink from another worktree. Never `git stash`; never `pkill -f`; never main; no version bump.
2. `node scripts/prop-anchors.mjs --slice <n>`: read the table. Unsupported slots with a wrong reason, or supported ones that look wrong by
   the numbers (a roof at the bonnet's height, a cargo box in a cabin), are your first list.
3. `node scripts/prop-sheet.mjs --slice <n>`: READ every sheet (`/tmp/prop-bounds/slice-<n>/sheet-<n>-<k>.png`), cell by cell. Obvious
   misfits: a shape floating, sunk into the body, through glass or a lamp, on a bonnet, a wing not at the rear edge, a cargo box on a
   seat. Fix by (a) tagging the car's own prop and re-measuring, (b) a KIND change, (c) a HAND fix in your slice file's `hand` block:
   `"<id>": { "wing": { "box": [scale, x, y, z], "cyl": [scale, x, y, z], "from": "deck", "lim": "hand" } }` or `{ "no": "why" }`
   (the same shape as a generated row; the reader marks it `confidence: 'hand'`), then re-render that car
   (`node scripts/prop-sheet.mjs <id> --out /tmp/prop-bounds/slice-<n>/fix`). Do not edit the generator for one car; if a RULE is wrong
   for a whole class, say so in the report instead of patching the lib (the orchestrator changes the lib once for everyone).
4. Checks before each push: `node --check` and eslint on changed files, `node scripts/.propanchors-check.mjs`,
   `node scripts/.proptag-check.mjs`, `node scripts/.propmodels-check.mjs`; `.platetag-check` and `.modelpatch-check` if you touched a
   model file; the vite build at the end.
5. Commit and push every ~5 cars reviewed (`git push -u origin claude/prop-slice-<n>`). Keep the stills in `/tmp/prop-bounds/slice-<n>/`.

## The status report (every few cars, and at the end)

```
slice <n>: <k> of <total> cars reviewed (branch claude/prop-slice-<n> at <sha>)
roof: supported <a> / unsupported <b> (reasons: ...); cargo: <a>/<b>; wing: <a>/<b>
tagged: <car>: <what> (<slot>) ...        needs a split: <car>: <mesh> ...
hand fixes: <car> <slot>: <why> ...       kind changes: <car> <was> -> <is>
unsure: <car>: <what you could not decide> ...
sheets: /tmp/prop-bounds/slice-<n>/sheet-<n>-1.png ...     checks: <which ran, ok / fail>
```

## Each prop's own maximum scale (CHECKLIST 450)

The owner, 15-Oct, after the caps were lifted (CHECKLIST 307): roof boxes became containers on the buses and vans ("maybe the solution is to
have a max scale for each individual prop"). So: the SLOT keeps the largest scale its surface allows (the anchors, the slice files: that is
the ROOM, unchanged), and EACH PROP declares `maxScale` on its registry entry (`render/propmodels.js` BASE_PROPS, `propmodelsroof.js`
`def(..., maxScale)`, `propmodelscargo.js`, `propmodelswing.js`, `propmodelswingclassic.js`). No global cap, nothing in the anchors.

- API: `fitProp(carId, slot, shape, prop?)` (render/propanchors.js). With the prop: scale = min(room, prop.maxScale), and the prop stays
  SEATED: its base on the slot's base plane (the inset scaled down with it, never deeper), not moved sideways, and along its own z it keeps
  the slot's `SLOT_ALIGN`: roof `centre`, cargo `front` (the cab end of the bed, against the cab), wing `rear` (the slot's rear edge, on
  the centreline). A prop may declare `align: 'centre' | 'front' | 'rear'` to override (none does yet). Without the 4th argument
  (the bounds, the editor's shapes): the room, exactly as before. The result also carries `room` (the slot's scale) and `capped`.
- Callers: render/propdress.js (the game), delivery/propview.html (`&prop=`; `&nocap=1` shows the old room-sized prop),
  scripts/prop-placement-audit.mjs (the real props measured as worn; `PROP-AT-MAX`, weight 0, and the csv's `atMax` column `id scale/room`).
- Where the room is smaller than a prop's max, the prop takes the room (as before). No `minScale` was needed: every max is above the
  smallest room any car gives (`.propmodels-check` asserts it).
- Checks: `.propmodels-check` (every prop has a maxScale, positive, >= MIN_SCALE and >= the smallest room of its slot/shape; fitProp with a
  prop on every car x every prop: scale, base, sideways, alignment), `.propcosmetic-ui-check` (dressed at min(room, max)), `.propmodels-roof-check`.

Sizes are the prop's bounding box at its max (w across x h x d along the car, metres); the canonical bounds at scale 1 are roof 1 x 0.5 x 0.8,
cargo 1 x 0.8 x 1.2, wing 1.4 x 0.35 x 0.3. Seen in stills /tmp/prop-maxscale/*.png (on the owner's tuning list: anything that reads wrong).

| slot | prop | maxScale | size at max (m) | why |
|---|---|---|---|---|
| roof | roofbox (Roof box) | 1.0 | 0.90 x 0.45 x 0.78 | a roof cargo box is ~0.4-0.45 m tall; not a second storey (the minivan's was 2.18: 1.5 m wide, 0.75 tall) |
| roof | roofsign (Roof sign) | 1.1 | 0.99 x 0.44 x 0.18 | a taxi / delivery sign: up to about a metre wide |
| roof | roofbeacon (Beacon dome) | 0.5 | 0.42 x 0.22 x 0.42 | a beacon is a small dome (~0.3-0.4 m) |
| roof | roof-surfboard (Surfboard rack) | 1.5 | 1.47 x 0.50 x 1.16 | a rack spans a roof (~1.4 m); boards stay board-sized |
| roof | roof-tent (Roof tent) | 1.5 | 1.47 x 0.74 x 1.17 | a pitched rooftop tent: roof width, under a metre tall |
| roof | roof-parcels (Parcel stack) | 1.1 | 1.07 x 0.48 x 0.81 | parcels strapped on: about roof-box height |
| roof | roof-dish (Satellite dish) | 0.9 | 0.56 x 0.44 x 0.55 | a small dish (~0.5 m) |
| roof | roof-pennant (Pennant mast) | 1.4 | 0.88 x 0.70 x 0.56 | a 0.7 m mast with its pennant |
| roof | roof-cactus (Rooftop cactus) | 1.1 | 0.90 x 0.54 x 0.95 | a potted cactus; at 1.3 the pot read as a big bowl |
| cargo | cargocrates (Crate stack) | 1.5 | 1.44 x 1.13 x 1.71 | crates up to ~0.9 m; a truck bed takes a big stack |
| cargo | cargobarrel (Barrel) | 0.9 | 0.82 x 0.72 x 0.84 | a cask / drum (~0.6-0.8 m); at 1.1 it read as a vat |
| cargo | cargotarp (Tarp load) | 2.0 | 1.96 x 1.56 x 2.32 | a tarp covers whatever: as big as the bed |
| cargo | cargo-parcels (Pallet of parcels) | 1.2 | 1.15 x 0.89 x 1.39 | a pallet is ~1.2 x 1.0 m |
| cargo | cargo-gas (Gas cylinders) | 1.2 | 1.12 x 0.96 x 1.18 | bottles about a metre tall; at 1.4 they read as tanks |
| cargo | cargo-hay (Hay bales) | 1.3 | 1.25 x 0.95 x 1.46 | small square bales (~0.45 x 0.35 x 1 m) |
| cargo | cargo-melons (Watermelons) | 0.9 | 0.89 x 0.68 x 0.89 | a basket of melons, melons melon-sized |
| cargo | cargo-tyres (Tyre stack) | 1.0 | 0.90 x 0.76 x 0.93 | van / light-truck tyres (~0.9 m); at 1.1 truck tyres in a pickup |
| cargo | cargo-armchair (Armchair on straps) | 1.1 | 1.03 x 0.87 x 1.11 | an armchair is ~0.9 m wide and tall |
| cargo | cargo-junkertarp (Junker tarp) | 2.0 | 2.00 x 1.20 x 2.28 | a tarp: as big as the bed |
| wing | winggt (GT wing) | 1.8 | 2.52 x 0.59 x 0.50 | conventional wings span the car, up to a bus / van (~2.5 m) |
| wing | winglip (Duck-tail lip) | 1.8 | 2.34 x 0.31 x 0.50 | follows the body's width |
| wing | wingtube (Tube wing) | 1.8 | 2.41 x 0.54 x 0.41 | as the GT wing |
| wing | wing-swan (Swan-neck GT wing) | 1.8 | 2.50 x 0.63 x 0.47 | as the GT wing |
| wing | wing-pedestal (Pedestal wing) | 1.8 | 2.50 x 0.63 x 0.45 | as the GT wing |
| wing | wing-tuner (Tuner wing) | 1.8 | 2.50 x 0.52 x 0.50 | as the GT wing |
| wing | wing-ducktail (Ducktail) | 1.8 | 2.34 x 0.25 x 0.52 | follows the body's width |
| wing | wing-hatch (Hatch roof spoiler) | 1.8 | 2.34 x 0.31 x 0.45 | a roof spoiler spans the roof's edge |
| wing | wing-race (Race wing) | 1.8 | 2.52 x 0.63 x 0.49 | as the GT wing |
| wing | wing-biplane (Biplane wing) | 1.6 | 2.24 x 0.56 x 0.43 | two blades: past 1.6 it is a scaffold |
| wing | wing-shark (Shark-fin wing) | 1.3 | 1.69 x 0.45 x 0.36 | a dorsal fin is ~0.3-0.5 m tall |
| wing | wing-pizza (Pizza-box wing) | 1.0 | 1.30 x 0.31 x 0.24 | pizza boxes stay pizza-sized (a joke, already generous) |
| wing | wing-flame (Flame wing) | 1.4 | 1.88 x 0.49 x 0.39 | flames past half a metre swamp a car |
| wing | wing-rockets (Rocket pods) | 1.4 | 1.68 x 0.32 x 0.36 | pods ~0.3 m across |
| wing | wing-hoops (Hoop wing) | 1.5 | 1.95 x 0.45 x 0.45 | hoops ~0.45 m |

## Number plate rules (CHECKLIST 345)

The owner, 15-Oct: "The bumper is the most logical place for the plate but it is not allowed by the current rules", then "The plate should
just stick out from the bar anyway". ONE rule set, in `scripts/plate-search.mjs` (`RULES` and the header above it); the place search, the
generator (`scripts/plate-anchors.mjs`), the audit (`scripts/plate-placement-audit.mjs`) and the model editor's plate chips / Snap / Fit
(`render/placementedit.js`) all read it. Nothing else holds a plate threshold.

A plate (4:1, centred on the car's centre line) has a valid place at an end when:

1. **Surface**: it stands on the car's own solid surface: paint, a bumper of ANY finish (chrome, painted, black), trim. Never glass, a lamp
   (unlit or glowing material), a wheel or a spare tyre; the surface is the first thing met from outside, within `REACH` 0.5 m of the end.
2. **Flat**: one plane under it where it stands on its surface (within `STRICT` 6 mm; `ROUGH` 12 mm only when nothing strict exists).
3. **Edges**: ON A BUMPER BAR it is centred on the bar's face (the bar's middle height) and may stick out past the bar's top, bottom and
   ends, as long as at least `BAR_HOLD` (half) of its height AND of its width are on the face: the canonical 0.52 x 0.13 plate goes on any
   bar 6.5 cm tall and 26 cm wide. ON THE BODY the surface reaches past its sides, and past its top and bottom except for `OVERHANG_Y` (1 cm)
   each. A surface `GAP` (1.5 cm) or more behind the plate is not under it.
4. **Upright and square**: pitch at most `MAX_PITCH` 25 degrees (`GLACIS` 40 only at an end with nothing upright, flagged ON_A_LID),
   yaw at most 1.5.
5. **Clear**: nothing in front of its face straight on; less than `COVER_UP` (a quarter) hidden from `UP_ANGLE` 20 degrees above.
6. **Height**: bottom edge at least `LOW_EDGE` 10 cm off the ground; middle no higher than `HIGH_FRAC` 60 % of the car.

The choice: a place on a BUMPER BAR first (any size; `findBars`: a band of the end's surface on the centre line, 4 to 30 cm tall, flat,
standing 1.5 cm or more proud of the surface above and below it), else the body as before; then the bigger plate (0.52, 0.46, 0.40, 0.34,
0.30), flatter, more upright, nearer the car's own plate height (body only), out at the end, clear from above.

The audit measures a worn plate against the same numbers (FLOATING / BURIED, TILTED / UNEVEN, OVER_EDGE, COVERED / COVERED_FROM_ABOVE,
ON_GLASS / OVER_LAMP / ON_WHEEL, ON_A_LID, LOW, HIGH; on a bar, contact is judged where the plate is on the face), says where each plate
stands (`on`: bumper / above / below the end's bar / body at an end with no bar) and keeps a few sanity flags of its own (TUCKED,
WRONG_HALF, FACES_WRONG_WAY, TEXT_MIRRORED, TWO_PLATES, ZFIGHT, PLATE_LIKE_UNTAGGED). SMALL is information, not a fault. Removed:
TALLER_THAN_SURFACE and WIDER_THAN_SURFACE (both were OVER_EDGE again with other numbers).

Regenerating: `node scripts/plate-placement-audit.mjs --fix --write` re-places every end that has a placement flag OR stands off its bar
while the bar takes a plate, auditing each candidate as dressed; it takes one only when it has no more placement flags than the place it
replaces (then: onto a bar from the body, then bigger). HAND rows in `render/plateanchors.js` (reasoned fixes, and the owner's own
`by: 'editor'` rows from the model editor) are never touched: only the generated table is written. A new car:
`node scripts/plate-anchors.mjs <id> --write`, then the audit on it.
