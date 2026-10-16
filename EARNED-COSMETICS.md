# Earned cosmetics, like cards (CHECKLIST 437, prototype)

What the owner asked for, 16-Oct:
- "Plates will be earned. Cosmetics will be earned and 1 will be consumed when equipped to a vehicle."
- "Treat cosmetics exactly like cards: if the player has 1 of it, it is unlocked. Equipping it takes 1 from their stock.
  Unequipping gives it back."
- "Drop All cars. Per car only."
- "Unlock everything: Absolutely" gives 999 of each.
- Where cosmetics are earned is the owner's decision. They are awarded the way cards and blueprints are: through card packs.

This is branch `claude/earned-cosmetics`, made from `claude/plate-cosmetics`. It is not merged and the version is not
bumped. It is render-only: the replay fingerprint stays 33a7d9d56d and progress.js is untouched. packs.js and
unlockall.js are both outside the fingerprint (vite.config.js NOT_RULES).

## The rule
- **Earned slots:** plate, roof, cargo, wing, kill FX and glow (`EARNED_SLOTS`, `render/cosmetics.js`). No cosmetic has
  a cash price. Each slot's own free look (the Stock plate, no prop, the Classic kill effect, no glow) stays free.
  Wheels (tyre, hub, rim, tread) stay free.
- **Count:** each item is a count of how many the player has been given. One or more means it is unlocked.
- **Hand:** the hand is the count less the cars wearing it (`render/cosmeticstock.js`).
  - Equipping it on a car takes 1 from the hand.
  - Taking it off, choosing another, Reset to stock or Reset car puts it back.
  - Nothing is stored per equip, so the hand cannot drift away from what the cars wear.
  - A car that cannot wear the slot is never counted, for example a Legendary car's gold plates.
  - The kill effect counts one per car, never per kill.
- **Per car only:** the earned item is never taken from the All-cars default (`loadoutstore.js` PER_CAR).
  - On an earned tab the screen hides All cars and Copy to all.
  - Copy to all, from the Wheels tab, copies the wheels only.
  - The default still carries the non-item fields: a plate's text and a prop's paint.
- **Try-on:** tapping a chip you have in your hand wears it at once, and a light sheet asks to confirm.
  - Equip keeps it. Cancel, Escape, Back or a tap outside puts the look back.
  - If the hand is empty, the change is refused, with the cars wearing it named.
- **Not earned:** a chip greyed "Not earned" opens a neutral "Not earned yet" sheet. The source is the owner's to decide,
  so the sheet names none.
- **Absolutely:** "Unlock everything: Absolutely" gives 999 of every item, as a real stock (`grantAll`), shown as x999.
  There is no unlimited mode.

## How cosmetics are awarded: the card packs
How cards and blueprints are awarded today:
- **Source:** a card pack (`packs.js`), defined in `packs.json` and placed by the owner. Packs come from three places:
  - a Career level's first delivery (`givenBy.career`);
  - a special event's stage, prize or every run (`givenBy.event`);
  - the Shop.
- **Trigger:** `Packs.grant`, then `Packs.open`, which deals the cards and gives each one: a blueprint through
  `Ecu.addBlueprints`, a key through `grantKey`.
- **Storage:** what is held is in Progress.data.packs. The open log is Progress.data.packLog.
- **Message:** the results line says "A <pack>! Opening...". The pack reveal (`render/packs.js`) then shows the cards.

Cosmetics ride the same mechanism as another kind of card:
- **Pack definition:** a pack in `packs.json` may have `"cosmetics": [{ "item": "plate:hex" | "any": "plate",
  "chance": 0..1 (default 1), "n": copies (default 1) }]`.
- **When the pack opens:** each entry is rolled on its own chance. A hit is awarded through the one entry point, logged
  in the pack log, and shown on the reveal in a "Cosmetics for your cars" row under the blueprint cards.
- **Validation:** `packProblems` checks the list.
- **Current packs:** no pack carries any cosmetics today. Where they drop is the owner's to place.
- **Entry point:** `awardCosmetic(key, n, { source })` in `render/cosmetics.js` is the only way a cosmetic is given. It
  tells `onAward` listeners and dispatches a window `cosmeticaward` event.
- **Debug switches:**
  - `?czgive=plate:ev*3` on the Cosmetics screen (a test visit or the dev server only);
  - `?pack=<id>&cosmetics=plate:ev:1x2,any-underglow` (a pack opened for a look, nothing saved).

## Edge cases
| Case | Rule |
|---|---|
| Swap or remove | The item goes back to the hand at once. |
| The same item on several cars | One each. |
| All cars / Copy to all | Not for earned slots. Copy to all copies the wheels only. |
| A car leaves the garage | No sale exists in the game. A car's own items stay counted while its loadout entry exists. |
| Free looks | Unlimited, never taken. |
| Preview | Free: worn as a try-on, taken only on Equip. An item not earned cannot be tried on yet. |
| Reset progress | Clears the counts. |
| Test visit (`?car=`, Progress.noSave) | Nothing is written. |

## Migration (chosen to be generous: nobody loses a look)
1. **First load of this version** (`render/cosmetics.js`):
   - each key in the old owned list becomes 1;
   - each item worn anywhere becomes at least 1;
   - an older "Absolutely" save gets 999 of each key it held.
2. **Once per browser** (`render/cosmeticstock.js` migrateStock, run from main.js at start and when the Cosmetics
   screen opens):
   - an earned item on the old All-cars default is moved onto every garage car that followed it (no item of its own, and
     able to wear the slot);
   - the default then keeps only the free look, plus its text and paint;
   - each item's count is topped up to the number of cars wearing it, so the hand starts at 0, never below.

   The stricter alternative is one line to change: cap the move by stock and send the rest to the free look.
3. The old list key is still written, so a rollback to an older build keeps its items.

## Open questions for the owner
1. Which packs carry which cosmetics, at what chance and how many? None does today.
2. Should the migration be strict (capped by stock) instead of generous?
3. Should wheels be earned too, and per part or per preset?
4. Should an item not yet earned be tryable as a free preview?
5. Should the plate text become per car too, now that All cars is gone for earned slots? Today the default text is still
   shared.
