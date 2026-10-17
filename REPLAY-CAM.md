# Replay camera vs set dressing (CHECKLIST 472)

Branch `claude/replay-cam-fade` from main 5c0d89d (v1.1.154-alpha). Render-only: replay fingerprint 057a22806d / legacy 661de07fbe before and after.

## The problem (sweep of main, before)

The replay camera is the orbit camera (`render/orbit.js`: a replay being watched, a run that is over). Its "nudge" ray-tests the
scenery every 0.1 s and, when anything is in the way, RAISES the camera (up to +34 degrees) or DRAWS IT IN, or gives up to the chase
camera. Sweep: one level per theme (about 36 of 62 themes reached before the owner's rush), 3 places x 5 orbit poses each, 390x844.
"blocked" = the line from the wanted camera place to the car meets solid scenery; "struggled" = the nudge raised or pulled in the camera.
Stills of every pose (before): `/tmp/claude-0/-home-user-delivery-racer/d5c3b697-cfe8-54f1-aad3-35e8af561b80/scratchpad/replay-cam/sweep/<level>-<place%>-<yaw>.png`.

Worst (blocked / struggled of 15):

| Level (theme) | blocked | struggled | what |
|---|---|---|---|
| metro-run (metro) | 15 | 15 | the station/tunnel shell (one ~60 m mesh): NOT faded, a gap |
| mall-dash (mall) | 15 | 15 | the hall's shell (1100 m merged mesh): NOT faded, a gap |
| mumbai (mumbai) | 7 | 3 | instanced buildings, signs |
| singapore-night / singapore | 5 / 3 | 3 / 2 | instanced towers, trees |
| albert-park | 5 | 9 | trees (instanced) |
| leaks (seabed) | 4 | 10 | instanced kelp, rocks |
| alpine-pass | 4 | 7 | the mountain mesh (1347 m): land, a gap; chalets, firs fade |
| night / expressway (city) | 2 | 9 / 5 | city blocks, lamps (instanced) |
| noon (wildwest), morro (favela), venice | 3 / 3 / 2 | 7 / 6 / 6 | instanced houses, posts |

Not swept (rush): about 26 themes, those after the ones above in the sweep's order (see `replay-cam/sweep/sweep.json` for the 36 that were).

## The fix

`render/scenefade.js`, called from `main.js` once the camera is placed, ON only while the orbit camera or photo mode has the camera.
- Index (built once per level's scenery, when the orbit is first offered in a replay): every top-level object of `levelGroup` and every
  INSTANCE of its instanced meshes becomes a unit with a world box; flat strips, terrain, points/lines, ShaderMaterials, things under
  0.35 m tall and anything over 60 m across are left out. Units that make one thing (a wall with its windows and roof, a trunk and its
  crown) are joined into clusters (the smaller's middle on the bigger's footprint and touching; at most 40 m across). Clusters go in a
  12 m grid over the ground. Venice: 27,311 props in 3,928 clusters, built in ~150 ms (headless); city night 2,923 in 34 ms.
- Per frame: only the grid cells under the camera-to-car line (grown by the 0.9 m beam) are looked in; each cluster there is tested
  once (slab test on the line, ball of 2.5 m round the camera). Hit clusters ease to 1 over 0.15 s, others back to 0.
- Drawing: a 4x4 ordered-dither discard (screen door: no sorting, no transparent pass). Instanced: the fade rides in the instance
  matrix's unused element [3] (zeroed in the shader before use); the mesh gets a fading copy of its material while any instance fades.
  Loose objects: their meshes get a copy at one of 16 dissolve steps. Copies made once per material and kept; originals put back after.
- The orbit nudge now passes over what fades (`racewatch.firstSolid` skip), so the camera keeps its place; it still keeps out of the land and
  the big things.
- Off with the chase camera: nothing runs (no index, no test). No new WebGL context; no allocation of ours per frame.

Cost (`.replay-cam-check`, all 62 themes): clusters tested a frame at the poses median 9-17 by batch, at most 77 turning round the car (Metro Run); the fade's JS under 1 ms a frame once the copies exist; 0 when off (nothing built or run).

## Round 2 (after the owner read the pairs)

- NEVER WORSE THAN MAIN: what cannot fade is the old nudge's again. The nudge passes over a fading prop only when the prop's
  cluster box neither holds the camera nor lies within 2.5 m of it (`fadeProbe`: no camera inside a dissolve), and it now also
  tests a line to the car's sills (a long low block that does not fade, Night s 1468). Wild West s 2705: identical to main.
- LONG STRIPS: a single mesh more than 120 m across but at most 30 m tall (a hall's shell, a gallery, a tunnel lining; at most
  200,000 vertices) is cut at index time into 12 m pieces by where its triangles are; each piece is a unit, its fade a per-vertex
  attribute (`aFade`) read by a third kind of fading copy. Mall Dash: the camera keeps its 25 m (main pulled it in to 7 m).
- SIZES: faded up to 120 m across (was 60), and anything over 0.05 m tall (a rail counts; was 0.35 m); a big block keeps the
  windows on its face in its cluster.
- INDEX BUILD: sliced, 6 ms a frame (a generator), so no pause: Venice 27,311 props in 3,928 clusters, ~133 ms of work over ~17
  frames (the longest slice ~18 ms headless). Until it is ready nothing fades and the nudge works as on main.
- HITCH FOUND AND FIXED: a fading copy of a styled material (the city's and Vegas' buildings) deep-copied its userData through JSON,
  turning a canvas texture into a data URL: 200-800 ms frames. Now cloned without it (0.3-0.5 ms frames after).
- A sprite in the scenery made the orbit's ray throw (Raycaster.camera unset; Haunted Hollow, Dakar Dash): fixed in
  racewatch.firstSolid.
- Stills: matched pairs, round 1 `replay-cam/pairs/`, round 2 `replay-cam/pairs2/` (each with LIST.md) in the session scratchpad.

## Known gaps

- METRO RUN: the station's shell is now cut in pieces and fades round the line, so the car is clear, but the dissolved piece reads
  as a HOLE in the station (the dark tunnel shows through). Left as it is (the owner, 17-Oct).
- Terrain (alpine mountains, hills), cliffs and anything taller than 30 m and wider than 120 m: not faded; the nudge as on main.
- Moving set dressing (a crane, a carrier): its box is where it stood when the index was built.
- ShaderMaterial scenery (steelworks halos), points, lines and sprites: not faded.
- Themes where the check found no pose blocked only by fading props (nothing to show there, or only the land in the way): beach,
  moon, iceroad, iceroad thaw, space, roadworks, alpine, canberra, safari, toyroom, sea, battlefield, rainforest, halloween, farm,
  airport, volcano, volcano erupting, hell, autumn.
