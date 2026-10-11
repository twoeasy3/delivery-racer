# Delivery Racer: work stopped part way, and traps, at the 11-Oct stand-down

Read `HANDOVER-orchestrator-11-Oct.md` first (the prompt, the rules, where the code stands). This file is the
loose ends: each with its branch, worktree and the next step.

## Unmerged branches

- **`delivery-crests`** (worktree `.claude/worktrees/delivery-crests`): `scripts/crest-signs.mjs` (audits crests
  that hide a hazard and have no board: 0 found on every level), `scripts/moon-airtime.mjs` (measures airtime
  over a crest at a given gravity) and `src/delivery/IDEAS-moon-airtime-11-Oct.md` (the proposal). Only adds
  files: safe to merge. NOT seen: the crest board on `moon` at s about 292 (no stills: the heavy lock starved
  the agent). Finding: crests already get an automatic "CREST nn+ FLIES" board 110 m before them
  (`render/gambles.js:84`); the owner's "the cone is its only warning" was wrong for Tranquility Base; a small
  render change could make the board name the hazard ("BLIND: BARRIER BEYOND"): not built, owner's call.
  Moon airtime option A: gravity 8 on `moon` and `farside`: 0.38 s / 14 m becomes 1.92 s / 69 m at 130 km/h;
  a 2 s flight clears the barrier at s 470; pickups are collected in the air.
- **`delivery-rework-b`** (Hong Kong, level 27; worktree `.claude/worktrees/delivery-themes-c`): the level file
  re-laid (3.7 km, 14 segments, tunnels at 1800 to 2160 and 2960 to 3140); NO scenery; the mirrored FRESH TAR
  board on a `drive: left` level (the owner's Q24 says newer signs do not reverse on flipped levels: fix it in
  the board's code); menu picture; full checks. Plan in `SCRATCHPAD-10-Oct-dropped.md` section 1.
- **`delivery-stats`** (Delivery and Nerve car stats): HELD. The owner answered 5c2 on 11-Oct: "With the
  rebalance, the traffic should consist of cars in the tier of the level. But we have not gotten there yet as the
  progression update is still pending." So it stays held until the rebalance.
- **`delivery-themes-toys-wip`**: an old WIP branch; not looked at on 11-Oct.

## Loose ends in merged work

- **The level card on a phone (height):** see the handover. Files: `src/delivery/menu2.css` (the one-column block
  near line 211: the stage row is `minmax(210px, 1fr)`; the car row is `#startScreen .car-card` height 92 px,
  `.picture` 112 px; START bottom padding 26 px on `#startScreen`), `render/menustage.js`. The stage's own
  text block is tall (description 3 lines, facts, the "No medal on Good yet" note, medals, "What's on this
  road" chip): trimming it or capping the stage's height is the way to give the car more.
- **The quick smoke test fails**: `node scripts/delivery-smoke.mjs --quick` at `3600daf` gave 74 failures (73
  FAIL lines plus a crash `Cannot read properties of undefined (reading 'kind')` at `delivery-smoke.mjs:514`,
  the shoulder-rows check, which finds no cones on a level called `undefined`); it ran in 53 s, not 8
  minutes, and the sections after the crash never ran; deterministic (seed 20261008). Groups: 24 hills lines,
  16 wideLoad / escort lines, 5 landmine, 5 "starting a run loads the level picked on the menu", 12 drifters,
  4 traffic mixes on the water levels, a UFO line, the shoulder timer, "no traffic at all". Several read like
  a STALE TEST (level indexing and menu order moved today; two levels inserted; tiers) and the 32 check
  scripts all passed at `c5575c7`. A bisect (the same quick run at `3075475`, `2867e44`, the commit before the
  washboard) was started and STOPPED by the owner ("ignore the smoke test for now"). Not known whether the
  game regressed. The owner's own quick-run time estimate in memory (about 8 min) is wrong for the crash case.
- **Surplus levels and the tiers:** `tiers.json` lists as `outside`: cattle, thaw, fallout (51 to 53), six
  non-race specials (all-heck, ufo (Mother Ship), oh-mine, rival-run, showdown, battlefield), the five
  amphibious levels and the races. They open in a chain after tier 10's last level. A tier then holds six
  levels if one is moved in: it works but the rules assume five and the tool warns.
- **Medals and grades:** the game already had bronze, silver and gold by time to spare per side; the tiers rework
  treats a side's medal as that grade (a medal exists exactly when a side is delivered on time). The owner may
  want "medal" and "grade" kept apart: a wording change only. `ribbon` remains only as internal identifiers
  (`.ribbon` CSS class, `ribbonHalf`) and unrelated geometry; the garage's Show buttons still say "Gold stars"
  and "Blue stars" (an old car filter).
- **The road card (What's on this road)** no longer has a Cargo tile (moved to the level card); restoring it is
  `git show fcb3129 -- src/delivery/render/levelcard3d.js`.
- **The 16 cargo assignments:** Q22 froze every level's cargo into `levelText.json`, so nothing is dealt any more;
  the C41 to C60 cargos turn up only because their agent named them on sixteen levels that named no cargo of
  their own (see CHECKLIST-11-Oct.md I-section / the agent report). bailiffs, salesman and party are gone;
  oh-mine carries snakes, mumbai teddy, back-roads cloud and jumper.
- **Tour de Coast's cargo** is bonsai / band (the words file), not its surfboard / skunk.
- **Hot Zone (fallout, 53) balance:** after the owner's complaint the radiation costs about 15% health and
  half the meter for a 200 m dash, infects after 13 s in a stretch, a whole infected car lasts about 91 s
  (`infectedTick` 0.009 would give about 110 s if it is too harsh). Never played by hand.
- **Lint:** 61 errors (2 more than the first run); one new in `render/themes/fallout.js` (an unused `rust`).
- **Stray things:** `.vite/deps` caches appear in worktrees after check runs (untracked, harmless).

## Traps seen on 11-Oct

- An agent told to "run the real checks" with a placeholder name `.x-check.mjs` ran none: use real script names.
- `?level=@id` silently loads level 1: use `name=@id&...`.
- A heavy job's lock can be removed by an agent that does not hold it (one did at 23.5 min): tell agents to
  remove only a lock older than 25 minutes.
- Merging a branch whose `levelText.json` changes conflicts whenever another branch added cargo or words lines
  beside: send it back to its agent to `git merge main` (it happened to the washboard and Hot Zone).
- Two levels claimed place 52 in `INSERTED_AT` (Spring Thaw and Hot Zone): the second merged renumbered.
- The tiers rework needs a car of the level's tier to START a tier level: any script that drives a level
  headlessly must own every car (`.replay-check` was fixed for this).
