# Scratchpad: prank cargo P1 to P4 (delivery-prank-a), 12-Oct, suspended on the owner's stand-down

- **Branch:** `delivery-prank-a` (from main at 82b320a). **Worktree:** `.claude/worktrees/delivery-prank-a`
  (its `node_modules` is a junction to the main checkout's: `cmd /c rmdir <worktree>\node_modules` before any
  recursive delete). Not merged with main yet; nothing pushed; no background jobs left; no other worktrees.
- **Task:** model P1 Whoopee Cushion, P2 Bucket on a Trip Wire, P3 Squirting Flower, P4 Chattering Teeth
  (IDEAS-prank-cargo-12-Oct.md at bcc7570) as Evil cargo, a sight only, three states, no in-play effect.

## DONE (commit bf60b08, "WIP prank cargo P1-P4")

All four are written, registered and worded; all four were begun before the stop order came, none after it.

- `src/delivery/render/cargoModelsPrankA.js` (new): `PRANK_A_MODELS = { whoopee, bucket, squirter, teeth }`,
  each `stated(group, pose(t, agitated, furious, dt))` as the older files, standing on y = 0, facing +z.
- `render/cargoModels.js`: one import and `...PRANK_A_MODELS` in CARGO_MODELS (two lines).
- `cargo.js` CARGO.evil: four entries after `band`, under a `// the pranks` comment.
- `cargoText.json`: four entries after `band` (name, blurb, states: Plump / Wheezing / Let rip; Balanced /
  Slopping / Tipped; Innocent / Pumping / Squirting; Wound / Chattering / Snapping). CRLF kept.
- Nothing in levelText.json: no level names them (the draft's "Suits" lines are not wired). A level picks one
  by `"cargo": { "evil": "<id>" }` in levelText.json; otherwise cargo.js deals the unnamed items to levels
  that name none.

## Seen (stills, read by the agent) and corrected

Stills: `<scratchpad>\prankA\`
(cargo page cards, calm / agitated / furious side by side; `--size=1100x1500`):
- `front-t24.png` (turn 0, t 2.4), `quarter-t10.png` (turn 0.8, t 1.0), `side-t32.png` (turn 1.5, t 3.2),
  `back-t05.png` (turn 3.1, t 0.5): whoopee, bucket, squirter (teeth below the fold on these).
- `teeth-front-t10.png` (turn 0.3, t 1.0), `teeth-quarter-t26.png`, `teeth-side-t03.png`: the last two were
  shot but NOT yet looked at. These three also carry the corrected whoopee and bucket (below).
- What read well: the whoopee as a disc at three heights with its nozzle; the bucket upright on its wedge
  with a taut string to the peg, rocking, and lying over with a standing sheet into a pool; the daisy with
  its bulb, the drop, the sweeping arc; the teeth on the black face of their crate, chattering open, key out.
- Corrected after the first stills (in bf60b08): the furious whoopee's air lines were too faint (now thicker
  and whiter); the bucket's slop sheets read as floating squares (now smaller, closer to the rim, tilting).
  These corrections are only in the `teeth-*` stills, unlooked-at except `teeth-front-t10.png` (whoopee there
  is calm/wheezing/let-rip at t = 1.0: blast lines not in that frame).

## NOT seen / NOT done (the exact next step)

1. Look at `teeth-quarter-t26.png` and `teeth-side-t03.png` (the furious teeth hanging on the crate's front
   rim, which `teeth-front-t10.png` catches only mid-flip; the corrected bucket slops; the whoopee blast at
   t = 2.6 and t = 0.3). Shoot more if needed: take a heavy lock, then
   `node scripts/shots.mjs <out> "x=cargo.html?side=evil&only=teeth&still&t=<s>&turn=<rad>" --size=1100x900 --wait=5000`
   (furious teeth cycle is 1.43 s: on the rim for u 0.3-0.7 of it, i.e. t in 0.43-1.0, 1.86-2.43 ...).
2. Not seen at all: the HUD round window (framing per state), the 112x84 level-card tile, the kerb set-down,
   and the transitions. A run still: `node scripts/shots.mjs <out> "k=@<levelid>&ghost&at=<s>&ff=1&cargostate=2"`
   but no level names these items, so the HUD shows them only on a level dealt one (see .cargo-check output
   for which level carries which, or name one in levelText.json temporarily).
3. Checks run: `node --check` on the model file (ok); `node scripts/.words-check.mjs` (only pre-existing
   failures: junker / punctures blurbs over 70 characters, not this branch's); `node scripts/.cargo-check.mjs`
   (all ok but "every item turns up", which fails for any new Evil item no level names; the orchestrator said
   agent prank-c makes one exemption commit for all ten prank ids, so do NOT edit .cargo-check.mjs or name
   these in levelText.json). Not run: lint, smoke (never without being asked), bundle check.
4. `git merge main` into the branch (keep both sides of registry conflicts: cargoModels.js import/spread,
   cargo.js CARGO.evil tail, cargoText.json tail: the other prank agents add lines in the same places),
   rerun the two checks, then report.

## Traps

- cargoText.json is CRLF; append with the same line ends (a Python replace was used, not Edit).
- The cargo page frames every state on the furious extent: the whoopee looks small there (its blast lines
  reach out); the HUD frames per state, which has not been seen.
- Squirter: the water arc is a child of the root, not of the leaning plant, so the pool stays level; its
  position is recomputed each frame from the plant's rotation.
- Teeth: the crate's black face is 6 cm below the rim (FACE = CH - 0.06) so the hanging-on-the-rim pose
  (rig y 0.475, z 0.1925) keeps the jaws above the face; the feet were dropped for that reason.
- Never `git --help` / `git help` (opens a browser): use `-h`.
