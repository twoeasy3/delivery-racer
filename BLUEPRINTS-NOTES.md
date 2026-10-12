# Blueprints, ECUs, card packs, the showroom and the car lot (the owner's design, 12-Oct)

Built from CHECKLIST item 115 (read it too: it keeps every answer the owner gave, in order). This file is the spec the
build follows. "Decided" = the owner said so. "Default" = chosen by the build to get it working tonight; all the numbers
live in data files so they can be tuned by hand.

## Words
- SHOWROOM: the new UI-based menu where cars are selected (replaces the garage as the place you pick a car).
- CAR LOT: the current garage, kept as the place to BUY the current cars, rebranded "Crazey Jim's Used Cars".
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
- CAREER packs (first completion of some Career levels): evergreen cars only (the pack filler). SPECIAL packs = a career pack plus the featured-cards mechanic: every special pack has at least one featured card (usually event cars); every slot holds exactly one card; each non-last slot may UPGRADE (default chance 25%); when a slot upgrades each featured card rolls its own 20%; a slot that upgrades but hits no featured card becomes a higher-rarity filler card; the LAST slot is guaranteed a featured card and is also the pack's guaranteed Epic-or-better card.
- Where packs come from: Career levels (first completion; default: a pack on every 5th level of the main list, set in a data file), special event stages/prize, all through the same `Packs.grant(kind)` API. Blueprints' economy for BUYING packs is a separate economy and UNDECIDED: do not build a shop; a pack is given, not sold. (A debug route `?pack=career|special|ten` may open one.)

## Filler (evergreen) cars: promote these Idea cars into the main roster (decided: do it; the owner's plan list)
Filler are 'evergreen' (`evergreen: true` on the car). Tier 1: Bubble Car, Milk Float, Tuk-Tuk. Tier 2: Woody Wagon, Panda Coupe, Kei Roadster. Tier 3: Fire Engine, Field Scout,
Monster Truck. Tier 4: Stately Saloon, Teardrop Streamliner, Pony Car. Tier 5: Midnight Coupe, Split-Window Coupe, Wedge
Supercar. Epic evergreen: Jet Land-Speed Car, Slingshot Dragster, Flying Car. They are BLUEPRINT cars (start at ECU0 locked,
get them from packs). Each needs a `cars.js` entry (stats, tier; see the note in ideas.js), its model moved from
`IDEA_MODELS` to `MODELS` (or still resolved through the same lookup), and a tooltip. Their figures are placeholders; the build
may nudge them to the tier's range but is not asked to balance.
