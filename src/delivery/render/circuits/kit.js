// ---- what the circuits' sceneries share (see ./index.js for what `ctx` holds) ----
// Everything here works in the world (x, z), since a circuit's landmarks (the level's "landmarks", put where
// they really are by scripts/circuit-from-osm.mjs) are given there: { kind, x, z } a point, or
// { kind, paths: [[[x, z], ...], ...] } lines or outlines.
export const kit = (ctx) => {
  const { THREE, levelGroup, Track, LEVEL, terrainAt, beside } = ctx;
  // the land's height at a point (a flat circuit's is 0)
  const ground = (x, z) => terrainAt ? terrainAt(x, z) : 0;
  // the track, every 8 m: where its middle is and how far out its walls are there (its run-off and all)
  const edge = [], p = {};
  for (let s = 0; s < Track.length; s += 8) {
    Track.toWorld(s, 0, p);
    edge.push([p.x, p.z, Math.max(Track.hi(s), -Track.lo(s))]);
  }
  // is that point clear of the track, its run-off and its walls, by `margin` m?
  const clear = (x, z, margin = 4) => {
    for (const [ex, ez, half] of edge) if (Math.hypot(x - ex, z - ez) < half + margin + 4) return false;
    return true;
  };
  const marks = (kind) => (LEVEL.landmarks || []).filter(l => l.kind === kind);
  // many of one thing, in one draw call: entries [x, y, z, sx, sy, sz, turn]
  const dummy = new THREE.Object3D();
  const scatter = (geometry, color, list) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, turn], i) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, turn || 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    levelGroup.add(mesh);
    return mesh;
  };
  // spots beside the track all the way round, `every` m apart, `count` on each side, from dMin to dMax m off
  // its walls, each clear of the track wherever else it runs: each(x, y, z) for every one
  const besideTrack = (every, count, dMin, dMax, each, margin = 3) => {
    for (let s = 0; s < Track.length; s += every) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < count; k++) {
          const at = s + Math.random() * every;
          Track.toWorld(at, beside(side, at, dMin + Math.random() * (dMax - dMin)), p);
          if (clear(p.x, p.z, margin)) each(p.x, ground(p.x, p.z), p.z);
        }
      }
    }
  };
  // a ribbon along a line of points [x, z], `width` m wide, lying on the land `lift` m up; `bank` m: its outer
  // edge (the side away from `centre`, [x, z]) that much higher, a wall under it. Left out wherever the track is
  const ribbon = (path, width, color, { lift = 0.08, bank = 0, centre = null, margin = 2 } = {}) => {
    const top = [], wall = [];
    const quad = (list, a, b, c, d) => list.push(...a, ...b, ...c, ...a, ...c, ...d);
    let last = null;
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i], a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
      if (centre && (x - centre[0]) * nx + (z - centre[1]) * nz < 0) { nx = -nx; nz = -nz; } // (n points outward)
      const y = ground(x, z) + lift;
      const here = clear(x, z, margin + width / 2) ? { inner: [x - nx * width / 2, y, z - nz * width / 2], outer: [x + nx * width / 2, y + bank, z + nz * width / 2], foot: [x + nx * width / 2, y - lift - 1, z + nz * width / 2] } : null;
      if (here && last) {
        quad(top, last.inner, last.outer, here.outer, here.inner);
        if (bank) quad(wall, last.outer, last.foot, here.foot, here.outer);
      }
      last = here;
    }
    const mesh = (list, tone) => {
      if (!list.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
      geo.computeVertexNormals();
      levelGroup.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: tone, side: THREE.DoubleSide })));
    };
    mesh(top, color);
    mesh(wall, new THREE.Color(color).multiplyScalar(0.75).getHex());
  };
  // a group standing at a point on the land, turned; put(geometry, color, x, y, z) adds a piece to it
  const stand = (x, z, turn = 0) => {
    const g = new THREE.Group();
    g.position.set(x, ground(x, z), z);
    g.rotation.y = turn;
    levelGroup.add(g);
    const put = (geo, color, px, py, pz) => { const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color })); m.position.set(px, py, pz); g.add(m); return m; };
    return put;
  };
  // is a point inside an outline (a path of [x, z])?
  const inside = (path, x, z) => {
    let odd = false;
    for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
      const a = path[i], b = path[j];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) odd = !odd;
    }
    return odd;
  };
  // trees: a trunk and a crown each, of the shapes given. list entries: [x, y, z, height, spread]
  const trees = (list, crown, crownColors, trunkColor = 0x5a4636, trunkShare = 0.3) => {
    const trunk = new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0);
    scatter(trunk, trunkColor, list.map(([x, y, z, h, w]) => [x, y, z, w * 0.12, h * trunkShare, w * 0.12]));
    crownColors.forEach((color, k) => scatter(crown, color, list.filter((_, i) => i % crownColors.length === k).map(([x, y, z, h, w]) => [x, y + h * trunkShare * 0.9, z, w, h * (1 - trunkShare * 0.9), w, Math.random() * 6])));
  };
  return { ground, clear, marks, scatter, besideTrack, ribbon, stand, inside, trees };
};
