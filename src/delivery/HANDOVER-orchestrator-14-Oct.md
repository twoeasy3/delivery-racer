# Delivery Racer: handover to the next orchestrator (14-Oct-2026, updated at the end of the second long cloud session that day)

This is the NEWEST and MAIN handover (it replaces the earlier 14-Oct text and the separate `-b` file; `HANDOVER-orchestrator-12-Oct.md` and `HANDOVER.md` are older: their counts and branch tables are out of date).
Read `CLOUD-AGENT-README.md`, `CLAUDE.md` and `CHECKLIST.md` first. Never run the full smoke test; never delete .wav/sound assets; car rules in `CAR-AGENT-PROMPT.md` (Junker is the benchmark); glass rules in `GLASS-AGENT-BRIEF.md`.

## How the owner works (learned the hard way this session: follow these)
- You are an ORCHESTRATOR. The owner gives short requests; you delegate each to a background agent (own git worktree under
  `.claude/worktrees/`, own branch, `node_modules` symlinked from `.claude/worktrees/agent-a7f05d0f2251f4f07`), forward its pictures with
  `SendUserFile`, and summarise. Agents often lack `SendUserFile`: they save images to `/tmp/<name>/` and you forward them.
- **Do not do model/code edits yourself** ("Why are you doing it yourself"). Merging, conflict reconciliation and pushes are yours.
- **LOOK AT THE IMAGES before passing them on and call out nonsense.** The glass agent lowered every windscreen to the side window and
  left a solid "sun visor" strip; the owner: "You were supposed to look at the images and call its nonsense out." Judge the picture, not the agent's numbers.
- **Never stop unfinished agents unless the owner VERY EXPLICITLY requests it** ("kill agent X"). "Stand down" or "stop spamming me" is NOT that: a misreading once
  stopped four agents' work and the owner was furious. A completed agent needs no killing: resume it with `SendMessage`.
- Merge or push to `main` ONLY when the owner says so (pushing `main` deploys `delivery.pingmathehippo.com`; the permission classifier blocks an
  unasked push). "Do ONE and I'll see if it got it right" means one car, show it, wait.
- Hash changes (replay refused) are accepted for gameplay features (ECU cost, ghost traffic). **Cosmetics must never change the replay hash**
  (ownership and designs live in `render/`, not `src/delivery/*.js`).
- The owner is blunt; answer briefly, own mistakes plainly, do not write essays. Honest verification notes in CHECKLIST items (what was / was not checked).
- The 2-slot screenshot queue (`scripts/shots.mjs`, `SLOTS = 2`, 4 CPUs) is the bottleneck when many agents render at once; tell the owner, offer "stagger".

## State of git (verify with `git fetch` and `git log origin/main`)
- `origin/main` = **v1.1.132** (8b8ddec): Chianti Run obstacles + Stolen Marble Bust fix (v1.1.131) and the render-side perf fixes (v1.1.132).
- **IN PROGRESS when this was written:** agent `ac7e4fe6fb90215eb` preparing branch `claude/merge-all-14oct` (worktree `.claude/worktrees/merge-all`), the
  owner-approved combined merge, v1.1.133, NOT pushed to main. Contents: ideas-batch-e5 (cabinGlass helper), the three approved Touring Car
  glass commits (d37b4d3, a0355b5, eed235c cherry-picked from glass-touring), window-audit, viewer-damage, ecu-followup, plate-cosmetic, theme-halloween
  (ghost traffic), theme-autumn, theme-rainforest, and `claude/great-hamilton-lhm0us`. Wait for its report ("safe to push to main: yes/no"), read
  it, then push only if yes. Expect: CHECKLIST renumbering, re-recorded `.platetag-baseline.json`, replay-hash change (ECU, ghost traffic).
- **Deliberately NOT merged (owner's decision):** `claude/glass-d1`..`d5`, `glass-e1`..`e4` (nine builder branches, built on the rejected
  strip version of `cabinGlass`), `claude/glass-helper` (superseded), `claude/perf-levels` (lazy level JSON: no measurable speed-up, forces a
  replay refusal, adds a manifest step; owner: "Leave it out"). The Wedge Microcar glass commit `0f0e952` is also out.
- About 45 old `claude/*` branches from earlier sessions show commits not on main (e.g. `blackout-sources`, `concept-strike`, ordinary-keys
  batches, `special-events`). Not inspected; likely merged by other routes. Do not touch without asking.
