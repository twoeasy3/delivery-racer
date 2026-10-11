# Scratchpad: prank cargo C (P8 Boxes within Boxes, P9 Spider on a Fishing Line, P10 Disappearing Ink), 12-Oct

Suspended on the owner's stand-down. Branch `delivery-prank-c`, worktree `.claude/worktrees/delivery-prank-c`
(its node_modules is a junction to the main checkout's: `cmd /c rmdir <worktree>\node_modules` before removing it).

## DONE (all committed on the branch)

- `4cc6d0b` the three models in `src/delivery/render/cargoModelsPrankC.js` (ids `nestedboxes`, `spider`, `ink`),
  spread into `CARGO_MODELS` (cargoModels.js), added to `CARGO.evil` (cargo.js) and `cargoText.json` (names,
  blurbs, state phrases: Wrapped / Opening / Gotcha; Hanging / Bobbing / Dropped; Corked / Blotting / Splashing).
  Cosmetic only, no hooks, not named by any level (the owner's brief: available Evil cargo, not wired to levels).
- `1c80083` `scripts/.cargo-check.mjs`: "every item turns up" exempts the ten prank ids (`UNASSIGNED`), on the
  orchestrator's decision; every other test there still covers them.
- `1acc69d` (WIP): the quill's vanes stand in the shaft's plane so the feather reads broad from the front.

## Seen (stills, all read)

- `<scratchpad>\shots1\front.png`
  boxes and spider, calm / agitated / furious, from the front (`cargo.html?side=evil&only=...&still&turn=0`)
- `...\shots1\side.png` (turn=1.57) and `...\shots1\back.png` (turn=3.6): the same from the side and behind
- `...\shots1\ink-front.png`, `ink-side.png`, `ink-back.png`: the ink bottle's three states (before the vane fix)
- `...\shots2\ink-front.png`: the ink bottle after the vane fix (feather broad); `...\shots2\all-high.png`
  (turn=0.8, t=4.2) taken but NOT looked at.
  All three read as their own outlines in each state: one cube / two tiers / a tower with GOTCHA; hanging / bobbing /
  on the ground with red eyes; corked / cork hung and blots / tipping, grin, fan of blots, blue blotter.

## NOT seen / not checked

- The transitions between states (the cargo page's ?still snaps a state; a run in the game would show them).
- The HUD's round window and the 112x84 level card at size: judged only from the page's ~350 px views.
- The kerb set-down. No level names these items, so the only way to see one in play is to name it in levelText.json
  (`"cargo": { "evil": "spider" }` on a level) for a look, then take it out.
- Checks run: `node scripts/.words-check.mjs` (passes but for carText.json's Junker blurb, 83 > 70 characters,
  from 1a90c09 on main, being fixed by the carfix agent); `node scripts/.cargo-check.mjs` passes after 1c80083;
  `node --check` on the model file. eslint was not run (node_modules/.bin/eslint is not in the junction's bin).
  `git merge main` was NOT done yet.

## Next step for whoever resumes

1. `git merge main` in the worktree (keep both sides of any conflict in cargo.js, cargoText.json, cargoModels.js:
   agents A and B add their own ids to the same lists), rerun `.words-check.mjs` and `.cargo-check.mjs`.
2. Optionally name one level per item in levelText.json for a run-through look at the HUD window and the kerb, and
   take it out again (or leave it if the owner wants them placed).
3. Report to the orchestrator: branch, commits, the still paths above.

## Traps

- Heavy lock: none held now (released after the last shots). No background jobs left; no extra worktrees.
- `.cargo-check.mjs` lists ten ids in UNASSIGNED including A's and B's; if an id is renamed there, change it here.
- cargoModelsPrankC.js keeps its own helper set (as cargoModels3.js does); the spider computes its rod tip with
  `all.updateMatrixWorld(true)` + `worldToLocal` each frame, and the boxes' lids open past vertical (FLAT + 0.35) on
  purpose: a lid short of vertical would lean into the box rising out of it.
