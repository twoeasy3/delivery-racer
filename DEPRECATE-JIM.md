# Jim's Garage deprecated (CHECKLIST 440, branch `claude/jim-deprecate`)

The owner, 17-Oct: "I have made the tough decision that we will deprecate Jim's Garage. The term 'Garage' in the filter
will change to Career. Cars will just be purchaseable in the showroom itself." Then: "move the garage in its entirety into
the settings option".

Read as: "Jim's Garage" is the 3D car lot, `render/garage.js` (its tab and roof sign said "Crazey Jim's", players knew it as
Crazey Jim's Used Cars, the place cars were bought). Its role as the SHOP is retired; the screen itself stays, as the
Garage, under Options. "The filter" is the showroom's Kind filter (showroomData.js FILTER_GROUPS `kind`).

## Removed

- The showroom's two Crazey Jim's buttons (header and full view; `lotButton`, `toLot` in render/showroom.js).
- The showroom full view's "Buy at Crazey Jim's" (which opened the lot): now `BUY $<price>` right there.
- The car card opening the lot when no owned car is allowed on the level (render/menustage.js): it opens the showroom's full
  view on the cheapest allowed car. Same for a level refused for want of a car (render/menu.js Game.onRefused).
- Every user-visible "Crazey Jim's" that meant the lot: the Garage tab and roof sign, the stage's "buy one at Crazey Jim's",
  the car card's 'Crazey Jim's' tag (now 'Showroom'), the overlay's 'At Crazey Jim's' (now 'For sale'), 'Get it: Crazey
  Jim's Used Cars' (now 'Showroom'), the lot's own "buy one in the lot" lines.

## Added / changed

- `render/carbuy.js`: THE purchase path (`buyCar(car, { confirm })`: forSale + bank check, the game's sheet, Progress.buy,
  then `purchased(car)` for the sale cutscene). The showroom, the Garage and the results' Better ride (render/ridenudge.js,
  no sheet) all call it; nothing else in render/ buys a roster car (menu.js's secret bus aside).
- Showroom full view: one button, `BUY $<price>`; greyed with the price when the bank is short; the sheet asks
  ("Buy the X?", Buy $n / Cancel; the old sheet's before/after lines dropped: the terse rule).
- Options > Settings: `Garage` (first in the row). Its Back returns to Options. Everything in it works as before (Switch, Use,
  Buy, Inspect, Car ideas, Sort / Show, Good / Evil, the comparison card).
- Kind chip `garage` shows **Career** (id unchanged); the blueprint card's kind line 'Garage Car' -> 'Career Car'.
- featuregates.js SECTIONS: `#garageBtn` (Options: Garage, always), the lot's rows renamed 'Garage: ...', and the missing
  `#cineBtn` (Cutscenes) added (its check failed on main).

## Stayed

- `render/garage.js` and its whole screen (as the Garage), `?garage` and all its params (`tab`, `look`, `hover`, `inspect`,
  `click`, `sort`, `show`, `studio`).
- Crazey Jim's BLUEPRINT STALL (jimshop.js, render/jimshop.js, the menu's `$` 'Jim' chip, `?jimshop`): a Shop section,
  separate from the lot, so kept as it was.
- The sale cutscene ('jim', render/cinequeue.js -> render/unlockcine.js / ecucine.js) and its "Crazey Jim's Used Cars" branding:
  untouched (claude/cine-fixes is editing those files). It plays on every purchase, the showroom's included.
- SAVES: nothing in the save changes; owned cars, money, purchases load as before (the lot never stored anything of its own).
- The rules files' words: showroomData.js (LOCKED_WORDS.lot, CAR_LOT, the chip's 'Garage' label, overlayOf's 'At Crazey
  Jim's', driveWords' 'Buy at Crazey Jim's'), carsources.js ('Crazey Jim's Used Cars' as the key source) and ecu.js
  (lockedWords 'Purchase this car from the car lot') are in the replay rules fingerprint (scripts/logic-hash.mjs): editing them
  would refuse every replay recorded so far. They are left, and render/showroom.js, render/carsources.js and render/garage.js
  say them differently. The fingerprint is unchanged: 33a0394c26 / dd565f56b3.

## What linked to the Garage (the lot), and where each lands now

| From | Was | Now |
|---|---|---|
| Showroom header button 'Crazey Jim's · Used Cars' | the lot | removed |
| Showroom full view button (top) and 'Buy at Crazey Jim's' | the lot, on that car | removed; Buy in place |
| Menu car card, no car allowed on the level | the lot | showroom full view, cheapest allowed car |
| Start refused (no amphibious / allowed car) | the lot, cheapest | showroom full view, cheapest |
| Results 'Better ride' Buy | Progress.buy direct | buyCar (same code as the showroom), no sheet |
| Ride nudge 'look' when the Garage opens | the ride looked at | unchanged (still wraps Garage.open) |
| Cutscene return target | over the lot | over whatever screen bought it (showroom, Garage, results) |
| Featuregates (progressive unlock) | no gate names the lot; the 'cars' gate points at the car card | unchanged; `#garageBtn` 'always' |
| Packs reveal | never opened the lot | unchanged |
| Tutorial / lessons, messages, words | no line named the lot | unchanged (the Gimmicks guide's "the gamble is made in the garage" (gimmicks.js) and similar 'garage' = 'your cars' wording left: question 7) |
| `?garage...` | the lot | the Garage, same params |
| Options | none | Settings > Garage |

## Open questions for the owner

1. Should the Garage still SELL cars (it does today, through the showroom's code) or only switch between owned ones?
2. Keep the name "Garage" inside Settings, or another (it still shows unowned cars, the Car ideas tab, the comparison)?
3. The sale cutscene still says "Crazey Jim's Used Cars" (and Jim's sign / board): rebrand it once claude/cine-fixes lands?
4. Is the blueprint stall (the `$` Jim chip, a Shop section) also part of "Jim's Garage"? Kept, as read.
5. The Kind chip's id stays `garage`; rename the id (and the data words in showroomData.js / carsources.js / ecu.js) in a
   release that changes logic anyway, so the replay fingerprint moves once?
6. 'Career Car' on the blueprint card's kind line: right word, or 'Car' / nothing?
7. Generic 'the garage' wording elsewhere (the Gimmicks guide, levelSchema help, carText blurbs 'the fastest car in the garage'): leave, or say 'your cars'?
