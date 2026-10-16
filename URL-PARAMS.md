# Delivery Racer: everything you can put in the address

Every query parameter the game's code reads (found by searching `src/delivery/` and `delivery/*.html` for
`URLSearchParams`, `params.get/has/getAll` and `location.search`; nothing reads `location.hash`). Written 13-Oct-2026
against `main` at v1.1.100 (58eada5). If a later change adds a switch, it will not be here until this file is updated.

**Where to type them.** The game is at `https://delivery.pingmathehippo.com/delivery/`. Put `?` after that, then the
first switch, and `&` before every other one:

    https://delivery.pingmathehippo.com/delivery/?garage=evil&tab=ideas&look=limo

The bare domain (`https://delivery.pingmathehippo.com/?...`) redirects to `/delivery/`. Whether the redirect keeps
the `?...` part was **not tried** (the container cannot reach the live site), so the examples here all use
`/delivery/`. A switch with no `=value` (like `&full`) is on just by being there.

**Legend.** *Saves?* says what a switch can do to your real save (the cookie / local storage):

- **No**: nothing from the visit is written. Many test switches turn saving off for the whole visit
  (`Progress.noSave`), so even what you deliver or buy in that tab is forgotten when you leave.
- **Normal**: the switch itself writes nothing, but saving stays ON, so anything you then do in that tab (buy a car,
  deliver a level) is saved as usual, under the switch's conditions.
- **YES**: the switch can end up in your save. Marked in bold.

*Tried* says whether the example was loaded in headless Chromium on 13-Oct (scripts/shots.mjs) and the still looked
at. "untried" means it was read from the code only.

**Switches that turn saving off for the whole visit:** `autostart`, `hidden`, `test`, `edited`, `pick`, `car`,
`ghost`, `mystery`, `theme`, `beaten`, `owns`, `event`, `lanescrub` (main.js), and also `pack`, `bp` (with `showroom`), `shopcash`,
`shopbuys`, `maxed` / `owned` (on the Shop), and `demo`. Add any of them (e.g. `&ghost`) to a visit if you want to be
sure nothing sticks.

---

## 1. Starting a level straight away

