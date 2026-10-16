// ---- THE LADLES, drawn (a level's "ladles": what they do, ../lanegimmicks.js; the models, ladleModels.js). Each is a goliath
// crane straddling the road, its legs beyond the kerbs, its trolley bringing a ladle of molten metal out over the lanes as the
// player comes (beacons flashing), tipping it towards the player: a glowing stream falls to the road and spreads into a pool that
// glows, then cools to a dark crust. A MOLTEN METAL board on a gantry `CONFIG.ladle.sign` m before. Glow is unlit vertex colour:
// no real lights. COST: every crane's frame and every sign's gantry are ONE merged mesh for the level, the boards one more; each
// ladle adds its trolley, its ladle and its glow, its beacons, and (only while it pours or lies there) its stream and its pool:
// a ladle's meshes are drawn only while the player is near it (`near` m before it to `after` m past)
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Track } from '../track.js';
import { Game } from '../game.js';
import { Player } from '../player.js';
import { LaneGimmicks } from '../lanegimmicks.js';
import { scene, tmp, clearGroup } from './scene.js';
import { signTexture } from './themes/steelworksModels.js';
import { LADLE, lipAt, merged, boxPiece, stripePieces, C, ladleGeometry, trolleyGeometry, streamGeometry, poolGeometry } from './ladleModels.js';

const group = new THREE.Group();
scene.add(group);
const near = 650, after = 160;
const BEACON_ON = 0xffb020, BEACON_OFF = 0x5a4010, CRUST = new THREE.Color(0x2a2220);
let ladles = [];
const lit = () => new THREE.MeshLambertMaterial({ vertexColors: true });
const glow = (extra) => new THREE.MeshBasicMaterial({ vertexColors: true, ...extra });

// a piece placed on the road at (s, lat), y up, turned with the road (w across it, d along it), into `out`
const placed = (out, g, s, lat) => {
  const yaw = Track.toWorld(s, lat, tmp);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(tmp.x, tmp.y, tmp.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1)));
  out.push(g);
};

