# New player: audit and ideas (16-Oct)

The owner (16-Oct): "enhance the new user experience ... push the new player to the correct decisions. Let's have a true
tutorial level. The commuter is extremely weak and only good for the first level. We should push the new player into the
Junker for Level 1-2 and Darkvan for Level 1-3."

"Level 1-2" and "Level 1-3" are the menu's ★ 2 and ★ 3: **Back Roads** (`back-roads`) and **Farm Lanes** (`farm`), the second
and third levels of the gold one-star tier (the menu labels them `T1-2`, `T1-3`; the stage says "★ 2/5"). Level 1 is Expressway.

Built on branch `claude/new-player` (not merged): the **Driving Lesson** (`?hidden=tutorial`) and the **Better ride nudge**
(`?nudge`). Both are described at the end.

## 1. Audit: what a brand-new save meets

Walked in code and in stills (`scripts/shots.mjs`, phone 390x844; a temporary save-writing page for the after-level states).

**The front screen** (fresh save): Career tab, ★ tier, Expressway picked (★ 1/5), its description ("A short straight run ... to
learn the ropes"), clock 1:50, tip $50, "No medal on Good yet: only ★ cars may be driven ...", the strip (levels 1 and 2 open,
3 to 5 locked), the Commuter, GOOD / EVIL, START. The EVENTS tab carries a green dot (Christmas Eve and the Comet Hunt are on):
the first thing that glows is not the career. Nothing explains lanes, boost, time pluses, the shoulder or Good vs Evil except
Options > "How to play", a paragraph of ten lines.

**Level 1 results**: "Delivered! Tip $50.00", one long line (spare, side, wrecked, busted, "Bank $50"), then six buttons with
**Restart** the big yellow one and Next level second. Nothing says the bank now buys a car.

