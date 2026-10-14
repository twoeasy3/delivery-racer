# Lamp placement guide: putting a car's lamp effects on its own lamps

How to give any car custom headlamp, tail/brake lamp and indicator places, so that the game's lamp EFFECTS (brake
lamps lit, indicators and hazards flashing, a wrong-way driver's flashed headlamps, the night headlamp glow and
spotlights) sit on the model's own lenses instead of where the hitbox guesses. The pilot (CHECKLIST 243) did four cars:
the Commuter, Lowrider, Pick-Up and Sportscar (`miata`).

**Where the code is.** The code is NOT on `main` yet. It is on branch `claude/car-lights` until merged:
- `src/delivery/render/carlights.js` (on claude/car-lights until merged): the table `CAR_LAMPS`, its layouts, `?lamps=`, the markers.
- `src/delivery/render/cars.js` `syncLamps` (on claude/car-lights until merged): reads the layout. The player and traffic call it.
- `src/delivery/render/headlights.js` (on claude/car-lights until merged): the night spotlights' spread and the traffic beam.
- `src/delivery/render/items.js`, `src/delivery/main.js`, and the Lowrider's `userData.lampFrame` in `render/modelsOrig2.js`
  (all on claude/car-lights until merged).
- On main: the old hitbox placement (render/cars.js syncLamps, render/headlights.js), and `scripts/modelpatch-load.mjs`
  (builds models headless).

## 1. What the old placement does (for every unlisted car, unchanged)
Everything comes from the hitbox (`hw`, `hl`, `height`), not the model:
- **Brake lamps:** placed at x = ±0.33·w, y = height/2 (clamped to 0.55 to 1.1 m), 4 cm behind the hitbox tail, with a 0.4 m box halo.
- **Indicators:** on the hitbox corners at that same y, 5 cm beyond the nose or tail.
- **Flashed headlamps:** 12 cm before the nose.
- **Night spotlights:** two of them, ±0.7 m, 2.2 m up, from the hitbox nose (CONFIG.headlights).
- **Traffic beam:** starts at the hitbox nose.

Typical errors: brake lamps floating behind short-tailed models (Commuter: 13 cm), sitting on a tailgate 30 cm inboard of
the real lamps (Pick-Up), covering two lamps where only one brakes (Lowrider), and indicators hanging in the air.
`genericLayout` in carlights.js reproduces this exactly. A car NOT in `CAR_LAMPS` uses it.

