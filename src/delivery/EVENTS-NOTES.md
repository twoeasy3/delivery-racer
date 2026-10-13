# Special events: the plan (11-Oct)

Status: built on the feature branch `claude/special-events` (phases 1 to 4 below); merged in v1.1.9 (11-Oct).

**What was built (11-Oct):** `events.json` (the one-level events moved there from tiers.json; the special events),
`events.js` (the rules), the stage as a level of its own (`<event>-<n>`, the map's picture, words and cargo, its
best times and replays its own, TANK RAGE off: a level field `noTankRage`), `Progress.data.events`,
`Progress.stageDone`, the finish (done, tip, prize once), the menu (a group per live special event; a stage's card:
the event, the stages done, the countdown, the car line, All stages), the event screen (`render/menustage.js`
eventCard: the progress ring, the prize, the stage cards with their cars drawn still in 3D: `modelviews.js`
drawStill), the prize car (the Silver Comet: `cars.js` EVENT_CARS, on the Centre-Seat idea's model; no tag), and a
test event, The Comet Hunt (11 Oct to 1 Nov: Farm Lanes any car; City Suburbs needs the Love Bus; Night Drive a free
try in the Silver Comet; Tokyo Expressway needs the Tow Truck, a blue tier a new player cannot buy). Its clocks worked
out by hand from clean runs in each stage's car (`node scripts/events.mjs time`). Checked: `scripts/.events-check.mjs`
(tiers group: dates, order, the cars, the prize, the save, a stage's replay, TANK RAGE off, the end); in a browser:
the stage card, the event screen at 1000x620 and 390x760, the free try started in the Silver Comet, the Silver
Comet in the garage once won. NOT seen: a whole event played by hand; the cards with many stages; at night (the
cards' cars on a dark map picture).

**A rotating event (13-Oct, CHECKLIST 211): the Concept Strike.** `days` on a recurring event: each day of a run its own
run (window, countdown, counters), a featured car lent as a free try at the player's own ECU (the card's chip: the stage's
car lock with `ownEcu`), tasks that pay that day's pack (packs.json `givenBy.event.day`) up to a limit a day, and the
featured car's key for delivering it at its max ECU. events.js head and `payTasks`; the save's `eventRuns`.

**The owner's answers (11-Oct):**
1. Yes, in order.
2. Either side, for now. A stage's clocks are written out in full (Good and Evil), worked out by hand for the stage:
   never a multiple of the map's.
3. A mix of existing maps and new levels.
4. A stage pays its tip every time, as any level does (other rewards may change that later; money can be farmed
   elsewhere anyway).
5. The prize car can be anything: for now a car idea's model, defined as a car of its own.
6. The device's clock is fine.
7. A required car the player cannot get: too bad, that is their event over. The point is (a) to make players own
   cars that are not very competitive, and (b) to bring in, slowly, a roster of cars that cannot be bought, which
   will later be what other events require.
8. The one-level events (Christmas Eve) stay a separate kind.
9. No "Limited" label on the prize car in the garage.
11. (later) An existing level reused as a stage: the event gives its clocks (each stage writes its own, in full).
12. (later) No TANK RAGE in a stage: the feature off (no targets, no pieces found, none carried in or out).
13. (later) The stage cards' pose: the picture's second and third cars (from a little above, the front three-quarters
    on, the nose to the left), not the first's (from above).
10. A player stopped by a car they cannot get yet is not out: the event is over only when its clock is. If they get
    the car (its tier opened, bought) before the end, they carry on from that stage.

## What the owner asked

Within the menu's **Events** group, besides the one-level events there are now (Christmas Eve), **special events**:

- A special event is **a series of levels (stages) played one after another**.
- It has a **start and an end date**. The end date closes **every stage** in it.
- Each stage may have **its own start date**, so a three-week event cannot be finished in one sitting.
- Each stage may or may not have a **required car**. The player must **own** it to play the stage, unless it is a
  **free try**: then the stage lends it, as the special levels lend theirs (the level's `car`, a car lock).
- **The grand prize** for finishing every stage is a **limited car**: only that event gives it.
- **The screen** looks like the picture the owner sent (Asphalt 9's car hunt): a row of stage cards, each with
  STAGE n, the stage's car in 3D held at one pose (the real model, not a picture), its state (READY, a date), a
  header with the progress and the conditions met, and the prize at the left.

## What is already there to build on

- **Events** (`tiers.json` `events`, `tiers.js`): the menu's first group; an entry has `from` / `to` (the device's
  clock), and a `reward` given once into the save (`Progress.data.claimed`), so it outlasts the event. The card
  counts down. CHECKLIST 78, 79, 83.
- **Car rules** (`cars.js` carRule): a level's `car` is a car lock (driven, owned or not: the free try); a level's
  `allowedCars` is a list that must be owned. The garage parks a level's listed cars, drawn, and sells only what
  the tiers allow (CHECKLIST 79, 83).
- **Limited cars:** `cars.js` `EVENT_CARS` (empty): a car only an event gives, owned for good once given, never
  sold. The garage already shows an owned one.
- **3D cards:** `render/modelviews.js`: one renderer for many small card views (the reference pages and "What's
  on this road" use it). `render/garage.js` `makeShowCar` / `paintShowCar` build any car as the garage shows it.
- **Level pictures:** `src/delivery/levelshots/` (every menu level's still): a stage card's background.
- **Replays and ghosts** (`replay.js`, `replaystore.js`) are keyed by the level's id.

## The design

### Where an event is written: `src/delivery/events.json` (new)

All the events move here from `tiers.json` (whose `events` list goes): the plain ones as now, and the special ones.

```json
{
  "events": [
    { "id": "christmas", "from": "2026-10-10", "to": "2026-12-26" },
    {
      "id": "ts900", "name": "TS 900 Racer Pro", "from": "2026-10-12", "to": "2026-11-02",
      "prize": { "car": "ts900" },
      "stages": [
        { "level": "monte-carlo", "from": "2026-10-12", "car": "sport", "free": true },
        { "level": "tokyo",       "from": "2026-10-13", "car": "hothatch" },
        { "level": "panorama-avenue", "from": "2026-10-14" },
        { "level": "noon",        "from": "2026-10-15", "car": "ts900", "free": true, "clock": { "good": 120, "evil": 95 }, "tip": 400 }
      ]
    }
  ]
}
```

- A plain event: a level's id, its dates and an optional reward, as now.
- A special event: `name`, `from`, `to`, `prize`, and `stages`:
  - `level`: the map the stage is played on: any level's id.
  - `from`: the stage opens that day (left out: with the event).
  - `car`: the required car. With `"free": true` the stage lends it (a car lock: owned or not). Without, the player
    must own it (a one-car `allowedCars`). Left out: any car the player owns, and no tier rule.
  - `clock`, `tip`, and anything else a level has: the stage's own, over the map's.
- **Each stage plays as a level of its own**, built from its map with its rules: id `<event>-<n>` ("ts900-1").
  So its best time, its medals, its replays and its ghost are the stage's own, never the map's: a tier level used
  as a stage does not get its medal from the event, nor the stage from the tier.

### The rules (`src/delivery/events.js`, new; `tiers.js` keeps the tiers only)

- **On the menu** from the event's `from` to its `to`, as now. After `to` every stage is shut and the event leaves
  the menu; what the player did stays in the save.
- **A stage is open** when all of these are true:
  - the event is on;
  - its own `from` has come;
  - the stage before it is done (assumed: in order, question 1);
  - its required car is owned, or it is a free try. A stage whose car is not owned is shown, says what it needs,
    and its START opens the garage at that car. The car may be one the garage does not sell yet (a later tier):
    then it says so, and the stage waits, as Christmas Eve's list does.
- **A stage is done** when it is delivered on time, on either side. Its tip is paid every time, as any level's.
- **A stage's clock** (`clock`: Good and Evil) must be written in full in the stage; the check refuses a stage
  without one.
- **The grand prize** is given the moment the last stage is done: the event's `prize.car` is added to the cars
  owned, and the claim recorded in the save, so it stays when the event is gone. The prize car is in `EVENT_CARS`:
  in the garage only for those who won it, never for sale (no label: the owner).
- **The save** (`progress.js`): `events: { "<event id>": <stages done> }`. Stages are done in order, so one number
  per event is enough: a few bytes in the cookie. The prize is in `claimed`, as now.
- **The clock** is the device's: there is no server. A player who sets their phone's date forward opens the stages
  early. Accepted for now (question 6); a server-side check would need a Worker script, which the owner's rules
  say needs the owner.
- **Replays** record a stage as its own level (its id and fingerprint are the stage's). A replay of a stage can
  still be watched after the event is over.

### The screen (`src/delivery/render/eventscreen.js`, new), like the picture

- **On the menu:** the Events group shows a special event as one card on the stage: its name, "3 of 4 stages",
  "Ends in 9d 4h", the prize car turning, and **Open**.
- **The event screen** is a sheet over the menu, as the replays and "What's on this road" are (closed by Back, the
  back button or Escape):
  - **The header:** the event's name, the progress (a ring with the share of stages done), "3/4 stages", and the
    end countdown.
  - **At the left**, the grand prize: the prize car in 3D, turning, with "Finish all 4 stages".
  - **A row of stage cards**, scrolling sideways (about 2.3 cards on a phone, 4 on a computer). Each card has:
    - "STAGE n" at the top;
    - the stage's level picture behind, slanted as the picture's are;
    - the required car (or, with none, the car the player would drive) in **3D, at one pose for every card**:
      from above and in front, three-quarters on, as in the picture. It is the real model and livery, drawn once
      into the card and held still. It is drawn again only if the side (Good/Evil livery) or the car changes, so
      a row of cards costs no frames on a phone;
    - a corner badge: FREE TRY, or the car's name with a tick if owned or a padlock if not, or ANY CAR;
    - the state under it: READY; DONE with the time to spare; or locked, saying why: "Opens 13 Oct", "Finish
      stage 2", "Needs the Hot Hatch";
    - a thin bar along the bottom that fills as the stage's date comes nearer (the picture's blue bar).
  - **Tapping a card** puts that stage on the stage, with its level card as usual. START plays it in the stage's
    car: lent if a free try, the player's own if required, or the player's pick if any car.
- **How the cars are drawn:** `modelviews.js` gets a `stillView(car, pose)`: the garage's model of the car, posed and
  lit as every card is, drawn once by the shared renderer into the card's canvas. The pose is a constant, so every
  card looks alike.

### What changes elsewhere

- `menustage.js`: the Events group lists plain events and special events (one card each); the stage plays its
  level as now.
- `game.js` finish: a stage delivered marks it done, pays its first tip, gives the prize after the last stage.
- `levelSchema.js`: the stage's overrides are checked as a level's fields are. A new `.events-check.mjs` (tiers
  group) checks `events.json`.
- `scripts/tiers.mjs`: the events part moves to a small `scripts/events.mjs` (print, check).

## The phases (each one merged only when the owner says)

1. **The rules and the data:** `events.json` (Christmas Eve moved there), `events.js`, the save field, a stage
   built as a level, and done, first-tip and prize logic. A headless check covers dates, order, the car rules (free
   try, required and owned, required and not for sale), done on either side, the prize given once, a stage after
   the end, and the save's round trip. The menu shows the stages as plain levels, not yet the screen.
2. **The event screen:** the cards with their still 3D cars, the header and the prize panel. Seen in a browser at
   1000x620 and 390x760.
3. **The prize car:** a limited car in `EVENT_CARS`, on a car idea's model, a car of its own.
4. **A test event:** four stages a day apart from the day it goes in, mixing a free try, a required car owned, a
   required car of a later tier (not for sale) and any car, with a prize. Played through headlessly with the clock
   moved on; looked at in a browser.

## Questions for the owner

1. **Order:** must stage 3 wait for stage 2 to be done as well as for its date? (Assumed: yes.)
2. **Done:** is a stage done when delivered on time on either side, or on both sides? (Assumed: either.)
3. **The maps:** are stages existing levels with the event's rules (another car, clock, tip), or new levels made
   for the event? (Assumed: existing maps; a new level can be added as any level is.)
4. **Money:** does a stage pay its tip every time, or the first time only? (Assumed: the first time only, so an
   event is not a place to farm money.)
5. **The prize car:** is it an existing model in a livery of its own, or a new model? What is it called?
6. **The clock:** is the device's clock good enough for now? (Assumed: yes.)
7. **A required car the player cannot buy yet** (a later tier): should the stage wait, as Christmas Eve's list does?
   Or should a required car always be a free try, or for sale to everyone during the event? (Assumed: it waits.)
8. **Christmas Eve:** does it stay a plain one-level event, or become a special event's first stage?
