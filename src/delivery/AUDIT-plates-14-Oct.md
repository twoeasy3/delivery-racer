# Delivery Racer: number plate audit, 14-Oct (2026-10-14)

Read-only audit for the owner (14-Oct: "audit the number plate situation"), as the groundwork for an equippable plate cosmetic.
Nothing is decided or built. Taken at `origin/main` v1.1.129. Nothing here was seen in a browser: every number comes from
the geometry of the models as the game builds them (headless Vite, `render/showcar.js` `makeShowCar`, and `MODELS[...]` for
the traffic kinds), from the source, and from reading `render/dents.js`, `render/items.js` and `render/silhouette.js`.
The list of every existing plate, per model, is machine-readable in `src/delivery/plates-audit.json` (also every car's
rear/front anchor). Scratch scripts were kept outside the repo.

## How it was measured

- **Built:** 271 vehicles = 221 roster cars (41 garage incl. the 4 amphibious and the Tank, 40 Supers, 24 filler, 14 Bespoke,
  1 event, 9 earned, 14 Legendary, 1 secret = the City Bus, 7 level vehicles = UFO, F1, GT, LMP, Jetboat, 8x8, Amphibious Tank,
  and all 70 idea cars) + 50 traffic kinds (`CONFIG.vehicles`, built with `MODELS[type.model]`; the tractor is built by
  `carExtras.js`, the boats and the pursuit cars come from `boatModels.js` / `pursuitModels.js`). 179 distinct model builders
  (158 behind the 221 roster cars; a Super, a Legendary, an earned reskin and a traffic kind reuse the base car's builder).
- **A plate** was found by taking each model's triangles in car space, splitting them into connected pieces (so a plate merged
  into a shared mesh is still found), and keeping pieces that are: thin (at most 5 cm deep), 0.2 to 0.8 m wide, 0.06 to 0.3 m
  high, at least 1.8 times wider than high, centred on the car (|x| under 0.12 m), within 0.9 m of the front or rear end, and
  a lit (not glowing) pale or plate-yellow material or vertex colour (chrome 0xd8d8d8 grilles and badges excluded). Checked
  against the source (`grep plate`, every hit read): all 25 builders that say "plate" were found, nothing was found that the
  source does not call a plate, except the learner's L boards (found by size). Misses are possible for a plate built in an
  unusual way (a rotated or curved one); none was seen when the 271 candidate lists were read by hand.
- **Anchors** were estimated with an orthographic z-map: a 2 cm grid over the car's back (and front) as seen along z, keeping
  the nearest surface per cell with its normal; glass, glowing lamps and see-through parts do not count as mountable. With
  the existing plates removed from the map, the widest flat strip centred on x = 0 at each height (0.12 m high) was found, then
  the tallest flat run at the width a plate needs. Classes: **A** flat 0.52 x 0.12 m (depth within 3 cm, tilt under 8 degrees);
  **B** flat 0.30 x 0.12 m; **C** only 0.30 x 0.10 under looser tolerances (8 cm, 25 degrees), i.e. a curved or stepped tail;
  **D** nothing. Category: **reliable** = A or B, **hand** = C or D, **cannot** = a manual list (craft, open-wheelers, bikes,
  saucers). The measure is geometry only: it says a flat place exists, not that it looks right.

## 1. Existing plates

### Headline

| | Roster (221) | Traffic kinds (50) | All (271) |
|---|---|---|---|
| no plate at all | 186 | 44 | 230 |
| rear plate only | 25 | 3 | 28 |
| front plate only | 0 | 0 | 0 |
| front and rear | 10 | 3 | 13 |
| **with a plate** | **35** | **6** | **41** |

