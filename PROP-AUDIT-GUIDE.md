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
