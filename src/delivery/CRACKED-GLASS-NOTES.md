# Cracked glass on damage: exploration notes (16-Oct)

The owner: "Lets explore adding a cracked glass texture to the front and back windows on damage model." Then, on the first stills: "The cracks
contrast too well." Branch `claude/cracked-glass` (from main v1.1.146), CHECKLIST 396. A PROTOTYPE, **off for every player**: nothing changes
unless the address has `?crack`. The audit it stands on: `WINDSCREEN-AUDIT.md`.

## Try it

- `/delivery/?autostart&car=commuter&crack=100&at=300&ff=2`: the run with the car shown as at 100 % damage (dents and scorch too; a look only,
  health untouched). Any 0 to 100.
- `/delivery/?autostart&car=commuter&crack=on`: cracks from the REAL damage (as the dents: 20 / 40 / 60 / 80 %).
- `/delivery/modeleditor.html?car=commuter&damage=5&crack=on`: the model editor's Damage buttons (and the inspector's) with the cracks.

## The approach chosen: (a) an overlay cut from the pane, one code-drawn texture

`src/delivery/render/cracks.js`:

1. **Which windows**: `screensOf(model)` runs the model editor's own part list (`render/modelpatch.js extractParts`: cabinGlass's named panes,
   else the hand-built panes now named by which way they face, `render/screens.js`) and picks the biggest **front-facing** pane (and the other
   half of a split screen) and the biggest **rear-facing** one, skipping a pane HIDDEN behind the body (a van's cab window behind its box: rays
   cast back to it from 6 m out). Never a side window. A model's tag `userData.window = 'windscreen' | 'rear'` wins.
2. **The overlay**: the pane's own OUTER triangles (a glass slab's outer face by its winding; a one-sided panel's one face), so the outline is
   the pane's exactly (crisp edges, no overhang), lifted **4 mm** along the pane's normal, `polygonOffset` -2, `depthWrite` off, drawn after the
   glass (`renderOrder` 2): no z-fighting in any still. Both windows in **ONE mesh, a child of the windscreen's glass mesh** (it rides the
   body), appended last and skipped by `extractParts` / `modelSignature` (the editor's part ids and a patch's base are unchanged) and by
   `render/dents.js` (never crumpled: the glass is left alone as before).
3. **The texture**: ONE 256 x 256 RGBA `DataTexture` drawn once in code on a canvas (no image file): R = the line's brightness (a light core
   0.8 px over a 1.7 px fine dark edge), G / B / A = the coverage at stage 1 / 2 / 3, so a stage is a channel and the later cracks grow out of
   the earlier ones. The pattern (`crackPattern`, seeded): 8 to 10 wandering rays from the impact, branches, broken rings (few: real glass is
   more rays than rings), a crushed dot at the impact; stage 3 adds a crazed mosaic near the impact (scattered points joined to their two
   nearest), a few faint frosted cells and a small chunk knocked out beside the impact.
