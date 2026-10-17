# Replay camera vs set dressing (CHECKLIST 472)

Branch `claude/replay-cam-fade` from main 5c0d89d (v1.1.154-alpha). Render-only: replay fingerprint 057a22806d / legacy 661de07fbe before and after.

## The problem (sweep of main, before)

The replay camera is the orbit camera (`render/orbit.js`: a replay being watched, a run that is over). Its "nudge" ray-tests the
scenery every 0.1 s and, when anything is in the way, RAISES the camera (up to +34 degrees) or DRAWS IT IN, or gives up to the chase
camera. Sweep: one level per theme (36 of 62 themes reached before the owner's rush), 3 places x 5 orbit poses each, 390x844.
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

Not swept (rush): the remaining themes after metro in the list order were all reached; themes after it in HIDDEN_LEVELS were not.

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

Cost (`.replay-cam-check`): 5 to 24 clusters tested a frame (median 11), at most 1.4 ms in headless SwiftShader, 0 when off.

## Known gaps (not faded)

Huge merged/shell meshes over 60 m: the Mall's hall (mall-dash), the Metro's station/tunnel shell (metro-run), terrain (alpine
mountains, hills), the coast's cliff mesh (grand-pacific), tunnel shells. The nudge still handles them as before (raise / pull in).
ShaderMaterial scenery (steelworks halos) is not faded.