- Leftover worktrees under `.claude/worktrees/` (about 38): removable once the owner agrees. `window-sheet` has 2 untracked harness files.

## What this session did (all on branches/main as above)
- Idea cars D1-D5 and E1-E5 (Cinquecento discarded); car agent rules in `CAR-AGENT-PROMPT.md` (proportions, no scooped wheel wells, fewer angles +
  a lamps image per car, windows follow the body contour, plate anchors, catalogue).
- Cosmetics: global wheel colour, tyre/hub designs, wheel sets as ONE item, Cosmetics equip screen, ownership registry, "Unlock absolutely everything"
  (the owner later said he was wrong about it not working; it works), number-plate cosmetic with designs, player text and a filter.
- Hidden theme levels (`?hidden=<id>`, in `HIDDEN_LEVELS`): Haunted Hollow (ghost traffic: intangible and untargetable while ghostly, upset when driven
  through), Chianti Run (Tuscany), Foliage Run (autumn), Jungle Highway (rainforest), Dakar Dash (desert).
- ECU upgrades cost bank; blueprints only unlock; follow-up (keyless key cars may buy ECUs, ECU UP glow); bars still show full/overfill when an upgrade is available.
- Model viewer damage states; wheel-trim removal on concept cars (merged trims bounced with the car); stolen bust cloth fixed.
- Perf: profile (`src/delivery/PROFILE-menu-14-Oct.md`, `scripts/perf-menu.mjs`) and the render-side fixes (content-visibility on showroom cards,
  lazy themes, idle warm-up, `render/mergemodel.js` joining idea-model parts, cheaper START pulse, tank-corner context on demand). Lazy idea/cargo models
  (item 3) skipped on purpose (needs an async gate at 12+ call sites for <100 KB).
- Window/glass audit: of 201 vehicles with side windows, 108 fail the contour test, 112 the windscreen-height test, 67 both (153 in the union;
  18 dome/canopy cars fail by construction). Contact sheets were rendered (`/tmp/window-sheet/`, may be gone; re-make from `windows-audit.json`).

## GLASS: the open job (the owner's top concern)
Owner's rules: window outline follows the body contour at a fixed inset (7 cm A-pillar, 9 cm C-pillar, 5 cm roof rail; the pink line); screen top and side-window
top LEVEL (never lower the screen; no visor strip; raise the lower glass); each window has exactly the body outline's corners (4-edge plain side window).
- The approved reference is the **Touring Car** (`ideaModelsBatchE5.js`, helper `cabinGlass` in `render/ideaModelsDkit.js` with `grow: BEV`,
  `lift: BEV + 0.006`, no `topLift`; `dropFlat`/`oneMitre`/`tidyGlass` merge near-collinear points). Check: `scripts/.glass-contour-check.mjs <car id>`.
- **Reusable agent brief: `GLASS-AGENT-BRIEF.md` (repo root).** One car per agent, Fable/high worked well, must read its own renders and compare pixel rows.
- Next: the Wedge Microcar and Hill Climb need `grow: BEV` and no `topLift` (one line each). Then the rest of the roster per the audit
  (`src/delivery/AUDIT-windows-14-Oct.md`, `windows-audit.json`, `scripts/audit-windows.mjs`; fix plan about 8 rows of parallel agents). The owner has
  NOT yet said how far to go (older cars too? tolerance? canopies?). Ask. The nine rejected glass-d/e branches' per-car work is a useful starting point
  but each car needs redoing to the Touring Car recipe. The Utility Moke's free-standing windscreen frame was skipped by the first fix.

