# WIP: the unfinished work, as patches (12-Oct)

`main` of this repository is the owner's COMPLETED game work (a snapshot of his local main at 9ee71b6, game files only).
The unfinished work lived on local branches and worktrees on the owner's machine; it is carried here as
patches, one per branch (`git diff main...<branch>`, game paths and text files only), so nothing is merged and nothing conflicts at
rest. The branches themselves do not exist in this repo. This repo deploys on push to `main` (see CLOUD-AGENT-README.md).

Apply one (from the repo root): `git apply --3way WIP/<branch>.patch`, then check, then commit it yourself. Every patch
was tried on this tree with `git apply --3way`; results below. Each patch includes its own scratchpad .md
where one exists; copies of the scratchpads/idea drafts are also beside the patches as `<area>--<file>.md`.

The cloud agent cannot see the owner's machine: stills, screenshots and worktrees named below exist only there.

## Status now (11-Oct, after the cloud session's work on main): what each piece of work is, and what is left

Checked against main as it stands (`git apply --check`; this repo has no history before its snapshot, so `--3way`
cannot help: a patch that fails needs its hunks redone by hand against today's code).

| Area | Patch | On main already | Left to do | Applies now? | Waiting on |
|---|---|---|---|---|---|
| **Progression and garage** | garagetiers | ALL of it: level 4 on 3 medals (56), the back button (63), the garage silhouettes and phone stats line (68) | the garage's look ahead: the next tier's cars as black silhouettes, "Locked car", nothing further on; the phone garage stats line | no (its tiers, nav and game hunks are on main: redo the garage hunks by hand) | nothing: built, the silhouettes never looked at |
| **Good / Evil cues** (12 ideas behind `?ge=n`, all off by default) | underglow (1-4), ge-road (5-7), ge-ui (8-12) | nothing | the owner picks (recommended 1 + 8 + 10 + 11); merge the picked ones, switch them on, tune the sounds by ear | underglow and ge-road yes; ge-ui no (`render/garage.js`) | the owner's pick |
| **Prank cargo** (Evil cargo, 10 ideas) | prank-a (P1-P4), prank-ideas (the draft and other bits) | P5 to P10 (pie catapult, air horn, ghost, nested boxes, spider, ink) | P1-P4: whoopee cushion, bucket on a trip wire, squirting flower, chattering teeth (models written, partly seen); which levels carry which prank | prank-a no (append its four entries to `cargo.js`, `cargoText.json`, `cargoModels.js` by hand; its new file applies); prank-ideas yes | the owner: which levels carry them |
| **Odds and ends** in prank-ideas | prank-ideas | ALL of it, and the ideas draft (CHECKLIST 69) | volcano island floor and fog fade, Evil liveries for tier-4 Blue Stars and amphibious cars, Super versions of three earned cars, the Saucer hovering in the garage: none of it seen | yes | a look |
| **Car fixes** | carfix | ALL of it (CHECKLIST 67) | learner driver: L plates the right way round, 0.5 m plate, wobble, full pace; kangaroos 1.5x and brighter; the Junker's blurb inside 70 characters | no (`carText.json`: the blurb line, by hand) | nothing |
| **Car stats Delivery and Nerve** | stats | nothing | two stats scaling Evil damage and Good happiness by tier, shown in the garage | no (garage, menu, css) | HELD by the owner (question 5c2) |
| **Toy room gimmicks** | themes-toys-wip | nothing | marbles, loops, a cat's paw, low gravity, a level for them: unfinished, unchecked | no (21 files, wide conflicts) | a reference only |

Also noted, no patch: Hong Kong Harbour's FRESH TAR board reads backwards on its left-hand-drive road (check Tokyo's).

Done 11-Oct: carfix, garagetiers, prank-ideas (CHECKLIST 67 to 69). Left: whatever the owner picks of the
Good/Evil cues and the prank cargo P1-P4. Stats stays held; toys stays a reference.

## The patches

