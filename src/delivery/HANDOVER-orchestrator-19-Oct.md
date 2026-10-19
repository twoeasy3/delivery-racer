# Delivery Racer: handover to the next orchestrator (written on 19-Oct-2026, end of the 17-19 Oct cloud session)

This is the NEWEST handover. `HANDOVER-orchestrator-15-Oct.md`, `-14-Oct.md` and older are history (their state and branch tables are out of date). Read `CLOUD-AGENT-README.md`, `CLAUDE.md` and `CHECKLIST.md` first (the "State on 19-Oct" at its top, then items 451 to 488 and the "17-19 Oct" section at its end). Every sha below was checked against `git log` / `git branch -r` / `git merge-base` on 19-Oct.

## State
- **`main` = v1.1.156-alpha** (`b54feba`, 17-Oct 16:33 UTC). Pushing `main` DEPLOYS the game (Cloudflare Worker `delivery`, `delivery.pingmathehippo.com`).
- **Replay fingerprint**: logic `8dbc477d85` / legacy `bcc9df44d0` (recomputed 19-Oct with `scripts/logic-hash.mjs` `fingerprints()`).
- **Built, NOT merged**, waiting for the owner's word: `claude/car-kit` (e18116c), `claude/trail-fix` (1f665d3), `claude/pose-sheet` (89036b2). Docs: `claude/handover-19oct` (this file + CHECKLIST, with `claude/checklist-next` merged in).
- Nothing was running when this was written.

## Who and how
- **The owner** is a game designer working from a **phone**. Short requests, blunt answers wanted; he reads stills on the phone.
- **The orchestrator (you, Claude) directs; it does not hand-edit code.** Each request goes to a background agent: a plain `Agent` call, model **opus**, run in the background. NEVER the Workflow tool.
- Each agent works on its own branch and worktree under `.claude/worktrees/<name>` (from `origin/main`), with `node_modules` symlinked to `/home/user/delivery-racer/node_modules` (untracked: never commit it).
- **Forward the agents' stills** to the owner with `SendUserFile` (look at them first; call out nonsense).
- **Completed agents can be resumed with `SendMessage`; stopped ones cannot.** Never stop an agent unless the owner explicitly says so.
- **Merging**: an integration agent builds `claude/integrate-<n>` (merges with `--no-ff`, renumbers CHECKLIST collisions, bumps `package.json`). YOU verify it: `origin/main` is an ancestor, clean `git status`, `vite build`, the key checks, the fingerprint (and that it moved only where a rules change was intended). Push ONLY when the owner says merge / push: from the integration worktree, `git push origin <sha>:refs/heads/main`.
- An earlier push this session was **denied by the auto-mode classifier** as a production deploy until the owner said it explicitly. Get his explicit word in the chat first.
- Remote branch deletion is refused here (HTTP 403): the owner deletes branches on GitHub.

## Owner's standing rules
- **UI text terse.** No helper prose on screens ("nothing verbose").
- **Cheap to run**: everything must suit a **low-end device** (say "low-end device", never a device name).
- **No humans in cinematics** (no people, hands, faces, figures).
- **Never `rm` with shell variables. No bare `git stash`** (the stash is shared across worktrees).
- Interim "waiting" pings: **one line**.
- **Update `CHECKLIST.md`** as items finish, saying what was and was not verified. Never claim "verified" without saying what was measured or seen.
- **No scope creep.** He asked for Mall Dash's turbo PICKUPS removed; an agent also removed the travelators (restored in 7e2ba8b). Check every diff against `main` so only the asked change lands.
- Still standing from before: merge only on his word; version bump on game-changing merges ("v1.1.N: ..."); never the full smoke test; never delete `.wav` / sound assets; screenshots through `scripts/shots.mjs`; cosmetics / render work must not move the replay fingerprint.

