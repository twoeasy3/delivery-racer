# Blueprints, ECUs, card packs, the showroom and the car lot (the owner's design, 12-Oct)

Built from CHECKLIST item 115 (read it too: it keeps every answer the owner gave, in order). This file is the spec the
build follows. "Decided" = the owner said so. "Default" = chosen by the build to get it working tonight; all the numbers
live in data files so they can be tuned by hand.

## Words
- SHOWROOM: the new UI-based menu where cars are selected (replaces the garage as the place you pick a car).
- CAR LOT: the current garage, kept as the place to BUY the current cars, rebranded "Crazey Jim's Used Cars". (RETIRED as the shop, CHECKLIST 451, 17-Oct: cars are bought in the showroom; the lot is the Garage under Options. See DEPRECATE-JIM.md.)
- ECU: a car's upgrade level. ECU0 = locked / not driveable.
- KEY car: starts at ECU1; blueprints upgrade it; not selectable until the key is obtained. Garage (car lot) cars are key
  cars (the key = buying it; an earned/won car's key = winning it). A locked key car CAN be upgraded (blueprints count before the key).
- BLUEPRINT car: starts at ECU0 (locked); the first X blueprints unlock it (it then plays at ECU1).
- Tooltips on a car that can't be driven yet: key car without its key: "You need the key to drive this car"; a car lot car not bought: "Purchase this car from the car lot".
- Races are a SEPARATE GAME: ECUs, blueprints, packs, the new stats do not apply to them (they keep `CONFIG.race`, 4.5 s respawn).

## ECU ladder by star tier (decided)
Max ECU of a car, and the rarity of its blueprint card:
| tier | max ECU | card |
|---|---|---|
| 1 gold | 1 | none (never upgraded; starter cars, come maxed) |
| 2 gold | 2 | common |
| 3 gold | 3 | common |
| 4 gold | 4 | common |
| 5 gold | 5 | uncommon |
| 1 blue | 3 | uncommon |
| 2 blue | 4 | uncommon |
| 3 blue | 5 | uncommon |
| 4 blue | 5 | epic |
| 5 blue | 5 | epic |
A 1 gold BLUEPRINT car (a filler like the Bubble Car) is the exception to "no cards": it must be obtainable, so its card is common and its max is ECU1 (X blueprints unlock it, nothing above). "No cards" means only the garage's own 1-star key cars (the starters).
Special cars (today's magenta 6-star `EARNED_CARS`): capped at ECU1, no blueprints. Event cars (magenta tier of their own,
`EVENT_CARS`, e.g. Silver Comet) stay on the ladder (they have blueprints; featured cards; at max ECU they outperform any garage car).
Starter cars (what a new save begins with) come maxed. "Evergreen" cars (the filler, the blueprint-only roster cars) are the pack filler.

## Stats (decided + defaults)
- A car's CURRENT figures are its MAXED ECU (decided). Lower ECUs are weaker. No rule any more that a lower tier is worse than a higher one: remove the tier ceilings in `scripts/.balance-check.mjs` (decided: removed, not rewritten).
- Each car's ECU stats are SAVED SEPARATELY, one entry per ECU, in a data file (default `src/delivery/ecus.json`, keyed by car id), not computed at run time. Stats per ECU: `maxSpeed`, `accel`, `health`, `respawn`.
- The STARTING POINT is derived now by EQUAL STEPS from the maxed figures (the owner: "we will just use equal steps to derive their starting point now"): ECU k of N = max * (1 - f * (N - k)). Default f = 0.06 per ECU step for blueprint cars; car lot cars gain LESS per ECU (decided): default f = 0.03. A script (`scripts/ecu-tables.mjs`) writes the file from the cars so the numbers can then be edited by hand; the file is the truth after that.
- THE ECU BUDGET (the owner, 12-Oct: "We can budget more stats per ECU step, especially for Blueprint and Key cars"; "the stat difference between an ECU1 and ECU5 is too small"; "Keep the 25% limit for Top Speed only"; CHECKLIST 171), SUPERSEDING the single f above. The maxed figures do not move; per stat, ECU1 = max x (1 - f x (N - 1)), held to a floor, then equal steps up to the max. f per ECU step, by kind and stat (knobs: `ecu.js` STEPS, TOP_SPEED_CAP, FLOORS; written by `scripts/ecu-tables.mjs --write`):
  | f per step | top speed | agility | accel, health, delivery, composure, crossing |
  |---|---|---|---|
  | blueprint, event, Bespoke cars | 0.045 | 0.08 | 0.10 |
  | car lot cars | 0.03 | 0.04 | 0.05 |
  So a 5-ECU blueprint/key car's ECU1 is 82% of its max top speed, 68% of its agility, 60% of the rest (max is +22%, +47%, +67% over ECU1); a 5-ECU car lot car's 88% / 84% / 80%; shorter ladders proportionally less (a 2-ECU car's one step: 4.5 / 8 / 10% for blueprint cars, 3 / 4 / 5% for lot cars). TOP SPEED CAP (the owner): max top speed <= 1.25 x ECU1's, whatever the knobs. FLOORS: no ECU1 below health 80 and accel 7 (the weakest maxed car lot figures: a fresh car is never feebler than the weakest car one can buy), agility 0.5, composure CONFIG.composureFloor 0.6 (below it the meter does not change). A floor above a car's max: flat (the Sportscompact's and Kei Roadster's health 80, the Love Bus's accel 7). A higher ECU is never worse in any stat. Respawn and weight unchanged. A hand edit to one car survives `--write` only with `--keep <id,...>`.
- COMPOSURE AT THE MAX BY STARS (the owner, 12-Oct: "upping the Composure at max of the lower tier cars (1 and 2 stars) as they take longer to overtake"; CHECKLIST 171): the table `ecu.js` COMPOSURE (a car's own `composure` in cars.js would win over it; none has one): a BASE by stars, every 1-star car 1.3 (a 3.9 s shoulder meter), every 2-star car 1.15 (3.45 s), of any star colour (gold, blue, sea green), car lot or blueprint; 3 stars and up, Key and special cars 1 (3 s). Why: the meter drains 1 s a second on the shoulder; traffic cruises at 9-18 m/s (CONFIG.trafficMin/MaxSpeed), so a 1-star car (23-25.5 m/s) closes on it at about 6-15 m/s and needs 2-4 s of shoulder to get past a car or two, where a 3-star car (32-40) closes at 14-30 m/s and needs about a second.
- COMPOSURE BUMPS (the owner, 12-Oct: "bump the max up for some other vehicles in each tier, to differentiate the cars slightly"; CHECKLIST 171): `ecu.js` COMPOSURE.bump adds 0.05 to 0.2 to the base for about a third of each tier, where it fits the car (heavy, tough, calm, stately, working or emergency vehicles, tourers); from 3 stars up at least +0.1 (3 s becomes 3.3 to 3.6 s); never above 1.5; nobody below their base (the sports and racing cars stay on it). 1 star: Milk Float 1.45, Post Van 1.4, Darkvan 1.35. 2 stars: Love Bus 1.35, Family Wagon 1.25, Lifted Truck 1.25, Woody Wagon 1.2. 3: Hearse 1.2, Fire Engine 1.15, Tow Truck 1.15, Minivan 1.1. 4: Stately Saloon 1.2, Taxi 1.15, Goddess Saloon 1.1, SUV 1.1. 5: 6x6 1.2, Full-Size 1.15, Classic GT 1.1, EV Saloon 1.1. No stars: Swan Car 1.2, Snowcat 1.15, Hot Dog Car 1.1, the Tank 1.2, the Road 8x8 (earned-apc) 1.2.
- RESPAWN TIME (decided): a new car stat. ECU1 5.5 s, 0.5 s less per ECU above 1 (ECU2 5.0, 3 4.5, 4 4.0, 5 3.5). A higher ECU ALWAYS respawns faster. Races keep their own. `CONFIG.respawnTime` stays the fallback for race/anything without a table. The respawn shield stays shared (default).
- Replays: record the car's ECU level (and with it the stats the run used, default: the ECU level in the header, played back at that ECU; ecus.json is in the replay `logic` hash through its import so editing it refuses old replays: the "keep the tables in the hash" option). Ghosts only need the path; unchanged.

## Blueprints (defaults)
- A blueprint card = 1 blueprint of one car. `Progress.data.blueprints = { [carId]: count }`. X = blueprints per ECU step: default 5 (per car, in `ecus.json` as `x`, tunable). Blueprint car: ECU1 at X, ECU2 at 2X ... up to its max. Key car: starts at ECU1 (key owned) and climbs one ECU per X blueprints; blueprints before the key still count.
- A card for a car already at max ECU: the duplicate is converted (default: kept as a count, shown as "maxed", no further effect).

## Card packs (decided unless marked default)
- Rarities: common, uncommon, epic, legendary, bespoke (highest). Bespoke cards = the keys themselves.
- BESPOKE KEY CARS (the owner, 12-Oct; CHECKLIST 122): a car flagged `bespoke: true` (the Silver Comet, and cars.js BESPOKE_CARS) has a Bespoke key card and Legendary blueprint cards. The Bespoke pool is exactly those cars whose key the player does not own (the car lot's cars are no longer key cards). Their blueprints drop in the kinds with `bespokeBlueprints: true` (standard, 10-pack) and as a special pack's featured card; never in a career pack. Where each car's key and blueprints come from: `carsources.js` (the showroom's "Where to get it").
- Common (the bulk of a pack): blueprints for 1-4 star garage cars... but 1 gold has no cards: so 2-4 gold. Uncommon (in every pack): 5 gold and 1-3 blue. Epic: 4-5 blue, and a select few evergreen blueprint-only cars. Legendary: blueprint cars only. Bespoke: keys.
- A 10-pack has at least one Epic or better. A standard pack = a few cards (default 5; "10-pack" = 10).
- CAREER packs (first completion of some Career levels): evergreen cars only (the pack filler). SPECIAL packs = a career pack plus the featured-cards mechanic: every special pack has at least one featured card (usually event cars); every slot holds exactly one card; each non-last slot may UPGRADE (default chance 25%); when a slot upgrades each featured card rolls its own 20%; a slot that upgrades but hits no featured card becomes a higher-rarity filler card; the LAST slot is guaranteed a featured card: "Guaranteed featured card" (the owner, 12-Oct, superseding the earlier Epic-or-better promise: a featured card keeps its TRUE rarity, a featured Uncommon is Uncommon).
- FEATURED WEIGHTS (the owner, 12-Oct; CHECKLIST 150): a featured list entry is a car id (weight 1) or `{ car, weight, amount, key }`. The last slot is picked BY WEIGHT (weight / sum); an upgraded slot rolls each entry's own 20% and picks among the hits by weight. `amount` (x3, x15...) is the blueprints the card gives, so one car may be several entries (the Comet Hunt: x3 at weight 9, x15 at weight 1); `key: true` is the car's Bespoke KEY card (a key once a pack, never one owned). In the featured slots only, an entry the player has EXHAUSTED (its car at max ECU: "Car Maxed"; its key owned: "Key obtained") is out and the others' weights shift; every one exhausted: blueprint entries come back at their declared weights (duplicates), a key never. The regular slots may still give a maxed car's blueprint. A special pack whose featured entries are all exhausted cannot be BOUGHT (given by an event, it still is). The "What's inside" sheet shows each entry's weight, amount, last-slot share and chance a pack (exact), and the exhausted overlay.
- ONE DEFINITION PER PACK (the owner, 12-Oct; CHECKLIST 159; PACK-DEFINITIONS-DRAFT.md, BUILT): packs.json `packs` holds each pack
  by id (`standard`, `ten`, `career`, `daily`, `comet-special`): its rules, its featured entries and its `event`, what gives it
  (`givenBy: { career: { every, levels }, event: { stage, prize } }`), and its Shop offer (`shop: { section, price, was, ribbon,
  limits: { total, daily } }`); `bundles` are a pack x a count at a price; the Shop's words are GENERATED from the rules
  (packs.js describePack / describeBundle; a `blurb` overrides). shop.json is the currency only; events.json names nothing about
  packs. PURCHASE LIMITS: total (ever) and daily (the player's local day, reset at local midnight; counters in the save,
  `packBuys`; a bundle counts each pack). A FREE DAILY PACK (`daily`: price 0, one a day, a 'Claim' button). Balance: the 10-pack
  210 (was 260), three 10-packs 560 (was 630), Standard 100.
- Where packs come from: Career levels (first completion; default: a pack on every 5th level of the main list, set in a data file), special event stages/prize, all through the same `Packs.grant(id)` API (each pack's `givenBy` says which). Blueprints' economy for BUYING packs is a separate economy and UNDECIDED: do not build a shop; a pack is given, not sold. (A debug route `?pack=<pack id>`, e.g. `?pack=comet-special`, may open one; the old `?pack=special` still opens the Comet Hunt's.)

## Filler (evergreen) cars: promote these Idea cars into the main roster (decided: do it; the owner's plan list)
Filler are 'evergreen' (`evergreen: true` on the car). Tier 1: Bubble Car, Milk Float, Tuk-Tuk. Tier 2: Woody Wagon, Panda Coupe, Kei Roadster. Tier 3: Fire Engine, Field Scout,
Monster Truck. Tier 4: Stately Saloon, Teardrop Streamliner, Pony Car. Tier 5: Midnight Coupe, Split-Window Coupe, Wedge
Supercar. Epic evergreen: Jet Land-Speed Car, Slingshot Dragster, Flying Car. They are BLUEPRINT cars (start at ECU0 locked,
get them from packs). Each needs a `cars.js` entry (stats, tier; see the note in ideas.js), its model moved from
`IDEA_MODELS` to `MODELS` (or still resolved through the same lookup), and a tooltip. Their figures are placeholders; the build
may nudge them to the tier's range but is not asked to balance.
