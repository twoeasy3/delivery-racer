// ============================================================================
// LEVELS - plain data, one JSON file per level in ./levels// live in its own .json file. Everything is positioned by distance along the road, in metres
// from the start line, plus a lane number; nothing is in world coordinates.
//   segments   the expressway's shape: length (m), curve (radians per metre, + = right; a hairpin
//              is a bend turning pi radians, no tighter than the road is wide) and,
//              optionally, grade (rise per metre: 0.03 is a 3% climb, negative goes downhill).
//              ease: m each way over which this segment's slope blends into the next (CONFIG.gradeEase if not
//              said). A steep climb and a steep drop after it, each with a short ease (6, say), make a crest sharp
//              enough that a fast car leaves the ground over it: see CONFIG.crest and gambles.js.
//              A side road follows the land (exactly as high as the expressway where it runs beside it; away from it, a
//              slope of its own, no steeper than CONFIG.ramps.steepest) and a flyover stands on it. Bridges must be on level road.
//   drive      'right' (default) or 'left': the side the traffic keeps to. Everything else in the
//              level is written as if driving on the right (lanes, exits, turns, sides), and a
//              left-hand level is shown as its mirror image: a "right" turn is seen as a left one
//   junctions  { s, turn, forward, turnOff }: a crossroads, its bend (or box) starting at s; turn:
//              'left' | 'right' (the road turns a quarter there: the level's segments must have the
//              bend) or 'straight'. See CONFIG.junction
//   lanes      the expressway's lanes: a number, half each side of the centre line, an odd one
//              over on the right (default CONFIG.laneCount); or { north, south }: how many on the
//              right, going the player's way, and on the left, oncoming
//   median     neutral lanes down the middle of a two-way road, which no traffic uses
//   railway    { every: { min, max } }: a railway down the median (it needs one), with a bullet
//              train coming through, against the player, every min-max s
//   flow       'north' = every vehicle goes the player's way, 'south' = every vehicle comes
//              the other way; either way the traffic uses all the lanes. 'mixed' = both ways, and
//              every lane open to either (the Battlefield: oncoming traffic in every lane). Left out, the left
//              half of the road is oncoming. A one-way level's exits can't have flyovers (a flyover brings
//              oncoming traffic over from the expressway's oncoming side, and a one-way road has none). On a
//              'south' level only the player takes an exit: its side road has traffic of its own only with oncoming: true.
//   shoulderRows  { kind, from, to, every, side } a row of obstacles standing on the
//              shoulder, one every `every` metres. kind: 'cone' | 'sign' (or any obstacle
//              kind); side: 'left' | 'right' | 'both' (default). Exit and merge lanes are left clear.
//   shoulderTimer  false = no danger timer: the shoulders can be driven on freely, and
//              police cars don't bust for it either; 'mud' = the same, but only in the level's mud
//   helicopter false = the rescue and police helicopters are not drawn (they still act)
//   narrows    stretches where each side of the expressway drops to `lanesPerSide` lanes; with side: 'left' or
//              'right', only that side does (the level's "lanes" are the most each way ever has: a way that
//              gains a lane further on is narrowed until then)
//   splits     { from, to, apart? }: a two-way road's two ways part: the oncoming side swings away to the left,
//              runs on by itself `apart` m off (CONFIG.split.apart if not said), and comes back in. Nothing
//              crosses the centre line while they are apart
//   bridges    stretches where a bridge's structure stands on both shoulders
//   exits      side roads: an exit lane opens beside the right-hand lane before `exitAt`,
//              where the side road forks off; it comes back as a merge lane at `mergeAt`.
//              The side road's shape is worked out from those two points, so it always
//              joins up; the expressway has to swing away in between. Whatever the expressway does, the
//              side road parts from it as a real one does: CONFIG.ramps.apart m or more from its lanes,
//              that gap opening over ramps.part m from the fork and closing over as many to the merge
//              (the fork's and the merge's markings, nose and chevrons: see render/road.js).
//              Its shoulders are as wide as the level's, and the theme's scenery keeps off it.
//              Whatever a level puts at a place can be on a side road: { ..., road: 'side', exit: n } (n: which
//              exit, 0 if not said), its s (or from and to) then m along the side road. Pickups and obstacles
//              (lane: any of its lanes open there, 0 to 3, or 'left' / 'right', its shoulders), targets,
//              tractors, herds, frogs, dropBears, landmines, rockfall, pelotons, migration, cameras,
//              crossings, potholes, and the hazards of hazards.js (schoolCrossings, drawbridges, waterMains,
//              balloons, wideLoads, marathons, trolleys, stampedes). Not (the level reports it): ice, mud, fog,
//              stopGo, parked, roadblocks, iceCreamStops, reversible, wreckage, machinery, siteWorks, parades,
//              hippos, elephants, quarries, tunnels and bridges, which are made for the expressway's lanes.
//              An exit can shape its side road (see track.js): out: m its middle is pushed out, away from
//              the expressway; bends: { count, size }: that many bends in a row, each `size` m off its line.
//              Or segments: [{ length, curve }], as the level's own, from the exit on: the side road follows
//              them, and a curve of its own making brings it from where they end to the merge.
//              lanes: how many lanes wide it is between its ramps (2 if not said, 4 at most), or
//              [{ at, count }] to widen and narrow it along the way (at: m along the side road).
//              oncomingFrom: m along it from which its left lane (lane 0) is oncoming and the double yellow
//              line is drawn; before that, every lane goes the player's way.
//              oncoming: true / false: whether its other lane carries traffic coming the other way (if not
//              said: on a two-way level it does, on a one-way one it doesn't). That traffic just turns up at
//              one end and is gone at the other, unless the exit has flyovers: true (a two-way level only):
//              a flyover at each end carries it over from the expressway and back, and the expressway then
//              has to be straight for 250 m before the exit and after the merge (room for them).
//              Limits the level reports: the merge at least 2 ramps and 100 m after the exit; bends no tighter than
//              CONFIG.ramps.tightest; 9 km long at most; 1 to 4 lanes, only lane 0 ever oncoming; no bridge,
//              narrowing or tunnel over its ramps; no exit on a level with a tide.
//   pickups    { type, s, lane }   type: turbo | ghost | wrench | passenger | mystery | radarDetector | siren
//                                       | badGas | heavyMass | timePlus | timeMinus
//   theme      'city' (default), 'bathurst' (Mount Panorama: a mountain), 'panorama' (the same, as a road through the bush), 'montreal' (Circuit Gilles-Villeneuve's island: its landmarks 'river', 'basin',
//              'casino', 'biosphere', 'skyline'), 'sea' (open water, unmarked, the edges blocked by rocks and buoys), 'farm', 'beach', 'suburb', 'canberra', 'snow', 'singapore', 'singaporeNight', 'coast' (in zones), 'safari' (in zones: a dirt road, unmarked), 'airport', 'construction', 'flooded' (the city under flood water, in the rain), 'toyroom' (the level at toy scale, on a playroom floor), 'seabed' (an underwater tunnel: the road in a glass tube on the sea bed), 'moon' (a moon base: regolith, craters, domes, the Earth in a black sky), 'hell' or 'space': the look of the ground, sky and roadside.
//              'snow' is a mountainside: land that climbs and falls with the road and fills in between its switchbacks.
//              In space there is no ground and no road surface, only the lane lines.
//   car        a special vehicle the level is driven in whatever is in the garage ('ufo', 'f1')
//   alwaysGood true = the player is Good on it, whatever the side picked on the menu (as on the Battlefield)
//   cargo      { good, evil }: what the player is delivering, for each side (the ids of cargo.js: good 'pizza' |
//              'cake' | 'goldfish' | 'cactus' | 'clock'; evil 'parcel' | 'porcupine' | 'bees' | 'doll' | 'tentacle').
//              Only a sight: it rides in a corner of the HUD and is set down at the kerb at the end, and the menu names
//              it on the stage. A built-in level's cargo is kept in levelText.json, with its name and description (the
//              file's first, a side at a time; this field is the fallback: levelText.js, cargo.js); an id that is no
//              item is passed over. Left out (or either side of it), the level's place on the menu deals one. Races
//              and the Battlefield carry nothing
//   grid       { count, kind, gap, pace: { min, max }, from }: a race. `count` cars of that kind on a
//              grid, two by two, `gap` m apart, ahead of the player, all the player's way, half of them
//              evil, each at its own share (pace) of the player's car's top speed; they race on,
//              never recycled. (The HUD shows the player's position.) A race usually also has:
//   noPackages true = nobody throws packages
//   understeer true = every car understeers in bends as on ice (and none slows for a bend by itself)
//   wallDamage true = a car going sideways into the road's edge takes damage (see CONFIG.race)
//   nudge      true = a car steering into another's side knocks it aside
//   landmarks  { kind, x, z, r, rot }: landmarks where they really are, in the world (Singapore's look:
//              'bay', 'flyer', 'mbs', 'esplanade', 'fullerton', 'merlion', 'padang', 'gardens',
//              'artscience', 'helix' (r: half its length), 'float', 'cbd', 'suntec', 'gallery', 'domes'); r m
//              round each is kept clear of the town; rot: which way it faces
//   gunfire    [{ from, to, every? }]: a gang's turf, where the houses beside the road shoot (see gunfire.js);
//              every: { min, max } s between bursts, if not CONFIG.gunfire.every
//   rival      'opposite' | 'evil' | 'good': a rival courier races the player to the drop (see Game.start;
//              ?rival puts one on any delivery level, to try it out)
//   rivals     [{ name, car, colors: ['#body', '#stripe'], mark: '#marker' }]: up to three rival couriers
//              (each on the level's "rival" side), with names, cars and colour schemes of their own
//   shoulder   m of shoulder each side of the road, if not CONFIG.shoulder (a street circuit's walls close by)
//   runoff     { from, to, side, width }: the shoulder on that side `width` m wider over that stretch (run-off
//              on the outside of a corner, where a circuit has it), easing in and out. With an "end" as well
//              ({ from, to, side, width, end }) it tapers in a straight line from `width` m at `from` to `end` m
//              at `to` instead, with no easing: one tapering trap is one stretch, and stretches laid end to
//              end, each starting at the width the last ended at, make a smooth wall line (what
//              scripts/circuit-from-osm.mjs writes)
//   gravel     { from, to, side, inner?, outer?, innerEnd?, outerEnd? }: a gravel trap: over that stretch, that side's
//              shoulder and run-off is a bed of gravel from `inner` m outside the outer lane's edge (if not given,
//              CONFIG.gravel.inner: a strip of asphalt comes first) out to `outer` m, or to the wall where that is
//              nearer or no outer is given. innerEnd / outerEnd: the edges at `to`, if not the same (they run
//              straight between). A car in it is slowed hard, the harder the faster, steers poorly, and is beached
//              for a moment if it stops (CONFIG.gravel); race and traffic cars are slowed too. Usually with a
//              "runoff" of the same stretch: without one there is only the shoulder to put it in
//   stands     { from, to, side, pits }: grandstands along that stretch (pits: the pit garages instead)
//   laps       the number of laps of a race round a circuit: the road must come back round to where it
//              starts, facing the same way (a closed loop, checked as the level loads)
//   traffic    which vehicles turn up as traffic and how often, relative to each other:
//              { "darkvan": 0.44, "van": 0.18, "police": 0.1 }. The kinds are those in
//              CONFIG.vehicles. An empty list ({}) means no traffic at all.
//              Keep the police light (a share of about 0.03 to 0.04): the levels from Speed Trap Alley on do.
//              For a stretch with no police at all (and a buffer either side, so none can see into it), give
//              the police only in trafficZones round it: a police car stays on station at a zone's edge
//   trafficCount, oncomingCount  how many vehicles are about at once, each way (defaults in
//              CONFIG; together no more than CONFIG.trafficPool)
//   drivers    { evil, happy, angry }: the share of drivers that are evil, and the chance a
//              driver starts out happy or angry (defaults: CONFIG.evilShare and startMood); or for
//              each side, goodMood / evilMood: { happy, angry }
//   trafficSpeed  { min, max } m/s the traffic cruises at (default CONFIG.trafficMin/MaxSpeed)
//   emergencies  { every: { min, max } }: now and then (every min-max s) an ambulance comes
//              through, siren going, either way (see CONFIG.emergency)
//   pursuits   { every: { min, max } }: now and then (every min-max s) a police pursuit comes through from behind,
//              a getaway car flat out and an interceptor after it, siren going (see CONFIG.pursuit and
//              pursuit.js). Not on a race, the Battlefield, or an all-oncoming road
//   hesitation false = traffic too fast for the player never hesitates, and none comes up from
//              behind (see CONFIG.hesitation)
//   asteroidFields  { from, to, count, moving, seed }: `count` asteroids of assorted sizes
//              scattered over that stretch, the same every run for a given seed. About half
//              sit at road level; the rest pass just under or over it, unmarked. `moving` is the share that
//              drift across the road or bob up and down through it.
//   (an obstacle's or a pickup's lane can also be 'left' or 'right': on that shoulder)
//   obstacles  { s, lane, kind }   things on the road that explode when hit. kind: 'barrier'
//                                  (default), 'railBarrier' (one the bullet train leaves standing),
//                                  'bale', 'cone', 'sign', the construction site's 'potty',
//                                  'sewage', 'pile' and 'beam', or the beach's 'umbrella',
//                                  'surfboard', 'cooler' and 'chair' (a lifeguard chair), or 'mine' (a sea mine, afloat).
//                                  With drift: 'dart', it darts about its spot at random (see CONFIG.drifters)
//                                  A theme can have obstacles of its own (themes.js, its `obstacles`): there a
//                                  level's 'crate' is a barrel (the Wild West), a diving helmet (the sea bed), a
//                                  supply pod (the Moon)...: the same box and the same cost, only the thing itself
//                                  differing; so a level names the plain kind and its theme does the rest (in its
//                                  shoulderRows and drifters too). Those kinds can be named outright as well:
//                                  'toyBlock', 'skittle', 'divingHelmet', 'supplyPod', 'directorChair',
//                                  'cameraDolly', 'mooringPosts', 'fuelDrum', 'popcornCart', 'barrel',
//                                  'chairStack', 'riceBasket', 'present', 'toyDrum', 'sackStack', 'beachBall',
//                                  'tumbleweed', 'cafeTable', 'wheelieBin', 'snowdrift', 'brimstone', 'flagStand',
//                                  'lavaRock' (the volcano's rock), 'wasteDrum' (the fallout zone's). All of them are on the Gimmicks page, last,
//                                  under Road dressing (gimmicks.html?group=road-dressing)
//   dropBears  { from, to, count } drop bears up in the trees over that stretch, dropping onto the
//              road as the player comes near (see CONFIG.dropBear)
//   herds      { from, to, count, kind } animals wandering back and forth across that stretch: cows,
//                                  or (kind: 'kangaroo') kangaroos bounding across, with a warning sign before
//   drifters   { from, to, kind, count, pattern } obstacles of that kind moving about the road
//              in a pattern: 'circle', 'zigzag' (along the road, weaving), 'sweep' (across
//              and back), 'figure8' or 'dart' (no pattern: sitting, then darting off anywhere
//              across, at random: see CONFIG.drifters). They are hit like any obstacle of their kind.
//   storm      { from, to, count, seed } vehicles blown through the air above that stretch,
//              tumbling, looping round when they reach its end. Only a sight: nothing can hit them.
//   tractors   { s, lane }         a tractor: slow traffic that starts from that spot every run
//   parked     { s, side }         a car parked on that shoulder ('left' | 'right'), hazards on, every run
//   zones      { id, from, to, scenery, ground, sky, sea }: stretches of the level with a look of their
//              own (on a level whose theme is 'zones': see render/road.js). The player is welcomed into
//              each (messages.json: zones, by id). (Their traffic: see trafficZones)
//   quietZones [{ from, to, density }]: stretches with less traffic (a narrow bridge with no shoulder): only
//              `density` (0-1) of the cars that would turn up there do; the rest turn up elsewhere
//   trafficZones [{ from, to, traffic: { kind: weight } }]: stretches where the traffic turning up is
//              different: each sets the weights of the kinds it names over the level's "traffic" (0 takes
//              a kind away), a later one over an earlier. With police only in such stretches, a police
//              car stays on station at the edge of its stretch (The Hood)
//   ice        { from, to, lane }  an ice patch on that lane (no lane: across the road): on it the car brakes
//              with a share of its brakes and changes lane more slowly (see CONFIG.ice: brakeGrip, steerGrip, laneSpeed)
//   tide       { from, to, start, end, waves: { every: { min, max }, reach: { min, max } } }: a causeway
//              the sea comes in over, on the player's side of the road only, from the kerb in. It
//              floods `start` lane widths in from the pavement's edge (the shoulder counts as one)
//              at the start of a run, rising to `end` as the clock runs down; every min-max s a
//              wave (warned of) floods a stretch `reach` lanes further for a few seconds, then
//              drains right out, leaving the road bare a while. washUp: { types: { type: share },
//              count: { min, max } }: pickups each wave leaves in the water. On a two-way road
//              with no exits. See tide.js and CONFIG.tide
//   water      [{ from, to, current? }]: water stages: over each stretch the road IS water: the pavement runs down a
//              slipway into a channel as wide as the road and back up one at the far end, the lanes carrying on as
//              lanes, marked by buoys. A car that floats drives in at speed and goes on as a boat (slower, softer
//              to steer: nothing stops it); traffic that can't float waits in a queue on its own shoulder short of
//              the water, every lane left open; amphibious traffic (a vehicle's "amphibious") drives in and out;
//              boats (a vehicle's "boat") are only ever on the water, and tie up at its bank at the end of it.
//              current: m/s^2 the water carries a car afloat sideways (+ = to the right). from below 0 or to beyond
//              the finish: a level that starts, or ends, afloat. On level road, clear of exits, junctions, splits
//              and tunnels, each 78 m long at least, and only on an amphibious level. See water.js, CONFIG.water
//   amphibious true = an amphibious level: it can only be started in an amphibious car (a car's "amphibious": the
//              garage's Amphibious section), whichever of them the player owns and picks; the menu says so
//   frogs      { from, to }        a stretch of road that a large frog roams all over
//   mud        { from, to }        a stretch where the road gives way to mud: a car is slowed in it as
//                                  on a railway track, by how well it crosses (see CONFIG.mud)
//   potties    { s, pattern, lanes, period, phase }: a row of portaloos across those lanes, dancing
//              together: 'hop', 'wave', 'slide', 'shuffle', 'stomp' or 'spin' (see Collision; obstacles,
//              blown open when hit, and passed underneath while up in the air)
//   machinery  { s, kind }         a bulldozer, excavator or dumpTruck trundling across the road and back
//                                  there: solid, a heavy knock to run into (see machinery.js); or a
//                                  { kind: 'roller', from, to, side } crawling along a shoulder, or a
//                                  { kind: 'forklift', s, side } backing out onto one and off again
//   siteWorks  { kind, ... }       the work on a construction site's shoulders: trenches, swinging
//                                  excavators, workers with barrows, stacks of pipes (see site.js)
//   migration  { from, to, count, kinds: { kind: share }, dir }: a great herd (kinds: 'wildebeest',
//              'zebra') streaming across the road over that stretch, one way (dir: 1 = to the
//              right), and round again: obstacles, blown up when hit (see CONFIG.migration)
//   elephants  { from, to, count }: elephants plodding across the road and back over that stretch:
//              whatever one walks into is destroyed, traffic included (see elephants.js)
//   wreckage   { at, kind, lanes: [first, last], from, trigger, slide }: scripted destruction, set off
//              as the player comes within trigger m (default CONFIG.wreckage.trigger): something goes
//              up beside the road (from: 'left' | 'right') or falls out of the sky ('sky'), and its
//              wreckage lands across those lanes at `at`, wrecking all there, blocking them for good.
//              kind: 'tanker' | 'containers' | 'boulders' | 'hangar' | 'plane' | 'airliner' (an airliner comes in
//              to land `slide` m beyond `at` and slides back to it). Traffic pulls over for it.
//              Or 'blast': a building `distance` m off the road on its side (from) blows out across
//              its lanes out to the road's edge, wrecking all there just then, and leaves the road clear;
//              it goes by the player's pace (see CONFIG.wreckage.blastWarn), not a trigger: with
//              "ahead" (s), that much sooner, out of the player's reach unless the player speeds up.
//              rock: true makes a blast a quarry's: a crag of the rock face blasted out, rock and dust, not a building
//   quarries   { from, to, side, floor? }: (the construction theme) a quarry beside the road over that stretch, on that
//              side ('left' | 'right'): its floor, its rock face cut back in benches, crusher, heaps and trucks
//              (only scenery; see CONFIG.quarry). floor: m off the road its face starts, if not CONFIG.quarry.floorTo
//              (a face close in has no room on its floor for the works). A blast with rock: true (see wreckage) blows its face out
//   runway     { from, width }: from there on the road is a runway, `width` m of concrete beyond each
//              edge, with a runway's markings in place of lanes (the airport's look)
//   tower      { at, trigger, distance, stub }: the control tower, beside the old road carrying
//              straight on (stub m of it) where the route turns off at `at`; set off at trigger m
//              short of there, it comes crashing down across that road (only a sight)
//   parkedPlanes  { s, d, turn }: airliners parked d m off the road on the left, turned a little
//   cameras    { s, side, limit }: a speed camera on its pole, on a shoulder (side 'left' | 'right') or
//              on the centre line ('centre'); limit in km/h (default the level's speedLimit, or else
//              CONFIG.speedCamera.limit). Passing it faster is a fine the first time in a run (by how far
//              over: CONFIG.speedCamera.fines), a bust after; run over, it's no offence
//   speedLimit km/h: the limit at the level's speed cameras, where a camera doesn't say
//   processions  { every: { min, max } }: now and then a funeral procession, a hearse and its cars,
//              slow, nose to tail (see CONFIG.procession)
//   crossings  { s, trigger, every, train }: a level crossing: lights, booms, and a short fast train across
//              the road, set off so the train gets there about as the player would (see CONFIG.crossing),
//              or with a trigger, as the player comes within that many m. On straight road. `train`:
//              which train ('bullet' | 'steam'); left out, the theme's "train" (themes.js), else the bullet
//              train's carriages
//   stopGo     { from, to, go?, clear? }: stop / go roadworks on a two-way road: the oncoming side dug up
//              over that stretch (as long as it likes), both ways taking turns through the lane left. go: s
//              each way gets the GO; clear: s between, for the last through to clear (a long works wants
//              longer), if not CONFIG.stopGo's. On straight road
//   fog        { from, to }: a fog bank: the fog closes right in, and the police see less (see CONFIG.fog)
//   tunnels    { from, to }: a tunnel: the road under cover, dark but for its lamps, the player's headlights on
//              and the engine echoing (see CONFIG.tunnel and render/tunnel.js). Clear of any exit's ramps
//   (a herd, "herds", with stay: true never leaves the road: it turns back at the lane lines, and never rests)
//   parades    { s, speed? }: a street parade at s: a float in every lane of the player's side, abreast, a marching
//              band behind, all off at a crawl the player's way as the player comes near, taking the whole road
//              (see CONFIG.parade). A bandsman knocked down in front of the police is a bust
//   roadblocks { s, gap? }: a police roadblock: police cars across every lane of the player's side but one (gap:
//              which; left out, any, each run). Touching one is a bust, unless the car has a radar detector; with
//              a siren going the police pull aside and wave the player through (see CONFIG.roadblock)
//   (a traffic kind that sheds, "cargotruck", drops crates and bales off the back as it goes, a little
//              way ahead of the player: obstacles, sliding on and stopping. See CONFIG.cargo)
//   iceCreamStops { s, lane, wait? }: an ice-cream van stopped in that lane, its jingle going; the traffic behind it
//              queues, nobody pulling out round it, until it drives off, `wait` s after the player comes near
//              (see CONFIG.iceCream)
//   reversible { from, to, lane, flipAt? }: a reversible lane on the player's side (a two-way road): as the player
//              comes within flipAt m its overhead signs go from a green arrow to a red cross and it is oncoming
//              from then on: the traffic in it moves out, and cars come down it the wrong way (see CONFIG.reversible)
//   convoys    { every: { min, max }, size?, kind? }: now and then a convoy, `size` vehicles of a kind nose to tail
//              in one lane, moving as one and shutting their gaps in the player's face (see CONFIG.convoy)
//   (everywhere: the traffic slows to look at a wreck for a while after, so the jam comes after the crash, and an
//              evil driver stuck in it may go up the shoulder, to be arrested if the police see: CONFIG.rubberneck)
//   potholes   { s, lane, r }: a pothole in that lane (r: its radius, m): a jolt, and maybe a flat tyre
//   rockfall   { from, to, count, side, out?, height? }: rocks tumbling down onto the road from that side as the player
//              comes near: obstacles, which only the player hits (see CONFIG.rockfall). out / height: where they wait,
//              m off the road's edge and m up, if not CONFIG.rockfall's (the hillside's): on a quarry's bench, say.
//              A rock waits ON something and comes down over it (render/items.js): on a level whose land climbs (a theme
//              with terrain), the land itself, out m off, on whichever side is uphill (leave height out there: with a
//              height it is taken to be a ledge that high, wherever the land is, and hangs in the air if there is none);
//              on flat land, a crag `height` m tall built for it. Keep a stretch 40 m clear of a hairpin, where the
//              legs either side are level with each other and there is no slope for a rock to come down
//   (Gimmick Road 2's: see hazards.js and CONFIG, each under its own name. Any can be on a side road, as cameras,
//   crossings and potholes can: { road: 'side', exit: n }, s then m along that side road)
//   schoolCrossings { s }: a lollipop person stops the traffic for the children; running it is a bust
//   waterMains { s, lane, length? }: a burst water main in that lane: a fountain out of the road for CONFIG.waterMain.on
//              s, then nothing for .off s, over and over. While it sprays, `length` m of that lane beyond it (.length,
//              if not given) is under water and as slippery as ice: on it the car brakes with a share of its brakes
//              and changes lane more slowly, by numbers of its own (CONFIG.waterMain: brakeGrip, steerGrip, laneSpeed)
//   balloons   { s, lanes: [first, last] }: a hot-air balloon comes down on those lanes, sits, and lifts off again
//   drawbridges { s }: bells, booms, and two leaves that lift: the car goes up the near one and jumps the gap if it
//              came fast enough (a board gives the speed), or stops short, or drops in. On straight road
//   wideLoads  { s, lanes: [n, n + 1] }: a load two lanes wide crawling along, swinging from side to side: pass it at speed on the side its arrow board
//              points to (left: in the lane; right: on the shoulder). Hitting it or its escort is a knock; there is no bust
//   trolleys   { from, to, count }: shopping trolleys rolling across the road with its camber
//   marathons  { s, lane, count, water? }: runners in one lane behind a pace car; water: where its water station stands
//   stampedes  { from, to, count, kind: 'cow' | 'kangaroo' }: animals charging down the road at the player
//   (and wreckage of kind 'roadtrain': a road train jackknifing across its lanes)
//   (Gimmick Road 3's: the road gambles, see gambles.js and CONFIG, each under its own name)
//   (every one is a risk to take or leave: none stops the car, and none busts it. On the expressway only)
//   crosswinds { from, to, dir: 'left' | 'right', strength?, every?, length? }: an exposed stretch with a wind across it,
//              blowing to that side (as the level is written): a steady push with a gust every `every` s lasting
//              `length` s (CONFIG.crosswind's if not said; strength: m/s^2 on a car as tall as the Commuter). A taller
//              car is pushed harder; beside a tall vehicle on the windward side there is shelter, and a shove on
//              clearing it. Windsocks before it and along it show which way and how hard, as it gusts
//   jamRamps   { s, lane, queue?, lanes? }: a ramp over the jam: a car transporter stopped in that lane (one on the
//              player's side), its ramps down, the foot of them at s, at the back of a queue of stopped traffic:
//              `queue` cars beyond it in its lane (CONFIG.jamRamp.queue if not said) and as far in every lane of
//              `lanes` ([first, last]: the player's whole side if not said). Driven up at the speed on its board or
//              more, the car flies the queue; slower, it comes down in it. The way round is whatever the level leaves
//              open: a lane, the shoulder (its rules apply), the oncoming side. On straight, level road
//   lowBridges { s, clearance?, first? }: a low bridge: two height bars over the player's side of the expressway (and its shoulder), one over each
//              half, the second CONFIG.lowBridge.stagger m on from the first (first: 'left' | 'right', the half with the first), to slalom round,
//              `clearance` m off the road (CONFIG.lowBridge.clearance if not said), between an exit and its merge:
//              the side road is the way round for tall vehicles, and tall traffic takes it. A car no taller than the
//              bar (its `height` in cars.js) goes straight under; a taller one that goes at it loses health and most
//              of its speed, and is through. Signed before the exit, with what the car measures. The level reports
//              one that has no exit round it
//   fords      { from, to, depth? }: a ford: over the stretch the expressway runs through a river `depth` m deep
//              (CONFIG.ford.depth if not said), between an exit and its merge: the side road is the bridge. A car is
//              slowed in it by how well it wades (its `crossing` in cars.js: see CONFIG.ford); in water deeper than
//              it wades it crawls and is damaged, but is never stopped. Depth posts on its banks and boards before
//              the exit show the depth, and the player is told what the car wades. Each ford its own depth.
//              A flooded underpass is a ford that fills: with fills: { to, over } its depth is `depth` as the run
//              starts and rises to `to` m over `over` s (early on anything gets through, later only some); with
//              underpass: true a railway bridge is drawn over it (the road is not lowered)
//   cushions   { from, to, every? }: speed cushions: over the stretch a row of them across the expressway every `every` m
//              (CONFIG.cushion.every if not said), the first at `from`: a cushion in the middle of each lane, a gap
//              on each lane line. A car on a lane line goes between two and feels nothing; over one slowly it is a
//              bump; over one at speed it is thrown up and knocked. Traffic crawls over them (see CONFIG.cushion)
//   shade      { from, to, side, lanes? }: black ice in the shade: over the stretch a row of tall trees on that side
//              ('left' | 'right') shades the `lanes` lanes of the player's side nearest it (CONFIG.shade.lanes if
//              not said; on the right, the shoulder too), and those are ice (CONFIG.ice), with nothing drawn of it
//              but the shadow. Traffic moves into the sun before it where there is a sunny lane. Put it on a bend,
//              or put something in the shade to be steered round: ice in a straight line costs nothing
//   ruts       { from, to }: ruts: over the stretch the expressway is deep mud with a rut down the middle of each lane.
//              In a rut a car runs at its own pace and is held to it; steered against for a moment it climbs out
//              with a jolt, into the mud between, where it is slow until it drops into the next (see CONFIG.rut).
//              Put something in one rut, well down it, and the cash in another: the choice is made at the start
//   tarmac     { from, to, lane }: fresh tarmac: over the stretch that lane of the player's side (which needs another
//              beside it) is new tar, coned off: traffic keeps out of it and crawls past in the other lanes. A car
//              on it picks tar up on its tyres, which slows it more the longer it stays (in the end to less than
//              the queue's pace) and for a few seconds after it is off (see CONFIG.tarmac)
//   radiation  { from, to, lanes?: [first, last], side?: 'left' | 'right' }: a radiated area: over the stretch, in those
//              lanes (out to the road's edge on `side`, if given; with no lanes, the whole road, shoulders and all),
//              the player's car loses health slowly and its radiation meter rises; out of it the meter falls
//              back. A full meter infects the player for the rest of the run: its health ticks down everywhere.
//              The Armour pickup keeps all of it out. Always leave a clean line (other lanes, a shoulder, a side
//              road) or put an armour before it (see radiation.js and CONFIG.radiation)
//   infectedTraffic  the share of the traffic dealt out infected (0 .. 1; left out: CONFIG.radiation.share on a
//              level with a radiated area, none on any other). An infected car doses the player within its ring
//              as an area does, and touching it infects at once; a clean vehicle can catch it in an area
//   spray      { from, to }: truck spray: over the stretch the expressway is wet, and every tall vehicle moving on it
//              (a van, a bus, a lorry) drags a cloud of spray behind it, as wide as its lane and the next each
//              side: in the cloud the player sees next to nothing. Nothing is done to the car (see CONFIG.spray)
//   lowSun     { from, to }: the low sun: over the stretch the expressway runs straight into a low sun and the picture
//              washes out, except in the shadow of a tall vehicle just ahead, a bridge, a tunnel or a shade's trees.
//              Nothing is done to the car (see CONFIG.lowSun). Best on a straight, by day
//   dust       { from, to, wind }: a dust trail: over the stretch the expressway is dry dirt, and every vehicle moving on
//              it throws a plume of dust, which the wind carries to the side it blows to ('left' | 'right'). In a
//              plume the player sees next to nothing; a lane upwind of the vehicle is clear, which may be the
//              oncoming one. Nothing is done to the car (see CONFIG.dust)
//   washboards { from, to }: washboard dirt: the road is corrugated right across over the stretch. On it, at any speed,
//              the steering takes less and the car wanders (the faster, the worse), in a bend it is carried wide, and
//              it is held to CONFIG.washboard.most m/s (a faster car dragged down to that: never stopped). Boards
//              before it. Leave a lane or shoulder it does not reach, or put something in it to be steered round. Drawn
//              in what the theme makes it of (themes.js, WASHBOARDS)
//   pelotons  { s, count, speed, trigger, dir }: cyclists two abreast by the kerb on the player's side,
//              setting off as the player comes near: obstacles, which only the player hits (see CONFIG.peloton).
//              dir -1: on the far side instead, riding towards the player (the bunch strung out behind
//              them, past s)
//   battle     true = the Battlefield: two armies at war down the road (see CONFIG.battle). Its traffic
//              going the player's way is the player's side, green (good, whatever the player's side
//              on the menu); coming the other way, the enemy's, red (evil). Best with "flow": "mixed"
//   landmines  { from, to, count }: landmines scattered down the lanes over that stretch, their lights
//              flashing: whatever touches one, the player's car or traffic, is destroyed outright (a ghost
//              passes over), and the mine with it. Traffic never steers round them
//   pillboxes  true = (with battle) pillboxes beside the road every CONFIG.battle.pillboxEvery m, half
//              each army's, firing bursts at the other's vehicles (as The Hood's gang houses)
//   hippos     { from, to, every: { min, max } }: a river beside the road (on the right) over that
//              stretch, out of which a hippo charges across the road every min-max s, aimed at the
//              player: whatever it touches is destroyed, and it carries on (see hippos.js)
//   id         unique name, used as the level's key in saved progress
//   name       the level's name on the menu. A built-in level's name and description are kept in levelText.json,
//              every level's words in one file, by id; these two fields in a level's own file are the fallback
//              (a level not in that file yet, a level from the editor). Read them with levelName(level) and
//              levelDescription(level, evil) (levelText.js), never as level.name
//   description  { good, evil }: a sentence or two about the level, shown on the menu's stage for the side picked
//              (160 characters each at most; scripts/.descriptions-check.mjs). Good's is a cheerful, careful
//              courier's briefing; Evil's the same job, relished. A level played on one side only (alwaysGood,
//              battle) has only "good"
//   targets    { s, side }         TANK RAGE targets beside the road; side: 'left' | 'right'
//              How a target stands is the level's theme's (a theme's "target": see themes.js and CONFIG.target),
//              and one target can have its own where a stretch has sides of its own (an elevated road, a
//              bridge, a zone's look): { s, side, offset?, height?, style?, base?, arm?, beam? }: offset: m
//              beyond the pavement its ring is; height: m above the road; style: 'post' | 'wall' (on a
//              stalk on a wall's top, `base` m up) | 'gantry' (hung from an arm, its mast `arm` m further
//              out); beam: a beam of light over it. Not in a tunnel, nor where a junction or another road is
//   clock      { good, evil }: seconds on the clock for each side. Worked out from a clean run in the
//              reference car by scripts/level-clocks.mjs (see CONFIG.clock), unless set by hand
//   tip        the money earned for finishing before the clock reaches zero
//              Lane 0 is the far left (oncoming). Add road: 'side' to put an item on a side
//              road (and exit: n for the nth exit's): s from its start, lane 0 oncoming / 1 ours.
// A level is checked as it loads; problems are shown on screen and in the console.
// To add a level: add a .json file to ./levels, import it here and add it to MAIN_LEVELS (or
// SPECIAL_LEVELS). Putting one in among those already there changes the positions saved progress
// counts by: see LEVEL_ORDER in progress.js.
// ============================================================================
import expressway from './levels/expressway.json';
import backRoads from './levels/back-roads.json';
import farm from './levels/farm.json';
import bigBusiness from './levels/big-business.json';
import hurricane from './levels/hurricane.json';
import allHeck from './levels/all-heck.json';
import ufo from './levels/ufo.json';
import chaos from './levels/chaos.json';
import night from './levels/night.json';
import mysteryMeadows from './levels/mystery-meadows.json';
import suburbs from './levels/suburbs.json';
import canberra from './levels/canberra.json';
import monteCarlo from './levels/monte-carlo.json';
import singapore from './levels/singapore.json';
import singaporeNight from './levels/singapore-night.json';
import grandPacific from './levels/grand-pacific.json';
import passageDuGois from './levels/passage-du-gois.json';
import safari from './levels/safari.json';
import airport from './levels/airport.json';
import construction from './levels/construction.json';
import theHood from './levels/the-hood.json';
import panoramaAvenue from './levels/panorama-avenue.json';
import grandPrix from './levels/grand-prix.json';
import marinaBay from './levels/marina-bay.json';
import testbed from './levels/testbed.json';
import gimmickRoad from './levels/gimmick-road.json';
import battlefield from './levels/battlefield.json';
import ohMine from './levels/oh-mine.json';
import montreal from './levels/montreal.json';
import bathurst from './levels/bathurst.json';
import rivalRun from './levels/rival-run.json';
import showdown from './levels/showdown.json';
import speedTrapAlley from './levels/speed-trap-alley.json';
import mountainPass from './levels/mountain-pass.json';
import outbackExpress from './levels/outback-express.json';
import tourDeCoast from './levels/tour-de-coast.json';
import ringRoad from './levels/ring-road.json';
import marketTown from './levels/market-town.json';
import quarryRun from './levels/quarry-run.json';
import gimmickRoad2 from './levels/gimmick-road-2.json';
import gimmickRoad3 from './levels/gimmick-road-3.json';
import hongKong from './levels/hong-kong.json';
import tokyo from './levels/tokyo.json';
import mumbai from './levels/mumbai.json';
import stelvio from './levels/stelvio.json';
import christmas from './levels/christmas.json';
import monza from './levels/monza.json';
import spa from './levels/spa.json';
import albertPark from './levels/albert-park.json';
import slipway from './levels/slipway.json';
import harbour from './levels/harbour.json';
import flood from './levels/flood.json';
import ford from './levels/ford.json';
import fjord from './levels/fjord.json';
// (the themed levels, THEME_LEVELS below: one a line, a new one on the line above its batch's marker)
import toys from './levels/toys.json';
import leaks from './levels/leaks.json';
import moonbase from './levels/moon.json';
// (batch A's imports go above this line)
import backlot from './levels/backlot.json';
import venice from './levels/venice.json';
import iceroad from './levels/iceroad.json';
// (batch B's imports go above this line)
import park from './levels/park.json';
import cinder from './levels/cinder.json';
import docks from './levels/docks.json';
// (batch C's imports go above this line)
import noon from './levels/noon.json';
import morro from './levels/morro.json';
import rice from './levels/rice.json';
// (batch D's imports go above this line)
import derby from './levels/derby.json';
import seaquake from './levels/seaquake.json';
import farside from './levels/farside.json';
import stunts from './levels/stunts.json';
import ponti from './levels/ponti.json';
import thaw from './levels/thaw.json';
// (batch E's imports go above this line)
import glow from './levels/glow.json';
import erupt from './levels/erupt.json';
import cattle from './levels/cattle.json';
// (batch F's imports go above this line)
import fallout from './levels/fallout.json';

