// ============================================================================
// IDEA_CARS - the car ideas, on show in the garage's "Car ideas" lot (render/ideaslot.js). Each has a
// generic name and the real vehicle it is drawn from (see "Car ideas lot" in CHECKLIST-10-Oct.md).
// They can be DRIVEN: picked in that lot ("Drive it") or with ?car=<id>, an idea is the car in use as any
// garage car is, on any level a garage car may drive (cars.js looks here as well as in CARS). But they are
// not garage cars yet. Each is
//   tierless     no tier, no stars, no price: free and always open (Progress.owns says yes to every one, so
//                none is ever written into a save's list of cars; only the car in use is remembered)
//   a PLACEHOLDER its figures below are first guesses from what the vehicle is, NOT balanced: every entry
//                carries `placeholder: true` (and `idea: true`) for a balancing pass to find
// and none is in CARS or CONFIG.vehicles: not for sale, not in traffic, not a rival, not what Car Swap or
// "Unlock everything" deal in, in no tier's balance table and no season, not amphibious, not earned; it has
// no trait or perk, and no Super version (the "souped up" mystery gives it the fallback effect instead).
//   name       its name in the game (no maker's or model's name)
//   basedOn    the real vehicle it is based on
//   model      its model, by name (see render/ideaModels.js: IDEA_MODELS, makeIdeaModel)
//   hw, hl     half width / half length (m), and height: the real vehicle's, at the game's scale, and its
//              hitbox when driven
//   real, scale  for one too wide for a lane as it really is (the Monster Truck): its real size, which the
//              model is built at, and how much model and hitbox are scaled down by (hw, hl and height are
//              the scaled ones: no wider than the widest garage car, the Nissank)
//   color      its paint as a Good car's; evilColor: as an Evil one's
//   note       one line about it, for the lot's tip
// The placeholder figures, as CARS' (cars.js): maxSpeed (m/s), accel, agility, crossing (which is also how
// deep it wades), health, mass. All but the sizes are kept inside what the garage's cars span (CARS, the
// 6-star cars and the City Bus), and none is quicker than the quickest car for sale.
//   sound      the garage car whose horn and engine note it borrows (render/audio.js HORNS, ENGINES)
// To make one a real car: give it an entry in CARS (its stats, tier and price), and move its builder from
// IDEA_MODELS to MODELS.
// Eighteen have left this list (12-Oct, CHECKLIST item 115): the evergreen BLUEPRINT cars, now in the roster as
// cars.js FILLER_CARS (their figures nudged into their tier's range; their models still built here, put in MODELS by
// render/models.js). Five more left it the same day (the owner, 12-Oct): the BESPOKE key cars, cars.js BESPOKE_CARS
// (the Rocket Fin Coupe, the Swan Car, the Solar Racer, the Moon Rover and the Monowheel). 43 ideas were left; two more
// went (the Snowcat and the Hot Dog Car, CHECKLIST item 153); the fifth batch (the Goddess Saloon and the Fifties Hardtop) was added and
// promoted to the roster as tier-4 Legendary blueprint cars the same day (cars.js FILLER_CARS): 41 left.
// The sixth batch, five more (CHECKLIST item 171): two older vehicles (a blown vintage tourer, a split-level highway
// coach) and three modern ones (a horseshoe-grilled hypercar, a tall electric city car, a coupe crossover): 46 ideas.
// (Four of the sixth batch were promoted the same day, and the Horseshoe became a key car: 41 left.) The seventh batch,
// three CONCEPT CARS, show cars that never went on sale (the owner, 13-Oct): a knife-edged mid-engined supercar, a
// sixteen-cylinder grand coupe and a flame-bodied Le Mans prototype (models: render/ideaModels7.js): 44 ideas.

