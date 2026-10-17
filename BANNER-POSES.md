# Pack banner poses and backdrops (CHECKLIST 447)

- Poses: `src/delivery/render/bannerposes.js` (`POSES`): showdown (the old row, default), headon, staggered, abreast, chase, solo. Each has a slot per car (1 to 4 cars), the camera's lift / lens / roll; the no-overlap step-out and the fit-every-box framing are packbanner.js's and apply to all.
- Backdrops: `src/delivery/render/bannerbackdrops.js` (`BACKDROPS`): town (the old one, default), neon, tunnel, coast, desert, snow, rain, circuit, synthwave, showroom. CSS gradients and small inline SVGs only; each carries a glow tint, a rim light colour and the ground's stops.
- Choice: `src/delivery/render/bannerlook.js` (`PAIRINGS`, else an FNV hash of the pack id: pose from its low bits, backdrop from the next). Not in packs.json: it is a replay rules file (progress.js -> packid.js -> packs.json).
- Pairings: supercar-special showdown/town, classic-special abreast/coast, record-special headon/tunnel, cruiser-special staggered/neon; car-hunt-special solo/showroom and comet-special chase/synthwave (these two show no banner today: one car).
- Cost: still one picture drawn once by the shared renderer, kept by cars + pose + backdrop + size; no new context, no per-frame work, no texture files. About +5 KB gzipped (minified modules, estimated).
- Preview: `?packbanner=<packId>[&pose=][&backdrop=]`, `?packbanner=sheet` (poses x 1-4 cars), `?packbanner=backdrops[&pose=]`, `?packbanner=all` (URL-PARAMS.md).
- Add one: a new entry in `POSES` (four slots) or `BACKDROPS`; look at the sheets.
- Open: should one-car packs (Comet Hunt) get a banner (solo/chase)? The planned .packbanner-check was not written (rush).
