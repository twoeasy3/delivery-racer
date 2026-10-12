# DRAFT: one definition per pack (12-Oct)

Status: a DRAFT for the owner. Nothing here is built. It is to be built after the featured-weights agent's branch is merged (it
edits the same code: packs.js, packs.json, shop.js, shop.json, events.json).

## The problem
A pack is spread over three files today, and the shop's blurbs repeat facts from the rules:

| file | holds | for a featured pack |
|---|---|---|
| `packs.json` | the kind's rules: size, pool, odds, `amount` / `baseAmount`, `doubleChance`, `atLeast`, the featured mechanic's chances, which events / career levels give packs | a `special` kind |
| `shop.json` | the offer: price, old price, ribbon, name, blurb (hand-typed), bundle count, `from` (the event) | an offer pointing at the event |
| `events.json` | nothing about packs, except | the event's `featured` list (cars, weights, amounts) |

Balancing one pack (the 10-pack's price against the standard's) means editing two files, and the blurb ("10 cards. At least one Epic or
better") goes stale whenever the rules change.

## The proposal: `packs.json` holds PACKS, one entry each
```jsonc
{
  "rarities": { ... },                       // unchanged: names, colours
  "odds": { "common": 64, "uncommon": 24, "epic": 9, "legendary": 2.5, "bespoke": 0.5 },
  "doubleChance": 0.15,                      // the default; a pack may override
  "featuredRarity": "legendary",             // unchanged default for a featured card with no rarity of its own

  "packs": {
    "standard": {
      "name": "Standard pack",
      "size": 5, "baseAmount": 1, "pool": "all", "bespokeBlueprints": true,
      "atLeast": { "uncommon": 1 },
      "shop": { "section": "packs", "price": 100 }
    },
    "ten": {
      "name": "10-pack",
      "size": 10, "baseAmount": 1, "pool": "all", "bespokeBlueprints": true,
      "atLeast": { "uncommon": 1, "epic": 1 },
      "shop": { "section": "packs", "price": 210, "was": 260, "ribbon": "sale" }
    },
    "career": {
      "name": "Career pack",
      "size": 5, "baseAmount": 1, "pool": "evergreen", "atLeast": { "uncommon": 1 },
      "shop": { "section": "packs", "price": 80, "ribbon": "new" },
      "givenBy": { "career": { "every": 5, "levels": [] } }          // free: first completion of these levels
    },
    "comet-special": {
      "name": "Comet Hunt Special",
      "limited": true, "size": 5, "baseAmount": 2, "pool": "evergreen", "atLeast": { "uncommon": 1 },
      "event": "comet-hunt",                                         // on sale (and listed) only while that event is live
      "featured": {
        "upgradeChance": 0.25, "featuredChance": 0.2,
        "entries": [
          { "car": "silvercomet", "weight": 9, "amount": 3 },
          { "car": "silvercomet", "weight": 1, "amount": 15 }
        ]
      },
      "shop": { "section": "featured", "price": 450, "ribbon": "featured" },
      "givenBy": { "event": { "stage": true, "prize": true } }       // the stages and the grand prize give one free
    }
  },

  "bundles": {                                // a bundle = a pack x a count with a discount: nothing else
    "standard-3": { "pack": "standard", "count": 3, "price": 270, "was": 300, "ribbon": "sale" },
    "ten-3":      { "pack": "ten",      "count": 3, "price": 560, "was": 630, "ribbon": "best" }
  }
}
```
- A pack's `shop` block is its offer. No `shop` block: never sold (only given). `event`: a limited pack, listed in the Shop only
  while its event is live (what `from` did) and the event's stage/prize rewards name the pack by `givenBy`.
- Per-pack overrides of the globals: `doubleChance`, `odds` (a whole `odds` object, or `oddsBoost: { "epic": 2 }` as multipliers).
- `shop.json` keeps ONLY the currency (the placeholder "Crazey Cash", its sign, the debug grant). Prices live with the pack.
- `events.json` stops holding `featured`: the event names nothing about packs; the pack names its event. (A `prize` / `reward` that
  gives a pack is declared on the pack's `givenBy`, so the event file stays about stages.)

## Generated blurbs (no hand-typed text)
The Shop and the pack screens build the pack's one-line description from the data, in one function (`describePack(pack)` in
packs.js), so it can never be stale:
- `size` cards (x`baseAmount` each if above 1)
- each `atLeast` rule: "at least one Uncommon" / "at least one Epic or better"
- `pool`: "from every car with blueprints" / "evergreen cards only"
- `bespokeBlueprints` / the Bespoke key chance: "a key, now and then" (when the pool has keys)
- `featured`: "Guaranteed featured card" (the true-rarity wording the owner chose)
- `limited`: "Limited: until <event end>"
The owner can still add an optional `blurb` string to override the generated one for a pack.

## What changes in the code
- `packs.js`: read `packs[id]` instead of `kinds[kind]`; `draw(kind)` becomes `draw(packId)`; `featuredFor(from)` goes (the pack holds
  its entries); `describePack`; `givenBy` replaces `packData.events` and `career`; the saved packs count keys by pack id (a save
  migration: `career` / `special:comet-hunt` stay the ids; `standard` / `ten` unchanged, so old saves load as they are).
- `shop.js`: offers are built from `packs[*].shop` and `bundles`; no `offers` list; the currency stays in `shop.json`.
- `events.js` / `events.json`: drop `featured`; the problems check validates the pack's `event` reference instead.
- the checks (.packs-check, .shop-check, .events-check, .carsources-check): the same cases, reading the new shape; one new check that
  every pack with a `shop` block has a price, every `event` / `givenBy` reference exists, and every generated blurb names every guarantee.
- `carsources.js` and `render/packcontents.js` already go through packs.js functions; they change only where they read raw data.

## Balance fix to ship with it (the owner, 12-Oct: "standard packs are way better than 10-packs")
Standard 5 cards for 100 (20 a card; about 0.6 Epic-or-better a pack); the 10-pack 10 cards for 800 (80 a card; about 1.4 Epic-or-
better a pack, 0.18 per 100 spent). The draft above prices the 10-pack at 210 (a small premium for the guarantee: about 2.1 x a
Standard) and the 3-bundle at 560. Options 2 and 3 of the earlier message (an odds boost, or both) fit the same shape: `oddsBoost` on the pack.

## Migration order (after the agent's branch is merged)
1. Merge the featured-weights agent's work (it already defines the amounts / weights / doubling the new shape carries over).
2. Write the new `packs.json` shape and a loader that accepts the old shape for one release (so nothing breaks half-way), then delete the old.
3. Move the shop's offers into the packs and bundles; `shop.json` shrinks to the currency.
4. Move the Comet Hunt's `featured` into its pack; update events.js and its check.
5. Generated blurbs; delete the hand-typed ones.
6. Re-run the checks and the packs / shop / events / sources stills; bump the version; merge.

## Questions for the owner
- Is the pack's id the same as today's kind (`ten`, `standard`)? (Proposed: yes; a limited pack has its own id.)
- Should prices stay with the pack (above), or in a separate economy file once the real currency is chosen?
- Any other per-pack setting you want (a purchase limit per day, a start/end of its own for non-event packs, a first-purchase bonus)?
