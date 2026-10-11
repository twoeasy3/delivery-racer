# Delivery Racer: handover to the next orchestrator (written late on 10-Oct, 2026-10-10)

You are picking up the job of delegating. Nothing is running: every agent of the last session has stopped,
and their ids will not exist in yours (start fresh agents; each brief must carry everything). Read this,
then the three files it points to. Do not re-read the day's 1,400-line checklist end to end: search it.

## The four files

| File | What it is |
|---|---|
| `CHECKLIST-10-Oct.md` | The record: every request of the day with its status, hashes and what was and was not verified. The evening's entries are in the "Menu UI" section, newest first, under "Added by the owner after the break". |
| `OPEN-QUESTIONS-10-Oct.md` | Everything waiting on the owner, with what happens if left alone and a suggested pick. The owner reads this when they choose to: add to it, do not ask the same things in chat. |
| `SCRATCHPAD-10-Oct-dropped.md` | Work stopped part way, each with its branch, worktree, exact state and next step. Its first section is the rules every agent brief needs. |
| `SCRATCHPAD-10-Oct.md` | The morning's handover: the earlier agents' notes, plans for levels not yet reworked, traps. |

`HANDOVER.md` and `README.md` beside them describe the game and how to run and check it.

## What the orchestrator may do (the owner's words, 10-Oct)

"Please only edit the checklist, merge and send messages to agents and start/end agents." So: edit the
checklist (and the open-questions and handover files that go with it), merge branches into `main`, brief
and message agents, start and stop them, relay results and pictures. Everything else goes to an agent:
investigating, measuring, running checks, editing code or levels, taking stills. The owner also gave
explicit leave, once each, to kill one hung process and to delete the `delivery-shots-*` folders in Temp:
neither is a standing permission. Ask before deleting anything on the machine.

## How the owner works

- Requests arrive as short lines, often several a message. A sentence describing how things are is usually
  the reason for a request, not a second request.
- **A request starts at once only if the owner labels it** (high priority, jump the queue). Otherwise it
  goes on the checklist and to the next agent that frees up; say where it sits in the queue.
- **Pushing `main` deploys the live site.** Push only on the owner's word, and say plainly what had and had
  not been checked when it went.
- **Never run the smoke test** unless asked.
- **Agents commit each whole piece as soon as it works**, on their own branch, own files by name; a piece
  stopped half way is committed as "WIP". Name the pieces in the brief.
- **Nothing unseen goes into `main`.** An agent looks at its own work in stills and corrects it before you
  merge; say so in the brief. Send the owner the few pictures worth seeing, before and after in pairs.
- Report what was and was not verified, every time. Lead with the result. Keep replies short when usage is
  tight; the owner halved the agents and then spun them down for usage on 10-Oct.
- The design rules (gimmicks give a gamble, no imposed stop, no new moving explodable things, many cash
  pickups in rows, pickups allowed on shoulders, plain obstacles themed and readable, no tyres) are in the
  first section of `SCRATCHPAD-10-Oct-dropped.md` and in the memory index.

## Where the code is

- **Live is `3075475`. Local `main` is ahead of it and NOT pushed** (run `git log --oneline origin/main..main`):
  checklist and handover commits; ESLint installed (`72b97de`: `eslint.config.js`, `npm run lint`, 59
  findings on first run, none fixed; the push will make Cloudflare install the new dev dependencies); and
  one code change the owner asked the orchestrator to make directly (`0aff68e`: the earned cars drive by
  their own figures with no cap, the three race cars a little tamer on the road; a souped-up Lowrider
  becomes the Super Lowrider; earned, mysteries, balance and bundle checks pass, the rest not run).
- **The owner has uncommitted edits of their own in the main checkout** (`delivery/index.html`,
  `src/delivery/levelText.json`, `src/delivery/cars.js` when this was written). They are not yours: never
  commit, stash or overwrite them, and a merge that touches those files will be refused until the owner
  commits them: ask.
- **The owner's list runs to Q55** (Q1 to Q55 at the top of the checklist's evening block, with two earlier
  queued items below them). Q52 and Q53 are done; the rest are not started.
- **Checked:** all 28 check scripts pass at `a29522e`; six of them and the replay check over all 68 levels
  pass at `6409bb9`; a production build of `a29522e` was looked at in stills and works. **Not checked on
  `main` itself:** the six merges after `6409bb9` (the mains follow-up, the gap fills and the seeded
  gimmicks check, the obstacles tidy-up, the level-text file, fog by theme, Market Town). Each passed its
  own checks on its branch. **A sensible first task for an agent: every check on `main`'s tip.**
