# Mall Dash: a theme that is all tunnel (design + feasibility draft, 15-Oct)

The owner's idea: an ABSTRACT theme, a level set wholly inside a SHOPPING MALL: no shoulders, no traffic, the road a
polished mall floor, almost the whole level inside the tunnel feature. Two questions: (a) can "tunnel" be a THEME with a
scenery kit of its own (shop fronts, zones) instead of a feature bolted on a road theme; (b) can the tunnel vary in
HEIGHT by zone and be WELL LIT the whole way (low corridors, tall atriums).

File paths are relative to `src/delivery/` unless said. Line numbers are from `main` at e7386e5 (v1.1.134).

## Verdict (6 lines)

1. POSSIBLE, and cheaper than a terrain theme: the mall is one straight-ish shell plus instanced dressing; no terrain, no sky dome.
2. HOW HARD: medium. Slice 1 (a lit corridor, seen) is a day; slice 2 (heights by zone) is two days; slice 3 (the kit, level, obstacles, cargo, picture, checks) a week, like Tuscany or Desert.
3. BIGGEST OBSTACLE: the chase camera. Today's tunnel camera sits 5.5 m up (CONFIG.tunnel.camHeight): over a 4 m ceiling it looks at the roof's top and sees nothing (SEEN: `lowcam55.png`). A per-tunnel camera height plus a clamp under the ceiling fixes it (SEEN working at 3 m under a 4 m ceiling, `low.png`).
4. SECOND OBSTACLE: everything that reads `LEVEL.tunnels` as "dark, foggy, headlights on" (render/tunnel.js syncTunnel, the Tunnels gimmick card, the "Tunnel! Lights on." message, the low-sun shadow rule): a `lit` flag on the tunnel (or on the theme) has to turn all of that off.
5. RENDER-ONLY: the theme is render-only except themes.js (a logic file by import: collision.js and others import it; every theme so far changed it too), levels.js (the hidden-level line), the level JSON and the words. The replay hash moves as it did for Chianti Run and Dakar Dash: no new kind of change.
6. RECOMMENDED FIRST SLICE: build (b) first as a generalisation of render/tunnel.js (`height`/`profile`, `lit`, per-tunnel camera), with a `mall` theme that draws NOTHING outside the tunnel and two shop-front kinds inside it, as a hidden level `?hidden=mall-dash`. The spike on branch `claude/mall-spike` (not pushed) is most of that already.

## 1. How the tunnel feature works today

### Where a tunnel is declared

- A level's `"tunnels": [{ from, to }]` (levels.js:277-278 header; levelSchema.js:211: shape 'stretch', `minSpan: 60`, rule `clearOfExits`, help "The road under cover, dark but for its lamps").
- Validation in track.js:1005-1008: `from < to`, `from >= 30`, `to <= length - 30`, at least 60 m long, no exit's ramps within 20 m. track.js:1171: no narrowing ("w") overlapping a tunnel; track.js:1285-1286: a TANK RAGE target in a tunnel is a problem.
- `Track.tunnel(s)` (track.js:519-530): 0 outside .. 1 well inside, fading over `CONFIG.tunnel.edge` = 40 m at each portal (config.js:1347-1358), main road only (`isMain`). There is no limit on how many tunnels a level has, nor on their length; two may touch or overlap (`most = max`): nothing forbids a tunnel from 30 to length-30, i.e. the whole level but the start and finish straights (SEEN: the spike level is 2000 m with one tunnel 30..1970 and `delivery-levels-check`-style loading was fine in the browser).

### What render/tunnel.js builds (tunnel.js:25-102, `build`, on `Game.onLoad`)

- Cross-section: a rectangle. `H = CONFIG.tunnel.height` = 8.5 m (config.js:1352) for every tunnel in the game: there is no per-tunnel height today. Width: `Track.lo(s) - 0.3` to `Track.hi(s) + 0.3` (tunnel.js:43), so the walls stand just outside the SHOULDERS (lo/hi include the shoulder: track.js:483-493).
- Walls: one flat strip per side, one quad per 4 m, foot on the road, top at `y + H` (tunnel.js:46-59), MeshLambert `look.wall`, DoubleSide. A pale "tile band" is the same strip remapped to 0.9..2.1 m, scaled by 1.001 so it is not coplanar (tunnel.js:60-67).
- Ceiling: `buildStrip(t.from, t.to, lo, hi, H, 4)` (tunnel.js:69), a constant height (road.js:19-37: `y` is a number, not a function).
- Lamps: one InstancedMesh of 0.5 x 0.12 x 2.2 m MeshBasic (unlit, "emissive") boxes every `lampEvery` = 12 m at `H - 0.1` (tunnel.js:71-80). No real lights: ONE draw call for all lamps of a tunnel.
- Portals: at each end a lintel box `w + 2*PIER` wide, `LT` tall, over the opening, and a pier box each side (tunnel.js:82-100). A theme's `tunnel.lintel` / `tunnel.pier` make them slighter (autumn's covered bridge: themes.js:219 `lintel: 2.4, pier: 2.6`).
- Colours: `look` = defaults (grey concrete) overridden by the theme's `tunnel: { wall, tiles, roof, lamp, face }` (tunnel.js:34; themes.js:122, 127, 133, 136, 139, 150, 152, 170, 175, 201, 219).
- Draw calls per tunnel: 2 walls + 2 bands + 1 roof + 1 lamps + 2 x (1 lintel + 2 piers) = 12. Triangles: about (length/4) x 2 x 5 strips, i.e. a 2000 m tunnel is about 5,000 triangles. Trivial.