## Open items / questions waiting on the owner
- Window-fix scope (above). Whether to restore the Trophy Truck door roundel "14" (cleanup left a blank grey disc).
- Plate agent's five questions (lettering, Tank in play, which designs are free, front plates at wreck stage, filter strictness).
- E5 questions answered (bigger roundels; the Hill Climb's yellow roundel looks best; the Limo fine); the owner still wants to look at the Hill Climb later.
- Perf: lazy idea/cargo models (recommended skip); check the CSS animations and stage picture on a real phone (unmeasured); the first-menu load is
  mostly module evaluation, not bytes.
- Ghost traffic untested by hand (no sound, red "upset" tint and mid-flicker frame not seen). Ghost cars are still seen by the traffic's own AI.
- `.keyspin-check` (Silver Comet key card canvas) failed in the render group before the ECU merge; unconfirmed on main. `.strike-levels-check`,
  `.pursuit-check` and the quick smoke fail identically on old bases: pre-existing.
- Not seen anywhere: a real GPU/phone for any perf number, Evil paint on the glass fix, the garage view of the Touring Car after the glass fix.

## Tips learnt
- Replay hash = `logicFiles` fingerprint in `vite.config.js`: every top-level `src/delivery/*.js` not in `NOT_RULES` plus what rules modules import.
  `render/` stays outside unless a rules file imports it. `levels.js` IS in it (so lazy levels would refuse every replay).
- Merging many branches: CHECKLIST numbers and the one-line registrations (`ideas.js`, `ideaModels.js`, `carlights.js` TABLE, `themes.js`, `levels.js`,
  `levelText.json`, `cargo.js`, `gimmicks.js`, `obstacleModels.js`) conflict every time: keep both sides, renumber CHECKLIST. A fresh worktree needs
  `node_modules` linked. The same CHECKLIST numbers (281, 286, 287) appear on several branches.
- A merge helper trap: `ideaModelsDkit.js` helpers (`decal`, `texture`, `textures`, `random`) were deleted by a texture cleanup while E5 still imported them.
- Save cookie subset is about 4096 bytes with ~1.4-1.7 KB spare: new saved fields are expensive.
- `deal()` in `cargo.js` counts `HIDDEN_LEVELS` cargo so hidden items are not dealt to menu levels.
- Version every game-changing merge (patch +1, message starts "v1.1.<n>:"); notes-only merges don't bump.
- Checks: `node scripts/delivery-tests.mjs --group render|words|tiers|levels|cars|cargo|gimmicks|obstacles|water --no-lock`; never the full smoke.

## 1. True speed (CHECKLIST 257, 261)
`CONFIG.trueSpeed` { on, least, most, laneScrub }; `Track.pathScale(s, lat)`; applied in player.js and traffic.js; lane changes scrub a little speed over agility. Check: `scripts/.truespeed-check.mjs`. Tiers group passes. Consequences the owner must decide: replays/ghosts invalid (accepted), level clocks / par / medals NOT re-written (circuits' clean runs 3.5-10.6% slower: mystery-meadows, stelvio, montreal, marina-bay, spa, grand-prix; `node scripts/level-clocks.mjs <id> --write`). Not tried in a browser: how it FEELS, ghost races, rivals.

## 2. Damage (CHECKLIST 258, 262)
`render/dents.js`: DAMAGE (4 stages) in car space, `CONFIG.dents.steps` [0.2,0.4,0.6,0.8], attached parts follow, clamps, subdivision of low-poly panels, dent size capped in metres. Sampled on 8 cars: 6 good/ok. DECISION NEEDED: a damaged player car costs 1.5-6x the triangles (commuter 1,764 -> 8,288; junker 13,158); check on the Mi Pad. Not done: the 30-car audit, other views, Evil, night, a real level.

## Earlier work still standing (from the first 14-Oct session)
Both are live on main (v1.1.128 onward), not played by hand. Counts of cars/ideas change every batch: re-measure with `.ideas-check`, do not copy old numbers.
Open from then: Mi Pad flicker fix (owner to test `?shop&inside=standard` without `?lite`); cinematics never watched in motion; Legendary gold amount / Junker rust+cover /
four off-wheel wreath spots; battle pass questions; key-car weight/caps; do the lamp GLOW and the Legendary wreath move with a dent? (lamp bodies do, the glow group in `render/lampfx.js` is skipped on purpose, the wreath is unchecked); the Ghost power-up on underglow/wreath; the damage triangle cost on the Mi Pad.

## First steps for the next orchestrator
1. `git fetch`; read the merge-all agent's report (`ac7e4fe6fb90215eb`, output file under `/tmp/claude-0/.../tasks/`, or its branch `claude/merge-all-14oct`).
   If it says safe, ask the owner once, then push to main (deploys).
2. Ask the owner the glass scope question; then send one Fable/high agent per car with `GLASS-AGENT-BRIEF.md`, starting with the Wedge Microcar and Hill Climb.
3. Read the images yourself every time before forwarding.
