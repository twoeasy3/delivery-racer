# Delivery Racer: menu and showroom performance profile, 14-Oct (2026-10-14)

Question (the owner): "Performance on the menu is poor. Should we explore slowly loading in the background before the user
enters the showroom?" Measured on `main` v1.1.130 (branch `claude/perf-profile`), nothing in the game changed. Tool:
`scripts/perf-menu.mjs` (headless Chromium 141 over CDP; modes `build`, `load`, `frames`, `entry`, `profile`; header says how).
Written in a hurry at the coordinator's request: the runs below are what finished; the machine was shared (load average up to 30
for part of it), so treat single numbers as +-30%.

**What can and cannot be believed.** There is no GPU here, only SwiftShader (software). Draw-call, triangle, program counts and
all JavaScript times are real (CPU throttle 4x / 6x stands in for a mid / low phone). Anything the GPU does (shader compile,
texture upload, rasterising, compositing) is NOT measured: "GL=stub" runs use a no-op WebGL context to time the JavaScript only;
"GL=soft" runs are SwiftShader and say nothing about a phone.

## Verdict: which is the owner's complaint?

| Measure | Result | Likely the complaint? |
|---|---|---|
| 1. LOAD to first menu | 2.2 s desktop, 4.1 s at 4x CPU, 6.5 s at 6x; 6.8 / 8.8 / 9.6 s on Slow 4G | **Yes, the biggest.** |
| 3. SHOWROOM entry and car switch | open 0.2 s (1x) / 1.0 s (4x); each car switch 0.1 s (1x) / 0.5-0.8 s (4x) of JavaScript | **Yes, second.** Cheap to fix. |
| 2. MENU FRAME RATE | menu 3D: 2 renders a frame, 20 draw calls, 2.6k triangles, 0.3-0.6 ms JS a frame | **No** (on JS). GPU / compositing unmeasured. |

## 1. LOAD

`vite build`, eager set = the page's script tag plus its modulepreloads: **15 chunks, 3,069 KB raw, 946 KB gzip, 866 KB brotli**,
plus CSS 209 KB raw (36 KB brotli). Wire bytes of a cold first visit: 1,033 KB (with the first stage picture).

| Chunk | raw KB | gzip | brotli | Holds |
|---|---|---|---|---|
| pickupModels | 1,184 | 284 | 255 | three.js (~150 KB br) and **all 87 level JSON** (486 KB minified, 68 KB br) |
| delivery (entry) | 750 | 285 | 259 | menu, road.js, **all 33 theme scenery files** (~72 KB br) |
| inspectmodel | 393 | 127 | 119 | traffic, lamp tables, ecus.json, packs, collision, game |
| carExtras | 357 | 112 | 101 | **24 idea-model files** (~69 KB br), car models |
| cargoModels | 144 | 50 | 47 | all cargo models |
| themes | 69 | 23 | 22 | cars.js, ideas.js, themes.js |
| pursuitModels, track, config, progress, messages, modelviews, cargo, tuscanyModels, faces | 150 | | | |
| lazy today | | | | unlockcine 47 KB, levelcard3d 4 KB, the other pages (editor, gimmicks...) |

Eager today: **87 of 87 levels' JSON, 33 of 33 themes, 24 of 24 idea-model files, all cargo models.** Only `unlockcine` and
`levelcard3d` are dynamic imports. AUDIT P12 estimated 54 levels and ~1 MB minified; it is now 87 levels and 3.07 MB raw /
866 KB brotli. Sounds: 39 files, 4.0 MB, none in a chunk; the two Lowriders (3.6 MB) are lazy. The first key press or click
starts **41 fetches (about 0.5 MB) and builds the AudioContext** (handler 25-100 ms at 1x, up to 170 ms at 4x), the same
instant the player opens the showroom.

Time to first menu (stub GL, built site served brotli with ETag, cold cache, median of 3). "Painted" = the stage filled and two
frames later.

| CPU | network | scripts arrived | menu painted |
|---|---|---|---|
| 1x | none | 0.44 s | **2.16 s** |
| 4x | none | 0.39 s | **4.08 s** |
| 6x | none | 0.58 s | **6.47 s** |
| 1x / 4x / 6x | 4G 9 Mbps, 70 ms | 1.4 s | 3.73 / 5.03 / 5.89 s |
| 1x / 4x / 6x | Slow 4G 1.6 Mbps, 150 ms | 5.2-5.4 s | 6.80 / 8.79 / 9.64 s |

