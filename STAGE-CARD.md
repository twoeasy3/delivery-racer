# The end-of-stage card (CHECKLIST 472; branch `claude/stage-card`, a DRAFT for the owner to look at)

The owner, 17-Oct: "Lets make a nicer end of stage card that suits the rest of the UI. 'Next Level' is not very relevant any
more. 'Look Around' is not useful." Then: "replays do not work in hidden levels".

## What the card is now

`render/stagecard.js` + `stagecard.css`, the menu's look (Good gold / Evil red accent, the condensed italic capitals, the event
cards' panels, START's slanted primary). Drawn when the card comes up, from the run and from the three lines game.js writes
(game.js is in the replays' rules fingerprint, so its words are read, not changed: as render/bank.js already did).

- Head: side pill (GOOD / EVIL), the level's name, the outcome in a word or two (DELIVERED, TOO LATE, OUT OF TIME, BUSTED; a
  rival's place under it; REPLAY pill on a playback).
- Tiles. Delivered: Spare (NEW BEST, or Best x), Earned (counted up, CSS only), Medal, Bank. Failed: Distance % (or Tip left of
  $n when late), Wrecks, Busts, Bank.
- Rewards as small cards (the event cards' prize-card look): car earned, event reward, stage n of m, grand prize, key, tasks,
  each pack. Anything else game.js adds shows as a plain "Reward" card, so nothing is lost.
- Details fold: tip / cash / fines, wrecks / busts on a delivery, "test run" on a hidden level, a playback's date.
- 390x844: one column, tiles 2 x 2. 844x390: two columns (head + tiles | rewards + buttons). Desktop: one column, tiles 4 across.
  The run's HUD and touch pads are hidden while it is up.

## The buttons, and why

| Case | Primary | Other | Under |
|---|---|---|---|
| Delivered | **Continue** | Retry | Watch, Save |
| Failed (late, out of time, busted) | **Retry** | Menu | Watch, Save |
| A playback (or a playback stopped short) | **Menu** | (Retry hidden) | Watch again |

- **Continue** = back to the menu. After a Career (or race) level delivered it lands the menu on what is next there, if that is
  open (the tiers' order, as Next level used): the menu is the hub (events, packs, the showroom, the new-player nudges) and the
  next step is one tap more (START) rather than a forced start. An event's stage, a hidden level: the menu on that level.
- **Retry** after a fail: the obvious next action. After a delivery it stays (medal / best chasing) but is not primary.
- Watch / Save replay: kept (the Replays gate still hides them for a new player), smaller, under.
- **Enter** presses the primary (it used to always restart). Before: Enter = Restart everywhere.
- The Better ride nudge (`?nudge`) now sits in the card; its button says "<car> ready" (Continue lands on the level it is for).

## Removed

- "Next level" (`#nextBtn`): the button, its handler and display logic (render/menu.js), its CSS, its featuregates entry.
  `Game.nextLevel` is left in game.js (a rules file: changing it moves the replay fingerprint); nothing calls it now.
- "Look around" (`#lookBtn`) AND the orbit camera after a finished run (render/orbit.js `over` mode, body.after-run, the Orbit
  button kept on the results, "Results" on its panel): it was used only there. The orbit camera in a replay that is playing is
  untouched.

## Replays on hidden levels (the owner's add-on)

Cause: `replay.js` recorded only runs on the menu's levels and the events' stages (`begin()`: `LEVELS.includes(LEVEL) ||
STAGE_LEVELS.includes(LEVEL)`), its level prints (`LEVEL_PRINTS`) held only those, and `play()` looked the level up only there.
So a hidden level's run was never recorded and the card never offered Watch / Save. Fixed in replay.js: the hidden levels
(`HIDDEN_LEVELS`, not the editor's `?edited` level) are recorded, printed and played back. replay.js is on the fingerprint's
NOT_RULES list: the logic fingerprint stays `057a22806d` (legacy `661de07fbe`), checked before and after.

## Open questions for the owner

1. Continue after a Career delivery lands the menu on the NEXT level (not started). Or should it stay on the level just played?
2. Enter now presses the primary (Continue after a delivery). Keep Enter = Retry for keyboard players?
3. Should a delivery's card show the next objective by name (e.g. "Next: Back Roads" on Continue, or the event's next stage)?
