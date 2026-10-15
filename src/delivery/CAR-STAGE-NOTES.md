# The car stage: a cheap per-theme scene for the selected car (investigation + prototype, 15-Oct)

The owner: "a cheap, interchangeable scene for the selected car ... both the Tall view (desktop) and the smaller mobile view
... a 'frontend' for each theme". Branch `claude/car-stage`, CHECKLIST 347. PROTOTYPE, OFF unless `?stage=` is in the address.

Try it: `index.html?stage=level` (the picked level's theme), `?stage=vegas`, `?stage=vegasNight`, `?stage=alpine`,
`?stage=steelworks`, `?stage=city`, `?stage=default` (the plain studio); `&side=evil`; `&stagequality=low|high`;
`&stagelog` prints the cost in the console (`&stageswap=<car>&swapat=<ms>` also switches car and logs the frames after).

## 1. Inventory: where the selected car is shown big today

| Where | Code | Backdrop today | Shapes it must serve | How it renders |
|---|---|---|---|---|
| Start screen car card | `render/menustage.js` drawCar / showCarModel | flat `#f2f2f2` (CSS), no floor | desktop Tall 326 x 420 CSS px (1280x800 menu, right column); phone row 192 x 69 (390x844, the car row is 92 px tall); Mi Pad between | the menu's ONE shared renderer (`modelviews.js sharedRenderer`, offscreen canvas, alpha) renders a `standView`, copied into a 2D canvas in the card each frame (`drawViews`) |
| Showroom full view (desktop + phone sheet) | `render/showroomview.js` | CSS gradient `.sr-backdrop` + a soft floor patch + shadow (canvas gradients) | wide right-hand stage; phone `min(40vh, 340px)` | same shared renderer, its own loop, copies into `.sr-live` canvas; switch draws the new car in the same task (the Mi Pad flicker fix, CHECKLIST 303) |
| Showroom list cards | `render/showroom.js` + `carstill.js` | CSS card colour | many small cards | STILLS: drawn once via shared renderer, encoded to blob URL (`drawStill`) |
| Cosmetics screen | `render/cosmeticsui.js` | as the showroom | as the showroom | reuses `ShowroomView` (also()) |
| Pack reveal / What's inside / Shop / Jim's | `packs.js`, `packcontents.js`, `shop.js`, `jimshop.js` | card art (CSS) | small cards | stills (`carstill.js drawSoon`, stock car) |
| Unlock cinematic (new car, key, ECU) | `render/unlockcine.js`, `ecucine.js` | black scene, THREE.Fog, dark floor, glow pool | full screen | its OWN WebGLRenderer and canvas |
| Car lot (Garage) | `render/garage.js` | `0x2b3342` scene, lot geometry | full screen | the GAME's renderer (`scene.js`) |
| Model editor stills | `delivery/modeleditor.html` | grid floor | editor | its own |

The start-screen car card is the one the owner means ("the selected car", Tall view on desktop, the small row on a phone): that is
what the prototype dresses. The showroom full view is the natural second customer (same shared renderer, same view shape logic).

## 2. Options (measured on this machine: headless Chromium, software GL; JS ms from the game's headless boot on one core)

Plain card (today): 14 draw calls, 1,764 triangles (the Commuter), 7 shader programs on the shared renderer (the cargo circle's
included), no textures of the card's own. All rows below are what a stage ADDS to that.

| Option | Draw calls | Triangles | New shader programs | JS build | Memory | Download (gz) | Tall vs small | Theme author adds | Car switch | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| **(a+b) RECOMMENDED: painted backdrop + tiny 3D set** (prototype) | +4 (ground, plinth, shadow, props merged into 1) | Tall/high: city +896, vegas +4,582, alpine +3,632, steelworks +6,480; phone/low: +368 / +1,340 / +2,052 / +856 | +1 (7 -> 8; the props' vertex-colour Lambert shares one already compiled) | first build 2 ms (city), 7-11 (vegas), 10-13 (alpine), 4-5 (steelworks) on a desktop core; phone/low 1-5 ms (except alpine 12). A car switch: 0 (props kept; resized in idle time) | geometry 67 KB (city) to 520 KB (steelworks) Tall, 24-160 KB phone; textures 80 KB (128^2 + 64^2 canvas patches, shared); backdrop 2D canvas <= 400k px (1.6 MB Tall desktop at 2x, 210 KB phone) | core 4.55 KB lazy chunk; stage files 391 B (city), 547 B (vegas), 475 B (alpine), 565 B (steelworks), lazy; main chunk +235 B | camera fitted per aspect: car low in a tall card with sky + skyline above, props pushed further back; wide card: props at the sides; low quality on a small card (2 props) | one file in `render/stages/` (a skyline painter, optional prop list) + one line in `STAGE_FILES`; or NOTHING (palette + the theme's own obstacles from themes.js) | backdrop is a separate canvas that is never cleared; the old car picture stays until the new one is drawn: no blank frame (stills + frame log) | low: no Fog (would recompile every car material), no new lights, no image files |
| (b) alone: painted backdrop + ground + plinth, no props (`?stage=default` is this) | +3 | +164 | +1 | 0.2-0.3 ms | 8 KB geometry + 80 KB textures + backdrop canvas | inside the core | as above | a palette only | as above | lowest; looks plain |
| (a) alone, everything in 3D (sky dome / backdrop quad with a 256^2 canvas texture, real THREE.Fog) | est. +5 | est. +5k | est. +1 per car material variant (Fog changes every program: the car's ~6 materials compile again: the load-time freeze risk) | est. as (a+b) | +256 KB texture | similar | the backdrop quad must be re-fitted per aspect | same | needs care | medium: compile cost on first show (claude/load-times) |
| (c) pre-rendered backdrop stills | EXCLUDED by the owner's rule: no image files at all (the game downloads under 100 KB); not evaluated further | | | | | | | | | |
| (d) the theme's real scenery builder cut to a short road | city scenery: 7-8 meshes in sight, 21k-62k triangles in sight (`.city-budget-check --report`); Vegas ~21 in sight, ~117k (CHECKLIST 331) | as left | the scenery's own materials and textures (city 256^2 atlas; steelworks/metro several) | tens of ms (laid out along a Track) | MBs | the theme's whole file: city 10.5+8 KB, vegas 13+8 KB, alpine 22+5 KB, steelworks 16+8 KB gz | the camera would look down a road; poor in a tall card | nothing (reuses), but needs a fake `Track` / `LEVEL` | heavy rebuild per theme | HIGH: the builders read `Track`, `LEVEL` and road.js helpers (global level state); the menu would build a level's worth of scenery |

Not measured (honest): real device frame times, the backdrop's 2D paint time (virtual time in the picture runs makes page ms
meaningless; it is a few dozen fills, done only on resize / new car / new theme), GPU memory as the driver counts it.

## 3. Recommendation and why

(a+b): the sky, haze and skyline painted in code on a 2D canvas UNDER the card's picture (no GL cost at all, crisp, repainted
only when the shape changes), and a tiny 3D set drawn with the car: a ground disc fading into the haze, a plinth in the theme's
road colour, the car's shadow, and the THEME'S OWN OBSTACLE MODELS merged into one vertex-coloured mesh, faded toward the haze by
distance (fog without THREE.Fog). It costs +4 draw calls and +1 shader program, nothing on a car switch, and a theme with
`obstacles` in themes.js gets a stage with no file at all. It is the only option that reads clearly at 192 x 69 on a phone and
fills the Tall card without looking empty.

