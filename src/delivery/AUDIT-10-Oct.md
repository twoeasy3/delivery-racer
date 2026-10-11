# Delivery Racer: code audit, 10-Oct (2026-10-10)

Audit only: nothing was changed, run, built or committed. Everything below was found by reading the main
checkout (`main` at `7c901ae`) and by small read-only scripts that count things. Nothing was measured in a
browser, so every cost is an estimate from the code and is marked as one. "Confirmed" means the code was read
until the fault was certain; "suspected" means the code is as described but the cost or the effect needs a run
to prove.

Sizes: **S** under an hour, **M** a few hours, **L** a day or more.

## Summary

The ten most worth doing first:

1. **C1. Two burst-water-main systems run on the same level field**, and one of them is never drawn, so it
   leaves an invisible ice patch on five levels. S to M.
2. **C2. `?car=`, `?pick=` and the amphibious loan are written into the real save** by the next milestone
   count, a few seconds into the run. S.
3. **C3. A traffic slot keeps `hunt`, `shoulderRun` and a few more from its last occupant.** A new, innocent
   car can start out hunting the player. Probably part of the replay failures. S.
4. **C4. The editor writes a loaded level's values into `innerHTML`.** A crafted level file runs script on the
   site's origin (which is also the collection site's admin page). S.
5. **P1 and P2. Draw calls.** Every part of every vehicle and every single cone, mine and asteroid is its own
   geometry, material and draw call. All Heck has about 395 obstacle meshes, Asteroid Run 570. M to L.
6. **P3 and P4. The simulation runs more steps the slower the frame rate**, and each step of the traffic
   allocates an 81-item array per car. S for the allocations, M for the stepping.
7. **P6. The tank corner has a WebGL context of its own**, drawn every frame of every run. M.
8. **P7. Level scenery is dropped without being freed** in eight render modules and the garage. S.
9. **C5 and C6. A bad `?edited` level stops the page dead, and a pasted save code keeps whatever is in it.** S
   each.
10. **P12. The first chunk carries every level's JSON and every model** (about 2 MB of source and 350 KB of
    JSON before three.js). M.

**Cutting the bloat** has a section of its own at the end (section 4): a staged plan that keeps every feature.
In short: the duplicated code is real but small (about 1,600 lines can go safely, about 3,300 with the model
tables, of some 50,000), and the bigger wins are in bytes: what loads before the first run (about 500 KB of source
and JSON can load later), 3.3 MB of sound, and 16 MB in the repository that the game never uses.