4. **The look per stage** (on the dents' stages, CONFIG.dents.steps): 20 % a hairline star, 40 % and 60 % a spreading web, 80 % and 100 % the
   shattered mosaic. One shared material per stage (`MeshBasicMaterial`, a 3-line `onBeforeCompile` picks the channel); after the owner's
   "contrast too well": soft grey-white lines (0.76 to 0.82) at **42 % / 52 % / 62 %** opacity (`CRACK.alpha`), the glass's own tint showing
   through, no boost at a distance (subtle far off, clear up close).
5. **Per car and window**: the texture is mapped on the pane in metres from a seeded impact point (25 to 75 % across, 30 to 75 % up), turned
   and mirrored by the seed of the car's id and the window, and sized to reach the pane's far corners (0.55 to 1.6 m half-width), so no two
   windows crack alike and a bus screen gets the same crack size per metre as a hatch's.
6. **The hooks** (render only, the replay fingerprint unchanged: `vite.config.js logicFiles` holds no render file; the hash 019645c1af before
   and after): `render/items.js` after the player's custom model's `dentModel` (the box car has no glass to crack; traffic never cracks: player
   only, as the dents), `render/inspectmodel.js damageModel` (the editor and the inspector). Hidden while the Ghost power shows. Blackout:
   the material has `userData.blackout = 'hide'` (render/silhouette.js), as the Legendary wreath. A new car / a repair / a respawn: the share
   is 0, the overlay hidden. The replay ghost is the plain box car (render/ghostcar.js): no cracks. Good / Evil: the glass is not repainted,
   nothing to do.

## The numbers

- **Coverage** (`scripts/.windscreen-audit-check.mjs`, all 276 vehicles the game builds, 184 models): cracks on BOTH windows **155**, on ONE
  **79** (a windscreen and no visible rear glass: vans, roadsters, lorries, mostly right), on NONE **42** (no glass, open cars, tanks, bubble
  canopies with no pane of their own).
- **Cost**: +1 draw call per car while cracked (one mesh, both windows), 0 when clean; 4 triangles a car on average (most panes are 2
  triangles; at most 28; 876 in all over the 234 cars it covers); the texture 256 x 256 x 4 = **256 KB** (about 341 KB with its mipmaps) once for the whole game; 3 shader
  programs (one per stage) compiled on first use; build once per car on its first damage, about 2.6 to 3.6 ms headless (the part list, the facing,
  the hidden-glass rays), then a material swap per stage.
- **Overlay triangles' facing**: none faces sideways on any vehicle (the check).

## Alternatives, measured or reasoned, and why not

- **(b) vertex-colour cracks baked into the glass**: the glass panes are 2 to 30 triangles (most are a quad); a crack line needs vertices
  along it: hundreds per window, a new geometry per stage, and it would change the glass the editor and the patches address. No.
- **(c) a crack map on the glass material per stage**: the cabinGlass glass is ONE mesh for every window of the car (side windows too) and its
  uvs are all zero (`plain()` fills them with 0): a map would need per-pane uv work in cabinGlass and every hand-built model, and it would crack
  the side windows unless masked. The overlay gets the same look with no change to the glass. No.
- **(d) a shader patch on the glass** (crack pattern computed in the glass's fragment shader from model position): no uvs needed, but the
  glass material is shared by many cars (and traffic), so it needs a per-car material clone and a pane mask anyway; and it is the glass
  everyone else edits. The overlay keeps it apart. Kept as the option if the draw call ever matters.
- **Three textures (one per stage) instead of channels**: 768 KB for nothing: rejected.

## Risks and open points

- **Contrast**: the glass is dark and opaque-looking; light lines on it read strongly (the owner's "contrast too well"); now 42 to 62 %
  opacity. On a pale or see-through glass (a few cars' glass is light blue or transparent) the cracks will show less: not checked car by car.
- **The game camera**: from the chase camera only the REAR window is seen, and small (25 x 8 px on a phone): at the toned-down opacity the
  cracks there are subtle (seen as faint lines on a crop of a 390 x 844 @3x still; barely at full phone size). The windscreen cracks show in the
  replay's orbit camera, the menus' car views and the editor.
- **Lighting**: unlit (`MeshBasicMaterial`): the cracks do not darken at night or in a tunnel; a lit or a view-dependent glint was not built.
- **Which windows**: the measured rule picks right on every still taken (6 cars + 3 looked-at hidden cases), but 21 cars have a canopy with no
  pane of its own and get no windscreen crack; a few "hidden" verdicts are listed to LOOK (WINDSCREEN-AUDIT.md).
- **Dents into the glass**: at 100 % some cars' bonnets crumple up over the screen's foot (seen on the Commuter): the crack is under the
  panel there, which reads fine.

## Seen and not seen

- SEEN (stills via scripts/shots.mjs and a temporary untracked `delivery/zcrack.html`, every one READ): six cars (Boxy Supermini: cabinGlass
  hatch; Post Van; Pick-Up; City Bus; Sportscompact: steep screen; Commuter: hand-built) windscreen from the front 3/4 and rear window from the
  rear 3/4 at 0 / 40 / 80 / 100 %, BEFORE the tone-down; after it: the Commuter close-ups at 20 / 40 / 100 % front and rear, the Post Van 3/4 at
  20 / 40 / 80 / 100 %, and the game's chase camera on a phone (390 x 844 @3x, Commuter at `crack=100`). The Post Van's cab rear window (behind
  its box body) correctly gets no crack after the hidden-glass test.
  After the tone-down all six cars' sheets were taken again and read (contact sheet in the scratchpad).
- NOT SEEN / NOT DONE: nobody played it; the damage PROGRESSION only in stills (never watched crack in a run with `crack=on`); a real phone
  or the Mi Pad; night / tunnel lighting; the editor's Damage buttons with `crack` (the same `damageModel` path the stills use, not opened by
  hand); a blacked-out car and the Ghost power with cracks (by code, not by still).

## Verdict: GO-IF

**GO-IF** the owner likes the toned-down close-ups and accepts that in the chase camera it is a subtle detail on the rear window only. To
ship: flip `CRACK.on` to follow the real damage by default (one line), decide the opacity (`CRACK.alpha`), then hand-tag or accept the 21
canopy cars and the Glass-Hatch Brake's hatch (WINDSCREEN-AUDIT.md). Effort: about half a day (the default, a pass of stills on more cars at
night and in a tunnel, a look on the Mi Pad), plus a day if the canopy cars must crack too (their glass split into panes).

Open questions for the owner:
1. Strength: is 42 / 52 / 62 % right, or should the hairline be fainter still?
2. Should the chase camera see more (e.g. stronger on the rear window only), or is subtle at a distance what he wants?
3. Cracks on traffic too (cheap: the same overlay), or the player only?
4. The bubble-canopy cars (Rotary, EV Saloon, Bubble, Jet Car, UFO...): crack the canopy as a whole, or leave them clean?
