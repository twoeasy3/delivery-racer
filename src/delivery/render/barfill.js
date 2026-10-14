// The ONE rule for a blueprint progress bar (the owner, 14-Oct, CHECKLIST 286): when an upgrade is AVAILABLE but NOT BOUGHT (the blueprints
// have reached an ECU above the one bought: ecu > bought) the bar reads FULL and OVERFILLED ("full and then some") instead of rolling over to
// the next step's progress; once it is bought it shows the next step's progress as before. A car whose blueprints have reached its last ECU
// shows a full bar (overfilled while that last step is still unbought). Pure, render-side only (not in the replay hash).
//   have / toNext   blueprints toward the next ECU (as the bar always had them), ecu: the ECU the blueprints reached, bought: the ECU
//   bought (ecu.js purchased), max: the car's top ECU
// -> { pct: 0..100, over (ready to buy: draw the overfill), full (pct is 100: over, or at the top) }
export const barFill = ({ have = 0, toNext = 1, ecu = 0, bought = 0, max = 1 } = {}) => {
  const over = ecu > bought && bought < max;
  const full = over || ecu >= max;
  const pct = full ? 100 : Math.round(Math.max(0, Math.min(1, have / Math.max(1, toNext))) * 100);
  return { pct, over, full };
};