**Overall state.** The architecture has held up well under a week of parallel work. Game logic really does not
import rendering. Movement uses `dt` and the `damp()` helper almost everywhere. The track is sampled into
arrays, so `Track.toWorld` is constant time. Every level field a level uses is in the schema and in the docs.
No config key is unread. Levels are validated. The weak points are the ones parallel work produces: two
systems built for one field, the same helper written 28 times, hand-kept lists that must all be edited
together (a traffic car's fields, the gimmick calls in `main.js` and `game.js`), one 2,550-line function, and
rendering that was written model by model with no shared budget for draw calls or GPU memory. None of it needs
a rewrite.

Counts: 14 performance findings, 9 correctness, 9 code: 32 in all. 31 confirmed, 1 suspected (P11). One
confirmed finding (C3) has a suspected consequence (the replay failures).

---

## 1. Performance

### P1. Every part of every vehicle is its own draw call, and every traffic slot has its own copy of each model
- **Where:** `render/models.js:12-30` (`box`, `wheel`), `render/cars.js:23-38` (`makeCarMesh`), `:147-156`
  (`addLamps`), `:230-260` (`trafficMeshes`, `ownModel`).
- **What:** `box()` makes a new `BoxGeometry` and usually a new material for each part. `models.js` has 52
  models built from 674 `box` calls, 83 `wheel` calls (two meshes each) and 307 `lambert(...)` calls: about 17
  meshes a model on average, the big ones far more. Nothing is merged or instanced. The plain box car is 13
  meshes plus a light bar, a mount, 10 lamp meshes and a beam: 26 objects. The pool has 80 slots
  (`CONFIG.trafficPool`), and `ownModel` builds a private copy of a model for each slot the first time that
  slot shows that kind, and keeps it for ever.
- **Cost (estimated):** with 25 vehicles in view, 400 to 900 draw calls for traffic alone. On a phone this is
  the frame budget. GPU memory also only grows: a long session ends with up to 80 slots times every kind seen.
- **Fix:** at build time, merge each model's static parts by material into one geometry per material
  (`BufferGeometryUtils.mergeGeometries`), keeping only the parts `animate()` moves as separate meshes. Share
  the geometries and materials between copies of a model (clone the group, not the buffers); the body paint
  stays one material per car. Then pool models by kind, not by slot. M for the merge helper and the box car,
  L to go through all 52 models. Risk: medium (a model's `animate`, `livery`, `stripe`, `accent` hooks reach
  into parts by reference). Needs the picture-diff in section 4, stage 0.
- **Confirmed** (structure). The draw-call numbers are estimates: read `renderer.info.render.calls` to get them.

### P2. One mesh, one geometry and one material for each cone, mine and asteroid
- **Where:** `render/items.js:364-370` (`buildItems`), `render/obstacleModels.js:330-340` (cone), `:9-17`
  (`boxModel`), `render/items.js:399-405`.
- **What:** `OBSTACLE_MODELS[kind](o)` is called once per obstacle. A cone builds its own `LatheGeometry` (about
  100 vertices) and its own material. By the level files: Asteroid Run 570 asteroids; All Heck 9 obstacles and
  386 cones on its shoulders; Oh Mine! 362 obstacles and 36 drifters (a mine is a group of several meshes);
  Hurricane about 230; Canberra 165; Big Business about 120. Each frame `syncPickups` then calls `Track.along`
  for every obstacle, and `Track.toWorld` for every one within 700 m, moving or not.
- **Cost (estimated):** 400 to 600 extra draw calls on the worst levels when they are in view (the camera's far
  plane is 700 m and the fog ends at 520 m, so a cone 600 m away is still drawn), plus 400 to 600 separate GPU
  buffers a level. These are the levels HANDOVER already names as the phone risks.
- **Fix:** one `InstancedMesh` per static kind (cone, barrier, bale, mine body, asteroid by size class), with
  the instance hidden by a zero scale when `o.gone`. Share one geometry and one material per kind for the rest.
  Skip `toWorld` for obstacles that never move (set once at build). Cull at the fog's far distance, not 700 m.
  M. Risk: low to medium (the per-mesh hooks: `userData.rock`, `bob`, `roller`, `light`).
- **Confirmed.**

### P3. The slower the frame, the more simulation steps it runs
- **Where:** `main.js:183-192`, `config.js:980` (`maxStep: 1 / 120`).
- **What:** `steps = Math.ceil(dt / CONFIG.maxStep)`, with `dt` capped at 0.05 s. At a steady 60 Hz `dt` is
  16.67 ms and `maxStep` is 8.33 ms, so the ratio sits at 2.0 and `ceil` gives 3 on every frame that arrives a
  hair late: about half of them. At 30 fps it is 4 or 5 steps, at 20 fps 6. Each step is a whole
  `Game.update`: all traffic, all gimmicks, all collisions.
- **Cost:** logic time per frame goes up as the frame rate goes down, which pushes the frame rate down further.
  A phone that drops to 30 fps does twice the logic of one holding 60.
- **Fix:** a fixed-step accumulator (carry the remainder to the next frame) gives exactly 2 steps a frame at
  60 Hz and a simulation that does not depend on frame timing. Then decide whether traffic "thinking" needs
  120 Hz at all: only movement and `Collision.check` need the small step to stop head-ons tunnelling. M.
  Risk: medium (level clocks were worked out at this step; check them with `level-clocks.mjs` afterwards).
- **Confirmed.**

### P4. `Traffic.update` allocates and rescans the pool for every car, every step
- **Where:** `traffic.js:2134`, `:2106`, `:2163`, `:2193`, `:1637`, `:1663`, `:1640` with `:69-75`, `:654-662`,
  `:1597-1608`.
- **What:**
  - `for (const o of [...cars, Player])` (2134) builds an 81-item array for every driving car on the main road,
    every step, to look for wrong-way drivers. No car is a wrong-way driver on most levels (only a one-way
    side road without flyovers makes one, `track.js:710`).
  - Each driving car scans all 80 slots two to four times a step (2106, 2134, 2163, 2193).
  - Each inactive, usable slot runs `(LEVEL.quietZones || []).find(closure)` and then `mix()`, which spreads
    `LEVEL.traffic` into a new object, takes `Object.entries` of it and filters it (75). A slot that cannot
    find room does this, and up to five `placeAt` tries with two more `mix()` each, on every step.
  - `huntRoles` (654) filters the pool into a new array every step, with up to three more filters and two sorts.
  - `cars.some(...)` with a fresh closure three times a step for emergencies, processions and convoys.
- **Cost (estimated):** with 25 cars driving, about 25 arrays of 81 and 5,000 to 8,000 loop bodies a step, 2 to
  6 steps a frame (P3): several hundred short-lived objects a frame, which is what makes garbage-collection
  hitches on a phone.
- **Fix:** loop over `cars` and then handle `Player` (no spread). Keep a count of wrong-way cars and skip that
  block when it is zero. Work out the level's traffic mix once per level and per traffic zone, not per call.
  Build one list of active cars at the top of `update` and scan that. S for the spread and the mix (an hour,
  low risk); M for the active list.
- **Confirmed.**

### P5. `syncTraffic` rebuilds every car's shape every frame
- **Where:** `render/cars.js:261-323`, `:39-76` (`shapeCarMesh`), `:159-186` (`syncLamps`), `:306`;
  `render/items.js:104-121` (`syncToads`), `:486`, `:491`.
- **What:** for each active car, each frame: `shapeCarMesh` sets the scale and position of 13 parts whether or
  not the kind changed; `syncLamps` does the same for 10 lamps; `[...lights, ...trim]` builds an array (306, and
  again for the player at `items.js:486`); `performance.now()` is read several times a car; the indicator side is
  found by inverting a matrix (320). For the player, `ghostify` walks the whole car group every frame
  (`items.js:491`), which includes every model the player has driven this session.
- **Cost (estimated):** about 600 `Vector3.set` calls and 50 small arrays a frame with 25 cars. Small beside
  P1, but it is pure waste.
- **Fix:** remember the kind and size a mesh was last shaped for and skip when unchanged; hide the box car's
  parts with one parent group's `visible`; read the clock once a frame; call `ghostify` only when the ghost
  state changes. S. Risk: low.
- **Confirmed.**

### P6. The tank corner is a second WebGL context
- **Where:** `render/tankcorner.js:12-14`, `:44`; called from `main.js:301`.
- **What:** it creates its own `WebGLRenderer` (antialiased, alpha) on its own canvas and renders it every
  frame of every run, to turn a ghost tank in a corner. `render/scene.js:15-17` already says why this is
  dangerous: a phone short of GPU memory drops WebGL. `render/cargo.js:128-138` shows the cheap way: a scissor
  on the game's own renderer.
- **Cost:** a second context's memory and a second composited canvas on every phone, all the time; about 30
  draw calls a frame.
- **Fix:** draw it as `drawCargoCorner` does, into a patch of the main canvas. M. Risk: low (the cargo corner
  is the template).
- **Confirmed.**

### P7. Scenery and models are dropped without being freed
- **Where:** `group.clear()` with no `dispose` at `render/elephants.js:21`, `render/gambles.js:30`,
  `render/hazards.js:87`, `render/machinery.js:21`, `render/roadside.js:113`, `render/site.js:33`,
  `render/wreckage.js:163`; geometry only at `render/reversible.js:42`; `scene.remove` only at
  `render/battle.js:144`; `lot.clear()` at `render/garage.js:79`.
- **What:** three.js keeps a removed mesh's buffers and textures on the GPU until `dispose()` is called. Seven
  modules use `clearGroup` (which does dispose: `render/scene.js:33-42`); these eight do not. `hazards.js` and
  `gambles.js` make canvas-texture signs, so textures leak too. The garage rebuilds all 37 cars (each its own
  geometries and materials) every time Sort or Show is pressed (`garage.js:311`) and frees none. The traffic
  slots' models (P1) and the player's models (`items.js:31-41`) are never freed either.
- **Cost:** GPU memory grows with every change of level and every garage sort, for the life of the page. "No
  page reloads" is a rule of the game, so the page lives a long time. On a phone the end is a lost context.
  One way it also costs: `clearGroup` disposes materials and geometries that are shared at module level (the
  gum tree's in `items.js:268-269`, the cached sign textures at `road.js:714`, `:737`, `:765`), which is
  harmless but uploads them again on the next level.
- **Fix:** call `clearGroup` in those eight hooks and in `buildLot`; mark module-level shared resources
  (`userData.shared`) so `clearGroup` skips them. S. Risk: low.
- **Confirmed.**

### P8. The save cookie is sent with every request to the whole site
- **Where:** `progress.js:154` (`path=/`, about 3,400 bytes: README line 179).
- **What:** local storage is already the store that is read first (`progress.js:45-62`). The cookie is only a
  second copy, but a cookie with `path=/` goes out in the header of every request to the origin: every picture
  and every `/api` call of the car collection site too.
- **Cost:** for every visitor who has played the game once, 3.4 KB more in the request headers of the
  collection site. Over HTTP/2 and HTTP/3 (what Cloudflare serves) header compression sends a repeated cookie
  in full only once a connection, so the real cost is far below "3.4 KB times every picture": it is the first
  request of each connection, every request over HTTP/1.1 (the dev proxy, some corporate proxies), and a 3.4 KB
  header the Worker receives with every `/api` call. Small, but it is the game leaking into the site for
  nothing, since the cookie is only a spare copy.
- **Fix:** set `path=/delivery/` (and delete the old `path=/` cookie once), or drop the cookie and keep local
  storage alone. S. Risk: low; see C6 for the save's other edges.
- **Confirmed** by reading (not seen in a network trace).

### P9. The HUD writes to the page every frame whether or not anything changed
- **Where:** `render/hud.js:181-186`, `:205`, `:208-212`, `:238-241`, `:62`, `:145-163`, `:247-250`, `:270-280`;
  `render/cargo.js:115`; `main.js:270`.
- **What:** `textContent` and `style` are set every frame for the timer, the tip, the effects line, the busts
  line, the bars and both SVG gauges. Some lines compare first (189-192); most do not. `Traffic.cars.filter`
  runs twice a frame on a race level (62, 239). `Traffic.policeNear` scans the pool three times a frame (twice
  here, once in `main.js`). `syncSticky` slices, reverses, maps and joins the sticky list every frame.
  `drawCargoCorner` calls `getBoundingClientRect()` every frame, after all those writes, which forces the
  browser to lay the page out synchronously each frame.
- **Cost (estimated):** about 20 DOM writes and one forced layout a frame. On a phone, a millisecond or more.
- **Fix:** a tiny `setText(el, value)` / `setStyle` helper that writes only on change; the timer only changes
  ten times a second. Cache the corner's rectangle and refresh it on `resize`. Work out `policeNear` once a
  frame. S. Risk: low.
- **Confirmed.**

### P10. Whole buffers go to the GPU every frame: the tide, the water, the particles
- **Where:** `render/tide.js:96-107`, `render/water.js:163-178`, `render/effects.js:13-62`.
- **What:** the tide and water rewrite only the rows near the player, then set `needsUpdate` on the whole
  attribute, and three.js 0.160 uploads all of it (no update range is set). The tide does it every frame even
  when the water has not moved. The three particle systems (500, 400 and 600 instances) walk every slot and
  upload all three matrix buffers (96 KB) every frame, and draw all 1,500 instances, even with no particle
  alive; `emit` also flags the whole colour buffer.
- **Cost (estimated):** 100 to 300 KB of buffer upload a frame on a tide or water level, 96 KB on every level.
- **Fix:** `attribute.addUpdateRange(start, count)` for the rows touched; skip the upload when nothing changed;
  for particles keep a live count, skip the update when it is zero and set `mesh.count` to the highest live
  slot. S. Risk: low.
- **Confirmed** (the code). Cost estimated.

### P11. Run-off and gravel are looked up by scanning every stretch
- **Where:** `track.js:420-433` (`shoulderOn`), `:434`, `:481-491` (`lo`, `hi`), `:542-550` (`gravelAt`), `:536`.
- **What:** `Track.lo(s)` and `Track.hi(s)` call `shoulderOn`, which loops over every run-off stretch. Spa has
  190, Monza 230. `gravelAt` loops over 172 on Spa and calls `gravelBand`, which calls `lo`/`hi` again and
  returns a new array. Every car asks for `lo`/`hi` several times a step (`keepOnRoad`, shoulder offsets).
- **Cost (estimated):** on a circuit with 20 cars, tens of thousands of comparisons a step. This is the only
  per-step cost found that grows with the size of the level data.
- **Fix:** at `buildTrack`, sample each side's shoulder width into a `Float32Array` every 2 m (as `CURVES`
  already is, `track.js:76`) and index the gravel by 50 m bucket. S to M. Risk: low (the same numbers, looked
  up instead of recomputed; compare the arrays against the old function in a check).
- **Suspected** (the code is as described; whether it shows in a profile needs a run on Spa).

### P12. Everything loads before the first run
- **Where:** `levels.js` (54 static JSON imports), `main.js:15-64`, `render/garage.js` to `render/ideaslot.js`
  to `render/ideaModels.js`, `render/cargo.js` to the three `cargoModels*.js`.
- **What:** an import-graph walk from `main.js` reaches about 118 modules and 2.0 MB of source (32,500
  lines), all in the first chunk, plus all 54 levels' JSON (347 KB minified, 186 KB of it the segments of Spa,
  Monza and Albert Park), plus three.js. Loaded and parsed before the menu shows, though a visit uses one level,
  one cargo item and usually not the Car ideas lot (113 KB of source), the race screensaver, the fly camera or
  photo mode.
