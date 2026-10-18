# The car format (carkit/1)

One car is one JSON file, `<id>.car.json`. It holds plain data only: no code, no textures. Fields whose names start with `//` are
comments, and every tool ignores them. You may also write the car as an ES module (`<id>.car.mjs`) whose default export is the same
object. Do that only if you want to compute numbers; the tools read both.

`engine/validate.mjs` is the authority on what is valid. Its error messages say where the problem is and what to do.
`schema/car.schema.json` repeats the same rules for editors.

## Units and axes

| | |
|---|---|
| unit | metres; angles in **degrees** |
| x | across the car; **+x is the car's LEFT** |
| y | up; **the ground is y = 0** (wheels touch it, nothing goes below it) |
| z | along the car; **the nose points to +z** |
| origin | the middle of the car's footprint: the model's box is centred on x = 0, and on z = 0 within 25 cm |

## The file

```json
{
  "format": "carkit/1",
  "id": "junker",                       // lower-case letters, digits, dashes
  "name": "Junker",
  "class": "tall",                      // small | medium | large | tall | truck (sizes and budgets below)
  "description": "one line",
  "livery": { "good": { "body": "#6b7343", "accent": "#4f5532" }, "evil": { "body": "#6f6c66", "accent": "#4a4845" } },
  "colors": { "rust": "#8a4b2a", "tarp": { "good": "#7a4cb0", "evil": "#b07a36" } },   // optional custom colours
  "parts": [ ... ],
  "wheels": [ ... ],
  "groups": [ ... ],                    // optional: pivots for moving parts
  "animate": [ ... ],                   // optional
  "mounts": { ... },                    // required: roof, cargo, wing (+ plates, decals)
  "asymmetric": false,                  // optional: true if the car is meant to be lopsided
  "openWheels": false,                  // optional: true if the wheels stand clear of the body on purpose
  "noWindscreen": "why"                 // optional: for an open car with no screen
}
```

(The `//` notes above are for this page only. JSON has no comments, so use `"//"` fields instead.)

## Materials are ROLES, not colours

Every part names a **role**. The game gives each role a colour and **shares one material per role**, so do not invent colours for
these:

| role | what | colour |
|---|---|---|
| `body` | the main paint: the livery colour, Good or Evil | `livery.*.body` |
| `accent` | a second livery colour (roof, stripes, bumpers in colour, wings) | `livery.*.accent` |
| `trim` | dark plastic: bumpers, sills, grille surrounds, mirrors | #2a2c31 |
| `black` | near black: grille holes, vents, gaps you can see into | #121418 |
| `glass` | windows: dark blue-grey, opaque (never see-through) | #232a35 |
| `rim` | wheel hubs (the default for `hubRole`) | #a8acb2 |
| `chrome` | bright metal: grille bars, lamp rims, old bumpers | #c4c7cb |
| `interior` | seats, dashboards seen through an open top | #1b1d22 |
| `underbody` | floor pan, chassis rails | #15171c |
| `plate` | a number plate (a blank cream panel) | #ece6cc |
| `light-front` | headlamp lenses (unlit, always bright) | #fff3c4 |
| `light-rear` | tail lamp lenses (unlit) | #ff2a2a |
| `light-brake` | brake lamp lenses (unlit) | #c4101c |
| `light-indicator` | indicator lenses (unlit) | #ffa31a |
| `light-reverse` | reversing lamp lenses (unlit) | #f4f4f0 |
| `paint:<name>` | a colour of your own from `colors` (one colour, or `{ good, evil }`) | yours |

The `tyre` role is set by the wheels: do not use it on parts.

## Parts

Every part has these fields:

| field | meaning |
|---|---|
| `name` | unique. With `mirror`, the two copies become `<name> L` (+x) and `<name> R` (-x) |
| `role` | see above |
| `shape` | one of the shapes below |
| `at` | `[x, y, z]`: where the shape's own origin goes (default `[0, 0, 0]`) |
| `rot` | `[x, y, z]` degrees, applied in that order. `rot x > 0` tips the front (+z) edge DOWN |
| `scale` | `[sx, sy, sz]` (optional; never on wheels) |
| `mirror` | `true`: also build a copy mirrored to -x (it turns the other way by itself) |
| `tag` | what the part IS (below). Glass, lamps and plates must be tagged |
| `prop` | `roof` / `cargo` / `wing`: a decorative item in that slot (a rack, a load, a spoiler) that a cosmetic replaces (hidden when one is fitted) |
| `group` | the name of a group in `groups` (it moves with it) |
| `smooth` | `true` / `false`: smooth or faceted shading (defaults: smooth for cylinder, cone, sphere, lathe; faceted for the rest) |
| `asymmetric` | `true`: this part is one-sided on purpose (an exhaust, a fuel cap); the symmetry check skips it |

