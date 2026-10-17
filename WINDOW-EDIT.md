# Window edit: one pane on its own, and the floating windows (CHECKLIST 448)

The owner, 17-Oct: "The model editor still doesn't let me change the angle or placement of a single window, there are some cars with
floating windscreens that I can't fix."

## In the editor

`delivery/modeleditor.html?car=<id>&tab=part&pane=windscreen` (or tap the pane, or its button in the Parts tab's Windows row).

- The gizmo sits on the PANE (not its part): Move / Rotate / Scale (G / R / S, Snap for 5 cm / 15 degree steps) move that pane alone, even when
  it is one of several panes merged into one glass mesh. Its axes are the pane's own: X across, Y up its face.
- Part tab: `gap` / `clear` chips, `XYZ` (its centre, m), `° YPR` (yaw, pitch, roll), `W H` (m), **Snap**, **Reset**, **Part** (the whole part
  again). Undo / Redo as for any edit. Mirror on: the pane named the other way (L / R) gets the mirrored edit.
- **Snap** rests the pane on the body (the line under it: how far it moved and turned, the gap before and after). It never pushes the pane
  under a body face. At most 15 cm and 20 degrees: anything further is a remodel. A screen that stands free by design (a roadster's aero
  screen, a buggy's, a golf cart's) is laid down by Snap: undo it, or move it by hand.
- A cabinGlass car (the ideas built with `cabinGlass`) still has its corner drawing (CHECKLIST 336) under the pane's fields.

Saved like every edit: the patch's `panes` table (`render/paneedit.js`), kept in this browser, in Download patch, applied by the game
(`render/modelpatchapply.js`) wherever it builds the car: garage, showroom, the run, the stills. A Super car wears its base car's window edits;
a Legendary its base car's patch. Render only: the replay fingerprint does not move.

## The measure (`node scripts/window-gap-audit.mjs [--md] [ids...]`)

Every vehicle the game builds, every window pane the editor lists (0.02 m2 and up), against the car's body and its other panes:

- **Gap** = the median over the pane's rim of its distance to the nearest surface, beyond 6 mm (the glass's own proud lay). A closed glass
  slab (a box) reads its nearer quarter. Listed over 1 cm.
- **Clear** = the rim's nearest point to anything. **Bold**: over 1.6 cm, the pane floats entirely.
- Supers and Legendaries are folded into their base car (Also) when their panes measure the same.

Nothing below was changed: these are for the owner to look at and fix in the editor (many are by design: a canopy, a buggy's screen on its
frame, a golf cart's screen on posts, a bus's window band). The Commuter's windscreen (1 cm clear of its cabin) and the Tuk-Tuk's (hung
between its posts, 1.2 cm clear) were snapped in the editor as a test and look right, but were not saved.

## Windscreens and rear windows (56 panes)

