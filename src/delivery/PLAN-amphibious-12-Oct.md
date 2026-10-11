# Plan: making the amphibious stages' water make sense (Q20), 12-Oct. NOT built.

Owner: "Some amphibious stages don't make sense as the water is just inbetween land. They should either be
obviously a canal, a river or it should transition into the sea or a river."

Taken headlessly from `src/delivery/levels/*.json` and `render/water.js`. How a stage is drawn now: a ribbed
concrete slipway at each end, a sheet of water over the road from kerb to kerb, a stone quay each side and buoys;
nothing beyond the quays changes (the theme's land runs right up to them, so the water reads as a puddle across the
road). A `current` (m/s, signed) makes it a flowing stretch. Five amphibious levels: fjord, flood, ford, harbour,
slipway. A stage is the `water` list ([from, to, current?]); a stretch past the finish (`to` beyond the end)
makes the level end afloat. The general fix for all five: give a water stage a WATER BODY beside the road, not
only the road's sheet: a water plane out to the horizon or to banks, so the road is a causeway through water or a
channel cut through land. One mechanism (a `body` setting per stage: `canal`, `river`, `sea`, `flood`) covers all
levels below.

## fjord (snow, 3.6 km): stages 1900-3050 (current -2.4), 3330-3800 (still, to the finish)
1. Today: two snowy stretches of road under water, snow land to the quays. 1900-3050 flows, so it is a RIVER; 3330-3800 is still.
2. 1900-3050: a river with banks: low snowy banks 10-20 m off, reeds frozen white, ice shelves on the edge; the water plane runs between them, bank to bank wider than the road.
3. At the river's two ends the banks pinch to the slipway (the current already runs one way, so a weir or a bridge pier at the upstream end reads as why).
4. The 3330-3800 stage becomes the FJORD itself: the water plane opens to the horizon on both sides, mountain walls rising from it, the road a causeway that dips in (the finish afloat, at a jetty).
5. Between 3050 and 3330 the land shows the river running into the fjord (the plane widening in the distance), so it is one water.
6. The tunnel (1480-1760) is before the water: leave it.
7. Rockfall (2 on the level) above the river banks: keep.
8. Needs: a `body` per stage; banks as two ribbons (render/water.js strip with ground colour); the horizon plane for the fjord.
9. Cost: small for the river banks, medium for the open plane (it must not clip the mountain walls).
10. Check: stills at s=1850, 2400, 3100, 3500 on the chase camera.

## flood (flooded, 3.3 km): stages -100-640 (starts afloat), 980-1720 (current -2), 2200-2760 (current 2.4), 3080-3500 (to the finish)
1. Today: four stretches under water between dry stretches, which is the theme (a flood), but the land is all level so it reads as four puddles.
2. Make the flood ONE water: a plane at the waterline over the whole level's low ground, so the dry stretches are raised causeways (embankments with the road on top) and the stages are where the causeway is under.
3. Land beside the road dips to the water between stages (a slope from the kerb, sedge, floating debris), so the water is continuous, not four ponds.
4. The currents (-2 and 2.4) read as a flood channel crossing the road: add a floating debris stream along the current direction at those two.
5. Roofs, a fence line, a half-sunk bus beyond the quays (the flooded theme's own dressing) so it is plainly a flooded town.
6. Start afloat (-100): begin on a flooded street, a lamp post or two standing out of the water.
7. The finish stage (3080-3500): the road ends at a wharf, water to the horizon.
8. Needs: `body: 'flood'`: one big plane; the road raised 0.4 m on its causeways between stages.
9. Cost: medium (the plane and the embankments), the theme's models exist.
10. Check: stills at s=300, 800, 1350, 2500, 3300.

## ford (safari, 3.6 km): stages 420-580, 780-960 (short), 1300-1900 (current -2.6), 2620-2780, 3080-3300 (current 2)
1. Today: five water crossings on a savanna of three ground colours; the short ones are 160-220 m.
2. The two 160 m stages and the 180 m one are STREAMS: draw a stream bed: a water ribbon 30-60 m wide that curves across the road, with a reed bank and mud edge, not a sheet kerb to kerb.
3. 1300-1900 (600 m, current -2.6) is the RIVER: banks 15-25 m off, trees on the banks, a hippo or two (the level has hippos).
4. 3080-3300 (current 2): a second river reach: a bend and a sandbar.
5. Where a stream crosses, the stream also runs away to both sides of the road a hundred metres or so, narrowing, so it is seen to come from somewhere.
6. Keep the slipways (they are the dry-ford ramps).
7. A causeway sign (a depth post) at each: exists as the ford gimmick; reuse its post.
8. Needs: `body: 'river'` with `width` and a bend; a stream ribbon renderer.
9. Cost: medium.
10. Check: stills at 380, 1250, 1700, 3050.

## harbour (hongkong, 3.5 km): stages 480-1250 (current 2.2), 1330-2120 (current -2.2), 2880-3260 (still, then the finish)
1. Today: two long stretches under water, opposite currents, a tunnel between them (2260-2640); city on land.
2. 480-1250 and 1330-2120 are a CANAL or channel in the harbour: give it quay walls (stone, bollards, a railing), moored boats along them, a promenade each side, and a bridge across it at the join (1250-1330): the 80 m of dry road between is the bridge deck.
3. Opposite currents (2.2 and -2.2) read as a tidal channel; keep, and add a lock gate or sea wall at the 1250-1330 bridge where they meet.
4. 2880-3260: the stage opens onto the BAY: quays fall away, the water plane runs to the horizon with junks and the skyline, the finish afloat or on a pier.
5. The tunnel (2260-2640) goes under the channel: note the 2120 to 2260 land is the far bank.
6. Needs: quay walls beside the sheet (the existing stone quay is the start: raise and extend it); boats exist in boatModels.js.
7. Cost: small-medium.
8. Check: stills at 450, 1000, 1290, 1800, 2950, 3200.
9. Note: Hong Kong (level 27) is being re-laid by another branch (delivery-rework-b): sequence after its merge.
10. Same for the fjord and harbour: the end stretches (to the finish) should transition to open sea.

## slipway (beach, 2.8 km): stages 700-1050 (still), 1500-2350 (current 1.5)
1. Today: a still stretch and a flowing one on a beach: sand to the quays.
2. 700-1050 (350 m): a LAGOON or tidal inlet: the water plane widens to a pool with sand beaches, palms, a few boats, the road crossing its neck on a causeway.
3. 1500-2350 (850 m, current 1.5): a RIVER MOUTH running into the sea: the water plane widens along the stage (narrow at 1500, open to the sea at 2350, where the finish side is the beach).
4. A current toward the sea (1.5) is already there: add foam lines and wave rows at the sea end.
5. Sand banks as the banks (they already match the theme's ground).
6. Surf and a shoreline beyond the last quay at 2350 so the water reads as the sea.
7. Obstacles (8 on the level, beach junk) stay on land stretches.
8. Needs: `body: 'sea'` with an opening shape (narrow to wide).
9. Cost: medium.
10. Check: stills at 650, 900, 1450, 1900, 2300.

## Order I would build in
slipway (one theme, the clearest river-mouth), then ford, fjord, flood; harbour after Hong Kong's re-lay merges.
