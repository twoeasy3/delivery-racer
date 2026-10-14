# Handover, 14-Oct (end of session)

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