| Car | Pane [part] | Gap cm | Clear cm | Also |
|---|---|---|---|---|
| dunebuggy (Dune Buggy, idea) | windscreen [42] | 13.5 | 0.4 |  |
| earned-jetboat (Land Jetboat, earned) | rear window [0.16] | 10.9 | **11.0** | jetboat, traffic:boat |
| rallywedge (Rally Wedge, idea) | windscreen [2] | 10.4 | 0.6 |  |
| keiroadster (Kei Roadster, filler) | windscreen [38] | 10.0 | 0.6 |  |
| sidecar (Scooter and Sidecar, idea) | windscreen L [17] | 6.9 | **2.1** |  |
| tuktuk (Tuk-Tuk, filler) | windscreen [0.17] | 5.2 | 1.2 |  |
| snailcamper (Snail Camper, idea) | windscreen [1] | 3.9 | 0.1 |  |
| knifeedge (Knife-Edge Supercar, bespoke) | windscreen [1] | 3.7 | 0.0 |  |
| traffic:icecream (icecream, traffic) | windscreen [2] | 3.6 | **4.2** |  |
| pickup (Pick-Up, garage) | rear window [20] | 2.9 | **2.0** | traffic:pickup, super-pickup, l-pickup |
| traffic:binlorry (binlorry, traffic) | windscreen [1] | 2.8 | **3.4** |  |
| hotrod (Hot Rod, garage) | rear window [0.1] | 2.7 | **1.9** | traffic:hotrod, l-hotrod |
| swancar (Swan Car, bespoke) | windscreen [1] | 2.4 | 0.9 |  |
| steamwagon (Steam Wagon, idea) | windscreen [53] | 2.3 | 0.6 |  |
| cigar (Cigar Racer, idea) | windscreen [27] | 2.2 | 0.1 |  |
| commuter (Commuter, garage) | windscreen [1] | 2.1 | 1.0 | traffic:commuter, super-commuter, l-commuter |
| finlandyacht (Fin Land Yacht, filler) | windscreen [0.2] | 2.0 | 0.7 |  |
| super-herald (Super Sailing Herald, super) | rear window 3 [26.0] | 1.9 | 0.0 |  |
| super-herald (Super Sailing Herald, super) | rear window 6 [26.6] | 1.9 | 0.0 |  |
| finlandyacht (Fin Land Yacht, filler) | rear window [0.2] | 1.9 | 0.9 |  |
| autobahnestate (Autobahn Estate, filler) | windscreen [0.3] | 1.7 | 1.0 |  |
| swancar (Swan Car, bespoke) | rear window [1] | 1.6 | 0.0 |  |
| lovebus (Love Bus, garage) | rear window [0.2] | 1.5 | 1.5 | traffic:lovebus, super-lovebus, l-lovebus |
| golfcart (Golf Cart, idea) | windscreen [28] | 1.5 | 0.0 |  |
| traffic:semi (semi, traffic) | windscreen [1] | 1.4 | 0.0 |  |
| traffic:cargotruck (cargotruck, traffic) | windscreen [1] | 1.4 | 0.0 |  |
| dampervan (Dampervan, garage) | windscreen 2 [49] | 1.4 | 0.0 | traffic:dampervan, super-dampervan |
| classicgt (Classic GT, garage) | windscreen R [6] | 1.3 | 0.1 | super-classicgt |
| classicgt (Classic GT, garage) | windscreen L [18] | 1.3 | 0.1 | super-classicgt |
| super-liftedtruck (Super Lifted Truck, super) | windscreen R [47.31] | 1.3 | 0.0 |  |
| super-liftedtruck (Super Lifted Truck, super) | windscreen L [47.33] | 1.3 | 0.0 |  |
| super-suv (Super SUV, super) | windscreen R [10.29] | 1.3 | 0.0 |  |
| super-suv (Super SUV, super) | windscreen L [10.31] | 1.3 | 0.0 |  |
| super-postvan (Super Post Van, super) | windscreen R [40.36] | 1.3 | 0.0 |  |
| super-postvan (Super Post Van, super) | windscreen L [40.38] | 1.3 | 0.0 |  |
| super-lovebus (Super Love Bus, super) | windscreen 2 R [10.43] | 1.3 | 0.0 |  |
| super-lovebus (Super Love Bus, super) | windscreen 2 L [10.45] | 1.3 | 0.0 |  |
| super-minivan (Super Minivan, super) | windscreen R [21.40] | 1.3 | 0.0 |  |
| super-minivan (Super Minivan, super) | windscreen L [21.42] | 1.3 | 0.0 |  |
| super-sixbysix (Super 6x6, super) | windscreen R [69.26] | 1.3 | 0.0 |  |
| super-sixbysix (Super 6x6, super) | windscreen L [69.28] | 1.3 | 0.0 |  |
| super-toybota (Super Toybota, super) | windscreen R [32.32] | 1.3 | 0.0 |  |
| super-toybota (Super Toybota, super) | windscreen L [32.34] | 1.3 | 0.0 |  |
| super-polytruck (Super Polygon Truck, super) | windscreen R [31.31] | 1.3 | 0.0 |  |
| super-polytruck (Super Polygon Truck, super) | windscreen L [31.33] | 1.3 | 0.0 |  |
| slantback (Slant-Back Saloon, idea) | rear window [1] | 1.3 | 0.3 |  |
| sport (Sportscompact, garage) | windscreen [10] | 1.2 | 0.4 | traffic:sport, super-sport, l-sport |
| boathauler (Boat Hauler, idea) | rear window 2 [41] | 1.2 | 0.1 |  |
| lowrider (Lowrider, garage) | windscreen [0.0.2] | 1.2 | 0.7 | traffic:lowrider, super-lowrider, l-lowrider |
| lowrider (Lowrider, garage) | rear window [0.0.2] | 1.2 | 0.7 | traffic:lowrider, super-lowrider, l-lowrider |
| superlowrider (Super Lowrider, garage) | windscreen [0.0.2] | 1.2 | 0.7 | super-superlowrider |
| superlowrider (Super Lowrider, garage) | rear window [0.0.2] | 1.2 | 0.7 | super-superlowrider |
| glassbrake (Glass-Hatch Brake, idea) | windscreen [2] | 1.2 | 0.8 |  |
| miata (Sportscar, garage) | windscreen [2] | 1.2 | 0.8 | traffic:miata, super-miata, l-miata |
| sport (Sportscompact, garage) | rear window [10] | 1.1 | 0.1 | traffic:sport, super-sport, l-sport |
| suv (SUV, garage) | windscreen [0.1] | 1.1 | 0.8 | traffic:suv, l-suv |

