# Sweep of the worktrees, 12-Oct (nothing deleted; the owner decides)

Taken from the sweep worktree at main `1077340`. "Ahead" = commits not on main. All but those named below have
no uncommitted work and nothing ahead of main, so their branch is merged (a plain ancestor of main).

## Worktrees with something to say

| Worktree | Branch | Uncommitted | Ahead of main | Class |
|---|---|---|---|---|
| (main checkout) | main | `CHECKLIST-11-Oct.md` modified (the orchestrator's) | 0 | left alone: the orchestrator's |
| delivery-crests | delivery-crests | none | 2 (airtime proposal and script, crest audit script) | unmerged-safe (only adds files) |
| delivery-themes-c | delivery-rework-b | 150 files (Hong Kong scenery, agent 2a) | 3 (re-laid level, two merges of main) | unmerged-in-doubt: live work, not touched |
| delivery-tests | delivery-tests | `scripts/delivery-smoke.mjs`; untracked `scripts/_p1..3.mjs` | 0 | in use by another agent, not touched |
| delivery-prank-ideas | delivery-prank-ideas | none | 0 | in use by another agent, not touched |
| delivery-sweep | delivery-sweep | none | this sweep and the board fix | mine |
| (no worktree) | delivery-stats | n/a | 4 | unmerged-in-doubt: HELD by the owner until the rebalance |
| (no worktree) | delivery-themes-toys-wip | n/a | 1 (WIP, 21 files, 783 lines) | unmerged-in-doubt: see below |

No worktree besides the three in use had uncommitted work, so nothing was committed on anyone's branch.

## Merged, clean worktrees (24; branch is an ancestor of main, nothing uncommitted)

delivery-batch (worktree-delivery-batch), delivery-cargo-evil (delivery-level-text), delivery-cargo-good
(delivery-rework-d), delivery-cargo60, delivery-cargodoor (delivery-cargo-door), delivery-cargofix,
delivery-circuits (delivery-obstacles-2), delivery-city-levels (delivery-themes-e2), delivery-garagefix,
delivery-garageui, delivery-gimmicks (delivery-rework-e), delivery-ideas-ge, delivery-levelcargo,
delivery-levelfix (delivery-fallout), delivery-menu (delivery-themes-f2), delivery-menufix, delivery-mothership,
delivery-qfix, delivery-radbalance, delivery-themes-b (delivery-rework-f), delivery-tiers, delivery-tow,
delivery-trains, delivery-ui (delivery-mobile), delivery-washboard, delivery-words.

(That is 26 names by branch; the count under `git worktree list` is 31 lines including main, this sweep, the
crests, rework-b, tests and prank-ideas worktrees.)

## Looks removable (owner's call; each is merged and clean, so removal loses no commit)

All of the merged list above. Idle since 10-Oct and certainly finished: delivery-batch, delivery-cargo-evil,
delivery-circuits, delivery-menu, delivery-themes-b, delivery-ui. The 11-Oct ones (cargo60, cargodoor, cargofix,
garagefix, garageui, gimmicks, ideas-ge, levelcargo, levelfix, menufix, mothership, qfix, radbalance, tiers, tow,
trains, washboard, words) are merged too but may still be resumed by an agent for the same area (the "resume
before spawn" rule): remove only what will not be resumed. Before removing any: `cmd /c rmdir <path>\node_modules`
first (junction). The branches would remain after `git worktree remove`.

## delivery-themes-toys-wip

One commit `ad3a435` (10-Oct, "set aside, unfinished and unchecked") on an old base (`14e3c56`): the toy room's
own gimmicks (`toys.js`: rolling marbles that shoot up the road, a loop of track, a cat's paw), `air.js` and
`CONFIG` for low gravity, `render/toys.js`, level schema and menu hooks, a `toys.json` level using them, and a
themes check script. Main has since moved a long way (tiers, words files, 70 levels) and already holds a toys
level and `toyroom` theme (`toys.json` differs by 110 lines). Not small, not checked: recommendation is MINE FOR
PARTS (the toys.js marble/loop/paw logic and render/toys.js are self-contained; the low-gravity `air.js` overlaps
the Moon airtime proposal on delivery-crests), do not merge as is, do not delete the branch until the owner has
chosen.
