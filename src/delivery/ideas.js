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
// ============================================================================
export const IDEA_CARS = [
  { id: 'bubble', name: 'Bubble Car', basedOn: 'BMW Isetta', model: 'bubble', color: 0x8fc9dd, evilColor: 0x8a1f2b,
    hw: 0.69, hl: 1.15, height: 1.34, note: 'The whole front is the door. The smallest thing on the road.',
    maxSpeed: 21, accel: 7, agility: 1.4, crossing: 0.4, health: 80, mass: 1, sound: 'mini' },
  { id: 'threewheeler', name: 'Three-Wheeler', basedOn: 'Reliant Robin', model: 'threewheeler', color: 0xe0902a, evilColor: 0x3d4a2a,
    hw: 0.71, hl: 1.67, height: 1.37, note: 'One wheel at the front. It leans in a corner, and sometimes keeps going.',
    maxSpeed: 23, accel: 8, agility: 1.2, crossing: 0.3, health: 80, mass: 1, sound: 'mini' },
  { id: 'tinsnail', name: 'Tin Snail', basedOn: 'Citroën 2CV', model: 'tinsnail', color: 0x7f9fb4, evilColor: 0x5e1220,
    hw: 0.74, hl: 1.92, height: 1.6, note: 'Soft springs, a roll-back roof and no hurry at all.',
    maxSpeed: 22, accel: 7, agility: 1.1, crossing: 0.9, health: 85, mass: 1, sound: 'commuter' },
  { id: 'bug', name: "People's Bug", basedOn: 'Volkswagen Beetle (Type 1)', model: 'bug', color: 0x9fd0a8, evilColor: 0x1d1d22,
    hw: 0.77, hl: 2.04, height: 1.5, note: 'A dome on four round wings, with the engine in the tail.',
    maxSpeed: 25, accel: 8, agility: 1.1, crossing: 0.7, health: 110, mass: 1, sound: 'commuter' },
  { id: 'twostroke', name: 'Two-Stroke Saloon', basedOn: 'Trabant 601', model: 'twostroke', color: 0xb5cfe0, evilColor: 0x6f7a55,
    hw: 0.75, hl: 1.78, height: 1.44, note: 'A little pastel box that leaves a blue haze behind it.',
    maxSpeed: 22, accel: 7.5, agility: 1.05, crossing: 0.5, health: 80, mass: 1, sound: 'junker' },
  { id: 'brickestate', name: 'Brick Estate', basedOn: 'Volvo 240 estate', model: 'brickestate', color: 0xc9b47c, evilColor: 0x232a3a,
    hw: 0.86, hl: 2.4, height: 1.46, note: 'Square everything. It would carry a wardrobe and shrug off a wall.',
    maxSpeed: 30, accel: 9, agility: 1, crossing: 0.6, health: 230, mass: 1.4, sound: 'wagon' },
  { id: 'woody', name: 'Woody Wagon', basedOn: '1949 Ford "Woody" wagon', model: 'woody', color: 0x7a2432, evilColor: 0x1f3a2e,
    hw: 0.91, hl: 2.6, height: 1.68, note: 'Timber down its sides and a surfboard on the roof.',
    maxSpeed: 26, accel: 8, agility: 1, crossing: 0.55, health: 150, mass: 1.3, sound: 'wagon' },
  { id: 'stately', name: 'Stately Saloon', basedOn: 'Rolls-Royce Silver Shadow', model: 'stately', color: 0x24365e, evilColor: 0x4a1622,
    hw: 0.9, hl: 2.58, height: 1.52, note: 'A temple of a grille with a mascot on top, and two shades of paint.',
    maxSpeed: 34, accel: 10, agility: 1, crossing: 0.45, health: 220, mass: 1.7, sound: 'hearse' },
  { id: 'limo', name: 'Stretch Limo', basedOn: 'Lincoln Town Car stretch limousine', model: 'limo', color: 0xf0f0ec, evilColor: 0x141418,
    hw: 0.99, hl: 4.2, height: 1.48, note: 'As long as two cars, with a window for every guest.',
    maxSpeed: 32, accel: 9, agility: 0.9, crossing: 0.2, health: 200, mass: 2, sound: 'hearse' },
  { id: 'milkfloat', name: 'Milk Float', basedOn: "Smith's / Wales & Edwards electric milk float", model: 'milkfloat', color: 0x2f67b1, evilColor: 0x7d1d1d,
    hw: 0.8, hl: 1.85, height: 2.05, note: 'Electric, open-sided and stacked with crates. Slow, and it rattles.',
    maxSpeed: 21, accel: 6, agility: 1, crossing: 0.5, health: 80, mass: 1.2, sound: 'keitruck' },
  { id: 'pony', name: 'Pony Car', basedOn: '1965 Ford Mustang fastback', model: 'pony', color: 0x3f74b8, evilColor: 0x1f3d2a,
    hw: 0.87, hl: 2.3, height: 1.3, note: 'A long bonnet, a short deck and a fastback roof.',
    maxSpeed: 40, accel: 14, agility: 1.1, crossing: 0.4, health: 170, mass: 1.5, sound: 'muscle' },
  { id: 'splitwindow', name: 'Split-Window Coupe', basedOn: '1963 Chevrolet Corvette Sting Ray', model: 'splitwindow', color: 0xb9c2cc, evilColor: 0x7a1218,
    hw: 0.88, hl: 2.22, height: 1.26, note: 'A pointed nose, lamps that pop up, and a spine through its rear window.',
    maxSpeed: 43, accel: 15, agility: 1.2, crossing: 0.3, health: 150, mass: 1.3, sound: 'classicgt' },
  { id: 'wedge', name: 'Wedge Supercar', basedOn: 'Lamborghini Countach', model: 'wedge', color: 0xd21f1f, evilColor: 0x131316,
    hw: 1.0, hl: 2.07, height: 1.07, note: 'The poster on the bedroom wall: a flat wedge, doors that go up and a huge wing.',
    maxSpeed: 47, accel: 17, agility: 1.3, crossing: 0.15, health: 130, mass: 1.2, sound: 'miata' },
  { id: 'centreseat', name: 'Centre-Seat Hypercar', basedOn: 'McLaren F1', model: 'centreseat', color: 0xf07c1c, evilColor: 0x2c2140,
    hw: 0.91, hl: 2.14, height: 1.14, note: 'The driver sits in the middle, a passenger behind each shoulder.',
    maxSpeed: 48, accel: 20, agility: 1.45, crossing: 0.2, health: 140, mass: 1.1, sound: 'miata' },
  { id: 'pandacoupe', name: 'Panda Coupe', basedOn: 'Toyota Sprinter Trueno AE86', model: 'pandacoupe', color: 0xf2f2ee, evilColor: 0xb81f24,
    hw: 0.82, hl: 2.1, height: 1.33, note: 'White over black, lamps that pop up, and a cup of water on the dashboard.',
    maxSpeed: 36, accel: 12, agility: 1.45, crossing: 0.4, health: 110, mass: 1, sound: 'hothatch' },
  { id: 'midnight', name: 'Midnight Coupe', basedOn: 'Nissan Skyline GT-R (R34)', model: 'midnight', color: 0x1f4fb4, evilColor: 0x3a1f5c,
    hw: 0.9, hl: 2.3, height: 1.36, note: 'Square shoulders, four round tail lamps and a wing as tall as its roof.',
    maxSpeed: 46, accel: 18, agility: 1.35, crossing: 0.4, health: 180, mass: 1.4, sound: 'rotary' },
  { id: 'rallywedge', name: 'Rally Wedge', basedOn: 'Lancia Stratos', model: 'rallywedge', color: 0xf2f2ee, evilColor: 0xc1121f,
    hw: 0.88, hl: 1.86, height: 1.11, note: 'Shorter than it is sensible, with a visor for a windscreen and four spot lamps.',
    maxSpeed: 41, accel: 16, agility: 1.45, crossing: 0.9, health: 120, mass: 1, sound: 'rally' },
  { id: 'safari', name: 'Safari Wagon', basedOn: 'Land Rover Defender 110', model: 'safari', color: 0x47633f, evilColor: 0x2b2b2e,
    hw: 0.9, hl: 2.3, height: 2.05, note: 'Flat panels, a rack and a ladder, the spare on the bonnet and a snorkel.',
    maxSpeed: 30, accel: 9, agility: 1, crossing: 1, health: 260, mass: 1.8, sound: 'suv' },
  { id: 'widetruck', name: 'Wide Truck', basedOn: 'AM General Hummer H1', model: 'widetruck', color: 0xc8b07a, evilColor: 0x1a1a1d,
    hw: 1.1, hl: 2.35, height: 1.9, note: 'Wider than a lane likes, and lower than it looks.',
    maxSpeed: 31, accel: 9, agility: 1, crossing: 1, health: 340, mass: 2.3, sound: 'liftedtruck' },
  // (really 3.1 m wide, 5.5 m long and 3.2 m high: too wide for a lane, so it is driven, and shown, at 0.87 of that)
  { id: 'monster', name: 'Monster Truck', basedOn: 'Bigfoot (Ford F-250)', model: 'monster', color: 0x1f58c2, evilColor: 0x1c1c20,
    real: { hw: 1.55, hl: 2.75, height: 3.2 }, scale: 0.87,
    hw: 1.35, hl: 2.39, height: 2.78, note: 'A pickup on tyres taller than a car. It parks on top of things.',
    maxSpeed: 28, accel: 9, agility: 1, crossing: 1, health: 420, mass: 3, sound: 'sixbysix' },
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
  { id: 'fireengine', name: 'Fire Engine', basedOn: 'American LaFrance pumper', model: 'fireengine', color: 0xc8161d, evilColor: 0x25252b,
    hw: 1.25, hl: 4.5, height: 2.9, note: 'Red, with a ladder on top, hose reels, a pump panel and its lights going.',
    maxSpeed: 33, accel: 7, agility: 0.9, crossing: 0.8, health: 400, mass: 3, sound: 'bus' },
  // PLACEHOLDERS, every one: tierless (no `tier`: no stars), free (price 0), and flagged for the balancing pass
].map(car => ({ ...car, idea: true, placeholder: true, price: 0 }));
export const IDEA_CAR = Object.fromEntries(IDEA_CARS.map(car => [car.id, car]));
