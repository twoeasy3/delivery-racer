# Scratchpad: prank cargo B (P5 Custard Pie Catapult, P6 Air Horn under a Cushion, P7 Bedsheet Ghost), 12-Oct

Suspended on the owner's "write a scratchpad and suspend". Work is complete and merged with main; nothing is half-done.

- **Branch:** `delivery-prank-b`. **Worktree:** `.claude/worktrees/delivery-prank-b` (holds a `node_modules` junction: `cmd /c rmdir <worktree>\node_modules` before any recursive delete).
- **Heavy locks:** none held (released `delivery-heavy.lock` at ~12:12). No background jobs, no other worktrees.

## DONE (commits on the branch)

- `51466c8` first cut: `src/delivery/render/cargoModelsPrankB.js` (ids `piecatapult`, `airhorn`, `ghost`), spread into `CARGO_MODELS` in `render/cargoModels.js`; three entries at the end of `CARGO.evil` in `cargo.js`; names, blurbs and state phrases in `cargoText.json` (Set / Twitching / Firing; Primed / Parping / Blaring; Folded / Rising / BOO). It also named three levels, undone next.
- `ba3e570` the level assignments taken out again (levelText.json and levels/stunts, night, speed-trap-alley back to main's): the three are AVAILABLE Evil cargo only, as the owner asked; a level picks one by naming the id in its `"cargo": { "evil": ... }` in `levelText.json` (and the level's own file must say the same or the cargo check fails).
- `b2d4cc9` corrections after the stills: horn bell turned to the side so it reads in profile; coplanar faces removed (paddle on the arm, can shoulder and button); ghost hem above the trainers and the toes out past it; bubble clear of the sheet's tip; agitated arm lifted off its latch; bigger glowing eyeholes.
- `a166aec` merge of main (clean, no conflicts).

## Seen (stills, the cargo page, all three states, still at t=2.4 / 3.1)

Scratchpad dir: `<scratchpad>\`
- best: `shots3\front.png` (turn 0.5, the page's raised 3/4 view), `shots3\side.png` (turn 1.6), `shots3\back.png` (turn 3.5).
- earlier: `shots2\*.png` (before the last tweaks), `shots1\*.png` (horn bell facing the camera: fixed).
Made with: `node scripts/shots.mjs <dir> "front=cargo.html?side=evil&only=piecatapult,airhorn,ghost&still&t=2.4&turn=0.5" --size=1100x1650 --wait=4000` (needs a heavy lock).

NOT seen: the HUD round window, the 112x84 level-card tile and the kerb set-down (no level names these items now, so no game shot was possible without wiring one); the transitions in motion.

## Checked

- `node node_modules/eslint/bin/eslint.js` on the three files: clean (npx does not find node from Git Bash; run eslint by path).
- `node scripts/.words-check.mjs`: passes after the merge (the Junker blurb failure was main's, fixed there).
- `node scripts/.cargo-check.mjs`: ONE expected failure, "every item turns up": the three new ids are on no level. Per the orchestrator, agent prank-c makes one exemption commit for all ten prank ids in that check; do not edit `.cargo-check.mjs` here.
- Not run: smoke test (never), levels/replay/ideas checks.

## Next step for whoever resumes

Nothing needed for the models. If the owner wants levels to carry them: name the id in `levelText.json` and the level's own `levels/<id>.json` (draft's Suits lines: P5 Quiet on Set / Stunt Double / Monte Carlo; P6 Expressway / Speed Trap Alley / Rival Run; P7 Night Drive / All Heck / Mystery Meadows / Northern Lights), then shoot the HUD window and card tile to see them at size.

## Traps

- Worktree `mklink /J` from Git Bash printed a cmd banner and made nothing; use PowerShell `cmd /c mklink /J ...`.
- The cargo page frames every state on the furious bounds: the ghost's bubble and the flying pie set the frame, so calm states look small there; that is the page, not the model.
- The bubble is a flat card: seen edge-on (side view) it is a thin white sliver above the ghost's head.
