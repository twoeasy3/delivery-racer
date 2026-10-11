# Scratchpad: Good/Evil ideas 5, 6, 7 (area B, road and camera), 12-Oct

Branch: delivery-ge-road. Worktree: <repo>\.claude\worktrees\delivery-ge-road
(node_modules is a junction: `cmd /c rmdir <worktree>\node_modules` before ever deleting the worktree).

## DONE (code written, each its own commit, on branch only, nothing merged)
- 074b9d5 src/delivery/sidecues.js, the shared `geOn(n)` switch (`?ge=5,6,7` or `?ge=all`).
- 20996f1 idea 5, `?ge=5`: render/scene.js updateCamera. Good: fov +1.5 deg (wider); Evil: fov -1.5 deg, camera height -5%,
  sine sway (0.08 m vertical, ~0.004 rad roll) growing with speed squared. Eased in over about a second. No allocation.
- e9d8359 idea 6, `?ge=6`: new render/sidegrade.js (called from main.js after syncEmotes). One fixed click-through div,
  radial gradient: Good edge +16% warm white, Evil edge 40% near-black (value change). Shown only while playing.
- 49cdafe idea 7, `?ge=7`: render/emotes.js + render/faces.js. A Good traffic car (not police, emergency, racer) within 7 m
  along and 1.4 to 8 m across of the player gets a 2 s face: Good player: happy face that rocks (wave); Evil player: new
  "wary" face (raised brows, wavy mouth, orange) looking away. One greeting per 7 s globally. Did NOT reuse the
  goodOnGood/evilOnGood lines: those are about packages thrown, not a greeting; only faces are used.

## NOT done
- NO stills taken at all (no before/after pairs, no phone 360x640 or 390x700 judgement, no storm or night check).
  The heavy lock was busy for ~25 min (other agents); I won it only at the stand-down and released it unused.
- Nothing was run in a browser: not even a load of the page with the switch on. Only `node --check` on emotes.js passed.
- Not verified: ?ge=6 z-index 1 sits under the HUD and above the canvas (guess); the camera roll after lookAt
  (rotation.z add) behaves; greeting actually triggers in traffic density of a level.

## Next step for whoever resumes
Take the heavy lock, then in the worktree:
`node scripts/shots.mjs <dir> "a-good-off=@expressway&ghost&at=800&ff=6&car=commuter" "a-good-ge5=@expressway&ghost&at=800&ff=6&car=commuter&ge=5" ...`
(`ge=` passes through untouched; Evil: add `&autostart=evil`; night level id `night`, storm `hurricane`, cars e.g.
commuter, hearse, liftedtruck). Pairs for ge 5, 6, 7 (7: several `at` values, look for a face), then read each still.
Phone: `--size=390x700`. Fix, commit, report.

## Traps
- Files are CRLF: edit with care (my Python edits kept CRLF).
- Evil sway uses Math.sin of a time accumulator in scene.js (moodT), not random.
- Background waiter script left at <TEMP>\claude\wait_lock_road.sh (finished; harmless).
No extra worktrees, no running jobs, lock released.