// the numbered levels, and the special ones (S1, S2...), which always come after them on the
// menu. All of them unlock in this order, each by delivering the one before, and saved progress
// counts unlocked levels by position. (The numbered levels are these and then the levels of the new
// themes, THEME_LEVELS further down: together they are MAIN_LEVELS)
const FIRST_LEVELS = [expressway, backRoads, farm, bigBusiness, hurricane, night, mysteryMeadows, suburbs, canberra, monteCarlo, singapore, singaporeNight, grandPacific, passageDuGois, safari, airport, construction, theHood, panoramaAvenue,
  speedTrapAlley, mountainPass, outbackExpress, tourDeCoast, ringRoad, marketTown, quarryRun, hongKong, tokyo, mumbai, stelvio, christmas];
export const SPECIAL_LEVELS = [allHeck, ufo, marinaBay, ohMine, montreal, bathurst, rivalRun, showdown, battlefield];
// ...and the amphibious levels (A1, A2...: each "amphibious", with water stages, driven only in an amphibious
// car), after the special ones: they unlock in order like the rest, the first by delivering the last special level
// (the ids are short: each is in a full save's cookie twice. See progress.js)
export const AMPHIBIOUS_LEVELS = [slipway, harbour, flood, ford, fjord];
// ...and the circuits built from the real ones (render/circuits/): races only, on the menu's Races tab. They come
// last in LEVELS, after every delivery level (races are always open, so saved progress, which counts the
// delivery levels open by position, only has to know the amphibious levels went in ahead of them: see progress.js)
export const CIRCUIT_LEVELS = [monza, spa, albertPark];
// ...and the levels of the themes of 10-Oct (the toy room and on): a theme of its own each, and the gimmicks the
// game has. They are ordinary numbered levels (the owner: "the themed levels are just normal levels"): they carry
// on from the last of the levels above (32, 33...), ahead of the special ones, and unlock in order like the rest.
// A new one goes at the end of the list, and needs its place adding to INSERTED_AT in progress.js (it goes in
// ahead of the special levels, so an old save must count one more). Short ids, as the amphibious levels'. ONE
// LEVEL A LINE, and a new one on the line above its batch's marker (the batches were built side by side on
// several branches: the markers keep their additions apart, so the branches merge)
export const THEME_LEVELS = [
  toys,
  leaks,
  moonbase,
  // (batch A: toy room, underwater tunnel, moon base: new levels go above this line)
  backlot,
  venice,
  iceroad,
  // (batch B: film studio, Venice, ice road: new levels go above this line)
  park,
  cinder,
  docks,
  // (batch C: theme park, volcano island, container port: new levels go above this line)
  noon,
  morro,
  rice,
  // (batch D: Wild West, favela, rice terraces: new levels go above this line)
  derby,
  seaquake,
  farside,
  stunts,
  ponti,
  // (batch E: second levels on the toy room, sea bed, moon, backlot, Venice, ice road: new levels go above this line)
  glow,
  erupt,
  cattle,
  thaw, // (batch E's last, the ice road's: written after batch F's three, so after them: its place in saved progress is 52)
  // (batch F: second levels on the theme park, volcano, port, Wild West, favela, rice terraces: new levels go above this line)
  fallout, // (Hot Zone, the fallout level, after Spring Thaw: order 48, INSERTED_AT 53 in progress.js)
];
export const MAIN_LEVELS = [...FIRST_LEVELS, ...THEME_LEVELS]; // (every numbered level: 1, 2, 3...)
export const LEVELS = [...MAIN_LEVELS, ...SPECIAL_LEVELS, ...AMPHIBIOUS_LEVELS, ...CIRCUIT_LEVELS];
// The menu has two tabs: deliveries, and races. A race is any lapped level (its "laps"), wherever it sits in
// LEVELS (Marina Bay, Montreal and Mount Panorama are among the special levels); races are always open, and
// never lock the delivery level after them (see Progress and the menu)
export const isRace = (level) => !!level.laps;
export const RACE_LEVELS = LEVELS.filter(isRace);
export const DELIVERY_LEVELS = LEVELS.filter(l => !isRace(l));
// the level after this one on its own tab (the next delivery, or the next race), or null at the end
export const nextOnTab = (level) => { const list = isRace(level) ? RACE_LEVELS : DELIVERY_LEVELS, k = list.indexOf(level); return k >= 0 && k + 1 < list.length ? list[k + 1] : null; };
// a level's number on the menu, by its position in LEVELS: '1'... for the main levels, 'S1'... for the special
// delivery levels, 'A1'... for the amphibious ones, 'R1'... for the races (each tab numbers its own)
export const levelLabel = (index) => {
  const level = LEVELS[index];
  if (isRace(level)) return 'R' + (RACE_LEVELS.indexOf(level) + 1);
  if (AMPHIBIOUS_LEVELS.includes(level)) return 'A' + (AMPHIBIOUS_LEVELS.indexOf(level) + 1);
  return index < MAIN_LEVELS.length ? String(index + 1) : 'S' + (DELIVERY_LEVELS.indexOf(level) - MAIN_LEVELS.length + 1);
};
// the screensaver's level: not on the menu, driven round and round with no player car
export const SCREENSAVER_LEVEL = chaos;
// hidden levels, by id: never on the menu, only played from the address (?hidden=testbed, or ?test
// for the test track). A run on one banks nothing and records no best time. The test track has
// every pickup laid out, twice, a mix of every kind of traffic, ambulances and TANK RAGE targets,
// to try new things out on without putting them in a real level. The Singapore Grand Prix (once
// S3, round Singapore II's streets) is kept here too: ?hidden=grand-prix. Gimmick Road
// (?hidden=gimmick-road) tries out the newest gimmicks, each on a stretch of its own: speed cameras,
// potholes, a trench, a level crossing, stop / go roadworks, a fog bank, rockfall, a cyclist
// peloton, and funeral processions
// Gimmick Road 2 (?hidden=gimmick-road-2): the next batch, the same way (see hazards.js): burst water mains, a school
// crossing, shopping trolleys, a marathon, a hot-air balloon, a wide load, a
// drawbridge and a road train jackknifing; and on its side road a camera, potholes, a level crossing and a stampede
// Gimmick Road 3 (?hidden=gimmick-road-3): the road gambles (see gambles.js), each a risk the player can take or leave
export const HIDDEN_LEVELS = { testbed, 'grand-prix': grandPrix, 'gimmick-road': gimmickRoad, 'gimmick-road-2': gimmickRoad2, 'gimmick-road-3': gimmickRoad3 };
// the class every race is run in: 'f1', 'gt' (GT road cars) or 'lmp' (Le Mans prototypes): the player's car
// and the grid (the menu's Race cars button; ?gt or ?lmp for that class whatever it says)
export const RACE_CLASSES = { f1: 'F1', gt: 'GT', lmp: 'LMP' };
export const setRaceClass = (kind) => {
  for (const level of [...LEVELS, ...Object.values(HIDDEN_LEVELS)]) {
    if (!level.grid || level.grid.rival) continue; // (a rival stage's own cars: see Game.start)
    level.car = kind;
    level.grid = { ...level.grid, kind };
  }
};

// The level picked on the menu. These are live bindings: importers see the new level as soon
// as selectLevel() changes it. Nothing is built from it until a run starts (see Game.load).
export let LEVEL_INDEX = 0;
export let LEVEL = LEVELS[0];
export const selectLevel = (index) => {
  LEVEL_INDEX = Math.max(0, Math.min(LEVELS.length - 1, index));
  LEVEL = LEVELS[LEVEL_INDEX];
};
// a level that isn't on the menu (the screensaver's); selectLevel() puts the menu's back
export const selectSpecial = (level) => {
  LEVEL_INDEX = -1;
  LEVEL = level;
};
// a level's name, and its description for the side played: asked of levelText.js, never read off the level
export { levelName, levelDescription } from './levelText.js';
