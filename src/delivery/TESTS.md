# Running Delivery Racer's tests by group (WIP)

`node scripts/delivery-tests.mjs --list` names the groups, what each covers, and about how long it takes (on a busy machine).
Run the ones that fit what you changed; do not run the whole smoke for a level edit.

    node scripts/delivery-tests.mjs --group words,tiers        run those groups
    node scripts/delivery-tests.mjs --changed                  groups chosen from the files changed against main + working tree
    node scripts/delivery-tests.mjs --changed --dry            only say which (add --dry to anything)
    node scripts/delivery-tests.mjs --fast                     every group with no heavy test (a few minutes)
    node scripts/delivery-tests.mjs --group smoke-levels --levels=quarry-run,toys    the smoke's per-level section for those levels, ~10 s

Groups: words, levels, smoke-levels, tiers, cars, cargo, gimmicks, obstacles, water, render, replay, smoke-quick.
Heavy (take one of the two heavy locks, Temp/delivery-heavy.lock or delivery-heavy-2.lock, themselves; wait if both are taken):
the quick smoke (about 5 min), `.replay-check.mjs`, `.ideas-check.mjs`, `delivery-levels-check.mjs` (about 50 s). `--no-lock` skips the lock.
Seeded checks repeat: the smoke is seed 20261008 (`--seed=n` for another).

Writing a headless check that drives levels: the tiers are on by default and a tier level starts only in a car of its tier
(`Game.start` refuses and builds nothing otherwise). Use `boot({ ownAll: true })` (scripts/delivery-headless.mjs), and
`tiers: false` where the check is about what a given car does and the tier's car would be put in instead. Address levels by id.

Not in a group: `shots.mjs` (a browser), `delivery-probe.mjs`, `level-clocks.mjs`, `tier-money.mjs`, `delivery-damage-check.mjs`,
`delivery-wet-check.mjs`, `delivery-obstacle-sizes.mjs` (tools that print), `.replay-trace.mjs`, `.gimmick-kinds*.mjs`.
