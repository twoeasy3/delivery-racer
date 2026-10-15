# The Workshop: Tunes and Fittings (DRAFT, 15-Oct, nothing built)

Inspired by World of Tanks' Field Modifications and Equipment. Every number below is a PLACEHOLDER to show the shape of a choice.

## The parts
- **Tunes** (the field mods): a choice per Tune slot. Pick A, pick B, or NEITHER (stats stay as they are). Each option gives something and takes something. Switching costs.
- **Fittings** (the equipment): permanent boosts slotted into a car. How players earn them is UNDECIDED (see below).
- **ECU upgrades** are unchanged: a car's base strength. **Cosmetics** are unchanged: render only. Tunes and Fittings change the stats the game computes, so they are LOGIC (replay fingerprint; a replay records the loadout).

## Tunes: rules
1. Every Tune slot offers exactly **A, B, or neither**. Neither is always free and is the default.
2. **Switching costs** (cash, or the future special currency: undecided). Going back to Neither costs too, so a choice is a commitment, not a toggle.
3. A Tune is **genuinely hard**: each option has a real price. Neither is a legitimate pick. No option is strictly better than Neither for every level.
4. **Cars have different Tune slots and different options.** A simple car has one slot; a complex or high-star car has two or three. Options are written for the car's character.
5. Three kinds of Tune:
   - **Stat swap:** lose some of one stat, gain some of another.
   - **Trigger:** a condition changes how the car behaves.
   - **Passive effect:** a standing rule bent for a stat cost.

## Tunes: examples (placeholders)
Stat swaps (an exchange rate keeps A and B comparable: see the budget note):
- *Heavy springs / Light springs* (any car). A: lose 100 health for +4 top speed. B: lose 12 top speed for +120 health. Neither: unchanged.
- *Gearing* (sports car). A: +2 acceleration, -3 top speed. B: +3 top speed, -2 acceleration.

Triggers and passives:
- *Hair trigger.* A: the car explodes when under 10% health, for +3 top speed. B: Neither.
- *Focus sash.* A: survive one lethal hit at 1 health, once per run, for -8 top speed. B: Neither.
- *Cargo cradle* (pick-up). A: package takes less damage (delivery +), -1 agility. B: faster lane changes, package takes more.
- *Sealed hull* (amphibious). A: floats with +composure on water, -top speed on land. B: Neither.
- *Racing slicks* (race cars). A: more grip on dry, -composure on wet. B: Neither.

Notes for the real list:
- "Explodes under 10% health" needs a defined meaning (the run ends as a wreck? a bust?). The rule must be clear on the HUD.
- Triggers must obey the game's existing rules: never stop the car, no bust without counterplay.

## Tune budget (keeps A and B fair)
Give every stat a **value per unit** (from the ECU table: one ECU step is about +1.8 m/s top speed for about +43 health on a 5-star key car). A swap is fair when value gained is about value lost. Triggers and passives are priced in the same units. Then a designer can write a car's Tunes by balancing the sums, and a check can enforce it.

### Top speed is the most important stat (owner, 15-Oct)
- Top speed decides level clocks, par, medals and records far more than any other stat, so it carries the **highest value per unit** in the budget: 1 m/s of top speed is worth many times 1 point of health (placeholder: 1 m/s ~ 100 health, to be set from the clocks).
- So **any Tune that adds top speed must cost a lot**, and any Tune that sells top speed must pay a lot back: the owner's example B (-12 top speed for +120 health) is a very expensive sale at that rate, and A (-100 health for +4 top speed) is a strong buy that needs a real price somewhere else (a switch cost, a second drawback, or a smaller number).
- **The cap on boosts is tightest for top speed** (a few percent total from Tunes and Fittings together) and looser for health, composure and the rest. Fittings that add top speed are rare and small; most Fittings boost the other stats.
- This also makes "lose top speed" the genuinely hard choice for players who race, and "gain top speed" the temptation to price carefully.

## Fittings
- A Fitting is a small permanent bonus to one stat (for example +4% top speed), slotted into a car.
- Cars have **varying slot counts**: more for higher tiers and key cars, fewer for starters.
- Some Fittings fit only certain kinds of car.
- A total cap (for example +10% per stat across all Fittings) protects level clocks, par and medals.
- A **set bonus** for matching Fittings is possible later.

### How players earn Fittings: UNDECIDED. Options
1. **Level rewards:** a Fitting for a first medal, a Good+Evil double, or a par on a level. Rewards play, uses the existing medal system.
2. **Milestones:** a Fitting per milestone.
3. **Events:** event prizes. Limited-time, suits the event system.
4. **Crazey Jim's stall:** bought for cash or the special currency. Money-driven.
5. **Packs:** a separate Fitting pack. A chance system. Needs care with duplicates and the capped-card rules.
6. **Scrap:** surplus blueprints (from a capped car) turn into Fitting parts. This would use the "special currency" you described for capped cards.

## Open questions
- What currency pays for Tune switches?
- Do earned Special cars (capped at ECU1), event cars with fixed stats, and Legendary cars get slots?
- Do medals, par and clocks use base stats, or the fitted stats? (My view: clocks use base stats, with a cap on total boosts, so records stay comparable.)
- Do Tunes and Fittings carry between Good and Evil?
- Where does the UI live: a Workshop tab in the garage and showroom on each car?

## Next steps
1. Choose the names (Workshop / Tunes / Fittings, or alternatives).
2. Decide the currency and the Fitting source.
3. Write 3 to 4 Tunes for ten cars, with the budget table.
4. Build: data (per-car Tune and slot declarations), the stat resolver, the garage UI, saves, replay loadout, checks.
