# Cargo z-fighting survey (CHECKLIST 449)

A report, nothing fixed but the Stolen Maple Syrup (`syrup`, now 0 pairs). Every cargo model (`render/cargoModels.js` CARGO_MODELS), built headless, Evil ones in each state (0 calm, 1 agitated, 2 furious), posed at t = 0.3, 1.3, 2.7 and 4.1 s, run through `render/zfight.js` findZFights (planes within 4 mm, overlap over 1 cm2, seen from outside, not from underneath). Only FLICKER-CLASS pairs are listed (two different colours or a textured one; same flat colour pairs left out). `certain`: under 0.5 mm apart (fights at any distance); the rest only fight on a weak depth buffer or far away. A pair found at several times or states is listed once per state with its biggest overlap. Sizes are the overlap in cm2 (the models are about 0.5 to 1 m across). How: a headless survey script (startModels + findZFights), not checked in.

Models with flicker-class pairs: 51.

| cargo | side | pairs | certain | biggest (cm2) |
|--|--|--|--|--|
| surfboard | Good | 10 | 0 | 9236 |
| toolbox | Good | 2 | 0 | 4600 |
| reactor | Evil | 2 | 0 | 2755 |
| goldbar | Evil | 1 | 0 | 2153 |
| winecase | Good | 2 | 2 | 1960 |
| clock | Good | 27 | 0 | 898 |
| jumper | Good | 25 | 16 | 880 |
| pizza | Good | 8 | 0 | 768 |
| inlaws | Evil | 46 | 9 | 763 |
| cheesewheel | Good | 1 | 1 | 665 |
| glitter | Evil | 12 | 0 | 540 |
| goose | Evil | 16 | 0 | 437 |
| mirror | Evil | 20 | 4 | 424 |
| chainletter | Evil | 206 | 72 | 353 |
| recorders | Evil | 39 | 6 | 340 |
| sushi | Good | 16 | 5 | 322 |
| mimic | Evil | 1 | 1 | 308 |
| telescope | Good | 3 | 0 | 306 |
| teaset | Good | 4 | 0 | 304 |
| fireworks | Evil | 16 | 0 | 281 |
| taxmen | Evil | 41 | 15 | 252 |
| consultants | Evil | 30 | 8 | 154 |
| record | Good | 2 | 0 | 149 |
| lawyers | Evil | 1 | 0 | 133 |
| books | Good | 2 | 2 | 120 |
| ink | Evil | 2 | 1 | 109 |
| tentacle | Evil | 7 | 0 | 96 |
| doll | Evil | 2 | 0 | 94 |
| casserole | Good | 4 | 0 | 80 |
| telemarketers | Evil | 13 | 13 | 65 |
| teddy | Evil | 2 | 0 | 45 |
| ghost | Evil | 7 | 0 | 40 |
| fakechips | Evil | 29 | 0 | 37 |
| pokerchips | Good | 57 | 0 | 37 |
| barrel | Evil | 16 | 0 | 37 |
| wardens | Evil | 37 | 20 | 36 |
| bubbletea | Good | 1 | 0 | 35 |
| horseshoes | Good | 30 | 30 | 30 |
| subpoena | Evil | 3 | 0 | 24 |
| scarabs | Evil | 2 | 1 | 21 |
| piranhas | Evil | 3 | 0 | 11 |
| bees | Evil | 10 | 0 | 8 |
| kittens | Good | 3 | 0 | 6 |
| cannonball | Evil | 18 | 0 | 6 |
| ramen | Good | 2 | 0 | 6 |
| spider | Evil | 3 | 0 | 5 |
| bouquet | Good | 2 | 0 | 4 |
| snakes | Evil | 1 | 0 | 2 |
| pancakes | Good | 1 | 1 | 1 |
| radio | Good | 1 | 1 | 1 |
| fondue | Evil | 1 | 0 | 1 |

## The pairs (the 6 biggest a model; state, overlap, gap, where (x, y, z m in the model), the two surfaces' geometry)

