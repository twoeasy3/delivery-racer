# Prank cargo: a draft of ideas for the owner's OK (K3, 12-Oct, revised)

Ideas only. Nothing here is modelled, and no game code is changed.

## The owner's wording (checklist K3, 11-Oct)

> "Let's improve these, drop the ones in 14) and then let's do some prank-related items. I would want a draft
> of ideas now before I OK the modelling. This was expensive for very poor effort".

And of K2, the complaint this follows: "The new cargos are nowhere near as good as the previous ones", and
"5a) The agent was really uninspired and just gave variations of the same concept, executed poorly."

My reading: a batch of Evil cargo items on the theme of practical jokes (joke-shop goods and set-up pranks),
each a different idea with its own silhouette, to the standard of the first fifty, drafted here for a yes or
no per item before anyone builds one. "Improve these" and "drop the ones in 14)" are K2, done on
`delivery-cargofix` (bailiffs, salesman and surprise party dropped), so they are not repeated here.

## The three states, as the game has them

Taken from `cargo.js`, `config.js` (`CONFIG.consignment`), `render/cargo.js`, `cargopage.js` and the model
files. A **Good** item has no states: it idles. An **Evil** item has exactly three, in `CARGO_STATES`, numbered
0, 1, 2, and every prank below is an Evil item.

| # | State | When (the share of the run's clock left: `remaining / allowed`) | What the game does at the turn |
|---|---|---|---|
| 0 | **calm** | more than 50% of the clock left (`consignment.agitated: 0.5`) | the state the run starts in |
| 1 | **agitated** | 50% of the clock left, or less | a tick sound, a flash round the HUD's round window, the label under it changes to the item's second phrase |
| 2 | **furious** | 20% or less (`consignment.furious: 0.2`), **and all through the tip countdown** (the clock past zero, until the timeout) | the same tick and flash; the label changes to the third phrase |

- The clock is the run's allowed time for the side being played (`Game.allowed`), so the turns come at the
  same share of the clock on every level. The player's driving sets the state only by how long they take.
- Each item names its three states as **short phrases in sentence case** in `cargoText.json` (`"states":
  ["Rocking","Cracked","Hatched"]`); the phrase is what the HUD label shows. The item's name is Title Case.
- The model eases from one state's pose to the next over **0.5 s** (`TRANSITION`); the HUD window reframes
  on what each state takes up, so a calm item is not lost in the room its furious state needs.
- **At the kerb** the state is frozen as the line was crossed (`Delivery.state`). The item is set down with a
  puff of dust and a squash, then the game moves it the same way for every item: *calm* stands and animates;
  *agitated* edges about with a hop now and then; *furious* runs round its spot, leaps, swells by a fifth,
  throws red and yellow sparks, and the car beside it shakes. The item's own animation runs on top of that.

**What changes between states, in the best existing items** (the standard: a different outline each time,
a different rhythm of motion, and a colour or effect that turns):

- **Porcupine** (Sniffing about / Balled up / Rabid, `cargoModels.js`): *calm* a long low oval, head out,
  only the back quills showing and laid flat, sniffing along; *agitated* a ball, head and feet tucked away,
  every quill out and bristling, trembling and rocking; *furious* a bigger oval reared up, head out again,
  eyes red and grown, jaw open and foaming, the quills longer and jittering, hopping on the spot.
- **Specimen Jar** (Coiled up / Lid lifting / Loose): *calm* a sealed jar of green liquid with one tentacle
  coiled at the bottom, bubbles rising slowly; *agitated* the tentacle stands up through the neck and lifts
  the lid, which tilts on it, an eye appears in the glass; *furious* the lid knocked off and spinning above,
  three tentacles out and waving, the liquid purple, the skin and the eye red, the jar shaking.
- **Egg in a Nest** (Rocking / Cracked / Hatched, `cargoModelsEvil2.js`): *calm* a whole egg rocking in its
  nest; *agitated* a ring crack, the top lifted at the front, an eye looking out of the gap, jittering;
  *furious* the top of the shell thrown off and lying against the nest, a dragon out of it flapping its wings
  and breathing flame.

So for each prank below the three states are written in that form: **the game's state name, the item's own
phrase, then what the outline, the motion and the colour or effect are in that state.** Calm is a plain
object with one tell; agitated is the prank arming; furious is the prank going off, over and over.

## What a cargo item is for (so the ideas fit the slot)

- A level carries one Good and one Evil item, the same every run. It is **only a sight: nothing in play goes
  by it** (`cargo.js`). It turns in the HUD's round window, spins on the level card, and is set down at the
  kerb when the level is delivered.
- Pranks are **things**, not people in boxes, so they differ from the "malicious deliveries" (hands and
  paper) and cannot become more "variations of the same concept".

