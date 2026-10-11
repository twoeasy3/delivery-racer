# Delivery Racer: questions waiting on the owner (10-Oct, 2026-10-10)

Kept by the orchestrator. Each question says what it is about, what happens if it is left alone, and what
the orchestrator would pick. Answer in any order; an answered one is moved to `CHECKLIST-10-Oct.md` and
struck from here. Nothing below blocks the agents now at work unless it says so.

## Levels

1. ~~**Quarry Run's finale.**~~ ANSWERED 11-Oct ("fine"): stays. (Was: The last rock blast (at 4290 m) comes down across both lanes; the way round is
   the right shoulder or the merge side. Is that too much? Pictures sent (the crag before, the blast after).
   Left alone: it stays. Pick: keep it; it is the level's finale and there are two ways round.
2. ~~**Cattle Drive's one-lane bridge.**~~ ANSWERED 11-Oct ("fine"): stays. (Was: On the new Wild West level the bridge at 1280 m narrows the player's
   side to one lane for 190 m; with tractors and processions about, the only way past is the oncoming lane
   (a 20 sits there). Is that too close to an imposed crawl? A picture is to come. Left alone: it stays.
   Dropping the narrowing is a one-line change.
3. ~~**The cargo truck's load.**~~ ANSWERED 11-Oct: "It is fine" (half crates, half bales stays). Plus a new
   task: an alternative state of this truck's model with an open door, so players can tell which truck drops
   items (on `CHECKLIST-11-Oct.md`). (Was: With tyres gone it sheds crates and bales half and half (it was half crates,
   a quarter bales, a quarter tyres). The tyre was the light one, so shed cargo hurts a little more on
   average. Lean it back toward crates (two crates to one bale)? Left alone: half and half.
4. ~~**Brakes on ice and burst mains.**~~ ANSWERED 11-Oct ("This is fine"): as built. (Was: You asked for weaker brakes and weaker lane changes. The brakes were
   already at 35% (20 m dry against 57 m on ice from 30 to 10 m/s), so only the lane change was changed
   (0.47 s dry, 1.02 s on ice; it was 0.67 s). Weaker brakes still? One number each in `config.js`.
5. **Moving things on the batch E levels.** Toy Box Derby and Seaquake keep their drifting crates (to become
   each theme's own obstacle), and the four older second levels keep their cows, frogs, portaloos, moving
   asteroids and runners, as written before your rule. Left alone: they stay. Say if any should go.

5a. **Stunt Double's parade.** On the new backlot level the parade fills all four lanes of a one-way road; the
   shoulders (with cash on them at 2230 and 2320) are the only way past. Does that count as an imposed stop?
   Picture sent. Left alone: it stays.
5b. **The washboard's look.** It draws as brown wooden planks on every theme, the sea-bed tube and the Moon
   included. Give it a look per theme (buckled plates, rippled dust)? Left alone: planks everywhere.
5c. **The volcano's rock** is too dark for its black road; the obstacles agent is giving that theme a lava
   boulder with glowing cracks in its place. Say if the plain rock should stay.

5h. **Mountain Pass's clock.** Re-laid, its clean run is 112 s where the old road's was 142 s: not because of
   the road (5.4 s quicker) but because the old layout's ice cost a driver who does not steer 25 s and the
   new one's costs nothing. Written now: 195 / 155 (your 205 / 160 less the road's difference). The tool's
   own figure would be 165 / 125, 40 s tighter, on a level with more ice and rockfall than before. Which?
5i. **Suburbia's clock** reads 35 / 25 s for a 3200 m level (the tool says 100 / 65). It looks like a
   mistake in the level file. Set it to the tool's figure?

5j. **Stop / go roadworks impose a wait on the safe line.** Seen plainly on Market Town: the player's GO is
   9 s of every 28. The fast lines are running the STOP (no bust, but oncoming traffic in your lane; a 20
   is inside the works) or the shoulder past the queue; the way that never stops is the side road round,
   which has wrong-way drivers. By your rule ("stops the game imposes have zero counterplay") is that
   enough counterplay, or should stop / go change everywhere (a longer GO, or a queue that keeps rolling)?
   It is one of the kinds on Market Town, Mountain Pass and Quarry Run.
5k. **Tranquility Base's crest** has a barrier in one lane just beyond the top; a cone on the way up is its
   only warning. A bigger marker, or move the barrier? Also there: flying that crest at 130 km/h costs 30
   health on landing even in a clear lane (as it was before today).
ANSWERED 11-Oct: 15 (good for later), 16 (drop it: clean the worktree, drop the stash), 17 (deferred, investigate
whether the origin's game commits can be dropped), 18 (leave for the rebalance), 19 (drop all but the tram fix),
20 (no need), 21 (yes, bumped up). See `CHECKLIST-11-Oct.md`, section I. Only 12 and 5l remain open.

ANSWERED 11-Oct: 9 (works fine); 10 (current order, 1-5, 6-10 per tier); 13 (calculate tip money for a
rushed playthrough: task H2); 14 (Blue 1 opens after level 5 of 5 star; levels easy to rearrange amongst
tiers, special levels may go in: task H4). Still open: 12 and 15 to 21. See `CHECKLIST-11-Oct.md`, section H.

ANSWERED 11-Oct: 6 (small pictures on a phone), 7 (remove the finish-line milestone sound): section G,
tasks G8 and G9 of `CHECKLIST-11-Oct.md`. 8 ("Looks good to me"): the sea bed tube and the drawbridge stay
as in the pictures sent.

ANSWERED 11-Oct, last: 12 (half a ribbon on every stage of the blue tier), 5l (fog by theme stays as built),
41 (one file per kind, named consistently), 44 (extra middle carriage), 32 (ideas: yes), 5c (not pressing).
No questions are open. See `CHECKLIST-11-Oct.md`, section J.

ANSWERED 11-Oct for 5c2 (traffic by the level's tier at the rebalance; stats held), 5c3, 5d, 5e (low bridges
get an update), 5f, 5g (no car exceeds a lane, ever): see `CHECKLIST-11-Oct.md`, section G.

ANSWERED 11-Oct for 5 to 5k (details in `CHECKLIST-11-Oct.md`, section G): 5 thematic larger obstacles; 5a
too extreme, bad placement; 5b thematic washboard, slows and shakes steering at all speeds; 5c needs an
image; 5h later sweep; 5i left, not rebalancing; 5j fine; 5k signs before crests, Moon airtime to be looked
into.

5l. **STILL OPEN, answer unclear:** the owner wrote "No. Green frogs are fine." Which fog shades should
    change, and is the frog level's green the one to keep? (Orchestrator's reading: the first guesses are
    not fine, the green stays.) **Fog's colour by theme:** the shades are first guesses (night dark blue-grey, the volcano red-brown, the
   sea bed blue silt). Fine? One number or a colour per theme changes them.

## Cars

5c2. **Delivery: what is being wrecked? (BLOCKS the merge of the two new stats.)** A thrown package only ever
    hits TRAFFIC, and a traffic vehicle's health is fixed by its kind (commuter 45, van 90, bus 180, semi
    320); it does not rise with the level or the player's tier. So a Delivery stat that rises by tier makes
    a higher-tier car wreck traffic MORE easily (a semi: 13 packages at tier 1, 9 at tier 5), the opposite
    of "it should still be harder to wreck higher tier cars overall". Choose: (a) traffic gets tougher on
    later levels or tiers, by more than Delivery rises, so packages-to-wreck climbs gently (this is the
    rebalance); (b) Delivery stays flat across tiers for now, with only the small spread by body (vans up,
    two-seaters down), until that rebalance; (c) merge as built and accept easier wrecking at high tiers
    meanwhile. Pick: (b). Also to say: should Delivery scale a Good package's small damage (it does not
    now); should the earned six-star cars sit one step above tier 5 (they do now) or at 1.