**Tags:** `windscreen`, `rear-window`, `side-window`, `roof-window` (glass); `headlight`, `taillight`, `brake-light`, `indicator`,
`reverse-light` (lamps); `plate-front`, `plate-rear`; and the optional `mirror`, `bumper`, `grille`, `bed`, `door`, `arch`,
`exhaust`, `spoiler`.

### The shapes (each one is a CLOSED solid, except glass panels)

| shape | fields | notes |
|---|---|---|
| `box` | `size: [w, h, l]` | across, up, along; centred on `at` |
| `wedge` | `size: [w, h, l]`, `front`, `back`, `topWidth` | a box whose top is lowered toward the front (`front` = height share at +z, 0-1) or back, and narrowed (`topWidth` share). Good for noses, spoilers, ramps |
| `cylinder` | `radius` or `radii: [r-, r+]`, `length`, `axis` (`x` / `y` / `z`, default `y`), `segments` (12) | capped. `radii` tapers it from the -axis end to the +axis end |
| `cone` | `radius`, `length`, `axis`, `segments` | tip at the +axis end |
| `sphere` | `radius` or `radii: [rx, ry, rz]`, `segments: [around, down]` ([12, 8]), `dome: true` | `dome`: the top half only, closed flat underneath |
| `lathe` | `profile: [[radius, height], ...]`, `axis`, `segments` | a profile turned about the axis (+y by default). Open ends are capped |
| `extrude` | `profile: [[z, y], ...]` or `[z, y, r]`, `width`, `bevel`, `curveSegments` (3), `tumblehome` | **a SIDE VIEW outline** (in order round it; `r` rounds that corner), extruded `width` across the car, centred on x = 0. `bevel` rounds all its edges and GROWS the outline by `bevel` all round (the flanks stay at ±width/2). `tumblehome: k` narrows it linearly from its foot (full width) to its top (1 - k of it). Each flank stays one flat plane |
| `loft` | `sections: [...]`, `cornerSegments` (2) | **the body tool**: a skin through cross-sections along z (listed in any order; each needs its own z). Either every section is `{ z, w, y0, y1, topW?, r?, rTop?, rBottom?, x? }` (a rounded trapezoid: `w` wide at the bottom, `topW` at the top, from `y0` up to `y1`, corners rounded by `r`), or every section is `{ z, half: [[x, y], ...] }` (the +x half from the bottom middle, x = 0, up round to the top middle, x = 0; mirrored to -x; every section the same number of points). Both ends are capped |
| `panel` | `points: [[x, y, z], ...]` (3-16, a flat CONVEX outline in order), or `plane: "x"`, `offset: x` with `points: [[z, y], ...]`; `thickness` | a flat sheet: **for glass** (thickness 0 is allowed only for glass and plates). With `thickness > 0` it is a slab (a closed solid) |

## Wheels

```json
"wheels": [
  { "at": [0.95, 1.55], "radius": 0.42, "width": 0.3, "mirror": true },
  { "at": [0.95, -1.5], "radius": 0.42, "width": 0.3, "mirror": true }
]
```

| field | meaning |
|---|---|
| `at` | `[x, z]`: the wheel sits on the ground (its axle at y = radius). Or `[x, y, z]`: the axle centre |
| `radius`, `width` | metres |
| `hub` | the hub disc's radius as a share of the tyre's (0.55) |
| `hubRole` | the hub's role (`rim`) |
| `mirror` | `true`: a left / right pair |
| `axis` | the spin axis: `x` (across the car), the only one allowed |
| `segments` | round the tyre (16) |

Each wheel becomes a group `wheel FL` (front left), `wheel RR` and so on, holding a tyre (`tyre FL`) and a hub (`hub FL`). Each is a
mesh of its own that spins about x. The wheels are built for you, so do not model tyres as parts.

## Groups and moving parts

```json
"groups": [{ "name": "rotor", "pivot": [0, 2.4, 0] }],
"animate": [{ "target": "rotor", "type": "spin", "axis": "y", "speed": 12 }]
```

Parts with `"group": "rotor"` turn about the pivot. Coordinates stay in car space. The types are:

| type | what it does |
|---|---|
| `spin` | `speed` rad/s about `axis` |
| `swing` | ± `amount` degrees, `speed` swings a second |
| `bob` | ± `amount` m along `axis` |
| `shudder` | `target: "shell"` shakes the whole body but the wheels (an idling engine) |

A target may also be a part's name.

## Mounts: where cosmetics go (REQUIRED)

The game fits cosmetics to every car: a ROOF prop, a CARGO prop, a rear WING, number plates and DECALS. You mark where they go.
Each area is a FRAME:

