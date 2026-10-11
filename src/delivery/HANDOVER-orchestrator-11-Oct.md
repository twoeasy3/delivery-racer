# Delivery Racer: handover to the next orchestrator (written on 11-Oct, 2026-10-11, at the owner's stand-down)

Nothing is running. Every agent of the 11-Oct session has stopped and their ids will not exist in yours: start
fresh agents, each brief carrying everything it needs.

## THE PROMPT (paste this to the next orchestrator)

> You are taking over as the orchestrator for Delivery Racer, the game in src/delivery of this repo. A previous
> session ran 11-Oct and has stood down. Nothing is running. Read these files in src/delivery before doing
> anything, in this order: (1) HANDOVER-orchestrator-11-Oct.md (this file: your role, where the code stands, what
> is unpushed, what is open, what worked); (2) CHECKLIST-11-Oct.md (the record of 11-Oct: the state block at the
> top, then sections A to K; search it, do not read the 10-Oct checklist end to end); (3) OPEN-QUESTIONS-10-Oct.md
> (decisions waiting on the owner; add new ones there, do not ask them again in chat); (4) SCRATCHPAD-11-Oct.md
> (work stopped part way, with branch, worktree and next step; and traps).
> Your role, in the owner's words: "Please only edit the checklist, merge and send messages to agents and
> start/end agents." Investigating, measuring, running checks, editing code or levels, and taking screenshots go
> to agents. (The owner may, in the moment, tell you to do something yourself, e.g. "Do it here. No agents.":
> then do exactly that, and say so.)
> Standing rules: pushing main deploys the live site: push only when the owner says, and say plainly what had and
> had not been checked. Never run the smoke test (scripts/delivery-smoke.mjs) unless asked (it is asked for by
> the owner only occasionally; see SCRATCHPAD for its state). A request starts at once only if the owner labels it
> (high priority, jump the queue, bump); otherwise it goes on the checklist and to the next free agent, and tell
> the owner where it sits. Keep agents to five or fewer (ask before going above). New agents run at MEDIUM effort,
> never High (the owner stopped High on 11-Oct); Fable for creative work (models, themes, levels), Sonnet 5.5 for
> code. Resume a finished agent in the same area (transcript under ~150k tokens) with the new task instead of
> spawning a fresh one. Agents work in their own worktree under .claude/worktrees, never the main checkout; each
> commits every whole piece as soon as it works, on its own branch, and never pushes. Only ONE heavy job at a time
> across all agents (screenshots, smoke, ideas/replay/levels checks, anything with a browser): the lock is an
> atomic `mkdir <TEMP>/delivery-heavy.lock`, `rmdir` it the moment the job ends, a lock
> older than 25 minutes is stale; put this rule in every agent brief. Nothing unseen goes into main: an agent
> looks at its own work in stills and corrects it before you merge. Send the owner the few pictures worth seeing,
> before and after in pairs. Report what was and was not verified every time; lead with the result; keep replies
> short. Ask before deleting anything on the machine outside the repo. Never recursively delete a worktree that
> holds a node_modules junction: `cmd /c rmdir <path>\node_modules` first.
> Model quality rules for every new model brief (the owner was angry at the C41 to C60 cargo batch): each model has
> its own distinct idea and silhouette (no variations of one concept); look at it from front, back, side and above,
> in every state, and at the 112x84 level-card tile size; an open-topped container needs only a flat BLACK face
> across its opening with the contents standing proud of it (no brown lid); no coplanar faces (z-fighting); nothing
> passing through anything else; within a lane (3.5 m); for a BATCH of new things, draft ideas for the owner to OK
> before any modelling; have the agent look at the best older models first as the quality bar.
> Level briefs: levels 32 onwards are the owner's models (minus their gimmick cramming); do not cram gimmicks (one
> idea and a few kinds that suit the theme; never quote a target number of kinds); rockfall only where a rock face
> stands above the road, seen in a still; each theme gets its own plain obstacles through the theme mapping, larger
> and more visible, never tyres, never the shared haybale or beach ones; signs before crests; note where each still
> was taken (level id and s).
> Start by telling the owner, in a short list: what is live against what is only local; what is open and waiting on
> them; and your plan for the first three agents. Then wait for their OK before starting anything.

## Where the code is

- **Live is `ceecc34`** (pushed twice on 11-Oct: `c5575c7` then `ceecc34`). **Local `main` is 24 commits ahead at
  `5a3b83a` and NOT pushed** (`git log --oneline origin/main..main`). The owner's uncommitted edits of 10-Oct to
  `cars.js`, `levelText.json` and `delivery/index.html` were committed by the owner (`23a6bf8`): the tree is
  clean, no uncommitted work of theirs.
