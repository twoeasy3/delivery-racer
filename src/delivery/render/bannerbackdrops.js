// ---- THE PACK BANNER'S BACKDROPS (render/packbanner.js; BANNER-POSES.md): CSS gradients and small inline SVGs only (no
// image files, no textures), behind the cars' one picture. Each: sky (the element's background), town (a layer, blurred
// by townBlur, at townOpacity), over (an unblurred layer over the cars: rain, flakes; optional), vignette; and a small
// palette for the picture: glow (the headlamps' glow tint), rim (the rim light), ground (the ground's stops: its colour
// and how much of the mirrored cars shows through). 'town' is the template's own (BANNER.backdrop).
const svg = (body, w = 400, h = 200, fit = 'none') => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='${fit}'>${body}</svg>`)}")`;
// a skyline: n blocks between y0 and y1 (seeded, so the same every time), with lit windows
const skyline = (fill, lit, n = 22, y0 = 60, y1 = 140, seed = 7) => {
  let r = seed, out = '', x = 0;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n && x < 400; i++) {
    const w = 10 + rnd() * 22, top = y0 + rnd() * (y1 - y0);
    out += `<rect x='${x.toFixed(0)}' y='${top.toFixed(0)}' width='${w.toFixed(0)}' height='${(200 - top).toFixed(0)}' fill='${fill}'/>`;
    if (lit) for (let k = 0; k < 4; k++) out += `<rect x='${(x + 2 + rnd() * (w - 5)).toFixed(0)}' y='${(top + 4 + rnd() * 40).toFixed(0)}' width='2' height='3' fill='${lit}'/>`;
    x += w + 1;
  }
  return out;
};
const dots = (colour, size, gap, at = '0 0') => `radial-gradient(circle, ${colour} ${size}px, transparent ${size + 0.6}px) ${at} / ${gap}px ${gap}px`;
const ground = (r, g, b, mid = 0.94) => [[0, `rgba(${r},${g},${b},${mid + 0.03})`], [0.3, `rgba(${r},${g},${b},${mid})`], [0.7, `rgba(${r},${g},${b},0.5)`], [1, `rgba(${r},${g},${b},0)`]];
const VIGNETTE = 'radial-gradient(120% 90% at 60% 55%, transparent 55%, rgba(6, 6, 14, .6) 100%)';