## 4. The interface

```js
import { makeStage, cardStage, stageFile, palette } from './render/carstage.js';
const stage = makeStage(themeId, { evil, quality: 'high' | 'low' });   // 'off' = no stage (the caller skips it)
stage.attach(view);          // a modelviews.js view { scene, model }: set added, shadow on the turntable, lights recoloured
stage.frame(camera);         // per frame (cheap): camera fitted to the car and the picture's aspect; props placed for it
stage.paint(canvas2d, camera, cssW, cssH); // the backdrop, only when size / horizon / theme changed
stage.detach(); stage.dispose(); stage.stats;
// the card glue: cardStage(pictureEl).sync(view, theme, evil) after each change; .release(view) before a view is given back
```

A theme's file (`render/stages/<name>.js`, one line in `STAGE_FILES`, lazily imported like `THEME_FILES`):
`export const stage = { skyline(g, w, h, horizonY, pal, rnd, css) { ...2D canvas drawing... }, props: [[kind, side, depth, turn, scale, box], ...] }`.
Variants (vegasNight, steelworksNight, alpineDusk) share their scenery's file and take their colours from themes.js (`night` lights the windows).

Which theme applies (options): (1) the picked level's theme: RECOMMENDED (the card sits beside the level card; changes as you
browse levels; free); (2) the car's own "home" theme (needs a new field per car, 221 cars); (3) the player's choice in Options
(one more setting; good as an override later); (4) a rotating default (pretty, but unrelated to anything). The prototype does
(1) with `?stage=level` and a forced theme with `?stage=<theme>`.

Low quality: `quality: 'low'` (2 props) is picked automatically for a picture under 120 px tall (the phone row); `'off'`
returns the plain card. An Options switch would set it.

## 5. Open questions for the owner

1. Theme source: the picked level's theme (recommended), the car's home, or a choice in Options?
2. Evil side: the prototype darkens the sky toward red and dims the light; or should Evil use the theme's night look?
3. The plinth: keep the dark turntable disc, or a ground-level patch only (lighter, less "showroom")?
4. Props: theme obstacles beside the car (the Tall card shows 5, one cut by the frame's edge in front; the phone 2). More, fewer, none?
5. Extend to the showroom full view and the Cosmetics screen (same renderer, same API)?
6. Switching side rebuilds the stage (a few ms of props on a desktop core, maybe 20-60 ms on the Mi Pad): acceptable, or keep the
   props and recolour only (a small follow-up)?
