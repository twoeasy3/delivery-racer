# Delivery Racer: handover to the next orchestrator (written on 12-Oct, 2026-10-12, at the owner's stand-down)

Nothing is running. Every agent of the 12-Oct session has stopped, and their ids will not exist in yours: start
fresh agents, each brief carrying everything it needs (or resume a finished one only if you can: a SendMessage to a
finished agent resumes it from its transcript). Companion files in `src/delivery`: `SCRATCHPAD-12-Oct.md` (the
loose ends, with traps), `CHECKLIST-11-Oct.md` (state block at the top, section L, sections A to K),
`OPEN-QUESTIONS-10-Oct.md` (questions 1 to 30), and each branch's own `SCRATCHPAD-<area>-12-Oct.md` in its
worktree (listed in section 3).

## 1. THE PROMPT (paste this to the next orchestrator)

> You are taking over as the orchestrator for Delivery Racer, the game in src/delivery of this repo
> (<repo>, branch main, the MAIN checkout). Two sessions have run (11-Oct
> and 12-Oct) and both stood down. Nothing is running. Read these files in src/delivery before doing anything, in
> this order: (1) HANDOVER-orchestrator-12-Oct.md (this file); (2) SCRATCHPAD-12-Oct.md (loose ends and traps);
> (3) CHECKLIST-11-Oct.md (the state block at the top, then section L and sections A to K: search it, do not read
> the 10-Oct checklist); (4) OPEN-QUESTIONS-10-Oct.md (decisions waiting on the owner: questions 22 to 30 are
> the live ones; add new ones there, do not ask them again in chat).
> Your role, in the owner's words: "Please only edit the checklist, merge and send messages to agents and
> start/end agents." Investigating, measuring, running checks, editing code or levels, and taking screenshots go
> to agents. (The owner may, in the moment, say "Do it here. No agents.": then do exactly that, and say so.)
> Standing rules:
> - Pushing main deploys the live site (Cloudflare's Git integration): NEVER push; only the owner says push, and
>   you say plainly what had and had not been checked. Never run the FULL smoke test (scripts/delivery-smoke.mjs);
>   the QUICK one (`--quick`, about 5 minutes) only when the owner asks, by an agent, never by you.
> - A request starts at once only if the owner labels it (high priority, jump the queue, bump); otherwise it goes
>   on the checklist and to the next free agent; tell the owner where it sits. The owner has twice paused the
>   assignment of new tasks ("No more new tasks by the way", 12-Oct): whether the pause stands is for the owner
>   to say; ask before starting anything new.
> - Agents: today's lift of the agent-count and effort limits ended with the day. Ask the owner the limit (it was
>   five or fewer, MEDIUM effort, never High); the owner said "The number of agents is increasing": keep the
>   count low and end finished agents. Fable for creative work (models, themes, levels), Sonnet 5.5 for code.
>   Resume a finished agent in the same area (transcript under ~150k tokens) instead of a fresh one.
> - Agents work in their own worktree under .claude/worktrees (`git worktree add .claude/worktrees/<b> -b <b>
>   main`, then `cmd /c mklink /J node_modules <main>\node_modules`), commit each whole piece at once on their
>   own branch, never push, never edit the main checkout. Never recursively delete a worktree holding a
>   node_modules junction: `cmd /c rmdir <path>\node_modules` first.
> - HEAVY JOBS (anything with a browser: screenshots, replay/ideas/levels checks, smoke): TWO locks,
>   `mkdir <TEMP>/delivery-heavy.lock` else `...delivery-heavy-2.lock`; one heavy job per
>   agent; rmdir the moment it ends; remove only a lock older than 25 min; put this in every brief. Never
>   `rmdir` a lock you do not hold (it happened). The levels and replay checks need no browser (no lock).
> - Nothing unseen goes into main: an agent looks at its own work in stills (it must READ the image files) and
>   corrects it before you merge. Merge only what is whole and verified, and not a branch the owner has a
>   question pending on. `git merge --no-ff <branch>` in the main checkout, ONE merge per command, message in
>   the repo style ending `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; commit your own
>   checklist edits first, by name. If a merge conflicts in code, abort it and send it to the branch's agent
>   ("git merge main, keep both sides, rerun the checks"); never resolve code by hand. Ask before deleting
>   anything outside the repo.
> - Pictures: the owner finds the chat noisy. Never send pictures unprompted; give file paths only, and show the
>   pictures after the owner has answered. Keep every report to the owner short: lead with the result, say what
>   was and was not verified.
> - Agents report to the session that spawned them. A session that is not the spawner never sees an agent's
>   report unless the spawner forwards it. When you are a subagent of the "front" chat, say so in every brief;
>   do not resume a finished agent just to forward a report; never send an agent `git ... --help` or `git help`
>   (it opens git's manual page in the owner's browser): use `-h`.
> - Model quality rules for every model brief (the owner was angry at the C41 to C60 batch): each model its own
>   distinct idea and silhouette; look at it from front, back, side and above, in every state, and at the 112x84
>   tile; an open-topped container is a flat BLACK face across its opening with the contents standing proud
>   (no brown lid); no coplanar faces (z-fighting); nothing passing through anything else; within a lane
>   (3.5 m); for a BATCH of new things, draft ideas for the owner to OK first; look at the best older models
>   (Porcupine, Specimen Jar, Egg in a Nest) as the bar.
> - Level briefs: levels 32 onwards are the owner's models (minus gimmick cramming); one idea; no cramming
>   (never quote a target count of kinds); gimmicks must be thematic (the 12-Oct audit
>   AUDIT-gimmick-theme-12-Oct.md is the reference: no burst mains, potholes or tunnels where the theme does
>   not suit); rockfall only under a rock face seen in a still; each theme its own larger, plain obstacles
>   through the theme mapping, never tyres, never the shared haybales or beach ones; signs before crests; note
>   the level id and s of each still. Judge phone layouts at 360x640 to 390x700 visible, not 844.
> Start by telling the owner, in a short list: what is live against what is only local on main; what is open and
> waiting on them; and your plan for the first three steps (section 8). Then wait for their OK.

## 2. Where the code is

- **Live / pushed:** `origin/main` is `1077340` (the 11-Oct stand-down commit; the last recorded push is
  2026-10-11 02:22 per `git reflog show origin/main`). The 11-Oct handover said live was `ceecc34`: it has been
  pushed past that since. Confirm in the Cloudflare dashboard what is actually deployed before you tell the owner.
- **Local `main` is at `8c3ae42`+ (60 commits ahead of `origin/main`, 27 of them first-parent) and NOT pushed**
  (`git log --oneline origin/main..main`). The tree is clean (all orchestrator edits are committed).
- **Merged into `main` on 12-Oct (first-parent order, hashes of the merge commits):**

| Merge | Item | What | Verified | Not verified |
|---|---|---|---|---|
| `fc0f937` delivery-carfix | L2, L3 | Junker 25/9.5 (was 22/8), Darkvan 24/8.5 (was 21/7); the race screensaver crash (racewatch stored names in `car.driver`, which the pursuit made a function; now `car.driverName`) | race watch 60 s headless on six circuits | stills of either screensaver; lint; cruising time |
| `4425690` delivery-damage | Q18 (first), Q19, Q4, Q10, Q9 | a flat 15 m/s clamp (SUPERSEDED, see below); damage by size; 45 m wet after a burst main (`CONFIG.waterMain.wetAfter`); Punctures card; Quarries and Blasts cards (a card split, not a data move: open question 24) | syntax; `Collision.check()` headless; levels and replay checks under a lock | gimmick cards in a browser |
| `e2aec71`, `12b65ec` delivery-i2 | I2 | docs: `INVESTIGATION-drop-game-history-12-Oct.md`, `PLAN-delivery-subdomain-12-Oct.md` | docs only | the Cloudflare and GitHub accounts |
| `1ce483c`, `fbab485` delivery-sweep | Q14, Q46, Q25 to Q28, Q29, Q30, left-drive board fix, Q21, Q17, Q20 plan | crosswinds removed from backlot and morro and tuned (strength 11, lull 0.4, a gust every 5 s, 3 s long); Cattle Drive truss tapers (8 m runs, was 20 m boxes); gimmick page models (lanes closing, reversible lanes, low bridge bus, 15 spinning); tyres throw 9 to 19 and keep 60%; Gullwing doors only in the garage; the FRESH TAR board no longer mirrored on a left-drive level (`975de0d`); the gimmick-theme audit and 24 removals (burst mains 17 to 13, potholes 22 to 19, tunnels 19 to 18, crosswinds 12 to 10); the 'Side-road gimmicks' card dropped; `PLAN-amphibious-12-Oct.md` (NOT built); `SWEEP-12-Oct.md` | levels check passed; Cattle Drive taper seen in stills; gimmick page seen in static stills | tyre bounce and Gullwing doors NOT seen; crosswinds never played; the left-drive board in one still only |
| `15310ed` delivery-beginner | L1 | tier-1 levels shortened and simplified, clocks good/evil: expressway 2000 m 110/85 s, back-roads 1800 m 115/90, farm 2000 m 105/80, big-business 2400 m 125/95, hurricane 2400 m 130/100; `PLAN-beginner-12-Oct.md` | levels check (75), replay check on the five, clocks tool, 15 stills read | not played by hand; menu pictures not re-shot; starter-car margins against the NEW clocks not measured |
| `374e1be` delivery-damage (2nd) | Q18, Q19, Q15, blurbs | Q18 mass-aware cap: a victim loses at most `maxHealth x clamp(0.75 + 0.35 x (attacker mass - 1), 0.75, 3)` per hit (`CONFIG.damageCap`, collision.js; a sports car cannot one-shot a commuter, a bus, semi or tank still wrecks one); Q19 floor `25 + 4.9 x sqrt(volume)`, machinery to 70; Q15 low bridges are two bars, one over each half of the player's side, 60 m apart (a slalom, `CONFIG.lowBridge.stagger`), 100 health plus 40 per metre too tall, tall traffic goes through at no cost; blasts and punctures blurbs shortened | levels and replay checks after Q18/Q19 under a lock; Q15 headless check on cattle; levels and replay on five levels | bars NEVER SEEN rendered; how the numbers feel in play; tank, ghost and armour interactions |
| `bd349b4` delivery-carfix-words | blurb | the Junker blurb fits the words check's 70 characters | words check | n/a |

- **Checks on main's tip:** none was run as a whole. The tests agent's QUICK smoke passed (310 to 337 s) on its own
  branch after main's first damage merge; the words check passes after `bd349b4`; `.mysteries-check` has one
  failure ("Lowrider becomes the Super Lowrider") that is also on an untouched main (stale test or regression:
  not looked into); `.ideas-check` has 7 to 9 failures on main (pre-existing, "bubble delivered in 132 s"
  and others: not looked into). **Never played by hand; no sound heard.**
- Levels on the menu: 70. Tiers are the default (`?tiers=0` turns them off).

- **UPDATE, after the owner's "Merge in all completed work to main" (12-Oct, late; local main only, nothing pushed):**
  merged since the table above: `delivery-sweep` `4181d06` (Q21 doubtful removals), `delivery-gimmicklogic` (all six
  items incl. Q13), `delivery-tests` (quick smoke repaired, groups runner, TESTS.md), `delivery-prank-c` (P8 to
  P10 and the cargo-check exemption), `delivery-crests` (files only). `git log --first-parent` on main shows the
  hashes. The merges of `delivery-prank-b` (`6a1aae9`) and `delivery-rework-b` Hong Kong (`a758be8`) conflicted first and went back to their agents (`git merge main`, keep both sides); both then merged clean: Hong Kong and all ten prank models are on main (unpushed). The light checks on the new tip
  (levels, replay, words, cargo, mysteries, tiers, ufo, pursuit) were handed to the tests agent; the results are
  in the orchestrator's report to front, not here. The branch rows of section 3 for sweep, gimmicklogic, tests,
  prank-c and crests are therefore DONE; the unseen-stills branches (carfix, prank-ideas, garagetiers, prank-a,
  Good/Evil x3), `delivery-stats` and `delivery-themes-toys-wip` stay unmerged by the owner's reading of
  "completed".
- **The new repo for a cloud agent (owner, 12-Oct):** "I have a new repo, I would like the uncompleted work to be
  centralised and committed to the new repo for a cloud agent to take a look at." Being PREPARED by the history
  agent in a scratch clone (branches, `CLOUD-AGENT-README.md`, size, a sensitive-data grep of the tree and the
  history). NOTHING is pushed and no remote is added until the owner gives the URL and the go.

## 3. Every unmerged branch (worktree, state, next step)

Worktrees are under `.claude/worktrees/<name>` (the branch's own scratchpad is
`src/delivery/SCRATCHPAD-<area>-12-Oct.md` inside it).

| Branch / worktree | Holds | Seen? | Next step |
|---|---|---|---|
| `delivery-sweep` (`delivery-sweep`) | `4181d06` Q21 doubtful cases removed (the owner said "Remove the above": mains on park, ponti, venice, morro, leaks; potholes on ponti, venice, leaks; the toys tunnel) | levels check by the agent (its report was not seen by the orchestrator) | have an agent run the levels check (`--secs=5`), then merge: the owner has ORDERED it, no question pending |
| `delivery-gimmicklogic` (same name) | Q40 `ac38311`, Q5 `aa6e4a8`, Q7 `7c22205`, Q43 `77b6fd9`, Q11 `bff1b2f`, Q13 `98c5225` + `b92cafa`, checks updated `24c69ca`, main merged `b6e170c` | headless probes only; no stills, nothing played | rerun `scripts/.replay-check.mjs` and `.mysteries-check.mjs` (the replay check was NOT rerun after the Q13 override); then merge. Owner's answers are in: Q5 supercharger = turbo, Q13 the Jerk overrides a running mystery. The Q13 override was tested on the toad mystery only (carSwap, soupedUp, noBrakes not run) |
| `delivery-carfix` (`delivery-carfix`) | Q16 learner L un-mirrored, 0.5 m plate, wobble 1.1 (`8fb5dde`), cruising pace 1.0 (`16a72cc`, not measured); Q8 kangaroos 1.5x larger and brighter (`d8b4a1c`); main merged | NOT SEEN; syntax and a 60 s headless run only | run the stills job (script `job2.sh` in the 12-Oct session's scratchpad dir may be gone: kangaroo on outback-express s 1330 before/after; learner on a level where one actually appears (grep the levels for it, note id and s); 390x700 too), READ them, then merge. Remove the extra worktree `delivery-carfix-before` first |
| `delivery-prank-ideas` (same name) | Q42 volcano floor + eruption depth-tested and fading in fog (`943eab2`), Q31 Evil palettes for the tier-4 Blue Stars and amphibious cars (`d2b5ef7`), Q39 Hell Rod / Courier Special / Showdown Muscle on their Super bodies (`8de4db6`; the six level-vehicle earned cars have no Super), Q38 the Saucer hovers in the garage (`1375e57`); also the prank DRAFT `IDEAS-prank-cargo-12-Oct.md` (`bcc7570`) | NOT SEEN (stills not reported) | stills under a lock (volcano levels Cinder Island and Eruption Day; the garage with each Evil livery; the three Super earned cars; the Saucer); read, correct, merge |
| `delivery-prank-a` (same name) | P1 whoopee, P2 bucket, P3 squirter, P4 teeth, written, registered and worded (WIP `bf60b08`, scratchpad `cd9a418`); `cargoModelsPrankA.js` | cargo page stills of all four: front, quarter, side, back (`...scratchpad\prankA\`); the furious teeth on the rim, the HUD window, the 112x84 tile, the kerb and the transitions NOT seen | `git merge main`; finish the unseen looks; merge. The three prank branches all add to `cargo.js` `CARGO.evil`, `cargoText.json` and `cargoModels.js`: expect trivial conflicts, keep both |
| `delivery-prank-b` (same name) | P5 piecatapult, P6 airhorn, P7 ghost, corrected after stills (`51466c8`, `ba3e570`, `b2d4cc9`; main merged) | cargo page, all three states, from front, side, back (`...scratchpad\shots3\`); HUD window, tile, kerb, transitions NOT seen | merge when the owner OKs the stills (it only needs the pictures shown); eslint clean, words and cargo checks pass but for the exemption |
| `delivery-prank-c` (same name) | P8 nestedboxes, P9 spider, P10 ink (`4cc6d0b`), the cargo-check exemption `UNASSIGNED` for all ten ids (`1c80083`), quill vane fix (`1acc69d`) | seen from front, side, back (`...scratchpad\shots1\`, `shots2\ink-front.png`); `shots2\all-high.png` taken, not looked at | `git merge main`, rerun words and cargo checks; merge. Merge prank-c FIRST (it holds the cargo-check exemption); the models are "available Evil cargo": to put one on a level, name its id in `levelText.json` `"cargo": { "evil": ... }` AND in the level's own file |
| `delivery-underglow` (`delivery-underglow`) | Good/Evil ideas 1 to 4 behind `?ge=1,2,3,4` (commits `522b779` sidecues.js, `16c166a` idea 1, `e6001d3` idea 2, `2939068` idea 3, `e721a65` idea 4, `1c5853d` the puff fix) | stills in `%TEMP%\claude\ge\` (i1a, i1b, i2c, i3a, i3b, i4b, fin): 1 and 2 read, 3 weak, 4 unconfirmed; dark Good car and Good at night MISSING | the owner picks (section 5) before anything merges |
| `delivery-ge-road` (same name) | Good/Evil ideas 5 (camera: Good +1.5 deg fov, Evil -1.5 deg and -5% height with sway), 6 (screen-edge grade, value only), 7 (traffic greets you: a wave for Good, a wary look for Evil) | NOTHING SEEN: no stills, never run in a browser; only `node --check` | stills under a lock (commands in its scratchpad), read, correct; owner picks |
| `delivery-ge-ui` (same name) | ideas 8 (halo/horns on the cargo corner), 9 (clock rim: pill for Good, cut corners for Evil), 10 (menu/garage badge), 11 (engine voicing; NOT heard), 12 (start-line cue; NOT heard); stills committed in `src/delivery/geshots/` (commit `eae39dd`: drop it from the merge) | 8 to 10 seen at 390x700; no 360x640; no light-coloured car pair (`?car=` fell back to the Commuter) | owner picks; sounds need the owner's ears |
| `delivery-rework-b` (worktree `delivery-themes-c`) | Hong Kong (27): re-laid 3.7 km (`1b3a207`), the plan `PLAN-hongkong-12-Oct.md`, own obstacles hawker cart / bag stack (`07ccc6a`), scenery (`97faba8`), menu picture (`6f8eb73`); main merged | stills read for the start, clock tower and lanterns, scaffold, typhoon shelter, cart, bags; NOT seen: the Peak, the level as Evil, the second tunnel's mouth, several taken stills never read | read the unread stills (`hk2`, `hk3` in that session's scratchpad), look at the Peak, then merge; the mirrored board is already fixed on main |
| `delivery-garagetiers` (same name) | L4 locked-tier cars hidden and the next tier black silhouettes (`dd4d450`), L5 back button (`8f9adca`, new `nav.js`), L6 the 4th level needs 3 medals (`538bb58`, `7c306b8`), L7 phone garage stats line always (`4427ee6`) | the back button NEVER tried in a browser; L4 silhouettes taken, not read; L7 seen once at 390x700 | read the stills, try the back button by hand through every route, merge. These are the owner's BUMPED new-player items |
| `delivery-tests` (same name) | the QUICK smoke repaired (74 failures and a crash to none: all stale tests, no game regression) `b6a5a41`, `--levels=` `4f5ab51`, own-all-cars in the traits, mysteries, targets checks `50ace05`, a barrier's cost `c830c00`, the grouped runner `scripts/delivery-tests.mjs` + `TESTS.md` (`51af0ad`, WIP) | quick smoke passes; the runner's groups verified only partly | run `node scripts/delivery-tests.mjs --group cars,replay` and `--fast` under a lock; merge (touches only scripts/ and docs) |
| `delivery-crests` (`delivery-crests`) | `scripts/crest-signs.mjs`, `scripts/moon-airtime.mjs`, `IDEAS-moon-airtime-11-Oct.md` | files only, safe | merge on the owner's word; the crest board on `moon` s 292 never seen |
| `delivery-stats` (`delivery-stats`) | Delivery and Nerve car stats | HELD | stays held until the rebalance (owner, 11-Oct) |
| `delivery-themes-toys-wip` | the toy room's own gimmicks (marbles, loops, a cat's paw) and a low-gravity level, "set aside, unfinished and unchecked" | no | mine for parts only if the owner asks |
| `delivery-i2` | merged | | the worktree can go |

## 4. Merge order that avoids conflicts

1. `delivery-sweep` (levels only) and `delivery-gimmicklogic` after their checks.
2. `delivery-tests` (scripts and docs). It expects the barrier cost from CONFIG, so it follows the damage merge.
3. `delivery-garagetiers` after its stills and the back-button trial (touches garage.js, tiers.js, game.js, menustage.js).
4. `delivery-prank-c`, then `-b`, then `-a` (shared lists; identical new `sidecues.js` exists on several ge
   branches and merges clean only if byte for byte equal: it is).
5. `delivery-rework-b` (Hong Kong), `delivery-carfix` (Q8, Q16), `delivery-prank-ideas` after their stills.
6. The Good/Evil branches only after the owner picks, and only the picked ideas (cherry-pick or merge and
   remove the rest by flag: each idea is its own commit, `sidecues.js` first).

## 5. What the owner asked and is waiting on (OPEN-QUESTIONS 22 to 30, with the recommended pick)

| # | Question | Options | Recommended |
|---|---|---|---|
| 22 | What do players get for earning both medals on a level? | a one-time tip bonus scaled to the tier; a cosmetic mark on the plate/card and tier-complete mark; a cosmetic unlock per tier; a cargo collection page | the tip bonus (stays inside existing systems) |
| 24 | Q9 "move all blasts into the blasting gimmick": built as a card split only. Did you mean a real data/mechanics move of the airport blasts and Quarry Run's Blast into one `blasting` gimmick key? | card split (done) / real move (separate, riskier job) | leave the card split unless it matters |
| 25, 28 | The game on its own subdomain and repo: see section 7 (question 25's history reset is superseded: option (a) is skipped) | A) `delivery.<domain>` as a Worker custom domain; B) free `delivery.<account>.workers.dev` | A, with the hash-migration of saves |
| 30 | Q15 low bridges as built: two bars, one per half of the player's side, 60 m apart; is that "placed on both sides, not at the same level, so players can slalom"? And do the Q18/Q19 numbers feel right once played? | keep / adjust spacing and width | needs the bars seen in a still first |
| 23 | (SUPERSEDED: the raised floor put barrier 34, rail barrier 33, cow 36 above their old values) | | close it |
| ge | Good/Evil indicator picks, 12 ideas built behind `?ge=` (section 3): the doc's recommended three were 1 + 8 + 11; the agents' reading: 1 and 2 read well, 8 and 10 read, 9 weak at desktop size, 3 and 4 weak, 5 to 7 unseen, 11 and 12 not heard | any combination | 1 (ring / horns) + 8 (cargo corner glyph) + 10 (menu badge teaches it) + 11 (engine voicing, once heard) |
| prank | The owner said "Build all ten ... Cosmetic only ... No need for an additional state": built (P1 to P10); which levels carry which is the owner's call (the draft's "Suits" lines are suggestions) | | name none until the stills are shown |
| crests | Merge `delivery-crests`? Should a crest board name the hazard beyond ("BLIND: BARRIER BEYOND")? Moon airtime option A (`CONFIG.crest.gravity` 8 on `moon` and `farside` only)? | | merge the files; option A |
| tiers | the surplus levels' places in the tier table (specials, amphibious, races, levels 51 to 53: `scripts/tiers.mjs move`) | | owner uses the tool |
| phone card | the level card's height on a phone: SHELVED by the owner on 12-Oct | | leave |

Closed today (owner's answers): Q5 supercharger = Turbo; Q13 the funeral Jerk overrides a running mystery; Q21
doubtful cases removed; the prank cargo built, cosmetic only; Q18 mass-aware (replaced the flat clamp: "25 is
barely any damage"); Q19 low end raised ("The lower end of obstacles do little damage"); new tasks paused.

## 6. Not started (from the checklist; none was started because the owner paused new tasks)

Q2 (truck spray rework or drop: the owner's call), Q3 (Seaquake has scripted wreckage from the sky, indoor), Q6 (the
tram on Hong Kong does nothing: should work like Canberra's), Q12 (wrong-way driver: plan first), Q16 and Q8 are
built but unseen, Q20 (amphibious: `PLAN-amphibious-12-Oct.md` written, not built), Q24 (partly: the board flip is
fixed; other lettered boards on left-drive levels not audited), Q32 (the ideas are built, see section 5), Q45
(the null-car silhouette and garage filter: `delivery-garagetiers` L4 covers the silhouettes; check the rest against it), **Q50 and Q51 (the
vehicle model audit: lights, gaps, damaged models, idle animations: a big job, Fable, heavy)**, Stelvio (30),
Tokyo (28), Mumbai (29), Night Shift and two more second levels (favela descent on `favelaRain`, Monsoon on
`riceMonsoon`), five weak menu pictures (`marina-bay`, `montreal`, `monza`, `singapore-night`, `battlefield`),
moving nine levels' words into `levelText.json`, the audit's performance and bloat work, the clock sweep (for the
rebalance), J4 (volcano rock against the lava boulder), and Q55's follow-up (Monza and Spa runoff lane assist, if
not already fixed: check `CHECKLIST-11-Oct.md`).

## 7. The game on its own subdomain (the owner will come back to it; do NOTHING until the owner says go)

Plan: `PLAN-delivery-subdomain-12-Oct.md` (and `INVESTIGATION-drop-game-history-12-Oct.md`). Summary: feasible, no
outage, no force-push. The game is a static three.js build with no /api, D1 or R2, so the new repo needs only a
static-assets Worker named `delivery`. The domain in the repo is `<domain>` (zone on Cloudflare); the site
Worker is `<site>.workers.dev`. The owner must do, in the dashboards (an agent cannot):
(1) GitHub: create an empty repo `delivery-racer`; (2) Cloudflare: Workers & Pages > Create > Import a repository,
build `npm run build`, deploy `npx wrangler deploy`, project name `delivery`; (3) Worker > Settings > Domains &
Routes > Add > Custom domain `delivery.<domain>`, wait for Active; (4) verify, then OK the site push that
adds the `/delivery/*` redirect. An agent does the `git filter-repo`, the build config and the pushes only on the
owner's go. **Saves:** localStorage `delivery_racer_progress_backup` (the real save), a cookie
`delivery_racer_progress` (path=/), and the editor keys `delivery_editor_level` and `delivery_editor_autosave`; no
IndexedDB or sessionStorage. A subdomain is a NEW origin, so saves do not carry: the old `/delivery/*` becomes a
hand-over page that puts the keys in the URL hash and redirects to the same path on the subdomain; the new game
imports the hash if it has no save, validates, then strips it (copy, not move), plus an Export/Import file button,
and the owner exports their own save before the cutover. Order: backup bundle, build the game repo, add the
importer, deploy the new Worker and domain, verify, then the site redirect push, later delete the game from the site
in a normal commit. Option (a) (reset this repo to `f4b17c6`) is skipped: it saves only repo size and costs a
force-push, and would take `/delivery/` off the live site at once. Not checked: the accounts, the site's real
public address, the size of a full save, the static-asset file limit, that the game builds standalone after the
vite split.

## 8. First three steps for the next orchestrator

1. Tell the owner (short list): what is live (`origin/main` `1077340`, to confirm in Cloudflare) against what is
   only local (60 commits on `main`); the open questions of section 5; whether the pause on new tasks stands.
2. With the owner's OK, give the finishing jobs, no new work: (a) one agent runs the `delivery-sweep` and
   `delivery-gimmicklogic` checks (levels, replay, mysteries), and you merge both (owner's answers are in);
   (b) one agent reads and corrects the unseen stills (carfix Q8/Q16, prank-ideas Q42/Q31/Q39/Q38, Hong Kong,
   garagetiers, the prank models' HUD and tile views, the Q15 bars) under the two locks, one heavy job each,
   and you merge them one by one; (c) the tests agent runs its groups and the QUICK smoke on `main`'s tip once
   the merges are in, to learn if the game regressed.
3. Show the owner the pictures that matter AFTER they answer: the Good/Evil pairs (section 3) for the pick, the
   prank cargo sheets, Hong Kong; and ask for the push only when the checks on `main`'s tip are green.

## 9. Stray worktrees and processes to clean (ask the owner before deleting anything outside the repo)

- **Worktrees under `.claude/worktrees` (about 45 are registered):** merged and removable now, after
  `cmd /c rmdir <path>\node_modules` and `git worktree remove`: `delivery-carfix-before` (a detached helper),
  `delivery-carfix-words`, `delivery-damage`, `delivery-beginner`, `delivery-i2`; after their merges
  `delivery-sweep`, `delivery-gimmicklogic`, `delivery-carfix`. Old idle ones from 10 and 11-Oct (themes-b,
  themes-c, cargo-evil, cargo-good, circuits, menu, ui and others): `SWEEP-12-Oct.md` lists each with its merge
  state; its "26 merged" tally was its own and needs a recount. Never recursively delete a worktree holding the
  junction.
- **Temp:** `%TEMP%\delivery-shots-run-*` and `delivery-shots-slot-1`, stale `msedge_*` and `scoped_dir*` folders,
  `%TEMP%\claude\wait_lock_road.sh` (harmless). Heavy locks `delivery-heavy.lock` and `delivery-heavy-2.lock`
  must be absent when nothing runs (none was present at the stand-down).
- **Processes:** the filter-branch runs on the I2 scratchpad clone `cB` were killed (two bash wrapper trees); check
  for stray `node scripts/shots.mjs`, `msedge`, `chrome` headless processes if the machine is slow.
- **Unmerged WIP markers:** `delivery-prank-a` (commit message says WIP), `delivery-prank-c` `1acc69d` (WIP vane fix).

## 10. The lessons of 11 and 12-Oct (what worked, what did not)

- **Reports go to the session that spawned the agent.** A subagent's final report reaches only whoever started
  it; agents the "front" chat started were forwarded by front, and agents I started reported straight to me.
  Say in every brief who the agent reports to; do not resume a finished agent only to forward a report.
- **Two locks starve under many agents.** With 14 agents, stills waited 25 minutes or more, one agent never got
  a lock, one released a lock it did not hold, and one ran a check without a lock. Fewer agents and one heavy job
  each beats many. The owner's priority order for the lock queue was: Beginner stills, then the damage checks,
  then carfix stills, then the rest.
- **`git --help` / `git help` opens a browser page on the owner's screen.** It happened once (git gc, the history
  investigator): use `-h`.
- **Stills can silently show the wrong car or level.** `?car=hothatch` showed the Commuter; `?level=@id` falls
  back to level 1: address a level by id with NO `?level=` (`name=@<levelid>&ghost&at=<s>`); a tier level starts
  only in a car of its tier (own it with `?owns=` or the headless `ownAll`); and a still must be READ, not just
  taken (several stills of 12-Oct were taken and never read).
- **Words and cargo checks bite new content:** blurbs are 70 characters at most; a new Evil cargo item needs a
  level to name it or the exemption array in `.cargo-check.mjs`.
- **A merge of `levelText.json` conflicts whenever another branch added words beside:** send it back to its
  agent (`git merge main`, keep both sides).
- **A held branch is cheaper than a merged guess.** Everything unseen stayed on its branch; the owner never had an
  unseen picture in `main`.
- **The owner is quick to say "stop" and "no more tasks":** record each in the checklist state block at once, tell
  agents the same minute, and keep the report to a few lines.
- **Misreadings:** "Q5 supercharger" was read as the Turbo pickup and confirmed; "the /delivery/ subdomain" was
  read as a subdomain of the one domain; quote a UI part back before briefing.