- **Cost (estimated):** roughly 1 MB of minified script of the game's own to download and parse on a phone
  before anything appears. Run `vite build` once and read the chunk sizes to replace this estimate.
- **Fix:** dynamic `import()` for the Car ideas lot, for the cargo models (one file per item or per ten), for
  `fly.js`, `photo.js`, `racewatch.js`, `album.js`, `savecode.js`; the circuits' JSON loaded when picked (the
  menu needs only id, name, tip, clock, laps and theme: a small manifest). M. Risk: medium (`LEVELS` is read
  synchronously in many places; start with the modules, which are easy, and leave the levels for later).
- **Confirmed** (the graph). Sizes after minifying are estimates.
- **Sound, by the way:** the pictures and sounds are imported `eager` only as URLs, so nothing is downloaded
  until shown or played, and the two large WAVs are already fetched lazily (`render/audio.js:27`).

### P13. The frame loop's sound section scans the pool four times
- **Where:** `main.js:262-296`.
- **What:** three loops over the 80 slots (siren, lowriders, frogs) and a `Traffic.cars.some(closure)` (287),
  each calling `Track.along(Player.s)` again for every car, plus a loop over every obstacle for frogs.
- **Cost:** small: a few hundred calls a frame. Listed because it is in the entry file and easy.
- **Fix:** one pass over the pool that fills in all four answers; take `Track.along(Player.s)` once. S. Risk: low.
- **Confirmed.**

### P14. Pickups: a geometry and a material each, and all of them animated wherever they are
- **Where:** `render/items.js:124-137`, `:385-397`.
- **What:** every pickup's pad is a new `BoxGeometry` and a new `MeshBasicMaterial`; every pickup's gem is a
  fresh model. Each frame every pickup's gem is turned and animated, however far away. Unlike obstacles,
  pickups are not hidden beyond the fog. Big Business has 41 pickups, Stelvio and Market Town 34 each.
- **Cost:** small (tens of draw calls), but the standing rule is now "more cash pickups on every level".
- **Fix:** share the pad's geometry and one material per colour; hide and skip pickups more than the fog's
  distance away. S. Risk: low.
- **Confirmed.**

---

## 2. Correctness

### C1. Two burst-water-main systems run on the same field, and one is invisible
- **Where:** `watermains.js:21-28` and `hazards.js:113-118`, `:318-326`; `game.js:375`, `:388`;
  `render/watermains.js:129-152` against `game.js:165` and `:213`; `levels.js:248-250` and `:282`.
- **What:**
  1. A level's `waterMains` is read by both `WaterMains` (a round slick, `Track.slicks`, its own timer from
     `every`) and `Hazards` (a slippery length of lane, `Track.sprays`, its own timer from `CONFIG.waterMain.on`
     / `off`). Both run on every level with the field: Flooded, Mumbai, Market Town, Gimmick Road and Gimmick
     Road 2. So each main is two hazards with two clocks and can warn twice. `levels.js` documents the field
     twice, with two different shapes.
  2. `render/watermains.js` builds its meshes in a `Game.onLoad` hook from `WaterMains.list`. But `Game.start`
     runs `load()` first (165) and `WaterMains.reset()` afterwards (213), and `reset` replaces the list. So at
     build time the list is the last run's: empty on a fresh page (nothing is built, and a restart does not
     rebuild), or another level's mains (built in the wrong places, holding dead objects). The geyser and the
     pool of the first system are therefore never drawn properly, while its slick is live. What the player
     sees is the second system's wet lane only.
  3. `hazards.js:115` calls `Track.laneOffset(m.lane, from)` although the docs and the schema say `lane` may
     be left out (the centre line). With no lane the result is `NaN`. No level does that today.
- **Cost:** an ice patch 16 m long and 9 m wide that nothing on screen shows, on five levels, on a timer the
  player cannot see.
- **Fix:** choose one system (this needs the owner's word on which behaviour is the game's) and delete the
  other's logic; build the drawing after `reset` (or have `reset` fill the list in place and the renderer read
  it each frame by index, as `render/hazards.js:256` does). S to M. Risk: low.
- **Confirmed** by reading. Worth one look in the browser on Flooded to see it.

### C2. Address-bar loans are written into the real save
- **Where:** `main.js:83`, `:117-118`, `:121`; `progress.js:174-182`; `milestones.js:35-65`; `packages.js:297`.
- **What:** `?car=lowrider` pushes the id onto `Progress.data.cars` and sets `Progress.data.car`, with the
  comment "nothing is saved". `?pick=41` sets `Progress.data.unlocked` to every level "for this visit". An
  amphibious level from the address pushes the Float Van. But `Progress.data` is the live save, and anything
  that calls `Progress.save()` writes all of it. `Progress.count` does so at once on its first call
  (`countSaved` starts at 0, so `now - 0 >= 5000`) and every five seconds after. A package that lands, a wreck,
  or the end of the run (`kmDriven`) is enough.
- **Cost:** `?autostart&car=tank`, one thrown package, and the Tank is owned for good and is the car in use.
  `?pick=1&start` and one wreck opens every level for good. The README promises the opposite. `?car=` also
  takes any text, so a made-up id ends up in the save.
- **Fix:** keep visit-only grants out of `Progress.data`: a `Progress.visit = { cars: [], unlocked }` that
  `owns()` and the menu consult and `saveText` never sees. S. Risk: low.
- **Confirmed** by reading.

### C3. A traffic slot keeps state from the car that had it before
- **Where:** `traffic.js:236-353` (`outfit`), `:1564-1579` (`reset`), against `:639` (`hunt`), `:537`, `:999`
  (`shoulderRun`), `:948` (`oncoming`), `:808-810` (`boosts`, `damageScale`), `:1749` (`spinIce`); the reset for
  racers alone at `:593-597`; `:1668`, `:654`.
