# Audit: recent gimmicks against level themes (Q21), 12-Oct

Owner: "The level agents are very fond of recent gimmicks. Burst water mains and potholes and tunnels appear
almost every level. It should be thematic." Counts are of the level files as they were before this commit's
removals (a level file's list of that gimmick; the number is how many placed). Levels with none of the five are not
listed (the file count of levels carrying each: burst mains 17, potholes 22, tunnels 19, crosswinds 12 before
Q14's two removals / 10 after, rockfall 11). Taken headlessly from `src/delivery/levels/*.json`.

Columns: mains | potholes | tunnels | crosswinds | rockfall. T = thematic, X = not thematic (REMOVED by the
removal commit that follows), (x) = doubtful, left alone.

| Level | Theme | Mains | Potholes | Tunnels | Wind | Rock | Verdict and reason |
|---|---|---|---|---|---|---|---|
| backlot Quiet on Set | backlot | 3 X | | 1 T | (0, was 1 X) | | mains: a film set has no street mains; wind removed in Q14; tunnel is a soundstage door |
| cattle Cattle Drive | wildwest | | 7 T | | | 2 T | dirt track, canyon walls |
| cinder Cinder Island | volcano | 6 X | 7 T | 1 T | 1 T | 3 T | six mains on a volcano is not the theme; cracks, lava tube, island wind and rockfall are |
| derby Toy Box Derby | toyroom | | 4 X | | | | potholes on a toy carpet make no sense |
| docks Dock Run | port | 2 T | 8 T | 1 T | 1 T | | worn port road, pipes, harbour wind |
| erupt Eruption Day | volcanoErupting | | 5 T | 1 T | | 3 T | cracked ground, rock falls |
| farside Far Side | moon | | 5 T | 1 T | | 3 T | craters, lava tube |
| fjord Fjord Crossing | snow | | | 1 T | | 2 T | Norwegian road tunnels |
| flood High Water | flooded | 5 T | 4 T | | | | the water is the theme |
| gimmick-road, -2, -3 | (showcases) | 2/2/0 | 7/3/0 | 1/0/0 | 0/0/1 | 1/0/0 | showcase levels hold gimmicks on purpose: left |
| glow After Hours | themeparkNight | | | 1 T | | | a ghost-train tunnel |
| grand-pacific Sydney to Kiama | coast | | | | 1 T | | cliff and sea wind |
| harbour Harbour Lights | hongkong | | 3 T | 1 T | | | city roadworks, harbour tunnel |
| hong-kong | hongkong | | | 1 T | | | harbour tunnel |
| hurricane | beach | | | | 1 T | | the storm |
| iceroad Northern Lights | iceroad | 2 X | 5 T | | 2 T | | frost heave and open wind; a main bursting on an ice road is not the theme |
| leaks Twenty Thousand Leaks | seabed | 8 T | 4 (x) | 2 T | | | the leaks are the theme; undersea tunnels |
| market-town Market Town | suburb | 4 T | | | | | town infrastructure |
| moon Tranquility Base | moon | | 11 T | 1 T | | 3 T | craters (many, but they are the surface) |
| morro Favela Heights | favela | 5 (x) | 8 T | 1 T | (0, was 1 X) | | hillside plumbing and rough roads plausible; wind removed in Q14 |
| mountain-pass | snow | | | | | 5 T | rock face above the road |
| mumbai Mumbai Monsoon | mumbai | 6 T | 4 T | | | | monsoon, old roads |
| noon High Noon | wildwest | | 8 T | 1 (x) | 1 T | 2 T | dirt street; a rail tunnel is a stretch but passes |
| park Thrill Park | themepark | 4 (x) | | 1 T | | | fountains and tunnel of love; mains plausible as park plumbing |
| ponti Seven Bridges | venice | 2 (x) | 4 (x) | | 2 T | | cobbles and canals; left alone, doubtful |
| quarry-run | construction | | | | | 2 T | quarry face |
| rice Emerald Steps | rice | 4 T | 7 T | | 1 T | | irrigation, terraced track |
| seaquake Seaquake | seabed | 5 T | | 1 T | | | quake bursts the pipes |
| stelvio Stelvio Pass | snow | | | | 1 T | 6 T | alpine pass |
| stunts Stunt Double | backlot | | 4 X | | | | potholes on a movie set |
| thaw Spring Thaw | iceroadThaw | | 4 T | | 1 T | | frost damage |
| tokyo Tokyo Expressway | tokyo | | | 2 T | 1 T | | expressway tunnels, bridge wind |
| toys Toy Room | toyroom | 1 X | 4 X | 1 (x) | | | no mains or potholes in a toy room; a cardboard tunnel is cute, left |
| venice Acqua Alta | venice | 2 (x) | 3 (x) | 1 X | | | Venice has no road tunnel; mains and potholes left (doubtful) |

## What the removal commit takes out (9 lists in 7 files, 24 placements)

backlot waterMains (3), cinder waterMains (6), iceroad waterMains (2), toys waterMains (1) and potholes (4), derby
potholes (4), stunts potholes (4), venice tunnels (1). Nothing is added. Doubtful ones ((x)) are the owner's call.

## Counts after

Burst mains in 13 level files (was 17), potholes in 19 (was 22), tunnels in 18 (was 19).

## Second removal (the owner: "Remove the above", on the doubtful cases)

Every (x) above that the owner named is now removed too: burst mains on park (4), ponti (2), venice (2), morro (5)
and leaks (8); potholes on ponti (4), venice (3) and leaks (4); the toys tunnel (1). Their verdicts are now X
(removed). Counts after both removals: burst mains in 8 level files, potholes in 16, tunnels in 17. Left as they
were: noon's tunnel, the showcase levels' gimmicks.
