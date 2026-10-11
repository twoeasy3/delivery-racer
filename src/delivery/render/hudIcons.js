// ---- the sticky messages' icons ---------------------------------------------------------------
// One for each condition a sticky message lasts for (CONFIG.messageTimes.sticky; render/hud.js shows them,
// style.css #sticky colours them): by the condition's name, or for a mystery effect by the effect's. Each is
// the inside of an SVG drawn in a 24 x 24 box, in lines (the colour and the width are the stylesheet's);
// class "f" is a filled shape, "t" a thick line, "x" a red line across what is out of order. No picture files, no emoji.
export const STICKY_ICONS = {
  // a flat tyre: a wheel sat down on the road
  puncture: '<path class="t" d="M5.6 18.4a8.2 8.2 0 1 1 12.8 0z"/><circle class="f" cx="12" cy="12.6" r="1.7"/><path d="M1.5 21h21"/>',
  // beached: a car down in the gravel
  beached: '<path class="f" d="M2.5 15v-3.2l3.2-.8 2.3-3.9h6.6l3.1 3.9 3.8.8V15z"/>' +
    '<g class="f dots"><circle cx="4" cy="18.6" r="1.2"/><circle cx="8" cy="17.9" r="1.2"/><circle cx="12" cy="18.8" r="1.2"/><circle cx="16" cy="17.9" r="1.2"/>' +
    '<circle cx="20" cy="18.6" r="1.2"/><circle cx="6" cy="21.4" r="1.2"/><circle cx="10" cy="21.8" r="1.2"/><circle cx="14" cy="21.4" r="1.2"/><circle cx="18" cy="21.8" r="1.2"/></g>',
  // bad gas: a fuel pump, crossed out
  badGas: '<rect x="4.5" y="4" width="9.5" height="16" rx="1.5"/><path d="M7 7.5h4.5v3.2H7zM3 20.5h12.5M14 12.5h2.2v5a1.7 1.7 0 0 0 3.4 0V9.2l-2.3-2.4"/><path class="x" d="M3.5 3.5l17 17"/>',
  // heavy: a weight
  heavy: '<path class="f" d="M7.2 9.5h9.6l3.7 11.5h-17z"/><circle cx="12" cy="6.2" r="2.7"/>',
  // butterfingers: a parcel on its way down
  butterfingers: '<path d="M6.5 2.5v4M12 2v5M17.5 2.5v4"/><g transform="rotate(16 12 15.5)"><rect x="6.5" y="10.5" width="11" height="10" rx="1"/><path d="M12 10.5v10"/></g>',
  // no brakes: the dashboard's brake lamp, struck through
  noBrakes: '<circle cx="12" cy="12" r="5.4"/><path d="M12 9v3.3M12 15v.1M4.4 6a9.6 9.6 0 0 0 0 12M19.6 6a9.6 9.6 0 0 1 0 12"/><path class="x" d="M4 20L20 4"/>',
  // rickety: a shield cracked through
  rickety: '<path d="M12 2.8l7.6 2.7v5.7c0 4.6-3 8-7.6 9.9-4.6-1.9-7.6-5.3-7.6-9.9V5.5z"/><path class="x" d="M13.4 3.6l-3.2 5.6 4.2 2.8-3.6 4.6 1.4 3.9"/>',
  // a jerk: a face with horns and a scowl
  jerk: '<circle cx="12" cy="13.2" r="7.4"/><path class="f" d="M5.6 8.4L3.8 2.8l4.9 2.9zM18.4 8.4l1.8-5.6-4.9 2.9z"/><path d="M8 10.8l3 1.5M16 10.8l-3 1.5M9 17.6c1.8-1.7 4.2-1.7 6 0"/>',
  // swapped sides: one arrow each way
  swapSides: '<path d="M4 8.2h15.5M16 4.6l3.6 3.6-3.6 3.6M20 15.8H4.5M8 12.2l-3.6 3.6L8 19.4"/>',
  // blackout: a light bulb, struck through
  blackout: '<path d="M9 16.4c-2-1.3-3.2-3.2-3.2-5.5a6.2 6.2 0 0 1 12.4 0c0 2.3-1.2 4.2-3.2 5.5zM9.6 19h4.8M10.6 21.5h2.8"/><path class="x" d="M4 20L20 4"/>',
  // earthquake: the needle's trace
  earthquake: '<path d="M1.5 12.5h3l2-5 3 11L13 4.5l3.2 12.5 2-4.5h4.3"/>',
  // infected: the radiation trefoil
  infected: '<circle class="f" cx="12" cy="12" r="1.9"/><path class="f" d="M9.75 8.1L7.25 3.77a9.5 9.5 0 0 1 9.5 0L14.25 8.1a4.5 4.5 0 0 0-4.5 0zM16.5 12h5a9.5 9.5 0 0 1-4.75 8.23l-2.5-4.33A4.5 4.5 0 0 0 16.5 12zM9.75 15.9l-2.5 4.33A9.5 9.5 0 0 1 2.5 12h5a4.5 4.5 0 0 0 2.25 3.9z"/>',
  // (any other: a warning triangle, so a line added to the table is never without one)
  other: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 9.5v5M12 17.4v.1"/>',
};
// the icon for one of Message.sticky
export const stickyIcon = (held) => STICKY_ICONS[held.condition === 'mystery' ? held.key : held.condition] || STICKY_ICONS.other;
