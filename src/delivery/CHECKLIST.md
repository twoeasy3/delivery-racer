# Delivery Racer: ideas checklist

Working list, from the owner's ideas of 2026-10-09. `[x]` done, `[~]` partly done (see the note),
`[ ]` not started, `[-]` built and then taken out. Each done item says what was and was not verified.

## New gimmicks

- [x] 12. Drawbridge: bells, booms and a gap you either jump or wait at. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. No swing bridge.
- [x] 13. Wide load with escort: blocks two lanes; passing it while the escort watches is a bust. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. Traffic drives through it (as through every obstacle).
- [x] 14. School crossing: a lollipop person stops traffic; running it is a bust. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet. That traffic waits at it was not confirmed.
- [x] 15. Escaped shopping trolleys: rolling across the road with the camber. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 16. Burst water main: a slippery patch only while it is spraying. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [x] 17. Hot-air balloon landing: blocks the road, then takes off again. Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet.
- [x] 18. Road-train jackknife: a scripted trailer swing across the lanes (wreckage of kind `roadtrain`). Logic checked headless (`scripts/.hazards-check.mjs`); seen in a screenshot on Gimmick Road 2 (`?hidden=gimmick-road-2`); not played by hand, and in no real level yet.
- [x] 19. Marathon: runners and a water station in one lane, plus a pace car. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.
- [-] 20. Average-speed cameras: timed between two gantries. **Removed on 2026-10-10 at the owner's request** ("terribly unfun"): logic, gantries, tuning, messages, level field, Gimmicks card and its checks all taken out. The ordinary speed cameras stay.
- [-] 21. Toll plazas: pay to pass, or ram the barrier and risk a bust. **Removed on 2026-10-10 at the owner's request** ("terribly unfun"): logic, plaza and booths, tuning, messages, level field, Gimmicks card and its checks all taken out. `scripts/.hazards-check.mjs` still passes without them; Gimmick Road 2 is bare from 2300 to 3200 m where the two stood.
- [x] 22. Animal stampede on side roads: cows or kangaroos charging down a side road at the player (`stampedes`). Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet. Read as a stampede on the side road, not animals spilling out of it onto the expressway.
- [x] 23. Side-road gimmicks: potholes, crossings and cameras on side roads (`road: 'side'`), and all of the new ones. Logic checked headless (`scripts/.hazards-check.mjs`) on Gimmick Road 2 (`?hidden=gimmick-road-2`); its drawing was not looked at closely; not played by hand, and in no real level yet.

## Vehicles

- [x] 26. More traffic types: ice cream van (jingle), bin lorry (stops often), learner driver (slow, dabs the brakes), boy racer (tailgates), caravan (sways). Checked headless (`scripts/.traffic-quirks-check.mjs`); in the traffic of Suburbs, Market Town, Singapore II, Outback Express and Sydney to Kiama, and Gimmick Road 2. The models were only glimpsed, and the jingle not heard.
- [ ] 28. Liveries: unlockable paint jobs per car, earned for Evil and Good clears

## Modes and systems

- [ ] 29. Daily challenge: a seeded random level with one gimmick mix per day and a leaderboard
- [ ] 30. Time trial with ghost replay
- [ ] 31. Endless mode: a procedurally chained road, getting harder
- [x] 33. Photo mode: while paused, the Photo button (or C) hides everything but the scene and gives a camera to drag round the car, zoom, and a Save picture button (`render/photo.js`; `?photo` opens it for a check). Seen in a screenshot; dragging, zooming and saving were not exercised.

## Garage and menus