- **clock** (Good, 27 pairs): s0 897.6 cm2 3.0 mm at (0.00, 1.15, 0.17) Box / Circle; s0 22.1 cm2 4.0 mm at (0.09, 1.10, 0.17) Circle / Box; s0 5.4 cm2 4.0 mm at (-0.10, 1.11, 0.17) Box / Box; s0 5.4 cm2 1.0 mm at (-0.12, 1.08, 0.17) Circle / Box; s0 5.4 cm2 1.0 mm at (0.14, 1.06, 0.17) Circle / Box; s0 5.4 cm2 1.0 mm at (-0.02, 1.19, 0.17) Circle / Box
- **pizza** (Good, 8 pairs): s0 768.0 cm2 2.5 mm at (0.28, 0.41, -0.17) Box / Box; s0 768.0 cm2 2.5 mm at (0.14, 0.53, 0.32) Box / Box; s0 768.0 cm2 2.5 mm at (0.32, 0.13, -0.09) Box / Box; s0 768.0 cm2 2.5 mm at (-0.31, 0.24, 0.16) Box / Box; s0 768.0 cm2 2.5 mm at (-0.11, 0.32, -0.31) Box / Box; s0 768.0 cm2 2.5 mm at (-0.31, 0.03, 0.14) Box / Box
- **bouquet** (Good, 2 pairs): s0 4.2 cm2 3.5 mm at (-0.20, 1.05, -0.19) Sphere / Sphere; s0 1.4 cm2 3.5 mm at (-0.27, 1.11, 0.08) Sphere / Sphere
- **pancakes** (Good, 1 pairs): s0 1.3 cm2 0.0 mm certain at (0.33, 0.73, -0.13) Cylinder / Cylinder
- **sushi** (Good, 16 pairs): s0 321.8 cm2 0.0 mm certain at (-0.00, 0.47, 0.11) Box / Box; s0 221.0 cm2 0.0 mm certain at (-0.01, 0.31, 0.26) Box / Box; s0 221.0 cm2 0.0 mm certain at (-0.01, 0.32, -0.25) Box / Box; s0 221.0 cm2 0.0 mm certain at (0.02, 0.30, -0.26) Box / Box; s0 221.0 cm2 0.0 mm certain at (0.02, 0.32, 0.25) Box / Box; s0 216.0 cm2 2.0 mm at (-0.05, 0.42, -0.11) Cylinder / Cylinder
- **teaset** (Good, 4 pairs): s0 303.7 cm2 2.0 mm at (-0.33, 0.21, -0.31) Cylinder / Cylinder; s0 303.7 cm2 2.0 mm at (-0.37, 0.21, 0.26) Cylinder / Cylinder; s0 303.7 cm2 2.0 mm at (0.24, 0.23, -0.26) Cylinder / Cylinder; s0 303.7 cm2 2.0 mm at (0.19, 0.21, 0.31) Cylinder / Cylinder
- **record** (Good, 2 pairs): s0 148.8 cm2 1.0 mm at (-0.22, 0.16, 0.39) Box / Circle; s0 42.0 cm2 1.0 mm at (-0.06, 0.28, 0.08) Cylinder / Box
- **ramen** (Good, 2 pairs): s0 5.6 cm2 3.0 mm at (0.33, 0.51, 0.24) Sphere / Sphere; s0 1.5 cm2 3.4 mm at (0.23, 0.50, 0.17) Torus / Sphere
- **surfboard** (Good, 10 pairs): s0 9235.9 cm2 3.0 mm at (-0.05, 0.71, -0.09) Extrude / Extrude; s0 780.0 cm2 2.0 mm at (-0.11, 0.85, -0.14) Extrude / Box; s0 271.4 cm2 1.0 mm at (0.05, 0.98, -0.02) Box / Extrude; s0 271.4 cm2 1.0 mm at (0.12, 0.97, -0.02) Extrude / Box; s0 245.9 cm2 1.0 mm at (0.02, 1.07, -0.07) Extrude / Box; s0 245.9 cm2 1.0 mm at (-0.21, 1.05, -0.06) Box / Extrude
- **toolbox** (Good, 2 pairs): s0 4600.0 cm2 3.0 mm at (0.17, 0.51, -0.26) Box / Box; s0 119.0 cm2 2.0 mm at (0.33, 0.44, 0.16) Cylinder / Cylinder
- **telescope** (Good, 3 pairs): s0 306.1 cm2 2.0 mm at (-0.47, 1.21, 0.45) Cylinder / Circle; s0 60.7 cm2 2.0 mm at (-0.50, 1.21, 0.42) Circle / Circle; s0 60.7 cm2 4.0 mm at (-0.50, 1.22, 0.42) Cylinder / Circle
- **bees** (Evil, 10 pairs): s1 8.2 cm2 2.9 mm at (0.25, 0.99, -0.54) Sphere / Cylinder; s1 8.2 cm2 2.9 mm at (-0.24, 0.77, 0.62) Sphere / Cylinder; s1 8.2 cm2 2.9 mm at (0.05, 1.07, 0.49) Sphere / Cylinder; s0 8.2 cm2 2.9 mm at (0.16, 0.84, -0.43) Sphere / Cylinder; s1 8.2 cm2 2.9 mm at (0.21, 0.75, 0.52) Sphere / Cylinder; s1 8.2 cm2 2.9 mm at (0.03, 1.08, 0.51) Sphere / Cylinder
- **doll** (Evil, 2 pairs): s0 94.5 cm2 0.9 mm at (-0.09, 0.76, 0.15) Sphere / Sphere; s2 5.9 cm2 3.7 mm at (0.06, 1.22, -0.12) Torus / Sphere
- **tentacle** (Evil, 7 pairs): s2 96.0 cm2 1.5 mm at (-0.05, 0.33, 0.31) Box / Box; s2 96.0 cm2 1.5 mm at (-0.01, 0.38, 0.32) Box / Box; s1 96.0 cm2 1.5 mm at (-0.02, 0.33, 0.32) Box / Box; s1 96.0 cm2 1.5 mm at (-0.03, 0.27, 0.31) Box / Box; s0 96.0 cm2 1.5 mm at (-0.03, 0.33, 0.32) Box / Box; s0 96.0 cm2 1.5 mm at (0.03, 0.33, 0.31) Box / Box
- **barrel** (Evil, 16 pairs): s2 36.7 cm2 0.5 mm at (-0.04, 0.40, 0.32) Cylinder / Cylinder; s2 36.7 cm2 0.5 mm at (0.08, 0.40, -0.32) Cylinder / Cylinder; s1 36.7 cm2 0.5 mm at (-0.06, 0.37, -0.32) Cylinder / Cylinder; s1 36.7 cm2 0.5 mm at (-0.06, 0.37, 0.32) Cylinder / Cylinder; s1 36.7 cm2 0.5 mm at (0.07, 0.37, -0.32) Cylinder / Cylinder; s2 36.7 cm2 0.5 mm at (-0.08, 0.39, -0.32) Cylinder / Cylinder
- **mirror** (Evil, 20 pairs): s2 424.0 cm2 3.8 mm at (-0.05, 0.63, -0.03) Circle / Circle; s2 424.0 cm2 3.8 mm at (-0.01, 0.63, 0.03) Circle / Circle; s2 241.8 cm2 3.8 mm at (0.18, 0.84, -0.03) Circle / Circle; s2 241.8 cm2 3.8 mm at (-0.03, 0.97, 0.03) Circle / Circle; s2 241.8 cm2 3.7 mm at (-0.04, 0.86, -0.03) Circle / Circle; s2 241.8 cm2 3.8 mm at (0.19, 0.95, 0.03) Circle / Circle
- **cannonball** (Evil, 18 pairs): s2 5.6 cm2 3.0 mm at (-0.19, 0.33, 0.36) Box / Box; s2 5.6 cm2 3.0 mm at (0.18, 0.54, -0.16) Box / Box; s2 5.6 cm2 3.0 mm at (-0.21, 0.34, -0.34) Box / Box; s1 5.6 cm2 3.0 mm at (-0.05, 0.36, 0.35) Box / Box; s0 5.6 cm2 3.0 mm at (-0.02, 0.32, 0.35) Box / Box; s0 5.6 cm2 3.0 mm at (-0.04, 0.33, -0.35) Box / Box
- **mimic** (Evil, 1 pairs): s2 308.0 cm2 0.0 mm certain at (0.23, 0.64, -0.04) Box / Box
- **fireworks** (Evil, 16 pairs): s2 281.2 cm2 1.9 mm at (0.20, 1.26, -0.15) Cylinder / Cylinder; s2 281.2 cm2 1.9 mm at (-0.02, 0.79, -0.05) Cylinder / Cylinder; s1 281.2 cm2 1.9 mm at (-0.07, 0.73, 0.22) Cylinder / Cylinder; s1 281.2 cm2 1.9 mm at (0.24, 0.72, -0.13) Cylinder / Cylinder; s1 281.2 cm2 1.9 mm at (0.24, 0.72, 0.07) Cylinder / Cylinder; s2 281.2 cm2 1.9 mm at (-0.23, 1.05, 0.01) Cylinder / Cylinder
- **teddy** (Evil, 2 pairs): s1 45.1 cm2 3.5 mm at (0.00, 0.33, 0.21) Sphere / Sphere; s0 45.1 cm2 3.5 mm at (-0.00, 0.33, 0.21) Sphere / Sphere
- **snakes** (Evil, 1 pairs): s2 2.1 cm2 3.1 mm at (-0.43, 0.52, 0.19) Sphere / Sphere
- **reactor** (Evil, 2 pairs): s2 2755.3 cm2 2.5 mm at (0.12, 0.37, 0.18) Cylinder / Cylinder; s0 2755.3 cm2 2.5 mm at (-0.18, 0.14, -0.12) Cylinder / Cylinder
- **goose** (Evil, 16 pairs): s1 437.4 cm2 2.0 mm at (-0.10, 0.30, 0.29) Box / Circle; s0 437.4 cm2 2.0 mm at (-0.10, 0.32, 0.29) Box / Circle; s2 437.4 cm2 2.0 mm at (-0.10, 0.32, 0.29) Box / Circle; s1 364.0 cm2 3.0 mm at (-0.12, 0.34, 0.29) Box / Box; s1 364.0 cm2 3.0 mm at (0.12, 0.17, 0.29) Box / Box; s1 364.0 cm2 3.0 mm at (-0.12, 0.17, -0.29) Box / Box
- **piranhas** (Evil, 3 pairs): s2 11.0 cm2 2.6 mm at (0.17, 1.10, 0.02) Sphere / Sphere; s2 11.0 cm2 2.6 mm at (0.03, 1.00, -0.15) Sphere / Sphere; s2 11.0 cm2 2.6 mm at (-0.11, 0.88, 0.15) Sphere / Sphere
- **lawyers** (Evil, 1 pairs): s2 133.2 cm2 2.0 mm at (0.09, 0.40, -0.32) Box / Circle
- **chainletter** (Evil, 206 pairs): s1 352.8 cm2 1.5 mm at (0.27, 0.30, 0.05) Box / Shape; s0 352.8 cm2 1.5 mm at (-0.03, 0.27, -0.00) Box / Shape; s1 352.8 cm2 1.5 mm at (-0.35, 0.28, 0.01) Box / Shape; s2 352.8 cm2 1.5 mm at (-0.03, 0.57, -0.00) Box / Shape; s0 352.8 cm2 1.5 mm at (-0.04, 0.27, -0.01) Shape / Box; s2 352.8 cm2 1.5 mm at (-0.04, 0.57, -0.01) Shape / Box
- **glitter** (Evil, 12 pairs): s2 540.1 cm2 3.2 mm at (-0.10, 0.39, 0.14) Cylinder / Cylinder; s2 540.1 cm2 3.2 mm at (0.09, 0.22, 0.14) Cylinder / Cylinder; s2 540.1 cm2 3.2 mm at (-0.10, 0.39, 0.14) Cylinder / Cylinder; s2 540.1 cm2 3.2 mm at (-0.10, 0.22, -0.14) Cylinder / Cylinder; s1 529.4 cm2 3.1 mm at (0.11, 0.21, 0.14) Cylinder / Cylinder; s1 529.4 cm2 3.1 mm at (0.11, 0.39, -0.14) Cylinder / Cylinder
- **recorders** (Evil, 39 pairs): s1 340.0 cm2 2.5 mm at (0.37, 0.82, -0.01) Box / Plane; s0 340.0 cm2 2.5 mm at (0.38, 0.81, -0.01) Box / Plane; s2 340.0 cm2 2.5 mm at (0.38, 0.83, -0.01) Box / Plane; s2 7.2 cm2 0.5 mm certain at (-0.09, 0.36, -0.15) Plane / Box; s0 7.2 cm2 0.5 mm certain at (-0.15, 0.34, -0.14) Plane / Box; s1 7.2 cm2 0.5 mm certain at (0.04, 0.33, -0.14) Plane / Box
- **subpoena** (Evil, 3 pairs): s1 23.6 cm2 2.2 mm at (-0.05, 0.35, 0.26) Plane / Box; s1 16.6 cm2 1.1 mm at (0.04, 0.29, 0.26) Plane / Box; s1 16.6 cm2 1.1 mm at (0.04, 0.27, 0.26) Plane / Box
- **telemarketers** (Evil, 13 pairs): s1 64.9 cm2 0.2 mm certain at (-0.01, 0.55, 0.06) Sphere / Sphere; s0 64.9 cm2 0.2 mm certain at (-0.16, 0.44, 0.09) Sphere / Sphere; s0 64.9 cm2 0.2 mm certain at (0.03, 0.45, 0.06) Sphere / Sphere; s2 64.9 cm2 0.2 mm certain at (-0.18, 0.64, 0.09) Sphere / Sphere; s1 64.9 cm2 0.2 mm certain at (-0.20, 0.57, 0.10) Sphere / Sphere; s1 64.8 cm2 0.2 mm certain at (0.15, 0.54, 0.15) Sphere / Sphere
- **taxmen** (Evil, 41 pairs): s1 252.0 cm2 0.0 mm certain at (-0.18, 1.09, 0.33) Box / Box; s2 252.0 cm2 0.0 mm certain at (0.13, 1.23, 0.17) Box / Box; s1 252.0 cm2 0.0 mm certain at (0.21, 1.11, 0.30) Box / Box; s2 252.0 cm2 0.0 mm certain at (-0.19, 0.94, 0.42) Box / Box; s1 8.0 cm2 0.0 mm certain at (0.25, 1.16, 0.25) Box / Box; s1 8.0 cm2 0.0 mm certain at (0.18, 1.17, 0.23) Box / Box
- **wardens** (Evil, 37 pairs): s2 36.0 cm2 1.0 mm at (-0.11, 0.31, 0.45) Box / Circle; s0 36.0 cm2 1.0 mm at (-0.11, 0.29, 0.45) Box / Circle; s1 36.0 cm2 1.0 mm at (-0.11, 0.28, 0.45) Box / Circle; s2 9.7 cm2 1.0 mm at (-0.11, 0.90, -0.13) Box / Torus; s2 4.8 cm2 0.0 mm certain at (-0.65, 0.24, 0.05) Box / Box; s2 4.8 cm2 0.0 mm certain at (0.53, 0.52, 0.03) Box / Box
- **consultants** (Evil, 30 pairs): s1 154.0 cm2 4.0 mm at (-0.32, 0.32, -0.05) Plane / Box; s2 154.0 cm2 4.0 mm at (-0.31, 0.34, -0.05) Plane / Box; s0 154.0 cm2 4.0 mm at (-0.31, 0.32, -0.05) Plane / Box; s2 81.0 cm2 4.0 mm at (-0.05, 0.87, 0.06) Box / Plane; s2 81.0 cm2 4.0 mm at (-0.09, 0.84, 0.06) Box / Plane; s2 81.0 cm2 4.0 mm at (0.07, 0.79, 0.07) Box / Plane
- **inlaws** (Evil, 46 pairs): s1 762.9 cm2 2.1 mm at (-0.13, 0.21, 0.26) Box / Box; s1 762.9 cm2 2.1 mm at (-0.13, 0.10, -0.26) Box / Box; s1 762.3 cm2 2.1 mm at (0.12, 0.21, -0.26) Box / Box; s2 756.0 cm2 2.1 mm at (-0.12, 0.21, 0.25) Box / Box; s2 756.0 cm2 2.1 mm at (-0.12, 0.10, -0.25) Box / Box; s2 756.0 cm2 2.1 mm at (-0.13, 0.21, 0.25) Box / Box
- **casserole** (Good, 4 pairs): s0 80.0 cm2 2.0 mm at (0.15, 0.38, 0.04) Plane / Plane; s0 60.0 cm2 2.0 mm at (0.37, 0.24, 0.05) Plane / Plane; s0 60.0 cm2 2.0 mm at (-0.37, 0.23, -0.03) Plane / Plane; s0 60.0 cm2 2.0 mm at (-0.37, 0.25, -0.02) Plane / Plane
- **kittens** (Good, 3 pairs): s0 5.9 cm2 2.5 mm at (0.02, 0.49, -0.08) Cone / Cone; s0 5.9 cm2 2.5 mm at (-0.07, 0.44, 0.11) Cone / Cone; s0 5.9 cm2 2.5 mm at (-0.19, 0.49, 0.05) Cone / Cone
- **jumper** (Good, 25 pairs): s0 880.0 cm2 2.0 mm at (0.07, 0.77, -0.07) Box / Box; s0 880.0 cm2 2.0 mm at (-0.06, 0.76, 0.07) Box / Box; s0 132.0 cm2 2.0 mm at (0.07, 0.79, -0.07) Box / Box; s0 132.0 cm2 2.0 mm at (-0.06, 0.73, 0.07) Box / Box; s0 132.0 cm2 2.0 mm at (-0.06, 0.79, 0.08) Box / Box; s0 132.0 cm2 2.0 mm at (0.06, 0.73, -0.08) Box / Box
- **books** (Good, 2 pairs): s0 120.0 cm2 0.5 mm certain at (0.09, 0.37, 0.03) Box / Box; s0 70.0 cm2 0.5 mm certain at (0.11, 0.37, 0.08) Box / Plane
- **radio** (Good, 1 pairs): s0 1.2 cm2 0.0 mm certain at (0.19, 0.30, 0.16) Box / Box
- **ghost** (Evil, 7 pairs): s0 40.0 cm2 1.0 mm at (0.18, 0.09, 0.36) Box / Box; s2 40.0 cm2 1.0 mm at (0.18, 0.30, 0.36) Box / Box; s1 40.0 cm2 1.0 mm at (0.18, 0.08, 0.36) Box / Box; s1 3.8 cm2 1.2 mm at (0.52, 0.94, 0.11) Box / Torus; s1 3.8 cm2 1.2 mm at (0.54, 0.94, 0.11) Box / Torus; s1 1.2 cm2 0.9 mm at (0.51, 0.94, 0.11) Box / Torus
- **spider** (Evil, 3 pairs): s2 5.1 cm2 1.1 mm at (0.08, 0.20, 0.57) Plane / Circle; s1 4.2 cm2 1.0 mm at (0.20, 0.47, 0.70) Plane / Circle; s0 4.2 cm2 1.0 mm at (0.19, 0.65, 0.60) Plane / Circle
- **ink** (Evil, 2 pairs): s1 109.3 cm2 0.0 mm certain at (0.26, 0.03, -0.07) Box / Box; s2 19.0 cm2 3.2 mm at (-0.21, 0.28, 0.04) Sphere / Sphere
- **winecase** (Good, 2 pairs): s0 1960.0 cm2 0.0 mm certain at (-0.43, 0.11, 0.11) Box / Box; s0 1960.0 cm2 0.0 mm certain at (0.43, 0.11, -0.10) Box / Box
- **scarabs** (Evil, 2 pairs): s1 21.0 cm2 0.3 mm certain at (-0.35, 0.40, -0.08) Box / Box; s1 14.1 cm2 1.6 mm at (0.36, 0.40, 0.26) Box / Box
- **bubbletea** (Good, 1 pairs): s0 34.5 cm2 3.4 mm at (0.06, 0.48, 0.16) Cylinder / Cylinder
- **horseshoes** (Good, 30 pairs): s0 30.0 cm2 0.0 mm certain at (0.41, 0.47, 0.35) Box / Box; s0 30.0 cm2 0.0 mm certain at (0.42, 0.45, -0.35) Box / Box; s0 30.0 cm2 0.0 mm certain at (0.43, 0.18, 0.35) Box / Box; s0 30.0 cm2 0.0 mm certain at (-0.44, 0.34, 0.35) Box / Box; s0 30.0 cm2 0.0 mm certain at (0.44, 0.45, 0.33) Box / Box; s0 30.0 cm2 0.0 mm certain at (0.42, 0.16, -0.35) Box / Box
- **goldbar** (Evil, 1 pairs): s0 2153.0 cm2 3.8 mm at (0.47, 0.54, 0.08) Box / Box
- **pokerchips** (Good, 57 pairs): s0 37.5 cm2 2.0 mm at (0.04, 0.51, 0.02) Cylinder / Cylinder; s0 37.5 cm2 2.0 mm at (0.23, 0.33, 0.07) Cylinder / Cylinder; s0 37.5 cm2 2.0 mm at (0.23, 0.30, 0.07) Cylinder / Cylinder; s0 37.5 cm2 2.0 mm at (0.23, 0.28, 0.07) Cylinder / Cylinder; s0 37.5 cm2 2.0 mm at (0.23, 0.37, 0.07) Cylinder / Cylinder; s0 37.5 cm2 2.0 mm at (0.23, 0.26, 0.07) Cylinder / Cylinder
- **fakechips** (Evil, 29 pairs): s2 37.5 cm2 2.0 mm at (0.14, 1.06, -0.33) Cylinder / Cylinder; s2 37.5 cm2 2.0 mm at (-0.09, 0.76, 0.52) Cylinder / Cylinder; s2 37.5 cm2 2.0 mm at (0.46, 1.13, -0.01) Cylinder / Cylinder; s2 37.5 cm2 2.0 mm at (0.71, 0.40, 0.13) Cylinder / Cylinder; s2 37.5 cm2 2.0 mm at (0.26, 1.11, 0.31) Cylinder / Cylinder; s2 37.5 cm2 2.0 mm at (-0.15, 1.13, 0.22) Cylinder / Cylinder
- **cheesewheel** (Good, 1 pairs): s0 664.6 cm2 0.0 mm certain at (0.25, 0.30, 0.16) Cylinder / Cylinder
- **fondue** (Evil, 1 pairs): s2 1.1 cm2 3.5 mm at (-0.03, 0.78, 0.13) Sphere / Sphere