| field | meaning |
|---|---|
| `at` | the middle of the area, **ON the surface** |
| `normal` | the way the surface faces, out of the body. Defaults: up for roof, cargo and wing; ±z for plates; +x for decals |
| `u` | the direction of the area's first side, for decals only. Default: along the car toward the nose. A decal on both flanks then points nose-ward on both, as the game's flank decals do |
| `size` | roof, cargo, wing: `[across, along]`, the FREE flat area. Decals: `[along u, the other way]`. Plates: `[width, height]` |
| `height` | roof, cargo, wing: the free height above the area. A prop of that size there touches nothing |
| `surface` | the name of the part it sits on |
| `side` | decals: `both` (`at` is the +x one, mirrored to -x), `left`, `right`, or `center` (one area on the centre line: a bonnet, a tailgate) |
| `maxDepth`, `maxCurve` | decals: how flat it must be (m, default 0.015) and how much its surface may turn (degrees, default 12) |
| `none` | instead of an area: why the car has none |

The slots:

| slot | meaning | rule |
|---|---|---|
| `roof` | a roof box, a sign, a light bar on the roof | every car with a roof has one; an open car says `none` with the reason |
| `cargo` | a load: a bed, a flat deck, an open back, a rack | only a car with a real load area; otherwise `{ "none": "a hatchback has no load bed" }` |
| `wing` | a rear spoiler: across the boot lid or rear deck, or the roof's rear edge on vans, hatches and pickup cabs | every car with a rear edge; `none` only for an open car with no rear structure |
| `plate-front`, `plate-rear` | a flat place about 0.42 x 0.12 m on the centre line, clear of lamps and glass | optional, recommended |
| `decals` | flat or gently curved panels of PAINT: flanks (both sides), bonnet, tailgate | at least one flank area on both sides |

To see them drawn, look at the last row of any example's contact sheet (`examples/sheets/<id>-sheet.png`). Each area is a
translucent box in its slot's colour:

| colour | slot |
|---|---|
| blue | roof |
| green | cargo |
| red | wing |
| white | plates |
| yellow | decals |

A test checkerboard decal is laid on every decal and plate area. The Junker's, as an example:

```
   side view, nose left
            [ roof: on the cab roof, 1.7 across x 1.1 along, 0.6 free above ]
   tailgate |cargo: the bed floor between the wheel tubs|  cab  | bonnet
   [wing]   |  1.1 x 1.7, 0.9 free above                |       |
            |  decal "bed side" (flank, both sides)     | decal "door" (both sides)
```

## Size classes and budgets

These were measured from the game's 159 wheeled cars. Sizes are the whole model's box, wheels and mirrors included. The game's cars
are a little bigger and clearly wider than real ones, so err WIDE: width / length about 0.44 to 0.50.

| class | what | length | width | height | wheel radius |
|---|---|---|---|---|---|
| small | city cars, hatchbacks, small roadsters | 2.6-4.4 | 1.45-2.4 | 1.0-1.95 | 0.24-0.5 |
| medium | saloons, coupes, estates, sports cars | 4.2-5.4 | 1.7-2.45 | 1.0-1.95 | 0.26-0.5 |
| large | limousines, land yachts, big saloons | 5.2-6.4 | 1.9-3.0 | 1.1-1.95 | 0.3-0.55 |
| tall | vans, pickups, MPVs, tall SUVs (1.8 m and up) | 3.4-6.4 | 1.6-2.9 | 1.8-2.8 | 0.28-0.65 |
| truck | lorries, buses, monster trucks | 4.8-12 | 1.9-3.6 | 1.5-4.0 | 0.3-0.8 |

| budget (warn / fail) | small, medium, large, tall | truck |
|---|---|---|
| triangles | 3,000 / 4,000 (aim for 1,000-3,000) | 4,000 / 5,500 |
| meshes after joining (draw calls) | 40 / 60 | 55 / 80 |
| materials (roles used) | 16 / 18 | 16 / 20 |
| parts after mirroring | 70 / 110 | 100 / 150 |

The game's own cars for reference: the median car has 1,850 triangles, 38 meshes and 12 materials. The Junker (pickup) has 2,404
triangles, 21 meshes and 15 materials.

## How the game sees what you build (for reference)

- Static parts are joined into one mesh per role. Glass panes, tagged props, plates, animated parts and the wheels keep meshes of their own.
- Glass panes are named `windscreen`, `rear window`, `side window L`... and carry their tag.
- The lamp tags become the game's lamp table: brake glow, indicators, night beams. A lamp's place is the middle of its lens's outer face.
- The mounts become the game's prop, plate and decal tables.
