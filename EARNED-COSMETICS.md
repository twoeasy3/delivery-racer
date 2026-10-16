# Earned cosmetics: a stock of each, one used per car (CHECKLIST 437, prototype)

Owner, 16-Oct: "Plates will be earned. Cosmetics will be earned and 1 will be consumed when equipped to a vehicle."
Branch `claude/earned-cosmetics` (from `claude/plate-cosmetics`). Not merged, no version bump. Render-only: the replay
fingerprint stays 33a7d9d56d, and progress.js is untouched.

## Model
- Earned slots: plate, roof, cargo, wing, kill FX, underglow (`EARNED_SLOTS` in `render/cosmetics.js`). Each slot's own free
  look (the Stock plate, no prop, the Classic kill effect, no glow) stays free and unlimited. **Wheels (tyre, hub, rim, tread)
  stay free in v1**: they are a three-part, per-axle set, so they need their own rule (open question).
- No cosmetic has a cash price. Nothing read the old placeholder prices; an earned item is now registered with `price: 0`.
- `render/cosmetics.js` stores how many of each item the player has been GIVEN (`delivery.cosmetics.stock`, localStorage).
  `render/cosmeticstock.js` counts how many are WORN from the loadout store. **spare = given - worn.** Nothing is stored
  per equip, so the stock cannot drift away from what the cars wear.
- What counts as worn: every garage car (Progress.owns) whose look has the item, through its own choice or All cars,
  provided it can wear the slot (a Legendary car keeps its gold plates; a prop needs the slot; a glow needs wheels on the
  road). Plus any car outside the garage that the player dressed with its own choice.

## Edge-case decisions
| Case | Rule |
|---|---|
| Swap to another design / take it off / Reset car / Reset to stock | The old one goes back to stock at once, because the counts are derived. |
| The same design on several cars | One each. |
| All cars (the default) | One for each garage car that follows the default and can wear the slot. If the player doesn't have enough, the change is refused and the sheet says how many are needed. |
| Copy to all | Gated the same way: confirmed if it uses items, refused if there aren't enough. |
| A car joins the garage while the default has an earned item | It wears the item anyway. Spare shows 0 (never below), and nothing is taken off another car. (Open question 1.) |
| Selling or destroying a car | No sale exists in the game today. If a car leaves the garage, its item returns automatically. |
| Free Stock or default look | Unlimited, never used up. |
| Kill FX | One used per car it is set on, never per kill. |
| Preview / try-on | Tapping an owned chip puts it on at once (free) and opens a sheet. Equip keeps it; Cancel, Escape, Back or a tap outside puts the whole look back. Locked items (none earned) cannot be tried on yet; tapping one shows how to earn it. |
| "Unlock everything: Absolutely" | Grants all items as before and sets `inf`: every item unlimited (shown as ∞). |
| Migration | First load of this version: each key in the old owned list becomes 1, and each item worn anywhere becomes at least 1, so nothing falls back to Stock even for a frame. Once per browser (`mig`), each worn item is topped up to the number of cars wearing it. An older 'abs' save becomes unlimited. The old list key is still written, so rolling back to an older build keeps its items. |
| Reset progress | Clears the counts and the earn ledger (as before). |
| Test visit (`?car=`, Progress.noSave) | Nothing is written. |

## Earn table (v1, `render/cosmeticearn.js`)
Every reward is read from save state, so it applies retroactively: an old save receives what it has already won. A ledger
records each reward id that has been given, so nothing is given twice.
- **Starter**: the first on-time delivery gives Classic white, Yellow rear and Retro cream plates.
- **Good medal** on each tier level: the next plate design in Plate-tab order. The list wraps, so later levels give second copies.
- **Evil medal** on each tier level: the next "loud" item, taking kill effects, glows and wings in turn. A one-sided level gives both.
- **Tier set**: every medal in a tier gives 2 crates.
- **Delivery crate**: one every 5 on-time deliveries (`stats.levelsDelivered`). It gives the earned item the player has the
  fewest of, which fills the collection first and then makes spares.
- When rewards are given: at the end of a delivered run (a `Game.onFinish` hook from main.js; the results line gets
  "Cosmetics earned: ..."), and when the Cosmetics screen opens. Nothing is given during replay playback.
- Locked chip hint: "Earn it: the Good medal on <level> (or N more), or a delivery crate (one every 5 deliveries)."

## UI (phone-first)
- Each chip in an earned slot shows `xN` (spare). A chip with none earned is greyed and shows "locked". A chip with all its
  copies on other cars gets a brown count.
- Confirm sheet (a bottom sheet with 44 px buttons): "Equip EV green stripe on your Pick-Up? Uses 1: x3 spare now, x2 after."
  The item being replaced shows "+1 back to your stock".
- Not-enough sheet: how many are needed, how many are spare, which cars wear it, and how to earn more.
- Test switches: `?czgive=plate:ev*3,plate:classic` (only on a test visit or the dev server) and `?cztap=<id>` (taps a
  chip after the screen opens, for stills).

## Open questions for the owner
1. When a new car joins the garage, should it ride the All-cars default for free (current behaviour), drop to Stock in
   that slot, or use one from spare stock if there is one?
2. Should replacing an item really refund it (the current recommendation)? Or is "consumed" meant literally, with the old
   one lost? The non-refund version means decrementing the count in `gate`.
3. Wheels: should they be earned too, and per part (tread / tyre / hub / rim) or per preset?
4. Earn rates: is plates for Good and loud items for Evil the right split? Is every 5 deliveries the right crate rate? Should
   repeat deliveries (re-running a medalled level) give more?
5. Should locked items be tryable as a free preview?
6. Should Classic white, Yellow rear and Retro cream (free before this change) stay free?