## 2. The data format (`CAR_LAMPS`, render/carlights.js)
- **Key:** the MODEL name (`car.model`, which is also the traffic kind's `CONFIG.vehicles[kind].model`), or an idea car's id.
- **Coordinates:** car-local metres. x is across (list the +x lamp, which is the car's left), y is up from the road,
  and z is along the car with the nose at +z.
- **`at`:** the centre of the lens's OUTER FACE. The effects are laid a few mm proud of it (brake 12 mm, indicator
  22 mm, glow 30 mm, halo 40 mm) so nothing z-fights.

| field | per lamp | meaning |
|---|---|---|
| `head` | `at`, `size` [w,h], `round`, `mirror` | headlamps: the night glow sits on each; the player's spotlights take their spread (mean abs x) and start (max z) from them |
| `tail` | same, plus `brake` | tail lamps. `brake` omitted or `true`: the whole lamp lights as a brake lamp. `false`: never. `[w,h]`: only an inner part that size |
| `blink` | same, plus `red`, `shared` | indicators. Front or rear comes from the sign of z, side from the sign of x. Amber unless `red: true`. `shared: '<lamp>'` documents that there is no lens and it flashes over another lamp |
| `reverse` | same | reversing lamps. Markers only: nothing lights them yet (the game has no reverse gear) |
| `frame` | (per car) | name of a `userData` hook on the model, a node the lamps ride in when the body moves on its own (section 5) |

An entry may list lamps at one end only: the other end keeps the old hitbox placement (`lampsFor`). An end with lamps
but no `blink` entry has no indicators. List only lamps the model really has (no invented lamps).

`mirror: true` adds the -x twin, so a pair is written once. Example (the Pick-Up):
```js
pickup: {
  head: [{ at: [0.74, 1.28, 2.609], size: [0.24, 0.2], mirror: true }],
  tail: [
    { at: [0.98, 1.44, -2.576], size: [0.1, 0.16], mirror: true, brake: false }, // tail lamp (upper)
    { at: [0.98, 1.29, -2.576], size: [0.1, 0.12], mirror: true },               // brake lamp (lower)
  ],
  blink: [
    { at: [0.74, 1.08, 2.596], size: [0.28, 0.08], mirror: true },                // the real amber bar
    { at: [0.98, 1.44, -2.576], size: [0.1, 0.16], mirror: true, red: true, shared: 'tail lamp' },
  ],
},
```

## 3. Measuring a model's lamps
Read the model code first: the lamp lines usually say what each is (for example "tail lamp over brake lamp"). Then
measure, because the code's numbers are often lens centres before a bevel, rotation or `-L - 0.015` offset.

The pitfall: models MERGE parts by material (one mesh holds both headlamps, or all four tail lamps). The model
editor's part list and `render/modelpatch.js` guessRole then show one "part" spanning the car, and guessRole calls
the common cream lamp colour `#fff3c4` an "indicator". Do not trust the roles for this job. Split each glowing mesh
into connected pieces instead:

```js
// node <script> (put it in your scratchpad; it imports the repo's loader by absolute path)
import { startModels } from '/home/user/<worktree>/scripts/modelpatch-load.mjs';
const THREE = await import('/home/user/<worktree>/node_modules/three/build/three.module.js');
const { load, close } = await startModels();
const { MODELS } = await load('render/models.js'); const { CARS } = await load('cars.js');
const car = CARS.find(c => c.id === 'pickup'), model = MODELS[car.model](car);
model.userData.animate?.(0); model.updateMatrixWorld(true);
model.traverse((node) => {
  const mat = node.isMesh && [].concat(node.material)[0];
  if (!mat || !(mat.type === 'MeshBasicMaterial' || mat.emissive?.getHex())) return;   // lamps are unlit/glowing
  // every triangle's 3 corners in model space; triangles sharing a corner (rounded to 1 mm) are one piece (union-find);
  // print each piece's Box3 centre and size with '#' + mat.color.getHexString()
});
await close();
```
- **Sorting the pieces:** sort by colour from the hex, not `getHSL`, because the colours are stored linear and HSL
  thresholds mislead. Cream/white at the front is a headlamp; bright red (`#ff2a2a`) is a tail lamp; dark red
  (`#c4101c` / `#c0141c`) is usually the brake lamp; amber is an indicator. White low at the front may be a fog lamp
  or a roof spot bar. Leave those out, and say so.
- **Turning a piece into an entry:** `at` = [centre x, centre y, the outer face z (box max z at the front, min z at the
  back)]. `size` = the piece's x and y extents, a little smaller for teardrops and curved lenses (the glow should sit
  on the lens, not past its edges).
- **Mirroring:** keep the +x piece of each pair and set `mirror: true`.

## 4. Rules for the choices the model does not make for you
- **Which tail lamp brakes:**
  - A separate brake lens (often the darker red, or "the brake lamp" in a comment) brakes alone; set the rest `brake: false`.
  - With one lens a side, the whole lamp brakes.
  - With one long slim lens, brake an inner part only (`brake: [w, h]`, as the Sportscar).
