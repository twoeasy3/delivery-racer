# Brief: modelling cars for a lane-based delivery racer

Read this first. Then read `examples/junker.car.json`, the reference car: every modelling choice in it has a note. `FORMAT.md` is
the full format.

## The game, in ten lines

- A 3D delivery racer: the player drives a car down a multi-lane road, weaving through traffic to deliver a package before time
  runs out.
- The camera chases the car from **behind and above** (14 m back, 11 m up, a wide lens). On a phone the car is about
  **50-70 pixels wide**: small.
- It is played as Good (bright paint) or Evil (dark paint): every car has two liveries.
- The look is **chunky, flat-shaded low-poly**: big simple forms, flat colours, no textures, bold readable silhouettes.
- Cars are also seen up close: in a garage, a showroom that turns them round, and on collectible cards in five fixed poses (top,
  hero, front, rear, side).
- So a car must read **at 60 px from behind and above**, and look clean and solid **from every side up close**.

## What you deliver, per car

1. `<id>.car.json`: the spec (FORMAT.md).
2. `<id>-sheet.png`: the contact sheet that `tools/render.mjs` writes.
3. The output of `tools/check.mjs`: all PASS. Explain any WARN.
4. A short report:
   - which checks passed;
   - what you SAW on the contact sheet, view by view;
   - what you changed after looking;
   - what you did not verify.

## The loop (never skip a step; never claim done without both a look and a check)

```
node tools/render.mjs examples/mycar.car.json      # writes renders/mycar/mycar-sheet.png
# LOOK at the sheet. Say in words what you see in each view: the chase view, the poses, the ground contact, the mounts.
node tools/check.mjs examples/mycar.car.json       # PASS / WARN / FAIL with numbers; exits 1 on any FAIL
# fix, then render and check again
```

`node tools/serve.mjs` opens an interactive viewer (orbit, Good/Evil, wireframe, mounts, the checks).

## Units and axes

- Metres. Angles in degrees.
- **+z is forward** (the nose).
- **+x is the car's left**.
- **+y is up**, and **the ground is y = 0**.
- Centre the car on x = 0 and z = 0.

## Style: do

- **Silhouette first.** Judge the car in the chase view and its 4x zoom. Keep only detail that survives at card size: lamps, grille,
  glass, bumpers, wheels with hubs, one or two strong colour breaks.
- **Big closed solids that overlap where they join:** a loft or an extruded side view for the body, boxes and cylinders for details.
- **Wide and chunky.** Width / length about 0.44 to 0.50, wheels big and planted.
- **Windows FROM the body's outline.** Take the roofline and the pillar lines of the body's side view and inset them by a constant
  margin: 6-9 cm at the pillars, about 5 cm under the roof. The windscreen and the side windows share one top line. The glass sits
  ON the body, 0.5 to 2 cm proud of it, with no gap (see the hatchback and the van: their panes are computed from the outlines).
- **Wheels directly under the body**, their tops up inside it or under an arch, no gap over the tyre.
- Lamps as their own small parts, standing 1-2 cm proud of the face they sit on, and visible from straight ahead (headlights) or
  straight behind (tail lamps).
- Roles, not colours: `body` and `accent` follow the livery; everything else is a fixed role colour (FORMAT.md).

## Style: don't

- No panel lines, door shut lines, seams or handles. No fussy trim. Trying too hard is a defect.
- No scooped wheel wells carved into the body.
- No textures, images or text.
- No people, drivers or figures.
- Nothing see-through: glass is opaque dark blue-grey.
- No thin fiddly parts that vanish at 60 px.

## Defects that are not allowed (the checker looks for each)

| defect | what to do |
|---|---|
| **Z-fighting** | No two visible surfaces within a few millimetres in the same plane: a badge flush with a panel, two boxes sharing a face, a mirrored part sitting on the centre line. Stand parts at least 5 mm proud or sink them in |
| **Floating or unanchored parts** | Every part touches or overlaps the body: mirrors, lamps, spoilers, rails |
| **Open or void geometry** | Close every shape (the shapes are closed by construction; only glass and plate sheets may be open). Give insides a surface: an open bed has a floor, a cab has a back |
| **Unreadable at small size** | If the chase view's 4x zoom does not say what the car is, simplify and exaggerate |
| **Windows that float or ignore the contour** | The windscreen sits on the cowl and under the roof with no gap; side windows follow the pillar rake |
| **Wheels on legs** | Wheels sit directly under the body or an arch. No stalks, no wheels stuck out on axles (unless the car is meant to be open-wheeled: `openWheels`) |
| **Parts phasing through others where it shows** | Overlap is fine inside the body; a part poking out through another's visible face is not |
| **Lopsided** | The body is symmetric unless the spec says `asymmetric` (or a part says so: an exhaust) |

## Budgets (per car; the checker enforces them)

- Triangles: aim for 1,000-3,000. Never over 4,000 (5,500 for a truck).
- Meshes after joining: at most 40 (warn) / 60 (fail).
- Materials (roles): 16 / 18.
- Size: inside the class range (FORMAT.md).

The game's median car has about 1,850 triangles. The Junker has 2,352.

## Required parts

- **4 or more wheels**, in left/right pairs.
- A **body** in role `body`.
- A **windscreen**: glass tagged `windscreen`. Side windows are tagged `side-window`; a rear window is tagged `rear-window` if the car
  has one.
- **Headlights** (`light-front`, tag `headlight`) and **tail lamps** (`light-rear` / `light-brake`, tag `taillight` / `brake-light`).
  Indicators if the real kind of car has them.
- **Mounts**:
  - `roof`, `cargo` and `wing`: each is an area, or `none` with the reason.
  - At least one flank decal area, on both sides.
  - Number plates are recommended.

## The examples (all pass the checker; their sheets are in examples/sheets/)

| example | what it shows |
|---|---|
| `junker.car.json` | **THE REFERENCE.** A pickup: an extruded body, a lofted bed, a raked windscreen on the cab's own rake, wheels under the body, a tarpaulin load as the cargo prop, all four mount kinds |
| `hatchback.car.json` | A lofted lower body plus an extruded glasshouse with tumblehome. Every pane is computed from the outlines (the generator's maths is in its notes) |
| `van.car.json` | A two-part extrude (body + glasshouse), five windows a side on one top line |
| `panelvan.car.json` | **THE DECAL REFERENCE.** Flat flanks, a flat sloped bonnet and a flat back, each a clean paint panel with a decal frame. Nothing crosses the areas |

## How to report

```
car: <id>  class: <class>  triangles / meshes / materials: <from check>
checks: all PASS (or: WARN x because ...)
seen on the sheet: <chase view: ...; poses: ...; ground contact: ...; mounts: ...>
changed after looking: <...>
not verified: <...>
```
