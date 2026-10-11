# Plan: shorten and simplify the Beginner levels (12-Oct)

The owner's words: "Shorten Beginner levels and simplify them".

**Reading of "Beginner levels":** tier 1 of `tiers.json`, the five levels a new player meets first and the only
ones open at the start: 1 Expressway (`expressway`), 2 Back Roads (`back-roads`), 3 Farm Lanes (`farm`),
4 Big Business (`big-business`), 5 Hurricane (`hurricane`). Tier 2 (Night Drive on) is left alone.

Rules kept: ids, names, menu order and `tiers.json` unchanged; content stays at fixed positions; one new idea per
level; the theme's own plain obstacles; many cash pickups in rows of two or more side by side; clocks from
`node scripts/level-clocks.mjs <id> --write`.

| # | Level | Length before → after | The one idea kept | Removed |
|---|-------|----------------------|-------------------|---------|
| 1 | Expressway | 3300 → 2000 m | the road itself: plain traffic, barriers, pickups, cash rows | lane closure (narrows), bridge, side road (exit), frogs, ford/underpass |
| 2 | Back Roads | 2700 → 1800 m | one side road (exit) round a jam | lane closure, bridge, frogs, ford, oncoming on the side road |
| 3 | Farm Lanes | 3000 → 2000 m | the farm: cows and tractors on a narrow lane, bales | ruts, frog, second narrowing, two of four tractors, one of three herds |
| 4 | Big Business | 4700 → 2400 m | a one-way city with turbos lined up and one exit round the jam | police pursuits, ford/underpass, three of four exits; turbos 29 → 12 |
| 5 | Hurricane | 4800 → 2400 m | the beach in a storm: drifting beach junk, cars in the air (a sight) | crosswind, truck spray, wreck/sign/barrier drifters; obstacles 107 → ~36 |

Each level: scenery/zones beyond the new length dropped, items beyond it removed, pickups thinned, cash rows
added (two or three abreast), clocks rewritten with the tool. `levelText.json` descriptions corrected only
where they named a gimmick that has gone (Expressway, Back Roads, Big Business, Hurricane).

Checks: `node scripts/delivery-levels-check.mjs`, `node scripts/.replay-check.mjs <ids>`,
`node scripts/.ideas-check.mjs --quick` (drives the first level). Stills with `scripts/shots.mjs` at start,
middle and end of each level. No smoke test.
