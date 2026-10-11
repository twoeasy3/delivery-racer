# I2: can the Delivery Racer commits be dropped from origin? (investigation, 12-Oct)

Owner, Q17: "Defer this, investigate if it is feasible to drop all delivery game commits from the origin on this repo (basically time travelling back to before)".
Investigation only. Nothing was pushed, rebased or deleted in the real repo. Throwaway clones were made in the scratchpad.

## Answer

Feasible, and unusually clean: after the game began there is NO later site-only work. Recommended: option (a), reset main to f4b17c6 ("Stats and refactor", 4-Oct), after saving the one site fix bundled into the game's first commit and after taking a bundle backup. It needs a force-push, which is the real cost. If the game should live on, do (c) first (own repo with history), then (a) here.

## Counts (main = 690 commits, 148 of them merges)

- First game commit: f81d5c9 "Delivery game" (4-Oct). Parent f4b17c6 is the last pre-game commit; 49 commits lie before it, 641 from f81d5c9 on.
- By files touched (all 690): game-only (src/delivery, delivery/) 310; mixed (game plus anything else) 158; neither 222 (merges, scripts-only or empty commits).
- Commits since f81d5c9 that touch a real site file (outside src/delivery, delivery/, scripts/, package*.json, vite.config.js, eslint.config.js): ONE, f81d5c9 itself. It bundles genuine site work: the class view stacks the same Year/Make/Model across brands (getStackKey ignoreBrand in App.jsx, GalleryCards, GalleryGrid, useGalleryDom), schema.sql (+20), stats_to_sql.py, stats_import.sql (3666 lines). Going back to f4b17c6 loses these; restore by `git checkout f81d5c9 -- <those files>`. Its vite.config.js (+11, the delivery page inputs) and package.json lines are game wiring and stay out.
- The 27 non-merge commits after it with no src/delivery or delivery/ path touch only scripts/ (game checks, smoke test, screenshots), the lint setup, or nothing ("Trigger deploy" 12c9d01). All game tooling.
- src/worker.js and wrangler.jsonc are unchanged since f4b17c6; wrangler.jsonc names no delivery path; public/_redirects is only "/ /display 301".

## Size

Reachable objects: main 31.9 MB, f4b17c6 alone 2.1 MB. The game is about 30 MB of history (src/delivery is 19 MB at the tip). The old site history is small (biggest blobs: public_cars.json 0.8 MB, a 1.1 MB backup sql, a committed .vite/deps).

## Options

(a) Reset to f4b17c6. Tested in a scratchpad clone (checkout, node_modules junction, `vite build`): the site builds (4 s). Loses the game and the bundled site piece above (restorable).

(b) Rewrite history removing the game paths from every commit. git-filter-repo is NOT installed (I did not install it). Filter-branch equivalent, run on a clone:
`git filter-branch -f --prune-empty --index-filter 'git rm -r -q --cached --ignore-unmatch src/delivery delivery <the 56 game-only scripts/ files>' -- rewrite`
It ran at about 3 s per commit on this machine (30+ min for 690); I stopped at 42 of 690 for the timebox, so no resulting commit count or size was measured. Expected: because the pre-game history is already small and there is no later site work, the result is about the same tree as (a) plus the bundled site fix, but every hash from f81d5c9 on changes and vite.config.js/package.json keep game lines (path removal does not revert edits), so vite.config.js must also be edited or the build breaks. No advantage over (a); more work.

(c) Game into its own repo with its history: `git filter-repo --path src/delivery --path delivery --path <game scripts>` (or `git subtree split --prefix=src/delivery`, which takes only that folder). Not run (same cost as (b)). The game repo gets about 600 commits. This repo then does (a), or just deletes the game going forward in one commit (no force-push, but the 30 MB history stays).

## What it would break

- Live deploy: Cloudflare's Git integration builds on a push to main. A force-push to the pre-game tree deploys the pre-game site, so /delivery/ disappears from the live site at once (the SPA fallback then serves the site's app there).
- Build setup: depends on the game only through vite.config.js's delivery inputs (which exist only after f81d5c9). wrangler.jsonc, the worker and _redirects do not mention the game; /delivery/ is static assets from the build.
- Force-push needed for (a) and (b); not for the delete-going-forward variant of (c). Remote branches: origin/claude/sharp-wright-ezyc7q (9-Oct) and origin/cloudflare/workers-autoconfig (28-May) are both already in main; after a reset the first points at game history and would be deleted or left.
- Local: 71 branches (14 not merged into main) and 44 worktrees under .claude/worktrees now (29 at the brief), nearly all delivery-*. They keep working locally on the old history but cannot merge cleanly. Back them up, then remove with `git worktree remove` (never a recursive delete: node_modules junctions).
- Other clones: only the owner seems to use the repo (not checked); any other clone needs `git fetch && git reset --hard origin/main`.

## Safe sequence for the owner to approve

1. Stand-down: no agent working on main or in the worktrees.
2. Backup: `git bundle create ../carSite-all-<date>.bundle --all`, then `git bundle verify <file>`; also `git clone --mirror` to a safe place. Keep both until the game has a home.
3. If the game is to live on: run git-filter-repo on a fresh clone for the game paths, push to the new repo, check it builds and plays there.
4. On a fresh clone make branch `site-clean`: `git reset --hard f4b17c6`, then `git checkout f81d5c9 -- src/App.jsx src/components src/hooks schema.sql stats_to_sql.py stats_import.sql` and commit. Run `vite build` and look at the site.
5. Show the owner the diff of site-clean against current main limited to non-game paths (should be just those files).
6. With the owner's go-ahead: `git push --force-with-lease origin site-clean:main`. Watch the Cloudflare build; check the live site (gallery, display mode; /delivery/ gone).
7. Delete the stale remote branches if wished; remove local branches and worktrees; `git gc --prune=now`.
8. Keep the bundle for a few weeks.

## Not checked

GitHub branch protection, collaborators, forks; the Cloudflare dashboard's build command and any routes outside wrangler.jsonc; whether the live D1 matches stats_import.sql; how a deploy of the pre-game tree behaves live; finished (b)/(c) results and sizes (stopped for time); git-filter-repo itself.

## What I ran

git log / rev-list --disk-usage / diff --stat on the real repo (read only); `git clone --no-hardlinks --no-local` into the scratchpad (cA, cB); checkout f4b17c6 plus `vite build` in cA via a node_modules junction (removed with rmdir; the real node_modules is intact); filter-branch in cB (stopped at 42 of 690). One `git gc --help` call by mistake opened a browser window; no repo effect.