| Patch | Applies to main | What it is | Seen / unseen |
|---|---|---|---|
| `delivery-carfix.patch` (7 commits 1d3873b..8fb5dde) | `--3way` clean (plain `git apply` fails on carText.json context) | Q16 learner driver: L plates un-mirrored, 0.5 m plate, wobble 1.1, cruising at the level's full pace; Q8 kangaroos 1.5x larger and brighter; the Junker's blurb inside the words check's 70 characters | UNSEEN: words check only; cruise pace "not measured" |
| `delivery-prank-ideas.patch` (7 commits 943eab2..6d69841) | plain clean | the prank-cargo ideas draft (`IDEAS-prank-cargo-12-Oct.md`, K3; the ten items are built elsewhere), volcano island floor and fog fade, Evil liveries for tier-4 Blue Stars and amphibious cars (Q42/Q31/Q39/Q38 area), Super versions of three earned cars, the Saucer hovering in the garage | UNSEEN |
| `delivery-garagetiers.patch` (7 commits fb28721..538bb58) | plain clean before 11-Oct; now its level 4 on 3 medals (L6) and its back button (`nav.js` and its hooks) are on main (CHECKLIST 56, 63): skip or take main's side for those hunks | L4 to L7: the 4th level of a tier needs 3 medals (`tiers.js`, `tier-money.mjs`, `.tiers-check`), garage hides cars beyond the next tier (black silhouettes, "Locked car"), a browser back button (`nav.js`, an entry per screen), phone garage stats line | silhouettes shot but NOT read; back button NEVER tried in a browser; `.ideas-check` fails "bubble delivered in 132 s" (a gameplay sim, not compared with main) |
| `delivery-prank-a.patch` (2 commits bf60b08, cd9a418) | CONFLICTS with main in `cargo.js`, `cargoText.json`, `render/cargoModels.js` (prank batches B and C were merged since: append the four entries to the lists by hand; `render/cargoModelsPrankA.js` is a new file and applies) | P1 whoopee cushion, P2 bucket on a trip wire, P3 squirting flower, P4 chattering teeth as Evil cargo, a sight only, three states, no in-play effect, "WIP" commit | UNSEEN: written, registered, worded; show in `delivery/cargo.html` first; no level names them |
| `delivery-underglow.patch` (6 commits e6001d3..1c5853d) | plain clean | Good/Evil ideas 1 to 4 behind `?ge=n`: side ring/horns, glow under the car, tail lights, exhaust puffs (round) | no scratchpad; whether it was seen is not recorded: treat as unseen |
| `delivery-ge-road.patch` (5 commits 074b9d5..5a0e04f) | plain clean | Good/Evil ideas 5, 6, 7 behind `?ge=`: camera fov/height/sway, edge vignette, faces on Good traffic | NOTHING seen: not even loaded in a browser with the switch on; only `node --check` |
| `delivery-ge-ui.patch` (7 commits 7f8ed78..db09136) | plain clean (stills excluded) | Good/Evil ideas 8 to 12 behind `?ge=`: cargo corner halo/horns, clock rim, menu badge, engine voicing, start-line cue | stills seen at desktop and 390x700 (local, below); 11 and 12 (sound) NOT heard; no 360x640 stills; no checks beyond `node --check` |
| `delivery-stats.patch` (4 commits b716066..0161d71) | CONFLICTS in `render/garage.js`, `render/menustage.js` (and menus.css context) | two car stats, Delivery and Nerve: scale an Evil package's damage and a Good one's happiness by tier; shown in the garage, the comparison card, the start screen | HELD by the owner: do not merge without his answer (question 5c2) |
| `delivery-themes-toys-wip.patch` (1 commit ad3a435) | CONFLICTS widely (config.js, game.js, levels.js, main.js, progress.js, track.js, toys.json ...) | set-aside WIP: the toy room's own gimmicks (marbles, loops, a cat's paw), low gravity, a toy-room level using them | unfinished and unchecked; a reference, probably cannot be applied as is |

Patches against each other (applied in sequence on main with `--3way`): garagetiers, carfix, prank-ideas, underglow and
ge-road apply one after the other with no conflict; `ge-ui` then conflicts with `garagetiers` in `render/garage.js`;
`prank-a`, `stats` and `themes-toys-wip` conflict as above. The Good/Evil patches (underglow, ge-road, ge-ui) each add
the same `sidecues.js` (identical, byte for byte): apply one, and for the others a conflict on that new file can be
resolved by taking either. Suggested order (from HANDOVER-orchestrator-12-Oct.md section 4): garagetiers, then
carfix and prank-ideas, then the prank-a entries by hand, then the Good/Evil patches only after the owner has picked
(each idea is its own commit on the original branch, so cherry-pick just the picked ones; the commit ids in the table
are the local branch's commits and are NOT in this repo).

## Uncommitted work found in the worktrees

Only one worktree had uncommitted changes: `.claude/worktrees/delivery-ge-ui`: 34 modified PNG stills in
`src/delivery/geshots/` (the stills were retaken after the last commit; no text changes). They are binary and not
carried. Local folder (owner's machine only): the delivery-ge-ui worktree's src/delivery/geshots (35 stills in level/, phone/, menu/, menuphone/).
(35 stills in `level/` , `phone/`, `menu/`, `menuphone/`). The same set at the last commit is on the local branch.
All other worktrees were clean.

A note, not a patch: Hong Kong Harbour's (level 27) FRESH TAR board is mirrored on its left-drive road ("FRESH TAR
STICKY" reversed, seen again at s 1000): the sweep's left-drive board fix did not cover it; fix it in the board's
lettering code so every left-drive level reads right, and check Tokyo's.

## Owner questions attached (OPEN-QUESTIONS-10-Oct.md 22 to 30; HANDOVER-orchestrator-12-Oct.md section 5)

22 what players get for earning both medals on a level (recommended: a tip bonus scaled to the tier); 24 whether "move
all blasts into the blasting gimmick" meant a real mechanics move (left as the card split); 25/28 the game on its own
subdomain (A `delivery.<domain>`, B workers.dev; saves by a URL-hash hand-over); 30 the low bridges as built
(two bars 60 m apart) and the Q18/Q19 damage numbers, bars not yet seen in a still; the Good/Evil picks (recommended
1 + 8 + 10 + 11); which levels carry which prank cargo; crests merged? and moon airtime option A; the tier table's
places for specials/amphibious/races. Rules: see CLOUD-AGENT-README.md.

## What was removed and disabled in this repository

This repository is the game only, published as one snapshot commit (no history). The owner's car-collection site is
not here: its React app, Worker, D1/R2 schema, collection data and backups, import scripts, server.py, start-dev.bat,
the site's `wrangler.jsonc` and `public/_redirects` (this repo has its own, for the game), the site-only scripts and assets, and the three OpenStreetMap map caches
under `scripts/circuits/cache` (`scripts/circuit-from-osm.mjs` refetches them). The tree deploys as a static-assets Worker
(`wrangler.jsonc`, `npm run deploy`); there are no workflows.
The patches in this directory are against this tree: hunks outside the game paths do not exist (none were found).
The local paths of the owner's machine in the original notes were replaced by placeholders (`<repo>`, `<TEMP>`,
`<scratchpad>`, `<home>`).