Second visit (assets revalidated, 304): 1.8 s (1x), 4.3 s (4x), 4.3 s (6x) with no network cost; so after the first visit the
cost is JavaScript, not bytes. Download time is only a few seconds of it on Slow 4G; **the rest is main-thread work after the
bytes arrive: about 1.7 s at 1x, 3.7 s at 4x**: module evaluation (~0.7 s at 1x: road.js, themes, models, menu build, canvas
labels made at import) plus the first menu frames. Parsing is cheap (v8 compile ~11 ms main thread); executing the module
tops is not. WebGL contexts alive on the menu: **3** (game canvas, `tankCorner` (never drawn on the menu, AUDIT P6), and the
shared view renderer for the car card, cargo circle, road card and showroom).

Software GL for scale only: the same load takes 9.4 s at 1x (SwiftShader context creation ~0.7 s each, first frame 1.6-2.6 s).
That is the container, not the game.

## 2. MENU FRAME RATE (JavaScript per frame, GL=stub, 3 s windows, frames pumped by hand)

| Screen | JS ms/frame (mean) | renders/frame: draw calls, triangles |
|---|---|---|
| first menu screen | 0.6-0.95 | shared renderer x2 (car card + cargo circle): 20 calls, 1.3k tris each |
| after 6 level steps / Races tab / road card | 0.2-0.4 | x1: 14-27 calls, 0.7-1.8k tris |
| showroom cards (stills done) | 0.1 | none |
| showroom full view (live car) | 0.3-0.5 | x1: 16 calls, 1.8k tris |
| Cosmetics screen | 0.25-0.55 | x1: 40 calls, 0.8k tris |
| car lot (garage) | 1.4-7.2 | game canvas: 399 calls, 14.9k tris (358 / 13.5k at 390 wide) |
| **Car ideas lot** | **5-9** (x4 CPU = 20-35 ms) | game canvas: **955 calls, 38.4k tris, 1,242 geometries** at 1100x650; 221 calls, 9.0k tris, 503 geometries at 390x844 |

Same at pixel ratio 1 and 3 (the main canvas is capped at 1.5 on touch, views at 2; pixel cost is GPU and not measured).
Ideas lot: one **page of 22 ideas** is built at once (of 70 ideas, `PAGE = 22`), 11 programs. Allocation 7-37 KB a frame
(three.js matrix inverts): harmless. Nothing is drawn twice for no reason: the car and the cargo turn all the time, so
"render only when something moved" would save nothing; shadow maps are not used; the view renderer is shared (good).

**Not measurable here but suspicious:** under software compositing the menu ran at ~1 frame a second until the stage
picture (1920x854 JPEG, `stage-drift` 24 s infinite transform, plus `menu-sweep` and `start-pulse` (an infinite `filter`
animation)) was hidden: 3 frames in 3 s became 68. On a real GPU this is probably fine, but those three infinite CSS animations
keep the compositor busy on a menu that is otherwise still: **check on a phone**.

## 3. SHOWROOM ENTRY (JS-only, median of 3; handler = the key's synchronous time, worst = the worst frame after it)

| Step | 1x: handler / worst frame | 4x: handler / worst frame |
|---|---|---|
| first key (audio set-up) | 24 / 6 ms | 68 / 7 ms |
| G: showroom opens | 211 / 417 ms | 961 / 374 ms |
| Enter: full view | 14 / 118 ms | 49 / 513 ms |
| Right: next car | 90-118 / 9-28 ms | 505-768 / 34-141 ms |
| C: Cosmetics | 10 / 14 ms | 13 / 32 ms |

Building a car model (`makeShowCar`, wheels, plates, patch): p50 3.4 ms, p95 12, max 64 ms (Junker); 41 cars sum 239 ms; the 70
ideas p50 4, max 26 ms (Circus Wagon 212 meshes). **So the model build is not the hitch.** A CPU profile of the car switch puts
**`fitLine` (render/fitline.js) at ~150 ms self time at 1x**: it shrinks the Drive button's font half a pixel at a time and reads
`scrollWidth` after each write, a forced reflow of the whole showroom per step; `fill()` (card DOM) is 155 ms of the open.
Programs on the shared renderer: 4 after the menu, 8 after a warm-up of four cars.