Near-neighbours already in the game, which the ideas stay clear of: Jack-in-the-Box (a thing on a spring out
of a box), Glitter Bomb (an erupting gift), Ticking Parcel and Cannonball (a fuse), Sack of Snakes (so no
spring-snake nut can), Skunk (so no stink bomb), Mimic Chest (teeth in a box), Cage of Bats and Crate of Bees,
Marching Band (noise out of a box), Haunted Mirror, Cursed Doll and Possessed Teddy (haunted things),
Bouquet in a Vase, Birthday Present.

## The ideas (ten; each one its own idea and its own outline)

For each: the concept; the silhouette (what reads in the 112 x 84 level-card tile and the HUD's round window,
and at the kerb from the chase camera); the three states in the game's terms; the levels it suits. In play it
does what every cargo does (above): the states turn with the clock and the kerb plays its frozen state.

### P1. Whoopee Cushion

- **Concept:** a giant inflated whoopee cushion, the classic, delivered to be sat on.
- **Silhouette:** a wide plump red disc with a pinched flat nozzle out of one side, a yellow star-burst
  printed on top. Low and round: nothing else in the set is a disc.
- **Calm, "Plump":** fully inflated, a slow breathing swell of a few percent; the nozzle lifts and settles.
- **Agitated, "Wheezing":** the disc sags to two-thirds height and refills in short puffs, the nozzle
  flapping; a small ring of air lines pops from the nozzle at each puff; a shiver across the top.
- **Furious, "Let rip":** it goes flat to a pancake with one long blast (a wide cone of wavy air lines out of
  the nozzle), skids and spins half a turn on the recoil, then reinflates fast and does it again; the
  star-burst flashes brighter at each blast. Three heights: plump, sagging, flat.
- **Suits:** City Suburbs, Toy Box Derby, Thrill Park.

### P2. Bucket on a Trip Wire

- **Concept:** the bucket-over-the-door prank, packed ready: a brimming tin bucket balanced on a wedge, a taut
  string from its handle to a peg.
- **Silhouette:** a tall tapering galvanised bucket, handle up, a wedge under one edge and a string down to a
  peg at the base. Tall with a lean: unlike any container in the set. The water is a flat blue disc at the
  brim with the rim standing proud of it (not a coplanar face).
- **Calm, "Balanced":** upright on its wedge, the string taut and humming (a tiny vibrato), the water disc
  tilting a degree or two.
- **Agitated, "Slopping":** the bucket rocks on the wedge through fifteen degrees, the water disc tilting
  against it and sheets of water (flat blue slabs) slopping over the rim and dropping out of sight; the
  string jerks.
- **Furious, "Tipped":** the bucket lies on its side on the ground with a standing sheet of water frozen
  mid-pour out of it, the wedge flung clear, the string slack and whipping; the bucket rolls back and forth
  on its side, drips (small blue spheres) falling from the sheet. Upright, rocking, over: three outlines.
- **Suits:** Farm Lanes, Construction Site, Cattle Drive.

### P3. Squirting Flower

- **Concept:** the lapel squirting flower, made huge: a daisy on a stalk with the rubber bulb and tube hanging
  off it.
- **Silhouette:** one big white-petalled daisy with a yellow heart on a green stalk, a pear-shaped black
  rubber bulb hanging on a tube beside it. One flower with a bulb, wider than the bouquet is tall.
- **Calm, "Innocent":** the petals nod in a slow breeze, the bulb swings gently on its tube.
- **Agitated, "Pumping":** the bulb squeezes flat and round by itself, the heart bulges in time, a fat drop
  hangs off the heart and falls; the stalk leans forward.
- **Furious, "Squirting":** a long arc of water (a curved blue tube) out of the heart, the petals spinning
  like a propeller, the bulb pumping hard, the whole flower whipping side to side so the arc sweeps. Still,
  pulsing, spinning: three outlines.
- **Suits:** Mystery Meadows, Garden City, Emerald Steps.

### P4. Chattering Teeth

- **Concept:** wind-up chattering teeth, the joke-shop kind, on the loose in the car.
- **Silhouette:** a big set of white teeth on pink gums with a wind-up key out of one side, standing on a
  small open crate (a flat black face across the opening, the teeth proud of it). The key is the tell; the
  mimic's teeth are in a chest lid, these *are* the thing.
- **Calm, "Wound":** teeth shut on the crate, the key turning slowly, one clack every couple of seconds (the
  top jaw lifts and drops).
- **Agitated, "Chattering":** fast clacking, hopping a hand's width on the spot, the key a blur, the crate
  rocking under it.