## Releases this session (all 17-Oct, UTC)
| Version | main sha | What |
|---|---|---|
| v1.1.153-alpha | `e696d97` (08:24) | Jim's Garage deprecated (Buy in the showroom, Garage under Options, Career chip), cutscene fixes, fireworks in both key unlocks (451-454) |
| v1.1.154-alpha | `5c0d89d` (09:48) | 12 branches (killfx-sync, ghost-model, lowrider-fix, trails, banner-poses, events-ui, window-edit, syrup-fix, fruitbasket, trail-fx, rats-fix, checklist-zfight: 456-466, integration 467) + the quick fixes (Verbosity 468, first-visit device defaults and one pedal 469, no pickup in the air 470; 471). Fingerprint moved by 470 |
| v1.1.155-alpha | `deb5900` (13:59), from 5c0d89d | Replay-cam fade 472 (4f24789), terse stage card 473 (a982baa), window Contour 474 (de1b1c1); integration 475 |
| (no bump) | `eddcd5a` + `7e2ba8b` (14:37, 14:50) | Mall fixes 476: orbit / photo off in Mall and Metro, wet-floor film, glass z-fight, dead-end barriers and side hold, food court pillars, turbo pickups removed (travelators restored by 7e2ba8b), wet-floor sign and trolleys. Fingerprint moved (track.js) |
| v1.1.156-alpha | `b54feba` (16:33), from 7e2ba8b | Trolleys rebuilt 477 (ed82057), fixed blueprint poses + the side pose back 479 (56f3cc1), 19 improved select stages 478 (a0a5ec9); integration 480 |

## Branches
**Unmerged, this session** (each is 1-2 commits on top of main):
- `claude/trail-fix` **1f665d3** (from b54feba): the equipped trail not reaching a run (re-pick on loadout / award / car change). CHECKLIST 482 on the branch. Render-only.
- `claude/car-kit` **e18116c** (1ab195a the kit + e18116c the wing fix; from b54feba). CHECKLIST 481 on the branch. Build byte-identical to main.
  - `car-kit.zip`: `/tmp/claude-0/-home-user-delivery-racer/d5c3b697-cfe8-54f1-aad3-35e8af561b80/scratchpad/car-kit/car-kit.zip` (1.7 MB, 18-Oct). The scratchpad is per session and will be gone: rebuild it from the branch, from the folder holding `car-kit/`: `zip -r car-kit.zip car-kit -x 'car-kit/renders/*' 'car-kit/examples-imported/*' 'car-kit/node_modules/*'` (car-kit/README.md "Zip it").
- `claude/pose-sheet` **89036b2** (from deb5900): `scripts/pose-sheet.mjs` + `REVIEW_POSES` in render/carstill.js. Its CHECKLIST entry is numbered **476, colliding with the Mall's 476: renumber (suggested 489) at merge**; reconcile its REVIEW_POSES with main's side pose in POSES (479).
- `claude/checklist-next` **986aefe** (NEXT ROUND, 483-488): merged into `claude/handover-19oct`.

**Unmerged, older, post-snapshot** (share history with main):
- `claude/glass-d3` 8326c19 (14-Oct): D3 cars' glass via cabinGlass; the owner discarded the d-/e- glass series.
- `claude/ideas-batch-d` a77062c, `claude/ideas-batch-d2` b37f045 (14-Oct): Wedge Microcar width / an unused material; superseded idea-car batches.
- `claude/perf-levels` 7a7a1bc (14-Oct): lazy level files; the owner said "Leave it out" (moves the fingerprint, no speed-up).
- `claude/perf-profile` bc11775 (14-Oct): the menu perf profile report (the fixes went in via perf-fixes).
- `claude/rims-spike` 5b11bec (14-Oct): THROWAWAY spoke-rim spike, not for main.
- `ccr-487101e2-72olli` b1dbf28 (15-Oct): the 15-Oct session's notes branch (WORKSHOP-DRAFT.md).
- `claude/cool-carson-f8qomf` 99b2df6 (15-Oct): COMMUTER-FIX-BRIEF.md, a brief for a Commuter redesign.

**Pre-snapshot** (70 branches, 11-14 Oct, NO common history with main: e.g. `special-events`, `concept-strike`, `ordinary-keys-*`, `original-cars-*`, `car-lights*`, `worktree-agent-*`): from the owner's old repository; ignore, do not merge.