- **What:** a car's fields are put back by hand in three places (the pool's literal, `reset`, and the hundred
  lines of `outfit`). A script that lists every field assigned to a car and not named in those three finds:
  `hunt`, `huntRole`, `shoulderRun`, `oncoming`, `boosts`, `damageScale`, `spinIce`, `checkWait`, `squeeze`,
  `passSide`, `inGravel`, `wrongHorn`. So when a hunter is wrecked mid-hunt, the next car dealt out of that slot
  (any kind, any mood, in any later run or level) starts with `hunt > 0`: it is counted by `huntRoles`, it is
  never taken off for being far away (1668), and it goes for the player until the old timer runs down. An evil
  driver wrecked while running up the shoulder leaves `shoulderRun` set for the next one.
- **Cost:** rare, odd behaviour on Evil runs that no one can reproduce by hand; and two runs from one seed
  differ, which is what `REPLAY-NOTES.md` and the comment at `traffic.js:253-255` are about. The checklist
  lists "the replay failures" as a known problem.
- **Fix:** one `blankCar()` that returns every field at its starting value; the pool, `reset` and `outfit` all
  start from `Object.assign(car, blankCar())`. Then a check script can assert that no field is assigned
  elsewhere without being in it. S. Risk: low.
- **Confirmed** for `hunt` and `shoulderRun` by reading. That it explains the replay failures is **suspected**.

### C4. The editor puts a loaded level's values into `innerHTML`
- **Where:** `editor.js:690-696`; reached from `:1205-1213` (a file picked or dropped), `:1186` (the autosave).
- **What:** the segment table is built as an HTML string with `value="${seg.length}"`, `${seg[k] ?? ''}` and
  the rest, straight from the level. A level file with `"length": "\"><img src=x onerror=...>"` runs script
  when it is opened, and again from the autosave on the next visit. Only `raw.segments` being a non-empty
  array is checked first.
- **Cost:** script on the site's origin from a shared level file. That origin also holds the collection
  site's admin session, so this is more than a toy problem.