- **Indicators with no lens** (most models: only 32 of 128 have any amber):
  - Do NOT add geometry for it (the owner's rule is to say so, not invent it). Flash over another lamp and write `shared`.
  - Front: the headlamp's outer end or its swept-back tip.
  - Rear: the foot or outer end of the tail lamp, amber for European and Japanese cars. US-style cars (Lowrider,
    Pick-Up) flash the outer or upper tail lamp RED (`red: true`).
- **Headlamps:** the main beams only, not fog lamps or roof bars. Quad lamps are all listed (Lowrider).
- **Reversing lamps:** list them only if the model has a white lens at the back.

## 5. Moving bodies: the `frame` hook
Some models move their body or lamps in `userData.animate`: hydraulics, bounce, tilt or rock. The effects live on the
car mesh and would stay behind. The Lowrider showed it: in the stills its nose rose and the glows hung under the lamps.

The fix:
1. Expose the node the lamps are in, at a rest pose equal to the car frame, as a userData hook. The Lowrider's
   `shell` is the inverse-offset child of its pivoting `chassis`, so `group.userData.lampFrame = shell`.
2. Set `frame: 'lampFrame'` in the entry.

syncLamps then re-parents the car's lamp group into that node, and the debug markers ride along.

To find such cars: call `animate(0)` and `animate(1.37)`, and compare the lamp pieces' centres. If any moved by more
than 1 cm, the car needs a frame. Adding a userData key changes only the model editor's role name for that node.
Check `src/delivery/modelpatches/` for a patch on that car and run `node scripts/model-patch.mjs --all --check`.

## 6. Seeing it: `?lamps=` and the before/after stills
`?lamps=` takes a comma list (also in URL-PARAMS.md, on claude/car-lights until merged):
- `show`: labelled markers (H yellow head, T red tail, B red brake, I amber indicator or red, R white reverse) plus the car's axes.
- `old`: the hitbox placement for every car (the BEFORE).
- `brake`: the player's brake lamps held on.
- `hazard`, `left`, `right`: the indicators held lit, steady.
- `night`: the listed cars' headlamp glow on, and the `cine=car` studio dark.

The four views per car (`turn=180` is the rear; add `,old` for the before):
```
node scripts/shots.mjs <dir> --browser=/opt/pw-browsers/chromium --size=900x600 \
  "pickup-new-front=?tiers=0&car=pickup&cine=car&ghost&lamps=night,hazard" \
  "pickup-new-rear=?tiers=0&car=pickup&cine=car&ghost&turn=180&lamps=night,brake,hazard" \
  "pickup-new-marks=?tiers=0&car=pickup&cine=car&ghost&lamps=show,night" \
  "pickup-old-front=?tiers=0&car=pickup&cine=car&ghost&lamps=night,hazard,old"
```
Contact sheet: `convert <png> -crop 760x560+90+20 +repage -resize 640x` on each still, then
`montage ... -tile 2x4 -geometry +4+4` (columns before | after). Do not centre-crop: the studio camera puts the car
right of centre. READ every sheet: are the halo, glow and indicator ON the lens, at the right size, and on both sides?
In-game stills with `&ghost` draw the player see-through and too small to judge, so use the studio.

## 6b. Preview in the model editor
`delivery/modeleditor.html` has lamp toggles in its view row: Lights (night glow, view darkens), Brake, Hazards (1.2 Hz
flash), Left / Right, Steady, Lamp markers; Blackout hides the effects. Use it to check a new entry on the model itself,
turning it with the Front / Rear / 3/4 buttons, with no game run. The effects are the game's: the meshes live in
`render/lampfx.js` (`addLamps`, `placeLamps`, `setLampLights`, shared with `render/cars.js syncLamps`) and the layout is
`lampsFor(lampKey(car), hitbox)`; they ride in the model's `frame` node. The stats strip names the entry:
`lamps: table entry (hand-written|generated|guess)` or `generic hitbox placement`. Addresses: `?car=<id>&lights&brake&hazards&lampmarks`
(also `left right steady`), `lampt=0` / `lampt=0.5` freezes the flash lit / dark for stills. After editing a lamp in the
model editor's patch, re-measure: the table does not follow the patch. The editor does not run `animate`, so a moving body
(Lowrider hop) is not shown moving.

## 7. Checks
- `npx eslint` on changed files and `node --check`.
- `node scripts/delivery-tests.mjs --group render,words --no-lock`. This takes about 5 min (the phone-menu check alone
  is 147 s), so run it in the background. Never run the full smoke test.
- `node node_modules/vite/bin/vite.js build`.
- The replay fingerprint must not change. carlights.js is under render/, which no rules file imports. Compare the
  `logicFiles()` hash (vite.config.js) with main's: it was 7264a4368b on both. Never import carlights.js from a
  top-level src/delivery file, and never move lamp numbers into config.js (both are in the fingerprint).
- A CHECKLIST item saying what was and was not seen.

## 8. Do and don't
- DO key by model name, so traffic wearing that model is fixed too. DO keep `mirror` pairs as one line.
- DO measure the lens face; DON'T copy the code's numbers blind.
- DO say `shared` when there is no lens; DON'T model new lamps for this job.
- DON'T add lights (three.js rebuilds every lit material, and the Mi Pad is weak), and DON'T allocate per frame. Layouts
  are cached per key and the meshes are moved only when a car's layout changes.
- DON'T list a Super version under the base key: `superlowrider` is its own model and is not listed yet.
- A model patch that moves a lamp leaves the table behind (there are no patches today). Re-measure after any model change.

## 9. Pitfalls hit in the pilot (and fixes)
1. guessRole labelled cream headlamps "indicator", and merged meshes spanned both sides. Fixed by the connected-piece splitter.
2. The Lowrider's hydraulics carried its lamps away from the effects, seen only in the stills. Fixed by the `frame` hook.
3. Marker labels for brake and indicator overlapped. Fixed by putting indicator labels below their lamp.
4. Box halos were too big on the Sportscar's slim tail lamp. Fixed: listed cars' halos are round, 1.35x size + 8 cm.
5. A centre crop cut the cars off the contact sheet. Fixed with an offset crop.
6. HSL thresholds on linear colours gave nonsense counts in the census. Fixed by classifying from the hex.

## 10. Roll-out: the rest of the roster, and the effort
Census of all 128 garage, filler, Bespoke, event, earned and idea cars (connected pieces, hex colours, `animate`
compared at two times):
- 121 have a cream front lamp piece and 121 a red rear piece. 32 have any amber.
- 27 have lamp meshes holding several pieces (merged).
- 14 have lamps that move with `animate` (need a `frame`).

| class | count | what it takes | effort each |
|---|---|---|---|
| easy | 102 | lamps found front and back, static: measure, pick brake/indicator places, 4 stills | 5 to 10 min |
| medium | 1 | many pieces to sort (cityev) | 15 min |
| hard | 25 | lamps that MOVE (junker, lowrider, suv, fullsize, superlowrider, tuktuk, monster, earned-jetboat, threewheeler, tinsnail, schoolbus, hovercraft, wrecker, gyrocar), or NO head or tail lamp found (toybota, nissank, fieldscout, dragster, solarracer, moonrover, earned-f1, earned-apc, steamwagon, cigar, mower) | 20 to 40 min: a frame hook in the model, or a decision with the owner (leave it on the hitbox, or skip effects) |

Generator idea (`scripts/lamps.mjs`, not written): for each unlisted model, split, sort by colour and side, fold mirror
pairs, and print a draft `CAR_LAMPS` entry: head from cream pieces in the front 15%; tail from red in the rear 15%,
the darker red as brake, else all; blink from amber, else a `shared` guess (the headlamp's outer end, the tail lamp's
foot); and a `frame: ???` warning when pieces move. A person reviews the stills, sets US-style red indicators, and
fixes the hard cases. At about 10 easy cars an hour with stills, the roster is about 2 days. Move the table to its own
file (`carlights-table.js`) once it passes about 20 cars.
