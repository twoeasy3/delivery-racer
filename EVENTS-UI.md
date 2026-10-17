# The Events tab on a phone, and the Comet Hunt's screen (CHECKLIST 446)

Branch `claude/events-ui` from main v1.1.152-alpha (954c288). Render only: `render/eventmodes.js` (new), `events-ui.css` (new),
`render/menustage.js` (wiring, the Comet Hunt panel's markup). `events.js` / `events.json` untouched; replay fingerprint
33a0394c26 / legacy dd565f56b3 at the start and at the end.

The owner (17-Oct): "(1) Car Hunt and Concept Strike vertically on a phone. I don't want this, design a solution. Maybe some other
toggles to flick through screens. (2) The Comet Hunt/Special Event screen looks outdated compared to the other newer UI now. Let's
spruce it up."

## What was stacked (before)

On a phone held upright (390x844), the Events tab was:

- a row of group chips: `Events` | `Comet Hunt`;
- under `Events`, ONE level card at a time (Christmas Eve, the Car Hunt, the Concept Strike), and the way between them was the
  level strip of three thumbnails UNDER the card, or the card's small arrows;
- the Car Hunt and the Concept Strike cards (`#startScreen.cx-card`, CHECKLIST 222) were laid out as a page that scrolls: picture
  band, tags, name, road, description (4 lines), the figures, the car line, the day's tasks (Strike), the car panel, the pack panel,
  the countdown, the road's chip, then the thumbnail strip. The Car Hunt card was 803 px tall in a 530 px window (the menu 1163 px
  in 844), the Concept Strike's 866 px (1226 px in 844). So reaching the Concept Strike from the Car Hunt meant scrolling past the
  whole card to the strip at the bottom (its top at 925 px of an 844 px screen), one event stacked under the other.
- The Comet Hunt was a second group chip with its own screen (title, "2/8 stages done", "Ends in", a progress ring, the prize,
  a row of stage cards, the stage picked's figures), styled before the showroom / cosmetics / packs screens.

Stills: `before/phone-*.png`, `before/wide-*.png` (in the session scratchpad, `events-ui/`).

## The alternatives (for one-handed use)

| | How you move | One-handed | Shows what is there | Cost |
|---|---|---|---|---|
| **A. Segmented tabs at the top** (+ swipe on the card) | tap a tab; swipe the card left / right | swipe anywhere with the thumb; the tabs need a reach to the top | every event named at once, the one shown filled, a dot where something waits | one row of buttons; no new layout |
| B. Swipeable carousel with dots | swipe; dots under the card | best for the thumb | dots say how many, not which; a badge on a dot is hard to read | scroll-snap pages; each card still laid out on its own |
| C. A single "next event" pager (‹ Event 2 of 4 ›) | the pager's arrows | arrows reachable if put at the foot | one name at a time; nothing tells you another event has something waiting | smallest |

**Chosen: A, with B's swipe.** The tabs name every event (so a waiting Comet Hunt is visible from the Car Hunt), the dot is
readable, and the swipe across the card gives the thumb what B gives. The tabs sit where the group chips were (the owner asked for
them pinned at the top of the events screen). B is the runner-up: worth revisiting if the tabs are felt too far from the thumb on a
tall phone (a strip at the foot over START would be the other place). C was rejected: it hides what is waiting.

## What was built

**(1) The mode strip** (`render/eventmodes.js`, every size): in the Events tab the group chips are replaced by a segmented control,
one tab per event: each single-level event (Christmas Eve, the Car Hunt, the Concept Strike) and each special event of more stages
(the Comet Hunt). An icon (inline SVG: gift, crosshair, bolt, comet; a flag for an event not listed) and one word (Xmas, Hunt,
Strike, Comet; else the first word of its name). The tab shown is filled with the accent (as the Cosmetics tabs); `role=tablist`,
`aria-selected`, the arrow keys move along it when it has the focus. A green dot (the Shop's) on a tab with something to play (the
same rule as the Events tab's own dot, per event). The tab last picked is remembered in `localStorage['delivery_events_mode']`
(never the save): `?tab=events` and the Events tab's button open on it. A swipe across the card (not on a button or the stage row)
goes to the next / previous event. The arrow keys on the menu still step levels as before.

On a phone held upright: the level strip is not drawn on the Events tab, the card arrows are hidden, and the Car Hunt / Concept
Strike card fits the screen (the menu no longer scrolls): a picture band, LIVE NOW and the car-rule tag, the name, ONE status line
(the countdown), the day's tasks (Strike), the car card and the pack card side by side, and a `Details` button folding the road's
name and words, the figures, the car line, the road's chips (and the Strike's blueprint odds). A car line that stops START (red)
stays out. Whatever does not fit scrolls inside the card. Desktop and tablet: the strip and the side-by-side layout are as they were;
only the chips became the mode strip.

**(2) The Comet Hunt screen** (every size): the name and one status line (`2/8 · Ends in 14d 16h`); the grand prize as a card
(its car's still, the label, the name; `Won` once won); a STEPPER (a node per stage: done filled with a tick, the next ringed in
the accent, a car needed red, locked dim; the one picked ringed white; a trophy at the end), a tap on a node picks that stage; the
stage cards restyled (12 px radius, the map's picture fading into the card, pill-shaped badge and state: `✓ Done`, `Ready`,
`After stage 3`, `Opens Fri`, `Car needed`), the locked cars desaturated; the stage picked as `Stage 3 · Night Drive` with
`Details` (a phone) over its figures, car line and the road's chips. START stays the one primary action (the menu's own). Motion:
colour / shadow transitions only, none under `prefers-reduced-motion`.

Cars: the existing `stillCar` pictures (`render/carstill.js`, cached, one shared renderer): no new WebGL context.

## Tokens used

From `#startScreen` (menu2.css): `--accent`, `--accent-ink`, `--panel`, `--panel-2`, `--line`, `--ink-dim`, `--display`. The card
gradient `linear-gradient(165deg, rgba(38,62,104,.94), rgba(16,21,33,.96) 75%)` and its inset line / drop shadow are the event
card's car / pack panels' (menu2.css `.cx-car`), so the prize card matches them; the live green `#1d7f47` and the dot `#3fc46a` are
the existing tag's and the Shop's. Type: `--display` italic 800 for names, system-ui 800 small caps-style for labels, as the rest.

## Checked

`scripts/.events-ui-check.mjs` (render group): 390x844 phone, one event at a time, the tabs, a tap and a swipe, remembered,
the dots (and none once the Comet Hunt is done), Details, the stepper; 1100x650 the strip beside the card, the figures shown.
`.phone-menu-check` updated: on the Events tab held upright the mode strip is checked in the level strip's place, and an event card
must FIT the screen (it was required to scroll).

## Open questions

1. The tabs at the top or at the foot (over START) for the thumb? Built at the top, as asked.
2. The Christmas tab's word is `Xmas` (Christmas fits, but crowds four tabs on a 360 px phone).
3. Should Details be open by default on a tall phone where it would fit (the Car Hunt at 844 px has room)?
4. The landscape phone layout was not changed beyond the strip (the card still scrolls inside itself there).
5. Not seen on a real device: the swipe with a real finger, the dot's contrast outdoors, a tablet.