- **Fix:** build the rows with DOM calls (the file's own `h()` helper) or pass every value through `Number()`.
  The same for `title="${S.help}"` if help text ever comes from data. S. Risk: low.
- **Confirmed** by reading.

### C5. `?edited` trusts whatever is in local storage, and a bad level stops the page
- **Where:** `main.js:108-111`, `:122`; `track.js:76-83`.
- **What:** the handed-over level is `JSON.parse`d and passed to `selectSpecial` with no check. `buildTrack`
  then does `for (const seg of LEVEL.segments)` and `new Float64Array(length)`. No `segments`, or a `length`
  that is a string or a billion, throws inside `Game.start()` at the top level of `main.js`, before
  `requestAnimationFrame(frame)` is reached at the bottom: a blank page with no message. The editor's own
  `checkLevel` (`levelSchema.js`) is not used here.
- **Cost:** a level the editor let through (or an old autosave from a schema since changed) gives a dead page
  with nothing to say why. The same is true of any exception in any `onLoad` hook.
- **Fix:** wrap the start-up in `try`/`catch`, show the error in `#levelProblems`, fall back to the test
  track, and always start the frame loop. Refuse a level with no segments or one over a sane length. S.
  Risk: low.
- **Confirmed** by reading.

### C6. The save: what an import keeps, and what happens at the cookie's cap
- **Where:** `progress.js:107-123` (`tidy`), `:63-71` (`read`), `:73-92` (`restore`), `:154`.
- **What:**
  - `tidy` starts from `{ ...saved }`, so every unknown key in a pasted code is kept and saved for ever.
    `stats`, `muted`, `touch`, `autoGas`, `raceClass`, `raceTrack` and `evil` are not checked at all (a `stats`
    that is a string becomes an object of letters; a non-number counter becomes `NaN` on the next count).
    `bestTime` keeps any number of made-up level ids. There is no cap on size.
  - The cookie is `encodeURIComponent` of JSON, which turns each `"`, `{`, `}`, `:` and `,` into three bytes.
    At 3,382 of 4,096 bytes (README) there is room for about 15 more levels delivered on both sides. Nine
    new levels are in flight. Past the cap the browser ignores the write and **keeps the old cookie**; local
    storage is still right, so nothing shows until local storage is cleared, and then an old save comes back.
  - `read` only ever tries `savedCopies()[0]`. If the local-storage copy parses but `restore` throws on it
    (`cars` not an array), the result is a fresh game even when the cookie holds a good save.
  - A car id or `raceTrack` that no longer exists is handled (it falls back). `INSERTED_AT` is sound as
    written, but it is one more list that every new level must be added to by hand.
- **Fix:** `tidy` builds a new object from a whitelist, with a type check per key, known car and level ids
  only, and a length cap on the code. `read` tries each copy in turn. Either drop the cookie (P8) or write it
  only when it fits and delete it when it does not. S to M. Risk: low.
- **Confirmed** by reading. The headroom figure is an estimate from the README's number.

### C7. Drop bears and the migration are placed with `Math.random` when the level loads
- **Where:** `collision.js:373-378`, `:408-417`; compare the seeded rockfall, mines, drifters and asteroids at
  `:321`, `:336`, `:425`, `:453`.
- **What:** the rule is "level content sits at fixed positions, the same every run". A drop bear's `s` is
  `z.from + Math.random() * (z.to - z.from)` at load, so its tree (built from it in `render/items.js:362`) is
  somewhere new on every page load, though the same on a restart. The migration's animals are placed the same
  way. `collision.js:351` and `:364` use it for animation phase only, which is fine.
- **Fix:** the seeded generator already in the file. S. Risk: none.
- **Confirmed.**

### C8. Milestone counters count on runs that are said to save nothing
- **Where:** `milestones.js:32-46`, `:61-65`; `packages.js:297`; `bullettrain.js:94`; `hippos.js:89`.
- **What:** only the screensaver is excluded. A run on a hidden level, on `?edited`, with `?ghost` (nothing
  can wreck the car) or with `?car=` still counts packages landed, kilometres driven, police outrun and trains
  dodged, and saves them. `levelsDelivered` alone checks `LEVEL_INDEX >= 0`.
- **Cost:** a milestone can be farmed on the test track; and this is the path that makes C2 permanent.
- **Fix:** one `Progress.counting` flag, false for hidden levels and address-bar test switches. S. Risk: low.
- **Confirmed** by reading.

### C9. Spray and wakes are emitted per frame, and boats get them twice
- **Where:** `render/items.js:534-557`; `render/water.js:139-151` (`spray`) and its two callers.
- **What:** two particles a frame for a wake and for turbo exhaust, and a 60% chance a frame for each boat:
  twice as much at 120 Hz as at 60, half as much at 30. A boat in traffic on a water stage is given a wake by
  `syncPickups` (`items.js:543-549`) and spray by `syncWater` in the same frame. The particles' landing skid is
  `*= 0.9` a frame (`render/effects.js:51`).
- **Cost:** looks only. But the pool is a ring of 500, so on a fast screen the doubled wakes push explosion
  debris out early.
- **Fix:** emit by a rate times `dt` (as `emitSmoke` already does at `render/effects.js:72-76`); keep one of the
  two boat wakes. S. Risk: none.
- **Confirmed.**

---

## 3. Code

### Q1. `main.js` and `game.js` are a hand-kept list of every gimmick
- **Where:** `main.js:3-64` (about 60 imports, 37 of them from `render/`), `:202-250` (about 35 `sync...`
  calls); `game.js:1-35` (35 imports), `:197-214` (18 `reset` calls), `:373-396` (about 20 `update` calls).
- **What:** a new gimmick must add a line in five places across these two files. Every feature branch does,
  in the same few lines, which is where this project's merge conflicts come from. A gimmick that forgets one
  of the five fails silently (C1's ordering fault is of this family).
- **Fix:** an ordered registry: each gimmick file calls `Gimmicks.add({ name, reset, update, playingOnly })`
  and each render file `Scene.add({ name, build, sync, after })`. The order stays explicit (one array of names
  in one place, since several calls must come after others: the comments at `main.js:216`, `:225`, `:226`,
  `:246` say so). M. Risk: medium (order). Do it when few branches are open.
- **Confirmed.**

### Q2. A traffic car's fields are defined in three hand-kept lists
- **Where:** `traffic.js:36-40`, `:236-353`, `:1578`. See C3: the same thing as a structure problem.
- **Fix:** `blankCar()`, as in C3. The same idea for `Player.reset` and for `Game.start` (`game.js:178-196`).
- **Confirmed.**

### Q3. Very large functions doing many jobs
- **Where and what:**
  - `render/road.js:787-3335`: `buildRoad` is one function of about 2,550 lines that draws the road and every
    theme's scenery. Every theme agent edits it (three are doing so now).
  - `traffic.js:1592-2389`: `update` is one function of about 800 lines with some twenty early `continue`s, one
    per state a car can be in (arrested, toad, roadblock, parked, stalled, halted, driven, emergency...).
  - `traffic.js` as a whole is one closure of 2,400 lines holding ordinary traffic, races, rivals, the
    Battlefield, junctions, emergencies, processions and convoys.
  - `collision.js:271-500`: `loadLevel` places 25 kinds of thing in one function.
- **Cost:** merge conflicts, and nobody can hold the whole function in their head, which is how C3 happens.
- **Fix:** `render/themes/<theme>.js`, each exporting `build(ctx)` with the helpers `buildRoad` now closes over
  passed in as `ctx`. The three circuits are already done this way (`render/circuits/index.js` and its
  `kit.js`, 220 lines in five files): the same pattern for every theme. It also lets a theme load only when a
  level uses it (P12). In `traffic.js`, one function
  per state, and `race.js`, `battle.js`, `junctions.js`, `events.js` as files that receive the shared pool. L
  each. Risk: medium (these are pure moves, so the replay check and the picture-diff prove them). Wait until
  the theme branches have landed.
- **Confirmed** (line counts).

### Q4. The same helpers written many times, already drifting
- **Where (counts by `grep`, definitions of the name across `src/delivery`):** `const lambert =` 28 files;
  `const box =` 38 definitions in 31 files, with at least three different signatures (`(parent, material, w, h,
  l, x, y, z)` in `models.js:13`, `(w, h, d)` in `cargoModelsGood2.js:16`, others); `const between =` 15;
  `const add = (` 15; `const glow =` 14; a seeded random generator 13 times in 7 files, with two different
  algorithms inside `collision.js` alone (`:322` and `:426`); `const clamp` / `clamp01` 8, though `util.js`
  exports `clamp`; `const kmh =` 6; a sign or board maker 7; `const smooth` 6. `ideaModels.js:11-140` repeats
  `models.js:12-110` (box, wheel, slab, prism, curved, screen, disc) with small changes.
- **Cost:** a fix to one copy (a shared material, a merged geometry: P1) has to be made 28 times, so it is
  not made.
- **Fix:** `render/kit.js` (materials with a cache by colour, the box / wheel / slab / prism family, sign
  boards) and four more lines in `util.js` (`between`, `smooth`, `seeded(seed)`, `kmh`). See section 4, stage 3.
  M. Risk: low if done as a move with the picture-diff.
- **Confirmed.**

### Q5. Every level field is described three or four times
- **Where:** the comment at the top of `levels.js` (359 lines); `levelSchema.js` (604 lines: shape, settings,
  rules, help); the checks in `track.js` (about 135 `problems.push`, roughly lines 845 to 1180); and the cards
  in `gimmicks.js` (969 lines).
- **What:** they already disagree in one place found (`waterMains`, C1) and the schema says of `lane` "Left
  out: the centre line" where `hazards.js` needs one. A script confirms the lists themselves agree today:
  100 fields read as `LEVEL.x`, 100 keys used by levels, all in the schema and in the docs. `splits` is
  implemented (`track.js:369-384`) and documented but used by no level, so nothing exercises it.
- **Fix:** generate the field reference from the schema (a script that prints it), and keep only the prose
  about the file format in `levels.js`. Leave `track.js`'s checks where they are: they are the ones that run in
  the game, and the schema is too big to ship (see section 4, "What not to cut"). S. Risk: none.
- **Confirmed.**

### Q6. The "logic never imports rendering" rule cannot be checked by a machine as the files are laid out
- **Where:** `gimmicks.js`, `editor.js`, `powerups.js`, `sides.js`, `cargopage.js` and `main.js` all live in the
  logic folder and import from `render/` (54 such imports in all).
- **What:** the real game logic is clean: none of it imports rendering (checked by an import-graph walk). But
  the six page scripts sit beside it, so a check of "nothing in `src/delivery/*.js` imports `render/`" fails,
  and a real violation would hide among the allowed ones.
- **Fix:** move the page scripts to `src/delivery/pages/` (and update the seven HTML files), then add the
  one-line check. S. Risk: low. Wait for the menu and editor branches.
- **Confirmed.**

### Q7. Exports and assets nothing uses
- **Where:** 46 exports are imported by no module. Used nowhere at all, not even by a script or their own file:
  `IDEA_CAR` (`ideas.js`), `fieldNames` (`levelSchema.js`), `TIERS` (`cars.js`, scripts only). Exported for no
  reader but used inside their file: `yawFor` (`physics.js:12`), `playerMats` (`render/cars.js:199`), `crumple`
  (`render/dents.js`), `makeBoard` (`render/gambleModels.js`), `F1_ACCENTS` (`render/models.js`), `TRANSITION`
  and `CARGO_MODELS` (`render/cargoModels.js`), `reveal` (`render/fly.js`), sixteen lists in `levelSchema.js`.
  The 72 `carshots/super-*.jpg` (1.0 MB) are never shown: `CAR_SHOTS` is read only at `render/menu.js:144`, by
  the id of the garage car in use, which is never a Super. `splits` (Q5). `cameras.js` points at a
  `render/cameras.js` that does not exist (already in HANDOVER).
- **Fix:** drop the `export` keyword or the item; decide on the Super pictures (see section 4). S. Risk: none.
- **Confirmed.**

### Q8. Twenty one-off check scripts and an 18-minute test, with no single way to run them
- **Where:** `scripts/.*-check.mjs` (20 files, about 1,650 lines), `scripts/delivery-smoke.mjs` (2,875 lines),
  `delivery-headless.mjs`, `delivery-probe.mjs`, `_probe.mjs`, `delivery-levels-check.mjs`.
- **What:** six of them start a Vite server of their own; the rest share a helper. They are hidden files, are
  not in `package.json`, and nothing says which to run after which change. The checklist already suspects the
  shared Vite cache of making them flaky.
- **Fix:** see section 5 and section 4, stage 0.
- **Confirmed.**

### Q9. Tuning numbers inline in rendering
- **Where:** for example `render/items.js:402` (700 m draw distance), `:128-131` (pickup size), `render/hud.js:83`,
  `:133` (camera alert distances, with `CONFIG.speedCamera?.warn || 180` as a fallback), `render/cars.js:164`,
  `:180` (blink periods), `traffic.js:1598`, `:1604`, `:1609` (0.5, 0.6, 0.65 chances of a direction), `:1589`
  (200, 60), `:1737` (14), `watermains.js:16` and `:26` (defaults repeated from config).
- **What:** the rule is "tuning lives in `config.js`". Game logic mostly keeps it; rendering mostly does not,
  which is fair for a model's proportions but not for draw distances and timings that the phone work (P2, P14)
  will want to turn.
- **Fix:** a `CONFIG.draw` block (far distance for obstacles and pickups, particle caps, blink periods). S.
- **Confirmed.**

---

## 4. Cutting the bloat: a plan

The aim is the same game from less code and fewer bytes: every level, car, gimmick, page and address parameter
exactly as now. Nothing here was done; this is a plan.

### 4.1 Measured first

Tracked files under `src/delivery`, `delivery` and `scripts` (`git ls-files`; lines counted with comments,
which are perhaps a third of the code):

| Area | Files | Lines | Bytes | Goes to the player? |
|---|---:|---:|---:|---|
| Game logic (`src/delivery/*.js` less the rows below) | 42 | 11,162 | 687 KB | yes, first chunk |
| `config.js` | 1 | 1,424 | 116 KB | yes, first chunk (and all six other pages) |
| Pages, editor, schema (`editor`, `editorForms`, `levelSchema`, `gimmicks`, `powerups`, `sides`, `police`, `cargopage`) | 8 | 3,668 | 291 KB | only on their own pages |
| Rendering: models (`render/*Models*.js`, `models.js`, `carExtras.js`) | 19 | 8,778 | 578 KB | yes, first chunk |
| Rendering: `road.js` | 1 | 3,336 | 206 KB | yes, first chunk |
| Rendering: the rest (with `render/circuits/`, 5 files) | 55 | 7,873 | 419 KB | yes, first chunk |
| Levels' JSON | 54 | 11,901 | 472 KB (347 KB minified) | yes, first chunk |
| `messages.json` | 1 | 381 | 16 KB | yes |
| CSS | 8 | 757 | 59 KB | yes |
| HTML pages | 7 | 398 | 19 KB | yes |
| Sounds (WAV) | 43 | | 4,177 KB | on demand; two files are 3,626 KB of it |
| Car pictures | 158 | | 1,977 KB | on demand; 72 are never shown (1,006 KB) |
| Level pictures | 42 | | 637 KB | on demand |
| Scripts: the game's tooling | 29 | 5,952 | 382 KB | no |
| Scripts: cached map downloads (`scripts/circuits/cache`) | 6 | | 15,125 KB | no |
| Docs (`*.md`) | 8 | 2,512 | 224 KB | no |

All JavaScript in `src/delivery`: 126 files, 36,241 lines, 2.30 MB. With the levels, CSS, HTML and messages
that is 49,700 lines (the "45,000" of the handover, grown), and 55,600 with the game's scripts.

What the game page loads before the first run (import graph from `main.js`): about 118 modules, 32,500 lines
and 2.0 MB of source, plus 347 KB of level JSON, plus three.js. The other pages are much smaller: Power-ups
5 modules and 212 KB, Good and Evil 3 and 130 KB, Police 2 and 123 KB (almost all of it `config.js`), Cargo 7
and 347 KB, Gimmicks 16 and 532 KB, Editor 11 and 488 KB.

The twenty largest files:

| File | Lines | Bytes |
|---|---:|---:|
| `scripts/circuits/cache/monza-map.json` | 1 | 7,366 KB |
| `scripts/circuits/cache/albert-park-map.json` | 1 | 6,219 KB |
| `sounds/Lowrider.wav` | | 1,893 KB |
| `sounds/Lowrider 2.wav` | | 1,733 KB |
| `scripts/circuits/cache/spa-map.json` | 1 | 1,528 KB |
| `render/road.js` | 3,336 | 206 KB |
| `scripts/delivery-smoke.mjs` | 2,876 | 185 KB |
| `render/models.js` | 2,266 | 160 KB |
| `traffic.js` | 2,402 | 153 KB |
| `config.js` | 1,424 | 116 KB |
| `render/ideaModels.js` | 1,464 | 113 KB |
| `levels/spa.json` | 1,582 | 113 KB |
| `render/cargoModelsEvil2.js` | 1,388 | 88 KB |
| `gimmicks.js` | 969 | 87 KB |
| `editor.js` | 1,272 | 86 KB |
| `CHECKLIST-10-Oct.md` | 879 | 84 KB |
| `track.js` | 1,200 | 81 KB |
| `levels/monza.json` | 1,160 | 78 KB |
| `SCRATCHPAD-10-Oct.md` | 753 | 70 KB |
| `levelSchema.js` | 604 | 62 KB |

By feature, roughly (lines of JavaScript; a file is counted where most of it belongs):

| Feature | Lines | Main files |
|---|---:|---|
| Models: vehicles, traffic, ideas lot | 4,250 | `models.js`, `ideaModels.js`, `trafficModels.js`, `carExtras.js`, `boatModels.js` |
| Models: cargo (50 items) | 2,830 | `cargoModels.js`, `cargoModelsGood2.js`, `cargoModelsEvil2.js` |
| Models: obstacles, pickups, the rest | 1,700 | `obstacleModels.js`, `pickupModels.js`, ten small files |
| Road, terrain and every theme's scenery | 3,340 | `render/road.js` |
| Traffic (with races, rivals, the Battlefield, junctions) | 2,400 | `traffic.js` |
| Track and its checks | 1,200 | `track.js` |
| Core: game, player, physics, collision, packages, pickups, progress, input, cars, levels | 4,600 | |
| Gimmicks, logic (about 20 files) | 2,900 | `hazards.js`, `gambles.js`, `mysteries.js`, `wreckage.js`, ... |
| Gimmicks, drawing (about 30 files) | 3,500 | `render/<gimmick>.js` |
| Menus, garage, HUD, sound, effects, cameras, car and item meshes | 4,400 | `render/menu.js`, `garage.js`, `ideaslot.js`, `hud.js`, `audio.js`, `cars.js`, `items.js`, ... |
| Config | 1,420 | `config.js` |
| The other pages | 1,580 | `gimmicks.js`, `powerups.js`, `sides.js`, `police.js`, `cargopage.js` |
| Editor and schema | 2,080 | `editor.js`, `editorForms.js`, `levelSchema.js` |

So: a quarter of the code is models, a tenth is one file of scenery, and the game proper (core, traffic, track)
is about 8,300 lines. Most of the lines are content, not duplication. That bounds what "cutting bloat"
can honestly save in lines; the bytes are another matter.

### 4.2 Where the bloat is

| # | What | Evidence | Would go |
|---|---|---|---|
| B1 | Model helpers copied into each model file | Q4: `lambert` in 28 files, `box` 38 times, `ideaModels.js:11-140` against `models.js:12-110`; the two new cargo files share a 60-line preamble | about 600 lines |
| B2 | Small maths helpers copied | Q4: `between` 15, seeded random 13, `clamp` 8, `kmh` 6, `smooth` 6 | about 80 lines |
| B3 | Two burst-water-main systems | C1: `watermains.js` (69 lines), its hook in `render/watermains.js`, against `hazards.js:113-118`, `:318-326` and `render/hazards.js:123-`, `:256-` | 110 to 150 lines, and a bug |
| B4 | "A stretch of road with an effect", written a dozen times | `track.js:505-577`: ice, slicks, sprays, tunnels, gravel, mud, water, fog, zones, each its own loop; `Gambles` for crests and crosswinds; `quietZones` and `trafficZones` in `traffic.js:71`, `:1637`, `:1663`; `tunnelCamera` in `render/scene.js:116-133` repeats `Track.tunnel` | about 100 lines, and P11's speed-up comes free |
| B5 | Timed traffic events, three of a kind | `traffic.js:1597-1611` and `:1581-1583`: emergencies, processions, convoys with the same scheduler; `startEmergency`, `startProcession`, `startConvoy` share their placement code | about 60 lines |
| B6 | Per-gimmick boilerplate in `main.js` and `game.js` | Q1: about 150 lines that are one line per gimmick in five places | about 100 lines, and most merge conflicts |
| B7 | Level fields described three times | Q5: 359 comment lines in `levels.js` that the schema's `help` already says | about 300 lines |
| B8 | Dead exports, dead feature paths | Q7 | about 50 lines |
| B9 | Check scripts with their own start-up each | Q8: 20 scripts, each with its own server, seeding and report code | about 200 lines, and minutes per run |
| B10 | Models written as code where a table would do | `obstacleModels.js:9-17` already has `boxModel(parts)`; most of `models.js`' 674 `box(...)` calls are rows of numbers | 1,000 to 1,700 lines (optional, last) |
| B11 | Everything in the first chunk | P12 | 0 lines; about 300 KB of source and 186 KB of JSON out of the first load |
| B12 | Level JSON longer than it need be | Spa has 1,151 numbers with five or more decimals, Monza 748, Albert Park 996; run-off and gravel are 52 KB minified in two files | about 25 KB minified (run-off and gravel only: see 4.4 on the bends) |
| B13 | Pictures nothing shows | Q7: 72 Super car pictures | 1,006 KB of repository and deploy |
| B14 | Two sounds are 87% of all sound | `Lowrider.wav` and `Lowrider 2.wav`, 3,626 KB, uncompressed WAV | about 3,300 KB (as compressed audio) |
| B15 | Map downloads committed | `scripts/circuits/cache/*.json`, 15.1 MB, inputs to `circuit-from-osm.mjs` | 15.1 MB of repository (about 13.5 MB if gzipped in place) |
| B16 | HTML and CSS repeated across the seven pages | the five reference pages are 18 to 22 lines each and share `powerups.css`; `style.css` is 412 lines | under 50 lines: **not worth doing** |
| B17 | `messages.json` and config blocks nothing reads | checked: every one of 788 config keys is named somewhere outside `config.js`; every message group is used (milestone and zone messages are looked up by built keys) | **nothing to cut** (duplicate config keys are with the known-problems agent) |
| B18 | `hazards.js` against the older per-gimmick files | apart from water mains (B3) they do different things; `hazards.js` (450 lines) is eleven small gimmicks in one file | nothing to cut; split it when B6 is done |

### 4.3 The plan, in stages

Safest and most valuable first. "Proof" is how it is shown that nothing changed.

**Stage 0. The safety net (do this first; everything after depends on it).** M to L. No game code changes.
- **A build-size report.** `vite build`, then a script that prints each chunk's size, minified and gzipped,
  and writes it to a file. This replaces every estimate in this section with a number, and every later stage
  quotes before and after.
- **A picture-diff of every model.** A page (the Gimmicks, Cargo and Power-ups pages and the garage's
  `&studio=all` already draw nearly everything) that renders each model from two fixed angles at a fixed size
  with a fixed clock, and a script that saves the PNGs and compares them with the last set, pixel for pixel.
  Models: the 52 in `MODELS`, the traffic models, the 30 ideas, the 50 cargo items in each state, every
  obstacle, pickup, boat and machine. This is the proof for stages 3, 7 and 9.
- **A hash of every level as built.** A headless script that, for each of the 54 levels, calls `buildTrack`
  and `Collision.loadLevel` and hashes: `Track.toWorld`, `lo`, `hi`, `laneOffset`, `grade`, `icy`, `water`,
  `foggy`, `tunnel` sampled every 5 m on every road; `Track.problems`; the obstacle, pickup and target lists
  (needs C7 fixed first, so that they are the same every time). This is the proof for stages 4, 5 and 8.
- **The seeded replay check, passing.** `scripts/.replay-check.mjs` exists and is failing (a known problem).
  C3 is probably why. It must pass before stages 4 to 7, because it is their proof.
- **One runner.** `scripts/check.mjs`, which starts one Vite server and runs every check in it, with names and
  a summary. The smoke test's own sections become checks in it.
- **Lint.** ESLint with only the rules that find bugs (section 5).
- Who: one agent. It touches only `scripts/`, `package.json` and one new page, so it collides with nobody and
  can start now.

**Stage 1. Bytes that are not code.** S each. No game logic.
- Compress the two Lowrider tracks (B14): about 3.3 MB less to store, and 1.7 to 1.9 MB less for a phone to
  fetch the first time a lowrider comes near. Files: `sounds/`, the two names in `render/audio.js`. Proof: the
  names resolve (`.bundle-check`), and a person listens once, since these are music. Risk: low. See 4.4 on
  looping.
- Decide on the 72 Super car pictures (B13): delete them (1.0 MB), or show them. Proof: `CAR_SHOTS` is read in
  one place. Risk: none. Wait for the menu branch (`delivery-menu`), which may want them.
- Gzip or stop tracking the map cache (B15). Files: `scripts/circuits/`. Proof: `circuit-from-osm.mjs` writes
  the same three level files, byte for byte. Risk: none to the game.
- Round run-off and gravel widths to a centimetre (B12): about 25 KB. Proof: the level hash differs only in
  `lo`/`hi` by under 5 mm (compare with a tolerance for this one stage), and `level-clocks.mjs` gives the same
  clocks. Risk: low.
- Can run now, beside stage 0, by one agent. Saving: about 4.3 MB of deploy, 19.4 MB of repository, 25 KB of
  first load.

**Stage 2. Dead things.** S. Remove the unused exports and items of Q7; generate the field reference from the
schema and cut the 300 comment lines it replaces (B7). Files: a dozen, one line each, and the top of
`levels.js`. Proof: `.bundle-check` (every import still resolves), `.schema-check`, lint's unused-export rule.
Risk: none. Saving: about 350 lines. Wait for the theme branches before touching `levels.js`; the rest can go
now.

**Stage 3. One kit for models and one for small maths (B1, B2).** M. New `render/kit.js` and five functions in
`util.js`; each model file's preamble is replaced by an import. Do it one file at a time, each its own commit.
The kit's `lambert(color)` should return a cached material where the caller does not change it afterwards;
start with no caching (a pure move), then turn caching on per file with the picture-diff. Files: the 19 model
files and about 25 `render/` files. Proof: the picture-diff, identical; `.bundle-check`. Risk: low for the
move, medium for the caching. Saving: about 680 lines; and it is the door to P1. Parallel: yes, by file, among
two or three agents, once the kit itself is merged. Collides with the cargo, ideas and theme work only if
those are still open, so start with `obstacleModels.js`, `pickupModels.js`, `boatModels.js` and the small
`*Models.js` files, which nobody is editing.

**Stage 4. One water-main system (B3, C1).** S to M, after the owner says which behaviour stays. Files:
`watermains.js`, `hazards.js`, `render/watermains.js`, `render/hazards.js`, `game.js`, `main.js`, `levels.js`,
`levelSchema.js`, `gimmicks.js`. Proof: `.hazards-check`; the five levels' hashes change only in slicks and
sprays; one screenshot of Flooded. Risk: low. Saving: 110 to 150 lines. This is the one stage that changes
what the player meets, because today's behaviour is a fault: it cannot be "exactly as now".

**Stage 5. Stretches (B4, P11).** M. A `stretches(list, { ease })` helper in `track.js` that gives `at(s)`
(the entry, or the eased 0 to 1) from a sampled array or a bucket index, used by ice, mud, fog, tunnels,
water, zones, run-off, gravel, quiet zones and traffic zones. Files: `track.js`, `traffic.js`, `gambles.js`,
`render/scene.js`. Proof: the level hash, identical on all 54 levels; the replay check. Risk: low to medium
(easing at the ends must match to the last bit: keep each field's own easing function and change only the
lookup). Saving: about 100 lines, and the circuits get faster. Wait for `delivery-gimmicks`, which adds road
gimmicks to `track.js`.

**Stage 6. A registry for gimmicks (B6, Q1), and traffic's events (B5).** M. Files: `main.js`, `game.js`, every
gimmick file (one line each), `traffic.js:1581-1611`. Proof: the replay check (same seed, same run: any change
of order shows at once); the smoke test once. Risk: medium. Saving: about 160 lines and the main source of
merge conflicts. **Must wait** until the open branches (`delivery-gimmicks`, the three theme branches,
`delivery-tank`, `delivery-menu`, `delivery-fixes`, `delivery-editor`) have landed, since every one of them
edits those two files. Do it in one sitting, by one agent, with nothing else open.

**Stage 7. Load later what is not needed at once (B11, P12).** M. `import()` for the Car ideas lot, the cargo
models, fly and photo modes, the race screensaver, the album, the save panel. Files: `main.js`,
`render/garage.js`, `render/cargo.js`, `render/menu.js`. Proof: the build-size report (the first chunk
shrinks, new chunks appear); the picture-diff for the cargo corner and the lot; each address parameter in the
README's table opened once in a headless browser with no console error (a new check: it is a table of URLs,
so it is cheap). Risk: medium (a first frame without its model: show nothing for that frame, as the ending
already does when `Delivery.staged` is false). Saving: about 300 KB of source from the first load. Then, as a
second step, the three circuits' JSON on demand: 186 KB more.

**Stage 8. Split `road.js` by theme, `traffic.js` by job (Q3).** L. No lines saved; it makes the files
mergeable and lets a theme load with its level. `render/circuits/` is the pattern to follow. Proof: picture-diff of one fixed `?cine` still for every
level (the menu pictures are exactly this: `levelshots/` can be the reference set), the level hash, the
replay check. Risk: medium. **Must wait** for the theme branches.

**Stage 9 (optional). Models as tables (B10), and merged geometry (P1).** L. Proof: the picture-diff, to the
pixel. Risk: medium. Saving: 1,000 to 1,700 lines and most of the draw calls. Only worth it together with P1.

What can run side by side: stage 0 and stage 1 now, by two agents. Stage 2's exports and stage 3's untouched
model files as soon as stage 0's picture-diff exists. Stages 4 and 5 after `delivery-gimmicks` lands. Stages 6
and 8 only on a quiet tree. Stage 7 after the menu branch.

### 4.4 What not to cut

- **The comments.** They are about a third of the source and none of the shipped bytes (the build strips
  them). They are how forty agents have found their way around.
- **`track.js`'s own checks**, though the schema repeats many. They run in the game and in the smoke test; the
  schema is 62 KB and is deliberately loaded only by the editor. Making the game validate from the schema would
  add bytes to the first load.
- **The precision of a circuit's bends.** `curve` is radians per metre and is summed every 2 m over 6 km
  (`track.js:87-94`); a lap has to end where it began, and only its height is corrected for what is left over
  (`track.js:116-119`). Round the widths (B12), never the bends.
- **The short WAVs.** 41 files, 550 KB together. Engine notes are loops pitched by speed
  (`render/audio.js`, `ENGINES`); MP3 and AAC add silence at the ends, so a loop clicks. Compress only the two
  music tracks, and even there use a format that loops cleanly or accept a click once per track.
- **The eager `import.meta.glob`s** for pictures and sounds. They import URLs, not files (`query: '?url'`).
  They cost a few kilobytes and are what lets a picture be dropped into a folder with no code change.
- **`INSERTED_AT` and the `RENAMED` map in `progress.js`.** They look like history, and they are what opens the
  right levels for a returning player.
- **The local-storage copy and the cookie's restore path**, until the owner decides between them (P8, C6).
- **The synthesised stand-ins in `render/audio.js`.** They look redundant now that there are WAVs; they play
  until a file has loaded, and they are the only sound for the thirteen names set to `null` in `SAMPLES`.
- **`gimmick-road*.json`, `testbed.json`, `grand-prix.json`, `chaos.json`.** Hidden, but they are address
  parameters (`?hidden=`, `?test`, `?screensaver`) and the only levels that exercise several gimmicks.
- **Both `box` signatures.** The cargo files' `box(w, h, d)` returns a geometry; the vehicle files'
  `box(parent, material, ...)` returns a mesh. The kit needs both, under two names.
- **`levelinfo.js`, `horn.js`, `render/demo.js`, `render/pursuit.js`** and the other files imported only for
  their side effects. A naive "nothing imports a name from it" scan lists them as dead; they are not.
- **The seeded generators' seeds** (13 copies in 7 files). When the generators are merged (B2), each call site must keep its
  algorithm and its seed, or every rock, mine and asteroid moves. `collision.js` uses two different algorithms
  on purpose or by accident; the level hash will say if one is changed.
- **`scripts/circuits/*.json`** (the three small recipe files). Only the cache beside them is bulk.

### 4.5 Total, and the order

Lines: about **1,600** by stages 0 and 2 to 6 (200 in scripts, then 350 + 680 + 130 + 100 + 160), which is 3%
of the whole; about **3,300** (6 to 7%) with stage 9. First load: about **300 KB of source and 186 KB of JSON** moved
out of the first chunk by stage 7, roughly a fifth of it; the build-size report will give the real figure.
Shipped and stored bytes: **3.3 MB** of sound, **1.0 MB** of pictures, **15.1 MB** of repository.

Order: **0** (the net), **1** (bytes that are not code) beside it, **2**, **3**, then **4** and **5** once the
gimmicks branch lands, **7** once the menu lands, and **6** and **8** last, on a quiet tree. Stage 9 only with
the draw-call work (P1).

---

## 5. Cheap checks worth adding, and what was found sound

### Checks that would have caught what is in this audit

| Check | Cost | Would have caught |
|---|---|---|
| ESLint with `no-unused-vars`, `no-undef`, `no-dupe-keys`, `import/named`, `import/no-unused-modules`, and `no-restricted-imports` (logic may not import `render/`) | S; seconds to run | the duplicate config keys (known), Q6, Q7 |
| A "pool reset" check: list every field assigned on a traffic car anywhere, and fail if `blankCar()` lacks one | S; a 20-line script, no browser | C3 |
| A "save is untouched" check: start with `?car=`, `?pick=`, `?hidden=`, `?ghost` in the headless harness, play ten seconds, assert the saved text is byte-identical | S | C2, C8 |
| A "one reader per level field" check: fail if two logic modules both map over the same `LEVEL.x` list | S; `grep` | C1 |
| A build-order check: after `Game.start`, every renderer's list has the same length as its logic module's | S | C1's second half |
| `renderer.info` budget per level: load each level headless, turn the camera to the busiest spot, fail over N draw calls or N geometries; and load ten levels in a row and fail if `renderer.info.memory` keeps growing | M | P1, P2, P7 |
| A fuzz of `Progress.importCode` and of `?edited` with broken input: must never throw, never save an unknown key | S | C5, C6 |
| The level hash and the picture-diff of section 4, stage 0 | M | every "nothing changed" claim |
| `node --check` on every file plus `.bundle-check` and `.schema-check` as a pre-commit hook or a CI job (under 30 s together) | S | broken imports reaching `main`, which deploys |

A CI job that runs the first, second, seventh and last rows on every push would take under a minute and needs
no browser. The smoke test stays the nightly.

### Looked at and found sound (no need to audit again)

- **Logic never imports rendering.** True for every game-logic module (import-graph walk). Only the page
  scripts and `main.js` do (Q6).
- **`Track.toWorld`, `curveAt`, `grade`, `along`** are constant time: sampled arrays built once per level
  (`track.js:44-53`, `:76-95`). No raycasts in the frame loop (the race camera's `sees` runs only when a camera
  is picked).
- **`dt` use in logic.** Movement, timers and lerps use `dt` or `damp(rate, dt)` (`util.js:4`). No
  `x += (t - x) * 0.1` was found in logic. The ice spin (`traffic.js:1746`) and the pass-by honk (`:2367`) roll
  once on an event, not once a step.
- **Level fields.** 100 fields read in code, 100 keys used by levels; every one is in `levelSchema.js` and in
  the `levels.js` docs. Only `splits` is unused by any level.
- **Config and messages.** No config key is unread by name (788 checked); no message group is unused.
- **The kerbside ending** (`delivery.js`): `Game.finish` fixes the result first; the ending cannot be
  interrupted by a time-out or a bust (those only fire while `playing`); the Exit button is hidden once the
  state is `finished`; `skip` is guarded by `skipAfter`; `reset` runs at each start.
- **Unknown ids in a save.** A car id that no longer exists falls back to the Commuter (`cars.js:245`); a
  `raceTrack` that no longer exists falls back to each circuit in turn (`game.js:129`).
- **The save panel** (`render/savecode.js`): text goes in by `textContent`, keys typed in the box do not reach
  the game, import asks first.
- **Pictures and sounds** are not downloaded until used; the large WAVs are lazy.
- **The collision loop** (`collision.js:885-903`): 81 bodies, pairs cut early by distance; cheap.
- **Headlights**: two real lights for the player, flat textured quads for traffic, one shared texture.
- **Timers.** No `setInterval` anywhere; four `setTimeout`s, all one-shot UI. Nothing is left running on the
  menu except the frame loop itself, which does almost nothing there (`main.js:186-189`, `:300-301`).
- **The road and the items** free their meshes on a level change (`clearGroup` at `road.js:790`,
  `items.js:361`, and five more).

### Not looked at

The audio graph in `render/audio.js` beyond its loading; the garage and ideas lot's own frame loops;
`render/road.js` line by line (only its structure, its disposal and `syncZones`); `editor.js` beyond its input
handling; `gambles.js`, `mysteries.js`, `packages.js`, `player.js` beyond a search for the patterns above; the
CSS. Nothing was run in a browser, so no frame time, draw-call count or memory figure here is measured.
