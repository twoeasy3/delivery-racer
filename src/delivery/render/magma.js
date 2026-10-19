// ---- MAGMA's picture (../hazards.js patchesOf: the volcano levels' magma), shared by its drawing on the road (render/hazards.js)
// and its card on the Gimmicks page (gimmicks.js) ----
import * as THREE from 'three';

// magma's picture (128 x 128, drawn once): molten orange and yellow under plates of black crust, the cracks between glowing,
// darker towards its two long edges (u 0 and 1). Seeded: the same every run
let magmaPicture = null;
export const magmaTexture = () => {
  if (magmaPicture) return magmaPicture;
  const N = 128, canvas = document.createElement('canvas'), c = canvas.getContext('2d');
  canvas.width = canvas.height = N;
  let seed = 7331;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const melt = c.createLinearGradient(0, 0, N, 0);
  melt.addColorStop(0, '#e2400c'); melt.addColorStop(0.5, '#ff6a12'); melt.addColorStop(1, '#e2400c');
  c.fillStyle = melt;
  c.fillRect(0, 0, N, N);
  for (let k = 0; k < 22; k++) { // (hot spots)
    const x = rnd() * N, y = rnd() * N, r = 6 + rnd() * 12, hot = c.createRadialGradient(x, y, 0, x, y, r);
    hot.addColorStop(0, 'rgba(255,214,70,1)'); hot.addColorStop(1, 'rgba(255,160,30,0)');
    c.fillStyle = hot;
    for (const dy of [-N, 0, N]) { c.beginPath(); c.arc(x, y + dy, r, 0, Math.PI * 2); c.fill(); } // (tiled along: v repeats)
  }
  c.fillStyle = '#2a0f08';
  for (let k = 0; k < 9; k++) { // (plates of crust, drifting on it)
    const x = rnd() * N, y = rnd() * N, r = 4 + rnd() * 6;
    for (const dy of [-N, 0, N]) {
      c.beginPath();
      for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2 + rnd() * 0.5, rr = r * (0.7 + rnd() * 0.4); c.lineTo(x + Math.cos(ang) * rr, y + dy + Math.sin(ang) * rr); }
      c.fill();
    }
  }
  const edge = c.createLinearGradient(0, 0, N, 0); // (its edges cooling)
  edge.addColorStop(0, 'rgba(30,8,4,0.9)'); edge.addColorStop(0.12, 'rgba(30,8,4,0)'); edge.addColorStop(0.88, 'rgba(30,8,4,0)'); edge.addColorStop(1, 'rgba(30,8,4,0.9)');
  c.fillStyle = edge;
  c.fillRect(0, 0, N, N);
  magmaPicture = new THREE.CanvasTexture(canvas);
  magmaPicture.wrapT = THREE.RepeatWrapping;
  return magmaPicture;
};
