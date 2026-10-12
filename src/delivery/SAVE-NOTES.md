# Saves: where they are, what they are worth, and what to do (12-Oct)

Research and design only: NOTHING was built, no binding, Worker script, database or login code was added, and the game
is unchanged. "Read" = read from the code; "measured" = run headless through the game's own `Progress`, `Replay` and
`ReplayStore` (scratch script on `scripts/delivery-headless.mjs`, 73 entries in `LEVELS`, 41 cars in `CARS`);
"VERIFY" = a fact about browsers or Cloudflare from memory, to check before relying on it.

## 1. The situation today

### What is saved, and where (read)

| What | Where | Key | In the save code? |
|---|---|---|---|
| Progress: bank, levels open (`unlocked`, `levelOrder`, `tierBase`), best times both sides (= medals, earned cars), cars owned, car in use, `tierCars`, events and `claimed` rewards, tank pieces, milestone `stats` | localStorage (store of record) | `delivery_racer_progress_backup` | yes |
| Options: muted, touch controls, auto accelerate, auto brake, race class and track, Good/Evil side | inside the same progress save | (same) | yes |
| The short of progress (no best times, no stats), a fallback only | cookie, 1 year, `path=/` | `delivery_racer_progress` | n/a |
| Replays: per level and side the last run and the best (the ghost's), plus up to 40 "Save replay" runs | localStorage, one key holding everything | `delivery_replays` | no |
| Ghost on/off | localStorage | `delivery_ghost` | no |
| Level editor: autosave, and the level handed to the game | localStorage | `delivery_editor_autosave`, `delivery_editor_level` | no |

Nothing uses IndexedDB, sessionStorage, a service worker or `navigator.storage.persist()` (grep of `src/` and
`delivery/*.html`). There are no tutorial or "seen this" flags on `main` (PLAN-beginner proposes some; when built they
belong in the progress save). Test addresses (`?autostart`, `?car`, ...) set `Progress.noSave`: nothing is written.

### Sizes (measured)

- **Late-game save** (every level open, a best time on both sides of every delivery level with real decimals, all 41
  cars, a six-figure bank, 20 stats counters, events, tier cars): **3,459 bytes** of JSON; the save code
  (`DR1.` + base64) **4,616 characters**; the cookie's short copy **1,096 bytes**. Export then import round-trips exactly.
- **The same save plus what item 115 adds** (blueprint counts for 59 cars, 40 keys, unopened packs, a currency, a log of
  20 opened packs, all simulated): **6,654 bytes**, a code of about **8,900 characters** (under `CODE_LONGEST` 20,000).
- **Replays**, a "human" script (a steering change every 8 to 30 steps, a throw every 2 s): 60 s 10.3 KB, 119 s 20.7 KB,
  180 s 29.5 KB, so **about 10 KB a minute**, half of it the ghost's packed path (`inputs` about 330 a minute). The
  "last" copy drops the path, so about 5 KB a minute. Three runs: a 62 KB `delivery_replays` value.
- **Projection (arithmetic, not measured):** a completionist with a best (2 to 3 min, about 25 KB) and a last (about
  12 KB) on about 120 level-sides plus 40 saved runs holds about 4.5 to 5.5 MB in the one replay key.

### The risk this exposes (read, not tried in a browser)

localStorage is about 5 MB per origin (VERIFY: Chrome counts UTF-16 code units, Safari and Firefox about 5 MiB). The
replays and the save share that quota. When the replay key fills it, `ReplayStore.write` fails silently (fine), but the
progress save's `setItem` then fails too as soon as the save grows, and the next load reads the old copy: **recent
progress is lost without a word** while the cookie keeps only the short copy. This is the one real bug-shaped finding;
replays belong in IndexedDB (or the replay store needs a byte cap) before the 115 save is worth more.

### New device, private window, cleared data, eviction

- **New device or browser:** nothing carries over. The only bridge is the save code (Options > Export / Import).
  Replays and editor levels never travel. The move to `delivery.pingmathehippo.com` was itself a new origin: saves made
  on the old address stay there (PLAN-delivery-subdomain section 3).
- **Private windows:** storage works but is wiped when the window closes (VERIFY per browser; the code tolerates throws).
- **"Clear site data" / clear cookies:** removes both copies at once (localStorage and cookie go together). Everything is lost.
- **iOS / macOS Safari (ITP):** script-writable storage (localStorage, IndexedDB, and cookies set by `document.cookie`)
  is deleted after **7 days of Safari use without a visit** to the site (VERIFY current rule; a home-screen web app is
  exempt). The cookie fallback does not help: it is capped the same way. A player who stops for a fortnight on an
  iPhone loses everything.
- **Eviction:** without `persist()` the origin's storage is "best effort" and can be evicted under disk pressure,
  least recently used origin first (VERIFY). `navigator.storage.persist()` asks for it to be kept: Chrome grants it
  silently by engagement (bookmarked, installed, often visited), Firefox asks the user, Safari 17+ decides by its own
  heuristics (VERIFY). It does not beat the user clearing data, and its effect on the ITP 7-day rule is unclear (VERIFY).

### The save code (read)

`Progress.exportCode()` = `"DR1."` + base64 of the save's JSON. Import (`importCode`) strips whitespace, caps the length,
decodes, and rebuilds the save key by key through `tidy()` (types and ranges checked, unknown keys dropped, best times
only for levels that exist), then `restore()` migrates old level orders. It is **not tamper-resistant at all**: decode,
edit `money`, encode. Worse, it is not needed: the Options sheet has an **"Unlock everything"** button
(`render/menu.js`, `Progress.complete`) that opens every level, buys every car and fills the bank.
Two things to fix when 115 is built: `tidy()` must learn the new keys (blueprints, keys, ECU, packs, currency) or **an
import silently drops them**; and the save needs a format number (`v`) of its own, apart from `levelOrder`.

### What a save is worth now, and after item 115

Today a lost save costs a few hours: levels re-open quickly and money comes back. Item 115 (BLUEPRINTS-NOTES.md) changes
that: blueprint counts per car, ECU levels, keys, unopened packs and a pack currency are **random and slow to earn**
(a featured card is a 20% roll), so a lost save is days of luck that cannot be replayed, and if packs are ever sold it is
money. ECU-recorded replays tie replays to that state too.

**Cheating.** For a single-player game with no leaderboard, editing your own save harms no one, and the "Unlock
everything" button already does it in one click. It starts to matter with (i) item 29 (daily challenge and leaderboards):
a forged time pushes others down; (ii) a pack economy: forged packs or currency devalue what others earn, and if money is
involved, a forged purchase is a chargeback-style problem. What a tamper check costs:
- A checksum or HMAC in the code with a key shipped in the JavaScript: an hour's work, stops casual base64 editing, stops
  no one who opens the devtools. Worth it only as a speed bump.
- Real resistance needs the server to own the scarce things: packs opened by the server's RNG, currency held server-side,
  grants checked against what the player did. That is the cloud-first option (2c), and a big change.
- Leaderboards have a good honest answer already: a replay is the inputs of a deterministic run, so a submitted time can be
  **re-simulated** (headless, about ten times real speed) before it counts. Not on a free Worker (10 ms CPU, VERIFY);
  by a script the owner runs, or a paid Worker / a container.

## 2. The options

| | (a) Local only, better | (b) Local + optional cloud sync | (c) Cloud-first |
|---|---|---|---|
| What it takes | Client code only: IndexedDB for replays, `persist()`, save-to-file, backup nag, tidy() for 115 | (a) + a Worker script, a D1 database binding, `/api/*` routed to the Worker, a login | (b) + server-side packs, currency, grants; the game needs the network to earn |
| Cloudflare setup | None | Owner: Worker script + D1 binding in `wrangler.jsonc`, maybe Turnstile | Same, more endpoints, more load |
| Cost | Nothing | Free tier is plenty (below) | Free tier at hobby scale |
| Lost saves | Still possible (ITP, clearing), but a file or code exists if the player made one | Rare: the cloud copy survives a lost phone, if the player keeps the login | Rare |
| Cheating | Trivial (and fine without leaderboards) | Unchanged: the server stores whatever the client sends | Packs and currency safe; times need re-simulation |
| Offline play | Always | Always (syncs later) | Earning needs the network |
| Privacy / liability | None: nothing leaves the device | Small, depends on the login (below) | The most: accounts are required |
| Support burden | None | "I lost my code": answer is no | Accounts, resets, outages |

### (a) Local only, better
1. **Replays to IndexedDB** (or cap the replay key at about 1.5 MB, dropping oldest "last" runs first) so they cannot starve the save. Highest value, smallest change.
2. **`navigator.storage.persist()`** once a save has something in it (after the first delivery or first pack). One line; harmless where refused.
3. **Save to file / load from file**: the same JSON as the code, downloaded as `delivery-racer-save-YYYY-MM-DD.json` (`<a download>`) and read back through `<input type=file>`. Works everywhere, iOS included (goes to Files). The File System Access API (`showSaveFilePicker`, then rewriting the same file on every save) is Chromium-only (VERIFY); nice as an automatic backup on desktop Chrome/Edge, not a foundation.
4. **Backup nag**: a quiet line on the menu ("Last backup: never / 9 days ago. Save to file") shown once the save holds something scarce (a pack, an ECU above 1) and on Safari after a week, with a "don't remind me".
5. **Save code improvements**: a format number, `tidy()` for the 115 keys, a short checksum (catches truncated pastes; a speed bump for editors), and compress before base64 (`CompressionStream('deflate-raw')`; measured with Node's zlib: 3,452 bytes deflate to 1,628, the 115-era 6,650 to 2,088), so the 115-era code is about 2,800 characters instead of 8,900.
6. **Gate "Unlock everything"** behind a developer switch (`?dev`) before packs have value, or have it mark the save "sandbox" so it can never post to a leaderboard.

### (b) Local plus optional cloud sync with a really simple login

The local save stays the store of record; the cloud is a backup and a bridge between devices. A player who never signs in
loses nothing compared with (a).

**The login, honestly compared (for a hobby game, no support staff, children may play):**

| Login | Player experience | Lost account | Personal data | Liability |
|---|---|---|---|---|
| **Sync code** (random, 20 base32 characters, about 100 bits, shown once, also in the save file) | "Turn on cloud save" gives a code; type it on the other device | Lost code = lost cloud copy; the local copy is unaffected; no reset possible, said up front | None (no email, no name); the server stores only a hash of the code | Least. COPPA's "personal information" includes persistent identifiers, but there is an exception for one used only to support the service's internal operations (VERIFY with the text); GDPR: pseudonymous data, keep no IPs in logs, offer delete |
| Player code + passphrase | Two things to remember instead of one | Same as above, plus forgotten passphrases | None | Same as sync code, no gain: a long random code is already the password |
| Passkey (WebAuthn) | Face/fingerprint, no typing; syncs through iCloud Keychain / Google Password Manager | Lost if the passkey is not synced, or a shared family device; the relying-party domain must be fixed for ever (use `pingmathehippo.com`, not the subdomain) | None beyond a public key | Low, but more code (a WebAuthn library on the Worker) and confusing to children; a good second step on top of a sync code |
| Magic-link email | Familiar; resets for free | Recoverable by email | An email address: real personal data; under-13s need verifiable parental consent under COPPA if the site is child-directed or knows | Highest of the light options; and Cloudflare cannot send to arbitrary addresses from a free Worker without a provider (Email Routing sends only to verified addresses; Cloudflare's own Email Service status VERIFY; e.g. Resend free tier VERIFY) |
| Sign in with Apple / Google | One tap | Recoverable through them | Their user id, often an email | OAuth apps to register (Apple: paid developer account), a privacy policy, their terms on children's accounts; most setup |

**Recommended login: the sync code**, with Cloudflare Turnstile (free) on creating one and per-IP rate limits on use.
Passkeys can be added later as a convenience to the same account.

**What is cloud-worthy:** progress (levels, best times, medals, cars, keys), blueprints and ECU, unopened packs, currency,
stats, tier cars, events/claimed. **Local only:** device options (touch controls, sound, auto accelerate; split them out of
the progress save when this is built, so a phone and a desktop do not overwrite each other's), the ghost switch, editor
levels, and replays. Replays could later go to R2 (only the player's best per level-side, about 25 KB each): 1,000
players x 100 bests = 2.5 GB, inside R2's free 10 GB-month and 1M writes a month (VERIFY), so about nothing; but it is
another binding, so later and only if wanted.

**Sync rules.** The save is small (7 KB with item 115), so sync the whole document with a revision number:
- Push sends `baseRev`; the server accepts only if its revision still equals `baseRev` (compare and swap), else returns
  its copy (409) and the client merges and pushes again.
- **Merge per field, not last-write-wins:** things that only grow take the larger: `unlocked`, `tierBase`, each best time
  (the larger spare), cars and keys owned (union), blueprint counts (max, as long as blueprints are never spent: keep it so),
  ECU (derived from blueprints), stats (max), events (max), claimed (union).
- **Things that are spent** (money, pack currency, unopened packs) cannot be merged by max or by last write without
  duplicating or losing. The clean answer is to store them as counters per device: `earned[device]` and `spent[device]`,
  each only growing, balance = sum of earned minus sum of spent (a PN-counter). Small, offline-safe, no double spend
  across devices beyond what each device had. Simpler fallback: last write wins on those three, accepted risk.
- Offline: play as now; mark the save dirty; push on the next menu visit with a network. A save of an older format is
  migrated by the client (`restore()`) before merging; the server never interprets the body beyond its size and `v`.
- Keep the last 5 revisions server-side, so a bad merge can be undone by hand.

**Data model sketch (D1):**

| Table | Columns |
|---|---|
| `players` | `id` (random, PK), `code_hash` (SHA-256 of the sync code, unique), `created_at`, `last_seen` |
| `saves` | `player_id` (PK), `rev`, `format`, `body` (JSON text, capped at 64 KB), `updated_at` |
| `save_history` | `player_id`, `rev`, `body`, `updated_at` (last 5 per player) |
| `replays` (later, optional) | `player_id`, `level_id`, `side`, `spare`, `logic`, `r2_key`, `created_at` |

**Worker endpoints sketch** (all JSON, the sync code in an `Authorization: Bearer` header, only `/api/*` runs the Worker,
the game stays static assets): `POST /api/account` (Turnstile token) creates a player and returns the code once;
`GET /api/save` returns `{ rev, body }`; `PUT /api/save` with `{ baseRev, body }` returns `{ rev }` or 409 with the
server copy; `DELETE /api/account` deletes everything; `GET /api/health`. No sessions, no cookies, no email.

**Free-tier limits as I know them (all VERIFY on the Cloudflare pricing pages):** Workers 100,000 requests a day, 10 ms
CPU each (static asset requests are free and do not count); D1 5 million rows read and 100,000 rows written a day, 5 GB
storage; KV 100,000 reads but only 1,000 writes a day (too few for sync at any scale: use D1); Durable Objects (SQLite)
on the free plan about 100,000 requests a day, overkill here (one per player would give strict ordering, not needed with
compare and swap); R2 10 GB-month, 1M writes and 10M reads a month, free egress. A sync on each menu visit, a few a day
per player, fits thousands of daily players.

**Failure modes:** a Worker outage or a bad deploy (the game plays on, sync waits); a bad merge (history table); a leaked
code (anyone with it can overwrite the save: show it like a password, allow "new code" which revokes the old); deploys
from `main` now touch a database (a migration mistake is live at once); abuse (Turnstile, rate limit, size cap).

### (c) Cloud-first
The server holds the scarce state: it opens packs with its own RNG, holds the currency, grants blueprints, and the client
caches. The only way packs, currency and later leaderboards are trustworthy, and the only sane basis if packs are ever
sold (payments then add Stripe or app-store rules, refunds, tax, and a terms page). Costs: an account for everyone,
offline earning gone or queued, a Worker that must re-derive what each run earned (or trust it, which defeats the
purpose), real support load. Not for a hobby game today.

## 3. Recommendation

**Stay local, make local safe, and add an optional sync code later only if players ask for devices to share a save.**

- **Tonight, zero risk (done):** these notes, nothing built.
- **Next, client code only, no bindings (an ordinary merge):** (1) replays to IndexedDB or a byte cap, so they can never
  stop the save being written; (2) `persist()`; (3) save to file / load from file; (4) a format number, and `tidy()`
  taught the 115 keys in the same change that adds them; (5) the backup nag once a save holds packs or ECUs;
  (6) "Unlock everything" behind `?dev` before packs mean anything; (7) device options split out of the progress save,
  ready for sync. A checksum in the code is optional.
- **Owner's decision and Cloudflare setup:** option (b) with a sync code: a Worker script, a D1 database, `/api/*`
  routed to the Worker, Turnstile keys, a one-paragraph privacy note on the site. About a day of work, free to run.
- **Only if packs are sold or leaderboards (item 29) go live:** server-side packs and currency (c), and leaderboard times
  re-simulated from their replays before they count.

### Questions for the owner
1. Is "all saves local, with save-to-file and a backup reminder" enough for now, or do you want cross-device sync soon?
2. If sync: is a no-email **sync code** (lost code = no recovery of the cloud copy) acceptable, or do you want account
   recovery (email, which brings personal data and children's-privacy rules)?
3. May the next build move replays to IndexedDB and add `persist()` and save-to-file (client only, no bindings)?
4. Should "Unlock everything" leave the Options sheet (behind `?dev`) once packs and blueprints exist?
5. Will packs ever be sold for real money, and is item 29 (daily challenge with a leaderboard) still planned? Those two
   decide whether cheating has to be stopped server-side.
6. Should device options (touch controls, sound, auto accelerate) stop travelling in the save code and the sync?
7. Do saves left on the old address (before the move to `delivery.pingmathehippo.com`) still need a hand-over?
8. If (b): may a Worker script, a D1 binding and Turnstile be added to the `delivery` Worker, and which domain should own
   accounts (the subdomain, or `pingmathehippo.com` for passkeys later)?
