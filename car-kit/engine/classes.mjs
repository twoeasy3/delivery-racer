// ---- SIZE CLASSES AND BUDGETS (measured from the 159 wheeled cars in the game, 18-Oct; see BRIEF.md) ------------------------
// Sizes are the whole model's box, wheels and mirrors included, in metres: [min, max]. The cars are drawn a little bigger and
// clearly wider than the real ones (the median family car is 4.7 m long and 2.0 m wide): err WIDE.
// Budgets: triangles and meshes are counted on the built model (the static parts joined by material, every wheel and every glass
// pane a mesh of its own); materials are the distinct roles used. warn = report it, fail = the check fails.
export const CLASSES = {
  small: { what: 'city cars, hatchbacks, kei cars, small roadsters (median in the game: 3.8 x 1.8 x 1.4 m)',
    length: [2.6, 4.4], width: [1.45, 2.4], height: [1.0, 1.95], wheel: [0.24, 0.5] },
  medium: { what: 'saloons, coupes, estates, sports cars, small SUVs (median 4.7 x 2.0 x 1.3 m)',
    length: [4.2, 5.4], width: [1.7, 2.45], height: [1.0, 1.95], wheel: [0.26, 0.5] },
  large: { what: 'limousines, land yachts, big saloons, low pickups (median 5.6 x 2.1 x 1.5 m)',
    length: [5.2, 6.4], width: [1.9, 3.0], height: [1.1, 1.95], wheel: [0.3, 0.55] },
  tall: { what: 'vans, pickups, MPVs, tall SUVs, anything 1.85 m or taller up to a box van (median 5.0 x 2.2 x 2.1 m; the Junker pickup is 5.3 x 2.2 x 1.9)',
    length: [3.4, 6.4], width: [1.6, 2.9], height: [1.8, 2.8], wheel: [0.28, 0.65] },
  truck: { what: 'lorries, buses, fire engines, monster trucks: long or very tall (median 6.5 x 2.7 x 3.0 m)',
    length: [4.8, 12.0], width: [1.9, 3.6], height: [1.5, 4.0], wheel: [0.3, 0.8] },
};
export const BUDGETS = {
  //            triangles       meshes          materials       parts (after mirroring)
  small: { tris: [3000, 4000], meshes: [40, 60], mats: [16, 18], parts: [70, 110] },
  medium: { tris: [3000, 4000], meshes: [40, 60], mats: [16, 18], parts: [70, 110] },
  large: { tris: [3000, 4000], meshes: [40, 60], mats: [16, 18], parts: [70, 110] },
  tall: { tris: [3000, 4000], meshes: [40, 60], mats: [16, 18], parts: [70, 110] },
  truck: { tris: [4000, 5500], meshes: [55, 80], mats: [16, 20], parts: [100, 150] },
};
// the width / length ratio: the game's cars are wide (median 0.46; under 0.36 reads as narrow at a glance)
export const RATIO = { warn: 0.38, fail: 0.3 };
