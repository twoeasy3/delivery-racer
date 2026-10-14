# Delivery Racer: read this first (for the cloud agent)

This repository holds Delivery Racer only: a lane-based 3D delivery racer (three.js, Vite). It is a single snapshot of
the owner's local main at 9ee71b6 (the owner's car-collection site and its data were removed; there is no earlier
history here). The COMPLETED work is the tree; the UNCOMPLETED work is in `WIP/` as one patch per branch, with
`WIP/INDEX.md` saying what each is, what was seen and not seen, and how to apply it. THIS REPOSITORY IS DEPLOYED:
it is a static-assets Cloudflare Worker (`wrangler.jsonc`, no Worker script, no database), built and deployed by
Cloudflare from `main` and served at `delivery.pingmathehippo.com` (`/` redirects to `/delivery/`). Pushing to `main`
deploys the game.

## What the game is

Delivery Racer is a lane-based 3D delivery racer (three.js, Vite). The player drives a package to a drop before the
clock runs out, as Good or as Evil, through traffic that has moods and grudges. About 57 levels (51 deliveries, 6 races),
37 cars in a garage with star tiers, cargo, gimmicks (hazards the levels throw), a level editor, two screensavers.
The code is `src/delivery/` and the pages are `delivery/*.html`. The game needs no API and no database.

The owner works from `CHECKLIST.md` at the repo root: it is the working list of ideas, what is done and what is
verified. Read it first, and tick and annotate items there as you finish them.

Documents to read, in order: `src/delivery/README.md`, `src/delivery/HANDOVER.md`,
`src/delivery/HANDOVER-orchestrator-12-Oct.md` (the newest state of everything; section 5 is the owner's open
questions), `src/delivery/OPEN-QUESTIONS-10-Oct.md` (22 to 30 are open or just closed), `src/delivery/TESTS.md`,
`src/delivery/PLAN-delivery-subdomain-12-Oct.md` (the plan for the game to have its own repo and subdomain; this is
that repo).

## How to run

Install with `npm install` (Node 24 was used; three 0.160.0, Vite 8). The `npm run` scripts were unreliable on the
owner's Windows machine, so call node directly:

    node node_modules/vite/bin/vite.js            # dev server, then http://localhost:5173/delivery/
    node node_modules/vite/bin/vite.js build      # the build (no Worker needed for the game)
    node scripts/delivery-tests.mjs --list        # the checks, grouped, with what each covers and the time
    node scripts/delivery-tests.mjs --changed     # the groups that fit what you changed
    node scripts/delivery-tests.mjs --group words,tiers
    node scripts/delivery-levels-check.mjs        # every level builds and starts (about 50 s)
    node scripts/.tiers-check.mjs                 # any one check: scripts/.*-check.mjs, all headless

Useful addresses: `?level=<id>`, `?car=<id>`, `?garage`, `?autostart`, `?tiers=0` (tiers off for a visit),
`?ge=<n>` or `?ge=all` (the Good/Evil cue ideas, off by default). Pictures: `node scripts/shots.mjs` drives a
browser (see its header).

Checks and rules: `scripts/delivery-tests.mjs` is the grouped runner (words, levels, smoke-levels, tiers, cars, cargo,
gimmicks, obstacles, water, render, replay, smoke-quick), see `src/delivery/TESTS.md`. The heavy ones take a lock file
in the OS temp dir (`delivery-heavy.lock`, `delivery-heavy-2.lock`) because two machine-hungry runs together make the
checks flaky; use `--no-lock` if you are alone. The checks load the game's source through Vite: do not edit
`src/delivery` while one runs. Never run the FULL smoke test (`scripts/delivery-smoke.mjs`, about 18 min): use the
groups above, and the quick smoke only when asked. Syntax-check changed files with `node --check` at least.

## Rules (the owner's)

- Never remove `.wav` (or any sound) assets, even when nothing seems to use them (the owner, 13-Oct).
- This repository deploys on push to `main` (Cloudflare builds `npm run build` and runs `npx wrangler deploy`): check
  before merging to `main`. Never add bindings (database, buckets) or a Worker script without the owner. Pushing to
  the owner's old site repo (`collection-site`) would deploy the live collection site: do not.
