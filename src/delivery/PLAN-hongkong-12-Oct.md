# Plan: finish level 27, Hong Kong Harbour (`delivery-rework-b`)

## The owner's wording

- CHECKLIST-11-Oct B2: "`delivery-rework-b` (Hong Kong, level 27): 'the level file re-laid; no scenery.' Not done:
  the scenery (nothing written: no `sets` on the theme, nothing in `extras.js`, no `zones` on the level); the
  mirrored FRESH TAR board (...fix it in the board's code...); the menu picture; the full checks; the commit that
  drops 'WIP'." (The FRESH TAR board is the sweep agent's: not touched here.)
- SCRATCHPAD-10-Oct-dropped section 1, the scenery as planned: "sets `neon` / `peak` / `shelter` / `scaffold`: shop
  fronts and vertical neon signs on the city side, the Peak and its tram behind the towers, a typhoon shelter of
  moored junks along the tide's stretch, bamboo scaffolding, a clock tower at each ferry pier. Where each fits:
  towers begin 6 m off the city side and the pavement ends at 3.2 m, so shop fronts and hanging signs fit between
  them with no building removed; ferry piers stand at s 500, 1700 and 2900, where the clock towers go, on the
  promenade; junks along the tide (2260 to 2860) on the sea side, beyond 14 m; the Peak about 330 m off."
- The owner's direction: levels 32 onwards are the models to follow, minus their gimmick cramming.

## The one idea

The harbour front by night: a tram road along Victoria Harbour under the neon, with the city crowding one side
and the water the other, and the harbour itself coming over the low road half way.

## Gimmicks (none added)

The level already has what the place gives it: taxi convoys, four cameras, fresh tar at the roadworks, two
tunnels, and the tide over the low road between them. Roadworks chicanes of cones, signs and barriers, each
leaving the other lane free. Nothing new is crammed in; the trams stay as they are (the owner's Q6 is a separate
question).

## The theme's own plain obstacles (through the mapping at the foot of themes.js)

- `crate` → `hawkerCart`: a hawker's cart, a steel box on two big wheels under a red-white-blue striped awning on
  four poles, a lit red lamp hung from it. About twice a crate's bulk to the eye, lit, in the level's own colours.
- `bale` → `bagStack`: a heap of the red-white-blue nylon bags, three stacked and strapped, bright stripes.
- Cones stay cones: the level uses them as roadworks round the dug-up lanes, where a cone is the right thing.
- Two chicanes get a hawker cart in place of a cone (s 1012, lane 4; s 2902, lane 3) and the last row a bag stack
  (s 3562, lane 3), so the kinds are on the road. Registered as the others are: CONFIG.obstacleKinds (a crate's
  and a bale's costs), collision SIZE, obstacleModels, gimmicks DRESS and JUNK, obstacleText.json.
- No tyres, no shared haybales or beach things. No rockfall (no rock face on this level).

## The scenery (render/themes/extras.js, a `hongkong` entry in THEME_EXTRAS; placed by the level's own data, no zones)

1. **Shop fronts and neon** on the city side between pavement and towers: lit shop windows under awnings along the
   towers' feet, and tall vertical neon signs standing out from the tower faces, 8 to 16 m up, in the theme's neon
   colours, with dark bars for the characters.
2. **The clock towers**: one on the promenade by each ferry pier (s 500, 1700, 2900: the piers movers.js builds),
   pale stone, a lit clock face each side, a green roof; a string of red lanterns across the promenade there.
3. **The typhoon shelter** along the tide's stretch (2260 to 2860), on the sea side beyond the sea wall: a rubble
   breakwater out on the water, and junks and sampans moored inside it in rafts, masts up, a lamp on some.
4. **Bamboo scaffolding** on a tower face at each of the roadworks (over the fresh-tar stretches on the city side,
   and one near the start): a lattice of tan poles with green netting behind, a few floors high.
5. **The Peak** behind the towers on the city side, about 330 m off: a dark ridge standing over the towers, lit
   windows scattered up its slopes, the Peak Tower's bowl on top and a line of lights up to it (the tram).

## Also

- The level's words moved into levelText.json (name, descriptions, cargo canary / genie), where levelText.js reads
  them first (the file still carries the old goldfish / tentacle).
- Menu picture: a CINE entry for `hong-kong` in scripts/shots.mjs and the pair written with `--levels=hong-kong --write`.
- Checks: levels, schema, descriptions, targets, shoulder-items, cargo, obstacles, words, tiers, replay.

Signs before crests: the level has no crests. Signs before the chicanes stand as laid.