5c3. **Nerve as built:** band 0.8 to 1.3 by the car's character (Tow Truck 1.3, EV Saloon 1.25, Post Van and
    Taxi 1.2 ... Hot Rod 0.8), on a 3 s allowance, cap 8 s. Fine as first values?

5d. **The Blue 4 cars' first figures** (not play-tested; inside the rule "under tier 5's gold best"):
    Stainless Gullwing 42.5 m/s, accel 12, health 330, $920; Rear-Engine Coupe 44.5, 15.5, 175, $960; Snake
    Roadster 45, 17, 140, $1000; Polygon Truck 44, 14, 290, mass 2.3, agility 0.9, $1060. Change any?
    (The Gullwing has more health than the truck, following "the sturdy one".)
5e. **The Double Decker's height** as an idea car is its real 4.38 m (the City Bus is 3.1 m): a crosswind
    gust drifts it twice as far as the tallest garage car and a low bridge costs it about 90 of its 330
    health. Keep the real height, or cap it?
5f. **The smallest idea cars** (Bubble Car, Three-Wheeler) have hitboxes smaller than the Mini's. Keep?
5g. **The Monster Truck** is drawn and measured at 0.87 of its real size (2.7 m wide, not 3.1 m) to fit a
    lane; the lot says so. Fine?

## Menu, HUD and pictures

