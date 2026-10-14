# Delivery Racer: handover to the next orchestrator (written on 14-Oct-2026, end of the long cloud session)

This is the NEWEST handover; `HANDOVER-orchestrator-12-Oct.md` and `HANDOVER.md` are older (their car/level counts and branch tables are out of date: see the state below).

Read CLOUD-AGENT-README.md and CHECKLIST.md first (CLAUDE.md). Owner rules still stand: never run the full smoke test; merge to main ONLY when the owner says "merge"; never delete .wav/sound assets; car rules in CAR-AGENT-PROMPT.md (Junker is the benchmark); send pictures with SendUserFile.

## State
- **main = v1.1.127** (commit 4023196): includes Unlock everything (two modes), the compact Jim stall on desktop, and the ten top-up idea cars (batches A, B, C). The idea count is 51 (`.ideas-check`).
- **Working branch `claude/charming-maxwell-pxoail`** = main + three UNMERGED changes: (1) TRUE SPEED, (2) four hand-made DAMAGE stages (v2), (3) CHECKLIST items 255-262 and this file. Do NOT fast-forward main from this branch unless the owner says "merge" AND accepts the items below.
- Branch `claude/damage-audit` (agent): the same damage v2 work, already merged into the working branch.
- Worktrees left over: /home/user/dr-topup-A/B/C, /home/user/dr-damage (can be removed with `git worktree remove --force`).

## 1. True speed (CHECKLIST 257, 261)
`CONFIG.trueSpeed` { on, least, most, laneScrub }; `Track.pathScale(s, lat)`; applied in player.js and traffic.js; lane changes scrub a little speed over agility. Check: `scripts/.truespeed-check.mjs`. Tiers group passes. Consequences the owner must decide: replays/ghosts invalid (accepted), level clocks / par / medals NOT re-written (circuits' clean runs 3.5-10.6% slower: mystery-meadows, stelvio, montreal, marina-bay, spa, grand-prix; `node scripts/level-clocks.mjs <id> --write`). Not tried in a browser: how it FEELS, ghost races, rivals.

## 2. Damage (CHECKLIST 258, 262)
`render/dents.js`: DAMAGE (4 stages) in car space, `CONFIG.dents.steps` [0.2,0.4,0.6,0.8], attached parts follow, clamps, subdivision of low-poly panels, dent size capped in metres. Sampled on 8 cars: 6 good/ok. DECISION NEEDED: a damaged player car costs 1.5-6x the triangles (commuter 1,764 -> 8,288; junker 13,158); check on the Mi Pad. Not done: the 30-car audit, other views, Evil, night, a real level.

## 3. Open items / decisions for the owner
- Ten-car NEXT BATCH (CHECKLIST 260): the draft tier mix is proposed, awaiting approval (T1 Wedge Microcar, Farm Tractor; T2 Flatbed Truck, Utility Moke; T3 Half-Track, Sprint Hatch; T4 Autobahn Estate, Fin Land Yacht; T5 Trophy Truck, Armoured Limo). Brief agents with the Junker benchmark; ideas must show no stars (`.ideas-check`), lamp placements required.
- Cosmetics (CHECKLIST 259): audited; the owner has not chosen the set (leaning wheels, plate, roof ornaments). Two likely bugs: Ghost power-up on underglow/wreath; wreath ignores dents.
- Mi Pad flicker fix: owner to test `?shop&inside=standard` without `?lite`.
- Cinematics never watched in motion; lamp work, Legendaries, Jim's stall untested on real devices.
- Legendary gold amount / Junker rust+cover / four off-wheel wreath spots; battle pass questions (monetised?, season length, XP sources, headline reward); key-car weight/caps; "mythic rename" skipped by the owner.

## Tips learnt
- Checks: `node scripts/delivery-tests.mjs --group render|words|tiers --no-lock` (never the full smoke). A fresh worktree needs `node_modules` linked.
- Merging branches: CHECKLIST numbers and the one-line registrations (ideas.js, ideaModels.js, carlights.js TABLE) conflict every time; keep both and renumber.
- Replay fingerprint = hash of logicFiles (vite.config.js); render/* and pure modules are NOT in it.

## Where the code is (git, 14-Oct)
- `origin/main` = v1.1.128 (the working branch `claude/charming-maxwell-pxoail` was fast-forwarded into it on 14-Oct at the owner's "Push the completed stuff": true speed, damage v2, the handover docs). Earlier note that these were unmerged is OUT OF DATE. Pushing `main` deploys; only on the owner's "merge".
- Remote branches NOT merged into `origin/main`: `claude/charming-maxwell-pxoail` (+7, above), `claude/damage-audit` (+3, already inside the working branch), `claude/original-cars-1` (+4: the original-cars Agent 1 work; its worktree /home/user/dr-origcars1 has 1 uncommitted change; status not re-checked this session), `claude/blueprint-pose-lab` (+3, an experiment). The other 69 remote `claude/*` branches are merged and can be deleted when the owner agrees.
- Worktrees: about 80 are registered (`git worktree list`): /home/user/dr-*, /home/user/wt-*, and `.claude/worktrees/agent-*`. All except dr-origcars1 had a clean tree. They are removable (`git worktree remove --force <path>`) once the owner agrees; none holds work that is not on a pushed branch.

## What the game is now (counts measured 14-Oct, not copied from older docs)
Garage `CARS` 41, filler 24, earned 23 (9 level-earned T6 + 14 Legendary), Bespoke 14, Concept 6, event car 1, and 51 car ideas (`ideas.js`, `.ideas-check` expects 51). Mystery effects: `soupedUp` is taken out of the pool (CONFIG.mystery.effects comment says how to restore). Systems added in the long session (see the CHECKLIST items for each): model editor (`delivery/modeleditor.html`), z-fight detector (`render/zfight.js`, `scripts/.zfight-check.mjs`), blackout silhouettes, lamp table (`render/carlights*.js`, `scripts/lamps.mjs`), unlock / ECU cinematics, Crazey Jim's stall (`jimshop.js`, JIM table, 6 h rotation), Unlock everything two-mode setting (`unlockall.js`), Legendary earned cars (wreath decals), keys per car, events (`events.json`).

## Where the notes are
- `CHECKLIST.md` (repo root): the working list; items 211-262 are this session. Open ones: 258 (damage, watch the triangle cost), 259 (cosmetics set undecided), 260 (next idea batch awaiting approval), 261 (true-speed follow-ups: level clocks).
- Pictures sent to the owner live only in the old session's scratchpad (not in the repo): contact sheets for the top-up cars and the damage v1/v2 samples; re-render with the model editor or `scripts/shots.mjs` if needed.

## First steps for the next agent
1. Ask the owner (short): whether the live true speed and damage v2 are acceptable (both are on main, v1.1.128, but not played by hand), the triangle cost of damage (Mi Pad), and whether to rewrite the level clocks.
2. Answer the owner's last question properly: do the lamp GLOW and the Legendary wreath move with a dent? Lamp bodies do; the glow group (`render/lampfx.js`) is skipped on purpose; the wreath is unchecked. Render a damaged Legendary car by day and night first.
3. Build the approved next batch (CHECKLIST 260) with Opus agents under the Junker benchmark, one lamp table entry each.