**The car**: the menu's car card opens the **Showroom**, 109 cards. After level 1 the first eight cards a new player sees are
blueprint cars he cannot get (Boxy Supermini, Bubble Car, Farm Tractor, Kei Van, Milk Float, Tuk-Tuk, Wedge Microcar, "0/5
BLUEPRINTS"); the **Junker ($30) is the 9th card and the Darkvan ($80) the 11th**, below the fold on a phone. Buying is at
"Crazey Jim's" (the lot), a second screen. In the lot itself the Junker and Darkvan sit beside the Commuter with a "for sale"
diamond, which is clear, but nothing says which one to buy.

**Cash flow** (tips from the level files; cash pickups banked with the tip; a row of pickups is one pickup to a player):

| After | Tip | Cash possible (best of each row) | Bank (tip only) | Bank (half the cash) |
|---|---|---|---|---|
| ★1 Expressway | $50 | $70 (5 rows) | $50 | about $85 |
| ★2 Back Roads | $40 | $90 (7 rows) | $90 | about $175 |
| ★3 Farm Lanes | $70 | $70 (5 rows) | $160 | about $280 |

So the Junker ($30) is affordable after level 1 on the tip alone. The Darkvan ($80) after level 2 needs $20 of cash if the
Junker was bought (50 + 40 - 30 = 60), none if it was not. Level 3 opens with two medals in the tier (levels 1 and 2 on Good, or
one level on both sides). Card packs: the first Career pack comes at the fifth first delivery; one-star cars are ECU 1 of 1 (no
upgrades), so the ECU, blueprints and packs mean nothing to a new player in tier 1 yet, but the showroom shows them first.

**The three cars** (cars.js, the same at their only ECU; ecus.json for delivery/composure):

| | Commuter | Junker | Darkvan |
|---|---|---|---|
| Price | free | $30 | $80 |
| **Top speed** | 24 m/s (86 km/h) | **25 m/s (90 km/h)** | 24 m/s (86 km/h) |
| Acceleration | **10** | 9.5 | 8.5 |
| Health | 85 | 100 | **150** |
| Crossing (rails) | 0.6 | **0.7** | 0.65 |
| Delivery | 1 | 0.75 | **1.35** |
| Composure | 1.3 | 1.3 | 1.35 |
| Hitbox (half w x half l) | **0.85 x 1.85 m** (smallest) | 1.0 x 2.5 | 1.05 x 2.45 |

Measured (headless, `scripts/zprobe-newplayer.mjs`, untracked): a clean flat-out run (no traffic) and six seeded runs with the
traffic on, driven by a simple autopilot (keeps to its side, changes lane round obstacles and cars, brakes when boxed in):

| Level | Car | Clean run | Autopilot: on time | Wrecks | Lowest health |
|---|---|---|---|---|---|
| Expressway (clock 110) | Commuter | 74.4 s | 5/6 | 1 | wrecked |
| | Junker | 71.6 s | 6/6 | 0 | 32% |
| | Darkvan | 74.6 s | 6/6 | 0 | 49% |
| Back Roads (clock 115) | Commuter | 76.2 s | 6/6 | 1 | wrecked |
| | Junker | 73.3 s | 6/6 | 0 | 60% |
| | Darkvan | 76.4 s | 6/6 | 0 | 45% |
| Farm Lanes (clock 105) | Commuter | 70.7 s | 0/6 | 5 | |
| | Junker | 68.0 s | 0/6 | 6 | |
| | Darkvan | 70.9 s | 0/6 | **1** | |

(Farm Lanes beat the autopilot in every car: it brakes behind tractors on the one-lane farm road where a person would
overtake; read the wrecks, not the times.)

**Findings**
1. The Commuter is **not slow**: it is weak in HEALTH only (85, the lowest), and it has the best acceleration and the smallest
   hitbox. The Junker is only 1 m/s faster (+4%, about 3 s over 2 km). The Commuter's real weakness is that it wrecks.
2. **The Darkvan is no faster than the Commuter and slower than the Junker.** Pushing a player from the Junker into the
   Darkvan for Farm Lanes trades top speed (the game's most important stat) for health (+50%) and delivery. On Farm Lanes
   (cows, tractors) that is the right trade in the numbers above (1 wreck in six against 5 and 6), but a nudge must say
   "tougher", never "faster". (The nudge built here only ever shows the stats the ride is better at: for the Darkvan, Health.)
3. Nothing steers a new player to a car: the showroom buries the two cars he can buy under eight he cannot.
4. The results screen pushes Restart, not Next level, and never says what the bank can do.
5. There is no teaching of the controls in play: everything is in Options > How to play. Good vs Evil is a toggle with no
   explanation on the front screen.
6. A live event glows on the EVENTS tab of a brand-new save: a likely first detour into levels not meant for a ★ car.

Where a new player goes wrong, most likely: stays in the Commuter (nothing asks him to change); taps the car card and sees
"0/5 BLUEPRINTS" walls; presses Restart; plays Evil without knowing what it changes; drives the shoulder until busted; does
not know the time plus or the boost pad; goes to EVENTS first.

## 2. Ideas (20), grouped

Cost: **data** (level/words files only), **render** (UI only: the replays' rules do not move), **UI** (screens, flow),
**logic** (moves the replays' rules fingerprint, `vite.config.js` logicFiles). Rating out of 5.

### Car nudges
1. **Better ride card on the results** (BUILT, `?nudge`): after ★1 "Better ride for Back Roads: Junker", bars for what it does
   better (Top speed 86 > 90, Health 85 > 100), one button: Buy the Junker · $30 / Use the Junker / "$n more: replay for tips".
   After ★2, the Darkvan for Farm Lanes (Health 100 > 150). Bought = put in use, so Next level drives it. Why: the decision is
   offered at the moment the money arrives, one tap. Cost render. Risk low. **5/5.**
2. **"Better ride" tag and focus in the showroom and the lot** (BUILT, `?nudge`): with Back Roads or Farm Lanes picked, the
   showroom scrolls to the ride and tags its card; the lot looks at it. Cost render. Risk low (the tag is drawn over the
   showroom's own card). **4/5.**
3. **Owned-and-buyable first in the showroom for a ★ save**: while no tier above ★ is open, sort the cars the player can buy or
   drive now ahead of blueprint cars (or default to the READY filter). Why: removes the "0/5 BLUEPRINTS" wall. Cost UI
   (showroom sort). Risk: changes the showroom for everyone in tier 1. **5/5.**
4. **Next-level car line on the menu stage**: under the level's clock and tip, a short line "Best ride: Junker" with the car's
   head-on picture when the car in use is the Commuter. Cost render. Risk low. **3/5.**
5. **A free try (loan) of the Junker on Back Roads, once**: the level lends it, as the Concept Strike lends its day's car
   (`Tiers.lent` hook); after a delivery in it, "Keep it for $30". Cost logic (the lent car is driven in a run). Risk medium.
   **4/5**: the strongest "feel the difference" nudge.
6. **Auto-select after purchase** (BUILT inside idea 1; the lot already does it since CHECKLIST 54). **4/5.**
7. **HARD LOCK (owner's call, NOT built)**: Back Roads asks for the Junker or better, Farm Lanes for the Darkvan, as a level's
   own `allowedCars`. Why not: a lock with no money is a dead end (the bank after ★1 can be $50 with a $30 car, fine; after ★2
   it can be $60 with an $80 car: stuck, replays needed). If wanted, pair it with idea 9. **2/5.**

### Economy and cash gating
8. **Back Roads' tip $40 > $60** (data; the level's own fingerprint moves, so its saved replays): 50 + 60 - 30 = $80, the
   Darkvan **exactly** affordable after ★2 with the Junker bought and no cash at all. Today Back Roads pays less than
   Expressway, which reads as a bug. **5/5.**
9. **First-delivery bonus = the next ride's price**: the first Good delivery of ★1 pays a "starter bonus" of $30 (the Junker),
   of ★2 the rest of the Darkvan. Cost logic (the bank on finish). Risk: inflates the early bank. **3/5.**
10. **Commuter trade-in**: buying the Junker or Darkvan while in the Commuter takes $10 off ("trade in your Commuter", the
    Commuter is kept). Cost UI + bank. Risk low. **2/5.**

### Level design and sequencing
11. **Back Roads made for the Junker**: a stretch where the extra 1 m/s and the extra 15 health pay (a long straight with a
    time plus at its end, or two narrow gaps between traffic and barriers where the Commuter takes a knock it cannot afford).
    Cost data. **3/5.**
12. **Farm Lanes made for the Darkvan, honestly**: it is already the right car there by health (cows and tractors). Say so on
    the level's road card / description ("a tough van shrugs off the cows"). Cost data (words). **4/5.**
13. **Expressway with fewer hard hits**: the Commuter wrecked once in six autopilot runs on level 1: the very first level
    should never wreck a careful player. Thin its obstacles to one lane at a time, as the lesson does. Cost data. **3/5.**

### Teaching by play
14. **The Driving Lesson** (BUILT, `?hidden=tutorial`): see section 3. **5/5.**
15. **The lesson as the first START** of a brand-new save (no level delivered, no cars bought): START plays the lesson (Skip
    in the corner), then the menu with Expressway picked. Cost UI (main menu). Risk: an old player who resets his save sees it
    again (Skip). **4/5.**

### UI prompts and cards
16. **Next level first on the results** when delivered: Next level the big yellow button, Restart second. Cost render (CSS
    order). **5/5.**
17. **Bank line "Bank $85 · Junker $30 ready"** on the results when a ★ car is affordable and not owned, with idea 1 off.
    Cost render. **3/5.**
18. **Good / Evil in one line on the front screen**, under the toggle, for a save with fewer than three medals: "Good: gifts
    make friends. Evil: fire makes enemies." (wording for the owner). Cost render. **3/5.**

### Rewards
19. **The lesson's diploma**: delivering the Driving Lesson for the first time gives $30 (the Junker's price) and a postcard.
    Cost logic (the lesson would bank, today it banks nothing). **3/5.**

### Safety nets
20. **Never stuck**: on a ★ level whose car rule the player cannot meet because of money (a lock) or keeps failing (three
    failures in a row), the results offer "Try it in the Junker, free, this run". Cost logic (a lent car). **3/5.**
21. **Hide the EVENTS dot until two career medals**: the green dot only once the player has played the career a little.
    Cost render. **3/5.**

**Top 5 recommended**: 1 (results card), 3 (showroom: buyable first), 8 (Back Roads tip $60), 16 (Next level first),
14 + 15 (the lesson, as the first START).

## 3. The Driving Lesson (built)

`?hidden=tutorial` (also Options > Hidden levels). Theme `suburb` (lawns, a park, the high street), a straight 2 km road,
two lanes each way, eight zones, each one lesson; its prompt is shown LARGE (render/lessoncue.js: a dark pill low in the
middle, "3/8" over the line) for the first 200 m of the zone, by where the car is, not by a timer:

| # | Zone | From | Prompt | What is on the road |
|---|---|---|---|---|
| 1 | tutSteer | 0 | Steer: grab the cash | three rows of two, the $20 note swapping lanes each time |
| 2 | tutSpeed | 300 | Hold the gas: top speed wins | an empty straight, one cash row |
| 3 | tutBoost | 540 | Boost pad: drive over it | two boost pads (left lane, then right), a turbo |
| 4 | tutClock | 800 | Clock +: more time | two time pluses side by side, a cash row |
| 5 | tutObstacles | 1040 | Obstacles hurt: steer round | three plain obstacles, one lane at a time, 70 m+ apart, cash in the free lane, two wrenches after |
| 6 | tutTraffic | 1340 | Traffic: pass, brake, or the shoulder | the traffic starts here (no police); cash on the right shoulder |
| 7 | tutSides | 1660 | Good gives gifts. Evil throws fire. | a cash row |
| 8 | tutDrop | 1880 | The drop! Nearly there | the finish |

Clock 150 s both sides (a Commuter needs about 85 s flat out); tip $30 shown; banks nothing (a hidden level). No traffic is
dealt before the traffic lesson (a quiet stretch at density 0) BUT the cars put on the road at the start within 250 m stay
(traffic.js keeps them: a quiet stretch only takes off cars out of sight): 1 to 3 cars going the player's way are met before
zone 6. Fixing that is a logic change (traffic.js: deal nothing into a density-0 quiet stretch at the start), not made.

**How it could slot in** (owner's choice; none built):
- A. **First START of a brand-new save plays the lesson** (idea 15), Skip in the corner; then Expressway. Recommended.
- B. A **"Learn" chip** on the front screen beside START for a save with no medal, and in Options always.
- C. A **level 0 of the ★ tier** (`T1-0`, before Expressway): needs tiers.js (a sixth level in tier 1, the rules assume five)
  and INSERTED_AT: the heaviest.
Whether it should bank (idea 19: $30, the Junker) is a separate choice; today it banks nothing.

## 4. The Better ride nudge (built, behind a switch)

`?nudge` for a visit, `?nudge=on` to keep it on in this browser, `?nudge=off` to forget it. Off otherwise: no existing save
sees anything. Render only (render/rides.js, render/ridenudge.js). Shows: the results card (idea 1), the showroom tag and
focus and the lot's focus (idea 2). The rides are a table in render/rides.js: `back-roads` > Junker (over the Commuter),
`farm` > Darkvan (over the Commuter and the Junker). No price, stat or lock changed.

## 5. Proposals that need the owner (numbers)
- Back Roads tip **$40 > $60** (idea 8).
- If the Darkvan is to be THE car for ★3: its top speed **24 > 25 m/s** (equal to the Junker; still below every ★★ car's
  26+ but the Love Bus's 24), keeping its acceleration 8.5. Otherwise the nudge keeps saying "tougher", not "faster".
- If the Commuter should be weaker still: health **85 > 75** (it already wrecks most); its top speed left alone.
- A hard lock on ★2 / ★3 (idea 7) only with idea 8 or 20.