- Merge with `git merge --no-ff`, main first: merge `main` into your branch, fix, check, then merge the branch into
  main. Commit each whole working piece at once, with a message that says what and why, ending with the
  `Co-Authored-By` line.
- Version every merge (the owner, 11-Oct): the game's version is `1.1.<n>` in `package.json`, shown on the front
  screen with the commit (`src/delivery/version.js`). A merge to `main` that changes the game (anything the player
  could notice: code, levels, words, pictures, sounds) bumps the patch `<n>` by one, in the merge's branch before it
  goes in, and the merge message starts with the new version ("v1.1.8: ..."). A merge of notes or checks only does not.
  1.1.7 is the seventh merge after the one that put the version on the front screen (3f64b51).
- Looking is part of finishing: take stills (scripts/shots.mjs) and READ them; say plainly what was seen and not seen.
  Do not chase metrics for an hour; land a working version and report.
- Model quality: a new model has a distinct idea; a black face means an open top; no z-fighting (coplanar faces) and no
  phasing through things; look at it from all sides; draft the ideas before modelling a batch.
- Gimmick design: never stop the car, no bust without counterplay, no delivery variants, no more moving explodable
  obstacles; a level has one idea and a few thematic gimmicks, never one of everything; rockfall only under a rock face.
- Obstacles fit the level: plain obstacles themed to the level, readable at a glance, no generic crates or tyres.
  Levels 32 onwards are models (minus cramming): each theme its own plain obstacles.
- Do not mention a casting's colour or livery in a car's description unless the name denotes one specific real vehicle.
- Pickups: many more cash pickups, rows of two or more side by side.
- Windows: a worktree's `node_modules` may be a junction; never delete such a directory recursively (`cmd /c rmdir` the
  link first). A heavy browser run is one at a time.
- The Good/Evil switch: `src/delivery/sidecues.js` exports `geOn(n)`; the ideas are numbered 1 to 12 and live behind
  `?ge=n`. The owner has not chosen; the recommended three are 1 + 8 + 11 (with 10 teaching it).

- **Textures:** only the car textures that exist now (the owner, 14-Oct); no new textures, and none bigger than today's biggest
  (256 x 256), unless the owner asks or it is impossible otherwise (say why). Flat colours, shapes and vertex colours instead.
  Details: CAR-AGENT-PROMPT.md.

- **Cinematics (unlockcine.js and any later cutscene):** render NO humans (the owner, 14-Oct): no people, hands, faces, silhouettes of figures; use props, signs, text and the cars only; hide any driver figure a car model carries.

## The unfinished work

See `WIP/INDEX.md`. Take an item with `git apply --3way WIP/<branch>.patch`, then look at it (a still, a check) and commit
it yourself. Nine patches: carfix (Q8, Q16), prank-ideas, garagetiers (L4 to L7: the back button was never tried),
prank-a (P1 to P4; conflicts with the merged prank batches B and C, add its entries by hand), underglow, ge-road,
ge-ui (the Good/Evil cue ideas 1 to 12 behind `?ge=`), stats (HELD by the owner), themes-toys-wip (set aside). The
patches overlap: apply garagetiers, carfix, prank-ideas first; the Good/Evil ones only after the owner picks. The
branches and the stills named in the index are on the owner's machine and cannot be seen from here.

## What was seen, what was not

Seen by the owner or in stills: everything on `main` that the commit messages say was seen. Unseen: `carfix`,
`prank-ideas`, `ge-road` entirely; `garagetiers` (silhouettes, back button), `ge-ui` (sound, small phone), `prank-a`.
Open owner questions that matter (from OPEN-QUESTIONS 22 to 30 and the 12-Oct handover section 5): 22 what players
get for both medals on a level (recommended: a tip bonus scaled to the tier); 24 whether "move all blasts into the
blasting gimmick" meant a real mechanics move or only the card split (left as the card split); 28 the game on its own
subdomain (A: `delivery.<domain>` custom domain; B: workers.dev), with a hash migration of saves; 30 low bridges as
built (two bars, 60 m apart) not yet seen rendered; the Good/Evil picks; which levels carry which prank cargo; merge
`delivery-crests`?; the tier table's places for specials/amphibious/races (`scripts/tiers.mjs move`). Closed: Q5
supercharger = Turbo; Q13 funeral Jerk overrides a running mystery; Q21 doubtful placements removed; Q18/Q19 damage.
