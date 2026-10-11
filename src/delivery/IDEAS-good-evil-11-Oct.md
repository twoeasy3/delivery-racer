# Ideas: showing in-game, subtly, whether a car is Good or Evil (Q32)

Ideas only, for the owner to choose from. Nothing is built. Written 11 Oct.

## How the game shows the side today

- **Paint, and only paint, on the car.** Each car has `color` and `evilColor` (`cars.js`), swapped by `paintShowCar`
  (`render/garage.js`) and by `render/items.js` (`const livery = Player.evil ? CAR.evilColor : CAR.color`); a few models
  also have a `userData.livery(evil)` hook for parts that differ (`render/models.js`). Traffic's generic paints are
  bright for Good and dark for Evil (`render/cars.js` PAINTS).
- **The paint is not a reliable signal.** Many cars have dark Good or bright Evil palettes (Hearse: black Good, white
  Evil; Post Van red/yellow; Snake Roadster blue/near-black; Gullwing and Polytruck grey/dark grey). Some pairs are
  close in value. So "dark means Evil" cannot be the rule.
- **Menu / garage:** the Good/Evil toggle (`render/menustage.js` `pickSide`, key E; garage `Livery:` button). The
  Good/Evil page uses a halo and horns badge pair (`sides.js` HALO/HORNS) that is not used in the game itself.
- **While driving:** no side marker on the car, the HUD or the road. The side shows only indirectly: the clock is
  shorter (`clockFor` in `game.js`), the cargo corner shows an Evil item calm, agitated or furious as the clock runs
  down (`render/cargo.js` `drawCargoCorner`, `cargo.js` `cargoState`), packages are flaming or gifts, and traffic
  reacts (`messages.json` goodOnGood / evilOnGood, mood faces in `render/emotes.js`).
- **Sound:** nothing per side. Engine WAV is by car (`render/audio.js` `Sound.engine`).
- **Results:** a text line "Good | Evil" in `game.js` and the postcard stamp (`style.css` `.postcard .stamp.evil`).
- **Traffic is Good or Evil for life** (`car.evil`), with the same paint rule, so a marker that works on the player's
  car can also mark traffic, which helps the player read the road.

Design rule for all ideas below: it must read without relying on hue or on dark/light value, and it must not add a
HUD element.

## Ideas

### A. On the car

1. **Halo ring / horn arcs under the car (ground decal).** A thin ring of light on the road under the car: a soft
   warm-white full ring for Good, two short dull-red arcs (the "horns") for Evil. The shape differs, not only the
   colour. Hook: a flat quad next to the car mesh in `render/items.js`, built on the same pattern as the traffic beam
   quads in `render/headlights.js` (`syncTrafficBeams`), which also makes it work for traffic. Cost: small.
   Risks: night levels (use additive blending, as the beams do); water levels. Works for ALL cars, since it is
   independent of paint: dark Evil palettes are fine.
2. **Underglow tint with a pulse.** A faint coloured glow under the body, cool white for Good, ember for Evil, with a
   slow pulse for Evil only. Hook: `render/headlights.js` (a tinted beam quad, not a real light: adding a light makes
   three.js rebuild materials); `Player.evil`. Cost: tiny to small. Risks: colour-only unless the pulse carries it.
   Works for all cars.
3. **Tail-light signature.** Brake lamps and halos (`render/cars.js`, `lamps`, `brakes`, `halos`, near line 150) keep
   their job but differ in shape: Good round, Evil narrow slits. Hook: the lamp setup in `render/cars.js`, and the
   player's lamps in `render/items.js`. Cost: small. Risks: models with their own lamps (`userData.lights`) need a
   fallback to the default. Works for all cars (shape, not colour), and the camera is behind the car, so it is seen.
4. **Exhaust and wheel dust.** Good leaves a thin pale puff; Evil a darker one with an occasional spark, every second
   or so at speed. Hook: `emitVehicleSmoke` / `emitSmoke` in `render/effects.js`. Cost: tiny. Risks: weak on pale
   roads; damage smoke already exists, so use a different cadence. Works for all cars.

### B. On the road and camera