- **Furious, "Snapping":** the teeth leap clear of the crate and land back, bite the crate's rim and hang off
  it, jaws wide; the crate scoots about; the gums flush red. On the crate, bouncing on it, off it: three
  outlines.
- **Suits:** Night Drive, After Hours, Thrill Park.

### P5. Custard Pie Catapult

- **Concept:** a pie-in-the-face machine: a spring-loaded paddle, set, with a cream pie sitting on it and a
  stack of refills.
- **Silhouette:** a flat hinged arm on a low base with a pie tin and a dome of white cream on the end, a short
  stack of tins beside it. A cantilever: nothing else in the set is an arm on a base.
- **Calm, "Set":** the arm held flat under tension and quivering, the cream dome wobbling, a cherry on top.
- **Agitated, "Twitching":** the latch slips: the arm jerks up a few degrees and drops, the cream slides and
  flat white splats appear on the base; the stack of tins shifts.
- **Furious, "Firing":** the arm snaps upright and back, a pie flying off the end (up and gone, a fresh one
  from the stack appearing on the paddle), cream splats on the base and arm, the base hopping on the recoil;
  the stack shrinks and refills. Flat, jerking, upright: three outlines.
- **Suits:** Quiet on Set, Stunt Double, Monte Carlo.

### P6. Air Horn under a Cushion

- **Concept:** a compressed-air horn wedged under a soft cushion, so the next person to sit sets it off.
- **Silhouette:** a red can with a wide flared trumpet, a lumpy cushion squashed on top. A trumpet shape from
  any side; the cushion is the tell that it is a trap.
- **Calm, "Primed":** still; the cushion settles a little and lifts, as if someone is about to sit.
- **Agitated, "Parping":** short blasts: the trumpet puffs out (scales up a tenth) and the cushion jumps an
  inch with each, a ring of sound lines leaves the trumpet.
- **Furious, "Blaring":** one long blast: the trumpet flared wide, big sound rings streaming, the horn riding
  its own recoil in a circle, the cushion flung off and landing back on it; the can glows hot red. Cushion on,
  cushion jumping, cushion off and the horn wide: three outlines.
- **Suits:** Expressway, Speed Trap Alley, Rival Run.

### P7. Bedsheet Ghost

- **Concept:** the oldest costume: a sheet with two eyeholes, and someone under it who cannot keep still.
- **Silhouette:** calm a folded square; furious a white draped cone with two black eyeholes and a wavy hem,
  trainers showing beneath. The soft cone is unlike anything in the set (the genie is smoke, the doll a
  figure).
- **Calm, "Folded":** a neat folded square of sheet with the two eyeholes on top; it twitches now and then and
  a corner lifts.
- **Agitated, "Rising":** the sheet lifts into a short cone with the eyeholes at the front, swaying, a muffled
  "boo" speech bubble popping up and sinking.
- **Furious, "BOO":** full height, billowing, two arm-shapes out under the sheet, the trainers kicking below
  the hem, leaping; "BOO!" in big letters above it; the eyeholes glow. Square, short cone, tall leaping cone.
- **Suits:** Night Drive, All Heck, Mystery Meadows, Northern Lights.

### P8. Boxes within Boxes

- **Concept:** the nested-boxes gift: a huge present that opens on a smaller box, which opens on a smaller one,
  down to a tiny box with a note that says GOTCHA.
- **Silhouette:** calm one big brown box with a ribbon; furious a stepped tower of ever-smaller open boxes
  with a tiny one on top. Each open box is a black face across its opening with the next box standing proud.
  The Birthday Present stays one cube; this one becomes a pyramid.
- **Calm, "Wrapped":** one box, ribbon tails fluttering, a soft thud inside that rocks it.
- **Agitated, "Opening":** the lid tips up and a second box rises out of the black opening, then a third,
  the two-tier tower rocking; lids clapping.
- **Furious, "Gotcha":** the full tower, five or six boxes, the tiny top one open with a note flapping that
  says GOTCHA, the whole stack swaying, every lid clapping, the bottom box hopping. One cube, two tiers, a
  tower: three outlines.
- **Suits:** Christmas Eve, City Suburbs, Big Business.

### P9. Spider on a Fishing Line

- **Concept:** the fake hairy spider dangled from a fishing rod, the kind lowered over a doorway.
- **Silhouette:** a short rod on a stand with the line hanging and a fat black spider on the end, legs out
  wide: a tall thin shape with a blob under it. Plainly rubber: a smooth body, bead eyes, a price tag on one
  leg.
- **Calm, "Hanging":** the spider turns slowly on the line, the rod's tip bending under it.
- **Agitated, "Bobbing":** the rod jigs, the spider bouncing up and down on the line, legs flexing, the tag
  flapping.