- **In the unpushed part (all merged by the orchestrator with `git merge --no-ff`):** the level progression
  rework, now the DEFAULT (`CONFIG.progression.tiers = true`, `?tiers=0` turns it off for a visit): `tiers.json`
  (one data file, ten tiers of five levels in current menu order; surplus levels listed `outside`), `tiers.js`,
  `scripts/tiers.mjs` (print / check / move), `scripts/tier-money.mjs` (60 plays minimum, six a tier), the unlock
  rules (Blue 1 after a medal on level 5 of the five-star tier; amphibious A_n after a medal on every level of its
  blue tier), tiers drawn as STARS never the words Gold or Blue, MEDALS not ribbons ("Earn a medal on level 4"), the
  forced car held for the results (`Tiers.hold`), the garage re-applying the rule when its Good | Evil side
  changes, a reason chip in the garage; the menu and garage work Q33 to Q37 (Plop Up on clicks, an in-game buy
  sheet instead of `confirm()`, Sort and Show as lists, Good | Evil with Switch and Use, stats off the cars on a
  phone); the level's cargo shown in the HUD's round window on the level card (turning); one words file per kind
  (`carText.json`, `cargoText.json`, `trafficText.json`, `pickupText.json`, `gimmickText.json`, `obstacleText.json`,
  `words.js`, `.words-check`); the reworked C41 to C60 cargo (bailiffs, salesman, party dropped); the fallout
  rebalance and the infected player's glow; the trains (no boom slowdown, one more carriage, a crossing names its
  train, a steam train on High Noon and Cattle Drive); Tour de Coast (23) finished; "Asteroid Run" renamed "Mother
  Ship"; a phone gets the LARGE level picture again; the phone's car row 92 px and 26 px under START; the cargo
  circle turns on a phone too; the good/evil ideas document.
- **Checked:** all 32 check runs passed at `c5575c7`. The checks on the later merges ran only on their own
  branches (each branch's report says which). **Not run on `main`'s tip:** a full check run; the heavy checks
  after the tiers default. **Not done at all:** the smoke test passes nothing (see SCRATCHPAD); nothing was
  played by hand; no sound was heard; none of the new levels was seen as Evil. Lint was 61 problems (59 at the
  first run).
- Levels on the menu: 70 (Spring Thaw is level 52, Hot Zone 53).

## What the owner asked and is waiting on (details in CHECKLIST-11-Oct.md)

- **The level card's height on a phone** ("I think the level card get too much height. The car barely gets any
  height" ... "Just reduce the height of the level card even more" ... "Whatever. We will fix this later"):
  the car row is 92 px and START has 26 px under it, but the stage still gets most of the screen; the owner wants
  the stage smaller and the car row larger. An unseen attempt (car row 120 px, START padding 18/16) was
  reverted. A still taken at 390x844 showed START touching the bottom edge: the screen may scroll by a few px.
- Open questions: 22 (what players get for both medals on a level; options in the file), and the surplus levels'
  places in the tier table (specials, amphibious, races, levels 51 to 53: the owner can use `scripts/tiers.mjs
  move`).
- Choose from documents: `IDEAS-good-evil-11-Oct.md` (12 ideas, recommended three: ground halo / horn arcs
  under the car, glyph on the cargo corner, engine voicing per side); the Moon airtime proposal on branch
  `delivery-crests` (`IDEAS-moon-airtime-11-Oct.md`: option A, `CONFIG.crest.gravity` 8 on `moon` and `farside`
  only, UFOs left alone); and whether a crest board should name the hazard beyond.
- **Paused by the owner ("Stop the assignment of new tasks"):** K3, the prank-related cargo ideas DRAFT (ideas
  only, for the owner to OK before any modelling), J4 (the volcano rock against the lava boulder, "not very
  pressing"), the rest of Q1 to Q51 (see the checklist: section D lists them; Q1, Q22, Q33 to Q37, Q41, Q44,
  Q47, Q52 to Q55 are done), Hong Kong, Stelvio, Tokyo, Mumbai, Night Shift and two more second levels.
  Whether the pause stands is for the owner to say.

## Running agents: what worked, and what did not

- **Misreadings cost the most.** "Level card" was read twice as the "What's on this road" card; it means the main
  level card on the menu stage. When a request names a UI part, quote it back with where you think it is before
  briefing, or ask the agent for a one-line plan first.
- **A brief that works:** where to work (worktree, branch, the node_modules junction); the owner's words quoted
  verbatim; what is already known; the pieces, a commit each; the rules; how to verify (headless first, then
  stills it must READ); the screenshot rules; the heavy-job lock; a timebox; what the report must say.
- **Merging:** `git merge --no-ff <branch>` in the main checkout, message in the repo's style ending with the
  co-author line. Commit your own checklist edits first (by name). If a merge conflicts in code, abort it and
  send the conflict to the branch's agent ("`git merge main`, keep both sides, rerun the checks"); do not
  resolve code by hand. Merges that touch `cars.js` or `levelText.json` were refused once by the permission
  check while the owner's edits were uncommitted; a plain retry later went through. The permission check also
  refused a `git stash` of the owner's files and a looped multi-branch merge: do one merge per command.
- **Screenshots:** `node scripts/shots.mjs <out-dir> "name=@<levelid>&ghost&at=<s>&ff=1" --size=880x520`; address a
  level by id with NO `?level=` before it (that falls back to level 1); a menu page is `index.html?...`
  (`?pick=<number>`, `&garage`, `&click=<selector>`, `?tiers=0`, `?beaten=id,id:evil`, `?owns=`, `?money=`).
  A run takes 15 s to 70 s on this machine; the first picture can come out mid-resize: re-shoot.
- **The machine:** 16 GB, near its limit with VS Code and Chrome (8 h old) open; CPU saturates when three or
  four heavy jobs run at once: that is what made it crawl twice. The heavy-job lock fixes it. Stale
  `msedge_*` and `scoped_dir*` folders sit in `%TEMP%` (harmless; ask before deleting) and 29 worktrees are
  registered under `.claude/worktrees` (about nine idle: themes-b, themes-c, cargo-evil, cargo-good, circuits,
  menu, ui and others: ask the owner before removing; `delivery-batch` was cleaned and its stash dropped).
- **Agents report long:** relay the result, not the report; show the owner the pictures that matter.
