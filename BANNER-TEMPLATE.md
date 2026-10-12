# The pack banner scene (saved as a template, 12-Oct)

Three cars in ONE three.js scene, posed like the Asphalt promo banner the owner supplied: a staggered row, the first car
(the HERO) nearest, on the right and lowest, the others back to the left, a low camera, reflections and shadows on one
ground, glowing headlamps, rim light, a warm blurred backdrop, the car names in pink labels.

- Code: `src/delivery/render/packbanner.js`. EVERY number (camera height and lens, margins, row spacing and turn, size pull,
  lights, ground, reflections, shadows, headlamp glow, backdrop) is in the one `BANNER` object at the top of that file.
  Nothing in it knows about packs.
- API: `renderPackBanner(cars, { width, height, evil, config })` -> a canvas; `bannerArt(cars, { labels, evil, ... })` -> the
  finished element; `bannerCars(featured)` -> a pack's featured entries as the banner's cars (1 to 3, hero first).
- Rendered LIVE on the device (not a stored picture): the menu's one shared WebGL renderer draws it once at the size the
  element has, and the picture is kept (cached by cars, side and size) until the size changes. No WebGL: the Shop tile goes
  back to the old art.
- Used by: the Shop's featured tile (`render/shop.js`) and a pack's What's inside sheet (`render/packcontents.js`), for any
  featured pack with 2 or 3 different cars (see `packs.json`: supercar-special, classic-special, record-special,
  cruiser-special).
- Re-shoot any trio: `index.html?banner=<id>,<id>,<id>` (1 to 3 ids, hero first), `&w=<px>&h=<px>`, `&evil`, `&labels=0`:

      node scripts/shots.mjs shots "trio=index.html?banner=wedge,midnight,splitwindow&w=1280&h=640" --size=1280x640 \
        --wait=8000 --browser=/opt/pw-browsers/chromium-1194/chrome-linux/chrome

- To change the look: edit `BANNER`, re-shoot with the line above, read the stills. (CHECKLIST item 168.)
