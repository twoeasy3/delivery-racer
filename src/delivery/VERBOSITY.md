# Verbosity and the device defaults (17-Oct)

**Verbosity** (Options, Settings: `Verbosity: High / Medium / Low / Very low`, a tap steps down and round): which in-run
messages are said. Saved as `Progress.data.verbosity` ('veryLow' | 'low' | 'medium' | 'high'); none = High (every old save).

| Level | Hidden |
|---|---|
| High | nothing (as before) |
| Medium | driver reactions |
| Low | reactions; location messages but the important ones |
| Very low | reactions, every location message, cash pickups, every gimmick warning but the ambulance and the Bullet Train |

**To re-tag a message**, edit the one table in `render/verbosity.js`:
- `TAGS`: `'group.key'` (or a whole group, messages.json) to `reaction`, `location`, `cash`, `warning` or `keep` (always
  said). Untagged messages (busts, powerups, statuses, outcomes, lessons) are always said.
- `IMPORTANT_ZONES`: the zone welcomes that warn of a real gameplay element (humps, trains, cameras, tide, a way round...).
  The rest (place names, "nearly there!") are flavour, hidden at Low.

`Message.say` (messages.js) asks `shows(group, key)` first: one lookup a message, nothing per frame. Display only: outside
the replay fingerprint.

**Device defaults** (`render/device.js`): on a FIRST VISIT only (no save in local storage or the cookie, not a test
visit), a phone or tablet (mobile UA, or a coarse pointer with no hover, or an iPad) gets auto accelerate on, auto brake
off, Verbosity Low, on-screen controls on; a desktop gets the on-screen controls off. The save then holds
`deviceSet: true` and nothing is detected or applied again. An existing save is marked visited and left as it was.
`?device=mobile|desktop` forces the detection.

**One pedal** (`render/touch.js`, `style.css body.one-pedal`): with auto accelerate on and auto brake off, the on-screen
accelerator is dropped and the brake fills the pedals pad (double wide); any touch on the pad brakes.

Limits: `verbosity` and `deviceSet` live in the save's local storage copy only (progress.js is a rules file: its cookie
list and the save code's `tidy` are unchanged), so a cookie-only fallback or an imported save code reads High, and is
treated as visited. Check: `scripts/.device-defaults-check.mjs`.