**Warm-up experiment** (throwaway script in the page, `requestIdleCallback`: build 4 cars, `renderer.compile`, draw once,
materials kept; 0.3 s of idle slices at 1x, 0.8 s at 4x): JS-only, no change to the car switches (110 vs 110 ms) or Enter
(118 vs 95); G worst frame 417 -> 164 ms (partly JIT). Under SwiftShader the GL time inside G dropped 372 -> 24 ms and the
worst frame 683 -> 164 ms; per-car switches and Enter unchanged. So idle warm-up helps the **first opening** (programs, JIT),
not the repeated switches, whose cost is DOM and reflow. The first `canvas.toBlob` of a browser took 1-2 s here (2D encoder
start under software GL; excluded from the table, not believed to exist on a phone).

## Ranked findings

1. **Everything loads before the menu** (87 levels, 33 themes, 24 idea files, all cargo, ~866 KB br): 2.2 / 4.1 / 6.5 s at 1x / 4x / 6x CPU; 1.7 s at 1x of main-thread work after the bytes arrive.
2. **Showroom car switch costs 0.1 s (1x) to 0.5-0.8 s (4x) of JavaScript**, mostly `fitLine` reflow loops; opening the showroom 0.2 / 1.0 s.
3. **Car ideas lot: 955 draw calls and 38k triangles** for 22 ideas, 5-9 ms JS a frame (35 at 4x).
4. **First key press** starts 41 sound fetches and the AudioContext exactly when the player opens the showroom.
5. Three WebGL contexts on the menu, one never drawn there; three infinite CSS animations on the menu (phone effect unmeasured).

## Plan, in the order I recommend

| # | Change | Saving (own numbers) | Risk | Effort |
|---|---|---|---|---|
| 1 | `fitLine`: compute the size once (measure the text, or binary search), not 0.5 px at a time with a reflow each | ~100-150 ms a switch at 1x, ~400+ at 4x | render only, none for the replay hash | S |
| 2 | Themes lazy: `render/themes/index.js` `THEME_SCENERY` as dynamic imports, loaded when a level is picked / starts | ~72 KB br, part of the 1.7 s eval | render only, not in `logicFiles` | S-M |
| 3 | Idea models lazy (makeShowCar's idea path) and cargo models lazy per item, preloaded in idle | ~69 + 46 KB br | render only | M |
| 4 | Idle warm-up after the menu shows: compile the common materials, build the player's car, prefetch (fetch, not decode) the 41 sounds | first showroom open worst frame 683 -> 164 ms (software GL); unknown on a real GPU | none (render/audio) | S |
| 5 | Ideas lot: fewer draw calls (merge static bay boxes / lines, instance the signs), smaller page on phones | 955 calls -> est. 400-600 | render only | M |
| 6 | Level manifest + lazy level JSON (menu needs id, name, tip, clock, laps, theme) | 68 KB br, JSON parse | **`levels.js` is in `logicFiles`: editing it changes the `logic` hash once and refuses every recorded replay**; do it in one deliberate commit with the version bump, never alongside others | L |
| 7 | Check the CSS infinite animations and the stage picture on a phone; pause them when a sheet or the showroom covers the menu | unknown | none | S |

Skipped as not worth it: a pixel-ratio cap on phones (main canvas already 1.5, views 2, and the menu's JS cost does not depend on it),
render-on-demand for the static menu (the car and cargo turn continuously).

**Should it preload the showroom in the background?** A small idle warm-up (row 4) is cheap and worth having, but it is not the
fix: it removes only the first-opening compile, and the repeating cost is the `fitLine` reflow (row 1). Do not pre-build all the
cards (41 cars x ~5 ms is fine, but each card is a draw, a PNG encode and DOM). The bigger win for "the menu is slow" is
rows 2-3 (load less before the menu).

## Not measured

A real GPU or phone: shader compile, texture upload, rasterising, compositing of the stage picture and CSS animations, real
fps; the audio decode time (off thread); the tank corner's cost; a real CDN (brotli level, HTTP/2 push, latency); a
quiet machine (the run shared a loaded host); the Evil side; a cold Vite-less phone cache with the V8 code cache; savings of
rows 2-3 are estimates from compressed sizes, not from a built lazy version.
