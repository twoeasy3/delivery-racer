# Delivery Racer: checklist for 11-Oct (2026-10-11)

Only tasks delegated or yet to delegate. Wording is copied as received from the handover files
(`HANDOVER-orchestrator-10-Oct.md`, `SCRATCHPAD-10-Oct-dropped.md`, `OPEN-QUESTIONS-10-Oct.md`) and from
`CHECKLIST-10-Oct.md` (the owner's requests Q1 to Q55). The full record stays in `CHECKLIST-10-Oct.md`.

Standing rules, from the owner: only edit the checklist, merge, message agents and start/end agents; a
request starts at once only if labelled (high priority, jump the queue); pushing `main` deploys, push only
on the owner's word; never run the smoke test; nothing unseen goes into `main`; five agents or fewer;
agents work in their own worktree and never push; the owner's uncommitted edits (`delivery/index.html`,
`src/delivery/levelText.json`, `src/delivery/cars.js`) are not to be committed, stashed or overwritten by
the orchestrator (on 11-Oct the owner said: "Just make the edits on the uncomitted files").

## STATE AT THE 11-OCT STAND-DOWN ("Stand down, update all scratchpads and checklists, and write a handover prompt")

Nothing is running. Handover and prompt: `HANDOVER-orchestrator-11-Oct.md`; loose ends: `SCRATCHPAD-11-Oct.md`.
Live is `ceecc34`; local `main` is 24 commits ahead (`5a3b83a`), not pushed. Task assignment was paused by the
owner ("Stop the assignment of new tasks from now please"), then the owner said stand down.

**DONE and merged into local `main` (not all pushed; the sections below keep each item's detail):**
A1 Ring Road (24), A3 fallout theme and Hot Zone (53), A4 Spring Thaw (52) and B1 Tour de Coast (23); F1 the
cargo truck's open door; G3 the washboard (per-theme looks; slows and shakes at every speed); G8 and G9 (phone
picture rule, later reversed to the LARGE picture on 11-Oct; no finish-line milestone sound); the tiers rework
(I7, H1 to H4, K4, K6, K7, K9, K10: now the DEFAULT), the progress code; I3 and I4 cargo C41 to C60 and the
lawyers' crate, reworked under K2 (bailiffs, salesman, party dropped); I5 and I6 (Q22 cargo per level, Title
Case names), J6 and K8 (cargo circle on the level card, turning, also on a phone); J1 words files (Q41);
J2 trains (Q44 and Q47); J3 ideas document (Good/Evil); K1 fallout balance; K5 (Q33 to Q37); Q54 and Q55;
C1 the Tow Truck shelved; the "Mother Ship" rename; the phone's car row 92 px and 26 px under START.
**Cancelled by the owner:** G7 (the vehicle-width audit: "pointless"). **Dropped by the owner:** question 19's
gimmicks (the climbing lane, hairpin cut, tram lane, fork) except the Q6 tram fix.

