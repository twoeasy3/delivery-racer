# Delivery Racer: handover for the `worktree-delivery-batch` branch

Written on 2026-10-09 when the agent working this branch was stopped mid-task. The branch lives in the
worktree `.claude/worktrees/delivery-batch` (its `node_modules` is a junction to the main checkout's:
`rmdir` the link, never delete it recursively). Another agent was working on `main` at the same time, so
expect a merge. Nothing here has been seen in a browser: every check was headless (the game logic loaded
through Vite, as `scripts/delivery-smoke.mjs` does). The smoke test was not run.

## The brief

A long list from the owner: five themed levels (themes first, so they are reusable), a dozen gimmicks,
seven new mystery effects plus "souped-up" super cars, visible damage, a horn per car, a 6-star tier,
postcards and a milestones wall. Commit every two items. Barebones versions first.

## Done (four commits on this branch)

1. **Themes and levels** (`themes.js`, `render/road.js`, `render/movers.js`, `render/storm.js`):
   `hongkong` (harbour with the Star Ferry, junks and trams in the median), `tokyo` (elevated road on
   piers: `elevated: m` works for any theme), `mumbai` (rain: `rain: true` works for any theme), `christmas`
   (suburb scenery with `festive: true`; `snow: true` works for any theme; a sleigh among the storm's
   flyers). Levels 27-31: Hong Kong Harbour, Tokyo Expressway, Mumbai Monsoon, Stelvio Pass (snow theme,
   hairpins, rockfall), Christmas Eve. `progress.js` INSERTED_AT extended so old saves open the right levels.
   New traffic kinds: `keitruck`, `postvan`, `rickshaw` (new model), `float`, `cargotruck`, `icecream`.
2. **Tunnels** (`tunnels: [{from,to}]`): `Track.tunnel(s)`, `render/tunnel.js`, headlights on inside,
   fog closes in, engine echo via a delay bus (`Sound.echo`).
   **Burst water mains** (`waterMains`): `watermains.js` + `render/watermains.js`; slick patches through
   `Track.slicks`, which `Track.icy` consults. **Herds** with `stay: true` never leave the road.
3. **Parades** (`parades`), **roadblocks** (`roadblocks`), **falling cargo** (traffic kind `cargotruck`,
   obstacle pool in `collision.js`, `Traffic.shed`). All in `traffic.js` `placeFixed` / `update`.
4. **Ice-cream stops** (`iceCreamStops`), **reversible lanes** (`reversible`, signs in
   `render/reversible.js`), **convoys** (`convoys`), **rubbernecking** everywhere (`Traffic.noteWreck`
   from `collision.js`; evil drivers take the shoulder and are arrested if police see).

Level fields are all documented at the top of `levels.js`; tuning in `config.js` (`tunnel`, `waterMain`,
`parade`, `roadblock`, `cargo`, `iceCream`, `reversible`, `convoy`, `rubberneck`). Gimmick Road (hidden)
also got a parade, cargo trucks, water mains and a tunnel.

## Not done

Updated 2026-10-10. The rest of the brief was built on `main` that day (see "Done since" below), ported
from a second, uncommitted implementation of this brief (the `delivery-city-levels` work, kept as a stash);
its own versions of the levels and gimmicks above were discarded on the owner's word. What is left:

- **Nothing built on 2026-10-10 has been seen or heard in a browser.** Most wanted by eye: the Super
  cars' body kit (`addSuperKit` ray-casts each part onto the model, so every model needs a look:
  `?car=super-<id>`), the dents on each model, the blackout, the earthquake's bob, the giant, pulled
  pickups, the two panels (`?album&unlock`, `?milestones&unlock`), the garage with 6-star cars in it. By
  ear: the 42 horns' pitches.
- Rough edges known: the rooftop passenger sits too high on a giant car; the Super cars and the 6-star
  cars have no menu pictures (`carshots/`); a rewind does not put back a level's own machinery (trains,
  hazards, the tide: only the player, the traffic still on the road, obstacles, pickups and the clock);
  a traffic freeze stops traffic, obstacles and `Hazards`, not the other gimmick modules (hippos,
  elephants, level crossings, the tide); the 6-star pars are a quarter of the Good clock and a fifth of
  the Evil one, not play-tested; "hippos survived" and "trains dodged" are counted by code no check drove.
- Traffic's own honks are as before (`HORNS` in `traffic.js`, three sample names); only the player's
  horn is per car.
- The Gimmicks page got its cards for the new gimmicks on 2026-10-10 (the menus branch).
- Level clocks for the five new levels were set by hand; `node scripts/level-clocks.mjs hong-kong tokyo
  mumbai stelvio christmas --write` should redo them.
- Pictures for the menu: `levelshots/<id>.jpg` for the five levels (`?cine`).

## Done since (2026-10-10, on `main`)

| What | Where | Commit |
|---|---|---|
| Eight mystery effects: earthquake, rewind, giant, swap sides, magnet, blackout, traffic freeze, souped up. All in `CONFIG.mystery.effects`; one that does not suit the level or car becomes `CONFIG.mystery.fallback` | `mysteries.js`, `render/mysteries.js`, `Player.startMystery` | `e05ed11` |
| Super cars: every tiered car but the Lowrider, lent by "souped up" or `?car=super-<id>` | `superOf`, `SUPER_LIVERIES` in `cars.js`; `CONFIG.superCar`; `addSuperKit` in `render/carExtras.js` | `e05ed11` |
| 6-star tier: nine cars, one earned on each special level by its par on every side it is played on. Kept out of `CARS`; within `NEXT_TIER_CAPS`; nothing new saved | `EARNED_CARS` in `cars.js`, `Progress.earned` | `37eb71c` |
| Visible damage: the player's car crumples in three steps and its paint darkens; traffic's paint darkens | `render/dents.js`, `CONFIG.dents` | `fda617c` |
| A horn per car, for the player's horn (H) | `HORNS` in `render/audio.js`, `horn.js` | `e9ebe12` |
| Postcards album (`?album`) | `render/album.js` | `e8ccc6c` |
| Milestones wall (`?milestones`): eight counters in the save's `stats` | `milestones.js`, `render/milestones.js`, `Progress.count`, `CONFIG.milestones` | `8c0d76e` |

Checks written for them, each a few seconds, none needing a browser: `node scripts/.mysteries-check.mjs`,
`.earned-check.mjs`, `.dents-check.mjs`, `.milestones-check.mjs`, and `.bundle-check.mjs` (every import of
every page resolves: the one check that covers the render files, which cannot be loaded headless).

## Verified headless

Every level builds with no problems reported. Water mains cycle their slicks; the tunnel depth ramps;
floats and band step off; the roadblock stands; loads come off the truck; the ice-cream van waits 14 s and
goes; the reversed lane flips and oncoming cars come down it; a convoy holds together. A scratch script did
this (not committed): load levels through Vite's `ssrLoadModule`, `Game.start()`, set `Player.s`, run
`Game.update` for N seconds, print `Track.problems` and traffic tags.