export const BACKDROPS = {
  town: null, // (filled from BANNER.backdrop by packbanner.js: the warm hazy town)
  neon: {
    sky: 'radial-gradient(10% 14% at 18% 40%, rgba(255,60,200,.7), transparent 70%), radial-gradient(8% 12% at 34% 30%, rgba(60,230,255,.6), transparent 70%), radial-gradient(12% 16% at 70% 36%, rgba(255,80,220,.55), transparent 70%), radial-gradient(7% 10% at 88% 26%, rgba(80,240,255,.6), transparent 70%), radial-gradient(9% 12% at 54% 46%, rgba(255,170,60,.45), transparent 70%), linear-gradient(180deg, #07051a 0%, #1c0a36 40%, #4a1458 58%, #1a0e24 72%, #0c0a14 100%)',
    town: svg(skyline('#120a22', '#ff5ad8', 24, 50, 120) + skyline('#1d0f33', '#5ae8ff', 18, 90, 140, 3)) + ' 0 0 / 100% 70% no-repeat',
    townBlur: 3, townOpacity: 0.9, vignette: VIGNETTE,
    glow: 0xd8f4ff, rim: 0xff4fd8, ground: ground(30, 20, 44),
  },
  tunnel: {
    sky: 'radial-gradient(18% 24% at 55% 42%, rgba(200,230,255,.9), rgba(60,120,255,.4) 40%, transparent 75%), linear-gradient(180deg, #050a1c 0%, #0c1c48 45%, #10204a 60%, #070b18 100%)',
    town: svg([...Array(18)].map((_, i) => { const a = i / 18 * Math.PI * 2, x = 220 + Math.cos(a) * 420, y = 84 + Math.sin(a) * 260; return `<line x1='220' y1='84' x2='${x.toFixed(0)}' y2='${y.toFixed(0)}' stroke='${i % 3 ? '#7ab8ff' : '#ffffff'}' stroke-width='${i % 3 ? 1.2 : 2.4}' stroke-opacity='.7'/>`; }).join('')
      + [60, 120, 190].map(r => `<ellipse cx='220' cy='84' rx='${r * 1.6}' ry='${r}' fill='none' stroke='#3c8cff' stroke-width='${r / 30}' stroke-opacity='.75'/>`).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 2.5, townOpacity: 0.85, vignette: VIGNETTE,
    glow: 0xcfe6ff, rim: 0x4aa8ff, ground: ground(14, 22, 46),
  },
  coast: {
    sky: 'radial-gradient(16% 26% at 62% 50%, #fff2b0, #ffb050 45%, transparent 72%), linear-gradient(180deg, #3a2a6a 0%, #b4507a 30%, #ff8a5a 48%, #ffb874 55%, #6a5a8a 57%, #2c3460 70%, #1a1c30 100%)',
    town: svg(`<rect y='112' width='400' height='4' fill='#ffd9a0' opacity='.5'/>` + [[40, 70], [70, 54], [330, 62], [362, 80]].map(([x, top]) => `<path d='M${x} 200 Q${x + 4} ${(top + 200) / 2} ${x + 2} ${top}' stroke='#1a1022' stroke-width='4' fill='none'/>` + [-40, -15, 10, 35, 160, 200].map(a => `<path d='M${x + 2} ${top} q${Math.cos(a / 57) * 18} ${-6 + Math.sin(a / 57) * 6} ${Math.cos(a / 57) * 30} ${8 + Math.abs(Math.sin(a / 57)) * 8}' stroke='#1a1022' stroke-width='5' fill='none' stroke-linecap='round'/>`).join('')).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 1.5, townOpacity: 0.95, vignette: VIGNETTE,
    glow: 0xffe2b0, rim: 0xff9a50, ground: ground(52, 40, 62),
  },
  desert: {
    sky: 'radial-gradient(30% 22% at 30% 46%, rgba(255,200,120,.75), transparent 72%), linear-gradient(180deg, #3e3050 0%, #a05a52 30%, #e88a4a 46%, #f4b06a 54%, #8a5a40 62%, #3e2c28 100%)',
    town: svg(`<path d='M0 120 Q60 80 130 112 T260 104 T400 96 V200 H0Z' fill='#b06a40' opacity='.8'/><path d='M0 136 Q90 110 180 132 T400 124 V200 H0Z' fill='#7a4630'/><path d='M300 104 l6 -30 l4 30 M320 104 l3 -18 l3 18' stroke='#3a2620' stroke-width='3'/>`) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 3, townOpacity: 0.9, vignette: VIGNETTE,
    glow: 0xffe0b8, rim: 0xffa060, ground: ground(70, 50, 44),
  },
  snow: {
    sky: 'linear-gradient(180deg, #a8bccf 0%, #d6e2ec 40%, #eef3f8 54%, #9aaabb 64%, #5c6878 100%)',
    town: svg(`<path d='M0 120 L60 70 L110 108 L170 52 L240 112 L300 66 L400 118 V200 H0Z' fill='#7e90a6'/><path d='M150 70 L170 52 L190 72 Z M45 82 L60 70 L75 84Z M285 78 L300 66 L316 80Z' fill='#f4f8fc'/>` + skyline('#8a9aae', '', 14, 112, 136, 5)) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 5, townOpacity: 0.85,
    over: `${dots('rgba(255,255,255,.6)', 1.6, 37, '5px 9px')}, ${dots('rgba(255,255,255,.7)', 1.1, 23, '13px 4px')}, ${dots('rgba(255,255,255,.55)', 2.4, 61, '29px 17px')}`,
    vignette: 'radial-gradient(120% 90% at 60% 55%, transparent 55%, rgba(40, 52, 70, .5) 100%)',
    glow: 0xeaf4ff, rim: 0xdfefff, ground: ground(96, 108, 124, 0.9),
  },
  rain: {
    sky: 'radial-gradient(8% 12% at 22% 44%, rgba(255,190,90,.6), transparent 70%), radial-gradient(9% 12% at 76% 40%, rgba(90,200,255,.45), transparent 70%), radial-gradient(6% 9% at 50% 48%, rgba(255,80,80,.45), transparent 70%), linear-gradient(180deg, #0a1020 0%, #182640 45%, #2a3a52 58%, #121a26 72%, #0a0e16 100%)',
    town: svg(skyline('#141c2c', '#ffcf7a', 22, 50, 120, 11)) + ' 0 0 / 100% 72% no-repeat',
    townBlur: 5, townOpacity: 0.85,
    over: 'repeating-linear-gradient(104deg, transparent 0 13px, rgba(190,215,255,.16) 13px 14px, transparent 14px 31px)',
    vignette: VIGNETTE,
    glow: 0xfff0c8, rim: 0x8ab8ff, ground: ground(26, 36, 54, 0.8),
  },
  circuit: {
    sky: 'radial-gradient(9% 16% at 14% 18%, rgba(255,255,240,.95), transparent 70%), radial-gradient(9% 16% at 86% 16%, rgba(255,255,240,.95), transparent 70%), radial-gradient(30% 40% at 50% 10%, rgba(200,220,255,.35), transparent 70%), linear-gradient(180deg, #0a1022 0%, #1a2846 46%, #2a3448 60%, #141820 100%)',
    town: svg(`<path d='M0 112 L0 82 L180 96 L180 112Z M220 112 L220 96 L400 80 L400 112Z' fill='#1a2030'/>` + [...Array(30)].map((_, i) => `<rect x='${i * 13 + 4}' y='${i < 14 ? 86 + i : 96 - (i - 16)}' width='9' height='2' fill='#4a5a78'/>`).join('')
      + [56, 344].map(x => `<rect x='${x - 1.5}' y='34' width='3' height='80' fill='#0e1220'/><rect x='${x - 12}' y='28' width='24' height='9' fill='#dfe8ff'/>`).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 2, townOpacity: 0.95, vignette: VIGNETTE,
    glow: 0xf4f8ff, rim: 0xeaf0ff, ground: ground(40, 44, 54),
  },
  synthwave: {
    sky: 'linear-gradient(180deg, #120428 0%, #3a0a5a 32%, #a0207a 50%, #ff5a8a 56%, #1a0630 58%, #10041e 100%)',
    town: svg(`<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffe85a'/><stop offset='1' stop-color='#ff3a8a'/></linearGradient></defs><circle cx='200' cy='96' r='46' fill='url(#s)'/>`
      + [72, 82, 90, 97, 103, 108].map((y, i) => `<rect x='150' y='${y + 8}' width='100' height='${1 + i * 0.7}' fill='#3a0a5a'/>`).join('')
      + `<rect y='114' width='400' height='86' fill='#10041e'/>` + [...Array(21)].map((_, i) => `<line x1='200' y1='114' x2='${(i - 10) * 80 + 200}' y2='200' stroke='#ff3ec8' stroke-width='1.2'/>`).join('')
      + [118, 124, 133, 146, 164, 190].map(y => `<line x1='0' y1='${y}' x2='400' y2='${y}' stroke='#ff3ec8' stroke-width='1.2'/>`).join('')) + ' 0 0 / 100% 100% no-repeat',
    townBlur: 0.6, townOpacity: 1, vignette: VIGNETTE,
    glow: 0xffd8f4, rim: 0xff3ec8, ground: ground(40, 8, 52, 0.62),
  },
  showroom: {
    sky: 'conic-gradient(from 168deg at 30% -10%, transparent 0deg, rgba(255,220,140,.32) 8deg, transparent 18deg), conic-gradient(from 176deg at 70% -10%, transparent 0deg, rgba(255,220,140,.3) 8deg, transparent 18deg), radial-gradient(40% 30% at 50% 58%, rgba(255,200,110,.35), transparent 72%), linear-gradient(180deg, #120c06 0%, #2a1c0c 45%, #3a2812 58%, #140e08 100%)',
    town: 'repeating-linear-gradient(90deg, transparent 0 46px, rgba(255,200,110,.18) 46px 48px) 0 18% / 100% 38% no-repeat, linear-gradient(rgba(255,210,120,.5), rgba(255,210,120,.5)) 0 56% / 100% 2px no-repeat',
    townBlur: 2, townOpacity: 0.9,
    vignette: 'radial-gradient(110% 85% at 50% 55%, transparent 50%, rgba(8, 5, 2, .75) 100%)',
    glow: 0xffe6b0, rim: 0xffd27a, ground: ground(46, 34, 20),
  },
};
export const BACKDROP_NAMES = Object.keys(BACKDROPS);
export const DEFAULT_BACKDROP = 'town';