These need `?autostart` (or `?hidden`, `?test`, `?edited`) to do anything; without it the menu shows as usual.

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `autostart` | bare, or `evil` | Skips the menu and starts a run. `=evil` plays it as Evil. | `/delivery/?autostart&level=1` | No | yes |
| `level` | a number, 1 to 73 today | Which level (its place in the game's list, NOT its id: see the list at the end; the numbers move when levels are added). Locked or not. Default 1. | `/delivery/?autostart&level=27&tiers=0` | No | yes |
| `evil` | bare | Plays as Evil (same as `autostart=evil`). Also used by the showroom and the banner page. | `/delivery/?autostart&level=1&evil` | No | untried (`autostart=evil` tried) |
| `car` | car id; `super-<id>` for its Super version | Drives that car for the visit, owned or not, at its max ECU. (Without autostart: see section 3.) | `/delivery/?autostart&level=1&car=hotrod` | No | yes (with `cine=car`) |
| `tiers` | `0` or `1` | Turns the level tiers off (`0`) or on (`1`) for the visit. **Needed** to start most levels above the first tier on a fresh save (see Gotchas). | `/delivery/?autostart&level=27&tiers=0` | Normal (No with autostart) | yes |
| `hidden` | `testbed`, `grand-prix`, `gimmick-road`, `gimmick-road-2`, `gimmick-road-3` | Starts a hidden level (no autostart needed). | `/delivery/?hidden=gimmick-road&ghost&at=600` | No | yes |
| `test` | bare | The hidden test track (= `hidden=testbed`). `&evil` as Evil. | `/delivery/?test` | No | untried |
| `edited` | bare | Plays the level the level editor last left (its local storage), as a hidden level. If it is broken, the menu shows with a red line saying why. | `/delivery/?edited` | No | untried |
| `at` | metres | Starts that far along the road. | `/delivery/?autostart&level=1&at=900` | No | yes |
| `ff` | seconds | Runs the game that long before the first frame is drawn (also with `screensaver` / `racewatch`). | `/delivery/?autostart&level=1&ff=4` | No | yes |
| `ghost` | bare | Your car is a ghost all run: nothing wrecks it. | `/delivery/?autostart&level=1&ghost` | No | yes |
| `speed` | m/s | Doing that speed from the start (with `ff`, hands off, it holds). | `/delivery/?autostart&level=1&speed=31` | No | untried |
| `lane` | lane number | Starts in that lane. | `/delivery/?autostart&level=1&lane=4` | No | untried |
| `theme` | a theme id (list at the end) | Plays the level dressed in that theme. | `/delivery/?autostart&level=1&theme=snow` | No | untried |
| `mystery` | a mystery id (list at the end; any case) | Every mystery pickup is that one. | `/delivery/?autostart&level=7&mystery=toad` | No | untried |
| `trainsin` | `a` or `a,b` (seconds) | On a level with a railway, its next trains are due in that many s (a: down the road; b: an edge railway's right track, overtaking). For stills of both. | `/delivery/?autostart&hidden=metro-run&ghost&at=420&speed=25&trainsin=1,1&ff=4&cine` | No | yes |
| `ladle` | `1` | On a level with molten ladles (the steelworks), the next ladle ahead comes out at once and pours as soon as it is over the road, wherever the car is (a still of the pour with the car held short). | `/delivery/?autostart&hidden=steelworks-run&ghost&at=600&speed=0&ladle=1&ff=4` | No | yes |
| `rival` | bare (the opposite side), `evil`, `good` | A rival courier on every delivery level. Works without autostart too. | `/delivery/?autostart&level=1&rival&ghost` | No with autostart; **Normal** without | yes ("Position 2/2") |
| `gt` / `lmp` | bare | Every race in GT road cars / Le Mans prototypes, whatever the menu says. | `/delivery/?autostart&level=59&gt` | No with autostart; **Normal** without | untried |
| `pursuit` | seconds | A police pursuit set off that many seconds in (any level that can have one). Works without autostart. | `/delivery/?autostart&level=1&pursuit=1` | as `rival` | tried, but no pursuit was visible in the still at 5 s: **not verified** |
| `pursuitbehind` | metres | With `pursuit`: it starts that far behind you. | `...&pursuit=3&pursuitbehind=60` | as `rival` | untried |
| `pieces` | number | That many tank pieces already found. | `/delivery/?autostart&level=1&pieces=3` | No | untried |
| `rage` | bare | In TANK RAGE from the start. | `/delivery/?autostart&level=1&rage` | No | untried |
| `infected` | bare, or `armour` | You are infected (radiation) from the start; `=armour` also under armour. | `/delivery/?autostart&level=53&infected` | No | untried |
| `rad` | `from-to` or `from-to:lane` (metres) | Adds a radiated stretch on top of the level's own. | `/delivery/?autostart&level=1&rad=300-500:2` | No | untried |
| `radcar` | bare (0.5) or a share 0 to 1 | That share of traffic starts infected. | `/delivery/?autostart&level=1&radcar=0.3` | No | untried |
| `lanescrub` | a number, `0` up (default 1) | The lane-change scrub with the accelerator held (CHECKLIST 421, `CONFIG.trueSpeed.driven`) that many times as strong, to try a feel: `2` twice as strong, `0.5` half, `0` as before 421 (only the small scrub that acts whatever the pedals do). Off the accelerator it changes nothing. A test: nothing is saved and no replay is recorded. Works without autostart. | `/delivery/?autostart&level=1&lanescrub=2` | No | untried (read from the code; the strength is checked headless by `scripts/.lanescrub-check.mjs`) |

## 2. Pictures, cameras and HUD checks (in a run)

Also need `autostart` (or a hidden level).

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `cine` | bare, or `car` | A still for the menu: traffic dealt afresh, `ff` lets it settle, then frozen; no HUD, camera off to one side. `cine=car`: your car alone on white. | `/delivery/?autostart&level=1&ghost&cine&ff=4&at=300` | No | yes (both) |
| `turn` | degrees | With `cine=car`: the camera that far round the car. | `...&cine=car&turn=120` | No | untried |
| `cineside` | `left` | With `cine`: camera on the other side of the road. | `...&cine&cineside=left` | No | untried |
| `cineout` / `cineup` / `cineback` | metres | With `cine`: camera beyond the road edge (default 9; below 0 is over the road) / height (7.5) / distance behind (22). | `...&cine&cineup=12&cineback=40` | No | untried |
| `fly` | bare | Freezes the level and gives a free camera (drag to look, keys to move, Shift faster, T reveals). | `/delivery/?autostart&level=1&fly` | No | yes |
| `cam` | `x,y,z` or `x,y,z,yawDeg,pitchDeg` | With `fly`: where the camera starts. | `...&fly&cam=0,40,-30,0,-20` | No | untried |
| `reveal` | bare | With `fly`: what is only set off later (mines up, bears dropped...) shown as it ends up. (With `pack`: `reveal=all`.) | `...&fly&reveal` | No | untried |
| `lamps` | comma list of `show`, `old`, `brake`, `hazard`, `left`, `right`, `night` | The car lamps (render/carlights.js, the per-car lamp table). `show`: a labelled marker at every lamp the effects use on your car (H yellow headlamp, T red tail, B red brake, I amber indicator, or red where it flashes red, R white reversing), and the car's axes; `old`: every car's lamp effects back on the hitbox placement (a "before"); `brake`: your brake lamps held on; `hazard`: all your indicators lit, `left` / `right` one side's (steady, not flashing, for a still); `night`: the listed cars' headlamp glow on, and with `cine=car` the studio dark. | `/delivery/?autostart&tiers=0&car=pickup&cine=car&turn=180&lamps=show,night,brake` | No | yes |
| `photo` | bare | Paused in photo mode once `ff` has run. | `/delivery/?autostart&level=1&ghost&photo&ff=2` | No | yes |
| `orbit` | `yaw,pitch,radius` | The orbit camera (render/orbit.js) on from the first frame of a run, held still: degrees round from dead ahead of the car, degrees up, metres (15 to 40). Add `orbitoff` to leave it off (a still of its button), `orbitghost` for the replay ghost, `orbitnonudge` to see what the nudge saves it from; the console says the reach and the cost of a look. | `/delivery/?autostart&level=1&ghost&ff=20&orbit=180,20,25` | No | yes |
| `orbitdemo` | `chase`, `drag`, `lock`, `ghost`, `tap` | A test of the orbit camera in a REAL replay (render/orbitdemo.js): the run is driven as a ghost to its delivery, then a slower one, which is played back, stepped to `orbitat=<step>` (360) and given what a player would: a mouse drag (`orbitpx=<px>`, 270 is about 90 degrees), the Chase view button held part way (`orbitblend=<0..1>`), the Ghost button, a tap with a wheel. The console says the steps and the clock and the pose at the start of the drag and on its first frame; `orbitplay` leaves the replay going (else it is held at the end). Needs shots.mjs with a long `--wait`. | `shots.mjs dir "x=@tokyo&tiers=0&ghost&orbitdemo=drag&orbitat=900&orbitplay" --wait=60000` | No | yes |
| `hudcheck` | bare, `many`, `one`, `later`, `icons` | Every part of the HUD showing at once and held (bare: flat tyre, a mystery, half a tank, two messages; `many`: six sticky icons; `one`: only the flat tyre; `later`: said once and left to fade; `icons`: every sticky message). `&mystery=` names the mystery. | `/delivery/?autostart&level=1&hudcheck&ff=2` | No | yes (bare) |
| `cargostate` | `0`, `1`, `2` | An Evil cargo item shown calm / agitated / furious whatever the clock says. | `/delivery/?autostart&level=1&evil&cargostate=2` | No | untried |
| `deliver` | seconds | The delivery scene at the kerb stopped that many seconds in. (With `event` it means something else: section 6.) | `/delivery/?autostart&level=1&ghost&at=...&deliver=2.5` | No | untried |
| `screensaver` | bare | Starts the screensaver (works with `ff`). No autostart needed. | `/delivery/?screensaver&ff=3` | Normal | yes |
| `racewatch` | bare | Starts the race screensaver. | `/delivery/?racewatch` | Normal | untried |
| `camcheck` | bare | With `racewatch`: checks every trackside camera and prints the result to the browser console (nothing on screen). | `/delivery/?racewatch&camcheck` | Normal | untried |
| `crack` | `on`, or `0` to `100` | PROTOTYPE, off by default (CHECKLIST 406, src/delivery/CRACKED-GLASS-NOTES.md): the player's car's windscreen and rear window crack with damage (render/cracks.js: hairline at the first dent stage, a web at the second and third, shattered at the last). `on`: from the real damage. A number: shown as at that % of damage for the visit (dents and scorch too: a look only, health untouched). Also the model editor's and the inspector's Damage buttons when the address has `crack`. | `/delivery/?autostart&car=commuter&crack=100&at=300&ff=2`; `/delivery/modeleditor.html?car=commuter&damage=5&crack=on` | No | yes (stills) |

## 3. The menu (no autostart)

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `pick` | level number | The menu with that level picked; every level (and tier) open for the visit. Nothing starts. | `/delivery/?pick=27` | No | yes |
| `start` | bare | With `pick`: Start is pressed too. | `/delivery/?pick=66&start` | No | untried |
| `cursor` | level number | Moves the menu to that level (shown only if it is open to you). | `/delivery/?cursor=3` | Normal | untried |
| `tab` | `races`, `events` | The menu opens on the Races or Events tab. (Means something else with `garage` and in the editor.) | `/delivery/?tab=races` | Normal | yes (`races`) |
| `side` | `evil` | Plays Evil (not saved as a choice). The showroom then opens on Evil too. (On cargo.html it filters: section 9.) | `/delivery/?side=evil` | Normal | untried |
| `options` | bare | The Options sheet open. | `/delivery/?options` | Normal | untried |
| `road` | bare | The "What's on this road" card open (for the picked level: works with `pick`). | `/delivery/?pick=27&road` | Normal / No with pick | untried |
| `do` | comma list of `key:<code>`, `click:<css selector>`, `swipe:left`/`swipe:right` | Works the menu step by step, one every 0.15 s (encode `#` as `%23`). | `/delivery/?do=key:ArrowRight,key:ArrowRight` | Normal | yes (moved to level 3) |
| `car` | car id | (without autostart) The menu with that car in use for the visit, owned or not. | `/delivery/?car=hotrod` | No | untried |
| `savepanel` | bare (export), or `import` | The save code panel open. | `/delivery/?savepanel` | Normal (an import you paste replaces your save, as usual) | yes |
| `album` | bare | The Postcards album open. | `/delivery/?album` | Normal | yes |
| `milestones` | bare | The Milestones wall open. | `/delivery/?milestones` | Normal | untried |
| `unlock` | bare | With `album` / `milestones`: everything shown as earned (pretend only). | `/delivery/?album&unlock` | Normal | yes |
| `demo` | bare | A made-up save for the visit: all but the last two levels open, medals on most, every other car owned, a full bank. Saving is switched off. | `/delivery/?demo` | No | yes |
| `touch` | bare | Shows the on-screen touch controls (as on a phone). | `/delivery/?touch&autostart&level=1` | Normal | untried |
| `stage` | `off`, a theme id (`vegas`, `alpineDusk`...), `default`, `level` | The car card's stage (CHECKLIST 347; on by default, from the picked level's theme). `off`: the plain card as before (the stage's code not loaded); a theme: that theme's stage; `default`: the plain studio; an unknown name: the studio. | `/delivery/?stage=off`, `/delivery/?stage=vegasNight` | Normal | yes (stills) |
| `stagequality` | `low`, `high` | With the stage: its props (`low` 2, `high` 5), else by the card's height (under 120 px: low). | `/delivery/?stage=vegas&stagequality=low` | Normal | yes |
| `stagethrow` | a theme id, or `*` | Makes that stage's build throw, to see the fallback (`*`: every one, the plain card). | `/delivery/?stagethrow=*` | Normal | yes (stills) |
| `stagelog` | bare | The card's cost in the console (draw calls, triangles, programs). `&stageswap=<car>&swapat=<ms>` switches car then and logs the frames after. | `/delivery/?stagelog` | Normal | yes |

## 4. Fake progress for a look (cheats)

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `beaten` | comma list of `levelId`, `levelId:evil`, `levelId:both` | Those levels counted as having a medal (alone = Good). Uses level **ids**, not numbers. | `/delivery/?beaten=expressway,back-roads:evil,farm:both` | No | untried |
| `owns` | comma list of car ids | Those cars lent for the visit, at max ECU. | `/delivery/?showroom&owns=sport&look=sport&full` | No | yes |
| `money` | number | The bank set to that. **Does NOT switch saving off.** Loading it alone did not write it (a second load of the plain menu showed $0), but anything that saves later in the same tab (buying, delivering) would write the fake bank. Add `&ghost` (or another no-save switch) to be safe. | `/delivery/?money=500&ghost` | **YES** (if you then do something that saves) | yes |
| `unlockall` | `abs`, `all`, or bare (= all) | The Options screen's Unlock everything applied from the address: `all` is the button as it always was; `abs` is ABSOLUTELY everything (every car owned incl. the unavailable earned cars and every key, every ECU maxed, events done, bank 9,999,999, Crazey Cash 9,999,999). Nothing is saved. | `/delivery/?unlockall=abs&showroom&look=l-taxi` | No | yes |
| `shopcash` | number | The Shop's Crazey Cash for the visit. | `/delivery/?shop&shopcash=5000` | No | untried |
| `debug` | bare | On the Shop: a "+1000 (debug)" button on the wallet. What it adds **is saved**. | `/delivery/?shop&debug` | **YES** (pressing it) | untried |
| `freetry` | bare | The rotating event's featured car (Concept Strike) as the free try, as its card's chip does. | `/delivery/?tab=events&freetry` | Normal (the try itself is never saved) | untried |

## 5. Garage (Crazey Jim's car lot) and the Showroom

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `garage` | bare, or `evil` | Opens the car lot (Evil livery with `=evil`). | `/delivery/?garage=evil` | Normal (buying there is real) | yes |
| `tab` | `ideas` | With `garage`: the Car ideas lot. | `/delivery/?garage=evil&tab=ideas` | Normal | yes |
| `look` | car id (an idea's id on the ideas tab) | With `garage`: that car tapped (its stats and the comparison card). On the ideas tab only the idea cars count (e.g. `limo`, `hovercraft`; list at the end): `look=sixteen` there does nothing (tried). | `/delivery/?garage=evil&tab=ideas&look=limo` | Normal | yes |
| `hover` | car id | With `garage`: that car's tooltip shown. | `/delivery/?garage&hover=commuter` | Normal | yes |
| `click` | CSS selector(s), `\|` between several, `#` as `%23` | With `garage` only: that control pressed once the lot is up (e.g. `%23garageAction` on an unowned car: its buy sheet). | `/delivery/?garage&look=postvan&click=%23garageAction` | Normal | tried with `floatvan`: nothing visible opened (the car may not be on the lot for level 1): **not verified** |
| `sort` | `stars`, `price`, `speed`, `accel`, `health` | With `garage`: the lot sorted that way. | `/delivery/?garage&sort=speed&show=owned` | Normal | yes |
| `show` | `all`, `owned`, `sale`, `afford`, `amphibious`, `gold`, `blue` | With `garage`: only those cars parked. | (as above) | Normal | yes |
| `inspect` | car id (an idea's id, or a car of the lot) | With `garage`: the MODEL INSPECTOR open on that car (full screen: drag to orbit, pinch or wheel to zoom, double-tap to reset, Front/Rear/Left/Right/Top/3/4, Good/Evil, previous/next; Back, Escape or the browser's back close it). An idea's previous/next go through every idea; a lot car's through the lot's cars. Add `&evil` (or use `garage=evil`) for the Evil livery and `&view=front` (`rear`, `left`, `right`, `top`, `34`) to start from that side. | `/delivery/?garage&tab=ideas&inspect=rallywedge&evil&view=left` | Normal | yes (headless Chromium, CHECKLIST 219) |
| `cosmetics` (with `scope`, `slot`, `closeup`) | bare; `scope=all`; `slot=plate\|roof\|cargo\|wing\|underglow\|kill` | Opens the Cosmetics screen on the car in use (`&car=<id>` names another, but `car` is a test switch: the visit then starts from Stock and saves no choice). Choices are PER CAR since 15-Oct (CHECKLIST 327): it opens on 'This car'; `&scope=all` opens it on 'All cars' (the default every car without its own look wears). The look switches `wheelrim`, `wheelhub`, `wheeltyre`, `wheeltread`, `wheelcolour`, `wheeldesign`, `platedesign`, `platetext`, `plates=none`, `roofprop` / `cargoprop` / `wingprop` (and `...paint`) dress EVERY car for the visit, over each car's own. | `/delivery/?cosmetics&scope=all&slot=roof` | Normal (a choice made there is saved) | yes (headless Chromium, CHECKLIST 327) |
| `wheelrim` | a rim or spinner id: rims `spoke5`, `twin10`, `turbine`, `blade3` (Blade), `twinspin` (Twin blade), `pumpkin`, `candycane`; spinners `spinblade` (Blade spinner), `spintwin` (Twin spinner); `none` | Every car wears that rim (or spinner) for the visit, over its own choice; never saved (render/rims.js). A rim turns with the car's speed and idles slowly on show; a spinner turns at 6 rad/s always (CHECKLIST 399: spinners are back as their own kind with new ids; `blade3` / `twinspin` stay the speed rims of CHECKLIST 398). On a car whose saved set has no rim, the Cosmetics screen then shows 'Custom'. | `/delivery/?cosmetics&car=commuter&closeup&wheelrim=pumpkin` | Normal (nothing saved) | yes (headless Chromium, CHECKLIST 398) |
| `wheelhub` | `<colour>` (a hub colour id: `stock`, `silver`, `black`, `gold`, `white`, `red`, `blue`, `green`, `orange`), `rim:<id>` or `spin:<id>` | The HUB part of the three-part wheel set for the visit, every car, never saved (CHECKLIST 399): a plain hub colour (no rim), a rim, or a spinner. `?wheelrim=` wins over it for the rim; `?wheelcolour=` for the colour. | `/delivery/?cosmetics&car=sprinthatch&closeup&wheelhub=spin:spinblade` | Normal (nothing saved) | headless check only (.treads-check) |
| `wheeltyre` | a tyre colour id: `stock`, `whitewall`, `redline`, `red`, `white`, `blue`, `yellow` | The TYRE COLOUR part of the wheel set for the visit, every car, never saved (render/wheelcosmetic.js TYRE_COLOURS; the tread takes the tyre's colour). The old `wheeldesign` still works: its old ids `redwhite`, `whiteblack`, `goldwall` mean red / stock / whitewall tyres and bring their white / white / gold hub unless a hub colour is asked. | `/delivery/?cosmetics&car=sprinthatch&closeup&wheeltyre=white` | Normal (nothing saved) | headless check only (.treads-check) |
| `wheeltread` | a tread id: `knobbly`, `chevron`, `ribs` (Road ribs), `lugs` (Tractor), `studs` (Winter), `none` (the car's own tyre) | The TREAD part of the wheel set for the visit, every car, never saved (render/treads.js). A tread turns with the wheel by the distance rolled, as the rims do; it goes only on tyres with room under their bodywork (lower, or none, where an arch is close). | `/delivery/?cosmetics&car=liftedtruck&closeup&wheeltread=knobbly` | Normal (nothing saved) | yes (headless Chromium, CHECKLIST 399) |
| `treadlog` (with `treadstop`) | bare or a count N; `treadstop=K` | A PROOF LOG for the turning wheels (render/treads.js, render-only): every dressed model's treads and rims are measured each frame (how far each mesh really turned about its axle, in the model's frame) against the distance rolled; the first N frames are printed one line each (`console.warn`, which scripts/shots.mjs prints under a picture) and a summary after 60. `treadstop=K` holds the run car's wheels at its K-th frame, so a still shows that frame. Used for CHECKLIST 399's real-run frames. | `/delivery/?autostart&level=1&tiers=0&car=liftedtruck&orbit=90,4,15&wheeltread=studs&wheelrim=spoke5&treadlog=8&treadstop=6` | No (debug) | yes (headless Chromium, CHECKLIST 399) |
| `cosmetics=all` | `all` | REVIEW ONLY: opens the Cosmetics screen as `?cosmetics` does and wakes the dormant Decal tab with two do-nothing 'Sample' chips, on every car, so every tab and the layout can be seen (the Kill effect, CHECKLIST 405, and the Glow, CHECKLIST 416, are real slots: no samples) (render/cosmeticslots.js). Nothing is registered, stored or worn; off unless asked. | `/delivery/?cosmetics=all&car=pickup&slot=decal` | Normal (the real choices made there are saved) | yes (headless Chromium stills, CHECKLIST 404) |
| `killfx` (with `fxlow`, `fxboom`) | a kill effect id: `classic`, `confetti`, `fireworks`, `coins`, `bubbles`, `comic`, `lightning` (and the cut `pixels`, `candy`) | Every explosion, and the player's package trail and flaming-package burst, in that KILL EFFECT for the visit, whatever is equipped (CHECKLIST 405; render-only). `fxlow=1`: the cheap low version always. `fxboom`: every 1.2 s the nearest obstacle 15 to 60 m ahead is DRAWN exploding (it stays in the road; for a still of the effect in a run). An unknown id: the equipped one. | `/delivery/?autostart&level=1&ghost&killfx=coins&fxboom` | Normal | yes (headless Chromium, CHECKLIST 405) |
| `killtest` | seconds | With `cosmetics&slot=kill`: the Kill effect's Test fires 1.5 s after the screen opens and the preview is held that many seconds into it (the package lands at 0.8 s, the car goes up at 1.1 s). | `/delivery/?cosmetics&slot=kill&killfx=comic&killtest=1.25` | Normal | yes (CHECKLIST 405) |
| `czgive` | `slot:id[*n]`, comma list (e.g. `plate:ev*3,plate:classic`) | DEBUG: with `cosmetics`, awards those earned cosmetics as the screen opens, through the one entry point (`render/cosmetics.js` awardCosmetic, the same as a pack's cosmetic card; CHECKLIST 437). Works only on a test visit (`car=`, Progress.noSave: nothing written) or the dev server. | `/delivery/index.html?cosmetics&car=pickup&slot=plate&czgive=plate:ev*3` | Test visit / dev only | yes (headless Chromium stills, CHECKLIST 437) |
| `cztap` (with `cztapat`) | an item id (`ev`, `roofbox`, `comic`...); `cztapat` ms (default 1200) | With `cosmetics&slot=...`: taps that chip in the open tab once the screen is up, for a picture: an owned one opens the equip sheet (worn as a try-on), one not earned its 'Not earned yet' sheet. | `/delivery/index.html?cosmetics&car=pickup&slot=plate&czgive=plate:ev*3&cztap=ev` | Normal (a tap that is not confirmed changes nothing) | yes (CHECKLIST 437) |
| `underglow` | a look's id (`neon-blue`, `hot-pink`, `lime`, `amber`, `red`, `white`, `purple`, `teal`, `match`, `pulse`, `chase`, `rainbow`) or `none` | Dresses EVERY car that can wear one with that underglow for the visit, over each car's own choice (render/underglow.js); not stored. With `cosmetics&slot=underglow` it opens the Glow tab with that look ticked. | `/delivery/?autostart&level=6&tiers=0&car=hothatch&underglow=neon-blue` | No (for the visit only) | yes (headless Chromium stills, CHECKLIST 416) |
| `studio` | idea ids (comma) or `all` | With `garage&tab=ideas`: a studio picture of those idea models alone. | `/delivery/?garage&tab=ideas&studio=limo,bathtub` | Normal | untried |
| `views` | `1`, `2` (default), `3` | With `studio`: how many sides of each model. | `...&studio=all&views=3` | Normal | untried |
| `showroom` | bare | Opens the Showroom (where a car is picked). | `/delivery/?showroom` | Normal | yes |
| `look` | car id | With `showroom`: that car's card picked. Any car id, key cars included (e.g. `sixteen`). | `/delivery/?showroom&look=sport` | Normal | yes |
| `full` (old name `sheet`) | bare | With `showroom`: the picked car's full view open. | `/delivery/?showroom&look=sport&full` | Normal | yes |
| `nostats` | bare | With `showroom&full`: the stats hidden. | `/delivery/?showroom&look=sport&full&nostats` | Normal | untried |
| `evil` | bare | With `showroom`: opens on the Evil side. | `/delivery/?showroom&evil` | Normal | untried |
| `filter` | `group:chip,chip;group:...;sort:<s>` groups `stars` (1-6), `colour` (gold, blue, magenta, green), `rarity` (common, uncommon, epic, legendary), `kind` (garage, blueprint, key, special), `state` (ready, locked, upgradable, maxed, inuse, barred, allowed, event); sort `tier`, `rarity`, `ecu`, `name`, `speed` | With `showroom`: a filter for the visit (not remembered). Note: the `tier:g3,b1` form in showroom.js's comments is out of date and is ignored. | `/delivery/?showroom&filter=stars:2;sort:speed&filters` | Normal | yes |
| `filters` | bare | With `showroom`: the filter sheet open. | (as above) | Normal | yes |
| `bp` | `carId:n,carId:n` | With `showroom`: those blueprint counts for the visit. | `/delivery/?showroom&bp=sport:7,hotrod:3&look=sport&full` | No | untried |
| `bounce` | seconds | With `showroom&full`: the car's landing frozen that far in (0.16: down on its springs; 0.31: up off them). | `/delivery/?showroom&look=sport&full&bounce=0.16` | Normal | untried |
| `sourcesopen` | bare | The full view's "Where to get it" list open from the start. | `/delivery/?showroom&look=sixteen&full&sourcesopen` | Normal | untried |
| `keyturn` | radians | With `showroom&full`: the "Where to get it" key card's turning key (render/keyspin.js) held at that turn (no spin; a drag still turns it). 0 leaves the pre-rendered PNG. A blacked-out car's key turns black. | `/delivery/?showroom&look=hotdog&full&sourcesopen&keyturn=1.8` | Normal | yes (headless Chromium, CHECKLIST 224) |
| `legendpos` | `P1` .. `P8`, `P8b`, `P8c`, `T15`, `T25` | A Legendary car's wreath at another of the placements to compare (render/legenddecal.js LEGEND_PLACEMENTS; P1, the default, is its own, at the shared tilt of 20; T15 and T25 are P1 at 15 and 25 degrees, P8c at the old 35). Any page that builds the car: the showroom, the model editor (`modeleditor.html?car=l-commuter&legendpos=P3`), a run or `cine=car`. A car with no such placement keeps its own. | `/delivery/?showroom&look=l-commuter&owns=l-commuter&full&legendpos=P3` | Normal (it writes nothing) | yes (headless stills, CHECKLIST 243) |

## 6. Events and the clock

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `event` | `comet-hunt`, `car-hunt`, `concept-strike` | The menu on that special event's next stage. | `/delivery/?event=concept-strike` | No | yes |
| `eventsnow` | a day `2026-11-05`, or a date-time with zone | The events' clock set to that day for the visit (menu, Shop, Where to get it). Changes which Concept Strike car is today's, what is live, "Next in...". | `/delivery/?event=concept-strike&eventsnow=2026-10-14` | Normal (No with `event`). Without a no-save switch, a run you deliver is saved as if on that day | yes |
| `deliver` | bare | With `event`: the stage started and delivered at once, for its results and the pack it gives. Only works if you have a car the stage allows (add one with `owns`). | `/delivery/?event=car-hunt&owns=minivan&deliver` | No | yes (the kerb scene showed; without `owns` nothing started) |
| `freetry` | bare | See section 4. | | | |

## 7. Shop, packs, keys and banners (pictures of the card side)

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `shop` | bare | Opens the Shop. Only from the menu (not with autostart). | `/delivery/?shop` | Normal (buying is real) | yes |
| `inside` | an offer id or pack id (list at the end) | With `shop`: that pack's "What's inside" sheet open. | `/delivery/?shop&inside=comet-special` | Normal | yes |
| `limits` | `packId:t<total>d<daily>,...` | Purchase limits for the visit. | `/delivery/?shop&limits=ten:t3,standard:d2` | Normal | untried |
| `shopbuys` | `packId:n,...` | So many of a pack counted as bought today (sold-out / claimed tiles). | `/delivery/?shop&shopbuys=daily:1,ten:2` | No | untried |
| `pack` | a pack id, or `bespoke` | Opens that pack free on the menu, for a look ("A look: nothing saved"). `bespoke`: a standard pack with the Silver Comet's key added. | `/delivery/?pack=standard&reveal=all` | No | yes (both) |
| `from` | event id | With `pack`: the old `pack=special&from=comet-hunt` form still finds the event's pack. (On gimmicks.html it is a card number.) | `/delivery/?pack=special&from=comet-hunt` | No | untried |
| `reveal` | `all` | With `pack`: every card turned at once. | (above) | No | yes |
| `give` | `kind` or `kind:eventId`, comma list | With `pack`: those packs also granted (queued as unopened), for a look. | `/delivery/?pack=standard&give=ten,daily` | No | untried |
| `flick` | seconds | With `pack`: each slot's flick animation held that long after its first throw. | `/delivery/?pack=ten&flick=0.4` | No | untried |
| `again` | bare | With `pack`: the "Buy another" button shown (it buys nothing). | `/delivery/?pack=standard&reveal=all&again` | No | untried |
| `amount` | 1 to 99 | With `pack`: every non-key card that many (x3, x15...). | `/delivery/?pack=ten&amount=15&reveal=all` | No | untried |
| `amounts` | `3,15` (by slot, alternating) or `common:3,epic:15` (by rarity) | With `pack`: per-slot or per-rarity amounts. | `/delivery/?pack=ten&amounts=common:3,epic:15` | No | untried |
| `featured` | `carId[!key][:weight[x amount]]`, comma list | With `pack` or `shop`: a special pack's featured list for the visit. | `/delivery/?shop&inside=comet-special&featured=silvercomet:9x3,rocketfin!key:1` | Normal (nothing of it stored) | untried |
| `cosmetics` (with `pack`) | `slot:id[:chance][xn]` or `any-<slot>[:chance][xn]`, comma list | With `pack`: the pack's COSMETIC CARDS for the visit (packs.js debugCosmetics, over the pack's own `cosmetics` list in packs.json; CHECKLIST 437); each rolled on its chance (default 1), awarded through awardCosmetic and shown under the blueprint cards. | `/delivery/?pack=standard&reveal=all&cosmetics=plate:ev:1x2,any-underglow` | No (a look: nothing saved) | yes (headless Chromium still, CHECKLIST 437) |
| `double` / `base` | 0 to 1 / 1 to 99 | With `pack` or `shop`: the chance a card doubles, and the base amount. | `/delivery/?shop&inside=standard&double=0.5&base=2` | Normal | untried |
| `maxed` / `owned` | car ids, comma list | With `pack` or `shop`: cars counted as at max ECU / their key owned (to see exhausted featured cards). | `/delivery/?shop&inside=comet-special&owned=silvercomet` | No | untried |
| `keycar` | a key car's id | With `pack=bespoke`: whose key is added. | `/delivery/?pack=bespoke&keycar=sixteen&reveal=all` | No | untried |
| `keys` | bare, `concepts`, `ordinary`, `all`, or a car id | A sheet of key pictures: bare = each key car's own key; `concepts` = the six concept cars'; `ordinary` = every ordinary key; `all` = every key; a car id = every key model tinted by that car. | `/delivery/?keys&card` | Normal | yes (bare, `ordinary`) |
| `only` | key model names, comma list | With `keys`: only those models (fob, classic, smart, fin, wheel, solar, lunar, snowboot, bun, keikey, wing, artisan, carbonfob, wedgefob, startfob; ordinary: roundhead, flipkey, rugged, wristband, carfob, cardkey, displaykey, crystal, leaper, lottag). (On cargo.html it filters items.) | `/delivery/?keys=sixteen&only=artisan,fob` | Normal | untried |
| `card` | bare | With `keys`: card-size pictures only, no side views. | `/delivery/?keys=ordinary&card` | Normal | yes |
| `keymodel` | a key model name | Every card draws that key model for the visit (to compare). | `/delivery/?shop&inside=comet-special&keymodel=artisan` | Normal | untried |
| `banner` | 1 to 3 car ids (hero first) | Just a pack banner over everything, to re-shoot. | `/delivery/?banner=wedge,midnight,splitwindow&w=1000&h=500` | Normal | yes |
| `w` / `h` | pixels | With `banner`: its size (default 1600x800). | (above) | Normal | yes |
| `evil` / `labels` | bare / `0` | With `banner`: Evil livery / no names. | `...&banner=wedge,midnight&evil&labels=0` | Normal | untried |

## 7a. Crazey Jim's Blueprint Stall (branch claude/blueprint-shop, not on main yet)

A section at the top of the Shop where Jim sells blueprints for tip money (the bank, `$`): six offers that change every 6 local hours
(00:00, 06:00, 12:00, 18:00; render/jimshop.js, rules in jimshop.js). `jimshop` opens the Shop with it expanded. Fake saves
below write nothing (`Progress.noSave`). The rotation is seeded by the local date and slot, so `eventsnow` picks the day and the slot.

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `jimshop` | bare | Opens the Shop with the stall expanded (on the menu, not with autostart); the menu's red $ / Jim half of the Shop button does the same. | `/delivery/?jimshop` | Normal (buying is real) | yes |
| `demo` | `normal` (also bare), `keycar` (the Rocket Fin Coupe and the Swan Car on the stall as key-car offers), `expensive`, `soldout`, `broke`, `maxed`, `nocc`, `reflimit`, `empty`, `nopool`, `bought` | With `jimshop`: a made-up save: a bank of $900 (`expensive` $5000, `soldout` $1500, `broke` $0, `maxed` $2000, `empty` $800) and blueprint counts, so the offers show their states. `expensive`: the dearest offer's confirm up. `soldout`: two sold out. `maxed`: one car at its max, one a blueprint short of it. `nocc`: 3 Crazey Cash, too little to Refresh. `reflimit`: the day's refreshes used up. `empty`: everything sold. `nopool`: no cars to sell. `bought`: a cheap purchase made, its feedback shown. | `/delivery/?jimshop&demo=soldout` | No | yes |
| `jimcars` | car ids, comma list (up to 6) | With `jimshop&demo=keycar`: those cars on the stall (any car of the stall's pool). | `/delivery/?jimshop&demo=keycar&jimcars=hearse,rocketfin` | No | yes |
| `jimr` | whole number | With `jimshop`: the refreshes already done today, so the Refresh button costs 5 + n Crazey Cash. | `/delivery/?jimshop&demo&jimr=6` | No | yes |
| `jimcc` | whole number | With `jimshop`: the Crazey Cash for the visit (the Refresh button costs 5, then 6, 7 ...). Demos start with 40. | `/delivery/?jimshop&jimcc=2` | No | yes |
| `jimrefresh` | bare | With `jimshop`: the Refresh button pressed 0.7 s after opening (with `jimhold`, the re-roll's pop stays on). | `/delivery/?jimshop&demo&jimrefresh&jimhold` | No | yes |
| `jimcash` | whole dollars | With `jimshop`: the bank for the visit. | `/delivery/?jimshop&jimcash=120` | No | untried |
| `jimpress` | offer number (0-based, as laid out: the hot deal first) | With `jimshop`: that offer's Buy pressed 0.4 s after opening (a dear one asks first). | `/delivery/?jimshop&demo&jimpress=2` | No with `demo` | yes |
| `jimhold` | bare | With `jimshop`: the purchase toast stays up (for a picture). | `/delivery/?jimshop&demo=bought&jimhold` | No | yes |
| `eventsnow` | a day or date-time | (section 6) sets the day, so the rotation, and the "New stock in" clock. | `/delivery/?jimshop&eventsnow=2026-10-14T19:48:00Z` | Normal | yes |

## 7b. Unlock cinematics (by address only, for now)

A full-screen reveal over the menu, drawn in one canvas of its own (render/unlockcine.js). Not the `cine` stills of
section 2 (those are a frozen camera on a run): these are short played sequences. Nothing in the game starts one yet.
A tap or click, Escape, Space or Enter while it plays skips to its end; the end is HELD (the last frame, with "Tap to
continue") until a tap or one of those keys closes it. Reduced motion, or any `?lite=` switch: a short fade-only version
(1.3 s, then held). Sound plays only once the page has been tapped or a key pressed (a browser rule), so a first play
straight from the address is silent; with `&loop` the plays after that are heard (press a key other than Esc/Space/Enter,
e.g. Shift).

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `unlockcine` | `car:<car id>` | The CAR unlock, 5.0 s, then held: a dark silhouette under a sweeping spotlight (low, wide), the front corner close as the headlamps flicker on, a tracking side shot with a flare in the rarity's colour, the front three-quarter hero shot with NEW CAR, the name, the stars and the rarity. Any car id. | `/delivery/?unlockcine=car:hearse` | Normal (it writes nothing) | yes (stills, CHECKLIST 237, 238) |
| `unlockcine` | `key:<car id>` | The KEY unlock, 10.0 s, then held: the car's own key in the dark; then, for a key with a blade, the IGNITION (from the side, the key slides into the vertical slot teeth down, three tumbler clicks; then the barrel's face: a quarter turn clockwise to ON, the CLICK with shake and flash), or for a FOB with no blade (the Horseshoe, Snowcat, Quad-Turbo, Knife-Edge, Windsong, Sixteen) the fob's button pressed and the car's lamps blinking twice with a chirp; then a slow-motion burst with the car's silhouette behind, the headlamp powering on (close), a side sweep, a rear three-quarter as the tail lamps light, and KEY UNLOCKED, the name, the stars and the rarity. Any car id (a car with no key of its own gets the plain fob key, which has a blade). | `/delivery/?unlockcine=key:swancar` (ignition), `/delivery/?unlockcine=key:horseshoe` (fob) | Normal | yes (stills) |
| `unlockcine` | `jim:<car id>` | CRAZEY JIM'S SALE, 6.5 s, then held: the lot at night (bunting, searchlights, an empty bay, the price board), the board flips to SOLD as banknotes rain, the car drops into the bay and honks, its key is tossed in and caught, then CRAZEY JIM'S USED CARS, SOLD!, the name, the stars, "Paid $..." (a car with a price). No people. | `/delivery/?unlockcine=jim:hearse` | Normal | yes (stills, CHECKLIST 242) |
| `unlockcine` | `ecu:<car id>[:<level>]` | ECU UP, 5.0 s, then held: the car on a rolling road, the ECU module dropping into the diagnostics tower, a rev run (rollers, exhaust flares), then a panel: ECU n-1 -> n, the pips, the figures that change (old -> new). `<level>` the ECU reached (default 2; held to 2..the car's max; a car whose max is 1 shows ECU 1 and no change). | `/delivery/?unlockcine=ecu:hearse:3` | Normal | yes (stills) |
| `unlockcine` | `ecumax:<car id>` | MAX ECU, 8.0 s, then held: the workshop lights clunk on, the module drops in and glows, the rev counter into the red, flames, a shockwave, the car's stars flaring, then MAX ECU with every pip lit; a concept car (its key won by delivering it at its max ECU) ends with its key rising into the picture. | `/delivery/?unlockcine=ecumax:sixteen` | Normal | yes (stills) |
| `evil` | bare | With `unlockcine`: the Evil livery (and "New ride" for a car). | `/delivery/?unlockcine=car:sixteen&evil` | Normal | yes |
| `loop` | bare | With `unlockcine`: plays again and again, no hold (until skipped). | `/delivery/?unlockcine=key:swancar&loop` | Normal | untried |
| `still` | seconds | With `unlockcine`: that moment of it, held (no sound), for pictures. | `/delivery/?unlockcine=key:swancar&still=3.4` | Normal | yes |

## 8. Performance: the tablet flicker bisect (`lite`)

`?lite=<names>` turns suspects off for the visit (a small "lite: ..." badge in the bottom-left corner confirms it).
Comma separated. Works on any page of the game (menu, Shop, packs).

| Name | Turns off |
|---|---|
| `glow` | the Legendary-key / Bespoke cards' pulsing glow |
| `twinkle` | the glints over Legendary-key / Bespoke art |
| `shine` | every card shine (sweep, holo, the Legendary blueprint's shine) |
| `blend` | only the shine's blend mode (the shine still moves) |
| `drift` | the menu picture's slow zoom |
| `menu` | every menu animation (zoom, light sweep, START pulse, LIVE dot) |
| `scene` | nothing drawn under What's inside / the pack reveal (a plain dark page) |
| `blur` | every backdrop blur (the Shop's top bar) |
| `shadow` | card shadows, picture drop-shadows, star glow |
| `pics` | the car and key pictures on the cards |
| `stacks` | the x1/x2 fades and the x3/x15 bubble cycle |
| `anim` | every animation and transition in the sheet and the reveal |
| `all` | all of the above |

Example (tried, badge and plain page seen): `/delivery/?lite=all&shop&inside=standard`. Saves? Normal.

## 8a. Level loading (the loading screen: `render/loadscreen.js`, CHECKLIST 349)

A run started from the menu (Start, Enter, Next level) is built in steps under a loading screen that shows only when the load
passes 300 ms. These switches are for measuring and looking at it; none of them saves anything by itself (saving stays Normal).

| Param | Values | What it does | Example | Saves? | Tried |
|---|---|---|---|---|---|
| `loadlog` | bare | Prints a table of where each start's time went (theme file, rules, each drawing hook, shaders, Game.start, the first frames) in the console, and keeps it in `window.__loadlog`. `scripts/perf-load.mjs` reads it. | `/delivery/?loadlog` | Normal | yes (headless) |
| `nostage` | bare | Starts a level in one go, as before the loading screen (no screen): to compare. | `/delivery/?loadlog&nostage` | Normal | yes (headless) |
| `slowload` | ms | Waits that long at every loading step, so the screen and its bar can be seen (a check, a picture). | `/delivery/?slowload=800` | Normal | yes (headless) |
| `loadafter` | ms | Moves the 300 ms threshold (a check: no screen for a load under it). | `/delivery/?loadafter=60000` | Normal | yes (headless) |

## 9. The other pages

The game has seven pages, all under `/delivery/`:

| Page | What it is | Params |
|---|---|---|
| `index.html` (or just `/delivery/`) | the game | everything above |
| `editor.html` | the level editor | see below |
| `modeleditor.html` | the car model editor (patches over the code's models) | see below |
| `gimmicks.html` | every gimmick, by group, with its model | `group`, `from`, and `#<group>` anchors |
| `cargo.html` | every cargo item, Evil ones in their three states | `side`, `only`, `still`, `t`, `turn` |
| `powerups.html` | the power-ups | none |
| `police.html` | the police | none |
| `sides.html` | Good and Evil | none |

Whether the live site serves these as `editor.html` or redirects to `editor` (and keeps the `?...`) was **not tried**.

**gimmicks.html**

| Param | Values | What it does | Example | Tried |
|---|---|---|---|---|
| `group` | `the-road-itself`, `wildlife`, `on-the-move`, `construction-site-and-airport`, `the-hood`, `races-and-rivals`, `vehicles`, `the-battlefield`, `gimmick-road`, `gimmick-road-` (Gimmick Road 2: the digit is dropped), `city-streets`, `road-gambles`, `fallout`, `road-dressing` | Only that group. | `/delivery/gimmicks.html?group=wildlife` | yes |
| `from` | card number | With `group`: only its cards from that one on. | `/delivery/gimmicks.html?group=wildlife&from=3` | untried |

**cargo.html**

| Param | Values | What it does | Example | Tried |
|---|---|---|---|---|
| `side` | `good`, `evil` | Only that side's items. | `/delivery/cargo.html?side=evil` | yes |
| `only` | item ids, comma list (list at the end) | Only those items. | `/delivery/cargo.html?only=doll,bees` | untried |
| `still` | bare | Every model frozen at one moment. | `/delivery/cargo.html?side=evil&still` | yes |
| `t` | seconds (default 2.4) | With `still`: which moment. | `...&still&t=1` | untried |
| `turn` | radians (default 0.5) | Every model turned to that side. | `...&still&turn=3.14` | untried |

**editor.html** (meant for pictures of the editor; all untried except `level` and `tab`)

| Param | Values | What it does |
|---|---|---|
| `level` | a level **id** (e.g. `farm`), or `blank` | Opens that level. **With `level` in the address the editor does not autosave** (your edits there are lost on reload unless you Download .json). |
| `tab` | `level`, `road`, `place`, `list`, `json` | That side tab open (tried: `list`). |
| `q` | text | Search box filled in. |
| `hide` | kinds, comma list | Those kinds hidden on the map. |
| `tool` | `<field>` or `<field>:<kind>` | That placing tool picked. |
| `click` | `<m>` or `<m>:<lat>`; repeatable | Clicks the map there with the tool (places a thing). |
| `sideclick` | `<exit>:<m>`; repeatable | Clicks on a side road. |
| `sel` | `<field>:<n>` | Selects that thing. |
| `drag` | `<field>:<n>:<p\|a\|b\|move>:<m>`; repeatable | Drags a thing that far. |
| `seglen` | `<segment>:<m>` | Resizes a road segment. |
| `bend` | `<segment>:<m on>:<m right>` | Drags a segment's handle. |
| `undo` / `redo` | times | Presses undo / redo. |
| `zoom` | `<m>:<px per m>` | Zooms the map there. |
| `scroll` | pixels | Scrolls the side panel. |
| `view` | `3d` | The 3D view open. |

Without `&level=`, edits made by these switches (`click`, `drag`, `seglen`...) go into the editor's autosave and
**replace your autosaved editor work** (not your game save). Example: `/delivery/editor.html?level=farm&tab=list` (tried).

**modeleditor.html** (the car model editor: a car's model part by part, edited as a patch; how-to at the top of
`src/delivery/modeleditor.js`, the patch format in `src/delivery/render/modelpatch.js`)

| Param | Values | What it does | Tried |
|---|---|---|---|
| `car` | a car **id** (roster or idea, e.g. `commuter`, `circuswagon`) | Opens that car (default `commuter`). | yes |
| `evil` | bare | Built and painted as Evil (colour edits can then go to the patch's `evil` list). | yes |
| `tab` | `parts`, `part`, `json` | That side tab open. | yes |
| `part` | a part id (`0`, `3.1`, an added `n1`, a mirror `m:12`) | That part selected. | yes |
| `view` | `front`, `rear`, `left`, `right`, `top`, `34` | The camera there. | untried |
| `dark` | bare | Blackout on from the start. | untried |
| `lights` | bare | Lights on: the night headlamp glow (render/lampfx.js, from the car's lamp table entry) and the view darkened. | yes (stills) |
| `brake` | bare | Brake lamps lit. | yes (stills) |
| `hazards` | bare | All four indicators flashing at 1.2 Hz. | yes (stills) |
| `left`, `right` | bare | The car's +x / -x indicators flashing (both = hazards). | left yes, right untried |
| `steady` | bare | Indicators lit steadily, not flashing. | untried |
| `lampmarks` | bare | Lamp markers on (labelled, as `?lamps=show` in the game). | yes (stills) |
| `lampt` | seconds | Holds the flash clock at that time for a still: 0 lit, 0.5 dark. | yes |

The editor keeps every car's patch in this browser (localStorage `delivery.modelpatches`, per car) as you go; the
address changes as you pick a car, a tab or a part (bookmark it). Keys: G / R / S move / rotate / scale, Delete,
Ctrl+D duplicate, M mirror across the car, Ctrl+Z / Ctrl+Y, F frame the part, Esc let go.

**The model patches in the game** (any page that builds a car's model: the game, the garage and its inspector, the
showroom, the stills, the ideas lot)

| Param | Values | What it does | Tried |
|---|---|---|---|
| `modelpatch` | `local` | The model editor's own patches from this browser (over the files' ones) instead of only `src/delivery/modelpatches/<car id>.json`: a quick look at an edit. E.g. `/delivery/?garage&inspect=commuter&modelpatch=local`. | yes (the inspector, a run) |
| `modelpatch` | `off` | No patches at all: every model as its code builds it. | untried |

`?edited&clock` on the game page is used by the editor's "Work out the clock" button (it loads the game out of
sight); there is no reason to type it.

---

## Gotchas

- **Tiers block autostart.** On a fresh save, `?autostart&level=27` opened the garage ("No car for this level")
  instead of starting, because Hong Kong is a tier you have no car for. Add `&tiers=0` (tried: it then starts). The
  same for `?autostart&car=sixteen&cine=car`: on level 1 the tier rule put the Commuter in; with `&tiers=0` the
  Sixteen showed (tried).
- **`level` is a number, `beaten` and the editor's `level` are ids.** The README's `?level=<id>` is out of date: an id
  there is read as level 1. Numbers move when a level is added before it (list below).
- **The `index.html?` trick is only for scripts/shots.mjs.** That script adds `?autostart` to any address starting with
  `?` unless it names a mode (autostart, hidden, test, edited, screensaver, racewatch, garage, album, milestones), so
  menu pictures there are written `index.html?shop`, `index.html?showroom`... In your own browser `/delivery/?shop`
  is the menu with the Shop open: nothing autostarts unless you ask.
- **Menu-only screens.** `shop`, `album`, `milestones` only open when the page starts on the menu, so they do
  nothing together with `autostart` (or `hidden`, `test`...).
- **Same name, different meaning by context:** `tab` (garage: `ideas`; menu: `races`/`events`; editor: its tabs),
  `look` (garage car / idea; showroom card), `click` (garage: CSS selectors; editor: map clicks; the menu uses
  `do=click:` instead; `click` does nothing on the menu or showroom), `evil` (run / showroom / banner), `side` (menu
  vs cargo.html), `only` (keys vs cargo.html), `from` (pack vs gimmicks.html), `turn` (degrees with `cine=car`,
  radians on cargo.html), `reveal` (fly vs pack), `deliver` (seconds with autostart; bare with `event`).
- **`event&deliver` needs a usable car** (`&owns=<a car the stage allows>`); without one, nothing starts (tried).
- **Fresh-save showroom shows silhouettes**: a car of a closed tier is "Locked car". Add `&owns=<id>` or `&demo` to
  see it whole (tried with `owns=sport`).
- `hover`, `look`, `tab`, `click`, `sort`, `show`, `studio`, `inspect` (and its `view`) act only with `?garage`; `look`, `full`, `filter`,
  `filters`, `bp`, `bounce`, `nostats` only with `?showroom`.
- Not on `main` (only on unmerged branches, so they do nothing here): `?ge=` (Good/Evil cue ideas), `?poses=`,
  `?poselab` (blueprint pose lab).

## Handy recipes

All prefixed with `https://delivery.pingmathehippo.com/delivery/`.

- An Evil car-idea in the lot, with its card: `?garage=evil&tab=ideas&look=limo` (tried)
- A pack's What's inside: `?shop&inside=comet-special` (tried), or the 10-pack `?shop&inside=ten`
- Open a pack and see every card: `?pack=standard&reveal=all` (tried); with a Bespoke key: `?pack=bespoke&reveal=all` (tried)
- Today's Concept Strike on a chosen day: `?event=concept-strike&eventsnow=2026-10-14` (tried; change the date to see another day's car)
- The tablet flicker test with everything off: `?lite=all&shop&inside=standard` (tried); then turn one back on at a time, e.g. `?lite=glow,twinkle,shine&shop&inside=standard`
- A car in the showroom's full view: `?showroom&owns=sport&look=sport&full` (tried)
- Every key: `?keys=all&card`; each key car's own: `?keys&card` (tried)
- Drive any level in any car, safely: `?autostart&level=27&tiers=0&car=hotrod&ghost` (the parts tried separately)
- A level's menu still: `?autostart&level=1&ghost&cine&ff=4&at=300` (tried)
- A car alone on white, from behind: `?autostart&tiers=0&car=sixteen&cine=car&turn=180` (tried without `turn`)
- Look round the menus with a made-up full save: `?demo` (tried)
- The whole HUD at once: `?autostart&level=1&hudcheck=many&ff=2` (tried bare `hudcheck`)
- Fly round a level: `?autostart&level=27&tiers=0&fly` (tried on level 1)

## Lists (13-Oct, v1.1.100)

**Level numbers** (for `level`, `pick`, `cursor`; ids for `beaten` and the editor): 1 expressway, 2 back-roads,
3 farm, 4 big-business, 5 hurricane, 6 night, 7 mystery-meadows, 8 suburbs, 9 canberra, 10 monte-carlo, 11 singapore,
12 singapore-night, 13 grand-pacific, 14 passage-du-gois, 15 safari, 16 airport, 17 construction, 18 the-hood,
19 panorama-avenue, 20 speed-trap-alley, 21 mountain-pass, 22 outback-express, 23 tour-de-coast, 24 ring-road,
25 market-town, 26 quarry-run, 27 hong-kong, 28 tokyo, 29 mumbai, 30 stelvio, 31 christmas, 32 toys, 33 leaks, 34 moon,
35 backlot, 36 venice, 37 iceroad, 38 park, 39 cinder, 40 docks, 41 noon, 42 morro, 43 rice, 44 derby, 45 seaquake,
46 farside, 47 stunts, 48 ponti, 49 glow, 50 erupt, 51 cattle, 52 thaw, 53 fallout, 54 shift, 55 descent, 56 monsoon,
57 all-heck, 58 ufo, 59 marina-bay (race), 60 oh-mine, 61 montreal (race), 62 bathurst (race), 63 rival-run,
64 showdown, 65 battlefield, 66 slipway (amphibious), 67 harbour (amph.), 68 flood (amph.), 69 ford (amph.),
70 fjord (amph.), 71 monza (race), 72 spa (race), 73 albert-park (race).

**Themes** (`theme`): city flooded farm beach singapore singaporeNight coast safari construction airport snow canberra
hood suburb hell battlefield bathurst panorama montreal sea monza spa albert-park space night hongkong tokyo mumbai
christmas toyroom seabed moon backlot venice iceroad iceroadThaw themepark volcano port themeparkNight volcanoErupting
portNight wildwest favela rice favelaRain riceMonsoon fallout.

**Mysteries** (`mystery`): rickety toad angel jerk invincible noBrakes insuranceUp insuranceDown ufo bulletTrain
soupedUp earthquake rewind giant swapSides magnet blackout trafficFreeze, and sundayDrivers rushHour carSwap moodSwing.
One that does not suit the level becomes `invincible`.

**Cars** (`car`, `owns`, `look`, `hover`...): commuter junker darkvan postvan keitruck mini lovebus wagon sport lowrider
hothatch ute buggy liftedtruck hearse minivan pickup hotrod sleeper rally towtruck rotary taxi suv miata gullwing
rearengine snake polytruck muscle fullsize evsaloon superlowrider classicgt sixbysix herald floatvan toybota dampervan
nissank tank; earned: hellrod earned-ufo earned-gt earned-jetboat earned-f1 earned-lmp courier showdown earned-apc;
key cars: silvercomet rocketfin swancar solarracer moonrover snocat hotdog horseshoe and the concepts
fishbowl midsummer sixteen quadturbo knifeedge windsong; blueprint cars: bubble milkfloat tuktuk woody pandacoupe
keiroadster fireengine fieldscout monster stately teardrop pony goddess hardtop midnight splitwindow wedge jetcar
dragster flyingcar blower coach cityev coupecross.

**Car ideas** (garage `tab=ideas` `look`/`hover`, `studio`): threewheeler tinsnail bug twostroke brickestate limo
centreseat rallywedge safari widetruck corrugated foodtruck motorhome schoolbus doubledecker funeralcoach golfcart
hovercraft steamwagon tipper dunebuggy creamvan yellowcab mixer wrecker policewagon camper boathauler armoured cigar
sidecar monowheel bathtub circuswagon gyrocar mower snailcamper duckwagon pushbacktug roadsweeper cabledrum gameviewer.

**Packs** (`pack`, `inside`, `give`, `limits`, `shopbuys`): standard ten career daily comet-special car-hunt-special
car-hunt-5 concept-strike-1 to concept-strike-6 supercar-special classic-special record-special cruiser-special.

**Cargo** (cargo.html `only`): Good: pizza pancakes ramen cactus clock goldfish bouquet present teaset canary bonsai
lavalamp surfboard sushi cake globe toolbox record balloons coffee telescope trophy puppy sundae snowglobe casserole
kittens jumper books fruit radio. Evil: parcel porcupine bees doll tentacle egg cooker flytrap barrel mirror skunk
cannonball mimic fireworks alien teddy bats ice snakes genie reactor goose jack cloud piranhas lawyers chainletter
glitter recorders subpoena telemarketers taxmen wardens consultants inlaws band piecatapult airhorn ghost nestedboxes
spider ink.