- **Furious, "Dropped":** the line pays out and the spider lands and scuttles round the base, legs going,
  the rod whipping; then it is reeled up fast and dropped again; the eyes glow red. Hanging high, bobbing in
  the middle, on the ground: three outlines.
- **Suits:** Mystery Meadows, All Heck, Safari, Farm Lanes.

### P10. Disappearing Ink

- **Concept:** a bottle of disappearing ink with a quill, splashing blots that fade away.
- **Silhouette:** a fat round blue bottle with a cork and a long feather quill standing in it, on a blotter. A
  bottle with a plume: the quill's tall diagonal is the tell (the genie's bottle is thin and smoky).
- **Calm, "Corked":** the quill sways, the ink line sloshes, the cork sits tight.
- **Agitated, "Blotting":** the cork pops off and hangs on its string, the quill dips and flicks, flat blue
  blots land on the blotter and the bottle, each shrinking to nothing in a second or two.
- **Furious, "Splashing":** the bottle tips and rights itself, a fan of blots in the air (small flat discs on
  arcs), the blotter going blue and back to white in waves, the label's grin showing, the quill scribbling;
  the ink itself turns from blue to clear. Corked and upright, open and flicking, tipping with a fan: three
  outlines.
- **Suits:** Australian Capital Territory, Big Business, Montreal.

All ten fit three states: none needed fixing or dropping for that, since each has a natural armed stage
between "a plain thing" and "going off".

## Considered and left out

Exploding cigar (a fuse again: the parcel and the cannonball); rubber chicken (limp and yellow, too near the
goose and weak in two of three states); joy buzzer (its sparks are the reactor's); dribble glass (the bucket
does water better); spring snakes in a nut can (the sack of snakes); stink bomb (the skunk); boxing glove in a
box (the jack-in-the-box); itching and sneezing powder (no silhouette to speak of); fake dog mess (taste;
the owner would have to ask for it).

## Constraints for whoever models them (noted, not done)

- A model is a group standing on y = 0, facing +z, about a metre tall (`render/cargoModels.js`), built with
  `stated(group, pose(t, agitated, furious))` so the two weights ease over 0.5 s; it must read in the HUD's
  round window, spinning on the level card, and at the kerb. All ten are far within a lane (3.5 m).
- An open-topped container (P4's crate, P8's boxes) is only a flat black face across the opening with the
  contents standing proud of it; no coplanar faces (P2's water disc sits below the rim); nothing passing
  through anything else (P2's string and wedge, P5's arm and pies, P9's line, P8's nested lids need care).
- Each state changes the **outline**, not just the colour, as the porcupine, jar and egg do; the "three
  outlines" line on each idea above is that check.
- Names in Title Case, states as short phrases in sentence case, in `cargoText.json` and `cargo.js`'s
  `CARGO.evil`; suggested ids: `whoopee`, `bucket`, `squirter`, `teeth`, `piecatapult`, `airhorn`, `ghost`,
  `nestedboxes`, `spider`, `ink`.
- Build order if OK'd: P1, P6, P10 and P8 are boxes, cylinders and spheres (cheapest); P2, P5 and P9 have
  thin parts (string, arm, line) that must not phase; P7's cloth cone and P3's petals are the most work.

## Recommended top three

1. **P1 Whoopee Cushion:** the most recognisable prank there is, a silhouette nothing else has, and its three
   states are three heights of the same disc.
2. **P5 Custard Pie Catapult:** a proper machine, a different outline per state, and cream is a particle the
   game does not have yet.
3. **P7 Bedsheet Ghost:** a square that becomes a cone that leaps; funny rather than scary, which keeps it
   apart from the haunted things.

Next in line if a fourth or fifth is wanted: P8 Boxes within Boxes, P2 Bucket on a Trip Wire.

## For the owner's decision

1. **Which of the ten to build** (a yes/no per item), and whether ten is the batch or fewer.
2. **Should a furious prank do anything in play?** Today cargo is a sight only, and the kerb's furious
   behaviour (running round, leaping, sparks, the car shaking) is the same for every item. If the owner wants
   more, the fair version is cosmetic only: a splat of cream across the HUD's cargo window that wipes in two
   seconds (P5), a honk that makes the nearest traffic car swerve a lane (P6), a blue blot on the corner that
   fades (P10). None touches the player's car, stops it, or costs anything without counterplay. My
   recommendation is **no**: keep cargo a sight, as the other sixty are.
3. **A prank "going off at the door"** at the kerb (the pie fired at the customer's door, the bucket tipping
   as the door opens) would need a small change to the delivery ending, which today only plays the generic
   state behaviour plus the model's own animation. Not needed for any idea to read; the owner's call.
4. **Level pairings:** the "Suits" lines are suggestions; the cargo per level lives in `levelText.json` and is
   the owner's.
