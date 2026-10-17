# The end-of-stage card (CHECKLIST 472; branch `claude/stage-card`, a DRAFT for the owner to look at)

The owner, 17-Oct: "Lets make a nicer end of stage card that suits the rest of the UI. 'Next Level' is not very relevant any
more. 'Look Around' is not useful." Then: "replays do not work in hidden levels".

## What the card is now (after the owner's "nothing verbose", 17-Oct)

`render/stagecard.js` + `stagecard.css`, the menu's look (Good gold / Evil red: the side is the card's colour).

- The outcome word: DELIVERED, TOO LATE, OUT OF TIME, BUSTED (REPLAY on a playback). No level name, no side label, no sentences.
- Three tiles. Delivered: Spare, Earned (counted up, CSS only), Bank. Failed: Distance % (Tip when late), Wrecks, Busts.
- ONLY when the run gave something new, a small card each (a few words): New best, Medal (better than the side's before),
  Unlocked <level>, Car, Reward, Prize, Stage n of m, Key, Tasks, Pack. Nothing new: no card at all. (What was so before the run
  is noted as Game.start begins; the rest is read from game.js's own line, game.js being a replay rules file.)
- No Details fold (it held only explanatory lines), no hints, no rival line.
- 390x844 and desktop: one column; 844x390: two columns. The HUD and touch pads hidden while it is up.
- Not detected yet: a cosmetic earned by the run (no card for it).

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