- [x] 35. Sort and filter the garage: Sort and Show buttons on the garage's bar (`render/garageview.js`). Sort by stars (as before), price, top speed, acceleration or health; show all, owned, for sale, can afford, and gold or blue stars once the Blue Stars are in. The lot is built again each press; neither choice is saved. Seen in a screenshot sorted by top speed showing owned cars (`?garage&sort=speed&show=owned`); the buttons were not clicked, and an empty lot (nothing to show) was not looked at.
- [x] 36. Car comparison card: with a car other than the one in use tapped in the garage, a card sets the two side by side (top speed, acceleration, health, handling, weight, crossing, price, perk) with the difference in green or red (`render/compare.js`). Seen in a screenshot (`?garage&look=rally`) before it was moved to the bottom left corner; not seen there, nor on a phone, where it sits above the stats.
- [x] 38. Level select: each side's best time and its medal across the foot of the level's picture, and the level's gimmicks named under the words (`levelinfo.js`, `render/levelcards.js`). Bronze is any delivery on time; silver and gold are 45% and 85% of the time to spare a clean run in the reference car leaves (`CONFIG.medals`), my numbers, for the owner to overrule. Seen in a screenshot with a made-up save (`?demo`, which saves nothing). The "Best to spare" line under the picture now says the same thing twice: left in, as `render/menu.js` was being edited on other branches. Not seen on a phone.
- [x] 39. Gimmicks page: wrong-way drivers, quarries and blasts, two-way pelotons, boulders. Three new cards, and the peloton card now shows a bunch each way. Syntax-checked only: the page was not opened. On 2026-10-10 a City streets group was added, eight cards: tunnels, parades, police roadblocks, falling cargo, ice-cream stops, reversible lanes, convoys and rubbernecking (burst water mains had a card already; the toll and average-speed cards went with their gimmicks). The page opens and lists the group (screenshot of its top); the new cards' models were not looked at one by one. The bullet train's card logs a three.js error (`Object3D.add` of undefined) that was there before.

## Fixes and balance

- [x] 40. Blue Star balance pass: top speed, acceleration and health each strictly below the best of the gold tier above. Three were over, all on acceleration: Sleeper Wagon 15 to 14, Rally Car 16 to 14.5, Rotary Coupe 17 to 14.8. `scripts/.balance-check.mjs` checks all fourteen.
- [x] 41. Classic GT vs a future 6-star tier: my decision, for the owner to overrule: the Classic GT stays at 48 m/s, and a six-star gold tier would run 49 to 52 m/s (`NEXT_TIER_CAPS` in `cars.js`: 52 m/s, 24 acceleration, 450 health), still short of the UFO's 58. The tier-5 Blue Stars are checked against those caps.
- [x] 42. Hills with side roads: a side road without flyovers now follows the land (as high as the expressway beside it), so a level can have both; an exit with flyovers still cannot. Tried on Gimmick Road 2, whose side road now climbs a hill: heights join at both ends (checked by numbers and in two screenshots). Rough spot: where the expressway bends away, the side road has a short stretch as steep as 12%. No real level uses it yet.
- [x] 43. The 404 on every level (most likely a missing favicon). Every game page now links `/car-icon.svg` as its icon. Not confirmed in a browser that this was the 404.
- [x] 44. Thumbnail shooting: a `?ghost` test parameter. The car is a ghost all run and cannot be busted. Checked headless (`scripts/delivery-probe.mjs` uses it).
- [x] 45. Wrong-way drivers: a horn, flashing lights and a warning. Warning and horn checked headless on Quarry Run and Ring Road; the flashing headlights and hazards were not seen.
- [x] 46. Grade under the quarry rock face: a hill now rises behind the benches to the top one's height, runs back and falls away, and slopes down past each end of the quarry (`CONFIG.quarry.hill`). Seen in two screenshots of Quarry Run; where two stretches of a quarry with different floors join, the hill has a step, as the benches do.
- [x] 47. Re-run the level clocks (Quarry Run, Tour de Coast). Quarry Run's was already right (215 / 165); Tour de Coast's is now 210 / 160 (was 215 / 165).
- [x] 48. Unify the screenshot scripts into `scripts/shots.mjs`: named shots, `--levels` and `--cars`. Named shots used and working; `--levels` and `--cars` were not run.

## Technical

- [ ] 49. Speed up the full smoke test: levels in parallel workers
- [ ] 50. Lint and format setup, plus a CI workflow running the quick suite on PRs
- [ ] 51. Performance: instance more scenery, lower the draw distance on phones
- [x] 52. Save data. Measured first (`scripts/.save-check.mjs`): a full save's cookie (40 levels on both sides, 33 cars) was 4013 bytes of the 4096 allowed, so three more levels would have lost it. Now local storage is read first and the cookie only if it has nothing; best times are saved to 0.1 s and the bank to the cent, which brings the same save's cookie to 2931 bytes; and the menu has Export save and Import save (`render/savecode.js`), a code of about 2,600 characters that is checked and tidied on the way in. Checked headless: sizes, a code out and back, five bad codes refused. Both panels seen in a screenshot (`?savepanel`, `?savepanel=import`); the Copy and Load buttons were not clicked, and the menu's refresh after an import was not seen.
