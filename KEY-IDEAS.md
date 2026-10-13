# Ordinary car keys and fobs to model later (13-Oct): a shortlist, nothing modelled or rendered yet

The owner: "Let's model some extra 'normal' looking keys and fobs. Find interesting examples of real car keys. Don't render them yet,
we have not found a home for them." So this is a shortlist of real designs with what makes each one a good SILHOUETTE at card size
(about 100 px), a note on how it would be built in render/keyModels.js (the nine we have: fob, classic, smart, fin, wheel, solar,
lunar, snowboot, bun), and where it might live. Written from memory, not looked up: check the details before modelling. No real brand
marks: initials or generic emblems, as the current keys do (and never a manufacturer's logo).

## The shortlist (distinct silhouettes, so they read apart as small pictures)
| # | Real key | Why it is interesting | How it would be built | Fits |
|---|---|---|---|---|
| 1 | **1950s-70s round-head blade key** (Chevrolet / Ford / VW Beetle style: a plain round or oval bow, a stamped brass blade, a small plastic head cover) | the "key" everyone draws: the safest recognisable silhouette | a disc/oval bow + flat double-edged blade, one coloured plastic wrap | any plain/period car |
| 2 | **Bakelite wing-head key** (1930s-50s: a wide moulded head with wings and a small chrome crest) | very period, chunky, deco | wide wing-shaped bow in a moulded colour, brass shank | a vintage car (Blower Tourer, Swan-like) |
| 3 | **Switchblade / flip key** (2000s: a key blade that folds out of a remote body with 2-3 buttons) | the most common modern key | a rounded-rect remote + a pivoting blade (animate the flip) | modern hatch / saloon (City EV, Hot Hatch) |
| 4 | **Rubber-boot fob with a plastic hexagon** (utility 4x4: a chunky grip-rubber shell, a big button) | rugged, glove-friendly | a fat rounded box, ribbed rubber, a lanyard loop | off-road/work trucks (Safari, Lifted Truck, Unimog-like) |
| 5 | **Waterproof wristband "activity key"** (SUV makers: a wearable band with a sealed transponder, no blade) | looks nothing like a key: a funny, memorable card | a ring band + a small puck | adventurous SUVs (Coupe Crossover, Game-Drive Truck) |
| 6 | **Car-shaped fob** (an electric saloon's key: a miniature of the car itself, glossy, buttons hidden in the roof and boot) | the key IS the car; unmistakable | a tiny body extrusion like the real car's profile + tail lamp strip | EVs (EV Saloon, City EV, Hypercar) |
| 7 | **Credit-card key** (1990s hatch/MPV: a flat card with a button strip, slotted in the dash) and its modern cousin, the NFC key card | the odd one: flat, not a "key" shape | a thin rounded card, a stripe, a notch | quirky MPVs (Minivan, Family Wagon) |
| 8 | **Display key** (a large fob with a colour screen and rounded glass, showing range/lock state) | techy and distinct | a slab with a glowing screen face, chrome edge | luxury saloons (Goddess, Stately) |
| 9 | **Glass "crystal" ignition key** (a luxury GT's key: a polished glass-and-steel oval pressed into a dash slot) | a sculpture, not a blade; a lovely transparent material | a glass oval bow + steel rim, no blade (a push-in tab) | grand tourers (Classic GT, Gullwing) |
| 10 | **Carbon-fibre supercar fob** (a woven black shell, one gold or coloured accent, a vivid start icon) | the supercar look | black twill bow, a metallic accent strip | supercars (Wedge, Midnight, Horseshoe) |
| 11 | **Stealth-wedge fob** (a faceted, angular key that looks like a fighter jet or a folded-paper wedge) | angular, aggressive, very different silhouette | a low-poly faceted extrusion, a hex ring hole | wedge/angular cars |
| 12 | **Leaping-animal head key** (a cat, horse, lion or bull figure forming the key head) | an emblem as the bow | a small animal-silhouette bow (generic: a big cat or a horse), blade | sporty classics (Pony Car, Snake Roadster) |
| 13 | **Retro push-button / round fob with a start button** (a circle with one big red button, sports-car "start" fob) | a bold simple read: a red dot | a disc with a red button, a ring | sports cars (Sportscar, Rotary) |
| 14 | **Wooden or leather-wrapped key** (an artisan fob: walnut or leather panels) | warm, "old money" | a box with a wood-grain panel and stitched edge | Woody Wagon, Stately Saloon |
| 15 | **Fob on a chain with a tag** (a mechanic's tag: a key on a metal ring with a paper/plastic tag) | the "second-hand car lot" look | a small key + ring + hanging tag (the Car lot's keys!) | the car lot (Crazey Jim's) |
| 16 | **Foil-keyed kei key** (a very small, slim key with a coloured cap: the micro-car key) | tiny and cute | a thin wafer + a bright cap | Kei cars, Bubble Car, Tuk-Tuk |

## Where they could live (the owner has not decided; options)
- **Garage-car keys in the car lot**: today buying a car is the "key"; the lot (Crazey Jim's) could show an ordinary key on a tag for each car (#15 + the type that fits the car), giving the shop tiles and "Purchase this car" a key picture.
- **A colour/skin for the Bespoke keys**: no: the nine are unique by design; ordinary keys are for the OTHER cars.
- **Blueprint cars' unlock moment**: when a blueprint car unlocks (its first X blueprints), show its ordinary key spinning in.
- **The showroom's "In use" badge or the garage list**: a small key icon per car, drawn from this set.
- **A rack of keys screen (a collection page)**: every key the player has, on a hook board (the album/milestones style): the nine Bespoke keys plus the ordinary ones as a collection to fill.

## When we model them
Each is about 10 to 20 meshes and under 1,500 triangles (like the new keys); register by name in keyModels.js, pre-render PNGs with scripts/keys-png.mjs, and give each car a `keyModel`. Pick which cars first once a home is chosen.