- 68 levels on the menu. 41 garage cars (four new at Blue 4), 26 drivable idea cars.

## Unmerged branches, in the order I would take them

1. `delivery-rework-e` (Ring Road, level 24): finished and fit; its merge conflicts in three files with
   additions beside additions. An agent merges `main` into it, keeps both sides, runs the checks; then merge.
2. `delivery-fallout` (the owner's HIGH PRIORITY nuclear fallout theme, level and gimmicks): the logic and
   its check are done; nothing is drawn; theme and level not started. The largest piece of work waiting.
3. `delivery-themes-e2` (Spring Thaw): most of the way; needs its unseen stretches shot, a menu picture,
   the full checks.
4. `delivery-rework-d` (Tour de Coast, level 23): the level done, the scenery part done, a lighthouse leans.
5. `delivery-rework-b` (Hong Kong, level 27): the level file re-laid; no scenery.
6. `delivery-stats` (the Delivery and Nerve car stats): built and HELD for the owner's answer to question
   5c2. Do not merge without it.

**Queued by the owner after the stand-down** (first two entries at the top of the checklist's evening block;
not labelled to jump the queue): shelve the Tow Truck's wreck-clearing trait; change rubbernecking from
"traffic slows where any wreck happened" to a fixed crash scene of two burning, damaged cars on a shoulder
that traffic slows to look at, only on roads with two or more lanes each way.

**And a list of 37 more from the owner, about 9 pm** (Q1 to Q37 at the very top of the checklist's evening
block, in the owner's words, grouped: gimmicks, damage and balance, levels, signs and models, cars, menu
and garage). None started. Two of them are rules for every level brief from now on: gimmicks must suit the
level's theme, not be the recent favourites (burst mains, potholes and tunnels are on almost every level);
and note where each still was taken.

Not started: Stelvio (30), Tokyo (28), Mumbai (29), Night Shift and two more second levels, five weak menu
pictures, moving nine levels' words into `levelText.json` as their branches land, the audit's performance
and bloat work, the level progression rework (parked by the owner; three of its questions answered today).

## Running agents: what worked

- **One worktree an agent**, never the main checkout (it is where you merge, and an agent's uncommitted
  file there blocks a merge: it happened twice with `scripts/shots.mjs` and with retaken pictures). Spare
  worktrees under `.claude/worktrees/`; an agent makes its branch there from `main`. Every worktree's
  `node_modules` is a junction: never delete it. `delivery-batch` is in a mess from 9-Oct and the owner has
  not said to clean it: leave it.
- **A brief that works** has: where to work; the owner's words quoted; what is already known (so it is not
  rediscovered); the pieces in order, a commit each; the rules that bind it; how to verify, headless first,
  then stills it must READ; the screenshot rules (one run at a time, six pictures, where to put them, check
  for leftovers); a timebox; what the report must say, ending with "fit to merge or not" and "not
  verified". Tell it what other agents hold so it keeps off their files.
- **A finished agent can be resumed** with a message and keeps its context; that was cheaper than a new
  agent for follow-on work in the same area. Agents report long; relay the result, not the report.
- **Two screenshot runs at most go at once** on the machine; with several agents shooting, first pictures
  took up to two minutes. Three or four agents taking pictures is the practical limit; five to six agents
  in all was comfortable, ten was too many for the usage limit.
- **Merging:** `git merge --no-ff <branch>` in the main checkout with a message in the repo's style, ending
  with the co-author line the session gives you. Commit your own checklist edits first (by name): a branch
  that touches the same file will otherwise refuse to merge. If a merge conflicts in code, abort it and
  give the conflict to an agent; do not resolve code by hand. After a merge, tell the agents whose branches
  it affects to merge `main`.
- **Level numbers shift** as levels are merged (a new themed level goes in before the specials): in
  screenshot addresses name a level by id (`"a=@<id>&ghost&at=..."`), and each new level needs its entry in
  `INSERTED_AT` in `progress.js` (two branches adding there conflict in one line: keep both).
- **Level words** now live in `levelText.json`; a level being rewritten on a branch keeps its words in its
  own file until it lands. The descriptions check fails a level whose words differ between the two.
- The permission check refused the orchestrator a `git checkout -- <file>` over uncommitted work and, once,
  a merge; when that happens say so and let the owner decide: never hand a refused action to an agent.