// ============================================================================
export const IDEA_CARS = [
  { id: 'threewheeler', name: 'Three-Wheeler', basedOn: 'Reliant Robin', model: 'threewheeler', color: 0xe0902a, evilColor: 0x3d4a2a,
    hw: 0.71, hl: 1.67, height: 1.37, note: 'One wheel at the front. It leans in a corner, and sometimes keeps going.',
    maxSpeed: 23, accel: 8, agility: 1.2, crossing: 0.3, health: 80, mass: 1, sound: 'mini' },
  { id: 'tinsnail', name: 'Tin Snail', basedOn: 'Citroën 2CV', model: 'tinsnail', color: 0x7f9fb4, evilColor: 0x5e1220,
    hw: 0.74, hl: 1.92, height: 1.6, note: 'Soft springs, a roll-back roof and no hurry at all.',
    maxSpeed: 23, accel: 7, agility: 1.1, crossing: 0.9, health: 85, mass: 1, sound: 'commuter' },
  { id: 'bug', name: "People's Bug", basedOn: 'Volkswagen Beetle (Type 1)', model: 'bug', color: 0x9fd0a8, evilColor: 0x1d1d22,
    hw: 0.77, hl: 2.04, height: 1.5, note: 'A dome on four round wings, with the engine in the tail.',
    maxSpeed: 25, accel: 8, agility: 1.1, crossing: 0.7, health: 110, mass: 1, sound: 'commuter' },
  { id: 'twostroke', name: 'Two-Stroke Saloon', basedOn: 'Trabant 601', model: 'twostroke', color: 0xb5cfe0, evilColor: 0x6f7a55,
    hw: 0.75, hl: 1.78, height: 1.44, note: 'A little pastel box that leaves a blue haze behind it.',
    maxSpeed: 23, accel: 7.5, agility: 1.05, crossing: 0.5, health: 80, mass: 1, sound: 'junker' },
  { id: 'brickestate', name: 'Brick Estate', basedOn: 'Volvo 240 estate', model: 'brickestate', color: 0xc9b47c, evilColor: 0x232a3a,
    hw: 0.86, hl: 2.4, height: 1.46, note: 'Square everything. It would carry a wardrobe and shrug off a wall.',
    maxSpeed: 30, accel: 9, agility: 1, crossing: 0.6, health: 230, mass: 1.4, sound: 'wagon' },
  { id: 'limo', name: 'Stretch Limo', basedOn: 'Lincoln Town Car stretch limousine', model: 'limo', color: 0xf0f0ec, evilColor: 0x141418,
    hw: 0.99, hl: 4.2, height: 1.48, note: 'As long as two cars, with a window for every guest.',
    maxSpeed: 32, accel: 9, agility: 0.9, crossing: 0.2, health: 200, mass: 2, sound: 'hearse' },
  { id: 'centreseat', name: 'Centre-Seat Hypercar', basedOn: 'McLaren F1', model: 'centreseat', color: 0xf07c1c, evilColor: 0x2c2140,
    hw: 0.91, hl: 2.14, height: 1.14, note: 'The driver sits in the middle, a passenger behind each shoulder.',
    maxSpeed: 48, accel: 20, agility: 1.45, crossing: 0.2, health: 140, mass: 1.1, sound: 'miata' },
  { id: 'rallywedge', name: 'Rally Wedge', basedOn: 'Lancia Stratos', model: 'rallywedge', color: 0xf2f2ee, evilColor: 0xc1121f,
    hw: 0.88, hl: 1.86, height: 1.11, note: 'Shorter than it is sensible, with a visor for a windscreen and four spot lamps.',
    maxSpeed: 41, accel: 16, agility: 1.45, crossing: 0.9, health: 120, mass: 1, sound: 'rally' },
  { id: 'safari', name: 'Safari Wagon', basedOn: 'Land Rover Defender 110', model: 'safari', color: 0x47633f, evilColor: 0x2b2b2e,
    hw: 0.9, hl: 2.3, height: 2.05, note: 'Flat panels, a rack and a ladder, the spare on the bonnet and a snorkel.',
    maxSpeed: 30, accel: 9, agility: 1, crossing: 1, health: 260, mass: 1.8, sound: 'suv' },
  { id: 'widetruck', name: 'Wide Truck', basedOn: 'AM General Hummer H1', model: 'widetruck', color: 0xc8b07a, evilColor: 0x1a1a1d,
    hw: 1.1, hl: 2.35, height: 1.9, note: 'Wider than a lane likes, and lower than it looks.',
    maxSpeed: 31, accel: 9, agility: 1, crossing: 1, health: 340, mass: 2.3, sound: 'liftedtruck' },
  { id: 'corrugated', name: 'Corrugated Van', basedOn: 'Citroën H Van', model: 'corrugated', color: 0x9aa5ab, evilColor: 0x6a1a1a,
    hw: 1.0, hl: 2.14, height: 2.34, note: 'A ribbed tin shed with a snout.',
    maxSpeed: 23, accel: 7, agility: 1, crossing: 0.6, health: 150, mass: 1.3, sound: 'darkvan' },
  { id: 'foodtruck', name: 'Food Truck', basedOn: 'Grumman Olson step van', model: 'foodtruck', color: 0x2fb5a8, evilColor: 0x2a2630,
    hw: 1.15, hl: 3.3, height: 2.9, note: 'A serving hatch under an awning, a menu board and a vent on the roof.',
    maxSpeed: 24, accel: 6.5, agility: 0.95, crossing: 0.5, health: 240, mass: 2.2, sound: 'darkvan' },
  { id: 'motorhome', name: 'Motorhome', basedOn: 'Winnebago Brave (1970s)', model: 'motorhome', color: 0xf0ead8, evilColor: 0x54402f,
    hw: 1.2, hl: 3.2, height: 2.9, note: 'A slab-sided box with a stripe down it and the kitchen sink inside.',
    maxSpeed: 25, accel: 6, agility: 0.95, crossing: 0.55, health: 250, mass: 2.4, sound: 'lovebus' },
  { id: 'schoolbus', name: 'School Bus', basedOn: 'Blue Bird conventional school bus', model: 'schoolbus', color: 0xf2b410, evilColor: 0x5a5e63,
    hw: 1.22, hl: 5.4, height: 3.05, note: 'Yellow, with its bonnet out in front and a stop sign that swings out.',
    maxSpeed: 25, accel: 5.5, agility: 0.9, crossing: 0.7, health: 320, mass: 2.8, sound: 'bus' },
  // (the tallest thing a player can drive, by more than a metre: see what a low bridge makes of it)
  { id: 'doubledecker', name: 'Double Decker', basedOn: 'AEC Routemaster', model: 'doubledecker', color: 0xc8102e, evilColor: 0x1c1c24,
    hw: 1.22, hl: 4.2, height: 4.38, note: 'Two decks, a half cab beside the engine and an open platform to hop on at the back.',
    maxSpeed: 23, accel: 5, agility: 0.9, crossing: 0.6, health: 330, mass: 2.9, sound: 'bus' },
  // (the second batch of twenty: models in render/ideaModels2.js)
  { id: 'funeralcoach', name: 'Funeral Coach', basedOn: 'Cadillac Miller-Meteor hearse', model: 'funeralcoach', color: 0xe6e3da, evilColor: 0x111114,
    hw: 0.95, hl: 2.9, height: 1.65, note: 'Glass down both sides, a curtain and a coffin under flowers. It never hurries.',
    maxSpeed: 30, accel: 8, agility: 0.9, crossing: 0.4, health: 200, mass: 1.9, sound: 'hearse' },
  { id: 'golfcart', name: 'Golf Cart', basedOn: 'E-Z-GO TXT golf cart', model: 'golfcart', color: 0x2f7a4a, evilColor: 0x7a1d1d,
    hw: 0.6, hl: 1.3, height: 1.85, note: 'A bench, a roof on four sticks and two bags of clubs on the back.',
    maxSpeed: 23, accel: 6.5, agility: 1.2, crossing: 0.3, health: 80, mass: 1, sound: 'mini' },
  { id: 'hovercraft', name: 'Hovercraft', basedOn: 'Griffon 2000TD hovercraft', model: 'hovercraft', color: 0xe8e4d6, evilColor: 0x1f2a22,
    hw: 1.05, hl: 2.5, height: 2.7, note: 'No wheels: a rubber skirt on a cushion of air, a caged fan and two rudders.',
    maxSpeed: 34, accel: 9, agility: 0.9, crossing: 1, health: 150, mass: 1.4, sound: 'suv' },
  { id: 'steamwagon', name: 'Steam Wagon', basedOn: 'Stanley Steamer Model 735', model: 'steamwagon', color: 0x2c5a3a, evilColor: 0x1a1a1d,
    hw: 0.85, hl: 2.2, height: 1.95, note: 'A boiler under the bonnet, a chimney that puffs and wooden wheels with thin spokes.',
    maxSpeed: 26, accel: 6, agility: 0.9, crossing: 0.5, health: 120, mass: 1.5, sound: 'junker' },
  { id: 'tipper', name: 'Tipper Truck', basedOn: 'Volvo A-series three-axle dump truck', model: 'tipper', color: 0xe6a21a, evilColor: 0x24262b,
    hw: 1.2, hl: 3.9, height: 3.1, note: 'A deep tipping body heaped with earth, a shield over the cab and six wheels at the back.',
    maxSpeed: 27, accel: 7, agility: 0.9, crossing: 0.9, health: 320, mass: 2.8, sound: 'sixbysix' },
  { id: 'dunebuggy', name: 'Dune Buggy', basedOn: 'Meyers Manx', model: 'dunebuggy', color: 0xf07a1a, evilColor: 0x2a1f3d,
    hw: 0.85, hl: 1.85, height: 1.45, note: 'A fibreglass bathtub, a roll hoop, a bare engine and balloon tyres behind.',
    maxSpeed: 36, accel: 14, agility: 1.4, crossing: 0.8, health: 90, mass: 1, sound: 'buggy' },
  { id: 'creamvan', name: 'Ice-Cream Van', basedOn: 'Bedford CA "Mr Whippy" van', model: 'creamvan', color: 0xf2a6c0, evilColor: 0x4b2a5c,
    hw: 0.95, hl: 2.4, height: 3.55, note: 'A hatch under a striped awning, a chime on the roof and a cone with three scoops above it.',
    maxSpeed: 24, accel: 6.5, agility: 0.95, crossing: 0.5, health: 190, mass: 1.5, sound: 'postvan' },
  { id: 'yellowcab', name: 'Yellow Cab', basedOn: 'Checker Marathon taxi', model: 'yellowcab', color: 0xf3c218, evilColor: 0x1b1b20,
    hw: 0.92, hl: 2.55, height: 1.7, note: 'Square, high and chequered down the flank, with a light on the roof and a long boot.',
    maxSpeed: 31, accel: 9.5, agility: 1.05, crossing: 0.5, health: 170, mass: 1.5, sound: 'taxi' },
  { id: 'mixer', name: 'Cement Mixer', basedOn: 'Mack R-model concrete mixer', model: 'mixer', color: 0xe8832a, evilColor: 0x2a2d33,
    hw: 1.15, hl: 3.3, height: 3.75, note: 'A drum that never stops turning, a fin winding round it and a hopper at the back.',
    maxSpeed: 25, accel: 6, agility: 0.9, crossing: 0.9, health: 330, mass: 3, sound: 'sixbysix' },
  { id: 'wrecker', name: 'Wrecker', basedOn: 'Kenworth heavy-duty tow truck', model: 'wrecker', color: 0xe8c21c, evilColor: 0x23252b,
    hw: 1.1, hl: 3.0, height: 3.2, note: 'An A-frame boom over the deck with a hook on a cable, and amber lights flashing.',
    maxSpeed: 29, accel: 8, agility: 0.9, crossing: 0.9, health: 280, mass: 2.6, sound: 'towtruck' },
  { id: 'policewagon', name: 'Police Wagon', basedOn: 'Ford Transit prison van', model: 'policewagon', color: 0x1f2d52, evilColor: 0x5a1a1a,
    hw: 1.0, hl: 2.6, height: 2.4, note: 'A push bar, a light bar, white doors and little barred windows all down the side.',
    maxSpeed: 33, accel: 10, agility: 1, crossing: 0.6, health: 240, mass: 1.9, sound: 'suv' },
  { id: 'camper', name: 'Camper Van', basedOn: 'Volkswagen T2 Westfalia', model: 'camper', color: 0xe7742a, evilColor: 0x303036,
    hw: 0.85, hl: 2.1, height: 2.4, note: 'A V-shaped nose, a roof lifted on canvas and an awning rolled out with two poles.',
    maxSpeed: 24, accel: 6.5, agility: 1, crossing: 0.6, health: 120, mass: 1.3, sound: 'lovebus' },
  { id: 'boathauler', name: 'Boat Hauler', basedOn: 'Ford F-150 pickup with a speedboat', model: 'boathauler', color: 0x1e7f86, evilColor: 0x2a2a2f,
    hw: 0.98, hl: 2.7, height: 2.35, note: 'A pickup with a boat in the bed, its bow over the cab and an outboard off the tailgate.',
    maxSpeed: 30, accel: 9, agility: 1, crossing: 0.8, health: 190, mass: 1.9, sound: 'pickup' },
  { id: 'armoured', name: 'Armoured Van', basedOn: 'Brink\'s armoured cash truck', model: 'armoured', color: 0x6b7480, evilColor: 0x1a1a1e,
    hw: 1.15, hl: 2.8, height: 2.65, note: 'Slab sides, slits for windows, a turret hatch, a bull bar and wheels in armour.',
    maxSpeed: 27, accel: 7, agility: 0.9, crossing: 0.6, health: 350, mass: 3, sound: 'darkvan' },
  { id: 'cigar', name: 'Cigar Racer', basedOn: 'Lotus 49', model: 'cigar', color: 0x1f6b3a, evilColor: 0x15151a,
    hw: 0.98, hl: 2.3, height: 1.05, note: 'A body like a fat cigar, the driver\'s head in the top, bare wishbones and no wings.',
    maxSpeed: 45, accel: 17, agility: 1.4, crossing: 0.15, health: 80, mass: 1, sound: 'miata' },
  { id: 'sidecar', name: 'Scooter and Sidecar', basedOn: 'Vespa with a sidecar', model: 'sidecar', color: 0x8fc9b0, evilColor: 0x7a1f2b,
    hw: 0.85, hl: 1.25, height: 1.6, note: 'A scooter with a boat of a chair bolted to its side, and a wheel for each.',
    maxSpeed: 25, accel: 7, agility: 1.3, crossing: 0.3, health: 80, mass: 1, sound: 'mini' },
  // (the third batch of ten, each an idea no other vehicle in the game has: models in render/ideaModels3.js)
  { id: 'bathtub', name: 'Bathtub Racer', basedOn: 'Ed China\'s motorised bathtub', model: 'bathtub', color: 0xc8304a, evilColor: 0x3b4a7a,
    hw: 0.8, hl: 1.6, height: 1.65, note: 'A roll-top bath on clawed feet, full to the brim, with the driver in the suds.',
    maxSpeed: 28, accel: 8, agility: 1.2, crossing: 0.4, health: 100, mass: 1.2, sound: 'buggy' },
  { id: 'circuswagon', name: 'Circus Wagon', basedOn: 'Ringling Bros. cage wagon (1900s)', model: 'circuswagon', color: 0xc81f2a, evilColor: 0x3f3378,
    hw: 1.05, hl: 2.6, height: 3.0, note: 'Gilt, sunburst wheels and a lion pacing behind the bars. The ringmaster drives.',
    maxSpeed: 23, accel: 5.5, agility: 0.9, crossing: 0.7, health: 220, mass: 2.4, sound: 'lovebus' },
  { id: 'gyrocar', name: 'Gyro Car', basedOn: 'Lit Motors C-1', model: 'gyrocar', color: 0xeeece6, evilColor: 0x9c1f2e,
    hw: 0.6, hl: 1.45, height: 1.62, note: 'A closed capsule on two wheels, one behind the other. Gyroscopes keep it upright; mostly.',
    maxSpeed: 40, accel: 14, agility: 1.4, crossing: 0.3, health: 80, mass: 1, sound: 'evsaloon' },
  { id: 'mower', name: 'Mower Racer', basedOn: 'racing ride-on lawn mower', model: 'mower', color: 0x2f8a3a, evilColor: 0x9a2424,
    hw: 0.62, hl: 1.05, height: 1.35, note: 'A ride-on mower with its blades left in, a number on its side and grass flying out.',
    maxSpeed: 25, accel: 9, agility: 1.4, crossing: 0.4, health: 80, mass: 1, sound: 'mini' },
  { id: 'snailcamper', name: 'Snail Camper', basedOn: 'snail art car (Burning Man)', model: 'snailcamper', color: 0xd88a3a, evilColor: 0x6a3f86,
    hw: 1.0, hl: 2.4, height: 2.75, note: 'The cab is the head, with lamps on its stalks. The camper is the shell, and the stove smokes.',
    maxSpeed: 23, accel: 5, agility: 0.9, crossing: 0.6, health: 200, mass: 2, sound: 'lovebus' },
  // (the fourth batch of ten: unusual, retro-future and special-purpose vehicles; models in render/ideaModels4.js)
  { id: 'duckwagon', name: 'Duck Lorry', basedOn: 'DUKW amphibious truck', model: 'duckwagon', color: 0x5a6b4a, evilColor: 0x3a3a52,
    hw: 1.2, hl: 4.7, height: 2.0, note: 'A boat with six wheels: a prow, an open cab, a well with canvas bows over it and a propeller at the stern.',
    maxSpeed: 25, accel: 6, agility: 0.9, crossing: 1, health: 330, mass: 2.8, sound: 'sixbysix' },
  { id: 'pushbacktug', name: 'Pushback Tug', basedOn: 'Douglas Tugmaster airport tug', model: 'pushbacktug', color: 0x3fa0d8, evilColor: 0x6a1a1a,
    hw: 1.15, hl: 2.9, height: 2.55, note: 'A slab of counterweight on four fat wheels, a cab perched at the back and a tow bar off the nose.',
    maxSpeed: 23, accel: 8, agility: 1, crossing: 0.8, health: 300, mass: 3, sound: 'towtruck' },
  { id: 'roadsweeper', name: 'Street Sweeper', basedOn: 'Johnston compact road sweeper', model: 'roadsweeper', color: 0x24a37a, evilColor: 0x5a2a7a,
    hw: 0.95, hl: 2.3, height: 2.1, note: 'A stubby glass cab over two spinning brushes, a hopper behind and a hose down to the kerb.',
    maxSpeed: 24, accel: 7, agility: 1.1, crossing: 0.5, health: 170, mass: 1.6, sound: 'keitruck' },
  { id: 'cabledrum', name: 'Cable Drum Lorry', basedOn: 'Scania P-series flatbed with a cable drum', model: 'cabledrum', color: 0x4a7ab8, evilColor: 0x6a1a1a,
    hw: 1.2, hl: 4.2, height: 3.4, note: 'A flatbed with a wooden cable drum taller than its cab chocked on the back.',
    maxSpeed: 27, accel: 7, agility: 0.9, crossing: 0.8, health: 320, mass: 2.8, sound: 'sixbysix' },
  { id: 'gameviewer', name: 'Game-Drive Truck', basedOn: 'Toyota Land Cruiser 79 game viewer', model: 'gameviewer', color: 0x9a8a5a, evilColor: 0x2e4a2e,
    hw: 0.95, hl: 2.85, height: 2.4, note: 'No doors, three rows of seats climbing under a canopy, and a chair for the tracker out on the bull bar.',
    maxSpeed: 28, accel: 8, agility: 0.95, crossing: 1, health: 240, mass: 2, sound: 'suv' },
  // (the seventh batch: three concept cars, show cars that never went on sale; models in render/ideaModels7.js)
  { id: 'knifeedge', name: 'Knife-Edge Supercar', basedOn: 'Cadillac Cien (2002 concept car)', model: 'knifeedge', color: 0xaab3be, evilColor: 0x7a1830,
    hw: 1.0, hl: 2.23, height: 1.13, note: 'All flat facets and sharp creases, with lamps stacked up its wings like blades and its engine behind you.',
    maxSpeed: 47, accel: 19, agility: 1.35, crossing: 0.2, health: 150, mass: 1.2, sound: 'lmp' },
  { id: 'sixteen', name: 'Sixteen-Cylinder Coupe', basedOn: 'Cadillac Sixteen (2003 concept car)', model: 'sixteen', color: 0x9aa1a9, evilColor: 0x25262e,
    hw: 1.0, hl: 2.84, height: 1.4, note: 'A bonnet half the car long over sixteen cylinders, wheels nearly as tall as a child, and the cabin far back where it belongs.',
    maxSpeed: 40, accel: 14, agility: 0.95, crossing: 0.3, health: 280, mass: 1.9, sound: 'classicgt' },
  { id: 'windsong', name: 'Wind-Song Racer', basedOn: 'Mazda Furai (2007 concept car)', model: 'windsong', color: 0xe2531d, evilColor: 0x4e2c68,
    hw: 1.0, hl: 2.33, height: 1.06, note: 'A Le Mans racer with a number plate, a rotary scream and flames flowing down its flanks.',
    maxSpeed: 47, accel: 20, agility: 1.45, crossing: 0.15, health: 120, mass: 1, sound: 'rotary' },
  // PLACEHOLDERS, every one: tierless (no `tier`: no stars), free (price 0), and flagged for the balancing pass
].map(car => ({ ...car, idea: true, placeholder: true, price: 0 }));
export const IDEA_CAR = Object.fromEntries(IDEA_CARS.map(car => [car.id, car]));
