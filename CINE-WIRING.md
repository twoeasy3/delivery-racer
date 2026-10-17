# The cutscenes in the game (CHECKLIST 438)

The unlock cinematics (render/unlockcine.js, render/ecucine.js, render/keypose.js; CHECKLIST 237, 238, 242) used to play
only by address (URL-PARAMS.md 7b). They now play from the game itself. Branch
`claude/cine-wire`, from main 9687d66 (v1.1.151-alpha), NOT merged. No version bump.

## What plays when

| Event | Cutscene | Where it is caught |
|---|---|---|
| A car bought (CHECKLIST 440: the showroom's Buy, the Garage's Buy, the results' Better ride; after the sheet where there is one) | `jim` (Crazey Jim's sale) | render/carbuy.js `buyCar()` calls `purchased(car)` once `Progress.buy` saved it; the showroom, render/garage.js and render/ridenudge.js all call `buyCar` |
| A car bought from the results' "Better ride" card | `jim` | render/ridenudge.js, after `Progress.buy` |
| An ECU bought (the showroom's Upgrade button) | `ecu` at the new level; `ecumax` when it is the car's last (instead of, never as well as, `ecu`) | render/ecuupgrade.js `upMoment` (with the livery on show), and ecu.js `Ecu.buy`'s existing `ecuchange` event for any other buyer (the same event is queued once) |
| A KEY car becoming owned (a pack's key card, an event / prize, a concept car's key won at max ECU, anything) | `key` (the fob version for the six bladeless keys, as the cinematic already chooses) | the WATCH (below) |
| Any other car becoming owned (a blueprint car reaching ECU1 from a pack or Jim's blueprint stall, an earned car's par beaten, an event / tier / prize car, the secret bus) | `car` | the WATCH |

THE WATCH (render/cinequeue.js `look`): what is owned (`Progress.owns` over the whole roster) compared with what was owned
before. It looks after every `progresschange`, `packschange`, `carchange` and once a second off a run. So any way of giving a
car, today's or a later one, plays its cutscene with no hook of its own; no logic file was changed. A car bought on the lot is
marked as seen at once, so it plays the sale only, never a plain `car` as well. A key car's key plays `key` only (the key unlock
already ends on the car with KEY UNLOCKED).

Not a cutscene: Jim's blueprint stall's purchases themselves (they buy blueprints, not a car; only a blueprint car's FIRST ECU
reached by them plays `car`); blueprints reaching a further ECU (the ECU is the bank's purchase, CHECKLIST 14-Oct).

## The rules as built

- Each plays once per event (`jim:<car>`, `ecu:<car>:<level>`, `key:<car>`, ... once a visit).
- Only from a result already saved: the purchase / upgrade / award is in the stored save before the cutscene element exists
  (the check reads the stored save at that moment). Closing the app mid-cutscene loses nothing.
- Only over the menu and its screens (garage, showroom, Shop) or a run's results. Never during a run or its loading, never over a
  pack being revealed or a dialog: it waits, then plays. A run started some other way closes it.
- One at a time, in order (a queue). A pack held waits for the queue (render/packs.js `canShow` asks `pending()`), so a pack's
  unlocks play when its reveal is closed, before the next pack opens; when the queue empties, `Packs.revealNow()`.
- Tap / Esc / Space / Enter skip to the held end; a tap closes it (unlockcine.js, unchanged). While one is up no other key reaches
  the screen under it (Enter would start a run).
- Returns to the screen that was there (the overlay is fixed over it; nothing under it is closed or redrawn).

## The setting

Options > Settings: `Cutscenes: On / Short / Off` (a tap cycles). Default On. Short opens each at its held end (no sound, one
tap closes it). Off plays none. Stored in `localStorage['delivery_cutscenes']` (this device only, not the save, not progress.js).

The fade-only (lite) version plays automatically with any `?lite=`, reduced motion (as before), or a low-end device
(`navigator.hardwareConcurrency <= 2` or `navigator.deviceMemory <= 2`); `?cinelite` forces it.

## Failsafe and headless

- No WebGL (`playUnlock` returns null), a failed load of the cinematic's chunk: closed at once, the next one plays.
- A play not at its held end 12 s after its first frame (or a load not begun within 12 s): closed, the game goes on.
- Headless (`navigator.webdriver`: the checks, scripts/shots.mjs): none plays (so no check's taps are caught) unless the address
  has `?cineplay`; each is logged in `window.__cine.log` either way. `?nocine`: none plays.
- More than 10 cars new at once (Unlock everything, a save brought in): none plays. A test visit (`Progress.noSave`) plays none
  for cars it lends; a purchase or ECU bought in one still plays.

## Code

- `src/delivery/render/cinequeue.js` (new): the queue, the watch, the setting, the failsafe. Statically imported (main.js,
  render/packs.js, render/garage.js, render/ridenudge.js, render/ecuupgrade.js); it imports only modules the first load already has.
- `src/delivery/render/unlockcine.js`: `playUnlock` takes `lite`, `short`, `onClose` (nothing else changed). Still loaded only by
  a dynamic import (its own chunk, 48.3 kB, 19.7 kB gz).
- `src/delivery/render/ecuupgrade.js`: `playUpgrade` queues instead of playing.
- `delivery/index.html`: the `#cineBtn` setting.
- `scripts/.cine-wire-check.mjs` (render group).

Cost: the initial load (delivery/index.html's scripts, preloads and stylesheet, gzip -9) 1,175,469 B -> 1,177,310 B, +1,841 B
(+0.16%). The replay rules fingerprint 33a0394c26 (legacy dd565f56b3) before and after.

## Open questions

1. A key car: only the `key` cutscene plays (not `car` too). Right?
2. Jim's blueprint stall: no sale cutscene (it sells blueprints); its blueprints reaching a blueprint car's first ECU play `car`. Should a stall buy play the `jim` lot scene instead?
3. The results' "Better ride" Buy plays the `jim` sale over the results. Wanted there?
4. The typed secret bus plays `car`. Keep, or keep it secret and silent?
5. At the results, cutscenes (an earned car, an event prize) go BEFORE the packs the run gave; a pack's own unlocks after its reveal. Is that the order wanted?
6. "Low-end" is guessed from 2 cores / 2 GB. The owner's tablet may not count as low-end by that; a fourth setting value ('Lite') may be clearer.
7. Once per event is per visit: after Reset progress, the same purchase in the same visit does not play again.
8. More than 10 new cars at once plays none: a very large pack could cross that.
9. The sale's end card says "Paid $80.00" (cents) and every panel's words are the cinematics' own (unchanged); terse enough?
10. Reduced motion used to skip the ECU cinematic entirely; it now plays the fade-only version (as the unlocks always did).
11. The garage's / showroom's own 3D view keeps drawing under the cutscene (a second WebGL context for its length); not measured on the tablet.
