# Delivery Racer: handover to the next orchestrator (written 19-Oct-2026, end of the 19-Oct cloud session)

This is the NEWEST handover. `HANDOVER-orchestrator-15-Oct.md` and older are history. The 19-Oct handover (`HANDOVER-orchestrator-19-Oct.md`) lives only on `claude/handover-19oct`; its "Who and how" and "Owner's standing rules" sections are still right and are repeated in short below. Read `CLOUD-AGENT-README.md`, `CLAUDE.md` and `CHECKLIST.md` first (entries 482-530 are this session's work).

## State
- **`main` = v1.1.159-alpha** (the 19-Oct final integration; sha in `git log`). Pushing `main` DEPLOYS the game (Cloudflare Worker `delivery`, `delivery.pingmathehippo.com`). The orchestrator pushes `main` only after the owner says so in the chat; the auto-mode classifier refuses a deploy push otherwise (and has refused agents' merges of other agents' branches: do the merges yourself in your own session, or the owner approves in the permission prompt).
- **Replay fingerprint**: logic `b2579b8f43` / legacy `cd255004bd` (`scripts/logic-hash.mjs fingerprints()`). It moved many times today; replays recorded under older rules are refused. Six checks pin it (`.cine-wire`, `.device-defaults`, `.events-ui`, `.preview-spin`, `.replay-cam`, `.trail-slot`): update their pins at every merge that moves it.
- Nothing was running when this was written.

## What shipped today (all on main)
- **Fixes**: replay orbit reversed on flipped tracks (489), buy-cine framing for tall-mast cars, dark Fishbowl ECU UP, blackout-mystery freeze in the Mall, Mall Dash retimed (clocks 135/105), windscreens, night select stage brighter, space legs, z-fights (cargo, cars), tail-light and plate fixes, decal lag (raycast grid, 3 s -> 55 ms), phone stage backgrounds no longer squished (render/carstage.js paints one design picture at one scale), hidden levels now start in the garage-picked car (`render/lastpick.js`).
- **Gameplay**: ramming damage capped at 100 (not tank shells, not head-on), evil package throw spread, tank shell centre 10000 / off-centre critical, rickety floor 100, four player-only gimmicks (oil slick, glue pile, EMP mine, magma patch), oil slick reworked (yaws up to 70 degrees, 3.6 s, countersteer to save it; CONFIG.oilSlick), slot walls and mover patterns for obstacle design (obstacles at fractional lane positions: `track.js`, `levelSchema.js`).
- **Cosmetics / FX**: cracked glass on by default, Good/Evil side emoji marks (halo/wings, horns/pitchfork; Options toggle), 8 kill FX, 8 trail FX, 12 roof props (64 total), animal animations, decal zones tagged for ~150 cars (render/decalzonestable.js is GENERATED: `scripts/decal-zones.mjs`).
- **Idea cars (all driver-only)**: M1 (haul truck, bulldozer, gritter), M2 (Step-Nose MPV, Mobile Library, Jingle Truck), M3 (Soapbox, Backhoe, Car Transporter), M4 (Log Truck, Fuel Tanker, Combine), M5 (Pace Car, Stone-Age Car, Skip Lorry). Soapbox and Stone-Age Car are the "possibly too wacky" ones; the owner said "merge the rest" knowing that.
- **New themes, each with a hidden level** (`?hidden=<id>`): fjord (`fjord-road`), neon (`neon-grid`), castle (`castle-town`), airport apron (`apron-run`), oil field (`oil-patch`). Today's second pass added slots, movers, oncoming-side obstacles, sparse cash, more traffic and gimmicks to them.

## Known problems shipped (the owner said ignore and push)
- `.zfight-check` fails on the cars the z-fight branch never saw: sidecar, bulldozer, mobilelibrary, jingletruck, combine, and the M3/M5 cars (not measured).
- `.events-ui-check` has 5 failures (2 known 1100x650 "no Details button" lines, 3 phone car-hunt tab lines); `.replay-cam-check` times out under load (one suburbs timing line); `.carstage-check`'s 60 ms line fails under machine load (also on main); `.proptag-check` fails on the two stale entries (wedge, super-superlowrider) as on main. The smoke test was never run.
- Slot walls are fair only up to about 41-46 m/s (formations held past 70); they suit levels whose cars top out near 40 m/s. A throwaway autopilot found castle-town slower than its 155 s clock and fjord with 1-4 wrecks a run: nobody has driven the new levels by hand.
- neon-grid and oil-patch have a stretch over 250 m empty of both traffic and a gimmick (290 / 263 m).
- Oil Patch and Gimmick Road 2: Oil Patch has no `oilSlicks` list, so its replay never meets a slick.
- Shared bug not fixed: `cabinGlass` in `render/ideaModelsDkit.js` builds the rear window on the wrong edge when the roof profile has curve points (the Step-Nose MPV works round it by keeping its roof straight).
- Fjord theme: phone stills, the select card, tunnel interiors and the hand-played pass are still open (CHECKLIST 518).
- Apron theme draws about 10-18% more triangles than the city; the Evil car card for it was never seen.
- Cargo z-fight item 455 stays open (tentacle, bouquet, snakes, fondue).

## Open owner decisions
- Fold-in vs fix of the replay fingerprint: every new theme, idea-batch file or rules line moves it. A hashing change (`scripts/logic-hash.mjs`) could keep data-ish files out of it; the owner has not decided.
- Is the Pixels rainbow trail, the sofa / shark fin / wind-up key / fir tree roof props too wacky? Jingle Truck (ornate, one 128x128 texture) was recommended held back and was merged anyway.
- Round-roofed sports cars' roof slot (recommendation: none); Car Transporter / Frontier duplicates; save-code reset of cosmetics; Giant and the checklist items 84, 387, 339, 342, 261, 460.
- Where the five new hidden levels belong in the career (hidden only for now).

## Not done (never started)
Wing props, cargo props, decal designs queued after tagging, stage audit, Bubble Car crack lines, the other half of the decal zone table for non-tagged cars (A-M tagged by agent A, N-Z by B; the table is merged and generated), the slot rule for 2-lane roads (none fit).

## Who and how (unchanged)
- The owner is a game designer on a **phone**: short requests, blunt answers.
- **You direct; you do not hand-edit code** (the owner made a one-off exception while the permission check blocked agents' merges). Each request goes to a background agent: plain `Agent` calls, background, own branch and worktree (`git worktree add .claude/worktrees/<name> -b claude/<name> origin/main`), never the Workflow tool. Look at each still before forwarding it with `SendUserFile`. Completed agents can be resumed with `SendMessage`; never stop an agent unless the owner says so. 20 concurrent subagents is the cap.
- Merge process: `--no-ff`, one at a time; CHECKLIST.md conflicts at every merge (keep both sides, renumber duplicates; today five agents all took number 525); then recompute the fingerprint, update the six pins, vite build, key checks run ALONE (machine is heavily loaded: checks time out and the 60 ms carstage line fails under load).
- Standing rules: UI text terse; low-end-device friendly (say "low-end device"); no humans in cinematics; no wacky cars ("These cars are too wacky for the game. No more such cars going forward"); never `rm` with shell variables; no bare `git stash`; interim "waiting" pings one line; update CHECKLIST.md saying what was and was not verified; no scope creep; never the full smoke test; never delete .wav files; cosmetics and render changes must not move the fingerprint (gameplay, theme and idea-batch changes do, and the owner accepts that for gameplay). Remote branch deletion is refused (HTTP 403).
- Slowdown mode and "Are you obliged to comment": report real reports and merge issues only; do not narrate every "waiting on background work" notice.

## Branches
- **Merged into main today**: all of `claude/integrate-*` up to `integrate-3`, theme-fjord/neon/castle/airport/oil, idea-cars-m1..m5, decal-tags-a/b, car-zfight, roof-items, oil-slick-rework, obstacle-threading, stage-phone-squish, decal-lag-limo, hidden-car-choice.
- **Not merged**: `claude/ge-ring` (dropped by the owner: do not merge), `claude/car-kit`, `claude/pose-sheet`, `claude/handover-19oct` (docs), the older post-snapshot and pre-snapshot branches listed in the 19-Oct handover. ~286 remote branches exist; the owner deletes branches on GitHub.
- **Worktrees**: many under `.claude/worktrees/`; most are of merged branches and can be pruned (`git worktree remove`) once the owner agrees.

## Tools added today
- `scripts/obstacle-patterns.mjs` (gate, gaterun, slalom, zipper, taper, diagonal, chicane, island, crest, bookend, wall, wideisland, halfstep, zigzag, widechicane, slot, slotrun, slotstagger, needle, sweeper, rollgate; `--oncoming`, `--cashline`, `rhythm`), `scripts/obstacle-audit.mjs` (`--strict --fairup`; flags SLOT_TOO_NARROW, NO_PATH, UNREACHABLE, TRAFFIC), `scripts/obstacle-picture.mjs` (top-down pictures), `src/delivery/OBSTACLE-STAGE-DESIGN.md` (the design doc, rules 8 and 9 and sections 5c/5d).
- `.decal-sweep-check` (no (car, design) pair shows nothing; time budget), `.hidden-car-check`, `.zfight-check`, `.carstage-check` "no stretch" lines, `.animals-anim-check`, `.propmodels-roof3`.
