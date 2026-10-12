# DRAFT: tiers and stats for the five batch-6 idea cars (12-Oct). Nothing is built.

They are tierless placeholders in ideas.js today. Proposal: promote each into the roster as a BLUEPRINT car (cars.js
FILLER_CARS, `filler(tier, {...}, rarity)`, like the Goddess Saloon and the Fifties Hardtop), figures = their MAXED ECU
(ecus.json derives ECU1..max by the new budget: top speed 0.045/step, agility 0.08, the rest 0.10; 5-ECU cars start at 82%
top speed, 60% accel/health). Tier ranges used (maxed, gold unless noted): T2 24-31 m/s, accel 7-13, health 80-165;
T3 32-38, 9-15, 110-215; T4 37-42, 11-15, 135-300; T5 43-46, 12-22, 150-360; blue T3 36-40, 10-14.8, 120-220;
blue T5 46.5-48, 13-18+, 190-420. Composure: baseline 1.0 (3 stars and up) plus the in-tier differentiation bumps.

| Car | Tier | Max ECU | Card (ladder / suggested) | Top speed | Accel | Health | Agility | Crossing | Composure | Weight | Delivery |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Blower Tourer (1929 tourer) | 3 gold | 3 | common / **uncommon** | 34 | 10 | 160 | 0.95 | 0.6 | 1.0 | 1.6 | 0.8 (open, two seats) |
| Highway Coach (GM Scenicruiser) | 3 gold | 3 | common | 32 | 8.5 | 215 (T3 ceiling) | 0.8 | 0.8 | 1.2 (calm, long-distance) | 3.0 | 1.2 (big, a coach has room) |
| City EV (BMW i3) | 3 gold | 3 | common | 36 | 14 | 120 | 1.3 | 0.4 | 1.0 | 1.1 | 1.0 |
| Coupe Crossover (Evoque) | 4 gold | 4 | common | 38 | 12 | 230 | 1.1 | 0.8 | 1.1 (calm, tall) | 1.6 | 1.0 |
| Horseshoe Hypercar (Chiron) | 5 blue | 5 | epic / **legendary** | 47.5 | 19 | 190 (blue T5 floor) | 1.35 | 0.2 | 1.0 (racer) | 1.4 | 0.6 (no room) |

Notes and choices to confirm
- Blower: a vintage tourer should not be fast; 34 m/s tops tier 3's low end. Open top, so a low Delivery.
- Coach: slowest and weakest accel of its tier (the fire engine's twin), but its health sits at the tier's ceiling and its
  composure is the high end for the tier: it is the car that can sit on the shoulder longest (and overtakes least).
- City EV: quick off the line (accel 14) for a tier 3, but fragile (health 120) and light; crossing 0.4 as a small EV.
- Coupe Crossover: a tier 4 gold: the SUV's (T4, 37 / 11 / 300 health) sleeker, faster, less tough cousin; crossing 0.8.
- Horseshoe: the fastest in the batch; 47.5 m/s sits at the top of blue T5 (46.5-48), accel 19 above the blue range's 18
  (hypercar), health at the blue floor so it is a glass cannon; the owner may prefer Legendary (it joins the Goddess and
  Hardtop as a Legendary) or Epic by the ladder.
- All five become BLUEPRINT cars (evergreen): they drop in packs, no key. Rarity beyond the ladder is a one-word override
  (`filler(tier, car, 'legendary')`), as for the Goddess, Hardtop, Jet car, Dragster and Flying Car.
- Prices: none (blueprint cars are never sold). Delivery goes in ecu.js DELIVERY, composure in the car's own `composure`.
- Open for the owner: tiers (any of these could move a tier), which are Legendary, the Coach's tier 3 vs a 4.