Game.onLoad.push(() => {
  clearGroup(group);
  ladles = [];
  if (!LaneGimmicks.ladles.length) return;
  const L = LADLE, frame = [], boards = [];
  for (const l of LaneGimmicks.ladles) {
    const lip = lipAt(L.tip), cs = l.s - lip.z; // (the crane stands where the tipped lip is over the pool's middle)
    // ---- the crane: two A-frame legs each side on a sill, two box girders across, hazard stripes on the sills
    const lo = Track.lo(cs), hi = Track.hi(cs), mid = (lo + hi) / 2, wide = hi - lo + 2 * L.legOut + 1.2;
    for (const side of [-1, 1]) {
      const leg = side < 0 ? lo - L.legOut : hi + L.legOut;
      for (const dz of [-3.2, 3.2]) placed(frame, boxPiece(0.9, L.girder + 1.8, 0.9, C.yellow, 0, (L.girder + 1.8) / 2, 0, dz > 0 ? -0.12 : 0.12), cs + dz - Math.sign(dz) * 1.3, leg);
      placed(frame, boxPiece(1.2, 1.0, 9.4, C.yellow, 0, 0.5, 0), cs, leg);
      const st = []; stripePieces(st, 1.2, 0.5, 0.04, 0, 0.5, -4.72, 4); stripePieces(st, 1.2, 0.5, 0.04, 0, 0.5, 4.72, 4);
      for (const g of st) placed(frame, g, cs, leg);
      placed(frame, boxPiece(1.4, 1.2, 4.0, C.dark, 0, L.girder + 2.2, 0), cs, leg); // (the end carriage the girders sit on)
    }
    for (const dz of [-1.7, 1.7]) {
      placed(frame, boxPiece(wide, 1.8, 0.9, C.yellow, 0, L.girder + 0.9, 0), cs + dz, mid);
      for (const side of [-1, 1]) { const st = []; stripePieces(st, 3.0, 1.8, 0.04, 0, L.girder + 0.9, dz < 0 ? -0.47 : 0.47, 6); for (const g of st) placed(frame, g, cs + dz, mid - side * (wide / 2 - 1.6)); }
    }
    // ---- the MOLTEN METAL gantry: legs beyond the kerbs, its beam and board over the camera's clearance
    const gs = l.s - CONFIG.ladle.sign, glo = Track.lo(gs), ghi = Track.hi(gs), gmid = (glo + ghi) / 2, gw = ghi - glo + 4;
    for (const side of [-1, 1]) placed(frame, boxPiece(0.6, L.signY + 3.0, 0.6, C.yellow, 0, (L.signY + 3.0) / 2, 0), gs, side < 0 ? glo - 1.6 : ghi + 1.6);
    placed(frame, boxPiece(gw, 0.5, 0.5, C.dark, 0, L.signY + 2.75, 0.3), gs, gmid);
    placed(boards, new THREE.PlaneGeometry(9, 2.2).rotateY(Math.PI).translate(0, L.signY + 1.1, -0.05), gs, gmid);
    // ---- its moving parts (made now, shown when near)
    const own = new THREE.Group();
    own.visible = false;
    group.add(own);
    const base = new THREE.Group(); // (the crane's frame on the road: +z the player's way, +x to the road's left)
    base.rotation.y = Track.toWorld(cs, mid, tmp);
    base.position.copy(tmp);
    own.add(base);
    const trolley = new THREE.Mesh(trolleyGeometry(), lit());
    base.add(trolley);
    const { body, glow: top } = ladleGeometry();
    const ladle = new THREE.Group();
    ladle.position.y = L.trunnion;
    ladle.add(new THREE.Mesh(body, lit()), new THREE.Mesh(top, glow()));
    trolley.add(ladle);
    const lamps = new THREE.MeshBasicMaterial({ color: BEACON_OFF });
    const beacon = [];
    for (const side of [-1, 1]) beacon.push(boxPiece(0.45, 0.45, 0.45, 0xffffff, side * (wide / 2 - 0.6), L.girder + 2.1, -2.3)); // (on the end carriages, to the player)
    const beacons = new THREE.Mesh(merged(beacon), lamps);
    base.add(beacons);
    const signLamps = [];
    for (const x of [-4.8, 4.8]) placed(signLamps, boxPiece(0.5, 0.5, 0.5, 0xffffff, 0, L.signY + 3.25, 0), gs, gmid + x);
    const signBeacons = new THREE.Mesh(merged(signLamps), lamps);
    group.add(signBeacons);
    const stream = new THREE.Mesh(streamGeometry(), glow({ transparent: true, opacity: 0.95 }));
    stream.visible = false;
    own.add(stream);
    const poolMat = glow({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const pool = new THREE.Mesh(poolGeometry(), poolMat);
    pool.rotation.y = Track.toWorld(l.s, l.lat, tmp);
    pool.position.set(tmp.x, tmp.y + 0.12, tmp.z); // (a little proud of the road: it is a few cm thick, and the road is cambered)
    pool.visible = false;
    own.add(pool);
    // where the trolley waits (over the kerb on the pour's side) and where it goes (over the pour's lanes), in the frame's x
    const park = -((l.lat > mid ? hi + 1.2 : lo - 1.2) - mid), over = -(l.lat - mid);
    ladles.push({ l, own, trolley, ladle, lamps, stream, pool, poolMat, park, over, gs, signBeacons });
  }
  group.add(new THREE.Mesh(merged(frame), lit()));
  const map = signTexture('MOLTEN METAL', '#f2c21d', '#1b1d22');
  const board = map ? new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ color: C.yellow, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(merged(boards.map(g => { g.deleteAttribute('normal'); return g; })), board));
});

const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const lip = new THREE.Vector3(), up = new THREE.Matrix4().makeTranslation(0, LADLE.trunnion, 0), at = new THREE.Matrix4();
export const syncLadles = (now) => {
  if (!ladles.length) return;
  const L = CONFIG.ladle, on = Math.floor(now / 250) % 2 === 0;
  for (const d of ladles) {
    const { l } = d, q = LaneGimmicks.pool(l);
    d.own.visible = Player.s > l.s - near && Player.s < l.s + after;
    d.signBeacons.visible = Player.s > d.gs - near && Player.s < l.s;
    // the trolley out over the lanes as it is warned of; the ladle tipped as it pours, back after
    const u = l.t < 0 ? 0 : ease(l.t / L.arrive);
    d.trolley.position.x = d.park + (d.over - d.park) * u;
    const p = l.pour;
    const tip = p < 0 ? 0 : p < L.fall ? ease(p / L.fall) : p < L.pour ? 1 : 1 - ease((p - L.pour) / 1.2);
    d.ladle.rotation.x = -LADLE.tip * tip;
    const live = l.t >= 0 && (!q || q.cool < 1);
    d.lamps.color.setHex(live && on ? BEACON_ON : BEACON_OFF);
    if (!d.own.visible) continue;
    // the stream: from the lip down to the road while it pours, thinning as it stops
    const thin = p < 0 ? 0 : p < L.pour ? 1 : 1 - Math.min(1, (p - L.pour) / 0.35);
    d.stream.visible = thin > 0;
    if (d.stream.visible) {
      d.ladle.updateWorldMatrix(true, false);
      const lp = lipAt(LADLE.tip * tip);
      lip.set(0, lp.y, lp.z - 0.25).applyMatrix4(at.multiplyMatrices(d.ladle.parent.matrixWorld, up));
      Track.toWorld(l.s, l.lat, tmp);
      const length = Math.max(0.1, (lip.y - tmp.y) * Math.min(1, p / L.fall));
      d.stream.position.copy(lip);
      d.stream.scale.set(thin, length, thin);
    }
    // the pool: spreading, molten (a slow shimmer), then crusting over
    d.pool.visible = !!q && q.k > 0;
    if (d.pool.visible) {
      d.pool.scale.set(l.hw * q.k, 1, l.hl * q.k);
      const shimmer = q.cool > 0 ? 1 : 0.9 + 0.1 * Math.sin(now / 130);
      d.poolMat.color.setRGB(shimmer, shimmer, shimmer).lerp(CRUST, q.cool);
    }
  }
};