6. **Large level pictures on a phone.** The menu takes the large picture whenever the stage draws it more
   than 15% wider than the small one, counting pixel density, so a dense phone gets the large one too
   (250 to 400 KB each, one at a time). Always the small one on a phone? Pick: leave as it is.
7. **The milestone sound at the finish.** Milestones say nothing during a run now. One crossed at the moment
   a run ends (levels delivered, km driven) still plays its sound over the results jingle. Remove it too?
8. **The sea bed tube and the drawbridge, after their fixes.** The tube's glass is very faint, so it reads
   from its frame: heavier or closer ribs? The raised drawbridge's lip (the jump's edge) is visible but not
   bold: make it bolder? Left alone: both stay as in the pictures sent.
9. **To try by hand, on the live site** (not a question; no still can cover these): (a) on a real phone, the
   menu and then a run, since the menu now holds one more WebGL context for good; (b) a level with police
   or an ambulance in traffic (their light-bar code was moved); (c) open and close "What's on this road" a
   few times, then start a run; (d) scroll the Gimmicks page on a phone to see the models no longer trail.

## The level progression rework (parked; these are what it needs before it is built)

10. **Which level goes in which tier.** Ten tiers of five is fifty places; there are 43 numbered levels, with
    more second levels being written. Which go where, and what fills the gaps? Or shall an agent propose a
    table for you to approve?
11. ~~Blue 4's cars.~~ ANSWERED ("Approved"): Rear-Engine Coupe, Snake Roadster, Stainless Gullwing, Polygon
    Truck. Being built as real Blue 4 garage cars on `delivery-idea-cars`.
12. **What opens an amphibious level.** Recorded: A1 to A5 are tied one each to star levels 1 to 5 and each
    needs that star's amphibious car, so all five must be bought. Does A3, say, open as soon as the 3-star
    amphibious car is owned, or only once the gold 3 tier has been reached as well?
13. **Tips against the next tier's car.** The player must buy a car of each tier. Must a tier's tips be made
    to cover the next tier's cheapest car (the rebalance), or may a player have to replay for money?
14. **Assumptions written down for you to overrule:** the races stay on their own tab outside the tiers;
    cars with no tier (the Tank, the bus, earned cars, amphibious cars, the idea cars) cannot start a level
    whose ribbon half is not yet earned; "beating" a level means delivered on time; beating gold 5's last
    level replaces "after level 20" for opening the Blue season; medals are kept beside ribbons; medals
    count only within their own tier.

## The code audit (`AUDIT-10-Oct.md`)

15. **What to start, and does any of it jump the queue.** Not assigned: the performance findings (draw calls
    the largest; scenery never freed the cheapest; what loads before the first run), the code-quality
    findings, the bloat plan (about 1,600 lines, 500 KB of late-loadable source, 16 MB unused in the repo),
    and three open correctness ones (C7 drop bears and the migration placed by dice at load; C8 milestone
    counters counting on no-save runs; C9 spray and wakes emitted per frame, twice for boats). Pick: scenery
    never freed and the draw calls first.

## Housekeeping

16. **The `delivery-batch` worktree and the old stash.** From yesterday: that worktree has a stash applied on
    top of it by accident (its branch is merged, nothing is lost) and the stash itself still exists (old
    duplicate work you said to discard). Clean the worktree and drop the stash? Nobody has touched either.

## Carried over from before the break (see `SCRATCHPAD-10-Oct.md`)

17. **A repo of its own for the game.** Investigated, nothing changed: a second Worker for the game, the
    site's Worker forwarding `/delivery/*` to it. Go ahead, or leave it?
18. **Clocks.** `level-clocks.mjs --all` puts 40 of 65 written clocks more than 5 s from its own figure
    (Suburbia is written 35 / 25 against 100 / 65). Re-time them all, or leave it for the rebalance?
19. **Gimmicks deferred or doubted.** The climbing lane and the hairpin cut need engine work. The tram lane
    is close to what the railway median already does, and the fork with a choice is what a side road with a
    reason to take it already is: still wanted as gimmicks of their own?
20. **A link to the game from the site.** Nothing on the site links to `/delivery/`. Where should one go?
21. **More cargo.** Twenty more ideas (C41 to C60, the "malicious deliveries") are drafted in the checklist
    and not built. Build them?

## Asked 11-Oct, late

22. **What do players get for earning both medals on a level?** As built, nothing beyond the unlock counts and the per-side bronze, silver or gold grade. Options: a one-time tip bonus scaled to the tier (orchestrator pick, stays inside the existing systems); a cosmetic mark on the plate and card and a tier-complete mark; a cosmetic unlock (a livery or trail) for a whole tier; a cargo collection page or special Evil cargo state. Left alone: no reward.