## Other panes (162 panes)

| Car | Pane [part] | Gap cm | Clear cm | Also |
|---|---|---|---|---|
| traffic:boyracer (boyracer, traffic) | roof window 3 [4] | 13.0 | **3.8** |  |
| traffic:trawler (trawler, traffic) | roof window [0.6] | 11.4 | 0.0 |  |
| earned-ufo (Saucer, earned) | side windows [2] | 10.6 | **11.0** | ufo |
| armoured (Armoured Van, idea) | window 1 R [10] | 9.7 | **8.9** |  |
| armoured (Armoured Van, idea) | window 1 L [27] | 9.7 | **8.9** |  |
| evsaloon (EV Saloon, garage) | side windows [1] | 8.4 | 0.2 | super-evsaloon |
| super-floatvan (Super Float Van, super) | window 8 R [37.34] | 8.4 | 0.2 |  |
| super-floatvan (Super Float Van, super) | window 8 L [37.35] | 8.4 | 0.3 |  |
| rotary (Rotary Coupe, garage) | side windows [1] | 7.8 | 0.1 | super-rotary |
| classicgt (Classic GT, garage) | side windows [2] | 7.4 | 0.0 | super-classicgt |
| super-hotrod (Super Hot Rod, super) | window 8 R [10.22] | 6.6 | 0.4 | hellrod |
| super-hotrod (Super Hot Rod, super) | window 8 L [10.23] | 6.6 | 0.0 | hellrod |
| rocketfin (Rocket Fin Coupe, bespoke) | side windows 2 [2] | 6.5 | 0.0 |  |
| super-herald (Super Sailing Herald, super) | roof window [26.16] | 5.6 | 0.0 |  |
| rocketfin (Rocket Fin Coupe, bespoke) | side windows [17] | 5.1 | 0.1 |  |
| super-pickup (Super Pick-Up, super) | window 7 R [33.21] | 5.0 | 0.1 |  |
| super-liftedtruck (Super Lifted Truck, super) | window 9 R [47.39] | 4.9 | 0.0 |  |
| traffic:boyracer (boyracer, traffic) | roof window [3] | 4.8 | 0.3 |  |
| super-darkvan (Super Darkvan, super) | window 9 R [17.38] | 4.7 | 0.2 |  |
| windsong (Wind-Song Racer, bespoke) | side windows [1] | 4.7 | 0.0 |  |
| super-wagon (Super Family Wagon, super) | window 3 R [17.23] | 4.4 | 0.4 |  |
| super-suv (Super SUV, super) | window 9 R [10.37] | 4.3 | 0.4 |  |
| super-hotrod (Super Hot Rod, super) | window 9 R [0.1] | 4.0 | **3.3** | hellrod |
| super-hotrod (Super Hot Rod, super) | window 10 R [0.1] | 4.0 | **3.3** | hellrod |
| super-hotrod (Super Hot Rod, super) | window 9 L [0.1] | 4.0 | **3.3** | hellrod |
| super-hotrod (Super Hot Rod, super) | window 10 L [0.1] | 4.0 | **3.3** | hellrod |
| hotrod (Hot Rod, garage) | window 7 R [0.1] | 4.0 | **3.3** | traffic:hotrod, l-hotrod |
| hotrod (Hot Rod, garage) | window 8 R [0.1] | 4.0 | **3.3** | traffic:hotrod, l-hotrod |
| hotrod (Hot Rod, garage) | window 7 L [0.1] | 4.0 | **3.3** | traffic:hotrod, l-hotrod |
| hotrod (Hot Rod, garage) | window 8 L [0.1] | 4.0 | **3.3** | traffic:hotrod, l-hotrod |
| super-keitruck (Super Kei Truck, super) | window 3 R [10.10] | 4.0 | 0.0 |  |
| super-suv (Super SUV, super) | window 12 L [10.38] | 3.6 | 0.2 |  |
| super-towtruck (Super Tow Truck, super) | window 4 R [36.23] | 3.6 | 0.0 |  |
| super-darkvan (Super Darkvan, super) | window 12 L [17.39] | 3.5 | 0.2 |  |
| super-wagon (Super Family Wagon, super) | window 3 L [17.24] | 3.4 | 0.1 |  |
| l-hotrod (Legendary Hot Rod, legendary) | window 8 R [0.1] | 3.4 | **2.6** |  |
| l-hotrod (Legendary Hot Rod, legendary) | window 8 L [0.1] | 3.4 | **2.6** |  |
| super-junker (Super Junker, super) | window 9 R [10.26] | 3.4 | 0.0 |  |
| super-pickup (Super Pick-Up, super) | window 10 L [33.22] | 3.3 | 0.3 |  |
| super-liftedtruck (Super Lifted Truck, super) | window 12 L [47.40] | 3.3 | 0.0 |  |
| super-keitruck (Super Kei Truck, super) | window 4 R [10.5] | 3.3 | 0.0 |  |
| super-keitruck (Super Kei Truck, super) | window 4 L [10.6] | 3.3 | 0.0 |  |
| super-nissank (Super Nissank, super) | window 4 R [41.22] | 3.2 | 0.0 |  |
| super-nissank (Super Nissank, super) | window 4 L [41.23] | 3.2 | 0.0 |  |
| silvercomet (Silver Comet, event) | side windows [6] | 3.2 | 0.0 | centreseat |
| jetcar (Jet Land-Speed Car, filler) | side windows [2] | 3.2 | 0.1 |  |
| horseshoe (Horseshoe Hypercar, bespoke) | roof window [29.0] | 3.0 | 0.1 |  |
| solarracer (Solar Racer, bespoke) | side windows [24] | 2.6 | 0.0 |  |
| traffic:interceptor (interceptor, traffic) | roof window [3] | 2.5 | 0.1 |  |
| paddleduck (Paddle-Wheel Amphibian, bespoke) | roof window [2] | 2.5 | 0.4 |  |
| traffic:interceptor (interceptor, traffic) | roof window 3 [2] | 2.4 | 0.1 |  |
| super-rearengine (Super Rear-Engine Coupe, super) | window 2 R [38.12] | 2.4 | 0.0 |  |
| super-floatvan (Super Float Van, super) | window 11 R [37.21] | 2.3 | 0.5 |  |
| super-floatvan (Super Float Van, super) | window 11 L [37.22] | 2.3 | 0.5 |  |
| super-hotrod (Super Hot Rod, super) | window 12 R [10.20] | 2.3 | 0.5 | hellrod |
| super-hotrod (Super Hot Rod, super) | window 12 L [10.21] | 2.3 | 0.5 | hellrod |
| super-herald (Super Sailing Herald, super) | window 6 R [26.17] | 2.3 | 0.5 |  |
| super-herald (Super Sailing Herald, super) | window 6 L [26.18] | 2.3 | 0.5 |  |
| super-pickup (Super Pick-Up, super) | window 16 R [33.15] | 2.3 | 0.5 |  |
| super-pickup (Super Pick-Up, super) | window 19 L [33.16] | 2.3 | 0.5 |  |
| super-liftedtruck (Super Lifted Truck, super) | window 12 R [47.13] | 2.3 | 0.5 |  |
| super-liftedtruck (Super Lifted Truck, super) | window 15 L [47.14] | 2.3 | 0.5 |  |
| super-darkvan (Super Darkvan, super) | window 12 R [17.21] | 2.3 | 0.5 |  |
| super-darkvan (Super Darkvan, super) | window 15 L [17.22] | 2.3 | 0.5 |  |
| super-wagon (Super Family Wagon, super) | window 7 R [17.21] | 2.3 | 0.5 |  |
| super-wagon (Super Family Wagon, super) | window 7 L [17.22] | 2.3 | 0.5 |  |
| super-suv (Super SUV, super) | window 13 R [10.11] | 2.3 | 0.5 |  |
| super-suv (Super SUV, super) | window 16 L [10.12] | 2.3 | 0.5 |  |
| super-keitruck (Super Kei Truck, super) | window 3 L [10.11] | 2.3 | 0.0 |  |
| super-keitruck (Super Kei Truck, super) | window 5 R [10.8] | 2.3 | 0.5 |  |
| super-keitruck (Super Kei Truck, super) | window 5 L [10.9] | 2.3 | 0.5 |  |
| super-towtruck (Super Tow Truck, super) | window 6 R [36.21] | 2.3 | 0.5 |  |
| super-towtruck (Super Tow Truck, super) | window 6 L [36.22] | 2.3 | 0.5 |  |
| super-junker (Super Junker, super) | window 11 R [10.24] | 2.3 | 0.5 |  |
| super-junker (Super Junker, super) | window 11 L [10.25] | 2.3 | 0.5 |  |
| super-junker (Super Junker, super) | window 9 L [10.27] | 2.3 | 0.0 |  |
| super-nissank (Super Nissank, super) | window 6 R [41.20] | 2.3 | 0.5 |  |
| super-nissank (Super Nissank, super) | window 6 L [41.21] | 2.3 | 0.5 |  |
| super-commuter (Super Commuter, super) | window 7 R [16.16] | 2.3 | 0.5 |  |
| super-commuter (Super Commuter, super) | window 7 L [16.17] | 2.3 | 0.5 |  |
| super-postvan (Super Post Van, super) | window 12 R [40.18] | 2.3 | 0.5 |  |
| super-postvan (Super Post Van, super) | window 12 L [40.19] | 2.3 | 0.5 |  |
| super-mini (Super Mini, super) | window 4 R [31.16] | 2.3 | 0.5 |  |
| super-mini (Super Mini, super) | window 4 L [31.17] | 2.3 | 0.5 |  |
| super-lovebus (Super Love Bus, super) | window 14 R [10.25] | 2.3 | 0.5 |  |
| super-lovebus (Super Love Bus, super) | window 14 L [10.26] | 2.3 | 0.5 |  |
| super-sport (Super Sportscompact, super) | window 6 R [21.13] | 2.3 | 0.5 |  |
| super-sport (Super Sportscompact, super) | window 6 L [21.14] | 2.3 | 0.5 |  |
| super-hothatch (Super Hot Hatch, super) | window 6 R [36.15] | 2.3 | 0.5 |  |
| super-hothatch (Super Hot Hatch, super) | window 6 L [36.16] | 2.3 | 0.5 |  |
| super-ute (Super Ute, super) | window 6 R [33.12] | 2.3 | 0.5 |  |
| super-ute (Super Ute, super) | window 6 L [33.13] | 2.3 | 0.5 |  |
| super-buggy (Super Beach Buggy, super) | window 4 R [10.15] | 2.3 | 0.5 |  |
| super-buggy (Super Beach Buggy, super) | window 4 L [10.16] | 2.3 | 0.5 |  |
| super-hearse (Super Hearse, super) | window 5 R [19.25] | 2.3 | 0.5 |  |
| super-hearse (Super Hearse, super) | window 5 L [19.26] | 2.3 | 0.5 |  |
| super-minivan (Super Minivan, super) | window 13 R [21.22] | 2.3 | 0.5 |  |
| super-minivan (Super Minivan, super) | window 13 L [21.23] | 2.3 | 0.5 |  |
| super-sleeper (Super Sleeper Wagon, super) | window 6 R [37.20] | 2.3 | 0.5 | courier |
| super-sleeper (Super Sleeper Wagon, super) | window 6 L [37.21] | 2.3 | 0.5 | courier |
| super-rally (Super Rally Car, super) | window 7 R [40.10] | 2.3 | 0.5 |  |
| super-rally (Super Rally Car, super) | window 7 L [40.11] | 2.3 | 0.5 |  |
| super-rotary (Super Rotary Coupe, super) | window 4 R [20.12] | 2.3 | 0.5 |  |
| super-rotary (Super Rotary Coupe, super) | window 4 L [20.13] | 2.3 | 0.5 |  |
| super-taxi (Super Taxi, super) | window 7 R [18.21] | 2.3 | 0.5 |  |
| super-taxi (Super Taxi, super) | window 7 L [18.22] | 2.3 | 0.5 |  |
| super-miata (Super Sportscar, super) | window 5 R [15.17] | 2.3 | 0.5 |  |
| super-miata (Super Sportscar, super) | window 5 L [15.18] | 2.3 | 0.5 |  |
| super-gullwing (Super Stainless Gullwing, super) | window 5 R [38.14] | 2.3 | 0.5 |  |
| super-gullwing (Super Stainless Gullwing, super) | window 5 L [38.15] | 2.3 | 0.5 |  |
| super-snake (Super Snake Roadster, super) | window 4 R [40.13] | 2.3 | 0.5 |  |
| super-snake (Super Snake Roadster, super) | window 4 L [40.14] | 2.3 | 0.5 |  |
| super-muscle (Super Muscle Car, super) | window 7 R [10.13] | 2.3 | 0.5 | showdown |
| super-muscle (Super Muscle Car, super) | window 7 L [10.14] | 2.3 | 0.5 | showdown |
| super-fullsize (Super Full-Size, super) | window 6 R [10.22] | 2.3 | 0.5 |  |
| super-fullsize (Super Full-Size, super) | window 6 L [10.23] | 2.3 | 0.5 |  |
| super-evsaloon (Super EV Saloon, super) | window 4 R [18.13] | 2.3 | 0.5 |  |
| super-evsaloon (Super EV Saloon, super) | window 4 L [18.14] | 2.3 | 0.5 |  |
| super-superlowrider (Super Super Lowrider, super) | window 6 R [10.20] | 2.3 | 0.5 |  |
| super-superlowrider (Super Super Lowrider, super) | window 6 L [10.21] | 2.3 | 0.5 |  |
| super-classicgt (Super Classic GT, super) | window 4 R [30.15] | 2.3 | 0.5 |  |
| super-classicgt (Super Classic GT, super) | window 4 L [30.16] | 2.3 | 0.5 |  |
| super-sixbysix (Super 6x6, super) | window 10 R [69.8] | 2.3 | 0.5 |  |
| super-sixbysix (Super 6x6, super) | window 13 L [69.9] | 2.3 | 0.5 |  |
| super-toybota (Super Toybota, super) | window 12 R [32.14] | 2.3 | 0.5 |  |
| super-toybota (Super Toybota, super) | window 15 L [32.15] | 2.3 | 0.5 |  |
| super-dampervan (Super Dampervan, super) | window 8 R [55.23] | 2.3 | 0.5 |  |
| super-dampervan (Super Dampervan, super) | window 8 L [55.24] | 2.3 | 0.5 |  |
| fireengine (Fire Engine, filler) | window 2 R [29] | 2.1 | 0.0 |  |
| fireengine (Fire Engine, filler) | window 1 L [52] | 2.1 | 0.0 |  |
| circuswagon (Circus Wagon, idea) | side window L [111.4] | 2.1 | 0.0 |  |
| super-darkvan (Super Darkvan, super) | roof window [17.16] | 2.0 | 0.0 |  |
| super-towtruck (Super Tow Truck, super) | window 4 L [36.24] | 2.0 | 0.0 |  |
| earned-jetboat (Land Jetboat, earned) | roof window [0.21] | 1.9 | 0.2 | jetboat, traffic:boat |
| super-pickup (Super Pick-Up, super) | window 15 R [33.12] | 1.9 | 0.0 |  |
| super-towtruck (Super Tow Truck, super) | window 5 R [36.18] | 1.9 | 0.0 |  |
| super-towtruck (Super Tow Truck, super) | window 5 L [36.19] | 1.9 | 0.0 |  |
| traffic:boyracer (boyracer, traffic) | window 2 R [5] | 1.8 | 0.1 |  |
| traffic:boyracer (boyracer, traffic) | window 2 L [6] | 1.8 | 0.1 |  |
| super-pickup (Super Pick-Up, super) | window 18 L [33.13] | 1.7 | 0.0 |  |
| super-toybota (Super Toybota, super) | window 10 R [32.40] | 1.7 | 0.0 |  |
| bubble (Bubble Car, filler) | side windows [1] | 1.6 | 0.0 |  |
| super-herald (Super Sailing Herald, super) | window 4 R [26.19] | 1.4 | 0.0 |  |
| super-postvan (Super Post Van, super) | window 10 R [40.40] | 1.4 | 0.0 |  |
| super-sixbysix (Super 6x6, super) | window 9 R [69.34] | 1.4 | 0.0 |  |
| super-sixbysix (Super 6x6, super) | window 12 L [69.35] | 1.4 | 0.0 |  |
| super-muscle (Super Muscle Car, super) | window 3 R [10.15] | 1.3 | 0.0 | showdown |
| super-polytruck (Super Polygon Truck, super) | window 9 R [31.35] | 1.3 | 0.0 |  |
| super-rearengine (Super Rear-Engine Coupe, super) | window 2 L [38.13] | 1.2 | 0.0 |  |
| super-ute (Super Ute, super) | window 4 R [33.14] | 1.2 | 0.0 |  |
| super-sleeper (Super Sleeper Wagon, super) | window 3 R [37.22] | 1.2 | 0.0 | courier |
| quadturbo (Quad-Turbo Supercar, bespoke) | side windows [1] | 1.2 | 0.0 |  |
| super-hothatch (Super Hot Hatch, super) | window 3 R [36.17] | 1.1 | 0.0 |  |
| glassbrake (Glass-Hatch Brake, idea) | door window L [2] | 1.1 | 0.6 |  |
| glassbrake (Glass-Hatch Brake, idea) | door window R [2] | 1.1 | 0.6 |  |
| teardrop (Teardrop Streamliner, filler) | side windows [1] | 1.1 | 0.6 |  |
| slantback (Slant-Back Saloon, idea) | door window L [1] | 1.0 | 0.6 |  |
| slantback (Slant-Back Saloon, idea) | door window R [1] | 1.0 | 0.6 |  |
| sprinthatch (Sprint Hatch, filler) | door window L [1] | 1.0 | 0.6 |  |
| sprinthatch (Sprint Hatch, filler) | door window R [1] | 1.0 | 0.6 |  |
| cranelorry (Crane Lorry, filler) | side window L [1] | 1.0 | 0.4 |  |
| cranelorry (Crane Lorry, filler) | side window R [1] | 1.0 | 0.4 |  |