### What syncTunnel does every frame (tunnel.js:105-127, called in main.js:424 after syncRoadside's fog bank)

- `inside = Track.tunnel(Player.s)`; the fog is pulled in from the usual 120/520 m to `near` 10 / `far` 140 m (config.js:1349-1350) scaled by `inside`, never less than a fog bank already has (tunnel.js:116-117); `scene.background` lerps from the sky to `CONFIG.tunnel.color` 0x0c0c10 (near black) and the fog takes that colour (tunnel.js:118-119). That IS the darkening: the tunnel's dark is fog, not lighting. The HemisphereLight and sun (scene.js:25, 45) stay as the theme's `light` set them (scene.js:51-58, applied in road.js:797).
- Headlights: `setHeadlights(inside > 0.3)` unless the theme already has `headlights: true` (tunnel.js:30, 120; headlights.js:1-60: two real SpotLights on the player's car, always in the scene and only switched visible, plus flat beam quads under traffic).
- Sound: `Sound.echo(inside * T.echo)` (tunnel.js:121; audio.js:463-466: a delay send).
- Leaving: sky and fog put back (tunnel.js:122-126).
- Sky/ground blending by zone (`syncZones`, road.js:778-789) is separate and only for themes whose `scenery === 'zones'` (coast, safari: road.js:218-227 `zonesOf`). It lerps `scene.background` and the ground mesh colour per zone. In a tunnel syncTunnel runs first (main.js:424) and syncZones after (main.js:428), so on a zones theme the zone sky would overwrite the tunnel's dark: a mall theme should NOT be a 'zones' scenery; it reads `LEVEL.zones` itself as backlot.js:33-35 and halloween.js:377 do.

### Camera in a tunnel (scene.js:120-139 `tunnelCamera`, 141-167 `updateCamera`)

- The chase camera is normally `camBack` 14 m behind and `camHeight` 11 m up (config.js:1173-1175), aiming 10 m ahead of the car at +1 m.
- Inside a tunnel it eases (smoothstep over `camEase` = 35 m before the portal) to `CONFIG.tunnel.camHeight` 5.5 m and `camBack` 12 m (config.js:1353-1355, scene.js:151-152). Measured from `Player.s - baseBack` (scene.js:148), so the camera is already down before its own position passes the portal.
- There is NO collision with the ceiling and NO clamp: with an 8.5 m ceiling and a 5.5 m camera it never mattered. With a 4 m ceiling, the camera at 5.5 m is above the roof: SEEN in `/tmp/mall-draft/shots/lowcam55.png`: the roof's top face fills the frame, the car is not visible, a ghost pickup's head pokes through the roof. So a low mall corridor needs (i) a per-tunnel camera height and (ii) a clamp `camHeight <= ceiling(s_cam) - margin` (the spike does both: scene.js diff on `claude/mall-spike`; SEEN working in `low.png`, 3 m camera under a 4 m ceiling).
- The near plane is 0.5 m (scene.js:60): a 3 m camera under a 4 m roof does not clip the roof.

### Other logic that touches tunnels

- game.js:441-444: a message 'tunnel' ("Tunnel! Lights on.", messages.json:96) on entering.
- gambles.js:641-645: in a tunnel the player is "in shadow" for the low-sun gamble (fine: a mall has no low sun).
- gimmicks.js:814-822: the Tunnels card on the Gimmicks page says dark, lamps, headlights, 140 m sight, echo, camera drops. Words would be wrong for a lit mall: a `lit` tunnel needs its own card text or the card hidden.
- levelinfo.js:41: "Tunnels" listed on the road card. editor.js:568: the editor draws tunnels as a stretch.
- Scenery files keep their things out of tunnels: extras.js:667-711, backlot.js:37-239, venice.js:50-225, autumn.js:33-643, halloween.js:59-377, favela.js:22, 208-212, wildwest.js:26, 287-291, desert.js:31, tuscany.js:26, rice.js:24, moon.js:46, seabed.js:40, port.js:26, fallout.js:36, volcano.js:24, themepark.js:32; road.js:1622 and 3485 (city things). Several themes DRESS a tunnel: backlot.js:219-239 draws a spaceship corridor INSIDE its tunnel (the precedent for interior dressing), venice.js:168-192 a sotoportego, autumn.js:545-640 a covered bridge, favela.js:208-212 and wildwest.js:287-291 rock over it, halloween.js:375-377 a hill. So a theme file adding shop fronts inside a tunnel is the established pattern.
- Traffic, hazards, mysteries, weather, wind: none read tunnels (grep: hazards.js, traffic.js, mysteries.js, storm.js, gambles.js' crosswinds have no tunnel test). Rain/snow (road.js:3587-3588 `rainfall`/`snowfall`) fall through a roof; a mall theme simply has neither.

### Limits

- Length: none; one tunnel per level: no (a list); nested/overlapping: allowed by `Track.tunnel` (max), but tunnel.js draws BOTH shells (double walls, z-fighting where coincident); touching end to end draws two portals back to back (a lintel over the road at the join: usable as a "doorway" between zones, but a wall of 1.2 m x LT over the road).
- Whole level: allowed from 30 m to length-30 m. The start and finish 30 m would be outside: the entrance hall and the loading dock (the drop) can be the portal faces.
- Draw calls / triangles: trivial for the shell (12 calls, a few thousand triangles per tunnel). The cost of a mall is all in the dressing, see 3.
- Mobile: PIXEL_RATIO 1.5 on a coarse pointer (scene.js:16-18); nothing else is reduced per device. A mall's instanced kit is as cheap as any theme's; its risk is overdraw of large pale flat surfaces, which is nothing on a GPU.

## 2. How a regular theme is defined, and what changes for a theme that is all tunnel

### A theme today (Tuscany as the example)

1. themes.js:206-209: `tuscany: { sky, ground, road, scenery: 'tuscany', line, terrain: {...}, target: {...}, light: {...} }`. Optional flags seen across themes: `unmarked` (no lane lines, ruts instead: road.js:1078-1096), `lit`/`headlights`/`night`, `rain`/`snow`, `elevated`, `fogColor`, `channel`/`river`, `tunnel` colours, `sets` (zone set-pieces), `zones` (default zone list for a 'zones' scenery), `washboard`, `soft`, `median`.
2. render/themes/index.js:18-41: `tuscany: () => import('./tuscany.js')` (dynamic import, loaded when a level needs it: index.js:9-15).
3. render/themes/tuscany.js: `export const tuscany = ({ instances, sideStrip, add, flat, offRoads, beside, inJunction, cube, levelGroup }) => { ... }`, the signature road.js:3582 passes (also `theme, buildStrip, standsClear, clearOfRoads, exits, tube, cone, elevatedRoad`). Everything seeded from the level id (tuscany.js:21-23), instanced (one draw call a kind), placed by `clear`/`offRoads` tests.
4. render/themes/tuscanyModels.js: pure three.js models with no game state (the obstacles merged into one mesh + a shadow disc each, tuscanyModels.js:28-33), exported as `TUSCANY_OBSTACLES` and `TUSCANY_CARGO`, registered in obstacleModels.js:9, 1189 and cargoModels.js:20, 600.
5. Obstacles: themes.js:230-256 `OBSTACLES.tuscany = { crate: 'wineCrates', bale: 'hayRoll', cone: 'terracottaPot' }`; each new kind in config.js:658 (same damage/speedKept as what it replaces), collision.js:278 (`SIZE[kind] = SIZE[like]`), gimmicks.js:53 (JUNK, JUNK_NAMES) and :1144 (DRESS card row), obstacleText.json:40, levels.js:171 doc comment. `scripts/.obstacles-check.mjs` proves same cost and box.
6. Cargo: cargo.js:54 / :105 (the Good and Evil items; Evil has three `states`), cargoText.json:37 / :81, model in a theme cargo file (desertCargo.js:1-6 is the pattern, `userData.animate(t)`, Evil `userData.setState`), spread into cargoModels.js:601. cargo.js `deal()` counts hidden levels' cargo as taken (CHECKLIST 284).
7. Level: `levels/<id>.json`, imported in levels.js:528-529 and put in `HIDDEN_LEVELS` (levels.js:631-635); words in levelText.json:643-650 (name, good/evil description, cargo); CINE camera for the menu picture in scripts/shots.mjs:100 and the picture made with `shots.mjs --levels=<id> --write` (both JPEG sizes in levelshots/).
8. ThemeLevels / menu: a hidden level is in no menu list, THEME_LEVELS or INSERTED_AT (CHECKLIST 281); it banks nothing.
9. Per-zone variation: a theme reads `LEVEL.zones` ({ id, from, to, scenery, ground, sky, sea }: levels.js:186-188; Track.zoneAt track.js:578-579) itself, falling back to equal shares (backlot.js:33-35). The player is welcomed into each zone by id (messages.json:128 "zones").

### What changes for a whole-world-is-the-tunnel theme

| Thing | Today | For the mall |
|---|---|---|
| Ground | `PlaneGeometry(9000)` in `theme.ground`, drawn first, no depth write (road.js:1255-1266); `ground: null` draws none (space) | `ground: null`? No: outside the tunnel at the start/finish 30 m something must be under the road. Keep a ground in the floor's colour; nothing is seen of it inside. Or draw the entrance apron in the theme file. |
| Terrain / hills | `theme.terrain` (road.js:1268) | none; the level is flat or gently graded (a car-park ramp zone can use `grade`) |
| Sky | `applySky(theme.sky)` (road.js:796); the tunnel lerps the background to near-black | `sky` = the mall's haze colour (a warm off-white): what the fog fades to at 520 m down a long hall. The ceiling is the tunnel roof. A `lit` tunnel must NOT darken (tunnel.js:112-119 skipped: the spike does this at tunnel.js syncTunnel) |
| Fog | pulled to 10/140 m in a tunnel | left at the usual 120/520 (or a theme `fog` of 200/700 to make halls read long). Volcano.js:240 notes shader fog coupling: a mall has no such shader |
| Shoulder | `LEVEL.shoulder ?? CONFIG.shoulder` 3.5 m (track.js:19; config.js:9); levelSchema.js:146 allows 0 | a LEVEL field: `"shoulder": 0` works (SEEN: the walls stand at the lane edges + 0.3 m). With no shoulder the shoulder meter never runs; fine. Side note: pickups placed on 'left'/'right' shoulders have nowhere to stand; use lanes only |
| Traffic | `trafficCount` / `oncomingCount` (traffic.js:1668-1669; schema min 0) | `"trafficCount": 0, "oncomingCount": 0, "flow": "north"` (SEEN: nothing turned up). Rivals still work (Dakar's `rivals`) |
| Road surface | `theme.road` colour, MeshBasic, or MeshLambert when `theme.lit` (road.js:799) | polished floor: see below |
| Lane markings | `theme.line` / `centre` colours; `unmarked: true` hides them and draws ruts (road.js:1078-1096) | `line`/`centre` set to a tile-seam tone a little darker than the floor (SEEN: subtle dashes, `low.png`), or `unmarked: true` with the ruts suppressed (ruts are only drawn when unmarked: road.js:1081-1096 would draw two dark strips per lane: NOT wanted; so keep lines, recoloured) |
| Road width | lanes x CONFIG.laneWidth + shoulders | 2 or 3 lanes, `shoulder: 0` or 1 m (a kerb strip of planters); the walls follow `Track.lo/hi` so they fit any width |
| Scenery outside | the theme's file draws the land beside the road | the mall's file draws ONLY inside the tunnel(s) plus the entrance apron: `scenery: 'mall'` with no THEME_FILES entry draws nothing (road.js:3576-3583: `themeLoaded` is true for a name with no file, `THEME_SCENERY[name]` is undefined). SEEN in the spike |
| Headlights | tunnel.js:120 on at the portal | a lit tunnel never calls setHeadlights; theme has no `headlights` |
| Light | theme.light (scene.js:51-58) | bright hemisphere: `{ sky: 0xffffff, ground: 0xd0cabf, ambient: 1.6, sun: 0xfff8ee, sunlight: 0.9 }`: a flat, shadowless indoor light. The SEEN spike look is too uniform (walls, roof and floor all one pale tone): the kit needs CONTRAST from vertex colours and darker shop interiors, not more light |
| Zones | only 'zones' sceneries blend sky/ground | the mall file reads `LEVEL.zones` for its halls (height, palette, kit) |

### The polished floor, cheaply

No real reflections (a planar reflection is a second render of the scene: never on a phone). Three cheap tricks, in order of cost:

1. A vertical GRADIENT in the floor's vertex colours along s and across lat (a brighter band down the middle of each hall under the lamps, darker at the walls): one strip mesh with `vertexColors`, no texture. Zero per-frame cost.
2. Fake "reflections" of the ceiling lamps: a second InstancedMesh of the lamp boxes mirrored to y = +0.02 on the floor, stretched 3x long, MeshBasic with `transparent: true, opacity: 0.25, depthWrite: false`, additive. One draw call. Reads as a shine on the floor as the car passes (the lamps are static, so the "reflection" sits still: on a polished floor seen from a fixed chase camera that is right).
3. A tile texture drawn on a canvas (256 x 256, two tones of stone and a 2 px grout line, repeat 8 m), `MeshLambertMaterial({ map })`: a mall floor has visible tiles; this does more for "mall" than any shine. 256 KB of texture memory.

Skip environment maps and MeshPhysical: the rest of the game is Lambert/Basic, and a shiny floor under flat-lit cars would look wrong.

## 3. The Mall theme, a concrete draft

Everything indoors is laid out from the level's `zones`; the tunnel's height follows the zone (section 4). Scale: the road is 2 lanes = 7 m + 0.6 m; a mall corridor is 8 to 12 m wide between shop fronts, so the shop fronts stand at `beside(side, s, 0.3..1.5)`, their doors and signs facing the road. All instanced (one InstancedMesh per kind and colour) and seeded from the level id, as every theme.

### Zones (8), with height and look

| # | id | s (of 3000 m) | ceiling | look |
|---|---|---|---|---|
| 1 | entrance | 0-180 (outside) | portal face 9 m | the entrance apron: a canopy on columns, "MALL" letters on the lintel, bollards, planters, a taxi-rank sign, trolley bays. The 30 m outside the tunnel |
| 2 | fashionrow | 180-700 | 4.5 m | low corridor, white ceiling grid with recessed panel lights, glass shop fronts with mannequins in windows (owner's call, see below), clothes racks, sale banners, warm white/cream + one accent per shop |
| 3 | atrium | 700-1200 | 14 m | the central atrium: a glass roof (a lattice of mullions, the sky colour through it: panes are MeshBasic, slightly blue), two gallery levels along both walls (balustrades, shop fronts upstairs), a fountain in a median island (if the level has a `median`) or planters, palm trees in pots, hanging banners, a glass lift shaft |
| 4 | foodcourt | 1200-1650 | 7 m | a food court: counters with menu boards (canvas text), tables and chairs in rows along the walls (instanced), hanging pendant lamps in orange/red, a bright yellow-red-green palette, a "WET FLOOR" A-frame obstacle row |
| 5 | escalators | 1650-1950 | 10 m, stepping | the escalator hall: escalators climbing both walls (an instanced step mesh whose instances slide: the ONE animated thing, 60 instances, one matrix update per frame), a mezzanine bridge over the road (a box across at 5 m: NOT a low bridge, no collision), chrome and glass |
| 6 | electronics | 1950-2350 | 5 m | darker ceiling (charcoal), shop fronts lit from inside with screens (canvas textures cycling? no: static), neon strip signs in cyan/magenta (MeshBasic), a games arcade with cabinet rows |
| 7 | kidszone | 2350-2650 | 8 m | a play zone: a ball pit (sphere instances in four colours), a slide, giant soft blocks, a carousel (the themepark's model), candy colours, a balloon arch over the road |
| 8 | carpark | 2650-3000 | 3.2 m, ramp | the car-park ramp finale: concrete columns, yellow-black chevrons, painted bays along the walls, "EXIT" signs, a `grade` of -0.06 down to the loading dock; the last 30 m outside: the dock doors (the drop) |

Heights: a `profile` of [s, h] points per tunnel eases (smoothstep) between zones over 60-80 m, which read as the mall's "ceiling steps" (SEEN at the ramp, `ramp.png`). A STEP (a vertical face between heights) would need an extra quad; the ease looks better and costs nothing. The tunnel's `height` or `profile` is level data (the zone list says the height; the level writes the profile; or the theme file derives the profile from the zones' kinds: cleaner, no duplication, but then the camera code in scene.js must also know it: see 4).

### The shop-fronts kit (12 invented generic types, no brands)

Each shop front = one instanced box set: a facia (1.2 m tall band at 3 m, its sign a canvas texture), a glass plane (MeshBasic, pale blue, 40% opacity) with a door gap, a dark interior box behind it (so the glass has depth), and 1-3 "window dressing" instances. Signage: one canvas per shop TYPE (not per shop), 256 x 64 px, the name in a bold system font on the type's colour, with a simple glyph drawn in code (a coat hanger, a cup, a book, a shoe, a phone, a gift bow, a slice of pizza...). 12 textures x 256 x 64 x 4 B = 786 KB. Generic names, invented: "THREADS" (clothes), "SOLE MATES" (shoes), "BEAN THERE" (coffee), "PAGE TURNER" (books), "GADGET GROTTO" (electronics), "SPARKLE" (jewellery), "WRAP STAR" (gifts), "PIXEL PLAY" (games arcade), "SCOOP" (ice cream), "SLICE OF LIFE" (pizza), "PETAL PUSHER" (florist), "CUT ABOVE" (barber). The owner may rename them all; none is a real brand.

Mannequins: the owner's "no humans" rule (CLOUD-AGENT-README.md:87) is for CINEMATICS. Mannequins in shop windows are not humans, but they are human-shaped silhouettes: the exact thing the rule names for cutscenes. RECOMMENDATION: no mannequins in slice 1-2; in slice 3 propose faceless, featureless, one-colour dress forms (a torso on a pole, no head, no arms) in the fashion row only, and make it the owner's call. The rest of the kit avoids figures entirely: no shoppers, no staff; the mall is empty (after hours, or a race through a mall before opening: the level text can say so).

Other kit (all instanced): ceiling light panels (0.6 x 1.2 m MeshBasic white, every 8 m, two rows: ~700 instances per level, 1 call); pendant lamps in the food court (a sphere + a cord); skylight mullions in the atrium (cubes, 1 call); planters (a box + a green sphere canopy, 2 calls); benches (3 boxes, 1 merged geometry instanced); kiosks (a hexagonal counter with a canopy, 2 calls); bins; a fountain (a round basin + a glowing water disc + a cone of spray: 3 calls, one per level); escalators (handrail boxes + the moving step instances); directory boards (canvas, "YOU ARE HERE"); hanging banners (planes with canvas text, "SALE"); balustrades (post + rail instances); columns (cylinders, 1 call); the car-park's chevrons (a strip of alternating vertex colour, 1 mesh).

### Palettes per zone

- fashionrow: floor cream 0xe8e2d6, walls white 0xf4f1ec, ceiling 0xf8f6f2, accent per shop (plum, teal, mustard).
- atrium: floor pale grey marble 0xdcdad4 with a darker inlay band, walls 0xeeebe4, glass roof panes 0xbcd6ea.
- foodcourt: floor terracotta tiles 0xc9a27a, ceiling 0x3a3a3c (dark, pendant lamps), counters red/yellow/green.
- escalators: chrome 0xc8ccd2, glass balustrades, floor 0xd9d6cf.
- electronics: floor dark grey 0x44464c, ceiling 0x202226, neon 0x3ad8ff / 0xff4fd8.
- kidszone: floor soft-play blue 0x5fa8e8, ceiling white, primaries.
- carpark: concrete 0x8d8d8a everywhere, yellow 0xf2c21d, black bands.

### Budget vs Tuscany and Desert

CHECKLIST 281: Chianti Run 464 draw calls / 366k triangles (terrain 174k) at the start; CHECKLIST 284: Dakar Dash 420 calls / 408k (terrain 193k); Wild West 1000-1100 / 570k; rice 810-988 / 462k. A mall with no terrain, instanced kit of ~40 kinds x (1-3 calls) plus 12 shop-front materials: aim at 250-350 draw calls and under 150k triangles whole frame (the cars are 1-2k each, there is no traffic). The shell is 12 calls. Signage: 12 canvas textures of 256 x 64 (0.8 MB) + the floor tile 256 x 256 (0.25 MB): within the 256 x 256 rule.

## 4. The height-varying, well-lit tunnel variant (what to generalise in render/tunnel.js)

What the spike changed (branch `claude/mall-spike`, render/tunnel.js and render/scene.js, both render-only files; see the diff) and what the real version should be:

1. `heightOf(t, usual)` (new, exported): the ceiling height at s from `t.profile` [[s, h], ...] eased with smoothstep between points, else `t.height`, else `CONFIG.tunnel.height`. The real version: let a theme compute the profile from the level's zones (`theme.tunnelHeights(zone)`) OR keep it as level data in each tunnel; EITHER WAY track.js should not know (render-only). The camera needs it too: put `heightOf` in a tiny new render-only module (`render/tunnelshape.js`) imported by both tunnel.js and scene.js: the spike copied the function into scene.js because tunnel.js imports scene.js (a cycle).
2. Walls (tunnel.js:50-55): top at `y + hAt(q)` per sample. Done in the spike.
3. Tile band (tunnel.js:61): was computed from H; now from the foot. Done. For a mall the band becomes the skirting/kick plate (0..0.3 m) or is dropped (`look.tiles: null`).
4. Roof (tunnel.js:69): `roofStrip` with `y` a function of s (or extend road.js `buildStrip` to accept a function for `y`: one-line change, cleaner). Done as a copy in the spike.
5. Lamps (tunnel.js:76): at `hAt(s) - 0.1`. Done. For a mall: `look.lamps: 'panels' | 'pendants' | 'none'` per zone, drawn by the theme file instead (the tunnel's own lamps off: `look.lamp: null`).
6. Portals (tunnel.js:85-99): `H = hAt(end)`. Done. For the mall the entrance and the dock door want their own faces (`look.lintel/pier` already exist); the theme file dresses them.
7. `syncTunnel` (tunnel.js:105-127): a `lit` tunnel (or `theme.tunnel.lit`) skips the fog pull-in, the background darkening and the headlights, keeps a reduced echo (the spike: 0.6 x). Add to CONFIG.tunnel a `litEcho`.
8. Camera (scene.js:151-152): per-tunnel `camHeight` / `camBack` (the spike reads them off the tunnel; better: off `theme.tunnel` with the tunnel able to override), and a clamp `camHeight = min(camHeight, heightOf(t)(camS) - 1.0)`. SEEN: 3 m camera under 4 m, the car and the road ahead in frame (`low.png`); the 14 m atrium with the same 3 m camera (`atrium.png`) reads tall because the walls run up out of frame; a taller camera in the atriums (6-7 m) would show the glass roof: make `camHeight` a per-zone number too, eased like the height (the clamp already eases because the profile does). The aim point (scene.js:160-161, 10 m ahead at +1 m) is fine at 3 m; at 2.5 m it would feel like a bumper cam: keep corridors >= 4 m.
9. The lintel between touching tunnels: not needed when one tunnel spans the level with a profile (the spike uses one tunnel 30..1970).
10. Words and cards: gimmicks.js:814 Tunnels card `has: (l) => l.tunnels?.length` should ignore lit tunnels or get a "Mall halls" card; messages.json:96 the "Lights on" message skipped for a lit tunnel (game.js:443: check `LEVEL.tunnels` lit flag: game.js is logic; a one-line render-free check, or move the message to render).
11. Lighting of the car: the hemisphere + sun already light the car indoors; an indoor theme sets `sunlight` low (0.6-0.9) and `ambient` high so the car has no hard sun shadow side. No per-light real lights anywhere: the panels are MeshBasic (emissive-looking) boxes.
12. Track validation (track.js:1005-1008) is unchanged: from >= 30, to <= length - 30, >= 60 m.

## 5. Level draft: Mall Dash (hidden first)

- `levels/mall-dash.json`, `?hidden=mall-dash`, in `HIDDEN_LEVELS` (levels.js:631-635), banks nothing, not in THEME_LEVELS / INSERTED_AT.
- Theme `mall`; 3000 m; 2 lanes, `flow: "north"`, `shoulder: 0.6` (a kerb strip for planters and A-frames: pickups and obstacles can then sit on 'left'/'right'); `trafficCount: 0`, `oncomingCount: 0`; segments: mostly straight with three gentle S-bends (curve 0.004) so the halls are not one line of sight, grade 0 except the car-park ramp (-0.06 over the last 250 m). The tunnel: `{ from: 180, to: 2970, lit: true, profile: [...the zones' heights] }`.
- THE ONE IDEA: a sprint through an empty mall before the doors open, the floor polished and the halls different heights; the player's problem is the FLOOR: it is slippery where it has just been polished (the level's `ice` patches, repainted as "freshly polished" wet-look shine: the autumn theme repaints `ice` as wet leaves, autumn.js: CHECKLIST 282 precedent) and the escaped shopping trolleys roll across the camber (the existing `trolleys` hazard: hazards.js:66-71, config.js:1490-1493, level field levels.js:319: made for exactly this, never used in a real level).
- Thematic gimmicks (a few, obeying the rules: never stop the car; counterplay for every bust; no new moving explodable obstacles): `trolleys` on three stretches (fashion row, food court, car park); `ice` polished patches with a "WET FLOOR" A-frame cone row before each (the counterplay: the sign is the warning); one `narrowing`? No: a narrowing cannot be in a tunnel (track.js:1171). Instead a `stopGo`? Stops the car: no. A `rival` courier ('opposite') is good: Dakar used two; here one, "Mall Cop" on a `golfcart`-like slow car would be funny but a rival is a racer: use the `minivan`. Mysteries and a `timePlus` or two as usual. No police, no cameras, no cargo trucks (no traffic to carry them).
- Themed plain obstacles (themes.js OBSTACLES, same box and cost as crate/bale/cone, like Tuscany/Desert): `crate -> boxStack` (a stack of delivery cartons on a sack truck), `bale -> trolleyRow` (three nested shopping trolleys, static: a wide low thing where a bale is), `cone -> wetFloorSign` (a yellow A-frame "WET FLOOR", light, speedKept 0.94: cone's numbers). Candidates kept back: a floor polisher (a round machine with a handle: good for `rock`-sized? rock costs 39 damage: too much for a mall), a planter (`barrier` box: planters as a slalom in the atrium would be a good `shoulderRows` use), a kiosk (bigger than any kind: scenery, not an obstacle).
- Pickups: cash in pairs and rows of three (the owner's rule), about 60 over 3000 m, a turbo before each long hall, a wrench, a mystery, a ghost in the trolley stretches, two timePlus.
- Cargo: Good `giftbox` "Wrapped Birthday Present" (a box with a bow that bounces; or reuse the christmas theme's `present`? that is an obstacle kind, not cargo); Evil `piranhas` "Pet-Shop Piranha Tank" (states: 'Circling', 'Snapping', 'Tank cracking'): a tank of water that sloshes, fish that go frantic, the glass starring. Both new in cargo.js + cargoText.json + a `mallCargo.js` as desertCargo.js.
- Rivals: one (see above) or none; recommended none for the first cut (the trolleys and the floor are the level) and `rival: 'opposite'` tried with `?rival`.
- Clock: `node scripts/level-clocks.mjs mall-dash --write` runs the clean run in the reference car (CONFIG.clock: 'sport', good x1.5, evil x1.15, minus 5 s per timePlus: config.js:1128) and writes `clock: { good, evil }`. Expect a clean run of about 95-110 s for 3000 m with the ramp, so about 150 / 115.
- Words (levelText.json): name "Mall Dash"; good: "A birthday present for the toy shop's party room, before the doors open. The floor is freshly polished, the trolleys are loose, and the car park is the only way out."; evil: "A tank of piranhas for the pet shop, and they are hungry. Skate the polished halls flat out, scatter the trolleys and take the car-park ramp on two wheels."
- Menu picture: shots.mjs CINE entry `'mall-dash': '&at=900&ff=1&cineup=6&cineside=left'` (the atrium: the glass roof and the galleries; the camera's usual out-and-up place is INSIDE a wall: cineout must be <= 0.5 or the picture is the back of a shop front, as the Mumbai note at shots.mjs:79 warns).

## 6. Feasibility verdict, slices, risks, owner decisions

### Slices

- Slice 1 (a day; the spike is 60% of it): generalise tunnel.js (`heightOf`, `roofStrip`/buildStrip with a function y, `lit`, lamps optional), scene.js per-tunnel camera + clamp, a `mall` theme in themes.js with a `render/themes/mall.js` that draws two shop-front types along both walls inside the tunnel (instanced facias, canvas signs, glass, dark interiors) and the ceiling panels; a hidden `mall-dash` level of 300 m-plus straight corridor, no traffic, shoulder 0.6. Checks: node --check, eslint, `delivery-levels-check`, `.schema-check`, stills at 3 places. SEEN target: a corridor that reads as a mall from the chase camera.
- Slice 2 (two days): the zone list with heights and palettes; the profile from the zones; atrium glass roof and galleries; the food-court and car-park kits; per-zone camera height; fog tuned; the Tunnels card/message made right for a lit tunnel; a draw-call/triangle count at three places vs Chianti/Dakar.
- Slice 3 (four to five days): the full kit (12 shop types, escalators moving, fountain, kiosks, benches, planters, banners, directory boards), the three themed obstacles (+ config/collision/gimmicks/obstacleText/obstacleModels/levels.js doc), the two cargo items (+ cargo.js, cargoText.json, cargoModels.js), `trolleys` and `ice` stretches tuned, the level finished with pickups, clock from level-clocks, words, CINE and the menu pictures, all the checks (`.obstacles-check`, `.cargo-check`, `.words-check`, `.replay-check mall-dash`, `.hazards-check`, `.bundle-check`, `vite build`), stills read along the whole level, CHECKLIST entry.

### Risks

- Camera vs ceiling: solved by the clamp, but a 4 m corridor with a 3 m camera gives a low, fast, bumper-ish view (SEEN: fine, even exciting, but the far end of a long hall is a vanishing point: the S-bends matter). Big vehicles (the player in a bus or a monster truck, 3+ m tall) in a 4 m corridor will have their roofs 1 m under the ceiling and the camera at roof height: cap `allowedCars` or make the lowest corridor 5 m.
- The look is FLAT: a lit box with one hemisphere light has no contrast (SEEN in all three spike stills: walls, roof and floor nearly one tone). The kit must bring the contrast (dark interiors behind glass, dark ceilings in the food court and electronics, coloured facias, the floor's gradient). Budget a half day of palette work with stills.
- Mobile cost of signage: 12 canvas textures of 256 x 64 is 0.8 MB: nothing. The risk is INSTANCE COUNT per draw (shop fronts 2 per 12 m x 2800 m = ~470 fronts x ~6 parts): still ~15 draw calls with instancing, well under Tuscany's 464.
- Sound: `Sound.echo` is one delay send (audio.js:463); a mall should have a lighter, longer echo (reverb of a hall) than a tunnel's: a `CONFIG.tunnel.litEcho` of 0.25 is enough; a real reverb (ConvolverNode) is new audio work: not needed.
- Z-fighting: the floor's tile texture is the road mesh itself (no decal), the wet-floor shine of `ice` patches is drawn by the existing ice renderer (polygon offset already), the shop fronts stand 0.3 m off the wall; the tile band's 1.001 scale trick (tunnel.js:67) is dropped for the mall. The roof and the atrium's glass roof must not be coplanar (glass 0.3 m above the roof opening: cut the roof strip in the atrium zone, i.e. `roofStrip` gets per-zone `roof: false` and the theme draws the glass).
- Replay hash: render-only files (render/*) are outside the hash; themes.js IS inside (imported by collision.js, config.js, crossing.js, levelSchema.js, levels.js, pickups.js: vite.config.js:18-32 follows imports), as is levels.js and config.js (obstacle kinds) and collision.js (sizes): every theme so far changed them (CHECKLIST 281, 284), the `.replay-check` is re-run, and recorded replays of other levels keep their level fingerprints. So: the same kind of hash change as Chianti/Dakar, no new kind. game.js:443 (the message) is logic: prefer the render-side check.
- The `trolleys` hazard has never been in a real level (CHECKLIST 15: "its drawing was not looked at closely"): slice 3 must look at it.
- The ghost of the owner's rule "no more moving explodable obstacles": escalator steps move but are scenery (no collision); trolleys move but existed already and do not explode.

### Owner decisions needed

1. Mannequins: none / headless dress forms in the fashion row only / none ever (recommended: none in slice 1-2, ask with a still in slice 3).
2. The level's one idea: the polished floor + loose trolleys (recommended), or a rival race through the mall, or a "closing time" clock.
3. Shop names: the 12 invented ones above, or the owner's own.
4. Whether the tunnel height lives in the LEVEL (each tunnel's `profile`) or is derived by the THEME from the zones (recommended: the theme, from `zones[].scenery`, so a level author only names halls).
5. Cargo: the present and the piranha tank, or other ideas (a wedding cake from the bakery; a parrot from the pet shop).
6. Lowest corridor: 4 m (bumper-ish camera, SEEN) or 5 m (safer with tall cars).
7. Whether a lit tunnel keeps any echo at all.

## 7. The spike (what was done, what was SEEN)

Worktree `/home/user/delivery-racer/.claude/worktrees/mall-spike`, local branch `claude/mall-spike` from e7386e5, NOT pushed, node_modules symlinked from `glass-touring-proportions`. Changes: `src/delivery/levels/mall-spike.json` (2000 m straight, 2 lanes, shoulder 0, no traffic, one lit tunnel 30..1970 with a height profile 4 / 14 / 6 / 10 m and camHeight 3, camBack 10), `src/delivery/levels/mall-spike-low.json` (the same with a plain 4 m `height` and TODAY's 5.5 m tunnel camera), `themes.js` (+ a `mall` theme: no scenery file, pale colours, lit, bright light), `levels.js` (two HIDDEN_LEVELS lines), `render/tunnel.js` (heightOf, roofStrip, hAt in walls/band/roof/lamps/portals, lit tunnels skip the dark), `render/scene.js` (per-tunnel camHeight/camBack, clamp under the ceiling). `node --check` on all four; eslint and the check groups NOT run (a throwaway).

Stills, all with `scripts/shots.mjs --browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, 1100 x 650, software GL, one at a time (6.6 to 9.2 s each), READ:

- `/tmp/mall-draft/shots/low.png` (`?hidden=mall-spike&ghost&at=250&ff=1`): the 4 m corridor with the 3 m camera: the road fills wall to wall (shoulder 0 works), the roof with its lamp boxes overhead, the walls' pale tile band at the foot, the car and a ghost pickup in frame. Washed out: walls, roof and floor nearly one tone; the lane dashes show faintly in the floor tone.
- `/tmp/mall-draft/shots/ramp.png` (`at=470`): the ceiling rising ahead from 4 m to 14 m, the walls' top edge climbing with it: the eased profile reads as a ramp, no seam.
- `/tmp/mall-draft/shots/atrium.png` (`at=800`): the 14 m hall: tall walls out of the top of frame, the lamp line far up, a cash pickup; it reads tall from the 3 m camera.
- `/tmp/mall-draft/shots/lowcam55.png` (`?hidden=mall-spike-low&at=300`): TODAY's tunnel camera (5.5 m) over a 4 m ceiling: the camera is above the roof; the frame is the roof's top face and the sky colour; the car is not visible; a pickup's head pokes through the roof. The clamp is required.

Not seen: a phone, a real GPU, any dressing (there is none in the spike), the sound, the start and finish portals (the 30 m outside), the step DOWN from 14 to 6 m with a camera higher than 6 m (the spike's camera is 3 m everywhere), eslint, the checks.