## Asked 12-Oct

23. **SUPERSEDED 12-Oct: the owner asked to raise the low end ("The lower end of obstacles do little damage"); barrier 34, rail barrier 33, cow 36 are now above their old values.** **Q19 damage numbers.** Merged (`delivery-damage`): exploding-obstacle damage = 10 + 6.5 x sqrt(volume), machinery up (bulldozer, excavator, dump truck 70; roller 42; forklift 33), but the formula also LOWERS a few: barrier 30 to 22, rail barrier 30 to 21, cow 30 to 25, kangaroo 25 to 21; and raises piles 15 to 33, umbrellas 15 to 37, sewage 10 to 23. Keep as is, or hold the barrier, rail barrier and animals at their old values? (Machine heights are estimates.)
24. **Q9 "move all blasts into the blasting gimmick".** Built as a card change only: the gimmick page's "Quarries and blasts" card is now two cards, Quarries and Blasts. Did you mean a real data/mechanics move (one `blasting` gimmick key for the airport blasts and Quarry Run's Blast)? That is a separate, riskier job.
25. **SUPERSEDED by 28 (12-Oct: the owner wants the game on a subdomain in a repo of its own; option (a), the history reset, is skipped).** **Drop the game's history from the origin (I2).** Investigated (`INVESTIGATION-drop-game-history-12-Oct.md`): feasible. 690 commits, 641 from the game on, about 30 MB of game history; recommended: bundle backup, then reset main to `f4b17c6` (last pre-game commit, 4-Oct) and force-push, which redeploys the pre-game site and removes /delivery/ from the live site at once; the site work bundled in `f81d5c9` is restorable with `git checkout f81d5c9 -- <files>`; or option (c), the game in its own repo with history first. 71 local branches and 44 worktrees would be orphaned. Not checked: GitHub protections, forks, Cloudflare build settings, live D1. The owner decides; nothing is done.
26. **CLOSED 12-Oct (owner: "Yes, supercharger = turbo").** **Q5 "Supercharger should increase the car's top speed around bends proportionally".** Built (`delivery-gimmicklogic`, `aa6e4a8`, held unmerged) reading "supercharger" as the Turbo pickup: the bend speed limit scales by the same share as the top-speed boost. Is the Turbo pickup what you meant?
27. **CLOSED 12-Oct (owner: "For the funeral procession, yes": the Jerk overrides a running mystery).** **Q13 funeral procession Jerk.** Built (`98c5225`): crashing a funeral procession starts Jerk for 10 s, but if another mystery effect is already running the Jerk does NOT override it (only the mourners' fury applies). Should the Jerk override a running mystery?
28. **The game on its own subdomain (plan: `PLAN-delivery-subdomain-12-Oct.md`).** Feasible, no outage, no force-push; the game is static (no /api, D1, R2). Choose: A) `delivery.<domain>` as a Worker custom domain, or B) free `delivery.<account>.workers.dev`. The owner's own steps: create an empty GitHub repo `delivery-racer`; Cloudflare > Workers & Pages > Import a repository (build `npm run build`, deploy `npx wrangler deploy`, name `delivery`); Worker > Domains & Routes > Add custom domain; verify; then OK the site push with the redirect. Saves (localStorage `delivery_racer_progress_backup`, a cookie, editor keys) do NOT carry to a new origin: the old /delivery/ hands them over in the URL hash (copy, not move), plus an Export/Import button, and export your own save first. Option (a), the history reset, is skipped. Nothing is done; say go to start the repo split.
29. **CLOSED 12-Oct (owner: "Remove the above": all listed placements to be removed, with the sweep agent).** **Q21 doubtful cases** (`AUDIT-gimmick-theme-12-Oct.md`; 24 clearly un-thematic placements already removed: burst mains 17 to 13, potholes 22 to 19, tunnels 19 to 18, crosswinds 12 to 10). Left for you: burst mains on park, ponti, venice, morro, leaks; potholes on ponti, venice, leaks; the toys tunnel. Remove them too, or keep?
30. **Q15 low bridges: the design as built (merged, bars not yet seen rendered).** Each low bridge is now two bars, one over each half of the player's side, 60 m apart (a slalom), 100 health plus 40 a metre too tall; tall traffic goes through at no cost; the side road is still the way round. Is that what you meant by "placed on both sides (not at the same level, so players can slalom around them)": first bar one lane wide, second a lane plus shoulder? Q18 and Q19 numbers are in `delivery-damage`'s commits (sports car cannot one-shot a commuter; buses, semis and tanks still wreck weak cars; smallest solid obstacle about 30 health): do they feel right once played?
