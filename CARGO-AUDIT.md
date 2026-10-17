# Cargo audit (17-Oct, CHECKLIST 465)

Every cargo model (90), built headless, posed in each of its states (Good items: one) at 0.7 s and 2.3 s, and read by
render/zfight.js and a floating-part search. Made by the agent that fixed the rats, the hamster ball, the bubble teas, the
Chianti, the horseshoes and the cheese (those six now have rules in src/delivery/render/cargoRules.js and pass
scripts/.cargo-contain-check.mjs). Nothing below was fixed but those six; the flicker-class counts are frozen as
KNOWN_ZFIGHTS in cargoRules.js, so the check fails if one gets worse.

- **flicker**: z-fight pairs under 0.5 mm apart and not one colour (they flicker at any distance), distinct pairs over the 6
  samples (the check's KNOWN_ZFIGHTS is the worst single sample): the check fails on more.
- **weak**: pairs 0.5 to 4 mm apart (only on a weak GPU or far off); reported, not failed.
- **floating**: part-samples (summed over the 6 samples) within 4 mm of no other part and off the ground. Most are
  particles meant to fly (sparks, bubbles, steam); a few may be real. Not a containment check: "parts leave their
  container" needs each item's own container named, so it is done only for the items with rules (the TODO below).
- **severity**: high (10+ flicker pairs), medium (1 to 9), low (weak pairs or floating to look at), none.

| item | flicker | weak | floating | severity | what |
|--|--|--|--|--|--|
| chainletter | 139 | 222 | 0 | high | flicker at (x, y, z) Box/Box at 0.11, 0.14, 0.02; Box/Box at -0.06, 0.16, 0.00 |
| taxmen | 40 | 72 | 69 | high | flicker at (x, y, z) Box/Box at -0.19, 1.05, 0.35; Box/Box at 0.18, 1.16, 0.25; floating: Plane (particles? not looked at) |
| wardens | 35 | 34 | 2 | high | flicker at (x, y, z) Box/Box at 0.61, 0.38, 0.03; Box/Box at -0.62, 0.36, 0.06; floating: Cylinder (particles? not looked at) |
| jumper | 32 | 41 | 0 | high | flicker at (x, y, z) Box/Box at -0.10, 0.42, -0.06; Box/Box at -0.03, 0.44, 0.07 |
| inlaws | 18 | 56 | 8 | high | flicker at (x, y, z) Box/Box at -0.06, 0.21, 0.24; Box/Box at -0.16, 0.21, 0.24; floating: Plane (particles? not looked at) |
| telemarketers | 15 | 0 | 89 | high | flicker at (x, y, z) Sphere/Sphere at 0.02, 0.44, 0.06; Sphere/Sphere at -0.18, 0.45, 0.10; floating: Plane, Sphere, Torus (particles? not looked at) |
| consultants | 13 | 34 | 134 | high | flicker at (x, y, z) Plane/Box at 0.01, 0.77, 0.07; Plane/Box at 0.01, 0.77, 0.07; floating: Plane, Cylinder (particles? not looked at) |
| recorders | 12 | 78 | 6 | high | flicker at (x, y, z) Plane/Box at 0.05, 0.34, -0.12; Plane/Box at -0.15, 0.34, -0.14; floating: Plane (particles? not looked at) |
| syrup | 6 | 9 | 29 | medium | Owned by claude/syrup-fix (not touched here). |
| sushi | 5 | 18 | 0 | medium | flicker at (x, y, z) Box/Box at -0.02, 0.32, -0.25; Box/Box at -0.02, 0.31, 0.26 |
| mirror | 4 | 28 | 0 | medium | flicker at (x, y, z) Circle/Circle at -0.09, 0.73, 0.03; Circle/Circle at -0.09, 0.73, -0.03 |
| books | 4 | 0 | 0 | medium | flicker at (x, y, z) Box/Box at 0.08, 0.41, 0.03; Box/Plane at 0.10, 0.41, 0.08 |
| ink | 2 | 1 | 94 | medium | flicker at (x, y, z) Box/Box at 0.26, 0.03, -0.07; Box/Box at 0.26, 0.03, -0.07; floating: Circle (particles? not looked at) |
| pancakes | 2 | 0 | 0 | medium | flicker at (x, y, z) Cylinder/Cylinder at 0.30, 0.76, -0.11; Cylinder/Cylinder at 0.33, 0.73, -0.14 |
| radio | 1 | 1 | 0 | medium | flicker at (x, y, z) Box/Box at 0.17, 0.32, 0.16 |
| mimic | 1 | 0 | 0 | medium | flicker at (x, y, z) Box/Box at 0.55, 0.64, 0.04 |
| pokerchips | 0 | 84 | 0 | low | weak pairs only |
| clock | 0 | 53 | 0 | low | weak pairs only |
| cannonball | 0 | 36 | 28 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| barrel | 0 | 33 | 16 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| goose | 0 | 30 | 3 | low | weak pairs only; floating: Box (particles? not looked at) |
| fakechips | 0 | 22 | 0 | low | weak pairs only |
| fireworks | 0 | 20 | 164 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| surfboard | 0 | 14 | 0 | low | weak pairs only |
| glitter | 0 | 12 | 362 | low | weak pairs only; floating: Octahedron (particles? not looked at) |
| pizza | 0 | 12 | 3 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| tentacle | 0 | 12 | 0 | low | weak pairs only |
| teaset | 0 | 7 | 6 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| bees | 0 | 6 | 0 | low | weak pairs only |
| casserole | 0 | 6 | 6 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| ghost | 0 | 6 | 0 | low | weak pairs only |
| kittens | 0 | 6 | 2 | low | weak pairs only; floating: Plane (particles? not looked at) |
| telescope | 0 | 6 | 2 | low | weak pairs only; floating: Cylinder (particles? not looked at) |
| reactor | 0 | 5 | 1 | low | weak pairs only; floating: Circle (particles? not looked at) |
| spider | 0 | 5 | 6 | low | weak pairs only; floating: Torus (particles? not looked at) |
| ramen | 0 | 4 | 6 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| teddy | 0 | 4 | 30 | low | weak pairs only; floating: Box, Sphere (particles? not looked at) |
| toolbox | 0 | 4 | 0 | low | weak pairs only |
| piranhas | 0 | 3 | 55 | low | weak pairs only; floating: Sphere (particles? not looked at) |
| subpoena | 0 | 3 | 39 | low | weak pairs only; floating: Plane, Box (particles? not looked at) |
| doll | 0 | 2 | 8 | low | weak pairs only; floating: Circle (particles? not looked at) |
| record | 0 | 2 | 0 | low | weak pairs only |
| fondue | 0 | 1 | 0 | low | weak pairs only |
| lawyers | 0 | 1 | 57 | low | weak pairs only; floating: Plane, Torus (particles? not looked at) |
| ticketrolls | 0 | 1 | 0 | low | weak pairs only |
| airhorn | 0 | 0 | 28 | low | floating: Torus (particles? not looked at) |
| band | 0 | 0 | 6 | low | floating: Plane (particles? not looked at) |
| bouquet | 0 | 0 | 3 | low | floating: Sphere (particles? not looked at) |
| cake | 0 | 0 | 4 | low | floating: Sphere (particles? not looked at) |
| canary | 0 | 0 | 4 | low | floating: Cylinder (particles? not looked at) |
| coffee | 0 | 0 | 7 | low | floating: Sphere (particles? not looked at) |
| cooker | 0 | 0 | 19 | low | floating: Sphere, Torus (particles? not looked at) |
| flytrap | 0 | 0 | 32 | low | floating: Sphere, Cylinder (particles? not looked at) |
| genie | 0 | 0 | 11 | low | floating: Sphere, Cylinder (particles? not looked at) |
| goldbar | 0 | 0 | 40 | low | floating: Box (particles? not looked at) |
| ice | 0 | 0 | 12 | low | floating: Sphere (particles? not looked at) |
| jack | 0 | 0 | 8 | low | floating: Torus (particles? not looked at) |
| nestedboxes | 0 | 0 | 22 | low | floating: Box (particles? not looked at) |
| parcel | 0 | 0 | 50 | low | floating: Sphere (particles? not looked at) |
| pie | 0 | 0 | 6 | low | floating: Sphere (particles? not looked at) |
| piecatapult | 0 | 0 | 63 | low | floating: Cylinder, Sphere (particles? not looked at) |
| porcupine | 0 | 0 | 9 | low | floating: Sphere (particles? not looked at) |
| scarabs | 0 | 0 | 81 | low | floating: Box (particles? not looked at) |
| skunk | 0 | 0 | 46 | low | floating: Sphere (particles? not looked at) |
| snakes | 0 | 0 | 2 | low | floating: Torus (particles? not looked at) |
| sundae | 0 | 0 | 4 | low | floating: Sphere (particles? not looked at) |
| horseshoes | 0 | 4 | 0 | fixed | Fixed in this batch; its rules hold. Weak only, hidden: the lucky shoe's calkins and nail heads sunk into its plate. |
| hamsterball | 0 | 1 | 6 | fixed | Fixed in this batch; its rules hold. Weak only: the inner ear 3 mm in the ear, furious. The popped hatch is meant to fly (counted as floating). |
| bubbletea | 0 | 0 | 0 | fixed | Fixed in this batch; its rules hold.  |
| cheesewheel | 0 | 0 | 0 | fixed | Fixed in this batch; its rules hold.  |
| rats | 0 | 0 | 0 | fixed | Fixed in this batch; its rules hold.  |
| winecase | 0 | 0 | 0 | fixed | Fixed in this batch; its rules hold.  |
| alien | 0 | 0 | 0 | none |  |
| balloons | 0 | 0 | 0 | none |  |
| bats | 0 | 0 | 0 | none |  |
| bonsai | 0 | 0 | 0 | none |  |
| cactus | 0 | 0 | 0 | none |  |
| cloud | 0 | 0 | 0 | none |  |
| egg | 0 | 0 | 0 | none |  |
| fruit | 0 | 0 | 0 | none | Owned by claude/fruitbasket (not touched here). |
| globe | 0 | 0 | 0 | none |  |
| goldfish | 0 | 0 | 0 | none |  |
| lavalamp | 0 | 0 | 0 | none |  |
| present | 0 | 0 | 0 | none |  |
| pumpkin | 0 | 0 | 0 | none |  |
| puppy | 0 | 0 | 0 | none |  |
| snowglobe | 0 | 0 | 0 | none |  |
| stolenbust | 0 | 0 | 0 | none |  |
| trophy | 0 | 0 | 0 | none |  |
| waterjugs | 0 | 0 | 0 | none |  |

## TODO: rules for the 84 pending items

Each item on PENDING_AUDIT (cargoRules.js) needs its parts named and its rules written (or `static` with a reason), then
comes off the list (the check holds the list to 84 and lower). First: the high and medium rows above (fix the flicker
pairs at the cause, then lower or drop their KNOWN_ZFIGHTS entry), then the items with things inside things (goldfish
bowl, snowglobe, lavalamp, coffee, sundae, ramen, casserole, fondue, kittens, bees, piranhas, scarabs, nestedboxes).
Stolen Maple Syrup (syrup) and New Neighbour's Fruit Basket (fruit) are being fixed on their own branches
(claude/syrup-fix, claude/fruitbasket): when they merge, give them rules and take them off the list (syrup's known 1 too).