So 84 percent of the roster has no plate. Plates exist on **25 distinct models** (32 plates: 30 are one flat box each, 2 are
the learner's L boards). There is no front-only car, no texture, no decal, no text and no pattern anywhere: every plate is a
plain `BoxGeometry` (12 triangles, 0.02 m deep, 0.03 to 0.05 m for the learner's board) in a `MeshLambertMaterial`, a child of
the model's root group (not of the body mesh, not parented to a hinged part). Colour: cream 0xece6cc (12 models), white
0xf4f2ec (11), yellow 0xf2d21f (6: hotrod, hotdog, threewheeler, bathtub, gyrocar, snailcamper), 0xe8e4d0 (moorrover). Sizes
0.24 to 0.46 m wide by 0.08 to 0.2 m high (a coach's 0.40 x 0.20 is the tallest, the gyrocar's 0.24 x 0.08 the smallest).
Nothing is a real format: they are blank slabs.

### The plated models

Cars list: every roster car or traffic kind that wears the model (Super / Legendary / earned reskins included).

| model | file:line of the plate | faces | size w x h (m) | colour | worn by |
|---|---|---|---|---|---|
| junker | modelsOrig3.js:697 | rear | 0.34 x 0.13 | cream | garage junker, super-junker, l-junker (cream), traffic junker |
| hearse | modelsOrig3.js:414 | rear | 0.46 x 0.13 | cream | garage hearse, super-hearse, l-hearse (turned GOLD by the Legendary trim), traffic hearse |
| hotrod | modelsOrig3.js:487 | rear | 0.30 x 0.12 | yellow | hotrod, super-hotrod, hellrod (earned), l-hotrod (GOLD), traffic hotrod |
| minivan | modelsOrig3.js:547 / 549 | front + rear | 0.44 x 0.12 / 0.13 | cream | minivan, super-minivan, l-minivan (GOLD), traffic minivan |
| pickup | modelsOrig3.js:622 / 624 | front + rear | 0.40 x 0.12 / 0.14 | cream | pickup, super-pickup, l-pickup (cream), traffic pickup |
| goddess | ideaModels5.js:190 | rear | 0.32 x 0.09 | white | filler goddess |
| hardtop | ideaModels5.js:258 | rear | 0.32 x 0.16 | white | filler hardtop |
| blower | ideaModels6.js:271 | rear | 0.34 x 0.12 | white | filler blower |
| coach | ideaModels6.js:330 | rear | 0.40 x 0.20 | white | filler coach |
| cityev | ideaModels6.js:466 / 474 | front + rear | 0.42 x 0.10 / 0.11 | white | filler cityev |
| coupecross | ideaModels6.js:534 / 546 | front + rear | 0.40 x 0.09 / 0.10 | white | filler coupecross |
| hotdog | ideaModels3.js:795 | rear | 0.36 x 0.12 | yellow | Bespoke hotdog |
| fishbowl | ideaModels10.js:180 / 186 | front + rear | 0.36 x 0.09 / 0.10 | white | Bespoke fishbowl |
| midsummer | ideaModels9.js:231 | rear | 0.36 x 0.11 | white | Bespoke midsummer |
| sixteen | ideaModels7.js:347 | rear | 0.42 x 0.10 | white | Bespoke sixteen |
| knifeedge | ideaModels7.js:244 | rear | 0.40 x 0.10 | white | Bespoke knifeedge |
| threewheeler | ideaModels.js:273 | rear | 0.43 x 0.09 | yellow | idea |
| bathtub | ideaModels3.js:341 | rear | 0.30 x 0.10 | yellow | idea |
| gyrocar | ideaModels3.js:585 | rear | 0.24 x 0.08 | yellow | idea |
| snailcamper | ideaModels3.js:725 | rear | 0.26 x 0.08 | yellow | idea |
| slantback | ideaModelsTopupA.js:284 | rear | 0.36 x 0.12 | cream | idea |
| autobahnestate | ideaModelsBatchD4.js:220 | rear | 0.46 x 0.10 | cream | idea |
| finlandyacht | ideaModelsBatchD4.js:286 | rear | 0.46 x 0.10 | cream | idea |
| moorrover | ideaModelsBatchE3.js:154 | front + rear | 0.46 x 0.12 | 0xe8e4d0 | idea |
| learner | trafficModels.js:85-95 | front + rear | 0.50 x 0.50 (L board) | white + red L | traffic kind only (the L plates; owner's 67) |

### By group (cars with a plate / cars in the group)

| group | none | rear only | both | with a plate |
|---|---|---|---|---|
| garage (41) | 36 | 3 (junker, hearse, hotrod) | 2 (minivan, pickup) | 5 |
| Super versions (40) | 35 | 3 | 2 | 5 (the same five: the kit does not touch plates) |
| filler (24) | 18 | 4 (goddess, hardtop, blower, coach) | 2 (cityev, coupecross) | 6 |
| Bespoke (14) | 9 | 4 (hotdog, midsummer, sixteen, knifeedge) | 1 (fishbowl) | 5 |
| event (1) | 1 | 0 | 0 | 0 |
| earned (9) | 8 | 1 (hellrod) | 0 | 1 (the other 8 are the UFO, three racers, jetboat, courier, showdown, 8x8) |
| Legendary (14) | 9 | 3 (l-hearse, l-hotrod, l-junker) | 2 (l-minivan, l-pickup) | 5 |
| secret (1) | 1 | 0 | 0 | 0 |
| level vehicles (7) | 7 | 0 | 0 | 0 |
| idea cars (70) | 62 | 7 | 1 (moorrover) | 8 |
| traffic kinds (50) | 44 | 3 (junker, hotrod, hearse) | 3 (minivan, pickup, learner) | 6 |

Of today's 19 new idea cars (batches D2 to D4, E1 to E5, top-ups A to C): plates on slantback (Topup A), autobahnestate and
finlandyacht (D4) and moorrover (E3); none on the rest. The Commuter, Taxi, SUV, Sportscar, Lowrider, Family Wagon and every
other original garage car except the five above have no plate. **The Wind-Song Racer's note (cars.js:534) says "a Le Mans racer
with a number plate"; its model has none** (the note's plate is not in `ideaModels7.js`' `windsong`); the Sixteen and
Knife-Edge, built just before it, do have one.

The Legendary dressing (`render/legenddecal.js` `LEGEND_TRIM`) lists cream 0xece6cc (hearse) and yellow 0xf2d21f (hotrod) as
gold trim, so on those two the plate is turned gold; the Legendary Minivan's plates are gold too (by the colour match of its
trim); the Legendary Pick-Up and Junker keep cream plates. This is intended or not, the owner has not said.

### Which are separate meshes (matters for hiding / tagging)

Every plate is its own 12-triangle mesh, except three models where both plates share one 24-triangle mesh because the builder
merges parts by material: **minivan and pickup** (`mergeByMaterial` in `modelsOrig3.js`) and **moorrover** (the `parts` helper in
`ideaModelsBatchE3.js`). Everywhere else a plate can be hidden on its own with one flag; those three need the two plates split
into two meshes (a change in the mesh list, so part ids that follow shift unless the split ones are put in the same order).

## 2. Duplicates and conflicts

| check | result |
|---|---|
| the same plate drawn twice | **none**: no car has two plates on one end (the check looked within 0.3 m on the same end). The minivan's front plate is on its bumper, the rear one above it; fine. |
| plate floating off the body | **hotdog**: the rear plate stands 5.8 cm out of the tail's face, 3.8 cm clear of it (the body face under it is at z = -2.55, the plate at -2.59): floats. **threewheeler** 1.3 cm gap, **fishbowl rear** 0.6 cm gap, **learner boards** 1.0 cm gap: visible as a sliver from the side. All the others touch (0.2 to 1.7 cm of the plate sunk into the face; 2 mm is typical). |
| plate buried | none at rest (the least proud: snailcamper 3 mm, coupecross front 5 mm, gyrocar 8 mm; all others 1.2 to 2.6 cm). |
| coplanar with a body face (z-fight risk) | `render/zfight.js` finds, near a plate, only **knifeedge** (a 2 mm gap to another face, area 4 cm2) and **snailcamper** (3 mm, 0.8 cm2), both "weak" (not under the 0.5 mm line), different colours; and the **learner**'s L boards (exact coplanar, but red against red: invisible). So no certain, visible z-fight on a plate. Plates sit 5 to 20 mm out, which is inside "ok at the game's depth buffer" but thin for the 5 mm models. |
| uneven faces under a plate | hardtop (12 cm of depth spread under the plate: the tail's lip and the plate's footprint), hotdog, the hotrod and the coupecross front (bumper curves) are the models where a plate is not on one flat face; the others sit on a flat. |
| plates moving with dents | Only the player's car dents (`render/items.js:526`; traffic gets scorch only). A plate is a part in a paint of its own: at most 0.35 m on its longest side it is "SMALL" and moved whole by the dent at its centre (the hotrod's, junker's, hotdog's, gyrocar's, snailcamper's and the 0.3 to 0.34 m ones), larger (0.36 to 0.5 m) it is a "panel" whose every vertex is shoved and which is cut finer and lifted 8 mm off a bent paint panel next to it. Measured per model at the four stages: through stages 1 to 3 the plate keeps its clean offset (it follows the panel or is not near a dent); at **stage 4 (80 percent damage and over, the wreck)** the tail dent (`[0.2, 0.4, -1]`, up to 0.48 m forward) moves the body and a whole-moved small plate by different amounts: **hotrod, blower: buried 3 cm, goddess and coupecross (rear): buried or lost in the measure**, junker, hardtop, gyrocar, snailcamper end within 2 to 5 mm of coplanar. The panel-type plates (0.4 m and up) follow, since they are bent with the paint. The measure on the merged models (minivan, pickup, moorrover) is unreliable at stage 4 (the plate pieces are in the same mesh as other parts). It is a measurement of geometry, not a picture. |
| Ghost power-up | `render/items.js ghostify` puts the one pale glowing see-through material on EVERY mesh, plates included: a plate becomes a pale 45 percent opaque slab like the rest of the car, no special treatment, and nothing would show text. (Audit 259 already flagged ghostify for the underglow and the wreath.) |
| blackout silhouette | `render/silhouette.js`: every material becomes the flat black `SILHOUETTE` unless it is a transparent unlit decal with a map (then a black copy with the picture) or flagged `userData.blackout: 'hide'`. An existing plate is black on black: invisible but for its relief. A text plate with an opaque map becomes plain black; a transparent one becomes a black stamp; the Legendary wreath hides itself with `blackout: 'hide'`, which a plate could use. |
| what `dents.js` does to a plate | see above: it treats it as a part (small: shoved whole; larger: a bent panel), it never recognises one as a plate; a tagged hidden plate (`visible = false`) is skipped by `traverseVisible` consumers, but `meshesOf` in dents.js walks all meshes, so a hidden plate is still measured and shoved (harmless). |

## 3. Anchors for an equippable plate

### Counts

| group | rear: reliable | rear: hand | rear: cannot | front: reliable | front: hand | front: cannot |
|---|---|---|---|---|---|---|
| garage (41) | 35 | 6 | 0 | 35 | 6 | 0 |
| Super (40) | 35 | 5 | 0 | 34 | 6 | 0 |
| filler (24) | 17 | 4 | 3 | 14 | 7 | 3 |
| Bespoke (14) | 8 | 2 | 4 | 8 | 2 | 4 |
| event (1) | 1 | 0 | 0 | 0 | 1 | 0 |
| earned (9) | 6 | 0 | 3 | 4 | 2 | 3 |
| Legendary (14) | 13 | 1 | 0 | 5 | 9 | 0 |
| secret (1) | 1 | 0 | 0 | 1 | 0 | 0 |
| level vehicles (7) | 4 | 0 | 3 | 3 | 1 | 3 |
| idea cars (70) | 60 | 7 | 3 | 55 | 12 | 3 |
| **roster (221)** | **180** | **25** | **16** | **159** | **46** | **16** |
| traffic kinds (50) | 42 | 1 | 7 | 39 | 4 | 7 |
| per distinct builder (179) | 140 | 20 | 19 | 129 | 31 | 19 |

Both ends reliable on 148 roster cars; rear only 32; front only 11; neither on 30 (16 of them "cannot").
The Legendary front is "hand" on 9 because the black bull bars / gold trim broke the flat (only 5 stay flat).
(Audit 259 counted rear 121 / front 111 of 144 models; this audit counts 140 / 129 of 179 builders: the definitions differ, mine
counts any flat 0.52 x 0.12 m strip centred on the car, 259 chose per model by eye-level rules.)

### The cars that need hand placement (rear), roster

garage: wagon, lowrider, hotrod, snake, classicgt, nissank (+ their Supers); filler: bubble, pony, goddess, splitwindow; Bespoke:
swancar, windsong; Legendary: l-hotrod; ideas: tinsnail, twostroke, bathtub, gyrocar, sevenroadster, dodgem, sporttruck. Traffic:
interceptor. Reasons seen in the data: a rear that is all curve or lip (Beetle-like bubble, pony, splitwindow, snake, wagon with its
spare/tailgate step), an open or stepped tail (hotrod, lowrider's hydraulics, nissank's boat stern), or too narrow a flat (dodgem,
gyrocar: 0.2 m, which is the existing plate's size). Four of these (hotrod, goddess, bathtub, gyrocar) already have a plate, whose
exact place is the hand anchor for free. Hand placement is a table entry of `at` and `size`, found by looking.

### Cars with a flat but small place (class B: 0.30 to 0.5 m)

floatvan, toybota (and super), hellrod, l-suv, dunebuggy, mower, snailcamper, moke, traffic hotrod and toybota: a US-size plate
(0.30 x 0.15) fits, a 0.52 m one does not (it would hang over a lamp or a step).

### Cars that can have no plate (roster 16, traffic 7)

UFO (level and earned Saucer), F1 (level and earned), Jetboat (level and earned), the idea hovercraft, cigar, sidecar (a bike),
Monowheel, Moon Rover, Solar Racer, Rocket Fin, Jet Car, Dragster, Flying Car (the last five have no usable rear, the rest
are craft or open-wheelers); traffic: F1, boat, trawler, dinghy, barge, ferry, pedalo. Ring-fenced as an owner call: nine
military vehicles that geometry says have a flat rear (Tank, Amphibious Tank, 8x8, earned 8x8, armoured, Half-Track, traffic
jeep / APC / tank) are counted "reliable" above; a plate on a tank is a taste question.

### Same pattern as the lamp table?

Yes, with less to carry. `CAR_LAMPS` (render/carlights.js plus 18 batch files, 489 lines) is keyed by MODEL name, car-local
metres, `mirror`, with a generic fallback from the hitbox (`genericLayout`) for unlisted cars. A plate table would be the same
shape: `CAR_PLATES[model] = { rear: { at: [0, y, z], size: [w, h], tilt? }, front: {...} }`, keyed by model (so Supers,
Legendaries, earned reskins and traffic share their base's entry; 179 builders cover 271 vehicles), with a **fallback of
"reliable"** from the data in this audit (generated, 140 builders) and hand entries for the 20 that need them, the existing
plates' exact places for the 25 that have one, and an explicit `none` for the 19 that cannot. A plate has no per-lamp state, no
Good/Evil or animation, so there is far less per entry than a lamp (one pair of numbers a face).

## 4. Text

Everything below is an option, not a decision.

- **No image files** (the owner's rule, 14-Oct): a plate would be a small `CanvasTexture` drawn in code, as `ideaModelsBatchE5.js`
  `texture(key, w, h, draw)` and `legenddecal.js` already do. A plate is 0.52 x 0.11 m: a **256 x 64** canvas (inside the 256 x 256
  maximum) gives about 490 px per metre, enough to read a 7-character plate close up. Memory about 4 bytes a pixel: **64 KB**
  (85 KB with mipmaps). A **128 x 32** canvas is 16 KB; the in-play chase camera sees a rear plate about 100 px wide at 1080p
  (an estimate, not measured), so 128 x 32 may suffice in play and 256 x 64 is the showroom's.
- **One texture, shared:** the plate cosmetic is a global choice (like the wheels: 268 / 269), so ONE canvas texture is drawn once
  for the chosen text and every car's plate mesh shares it, the material flagged `userData.shared` so `clearGroup` keeps it. The
  cost for 213 cars is the same 64 to 85 KB, plus a 2-triangle quad (or two) per car. A text per car (a plate per car in a
  loadout) would be 213 x 64 KB = 13.6 MB (18 MB with mips): do not do that; draw on demand for the car on show.
- **Atlas or one texture per text:** a glyph atlas (36 glyphs, 16 x 24 px in a 256 x 64 sheet = 64 KB, once) with each plate a
  row of quads (8 quads = 16 triangles) would allow any text with no canvas redraw; but one canvas per text (re-drawn into the
  same canvas, `needsUpdate`) is 2 triangles a plate, simpler, and the redraw is a fraction of a millisecond. Prefer one shared
  canvas, redrawn on change.
- **No texture at all** is possible but poor: block letters from boxes cost about 20 to 40 boxes (240 to 480 triangles) a plate and
  look crude at this size. The owner's standing rule is "not everything needs a texture"; a plate is the case where a small
  canvas is the sensible way, because the text is the point.
- **Region / format:** an invented generic format only (for example `AB 12 CDE` is the UK's; avoid it; pick something that is
  nobody's: three letters, a dash, three digits in a made-up band colour, or a word plate such as `DELIVERY`). No real
  registration, no names of real people, no real country's colour scheme implied.
- **Free text vs presets:** free text means a **profanity and abuse filter** (including digit substitutions such as `5H1T` and
  spaced forms), a length cap (7 or 8), an allowed character set, and a moderation answer if a plate is ever shown to others.
  It is render-only and local, so nobody else sees it unless the owner adds sharing or screenshots. **Presets are the wise first
  version**: a list of 12 to 20 invented plates the owner writes, plus perhaps a "build your own" from pools (a letter group,
  a number group) that cannot spell anything bad. Free text can come later, behind the filter, if wanted at all.
- **Replay and save:** local only, render-only. The key would sit beside `delivery.wheelcolour` / `delivery.wheeldesign` in
  `localStorage` (try/catch, ignored and unsaved under `Progress.noSave`), never the cookie (1.4 to 1.7 KB spare after "Unlock
  everything"), nothing written onto a car entry, and **no logic module imports the new file**, so it stays out of
  `vite.config.js logicFiles` (the replay fingerprint walks the imports of `src/delivery/*.js`). Check by `.wheelcosmetic-check`'s
  pattern.

## 5. Where it fits

- **`render/wheelcosmetic.js` is the model:** a new `render/platecosmetic.js` with `dressPlate(model, car)` called next to
  `dressWheels` in `render/showcar.js makeShowCar` (garage, showroom, menu card, inspector, stills, banners, cinematic) and in
  `render/items.js playerModel` (the car driven); a `PLATE_STYLES` list, `plateStyle()` / `setPlateStyle(id)` / `onPlate(fn)`,
  a `delivery.plate` key, and `?plate=<id>` for stills. It hides the model's existing plate (the follow-up in progress adds
  the tag and the toggle), adds the new one at the table's anchor as a **last child** (the Legendary wreath does this so the
  model editor's part ids stay put), and removes/re-adds on change.
- **Cosmetics screen:** `render/cosmeticsui.js` `SLOTS` already has `{ id: 'plate', name: 'Number plate', live: false }`. Making
  it live means a section in `build()` (a row of chips: plate designs, plus a text row of presets) and `owned('plate', id)`,
  the one place an unlock check goes (always true today). The screen is already on the player's own car.
- **Unlock/ownership:** nothing exists beyond `owned()`; a plate unlock system would answer there, the same as wheels.

### Risks

1. Hidden or covered plates: some cars have a lamp, bull bar or Super-kit part over their anchor.
2. Ghost: the new plate must go pale with the car (ghostify does it for any mesh).
3. Dents at stage 4 can bury the small whole-moved plates (see section 2); the new plate should be a panel or tagged.
4. The 25 plated models are the only ones where the hide-and-replace is exact; the others get an added plate on a flat found by this
   audit: the owner should look at them before trusting them (nothing here was seen).
5. Mesh/part ids: splitting the three merged plate meshes (minivan, pickup, moorrover) is a change to the mesh list.
6. Text legibility in play (the chase camera sees ~100 px).
7. 25 hand-placed models plus 19 that cannot: a plate slot that does nothing for a car must say so on the screen.

### Effort: medium. First small version: small.

## Findings, ranked

1. **Only 41 of 271 vehicles (35 of 221 roster cars) have any plate, and every plate is a blank cream, white or yellow slab.**
   There is nothing to reuse for text; an equippable plate is a new thing on 186 roster cars.
2. **The anchors are mostly there:** a flat place exists at the rear of 180 roster cars (140 of 179 builders) and the front of 159.
   25 cars need hand placement, 16 cannot have one. The plated models give 32 exact places for free.
3. **The existing plates must be hidden when one is equipped.** Three models (minivan, pickup, moorrover) merge both plates
   into one mesh, so hiding one end alone needs a split; the rest hide with one flag.
4. **Hotdog's plate floats 3.8 cm off the tail; threewheeler (1.3 cm), fishbowl (0.6 cm) and the learner's boards (1 cm)
   float a little.** Cheap to fix when the models are next touched.
5. **At the wreck stage of the dents (80 percent and over), small whole-moved plates can be buried** (hotrod, blower, goddess,
   coupecross rear) or end 2 to 5 mm from coplanar. A new plate should follow the panel it sits on.
6. **Ghost and blackout treat any plate as a plain mesh** (no special handling); fine for a plate that is a mesh with a map.
7. **The Wind-Song Racer's note promises a number plate its model does not have.**
8. **The Legendary trim turns three plates gold** (hearse, hotrod, minivan) and leaves two cream; unplanned either way.
9. **No replay or save risk** if built as wheelcosmetic is: render-only, localStorage, no logic import.

## Suggested first step

A small version, rear plate only, in three pieces: (1) `render/platecosmetic.js` with a handful of **preset plate designs** (an
invented format, 6 to 10 plates, a canvas drawn once, 256 x 64, shared) and a `delivery.plate` key; (2) a plate **anchor table**
keyed by model, filled from this audit's reliable class for the 140 builders with the 25 existing plates' own places as the first
entries, `none` for the 19 that cannot, and the 20 hand cases left out (those cars simply keep their stock plate or none);
(3) make the Cosmetics screen's `plate` slot live with one row of chips and the existing-plate hide. Front plates, free text and
the hand-placed 20 come afterwards. Look at it on ten cars with stills before widening.

## QUESTIONS for the owner

1. Plates on **both ends** or the rear only first? (Rear: 180 reliable roster cars; front: 159.)
2. **Presets only**, a build-your-own from pools, or free text (needs a filter)? Which invented format (three letters and three
   digits, a word plate, ...)?
3. Should an equipped plate replace the **existing** plates on the 25 models (assumed yes), including the learner's L plates
   (traffic only, not equippable) and the Legendary gold ones?
4. May **military and craft-like** vehicles (Tank, 8x8, Half-Track, Amphibious Tank) wear a plate, or is it road cars only?
5. Is the plate **free**, a **shop item**, or an **unlock** (the `owned()` hook is ready for it)?
6. Should the **Wind-Song Racer** get the number plate its note promises (a one-line model change)?
7. The **Legendary** cars: gold plates, black-and-gold plates, or leave the plate alone on them?
8. Should the plate also be a **colour choice** (a yellow rear, white front, as some countries do) or a single design per entry?
9. Fix the **floating** plates now (hotdog, threewheeler, fishbowl rear, learner), or leave until the plate work replaces them?
10. Is the **in-play** view (about 100 px) a reason to want a larger-than-real plate in play, or is the showroom the point?