5. **Camera sway and field of view.** Good: a very slightly wider, calmer chase camera. Evil: a touch tighter and
   lower, a little more speed shake. A few percent, never a visible mode. Hook: `updateCamera` in `render/scene.js`
   (`camera.fov`, `CONFIG.camFov`). Cost: tiny. Risks: motion comfort (keep to about 3 degrees, tied to the existing
   speed effects); invisible in a still. Works for all cars.
6. **A faint screen-edge grade.** The screen edge goes very slightly warmer and darker for Evil, slightly brighter
   for Good. Hook: a CSS overlay on `#game` (`style.css`; cheapest and phone safe) or `applyLight` in `render/scene.js`
   as a multiplier on the level's own look. Cost: tiny. Risks: fights strong level looks (night, storm); make it a
   value change, not a hue change, for colour-blind safety. Works for all cars.
7. **Traffic reads you.** Make the existing reactions visible: a one-off greeting face from a passing driver (a wave
   for Good, a wary look for Evil). Hook: `syncEmotes` in `render/emotes.js` already shows mood faces over cars;
   add a "greeting" when a car passes alongside, using the goodOnGood / evilOnGood lines in `messages.json`. Cost:
   small to medium. Risks: more faces on screen, so rate-limit hard. Works for all cars (it is about traffic).

### C. HUD and UI

8. **Cargo corner as the one tell.** The cargo tile (`drawCargoCorner` in `render/cargo.js`) is already per side and
   already changes state with the clock. Give it a thin halo arc for Good or a pair of small horns for Evil (the
   `sides.js` badges), and nothing else: no new element. Hook: `drawCargoCorner` plus `cargohud.css`. Cost: tiny.
   Risks: only a "if you look" signal; the phone layout is tight, so draw inside the existing tile. Works for all cars.
9. **Side in the clock's rim.** The clock digits get a hairline rim: rounded for Good, with tiny notched corners for
   Evil. Hook: the clock's style in `render/hud.js` `updateHud` and `style.css`. Cost: tiny. Risks: clutter beyond a
   hairline; the notch has to carry it, not the colour. Works for all cars.
10. **Menu and garage: a badge on the car.** Show the halo or horns glyph beside the car name for the livery on show,
    so the in-game mark is learned in the menu first. Hook: `refresh` in `render/garage.js` (the `liveryBtn` text) and
    the car view in `render/menustage.js` (near line 274). Cost: tiny. Risks: none; a teaching aid for 1, 8 and 9.
    Works for all cars.

### D. Sound

11. **Engine voicing.** A very small filter or detune on the engine loop per side: Good a hair brighter, Evil a hair
    lower with a slow rough growl. Hook: `Sound.engine(speed, car, top, gain, pitch)` in `render/audio.js` (`pitch`
    exists; `engine.filter` is the knob for the synthesised one). Cost: tiny. Risks: invisible with sound off (phones
    are often muted), so never the only signal; keep within the WAV set's own variety so it does not sound like a
    wrong car. Works for all cars.
12. **A one-shot cue at the start line.** On "Go", a soft chime for Good, a low two-note sting for Evil, quiet.
    Hook: the start call in `game.js` / `main.js`, reusing an existing sample from the `Sound` table. Cost: tiny.
    Risks: becomes a habit the player ignores, which is fine for a mood-setter. Works for all cars.

## Recommended three, combined

**1 (ground halo or horn arcs) + 8 (cargo corner glyph) + 11 (engine voicing).**

The ground ring is the only idea that puts the side on the car itself, in view of a camera that sits behind it, in a
shape that does not depend on paint, so it works equally for the Hearse (black Good) and a pale Evil car. It also
extends to traffic for free through the existing beam quads, which turns it from a self-label into a readable road.
The cargo glyph costs almost nothing, uses the one HUD element that is already per-side, and teaches the same
halo/horns shapes, so the ring is understood the first time it is seen. The engine voicing is the sound layer, so the
side registers by ear when the player is watching the road rather than the corner; being tiny and non-essential, it
adds no risk. Together they are three independent channels (shape on the road, a mark in the corner, a voice), none
loud on its own, and no colour is needed for any of them.

Combinations that fit: **1 + 2** (the same quad, with a pulse for Evil), **5 + 6** (one "mood grade" function that
nudges camera and screen edge, switched off together), **10 + 8** (the menu teaches the game's badge). Idea 7 is the
most game-like but needs the most tuning; 4 and 9 are safe low-effort extras.
