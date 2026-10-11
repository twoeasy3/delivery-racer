// Lists every obstacle that bursts on contact: its box (width x length x height, m), its volume and the damage it does.
//   node scripts/delivery-obstacle-sizes.mjs
import { boot } from './delivery-headless.mjs';
const g = await boot();
try {
  const K = g.CONFIG.obstacleKinds, S = g.Collision.size;
  const rows = Object.entries(K).filter(([k]) => S[k] && !['wideLoad', 'escort', 'landmine'].includes(k)).map(([k, c]) => {
    const [hw, hl, h] = S[k], vol = 8 * hw * hl * h / 4 * 1; // (2hw x 2hl x h)
    return { k, w: 2 * hw, l: 2 * hl, h, vol: 4 * hw * hl * h, dmg: c.damage, kept: c.speedKept };
  }).sort((a, b) => a.vol - b.vol);
  for (const r of rows) console.log(r.k.padEnd(14), `${r.w.toFixed(1)}x${r.l.toFixed(1)}x${r.h.toFixed(1)}`.padEnd(14), 'vol', r.vol.toFixed(1).padStart(6), 'dmg', String(r.dmg).padStart(3), 'kept', r.kept);
  const M = g.CONFIG.machinery;
  console.log('machinery default', `${2 * M.hw}x${2 * M.hl}`, 'dmg', M.damage, '| sizes', JSON.stringify(M.sizes), '| bucket', g.CONFIG.site.bucket * 2, 'dmg', g.CONFIG.site.bucketDamage);
} finally { await g.close(); }
