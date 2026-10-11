# Scratchpad: the tests agent (12-Oct stand-down)

Branch `delivery-tests`, worktree `<repo>\.claude\worktrees\delivery-tests`
(`node_modules` there is a JUNCTION to the main checkout's: `cmd /c rmdir <worktree>\node_modules` before removing the worktree).
Based on main at 1077340, then main merged in (4425690 damage merge, 602b0ad). Never pushed.

## Done (commits, newest last)
- `b6a5a41` the quick smoke brought from 74 failures plus a crash to none (all stale tests, no game regression). Changes in
  `scripts/delivery-smoke.mjs`: owns every car (tiers: a tier level starts only in a car of its tier; without it `Game.start`
  refused from level 42 on and the older level's data was checked again: the 5 "starting a run loads", 24 hills, 12 drifters etc.);
  wide load / escort are knocks that stay (not blown up); shoulder rows found by the theme's kind (`themes.themedKind`) with the
  level built again without its own `obstacles`; UFO checks only on the level whose `car === 'ufo'` (Far Side has asteroids, not the
  UFO: the crash at line 514 was `rows[0]` of an empty row list on a level named `undefined`, `L.name` is gone: use `levelName`);
  drifter count from the level's data; hills' kink limit from the crests' own `ease`, and `high > 2`; the 6x6 (tier car on Far Side,
  Eruption Day) ignores rocks; boats on the water only (traffic list judged among kinds allowed at each vehicle's place, `Water.allows`);
  levels list: amphibious A1..A5; Outback Express has 4 crossings; tiers OFF from the 'steering' section on (car-vs-car sections would
  otherwise drive the tier's substitute twice).
- `4f5ab51` `delivery-smoke.mjs --levels=id,id` (only the per-level section, seconds); `delivery-probe.mjs` owns every car (it threw
  "Cannot read properties of null (reading problems)" on tier levels).
- `50ace05` `delivery-headless.mjs` boot takes `ownAll` and `tiers: false`; traits, mysteries, targets checks use them (all three had
  started failing: the tier's car put in for the one picked; targets threw on `Targets.items[i]` undefined).
- next commit: `.gimmicks3-check.mjs` expects a barrier's cost from CONFIG (22, was 30: damage by size).
- `51af0ad` WIP: `scripts/delivery-tests.mjs` (groups, `--list`, `--group`, `--changed`, `--fast`, `--dry`, `--levels=`, heavy lock
  taken by the runner, either of the two lock dirs, stale > 25 min removed) and `src/delivery/TESTS.md`.

## Quick smoke, before / after
Before (3600daf / 1077340): 74 failures + crash, 53 s (the run dies at the crash). After: `all checks passed`, 310-337 s on the
loaded machine (the smoke5 run was after main's damage merge). Not run: the FULL smoke (owner's order).

## Not done
- Runner groups verified by hand only partly. Run by the runner and seen to pass: `levels` (all 5 tests, 90 s), `smoke-levels`
  (6 s). Per-script (by hand, same code) all 29 light checks were run once: all pass EXCEPT `.words-check.mjs`
  (see below). Not run at all: `.ideas-check.mjs`, `.replay-check.mjs` (heavy; the runner was waiting for a lock when stopped), `--fast`
  and `--changed` end to end (only `--changed --dry`), `cars` group as a whole (ideas missing), the `tiers`, `gimmicks` and `water`
  groups through the runner (their scripts pass singly).
- `.words-check.mjs` FAILS, content not a stale test: `carText.json` junker blurb 83 chars, `gimmickText.json` blasts 88 and punctures 82
  (limit `BLURB_MOST` = 70, words.js). Blasts and punctures came with the damage merge (0e8005c). Shorten the three blurbs (owner's words).
- The group `smoke-quick` / `replay` `files` patterns in the runner are guesses at "what changed -> which group"; adjust as you learn.
- `scripts/.replay-check.mjs`'s `boot()` call lists `['commuter','sport','floatvan']` and owns all cars itself; other scripts that
  start a tier level headlessly were not audited beyond running them (level-clocks.mjs, tier-money.mjs, shots.mjs not run).

## Next step
1. `node scripts/delivery-tests.mjs --group cars,replay` (heavy: the runner takes the lock) and `--fast`; fix whatever fails the way
   above (own the cars; tiers off if it is about a car).
2. Fix the three blurbs (or raise nothing: the limit is the rule).
3. Merge `delivery-tests` to main when the owner agrees (touches only scripts/ and src/delivery/TESTS.md, SCRATCHPAD).

## Traps
- Never run the FULL smoke. Never `git ... --help` (opens a browser page): use `-h`. Never recursive-delete a worktree before
  removing the `node_modules` junction.
- npm scripts fail on this machine: run with `node` directly. The smoke is seeded 20261008; `--seed=n` for another.
- The mid-run lock folders in `%TEMP%` (`delivery-heavy.lock`, `delivery-heavy-2.lock`) at 12:06 and 12:08 belong to other agents;
  I hold none. Helper `run.sh` is in my session's temp dir, not in the repo.
- I killed my own background `node scripts/delivery-tests.mjs` jobs at the stand-down (child processes too); no jobs left.