## Evil cargo whose agitated / furious parts reach outside the calm model (a crude screen, NOT reviewed)

A mesh (opaque) of the agitated (1) or furious (2) pose whose box reaches beyond the calm pose's whole box (sides and top) by more than max(3 cm, 6% of its diagonal). This catches every intended escape too (creatures leaping out, lids blown, jets, puffs): it is a list to look through, not a list of faults. 45 of the Evil models trip it, so it does not single out a poke-through; a real containment check needs each model's container named (its shell, cage, bottle) and its contents tested against it, which was not done. `syrup`'s one entry is its blown cap (intended); its jet stays within the tolerance of the calm box's sides and never enters the tin (.syrup-check).

| cargo | tolerance (m) | state:geometry -> how far beyond (m) |
|--|--|--|
| porcupine | 0.10 | 1:Cone 0.35, 2:Sphere 0.17, 2:Cone 0.60 |
| bees | 0.10 | 1:Sphere 0.24, 1:Cylinder 0.24, 1:Cone 0.22, 2:Box 0.35, 2:Sphere 0.67, 2:Cylinder 0.64, 2:Cone 0.64 |
| doll | 0.09 | 1:Sphere 0.18, 2:Capsule 0.17, 2:Sphere 0.45, 2:Circle 0.22, 2:Box 0.25, 2:Torus 0.11, 2:Cone 0.11 |
| tentacle | 0.08 | 1:Cylinder 0.39, 1:Sphere 0.54, 2:Cylinder 1.34, 2:Sphere 0.99 |
| egg | 0.11 | 1:Sphere 0.16, 2:Sphere 0.41, 2:Cone 0.39, 2:Box 0.33, 2:Cylinder 0.12, 2:Shape 0.39 |
| cooker | 0.11 | 2:Sphere 0.22, 2:Cylinder 0.15 |
| flytrap | 0.10 | 1:Sphere 0.13, 2:Sphere 0.38, 2:Circle 0.34, 2:Cone 0.32, 2:Cylinder 0.11 |
| barrel | 0.10 | 2:Cylinder 0.34, 2:Sphere 0.40 |
| mirror | 0.10 | 2:Capsule 0.29, 2:Sphere 0.40, 2:Cone 0.46 |
| cannonball | 0.12 | 2:Sphere 0.63, 2:Cylinder 0.19 |
| mimic | 0.07 | 1:Sphere 0.28, 1:Cylinder 0.25, 1:Box 0.32, 2:Box 0.61, 2:Cone 0.44, 2:Sphere 0.59, 2:Cylinder 0.60 |
| fireworks | 0.15 | 2:Sphere 0.20 |
| alien | 0.10 | 2:Sphere 0.87, 2:Cylinder 0.73, 2:Torus 0.57 |
| teddy | 0.09 | 1:Capsule 0.10, 1:Sphere 0.13, 2:Sphere 0.30 |
| bats | 0.10 | 1:Shape 0.28, 2:Shape 0.71, 2:Sphere 0.19, 2:Torus 0.10, 2:Cone 0.18 |
| ice | 0.09 | 1:Sphere 0.09, 2:Sphere 0.31, 2:Cone 0.51, 2:Capsule 0.24 |
| snakes | 0.08 | 1:Sphere 0.38, 1:Box 0.41, 2:Torus 0.28, 2:Sphere 0.58, 2:Box 0.54 |
| genie | 0.10 | 2:Cylinder 0.42, 2:Sphere 0.83, 2:Torus 0.70, 2:Box 0.64, 2:Cone 0.91, 2:Capsule 0.65 |
| reactor | 0.12 | 2:Cylinder 0.20, 2:Sphere 0.33, 2:Torus 0.36, 2:Box 0.70 |
| goose | 0.08 | 1:Box 0.50, 1:Sphere 0.53, 1:Cone 0.46, 2:Box 0.77, 2:Sphere 0.82, 2:Cone 0.71, 2:Cylinder 0.16 |
| jack | 0.09 | 1:Sphere 0.31, 1:Box 0.40, 2:Box 0.49, 2:Torus 0.28, 2:Capsule 0.21, 2:Sphere 0.81, 2:Cone 0.80 |
| cloud | 0.10 | 2:Box 0.39 |
| piranhas | 0.10 | 2:Sphere 0.54, 2:Cone 0.61, 2:Box 0.27 |
| lawyers | 0.15 | 2:Plane 0.54, 2:Box 0.16 |
| chainletter | 0.11 | 2:Box 0.32, 2:Shape 0.30, 2:Cylinder 0.16 |
| glitter | 0.13 | 2:Cylinder 0.62, 2:Torus 0.50, 2:Sphere 0.44 |
| recorders | 0.10 | 2:Box 0.13, 2:Plane 0.10 |
| subpoena | 0.09 | 1:Plane 0.18, 2:Box 0.43, 2:Cylinder 0.45, 2:Sphere 0.43 |
| telemarketers | 0.10 | 2:Box 0.16, 2:Cone 0.11, 2:Sphere 0.15 |
| taxmen | 0.11 | 1:Cylinder 0.17, 1:Sphere 0.30, 1:Box 0.39, 1:Plane 0.41, 2:Sphere 0.34, 2:Cylinder 0.23, 2:Box 0.76, 2:Plane 0.79, 2:Torus 0.12 |
| wardens | 0.13 | 2:Cylinder 0.17, 2:Sphere 0.30, 2:Torus 0.39, 2:Box 0.37 |
| consultants | 0.14 | 2:Cylinder 0.18, 2:Plane 0.28 |
| inlaws | 0.08 | 1:Cylinder 0.24, 1:Torus 0.10, 2:Sphere 0.86, 2:Torus 0.95, 2:Cylinder 1.05, 2:Box 1.00, 2:Circle 0.22 |
| band | 0.10 | 1:Cylinder 0.22, 1:Torus 0.25, 1:Sphere 0.39, 1:Box 0.43, 1:Cone 0.10, 2:Cylinder 0.29, 2:Torus 0.32, 2:Sphere 0.42, 2:Box 0.46, 2:Cone 0.10 |
| piecatapult | 0.15 | 2:Cylinder 0.17 |
| airhorn | 0.11 | 2:Cylinder 0.15, 2:Torus 0.20, 2:Box 0.63, 2:Sphere 0.66 |
| ghost | 0.07 | 1:Lathe 0.62, 1:Cylinder 0.11, 1:Sphere 0.64, 1:Capsule 0.24, 1:Box 0.72, 1:Cone 0.64, 1:Torus 0.69, 2:Lathe 1.27, 2:Cylinder 0.14, 2:Sphere 1.24, 2:Capsule 0.93, 2:Box 1.47, 2:Cone 1.18, 2:Torus 1.42 |
| nestedboxes | 0.08 | 1:Box 0.75, 1:Cone 0.35, 1:Sphere 0.29, 1:Plane 0.46, 2:Box 1.16, 2:Cone 0.35, 2:Sphere 0.29, 2:Plane 1.18 |
| spider | 0.12 | 2:Capsule 0.19, 2:Cylinder 0.17 |
| ink | 0.10 | 2:Circle 0.22 |
| syrup | 0.21 | 2:Cylinder 0.41 |
| scarabs | 0.07 | 1:Sphere 0.11, 1:Cone 0.16, 1:Box 0.10, 2:Box 0.78, 2:Sphere 0.77, 2:Cone 0.71 |
| hamsterball | 0.09 | 2:Torus 0.44, 2:Cylinder 1.13, 2:Sphere 0.55 |
| goldbar | 0.15 | 2:Box 0.45 |
| rats | 0.08 | 2:Sphere 0.26, 2:Cone 0.26 |
