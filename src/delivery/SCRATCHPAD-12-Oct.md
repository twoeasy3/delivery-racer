# Delivery Racer: work stopped part way, and traps, at the 12-Oct stand-down

Read `HANDOVER-orchestrator-12-Oct.md` first (the prompt, the rules, where the code is, every unmerged branch,
the open questions, the first three steps). This file is the loose ends in the order they bite, and the traps.
Each branch's own scratchpad (`src/delivery/SCRATCHPAD-<area>-12-Oct.md` inside its worktree) has the commands.

## Branch scratchpads (written by the agents at the stand-down)

- `delivery-gimmicklogic`: `SCRATCHPAD-gimmicklogic-12-Oct.md` (replay check not rerun after the Q13 override).
- `delivery-prank-a`: `SCRATCHPAD-prank-a-12-Oct.md` (cd9a418); `-b`: `SCRATCHPAD-prank-b-12-Oct.md`;
  `-c`: `SCRATCHPAD-prank-c-12-Oct.md`.
- `delivery-ge-road`: `SCRATCHPAD-ge-road-12-Oct.md` (nothing seen; the shots commands are in it).
- `delivery-ge-ui`: the report is in its commit log (ideas 8 to 12; stills in `src/delivery/geshots/`).
- `delivery-rework-b` (worktree `delivery-themes-c`): `SCRATCHPAD-hongkong-12-Oct.md`.
- `delivery-garagetiers`: `SCRATCHPAD-garagetiers-12-Oct.md` (the back button never tried; silhouettes unread).
- `delivery-tests`: `SCRATCHPAD-tests-12-Oct.md` and `TESTS.md` (the runner's groups partly verified).
- `delivery-sweep`: the sweep table is `SWEEP-12-Oct.md` on main; the Q21 removals are `4181d06` (unmerged).
- Documents on main from today: `AUDIT-gimmick-theme-12-Oct.md`, `PLAN-amphibious-12-Oct.md`,
  `PLAN-beginner-12-Oct.md`, `INVESTIGATION-drop-game-history-12-Oct.md`, `PLAN-delivery-subdomain-12-Oct.md`,
  `SWEEP-12-Oct.md`. On `delivery-prank-ideas`: `IDEAS-prank-cargo-12-Oct.md` (the draft, now built).

## Stills worth showing the owner (paths; nothing is to be sent unprompted)

- Good/Evil A: `%LOCALAPPDATA%\Temp\claude\ge\` (`i1a`, `i1b` ring and horns; `i2c\sheet-d.png`, `sheet-n.png`
  underglow; `i3a`, `i3b` tail lights; `i4b`, `fin\p-muscle-evil.png`, `fin\p-commuter-good.png` exhaust).
- Good/Evil C (ideas 8 to 10): `.claude/worktrees/delivery-ge-ui/src/delivery/geshots/{level,phone,menu,menuphone}/`.
- Prank cargo: `...\22e270fb-e7d5-44fe-80e3-8ee1667e04b0\scratchpad\` of the 12-Oct front session (`prankA\`,
  `shots3\` for B, `shots1\` and `shots2\` for C): these are in the session's temp folder and may be cleaned; if
  gone, re-shoot with the cargo page command in each branch's scratchpad.
- Cattle Drive's taper and the gimmick page: the sweep agent's `scratchpad\b\{a,b,c,d}.png` and
  `scratchpad\c\{lanes,rev,low}.png` (same folder).
- Hong Kong: that folder's `hk2\` and `hk3\`.

## Loose ends in merged work

- **Never played by hand, no sound heard**: the whole 12-Oct set is headless checks, stills, or neither. The
  checks on `main`'s tip were not run as a whole (see the handover, section 2).
- **Q18/Q19 numbers** (damage): a sports car vs a commuter at 30 m/s now costs 34 of 45; a bus 75 (a wreck); the
  smallest solid obstacle costs about 30; machinery 70. Tank, ghost and armour interactions untested.
- **Q15 low bridges**: two bars 60 m apart; the track check wants the second bar 40 m clear of a merge; drawn
  bars never seen; the `delivery-lowbridge-check.mjs` headless check ran without a lock (it is browser-free).
- **Q14 crosswinds** retuned (strength 11, a gust every 5 s, 3 s long): never played.
- **Q29 tyres and Q30 Gullwing doors**: changed, not seen. The cause of the owner's "tyres from explosions" report
  is not confirmed: the code already threw and bounced them.
- **Beginner clocks are much tighter** (farm 234 s to 105 s good). The starter cars (Commuter, Junker, Darkvan) were
  measured against the OLD lengths only (the Evil clock on big-business was missed by a clean Commuter run at 160
  s against 153 s). A headless re-measure against the new clocks was asked of the carfix agent and not reported.
- **Menu pictures** of the five Beginner levels were not re-shot (the shots script has no CINE entry for them).
- **The Q21 audit** removed only the clearly un-thematic cases; the doubtful ones are in `4181d06` (unmerged).
- **`.mysteries-check`** fails "Lowrider becomes the Super Lowrider" on main (also on an untouched main);
  **`.ideas-check`** fails 7 to 9 lines on main ("bubble delivered in 132 s" and others). Neither was looked into.
- **Prank cargo is not dealt to any level** (`UNASSIGNED` in `.cargo-check.mjs`); its blurbs and state phrases are
  in `cargoText.json`; the owner wanted them cosmetic only (no in-play effect, no extra door state).
- **The Good/Evil switch** is `src/delivery/sidecues.js` (`geOn(n)`, `?ge=1,5,8` or `?ge=all`); three branches
  carry the identical file. Nothing is on by default. Pick, then keep only the picked ideas' commits.

## Traps seen on 12-Oct (on top of the 11-Oct traps in `SCRATCHPAD-11-Oct.md`)

- `git ... --help` and `git help` open a browser page on the owner's screen: use `-h`.
- Mkdir-based locks are lost to slips: an agent `rmdir`ed a lock after its script had already released it; one
  ran a check without a lock; a lock can vanish between "won" and "used". Check a lock's age before removing it.
- `?car=<id>` falls back to the Commuter when the car is not owned or the tier does not allow it: own it
  (`?owns=`) or use a car of the level's tier; `?level=@id` falls back to level 1: use `name=@<levelid>&...`.
- A worktree made from Git Bash with `mklink /J` prints a cmd banner and makes nothing: use PowerShell
  `cmd /c mklink /J node_modules <main>\node_modules`.
- npm scripts fail on this machine: run `node scripts/<name>.mjs` directly; eslint by path
  (`node node_modules/eslint/bin/eslint.js <files>`), because `npx` does not find node from Git Bash.
- The levels check needs `--secs=5` (it fails at 3: races do not start in time).
- Files are CRLF in places: keep line endings when editing; the transport mangles backslashes in CSS content
  strings (check `'\25BE'` in menus.css after edits).
- The words check's blurb limit is 70 characters (`BLURB_MOST`, words.js).
- A tier level starts only in a car of its tier: any script or still that starts a tier level must own the cars
  (`.replay-check` and the smoke now do; `delivery-probe.mjs` was fixed in `delivery-tests`).
- `levelText.json` conflicts between branches that both add words: the later branch merges `main` first.
- The harness refused TaskStop on an agent the caller did not spawn: only the spawning session can stop it.