**Worktrees**: 95 under `.claude/worktrees/`; most are of merged branches and can be pruned (`git worktree remove`) once the owner agrees.

## Key mechanics
- **Replay fingerprint** (`scripts/logic-hash.mjs`, built into `vite.config.js` BUILD.logic): a replay plays only under the rules it was recorded with. A *logic file* is every top-level `src/delivery/*.js` not on `NOT_RULES`, plus what those import (`render/` is outside unless a rules file imports it). Any rules change refuses every older replay ("The game has been updated..."): accepted for gameplay changes, never for render-only work. `carposes.js` is still on the rules list but the game no longer reads it (poses moved to render/poseassign.js); leave it alone. History: 33a0394c26 -> 057a22806d (470) -> **8dbc477d85** (476's dead-end rule in track.js).
- **`render/poseassign.js`**: blueprint card poses (top, hero, front, rear, side). `FIXED_POSES` = 131 of 186 cars (top 28, hero 30, front 30, rear 22, side 21); the other 55 use an FNV-1a hash over the five. Used by packs, What's inside, Crazey Jim, Where to get it. Check: `.poseassign-check`.
- **Select stages** (`render/stages/`): table-driven. `table.js` (one row per theme: skyline painters + props), per-theme files (volcano, port, wildwest, farm, alpine, city, steelworks, vegas), `kit.js` (shared unit shapes and `piece()`); `render/carstage.js` loads them (STAGE_FILES) and merges the props into ONE mesh. 4 draw calls a stage. Check: `.carstage-check`.
- **`render/scenefade.js`**: set dressing between the replay/photo camera and the car dissolves. Orbit and photo mode are OFF in Mall and Metro (`freeCameraAllowed()` in `render/tunnelshape.js`). Metro Run's shell shows a hole when faded (known).
- **Verbosity and device defaults** (`render/verbosity.js`, `render/device.js`): FIRST VISIT ONLY; a phone/tablet gets auto accelerate, Verbosity Low, on-screen controls, one pedal. Saved in local storage only.
- **Cracked glass** (`render/cracks.js`, `CRACKED-GLASS-NOTES.md`): prototype behind `?crack=on`, off for players. Owner: on for ALL players NEXT round, after tagging ~21 bubble-canopy cars (CHECKLIST 484).
- **Trail FX** (`render/turbotrails.js`): shows only while a turbo runs (owner: keep it so). The equip bug is fixed on `claude/trail-fix` only.
- **The car kit** (`car-kit/` on `claude/car-kit`): a self-contained kit so an outside agent with no game access can model a car.
  - Format `carkit/1` (JSON: primitives, extrude, loft, panels; colour roles; wheels; animations). Mounts: roof, cargo, wing, plates, decal areas.
  - Tools: `tools/check.mjs`, `tools/render.mjs` (25 views + contact sheet), `tools/selftest.mjs` (20/20), viewer `index.html`. Brief: `car-kit/BRIEF.md`.
  - Importer: `scripts/import-carkit.mjs` (spec -> game model module + table rows; `--verify --compare <car> --still`). Wired into nothing.
  - Cannot express: lumpy / noise-bumped meshes, textures (rust, printed cloth), per-car code hooks. The game draws decals on the flanks only.

## Review page
- Artifact **'Pose Pick'**: https://claude.ai/artifact/CDKLpmVbZ4y9ofbb8VXg8U (owner's, updated 17-Oct). The owner's picks are in its db, collection `picks`; read with the `ArtifactData` tool. They are already in poseassign.js.

## Open questions for the owner (recommendation in brackets)
- **Stage card** (STAGE-CARD.md): should Continue land on the next level? Enter = primary or Retry? Name the next objective on the card?
- **Events UI** (EVENTS-UI.md): tabs at the top or near START; the "Xmas" wording; Details open by default on tall phones.
- **Car-to-car hit debounce**: options A-D [B with a 0.4 s gap]; needs the scope, the trickle %, the gap length, and whether a heavy car resets it.
- **Smoke tests**: an agent was offered, not launched.
- **Trail**: should a lent vehicle wear the player's trail (17 levels use Classic)? A "turbo only" label on the Cosmetics trail preview?
- **Car kit**: tighten the lamp check (paired lamps, a distinct brake lamp, lamp size/spacing sanity); add a lumpy-surface part and a rust option (the Junker gap, 483); decals beyond the flanks need game work.
- **Stages**: Space stage's US-style flag; tiny lighthouses on the phone cards (coast, sea).
- **Mall / Metro**: Mall Dash not re-timed (125 s good / 95 s evil); Metro Run's shell reads as a hole when faded.
- **Night city**: a regression to verify.
- **Cargo z-fighting** (CHECKLIST 455, CARGO-ZFIGHT.md): 51 models. Worst: surfboard, toolbox, reactor, goldbar, winecase. Most pairs: chainletter 72, horseshoes 30, wardens 20, jumper 16, taxmen 15, telemarketers 13.
- **Floating windscreens**: Dune Buggy, Rally Wedge, Land Jetboat, Sidecar exceed Contour's limits. An agent to apply the safe Snap/Contour fixes as a committed patch was offered [do it]; no windscreen position has been edited in the repo yet.
- **Roadmap**: 51 (perf: instancing, draw distance on phones), 335 (more idea cars), 93 (obstacles between / across lanes), the Vegas gimmick, a fork level, 387 (giant damage rule), 338 (when to reveal hidden levels), 339 (Metro dead ends), 342 (no-bike / no-flying cars).

## Known failing checks on main (ignore, but name them)
- `.strike-levels-check`: 12 fails (same on main).
- `.events-ui-check`: 2 Details checks at 1100x650 (car-hunt, comet-hunt).
- `.replay-record-check`: flaky ("the rewind happened").
- `.pursuit-check`: flaky (passed once, at 480).
- eslint `src/delivery`: 11 known errors (4 no-sparse-arrays in render/audio.js; 7 unused vars in ideaModels2.js / ideaModels3.js). Re-run 19-Oct: 11.

## Housekeeping
- `/runchecks.sh` and an empty `/logs/summary.txt` at the filesystem root, left by an earlier integration agent (harmless; deletion was blocked). Offer the owner to remove them.
- Prune worktrees once branches merge.
- **Agent rule slips this session**: a bare `git stash` twice (quick-fixes agent); `rm -r` with a shell variable twice (pose-sheet agent). Put the rules in EVERY brief.
- Briefs: `CARGO-BRIEF.md` (repo root) for a cargo agent; `car-kit/BRIEF.md` (on `claude/car-kit`) for an outside car-modelling agent; `CAR-AGENT-PROMPT.md` for in-game cars.

## How to run
- Dev server: `node node_modules/vite/bin/vite.js` (http://localhost:5173/delivery/). Build: `node node_modules/vite/bin/vite.js build`.
- Checks: `node scripts/delivery-tests.mjs --list` / `--group <words,levels,smoke-levels,tiers,cars,cargo,gimmicks,obstacles,water,render,replay,smoke-quick> --no-lock` / `--changed`; one check: `node scripts/.<name>-check.mjs`. Never the full smoke.
- Stills: `node scripts/shots.mjs` (header documents it). Pose sheet: `node scripts/pose-sheet.mjs` (on `claude/pose-sheet`).
- Playwright with Chromium at `/opt/pw-browsers` (chrome: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Do NOT run `playwright install`.
- Fingerprint: `node -e "import('./scripts/logic-hash.mjs').then(m=>console.log(m.fingerprints()))"`.
- The scratchpad is per session and ephemeral: anything the owner needs must live in the repo.

## First steps for the next orchestrator
1. `git fetch`; confirm `origin/main` is still b54feba and the three branches above are unmerged.
2. Ask the owner (short): merge trail-fix / car-kit / pose-sheet? Then the open questions above, one line each.
3. Next round's items: CHECKLIST 483-488.
