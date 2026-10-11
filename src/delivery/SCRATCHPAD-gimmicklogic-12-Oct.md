# Scratchpad: gimmicklogic (12-Oct)

Branch `delivery-gimmicklogic`, worktree `.claude/worktrees/delivery-gimmicklogic`. Not pushed. Main merged in at `b6e170c`.

## Done (commits)
- Q40 `ac38311`: souped up with no Super variant upgrades nothing and says the owner's line (messages.json `soupedUpNone`); invincible fallback gone.
- Q5 `aa6e4a8`: turbo scales the bend speed limit in proportion (owner confirmed supercharger = turbo).
- Q7 `7c22205`: drop bears trigger distance + speed x fall time (2.2 s).
- Q43 `77b6fd9`: UFO burn starts as the saucer begins to hover.
- Q11 `bff1b2f`: interceptor counts as a police car for contact and evil packages (bust); sees nothing else.
- Q13 `98c5225` then `b92cafa`: funeral crash = jerk 10 s; now overrides a running mystery (endMystery first).
- `24c69ca`: .ufo-check and .pursuit-check updated for the new behaviour.

## Checked
Headless probes for each item (see commit bodies). Levels check, replay check passed before the last merge. After the last merge only the levels check was rerun ("all good"); the replay check was NOT rerun after the Q13 override and the last merge.
.mysteries-check has 1 failure (Lowrider souped-up) that also fails on main: not ours.

## Not done / not seen
Nothing played by hand; no stills. Override test covered toad only (toads cleared, jerk 10 s, ended clean); carSwap/soupedUp/noBrakes overrides rely on endMystery and were not run.

## Next step
Rerun `node scripts/.replay-check.mjs` and `node scripts/.mysteries-check.mjs` on this branch, then the orchestrator merges.

## Traps
`git merge` aborts with uncommitted edits: commit first. No heavy lock held, no background jobs, no extra worktrees (the temporary gl-main worktree was removed).