**NOT merged:** `delivery-crests` (G5/G6: the Moon airtime proposal and two scripts; files only),
`delivery-rework-b` (Hong Kong: re-laid, no scenery), `delivery-stats` (HELD until the rebalance),
`delivery-themes-toys-wip` (old). **NOT started / paused:** K3 (the prank-related cargo ideas DRAFT, for the
owner's OK before any modelling), J4 (volcano rock comparison, not pressing), Q2 to Q21 and Q23 to Q32, Q38 to
Q40, Q42, Q43, Q46, Q48 to Q51 (Q1, Q22, Q33 to Q37, Q41, Q44, Q47, Q52 to Q55 are done; Q48 and Q49 are
standing rules kept in the handover prompt), Hong Kong, Stelvio, Tokyo, Mumbai, Night Shift and two more second
levels, I2 (investigate dropping the game's commits from the origin: DEFERRED by the owner), the audit's
performance and bloat work, and the clock sweep (for the rebalance).
**Open with the owner:** the level card's height on a phone ("We will fix this later"); open question 22 (what
players get for both medals); the surplus levels' tier places; picks from the Good/Evil ideas and the Moon
airtime options; the smoke test's 74 failures (cause not known: a bisect was stopped by the owner).

**12-Oct session (new orchestrator):** agent 1 (`delivery-tests`, Sonnet 5.5, High: the owner lifted agent and
effort limits for the day) runs the QUICK smoke only, fixes stale tests, and groups tests so a future agent runs
only the relevant set (runner + `TESTS.md`). Owner: "Agent 2 should do something else." Phone card note: the
still taken at 390x844 is taller than most phones (the visible viewport under the browser bars is nearer
360x640 to 390x700); any phone-card work must be judged at those sizes, not 844. The phone card task is not
assigned yet.
Owner, 12-Oct: (1) the pause on new tasks is LIFTED; (2) TWO heavy locks now:
`delivery-heavy.lock` and `delivery-heavy-2.lock` in `%LOCALAPPDATA%\Temp` (take whichever is free, one heavy
job per agent); (3) the phone card task is SHELVED for now; (4) no pictures in chat unprompted, show them after
the owner answers. Running: 1 `delivery-tests` (quick smoke fixes, test groups), 2a `delivery-rework-b` (Hong
Kong scenery, Fable), 2b `delivery-sweep` (worktree sweep, left-drive board, crest still, toys WIP), 3
`delivery-prank-ideas` (K3 ideas, Fable).

## 12-Oct STATE: who is running (orchestrator's record; agents work in their own worktrees, never push)

Owner, 12-Oct: agent and effort limits lifted for the day; two heavy locks (`delivery-heavy.lock`, `delivery-heavy-2.lock`);
the pause is lifted; the phone level-card task is SHELVED. Fable for creative work, Sonnet 5.5 for code, effort Medium.

| Agent (id) | Branch | Task | Status |
|---|---|---|---|
| acd4f98bc65c965bb | `delivery-tests` (Sonnet 5.5 High) | QUICK smoke, repair stale tests, test groups (runner + `TESTS.md`) | running |
| af38a22b45231d1f5 | `delivery-rework-b` (worktree `delivery-themes-c`, Fable) | Hong Kong (27) scenery, obstacles, menu picture; `PLAN-hongkong-12-Oct.md` first | running |
| affdde1c80717c32a | `delivery-prank-ideas` (Fable) | K3 prank-cargo ideas document (`bcc7570`) | FINISHED, idle; owner to pick ideas |
| a4d86b2298daa7cef | `delivery-sweep` (Sonnet) | worktree sweep (`SWEEP-12-Oct.md`, its "26 merged" tally needs a recount), left-drive board fix `975de0d` in `render/gambles.js` (one still, no checks), crest still | FINISHED, idle |
| a1634b04827d0d100 | `delivery-gimmicklogic` (Sonnet Medium) | Q40, Q5, Q7, Q43, Q11, Q13 | running |
| a45c0b14b794d70a9 | `delivery-damage` (Sonnet Medium) | Q18, Q19, Q4, Q10, Q9 | running |
| a2e16dea304c48593 | `delivery-i2` (Sonnet Medium) | I2: investigation only, `INVESTIGATION-drop-game-history-12-Oct.md` | running |
| aeb34f3293c74514d | `delivery-garagetiers` (Sonnet Medium) | L4, L5, L6, L7 (BUMPED) | running |
| a960fb420786cf591 | `delivery-carfix` (Sonnet Medium) | L2 (Darkvan, Junker faster), L3 (race screensaver) (BUMPED) | FINISHED (`1a90c09`, `fda0149`) |
| ae2a93594691d35c4 | `delivery-beginner` (Fable Medium) | L1 shorten and simplify Beginner levels; `PLAN-beginner-12-Oct.md` first (BUMPED) | running |

Other branches: `delivery-crests` (files only, safe to merge; owner has not OK'd), `delivery-stats` (HELD until the
rebalance), `delivery-themes-toys-wip` (old; the sweep recommends mining it for parts).
Open with the owner (via front): merge `delivery-crests`; crest boards naming the hazard beyond; when to merge the
left-drive board fix; which prank ideas to build / whether a furious prank does anything in play / prank at the
door; where idle agents go next; question 22; surplus levels in the tier table; Good/Evil picks; Moon airtime option.

**12-Oct assignments after the first merges (orchestrator):** `delivery-carfix` (a960fb4): L2 measurement, L3 still, then Q16 and Q8.
`delivery-sweep` (a4d86b2): Q14, Q46, gimmick page Q25 to Q28, Q29, Q30. `delivery-prank-ideas` (affdde1, Fable): Q42, Q38, Q31, Q39.
Not yet given out: Q50/Q51 vehicle audit (large, heavy), Stelvio, Tokyo, Mumbai, Night Shift, Q2, Q3, Q12, Q15, Q17, Q20, Q21, Q24, Q32, Q45.

**12-Oct, owner's answers, BUMPED:** (A) prank cargo K3: "1. Build all ten. 2. No. Cosmetic only. 3. No need for an additional state."
Draft at `bcc7570` on `delivery-prank-ideas` (`IDEAS-prank-cargo-12-Oct.md`, not merged). Building: `delivery-prank-a` (a38fcd2, Fable: P1 to P4),
`delivery-prank-b` (a064ede, Fable: P5 to P7), `delivery-prank-c` (add6f36, Fable: P8 to P10); sight only, no in-play effect, available as Evil cargo,
not wired to levels. (B) Good/Evil indicator, idea 2 (underglow with a pulse): "for 2) have the agent model and show it": `delivery-underglow`
(a3b461d, Sonnet Medium), behind a CONFIG flag; DO NOT MERGE until the owner has seen the before/after stills.

**12-Oct, Good/Evil indicator widened (owner: "Just try all of them and report back."):** all 12 ideas behind `?ge=1,5,8` / `?ge=all` (shared `src/delivery/sidecues.js`,
none on by default), nothing merges until the owner has seen the stills: `delivery-underglow` (a3b461d: ideas 1 to 4), `delivery-ge-road` (af95595: 5 to 7),
`delivery-ge-ui` (a834466: 8 to 12; 11 and 12 are sound: not heard).
**12-Oct, MERGED `delivery-damage`:** Q18 damage speed cap 15 m/s (`CONFIG.damageSpeedCap`), Q19 explosive obstacle damage 10 + 6.5 x sqrt(volume), Q4 45 m wet after a
burst main, Q10 punctures card, Q9 as a card split only (open questions 23 and 24). Not checked in a browser; levels and replay checks passed.

**12-Oct, owner's feedback on the merged damage work (BUMPED, `delivery-damage` a45c0b1):** Q18 "I think the clamp is too harsh. 25 is barely any damage. ... I was complaining about sportcars (weak cars) oneshotting commuters with speed. Take weight into account." (replace the flat clamp with a mass-aware rule); Q19 "The lower end of obstacles do little damage" (raise the floor to about 25 to 30). Q15, Q3, Q12 parked behind them.

**12-Oct, owner's heavy-lock priority:** Beginner stills (L1), then the damage rework Q18/Q19 checks, then carfix stills, then the rest. `delivery-i2` merged (docs only; open question 25: the owner decides on the history drop).

**12-Oct, MERGED `delivery-sweep`:** Q14 (crosswinds removed from backlot and morro; CONFIG.crosswind stronger), Q46 (the Cattle Drive truss now tapers), Q25 to Q28 (gimmick page), Q29 (tyre bounce raised; cause not confirmed), Q30 (Gullwing doors only in the garage), SWEEP-12-Oct.md, the left-drive board fix. Levels check passed; C and D not seen/run.
**HELD `delivery-gimmicklogic` (a1634b0):** Q40, Q5, Q7, Q43, Q11, Q13 done and headless-verified; held until the owner answers open questions 26 (Q5 meaning) and 27 (Q13 override); light checks to run meanwhile (behind the lock priority).

**12-Oct, owner on the history investigation:** "I still only have the one domain, and would like it on the /delivery/ subdomain." Read as: the game on a subdomain of the one domain, in a repo of its own. `delivery-i2` (a2e16de) writes `PLAN-delivery-subdomain-12-Oct.md` (plan only: no pushes, no Cloudflare/GitHub changes; owner steps, the save-data question as a subdomain is a new origin).

**12-Oct, NEW ASSIGNMENT PAUSED AGAIN BY THE OWNER ("No more new tasks by the way."):** no new tasks or agents; running agents only finish, verify, correct and merge what they hold (prank models, Good/Evil cues, Beginner, damage Q18/Q19, carfix stills, the subdomain plan, held gimmicklogic, the sweep's stills job). Not to be started: Q15, Q3, Q12 (damage agent), Q21, Q17, Q20 (sweep agent), Q50/Q51 audit, and everything else in section D.

**12-Oct, NEW ASSIGNMENT PAUSED AGAIN by the owner ("No more new tasks by the way."):** no new tasks or agents; agents only finish, verify, correct and merge what they hold. Sweep's Q21, Q17, Q20 not to start unless already started; damage's Q15, Q3, Q12 not to start; Q50/Q51 not started. `delivery-i2` plan merged (docs only): open question 28.

**12-Oct, Good/Evil ideas 1 to 4 BUILT (`delivery-underglow`, not merged):** `?ge=1..4` / `?ge=all`; stills in `%TEMP%\claude\ge\` (i2c, i1a, i1b, i3a, i3b, i4b); agent's ratings: 1 ring/horn arcs reads best, 2 underglow reads well (pulse unseen in a still), 3 tail lights weak, 4 exhaust weakest (being corrected). Waiting for ideas 5 to 12, then one summary for the owner.

**12-Oct, OWNER: "Get the agents to stop any new models they might have to create next and finish their current work."** Every model-building agent told to start no further model, finish the one in hand, look at it in stills, correct, commit, report done / unstarted. Commits seen on the branches at that moment (not yet looked at, none merged):
- Prank cargo (sight only): `delivery-prank-b`: P5 piecatapult, P6 airhorn, P7 ghost: ONE "first cut" commit `51466c8` (all three; not yet seen in stills as far as known). `delivery-prank-a` (P1 to P4) and `delivery-prank-c` (P8 to P10): NO commits yet; whatever they have not begun stays UNBUILT.
- `delivery-prank-ideas`: Q42 volcano floor (`943eab2`), Q31 Evil palettes for the tier-4 Blue Stars and amphibious cars (`d2b5ef7`), Q39 Hell Rod / Courier Special / Showdown Muscle on their Super bodies (`8de4db6`), Q38 the Saucer hovers in the garage (`1375e57`): all four committed; stills not yet reported.
- Good/Evil cues: 1 to 4 built (`delivery-underglow`), 5 to 7 built (`delivery-ge-road`), 8 to 12 built (`delivery-ge-ui`, 11 and 12 sound not heard); none merged.
- Hong Kong (`delivery-rework-b`): re-laid, own obstacles, scenery committed (`97faba8`); Beginner (`delivery-beginner`): five levels shortened (`1b8b24f`). Final lists to be recorded when the agents report.

**12-Oct, MERGED `delivery-beginner` (L1)** and `delivery-sweep` (Q21 audit and removals, Q17, Q20 plan). Cargo check decision: the ten prank items are exempted from "every item turns up" by one array in `.cargo-check.mjs` (made by `delivery-prank-c`); not named in levelText.json (owner: available, not wired).

**12-Oct, MERGED `delivery-beginner` (L1) and `delivery-sweep` (second merge: Q21 audit and removals, Q17, Q20 plan).** `delivery-carfix`: Q8 kangaroos and Q16 learner are code-complete but UNSEEN: do not merge until their stills are read; the Junker blurb fix goes in separately (`delivery-carfix-words`). Words check on main: gimmickText blasts and punctures too long (damage agent).

**12-Oct, Good/Evil A (`delivery-underglow`, final `1c5853d`):** 1 and 2 read, 3 weak, 4 unconfirmed (Evil puff now a round dark ball, Good puff not caught); stills `%TEMP%\claude\ge\` (`fin\p-muscle-evil.png`, `p-commuter-good.png`); dark Good car and Good at night stills MISSING. Agent finished. Waiting on `delivery-ge-road` and `delivery-ge-ui` for one summary.

**12-Oct, owner's answers:** Q21 doubtful cases: "Remove the above" (sweep agent removes them); Q5: "Yes, supercharger = turbo" (confirmed); Q13: "For the funeral procession, yes" (the Jerk overrides a running mystery; gimmicklogic agent changes it, then I merge all six items). The subdomain plan: the owner will come back; nothing to do. Open questions 26, 27, 29 closed.

**12-Oct, MERGED `delivery-damage` (second merge) and `delivery-carfix-words`:** Q18 mass-aware cap (victim loses at most maxHealth x clamp(0.75 + 0.35 x (attacker mass - 1), 0.75, 3) per hit; `CONFIG.damageCap`; a sports car cannot one-shot a commuter, a bus/semi/tank still wrecks one); Q19 floor 25 + 4.9 x sqrt(volume), machinery 70, light kinds unchanged; Q15 low bridges (two bars, slalom; bars not seen rendered, open question 30); blasts and punctures blurbs shortened; Junker blurb fits. Q3 and Q12 not started.

**12-Oct STAND-DOWN (owner: "Get all to write a scratchpad and suspend." / "write a full handover"):** `HANDOVER-orchestrator-12-Oct.md` (full, with the prompt) and `SCRATCHPAD-12-Oct.md`; every branch has its own scratchpad. Then the owner: "Merge in all completed work to main." Merged to LOCAL main (unpushed): sweep `4181d06`, gimmicklogic, tests, prank-c, crests; prank-b and Hong Kong conflicted and went back to their agents; carfix Q8/Q16, prank-ideas, garagetiers, prank-a, Good/Evil x3, stats, toys-wip are NOT completed (stills unseen / unchosen / held). And: "I have a new repo, I would like the uncompleted work to be centralised and committed to the new repo for a cloud agent to take a look at": preparation only (history agent), nothing pushed until the owner's URL and go.

**12-Oct, LIVE COMMIT CORRECTION:** `origin/main` is `1077340` (pushed 11-Oct 02:22 per `git reflog show origin/main`), not `ceecc34` as the 11-Oct state block says; local `main` is 111 commits ahead (about 36 first-parent merges and notes), unpushed. Merged to local main since the stand-down: sweep `4181d06`, gimmicklogic (six items), tests, prank-c, prank-b, crests, Hong Kong (`delivery-rework-b`). Post-merge check results: pending (tests agent).

**12-Oct, SYNTAX FIX AND NEW REPO PLAN:** `police.js` had two unescaped apostrophes (Q11, `bff1b2f`): `vite build` failed on main; fixed on local main as `9ee71b6` (front; gimmicklogic's `9f7cb2c` is the same change). The owner's plan for the cloud repo, third version: "In the new repo, just remove all non-delivery racer stuff": all of main with history, ONE removal commit (the car-collection site gone), ONE WIP commit (patches of the unmerged branches, INDEX.md, CLOUD-AGENT-README.md); history options (a) keep (private repo), (b) rewrite to drop those paths, (c) snapshot. Prepared by the history agent in a scratch clone; NOTHING pushed; waiting for the owner's URL and go and the private/not answer.

## Owner's direction, 11-Oct (goes in every level and theme brief)

- "Good levels to follow are from level 32 onwards, with the exception of gimmick cramming." (Models for a
  level brief: levels 32 onwards, never their gimmick count.)
- "I would like each theme to not have to resort to using the same haybales, beach obstacles." (Each theme
  gets its own plain obstacles through the theme mapping at the foot of `themes.js`: no theme falls back on
  the shared hay bale or beach obstacles.)
- Answers to `OPEN-QUESTIONS-10-Oct.md`: questions 1 and 2 fine (stay); 3 fine (half crates, half bales),
  with the new task F1 below; 4 fine (as built). "More answers soon."

## F. New from the owner, 11-Oct (yet to delegate; not labelled to jump the queue)

- [ ] **F1. Cargo truck: an alternative state with an open door.** "Let's include a alternative state for this
      truck model though, one with an open door so players can distinguish which truck drops items." (The
      cargo truck that sheds crates and bales; traffic model in `render/trafficModels.js`. Small model task,
      Fable if the look is new, seen in stills from the chase camera.)
- [ ] **F2. Themes without the shared obstacles.** "I would like each theme to not have to resort to using the
      same haybales, beach obstacles." To do: an audit of which themes fall back on the shared hay bale and
      beach kinds in the `OBSTACLES` / `DRIFTING` / `themedKind` mapping, and each gets its own, themed and
      readable at a glance (no tyres, no generic crates). Fable for the new models.

## G. More answers from the owner, 11-Oct (yet to delegate; not labelled to jump the queue)

- [ ] **G1. Question 5: thematic, larger obstacles.** "5) Levels should get thematic obstacles, and generally
      larger ones that are more visible please." (Goes with F2: each theme's own plain obstacles, bigger and
      readable at a glance from the chase camera; a rule for every level brief.)
- [ ] **G2. Question 5a, Stunt Double's parade.** "5a) Too extreme. Bad placement." (The parade fills all four
      lanes of a one-way road, shoulders the only way past. To do: rework its size and placement so it does
      not take the whole road; the level's agent looks at it in stills.)
- [ ] **G3. Question 5b, the washboard.** "5b) Yes, thematic washboard. Let's have washboards reduce speed and
      cause the steering effect on all speeds please." (A look per theme: buckled plates, rippled dust, etc.,
      via the theme's `soft` colours hook of `c19807d`; and the effect: washboards slow the car and shake the
      steering at every speed, not only fast ones. Goes with Q1: "The washboard gimmick does very little.")
- [ ] **G4. Question 5c, the volcano's rock.** "5c) Will need an image to compare." (An agent makes a
      before/after still pair, the plain rock against the lava boulder with glowing cracks, to send to the
      owner.)
- Question 5h (Mountain Pass's clock): "Eh I don't know. We will do a full sweep later." Left as it is (195 /
  155); the full clock sweep (question 18) comes later.

- Question 5i (Suburbia's clock): "5i) There is a lot of time pluses in this level, and also this is the ideal
  difficulty of the game at the end. But we are not rebalancing yet." Left as written (35 / 25); no change
  until the rebalance.
- Question 5j (stop / go roadworks): "5j) Players can go onto the shoulders with no penalty on this gimmick.
  It's fine." Stays as built.
- [ ] **G5. Question 5k, Tranquility Base's crest: signs before crests.** "5k) Signs before crests please."
      (A warning sign placed before a crest, here and wherever a crest hides a hazard beyond it; the bigger
      marker for the barrier just past the top. Rule for level briefs.)
- [ ] **G6. Question 5k, a Moon gimmick: more airtime on crests.** "Could we look into a special gimmick where
      Moon levels get more airtime on crests? UFOs too." (A LOOKING-INTO first: an agent proposes how, e.g.
      lower gravity on Moon levels making crest jumps longer, and the same for UFOs, with what it costs the
      level rules; nothing built before the owner picks. Note the existing landing damage on Tranquility
      Base's crest.)
- [ ] **Question 5l (fog colours by theme): "5l) No. Green frogs are fine."** Read as not-fine for the first
      guesses (night dark blue-grey, volcano red-brown, sea bed blue silt), with the frog level's green kept.
      Which shades to change is asked in `OPEN-QUESTIONS-10-Oct.md`.

- Question 5c2 (Delivery stat): "5c2) With the rebalance, the traffic should consist of cars in the tier of
  the level. But we have not gotten there yet as the progression update is still pending." So
  `delivery-stats` stays HELD until the rebalance; traffic by the level's tier goes into the progression
  rework's spec (with Q45, R1 to R8).
- Question 5c3 (Nerve as built): "5c3) It's fine. We will test." Stays as built.
- Question 5d (Blue 4 cars' first figures): "5d) They are fine". Stay.
- Question 5e (Double Decker's height): "5e) Low bridges are getting an update". Real height stays for now;
  settled with Q15 (low bridges, slalom on both sides, massive damage).
- Question 5f (smallest idea cars): "5f) Keep". Stay.
- [x] **G7 CANCELLED by the owner, 11-Oct: "The audit vehicle widths is pointless. All vehicles are fine."**
      No width audit, no new check. (The rule stands as the owner's statement; nothing to build.)
      Original entry: **Question 5g, the Monster Truck, and a rule: no car exceeds a lane.** "5g) Yes. No car should
      exceed a lane, ever" (Yes to the Monster Truck drawn and measured at 0.87 of real size, and a rule for
      every vehicle: garage cars, idea cars, earned cars, level vehicles, traffic. To do: an agent measures
      every vehicle's width, mirrors and any overhang against the lane width, lists any that exceed it, and
      fixes them (scale or body), with a check that fails a vehicle wider than a lane.)

- [ ] **G8. Question 6, large level pictures on a phone.** "6.) Small images on phone". (The menu uses the
      small picture on a phone, whatever its pixel density; the large one only where the stage is a wide
      screen. Today the large one is taken whenever the stage draws it more than 15% wider than the small one,
      counting pixel density: `6eff165`, menu code.)
- [ ] **G9. Question 7, the milestone sound at the finish.** "7.) Remove it". (A milestone crossed at the
      moment a run ends no longer plays its sound over the results jingle.)

## H. Level progression rework: the owner's answers, 11-Oct (the rework itself is still parked; to go into its spec, R1 to R8)

- Question 9 (try by hand on the live site): "9.) Works fine". Nothing to do.
- **H1. Question 10, which level goes in which tier.** "10.) Put them in their current order as-is. 1-5, 6-10
  in each tier etc". (Levels in the order they are on the menu now; tier 1 is levels 1 to 5, tier 2 levels
  6 to 10, and so on. Levels beyond the fifty places and the special levels: see H4.)
- [ ] **H2. Question 13, tip money against the cost of cars.** "13) Add to the checklist that we will need to
      do some calculations on tip money to afford the cars based on a rushed playthrough (minimum stages
      played to rush up the tiers)". (An agent computes, for the tier table of H1, the least number of levels
      a player must play to afford each tier's cars, taking the best tips a rushed run earns; reported as a
      table. Part of the rebalance.)
- **H3. Question 14, what opens Blue 1.** "14) Blue 1 is unlocked after beating level 5 of 5 star." (Beating
  the last level of the five-star tier opens Blue 1; the other assumptions of question 14 stand.)
- [ ] **H4. Question 14, easy rearranging of tiers.** "Add to the checklist too that I want to be able to
      easily rearrange levels amongst tiers. It's possible I want some of the special levels into the
      tiers". (The tier table is one data file the owner can edit, a level named once by id, with a tool or
      page to move a level between tiers; special levels may be placed in a tier. Goes into the spec of the
      progression rework.)
- Question 12 (what opens an amphibious level) is still open.

## I. The owner's answers to questions 15 to 21, 11-Oct

- Question 15 (the code audit): "15.) This will be good for later". Deferred; the audit's performance and
  bloat work waits.
- [ ] **I1. Question 16, the `delivery-batch` worktree and the old stash.** "16.) Drop this". (Read as yes:
      clean the worktree and drop the stash. An agent looks at both first, removes the node_modules link
      with `rmdir` before anything else, never recursively over a junction, and reports what was removed.)
- [ ] **I2. Question 17, a repo of its own for the game: DEFERRED, with an investigation.** "17.) Defer this,
      investigate if it is feasible to drop all delivery game commits from the origin on this repo
      (basically time travelling back to before)". (An agent investigates only, changing nothing: whether
      the origin's history can be rewound to before the first Delivery Racer commit, what it would take, what
      it would break (the live site deploys from `main`; open worktrees and branches; force-push), and
      what it would cost to keep the game's history in a repo of its own. A report; no push, no rewrite.)
- Question 18 (clocks): "18) Leave for the great rebalance". Waits for the rebalance.
- Question 19 (deferred gimmicks): "19) These gimmicks dont pass the smell test to me. I only want the tram
  fix, it is in the checklist already. Drop these." The climbing lane, the hairpin cut, the tram lane and the
  fork with a choice are DROPPED. Only the tram fix stays (Q6).
- Question 20 (a link to the game from the site): "20) No need." Nothing to do.
- [ ] **I3. Question 21, more cargo: BUMPED UP.** "21) Yes please. Bump this up". (Build the twenty more cargo
      ideas, C41 to C60, the "malicious deliveries" drafted in `CHECKLIST-10-Oct.md`. First in the queue.
      Fable: new models.)

- [ ] **I4. A cargo from the owner, added to I3:** "A crate of lawyers with just an arm sticking out on all 4
      sides with a suitcase, waving around. The agitated version flails around the most, with paperwork flying
      everywhere". (Sent to the cargo agent.)

- [ ] **I5. Q22 BUMPED UP by the owner, 11-Oct (started at once).** "Bump up: Q22. \"Show the cargo being
      delivered on the menu screen per level and the level cargo should be set in the same way as the level
      name and description.\" (Into `levelText.json` or a file like it, with the level's own file as the
      fallback.) (of course have a failsafe if the defined cargo does not exist)". Touches `levelText.json`:
      the merge waits for the owner's commit of their edits to it.

- [ ] **I6. With Q22: capitalise cargo names.** "Small change while you are at it: The cargo names are not
      captialised properly". (Sent to the Q22 agent; a commit of its own.)

## Merged / ready, 11-Oct (status note)

- Merged into `main`, not pushed: Ring Road (`82c8719`), G8+G9 (`66c7062`), Q54+Q55 (`e051119`), the cargo
  truck's open door F1 (`66efef0`).
- Ready, HELD for the owner's commit of `levelText.json` / `cars.js`: Spring Thaw (`delivery-themes-e2`),
  fallout "Hot Zone" (`delivery-fallout`, all four pieces, many checks passed on the branch), Tow Truck
  shelve (`delivery-tow`, touches `cars.js`). Spring Thaw and Hot Zone both claim level place 52 in
  `INSERTED_AT` (`progress.js`): the second to merge renumbers.

- [ ] **I7. The level progression rework: BUMPED UP by the owner, 11-Oct (first in the queue; starts at the
      first free agent, five agents are running).** "Okay, bump up the progression update please." Inputs:
      the spec in `CHECKLIST-10-Oct.md` ("Level progression rework", R1 to R8, with Q45) and the owner's
      answers in section H above (current level order, 5 a tier; Blue 1 opens after level 5 of the five-star
      tier; levels easy to rearrange among tiers, special levels may go in; tip-money calculation for a
      rushed run; traffic by the level's tier at the rebalance). Question 12 (what opens an amphibious
      level) is still open.
- **Effort rule, 11-Oct:** "Let's stop using the High effort for new agents now": new agents run at Medium
  (Fable for creative work as before).

## J. The owner's last answers, 11-Oct

- **Q12 (what opens an amphibious level):** "It unlocks after earning at least half a ribbon on every stage in
  its corresponding blue star tier". Sent to the progression agent (I7).
- **Q5l (fog colours):** "omg. I misread you. Do whatever the idea was with fog, the current version was the
  most wrong." Fog's colour by theme stays as built (`ff21b9a`, merged): the first-guess shades for night,
  the volcano and the sea bed stay as the owner's choice. Nothing more to build unless the owner says.
- [ ] **J1. Q41, one words file per kind, named consistently.** "One per file, but let's name them
      consistently." (A words file each for cars, traffic kinds, pickups, gimmicks, obstacles, cargo, beside
      `levelText.json`, with one naming scheme, each thing's own table as the fallback and the words file
      taking priority; then a short line per entry for its tile on the "What's on this road" card. Medium.)
- [ ] **J2. Q44 and Q47, trains.** "Yes, The bullet (or other train, customly defined) gets an extra middle
      carriage." (Breaking a crossing's boom no longer slows the car; the bullet train, or any train a
      crossing defines, gets one more middle carriage; a crossing or theme names its own train model: a
      steam train for High Noon and Cattle Drive. Fable for the steam train.)
- [ ] **J3. Q32, ideas for showing Good or Evil in-game.** "Sure." (An agent writes ideas for the owner to
      choose from; builds nothing.)
- [ ] **J4. Q5c, the volcano rock against the lava boulder.** "Sure but this is not very pressing as I did
      not see an issue personally". Low priority: a before/after still pair when an agent is free.

- [ ] **J5. The quick smoke test, asked for by the owner, 11-Oct: "Run the quick smoke test and see".**
      (The standing rule is never to run it unless asked: it was asked. An agent runs it on `main`'s tip in a
      scratch worktree, alone, and reports.) Also 11-Oct: **"Push now"**: `main` pushed to `c5575c7` (51
      commits); the washboard (`3600daf`) and later merges are local only.

- [ ] **J6. Cargo in 3D on the menu, BUMPED UP, 11-Oct (sent to the Q22 agent).** "I want the cargo to be
      displayed in 3D, rotating if on desktop. Bump this". **Corrected by the owner:** "I want the cargo to be
      displayed in 3D, rotating if on desktop in the level card. Bump this" (the "What's on this road" card,
      not the menu stage.)
- Status, 11-Oct: all 32 check runs pass at `c5575c7` (lint 61 problems, 2 more than the first run's 59;
  one new in `render/themes/fallout.js`). `main` pushed to `ceecc34` (washboard, 20 cargos, level cargo).
  The quick smoke test fails (74 lines + a crash at `delivery-smoke.mjs:514`); the owner said to ignore it
  for now; a bisect agent is finding out whether it is the game or a stale test.

## K. The owner's complaints and requests, 11-Oct, late

- [ ] **K1. Balance the fallout gimmick.** "Balance the fallout level gimmick: The radiation damage is
      neglible, and it is extremely hard to get radiated by staying in radiation. The player's car should
      receive the same radiation glow if infected" (started: Sonnet, Medium, branch `delivery-radbalance`).
- [ ] **K2. The new cargos are poor; rework them and drop three.** "The new cargos are nowhere near as good as
      the previous ones.. I'm not sure what the previous agent was given." Notes 1 to 14 (kittens, jumper,
      library books, fruit basket, lawyers, glitter bomb, recorders, telemarketers, tax inspectors,
      bailiffs: "Axe it", consultants, in-laws' luggage, marching band, salesman and surprise party:
      dropped) and "5a) The agent was really uninspired and just gave variations of the same concept,
      executed poorly." (started: Fable, Medium, branch `delivery-cargofix`; the three drops are C44
      bailiffs, C52 salesman, C53 party.)
- [ ] **K3. Prank-related cargo items: a DRAFT OF IDEAS first.** "Let's improve these, drop the ones in 14)
      and then let's do some prank-related items. I would want a draft of ideas now before I OK the
      modelling. This was expensive for very poor effort". (Ideas only, for the owner to approve; nothing
      modelled before the OK. Queued behind K1 and K2.)
- [ ] **K2 note 15 (added, sent to the K2 agent):** "15.) The Chain Letter has the enevlope triangle rotated
      the wrong way".
- [ ] **K4. Tier UI: stars, not words.** "Don't call it \"Gold 1\", just render the stars..." (The
      progression rework's menu, lock reasons and garage notes show a tier as stars in its colour, never the
      words Gold or Blue. Sent to the progression agent.)
- [ ] **K5. Q33 to Q37 BUMPED, 11-Oct: "Bump Q33 to Q37 now".** (The menu and garage requests: the Plop Up
      sound on menu clicks; buying cars from an `alert()` to an in-game menu; sort and show as lists, hiding
      empty options; Good/Evil livery with "Switch" and "Use"; stat lines blocking the cars on mobile.
      Started: Sonnet, Medium, branch `delivery-garageui`. The smoke bisect was stopped to make room: the
      owner had said to ignore the smoke test for now.)
- [ ] **K6. BUG, under the tiers rework, 11-Oct:** "Bug: I select an Idea Car. The level G1-1 forces me to
      select The Commuter. When the level ends, the animation plays with the Idea Car instead of The
      Commuter". (The end-of-level animation uses the player's own pick, not the car of the run. Sent to the
      progression agent, first in its queue; the tiers stay off by default so nothing live is affected.)
- [ ] **K7. Half-ribbons become medals, 11-Oct.** "Let's stop calling everything half-ribbons and call them
      medals instead. Delivering a level on good earns you 1 medal, instead of 1 half-ribbon. Re-word all
      other text to reflect this". (The tiers rework's text and docs; watch for a clash with the existing
      "medals kept beside ribbons" concept. Sent to the progression agent, queued after K6 and K4 and the
      progress code.)
      **K7 addition, same day:** "Nothing is called a ribbon anymore. Reword all lines. \"Deliver level 4 of
      <STAR> on either side\" becomes \"Earn a medal on Level 4\"". (No user-facing text says ribbon or
      half-ribbon; sent to the progression agent.)
- [ ] **K8. J6 corrected AGAIN, 11-Oct: "No no no no no. The cargo is to spin ON the level card itself".**
      (Not a tile in the "What's on this road" card, which is where `fcb3129` put it: the main level card
      on the menu stage, in place of the name-only Cargo figure in the facts row; the road card's tile is
      removed. Sent to the Q22 agent.) Also merged: J1 words files (`60765ac`); its cargoText.json entries
      for the dropped cargos go with K2.
- **STOP, 11-Oct (owner): "Stop the assignment of new tasks from now please".** No new agents and no new
  tasks to agents that finish; running agents finish what they hold; finished work is merged locally and
  reported. Nothing below is started until the owner lifts this: K3 (prank ideas draft), J4, the rest of
  Q1 to Q51, Hong Kong, Stelvio, Tokyo, Mumbai, Night Shift, I2.
- [ ] **K9. Garage side-switch bug, 11-Oct.** "Fix this bug here, on a level where you are locked from using
      other tiered vehicles only on one side, selecting the opposite side gives you the full garage, then
      the player is allowed to switch sides on the full garage. The garage should switch to the filtered
      version." (Started; branch `delivery-garagefix`.)
- [ ] **K10. "Also, apply the new progression please" (11-Oct):** `CONFIG.progression.tiers` set to true by
      default after K9, `?tiers=0` kept; the checks that asserted it off updated; old saves checked. Local
      `main` only until the owner says push.
- **Standing rule from K2:** a new model is looked at in stills from front, back, side and above, in every
  state and at the level-card tile size, and must be distinct from every other model in concept; open-topped
  things have no top face; no coplanar faces; no parts passing through each other. **Refined by the owner:**
  "A black face as the top would be sufficient to indicate that it is open." (An open-topped container
  needs only a flat black face across its opening, with the contents standing proud of it, not a modelled
  interior; a closed one keeps a solid lid.)

## A. Delegated on 11-Oct (running)

- [ ] **A1. Level 24, Ring Road: make `delivery-rework-e` mergeable and verify.** (Handover: "`delivery-rework-e`
      (Ring Road, level 24): finished and fit; its merge conflicts in three files with additions beside
      additions. An agent merges `main` into it, keeps both sides, runs the checks; then merge.") Sonnet 5.5,
      High; worktree `.claude/worktrees/delivery-gimmicks`. Also asked: menu picture from `'ring-road':
      '&at=4330&ff=1'`, four stills looked at, words into `levelText.json` if the check requires.
- [ ] **A2. "A sensible first task for an agent: every check on `main`'s tip."** (Handover: "Not checked on
      `main` itself: the six merges after `6409bb9` (the mains follow-up, the gap fills and the seeded
      gimmicks check, the obstacles tidy-up, the level-text file, fog by theme, Market Town).") Sonnet 5.5,
      Medium; scratch worktree, edits nothing; also the lint count.
- [ ] **A3. Nuclear fallout: theme, level and gimmicks. The owner's HIGH PRIORITY.** Branch
      `delivery-fallout`, worktree `.claude/worktrees/delivery-levelfix`. Fable. The owner's words: "New theme,
      level and gimmick. Nuclear fallout level, near a powerplant/industrial area. Green skies. Gimmick 1 is
      radiation areas, driving into radiated areas causes health to tick down slowly. A unique radiation
      meter ticks up, and at full the player is permanently infected and the health ticks down regardless.
      Gimmick 2 is infected cars. Traffic cars can spawn infected, or have a chance to get infected while
      driving in radiation. An infected car will have a radius where they have the same radiation gimmick.
      Infected cars don't tick down other infected cars. Contact with an infected car will infect you. The
      shield will prevent radiation damage, and will prevent the player from getting infected."
      Piece 1 (logic, check) done (`ae29ceb`). Left: piece 2 how it is seen (`render/radiation.js`,
      `syncRadiation` in `main.js`, HUD gauge, sounds `geiger` and `infected`, two cards in `gimmicks.js`,
      `?rad=` / `?radcar=` switch, stills); piece 3 theme `fallout`; piece 4 the level.
- [ ] **A4. "Spring Thaw", the ice road's second level: finish and verify.** Branch `delivery-themes-e2`,
      worktree `.claude/worktrees/delivery-city-levels`. Sonnet 5.5, High. ("Next step: `node
      scripts/delivery-probe.mjs thaw --secs=500`; shoot the unseen stretches; `--levels=thaw --write`; every
      check; then it can merge.")

## B. Unmerged branches, yet to delegate (the handover's order)

- [ ] **B1. `delivery-rework-d` (Tour de Coast, level 23): "the level done, the scenery part done, a
      lighthouse leans."** To do: "the headland lighthouse leans visibly (still `c1080`): fix; the causeway
      boats are tiny and some lie on the sand near the zone's start; the cliffs zone got nothing new; the
      start arch's banner and the harbour light were not clearly seen; the menu picture (the script's `CINE`
      has `'tour-de-coast': '&at=1600'`, the cliff road); the full set of checks and the replay check; a look
      as Evil." Worktree `.claude/worktrees/delivery-cargo-good`.
- [ ] **B2. `delivery-rework-b` (Hong Kong, level 27): "the level file re-laid; no scenery."** "Not done: the
      scenery (nothing written: no `sets` on the theme, nothing in `extras.js`, no `zones` on the level); the
      mirrored FRESH TAR board (on this `drive: left` level its lettering is mirrored: fix it in the board's
      code so every left-drive level is right, and check Tokyo's); the menu picture; the full checks; the
      commit that drops "WIP"." Worktree `.claude/worktrees/delivery-themes-c`.
- [ ] **B3. `delivery-stats` (the Delivery and Nerve car stats): "built and HELD for the owner's answer to
      question 5c2. Do not merge without it."** Waiting on the owner.

## C. Queued by the owner after the stand-down (not labelled to jump the queue)

- [ ] **C1. Shelve the Tow Truck's gimmick.** The owner: "That is a useless feature. Let's just shelve the tow
      truck gimmick for now." To do: take the trait and perk off the Tow Truck (it stays a car, wrecked by
      wreckage like any other), keeping the code path dormant or removing it cleanly, with the garage's perk
      text, `.traits-check.mjs` and the Gimmicks page brought into line. The other three traits stay.
- [ ] **C2. Rubbernecking becomes an obstacle-based gimmick.** The owner: "Let's change rubbernecking to an
      obstacle-based gimmick. Randomly on the shoulder we put two cars (in damaged model condition) and on
      fire. Rubbernecking happens at this zone. This should only happen on roads with more than 1 lane per
      direction." To settle in the brief: "randomly" against the standing rule that level content sits at
      fixed positions (suggest: a seed from the level); whether the two cars are solid obstacles to anyone
      using that shoulder; the gamble it gives; a card on the Gimmicks page and the road card; a check; stills.

## D. The owner's list of 10-Oct, about 9 pm ("Add to the list"). None started

The owner's words, as in `CHECKLIST-10-Oct.md`. Q52 and Q53 are done and left out.

**Gimmicks: how they play**
- [ ] Q1. "The washboard gimmick does very little. It's not an interesting obstacle."
- [ ] Q2. "The truck spray gimmick looks ugly and does even less. What exactly was it meant to do?" (Answered in
      chat: H11: every tall vehicle on a wet stretch drags a cloud nothing can be seen through, so the choice
      is to hang back and see or overtake blind; it does nothing to the car and the cloud is a plain
      translucent box. To rework or drop: the owner's call.)
- [ ] Q3. "Seaquake has scripted wreckage from the sky, but it is supposed to be indoor."
- [ ] Q4. "There should be a difference between ice and water - ice only affects you while on it, water
      continues to affect for a set distance after". (Wet tyres after a burst main; mains water already has
      its own numbers in `CONFIG.waterMain`.)
- [ ] Q5. "Supercharger should increase the car's top speed around bends proportionally".
- [ ] Q6. "The tram on the Hong Kong level does nothing. It should work like Canberra's, incoming only,
      guranteed destruction except for vehicles that survive a head-on collision (Tank)".
- [ ] Q7. "Drop bears should take into account player speed. Most 4 or 5 star cars outrun it".
- [ ] Q8. "Kangaroos are too hard to see on the road. Make them larger and brighter."
- [ ] Q9. "The blasting gimmick on the airport is mechanically a wreckage, but a Blast in Quarry Run. Move all
      blasts into the blasting gimmick."
- [ ] Q10. "The puncture gimmick is not updated for new ways to get a puncture."
- [ ] Q11. "Assaulting the police in pursuit should be a bust, but everything else they will let you go as
      they are busy,"
- [ ] Q12. "The wrong way driver gimmick warns a player sometimes for a car that doesn't actually affect the
      player at all. This is a complex fix. A lane that becomes oncoming in a side road should not spawn a
      traffic vehicle such that the player will meet one before the oncoming lane starts. This wrong way
      driver gimmick should be used to send a random driver the wrong way like the Bullet train gimmick."
- [ ] Q13. "A convoy and a Funeral Procession are too similar. Make it such that crashing a funeral
      procession triggers the Jerk mechanic for 10s."
- [ ] Q14. "Crosswinds should be in thematic levels. It has no place in the movie set or a fevela. It also is
      not really relevant most of the time, it needs tuning."
- [ ] Q15. "Low bridges are very cheap to ignore. It should deal massive damage, and be placed on both sides
      (not at the same level, so players can slalom around them). If a tall traffic car spawns in its path it
      should just go through with no penalty."
- [ ] Q16. "The learner driver's L should be a flipped writing element, and it is far too slow. It should
      also wobble in its lane."
- [ ] Q17. "\"Side Road Gimmicks\" is not really a gimmick on its own".

**Damage and balance**
- [ ] Q18. "Speed plays too big of a role in damage dealt in a crash. There should be a cap because fast
      fragile cars are oneshotting low star cars in a rear-end."
- [ ] Q19. "Rebalance all the obstacles that explode on contact. They should take health away roughly equal to
      how big they are. The construction equipment do not cause nearly enough damage."

**Levels**
- [ ] Q20. "Some amphibious stages don't make sense as the water is just inbetween land. They should either be
      obviously a canal, a river or it should transition into the sea or a river."
- [ ] Q21. "The level agents are very found of recent gimmicks. Burst water mains and potholes and tunnels
      appear almost every level. It should be thematic." (A rule for every level brief from now on, and an
      audit of the levels written or reworked on 10-Oct.)
- [ ] Q22. "Show the cargo being delivered on the menu screen per level and the level cargo should be set in
      the same way as the level name and description." (Into `levelText.json` or a file like it, with the
      level's own file as the fallback.)
- [ ] Q23. "When writing a level or taking a screenshot, note the coordinates where the screenshot was taken.
      It will help with re-taking the shots." (A rule for every brief; the menu pictures' places are already
      in the script's `CINE` table.)

**Signs, models and the reference pages**
- [ ] Q24. "The newer signs do not reverse for flipped levels". (Lettered boards mirrored on `drive: left`
      levels; one was already seen on Hong Kong's FRESH TAR board.)
- [ ] Q25. "The lanes closing model on the gimmick page is not accurate to what it actually looks like".
- [ ] Q26. "The reversible lanes model in the gimmick page is showing a reversing car."
- [ ] Q27. "The low bridge animation's bus crab walks away."
- [ ] Q28. "All models in the gimmick page should be spinning".
- [ ] Q29. "The tyres from explosions should gain some upwards velocity and bounce".
- [ ] Q30. "The Stainless Gullwing's doors should only animate in the garage".

**Cars and how they look**
- [ ] Q31. "The non-normal star cars (blue stars, amphibious etc) have very boring and dark Evil palettes.
      Darker in general, but not every car needs to be black."
- [ ] Q32. "Think of how we can indicate in-game subtly whether a car is good or evil". (Ideas wanted first,
      for the owner to choose from; nothing to be built before that.)

**Menu and garage**
- [ ] Q33. "Use the Plop Up sound for each click on the menu".
- [ ] Q34. "Migrate buying the cars from a .alert() to a ingame menu."
- [ ] Q35. "Change the sort and show toggles to a list rather than a cycle, and hide if the list returns 0
      cars."
- [ ] Q36. "In the garage, Livery: Good should just be Good/Evil, and \"Use this car as Good\" should be
      \"Switch\" and \"Use\". Switch is current behaviour, Use sets the car and goes to the menu."
- [ ] Q37. "The stat lines still block the cars in the mobile view." (After the comparison strip of
      `9af18d1`: the garage's stats text, now three lines on a phone with Delivery and Nerve pending.)

**Added later the same evening**
- [ ] Q38. "The UFO should have a floating animation and be off the ground".
- [ ] Q39. "The six-star cars with a in-game super variant should use the super variant's model." (Of the nine
      earned cars, the ones built on a garage model: Hell Rod on the Hot Rod, Courier Special on the Sleeper,
      Showdown Muscle on the Muscle; the other six are level vehicles: to be confirmed by the builder which
      of them has a Super livery and kit.)
- [ ] Q40. First: "A car with no super variant should have a clamped 0% chance to get the super upgrade
      mystery effect". **Revised by the owner:** it should go: "We were gonna upgrade your car, but your car
      has no super variant!" So the effect CAN still be drawn by a car with no Super variant; when it is,
      nothing is upgraded and that line is said, in those words. The fallback of today (such a car is made
      invincible) goes. The line lives in `messages.json` with the other mystery lines.
- [ ] Q41. "A variant of the level file, all car names and strings should be compiled in one file. Then, all
      of then needs a short description for the \"What's on this road\" level card". (As `levelText.json`
      did for level names and descriptions: one words file for every car's name and the game's other
      strings, each thing's own table as the fallback; then every entry gets a short line for its tile on
      the road card. The owner's rule for all such files: the words file takes priority. To confirm with the
      owner: one file for everything, or one a kind.)
- [ ] Q42. "Rendering the volcano theme without a floor makes near objects look floating and the skybox
      erupting volcano overlap the mountains appear through fog banks". (Volcano theme, Cinder Island and
      Eruption Day: no ground drawn beside the road; the erupting mountain drawn over the nearer mountains;
      it shows through a fog bank. The erupting look is `229dd8d`, `render/themes/volcano.js`.)
- [ ] Q43. "UFO air strike effect takes too long to happen, maybe it should start ticking damage before the
      UFO leaves".
- [ ] Q44. "Remove the slowdown for breaking the barrier on a level crossing. It makes it almost impossible to
      get hit by the bullet train. Increase it by one segment too". (Read as: breaking a crossing's boom no
      longer slows the car; and the bullet train gets one more carriage. To confirm with the owner if "it"
      means something else.)
- [ ] Q45. **For the level progression rework, when it comes in (not before; add to its spec).** The owner:
      "A player who clicks on an incomplete level of a new tier, and has no cars of that tier should select a
      null_car, silhouetted car and not be able to start the level. Clicking into a garage with a car
      restriction should automatically filter out the garage to just cars that can be selected. Keep the
      player's previous pick, so when they choose a different level the car is re-selected".
- [ ] Q46. "Level 51 has a bridge that narrows. It has jagged steps." (Cattle Drive, `levels/cattle.json`:
      the one-lane bridge at 1280 to 1420 with its `narrows`; the narrowing is drawn in steps where it
      should taper.)
- [ ] Q47. "Allow level crossings to define a train model. The level crossing in the Wild West should not use
      the bullet train." (A `train` setting on a crossing or on the theme; a steam train for High Noon and
      Cattle Drive.)
- [ ] Q48. **A STANDING RULE for every level brief:** "The agents that build levels really need to know that
      they should not aim to cram every gimmick into every level." (With Q21: gimmicks suit the theme.)
- [ ] Q49. **A STANDING RULE, and levels to fix:** "The rockfall gimmick keeps getting added to places where
      they float in mid air. There needs to be some standing memory about this". (Rockfall only where a rock
      face or slope stands above the road on that side, and looked at in a still; an audit of every level
      with `rockfall` or boulder `wreckage` for rocks that hang in the air.)
- [ ] Q50. **An audit of every vehicle model**, the owner's three parts:
  - [ ] Q50a. "Define proper headlights, brake light and turn signals to all vvehicles."
  - [ ] Q50b. "Audit all models to not have gaps in their models. For example, the hearse's rear window is not
        connected to its chassis, the Tow Truck's rear bumper is floating."
  - [ ] Q50c. "Audit all damaged models to make sure they don't look silly. The Polygon Truck's damage model
        phases though its windscreen, and keeps its lights hanging."
- [ ] Q51. "Audit and add more idle animations to vehicles where it makes sense". (Goes with Q50, the same
      pass over every model. Q30 limits one of them: the Gullwing's doors only in the garage.)
- [x] Q52, Q53: done on `main` (`0aff68e`), see `CHECKLIST-10-Oct.md`.
- [ ] Q54. "The cone of fire on the Egg in a nest cargo is reversed". (Evil cargo `egg`, its furious state:
      the hatched dragon's flame; `render/cargoModelsEvil2.js`. The cone points the wrong way, wide end at
      the mouth.)
- [ ] Q55. "In the Spa level, the runoffs are really wide. At some points, the car pulls to the middle of the
      runoff (it is a road shoulder) when the proper lanes carry on straight. This should not happen, but
      turning off steering within a shoulder/runoff in races is also not feasible." (Look at the lane assist
      with hands off and how it picks a lane where the run-off is far wider than a lane. The pull should
      only ever be toward a real lane, or not act at all outside the lanes. Monza has the same wide run-off;
      Albert Park has none.)

## E. Not started (from the handover)

- [ ] "Stelvio (30), Tokyo (28), Mumbai (29), Night Shift and two more second levels, five weak menu
      pictures, moving nine levels' words into `levelText.json` as their branches land, the audit's
      performance and bloat work, the level progression rework (parked by the owner; three of its questions
      answered today)."
  - Stelvio: "a LIGHT touch. Kinds: crosswinds, fog, ice, rockfall, police only in stretches. Take cash from
    20 in 8 rows to 27 or more in 8 to 15 rows ... a second fog bank and a second crosswind on the way down,
    rocks on the steep ground between the hairpin legs, and something to see on the valley floor." Branch
    `delivery-rework-g` from `main`, worktree `.claude/worktrees/delivery-circuits`.
  - Night Shift: "theme `portNight` ... the terminal at night, wet, in fog between the stacks. About 3.6 km".
    Branch `delivery-themes-f2`, worktree `.claude/worktrees/delivery-menu`. Two more second levels: the
    favela descent on `favelaRain`, and "Monsoon" on `riceMonsoon`.
  - Five weak menu pictures: `marina-bay`, `montreal`, `monza`, `singapore-night`, `battlefield`; and look at
    ten large pictures across themes (a night one, a snowy one, a busy city one).
  - Nine levels' words to move into the level-text JSON when their branches land: `hong-kong`,
    `tour-de-coast`, `ring-road`, `market-town`, `stelvio`, `toys`, `leaks`, `moon`, `morro`.
## L. The owner's new-player experience list, 12-Oct: BUMPED (start at once)

"add to the list, and bump these because this was my new player experience."
- [x] **L1.** "Shorten Beginner levels and simplify them" (the first tier's levels; agent `delivery-beginner`). MERGED 12-Oct (`1b8b24f`): expressway 2000 m 110/85 s, back-roads 1800 m 115/90, farm 2000 m 105/80, big-business 2400 m 125/95, hurricane 2400 m 130/100; one idea each; not played by hand; starter-car margins being re-measured by carfix.
- [x] **L2.** "Darkvan and Junker need to be faster" (agent `delivery-carfix`). MERGED 12-Oct: Junker 22/8 to 25/9.5, Darkvan 21/7 to 24/8.5; cruising time against the Beginner clocks NOT measured yet (follow-up sent).
- [x] **L3.** "Race screensaver broken" (agent `delivery-carfix`). MERGED 12-Oct: racewatch stored names in `car.driver`, which the pursuit made a function; now `car.driverName`. Headless 60 s on six circuits OK; no still yet (follow-up sent).
- [ ] **L4.** "Cars from locked tiers should not appear in garage. Let's have the cars in the immediate next tier
      be black silhouettes but unpurchaseable" (agent `delivery-garagetiers`).
- [ ] **L5.** "Back Button should return to previous page" (agent `delivery-garagetiers`).
- [ ] **L6.** "Drop progression requirement for 4th level from 4 medals to 3" (agent `delivery-garagetiers`).
- [ ] **L7.** "Mobile garage: Show the stats for the selected car even when not in compare mode" (agent
      `delivery-garagetiers`).

- [ ] "**Levels 28 Tokyo and 29 Mumbai** to the standard: never started; the plans are in
      `SCRATCHPAD-10-Oct.md` ("Levels 26 to 30")."

## J. Level progression rework: BUILT on branch `delivery-tiers`, ON by default (12-Oct) (11-Oct)

- The tier table is `src/delivery/tiers.json` (tier -> five level ids; the rest under `outside`); `node scripts/tiers.mjs`
  prints and checks it, `node scripts/tiers.mjs move <id> <tier|outside> [position]` moves a level. Rules and the
  amphibious rule (Q12: half a ribbon on every stage of its blue tier, ONE function, `Tiers.amphibiousOpens`) are in
  `tiers.js`. Switch: `CONFIG.progression.tiers` (true, the default; false = the old rule); `?tiers=0` switches it off for a visit, `?tiers=1` on.
- Medals are the best times (nothing new saved); `tierBase` keeps a save's already-open levels open; `tierCars` keeps a
  restricted level's car apart from the player's pick (Q45). Null car, disabled START and the filtered garage: done.
- NOT built (5c, for the rebalance): traffic made of cars in the tier of its level.
- `scripts/tier-money.mjs` is the rushed-run money table; `scripts/.tiers-check.mjs` checks the rules.
- Wording (owner, 11-Oct): a half-ribbon is now a MEDAL. Delivering a level on Good earns 1 medal, on Evil 1 medal; a level's two
  are its ribbon; a level with one side only gives both at once. The menu's existing bronze / silver / gold (time to spare)
  is the GRADE of a medal, shown as before on each side's half: delivering on time is at least a bronze, so a side has a medal
  exactly when it has a grade. Same word, one thing: see the report to the owner.
